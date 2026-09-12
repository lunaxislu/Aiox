import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { test, type TestContext } from "vitest";

import { openDatabase } from "@/sqlite/database";
import type { DeliveryRow, MessageRow } from "@/sqlite/schema";

function databasePath(t: TestContext, name = "aiox.db"): string {
    const directory = mkdtempSync(join(tmpdir(), "aiox-db-"));
    t.onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
    return join(directory, name);
}

/** Exactly what Stage 1's direct-SQL implementation left on disk. */
function seedStage1Database(path: string): void {
    const db = new Database(path);
    db.exec(`
CREATE TABLE persistent_networks (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) > 0),
  name TEXT NOT NULL UNIQUE CHECK(length(trim(name)) > 0 AND instr(name, '/') = 0),
  default_policy TEXT NOT NULL CHECK(default_policy IN ('allow', 'deny'))
) STRICT;
CREATE TABLE persistent_routes (
  network_id TEXT NOT NULL REFERENCES persistent_networks(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL CHECK(length(source_id) > 0),
  target_id TEXT NOT NULL CHECK(length(target_id) > 0 AND source_id <> target_id),
  policy TEXT NOT NULL CHECK(policy IN ('allow', 'deny')),
  PRIMARY KEY(network_id, source_id, target_id)
) STRICT;
INSERT INTO persistent_networks VALUES ('n1', 'review', 'deny');
INSERT INTO persistent_routes VALUES ('n1', 'a', 'b', 'allow');`);
    db.pragma("user_version = 1");
    db.close();
}

function inspect(t: TestContext, path: string): Database.Database {
    const db = new Database(path, { readonly: true });
    t.onTestFinished(() => {
        db.close();
    });
    return db;
}

const appliedMigrations = (db: Database.Database): string[] =>
    db
        .prepare<[], { name: string }>(
            "SELECT name FROM migrations ORDER BY id",
        )
        .all()
        .map(({ name }) => name);

const tableNames = (db: Database.Database): string[] =>
    db
        .prepare<[], { name: string }>(
            "SELECT name FROM sqlite_master WHERE type = 'table'",
        )
        .all()
        .map(({ name }) => name);

function message(id: string, createdAt: number): MessageRow {
    return {
        id,
        kind: "agent",
        sourceRuntimeId: "r-source",
        sourceName: "planner",
        sourceRole: null,
        sourceDescription: null,
        networkId: "n1",
        content: "do the thing",
        createdAt,
    };
}

function delivery(
    id: string,
    messageId: string,
    targetRuntimeId: string,
): DeliveryRow {
    return {
        id,
        messageId,
        targetRuntimeId,
        reverseRouteAtSend: false,
        accepted: true,
        rejectReason: null,
        outcome: null,
        outcomeAt: null,
        outcomeError: null,
    };
}

test("a Stage 1 database keeps its data and gains message history", async (t) => {
    const path = databasePath(t);
    seedStage1Database(path);

    const store = await openDatabase(path);
    assert.deepEqual(await store.networks.get("n1"), {
        id: "n1",
        name: "review",
        defaultPolicy: "deny",
        routes: [{ from: "a", to: "b", policy: "allow" }],
    });
    await store.messages.record(message("m1", 10), [
        delivery("d1", "m1", "t1"),
    ]);
    assert.equal((await store.messages.deliveriesFor("m1")).length, 1);
    await store.close();

    const db = inspect(t, path);
    // The initial migration was recorded, not replayed: replaying it would have
    // failed on the tables the Stage 1 database already had.
    assert.deepEqual(appliedMigrations(db), [
        "InitialSchema1758240000000",
        "MessageHistory1758240001000",
    ]);
    assert.equal(
        db
            .prepare<[], { count: number }>(
                "SELECT count(*) AS count FROM persistent_routes",
            )
            .get()?.count,
        1,
    );
    // Stage 1's marker is left as history, not rewritten as a second authority.
    assert.equal(db.pragma("user_version", { simple: true }), 1);
});

