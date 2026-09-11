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

import type { DaemonHarness } from "@/testing";
import { fakeVendor, startTestDaemon } from "@/testing";

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

function borrowableShell() {
    const spawn = vi.spyOn(terminalModule, "createTerminal");
    const shell = harness.daemon.createShell({ cwd: harness.home });
    const context = terminalContextFromEnv(spawn.mock.calls.at(-1)![0].env!)!;
    spawn.mockRestore();
    return {
        shell,
        context,
        session: harness.daemon.services.terminals.get(shell.id)!,
    };
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
                    defaultPolicy: "allow",
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
                    defaultPolicy: "allow",
                }),
            });
            expect(plain.status).toBe(415);
        }
        expect(await harness.daemon.services.networks.list()).toEqual([]);
    });

    it("reports the ports it actually bound and what it is holding", async () => {
        const network = await harness.daemon.services.networks.create(
            "n",
            "allow",
        );
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
            defaultPolicy: "deny",
        });
        expect(created.status).toBe(201);
        const network = created.body as NetworkView;
        expect(network).toMatchObject({
            name: "collab",
            scope: "persistent",
            defaultPolicy: "deny",
            routes: [],
        });

        const routed = await post(`/api/networks/${network.id}/route`, {
            operation: {
                kind: "between",
                policy: "allow",
                agents: ["x", "y"],
            },
        });
        expect((routed.body as NetworkView).routes).toHaveLength(2);

        // Reachable by name as well as by id.
        const byName = await call("/api/networks/collab");
        expect((byName.body as NetworkView).id).toBe(network.id);
    });

    it("rejects a routing call that cannot describe an edge", async () => {
        const network = (
            await post("/api/networks", { name: "n", defaultPolicy: "allow" })
        ).body as NetworkView;

        const bad = await post(`/api/networks/${network.id}/route`, {
            operation: { kind: "directed", policy: "allow", from: "a", to: [] },
        });
        expect(bad.status).toBe(400);
        expect(bad.body).toMatchObject({ code: "invalid_request" });
    });

    it("says which network is missing instead of inventing one", async () => {
        const missing = await call("/api/networks/nope");
        expect(missing.status).toBe(400);
        expect(missing.body).toMatchObject({ code: "unknown_network" });
    });

    it("keeps a deleted network's definition gone", async () => {
        const network = (
            await post("/api/networks", { name: "n", defaultPolicy: "allow" })
        ).body as NetworkView;
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
        expect((await post("/api/daemon/stop", {})).status).toBe(409);
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
        const one = await harness.daemon.services.networks.create(
            "one",
            "allow",
        );
        const two = await harness.daemon.services.networks.create(
            "two",
            "allow",
        );
        await joinAgent(one.id, "a");
        await joinAgent(two.id, "b");

        expect((await call("/api/agents")).body as AgentView[]).toHaveLength(2);
        const filtered = (await call(`/api/agents?network=one`))
            .body as AgentView[];
        expect(filtered.map((view) => view.name)).toEqual(["a"]);
    });

    it("reports the daemon's own observation, not a self-declared status", async () => {
        const network = await harness.daemon.services.networks.create(
            "n",
            "allow",
        );
        const agent = await joinAgent(network.id, "a");
        agent.vendor.activity("awaiting-user");

        // The Web keeps the detail that MCP summarises away as "working".
        const view = (await call(`/api/agents/${agent.runtimeId}`))
            .body as AgentView;
        expect(view.activity).toBe("awaiting-user");
        expect(view.agentId).toBe(agent.runtimeId);
    });

    it("reports an ambiguous name with its candidates rather than guessing", async () => {
        const network = await harness.daemon.services.networks.create(
            "n",
            "allow",
        );
        await joinAgent(network.id, "twin");
        await joinAgent(network.id, "twin");

        const ambiguous = await call("/api/agents/twin");
        expect(ambiguous.status).toBe(409);
        expect(ambiguous.body).toMatchObject({ code: "ambiguous_agent" });
    });
});

