import { open } from "node:fs/promises";

/** Reads vendor-owned JSONL; never creates or modifies the transcript. */
export class ClaudeTranscript {
    #offset = 0;
    #identity: string | undefined;
    #closed = false;
    #queue = Promise.resolve();
    #timer: ReturnType<typeof setInterval> | undefined;
    #reported = false;
    #polling = false;

    constructor(
        readonly path: string,
        readonly consume: (row: unknown) => Promise<void>,
        readonly reportError: () => void,
    ) {}

    start(): void {
        if (this.#timer || this.#closed) return;
        // Polling also retries failed settlement without another file change and
        // follows replacement on Windows, Linux and macOS with the same code.
        this.#timer = setInterval(() => {
            if (this.#polling) return;
            this.#polling = true;
            void this.read()
                .catch(() => {
                    if (!this.#closed && !this.#reported) this.reportError();
                    this.#reported = true;
                })
                .finally(() => {
                    this.#polling = false;
                });
        }, 250);
        this.#timer.unref();
    }

    read(): Promise<void> {
        const next = this.#queue.then(() => this.#read());
        this.#queue = next.catch(() => {});
        return next;
    }

    async close(): Promise<void> {
        this.#closed = true;
        clearInterval(this.#timer);
        await this.#queue;
    }

    async #read(): Promise<void> {
        if (this.#closed) return;
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
            if (this.#identity !== identity || stat.size < this.#offset)
                this.#offset = 0;
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
                    if (line) await this.consume(JSON.parse(line));
                    this.#offset += newline + 1;
                    pending = pending.subarray(newline + 1);
                }
                if (pending.length > 16 * 1024 * 1024)
                    throw new Error(
                        "Claude transcript row exceeds read limit.",
                    );
            }
            this.#reported = false;
        } finally {
            await file.close();
        }
    }
}
