import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import WebSocket, { WebSocketServer } from "ws";

type JsonRpcId = number | string;

type JsonRpcMessage = {
  error?: unknown;
  id?: JsonRpcId;
  method?: string;
  result?: unknown;
};

type PendingBindingRequest = {
  method: BindingMethod;
};

type RelayFrame = WebSocket.RawData | string;

export type ProxyObservation =
  | {
      type: "jsonrpc_frame";
      direction: "client_to_server" | "server_to_client";
      message: JsonRpcMessage;
    }
  | {
      type: "binding_candidate";
      method: BindingMethod;
      requestId: JsonRpcId;
      threadId: string;
    }
  | {
      type: "binding_uncertain";
      method: BindingMethod;
      requestId: JsonRpcId;
      reason: "error_response" | "missing_thread_id" | "parse_error";
    }
  | {
      type: "proxy_error";
      message: string;
    }
  | {
      type: "proxy_connection";
      state: "client_connected" | "upstream_open" | "client_closed" | "upstream_closed";
    };

export type CodexInbandProxy = {
  close: () => Promise<void>;
  url: string;
};

export async function startCodexInbandProxy(options: {
  listenHost?: string;
  listenPort: number;
  observe?: (event: ProxyObservation) => void;
  upstreamUrl: string;
}): Promise<CodexInbandProxy> {
  const listenHost = options.listenHost ?? "127.0.0.1";
  const observe = options.observe ?? (() => undefined);
  const server = new WebSocketServer({ host: listenHost, port: options.listenPort });
  const upstreamSockets = new Set<WebSocket>();

  server.on("connection", (client) => {
    const upstream = new WebSocket(options.upstreamUrl);
    const pendingBindings = new Map<JsonRpcId, PendingBindingRequest>();
    const queuedClientFrames: RelayFrame[] = [];
    upstreamSockets.add(upstream);
    observe({ type: "proxy_connection", state: "client_connected" });

    upstream.on("open", () => {
      observe({ type: "proxy_connection", state: "upstream_open" });
      for (const frame of queuedClientFrames.splice(0)) {
        upstream.send(frame);
      }
    });

    client.on("message", (data, isBinary) => {
      const frame = normalizeFrame(data, isBinary);
      observeClientFrame(frame, pendingBindings, observe);

      if (upstream.readyState === WebSocket.OPEN) {
        upstream.send(frame);
        return;
      }

      queuedClientFrames.push(frame);
    });

    upstream.on("message", (data, isBinary) => {
      const frame = normalizeFrame(data, isBinary);
      observeUpstreamFrame(frame, pendingBindings, observe);

      if (client.readyState === WebSocket.OPEN) {
        client.send(frame);
      }
    });

    const closeBoth = (): void => {
      if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
        client.close();
      }
      if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
        upstream.close();
      }
    };

    client.on("close", () => {
      observe({ type: "proxy_connection", state: "client_closed" });
      closeBoth();
    });
    upstream.on("close", () => {
      observe({ type: "proxy_connection", state: "upstream_closed" });
      upstreamSockets.delete(upstream);
      if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
        client.close();
      }
    });

    client.on("error", (error) => observe({ type: "proxy_error", message: error.message }));
    upstream.on("error", (error) => observe({ type: "proxy_error", message: error.message }));
  });

  await new Promise<void>((resolve) => server.once("listening", resolve));

  return {
    url: `ws://${listenHost}:${addressPort(server)}`,
    close: async () => {
      for (const socket of upstreamSockets) {
        socket.close();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

function observeClientFrame(
  data: RelayFrame,
  pendingBindings: Map<JsonRpcId, PendingBindingRequest>,
  observe: (event: ProxyObservation) => void,
): void {
  const message = parseJsonRpcMessage(data);
  if (!message) {
    return;
  }

  observe({ type: "jsonrpc_frame", direction: "client_to_server", message });

  if (!isBindingMethod(message.method) || message.id === undefined) {
    return;
  }
  pendingBindings.set(message.id, { method: message.method });
}

function observeUpstreamFrame(
  data: RelayFrame,
  pendingBindings: Map<JsonRpcId, PendingBindingRequest>,
  observe: (event: ProxyObservation) => void,
): void {
  const message = parseJsonRpcMessage(data);
  if (!message) {
    return;
  }

  observe({ type: "jsonrpc_frame", direction: "server_to_client", message });

  if (message.id === undefined) {
    return;
  }

  const pending = pendingBindings.get(message.id);
  if (!pending) {
    return;
  }

  pendingBindings.delete(message.id);

  if (message.error !== undefined) {
    observe({
      type: "binding_uncertain",
      method: pending.method,
      requestId: message.id,
      reason: "error_response",
    });
    return;
  }

  const threadId = extractThreadId(message.result);

  if (threadId) {
    observe({
      type: "binding_candidate",
      method: pending.method,
      requestId: message.id,
      threadId,
    });
    return;
  }

  observe({
    type: "binding_uncertain",
    method: pending.method,
    requestId: message.id,
    reason: "missing_thread_id",
  });
}

function parseJsonRpcMessage(data: RelayFrame): JsonRpcMessage | null {
  try {
    const parsed = JSON.parse(data.toString("utf8")) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as JsonRpcMessage) : null;
  } catch {
    return null;
  }
}

function normalizeFrame(data: WebSocket.RawData, isBinary: boolean): RelayFrame {
  if (isBinary) {
    return data;
  }

  return data.toString("utf8");
}

function extractThreadId(result: unknown): string | null {
  if (!isRecord(result)) {
    return null;
  }

  if (typeof result.threadId === "string") {
    return result.threadId;
  }

  if (typeof result.id === "string") {
    return result.id;
  }

  if (isRecord(result.thread) && typeof result.thread.id === "string") {
    return result.thread.id;
  }

  return null;
}

type BindingMethod = "thread/start" | "thread/fork" | "thread/resume";

function isBindingMethod(method: unknown): method is BindingMethod {
  return method === "thread/start" || method === "thread/fork" || method === "thread/resume";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function addressPort(server: WebSocketServer): number {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected TCP server address");
  }
  return address.port;
}

function parseArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

async function main(): Promise<void> {
  const upstreamUrl = parseArg("upstream", "ws://127.0.0.1:4515")!;
  const listenHost = parseArg("listen-host", "127.0.0.1")!;
  const listenPort = Number(parseArg("listen-port", "4520"));
  const output = resolve(parseArg("out", "spikes/codex-app-server-multi-session-poc/inband-proxy-events.jsonl")!);
  const startedAt = Date.now();

  await mkdir(dirname(output), { recursive: true });
  const stream = createWriteStream(output, { flags: "a" });

  const writeEvent = (event: Record<string, unknown>): void => {
    const enriched = {
      at: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      ...event,
    };
    const line = JSON.stringify(enriched);
    stream.write(`${line}\n`);
    console.log(line);
  };

  const proxy = await startCodexInbandProxy({
    listenHost,
    listenPort,
    upstreamUrl,
    observe: writeEvent,
  });

  writeEvent({ type: "proxy_started", url: proxy.url, upstreamUrl, output });

  const shutdown = async (): Promise<void> => {
    await proxy.close();
    stream.end();
  };

  process.once("SIGINT", () => {
    shutdown()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
