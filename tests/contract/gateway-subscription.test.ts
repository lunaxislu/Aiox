import { describe, expect, it, vi } from "vitest";

import {
  createReconnectingGatewayClient,
  gatewayEventPayloadSchema,
  gatewaySubscribeParamsSchema,
  type GatewayTransport,
  type GatewayTransportHandlers,
} from "../../packages/protocol/src/index.js";
import { createGatewayState } from "../../apps/server/src/gateway/state/gateway-state.js";

const credential = "a".repeat(43);

class ScriptedTransport implements GatewayTransport {
  handlers: GatewayTransportHandlers | undefined;
  closed = false;

  constructor(
    private readonly snapshot: {
      server: { epoch: string; lifecycle: "running" };
      stateVersion: number;
      nextEventSeq: number;
    },
  ) {}

  send(data: string): void {
    const request = JSON.parse(data) as { id: string; method: string };
    expect(request.method).toBe("gateway.subscribe");
    this.handlers?.message(
      JSON.stringify({
        type: "res",
        id: request.id,
        ok: true,
        payload: this.snapshot,
      }),
    );
  }

  subscribe(handlers: GatewayTransportHandlers): () => void {
    this.handlers = handlers;
    return () => {
      if (this.handlers === handlers) this.handlers = undefined;
    };
  }

  close(): void {
    this.closed = true;
    this.handlers?.close("client-close");
  }

  event(
    seq: number,
    stateVersion: number,
    serverEpoch = this.snapshot.server.epoch,
  ): void {
    this.handlers?.message(
      JSON.stringify({
        type: "event",
        event: "server.lifecycle.changed",
        payload: {
          serverEpoch,
          data: { lifecycle: "running" },
        },
        seq,
        stateVersion,
      }),
    );
  }
}

describe("Gateway authenticated subscription contract", () => {
  it("validates credentials and epoch-bearing event payloads strictly", () => {
    expect(gatewaySubscribeParamsSchema.parse({ credential })).toEqual({
      credential,
    });
    expect(() =>
      gatewaySubscribeParamsSchema.parse({ credential, extra: true }),
    ).toThrow();
    expect(() =>
      gatewaySubscribeParamsSchema.parse({ credential: "short" }),
    ).toThrow();
    expect(
      gatewayEventPayloadSchema.parse({
        serverEpoch: "epoch-1",
        data: { lifecycle: "running" },
      }),
    ).toEqual({
      serverEpoch: "epoch-1",
      data: { lifecycle: "running" },
    });
  });

  it("captures snapshot and subscriber atomically, buffering events until activation", () => {
    const state = createGatewayState({ serverEpoch: "epoch-1" });
    const events: unknown[] = [];
    const subscription = state.subscribe((event) => events.push(event));

    state.setServerLifecycle("running");

    expect(subscription.snapshot).toEqual({
      server: { epoch: "epoch-1", lifecycle: "starting" },
      stateVersion: 0,
      nextEventSeq: 0,
    });
    expect(events).toEqual([]);

    subscription.activate();

    expect(events).toEqual([
      {
        type: "event",
        event: "server.lifecycle.changed",
        payload: {
          serverEpoch: "epoch-1",
          data: { lifecycle: "running" },
        },
        seq: 0,
        stateVersion: 1,
      },
    ]);
    expect(state.snapshot()).toMatchObject({
      stateVersion: 1,
      nextEventSeq: 1,
    });
  });

  it.each([
    ["sequence gap", { seq: 2, stateVersion: 2, serverEpoch: "epoch-1" }],
    ["version mismatch", { seq: 1, stateVersion: 3, serverEpoch: "epoch-1" }],
    ["epoch mismatch", { seq: 1, stateVersion: 2, serverEpoch: "epoch-2" }],
  ])(
    "replaces projection from a new snapshot after %s",
    async (_name, invalidEvent) => {
    const first = new ScriptedTransport({
      server: { epoch: "epoch-1", lifecycle: "running" },
      stateVersion: 0,
      nextEventSeq: 0,
    });
    const second = new ScriptedTransport({
      server: { epoch: "epoch-1", lifecycle: "running" },
      stateVersion: 5,
      nextEventSeq: 5,
    });
    const transports = [first, second];
    const snapshots: number[] = [];
    const events: number[] = [];
    let requestId = 0;

    const client = createReconnectingGatewayClient({
      getCredential: () => credential,
      createRequestId: () => `request-${requestId++}`,
      connect: async () => {
        const transport = transports.shift();
        if (!transport) throw new Error("unexpected reconnect");
        return transport;
      },
      onSnapshot: (snapshot) => snapshots.push(snapshot.stateVersion),
      onEvent: (event) => events.push(event.seq),
      waitBeforeReconnect: async () => {},
    });

    await client.start();
    first.event(0, 1);
    first.event(
      invalidEvent.seq,
      invalidEvent.stateVersion,
      invalidEvent.serverEpoch,
    );
    await vi.waitFor(() => expect(snapshots).toEqual([0, 5]));

    expect(events).toEqual([0]);
    expect(first.closed).toBe(true);
    client.stop();
    expect(second.closed).toBe(true);
    },
  );

  it("stops instead of retrying a non-retryable authentication failure", async () => {
    const failure = new ScriptedTransport({
      server: { epoch: "epoch-1", lifecycle: "running" },
      stateVersion: 0,
      nextEventSeq: 0,
    });
    failure.send = (data: string): void => {
      const request = JSON.parse(data) as { id: string };
      failure.handlers?.message(
        JSON.stringify({
          type: "res",
          id: request.id,
          ok: false,
          error: {
            code: "AUTH_FAILED",
            message: "Gateway authentication failed",
            retryable: false,
          },
        }),
      );
    };
    let connects = 0;
    const statuses: string[] = [];

    const client = createReconnectingGatewayClient({
      getCredential: () => credential,
      createRequestId: () => "auth-request",
      connect: async () => {
        connects += 1;
        return failure;
      },
      onSnapshot: () => {},
      onEvent: () => {},
      onStatus: (status) => statuses.push(status),
      waitBeforeReconnect: async () => {},
    });

    await expect(client.start()).rejects.toMatchObject({
      name: "GatewayRemoteError",
      code: "AUTH_FAILED",
      retryable: false,
    });
    expect(connects).toBe(1);
    expect(statuses).toEqual(["connecting", "stopped"]);
    expect(failure.closed).toBe(true);
  });
});
