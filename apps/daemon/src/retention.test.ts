import type { AioxDatabase } from "@aiox/persistence";
import { expect, it } from "@effect/vitest";
import { Clock, Deferred, Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { vi } from "vitest";

import { retentionEffect } from "@/retention";

import { DaemonTasks } from "./tasks";

it.effect("purges on startup and daily using the Effect clock", () => {
    const tasks = new DaemonTasks();
    return Effect.gen(function* () {
        const purgeBefore = vi.fn().mockResolvedValue({
            messages: 1,
            deliveries: 1,
            notifications: 0,
        });
        const db = {
            messages: { purgeBefore },
            hostState: { purgeBefore: vi.fn().mockResolvedValue(0) },
        } as unknown as AioxDatabase;
        const day = 86_400_000;
        const startedAt = yield* Clock.currentTimeMillis;
        const firstPurge = Deferred.makeUnsafe<void>();
        const secondPurge = Deferred.makeUnsafe<void>();
        const errors: unknown[] = [];
        let purges = 0;
        const signal = () => {
            const deferred = purges++ === 0 ? firstPurge : secondPurge;
            Effect.runSync(Deferred.succeed(deferred, undefined));
        };
        const fiber = yield* tasks.start(
            retentionEffect(db, () => 30, {
                onPurge: signal,
                onError: (error) => {
                    errors.push(error);
                    signal();
                },
            }),
        );

        yield* TestClock.adjust(1);
        expect(purgeBefore).toHaveBeenCalledTimes(1);
        yield* Deferred.await(firstPurge);
        expect(errors).toEqual([]);
        expect(purgeBefore).toHaveBeenCalled();
        expect(purgeBefore).toHaveBeenCalledWith(startedAt - 30 * day);
        yield* TestClock.adjust(day);
        yield* Deferred.await(secondPurge);
        expect(errors).toEqual([]);
        expect(purgeBefore).toHaveBeenCalledTimes(2);
        expect(purgeBefore).toHaveBeenLastCalledWith(startedAt - 29 * day);

        yield* Fiber.interrupt(fiber);
        yield* TestClock.adjust(day);
        expect(purgeBefore).toHaveBeenCalledTimes(2);
    }).pipe(Effect.ensuring(Effect.promise(() => tasks.close())));
});
