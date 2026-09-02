import { describe, expect, it } from "vitest";

import {
  createGatewayClient,
  eventFrameSchema,
  gatewaySnapshotSchema,
  GatewayConnectionClosedError,
  GatewayProtocolError,
  GatewayRemoteError,
  type GatewayTransport,
  requestFrameSchema,
  responseFrameSchema,
} from "../../packages/protocol/src/index.js";

class TestTransport implements GatewayTransport {
  readonly sent: string[] = [];
  private handlers?: Parameters<GatewayTransport["subscribe"]>[0];

  send(data: string): void {
    this.sent.push(data);
  }

  subscribe(
    handlers: Parameters<GatewayTransport["subscribe"]>[0],
  ): () => void {
    this.handlers = handlers;
    return () => {
      this.handlers = undefined;
    };
  }

  receive(frame: unknown): void {
    this.handlers?.message(JSON.stringify(frame));
  }

  receiveRaw(data: string): void {
    this.handlers?.message(data);
  }

  close(reason?: unknown): void {
    this.handlers?.close(reason);
  }
}

describe("Gateway protocol frames", () => {
  it("accepts a strict request frame and rejects malformed wire input", () => {
    expect(
      requestFrameSchema.parse({
        type: "req",
        id: "request-1",
        method: "server.status",
        params: { verbose: true },
      }),
    ).toEqual({
      type: "req",
      id: "request-1",
      method: "server.status",
      params: { verbose: true },
    });

    expect(
      requestFrameSchema.safeParse({
        type: "req",
        id: "request-1",
        method: "server.status",
        extra: true,
      }).success,
    ).toBe(false);
    expect(
      requestFrameSchema.safeParse({
        type: "req",
        id: "",
        method: "server.status",
      }).success,
    ).toBe(false);
  });

  it("distinguishes success, typed error, and sequenced event frames", () => {
    expect(
      responseFrameSchema.parse({
        type: "res",
        id: "request-1",
        ok: true,
        payload: { ready: true },
      }),
    ).toMatchObject({ ok: true, payload: { ready: true } });

    expect(
      responseFrameSchema.parse({
        type: "res",
        id: "request-2",
        ok: false,
        error: {
          code: "server_not_ready",
          message: "Local Server is not ready",
          retryable: true,
        },
      }),
    ).toMatchObject({
      ok: false,
      error: { code: "server_not_ready", retryable: true },
    });

    expect(
      eventFrameSchema.parse({
        type: "event",
        event: "server.lifecycle.changed",
        payload: { lifecycle: "running" },
        seq: 4,
        stateVersion: 2,
      }),
    ).toMatchObject({ seq: 4, stateVersion: 2 });

    expect(
      eventFrameSchema.safeParse({
        type: "event",
        event: "server.lifecycle.changed",
        payload: {},
        seq: -1,
      }).success,
    ).toBe(false);
    expect(
      responseFrameSchema.safeParse({
        type: "res",
        id: "request-3",
        ok: true,
      }).success,
    ).toBe(false);
    expect(
      eventFrameSchema.safeParse({
        type: "event",
        event: "server.lifecycle.changed",
        seq: 5,
      }).success,
    ).toBe(false);
  });

  it("validates the authoritative Stage 2 server snapshot cursor", () => {
    expect(
      gatewaySnapshotSchema.parse({
        server: {
          epoch: "epoch-1",
          lifecycle: "running",
        },
        stateVersion: 3,
        nextEventSeq: 8,
      }),
    ).toEqual({
      server: {
        epoch: "epoch-1",
        lifecycle: "running",
      },
      stateVersion: 3,
      nextEventSeq: 8,
    });

    expect(
      gatewaySnapshotSchema.safeParse({
        server: {
          epoch: "epoch-1",
          lifecycle: "ready",
        },
        stateVersion: 3,
        nextEventSeq: 8,
      }).success,
    ).toBe(false);
  });
});

