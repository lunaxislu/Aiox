import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";
import { buildChannelNotification } from "../../../src/adapters/claude/channel-server.js";
import { buildLaunchClaudeChannelArgs } from "../../../src/adapters/claude/launcher.js";

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

  it("removes runtime from registry after disconnect", async () => {
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

  it("acknowledges reply receipt", async () => {
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

    expect(response).toMatchObject({ ok: true });
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
// Helpers
// ---------------------------------------------------------------------------

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
