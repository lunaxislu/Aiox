/**
 * Long-running daemon process entry point.
 * Called by the hidden `aiox _run-daemon --socket <path>` command.
 * Wraps the stop() API method to auto-close the socket server after responding,
 * then listens indefinitely until SIGTERM or SIGINT.
 */

import Database from "better-sqlite3";

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
      await socketHandle.close();
      socketHandle = null;
    }

    handle.stop({});
    db.close();
    resolveShutdown();
  }

  // Wrap the stop RPC to auto-shutdown the daemon process after the client
  // receives the stop response. This avoids the need for the client to know
  // the daemon's PID or to send SIGTERM explicitly.
  const wrappedApi: DaemonApi = {
    ...handle.api,
    stop(request) {
      const response = handle.stop(request);
      setImmediate(() => void shutdown());
      return response;
    },
  };

  try {
    socketHandle = await createDaemonSocketServer({ api: wrappedApi, socketPath }).start();
  } catch (error) {
    handle.stop({});
    db.close();
    throw error;
  }

  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());

  return shutdownPromise;
}
