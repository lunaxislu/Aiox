import type { AgentKind } from "./agents.js";

export const pairStatuses = ["pending", "ready", "stale"] as const;

export type PairStatus = (typeof pairStatuses)[number];

export interface Pair {
  id: string;
  name: string;
  status: PairStatus;
}

export interface CreatePairReservationRequest {
  id: string;
  name: string;
}

export interface CreatePairReservationResult {
  pair: Pair;
  agents: [];
}

export interface PairAttachment {
  pairId: string;
  agentId: string;
  kind: AgentKind;
}

export type AttachAgentToPairResult =
  | {
      ok: true;
      attachment: PairAttachment;
    }
  | {
      ok: false;
      reason: "pair_kind_slot_occupied";
      existing: PairAttachment;
    };

export function createPairReservation(
  request: CreatePairReservationRequest,
): CreatePairReservationResult {
  return {
    pair: {
      ...request,
      status: "pending",
    },
    agents: [],
  };
}

export function attachAgentToPair(
  attachments: readonly PairAttachment[],
  request: PairAttachment,
): AttachAgentToPairResult {
  const existing = attachments.find(
    (attachment) =>
      attachment.pairId === request.pairId && attachment.kind === request.kind,
  );

  if (existing) {
    return {
      ok: false,
      reason: "pair_kind_slot_occupied",
      existing,
    };
  }

  return {
    ok: true,
    attachment: request,
  };
}

export function getPairStatus(
  attachments: readonly PairAttachment[],
): PairStatus {
  const attachedKinds = new Set(attachments.map((attachment) => attachment.kind));

  if (attachedKinds.has("codex") && attachedKinds.has("claude")) {
    return "ready";
  }

  return "pending";
}
