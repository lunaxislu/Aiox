import { spawn } from "node:child_process";
import { constants } from "node:os";

import {
    Cause,
    Clock,
    Deferred,
    Duration,
    Effect,
    Exit,
    Fiber,
    Scope,
} from "effect";
import { createActor, createMachine } from "xstate";

import type { Command, ExecutionExit, ExecutionProcess } from "@/index";

const lifecycle = createMachine({
    types: {} as {
        events: { type: "foreground" | "stop" | "stopped" | "failed" };
    },
    initial: "open",
    states: {
        open: {
            initial: "available",
            states: {
                available: { on: { foreground: "assigned" } },
                assigned: {},
            },
            on: { stop: "stopping" },
        },
        stopping: { on: { stopped: "stopped", failed: "cleanupFailed" } },
        cleanupFailed: { on: { stop: "stopping" } },
        stopped: { on: { stop: "stopping" } },
    },
});

/** The caller chooses native stdio or a daemon PTY; adapters never choose ownership. */
export class ExecutionOwner {
    readonly #state = createActor(lifecycle).start();
    readonly #abort = new AbortController();
    readonly #processes = new Set<Fiber.Fiber<ExecutionProcess, unknown>>();
    readonly #resources = new Map<
        () => Effect.Effect<void, unknown>,
        Fiber.Fiber<void, unknown> | undefined
    >();
    #stopping: Fiber.Fiber<void, unknown> | undefined;

    constructor(
        private readonly startForeground: (
            command: Command,
        ) => Effect.Effect<ExecutionProcess, unknown>,
    ) {}

    get signal(): AbortSignal {
        return this.#abort.signal;
    }

    // Includes pending starts and exited processes until their handles are cleaned up.
    get hasProcessHandles(): boolean {
        return this.#processes.size > 0;
    }

