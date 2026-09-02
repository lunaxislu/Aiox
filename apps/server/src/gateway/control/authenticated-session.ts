import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { RawData, WebSocket } from "ws";

import {
  gatewaySubscribeMethod,
  gatewaySubscribeParamsSchema,
  requestFrameSchema,
  responseFrameSchema,
  type GatewayError,
} from "@aiox/protocol";
import type { GatewayState, GatewayStateSubscription } from "../state/gateway-state.js";

export interface GatewayMethodResult {
  payload: unknown;
  afterResponse?: () => void;
}

export type GatewayMethodHandler = (
  params: unknown,
) => GatewayMethodResult | Promise<GatewayMethodResult>;

export class GatewayMethodError extends Error {
  readonly gatewayError: GatewayError;

  constructor(error: GatewayError) {
    super(error.message);
    this.name = "GatewayMethodError";
    this.gatewayError = error;
  }
}

function credentialMatches(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return (
    actualBytes.byteLength === expectedBytes.byteLength &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

function sendError(
  socket: WebSocket,
  id: string,
  error: GatewayError,
  closeAfter = false,
): void {
  const response = responseFrameSchema.parse({
    type: "res",
    id,
    ok: false,
    error,
  });
  socket.send(JSON.stringify(response), () => {
    if (closeAfter) socket.close(1008, error.code);
  });
}

export function createAuthenticatedControlSession({
  credential,
  gatewayState,
  authenticationTimeoutMs,
  methods = {},
}: {
  credential: string;
  gatewayState: GatewayState;
  authenticationTimeoutMs: number;
  methods?: Readonly<Record<string, GatewayMethodHandler>>;
}): (socket: WebSocket, request: IncomingMessage) => void {
  return (socket) => {
    let subscription: GatewayStateSubscription | undefined;
    const authenticationTimeout = setTimeout(() => {
      socket.close(1008, "AUTH_TIMEOUT");
    }, authenticationTimeoutMs);
    authenticationTimeout.unref();

    socket.on("message", (data: RawData, isBinary: boolean) => {
      if (isBinary) {
        socket.close(1008, "TEXT_REQUIRED");
        return;
      }
      let input: unknown;
      try {
        input = JSON.parse(data.toString());
      } catch {
        socket.close(1008, "INVALID_FRAME");
        return;
      }
      const request = requestFrameSchema.safeParse(input);
      if (!request.success) {
        socket.close(1008, "INVALID_FRAME");
        return;
      }

      if (!subscription && request.data.method !== gatewaySubscribeMethod) {
        sendError(socket, request.data.id, {
          code: "AUTH_REQUIRED",
          message: "Gateway subscription is required",
          retryable: false,
        });
        return;
      }
      if (request.data.method !== gatewaySubscribeMethod) {
        const handler = methods[request.data.method];
        if (!handler) {
          sendError(socket, request.data.id, {
            code: "METHOD_NOT_FOUND",
            message: "Gateway method is not available",
            retryable: false,
          });
          return;
        }
        void Promise.resolve(handler(request.data.params)).then(
          (result) => {
            const response = responseFrameSchema.parse({
              type: "res",
              id: request.data.id,
              ok: true,
              payload: result.payload,
            });
            let afterResponseStarted = false;
            const startAfterResponse = (): void => {
              if (afterResponseStarted) return;
              afterResponseStarted = true;
              socket.off("close", startAfterResponse);
              result.afterResponse?.();
            };
            if (result.afterResponse) socket.once("close", startAfterResponse);
            try {
              socket.send(JSON.stringify(response), startAfterResponse);
            } catch {
              startAfterResponse();
            }
          },
          (error: unknown) => {
            sendError(
              socket,
              request.data.id,
              error instanceof GatewayMethodError
                ? error.gatewayError
                : {
                    code: "INTERNAL_ERROR",
                    message: "Gateway method failed",
                    retryable: true,
                  },
            );
          },
        );
        return;
      }
      if (subscription) {
        sendError(socket, request.data.id, {
          code: "ALREADY_SUBSCRIBED",
          message: "Gateway connection is already subscribed",
          retryable: false,
        });
        return;
      }

      const params = gatewaySubscribeParamsSchema.safeParse(request.data.params);
      if (
        !params.success ||
        !credentialMatches(params.data.credential, credential)
      ) {
        sendError(
          socket,
          request.data.id,
          {
            code: "AUTH_FAILED",
            message: "Gateway authentication failed",
            retryable: false,
          },
          true,
        );
        return;
      }

      subscription = gatewayState.subscribe((event) => {
        socket.send(JSON.stringify(event));
      });
      clearTimeout(authenticationTimeout);
      const response = responseFrameSchema.parse({
        type: "res",
        id: request.data.id,
        ok: true,
        payload: subscription.snapshot,
      });
      socket.send(JSON.stringify(response), (error) => {
        if (error) subscription?.unsubscribe();
        else subscription?.activate();
      });
    });
    socket.once("close", () => {
      clearTimeout(authenticationTimeout);
      subscription?.unsubscribe();
    });
  };
}
