import {
    webSnapshotSchema,
    webStateSchema,
    type WebSnapshot,
    type WebChange,
} from "@aiox/protocol";
import type { Context } from "hono";
import { streamSSE, type SSEStreamingApi } from "hono/streaming";

const resources = {
    hosts: "host",
    networks: "network",
    panels: "panel",
    terminals: "terminal",
    agents: "agent",
    operations: "operation",
    notifications: "notification",
} as const;
export function changes(before: WebSnapshot, after: WebSnapshot): WebChange[] {
    const result: unknown[] = [];
    for (const [collection, resource] of Object.entries(resources)) {
        const key = collection as keyof WebSnapshot;
        const identity = (value: WebSnapshot[typeof key][number]) =>
            "agentId" in value ? value.agentId : value.id;
        const previous = new Map(
            before[key].map((value) => [
                identity(value),
                JSON.stringify(value),
            ]),
        );
        for (const value of after[key]) {
            const id = identity(value);
            if (previous.get(id) !== JSON.stringify(value))
                result.push({ resource, action: "upsert", id, value });
            previous.delete(id);
        }
        for (const id of previous.keys())
            result.push({ resource, action: "remove", id });
    }
    return webStateSchema.parse({ changes: result }).changes;
}
export class WebEvents {
    readonly #clients = new Map<
        SSEStreamingApi,
        { snapshot: WebSnapshot; version: number; finish: () => void }
    >();
    readonly #blocked = new Set<SSEStreamingApi>();
    #read: (() => Promise<WebSnapshot>) | undefined;
    #version = 0;
    #pending = false;
    #closed = false;
    readonly #updates = new Set<Promise<void>>();
    beginUpdate(): () => void {
        let release!: () => void;
        const pending = new Promise<void>((resolve) => {
            release = resolve;
        });
        this.#updates.add(pending);
        this.#version++;
        return () => {
            this.#updates.delete(pending);
            release();
            this.notify();
        };
    }
    setSnapshot(read: () => Promise<WebSnapshot>): void {
        this.#read = read;
    }
    async #snapshot(): Promise<{ snapshot: WebSnapshot; version: number }> {
        if (!this.#read)
            throw new Error("Web snapshot provider is not installed.");
        for (;;) {
            if (this.#updates.size) {
                await Promise.all(this.#updates);
                continue;
            }
            const version = this.#version;
            const snapshot = webSnapshotSchema.parse(await this.#read());
            if (this.#closed) throw new Error("Daemon is closing.");
            if (version === this.#version) return { snapshot, version };
        }
    }
    async connect(c: Context): Promise<Response> {
        const { snapshot, version: capturedVersion } = await this.#snapshot();
        const response = streamSSE(c, async (stream) => {
            let finish!: () => void;
            const closed = new Promise<void>((resolve) => {
                finish = resolve;
            });
            const remove = () => {
                this.#clients.delete(stream);
                this.#blocked.delete(stream);
                finish();
            };
            stream.onAbort(remove);
            if (c.req.raw.signal.aborted || this.#closed) {
                stream.abort();
                return;
            }
            this.#clients.set(stream, {
                snapshot,
                version: capturedVersion,
                finish,
            });
            void this.#send(stream, "snapshot", JSON.stringify(snapshot));
            if (capturedVersion !== this.#version) this.#schedule();
            try {
                await closed;
            } finally {
                remove();
            }
        });
        response.headers.set(
            "content-type",
            "text/event-stream; charset=utf-8",
        );
        return response;
    }
    notify = (): void => {
        this.#version++;
        this.#schedule();
    };
    #schedule(): void {
        if (this.#pending || this.#closed || !this.#clients.size) return;
        this.#pending = true;
        queueMicrotask(() => {
            if (this.#closed || !this.#clients.size) {
                this.#pending = false;
                return;
            }
            void this.#flush();
        });
    }
    async #flush(): Promise<void> {
        let version = this.#version;
        try {
            const { snapshot, version: capturedVersion } =
                await this.#snapshot();
            if (capturedVersion !== this.#version) return;
            version = capturedVersion;
            // Slow/new clients can have different baselines. Share only equal ones.
            const deltas = new Map<WebSnapshot, string | null>();
            for (const [response, client] of this.#clients) {
                if (this.#blocked.has(response)) continue;
                if (!deltas.has(client.snapshot)) {
                    const update = changes(client.snapshot, snapshot);
                    deltas.set(
                        client.snapshot,
                        update.length
                            ? JSON.stringify({ changes: update })
                            : null,
                    );
                }
                const data = deltas.get(client.snapshot)!;
                client.snapshot = snapshot;
                client.version = capturedVersion;
                if (data !== null) void this.#send(response, "state", data);
            }
        } catch (error) {
            this.fault(
                "storage_error",
                error instanceof Error ? error.message : String(error),
            );
        } finally {
            this.#pending = false;
            if (version !== this.#version) this.#schedule();
        }
    }
    fault(code: string, message: string): void {
        const data = JSON.stringify({ code, message });
        for (const [stream, client] of this.#clients) {
            void this.#send(stream, "fault", data).finally(client.finish);
        }
        this.#clients.clear();
        this.#blocked.clear();
    }
    close(): void {
        this.#closed = true;
        for (const stream of this.#clients.keys()) stream.abort();
        this.#clients.clear();
        this.#blocked.clear();
    }
    async #send(
        stream: SSEStreamingApi,
        event: string,
        data: string,
    ): Promise<void> {
        this.#blocked.add(stream);
        try {
            // The Node adapter stops pulling on write(false) until drain. Do not
            // queue state while the stream writer waits; coalesce it after drain.
            await stream.writeSSE({ event, data });
        } catch {
            stream.abort();
        } finally {
            const client = this.#clients.get(stream);
            if (
                this.#blocked.delete(stream) &&
                client &&
                client.version !== this.#version
            )
                this.#schedule();
        }
    }
}
