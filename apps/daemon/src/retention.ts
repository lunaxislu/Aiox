import type { AioxDatabase, PurgeCounts } from "@aiox/persistence";

const DAY_MS = 86_400_000;

/**
 * History cleanup. A request only becomes eligible once every one of its
 * targets finished, so a message with one target still working survives even
 * when its siblings finished long ago. Persistent network and route
 * definitions, workspaces and user files are never touched.
 */
export function purgeExpired(
    db: AioxDatabase,
    retentionDays: number,
    now: number,
): Promise<PurgeCounts> {
    return db.messages.purgeBefore(now - retentionDays * DAY_MS);
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
    const now = options.now ?? (() => Date.now());
    const run = async () => {
        try {
            const report = await purgeExpired(db, retentionDays(), now());
            options.onPurge?.(report);
        } catch (error) {
            // Cleanup failing must not take the daemon down with it.
            options.onError?.(error);
        }
    };
    void run();
    const timer = setInterval(() => void run(), DAY_MS);
    timer.unref();
    return { stop: () => clearInterval(timer) };
}
