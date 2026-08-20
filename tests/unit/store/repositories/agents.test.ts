import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createAgentRepository,
  type AgentRepository,
} from "../../../../src/store/repositories/agents.js";
import { applySchema } from "../../../../src/store/schema.js";

describe("SQLite agent repository", () => {
  let db: Database;
  let agents: AgentRepository;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
    agents = createAgentRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it("persists an attached agent instance", () => {
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
        pairSlot: null,
        adapterSessionId: "thread-1",
        role: null,
        description: null,
        instructions: null,
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

  it("persists and retrieves non-null agent metadata, including private instructions", () => {
    const result = agents.attach({
      id: "agent-1",
      name: "impl",
      kind: "codex",
      cwd: "/repo",
      role: "backend",
      description: "implements the API",
      instructions: "run tests before replying",
      now: "2026-05-16T00:00:00.000Z",
    });

    if (!result.ok) {
      throw new Error("expected attach to succeed");
    }

    expect(agents.findByName("impl")).toMatchObject({
      role: "backend",
      description: "implements the API",
      instructions: "run tests before replying",
    });
  });

  it("rejects a same-name attach when the existing agent is connected", () => {
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

  it("attaches a fresh row (new id, current kind) after the previous row for that name was removed", () => {
    const first = agents.attach({
      id: "existing-1",
      name: "impl",
      kind: "codex",
      cwd: "/repo/old",
      adapterSessionId: "old-thread",
      now: "2026-05-16T00:00:00.000Z",
    });
    if (!first.ok) {
      throw new Error("expected first attach to succeed");
    }
    expect(agents.removeByName("impl")).toEqual(first.agent);
    expect(agents.findByName("impl")).toBeNull();

    // After departure, reattaching the same name creates a new identity with
    // the requested kind.
    const reattach = agents.attach({
      id: "new-1",
      name: "impl",
      kind: "claude",
      cwd: "/repo/new",
      adapterSessionId: "new-thread",
      now: "2026-05-16T00:00:01.000Z",
    });

    expect(reattach).toEqual({
      ok: true,
      agent: {
        id: "new-1",
        name: "impl",
        kind: "claude",
        status: "connected",
        cwd: "/repo/new",
        pairId: null,
        pairSlot: null,
        adapterSessionId: "new-thread",
        role: null,
        description: null,
        instructions: null,
        lastSeenAt: "2026-05-16T00:00:01.000Z",
        createdAt: "2026-05-16T00:00:01.000Z",
        updatedAt: "2026-05-16T00:00:01.000Z",
      },
    });
    if (!reattach.ok) {
      throw new Error("expected reattach to succeed");
    }
    expect(reattach.agent.id).not.toBe(first.agent.id);
    expect(agents.findByName("impl")).toEqual(reattach.agent);
  });

  it("removeByName returns null and deletes nothing when the name does not exist", () => {
    expect(agents.removeByName("ghost")).toBeNull();
  });

  it("removeAllConnected deletes every row and returns the pre-deletion snapshot", () => {
    const first = agents.attach({
      id: "agent-1",
      name: "impl",
      kind: "codex",
      cwd: "/repo",
      now: "2026-05-16T00:00:00.000Z",
    });
    const second = agents.attach({
      id: "agent-2",
      name: "reviewer",
      kind: "claude",
      cwd: "/repo",
      now: "2026-05-16T00:00:00.000Z",
    });
    if (!first.ok || !second.ok) {
      throw new Error("expected both attaches to succeed");
    }

    expect(agents.removeAllConnected()).toEqual([first.agent, second.agent]);
    expect(agents.list()).toEqual([]);
  });

  it("rebinds adapter session id for an attached agent", () => {
    const attach = agents.attach({
      id: "agent-1",
      name: "impl",
      kind: "codex",
      cwd: "/repo",
      adapterSessionId: "thread-old",
      now: "2026-05-16T00:00:00.000Z",
    });
    if (!attach.ok) {
      throw new Error("expected attach to succeed");
    }

    expect(
      agents.rebindAdapterSessionId({
        name: "impl",
        adapterSessionId: "thread-new",
        now: "2026-05-16T00:00:01.000Z",
      }),
    ).toEqual({
      ...attach.agent,
      adapterSessionId: "thread-new",
      updatedAt: "2026-05-16T00:00:01.000Z",
    });
    expect(agents.findByName("impl")?.adapterSessionId).toBe("thread-new");
  });
});
