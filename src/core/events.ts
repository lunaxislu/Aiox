export const eventTypes = [
  "agent_registered",
  "agent_reconnected",
  "agent_disconnected",
  "pair_created",
  "pair_ready",
  "route_connected",
  "route_disconnected",
  "message_created",
  "delivery_queued",
  "delivery_expired",
  "delivery_status_changed",
  "delivery_manual_retransmit",
  "delivery_manual_retransmit_unconfirmed",
  "delivery_manual_retransmit_delivered",
  "delivery_manual_retransmit_rejected",
  "agent_runtime_failed",
  "agent_graceful_detach",
  "agent_thread_id_rebound",
  "codex_binding_uncertain_observed",
  "codex_delivery_queued_no_loaded_thread",
  "codex_delivery_target_selected",
  "codex_delivery_target_unavailable",
  "codex_delivery_target_injection_failed",
  "delivery_target_rejected",
  "late_reply",
  "claude_channel_message_received",
  "claude_channel_reply_received",
  "codex_channel_registered",
  "codex_channel_disconnected",
  "codex_ingress_message_received",
  "codex_ingress_reply_received",
] as const;

export type EventType = (typeof eventTypes)[number];

export interface EventLink {
  agentId?: string | null;
  messageId?: string | null;
  deliveryId?: string | null;
  routeId?: string | null;
}

export interface AioxEvent {
  id: string;
  type: EventType;
  data: Record<string, unknown>;
  createdAt: string;
  agentId: string | null;
  messageId: string | null;
  deliveryId: string | null;
  routeId: string | null;
}

export interface CreateEventRequest {
  id: string;
  type: EventType;
  data?: Record<string, unknown>;
  createdAt: string;
  link?: EventLink;
}

export function createEvent(request: CreateEventRequest): AioxEvent {
  return {
    id: request.id,
    type: request.type,
    data: request.data ?? {},
    createdAt: request.createdAt,
    agentId: request.link?.agentId ?? null,
    messageId: request.link?.messageId ?? null,
    deliveryId: request.link?.deliveryId ?? null,
    routeId: request.link?.routeId ?? null,
  };
}
