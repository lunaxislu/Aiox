import { chmodSync, existsSync, unlinkSync } from "node:fs";
import net from "node:net";

import type { DaemonApi } from "./api.js";

/** POSIX owner-only mode for the daemon Unix domain socket file. */
const SOCKET_FILE_MODE = 0o600;

export interface CreateDaemonSocketServerOptions {
  api: DaemonApi;
  socketPath: string;
}

export interface DaemonSocketServer {
  start(): Promise<DaemonSocketServerHandle>;
}

export interface DaemonSocketServerHandle {
  socketPath: string;
  close(): Promise<void>;
}

export interface CreateDaemonSocketClientOptions {
  socketPath: string;
  requestTimeoutMs?: number;
}

type DaemonApiMethod = keyof DaemonApi;

interface RequestEnvelope {
  id: string;
  method: DaemonApiMethod;
  params?: unknown;
}

type ResponseEnvelope =
  | {
      id: string;
      ok: true;
      result: unknown;
    }
  | {
      id: string;
      ok: false;
      error: {
        reason: string;
        message: string;
      };
    };

export function createDaemonSocketServer(
  options: CreateDaemonSocketServerOptions,
): DaemonSocketServer {
  let handle: DaemonSocketServerHandle | null = null;

  return {
    async start() {
      if (handle) {
        return handle;
      }

      const sockets = new Set<net.Socket>();
      const server = net.createServer((socket) => {
        sockets.add(socket);
        socket.setEncoding("utf8");
        socket.on("error", () => {
          socket.destroy();
        });

        let buffer = "";
        socket.on("data", (chunk) => {
          buffer += chunk;

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.length === 0) {
              continue;
            }

            void dispatchLine(options.api, socket, line);
          }
        });
        socket.on("close", () => {
          sockets.delete(socket);
        });
      });

      await listenWithStaleSocketRetry(server, options.socketPath);
      // The socket file exists only once listen() resolves; chmod before that would
      // either throw ENOENT or race the file's creation.
      try {
        chmodSync(options.socketPath, SOCKET_FILE_MODE);
      } catch (chmodError) {
        try {
          await closeServerAndSocketFile(server, sockets, options.socketPath);
        } catch {
          // Cleanup failure must not mask the original chmod error below.
        }
        throw chmodError;
      }

      handle = {
        socketPath: options.socketPath,
        async close() {
          await closeServerAndSocketFile(server, sockets, options.socketPath);
          handle = null;
        },
      };

      return handle;
    },
  };
}

