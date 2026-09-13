import type { ServerResponse } from "node:http";

/** Invalidation only: every connection queries a fresh snapshot, never replays events. */
export class WebEvents {
    readonly #clients = new Set<ServerResponse>();

    connect(response: ServerResponse): void {
        response.writeHead(200, {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache",
        });
        const remove = () => this.#clients.delete(response);
        response.on("close", remove);
        response.on("error", remove);
        this.#clients.add(response);
        this.#send(response);
    }

    notify = (): void => {
        for (const response of this.#clients) this.#send(response);
    };

    close(): void {
        for (const response of this.#clients) response.destroy();
        this.#clients.clear();
    }

    #send(response: ServerResponse): void {
        try {
            if (response.write("event: change\ndata: {}\n\n")) return;
        } catch {
            /* Failed or slow viewers recover through a new snapshot. */
        }
        this.#clients.delete(response);
        response.destroy();
    }
}
