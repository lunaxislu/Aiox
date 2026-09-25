import { readFile, rm, writeFile } from "node:fs/promises";
import { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { logger } from "@aiox/diagnostics";
import { openDatabase } from "@aiox/persistence";
import type {
    AgentView,
    DaemonStatus,
    NetworkView,
    NotificationView,
} from "@aiox/protocol";
import { terminalContextFromEnv } from "@aiox/protocol";
import { defaultShell } from "@aiox/terminal";
import * as terminalModule from "@aiox/terminal";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";

import { startDaemon } from "@/daemon";
import type { DaemonHarness } from "@/testing";
import { openTestApplication, fakeVendor, startTestDaemon } from "@/testing";

let harness: DaemonHarness;

beforeEach(async () => {
    harness = await startTestDaemon();
});

afterEach(async () => {
    vi.restoreAllMocks();
    await harness.close();
});

async function call(
    path: string,
    init: RequestInit = {},
): Promise<{ status: number; body: unknown }> {
    const response = await fetch(harness.apiUrl(path), {
        ...init,
        ...(init.body === undefined
            ? {}
            : { headers: { "content-type": "application/json" } }),
    });
    const text = await response.text();
    return {
        status: response.status,
        body: text === "" ? undefined : (JSON.parse(text) as unknown),
    };
}

const post = (path: string, body: unknown) =>
    call(path, { method: "POST", body: JSON.stringify(body) });

it("keeps both HTTP surfaces unavailable until required startup recording finishes", async () => {
    const db = await openDatabase(join(harness.home, "startup.db"));
    let prepared = false;
    const daemon = await startDaemon({
        db,
        ports: { daemon: 0, web: 0 },
        retentionDays: () => 30,
        onListening: async (ports) => {
            for (const port of [ports.daemon, ports.web]) {
                for (const path of [
                    "/api/status",
                    "/api/rpc",
                    "/api/web/agents",
                    "/api/daemon/stop",
                    "/mcp/test",
                    "/api/agent-hooks",
                ]) {
                    const response = await fetch(
                        `http://127.0.0.1:${port}${path}`,
                    );
                    expect(response.status).toBe(503);
                }
                const status = await new Promise<number>((resolve, reject) => {
                    const socket = new WebSocket(
                        `ws://127.0.0.1:${port}/api/agent-run`,
                    );
                    socket.on("error", reject);
                    socket.on("unexpected-response", (_request, response) => {
                        resolve(response.statusCode!);
                        response.destroy();
                        socket.terminate();
                    });
                });
                expect(status).toBe(503);
            }
            prepared = true;
        },
    });
    try {
        expect(prepared).toBe(true);
        expect(
            (await fetch(`http://127.0.0.1:${daemon.ports.daemon}/api/status`))
                .status,
        ).toBe(200);
    } finally {
        await daemon.stop(true);
    }
});

it("does not publish running while the Web listener is still being opened", async () => {
    const db = await openDatabase(join(harness.home, "web-delay.db"));
    const original: (
        this: Server,
        port: number,
        host: string,
        callback: () => void,
    ) => Server = Server.prototype.listen;
    let count = 0;
    let apiPort = 0;
    let observed = 0;
    const listener = vi
        .spyOn(Server.prototype, "listen")
        .mockImplementation(function (
            this: Server,
            port: number,
            host: string,
            callback: () => void,
        ) {
            if (++count === 2) {
                void fetch(`http://127.0.0.1:${apiPort}/api/status`)
                    .then((response) => {
                        observed = response.status;
                        original.call(this, port, host, callback);
                    })
                    .catch((error) => this.emit("error", error));
                return this;
            }
            return original.call(this, port, host, () => {
                apiPort = (this.address() as AddressInfo).port;
                callback();
            });
        } as Server["listen"]);
    try {
        const daemon = await startDaemon({
            db,
            ports: { daemon: 0, web: 0 },
            retentionDays: () => 30,
        });
        listener.mockRestore();
        try {
            expect(observed).toBe(503);
        } finally {
            await daemon.stop(true);
        }
    } finally {
        listener.mockRestore();
    }
});

it("closes both listeners when required startup recording rejects", async () => {
    const db = await openDatabase(join(harness.home, "failed-start.db"));
    let ports: { daemon: number; web: number } | undefined;
    try {
        await expect(
            startDaemon({
                db,
                ports: { daemon: 0, web: 0 },
                retentionDays: () => 30,
                onListening: async (bound) => {
                    ports = bound;
                    throw new Error("state write failed");
                },
            }),
        ).rejects.toThrow("state write failed");
        expect(ports).toBeDefined();
        for (const port of [ports!.daemon, ports!.web])
            await expect(
                fetch(`http://127.0.0.1:${port}/api/status`),
            ).rejects.toThrow();
    } finally {
        await db.close();
    }
});

it("reports a database close failure while preserving the listener-closed contract", async () => {
    const diagnostic = vi.spyOn(logger, "error").mockImplementation(() => {});
    const close = vi
        .spyOn(harness.daemon.services.db, "close")
        .mockRejectedValueOnce(new Error("db close injected"));
    const result = await harness.daemon.stop(true);
    await harness.daemon.closed;
    expect(result.stopped).toBe(true);
    expect(diagnostic).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        "Daemon database close failed after listeners closed",
    );
    await expect(fetch(harness.apiUrl("/api/status"))).rejects.toThrow();
    close.mockRestore();
    await harness.daemon.services.db.close();
});

it("removes startup ownership before releasing listeners even when database close is delayed", async () => {
    const db = await openDatabase(join(harness.home, "close-order.db"));
    let release!: () => void;
    let closing!: () => void;
    const closingDb = new Promise<void>((resolve) => {
        closing = resolve;
    });
    const wait = new Promise<void>((resolve) => {
        release = resolve;
    });
    const original = db.close.bind(db);
    db.close = async () => {
        closing();
        await wait;
        await original();
    };
    const stateFile = join(harness.home, "startup.json");
    await writeFile(stateFile, "old");
    const daemon = await startDaemon({
        db,
        ports: { daemon: 0, web: 0 },
        retentionDays: () => 30,
        onClosing: () => rm(stateFile),
    });
    const stopping = daemon.stop(true);
    try {
        await closingDb;
        await expect(readFile(stateFile)).rejects.toThrow();
        await expect(
            fetch(`http://127.0.0.1:${daemon.ports.daemon}/api/status`),
        ).rejects.toThrow();
        await writeFile(stateFile, "new");
    } finally {
        release();
        await stopping;
    }
    expect(await readFile(stateFile, "utf8")).toBe("new");
});

it("reports failed state cleanup and still closes its listeners", async () => {
    const db = await openDatabase(join(harness.home, "state-close.db"));
    const diagnostic = vi.spyOn(logger, "error").mockImplementation(() => {});
    const daemon = await startDaemon({
        db,
        ports: { daemon: 0, web: 0 },
        retentionDays: () => 30,
        onClosing: async () => {
            throw new Error("state cleanup injected");
        },
    });
    expect((await daemon.stop(true)).stopped).toBe(true);
    await daemon.closed;
    expect(diagnostic).toHaveBeenCalledWith(
        { err: expect.any(Error) },
        "Daemon state cleanup failed before listeners closed",
    );
    await expect(
        fetch(`http://127.0.0.1:${daemon.ports.daemon}/api/status`),
    ).rejects.toThrow();
});

async function borrowableShell() {
    const createTerminal = terminalModule.createTerminal;
    const spawn = vi
        .spyOn(terminalModule, "createTerminal")
        .mockImplementation((options) =>
            createTerminal({
                ...options,
                // A temporary cwd alone still loads the user's shell startup files.
                env: {
                    ...options.env,
                    HOME: harness.home,
                    ZDOTDIR: harness.home,
                },
            }),
        );
    try {
        const shell = await harness.daemon.createShell({ cwd: harness.home });
        const context = terminalContextFromEnv(
            spawn.mock.calls.at(-1)![0].env!,
        )!;
        return {
            shell,
            context,
            session: harness.daemon.services.terminals.get(shell.id)!,
        };
    } finally {
        spawn.mockRestore();
    }
}

