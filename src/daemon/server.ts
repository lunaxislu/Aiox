import type Database from "better-sqlite3";

import type { AioxProfile } from "../config/paths.js";
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
  createPublicMessageId?: () => string;
  createPublicDeliveryId?: () => string;
  now: () => string;
  supervisor?: Supervisor;
  attachCodexRuntime?: AttachCodexRuntime;
  daemonSocketPath?: string;
  profile?: AioxProfile;
}

export interface DaemonServer {
  start(): DaemonServerHandle;
}

export interface DaemonServerHandle {
  api: DaemonApi;
  stop(options?: StopRequest): Promise<StopResponse>;
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
        createPublicMessageId: options.createPublicMessageId,
        createPublicDeliveryId: options.createPublicDeliveryId,
        now: options.now,
        attachCodexRuntime: options.attachCodexRuntime,
        ...(options.daemonSocketPath === undefined
          ? {}
          : { daemonSocketPath: options.daemonSocketPath }),
        ...(options.profile === undefined ? {} : { profile: options.profile }),
      });
      const api = createDaemonApi(state);
      let stoppedResponse: Promise<StopResponse> | null = null;

      handle = {
        api,
        stop(stopOptions) {
          if (stoppedResponse) {
            return stoppedResponse;
          }

          stoppedResponse = api.stop(stopOptions ?? {}).then((response) => {
            supervisor.stop();
            handle = null;
            return response;
          });
          return stoppedResponse;
        },
      };

      return handle;
    },
  };
}
