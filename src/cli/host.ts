import type { AioxAgentConfig } from "../config/aiox-config.js";
import type { AgentKind } from "../core/agent-kind.js";

/**
 * `instructions.global` then per-agent `agents[].instructions`, composed into one text
 * (G2 Kickoff / W6 Task Brief revision 5). Trim only decides whether a value counts as
 * "given" — the original (untrimmed) text is what ends up in the composed result.
 */
export function composeInstructions(
  global: string | undefined,
  perAgent: string | undefined,
): string | undefined {
  const hasGlobal = global !== undefined && global.trim().length > 0;
  const hasPerAgent = perAgent !== undefined && perAgent.trim().length > 0;

  if (hasGlobal && hasPerAgent) {
    return `${global}\n\n${perAgent}`;
  }
  if (hasGlobal) {
    return global;
  }
  if (hasPerAgent) {
    return perAgent;
  }
  return undefined;
}

/** `aiox.yaml` agent `type` -> the `AgentKind` the daemon/host runtime use. */
export function mapAgentTypeToKind(type: AioxAgentConfig["type"]): AgentKind {
  switch (type) {
    case "codex":
      return "codex";
    case "claude-code":
      return "claude";
    default: {
      const exhaustive: never = type;
      throw new Error(`unsupported agent type: ${exhaustive as string}`);
    }
  }
}
