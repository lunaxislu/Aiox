import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { createEventRepository } from "../../../src/store/repositories/events.js";
import { applySchema } from "../../../src/store/schema.js";

// ---------------------------------------------------------------------------
// attachAgent — codexChannelToken issuance
// ---------------------------------------------------------------------------

describe("daemon attachAgent issues codex channel token", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("codex attach returns codexChannelToken alongside codexRuntime", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-new",
    });
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(typeof response.codexChannelToken).toBe("string");
      expect((response.codexChannelToken ?? "").length).toBeGreaterThan(0);
    }
  });

  it("passes the codex channel token and daemon socket path into runtime attach before thread start", async () => {
    const codexPendingTokens = new Map();
    const seenAttachRequests: unknown[] = [];
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-new",
    });
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      codexPendingTokens,
      daemonSocketPath: "/tmp/aiox.sock",
      attachCodexRuntime: async (request) => {
        seenAttachRequests.push(request);
        expect(codexPendingTokens.get("impl")).toMatchObject({
          agentName: "impl",
          token: request.codexChannelToken,
        });
        return runtime;
      },
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
    });

    expect(response.ok).toBe(true);
    expect(seenAttachRequests[0]).toMatchObject({
      agentName: "impl",
      activeThreadId: null,
      codexChannelToken: (response as { ok: true; codexChannelToken: string })
        .codexChannelToken,
      daemonSocketPath: "/tmp/aiox.sock",
    });
  });

  it("claude attach does not return codexChannelToken", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-23T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.attachAgent({
      kind: "claude",
      name: "alpha",
      cwd: "/repo",
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.codexChannelToken).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// registerCodexChannel
// ---------------------------------------------------------------------------

describe("daemon registerCodexChannel", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("happy path stores runtime in registry", async () => {
    const codexChannelRuntimes = new Map();
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-new",
    });
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
      codexChannelRuntimes,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const attach = await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
    });
    expect(attach.ok).toBe(true);
    const token = (attach as { ok: true; codexChannelToken: string }).codexChannelToken;

    const response = await client.registerCodexChannel({
      agentName: "impl",
      token,
    });

    expect(response).toMatchObject({ ok: true });
    expect(codexChannelRuntimes.has("impl")).toBe(true);
  });

  it("wrong token returns codex_channel_registration_failed", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-new",
    });
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    const response = await client.registerCodexChannel({
      agentName: "impl",
      token: "wrong-token",
    });

    expect(response).toMatchObject({
      ok: false,
      reason: "codex_channel_registration_failed",
    });
  });

  it("no pending token returns codex_channel_registration_failed", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-23T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.registerCodexChannel({
      agentName: "impl",
      token: "any-token",
    });

    expect(response).toMatchObject({
      ok: false,
      reason: "codex_channel_registration_failed",
    });
  });

  it("token issued for different agent rejected (no name spoofing)", async () => {
    const runtimeA = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-a",
    });
    const runtimeB = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54322/",
      startedThreadId: "thread-b",
    });
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      codexRuntimes: new Map(),
      attachCodexRuntime: async ({ agentName }) =>
        agentName === "alpha" ? runtimeA : runtimeB,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const attachA = await client.attachAgent({
      kind: "codex",
      name: "alpha",
      cwd: "/repo",
    });
    const tokenA = (attachA as { ok: true; codexChannelToken: string }).codexChannelToken;

    await client.attachAgent({ kind: "codex", name: "beta", cwd: "/repo" });

    const response = await client.registerCodexChannel({
      agentName: "beta",
      token: tokenA,
    });

    expect(response).toMatchObject({
      ok: false,
      reason: "codex_channel_registration_failed",
    });
  });
});

// ---------------------------------------------------------------------------
// disconnectCodexChannel
// ---------------------------------------------------------------------------

