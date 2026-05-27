import type {
  AdapterInjectInput,
  AdapterInjectResult,
  AdapterOutgoingMessage,
  AgentAdapter,
} from "../../src/adapters/contract.js";
import type { AgentKind } from "../../src/core/agents.js";

export interface FakeAgentAdapter extends AgentAdapter {
  outgoing: AdapterOutgoingMessage[];
  injections: AdapterInjectInput[];
  sendOutgoing(message: AdapterOutgoingMessage): AdapterOutgoingMessage;
}

export interface CreateFakeAgentAdapterOptions {
  failInjectForAgentNames?: readonly string[];
  deferInjectForAgentNames?: readonly string[];
}

export function createFakeAgentAdapter(
  kind: AgentKind,
  options: CreateFakeAgentAdapterOptions = {},
): FakeAgentAdapter {
  const outgoing: AdapterOutgoingMessage[] = [];
  const injections: AdapterInjectInput[] = [];
  const failedNames = new Set(options.failInjectForAgentNames ?? []);
  const deferredNames = new Set(options.deferInjectForAgentNames ?? []);

  return {
    kind,
    outgoing,
    injections,
    sendOutgoing(message) {
      outgoing.push(message);
      return message;
    },
    async inject(input): Promise<AdapterInjectResult> {
      injections.push(input);

      if (failedNames.has(input.targetAgent.name)) {
        return {
          kind: "failed",
          reason: "adapter_inject_failed",
          message: `fake ${kind} inject failed for ${input.targetAgent.name}`,
        };
      }

      if (deferredNames.has(input.targetAgent.name)) {
        return {
          kind: "deferred",
          reason: "target_runtime_unavailable",
          eligibility: `fake ${kind} runtime for ${input.targetAgent.name}`,
        };
      }

      return { kind: "success" };
    },
  };
}
