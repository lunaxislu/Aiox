/** One managed execution. Conversation IDs and display names are not identity. */
export type AgentRuntime = {
    readonly id: string;
    /** Fixed for this execution; no membership is represented by null. */
    readonly networkId: string | null;
};

/** Current vendor observation shared by HTTP/Web and MCP; not delivery availability. */
export type RuntimeStatus =
    | "aiox-preparing"
    | "idle"
    | "working"
    | "awaiting-user"
    | "failed";
