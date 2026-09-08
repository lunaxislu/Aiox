import { randomUUID } from "node:crypto";

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

    create(options: TerminalOptions = {}): TerminalSession {
        const id = randomUUID();
        // Drop absent keys rather than passing explicit undefined, which an
        // exactOptionalPropertyTypes signature rejects.
        const session = createTerminal({
            id,
            ...Object.fromEntries(
                Object.entries(options).filter(
                    ([, value]) => value !== undefined,
                ),
            ),
        });
        this.#sessions.set(id, session);
        return session;
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
        this.#sessions.delete(id);
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
        for (const id of stopped) this.#sessions.delete(id);
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
