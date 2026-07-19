import { describe, expect, it } from "vitest";

import {
  AIOX_REPLY_DESCRIPTION,
  AIOX_SEND_MESSAGE_DESCRIPTION,
  CODEX_INGRESS_INSTRUCTIONS,
  type CodexIngressDaemonClient,
  createCodexIngressMcpServer,
  createReplyHandler,
  createSendMessageHandler,
  parseCodexIngressEnv,
  runCodexIngressMcpServerWithDependencies,
  typedReplyInputSchema,
  typedSendInputSchema,
} from "../../../src/adapters/codex/mcp-server.js";
import type { DispatchSummary } from "../../../src/daemon/state.js";
import {
  typedReplyErrorFixtures,
  typedInvalidInputFixtures,
  typedSendAcceptedFixture,
} from "../../fixtures/aiox-message-lifecycle-contract.js";

describe("codex MCP server — handlers", () => {
  it("rejects a typed send missing replyExpected before daemon mapping", () => {
    const result = typedSendInputSchema.safeParse({
      type: "question",
      intent: "delegation",
      content: { text: "hello" },
    });

    expect(result.success).toBe(false);
  });

  it("rejects caller-supplied content.mediaType", () => {
    const result = typedSendInputSchema.safeParse({
      type: "question",
      intent: "delegation",
      replyExpected: true,
      content: { mediaType: "text/plain", text: "hello" },
    });

    expect(result.success).toBe(false);
  });

  it("keeps accepted and reply-error contract fixtures in the typed revision", () => {
    expect(typedSendInputSchema.safeParse(typedSendAcceptedFixture.input).success).toBe(true);
    expect(typedSendAcceptedFixture.result).toMatchObject({ status: "accepted" });
    expect(typedReplyErrorFixtures.map((fixture) => fixture.result.error.code)).toEqual([
      "reply_not_expected",
      "correlation_mismatch",
      "duplicate_reply",
      "unknown_delivery",
    ]);
  });

  it("rejects invalid typed contract fixtures", () => {
    expect(
      typedInvalidInputFixtures.every((fixture) => {
        const schema = fixture.kind === "send" ? typedSendInputSchema : typedReplyInputSchema;
        return !schema.safeParse(fixture.input).success;
      }),
    ).toBe(true);
  });

  it("keeps Codex collaboration instructions on the typed tool revision", () => {
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("<aiox-channel");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("message_id");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain(
      "aiox_reply(inReplyToDeliveryId, intent, replyExpected, content)",
    );
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain(
      "aiox_send_message(type, intent, replyExpected, content)",
    );
    expect(CODEX_INGRESS_INSTRUCTIONS).not.toContain("parent_message_id");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("Language Policy");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("User-Requested Collaboration");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("intent");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("replyExpected");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("inReplyToDeliveryId");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("Multi-round Discussion");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("Bad, do not send");
    expect(CODEX_INGRESS_INSTRUCTIONS).not.toContain("- an instruction");
    expect(AIOX_REPLY_DESCRIPTION).toContain("delivery ID");
    expect(AIOX_REPLY_DESCRIPTION).toContain("inReplyToDeliveryId");
    expect(AIOX_REPLY_DESCRIPTION).toContain("concrete");
    expect(AIOX_SEND_MESSAGE_DESCRIPTION).toContain("replyExpected");
    expect(AIOX_SEND_MESSAGE_DESCRIPTION).toContain("new aiox thread");
    expect(AIOX_SEND_MESSAGE_DESCRIPTION).toContain("expected output");
  });

  it("aiox_send_message maps a typed send request through receiveCodexMessage", async () => {
    const calls: { method: string; args: unknown }[] = [];
    const handler = createSendMessageHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createMessageId: () => "msg-fixed",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexMessage: async (args) => {
            calls.push({ method: "receiveCodexMessage", args });
            return successCodexMessageResponse("msg-fixed");
          },
        }),
    });

    const result = await handler({
      type: "instruction",
      intent: "delegation",
      replyExpected: true,
      content: { text: "hello" },
    });

    expect(result.structuredContent).toMatchObject({ ok: true, message_id: "msg-fixed" });
    expect(calls).toEqual([
      {
        method: "receiveCodexMessage",
        args: {
          agentName: "impl",
          token: "token-1",
          messageId: "msg-fixed",
          type: "instruction",
          intent: "delegation",
          replyExpected: true,
          content: { text: "hello" },
        },
      },
    ]);
  });

  it("aiox_send_message exposes delivered daemon dispatch in structured content", async () => {
    const dispatch = deliveredDispatch();
    const handler = createSendMessageHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createMessageId: () => "msg-fixed",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexMessage: async () =>
            successCodexMessageResponse("msg-fixed", dispatch),
        }),
    });

    const result = await handler(typedSend("hello"));

    expect(result.structuredContent).toEqual({
      ok: true,
      message_id: "msg-fixed",
      dispatch,
    });
  });

  it("aiox_send_message exposes deferred daemon dispatch in structured content", async () => {
    const dispatch = deferredBindingDispatch();
    const handler = createSendMessageHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createMessageId: () => "msg-fixed",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexMessage: async () =>
            successCodexMessageResponse("msg-fixed", dispatch),
        }),
    });

    const result = await handler(typedSend("hello"));

    expect(result.structuredContent).toEqual({
      ok: true,
      message_id: "msg-fixed",
      dispatch,
    });
  });

  it("aiox_reply maps a typed reply request through receiveCodexReply", async () => {
    const calls: { method: string; args: unknown }[] = [];
    const handler = createReplyHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createMessageId: () => "reply-fixed",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexReply: async (args) => {
            calls.push({ method: "receiveCodexReply", args });
            return successCodexMessageResponse("reply-fixed");
          },
        }),
    });

    const result = await handler({
      inReplyToDeliveryId: "delivery-1",
      intent: "result",
      replyExpected: false,
      content: { text: "ack" },
    });

    expect(result.structuredContent).toMatchObject({ ok: true, message_id: "reply-fixed" });
    expect(calls).toEqual([
      {
        method: "receiveCodexReply",
        args: {
          agentName: "impl",
          token: "token-1",
          messageId: "reply-fixed",
          inReplyToDeliveryId: "delivery-1",
          intent: "result",
          replyExpected: false,
          content: { text: "ack" },
        },
      },
    ]);
  });

  it("aiox_reply exposes delivered daemon dispatch in structured content", async () => {
    const dispatch = deliveredDispatch();
    const handler = createReplyHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createMessageId: () => "reply-fixed",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexReply: async () =>
            successCodexMessageResponse("reply-fixed", dispatch),
        }),
    });

    const result = await handler(typedReply("ack"));

    expect(result.structuredContent).toEqual({
      ok: true,
      message_id: "reply-fixed",
      dispatch,
    });
  });

  it("aiox_reply exposes deferred daemon dispatch in structured content", async () => {
    const dispatch = deferredBindingDispatch();
    const handler = createReplyHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createMessageId: () => "reply-fixed",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexReply: async () =>
            successCodexMessageResponse("reply-fixed", dispatch),
        }),
    });

    const result = await handler(typedReply("ack"));

    expect(result.structuredContent).toEqual({
      ok: true,
      message_id: "reply-fixed",
      dispatch,
    });
  });

  it("daemon typed reject maps to MCP tool execution error", async () => {
    const handler = createSendMessageHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createMessageId: () => "msg-fixed",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexMessage: async () => ({
            ok: false,
            reason: "codex_ingress_unauthorized",
            detail: "token_mismatch",
          }),
        }),
    });

    const result = await handler(typedSend("hello"));

    expect(result.isError).toBe(true);
    const text = (result.content?.[0] as { text?: string } | undefined)?.text ?? "";
    expect(text).toContain("codex_ingress_unauthorized");
  });

  it("daemon socket error maps to daemon_call_failed", async () => {
    const handler = createSendMessageHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createMessageId: () => "msg-fixed",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexMessage: async () => {
            throw new Error("ECONNREFUSED");
          },
        }),
    });

    const result = await handler(typedSend("hi"));

    expect(result.isError).toBe(true);
    const text = (result.content?.[0] as { text?: string } | undefined)?.text ?? "";
    expect(text).toContain("daemon_call_failed");
  });

  it("closes the daemon client after every tool call", async () => {
    let closed = 0;
    const handler = createSendMessageHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createMessageId: () => "msg-fixed",
      createDaemonClient: () => ({
        ...fakeDaemonClient(),
        close: () => {
          closed += 1;
        },
      }),
    });

    await handler(typedSend("hi"));
    await handler(typedSend("again"));

    expect(closed).toBe(2);
  });
});

