import type {
  AttachAgentRequest,
  AttachAgentResult,
  ConnectRequest,
  ConnectResult,
  CreatePairRequest,
  CreatePairResult,
  DaemonState,
  DetachAgentRequest,
  DetachAgentResult,
  DisconnectClaudeChannelRequest,
  DisconnectClaudeChannelResult,
  DisconnectCodexChannelRequest,
  DisconnectCodexChannelResult,
  DispatchSummary,
  ListReachablePeersRequest,
  ListReachablePeersResult,
  NotifyTuiExitedRequest,
  NotifyTuiExitedResult,
  ReceiveClaudeChannelMessageRequest,
  ReceiveClaudeChannelMessageResult,
  ReceiveClaudeChannelReplyRequest,
  ReceiveCodexMessageRequest,
  ReceiveCodexMessageResult,
  ReceiveCodexReplyRequest,
  ReportClaudeChannelBootFailureRequest,
  ReportClaudeChannelBootFailureResult,
  RetransmitUnconfirmedDeliveryRequest,
  RetransmitUnconfirmedDeliveryResult,
  RegisterClaudeChannelRequest,
  RegisterClaudeChannelResult,
  RegisterCodexChannelRequest,
  RegisterCodexChannelResult,
  SendMessageRequest,
  SendMessageResult,
  SyncHostEffectiveRoutesRequest,
  SyncHostEffectiveRoutesResult,
  StatusResult,
  StopRequest,
  StopResult,
  UpdateDeliveryStatusRequest,
  UpdateDeliveryStatusResult,
} from "./state.js";
import type {
  AcknowledgeHostAgentSignalDeliveryRequest,
  AcknowledgeHostAgentSignalDeliveryResult,
  ClaimHostControlRequestRequest,
  ClaimHostControlRequestResult,
  CompleteHostControlRequestRequest,
  CompleteHostControlRequestResult,
  CompleteTerminateAllAndUnregisterHostRequest,
  CompleteTerminateAllAndUnregisterHostResult,
  HostAgentSelector,
  HostAgentTransitionResult,
  LookupRunningHostRequest,
  MarkHostAgentReadyRequest,
  LookupRunningHostResult,
  RegisterHostAgentRequest,
  RegisterHostAgentResult,
  RegisterRunningHostRequest,
  RegisterRunningHostResult,
  RequestHostAgentTerminationRequest,
  RequestHostAgentTerminationResult,
  SubmitHostControlRequest,
  SubmitHostControlRequestResult,
  TakeHostControlRequestResultResult,
  UnregisterRunningHostRequest,
  UnregisterRunningHostResult,
} from "./host-runtime.js";
import type { AgentInstanceStatus, AgentKind } from "../core/agents.js";
import type { MessageDeliveryStatus } from "../core/deliveries.js";
import type {
  HostAgentStatus,
  HostControlRequestKind,
  HostControlRequestStatus,
} from "../core/hosts.js";
import type { MessageType } from "../core/messages.js";
import type { PairSlot, PairStatus } from "../core/pairs.js";
import type { StoredAgent } from "../store/repositories/agents.js";
import type { StoredDelivery } from "../store/repositories/deliveries.js";
import type { StoredHostAgent } from "../store/repositories/host-agents.js";
import type { StoredHostControlRequest } from "../store/repositories/host-control-requests.js";
import type { StoredRunningHost } from "../store/repositories/running-hosts.js";
import type { StoredMessage } from "../store/repositories/messages.js";
import type { StoredRoute } from "../store/repositories/routes.js";

