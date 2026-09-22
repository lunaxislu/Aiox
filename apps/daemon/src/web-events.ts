import type { ServerResponse } from "node:http";

import {
    webSnapshotSchema,
    webStateSchema,
    type WebSnapshot,
    type WebChange,
} from "@aiox/protocol";

const resources = {
    hosts: "host",
    networks: "network",
    panels: "panel",
    terminals: "terminal",
    agents: "agent",
    operations: "operation",
    notifications: "notification",
} as const;
function changes(before: WebSnapshot, after: WebSnapshot): WebChange[] {
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
    readonly #clients = new Map<ServerResponse, WebSnapshot>();
    readonly #blocked = new Set<ServerResponse>();
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
    async connect(response: ServerResponse): Promise<void> {
        const { snapshot, version: capturedVersion } = await this.#snapshot();
        if (response.destroyed) return;
        response.writeHead(200, {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache",
        });
        const remove = () => {
            this.#clients.delete(response);
            this.#blocked.delete(response);
            response.off("drain", drained);
        };
        const drained = () => {
            if (this.#blocked.delete(response)) this.notify();
        };
        response.on("drain", drained);
        response.on("close", remove);
        response.on("error", remove);
        this.#clients.set(response, snapshot);
        this.#send(response, "snapshot", snapshot);
        if (capturedVersion !== this.#version) this.notify();
    }
    notify = (): void => {
        this.#version++;
        if (this.#pending || this.#closed || !this.#clients.size) return;
        this.#pending = true;
        void this.#flush();
    };
    async #flush(): Promise<void> {
        const version = this.#version;
        try {
            const { snapshot, version: capturedVersion } =
                await this.#snapshot();
            if (capturedVersion !== this.#version) return;
            for (const [response, previous] of this.#clients) {
                if (this.#blocked.has(response)) continue;
                const update = changes(previous, snapshot);
                this.#clients.set(response, snapshot);
                if (update.length)
                    this.#send(response, "state", { changes: update });
            }
        } catch (error) {
            for (const response of this.#clients.keys()) {
                this.#send(response, "fault", {
                    code: "storage_error",
                    message:
                        error instanceof Error ? error.message : String(error),
                });
                response.end();
            }
            this.#clients.clear();
        } finally {
            this.#pending = false;
            if (version !== this.#version && this.#clients.size) this.notify();
        }
    }
    fault(code: string, message: string): void {
        for (const response of this.#clients.keys()) {
            this.#send(response, "fault", { code, message });
            response.end();
        }
        this.#clients.clear();
    }
    close(): void {
        this.#closed = true;
        for (const response of this.#clients.keys()) response.destroy();
        this.#clients.clear();
    }
    #send(response: ServerResponse, event: string, data: unknown): void {
        try {
            // write(false) accepted the frame; coalesce later state until drain.
            if (
                !response.write(
                    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
                )
            )
                this.#blocked.add(response);
        } catch {
            this.#clients.delete(response);
            this.#blocked.delete(response);
            response.destroy();
        }
    }
}
