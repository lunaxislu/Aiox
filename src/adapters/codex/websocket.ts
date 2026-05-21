import WebSocket from "ws";

export type CodexAppServerWebSocketErrorCode =
  | "codex_app_server_ws_connect_failed"
  | "codex_app_server_ws_initialize_failed"
  | "codex_app_server_ws_dropped"
  | "codex_turn_start_timeout"
  | "codex_jsonrpc_error";

export interface CodexJsonRpcErrorDetails {
  jsonRpcCode?: number;
  closeCode?: number;
  closeReason?: string;
}

export class CodexAppServerWebSocketError extends Error {
  readonly code: CodexAppServerWebSocketErrorCode;
  readonly jsonRpcCode?: number;
  readonly closeCode?: number;
  readonly closeReason?: string;

  constructor(
    code: CodexAppServerWebSocketErrorCode,
    message: string,
    details: CodexJsonRpcErrorDetails = {},
  ) {
    super(message);
    this.name = "CodexAppServerWebSocketError";
    this.code = code;
    this.jsonRpcCode = details.jsonRpcCode;
    this.closeCode = details.closeCode;
    this.closeReason = details.closeReason;
  }
}

export interface ConnectCodexAppServerWebSocketOptions {
  endpoint: URL;
  clientName?: string;
  clientVersion?: string;
  connectTimeoutMs?: number;
  requestTimeoutMs?: number;
}

export interface CodexInitializeResponse {
  userAgent: string;
  codexHome: string;
  platformFamily: string;
  platformOs: string;
}

export interface CodexJsonRpcNotification {
  method: string;
  params?: unknown;
}

export interface CodexJsonRpcRequestOptions {
  timeoutMs?: number;
  timeoutErrorCode?: CodexAppServerWebSocketErrorCode;
}

export interface CodexAppServerWebSocketClient {
  readonly endpoint: URL;
  initialize(): Promise<CodexInitializeResponse>;
  request(
    method: string,
    params?: unknown,
    options?: CodexJsonRpcRequestOptions,
  ): Promise<unknown>;
  onNotification(
    listener: (notification: CodexJsonRpcNotification) => void,
  ): () => void;
  close(): void;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

type JsonRpcResponse =
  | {
      id: number;
      result: unknown;
    }
  | {
      id: number;
      error: {
        code: number;
        message: string;
      };
    };

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
  timeout?: NodeJS.Timeout;
}

const defaultConnectTimeoutMs = 5_000;
const defaultRequestTimeoutMs = 30_000;

export async function connectCodexAppServerWebSocket(
  options: ConnectCodexAppServerWebSocketOptions,
): Promise<CodexAppServerWebSocketClient> {
  const socket = await openSocket(options.endpoint, options.connectTimeoutMs);
  return createClient(socket, options);
}

