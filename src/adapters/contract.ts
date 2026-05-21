import type { AgentKind } from "../core/agents.js";
import type { MessageType } from "../core/messages.js";
import type { AgentDto, DeliveryDto, MessageDto } from "../daemon/api.js";

export interface AdapterOutgoingMessage {
  sourceName: string;
  messageId: string;
  parentMessageId?: string | null;
  type: MessageType;
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
  | "codex_turn_start_timeout"
  | "codex_jsonrpc_error";

export type AdapterInjectResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: AdapterInjectFailureReason;
      message: string;
      jsonRpcCode?: number;
    };

export interface AgentAdapter {
  kind: AgentKind;
  inject(input: AdapterInjectInput): Promise<AdapterInjectResult>;
}
