import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openDatabase } from "@aiox/persistence";
import { expect, test, vi } from "vitest";

import { NetworkError, NetworkService } from "@/networks";
import { RuntimeRegistry, type RuntimeRecord } from "@/runtimes";

test("create rejects a name already used by another network", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-route-"));
    const db = await openDatabase(join(directory, "aiox.db"));
    t.onTestFinished(async () => {
        await db.close();
        await rm(directory, { recursive: true, force: true });
    });
    const networks = new NetworkService(db, {
        get: () => undefined,
        inNetwork: () => [],
    });
    const created = await Promise.allSettled([
        networks.create("review"),
        networks.create("review"),
    ]);
    expect(
        created.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
        created.find((result) => result.status === "rejected"),
    ).toMatchObject({
        reason: { constructor: NetworkError, code: "duplicate_name" },
    });
    await expect(networks.create("review")).rejects.toMatchObject({
        constructor: NetworkError,
        code: "duplicate_name",
    });
    const network = await networks.require("review");
    expect((await networks.create(network.id)).name).toBe(network.id);
});

test("concurrent route edits preserve both edges on the same network", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-route-"));
    const db = await openDatabase(join(directory, "aiox.db"));
    t.onTestFinished(async () => {
        await db.close();
        await rm(directory, { recursive: true, force: true });
    });
    const members = ["a", "b", "c"].map((id) => ({
        id,
        name: id,
        collaborationActive: true,
    })) as RuntimeRecord[];
    const networks = new NetworkService(db, {
        get: (id) => members.find((record) => record.id === id),
        inNetwork: () => members,
    });
    const network = await networks.create("review");
    await Promise.all(
        ["b", "c"].map((to) =>
            networks.route(network.id, {
                kind: "directed",
                from: "a",
                to: [to],
                action: "block",
            }),
        ),
    );
    expect((await networks.require(network.id)).routes).toEqual([
        { from: "a", to: "b" },
        { from: "a", to: "c" },
    ]);
});

test("runtime route cleanup preserves a concurrent edit and tolerates Network deletion", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-route-"));
    const db = await openDatabase(join(directory, "aiox.db"));
    t.onTestFinished(async () => {
        await db.close();
        await rm(directory, { recursive: true, force: true });
    });
    const members = ["b", "c", "d"].map((id) => ({
        id,
        name: id,
        collaborationActive: true,
    })) as RuntimeRecord[];
    const networks = new NetworkService(db, {
        get: (id) => members.find((record) => record.id === id),
        inNetwork: () => members,
    });
    const network = await networks.create("review");
    const runtime = { id: "a", networkId: network.id, hostId: null };
    await db.networks.replaceRouting(network.id, {
        routes: [
            { from: "a", to: "b" },
            { from: "c", to: "a" },
            { from: "b", to: "c" },
        ],
    });
    await Promise.all([
        networks.removeRuntimeRoutes(runtime),
        networks.route(network.id, {
            kind: "directed",
            from: "b",
            to: ["d"],
            action: "block",
        }),
    ]);
    expect(await networks.require(network.id)).toEqual({
        ...network,
        routes: [
            { from: "b", to: "c" },
            { from: "b", to: "d" },
        ],
    });
    members.length = 0;
    await Promise.all([
        networks.delete(network.id),
        networks.removeRuntimeRoutes(runtime),
    ]);
    expect(await networks.find(network.id)).toBeUndefined();
});

