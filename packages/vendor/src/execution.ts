import { spawn } from "node:child_process";
import { constants } from "node:os";

import type { Command, ExecutionExit, ExecutionProcess } from "@/index";

/** The caller chooses native stdio or a daemon PTY; adapters never choose ownership. */
export class ExecutionOwner {
    #closed = false;
    #abort = new AbortController();
    #foreground = false;
    #processes = new Set<Promise<ExecutionProcess>>();
    #resources = new Map<() => Promise<void>, Promise<void> | undefined>();
    #stopping: Promise<void> | undefined;

    constructor(
        private readonly startForeground: (
            command: Command,
        ) => Promise<ExecutionProcess>,
    ) {}

    get signal(): AbortSignal {
        return this.#abort.signal;
    }

    // Includes pending starts and exited processes until their handles are cleaned up.
    get hasProcessHandles(): boolean {
        return this.#processes.size > 0;
    }

    async own(dispose: () => Promise<void>): Promise<void> {
        this.#resources.set(dispose, undefined);
        if (this.#closed) {
            await this.#dispose(dispose);
            throw new Error("Execution owner is stopped.");
        }
    }

    #dispose(dispose: () => Promise<void>): Promise<void> {
        const existing = this.#resources.get(dispose);
        if (existing) return existing;
        const pending = Promise.resolve()
            .then(dispose)
            .then(
                () => {
                    this.#resources.delete(dispose);
                },
                (error: unknown) => {
                    this.#resources.set(dispose, undefined);
                    throw error;
                },
            );
        this.#resources.set(dispose, pending);
        return pending;
    }

    foreground(command: Command): Promise<ExecutionProcess> {
        if (this.#closed)
            return Promise.reject(new Error("Execution owner is stopped."));
        if (this.#foreground)
            return Promise.reject(
                new Error("A foreground process is already assigned."),
            );
        this.#foreground = true;
        return this.#start(() => this.startForeground(command));
    }

    background(command: Command): Promise<ExecutionProcess> {
        return this.#start(() => spawnNative(command, "pipe"));
    }

    #start(start: () => Promise<ExecutionProcess>): Promise<ExecutionProcess> {
        if (this.#closed)
            return Promise.reject(new Error("Execution owner is stopped."));
        const pending = Promise.resolve().then(() => {
            if (this.#closed) throw new Error("Execution owner is stopped.");
            return start();
        });
        this.#processes.add(pending);
        void pending.catch(() => this.#processes.delete(pending));
        return pending;
    }

    stop(): Promise<void> {
        this.#closed = true;
        this.#abort.abort(new Error("Execution owner is stopped."));
        this.#stopping ??= this.#stop().finally(() => {
            this.#stopping = undefined;
        });
        return this.#stopping;
    }

    async #stop(): Promise<void> {
        const errors: unknown[] = [];
        for (const pending of [...this.#processes].reverse()) {
            let process: ExecutionProcess;
            try {
                process = await pending;
            } catch {
                this.#processes.delete(pending);
                continue;
            }
            try {
                await process.stop();
                this.#processes.delete(pending);
            } catch (error) {
                errors.push(error);
            }
        }
        // A surviving process may still need these sockets/files for manual exit.
        if (!errors.length) {
            for (const dispose of [...this.#resources.keys()].reverse()) {
                try {
                    await this.#dispose(dispose);
                } catch (error) {
                    errors.push(error);
                }
            }
        }
        if (errors.length)
            throw new AggregateError(
                errors,
                errors.map((error) => String(error)).join("; "),
            );
    }
}

/** Native child path is independent of the daemon and imports no terminal renderer. */
export function spawnNative(
    command: Command,
    stdio: "inherit" | "pipe",
): Promise<ExecutionProcess> {
    const child = spawn(command.file, command.args, {
        cwd: command.cwd,
        env: command.env,
        stdio,
    });
    let done = false;
    let resolveExit!: (exit: ExecutionExit) => void;
    const exited = new Promise<ExecutionExit>((resolve) => {
        resolveExit = resolve;
    });
    child.once("exit", (code, signal) => {
        done = true;
        resolveExit({
            exitCode: code ?? 0,
            signal: signal === null ? null : constants.signals[signal],
        });
    });
    const exitWithin = (ms: number) =>
        new Promise<boolean>((resolve) => {
            const timer = setTimeout(() => resolve(false), ms);
            void exited.then(() => {
                clearTimeout(timer);
                resolve(true);
            });
        });
    return new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("spawn", () =>
            resolve({
                exited,
                async stop() {
                    if (done) return;
                    child.kill("SIGTERM");
                    if (await exitWithin(2000)) return;
                    child.kill("SIGKILL");
                    if (!(await exitWithin(2000)))
                        throw new Error(
                            "Vendor process termination is unconfirmed.",
                        );
                },
                write(data) {
                    child.stdin?.write(data);
                },
                // Native stdio has no owned PTY: inherited TTY sizing is external; pipes have no size.
                resize() {},
                ...(child.stdout ? { stdout: child.stdout } : {}),
                ...(child.stderr ? { stderr: child.stderr } : {}),
            }),
        );
    });
}