async function joinAgent(networkId: string | null, name: string) {
    const vendor = fakeVendor();
    const registered = await harness.daemon.registerRuntime({
        name,
        networkId,
        createBinding: vendor.createBinding,
    });
    return { ...registered, vendor };
}

describe("daemon status", () => {
    it("protects reads, writes and MCP on both listeners while allowing the Web and CLI", async () => {
        for (const url of [harness.apiUrl, harness.webUrl]) {
            for (const path of [
                "/api/status",
                "/api/agents",
                "/api/notifications",
                "/mcp/n",
            ]) {
                const denied = await fetch(url(path), {
                    headers: { origin: "https://foreign.example" },
                });
                expect(denied.status).toBe(403);
            }
            const mutation = await fetch(url("/api/networks"), {
                method: "POST",
                headers: {
                    origin: "https://foreign.example",
                    "content-type": "text/plain",
                },
                body: JSON.stringify({
                    name: "unwanted",
                }),
            });
            expect(mutation.status).toBe(403);
            const native = await fetch(url("/api/status"));
            expect(native.status).toBe(200);
            const web = await fetch(url("/api/status"), {
                headers: { origin: harness.webUrl("") },
            });
            expect(web.status).toBe(200);
            const plain = await fetch(url("/api/networks"), {
                method: "POST",
                headers: { "content-type": "text/plain" },
                body: JSON.stringify({
                    name: "unwanted",
                }),
            });
            expect(plain.status).toBe(415);
        }
        expect(await harness.daemon.services.networks.list()).toEqual([]);
    });

    it("reports the ports it actually bound and what it is holding", async () => {
        const network = await harness.daemon.services.networks.create("n");
        await joinAgent(network.id, "a");

        const { status, body } = await call("/api/status");
        expect(status).toBe(200);
        const reported = body as DaemonStatus;
        expect(reported.ports).toEqual(harness.daemon.ports);
        expect(reported.pid).toBe(process.pid);
        expect(reported).toMatchObject({
            status: "running",
            runtimes: 1,
            networks: 1,
        });
    });

    it("answers on the web port too, so the page shares one origin", async () => {
        const response = await fetch(harness.webUrl("/api/status"));
        expect(response.status).toBe(200);
    });
});

describe("network administration", () => {
    it("creates, reads back and routes a persistent network", async () => {
        const created = await post("/api/networks", {
            name: "collab",
        });
        expect(created.status).toBe(201);
        expect(
            await post("/api/networks", {
                name: "collab",
            }),
        ).toMatchObject({
            status: 400,
            body: {
                code: "duplicate_name",
                message: "A network named 'collab' already exists",
            },
        });
        const network = created.body as NetworkView;
        expect(network).toMatchObject({
            name: "collab",
            scope: "persistent",
            routes: [],
        });

        const x = await joinAgent(network.id, "x");
        const y = await joinAgent(network.id, "y");
        const routed = await post(`/api/networks/${network.id}/route`, {
            operation: {
                kind: "between",
                action: "block",
                agents: ["x", "y"],
            },
        });
        expect(routed.status).toBe(200);
        expect((routed.body as NetworkView).routes).toHaveLength(2);
        expect((routed.body as NetworkView).routes).toEqual(
            expect.arrayContaining([
                {
                    from: x.runtimeId,
                    to: y.runtimeId,
                    fromName: "x",
                    toName: "y",
                },
                {
                    from: y.runtimeId,
                    to: x.runtimeId,
                    fromName: "y",
                    toName: "x",
                },
            ]),
        );
        const invalid = await post(`/api/networks/${network.id}/route`, {
            operation: {
                kind: "directed",
                action: "block",
                from: "x",
                to: ["y", "missing"],
            },
        });
        expect(invalid).toMatchObject({
            status: 400,
            body: {
                message:
                    "No participating agent 'missing' in Network 'collab'.",
            },
        });
        expect(invalid.body).not.toHaveProperty("code");
        expect(
            (await harness.daemon.services.networks.require(network.id)).routes,
        ).toEqual(
            (routed.body as NetworkView).routes.map(({ from, to }) => ({
                from,
                to,
            })),
        );

        // Reachable by name as well as by id.
        const byName = await call("/api/networks/collab");
        expect((byName.body as NetworkView).id).toBe(network.id);
    });

    it("rejects a routing call that cannot describe an edge", async () => {
        const network = (await post("/api/networks", { name: "n" }))
            .body as NetworkView;

        const bad = await post(`/api/networks/${network.id}/route`, {
            operation: { kind: "directed", action: "block", from: "a", to: [] },
        });
        expect(bad.status).toBe(400);
        expect(bad.body).toMatchObject({ code: "invalid_request" });
    });

    it("says which network is missing instead of inventing one", async () => {
        const missing = await call("/api/networks/nope");
        expect(missing.status).toBe(400);
        expect(missing.body).toEqual({ message: "No such network: nope" });
    });

    it("rejects Network deletion until participation cleanup completes", async () => {
        const { networks, runtimes, messages } = harness.daemon.services;
        const network = await networks.create("occupied");
        const a = await joinAgent(network.id, "a");
        const b = await joinAgent(network.id, "b");
        const source = runtimes.get(a.runtimeId)!;
        const rejected = await call("/api/networks/occupied", {
            method: "DELETE",
        });
        expect(rejected).toMatchObject({
            status: 400,
            body: {
                code: "network_in_use",
                message: expect.stringMatching(/participation.*first/i),
            },
        });
        expect(await networks.require(network.id)).toEqual(network);
        expect(runtimes.authenticate(a.token)).toBe(source);
        expect(a.vendor.stopped).toEqual([]);
        expect(b.vendor.stopped).toEqual([]);
        expect((await networks.reachable(source)).map((r) => r.id)).toContain(
            b.runtimeId,
        );
        await messages.send(source, [b.runtimeId], "still connected");
        expect(b.vendor.received).toHaveLength(1);
        await b.vendor.settle(b.vendor.deliveryIds[0]!, "completed");
        await harness.daemon.stopRuntime(b.runtimeId);
        const cleanup = vi
            .spyOn(source.binding, "stop")
            .mockRejectedValueOnce(new Error("cleanup failed"));
        await expect(harness.daemon.stopRuntime(a.runtimeId)).rejects.toThrow(
            "cleanup failed",
        );
        await expect(networks.delete(network.id)).rejects.toMatchObject({
            code: "network_in_use",
        });
        cleanup.mockRestore();
        await harness.daemon.stopRuntime(a.runtimeId);
        expect(
            await call(`/api/networks/${network.id}`, { method: "DELETE" }),
        ).toEqual({ status: 200, body: { deleted: true } });
        expect(await networks.find(network.id)).toBeUndefined();
        expect(await networks.reachable(source)).toEqual([]);
        await expect(
            messages.send(source, [b.runtimeId], "after leave"),
        ).rejects.toThrow(/left collaboration/);
    });

    it("protects a Network while registration is preparing and releases failed preparation", async () => {
        const { networks, runtimes } = harness.daemon.services;
        const network = await networks.create("preparing");
        let fail!: (error: Error) => void;
        const preparing = new Promise<never>((_, reject) => {
            fail = reject;
        });
        const createBinding = vi.fn(() => preparing);
        const registration = harness.daemon.registerRuntime({
            networkId: network.id,
            createBinding,
        });
        const result = registration.catch((error) => error);
        await vi.waitFor(() => expect(createBinding).toHaveBeenCalledOnce());
        expect(runtimes.inNetwork(network.id)).toHaveLength(1);
        try {
            await expect(networks.delete(network.id)).rejects.toMatchObject({
                code: "network_in_use",
            });
        } finally {
            fail(new Error("preparation failed"));
        }
        expect(await result).toMatchObject({ message: "preparation failed" });
        expect(runtimes.inNetwork(network.id)).toEqual([]);
        expect(await networks.delete(network.id)).toBe(true);
    });

    it.each([false, true])(
        "cleans routes after failed preparation and retains failed cleanup for retry (%s)",
        async (cleanupFails) => {
            const { networks, runtimes, db } = harness.daemon.services;
            const network = await networks.create("failed-preparation");
            const a = await joinAgent(network.id, "A");
            let fail!: (error: Error) => void;
            const preparing = new Promise<never>((_, reject) => {
                fail = reject;
            });
            const createBinding = vi.fn(() => preparing);
            const result = harness.daemon
                .registerRuntime({
                    name: "B",
                    networkId: network.id,
                    createBinding,
                })
                .catch((error) => error);
            await vi.waitFor(() =>
                expect(createBinding).toHaveBeenCalledOnce(),
            );
            const b = runtimes
                .inNetwork(network.id)
                .find((record) => record.name === "B")!;
            await networks.route(network.id, {
                kind: "between",
                action: "block",
                agents: ["A", "B"],
            });
            if (cleanupFails)
                vi.spyOn(db.networks, "replaceRouting").mockRejectedValueOnce(
                    new Error("cleanup failed"),
                );
            fail(new Error("preparation failed"));
            expect(await result).toBeInstanceOf(Error);
            if (cleanupFails) {
                expect(runtimes.get(b.id)?.collaborationActive).toBe(false);
                await expect(joinAgent(network.id, "B")).rejects.toMatchObject({
                    code: "duplicate_agent_name",
                });
                await harness.daemon.stopRuntime(b.id);
            }
            expect(runtimes.get(b.id)).toBeUndefined();
            expect((await networks.require(network.id)).routes).toEqual([]);
            expect(runtimes.get(a.runtimeId)).toBeDefined();
            expect((await joinAgent(network.id, "B")).runtimeId).not.toBe(b.id);
        },
    );

    it("does not create a binding revoked during Network validation", async () => {
        const { networks, runtimes } = harness.daemon.services;
        const network = await networks.create("revoked");
        let release!: () => void;
        const validation = new Promise<void>((resolve) => {
            release = resolve;
        });
        const requireNetwork = networks.require.bind(networks);
        vi.spyOn(networks, "require").mockImplementation(async (reference) => {
            await validation;
            return requireNetwork(reference);
        });
        const createBinding = vi.fn(fakeVendor().createBinding);
        const registration = harness.daemon.registerRuntime({
            networkId: network.id,
            createBinding,
        });
        const result = registration.catch((error) => error);
        const reserved = runtimes.inNetwork(network.id)[0]!;
        const stopping = harness.daemon.stopRuntime(reserved.id);
        release();
        expect(await result).toMatchObject({
            message: expect.stringMatching(/cancelled/),
        });
        await stopping;
        expect(createBinding).not.toHaveBeenCalled();
        expect(runtimes.inNetwork(network.id)).toEqual([]);
    });

    it("rejects registration when Network deletion was already queued", async () => {
        const { networks, runtimes, db } = harness.daemon.services;
        const network = await networks.create("deleting");
        const vendor = fakeVendor();
        const createBinding = vi.fn(vendor.createBinding);
        let registration!: ReturnType<typeof harness.daemon.registerRuntime>;
        const originalDelete = db.networks.delete;
        vi.spyOn(db.networks, "delete").mockImplementation((id) => {
            const deleted = originalDelete(id);
            registration = harness.daemon.registerRuntime({
                networkId: id,
                createBinding,
            });
            return deleted;
        });
        expect(await networks.delete(network.id)).toBe(true);
        await expect(registration).rejects.toMatchObject({
            message: `No such network: ${network.id}`,
        });
        expect(createBinding).not.toHaveBeenCalled();
        expect(runtimes.inNetwork(network.id)).toEqual([]);
    });

    it("keeps a deleted network's definition gone", async () => {
        const network = (await post("/api/networks", { name: "n" }))
            .body as NetworkView;
        expect(
            (await call(`/api/networks/${network.id}`, { method: "DELETE" }))
                .body,
        ).toEqual({ deleted: true });
        expect((await call("/api/networks")).body).toEqual([]);
    });
});

