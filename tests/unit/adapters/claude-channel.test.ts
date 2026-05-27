import Database from "better-sqlite3";
import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { createEventRepository } from "../../../src/store/repositories/events.js";
import { applySchema } from "../../../src/store/schema.js";
import {
  buildChannelNotification,
  CLAUDE_CHANNEL_INSTRUCTIONS,
  CLAUDE_REPLY_DESCRIPTION,
  CLAUDE_SEND_DESCRIPTION,
  createReplyHandler,
  createSendHandler,
  startClaudeChannelHttpIngress,
} from "../../../src/adapters/claude/channel-server.js";
import { buildLaunchClaudeChannelArgs, launchClaudeWithChannel } from "../../../src/adapters/claude/launcher.js";

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
      chatId: "t1",
      text: "done",
    });

    expect(response).toMatchObject({
      ok: false,
      reason: "source_agent_not_found",
      sourceName: "alpha",
    });
  });

  it("records claude_channel_reply_received event with chatId and text", async () => {
    const ids = ["agent-1", "event-1"];
    const state = createDaemonState({
      db,
      createId: () => ids.shift()!,
      now: () => "2026-05-22T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.receiveClaudeChannelReply({
      agentName: "alpha",
      chatId: "t1",
      text: "reply text",
    });

    const events = createEventRepository(db).list();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "claude_channel_reply_received",
      data: { chatId: "t1", text: "reply text" },
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
      chatId: "t2",
      text: "orchestration complete",
    });

    const events = createEventRepository(db).list();
    const replyEvent = events.find((e) => e.type === "claude_channel_reply_received");
    expect(replyEvent).toMatchObject({
      type: "claude_channel_reply_received",
      data: { chatId: "t2", text: "orchestration complete" },
      agentId: "agent-1",
    });
  });
});


// ---------------------------------------------------------------------------
// channel-server — MCP handlers
// ---------------------------------------------------------------------------

describe("Claude channel MCP handlers", () => {
  it("instructs Claude to use aiox tools only for intentional collaboration", () => {
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("<channel");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Language Policy");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("User-Requested Collaboration");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Intent: delegation");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Intent: discussion");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Intent: clarification");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Intent: result");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Intent: conclusion");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Multi-round Discussion");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("[[CONCLUDE]]");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).toContain("Bad, do not send");
    expect(CLAUDE_CHANNEL_INSTRUCTIONS).not.toContain("- an instruction");
    expect(CLAUDE_REPLY_DESCRIPTION).toContain("Intent:");
    expect(CLAUDE_REPLY_DESCRIPTION).toContain("[[CONCLUDE]]");
    expect(CLAUDE_REPLY_DESCRIPTION).toContain("concrete");
    expect(CLAUDE_SEND_DESCRIPTION).toContain("Intent:");
    expect(CLAUDE_SEND_DESCRIPTION).toContain("new aiox thread");
    expect(CLAUDE_SEND_DESCRIPTION).toContain("expected output");
  });

  it("send routes a chat_id-free message through receiveClaudeChannelMessage", async () => {
    const calls: { method: string; args: unknown }[] = [];
    const handler = createSendHandler({
      agentName: "reviewer",
      daemonSocketPath: "/tmp/aiox.sock",
      createMessageId: () => "claude-msg-fixed",
      createDaemonClient: () =>
        fakeClaudeDaemonClient({
          receiveClaudeChannelMessage: async (args) => {
            calls.push({ method: "receiveClaudeChannelMessage", args });
            return { ok: true, message: { id: "claude-msg-fixed" }, deliveries: [] };
          },
        }),
    });

    const result = await handler({ text: "hello codex" });

    expect(result.structuredContent).toMatchObject({
      ok: true,
      message_id: "claude-msg-fixed",
    });
    expect(calls).toEqual([
      {
        method: "receiveClaudeChannelMessage",
        args: {
          agentName: "reviewer",
          messageId: "claude-msg-fixed",
          text: "hello codex",
        },
      },
    ]);
  });

  it("reply still requires chat_id and routes through receiveClaudeChannelReply", async () => {
    const calls: { method: string; args: unknown }[] = [];
    const handler = createReplyHandler({
      agentName: "reviewer",
      daemonSocketPath: "/tmp/aiox.sock",
      createDaemonClient: () =>
        fakeClaudeDaemonClient({
          receiveClaudeChannelReply: async (args) => {
            calls.push({ method: "receiveClaudeChannelReply", args });
            return { ok: true };
          },
        }),
    });

    const result = await handler({ chat_id: "parent-1", text: "ack" });

    expect(result.structuredContent).toMatchObject({ ok: true });
    expect(calls).toEqual([
      {
        method: "receiveClaudeChannelReply",
        args: {
          agentName: "reviewer",
          chatId: "parent-1",
          text: "ack",
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

    const result = await handler({ chat_id: "parent-1", text: "ack" });

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

  it("passes Claude channel identity through child process env", async () => {
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
    expect(spawn).toHaveBeenCalledWith(
      "claude",
      ["--dangerously-load-development-channels", "server:aiox-claude-reviewer"],
      expect.objectContaining({
        env: expect.objectContaining({
          AIOX_CLAUDE_CHANNEL_AGENT_NAME: "reviewer",
          AIOX_CLAUDE_CHANNEL_TOKEN: "token-1",
          AIOX_SOCKET_PATH: "/tmp/aiox.sock",
        }),
        stdio: "inherit",
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function fakeClaudeDaemonClient(overrides: {
  receiveClaudeChannelMessage?: (request: unknown) => Promise<unknown>;
  receiveClaudeChannelReply?: (request: unknown) => Promise<unknown>;
}) {
  return {
    receiveClaudeChannelMessage:
      overrides.receiveClaudeChannelMessage ?? (async () => ({ ok: true })),
    receiveClaudeChannelReply:
      overrides.receiveClaudeChannelReply ?? (async () => ({ ok: true })),
    close() {},
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
