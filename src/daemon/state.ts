import type Database from "better-sqlite3";

import type { AgentKind } from "../core/agents.js";
import {
  createAgentRepository,
  type AttachStoredAgentResult,
} from "../store/repositories/agents.js";
import { createPairRepository } from "../store/repositories/pairs.js";
import type { StoredPair } from "../store/repositories/pairs.js";
import {
  createRouteRepository,
  type StoredRoute,
} from "../store/repositories/routes.js";
import { withTransaction } from "../store/transaction.js";

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

export interface CreatePairRequest {
  name: string;
}

export type CreatePairResult =
  | {
      ok: true;
      pair: StoredPair;
    }
  | {
      ok: false;
      reason: "pair_name_already_exists";
      name: string;
    };

export interface ConnectRequest {
  sourceName: string;
  targetNames: readonly string[];
}

export type ConnectResult =
  | {
      ok: true;
      created: StoredRoute[];
      alreadyExisted: StoredRoute[];
    }
  | {
      ok: false;
      reason: "source_agent_not_found";
      sourceName: string;
    }
  | {
      ok: false;
      reason: "target_agent_not_found";
      missing: string[];
    };

export interface DisconnectRequest {
  sourceName: string;
  targetNames: readonly string[];
}

export type DisconnectResult =
  | {
      ok: true;
      removed: StoredRoute[];
    }
  | {
      ok: false;
      reason: "source_agent_not_found";
      sourceName: string;
    }
  | {
      ok: false;
      reason: "target_agent_not_found";
      missing: string[];
    };

export interface DaemonState {
  attachAgent(request: AttachAgentRequest): AttachAgentResult;
  createPair(request: CreatePairRequest): CreatePairResult;
  connect(request: ConnectRequest): ConnectResult;
  disconnect(request: DisconnectRequest): DisconnectResult;
}

export function createDaemonState(
  options: CreateDaemonStateOptions,
): DaemonState {
  const agents = createAgentRepository(options.db);
  const pairs = createPairRepository(options.db);
  const routes = createRouteRepository(options.db);

  return {
    attachAgent(request) {
      const pair = request.pairName ? pairs.findByName(request.pairName) : null;

      if (request.pairName) {
        if (!pair) {
          return {
            ok: false,
            reason: "pair_not_found",
            pairName: request.pairName,
          };
        }
      }

      return agents.attach({
        id: options.createId(),
        name: request.name,
        kind: request.kind,
        cwd: request.cwd,
        pairId: pair?.id,
        now: options.now(),
      });
    },

    createPair(request) {
      if (pairs.findByName(request.name)) {
        return {
          ok: false,
          reason: "pair_name_already_exists",
          name: request.name,
        };
      }

      return {
        ok: true,
        pair: pairs.createReservation({
          id: options.createId(),
          name: request.name,
          now: options.now(),
        }),
      };
    },

    connect(request) {
      const resolved = resolveRouteAgents(agents, request);

      if (!resolved.ok) {
        return resolved;
      }

      return withTransaction(options.db, () => {
        const created: StoredRoute[] = [];
        const alreadyExisted: StoredRoute[] = [];

        for (const target of resolved.targets) {
          const existing = routes.findBySourceAndTarget(
            resolved.source.id,
            target.id,
          );

          if (existing) {
            alreadyExisted.push(existing);
            continue;
          }

          const result = routes.create({
            id: options.createId(),
            sourceAgentId: resolved.source.id,
            targetAgentId: target.id,
            now: options.now(),
          });

          if (result.ok) {
            created.push(result.route);
          }
        }

        return {
          ok: true,
          created,
          alreadyExisted,
        };
      });
    },

    disconnect(request) {
      const resolved = resolveRouteAgents(agents, request);

      if (!resolved.ok) {
        return resolved;
      }

      return {
        ok: true,
        removed: routes.disconnect({
          sourceAgentId: resolved.source.id,
          targetAgentIds: resolved.targets.map((target) => target.id),
        }),
      };
    },
  };
}

function resolveRouteAgents(
  agents: ReturnType<typeof createAgentRepository>,
  request: ConnectRequest | DisconnectRequest,
):
  | {
      ok: true;
      source: NonNullable<ReturnType<typeof agents.findByName>>;
      targets: Array<NonNullable<ReturnType<typeof agents.findByName>>>;
    }
  | {
      ok: false;
      reason: "source_agent_not_found";
      sourceName: string;
    }
  | {
      ok: false;
      reason: "target_agent_not_found";
      missing: string[];
    } {
  const source = agents.findByName(request.sourceName);

  if (!source) {
    return {
      ok: false,
      reason: "source_agent_not_found",
      sourceName: request.sourceName,
    };
  }

  const targets = request.targetNames.map((name) => ({
    name,
    agent: agents.findByName(name),
  }));
  const missing = targets
    .filter((target) => !target.agent)
    .map((target) => target.name);

  if (missing.length > 0) {
    return {
      ok: false,
      reason: "target_agent_not_found",
      missing,
    };
  }

  return {
    ok: true,
    source,
    targets: targets
      .map((target) => target.agent)
      .filter((agent): agent is NonNullable<typeof agent> => agent !== null),
  };
}
