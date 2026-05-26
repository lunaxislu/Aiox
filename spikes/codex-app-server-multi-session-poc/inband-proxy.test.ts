import { afterEach, describe, expect, it } from "vitest";
import WebSocket, { WebSocketServer } from "ws";

import { startCodexInbandProxy, type ProxyObservation } from "./inband-proxy.js";

const servers: WebSocketServer[] = [];
const sockets: WebSocket[] = [];
const proxies: Array<{ close: () => Promise<void> }> = [];

afterEach(async () => {
  for (const socket of sockets.splice(0)) {
    socket.close();
  }

  for (const proxy of proxies.splice(0)) {
    await proxy.close();
  }

  for (const server of servers.splice(0)) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

describe("Codex in-band proxy spike", () => {
  it("relays JSON-RPC frames and records same-client thread/start responses", async () => {
    const upstream = new WebSocketServer({ port: 0 });
    servers.push(upstream);
    const upstreamPort = addressPort(upstream);
    const receivedByUpstream: string[] = [];

    upstream.on("connection", (socket) => {
      socket.on("message", (data) => {
        const text = data.toString("utf8");
        receivedByUpstream.push(text);
        const request = JSON.parse(text) as { id: number; method: string };

        socket.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            result: {
              thread: {
                id: "thread-from-start-response",
              },
            },
          }),
        );
      });
    });

    const observations: ProxyObservation[] = [];
    const proxy = await startCodexInbandProxy({
      listenHost: "127.0.0.1",
      listenPort: 0,
      upstreamUrl: `ws://127.0.0.1:${upstreamPort}`,
      observe: (event) => observations.push(event),
    });
    proxies.push(proxy);

    const client = new WebSocket(proxy.url);
    sockets.push(client);
    await onceOpen(client);

    client.send(JSON.stringify({ jsonrpc: "2.0", id: 7, method: "thread/start", params: {} }));
    const response = await onceMessage(client);

    expect(JSON.parse(receivedByUpstream[0]!)).toMatchObject({
      id: 7,
      method: "thread/start",
    });
    expect(JSON.parse(response)).toMatchObject({
      id: 7,
      result: { thread: { id: "thread-from-start-response" } },
    });
    expect(observations).toContainEqual({
      type: "binding_candidate",
      method: "thread/start",
      requestId: 7,
      threadId: "thread-from-start-response",
    });
  });

  it("records same-client thread/resume responses as binding candidates", async () => {
    const upstream = new WebSocketServer({ port: 0 });
    servers.push(upstream);
    const upstreamPort = addressPort(upstream);

    upstream.on("connection", (socket) => {
      socket.on("message", (data) => {
        const request = JSON.parse(data.toString("utf8")) as { id: number; method: string };

        socket.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            result: {
              thread: {
                id: "thread-from-resume-response",
              },
            },
          }),
        );
      });
    });

    const observations: ProxyObservation[] = [];
    const proxy = await startCodexInbandProxy({
      listenHost: "127.0.0.1",
      listenPort: 0,
      upstreamUrl: `ws://127.0.0.1:${upstreamPort}`,
      observe: (event) => observations.push(event),
    });
    proxies.push(proxy);

    const client = new WebSocket(proxy.url);
    sockets.push(client);
    await onceOpen(client);

    client.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 9,
        method: "thread/resume",
        params: { threadId: "thread-from-resume-response" },
      }),
    );
    await onceMessage(client);

    expect(observations).toContainEqual({
      type: "binding_candidate",
      method: "thread/resume",
      requestId: 9,
      threadId: "thread-from-resume-response",
    });
  });

  it("does not bind from broadcast thread/started notifications alone", async () => {
    const upstream = new WebSocketServer({ port: 0 });
    servers.push(upstream);
    const upstreamPort = addressPort(upstream);

    upstream.on("connection", (socket) => {
      socket.send(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "thread/started",
          params: { thread: { id: "broadcast-thread-id" } },
        }),
      );
    });

    const observations: ProxyObservation[] = [];
    const proxy = await startCodexInbandProxy({
      listenHost: "127.0.0.1",
      listenPort: 0,
      upstreamUrl: `ws://127.0.0.1:${upstreamPort}`,
      observe: (event) => observations.push(event),
    });
    proxies.push(proxy);

    const client = new WebSocket(proxy.url);
    sockets.push(client);
    await onceOpen(client);
    const notification = await onceMessage(client);

    expect(JSON.parse(notification)).toMatchObject({
      method: "thread/started",
      params: { thread: { id: "broadcast-thread-id" } },
    });
    expect(observations).not.toContainEqual(
      expect.objectContaining({
        type: "binding_candidate",
        threadId: "broadcast-thread-id",
      }),
    );
  });
});

function addressPort(server: WebSocketServer): number {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected TCP server address");
  }
  return address.port;
}

async function onceOpen(socket: WebSocket): Promise<void> {
  if (socket.readyState === WebSocket.OPEN) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    socket.once("open", () => resolve());
    socket.once("error", reject);
  });
}

async function onceMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    socket.once("message", (data) => resolve(data.toString("utf8")));
    socket.once("error", reject);
  });
}