describe("Gateway client", () => {
  it("correlates a validated response with its request ID", async () => {
    const transport = new TestTransport();
    const client = createGatewayClient({
      transport,
      createRequestId: () => "request-1",
    });

    const result = client.request(
      "gateway.snapshot",
      undefined,
      gatewaySnapshotSchema,
    );

    expect(JSON.parse(transport.sent[0] ?? "null")).toEqual({
      type: "req",
      id: "request-1",
      method: "gateway.snapshot",
    });

    transport.receive({
      type: "res",
      id: "request-1",
      ok: true,
      payload: {
        server: { epoch: "epoch-1", lifecycle: "running" },
        stateVersion: 1,
        nextEventSeq: 2,
      },
    });

    await expect(result).resolves.toMatchObject({
      server: { epoch: "epoch-1", lifecycle: "running" },
      nextEventSeq: 2,
    });
  });

  it("rejects a failed response with a typed Gateway error", async () => {
    const transport = new TestTransport();
    const client = createGatewayClient({
      transport,
      createRequestId: () => "request-2",
    });

    const result = client.request(
      "gateway.snapshot",
      undefined,
      gatewaySnapshotSchema,
    );
    transport.receive({
      type: "res",
      id: "request-2",
      ok: false,
      error: {
        code: "not_authenticated",
        message: "Authentication required",
        retryable: false,
      },
    });

    await expect(result).rejects.toMatchObject({
      name: "GatewayRemoteError",
      code: "not_authenticated",
      message: "Authentication required",
      retryable: false,
    });
    await expect(result).rejects.toBeInstanceOf(GatewayRemoteError);
  });

  it("delivers only validated event frames to subscribers", () => {
    const transport = new TestTransport();
    const client = createGatewayClient({
      transport,
      createRequestId: () => "unused",
    });
    const events: unknown[] = [];
    const unsubscribe = client.onEvent((event) => events.push(event));

    transport.receive({
      type: "event",
      event: "server.lifecycle.changed",
      payload: { lifecycle: "quiescing" },
      seq: 9,
      stateVersion: 4,
    });
    transport.receive({
      type: "event",
      event: "server.lifecycle.changed",
      payload: {},
      seq: -1,
    });

    expect(events).toEqual([
      {
        type: "event",
        event: "server.lifecycle.changed",
        payload: { lifecycle: "quiescing" },
        seq: 9,
        stateVersion: 4,
      },
    ]);

    unsubscribe();
    transport.receive({
      type: "event",
      event: "server.lifecycle.changed",
      payload: { lifecycle: "running" },
      seq: 10,
    });
    expect(events).toHaveLength(1);
  });

  it("reports malformed inbound text as a typed protocol error", () => {
    const transport = new TestTransport();
    const client = createGatewayClient({
      transport,
      createRequestId: () => "unused",
    });
    const errors: GatewayProtocolError[] = [];
    client.onProtocolError((error) => errors.push(error));

    transport.receiveRaw("{");
    transport.receive({ type: "event", event: "broken", payload: {}, seq: -1 });

    expect(errors).toHaveLength(2);
    expect(errors[0]).toBeInstanceOf(GatewayProtocolError);
    expect(errors[0]).toMatchObject({
      name: "GatewayProtocolError",
      message: "Gateway sent malformed JSON",
    });
    expect(errors[1]?.message).toBe("Gateway sent an invalid frame");
  });

  it("rejects a correlated response whose payload violates its schema", async () => {
    const transport = new TestTransport();
    const client = createGatewayClient({
      transport,
      createRequestId: () => "request-3",
    });
    const errors: GatewayProtocolError[] = [];
    client.onProtocolError((error) => errors.push(error));

    const result = client.request(
      "gateway.snapshot",
      undefined,
      gatewaySnapshotSchema,
    );
    transport.receive({
      type: "res",
      id: "request-3",
      ok: true,
      payload: { stateVersion: 1, nextEventSeq: 1 },
    });

    await expect(result).rejects.toBeInstanceOf(GatewayProtocolError);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe(
      "Gateway response payload failed runtime validation",
    );
  });

  it("rejects pending requests with a typed connection-closed error", async () => {
    const transport = new TestTransport();
    const client = createGatewayClient({
      transport,
      createRequestId: () => "request-4",
    });

    const result = client.request(
      "gateway.snapshot",
      undefined,
      gatewaySnapshotSchema,
    );
    transport.close("peer closed");

    await expect(result).rejects.toMatchObject({
      name: "GatewayConnectionClosedError",
      message: "Gateway connection closed",
      reason: "peer closed",
    });
    await expect(result).rejects.toBeInstanceOf(GatewayConnectionClosedError);
  });

  it("reports a response ID that does not correlate to a pending request", () => {
    const transport = new TestTransport();
    const client = createGatewayClient({
      transport,
      createRequestId: () => "unused",
    });
    const errors: GatewayProtocolError[] = [];
    client.onProtocolError((error) => errors.push(error));

    transport.receive({
      type: "res",
      id: "unknown-request",
      ok: true,
      payload: {},
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe(
      "Gateway response ID does not match a pending request",
    );
  });

  it("rejects a duplicate pending request ID before sending another frame", async () => {
    const transport = new TestTransport();
    const client = createGatewayClient({
      transport,
      createRequestId: () => "duplicate-id",
    });

    const first = client.request(
      "gateway.snapshot",
      undefined,
      gatewaySnapshotSchema,
    );
    const duplicate = client.request(
      "gateway.snapshot",
      undefined,
      gatewaySnapshotSchema,
    );

    expect(transport.sent).toHaveLength(1);
    await expect(duplicate).rejects.toMatchObject({
      name: "GatewayProtocolError",
      message: "Gateway request ID is already pending",
    });

    transport.close();
    await expect(first).rejects.toBeInstanceOf(GatewayConnectionClosedError);
  });

  it("does not send a request that fails local frame validation", async () => {
    const transport = new TestTransport();
    const client = createGatewayClient({
      transport,
      createRequestId: () => "",
    });

    const result = client.request(
      "gateway.snapshot",
      undefined,
      gatewaySnapshotSchema,
    );

    expect(transport.sent).toHaveLength(0);
    await expect(result).rejects.toMatchObject({
      name: "GatewayProtocolError",
      message: "Gateway request failed runtime validation",
    });
  });

  it("disposes the transport subscription and rejects pending work", async () => {
    const transport = new TestTransport();
    const client = createGatewayClient({
      transport,
      createRequestId: () => "request-5",
    });
    const events: unknown[] = [];
    client.onEvent((event) => events.push(event));
    const pending = client.request(
      "gateway.snapshot",
      undefined,
      gatewaySnapshotSchema,
    );

    client.dispose("reconnecting");
    transport.receive({
      type: "event",
      event: "server.lifecycle.changed",
      payload: { lifecycle: "running" },
      seq: 1,
    });

    expect(events).toEqual([]);
    await expect(pending).rejects.toMatchObject({
      name: "GatewayConnectionClosedError",
      reason: "reconnecting",
    });
  });
});