test("route names and IDs must resolve to current Network participants before any edge is stored", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-route-"));
    const db = await openDatabase(join(directory, "aiox.db"));
    t.onTestFinished(async () => {
        await db.close();
        await rm(directory, { recursive: true, force: true });
    });
    const runtimes = new RuntimeRegistry();
    const networks = new NetworkService(db, runtimes);
    const network = await networks.create("w1");
    const binding = { deliver: async () => {}, stop: async () => {} };
    const a = (
        await runtimes.register({
            name: "A",
            networkId: network.id,
            createBinding: () => binding,
        })
    ).record;
    const b = (
        await runtimes.register({
            name: "B",
            networkId: network.id,
            createBinding: () => binding,
        })
    ).record;
    const other = (
        await runtimes.register({
            name: "B",
            networkId: "other",
            createBinding: () => binding,
        })
    ).record;
    const operation = {
        kind: "directed",
        from: "B",
        to: [a.id, a.name, a.name],
        action: "block",
    } as const;
    await networks.route(network.id, operation);
    const expected = [{ from: b.id, to: a.id }];
    expect((await networks.require(network.id)).routes).toEqual(expected);
    for (const target of ["missing", other.id]) {
        await expect(
            networks.route(network.id, {
                kind: "directed",
                from: "A",
                to: ["B", target],
                action: "block",
            }),
        ).rejects.toThrow(/No participating agent/);
        expect((await networks.require(network.id)).routes).toEqual(expected);
    }
    // A route queued before revocation must validate again inside the storage operation.
    const late = expect(networks.route(network.id, operation)).rejects.toThrow(
        /No participating agent/,
    );
    runtimes.revoke(b.id);
    await networks.removeRuntimeRoutes(b);
    await late;
    runtimes.unregister(b.id);
    const replacement = (
        await runtimes.register({
            name: "B",
            networkId: network.id,
            createBinding: () => binding,
        })
    ).record;
    expect(replacement.id).not.toBe(b.id);
    expect((await networks.require(network.id)).routes).toEqual([]);
    expect((await networks.effective(network.id)).defaultPolicy).toBe("allow");
    await networks.route(network.id, {
        kind: "between",
        agents: [a.name, a.id, replacement.name, replacement.id],
        action: "block",
    });
    const routes = (await networks.require(network.id)).routes;
    expect(routes).toHaveLength(2);
    expect(routes).toEqual(
        expect.arrayContaining([
            { from: a.id, to: replacement.id },
            { from: replacement.id, to: a.id },
        ]),
    );
});

test("Host route policy follows Agent keys across fresh Runtime identities and revocation", async (t) => {
    const directory = await mkdtemp(join(tmpdir(), "aiox-host-route-"));
    const db = await openDatabase(join(directory, "aiox.db"));
    t.onTestFinished(async () => {
        await db.close();
        await rm(directory, { recursive: true, force: true });
    });
    const members = ["a", "b"];
    await db.hostState.createHost(
        {
            id: "h",
            name: "H",
            directory: "/work",
            sourceFile: "/work/aiox.yaml",
            instruction: "",
            revision: 1,
            panelId: "p",
            networkId: "n",
            agents: members.map((key) => ({
                key,
                adapter: "claude",
                role: null,
                description: null,
                instruction: "",
                args: [],
                member: true,
                runtime: null,
                lastTerminalId: null,
                lastExit: null,
            })),
        },
        {
            id: "n",
            name: "N",
            hostId: "h",
            scope: "host",
            default: "deny",
            members: members.map((agentKey) => ({ agentKey, runtimeId: null })),
            edges: [
                {
                    from: "a",
                    to: "b",
                    fromRuntimeId: null,
                    toRuntimeId: null,
                    policy: "allow",
                    source: "manifest-edge",
                },
                {
                    from: "b",
                    to: "a",
                    fromRuntimeId: null,
                    toRuntimeId: null,
                    policy: "deny",
                    source: "manifest-default",
                },
            ],
        },
        {
            id: "p",
            name: "H",
            hostId: "h",
            networkId: "n",
            kind: "host",
            section: "hosts",
            revision: 1,
            layout: {
                type: "pane",
                id: "pane",
                tabIds: [],
            },
            tabs: [],
        },
        1,
    );
    const expectedNetwork = (await db.hostState.snapshot()).networks[0];
    expect(await db.hostState.getNetwork("n")).toEqual(expectedNetwork);
    const snapshot = vi
        .spyOn(db.hostState, "snapshot")
        .mockRejectedValue(
            new Error("routing must not read the Host snapshot"),
        );
    t.onTestFinished(() => snapshot.mockRestore());
    const runtimes = new RuntimeRegistry();
    const networks = new NetworkService(db, runtimes);
    const register = async (name: string) =>
        (
            await runtimes.register({
                name,
                hostId: "h",
                networkId: "n",
                createBinding: () => ({ async stop() {}, async deliver() {} }),
            })
        ).record;
    const a = await register("a"),
        b = await register("b");
    expect((await networks.reachable(a)).map((r) => r.id)).toEqual([b.id]);
    expect(await networks.reachable(b)).toEqual([]);
    runtimes.revoke(b.id);
    await networks.removeRuntimeRoutes(b);
    expect(await networks.reachable(a)).toEqual([]);
    runtimes.unregister(b.id);
    const next = await register("b");
    expect((await networks.reachable(a)).map((r) => r.id)).toEqual([next.id]);
    expect(
        (await db.hostState.getNetwork("n"))!.edges.find((e) => e.from === "a")
            ?.policy,
    ).toBe("allow");
});
