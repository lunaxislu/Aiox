import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import { createEventRepository } from "../../../../src/store/repositories/events.js";
import { applySchema } from "../../../../src/store/schema.js";

describe("SQLite event repository", () => {
  let db: Database | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;
  });

  it("persists append-only events with nullable links", () => {
    db = new Database(":memory:");
    applySchema(db);
    const events = createEventRepository(db);

    const event = events.append({
      id: "event-1",
      type: "delivery_status_changed",
      data: { status: "delivered" },
      createdAt: "2026-05-16T00:00:00.000Z",
      agentId: null,
      messageId: "message-1",
      deliveryId: "delivery-1",
      routeId: null,
    });

    expect(event).toEqual({
      id: "event-1",
      type: "delivery_status_changed",
      data: { status: "delivered" },
      createdAt: "2026-05-16T00:00:00.000Z",
      agentId: null,
      messageId: "message-1",
      deliveryId: "delivery-1",
      routeId: null,
    });
    expect(events.list()).toEqual([event]);
  });

  it("lists events in created_at insertion order", () => {
    db = new Database(":memory:");
    applySchema(db);
    const events = createEventRepository(db);

    const first = events.append({
      id: "event-1",
      type: "message_created",
      data: {},
      createdAt: "2026-05-16T00:00:00.000Z",
      agentId: null,
      messageId: "message-1",
      deliveryId: null,
      routeId: null,
    });
    const second = events.append({
      id: "event-2",
      type: "delivery_queued",
      data: {},
      createdAt: "2026-05-16T00:00:01.000Z",
      agentId: null,
      messageId: "message-1",
      deliveryId: "delivery-1",
      routeId: "route-1",
    });

    expect(events.list()).toEqual([first, second]);
  });
});
