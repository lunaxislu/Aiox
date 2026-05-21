import type Database from "better-sqlite3";

import type { AgentKind } from "../core/agents.js";
import type { MessageDeliveryStatus } from "../core/deliveries.js";
import type { MessageType } from "../core/messages.js";
import {
  createAgentRepository,
  type AttachStoredAgentResult,
  type StoredAgent,
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
import { attachCodexAgentRuntime } from "../adapters/codex/runtime.js";

const attachRollbackSentinel = Symbol("aiox.attach.rollback");
const sendMessageRollbackSentinel = Symbol("aiox.sendMessage.rollback");

export interface CreateDaemonStateOptions {
  db: Database;
  createId: () => string;
  now: () => string;
  codexRuntimes?: AgentRuntimeRegistry;
  attachCodexRuntime?: AttachCodexRuntime;
}

export const productionAttachCodexRuntime: AttachCodexRuntime = defaultAttachCodexRuntime;

export interface ManagedAgentRuntime {
  readonly state: "starting" | "ready" | "failed" | "disposed";
  dispose(): Promise<void> | void;
}

export interface ManagedCodexAgentRuntime extends ManagedAgentRuntime {
  readonly endpoint: URL;
  readonly activeThreadId: string | null;
  startThread(): Promise<string | null>;
  resumeThread(threadId: string): Promise<string | null>;
}

export type AttachCodexRuntime = (request: {
  agentName: string;
  activeThreadId: string | null;
}) => Promise<ManagedCodexAgentRuntime>;

export interface AgentRuntimeRegistry {
  get(agentName: string): ManagedAgentRuntime | undefined;
  set(agentName: string, runtime: ManagedAgentRuntime): unknown;
  delete(agentName: string): boolean;
}

export interface AttachAgentRequest {
  kind: AgentKind;
  name: string;
  cwd: string;
  pairName?: string;
  resumeSessionId?: string;
}

export type AttachAgentResult =
  | {
      ok: true;
      agent: StoredAgent;
      codexRuntime?: {
        endpoint: string;
        activeThreadId: string;
      };
    }
  | Extract<AttachStoredAgentResult, { ok: false }>
  | {
      ok: false;
      reason: "pair_not_found";
      pairName: string;
    }
  | {
      ok: false;
      reason: "pair_kind_slot_occupied";
      existingAgentId: string;
    }
  | {
      ok: false;
      reason: "agent_kind_mismatch";
      agentId: string;
      expectedKind: AgentKind;
      actualKind: AgentKind;
    }
  | {
      ok: false;
      reason: "codex_resume_failed" | "codex_runtime_attach_failed";
      message: string;
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

export interface UpdateDeliveryStatusRequest {
  deliveryId: string;
  status: MessageDeliveryStatus;
  error?: {
    reason: string;
    message: string;
  };
}

export type UpdateDeliveryStatusResult =
  | {
      ok: true;
      delivery: StoredDelivery;
    }
  | {
      ok: false;
      reason: "delivery_not_found";
      deliveryId: string;
    };

export interface RollbackAgentAttachRequest {
  agentName: string;
  token?: string;
}

export interface RollbackAgentAttachResult {
  ok: true;
  agentName: string;
  rolledBack: boolean;
}

export interface DetachAgentRequest {
  agentName: string;
}

export interface DetachAgentResult {
  ok: true;
  agentName: string;
  detached: boolean;
}

export interface NotifyTuiExitedRequest {
  agentName: string;
  exitCode: number | null;
  signal?: string | null;
}

export interface NotifyTuiExitedResult {
  ok: true;
  agentName: string;
  detached: boolean;
}

export type CodexRuntimeFailureReason =
  | {
      type: "app_server_process_exited";
      exitCode: number | null;
      signal: string | null;
    }
  | {
      type: "ws_dropped";
      closeCode: number;
      closeReason: string;
    };

export interface RecordCodexRuntimeFailedRequest {
  agentName: string;
  reason: CodexRuntimeFailureReason;
  latestDiagnosticNotification?: {
    method: string;
    params?: unknown;
  };
}

export interface RecordCodexRuntimeFailedResult {
  ok: true;
  agentName: string;
  recorded: boolean;
}

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
  attachAgent(request: AttachAgentRequest): Promise<AttachAgentResult>;
  createPair(request: CreatePairRequest): CreatePairResult;
  connect(request: ConnectRequest): ConnectResult;
  disconnect(request: DisconnectRequest): DisconnectResult;
  sendMessage(request: SendMessageRequest): SendMessageResult;
  updateDeliveryStatus(request: UpdateDeliveryStatusRequest): UpdateDeliveryStatusResult;
  rollbackAgentAttach(
    request: RollbackAgentAttachRequest,
  ): Promise<RollbackAgentAttachResult>;
  detachAgent(request: DetachAgentRequest): Promise<DetachAgentResult>;
  notifyTuiExited(request: NotifyTuiExitedRequest): Promise<NotifyTuiExitedResult>;
  recordCodexRuntimeFailed(
    request: RecordCodexRuntimeFailedRequest,
  ): RecordCodexRuntimeFailedResult;
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
  const codexRuntimes = options.codexRuntimes ?? new Map<string, ManagedAgentRuntime>();
  const attachCodexRuntime = options.attachCodexRuntime;
  const startedAt = options.now();

  return {
    async attachAgent(request) {
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

      let storedAgent: StoredAgent | null = null;
      let startingCodexRuntime: ManagedCodexAgentRuntime | null = null;
      try {
        const attachResult = withTransaction(options.db, () => {
          const now = options.now();
          const attachResult = agents.attach({
            id: options.createId(),
            name: request.name,
            kind: request.kind,
            cwd: request.cwd,
            now,
          });

          if (!attachResult.ok || !pair) {
            return attachResult;
          }

          const pairAttachResult = pairs.attachAgent({
            pairId: pair.id,
            agentId: attachResult.agent.id,
            kind: request.kind,
            now,
          });

          if (!pairAttachResult.ok) {
            if (
              pairAttachResult.reason === "pair_kind_slot_occupied" ||
              pairAttachResult.reason === "agent_kind_mismatch"
            ) {
              throw createAttachRollback(pairAttachResult);
            }

            throw new Error(
              `unexpected pair attach failure: ${pairAttachResult.reason}`,
            );
          }

          if (pairAttachResult.pair.status === "ready") {
            createBidirectionalPairRoutes({
              agents,
              createId: options.createId,
              now,
              pairId: pair.id,
              routes,
            });
          }

          return {
            ok: true as const,
            agent: {
              ...attachResult.agent,
              pairId: pair.id,
            },
          };
        });

        if (!attachResult.ok || request.kind !== "codex" || !attachCodexRuntime) {
          return attachResult;
        }

        storedAgent = attachResult.agent;
        const runtime = await attachCodexRuntime({
          agentName: request.name,
          activeThreadId: storedAgent.adapterSessionId,
        });
        startingCodexRuntime = runtime;
        const nextThreadId = request.resumeSessionId
          ? await runtime.resumeThread(request.resumeSessionId)
          : await runtime.startThread();

        if (!nextThreadId) {
          throw Object.assign(new Error("Codex did not return a thread id"), {
            code: "codex_runtime_attach_failed",
          });
        }

        if (request.resumeSessionId && nextThreadId !== request.resumeSessionId) {
          throw Object.assign(
            new Error(
              `Codex resume returned mismatched thread id: requested=${request.resumeSessionId} returned=${nextThreadId}`,
            ),
            {
              code: "codex_resume_failed",
            },
          );
        }

        const now = options.now();
        const reboundAgent = agents.rebindAdapterSessionId({
          name: request.name,
          adapterSessionId: nextThreadId,
          now,
        });

        if (!reboundAgent) {
          throw Object.assign(new Error(`Codex agent not found after attach: ${request.name}`), {
            code: "codex_runtime_attach_failed",
          });
        }

        codexRuntimes.set(request.name, runtime);
        startingCodexRuntime = null;
        events.append({
          id: options.createId(),
          type: "agent_thread_id_rebound",
          data: {
            previousId: storedAgent.adapterSessionId,
            nextId: nextThreadId,
            operation: request.resumeSessionId ? "thread/resume" : "thread/start",
          },
          createdAt: now,
          agentId: reboundAgent.id,
          messageId: null,
          deliveryId: null,
          routeId: null,
        });

        return {
          ok: true,
          agent: reboundAgent,
          codexRuntime: {
            endpoint: runtime.endpoint.toString(),
            activeThreadId: nextThreadId,
          },
        };
      } catch (error) {
        if (isAttachRollback(error)) {
          return error.response;
        }

        if (storedAgent) {
          if (startingCodexRuntime) {
            await disposeRuntime(startingCodexRuntime);
          }
          agents.markByNameDisconnected(request.name, options.now());
        }

        if (isCodexAttachError(error)) {
          return {
            ok: false,
            reason: error.code,
            message: error.message,
          };
        }

        throw error;
      }
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
      try {
        return withTransaction(options.db, () => {
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
            throw createSendMessageRollback({
              ok: false,
              reason: "delivery_idempotency_key_exists",
              existing: existingDelivery,
            });
          }

          const now = options.now();
          const message = createMessageOrRollback({
            deliveries,
            messageId: request.messageId,
            write: () =>
              messages.create({
                id: request.messageId,
                sourceAgentId: source.id,
                parentMessageId: request.parentMessageId,
                type: request.type,
                content: request.content,
                now,
              }),
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
            throw createSendMessageRollback(queued);
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
      } catch (error) {
        if (isSendMessageRollback(error)) {
          return error.response;
        }

        throw error;
      }
    },

    updateDeliveryStatus(request) {
      return withTransaction(options.db, () => {
        const existing = deliveries.findById(request.deliveryId);

        if (!existing) {
          return {
            ok: false,
            reason: "delivery_not_found",
            deliveryId: request.deliveryId,
          };
        }

        const now = options.now();
        const delivery = deliveries.updateStatus({
          id: request.deliveryId,
          status: request.status,
          now,
        });

        if (!delivery) {
          return {
            ok: false,
            reason: "delivery_not_found",
            deliveryId: request.deliveryId,
          };
        }

        events.append({
          id: options.createId(),
          type: "delivery_status_changed",
          data: request.error
            ? {
                status: request.status,
                error: request.error,
              }
            : {
                status: request.status,
              },
          createdAt: now,
          agentId: existing.targetAgentId,
          messageId: existing.messageId,
          deliveryId: existing.id,
          routeId: existing.routeId,
        });

        return {
          ok: true,
          delivery,
        };
      });
    },

    async rollbackAgentAttach(request) {
      const runtime = codexRuntimes?.get(request.agentName);

      if (runtime?.state === "ready") {
        return {
          ok: true,
          agentName: request.agentName,
          rolledBack: false,
        };
      }

      if (runtime) {
        await disposeRuntime(runtime);
        codexRuntimes?.delete(request.agentName);
      }

      const agent = agents.findByName(request.agentName);
      if (agent?.status === "connected") {
        agents.markByNameDisconnected(request.agentName, options.now());
        return {
          ok: true,
          agentName: request.agentName,
          rolledBack: true,
        };
      }

      return {
        ok: true,
        agentName: request.agentName,
        rolledBack: runtime !== undefined,
      };
    },

    async detachAgent(request) {
      return detachCodexAgent({
        agentName: request.agentName,
        trigger: "explicit_detach",
      });
    },

    async notifyTuiExited(request) {
      return detachCodexAgent({
        agentName: request.agentName,
        trigger: "tui_exit",
        exitCode: request.exitCode,
        signal: request.signal ?? null,
      });
    },

    recordCodexRuntimeFailed(request) {
      const agent = agents.findByName(request.agentName);

      if (!agent || agent.status === "disconnected") {
        return {
          ok: true,
          agentName: request.agentName,
          recorded: false,
        };
      }

      const now = options.now();
      codexRuntimes?.delete(request.agentName);
      agents.markByNameDisconnected(request.agentName, now);
      events.append({
        id: options.createId(),
        type: "agent_runtime_failed",
        data: {
          reason: request.reason,
          ...(request.latestDiagnosticNotification
            ? {
                latestDiagnosticNotification:
                  request.latestDiagnosticNotification,
              }
            : {}),
        },
        createdAt: now,
        agentId: agent.id,
        messageId: null,
        deliveryId: null,
        routeId: null,
      });

      return {
        ok: true,
        agentName: request.agentName,
        recorded: true,
      };
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

  async function detachCodexAgent(input: {
    agentName: string;
    trigger: "explicit_detach" | "tui_exit";
    exitCode?: number | null;
    signal?: string | null;
  }): Promise<DetachAgentResult> {
    const agent = agents.findByName(input.agentName);

    if (!agent || agent.status === "disconnected") {
      return {
        ok: true,
        agentName: input.agentName,
        detached: false,
      };
    }

    const runtime = codexRuntimes?.get(input.agentName);
    if (runtime) {
      await disposeRuntime(runtime);
      codexRuntimes?.delete(input.agentName);
    }

    const now = options.now();
    agents.markByNameDisconnected(input.agentName, now);
    events.append({
      id: options.createId(),
      type: "agent_graceful_detach",
      data:
        input.trigger === "tui_exit"
          ? {
              trigger: input.trigger,
              exitCode: input.exitCode ?? null,
              signal: input.signal ?? null,
            }
          : {
              trigger: input.trigger,
            },
      createdAt: now,
      agentId: agent.id,
      messageId: null,
      deliveryId: null,
      routeId: null,
    });

    return {
      ok: true,
      agentName: input.agentName,
      detached: true,
    };
  }
}

async function disposeRuntime(runtime: ManagedAgentRuntime): Promise<void> {
  try {
    await runtime.dispose();
  } catch {
    // Lifecycle cleanup is best-effort.
  }
}

type AttachRollbackResponse = Extract<
  AttachAgentResult,
  { ok: false; reason: "pair_kind_slot_occupied" | "agent_kind_mismatch" }
>;

interface AttachRollback {
  [attachRollbackSentinel]: true;
  response: AttachRollbackResponse;
}

type SendMessageRollbackResponse = Extract<
  SendMessageResult,
  { ok: false; reason: "delivery_idempotency_key_exists" }
>;

interface SendMessageRollback {
  [sendMessageRollbackSentinel]: true;
  response: SendMessageRollbackResponse;
}

function createAttachRollback(response: AttachRollbackResponse): AttachRollback {
  return {
    [attachRollbackSentinel]: true,
    response,
  };
}

function createSendMessageRollback(
  response: SendMessageRollbackResponse,
): SendMessageRollback {
  return {
    [sendMessageRollbackSentinel]: true,
    response,
  };
}

function isAttachRollback(error: unknown): error is AttachRollback {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as Partial<AttachRollback>)[attachRollbackSentinel] === true
  );
}

function isSendMessageRollback(error: unknown): error is SendMessageRollback {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as Partial<SendMessageRollback>)[sendMessageRollbackSentinel] === true
  );
}

function createMessageOrRollback(input: {
  deliveries: ReturnType<typeof createDeliveryRepository>;
  messageId: string;
  write(): StoredMessage;
}): StoredMessage {
  try {
    return input.write();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existing = input.deliveries
        .list()
        .find((delivery) => delivery.messageId === input.messageId);

      if (existing) {
        throw createSendMessageRollback({
          ok: false,
          reason: "delivery_idempotency_key_exists",
          existing,
        });
      }
    }

    throw error;
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    (error as { code: string }).code.startsWith("SQLITE_CONSTRAINT")
  );
}

async function defaultAttachCodexRuntime(request: {
  agentName: string;
  activeThreadId: string | null;
}): Promise<ManagedCodexAgentRuntime> {
  return attachCodexAgentRuntime({
    agentName: request.agentName,
    activeThreadId: request.activeThreadId,
  });
}

function isCodexAttachError(error: unknown): error is {
  code: "codex_resume_failed" | "codex_runtime_attach_failed";
  message: string;
} {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "codex_resume_failed" ||
      error.code === "codex_runtime_attach_failed")
  );
}