describe("stopping", () => {
    it("borrows one shell across fresh Runtime identities and keeps old delivery results with the old sender", async () => {
        const { daemon } = harness;
        const { shell, session, context } = borrowableShell();
        const network = await daemon.services.networks.create("borrow", "deny");
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
            from: a.runtimeId,
            to: [b.runtimeId],
            policy: "allow",
        });
        const sent = await daemon.services.messages.send(
            daemon.services.runtimes.get(a.runtimeId)!,
            [b.runtimeId],
            "request X",
        );
        await daemon.stopRuntime(a.runtimeId, false);
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
        await daemon.stopRuntime(aPrime.runtimeId, true);
        expect(session.alive).toBe(true);
    });

    it("keeps a borrowed shell after binding preparation fails", async () => {
        const { context, session } = borrowableShell();
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
        const { context, session } = borrowableShell();
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
        const { context, session } = borrowableShell();
        const network = await harness.daemon.services.networks.create(
            "exit",
            "allow",
        );
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
        const { context, session, shell } = borrowableShell();
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
        const { session } = borrowableShell();
        vi.spyOn(session, "kill").mockRejectedValueOnce(
            new Error("shell alive"),
        );
        expect(
            (await post("/api/daemon/stop", { force: true })).body,
        ).toMatchObject({ code: "stop_incomplete" });
        expect(session.alive).toBe(true);
        expect((await post("/api/daemon/stop", { force: true })).status).toBe(
            200,
        );
        expect(session.alive).toBe(false);
    });

    it("rejects terminal ID-only claims and invalid contexts before building an Agent", async () => {
        const shell = harness.daemon.createShell();
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
        const network = await harness.daemon.services.networks.create(
            "n",
            "allow",
        );
        const source = await harness.daemon.registerRuntime({
            networkId: network.id,
            createBinding: (controls) => {
                controls.setActivity("idle");
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
                            targets: [target.runtimeId],
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
                    controls.setActivity("idle");
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
                controls.setActivity("idle");
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

    it("refuses a plain stop while an execution is registered, and keeps serving", async () => {
        const network = await harness.daemon.services.networks.create(
            "n",
            "allow",
        );
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
        expect((await call("/api/agents")).body as AgentView[]).toHaveLength(2);
    });

    it("allows a plain stop once nothing is running", async () => {
        const stopped = await post("/api/daemon/stop", {});
        expect(stopped.status).toBe(200);
        expect(stopped.body).toEqual({ stopped: true, forced: false });
        await harness.daemon.closed;
    });

    it("forces every execution down and drops its credential", async () => {
        const network = await harness.daemon.services.networks.create(
            "n",
            "allow",
        );
        const agent = await joinAgent(network.id, "busy");
        const shell = defaultShell();
        harness.daemon.createTerminal({ file: shell.file, args: shell.args });

        const forced = await post("/api/daemon/stop", { force: true });
        expect(forced.status).toBe(200);
        expect(forced.body).toEqual({ stopped: true, forced: true });
        expect(agent.vendor.stopped).toEqual([{ force: true }]);
        expect(
            harness.daemon.services.runtimes.authenticate(agent.token),
        ).toBeUndefined();
        expect(harness.daemon.services.terminals.list()).toHaveLength(0);
        await harness.daemon.closed;
    });

    it.each([false, true])(
        "cleans up only what one stopped runtime owned (force=%s)",
        async (force) => {
            const network = await harness.daemon.services.networks.create(
                "n",
                "allow",
            );
            const going = await joinAgent(network.id, "going");
            const staying = await joinAgent(network.id, "staying");
            const third = await joinAgent(network.id, "third");
            const preserved = {
                from: staying.runtimeId,
                to: third.runtimeId,
                policy: "deny" as const,
            };
            await harness.daemon.services.db.networks.replaceRouting(
                network.id,
                {
                    defaultPolicy: "allow",
                    routes: [
                        {
                            from: going.runtimeId,
                            to: staying.runtimeId,
                            policy: "allow",
                        },
                        {
                            from: third.runtimeId,
                            to: going.runtimeId,
                            policy: "allow",
                        },
                        preserved,
                    ],
                },
            );

            await harness.daemon.stopRuntime(going.runtimeId, force);

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
        },
    );

    it("does not register a new execution once a forced stop began", async () => {
        const network = await harness.daemon.services.networks.create(
            "n",
            "allow",
        );
        const stopping = harness.daemon.stop(true);
        await expect(joinAgent(network.id, "late")).rejects.toThrow(/stopping/);
        await stopping;
    });

    it("can stop a runtime after its Network was deleted", async () => {
        const network = await harness.daemon.services.networks.create(
            "deleted",
            "deny",
        );
        const agent = await joinAgent(network.id, "a");
        expect(
            (await call(`/api/networks/${network.id}`, { method: "DELETE" }))
                .status,
        ).toBe(200);
        await harness.daemon.stopRuntime(agent.runtimeId, false);
        expect(
            harness.daemon.services.runtimes.authenticate(agent.token),
        ).toBeUndefined();
    });

    it("keeps route cleanup failure retryable through daemon force stop", async () => {
        const { db, networks, runtimes } = harness.daemon.services;
        const network = await networks.create("retry-routes", "deny");
        const agent = await joinAgent(network.id, "a");
        await networks.route(network.id, {
            kind: "directed",
            from: agent.runtimeId,
            to: ["b"],
            policy: "allow",
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
            expect(await networks.require(network.id)).toEqual(before);

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
        const network = await harness.daemon.services.networks.create(
            "n",
            "deny",
        );
        const a = await joinAgent(network.id, "a");
        const b = await joinAgent(network.id, "b");
        await post(`/api/networks/${network.id}/route`, {
            operation: {
                kind: "directed",
                policy: "allow",
                from: a.runtimeId,
                to: [b.runtimeId],
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
            const network = await short.daemon.services.networks.create(
                "n",
                "allow",
            );
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
    it.each([false, true])(
        "releases external collaboration without stopping its process (force=%s)",
        async (force) => {
            const stop = vi.fn(async () => {});
            const cleanup = vi.fn(async () => {});
            const agent = await harness.daemon.registerRuntime({
                networkId: null,
                executionOwnership: "external",
                createBinding: () => ({
                    deliver: async () => {},
                    stop,
                    cleanup,
                }),
            });
            expect(await harness.daemon.stop(force)).toMatchObject({
                stopped: true,
            });
            expect(stop).not.toHaveBeenCalled();
            expect(cleanup).toHaveBeenCalledOnce();
            expect(
                harness.daemon.services.runtimes.authenticate(agent.token),
            ).toBeUndefined();
        },
    );

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
                controls.setActivity("idle");
                return { deliver: async () => {}, stop, cleanup };
            },
        });
        await expect(
            harness.daemon.stopRuntime(agent.runtimeId, true),
        ).rejects.toThrow("cleanup failed");
        const { runtimes } = harness.daemon.services;
        expect(runtimes.authenticate(agent.token)).toBeUndefined();
        expect(runtimes.get(agent.runtimeId)?.collaborationActive).toBe(false);
        expect((await call("/api/agents")).body).toEqual([]);
        expect((await call(`/api/agents/${agent.runtimeId}`)).status).toBe(404);
        expect(await harness.daemon.stop(false)).toMatchObject({
            stopped: true,
        });
        expect(cleanup).toHaveBeenCalledTimes(2);
        expect(stop).not.toHaveBeenCalled();
    });
});

describe("external registration boundaries", () => {
    it("rejects an external runtime borrowing a daemon shell", async () => {
        const { context } = borrowableShell();
        await expect(
            harness.daemon.registerRuntime({
                networkId: null,
                executionOwnership: "external",
                terminalContext: context,
                createBinding: fakeVendor().createBinding,
            }),
        ).rejects.toThrow("External executions");
    });
    it("waits for an external preparation during plain stop without killing its process", async () => {
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
        const stopping = harness.daemon.stop(false);
        release();
        expect(await stopping).toMatchObject({ stopped: true });
        expect(await registration).toBeInstanceOf(Error);
        expect(stop).not.toHaveBeenCalled();
        expect(cleanup).toHaveBeenCalledOnce();
        expect(harness.daemon.services.runtimes.list()).toEqual([]);
    });
});
