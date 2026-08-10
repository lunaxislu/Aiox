import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { CodexAppServerWebSocketError } from "../../../src/adapters/codex/websocket.js";
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

describe("Codex pre-write queue admission", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("rejects an entire fan-out before persistence when one target queue is full", async () => {
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      scheduleTimeout: discardScheduledTimeout,
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "source", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "first", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "second", cwd: "/repo" });
    await client.connect({ sourceName: "source", targetNames: ["first", "second"] });

    for (let index = 0; index < 32; index += 1) {
      await expect(
        client.sendMessage({
          sourceName: "source",
          messageId: `queued-${index}`,
          type: "instruction",
          content: "hold",
        }),
      ).resolves.toMatchObject({ ok: true });
    }

    await expect(
      client.sendMessage({
        sourceName: "source",
        messageId: "rejected-fanout",
        type: "instruction",
        content: "must not partially persist",
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "delivery_queue_full",
      targetAgentIds: expect.arrayContaining([expect.any(String)]),
    });
    expect(db.prepare("select count(*) as count from messages").get()).toEqual({ count: 32 });
    expect(db.prepare("select count(*) as count from message_deliveries").get()).toEqual({ count: 64 });
  });

  it("expires a queued delivery after five minutes as failed with delivery_expired", async () => {
    const scheduled: Array<{ callback: () => void; delayMs: number }> = [];
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: () => "2026-07-20T00:00:00.000Z",
      scheduleTimeout: (callback, delayMs) => {
        scheduled.push({ callback, delayMs });
        return scheduled.length;
      },
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "source", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "target", cwd: "/repo" });
    await client.connect({ sourceName: "source", targetNames: ["target"] });
    await client.sendMessage({
      sourceName: "source",
      messageId: "expires",
      type: "instruction",
      content: "hold",
    });

    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.delayMs).toBe(5 * 60 * 1_000);
    scheduled[0]?.callback();
    expect(db.prepare("select status from message_deliveries").get()).toEqual({ status: "failed" });
    expect(
      db.prepare("select type, data_json from events where type = 'delivery_expired'").get(),
    ).toEqual({ type: "delivery_expired", data_json: JSON.stringify({ reason: "delivery_expired" }) });
  });

  it("keeps a conclusively pre-write delivery queued after its three automatic retries", async () => {
    const scheduled: Array<{ callback: () => void; delayMs: number }> = [];
    const setup = await setupPairedAgents(db, {
      scheduleTimeout: (callback, delayMs) => {
        scheduled.push({ callback, delayMs });
        return scheduled.length;
      },
    });

    const result = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "retry-pre-write",
      content: { text: "wait for unavailable target" },
    });
    expect(result).toMatchObject({ ok: true, deliveries: [{ status: "queued" }] });
    expect(scheduled.map((entry) => entry.delayMs)).toContain(250);

    scheduled.find((entry) => entry.delayMs === 250)?.callback();
    await vi.waitFor(() => {
      expect(scheduled.map((entry) => entry.delayMs)).toContain(1_000);
    });
    scheduled.find((entry) => entry.delayMs === 1_000)?.callback();
    await vi.waitFor(() => {
      expect(scheduled.map((entry) => entry.delayMs)).toContain(4_000);
    });
    scheduled.find((entry) => entry.delayMs === 4_000)?.callback();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(db.prepare("select status from message_deliveries").get()).toEqual({ status: "queued" });
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
      content: { text: "hello from codex" },
    });

    expect(response).toMatchObject({
      ok: true,
      message: { id: "msg-1", content: "hello from codex", type: "question" },
    });
    expect((response as { ok: true; deliveries: unknown[] }).deliveries).toHaveLength(1);
    expect(setup.scheduledTimeouts.map(({ delayMs }) => delayMs)).toContain(250);

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
    const deliveryStatusesAtFetch: string[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      const row = db
        .prepare("select status from message_deliveries where message_id = ?")
        .get("msg-1") as { status: string } | undefined;
      if (row) {
        deliveryStatusesAtFetch.push(row.status);
      }
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
      content: { text: "hello from codex" },
    });

    expect(response.ok).toBe(true);
    const delivery = db
      .prepare(
        `
          select d.id, m.created_at as createdAt
          from message_deliveries d
          join messages m on m.id = d.message_id
          where m.id = ?
        `,
      )
      .get("msg-1") as { id: string; createdAt: string };
    expect(requests).toEqual([
      {
        url: "http://127.0.0.1:18789/send",
        body: {
          content: JSON.stringify({
            protocol: "aiox.message.v1",
            messageId: "msg-1",
            deliveryId: delivery.id,
            source: { kind: "agent", address: "agent://local/release/impl" },
            target: { address: "agent://local/release/reviewer" },
            type: "question",
            intent: null,
            replyExpected: null,
            content: { mediaType: "text/plain", text: "hello from codex" },
            createdAt: delivery.createdAt,
          }),
        },
      },
    ]);
    expect(deliveryStatusesAtFetch).toEqual(["delivering"]);
    expect(db.prepare("select status from message_deliveries").get()).toMatchObject({
      status: "delivered",
    });
    expect(
      db.prepare("select type from events where delivery_id is not null order by rowid").all(),
    ).toEqual([
      { type: "delivery_queued" },
      { type: "delivery_status_changed" },
      { type: "delivery_status_changed" },
    ]);
  });

  it("leaves an ambiguous Claude push unconfirmed without a pre-write retry", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("socket closed after request start");
    });
    const scheduled: Array<{ delayMs: number }> = [];
    const setup = await setupPairedAgents(db, {
      claudeEndpoint: "http://127.0.0.1:18789/send",
      scheduleTimeout: (_callback, delayMs) => {
        scheduled.push({ delayMs });
        return scheduled.length;
      },
    });

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-ambiguous-claude-push",
      content: { text: "hello from codex" },
    });

    expect(response).toMatchObject({
      ok: true,
      dispatch: {
        delivered: 0,
        deferred: [],
        failed: [{ reason: "claude_channel_push_unconfirmed" }],
      },
    });
    expect(
      db.prepare("select status from message_deliveries where message_id = ?").get(
        "msg-ambiguous-claude-push",
      ),
    ).toEqual({ status: "unconfirmed" });
    expect(scheduled.map(({ delayMs }) => delayMs)).not.toContain(250);
  });

  it("defers a positively identified Claude connection refusal to the pre-write retry queue", async () => {
    vi.stubGlobal("fetch", async () => {
      throw Object.assign(new Error("connect ECONNREFUSED"), {
        code: "ECONNREFUSED",
      });
    });
    const scheduled: Array<{ delayMs: number }> = [];
    const setup = await setupPairedAgents(db, {
      claudeEndpoint: "http://127.0.0.1:18789/send",
      scheduleTimeout: (_callback, delayMs) => {
        scheduled.push({ delayMs });
        return scheduled.length;
      },
    });

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-econnrefused-claude-push",
      content: { text: "hello from codex" },
    });

    expect(response).toMatchObject({
      ok: true,
      dispatch: {
        delivered: 0,
        deferred: [{ reason: "target_runtime_unavailable" }],
        failed: [],
      },
    });
    expect(
      db.prepare("select status from message_deliveries where message_id = ?").get(
        "msg-econnrefused-claude-push",
      ),
    ).toEqual({ status: "queued" });
    expect(scheduled.map(({ delayMs }) => delayMs)).toContain(250);
  });

  it("defers a Claude connection refusal exposed via error.cause.code to the pre-write retry queue", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("fetch failed", {
        cause: Object.assign(new Error("connect ECONNREFUSED"), {
          code: "ECONNREFUSED",
        }),
      });
    });
    const scheduled: Array<{ delayMs: number }> = [];
    const setup = await setupPairedAgents(db, {
      claudeEndpoint: "http://127.0.0.1:18789/send",
      scheduleTimeout: (_callback, delayMs) => {
        scheduled.push({ delayMs });
        return scheduled.length;
      },
    });

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-econnrefused-cause-claude-push",
      content: { text: "hello from codex" },
    });

    expect(response).toMatchObject({
      ok: true,
      dispatch: {
        delivered: 0,
        deferred: [{ reason: "target_runtime_unavailable" }],
        failed: [],
      },
    });
    expect(
      db.prepare("select status from message_deliveries where message_id = ?").get(
        "msg-econnrefused-cause-claude-push",
      ),
    ).toEqual({ status: "queued" });
    expect(scheduled.map(({ delayMs }) => delayMs)).toContain(250);
  });

  it("leaves a Claude push with a non-refusal error code (ECONNRESET) unconfirmed without a pre-write retry", async () => {
    vi.stubGlobal("fetch", async () => {
      throw Object.assign(new Error("socket hang up"), {
        code: "ECONNRESET",
      });
    });
    const scheduled: Array<{ delayMs: number }> = [];
    const setup = await setupPairedAgents(db, {
      claudeEndpoint: "http://127.0.0.1:18789/send",
      scheduleTimeout: (_callback, delayMs) => {
        scheduled.push({ delayMs });
        return scheduled.length;
      },
    });

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-econnreset-claude-push",
      content: { text: "hello from codex" },
    });

    expect(response).toMatchObject({
      ok: true,
      dispatch: {
        delivered: 0,
        deferred: [],
        failed: [{ reason: "claude_channel_push_unconfirmed" }],
      },
    });
    expect(
      db.prepare("select status from message_deliveries where message_id = ?").get(
        "msg-econnreset-claude-push",
      ),
    ).toEqual({ status: "unconfirmed" });
    expect(scheduled.map(({ delayMs }) => delayMs)).not.toContain(250);
  });

  it("preserves the stored delivery ID in the Codex canonical envelope", async () => {
    const runtimeA = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-impl-a",
    });
    const runtimeB = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54322/",
      startedThreadId: "thread-impl-b",
    });
    const codexRuntimeByName = new Map([
      ["impl-a", runtimeA],
      ["impl-b", runtimeB],
    ]);
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      codexRuntimes: new Map(),
      attachCodexRuntime: async ({ agentName }) => {
        const runtime = codexRuntimeByName.get(agentName);
        if (!runtime) {
          throw new Error(`missing fake runtime for ${agentName}`);
        }
        return runtime;
      },
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.createPair({ name: "pair-1" });
    const attachA = await client.attachAgent({
      kind: "codex",
      name: "impl-a",
      cwd: "/repo",
      pairName: "pair-1",
    });
    const attachB = await client.attachAgent({
      kind: "codex",
      name: "impl-b",
      cwd: "/repo",
      pairName: "pair-1",
    });
    const tokenA = (attachA as { ok: true; codexChannelToken: string }).codexChannelToken;
    const tokenB = (attachB as { ok: true; codexChannelToken: string }).codexChannelToken;
    await client.registerCodexChannel({ agentName: "impl-a", token: tokenA });
    await client.registerCodexChannel({ agentName: "impl-b", token: tokenB });

    const response = await client.receiveCodexMessage({
      agentName: "impl-a",
      token: tokenA,
      messageId: "codex-msg-1",
      type: "instruction",
      intent: "delegation",
      replyExpected: true,
      content: { text: "hello from codex" },
    });

    expect(response.ok).toBe(true);
    const delivery = db
      .prepare(
        `
          select d.id, m.created_at as createdAt
          from message_deliveries d
          join messages m on m.id = d.message_id
          where m.id = ?
        `,
      )
      .get("codex-msg-1") as { id: string; createdAt: string };
    expect(runtimeB.requests).toContainEqual({
      method: "turn/start",
      params: {
        threadId: "thread-impl-b",
        input: [
          {
            type: "text",
            text: JSON.stringify({
              protocol: "aiox.message.v1",
              messageId: "codex-msg-1",
              deliveryId: delivery.id,
              source: {
                kind: "agent",
                address: "agent://local/release/impl-a",
              },
              target: { address: "agent://local/release/impl-b" },
              type: "instruction",
              intent: "delegation",
              replyExpected: true,
              content: { mediaType: "text/plain", text: "hello from codex" },
              createdAt: delivery.createdAt,
            }),
          },
        ],
      },
      options: {
        timeoutMs: undefined,
        timeoutErrorCode: "codex_turn_start_timeout",
      },
    });
  });

  it("keeps Codex-to-Codex delivery queued when the target Codex has no live loaded thread", async () => {
    const runtimeA = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-impl-a",
    });
    const runtimeB = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54322/",
      startedThreadId: "thread-old",
      loadedThreadIds: [],
    });
    const codexRuntimeByName = new Map([
      ["impl-a", runtimeA],
      ["impl-b", runtimeB],
    ]);
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      scheduleTimeout: discardScheduledTimeout,
      codexRuntimes: new Map(),
      attachCodexRuntime: async ({ agentName }) => {
        const runtime = codexRuntimeByName.get(agentName);
        if (!runtime) {
          throw new Error(`missing fake runtime for ${agentName}`);
        }
        return runtime;
      },
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.createPair({ name: "pair-1" });
    const attachA = await client.attachAgent({
      kind: "codex",
      name: "impl-a",
      cwd: "/repo",
      pairName: "pair-1",
    });
    const attachB = await client.attachAgent({
      kind: "codex",
      name: "impl-b",
      cwd: "/repo",
      pairName: "pair-1",
    });
    const tokenA = (attachA as { ok: true; codexChannelToken: string }).codexChannelToken;
    const tokenB = (attachB as { ok: true; codexChannelToken: string }).codexChannelToken;
    await client.registerCodexChannel({ agentName: "impl-a", token: tokenA });
    await client.registerCodexChannel({ agentName: "impl-b", token: tokenB });

    const response = await client.receiveCodexMessage({
      agentName: "impl-a",
      token: tokenA,
      messageId: "codex-msg-1",
      content: { text: "hello from codex" },
    });

    expect(response).toMatchObject({
      ok: true,
      dispatch: {
        delivered: 0,
        deferred: [
          {
            reason: "target_binding_unconfirmed",
            eligibility: "requires target codex binding",
          },
        ],
        failed: [],
      },
    });
    expect(runtimeB.requests.some((request) => request.method === "turn/start")).toBe(false);
    expect(db.prepare("select status from message_deliveries").get()).toMatchObject({
      status: "queued",
    });
    const statusEvents = db
      .prepare("select data_json from events where type = 'delivery_status_changed'")
      .all() as { data_json: string }[];
    expect(
      statusEvents.some((event) => JSON.parse(event.data_json).status === "delivering"),
    ).toBe(false);
  });

  it("missing token returns codex_ingress_unauthorized", async () => {
    const setup = await setupPairedAgents(db);

    const response = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: "",
      messageId: "msg-1",
      content: { text: "hello" },
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
      content: { text: "hello" },
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
      content: { text: "hello" },
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
      content: { text: "hello" },
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

  it("rejects a reply to an unknown delivery ID", async () => {
    const setup = await setupPairedAgents(db);

    const response = await setup.client.receiveCodexReply({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "reply-unknown",
      inReplyToDeliveryId: "delivery-missing",
      intent: "result",
      replyExpected: false,
      content: { text: "ack" },
    });

    expect(response).toEqual({ ok: false, reason: "unknown_delivery" });
    expect(db.prepare("select count(*) as n from messages").get()).toEqual({ n: 0 });
  });

  it("rejects a reply when the originating delivery does not allow replies", async () => {
    const setup = await setupPairedAgents(db);
    await setup.client.sendMessage({
      sourceName: "reviewer", messageId: "no-reply", type: "question",
      replyExpected: false, content: "no response requested",
    });

    const response = await setup.client.receiveCodexReply({
      agentName: "impl", token: setup.codexToken, messageId: "reply-denied",
      inReplyToDeliveryId: deliveryIdForMessage(db, "no-reply"),
      intent: "result", replyExpected: false, content: { text: "ack" },
    });

    expect(response).toEqual({ ok: false, reason: "reply_not_expected" });
  });

  it("rejects a reply from an authenticated agent that is not the original target", async () => {
    const setup = await setupPairedAgents(db);
    await setup.client.sendMessage({
      sourceName: "reviewer", messageId: "wrong-target", type: "question",
      replyExpected: true, content: "impl must answer",
    });

    const response = await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "wrong-target"),
      intent: "result", replyExpected: false, content: { text: "forged reply" },
    });

    expect(response).toEqual({ ok: false, reason: "correlation_mismatch" });
  });

  it("consumes an originating delivery reply right exactly once", async () => {
    const setup = await setupPairedAgents(db);
    await setup.client.sendMessage({
      sourceName: "reviewer", messageId: "one-reply", type: "question",
      replyExpected: true, content: "respond once",
    });
    const inReplyToDeliveryId = deliveryIdForMessage(db, "one-reply");
    const first = await setup.client.receiveCodexReply({
      agentName: "impl", token: setup.codexToken, messageId: "reply-first",
      inReplyToDeliveryId, intent: "result", replyExpected: false, content: { text: "first" },
    });
    const second = await setup.client.receiveCodexReply({
      agentName: "impl", token: setup.codexToken, messageId: "reply-second",
      inReplyToDeliveryId, intent: "result", replyExpected: false, content: { text: "second" },
    });

    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, reason: "duplicate_reply" });
    expect(db.prepare("select count(*) as n from messages where type = 'reply'").get()).toEqual({ n: 1 });
  });

  it("grants a reply right for reply-expected deliveries, including reply chains", async () => {
    const setup = await setupPairedAgents(db);
    await setup.client.sendMessage({
      sourceName: "reviewer", messageId: "right-grant", type: "question",
      replyExpected: true, content: "respond and continue",
    });
    const originatingDeliveryId = deliveryIdForMessage(db, "right-grant");

    expect(
      db.prepare("select consumed_reply_message_id from reply_rights where originating_delivery_id = ?")
        .get(originatingDeliveryId),
    ).toEqual({ consumed_reply_message_id: null });

    const reply = await setup.client.receiveCodexReply({
      agentName: "impl", token: setup.codexToken, messageId: "right-grant-reply",
      inReplyToDeliveryId: originatingDeliveryId,
      intent: "result", replyExpected: true, content: { text: "continue" },
    });
    expect(reply.ok).toBe(true);
    if (!reply.ok) return;
    const chainedDeliveryId = reply.deliveries[0]?.id;

    expect(chainedDeliveryId).toEqual(expect.any(String));
    expect(
      db.prepare("select consumed_reply_message_id from reply_rights where originating_delivery_id = ?")
        .get(chainedDeliveryId),
    ).toEqual({ consumed_reply_message_id: null });
  });

  it("routes a reply only to the original source despite other responder routes", async () => {
    const setup = await setupPairedAgents(db);
    await setup.client.attachAgent({ kind: "claude", name: "observer", cwd: "/repo" });
    await setup.client.connect({ sourceName: "impl", targetNames: ["observer"] });
    await setup.client.sendMessage({
      sourceName: "reviewer", messageId: "source-only", type: "question",
      replyExpected: true, content: "reply to reviewer only",
    });

    const response = await setup.client.receiveCodexReply({
      agentName: "impl", token: setup.codexToken, messageId: "source-only-reply",
      inReplyToDeliveryId: deliveryIdForMessage(db, "source-only"),
      intent: "result", replyExpected: false, content: { text: "review complete" },
    });

    expect(response).toMatchObject({ ok: true, deliveries: [{ targetAgentId: expect.any(String), routeId: null }] });
    expect(
      db.prepare("select a.name from message_deliveries d join agents a on a.id = d.target_agent_id where d.message_id = ?")
        .all("source-only-reply"),
    ).toEqual([{ name: "reviewer" }]);
  });

  it("rejects an unavailable reply right without persisting an orphan reply", async () => {
    const setup = await setupPairedAgents(db);
    await setup.client.sendMessage({
      sourceName: "reviewer", messageId: "backfilled-right", type: "question",
      replyExpected: true, content: "reply once",
    });
    const inReplyToDeliveryId = deliveryIdForMessage(db, "backfilled-right");
    db.prepare("delete from reply_rights where originating_delivery_id = ?").run(inReplyToDeliveryId);

    const response = await setup.client.receiveCodexReply({
      agentName: "impl", token: setup.codexToken, messageId: "orphan-reply",
      inReplyToDeliveryId, intent: "result", replyExpected: false, content: { text: "no orphan" },
    });

    expect(response).toEqual({ ok: false, reason: "duplicate_reply" });
    expect(db.prepare("select count(*) as n from messages").get()).toEqual({ n: 1 });
    expect(db.prepare("select count(*) as n from message_deliveries").get()).toEqual({ n: 1 });
  });

  it("rejects a duplicate reply message id with a typed reply error", async () => {
    const setup = await setupPairedAgents(db);
    await setup.client.sendMessage({
      sourceName: "reviewer", messageId: "reply-id-collision", type: "question",
      replyExpected: true, content: "respond once",
    });

    const response = await setup.client.receiveCodexReply({
      agentName: "impl", token: setup.codexToken, messageId: "reply-id-collision",
      inReplyToDeliveryId: deliveryIdForMessage(db, "reply-id-collision"),
      intent: "result", replyExpected: false, content: { text: "collision" },
    });

    expect(response).toEqual({ ok: false, reason: "duplicate_reply" });
    expect(db.prepare("select count(*) as n from messages").get()).toEqual({ n: 1 });
    expect(db.prepare("select count(*) as n from message_deliveries").get()).toEqual({ n: 1 });
  });

  it("creates a reply message linked to parent_message_id", async () => {
    const setup = await setupPairedAgents(db);

    // first seed a parent message from reviewer (claude) to impl (codex)
    const parent = await setup.client.sendMessage({
      sourceName: "reviewer",
      messageId: "parent-1",
      type: "question",
      replyExpected: true,
      content: "please reply",
    });
    expect(parent.ok).toBe(true);

    const response = await setup.client.receiveCodexReply({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "reply-1",
      inReplyToDeliveryId: deliveryIdForMessage(db, "parent-1"),
      content: { text: "ack" },
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
      parent_message_id: deliveryIdForMessage(db, "parent-1"),
      type: "reply",
    });
  });

  it("receiveCodexReply dispatches routed reply delivery to registered Claude channel", async () => {
    const requests: { url: string; body: unknown }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      requests.push({ url, body: JSON.parse(init.body as string) });
      return new Response("{}", { status: 202 });
    });
    const setup = await setupPairedAgents(db, {
      claudeEndpoint: "http://127.0.0.1:18789/send",
    });

    const parent = await setup.client.sendMessage({
      sourceName: "reviewer",
      messageId: "parent-1",
      type: "question",
      replyExpected: true,
      content: "please reply",
    });
    expect(parent.ok).toBe(true);

    const response = await setup.client.receiveCodexReply({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "reply-1",
      inReplyToDeliveryId: deliveryIdForMessage(db, "parent-1"),
      content: { text: "ack" },
    });

    expect(response.ok).toBe(true);
    const delivery = db
      .prepare(
        `
          select d.id, m.created_at as createdAt
          from message_deliveries d
          join messages m on m.id = d.message_id
          where m.id = ?
        `,
      )
      .get("reply-1") as { id: string; createdAt: string };
    expect(requests).toEqual([
      {
        url: "http://127.0.0.1:18789/send",
        body: {
          content: JSON.stringify({
            protocol: "aiox.message.v1",
            messageId: "reply-1",
            deliveryId: delivery.id,
            source: { kind: "agent", address: "agent://local/release/impl" },
            target: { address: "agent://local/release/reviewer" },
            type: "reply",
            intent: null,
            replyExpected: null,
            content: { mediaType: "text/plain", text: "ack" },
            createdAt: delivery.createdAt,
            inReplyToDeliveryId: deliveryIdForMessage(db, "parent-1"),
          }),
        },
      },
    ]);
    expect(
      db.prepare("select status from message_deliveries where message_id = ?").get("reply-1"),
    ).toMatchObject({ status: "delivered" });
  });

  it("keeps Codex reply delivery queued when Claude channel is unregistered", async () => {
    const setup = await setupPairedAgents(db);

    const parent = await setup.client.sendMessage({
      sourceName: "reviewer",
      messageId: "parent-1",
      type: "question",
      replyExpected: true,
      content: "please reply",
    });
    expect(parent.ok).toBe(true);

    const response = await setup.client.receiveCodexReply({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "reply-unregistered",
      inReplyToDeliveryId: deliveryIdForMessage(db, "parent-1"),
      content: { text: "ack" },
    });

    expect(response.ok).toBe(true);
    expect(
      db
        .prepare("select status from message_deliveries where message_id = ?")
        .get("reply-unregistered"),
    ).toMatchObject({
      status: "queued",
    });
    expect(
      db.prepare("select type from events where type = 'delivery_status_changed'").all(),
    ).toEqual([]);
  });

  it("missing token returns codex_ingress_unauthorized", async () => {
    const setup = await setupPairedAgents(db);

    const response = await setup.client.receiveCodexReply({
      agentName: "impl",
      token: "",
      messageId: "reply-1",
      content: { text: "ack" },
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

  it("renders a Claude initiated message as a complete canonical envelope in the live Codex thread", async () => {
    const setup = await setupPairedAgents(db, { profile: "build" });

    const response = await setup.client.receiveClaudeChannelMessage({
      agentName: "reviewer",
      messageId: "claude-msg-1",
      type: "question",
      intent: "delegation",
      replyExpected: true,
      content: { text: "hello from claude" },
    });

    expect(response).toMatchObject({
      ok: true,
      message: { id: "claude-msg-1", type: "question", parentMessageId: null },
    });
    const delivery = db
      .prepare(
        `
          select d.id, m.created_at as createdAt
          from message_deliveries d
          join messages m on m.id = d.message_id
          where m.id = ?
        `,
      )
      .get("claude-msg-1") as { id: string; createdAt: string };
    const injection = setup.runtime.requests.find(
      (request) => request.method === "turn/start",
    ) as { params: { threadId: string; input: Array<{ text: string }> } } | undefined;
    expect(injection?.params.threadId).toBe("thread-impl");
    expect(JSON.parse(injection?.params.input[0]?.text ?? "")).toEqual({
      protocol: "aiox.message.v1",
      messageId: "claude-msg-1",
      deliveryId: delivery.id,
      source: { kind: "agent", address: "agent://local/build/reviewer" },
      target: { address: "agent://local/build/impl" },
      type: "question",
      intent: "delegation",
      replyExpected: true,
      content: { mediaType: "text/plain", text: "hello from claude" },
      createdAt: delivery.createdAt,
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

  it("preserves JSON-sensitive text in the canonical Codex turn input", async () => {
    const setup = await setupPairedAgents(db);

    const response = await setup.client.receiveClaudeChannelMessage({
      agentName: "reviewer",
      messageId: 'claude-msg-<"&',
      type: "question",
      intent: "delegation",
      replyExpected: true,
      content: { text: "5 < 6 & 7 > 3" },
    });

    expect(response.ok).toBe(true);
    const injection = setup.runtime.requests.find(
      (request) => request.method === "turn/start",
    ) as { params: { threadId: string; input: Array<{ text: string }> } };
    expect(injection.params.threadId).toBe("thread-impl");
    expect(JSON.parse(injection.params.input[0]?.text ?? "")).toMatchObject({
      protocol: "aiox.message.v1",
      messageId: 'claude-msg-<"&',
      source: { kind: "agent", address: "agent://local/release/reviewer" },
      target: { address: "agent://local/release/impl" },
      type: "question",
      intent: "delegation",
      replyExpected: true,
      content: { mediaType: "text/plain", text: "5 < 6 & 7 > 3" },
    });
    expect(
      db.prepare("select content from messages where id = ?").get('claude-msg-<"&'),
    ).toMatchObject({ content: "5 < 6 & 7 > 3" });
  });

  it("serializes a normal send byte-identically for Codex turn/start and Claude /send", async () => {
    const claudeSends: { content: string }[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      claudeSends.push(JSON.parse(init.body as string));
      return new Response("{}", { status: 202 });
    });
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-target",
    });
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
      profile: "dev",
    });
    const client = createInProcessClient(createDaemonApi(state));
    await client.attachAgent({ kind: "claude", name: "source-claude", cwd: "/repo" });
    const codexAttach = await client.attachAgent({ kind: "codex", name: "target-codex", cwd: "/repo" });
    const claudeAttach = await client.attachAgent({ kind: "claude", name: "target-claude", cwd: "/repo" });
    const codexToken = (codexAttach as { ok: true; codexChannelToken: string }).codexChannelToken;
    const claudeToken = (claudeAttach as { ok: true; claudeChannelToken: string }).claudeChannelToken;
    await client.registerCodexChannel({ agentName: "target-codex", token: codexToken });
    await client.registerClaudeChannel({
      agentName: "target-claude",
      token: claudeToken,
      endpoint: "http://127.0.0.1:18790/send",
    });
    await client.connect({ sourceName: "source-claude", targetNames: ["target-codex", "target-claude"] });

    const response = await client.receiveClaudeChannelMessage({
      agentName: "source-claude",
      messageId: "fanout-1",
      type: "question",
      intent: "delegation",
      replyExpected: true,
      content: { text: "same to both transports" },
    });
    expect(response.ok).toBe(true);

    const codexText = (
      runtime.requests.find((request) => request.method === "turn/start")!.params as {
        input: Array<{ text: string }>;
      }
    ).input[0]!.text;
    const claudeText = claudeSends[0]!.content;

    // deliveryId and target.address are the only per-delivery fields; everything
    // else must be byte-identical because both transports share one serializer.
    const normalize = (text: string): string => {
      const parsed = JSON.parse(text);
      parsed.deliveryId = "<delivery>";
      parsed.target.address = "<target>";
      return JSON.stringify(parsed);
    };
    expect(normalize(codexText)).toBe(normalize(claudeText));
    for (const text of [codexText, claudeText]) {
      expect(JSON.parse(text)).not.toHaveProperty("inReplyToDeliveryId");
      expect(JSON.parse(text)).not.toHaveProperty("outcomeForDeliveryId");
    }
  });

  it("defers Codex target injection when no authoritative active thread binding exists", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        loadedThreadIds: [],
      },
    });

    const response = await setup.client.receiveClaudeChannelMessage({
      agentName: "reviewer",
      messageId: "claude-msg-1",
      content: { text: "hello from claude" },
    });

    expect(response).toMatchObject({
      ok: true,
      messageId: "claude-msg-1",
      dispatch: {
        delivered: 0,
        deferred: [
          {
            targetAgentId: "id-3",
            reason: "target_binding_unconfirmed",
            eligibility: expect.any(String),
          },
        ],
        failed: [],
      },
    });
    expect(
      db.prepare("select status from message_deliveries where message_id = ?").all(
        "claude-msg-1",
      ),
    ).toEqual([{ status: "queued" }]);
  });

  it("defers Claude target injection when the target Claude channel is unavailable", async () => {
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      scheduleTimeout: discardScheduledTimeout,
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "claude", name: "review-a", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "review-b", cwd: "/repo" });
    await client.connect({ sourceName: "review-a", targetNames: ["review-b"] });

    const response = await client.receiveClaudeChannelMessage({
      agentName: "review-a",
      messageId: "claude-msg-1",
      content: { text: "hello from claude" },
    });

    expect(response).toMatchObject({
      ok: true,
      messageId: "claude-msg-1",
      dispatch: {
        delivered: 0,
        deferred: [
          {
            targetAgentId: "id-2",
            reason: "target_runtime_unavailable",
            eligibility: expect.any(String),
          },
        ],
        failed: [],
      },
    });
    expect(
      db.prepare("select status from message_deliveries where message_id = ?").all(
        "claude-msg-1",
      ),
    ).toEqual([{ status: "queued" }]);
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
      type: "question",
      intent: "delegation",
      replyExpected: true,
      content: { text: "please review" },
    });
    expect(parent.ok).toBe(true);

    const response = await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      intent: "result",
      replyExpected: false,
      content: { text: "review complete" },
    });

    expect(response).toMatchObject({
      ok: true,
      dispatch: {
        delivered: 1,
        deferred: [],
        failed: [],
      },
    });
    const delivery = db
      .prepare(
        "select id from message_deliveries order by rowid desc limit 1",
      )
      .get() as { id: string };
    const injection = setup.runtime.requests.find(
      (request) => request.method === "turn/start",
    ) as { params: { threadId: string; input: Array<{ text: string }> } };
    expect(injection.params.threadId).toBe("thread-impl");
    expect(JSON.parse(injection.params.input[0]?.text ?? "")).toMatchObject({
      protocol: "aiox.message.v1",
      deliveryId: delivery.id,
      source: { kind: "agent", address: "agent://local/release/reviewer" },
      target: { address: "agent://local/release/impl" },
      type: "reply",
      intent: "result",
      replyExpected: false,
      content: { mediaType: "text/plain", text: "review complete" },
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
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
      parent_message_id: deliveryIdForMessage(db, "msg-parent"),
      content: "review complete",
    });
    expect(
      db.prepare("select status from message_deliveries order by rowid desc limit 1").get(),
    ).toMatchObject({ status: "delivered" });
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
      type: "question",
      intent: "delegation",
      replyExpected: true,
      content: { text: "please review" },
    });
    expect(parent.ok).toBe(true);

    const response = await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      intent: "result",
      replyExpected: false,
      content: { text: "review complete" },
    });

    expect(response).toMatchObject({
      ok: true,
      dispatch: {
        delivered: 1,
        deferred: [],
        failed: [],
      },
    });
    expect(setup.runtime.requests).toContainEqual({
      method: "thread/loaded/list",
      params: {},
      options: undefined,
    });
    const injection = setup.runtime.requests.find(
      (request) => request.method === "turn/start",
    ) as { params: { threadId: string; input: Array<{ text: string }> } };
    expect(injection.params.threadId).toBe("thread-new");
    expect(JSON.parse(injection.params.input[0]?.text ?? "")).toMatchObject({
      protocol: "aiox.message.v1",
      target: { address: "agent://local/release/impl" },
      content: { mediaType: "text/plain", text: "review complete" },
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
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message-two",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });

    const reviewer = db
      .prepare("select id from agents where name = ?")
      .get("reviewer") as { id: string };
    const event = db
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
      .get() as { data_json: string };

    expect(event).toMatchObject({
      type: "codex_delivery_target_selected",
      message_id: expect.any(String),
      delivery_id: expect.any(String),
      route_id: null,
      agent_name: "impl",
    });
    expect(JSON.parse(event.data_json)).toMatchObject({
      operation: "thread/loaded/list",
      loadedThreadIds: ["thread-old", "thread-new"],
      chosenThreadId: "thread-new",
      previousAdapterSessionId: null,
      runtimeActiveThreadId: "thread-new",
      selectionPolicy: "proxy_active_thread",
      deliveryMessageType: "reply",
      sourceAgentId: reviewer.id,
      sourceAgentName: "reviewer",
      targetAgentName: "impl",
    });
  });

  it("prefers proxy-bound active thread over loaded-list when delivering a Claude reply", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        loadedThreadIds: ["thread-stale-A", "thread-stale-B"],
      },
    });
    setup.runtime.fireProxyBinding({
      method: "thread/resume",
      threadId: "thread-focused",
      requestId: 99,
    });

    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });

    const injection = setup.runtime.requests.find(
      (request) => request.method === "turn/start",
    ) as { params: { threadId: string } } | undefined;
    expect(injection?.params.threadId).toBe("thread-focused");

    const selected = db
      .prepare(
        "select data_json from events where type = 'codex_delivery_target_selected' order by rowid desc limit 1",
      )
      .get() as { data_json: string };
    const data = JSON.parse(selected.data_json);
    expect(data.chosenThreadId).toBe("thread-focused");
    expect(data.selectionPolicy).toBe("proxy_active_thread");
    expect(data.loadedThreadIds).toEqual(["thread-stale-A", "thread-stale-B"]);
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
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    const response = await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });

    expect(response).toMatchObject({
      ok: true,
      dispatch: {
        delivered: 0,
        deferred: [
          {
            reason: "target_binding_unconfirmed",
            eligibility: "requires target codex binding",
          },
        ],
        failed: [],
      },
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

  it("surfaces deferred dispatch when a Claude reply target channel is unavailable", async () => {
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      scheduleTimeout: discardScheduledTimeout,
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.createPair({ name: "pair-1" });
    await client.attachAgent({
      kind: "claude",
      name: "reviewer",
      cwd: "/repo",
      pairName: "pair-1",
    });
    await client.attachAgent({
      kind: "claude",
      name: "peer",
      cwd: "/repo",
      pairName: "pair-1",
    });
    await client.connect({ sourceName: "peer", targetNames: ["reviewer"] });
    const parent = await client.sendMessage({
      sourceName: "peer",
      messageId: "msg-parent",
      type: "question",
      replyExpected: true,
      content: "please review",
    });
    expect(parent.ok).toBe(true);

    const response = await client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });

    expect(response).toMatchObject({
      ok: true,
      dispatch: {
        delivered: 0,
        deferred: [
          {
            reason: "target_runtime_unavailable",
            eligibility: "requires target claude channel runtime",
          },
        ],
        failed: [],
      },
    });
    expect(
      db.prepare("select status from message_deliveries order by rowid desc limit 1").get(),
    ).toMatchObject({ status: "queued" });
    const statusEvents = db
      .prepare("select data_json from events where type = 'delivery_status_changed'")
      .all() as { data_json: string }[];
    expect(
      statusEvents.some((event) => JSON.parse(event.data_json).status === "delivering"),
    ).toBe(false);
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
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });

    expect(
      db
        .prepare("select type, data_json from events order by rowid desc limit 1")
        .get(),
    ).toMatchObject({
      type: "codex_delivery_queued_no_loaded_thread",
      data_json: JSON.stringify({
          reason: "codex_no_loaded_thread",
          message: "Codex runtime has no authoritative active thread id",
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
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });

    const reviewer = db
      .prepare("select id from agents where name = ?")
      .get("reviewer") as { id: string };
    const event = db
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
      .get() as { data_json: string };

    expect(event).toMatchObject({
      type: "codex_delivery_target_unavailable",
      message_id: expect.any(String),
      delivery_id: expect.any(String),
      route_id: null,
      agent_name: "impl",
    });
    expect(JSON.parse(event.data_json)).toMatchObject({
      operation: "thread/loaded/list",
      loadedThreadIds: [],
      previousAdapterSessionId: null,
      runtimeActiveThreadId: null,
      reason: "codex_no_loaded_thread",
      deliveryMessageType: "reply",
      sourceAgentId: reviewer.id,
      sourceAgentName: "reviewer",
      targetAgentName: "impl",
    });
  });

  it("does not emit a rebind event when the live Codex thread already matches the agent cache", async () => {
    const setup = await setupPairedAgents(db);
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
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
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });

    expect(setup.runtime.requests).toContainEqual({
      method: "turn/start",
      params: {
        threadId: "thread-visible",
        input: [{ type: "text", text: expect.stringContaining("review complete") }],
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
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(firstParent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent-1"),
      content: { text: "first reply" },
    });

    const secondParent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent-2",
      content: { text: "please review again" },
      replyExpected: true,
    });
    expect(secondParent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message-second",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent-2"),
      content: { text: "second reply" },
    });

    const injections = setup.runtime.requests.filter(
      (request) => request.method === "turn/start",
    );
    expect(injections).toContainEqual({
      method: "turn/start",
      params: {
        threadId: "thread-visible",
        input: [{ type: "text", text: expect.stringContaining("second reply") }],
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
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });

    const reviewer = db
      .prepare("select id from agents where name = ?")
      .get("reviewer") as { id: string };
    const event = db
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
      .get() as { data_json: string };

    expect(event).toMatchObject({
      type: "codex_delivery_target_injection_failed",
      message_id: expect.any(String),
      delivery_id: expect.any(String),
      route_id: null,
      agent_name: "impl",
    });
    expect(JSON.parse(event.data_json)).toMatchObject({
      chosenThreadId: "thread-new",
      loadedThreadIds: ["thread-new"],
      reason: "adapter_inject_failed",
      message: "turn/start failed",
      sourceAgentId: reviewer.id,
      sourceAgentName: "reviewer",
      targetAgentName: "impl",
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
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
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

  it("resolves a timed-out Codex delivery through one matching late success", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: ["thread-new"],
        turnStartError: Object.assign(new Error("ack timed out"), {
          code: "codex_turn_start_timeout",
        }),
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });
    const replyDeliveryId = deliveryIdForMessage(db, "test-claude-reply-message");

    expect(
      db.prepare("select status from message_deliveries where id = ?").get(replyDeliveryId),
    ).toMatchObject({ status: "unconfirmed" });

    setup.runtime.emitLateTurnStartSuccess();
    setup.runtime.emitLateTurnStartSuccess();

    expect(
      db.prepare("select status from message_deliveries where id = ?").get(replyDeliveryId),
    ).toMatchObject({ status: "delivered" });
    expect(
      db
        .prepare(
          "select count(*) as count from events where delivery_id = ? and type = 'delivery_status_changed' and data_json = ?",
        )
        .get(replyDeliveryId, JSON.stringify({ status: "delivered" })),
    ).toMatchObject({ count: 1 });
  });

  it("keeps a post-write Codex socket drop unconfirmed without queueing or failing it", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: ["thread-new"],
        turnStartError: new CodexAppServerWebSocketError(
          "codex_app_server_ws_dropped",
          "socket closed after turn/start write",
        ),
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });

    const deliveryId = deliveryIdForMessage(db, "test-claude-reply-message");
    expect(db.prepare("select status from message_deliveries where id = ?").get(deliveryId)).toEqual({
      status: "unconfirmed",
    });
    expect(
      db
        .prepare(
          "select count(*) as count from events where delivery_id = ? and type = 'delivery_status_changed' and data_json = ?",
        )
        .get(
          deliveryId,
          JSON.stringify({
            status: "unconfirmed",
            error: {
              reason: "codex_app_server_ws_dropped",
              message: "socket closed after turn/start write",
            },
          }),
        ),
    ).toEqual({ count: 1 });
  });

  it("marks a first-attempt Codex JSON-RPC reject failed and emits delivery_target_rejected", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: ["thread-new"],
        turnStartError: new CodexAppServerWebSocketError(
          "codex_jsonrpc_error",
          "Codex rejected turn",
          { jsonRpcCode: -32042 },
        ),
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });

    const deliveryId = (
      db.prepare("select id, status from message_deliveries where status = 'failed'").get() as {
        id: string;
        status: string;
      }
    ).id;
    expect(
      db.prepare("select status from message_deliveries where id = ?").get(deliveryId),
    ).toEqual({ status: "failed" });
    const rejection = db
      .prepare(
        "select agent_id, message_id, delivery_id, route_id, data_json from events where type = 'delivery_target_rejected'",
      )
      .get() as {
      agent_id: string;
      message_id: string;
      delivery_id: string;
      route_id: string | null;
      data_json: string;
    };
    expect(rejection).toMatchObject({
      agent_id: expect.any(String),
      message_id: expect.any(String),
      delivery_id: deliveryId,
      route_id: null,
    });
    expect(JSON.parse(rejection.data_json)).toEqual({
      adapter: "codex",
      target: {
        agentId: rejection.agent_id,
        agentName: "impl",
        threadId: "thread-new",
      },
      jsonRpc: { code: -32042, message: "Codex rejected turn" },
      attempt: 1,
    });
  });

  it("persists one daemon-originated outcome notification for a first-attempt Codex reject", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: ["thread-new"],
        turnStartError: new CodexAppServerWebSocketError(
          "codex_jsonrpc_error",
          "Codex rejected turn",
          { jsonRpcCode: -32042 },
        ),
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });

    const original = db
      .prepare("select id, message_id, target_agent_id, route_id, status from message_deliveries where status = 'failed'")
      .get() as {
      id: string;
      message_id: string;
      target_agent_id: string;
      route_id: string | null;
      status: string;
    };
    expect(original.status).toBe("failed");

    const outcome = db
      .prepare(
        "select original_delivery_id, notification_message_id, notification_delivery_id from delivery_outcome_notifications",
      )
      .get() as {
      original_delivery_id: string;
      notification_message_id: string;
      notification_delivery_id: string;
    };
    expect(outcome.original_delivery_id).toBe(original.id);
    const originalSource = db
      .prepare("select source_agent_id from messages where id = ?")
      .get(original.message_id) as { source_agent_id: string };
    expect(
      db
        .prepare(
          "select source_agent_id, origin_kind, parent_message_id, type, intent, reply_expected, outcome_for_delivery_id, content from messages where id = ?",
        )
        .get(outcome.notification_message_id),
    ).toEqual({
      source_agent_id: "daemon",
      origin_kind: "daemon",
      parent_message_id: null,
      type: "event",
      intent: "notification",
      reply_expected: 0,
      outcome_for_delivery_id: original.id,
      content: JSON.stringify({
        type: "delivery_target_rejected",
        deliveryId: outcome.notification_delivery_id,
        outcomeForDeliveryId: original.id,
        message:
          "Do not retransmit. Ask the user how to resolve the rejection and whether sending a new message is appropriate.",
        error: { reason: "codex_jsonrpc_error", message: "Codex rejected turn" },
      }),
    });
    expect(
      db
        .prepare(
          "select message_id, target_agent_id, route_id, status from message_deliveries where id = ?",
        )
        .get(outcome.notification_delivery_id),
    ).toEqual({
      message_id: outcome.notification_message_id,
      target_agent_id: originalSource.source_agent_id,
      route_id: null,
      status: "queued",
    });
    expect(
      db
        .prepare("select count(*) as count from reply_rights where originating_delivery_id = ?")
        .get(outcome.notification_delivery_id),
    ).toEqual({ count: 0 });
  });

  it("dispatches the committed reject notification directly to its original Claude source", async () => {
    const notificationStatusesAtFetch: Array<{ original: string; notification: string }> = [];
    const requests: Array<{ content: string }> = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      const outcome = db
        .prepare(
          `
            select original.status as original, notification.status as notification
            from delivery_outcome_notifications outcomes
            join message_deliveries original on original.id = outcomes.original_delivery_id
            join message_deliveries notification on notification.id = outcomes.notification_delivery_id
          `,
        )
        .get() as { original: string; notification: string } | undefined;
      if (outcome) notificationStatusesAtFetch.push(outcome);
      requests.push(JSON.parse(init.body as string) as { content: string });
      return new Response("{}", { status: 202 });
    });
    const setup = await setupPairedAgents(db, {
      claudeEndpoint: "http://127.0.0.1:18789/send",
      profile: "dev",
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: ["thread-new"],
        turnStartError: new CodexAppServerWebSocketError(
          "codex_jsonrpc_error",
          "Codex rejected turn",
          { jsonRpcCode: -32042 },
        ),
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);
    requests.length = 0;

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });

    expect(notificationStatusesAtFetch).toEqual([
      { original: "failed", notification: "delivering" },
    ]);
    expect(requests).toHaveLength(1);
    const envelope = JSON.parse(requests[0]!.content);
    expect(envelope).toMatchObject({
      protocol: "aiox.message.v1",
      source: { kind: "daemon", address: "daemon://local/dev" },
      target: { address: "agent://local/dev/reviewer" },
      type: "event",
      intent: "notification",
      replyExpected: false,
      outcomeForDeliveryId: expect.any(String),
    });
    expect(envelope).not.toHaveProperty("inReplyToDeliveryId");
    expect(db.prepare("select status from message_deliveries order by rowid desc limit 1").get()).toEqual({
      status: "delivered",
    });
  });

  it("dispatches one committed reject notification to the original Codex source without a reverse route", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-shared",
      turnStartErrors: [
        new CodexAppServerWebSocketError("codex_jsonrpc_error", "B rejected", {
          jsonRpcCode: -32042,
        }),
      ],
    });
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
      profile: "dev",
    });
    const client = createInProcessClient(createDaemonApi(state));
    const sourceAttach = await client.attachAgent({ kind: "codex", name: "source", cwd: "/repo" });
    const targetAttach = await client.attachAgent({ kind: "codex", name: "target", cwd: "/repo" });
    const sourceToken = (sourceAttach as { ok: true; codexChannelToken: string }).codexChannelToken;
    const targetToken = (targetAttach as { ok: true; codexChannelToken: string }).codexChannelToken;
    await client.registerCodexChannel({ agentName: "source", token: sourceToken });
    await client.registerCodexChannel({ agentName: "target", token: targetToken });
    await client.connect({ sourceName: "source", targetNames: ["target"] });

    await client.receiveCodexMessage({
      agentName: "source",
      token: sourceToken,
      messageId: "source-message",
      content: { text: "deliver to B" },
    });

    const turnStarts = runtime.requests.filter((request) => request.method === "turn/start");
    expect(turnStarts).toHaveLength(2);
    const notificationInput = (turnStarts[1]!.params as {
      input: Array<{ text: string }>;
    }).input[0]!.text;
    expect(JSON.parse(notificationInput)).toMatchObject({
      source: { kind: "daemon", address: "daemon://local/dev" },
      target: { address: "agent://local/dev/source" },
      intent: "notification",
      outcomeForDeliveryId: expect.any(String),
    });
    expect(JSON.parse(notificationInput)).not.toHaveProperty("inReplyToDeliveryId");
    expect(db.prepare("select count(*) as count from routes").get()).toEqual({ count: 1 });
    expect(db.prepare("select status from message_deliveries order by rowid desc limit 1").get()).toEqual({
      status: "delivered",
    });
  });

  it("does not create a recursive outcome notification when the notification itself is rejected", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-shared",
      turnStartErrors: [
        new CodexAppServerWebSocketError("codex_jsonrpc_error", "B rejected", {
          jsonRpcCode: -32042,
        }),
        new CodexAppServerWebSocketError("codex_jsonrpc_error", "notification rejected", {
          jsonRpcCode: -32043,
        }),
      ],
    });
    const state = createDaemonState({
      db,
      createId: monotonicIdSequence(),
      now: monotonicNowSequence(),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
    });
    const client = createInProcessClient(createDaemonApi(state));
    const sourceAttach = await client.attachAgent({ kind: "codex", name: "source", cwd: "/repo" });
    const targetAttach = await client.attachAgent({ kind: "codex", name: "target", cwd: "/repo" });
    const sourceToken = (sourceAttach as { ok: true; codexChannelToken: string }).codexChannelToken;
    const targetToken = (targetAttach as { ok: true; codexChannelToken: string }).codexChannelToken;
    await client.registerCodexChannel({ agentName: "source", token: sourceToken });
    await client.registerCodexChannel({ agentName: "target", token: targetToken });
    await client.connect({ sourceName: "source", targetNames: ["target"] });

    await client.receiveCodexMessage({
      agentName: "source",
      token: sourceToken,
      messageId: "source-message",
      content: { text: "deliver to B" },
    });

    expect(runtime.requests.filter((request) => request.method === "turn/start")).toHaveLength(2);
    expect(db.prepare("select count(*) as count from delivery_outcome_notifications").get()).toEqual({
      count: 1,
    });
    expect(
      db
        .prepare(
          "select count(*) as count from messages where origin_kind = 'daemon' and intent = 'notification'",
        )
        .get(),
    ).toEqual({ count: 1 });
    expect(
      db.prepare("select status from message_deliveries where message_id = 'source-message'").get(),
    ).toEqual({ status: "failed" });
    expect(
      db.prepare("select status from message_deliveries order by rowid desc limit 1").get(),
    ).toEqual({ status: "failed" });
  });

  it("does not dispatch again for a duplicate late reject after its notification has been committed", async () => {
    const setup = await setupTwoCodexAgents(db, [
      Object.assign(new Error("turn/start timed out"), { code: "codex_turn_start_timeout" }),
    ]);

    await setup.client.receiveCodexMessage({
      agentName: "source",
      token: setup.sourceToken,
      messageId: "source-message",
      content: { text: "deliver to B" },
    });
    setup.runtime.emitLateTurnStartReject(-32042, "late reject");
    setup.runtime.emitLateTurnStartReject(-32042, "late reject");
    await vi.waitFor(() => {
      expect(setup.runtime.requests.filter((request) => request.method === "turn/start")).toHaveLength(2);
    });

    expect(db.prepare("select count(*) as count from delivery_outcome_notifications").get()).toEqual({
      count: 1,
    });
    expect(
      db
        .prepare(
          "select count(*) as count from messages where origin_kind = 'daemon' and intent = 'notification'",
        )
        .get(),
    ).toEqual({ count: 1 });
    expect(setup.scheduledTimeouts).toHaveLength(1);
    expect(setup.scheduledTimeouts[0]).toMatchObject({ delayMs: 299_000 });
  });

  it("leaves the original failed when its post-write notification dispatch times out", async () => {
    const setup = await setupTwoCodexAgents(db, [
      new CodexAppServerWebSocketError("codex_jsonrpc_error", "B rejected", {
        jsonRpcCode: -32042,
      }),
      Object.assign(new Error("notification timed out"), { code: "codex_turn_start_timeout" }),
    ]);

    await setup.client.receiveCodexMessage({
      agentName: "source",
      token: setup.sourceToken,
      messageId: "source-message",
      content: { text: "deliver to B" },
    });

    expect(
      db.prepare("select status from message_deliveries where message_id = 'source-message'").get(),
    ).toEqual({ status: "failed" });
    expect(
      db.prepare("select status from message_deliveries order by rowid desc limit 1").get(),
    ).toEqual({ status: "unconfirmed" });
    expect(setup.runtime.requests.filter((request) => request.method === "turn/start")).toHaveLength(2);
  });

  it("does not create another outcome when a timed-out notification later rejects", async () => {
    const setup = await setupTwoCodexAgents(db, [
      new CodexAppServerWebSocketError("codex_jsonrpc_error", "B rejected", {
        jsonRpcCode: -32042,
      }),
      Object.assign(new Error("notification timed out"), { code: "codex_turn_start_timeout" }),
    ]);

    await setup.client.receiveCodexMessage({
      agentName: "source",
      token: setup.sourceToken,
      messageId: "source-message",
      content: { text: "deliver to B" },
    });
    setup.runtime.emitLateTurnStartReject(-32043, "notification rejected late");

    expect(db.prepare("select count(*) as count from delivery_outcome_notifications").get()).toEqual({
      count: 1,
    });
    expect(
      db
        .prepare(
          "select count(*) as count from messages where origin_kind = 'daemon' and intent = 'notification'",
        )
        .get(),
    ).toEqual({ count: 1 });
    expect(
      db.prepare("select status from message_deliveries where message_id = 'source-message'").get(),
    ).toEqual({ status: "failed" });
    expect(
      db.prepare("select status from message_deliveries order by rowid desc limit 1").get(),
    ).toEqual({ status: "failed" });
    expect(setup.runtime.requests.filter((request) => request.method === "turn/start")).toHaveLength(2);
  });

  it("marks an unconfirmed Codex delivery failed once when its matching late response rejects", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: ["thread-new"],
        turnStartError: Object.assign(new Error("turn/start timed out"), {
          code: "codex_turn_start_timeout",
        }),
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent",
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "test-claude-reply-message",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent"),
      content: { text: "review complete" },
    });
    const deliveryId = deliveryIdForMessage(db, "test-claude-reply-message");
    expect(db.prepare("select status from message_deliveries where id = ?").get(deliveryId)).toEqual({
      status: "unconfirmed",
    });

    // The unconfirmed transition independently authors its own `delivery_unconfirmed`
    // source outcome notification; this must not be suppressed by, or suppress, the
    // distinct `delivery_target_rejected` outcome the later late reject produces below.
    expect(
      db
        .prepare(
          "select outcome_type from delivery_outcome_notifications where original_delivery_id = ?",
        )
        .all(deliveryId),
    ).toEqual([{ outcome_type: "delivery_unconfirmed" }]);
    const unconfirmedNotification = db
      .prepare(
        "select content from messages where outcome_for_delivery_id = ? and origin_kind = 'daemon'",
      )
      .get(deliveryId) as { content: string };
    expect(JSON.parse(unconfirmedNotification.content)).toMatchObject({
      type: "delivery_unconfirmed",
      outcomeForDeliveryId: deliveryId,
      message:
        "Ask the user to confirm target activity and duplicate-risk acceptance before deciding whether to retransmit.",
      error: { reason: "codex_turn_start_timeout", message: "turn/start timed out" },
    });

    setup.runtime.emitLateTurnStartReject(-32043, "late application reject");
    setup.runtime.emitLateTurnStartReject(-32043, "late application reject");

    expect(db.prepare("select status from message_deliveries where id = ?").get(deliveryId)).toEqual({
      status: "failed",
    });
    expect(
      db
        .prepare("select count(*) as count from events where type = 'delivery_target_rejected'")
        .get(),
    ).toEqual({ count: 1 });
    expect(
      db
        .prepare(
          "select outcome_type from delivery_outcome_notifications where original_delivery_id = ? order by outcome_type",
        )
        .all(deliveryId),
    ).toEqual([{ outcome_type: "delivery_target_rejected" }, { outcome_type: "delivery_unconfirmed" }]);
    expect(
      db
        .prepare(
          "select count(*) as count from messages where origin_kind = 'daemon' and type = 'event' and intent = 'notification'",
        )
        .get(),
    ).toEqual({ count: 2 });
    const lateRejection = db
      .prepare(
        "select agent_id, message_id, delivery_id, route_id, data_json from events where type = 'delivery_target_rejected'",
      )
      .get() as {
      agent_id: string;
      message_id: string;
      delivery_id: string;
      route_id: string | null;
      data_json: string;
    };
    expect(lateRejection).toMatchObject({
      agent_id: expect.any(String),
      message_id: expect.any(String),
      delivery_id: deliveryId,
      route_id: null,
    });
    expect(JSON.parse(lateRejection.data_json)).toEqual({
      adapter: "codex",
      target: {
        agentId: lateRejection.agent_id,
        agentName: "impl",
        threadId: "thread-new",
      },
      jsonRpc: { code: -32043, message: "late application reject" },
      attempt: 1,
    });
  });

  it("isolates a DB exception in the late reject's own notification persistence without throwing, while preserving the original delivery's failed transition and events", async () => {
    const setup = await setupPairedAgents(db, {
      codexRuntime: {
        startedThreadId: "thread-old",
        loadedThreadIds: ["thread-new"],
        turnStartError: Object.assign(new Error("turn/start timed out"), {
          code: "codex_turn_start_timeout",
        }),
      },
    });
    const parent = await setup.client.receiveCodexMessage({
      agentName: "impl",
      token: setup.codexToken,
      messageId: "msg-parent-notification-persist-throws",
      content: { text: "please review" },
      replyExpected: true,
    });
    expect(parent.ok).toBe(true);

    await setup.client.receiveClaudeChannelReply({
      agentName: "reviewer",
      messageId: "reply-notification-persist-throws",
      inReplyToDeliveryId: deliveryIdForMessage(db, "msg-parent-notification-persist-throws"),
      content: { text: "review complete" },
    });
    const deliveryId = deliveryIdForMessage(db, "reply-notification-persist-throws");
    expect(db.prepare("select status from message_deliveries where id = ?").get(deliveryId)).toEqual({
      status: "unconfirmed",
    });

    // Simulate a DB exception while persisting only the late reject's own outcome
    // notification; every other statement passes through to the real prepare unchanged.
    const originalPrepare = db.prepare.bind(db);
    vi.spyOn(db, "prepare").mockImplementation(((sql: string, ...rest: unknown[]) => {
      if (typeof sql === "string" && sql.includes("insert into delivery_outcome_notifications")) {
        throw new Error("simulated notification persistence failure");
      }
      return originalPrepare(sql, ...(rest as []));
    }) as typeof db.prepare);

    expect(() =>
      setup.runtime.emitLateTurnStartReject(-32043, "late application reject"),
    ).not.toThrow();
    vi.mocked(db.prepare).mockRestore();

    // The original delivery's transition to `failed` and its two events must already have
    // committed in their own transaction before the notification-persistence transaction
    // threw -- the exception must not roll either of them back.
    expect(db.prepare("select status from message_deliveries where id = ?").get(deliveryId)).toEqual({
      status: "failed",
    });
    const statusEvents = db
      .prepare(
        "select data_json from events where type = 'delivery_status_changed' and delivery_id = ?",
      )
      .all(deliveryId) as Array<{ data_json: string }>;
    expect(
      statusEvents.map((row) => (JSON.parse(row.data_json) as { status: string }).status),
    ).toEqual(["delivering", "unconfirmed", "failed"]);
    expect(
      db.prepare("select count(*) as count from events where type = 'delivery_target_rejected'").get(),
    ).toEqual({ count: 1 });

    // The late reject's own `delivery_target_rejected` outcome never persisted (the
    // notification-creation transaction rolled back cleanly): only the earlier
    // `delivery_unconfirmed` relation from the timeout still exists.
    expect(
      db
        .prepare(
          "select outcome_type from delivery_outcome_notifications where original_delivery_id = ?",
        )
        .all(deliveryId),
    ).toEqual([{ outcome_type: "delivery_unconfirmed" }]);
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
      content: { text: "late message" },
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
      content: { text: "late message" },
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
      content: { text: "late message" },
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
      content: { text: "late message" },
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
      content: { text: "old token after reattach" },
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
    profile?: "dev" | "build" | "release";
    scheduleTimeout?: (callback: () => void, delayMs: number) => unknown;
    codexRuntime?: {
      startedThreadId?: string;
      loadedThreadIds?: string[];
      activeThreadId?: string | null;
      failTurnStart?: boolean;
      turnStartError?: Error;
      turnStartErrors?: Error[];
    };
  } = {},
) {
  const scheduledTimeouts: Array<{ callback: () => void; delayMs: number }> = [];
  const codexChannelRuntimes = new Map();
  const claudeChannelRuntimes = new Map();
  const runtime = fakeCodexRuntime({
    endpoint: "ws://127.0.0.1:54321/",
    startedThreadId: opts.codexRuntime?.startedThreadId ?? "thread-impl",
    loadedThreadIds: opts.codexRuntime?.loadedThreadIds,
    activeThreadId: opts.codexRuntime?.activeThreadId,
    failTurnStart: opts.codexRuntime?.failTurnStart,
    turnStartError: opts.codexRuntime?.turnStartError,
    turnStartErrors: opts.codexRuntime?.turnStartErrors,
  });
  const state = createDaemonState({
    db,
    createId: monotonicIdSequence(),
    now: monotonicNowSequence(),
    codexRuntimes: new Map(),
    attachCodexRuntime: async () => runtime,
    codexChannelRuntimes,
    claudeChannelRuntimes,
    profile: opts.profile,
    scheduleTimeout:
      opts.scheduleTimeout ??
      ((callback, delayMs) => {
        scheduledTimeouts.push({ callback, delayMs });
        return scheduledTimeouts.length;
      }),
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
  return {
    client,
    codexToken,
    codexChannelRuntimes,
    claudeChannelRuntimes,
    runtime,
    state,
    scheduledTimeouts,
  };
}

function deliveryIdForMessage(db: InstanceType<typeof Database>, messageId: string): string {
  const row = db
    .prepare("select id from message_deliveries where message_id = ?")
    .get(messageId) as { id: string } | undefined;
  if (!row) throw new Error(`missing delivery for ${messageId}`);
  return row.id;
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

async function setupTwoCodexAgents(db: InstanceType<typeof Database>, turnStartErrors: Error[]) {
  const scheduledTimeouts: Array<{ callback: () => void; delayMs: number }> = [];
  const runtime = fakeCodexRuntime({
    endpoint: "ws://127.0.0.1:54321/",
    startedThreadId: "thread-shared",
    turnStartErrors,
  });
  const state = createDaemonState({
    db,
    createId: monotonicIdSequence(),
    now: monotonicNowSequence(),
    codexRuntimes: new Map(),
    attachCodexRuntime: async () => runtime,
    scheduleTimeout: (callback, delayMs) => {
      scheduledTimeouts.push({ callback, delayMs });
      return scheduledTimeouts.length;
    },
  });
  const client = createInProcessClient(createDaemonApi(state));
  const sourceAttach = await client.attachAgent({ kind: "codex", name: "source", cwd: "/repo" });
  const targetAttach = await client.attachAgent({ kind: "codex", name: "target", cwd: "/repo" });
  const sourceToken = (sourceAttach as { ok: true; codexChannelToken: string }).codexChannelToken;
  const targetToken = (targetAttach as { ok: true; codexChannelToken: string }).codexChannelToken;
  await client.registerCodexChannel({ agentName: "source", token: sourceToken });
  await client.registerCodexChannel({ agentName: "target", token: targetToken });
  await client.connect({ sourceName: "source", targetNames: ["target"] });
  return { client, runtime, sourceToken, scheduledTimeouts };
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

function discardScheduledTimeout(_callback: () => void, _delayMs: number): number {
  return 0;
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
  activeThreadId?: string | null;
  failTurnStart?: boolean;
  turnStartError?: Error;
  turnStartErrors?: Error[];
}) {
  const requests: Array<{
    method: string;
    params: unknown;
    options: unknown;
  }> = [];
  let lateTurnStartResponse: ((response: unknown) => void) | undefined;

  return {
    state: "ready" as const,
    endpoint: new URL(options.endpoint),
    activeThreadId:
      options.activeThreadId ??
      (options.loadedThreadIds
        ? (options.loadedThreadIds.at(-1) ?? null)
        : (options.startedThreadId ?? null)),
    requests,
    startThreadCalls: 0,
    resumeThreadCalls: [] as string[],
    disposeCalls: 0,
    requestCodex(method: string, params?: unknown, requestOptions?: unknown) {
      if (
        method === "turn/start" &&
        typeof requestOptions === "object" &&
        requestOptions !== null &&
        "onLateResponse" in requestOptions
      ) {
        lateTurnStartResponse = requestOptions.onLateResponse as (response: unknown) => void;
        const { onLateResponse: _ignored, ...visibleOptions } = requestOptions as {
          onLateResponse?: unknown;
        };
        requests.push({ method, params, options: visibleOptions });
      } else {
        requests.push({ method, params, options: requestOptions });
      }
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
      if (method === "turn/start" && options.turnStartError) {
        return Promise.reject(options.turnStartError);
      }
      if (method === "turn/start" && options.turnStartErrors?.length) {
        return Promise.reject(options.turnStartErrors.shift());
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
    emitLateTurnStartSuccess() {
      lateTurnStartResponse?.({ id: 1, result: { accepted: true } });
    },
    emitLateTurnStartReject(code: number, message: string) {
      lateTurnStartResponse?.({ id: 1, error: { code, message } });
    },
    proxyBindingListeners: new Set<(event: {
      method: "thread/start" | "thread/resume" | "thread/fork";
      threadId: string;
      requestId: number | string;
    }) => void>(),
    onProxyBinding(
      listener: (event: {
        method: "thread/start" | "thread/resume" | "thread/fork";
        threadId: string;
        requestId: number | string;
      }) => void,
    ) {
      this.proxyBindingListeners.add(listener);
      return () => {
        this.proxyBindingListeners.delete(listener);
      };
    },
    fireProxyBinding(event: {
      method: "thread/start" | "thread/resume" | "thread/fork";
      threadId: string;
      requestId: number | string;
    }) {
      for (const listener of this.proxyBindingListeners) {
        listener(event);
      }
    },
    async dispose() {
      this.disposeCalls += 1;
      this.state = "disposed" as typeof this.state;
    },
  };
}
