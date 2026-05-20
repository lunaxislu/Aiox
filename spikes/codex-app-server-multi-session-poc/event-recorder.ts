import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

type JsonRpcId = number;

type JsonRpcResponse = {
  id?: JsonRpcId;
  result?: unknown;
  error?: unknown;
};

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params: Record<string, unknown>;
};

function parseArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const arg = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractLoadedThreadIds(result: unknown): string[] {
  if (!isRecord(result) || !Array.isArray(result.data)) {
    return [];
  }

  return result.data.filter((value): value is string => typeof value === "string" && value.length > 0);
}

class EventRecorder {
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
    private readonly writeEvent: (event: Record<string, unknown>) => void,
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

    await this.request("initialize", {
      clientInfo: { name: "aiox-codex-event-recorder", version: "0.0.1" },
      capabilities: { experimentalApi: true },
    });
  }

  async listLoadedThreads(): Promise<string[]> {
    const result = await this.request("thread/loaded/list", {});
    return extractLoadedThreadIds(result);
  }

  close(): void {
    this.ws?.close();
    this.ws = null;
  }

  private request(method: string, params: Record<string, unknown>): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("WebSocket is not open"));
    }

    const payload: JsonRpcRequest = {
      jsonrpc: "2.0",
      id: this.nextId++,
      method,
      params,
    };

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

    let message: JsonRpcResponse & Record<string, unknown>;
    try {
      message = JSON.parse(text) as JsonRpcResponse & Record<string, unknown>;
    } catch {
      this.writeEvent({ type: "parse_error", raw: text });
      return;
    }

    if (typeof message.id === "number") {
      const pending = this.pending.get(message.id);
      if (!pending) {
        this.writeEvent({ type: "orphan_response", message });
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
      return;
    }

    this.writeEvent({ type: "notification", message });
  }
}

async function main(): Promise<void> {
  const url = parseArg("url", "ws://127.0.0.1:4500")!;
  const output = resolve(parseArg("out", "spikes/codex-app-server-multi-session-poc/events.jsonl")!);
  const durationMs = Number(parseArg("duration-ms", "120000"));
  const pollMs = Number(parseArg("poll-ms", "1000"));
  const timeoutMs = Number(parseArg("timeout-ms", "10000"));

  await mkdir(dirname(output), { recursive: true });
  const stream = createWriteStream(output, { flags: "a" });
  const startedAt = Date.now();

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

  const recorder = new EventRecorder(url, timeoutMs, writeEvent);
  await recorder.connect();
  writeEvent({ type: "recorder_started", url, output, durationMs, pollMs });

  const poll = setInterval(() => {
    recorder
      .listLoadedThreads()
      .then((threadIds) => writeEvent({ type: "loaded_threads", threadIds }))
      .catch((error: unknown) =>
        writeEvent({
          type: "poll_error",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
  }, pollMs);

  await new Promise((resolve) => setTimeout(resolve, durationMs));
  clearInterval(poll);
  recorder.close();
  stream.end();
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
