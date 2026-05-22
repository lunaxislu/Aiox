import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

import type { DoctorCheck, DoctorResult } from "./invocation.js";

const require = createRequire(import.meta.url);

export interface CreateDoctorResultOptions {
  socketPath: string;
  processVersion?: string;
  commandExists?: (command: string) => boolean;
  socketExists?: (path: string) => boolean;
  loadSqliteNative?: () => void;
}

export async function createDoctorResult(
  options: CreateDoctorResultOptions,
): Promise<DoctorResult> {
  const commandExists = options.commandExists ?? defaultCommandExists;
  const socketExists = options.socketExists ?? existsSync;
  const loadSqliteNative = options.loadSqliteNative ?? defaultLoadSqliteNative;
  const checks: DoctorCheck[] = [
    {
      name: "node",
      status: "ok",
      detail: options.processVersion ?? process.version,
    },
  ];

  for (const command of ["codex", "claude"] as const) {
    checks.push(commandCheck(command, commandExists));
  }

  checks.push(sqliteNativeCheck(loadSqliteNative));
  checks.push(
    socketExists(options.socketPath)
      ? { name: "daemon socket", status: "ok", detail: options.socketPath }
      : { name: "daemon socket", status: "error", detail: "not found" },
  );

  return { checks };
}

function commandCheck(
  command: string,
  commandExists: (command: string) => boolean,
): DoctorCheck {
  return commandExists(command)
    ? { name: command, status: "ok" }
    : { name: command, status: "error", detail: "not found" };
}

function sqliteNativeCheck(loadSqliteNative: () => void): DoctorCheck {
  try {
    loadSqliteNative();
    return { name: "sqlite-native", status: "ok" };
  } catch (error) {
    return {
      name: "sqlite-native",
      status: "error",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function defaultCommandExists(command: string): boolean {
  return spawnSync("which", [command], { stdio: "ignore" }).status === 0;
}

function defaultLoadSqliteNative(): void {
  require("better-sqlite3");
}
