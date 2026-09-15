import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openDatabase } from "@aiox/persistence";
import { expect, test } from "vitest";

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
        networks.create("review", "deny"),
        networks.create("review", "allow"),
    ]);
    expect(
        created.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
        created.find((result) => result.status === "rejected"),
    ).toMatchObject({
        reason: { constructor: NetworkError, code: "duplicate_name" },
    });
    await expect(networks.create("review", "allow")).rejects.toMatchObject({
        constructor: NetworkError,
        code: "duplicate_name",
    });
    const network = await networks.require("review");
    expect((await networks.create(network.id, "deny")).name).toBe(network.id);
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
    const network = await networks.create("review", "deny");
    await Promise.all(
        ["b", "c"].map((to) =>
            networks.route(network.id, {
                kind: "directed",
                from: "a",
                to: [to],
                policy: "allow",
            }),
        ),
    );
    expect((await networks.require(network.id)).routes).toEqual([
        { from: "a", to: "b", policy: "allow" },
        { from: "a", to: "c", policy: "allow" },
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
    const network = await networks.create("review", "deny");
    const runtime = { id: "a", networkId: network.id, hostId: null };
    await db.networks.replaceRouting(network.id, {
        defaultPolicy: "deny",
        routes: [
            { from: "a", to: "b", policy: "allow" },
            { from: "c", to: "a", policy: "deny" },
            { from: "b", to: "c", policy: "allow" },
        ],
    });
    await Promise.all([
        networks.removeRuntimeRoutes(runtime),
        networks.route(network.id, {
            kind: "directed",
            from: "b",
            to: ["d"],
            policy: "deny",
        }),
    ]);
    expect(await networks.require(network.id)).toEqual({
        ...network,
        routes: [
            { from: "b", to: "c", policy: "allow" },
            { from: "b", to: "d", policy: "deny" },
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
    const network = await networks.create("w1", "allow");
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
        policy: "deny",
    } as const;
    await networks.route(network.id, operation);
    const expected = [{ from: b.id, to: a.id, policy: "deny" }];
    expect((await networks.require(network.id)).routes).toEqual(expected);
    for (const target of ["missing", other.id]) {
        await expect(
            networks.route(network.id, {
                kind: "directed",
                from: "A",
                to: ["B", target],
                policy: "allow",
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
        policy: "allow",
    });
    const routes = (await networks.require(network.id)).routes;
    expect(routes).toHaveLength(2);
    expect(routes).toEqual(
        expect.arrayContaining([
            { from: a.id, to: replacement.id, policy: "allow" },
            { from: replacement.id, to: a.id, policy: "allow" },
        ]),
    );
});
