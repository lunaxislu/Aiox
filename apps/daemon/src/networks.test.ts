import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { openDatabase } from "@aiox/persistence";
import { expect, test } from "vitest";

import { NetworkError, NetworkService } from "@/networks";

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
    const networks = new NetworkService(db, {
        get: () => undefined,
        inNetwork: () => [],
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
    const networks = new NetworkService(db, {
        get: () => undefined,
        inNetwork: () => [],
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
    await Promise.all([
        networks.delete(network.id),
        networks.removeRuntimeRoutes(runtime),
    ]);
    expect(await networks.find(network.id)).toBeUndefined();
});
