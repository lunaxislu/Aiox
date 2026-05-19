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

export type AdapterInjectResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "adapter_inject_failed";
      message: string;
    };

export interface AgentAdapter {
  kind: AgentKind;
  inject(input: AdapterInjectInput): Promise<AdapterInjectResult>;
}
