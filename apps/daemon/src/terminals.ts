import { execFile } from "node:child_process";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { readlink } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

import type { TerminalLaunch } from "@aiox/config";
import { logger } from "@aiox/diagnostics";
import type { TerminalContext, TerminalView } from "@aiox/protocol";
import type { TerminalSession } from "@aiox/terminal";
import { createTerminal } from "@aiox/terminal";
import type { WebSocket } from "ws";

const run = promisify(execFile);

async function processCwd(pid: number): Promise<string | undefined> {
    try {
        if (process.platform === "linux")
            return await readlink(`/proc/${pid}/cwd`);
        if (process.platform === "darwin") {
            const { stdout } = await run(
                "/usr/sbin/lsof",
                ["-a", "-p", String(pid), "-d", "cwd", "-F0n"],
                { timeout: 1_000, encoding: "buffer" },
            );
            const field = stdout
                .toString("utf8")
                .split("\0")
                .find((part) => part.startsWith("n/"));
            return field?.slice(1);
        }
    } catch {
        // A dead process, missing permission, or unsupported host retains last known cwd.
    }
    return undefined;
}

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
    constructor(
        private readonly onChange: (id: string) => void = () => {},
        private readonly onRemoved: (id: string) => void = () => {},
        private readonly queryCwd: (
            pid: number,
        ) => Promise<string | undefined> = processCwd,
    ) {}
    readonly #sessions = new Map<string, TerminalSession>();
    readonly #cwdQueries = new Map<
        string,
        { promise: Promise<string | undefined>; dirty: boolean }
    >();

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
        options: TerminalLaunch & Pick<TerminalOptions, "cols" | "rows">,
    ): TerminalSession {
        const { displayCwd, ...launch } = options;
        return this.#create(launch, "shell", displayCwd);
    }

    #create(
        options: TerminalOptions,
        kind: "shell" | "agent",
        displayCwd?: string,
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
            shellIntegration: kind === "shell",
            ...Object.fromEntries(
                Object.entries(options).filter(
                    ([, value]) => value !== undefined,
                ),
            ),
            cwd,
            ...(kind === "shell"
                ? {
                      onPrompt: () =>
                          queueMicrotask(() => void this.refreshCwd(id)),
                  }
                : {}),
        });
        this.#sessions.set(id, session);
        this.#metadata.set(id, { cwd: displayCwd ?? cwd, kind, token });
        if (kind === "shell") {
            session.subscribe({ data: () => {}, exit: () => this.#remove(id) });
            if (!session.alive) this.#remove(id);
        } else {
            session.subscribe({
                data: () => {},
                exit: () => this.onChange(id),
            });
        }
        this.onChange(id);
        return session;
    }

    /** Internal launch credential; never included in public terminal views. */
    context(id: string): TerminalContext {
        const token = this.#metadata.get(id)?.token;
        if (!token || !this.#sessions.get(id)?.alive)
            throw new Error("Agent shell is no longer available.");
        return { terminalId: id, token };
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

    /** Recheck the process itself; failed/unsupported queries retain the last known cwd. */
    refreshCwd(id: string): Promise<string | undefined> {
        const pending = this.#cwdQueries.get(id);
        if (pending) {
            pending.dirty = true;
            return pending.promise;
        }
        const session = this.#sessions.get(id);
        const metadata = this.#metadata.get(id);
        if (!session || !metadata) return Promise.resolve(undefined);
        const current = {
            promise: undefined! as Promise<string | undefined>,
            dirty: false,
        };
        current.promise = (async () => {
            try {
                do {
                    current.dirty = false;
                    const cwd = await this.queryCwd(session.pid);
                    if (
                        cwd &&
                        this.#sessions.get(id) === session &&
                        this.#metadata.get(id) === metadata &&
                        metadata.cwd !== cwd
                    ) {
                        metadata.cwd = cwd;
                        this.onChange(id);
                    }
                } while (current.dirty && this.#sessions.get(id) === session);
                return this.#sessions.get(id) === session && session.alive
                    ? metadata.cwd
                    : undefined;
            } finally {
                if (this.#cwdQueries.get(id) === current)
                    this.#cwdQueries.delete(id);
            }
        })();
        this.#cwdQueries.set(id, current);
        return current.promise;
    }

    views(): TerminalView[] {
        return [...this.#sessions.keys()].map((id) => this.view(id)!);
    }

    #remove(id: string): void {
        const session = this.#sessions.get(id);
        if (!session) return;
        this.#sessions.delete(id);
        this.#metadata.delete(id);
        this.onRemoved(id);
        this.onChange(id);
        void session?.dispose().catch((error: unknown) => {
            logger.error(
                { err: error, terminalId: id },
                "Terminal mirror disposal failed",
            );
        });
    }

    get(id: string): TerminalSession | undefined {
        return this.#sessions.get(id);
    }

    list(): TerminalSession[] {
        return [...this.#sessions.values()];
    }

    async busy(): Promise<string[]> {
        const states = await Promise.all(
            this.list().map(async (session) => {
                if (!session.alive) return null;
                try {
                    return (await session.busy()) ? session.id : null;
                } catch {
                    return session.id;
                }
            }),
        );
        return states.filter((id): id is string => id !== null);
    }

    async closeIdle(id: string): Promise<boolean> {
        const session = this.#sessions.get(id);
        if (!session) return true;
        if (!(await session.closeIdle())) return false;
        this.#remove(id);
        return true;
    }

    async kill(id: string): Promise<boolean> {
        const session = this.#sessions.get(id);
        if (!session) return false;
        await session.kill();
        this.#remove(id);
        return true;
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
    acceptingInput: () => boolean = () => true,
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
                if (!acceptingInput()) return;
                ownership.owner = socket;
                session.write(new Uint8Array(data));
                return;
            }
            const control = parseControl(data.toString("utf8"));
            if (control?.type === "resize")
                session.resize(control.cols, control.rows);
            else if (control?.type === "response") {
                if (acceptingInput()) session.write(control.data);
            } else if (
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
        error: (error, restorable = true) => {
            send({
                type: "error",
                message: error.message,
                ...(restorable ? {} : { restorable: false }),
            });
            socket.close();
        },
    });
    if (detached) detach();
}
