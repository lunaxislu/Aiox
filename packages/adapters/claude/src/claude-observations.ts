import { randomUUID } from "node:crypto";

import type { DeliveryOutcome } from "@aiox/domain";
import type { InboundMessage, RuntimeControls } from "@aiox/vendor";
import { Effect, Option, Schema, Semaphore } from "effect";

import {
    ClaudeTranscriptChain,
    transcriptRowSchema,
} from "@/claude-transcript-chain";

const observationRowSchema = Schema.Struct({
    ...transcriptRowSchema.fields,
    content: Schema.optional(Schema.Unknown),
    level: Schema.optional(Schema.Unknown),
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

function failureReason(event: Record<string, unknown>): string {
    const detail = [event.last_assistant_message, event.error_details].find(
        (value): value is string =>
            typeof value === "string" && value.trim() !== "",
    );
    const type =
        typeof event.error === "string" && event.error.trim()
            ? event.error
            : "unknown";
    return detail ? `${detail} · ${type}` : type;
}

class ClaudeSession {
    retired = false;
    readonly earlyFailures = new Map<string, string>();
    readonly ambiguous = new Set<string>();
    readonly finished = new Set<string>();
    readonly prompts = new Map<string, string | null>();
    readonly chain = new ClaudeTranscriptChain();
    latest: string | undefined;
    failure: string | undefined;
    quota: string | undefined;
    resuming = false;
}

/** Consumes reports only after the caller authenticates this Runtime's hook credential. */
export class ClaudeObservations {
    readonly #sessions = new Map<string, ClaudeSession>();
    readonly #pending = new Map<
        string,
        { deliveryId: string | null; peer: string; session?: ClaudeSession }
    >();
    readonly #peers = new Map<string, string>();
    readonly #frameKeys = new Map<
        string,
        { key: string; session: ClaudeSession }
    >();
    readonly #outcomes = new Map<
        string,
        { outcome: DeliveryOutcome; error?: string }
    >();
    #currentSession: string | undefined;
    #registry:
        | {
              sessionId: string;
              status: "idle" | "busy" | "waiting" | "shell";
              waitingFor?: string | undefined;
          }
        | undefined;
    readonly #queue = Effect.runSync(Semaphore.make(1));

    constructor(readonly controls: RuntimeControls) {}

    #session(id: string): ClaudeSession {
        let session = this.#sessions.get(id);
        if (!session) {
            session = new ClaudeSession();
            this.#sessions.set(id, session);
        }
        return session;
    }

    #promptSession(key: string): ClaudeSession {
        return this.#session((JSON.parse(key) as [string, string])[0]);
    }

    selectSession(id: string, fresh = false): ClaudeSession {
        if (fresh) {
            this.#sessions.set(id, new ClaudeSession());
            this.#registry = undefined;
        }
        this.#currentSession = id;
        const session = this.#session(id);
        if (this.#registry?.sessionId !== id)
            this.controls.setStatus(
                "aiox-preparing",
                "Waiting for session registry.",
            );
        return session;
    }

    get hasPendingOutcomes(): boolean {
        return this.#outcomes.size > 0;
    }

    retryOutcomes(): Promise<void> {
        return this.#enqueue(() => this.#flushOutcomes());
    }

    retireSession(id: string, session: ClaudeSession): Promise<void> {
        session.retired = true;
        if (this.#sessions.get(id) === session) this.#sessions.delete(id);
        session.prompts.clear();
        session.finished.clear();
        session.ambiguous.clear();
        session.earlyFailures.clear();
        session.chain.clear();
        const frames: string[] = [];
        for (const [frame, pending] of this.#pending) {
            if (pending.session !== session) continue;
            frames.push(frame);
            delete pending.session;
            this.#frameKeys.delete(frame);
            this.#peers.delete(pending.peer);
        }
        return this.#enqueue(async () => {
            let failed = false;
            for (const frame of frames) {
                try {
                    await this.#settle(frame, "interrupted");
                } catch {
                    failed = true;
                }
            }
            if (failed)
                throw new Error(
                    "AIOX input outcome storage failed; retry cleanup",
                );
        });
    }

    observeRegistry(registry: {
        sessionId: string;
        status: "idle" | "busy" | "waiting" | "shell";
        waitingFor?: string | undefined;
    }): void {
        if (
            registry.status === "busy" &&
            (this.#registry?.sessionId !== registry.sessionId ||
                this.#registry.status !== "busy")
        )
            this.#session(registry.sessionId).failure = undefined;
        this.#registry = registry;
        this.#currentSession = registry.sessionId;
        this.#project();
    }

    track(message: InboundMessage): string {
        const frame = `<cross-session-message from-name="${escapeAttribute(message.from.name)}">\n[AIOX ${message.deliveryId === null ? "daemon notification" : "input"} ${randomUUID()}]\nFrom: ${message.from.name}\n${message.from.role === null ? "" : `Role: ${message.from.role}\n`}${message.from.description === null ? "" : `Description: ${message.from.description}\n`}Created at: ${message.createdAt}\n\n${message.content}\n</cross-session-message>`;
        const body = frame.slice(
            frame.indexOf("\n") + 1,
            frame.lastIndexOf("\n"),
        );
        const peer = JSON.stringify([escapeAttribute(message.from.name), body]);
        this.#pending.set(frame, {
            deliveryId: message.deliveryId,
            peer,
        });
        this.#peers.set(peer, frame);
        return frame;
    }

    forget(content: string): void {
        const pending = this.#pending.get(content);
        if (pending) this.#peers.delete(pending.peer);
        this.#pending.delete(content);
        this.#outcomes.delete(content);
        this.#frameKeys.delete(content);
    }

    observe(
        event: Record<string, unknown>,
        instance?: ClaudeSession,
    ): Promise<void> {
        return this.#enqueue(async () => {
            if (instance?.retired) return;
            await this.#observe(event, instance);
            await this.#flushOutcomes();
        });
    }

    observeTranscript(value: unknown, instance?: ClaudeSession): Promise<void> {
        return this.#enqueue(async () => {
            if (instance?.retired) return;
            const parsed =
                Schema.decodeUnknownOption(observationRowSchema)(value);
            const state = Option.isSome(parsed)
                ? (instance ?? this.#session(parsed.value.sessionId))
                : undefined;
            if (Option.isSome(parsed)) {
                const row = parsed.value;
                // Claude 2.1.278 persists this notice for Esc/Ctrl+C/menu cancellation;
                // those actions do not emit quota_auto_resume_disabled.
                if (
                    row.type === "system" &&
                    row.subtype === "informational" &&
                    row.level === "notice" &&
                    row.content ===
                        "Automatic continue cancelled · /rate-limit-options to re-arm"
                ) {
                    state!.quota = undefined;
                    state!.resuming = false;
                    if (
                        this.#currentSession === row.sessionId &&
                        this.#sessions.get(row.sessionId) === state
                    )
                        this.#project();
                }
                const key =
                    row.promptId &&
                    JSON.stringify([row.sessionId, row.promptId]);
                if (
                    key &&
                    row.type === "user" &&
                    row.message?.role === "user" &&
                    (row.origin !== undefined ||
                        row.promptSource !== undefined) &&
                    !state!.prompts.has(key) &&
                    !state!.finished.has(key)
                ) {
                    const origin = row.origin as {
                        kind?: unknown;
                        name?: unknown;
                        body?: unknown;
                    } | null;
                    const frame =
                        origin &&
                        origin.kind === "peer" &&
                        typeof origin.name === "string" &&
                        typeof origin.body === "string"
                            ? (this.#peers.get(
                                  JSON.stringify([origin.name, origin.body]),
                              ) ?? null)
                            : null;
                    await this.#input(key, frame, state!);
                }
            }
            const result = Option.isSome(parsed)
                ? state!.chain.observe(value)
                : undefined;
            if (result && !state!.ambiguous.has(result.key))
                await this.#finish(
                    result.key,
                    result.outcome,
                    result.reason,
                    state!,
                );
            await this.#flushOutcomes();
        });
    }

    async #finish(
        key: string,
        outcome: DeliveryOutcome,
        reason?: string,
        state = this.#promptSession(key),
    ): Promise<void> {
        const [session] = JSON.parse(key) as [string, string];
        if (state.finished.has(key) && !state.resuming) return;
        const resumed = state.resuming;
        state.resuming = false;
        if (outcome === "failed" && (state.latest === key || resumed))
            state.failure = reason ?? "unknown";
        if (state.latest !== key) state.chain.forget(key);
        if (
            !this.#currentSession ||
            (this.#currentSession === session &&
                this.#sessions.get(session) === state)
        )
            this.#project();
        if (state.finished.has(key)) return;
        this.#rememberFinished(key, state);
        const frame = state.prompts.get(key);
        if (frame != null) await this.#settle(frame, outcome, reason);
        state.prompts.delete(key);
    }

    async #flushOutcomes(): Promise<void> {
        for (const [frame, result] of this.#outcomes)
            await this.#settle(frame, result.outcome, result.error);
    }

    async #input(
        key: string,
        frame: string | null,
        state: ClaudeSession,
    ): Promise<void> {
        const session = (JSON.parse(key) as [string, string])[0];
        state.resuming = false;
        state.quota = undefined;
        if (frame !== null) {
            const oldKey = this.#frameKeys.get(frame);
            if (
                oldKey !== undefined &&
                (oldKey.key !== key || oldKey.session !== state)
            ) {
                oldKey.session.ambiguous.add(oldKey.key);
                state.ambiguous.add(key);
            }
            this.#frameKeys.set(frame, { key, session: state });
            const pending = this.#pending.get(frame);
            if (pending) pending.session = state;
        }
        state.prompts.set(key, frame);
        const old = state.latest;
        if (old && state.finished.has(old)) state.chain.forget(old);
        state.latest = key;
        state.failure = undefined;
        if (
            this.#currentSession === session &&
            this.#sessions.get(session) === state
        )
            this.#project();
        const earlyFailure = state.earlyFailures.get(key);
        if (earlyFailure !== undefined) {
            state.earlyFailures.delete(key);
            await this.#finish(key, "failed", earlyFailure, state);
        }
    }

    async #observe(
        event: Record<string, unknown>,
        instance?: ClaudeSession,
    ): Promise<void> {
        if (
            event.agent_id !== undefined ||
            typeof event.session_id !== "string"
        )
            return;
        const session = event.session_id;
        const state = instance ?? this.#session(session);
        const name = event.hook_event_name;
        const key = promptKey(event);
        if (name !== "StopFailure" && name !== "Notification") return;
        const quotaNotice =
            name === "Notification" &&
            String(event.notification_type).startsWith("quota_auto_resume_");
        if (
            key &&
            state.finished.has(key) &&
            !quotaNotice &&
            !(name === "StopFailure" && state.resuming)
        )
            return;
        if (this.#observeNotification(event, state)) return;
        if (name === "StopFailure") {
            if (key && state.ambiguous.has(key)) return;
            if (key && !state.prompts.has(key) && !state.earlyFailures.has(key))
                state.earlyFailures.set(key, failureReason(event));
            if (key && (state.prompts.has(key) || state.resuming))
                await this.#finish(key, "failed", failureReason(event), state);
            else if (
                !key ||
                state.latest === undefined ||
                state.latest === key
            ) {
                state.resuming = false;
                state.failure = failureReason(event);
                if (
                    !this.#currentSession ||
                    (this.#currentSession === session &&
                        this.#sessions.get(session) === state)
                )
                    this.#project();
            }
        }
    }

    async failPending(reason: string): Promise<void> {
        return this.#enqueue(async () => {
            for (const session of this.#sessions.values())
                session.quota = undefined;

            this.#session(this.#currentSession ?? "unknown").failure =
                "connection_lost";
            for (const session of this.#sessions.values())
                session.resuming = false;
            this.#project();
            await this.#finishPending("failed", reason);
        });
    }

    async interruptPending(): Promise<void> {
        return this.#enqueue(async () => {
            for (const session of this.#sessions.values())
                session.quota = undefined;

            for (const session of this.#sessions.values())
                session.failure = undefined;
            for (const session of this.#sessions.values())
                session.resuming = false;
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
        const pending = this.#pending.get(frame);
        if (pending === undefined) return;
        const delivery = pending.deliveryId;
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
        this.forget(frame);
        for (const session of this.#sessions.values())
            for (const [key, content] of session.prompts)
                if (content === frame) {
                    session.prompts.delete(key);
                    session.ambiguous.delete(key);
                    this.#rememberFinished(key);
                }
    }

    #rememberFinished(key: string, state = this.#promptSession(key)): void {
        state.finished.add(key);
    }

    #enqueue(action: () => Promise<void>): Promise<void> {
        return Effect.runPromise(
            Semaphore.withPermit(this.#queue)(
                Effect.tryPromise({
                    try: action,
                    catch: (error) => error,
                }),
            ),
        );
    }

    #observeNotification(
        event: Record<string, unknown>,
        session: ClaudeSession,
    ): boolean {
        if (event.hook_event_name !== "Notification") return false;
        const id = String(event.session_id);
        switch (event.notification_type) {
            case "quota_auto_resume_fired":
                session.quota = undefined;
                session.failure = undefined;
                session.resuming = true;
                if (session.latest) session.chain.resume(session.latest);
                break;
            case "quota_auto_resume_stale":
                session.quota = "Press Enter to resume the task automatically.";
                break;
            case "quota_auto_resume_disabled":
                if (!session.quota && !session.resuming) return true;
                session.quota = undefined;
                session.resuming = false;
                break;
            default:
                return true;
        }
        if (this.#currentSession === id && this.#sessions.get(id) === session)
            this.#project();
        return true;
    }

    #project(): void {
        if (!this.#registry) return;
        if (
            this.#registry &&
            this.#registry.sessionId === this.#currentSession
        ) {
            const registry = this.#registry;
            const failure = this.#session(registry.sessionId).failure;
            const quota = this.#session(registry.sessionId).quota;
            this.controls.setStatus(
                registry.status === "waiting" || quota
                    ? "awaiting-user"
                    : registry.status === "busy" || registry.status === "shell"
                      ? "working"
                      : failure
                        ? "failed"
                        : "idle",
                registry.status === "waiting"
                    ? registry.waitingFor === "permission prompt"
                        ? "Waiting for approval."
                        : "Waiting for user input."
                    : (quota ??
                          (registry.status === "shell"
                              ? "Bash 작업이 남아 있습니다."
                              : registry.status === "busy"
                                ? undefined
                                : failure)),
            );
            return;
        }
    }
}