async function closeServerAndSocketFile(
  server: net.Server,
  sockets: Set<net.Socket>,
  socketPath: string,
): Promise<void> {
  for (const socket of sockets) {
    socket.end();
    socket.destroy();
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  if (existsSync(socketPath)) {
    unlinkSync(socketPath);
  }
}

export function createDaemonSocketClient(
  options: CreateDaemonSocketClientOptions,
): DaemonApi & { close(): void } {
  let nextRequestId = 1;
  const transport = createPersistentDaemonSocketClient(options);

  return new Proxy(
    {
      close() {
        transport.close();
      },
    },
    {
      get(target, property) {
        if (property === "close") {
          return target.close;
        }

        if (property === "then") {
          return undefined;
        }

        if (typeof property !== "string") {
          return undefined;
        }

        return (params?: unknown) =>
          transport.send({
            id: `request-${nextRequestId++}`,
            method: property as DaemonApiMethod,
            params,
          });
      },
    },
  ) as DaemonApi & { close(): void };
}

async function dispatchLine(
  api: DaemonApi,
  socket: net.Socket,
  line: string,
): Promise<void> {
  const response = await dispatchRequest(api, parseRequest(line));
  socket.write(`${JSON.stringify(response)}\n`);
}

async function dispatchRequest(
  api: DaemonApi,
  request: RequestEnvelope | ResponseEnvelope,
): Promise<ResponseEnvelope> {
  if (isErrorEnvelope(request)) {
    return request;
  }

  if (!isRequestEnvelope(request)) {
    return {
      id: "unknown",
      ok: false,
      error: {
        reason: "invalid_envelope",
        message: "Invalid daemon socket request envelope",
      },
    };
  }

  const method = api[request.method];

  if (typeof method !== "function") {
    return {
      id: request.id,
      ok: false,
      error: {
        reason: "unknown_method",
        message: `Unknown daemon socket method: ${String(request.method)}`,
      },
    };
  }

  try {
    const call = method as (params?: unknown) => unknown;
    const result =
      request.method === "status"
        ? await call.call(api)
        : await call.call(api, request.params);

    return {
      id: request.id,
      ok: true,
      result,
    };
  } catch (error) {
    return {
      id: request.id,
      ok: false,
      error: {
        reason: "internal_error",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function parseRequest(line: string): RequestEnvelope | ResponseEnvelope {
  try {
    return JSON.parse(line) as RequestEnvelope;
  } catch (error) {
    return {
      id: "unknown",
      ok: false,
      error: {
        reason: "invalid_json",
        message: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

function isErrorEnvelope(value: unknown): value is Extract<ResponseEnvelope, { ok: false }> {
  return (
    typeof value === "object" &&
    value !== null &&
    "ok" in value &&
    value.ok === false &&
    "error" in value
  );
}

function isRequestEnvelope(value: unknown): value is RequestEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "method" in value &&
    typeof value.method === "string"
  );
}

interface PendingRequest {
  resolve(value: unknown): void;
  reject(error: Error): void;
  timeout?: NodeJS.Timeout;
}

function createPersistentDaemonSocketClient(options: CreateDaemonSocketClientOptions): {
  send(request: RequestEnvelope): Promise<unknown>;
  close(): void;
} {
  const requestTimeoutMs = options.requestTimeoutMs ?? 30_000;
  const pending = new Map<string, PendingRequest>();
  let socket: net.Socket | null = null;
  let buffer = "";
  let closed = false;

  function ensureSocket(): net.Socket {
    if (closed) {
      throw new Error("daemon socket client is closed");
    }

    if (socket && !socket.destroyed) {
      return socket;
    }

    // Transport decision point (client connect). `options.socketPath` is a Unix
    // domain socket — macOS / Linux only. Windows support (named pipe / TCP loopback)
    // is deferred; when added it swaps here + the listen() site below. See
    // docs/decisions/runtime-profile-namespace-isolation.md.
    socket = net.createConnection(options.socketPath);
    socket.setEncoding("utf8");
    socket.on("data", onData);
    socket.once("error", (error) => {
      failAll(error instanceof Error ? error : new Error(String(error)));
    });
    socket.once("close", () => {
      socket = null;
      buffer = "";

      if (!closed) {
        failAll(new Error("daemon socket closed before response"));
      }
    });

    return socket;
  }

  function onData(chunk: string): void {
    buffer += chunk;

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.length === 0) {
        continue;
      }

      let response: ResponseEnvelope;
      try {
        response = JSON.parse(line) as ResponseEnvelope;
      } catch (error) {
        failAll(
          new Error(
            error instanceof Error ? error.message : "Invalid daemon socket response JSON",
          ),
        );
        return;
      }

      settleResponse(response);
    }
  }

  function settleResponse(response: ResponseEnvelope): void {
    const request = pending.get(response.id);
    if (!request) {
      return;
    }

    pending.delete(response.id);
    clearPendingTimeout(request);

    if (!response.ok) {
      request.reject(new Error(response.error.message));
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

  return {
    send(request) {
      return new Promise<unknown>((resolve, reject) => {
        let activeSocket: net.Socket;
        try {
          activeSocket = ensureSocket();
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
          return;
        }

        const pendingRequest: PendingRequest = { resolve, reject };
        if (requestTimeoutMs > 0) {
          pendingRequest.timeout = setTimeout(() => {
            pending.delete(request.id);
            reject(new Error(`daemon socket request timed out: ${request.id}`));
          }, requestTimeoutMs);
        }

        pending.set(request.id, pendingRequest);
        activeSocket.write(`${JSON.stringify(request)}\n`);
      });
    },
    close() {
      closed = true;
      failAll(new Error("daemon socket client is closed"));

      if (socket) {
        socket.end();
        socket.destroy();
        socket = null;
      }
    },
  };
}

async function listenWithStaleSocketRetry(
  server: net.Server,
  socketPath: string,
): Promise<void> {
  try {
    await listen(server, socketPath);
    return;
  } catch (error) {
    if (!isAddressInUseError(error)) {
      throw error;
    }
  }

  if (await canConnect(socketPath)) {
    throw new Error(`daemon socket is already in use: ${socketPath}`);
  }

  if (existsSync(socketPath)) {
    unlinkSync(socketPath);
  }

  try {
    await listen(server, socketPath);
  } catch (error) {
    if (isAddressInUseError(error)) {
      throw new Error(`daemon socket is already in use: ${socketPath}`);
    }

    throw error;
  }
}

// Transport decision point (daemon listen). `socketPath` is a Unix domain socket —
// macOS / Linux only. Windows support (named pipe / TCP loopback) is deferred; when
// added it swaps here + the createConnection() site above. See
// docs/decisions/runtime-profile-namespace-isolation.md.
async function listen(server: net.Server, socketPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function isAddressInUseError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "EADDRINUSE"
  );
}

export async function canConnect(socketPath: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = net.createConnection(socketPath);
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}
