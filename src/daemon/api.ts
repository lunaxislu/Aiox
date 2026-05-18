import type {
  AttachAgentRequest,
  CreatePairRequest,
  DaemonState,
} from "./state.js";

export interface DaemonApi {
  attachAgent(request: AttachAgentRequest): ReturnType<DaemonState["attachAgent"]>;
  createPair(request: CreatePairRequest): ReturnType<DaemonState["createPair"]>;
}

export function createDaemonApi(state: DaemonState): DaemonApi {
  return {
    attachAgent(request) {
      return state.attachAgent(request);
    },
    createPair(request) {
      return state.createPair(request);
    },
  };
}
