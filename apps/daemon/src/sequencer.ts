import { randomUUID } from "node:crypto";

import type { WebSequenceFailure } from "@aiox/protocol";
import { Cause, Clock, Deferred, Effect, Exit, Fiber } from "effect";

import { HttpError } from "./http-error";

export type Settled<T> = { ok: true; value: T } | { ok: false; error: unknown };
export type SequencerOptions = {
    gapTimeout: number;
    idleSession?: number;
    onGap(failure: WebSequenceFailure): void;
};
type Request = { sequence: number; requestId: string; hash: string };
type Waiting<T> = Request & {
    run: Effect.Effect<T, unknown>;
    result: Deferred.Deferred<Settled<T>>;
};
type Session<T> = {
    settled: number;
    pending: Map<number, Waiting<T>>;
    running: Waiting<T> | undefined;
    identities: Set<string>;
    gap: Fiber.Fiber<void> | undefined;
    active: number;
};

/** Server-issued sessions cannot be recreated by retransmitting an expired command. */
export class Sequencer<T> {
    readonly #sessions = new Map<string, Session<T>>();
    #closed = false;
    #paused = false;
    constructor(private readonly options: SequencerOptions) {}

    readonly open = Effect.gen({ self: this }, function* () {
        if (this.#closed || this.#paused) return yield* Effect.fail(stopping());
        const now = yield* Clock.currentTimeMillis;
        this.#sweep(now);
        const clientSessionId = randomUUID();
        this.#sessions.set(clientSessionId, {
            settled: 0,
            pending: new Map(),
            running: undefined,
            identities: new Set(),
            gap: undefined,
            active: now,
        });
        return { clientSessionId, checkpoint: 0 };
    });

    resume(clientSessionId: string) {
        return Effect.gen({ self: this }, function* () {
            const now = yield* Clock.currentTimeMillis;
            this.#sweep(now);
            const session = this.#sessions.get(clientSessionId);
            if (!session || this.#closed) return yield* Effect.fail(expired());
            session.active = now;
            return { clientSessionId, checkpoint: session.settled };
        });
    }

    submit(clientSessionId: string, request: Request, run: () => Promise<T>) {
        return Effect.runPromise(
            this.submitEffect(
                clientSessionId,
                request,
                Effect.tryPromise({ try: run, catch: (error) => error }),
            ),
        );
    }

    submitEffect(
        clientSessionId: string,
        request: Request,
        run: Effect.Effect<T, unknown>,
    ) {
        return Effect.gen({ self: this }, function* () {
            if (this.#paused) return yield* Effect.fail(stopping());
            const now = yield* Clock.currentTimeMillis;
            this.#sweep(now);
            const session = this.#sessions.get(clientSessionId);
            if (!session || this.#closed) return yield* Effect.fail(expired());
            session.active = now;
            if (!Number.isSafeInteger(request.sequence) || request.sequence < 1)
                return yield* Effect.fail(
                    conflict(
                        "invalid_sequence",
                        "Sequence must be a positive safe integer.",
                    ),
                );
            for (const waiting of [
                session.running,
                ...session.pending.values(),
            ]) {
                if (waiting?.requestId === request.requestId) {
                    if (
                        waiting.hash !== request.hash ||
                        waiting.sequence !== request.sequence
                    )
                        return yield* Effect.fail(
                            conflict(
                                "request_conflict",
                                "This requestId was used with a different request.",
                            ),
                        );
                    return yield* Deferred.await(waiting.result);
                }
            }
            if (request.sequence <= session.settled)
                return yield* Effect.fail(
                    conflict(
                        "result_expired",
                        "This sequence is finalized. Its result is unavailable; it will not execute again.",
                        session.settled,
                    ),
                );
            if (session.identities.has(request.requestId))
                return yield* Effect.fail(
                    conflict(
                        "request_finalized",
                        "This requestId is finalized and cannot execute again.",
                        session.settled,
                    ),
                );
            if (
                session.running?.sequence === request.sequence ||
                session.pending.has(request.sequence)
            )
                return yield* Effect.fail(
                    conflict(
                        "sequence_conflict",
                        "Another request already used this sequence.",
                    ),
                );
            // Bound the missing-sequence notification and queued commands from an untrusted peer.
            if (request.sequence - session.settled > 1024)
                return yield* Effect.fail(
                    conflict(
                        "sequence_window",
                        "Sequence exceeds the 1024-command recovery window.",
                        session.settled,
                    ),
                );
            const waiting = {
                ...request,
                run,
                result: yield* Deferred.make<Settled<T>>(),
            };
            session.identities.add(request.requestId);
            session.pending.set(request.sequence, waiting);
            yield* this.#drain(clientSessionId, session);
            return yield* Deferred.await(waiting.result);
        });
    }

    #drain(id: string, session: Session<T>): Effect.Effect<void> {
        return Effect.gen({ self: this }, function* () {
            if (session.running || this.#closed || this.#paused) return;
            const next = session.pending.get(session.settled + 1);
            if (!next) {
                if (session.pending.size && !session.gap)
                    session.gap = yield* Effect.forkDetach(
                        Effect.sleep(this.options.gapTimeout).pipe(
                            Effect.andThen(() => this.#expire(id, session)),
                        ),
                    );
                return;
            }
            if (session.gap) {
                yield* Fiber.interrupt(session.gap);
                session.gap = undefined;
            }
            session.pending.delete(next.sequence);
            session.running = next;
            // Accepted work belongs to the daemon; a disconnected submitter cannot interrupt it.
            yield* Effect.forkDetach(
                Effect.gen({ self: this }, function* () {
                    const exit = yield* Effect.exit(next.run);
                    const result: Settled<T> = Exit.isSuccess(exit)
                        ? { ok: true, value: exit.value }
                        : { ok: false, error: Cause.squash(exit.cause) };
                    session.running = undefined;
                    session.settled = next.sequence;
                    session.active = yield* Clock.currentTimeMillis;
                    yield* Deferred.succeed(next.result, result);
                    yield* this.#drain(id, session);
                }),
            );
        });
    }

    #expire(id: string, session: Session<T>) {
        return Effect.gen({ self: this }, function* () {
            session.gap = undefined;
            if (session.running || session.pending.has(session.settled + 1))
                return;
            const waiting = [...session.pending.values()].sort(
                (a, b) => a.sequence - b.sequence,
            );
            if (!waiting.length) return;
            const last = waiting.at(-1)!.sequence;
            const missing: number[] = [];
            for (let s = session.settled + 1; s <= last; s++)
                if (!session.pending.has(s)) missing.push(s);
            session.pending.clear();
            session.settled = last;
            session.active = yield* Clock.currentTimeMillis;
            const error = conflict(
                "sequence_gap",
                `Not executed: missing sequence ${missing.join(", ")}.`,
                last,
            );
            for (const request of waiting)
                yield* Deferred.succeed(request.result, { ok: false, error });
            this.options.onGap({
                clientSessionId: id,
                code: "sequence_gap",
                missing,
                unexecuted: waiting.map(({ sequence, requestId }) => ({
                    sequence,
                    requestId,
                })),
            });
        });
    }

    #sweep(now: number) {
        for (const [id, session] of this.#sessions)
            if (
                !session.running &&
                !session.pending.size &&
                now - session.active > (this.options.idleSession ?? 3_600_000)
            )
                this.#sessions.delete(id);
    }

    /** Stop admission and classify queued requests before draining accepted work. Reversible on cleanup failure. */
    readonly quiesce = Effect.gen({ self: this }, function* () {
        this.#paused = true;
        const checkpoints = new Map<Session<T>, number>();
        const running: Deferred.Deferred<Settled<T>>[] = [];
        for (const session of this.#sessions.values()) {
            if (session.gap) {
                yield* Fiber.interrupt(session.gap);
                session.gap = undefined;
            }
            checkpoints.set(
                session,
                Math.max(session.settled, ...session.pending.keys()),
            );
            for (const request of session.pending.values())
                yield* Deferred.succeed(request.result, {
                    ok: false,
                    error: stopping(),
                });
            session.pending.clear();
            if (session.running) running.push(session.running.result);
        }
        yield* Effect.forEach(running, Deferred.await, {
            concurrency: "unbounded",
            discard: true,
        });
        for (const [session, checkpoint] of checkpoints)
            session.settled = Math.max(session.settled, checkpoint);
    });
    resumeWork() {
        if (!this.#closed) this.#paused = false;
    }
    readonly shutdown = Effect.gen({ self: this }, function* () {
        this.#closed = true;
        yield* this.quiesce;
        this.#sessions.clear();
    });
    close() {
        return Effect.runPromise(this.shutdown);
    }
}
const conflict = (code: string, message: string, checkpoint?: number) =>
    new HttpError(
        409,
        code,
        message,
        checkpoint === undefined ? {} : { checkpoint },
    );
const expired = () =>
    conflict(
        "session_expired",
        "Session is unknown or expired. Open a new session and reconcile current state.",
    );
const stopping = () => new HttpError(503, "stopping", "Daemon is stopping.");
