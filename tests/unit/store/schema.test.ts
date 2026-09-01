import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { applySchema } from "../../../src/store/schema.js";

describe("SQLite schema", () => {
  let db: Database | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;
  });

  it("creates the MVP durable state tables", () => {
    db = new Database(":memory:");

    applySchema(db);

    const rows = db
      .prepare(
        "select name from sqlite_master where type = 'table' order by name",
      )
      .all() as Array<{ name: string }>;

    expect(rows.map((row) => row.name)).toEqual([
      "agents",
      "delivery_outcome_notifications",
      "events",
      "host_agents",
      "host_control_requests",
      "message_deliveries",
      "messages",
      "pairs",
      "reply_rights",
      "routes",
      "running_hosts",
      "schema_version",
    ]);
  });

  it("backfills an already-correlated reply right as consumed during migration 3", () => {
    db = new Database(":memory:");
    applySchema(db);
    db.exec("drop table reply_rights");
    db.prepare("delete from schema_version where version = 3").run();
    db.prepare(
      `insert into messages (id, source_agent_id, parent_message_id, type, intent, reply_expected, content, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run("original", "source", null, "question", "delegation", 1, "question", "2026-01-01", "2026-01-01");
    db.prepare(
      `insert into message_deliveries (id, message_id, target_agent_id, route_id, status, idempotency_key, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run("delivery-original", "original", "target", "route", "delivered", "original:target", "2026-01-01", "2026-01-01");
    db.prepare(
      `insert into messages (id, source_agent_id, parent_message_id, type, intent, reply_expected, content, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run("reply", "target", "delivery-original", "reply", "result", 0, "answer", "2026-01-02", "2026-01-02");
    db.prepare(
      `insert into message_deliveries (id, message_id, target_agent_id, route_id, status, idempotency_key, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run("delivery-reply-later", "reply", "source", null, "delivered", "reply:source:later", "2026-01-03", "2026-01-03");
    db.prepare(
      `insert into message_deliveries (id, message_id, target_agent_id, route_id, status, idempotency_key, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run("delivery-reply-earlier", "reply", "source", null, "delivered", "reply:source:earlier", "2026-01-02", "2026-01-02");

    applySchema(db);

    expect(db.prepare("select originating_delivery_id, consumed_reply_message_id, consumed_reply_delivery_id, consumed_at from reply_rights").all()).toEqual([
      { originating_delivery_id: "delivery-original", consumed_reply_message_id: "reply", consumed_reply_delivery_id: "delivery-reply-earlier", consumed_at: "2026-01-02" },
    ]);
  });

  it("backfills an existing single-key outcome notification as delivery_target_rejected during migration 5", () => {
    db = new Database(":memory:");
    applySchema(db);
    db.exec("drop table delivery_outcome_notifications");
    db.prepare("delete from schema_version where version = 5").run();
    db.exec(`
      create table delivery_outcome_notifications (
        original_delivery_id text primary key,
        notification_message_id text not null unique,
        notification_delivery_id text not null unique,
        created_at text not null
      )
    `);
    db.prepare(
      `insert into delivery_outcome_notifications
        (original_delivery_id, notification_message_id, notification_delivery_id, created_at)
       values (?, ?, ?, ?)`,
    ).run("delivery-original", "message-notice", "delivery-notice", "2026-01-01");

    applySchema(db);

    const columns = db
      .prepare("pragma table_info(delivery_outcome_notifications)")
      .all() as Array<{ name: string }>;
    expect(columns.map((column) => column.name)).toEqual([
      "original_delivery_id",
      "outcome_type",
      "notification_message_id",
      "notification_delivery_id",
      "created_at",
    ]);
    expect(
      db
        .prepare(
          "select original_delivery_id, outcome_type, notification_message_id, notification_delivery_id, created_at from delivery_outcome_notifications",
        )
        .all(),
    ).toEqual([
      {
        original_delivery_id: "delivery-original",
        outcome_type: "delivery_target_rejected",
        notification_message_id: "message-notice",
        notification_delivery_id: "delivery-notice",
        created_at: "2026-01-01",
      },
    ]);

    db.prepare(
      `insert into delivery_outcome_notifications
        (original_delivery_id, outcome_type, notification_message_id, notification_delivery_id, created_at)
       values (?, ?, ?, ?, ?)`,
    ).run("delivery-original", "delivery_unconfirmed", "message-notice-2", "delivery-notice-2", "2026-01-02");
    expect(
      db.prepare("select count(*) as count from delivery_outcome_notifications").get(),
    ).toEqual({ count: 2 });
    const insertDuplicateType = db.prepare(
      `insert into delivery_outcome_notifications
        (original_delivery_id, outcome_type, notification_message_id, notification_delivery_id, created_at)
       values (?, ?, ?, ?, ?)`,
    );
    expect(() =>
      insertDuplicateType.run(
        "delivery-original",
        "delivery_target_rejected",
        "message-notice-3",
        "delivery-notice-3",
        "2026-01-03",
      ),
    ).toThrow();
  });

  it("creates the agents table with MVP columns", () => {
    db = new Database(":memory:");

    applySchema(db);

    const columns = db.prepare("pragma table_info(agents)").all() as Array<{
      name: string;
      notnull: 0 | 1;
      pk: 0 | 1;
    }>;

    expect(columns.map((column) => column.name)).toEqual([
      "id",
      "name",
      "host_id",
      "kind",
      "status",
      "cwd",
      "pair_id",
      "pair_slot",
      "adapter_session_id",
      "role",
      "description",
      "instructions",
      "last_seen_at",
      "created_at",
      "updated_at",
    ]);
    expect(columns.find((column) => column.name === "id")).toMatchObject({
      pk: 1,
    });
  });

  it("enforces unique agent names", () => {
    db = new Database(":memory:");

    applySchema(db);

    const insert = db.prepare(`
      insert into agents (
        id,
        name,
        kind,
        status,
        cwd,
        created_at,
        updated_at
      ) values (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run([
      "agent-1",
      "impl",
      "codex",
      "connected",
      "/repo",
      "2026-05-16T00:00:00.000Z",
      "2026-05-16T00:00:00.000Z",
    ]);

    expect(() => {
      insert.run([
        "agent-2",
        "impl",
        "codex",
        "disconnected",
        "/repo",
        "2026-05-16T00:00:01.000Z",
        "2026-05-16T00:00:01.000Z",
      ]);
    }).toThrow();
  });

  it("allows the same agent name under different host_id scopes but not within the same scope", () => {
    db = new Database(":memory:");

    applySchema(db);

    const insert = db.prepare(`
      insert into agents (
        id,
        name,
        host_id,
        kind,
        status,
        cwd,
        created_at,
        updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run([
      "agent-standalone",
      "reviewer",
      "",
      "claude",
      "connected",
      "/repo",
      "2026-08-31T00:00:00.000Z",
      "2026-08-31T00:00:00.000Z",
    ]);
    insert.run([
      "agent-host-a",
      "reviewer",
      "host-a",
      "claude",
      "connected",
      "/repo",
      "2026-08-31T00:00:00.000Z",
      "2026-08-31T00:00:00.000Z",
    ]);
    insert.run([
      "agent-host-b",
      "reviewer",
      "host-b",
      "claude",
      "connected",
      "/repo",
      "2026-08-31T00:00:00.000Z",
      "2026-08-31T00:00:00.000Z",
    ]);

    expect(
      db.prepare("select id from agents order by id").all(),
    ).toEqual([
      { id: "agent-host-a" },
      { id: "agent-host-b" },
      { id: "agent-standalone" },
    ]);

    expect(() => {
      insert.run([
        "agent-host-a-dup",
        "reviewer",
        "host-a",
        "claude",
        "connected",
        "/repo",
        "2026-08-31T00:00:01.000Z",
        "2026-08-31T00:00:01.000Z",
      ]);
    }).toThrow();
  });

  it("migrates a pre-Stage-5A agents table (global unique name, no host_id) to the (host_id, name) scoped shape during migration 9", () => {
    db = new Database(":memory:");
    applySchema(db);
    db.prepare("delete from schema_version where version = 9").run();
    db.exec("drop table agents");
    db.exec(`
      create table agents (
        id text primary key,
        name text not null unique,
        kind text not null,
        status text not null,
        cwd text not null,
        pair_id text,
        pair_slot text,
        adapter_session_id text,
        role text,
        description text,
        instructions text,
        last_seen_at text,
        created_at text not null,
        updated_at text not null
      )
    `);
    db.prepare(
      `insert into agents (id, name, kind, status, cwd, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?)`,
    ).run("agent-1", "impl", "codex", "connected", "/repo", "2026-01-01", "2026-01-01");

    applySchema(db);

    const columns = db.prepare("pragma table_info(agents)").all() as Array<{
      name: string;
    }>;
    expect(columns.map((column) => column.name)).toContain("host_id");

    expect(
      db.prepare("select id, name, host_id from agents").all(),
    ).toEqual([{ id: "agent-1", name: "impl", host_id: "" }]);

    // The rebuilt table still enforces the standalone-scope uniqueness the
    // pre-migration `unique(name)` constraint provided.
    const insertDuplicate = db.prepare(
      `insert into agents (id, name, host_id, kind, status, cwd, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    expect(() => {
      insertDuplicate.run("agent-2", "impl", "", "codex", "connected", "/repo", "2026-01-02", "2026-01-02");
    }).toThrow();

    // The pair-slot unique index survives the table rebuild.
    const indexes = db
      .prepare("select name from sqlite_master where type = 'index' and tbl_name = 'agents'")
      .all() as Array<{ name: string }>;
    expect(indexes.map((index) => index.name)).toContain("agents_pair_slot_unique");
  });

  it("adds the host-agent termination intent and delivery acknowledgement columns during migration 10, idempotently", () => {
    db = new Database(":memory:");
    applySchema(db);

    const columns = db.prepare("pragma table_info(host_agents)").all() as Array<{
      name: string;
    }>;
    expect(columns.map((column) => column.name)).toContain("pending_signal");
    expect(columns.map((column) => column.name)).toContain("pending_signal_seq");
    expect(columns.map((column) => column.name)).toContain("delivered_signal_seq");

    // Re-running the migration against an already-migrated DB (and one that
    // was migrated before these columns existed) must not fail or duplicate work.
    db.prepare("delete from schema_version where version = 10").run();
    applySchema(db);

    const columnsAfterRerun = db.prepare("pragma table_info(host_agents)").all() as Array<{
      name: string;
    }>;
    expect(columnsAfterRerun.map((column) => column.name)).toEqual(columns.map((column) => column.name));
  });

  it("creates the pairs table with MVP columns", () => {
    db = new Database(":memory:");

    applySchema(db);

    const columns = db.prepare("pragma table_info(pairs)").all() as Array<{
      name: string;
      pk: 0 | 1;
    }>;

    expect(columns.map((column) => column.name)).toEqual([
      "id",
      "name",
      "status",
      "created_at",
      "updated_at",
    ]);
    expect(columns.find((column) => column.name === "id")).toMatchObject({
      pk: 1,
    });
  });

  it("creates the routes table with MVP columns", () => {
    db = new Database(":memory:");

    applySchema(db);

    const columns = db.prepare("pragma table_info(routes)").all() as Array<{
      name: string;
      pk: 0 | 1;
    }>;

    expect(columns.map((column) => column.name)).toEqual([
      "id",
      "source_agent_id",
      "target_agent_id",
      "status",
      "created_at",
      "updated_at",
    ]);
    expect(columns.find((column) => column.name === "id")).toMatchObject({
      pk: 1,
    });
  });

  it("creates the messages table with MVP columns", () => {
    db = new Database(":memory:");

    applySchema(db);

    const columns = db.prepare("pragma table_info(messages)").all() as Array<{
      name: string;
      pk: 0 | 1;
    }>;

    expect(columns.map((column) => column.name)).toEqual([
      "id",
      "source_agent_id",
      "origin_kind",
      "parent_message_id",
      "type",
      "intent",
      "reply_expected",
      "outcome_for_delivery_id",
      "content",
      "created_at",
      "updated_at",
    ]);
    expect(columns.find((column) => column.name === "id")).toMatchObject({
      pk: 1,
    });
  });

  it("creates the message deliveries table with MVP columns", () => {
    db = new Database(":memory:");

    applySchema(db);

    const columns = db
      .prepare("pragma table_info(message_deliveries)")
      .all() as Array<{
      name: string;
      pk: 0 | 1;
    }>;

    expect(columns.map((column) => column.name)).toEqual([
      "id",
      "message_id",
      "target_agent_id",
      "route_id",
      "status",
      "idempotency_key",
      "created_at",
      "updated_at",
    ]);
    expect(columns.find((column) => column.name === "id")).toMatchObject({
      pk: 1,
    });
  });

  it("creates the events table with MVP columns", () => {
    db = new Database(":memory:");

    applySchema(db);

    const columns = db.prepare("pragma table_info(events)").all() as Array<{
      name: string;
      pk: 0 | 1;
    }>;

    expect(columns.map((column) => column.name)).toEqual([
      "id",
      "agent_id",
      "message_id",
      "delivery_id",
      "route_id",
      "type",
      "data_json",
      "created_at",
    ]);
    expect(columns.find((column) => column.name === "id")).toMatchObject({
      pk: 1,
    });
  });

  it("removes non-connected agent rows and any route referencing them during migration 7", () => {
    db = new Database(":memory:");
    applySchema(db);
    db.prepare("delete from schema_version where version = 7").run();

    const insertAgent = db.prepare(`
      insert into agents (id, name, kind, status, cwd, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?, ?)
    `);
    insertAgent.run("agent-connected-1", "impl", "codex", "connected", "/repo", "2026-01-01", "2026-01-01");
    insertAgent.run("agent-connected-2", "reviewer", "claude", "connected", "/repo", "2026-01-01", "2026-01-01");
    // Predates the physical-delete redesign: a row left over from the old
    // status-flip disconnect model, which the new code never produces or
    // reads but which would otherwise keep showing up as a stale peer.
    insertAgent.run("agent-stale", "old-researcher", "claude", "disconnected", "/repo", "2026-01-01", "2026-01-01");

    const insertRoute = db.prepare(`
      insert into routes (id, source_agent_id, target_agent_id, status, created_at, updated_at)
      values (?, ?, ?, ?, ?, ?)
    `);
    insertRoute.run("route-live", "agent-connected-1", "agent-connected-2", "active", "2026-01-01", "2026-01-01");
    insertRoute.run("route-stale-target", "agent-connected-1", "agent-stale", "active", "2026-01-01", "2026-01-01");
    insertRoute.run("route-stale-source", "agent-stale", "agent-connected-2", "active", "2026-01-01", "2026-01-01");

    applySchema(db);

    expect(db.prepare("select id from agents order by id").all()).toEqual([
      { id: "agent-connected-1" },
      { id: "agent-connected-2" },
    ]);
    expect(db.prepare("select id from routes order by id").all()).toEqual([
      { id: "route-live" },
    ]);
  });
});
