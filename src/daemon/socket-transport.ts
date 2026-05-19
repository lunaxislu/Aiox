import { existsSync, unlinkSync } from "node:fs";
import net from "node:net";

import type { DaemonApi } from "./api.js";

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

      await removeStaleSocketPath(options.socketPath);

      const sockets = new Set<net.Socket>();
      const server = net.createServer((socket) => {
        sockets.add(socket);
        socket.setEncoding("utf8");

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

      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(options.socketPath, () => {
          server.off("error", reject);
          resolve();
        });
      });

      handle = {
        socketPath: options.socketPath,
        async close() {
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

          if (existsSync(options.socketPath)) {
            unlinkSync(options.socketPath);
          }

          handle = null;
        },
      };

      return handle;
    },
  };
}

export function createDaemonSocketClient(
  options: CreateDaemonSocketClientOptions,
): DaemonApi & { close(): void } {
  let nextRequestId = 1;

  return new Proxy(
    {
      close() {},
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
          sendRequest(options.socketPath, {
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

async function sendRequest(
  socketPath: string,
  request: RequestEnvelope,
): Promise<unknown> {
  const socket = net.createConnection(socketPath);
  socket.setEncoding("utf8");

  return new Promise<unknown>((resolve, reject) => {
    let buffer = "";

    socket.once("error", reject);
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf("\n");

      if (newlineIndex === -1) {
        return;
      }

      const line = buffer.slice(0, newlineIndex);
      socket.end();

      const response = JSON.parse(line) as ResponseEnvelope;

      if (!response.ok) {
        reject(new Error(response.error.message));
        return;
      }

      resolve(response.result);
    });
    socket.write(`${JSON.stringify(request)}\n`);
  });
}

async function removeStaleSocketPath(socketPath: string): Promise<void> {
  if (!existsSync(socketPath)) {
    return;
  }

  if (await canConnect(socketPath)) {
    throw new Error(`daemon socket is already in use: ${socketPath}`);
  }

  unlinkSync(socketPath);
}

async function canConnect(socketPath: string): Promise<boolean> {
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
