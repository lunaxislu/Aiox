import { describe, expect, it } from "vitest";

import {
  attachAgentToPair,
  createPairReservation,
  getPairStatus,
  type PairAttachment,
} from "../../../src/core/pairs.js";

type PairSlot = "a" | "b";
type SlottedPairAttachment = PairAttachment & { slot: PairSlot };

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

  it("allows attaching a second agent of the same kind to the open slot", () => {
    const existing: PairAttachment = {
      pairId: "pair-1",
      agentId: "agent-1",
      kind: "codex",
      slot: "a",
    };

    const request: PairAttachment = {
      pairId: "pair-1",
      agentId: "agent-2",
      kind: "codex",
    };

    const result = attachAgentToPair([existing], {
      pairId: "pair-1",
      agentId: "agent-2",
      kind: "codex",
    });

    expect(result).toEqual({
      ok: true,
      attachment: { ...request, slot: "b" },
    });
  });

  it("allows attaching the other expected kind to the same pair", () => {
    const existing: PairAttachment = {
      pairId: "pair-1",
      agentId: "agent-1",
      kind: "codex",
      slot: "a",
    };

    const request: PairAttachment = {
      pairId: "pair-1",
      agentId: "agent-2",
      kind: "claude",
    };

    const result = attachAgentToPair([existing], request);

    expect(result).toEqual({
      ok: true,
      attachment: { ...request, slot: "b" },
    });
  });

  it("keeps a pair pending when only one side is attached", () => {
    const result = getPairStatus([
      {
        pairId: "pair-1",
        agentId: "agent-1",
        kind: "codex",
        slot: "a",
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
        slot: "a",
      },
      {
        pairId: "pair-1",
        agentId: "agent-2",
        kind: "claude",
        slot: "b",
      },
    ]);

    expect(result).toBe("ready");
  });

  describe("slot-based generalization", () => {
    it("allows two distinct Codex agents to occupy both slots and become ready", () => {
      const first: SlottedPairAttachment = {
        pairId: "pair-1",
        agentId: "agent-codex-a",
        kind: "codex",
        slot: "a",
      };
      const second: SlottedPairAttachment = {
        pairId: "pair-1",
        agentId: "agent-codex-b",
        kind: "codex",
        slot: "b",
      };

      expect(attachAgentToPair([], first)).toEqual({
        ok: true,
        attachment: first,
      });
      expect(attachAgentToPair([first], second)).toEqual({
        ok: true,
        attachment: second,
      });
      expect(getPairStatus([first, second])).toBe("ready");
    });

    it("allows two distinct Claude agents to occupy both slots and become ready", () => {
      const first: SlottedPairAttachment = {
        pairId: "pair-1",
        agentId: "agent-claude-a",
        kind: "claude",
        slot: "a",
      };
      const second: SlottedPairAttachment = {
        pairId: "pair-1",
        agentId: "agent-claude-b",
        kind: "claude",
        slot: "b",
      };

      expect(attachAgentToPair([], first)).toEqual({
        ok: true,
        attachment: first,
      });
      expect(attachAgentToPair([first], second)).toEqual({
        ok: true,
        attachment: second,
      });
      expect(getPairStatus([first, second])).toBe("ready");
    });

    it("rejects attaching the same agent id to the second slot", () => {
      const existing: SlottedPairAttachment = {
        pairId: "pair-1",
        agentId: "agent-codex",
        kind: "codex",
        slot: "a",
      };
      const request: SlottedPairAttachment = {
        pairId: "pair-1",
        agentId: "agent-codex",
        kind: "codex",
        slot: "b",
      };

      expect(attachAgentToPair([existing], request)).toEqual({
        ok: false,
        reason: "agent_already_attached",
        existing,
      });
    });

    it("rejects an explicit slot request when that slot is already occupied", () => {
      const existing: SlottedPairAttachment = {
        pairId: "pair-1",
        agentId: "agent-codex-a",
        kind: "codex",
        slot: "a",
      };
      const request: SlottedPairAttachment = {
        pairId: "pair-1",
        agentId: "agent-claude-b",
        kind: "claude",
        slot: "a",
      };

      expect(attachAgentToPair([existing], request)).toEqual({
        ok: false,
        reason: "pair_slot_occupied",
        existing,
      });
    });

    it("rejects auto-slot attach when both slots are occupied", () => {
      const existing: SlottedPairAttachment[] = [
        {
          pairId: "pair-1",
          agentId: "agent-codex-a",
          kind: "codex",
          slot: "a",
        },
        {
          pairId: "pair-1",
          agentId: "agent-codex-b",
          kind: "codex",
          slot: "b",
        },
      ];
      const request: PairAttachment = {
        pairId: "pair-1",
        agentId: "agent-claude-c",
        kind: "claude",
      };

      expect(attachAgentToPair(existing, request)).toEqual({
        ok: false,
        reason: "pair_full",
      });
    });

    it("auto-slot attach picks slot a first when both slots are empty", () => {
      const request: PairAttachment = {
        pairId: "pair-1",
        agentId: "agent-codex-a",
        kind: "codex",
      };

      expect(attachAgentToPair([], request)).toEqual({
        ok: true,
        attachment: {
          ...request,
          slot: "a",
        },
      });
    });
  });
});