test("a fresh database creates every table and reopens without re-migrating", async (t) => {
    const path = databasePath(t, join("nested", "aiox.db"));
    let store = await openDatabase(path);
    await store.networks.create({
        id: "n1",
        name: "review",
        defaultPolicy: "deny",
    });
    await store.close();

    store = await openDatabase(path);
    assert.equal((await store.networks.list()).length, 1);
    await store.messages.record(message("m1", 10), [
        delivery("d1", "m1", "t1"),
    ]);
    await store.close();

    const db = inspect(t, path);
    for (const table of [
        "persistent_networks",
        "persistent_routes",
        "messages",
        "deliveries",
        "notifications",
        "migrations",
    ])
        assert.ok(tableNames(db).includes(table), `missing table ${table}`);
    assert.deepEqual(appliedMigrations(db), [
        "InitialSchema1758240000000",
        "MessageHistory1758240001000",
    ]);
});

test("persistent network and routing survive close and reopen", async (t) => {
    const path = databasePath(t);
    let store = await openDatabase(path);
    await store.networks.create({
        id: "n1",
        name: "review",
        defaultPolicy: "deny",
    });
    const routing = {
        defaultPolicy: "deny",
        routes: [{ from: "a", to: "b", policy: "allow" }],
    } as const;
    await store.networks.replaceRouting("n1", routing);
    await store.close();
    store = await openDatabase(path);
    t.onTestFinished(() => store.close());
    assert.deepEqual(await store.networks.get("n1"), {
        id: "n1",
        name: "review",
        ...routing,
    });
    assert.equal((await store.networks.list()).length, 1);
});

test("a failed route replacement preserves the previous default and every edge", async (t) => {
    const store = await openDatabase(databasePath(t));
    t.onTestFinished(() => store.close());
    await store.networks.create({
        id: "n1",
        name: "review",
        defaultPolicy: "deny",
    });
    await store.networks.replaceRouting("n1", {
        defaultPolicy: "deny",
        routes: [{ from: "a", to: "b", policy: "allow" }],
    });
    const before = await store.networks.get("n1");
    await assert.rejects(
        () =>
            store.networks.replaceRouting("n1", {
                defaultPolicy: "allow",
                routes: [
                    { from: "b", to: "a", policy: "deny" },
                    { from: "b", to: "a", policy: "allow" },
                ],
            }),
        /UNIQUE constraint/,
    );
    assert.deepEqual(await store.networks.get("n1"), before);
    await assert.rejects(
        () =>
            store.networks.replaceRouting("missing", {
                defaultPolicy: "deny",
                routes: [],
            }),
        /Network not found/,
    );
});

test("concurrent writes to unrelated networks both commit", async (t) => {
    const store = await openDatabase(databasePath(t));
    t.onTestFinished(() => store.close());
    for (const id of ["a", "b"])
        await store.networks.create({ id, name: id, defaultPolicy: "deny" });

    await Promise.all(
        ["a", "b"].map((id) =>
            store.networks.replaceRouting(id, {
                defaultPolicy: "allow",
                routes: [],
            }),
        ),
    );
    assert.deepEqual(
        (await store.networks.list()).map(({ defaultPolicy }) => defaultPolicy),
        ["allow", "allow"],
    );
});

test("a rollback cannot absorb a queued write or expose partial routes to a read", async (t) => {
    const store = await openDatabase(databasePath(t));
    t.onTestFinished(() => store.close());
    await store.networks.create({ id: "a", name: "a", defaultPolicy: "deny" });
    const before = await store.networks.get("a");
    const failing = store.networks.replaceRouting("a", {
        defaultPolicy: "allow",
        routes: [
            { from: "a", to: "b", policy: "allow" },
            { from: "a", to: "b", policy: "deny" },
        ],
    });
    const reading = store.networks.get("a");
    const writing = store.networks.create({
        id: "b",
        name: "b",
        defaultPolicy: "deny",
    });
    await assert.rejects(failing, /UNIQUE constraint/);
    assert.deepEqual(await reading, before);
    await writing;
    assert.equal((await store.networks.get("b"))?.name, "b");
});

