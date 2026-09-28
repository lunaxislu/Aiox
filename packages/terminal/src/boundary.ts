import type { Terminal } from "@xterm/headless";
import { Cause, Deferred, Effect, Exit, Fiber, Semaphore } from "effect";

export type BoundaryEvent =
    | { type: "data"; data: Uint8Array }
    | { type: "resize"; cols: number; rows: number };

export type BoundaryLimits = {
    pendingBytes?: number;
    pendingEvents?: number;
};

type Parser = {
    currentState: number;
    parse(data: Uint32Array, length: number): unknown;
    dispose(): void;
};

type Decoder = {
    interim: Uint8Array;
    decode(data: Uint8Array, target: Uint32Array): number;
};

/**
 * Owns a fresh, unwritten mirror. All subsequent writes/resizes pass here.
 * Captures at the last complete input boundary, retaining the unfinished suffix.
 */
export class MirrorBoundary {
    readonly #mirror: Terminal;
    readonly #parser: Parser;
    readonly #decoder: Decoder;
    readonly #point = new Uint32Array(4);
    readonly #byteLimit: number;
    readonly #eventLimit: number;
    readonly #queue = Effect.runSync(Semaphore.make(1));
    #pending: BoundaryEvent[] = [];
    #pendingBytes = 0;
    #unsafe = false;
    #parsed: Deferred.Deferred<void>;
    #closed = false;
    #failure: { error: unknown } | undefined;
    #disposing: Fiber.Fiber<void, unknown> | undefined;
    #disposePromise: Promise<void> | undefined;

    constructor(mirror: Terminal, limits: BoundaryLimits = {}) {
        this.#mirror = mirror;
        this.#byteLimit = limits.pendingBytes ?? 1024 * 1024;
        this.#eventLimit = limits.pendingEvents ?? 1024;
        for (const limit of [this.#byteLimit, this.#eventLimit]) {
            if (!Number.isSafeInteger(limit) || limit <= 0)
                throw new RangeError(
                    "Terminal replay limits must be positive safe integers.",
                );
        }
        const handler = (
            mirror as unknown as {
                _core: {
                    _inputHandler: {
                        _parser: { constructor: new () => Parser };
                        _utf8Decoder: { constructor: new () => Decoder };
                    };
                };
            }
        )._core._inputHandler;
        this.#parser = new handler._parser.constructor();
        this.#decoder = new handler._utf8Decoder.constructor();
        this.#parsed = Effect.runSync(Deferred.make<void>());
        Effect.runSync(Deferred.succeed(this.#parsed, undefined));
    }

    #order<T>(action: Effect.Effect<T, unknown>): Effect.Effect<T, unknown> {
        if (this.#closed)
            return Effect.fail(new Error("Terminal mirror is disposed."));
        return Semaphore.withPermit(this.#queue)(
            Effect.gen({ self: this }, function* () {
                if (this.#failure)
                    return yield* Effect.fail(this.#failure.error);
                return yield* action;
            }),
        );
    }

    #update(action: Effect.Effect<void, unknown>): Promise<void> {
        const submitted = this.#order(
            Effect.gen({ self: this }, function* () {
                const exit = yield* Effect.exit(action);
                if (Exit.isFailure(exit)) {
                    const error = Cause.squash(exit.cause);
                    this.#failure = { error };
                    return yield* Effect.fail(error);
                }
                return this.#parsed;
            }),
        );
        return Effect.runPromise(
            Effect.flatMap(submitted, (parsed) => Deferred.await(parsed)),
        );
    }

    #apply(event: BoundaryEvent): Effect.Effect<void, unknown> {
        if (event.type === "data") {
            return Effect.try({
                try: () => {
                    const parsed = Effect.runSync(Deferred.make<void>());
                    this.#mirror.write(event.data, () => {
                        // xterm finalizes its write buffer after this callback;
                        // a synchronous resize here would reparse the same bytes.
                        queueMicrotask(() =>
                            Effect.runFork(Deferred.succeed(parsed, undefined)),
                        );
                    });
                    this.#parsed = parsed;
                },
                catch: (error) => error,
            });
        }
        return Effect.gen({ self: this }, function* () {
            yield* Deferred.await(this.#parsed);
            yield* Effect.try({
                try: () => this.#mirror.resize(event.cols, event.rows),
                catch: (error) => error,
            });
        });
    }

    #flush(): Effect.Effect<void, unknown> {
        return Effect.gen({ self: this }, function* () {
            for (const event of this.#pending) yield* this.#apply(event);
            this.#pending = [];
            this.#pendingBytes = 0;
        });
    }

    #retain(event: BoundaryEvent): Effect.Effect<void, unknown> {
        return Effect.gen({ self: this }, function* () {
            this.#pending.push(event);
            if (event.type === "data") this.#pendingBytes += event.data.length;
            if (
                this.#pendingBytes > this.#byteLimit ||
                this.#pending.length > this.#eventLimit
            ) {
                yield* this.#flush();
                this.#unsafe = true;
            }
        });
    }

