#!/usr/bin/env node
import type { ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import Database from "better-sqlite3";

import { launchCodexTui } from "../adapters/codex/launcher.js";
import { createDoctorResult } from "../cli/doctor.js";
import { invokeParsedCommand, type InvocationRuntime } from "../cli/invocation.js";
import { parseCli } from "../cli/parse.js";
import { getSocketPath } from "../config/paths.js";
import { createDaemonServer, type DaemonServerHandle } from "../daemon/server.js";
import {
  productionAttachCodexRuntime,
  type AttachCodexRuntime,
} from "../daemon/state.js";
import {
  canConnect,
  createDaemonSocketClient,
  createDaemonSocketServer,
  type DaemonSocketServerHandle,
} from "../daemon/socket-transport.js";
import { applySchema } from "../store/schema.js";

export interface RunAioxCliOptions {
  stdout?: Pick<NodeJS.WriteStream, "write">;
  stderr?: Pick<NodeJS.WriteStream, "write">;
  runtime?: InvocationRuntime;
  cwd?: string;
  version?: string;
  launchCodexTui?: (options: {
    endpoint: URL;
    resumeSessionId?: string;
  }) => ChildProcess;
}

export async function runAioxCli(
  argv: string[] = process.argv.slice(2),
  options: RunAioxCliOptions = {},
): Promise<number> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;

  try {
    const version = options.version ?? readPackageVersion();
    const command = parseCli(argv, {
      version,
    });
    const runtime = options.runtime ?? createClientRuntime({ version });
    let result;
    try {
      result = await invokeParsedCommand(command, {
        runtime,
        cwd: options.cwd ?? process.cwd(),
        launchCodexTui: options.launchCodexTui ?? launchCodexTui,
      });
    } finally {
      await runtime.dispose?.();
    }

    if (result.stdout) {
      stdout.write(result.stdout);
    }

    return result.exitCode;
  } catch (error) {
    stderr.write(`${formatErrorMessage(error)}\n`);
    return getExitCode(error);
  }
}

// ── createClientRuntime ──────────────────────────────────────────────────────
// Pure socket client runtime. Connects to a pre-existing daemon socket.
// Does NOT start an in-process daemon. Used by all production CLI invocations.

export interface CreateClientRuntimeOptions {
  socketPath?: string;
  version?: string;
}

export function createClientRuntime(
  options: CreateClientRuntimeOptions = {},
): InvocationRuntime {
  const socketPath = options.socketPath ?? getSocketPath();
  const version = options.version ?? readPackageVersion();
  const clients = new Set<ReturnType<typeof createDaemonSocketClient>>();

  return {
    async getDaemonApi() {
      if (!(await canConnect(socketPath))) {
        throw new Error(
          `daemon is not running (socket: ${socketPath}). Run 'aiox daemon start' first.`,
        );
      }

      const client = createDaemonSocketClient({ socketPath });
      clients.add(client);
      return client;
    },

    dispose() {
      for (const client of clients) {
        client.close();
      }
      clients.clear();
    },

    async startDaemon() {
      if (await canConnect(socketPath)) {
        return { ok: true };
      }

      await forkDaemonProcess(socketPath);
      return { ok: true };
    },

    async stopDaemon(request) {
      if (!(await canConnect(socketPath))) {
        return { ok: true, stoppedAgents: [] };
      }

      const client = createDaemonSocketClient({ socketPath });
      let response: unknown;
      try {
        response = await client.stop(request);
      } finally {
        client.close();
      }

      // Wait for the daemon to close the socket (auto-shutdown after stop)
      await waitForSocketGone(socketPath);
      return response;
    },

    async restartDaemon() {
      await this.stopDaemon({});
      await this.startDaemon();
      return { ok: true };
    },

    async daemonStatus() {
      if (!(await canConnect(socketPath))) {
        return { running: false as const, socketPath, dbPath: ":memory:", version };
      }

      const client = createDaemonSocketClient({ socketPath });
      try {
        const status = await client.status();
        return {
          running: true as const,
          pid: status.daemon.pid,
          socketPath,
          dbPath: ":memory:",
          startedAt: status.daemon.startedAt,
          version,
        };
      } finally {
        client.close();
      }
    },

    doctor() {
      return createDoctorResult({ socketPath });
    },

    daemonSocketPath() {
      return socketPath;
    },
  };
}

