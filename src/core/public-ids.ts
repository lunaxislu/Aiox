import { randomUUID } from "node:crypto";

export function createPublicMessageId(): string {
  return `message_${randomUUID()}`;
}

export function createPublicDeliveryId(): string {
  return `delivery_${randomUUID()}`;
}
