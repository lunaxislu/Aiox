import {
  eventFrameSchema,
  type EventFrame,
  gatewaySnapshotSchema,
  type GatewaySnapshot,
  type LocalServerLifecycle,
} from "@aiox/protocol";

export interface GatewayStateSubscription {
  snapshot: GatewaySnapshot;
  activate(): void;
  unsubscribe(): void;
}

export interface GatewayState {
  snapshot(): GatewaySnapshot;
  subscribe(listener: (event: EventFrame) => void): GatewayStateSubscription;
  setServerLifecycle(lifecycle: LocalServerLifecycle): void;
}

export function createGatewayState({
  serverEpoch,
}: {
  serverEpoch: string;
}): GatewayState {
  let lifecycle: LocalServerLifecycle = "starting";
  let stateVersion = 0;
  let nextEventSeq = 0;
  const listeners = new Set<(event: EventFrame) => void>();

  function snapshot(): GatewaySnapshot {
    return gatewaySnapshotSchema.parse({
      server: { epoch: serverEpoch, lifecycle },
      stateVersion,
      nextEventSeq,
    });
  }

  return {
    snapshot,
    subscribe(listener) {
      const capturedSnapshot = snapshot();
      const buffer: EventFrame[] = [];
      let active = false;
      let subscribed = true;
      const bufferedListener = (event: EventFrame): void => {
        if (active) listener(event);
        else buffer.push(event);
      };
      listeners.add(bufferedListener);

      return {
        snapshot: capturedSnapshot,
        activate() {
          if (!subscribed || active) return;
          active = true;
          for (const event of buffer.splice(0)) listener(event);
        },
        unsubscribe() {
          if (!subscribed) return;
          subscribed = false;
          buffer.length = 0;
          listeners.delete(bufferedListener);
        },
      };
    },
    setServerLifecycle(nextLifecycle) {
      if (nextLifecycle === lifecycle) return;
      lifecycle = nextLifecycle;
      stateVersion += 1;
      const event = eventFrameSchema.parse({
        type: "event",
        event: "server.lifecycle.changed",
        payload: {
          serverEpoch,
          data: { lifecycle },
        },
        seq: nextEventSeq,
        stateVersion,
      });
      nextEventSeq += 1;
      for (const listener of listeners) listener(event);
    },
  };
}