// ── forkDaemonProcess / waitForSocketGone ─────────────────────────────────────

export interface DaemonForkCommand {
  command: string;
  args: string[];
}

export function resolveDaemonForkCommand(input: {
  binPath: string;
  socketPath: string;
  nodeCommand?: string;
  tsxCommand?: string;
}): DaemonForkCommand {
  const commonArgs = [input.binPath, "_run-daemon", "--socket", input.socketPath];
  if (input.binPath.endsWith(".ts")) {
    return { command: input.tsxCommand ?? "tsx", args: commonArgs };
  }
  return {
    command: input.nodeCommand ?? process.execPath,
    args: commonArgs,
  };
}

async function forkDaemonProcess(socketPath: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  const binPath = process.argv[1];
  const fork = resolveDaemonForkCommand({ binPath, socketPath });

  const child = spawn(fork.command, fork.args, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  await waitForSocketAvailable(socketPath, { timeoutMs: 10_000, pollIntervalMs: 50 });
}

async function waitForSocketAvailable(
  socketPath: string,
  options: { timeoutMs: number; pollIntervalMs: number },
): Promise<void> {
  const deadline = Date.now() + options.timeoutMs;

  while (Date.now() < deadline) {
    if (await canConnect(socketPath)) {
      return;
    }

    await sleep(options.pollIntervalMs);
  }

  throw new Error(`daemon socket did not become available: ${socketPath}`);
}

async function waitForSocketGone(socketPath: string, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!(await canConnect(socketPath))) {
      return;
    }

    await sleep(50);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── createSocketRuntime (legacy in-process runtime, used in tests) ────────────

export interface CreateSocketRuntimeOptions {
  socketPath?: string;
  dbPath?: string;
  version?: string;
  attachCodexRuntime?: AttachCodexRuntime;
}

export function createSocketRuntime(
  options: CreateSocketRuntimeOptions = {},
): InvocationRuntime & { close(): Promise<void> } {
  const dbPath = options.dbPath ?? ":memory:";
  const version = options.version ?? readPackageVersion();
  const socketPath = options.socketPath ?? createDefaultSocketPath();
  const db = new Database(dbPath);
  applySchema(db);

  const server = createDaemonServer({
    db,
    createId: createSequentialId,
    now: () => new Date().toISOString(),
    attachCodexRuntime: options.attachCodexRuntime ?? productionAttachCodexRuntime,
    daemonSocketPath: socketPath,
  });
  let daemonHandle: DaemonServerHandle | null = null;
  let socketHandle: DaemonSocketServerHandle | null = null;
  let client: ReturnType<typeof createDaemonSocketClient> | null = null;

  async function start(): Promise<void> {
    if (socketHandle) {
      return;
    }

    daemonHandle = server.start();
    socketHandle = await createDaemonSocketServer({
      api: daemonHandle.api,
      socketPath,
    }).start();
    client = createDaemonSocketClient({ socketPath });
  }

  async function stop(request = {}): Promise<unknown> {
    if (!daemonHandle) {
      return { ok: true, stoppedAgents: [] };
    }

    const activeClient = client ?? createDaemonSocketClient({ socketPath });
    const response = await activeClient.stop(request);
    activeClient.close();

    if (socketHandle) {
      await socketHandle.close();
    }

    daemonHandle = null;
    socketHandle = null;
    client = null;
    return response;
  }

  return {
    async getDaemonApi() {
      await start();

      if (!client) {
        throw new Error("socket client was not initialized");
      }

      return client;
    },
    async startDaemon() {
      await start();
      return { ok: true };
    },
    stopDaemon(request) {
      return stop(request);
    },
    async restartDaemon() {
      await stop({});
      await start();
      return { ok: true };
    },
    async daemonStatus() {
      if (!daemonHandle) {
        if (existsSync(socketPath)) {
          const remoteClient = createDaemonSocketClient({ socketPath });
          try {
            const response = await remoteClient.status();
            return {
              running: true,
              pid: response.daemon.pid,
              socketPath,
              dbPath,
              startedAt: response.daemon.startedAt,
              version,
            };
          } finally {
            remoteClient.close();
          }
        }

        return {
          running: false,
          socketPath,
          dbPath,
          version,
        };
      }

      return {
        running: true,
        pid: process.pid,
        socketPath,
        dbPath,
        startedAt: daemonHandle.api.status().daemon.startedAt,
        version,
      };
    },
    doctor() {
      return createDoctorResult({ socketPath });
    },
    daemonSocketPath() {
      return socketPath;
    },
    async close() {
      await stop({ daemonOnly: true });
      db.close();
    },
  };
}

export function createInProcessRuntime(): InvocationRuntime {
  const db = new Database(":memory:");
  applySchema(db);

  const server = createDaemonServer({
    db,
    createId: createSequentialId,
    now: () => new Date().toISOString(),
    attachCodexRuntime: productionAttachCodexRuntime,
  });
  let handle: DaemonServerHandle | null = null;

  function start(): DaemonServerHandle {
    handle = server.start();
    return handle;
  }

  return {
    getDaemonApi() {
      return (handle ?? start()).api;
    },
    startDaemon() {
      start();
      return { ok: true };
    },
    stopDaemon(request) {
      if (!handle) {
        return { ok: true, stoppedAgents: [] };
      }

      const response = handle.stop(request);
      handle = null;
      return response;
    },
    restartDaemon() {
      if (handle) {
        handle.stop({});
      }

      start();
      return { ok: true };
    },
    daemonStatus() {
      const activeHandle = handle ?? start();
      return {
        running: true,
        pid: process.pid,
        socketPath: "in-process",
        dbPath: ":memory:",
        startedAt: activeHandle.api.status().daemon.startedAt,
        version: readPackageVersion(),
      };
    },
    doctor() {
      return { checks: [] };
    },
  };
}

function createDefaultSocketPath(): string {
  if (process.env.AIOX_SOCKET_PATH) {
    return process.env.AIOX_SOCKET_PATH;
  }

  return join(mkdtempSync(join(tmpdir(), "aiox-")), "daemon.sock");
}

function readPackageVersion(): string {
  for (const url of [
    new URL("../../package.json", import.meta.url),
    new URL("../../../package.json", import.meta.url),
  ]) {
    try {
      const manifest = JSON.parse(readFileSync(url, "utf8")) as { version?: string };
      return manifest.version ?? "1.0.0";
    } catch {
      // Try the next path; source and compiled output sit at different depths.
    }
  }

  return "1.0.0";
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getExitCode(error: unknown): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "exitCode" in error &&
    typeof error.exitCode === "number"
  ) {
    return error.exitCode;
  }

  return 1;
}

let nextId = 1;

function createSequentialId(): string {
  const id = `cli-${nextId}`;
  nextId += 1;
  return id;
}

export interface RunAioxCliMainOptions {
  run?: () => Promise<number>;
  exit?: (exitCode: number) => void;
}

/**
 * Preserve successful long-lived subcommands (such as stdio MCP servers).
 * Node exits naturally after ordinary successful commands once no handles remain.
 */
export async function runAioxCliMain(
  options: RunAioxCliMainOptions = {},
): Promise<void> {
  const exitCode = await (options.run ?? runAioxCli)();
  if (exitCode !== 0) {
    (options.exit ?? process.exit)(exitCode);
  }
}

async function main(): Promise<void> {
  await runAioxCliMain();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
