/** One managed execution. Conversation IDs and display names are not identity. */
export type AgentRuntime = {
    readonly id: string;
    /** Fixed for this execution; no membership is represented by null. */
    readonly networkId: string | null;
};

/**
 * What the daemon observed, not what a model declared about itself. The Web
 * distinguishes these; MCP summarises them through `mcpStatus`.
 */
export type RuntimeActivity =
    | "starting"
    | "idle"
    | "reasoning"
    | "tool"
    | "awaiting-user"
    | "failed"
    | "stopped";

/** The only values `agents_list` publishes. */
export type McpStatus = "idle" | "working" | "failed";

const summary: Record<RuntimeActivity, McpStatus | null> = {
    starting: null,
    idle: "idle",
    reasoning: "working",
    tool: "working",
    "awaiting-user": "working",
    failed: "failed",
    stopped: null,
};

/** null means the runtime is not a send target: still starting, or Host stopped. */
export function mcpStatus(activity: RuntimeActivity): McpStatus | null {
    return summary[activity];
}
