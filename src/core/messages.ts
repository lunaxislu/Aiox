import {
  createQueuedDeliveries,
  type MessageDelivery,
} from "./deliveries.js";
import type { Route } from "./routes.js";

export const messageTypes = [
  "question",
  "instruction",
  "status",
  "event",
  "reply",
] as const;

export type MessageType = (typeof messageTypes)[number];

export interface Message {
  id: string;
  sourceAgentId: string;
  parentMessageId: string | null;
  type: MessageType;
  content: string;
}

export interface CreateMessageRequest {
  id: string;
  sourceAgentId: string;
  parentMessageId?: string | null;
  type: MessageType;
  content: string;
}

export function createMessage(request: CreateMessageRequest): Message {
  return {
    id: request.id,
    sourceAgentId: request.sourceAgentId,
    parentMessageId: request.parentMessageId ?? null,
    type: request.type,
    content: request.content,
  };
}

export interface CreateFanOutMessageRequest {
  messageId: string;
  sourceAgentId: string;
  parentMessageId?: string | null;
  type: MessageType;
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
