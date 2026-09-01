import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";

interface AgentRow {
  id: string;
  name: string;
  kind: string;
  status: string;
  cwd: string;
  pair_id: string | null;
  adapter_session_id: string | null;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PairRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface RouteRow {
  id: string;
  source_agent_id: string;
  target_agent_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface EventRow {
  id: string;
  agent_id: string | null;
  message_id: string | null;
  delivery_id: string | null;
  route_id: string | null;
  type: string;
  data_json: string;
  created_at: string;
}

describe("daemon pair store persistence", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates a pair reservation row without creating agent rows", async () => {
    const client = createClient(["pair-1"]);

    expect(await client.createPair({ name: "feature-x" })).toEqual({
      ok: true,
      pair: {
        id: "pair-1",
        name: "feature-x",
        status: "pending",
      },
    });

    expect(readPairRows()).toEqual([
      {
        id: "pair-1",
        name: "feature-x",
        status: "pending",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
    ]);
    expect(readAgentRows()).toEqual([]);
  });

  it("occupies one expected pair slot without marking the pair ready or creating routes", async () => {
    const client = createClient(["pair-1", "agent-codex"]);

    await client.createPair({ name: "feature-x" });

    expect(
      await client.attachAgent({
        kind: "codex",
        name: "impl",
        cwd: "/repo",
        pairName: "feature-x",
      }),
    ).toEqual({
      ok: true,
      agent: {
        id: "agent-codex",
        name: "impl",
        kind: "codex",
        status: "connected",
        cwd: "/repo",
        pairId: "pair-1",
      },
    });

    expect(readAgentRows()).toEqual([
      {
        id: "agent-codex",
        name: "impl",
        host_id: "",
        kind: "codex",
        status: "connected",
        cwd: "/repo",
        pair_id: "pair-1",
        pair_slot: "a",
        adapter_session_id: null,
        role: null,
        description: null,
        instructions: null,
        last_seen_at: "2026-05-18T00:00:00.000Z",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
    ]);
    expect(readPairRows()).toMatchObject([
      {
        id: "pair-1",
        status: "pending",
      },
    ]);
    expect(readRouteRows()).toEqual([]);
  });

  it("marks a pair ready and creates bidirectional routes after both expected sides attach", async () => {
    const client = createClient([
      "pair-1",
      "agent-codex",
      "agent-claude",
      "route-codex-claude",
      "route-claude-codex",
    ]);

    await client.createPair({ name: "feature-x" });
    await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
      pairName: "feature-x",
    });

    expect(
      await client.attachAgent({
        kind: "claude",
        name: "review",
        cwd: "/repo",
        pairName: "feature-x",
      }),
    ).toMatchObject({
      ok: true,
      agent: {
        id: "agent-claude",
        name: "review",
        kind: "claude",
        status: "connected",
        cwd: "/repo",
        pairId: "pair-1",
      },
    });

    expect(readPairRows()).toMatchObject([
      {
        id: "pair-1",
        name: "feature-x",
        status: "ready",
      },
    ]);
    expect(readRouteRows()).toEqual([
      {
        id: "route-claude-codex",
        source_agent_id: "agent-claude",
        target_agent_id: "agent-codex",
        status: "active",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
      {
        id: "route-codex-claude",
        source_agent_id: "agent-codex",
        target_agent_id: "agent-claude",
        status: "active",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
    ]);
    expect(readEventRows()).toEqual([]);
  });

  it("allows a second same-kind pair attach and creates routes", async () => {
    const client = createClient([
      "pair-1",
      "agent-codex",
      "agent-other",
      "route-other-codex",
      "route-codex-other",
    ]);

    await client.createPair({ name: "feature-x" });
    await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
      pairName: "feature-x",
    });
    expect(
      await client.attachAgent({
        kind: "codex",
        name: "other",
        cwd: "/repo",
        pairName: "feature-x",
      }),
    ).toMatchObject({
      ok: true,
      agent: {
        id: "agent-other",
        pairId: "pair-1",
      },
    });
    expect(readPairRows()).toMatchObject([{ id: "pair-1", status: "ready" }]);
    expect(readRouteRows()).toHaveLength(2);
  });

  // "rejects a kind mismatch during pair reconnect..." and "surfaces
  // agent_already_attached when a reconnect tries to occupy the same pair
  // twice" (formerly here) tested pairs.attachAgent()'s agent_kind_mismatch /
  // agent_already_attached branches by simulating a "disconnected" agent row
  // that still occupied a pair slot via a raw status-flip SQL update. Under
  // the physical-delete redesign that precondition no longer exists -- a
  // departed agent's row (and pair slot) is deleted, not status-flipped
  // (agents.attach() always fresh-inserts with the request's own kind), so
  // both scenarios are now unreachable through attachAgent(). See the
  // controlling package log's "W2 재오픈" entry and tasks/W2.md Task History
  // for the full reachability analysis.

