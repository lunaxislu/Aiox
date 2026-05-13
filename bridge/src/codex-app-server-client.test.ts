import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate as waitImmediate } from "node:timers/promises";

import {
  CodexAppServerClient,
  type WebSocketEvent,
  type WebSocketLike,
} from "./codex-app-server-client.js";

type JsonRpcRequest = {
  id: number;
  method: string;
  params: unknown;
};

class FakeWebSocket implements WebSocketLike {
  static instances: FakeWebSocket[] = [];

  readonly sent: JsonRpcRequest[] = [];
  readyState = 0;

  private readonly listeners = new Map<
    string,
    Array<(event: WebSocketEvent) => void>
  >();

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  addEventListener(
    event: "close" | "error" | "message" | "open",
    listener: (event: WebSocketEvent) => void,
  ): void {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  close(): void {
    this.readyState = 3;
    this.emit("close", {});
  }

  send(data: string): void {
    this.sent.push(JSON.parse(data) as JsonRpcRequest);
  }

  open(): void {
    this.readyState = 1;
    this.emit("open", {});
  }

  respond(requestIndex: number, result: unknown): void {
    const request = this.sent[requestIndex];
    assert.ok(request);
    this.emit("message", {
      data: JSON.stringify({ jsonrpc: "2.0", id: request.id, result }),
    });
  }

  private emit(event: string, payload: WebSocketEvent): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(payload);
    }
  }
}

class UnavailableWebSocket implements WebSocketLike {
  readonly readyState = 3;

  constructor() {
    throw new Error("connection refused");
  }

  addEventListener(): void {}

  close(): void {}

  send(): void {}
}

function createClient(): CodexAppServerClient {
  FakeWebSocket.instances = [];
  return new CodexAppServerClient({
    clientName: "bridge",
    clientVersion: "0.2.0",
    timeoutMs: 1_000,
    url: "ws://127.0.0.1:4500",
    webSocketCtor: FakeWebSocket,
  });
}

async function connectClient(
  client: CodexAppServerClient,
): Promise<FakeWebSocket> {
  const connectPromise = client.connect();
  const ws = FakeWebSocket.instances[0];
  assert.ok(ws);
  ws.open();
  ws.respond(0, { userAgent: "fake-codex" });
  await connectPromise;
  return ws;
}

test("connect sends initialize request", async () => {
  const client = createClient();
  const ws = await connectClient(client);

  assert.deepEqual(ws.sent[0], {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      clientInfo: { name: "bridge", version: "0.2.0" },
      protocolVersion: "1",
      capabilities: {},
    },
  });
});

test("discoverThreadId sends thread/loaded/list request", async () => {
  const client = createClient();
  const ws = await connectClient(client);

  const threadPromise = client.discoverThreadId();
  assert.deepEqual(ws.sent[1], {
    jsonrpc: "2.0",
    id: 2,
    method: "thread/loaded/list",
    params: {},
  });
  ws.respond(1, { data: ["thread-1"] });

  assert.equal(await threadPromise, "thread-1");
});

test("dispatchPrompt sends turn/start with wrapped relay prompt", async () => {
  const client = createClient();
  const ws = await connectClient(client);

  const dispatchPromise = client.dispatchPrompt("pong from claude", "chat-123");
  await waitImmediate();
  ws.respond(1, { data: ["thread-1"] });
  await waitImmediate();
  assert.equal(ws.sent[2]?.method, "turn/start");
  const params = ws.sent[2]?.params as {
    input: Array<{ text: string; type: string }>;
    threadId: string;
  };
  assert.equal(params.threadId, "thread-1");
  assert.deepEqual(params.input[0]?.type, "text");
  assert.match(params.input[0]?.text ?? "", /^\[MCP RELAY — chat_id: chat-123\]/);
  assert.match(params.input[0]?.text ?? "", /Message from Claude:\npong from claude$/);
  ws.respond(2, { turnId: "turn-1" });

  assert.deepEqual(await dispatchPromise, {
    threadId: "thread-1",
    turnId: "turn-1",
  });
});

test("discoverThreadId rejects when no loaded thread exists", async () => {
  const client = createClient();
  const ws = await connectClient(client);

  const threadPromise = client.discoverThreadId();
  ws.respond(1, { data: [] });

  await assert.rejects(threadPromise, /No loaded Codex thread/);
});

test("connect rejects when app-server websocket is unavailable", async () => {
  const client = new CodexAppServerClient({
    clientName: "bridge",
    clientVersion: "0.2.0",
    timeoutMs: 1_000,
    url: "ws://127.0.0.1:4500",
    webSocketCtor: UnavailableWebSocket,
  });

  await assert.rejects(
    client.connect(),
    /Failed to open WebSocket to Codex app-server.*connection refused/,
  );
});
