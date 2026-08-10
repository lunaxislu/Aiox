import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createPairRepository,
  type AttachAgentToPairInput,
  type PairRepository,
} from "../../../../src/store/repositories/pairs.js";
import { applySchema } from "../../../../src/store/schema.js";

type PairSlot = "a" | "b";
type SlottedAttachAgentToPairInput = AttachAgentToPairInput & { slot?: PairSlot };

describe("SQLite pair repository", () => {
  let db: Database;
  let pairs: PairRepository;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
    pairs = createPairRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it("persists a pair reservation without creating agents", () => {
    const pair = pairs.createReservation({
      id: "pair-1",
      name: "feature-x",
      now: "2026-05-16T00:00:00.000Z",
    });

    expect(pair).toEqual({
      id: "pair-1",
      name: "feature-x",
      status: "pending",
      createdAt: "2026-05-16T00:00:00.000Z",
      updatedAt: "2026-05-16T00:00:00.000Z",
    });
    expect(pairs.findByName("feature-x")).toEqual(pair);
    expect(db.prepare("select id from agents").all()).toEqual([]);
  });

  it("enforces one Codex and one Claude slot per pair", () => {
    const pair = pairs.createReservation({
      id: "pair-1",
      name: "feature-x",
      now: "2026-05-16T00:00:00.000Z",
    });
    const insertAgent = db.prepare(`
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
    insertAgent.run([
      "agent-codex-1",
      "impl",
      "codex",
      "connected",
      "/repo",
      "2026-05-16T00:00:00.000Z",
      "2026-05-16T00:00:00.000Z",
    ]);
    insertAgent.run([
      "agent-claude-1",
      "reviewer",
      "claude",
      "connected",
      "/repo",
      "2026-05-16T00:00:00.000Z",
      "2026-05-16T00:00:00.000Z",
    ]);
    insertAgent.run([
      "agent-codex-2",
      "stranger",
      "codex",
      "connected",
      "/repo",
      "2026-05-16T00:00:00.000Z",
      "2026-05-16T00:00:00.000Z",
    ]);

    const codexAttach = pairs.attachAgent({
      pairId: pair.id,
      agentId: "agent-codex-1",
      kind: "codex",
      now: "2026-05-16T00:00:01.000Z",
    });
    const claudeAttach = pairs.attachAgent({
      pairId: pair.id,
      agentId: "agent-claude-1",
      kind: "claude",
      now: "2026-05-16T00:00:02.000Z",
    });
    const secondCodexAttach = pairs.attachAgent({
      pairId: pair.id,
      agentId: "agent-codex-2",
      kind: "codex",
      now: "2026-05-16T00:00:03.000Z",
    });

    expect(codexAttach).toEqual({
      ok: true,
      pair: {
        ...pair,
        updatedAt: "2026-05-16T00:00:01.000Z",
      },
      slot: "a",
    });
    expect(claudeAttach).toEqual({
      ok: true,
      pair: {
        ...pair,
        status: "ready",
        updatedAt: "2026-05-16T00:00:02.000Z",
      },
      slot: "b",
    });
    if (!claudeAttach.ok) {
      throw new Error("expected Claude attach to succeed");
    }
    expect(secondCodexAttach).toEqual({
      ok: false,
      reason: "pair_full",
    });
    expect(pairs.findByName("feature-x")).toEqual(claudeAttach.pair);
  });

  it("rejects a same-agent re-attach to the same pair as a self-loop", () => {
    const pair = pairs.createReservation({
      id: "pair-1",
      name: "feature-x",
      now: "2026-05-16T00:00:00.000Z",
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
      "2026-05-16T00:00:00.000Z",
      "2026-05-16T00:00:00.000Z",
    ]);

    const firstAttach = pairs.attachAgent({
      pairId: pair.id,
      agentId: "agent-codex-1",
      kind: "codex",
      now: "2026-05-16T00:00:01.000Z",
    });
    const secondAttach = pairs.attachAgent({
      pairId: pair.id,
      agentId: "agent-codex-1",
      kind: "codex",
      now: "2026-05-16T00:00:02.000Z",
    });

    expect(firstAttach).toEqual({
      ok: true,
      pair: {
        ...pair,
        updatedAt: "2026-05-16T00:00:01.000Z",
      },
      slot: "a",
    });
    expect(secondAttach).toEqual({
      ok: false,
      reason: "agent_already_attached",
      existingAgentId: "agent-codex-1",
    });
  });

  it("rejects attaching an agent that does not exist", () => {
    const pair = pairs.createReservation({
      id: "pair-1",
      name: "feature-x",
      now: "2026-05-16T00:00:00.000Z",
    });

    const result = pairs.attachAgent({
      pairId: pair.id,
      agentId: "missing-agent",
      kind: "codex",
      now: "2026-05-16T00:00:01.000Z",
    });

    expect(result).toEqual({
      ok: false,
      reason: "agent_not_found",
      agentId: "missing-agent",
    });
    expect(pairs.findByName("feature-x")).toEqual(pair);
  });

  it("rejects attaching an agent when the requested kind does not match the stored kind", () => {
    const pair = pairs.createReservation({
      id: "pair-1",
      name: "feature-x",
      now: "2026-05-16T00:00:00.000Z",
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
      "2026-05-16T00:00:00.000Z",
      "2026-05-16T00:00:00.000Z",
    ]);

    const result = pairs.attachAgent({
      pairId: pair.id,
      agentId: "agent-codex-1",
      kind: "claude",
      now: "2026-05-16T00:00:01.000Z",
    });

    expect(result).toEqual({
      ok: false,
      reason: "agent_kind_mismatch",
      agentId: "agent-codex-1",
      expectedKind: "claude",
      actualKind: "codex",
    });
    expect(pairs.findByName("feature-x")).toEqual(pair);
  });

  describe("slot-based generalization", () => {
    it("allows two distinct Codex agents to occupy both slots and marks the pair ready", () => {
      const pair = pairs.createReservation({
        id: "pair-1",
        name: "feature-x",
        now: "2026-05-16T00:00:00.000Z",
      });
      insertAgent(db, {
        id: "agent-codex-a",
        name: "impl-a",
        kind: "codex",
      });
      insertAgent(db, {
        id: "agent-codex-b",
        name: "impl-b",
        kind: "codex",
      });

      const first: SlottedAttachAgentToPairInput = {
        pairId: pair.id,
        agentId: "agent-codex-a",
        kind: "codex",
        slot: "a",
        now: "2026-05-16T00:00:01.000Z",
      };
      const second: SlottedAttachAgentToPairInput = {
        pairId: pair.id,
        agentId: "agent-codex-b",
        kind: "codex",
        slot: "b",
        now: "2026-05-16T00:00:02.000Z",
      };

      expect(pairs.attachAgent(first)).toMatchObject({
        ok: true,
        pair: {
          id: pair.id,
          status: "pending",
        },
      });
      expect(pairs.attachAgent(second)).toMatchObject({
        ok: true,
        pair: {
          id: pair.id,
          status: "ready",
        },
      });
      expect(
        db
          .prepare("select id, pair_slot from agents where pair_id = ? order by pair_slot")
          .all(pair.id),
      ).toEqual([
        { id: "agent-codex-a", pair_slot: "a" },
        { id: "agent-codex-b", pair_slot: "b" },
      ]);
    });

    it("allows two distinct Claude agents to occupy both slots and marks the pair ready", () => {
      const pair = pairs.createReservation({
        id: "pair-1",
        name: "feature-x",
        now: "2026-05-16T00:00:00.000Z",
      });
      insertAgent(db, {
        id: "agent-claude-a",
        name: "review-a",
        kind: "claude",
      });
      insertAgent(db, {
        id: "agent-claude-b",
        name: "review-b",
        kind: "claude",
      });

      const first: SlottedAttachAgentToPairInput = {
        pairId: pair.id,
        agentId: "agent-claude-a",
        kind: "claude",
        slot: "a",
        now: "2026-05-16T00:00:01.000Z",
      };
      const second: SlottedAttachAgentToPairInput = {
        pairId: pair.id,
        agentId: "agent-claude-b",
        kind: "claude",
        slot: "b",
        now: "2026-05-16T00:00:02.000Z",
      };

      expect(pairs.attachAgent(first)).toMatchObject({
        ok: true,
        pair: {
          id: pair.id,
          status: "pending",
        },
      });
      expect(pairs.attachAgent(second)).toMatchObject({
        ok: true,
        pair: {
          id: pair.id,
          status: "ready",
        },
      });
    });

    it("returns agent_already_attached before any SQL uniqueness failure for a self-loop", () => {
      const pair = pairs.createReservation({
        id: "pair-1",
        name: "feature-x",
        now: "2026-05-16T00:00:00.000Z",
      });
      insertAgent(db, {
        id: "agent-codex",
        name: "impl",
        kind: "codex",
      });

      const first: SlottedAttachAgentToPairInput = {
        pairId: pair.id,
        agentId: "agent-codex",
        kind: "codex",
        slot: "a",
        now: "2026-05-16T00:00:01.000Z",
      };
      const second: SlottedAttachAgentToPairInput = {
        pairId: pair.id,
        agentId: "agent-codex",
        kind: "codex",
        slot: "b",
        now: "2026-05-16T00:00:02.000Z",
      };

      expect(pairs.attachAgent(first)).toMatchObject({ ok: true });
      expect(pairs.attachAgent(second)).toEqual({
        ok: false,
        reason: "agent_already_attached",
        existingAgentId: "agent-codex",
      });
    });
  });

  describe("Step 15 schema migration", () => {
    it("rejects a corrupt legacy database whose backfill would duplicate a pair slot", () => {
      db.close();
      db = new Database(":memory:");
      createLegacyPairSchema(db);
      seedLegacyPair(db, {
        pairId: "pair-1",
        agents: [
          { id: "agent-codex-a", name: "impl-a", kind: "codex" },
          { id: "agent-codex-b", name: "impl-b", kind: "codex" },
        ],
      });

      try {
        applySchema(db);
      } catch (error) {
        expect(error).toMatchObject({
          reason: "schema_migration_failed",
          detail: "duplicate_pair_slot_after_backfill",
        });
        expect(
          db.prepare("select name from pragma_table_info('agents') order by cid").all(),
        ).not.toContainEqual({ name: "pair_slot" });
        expect(
          db
            .prepare("select name from sqlite_master where type = 'table' and name = 'schema_version'")
            .all(),
        ).toEqual([]);
        return;
      }

      throw new Error("expected corrupt legacy pair migration to fail");
    });

    it("records schema versions 1 through 5 and creates the pair-slot unique index after a legacy migration", () => {
      db.close();
      db = new Database(":memory:");
      createLegacyPairSchema(db);
      seedLegacyPair(db, {
        pairId: "pair-1",
        agents: [
          { id: "agent-codex", name: "impl", kind: "codex" },
          { id: "agent-claude", name: "review", kind: "claude" },
        ],
      });

      applySchema(db);

      expect(db.prepare("select version from schema_version").all()).toEqual([
        { version: 1 },
        { version: 2 },
        { version: 3 },
        { version: 4 },
        { version: 5 },
      ]);
      expect(
        db
          .prepare("select name from sqlite_master where type = 'index' and name = ?")
          .all("agents_pair_slot_unique"),
      ).toEqual([{ name: "agents_pair_slot_unique" }]);
    });
  });
});

function insertAgent(
  db: Database,
  input: {
    id: string;
    name: string;
    kind: "codex" | "claude";
  },
): void {
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
    input.id,
    input.name,
    input.kind,
    "connected",
    "/repo",
    "2026-05-16T00:00:00.000Z",
    "2026-05-16T00:00:00.000Z",
  ]);
}

function createLegacyPairSchema(db: Database): void {
  db.exec(`
    create table agents (
      id text primary key,
      name text not null unique,
      kind text not null,
      status text not null,
      cwd text not null,
      pair_id text,
      adapter_session_id text,
      last_seen_at text,
      created_at text not null,
      updated_at text not null
    );

    create table pairs (
      id text primary key,
      name text not null unique,
      status text not null,
      created_at text not null,
      updated_at text not null
    );
  `);
}

function seedLegacyPair(
  db: Database,
  input: {
    pairId: string;
    agents: Array<{
      id: string;
      name: string;
      kind: "codex" | "claude";
    }>;
  },
): void {
  db.prepare(
    `
      insert into pairs (id, name, status, created_at, updated_at)
      values (?, ?, ?, ?, ?)
    `,
  ).run([
    input.pairId,
    "feature-x",
    "ready",
    "2026-05-16T00:00:00.000Z",
    "2026-05-16T00:00:00.000Z",
  ]);

  for (const agent of input.agents) {
    db.prepare(
      `
        insert into agents (
          id,
          name,
          kind,
          status,
          cwd,
          pair_id,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run([
      agent.id,
      agent.name,
      agent.kind,
      "connected",
      "/repo",
      input.pairId,
      "2026-05-16T00:00:00.000Z",
      "2026-05-16T00:00:00.000Z",
    ]);
  }
}
