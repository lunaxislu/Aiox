import { type IPtyForkOptions, spawn } from "node-pty";

/**
 * A single server owned PTY. The daemon keeps the registry, the HTTP surface
 * and the WebSocket attachments; this module only owns one live process and
 * the bytes it produces.
 *
 * Web attach and detach are viewing operations. Dropping the last subscriber
 * never stops the process ([[docs/architecture/aiox-storage-terminal]] "PTY와
 * Web 복귀"), and a signal that was accepted is not a process that has exited
 * ([[docs/specs/aiox-runtime]]).
 */

export type TerminalExit = { exitCode: number; signal: number | null };

export type TerminalListener = {
    data(chunk: Uint8Array): void;
    exit(event: TerminalExit): void;
};

export type TerminalSession = {
    readonly id: string;
    readonly pid: number;
    readonly alive: boolean;
    write(data: Uint8Array | string): void;
    resize(cols: number, rows: number): void;
    /** Recent output for a newly attached viewer, oldest-first. */
    snapshot(): Uint8Array;
    /**
     * Returns an unsubscribe function. Unsubscribing never kills the pty.
     *
     * Call `snapshot()` and `subscribe()` in the same tick: pty output arrives
     * on the event loop, so nothing can slip between them and the viewer gets
     * replay followed by live output with no gap and no repeat.
     */
    subscribe(listener: TerminalListener): () => void;
    /** Resolves only once the process is confirmed gone. */
    kill(): Promise<TerminalExit>;
};

export type TerminalOptions = {
    id: string;
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
    replayBytes?: number;
};

// ponytail: replay is a raw byte tail, not a screen. 64 KiB gives a re-attaching
// viewer recent context; the trim can cut mid escape sequence and the first
// line may be garbled. Exact current-screen restore needs xterm headless +
// serialize, which is Stage 6.
const DEFAULT_REPLAY_BYTES = 64 * 1024;

/** How long a child gets to handle SIGTERM before SIGKILL. */
const SIGTERM_GRACE_MS = 2_000;
/** How long the reaped-and-gone confirmation gets after SIGKILL. */
const SIGKILL_GRACE_MS = 2_000;

/** Platform default interactive shell. */
export function defaultShell(): { file: string; args: string[] } {
    if (process.platform === "win32") {
        return { file: process.env["COMSPEC"] ?? "cmd.exe", args: [] };
    }
    return { file: process.env["SHELL"] ?? "/bin/bash", args: [] };
}

export function createTerminal(options: TerminalOptions): TerminalSession {
    const shell = defaultShell();
    const replayCeiling = options.replayBytes ?? DEFAULT_REPLAY_BYTES;

    // encoding: null makes node-pty deliver Buffers instead of decoded strings.
    // A pty carries bytes that are not always valid UTF-8, and a decode round
    // trip would replace them with U+FFFD before they reach the browser.
    const ptyOptions: IPtyForkOptions = {
        encoding: null,
        cols: options.cols ?? 80,
        rows: options.rows ?? 24,
        cwd: options.cwd ?? process.cwd(),
        env: options.env ?? process.env,
    };
    const pty = spawn(
        options.file ?? shell.file,
        [...(options.args ?? (options.file === undefined ? shell.args : []))],
        ptyOptions,
    );

    const listeners = new Set<TerminalListener>();
    const replay: Uint8Array[] = [];
    let replayBytes = 0;
    let exited: TerminalExit | undefined;

    let settle!: (event: TerminalExit) => void;
    const exitPromise = new Promise<TerminalExit>((resolve) => {
        settle = resolve;
    });

    pty.onData((chunk) => {
        // Typed as string by node-pty even under `encoding: null`; it is a Buffer.
        const bytes = chunk as unknown as Uint8Array;
        replay.push(bytes);
        replayBytes += bytes.byteLength;
        while (replayBytes > replayCeiling) {
            const head = replay[0]!;
            const excess = replayBytes - replayCeiling;
            if (head.byteLength <= excess) {
                replay.shift();
                replayBytes -= head.byteLength;
            } else {
                replay[0] = head.subarray(excess);
                replayBytes -= excess;
            }
        }
        for (const listener of listeners) {
            // One broken viewer must not blind the others or crash the daemon.
            try {
                listener.data(bytes);
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
        pid: pty.pid,
        get alive() {
            return exited === undefined;
        },
        write(data) {
            if (exited) return;
            pty.write(typeof data === "string" ? data : Buffer.from(data));
        },
        resize(cols, rows) {
            // The pty fd is closed on exit and the ioctl then throws EBADF,
            // including in the window before the exit event lands.
            try {
                pty.resize(cols, rows);
            } catch {}
        },
        snapshot() {
            return Buffer.concat(replay);
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
    };
}
