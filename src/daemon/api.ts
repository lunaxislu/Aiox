import type { AttachAgentRequest, DaemonState } from "./state.js";

export interface DaemonApi {
  attachAgent(request: AttachAgentRequest): ReturnType<DaemonState["attachAgent"]>;
}

export function createDaemonApi(state: DaemonState): DaemonApi {
  return {
    attachAgent(request) {
      return state.attachAgent(request);
    },
  };
}
