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
        kind: "codex",
        status: "connected",
        cwd: "/repo",
        pair_id: "pair-1",
        adapter_session_id: null,
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
    ).toEqual({
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

  it("rejects a second same-kind pair attach without changing pair, route, or event rows", async () => {
    const client = createClient(["pair-1", "agent-codex", "agent-other"]);

    await client.createPair({ name: "feature-x" });
    await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
      pairName: "feature-x",
    });
    const agentsBefore = readAgentRows();
    const pairsBefore = readPairRows();
    const routesBefore = readRouteRows();
    const eventsBefore = readEventRows();

    expect(
      await client.attachAgent({
        kind: "codex",
        name: "other",
        cwd: "/repo",
        pairName: "feature-x",
      }),
    ).toEqual({
      ok: false,
      reason: "pair_kind_slot_occupied",
      existingAgentId: "agent-codex",
    });
    expect(readAgentRows()).toEqual(agentsBefore);
    expect(readPairRows()).toEqual(pairsBefore);
    expect(readRouteRows()).toEqual(routesBefore);
    expect(readEventRows()).toEqual(eventsBefore);
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
