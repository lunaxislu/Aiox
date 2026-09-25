import { randomUUID } from "node:crypto";
import { once } from "node:events";

import { InvalidVendorReport } from "@aiox/vendor";
import type {
    InboundMessage,
    RuntimeControls,
    VendorBinding,
    VendorLaunchInput,
} from "@aiox/vendor";
import {
    Cause,
    Deferred,
    Duration,
    Effect,
    Exit,
    Fiber,
    Option,
    Schema,
} from "effect";
import { WebSocket } from "ws";

import { prepareLaunch } from "@/launch";

export function codexInput(message: InboundMessage) {
    const escape = (value: string) =>
        value
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;");
    return {
        input: [],
        toolOutput: {
            name: "send_message_to_thread",
            namespace: "codex_tui",
            // Codex's TUI renderer requires this envelope; its task label is our sender name.
            output: `<codex_delegation>\n  <source_thread_id>${escape(message.from.name)}</source_thread_id>\n  <input>${escape(message.content)}</input>\n</codex_delegation>`,
        },
        additionalContext: {
            aiox: {
                kind: "untrusted",
                value: JSON.stringify({
                    from: message.from,
                    createdAt: message.createdAt,
                }),
            },
        },
    };
}

export const connectionSchema = Schema.Struct({
    url: Schema.String.check(
        Schema.isPattern(/^ws:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/),
        Schema.makeFilter((value) => {
            try {
                return Number(new URL(value).port) <= 65535
                    ? undefined
                    : { path: [], issue: "Port must be at most 65535" };
            } catch {
                return { path: [], issue: "Invalid loopback WebSocket URL" };
            }
        }),
    ),
    token: Schema.String.check(Schema.isPattern(/^[A-Za-z0-9_-]{43}$/)),
}).check(
    Schema.makeFilter((value) => {
        const extra = Object.keys(value).find(
            (key) => !Object.hasOwn({ url: true, token: true }, key),
        );
        return extra === undefined
            ? undefined
            : { path: [extra], issue: "Unexpected key" };
    }),
);
export type CodexConnection = { readonly url: string; readonly token: string };
const stateSchema = Schema.Struct({
    type: Schema.Literal("state"),
    threadId: Schema.NullOr(Schema.String.check(Schema.isMinLength(1))),
    error: Schema.NullOr(Schema.String),
}).check(
    Schema.makeFilter((value) => {
        const extra = Object.keys(value).find(
            (key) =>
                !Object.hasOwn(
                    { type: true, threadId: true, error: true },
                    key,
                ),
        );
        return extra === undefined
            ? undefined
            : { path: [extra], issue: "Unexpected key" };
    }),
);
const responseSchema = Schema.Struct({
    type: Schema.Literal("response"),
    id: Schema.String,
    error: Schema.optional(Schema.String),
    result: Schema.optional(Schema.Unknown),
});
const eventSchema = Schema.Struct({
    type: Schema.Literal("event"),
    method: Schema.String,
    params: Schema.Record(Schema.String, Schema.Unknown),
    id: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
});
type TurnResult = {
    outcome: "completed" | "failed" | "interrupted";
    error?: string;
};

