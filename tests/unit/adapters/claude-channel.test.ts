import Database from "better-sqlite3";
import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock("../../../src/core/public-ids.js", () => ({
  createPublicMessageId: vi.fn(() => "message-test"),
  createPublicDeliveryId: vi.fn(() => "delivery-test"),
}));

import { createDaemonApi } from "../../../src/daemon/api.js";
import type { DispatchSummary } from "../../../src/daemon/state.js";
import { createPublicMessageId } from "../../../src/core/public-ids.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { createEventRepository } from "../../../src/store/repositories/events.js";
import { applySchema } from "../../../src/store/schema.js";
import {
  buildChannelNotification,
  CLAUDE_CHANNEL_INSTRUCTIONS,
  CLAUDE_REPLY_DESCRIPTION,
  CLAUDE_SEND_DESCRIPTION,
  type ClaudeChannelDaemonClient,
  createReplyHandler,
  createSendHandler,
  startClaudeChannelHttpIngress,
  typedClaudeReplyInputSchema,
  typedClaudeSendInputSchema,
} from "../../../src/adapters/claude/channel-server.js";
import {
  buildClaudeChannelMcpConfig,
  buildLaunchClaudeChannelArgs,
  buildLaunchClaudePluginArgs,
  resolveInlineChannelServerEntry,
  launchClaudeWithChannel,
  launchClaudePluginChannel,
} from "../../../src/adapters/claude/launcher.js";

// ---------------------------------------------------------------------------
// Daemon state — Claude channel registration
// ---------------------------------------------------------------------------

describe("daemon registerClaudeChannel", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("attachAgent for claude returns claudeChannelToken", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-22T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.attachAgent({
      kind: "claude",
      name: "alpha",
      cwd: "/repo",
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(typeof response.claudeChannelToken).toBe("string");
      expect(response.claudeChannelToken!.length).toBeGreaterThan(0);
    }
  });

  it("registerClaudeChannel happy path stores runtime in registry", async () => {
    const claudeChannelRuntimes = new Map();
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-22T00:00:00.000Z",
      claudeChannelRuntimes,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const attachResponse = await client.attachAgent({
      kind: "claude",
      name: "alpha",
      cwd: "/repo",
    });
    expect(attachResponse.ok).toBe(true);
    const token = (attachResponse as { ok: true; claudeChannelToken: string })
      .claudeChannelToken;

    const registerResponse = await client.registerClaudeChannel({
      agentName: "alpha",
      token,
      endpoint: "http://127.0.0.1:18789/send",
    });

    expect(registerResponse).toMatchObject({ ok: true });
    expect(claudeChannelRuntimes.has("alpha")).toBe(true);
  });

  it("registerClaudeChannel with wrong token returns claude_channel_registration_failed", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-22T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "claude", name: "alpha", cwd: "/repo" });

    const response = await client.registerClaudeChannel({
      agentName: "alpha",
      token: "wrong-token",
      endpoint: "http://127.0.0.1:18789/send",
    });

    expect(response).toMatchObject({
      ok: false,
      reason: "claude_channel_registration_failed",
    });
  });

  it("registerClaudeChannel with no pending token returns claude_channel_registration_failed", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-22T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.registerClaudeChannel({
      agentName: "alpha",
      token: "any-token",
      endpoint: "http://127.0.0.1:18789/send",
    });

    expect(response).toMatchObject({
      ok: false,
      reason: "claude_channel_registration_failed",
    });
  });

  it("registerClaudeChannel with invalid endpoint returns claude_channel_registration_failed", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-22T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    const attachResponse = await client.attachAgent({
      kind: "claude",
      name: "alpha",
      cwd: "/repo",
    });
    const token = (attachResponse as { ok: true; claudeChannelToken: string })
      .claudeChannelToken;

    const response = await client.registerClaudeChannel({
      agentName: "alpha",
      token,
      endpoint: "https://example.com/send",
    });

    expect(response).toMatchObject({
      ok: false,
      reason: "claude_channel_registration_failed",
    });
  });

  it("registered runtime entry has correct shape", async () => {
    const claudeChannelRuntimes = new Map();
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-22T00:00:00.000Z",
      claudeChannelRuntimes,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const attachResponse = await client.attachAgent({
      kind: "claude",
      name: "alpha",
      cwd: "/repo",
    });
    const token = (attachResponse as { ok: true; claudeChannelToken: string })
      .claudeChannelToken;

    await client.registerClaudeChannel({
      agentName: "alpha",
      token,
      endpoint: "http://127.0.0.1:18789/send",
    });

    const runtime = claudeChannelRuntimes.get("alpha");
    expect(runtime).toMatchObject({
      agentName: "alpha",
      endpoint: "http://127.0.0.1:18789/send",
      registeredAt: expect.any(String),
      tokenHash: expect.any(String),
    });
    expect(runtime.tokenHash).toHaveLength(12);
  });
});

