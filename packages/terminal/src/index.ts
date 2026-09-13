import { Terminal } from "@xterm/headless";
import { type IPtyForkOptions, spawn } from "node-pty";

import { MirrorBoundary, type BoundaryEvent } from "@/boundary";
import type { TerminalRestoreState } from "@/restore";
import { serializeTerminal } from "@/serialization";
import { prepareShell } from "@/shell-integration";

export { MirrorBoundary, type BoundaryEvent } from "@/boundary";

/**
 * A single server owned PTY. The daemon keeps the registry, the HTTP surface
 * and the WebSocket attachments; this module owns one live process, its
 * headless screen and the ordered snapshot-to-live boundary.
 *
 * Web attach and detach are viewing operations. Dropping the last subscriber
 * never stops the process ([[docs/architecture/aiox-storage-terminal]] "PTY와
 * Web 복귀"), and a signal that was accepted is not a process that has exited
 * ([[docs/specs/aiox-runtime]]).
 */

export type TerminalExit = { exitCode: number; signal: number | null };

export type TerminalSnapshot = {
    cols: number;
    rows: number;
    data: Uint8Array;
    state: TerminalRestoreState;
    tail: BoundaryEvent[];
};
export type TerminalAttachmentListener = TerminalListener & {
    snapshot(value: TerminalSnapshot): void;
    resize(cols: number, rows: number): void;
    error(error: Error, restorable?: boolean): void;
};

export type TerminalListener = {
    data(chunk: Uint8Array, frame?: object): void;
    exit(event: TerminalExit): void;
};

export type TerminalSession = {
    readonly id: string;
    readonly pid: number;
    readonly alive: boolean;
    /** Unsupported or unconfirmed shells are busy. */
    busy(): Promise<boolean>;
    /** Ask an idle shell to exit itself; never signal termination. */
    closeIdle(): Promise<boolean>;
    write(data: Uint8Array | string): void;
    resize(cols: number, rows: number): void;
    /** One ordered snapshot-to-live connection. Detach never stops the PTY. */
    attach(listener: TerminalAttachmentListener): () => void;
    /** Raw live/lifecycle observation without replay. */
    subscribe(listener: TerminalListener): () => void;
    /** Resolves only once the process is confirmed gone. */
    kill(): Promise<TerminalExit>;
    /** Retire an exited session after queued restoration and output complete. */
    dispose(): Promise<void>;
};

export type TerminalOptions = {
    id: string;
    /** Enable cooperative idle shutdown for a general shell, never vendor PTYs. */
    shellIntegration?: boolean;
    /** Defaults to `defaultShell().file`. */
    file?: string;
    args?: readonly string[];
    cwd?: string;
    /**
     * Replaces the inherited environment rather than extending it, matching
     * node-pty. Spread `process.env` yourself to add to it. Left unset, the
     * daemon's own environment is inherited and node-pty strips the variables
     * that confuse a fresh terminal (`COLUMNS`, `LINES`, `TMUX`, `STY`, ...).
     */
    env?: Record<string, string>;
    cols?: number;
    rows?: number;

    /** Capture fresh-process output from the first PTY callback. */
    initialListener?: TerminalListener;
};

/** How long a child gets to handle SIGTERM before SIGKILL. */
const SIGTERM_GRACE_MS = 2_000;
/** How long the reaped-and-gone confirmation gets after SIGKILL. */
const SIGKILL_GRACE_MS = 2_000;
// Lossless read watermarks, separate from the incomplete-sequence replay limit.
const MIRROR_HIGH_WATER = 1024 * 1024;
const MIRROR_LOW_WATER = MIRROR_HIGH_WATER / 2;

/** Platform default interactive shell. */
export function defaultShell(): { file: string; args: string[] } {
    if (process.platform === "win32") {
        return { file: process.env["COMSPEC"] ?? "cmd.exe", args: [] };
    }
    return { file: process.env["SHELL"] ?? "/bin/bash", args: [] };
}

