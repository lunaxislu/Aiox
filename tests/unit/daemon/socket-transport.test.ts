import { existsSync, mkdtempSync } from "node:fs";
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
