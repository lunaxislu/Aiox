import { describe, expect, it } from "vitest";

import {
  createFanOutMessage,
  createMessage,
  messageTypes,
} from "../../../src/core/messages.js";
import type { Route } from "../../../src/core/routes.js";

describe("Messages", () => {
  it("defines the MVP message types", () => {
    expect(messageTypes).toEqual([
      "question",
      "instruction",
      "status",
      "event",
      "reply",
    ]);
  });

  it("creates a logical message for source intent", () => {
    const result = createMessage({
      id: "message-1",
      sourceAgentId: "source-1",
      type: "instruction",
      intent: "delegation",
      replyExpected: true,
      content: "please review this change",
    });

    expect(result).toEqual({
      id: "message-1",
      sourceAgentId: "source-1",
      originKind: "agent",
      parentMessageId: null,
      type: "instruction",
      intent: "delegation",
      replyExpected: true,
      outcomeForDeliveryId: null,
      content: "please review this change",
    });
  });

  it("creates one logical message and one delivery per target route", () => {
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

    const result = createFanOutMessage({
      messageId: "message-1",
      sourceAgentId: "source-1",
      type: "instruction",
      intent: "delegation",
      replyExpected: true,
      content: "please review this change",
      routes,
    });

    expect(result.message).toEqual({
      id: "message-1",
      sourceAgentId: "source-1",
      originKind: "agent",
      parentMessageId: null,
      type: "instruction",
      intent: "delegation",
      replyExpected: true,
      outcomeForDeliveryId: null,
      content: "please review this change",
    });
    expect(result.deliveries).toHaveLength(2);
    expect(result.deliveries.map((delivery) => delivery.targetAgentId)).toEqual([
      "target-1",
      "target-2",
    ]);
  });
});
