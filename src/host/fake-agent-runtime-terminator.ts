import type {
  AgentRuntimeTerminator,
  AgentTerminationRequest,
  AgentTerminationResult,
} from "./agent-runtime-terminator.js";

/**
 * Test double for `AgentRuntimeTerminator`. Succeeds for every agent by
 * default; `failFor()` configures a specific agent name to fail
 * deterministically instead, so `HostController`'s partial-failure handling
 * can be exercised without a real vendor process.
 */
export interface FakeAgentRuntimeTerminator extends AgentRuntimeTerminator {
  readonly calls: readonly AgentTerminationRequest[];
  failFor(agentName: string, reason?: string): void;
  rejectFor(agentName: string, reason?: string): void;
}

export function createFakeAgentRuntimeTerminator(): FakeAgentRuntimeTerminator {
  const calls: AgentTerminationRequest[] = [];
  const failures = new Map<string, string>();
  const rejections = new Map<string, string>();

  return {
    get calls() {
      return [...calls];
    },

    failFor(agentName, reason = "termination failed") {
      failures.set(agentName, reason);
    },

    rejectFor(agentName, reason = "termination rejected") {
      rejections.set(agentName, reason);
    },

    async terminate(request): Promise<AgentTerminationResult> {
      calls.push(request);
      const rejection = rejections.get(request.agentName);
      if (rejection !== undefined) {
        throw new Error(rejection);
      }
      const reason = failures.get(request.agentName);
      if (reason !== undefined) {
        return { ok: false, reason };
      }
      return { ok: true };
    },
  };
}
