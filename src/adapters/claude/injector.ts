import type { AdapterInjectResult } from "../contract.js";

export interface ClaudeChannelRuntime {
  readonly endpoint: string;
}

export interface ClaudeChannelEndpointLookup {
  getRuntime(agentId: string): ClaudeChannelRuntime | undefined;
}

export interface InjectClaudeChannelOptions {
  /** Routable agent id -- the runtime registry lookup key (W6 Stage 5A). */
  agentId: string;
  /** Display name only, used in diagnostic messages. */
  agentName: string;
  content: string;
  timeoutMs?: number;
}

const DEFAULT_PUSH_TIMEOUT_MS = 5_000;

export async function injectClaudeChannel(
  lookup: ClaudeChannelEndpointLookup,
  options: InjectClaudeChannelOptions,
): Promise<AdapterInjectResult> {
  const runtime = lookup.getRuntime(options.agentId);
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

  try {
    const response = await fetch(runtime.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: options.content }),
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
        reason: "claude_channel_push_unconfirmed",
        message: `Claude channel push timed out after ${timeoutMs}ms: ${message}`,
      };
    }

    return isConnectionRefused(error)
      ? {
          kind: "failed",
          reason: "claude_channel_unavailable",
          message: `Claude channel endpoint unreachable: ${message}`,
        }
      : {
          kind: "failed",
          reason: "claude_channel_push_unconfirmed",
          message: `Claude channel push response was lost: ${message}`,
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

function isConnectionRefused(error: unknown): boolean {
  return getErrorCode(error) === "ECONNREFUSED";
}

function getErrorCode(error: unknown): unknown {
  if (!(error instanceof Error)) return undefined;
  if ("code" in error) return error.code;
  return error.cause instanceof Error && "code" in error.cause
    ? error.cause.code
    : undefined;
}
