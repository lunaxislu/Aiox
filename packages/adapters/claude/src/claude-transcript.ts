import { open } from "node:fs/promises";

/** Reads vendor-owned JSONL; never creates or modifies the transcript. */
export class ClaudeTranscript {
    #offset = 0;
    #identity: string | undefined;
    #skipPartial = false;
    #closed = false;
    #retired = false;
    #queue = Promise.resolve();
    constructor(
        public path: string,
        readonly consume: (row: unknown) => Promise<void>,
    ) {}

    /** Capture before releasing SessionStart; later reads must not recapture EOF. */
    static async fromEnd(
        path: string,
        consume: (row: unknown) => Promise<void>,
    ): Promise<ClaudeTranscript> {
        const reader = new ClaudeTranscript(path, consume);
        const file = await open(path, "r").catch(
            (error: NodeJS.ErrnoException) => {
                if (error.code === "ENOENT") return undefined;
                throw error;
            },
        );
        if (!file) return reader;
        try {
            const stat = await file.stat();
            if (!stat.isFile())
                throw new Error("Invalid Claude transcript file.");
            reader.#identity = `${stat.dev}:${stat.ino}`;
            reader.#offset = stat.size;
            if (stat.size) {
                const last = Buffer.alloc(1);
                const { bytesRead } = await file.read(
                    last,
                    0,
                    1,
                    stat.size - 1,
                );
                if (bytesRead !== 1)
                    throw new Error(
                        "Claude transcript changed during initialization.",
                    );
                reader.#skipPartial = last[0] !== 10;
            }
            return reader;
        } finally {
            await file.close();
        }
    }

    read(): Promise<void> {
        const next = this.#queue.then(() => this.#read());
        this.#queue = next.catch(() => {});
        return next;
    }

    relocate(path: string): void {
        // In-flight reads own their open fd; the next queued read opens the new path.
        if (!this.#closed) this.path = path;
    }

    async close(): Promise<void> {
        this.#closed = true;
        await this.#queue;
    }

    /** Finish the active snapshot, without starting queued or future reads. */
    async retire(): Promise<void> {
        this.#retired = true;
        await this.#queue;
        this.#closed = true;
    }

    async #read(): Promise<void> {
        if (this.#closed || this.#retired) return;
        const file = await open(this.path, "r").catch(
            (error: NodeJS.ErrnoException) => {
                if (error.code === "ENOENT") return undefined;
                throw error;
            },
        );
        if (!file) return;
        try {
            const stat = await file.stat();
            if (!stat.isFile())
                throw new Error("Invalid Claude transcript file.");
            const identity = `${stat.dev}:${stat.ino}`;
            if (this.#identity !== identity || stat.size < this.#offset) {
                this.#offset = 0;
                this.#skipPartial = false;
            }
            this.#identity = identity;
            let position = this.#offset;
            let pending = Buffer.alloc(0);
            const chunk = Buffer.alloc(64 * 1024);
            while (!this.#closed && position < stat.size) {
                const { bytesRead } = await file.read(
                    chunk,
                    0,
                    Math.min(chunk.length, stat.size - position),
                    position,
                );
                if (!bytesRead) break;
                position += bytesRead;
                pending = Buffer.concat([
                    pending,
                    chunk.subarray(0, bytesRead),
                ]);
                let newline: number;
                while (
                    !this.#closed &&
                    (newline = pending.indexOf(10)) !== -1
                ) {
                    const line = pending
                        .subarray(0, newline)
                        .toString("utf8")
                        .trim();
                    if (line && !this.#skipPartial)
                        await this.consume(JSON.parse(line));
                    this.#skipPartial = false;
                    this.#offset += newline + 1;
                    pending = pending.subarray(newline + 1);
                }
                if (pending.length > 16 * 1024 * 1024)
                    throw new Error(
                        "Claude transcript row exceeds read limit.",
                    );
            }
        } finally {
            await file.close();
        }
    }
}
