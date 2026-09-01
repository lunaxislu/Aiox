import { describe, expect, it, vi } from "vitest";

vi.mock("../../../src/core/public-ids.js", () => ({
  createPublicMessageId: vi.fn(() => "message-test"),
}));

import {
  AIOX_AGENTS_LIST_DESCRIPTION,
  AIOX_REPLY_DESCRIPTION,
  AIOX_SEND_MESSAGE_DESCRIPTION,
  CODEX_INGRESS_INSTRUCTIONS,
  agentsListInputSchema,
  agentsListOutputSchema,
  type CodexIngressDaemonClient,
  createAgentsListHandler,
  createCodexIngressMcpServer,
  retransmitUnconfirmedDeliveryInputSchema,
  createReplyHandler,
  createRetransmitUnconfirmedDeliveryHandler,
  createSendMessageHandler,
  parseCodexIngressEnv,
  runCodexIngressMcpServerWithDependencies,
  typedReplyInputSchema,
  typedSendInputSchema,
} from "../../../src/adapters/codex/mcp-server.js";
import type { DispatchSummary } from "../../../src/daemon/state.js";
import { createPublicMessageId } from "../../../src/core/public-ids.js";
import {
  typedReplyErrorFixtures,
  typedInvalidInputFixtures,
  typedSendAcceptedFixture,
} from "../../fixtures/aiox-message-lifecycle-contract.js";

