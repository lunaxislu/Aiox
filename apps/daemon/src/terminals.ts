import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { resolve } from "node:path";

import type { TerminalContext, TerminalView } from "@aiox/protocol";
import type { TerminalSession } from "@aiox/terminal";
import { createTerminal } from "@aiox/terminal";
import type { WebSocket } from "ws";

export type TerminalOptions = {
    file?: string | undefined;
    args?: readonly string[] | undefined;
    cwd?: string | undefined;
    env?: Record<string, string> | undefined;
    cols?: number | undefined;
    rows?: number | undefined;
};

/**
 * The server owns the pty. A browser attachment is a view of it, never its
 * owner: closing a tab detaches, it does not stop anything.
 */
export class TerminalService {
    readonly #sessions = new Map<string, TerminalSession>();

    readonly #metadata = new Map<
        string,
        {
            cwd: string;
            kind: "shell" | "agent";
            token: string | null;
        }
    >();

    create(options: TerminalOptions = {}): TerminalSession {
        return this.#create(options, "agent");
    }

    createShell(
        options: Pick<TerminalOptions, "cwd" | "cols" | "rows"> = {},
    ): TerminalSession {
        return this.#create(options, "shell");
    }

    #create(
        options: TerminalOptions,
        kind: "shell" | "agent",
    ): TerminalSession {
        const id = randomUUID();
        const cwd = resolve(options.cwd ?? process.cwd());
        const token = kind === "shell" ? randomBytes(32).toString("hex") : null;
        if (token) {
            options = {
                ...options,
                env: {
                    ...(Object.fromEntries(
                        Object.entries(process.env).filter(
                            ([key, value]) =>
                                !key.toUpperCase().startsWith("AIOX_") &&
                                value !== undefined,
                        ),
                    ) as Record<string, string>),
                    AIOX_TERMINAL_ID: id,
                    AIOX_TERMINAL_TOKEN: token,
                },
            };
        }
        // Drop absent keys rather than passing explicit undefined, which an
        // exactOptionalPropertyTypes signature rejects.
        const session = createTerminal({
            id,
            ...Object.fromEntries(
                Object.entries(options).filter(
                    ([, value]) => value !== undefined,
                ),
            ),
            cwd,
        });
        this.#sessions.set(id, session);
        this.#metadata.set(id, { cwd, kind, token });
        if (kind === "shell") {
            session.subscribe({ data: () => {}, exit: () => this.#remove(id) });
            if (!session.alive) this.#remove(id);
        }
        return session;
    }

    authenticateContext(context: TerminalContext): TerminalSession {
        const session = this.#sessions.get(context.terminalId);
        const token = this.#metadata.get(context.terminalId)?.token;
        const supplied = Buffer.from(context.token);
        if (
            !session?.alive ||
            !token ||
            supplied.length !== token.length ||
            !timingSafeEqual(supplied, Buffer.from(token))
        ) {
            throw new Error("Invalid or expired terminal context.");
        }
        return session;
    }

    view(id: string): TerminalView | undefined {
        const session = this.#sessions.get(id);
        const metadata = this.#metadata.get(id);
        if (!session || !metadata) return undefined;
        return {
            id,
            cwd: metadata.cwd,
            kind: metadata.kind,
            alive: session.alive,
        };
    }

    views(): TerminalView[] {
        return [...this.#sessions.keys()].map((id) => this.view(id)!);
    }

    #remove(id: string): void {
        const session = this.#sessions.get(id);
        this.#sessions.delete(id);
        this.#metadata.delete(id);
        void session?.dispose().catch((error: unknown) => {
            console.error(`terminal ${id}: mirror disposal failed`, error);
        });
    }

    get(id: string): TerminalSession | undefined {
        return this.#sessions.get(id);
    }

    list(): TerminalSession[] {
        return [...this.#sessions.values()];
    }

    async kill(id: string): Promise<boolean> {
        const session = this.#sessions.get(id);
        if (!session) return false;
        await session.kill();
        this.#remove(id);
        return true;
    }

    /**
     * Stops every managed terminal and reports what could not be confirmed
     * gone. A failure to observe an exit is not evidence of an exit.
     */
    async killAll(): Promise<{ stopped: string[]; unconfirmed: string[] }> {
        const stopped: string[] = [];
        const unconfirmed: string[] = [];
        await Promise.all(
            [...this.#sessions].map(async ([id, session]) => {
                try {
                    await session.kill();
                    stopped.push(id);
                } catch (error) {
                    unconfirmed.push(
                        `${id}: ${error instanceof Error ? error.message : String(error)}`,
                    );
                }
            }),
        );
        for (const id of stopped) this.#remove(id);
        return { stopped, unconfirmed };
    }
}

type ControlMessage =
    | { type: "resize"; cols: number; rows: number }
    | { type: "response"; data: string }
    | { type: "ack"; offset: number };

// Bounds live bytes awaiting browser parsing, independently of snapshot/tail retention.
const MAX_UNPARSED_VIEWER_BYTES = 8 * 1024 * 1024;

const responseOwners = new WeakMap<
    TerminalSession,
    {
        viewers: Set<WebSocket>;
        owner: WebSocket | undefined;
        decisions: WeakMap<object, WebSocket | undefined>;
    }
>();

function parseControl(raw: string): ControlMessage | undefined {
    try {
        const value: unknown = JSON.parse(raw);
        if (
            typeof value === "object" &&
            value !== null &&
            "type" in value &&
            value.type === "ack" &&
            "offset" in value &&
            Number.isSafeInteger(value.offset) &&
            (value.offset as number) >= 0
        ) {
            return { type: "ack", offset: value.offset as number };
        }
        if (
            typeof value === "object" &&
            value !== null &&
            "type" in value &&
            value.type === "response" &&
            "data" in value &&
            typeof value.data === "string"
        ) {
            return { type: "response", data: value.data };
        }
        if (
            typeof value === "object" &&
            value !== null &&
            (value as { type?: unknown }).type === "resize"
        ) {
            const { cols, rows } = value as { cols: unknown; rows: unknown };
            if (
                Number.isSafeInteger(cols) &&
                Number.isSafeInteger(rows) &&
                (cols as number) > 0 &&
                (rows as number) > 0
            ) {
                return {
                    type: "resize",
                    cols: cols as number,
                    rows: rows as number,
                };
            }
        }
    } catch {
        // A malformed control frame is ignored; it must not tear down the pty.
    }
    return undefined;
}

/** Ordered snapshot restoration followed by live PTY output. */
export function attachTerminal(
    socket: WebSocket,
    session: TerminalSession,
): void {
    let group = responseOwners.get(session);
    if (!group) {
        group = { viewers: new Set(), owner: socket, decisions: new WeakMap() };
        responseOwners.set(session, group);
    }
    group.viewers.add(socket);
    const ownership = group;
    let sentOffset = 0;
    let acknowledgedOffset = 0;
    let detached = false;
    let detach = () => {};
    const close = () => {
        if (detached) return;
        detached = true;
        ownership.viewers.delete(socket);
        if (ownership.owner === socket)
            ownership.owner = ownership.viewers.values().next().value;
        if (ownership.viewers.size === 0) responseOwners.delete(session);
        detach();
    };
    const send = (data: Uint8Array | object) => {
        if (detached || socket.readyState !== socket.OPEN) return;
        socket.send(data instanceof Uint8Array ? data : JSON.stringify(data));
    };
    socket.on("close", close);
    socket.on("error", close);
    socket.on("message", (data: Buffer, isBinary: boolean) => {
        if (detached) return;
        try {
            if (isBinary) {
                ownership.owner = socket;
                session.write(new Uint8Array(data));
                return;
            }
            const control = parseControl(data.toString("utf8"));
            if (control?.type === "resize")
                session.resize(control.cols, control.rows);
            else if (control?.type === "response") session.write(control.data);
            else if (
                control?.type === "ack" &&
                control.offset >= acknowledgedOffset &&
                control.offset <= sentOffset
            )
                acknowledgedOffset = control.offset;
        } catch (error) {
            try {
                send({
                    type: "error",
                    message:
                        error instanceof Error
                            ? error.message
                            : "Terminal input failed.",
                });
            } catch {
                // A failed transport cannot carry its own error report.
            } finally {
                close();
                socket.close();
            }
        }
    });
    detach = session.attach({
        snapshot: ({ cols, rows, state, data, tail }) => {
            send({ type: "snapshot", cols, rows, state });
            send(data);
            send({ type: "snapshot-end" });
            for (const event of tail) {
                send(event.type === "data" ? event.data : event);
            }
            send({ type: "restored" });
        },
        data: (data, frame = data) => {
            if (detached) return;
            if (
                sentOffset - acknowledgedOffset + data.byteLength >
                    MAX_UNPARSED_VIEWER_BYTES ||
                !Number.isSafeInteger(sentOffset + data.byteLength)
            ) {
                try {
                    send({
                        type: "error",
                        message:
                            "Terminal output backlog exceeds the limit. Reconnect to restore the current screen.",
                    });
                } finally {
                    close();
                    socket.close(
                        1013,
                        "Terminal output backlog exceeds limit. Reconnect to restore the screen.",
                    );
                }
                return;
            }
            sentOffset += data.byteLength;
            if (!ownership.decisions.has(frame))
                ownership.decisions.set(frame, ownership.owner);
            send({
                type: "output",
                respond: ownership.decisions.get(frame) === socket,
                offset: sentOffset,
            });
            send(data);
        },
        resize: (cols, rows) => send({ type: "resize", cols, rows }),
        exit: (event) => {
            send({ type: "exit", ...event });
            socket.close();
        },
        error: (error) => {
            send({ type: "error", message: error.message });
            socket.close();
        },
    });
    if (detached) detach();
}
