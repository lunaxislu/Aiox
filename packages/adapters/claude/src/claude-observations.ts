import { createHash, randomUUID } from "node:crypto";

import type { DeliveryOutcome } from "@aiox/domain";
import type { InboundMessage, RuntimeControls } from "@aiox/vendor";

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
        ].includes(value)
        ? value
        : "unknown";
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
    readonly #waiting = new Map<string, { event: string; reason?: string }>();
    readonly #tools = new Set<string>();
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

    async #observe(event: Record<string, unknown>): Promise<void> {
        // Child agents inherit hooks and may share the ambient prompt id.
        if (event.agent_id !== undefined) return;
        const key = promptKey(event);
        if (this.#observeActivity(event)) return;
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
            this.#project("UserPromptSubmit", "prompt_identity_unconfirmed");
        }
        if (
            !key &&
            (event.hook_event_name === "StopFailure" ||
                event.hook_event_name === "Stop")
        ) {
            if (event.hook_event_name === "StopFailure") this.#failed = true;
            this.#project(
                event.hook_event_name,
                event.hook_event_name === "StopFailure"
                    ? errorType(event.error)
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
            this.#project("UserPromptSubmit");
        }
        if (
            event.hook_event_name === "Stop" ||
            event.hook_event_name === "StopFailure"
        ) {
            if (
                event.hook_event_name === "Stop" &&
                this.options.hasBlockingStopHooks
            ) {
                this.#project("Stop", "stop_hook_outcome_unconfirmed");
                return;
            }
            if (this.#ambiguous.has(key)) {
                this.#project(
                    event.hook_event_name,
                    "prompt_identity_ambiguous",
                );
                return;
            }
            const frame = this.#prompts.get(key);
            if (frame === undefined) {
                if (event.hook_event_name === "StopFailure") {
                    this.#failed = true;
                    this.#project("StopFailure", errorType(event.error));
                }
                return;
            }
            for (const type of [
                "permission_prompt",
                "elicitation_dialog",
                "elicitation_url_dialog",
            ])
                this.#waiting.delete(
                    JSON.stringify([event.session_id, type, key]),
                );
            const failed = event.hook_event_name === "StopFailure";
            const error = errorType(event.error);
            this.#active.delete(key);
            this.#failed = failed;
            this.#project(event.hook_event_name, failed ? error : undefined);
            if (frame !== null)
                await this.#settle(
                    frame,
                    failed ? "failed" : "completed",
                    failed ? error : undefined,
                );
            this.#prompts.delete(key);
            this.#fingerprints.delete(key);
            this.#finished.add(key);
        }
    }

    async failPending(reason: string): Promise<void> {
        return this.#enqueue(async () => {
            this.#active.clear();
            this.#waiting.clear();
            this.#tools.clear();
            this.#unidentified.clear();
            this.#failed = true;
            this.#project("RuntimeFailure", "connection_lost");
            await this.#finishPending("failed", reason);
        });
    }

    async interruptPending(): Promise<void> {
        return this.#enqueue(async () => {
            this.#active.clear();
            this.#waiting.clear();
            this.#tools.clear();
            this.#unidentified.clear();
            this.#failed = false;
            this.#project("RuntimeInterrupted");
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
            this.#waiting.set(
                wait ?? JSON.stringify([session, name, "unidentified"]),
                { event: name },
            );
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
            if (!this.#waiting.delete(elicitation)) {
                this.#project(name);
                return true;
            }
        } else if (name === "PreToolUse") {
            if (!tool) return true;
            if (event.tool_name === "AskUserQuestion")
                this.#waiting.set(tool, { event: "AskUserQuestion" });
            else this.#tools.add(tool);
        } else if (name === "PostToolUse" || name === "PostToolUseFailure") {
            if (!tool) return true;
            this.#tools.delete(tool);
            this.#waiting.delete(tool);
            this.#clearNotification(event, ["permission_prompt"]);
        } else if (name === "Notification") {
            const type = event.notification_type;
            const quota = JSON.stringify([session, "quota"]);
            if (type === "quota_auto_resume_fired") {
                this.#waiting.delete(quota);
                this.#failed = false;
                if (this.#active.size === 0) this.#unidentified.add(session);
            } else if (
                type === "quota_auto_resume_stale" ||
                type === "quota_auto_resume_disabled"
            ) {
                this.#waiting.set(quota, { event: type });
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
                    { event: type },
                );
            } else return true;
            this.#project(type);
            return true;
        } else return false;
        this.#project(name);
        return true;
    }

    #project(event: string, reason?: string): void {
        const waiting = this.#waiting.values().next().value;
        const activity = waiting
            ? "awaiting-user"
            : this.#tools.size > 0
              ? "tool"
              : this.#active.size > 0 || this.#unidentified.size > 0
                ? "reasoning"
                : this.#failed
                  ? "failed"
                  : "idle";
        this.controls.setActivity(
            activity,
            waiting ?? { event, ...(reason === undefined ? {} : { reason }) },
        );
    }
}
