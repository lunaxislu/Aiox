import type { AdapterInjectResult } from "../contract.js";
import {
  CodexAppServerWebSocketError,
  type CodexJsonRpcLateResponse,
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
  onLateResponse?: (result: AdapterInjectResult) => void;
}

export async function injectTurnStart(
  runtime: CodexTurnStartRuntime,
  options: InjectTurnStartOptions,
): Promise<AdapterInjectResult> {
  if (options.threadId !== runtime.activeThreadId) {
    return {
      kind: "failed",
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
        onLateResponse: options.onLateResponse
          ? (response) => options.onLateResponse?.(toLateInjectResult(runtime, options, response))
          : undefined,
      },
    );

    if (options.threadId !== runtime.activeThreadId) {
      return {
        kind: "failed",
        reason: "codex_binding_uncertain",
        message: `Codex turn/start acknowledgement thread mismatch: requested=${options.threadId} active=${runtime.activeThreadId ?? "null"}`,
      };
    }

    return { kind: "success" };
  } catch (error) {
    return toInjectFailure(error);
  }
}

function toLateInjectResult(
  runtime: CodexTurnStartRuntime,
  options: InjectTurnStartOptions,
  response: CodexJsonRpcLateResponse,
): AdapterInjectResult {
  if ("error" in response) {
    return toInjectFailure(
      new CodexAppServerWebSocketError(
        "codex_jsonrpc_error",
        response.error.message,
        { jsonRpcCode: response.error.code, requestId: response.id },
      ),
    );
  }

  if (options.threadId !== runtime.activeThreadId) {
    return {
      kind: "failed",
      reason: "codex_binding_uncertain",
      message: `Codex late turn/start acknowledgement thread mismatch: requested=${options.threadId} active=${runtime.activeThreadId ?? "null"}`,
    };
  }

  return { kind: "success" };
}

function toInjectFailure(error: unknown): AdapterInjectResult {
  const message = error instanceof Error ? error.message : String(error);

  if (isCodexAdapterReason(error)) {
    return {
      kind: "failed",
      reason: error.code,
      message,
      jsonRpcCode:
        error instanceof CodexAppServerWebSocketError ? error.jsonRpcCode : undefined,
      requestId:
        error instanceof CodexAppServerWebSocketError ? error.requestId : undefined,
    };
  }

  return {
    kind: "failed",
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