describe("agent listing", () => {
    it("creates a shell with no Agent identity and exposes it on both listeners", async () => {
        const created = await post("/api/terminals", {
            cwd: harness.home,
            cols: 80,
            rows: 24,
        });
        expect(created.status).toBe(201);
        expect(created.body).toMatchObject({
            cwd: harness.home,
            kind: "shell",
            alive: true,
        });
        const { id } = created.body as { id: string };
        expect((await call("/api/agents")).body).toEqual([]);
        expect((await call("/api/terminals")).body).toEqual([created.body]);
        const view = await fetch(harness.webUrl(`/api/terminals/${id}`));
        expect(await view.json()).toEqual(created.body);
        expect(
            (await call(`/api/terminals/${id}`, { method: "DELETE" })).body,
        ).toEqual({ deleted: true });
        expect((await call("/api/terminals")).body).toEqual([]);
        expect((await call("/api/status")).status).toBe(200);
    });

    it("rejects invalid shell inputs without spawning and protects the new API", async () => {
        for (const input of [
            null,
            { file: "sh" },
            { env: {} },
            { cols: 0 },
            { cwd: "" },
            { networkId: "n" },
        ]) {
            expect((await post("/api/terminals", input)).status).toBe(400);
        }
        const response = await fetch(harness.webUrl("/api/terminals"), {
            method: "POST",
            headers: {
                origin: "https://foreign.example",
                "content-type": "application/json",
            },
            body: "{}",
        });
        expect(response.status).toBe(403);
        expect(harness.daemon.services.terminals.list()).toEqual([]);
    });
    it("lists live runtimes and filters by network", async () => {
        const one = await harness.daemon.services.networks.create("one");
        const two = await harness.daemon.services.networks.create("two");
        await joinAgent(one.id, "a");
        await joinAgent(two.id, "b");

        expect((await call("/api/agents")).body as AgentView[]).toHaveLength(2);
        const filtered = (await call(`/api/agents?network=one`))
            .body as AgentView[];
        expect(filtered.map((view) => view.name)).toEqual(["a"]);
    });

    it("reports the daemon's own observation, not a self-declared status", async () => {
        const network = await harness.daemon.services.networks.create("n");
        const agent = await joinAgent(network.id, "a");
        agent.vendor.status("awaiting-user");

        // The same observed status is published to Web and MCP.
        const view = (await call(`/api/agents/${agent.runtimeId}`))
            .body as AgentView;
        expect(view.status).toBe("awaiting-user");
        expect(view.agentId).toBe(agent.runtimeId);
    });

    it("reports an ambiguous name with its candidates rather than guessing", async () => {
        const network = await harness.daemon.services.networks.create("n");
        await joinAgent(network.id, "twin");
        await expect(joinAgent(network.id, "twin")).rejects.toMatchObject({
            code: "duplicate_agent_name",
        });
        const other = await harness.daemon.services.networks.create("other");
        await joinAgent(other.id, "twin");

        const ambiguous = await call("/api/agents/twin");
        expect(ambiguous.status).toBe(409);
        expect(ambiguous.body).toEqual({
            code: "ambiguous_agent",
            message: "Several running agents match that name.",
            candidates: [
                { name: "twin", network: "n" },
                { name: "twin", network: "other" },
            ],
        });
    });
});

