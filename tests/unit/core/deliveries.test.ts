import { describe, expect, it } from "vitest";

import {
  canAcceptFanoutIntoTargetQueues,
  createQueuedDeliveries,
  deliveryQueueCapacity,
  deliveryQueueTtlMs,
  messageDeliveryStatuses,
  recoverDeliveryStatusAfterRestart,
  retryDelayMs,
  transitionDelivery,
} from "../../../src/core/deliveries.js";
import type { Route } from "../../../src/core/routes.js";

describe("Message deliveries", () => {
  it("defines unconfirmed as an independent delivery status", () => {
    expect(messageDeliveryStatuses).toEqual([
      "queued",
      "delivering",
      "delivered",
      "completed",
      "failed",
      "unconfirmed",
    ]);
  });

  it("creates one queued delivery per active target route", () => {
    const routes: Route[] = [
      {
        sourceAgentId: "source-1",
        targetAgentId: "target-1",
        status: "active",
      },
      {
        sourceAgentId: "source-1",
        targetAgentId: "target-2",
        status: "active",
      },
    ];

    const result = createQueuedDeliveries({
      messageId: "message-1",
      routes,
    });

    expect(result).toEqual([
      {
        messageId: "message-1",
        targetAgentId: "target-1",
        route: routes[0],
        status: "queued",
        idempotencyKey: "message-1:target-1",
      },
      {
        messageId: "message-1",
        targetAgentId: "target-2",
        route: routes[1],
        status: "queued",
        idempotencyKey: "message-1:target-2",
      },
    ]);
  });

  it("transitions a queued delivery to delivering", () => {
    const [delivery] = createQueuedDeliveries({
      messageId: "message-1",
      routes: [
        {
          sourceAgentId: "source-1",
          targetAgentId: "target-1",
          status: "active",
        },
      ],
    });

    const result = transitionDelivery(delivery, "delivering");

    expect(result).toEqual({
      ...delivery,
      status: "delivering",
    });
  });

  it("recovers an in-flight delivery as queued after restart", () => {
    expect(recoverDeliveryStatusAfterRestart("delivering")).toBe("queued");
  });

  it("uses the accepted bounded pre-write retry schedule", () => {
    expect([1, 2, 3, 4].map(retryDelayMs)).toEqual([250, 1_000, 4_000, null]);
  });

  it("rejects an entire fan-out before persistence when any target queue is full", () => {
    expect(deliveryQueueCapacity).toBe(32);
    expect(deliveryQueueTtlMs).toBe(5 * 60 * 1_000);
    expect(
      canAcceptFanoutIntoTargetQueues({
        queuedByTarget: new Map([
          ["target-a", 31],
          ["target-b", 32],
        ]),
        targetAgentIds: ["target-a", "target-b"],
      }),
    ).toBe(false);
  });
});