// ---------------------------------------------------------------------------
// Daemon state — Claude channel disconnect
// ---------------------------------------------------------------------------

describe("daemon disconnectClaudeChannel", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("removes runtime from registry and marks agent disconnected after disconnect", async () => {
    const claudeChannelRuntimes = new Map();
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-22T00:00:00.000Z",
      claudeChannelRuntimes,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const attachResponse = await client.attachAgent({
      kind: "claude",
      name: "alpha",
      cwd: "/repo",
    });
    const token = (attachResponse as { ok: true; claudeChannelToken: string })
      .claudeChannelToken;
    await client.registerClaudeChannel({
      agentName: "alpha",
      token,
      endpoint: "http://127.0.0.1:18789/send",
    });

    const response = await client.disconnectClaudeChannel({ agentName: "alpha" });

    expect(response).toMatchObject({ ok: true, disconnected: true });
    expect(claudeChannelRuntimes.has("alpha")).toBe(false);
    expect((await client.status()).agents).toMatchObject([
      { name: "alpha", kind: "claude", status: "disconnected" },
    ]);
  });

  it("marks attached Claude agent disconnected even when channel never registered", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-22T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({
      kind: "claude",
      name: "alpha",
      cwd: "/repo",
    });

    const response = await client.disconnectClaudeChannel({ agentName: "alpha" });

    expect(response).toMatchObject({ ok: true, disconnected: true });
    expect((await client.status()).agents).toMatchObject([
      { name: "alpha", kind: "claude", status: "disconnected" },
    ]);
  });

  it("disconnect when not registered returns disconnected: false", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-22T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.disconnectClaudeChannel({ agentName: "alpha" });

    expect(response).toMatchObject({ ok: true, disconnected: false });
  });
});

// ---------------------------------------------------------------------------
// Daemon state — receive reply
// ---------------------------------------------------------------------------

