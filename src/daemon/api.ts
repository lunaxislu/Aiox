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
  DisconnectRequest,
  DisconnectResult,
  NotifyTuiExitedRequest,
  NotifyTuiExitedResult,
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
import type { PairStatus } from "../core/pairs.js";
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
  rollbackAgentAttach(
    request: RollbackAgentAttachRequest,
  ): Promise<RollbackAgentAttachResponse>;
  detachAgent(request: DetachAgentRequest): Promise<DetachAgentResponse>;
  notifyTuiExited(request: NotifyTuiExitedRequest): Promise<NotifyTuiExitedResponse>;
  status(): StatusResponse;
  stop(request: StopRequest): StopResponse;
}

export interface AgentDto {
  id: string;
  name: string;
  kind: AgentKind;
  status: AgentInstanceStatus;
  cwd: string;
  pairId: string | null;
  adapterSessionId?: string;
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
        activeThreadId: string;
      };
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

export type SendMessageResponse =
  | {
      ok: true;
      message: MessageDto;
      deliveries: DeliveryDto[];
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
    };

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

export type RollbackAgentAttachResponse = RollbackAgentAttachResult;

export type DetachAgentResponse = DetachAgentResult;

export type NotifyTuiExitedResponse = NotifyTuiExitedResult;

export interface StatusResponse {
  daemon: {
    startedAt: string;
  };
  agents: AgentDto[];
  pairs: PairDto[];
  routes: RouteDto[];
}

export interface StopResponse {
  ok: true;
  stoppedAgents: AgentDto[];
}

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
    async rollbackAgentAttach(request) {
      return state.rollbackAgentAttach(request);
    },
    async detachAgent(request) {
      return state.detachAgent(request);
    },
    async notifyTuiExited(request) {
      return state.notifyTuiExited(request);
    },
    status() {
      return mapStatusResult(state.status());
    },
    stop(request) {
      return mapStopResult(state.stop(request));
    },
  };
}

function mapAttachAgentResult(result: AttachAgentResult): AttachAgentResponse {
  if (result.ok) {
    return {
      ok: true,
      agent: mapAgent(result.agent),
      ...(result.codexRuntime ? { codexRuntime: result.codexRuntime } : {}),
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

function mapSendMessageResult(result: SendMessageResult): SendMessageResponse {
  if (result.ok) {
    return {
      ok: true,
      message: mapMessage(result.message),
      deliveries: result.deliveries.map(mapDelivery),
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

function mapStatusResult(result: StatusResult): StatusResponse {
  return {
    daemon: result.daemon,
    agents: result.agents.map(mapAgent),
    pairs: result.pairs.map(mapPair),
    routes: result.routes.map(mapRoute),
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