describe("stopping", () => {
    it.skipIf(process.platform === "win32")(
        "serializes stop checks, blocks new input and restores admission after rejection",
        async () => {
            const { daemon } = harness;
            let release!: (ids: string[]) => void;
            const pending = new Promise<string[]>((resolve) => {
                release = resolve;
            });
            const busy = vi
                .spyOn(daemon.services.terminals, "busy")
                .mockReturnValue(pending);
            const first = daemon.stop(false);
            expect(daemon.acceptingInput).toBe(false);
            await expect(daemon.createShell()).rejects.toThrow("stopping");
            await expect(joinAgent(null, "late")).rejects.toThrow("stopping");
            const second = daemon.stop(true);
            release(["busy-terminal"]);
            expect(await first).toMatchObject({
                stopped: false,
                blocking: [
                    "shell (working directory unavailable) [busy-terminal]",
                ],
            });
            expect(await second).toEqual(await first);
            expect(busy).toHaveBeenCalledTimes(1);
            expect(daemon.acceptingInput).toBe(true);
            expect((await call("/api/status")).status).toBe(200);
        },
    );

    it.skipIf(process.platform === "win32")(
        "preserves an admitted binding while a normal stop is checking blockers",
        async () => {
            const { daemon } = harness;
            let releaseBinding!: () => void;
            const ready = new Promise<void>((resolve) => {
                releaseBinding = resolve;
            });
            const stopped = vi.fn(async () => {});
            const registration = daemon.registerRuntime({
                name: "starting",
                networkId: null,
                createBinding: async () => {
                    await ready;
                    return { deliver: async () => {}, stop: stopped };
                },
            });
            let releaseCheck!: (ids: string[]) => void;
            vi.spyOn(daemon.services.terminals, "busy").mockReturnValue(
                new Promise((resolve) => {
                    releaseCheck = resolve;
                }),
            );
            const stopping = daemon.stop(false);
            releaseBinding();
            try {
                const registered = await registration;
                expect(
                    daemon.services.runtimes.authenticate(registered.token),
                ).toBeDefined();
                expect(stopped).not.toHaveBeenCalled();
            } finally {
                releaseCheck([]);
                await stopping;
            }
            expect(daemon.acceptingInput).toBe(true);
        },
    );

    it.skipIf(process.platform === "win32")(
        "closes idle shells normally and never falls back to killing a raced shell",
        async () => {
            const { daemon } = harness;
            const { session } = await borrowableShell();
            vi.spyOn(daemon.services.terminals, "busy").mockResolvedValue([]);
            const close = vi
                .spyOn(daemon.services.terminals, "closeIdle")
                .mockResolvedValueOnce(false);
            const kill = vi.spyOn(session, "kill");
            expect(await daemon.stop(false)).toMatchObject({
                stopped: false,
                warnings: [
                    expect.stringContaining(
                        "Could not confirm shell shutdown. Please check the shell.",
                    ),
                ],
            });
            expect(kill).not.toHaveBeenCalled();
            expect(session.alive).toBe(true);
            expect(daemon.acceptingInput).toBe(true);
            close.mockImplementationOnce(async () => {
                await session.kill();
                return true;
            });
            expect(await daemon.stop(false)).toMatchObject({ stopped: true });
            expect(close).toHaveBeenCalledTimes(2);
            expect(daemon.acceptingInput).toBe(false);
        },
    );

    it.skipIf(process.platform === "win32")(
        "restores input and admission when the busy check fails",
        async () => {
            const { daemon } = harness;
            vi.spyOn(daemon.services.terminals, "busy").mockRejectedValueOnce(
                new Error("query failed"),
            );
            await expect(daemon.stop(false)).rejects.toThrow("query failed");
            expect(daemon.acceptingInput).toBe(true);
            expect(await daemon.stop(false)).toMatchObject({ stopped: true });
        },
    );

    it("borrows one shell across fresh Runtime identities and keeps old delivery results with the old sender", async () => {
        const { daemon } = harness;
        const { shell, session, context } = await borrowableShell();
        const network = await daemon.services.networks.create("borrow");
        const vendor = fakeVendor();
        const a = await daemon.registerRuntime({
            name: "a",
            networkId: network.id,
            terminalContext: context,
            createBinding: vendor.createBinding,
        });
        expect(daemon.services.runtimes.get(a.runtimeId)?.terminalId).toBe(
            shell.id,
        );
        expect(daemon.services.terminals.list()).toHaveLength(1);
        const duplicate = fakeVendor();
        await expect(
            daemon.registerRuntime({
                networkId: null,
                terminalContext: context,
                createBinding: duplicate.createBinding,
            }),
        ).rejects.toThrow(/already/);
        const b = await joinAgent(network.id, "b");
        await daemon.services.networks.route(network.id, {
            kind: "directed",
            action: "block",
            from: b.runtimeId,
            to: [a.runtimeId],
        });
        const sent = await daemon.services.messages.send(
            daemon.services.runtimes.get(a.runtimeId)!,
            [b.runtimeId],
            "request X",
        );
        await daemon.stopRuntime(a.runtimeId);
        expect(session.alive).toBe(true);
        expect(daemon.services.runtimes.authenticate(a.token)).toBeUndefined();
        expect(
            (await daemon.services.networks.require(network.id)).routes,
        ).toEqual([]);
        const next = fakeVendor();
        const aPrime = await daemon.registerRuntime({
            name: "a",
            networkId: network.id,
            terminalContext: context,
            createBinding: next.createBinding,
        });
        expect(aPrime.runtimeId).not.toBe(a.runtimeId);
        expect(aPrime.token).not.toBe(a.token);
        await b.vendor.settle(b.vendor.deliveryIds[0]!, "completed");
        expect(next.received).toEqual([]);
        expect(
            (await daemon.services.db.messages.deliveriesFor(sent.messageId))[0]
                ?.outcome,
        ).toBe("completed");
        expect(daemon.services.terminals.list()).toHaveLength(1);
        await daemon.stopRuntime(aPrime.runtimeId);
        expect(session.alive).toBe(true);
    });

    it("keeps a borrowed shell after binding preparation fails", async () => {
        const { context, session } = await borrowableShell();
        await expect(
            harness.daemon.registerRuntime({
                networkId: null,
                terminalContext: context,
                createBinding: async () => {
                    throw new Error("not ready");
                },
            }),
        ).rejects.toThrow("not ready");
        expect(session.alive).toBe(true);
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
        expect(
            harness.daemon.services.terminals.authenticateContext(context) ===
                session,
        ).toBe(true);
    });

    it("cancels an Agent whose borrowed shell exits during preparation", async () => {
        const { context, session } = await borrowableShell();
        let release!: () => void;
        const preparing = new Promise<void>((resolve) => {
            release = resolve;
        });
        const stopped = vi.fn(async () => {});
        const registration = harness.daemon.registerRuntime({
            networkId: null,
            terminalContext: context,
            createBinding: async () => {
                await preparing;
                return { deliver: async () => {}, stop: stopped };
            },
        });
        const result = registration.catch((error: unknown) => error);
        await session.kill();
        release();
        expect(await result).toBeInstanceOf(Error);
        expect(stopped).toHaveBeenCalledTimes(1);
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
        expect((await call("/api/status")).status).toBe(200);
    });

    it("cleans the connected Agent on shell exit and interrupts only its pending requests", async () => {
        const { context, session } = await borrowableShell();
        const network = await harness.daemon.services.networks.create("exit");
        const source = await joinAgent(network.id, "source");
        const vendor = fakeVendor();
        const target = await harness.daemon.registerRuntime({
            networkId: network.id,
            terminalContext: context,
            createBinding: vendor.createBinding,
        });
        const sent = await harness.daemon.services.messages.send(
            harness.daemon.services.runtimes.get(source.runtimeId)!,
            [target.runtimeId],
            "pending",
        );
        // ConPTY drains output before emitting exit; observe that event before
        // timing the daemon's asynchronous registration/storage cleanup.
        const exited = new Promise<void>((resolve) => {
            session.subscribe({ data: () => {}, exit: () => resolve() });
        });
        session.write("exit\r");
        await exited;
        await vi.waitFor(() =>
            expect(
                harness.daemon.services.runtimes.get(target.runtimeId),
            ).toBeUndefined(),
        );
        expect(
            harness.daemon.services.runtimes.authenticate(target.token),
        ).toBeUndefined();
        expect(
            (
                await harness.daemon.services.db.messages.deliveriesFor(
                    sent.messageId,
                )
            )[0]?.outcome,
        ).toBe("interrupted");
        expect(source.vendor.received).toEqual([]);
        expect(harness.daemon.services.terminals.list()).toEqual([]);
        expect((await call("/api/status")).status).toBe(200);
    });

    it("keeps failed borrowed bindings and shell cleanup retryable", async () => {
        const { context, session, shell } = await borrowableShell();
        const stop = vi
            .fn(async () => {})
            .mockRejectedValueOnce(new Error("vendor alive"));
        const a = await harness.daemon.registerRuntime({
            networkId: null,
            terminalContext: context,
            createBinding: () => ({ deliver: async () => {}, stop }),
        });
        expect(
            (await post("/api/daemon/stop", { force: true })).body,
        ).toMatchObject({ code: "stop_incomplete" });
        expect(session.alive).toBe(true);
        expect(
            harness.daemon.services.runtimes.authenticate(a.token),
        ).toBeUndefined();
        expect(
            (await call(`/api/terminals/${shell.id}`, { method: "DELETE" }))
                .body,
        ).toEqual({ deleted: true });
        expect(stop).toHaveBeenCalledTimes(2);
        expect(session.alive).toBe(false);
        expect(
            harness.daemon.services.runtimes.authenticate(a.token),
        ).toBeUndefined();
    });

    it("reports a failed shell kill and retries it on the next force stop", async () => {
        const { session } = await borrowableShell();
        vi.spyOn(session, "kill").mockRejectedValueOnce(
            new Error("shell alive"),
        );
        expect(
            (await post("/api/daemon/stop", { force: true })).body,
        ).toMatchObject({ code: "stop_incomplete" });
        expect(session.alive).toBe(true);
        expect(harness.daemon.acceptingInput).toBe(true);
        expect((await post("/api/daemon/stop", { force: true })).status).toBe(
            200,
        );
        expect(session.alive).toBe(false);
    });

    it("rejects terminal ID-only claims and invalid contexts before building an Agent", async () => {
        const shell = await harness.daemon.createShell();
        const binding = vi.fn(fakeVendor().createBinding);
        await expect(
            harness.daemon.registerRuntime({
                networkId: null,
                terminalId: shell.id,
                createBinding: binding,
            }),
        ).rejects.toThrow(/context/);
        await expect(
            harness.daemon.registerRuntime({
                networkId: null,
                terminalContext: { terminalId: shell.id, token: "wrong" },
                createBinding: binding,
            }),
        ).rejects.toThrow();
        expect(binding).not.toHaveBeenCalled();
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
        expect(harness.daemon.services.terminals.get(shell.id)?.alive).toBe(
            true,
        );
    });
    it("blocks MCP sends and terminal creation while a binding is shutting down", async () => {
        let release!: () => void;
        let entered!: () => void;
        const pendingStop = new Promise<void>((resolve) => {
            release = resolve;
        });
        const enteredStop = new Promise<void>((resolve) => {
            entered = resolve;
        });
        const network = await harness.daemon.services.networks.create("n");
        const source = await harness.daemon.registerRuntime({
            networkId: network.id,
            createBinding: (controls) => {
                controls.setStatus("idle");
                return {
                    deliver: async () => {},
                    stop: () => {
                        entered();
                        return pendingStop;
                    },
                };
            },
        });
        const target = await joinAgent(network.id, "target");
        const stopping = harness.daemon.stop(true);
        await enteredStop;
        try {
            expect(harness.daemon.acceptingInput).toBe(false);
            expect(() => harness.daemon.createTerminal()).toThrow("stopping");
            const response = await fetch(harness.mcpUrl(network.id), {
                method: "POST",
                headers: {
                    authorization: `Bearer ${source.token}`,
                    "content-type": "application/json",
                    accept: "application/json, text/event-stream",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: 1,
                    method: "tools/call",
                    params: {
                        name: "send",
                        arguments: {
                            targets: ["target"],
                            content: "late",
                        },
                    },
                }),
            });
            expect(response.status).toBe(503);
            expect(target.vendor.received).toEqual([]);
        } finally {
            release();
            await stopping;
        }
    });

    it("waits for an already-starting binding and cleans it before completing force stop", async () => {
        let release!: () => void;
        const ready = new Promise<void>((resolve) => {
            release = resolve;
        });
        let stopped = 0;
        const registration = harness.daemon
            .registerRuntime({
                name: "starting",
                networkId: null,
                createBinding: async (controls) => {
                    await ready;
                    controls.setStatus("idle");
                    return {
                        deliver: async () => {},
                        stop: async () => {
                            stopped++;
                        },
                    };
                },
            })
            .then(
                () => "registered",
                () => "cancelled",
            );
        const stop = harness.daemon.stop(true);
        release();
        expect(await stop).toMatchObject({ stopped: true, warnings: [] });
        expect(stopped).toBe(1);
        expect(await registration).toBe("cancelled");
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
    });

    it("keeps serving after an incomplete force stop and retries only remaining executions", async () => {
        const finished = await joinAgent(null, "finished");
        let attempts = 0;
        const remaining = await harness.daemon.registerRuntime({
            name: "remaining",
            networkId: null,
            createBinding: (controls) => {
                controls.setStatus("idle");
                return {
                    deliver: async () => {},
                    stop: async () => {
                        if (++attempts === 1)
                            throw new Error("exit unconfirmed");
                    },
                };
            },
        });

        const first = await post("/api/daemon/stop", { force: true });
        expect(first.status).toBe(409);
        expect(first.body).toMatchObject({
            code: "stop_incomplete",
            runtimes: ["remaining"],
            warnings: ["runtime remaining: exit unconfirmed"],
        });
        expect((await call("/api/status")).status).toBe(200);
        expect(
            harness.daemon.services.runtimes.get(remaining.runtimeId),
        ).toBeDefined();
        expect(
            harness.daemon.services.runtimes.get(finished.runtimeId),
        ).toBeUndefined();

        expect((await post("/api/daemon/stop", { force: true })).status).toBe(
            200,
        );
        expect(attempts).toBe(2);
        expect(finished.vendor.stopped).toHaveLength(1);
        await harness.daemon.closed;
    });

    it.skipIf(process.platform === "win32")(
        "refuses a plain stop while an execution is registered, and keeps serving",
        async () => {
            const network = await harness.daemon.services.networks.create("n");
            await joinAgent(network.id, "busy");

            const refused = await post("/api/daemon/stop", {});
            expect(refused.status).toBe(409);
            expect(refused.body).toMatchObject({
                code: "active_runtimes",
                runtimes: ["busy"],
            });

            // Admission reopens: the daemon is still running.
            expect((await call("/api/status")).status).toBe(200);
            await joinAgent(network.id, "another");
            expect(
                (await call("/api/agents")).body as AgentView[],
            ).toHaveLength(2);
        },
    );

    it("allows a plain stop once nothing is running", async () => {
        const stopped = await post("/api/daemon/stop", {});
        expect(stopped.status).toBe(200);
        expect(stopped.body).toEqual({ stopped: true, forced: false });
        await harness.daemon.closed;
    });

    it("forces every execution down and drops its credential", async () => {
        const network = await harness.daemon.services.networks.create("n");
        const agent = await joinAgent(network.id, "busy");
        const shell = defaultShell();
        harness.daemon.createTerminal({ file: shell.file, args: shell.args });

        const forced = await post("/api/daemon/stop", { force: true });
        expect(forced.status).toBe(200);
        expect(forced.body).toEqual({ stopped: true, forced: true });
        expect(agent.vendor.stopped).toEqual(["stopped"]);
        expect(
            harness.daemon.services.runtimes.authenticate(agent.token),
        ).toBeUndefined();
        expect(harness.daemon.services.terminals.list()).toHaveLength(0);
        await harness.daemon.closed;
    });

    it("cleans up only what one stopped runtime owned", async () => {
        const network = await harness.daemon.services.networks.create("n");
        const going = await joinAgent(network.id, "going");
        const staying = await joinAgent(network.id, "staying");
        const third = await joinAgent(network.id, "third");
        const preserved = {
            from: staying.runtimeId,
            to: third.runtimeId,
        };
        await harness.daemon.services.db.networks.replaceRouting(network.id, {
            routes: [
                {
                    from: going.runtimeId,
                    to: staying.runtimeId,
                },
                {
                    from: third.runtimeId,
                    to: going.runtimeId,
                },
                preserved,
            ],
        });

        await harness.daemon.stopRuntime(going.runtimeId);

        expect(
            harness.daemon.services.runtimes.authenticate(going.token),
        ).toBeUndefined();
        expect(
            harness.daemon.services.runtimes.authenticate(staying.token),
        ).toBeDefined();
        // The persistent definition survives its members leaving.
        expect(await harness.daemon.services.networks.find("n")).toEqual({
            ...network,
            routes: [preserved],
        });
    });

    it("does not register a new execution once a forced stop began", async () => {
        const network = await harness.daemon.services.networks.create("n");
        const stopping = harness.daemon.stop(true);
        await expect(joinAgent(network.id, "late")).rejects.toThrow(/stopping/);
        await stopping;
    });

    it("can stop a runtime after its Network was deleted directly from storage", async () => {
        const network =
            await harness.daemon.services.networks.create("deleted");
        const agent = await joinAgent(network.id, "a");
        expect(
            await harness.daemon.services.db.networks.delete(network.id),
        ).toBe(true);
        await harness.daemon.stopRuntime(agent.runtimeId);
        expect(
            harness.daemon.services.runtimes.authenticate(agent.token),
        ).toBeUndefined();
    });

    it("keeps route cleanup failure retryable through daemon force stop", async () => {
        const { db, networks, runtimes } = harness.daemon.services;
        const network = await networks.create("retry-routes");
        const agent = await joinAgent(network.id, "a");
        await joinAgent(network.id, "b");
        await networks.route(network.id, {
            kind: "directed",
            action: "block",
            from: agent.runtimeId,
            to: ["b"],
        });
        const before = await networks.require(network.id);
        const replace = vi
            .spyOn(db.networks, "replaceRouting")
            .mockRejectedValueOnce(new Error("route write failed"));
        try {
            const first = await post("/api/daemon/stop", { force: true });
            expect(first.status).toBe(409);
            expect(first.body).toMatchObject({
                code: "stop_incomplete",
                warnings: ["runtime a: route write failed"],
            });
            expect(runtimes.authenticate(agent.token)).toBeUndefined();
            expect(runtimes.get(agent.runtimeId)?.collaborationActive).toBe(
                false,
            );
            // The other endpoint cleaned the shared edge; the failed runtime
            // still retains its registration until its own cleanup succeeds.
            expect(await networks.require(network.id)).toEqual({
                ...before,
                routes: [],
            });

            expect(
                (await post("/api/daemon/stop", { force: true })).status,
            ).toBe(200);
            expect(runtimes.authenticate(agent.token)).toBeUndefined();
            await harness.daemon.closed;
        } finally {
            replace.mockRestore();
        }
    });
});

