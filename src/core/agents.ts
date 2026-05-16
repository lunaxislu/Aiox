export const agentInstanceStatuses = [
  "pending_attach",
  "connected",
  "disconnected",
  "stale",
] as const;

export type AgentInstanceStatus = (typeof agentInstanceStatuses)[number];

export const agentKinds = ["codex", "claude"] as const;

export type AgentKind = (typeof agentKinds)[number];

export interface AgentInstance {
  id: string;
  name: string;
  kind: AgentKind;
  status: AgentInstanceStatus;
}

export interface AttachAgentRequest {
  id: string;
  name: string;
  kind: AgentKind;
}

export type AttachAgentResult =
  | {
      ok: true;
      agent: AgentInstance;
    }
  | {
      ok: false;
      reason: "agent_name_already_connected";
      existing: AgentInstance;
    };

export function attachAgent(
  agents: readonly AgentInstance[],
  request: AttachAgentRequest,
): AttachAgentResult {
  const existing = agents.find((agent) => agent.name === request.name);

  if (existing?.status === "connected") {
    return {
      ok: false,
      reason: "agent_name_already_connected",
      existing,
    };
  }

  if (existing) {
    return {
      ok: true,
      agent: {
        ...existing,
        status: "connected",
      },
    };
  }

  return {
    ok: true,
    agent: {
      ...request,
      status: "connected",
    },
  };
}