export function createTerminal(options: TerminalOptions): TerminalSession {
    const shell = defaultShell();
    const launch = {
        file: options.file ?? shell.file,
        args: [
            ...(options.args ?? (options.file === undefined ? shell.args : [])),
        ],
        env: Object.fromEntries(
            Object.entries(options.env ?? process.env).filter(
                (entry): entry is [string, string] => entry[1] !== undefined,
            ),
        ),
    };
    const integration = options.shellIntegration
        ? prepareShell(launch)
        : undefined;
    const prepared = integration ?? launch;

    // POSIX encoding: null preserves raw bytes; Windows still emits strings.
    const ptyOptions: IPtyForkOptions = {
        encoding: null,
        cols: options.cols ?? 80,
        rows: options.rows ?? 24,
        cwd: options.cwd ?? process.cwd(),
        env: prepared.env,
    };
    let pty: ReturnType<typeof spawn>;
    try {
        pty = spawn(prepared.file, prepared.args, ptyOptions);
    } catch (error) {
        void integration?.dispose().catch(console.error);
        throw error;
    }

    const listeners = new Set<TerminalListener>();
    if (options.initialListener) listeners.add(options.initialListener);
    const mirror = new Terminal({
        cols: ptyOptions.cols!,
        rows: ptyOptions.rows!,
        scrollback: 5000,
        cursorBlink: true,
        allowProposedApi: true,
    });
    const boundary = new MirrorBoundary(mirror);
    const geometryListeners = new Set<(cols: number, rows: number) => void>();
    let mirrorError: Error | undefined;
    const track = (work: Promise<void>): void => {
        void work.catch((error: unknown) => {
            mirrorError =
                error instanceof Error ? error : new Error(String(error));
        });
    };
    let exited: TerminalExit | undefined;
    let parsingBytes = 0;
    let paused = false;

    let settle!: (event: TerminalExit) => void;
    const exitPromise = new Promise<TerminalExit>((resolve) => {
        settle = resolve;
    });

    pty.onData((chunk) => {
        // Normalize Windows text at the PTY boundary so WS output stays binary.
        // Keep POSIX bytes intact, including output that is not valid UTF-8.
        const bytes =
            typeof chunk === "string"
                ? Buffer.from(chunk, "utf8")
                : (chunk as Uint8Array);
        parsingBytes += bytes.length;
        if (!paused && parsingBytes >= MIRROR_HIGH_WATER) {
            pty.pause();
            paused = true;
        }
        track(
            boundary.write(bytes).finally(() => {
                parsingBytes -= bytes.length;
                if (paused && parsingBytes <= MIRROR_LOW_WATER) {
                    paused = false;
                    if (!exited) pty.resume();
                }
            }),
        );
        for (const listener of listeners) {
            // One broken viewer must not blind the others or crash the daemon.
            try {
                listener.data(bytes, bytes);
            } catch {}
        }
    });

    pty.onExit(({ exitCode, signal }) => {
        // node-pty reports 0 for "no signal"; the wire wants null.
        exited = { exitCode, signal: signal ? signal : null };
        settle(exited);
        for (const listener of listeners) {
            try {
                listener.exit(exited);
            } catch {}
        }
        listeners.clear();
    });

    const signal = (name: NodeJS.Signals): void => {
        try {
            // node-pty throws on any signal argument on Windows, where kill()
            // is already a hard kill of the console process.
            pty.kill(process.platform === "win32" ? undefined : name);
        } catch {}
    };

    const exitWithin = (ms: number): Promise<TerminalExit | undefined> =>
        new Promise((resolve) => {
            const timer = setTimeout(() => resolve(undefined), ms);
            void exitPromise.then((event) => {
                clearTimeout(timer);
                resolve(event);
            });
        });

    const terminate = async (): Promise<TerminalExit> => {
        if (exited) return exited;
        signal("SIGTERM");
        const polite = await exitWithin(SIGTERM_GRACE_MS);
        if (polite) return polite;
        signal("SIGKILL");
        const forced = await exitWithin(SIGKILL_GRACE_MS);
        if (forced) return forced;
        // The exit event is node-pty's waitpid, so its absence means the child
        // was not reaped. Reporting a stop we cannot observe is worse than
        // failing loudly.
        throw new Error(
            `terminal ${options.id}: pid ${pty.pid} not confirmed dead ` +
                `${SIGTERM_GRACE_MS}ms after SIGTERM and ${SIGKILL_GRACE_MS}ms ` +
                `after SIGKILL`,
        );
    };

    let killing: Promise<TerminalExit> | undefined;

    return {
        id: options.id,
        get pid() {
            return pty.pid;
        },
        get alive() {
            return exited === undefined;
        },
        async busy() {
            if (exited) return false;
            return integration ? integration.busy(pty.pid) : true;
        },
        async closeIdle() {
            if (exited) return true;
            if (!integration) return false;
            const accepted = await integration.close(pty.pid);
            // Exit observers may already have disposed the acknowledgement file.
            if (exited) return true;
            if (!accepted) return false;
            return (await exitWithin(SIGTERM_GRACE_MS)) !== undefined;
        },
        write(data) {
            if (exited) return;
            pty.write(typeof data === "string" ? data : Buffer.from(data));
        },
        resize(cols, rows) {
            if (exited) return;
            if (
                !Number.isSafeInteger(cols) ||
                cols <= 0 ||
                !Number.isSafeInteger(rows) ||
                rows <= 0
            )
                throw new RangeError(
                    "Terminal dimensions must be positive safe integers.",
                );
            // A failed ioctl must not invent a geometry change in the mirror.
            try {
                pty.resize(cols, rows);
            } catch {
                return;
            }
            track(boundary.resize(cols, rows));
            for (const listener of geometryListeners) {
                try {
                    listener(cols, rows);
                } catch {}
            }
        },
        attach(listener) {
            let detached = false;
            let restoring = true;
            const pending: Array<() => void> = [];
            const detach = (): void => {
                detached = true;
                pending.length = 0;
                listeners.delete(live);
                geometryListeners.delete(resize);
            };
            const fail = (error: unknown): void => {
                if (detached) return;
                detach();
                try {
                    listener.error(
                        error instanceof Error
                            ? error
                            : new Error(String(error)),
                        mirrorError === undefined,
                    );
                } catch {}
            };
            const deliver = (action: () => void): void => {
                if (detached) return;
                if (restoring) pending.push(action);
                else {
                    try {
                        action();
                    } catch (error) {
                        fail(error);
                    }
                }
            };
            const live: TerminalListener = {
                data: (chunk, frame = chunk) => {
                    const copy = Uint8Array.from(chunk);
                    deliver(() => listener.data(copy, frame));
                },
                exit: (event) =>
                    deliver(() => {
                        listener.exit(event);
                        detach();
                    }),
            };
            const resize = (cols: number, rows: number): void =>
                deliver(() => listener.resize(cols, rows));
            // Enqueue the capture and subscribe synchronously. Later PTY events
            // are buffered here; earlier writes are already in the mirror FIFO.
            const captured = boundary.snapshot((term) => {
                if (mirrorError) throw mirrorError;
                const result = serializeTerminal(term);
                return {
                    cols: term.cols,
                    rows: term.rows,
                    data: Buffer.from(result.data),
                    state: result.state,
                };
            });
            listeners.add(live);
            geometryListeners.add(resize);
            if (exited) live.exit(exited);
            void captured.then((value) => {
                if (detached) return;
                try {
                    listener.snapshot({ ...value.state, tail: value.tail });
                    // Keep buffering while callbacks run: a callback can itself
                    // trigger input or resize without overtaking queued events.
                    for (let i = 0; !detached && i < pending.length; i++)
                        pending[i]!();
                    pending.length = 0;
                    restoring = false;
                } catch (error) {
                    fail(error);
                }
            }, fail);
            return detach;
        },
        subscribe(listener) {
            const finished = exited;
            if (finished) {
                // Never leave a late viewer waiting for an event that already fired.
                queueMicrotask(() => listener.exit(finished));
                return () => {};
            }
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        kill() {
            killing ??= terminate().catch((error: unknown) => {
                killing = undefined;
                throw error;
            });
            return killing;
        },
        async dispose() {
            await exitPromise;
            await boundary.dispose();
            await integration?.dispose();
            geometryListeners.clear();
        },
    };
}