describe("notifications endpoint", () => {
    it("lists unread notices and clears them when they are read", async () => {
        const network = await harness.daemon.services.networks.create("n");
        const a = await joinAgent(network.id, "a");
        const b = await joinAgent(network.id, "b");
        await post(`/api/networks/${network.id}/route`, {
            operation: {
                kind: "directed",
                action: "block",
                from: b.runtimeId,
                to: [a.runtimeId],
            },
        });
        await harness.daemon.services.messages.send(
            harness.daemon.services.runtimes.get(a.runtimeId)!,
            [b.runtimeId],
            "one-way work",
        );
        await b.vendor.settle(b.vendor.deliveryIds[0]!, "completed");

        const listed = (await call("/api/notifications?unread=1"))
            .body as NotificationView[];
        expect(listed).toHaveLength(1);
        expect(listed[0]!.readAt).toBeNull();

        expect((await post("/api/notifications/read", {})).body).toEqual({
            read: 1,
        });
        expect((await call("/api/notifications?unread=1")).body).toEqual([]);
        // Reading is not resolving: marking twice does not invent more.
        expect((await post("/api/notifications/read", {})).body).toEqual({
            read: 0,
        });
    });
});

describe("history retention", () => {
    it("purges a finished request once the configured window passes, and keeps one still running", async () => {
        const day = 86_400_000;
        let clock = Date.UTC(2026, 0, 1);
        const short = await startTestDaemon({
            retentionDays: 7,
            now: () => clock,
        });
        try {
            const network = await short.daemon.services.networks.create("n");
            const registerVendor = async (name: string) => {
                const vendor = fakeVendor();
                const registered = await short.daemon.registerRuntime({
                    name,
                    networkId: network.id,
                    createBinding: vendor.createBinding,
                });
                return { ...registered, vendor };
            };
            const a = await registerVendor("a");
            const b = await registerVendor("b");
            const c = await registerVendor("c");
            const source = short.daemon.services.runtimes.get(a.runtimeId)!;

            const finished = await short.daemon.services.messages.send(
                source,
                [b.runtimeId],
                "finished",
            );
            await b.vendor.settle(b.vendor.deliveryIds[0]!, "completed");
            const running = await short.daemon.services.messages.send(
                source,
                [c.runtimeId],
                "still running",
            );

            clock += 8 * day;
            const purged = await short.daemon.services.db.messages.purgeBefore(
                clock - 7 * day,
            );
            expect(purged.messages).toBe(1);
            expect(
                await short.daemon.services.db.messages.deliveriesFor(
                    finished.messageId,
                ),
            ).toEqual([]);
            expect(
                await short.daemon.services.db.messages.deliveriesFor(
                    running.messageId,
                ),
            ).toHaveLength(1);
            // Definitions are not history.
            expect(
                await short.daemon.services.networks.find("n"),
            ).toBeDefined();
        } finally {
            await short.close();
        }
    });
});

