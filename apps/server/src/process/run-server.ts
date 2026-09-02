import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir } from "node:fs/promises";

import { createLocalServer } from "../bootstrap/local-server.js";
import { acquireServerProcessLock } from "../runtime-files/server-lock.js";

interface ServerProcessOptions {
  runtimeDirectory: string;
  staticDirectory: string;
  port: number;
}

function parseServerProcessOptions(args: readonly string[]): ServerProcessOptions {
  let runtimeDirectory: string | undefined;
  let staticDirectory: string | undefined;
  let port = 0;
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    const value = args[++index];
    if (!value) throw new Error(`${flag} requires a value`);
    if (flag === "--runtime-dir") runtimeDirectory = path.resolve(value);
    else if (flag === "--static-dir") staticDirectory = path.resolve(value);
    else if (flag === "--port") {
      port = Number(value);
      if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new Error("--port requires an integer from 1 to 65535");
      }
    } else throw new Error(`Unknown server option: ${flag}`);
  }
  if (!runtimeDirectory || !staticDirectory) {
    throw new Error("--runtime-dir and --static-dir are required");
  }
  return { runtimeDirectory, staticDirectory, port };
}

export async function runServerProcess(args: readonly string[]): Promise<void> {
  const options = parseServerProcessOptions(args);
  await mkdir(options.runtimeDirectory, { recursive: true, mode: 0o700 });
  const serverEpoch = randomUUID();
  const processLock = await acquireServerProcessLock({
    runtimeDirectory: options.runtimeDirectory,
    serverEpoch,
  });
  if (!processLock) return;
  const server = createLocalServer({
    staticDirectory: options.staticDirectory,
    endpointFile: path.join(options.runtimeDirectory, "endpoint.json"),
    sessionTokenFile: path.join(options.runtimeDirectory, "session.token"),
    serverEpoch,
    port: options.port,
    onCleanupError: (error) => console.error(error),
    onStopped: () => processLock.release(),
  });
  const stop = (): void => {
    void server.stop().catch((error: unknown) => console.error(error));
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    await server.start();
  } catch (error) {
    await processLock.release();
    throw error;
  }
}
