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

function inspect(t: TestContext, path: string): Database.Database {
    const db = new Database(path, { readonly: true });
    t.onTestFinished(() => {
        db.close();
    });
    return db;
}

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

test("a fresh database creates the current schema directly and reopens", async (t) => {
    const path = databasePath(t, join("nested", "aiox.db"));
    let store = await openDatabase(path);
    await store.networks.create({
        id: "n1",
        name: "review",
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
        "hosts",
        "host_agents",
        "host_networks",
        "host_members",
        "host_edges",
        "panels",
        "panel_tabs",
        "host_operations",
        "host_executions",
        "persistent_networks",
        "persistent_routes",
        "messages",
        "deliveries",
        "notifications",
    ])
        assert.ok(tableNames(db).includes(table), `missing table ${table}`);
    assert.equal(tableNames(db).length, 14);
    assert.equal(tableNames(db).includes("migrations"), false);
    assert.deepEqual(db.pragma("foreign_key_check"), []);
    assert.equal(db.pragma("integrity_check", { simple: true }), "ok");
    const tables = db.pragma("table_list") as {
        name: string;
        strict: number;
    }[];
    for (const name of tableNames(db))
        assert.equal(tables.find((t) => t.name === name)?.strict, 1, name);
    assert.deepEqual(
        db
            .prepare("PRAGMA table_info(persistent_networks)")
            .all()
            .map((row) => (row as { name: string }).name),
        ["id", "name"],
    );
    assert.deepEqual(
        db
            .prepare("PRAGMA table_info(persistent_routes)")
            .all()
            .map((row) => (row as { name: string }).name),
        ["network_id", "source_id", "target_id"],
    );
});

