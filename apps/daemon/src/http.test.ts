import { request } from "node:http";

import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { startTestDaemon, type DaemonHarness } from "./testing";
let h: DaemonHarness;
beforeEach(async () => {
    h = await startTestDaemon();
});
afterEach(async () => {
    vi.restoreAllMocks();
    await h.close();
});

function chunked(url: string, chunks: string[]) {
    return new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = request(
            url,
            {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "transfer-encoding": "chunked",
                },
            },
            (res) => {
                let body = "";
                res.setEncoding("utf8").on("data", (chunk) => {
                    body += chunk;
                });
                res.on("end", () => resolve({ status: res.statusCode!, body }));
                res.on("error", reject);
            },
        );
        req.on("error", reject);
        for (const chunk of chunks) req.write(chunk);
        req.end();
    });
}
it("limits chunked bodies without Content-Length and preserves JSON errors on both listeners", async () => {
    for (const url of [h.apiUrl, h.webUrl]) {
        const invalid = await chunked(url("/api/networks"), ["{"]);
        expect(invalid.status).toBe(400);
        expect(JSON.parse(invalid.body)).toEqual({
            code: "invalid_json",
            message: "Request body is not JSON.",
        });
        const large = await chunked(url("/api/networks"), [
            '{"name":"',
            "x".repeat(1_000_001),
            '"}',
        ]);
        expect(large.status).toBe(413);
        expect(JSON.parse(large.body)).toEqual({
            code: "body_too_large",
            message: "Body too large.",
        });
        const okay = await chunked(url("/api/networks"), [
            '{"name":',
            JSON.stringify(url === h.apiUrl ? "daemon" : "web"),
            "}",
        ]);
        expect(okay.status).toBe(201);
        expect((await fetch(url("/api/networks"))).status).toBe(200);
    }
});
it("keeps explicit method and API fallback contracts including HEAD", async () => {
    for (const url of [h.apiUrl, h.webUrl]) {
        for (const [method, path] of [
            ["HEAD", "/api/status"],
            ["PUT", "/api/networks"],
            ["GET", "/api/nope"],
            ["GET", "/api/status/"],
        ]) {
            const response = await fetch(url(path!), { method: method! });
            expect(response.status).toBe(404);
            expect(response.headers.get("x-request-id")).toBeTruthy();
            if (method !== "HEAD")
                expect(await response.json()).toEqual({
                    code: "not_found",
                    message: `No such endpoint: ${method} ${path}`,
                });
        }
    }
});
it("preserves the body limit ahead of MCP authentication and rejects hook credentials", async () => {
    const notBuilt = await fetch(h.webUrl("/"));
    expect(notBuilt.status).toBe(404);
    expect(await notBuilt.text()).toBe(
        "The operational Web is not built. Run: pnpm --filter @aiox/web build",
    );

    const large = await chunked(h.apiUrl("/mcp/missing"), [
        '"',
        "x".repeat(1_000_001),
        '"',
    ]);
    expect(large.status).toBe(413);
    expect(large.body).toBe("HttpError: Body too large.");
    const hook = await fetch(h.apiUrl("/api/agent-hooks"));
    expect(hook.status).toBe(401);
    expect(await hook.text()).toBe("Invalid agent report credential.");
});

it("pauses actual SSE writes until drain and removes the Node drain listener on disconnect", async () => {
    const connections = vi.spyOn(h.daemon.services.webEvents, "connect");
    const response = await fetch(h.webUrl("/api/web/events"));
    const reader = response.body!.getReader();
    expect(new TextDecoder().decode((await reader.read()).value)).toContain(
        "event: snapshot",
    );
    const outgoing = connections.mock.calls[0]![0].env.outgoing;
    const write = outgoing.write.bind(outgoing);
    let blocked = true;
    const writes = vi
        .spyOn(outgoing, "write")
        .mockImplementation((...args: Parameters<typeof write>) => {
            const result = write(...args);
            return blocked ? false : result;
        });
    const first = await h.daemon.services.networks.create("first");
    expect(new TextDecoder().decode((await reader.read()).value)).toContain(
        first.id,
    );
    await vi.waitFor(() => expect(outgoing.listenerCount("drain")).toBe(1));
    const second = await h.daemon.services.networks.create("second");
    await h.daemon.services.networks.delete(first.id);
    await new Promise((resolve) => setImmediate(resolve));
    expect(writes).toHaveBeenCalledTimes(1);
    blocked = false;
    outgoing.emit("drain");
    let received = "";
    while (
        !received.includes(second.id) ||
        !received.includes('"action":"remove"')
    )
        received += new TextDecoder().decode((await reader.read()).value);
    expect(received).toContain(first.id);
    blocked = true;
    await h.daemon.services.networks.create("disconnect");
    await reader.read();
    await vi.waitFor(() => expect(outgoing.listenerCount("drain")).toBe(1));
    await reader.cancel();
    await vi.waitFor(() => expect(outgoing.destroyed).toBe(true));
    expect(outgoing.listenerCount("drain")).toBe(0);
});

it("reconnects over HTTP while the first SSE snapshot is still synchronizing", async () => {
    const events = h.daemon.services.webEvents;
    const connections = vi.spyOn(events, "connect");
    const state = h.daemon.services.db.hostState;
    const snapshot = state.snapshot.bind(state);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    const firstRead = vi
        .spyOn(state, "snapshot")
        .mockImplementationOnce(async () => {
            const captured = await snapshot();
            await gate;
            return captured;
        });
    const abort = new AbortController();
    const first = fetch(h.webUrl("/api/web/events"), {
        signal: abort.signal,
    }).catch((error) => error);
    await vi.waitFor(() => expect(firstRead).toHaveBeenCalled());
    const firstResponse = connections.mock.calls[0]![0].env.outgoing;
    abort.abort();
    expect(await first).toMatchObject({ name: "AbortError" });
    await vi.waitFor(() => expect(firstResponse.destroyed).toBe(true));
    const network = await h.daemon.services.networks.create("during-sync");
    const reconnect = await fetch(h.webUrl("/api/web/events"));
    const reader = reconnect.body!.getReader();
    const initial = new TextDecoder().decode((await reader.read()).value);
    expect(initial.startsWith("event: snapshot\n")).toBe(true);
    expect(initial).toContain(network.id);
    release();
    await vi.waitFor(() =>
        expect(firstRead.mock.settledResults[0]?.type).toBe("fulfilled"),
    );
    const next = reader.read();
    await h.daemon.services.networks.delete(network.id);
    const changed = new TextDecoder().decode((await next).value);
    expect(changed).toContain(`"action":"remove","id":"${network.id}"`);
    await reader.cancel();
    expect(firstResponse.listenerCount("drain")).toBe(0);
});
