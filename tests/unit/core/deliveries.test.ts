import { describe, expect, it } from "vitest";

import {
  createQueuedDeliveries,
  messageDeliveryStatuses,
} from "../../../src/core/deliveries.js";
import type { Route } from "../../../src/core/routes.js";

describe("Message deliveries", () => {
  it("defines the MVP delivery statuses", () => {
    expect(messageDeliveryStatuses).toEqual([
      "queued",
      "delivering",
      "delivered",
      "completed",
      "failed",
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
});
