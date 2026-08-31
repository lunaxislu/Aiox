import { mkdtempSync } from "node:fs";
import { join } from "node:path";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState, type DaemonState } from "../../../src/daemon/state.js";
import {
  createDaemonSocketClient,
  createDaemonSocketServer,
  type DaemonSocketServerHandle,
} from "../../../src/daemon/socket-transport.js";
import { applySchema } from "../../../src/store/schema.js";
import { createAdapterRegistry } from "../../../src/host/adapter-registry.js";
import { createFakeAgentRuntimeTerminator } from "../../../src/host/fake-agent-runtime-terminator.js";
import { createFakeHostAdapter } from "../../../src/host/fake-host-adapter.js";
import { createHostController } from "../../../src/host/host-controller.js";

/**
 * `HostController` must work against the real production dependency —
 * `createDaemonSocketClient()`'s Proxy, whose calls are always `Promise`s at
 * runtime even though `DaemonApi` declares several host-runtime methods with
 * synchronous return types. In-process `DaemonApi` (used by every other host
 * test) can't catch a controller that forgets to `await` those calls.
 */
describe("HostController over the real daemon socket transport", () => {
  let db: InstanceType<typeof Database>;
  let nextId: number;
  let socketHandle: DaemonSocketServerHandle | undefined;
  let clients: Array<{ close(): void }>;

  function createId(): string {
    nextId += 1;
    return `id-${nextId}`;
  }

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
    nextId = 0;
    clients = [];
  });

  afterEach(async () => {
    for (const client of clients) {
      client.close();
    }
    if (socketHandle) {
      await socketHandle.close();
      socketHandle = undefined;
    }
    db.close();
  });

  it("registers a running host and its agents through a real socket-backed DaemonApi, with no unhandled rejection", async () => {
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => {
      unhandledRejections.push(reason);
    };
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      const state: DaemonState = createDaemonState({
        db,
        createId,
        now: () => "2026-08-31T00:00:00.000Z",
      });
      const server = createDaemonSocketServer({ api: createDaemonApi(state), socketPath: socketPath() });
      socketHandle = await server.start();

      const socketApi = createDaemonSocketClient({ socketPath: socketHandle.socketPath });
      clients.push(socketApi);

      const registry = createAdapterRegistry();
      const fake = createFakeHostAdapter({ id: "fake" });
      registry.register(fake);
      const controller = createHostController({
        api: socketApi,
        registry,
        terminator: createFakeAgentRuntimeTerminator(),
        createId,
      });

      const result = await controller.start({
        name: "demo",
        path: "/repo/demo",
        agents: [{ name: "reviewer", kind: "claude" }],
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected start to succeed over the socket transport");
      expect(result.host.name).toBe("demo");

      const listed = await socketApi.listHostAgents({ hostId: result.hostId });
      expect(listed).toMatchObject({
        ok: true,
        agents: [{ name: "reviewer", status: "starting" }],
      });

      // Give any dangling, un-awaited request a turn to settle/reject before
      // asserting no unhandled rejection was observed.
      await new Promise((resolveTick) => setTimeout(resolveTick, 20));
      expect(unhandledRejections).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }
  });

  function socketPath(): string {
    return join(mkdtempSync("/private/tmp/aiox-host-socket-"), "daemon.sock");
  }
});
