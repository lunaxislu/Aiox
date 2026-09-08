import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import Database from "better-sqlite3";
import { test } from "vitest";

import { openDatabase } from "@/sqlite/database";

test("persistent network and routing survive close and reopen", (t) => {
    const directory = mkdtempSync(join(tmpdir(), "aiox-db-"));
    t.onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
    const path = join(directory, "nested", "aiox.db");
    let store = openDatabase(path);
    t.onTestFinished(() => store.close());
    store.networks.create({ id: "n1", name: "review", defaultPolicy: "deny" });
    const routing = {
        defaultPolicy: "deny",
        routes: [{ from: "a", to: "b", policy: "allow" }],
    } as const;
    store.networks.replaceRouting("n1", routing);
    store.close();
    store = openDatabase(path);
    assert.deepEqual(store.networks.get("n1"), {
        id: "n1",
        name: "review",
        ...routing,
    });
    assert.equal(store.networks.list().length, 1);
});

test("a failed route replacement preserves the previous default and every edge", (t) => {
    const directory = mkdtempSync(join(tmpdir(), "aiox-db-"));
    t.onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
    const store = openDatabase(join(directory, "aiox.db"));
    t.onTestFinished(() => store.close());
    store.networks.create({ id: "n1", name: "review", defaultPolicy: "deny" });
    store.networks.replaceRouting("n1", {
        defaultPolicy: "deny",
        routes: [{ from: "a", to: "b", policy: "allow" }],
    });
    const before = store.networks.get("n1");
    assert.throws(
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
    assert.deepEqual(store.networks.get("n1"), before);
    assert.throws(
        () =>
            store.networks.replaceRouting("missing", {
                defaultPolicy: "deny",
                routes: [],
            }),
        /Network not found/,
    );
});

test("deleting a network removes its edges and does not affect other networks", (t) => {
    const directory = mkdtempSync(join(tmpdir(), "aiox-db-"));
    t.onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
    const store = openDatabase(join(directory, "aiox.db"));
    t.onTestFinished(() => store.close());
    store.networks.create({ id: "n1", name: "review", defaultPolicy: "deny" });
    store.networks.create({ id: "n2", name: "other", defaultPolicy: "allow" });
    assert.throws(
        () =>
            store.networks.create({
                id: "n3",
                name: "review",
                defaultPolicy: "allow",
            }),
        /UNIQUE constraint/,
    );
    store.networks.replaceRouting("n1", {
        defaultPolicy: "deny",
        routes: [{ from: "a", to: "b", policy: "allow" }],
    });
    assert.equal(store.networks.delete("n1"), true);
    assert.equal(store.networks.delete("n1"), false);
    assert.equal(store.networks.get("n1"), undefined);
    store.networks.create({ id: "n1", name: "review", defaultPolicy: "allow" });
    assert.deepEqual(store.networks.get("n1")?.routes, []);
    assert.equal(store.networks.get("n2")?.defaultPolicy, "allow");
});

test("a failing initial migration rolls back schema changes and preserves existing data", (t) => {
    const directory = mkdtempSync(join(tmpdir(), "aiox-db-"));
    t.onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
    const path = join(directory, "aiox.db");
    const seed = new Database(path);
    seed.exec(
        "CREATE TABLE persistent_routes(valuable TEXT); INSERT INTO persistent_routes VALUES ('keep me')",
    );
    seed.close();
    assert.throws(() => openDatabase(path), /already exists/);
    const inspect = new Database(path);
    t.onTestFinished(() => {
        inspect.close();
    });
    assert.equal(inspect.pragma("user_version", { simple: true }), 0);
    assert.deepEqual(inspect.prepare("SELECT * FROM persistent_routes").all(), [
        { valuable: "keep me" },
    ]);
    assert.equal(
        inspect
            .prepare(
                "SELECT name FROM sqlite_master WHERE name = 'persistent_networks'",
            )
            .get(),
        undefined,
    );
});

test("a newer schema is rejected without downgrading or deleting its data", (t) => {
    const directory = mkdtempSync(join(tmpdir(), "aiox-db-"));
    t.onTestFinished(() => rmSync(directory, { recursive: true, force: true }));
    const path = join(directory, "aiox.db");
    const seed = new Database(path);
    seed.exec(
        "CREATE TABLE future_data(value TEXT); INSERT INTO future_data VALUES ('keep me'); PRAGMA user_version = 2",
    );
    seed.close();
    assert.throws(
        () => openDatabase(path),
        /Unsupported database schema version: 2/,
    );
    const inspect = new Database(path);
    t.onTestFinished(() => {
        inspect.close();
    });
    assert.equal(inspect.pragma("user_version", { simple: true }), 2);
    assert.deepEqual(inspect.prepare("SELECT * FROM future_data").all(), [
        { value: "keep me" },
    ]);
});
