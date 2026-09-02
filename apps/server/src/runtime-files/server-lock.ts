import { open, readFile, rm } from "node:fs/promises";
import path from "node:path";

interface ServerLockRecord {
  pid: number;
  serverEpoch: string;
}

function parseServerLock(input: unknown): ServerLockRecord | undefined {
  if (
    typeof input !== "object" ||
    input === null ||
    !Number.isInteger((input as { pid?: unknown }).pid) ||
    ((input as { pid: number }).pid ?? 0) <= 0 ||
    typeof (input as { serverEpoch?: unknown }).serverEpoch !== "string" ||
    (input as { serverEpoch: string }).serverEpoch.length === 0
  ) {
    return undefined;
  }
  return input as ServerLockRecord;
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function readLock(lockFile: string): Promise<ServerLockRecord | undefined> {
  try {
    return parseServerLock(JSON.parse(await readFile(lockFile, "utf8")));
  } catch {
    return undefined;
  }
}

export interface ServerProcessLock {
  release(): Promise<void>;
}

export async function acquireServerProcessLock({
  runtimeDirectory,
  serverEpoch,
}: {
  runtimeDirectory: string;
  serverEpoch: string;
}): Promise<ServerProcessLock | undefined> {
  const lockFile = path.join(runtimeDirectory, "server.lock");
  const record = { pid: process.pid, serverEpoch };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(lockFile, "wx", 0o600);
      try {
        await handle.writeFile(`${JSON.stringify(record)}\n`);
      } finally {
        await handle.close();
      }
      return {
        async release() {
          const current = await readLock(lockFile);
          if (
            current?.pid === record.pid &&
            current.serverEpoch === record.serverEpoch
          ) {
            await rm(lockFile, { force: true });
          }
        },
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      const owner = await readLock(lockFile);
      if (owner && processIsAlive(owner.pid)) return undefined;
      await rm(lockFile, { force: true });
    }
  }
  return undefined;
}
