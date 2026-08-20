import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/core/public-ids.js", () => ({
  createPublicMessageId: vi.fn(() => "message-test"),
}));

import { createCodexIngressMcpServer } from "../../../src/adapters/codex/mcp-server.js";
import { createClaudeChannelMcpServer } from "../../../src/adapters/claude/channel-server.js";

// ---------------------------------------------------------------------------
// G1-C W2/W5 — cross-adapter public MCP contract parity
//
// Codex and Claude must expose the same public messaging tool names (`send`,
// `reply`) and the same success result shape (`{ ok: true, message_id,
// dispatch? }`). `aiox_retransmit_unconfirmed_delivery` is not part of that
// send/reply common messaging pair — it is a separate, confirmation-gated
// recovery tool — but it is provided symmetrically on both adapters with the
// same input/output schema, and its parity is asserted separately below.
// ---------------------------------------------------------------------------

interface StandardSchemaLike {
  parse(value: unknown): unknown;
  safeParse(value: unknown): { success: boolean };
}

function registeredTools(
  mcp: unknown,
): Record<string, { inputSchema: StandardSchemaLike; outputSchema: StandardSchemaLike }> {
  return (
    mcp as {
      _registeredTools: Record<
        string,
        { inputSchema: StandardSchemaLike; outputSchema: StandardSchemaLike }
      >;
    }
  )._registeredTools;
}

function fakeCodexServer() {
  return createCodexIngressMcpServer({
    agentName: "impl",
    agentToken: "token-1",
    daemonSocketPath: "/tmp/test.sock",
    createDaemonClient: () => ({
      receiveCodexMessage: async () => {
        throw new Error("unused in schema-only tests");
      },
      receiveCodexReply: async () => {
        throw new Error("unused in schema-only tests");
      },
      retransmitUnconfirmedDelivery: async () => {
        throw new Error("unused in schema-only tests");
      },
      registerCodexChannel: async () => {
        throw new Error("unused in schema-only tests");
      },
      listReachablePeers: async () => {
        throw new Error("unused in schema-only tests");
      },
      close() {},
    }),
  });
}

function fakeClaudeServer() {
  return createClaudeChannelMcpServer({
    agentName: "reviewer",
    daemonSocketPath: "/tmp/aiox.sock",
    createDaemonClient: () => ({
      receiveClaudeChannelMessage: async () => {
        throw new Error("unused in schema-only tests");
      },
      receiveClaudeChannelReply: async () => {
        throw new Error("unused in schema-only tests");
      },
      retransmitUnconfirmedDelivery: async () => {
        throw new Error("unused in schema-only tests");
      },
      listReachablePeers: async () => {
        throw new Error("unused in schema-only tests");
      },
      close() {},
    }),
  });
}

describe("cross-adapter public MCP tool contract parity", () => {
  it("Codex and Claude register exactly send, reply, aiox_retransmit_unconfirmed_delivery, agents_list", () => {
    const expectedTools = [
      "send",
      "reply",
      "aiox_retransmit_unconfirmed_delivery",
      "agents_list",
    ].sort();
    const codexTools = Object.keys(registeredTools(fakeCodexServer())).sort();
    const claudeTools = Object.keys(registeredTools(fakeClaudeServer())).sort();

    expect(codexTools).toEqual(expectedTools);
    expect(claudeTools).toEqual(expectedTools);
  });

  it("Codex and Claude send return the same accepted result shape", () => {
    const example = {
      ok: true as const,
      message_id: "message-1",
      dispatch: { delivered: 1, deferred: [], failed: [] },
    };

    const codexSchema = registeredTools(fakeCodexServer()).send!.outputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).send!.outputSchema;

    expect(codexSchema.parse(example)).toEqual(example);
    expect(claudeSchema.parse(example)).toEqual(example);
  });

  it("Codex and Claude preserve the optional Claude boot-failure cause in dispatch output", () => {
    const example = {
      ok: true as const,
      message_id: "message-1",
      dispatch: {
        delivered: 0,
        deferred: [
          {
            targetAgentId: "agent-target",
            reason: "target_runtime_unavailable",
            cause: "claude_channel_port_in_use",
          },
        ],
        failed: [],
      },
    };

    expect(
      registeredTools(fakeCodexServer()).send!.outputSchema.parse(example),
    ).toEqual(example);
    expect(
      registeredTools(fakeClaudeServer()).send!.outputSchema.parse(example),
    ).toEqual(example);
  });

  it("Codex and Claude reply return the same accepted result shape, including message_id", () => {
    const example = {
      ok: true as const,
      message_id: "message-1",
      dispatch: { delivered: 1, deferred: [], failed: [] },
    };

    const codexSchema = registeredTools(fakeCodexServer()).reply!.outputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).reply!.outputSchema;

    expect(codexSchema.parse(example)).toEqual(example);
    // This is the currently-failing case this package fixes: Claude reply's
    // output schema historically dropped message_id.
    expect(claudeSchema.parse(example)).toEqual(example);
  });
});

