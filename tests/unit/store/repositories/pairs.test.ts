import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createPairRepository,
  type PairRepository,
} from "../../../../src/store/repositories/pairs.js";
import { applySchema } from "../../../../src/store/schema.js";

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
    });
    expect(claudeAttach).toEqual({
      ok: true,
      pair: {
        ...pair,
        status: "ready",
        updatedAt: "2026-05-16T00:00:02.000Z",
      },
    });
    if (!claudeAttach.ok) {
      throw new Error("expected Claude attach to succeed");
    }
    expect(secondCodexAttach).toEqual({
      ok: false,
      reason: "pair_kind_slot_occupied",
      existingAgentId: "agent-codex-1",
    });
    expect(pairs.findByName("feature-x")).toEqual(claudeAttach.pair);
  });

  it("treats a same-agent re-attach to the same pair slot as idempotent", () => {
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
    });
    expect(secondAttach).toEqual({
      ok: true,
      pair: {
        ...pair,
        updatedAt: "2026-05-16T00:00:02.000Z",
      },
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
});
