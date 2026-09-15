import { randomBytes, timingSafeEqual } from "node:crypto";
import { once } from "node:events";
import type { IncomingMessage } from "node:http";

import { WebSocket, WebSocketServer } from "ws";

const threadMethods = new Set(["thread/start", "thread/resume", "thread/fork"]);
const observedMethods = new Set([
    "turn/started",
    "turn/completed",
    "item/started",
    "item/completed",
    "serverRequest/resolved",
    "item/commandExecution/requestApproval",
    "item/fileChange/requestApproval",
    "item/permissions/requestApproval",
    "item/tool/requestUserInput",
    "mcpServer/elicitation/request",
]);
export type RelayState = { threadId: string | null; error: string | null };
export type RelayConnection = { url: string; token: string };

/** This listener belongs to the execution owner, never to collaboration cleanup. */
export async function createRelay() {
    const token = randomBytes(32).toString("base64url");
    const tuiToken = randomBytes(32).toString("base64url");
    let upstreamUrl: string | undefined;
    let upstreamToken = "";
    let instruction = "";
    let activeThreadId: string | null = null;
    let failure: string | null = null;
    let tui: WebSocket | undefined;
    let upstream: WebSocket | undefined;
    let control: WebSocket | undefined;
    const pendingConnections = new Set<Set<string | number>>();
    const requests = new Map<
        string,
        {
            client: WebSocket;
            peer: WebSocket;
            id: string;
            threadId: string;
            timer: ReturnType<typeof setTimeout>;
        }
    >();
    const state = (): RelayState => ({
        threadId: [...pendingConnections].some((pending) => pending.size)
            ? null
            : activeThreadId,
        error: failure,
    });
    const send = (socket: WebSocket | undefined, frame: unknown) => {
        if (socket?.readyState === WebSocket.OPEN)
            socket.send(JSON.stringify(frame));
    };
    const publish = () => send(control, { type: "state", ...state() });
    const failRequests = (peer?: WebSocket) => {
        for (const [key, request] of requests) {
            if (peer && request.peer !== peer) continue;
            const { client, id, timer } = request;
            clearTimeout(timer);
            requests.delete(key);
            send(client, {
                type: "response",
                id,
                error: "Codex connection closed; input outcome is unknown.",
            });
        }
    };
    const server = new WebSocketServer({
        host: "127.0.0.1",
        port: 0,
        maxPayload: 16 * 1024 * 1024,
        verifyClient: ({ req }: { req: IncomingMessage }) => {
            const expected =
                req.url === "/"
                    ? tuiToken
                    : req.url === "/control"
                      ? token
                      : undefined;
            const received = req.headers.authorization;
            if (!expected || !received) return false;
            const a = Buffer.from(received),
                b = Buffer.from(`Bearer ${expected}`);
            return a.length === b.length && timingSafeEqual(a, b);
        },
    });
    server.on("connection", (client, req) => {
        client.on("error", () => {});
        if (req.url === "/control") {
            if (control) {
                client.close(1008, "Control already attached");
                return;
            }
            control = client;
            publish();
            client.on("close", () => {
                if (control === client) control = undefined;
                for (const [key, value] of requests)
                    if (value.client === client) {
                        clearTimeout(value.timer);
                        requests.delete(key);
                    }
            });
            client.on("message", (raw) => {
                const message = parseFrame(raw.toString());
                if (
                    !message ||
                    message.type !== "deliver" ||
                    typeof message.id !== "string" ||
                    !message.params ||
                    typeof message.params !== "object"
                ) {
                    client.close(1008, "Invalid control request");
                    return;
                }
                if (
                    !state().threadId ||
                    upstream?.readyState !== WebSocket.OPEN
                ) {
                    send(client, {
                        type: "response",
                        id: message.id,
                        error: "Codex has no confirmed active TUI thread.",
                    });
                    return;
                }
                const id = `aiox:${randomBytes(24).toString("hex")}`;
                const originalId = message.id;
                const timer = setTimeout(() => {
                    requests.delete(id);
                    send(client, {
                        type: "response",
                        id: originalId,
                        error: "Codex input acceptance timed out; outcome is unknown. Input was not retried.",
                    });
                }, 30_000);
                requests.set(id, {
                    client,
                    peer: upstream,
                    id: originalId,
                    threadId: activeThreadId!,
                    timer,
                });
                send(upstream, {
                    id,
                    method: "turn/start",
                    params: { ...message.params, threadId: activeThreadId },
                });
            });
            return;
        }
        if (!upstreamUrl) {
            client.close(1013, "Codex TUI connection unavailable");
            return;
        }
        // The resume picker opens its own connection; request IDs are connection-local.
        const pendingThreads = new Set<string | number>();
        const internalThreads = new Set<string | number>();
        const hiddenThreads = new Set<string>();
        pendingConnections.add(pendingThreads);
        const peer = new WebSocket(upstreamUrl, {
            headers: { Authorization: `Bearer ${upstreamToken}` },
            handshakeTimeout: 10_000,
            maxPayload: 16 * 1024 * 1024,
        });
        const queue: string[] = [];
        let queuedBytes = 0;
        let closed = false;
        const close = () => {
            if (closed) return;
            closed = true;
            pendingThreads.clear();
            pendingConnections.delete(pendingThreads);
            failRequests(peer);
            if (tui === client) {
                activeThreadId = null;
                tui = undefined;
                upstream = undefined;
            }
            client.terminate();
            peer.terminate();
            publish();
        };
        client.on("close", close);
        peer.on("close", close);
        peer.on("error", () => {
            if (!tui || tui === client)
                failure = "Cannot connect the TUI to its Codex App Server.";
            close();
        });
        peer.on("open", () => {
            for (const frame of queue.splice(0)) peer.send(frame);
        });
        client.on("message", (raw) => {
            if (closed) return;
            let frame = raw.toString();
            const message = parseFrame(frame);
            if (!message) {
                close();
                return;
            }
            if (
                (typeof message.id === "string" ||
                    typeof message.id === "number") &&
                typeof message.method === "string" &&
                threadMethods.has(message.method)
            ) {
                const params = message.params;
                const internal =
                    message.method === "thread/start" &&
                    params &&
                    typeof params === "object" &&
                    (params as Record<string, unknown>).ephemeral === true &&
                    (params as Record<string, unknown>).threadSource ===
                        "system";
                if (internal) internalThreads.add(message.id);
                else pendingThreads.add(message.id);
                if (
                    instruction &&
                    params &&
                    typeof params === "object" &&
                    !Array.isArray(params)
                ) {
                    const values = params as Record<string, unknown>;
                    const existing = values.developerInstructions;
                    // TUI fork/visualization overrides otherwise replace the App Server config value.
                    if (
                        typeof existing === "string" &&
                        !existing.includes(instruction)
                    ) {
                        values.developerInstructions = [existing, instruction]
                            .filter(Boolean)
                            .join("\n\n");
                        frame = JSON.stringify(message);
                    }
                }

                if (!internal) publish();
            }
            if (peer.readyState === WebSocket.OPEN) peer.send(frame);
            else {
                queuedBytes += Buffer.byteLength(frame);
                if (queuedBytes > 16 * 1024 * 1024) close();
                else queue.push(frame);
            }
        });
        peer.on("message", (raw) => {
            if (closed) return;
            const frame = raw.toString();
            const message = parseFrame(frame);
            if (
                message &&
                typeof message.id === "string" &&
                requests.get(message.id)?.peer === peer &&
                message.method === undefined
            ) {
                const pending = requests.get(message.id)!;
                requests.delete(message.id);
                clearTimeout(pending.timer);
                send(pending.client, {
                    type: "response",
                    id: pending.id,
                    ...(message.error
                        ? {
                              error:
                                  typeof message.error === "object" &&
                                  "message" in message.error &&
                                  typeof message.error.message === "string"
                                      ? message.error.message
                                      : "Codex rejected the input.",
                          }
                        : {
                              result: {
                                  ...(message.result as object),
                                  threadId: pending.threadId,
                              },
                          }),
                });
                return;
            }
            if (
                message &&
                message.method === undefined &&
                (typeof message.id === "string" ||
                    typeof message.id === "number") &&
                internalThreads.delete(message.id)
            ) {
                const result = message.result as
                    | { thread?: { id?: unknown } }
                    | undefined;
                if (!message.error && typeof result?.thread?.id === "string")
                    hiddenThreads.add(result.thread.id);
            }
            if (
                message &&
                message.method === undefined &&
                (typeof message.id === "string" ||
                    typeof message.id === "number") &&
                pendingThreads.delete(message.id)
            ) {
                const result = message.result as
                    | { thread?: { id?: unknown } }
                    | undefined;
                if (
                    !message.error &&
                    typeof result?.thread?.id === "string" &&
                    result.thread.id
                ) {
                    activeThreadId = result.thread.id;
                    tui = client;
                    upstream = peer;
                    failure = null;
                }
                publish();
            }
            if (
                message &&
                observedMethods.has(String(message.method)) &&
                message.params &&
                typeof message.params === "object" &&
                !hiddenThreads.has(
                    String(
                        (message.params as Record<string, unknown>).threadId,
                    ),
                )
            )
                send(control, {
                    type: "event",
                    method: message.method,
                    params: message.params,
                    id: message.id,
                });
            if (client.readyState === WebSocket.OPEN) client.send(frame);
        });
    });
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string")
        throw new Error("Codex relay did not bind.");
    return {
        connection: { url: `ws://127.0.0.1:${address.port}`, token },
        tuiToken,
        get activeThreadId() {
            return activeThreadId;
        },
        setUpstream(
            url: string,
            credential: string,
            executionInstruction = "",
        ) {
            upstreamUrl = url;
            upstreamToken = credential;
            instruction = executionInstruction;
        },
        fail(message: string) {
            failure = message;
            activeThreadId = null;
            publish();
        },
        async close() {
            failRequests();
            upstream?.terminate();
            for (const client of server.clients) client.terminate();
            await new Promise<void>((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve())),
            );
        },
    };
}

function parseFrame(frame: string): Record<string, unknown> | null {
    try {
        const result: unknown = JSON.parse(frame);
        return result !== null &&
            typeof result === "object" &&
            !Array.isArray(result)
            ? (result as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}