test("close drains queued transactions before closing the connection", async (t) => {
    const path = databasePath(t);
    const store = await openDatabase(path);
    const writing = store.messages.record(message("m1", 10), [
        delivery("d1", "m1", "t1"),
    ]);
    const reading = store.messages.deliveriesFor("m1");
    const closing = store.close();
    await writing;
    assert.equal((await reading).length, 1);
    await closing;
    const reopened = await openDatabase(path);
    t.onTestFinished(() => reopened.close());
    assert.equal((await reopened.messages.deliveriesFor("m1")).length, 1);
});

test("deleting a network removes its edges and does not affect other networks", async (t) => {
    const store = await openDatabase(databasePath(t));
    t.onTestFinished(() => store.close());
    await store.networks.create({
        id: "n1",
        name: "review",
        defaultPolicy: "deny",
    });
    await store.networks.create({
        id: "n2",
        name: "other",
        defaultPolicy: "allow",
    });
    await assert.rejects(
        () =>
            store.networks.create({
                id: "n3",
                name: "review",
                defaultPolicy: "allow",
            }),
        /UNIQUE constraint/,
    );
    await store.networks.replaceRouting("n1", {
        defaultPolicy: "deny",
        routes: [{ from: "a", to: "b", policy: "allow" }],
    });
    assert.equal(await store.networks.delete("n1"), true);
    assert.equal(await store.networks.delete("n1"), false);
    assert.equal(await store.networks.get("n1"), undefined);
    await store.networks.create({
        id: "n1",
        name: "review",
        defaultPolicy: "allow",
    });
    assert.deepEqual((await store.networks.get("n1"))?.routes, []);
    assert.equal((await store.networks.get("n2"))?.defaultPolicy, "allow");
});

test("a failing initial migration rolls back schema changes and preserves existing data", async (t) => {
    const path = databasePath(t);
    const seed = new Database(path);
    seed.exec(
        "CREATE TABLE persistent_routes(valuable TEXT); INSERT INTO persistent_routes VALUES ('keep me')",
    );
    seed.close();
    await assert.rejects(() => openDatabase(path), /already exists/);
    const db = inspect(t, path);
    assert.equal(db.pragma("user_version", { simple: true }), 0);
    assert.deepEqual(db.prepare("SELECT * FROM persistent_routes").all(), [
        { valuable: "keep me" },
    ]);
    assert.ok(!tableNames(db).includes("persistent_networks"));
    assert.deepEqual(appliedMigrations(db), []);
});

test("a newer schema is rejected without downgrading or deleting its data", async (t) => {
    const path = databasePath(t);
    const seed = new Database(path);
    seed.exec(
        "CREATE TABLE future_data(value TEXT); INSERT INTO future_data VALUES ('keep me'); PRAGMA user_version = 2",
    );
    seed.close();
    await assert.rejects(
        () => openDatabase(path),
        /Unsupported database schema version: 2/,
    );
    const db = inspect(t, path);
    assert.equal(db.pragma("user_version", { simple: true }), 2);
    assert.deepEqual(db.prepare("SELECT * FROM future_data").all(), [
        { value: "keep me" },
    ]);
    assert.ok(!tableNames(db).includes("migrations"));
});

test("a rejected delivery insert leaves no message behind", async (t) => {
    const store = await openDatabase(databasePath(t));
    t.onTestFinished(() => store.close());
    await assert.rejects(
        () =>
            store.messages.record(message("m1", 10), [
                delivery("d1", "m1", "t1"),
                delivery("d2", "m1", "t1"),
            ]),
        /UNIQUE constraint/,
    );
    // An orphan message would collide on the primary key here.
    await store.messages.record(message("m1", 10), [
        delivery("d1", "m1", "t1"),
        delivery("d2", "m1", "t2"),
    ]);
    assert.deepEqual(
        (await store.messages.deliveriesFor("m1")).map((row) => row.id),
        ["d1", "d2"],
    );
});

