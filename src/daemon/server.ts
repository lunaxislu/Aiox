import type Database from "better-sqlite3";

import { createDaemonApi, type DaemonApi, type StopResponse } from "./api.js";
import {
  createDaemonState,
  type AttachCodexRuntime,
  type StopRequest,
} from "./state.js";
import {
  createNoopSupervisor,
  type Supervisor,
} from "./supervisor.js";

export interface CreateDaemonServerOptions {
  db: Database;
  createId: () => string;
  now: () => string;
  supervisor?: Supervisor;
  attachCodexRuntime?: AttachCodexRuntime;
}

export interface DaemonServer {
  start(): DaemonServerHandle;
}

export interface DaemonServerHandle {
  api: DaemonApi;
  stop(options?: StopRequest): StopResponse;
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
        attachCodexRuntime: options.attachCodexRuntime,
      });
      const api = createDaemonApi(state);
      let stoppedResponse: StopResponse | null = null;

      handle = {
        api,
        stop(stopOptions) {
          if (stoppedResponse) {
            return stoppedResponse;
          }

          const response = api.stop(stopOptions ?? {});
          supervisor.stop();
          handle = null;
          stoppedResponse = response;
          return response;
        },
      };

      return handle;
    },
  };
}
