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
import { createDaemonServer, type DaemonServerHandle } from "../daemon/server.js";
import {
  productionAttachCodexRuntime,
  type AttachCodexRuntime,
} from "../daemon/state.js";
import {
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
    const result = await invokeParsedCommand(command, {
      runtime: options.runtime ?? createSocketRuntime({ version }),
      cwd: options.cwd ?? process.cwd(),
      launchCodexTui: options.launchCodexTui ?? launchCodexTui,
    });

    if (result.stdout) {
      stdout.write(result.stdout);
    }

    return result.exitCode;
  } catch (error) {
    stderr.write(`${formatErrorMessage(error)}\n`);
    return getExitCode(error);
  }
}

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
  const db = new Database(dbPath);
  applySchema(db);

  const server = createDaemonServer({
    db,
    createId: createSequentialId,
    now: () => new Date().toISOString(),
    attachCodexRuntime: options.attachCodexRuntime ?? productionAttachCodexRuntime,
  });
  const socketPath = options.socketPath ?? createDefaultSocketPath();
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

async function main(): Promise<void> {
  process.exit(await runAioxCli());
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}