function typedSend(text: string) {
  return {
    type: "question" as const,
    intent: "discussion" as const,
    replyExpected: false,
    content: { text },
  };
}

function typedReply(text: string) {
  return {
    inReplyToDeliveryId: "delivery-1",
    intent: "result" as const,
    replyExpected: false,
    content: { text },
  };
}

describe("codex MCP server — factory", () => {
  it("constructs a McpServer instance with the expected name", () => {
    const mcp = createCodexIngressMcpServer({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () => fakeDaemonClient(),
    });

    expect(mcp).toBeDefined();
    // server property is the underlying low-level Server instance
    expect((mcp as unknown as { server: unknown }).server).toBeDefined();
  });
});

describe("codex MCP server — startup", () => {
  it("connects stdio MCP before registering with the daemon", async () => {
    const events: string[] = [];

    await runCodexIngressMcpServerWithDependencies({
      env: {
        AIOX_CODEX_AGENT_NAME: "impl",
        AIOX_CODEX_AGENT_TOKEN: "token-1",
        AIOX_SOCKET_PATH: "/tmp/test.sock",
      },
      createMcpServer: () => ({
        connect: async () => {
          events.push("connect");
        },
      }),
      createTransport: () => ({}),
      createDaemonClient: () =>
        fakeDaemonClient({
          registerCodexChannel: async () => {
            events.push("register");
            return successRegisterCodexChannelResponse();
          },
        }),
      log: () => {},
    });

    expect(events).toEqual(["connect", "register"]);
  });

  it("keeps the MCP process alive when daemon registration fails after connect", async () => {
    const events: string[] = [];
    const logs: { event: string; fields: Record<string, unknown> }[] = [];

    await runCodexIngressMcpServerWithDependencies({
      env: {
        AIOX_CODEX_AGENT_NAME: "impl",
        AIOX_CODEX_AGENT_TOKEN: "bad-token",
        AIOX_SOCKET_PATH: "/tmp/test.sock",
      },
      createMcpServer: () => ({
        connect: async () => {
          events.push("connect");
        },
      }),
      createTransport: () => ({}),
      createDaemonClient: () =>
        fakeDaemonClient({
          registerCodexChannel: async () => {
            events.push("register");
            return {
              ok: false as const,
              reason: "codex_channel_registration_failed" as const,
              detail: "token_mismatch",
            };
          },
        }),
      log: (event, fields) => logs.push({ event, fields }),
    });

    expect(events).toEqual(["connect", "register"]);
    expect(logs).toContainEqual({
      event: "codex_mcp_register_failed",
      fields: {
        result: {
          ok: false,
          reason: "codex_channel_registration_failed",
          detail: "token_mismatch",
        },
      },
    });
  });

  it("keeps the MCP server process alive until the stdio transport closes", async () => {
    const transport: { onclose?: () => void } = { onclose: undefined };
    let settled = false;

    const running = runCodexIngressMcpServerWithDependencies({
      env: {
        AIOX_CODEX_AGENT_NAME: "impl",
        AIOX_CODEX_AGENT_TOKEN: "token-1",
        AIOX_SOCKET_PATH: "/tmp/test.sock",
      },
      createMcpServer: () => ({
        connect: async () => {},
      }),
      createTransport: () => transport,
      createDaemonClient: () => fakeDaemonClient(),
      log: () => {},
    }).then(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(settled).toBe(false);

    transport.onclose?.();
    await running;
    expect(settled).toBe(true);
  });
});

describe("codex MCP server — env parsing", () => {
  it("parses required env vars", () => {
    const env = parseCodexIngressEnv({
      AIOX_CODEX_AGENT_NAME: "impl",
      AIOX_CODEX_AGENT_TOKEN: "token-1",
      AIOX_SOCKET_PATH: "/tmp/sock",
    });
    expect(env).toEqual({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/sock",
    });
  });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function fakeDaemonClient(
  overrides: Partial<
    Pick<
      CodexIngressDaemonClient,
      "receiveCodexMessage" | "receiveCodexReply" | "registerCodexChannel"
    >
  > = {},
): CodexIngressDaemonClient {
  return {
    receiveCodexMessage:
      overrides.receiveCodexMessage ??
      (async () => successCodexMessageResponse("msg-default")),
    receiveCodexReply:
      overrides.receiveCodexReply ??
      (async () => successCodexMessageResponse("reply-default")),
    registerCodexChannel:
      overrides.registerCodexChannel ?? (async () => successRegisterCodexChannelResponse()),
    close() {
      /* no-op */
    },
  };
}

function successRegisterCodexChannelResponse() {
  return {
    ok: true as const,
    runtime: {
      agentName: "impl",
      registeredAt: "2026-05-23T00:00:00.000Z",
      tokenHash: "token-hash",
    },
  };
}

function successCodexMessageResponse(
  messageId: string,
  dispatch: DispatchSummary = emptyDispatch(),
) {
  return {
    ok: true as const,
    messageId,
    message: {
      id: messageId,
      sourceAgentId: "agent-source",
      parentMessageId: null,
      type: "question" as const,
      content: "content",
    },
    deliveries: [],
    dispatch,
  };
}

function emptyDispatch(): DispatchSummary {
  return {
    delivered: 0,
    deferred: [],
    failed: [],
  };
}

function deliveredDispatch(): DispatchSummary {
  return {
    delivered: 1,
    deferred: [],
    failed: [],
  };
}

function deferredBindingDispatch(): DispatchSummary {
  return {
    delivered: 0,
    deferred: [
      {
        targetAgentId: "agent-target",
        reason: "target_binding_unconfirmed",
        eligibility: "requires target codex binding",
      },
    ],
    failed: [],
  };
}
