import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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
  opts: { skipRegister?: boolean } = {},
) {
  const codexChannelRuntimes = new Map();
  const claudeChannelRuntimes = new Map();
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
    codexChannelRuntimes,
    claudeChannelRuntimes,
  });
  const client = createInProcessClient(createDaemonApi(state));
  await client.createPair({ name: "pair-1" });
  await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo", pairName: "pair-1" });
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
  return { client, codexToken, codexChannelRuntimes, state };
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
}) {
  return {
    state: "ready" as const,
    endpoint: new URL(options.endpoint),
    activeThreadId: null as string | null,
    startThreadCalls: 0,
    resumeThreadCalls: [] as string[],
    disposeCalls: 0,
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
    async dispose() {
      this.disposeCalls += 1;
      this.state = "disposed" as typeof this.state;
    },
  };
}
