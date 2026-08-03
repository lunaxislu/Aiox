import {
  createQueuedDeliveries,
  type MessageDelivery,
} from "./deliveries.js";
import type { Route } from "./routes.js";

export const messageTypes = [
  "question",
  "instruction",
  "event",
  "reply",
] as const;

export type MessageType = (typeof messageTypes)[number];

export const agentAuthoredIntents = [
  "delegation",
  "discussion",
  "clarification",
  "result",
  "conclusion",
] as const;

export type AgentAuthoredIntent = (typeof agentAuthoredIntents)[number];

export const messageIntents = [...agentAuthoredIntents, "notification"] as const;

export type MessageIntent = (typeof messageIntents)[number];

export const messageOriginKinds = ["agent", "daemon"] as const;

export type MessageOriginKind = (typeof messageOriginKinds)[number];

export interface Message {
  id: string;
  sourceAgentId: string;
  originKind: MessageOriginKind;
  parentMessageId: string | null;
  type: MessageType;
  intent: MessageIntent | null;
  replyExpected: boolean | null;
  outcomeForDeliveryId: string | null;
  content: string;
}

export interface CreateMessageRequest {
  id: string;
  sourceAgentId: string;
  originKind?: MessageOriginKind;
  parentMessageId?: string | null;
  type: MessageType;
  intent?: AgentAuthoredIntent;
  replyExpected?: boolean;
  outcomeForDeliveryId?: string | null;
  content: string;
}

export function createMessage(request: CreateMessageRequest): Message {
  return {
    id: request.id,
    sourceAgentId: request.sourceAgentId,
    originKind: request.originKind ?? "agent",
    parentMessageId: request.parentMessageId ?? null,
    type: request.type,
    intent: request.intent ?? null,
    replyExpected: request.replyExpected ?? null,
    outcomeForDeliveryId: request.outcomeForDeliveryId ?? null,
    content: request.content,
  };
}

export interface CreateFanOutMessageRequest {
  messageId: string;
  sourceAgentId: string;
  parentMessageId?: string | null;
  type: MessageType;
  intent?: AgentAuthoredIntent;
  replyExpected?: boolean;
  content: string;
  routes: readonly Route[];
}

export interface CreateFanOutMessageResult {
  message: Message;
  deliveries: MessageDelivery[];
}

export function createFanOutMessage(
  request: CreateFanOutMessageRequest,
): CreateFanOutMessageResult {
  const message = createMessage({
    id: request.messageId,
    sourceAgentId: request.sourceAgentId,
    parentMessageId: request.parentMessageId,
    type: request.type,
    intent: request.intent,
    replyExpected: request.replyExpected,
    content: request.content,
  });

  return {
    message,
    deliveries: createQueuedDeliveries({
      messageId: message.id,
      routes: request.routes,
    }),
  };
}