describe("daemon receiveClaudeChannelReply", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("surfaces reply receipt failures", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-22T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.receiveClaudeChannelReply({
      agentName: "alpha",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: "delivery-1",
      content: { text: "done" },
    });

    expect(response).toMatchObject({
      ok: false,
      reason: "source_agent_not_found",
      sourceName: "alpha",
    });
  });

  it("records claude_channel_reply_received event with delivery correlation and text", async () => {
    const ids = ["agent-1", "event-1"];
    const state = createDaemonState({
      db,
      createId: () => ids.shift()!,
      now: () => "2026-05-22T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.receiveClaudeChannelReply({
      agentName: "alpha",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: "delivery-1",
      content: { text: "reply text" },
    });

    const events = createEventRepository(db).list();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "claude_channel_reply_received",
      data: { inReplyToDeliveryId: "delivery-1", text: "reply text" },
      agentId: null,
    });
  });

  it("links agentId when agent is registered", async () => {
    const claudeChannelRuntimes = new Map();
    const ids = ["agent-1", "event-1", "event-2"];
    const state = createDaemonState({
      db,
      createId: () => ids.shift()!,
      now: () => "2026-05-22T00:00:00.000Z",
      claudeChannelRuntimes,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const attachResponse = await client.attachAgent({
      kind: "claude",
      name: "alpha",
      cwd: "/repo",
    });
    expect(attachResponse.ok).toBe(true);
    const token = (attachResponse as { ok: true; claudeChannelToken: string })
      .claudeChannelToken;
    await client.registerClaudeChannel({
      agentName: "alpha",
      token,
      endpoint: "http://127.0.0.1:18789/send",
    });

    await client.receiveClaudeChannelReply({
      agentName: "alpha",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: "delivery-2",
      content: { text: "orchestration complete" },
    });

    const events = createEventRepository(db).list();
    const replyEvent = events.find((e) => e.type === "claude_channel_reply_received");
    expect(replyEvent).toMatchObject({
      type: "claude_channel_reply_received",
      data: { inReplyToDeliveryId: "delivery-2", text: "orchestration complete" },
      agentId: "agent-1",
    });
  });
});


// ---------------------------------------------------------------------------
// channel-server — MCP handlers
// ---------------------------------------------------------------------------

