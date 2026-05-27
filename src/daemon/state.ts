import type Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";

import type { AgentKind } from "../core/agents.js";
import type { MessageDeliveryStatus } from "../core/deliveries.js";
import type { MessageType } from "../core/messages.js";
import type { PairSlot } from "../core/pairs.js";
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
import { injectClaudeChannel } from "../adapters/claude/injector.js";
import {
  injectTurnStart,
  type CodexTurnStartRuntime,
} from "../adapters/codex/injector.js";
import { attachCodexAgentRuntime } from "../adapters/codex/runtime.js";

const attachRollbackSentinel = Symbol("aiox.attach.rollback");
const sendMessageRollbackSentinel = Symbol("aiox.sendMessage.rollback");

export interface ClaudeChannelRuntime {
  agentName: string;
  endpoint: string;
  registeredAt: string;
  tokenHash: string;
}

interface ClaudePendingToken {
  agentName: string;
  token: string;
  createdAt: string;
}

export interface RegisterClaudeChannelRequest {
  agentName: string;
  token: string;
  endpoint: string;
}

export type RegisterClaudeChannelResult =
  | { ok: true; runtime: ClaudeChannelRuntime }
  | { ok: false; reason: "claude_channel_registration_failed"; detail: string };

export interface DisconnectClaudeChannelRequest {
  agentName: string;
}

export interface DisconnectClaudeChannelResult {
  ok: true;
  agentName: string;
  // True when this call removed a registered channel runtime or transitioned
  // an attached Claude agent to disconnected.
  disconnected: boolean;
}

export interface ReceiveClaudeChannelMessageRequest {
  agentName: string;
  messageId: string;
  text: string;
}

export type ReceiveClaudeChannelMessageResult = SendMessageResult;

export interface ReceiveClaudeChannelReplyRequest {
  agentName: string;
  chatId: string;
  text: string;
}

export interface ReceiveClaudeChannelReplyResult {
  ok: true;
}

export interface CodexChannelRuntime {
  agentName: string;
  registeredAt: string;
  tokenHash: string;
}

interface CodexPendingToken {
  agentName: string;
  token: string;
  createdAt: string;
}

export interface RegisterCodexChannelRequest {
  agentName: string;
  token: string;
}

export type RegisterCodexChannelResult =
  | { ok: true; runtime: CodexChannelRuntime }
  | { ok: false; reason: "codex_channel_registration_failed"; detail: string };

export interface DisconnectCodexChannelRequest {
  agentName: string;
}

export interface DisconnectCodexChannelResult {
  ok: true;
  agentName: string;
  disconnected: boolean;
}

export interface ReceiveCodexMessageRequest {
  agentName: string;
  token: string;
  messageId: string;
  content: string;
}

export type ReceiveCodexMessageResult =
  | {
      ok: true;
      message: StoredMessage;
      deliveries: StoredDelivery[];
      dispatch: DispatchSummary;
    }
  | { ok: false; reason: "codex_ingress_unauthorized"; detail: string }
  | { ok: false; reason: "no_active_routes" }
  | { ok: false; reason: "source_agent_not_found"; sourceName: string }
  | {
      ok: false;
      reason: "delivery_idempotency_key_exists";
      existing: StoredDelivery;
    };

export interface ReceiveCodexReplyRequest {
  agentName: string;
  token: string;
  messageId: string;
  parentMessageId: string;
  content: string;
}

export type ReceiveCodexReplyResult = ReceiveCodexMessageResult;

export interface CreateDaemonStateOptions {
  db: Database;
  createId: () => string;
  now: () => string;
  codexRuntimes?: AgentRuntimeRegistry;
  attachCodexRuntime?: AttachCodexRuntime;
  claudeChannelRuntimes?: Map<string, ClaudeChannelRuntime>;
  claudePendingTokens?: Map<string, ClaudePendingToken>;
  codexChannelRuntimes?: Map<string, CodexChannelRuntime>;
  codexPendingTokens?: Map<string, CodexPendingToken>;
  daemonSocketPath?: string;
}

export const productionAttachCodexRuntime: AttachCodexRuntime = defaultAttachCodexRuntime;

export interface ManagedAgentRuntime {
  readonly state: "starting" | "ready" | "failed" | "disposed";
  dispose(): Promise<void> | void;
}

export interface ManagedCodexProxyBindingEvent {
  method: "thread/start" | "thread/resume" | "thread/fork";
  threadId: string;
  requestId: number | string;
}

