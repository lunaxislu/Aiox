import { request } from "node:http";

import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
    openTestApplication,
    startTestDaemon,
    type DaemonHarness,
} from "./testing";
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

it("serves reconnect snapshots from memory and sends subsequent committed changes over RPC", async () => {
    const scan = vi.spyOn(h.daemon.services.db.hostState, "snapshot");
    const first = await openTestApplication(h);
    expect((await first.next()).type).toBe("snapshot");
    await first.close();
    const network = await h.daemon.services.networks.create("during-sync");
    const reconnect = await openTestApplication(h);
    const initial = await reconnect.next();
    expect(initial).toMatchObject({
        type: "snapshot",
        snapshot: { networks: [{ id: network.id }] },
    });
    await h.daemon.services.networks.delete(network.id);
    expect(await reconnect.next()).toMatchObject({
        type: "delta",
        changes: [{ action: "remove", id: network.id }],
    });
    await reconnect.close();
    expect(scan).not.toHaveBeenCalled();
});
