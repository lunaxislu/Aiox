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
  slot?: PairSlot;
}

export type PairSlot = "a" | "b";

export type AttachAgentToPairResult =
  | {
      ok: true;
      attachment: PairAttachment & { slot: PairSlot };
    }
  | {
      ok: false;
      reason: "agent_already_attached" | "pair_slot_occupied";
      existing: PairAttachment;
    }
  | {
      ok: false;
      reason: "pair_full";
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
  const alreadyAttached = attachments.find(
    (attachment) =>
      attachment.pairId === request.pairId && attachment.agentId === request.agentId,
  );

  if (alreadyAttached) {
    return {
      ok: false,
      reason: "agent_already_attached",
      existing: alreadyAttached,
    };
  }

  const requestedSlot = request.slot ?? pickFirstOpenSlot(attachments);

  if (!requestedSlot) {
    return {
      ok: false,
      reason: "pair_full",
    };
  }

  const existing = attachments.find(
    (attachment) =>
      attachment.pairId === request.pairId && attachment.slot === requestedSlot,
  );

  if (existing) {
    return {
      ok: false,
      reason: "pair_slot_occupied",
      existing,
    };
  }

  return {
    ok: true,
    attachment: {
      ...request,
      slot: requestedSlot,
    },
  };
}

export function getPairStatus(
  attachments: readonly PairAttachment[],
): PairStatus {
  const slots = new Set(attachments.map((attachment) => attachment.slot));

  if (attachments.length === 2 && slots.has("a") && slots.has("b")) {
    return "ready";
  }

  return "pending";
}

function pickFirstOpenSlot(attachments: readonly PairAttachment[]): PairSlot | null {
  const slots = new Set(attachments.map((attachment) => attachment.slot));

  if (!slots.has("a")) {
    return "a";
  }

  if (!slots.has("b")) {
    return "b";
  }

  return null;
}