export class CodexBinding implements VendorBinding {
    #socket: WebSocket | undefined;
    #stopped = false;
    #started = false;
    #mcp = false;
    #requireMcp = false;
    #thread: string | null = null;
    #wasReady = false;
    #ready = false;
    #turns = new Map<string, Set<string>>();
    #results = new Map<string, TurnResult>();
    #flushing = new Map<string, Fiber.Fiber<void, unknown>>();
    #earlyResults = new Map<string, TurnResult>();
    #awaitingAcceptance = 0;
    #activeTurns = new Map<string, string>();
    #latestTurns = new Map<string, string>();
    #terminalTurns = new Map<string, { id: string; result: TurnResult }>();
    #failures = new Map<string, string | undefined>();
    #connectionFailure: string | null = null;
    #tools = new Map<string, Set<string>>();
    #pending = new Map<string, { threadId: string; turnId: string | null }>();
    #requests = new Map<
        string,
        {
            result: Deferred.Deferred<unknown, Error>;
            timer: Fiber.Fiber<void, never>;
        }
    >();
    onReady: (() => void) | undefined;
    onReleased: (() => void) | undefined;
    constructor(
        private readonly controls: RuntimeControls,
        private readonly connection: CodexConnection,
    ) {}
    get wasReady() {
        return this.#wasReady;
    }
    async prepare(input: VendorLaunchInput) {
        const launch = await prepareLaunch(input);
        if (this.#stopped) throw new Error("Codex binding is stopped.");
        this.#requireMcp = input.mcpUrl !== null;
        const socket = new WebSocket(this.connection.url + "/control", {
            headers: { Authorization: `Bearer ${this.connection.token}` },
            handshakeTimeout: 10_000,
        });
        this.#socket = socket;
        socket.on("error", () => {});
        socket.on("close", () => {
            if (!this.#stopped)
                this.#failed("Codex collaboration relay disconnected.");
        });
        socket.on("message", (raw) => {
            let value: unknown;
            try {
                value = JSON.parse(raw.toString());
            } catch {
                this.#failed("Invalid Codex relay report.");
                return;
            }
            const state = Schema.decodeUnknownOption(stateSchema, {
                onExcessProperty: "error",
            })(value);
            if (Option.isSome(state)) {
                this.#thread = state.value.threadId;
                this.#connectionFailure = state.value.error;
                if (state.value.error !== null) this.#failed(state.value.error);
                else this.#updateActivity();
                return;
            }
            const event = Schema.decodeUnknownOption(eventSchema)(value);
            if (Option.isSome(event)) {
                this.#event(event.value);
                return;
            }
            const response = Schema.decodeUnknownOption(responseSchema)(value);
            if (Option.isNone(response)) {
                this.#failed("Invalid Codex relay report.");
                return;
            }
            const pending = this.#requests.get(response.value.id);
            if (!pending) return;
            this.#requests.delete(response.value.id);
            Effect.runFork(Fiber.interrupt(pending.timer));
            Deferred.doneUnsafe(
                pending.result,
                response.value.error
                    ? Effect.fail(new Error(response.value.error))
                    : Effect.succeed(response.value.result),
            );
        });
        await once(socket, "open");
        if (this.#stopped) {
            socket.terminate();
            throw new Error("Codex binding is stopped.");
        }
        return launch;
    }
    executionStarted() {
        this.#started = true;
        this.#updateActivity();
    }
    mcpConnected() {
        this.#mcp = true;
        this.#updateActivity();
    }
    #update() {
        if (this.#stopped) return;
        const ready =
            this.#connectionFailure === null &&
            this.#started &&
            this.#thread !== null &&
            (!this.#requireMcp || this.#mcp);
        if (ready && !this.#ready) {
            this.#wasReady = true;
            this.onReady?.();
        } else if (!ready && this.#ready)
            this.controls.setStatus("aiox-preparing");
        this.#ready = ready;
    }
    #updateActivity() {
        this.#update();
        if (!this.#ready || !this.#thread) return;
        const threadId = this.#thread;
        const waiting = [...this.#pending.values()].some(
            (request) => request.threadId === threadId,
        );
        const active = this.#activeTurns.has(threadId);
        const turnId = this.#activeTurns.get(threadId);
        const tool = turnId
            ? (this.#tools.get(`${threadId}:${turnId}`)?.size ?? 0) > 0
            : false;
        this.controls.setStatus(
            waiting
                ? "awaiting-user"
                : active
                  ? "working"
                  : this.#failures.has(threadId)
                    ? "failed"
                    : "idle",
            waiting
                ? "Waiting for user input."
                : active
                  ? tool
                      ? "Running a tool."
                      : "Processing the turn."
                  : this.#failures.get(threadId),
        );
    }
    #event(event: Schema.Schema.Type<typeof eventSchema>) {
        const { method, params, id } = event;
        const threadId = params.threadId;
        if (typeof threadId !== "string") return;
        const turn = params.turn as
            | { id?: unknown; status?: unknown; error?: unknown }
            | undefined;
        const turnId = typeof turn?.id === "string" ? turn.id : null;
        const key = turnId ? `${threadId}:${turnId}` : null;
        if (method === "turn/started" && turnId) {
            this.#activeTurns.set(threadId, turnId);
            this.#latestTurns.set(threadId, turnId);
            this.#failures.delete(threadId);
        }
        if (method === "turn/completed" && key) {
            const status = turn?.status;
            if (
                status === "completed" ||
                status === "failed" ||
                status === "interrupted"
            ) {
                const error = turn?.error;
                const previous = this.#terminalTurns.get(threadId);
                const result: TurnResult =
                    previous?.id === turnId
                        ? previous.result
                        : {
                              outcome: status,
                              ...(status === "failed" &&
                              error &&
                              typeof error === "object" &&
                              "message" in error &&
                              typeof error.message === "string"
                                  ? { error: error.message }
                                  : {}),
                          };
                // A late result still settles its delivery, but cannot replace a newer turn's status.
                if (
                    previous?.id !== turnId &&
                    (!this.#latestTurns.has(threadId) ||
                        this.#latestTurns.get(threadId) === turnId)
                ) {
                    this.#latestTurns.set(threadId, turnId!);
                    this.#terminalTurns.set(threadId, { id: turnId!, result });
                    if (status === "failed") {
                        const info =
                            error &&
                            typeof error === "object" &&
                            "codexErrorInfo" in error
                                ? error.codexErrorInfo
                                : undefined;
                        const classification =
                            typeof info === "string"
                                ? info
                                : info && typeof info === "object"
                                  ? JSON.stringify(info)
                                  : undefined;
                        const parts = [result.error, classification].filter(
                            (value) => value !== undefined,
                        );
                        this.#failures.set(
                            threadId,
                            parts.length ? parts.join(" · ") : undefined,
                        );
                    } else this.#failures.delete(threadId);
                }
                if (this.#turns.has(key)) {
                    if (!this.#results.has(key)) this.#results.set(key, result);
                    this.#flush(key);
                }
                if (
                    this.#awaitingAcceptance > 0 &&
                    !this.#earlyResults.has(key)
                )
                    this.#earlyResults.set(
                        key,
                        this.#results.get(key) ?? result,
                    );
            }
            if (this.#activeTurns.get(threadId) === turnId)
                this.#activeTurns.delete(threadId);
            this.#tools.delete(key);
            for (const [requestId, request] of this.#pending)
                if (request.threadId === threadId && request.turnId === turnId)
                    this.#pending.delete(requestId);
        }
        const item = params.item as
            | { id?: unknown; type?: unknown }
            | undefined;
        if (
            typeof item?.id === "string" &&
            typeof params.turnId === "string" &&
            this.#activeTurns.get(threadId) === params.turnId
        ) {
            const toolKey = `${threadId}:${params.turnId}`;
            const tools = this.#tools.get(toolKey) ?? new Set<string>();
            if (
                method === "item/started" &&
                [
                    "commandExecution",
                    "fileChange",
                    "mcpToolCall",
                    "dynamicToolCall",
                ].includes(String(item.type))
            )
                tools.add(item.id);
            if (method === "item/completed") tools.delete(item.id);
            if (tools.size) this.#tools.set(toolKey, tools);
            else this.#tools.delete(toolKey);
        }
        if (
            id !== undefined &&
            ((typeof params.turnId === "string" &&
                this.#activeTurns.get(threadId) === params.turnId) ||
                (params.turnId === null &&
                    method === "mcpServer/elicitation/request")) &&
            (method.endsWith("/requestApproval") ||
                method === "item/tool/requestUserInput" ||
                method === "mcpServer/elicitation/request")
        )
            this.#pending.set(`${threadId}:${id}`, {
                threadId,
                turnId: params.turnId,
            });
        if (
            method === "serverRequest/resolved" &&
            (typeof params.requestId === "string" ||
                typeof params.requestId === "number")
        )
            this.#pending.delete(`${threadId}:${params.requestId}`);
        if (threadId === this.#thread) this.#updateActivity();
    }
    #flush(key: string): Fiber.Fiber<void, unknown> {
        const active = this.#flushing.get(key);
        if (active) return active;
        const binding = this;
        // Register the Fiber before delivery settlement can complete so late
        // acceptance joins this drain instead of racing a second drain.
        const flushing = Effect.runFork(
            Effect.gen(function* () {
                const result = binding.#results.get(key);
                const deliveries = binding.#turns.get(key);
                if (!result || !deliveries) return;
                for (const deliveryId of deliveries) {
                    yield* Effect.tryPromise({
                        try: () =>
                            binding.controls.settle(
                                deliveryId,
                                result.outcome,
                                result.error,
                            ),
                        catch: (error) => error,
                    });
                    deliveries.delete(deliveryId);
                }
                binding.#turns.delete(key);
                binding.#results.delete(key);
            }),
        );
        this.#flushing.set(key, flushing);
        flushing.addObserver(() => {
            if (this.#flushing.get(key) === flushing)
                this.#flushing.delete(key);
        });
        return flushing;
    }
    #failed(reason: string) {
        this.#ready = false;
        this.#connectionFailure = reason;
        this.controls.setStatus("failed", reason);
        for (const pending of this.#requests.values()) {
            Effect.runFork(Fiber.interrupt(pending.timer));
            Deferred.doneUnsafe(pending.result, Effect.fail(new Error(reason)));
        }
        this.#requests.clear();
    }
    async observe(): Promise<void> {
        throw new InvalidVendorReport(
            "Codex observations use the authenticated Relay connection.",
        );
    }
    async deliver(message: InboundMessage): Promise<void> {
        if (
            !this.#ready ||
            this.#stopped ||
            this.#socket?.readyState !== WebSocket.OPEN
        )
            throw new Error("Codex has no confirmed active TUI thread.");
        const id = randomUUID();
        this.#awaitingAcceptance++;
        let result: unknown;
        try {
            const resultDeferred = Deferred.makeUnsafe<unknown, Error>();
            const binding = this;
            const timer = Effect.runFork(
                Effect.gen(function* () {
                    yield* Effect.clockWith((clock) =>
                        clock.sleep(Duration.millis(31_000)),
                    );
                    const pending = binding.#requests.get(id);
                    if (pending?.result !== resultDeferred) return;
                    binding.#requests.delete(id);
                    Deferred.doneUnsafe(
                        resultDeferred,
                        Effect.fail(
                            new Error(
                                "Codex input outcome unknown; input was not retried.",
                            ),
                        ),
                    );
                }),
            );
            this.#requests.set(id, { result: resultDeferred, timer });
            const failSend = (error: Error) => {
                const pending = this.#requests.get(id);
                if (pending?.result !== resultDeferred) return;
                this.#requests.delete(id);
                Effect.runFork(Fiber.interrupt(timer));
                Deferred.doneUnsafe(resultDeferred, Effect.fail(error));
            };
            try {
                this.#socket!.send(
                    JSON.stringify({
                        type: "deliver",
                        id,
                        params: codexInput(message),
                    }),
                    (error) => {
                        if (error)
                            failSend(
                                new Error(
                                    "Codex relay write failed; input outcome is unknown.",
                                ),
                            );
                    },
                );
            } catch (error) {
                failSend(
                    new Error(
                        `Codex relay write failed; input outcome is unknown: ${String(error)}`,
                    ),
                );
            }
            result = await Effect.runPromise(Deferred.await(resultDeferred));
        } catch (error) {
            if (this.#awaitingAcceptance === 1) this.#earlyResults.clear();
            throw error;
        } finally {
            this.#awaitingAcceptance--;
        }
        const accepted = Schema.decodeUnknownOption(
            Schema.Struct({
                threadId: Schema.String,
                turn: Schema.Struct({ id: Schema.String }),
            }),
        )(result);
        if (Option.isNone(accepted))
            throw new Error(
                "Codex accepted input without thread and turn IDs.",
            );
        if (message.deliveryId) {
            const key = `${accepted.value.threadId}:${accepted.value.turn.id}`;
            const deliveries = this.#turns.get(key) ?? new Set<string>();
            deliveries.add(message.deliveryId);
            this.#turns.set(key, deliveries);
            const early = this.#earlyResults.get(key);
            if (early) {
                if (!this.#results.has(key)) this.#results.set(key, early);
                this.#flush(key);
            }
        }
        if (this.#awaitingAcceptance === 0) this.#earlyResults.clear();
    }
    async connectionLost() {
        this.#failed("Codex foreground connection lost.");
    }
    async processExited(exitCode: number, signal: number | null) {
        this.#started = false;
        this.#failed(
            signal === null && exitCode !== 0
                ? "Codex process failed."
                : "Codex process exited.",
        );
    }
    async cleanup() {
        this.#stopped = true;
        this.#failed("Codex collaboration released.");
        const flushed = await Effect.runPromise(
            Effect.all(
                [...this.#results.keys()].map((key) =>
                    Effect.exit(Fiber.join(this.#flush(key))),
                ),
                { concurrency: "unbounded" },
            ),
        );
        const failures = flushed
            .filter(Exit.isFailure)
            .map((exit) => Cause.squash(exit.cause));
        if (failures.length === 1) throw failures[0];
        if (failures.length > 1)
            throw new AggregateError(failures, failures.map(String).join("; "));
        const socket = this.#socket;
        if (socket && socket.readyState !== WebSocket.CLOSED) {
            const closed = once(socket, "close");
            socket.terminate();
            await closed;
        }
        this.onReleased?.();
    }
}
