import { afterEach, describe, expect, it } from "vitest";
import WebSocket, { WebSocketServer } from "ws";

import {
  startCodexAgentProxy,
  type CodexAgentProxy,
  type CodexProxyBindingEvent,
} from "../../../src/adapters/codex/proxy.js";

const servers: WebSocketServer[] = [];
const sockets: WebSocket[] = [];
const proxies: CodexAgentProxy[] = [];

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

describe("Codex per-agent transparent proxy", () => {
  it("emits binding event for same-client thread/start success response", async () => {
    const { proxyUrl, bindings, client } = await setup({
      respond: (request) => ({
        jsonrpc: "2.0",
        id: request.id,
        result: { thread: { id: "thread-from-start" } },
      }),
    });

    client.send(
      JSON.stringify({ jsonrpc: "2.0", id: 7, method: "thread/start", params: {} }),
    );
    await onceMessage(client);

    expect(bindings).toEqual([
      { method: "thread/start", threadId: "thread-from-start", requestId: 7 },
    ]);

    await closeProxy(proxyUrl);
  });

  it("emits binding event for same-client thread/resume success response", async () => {
    const { client, bindings } = await setup({
      respond: (request) => ({
        jsonrpc: "2.0",
        id: request.id,
        result: { thread: { id: "thread-from-resume" } },
      }),
    });

    client.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 9,
        method: "thread/resume",
        params: { threadId: "thread-from-resume" },
      }),
    );
    await onceMessage(client);

    expect(bindings).toEqual([
      { method: "thread/resume", threadId: "thread-from-resume", requestId: 9 },
    ]);
  });

  it("emits binding event with response result.thread.id for thread/fork (not params.threadId)", async () => {
    const { client, bindings } = await setup({
      respond: (request) => ({
        jsonrpc: "2.0",
        id: request.id,
        result: {
          thread: {
            id: "fork-target",
            forkedFromId: "fork-source",
          },
        },
      }),
    });

    client.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 20,
        method: "thread/fork",
        params: { threadId: "fork-source" },
      }),
    );
    await onceMessage(client);

    expect(bindings).toEqual([
      { method: "thread/fork", threadId: "fork-target", requestId: 20 },
    ]);
  });

  it("does not bind when response is an error", async () => {
    const { client, bindings } = await setup({
      respond: (request) => ({
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32000, message: "boom" },
      }),
    });

    client.send(
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "thread/start", params: {} }),
    );
    await onceMessage(client);

    expect(bindings).toEqual([]);
  });

  it("does not bind when response result has no thread id", async () => {
    const { client, bindings } = await setup({
      respond: (request) => ({
        jsonrpc: "2.0",
        id: request.id,
        result: { thread: {} },
      }),
    });

    client.send(
      JSON.stringify({ jsonrpc: "2.0", id: 2, method: "thread/start", params: {} }),
    );
    await onceMessage(client);

    expect(bindings).toEqual([]);
  });

  it("preserves binding order so later success supersedes earlier", async () => {
    const { client, bindings } = await setup({
      respond: (request) => ({
        jsonrpc: "2.0",
        id: request.id,
        result: { thread: { id: `thread-${String(request.id)}` } },
      }),
    });

    client.send(
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "thread/start", params: {} }),
    );
    await onceMessage(client);
    client.send(
      JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "thread/resume",
        params: { threadId: "thread-2" },
      }),
    );
    await onceMessage(client);

    expect(bindings).toEqual([
      { method: "thread/start", threadId: "thread-1", requestId: 1 },
      { method: "thread/resume", threadId: "thread-2", requestId: 2 },
    ]);
  });

  it("relays JSON frames transparently in both directions", async () => {
    const received: string[] = [];
    const { client, bindings } = await setup({
      respond: (request) => {
        received.push(JSON.stringify(request));
        return {
          jsonrpc: "2.0",
          method: "thread/started",
          params: { thread: { id: "ignored-broadcast" } },
        };
      },
    });

    client.send(JSON.stringify({ hello: "world" }));
    const reply = await onceMessage(client);

    expect(JSON.parse(received[0]!)).toEqual({ hello: "world" });
    expect(JSON.parse(reply)).toEqual({
      jsonrpc: "2.0",
      method: "thread/started",
      params: { thread: { id: "ignored-broadcast" } },
    });
    expect(bindings).toEqual([]);
  });

  it("does not bind non-binding methods such as turn/start", async () => {
    const { client, bindings } = await setup({
      respond: (request) => ({
        jsonrpc: "2.0",
        id: request.id,
        result: { thread: { id: "should-not-bind" } },
      }),
    });

    client.send(
      JSON.stringify({ jsonrpc: "2.0", id: 5, method: "turn/start", params: {} }),
    );
    await onceMessage(client);

    expect(bindings).toEqual([]);
  });
});

type JsonRpcRequest = { id?: number | string; method?: string; params?: unknown };

async function setup(options: {
  respond: (request: JsonRpcRequest) => Record<string, unknown>;
}): Promise<{
  proxyUrl: string;
  client: WebSocket;
  bindings: CodexProxyBindingEvent[];
}> {
  const upstream = new WebSocketServer({ port: 0 });
  servers.push(upstream);
  upstream.on("connection", (socket) => {
    socket.on("message", (data) => {
      const text = data.toString("utf8");
      const request = JSON.parse(text) as JsonRpcRequest;
      socket.send(JSON.stringify(options.respond(request)));
    });
  });
  const upstreamPort = addressPort(upstream);

  const bindings: CodexProxyBindingEvent[] = [];
  const proxy = await startCodexAgentProxy({
    upstreamUrl: `ws://127.0.0.1:${upstreamPort}`,
    listenHost: "127.0.0.1",
    listenPort: 0,
    onBinding: (event) => bindings.push(event),
  });
  proxies.push(proxy);

  const client = new WebSocket(proxy.url);
  sockets.push(client);
  await onceOpen(client);

  return { proxyUrl: proxy.url, client, bindings };
}

async function closeProxy(_proxyUrl: string): Promise<void> {
  // proxy is tracked in `proxies` and closed in afterEach.
}

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
