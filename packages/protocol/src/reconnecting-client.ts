import {
  createGatewayClient,
  type GatewayClient,
  type GatewayTransport,
} from "./client.js";
import {
  GatewayConnectionClosedError,
  GatewayProtocolError,
  GatewayRemoteError,
} from "./errors.js";
import type { EventFrame } from "./frames.js";
import { gatewaySnapshotSchema, type GatewaySnapshot } from "./snapshot.js";
import {
  gatewayEventPayloadSchema,
  gatewaySubscribeMethod,
} from "./subscription.js";
import type { ZodType } from "zod";

export interface ReconnectGatewayTransport extends GatewayTransport {
  close(): void;
}

export type GatewayConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "stopped";

export interface ReconnectingGatewayClientOptions {
  getCredential(): string | Promise<string>;
  createRequestId(): string;
  connect(): Promise<ReconnectGatewayTransport>;
  onSnapshot(snapshot: GatewaySnapshot): void;
  onEvent(event: EventFrame): void;
  onStatus?(status: GatewayConnectionStatus): void;
  onConnectionError?(error: unknown): void;
  waitBeforeReconnect(attempt: number): Promise<void>;
}

export interface ReconnectingGatewayClient {
  start(): Promise<void>;
  request<Result>(
    method: string,
    params: unknown | undefined,
    payloadSchema: ZodType<Result>,
  ): Promise<Result>;
  stop(): void;
}

export function createReconnectingGatewayClient(
  options: ReconnectingGatewayClientOptions,
): ReconnectingGatewayClient {
  let stopped = false;
  let started = false;
  let generation = 0;
  let reconnectAttempt = 0;
  let transport: ReconnectGatewayTransport | undefined;
  let gateway: GatewayClient | undefined;
  let resolveInitial: (() => void) | undefined;
  let rejectInitial: ((reason: unknown) => void) | undefined;
  const initialConnection = new Promise<void>((resolve, reject) => {
    resolveInitial = resolve;
    rejectInitial = reject;
  });

  function setStatus(status: GatewayConnectionStatus): void {
    options.onStatus?.(status);
  }

  function closeCurrent(reason: unknown): void {
    const currentGateway = gateway;
    const currentTransport = transport;
    gateway = undefined;
    transport = undefined;
    currentGateway?.dispose(reason);
    currentTransport?.close();
  }

  function scheduleReconnect(reason: unknown): void {
    if (stopped) return;
    generation += 1;
    closeCurrent(reason);
    reconnectAttempt += 1;
    setStatus("reconnecting");
    void establish(generation, reconnectAttempt);
  }

  function stopWithError(error: unknown): void {
    if (stopped) return;
    stopped = true;
    generation += 1;
    closeCurrent(error);
    options.onConnectionError?.(error);
    setStatus("stopped");
    rejectInitial?.(error);
    rejectInitial = undefined;
  }

  function applyEvent(
    event: EventFrame,
    cursor: { epoch: string; nextSeq: number; stateVersion: number },
  ): boolean {
    const payload = gatewayEventPayloadSchema.safeParse(event.payload);
    const versionMatches =
      event.stateVersion === undefined ||
      event.stateVersion === cursor.stateVersion + 1;
    if (
      !payload.success ||
      payload.data.serverEpoch !== cursor.epoch ||
      event.seq !== cursor.nextSeq ||
      !versionMatches
    ) {
      scheduleReconnect(
        new GatewayProtocolError(
          "Gateway event cursor does not match the authoritative projection",
        ),
      );
      return false;
    }

    options.onEvent(event);
    cursor.nextSeq += 1;
    if (event.stateVersion !== undefined) {
      cursor.stateVersion = event.stateVersion;
    }
    return true;
  }

  async function establish(myGeneration: number, attempt: number): Promise<void> {
    if (stopped) return;
    if (attempt > 0) {
      await options.waitBeforeReconnect(attempt);
    }
    if (stopped || myGeneration !== generation) return;

    try {
      const connectedTransport = await options.connect();
      if (stopped || myGeneration !== generation) {
        connectedTransport.close();
        return;
      }
      transport = connectedTransport;
      const bufferedEvents: EventFrame[] = [];
      let cursor:
        | { epoch: string; nextSeq: number; stateVersion: number }
        | undefined;

      const monitoredTransport: GatewayTransport = {
        send: (data) => connectedTransport.send(data),
        subscribe(handlers) {
          return connectedTransport.subscribe({
            message: handlers.message,
            close(reason) {
              handlers.close(reason);
              if (myGeneration === generation) scheduleReconnect(reason);
            },
          });
        },
      };
      const connectedGateway = createGatewayClient({
        transport: monitoredTransport,
        createRequestId: options.createRequestId,
      });
      gateway = connectedGateway;
      connectedGateway.onEvent((event) => {
        if (!cursor) {
          bufferedEvents.push(event);
          return;
        }
        applyEvent(event, cursor);
      });

      const snapshot = await connectedGateway.request(
        gatewaySubscribeMethod,
        { credential: await options.getCredential() },
        gatewaySnapshotSchema,
      );
      if (stopped || myGeneration !== generation) return;

      cursor = {
        epoch: snapshot.server.epoch,
        nextSeq: snapshot.nextEventSeq,
        stateVersion: snapshot.stateVersion,
      };
      options.onSnapshot(snapshot);
      for (const event of bufferedEvents) {
        if (!applyEvent(event, cursor)) return;
      }
      reconnectAttempt = 0;
      setStatus("connected");
      resolveInitial?.();
      resolveInitial = undefined;
      rejectInitial = undefined;
    } catch (error) {
      if (stopped || myGeneration !== generation) return;
      if (error instanceof GatewayRemoteError && error.retryable === false) {
        stopWithError(error);
        return;
      }
      scheduleReconnect(error);
    }
  }

  return {
    start() {
      if (!started) {
        started = true;
        setStatus("connecting");
        void establish(generation, 0);
      }
      return initialConnection;
    },
    request(method, params, payloadSchema) {
      if (!gateway) {
        return Promise.reject(
          new GatewayConnectionClosedError("gateway-not-connected"),
        );
      }
      return gateway.request(method, params, payloadSchema);
    },
    stop() {
      if (stopped) return;
      stopped = true;
      generation += 1;
      closeCurrent("client-stop");
      setStatus("stopped");
      rejectInitial?.(new GatewayConnectionClosedError("client-stop"));
      rejectInitial = undefined;
    },
  };
}
