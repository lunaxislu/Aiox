import type { AdapterInjectResult } from "../contract.js";

export interface ClaudeChannelRuntime {
  readonly endpoint: string;
}

export interface ClaudeChannelEndpointLookup {
  getRuntime(agentName: string): ClaudeChannelRuntime | undefined;
}

export interface InjectClaudeChannelOptions {
  agentName: string;
  content: string;
  chatId?: string;
  origin?: string;
  timeoutMs?: number;
}

const DEFAULT_PUSH_TIMEOUT_MS = 5_000;

export async function injectClaudeChannel(
  lookup: ClaudeChannelEndpointLookup,
  options: InjectClaudeChannelOptions,
): Promise<AdapterInjectResult> {
  const runtime = lookup.getRuntime(options.agentName);
  if (!runtime) {
    return {
      kind: "failed",
      reason: "claude_channel_unavailable",
      message: `Claude channel not registered for agent: ${options.agentName}`,
    };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_PUSH_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const body: Record<string, string> = { content: options.content };
  if (options.chatId) body.chat_id = options.chatId;
  if (options.origin) body.origin = options.origin;

  try {
    const response = await fetch(runtime.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        kind: "failed",
        reason: "claude_channel_push_failed",
        message: `Claude channel push rejected: HTTP ${response.status}`,
      };
    }

    return { kind: "success" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (isAbortError(error)) {
      return {
        kind: "failed",
        reason: "claude_channel_push_failed",
        message: `Claude channel push timed out after ${timeoutMs}ms: ${message}`,
      };
    }

    return {
      kind: "failed",
      reason: "claude_channel_unavailable",
      message: `Claude channel endpoint unreachable: ${message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}
