import WebSocket, { WebSocketServer } from "ws";

export type CodexProxyBindingMethod =
  | "thread/start"
  | "thread/resume"
  | "thread/fork";

export interface CodexProxyBindingEvent {
  method: CodexProxyBindingMethod;
  threadId: string;
  requestId: number | string;
}

export interface CodexProxyConnectionEvent {
  state:
    | "client_connected"
    | "upstream_open"
    | "client_closed"
    | "upstream_closed";
}

export interface CodexAgentProxy {
  readonly url: string;
  close(): Promise<void>;
}

export interface StartCodexAgentProxyOptions {
  upstreamUrl: string;
  listenHost?: string;
  listenPort?: number;
  onBinding?: (event: CodexProxyBindingEvent) => void;
  onConnection?: (event: CodexProxyConnectionEvent) => void;
}

type JsonRpcId = number | string;

interface JsonRpcMessage {
  id?: JsonRpcId;
  method?: string;
  result?: unknown;
  error?: unknown;
}

type RelayFrame = WebSocket.RawData | string;

const bindingMethods: ReadonlySet<string> = new Set<CodexProxyBindingMethod>([
  "thread/start",
  "thread/resume",
  "thread/fork",
]);

export async function startCodexAgentProxy(
  options: StartCodexAgentProxyOptions,
): Promise<CodexAgentProxy> {
  const listenHost = options.listenHost ?? "127.0.0.1";
  const listenPort = options.listenPort ?? 0;
  const onBinding = options.onBinding ?? (() => undefined);
  const onConnection = options.onConnection ?? (() => undefined);

  const server = new WebSocketServer({ host: listenHost, port: listenPort });
  const upstreamSockets = new Set<WebSocket>();

  server.on("connection", (client) => {
    const upstream = new WebSocket(options.upstreamUrl);
    const pendingBindings = new Map<JsonRpcId, CodexProxyBindingMethod>();
    const queuedClientFrames: RelayFrame[] = [];
    upstreamSockets.add(upstream);
    onConnection({ state: "client_connected" });

    upstream.on("open", () => {
      onConnection({ state: "upstream_open" });
      for (const frame of queuedClientFrames.splice(0)) {
        upstream.send(frame);
      }
    });

    client.on("message", (data, isBinary) => {
      const frame = normalizeFrame(data, isBinary);
      observeClientFrame(frame, pendingBindings);

      if (upstream.readyState === WebSocket.OPEN) {
        upstream.send(frame);
        return;
      }
      queuedClientFrames.push(frame);
    });

    upstream.on("message", (data, isBinary) => {
      const frame = normalizeFrame(data, isBinary);
      observeUpstreamFrame(frame, pendingBindings, onBinding);

      if (client.readyState === WebSocket.OPEN) {
        client.send(frame);
      }
    });

    const closeBoth = (): void => {
      if (
        client.readyState === WebSocket.OPEN ||
        client.readyState === WebSocket.CONNECTING
      ) {
        client.close();
      }
      if (
        upstream.readyState === WebSocket.OPEN ||
        upstream.readyState === WebSocket.CONNECTING
      ) {
        upstream.close();
      }
    };

    client.on("close", () => {
      onConnection({ state: "client_closed" });
      closeBoth();
    });
    upstream.on("close", () => {
      onConnection({ state: "upstream_closed" });
      upstreamSockets.delete(upstream);
      if (
        client.readyState === WebSocket.OPEN ||
        client.readyState === WebSocket.CONNECTING
      ) {
        client.close();
      }
    });

    // ws emits 'error' events; without a listener they crash the process.
    client.on("error", () => undefined);
    upstream.on("error", () => undefined);
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
  pendingBindings: Map<JsonRpcId, CodexProxyBindingMethod>,
): void {
  const message = parseJsonRpcMessage(data);
  if (!message || message.id === undefined) {
    return;
  }
  if (!isBindingMethod(message.method)) {
    return;
  }
  pendingBindings.set(message.id, message.method);
}

function observeUpstreamFrame(
  data: RelayFrame,
  pendingBindings: Map<JsonRpcId, CodexProxyBindingMethod>,
  onBinding: (event: CodexProxyBindingEvent) => void,
): void {
  const message = parseJsonRpcMessage(data);
  if (!message || message.id === undefined) {
    return;
  }
  const method = pendingBindings.get(message.id);
  if (!method) {
    return;
  }
  pendingBindings.delete(message.id);

  if (message.error !== undefined) {
    return;
  }
  const threadId = extractThreadId(message.result);
  if (!threadId) {
    return;
  }
  onBinding({ method, threadId, requestId: message.id });
}

function parseJsonRpcMessage(data: RelayFrame): JsonRpcMessage | null {
  try {
    const text =
      typeof data === "string"
        ? data
        : Buffer.isBuffer(data)
          ? data.toString("utf8")
          : Buffer.from(data as ArrayBuffer).toString("utf8");
    const parsed = JSON.parse(text) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? (parsed as JsonRpcMessage)
      : null;
  } catch {
    return null;
  }
}

function normalizeFrame(
  data: WebSocket.RawData,
  isBinary: boolean,
): RelayFrame {
  if (isBinary) {
    return data;
  }
  if (typeof data === "string") {
    return data;
  }
  if (Buffer.isBuffer(data)) {
    return data.toString("utf8");
  }
  return Buffer.from(data as ArrayBuffer).toString("utf8");
}

function extractThreadId(result: unknown): string | null {
  if (
    typeof result === "object" &&
    result !== null &&
    "thread" in result &&
    typeof (result as { thread?: unknown }).thread === "object" &&
    (result as { thread?: unknown }).thread !== null
  ) {
    const thread = (result as { thread: { id?: unknown } }).thread;
    if (typeof thread.id === "string" && thread.id.length > 0) {
      return thread.id;
    }
  }
  return null;
}

function isBindingMethod(method: unknown): method is CodexProxyBindingMethod {
  return typeof method === "string" && bindingMethods.has(method);
}

function addressPort(server: WebSocketServer): number {
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("expected TCP server address");
  }
  return address.port;
}