describe("daemon disconnectCodexChannel", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("removes runtime from registry after disconnect", async () => {
    const codexChannelRuntimes = new Map();
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-new",
    });
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
      codexChannelRuntimes,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const attach = await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
    });
    const token = (attach as { ok: true; codexChannelToken: string }).codexChannelToken;
    await client.registerCodexChannel({ agentName: "impl", token });

    const response = await client.disconnectCodexChannel({ agentName: "impl" });

    expect(response).toMatchObject({ ok: true, disconnected: true });
    expect(codexChannelRuntimes.has("impl")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// receiveCodexMessage / receiveCodexReply
// ---------------------------------------------------------------------------

describe("daemon receiveCodexMessage", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    db.close();
  });

  it("creates message and deliveries for active route fan-out", async () => {
    const setup = await setupPairedAgents(db);

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-1",
      content: "hello from codex",
    });

    expect(response).toMatchObject({
      ok: true,
      message: { id: "msg-1", content: "hello from codex", type: "question" },
    });
    expect((response as { ok: true; deliveries: unknown[] }).deliveries).toHaveLength(1);

    const messageRow = db
      .prepare("select id, content, type, parent_message_id from messages where id = ?")
      .get("msg-1") as
      | { id: string; content: string; type: string; parent_message_id: string | null }
      | undefined;
    expect(messageRow).toMatchObject({
      id: "msg-1",
      content: "hello from codex",
      type: "question",
      parent_message_id: null,
    });
  });

  it("receiveCodexMessage dispatches queued delivery to registered Claude channel", async () => {
    const requests: { url: string; body: unknown }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      requests.push({ url, body: JSON.parse(init.body as string) });
      return new Response("{}", { status: 202 });
    });
    const setup = await setupPairedAgents(db, {
      claudeEndpoint: "http://127.0.0.1:18789/send",
    });

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-1",
      content: "hello from codex",
    });

    expect(response.ok).toBe(true);
    expect(requests).toEqual([
      {
        url: "http://127.0.0.1:18789/send",
        body: {
          content: "hello from codex",
          chat_id: "msg-1",
          origin: "impl",
        },
      },
    ]);
    expect(db.prepare("select status from message_deliveries").get()).toMatchObject({
      status: "completed",
    });
    expect(
      db.prepare("select type from events where delivery_id is not null order by rowid").all(),
    ).toEqual([
      { type: "delivery_queued" },
      { type: "delivery_status_changed" },
      { type: "delivery_status_changed" },
      { type: "delivery_status_changed" },
    ]);
  });

  it("missing token returns codex_ingress_unauthorized", async () => {
    const setup = await setupPairedAgents(db);

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: "",
      messageId: "msg-1",
      content: "hello",
    });

    expect(response).toMatchObject({
      ok: false,
      reason: "codex_ingress_unauthorized",
    });
  });

  it("unregistered codex agent returns codex_ingress_unauthorized", async () => {
    const setup = await setupPairedAgents(db, { skipRegister: true });

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-1",
      content: "hello",
    });

    expect(response).toMatchObject({
      ok: false,
      reason: "codex_ingress_unauthorized",
    });
  });

  it("token + agentName mismatch returns codex_ingress_unauthorized", async () => {
    const setup = await setupPairedAgents(db);

    const response = await setup.client.receiveCodexMessage({
      agentName: "reviewer", // a claude agent — not a codex source
      token: setup.codexToken,
      messageId: "msg-1",
      content: "hello",
    });

    expect(response).toMatchObject({
      ok: false,
      reason: "codex_ingress_unauthorized",
    });
  });

  it("no active routes returns no_active_routes and writes no rows", async () => {
    const setup = await setupSoloCodexAgent(db);

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-1",
      content: "hello",
    });

    expect(response).toMatchObject({ ok: false, reason: "no_active_routes" });
    expect(db.prepare("select count(*) as n from messages").get()).toMatchObject({ n: 0 });
    expect(db.prepare("select count(*) as n from message_deliveries").get()).toMatchObject({ n: 0 });
  });

  it("does not modify existing daemon sendMessage RPC behavior", async () => {
    const setup = await setupPairedAgents(db);

    const response = await setup.client.sendMessage({
      sourceName: "impl",
      messageId: "msg-1",
      type: "question",
      content: "via existing rpc",
    });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.deliveries).toHaveLength(1);
    }
  });
});

