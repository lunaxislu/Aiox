import { expect, it } from "@effect/vitest";
import { Effect, Fiber } from "effect";
import { Schedule } from "effect";
import { TestClock } from "effect/testing";
import { vi } from "vitest";

import { CleanupRegistry } from "./cleanups";
import { DaemonTasks } from "./tasks";

const input = {
    terminalId: "t1",
    panelId: "p1",
    tabId: "tab1",
    reason: "tab-closed" as const,
};

it.effect("keeps failed termination until a retry confirms it", () => {
    const tasks = new DaemonTasks();
    let failures = 2;
    const stop = vi.fn(async () => {
        if (failures-- > 0) throw new Error("pid 1 not confirmed dead");
    });
    const changed = vi.fn();
    const registry = new CleanupRegistry(
        stop,
        changed,
        tasks,
        () => 1,
        Schedule.spaced("5 millis"),
    );

    return Effect.gen(function* () {
        const tracking = yield* Effect.forkChild(registry.trackEffect(input));
        yield* Fiber.join(tracking);
        expect(registry.view("t1")).toMatchObject({
            ...input,
            state: "failed",
            error: "pid 1 not confirmed dead",
            attempts: 1,
        });

        yield* TestClock.adjust(10);
        expect(registry.list()).toEqual([]);
        expect(stop).toHaveBeenCalledTimes(3);
        expect(changed).toHaveBeenLastCalledWith("t1");
    }).pipe(Effect.ensuring(Effect.promise(() => tasks.close())));
});

it.effect("makes one final stop attempt after interrupting retries", () => {
    const tasks = new DaemonTasks();
    const registry = new CleanupRegistry(
        async () => {
            throw new Error("still alive");
        },
        () => {},
        tasks,
        () => 1,
        Schedule.spaced("1 hour"),
    );

    return Effect.gen(function* () {
        yield* registry.trackEffect(input);
        expect(yield* registry.stopAllEffect()).toEqual([
            "terminal t1: still alive",
        ]);
        expect(registry.view("t1")).toMatchObject({
            state: "failed",
            attempts: 2,
        });
    }).pipe(Effect.ensuring(Effect.promise(() => tasks.close())));
});

it.effect(
    "does not stop one process concurrently during daemon shutdown",
    () => {
        const tasks = new DaemonTasks();
        let releaseFirst!: () => void;
        let signalStarted!: () => void;
        const firstAttempt = new Promise<void>((resolve) => {
            signalStarted = resolve;
        });
        const gate = new Promise<void>((resolve) => {
            releaseFirst = resolve;
        });
        let active = 0;
        let overlapped = false;
        const stop = vi.fn(async () => {
            active++;
            if (active > 1) overlapped = true;
            try {
                if (stop.mock.calls.length === 1) {
                    signalStarted();
                    await gate;
                }
                throw new Error("still alive");
            } finally {
                active--;
            }
        });
        const registry = new CleanupRegistry(
            stop,
            () => {},
            tasks,
            () => 1,
            Schedule.spaced("1 hour"),
        );

        return Effect.gen(function* () {
            const tracking = yield* Effect.forkChild(
                registry.trackEffect(input),
            );
            yield* Effect.promise(() => firstAttempt);
            const stopping = yield* Effect.forkChild(registry.stopAllEffect());
            yield* Effect.yieldNow;
            expect(stop).toHaveBeenCalledTimes(1);

            releaseFirst();
            expect(yield* Fiber.join(stopping)).toEqual([
                "terminal t1: still alive",
            ]);
            yield* Fiber.join(tracking);
            expect(stop).toHaveBeenCalledTimes(2);
            expect(overlapped).toBe(false);
        }).pipe(Effect.ensuring(Effect.promise(() => tasks.close())));
    },
);
