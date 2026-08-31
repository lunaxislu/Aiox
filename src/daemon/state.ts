import type Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";

import {
  createPublicDeliveryId as defaultCreatePublicDeliveryId,
  createPublicMessageId as defaultCreatePublicMessageId,
} from "../core/public-ids.js";

import type { AgentKind } from "../core/agents.js";
import type { AioxProfile } from "../config/paths.js";
import {
  canAcceptFanoutIntoTargetQueues,
  deliveryQueueTtlMs,
  retryDelayMs,
  type MessageDeliveryStatus,
} from "../core/deliveries.js";
import type {
  AgentAuthoredIntent,
  MessageType,
} from "../core/messages.js";
export type { AgentAuthoredIntent } from "../core/messages.js";
import type { DeliveryOutcomeType } from "../core/outcomes.js";
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
import { createReplyRightRepository } from "../store/repositories/reply-rights.js";
import { createPairRepository } from "../store/repositories/pairs.js";
import type { StoredPair } from "../store/repositories/pairs.js";
import {
  createRouteRepository,
  type StoredRoute,
} from "../store/repositories/routes.js";
import { withTransaction } from "../store/transaction.js";
import { createHostRuntime, type HostRuntime } from "./host-runtime.js";
import { injectClaudeChannel } from "../adapters/claude/injector.js";
import {
  injectTurnStart,
  type CodexTurnStartRuntime,
} from "../adapters/codex/injector.js";
import { attachCodexAgentRuntime } from "../adapters/codex/runtime.js";

const attachRollbackSentinel = Symbol("aiox.attach.rollback");
const sendMessageRollbackSentinel = Symbol("aiox.sendMessage.rollback");
const daemonMessageSourceAgentId = "daemon";

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

export type ClaudeChannelBootFailureCause = "claude_channel_port_in_use";

export interface ReportClaudeChannelBootFailureRequest {
  agentName: string;
  token: string;
  reason: ClaudeChannelBootFailureCause;
}

export type ReportClaudeChannelBootFailureResult =
  | { ok: true; agentName: string; recorded: boolean }
  | {
      ok: false;
      reason: "claude_channel_boot_failure_report_rejected";
      detail: "unknown_token" | "unsupported_reason";
    };

export interface DisconnectClaudeChannelRequest {
  agentName: string;
}

export interface DisconnectClaudeChannelResult {
  ok: true;
  agentName: string;
  // True when this call removed a registered channel runtime or removed an
  // attached Claude agent's row (and its routes).
  disconnected: boolean;
}

export interface ReceiveClaudeChannelMessageRequest {
  agentName: string;
  messageId: string;
  type?: "question" | "instruction";
  intent?: AgentAuthoredIntent;
  replyExpected?: boolean;
  content: { text: string };
}

export type ReceiveClaudeChannelMessageResult = SendMessageResult;

export interface ReceiveClaudeChannelReplyRequest {
  agentName: string;
  messageId: string;
  inReplyToDeliveryId?: string;
  intent?: AgentAuthoredIntent;
  replyExpected?: boolean;
  content: { text: string };
}

export type ReceiveClaudeChannelReplyResult = SendMessageResult;

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
  type?: "question" | "instruction";
  intent?: AgentAuthoredIntent;
  replyExpected?: boolean;
  content: { text: string };
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
    }
  | {
      ok: false;
      reason: "delivery_queue_full";
      targetAgentIds: string[];
    }
  | { ok: false; reason: "unknown_delivery" | "correlation_mismatch" | "reply_not_expected" | "duplicate_reply" };

export interface ReceiveCodexReplyRequest {
  agentName: string;
  token: string;
  messageId: string;
  inReplyToDeliveryId?: string;
  intent?: AgentAuthoredIntent;
  replyExpected?: boolean;
  content: { text: string };
}

export type ReceiveCodexReplyResult = ReceiveCodexMessageResult;

