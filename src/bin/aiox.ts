#!/usr/bin/env node
import type { ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";

import { launchCodexTui } from "../adapters/codex/launcher.js";
import { createDoctorResult } from "../cli/doctor.js";
import {
  InvocationError,
  invokeParsedCommand,
  type HostWorkerStartRequest,
  type InvocationResult,
  type InvocationRuntime,
} from "../cli/invocation.js";
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
  /** Test/embedding seam; production defaults to the detached entrypoint worker. */
  startHostWorker?: (request: HostWorkerStartRequest) => Promise<InvocationResult>;
  /** Internal worker marker override used by tests; production reads its private env marker. */
  hostWorkerMode?: boolean;
}

const HOST_WORKER_ENV = "AIOX_INTERNAL_HOST_WORKER";
const HOST_STARTED_STDOUT = "AIOX host started in background.\n";

export async function runAioxCli(
  argv: string[] = process.argv.slice(2),
  options: RunAioxCliOptions = {},
): Promise<number> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const hostWorkerMode = options.hostWorkerMode ?? process.env[HOST_WORKER_ENV] === "1";
  let startupReported = false;
  let startupChannelLost = hostWorkerMode && !process.connected;
  if (hostWorkerMode) {
    process.once("disconnect", () => {
      if (!startupReported) startupChannelLost = true;
    });
  }

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
        ...(hostWorkerMode
          ? {
              onHostControllerStarted: async () => {
                if (startupChannelLost || !process.connected) {
                  throw new Error("parent disconnected before host startup handoff");
                }
                await sendHostWorkerStartupMessage({ type: "aiox-host-startup", ok: true });
                startupReported = true;
              },
            }
          : {
              startHostWorker:
                options.startHostWorker ??
                ((request) =>
                  forkHostWorkerProcess({
                    binPath: process.argv[1]!,
                    argv,
                    cwd: request.cwd,
                  })),
            }),
      });
    } finally {
      await runtime.dispose?.();
    }

    if (result.stdout) {
      stdout.write(result.stdout);
    }

    return result.exitCode;
  } catch (error) {
    if (hostWorkerMode && !startupReported && !startupChannelLost && process.connected) {
      try {
        await sendHostWorkerStartupMessage({
          type: "aiox-host-startup",
          ok: false,
          code:
            error instanceof InvocationError ? error.code : "aiox.invocation.host_worker_failed",
          exitCode: getExitCode(error),
          message: formatErrorMessage(error),
        });
        startupReported = true;
      } catch {
        startupChannelLost = true;
      }
    }
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

export function resolveHostWorkerForkCommand(input: {
  binPath: string;
  argv: readonly string[];
  nodeCommand?: string;
  tsxCommand?: string;
}): DaemonForkCommand {
  const args = [input.binPath, ...input.argv];
  if (input.binPath.endsWith(".ts")) {
    return { command: input.tsxCommand ?? "tsx", args };
  }
  return { command: input.nodeCommand ?? process.execPath, args };
}

interface HostWorkerStartupSuccess {
  type: "aiox-host-startup";
  ok: true;
}

interface HostWorkerStartupFailure {
  type: "aiox-host-startup";
  ok: false;
  code: string;
  exitCode: number;
  message: string;
}

type HostWorkerStartupMessage = HostWorkerStartupSuccess | HostWorkerStartupFailure;

export function waitForHostWorkerStartup(child: ChildProcess): Promise<InvocationResult> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const release = () => {
      child.off("message", onMessage);
      child.off("error", onError);
      child.off("exit", onExit);
      if (child.connected) child.disconnect();
      child.unref();
    };
    const finish = (result: InvocationResult | Error) => {
      if (settled) return;
      settled = true;
      release();
      if (result instanceof Error) reject(result);
      else resolve(result);
    };
    const onMessage = (value: unknown) => {
      if (!isHostWorkerStartupMessage(value)) {
        child.kill();
        finish(new Error("detached host worker sent an invalid startup result"));
        return;
      }
      if (value.ok) {
        finish({ exitCode: 0, stdout: HOST_STARTED_STDOUT });
        return;
      }
      finish(
        new InvocationError(value.message, {
          code: value.code,
          exitCode: value.exitCode,
        }),
      );
    };
    const onError = (error: Error) => finish(error);
    const onExit = (code: number | null, signal: NodeJS.Signals | null) =>
      finish(
        new Error(
          `detached host worker exited before startup handoff (code=${code ?? "null"}, signal=${signal ?? "null"})`,
        ),
      );

    child.on("message", onMessage);
    child.once("error", onError);
    child.once("exit", onExit);
  });
}

export async function forkHostWorkerProcess(input: {
  binPath: string;
  argv: readonly string[];
  cwd: string;
  spawnProcess?: (
    command: string,
    args: readonly string[],
    options: {
      cwd: string;
      detached: true;
      env: NodeJS.ProcessEnv;
      stdio: ["ignore", "ignore", "ignore", "ipc"];
    },
  ) => ChildProcess;
}): Promise<InvocationResult> {
  const spawnProcess = input.spawnProcess ?? (await import("node:child_process")).spawn;
  const fork = resolveHostWorkerForkCommand({ binPath: input.binPath, argv: input.argv });
  const child = spawnProcess(fork.command, fork.args, {
    cwd: input.cwd,
    detached: true,
    env: { ...process.env, [HOST_WORKER_ENV]: "1" },
    stdio: ["ignore", "ignore", "ignore", "ipc"],
  });
  return waitForHostWorkerStartup(child);
}

function sendHostWorkerStartupMessage(message: HostWorkerStartupMessage): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!process.send || !process.connected) {
      reject(new Error("host worker startup IPC channel is unavailable"));
      return;
    }
    process.send(message, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function isHostWorkerStartupMessage(value: unknown): value is HostWorkerStartupMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  if (message.type !== "aiox-host-startup" || typeof message.ok !== "boolean") return false;
  if (message.ok) return true;
  return (
    typeof message.code === "string" &&
    typeof message.exitCode === "number" &&
    typeof message.message === "string"
  );
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
  const daemonEnv = { ...process.env };
  delete daemonEnv[HOST_WORKER_ENV];

  const child = spawn(fork.command, fork.args, {
    detached: true,
    env: daemonEnv,
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

export function isMainModule(moduleUrl: string, argvPath: string | undefined): boolean {
  if (!argvPath) {
    return false;
  }

  return realpathSync(fileURLToPath(moduleUrl)) === realpathSync(argvPath);
}

if (isMainModule(import.meta.url, process.argv[1])) {
  void main();
}