test("persistent network and routing survive close and reopen", async (t) => {
    const path = databasePath(t);
    let store = await openDatabase(path);
    await store.networks.create({
        id: "n1",
        name: "review",
    });
    const routing = {
        routes: [{ from: "a", to: "b" }],
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

test("a failed route replacement preserves every previous edge", async (t) => {
    const store = await openDatabase(databasePath(t));
    t.onTestFinished(() => store.close());
    await store.networks.create({
        id: "n1",
        name: "review",
    });
    await store.networks.replaceRouting("n1", {
        routes: [{ from: "a", to: "b" }],
    });
    const before = await store.networks.get("n1");
    await assert.rejects(
        () =>
            store.networks.replaceRouting("n1", {
                routes: [
                    { from: "b", to: "a" },
                    { from: "b", to: "a" },
                ],
            }),
        /UNIQUE constraint/,
    );
    assert.deepEqual(await store.networks.get("n1"), before);
    await assert.rejects(
        () =>
            store.networks.replaceRouting("missing", {
                routes: [],
            }),
        /Network not found/,
    );
});

test("concurrent writes to unrelated networks both commit", async (t) => {
    const store = await openDatabase(databasePath(t));
    t.onTestFinished(() => store.close());
    for (const id of ["a", "b"]) await store.networks.create({ id, name: id });

    await Promise.all(
        ["a", "b"].map((id) =>
            store.networks.replaceRouting(id, {
                routes: [{ from: "x", to: "y" }],
            }),
        ),
    );
    assert.deepEqual(
        (await store.networks.list()).map(({ routes }) => routes),
        [[{ from: "x", to: "y" }], [{ from: "x", to: "y" }]],
    );
});

test("a rollback cannot absorb another write or expose partial routes to a read", async (t) => {
    const store = await openDatabase(databasePath(t));
    t.onTestFinished(() => store.close());
    await store.networks.create({ id: "a", name: "a" });
    const before = await store.networks.get("a");
    const failing = store.networks.replaceRouting("a", {
        routes: [
            { from: "a", to: "b" },
            { from: "a", to: "b" },
        ],
    });
    const reading = store.networks.get("a");
    const writing = store.networks.create({
        id: "b",
        name: "b",
    });
    await assert.rejects(failing, /UNIQUE constraint/);
    assert.deepEqual(await reading, before);
    await writing;
    assert.equal((await store.networks.get("b"))?.name, "b");
});

test("close completes earlier writes before closing the connection", async (t) => {
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
    });
    await store.networks.create({
        id: "n2",
        name: "other",
    });
    await assert.rejects(
        () =>
            store.networks.create({
                id: "n3",
                name: "review",
            }),
        /UNIQUE constraint/,
    );
    await store.networks.replaceRouting("n1", {
        routes: [{ from: "a", to: "b" }],
    });
    assert.equal(await store.networks.delete("n1"), true);
    assert.equal(await store.networks.delete("n1"), false);
    assert.equal(await store.networks.get("n1"), undefined);
    await store.networks.create({
        id: "n1",
        name: "review",
    });
    assert.deepEqual((await store.networks.get("n1"))?.routes, []);
    assert.equal((await store.networks.get("n2"))?.name, "other");
});

test("a failed schema initialization rolls back new tables and preserves existing data", async (t) => {
    const path = databasePath(t);
    const seed = new Database(path);
    seed.exec(
        "CREATE TABLE notifications(valuable TEXT); INSERT INTO notifications VALUES ('keep me')",
    );
    seed.close();
    await assert.rejects(() => openDatabase(path), /delivery_id/);
    const db = inspect(t, path);
    assert.deepEqual(db.prepare("SELECT * FROM notifications").all(), [
        { valuable: "keep me" },
    ]);
    assert.ok(!tableNames(db).includes("persistent_networks"));
    const repair = new Database(path);
    repair.exec("DROP TABLE notifications");
    repair.close();
    const retried = await openDatabase(path);
    assert.deepEqual(await retried.networks.list(), []);
    assert.deepEqual(await retried.messages.unreadNotifications(), []);
    await retried.close();
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
                originExecutionOwnership: "daemon",
                originTerminalId: "terminal-source",
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
    assert.equal(unread[0]?.originExecutionOwnership, "daemon");
    assert.equal(unread[0]?.originTerminalId, "terminal-source");
});

test("retention purges only messages whose every delivery finished before the cutoff", async (t) => {
    const store = await openDatabase(databasePath(t));
    t.onTestFinished(() => store.close());
    await store.networks.create({
        id: "n1",
        name: "review",
    });
    await store.networks.replaceRouting("n1", {
        routes: [{ from: "a", to: "b" }],
    });

    await store.messages.record(message("old", 10), [
        delivery("old-1", "old", "t1"),
        delivery("old-2", "old", "t2"),
    ]);
    await store.messages.settle("old-1", "completed", 1000);
    await store.messages.settle("old-2", "failed", 2000, "boom", {
        id: "nf-old",
        originRuntimeId: "r-source",
        originExecutionOwnership: "daemon",
        originTerminalId: "terminal-source",
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
        originExecutionOwnership: "daemon",
        originTerminalId: "terminal-source",
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
        routes: [{ from: "a", to: "b" }],
    });
    assert.deepEqual(await store.messages.purgeBefore(5000), {
        messages: 0,
        deliveries: 0,
        notifications: 0,
    });
});

test("current notifications require ownership but allow a missing terminal", async (t) => {
    const path = databasePath(t);
    let store = await openDatabase(path);
    t.onTestFinished(() => store.close());
    await store.messages.record(message("m", 1), [
        delivery("d", "m", "target"),
    ]);
    const db = new Database(path);
    try {
        assert.throws(
            () =>
                db
                    .prepare(
                        "INSERT INTO notifications(id, delivery_id, origin_runtime_id, body, created_at) VALUES ('bad', 'd', 'origin', 'notice', 2)",
                    )
                    .run(),
            /NOT NULL/,
        );
        db.prepare(
            "INSERT INTO notifications(id, delivery_id, origin_runtime_id, origin_execution_ownership, origin_terminal_id, body, created_at) VALUES ('good', 'd', 'origin', 'daemon', NULL, 'notice', 2)",
        ).run();
    } finally {
        db.close();
    }
    await store.close();
    store = await openDatabase(path);
    assert.deepEqual(
        (await store.messages.unreadNotifications()).map((row) => [
            row.originExecutionOwnership,
            row.originTerminalId,
        ]),
        [["daemon", null]],
    );
});

test("a notification constraint failure rolls back settlement and permits retry after reopen", async (t) => {
    const path = databasePath(t);
    let store = await openDatabase(path);
    t.onTestFinished(() => store.close());
    await store.messages.record(message("m1", 10), [
        delivery("d1", "m1", "t1"),
    ]);
    const notification = {
        id: "n1",
        originRuntimeId: "",
        originExecutionOwnership: "daemon" as const,
        originTerminalId: null,
        body: "finished",
        createdAt: 20,
        readAt: null,
    };
    await assert.rejects(
        store.messages.settle("d1", "completed", 20, undefined, notification),
        /CHECK/,
    );
    await store.close();
    store = await openDatabase(path);
    assert.equal((await store.messages.delivery("d1"))!.outcome, null);
    assert.deepEqual(await store.messages.unreadNotifications(), []);
    assert.equal(
        await store.messages.settle("d1", "completed", 30, undefined, {
            ...notification,
            originRuntimeId: "r-source",
        }),
        true,
    );
    assert.equal((await store.messages.delivery("d1"))!.outcomeAt, 30);
    assert.equal((await store.messages.unreadNotifications()).length, 1);
});

test("a closed connection rejects reads and writes instead of returning empty success", async (t) => {
    const store = await openDatabase(databasePath(t));
    await store.close();
    await assert.rejects(store.networks.list());
    await assert.rejects(store.hostState.snapshot());
    await assert.rejects(store.messages.unreadNotifications());
    await assert.rejects(store.networks.create({ id: "n", name: "no write" }));
});

test("Host FK cascades preserve independent Networks and execution, Operation and message history", async (t) => {
    const path = databasePath(t);
    const store = await openDatabase(path);
    t.onTestFinished(() => store.close());
    const raw = new Database(path);
    t.onTestFinished(() => {
        raw.close();
    });
    raw.pragma("foreign_keys = ON");
    raw.exec(`
        INSERT INTO hosts (id, name, directory, source_file, instruction, revision, created_at) VALUES ('h', 'Team', '/work', '/work/aiox.yaml', '', 1, 1);
        INSERT INTO host_agents (host_id, agent_key, ordinal, adapter, role, description, instruction, args_json, last_terminal_id, last_exit_json) VALUES ('h', 'a', 0, 'codex', NULL, NULL, '', '[]', NULL, NULL);
        INSERT INTO host_agents (host_id, agent_key, ordinal, adapter, role, description, instruction, args_json, last_terminal_id, last_exit_json) VALUES ('h', 'b', 1, 'codex', NULL, NULL, '', '[]', NULL, NULL);
        INSERT INTO host_networks (id, host_id, name, default_policy) VALUES ('n', 'h', 'Team', 'deny');
        INSERT INTO host_members (network_id, agent_key) VALUES ('n', 'a'), ('n', 'b');
        INSERT INTO host_edges (network_id, from_key, to_key, manifest_policy, override_policy) VALUES ('n', 'a', 'b', 'allow', NULL);
        INSERT INTO panels (id, kind, section, name, host_id, network_id, revision, layout_json, active_pane_id) VALUES ('p', 'host', 'hosts', 'Team', 'h', 'n', 1, '{}', 'pane');
        INSERT INTO panel_tabs (id, panel_id, terminal_id, label, agent_key, presentation, notice_json) VALUES ('tab', 'p', NULL, 'a', 'a', 'stopped', NULL);
        INSERT INTO host_executions (runtime_id, host_id, agent_key, terminal_id, started_at, ended_at, exit_json) VALUES ('r', 'h', 'a', 'terminal', 1, 2, NULL);
        INSERT INTO host_operations (id, request_id, request_hash, kind, host_id, panel_id, state, targets_json, error_json, cleanup_errors_json, created_at, finished_at) VALUES ('op', 'request', 'hash', 'host.stop', 'h', 'p', 'succeeded', '[]', NULL, '[]', 1, 2);
    `);
    assert.throws(
        () =>
            raw.exec(
                "INSERT INTO host_members (network_id, agent_key) VALUES ('n', 'missing')",
            ),
        /unknown_host_agent/,
    );
    assert.throws(
        () =>
            raw.exec(
                "INSERT INTO host_edges (network_id, from_key, to_key, manifest_policy, override_policy) VALUES ('n', 'a', 'missing', 'allow', NULL)",
            ),
        /FOREIGN KEY/,
    );
    assert.throws(
        () =>
            raw.exec(
                "INSERT INTO panel_tabs (id, panel_id, terminal_id, label, agent_key, presentation, notice_json) VALUES ('orphan', 'missing', NULL, '', NULL, 'shell', NULL)",
            ),
        /FOREIGN KEY/,
    );
    await store.networks.create({ id: "n", name: "Team" });
    await store.networks.replaceRouting("n", {
        routes: [{ from: "one", to: "two" }],
    });
    await assert.rejects(
        store.networks.create({ id: "other", name: "Team" }),
        /UNIQUE/,
    );
    await store.messages.record(
        { ...message("m1", 1), sourceRuntimeId: "r", networkId: "n" },
        [delivery("d1", "m1", "t1")],
    );
    await store.hostState.deleteHost("h", 1);
    for (const table of [
        "hosts",
        "host_agents",
        "host_networks",
        "host_members",
        "host_edges",
        "panels",
        "panel_tabs",
    ])
        assert.equal(
            raw
                .prepare<[], { count: number }>(
                    `SELECT count(*) AS count FROM ${table}`,
                )
                .get()?.count,
            0,
        );
    for (const table of [
        "host_executions",
        "host_operations",
        "messages",
        "deliveries",
        "persistent_networks",
        "persistent_routes",
    ])
        assert.equal(
            raw
                .prepare<[], { count: number }>(
                    `SELECT count(*) AS count FROM ${table}`,
                )
                .get()?.count,
            1,
        );
    assert.deepEqual(raw.pragma("foreign_key_check"), []);
});