function createBidirectionalPairRoutes(input: {
  agents: ReturnType<typeof createAgentRepository>;
  createId: () => string;
  now: string;
  pairId: string;
  routes: ReturnType<typeof createRouteRepository>;
}): void {
  const pairAgents = input.agents
    .list()
    .filter((agent) => agent.pairId === input.pairId);
  const codex = pairAgents.find((agent) => agent.kind === "codex");
  const claude = pairAgents.find((agent) => agent.kind === "claude");

  if (!codex || !claude) {
    return;
  }

  createRouteIfMissing(input.routes, {
    id: input.createId,
    now: input.now,
    sourceAgentId: codex.id,
    targetAgentId: claude.id,
  });
  createRouteIfMissing(input.routes, {
    id: input.createId,
    now: input.now,
    sourceAgentId: claude.id,
    targetAgentId: codex.id,
  });
}

function createRouteIfMissing(
  routes: ReturnType<typeof createRouteRepository>,
  input: {
    id: () => string;
    now: string;
    sourceAgentId: string;
    targetAgentId: string;
  },
): void {
  if (routes.findBySourceAndTarget(input.sourceAgentId, input.targetAgentId)) {
    return;
  }

  routes.create({
    id: input.id(),
    sourceAgentId: input.sourceAgentId,
    targetAgentId: input.targetAgentId,
    now: input.now,
  });
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