export interface DaemonApi {
  attachAgent(request: AttachAgentRequest): Promise<AttachAgentResponse>;
  createPair(request: CreatePairRequest): CreatePairResponse;
  connect(request: ConnectRequest): ConnectResponse;
  syncHostEffectiveRoutes(
    request: SyncHostEffectiveRoutesRequest,
  ): SyncHostEffectiveRoutesResponse;
  sendMessage(request: SendMessageRequest): SendMessageResponse;
  updateDeliveryStatus(request: UpdateDeliveryStatusRequest): UpdateDeliveryStatusResponse;
  retransmitUnconfirmedDelivery(
    request: RetransmitUnconfirmedDeliveryRequest,
  ): Promise<RetransmitUnconfirmedDeliveryResponse>;
  detachAgent(request: DetachAgentRequest): Promise<DetachAgentResponse>;
  notifyTuiExited(request: NotifyTuiExitedRequest): Promise<NotifyTuiExitedResponse>;
  registerClaudeChannel(
    request: RegisterClaudeChannelRequest,
  ): Promise<RegisterClaudeChannelResponse>;
  reportClaudeChannelBootFailure(
    request: ReportClaudeChannelBootFailureRequest,
  ): Promise<ReportClaudeChannelBootFailureResult>;
  disconnectClaudeChannel(
    request: DisconnectClaudeChannelRequest,
  ): Promise<DisconnectClaudeChannelResponse>;
  receiveClaudeChannelMessage(
    request: ReceiveClaudeChannelMessageRequest,
  ): Promise<ReceiveClaudeChannelMessageResponse>;
  receiveClaudeChannelReply(
    request: ReceiveClaudeChannelReplyRequest,
  ): Promise<ReceiveClaudeChannelReplyResponse>;
  registerCodexChannel(
    request: RegisterCodexChannelRequest,
  ): Promise<RegisterCodexChannelResponse>;
  disconnectCodexChannel(
    request: DisconnectCodexChannelRequest,
  ): Promise<DisconnectCodexChannelResponse>;
  receiveCodexMessage(
    request: ReceiveCodexMessageRequest,
  ): Promise<ReceiveCodexMessageResponse>;
  receiveCodexReply(
    request: ReceiveCodexReplyRequest,
  ): Promise<ReceiveCodexMessageResponse>;
  status(): StatusResponse;
  listReachablePeers(request: ListReachablePeersRequest): ListReachablePeersResponse;
  stop(request: StopRequest): Promise<StopResponse>;
  // Running-host runtime. Every method is reachable through the existing daemon
  // socket, which is what lets another shell's CLI find a running host and relay
  // a host command to its foreground controller without a second transport.
  registerRunningHost(request: RegisterRunningHostRequest): RegisterRunningHostResponse;
  lookupRunningHost(request: LookupRunningHostRequest): LookupRunningHostResponse;
  listRunningHosts(): ListRunningHostsResponse;
  unregisterRunningHost(
    request: UnregisterRunningHostRequest,
  ): UnregisterRunningHostResponse;
  completeTerminateAllAndUnregisterHost(
    request: CompleteTerminateAllAndUnregisterHostRequest,
  ): CompleteTerminateAllAndUnregisterHostResponse;
  registerHostAgent(request: RegisterHostAgentRequest): RegisterHostAgentResponse;
  markHostAgentReady(request: MarkHostAgentReadyRequest): HostAgentTransitionResponse;
  requestHostAgentTermination(
    request: RequestHostAgentTerminationRequest,
  ): RequestHostAgentTerminationResponse;
  acknowledgeHostAgentSignalDelivery(
    request: AcknowledgeHostAgentSignalDeliveryRequest,
  ): AcknowledgeHostAgentSignalDeliveryResponse;
  detachHostAgent(request: HostAgentSelector): HostAgentTransitionResponse;
  listHostAgents(request: { hostId: string }): ListHostAgentsResponse;
  submitHostControlRequest(
    request: SubmitHostControlRequest,
  ): SubmitHostControlRequestResponse;
  claimHostControlRequest(
    request: ClaimHostControlRequestRequest,
  ): ClaimHostControlRequestResponse;
  completeHostControlRequest(
    request: CompleteHostControlRequestRequest,
  ): CompleteHostControlRequestResponse;
  takeHostControlRequestResult(request: {
    requestId: string;
  }): TakeHostControlRequestResultResult;
}

