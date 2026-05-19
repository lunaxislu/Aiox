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
}

export function createFakeAgentAdapter(
  kind: AgentKind,
  options: CreateFakeAgentAdapterOptions = {},
): FakeAgentAdapter {
  const outgoing: AdapterOutgoingMessage[] = [];
  const injections: AdapterInjectInput[] = [];
  const failedNames = new Set(options.failInjectForAgentNames ?? []);

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
          ok: false,
          reason: "adapter_inject_failed",
          message: `fake ${kind} inject failed for ${input.targetAgent.name}`,
        };
      }

      return { ok: true };
    },
  };
}