describe("execution ownership", () => {
    it("explicit force stop releases external collaboration without stopping its execution", async () => {
        const events: string[] = [];
        const agent = await harness.daemon.registerRuntime({
            networkId: null,
            executionOwnership: "external",
            createBinding: () => ({
                deliver: async () => {},
                stop: async () => {
                    events.push("stop");
                },
                cleanup: async () => {
                    events.push("cleanup");
                },
            }),
        });
        expect(await harness.daemon.stop(true)).toMatchObject({
            stopped: true,
        });
        expect(events).toEqual(["cleanup"]);
        expect(
            harness.daemon.services.runtimes.authenticate(agent.token),
        ).toBeUndefined();
    });

    it("plain stop releases external sessions without stopping their execution", async () => {
        const stop = vi.fn(async () => {});
        await harness.daemon.registerRuntime({
            networkId: null,
            executionOwnership: "external",
            name: "external",
            createBinding: (controls) => {
                controls.setStatus("idle");
                return { deliver: async () => {}, stop };
            },
        });
        expect(await harness.daemon.stop(false)).toMatchObject({
            stopped: true,
        });
        expect(stop).not.toHaveBeenCalled();
    });

    it("Windows plain stop releases external collaboration without a busy query", async () => {
        vi.spyOn(process, "platform", "get").mockReturnValue("win32");
        const busy = vi.spyOn(harness.daemon.services.terminals, "busy");
        const stop = vi.fn(async () => {});
        await harness.daemon.registerRuntime({
            networkId: null,
            executionOwnership: "external",
            createBinding: () => ({ deliver: async () => {}, stop }),
        });
        expect(await harness.daemon.stop(false)).toMatchObject({
            stopped: true,
        });
        expect(busy).not.toHaveBeenCalled();
        expect(stop).not.toHaveBeenCalled();
    });

    it("revokes collaboration immediately and retains failed cleanup for retry", async () => {
        const stop = vi.fn(async () => {});
        const cleanup = vi
            .fn()
            .mockRejectedValueOnce(new Error("cleanup failed"))
            .mockResolvedValue(undefined);
        const agent = await harness.daemon.registerRuntime({
            networkId: null,
            executionOwnership: "external",
            createBinding: (controls) => {
                controls.setStatus("idle");
                return { deliver: async () => {}, stop, cleanup };
            },
        });
        await expect(
            harness.daemon.stopRuntime(agent.runtimeId),
        ).rejects.toThrow("cleanup failed");
        const { runtimes } = harness.daemon.services;
        expect(runtimes.authenticate(agent.token)).toBeUndefined();
        expect(runtimes.get(agent.runtimeId)?.collaborationActive).toBe(false);
        expect((await call("/api/agents")).body).toEqual([]);
        expect((await call(`/api/agents/${agent.runtimeId}`)).status).toBe(404);
        expect(await harness.daemon.stop(true)).toMatchObject({
            stopped: true,
        });
        expect(cleanup).toHaveBeenCalledTimes(2);
        expect(stop).not.toHaveBeenCalled();
    });
});

describe("external registration boundaries", () => {
    it("rejects an external runtime borrowing a daemon shell", async () => {
        const { context } = await borrowableShell();
        await expect(
            harness.daemon.registerRuntime({
                networkId: null,
                executionOwnership: "external",
                terminalContext: context,
                createBinding: fakeVendor().createBinding,
            }),
        ).rejects.toThrow("External executions");
    });
    it("waits for an external preparation during explicit force stop", async () => {
        let release!: () => void;
        const preparing = new Promise<void>((resolve) => {
            release = resolve;
        });
        const stop = vi.fn(async () => {});
        const cleanup = vi.fn(async () => {});
        const registration = harness.daemon
            .registerRuntime({
                networkId: null,
                executionOwnership: "external",
                createBinding: async () => {
                    await preparing;
                    return { deliver: async () => {}, stop, cleanup };
                },
            })
            .catch((error: unknown) => error);
        const stopping = harness.daemon.stop(true);
        release();
        expect(await stopping).toMatchObject({ stopped: true });
        expect(await registration).toBeInstanceOf(Error);
        expect(stop).not.toHaveBeenCalled();
        expect(cleanup).toHaveBeenCalledOnce();
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
    });
});

