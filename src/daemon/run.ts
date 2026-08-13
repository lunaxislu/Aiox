/**
 * Long-running daemon process entry point.
 * Called by the hidden `aiox _run-daemon --socket <path>` command.
 * Wraps the stop() API method to auto-close the socket server after responding,
 * then listens indefinitely until SIGTERM or SIGINT.
 */

import Database from "better-sqlite3";
import { chmodSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { createDaemonApi, type DaemonApi } from "./api.js";
import { createDaemonServer } from "./server.js";
import { createDaemonSocketServer } from "./socket-transport.js";
import { productionAttachCodexRuntime } from "./state.js";
import { applySchema } from "../store/schema.js";
import { resolveProfile } from "../config/paths.js";

let runningId = 1;

function createSequentialId(): string {
  const id = `daemon-${runningId}`;
  runningId += 1;
  return id;
}

function installFatalDiagnostics(socketPath: string): () => void {
  const fatalPath = join(dirname(socketPath), "latest-fatal.json");
  const observeFatal = (
    _error: Error,
    origin: NodeJS.UncaughtExceptionOrigin,
  ): void => {
    try {
      writeFileSync(fatalPath, `${JSON.stringify({ origin })}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
      chmodSync(fatalPath, 0o600);
    } catch {
      // Diagnostics must not replace Node's default fatal termination behavior.
    }
  };

  process.on("uncaughtExceptionMonitor", observeFatal);
  return () => process.removeListener("uncaughtExceptionMonitor", observeFatal);
}

export async function runDaemonProcess(socketPath: string): Promise<void> {
  const db = new Database(":memory:");
  applySchema(db);

  const server = createDaemonServer({
    db,
    createId: createSequentialId,
    now: () => new Date().toISOString(),
    attachCodexRuntime: productionAttachCodexRuntime,
    daemonSocketPath: socketPath,
    profile: resolveProfile(),
  });

  const handle = server.start();

  let socketHandle: Awaited<ReturnType<ReturnType<typeof createDaemonSocketServer>["start"]>> | null =
    null;
  let shutdownScheduled = false;

  let resolveShutdown!: () => void;
  const shutdownPromise = new Promise<void>((resolve) => {
    resolveShutdown = resolve;
  });

  async function shutdown(): Promise<void> {
    if (shutdownScheduled) {
      return;
    }
    shutdownScheduled = true;

    if (socketHandle) {
      try {
        await socketHandle.close();
      } catch {
        // A socket-close failure must not prevent the remaining owned resources
        // from being released or leave the daemon shutdown pending.
      }
      socketHandle = null;
    }

    await handle.stop({});
    db.close();
    resolveShutdown();
  }

  // Wrap the stop RPC to auto-shutdown the daemon process after the client
  // receives the stop response. This avoids the need for the client to know
  // the daemon's PID or to send SIGTERM explicitly.
  const wrappedApi: DaemonApi = {
    ...handle.api,
    async stop(request) {
      const response = await handle.stop(request);
      setImmediate(() => void shutdown());
      return response;
    },
  };

  try {
    socketHandle = await createDaemonSocketServer({ api: wrappedApi, socketPath }).start();
  } catch (error) {
    await handle.stop({});
    db.close();
    throw error;
  }

  const removeFatalDiagnostics = installFatalDiagnostics(socketPath);

  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());

  try {
    return await shutdownPromise;
  } finally {
    removeFatalDiagnostics();
  }
}
