import { randomUUID } from "node:crypto";
import { once } from "node:events";

import { InvalidVendorReport } from "@aiox/vendor";
import type {
    InboundMessage,
    RuntimeControls,
    VendorBinding,
    VendorLaunchInput,
} from "@aiox/vendor";
import { WebSocket } from "ws";
import { z } from "zod";

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

export const connectionSchema = z.strictObject({
    url: z
        .string()
        .regex(/^ws:\/\/127\.0\.0\.1:[1-9][0-9]{0,4}$/)
        .refine((value) => Number(new URL(value).port) <= 65535),
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
});
const stateSchema = z.strictObject({
    type: z.literal("state"),
    threadId: z.string().min(1).nullable(),
    error: z.string().nullable(),
});
const responseSchema = z.object({
    type: z.literal("response"),
    id: z.string(),
    error: z.string().optional(),
    result: z.unknown().optional(),
});
const eventSchema = z.object({
    type: z.literal("event"),
    method: z.string(),
    params: z.record(z.string(), z.unknown()),
    id: z.union([z.string(), z.number()]).optional(),
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
    #flushing = new Map<string, Promise<void>>();
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
            resolve(result: unknown): void;
            reject(error: Error): void;
            timer: ReturnType<typeof setTimeout>;
        }
    >();
    onReady: (() => void) | undefined;
    onReleased: (() => void) | undefined;
    constructor(
        private readonly controls: RuntimeControls,
        private readonly connection: z.infer<typeof connectionSchema>,
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
            const state = stateSchema.safeParse(value);
            if (state.success) {
                this.#thread = state.data.threadId;
                this.#connectionFailure = state.data.error;
                if (state.data.error !== null) this.#failed(state.data.error);
                else this.#updateActivity();
                return;
            }
            const event = eventSchema.safeParse(value);
            if (event.success) {
                this.#event(event.data);
                return;
            }
            const response = responseSchema.safeParse(value);
            if (!response.success) {
                this.#failed("Invalid Codex relay report.");
                return;
            }
            const pending = this.#requests.get(response.data.id);
            if (!pending) return;
            clearTimeout(pending.timer);
            this.#requests.delete(response.data.id);
            if (response.data.error)
                pending.reject(new Error(response.data.error));
            else pending.resolve(response.data.result);
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
    #event(event: z.infer<typeof eventSchema>) {
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
                    void this.#flush(key).catch(() => {});
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
    #flush(key: string): Promise<void> {
        const active = this.#flushing.get(key);
        if (active) return active;
        // Register ownership before settling; release it in the same synchronous
        // step as the drained entries so a late acceptance starts a new flush.
        const flushing = Promise.resolve().then(async () => {
            try {
                const result = this.#results.get(key);
                const deliveries = this.#turns.get(key);
                if (!result || !deliveries) return;
                for (const deliveryId of deliveries) {
                    await this.controls.settle(
                        deliveryId,
                        result.outcome,
                        result.error,
                    );
                    deliveries.delete(deliveryId);
                }
                this.#turns.delete(key);
                this.#results.delete(key);
            } finally {
                this.#flushing.delete(key);
            }
        });
        this.#flushing.set(key, flushing);
        return flushing;
    }
    #failed(reason: string) {
        this.#ready = false;
        this.#connectionFailure = reason;
        this.controls.setStatus("failed", reason);
        for (const pending of this.#requests.values()) {
            clearTimeout(pending.timer);
            pending.reject(new Error(reason));
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
            result = await new Promise<unknown>((resolve, reject) => {
                const timer = setTimeout(() => {
                    this.#requests.delete(id);
                    reject(
                        new Error(
                            "Codex input outcome is unknown; input was not retried.",
                        ),
                    );
                }, 31_000);
                this.#requests.set(id, { resolve, reject, timer });
                this.#socket!.send(
                    JSON.stringify({
                        type: "deliver",
                        id,
                        params: codexInput(message),
                    }),
                    (error) => {
                        if (error) {
                            clearTimeout(timer);
                            this.#requests.delete(id);
                            reject(
                                new Error(
                                    "Codex relay write failed; input outcome is unknown.",
                                ),
                            );
                        }
                    },
                );
            });
        } catch (error) {
            if (this.#awaitingAcceptance === 1) this.#earlyResults.clear();
            throw error;
        } finally {
            this.#awaitingAcceptance--;
        }
        const accepted = z
            .object({
                threadId: z.string(),
                turn: z.object({ id: z.string() }),
            })
            .safeParse(result);
        if (!accepted.success)
            throw new Error(
                "Codex accepted input without thread and turn IDs.",
            );
        if (message.deliveryId) {
            const key = `${accepted.data.threadId}:${accepted.data.turn.id}`;
            const deliveries = this.#turns.get(key) ?? new Set<string>();
            deliveries.add(message.deliveryId);
            this.#turns.set(key, deliveries);
            const early = this.#earlyResults.get(key);
            if (early) {
                if (!this.#results.has(key)) this.#results.set(key, early);
                void this.#flush(key).catch(() => {});
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
        const flushed = await Promise.allSettled(
            [...this.#results.keys()].map((key) => this.#flush(key)),
        );
        const failure = flushed.find((result) => result.status === "rejected");
        if (failure?.status === "rejected") throw failure.reason;
        const socket = this.#socket;
        if (socket && socket.readyState !== WebSocket.CLOSED) {
            const closed = once(socket, "close");
            socket.terminate();
            await closed;
        }
        this.onReleased?.();
    }
}
