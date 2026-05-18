import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import {
  createDeliveryRepository,
  type StoredDelivery,
} from "../../../src/store/repositories/deliveries.js";
import {
  createEventRepository,
  type StoredEvent,
} from "../../../src/store/repositories/events.js";
import {
  createMessageRepository,
  type StoredMessage,
} from "../../../src/store/repositories/messages.js";
import { applySchema } from "../../../src/store/schema.js";

interface RouteRow {
  id: string;
  source_agent_id: string;
  target_agent_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

describe("daemon disconnect store persistence", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("removes only the explicit route while preserving message, delivery, and event history", async () => {
    const ids = [
      "agent-source",
      "agent-one",
      "agent-two",
      "route-one",
      "route-two",
    ];
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

    const messages = createMessageRepository(db);
    const deliveries = createDeliveryRepository(db);
    const events = createEventRepository(db);
    const message = messages.create({
      id: "message-1",
      sourceAgentId: "agent-source",
      type: "instruction",
      content: "please review",
      now: "2026-05-18T00:01:00.000Z",
    });
    const queued = deliveries.createQueuedForRoutes({
      messageId: message.id,
      routes: readRouteRows(db, "agent-source").map((route) => ({
        id: route.id,
        targetAgentId: route.target_agent_id,
      })),
      createDeliveryId: (targetAgentId) => `delivery-${targetAgentId}`,
      now: "2026-05-18T00:01:00.000Z",
    });
    if (!Array.isArray(queued)) {
      throw new Error("expected deliveries to be created");
    }
    const event = events.append({
      id: "event-1",
      type: "delivery_queued",
      data: { reason: "fixture" },
      createdAt: "2026-05-18T00:01:00.000Z",
      agentId: null,
      messageId: "message-1",
      deliveryId: queued[0].id,
      routeId: "route-one",
    });

    // MVP spec: disconnect does not delete historical messages, deliveries, or events.
    await client.disconnect({
      sourceName: "impl",
      targetNames: ["reviewer"],
    });

    expect(messages.list()).toEqual<StoredMessage[]>([message]);
    expect(deliveries.list()).toEqual<StoredDelivery[]>(queued);
    expect(events.list()).toEqual<StoredEvent[]>([event]);
    expect(readRouteRows(db, "agent-source")).toEqual([
      {
        id: "route-two",
        source_agent_id: "agent-source",
        target_agent_id: "agent-two",
        status: "active",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
    ]);
  });

  it("keeps non-targeted routes for the same source after one disconnect call", async () => {
    const ids = [
      "agent-source",
      "agent-one",
      "agent-two",
      "agent-three",
      "route-one",
      "route-two",
      "route-three",
    ];
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
    await client.attachAgent({ kind: "claude", name: "planner", cwd: "/repo" });
    await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer", "researcher", "planner"],
    });

    await client.disconnect({
      sourceName: "impl",
      targetNames: ["researcher"],
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
        id: "route-three",
        source_agent_id: "agent-source",
        target_agent_id: "agent-three",
        status: "active",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
    ]);
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
