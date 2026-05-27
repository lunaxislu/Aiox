import { describe, expect, it } from "vitest";

import {
  AIOX_REPLY_DESCRIPTION,
  AIOX_SEND_MESSAGE_DESCRIPTION,
  CODEX_INGRESS_INSTRUCTIONS,
  createCodexIngressMcpServer,
  createReplyHandler,
  createSendMessageHandler,
  parseCodexIngressEnv,
  runCodexIngressMcpServerWithDependencies,
} from "../../../src/adapters/codex/mcp-server.js";

describe("codex MCP server — handlers", () => {
  it("instructs Codex to reply to aiox envelopes with the envelope message_id", () => {
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("<aiox-channel");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("message_id");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("parent_message_id");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("Language Policy");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("User-Requested Collaboration");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("Intent: delegation");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("Intent: discussion");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("Intent: clarification");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("Intent: result");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("Intent: conclusion");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("Multi-round Discussion");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("[[CONCLUDE]]");
    expect(CODEX_INGRESS_INSTRUCTIONS).toContain("Bad, do not send");
    expect(CODEX_INGRESS_INSTRUCTIONS).not.toContain("- an instruction");
    expect(AIOX_REPLY_DESCRIPTION).toContain("<aiox-channel");
    expect(AIOX_REPLY_DESCRIPTION).toContain("message_id");
    expect(AIOX_REPLY_DESCRIPTION).toContain("parent_message_id");
    expect(AIOX_REPLY_DESCRIPTION).toContain("Intent:");
    expect(AIOX_REPLY_DESCRIPTION).toContain("[[CONCLUDE]]");
    expect(AIOX_REPLY_DESCRIPTION).toContain("concrete");
    expect(AIOX_SEND_MESSAGE_DESCRIPTION).toContain("Intent:");
    expect(AIOX_SEND_MESSAGE_DESCRIPTION).toContain("new aiox thread");
    expect(AIOX_SEND_MESSAGE_DESCRIPTION).toContain("expected output");
  });

  it("aiox_send_message routes through receiveCodexMessage with token", async () => {
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
            return { ok: true, message: { id: "msg-fixed" }, deliveries: [] };
          },
        }),
    });

    const result = await handler({ content: "hello" });

    expect(result.structuredContent).toMatchObject({ ok: true, message_id: "msg-fixed" });
    expect(calls).toEqual([
      {
        method: "receiveCodexMessage",
        args: {
          agentName: "impl",
          token: "token-1",
          messageId: "msg-fixed",
          content: "hello",
        },
      },
    ]);
  });

  it("aiox_reply routes through receiveCodexReply with parent_message_id", async () => {
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
            return { ok: true, message: { id: "reply-fixed" }, deliveries: [] };
          },
        }),
    });

    const result = await handler({
      parent_message_id: "parent-1",
      content: "ack",
    });

    expect(result.structuredContent).toMatchObject({ ok: true, message_id: "reply-fixed" });
    expect(calls).toEqual([
      {
        method: "receiveCodexReply",
        args: {
          agentName: "impl",
          token: "token-1",
          messageId: "reply-fixed",
          parentMessageId: "parent-1",
          content: "ack",
        },
      },
    ]);
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

    const result = await handler({ content: "hello" });

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

    const result = await handler({ content: "hi" });

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

    await handler({ content: "hi" });
    await handler({ content: "again" });

    expect(closed).toBe(2);
  });
});

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
            return { ok: true };
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
            return { ok: false, reason: "codex_channel_registration_failed" };
          },
        }),
      log: (event, fields) => logs.push({ event, fields }),
    });

    expect(events).toEqual(["connect", "register"]);
    expect(logs).toContainEqual({
      event: "codex_mcp_register_failed",
      fields: {
        result: { ok: false, reason: "codex_channel_registration_failed" },
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

function fakeDaemonClient(overrides: Partial<{
  receiveCodexMessage: (args: unknown) => Promise<unknown>;
  receiveCodexReply: (args: unknown) => Promise<unknown>;
  registerCodexChannel: (args: unknown) => Promise<unknown>;
}> = {}) {
  return {
    receiveCodexMessage:
      overrides.receiveCodexMessage ??
      (async () => ({ ok: true, message: { id: "msg-default" }, deliveries: [] })),
    receiveCodexReply:
      overrides.receiveCodexReply ??
      (async () => ({ ok: true, message: { id: "reply-default" }, deliveries: [] })),
    registerCodexChannel:
      overrides.registerCodexChannel ?? (async () => ({ ok: true })),
    close() {
      /* no-op */
    },
  };
}
