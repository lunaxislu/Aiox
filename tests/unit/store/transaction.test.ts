import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createPairRepository } from "../../../src/store/repositories/pairs.js";
import { applySchema } from "../../../src/store/schema.js";
import { withTransaction } from "../../../src/store/transaction.js";

describe("SQLite transaction helper", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("commits all callback writes together", () => {
    withTransaction(db, () => {
      db.prepare(
        `
          insert into pairs (
            id,
            name,
            status,
            created_at,
            updated_at
          ) values (?, ?, ?, ?, ?)
        `,
      ).run([
        "pair-1",
        "feature-x",
        "pending",
        "2026-05-17T00:00:00.000Z",
        "2026-05-17T00:00:00.000Z",
      ]);
      db.prepare(
        `
          insert into pairs (
            id,
            name,
            status,
            created_at,
            updated_at
          ) values (?, ?, ?, ?, ?)
        `,
      ).run([
        "pair-2",
        "feature-y",
        "pending",
        "2026-05-17T00:00:00.000Z",
        "2026-05-17T00:00:00.000Z",
      ]);
    });

    const rows = db
      .prepare("select id from pairs order by id")
      .all() as Array<{ id: string }>;

    expect(rows.map((row) => row.id)).toEqual(["pair-1", "pair-2"]);
  });

  it("rolls back all callback writes when the callback throws", () => {
    expect(() => {
      withTransaction(db, () => {
        db.prepare(
          `
            insert into pairs (
              id,
              name,
              status,
              created_at,
              updated_at
            ) values (?, ?, ?, ?, ?)
          `,
        ).run([
          "pair-1",
          "feature-x",
          "pending",
          "2026-05-17T00:00:00.000Z",
          "2026-05-17T00:00:00.000Z",
        ]);
        db.prepare(
          `
            insert into agents (
              id,
              name,
              kind,
              status,
              cwd,
              created_at,
              updated_at
            ) values (?, ?, ?, ?, ?, ?, ?)
          `,
        ).run([
          "agent-codex-1",
          "impl",
          "codex",
          "connected",
          "/repo",
          "2026-05-17T00:00:00.000Z",
          "2026-05-17T00:00:00.000Z",
        ]);

        throw new Error("stop");
      });
    }).toThrow("stop");

    expect(db.prepare("select id from pairs").all()).toEqual([]);
    expect(db.prepare("select id from agents").all()).toEqual([]);
  });

  it("rolls back nested repository transactions when the outer callback throws", () => {
    const pairs = createPairRepository(db);
    const pair = pairs.createReservation({
      id: "pair-1",
      name: "feature-x",
      now: "2026-05-17T00:00:00.000Z",
    });
    db.prepare(
      `
        insert into agents (
          id,
          name,
          kind,
          status,
          cwd,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?)
      `,
    ).run([
      "agent-codex-1",
      "impl",
      "codex",
      "connected",
      "/repo",
      "2026-05-17T00:00:00.000Z",
      "2026-05-17T00:00:00.000Z",
    ]);

    expect(() => {
      withTransaction(db, () => {
        const result = pairs.attachAgent({
          pairId: pair.id,
          agentId: "agent-codex-1",
          kind: "codex",
          now: "2026-05-17T00:00:01.000Z",
        });

        if (!result.ok) {
          throw new Error(`expected attach to succeed: ${result.reason}`);
        }

        throw new Error("outer failure");
      });
    }).toThrow("outer failure");

    expect(
      db.prepare("select pair_id from agents where id = ?").get(
        "agent-codex-1",
      ),
    ).toEqual({ pair_id: null });
    expect(pairs.findByName("feature-x")).toEqual(pair);
  });
});
