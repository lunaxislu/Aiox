import type { ZodType } from "zod";

import {
  GatewayConnectionClosedError,
  GatewayProtocolError,
  GatewayRemoteError,
} from "./errors.js";
import {
  eventFrameSchema,
  requestFrameSchema,
  responseFrameSchema,
  type EventFrame,
} from "./frames.js";

export interface GatewayTransportHandlers {
  message(data: string): void;
  close(reason?: unknown): void;
}

export interface GatewayTransport {
  send(data: string): void;
  subscribe(handlers: GatewayTransportHandlers): () => void;
}

export interface GatewayClientOptions {
  transport: GatewayTransport;
  createRequestId: () => string;
}

interface PendingRequest {
  payloadSchema: ZodType;
  resolve(value: unknown): void;
  reject(reason: unknown): void;
}

export interface GatewayClient {
  request<Result>(
    method: string,
    params: unknown | undefined,
    payloadSchema: ZodType<Result>,
  ): Promise<Result>;
  onEvent(listener: (event: EventFrame) => void): () => void;
  onProtocolError(listener: (error: GatewayProtocolError) => void): () => void;
  dispose(reason?: unknown): void;
}

export function createGatewayClient({
  transport,
  createRequestId,
}: GatewayClientOptions): GatewayClient {
  const pending = new Map<string, PendingRequest>();
  const eventListeners = new Set<(event: EventFrame) => void>();
  const protocolErrorListeners = new Set<
    (error: GatewayProtocolError) => void
  >();
  let disposed = false;
  let closedReason: unknown;
  let unsubscribeTransport = (): void => {};

  function reportProtocolError(error: GatewayProtocolError): void {
    for (const listener of protocolErrorListeners) listener(error);
  }

  function dispose(reason?: unknown): void {
    if (disposed) return;
    disposed = true;
    closedReason = reason;
    unsubscribeTransport();
    for (const request of pending.values()) {
      request.reject(new GatewayConnectionClosedError(reason));
    }
    pending.clear();
    eventListeners.clear();
    protocolErrorListeners.clear();
  }

  unsubscribeTransport = transport.subscribe({
    message(data) {
      let input: unknown;
      try {
        input = JSON.parse(data);
      } catch (error) {
        reportProtocolError(
          new GatewayProtocolError("Gateway sent malformed JSON", error),
        );
        return;
      }

      const event = eventFrameSchema.safeParse(input);
      if (event.success) {
        for (const listener of eventListeners) listener(event.data);
        return;
      }

      const parsed = responseFrameSchema.safeParse(input);
      if (!parsed.success) {
        reportProtocolError(new GatewayProtocolError("Gateway sent an invalid frame"));
        return;
      }

      const request = pending.get(parsed.data.id);
      if (!request) {
        reportProtocolError(
          new GatewayProtocolError(
            "Gateway response ID does not match a pending request",
          ),
        );
        return;
      }
      pending.delete(parsed.data.id);

      if (!parsed.data.ok) {
        request.reject(new GatewayRemoteError(parsed.data.error));
        return;
      }

      const payload = request.payloadSchema.safeParse(parsed.data.payload);
      if (!payload.success) {
        const error = new GatewayProtocolError(
          "Gateway response payload failed runtime validation",
          payload.error,
        );
        reportProtocolError(error);
        request.reject(error);
        return;
      }
      request.resolve(payload.data);
    },
    close(reason) {
      dispose(reason);
    },
  });
  if (disposed) unsubscribeTransport();

  return {
    request(method, params, payloadSchema) {
      if (disposed) {
        return Promise.reject(new GatewayConnectionClosedError(closedReason));
      }
      const id = createRequestId();
      if (pending.has(id)) {
        return Promise.reject(
          new GatewayProtocolError("Gateway request ID is already pending"),
        );
      }
      const frameInput =
        params === undefined
          ? { type: "req", id, method }
          : { type: "req", id, method, params };
      const frame = requestFrameSchema.safeParse(frameInput);
      if (!frame.success) {
        return Promise.reject(
          new GatewayProtocolError(
            "Gateway request failed runtime validation",
            frame.error,
          ),
        );
      }

      return new Promise((resolve, reject) => {
        pending.set(id, { payloadSchema, resolve, reject });
        try {
          transport.send(JSON.stringify(frame.data));
        } catch (error) {
          pending.delete(id);
          reject(error);
        }
      });
    },
    onEvent(listener) {
      eventListeners.add(listener);
      return () => eventListeners.delete(listener);
    },
    onProtocolError(listener) {
      protocolErrorListeners.add(listener);
      return () => protocolErrorListeners.delete(listener);
    },
    dispose,
  };
}
