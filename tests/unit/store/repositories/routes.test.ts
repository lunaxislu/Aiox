import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { createRouteRepository } from "../../../../src/store/repositories/routes.js";
import { applySchema } from "../../../../src/store/schema.js";

describe("SQLite route repository", () => {
  let db: Database | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;
  });

  it("persists directed routes", () => {
    db = new Database(":memory:");
    applySchema(db);
    const routes = createRouteRepository(db);

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
    db = new Database(":memory:");
    applySchema(db);
    const routes = createRouteRepository(db);

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

  it("disconnects only the specified directed routes", () => {
    db = new Database(":memory:");
    applySchema(db);
    const routes = createRouteRepository(db);

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

    const removed = routes.disconnect({
      sourceAgentId: "agent-source",
      targetAgentIds: ["agent-target-1"],
    });

    expect(removed).toEqual([sourceToFirst.route]);
    expect(routes.list()).toEqual([sourceToSecond.route, reverse.route]);
  });
});
