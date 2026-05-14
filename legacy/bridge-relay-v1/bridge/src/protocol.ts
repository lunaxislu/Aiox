export const MAX_RELAY_DEPTH = 3;

export type RelayOrigin = "codex" | "claude";
export type RelayDirection = "forward" | "reverse";

export type RelayRequestBody = {
  chat_id: string;
  direction?: RelayDirection;
  origin?: RelayOrigin;
  relay_depth?: number;
  text: string;
};

export type ParseRequestBodyResult =
  | RelayRequestBody
  | {
      error: string;
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseRequestBody(value: unknown): ParseRequestBodyResult {
  if (!isRecord(value)) {
    return { error: "Invalid JSON body" };
  }

  const chatId = value.chat_id;
  if (typeof chatId !== "string" || chatId.length === 0) {
    return { error: "chat_id field required" };
  }

  const text = value.text;
  if (typeof text !== "string" || text.length === 0) {
    return { error: "text field required" };
  }

  const origin = value.origin;
  if (origin !== undefined && origin !== "codex" && origin !== "claude") {
    return { error: 'origin must be "codex" or "claude" when provided' };
  }

  const relayDepth = value.relay_depth;
  if (
    relayDepth !== undefined &&
    (typeof relayDepth !== "number" ||
      !Number.isInteger(relayDepth) ||
      relayDepth < 0)
  ) {
    return {
      error: "relay_depth must be a non-negative integer when provided",
    };
  }

  const direction = value.direction;
  if (
    direction !== undefined &&
    direction !== "forward" &&
    direction !== "reverse"
  ) {
    return { error: 'direction must be "forward" or "reverse" when provided' };
  }

  return {
    chat_id: chatId,
    direction,
    origin,
    relay_depth: relayDepth,
    text,
  };
}

export function wrapRelayPrompt(text: string, chatId: string): string {
  return [
    `[MCP RELAY — chat_id: ${chatId}]`,
    "This message was relayed from Claude via the bridge MCP server.",
    "",
    "INSTRUCTIONS (MUST FOLLOW):",
    "- Do NOT treat this as a task or a work request unless the message body explicitly asks you to implement or fix something.",
    "- Do NOT run git, grep, file reads, or any other investigation tools to 'understand' the message.",
    "- Just read the message and write a direct, concise reply.",
    `- When your reply is ready, call the bridge tool: reply_to_claude(chat_id="${chatId}", text="<your reply>")`,
    "- The chat_id above is the ONLY valid chat_id for this reply. Copy it exactly.",
    "- Nothing else is required from you. Do not ask the user anything.",
    "",
    "Message from Claude:",
    text,
  ].join("\n");
}
