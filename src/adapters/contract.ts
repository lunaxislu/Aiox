import type { AgentKind } from "../core/agents.js";
import type { AgentAuthoredIntent, MessageType } from "../core/messages.js";
import type { AgentDto, DeliveryDto, MessageDto } from "../daemon/api.js";

export interface AdapterOutgoingMessage {
  sourceName: string;
  messageId: string;
  parentMessageId?: string | null;
  type: MessageType;
  intent?: AgentAuthoredIntent;
  replyExpected?: boolean;
  content: string;
}

export interface AdapterInjectInput {
  message: MessageDto;
  delivery: DeliveryDto;
  targetAgent: AgentDto;
}

export type AdapterInjectFailureReason =
  | "adapter_inject_failed"
  | "codex_app_server_unavailable"
  | "codex_app_server_ws_connect_failed"
  | "codex_app_server_ws_initialize_failed"
  | "codex_app_server_ws_dropped"
  | "codex_turn_start_timeout"
  | "codex_jsonrpc_error"
  | "codex_resume_failed"
  | "codex_binding_uncertain"
  | "claude_channel_unavailable"
  | "claude_channel_push_failed"
  | "claude_channel_push_unconfirmed";

export type AdapterInjectDeferredReason =
  | "target_adapter_not_registered"
  | "target_binding_unconfirmed"
  | "target_runtime_unavailable";

export type AdapterInjectResult =
  | {
      kind: "success";
    }
  | {
      kind: "failed";
      reason: AdapterInjectFailureReason;
      message: string;
      jsonRpcCode?: number;
      requestId?: number;
    }
  | {
      kind: "deferred";
      reason: AdapterInjectDeferredReason;
      eligibility?: string;
    };

export interface AgentAdapter {
  kind: AgentKind;
  inject(input: AdapterInjectInput): Promise<AdapterInjectResult>;
}
