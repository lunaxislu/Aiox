#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

import Database from "better-sqlite3";

import { invokeParsedCommand, type InvocationRuntime } from "../cli/invocation.js";
import { parseCli } from "../cli/parse.js";
import { createDaemonServer, type DaemonServerHandle } from "../daemon/server.js";
import { applySchema } from "../store/schema.js";

export interface RunAioxCliOptions {
  stdout?: Pick<NodeJS.WriteStream, "write">;
  stderr?: Pick<NodeJS.WriteStream, "write">;
  runtime?: InvocationRuntime;
  cwd?: string;
  version?: string;
}

export async function runAioxCli(
  argv: string[] = process.argv.slice(2),
  options: RunAioxCliOptions = {},
): Promise<number> {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;

  try {
    const command = parseCli(argv, {
      version: options.version ?? readPackageVersion(),
    });
    const result = await invokeParsedCommand(command, {
      runtime: options.runtime ?? createInProcessRuntime(),
      cwd: options.cwd ?? process.cwd(),
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

export function createInProcessRuntime(): InvocationRuntime {
  const db = new Database(":memory:");
  applySchema(db);

  const server = createDaemonServer({
    db,
    createId: createSequentialId,
    now: () => new Date().toISOString(),
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
      return (handle ?? start()).api.status();
    },
    doctor() {
      return { ok: true };
    },
  };
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