describe("external collaboration stop completion", () => {
    it.each([false, true])(
        "force joins pending external cleanup and preserves failures (fail=%s)",
        async (fail) => {
            let release!: () => void;
            let entered!: () => void;
            const waiting = new Promise<void>((resolve) => {
                release = resolve;
            });
            const started = new Promise<void>((resolve) => {
                entered = resolve;
            });
            const stop = vi.fn(async () => {});
            const cleanup = vi
                .fn()
                .mockImplementationOnce(async () => {
                    entered();
                    await waiting;
                    if (fail) throw new Error("external cleanup failed");
                })
                .mockResolvedValue(undefined);
            const agent = await harness.daemon.registerRuntime({
                networkId: null,
                executionOwnership: "external",
                createBinding: () => ({
                    deliver: async () => {},
                    stop,
                    cleanup,
                }),
            });
            const released = harness.daemon
                .stopRuntime(agent.runtimeId)
                .catch((error: unknown) => error);
            await started;
            let finished = false;
            const stopping = harness.daemon.stop(true).then((result) => {
                finished = true;
                return result;
            });
            try {
                await new Promise<void>((resolve) => setImmediate(resolve));
                expect(finished).toBe(false);
                expect(
                    harness.daemon.services.runtimes.authenticate(agent.token),
                ).toBeUndefined();
                release();
                await released;
                expect(await stopping).toMatchObject({ stopped: !fail });
                expect(stop).not.toHaveBeenCalled();
                expect(cleanup).toHaveBeenCalledOnce();
                if (fail) {
                    expect(
                        harness.daemon.services.runtimes.get(agent.runtimeId),
                    ).toBeDefined();
                    expect(await harness.daemon.stop(true)).toMatchObject({
                        stopped: true,
                    });
                    expect(cleanup).toHaveBeenCalledTimes(2);
                }
                expect(harness.daemon.services.runtimes.list()).toEqual([]);
            } finally {
                release();
            }
        },
    );

    it.each(["darwin", "linux", "win32"] as const)(
        "normal and force stop respect ownership on %s",
        async (platform) => {
            vi.spyOn(process, "platform", "get").mockReturnValue(platform);
            const externalStop = vi.fn(async () => {});
            const externalCleanup = vi.fn(async () => {});
            const external = await harness.daemon.registerRuntime({
                name: "external",
                networkId: null,
                executionOwnership: "external",
                createBinding: (controls) => {
                    controls.setStatus("working");
                    return {
                        deliver: async () => {},
                        stop: externalStop,
                        cleanup: externalCleanup,
                    };
                },
            });
            const owned = await joinAgent(null, "web-or-host");
            const busy = vi
                .spyOn(harness.daemon.services.terminals, "busy")
                .mockResolvedValue([]);
            const normal = await harness.daemon.stop(false);
            if (platform === "win32") {
                expect(normal).toMatchObject({ stopped: true });
                expect(busy).not.toHaveBeenCalled();
            } else {
                expect(normal).toMatchObject({
                    stopped: false,
                    blocking: ["web-or-host"],
                });
                expect(externalCleanup).not.toHaveBeenCalled();
                expect(
                    harness.daemon.services.runtimes.authenticate(
                        external.token,
                    ),
                ).toBeDefined();
                expect(await harness.daemon.stop(true)).toMatchObject({
                    stopped: true,
                });
            }
            expect(owned.vendor.stopped).toHaveLength(1);
            expect(externalStop).not.toHaveBeenCalled();
            expect(externalCleanup).toHaveBeenCalledOnce();
        },
    );
});

it("keeps storage and listeners open after outcome persistence blocks stop, then retries the original result", async () => {
    const { daemon } = harness;
    const network = await daemon.services.networks.create("storage");
    const a = await joinAgent(network.id, "A");
    const b = await joinAgent(network.id, "B");
    const sent = await daemon.services.messages.send(
        daemon.services.runtimes.get(a.runtimeId)!,
        [b.runtimeId],
        "X",
    );
    const sqlite = new DatabaseSync(join(harness.home, ".aiox", "aiox.db"));
    try {
        sqlite.exec(`CREATE TRIGGER reject_notification BEFORE INSERT ON notifications
            BEGIN SELECT RAISE(ABORT, 'notification unavailable'); END`);
        await expect(
            b.vendor.settle(
                b.vendor.deliveryIds[0]!,
                "failed",
                "vendor failure",
            ),
        ).resolves.toBeUndefined();
        const stopping = await post("/api/daemon/stop", { force: true });
        expect(stopping.status).toBe(409);
        expect(stopping.body).toMatchObject({ code: "stop_incomplete" });
        expect(JSON.stringify(stopping.body)).toContain(
            "notification unavailable",
        );
        expect(daemon.acceptingInput).toBe(true);
        expect((await call("/api/agents")).status).toBe(200);
        expect(
            await daemon.services.db.messages.deliveryFor(
                sent.messageId,
                b.runtimeId,
            ),
        ).toMatchObject({ outcome: null });
        expect(daemon.services.messages.pending()).toBe(1);
        sqlite.exec("DROP TRIGGER reject_notification");
        expect((await post("/api/daemon/stop", { force: true })).status).toBe(
            200,
        );
        await daemon.closed;
        expect(
            sqlite
                .prepare(
                    "SELECT outcome, outcome_error FROM deliveries WHERE message_id = ?",
                )
                .get(sent.messageId),
        ).toMatchObject({ outcome: "failed", outcome_error: "vendor failure" });
        expect(
            sqlite.prepare("SELECT COUNT(*) AS count FROM notifications").get(),
        ).toMatchObject({ count: 1 });
    } finally {
        sqlite.exec("DROP TRIGGER IF EXISTS reject_notification");
        sqlite.close();
    }
});

it("keeps Web notifications scoped to their original daemon terminal after unregistering", async () => {
    const { context, shell } = await borrowableShell();
    const network = await harness.daemon.services.networks.create("web-scope");
    const origin = await harness.daemon.registerRuntime({
        networkId: network.id,
        terminalContext: context,
        createBinding: fakeVendor().createBinding,
    });
    const external = await harness.daemon.registerRuntime({
        networkId: network.id,
        executionOwnership: "external",
        createBinding: fakeVendor().createBinding,
    });
    const target = await joinAgent(network.id, "target");
    const webAgents = await call("/api/web/agents");
    expect(webAgents.status).toBe(200);
    expect((webAgents.body as AgentView[]).map((row) => row.agentId)).toContain(
        origin.runtimeId,
    );
    expect((webAgents.body as AgentView[]).map((row) => row.agentId)).toContain(
        external.runtimeId,
    );
    expect(
        ((await call("/api/agents")).body as AgentView[]).map(
            (row) => row.agentId,
        ),
    ).toContain(external.runtimeId);
    for (const runtimeId of [origin.runtimeId, external.runtimeId]) {
        await harness.daemon.services.messages.send(
            harness.daemon.services.runtimes.get(runtimeId)!,
            [target.runtimeId],
            "work",
        );
    }
    await harness.daemon.stopRuntime(origin.runtimeId);
    await harness.daemon.stopRuntime(external.runtimeId);
    for (const id of target.vendor.deliveryIds)
        await target.vendor.settle(id, "failed", "failed work");
    const all = (await call("/api/notifications")).body as NotificationView[];
    expect(all).toHaveLength(2);
    const scoped = await call("/api/web/notifications?unread=true");
    expect(scoped.status).toBe(200);
    expect(scoped.body).toEqual([
        expect.objectContaining({
            originRuntimeId: origin.runtimeId,
            terminalId: shell.id,
        }),
    ]);
    const ids = all.map((row) => row.id);
    expect((await post("/api/web/notifications/read", { ids })).body).toEqual({
        read: 1,
    });
    expect((await call("/api/web/notifications")).body).toEqual([]);
    expect((await call("/api/notifications")).body).toEqual([
        expect.objectContaining({ originRuntimeId: external.runtimeId }),
    ]);
});

