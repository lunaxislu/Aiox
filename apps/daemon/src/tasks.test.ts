import { expect, it } from "@effect/vitest";
import { Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";

import { DaemonTasks } from "./tasks";

it.effect("tracks daemon work and interrupts it when closed", () =>
    Effect.gen(function* () {
        const tasks = new DaemonTasks();
        let completed = false;
        const fiber = yield* tasks.start(
            Effect.sleep(1_000).pipe(
                Effect.tap(() => Effect.sync(() => (completed = true))),
            ),
        );

        yield* Effect.yieldNow;
        expect(completed).toBe(false);
        yield* TestClock.adjust(1_000);
        yield* Fiber.join(fiber);
        expect(completed).toBe(true);

        const pending = yield* tasks.start(Effect.never);
        yield* Effect.promise(() => tasks.close());
        expect((yield* Fiber.await(pending))._tag).toBe("Failure");
    }),
);
