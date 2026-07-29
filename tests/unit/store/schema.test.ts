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
      "message_deliveries",
      "messages",
      "pairs",
      "reply_rights",
      "routes",
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
      "kind",
      "status",
      "cwd",
      "pair_id",
      "pair_slot",
      "adapter_session_id",
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
});
