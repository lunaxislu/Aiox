import {
  createReconnectingGatewayClient,
  gatewayEventPayloadSchema,
  localServerLifecycleSchema,
  serverStopMethod,
  serverStopResultSchema,
  sessionCredentialSchema,
  type GatewayConnectionStatus,
  type GatewaySnapshot,
  type ReconnectGatewayTransport,
  type ServerStopResult,
} from "@aiox/protocol";
import { connectBrowserControlWebSocket } from "./browser-transport.js";

export interface GatewayStoreState {
  connection: GatewayConnectionStatus;
  snapshot?: GatewaySnapshot;
  stopPending: boolean;
  lastStopResult?: ServerStopResult;
  error?: string;
}

export interface GatewayStore {
  getState(): GatewayStoreState;
  subscribe(listener: () => void): () => void;
  start(): Promise<void>;
  dispose(): void;
  requestServerStop(force: boolean): Promise<ServerStopResult>;
}

export interface GatewayStoreOptions {
  credential: string;
  connect?: () => Promise<ReconnectGatewayTransport>;
  createRequestId?: () => string;
  waitBeforeReconnect?: (attempt: number) => Promise<void>;
}

function browserReconnectDelay(attempt: number): Promise<void> {
  const milliseconds = Math.min(2_000, 100 * 2 ** Math.min(attempt, 4));
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function lifecycleFromEventData(data: unknown) {
  if (typeof data !== "object" || data === null) return undefined;
  if (Object.keys(data).length !== 1) return undefined;
  const parsed = localServerLifecycleSchema.safeParse(
    (data as { lifecycle?: unknown }).lifecycle,
  );
  return parsed.success ? parsed.data : undefined;
}

export function createGatewayStore(options: GatewayStoreOptions): GatewayStore {
  const credential = sessionCredentialSchema.parse(options.credential);
  const listeners = new Set<() => void>();
  let requestSequence = 0;
  let state: GatewayStoreState = {
    connection: "connecting",
    stopPending: false,
  };

  function update(next: GatewayStoreState): void {
    state = next;
    for (const listener of listeners) listener();
  }

  const client = createReconnectingGatewayClient({
    getCredential: () => credential,
    createRequestId:
      options.createRequestId ?? (() => `web-${requestSequence++}`),
    connect: options.connect ?? connectBrowserControlWebSocket,
    waitBeforeReconnect:
      options.waitBeforeReconnect ?? browserReconnectDelay,
    onStatus(connection) {
      update({ ...state, connection });
    },
    onConnectionError(error) {
      update({
        ...state,
        error: error instanceof Error ? error.message : String(error),
      });
    },
    onSnapshot(snapshot) {
      update({
        ...state,
        snapshot,
        error: undefined,
      });
    },
    onEvent(event) {
      const payload = gatewayEventPayloadSchema.safeParse(event.payload);
      const lifecycle = payload.success
        ? lifecycleFromEventData(payload.data.data)
        : undefined;
      if (
        event.event !== "server.lifecycle.changed" ||
        !lifecycle ||
        !state.snapshot
      ) {
        return;
      }
      update({
        ...state,
        snapshot: {
          ...state.snapshot,
          server: { ...state.snapshot.server, lifecycle },
          stateVersion: event.stateVersion ?? state.snapshot.stateVersion,
          nextEventSeq: event.seq + 1,
        },
      });
    },
  });

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: () => client.start(),
    dispose() {
      client.stop();
      listeners.clear();
    },
    async requestServerStop(force) {
      if (state.stopPending) {
        throw new Error("A server stop request is already pending");
      }
      update({ ...state, stopPending: true, error: undefined });
      try {
        const result = await client.request(
          serverStopMethod,
          { force },
          serverStopResultSchema,
        );
        update({ ...state, stopPending: false, lastStopResult: result });
        return result;
      } catch (error) {
        update({
          ...state,
          stopPending: false,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  };
}
