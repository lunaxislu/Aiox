import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import {
  createHostController,
  selectAndStaticPreflightAdapter,
} from "../../../src/host/host-controller.js";
import {
  invokeParsedCommand,
  type InvocationRuntime,
} from "../../../src/cli/invocation.js";

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
      const prepared = await selectAndStaticPreflightAdapter(registry, { cwd: "/repo/demo" });
      if (!prepared.ok) throw new Error("expected adapter preparation to succeed");
      const controller = createHostController({
        api: socketApi,
        terminator: createFakeAgentRuntimeTerminator(),
        createId,
      });

      const result = await controller.start({
        name: "demo",
        path: "/repo/demo",
        preparedAdapter: prepared.preparedAdapter,
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

  it("observes hosted CLI starting to ready to absent through the real daemon socket", async () => {
    const state: DaemonState = createDaemonState({
      db,
      createId,
      now: () => "2026-08-31T00:00:00.000Z",
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => ({
        state: "ready",
        endpoint: new URL("ws://127.0.0.1:54321/"),
        activeThreadId: null,
        dispose: async () => {},
        startThread: async () => "thread-1",
        resumeThread: async () => null,
        listLoadedThreadIds: async () => [],
        rebindActiveThread: () => undefined,
      }),
    });
    const server = createDaemonSocketServer({ api: createDaemonApi(state), socketPath: socketPath() });
    socketHandle = await server.start();

    const socketApi = createDaemonSocketClient({ socketPath: socketHandle.socketPath });
    clients.push(socketApi);
    const registry = createAdapterRegistry();
    registry.register(createFakeHostAdapter({ id: "fake" }));
    const prepared = await selectAndStaticPreflightAdapter(registry, { cwd: "/repo/demo" });
    if (!prepared.ok) throw new Error("expected adapter preparation to succeed");
    const controller = createHostController({
      api: socketApi,
      terminator: createFakeAgentRuntimeTerminator(),
      createId,
    });
    const started = await controller.start({
      name: "demo",
      path: "/repo/demo",
      preparedAdapter: prepared.preparedAdapter,
      agents: [{ name: "reviewer", kind: "codex" }],
    });
    if (!started.ok) throw new Error("expected host start");

    const child = Object.assign(new EventEmitter(), { pid: 4242 }) as ChildProcess;
    const runtime: InvocationRuntime = {
      getDaemonApi: () => socketApi,
      startDaemon: async () => ({ ok: true }),
      stopDaemon: async () => ({ ok: true, stoppedAgents: [] }),
      restartDaemon: async () => ({ ok: true }),
      daemonStatus: () => ({
        running: true,
        pid: 1,
        socketPath: socketHandle!.socketPath,
        dbPath: ":memory:",
        startedAt: "2026-08-31T00:00:00.000Z",
        version: "test-version",
      }),
      daemonSocketPath: () => socketHandle!.socketPath,
      doctor: () => ({ checks: [] }),
    };
    const invoked = invokeParsedCommand(
      {
        kind: "agent-attach",
        agentKind: "codex",
        name: "reviewer",
        hostId: started.hostId,
      },
      {
        runtime,
        cwd: "/repo/demo",
        launchCodexTui: () => {
          setTimeout(() => child.emit("spawn"), 0);
          return child;
        },
      },
    );

    await vi.waitFor(async () => {
      const listed = await socketApi.listHostAgents({ hostId: started.hostId });
      expect(listed.agents).toMatchObject([{ name: "reviewer", status: "ready" }]);
    });
    await controller.reconcile();
    expect(controller.listAgents()).toMatchObject([{ name: "reviewer", status: "ready" }]);

    child.emit("exit", 0, null);
    await expect(invoked).resolves.toEqual({ exitCode: 0 });
    await controller.reconcile();
    expect(controller.listAgents()).toEqual([]);
    expect((await socketApi.listRunningHosts()).hosts).toHaveLength(1);
  });

  it("relays a path-qualified host route command from another CLI through the real socket and returns the controller result", async () => {
    const state: DaemonState = createDaemonState({
      db,
      createId,
      now: () => "2026-08-31T00:00:00.000Z",
    });
    const server = createDaemonSocketServer({ api: createDaemonApi(state), socketPath: socketPath() });
    socketHandle = await server.start();
    const controllerApi = createDaemonSocketClient({ socketPath: socketHandle.socketPath });
    const requesterApi = createDaemonSocketClient({ socketPath: socketHandle.socketPath });
    clients.push(controllerApi, requesterApi);
    const registry = createAdapterRegistry();
    registry.register(createFakeHostAdapter({ id: "fake" }));
    const prepared = await selectAndStaticPreflightAdapter(registry, { cwd: "/repo/demo" });
    if (!prepared.ok) throw new Error("expected adapter preparation to succeed");
    const controller = createHostController({
      api: controllerApi,
      terminator: createFakeAgentRuntimeTerminator(),
      createId,
    });
    const started = await controller.start({
      name: "demo",
      path: "/repo/demo",
      preparedAdapter: prepared.preparedAdapter,
      agents: [
        { name: "reviewer", kind: "claude" },
        { name: "implementer", kind: "codex" },
      ],
    });
    if (!started.ok) throw new Error("expected host start");
    const runtime: InvocationRuntime = {
      getDaemonApi: () => requesterApi,
      startDaemon: async () => ({ ok: true }),
      stopDaemon: async () => ({ ok: true, stoppedAgents: [] }),
      restartDaemon: async () => ({ ok: true }),
      daemonStatus: () => ({
        running: true,
        pid: 1,
        socketPath: socketHandle!.socketPath,
        dbPath: ":memory:",
        startedAt: "2026-08-31T00:00:00.000Z",
        version: "test-version",
      }),
      daemonSocketPath: () => socketHandle!.socketPath,
      doctor: () => ({ checks: [] }),
    };

    const invoked = invokeParsedCommand(
      {
        kind: "host-route",
        name: "demo",
        path: "/repo/demo",
        routes: [
          { op: "add", name: "development", members: ["reviewer", "implementer"] },
        ],
      },
      { runtime, cwd: "/repo/other-shell" },
    );
    await vi.waitFor(async () => {
      const handled = await controller.handleNextControlRequest();
      expect(handled).toMatchObject({ claimed: true, kind: "host_route" });
    });

    await expect(invoked).resolves.toEqual({
      exitCode: 0,
      stdout:
        '{"ok":true,"routes":[{"name":"development","members":["reviewer","implementer"],"directed":[]}],"effectiveEdgeCount":0}\n',
    });
  });

  function socketPath(): string {
    return join(mkdtempSync("/private/tmp/aiox-host-socket-"), "daemon.sock");
  }
});
