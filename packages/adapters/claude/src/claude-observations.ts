import { createHash, randomUUID } from "node:crypto";

import type { DeliveryOutcome } from "@aiox/domain";
import type { InboundMessage, RuntimeControls } from "@aiox/vendor";
import { z } from "zod";

const transcriptRecord = z.object({
    type: z.literal("user"),
    isSidechain: z.literal(false),
    sessionId: z.string().min(1),
    promptId: z.string().min(1),
    uuid: z.string().min(1),
    parentUuid: z.string().nullable().optional(),
    toolDenialKind: z.string().optional(),
    origin: z.never().optional(),
    promptSource: z.never().optional(),
    message: z.object({
        role: z.literal("user"),
        content: z.array(
            z.object({
                type: z.string(),
                tool_use_id: z.string().optional(),
                is_error: z.boolean().optional(),
                text: z.string().optional(),
            }),
        ),
    }),
});

function escapeAttribute(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function promptKey(event: Record<string, unknown>): string | undefined {
    return typeof event.session_id === "string" &&
        event.session_id !== "" &&
        typeof event.prompt_id === "string" &&
        event.prompt_id !== ""
        ? JSON.stringify([event.session_id, event.prompt_id])
        : undefined;
}

function errorType(value: unknown): string {
    return typeof value === "string" &&
        [
            "rate_limit",
            "overloaded",
            "authentication_failed",
            "oauth_org_not_allowed",
            "account_on_hold",
            "billing_error",
            "invalid_request",
            "model_not_found",
            "server_error",
            "max_output_tokens",
            "cloud_credential_error",
        ].includes(value)
        ? value
        : "unknown";
}

function failureReason(event: Record<string, unknown>): string {
    const detail = [event.last_assistant_message, event.error_details].find(
        (value): value is string =>
            typeof value === "string" && value.trim() !== "",
    );
    const type = errorType(event.error);
    return detail ? `${detail} · ${type}` : type;
}

/** Consumes reports only after the caller authenticates this Runtime's hook credential. */
export class ClaudeObservations {
    readonly #pending = new Map<string, string | null>();
    readonly #prompts = new Map<string, string | null>();
    readonly #fingerprints = new Map<string, string>();
    readonly #finished = new Set<string>();
    readonly #frameKeys = new Map<string, string>();
    readonly #ambiguous = new Set<string>();
    readonly #active = new Set<string>();
    readonly #outcomes = new Map<
        string,
        { outcome: DeliveryOutcome; error?: string }
    >();
    #failed = false;
    #failureReason: string | undefined;
    readonly #resuming = new Set<string>();
    readonly #waiting = new Map<string, string>();
    readonly #tools = new Set<string>();
    readonly #owners = new Map<string, string>();
    readonly #denials = new Map<string, string>();
    readonly #unidentified = new Set<string>();
    #queue = Promise.resolve();

    constructor(
        readonly controls: RuntimeControls,
        readonly options: { hasBlockingStopHooks?: boolean } = {},
    ) {}

    track(message: InboundMessage): string {
        const frame = `<cross-session-message from-name="${escapeAttribute(message.from.name)}">\n[AIOX ${message.deliveryId === null ? "daemon notification" : "input"} ${randomUUID()}]\nFrom: ${message.from.name}\n${message.from.role === null ? "" : `Role: ${message.from.role}\n`}${message.from.description === null ? "" : `Description: ${message.from.description}\n`}Created at: ${message.createdAt}\n\n${message.content}\n</cross-session-message>`;
        this.#pending.set(frame, message.deliveryId);
        return frame;
    }

    forget(content: string): void {
        this.#pending.delete(content);
        this.#outcomes.delete(content);
        this.#frameKeys.delete(content);
    }

    observe(event: Record<string, unknown>): Promise<void> {
        return this.#enqueue(() => this.#observe(event));
    }

    observeTranscript(value: unknown): Promise<void> {
        return this.#enqueue(async () => {
            const parsed = transcriptRecord.safeParse(value);
            if (!parsed.success) return;
            const row = parsed.data;
            const key = JSON.stringify([row.sessionId, row.promptId]);
            if (
                this.#finished.has(key) ||
                this.#ambiguous.has(key) ||
                !this.#prompts.has(key)
            )
                return;
            const blocks = row.message.content;
            if (
                row.toolDenialKind === "user-rejected" &&
                blocks.some(
                    (block) =>
                        block.type === "tool_result" &&
                        block.is_error === true &&
                        block.tool_use_id &&
                        this.#owners.get(
                            JSON.stringify([
                                row.sessionId,
                                "tool",
                                block.tool_use_id,
                            ]),
                        ) === key,
                )
            ) {
                this.#denials.set(
                    JSON.stringify([row.sessionId, row.uuid]),
                    key,
                );
                return;
            }
            // A quoted interruption string is not a terminal observation. Require
            // the vendor's parent link to a rejected tool owned by this prompt.
            if (
                blocks.length !== 1 ||
                blocks[0]?.type !== "text" ||
                blocks[0].text !==
                    "[Request interrupted by user for tool use]" ||
                this.#denials.get(
                    JSON.stringify([row.sessionId, row.parentUuid]),
                ) !== key
            )
                return;
            this.#clearPrompt(key);
            this.#active.delete(key);
            this.#project();
            const frame = this.#prompts.get(key);
            if (frame != null) await this.#settle(frame, "interrupted");
            this.#prompts.delete(key);
            this.#fingerprints.delete(key);
            this.#finished.add(key);
            for (const [id, owner] of this.#denials)
                if (owner === key) this.#denials.delete(id);
        });
    }

    async #observe(event: Record<string, unknown>): Promise<void> {
        // Child agents inherit hooks and may share the ambient prompt id.
        if (event.agent_id !== undefined) return;
        const key = promptKey(event);
        const quotaNotice =
            event.hook_event_name === "Notification" &&
            [
                "quota_auto_resume_fired",
                "quota_auto_resume_stale",
                "quota_auto_resume_disabled",
            ].includes(String(event.notification_type));
        // Session resumption is activity evidence, independent of prompt settlement.
        if (
            typeof event.session_id === "string" &&
            this.#resuming.has(event.session_id) &&
            (event.hook_event_name === "Stop" ||
                event.hook_event_name === "StopFailure")
        ) {
            if (
                event.hook_event_name === "Stop" &&
                this.options.hasBlockingStopHooks
            ) {
                this.#project("stop_hook_outcome_unconfirmed");
                return;
            }
            this.#resuming.delete(event.session_id);
            if (event.hook_event_name === "StopFailure") {
                this.#failed = true;
                this.#failureReason = failureReason(event);
            }
            this.#project();
        }
        if (key && this.#finished.has(key) && !quotaNotice) return;
        if (this.#observeActivity(event)) return;
        if (
            event.hook_event_name === "UserPromptSubmit" &&
            typeof event.prompt === "string" &&
            typeof event.session_id === "string"
        ) {
            this.#resuming.delete(event.session_id);
            this.#waiting.delete(JSON.stringify([event.session_id, "quota"]));
        }
        if (
            !key &&
            event.hook_event_name === "UserPromptSubmit" &&
            typeof event.prompt === "string"
        ) {
            this.#unidentified.add(
                typeof event.session_id === "string"
                    ? event.session_id
                    : "unknown",
            );
            this.#project("prompt_identity_unconfirmed");
        }
        if (
            !key &&
            (event.hook_event_name === "StopFailure" ||
                event.hook_event_name === "Stop")
        ) {
            if (event.hook_event_name === "StopFailure") {
                this.#failed = true;
                this.#failureReason = failureReason(event);
            }
            this.#project(
                event.hook_event_name === "StopFailure"
                    ? failureReason(event)
                    : "prompt_identity_unconfirmed",
            );
        }
        if (!key) return;
        if (
            event.hook_event_name === "UserPromptSubmit" &&
            typeof event.prompt === "string"
        ) {
            if (this.#finished.has(key)) return;
            const fingerprint = createHash("sha256")
                .update(event.prompt)
                .digest("hex");
            const previous = this.#fingerprints.get(key);
            if (previous === fingerprint) return;
            if (previous !== undefined) this.#ambiguous.add(key);
            this.#fingerprints.set(key, fingerprint);
            if (this.#pending.has(event.prompt)) {
                const oldKey = this.#frameKeys.get(event.prompt);
                if (oldKey !== undefined && oldKey !== key) {
                    this.#ambiguous.add(oldKey);
                    this.#ambiguous.add(key);
                }
                this.#frameKeys.set(event.prompt, key);
            }
            this.#prompts.set(
                key,
                this.#pending.has(event.prompt) ? event.prompt : null,
            );
            this.#active.add(key);
            this.#failed = false;
            this.#failureReason = undefined;
            this.#project();
        }
        if (
            event.hook_event_name === "Stop" ||
            event.hook_event_name === "StopFailure"
        ) {
            if (
                event.hook_event_name === "Stop" &&
                this.options.hasBlockingStopHooks
            ) {
                this.#project("stop_hook_outcome_unconfirmed");
                return;
            }
            if (this.#ambiguous.has(key)) {
                this.#project("prompt_identity_ambiguous");
                return;
            }
            const frame = this.#prompts.get(key);
            if (frame === undefined) {
                if (event.hook_event_name === "StopFailure") {
                    this.#failed = true;
                    this.#failureReason = failureReason(event);
                    this.#project();
                }
                return;
            }
            this.#clearPrompt(key);
            const failed = event.hook_event_name === "StopFailure";
            const error = errorType(event.error);
            this.#active.delete(key);
            this.#failed = failed;
            this.#failureReason = failed ? failureReason(event) : undefined;
            this.#project();
            if (frame !== null)
                await this.#settle(
                    frame,
                    failed ? "failed" : "completed",
                    failed ? error : undefined,
                );
            this.#prompts.delete(key);
            this.#fingerprints.delete(key);
            this.#finished.add(key);
            for (const [id, owner] of this.#denials)
                if (owner === key) this.#denials.delete(id);
        }
    }

    async failPending(reason: string): Promise<void> {
        return this.#enqueue(async () => {
            this.#active.clear();
            this.#waiting.clear();
            this.#tools.clear();
            this.#owners.clear();
            this.#denials.clear();
            this.#unidentified.clear();
            this.#failed = true;
            this.#failureReason = "connection_lost";
            this.#resuming.clear();
            this.#project();
            await this.#finishPending("failed", reason);
        });
    }

    async interruptPending(): Promise<void> {
        return this.#enqueue(async () => {
            this.#active.clear();
            this.#waiting.clear();
            this.#tools.clear();
            this.#owners.clear();
            this.#denials.clear();
            this.#unidentified.clear();
            this.#failed = false;
            this.#resuming.clear();
            this.#project();
            await this.#finishPending("interrupted");
        });
    }

    async #finishPending(
        outcome: DeliveryOutcome,
        reason?: string,
    ): Promise<void> {
        let failed = false;
        for (const frame of this.#pending.keys()) {
            try {
                await this.#settle(frame, outcome, reason);
            } catch {
                failed = true;
            }
        }
        if (failed)
            throw new Error("AIOX input outcome storage failed; retry cleanup");
    }

    async #settle(
        frame: string,
        outcome: DeliveryOutcome,
        error?: string,
    ): Promise<void> {
        const delivery = this.#pending.get(frame);
        if (delivery === undefined) return;
        if (!this.#outcomes.has(frame))
            this.#outcomes.set(frame, {
                outcome,
                ...(error === undefined ? {} : { error }),
            });
        const result = this.#outcomes.get(frame)!;
        if (delivery !== null) {
            if (result.error === undefined)
                await this.controls.settle(delivery, result.outcome);
            else
                await this.controls.settle(
                    delivery,
                    result.outcome,
                    result.error,
                );
        }
        this.#pending.delete(frame);
        this.#outcomes.delete(frame);
        this.#frameKeys.delete(frame);
        for (const [key, content] of this.#prompts)
            if (content === frame) {
                this.#prompts.delete(key);
                this.#fingerprints.delete(key);
                this.#ambiguous.delete(key);
                this.#finished.add(key);
            }
    }

    #enqueue(action: () => Promise<void>): Promise<void> {
        const next = this.#queue.then(action);
        this.#queue = next.catch(() => {});
        return next;
    }

    #clearPrompt(key: string): void {
        const [session] = JSON.parse(key) as [string, string];
        for (const type of [
            "permission_prompt",
            "elicitation_dialog",
            "elicitation_url_dialog",
        ])
            this.#waiting.delete(JSON.stringify([session, type, key]));
        for (const [id, owner] of this.#owners) {
            if (owner !== key) continue;
            this.#tools.delete(id);
            this.#waiting.delete(id);
            this.#owners.delete(id);
        }
    }

    #clearNotification(
        event: Record<string, unknown>,
        types: readonly string[],
    ): void {
        for (const type of types) {
            this.#waiting.delete(
                JSON.stringify([
                    event.session_id,
                    type,
                    promptKey(event) ?? "unidentified",
                ]),
            );
            // A correlated observation supersedes the session's uncorrelated hint,
            // while identified waits and hints for other prompts remain intact.
            this.#waiting.delete(
                JSON.stringify([event.session_id, type, "unidentified"]),
            );
        }
    }

    #observeActivity(event: Record<string, unknown>): boolean {
        if (typeof event.session_id !== "string" || event.session_id === "")
            return false;
        const name = event.hook_event_name;
        const session = event.session_id;
        const tool =
            typeof event.tool_use_id === "string" && event.tool_use_id !== ""
                ? JSON.stringify([session, "tool", event.tool_use_id])
                : undefined;
        const elicitation =
            typeof event.elicitation_id === "string" &&
            event.elicitation_id !== "" &&
            typeof event.mcp_server_name === "string"
                ? JSON.stringify([
                      session,
                      "elicitation",
                      event.mcp_server_name,
                      event.elicitation_id,
                  ])
                : undefined;
        if (name === "PermissionRequest" || name === "Elicitation") {
            const wait = name === "PermissionRequest" ? tool : elicitation;
            if (wait)
                this.#clearNotification(
                    event,
                    name === "PermissionRequest"
                        ? ["permission_prompt"]
                        : ["elicitation_dialog", "elicitation_url_dialog"],
                );
            const id =
                wait ??
                JSON.stringify([
                    session,
                    name,
                    promptKey(event) ?? "unidentified",
                ]);
            this.#waiting.set(
                id,
                name === "PermissionRequest"
                    ? "Waiting for approval."
                    : "Waiting for user input.",
            );
            const owner = promptKey(event);
            if (owner) this.#owners.set(id, owner);
        } else if (name === "ElicitationResult") {
            if (
                !elicitation ||
                !["accept", "decline", "cancel"].includes(String(event.action))
            )
                return true;
            this.#clearNotification(event, [
                "elicitation_dialog",
                "elicitation_url_dialog",
            ]);
            this.#owners.delete(elicitation);
            if (!this.#waiting.delete(elicitation)) {
                this.#project();
                return true;
            }
        } else if (name === "PreToolUse") {
            if (!tool) return true;
            const owner = promptKey(event);
            if (owner) this.#owners.set(tool, owner);
            if (event.tool_name === "AskUserQuestion")
                this.#waiting.set(tool, "Waiting for user input.");
            this.#tools.add(tool);
        } else if (name === "PostToolUse" || name === "PostToolUseFailure") {
            if (!tool) return true;
            const owner = this.#owners.get(tool);
            const resolved = this.#tools.delete(tool);
            this.#waiting.delete(tool);
            this.#owners.delete(tool);
            if (
                resolved &&
                owner &&
                ![...this.#tools].some((id) => this.#owners.get(id) === owner)
            ) {
                const permission = JSON.stringify([
                    session,
                    "PermissionRequest",
                    owner,
                ]);
                this.#waiting.delete(permission);
                this.#owners.delete(permission);
            }
            this.#clearNotification(event, ["permission_prompt"]);
        } else if (name === "Notification") {
            const type = event.notification_type;
            const quota = JSON.stringify([session, "quota"]);
            if (type === "quota_auto_resume_fired") {
                this.#waiting.delete(quota);
                this.#failed = false;
                this.#failureReason = undefined;
                this.#resuming.add(session);
            } else if (type === "quota_auto_resume_stale") {
                this.#waiting.set(
                    quota,
                    "Press Enter to resume the task automatically.",
                );
            } else if (type === "quota_auto_resume_disabled") {
                const waiting = this.#waiting.delete(quota);
                const resuming = this.#resuming.delete(session);
                if (!waiting && !resuming) return true;
            } else if (
                type === "permission_prompt" ||
                type === "elicitation_dialog" ||
                type === "elicitation_url_dialog"
            ) {
                this.#waiting.set(
                    JSON.stringify([
                        session,
                        type,
                        promptKey(event) ?? "unidentified",
                    ]),
                    type === "permission_prompt"
                        ? "Waiting for approval."
                        : "Waiting for user input.",
                );
            } else return true;
            this.#project();
            return true;
        } else return false;
        this.#project();
        return true;
    }

    #project(reason?: string): void {
        const waiting = this.#waiting.values().next().value;
        const working =
            this.#tools.size > 0 ||
            this.#active.size > 0 ||
            this.#unidentified.size > 0 ||
            this.#resuming.size > 0;
        const status = waiting
            ? "awaiting-user"
            : working
              ? "working"
              : this.#failed
                ? "failed"
                : "idle";
        this.controls.setStatus(
            status,
            waiting
                ? waiting
                : status === "failed"
                  ? this.#failureReason
                  : (reason ??
                    (this.#tools.size > 0 ? "Running a tool." : undefined)),
        );
    }
}
