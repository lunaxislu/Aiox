export const agentKinds = ["codex", "claude"] as const;

export type AgentKind = (typeof agentKinds)[number];
