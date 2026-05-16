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
      "events",
      "message_deliveries",
      "messages",
      "pairs",
      "routes",
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
});