describe("Claude channel MCP handlers", () => {
  it("accepts only the typed send and reply public contracts", () => {
    expect(
      typedClaudeSendInputSchema.safeParse({
        type: "instruction",
        intent: "delegation",
        replyExpected: true,
        content: { text: "review this" },
      }).success,
    ).toBe(true);
    expect(
      typedClaudeReplyInputSchema.safeParse({
        inReplyToDeliveryId: "delivery-1",
        intent: "result",
        replyExpected: false,
        content: { text: "completed" },
      }).success,
    ).toBe(true);

    for (const input of [
      { intent: "delegation", replyExpected: true, content: { text: "missing type" } },
      { type: "question", intent: "status", replyExpected: true, content: { text: "reserved" } },
      { type: "question", intent: "delegation", replyExpected: true, content: { text: "media", mediaType: "text/plain" } },
    ]) {
      expect(typedClaudeSendInputSchema.safeParse(input).success).toBe(false);
    }
    expect(
      typedClaudeReplyInputSchema.safeParse({
        inReplyToDeliveryId: "delivery-1",
        type: "reply",
        intent: "result",
        replyExpected: false,
        content: { text: "forbidden type" },
      }).success,
    ).toBe(false);
  });

  it("instructs Claude to use aiox tools only for intentional collaboration", () => {
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("<channel");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Language Policy");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("User-Requested Collaboration");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Typed Message Intent");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("inReplyToDeliveryId");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("replyExpected");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Multi-round Discussion");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain('intent: "conclusion"');
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Bad, do not send");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).not.toContain("- an instruction");
    expect(CLAUDE_REPLY_DESCRIPTION).toContain("inReplyToDeliveryId");
    expect(CLAUDE_REPLY_DESCRIPTION).toContain("replyExpected");
    expect(CLAUDE_REPLY_DESCRIPTION).toContain("concrete");
    expect(CLAUDE_SEND_DESCRIPTION).toContain("question or instruction");
    expect(CLAUDE_SEND_DESCRIPTION).toContain("content.text");
  });

  it("issues one source message ID per Claude send invocation and forwards each exact value", async () => {
    const issue = vi.mocked(createPublicMessageId);
    issue.mockReset();
    issue.mockReturnValueOnce("opaque Claude send one").mockReturnValueOnce("opaque Claude send two");
    const calls: unknown[] = [];
    const handler = createSendHandler({ agentName: "reviewer", daemonSocketPath: "/tmp/aiox.sock", createDaemonClient: () => fakeClaudeDaemonClient({ receiveClaudeChannelMessage: async (request) => { calls.push(request); return successSendMessageResponse(request.messageId); } }) });
    await handler({ type: "question", intent: "delegation", replyExpected: true, content: { text: "one" } });
    await handler({ type: "question", intent: "delegation", replyExpected: true, content: { text: "two" } });
    expect(issue).toHaveBeenCalledTimes(2);
    expect(calls).toHaveLength(2);
    expect(calls).toMatchObject([{ messageId: "opaque Claude send one" }, { messageId: "opaque Claude send two" }]);
    issue.mockReturnValue("message-test");
  });

  it("send routes a typed request through receiveClaudeChannelMessage", async () => {
    const calls: { method: string; args: unknown }[] = [];
    const handler = createSendHandler({
      agentName: "reviewer",
      daemonSocketPath: "/tmp/aiox.sock",
      createDaemonClient: () =>
        fakeClaudeDaemonClient({
          receiveClaudeChannelMessage: async (args) => {
            calls.push({ method: "receiveClaudeChannelMessage", args });
            return successSendMessageResponse("message-test");
          },
        }),
    });

    const result = await handler({
      type: "question",
      intent: "delegation",
      replyExpected: true,
      content: { text: "hello codex" },
    } as never);

    expect(result.structuredContent).toMatchObject({
      ok: true,
      message_id: "message-test",
    });
    expect(calls).toEqual([
      {
        method: "receiveClaudeChannelMessage",
        args: {
          agentName: "reviewer",
          messageId: "message-test",
          type: "question",
          intent: "delegation",
          replyExpected: true,
          content: { text: "hello codex" },
        },
      },
    ]);
  });

  it("send exposes delivered daemon dispatch in structured content", async () => {
    const dispatch = deliveredDispatch();
    const handler = createSendHandler({
      agentName: "reviewer",
      daemonSocketPath: "/tmp/aiox.sock",
      createDaemonClient: () =>
        fakeClaudeDaemonClient({
          receiveClaudeChannelMessage: async () =>
            successSendMessageResponse("message-test", dispatch),
        }),
    });

    const result = await handler({
      type: "question",
      intent: "delegation",
      replyExpected: true,
      content: { text: "hello codex" },
    });

    expect(result.structuredContent).toEqual({
      ok: true,
      message_id: "message-test",
      dispatch,
    });
  });

  it("send exposes deferred daemon dispatch in structured content", async () => {
    const dispatch = deferredRuntimeDispatch();
    const handler = createSendHandler({
      agentName: "reviewer",
      daemonSocketPath: "/tmp/aiox.sock",
      createDaemonClient: () =>
        fakeClaudeDaemonClient({
          receiveClaudeChannelMessage: async () =>
            successSendMessageResponse("message-test", dispatch),
        }),
    });

    const result = await handler({
      type: "question",
      intent: "delegation",
      replyExpected: true,
      content: { text: "hello codex" },
    });

    expect(result.structuredContent).toEqual({
      ok: true,
      message_id: "message-test",
      dispatch,
    });
  });

  it("issues one source message ID per Claude reply invocation and forwards each exact value", async () => {
    const issue = vi.mocked(createPublicMessageId);
    issue.mockReset();
    issue.mockReturnValueOnce("opaque Claude reply one").mockReturnValueOnce("opaque Claude reply two");
    const calls: unknown[] = [];
    const handler = createReplyHandler({ agentName: "reviewer", daemonSocketPath: "/tmp/aiox.sock", createDaemonClient: () => fakeClaudeDaemonClient({ receiveClaudeChannelReply: async (request) => { calls.push(request); return successSendMessageResponse(request.messageId); } }) });
    await handler({ inReplyToDeliveryId: "delivery-one", intent: "result", replyExpected: false, content: { text: "one" } });
    await handler({ inReplyToDeliveryId: "delivery-two", intent: "result", replyExpected: false, content: { text: "two" } });
    expect(issue).toHaveBeenCalledTimes(2);
    expect(calls).toHaveLength(2);
    expect(calls).toMatchObject([{ messageId: "opaque Claude reply one" }, { messageId: "opaque Claude reply two" }]);
    issue.mockReturnValue("message-test");
  });

  it("reply routes a typed request through receiveClaudeChannelReply", async () => {
    const calls: { method: string; args: unknown }[] = [];
    const handler = createReplyHandler({
      agentName: "reviewer",
      daemonSocketPath: "/tmp/aiox.sock",
      createDaemonClient: () =>
        fakeClaudeDaemonClient({
          receiveClaudeChannelReply: async (args) => {
            calls.push({ method: "receiveClaudeChannelReply", args });
            return successSendMessageResponse("message-test");
          },
        }),
    });

    const result = await handler({
      inReplyToDeliveryId: "delivery-1",
      intent: "result",
      replyExpected: false,
      content: { text: "ack" },
    } as never);

    expect(result.structuredContent).toMatchObject({ ok: true });
    expect(calls).toEqual([
      {
        method: "receiveClaudeChannelReply",
        args: {
        agentName: "reviewer",
        messageId: "message-test",
        inReplyToDeliveryId: "delivery-1",
          intent: "result",
          replyExpected: false,
          content: { text: "ack" },
        },
      },
    ]);
  });

  it("reply exposes daemon dispatch in structured content", async () => {
    const handler = createReplyHandler({
      agentName: "reviewer",
      daemonSocketPath: "/tmp/aiox.sock",
      createDaemonClient: () =>
        fakeClaudeDaemonClient({
          receiveClaudeChannelReply: async () => ({
            ok: true,
            messageId: "message-test",
            message: {
              id: "message-test",
              sourceAgentId: "agent-source",
              parentMessageId: "parent-1",
              type: "reply",
              content: "ack",
            },
            deliveries: [],
            dispatch: {
              delivered: 0,
              deferred: [
                {
                  targetAgentId: "agent-target",
                  reason: "target_runtime_unavailable",
                  eligibility: "requires target claude channel runtime",
                },
              ],
              failed: [],
            },
          }),
        }),
    });

    const result = await handler({
      inReplyToDeliveryId: "delivery-1",
      intent: "result",
      replyExpected: false,
      content: { text: "ack" },
    });

    expect(result.structuredContent).toEqual({
      ok: true,
      dispatch: {
        delivered: 0,
        deferred: [
          {
            targetAgentId: "agent-target",
            reason: "target_runtime_unavailable",
            eligibility: "requires target claude channel runtime",
          },
        ],
        failed: [],
      },
    });
  });
});