function createClient(
  socket: WebSocket,
  options: ConnectCodexAppServerWebSocketOptions,
): CodexAppServerWebSocketClient {
  const endpoint = options.endpoint;
  const clientName = options.clientName ?? "aiox";
  const clientVersion = options.clientVersion ?? "1.0.0";
  const requestTimeoutMs = options.requestTimeoutMs ?? defaultRequestTimeoutMs;
  const pending = new Map<number, PendingRequest>();
  const notificationListeners = new Set<(notification: CodexJsonRpcNotification) => void>();
  let nextRequestId = 1;
  let closed = false;

  socket.on("message", (raw) => {
    let message: unknown;
    try {
      message = JSON.parse(String(raw));
    } catch (error) {
      failAll(error instanceof Error ? error : new Error("Invalid JSON-RPC message"));
      return;
    }

    if (isJsonRpcNotification(message)) {
      for (const listener of notificationListeners) {
        listener(message);
      }
      return;
    }

    if (isJsonRpcResponse(message)) {
      settleResponse(message);
    }
  });
  socket.once("error", (error) => {
    failAll(error instanceof Error ? error : new Error(String(error)));
  });
  socket.once("close", (code, reason) => {
    if (!closed) {
      const closeReason = reason.toString("utf8");
      failAll(
        new CodexAppServerWebSocketError(
          "codex_app_server_ws_dropped",
          `Codex app-server WebSocket dropped before response: code=${code} reason=${closeReason}`,
          { closeCode: code, closeReason },
        ),
      );
    }
  });

  function settleResponse(response: JsonRpcResponse): void {
    const request = pending.get(response.id);
    if (!request) {
      return;
    }

    pending.delete(response.id);
    clearPendingTimeout(request);

    if ("error" in response) {
      request.reject(
        new CodexAppServerWebSocketError(
          "codex_jsonrpc_error",
          response.error.message,
          { jsonRpcCode: response.error.code },
        ),
      );
      return;
    }

    request.resolve(response.result);
  }

  function failAll(error: Error): void {
    for (const request of pending.values()) {
      clearPendingTimeout(request);
      request.reject(error);
    }

    pending.clear();
  }

  function clearPendingTimeout(request: PendingRequest): void {
    if (request.timeout) {
      clearTimeout(request.timeout);
    }
  }

  const client: CodexAppServerWebSocketClient = {
    endpoint,
    async initialize() {
      try {
        return (await client.request("initialize", {
          clientInfo: {
            name: clientName,
            version: clientVersion,
          },
          capabilities: {
            experimentalApi: false,
          },
        })) as CodexInitializeResponse;
      } catch (error) {
        throw new CodexAppServerWebSocketError(
          "codex_app_server_ws_initialize_failed",
          error instanceof Error ? error.message : String(error),
        );
      }
    },
    request(method, params, requestOptions = {}) {
      if (closed || socket.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error("Codex app-server WebSocket is closed"));
      }

      const id = nextRequestId++;
      const request: JsonRpcRequest = {
        jsonrpc: "2.0",
        id,
        method,
      };
      if (params !== undefined) {
        request.params = params;
      }

      return new Promise<unknown>((resolve, reject) => {
        const pendingRequest: PendingRequest = { resolve, reject };
        const timeoutMs = requestOptions.timeoutMs ?? requestTimeoutMs;

        if (timeoutMs > 0) {
          pendingRequest.timeout = setTimeout(() => {
            pending.delete(id);
            reject(
              new CodexAppServerWebSocketError(
                requestOptions.timeoutErrorCode ?? "codex_turn_start_timeout",
                `Codex app-server JSON-RPC request timed out: ${method}`,
              ),
            );
          }, timeoutMs);
        }

        pending.set(id, pendingRequest);
        socket.send(JSON.stringify(request), (error) => {
          if (!error) {
            return;
          }

          pending.delete(id);
          clearPendingTimeout(pendingRequest);
          reject(error);
        });
      });
    },
    onNotification(listener) {
      notificationListeners.add(listener);
      return () => {
        notificationListeners.delete(listener);
      };
    },
    close() {
      closed = true;
      failAll(new Error("Codex app-server WebSocket client is closed"));
      socket.close();
    },
  };

  return client;
}

async function openSocket(endpoint: URL, connectTimeoutMs?: number): Promise<WebSocket> {
  const socket = new WebSocket(endpoint);
  const timeoutMs = connectTimeoutMs ?? defaultConnectTimeoutMs;

  return new Promise<WebSocket>((resolve, reject) => {
    let settled = false;
    let timer: NodeJS.Timeout | null = null;

    function cleanup(): void {
      if (timer) {
        clearTimeout(timer);
      }
      socket.off("open", onOpen);
      socket.off("error", onError);
    }

    function finish(value: WebSocket): void {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(value);
    }

    function fail(error: Error): void {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      socket.close();
      reject(
        new CodexAppServerWebSocketError(
          "codex_app_server_ws_connect_failed",
          error.message,
        ),
      );
    }

    function onOpen(): void {
      finish(socket);
    }

    function onError(error: Error): void {
      fail(error);
    }

    socket.once("open", onOpen);
    socket.once("error", onError);

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        fail(new Error(`Timed out connecting to Codex app-server: ${endpoint.toString()}`));
      }, timeoutMs);
    }
  });
}

function isJsonRpcResponse(value: unknown): value is JsonRpcResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number" &&
    ("result" in value || "error" in value)
  );
}

function isJsonRpcNotification(value: unknown): value is CodexJsonRpcNotification {
  return (
    typeof value === "object" &&
    value !== null &&
    !("id" in value) &&
    "method" in value &&
    typeof value.method === "string"
  );
}
