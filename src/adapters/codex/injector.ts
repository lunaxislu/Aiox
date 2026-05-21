import type { AdapterInjectResult } from "../contract.js";
import {
  CodexAppServerWebSocketError,
  type CodexJsonRpcRequestOptions,
} from "./websocket.js";

export interface CodexTurnStartRuntime {
  readonly activeThreadId: string | null;
  requestCodex(
    method: string,
    params?: unknown,
    options?: CodexJsonRpcRequestOptions,
  ): Promise<unknown>;
}

export interface InjectTurnStartOptions {
  threadId: string;
  input: string;
  timeoutMs?: number;
}

export async function injectTurnStart(
  runtime: CodexTurnStartRuntime,
  options: InjectTurnStartOptions,
): Promise<AdapterInjectResult> {
  if (options.threadId !== runtime.activeThreadId) {
    return {
      ok: false,
      reason: "codex_binding_uncertain",
      message: `Codex turn/start thread mismatch: requested=${options.threadId} active=${runtime.activeThreadId ?? "null"}`,
    };
  }

  try {
    await runtime.requestCodex(
      "turn/start",
      {
        threadId: options.threadId,
        input: [
          {
            type: "text",
            text: options.input,
          },
        ],
      },
      {
        timeoutMs: options.timeoutMs,
        timeoutErrorCode: "codex_turn_start_timeout",
      },
    );

    if (options.threadId !== runtime.activeThreadId) {
      return {
        ok: false,
        reason: "codex_binding_uncertain",
        message: `Codex turn/start ack thread mismatch: requested=${options.threadId} active=${runtime.activeThreadId ?? "null"}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return toInjectFailure(error);
  }
}

function toInjectFailure(error: unknown): AdapterInjectResult {
  const message = error instanceof Error ? error.message : String(error);

  if (isCodexAdapterReason(error)) {
    return {
      ok: false,
      reason: error.code,
      message,
      jsonRpcCode:
        error instanceof CodexAppServerWebSocketError ? error.jsonRpcCode : undefined,
    };
  }

  return {
    ok: false,
    reason: "adapter_inject_failed",
    message,
  };
}

function isCodexAdapterReason(
  error: unknown,
): error is {
  code:
    | "codex_app_server_ws_dropped"
    | "codex_turn_start_timeout"
    | "codex_jsonrpc_error"
    | "codex_resume_failed"
    | "codex_binding_uncertain";
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "codex_app_server_ws_dropped" ||
      error.code === "codex_turn_start_timeout" ||
      error.code === "codex_jsonrpc_error" ||
      error.code === "codex_resume_failed" ||
      error.code === "codex_binding_uncertain")
  );
}