describe("daemon receiveCodexReply", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates a reply message linked to parent_message_id", async () => {
    const setup = await setupPairedAgents(db);

    // first seed a parent message from reviewer (claude) to impl (codex)
    const parent = await setup.client.sendMessage({
      sourceName: "reviewer",
      messageId: "parent-1",
      type: "question",
      content: "please reply",
    });
    expect(parent.ok).toBe(true);

    const response = await setup.client.receiveCodexReply({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "reply-1",
      parentMessageId: "parent-1",
      content: "ack",
    });

    expect(response).toMatchObject({
      ok: true,
      message: {
        id: "reply-1",
        type: "reply",
      },
    });

    const replyRow = db
      .prepare("select parent_message_id, type from messages where id = ?")
      .get("reply-1") as { parent_message_id: string | null; type: string } | undefined;
    expect(replyRow).toMatchObject({
      parent_message_id: "parent-1",
      type: "reply",
    });
  });

  it("missing token returns codex_ingress_unauthorized", async () => {
    const setup = await setupPairedAgents(db);

    const response = await setup.client.receiveCodexReply({
      agentName: "impl",
      token: "",
      messageId: "reply-1",
      parentMessageId: "parent-1",
      content: "ack",
    });

    expect(response).toMatchObject({
      ok: false,
      reason: "codex_ingress_unauthorized",
    });
  });
});


describe("daemon receiveClaudeChannelMessage", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("routes a Claude initiated message to the live Codex thread without chat_id", async () => {
    const setup = await setupPairedAgents(db);

    const response = await setup.client.receiveClaudeChannelMessage({
      agentName: "reviewer",
      messageId: "claude-msg-1",
      text: "hello from claude",
    });

    expect(response).toMatchObject({
      ok: true,
      message: { id: "claude-msg-1", type: "question", parentMessageId: null },
    });
    expect(setup.runtime.requests).toContainEqual({
      method: "turn/start",
      params: {
        threadId: "thread-impl",
        input: [{ type: "text", text: "hello from claude" }],
      },
      options: {
        timeoutMs: undefined,
        timeoutErrorCode: "codex_turn_start_timeout",
      },
    });
    expect(
      db
        .prepare("select type, parent_message_id, content from messages where id = ?")
        .get("claude-msg-1"),
    ).toMatchObject({
      type: "question",
      parent_message_id: null,
      content: "hello from claude",
    });
    expect(
      db.prepare("select type from events where type = 'claude_channel_message_received'").get(),
    ).toMatchObject({ type: "claude_channel_message_received" });
  });
});

