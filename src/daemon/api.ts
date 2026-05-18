import type {
  AttachAgentRequest,
  AttachAgentResult,
  ConnectRequest,
  ConnectResult,
  CreatePairRequest,
  CreatePairResult,
  DaemonState,
  DisconnectRequest,
  DisconnectResult,
  StatusResult,
} from "./state.js";
import type { AgentInstanceStatus, AgentKind } from "../core/agents.js";
import type { PairStatus } from "../core/pairs.js";
import type { StoredAgent } from "../store/repositories/agents.js";
import type { StoredRoute } from "../store/repositories/routes.js";

export interface DaemonApi {
  attachAgent(request: AttachAgentRequest): AttachAgentResponse;
  createPair(request: CreatePairRequest): CreatePairResponse;
  connect(request: ConnectRequest): ConnectResponse;
  disconnect(request: DisconnectRequest): DisconnectResponse;
  status(): StatusResponse;
}

export interface AgentDto {
  id: string;
  name: string;
  kind: AgentKind;
  status: AgentInstanceStatus;
  cwd: string;
  pairId: string | null;
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

export type AttachAgentResponse =
  | {
      ok: true;
      agent: AgentDto;
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

export interface StatusResponse {
  daemon: {
    startedAt: string;
  };
  agents: AgentDto[];
  pairs: PairDto[];
  routes: RouteDto[];
}

export function createDaemonApi(state: DaemonState): DaemonApi {
  return {
    attachAgent(request) {
      return mapAttachAgentResult(state.attachAgent(request));
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
    status() {
      return mapStatusResult(state.status());
    },
  };
}

function mapAttachAgentResult(result: AttachAgentResult): AttachAgentResponse {
  if (result.ok) {
    return {
      ok: true,
      agent: mapAgent(result.agent),
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

function mapStatusResult(result: StatusResult): StatusResponse {
  return {
    daemon: result.daemon,
    agents: result.agents.map(mapAgent),
    pairs: result.pairs.map(mapPair),
    routes: result.routes.map(mapRoute),
  };
}

function mapAgent(agent: StoredAgent): AgentDto {
  return {
    id: agent.id,
    name: agent.name,
    kind: agent.kind,
    status: agent.status,
    cwd: agent.cwd,
    pairId: agent.pairId ?? null,
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
