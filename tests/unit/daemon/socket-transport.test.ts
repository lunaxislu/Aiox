import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import net from "node:net";
import { join } from "node:path";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonSocketClient, createDaemonSocketServer } from "../../../src/daemon/socket-transport.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";

describe("daemon socket transport", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("dispatches daemon API requests over a Unix domain socket with JSON round trip", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-socket-"), "daemon.sock");
    const ids = ["agent-1"];
    const state = createDaemonState({
      db,
      createId: () => {
        const id = ids.shift();

        if (!id) {
          throw new Error("unexpected id request");
        }

        return id;
      },
      now: () => "2026-05-19T00:00:00.000Z",
    });
    const server = createDaemonSocketServer({
      api: createDaemonApi(state),
      socketPath,
    });
    const handle = await server.start();
    const client = createDaemonSocketClient({ socketPath });

    try {
      await expect(
        client.attachAgent({
          kind: "codex",
          name: "impl",
          cwd: "/repo",
        }),
      ).resolves.toEqual({
        ok: true,
        agent: {
          id: "agent-1",
          name: "impl",
          kind: "codex",
          status: "connected",
          cwd: "/repo",
          pairId: null,
        },
      });

      await expect(client.status()).resolves.toEqual({
        daemon: {
          startedAt: "2026-05-19T00:00:00.000Z",
        },
        agents: [
          {
            id: "agent-1",
            name: "impl",
            kind: "codex",
            status: "connected",
            cwd: "/repo",
            pairId: null,
          },
        ],
        pairs: [],
        routes: [],
      });
    } finally {
      client.close();
      await handle.close();
    }

    expect(existsSync(socketPath)).toBe(false);
  });

  it("maps invalid JSON to a transport error envelope and keeps the daemon alive", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-socket-"), "daemon.sock");
    const server = createDaemonSocketServer({
      api: createDaemonApi(
        createDaemonState({
          db,
          createId: () => "agent-1",
          now: () => "2026-05-19T00:00:00.000Z",
        }),
      ),
      socketPath,
    });
    const handle = await server.start();
    const client = createDaemonSocketClient({ socketPath });

    try {
      await expect(sendRawLine(socketPath, "{not-json")).resolves.toEqual({
        id: "unknown",
        ok: false,
        error: {
          reason: "invalid_json",
          message: expect.any(String),
        },
      });
      await expect(client.status()).resolves.toEqual({
        daemon: {
          startedAt: "2026-05-19T00:00:00.000Z",
        },
        agents: [],
        pairs: [],
        routes: [],
      });
    } finally {
      client.close();
      await handle.close();
    }
  });

  it("reuses one client connection and matches concurrent responses by id", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-socket-"), "daemon.sock");
    let connectionCount = 0;
    const server = net.createServer((socket) => {
      connectionCount += 1;
      socket.setEncoding("utf8");

      let buffer = "";
      socket.on("data", (chunk) => {
        buffer += chunk;

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line) {
            continue;
          }

          const request = JSON.parse(line) as { id: string; method: string };
          const response = {
            id: request.id,
            ok: true,
            result: request.method,
          };

          if (request.method === "slow") {
            setTimeout(() => {
              socket.write(`${JSON.stringify(response)}\n`);
            }, 20);
            continue;
          }

          socket.write(`${JSON.stringify(response)}\n`);
        }
      });
    });
    await listen(server, socketPath);
    const client = createDaemonSocketClient({ socketPath }) as unknown as {
      slow(): Promise<unknown>;
      fast(): Promise<unknown>;
      close(): void;
    };

    try {
      await expect(Promise.all([client.slow(), client.fast()])).resolves.toEqual([
        "slow",
        "fast",
      ]);
      expect(connectionCount).toBe(1);
    } finally {
      client.close();
      await closeServer(server);
    }
  });

  it("rejects pending client requests when the socket closes before a response", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-socket-"), "daemon.sock");
    const sockets = new Set<net.Socket>();
    const server = net.createServer((socket) => {
      sockets.add(socket);
      socket.once("close", () => {
        sockets.delete(socket);
      });
      socket.end();
    });
    await listen(server, socketPath);
    const client = createDaemonSocketClient({ socketPath, requestTimeoutMs: 1_000 });

    try {
      await expect(
        withDeadline(client.status() as unknown as Promise<unknown>, 100),
      ).rejects.toThrow(/closed/i);
    } finally {
      client.close();
      for (const socket of sockets) {
        socket.destroy();
      }
      await closeServer(server);
    }
  });

  it("times out pending client requests", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-socket-"), "daemon.sock");
    const server = net.createServer((socket) => {
      socket.resume();
    });
    await listen(server, socketPath);
    const client = createDaemonSocketClient({ socketPath, requestTimeoutMs: 20 });

    try {
      await expect(
        withDeadline(client.status() as unknown as Promise<unknown>, 100),
      ).rejects.toThrow(/timed out/i);
    } finally {
      client.close();
      await closeServer(server);
    }
  });

  it("reports a live daemon when a second server starts on the same socket path", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-socket-"), "daemon.sock");
    const first = createDaemonSocketServer({
      api: createDaemonApi(
        createDaemonState({
          db,
          createId: () => "agent-1",
          now: () => "2026-05-19T00:00:00.000Z",
        }),
      ),
      socketPath,
    });
    const firstHandle = await first.start();
    const second = createDaemonSocketServer({
      api: createDaemonApi(
        createDaemonState({
          db,
          createId: () => "agent-2",
          now: () => "2026-05-19T00:00:00.000Z",
        }),
      ),
      socketPath,
    });

    try {
      await expect(second.start()).rejects.toThrow(/already in use/);
    } finally {
      await firstHandle.close();
    }
  });

  it("removes a stale socket path after listen reports EADDRINUSE and retries once", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-socket-"), "daemon.sock");
    writeFileSync(socketPath, "");
    const server = createDaemonSocketServer({
      api: createDaemonApi(
        createDaemonState({
          db,
          createId: () => "agent-1",
          now: () => "2026-05-19T00:00:00.000Z",
        }),
      ),
      socketPath,
    });
    const handle = await server.start();

    try {
      expect(existsSync(socketPath)).toBe(true);
    } finally {
      await handle.close();
    }
  });
});

async function sendRawLine(socketPath: string, line: string): Promise<unknown> {
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

      const response = JSON.parse(buffer.slice(0, newlineIndex)) as unknown;
      socket.end();
      resolve(response);
    });
    socket.write(`${line}\n`);
  });
}

async function listen(server: net.Server, socketPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

async function closeServer(server: net.Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function withDeadline<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new Error("test deadline exceeded"));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