export interface ManagedCodexAgentRuntime extends ManagedAgentRuntime {
  readonly endpoint: URL;
  readonly activeThreadId: string | null;
  startThread(): Promise<string | null>;
  resumeThread(threadId: string): Promise<string | null>;
  listLoadedThreadIds(): Promise<string[]>;
  rebindActiveThread(threadId: string): void;
  onProxyBinding?(
    listener: (event: ManagedCodexProxyBindingEvent) => void,
  ): () => void;
}

type ResolvedCodexTurnStartRuntime = ManagedAgentRuntime &
  CodexTurnStartRuntime &
  Pick<ManagedCodexAgentRuntime, "listLoadedThreadIds" | "rebindActiveThread">;

export type AttachCodexRuntime = (request: {
  agentName: string;
  activeThreadId: string | null;
  codexChannelToken?: string;
  daemonSocketPath?: string;
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
  slot?: PairSlot;
  resumeSessionId?: string;
}

export type AttachAgentResult =
  | {
      ok: true;
      agent: StoredAgent;
      codexRuntime?: {
        endpoint: string;
        activeThreadId: string | null;
      };
      claudeChannelToken?: string;
      codexChannelToken?: string;
    }
  | Extract<AttachStoredAgentResult, { ok: false }>
  | {
      ok: false;
      reason: "pair_not_found";
      pairName: string;
    }
  | {
      ok: false;
      reason: "agent_already_attached" | "pair_slot_occupied";
      existingAgentId: string;
    }
  | {
      ok: false;
      reason: "pair_full";
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
      dispatch: DispatchSummary;
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

export type AdapterInjectFailureReason =
  | "adapter_inject_failed"
  | "codex_app_server_unavailable"
  | "codex_app_server_ws_connect_failed"
  | "codex_app_server_ws_initialize_failed"
  | "codex_app_server_ws_dropped"
  | "codex_turn_start_timeout"
  | "codex_jsonrpc_error"
  | "codex_resume_failed"
  | "codex_binding_uncertain"
  | "claude_channel_unavailable"
  | "claude_channel_push_failed";

export type AdapterInjectDeferredReason =
  | "target_adapter_not_registered"
  | "target_binding_unconfirmed"
  | "target_runtime_unavailable";

export interface DispatchSummary {
  delivered: number;
  deferred: Array<{
    targetAgentId: string;
    reason: AdapterInjectDeferredReason;
    eligibility?: string;
  }>;
  failed: Array<{
    targetAgentId: string;
    reason: AdapterInjectFailureReason | "target_agent_not_found";
  }>;
}

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
    pid: number;
    startedAt: string;
  };
  agents: ReturnType<ReturnType<typeof createAgentRepository>["list"]>;
  pairs: ReturnType<ReturnType<typeof createPairRepository>["list"]>;
  routes: ReturnType<ReturnType<typeof createRouteRepository>["list"]>;
  messageCount: number;
  deliveryCounts: Record<MessageDeliveryStatus, number>;
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
  registerClaudeChannel(request: RegisterClaudeChannelRequest): RegisterClaudeChannelResult;
  disconnectClaudeChannel(request: DisconnectClaudeChannelRequest): DisconnectClaudeChannelResult;
  receiveClaudeChannelMessage(
    request: ReceiveClaudeChannelMessageRequest,
  ): Promise<ReceiveClaudeChannelMessageResult>;
  receiveClaudeChannelReply(
    request: ReceiveClaudeChannelReplyRequest,
  ): Promise<ReceiveClaudeChannelReplyResult>;
  registerCodexChannel(request: RegisterCodexChannelRequest): RegisterCodexChannelResult;
  disconnectCodexChannel(request: DisconnectCodexChannelRequest): DisconnectCodexChannelResult;
  receiveCodexMessage(request: ReceiveCodexMessageRequest): Promise<ReceiveCodexMessageResult>;
  receiveCodexReply(request: ReceiveCodexReplyRequest): Promise<ReceiveCodexReplyResult>;
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
  const claudeChannelRuntimes =
    options.claudeChannelRuntimes ?? new Map<string, ClaudeChannelRuntime>();
  const claudePendingTokens =
    options.claudePendingTokens ?? new Map<string, ClaudePendingToken>();
  const codexChannelRuntimes =
    options.codexChannelRuntimes ?? new Map<string, CodexChannelRuntime>();
  const codexPendingTokens =
    options.codexPendingTokens ?? new Map<string, CodexPendingToken>();
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
      let codexChannelToken: string | null = null;
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
            slot: request.slot,
            now,
          });

          if (!pairAttachResult.ok) {
            if (
              pairAttachResult.reason === "agent_already_attached" ||
              pairAttachResult.reason === "agent_kind_mismatch" ||
              pairAttachResult.reason === "pair_full" ||
              pairAttachResult.reason === "pair_slot_occupied"
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
              pairSlot: pairAttachResult.slot,
            },
          };
        });

        if (!attachResult.ok) {
          return attachResult;
        }

        if (request.kind === "claude") {
          const token = randomUUID();
          claudePendingTokens.set(request.name, {
            agentName: request.name,
            token,
            createdAt: options.now(),
          });
          return { ...attachResult, claudeChannelToken: token };
        }

        if (request.kind !== "codex" || !attachCodexRuntime) {
          return attachResult;
        }

        storedAgent = attachResult.agent;
        codexChannelToken = randomUUID();
        codexPendingTokens.set(request.name, {
          agentName: request.name,
          token: codexChannelToken,
          createdAt: options.now(),
        });
        const runtime = await attachCodexRuntime({
          agentName: request.name,
          activeThreadId: storedAgent.adapterSessionId,
          codexChannelToken,
          ...(options.daemonSocketPath === undefined
            ? {}
            : { daemonSocketPath: options.daemonSocketPath }),
        });
        startingCodexRuntime = runtime;

        runtime.onProxyBinding?.((event) => {
          handleCodexProxyBinding(request.name, runtime, event);
        });

        if (!request.resumeSessionId) {
          codexRuntimes.set(request.name, runtime);
          startingCodexRuntime = null;

          return {
            ok: true,
            agent: storedAgent,
            codexRuntime: {
              endpoint: runtime.endpoint.toString(),
              activeThreadId: runtime.activeThreadId,
            },
            codexChannelToken,
          };
        }

        const nextThreadId = await runtime.resumeThread(request.resumeSessionId);

        if (!nextThreadId) {
          throw Object.assign(new Error("Codex did not return a thread id"), {
            code: "codex_runtime_attach_failed",
          });
        }

        if (nextThreadId !== request.resumeSessionId) {
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
            operation: "thread/resume",
            source: "attach_resume",
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
          codexChannelToken,
        };
      } catch (error) {
        if (isAttachRollback(error)) {
          return error.response;
        }

        if (codexChannelToken) {
          codexPendingTokens.delete(request.name);
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
      return runSendMessageTransaction(request);
    },

    updateDeliveryStatus(request) {
      return updateDeliveryStatusInTransaction(request);
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

      codexPendingTokens.delete(request.agentName);
      codexChannelRuntimes.delete(request.agentName);

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
      codexChannelRuntimes.delete(request.agentName);
      codexPendingTokens.delete(request.agentName);
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

    registerClaudeChannel(request) {
      const pending = claudePendingTokens.get(request.agentName);
      if (!pending || pending.token !== request.token) {
        return {
          ok: false,
          reason: "claude_channel_registration_failed" as const,
          detail: "unknown_token",
        };
      }

      const parsedEndpoint = parseLoopbackHttpEndpoint(request.endpoint);
      if (!parsedEndpoint) {
        return {
          ok: false,
          reason: "claude_channel_registration_failed" as const,
          detail: "invalid_endpoint",
        };
      }

      claudePendingTokens.delete(request.agentName);
      const runtime: ClaudeChannelRuntime = {
        agentName: request.agentName,
        endpoint: parsedEndpoint,
        registeredAt: options.now(),
        tokenHash: claudeTokenFingerprint(request.token),
      };
      claudeChannelRuntimes.set(request.agentName, runtime);
      return { ok: true, runtime };
    },

    disconnectClaudeChannel(request) {
      const had = claudeChannelRuntimes.has(request.agentName);
      claudeChannelRuntimes.delete(request.agentName);
      claudePendingTokens.delete(request.agentName);

      const agent = agents.findByName(request.agentName);
      const wasConnected = agent?.status === "connected";
      if (wasConnected) {
        agents.markByNameDisconnected(request.agentName, options.now());
      }

      return {
        ok: true,
        agentName: request.agentName,
        disconnected: had || wasConnected,
      };
    },

    async receiveClaudeChannelMessage(request) {
      const agent = agents.findByName(request.agentName);
      const result = runSendMessageTransaction({
        sourceName: request.agentName,
        messageId: request.messageId,
        type: "question",
        content: request.text,
      });

      events.append({
        id: options.createId(),
        type: "claude_channel_message_received",
        data: {
          text: request.text,
          ...(result.ok ? { messageId: result.message.id } : {}),
        },
        createdAt: options.now(),
        agentId: agent?.id ?? null,
        messageId: result.ok ? result.message.id : null,
        deliveryId: null,
        routeId: null,
      });

      if (result.ok) {
        result.dispatch = await dispatchToPairPeers({
          sourceName: request.agentName,
          message: result.message,
          deliveries: result.deliveries,
        });
      }

      return result;
    },

    async receiveClaudeChannelReply(request) {
      const agent = agents.findByName(request.agentName);
      const result = runSendMessageTransaction({
        sourceName: request.agentName,
        messageId: options.createId(),
        parentMessageId: request.chatId,
        type: "reply",
        content: request.text,
      });

      events.append({
        id: options.createId(),
        type: "claude_channel_reply_received",
        data: {
          chatId: request.chatId,
          text: request.text,
          ...(result.ok ? { messageId: result.message.id } : {}),
        },
        createdAt: options.now(),
        agentId: agent?.id ?? null,
        messageId: result.ok ? result.message.id : null,
        deliveryId: null,
        routeId: null,
      });

      if (result.ok) {
        result.dispatch = await dispatchToPairPeers({
          sourceName: request.agentName,
          message: result.message,
          deliveries: result.deliveries,
        });
      }

      return { ok: true };
    },

    registerCodexChannel(request) {
      const pending = codexPendingTokens.get(request.agentName);
      if (!pending || pending.token !== request.token) {
        return {
          ok: false,
          reason: "codex_channel_registration_failed" as const,
          detail: "unknown_token",
        };
      }

      codexPendingTokens.delete(request.agentName);
      const now = options.now();
      const runtime: CodexChannelRuntime = {
        agentName: request.agentName,
        registeredAt: now,
        tokenHash: codexTokenFingerprint(request.token),
      };
      codexChannelRuntimes.set(request.agentName, runtime);
      const agent = agents.findByName(request.agentName);
      events.append({
        id: options.createId(),
        type: "codex_channel_registered",
        data: { tokenHash: codexTokenShortHash(request.token) },
        createdAt: now,
        agentId: agent?.id ?? null,
        messageId: null,
        deliveryId: null,
        routeId: null,
      });
      return { ok: true, runtime };
    },

    disconnectCodexChannel(request) {
      const had = codexChannelRuntimes.has(request.agentName);
      codexChannelRuntimes.delete(request.agentName);
      codexPendingTokens.delete(request.agentName);
      if (had) {
        const agent = agents.findByName(request.agentName);
        events.append({
          id: options.createId(),
          type: "codex_channel_disconnected",
          data: {},
          createdAt: options.now(),
          agentId: agent?.id ?? null,
          messageId: null,
          deliveryId: null,
          routeId: null,
        });
      }
      return { ok: true, agentName: request.agentName, disconnected: had };
    },

    async receiveCodexMessage(request) {
      const authz = authorizeCodexIngress(request.agentName, request.token);
      if (!authz.ok) {
        return authz.error;
      }
      const result = runSendMessageTransaction({
        sourceName: request.agentName,
        messageId: request.messageId,
        type: "question",
        content: request.content,
      });
      if (result.ok) {
        events.append({
          id: options.createId(),
          type: "codex_ingress_message_received",
          data: { messageId: result.message.id },
          createdAt: options.now(),
          agentId: result.message.sourceAgentId,
          messageId: result.message.id,
          deliveryId: null,
          routeId: null,
        });
        result.dispatch = await dispatchToPairPeers({
          sourceName: request.agentName,
          message: result.message,
          deliveries: result.deliveries,
        });
      }
      return result;
    },

    async receiveCodexReply(request) {
      const authz = authorizeCodexIngress(request.agentName, request.token);
      if (!authz.ok) {
        return authz.error;
      }
      const result = runSendMessageTransaction({
        sourceName: request.agentName,
        messageId: request.messageId,
        parentMessageId: request.parentMessageId,
        type: "reply",
        content: request.content,
      });
      if (result.ok) {
        events.append({
          id: options.createId(),
          type: "codex_ingress_reply_received",
          data: {
            messageId: result.message.id,
            parentMessageId: request.parentMessageId,
          },
          createdAt: options.now(),
          agentId: result.message.sourceAgentId,
          messageId: result.message.id,
          deliveryId: null,
          routeId: null,
        });
        result.dispatch = await dispatchToPairPeers({
          sourceName: request.agentName,
          message: result.message,
          deliveries: result.deliveries,
        });
      }
      return result;
    },

    status() {
      return {
        daemon: {
          pid: process.pid,
          startedAt,
        },
        agents: agents.list(),
        pairs: pairs.list(),
        routes: routes.list(),
        messageCount: messages.count(),
        deliveryCounts: deliveries.countByStatus(),
      };
    },

    stop(request) {
      return withTransaction(options.db, () => {
        const stoppedAgents = request.daemonOnly
          ? []
          : agents.markAllConnectedDisconnected(options.now());
        if (!request.daemonOnly) {
          for (const agent of stoppedAgents) {
            codexChannelRuntimes.delete(agent.name);
            codexPendingTokens.delete(agent.name);
          }
        }
        return { ok: true, stoppedAgents };
      });
    },
  };

  function updateDeliveryStatusInTransaction(
    request: UpdateDeliveryStatusRequest,
  ): UpdateDeliveryStatusResult {
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
  }

  async function dispatchToPairPeers(input: {
    sourceName: string;
    message: StoredMessage;
    deliveries: StoredDelivery[];
  }): Promise<DispatchSummary> {
    const summary = emptyDispatchSummary();

    for (const delivery of input.deliveries) {
      const targetAgent = agents
        .list()
        .find((agent) => agent.id === delivery.targetAgentId);

      if (!targetAgent) {
        updateDeliveryStatusInTransaction({
          deliveryId: delivery.id,
          status: "failed",
          error: {
            reason: "target_agent_not_found",
            message: `target agent not found`,
          },
        });
        summary.failed.push({
          targetAgentId: delivery.targetAgentId,
          reason: "target_agent_not_found",
        });
        continue;
      }

      const injectResult =
        targetAgent.kind === "codex"
          ? await injectMessageIntoCodexTarget(input.message, delivery, targetAgent)
          : await injectMessageIntoClaudeTarget(input, delivery, targetAgent);

      if (injectResult.kind === "success") {
        updateDeliveryStatusInTransaction({
          deliveryId: delivery.id,
          status: "delivered",
        });
        updateDeliveryStatusInTransaction({
          deliveryId: delivery.id,
          status: "completed",
        });
        summary.delivered += 1;
        continue;
      }

      if (injectResult.kind === "deferred") {
        if (deliveries.findById(delivery.id)?.status === "delivering") {
          updateDeliveryStatusInTransaction({
            deliveryId: delivery.id,
            status: "queued",
          });
        }
        summary.deferred.push({
          targetAgentId: targetAgent.id,
          reason: injectResult.reason,
          ...(injectResult.eligibility
            ? { eligibility: injectResult.eligibility }
            : {}),
        });
        continue;
      }

      updateDeliveryStatusInTransaction({
        deliveryId: delivery.id,
        status: "failed",
        error: {
          reason: injectResult.reason,
          message: injectResult.message,
        },
      });
      summary.failed.push({
        targetAgentId: targetAgent.id,
        reason: injectResult.reason,
      });
    }

    return summary;
  }

  async function injectMessageIntoClaudeTarget(
    input: {
      sourceName: string;
      message: StoredMessage;
    },
    delivery: StoredDelivery,
    targetAgent: StoredAgent,
  ): Promise<
    | { kind: "success" }
    | {
        kind: "failed";
        reason: AdapterInjectFailureReason;
        message: string;
      }
    | {
        kind: "deferred";
        reason: AdapterInjectDeferredReason;
        eligibility: string;
      }
  > {
    if (!claudeChannelRuntimes.has(targetAgent.name)) {
      return {
        kind: "deferred",
        reason: "target_runtime_unavailable",
        eligibility: "requires target claude channel runtime",
      };
    }

    updateDeliveryStatusInTransaction({
      deliveryId: delivery.id,
      status: "delivering",
    });

    const injectResult = await injectClaudeChannel(
      { getRuntime: (agentName) => claudeChannelRuntimes.get(agentName) },
      {
        agentName: targetAgent.name,
        content: input.message.content,
        chatId: input.message.id,
        origin: input.sourceName,
      },
    );

    if (injectResult.kind === "success") {
      return { kind: "success" };
    }

    if (injectResult.kind === "deferred") {
      return {
        kind: "deferred",
        reason: injectResult.reason,
        eligibility: injectResult.eligibility ?? "requires target adapter runtime",
      };
    }

    if (injectResult.reason === "claude_channel_unavailable") {
      return {
        kind: "deferred",
        reason: "target_runtime_unavailable",
        eligibility: "requires target claude channel runtime",
      };
    }

    return {
      kind: "failed",
      reason: injectResult.reason,
      message: injectResult.message,
    };
  }

  async function injectMessageIntoCodexTarget(
    message: StoredMessage,
    delivery: StoredDelivery,
    targetAgent: StoredAgent,
  ): Promise<
    | { kind: "success" }
    | {
        kind: "failed";
        reason: AdapterInjectFailureReason;
        message: string;
      }
    | {
        kind: "deferred";
        reason: AdapterInjectDeferredReason;
        eligibility: string;
      }
  > {
    const sourceAgent = agents.list().find((agent) => agent.id === message.sourceAgentId);
    const runtime = codexRuntimes.get(targetAgent.name);
    const target = await resolveCodexReplyTarget(runtime);

    if (!target.ok) {
      if (target.reason === "codex_no_loaded_thread") {
        events.append({
          id: options.createId(),
          type: "codex_delivery_target_unavailable",
          data: {
            operation: "thread/loaded/list",
            loadedThreadIds: target.loadedThreadIds ?? [],
            previousAdapterSessionId: targetAgent.adapterSessionId,
            runtimeActiveThreadId: target.runtimeActiveThreadId ?? null,
            reason: target.reason,
            deliveryMessageType: message.type,
            sourceAgentId: message.sourceAgentId,
            sourceAgentName: sourceAgent?.name ?? "unknown",
            targetAgentName: targetAgent.name,
          },
          createdAt: options.now(),
          agentId: targetAgent.id,
          messageId: message.id,
          deliveryId: delivery.id,
          routeId: delivery.routeId,
        });
        events.append({
          id: options.createId(),
          type: "codex_delivery_queued_no_loaded_thread",
          data: {
            reason: target.reason,
            message: target.message,
          },
          createdAt: options.now(),
          agentId: targetAgent.id,
          messageId: message.id,
          deliveryId: delivery.id,
          routeId: delivery.routeId,
        });
        return {
          kind: "deferred",
          reason: "target_binding_unconfirmed",
          eligibility: "requires target codex binding",
        };
      }

      if (target.reason === "codex_channel_unavailable") {
        return {
          kind: "deferred",
          reason: "target_runtime_unavailable",
          eligibility: "requires target codex runtime",
        };
      }

      return {
        kind: "failed",
        reason: "adapter_inject_failed",
        message: target.message,
      };
    }

    events.append({
      id: options.createId(),
      type: "codex_delivery_target_selected",
      data: {
        operation: "thread/loaded/list",
        loadedThreadIds: target.loadedThreadIds,
        chosenThreadId: target.threadId,
        previousAdapterSessionId: targetAgent.adapterSessionId,
        runtimeActiveThreadId: target.runtimeActiveThreadId,
        selectionPolicy: target.selectionPolicy,
        deliveryMessageType: message.type,
        sourceAgentId: message.sourceAgentId,
        sourceAgentName: sourceAgent?.name ?? "unknown",
        targetAgentName: targetAgent.name,
      },
      createdAt: options.now(),
      agentId: targetAgent.id,
      messageId: message.id,
      deliveryId: delivery.id,
      routeId: delivery.routeId,
    });

    updateDeliveryStatusInTransaction({
      deliveryId: delivery.id,
      status: "delivering",
    });

    const injectResult = await injectReplyIntoCodexRuntime(
      target.runtime,
      target.threadId,
      formatCodexAioxChannelEnvelope(message, sourceAgent?.kind ?? "unknown"),
    );

    if (injectResult.kind === "deferred") {
      return {
        kind: "deferred",
        reason: injectResult.reason,
        eligibility: injectResult.eligibility ?? "requires target codex runtime",
      };
    }

    if (injectResult.kind === "failed") {
      events.append({
        id: options.createId(),
        type: "codex_delivery_target_injection_failed",
        data: {
          chosenThreadId: target.threadId,
          loadedThreadIds: target.loadedThreadIds,
          reason: injectResult.reason,
          message: injectResult.message,
          sourceAgentId: message.sourceAgentId,
          sourceAgentName: sourceAgent?.name ?? "unknown",
          targetAgentName: targetAgent.name,
        },
        createdAt: options.now(),
        agentId: targetAgent.id,
        messageId: message.id,
        deliveryId: delivery.id,
        routeId: delivery.routeId,
      });
      return {
        kind: "failed",
        reason: injectResult.reason,
        message: injectResult.message,
      };
    }

    target.runtime.rebindActiveThread(target.threadId);
    if (target.threadId !== targetAgent.adapterSessionId) {
      const now = options.now();
      const reboundAgent = agents.rebindAdapterSessionId({
        name: targetAgent.name,
        adapterSessionId: target.threadId,
        now,
      });
      if (reboundAgent) {
        events.append({
          id: options.createId(),
          type: "agent_thread_id_rebound",
          data: {
            previousId: targetAgent.adapterSessionId,
            nextId: target.threadId,
            operation: "thread/loaded/list",
            source: "loaded_list",
          },
          createdAt: now,
          agentId: reboundAgent.id,
          messageId: message.id,
          deliveryId: delivery.id,
          routeId: delivery.routeId,
        });
      }
    }

    return { kind: "success" };
  }

  async function resolveCodexReplyTarget(
    runtime: ManagedAgentRuntime | undefined,
  ): Promise<
    | {
        ok: true;
        runtime: ResolvedCodexTurnStartRuntime;
        threadId: string;
        loadedThreadIds: string[];
        runtimeActiveThreadId: string | null;
        selectionPolicy: "proxy_active_thread";
      }
    | {
        ok: false;
        reason: string;
        message: string;
        loadedThreadIds?: string[];
        runtimeActiveThreadId?: string | null;
      }
  > {
    if (!isCodexTurnStartRuntime(runtime)) {
      return {
        ok: false,
        reason: "codex_channel_unavailable",
        message: "Codex runtime not available for reply delivery",
      };
    }

    if (runtime.state !== "ready") {
      return {
        ok: false,
        reason: "codex_channel_unavailable",
        message: `Codex runtime is not ready: ${runtime.state}`,
      };
    }

    const runtimeActiveThreadId = runtime.activeThreadId;
    const loadedThreadIds = await runtime.listLoadedThreadIds();

    if (runtimeActiveThreadId) {
      return {
        ok: true,
        runtime,
        threadId: runtimeActiveThreadId,
        loadedThreadIds,
        runtimeActiveThreadId,
        selectionPolicy: "proxy_active_thread",
      };
    }

    return {
      ok: false,
      reason: "codex_no_loaded_thread",
      message: "Codex runtime has no authoritative active thread id",
      loadedThreadIds,
      runtimeActiveThreadId,
    };
  }

  function handleCodexProxyBinding(
    agentName: string,
    runtime: ManagedCodexAgentRuntime,
    event: ManagedCodexProxyBindingEvent,
  ): void {
    const targetAgent = agents
      .list()
      .find((agent) => agent.name === agentName);
    if (!targetAgent) {
      return;
    }
    if (targetAgent.adapterSessionId === event.threadId) {
      runtime.rebindActiveThread(event.threadId);
      return;
    }

    const now = options.now();
    withTransaction(options.db, () => {
      const reboundAgent = agents.rebindAdapterSessionId({
        name: agentName,
        adapterSessionId: event.threadId,
        now,
      });
      if (!reboundAgent) {
        return;
      }
      events.append({
        id: options.createId(),
        type: "agent_thread_id_rebound",
        data: {
          previousId: targetAgent.adapterSessionId,
          nextId: event.threadId,
          operation: event.method,
          source: "proxy_binding",
          requestId: event.requestId,
        },
        createdAt: now,
        agentId: reboundAgent.id,
        messageId: null,
        deliveryId: null,
        routeId: null,
      });
    });
    runtime.rebindActiveThread(event.threadId);
  }

  async function injectReplyIntoCodexRuntime(
    runtime: CodexTurnStartRuntime,
    threadId: string,
    content: string,
  ): Promise<
    | { kind: "success" }
    | { kind: "failed"; reason: AdapterInjectFailureReason; message: string }
    | { kind: "deferred"; reason: AdapterInjectDeferredReason; eligibility?: string }
  > {
    // The runtime cache may still point at the previous TUI thread here. The
    // live target wrapper keeps injectTurnStart's mismatch guard meaningful
    // without mutating daemon cache until turn/start succeeds.
    return injectTurnStart(
      {
        activeThreadId: threadId,
        requestCodex: runtime.requestCodex.bind(runtime),
      },
      {
        threadId,
        input: content,
      },
    );
  }

  function formatCodexAioxChannelEnvelope(message: StoredMessage, source: string): string {
    return `<aiox-channel source="${escapeXmlAttr(source)}" message_id="${escapeXmlAttr(message.id)}">\n${escapeXmlContent(message.content)}\n</aiox-channel>`;
  }

  function escapeXmlAttr(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  function escapeXmlContent(s: string): string {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function authorizeCodexIngress(
    agentName: string,
    token: string,
  ):
    | { ok: true }
    | {
        ok: false;
        error: { ok: false; reason: "codex_ingress_unauthorized"; detail: string };
      } {
    if (!token) {
      return {
        ok: false,
        error: { ok: false, reason: "codex_ingress_unauthorized", detail: "missing_token" },
      };
    }
    const runtime = codexChannelRuntimes.get(agentName);
    if (!runtime) {
      return {
        ok: false,
        error: {
          ok: false,
          reason: "codex_ingress_unauthorized",
          detail: "agent_not_registered",
        },
      };
    }
    const agent = agents.findByName(agentName);
    if (!agent || agent.status !== "connected") {
      return {
        ok: false,
        error: {
          ok: false,
          reason: "codex_ingress_unauthorized",
          detail: "agent_disconnected",
        },
      };
    }
    if (runtime.tokenHash !== codexTokenFingerprint(token)) {
      return {
        ok: false,
        error: {
          ok: false,
          reason: "codex_ingress_unauthorized",
          detail: "token_mismatch",
        },
      };
    }
    return { ok: true };
  }

  function runSendMessageTransaction(request: SendMessageRequest): SendMessageResult {
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
          dispatch: emptyDispatchSummary(),
        };
      });
    } catch (error) {
      if (isSendMessageRollback(error)) {
        return error.response;
      }

      throw error;
    }
  }

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

    codexChannelRuntimes.delete(input.agentName);
    codexPendingTokens.delete(input.agentName);

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
  {
    ok: false;
    reason:
      | "agent_already_attached"
      | "agent_kind_mismatch"
      | "pair_full"
      | "pair_slot_occupied";
  }
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
  codexChannelToken?: string;
  daemonSocketPath?: string;
}): Promise<ManagedCodexAgentRuntime> {
  return attachCodexAgentRuntime({
    agentName: request.agentName,
    activeThreadId: request.activeThreadId,
    ...(request.codexChannelToken && request.daemonSocketPath
      ? {
          mcp: {
            agentToken: request.codexChannelToken,
            daemonSocketPath: request.daemonSocketPath,
          },
        }
      : {}),
  });
}

