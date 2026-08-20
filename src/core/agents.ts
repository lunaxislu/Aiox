export { agentKinds, type AgentKind } from "./agent-kind.js";

// An agent row exists only while connected. Departure deletes the agent and
// its routes rather than status-flipping it. The status field is retained for
// the `aiox status` AGENTS table shape.
export const agentInstanceStatuses = ["connected"] as const;

export type AgentInstanceStatus = (typeof agentInstanceStatuses)[number];
