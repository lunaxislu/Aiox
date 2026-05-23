/**
 * Step 14 integration tests: daemon/client split + socket reuse.
 *
 * All tests use in-process socket servers (no real child_process fork) to verify
 * that multiple createClientRuntime instances pointing to the same socket share
 * daemon state. The fork-and-connect path is verified via manual E2E smoke.
 */

import { existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createClientRuntime } from "../../src/bin/aiox.js";
import { createDaemonApi, type DaemonApi } from "../../src/daemon/api.js";
import { createDaemonSocketServer, type DaemonSocketServerHandle } from "../../src/daemon/socket-transport.js";
import { createDaemonState } from "../../src/daemon/state.js";
import { applySchema } from "../../src/store/schema.js";

// ── helpers ────────────────────────────────────────────────────────────────────

function uniqueSocketPath(): string {
  return join(mkdtempSync("/private/tmp/aiox-split-"), "daemon.sock");
}

let idCounter = 0;

function makeIds(): () => string {
  const base = idCounter++;
  let n = 0;
  return () => `test-${base}-${n++}`;
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Start a test daemon socket server with an auto-shutdown hook on stop().
 * When the client sends stop(), the server closes itself (mirrors real daemon behaviour).
 */
async function startTestDaemon(socketPath: string): Promise<{
  serverHandle: DaemonSocketServerHandle;
  db: Database;
}> {
  const db = new Database(":memory:");
  applySchema(db);
  const state = createDaemonState({ db, createId: makeIds(), now });
  const baseApi = createDaemonApi(state);

  let serverHandle: DaemonSocketServerHandle;

  // Wrap stop to auto-close the socket server after responding (mirrors _run-daemon)
  const api: DaemonApi = {
    ...baseApi,
    stop(request) {
      const response = baseApi.stop(request);
      setImmediate(async () => {
        if (serverHandle) {
          await serverHandle.close();
        }
        db.close();
      });
      return response;
    },
  };

  serverHandle = await createDaemonSocketServer({ api, socketPath }).start();
  return { serverHandle, db };
}

// ── tests ──────────────────────────────────────────────────────────────────────

describe("Step 14: daemon/client split", () => {
  let openHandles: DaemonSocketServerHandle[] = [];
  let openDbs: Database[] = [];

  beforeEach(() => {
    openHandles = [];
    openDbs = [];
  });

  afterEach(async () => {
    for (const h of openHandles) {
      try { await h.close(); } catch { /* already closed */ }
    }
    for (const db of openDbs) {
      try { db.close(); } catch { /* already closed */ }
    }
    openHandles = [];
    openDbs = [];
  });

  // ── 1. daemon status is read-only ──────────────────────────────────────────

  it("daemonStatus returns { running: false } without creating a socket when no daemon exists", async () => {
    const socketPath = uniqueSocketPath();
    const runtime = createClientRuntime({ socketPath });

    const result = await runtime.daemonStatus();

    expect(result.running).toBe(false);
    // The socket file must not have been created as a side effect
    expect(existsSync(socketPath)).toBe(false);
  });

  it("getDaemonApi throws a typed error when no daemon is running", async () => {
    const socketPath = uniqueSocketPath();
    const runtime = createClientRuntime({ socketPath });

    await expect(runtime.getDaemonApi()).rejects.toThrow(/daemon is not running/i);
  });

  // ── 2. daemon start creates a socket-backed daemon ──────────────────────────

  it("getDaemonApi connects to an existing socket-backed daemon and returns a working client", async () => {
    const socketPath = uniqueSocketPath();
    const { serverHandle, db } = await startTestDaemon(socketPath);
    openHandles.push(serverHandle);
    openDbs.push(db);

    const runtime = createClientRuntime({ socketPath });
    const api = await runtime.getDaemonApi();

    const status = await (api as DaemonApi).status();
    expect(status.daemon.pid).toBeGreaterThan(0);

    (api as DaemonApi & { close(): void }).close();
  });

  it("daemonStatus returns { running: true } when a daemon socket is reachable", async () => {
    const socketPath = uniqueSocketPath();
    const { serverHandle, db } = await startTestDaemon(socketPath);
    openHandles.push(serverHandle);
    openDbs.push(db);

    const runtime = createClientRuntime({ socketPath, version: "0.0.0-test" });
    const result = await runtime.daemonStatus();

    expect(result.running).toBe(true);
    if (result.running) {
      expect(result.pid).toBeGreaterThan(0);
      expect(result.socketPath).toBe(socketPath);
    }
  });

  // ── 3. two separate client instances share state through same socket ─────────

  it("two separate createClientRuntime instances share pair state through the same socket", async () => {
    const socketPath = uniqueSocketPath();
    const { serverHandle, db } = await startTestDaemon(socketPath);
    openHandles.push(serverHandle);
    openDbs.push(db);

    const runtimeA = createClientRuntime({ socketPath });
    const runtimeB = createClientRuntime({ socketPath });

    // Client A creates a pair
    const apiA = await runtimeA.getDaemonApi() as DaemonApi & { close(): void };
    const pairResult = await apiA.createPair({ name: "shared-pair" });
    expect(pairResult.ok).toBe(true);
    apiA.close();

    // Client B should see the same pair
    const apiB = await runtimeB.getDaemonApi() as DaemonApi & { close(): void };
    const status = await apiB.status();
    expect(status.pairs.map((p) => p.name)).toContain("shared-pair");
    apiB.close();
  });

  it("agent attached via one client runtime is visible to a second client runtime", async () => {
    const socketPath = uniqueSocketPath();
    const { serverHandle, db } = await startTestDaemon(socketPath);
    openHandles.push(serverHandle);
    openDbs.push(db);

    const runtimeA = createClientRuntime({ socketPath });
    const runtimeB = createClientRuntime({ socketPath });

    // Client A attaches an agent
    const apiA = await runtimeA.getDaemonApi() as DaemonApi & { close(): void };
    const attachResult = await apiA.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    expect(attachResult.ok).toBe(true);
    apiA.close();

    // Client B sees the agent
    const apiB = await runtimeB.getDaemonApi() as DaemonApi & { close(): void };
    const status = await apiB.status();
    expect(status.agents.map((a) => a.name)).toContain("impl");
    apiB.close();
  });

  // ── 4. stop shuts down daemon and invalidates socket ────────────────────────

  it("stopDaemon shuts down the daemon and makes the socket unreachable", async () => {
    const socketPath = uniqueSocketPath();
    // Note: startTestDaemon's auto-shutdown hook handles cleanup; don't push to openHandles
    const { db } = await startTestDaemon(socketPath);
    openDbs.push(db);

    const runtime = createClientRuntime({ socketPath });

    // Verify running before stop
    expect((await runtime.daemonStatus()).running).toBe(true);

    // Stop the daemon
    await runtime.stopDaemon({});

    // Daemon should now be unreachable
    const finalStatus = await runtime.daemonStatus();
    expect(finalStatus.running).toBe(false);
  });

  // ── 5. Step 13 Codex MCP ingress uses the same socket path ──────────────────

  it("daemonSocketPath returns the socket path used by getDaemonApi (Step 13 regression)", async () => {
    const socketPath = uniqueSocketPath();
    const { serverHandle, db } = await startTestDaemon(socketPath);
    openHandles.push(serverHandle);
    openDbs.push(db);

    const runtime = createClientRuntime({ socketPath });

    // daemonSocketPath() is used by the Codex MCP ingress to know which socket to connect to
    expect(runtime.daemonSocketPath?.()).toBe(socketPath);

    // getDaemonApi connects to the same socket path
    const api = await runtime.getDaemonApi() as DaemonApi & { close(): void };
    expect(await api.status()).toBeDefined();
    api.close();
  });

  // ── 6. stable default socket path ───────────────────────────────────────────

  it("two createClientRuntime instances with no explicit socketPath use the same default path", () => {
    const runtimeA = createClientRuntime();
    const runtimeB = createClientRuntime();

    // Both should target the same default socket path
    expect(runtimeA.daemonSocketPath?.()).toBe(runtimeB.daemonSocketPath?.());
  });
});
