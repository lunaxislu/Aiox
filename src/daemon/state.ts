import type Database from "better-sqlite3";

import type { AgentKind } from "../core/agents.js";
import type { MessageType } from "../core/messages.js";
import {
  createAgentRepository,
  type AttachStoredAgentResult,
} from "../store/repositories/agents.js";
import {
  createDeliveryRepository,
  type StoredDelivery,
} from "../store/repositories/deliveries.js";
import { createEventRepository } from "../store/repositories/events.js";
import {
  createMessageRepository,
  type StoredMessage,
} from "../store/repositories/messages.js";
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

export interface SendMessageRequest {
  sourceName: string;
  messageId: string;
  parentMessageId?: string | null;
  type: MessageType;
  content: string;
}

export type SendMessageResult =
  | {
      ok: true;
      message: StoredMessage;
      deliveries: StoredDelivery[];
    }
  | {
      ok: false;
      reason: "source_agent_not_found";
      sourceName: string;
    }
  | {
      ok: false;
      reason: "no_active_routes";
    }
  | {
      ok: false;
      reason: "delivery_idempotency_key_exists";
      existing: StoredDelivery;
    };

export interface StatusResult {
  daemon: {
    startedAt: string;
  };
  agents: ReturnType<ReturnType<typeof createAgentRepository>["list"]>;
  pairs: ReturnType<ReturnType<typeof createPairRepository>["list"]>;
  routes: ReturnType<ReturnType<typeof createRouteRepository>["list"]>;
}

export interface StopRequest {
  daemonOnly?: boolean;
}

export interface StopResult {
  ok: true;
  stoppedAgents: ReturnType<
    ReturnType<typeof createAgentRepository>["markAllConnectedDisconnected"]
  >;
}

export interface DaemonState {
  attachAgent(request: AttachAgentRequest): AttachAgentResult;
  createPair(request: CreatePairRequest): CreatePairResult;
  connect(request: ConnectRequest): ConnectResult;
  disconnect(request: DisconnectRequest): DisconnectResult;
  sendMessage(request: SendMessageRequest): SendMessageResult;
  status(): StatusResult;
  stop(request: StopRequest): StopResult;
}

export function createDaemonState(
  options: CreateDaemonStateOptions,
): DaemonState {
  const agents = createAgentRepository(options.db);
  const deliveries = createDeliveryRepository(options.db);
  const events = createEventRepository(options.db);
  const messages = createMessageRepository(options.db);
  const pairs = createPairRepository(options.db);
  const routes = createRouteRepository(options.db);
  const startedAt = options.now();

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

    sendMessage(request) {
      const source = agents.findByName(request.sourceName);

      if (!source) {
        return {
          ok: false,
          reason: "source_agent_not_found",
          sourceName: request.sourceName,
        };
      }

      const sourceRoutes = routes
        .list()
        .filter((route) => route.sourceAgentId === source.id);

      if (sourceRoutes.length === 0) {
        return {
          ok: false,
          reason: "no_active_routes",
        };
      }

      const existingDelivery = sourceRoutes
        .map((route) =>
          deliveries.findByIdempotencyKey(`${request.messageId}:${route.targetAgentId}`),
        )
        .find((delivery): delivery is StoredDelivery => delivery !== null);

      if (existingDelivery) {
        return {
          ok: false,
          reason: "delivery_idempotency_key_exists",
          existing: existingDelivery,
        };
      }

      return withTransaction(options.db, () => {
        const now = options.now();
        const message = messages.create({
          id: request.messageId,
          sourceAgentId: source.id,
          parentMessageId: request.parentMessageId,
          type: request.type,
          content: request.content,
          now,
        });
        const queued = deliveries.createQueuedForRoutes({
          messageId: message.id,
          routes: sourceRoutes.map((route) => ({
            id: route.id,
            targetAgentId: route.targetAgentId,
          })),
          createDeliveryId: () => options.createId(),
          now,
        });

        if (!Array.isArray(queued)) {
          return queued;
        }

        events.append({
          id: options.createId(),
          type: "message_created",
          data: {},
          createdAt: now,
          agentId: source.id,
          messageId: message.id,
          deliveryId: null,
          routeId: null,
        });
        for (const delivery of queued) {
          events.append({
            id: options.createId(),
            type: "delivery_queued",
            data: {},
            createdAt: now,
            agentId: null,
            messageId: message.id,
            deliveryId: delivery.id,
            routeId: delivery.routeId,
          });
        }

        return {
          ok: true,
          message,
          deliveries: queued,
        };
      });
    },

    status() {
      return {
        daemon: {
          startedAt,
        },
        agents: agents.list(),
        pairs: pairs.list(),
        routes: routes.list(),
      };
    },

    stop(request) {
      return withTransaction(options.db, () => ({
        ok: true,
        stoppedAgents: request.daemonOnly
          ? []
          : agents.markAllConnectedDisconnected(options.now()),
      }));
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