    get #closed(): boolean {
        return !this.#state.getSnapshot().matches("open");
    }

    own(
        dispose: () => Effect.Effect<void, unknown>,
    ): Effect.Effect<void, unknown> {
        return Effect.suspend(() => {
            if (!this.#resources.has(dispose))
                this.#resources.set(dispose, undefined);
            if (!this.#closed) return Effect.void;
            return this.#dispose(dispose).pipe(
                Effect.andThen(
                    Effect.fail(new Error("Execution owner is stopped.")),
                ),
            );
        });
    }

    #dispose(
        dispose: () => Effect.Effect<void, unknown>,
    ): Effect.Effect<void, unknown> {
        const existing = this.#resources.get(dispose);
        if (existing) return Fiber.join(existing);
        const fiber = Effect.runFork(dispose());
        this.#resources.set(dispose, fiber);
        fiber.addObserver((exit) => {
            if (Exit.isSuccess(exit)) this.#resources.delete(dispose);
            else this.#resources.set(dispose, undefined);
        });
        return Fiber.join(fiber);
    }

    foreground(command: Command): Effect.Effect<ExecutionProcess, unknown> {
        return Effect.suspend(() => {
            if (this.#closed)
                return Effect.fail(new Error("Execution owner is stopped."));
            if (!this.#state.getSnapshot().matches({ open: "available" }))
                return Effect.fail(
                    new Error("A foreground process is already assigned."),
                );
            this.#state.send({ type: "foreground" });
            return this.#start(this.startForeground(command));
        });
    }

    background(command: Command): Effect.Effect<ExecutionProcess, unknown> {
        return this.#start(spawnNativeEffect(command, "pipe"));
    }

    #start(
        start: Effect.Effect<ExecutionProcess, unknown>,
    ): Effect.Effect<ExecutionProcess, unknown> {
        return Effect.suspend(() => {
            if (this.#closed)
                return Effect.fail(new Error("Execution owner is stopped."));
            // An admitted spawn must finish acquiring its handle even after stop.
            // Interrupting it could lose the only handle to a late child.
            const fiber = Effect.runFork(Effect.uninterruptible(start));
            this.#processes.add(fiber);
            fiber.addObserver((exit) => {
                if (Exit.isFailure(exit)) this.#processes.delete(fiber);
            });
            return Fiber.join(fiber);
        });
    }

    stop(): Effect.Effect<void, unknown> {
        return Effect.suspend(() => {
            this.#state.send({ type: "stop" });
            this.#abort.abort(new Error("Execution owner is stopped."));
            if (this.#stopping) return Fiber.join(this.#stopping);
            const fiber = Effect.runFork(this.#stop());
            this.#stopping = fiber;
            fiber.addObserver((exit) => {
                this.#stopping = undefined;
                this.#state.send({
                    type: Exit.isSuccess(exit) ? "stopped" : "failed",
                });
            });
            return Fiber.join(fiber);
        });
    }

    #stop(): Effect.Effect<void, unknown> {
        const self = this;
        return Effect.gen(function* () {
            const errors: unknown[] = [];
            for (const pending of [...self.#processes].reverse()) {
                const started = yield* Fiber.await(pending);
                if (Exit.isFailure(started)) {
                    self.#processes.delete(pending);
                    continue;
                }
                const stopped = yield* Effect.exit(started.value.stop());
                if (Exit.isSuccess(stopped)) self.#processes.delete(pending);
                else errors.push(Cause.squash(stopped.cause));
            }
            // A surviving process may still need these sockets/files for manual exit.
            if (!errors.length) {
                for (const dispose of [...self.#resources.keys()].reverse()) {
                    const disposed = yield* Effect.exit(self.#dispose(dispose));
                    if (Exit.isFailure(disposed))
                        errors.push(Cause.squash(disposed.cause));
                }
            }
            if (errors.length)
                return yield* Effect.fail(
                    new AggregateError(errors, errors.map(String).join("; ")),
                );
        });
    }
}

/** Native child path is independent of the daemon and imports no terminal renderer. */
export function spawnNative(
    command: Command,
    stdio: "inherit" | "pipe",
): Effect.Effect<ExecutionProcess, unknown> {
    return spawnNativeEffect(command, stdio);
}

function spawnNativeEffect(
    command: Command,
    stdio: "inherit" | "pipe",
): Effect.Effect<ExecutionProcess, unknown> {
    return Effect.gen(function* () {
        const processScope = yield* Scope.make();
        const exit = yield* Deferred.make<ExecutionExit>();
        const clock = yield* Clock.Clock;
        let child!: ReturnType<typeof spawn>;
        let didSpawn = false;
        let stopFiber: Fiber.Fiber<void, unknown> | undefined;

        const processHandle = yield* Effect.callback<ExecutionProcess, unknown>(
            (resume) => {
                child = spawn(command.file, command.args, {
                    cwd: command.cwd,
                    env: command.env,
                    stdio,
                });
                child.once("exit", (code, signal) => {
                    Effect.runSync(
                        Deferred.succeed(exit, {
                            exitCode: code ?? 0,
                            signal:
                                signal === null
                                    ? null
                                    : constants.signals[signal],
                        }),
                    );
                });
                child.once("error", (error) => {
                    if (!didSpawn) resume(Effect.fail(error));
                });
                child.once("spawn", () => {
                    didSpawn = true;
                    resume(
                        Effect.succeed({
                            exited: Deferred.await(exit),
                            stop: () =>
                                Effect.suspend(
                                    (): Effect.Effect<void, unknown> => {
                                        if (stopFiber)
                                            return Fiber.join(stopFiber);
                                        const stopping = Effect.uninterruptible(
                                            Effect.gen(function* () {
                                                if (
                                                    !(yield* Deferred.isDone(
                                                        exit,
                                                    ))
                                                ) {
                                                    child.kill("SIGTERM");
                                                    const termResult =
                                                        yield* Effect.race(
                                                            Deferred.await(
                                                                exit,
                                                            ).pipe(
                                                                Effect.as(true),
                                                            ),
                                                            clock
                                                                .sleep(
                                                                    Duration.millis(
                                                                        2000,
                                                                    ),
                                                                )
                                                                .pipe(
                                                                    Effect.as(
                                                                        false,
                                                                    ),
                                                                ),
                                                        );
                                                    if (!termResult) {
                                                        child.kill("SIGKILL");
                                                        const killResult =
                                                            yield* Effect.race(
                                                                Deferred.await(
                                                                    exit,
                                                                ).pipe(
                                                                    Effect.as(
                                                                        true,
                                                                    ),
                                                                ),
                                                                clock
                                                                    .sleep(
                                                                        Duration.millis(
                                                                            2000,
                                                                        ),
                                                                    )
                                                                    .pipe(
                                                                        Effect.as(
                                                                            false,
                                                                        ),
                                                                    ),
                                                            );
                                                        if (!killResult)
                                                            return yield* Effect.fail(
                                                                new Error(
                                                                    "Process did not confirm termination.",
                                                                ),
                                                            );
                                                    }
                                                }
                                                yield* Scope.close(
                                                    processScope,
                                                    Exit.void,
                                                );
                                            }),
                                        );
                                        const fiber = Effect.runFork(stopping);
                                        stopFiber = fiber;
                                        fiber.addObserver(() => {
                                            stopFiber = undefined;
                                        });
                                        return Fiber.join(fiber);
                                    },
                                ),
                            write(data) {
                                child.stdin?.write(data);
                            },
                            // Native stdio is not a PTY: its controlling TTY owns dimensions.
                            resize() {},
                            ...(child.stdout ? { stdout: child.stdout } : {}),
                            ...(child.stderr ? { stderr: child.stderr } : {}),
                        }),
                    );
                });
                return Effect.gen(function* () {
                    if (!didSpawn) {
                        child.kill("SIGKILL");
                        yield* Deferred.await(exit);
                    }
                });
            },
        );
        yield* Scope.addFinalizer(
            processScope,
            Effect.sync(() => {
                child.removeAllListeners("spawn");
                child.removeAllListeners("error");
                child.removeAllListeners("exit");
            }),
        );
        return processHandle;
    });
}
