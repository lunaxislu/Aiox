import { logger } from "@aiox/diagnostics";
import type { CleanupView } from "@aiox/protocol";
import { Deferred, Duration, Effect, Fiber, Result, Schedule } from "effect";

import type { DaemonTasks } from "./tasks";

type Track = Pick<CleanupView, "terminalId" | "panelId" | "tabId" | "reason">;
type RunningCleanup = {
    fiber?: Fiber.Fiber<void, unknown>;
    readonly firstAttempt: Deferred.Deferred<void>;
};

/**
 * Processes the daemon still has to stop after their tab or panel left the
 * layout. Removing the tab is its own result; this keeps the process identity
 * and failure diagnostics until termination is confirmed, and retries.
 */
export class CleanupRegistry {
    readonly #entries = new Map<string, CleanupView>();
    readonly #running = new Map<string, RunningCleanup>();

    constructor(
        /** Must reject unless the process is confirmed gone. */
        private readonly stop: (terminalId: string) => Promise<void>,
        private readonly changed: (id: string) => void,
        private readonly tasks: DaemonTasks,
        private readonly now: () => number = Date.now,
        private readonly retry: Schedule.Schedule<unknown> = Schedule.exponential(
            "1 second",
        ).pipe(
            Schedule.modifyDelay(({ duration }) =>
                Effect.succeed(Duration.min(duration, Duration.seconds(30))),
            ),
        ),
    ) {}

    view(id: string): CleanupView | undefined {
        return this.#entries.get(id);
    }
    list(): CleanupView[] {
        return [...this.#entries.values()];
    }

    /** Takes over stopping a process; resolves after the first attempt, retries keep running. */
    track(input: Track): Promise<void> {
        return Effect.runPromise(this.trackEffect(input));
    }

    trackEffect(input: Track): Effect.Effect<void> {
        const id = input.terminalId;
        const existing = this.#entries.get(id);
        this.#entries.set(id, {
            id,
            ...input,
            state: "stopping",
            error: existing?.error ?? null,
            attempts: existing?.attempts ?? 0,
            updatedAt: this.now(),
        });
        this.changed(id);
        return Effect.suspend(() => {
            const existing = this.#running.get(id);
            if (existing) return Deferred.await(existing.firstAttempt);

            const running: RunningCleanup = {
                firstAttempt: Deferred.makeUnsafe<void>(),
            };
            this.#running.set(id, running);
            const stopOnce = Effect.uninterruptible(
                Effect.tryPromise({
                    try: () => this.stop(id),
                    catch: (error) => error,
                }).pipe(
                    Effect.tapError((error) =>
                        Effect.sync(() => this.#failed(id, error)),
                    ),
                    Effect.tap(() =>
                        Effect.sync(() => {
                            this.#entries.delete(id);
                            this.changed(id);
                        }),
                    ),
                    Effect.ensuring(
                        Deferred.succeed(running.firstAttempt, undefined),
                    ),
                ),
            );
            const retrying = Effect.retry(stopOnce, this.retry).pipe(
                Effect.ensuring(Effect.sync(() => this.#running.delete(id))),
            );

            return Effect.flatMap(this.tasks.start(retrying), (fiber) => {
                running.fiber = fiber;
                return Deferred.await(running.firstAttempt);
            });
        });
    }

    /** One final attempt per remaining process during daemon stop; returns what failed. */
    stopAll(): Promise<string[]> {
        return Effect.runPromise(this.stopAllEffect());
    }

    stopAllEffect(): Effect.Effect<string[]> {
        return Effect.gen({ self: this }, function* () {
            const warnings: string[] = [];
            for (const entry of this.list()) {
                const running = this.#running.get(entry.id);
                if (running) {
                    yield* Deferred.await(running.firstAttempt);
                    if (running.fiber) yield* Fiber.interrupt(running.fiber);
                }
                if (!this.#entries.has(entry.id)) continue;
                const result = yield* Effect.result(
                    Effect.uninterruptible(
                        Effect.tryPromise({
                            try: () => this.stop(entry.terminalId),
                            catch: (error) => error,
                        }),
                    ),
                );
                if (Result.isSuccess(result)) {
                    this.#entries.delete(entry.id);
                    this.changed(entry.id);
                } else {
                    this.#failed(entry.id, result.failure);
                    warnings.push(
                        `terminal ${entry.terminalId}: ${result.failure instanceof Error ? result.failure.message : String(result.failure)}`,
                    );
                }
            }
            return warnings;
        });
    }

    #failed(id: string, error: unknown): void {
        const entry = this.#entries.get(id);
        if (!entry) return;
        const message = error instanceof Error ? error.message : String(error);
        logger.error({ terminalId: id, err: error }, "Process cleanup failed");
        this.#entries.set(id, {
            ...entry,
            state: "failed",
            error: message,
            attempts: entry.attempts + 1,
            updatedAt: this.now(),
        });
        this.changed(id);
    }
}
