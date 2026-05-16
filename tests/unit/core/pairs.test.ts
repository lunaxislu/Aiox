import { describe, expect, it } from "vitest";

import {
  attachAgentToPair,
  createPairReservation,
  getPairStatus,
  type PairAttachment,
} from "../../../src/core/pairs.js";

describe("Pair reservation lifecycle", () => {
  it("creates a pair reservation without creating agent instances", () => {
    const result = createPairReservation({
      id: "pair-1",
      name: "feature-x",
    });

    expect(result).toEqual({
      pair: {
        id: "pair-1",
        name: "feature-x",
        status: "pending",
      },
      agents: [],
    });
  });

  it("rejects attaching a second agent of the same kind to a pair", () => {
    const existing: PairAttachment = {
      pairId: "pair-1",
      agentId: "agent-1",
      kind: "codex",
    };

    const result = attachAgentToPair([existing], {
      pairId: "pair-1",
      agentId: "agent-2",
      kind: "codex",
    });

    expect(result).toEqual({
      ok: false,
      reason: "pair_kind_slot_occupied",
      existing,
    });
  });

  it("allows attaching the other expected kind to the same pair", () => {
    const existing: PairAttachment = {
      pairId: "pair-1",
      agentId: "agent-1",
      kind: "codex",
    };

    const request: PairAttachment = {
      pairId: "pair-1",
      agentId: "agent-2",
      kind: "claude",
    };

    const result = attachAgentToPair([existing], request);

    expect(result).toEqual({
      ok: true,
      attachment: request,
    });
  });

  it("keeps a pair pending when only one side is attached", () => {
    const result = getPairStatus([
      {
        pairId: "pair-1",
        agentId: "agent-1",
        kind: "codex",
      },
    ]);

    expect(result).toBe("pending");
  });

  it("marks a pair ready when codex and claude are both attached", () => {
    const result = getPairStatus([
      {
        pairId: "pair-1",
        agentId: "agent-1",
        kind: "codex",
      },
      {
        pairId: "pair-1",
        agentId: "agent-2",
        kind: "claude",
      },
    ]);

    expect(result).toBe("ready");
  });
});
