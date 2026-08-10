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
  CLAUDE_RETRANSMIT_UNCONFIRMED_DELIVERY_DESCRIPTION,
  CLAUDE_REPLY_DESCRIPTION,
  CLAUDE_SEND_DESCRIPTION,
  type ClaudeChannelDaemonClient,
  createClaudeChannelMcpServer,
  createReplyHandler,
  createRetransmitUnconfirmedDeliveryHandler,
  createSendHandler,
  retransmitUnconfirmedDeliveryInputSchema,
  startClaudeChannelHttpIngress,
  typedClaudeReplyInputSchema,
  typedClaudeSendInputSchema,
} from "../../../src/adapters/claude/channel-server.js";
import {
  buildClaudeStaticMcpConfig,
  buildLaunchClaudeChannelArgs,
  launchClaudeStaticMcpChannel,
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

  it("registerClaudeChannel with the same token twice updates the runtime endpoint", async () => {
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
    const firstEndpoint = "http://127.0.0.1:18789/send";
    const secondEndpoint = "http://127.0.0.1:18790/send";

    await client.registerClaudeChannel({
      agentName: "alpha",
      token,
      endpoint: firstEndpoint,
    });
    const reconnectResponse = await client.registerClaudeChannel({
      agentName: "alpha",
      token,
      endpoint: secondEndpoint,
    });

    expect(reconnectResponse).toMatchObject({ ok: true });
    expect(claudeChannelRuntimes.get("alpha")).toMatchObject({
      endpoint: secondEndpoint,
    });
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

  it("rejects a previously registered token after disconnectClaudeChannel", async () => {
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
    await client.registerClaudeChannel({
      agentName: "alpha",
      token,
      endpoint: "http://127.0.0.1:18789/send",
    });
    await client.disconnectClaudeChannel({ agentName: "alpha" });

    const response = await client.registerClaudeChannel({
      agentName: "alpha",
      token,
      endpoint: "http://127.0.0.1:18790/send",
    });

    expect(response).toMatchObject({
      ok: false,
      reason: "claude_channel_registration_failed",
      detail: "unknown_token",
    });
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
      { type: "question", intent: "notification", replyExpected: true, content: { text: "reserved" } },
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
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("host-owned outer <channel> wrapper");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("canonical AIOX envelope JSON");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain(
      "intent: \"notification\" is a daemon-authored outcome event, not a reply",
    );
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("outcomeForDeliveryId");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain(
      "The outer <channel source=\"...\"> attribute identifies this channel server",
    );
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toMatch(
      /The envelope's own source\.address field is the actual\s+sender/,
    );
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain(
      "creates no reply right; do not use reply for a notification",
    );
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain(
      "Use outcomeForDeliveryId only to correlate the outcome it reports",
    );
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Language Policy");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("User-Requested Collaboration");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Typed Message Intent");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("inReplyToDeliveryId");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("replyExpected");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Multi-round Discussion");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain('intent: "conclusion"');
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain(
      "After sending a conclusion, do not call any aiox tool again for that thread.",
    );
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("intent: delegation");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain(
      "content.text: Goal: review the diff in src/router.ts for race conditions.",
    );
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Bad, do not send");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).not.toContain("- an instruction");
    expect(CLAUDE_REPLY_DESCRIPTION).toContain("inReplyToDeliveryId");
    expect(CLAUDE_REPLY_DESCRIPTION).toContain("replyExpected");
    expect(CLAUDE_REPLY_DESCRIPTION).toContain("concrete");
    expect(CLAUDE_SEND_DESCRIPTION).toContain("question or instruction");
    expect(CLAUDE_SEND_DESCRIPTION).toContain("content.text");
  });

  it("instructs Claude that manual retransmit is unconfirmed-only, confirmation-gated, and duplicate-risking", () => {
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Unconfirmed Delivery Operations");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("aiox_retransmit_unconfirmed_delivery");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("unconfirmed");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("confirmDuplicateRisk: true");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("duplicate");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toMatch(/channel transport accept/);
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("received, read, or completed");
    expect(CLAUDE_RETRANSMIT_UNCONFIRMED_DELIVERY_DESCRIPTION).toContain("confirmDuplicateRisk: true");
    expect(CLAUDE_RETRANSMIT_UNCONFIRMED_DELIVERY_DESCRIPTION).toContain("duplicate");
    expect(CLAUDE_RETRANSMIT_UNCONFIRMED_DELIVERY_DESCRIPTION).toMatch(
      /channel transport accept/,
    );
    expect(CLAUDE_RETRANSMIT_UNCONFIRMED_DELIVERY_DESCRIPTION).toContain(
      "received, read, or completed",
    );
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

    expect(result.structuredContent).toMatchObject({
      ok: true,
      message_id: "message-test",
    });
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
      message_id: "message-test",
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

  it("maps a daemon send rejection to an MCP tool error", async () => {
    const handler = createSendHandler({
      agentName: "reviewer",
      daemonSocketPath: "/tmp/aiox.sock",
      createDaemonClient: () =>
        fakeClaudeDaemonClient({
          receiveClaudeChannelMessage: async () => ({
            ok: false,
            reason: "no_active_routes",
          }),
        }),
    });

    const result = await handler({
      type: "question",
      intent: "delegation",
      replyExpected: true,
      content: { text: "hello codex" },
    });

    expect(result.isError).toBe(true);
    expect((result.content?.[0] as { text?: string } | undefined)?.text).toContain(
      "no_active_routes",
    );
  });

  it.each([
    "unknown_delivery",
    "correlation_mismatch",
    "reply_not_expected",
    "duplicate_reply",
  ] as const)("relays daemon reply rejection %s as an MCP tool error", async (reason) => {
    const handler = createReplyHandler({
      agentName: "reviewer",
      daemonSocketPath: "/tmp/aiox.sock",
      createDaemonClient: () =>
        fakeClaudeDaemonClient({
          receiveClaudeChannelReply: async () => ({ ok: false, reason }),
        }),
    });

    const result = await handler({
      inReplyToDeliveryId: "delivery-1",
      intent: "result",
      replyExpected: false,
      content: { text: "ack" },
    });

    expect(result.isError).toBe(true);
    expect((result.content?.[0] as { text?: string } | undefined)?.text).toContain(reason);
  });

  it("maps a thrown daemon callback to daemon_call_failed", async () => {
    const handler = createSendHandler({
      agentName: "reviewer",
      daemonSocketPath: "/tmp/aiox.sock",
      createDaemonClient: () =>
        fakeClaudeDaemonClient({
          receiveClaudeChannelMessage: async () => {
            throw new Error("ECONNREFUSED");
          },
        }),
    });

    const result = await handler({
      type: "question",
      intent: "delegation",
      replyExpected: true,
      content: { text: "hello codex" },
    });

    expect(result.isError).toBe(true);
    expect((result.content?.[0] as { text?: string } | undefined)?.text).toContain(
      "daemon_call_failed",
    );
  });
});

// ---------------------------------------------------------------------------
// channel-server — manual retransmit tool
// ---------------------------------------------------------------------------

describe("Claude channel MCP factory — manual retransmit tool", () => {
  it("registers send, reply, and aiox_retransmit_unconfirmed_delivery, no more", () => {
    const mcp = createClaudeChannelMcpServer({
      agentName: "reviewer",
      daemonSocketPath: "/tmp/aiox.sock",
      createDaemonClient: () => fakeClaudeDaemonClient({}),
    });

    const toolNames = Object.keys(
      (mcp as unknown as { _registeredTools: Record<string, unknown> })._registeredTools,
    );

    expect(toolNames.sort()).toEqual(
      ["aiox_retransmit_unconfirmed_delivery", "reply", "send"].sort(),
    );
  });

  it("accepts the non-error unconfirmed retransmit structured result", () => {
    const mcp = createClaudeChannelMcpServer({
      agentName: "reviewer",
      daemonSocketPath: "/tmp/aiox.sock",
      createDaemonClient: () => fakeClaudeDaemonClient({}),
    });
    const registeredTool = (
      mcp as unknown as {
        _registeredTools: Record<
          string,
          { outputSchema: { safeParse(value: unknown): { success: boolean } } }
        >;
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

describe("retransmitUnconfirmedDeliveryInputSchema", () => {
  it("requires an explicit duplicate-risk confirmation for manual retransmit", () => {
    expect(
      retransmitUnconfirmedDeliveryInputSchema.safeParse({
        deliveryId: "delivery-1",
      }).success,
    ).toBe(false);
    expect(
      retransmitUnconfirmedDeliveryInputSchema.safeParse({
        deliveryId: "delivery-1",
        confirmDuplicateRisk: false,
      }).success,
    ).toBe(false);
    expect(
      retransmitUnconfirmedDeliveryInputSchema.safeParse({
        deliveryId: "delivery-1",
        confirmDuplicateRisk: true,
      }).success,
    ).toBe(true);
  });
});

describe("Claude channel MCP handlers — manual retransmit tool result", () => {
  const options = {
    agentName: "reviewer",
    daemonSocketPath: "/tmp/aiox.sock",
  } as const;

  function handlerFor(
    result: Awaited<ReturnType<ClaudeChannelDaemonClient["retransmitUnconfirmedDelivery"]>>,
  ) {
    return createRetransmitUnconfirmedDeliveryHandler({
      ...options,
      createDaemonClient: () =>
        fakeClaudeDaemonClient({ retransmitUnconfirmedDelivery: async () => result }),
    });
  }

  it("renders an immediate success as a non-error delivered result", async () => {
    const handler = handlerFor({ ok: true, delivery: retransmitDelivery({ status: "delivered" }) });
    const result = await handler({ deliveryId: "delivery-1", confirmDuplicateRisk: true });
    expect(result.isError ?? false).toBe(false);
    expect(result.content[0]!.text).toContain("delivered for delivery-1");
    expect(result.structuredContent).toMatchObject({ ok: true, message_id: "message-1" });
  });

  it("renders a post-write ambiguous push as a non-error target-acceptance-unknown result", async () => {
    const handler = handlerFor({
      ok: false,
      reason: "manual_retransmit_unconfirmed",
      delivery: retransmitDelivery(),
      message: "fetch aborted or response lost",
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

  it("renders an explicit reject as an error result naming manual_retransmit_rejected", async () => {
    const handler = handlerFor({
      ok: false,
      reason: "manual_retransmit_rejected",
      delivery: retransmitDelivery(),
      message: "non-2xx response",
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
      message: "no registered Claude channel runtime for target",
    });
    const result = await handler({ deliveryId: "delivery-1", confirmDuplicateRisk: true });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("manual_retransmit_failed");
  });

  it("renders delivery_not_found as an error result", async () => {
    const handler = handlerFor({
      ok: false,
      reason: "delivery_not_found",
      deliveryId: "delivery-missing",
    });
    const result = await handler({ deliveryId: "delivery-missing", confirmDuplicateRisk: true });
    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("delivery_not_found");
  });

  it("maps a thrown daemon callback to daemon_call_failed", async () => {
    const handler = createRetransmitUnconfirmedDeliveryHandler({
      ...options,
      createDaemonClient: () =>
        fakeClaudeDaemonClient({
          retransmitUnconfirmedDelivery: async () => {
            throw new Error("ECONNREFUSED");
          },
        }),
    });

    const result = await handler({ deliveryId: "delivery-1", confirmDuplicateRisk: true });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain("daemon_call_failed");
  });

  it("closes the daemon client after every tool call", async () => {
    let closed = 0;
    const handler = createRetransmitUnconfirmedDeliveryHandler({
      ...options,
      createDaemonClient: () => ({
        ...fakeClaudeDaemonClient({}),
        close: () => {
          closed += 1;
        },
      }),
    });

    await handler({ deliveryId: "delivery-1", confirmDuplicateRisk: true });
    await handler({ deliveryId: "delivery-2", confirmDuplicateRisk: true });

    expect(closed).toBe(2);
  });
});

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

// ---------------------------------------------------------------------------
// channel-server — notification framing
// ---------------------------------------------------------------------------

describe("buildChannelNotification", () => {
  it("sends a canonical envelope unchanged without meta", () => {
    const canonicalEnvelope = JSON.stringify({
      protocol: "aiox.message.v1",
      messageId: "message-1",
      deliveryId: "delivery-1",
      source: { kind: "agent", address: "agent://local/default/codex" },
      target: { address: "agent://local/default/claude" },
      type: "instruction",
      intent: "delegation",
      replyExpected: true,
      content: { mediaType: "text/plain", text: "Review this task." },
    });

    const notification = buildChannelNotification({ content: canonicalEnvelope });

    expect(notification).toEqual({
      method: "notifications/claude/channel",
      params: { content: canonicalEnvelope },
    });
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

  it("forwards a real HTTP POST body to mcp.server.notification as the exact canonical JSON, unmodified", async () => {
    const notifications: unknown[] = [];
    const ingress = await startClaudeChannelHttpIngress(
      fakeMcpServer(notifications),
    );

    try {
      const canonicalEnvelope = JSON.stringify({
        protocol: "aiox.message.v1",
        messageId: "message-1",
        deliveryId: "delivery-1",
        source: { kind: "agent", address: "agent://local/default/codex" },
        target: { address: "agent://local/default/claude" },
        type: "instruction",
        intent: "delegation",
        replyExpected: true,
        content: { mediaType: "text/plain", text: "Review this task." },
      });

      const response = await fetch(ingress.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: canonicalEnvelope }),
      });

      expect(response.status).toBe(202);
      expect(await response.json()).toEqual({ ok: true });
      expect(notifications).toHaveLength(1);
      expect(notifications[0]).toEqual({
        method: "notifications/claude/channel",
        params: { content: canonicalEnvelope },
      });
    } finally {
      await closeServer(ingress.server);
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
});

// ---------------------------------------------------------------------------
// launcher — static MCP activation (the sole runtime path: server:
// activation + a pre-registered Local-scope MCP definition)
// ---------------------------------------------------------------------------

describe("launchClaudeStaticMcpChannel", () => {
  it("activates server: form and injects identity via spawn env", async () => {
    const child = { pid: 5555 };
    const { spawn } = await import("node:child_process");
    vi.mocked(spawn).mockReturnValue(child as never);

    expect(
      launchClaudeStaticMcpChannel({
        command: "claude",
        channelName: "aiox-claude-ingress",
        agentName: "reviewer",
        agentToken: "token-1",
        daemonSocketPath: "/tmp/aiox.sock",
      }),
    ).toBe(child);

    const [command, args, options] = vi.mocked(spawn).mock.calls.at(-1)!;
    expect(command).toBe("claude");
    // Full args equality is the sole positive contract: it proves the exact
    // and only two elements sent to `claude`, e.g. no extra flag is injected.
    expect(args).toEqual([
      "--dangerously-load-development-channels",
      "server:aiox-claude-ingress",
    ]);
    const env = (options as { env: Record<string, string> }).env;
    expect(env.AIOX_CLAUDE_CHANNEL_AGENT_NAME).toBe("reviewer");
    expect(env.AIOX_CLAUDE_CHANNEL_TOKEN).toBe("token-1");
    expect(env.AIOX_SOCKET_PATH).toBe("/tmp/aiox.sock");
  });

  it("defaults the command to AIOX_CLAUDE_COMMAND or claude, and inherits parent env", async () => {
    const child = { pid: 5556 };
    const { spawn } = await import("node:child_process");
    vi.mocked(spawn).mockReturnValue(child as never);
    const prevPath = process.env.PATH;

    launchClaudeStaticMcpChannel({
      channelName: "aiox-claude-ingress",
      agentName: "reviewer",
      agentToken: "token-1",
      daemonSocketPath: "/tmp/aiox.sock",
    });

    const [command, , options] = vi.mocked(spawn).mock.calls.at(-1)!;
    expect(command).toBe("claude");
    const env = (options as { env: Record<string, string> }).env;
    expect(env.PATH).toBe(prevPath);
    expect((options as { stdio?: string }).stdio).toBe("inherit");
  });
});

describe("buildClaudeStaticMcpConfig", () => {
  it("uses an absolute Node + tsx CLI form with session env placeholders", () => {
    const json = buildClaudeStaticMcpConfig({
      runtimeBinary: "/usr/local/bin/node",
      aioxBin: "/repo/src/bin/aiox.ts",
      tsxCliPath: "/repo/node_modules/tsx/dist/cli.mjs",
    });

    expect(JSON.parse(json)).toEqual({
      command: "/usr/local/bin/node",
      args: [
        "/repo/node_modules/tsx/dist/cli.mjs",
        "/repo/src/bin/aiox.ts",
        "mcp-claude",
      ],
      env: {
        AIOX_CLAUDE_CHANNEL_AGENT_NAME: "${AIOX_CLAUDE_CHANNEL_AGENT_NAME}",
        AIOX_CLAUDE_CHANNEL_TOKEN: "${AIOX_CLAUDE_CHANNEL_TOKEN}",
        AIOX_SOCKET_PATH: "${AIOX_SOCKET_PATH}",
      },
    });
  });

  it("uses the built aiox CLI directly under the supplied Node runtime", () => {
    const json = buildClaudeStaticMcpConfig({
      runtimeBinary: "/usr/local/bin/node",
      aioxBin: "/package/dist/src/bin/aiox.js",
    });

    expect(JSON.parse(json)).toMatchObject({
      command: "/usr/local/bin/node",
      args: ["/package/dist/src/bin/aiox.js", "mcp-claude"],
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function fakeClaudeDaemonClient(
  overrides: Partial<
    Pick<
      ClaudeChannelDaemonClient,
      | "receiveClaudeChannelMessage"
      | "receiveClaudeChannelReply"
      | "retransmitUnconfirmedDelivery"
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
    retransmitUnconfirmedDelivery:
      overrides.retransmitUnconfirmedDelivery ??
      (async () => ({
        ok: false as const,
        reason: "delivery_not_found" as const,
        deliveryId: "missing",
      })),
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

function fakeMcpServer(notifications: unknown[] = []) {
  return {
    server: {
      notification: async (notification: unknown) => {
        notifications.push(notification);
      },
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
