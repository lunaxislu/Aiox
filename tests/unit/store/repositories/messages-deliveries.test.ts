import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createDeliveryRepository,
  type DeliveryRepository,
} from "../../../../src/store/repositories/deliveries.js";
import {
  createMessageRepository,
  type MessageRepository,
} from "../../../../src/store/repositories/messages.js";
import { applySchema } from "../../../../src/store/schema.js";

describe("SQLite message and delivery repositories", () => {
  let db: Database;
  let messages: MessageRepository;
  let deliveries: DeliveryRepository;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
    messages = createMessageRepository(db);
    deliveries = createDeliveryRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it("persists one logical message and one queued delivery per target route", () => {
    const message = messages.create({
      id: "message-1",
      sourceAgentId: "agent-source",
      type: "instruction",
      content: "please review",
      now: "2026-05-16T00:00:00.000Z",
    });
    const queued = deliveries.createQueuedForRoutes({
      messageId: message.id,
      routes: [
        {
          id: "route-1",
          targetAgentId: "agent-target-1",
        },
        {
          id: "route-2",
          targetAgentId: "agent-target-2",
        },
      ],
      createDeliveryId: (targetAgentId) => `delivery-${targetAgentId}`,
      now: "2026-05-16T00:00:00.000Z",
    });

    expect(messages.list()).toEqual([message]);
    expect(queued).toEqual([
      {
        id: "delivery-agent-target-1",
        messageId: "message-1",
        targetAgentId: "agent-target-1",
        routeId: "route-1",
        status: "queued",
        idempotencyKey: "message-1:agent-target-1",
        createdAt: "2026-05-16T00:00:00.000Z",
        updatedAt: "2026-05-16T00:00:00.000Z",
      },
      {
        id: "delivery-agent-target-2",
        messageId: "message-1",
        targetAgentId: "agent-target-2",
        routeId: "route-2",
        status: "queued",
        idempotencyKey: "message-1:agent-target-2",
        createdAt: "2026-05-16T00:00:00.000Z",
        updatedAt: "2026-05-16T00:00:00.000Z",
      },
    ]);
    expect(deliveries.list()).toEqual(queued);
  });

  it("rejects duplicate delivery idempotency keys", () => {
    const first = deliveries.createQueuedForRoutes({
      messageId: "message-1",
      routes: [{ id: "route-1", targetAgentId: "agent-target-1" }],
      createDeliveryId: () => "delivery-1",
      now: "2026-05-16T00:00:00.000Z",
    });
    if (!Array.isArray(first)) {
      throw new Error("expected first delivery to be created");
    }
    const duplicate = deliveries.createQueuedForRoutes({
      messageId: "message-1",
      routes: [{ id: "route-1", targetAgentId: "agent-target-1" }],
      createDeliveryId: () => "delivery-2",
      now: "2026-05-16T00:00:01.000Z",
    });

    expect(duplicate).toEqual({
      ok: false,
      reason: "delivery_idempotency_key_exists",
      existing: first[0],
    });
    expect(deliveries.list()).toEqual(first);
  });

  it("recovers delivering deliveries as queued after restart", () => {
    const created = deliveries.createQueuedForRoutes({
      messageId: "message-1",
      routes: [
        { id: "route-1", targetAgentId: "agent-target-1" },
        { id: "route-2", targetAgentId: "agent-target-2" },
      ],
      createDeliveryId: (targetAgentId) => `delivery-${targetAgentId}`,
      now: "2026-05-16T00:00:00.000Z",
    });
    if (!Array.isArray(created)) {
      throw new Error("expected deliveries to be created");
    }
    db.prepare("update message_deliveries set status = ? where id = ?").run([
      "delivering",
      "delivery-agent-target-1",
    ]);
    db.prepare("update message_deliveries set status = ? where id = ?").run([
      "delivered",
      "delivery-agent-target-2",
    ]);

    const recovered = deliveries.recoverAfterRestart({
      now: "2026-05-16T00:00:01.000Z",
    });

    expect(recovered).toBe(1);
    expect(deliveries.list()).toEqual([
      {
        ...created[0],
        status: "queued",
        updatedAt: "2026-05-16T00:00:01.000Z",
      },
      {
        ...created[1],
        status: "delivered",
      },
    ]);
  });

  it("counts messages and deliveries without materializing full lists", () => {
    messages.create({
      id: "message-1",
      sourceAgentId: "agent-source",
      type: "instruction",
      content: "first",
      now: "2026-05-16T00:00:00.000Z",
    });
    messages.create({
      id: "message-2",
      sourceAgentId: "agent-source",
      type: "instruction",
      content: "second",
      now: "2026-05-16T00:00:01.000Z",
    });
    const created = deliveries.createQueuedForRoutes({
      messageId: "message-1",
      routes: [
        { id: "route-1", targetAgentId: "agent-target-1" },
        { id: "route-2", targetAgentId: "agent-target-2" },
        { id: "route-3", targetAgentId: "agent-target-3" },
      ],
      createDeliveryId: (targetAgentId) => `delivery-${targetAgentId}`,
      now: "2026-05-16T00:00:00.000Z",
    });
    if (!Array.isArray(created)) {
      throw new Error("expected deliveries to be created");
    }
    deliveries.updateStatus({
      id: "delivery-agent-target-2",
      status: "completed",
      now: "2026-05-16T00:00:02.000Z",
    });
    deliveries.updateStatus({
      id: "delivery-agent-target-3",
      status: "failed",
      now: "2026-05-16T00:00:03.000Z",
    });

    expect(messages.count()).toBe(2);
    expect(deliveries.countByStatus()).toEqual({
      queued: 1,
      delivering: 0,
      delivered: 0,
      completed: 1,
      failed: 1,
    });
  });
});