  it("marks a Codex-Codex pair ready and creates bidirectional routes by slot", async () => {
    const client = createClient([
      "pair-1",
      "agent-codex-a",
      "agent-codex-b",
      "route-codex-b-codex-a",
      "route-codex-a-codex-b",
    ]);

    await client.createPair({ name: "feature-x" });
    await client.attachAgent({
      kind: "codex",
      name: "impl-a",
      cwd: "/repo",
      pairName: "feature-x",
    });

    expect(
      await client.attachAgent({
        kind: "codex",
        name: "impl-b",
        cwd: "/repo",
        pairName: "feature-x",
      }),
    ).toMatchObject({
      ok: true,
      agent: {
        id: "agent-codex-b",
        name: "impl-b",
        kind: "codex",
        pairId: "pair-1",
      },
    });

    expect(readPairRows()).toMatchObject([
      {
        id: "pair-1",
        status: "ready",
      },
    ]);
    expect(readRouteRows()).toEqual([
      {
        id: "route-codex-a-codex-b",
        source_agent_id: "agent-codex-a",
        target_agent_id: "agent-codex-b",
        status: "active",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
      {
        id: "route-codex-b-codex-a",
        source_agent_id: "agent-codex-b",
        target_agent_id: "agent-codex-a",
        status: "active",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
    ]);
  });

  it("marks a Claude-Claude pair ready and creates bidirectional routes by slot", async () => {
    const client = createClient([
      "pair-1",
      "agent-claude-a",
      "agent-claude-b",
      "route-claude-b-claude-a",
      "route-claude-a-claude-b",
    ]);

    await client.createPair({ name: "feature-x" });
    await client.attachAgent({
      kind: "claude",
      name: "review-a",
      cwd: "/repo",
      pairName: "feature-x",
    });

    expect(
      await client.attachAgent({
        kind: "claude",
        name: "review-b",
        cwd: "/repo",
        pairName: "feature-x",
      }),
    ).toMatchObject({
      ok: true,
      agent: {
        id: "agent-claude-b",
        name: "review-b",
        kind: "claude",
        pairId: "pair-1",
      },
    });

    expect(readPairRows()).toMatchObject([
      {
        id: "pair-1",
        status: "ready",
      },
    ]);
    expect(readRouteRows()).toHaveLength(2);
  });

  it("frees a departed agent's pair slot immediately -- a different-kind agent can occupy it right away", async () => {
    const client = createClient(["pair-1", "agent-first", "event-1", "agent-second"]);

    await client.createPair({ name: "feature-x" });
    await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
      pairName: "feature-x",
      slot: "a",
    });

    await client.detachAgent({ agentName: "impl" });

    // Physical delete means "impl"'s row -- and with it, slot "a" -- is gone
    // immediately. Under the old status-flip model this same attach would
    // have failed with pair_slot_occupied (or agent_kind_mismatch, if the
    // stale row's kind was ever reused), because the departed row's
    // pair_id/pair_slot lingered forever.
    expect(
      await client.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo",
        pairName: "feature-x",
        slot: "a",
      }),
    ).toMatchObject({
      ok: true,
      agent: {
        id: "agent-second",
        name: "reviewer",
        kind: "claude",
        pairId: "pair-1",
      },
    });
    // AgentDto never surfaces pairSlot (pre-existing, unrelated to this W),
    // so confirm the slot directly against the row.
    expect(readAgentRows()).toContainEqual(
      expect.objectContaining({ id: "agent-second", pair_id: "pair-1", pair_slot: "a" }),
    );
  });

  function createClient(ids: string[]) {
    const state = createDaemonState({
      db,
      createId: () => {
        const id = ids.shift();

        if (!id) {
          throw new Error("unexpected id request");
        }

        return id;
      },
      now: () => "2026-05-18T00:00:00.000Z",
    });

    return createInProcessClient(createDaemonApi(state));
  }

  function readAgentRows(): AgentRow[] {
    return db
      .prepare("select * from agents order by id")
      .all() as AgentRow[];
  }

  function readPairRows(): PairRow[] {
    return db.prepare("select * from pairs order by id").all() as PairRow[];
  }

  function readRouteRows(): RouteRow[] {
    return db.prepare("select * from routes order by id").all() as RouteRow[];
  }

  function readEventRows(): EventRow[] {
    return db.prepare("select * from events order by id").all() as EventRow[];
  }
});

function createInProcessClient<TApi extends object>(api: TApi): TApi {
  return new Proxy(api, {
    get(target, property) {
      const value = Reflect.get(target, property);

      if (typeof value !== "function") {
        return value;
      }

      const fn = value as (...args: unknown[]) => unknown;

      return async (...args: unknown[]) => {
        const serializedArgs = JSON.parse(JSON.stringify(args));
        const response = await fn(...serializedArgs);

        return JSON.parse(JSON.stringify(response));
      };
    },
  });
}