export interface CreateDaemonStateOptions {
  db: Database;
  createId: () => string;
  createPublicMessageId?: () => string;
  createPublicDeliveryId?: () => string;
  now: () => string;
  codexRuntimes?: AgentRuntimeRegistry;
  attachCodexRuntime?: AttachCodexRuntime;
  claudeChannelRuntimes?: Map<string, ClaudeChannelRuntime>;
  claudePendingTokens?: Map<string, ClaudePendingToken>;
  codexChannelRuntimes?: Map<string, CodexChannelRuntime>;
  codexPendingTokens?: Map<string, CodexPendingToken>;
  daemonSocketPath?: string;
  profile?: AioxProfile;
  scheduleTimeout?: (callback: () => void, delayMs: number) => unknown;
  cancelTimeout?: (handle: unknown) => void;
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
  startThread(cwd?: string, developerInstructions?: string): Promise<string | null>;
  resumeThread(
    threadId: string,
    cwd?: string,
    developerInstructions?: string,
  ): Promise<string | null>;
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
  onRuntimeFailed?: (failure: RecordCodexRuntimeFailedRequest) => void;
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
  role?: string;
  description?: string;
  instructions?: string;
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
      /**
       * Present only when this failure's own cleanup — disposing the
       * eager-started (no-resume) or resumed runtime before the row was
       * removed — itself rejected. The row and routes are removed either
       * way; this surfaces the dispose failure instead of discarding it, the
       * same contract `DetachAgentResult.runtimeDisposeError` has.
       */
      runtimeDisposeError?: string;
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

export interface SendMessageRequest {
  sourceName: string;
  messageId: string;
  parentMessageId?: string | null;
  type: MessageType;
  intent?: AgentAuthoredIntent;
  replyExpected?: boolean;
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
    }
  | {
      ok: false;
      reason: "delivery_queue_full";
      targetAgentIds: string[];
    }
  | { ok: false; reason: "unknown_delivery" | "correlation_mismatch" | "reply_not_expected" | "duplicate_reply" };

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
  | "claude_channel_push_failed"
  | "claude_channel_push_unconfirmed";

export type AdapterInjectDeferredReason =
  | "target_adapter_not_registered"
  | "target_binding_unconfirmed"
  | "target_runtime_unavailable";

export interface DispatchSummary {
  delivered: number;
  deferred: Array<{
    targetAgentId: string;
    reason: AdapterInjectDeferredReason;
    cause?: ClaudeChannelBootFailureCause;
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

export interface RetransmitUnconfirmedDeliveryRequest {
  deliveryId: string;
  confirmDuplicateRisk: boolean;
}

export type RetransmitUnconfirmedDeliveryResult =
  | { ok: true; delivery: StoredDelivery }
  | { ok: false; reason: "delivery_not_found"; deliveryId: string }
  | { ok: false; reason: "delivery_not_unconfirmed"; delivery: StoredDelivery }
  | { ok: false; reason: "duplicate_risk_confirmation_required" }
  | {
      ok: false;
      reason: "manual_retransmit_unconfirmed";
      delivery: StoredDelivery;
      message: string;
    }
  | {
      ok: false;
      reason: "manual_retransmit_rejected";
      delivery: StoredDelivery;
      message: string;
    }
  | {
      ok: false;
      reason: "manual_retransmit_failed";
      delivery: StoredDelivery;
      message: string;
    };

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

export interface DetachAgentRequest {
  agentName: string;
}

export interface DetachAgentResult {
  ok: true;
  agentName: string;
  detached: boolean;
  /**
   * Present only when the agent's runtime rejected on `dispose()`. Detach still
   * removes the row, routes, and registry entries — a runtime that will not shut
   * down cleanly must not strand daemon state — but the failure is reported so
   * callers (`aiox host`'s cleanup exit code, the single-agent CLI's TUI-failure
   * diagnostic) can observe it instead of it being silently swallowed.
   */
  runtimeDisposeError?: string;
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

export interface ListReachablePeersRequest {
  agentName: string;
}

export type ListReachablePeersResult =
  | {
      ok: true;
      peers: StoredAgent[];
    }
  | {
      ok: false;
      reason: "source_agent_not_found";
      sourceName: string;
    };

export interface StopRequest {
  daemonOnly?: boolean;
}

export interface StopResult {
  ok: true;
  stoppedAgents: ReturnType<
    ReturnType<typeof createAgentRepository>["removeAllConnected"]
  >;
}

/**
 * `HostRuntime` contributes the running-host registry, the host-scoped agent
 * namespace and the control relay. They are composed in rather than restated
 * here: the daemon state owns standalone agent/message/delivery behavior, and
 * `src/daemon/host-runtime.ts` owns host runtime state end to end.
 */
export interface DaemonState extends HostRuntime {
  attachAgent(request: AttachAgentRequest): Promise<AttachAgentResult>;
  createPair(request: CreatePairRequest): CreatePairResult;
  connect(request: ConnectRequest): ConnectResult;
  sendMessage(request: SendMessageRequest): SendMessageResult;
  updateDeliveryStatus(request: UpdateDeliveryStatusRequest): UpdateDeliveryStatusResult;
  retransmitUnconfirmedDelivery(
    request: RetransmitUnconfirmedDeliveryRequest,
  ): Promise<RetransmitUnconfirmedDeliveryResult>;
  detachAgent(request: DetachAgentRequest): Promise<DetachAgentResult>;
  notifyTuiExited(request: NotifyTuiExitedRequest): Promise<NotifyTuiExitedResult>;
  recordCodexRuntimeFailed(
    request: RecordCodexRuntimeFailedRequest,
  ): RecordCodexRuntimeFailedResult;
  registerClaudeChannel(request: RegisterClaudeChannelRequest): RegisterClaudeChannelResult;
  reportClaudeChannelBootFailure(
    request: ReportClaudeChannelBootFailureRequest,
  ): ReportClaudeChannelBootFailureResult;
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
  listReachablePeers(request: ListReachablePeersRequest): ListReachablePeersResult;
  stop(request: StopRequest): Promise<StopResult>;
}

const outcomeGuidance: Record<DeliveryOutcomeType, string> = {
  delivery_unconfirmed:
    "Ask the user to confirm target activity and duplicate-risk acceptance before deciding whether to retransmit.",
  delivery_target_rejected:
    "Do not retransmit. Ask the user how to resolve the rejection and whether sending a new message is appropriate.",
};

export function createDaemonState(
  options: CreateDaemonStateOptions,
): DaemonState {
  const createPublicMessageId = options.createPublicMessageId ?? defaultCreatePublicMessageId;
  const createPublicDeliveryId = options.createPublicDeliveryId ?? defaultCreatePublicDeliveryId;
  const profile = options.profile ?? "release";
  const agents = createAgentRepository(options.db);
  const deliveries = createDeliveryRepository(options.db);
  const events = createEventRepository(options.db);
  const messages = createMessageRepository(options.db);
  const replyRights = createReplyRightRepository(options.db);
  const pairs = createPairRepository(options.db);
  const routes = createRouteRepository(options.db);
  const codexRuntimes = options.codexRuntimes ?? new Map<string, ManagedAgentRuntime>();
  const attachCodexRuntime = options.attachCodexRuntime;
  const claudeChannelRuntimes =
    options.claudeChannelRuntimes ?? new Map<string, ClaudeChannelRuntime>();
  const claudePendingTokens =
    options.claudePendingTokens ?? new Map<string, ClaudePendingToken>();
  const claudeChannelBootFailures = new Map<string, ClaudeChannelBootFailureCause>();
  const codexChannelRuntimes =
    options.codexChannelRuntimes ?? new Map<string, CodexChannelRuntime>();
  const codexPendingTokens =
    options.codexPendingTokens ?? new Map<string, CodexPendingToken>();
  const scheduleTimeout = options.scheduleTimeout ?? ((callback, delayMs) => setTimeout(callback, delayMs));
  const cancelTimeout = options.cancelTimeout ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const queueExpiryTimers = new Map<string, unknown>();
  const preWriteRetryTimers = new Map<string, unknown>();
  const deliveryAttempts = new Map<string, number>();
  const manualDeliveryAttempts = new Map<string, number>();
  const targetFlushes = new Map<string, Promise<void>>();
  const startedAt = options.now();
  const hostRuntime = createHostRuntime({
    db: options.db,
    createId: options.createId,
    now: options.now,
  });

  return {
    ...hostRuntime,

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
            ...(request.role === undefined ? {} : { role: request.role }),
            ...(request.description === undefined ? {} : { description: request.description }),
            ...(request.instructions === undefined
              ? {}
              : { instructions: request.instructions }),
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
          claudeChannelBootFailures.delete(request.name);
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
          onRuntimeFailed: (failure) => {
            performRecordCodexRuntimeFailed(failure);
          },
          ...(options.daemonSocketPath === undefined
            ? {}
            : { daemonSocketPath: options.daemonSocketPath }),
        });
        startingCodexRuntime = runtime;

        runtime.onProxyBinding?.((event) => {
          handleCodexProxyBinding(request.name, runtime, event);
        });

        if (!request.resumeSessionId) {
          const startedThreadId = await runtime.startThread(request.cwd, request.instructions);

          if (!startedThreadId) {
            throw Object.assign(new Error("Codex did not return a thread id"), {
              code: "codex_runtime_attach_failed",
            });
          }

          const startNow = options.now();
          const startedAgent = agents.rebindAdapterSessionId({
            name: request.name,
            adapterSessionId: startedThreadId,
            now: startNow,
          });

          if (!startedAgent) {
            throw Object.assign(new Error(`Codex agent not found after attach: ${request.name}`), {
              code: "codex_runtime_attach_failed",
            });
          }

          codexRuntimes.set(request.name, runtime);
          startingCodexRuntime = null;
          await flushQueuedDeliveriesForTarget(startedAgent);
          events.append({
            id: options.createId(),
            type: "agent_thread_id_rebound",
            data: {
              previousId: storedAgent.adapterSessionId,
              nextId: startedThreadId,
              operation: "thread/start",
              source: "attach_start",
            },
            createdAt: startNow,
            agentId: startedAgent.id,
            messageId: null,
            deliveryId: null,
            routeId: null,
          });

          return {
            ok: true,
            agent: startedAgent,
            codexRuntime: {
              endpoint: runtime.endpoint.toString(),
              activeThreadId: startedThreadId,
            },
            codexChannelToken,
          };
        }

        const nextThreadId = await runtime.resumeThread(
          request.resumeSessionId,
          request.cwd,
          request.instructions,
        );

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
        await flushQueuedDeliveriesForTarget(reboundAgent);
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

        let runtimeDisposeError: string | undefined;
        if (storedAgent) {
          if (startingCodexRuntime) {
            runtimeDisposeError = await disposeRuntime(startingCodexRuntime);
          }
          removeDepartedAgent(storedAgent);
        }

        if (isCodexAttachError(error)) {
          return {
            ok: false,
            reason: error.code,
            message: error.message,
            ...(runtimeDisposeError === undefined ? {} : { runtimeDisposeError }),
          };
        }

        // An untyped rejection from startThread()/resumeThread() themselves
        // (not one of the typed codex_*_failed cases above) still propagates
        // as the attach failure — that identity is not replaced. But when
        // runtime dispose ALSO failed, that cleanup failure must not be
        // dropped just because this error has no `.code`: fold it into the
        // message (same "(...also failed: ...)" shape `cleanUpAfterTuiFailure`
        // already uses in src/cli/invocation.ts) and keep the original error
        // reachable via `cause` instead of silently discarding it.
        if (runtimeDisposeError !== undefined) {
          const originalMessage = error instanceof Error ? error.message : String(error);
          throw new Error(
            `${originalMessage} (runtime cleanup also failed: ${runtimeDisposeError})`,
            { cause: error },
          );
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

    sendMessage(request) {
      const result = runSendMessageTransaction(request);
      if (result.ok) scheduleQueuedDeliveryExpiry(result.deliveries);
      return result;
    },

    updateDeliveryStatus(request) {
      return updateDeliveryStatusInTransaction(request);
    },

    async retransmitUnconfirmedDelivery(request) {
      if (!request.confirmDuplicateRisk) {
        return { ok: false, reason: "duplicate_risk_confirmation_required" };
      }

      const delivery = deliveries.findById(request.deliveryId);
      if (!delivery) {
        return { ok: false, reason: "delivery_not_found", deliveryId: request.deliveryId };
      }
      if (delivery.status !== "unconfirmed") {
        return { ok: false, reason: "delivery_not_unconfirmed", delivery };
      }

      const message = messages.findById(delivery.messageId);
      const targetAgent = agents.list().find((agent) => agent.id === delivery.targetAgentId);

      if (message && targetAgent?.kind === "claude") {
        return retransmitClaudeUnconfirmedDelivery(message, delivery, targetAgent);
      }

      if (!message || !targetAgent || targetAgent.kind !== "codex") {
        return {
          ok: false,
          reason: "manual_retransmit_failed",
          delivery,
          message: "ready Codex runtime and bound thread are required for manual retransmit",
        };
      }

      const resolvedTarget = await resolveCodexReplyTarget(codexRuntimes.get(targetAgent.name));
      if (!resolvedTarget.ok) {
        return {
          ok: false,
          reason: "manual_retransmit_failed",
          delivery,
          message: "ready Codex runtime and bound thread are required for manual retransmit",
        };
      }

      const attempt = (manualDeliveryAttempts.get(delivery.id) ?? 0) + 1;
      manualDeliveryAttempts.set(delivery.id, attempt);
      events.append({
        id: options.createId(),
        type: "delivery_manual_retransmit",
        data: { actor: "operator", attempt, confirmDuplicateRisk: true },
        createdAt: options.now(),
        agentId: targetAgent.id,
        messageId: message.id,
        deliveryId: delivery.id,
        routeId: delivery.routeId,
      });

      const injectResult = await injectMessageIntoCodexTarget(message, delivery, targetAgent, {
        transitionToDelivering: false,
        manualAttempt: { attempt },
        resolvedTarget,
      });
      if (injectResult.kind === "success") {
        const result = updateDeliveryStatusInTransaction({
          deliveryId: delivery.id,
          status: "delivered",
        });
        events.append({
          id: options.createId(),
          type: "delivery_manual_retransmit_delivered",
          data: { actor: "operator", attempt },
          createdAt: options.now(),
          agentId: targetAgent.id,
          messageId: message.id,
          deliveryId: delivery.id,
          routeId: delivery.routeId,
        });
        return result.ok
          ? result
          : { ok: false, reason: "delivery_not_found", deliveryId: delivery.id };
      }

      if (injectResult.kind === "deferred") {
        return {
          ok: false,
          reason: "manual_retransmit_failed",
          delivery: deliveries.findById(delivery.id) ?? delivery,
          message: "ready Codex runtime and bound thread are required for manual retransmit",
        };
      }

      const rejected = injectResult.reason === "codex_jsonrpc_error";
      events.append({
        id: options.createId(),
        type: rejected
          ? "delivery_manual_retransmit_rejected"
          : "delivery_manual_retransmit_unconfirmed",
        data: {
          actor: "operator",
          attempt,
          requestId: injectResult.requestId ?? null,
          adapter: "codex",
          code: injectResult.jsonRpcCode ?? null,
          reason: injectResult.reason,
          message: injectResult.message,
        },
        createdAt: options.now(),
        agentId: targetAgent.id,
        messageId: message.id,
        deliveryId: delivery.id,
        routeId: delivery.routeId,
      });
      return {
        ok: false,
        reason: rejected ? "manual_retransmit_rejected" : "manual_retransmit_unconfirmed",
        delivery: deliveries.findById(delivery.id) ?? delivery,
        message: injectResult.message,
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
      return performRecordCodexRuntimeFailed(request);
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

      const runtime: ClaudeChannelRuntime = {
        agentName: request.agentName,
        endpoint: parsedEndpoint,
        registeredAt: options.now(),
        tokenHash: claudeTokenFingerprint(request.token),
      };
      claudeChannelRuntimes.set(request.agentName, runtime);
      claudeChannelBootFailures.delete(request.agentName);
      return { ok: true, runtime };
    },

    reportClaudeChannelBootFailure(request) {
      const pending = claudePendingTokens.get(request.agentName);
      if (!pending || pending.token !== request.token) {
        return {
          ok: false,
          reason: "claude_channel_boot_failure_report_rejected",
          detail: "unknown_token",
        };
      }
      if (request.reason !== "claude_channel_port_in_use") {
        return {
          ok: false,
          reason: "claude_channel_boot_failure_report_rejected",
          detail: "unsupported_reason",
        };
      }
      if (claudeChannelRuntimes.has(request.agentName)) {
        return { ok: true, agentName: request.agentName, recorded: false };
      }
      claudeChannelBootFailures.set(request.agentName, request.reason);
      return { ok: true, agentName: request.agentName, recorded: true };
    },

    disconnectClaudeChannel(request) {
      return performDisconnectClaudeChannel(request.agentName);
    },

    async receiveClaudeChannelMessage(request) {
      const agent = agents.findByName(request.agentName);
      const result = runSendMessageTransaction({
        sourceName: request.agentName,
        messageId: request.messageId,
        type: request.type ?? "question",
        intent: request.intent,
        replyExpected: request.replyExpected,
        content: request.content.text,
      });

      events.append({
        id: options.createId(),
        type: "claude_channel_message_received",
        data: {
          text: request.content.text,
          ...(result.ok ? { messageId: result.message.id } : {}),
        },
        createdAt: options.now(),
        agentId: agent?.id ?? null,
        messageId: result.ok ? result.message.id : null,
        deliveryId: null,
        routeId: null,
      });

      if (result.ok) {
        scheduleQueuedDeliveryExpiry(result.deliveries);
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
      const result = runReplyTransaction({
        sourceName: request.agentName,
        messageId: request.messageId,
        inReplyToDeliveryId: request.inReplyToDeliveryId,
        intent: request.intent,
        replyExpected: request.replyExpected,
        content: request.content.text,
      });

      events.append({
        id: options.createId(),
        type: "claude_channel_reply_received",
        data: {
          inReplyToDeliveryId: request.inReplyToDeliveryId,
          text: request.content.text,
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
      const agent = agents.findByName(request.agentName);
      if (had) {
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
      if (agent) {
        removeDepartedAgent(agent);
      }
      return { ok: true, agentName: request.agentName, disconnected: had || agent !== null };
    },

    async receiveCodexMessage(request) {
      const authz = authorizeCodexIngress(request.agentName, request.token);
      if (!authz.ok) {
        return authz.error;
      }
        const result = runSendMessageTransaction({
        sourceName: request.agentName,
        messageId: request.messageId,
          type: request.type ?? "question",
          intent: request.intent,
          replyExpected: request.replyExpected,
        content: request.content.text,
      });
      if (result.ok) {
        scheduleQueuedDeliveryExpiry(result.deliveries);
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
      const result = runReplyTransaction({
        sourceName: request.agentName,
        messageId: request.messageId,
        inReplyToDeliveryId: request.inReplyToDeliveryId,
        intent: request.intent,
        replyExpected: request.replyExpected,
        content: request.content.text,
      });
      if (result.ok) {
        events.append({
          id: options.createId(),
          type: "codex_ingress_reply_received",
          data: {
            messageId: result.message.id,
            inReplyToDeliveryId: request.inReplyToDeliveryId,
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

    listReachablePeers(request) {
      const source = agents.findByName(request.agentName);

      if (!source) {
        return {
          ok: false,
          reason: "source_agent_not_found",
          sourceName: request.agentName,
        };
      }

      const sourceRoutes = routes
        .list()
        .filter((route) => route.sourceAgentId === source.id);
      const targetAgentIds = new Set(
        sourceRoutes.map((route) => route.targetAgentId),
      );

      return {
        ok: true,
        peers: agents.list().filter((agent) => targetAgentIds.has(agent.id)),
      };
    },

    async stop(request) {
      const inFlightTargetFlushes = [...targetFlushes.values()];
      for (const handle of queueExpiryTimers.values()) {
        cancelTimeout(handle);
      }
      queueExpiryTimers.clear();
      for (const handle of preWriteRetryTimers.values()) {
        cancelTimeout(handle);
      }
      preWriteRetryTimers.clear();

      if (inFlightTargetFlushes.length > 0) {
        await Promise.allSettled(inFlightTargetFlushes);
      }

      const result = withTransaction(options.db, () => {
        const stoppedAgents = request.daemonOnly
          ? []
          : agents.removeAllConnected();
        if (!request.daemonOnly) {
          for (const agent of stoppedAgents) {
            routes.removeAllForAgent(agent.id);
            codexChannelRuntimes.delete(agent.name);
            codexPendingTokens.delete(agent.name);
            claudeChannelRuntimes.delete(agent.name);
            claudePendingTokens.delete(agent.name);
            claudeChannelBootFailures.delete(agent.name);
          }
        }
        return { ok: true as const, stoppedAgents };
      });

      await Promise.all(
        result.stoppedAgents.map(async (agent) => {
          const runtime = codexRuntimes.get(agent.name);
          if (!runtime) return;
          await disposeRuntime(runtime);
          codexRuntimes.delete(agent.name);
        }),
      );

      return result;
    },
  };

  function scheduleQueuedDeliveryExpiry(deliveriesToWatch: readonly StoredDelivery[]): void {
    for (const delivery of deliveriesToWatch) {
      if (delivery.status !== "queued" || queueExpiryTimers.has(delivery.id)) continue;
      const expiresAt = Date.parse(delivery.createdAt) + deliveryQueueTtlMs;
      const nowMs = Date.parse(options.now());
      if (!Number.isFinite(expiresAt) || !Number.isFinite(nowMs)) continue;
      const delayMs = Math.max(0, expiresAt - nowMs);
      const handle = scheduleTimeout(() => {
        queueExpiryTimers.delete(delivery.id);
        if (deliveries.findById(delivery.id)?.status !== "queued") return;
        const result = updateDeliveryStatusInTransaction({
          deliveryId: delivery.id,
          status: "failed",
          error: { reason: "delivery_expired", message: "delivery queue TTL expired" },
        });
        if (!result.ok) return;
        events.append({
          id: options.createId(),
          type: "delivery_expired",
          data: { reason: "delivery_expired" },
          createdAt: options.now(),
          agentId: delivery.targetAgentId,
          messageId: delivery.messageId,
          deliveryId: delivery.id,
          routeId: delivery.routeId,
        });
      }, delayMs);
      queueExpiryTimers.set(delivery.id, handle);
    }
  }

  function schedulePreWriteRetry(input: {
    sourceName: string;
    message: StoredMessage;
    delivery: StoredDelivery;
  }): void {
    const attempt = deliveryAttempts.get(input.delivery.id) ?? 1;
    const delayMs = retryDelayMs(attempt);
    if (delayMs === null) {
      return;
    }
    deliveryAttempts.set(input.delivery.id, attempt + 1);
    const handle = scheduleTimeout(() => {
      preWriteRetryTimers.delete(input.delivery.id);
      const previous = targetFlushes.get(input.delivery.targetAgentId) ?? Promise.resolve();
      const next = previous
        .catch(() => undefined)
        .then(async () => {
          if (deliveries.findById(input.delivery.id)?.status !== "queued") return;
          await dispatchToPairPeersNow({
            sourceName: input.sourceName,
            message: input.message,
            deliveries: [input.delivery],
          });
        });
      targetFlushes.set(input.delivery.targetAgentId, next);
      void next.finally(() => {
        if (targetFlushes.get(input.delivery.targetAgentId) === next) {
          targetFlushes.delete(input.delivery.targetAgentId);
        }
      });
    }, delayMs);
    preWriteRetryTimers.set(input.delivery.id, handle);
  }

  async function flushQueuedDeliveriesForTarget(targetAgent: StoredAgent): Promise<void> {
    const queued = deliveries
      .list()
      .filter((delivery) => delivery.targetAgentId === targetAgent.id && delivery.status === "queued");
    for (const delivery of queued) {
      const message = messages.findById(delivery.messageId);
      const source = message
        ? agents.list().find((agent) => agent.id === message.sourceAgentId)
        : undefined;
      if (!message || !source) continue;
      await dispatchToPairPeers({
        sourceName: source.name,
        message,
        deliveries: [delivery],
      });
    }
  }

  // `routes` deliberately has no foreign-key cascade, so every departure
  // must remove the live agent row and every incident route as one state
  // transition.
  // Keeping the two writes in one outer transaction prevents a failed route
  // cleanup from committing a deleted agent with orphaned routes.
  function removeDepartedAgent(agent: StoredAgent): void {
    withTransaction(options.db, () => {
      routes.removeAllForAgent(agent.id);
      agents.removeByName(agent.name);
    });
  }

  // Shared by the public `recordCodexRuntimeFailed` method and the
  // `onRuntimeFailed` callback wired into the production Codex attach factory
  // (see `attachCodexRuntime` call in `attachAgent`), so a managed Codex
  // runtime's own child-exit/WS-close detection reaches the same effect as an
  // explicit report.
  function performRecordCodexRuntimeFailed(
    request: RecordCodexRuntimeFailedRequest,
  ): RecordCodexRuntimeFailedResult {
    const agent = agents.findByName(request.agentName);

    if (!agent) {
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
    removeDepartedAgent(agent);
    events.append({
      id: options.createId(),
      type: "agent_runtime_failed",
      data: {
        reason: request.reason,
        ...(request.latestDiagnosticNotification
          ? {
              latestDiagnosticNotification: request.latestDiagnosticNotification,
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
  }

  // Shared by the public `disconnectClaudeChannel` method and
  // `injectMessageIntoClaudeTarget`'s confirmed-refusal branch (a registered
  // Claude channel endpoint that ECONNREFUSEs is treated the same as an
  // explicit disconnect request).
  function performDisconnectClaudeChannel(
    agentName: string,
  ): DisconnectClaudeChannelResult {
    const had = claudeChannelRuntimes.has(agentName);
    claudeChannelRuntimes.delete(agentName);
    claudePendingTokens.delete(agentName);
    claudeChannelBootFailures.delete(agentName);

    const agent = agents.findByName(agentName);
    const wasConnected = agent !== null;
    if (agent) {
      removeDepartedAgent(agent);
    }

    return {
      ok: true,
      agentName,
      disconnected: had || wasConnected,
    };
  }

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
      if (request.status !== "queued") {
        const handle = queueExpiryTimers.get(request.deliveryId);
        if (handle !== undefined) cancelTimeout(handle);
        queueExpiryTimers.delete(request.deliveryId);
      }
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

  // Records the daemon-authored source outcome notification for a primary delivery.
  // State transition and notification dedupe are separate concerns: the caller performs
  // the original delivery's status transition (and its own delivery_status_changed event)
  // before calling this; this function only decides, independently, whether a new
  // notification is warranted for (original delivery, outcome type). A rejected notification
  // attempt must never suppress the original transition, which has already committed by
  // the time this runs.
  function recordPrimaryOutcomeNotification(input: {
    message: StoredMessage;
    original: StoredDelivery;
    outcomeType: DeliveryOutcomeType;
    error: { reason: string; message: string };
    now: string;
  }): { message: StoredMessage; delivery: StoredDelivery } | null {
    // Non-recursion: a failure of the notification's own delivery must never author another outcome.
    if (input.message.intent === "notification") return null;
    if (
      deliveries.findOutcomeNotificationByOriginalDeliveryIdAndType(
        input.original.id,
        input.outcomeType,
      )
    ) {
      return null;
    }

    const notificationMessageId = createPublicMessageId();
    const notificationDeliveryId = createPublicDeliveryId();
    const notification = messages.create({
      id: notificationMessageId,
      sourceAgentId: daemonMessageSourceAgentId,
      originKind: "daemon",
      type: "event",
      intent: "notification",
      replyExpected: false,
      outcomeForDeliveryId: input.original.id,
      content: JSON.stringify({
        type: input.outcomeType,
        deliveryId: notificationDeliveryId,
        outcomeForDeliveryId: input.original.id,
        message: outcomeGuidance[input.outcomeType],
        error: input.error,
      }),
      now: input.now,
    });
    const queued = deliveries.createQueuedForRoutes({
      messageId: notification.id,
      routes: [{ id: null, targetAgentId: input.message.sourceAgentId }],
      createDeliveryId: () => notificationDeliveryId,
      now: input.now,
    });
    if (!Array.isArray(queued) || queued.length !== 1) {
      throw new Error("failed to create outcome notification delivery");
    }
    deliveries.createOutcomeNotification({
      originalDeliveryId: input.original.id,
      outcomeType: input.outcomeType,
      notificationMessageId: notification.id,
      notificationDeliveryId: queued[0].id,
      createdAt: input.now,
    });
    return { message: notification, delivery: queued[0] };
  }

  // Shared primary-reject core for both target adapters: atomically transitions the
  // original delivery to `failed` and emits its status-changed and delivery_target_rejected
  // events in one transaction, then independently attempts the `delivery_target_rejected`
  // outcome notification in a second transaction. The two are kept in separate transactions
  // so a thrown DB exception while persisting the notification can never roll back the
  // already-committed original-delivery transition; see
  // docs/decisions/delivery-outcome-notification-dedupe-by-type.md's rejected
  // single-transaction alternative.
  //
  // The second transaction's exceptions are additionally caught here and treated as "no
  // notification produced" (same `null` the caller already tolerates for dedupe/non-recursion
  // suppression). This function is invoked synchronously from the Codex late-response
  // WebSocket observer (src/adapters/codex/websocket.ts's `settleResponse`, called directly
  // from the `message` event handler), which has no promise wrapper to catch a throw; an
  // uncaught exception there would escape the WebSocket handler itself, not just this
  // function's caller. The codebase has no logging/diagnostic infrastructure (no
  // console/logger calls, no process-level error handlers) and no event type for an internal
  // persistence failure; this mirrors the existing silent-isolation precedent used for other
  // background-path failures in this file (e.g. `dispatchOutcomeNotification(...).catch(() =>
  // undefined)`). The original delivery's `failed` transition and its two events are
  // unaffected either way, since they already committed in the first transaction.
  function recordPrimaryTargetRejectOutcome(input: {
    message: StoredMessage;
    delivery: StoredDelivery;
    expectedStatus: "delivering" | "unconfirmed";
    reason: string;
    errorMessage: string;
    rejectEventData: Record<string, unknown>;
    rejectEventAgentId: string;
  }): { message: StoredMessage; delivery: StoredDelivery } | null {
    const transitioned = withTransaction(options.db, () => {
      const original = deliveries.findById(input.delivery.id);
      if (!original || original.status !== input.expectedStatus) return null;

      const now = options.now();
      const failed = deliveries.updateStatus({
        id: original.id,
        status: "failed",
        now,
      });
      if (!failed) return null;

      events.append({
        id: options.createId(),
        type: "delivery_status_changed",
        data: {
          status: "failed",
          error: { reason: input.reason, message: input.errorMessage },
        },
        createdAt: now,
        agentId: original.targetAgentId,
        messageId: original.messageId,
        deliveryId: original.id,
        routeId: original.routeId,
      });
      events.append({
        id: options.createId(),
        type: "delivery_target_rejected",
        data: input.rejectEventData,
        createdAt: now,
        agentId: input.rejectEventAgentId,
        messageId: input.message.id,
        deliveryId: original.id,
        routeId: original.routeId,
      });

      return { original: failed, now };
    });

    if (!transitioned) return null;

    try {
      return withTransaction(options.db, () =>
        recordPrimaryOutcomeNotification({
          message: input.message,
          original: transitioned.original,
          outcomeType: "delivery_target_rejected",
          error: { reason: input.reason, message: input.errorMessage },
          now: transitioned.now,
        }),
      );
    } catch {
      return null;
    }
  }

  function recordCodexTargetRejectOutcome(input: {
    message: StoredMessage;
    delivery: StoredDelivery;
    target: { agentId: string; agentName: string; threadId: string };
    expectedStatus: "delivering" | "unconfirmed";
    code?: number;
    messageText: string;
  }): { message: StoredMessage; delivery: StoredDelivery } | null {
    return recordPrimaryTargetRejectOutcome({
      message: input.message,
      delivery: input.delivery,
      expectedStatus: input.expectedStatus,
      reason: "codex_jsonrpc_error",
      errorMessage: input.messageText,
      rejectEventAgentId: input.target.agentId,
      rejectEventData: {
        adapter: "codex",
        target: input.target,
        jsonRpc: { code: input.code ?? null, message: input.messageText },
        attempt: 1,
      },
    });
  }

  function recordClaudeTargetRejectOutcome(input: {
    message: StoredMessage;
    delivery: StoredDelivery;
    target: { agentId: string; agentName: string };
    expectedStatus: "delivering";
    messageText: string;
  }): { message: StoredMessage; delivery: StoredDelivery } | null {
    return recordPrimaryTargetRejectOutcome({
      message: input.message,
      delivery: input.delivery,
      expectedStatus: input.expectedStatus,
      reason: "claude_channel_push_failed",
      errorMessage: input.messageText,
      rejectEventAgentId: input.target.agentId,
      rejectEventData: {
        adapter: "claude",
        target: input.target,
        reason: "claude_channel_push_failed",
        message: input.messageText,
        attempt: 1,
      },
    });
  }

  // Independent, adapter-neutral producer for the `delivery_unconfirmed` outcome. Called
  // after the original delivery has already transitioned to `unconfirmed` (its own
  // status-changed event already recorded by the caller); only attempts the notification.
  function recordPrimaryUnconfirmedOutcome(input: {
    message: StoredMessage;
    deliveryId: string;
    reason: string;
    errorMessage: string;
  }): { message: StoredMessage; delivery: StoredDelivery } | null {
    return withTransaction(options.db, () => {
      const original = deliveries.findById(input.deliveryId);
      if (!original || original.status !== "unconfirmed") return null;

      return recordPrimaryOutcomeNotification({
        message: input.message,
        original,
        outcomeType: "delivery_unconfirmed",
        error: { reason: input.reason, message: input.errorMessage },
        now: options.now(),
      });
    });
  }

  async function dispatchOutcomeNotification(input: {
    message: StoredMessage;
    delivery: StoredDelivery;
  }): Promise<void> {
    await dispatchToPairPeers({
      sourceName: "daemon",
      message: input.message,
      deliveries: [input.delivery],
    });
  }

  async function dispatchToPairPeers(input: {
    sourceName: string;
    message: StoredMessage;
    deliveries: StoredDelivery[];
  }): Promise<DispatchSummary> {
    const summary = emptyDispatchSummary();
    await Promise.all(
      input.deliveries.map(async (delivery) => {
        const previous = targetFlushes.get(delivery.targetAgentId) ?? Promise.resolve();
        const next = previous.catch(() => undefined).then(() =>
          dispatchToPairPeersNow({
            sourceName: input.sourceName,
            message: input.message,
            deliveries: [delivery],
          }),
        );
        const chain = next.then(() => undefined);
        targetFlushes.set(delivery.targetAgentId, chain);
        const targetSummary = await next;
        summary.delivered += targetSummary.delivered;
        summary.deferred.push(...targetSummary.deferred);
        summary.failed.push(...targetSummary.failed);
        if (targetFlushes.get(delivery.targetAgentId) === chain) {
          targetFlushes.delete(delivery.targetAgentId);
        }
      }),
    );
    return summary;
  }

  async function dispatchToPairPeersNow(input: {
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
          ...("cause" in injectResult &&
          injectResult.cause === "claude_channel_port_in_use"
            ? { cause: injectResult.cause }
            : {}),
          ...(injectResult.eligibility
            ? { eligibility: injectResult.eligibility }
            : {}),
        });
        schedulePreWriteRetry({
          sourceName: input.sourceName,
          message: input.message,
          delivery,
        });
        continue;
      }

      if (
        injectResult.reason === "codex_turn_start_timeout" ||
        injectResult.reason === "codex_app_server_ws_dropped" ||
        injectResult.reason === "claude_channel_push_unconfirmed"
      ) {
        updateDeliveryStatusInTransaction({
          deliveryId: delivery.id,
          status: "unconfirmed",
          error: { reason: injectResult.reason, message: injectResult.message },
        });
        const outcome = recordPrimaryUnconfirmedOutcome({
          message: input.message,
          deliveryId: delivery.id,
          reason: injectResult.reason,
          errorMessage: injectResult.message,
        });
        if (outcome) await dispatchOutcomeNotification(outcome);
        summary.failed.push({
          targetAgentId: targetAgent.id,
          reason: injectResult.reason,
        });
        continue;
      }

      if ("outcomeRecorded" in injectResult && injectResult.outcomeRecorded) {
        summary.failed.push({
          targetAgentId: targetAgent.id,
          reason: injectResult.reason,
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
    injectionOptions: { transitionToDelivering?: boolean } = {},
  ): Promise<
    | { kind: "success" }
    | {
        kind: "failed";
        reason: AdapterInjectFailureReason;
        message: string;
        outcomeRecorded?: boolean;
      }
    | {
        kind: "deferred";
        reason: AdapterInjectDeferredReason;
        cause?: ClaudeChannelBootFailureCause;
        eligibility: string;
      }
  > {
    if (!claudeChannelRuntimes.has(targetAgent.name)) {
      const cause = claudeChannelBootFailures.get(targetAgent.name);
      return {
        kind: "deferred",
        reason: "target_runtime_unavailable",
        ...(cause ? { cause } : {}),
        eligibility: "requires target claude channel runtime",
      };
    }

    // Captured before the async push so a confirmed-refusal result (below) can be
    // checked for identity against whatever is registered by the time the push
    // settles. Push is async: a same-name `registerClaudeChannel` can replace this
    // entry while the fetch is in flight, and that replacement must not be
    // clobbered by a disconnect meant for the runtime instance we actually pushed to.
    const runtimeAtDispatch = claudeChannelRuntimes.get(targetAgent.name);

    if (injectionOptions.transitionToDelivering !== false) {
      updateDeliveryStatusInTransaction({
        deliveryId: delivery.id,
        status: "delivering",
      });
    }

    const injectResult = await injectClaudeChannel(
      { getRuntime: (agentName) => claudeChannelRuntimes.get(agentName) },
      {
        agentName: targetAgent.name,
        content: formatAioxChannelEnvelope({
          message: input.message,
          delivery,
          sourceAgent: agents
            .list()
            .find((agent) => agent.id === input.message.sourceAgentId),
          targetAgent,
        }),
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
      // ECONNREFUSED against a runtime this function already confirmed was
      // registered (the `.has()` guard above) means the registered endpoint is
      // confirmed dead, not merely unregistered -- unlike the deferred branch
      // above, which fires before any registration is known to exist. Mirror
      // `disconnectClaudeChannel`'s effect for it, but only when: (a) this is the
      // daemon's own dispatch judgment about a target's live status, not an
      // operator-triggered manual retransmit probe, which is deliberately
      // attempt-local and must not mutate global registration/connection state
      // (see the sibling `claude_channel_push_failed` branch below, gated the
      // same way); and (b) the runtime instance we pushed to is still the one
      // registered now -- if a same-name `registerClaudeChannel` replaced it
      // while this push was in flight, leave that replacement alone.
      if (
        injectionOptions.transitionToDelivering !== false &&
        runtimeAtDispatch !== undefined &&
        claudeChannelRuntimes.get(targetAgent.name) === runtimeAtDispatch
      ) {
        performDisconnectClaudeChannel(targetAgent.name);
      }

      return {
        kind: "deferred",
        reason: "target_runtime_unavailable",
        eligibility: "requires target claude channel runtime",
      };
    }

    if (
      injectionOptions.transitionToDelivering !== false &&
      injectResult.reason === "claude_channel_push_failed"
    ) {
      const outcome = recordClaudeTargetRejectOutcome({
        message: input.message,
        delivery,
        target: { agentId: targetAgent.id, agentName: targetAgent.name },
        expectedStatus: "delivering",
        messageText: injectResult.message,
      });
      if (outcome) await dispatchOutcomeNotification(outcome);
      // `outcomeRecorded` marks that the reject core already performed the original
      // delivery's status transition and its events, mirroring recordCodexTargetRejectOutcome's
      // caller. It must be set regardless of whether `outcome` itself is non-null: a null
      // `outcome` here means the notification was independently suppressed (dedupe or
      // non-recursion), not that the transition didn't happen. Otherwise dispatchToPairPeersNow's
      // generic failed-branch fallback would redundantly re-run the status transition and append
      // a duplicate delivery_status_changed event for the same delivery.
      return {
        kind: "failed",
        reason: injectResult.reason,
        message: injectResult.message,
        outcomeRecorded: true,
      };
    }

    return {
      kind: "failed",
      reason: injectResult.reason,
      message: injectResult.message,
    };
  }

  async function retransmitClaudeUnconfirmedDelivery(
    message: StoredMessage,
    delivery: StoredDelivery,
    targetAgent: StoredAgent,
  ): Promise<RetransmitUnconfirmedDeliveryResult> {
    if (!claudeChannelRuntimes.has(targetAgent.name)) {
      return {
        ok: false,
        reason: "manual_retransmit_failed",
        delivery,
        message: "ready Claude channel runtime is required for manual retransmit",
      };
    }

    const sourceAgent = agents.list().find((agent) => agent.id === message.sourceAgentId);
    const injectResult = await injectMessageIntoClaudeTarget(
      { sourceName: sourceAgent?.name ?? "unknown", message },
      delivery,
      targetAgent,
      { transitionToDelivering: false },
    );

    if (injectResult.kind === "deferred") {
      return {
        ok: false,
        reason: "manual_retransmit_failed",
        delivery: deliveries.findById(delivery.id) ?? delivery,
        message: "Claude direct write could not be started",
      };
    }

    const attempt = (manualDeliveryAttempts.get(delivery.id) ?? 0) + 1;
    manualDeliveryAttempts.set(delivery.id, attempt);
    events.append({
      id: options.createId(),
      type: "delivery_manual_retransmit",
      data: { actor: "operator", attempt, confirmDuplicateRisk: true },
      createdAt: options.now(),
      agentId: targetAgent.id,
      messageId: message.id,
      deliveryId: delivery.id,
      routeId: delivery.routeId,
    });

    if (injectResult.kind === "success") {
      const result = updateDeliveryStatusInTransaction({
        deliveryId: delivery.id,
        status: "delivered",
      });
      events.append({
        id: options.createId(),
        type: "delivery_manual_retransmit_delivered",
        data: { actor: "operator", attempt },
        createdAt: options.now(),
        agentId: targetAgent.id,
        messageId: message.id,
        deliveryId: delivery.id,
        routeId: delivery.routeId,
      });
      return result.ok
        ? result
        : { ok: false, reason: "delivery_not_found", deliveryId: delivery.id };
    }

    const rejected = injectResult.reason === "claude_channel_push_failed";
    events.append({
      id: options.createId(),
      type: rejected
        ? "delivery_manual_retransmit_rejected"
        : "delivery_manual_retransmit_unconfirmed",
      data: {
        actor: "operator",
        attempt,
        adapter: "claude",
        reason: injectResult.reason,
        message: injectResult.message,
      },
      createdAt: options.now(),
      agentId: targetAgent.id,
      messageId: message.id,
      deliveryId: delivery.id,
      routeId: delivery.routeId,
    });
    return {
      ok: false,
      reason: rejected ? "manual_retransmit_rejected" : "manual_retransmit_unconfirmed",
      delivery: deliveries.findById(delivery.id) ?? delivery,
      message: injectResult.message,
    };
  }

  async function injectMessageIntoCodexTarget(
    message: StoredMessage,
    delivery: StoredDelivery,
    targetAgent: StoredAgent,
    injectionOptions: {
      transitionToDelivering?: boolean;
      manualAttempt?: { attempt: number };
      resolvedTarget?: {
        ok: true;
        runtime: ResolvedCodexTurnStartRuntime;
        threadId: string;
        loadedThreadIds: string[];
        runtimeActiveThreadId: string | null;
        selectionPolicy: "proxy_active_thread";
      };
    } = {},
  ): Promise<
    | { kind: "success" }
    | {
        kind: "failed";
        reason: AdapterInjectFailureReason;
        message: string;
        jsonRpcCode?: number;
        requestId?: number;
        outcomeRecorded?: boolean;
      }
    | {
        kind: "deferred";
        reason: AdapterInjectDeferredReason;
        eligibility: string;
      }
  > {
    const sourceAgent = agents.list().find((agent) => agent.id === message.sourceAgentId);
    const runtime = codexRuntimes.get(targetAgent.name);
    const target = injectionOptions.resolvedTarget ?? (await resolveCodexReplyTarget(runtime));

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

    if (injectionOptions.transitionToDelivering !== false) {
      updateDeliveryStatusInTransaction({
        deliveryId: delivery.id,
        status: "delivering",
      });
    }

    // A manual retransmit attempt reject is attempt-local: it must never mark the
    // original delivery `failed` and must never emit `delivery_target_rejected`.
    const appendManualRetransmitTerminal = (input: {
      type: "delivery_manual_retransmit_delivered" | "delivery_manual_retransmit_rejected";
      reason: string;
      message: string;
      code?: number;
      requestId?: number;
    }) => {
      events.append({
        id: options.createId(),
        type: input.type,
        data: {
          actor: "operator",
          attempt: injectionOptions.manualAttempt?.attempt ?? null,
          requestId: input.requestId ?? null,
          adapter: "codex",
          code: input.code ?? null,
          reason: input.reason,
          message: input.message,
        },
        createdAt: options.now(),
        agentId: targetAgent.id,
        messageId: message.id,
        deliveryId: delivery.id,
        routeId: delivery.routeId,
      });
    };

    let manualLateResolved = false;
    const injectResult = await injectReplyIntoCodexRuntime(
      target.runtime,
      target.threadId,
      formatAioxChannelEnvelope({
        message,
        delivery,
        sourceAgent,
        targetAgent,
      }),
      (lateResult) => {
        if (injectionOptions.manualAttempt) {
          if (manualLateResolved) return;
          if (deliveries.findById(delivery.id)?.status !== "unconfirmed") {
            manualLateResolved = true;
            return;
          }
          if (lateResult.kind === "success") {
            manualLateResolved = true;
            updateDeliveryStatusInTransaction({ deliveryId: delivery.id, status: "delivered" });
            appendManualRetransmitTerminal({
              type: "delivery_manual_retransmit_delivered",
              reason: "codex_turn_start_accepted",
              message: "late turn/start accepted",
            });
            return;
          }
          if (lateResult.kind === "failed" && lateResult.reason === "codex_jsonrpc_error") {
            manualLateResolved = true;
            appendManualRetransmitTerminal({
              type: "delivery_manual_retransmit_rejected",
              reason: lateResult.reason,
              message: lateResult.message,
              code: lateResult.jsonRpcCode,
              requestId: lateResult.requestId,
            });
          }
          return;
        }

        if (deliveries.findById(delivery.id)?.status !== "unconfirmed") return;

        if (lateResult.kind === "success") {
          updateDeliveryStatusInTransaction({ deliveryId: delivery.id, status: "delivered" });
          return;
        }

        if (lateResult.kind === "failed" && lateResult.reason === "codex_jsonrpc_error") {
          const outcome = recordCodexTargetRejectOutcome({
            message,
            delivery,
            target: {
              agentId: targetAgent.id,
              agentName: targetAgent.name,
              threadId: target.threadId,
            },
            expectedStatus: "unconfirmed",
            code: lateResult.jsonRpcCode,
            messageText: lateResult.message,
          });
          if (outcome) {
            void dispatchOutcomeNotification(outcome).catch(() => undefined);
          }
        }
      },
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
      if (!injectionOptions.manualAttempt && injectResult.reason === "codex_jsonrpc_error") {
        const outcome = recordCodexTargetRejectOutcome({
          message,
          delivery,
          target: {
            agentId: targetAgent.id,
            agentName: targetAgent.name,
            threadId: target.threadId,
          },
          expectedStatus: "delivering",
          code: injectResult.jsonRpcCode,
          messageText: injectResult.message,
        });
        if (outcome) await dispatchOutcomeNotification(outcome);
        return {
          kind: "failed",
          reason: injectResult.reason,
          message: injectResult.message,
          jsonRpcCode: injectResult.jsonRpcCode,
          requestId: injectResult.requestId,
          outcomeRecorded: true,
        };
      }
      return {
        kind: "failed",
        reason: injectResult.reason,
        message: injectResult.message,
        jsonRpcCode: injectResult.jsonRpcCode,
        requestId: injectResult.requestId,
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
      void flushQueuedDeliveriesForTarget(targetAgent).catch(() => undefined);
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
    const reboundAgent = agents.findByName(agentName);
    if (reboundAgent) {
      void flushQueuedDeliveriesForTarget(reboundAgent).catch(() => undefined);
    }
  }

  async function injectReplyIntoCodexRuntime(
    runtime: CodexTurnStartRuntime,
    threadId: string,
    content: string,
    onLateResponse?: (result: Awaited<ReturnType<typeof injectTurnStart>>) => void,
  ): Promise<
    | { kind: "success" }
    | {
        kind: "failed";
        reason: AdapterInjectFailureReason;
        message: string;
        jsonRpcCode?: number;
        requestId?: number;
      }
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
        onLateResponse,
      },
    );
  }

  function formatAioxChannelEnvelope(input: {
    message: StoredMessage;
    delivery: StoredDelivery;
    sourceAgent: StoredAgent | undefined;
    targetAgent: StoredAgent;
  }): string {
    return JSON.stringify({
      protocol: "aiox.message.v1",
      messageId: input.message.id,
      deliveryId: input.delivery.id,
      source: {
        kind: input.message.originKind,
        address:
          input.message.originKind === "daemon"
            ? `daemon://local/${profile}`
            : `agent://local/${profile}/${input.sourceAgent?.name ?? "unknown"}`,
      },
      target: {
        address: `agent://local/${profile}/${input.targetAgent.name}`,
      },
      type: input.message.type,
      intent: input.message.intent,
      replyExpected: input.message.replyExpected,
      content: { mediaType: "text/plain", text: input.message.content },
      createdAt: input.message.createdAt,
      ...(input.message.type === "reply" && input.message.parentMessageId
        ? { inReplyToDeliveryId: input.message.parentMessageId }
        : {}),
      ...(input.message.outcomeForDeliveryId
        ? { outcomeForDeliveryId: input.message.outcomeForDeliveryId }
        : {}),
    });
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
    if (!agent) {
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

        const queuedByTarget = new Map<string, number>();
        for (const delivery of deliveries.list()) {
          if (delivery.status !== "queued") continue;
          queuedByTarget.set(
            delivery.targetAgentId,
            (queuedByTarget.get(delivery.targetAgentId) ?? 0) + 1,
          );
        }
        if (
          !canAcceptFanoutIntoTargetQueues({
            queuedByTarget,
            targetAgentIds: sourceRoutes.map((route) => route.targetAgentId),
          })
        ) {
          return {
            ok: false,
            reason: "delivery_queue_full",
            targetAgentIds: sourceRoutes.map((route) => route.targetAgentId),
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
              intent: request.intent,
              replyExpected: request.replyExpected,
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
          createDeliveryId: createPublicDeliveryId,
          now,
        });

        if (!Array.isArray(queued)) {
          throw createSendMessageRollback(queued);
        }

        if (message.replyExpected === true) {
          for (const delivery of queued) {
            replyRights.grant({ originatingDeliveryId: delivery.id, now });
          }
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

  function runReplyTransaction(input: {
    sourceName: string;
    messageId: string;
    inReplyToDeliveryId: string | undefined;
    intent?: AgentAuthoredIntent;
    replyExpected?: boolean;
    content: string;
  }): SendMessageResult {
    try {
      return withTransaction(options.db, () => {
      const source = agents.findByName(input.sourceName);
      if (!source) {
        return { ok: false, reason: "source_agent_not_found", sourceName: input.sourceName };
      }
      const originatingDelivery = input.inReplyToDeliveryId
        ? deliveries.findById(input.inReplyToDeliveryId)
        : null;
      if (!originatingDelivery) return { ok: false, reason: "unknown_delivery" };
      if (originatingDelivery.targetAgentId !== source.id) {
        return { ok: false, reason: "correlation_mismatch" };
      }
      const originatingMessage = messages.findById(originatingDelivery.messageId);
      if (originatingMessage?.replyExpected !== true) {
        return { ok: false, reason: "reply_not_expected" };
      }
      const replyRight = replyRights.findByOriginatingDeliveryId(originatingDelivery.id);
      if (!replyRight) return { ok: false, reason: "duplicate_reply" };
      if (replyRight.consumedReplyMessageId) {
        return { ok: false, reason: "duplicate_reply" };
      }
      const originalSource = agents.list().find((agent) => agent.id === originatingMessage.sourceAgentId);
      if (!originalSource) {
        return { ok: false, reason: "correlation_mismatch" };
      }
      const now = options.now();
      let message: StoredMessage;
      try {
        message = messages.create({
          id: input.messageId,
          sourceAgentId: source.id,
          parentMessageId: originatingDelivery.id,
          type: "reply",
          intent: input.intent,
          replyExpected: input.replyExpected,
          content: input.content,
          now,
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          throw createSendMessageRollback({ ok: false, reason: "duplicate_reply" });
        }
        throw error;
      }
      const queued = deliveries.createQueuedForRoutes({
        messageId: message.id,
        routes: [{ id: null, targetAgentId: originalSource.id }],
        createDeliveryId: createPublicDeliveryId,
        now,
      });
      if (!Array.isArray(queued)) {
        throw createSendMessageRollback(queued);
      }
      const replyDelivery = queued[0];
      if (!replyDelivery || !replyRights.consume({
        originatingDeliveryId: originatingDelivery.id,
        replyMessageId: message.id,
        replyDeliveryId: replyDelivery.id,
        now,
      })) {
        throw createSendMessageRollback({ ok: false, reason: "duplicate_reply" });
      }
      if (message.replyExpected === true) {
        replyRights.grant({ originatingDeliveryId: replyDelivery.id, now });
      }
      events.append({
        id: options.createId(), type: "message_created", data: {}, createdAt: now,
        agentId: source.id, messageId: message.id, deliveryId: null, routeId: null,
      });
      events.append({
        id: options.createId(), type: "delivery_queued", data: {}, createdAt: now,
        agentId: null, messageId: message.id, deliveryId: replyDelivery.id, routeId: null,
      });
        return { ok: true, message, deliveries: queued, dispatch: emptyDispatchSummary() };
      });
    } catch (error) {
      if (isSendMessageRollback(error)) return error.response;
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

    if (!agent) {
      return {
        ok: true,
        agentName: input.agentName,
        detached: false,
      };
    }

    let runtimeDisposeError: string | undefined;
    const runtime = codexRuntimes?.get(input.agentName);
    if (runtime) {
      runtimeDisposeError = await disposeRuntime(runtime);
      codexRuntimes?.delete(input.agentName);
    }

    codexChannelRuntimes.delete(input.agentName);
    codexPendingTokens.delete(input.agentName);
    claudeChannelRuntimes.delete(input.agentName);
    claudePendingTokens.delete(input.agentName);
    claudeChannelBootFailures.delete(input.agentName);

    const now = options.now();
    removeDepartedAgent(agent);
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
      ...(runtimeDisposeError === undefined ? {} : { runtimeDisposeError }),
    };
  }
}

/**
 * Disposes a runtime without letting its failure abort the surrounding cleanup,
 * and returns the failure instead of discarding it. Callers that can report the
 * failure to their own caller (detach, and the eager/resume attach failure
 * path) do so; callers on an error path that is already reporting something
 * else (the global `stop()` sweep) ignore the return.
 */
async function disposeRuntime(runtime: ManagedAgentRuntime): Promise<string | undefined> {
  try {
    await runtime.dispose();
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
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

type SendMessageRollbackResponse = Extract<SendMessageResult, { ok: false }>;

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
  onRuntimeFailed?: (failure: RecordCodexRuntimeFailedRequest) => void;
}): Promise<ManagedCodexAgentRuntime> {
  return attachCodexAgentRuntime({
    agentName: request.agentName,
    activeThreadId: request.activeThreadId,
    onRuntimeFailed: request.onRuntimeFailed,
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
  request: ConnectRequest,
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