it("streams initial and changed application state, reconnects, and closes with daemon", async () => {
    const first = await openTestApplication(harness);
    expect((await first.next()).type).toBe("snapshot");
    const vendor = fakeVendor();
    const agent = await harness.daemon.registerRuntime({
        networkId: null,
        createBinding: vendor.createBinding,
    });
    expect((await first.next()).type).toBe("delta");
    await first.close();
    const second = await openTestApplication(harness);
    expect((await second.next()).type).toBe("snapshot");
    vendor.status("working");
    expect((await second.next()).type).toBe("delta");
    await harness.daemon.stopRuntime(agent.runtimeId);
    expect((await second.next()).type).toBe("delta");
    const end = second.next().then(
        () => false,
        () => true,
    );
    expect((await harness.daemon.stop(true)).stopped).toBe(true);
    expect(await end).toBe(true);
    await second.close();
});

it("publishes shell exit and committed notifications but no changes for no-op reads", async () => {
    const network = await harness.daemon.services.networks.create("events");
    const origin = await joinAgent(network.id, "origin");
    const target = await joinAgent(network.id, "target");
    const rpc = await openTestApplication(harness);
    await rpc.next();
    try {
        const { session } = await borrowableShell();
        await vi.waitFor(() => expect(rpc.observed.length).toBe(2));
        session.write("exit\r");
        await vi.waitFor(() => expect(session.alive).toBe(false), {
            timeout: 3000,
        });
        await vi.waitFor(() => expect(rpc.observed.length).toBe(3));
        await harness.daemon.services.messages.send(
            harness.daemon.services.runtimes.get(origin.runtimeId)!,
            [target.runtimeId],
            "event",
        );
        await vi.waitFor(() =>
            expect(rpc.observed.length).toBeGreaterThanOrEqual(4),
        );
        const beforeSettle = rpc.observed.length;
        await target.vendor.settle(
            target.vendor.deliveryIds[0]!,
            "failed",
            "event failure",
        );
        await vi.waitFor(() =>
            expect(rpc.observed.length).toBeGreaterThan(beforeSettle),
        );
        const unread = (await call("/api/web/notifications"))
            .body as NotificationView[];
        expect(unread).toHaveLength(1);
        const beforeRead = rpc.observed.length;
        expect(
            (
                await post("/api/web/notifications/read", {
                    ids: [unread[0]!.id],
                })
            ).body,
        ).toEqual({ read: 1 });
        await vi.waitFor(() =>
            expect(rpc.observed.length).toBe(beforeRead + 1),
        );
        expect(
            (
                await post("/api/web/notifications/read", {
                    ids: [unread[0]!.id],
                })
            ).body,
        ).toEqual({ read: 0 });
        expect(rpc.observed.length).toBe(beforeRead + 1);
    } finally {
        await rpc.close();
    }
});

it("keeps external-only runtime and notification changes off the application stream", async () => {
    const network =
        await harness.daemon.services.networks.create("external-events");
    const web = await joinAgent(network.id, "web");
    const rpc = await openTestApplication(harness);
    await rpc.next();
    try {
        const originVendor = fakeVendor();
        const targetVendor = fakeVendor();
        const origin = await harness.daemon.registerRuntime({
            networkId: network.id,
            executionOwnership: "external",
            createBinding: originVendor.createBinding,
        });
        const target = await harness.daemon.registerRuntime({
            networkId: network.id,
            executionOwnership: "external",
            createBinding: targetVendor.createBinding,
        });
        originVendor.status("working");
        await harness.daemon.services.messages.send(
            harness.daemon.services.runtimes.get(origin.runtimeId)!,
            [target.runtimeId],
            "external",
        );
        await targetVendor.settle(targetVendor.deliveryIds[0]!, "failed");
        expect((await post("/api/notifications/read", {})).body).toEqual({
            read: 1,
        });
        await harness.daemon.stopRuntime(origin.runtimeId);
        expect((await call("/api/web/notifications")).body).toEqual([]);
        await vi.waitFor(() =>
            expect(
                rpc.observed.some(
                    (event) =>
                        event.type === "delta" &&
                        event.changes.some(
                            (change) =>
                                change.resource === "agent" &&
                                change.id === origin.runtimeId &&
                                change.action === "remove",
                        ),
                ),
            ).toBe(true),
        );
        const externalChanges = rpc.observed
            .filter((event) => event.type === "delta")
            .flatMap((event) => event.changes);
        expect(externalChanges.map((change) => change.resource)).toEqual(
            expect.arrayContaining(["agent"]),
        );
        expect(
            externalChanges.every((change) => change.resource === "agent"),
        ).toBe(true);
        expect(externalChanges.map((change) => change.id)).toContain(
            target.runtimeId,
        );
        const beforeWebNotification = rpc.observed.length;
        await harness.daemon.services.messages.send(
            harness.daemon.services.runtimes.get(web.runtimeId)!,
            [target.runtimeId],
            "visible",
        );
        await targetVendor.settle(targetVendor.deliveryIds[1]!, "failed");
        await vi.waitFor(() =>
            expect(
                rpc.observed.some(
                    (event) =>
                        event.type === "delta" &&
                        event.changes.some(
                            (change) =>
                                change.resource === "notification" &&
                                change.action === "upsert" &&
                                change.value.originRuntimeId === web.runtimeId,
                        ),
                ),
            ).toBe(true),
        );
        expect(rpc.observed.length).toBeGreaterThan(beforeWebNotification);
        expect((await call("/api/web/notifications")).body).toEqual([
            expect.objectContaining({ originRuntimeId: web.runtimeId }),
        ]);
    } finally {
        await rpc.close();
    }
});

it("reopening a daemon preserves Network definitions but discards past execution routes", async () => {
    const path = join(harness.home, "reopen-routes.db");
    const seed = await openDatabase(path);
    await seed.networks.create({
        id: "w1",
        name: "w1",
    });
    await seed.networks.replaceRouting("w1", {
        routes: [{ from: "past-a", to: "past-b" }],
    });
    await seed.close();
    const daemon = await startDaemon({
        db: await openDatabase(path),
        ports: { daemon: 0, web: 0 },
        retentionDays: () => 30,
    });
    try {
        expect(await daemon.services.networks.require("w1")).toEqual({
            id: "w1",
            name: "w1",
            routes: [],
        });
        expect(daemon.services.runtimes.list()).toEqual([]);
    } finally {
        await daemon.stop(true);
    }
});

it("keeps the daemon and database open on outcome drain failure and resumes central retries", async () => {
    const { daemon } = harness;
    const network = await daemon.services.networks.create("retry-stop");
    const a = await joinAgent(network.id, "A");
    const b = await joinAgent(network.id, "B");
    const source = daemon.services.runtimes.get(a.runtimeId)!;
    const sent = await daemon.services.messages.send(
        source,
        [b.runtimeId],
        "work",
    );
    const id = sent.results[0]!.deliveryId!;
    const write = vi
        .spyOn(daemon.services.db.messages, "settle")
        .mockRejectedValue(new Error("disk full"));
    const close = vi.spyOn(daemon.services.db, "close");
    await b.vendor.settle(id, "completed");
    const stopped = await post("/api/daemon/stop", { force: true });
    expect(stopped.status).toBe(409);
    expect(stopped.body).toMatchObject({ code: "stop_incomplete" });
    expect(JSON.stringify(stopped.body)).toContain("disk full");
    expect(close).not.toHaveBeenCalled();
    expect(daemon.services.runtimes.list()).toEqual([]);
    expect((await call("/api/status")).status).toBe(200);
    write.mockRestore();
    await vi.waitFor(
        async () =>
            expect(
                await daemon.services.db.messages.delivery(id),
            ).toMatchObject({ outcome: "completed" }),
        { timeout: 3000 },
    );
    expect(daemon.services.messages.pending()).toBe(0);
    expect((await post("/api/daemon/stop", { force: true })).status).toBe(200);
});
