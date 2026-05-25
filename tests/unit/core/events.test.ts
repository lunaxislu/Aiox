import { describe, expect, it } from "vitest";

import {
  createEvent,
  eventTypes,
  type EventLink,
} from "../../../src/core/events.js";

describe("append-only events", () => {
  it("defines MVP event types", () => {
    expect(eventTypes).toEqual([
      "agent_registered",
      "agent_reconnected",
      "agent_disconnected",
      "pair_created",
      "pair_ready",
      "route_connected",
      "route_disconnected",
      "message_created",
      "delivery_queued",
      "delivery_status_changed",
      "agent_runtime_failed",
      "agent_graceful_detach",
      "agent_thread_id_rebound",
      "codex_binding_uncertain_observed",
      "codex_delivery_queued_no_loaded_thread",
      "codex_delivery_target_selected",
      "codex_delivery_target_unavailable",
      "codex_delivery_target_injection_failed",
      "late_reply",
      "claude_channel_message_received",
      "claude_channel_reply_received",
      "codex_channel_registered",
      "codex_channel_disconnected",
      "codex_ingress_message_received",
      "codex_ingress_reply_received",
    ]);
  });

  it("creates an event with injected id and timestamp", () => {
    const event = createEvent({
      id: "event-1",
      type: "route_connected",
      data: { sourceAgentId: "agent-1", targetAgentId: "agent-2" },
      createdAt: "2026-05-16T12:00:00.000Z",
      link: {
        routeId: "route-1",
      },
    });

    expect(event).toEqual({
      id: "event-1",
      type: "route_connected",
      data: { sourceAgentId: "agent-1", targetAgentId: "agent-2" },
      createdAt: "2026-05-16T12:00:00.000Z",
      agentId: null,
      messageId: null,
      deliveryId: null,
      routeId: "route-1",
    });
  });

  it("supports nullable links to agent, message, delivery, and route", () => {
    const link: EventLink = {
      agentId: "agent-1",
      messageId: "message-1",
      deliveryId: "delivery-1",
      routeId: "route-1",
    };

    const event = createEvent({
      id: "event-1",
      type: "delivery_status_changed",
      data: { status: "delivered" },
      createdAt: "2026-05-16T12:00:00.000Z",
      link,
    });

    expect(event).toMatchObject(link);
  });
});