    write(input: Uint8Array): Promise<void> {
        const data = Uint8Array.from(input);
        const write = Effect.try({
            try: () => {
                let boundary = 0;
                for (let i = 0; i < data.length; i++) {
                    const length = this.#decoder.decode(
                        data.subarray(i, i + 1),
                        this.#point,
                    );
                    this.#parser.parse(this.#point, length);
                    if (
                        this.#parser.currentState === 0 &&
                        !this.#decoder.interim[0]
                    )
                        boundary = i + 1;
                }
                return boundary;
            },
            catch: (error) => error,
        }).pipe(
            Effect.flatMap((boundary) =>
                Effect.gen({ self: this }, function* () {
                    if (boundary > 0) {
                        this.#pending.push({
                            type: "data",
                            data: data.slice(0, boundary),
                        });
                        yield* this.#flush();
                        this.#unsafe = false;
                    }
                    if (boundary < data.length) {
                        const event: BoundaryEvent = {
                            type: "data",
                            data: data.slice(boundary),
                        };
                        if (this.#unsafe) yield* this.#apply(event);
                        else yield* this.#retain(event);
                    }
                }),
            ),
        );
        return this.#update(write);
    }

    resize(cols: number, rows: number): Promise<void> {
        if (
            !Number.isSafeInteger(cols) ||
            cols <= 0 ||
            !Number.isSafeInteger(rows) ||
            rows <= 0
        )
            return Effect.runPromise(
                Effect.fail(
                    new RangeError(
                        "Terminal dimensions must be positive safe integers.",
                    ),
                ),
            );
        return this.#update(
            Effect.gen({ self: this }, function* () {
                const event: BoundaryEvent = { type: "resize", cols, rows };
                if (this.#pending.length) yield* this.#retain(event);
                else yield* this.#apply(event);
            }),
        );
    }

    /** Capture must be synchronous and read-only; it runs at this FIFO cut. */
    snapshot<T>(
        capture: (mirror: Terminal) => T,
    ): Promise<{ state: T; tail: BoundaryEvent[] }> {
        const snapshot = this.#order(
            Effect.gen({ self: this }, function* () {
                yield* Deferred.await(this.#parsed);
                if (this.#unsafe)
                    return yield* Effect.fail(
                        new Error(
                            "Terminal snapshot unavailable: incomplete output exceeds replay limit.",
                        ),
                    );
                return {
                    state: capture(this.#mirror),
                    tail: this.#pending.map((event) =>
                        event.type === "data"
                            ? {
                                  type: "data" as const,
                                  data: event.data.slice(),
                              }
                            : { ...event },
                    ),
                };
            }),
        );
        return Effect.runPromise(snapshot);
    }

    dispose(): Promise<void> {
        if (!this.#disposing) {
            this.#closed = true;
            this.#disposing = Effect.runFork(
                Semaphore.withPermit(this.#queue)(
                    Effect.gen({ self: this }, function* () {
                        yield* Deferred.await(this.#parsed);
                        this.#pending = [];
                        this.#pendingBytes = 0;
                        yield* Effect.try({
                            try: () => {
                                try {
                                    this.#parser.dispose();
                                } finally {
                                    this.#mirror.dispose();
                                }
                            },
                            catch: (error) => error,
                        });
                    }),
                ),
            );
            this.#disposePromise = Effect.runPromise(
                Fiber.join(this.#disposing),
            );
        }
        return this.#disposePromise!;
    }
}
