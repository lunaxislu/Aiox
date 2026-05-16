type JsonRpcId = number;

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params: Record<string, unknown>;
};

type JsonRpcResponse = {
  id?: JsonRpcId;
  result?: unknown;
  error?: unknown;
};

type LoadedThreadInfo = {
  index: number;
  threadId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

export function buildInitializeRequest(id: JsonRpcId): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: "initialize",
    params: {
      clientInfo: { name: "aiox-codex-app-server-poc", version: "0.0.1" },
      protocolVersion: "1",
      capabilities: {},
    },
  };
}

export function buildLoadedThreadsRequest(id: JsonRpcId): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: "thread/loaded/list",
    params: {},
  };
}

export function buildTurnStartRequest(
  id: JsonRpcId,
  threadId: string,
  text: string,
): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id,
    method: "turn/start",
    params: {
      threadId,
      input: [{ type: "text", text }],
    },
  };
}

export function extractLoadedThreadIds(result: unknown): string[] {
  if (!isRecord(result) || !Array.isArray(result.data)) {
    return [];
  }

  return result.data.filter((value): value is string => typeof value === "string" && value.length > 0);
}

export function extractTurnId(result: unknown): string | null {
  if (!isRecord(result)) {
    return null;
  }

  if (typeof result.turnId === "string") {
    return result.turnId;
  }

  if (isRecord(result.turn) && typeof result.turn.id === "string") {
    return result.turn.id;
  }

  return null;
}

class CodexAppServerProbeClient {
  private nextId = 1;
  private readonly pending = new Map<
    number,
    {
      reject: (error: Error) => void;
      resolve: (result: unknown) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();
  private ws: WebSocket | null = null;

  constructor(
    private readonly url: string,
    private readonly timeoutMs: number,
  ) {}

  async connect(): Promise<void> {
    this.ws = new WebSocket(this.url);

    await new Promise<void>((resolve, reject) => {
      if (!this.ws) {
        reject(new Error("WebSocket was not created"));
        return;
      }

      this.ws.addEventListener("open", () => resolve(), { once: true });
      this.ws.addEventListener(
        "error",
        () => reject(new Error(`failed to connect to ${this.url}`)),
        { once: true },
      );
      this.ws.addEventListener("message", (event) => this.handleMessage(event.data));
    });

    await this.request(buildInitializeRequest(this.nextId++));
  }

  async listLoadedThreads(): Promise<LoadedThreadInfo[]> {
    const result = await this.request(buildLoadedThreadsRequest(this.nextId++));
    return extractLoadedThreadIds(result).map((threadId, index) => ({ index, threadId }));
  }

  async startTurn(threadId: string, text: string): Promise<{ turnId: string | null }> {
    const result = await this.request(buildTurnStartRequest(this.nextId++, threadId, text));
    return { turnId: extractTurnId(result) };
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }

  private request(payload: JsonRpcRequest): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("WebSocket is not open"));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(payload.id);
        reject(new Error(`timed out waiting for ${payload.method}`));
      }, this.timeoutMs);

      this.pending.set(payload.id, { resolve, reject, timeout });
      this.ws?.send(JSON.stringify(payload));
    });
  }

  private handleMessage(raw: unknown): void {
    const text = typeof raw === "string" ? raw : raw instanceof Buffer ? raw.toString("utf8") : String(raw);

    let message: JsonRpcResponse;
    try {
      message = JSON.parse(text) as JsonRpcResponse;
    } catch {
      return;
    }

    if (typeof message.id !== "number") {
      return;
    }

    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(message.id);

    if (message.error) {
      const messageText =
        isRecord(message.error) && typeof message.error.message === "string"
          ? message.error.message
          : JSON.stringify(message.error);
      pending.reject(new Error(messageText));
      return;
    }

    pending.resolve(message.result);
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "inspect";
  const url = parseArg("url", "ws://127.0.0.1:4500")!;
  const timeoutMs = Number(parseArg("timeout-ms", "10000"));
  const client = new CodexAppServerProbeClient(url, timeoutMs);

  await client.connect();

  if (command === "inspect") {
    const threads = await client.listLoadedThreads();
    console.log(JSON.stringify({ url, loadedThreadCount: threads.length, threads }, null, 2));
    client.close();
    return;
  }

  if (command === "send") {
    const threadId = parseArg("thread-id");
    const text = parseArg("text", "aiox codex app-server probe");

    if (!threadId) {
      throw new Error("send requires --thread-id=<thread id>");
    }

    const result = await client.startTurn(threadId, text!);
    console.log(JSON.stringify({ url, threadId, ...result }, null, 2));
    client.close();
    return;
  }

  client.close();
  throw new Error(`unknown command: ${command}`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