test("a delivery settles once and a later outcome does not overwrite it", async (t) => {
    const store = await openDatabase(databasePath(t));
    t.onTestFinished(() => store.close());
    await store.messages.record(message("m1", 10), [
        delivery("d1", "m1", "t1"),
    ]);
    const found = await store.messages.deliveryFor("m1", "t1");
    assert.equal(found?.id, "d1");
    assert.equal(found?.reverseRouteAtSend, false);
    assert.equal(found?.accepted, true);
    assert.equal(await store.messages.deliveryFor("m1", "other"), undefined);

    assert.equal(await store.messages.settle("d1", "completed", 100), true);
    assert.equal(
        await store.messages.settle("d1", "failed", 200, "too late"),
        false,
    );
    assert.equal(await store.messages.settle("unknown", "failed", 200), false);
    const [settled] = await store.messages.deliveriesFor("m1");
    assert.equal(settled?.outcome, "completed");
    assert.equal(settled?.outcomeAt, 100);
    assert.equal(settled?.outcomeError, null);
});

test("notifications stay unread until they are marked read", async (t) => {
    const store = await openDatabase(databasePath(t));
    t.onTestFinished(() => store.close());
    await store.messages.record(message("m1", 10), [
        delivery("d1", "m1", "t1"),
    ]);
    await store.messages.record(message("m2", 10), [
        delivery("d2", "m2", "t1"),
    ]);
    for (const [id, deliveryId] of [
        ["nf1", "d1"],
        ["nf2", "d2"],
    ] as const)
        await store.messages.settle(
            deliveryId,
            "completed",
            id === "nf1" ? 20 : 30,
            undefined,
            {
                id,
                originRuntimeId: "r-source",
                body: `${id} finished`,
                createdAt: id === "nf1" ? 20 : 30,
                readAt: null,
            },
        );
    assert.deepEqual(
        (await store.messages.unreadNotifications()).map((row) => row.id),
        ["nf1", "nf2"],
    );
    await store.messages.markRead(["nf1"], 40);
    const unread = await store.messages.unreadNotifications();
    assert.deepEqual(
        unread.map((row) => row.id),
        ["nf2"],
    );
    assert.equal(unread[0]?.readAt, null);
});

test("retention purges only messages whose every delivery finished before the cutoff", async (t) => {
    const store = await openDatabase(databasePath(t));
    t.onTestFinished(() => store.close());
    await store.networks.create({
        id: "n1",
        name: "review",
        defaultPolicy: "deny",
    });
    await store.networks.replaceRouting("n1", {
        defaultPolicy: "deny",
        routes: [{ from: "a", to: "b", policy: "allow" }],
    });

    await store.messages.record(message("old", 10), [
        delivery("old-1", "old", "t1"),
        delivery("old-2", "old", "t2"),
    ]);
    await store.messages.settle("old-1", "completed", 1000);
    await store.messages.settle("old-2", "failed", 2000, "boom", {
        id: "nf-old",
        originRuntimeId: "r-source",
        body: "failed",
        createdAt: 2000,
        readAt: null,
    });

    await store.messages.record(message("mixed", 10), [
        delivery("mixed-1", "mixed", "t1"),
        delivery("mixed-2", "mixed", "t2"),
    ]);
    await store.messages.settle("mixed-1", "completed", 1500, undefined, {
        id: "nf-mixed",
        originRuntimeId: "r-source",
        body: "done",
        createdAt: 1500,
        readAt: null,
    });

    await store.messages.record(message("recent", 10), [
        delivery("recent-1", "recent", "t1"),
    ]);
    await store.messages.settle("recent-1", "completed", 9000);

    assert.deepEqual(await store.messages.purgeBefore(5000), {
        messages: 1,
        deliveries: 2,
        notifications: 1,
    });
    assert.deepEqual(await store.messages.deliveriesFor("old"), []);
    assert.equal((await store.messages.deliveriesFor("mixed")).length, 2);
    assert.equal((await store.messages.deliveriesFor("recent")).length, 1);
    assert.deepEqual(
        (await store.messages.unreadNotifications()).map((row) => row.id),
        ["nf-mixed"],
    );
    assert.deepEqual(await store.networks.get("n1"), {
        id: "n1",
        name: "review",
        defaultPolicy: "deny",
        routes: [{ from: "a", to: "b", policy: "allow" }],
    });
    assert.deepEqual(await store.messages.purgeBefore(5000), {
        messages: 0,
        deliveries: 0,
        notifications: 0,
    });
});
