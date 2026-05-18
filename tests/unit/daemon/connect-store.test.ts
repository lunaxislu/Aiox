import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";

interface RouteRow {
  id: string;
  source_agent_id: string;
  target_agent_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

describe("daemon connect store persistence", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("persists one directed route row per target and does not duplicate existing pairs", async () => {
    const ids = ["agent-source", "agent-one", "agent-two", "route-one", "route-two"];
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
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "researcher", cwd: "/repo" });

    await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer", "researcher"],
    });
    const duplicate = await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer"],
    });

    expect(duplicate).toEqual({
      ok: true,
      created: [],
      alreadyExisted: [
        {
          id: "route-one",
          sourceAgentId: "agent-source",
          targetAgentId: "agent-one",
          status: "active",
        },
      ],
    });
    expect(readRouteRows(db, "agent-source")).toEqual([
      {
        id: "route-one",
        source_agent_id: "agent-source",
        target_agent_id: "agent-one",
        status: "active",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
      {
        id: "route-two",
        source_agent_id: "agent-source",
        target_agent_id: "agent-two",
        status: "active",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
    ]);
    expect(readRouteRows(db, "agent-one")).toEqual([]);
    expect(readRouteRows(db, "agent-two")).toEqual([]);
  });

  it("leaves the routes table empty when any target is missing", async () => {
    const ids = ["agent-source", "agent-one", "route-one"];
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
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });

    expect(
      await client.connect({
        sourceName: "impl",
        targetNames: ["reviewer", "missing"],
      }),
    ).toEqual({
      ok: false,
      reason: "target_agent_not_found",
      missing: ["missing"],
    });
    expect(db.prepare("select * from routes").all()).toEqual([]);
  });
});

function readRouteRows(db: Database, sourceAgentId: string): RouteRow[] {
  return db
    .prepare(
      `
        select *
        from routes
        where source_agent_id = ?
        order by id
      `,
    )
    .all(sourceAgentId) as RouteRow[];
}

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
