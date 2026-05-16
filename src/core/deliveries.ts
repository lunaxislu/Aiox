import type { Route } from "./routes.js";

export const messageDeliveryStatuses = [
  "queued",
  "delivering",
  "delivered",
  "completed",
  "failed",
] as const;

export type MessageDeliveryStatus = (typeof messageDeliveryStatuses)[number];

export interface MessageDelivery {
  messageId: string;
  targetAgentId: string;
  route: Route;
  status: MessageDeliveryStatus;
  idempotencyKey: string;
}

export interface CreateQueuedDeliveriesRequest {
  messageId: string;
  routes: readonly Route[];
}

export function createQueuedDeliveries(
  request: CreateQueuedDeliveriesRequest,
): MessageDelivery[] {
  return request.routes.map((route) => ({
    messageId: request.messageId,
    targetAgentId: route.targetAgentId,
    route,
    status: "queued",
    idempotencyKey: `${request.messageId}:${route.targetAgentId}`,
  }));
}

export function transitionDelivery(
  delivery: MessageDelivery,
  status: MessageDeliveryStatus,
): MessageDelivery {
  return {
    ...delivery,
    status,
  };
}

export function recoverDeliveryStatusAfterRestart(
  status: MessageDeliveryStatus,
): MessageDeliveryStatus {
  if (status === "delivering") {
    return "queued";
  }

  return status;
}
