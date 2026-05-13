import { wrapRelayPrompt } from "./protocol.js";

type Logger = (prefix: string, message: string) => void;

export type WebSocketEvent = {
  code?: number;
  data?: unknown;
  message?: string;
  reason?: string;
};

export type WebSocketLike = {
  readonly readyState: number;
  addEventListener(event: "close" | "error" | "message" | "open", listener: (event: WebSocketEvent) => void): void;
  close(): void;
  send(data: string): void;
};

export type WebSocketConstructor = new (url: string) => WebSocketLike;

type PendingAppServerRequest = {
  reject: (error: Error) => void;
  resolve: (value: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
};

export type CodexAppServerClientOptions = {
  clientName: string;
  clientVersion: string;
  logLine?: Logger;
  timeoutMs: number;
  url: string;
  webSocketCtor?: WebSocketConstructor;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function extractUserAgent(result: unknown): string | null {
  if (!isRecord(result)) {
    return null;
  }

  if (isNonEmptyString(result.userAgent)) {
    return result.userAgent;
  }

  return null;
}

function extractTurnIdFromTurnResponse(result: unknown): string | null {
  if (!isRecord(result)) {
    return null;
  }

  const turn = result.turn;
  if (isRecord(turn) && isNonEmptyString(turn.id)) {
    return turn.id;
  }

  if (isNonEmptyString(result.turnId)) {
    return result.turnId;
  }

  return null;
}

export class CodexAppServerClient {
  private closed = false;
  private connectPromise: Promise<void> | null = null;
  private readonly logLine: Logger;
  private readonly pendingRequests = new Map<number, PendingAppServerRequest>();
  private requestId = 1;
  private readonly timeoutMs: number;
  private readonly url: string;
  private readonly webSocketCtor: WebSocketConstructor;
  private ws: WebSocketLike | null = null;

  constructor(options: CodexAppServerClientOptions) {
    this.url = options.url;
    this.timeoutMs = options.timeoutMs;
    this.logLine = options.logLine ?? (() => {});
    const defaultWebSocketCtor = globalThis.WebSocket as
      | WebSocketConstructor
      | undefined;
    if (!options.webSocketCtor && !defaultWebSocketCtor) {
      throw new Error("WebSocket is not available in this runtime");
    }
    this.webSocketCtor = options.webSocketCtor ?? defaultWebSocketCtor!;
    this.clientName = options.clientName;
    this.clientVersion = options.clientVersion;
  }

  private readonly clientName: string;
  private readonly clientVersion: string;

  async connect(): Promise<void> {
    if (this.closed) {
      throw new Error("Codex App Server client is closed");
    }

    if (this.ws && this.ws.readyState === 1) {
      return;
    }

    if (!this.connectPromise) {
      this.connectPromise = this.openAndInitialize().catch((error) => {
        this.connectPromise = null;
        throw error;
      });
    }

    await this.connectPromise;
  }

  async discoverThreadId(): Promise<string> {
    const result = await this.request("thread/loaded/list", {});
    const data = isRecord(result) ? result.data : null;
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(
        `No loaded Codex thread at ${this.url}. Attach UI with \`codex --remote ${this.url}\` first.`,
      );
    }

    if (data.length > 1) {
      this.logLine(
        "codex-app-server",
        `multiple loaded threads (${data.length}); picking first`,
      );
    }

    const threadId = data[0];
    if (!isNonEmptyString(threadId)) {
      throw new Error("thread/loaded/list returned non-string threadId");
    }
    return threadId;
  }

  async dispatchPrompt(
    text: string,
    chatId: string,
  ): Promise<{ threadId: string; turnId: string | null }> {
    await this.connect();
    const threadId = await this.discoverThreadId();

    const wrappedText = wrapRelayPrompt(text, chatId);

    const startResult = await this.request("turn/start", {
      threadId,
      input: [{ type: "text", text: wrappedText }],
    });

    const turnId = extractTurnIdFromTurnResponse(startResult);
    this.logLine(
      "codex-app-server",
      `dispatched chat_id=${chatId} threadId=${threadId} turnId=${turnId ?? "unknown"}`,
    );
    return { threadId, turnId };
  }

  async close(): Promise<void> {
    this.closed = true;
    this.failAllPending(new Error("Codex app-server client closed"));

    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        this.logLine(
          "codex-app-server",
          `failed to close ws: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      this.ws = null;
    }
    this.connectPromise = null;
  }

  private openAndInitialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      let ws: WebSocketLike;
      try {
        ws = new this.webSocketCtor(this.url);
      } catch (error) {
        reject(
          new Error(
            `Failed to open WebSocket to Codex app-server at ${this.url}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
        return;
      }

      let opened = false;
      let initialized = false;

      ws.addEventListener("open", () => {
        opened = true;
        this.ws = ws;

        this.request("initialize", {
          clientInfo: { name: this.clientName, version: this.clientVersion },
          protocolVersion: "1",
          capabilities: {},
        })
          .then((result) => {
            initialized = true;
            this.logLine(
              "codex-app-server",
              `connected url=${this.url} userAgent=${
                extractUserAgent(result) ?? "unknown"
              }`,
            );
            resolve();
          })
          .catch((error) => {
            reject(
              error instanceof Error
                ? error
                : new Error(`initialize failed: ${String(error)}`),
            );
          });
      });

      ws.addEventListener("message", (ev) => this.handleMessage(ev));

      ws.addEventListener("error", (ev) => {
        const message =
          (ev && typeof ev.message === "string" && ev.message) || "ws error";
        const error = new Error(
          `Codex app-server WS error at ${this.url}: ${message}`,
        );
        if (!opened || !initialized) {
          reject(error);
        }
        this.failAllPending(error);
      });

      ws.addEventListener("close", (ev) => {
        const code = ev && typeof ev.code === "number" ? ev.code : null;
        const reason = ev && typeof ev.reason === "string" ? ev.reason : "";
        const error = new Error(
          `Codex app-server WS closed code=${code ?? "?"} reason=${reason || "none"}`,
        );
        if (!opened || !initialized) {
          reject(error);
        }
        this.failAllPending(error);
        this.ws = null;
        this.connectPromise = null;
      });
    });
  }

  private handleMessage(ev: WebSocketEvent): void {
    const raw =
      typeof ev.data === "string"
        ? ev.data
        : ev.data && typeof ev.data.toString === "function"
          ? ev.data.toString()
          : "";

    if (!raw) return;

    let message: unknown;
    try {
      message = JSON.parse(raw);
    } catch (error) {
      this.logLine(
        "codex-app-server",
        `failed to parse message: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return;
    }

    if (
      isRecord(message) &&
      "id" in message &&
      ("result" in message || "error" in message)
    ) {
      this.handleResponse(message);
    }
  }

  private handleResponse(message: Record<string, unknown>): void {
    const id = message.id;
    if (typeof id !== "number") return;

    const pending = this.pendingRequests.get(id);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(id);

    if ("error" in message && message.error) {
      const errorMessage =
        isRecord(message.error) && typeof message.error.message === "string"
          ? message.error.message
          : `App Server request ${id} failed`;
      pending.reject(new Error(errorMessage));
      return;
    }

    pending.resolve(message.result);
  }

  private request(method: string, params: unknown): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== 1) {
      return Promise.reject(
        new Error(
          `Codex app-server WS not connected (readyState=${this.ws?.readyState ?? "null"})`,
        ),
      );
    }

    const id = this.requestId++;
    const payload = {
      jsonrpc: "2.0",
      id,
      method,
      params: params ?? {},
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(
          new Error(`Timed out waiting for app-server response to ${method}`),
        );
      }, this.timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        this.ws?.send(JSON.stringify(payload));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  private failAllPending(error: Error): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
}
