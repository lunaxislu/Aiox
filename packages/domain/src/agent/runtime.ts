/** One managed execution. Conversation IDs and display names are not identity. */
export type AgentRuntime = {
    readonly id: string;
    /** Fixed for this execution; no membership is represented by null. */
    readonly networkId: string | null;
};