describe("daemon receiveClaudeChannelReply", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates routed reply delivery to connected Codex channel", async () => {
    const setup = await setupPairedAgents(db);
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: "please review",
    });
    expect(parent.ok).toBe(true);

    const response = await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      chatId: "msg-parent",
      text: "review complete",
    });

    expect(response).toEqual({ ok: true });
    expect(setup.runtime.requests).toContainEqual({
      method: "turn/start",
      params: {
        threadId: "thread-impl",
        input: [{ type: "text", text: "review complete" }],
      },
      options: {
        timeoutMs: undefined,
        timeoutErrorCode: "codex_turn_start_timeout",
      },
    });
    expect(
      db
        .prepare(
          `
            select messages.type, messages.parent_message_id, messages.content
            from messages
            join agents on agents.id = messages.source_agent_id
            where agents.name = ?
            order by messages.rowid desc
            limit 1
          `,
        )
        .get("reviewer"),
    ).toMatchObject({
      type: "reply",
      parent_message_id: "msg-parent",
      content: "review complete",
    });
    expect(
      db.prepare("select status from message_deliveries order by rowid desc limit 1").get(),
    ).toMatchObject({ status: "completed" });
  });

  it("routes Claude replies into the live loaded Codex thread instead of the cached active thread", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: ["thread-new"],
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: "please review",
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      chatId: "msg-parent",
      text: "review complete",
    });

    expect(setup.runtime.requests).toContainEqual({
      method: "thread/loaded/list",
      params: {},
      options: undefined,
    });
    expect(setup.runtime.requests).toContainEqual({
      method: "turn/start",
      params: {
        threadId: "thread-new",
        input: [{ type: "text", text: "review complete" }],
      },
      options: {
        timeoutMs: undefined,
        timeoutErrorCode: "codex_turn_start_timeout",
      },
    });
  });

  it("records the selected Codex delivery target", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: ["thread-old", "thread-new"],
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: "please review",
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      chatId: "msg-parent",
      text: "review complete",
    });

    expect(
      db
        .prepare(
          `
            select events.type, events.data_json, events.message_id, events.delivery_id, events.route_id, agents.name as agent_name
            from events
            join agents on agents.id = events.agent_id
            where events.type = 'codex_delivery_target_selected'
            order by events.rowid desc
            limit 1
          `,
        )
        .get(),
    ).toMatchObject({
      type: "codex_delivery_target_selected",
      data_json: JSON.stringify({
        operation: "thread/loaded/list",
        loadedThreadIds: ["thread-old", "thread-new"],
        chosenThreadId: "thread-new",
        previousAdapterSessionId: null,
        runtimeActiveThreadId: null,
        selectionPolicy: "latest_loaded_thread",
        deliveryMessageType: "reply",
        sourceAgentName: "reviewer",
        targetAgentName: "impl",
      }),
      message_id: expect.any(String),
      delivery_id: expect.any(String),
      route_id: expect.any(String),
      agent_name: "impl",
    });
  });

  it("keeps Claude reply delivery queued when Codex has no live loaded thread", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: [],
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: "please review",
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      chatId: "msg-parent",
      text: "review complete",
    });

    expect(setup.runtime.requests).toContainEqual({
      method: "thread/loaded/list",
      params: {},
      options: undefined,
    });
    expect(
      setup.runtime.requests.some((request) => request.method === "turn/start"),
    ).toBe(false);
    expect(
      db.prepare("select status from message_deliveries order by rowid desc limit 1").get(),
    ).toMatchObject({ status: "queued" });
  });

  it("records a no-loaded-thread queued event when Codex has no live loaded thread", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: [],
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: "please review",
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      chatId: "msg-parent",
      text: "review complete",
    });

    expect(
      db
        .prepare("select type, data_json from events order by rowid desc limit 1")
        .get(),
    ).toMatchObject({
      type: "codex_delivery_queued_no_loaded_thread",
      data_json: JSON.stringify({
        reason: "codex_no_loaded_thread",
        message: "Codex runtime has no loaded thread id",
      }),
    });
  });

  it("records unavailable Codex delivery target details when no live thread exists", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: [],
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: "please review",
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      chatId: "msg-parent",
      text: "review complete",
    });

    expect(
      db
        .prepare(
          `
            select events.type, events.data_json, events.message_id, events.delivery_id, events.route_id, agents.name as agent_name
            from events
            join agents on agents.id = events.agent_id
            where events.type = 'codex_delivery_target_unavailable'
            order by events.rowid desc
            limit 1
          `,
        )
        .get(),
    ).toMatchObject({
      type: "codex_delivery_target_unavailable",
      data_json: JSON.stringify({
        operation: "thread/loaded/list",
        loadedThreadIds: [],
        previousAdapterSessionId: null,
        runtimeActiveThreadId: null,
        reason: "codex_no_loaded_thread",
        deliveryMessageType: "reply",
        sourceAgentName: "reviewer",
        targetAgentName: "impl",
      }),
      message_id: expect.any(String),
      delivery_id: expect.any(String),
      route_id: expect.any(String),
      agent_name: "impl",
    });
  });

  it("does not emit a rebind event when the live Codex thread already matches the agent cache", async () => {
    const setup = await setupPairedAgents(db);
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: "please review",
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      chatId: "msg-parent",
      text: "review complete",
    });

    expect(
      db
        .prepare("select count(*) as n from events where type = 'agent_thread_id_rebound'")
        .get(),
    ).toMatchObject({ n: 1 });
  });

  it("uses the latest loaded Codex thread instead of the daemon-created hidden thread", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-hidden",
        loadedThreadIds: ["thread-hidden", "thread-visible"],
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: "please review",
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      chatId: "msg-parent",
      text: "review complete",
    });

    expect(setup.runtime.requests).toContainEqual({
      method: "turn/start",
      params: {
        threadId: "thread-visible",
        input: [{ type: "text", text: "review complete" }],
      },
      options: {
        timeoutMs: undefined,
        timeoutErrorCode: "codex_turn_start_timeout",
      },
    });
  });

  it("keeps using the latest loaded Codex thread after the visible thread becomes cached", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-hidden",
        loadedThreadIds: ["thread-hidden", "thread-visible"],
      },
    });
    const firstParent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent-1",
      content: "please review",
    });
    expect(firstParent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      chatId: "msg-parent-1",
      text: "first reply",
    });

    const secondParent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent-2",
      content: "please review again",
    });
    expect(secondParent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      chatId: "msg-parent-2",
      text: "second reply",
    });

    const turnStarts = setup.runtime.requests.filter(
      (request) => request.method === "turn/start",
    );
    expect(turnStarts).toContainEqual({
      method: "turn/start",
      params: {
        threadId: "thread-visible",
        input: [{ type: "text", text: "second reply" }],
      },
      options: {
        timeoutMs: undefined,
        timeoutErrorCode: "codex_turn_start_timeout",
      },
    });
  });

  it("records Codex delivery target injection failures", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: ["thread-new"],
        failTurnStart: true,
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: "please review",
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      chatId: "msg-parent",
      text: "review complete",
    });

    expect(
      db
        .prepare(
          `
            select events.type, events.data_json, events.message_id, events.delivery_id, events.route_id, agents.name as agent_name
            from events
            join agents on agents.id = events.agent_id
            where events.type = 'codex_delivery_target_injection_failed'
            order by events.rowid desc
            limit 1
          `,
        )
        .get(),
    ).toMatchObject({
      type: "codex_delivery_target_injection_failed",
      data_json: JSON.stringify({
        chosenThreadId: "thread-new",
        loadedThreadIds: ["thread-new"],
        reason: "adapter_inject_failed",
        message: "turn/start failed",
        sourceAgentName: "reviewer",
        targetAgentName: "impl",
      }),
      message_id: expect.any(String),
      delivery_id: expect.any(String),
      route_id: expect.any(String),
      agent_name: "impl",
    });
  });

  it("marks delivery failed when live loaded thread injection fails", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: ["thread-new"],
        failTurnStart: true,
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: "please review",
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      chatId: "msg-parent",
      text: "review complete",
    });

    expect(
      db.prepare("select status from message_deliveries order by rowid desc limit 1").get(),
    ).toMatchObject({ status: "failed" });
    expect(
      db
        .prepare(
          "select data_json from events where type = 'delivery_status_changed' order by rowid desc limit 1",
        )
        .get(),
    ).toMatchObject({
      data_json: JSON.stringify({
        status: "failed",
        error: {
          reason: "adapter_inject_failed",
          message: "turn/start failed",
        },
      }),
    });
  });
});

