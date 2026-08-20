import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createRouteRepository,
  type RouteRepository,
} from "../../../../src/store/repositories/routes.js";
import { applySchema } from "../../../../src/store/schema.js";

describe("SQLite route repository", () => {
  let db: Database;
  let routes: RouteRepository;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
    routes = createRouteRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it("persists directed routes", () => {
    const result = routes.create({
      id: "route-1",
      sourceAgentId: "agent-source",
      targetAgentId: "agent-target",
      now: "2026-05-16T00:00:00.000Z",
    });

    expect(result).toEqual({
      ok: true,
      route: {
        id: "route-1",
        sourceAgentId: "agent-source",
        targetAgentId: "agent-target",
        status: "active",
        createdAt: "2026-05-16T00:00:00.000Z",
        updatedAt: "2026-05-16T00:00:00.000Z",
      },
    });
    if (!result.ok) {
      throw new Error("expected route create to succeed");
    }
    expect(routes.list()).toEqual([result.route]);
  });

  it("rejects duplicate directed routes for the same source and target", () => {
    const first = routes.create({
      id: "route-1",
      sourceAgentId: "agent-source",
      targetAgentId: "agent-target",
      now: "2026-05-16T00:00:00.000Z",
    });
    if (!first.ok) {
      throw new Error("expected first route create to succeed");
    }

    const duplicate = routes.create({
      id: "route-2",
      sourceAgentId: "agent-source",
      targetAgentId: "agent-target",
      now: "2026-05-16T00:00:01.000Z",
    });

    expect(duplicate).toEqual({
      ok: false,
      reason: "route_already_exists",
      existing: first.route,
    });
    expect(routes.list()).toEqual([first.route]);
  });

  it("removeAllForAgent removes every route where the agent is source or target, leaving unrelated routes", () => {
    const sourceToFirst = routes.create({
      id: "route-1",
      sourceAgentId: "agent-source",
      targetAgentId: "agent-target-1",
      now: "2026-05-16T00:00:00.000Z",
    });
    const sourceToSecond = routes.create({
      id: "route-2",
      sourceAgentId: "agent-source",
      targetAgentId: "agent-target-2",
      now: "2026-05-16T00:00:00.000Z",
    });
    const reverse = routes.create({
      id: "route-3",
      sourceAgentId: "agent-target-1",
      targetAgentId: "agent-source",
      now: "2026-05-16T00:00:00.000Z",
    });
    if (!sourceToSecond.ok || !reverse.ok || !sourceToFirst.ok) {
      throw new Error("expected route create to succeed");
    }

    // "agent-target-1" is target of route-1 and source of route-3 -- both
    // must go; route-2 (unrelated to agent-target-1) must survive. There is
    // no selective route-level disconnect: the only way a route disappears
    // is one of its two agents leaving entirely.
    const removed = routes.removeAllForAgent("agent-target-1");

    expect(removed).toEqual([sourceToFirst.route, reverse.route]);
    expect(routes.list()).toEqual([sourceToSecond.route]);
  });

  it("removeAllForAgent returns an empty array when the agent has no routes", () => {
    expect(routes.removeAllForAgent("ghost")).toEqual([]);
  });
});
