import type {
  AttachAgentRequest,
  AttachAgentResult,
  CreatePairRequest,
  CreatePairResult,
  DaemonState,
} from "./state.js";
import type { AgentInstanceStatus, AgentKind } from "../core/agents.js";
import type { PairStatus } from "../core/pairs.js";
import type { StoredAgent } from "../store/repositories/agents.js";

export interface DaemonApi {
  attachAgent(request: AttachAgentRequest): AttachAgentResponse;
  createPair(request: CreatePairRequest): CreatePairResponse;
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

export function createDaemonApi(state: DaemonState): DaemonApi {
  return {
    attachAgent(request) {
      return mapAttachAgentResult(state.attachAgent(request));
    },
    createPair(request) {
      return mapCreatePairResult(state.createPair(request));
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