describe("cross-adapter public MCP tool input-schema parity", () => {
  const validSendInput = {
    type: "instruction" as const,
    intent: "delegation" as const,
    replyExpected: true,
    content: { text: "review the diff" },
  };

  const validReplyInput = {
    inReplyToDeliveryId: "delivery-1",
    intent: "result" as const,
    replyExpected: false,
    content: { text: "here is the result" },
  };

  it("Codex and Claude send accept the same valid input", () => {
    const codexSchema = registeredTools(fakeCodexServer()).send!.inputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).send!.inputSchema;

    expect(codexSchema.parse(validSendInput)).toEqual(validSendInput);
    expect(claudeSchema.parse(validSendInput)).toEqual(validSendInput);
  });

  it("Codex and Claude reply accept the same valid input", () => {
    const codexSchema = registeredTools(fakeCodexServer()).reply!.inputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).reply!.inputSchema;

    expect(codexSchema.parse(validReplyInput)).toEqual(validReplyInput);
    expect(claudeSchema.parse(validReplyInput)).toEqual(validReplyInput);
  });

  it("Codex and Claude send reject an extra top-level field", () => {
    const withExtraField = { ...validSendInput, extra: "not part of the contract" };
    const codexSchema = registeredTools(fakeCodexServer()).send!.inputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).send!.inputSchema;

    expect(codexSchema.safeParse(withExtraField).success).toBe(false);
    expect(claudeSchema.safeParse(withExtraField).success).toBe(false);
  });

  it("Codex and Claude reply reject an extra top-level field", () => {
    const withExtraField = { ...validReplyInput, extra: "not part of the contract" };
    const codexSchema = registeredTools(fakeCodexServer()).reply!.inputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).reply!.inputSchema;

    expect(codexSchema.safeParse(withExtraField).success).toBe(false);
    expect(claudeSchema.safeParse(withExtraField).success).toBe(false);
  });

  it("Codex and Claude send reject a missing required field", () => {
    const { intent: _intent, ...missingIntent } = validSendInput;
    const codexSchema = registeredTools(fakeCodexServer()).send!.inputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).send!.inputSchema;

    expect(codexSchema.safeParse(missingIntent).success).toBe(false);
    expect(claudeSchema.safeParse(missingIntent).success).toBe(false);
  });

  it("Codex and Claude reply reject a missing required field", () => {
    const { inReplyToDeliveryId: _id, ...missingDeliveryId } = validReplyInput;
    const codexSchema = registeredTools(fakeCodexServer()).reply!.inputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).reply!.inputSchema;

    expect(codexSchema.safeParse(missingDeliveryId).success).toBe(false);
    expect(claudeSchema.safeParse(missingDeliveryId).success).toBe(false);
  });

  it("Codex and Claude send reject a wrong-typed field", () => {
    const wrongType = { ...validSendInput, replyExpected: "yes" };
    const codexSchema = registeredTools(fakeCodexServer()).send!.inputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).send!.inputSchema;

    expect(codexSchema.safeParse(wrongType).success).toBe(false);
    expect(claudeSchema.safeParse(wrongType).success).toBe(false);
  });

  it("Codex and Claude reply reject a wrong-typed field", () => {
    const wrongType = { ...validReplyInput, replyExpected: "yes" };
    const codexSchema = registeredTools(fakeCodexServer()).reply!.inputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).reply!.inputSchema;

    expect(codexSchema.safeParse(wrongType).success).toBe(false);
    expect(claudeSchema.safeParse(wrongType).success).toBe(false);
  });
});

