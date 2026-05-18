import type Database from "better-sqlite3";

import { createDaemonApi, type DaemonApi, type StopResponse } from "./api.js";
import { createDaemonState } from "./state.js";
import {
  createNoopSupervisor,
  type Supervisor,
} from "./supervisor.js";

export interface CreateDaemonServerOptions {
  db: Database;
  createId: () => string;
  now: () => string;
  supervisor?: Supervisor;
}

export interface DaemonServer {
  start(): DaemonServerHandle;
}

export interface DaemonServerHandle {
  api: DaemonApi;
  stop(): StopResponse;
}

export function createDaemonServer(
  options: CreateDaemonServerOptions,
): DaemonServer {
  const supervisor = options.supervisor ?? createNoopSupervisor();
  let handle: DaemonServerHandle | null = null;

  return {
    start() {
      if (handle) {
        return handle;
      }

      supervisor.start();

      const state = createDaemonState({
        db: options.db,
        createId: options.createId,
        now: options.now,
      });
      const api = createDaemonApi(state);

      handle = {
        api,
        stop() {
          const response = api.stop({});
          supervisor.stop();
          handle = null;
          return response;
        },
      };

      return handle;
    },
  };
}
