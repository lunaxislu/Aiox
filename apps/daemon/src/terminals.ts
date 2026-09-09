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
        this.#sessions.delete(id);
        this.#metadata.delete(id);
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

type ControlMessage = { type: "resize"; cols: number; rows: number };

function parseControl(raw: string): ControlMessage | undefined {
    try {
        const value: unknown = JSON.parse(raw);
        if (
            typeof value === "object" &&
            value !== null &&
            (value as { type?: unknown }).type === "resize"
        ) {
            const { cols, rows } = value as { cols: unknown; rows: unknown };
            if (
                Number.isInteger(cols) &&
                Number.isInteger(rows) &&
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

/**
 * Binary frames carry raw pty bytes in both directions; text frames carry JSON
 * control. The attachment replays the recent output first so a reconnecting
 * viewer does not land on a blank screen.
 */
export function attachTerminal(
    socket: WebSocket,
    session: TerminalSession,
): void {
    const replay = session.snapshot();
    if (replay.length > 0) socket.send(replay);

    const detach = session.subscribe({
        data: (chunk) => {
            if (socket.readyState === socket.OPEN) socket.send(chunk);
        },
        exit: (event) => {
            if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify({ type: "exit", ...event }));
                socket.close();
            }
        },
    });

    socket.on("message", (data: Buffer, isBinary: boolean) => {
        if (isBinary) {
            session.write(new Uint8Array(data));
            return;
        }
        const control = parseControl(data.toString("utf8"));
        if (control) session.resize(control.cols, control.rows);
    });

    // Detaching only removes this viewer. The pty keeps running.
    socket.on("close", detach);
    socket.on("error", detach);
}