describe("cross-adapter aiox_retransmit_unconfirmed_delivery input-schema parity", () => {
  const validRetransmitInput = {
    deliveryId: "delivery-1",
    confirmDuplicateRisk: true as const,
  };

  function retransmitInputSchemas() {
    return {
      codexSchema: registeredTools(fakeCodexServer()).aiox_retransmit_unconfirmed_delivery!
        .inputSchema,
      claudeSchema: registeredTools(fakeClaudeServer()).aiox_retransmit_unconfirmed_delivery!
        .inputSchema,
    };
  }

  it("Codex and Claude retransmit accept the same valid input", () => {
    const { codexSchema, claudeSchema } = retransmitInputSchemas();

    expect(codexSchema.parse(validRetransmitInput)).toEqual(validRetransmitInput);
    expect(claudeSchema.parse(validRetransmitInput)).toEqual(validRetransmitInput);
  });

  it("Codex and Claude retransmit reject confirmDuplicateRisk: false", () => {
    const input = { ...validRetransmitInput, confirmDuplicateRisk: false };
    const { codexSchema, claudeSchema } = retransmitInputSchemas();

    expect(codexSchema.safeParse(input).success).toBe(false);
    expect(claudeSchema.safeParse(input).success).toBe(false);
  });

  it("Codex and Claude retransmit reject a missing confirmDuplicateRisk", () => {
    const { confirmDuplicateRisk: _confirmDuplicateRisk, ...missingConfirm } = validRetransmitInput;
    const { codexSchema, claudeSchema } = retransmitInputSchemas();

    expect(codexSchema.safeParse(missingConfirm).success).toBe(false);
    expect(claudeSchema.safeParse(missingConfirm).success).toBe(false);
  });

  it("Codex and Claude retransmit reject an extra top-level field", () => {
    const withExtraField = { ...validRetransmitInput, extra: "not part of the contract" };
    const { codexSchema, claudeSchema } = retransmitInputSchemas();

    expect(codexSchema.safeParse(withExtraField).success).toBe(false);
    expect(claudeSchema.safeParse(withExtraField).success).toBe(false);
  });
});

describe("cross-adapter aiox_retransmit_unconfirmed_delivery output-schema parity", () => {
  function retransmitOutputSchemas() {
    return {
      codexSchema: registeredTools(fakeCodexServer()).aiox_retransmit_unconfirmed_delivery!
        .outputSchema,
      claudeSchema: registeredTools(fakeClaudeServer()).aiox_retransmit_unconfirmed_delivery!
        .outputSchema,
    };
  }

  it("Codex and Claude retransmit accept the same delivered result shape", () => {
    const example = { ok: true as const, message_id: "message-1" };
    const { codexSchema, claudeSchema } = retransmitOutputSchemas();

    expect(codexSchema.parse(example)).toEqual(example);
    expect(claudeSchema.parse(example)).toEqual(example);
  });

  it("Codex and Claude retransmit accept the same unconfirmed result shape", () => {
    const example = {
      ok: false as const,
      reason: "manual_retransmit_unconfirmed" as const,
      message_id: "message-1",
    };
    const { codexSchema, claudeSchema } = retransmitOutputSchemas();

    expect(codexSchema.parse(example)).toEqual(example);
    expect(claudeSchema.parse(example)).toEqual(example);
  });
});

describe("cross-adapter agents_list schema parity", () => {
  it("Codex and Claude agents_list accept the same empty input", () => {
    const codexSchema = registeredTools(fakeCodexServer()).agents_list!.inputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).agents_list!.inputSchema;

    expect(codexSchema.parse({})).toEqual({});
    expect(claudeSchema.parse({})).toEqual({});
  });

  it("Codex and Claude agents_list reject an extra top-level field", () => {
    const codexSchema = registeredTools(fakeCodexServer()).agents_list!.inputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).agents_list!.inputSchema;

    expect(codexSchema.safeParse({ extra: "nope" }).success).toBe(false);
    expect(claudeSchema.safeParse({ extra: "nope" }).success).toBe(false);
  });

  it("Codex and Claude agents_list accept the same peers-populated result shape", () => {
    const example = {
      peers: [
        { name: "claude-frontend", type: "claude-code", role: "frontend", description: "renders the UI" },
        { name: "qa-bot", type: "codex", role: null, description: null },
      ],
    };
    const codexSchema = registeredTools(fakeCodexServer()).agents_list!.outputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).agents_list!.outputSchema;

    expect(codexSchema.parse(example)).toEqual(example);
    expect(claudeSchema.parse(example)).toEqual(example);
  });

  it("Codex and Claude agents_list accept the same empty-peers result shape", () => {
    const example = { peers: [] };
    const codexSchema = registeredTools(fakeCodexServer()).agents_list!.outputSchema;
    const claudeSchema = registeredTools(fakeClaudeServer()).agents_list!.outputSchema;

    expect(codexSchema.parse(example)).toEqual(example);
    expect(claudeSchema.parse(example)).toEqual(example);
  });
});
