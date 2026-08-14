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
  DisconnectRequest,
  DisconnectResult,
  DispatchSummary,
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
  RollbackAgentAttachRequest,
  RollbackAgentAttachResult,
  SendMessageRequest,
  SendMessageResult,
  StatusResult,
  StopRequest,
  StopResult,
  UpdateDeliveryStatusRequest,
  UpdateDeliveryStatusResult,
} from "./state.js";
import type { AgentInstanceStatus, AgentKind } from "../core/agents.js";
import type { MessageDeliveryStatus } from "../core/deliveries.js";
import type { MessageType } from "../core/messages.js";
import type { PairSlot, PairStatus } from "../core/pairs.js";
import type { StoredAgent } from "../store/repositories/agents.js";
import type { StoredDelivery } from "../store/repositories/deliveries.js";
import type { StoredMessage } from "../store/repositories/messages.js";
import type { StoredRoute } from "../store/repositories/routes.js";

export interface DaemonApi {
  attachAgent(request: AttachAgentRequest): Promise<AttachAgentResponse>;
  createPair(request: CreatePairRequest): CreatePairResponse;
  connect(request: ConnectRequest): ConnectResponse;
  disconnect(request: DisconnectRequest): DisconnectResponse;
  sendMessage(request: SendMessageRequest): SendMessageResponse;
  updateDeliveryStatus(request: UpdateDeliveryStatusRequest): UpdateDeliveryStatusResponse;
  retransmitUnconfirmedDelivery(
    request: RetransmitUnconfirmedDeliveryRequest,
  ): Promise<RetransmitUnconfirmedDeliveryResponse>;
  rollbackAgentAttach(
    request: RollbackAgentAttachRequest,
  ): Promise<RollbackAgentAttachResponse>;
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
  stop(request: StopRequest): Promise<StopResponse>;
}

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

export type DisconnectResponse =
  | {
      ok: true;
      removed: RouteDto[];
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

export type RollbackAgentAttachResponse = RollbackAgentAttachResult;

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
    disconnect(request) {
      return mapDisconnectResult(state.disconnect(request));
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
    async rollbackAgentAttach(request) {
      return state.rollbackAgentAttach(request);
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
    async stop(request) {
      return mapStopResult(await state.stop(request));
    },
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

function mapDisconnectResult(result: DisconnectResult): DisconnectResponse {
  if (result.ok) {
    return {
      ok: true,
      removed: result.removed.map(mapRoute),
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