describe("codex MCP server — handlers", () => {
  it("requires an explicit duplicate-risk confirmation for manual retransmit", () => {
    expect(
      retransmitUnconfirmedDeliveryInputSchema.safeParse({
        deliveryId: "delivery-1",
      }).success,
    ).toBe(false);
    expect(
      retransmitUnconfirmedDeliveryInputSchema.safeParse({
        deliveryId: "delivery-1",
        confirmDuplicateRisk: true,
      }).success,
    ).toBe(true);
  });

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
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("raw canonical AIOX envelope JSON document");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain(
      "intent: \"notification\" is a daemon-authored outcome event, not a reply",
    );
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("outcomeForDeliveryId");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain(
      "creates no reply right; do not use reply for a notification",
    );
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain(
      "Use outcomeForDeliveryId only to correlate the outcome it reports",
    );
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain(
      "reply(inReplyToDeliveryId, intent, replyExpected, content)",
    );
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain(
      "send(type, intent, replyExpected, content)",
    );
    expect(CODEX_INGRESS_INSTRUCTIONS).not.toContain("aiox_send_message");
    expect(CODEX_INGRESS_INSTRUCTIONS).not.toContain("aiox_reply(");
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

  it("send maps a typed send request through receiveCodexMessage", async () => {
    const calls: { method: string; args: unknown }[] = [];
    const handler = createSendMessageHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexMessage: async (args) => {
            calls.push({ method: "receiveCodexMessage", args });
            return successCodexMessageResponse("message-test");
          },
        }),
    });

    const result = await handler({
      type: "instruction",
      intent: "delegation",
      replyExpected: true,
      content: { text: "hello" },
    });

    expect(result.structuredContent).toMatchObject({ ok: true, message_id: "message-test" });
    expect(calls).toEqual([
      {
        method: "receiveCodexMessage",
        args: {
          agentName: "impl",
          token: "token-1",
          messageId: "message-test",
          type: "instruction",
          intent: "delegation",
          replyExpected: true,
          content: { text: "hello" },
        },
      },
    ]);
  });

  it("issues one source message ID per Codex send invocation and forwards each exact value", async () => {
    const issue = vi.mocked(createPublicMessageId);
    issue.mockReset();
    issue.mockReturnValueOnce("opaque send id one").mockReturnValueOnce("opaque send id two");
    const calls: unknown[] = [];
    const handler = createSendMessageHandler({ agentName: "impl", agentToken: "token-1", daemonSocketPath: "/tmp/test.sock", createDaemonClient: () => fakeDaemonClient({ receiveCodexMessage: async (request) => { calls.push(request); return successCodexMessageResponse(request.messageId); } }) });
    await handler(typedSend("first"));
    await handler(typedSend("second"));
    expect(issue).toHaveBeenCalledTimes(2);
    expect(calls).toHaveLength(2);
    expect(calls).toMatchObject([{ messageId: "opaque send id one" }, { messageId: "opaque send id two" }]);
    issue.mockReturnValue("message-test");
  });

  it("send exposes delivered daemon dispatch in structured content", async () => {
    const dispatch = deliveredDispatch();
    const handler = createSendMessageHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexMessage: async () =>
            successCodexMessageResponse("message-test", dispatch),
        }),
    });

    const result = await handler(typedSend("hello"));

    expect(result.structuredContent).toEqual({
      ok: true,
      message_id: "message-test",
      dispatch,
    });
  });

  it("send exposes deferred daemon dispatch in structured content", async () => {
    const dispatch = deferredBindingDispatch();
    const handler = createSendMessageHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexMessage: async () =>
            successCodexMessageResponse("message-test", dispatch),
        }),
    });

    const result = await handler(typedSend("hello"));

    expect(result.structuredContent).toEqual({
      ok: true,
      message_id: "message-test",
      dispatch,
    });
  });

  it("reply maps a typed reply request through receiveCodexReply", async () => {
    const calls: { method: string; args: unknown }[] = [];
    const handler = createReplyHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexReply: async (args) => {
            calls.push({ method: "receiveCodexReply", args });
            return successCodexMessageResponse("message-test");
          },
        }),
    });

    const result = await handler({
      inReplyToDeliveryId: "delivery-1",
      intent: "result",
      replyExpected: false,
      content: { text: "ack" },
    });

    expect(result.structuredContent).toMatchObject({ ok: true, message_id: "message-test" });
    expect(calls).toEqual([
      {
        method: "receiveCodexReply",
        args: {
          agentName: "impl",
          token: "token-1",
          messageId: "message-test",
          inReplyToDeliveryId: "delivery-1",
          intent: "result",
          replyExpected: false,
          content: { text: "ack" },
        },
      },
    ]);
  });

  it("issues one source message ID per Codex reply invocation and forwards each exact value", async () => {
    const issue = vi.mocked(createPublicMessageId);
    issue.mockReset();
    issue.mockReturnValueOnce("opaque reply id one").mockReturnValueOnce("opaque reply id two");
    const calls: unknown[] = [];
    const handler = createReplyHandler({ agentName: "impl", agentToken: "token-1", daemonSocketPath: "/tmp/test.sock", createDaemonClient: () => fakeDaemonClient({ receiveCodexReply: async (request) => { calls.push(request); return successCodexMessageResponse(request.messageId); } }) });
    await handler(typedReply("first"));
    await handler(typedReply("second"));
    expect(issue).toHaveBeenCalledTimes(2);
    expect(calls).toHaveLength(2);
    expect(calls).toMatchObject([{ messageId: "opaque reply id one" }, { messageId: "opaque reply id two" }]);
    issue.mockReturnValue("message-test");
  });

  it("reply exposes delivered daemon dispatch in structured content", async () => {
    const dispatch = deliveredDispatch();
    const handler = createReplyHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexReply: async () =>
            successCodexMessageResponse("message-test", dispatch),
        }),
    });

    const result = await handler(typedReply("ack"));

    expect(result.structuredContent).toEqual({
      ok: true,
      message_id: "message-test",
      dispatch,
    });
  });

  it("reply exposes deferred daemon dispatch in structured content", async () => {
    const dispatch = deferredBindingDispatch();
    const handler = createReplyHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexReply: async () =>
            successCodexMessageResponse("message-test", dispatch),
        }),
    });

    const result = await handler(typedReply("ack"));

    expect(result.structuredContent).toEqual({
      ok: true,
      message_id: "message-test",
      dispatch,
    });
  });

  it("daemon typed reject maps to MCP tool execution error", async () => {
    const handler = createSendMessageHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
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

  it.each([
    "unknown_delivery",
    "correlation_mismatch",
    "reply_not_expected",
    "duplicate_reply",
  ] as const)("reply relays %s as its MCP typed error", async (reason) => {
    const handler = createReplyHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () =>
        fakeDaemonClient({
          receiveCodexReply: async () => ({ ok: false, reason }),
        }),
    });

    const result = await handler(typedReply("reply"));

    expect(result.isError).toBe(true);
    expect((result.content?.[0] as { text?: string } | undefined)?.text).toContain(reason);
  });

  it("daemon socket error maps to daemon_call_failed", async () => {
    const handler = createSendMessageHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
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

describe("codex MCP server — agents_list handler", () => {
  it("has an empty input schema", () => {
    expect(agentsListInputSchema.safeParse({}).success).toBe(true);
    expect(agentsListInputSchema.safeParse({ extra: "nope" }).success).toBe(false);
  });

  it("forwards the calling agent's name and returns its sendable peers", async () => {
    let requestedAgentName: string | undefined;
    const handler = createAgentsListHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () =>
        fakeDaemonClient({
          listReachablePeers: async (request) => {
            requestedAgentName = request.agentName;
            return {
              ok: true,
              peers: [
                { name: "claude-frontend", type: "claude-code", role: "frontend", description: "renders the UI" },
                { name: "qa-bot", type: "codex", role: null, description: null },
              ],
            };
          },
        }),
    });

    const result = await handler({});

    expect(requestedAgentName).toBe("impl");
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({
      peers: [
        { name: "claude-frontend", type: "claude-code", role: "frontend", description: "renders the UI" },
        { name: "qa-bot", type: "codex", role: null, description: null },
      ],
    });
    expect(agentsListOutputSchema.safeParse(result.structuredContent).success).toBe(true);
  });

  it("returns an empty peers array (not an error) when the caller has no active route", async () => {
    const handler = createAgentsListHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () =>
        fakeDaemonClient({
          listReachablePeers: async () => ({ ok: true, peers: [] }),
        }),
    });

    const result = await handler({});

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({ peers: [] });
  });

  it("maps a daemon-reported source_agent_not_found to an MCP tool execution error", async () => {
    const handler = createAgentsListHandler({
      agentName: "ghost",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () =>
        fakeDaemonClient({
          listReachablePeers: async () => ({
            ok: false,
            reason: "source_agent_not_found",
            sourceName: "ghost",
          }),
        }),
    });

    const result = await handler({});

    expect(result.isError).toBe(true);
    const text = (result.content?.[0] as { text?: string } | undefined)?.text ?? "";
    expect(text).toContain("source_agent_not_found");
  });

  it("maps a daemon socket error to daemon_call_failed", async () => {
    const handler = createAgentsListHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () =>
        fakeDaemonClient({
          listReachablePeers: async () => {
            throw new Error("ECONNREFUSED");
          },
        }),
    });

    const result = await handler({});

    expect(result.isError).toBe(true);
    const text = (result.content?.[0] as { text?: string } | undefined)?.text ?? "";
    expect(text).toContain("daemon_call_failed");
  });

  it("closes the daemon client after every tool call", async () => {
    let closed = 0;
    const handler = createAgentsListHandler({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () => ({
        ...fakeDaemonClient(),
        close: () => {
          closed += 1;
        },
      }),
    });

    await handler({});
    await handler({});

    expect(closed).toBe(2);
  });
});

