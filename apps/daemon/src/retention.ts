import type { AioxDatabase, PurgeCounts } from "@aiox/persistence";
import { Clock, Effect } from "effect";

import { DaemonTasks } from "./tasks";

const DAY_MS = 86_400_000;

/**
 * History cleanup. A request only becomes eligible once every one of its
 * targets finished, so a message with one target still working survives even
 * when its siblings finished long ago. Persistent network and route
 * definitions, workspaces and user files are never touched.
 */
export async function purgeExpired(
    db: AioxDatabase,
    retentionDays: number,
    now: number,
): Promise<PurgeCounts> {
    const cutoff = now - retentionDays * DAY_MS;
    const [report] = await Promise.all([
        db.messages.purgeBefore(cutoff),
        db.hostState.purgeBefore(cutoff),
    ]);
    return report;
}

/** Starts with one purge, then sleeps a day between purges. */
export function retentionEffect(
    db: AioxDatabase,
    retentionDays: () => number,
    options: {
        now?: () => number;
        onPurge?: (report: PurgeCounts) => void;
        onError?: (error: unknown) => void;
    } = {},
): Effect.Effect<never> {
    const purge = Effect.gen(function* () {
        const now = options.now
            ? options.now()
            : yield* Clock.currentTimeMillis;
        const result = yield* Effect.result(
            Effect.tryPromise({
                try: () => purgeExpired(db, retentionDays(), now),
                catch: (error) => error,
            }),
        );
        if (result._tag === "Failure") {
            yield* Effect.sync(() => options.onError?.(result.failure));
        } else {
            yield* Effect.sync(() => options.onPurge?.(result.success));
        }
    });
    return Effect.forever(
        Effect.gen(function* () {
            yield* purge;
            yield* Effect.sleep(DAY_MS);
        }),
    );
}

export type RetentionSchedule = { stop(): void };

/** Runs at daemon start and once a day after that. */
export function scheduleRetention(
    db: AioxDatabase,
    retentionDays: () => number,
    options: {
        now?: () => number;
        onPurge?: (report: PurgeCounts) => void;
        onError?: (error: unknown) => void;
    } = {},
): RetentionSchedule {
    const tasks = new DaemonTasks();
    Effect.runSync(tasks.start(retentionEffect(db, retentionDays, options)));
    return { stop: () => void tasks.close() };
}