export interface RunningHostDto {
  id: string;
  name: string;
  canonicalPath: string;
  controllerId: string;
  createdAt: string;
  lastSeenAt: string;
}

/**
 * Host-scoped agent runtime as seen by callers. Row timestamps stay internal:
 * `status` is the only lifecycle signal a caller may act on, and a row's mere
 * existence never means the vendor TUI is up.
 */
export interface HostAgentDto {
  id: string;
  hostId: string;
  name: string;
  kind: AgentKind;
  status: HostAgentStatus;
  role: string | null;
  description: string | null;
  instructions: string | null;
  /** Set by `requestHostAgentTermination`; the hosted CLI that owns the live process applies it. */
  pendingSignal: NodeJS.Signals | null;
  /** Increments on every termination request so a repeated signal name is still a *new* intent. */
  pendingSignalSeq: number;
  /** Highest intent sequence accepted by the owning wrapper's live ChildProcess. */
  deliveredSignalSeq: number;
}

export interface HostControlRequestDto {
  id: string;
  hostId: string;
  kind: HostControlRequestKind;
  payload: Record<string, unknown> | null;
  status: HostControlRequestStatus;
  claimedBy: string | null;
}

export type RegisterRunningHostResponse =
  | { ok: true; host: RunningHostDto; agents: HostAgentDto[] }
  | Extract<RegisterRunningHostResult, { ok: false; reason: "host_path_not_absolute" }>
  | { ok: false; reason: "host_already_running"; host: RunningHostDto }
  | Extract<
      RegisterRunningHostResult,
      { ok: false; reason: "host_agent_name_already_registered" }
    >;

export type LookupRunningHostResponse =
  | { ok: true; host: RunningHostDto }
  | Extract<LookupRunningHostResult, { ok: false }>;

export interface ListRunningHostsResponse {
  ok: true;
  hosts: RunningHostDto[];
}

export type UnregisterRunningHostResponse =
  | {
      ok: true;
      host: RunningHostDto;
      removedAgents: HostAgentDto[];
      cancelledRequestIds: string[];
    }
  | Extract<UnregisterRunningHostResult, { ok: false }>;

export type CompleteTerminateAllAndUnregisterHostResponse =
  | { ok: true; unregistered: true; host: RunningHostDto; removedAgents: HostAgentDto[] }
  | Extract<CompleteTerminateAllAndUnregisterHostResult, { ok: true; unregistered: false }>
  | Extract<CompleteTerminateAllAndUnregisterHostResult, { ok: false }>;

export type RegisterHostAgentResponse =
  | { ok: true; agent: HostAgentDto }
  | Extract<RegisterHostAgentResult, { ok: false; reason: "host_not_running" }>
  | {
      ok: false;
      reason: "host_agent_name_already_registered";
      existing: HostAgentDto;
    };

export type HostAgentTransitionResponse =
  | { ok: true; agent: HostAgentDto }
  | Extract<HostAgentTransitionResult, { ok: false }>;

export type RequestHostAgentTerminationResponse =
  | { ok: true; agent: HostAgentDto }
  | Extract<RequestHostAgentTerminationResult, { ok: false }>;

export type AcknowledgeHostAgentSignalDeliveryResponse =
  | { ok: true; agent: HostAgentDto }
  | Extract<AcknowledgeHostAgentSignalDeliveryResult, { ok: false }>;

export interface ListHostAgentsResponse {
  ok: true;
  agents: HostAgentDto[];
}

export type SubmitHostControlRequestResponse = SubmitHostControlRequestResult;

export type ClaimHostControlRequestResponse =
  | { ok: true; request: HostControlRequestDto | null }
  | Extract<ClaimHostControlRequestResult, { ok: false }>;

export type CompleteHostControlRequestResponse =
  | { ok: true; request: HostControlRequestDto }
  | Extract<CompleteHostControlRequestResult, { ok: false }>;