describe("codex MCP server — agents_list registration", () => {
  it("registers agents_list with its description, empty input schema, and peers output schema", () => {
    const mcp = createCodexIngressMcpServer({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () => fakeDaemonClient(),
    });

    const registeredTool = (
      mcp as unknown as {
        _registeredTools: Record<
          string,
          {
            description: string;
            inputSchema: { safeParse(value: unknown): { success: boolean } };
            outputSchema: { safeParse(value: unknown): { success: boolean } };
          }
        >;
      }
    )._registeredTools.agents_list!;

    expect(registeredTool.description).toBe(AIOX_AGENTS_LIST_DESCRIPTION);
    expect(registeredTool.inputSchema.safeParse({}).success).toBe(true);
    expect(registeredTool.outputSchema.safeParse({ peers: [] }).success).toBe(true);
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

  it("registers the retransmit tool but exposes no archive tool", () => {
    const mcp = createCodexIngressMcpServer({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () => fakeDaemonClient(),
    });

    const toolNames = Object.keys(
      (mcp as unknown as { _registeredTools: Record<string, unknown> })._registeredTools,
    );

    expect(toolNames).toContain("aiox_retransmit_unconfirmed_delivery");
    expect(toolNames).not.toContain("aiox_archive_unconfirmed_delivery");
  });

  it("registers the common send/reply tool names, no legacy alias, retransmit retained", () => {
    const mcp = createCodexIngressMcpServer({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () => fakeDaemonClient(),
    });

    const toolNames = Object.keys(
      (mcp as unknown as { _registeredTools: Record<string, unknown> })._registeredTools,
    );

    expect(toolNames).toContain("send");
    expect(toolNames).toContain("reply");
    expect(toolNames).toContain("aiox_retransmit_unconfirmed_delivery");
    expect(toolNames).not.toContain("aiox_send_message");
    expect(toolNames).not.toContain("aiox_reply");
    expect(toolNames.sort()).toEqual(
      ["aiox_retransmit_unconfirmed_delivery", "agents_list", "reply", "send"].sort(),
    );
  });

  it("accepts the non-error unconfirmed retransmit structured result", () => {
    const mcp = createCodexIngressMcpServer({
      agentName: "impl",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/test.sock",
      createDaemonClient: () => fakeDaemonClient(),
    });
    const registeredTool = (
      mcp as unknown as {
        _registeredTools: Record<string, { outputSchema: { safeParse(value: unknown): { success: boolean } } }>;
      }
    )._registeredTools.aiox_retransmit_unconfirmed_delivery!;

    expect(
      registeredTool.outputSchema.safeParse({
        ok: false,
        reason: "manual_retransmit_unconfirmed",
        message_id: "message-1",
      }).success,
    ).toBe(true);
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

describe("codex MCP server — manual retransmit tool result", () => {
  const options = {
    agentName: "impl",
    agentToken: "token-1",
    daemonSocketPath: "/tmp/test.sock",
  } as const;

  function handlerFor(
    result: Awaited<ReturnType<CodexIngressDaemonClient["retransmitUnconfirmedDelivery"]>>,
  ) {
    return createRetransmitUnconfirmedDeliveryHandler({
      ...options,
      createDaemonClient: () =>
        fakeDaemonClient({ retransmitUnconfirmedDelivery: async () => result }),
    });
  }

  it("renders an immediate success as a non-error delivered result", async () => {
    const handler = handlerFor({ ok: true, delivery: retransmitDelivery({ status: "delivered" }) });
    const result = await handler({ deliveryId: "delivery-1", confirmDuplicateRisk: true });
    expect(result.isError ?? false).toBe(false);
    expect(result.content[0]!.text).toContain("delivered for delivery-1");
    expect(result.structuredContent).toMatchObject({ ok: true, message_id: "message-1" });
  });

  it("renders a post-write timeout as a non-error target-acceptance-unknown result", async () => {
    const handler = handlerFor({
      ok: false,
      reason: "manual_retransmit_unconfirmed",
      delivery: retransmitDelivery(),
      message: "turn/start timed out",
    });
    const result = await handler({ deliveryId: "delivery-1", confirmDuplicateRisk: true });
    expect(result.isError ?? false).toBe(false);
    expect(result.content[0]!.text).toContain("acceptance unknown");
    expect(result.content[0]!.text).toContain("unconfirmed");
    expect(result.structuredContent).toEqual({
      ok: false,
      reason: "manual_retransmit_unconfirmed",
      message_id: "message-1",
    });
  });

  it("renders a post-write WebSocket drop as a non-error target-acceptance-unknown result", async () => {
    const handler = handlerFor({
      ok: false,
      reason: "manual_retransmit_unconfirmed",
      delivery: retransmitDelivery(),
      message: "socket closed after turn/start write",
    });
    const result = await handler({ deliveryId: "delivery-1", confirmDuplicateRisk: true });
    expect(result.isError ?? false).toBe(false);
    expect(result.content[0]!.text).toContain("acceptance unknown");
    expect(result.content[0]!.text).toContain("unconfirmed");
  });

  it("renders an explicit reject as an error result naming manual_retransmit_rejected", async () => {
    const handler = handlerFor({
      ok: false,
      reason: "manual_retransmit_rejected",
      delivery: retransmitDelivery(),
      message: "immediate reject",
    });
    const result = await handler({ deliveryId: "delivery-1", confirmDuplicateRisk: true });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("manual_retransmit_rejected");
  });

  it("renders a no-attempt failure as an error result naming manual_retransmit_failed", async () => {
    const handler = handlerFor({
      ok: false,
      reason: "manual_retransmit_failed",
      delivery: retransmitDelivery(),
      message: "ready Codex runtime and bound thread are required for manual retransmit",
    });
    const result = await handler({ deliveryId: "delivery-1", confirmDuplicateRisk: true });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("manual_retransmit_failed");
  });

  it("never surfaces requestId in the source-facing rejected result text", async () => {
    const handler = handlerFor({
      ok: false,
      reason: "manual_retransmit_rejected",
      delivery: retransmitDelivery(),
      message: "immediate reject",
    });
    const result = await handler({ deliveryId: "delivery-1", confirmDuplicateRisk: true });
    expect(result.content[0]!.text).not.toMatch(/requestId/i);
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

function retransmitDelivery(overrides: Record<string, unknown> = {}) {
  return {
    id: "delivery-1",
    messageId: "message-1",
    targetAgentId: "agent-target",
    routeId: "route-1",
    status: "unconfirmed" as const,
    idempotencyKey: "key-1",
    ...overrides,
  };
}

function fakeDaemonClient(
  overrides: Partial<
    Pick<
      CodexIngressDaemonClient,
      | "receiveCodexMessage"
      | "receiveCodexReply"
      | "retransmitUnconfirmedDelivery"
      | "registerCodexChannel"
      | "listReachablePeers"
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
    retransmitUnconfirmedDelivery:
      overrides.retransmitUnconfirmedDelivery ??
      (async () => ({ ok: false as const, reason: "delivery_not_found" as const, deliveryId: "missing" })),
    listReachablePeers:
      overrides.listReachablePeers ?? (async () => ({ ok: true as const, peers: [] })),
    close() {
      /* no-op */
    },
  };
}

function successRegisterCodexChannelResponse() {
  return {
    ok: true as const,
    runtime: {
      agentId: "agent-1",
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