function isCodexTurnStartRuntime(
  runtime: ManagedAgentRuntime | undefined,
): runtime is ResolvedCodexTurnStartRuntime {
  return (
    runtime !== undefined &&
    "activeThreadId" in runtime &&
    "requestCodex" in runtime &&
    "listLoadedThreadIds" in runtime &&
    "rebindActiveThread" in runtime &&
    typeof (runtime as { requestCodex?: unknown }).requestCodex === "function" &&
    typeof (runtime as { listLoadedThreadIds?: unknown }).listLoadedThreadIds === "function" &&
    typeof (runtime as { rebindActiveThread?: unknown }).rebindActiveThread === "function"
  );
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

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost"]);

function parseLoopbackHttpEndpoint(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:") return null;
  if (!LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) return null;
  if (url.port.length === 0) return null;
  if (!url.pathname.endsWith("/send")) return null;
  return `${url.protocol}//${url.host}${url.pathname}`;
}

function claudeTokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}

function codexTokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function codexTokenShortHash(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
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
  const slotA = pairAgents.find((agent) => agent.pairSlot === "a");
  const slotB = pairAgents.find((agent) => agent.pairSlot === "b");

  if (!slotA || !slotB) {
    return;
  }

  const routePairs =
    slotA.kind === slotB.kind
      ? [
          [slotB.id, slotA.id],
          [slotA.id, slotB.id],
        ]
      : [
          [slotA.id, slotB.id],
          [slotB.id, slotA.id],
        ];

  for (const [sourceAgentId, targetAgentId] of routePairs) {
    createRouteIfMissing(input.routes, {
      id: input.createId,
      now: input.now,
      sourceAgentId,
      targetAgentId,
    });
  }
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

function emptyDispatchSummary(): DispatchSummary {
  return {
    delivered: 0,
    deferred: [],
    failed: [],
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