export interface AgentDto {
  id: string;
  name: string;
  kind: AgentKind;
  status: AgentInstanceStatus;
  cwd: string;
  pairId: string | null;
  pairSlot?: PairSlot | null;
  adapterSessionId?: string;
}

export interface StatusDeliveryDiagnosticsDto {
  acceptanceEvidence: "codex_turn_start" | "claude_http_2xx";
  targetReceiptEvidence: "unavailable";
  automaticTargetAck: false;
  automaticCompletion: false;
  automaticRetry: "conclusive_pre_write_failure_only";
  manualRetransmit: {
    eligibleStatus: "unconfirmed";
    requiresDuplicateRiskConfirmation: true;
    requiredReadiness:
      | "ready_codex_runtime_and_bound_thread"
      | "ready_claude_channel_runtime";
    dispatch: "direct_never_queued";
    lateTransportOutcomeResolution: "correlated_response" | "none";
  };
}

export interface StatusAgentDto extends AgentDto {
  deliveryDiagnostics: StatusDeliveryDiagnosticsDto;
}

export interface PairDto {
  id: string;
  name: string;
  status: PairStatus;
}

export interface RouteDto {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  status: "active";
}

export interface MessageDto {
  id: string;
  sourceAgentId: string;
  parentMessageId: string | null;
  type: MessageType;
  intent?: StoredMessage["intent"];
  replyExpected?: boolean | null;
  content: string;
}

export interface DeliveryDto {
  id: string;
  messageId: string;
  targetAgentId: string;
  routeId: string | null;
  status: MessageDeliveryStatus;
  idempotencyKey: string;
}

export type AttachAgentResponse =
  | {
      ok: true;
      agent: AgentDto;
      codexRuntime?: {
        endpoint: string;
        activeThreadId: string | null;
      };
      claudeChannelToken?: string;
      codexChannelToken?: string;
    }
  | {
      ok: false;
      reason: "agent_name_already_connected";
      existing: AgentDto;
    }
  | {
      ok: false;
      reason: "host_not_running";
      hostId: string;
    }
  | {
      ok: false;
      reason: "host_agent_not_found";
      hostId: string;
      agentName: string;
    }
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
      runtimeDisposeError?: string;
    };

export type CreatePairResponse =
  | {
      ok: true;
      pair: PairDto;
    }
  | {
      ok: false;
      reason: "pair_name_already_exists";
      name: string;
    };

