import type { Terminal } from "@xterm/headless";

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
 * Owns a fresh, unwritten mirror. All subsequent writes/resizes must pass here.
 * Captures at the last complete input boundary, retaining the unfinished suffix.
 */
export class MirrorBoundary {
    readonly #mirror: Terminal;
    readonly #parser: Parser;
    readonly #decoder: Decoder;
    readonly #point = new Uint32Array(4);
    readonly #byteLimit: number;
    readonly #eventLimit: number;
    #pending: BoundaryEvent[] = [];
    #pendingBytes = 0;
    #unsafe = false;
    #queue: Promise<void> = Promise.resolve();
    #parsed: Promise<void> = Promise.resolve();
    #closed = false;
    #failure: { error: unknown } | undefined;
    #disposing: Promise<void> | undefined;

    constructor(mirror: Terminal, limits: BoundaryLimits = {}) {
        this.#mirror = mirror;
        // Bound per-session replay retention; this is independent of xterm
        // OSC/DCS payload limits and never truncates the live PTY stream.
        this.#byteLimit = limits.pendingBytes ?? 1024 * 1024;
        this.#eventLimit = limits.pendingEvents ?? 1024;
        for (const limit of [this.#byteLimit, this.#eventLimit]) {
            if (!Number.isSafeInteger(limit) || limit <= 0)
                throw new RangeError(
                    "Terminal replay limits must be positive safe integers.",
                );
        }
        // xterm 6.0.0 private access is isolated here: reuse its actual grammar
        // and decoder instead of maintaining a second VT transition table.
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
    }

    #order<T>(action: () => T | Promise<T>): Promise<T> {
        if (this.#closed)
            return Promise.reject(new Error("Terminal mirror is disposed."));
        const result = this.#queue.then(() => {
            if (this.#failure) throw this.#failure.error;
            return action();
        });
        // Rejected captures must not prevent subsequent PTY output processing.
        this.#queue = result.then(
            () => {},
            () => {},
        );
        return result;
    }

    #update(action: () => Promise<void>): Promise<void> {
        return this.#order(async () => {
            try {
                await action();
                // Advancing the submission FIFO must not await each write's
                // timer. Callers still observe parsing completion for their cut.
                return { parsed: this.#parsed };
            } catch (error) {
                this.#failure = { error };
                throw error;
            }
        }).then(({ parsed }) => parsed);
    }

    async #apply(event: BoundaryEvent): Promise<void> {
        if (event.type === "data") {
            let complete!: () => void;
            const parsed = new Promise<void>((resolve) => {
                complete = resolve;
            });
            // Keep synchronous vendor failures in #update's failure latch.
            this.#mirror.write(event.data, complete);
            this.#parsed = parsed;
        } else {
            await this.#parsed;
            this.#mirror.resize(event.cols, event.rows);
        }
    }

    async #flush(): Promise<void> {
        for (const event of this.#pending) await this.#apply(event);
        this.#pending = [];
        this.#pendingBytes = 0;
    }

    async #retain(event: BoundaryEvent): Promise<void> {
        this.#pending.push(event);
        if (event.type === "data") this.#pendingBytes += event.data.length;
        if (
            this.#pendingBytes > this.#byteLimit ||
            this.#pending.length > this.#eventLimit
        ) {
            await this.#flush();
            this.#unsafe = true;
        }
    }

    write(input: Uint8Array): Promise<void> {
        const data = Uint8Array.from(input);
        return this.#update(async () => {
            let boundary = 0;
            // ponytail: bytewise vendor parsing preserves exact byte offsets;
            // add a vendor batch-boundary hook if measured throughput requires it.
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
            if (boundary > 0) {
                this.#pending.push({
                    type: "data",
                    data: data.slice(0, boundary),
                });
                await this.#flush();
                this.#unsafe = false;
            }
            if (boundary < data.length) {
                const event: BoundaryEvent = {
                    type: "data",
                    data: data.slice(boundary),
                };
                if (this.#unsafe) await this.#apply(event);
                else await this.#retain(event);
            }
        });
    }

    resize(cols: number, rows: number): Promise<void> {
        if (
            !Number.isSafeInteger(cols) ||
            cols <= 0 ||
            !Number.isSafeInteger(rows) ||
            rows <= 0
        ) {
            return Promise.reject(
                new RangeError(
                    "Terminal dimensions must be positive safe integers.",
                ),
            );
        }
        return this.#update(async () => {
            const event: BoundaryEvent = { type: "resize", cols, rows };
            if (this.#pending.length) await this.#retain(event);
            else await this.#apply(event);
        });
    }

    /** capture must be synchronous and read-only; it runs at this FIFO cut. */
    snapshot<T>(
        capture: (mirror: Terminal) => T,
    ): Promise<{ state: T; tail: BoundaryEvent[] }> {
        return this.#order(async () => {
            // Later writes cannot be submitted until capture finishes, so this
            // continuation cannot accidentally observe beyond the requested cut.
            await this.#parsed;
            if (this.#unsafe)
                throw new Error(
                    "Terminal snapshot unavailable: incomplete output exceeds replay limit.",
                );
            return {
                state: capture(this.#mirror),
                tail: this.#pending.map((event) =>
                    event.type === "data"
                        ? { type: "data", data: event.data.slice() }
                        : { ...event },
                ),
            };
        });
    }

    dispose(): Promise<void> {
        if (!this.#disposing) {
            this.#disposing = this.#queue.then(async () => {
                await this.#parsed;
                this.#pending = [];
                this.#pendingBytes = 0;
                try {
                    this.#parser.dispose();
                } finally {
                    this.#mirror.dispose();
                }
            });
            this.#closed = true;
        }
        return this.#disposing;
    }
}
