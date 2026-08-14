import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/core/public-ids.js", () => ({
  createPublicMessageId: vi.fn(() => "opaque run default message"),
  createPublicDeliveryId: vi.fn(() => "opaque run default delivery"),
}));

import { createPublicDeliveryId } from "../../../src/core/public-ids.js";
import type { DaemonApi } from "../../../src/daemon/api.js";
import { runDaemonProcess } from "../../../src/daemon/run.js";
import { canConnect, createDaemonSocketClient } from "../../../src/daemon/socket-transport.js";

describe("runDaemonProcess", () => {
  it("writes redacted fatal diagnostics before an unhandled rejection exits", () => {
    const secret = "AIOX_FATAL_SECRET_SENTINEL";
    const testHome = mkdtempSync(join(tmpdir(), "aiox-fatal-"));
    const fatalPath = join(testHome, ".aiox", "dev", "latest-fatal.json");
    const runModuleUrl = new URL("../../../src/daemon/run.ts", import.meta.url).href;
    const pathsModuleUrl = new URL("../../../src/config/paths.ts", import.meta.url).href;
    const childScript = [
      `const { existsSync } = await import("node:fs");`,
      `const { getSocketPath } = await import(${JSON.stringify(pathsModuleUrl)});`,
      `const { runDaemonProcess } = await import(${JSON.stringify(runModuleUrl)});`,
      `const socketPath = getSocketPath();`,
      `void runDaemonProcess(socketPath);`,
      `for (let attempt = 0; attempt < 100 && !existsSync(socketPath); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 10));`,
      `if (!existsSync(socketPath)) throw new Error("daemon socket did not start");`,
      `Promise.reject(new Error(${JSON.stringify(secret)}));`,
      `setTimeout(() => {}, 50);`,
    ].join("\n");
    const child = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "--eval",
        childScript,
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          AIOX_PROFILE: "dev",
          HOME: testHome,
          // `getSocketPath()` treats `AIOX_SOCKET_PATH` as a higher-priority
          // override than `HOME`/profile. An ambient aiox-connected shell (e.g.
          // this repo's own `aiox claude` session) exports it, which would make
          // the spawned child collide with the real running daemon instead of
          // using the isolated `testHome` profile dir.
          AIOX_SOCKET_PATH: undefined,
        },
      },
    );

    expect(child.status).toBeTypeOf("number");
    expect(child.status).not.toBe(0);

    const profileDir = dirname(fatalPath);
    const artifactNames = existsSync(profileDir)
      ? readdirSync(profileDir).filter((name) => name === "latest-fatal.json")
      : [];
    const artifactText = existsSync(fatalPath)
      ? readFileSync(fatalPath, "utf8")
      : undefined;
    let artifactOrigin: unknown;
    let structuredJson = false;
    if (artifactText !== undefined) {
      const artifact: unknown = JSON.parse(artifactText);
      structuredJson = typeof artifact === "object" && artifact !== null;
      artifactOrigin = structuredJson
        ? (artifact as Record<string, unknown>).origin
        : undefined;
    }

    expect({
      artifactNames,
      structuredJson,
      artifactOrigin,
      rawSecretAbsent:
        artifactText === undefined ? false : !artifactText.includes(secret),
      artifactMode: existsSync(fatalPath) ? statSync(fatalPath).mode & 0o777 : null,
    }).toEqual({
      artifactNames: ["latest-fatal.json"],
      structuredJson: true,
      artifactOrigin: "unhandledRejection",
      rawSecretAbsent: true,
      artifactMode: 0o600,
    });
  });

  it("rejects when the daemon socket server cannot start", async () => {
    const socketPath = join(
      mkdtempSync("/private/tmp/aiox-run-"),
      "missing-parent",
      "daemon.sock",
    );

    const result = await Promise.race([
      runDaemonProcess(socketPath).then(
        () => "resolved",
        (error: unknown) => error,
      ),
      new Promise<"pending">((resolve) => {
        setTimeout(() => resolve("pending"), 100);
      }),
    ]);

    expect(result).toBeInstanceOf(Error);
  });

  it("uses the core public delivery default through the production daemon entrypoint", async () => {
    vi.mocked(createPublicDeliveryId).mockReset();
    vi.mocked(createPublicDeliveryId).mockReturnValue("opaque run default delivery");
    const socketPath = join(mkdtempSync("/private/tmp/aiox-run-"), "daemon.sock");
    const daemon = runDaemonProcess(socketPath);
    await waitForSocket(socketPath);
    const api = createDaemonSocketClient({ socketPath });

    try {
      await api.attachAgent({ kind: "claude", name: "source", cwd: "/repo" });
      await api.attachAgent({ kind: "claude", name: "target", cwd: "/repo" });
      await api.connect({ sourceName: "source", targetNames: ["target"] });
      const result = await api.sendMessage({
        sourceName: "source",
        messageId: "source-issued",
        type: "question",
        content: "hello",
      });

      if (!result.ok) throw new Error("expected accepted message");
      expect(createPublicDeliveryId).toHaveBeenCalledOnce();
      expect(result.deliveries).toHaveLength(1);
      expect(result.deliveries[0]?.id).toBe("opaque run default delivery");
    } finally {
      await api.stop({});
      api.close();
      await daemon;
    }
  });

  it("finishes daemon cleanup when closing the socket server rejects", async () => {
    const closeSocket = vi.fn().mockRejectedValue(new Error("socket close failed"));
    const stopState = vi.fn(() => ({ ok: true, stoppedAgents: [] }));
    const closeDatabase = vi.fn();
    const originalSigtermListeners = new Set(process.listeners("SIGTERM"));

    vi.resetModules();
    vi.doMock("better-sqlite3", () => ({
      default: class TestDatabase {
        close = closeDatabase;
      },
    }));
    vi.doMock("../../../src/store/schema.js", () => ({ applySchema: vi.fn() }));
    vi.doMock("../../../src/daemon/server.js", () => ({
      createDaemonServer: vi.fn(() => ({
        start: () => ({ api: {}, stop: stopState }),
      })),
    }));
    vi.doMock("../../../src/daemon/socket-transport.js", () => ({
      createDaemonSocketServer: vi.fn(() => ({
        start: async () => ({ socketPath: "/tmp/test.sock", close: closeSocket }),
      })),
    }));

    try {
      const { runDaemonProcess: runWithCloseFailure } = await import(
        "../../../src/daemon/run.js"
      );
      const daemon = runWithCloseFailure("/tmp/test.sock");

      const sigtermListener = await vi.waitFor(() => {
        const listener = process
          .listeners("SIGTERM")
          .find((listener) => !originalSigtermListeners.has(listener));
        expect(listener).toBeDefined();
        return listener;
      });

      sigtermListener?.("SIGTERM");
      await new Promise((resolve) => setImmediate(resolve));
      const shutdown = await Promise.race([
        daemon.then(() => "resolved" as const),
        new Promise<"pending">((resolve) => {
          setTimeout(() => resolve("pending"), 20);
        }),
      ]);

      expect({
        socketCloseCalls: closeSocket.mock.calls.length,
        stateStopCalls: stopState.mock.calls.length,
        databaseCloseCalls: closeDatabase.mock.calls.length,
        shutdown,
      }).toEqual({
        socketCloseCalls: 1,
        stateStopCalls: 1,
        databaseCloseCalls: 1,
        shutdown: "resolved",
      });
    } finally {
      for (const listener of process.listeners("SIGTERM")) {
        if (!originalSigtermListeners.has(listener)) {
          process.removeListener("SIGTERM", listener);
        }
      }
      vi.doUnmock("better-sqlite3");
      vi.doUnmock("../../../src/store/schema.js");
      vi.doUnmock("../../../src/daemon/server.js");
      vi.doUnmock("../../../src/daemon/socket-transport.js");
      vi.resetModules();
    }
  });

  it("waits for Codex runtime disposal before SIGTERM closes the database", async () => {
    let api!: DaemonApi;
    let resolveDisposal!: () => void;
    const disposal = new Promise<void>((resolve) => {
      resolveDisposal = resolve;
    });
    const runtime = {
      state: "ready" as const,
      endpoint: new URL("ws://127.0.0.1:4501"),
      activeThreadId: null,
      startThread: vi.fn(async () => null),
      resumeThread: vi.fn(async (threadId: string) => threadId),
      listLoadedThreadIds: vi.fn(async () => []),
      rebindActiveThread: vi.fn(),
      dispose: vi.fn(() => disposal),
    };
    const closeDatabase = vi.fn();
    const originalSigtermListeners = new Set(process.listeners("SIGTERM"));

    vi.resetModules();
    vi.doMock("better-sqlite3", async (importOriginal) => {
      const { default: ActualDatabase } = await importOriginal<
        typeof import("better-sqlite3")
      >();
      return {
        default: class TestDatabase extends ActualDatabase {
          override close() {
            closeDatabase();
            return super.close();
          }
        },
      };
    });
    vi.doMock("../../../src/daemon/state.js", async (importOriginal) => {
      const actual = await importOriginal<typeof import("../../../src/daemon/state.js")>();
      return {
        ...actual,
        productionAttachCodexRuntime: vi.fn(async () => runtime),
      };
    });
    vi.doMock("../../../src/daemon/socket-transport.js", () => ({
      createDaemonSocketServer: vi.fn(
        (options: { api: typeof api }) => ({
          start: async () => {
            api = options.api;
            return { socketPath: "/tmp/test.sock", close: vi.fn() };
          },
        }),
      ),
    }));

    try {
      const { runDaemonProcess: runWithDeferredDisposal } = await import(
        "../../../src/daemon/run.js"
      );
      let daemonResolved = false;
      const daemon = runWithDeferredDisposal("/tmp/test.sock").then(() => {
        daemonResolved = true;
      });

      const sigtermListener = await vi.waitFor(async () => {
        const listener = process
          .listeners("SIGTERM")
          .find((listener) => !originalSigtermListeners.has(listener));
        expect(listener).toBeDefined();
        expect(api).toBeDefined();
        return listener;
      });
      await api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

      sigtermListener?.("SIGTERM");
      await vi.waitFor(() => expect(runtime.dispose).toHaveBeenCalledOnce());
      expect(closeDatabase).not.toHaveBeenCalled();
      expect(daemonResolved).toBe(false);

      resolveDisposal();
      await daemon;

      expect(closeDatabase).toHaveBeenCalledOnce();
      expect(daemonResolved).toBe(true);
    } finally {
      resolveDisposal();
      for (const listener of process.listeners("SIGTERM")) {
        if (!originalSigtermListeners.has(listener)) {
          process.removeListener("SIGTERM", listener);
        }
      }
      vi.doUnmock("better-sqlite3");
      vi.doUnmock("../../../src/daemon/state.js");
      vi.doUnmock("../../../src/daemon/socket-transport.js");
      vi.resetModules();
    }
  });
});

async function waitForSocket(socketPath: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await canConnect(socketPath)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`daemon did not listen at ${socketPath}`);
}
