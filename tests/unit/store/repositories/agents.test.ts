import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { createAgentRepository } from "../../../../src/store/repositories/agents.js";
import { applySchema } from "../../../../src/store/schema.js";

describe("SQLite agent repository", () => {
  let db: Database | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;
  });

  it("persists an attached agent instance", () => {
    db = new Database(":memory:");
    applySchema(db);
    const agents = createAgentRepository(db);

    const result = agents.attach({
      id: "agent-1",
      name: "impl",
      kind: "codex",
      cwd: "/repo",
      adapterSessionId: "thread-1",
      now: "2026-05-16T00:00:00.000Z",
    });

    expect(result).toEqual({
      ok: true,
      agent: {
        id: "agent-1",
        name: "impl",
        kind: "codex",
        status: "connected",
        cwd: "/repo",
        pairId: null,
        adapterSessionId: "thread-1",
        lastSeenAt: "2026-05-16T00:00:00.000Z",
        createdAt: "2026-05-16T00:00:00.000Z",
        updatedAt: "2026-05-16T00:00:00.000Z",
      },
    });
    if (!result.ok) {
      throw new Error("expected attach to succeed");
    }
    expect(agents.findByName("impl")).toEqual(result.agent);
  });

  it("rejects a same-name attach when the existing agent is connected", () => {
    db = new Database(":memory:");
    applySchema(db);
    const agents = createAgentRepository(db);

    const first = agents.attach({
      id: "agent-1",
      name: "impl",
      kind: "codex",
      cwd: "/repo",
      now: "2026-05-16T00:00:00.000Z",
    });
    if (!first.ok) {
      throw new Error("expected first attach to succeed");
    }
    const second = agents.attach({
      id: "agent-2",
      name: "impl",
      kind: "codex",
      cwd: "/repo",
      now: "2026-05-16T00:00:01.000Z",
    });

    expect(second).toEqual({
      ok: false,
      reason: "agent_name_already_connected",
      existing: first.agent,
    });
    expect(agents.findByName("impl")).toEqual(first.agent);
  });

  it("reconnects disconnected and stale agents with the same durable identity", () => {
    for (const status of ["disconnected", "stale"] as const) {
      db?.close();
      db = new Database(":memory:");
      applySchema(db);
      const agents = createAgentRepository(db);

      const first = agents.attach({
        id: `existing-${status}`,
        name: "impl",
        kind: "codex",
        cwd: "/repo/old",
        adapterSessionId: "old-thread",
      now: "2026-05-16T00:00:00.000Z",
    });
      if (!first.ok) {
        throw new Error("expected first attach to succeed");
      }
      db.prepare("update agents set status = ? where name = ?").run([
        status,
        "impl",
      ]);

      const reconnect = agents.attach({
        id: `new-${status}`,
        name: "impl",
        kind: "codex",
        cwd: "/repo/new",
        adapterSessionId: "new-thread",
        now: "2026-05-16T00:00:01.000Z",
      });

      expect(reconnect).toEqual({
        ok: true,
        agent: {
          ...first.agent,
          status: "connected",
          cwd: "/repo/new",
          adapterSessionId: "new-thread",
          lastSeenAt: "2026-05-16T00:00:01.000Z",
          updatedAt: "2026-05-16T00:00:01.000Z",
        },
      });
      if (!reconnect.ok) {
        throw new Error("expected reconnect to succeed");
      }
      expect(agents.findByName("impl")).toEqual(reconnect.agent);
    }
  });

  it("transitions a same-name pending attach to connected with the same durable identity", () => {
    db = new Database(":memory:");
    applySchema(db);
    const agents = createAgentRepository(db);

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
      "desired-1",
      "impl",
      "codex",
      "pending_attach",
      "/repo/desired",
      "2026-05-16T00:00:00.000Z",
      "2026-05-16T00:00:00.000Z",
    ]);

    const result = agents.attach({
      id: "agent-1",
      name: "impl",
      kind: "codex",
      cwd: "/repo/live",
      adapterSessionId: "thread-1",
      now: "2026-05-16T00:00:01.000Z",
    });

    expect(result).toEqual({
      ok: true,
      agent: {
        id: "desired-1",
        name: "impl",
        kind: "codex",
        status: "connected",
        cwd: "/repo/live",
        pairId: null,
        adapterSessionId: "thread-1",
        lastSeenAt: "2026-05-16T00:00:01.000Z",
        createdAt: "2026-05-16T00:00:00.000Z",
        updatedAt: "2026-05-16T00:00:01.000Z",
      },
    });
    if (!result.ok) {
      throw new Error("expected attach to succeed");
    }
    expect(agents.findByName("impl")).toEqual(result.agent);
  });
});