// ---------------------------------------------------------------------------
// Codex ingress authorization revocation
// ---------------------------------------------------------------------------

describe("Codex ingress authorization revocation", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("registered Codex channel cannot send after notifyTuiExited", async () => {
    const setup = await setupPairedAgents(db);

    await setup.client.notifyTuiExited({ agentName: "impl", exitCode: 0 });

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-1",
      content: "late message",
    });

    expect(response).toMatchObject({ ok: false, reason: "codex_ingress_unauthorized" });
  });

  it("registered Codex channel cannot send after detachAgent", async () => {
    const setup = await setupPairedAgents(db);

    await setup.client.detachAgent({ agentName: "impl" });

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-1",
      content: "late message",
    });

    expect(response).toMatchObject({ ok: false, reason: "codex_ingress_unauthorized" });
  });

  it("stop daemonOnly false clears pending and registered Codex ingress state", async () => {
    const setup = await setupPairedAgents(db);

    await setup.client.stop({ daemonOnly: false });

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-1",
      content: "late message",
    });

    expect(response).toMatchObject({ ok: false, reason: "codex_ingress_unauthorized" });
  });

  it("disconnected agent with stale codexChannelRuntimes entry is rejected", async () => {
    const { createHash } = await import("node:crypto");
    const setup = await setupPairedAgents(db);

    await setup.client.detachAgent({ agentName: "impl" });

    // Simulate a stale entry surviving cleanup (defense-in-depth check)
    const staleHash = createHash("sha256").update(setup.codexToken).digest("hex");
    setup.codexChannelRuntimes.set("impl", {
      agentName: "impl",
      registeredAt: "2026-05-23T00:00:00.000Z",
      tokenHash: staleHash,
    });

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-1",
      content: "late message",
    });

    expect(response).toMatchObject({ ok: false, reason: "codex_ingress_unauthorized" });
  });

  it("runtime failure clears old channel before same-name reattach", async () => {
    const setup = await setupPairedAgents(db);

    setup.state.recordCodexRuntimeFailed({
      agentName: "impl",
      reason: {
        type: "ws_dropped",
        closeCode: 1006,
        closeReason: "network dropped",
      },
    });
    await setup.client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
    });

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-1",
      content: "old token after reattach",
    });

    expect(response).toMatchObject({ ok: false, reason: "codex_ingress_unauthorized" });
  });

  it("tokenHash stored as full 64-char SHA-256 hex", async () => {
    const codexChannelRuntimes = new Map();
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-new",
    });
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
      codexChannelRuntimes,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const attach = await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    const token = (attach as { ok: true; codexChannelToken: string }).codexChannelToken;
    await client.registerCodexChannel({ agentName: "impl", token });

    const stored = codexChannelRuntimes.get("impl");
    expect(stored).toBeDefined();
    expect(stored.tokenHash).toHaveLength(64);
  });
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function setupPairedAgents(
  db: InstanceType<typeof Database>,
  opts: {
    skipRegister?: boolean;
    claudeEndpoint?: string;
    codexRuntime?: {
      startedThreadId?: string;
      loadedThreadIds?: string[];
      failTurnStart?: boolean;
    };
  } = {},
) {
  const codexChannelRuntimes = new Map();
  const claudeChannelRuntimes = new Map();
  const runtime = fakeCodexRuntime({
    endpoint: "ws://127.0.0.1:54321/",
    startedThreadId: opts.codexRuntime?.startedThreadId ?? "thread-impl",
    loadedThreadIds: opts.codexRuntime?.loadedThreadIds,
    failTurnStart: opts.codexRuntime?.failTurnStart,
  });
  const state = createDaemonState({
    db,
    createId: monotonicIdSequence(),
    now: monotonicNowSequence(),
    codexRuntimes: new Map(),
    attachCodexRuntime: async () => runtime,
    codexChannelRuntimes,
    claudeChannelRuntimes,
  });
  const client = createInProcessClient(createDaemonApi(state));
  await client.createPair({ name: "pair-1" });
  const claudeAttach = await client.attachAgent({
    kind: "claude",
    name: "reviewer",
    cwd: "/repo",
    pairName: "pair-1",
  });
  if (opts.claudeEndpoint) {
    const claudeToken = (claudeAttach as { ok: true; claudeChannelToken: string })
      .claudeChannelToken;
    await client.registerClaudeChannel({
      agentName: "reviewer",
      token: claudeToken,
      endpoint: opts.claudeEndpoint,
    });
  }
  const codexAttach = await client.attachAgent({
    kind: "codex",
    name: "impl",
    cwd: "/repo",
    pairName: "pair-1",
  });
  const codexToken = (codexAttach as { ok: true; codexChannelToken: string }).codexChannelToken;
  if (!opts.skipRegister) {
    const reg = await client.registerCodexChannel({ agentName: "impl", token: codexToken });
    if (!reg.ok) {
      throw new Error(`failed register: ${JSON.stringify(reg)}`);
    }
  }
  return { client, codexToken, codexChannelRuntimes, claudeChannelRuntimes, runtime, state };
}