// ---------------------------------------------------------------------------
// channel-server — notification framing
// ---------------------------------------------------------------------------

describe("buildChannelNotification", () => {
  it("wraps content in V1 trusted channel framing with chatId and origin", () => {
    const notification = buildChannelNotification({
      content: "do the thing",
      chatId: "t1",
      origin: "codex",
    });

    expect(notification.method).toBe("notifications/claude/channel");
    expect(notification.params.content).toContain("do the thing");
    expect(notification.params.content).toContain('chat_id="t1"');
    expect(notification.params.content).toContain('source="aiox"');
    expect(notification.params.meta).toMatchObject({ chat_id: "t1", origin: "codex" });
  });

  it("omits meta when no optional fields", () => {
    const notification = buildChannelNotification({ content: "ping" });

    expect(notification.method).toBe("notifications/claude/channel");
    expect(typeof notification.params.content).toBe("string");
    expect(notification.params.content).toContain("ping");
    expect(notification.params.meta).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// HTTP ingress — port selection
// ---------------------------------------------------------------------------

describe("startClaudeChannelHttpIngress", () => {
  it("uses an OS-assigned auto-port when no port is specified", async () => {
    const ingress = await startClaudeChannelHttpIngress(fakeMcpServer());

    try {
      expect(ingress.port).toBeGreaterThan(0);
      expect(ingress.endpoint).toBe(`http://127.0.0.1:${ingress.port}/send`);
    } finally {
      await closeServer(ingress.server);
    }
  });

  it("binds the requested explicit port when it is free", async () => {
    const port = await reserveFreePort();
    const ingress = await startClaudeChannelHttpIngress(fakeMcpServer(), { port });

    try {
      expect(ingress.port).toBe(port);
      expect(ingress.endpoint).toBe(`http://127.0.0.1:${port}/send`);
    } finally {
      await closeServer(ingress.server);
    }
  });

  it("rejects with a typed error when the requested explicit port is already in use", async () => {
    const occupyingServer = createServer();
    await listenOnLoopback(occupyingServer, 0);
    const address = occupyingServer.address();
    const port = typeof address === "object" && address !== null ? address.port : 0;

    try {
      await expect(
        startClaudeChannelHttpIngress(fakeMcpServer(), { port }),
      ).rejects.toMatchObject({
        reason: "claude_channel_port_in_use",
        port,
        message: expect.stringContaining("AIOX_CLAUDE_CHANNEL_PORT"),
      });
    } finally {
      await closeServer(occupyingServer);
    }
  });
});

// ---------------------------------------------------------------------------
// launcher — command shape
// ---------------------------------------------------------------------------

describe("buildLaunchClaudeChannelArgs", () => {
  it("includes --dangerously-load-development-channels and server:<name>", () => {
    const args = buildLaunchClaudeChannelArgs("aiox-claude-alpha");

    expect(args).toContain("--dangerously-load-development-channels");
    expect(args).toContain("server:aiox-claude-alpha");
  });

  it("injects the aiox channel MCP one-off via --mcp-config with identity env", async () => {
    const child = { pid: 1234 };
    const { spawn } = await import("node:child_process");
    vi.mocked(spawn).mockReturnValue(child as never);

    expect(
      launchClaudeWithChannel({
        command: "claude",
        channelName: "aiox-claude-reviewer",
        agentName: "reviewer",
        agentToken: "token-1",
        daemonSocketPath: "/tmp/aiox.sock",
      }),
    ).toBe(child);

    const [, args] = vi.mocked(spawn).mock.calls.at(-1)!;
    expect(args).toEqual([
      "--dangerously-load-development-channels",
      "server:aiox-claude-reviewer",
      "--mcp-config",
      expect.any(String),
    ]);

    const mcpConfig = JSON.parse((args as string[])[3]);
    const server = mcpConfig.mcpServers["aiox-claude-reviewer"];
    expect(server.env).toEqual({
      AIOX_CLAUDE_CHANNEL_AGENT_NAME: "reviewer",
      AIOX_CLAUDE_CHANNEL_TOKEN: "token-1",
      AIOX_SOCKET_PATH: "/tmp/aiox.sock",
    });
  });
});

// ---------------------------------------------------------------------------
// launcher — plugin: activation form (R3 strategy D spike)
// ---------------------------------------------------------------------------

describe("buildLaunchClaudePluginArgs", () => {
  it("activates the channel via plugin:<name>@<marketplace> under the dev-channel flag", () => {
    const args = buildLaunchClaudePluginArgs("aiox-channel-ingress", "aiox");

    expect(args).toEqual([
      "--dangerously-load-development-channels",
      "plugin:aiox-channel-ingress@aiox",
    ]);
  });
});

describe("launchClaudePluginChannel", () => {
  it("activates plugin form and injects identity via spawn env (not --mcp-config)", async () => {
    const child = { pid: 4321 };
    const { spawn } = await import("node:child_process");
    vi.mocked(spawn).mockReturnValue(child as never);

    expect(
      launchClaudePluginChannel({
        command: "claude",
        pluginName: "aiox-channel-ingress",
        marketplaceName: "aiox",
        agentName: "reviewer",
        agentToken: "token-1",
        daemonSocketPath: "/tmp/aiox.sock",
      }),
    ).toBe(child);

    const [command, args, options] = vi.mocked(spawn).mock.calls.at(-1)!;
    expect(command).toBe("claude");
    expect(args).toEqual([
      "--dangerously-load-development-channels",
      "plugin:aiox-channel-ingress@aiox",
    ]);
    // identity flows through the spawned claude's env; plugin .mcp.json ${VAR}
    // placeholders expand from it. No --mcp-config.
    expect(args).not.toContain("--mcp-config");
    const env = (options as { env: Record<string, string> }).env;
    expect(env.AIOX_CLAUDE_CHANNEL_AGENT_NAME).toBe("reviewer");
    expect(env.AIOX_CLAUDE_CHANNEL_TOKEN).toBe("token-1");
    expect(env.AIOX_SOCKET_PATH).toBe("/tmp/aiox.sock");
  });

  it("pins the spawn cwd so plugin scope resolves where preflight checked it", async () => {
    const child = { pid: 4321 };
    const { spawn } = await import("node:child_process");
    vi.mocked(spawn).mockReturnValue(child as never);

    launchClaudePluginChannel({
      command: "claude",
      pluginName: "aiox-channel-ingress",
      marketplaceName: "aiox",
      agentName: "reviewer",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/aiox.sock",
      cwd: "/repo",
    });

    const [, , options] = vi.mocked(spawn).mock.calls.at(-1)!;
    expect((options as { cwd?: string }).cwd).toBe("/repo");
  });

  it("omits cwd from spawn options when not provided (inherits parent cwd)", async () => {
    const child = { pid: 4321 };
    const { spawn } = await import("node:child_process");
    vi.mocked(spawn).mockReturnValue(child as never);

    launchClaudePluginChannel({
      command: "claude",
      pluginName: "aiox-channel-ingress",
      marketplaceName: "aiox",
      agentName: "reviewer",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/aiox.sock",
    });

    const [, , options] = vi.mocked(spawn).mock.calls.at(-1)!;
    expect("cwd" in (options as object)).toBe(false);
  });
});

describe("buildClaudeChannelMcpConfig", () => {
  it("builds an inline mcpServers definition keyed by channelName", () => {
    const json = buildClaudeChannelMcpConfig({
      channelName: "aiox-claude-ingress",
      agentName: "alpha",
      agentToken: "tok-9",
      daemonSocketPath: "/tmp/aiox.sock",
      runtimeBinary: "/usr/bin/node",
      channelServerPath: "/abs/dist/src/adapters/claude/channel-server.js",
    });
    const parsed = JSON.parse(json);
    const server = parsed.mcpServers["aiox-claude-ingress"];

    expect(server.command).toBe("/usr/bin/node");
    expect(server.args).toEqual([
      "/abs/dist/src/adapters/claude/channel-server.js",
    ]);
    expect(server.env).toEqual({
      AIOX_CLAUDE_CHANNEL_AGENT_NAME: "alpha",
      AIOX_CLAUDE_CHANNEL_TOKEN: "tok-9",
      AIOX_SOCKET_PATH: "/tmp/aiox.sock",
    });
  });

  it("resolves an absolute channel-server entry by execution-mode layout when no override is given", () => {
    // This suite runs via vitest/tsx (src/TS layout), so the resolver picks the
    // sibling channel-server.ts under tsx — exercising the dev path end-to-end.
    const parsed = JSON.parse(
      buildClaudeChannelMcpConfig({
        channelName: "aiox-claude-ingress",
        agentName: "alpha",
        agentToken: "tok-9",
        daemonSocketPath: "/tmp/aiox.sock",
      }),
    );
    const server = parsed.mcpServers["aiox-claude-ingress"];

    expect(server.command).toBe("tsx");
    expect(server.args[0]).toMatch(/^\//);
    expect(server.args[0].endsWith("channel-server.ts")).toBe(true);
  });

  it("honors a runtimeBinary-only override while still layout-resolving the script path", () => {
    const server = JSON.parse(
      buildClaudeChannelMcpConfig({
        channelName: "aiox-claude-ingress",
        agentName: "alpha",
        agentToken: "tok-9",
        daemonSocketPath: "/tmp/aiox.sock",
        runtimeBinary: "/custom/runtime",
      }),
    ).mcpServers["aiox-claude-ingress"];

    // command overridden independently; script path still resolved (src/TS here).
    expect(server.command).toBe("/custom/runtime");
    expect(server.args[0].endsWith("channel-server.ts")).toBe(true);
  });
});

describe("resolveInlineChannelServerEntry (R3 step 3b execution-mode layout)", () => {
  it("uses `tsx channel-server.ts` for the src/TS layout (pnpm dev)", () => {
    const entry = resolveInlineChannelServerEntry({
      moduleUrl: "file:///repo/src/adapters/claude/launcher.ts",
      // dev layout: only the .ts sibling exists, no built .js.
      fileExists: (p) => p.endsWith("channel-server.ts"),
    });
    expect(entry.command).toBe("tsx");
    expect(entry.scriptPath).toBe("/repo/src/adapters/claude/channel-server.ts");
  });

  it("uses `node channel-server.js` for the dist/JS layout (pnpm build; npm-installed package uses this same built-JS layout)", () => {
    const entry = resolveInlineChannelServerEntry({
      moduleUrl: "file:///repo/dist/src/adapters/claude/launcher.js",
      fileExists: (p) => p.endsWith("channel-server.js"),
      nodeCommand: "/usr/bin/node",
    });
    expect(entry.command).toBe("/usr/bin/node");
    expect(entry.scriptPath).toBe(
      "/repo/dist/src/adapters/claude/channel-server.js",
    );
  });

  it("throws a clear error when neither a .ts nor a built .js sibling resolves", () => {
    expect(() =>
      resolveInlineChannelServerEntry({
        moduleUrl: "file:///repo/dist/src/adapters/claude/launcher.js",
        fileExists: () => false,
      }),
    ).toThrow(/Cannot resolve the inline Claude channel server entrypoint/);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function fakeClaudeDaemonClient(
  overrides: Partial<
    Pick<
      ClaudeChannelDaemonClient,
      "receiveClaudeChannelMessage" | "receiveClaudeChannelReply"
    >
  >,
): ClaudeChannelDaemonClient {
  return {
    receiveClaudeChannelMessage:
      overrides.receiveClaudeChannelMessage ??
      (async () => successSendMessageResponse("message-default")),
    receiveClaudeChannelReply:
      overrides.receiveClaudeChannelReply ??
      (async () => successSendMessageResponse("reply-default")),
    close() {},
  };
}

function successSendMessageResponse(
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

function deferredRuntimeDispatch(): DispatchSummary {
  return {
    delivered: 0,
    deferred: [
      {
        targetAgentId: "agent-target",
        reason: "target_runtime_unavailable",
        eligibility: "requires target claude channel runtime",
      },
    ],
    failed: [],
  };
}

function fakeMcpServer() {
  return {
    server: {
      notification: async () => {},
    },
  } as never;
}

async function reserveFreePort(): Promise<number> {
  const server = createServer();
  await listenOnLoopback(server, 0);
  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : 0;
  await closeServer(server);
  return port;
}

function listenOnLoopback(server: Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function createInProcessClient<TApi extends object>(api: TApi): TApi {
  return new Proxy(api, {
    get(target, property) {
      const value = Reflect.get(target, property);

      if (typeof value !== "function") {
        return value;
      }

      const fn = value as (...args: unknown[]) => unknown;

      return async (...args: unknown[]) => {
        const serializedArgs = JSON.parse(JSON.stringify(args));
        const response = await fn(...serializedArgs);
        return JSON.parse(JSON.stringify(response));
      };
    },
  });
}
