import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/core/public-ids.js", () => ({
  createPublicMessageId: vi.fn(() => "message-test"),
}));

import { createCodexIngressMcpServer } from "../../../src/adapters/codex/mcp-server.js";
import { createClaudeChannelMcpServer } from "../../../src/adapters/claude/channel-server.js";

// ---------------------------------------------------------------------------
// G1-C W2 — cross-adapter public MCP contract parity
//
// Codex and Claude must expose the same public messaging tool names (`send`,
// `reply`) and the same success result shape (`{ ok: true, message_id,
// dispatch? }`). Codex additionally retains its own manual retransmit tool;
// that tool is not part of the common contract and is asserted separately.
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
      close() {},
    }),
  });
}

describe("cross-adapter public MCP tool contract parity", () => {
  it("Codex and Claude register only send/reply as the common messaging tools", () => {
    const codexTools = Object.keys(registeredTools(fakeCodexServer()));
    const claudeTools = Object.keys(registeredTools(fakeClaudeServer()));

    expect(codexTools).toEqual(
      expect.arrayContaining(["send", "reply", "aiox_retransmit_unconfirmed_delivery"]),
    );
    expect(codexTools).not.toContain("aiox_send_message");
    expect(codexTools).not.toContain("aiox_reply");

    expect(claudeTools.sort()).toEqual(["reply", "send"]);
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
