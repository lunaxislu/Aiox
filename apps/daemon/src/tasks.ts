import { Effect, Exit, Fiber, FiberSet, Scope } from "effect";

/**
 * Daemon-lifetime background work such as shell and Host preparation. It never
 * belongs to the HTTP request that started it: a request ending or a client
 * disconnecting does not interrupt it. Interruption only stops the Effect; it
 * does not terminate a process by itself, so each task stops its own processes.
 */
export class DaemonTasks {
    readonly #scope = Effect.runSync(Scope.make());
    readonly #fibers = Effect.runSync(
        FiberSet.make<unknown, unknown>().pipe(
            Effect.provideService(Scope.Scope, this.#scope),
        ),
    );

    /** Forks work into the daemon scope. */
    start<A, E, R>(
        task: Effect.Effect<A, E, R>,
    ): Effect.Effect<Fiber.Fiber<A, E>, never, R> {
        return FiberSet.run(this.#fibers, task, { startImmediately: true });
    }

    /** Starts the task now and resolves with its exit; the promise never rejects. */
    run<A, E>(task: Effect.Effect<A, E>): Promise<Exit.Exit<A, E>> {
        return Effect.runPromise(Effect.flatMap(this.start(task), Fiber.await));
    }

    /** Resolves once no task is running. */
    idle(): Promise<void> {
        return Effect.runPromise(FiberSet.awaitEmpty(this.#fibers));
    }

    /** Interrupts what still runs; used only after teardown finished its own waiting. */
    close(): Promise<void> {
        return Effect.runPromise(Scope.close(this.#scope, Exit.void));
    }
}
