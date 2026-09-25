import type { WebSequenceFailure } from "@aiox/protocol";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber } from "effect";
import { TestClock } from "effect/testing";
import fc from "fast-check";

import { Sequencer } from "./sequencer";
const request = (sequence: number, hash = `h${sequence}`) => ({
    sequence,
    requestId: `r${sequence}`,
    hash,
});

it.effect(
    "resumes after failed daemon cleanup without replaying discarded queued work",
    () =>
        Effect.gen(function* () {
            const sequencer = new Sequencer<number>({
                gapTimeout: 1000,
                onGap() {},
            });
            const { clientSessionId } = yield* sequencer.open;
            const queued = yield* Effect.forkChild(
                sequencer.submitEffect(
                    clientSessionId,
                    request(2),
                    Effect.die("discarded work must not execute"),
                ),
            );
            yield* Effect.yieldNow;
            yield* sequencer.quiesce;
            expect(yield* Fiber.join(queued)).toMatchObject({ ok: false });
            sequencer.resumeWork();
            expect(yield* sequencer.resume(clientSessionId)).toMatchObject({
                checkpoint: 2,
            });
            expect(
                yield* Effect.flip(
                    sequencer.submitEffect(
                        clientSessionId,
                        request(1),
                        Effect.die("discarded gap must not reenter"),
                    ),
                ),
            ).toMatchObject({
                code: "result_expired",
                extra: { checkpoint: 2 },
            });
            expect(
                yield* sequencer.submitEffect(
                    clientSessionId,
                    request(3),
                    Effect.succeed(3),
                ),
            ).toEqual({ ok: true, value: 3 });
            yield* sequencer.shutdown;
        }),
);

