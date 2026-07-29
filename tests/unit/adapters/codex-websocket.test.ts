import { createServer, type Server } from "node:http";

import { afterEach, describe, expect, it } from "vitest";
import { WebSocketServer, type WebSocket } from "ws";

import {
  CodexAppServerWebSocketError,
  connectCodexAppServerWebSocket,
} from "../../../src/adapters/codex/websocket.js";

describe("Codex app-server WebSocket client", () => {
  const servers: Server[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            });
          }),
      ),
    );
    servers.length = 0;
  });

  it("connects and completes the initialize handshake with schema-minimal params", async () => {
    const seenRequests: unknown[] = [];
    const endpoint = await listen((socket) => {
      socket.on("message", (raw) => {
        const request = JSON.parse(String(raw)) as JsonRpcRequest;
        seenRequests.push(request);
        socket.send(
          JSON.stringify({
            id: request.id,
            result: {
              userAgent: "aiox/1.0.0",
              codexHome: "/tmp/codex",
              platformFamily: "unix",
              platformOs: "macos",
            },
          }),
        );
      });
    });

    const client = await connectCodexAppServerWebSocket({
      endpoint,
      clientVersion: "1.0.0",
    });
    const response = await client.initialize();

    expect(response).toMatchObject({
      userAgent: "aiox/1.0.0",
      codexHome: "/tmp/codex",
    });
    expect(seenRequests).toEqual([
      {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          clientInfo: {
            name: "aiox",
            version: "1.0.0",
          },
          capabilities: {
            experimentalApi: false,
          },
        },
      },
    ]);

    client.close();
  });

  it("wraps initialize request failures with a typed initialize error", async () => {
    const endpoint = await listen((socket) => {
      socket.on("message", (raw) => {
        const request = JSON.parse(String(raw)) as JsonRpcRequest;
        socket.send(
          JSON.stringify({
            id: request.id,
            error: {
              code: -32602,
              message: "bad initialize",
            },
          }),
        );
      });
    });

    const client = await connectCodexAppServerWebSocket({ endpoint });

    await expect(client.initialize()).rejects.toMatchObject({
      code: "codex_app_server_ws_initialize_failed",
      message: expect.stringContaining("bad initialize"),
    });

    client.close();
  });

  it("matches responses to the originating request id", async () => {
    const endpoint = await listen((socket) => {
      const requests: JsonRpcRequest[] = [];
      socket.on("message", (raw) => {
        const request = JSON.parse(String(raw)) as JsonRpcRequest;
        requests.push(request);

        if (requests.length === 2) {
          socket.send(JSON.stringify({ id: requests[1].id, result: "second" }));
          socket.send(JSON.stringify({ id: requests[0].id, result: "first" }));
        }
      });
    });
    const client = await connectCodexAppServerWebSocket({ endpoint });

    const first = client.request("first");
    const second = client.request("second");

    await expect(first).resolves.toBe("first");
    await expect(second).resolves.toBe("second");

    client.close();
  });

  it("exposes notifications through a listener channel", async () => {
    const endpoint = await listen((socket) => {
      socket.on("message", (raw) => {
        const request = JSON.parse(String(raw)) as JsonRpcRequest;
        socket.send(
          JSON.stringify({
            method: "thread/started",
            params: { thread: { id: "thread-1" } },
          }),
        );
        socket.send(JSON.stringify({ id: request.id, result: "ok" }));
      });
    });
    const client = await connectCodexAppServerWebSocket({ endpoint });
    const notifications: unknown[] = [];
    client.onNotification((notification) => {
      notifications.push(notification);
    });

    await client.request("thread/start");

    expect(notifications).toEqual([
      {
        method: "thread/started",
        params: { thread: { id: "thread-1" } },
      },
    ]);

    client.close();
  });

  it("times out pending requests with the requested typed error", async () => {
    const endpoint = await listen((_socket) => undefined);
    const client = await connectCodexAppServerWebSocket({
      endpoint,
      requestTimeoutMs: 5,
    });

    await expect(
      client.request("turn/start", {}, { timeoutErrorCode: "codex_turn_start_timeout" }),
    ).rejects.toMatchObject({
      code: "codex_turn_start_timeout",
    });

    client.close();
  });

  it("observes a same-request late success after timeout without resolving the original request", async () => {
    let requestId: number | undefined;
    let appServer: WebSocket | undefined;
    const endpoint = await listen((socket) => {
      appServer = socket;
      socket.on("message", (raw) => {
        requestId = (JSON.parse(String(raw)) as JsonRpcRequest).id;
      });
    });
    const client = await connectCodexAppServerWebSocket({
      endpoint,
      requestTimeoutMs: 5,
    });
    const lateResponses: unknown[] = [];

    await expect(
      client.request("turn/start", {}, {
        timeoutErrorCode: "codex_turn_start_timeout",
        onLateResponse: (response) => lateResponses.push(response),
      }),
    ).rejects.toMatchObject({ code: "codex_turn_start_timeout" });

    appServer?.send(JSON.stringify({ id: requestId, result: { accepted: true } }));

    await expect.poll(() => lateResponses).toEqual([
      { id: requestId, result: { accepted: true } },
    ]);
    client.close();
  });

  it("expires a late-response observer deterministically before a same-request response arrives", async () => {
    let requestId: number | undefined;
    let appServer: WebSocket | undefined;
    const scheduler = new ManualScheduler();
    const endpoint = await listen((socket) => {
      appServer = socket;
      socket.on("message", (raw) => {
        requestId = (JSON.parse(String(raw)) as JsonRpcRequest).id;
      });
    });
    const client = await connectCodexAppServerWebSocket({ endpoint, scheduler });
    const lateResponses: unknown[] = [];
    const request = client.request("turn/start", {}, {
      timeoutMs: 10,
      timeoutErrorCode: "codex_turn_start_timeout",
      onLateResponse: (response) => lateResponses.push(response),
    });

    await expect.poll(() => requestId).toBe(1);
    scheduler.advanceBy(10);
    await expect(request).rejects.toMatchObject({ code: "codex_turn_start_timeout" });
    expect(scheduler.pendingCount).toBe(1);

    scheduler.advanceBy(5 * 60_000);
    expect(scheduler.pendingCount).toBe(0);
    appServer?.send(JSON.stringify({ id: requestId, result: { accepted: true } }));

    await expect.poll(() => lateResponses).toEqual([]);
    client.close();
  });

  it("cleans a timed-out observer when its socket closes without invoking it", async () => {
    let requestId: number | undefined;
    let appServer: WebSocket | undefined;
    const scheduler = new ManualScheduler();
    const endpoint = await listen((socket) => {
      appServer = socket;
      socket.on("message", (raw) => {
        requestId = (JSON.parse(String(raw)) as JsonRpcRequest).id;
      });
    });
    const client = await connectCodexAppServerWebSocket({ endpoint, scheduler });
    const lateResponses: unknown[] = [];
    let closeObserved = false;
    client.onClose(() => {
      closeObserved = true;
    });
    const request = client.request("turn/start", {}, {
      timeoutMs: 10,
      timeoutErrorCode: "codex_turn_start_timeout",
      onLateResponse: (response) => lateResponses.push(response),
    });

    await expect.poll(() => requestId).toBe(1);
    scheduler.advanceBy(10);
    await expect(request).rejects.toMatchObject({ code: "codex_turn_start_timeout" });
    expect(scheduler.pendingCount).toBe(1);

    appServer?.close(1000, "dropped");
    await expect.poll(() => closeObserved).toBe(true);
    expect(scheduler.pendingCount).toBe(0);
    scheduler.advanceBy(5 * 60_000);
    expect(lateResponses).toEqual([]);
  });

  it("passes JSON-RPC error code and message through", async () => {
    const endpoint = await listen((socket) => {
      socket.on("message", (raw) => {
        const request = JSON.parse(String(raw)) as JsonRpcRequest;
        socket.send(
          JSON.stringify({
            id: request.id,
            error: {
              code: -32001,
              message: "codex said no",
            },
          }),
        );
      });
    });
    const client = await connectCodexAppServerWebSocket({ endpoint });

    await expect(client.request("turn/start")).rejects.toMatchObject({
      code: "codex_jsonrpc_error",
      jsonRpcCode: -32001,
      message: "codex said no",
    });

    client.close();
  });

  it("rejects pending requests with typed ws_dropped when the socket closes", async () => {
    const endpoint = await listen((socket) => {
      socket.on("message", () => {
        socket.close(1000, "dropped");
      });
    });
    const client = await connectCodexAppServerWebSocket({ endpoint });

    await expect(client.request("turn/start")).rejects.toMatchObject({
      code: "codex_app_server_ws_dropped",
      message: expect.stringContaining("Codex app-server WebSocket dropped"),
    });
  });

  it("reports connect failures with a typed error", async () => {
    await expect(
      connectCodexAppServerWebSocket({
        endpoint: new URL("ws://127.0.0.1:9"),
        connectTimeoutMs: 50,
      }),
    ).rejects.toMatchObject({
      code: "codex_app_server_ws_connect_failed",
    });
  });

  async function listen(
    handler: (socket: WebSocket) => void,
  ): Promise<URL> {
    const server = createServer();
    const wsServer = new WebSocketServer({ server });
    servers.push(server);
    wsServer.on("connection", handler);

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        server.off("error", reject);
        resolve();
      });
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected TCP server address");
    }

    return new URL(`ws://127.0.0.1:${address.port}`);
  }
});

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

class ManualScheduler {
  #now = 0;
  #nextId = 1;
  #tasks = new Map<NodeJS.Timeout, { dueAt: number; callback: () => void }>();

  get pendingCount(): number {
    return this.#tasks.size;
  }

  setTimeout(callback: () => void, delayMs: number): NodeJS.Timeout {
    const id = this.#nextId++ as unknown as NodeJS.Timeout;
    this.#tasks.set(id, { dueAt: this.#now + delayMs, callback });
    return id;
  }

  clearTimeout(timeout: NodeJS.Timeout): void {
    this.#tasks.delete(timeout);
  }

  advanceBy(delayMs: number): void {
    const target = this.#now + delayMs;
    while (true) {
      const next = [...this.#tasks.entries()]
        .filter(([, task]) => task.dueAt <= target)
        .sort(([, left], [, right]) => left.dueAt - right.dueAt)[0];
      if (!next) {
        break;
      }

      const [id, task] = next;
      this.#tasks.delete(id);
      this.#now = task.dueAt;
      task.callback();
    }
    this.#now = target;
  }
}