async function setupSoloCodexAgent(db: InstanceType<typeof Database>) {
  const runtime = fakeCodexRuntime({
    endpoint: "ws://127.0.0.1:54321/",
    startedThreadId: "thread-impl",
  });
  const state = createDaemonState({
    db,
    createId: monotonicIdSequence(),
    now: monotonicNowSequence(),
    codexRuntimes: new Map(),
    attachCodexRuntime: async () => runtime,
  });
  const client = createInProcessClient(createDaemonApi(state));
  const codexAttach = await client.attachAgent({
    kind: "codex",
    name: "impl",
    cwd: "/repo",
  });
  const codexToken = (codexAttach as { ok: true; codexChannelToken: string }).codexChannelToken;
  await client.registerCodexChannel({ agentName: "impl", token: codexToken });
  return { client, codexToken };
}

function monotonicIdSequence() {
  let n = 0;
  return () => `id-${++n}`;
}

function monotonicNowSequence() {
  let n = 0;
  return () => {
    n += 1;
    const seconds = String(n).padStart(2, "0");
    return `2026-05-23T00:00:${seconds}.000Z`;
  };
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

function createIdSequence(ids: string[]): () => string {
  return () => {
    const id = ids.shift();
    if (!id) {
      throw new Error("unexpected id request");
    }
    return id;
  };
}

function createNowSequence(values: string[]): () => string {
  return () => {
    const value = values.shift();
    if (!value) {
      return values[values.length - 1] ?? "2026-05-23T00:00:00.000Z";
    }
    return value;
  };
}

function fakeCodexRuntime(options: {
  endpoint: string;
  startedThreadId?: string;
  resumedThreadId?: string;
  loadedThreadIds?: string[];
  failTurnStart?: boolean;
}) {
  const requests: Array<{
    method: string;
    params: unknown;
    options: unknown;
  }> = [];

  return {
    state: "ready" as const,
    endpoint: new URL(options.endpoint),
    activeThreadId: null as string | null,
    requests,
    startThreadCalls: 0,
    resumeThreadCalls: [] as string[],
    disposeCalls: 0,
    requestCodex(method: string, params?: unknown, requestOptions?: unknown) {
      requests.push({ method, params, options: requestOptions });
      if (method === "thread/loaded/list") {
        return Promise.resolve({
          data:
            options.loadedThreadIds ??
            (options.startedThreadId
              ? [options.startedThreadId]
              : this.activeThreadId
                ? [this.activeThreadId]
                : []),
        });
      }
      if (method === "turn/start" && options.failTurnStart) {
        return Promise.reject(new Error("turn/start failed"));
      }
      return Promise.resolve({ turn: { id: "turn-1", status: "inProgress" } });
    },
    async startThread() {
      this.startThreadCalls += 1;
      this.activeThreadId = options.startedThreadId ?? null;
      return this.activeThreadId;
    },
    async resumeThread(threadId: string) {
      this.resumeThreadCalls.push(threadId);
      this.activeThreadId = options.resumedThreadId ?? threadId;
      return this.activeThreadId;
    },
    async listLoadedThreadIds() {
      const result = await this.requestCodex("thread/loaded/list", {});
      if (typeof result === "object" && result !== null && "data" in result) {
        return Array.isArray(result.data) ? result.data : [];
      }
      return [];
    },
    rebindActiveThread(threadId: string) {
      this.activeThreadId = threadId;
    },
    async dispose() {
      this.disposeCalls += 1;
      this.state = "disposed" as typeof this.state;
    },
  };
}
