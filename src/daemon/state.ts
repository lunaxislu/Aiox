import type Database from "better-sqlite3";

import type { AgentKind } from "../core/agents.js";
import {
  createAgentRepository,
  type AttachStoredAgentResult,
} from "../store/repositories/agents.js";
import { createPairRepository } from "../store/repositories/pairs.js";

export interface CreateDaemonStateOptions {
  db: Database;
  createId: () => string;
  now: () => string;
}

export interface AttachAgentRequest {
  kind: AgentKind;
  name: string;
  cwd: string;
  pairName?: string;
}

export type AttachAgentResult =
  | AttachStoredAgentResult
  | {
      ok: false;
      reason: "pair_not_found";
      pairName: string;
    };

export interface DaemonState {
  attachAgent(request: AttachAgentRequest): AttachAgentResult;
}

export function createDaemonState(
  options: CreateDaemonStateOptions,
): DaemonState {
  const agents = createAgentRepository(options.db);
  const pairs = createPairRepository(options.db);

  return {
    attachAgent(request) {
      if (request.pairName && !pairs.findByName(request.pairName)) {
        return {
          ok: false,
          reason: "pair_not_found",
          pairName: request.pairName,
        };
      }

      return agents.attach({
        id: options.createId(),
        name: request.name,
        kind: request.kind,
        cwd: request.cwd,
        now: options.now(),
      });
    },
  };
}