it.effect(
    "orders permutations and reports finalized results without reexecution",
    () =>
        Effect.gen(function* () {
            for (const order of fc.sample(
                fc.shuffledSubarray([1, 2, 3, 4], {
                    minLength: 4,
                    maxLength: 4,
                }),
                30,
            )) {
                const sequencer = new Sequencer<number>({
                    gapTimeout: 1000,
                    onGap() {},
                });
                const { clientSessionId } = yield* sequencer.open;
                const ran: number[] = [];
                const fibers = [];
                for (const n of order)
                    fibers.push(
                        yield* Effect.forkChild(
                            sequencer.submitEffect(
                                clientSessionId,
                                request(n),
                                Effect.sync(() => {
                                    ran.push(n);
                                    return n;
                                }),
                            ),
                        ),
                    );
                for (const fiber of fibers)
                    expect((yield* Fiber.join(fiber)).ok).toBe(true);
                expect(ran).toEqual([1, 2, 3, 4]);
                expect(
                    yield* Effect.flip(
                        sequencer.submitEffect(
                            clientSessionId,
                            request(1),
                            Effect.succeed(99),
                        ),
                    ),
                ).toMatchObject({
                    code: "result_expired",
                    extra: { checkpoint: 4 },
                });
                yield* sequencer.shutdown;
            }
        }),
);
it.effect(
    "joins pending retries and keeps admitted work when a waiter disconnects",
    () =>
        Effect.gen(function* () {
            const sequencer = new Sequencer<number>({
                gapTimeout: 1000,
                onGap() {},
            });
            const { clientSessionId } = yield* sequencer.open;
            const release = yield* Deferred.make<number>();
            const started = yield* Deferred.make<void>();
            let runs = 0;
            const work = Effect.gen(function* () {
                runs++;
                yield* Deferred.succeed(started, undefined);
                return yield* Deferred.await(release);
            });
            const first = yield* Effect.forkChild(
                sequencer.submitEffect(clientSessionId, request(1), work),
            );
            yield* Deferred.await(started);
            const joined = yield* Effect.forkChild(
                sequencer.submitEffect(clientSessionId, request(1), work),
            );
            yield* Effect.yieldNow;
            expect(
                yield* Effect.flip(
                    sequencer.submitEffect(
                        clientSessionId,
                        request(1, "changed"),
                        work,
                    ),
                ),
            ).toMatchObject({ code: "request_conflict" });
            yield* Fiber.interrupt(first);
            yield* Deferred.succeed(release, 7);
            expect(yield* Fiber.join(joined)).toEqual({ ok: true, value: 7 });
            expect(runs).toBe(1);
            expect(
                yield* Effect.flip(
                    sequencer.submitEffect(
                        clientSessionId,
                        { ...request(2), requestId: "r1" },
                        work,
                    ),
                ),
            ).toMatchObject({ code: "request_finalized" });
            yield* sequencer.shutdown;
        }),
);
it.effect(
    "expires a missing range on the Effect clock and advances a contiguous checkpoint",
    () =>
        Effect.gen(function* () {
            const gaps: WebSequenceFailure[] = [];
            const sequencer = new Sequencer<number>({
                gapTimeout: 100,
                onGap: (gap) => gaps.push(gap),
            });
            const { clientSessionId } = yield* sequencer.open;
            yield* sequencer.submitEffect(
                clientSessionId,
                request(1),
                Effect.succeed(1),
            );
            let ran = false;
            const waiting = yield* Effect.forkChild(
                sequencer.submitEffect(
                    clientSessionId,
                    request(3),
                    Effect.sync(() => {
                        ran = true;
                        return 3;
                    }),
                ),
            );
            yield* TestClock.adjust(100);
            expect(yield* Fiber.join(waiting)).toMatchObject({
                ok: false,
                error: { code: "sequence_gap" },
            });
            expect(ran).toBe(false);
            expect(gaps).toEqual([
                {
                    clientSessionId,
                    code: "sequence_gap",
                    missing: [2],
                    unexecuted: [{ sequence: 3, requestId: "r3" }],
                },
            ]);
            expect(
                yield* Effect.flip(
                    sequencer.submitEffect(
                        clientSessionId,
                        request(2),
                        Effect.succeed(2),
                    ),
                ),
            ).toMatchObject({ code: "result_expired" });
            expect(yield* sequencer.resume(clientSessionId)).toMatchObject({
                checkpoint: 3,
            });
            expect(
                yield* sequencer.submitEffect(
                    clientSessionId,
                    request(4),
                    Effect.succeed(4),
                ),
            ).toEqual({ ok: true, value: 4 });
            yield* sequencer.shutdown;
        }),
);
it.effect(
    "recovers a gap before the deadline and includes failed execution in checkpoint",
    () =>
        Effect.gen(function* () {
            const sequencer = new Sequencer<number>({
                gapTimeout: 100,
                onGap() {
                    throw new Error("unexpected gap");
                },
            });
            const { clientSessionId } = yield* sequencer.open;
            const second = yield* Effect.forkChild(
                sequencer.submitEffect(
                    clientSessionId,
                    request(2),
                    Effect.succeed(2),
                ),
            );
            yield* TestClock.adjust(50);
            expect(
                yield* sequencer.submitEffect(
                    clientSessionId,
                    request(1),
                    Effect.fail(new Error("storage failed")),
                ),
            ).toMatchObject({
                ok: false,
                error: { message: "storage failed" },
            });
            expect(yield* Fiber.join(second)).toEqual({ ok: true, value: 2 });
            yield* TestClock.adjust(100);
            expect(yield* sequencer.resume(clientSessionId)).toMatchObject({
                checkpoint: 2,
            });
            yield* sequencer.shutdown;
        }),
);
it.effect(
    "never recreates swept sessions or accepts sessions from a previous daemon",
    () =>
        Effect.gen(function* () {
            const sequencer = new Sequencer<number>({
                gapTimeout: 100,
                idleSession: 100,
                onGap() {},
            });
            const { clientSessionId } = yield* sequencer.open;
            yield* sequencer.submitEffect(
                clientSessionId,
                request(1),
                Effect.succeed(1),
            );
            yield* TestClock.adjust(101);
            expect(
                yield* Effect.flip(
                    sequencer.submitEffect(
                        clientSessionId,
                        request(1),
                        Effect.die("must never run"),
                    ),
                ),
            ).toMatchObject({ code: "session_expired" });
            const next = yield* sequencer.open;
            expect(next.clientSessionId).not.toBe(clientSessionId);
            const restarted = new Sequencer<number>({
                gapTimeout: 100,
                onGap() {},
            });
            expect(
                yield* Effect.flip(
                    restarted.submitEffect(
                        next.clientSessionId,
                        request(2),
                        Effect.succeed(2),
                    ),
                ),
            ).toMatchObject({ code: "session_expired" });
            yield* sequencer.shutdown;
            yield* restarted.shutdown;
        }),
);
it.effect("bounds gap input and drains admitted work on shutdown", () =>
    Effect.gen(function* () {
        const sequencer = new Sequencer<number>({
            gapTimeout: 100,
            onGap() {},
        });
        const { clientSessionId } = yield* sequencer.open;
        expect(
            yield* Effect.flip(
                sequencer.submitEffect(
                    clientSessionId,
                    request(Number.MAX_SAFE_INTEGER),
                    Effect.succeed(1),
                ),
            ),
        ).toMatchObject({ code: "sequence_window" });
        const started = yield* Deferred.make<void>();
        const release = yield* Deferred.make<number>();
        const first = yield* Effect.forkChild(
            sequencer.submitEffect(
                clientSessionId,
                request(1),
                Effect.gen(function* () {
                    yield* Deferred.succeed(started, undefined);
                    return yield* Deferred.await(release);
                }),
            ),
        );
        yield* Deferred.await(started);
        const second = yield* Effect.forkChild(
            sequencer.submitEffect(
                clientSessionId,
                request(2),
                Effect.die("must not run"),
            ),
        );
        yield* Effect.yieldNow;
        const closing = yield* Effect.forkChild(sequencer.shutdown);
        yield* Effect.yieldNow;
        yield* Deferred.succeed(release, 1);
        expect(yield* Fiber.join(first)).toEqual({ ok: true, value: 1 });
        expect(yield* Fiber.join(second)).toMatchObject({
            ok: false,
            error: { code: "stopping" },
        });
        yield* Fiber.join(closing);
        expect(yield* Effect.flip(sequencer.open)).toMatchObject({
            code: "stopping",
        });
    }),
);