export type ConnectResponse =
  | {
      ok: true;
      created: RouteDto[];
      alreadyExisted: RouteDto[];
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

export type SyncHostEffectiveRoutesResponse =
  | { ok: true; routes: RouteDto[] }
  | Extract<SyncHostEffectiveRoutesResult, { ok: false }>;

export type ReceiveClaudeChannelMessageResponse = SendMessageResponse;

export type SendMessageResponse =
  | {
      ok: true;
      messageId: string;
      message: MessageDto;
      deliveries: DeliveryDto[];
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
      existing: DeliveryDto;
    }
  | { ok: false; reason: "delivery_queue_full"; targetAgentIds: string[] }
  | { ok: false; reason: "unknown_delivery" | "correlation_mismatch" | "reply_not_expected" | "duplicate_reply" };

export type UpdateDeliveryStatusResponse =
  | {
      ok: true;
      delivery: DeliveryDto;
    }
  | {
      ok: false;
      reason: "delivery_not_found";
      deliveryId: string;
    };

export type RetransmitUnconfirmedDeliveryResponse =
  | { ok: true; delivery: DeliveryDto }
  | { ok: false; reason: "delivery_not_found"; deliveryId: string }
  | { ok: false; reason: "delivery_not_unconfirmed"; delivery: DeliveryDto }
  | { ok: false; reason: "duplicate_risk_confirmation_required" }
  | { ok: false; reason: "manual_retransmit_unconfirmed"; delivery: DeliveryDto; message: string }
  | { ok: false; reason: "manual_retransmit_rejected"; delivery: DeliveryDto; message: string }
  | { ok: false; reason: "manual_retransmit_failed"; delivery: DeliveryDto; message: string };

export type DetachAgentResponse = DetachAgentResult;

export type NotifyTuiExitedResponse = NotifyTuiExitedResult;

export interface StatusResponse {
  daemon: {
    pid: number;
    startedAt: string;
  };
  agents: StatusAgentDto[];
  pairs: PairDto[];
  routes: RouteDto[];
  messageCount: number;
  deliveryCounts: Record<MessageDeliveryStatus, number>;
}

export interface StopResponse {
  ok: true;
  stoppedAgents: AgentDto[];
}

/**
 * Wire `type` values for [[docs/specs/aiox-message-lifecycle]] §4.2's
 * `agents_list` peer catalog. This intentionally does not reuse `AgentKind`
 * (`"codex" | "claude"`): the spec's documented wire value for the Claude
 * adapter is `"claude-code"`, not `"claude"`. See `mapPeerType` below.
 */
export type PeerType = "codex" | "claude-code";

export interface PeerDto {
  name: string;
  type: PeerType;
  role: string | null;
  description: string | null;
}

export type ListReachablePeersResponse =
  | {
      ok: true;
      peers: PeerDto[];
    }
  | {
      ok: false;
      reason: "source_agent_not_found";
      sourceName: string;
    };

export type RegisterClaudeChannelResponse = RegisterClaudeChannelResult;
export type DisconnectClaudeChannelResponse = DisconnectClaudeChannelResult;
export type ReceiveClaudeChannelReplyResponse = SendMessageResponse;

export type RegisterCodexChannelResponse = RegisterCodexChannelResult;
export type DisconnectCodexChannelResponse = DisconnectCodexChannelResult;
export type ReceiveCodexMessageResponse =
  | {
      ok: true;
      messageId: string;
      message: MessageDto;
      deliveries: DeliveryDto[];
      dispatch: DispatchSummary;
    }
  | { ok: false; reason: "codex_ingress_unauthorized"; detail: string }
  | { ok: false; reason: "no_active_routes" }
  | { ok: false; reason: "source_agent_not_found"; sourceName: string }
  | {
      ok: false;
      reason: "delivery_idempotency_key_exists";
      existing: DeliveryDto;
    }
  | { ok: false; reason: "delivery_queue_full"; targetAgentIds: string[] }
  | { ok: false; reason: "unknown_delivery" | "correlation_mismatch" | "reply_not_expected" | "duplicate_reply" };

export function createDaemonApi(state: DaemonState): DaemonApi {
  return {
    async attachAgent(request) {
      return mapAttachAgentResult(await state.attachAgent(request));
    },
    createPair(request) {
      return mapCreatePairResult(state.createPair(request));
    },
    connect(request) {
      return mapConnectResult(state.connect(request));
    },
    syncHostEffectiveRoutes(request) {
      const result = state.syncHostEffectiveRoutes(request);
      return result.ok ? { ok: true, routes: result.routes.map(mapRoute) } : result;
    },
    sendMessage(request) {
      return mapSendMessageResult(state.sendMessage(request));
    },
    updateDeliveryStatus(request) {
      return mapUpdateDeliveryStatusResult(state.updateDeliveryStatus(request));
    },
    async retransmitUnconfirmedDelivery(request) {
      return mapRetransmitUnconfirmedDeliveryResult(
        await state.retransmitUnconfirmedDelivery(request),
      );
    },
    async detachAgent(request) {
      return state.detachAgent(request);
    },
    async notifyTuiExited(request) {
      return state.notifyTuiExited(request);
    },
    async registerClaudeChannel(request) {
      return state.registerClaudeChannel(request);
    },
    async reportClaudeChannelBootFailure(request) {
      return state.reportClaudeChannelBootFailure(request);
    },
    async disconnectClaudeChannel(request) {
      return state.disconnectClaudeChannel(request);
    },
    async receiveClaudeChannelMessage(request) {
      return mapSendMessageResult(await state.receiveClaudeChannelMessage(request));
    },
    async receiveClaudeChannelReply(request) {
      return mapSendMessageResult(await state.receiveClaudeChannelReply(request));
    },
    async registerCodexChannel(request) {
      return state.registerCodexChannel(request);
    },
    async disconnectCodexChannel(request) {
      return state.disconnectCodexChannel(request);
    },
    async receiveCodexMessage(request) {
      return mapReceiveCodexMessageResult(await state.receiveCodexMessage(request));
    },
    async receiveCodexReply(request) {
      return mapReceiveCodexMessageResult(await state.receiveCodexReply(request));
    },
    status() {
      return mapStatusResult(state.status());
    },
    listReachablePeers(request) {
      return mapListReachablePeersResult(state.listReachablePeers(request));
    },
    async stop(request) {
      return mapStopResult(await state.stop(request));
    },
    registerRunningHost(request) {
      const result = state.registerRunningHost(request);

      if (result.ok) {
        return {
          ok: true,
          host: mapRunningHost(result.host),
          agents: result.agents.map(mapHostAgent),
        };
      }

      if (result.reason === "host_already_running") {
        return { ok: false, reason: result.reason, host: mapRunningHost(result.host) };
      }

      return result;
    },
    lookupRunningHost(request) {
      const result = state.lookupRunningHost(request);

      return result.ok ? { ok: true, host: mapRunningHost(result.host) } : result;
    },
    listRunningHosts() {
      return { ok: true, hosts: state.listRunningHosts().map(mapRunningHost) };
    },
    unregisterRunningHost(request) {
      const result = state.unregisterRunningHost(request);

      return result.ok
        ? {
            ok: true,
            host: mapRunningHost(result.host),
            removedAgents: result.removedAgents.map(mapHostAgent),
            cancelledRequestIds: result.cancelledRequestIds,
          }
        : result;
    },
    completeTerminateAllAndUnregisterHost(request) {
      const result = state.completeTerminateAllAndUnregisterHost(request);

      if (result.ok && result.unregistered) {
        return {
          ok: true,
          unregistered: true,
          host: mapRunningHost(result.host),
          removedAgents: result.removedAgents.map(mapHostAgent),
        };
      }

      return result;
    },

    registerHostAgent(request) {
      const result = state.registerHostAgent(request);

      if (result.ok) {
        return { ok: true, agent: mapHostAgent(result.agent) };
      }

      if (result.reason === "host_agent_name_already_registered") {
        return { ok: false, reason: result.reason, existing: mapHostAgent(result.existing) };
      }

      return result;
    },
    markHostAgentReady(request) {
      return mapHostAgentTransition(state.markHostAgentReady(request));
    },
    requestHostAgentTermination(request) {
      const result = state.requestHostAgentTermination(request);
      return result.ok ? { ok: true, agent: mapHostAgent(result.agent) } : result;
    },
    acknowledgeHostAgentSignalDelivery(request) {
      const result = state.acknowledgeHostAgentSignalDelivery(request);
      return result.ok ? { ok: true, agent: mapHostAgent(result.agent) } : result;
    },
    detachHostAgent(request) {
      return mapHostAgentTransition(state.detachHostAgent(request));
    },
    listHostAgents(request) {
      return { ok: true, agents: state.listHostAgents(request).map(mapHostAgent) };
    },
    submitHostControlRequest(request) {
      return state.submitHostControlRequest(request);
    },
    claimHostControlRequest(request) {
      const result = state.claimHostControlRequest(request);

      return result.ok
        ? {
            ok: true,
            request: result.request === null ? null : mapHostControlRequest(result.request),
          }
        : result;
    },
    completeHostControlRequest(request) {
      const result = state.completeHostControlRequest(request);

      return result.ok
        ? { ok: true, request: mapHostControlRequest(result.request) }
        : result;
    },
    takeHostControlRequestResult(request) {
      return state.takeHostControlRequestResult(request);
    },
  };
}

function mapRunningHost(host: StoredRunningHost): RunningHostDto {
  return {
    id: host.id,
    name: host.name,
    canonicalPath: host.canonicalPath,
    controllerId: host.controllerId,
    createdAt: host.createdAt,
    lastSeenAt: host.lastSeenAt,
  };
}

function mapHostAgent(agent: StoredHostAgent): HostAgentDto {
  return {
    id: agent.id,
    hostId: agent.hostId,
    name: agent.name,
    kind: agent.kind,
    status: agent.status,
    role: agent.role,
    description: agent.description,
    instructions: agent.instructions,
    pendingSignal: agent.pendingSignal,
    pendingSignalSeq: agent.pendingSignalSeq,
    deliveredSignalSeq: agent.deliveredSignalSeq,
  };
}

function mapHostAgentTransition(
  result: HostAgentTransitionResult,
): HostAgentTransitionResponse {
  return result.ok ? { ok: true, agent: mapHostAgent(result.agent) } : result;
}

function mapHostControlRequest(
  request: StoredHostControlRequest,
): HostControlRequestDto {
  return {
    id: request.id,
    hostId: request.hostId,
    kind: request.kind,
    payload: request.payload,
    status: request.status,
    claimedBy: request.claimedBy,
  };
}

function mapAttachAgentResult(result: AttachAgentResult): AttachAgentResponse {
  if (result.ok) {
    return {
      ok: true,
      agent: mapAgent(result.agent),
      ...(result.codexRuntime ? { codexRuntime: result.codexRuntime } : {}),
      ...(result.claudeChannelToken
        ? { claudeChannelToken: result.claudeChannelToken }
        : {}),
      ...(result.codexChannelToken
        ? { codexChannelToken: result.codexChannelToken }
        : {}),
    };
  }

  if (result.reason === "agent_name_already_connected") {
    return {
      ok: false,
      reason: result.reason,
      existing: mapAgent(result.existing),
    };
  }

  return result;
}

function mapCreatePairResult(result: CreatePairResult): CreatePairResponse {
  if (result.ok) {
    return {
      ok: true,
      pair: {
        id: result.pair.id,
        name: result.pair.name,
        status: result.pair.status,
      },
    };
  }

  return result;
}

function mapConnectResult(result: ConnectResult): ConnectResponse {
  if (result.ok) {
    return {
      ok: true,
      created: result.created.map(mapRoute),
      alreadyExisted: result.alreadyExisted.map(mapRoute),
    };
  }

  return result;
}

function mapReceiveCodexMessageResult(
  result: ReceiveCodexMessageResult,
): ReceiveCodexMessageResponse {
  if (result.ok) {
    return {
      ok: true,
      messageId: result.message.id,
      message: mapMessage(result.message),
      deliveries: result.deliveries.map(mapDelivery),
      dispatch: result.dispatch,
    };
  }

  if (result.reason === "delivery_idempotency_key_exists") {
    return {
      ok: false,
      reason: result.reason,
      existing: mapDelivery(result.existing),
    };
  }

  return result;
}

function mapSendMessageResult(result: SendMessageResult): SendMessageResponse {
  if (result.ok) {
    return {
      ok: true,
      messageId: result.message.id,
      message: mapMessage(result.message),
      deliveries: result.deliveries.map(mapDelivery),
      dispatch: result.dispatch,
    };
  }

  if (result.reason === "delivery_idempotency_key_exists") {
    return {
      ok: false,
      reason: result.reason,
      existing: mapDelivery(result.existing),
    };
  }

  return result;
}

function mapUpdateDeliveryStatusResult(
  result: UpdateDeliveryStatusResult,
): UpdateDeliveryStatusResponse {
  if (result.ok) {
    return {
      ok: true,
      delivery: mapDelivery(result.delivery),
    };
  }

  return result;
}

function mapRetransmitUnconfirmedDeliveryResult(
  result: RetransmitUnconfirmedDeliveryResult,
): RetransmitUnconfirmedDeliveryResponse {
  return "delivery" in result ? { ...result, delivery: mapDelivery(result.delivery) } : result;
}

function mapStatusResult(result: StatusResult): StatusResponse {
  return {
    daemon: result.daemon,
    agents: result.agents.map(mapStatusAgent),
    pairs: result.pairs.map(mapPair),
    routes: result.routes.map(mapRoute),
    messageCount: result.messageCount,
    deliveryCounts: result.deliveryCounts,
  };
}

function mapStatusAgent(agent: StoredAgent): StatusAgentDto {
  return {
    ...mapAgent(agent),
    deliveryDiagnostics: {
      acceptanceEvidence:
        agent.kind === "codex" ? "codex_turn_start" : "claude_http_2xx",
      targetReceiptEvidence: "unavailable",
      automaticTargetAck: false,
      automaticCompletion: false,
      automaticRetry: "conclusive_pre_write_failure_only",
      manualRetransmit: {
        eligibleStatus: "unconfirmed",
        requiresDuplicateRiskConfirmation: true,
        requiredReadiness:
          agent.kind === "codex"
            ? "ready_codex_runtime_and_bound_thread"
            : "ready_claude_channel_runtime",
        dispatch: "direct_never_queued",
        lateTransportOutcomeResolution:
          agent.kind === "codex" ? "correlated_response" : "none",
      },
    },
  };
}

function mapListReachablePeersResult(
  result: ListReachablePeersResult,
): ListReachablePeersResponse {
  if (result.ok) {
    return {
      ok: true,
      peers: result.peers.map(mapPeer),
    };
  }

  return result;
}

function mapPeer(agent: StoredAgent): PeerDto {
  return {
    name: agent.name,
    type: mapPeerType(agent.kind),
    role: agent.role,
    description: agent.description,
  };
}

function mapPeerType(kind: AgentKind): PeerType {
  switch (kind) {
    case "codex":
      return "codex";
    case "claude":
      return "claude-code";
    default: {
      const exhaustive: never = kind;
      throw new Error(`unsupported agent kind: ${exhaustive as string}`);
    }
  }
}

function mapStopResult(result: StopResult): StopResponse {
  return {
    ok: true,
    stoppedAgents: result.stoppedAgents.map(mapAgent),
  };
}

function mapAgent(agent: StoredAgent): AgentDto {
  const dto: AgentDto = {
    id: agent.id,
    name: agent.name,
    kind: agent.kind,
    status: agent.status,
    cwd: agent.cwd,
    pairId: agent.pairId ?? null,
  };

  if (agent.adapterSessionId !== null) {
    dto.adapterSessionId = agent.adapterSessionId;
  }

  return dto;
}

function mapMessage(message: StoredMessage): MessageDto {
  return {
    id: message.id,
    sourceAgentId: message.sourceAgentId,
    parentMessageId: message.parentMessageId,
    type: message.type,
    intent: message.intent,
    replyExpected: message.replyExpected,
    content: message.content,
  };
}

function mapDelivery(delivery: StoredDelivery): DeliveryDto {
  return {
    id: delivery.id,
    messageId: delivery.messageId,
    targetAgentId: delivery.targetAgentId,
    routeId: delivery.routeId,
    status: delivery.status,
    idempotencyKey: delivery.idempotencyKey,
  };
}

function mapPair(pair: { id: string; name: string; status: PairStatus }): PairDto {
  return {
    id: pair.id,
    name: pair.name,
    status: pair.status,
  };
}

function mapRoute(route: StoredRoute): RouteDto {
  return {
    id: route.id,
    sourceAgentId: route.sourceAgentId,
    targetAgentId: route.targetAgentId,
    status: route.status,
  };
}
