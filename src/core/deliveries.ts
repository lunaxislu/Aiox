import type { Route } from "./routes.js";

export const messageDeliveryStatuses = [
  "queued",
  "delivering",
  "delivered",
  "completed",
  "failed",
  "unconfirmed",
] as const;

export type MessageDeliveryStatus = (typeof messageDeliveryStatuses)[number];

export const deliveryQueueCapacity = 32;
export const deliveryQueueTtlMs = 5 * 60 * 1_000;

const preWriteRetryDelaysMs = [250, 1_000, 4_000] as const;

/**
 * Returns the delay before the next attempt. Attempt one is the initial
 * injection, so only attempts one through three have a scheduled retry.
 */
export function retryDelayMs(attempt: number): number | null {
  return preWriteRetryDelaysMs[attempt - 1] ?? null;
}

/**
 * Admission is deliberately fan-out atomic: a message is either admitted for
 * every target or persisted for none of them.
 */
export function canAcceptFanoutIntoTargetQueues(input: {
  queuedByTarget: ReadonlyMap<string, number>;
  targetAgentIds: readonly string[];
}): boolean {
  const requestedByTarget = new Map<string, number>();
  for (const targetAgentId of input.targetAgentIds) {
    requestedByTarget.set(
      targetAgentId,
      (requestedByTarget.get(targetAgentId) ?? 0) + 1,
    );
  }

  return [...requestedByTarget].every(
    ([targetAgentId, requested]) =>
      (input.queuedByTarget.get(targetAgentId) ?? 0) + requested <=
      deliveryQueueCapacity,
  );
}

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
