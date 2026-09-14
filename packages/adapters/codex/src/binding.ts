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

export class CodexBinding implements VendorBinding {
    #socket: WebSocket | undefined;
    #stopped = false;
    #started = false;
    #mcp = false;
    #requireMcp = false;
    #thread: string | null = null;
    #wasReady = false;
    #ready = false;
    #requests = new Map<
        string,
        {
            resolve(): void;
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
                if (state.data.error) this.#failed(state.data.error);
                else this.#update();
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
            else pending.resolve();
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
        this.#update();
    }
    mcpConnected() {
        this.#mcp = true;
        this.#update();
    }
    #update() {
        if (this.#stopped) return;
        const ready =
            this.#started &&
            this.#thread !== null &&
            (!this.#requireMcp || this.#mcp);
        if (ready && !this.#ready) {
            this.#wasReady = true;
            this.controls.setActivity("idle", { event: "codex_connection" });
            this.onReady?.();
        } else if (!ready && this.#ready)
            this.controls.setActivity("starting", {
                event: "codex_thread_transition",
            });
        this.#ready = ready;
    }
    #failed(reason: string) {
        this.#ready = false;
        this.controls.setActivity("failed", {
            event: "codex_connection",
            reason,
        });
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
        await new Promise<void>((resolve, reject) => {
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
        const socket = this.#socket;
        if (socket && socket.readyState !== WebSocket.CLOSED) {
            const closed = once(socket, "close");
            socket.terminate();
            await closed;
        }
        this.onReleased?.();
    }
}
