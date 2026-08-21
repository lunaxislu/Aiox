/**
 * W13 composition harness.  It deliberately owns no production seam: the
 * daemon state/API, SQLite schema, real Codex injector, and real Claude
 * injector are assembled here while only their runtime transports are fake.
 */
import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDaemonApi } from "../../src/daemon/api.js";
import { injectClaudeChannel } from "../../src/adapters/claude/injector.js";
import { CodexAppServerWebSocketError } from "../../src/adapters/codex/websocket.js";
import { createDaemonState, type ManagedCodexAgentRuntime } from "../../src/daemon/state.js";
import { applySchema } from "../../src/store/schema.js";

type TurnOutcome = "success" | "timeout" | "drop" | "reject" | "prewrite";

class ControlledCodexRuntime implements ManagedCodexAgentRuntime {
  state: "starting" | "ready" | "failed" | "disposed" = "ready";
  endpoint = new URL("ws://127.0.0.1:4545/");
  activeThreadId: string | null;
  requests: Array<{ method: string; params: unknown }> = [];
  #outcomes: TurnOutcome[];
  #late?: (response: unknown) => void;

  constructor(threadId: string, outcomes: TurnOutcome[] = []) {
    this.activeThreadId = threadId;
    this.#outcomes = outcomes;
  }

  async requestCodex(method: string, params?: unknown, options?: { onLateResponse?: (response: unknown) => void }) {
    this.requests.push({ method, params });
    if (method === "thread/loaded/list") return { data: this.activeThreadId ? [this.activeThreadId] : [] };
    if (method !== "turn/start") return {};
    this.#late = options?.onLateResponse;
    switch (this.#outcomes.shift() ?? "success") {
      case "success": return { turn: { id: "turn", status: "inProgress" } };
      case "prewrite": throw new CodexAppServerWebSocketError("codex_app_server_ws_connect_failed", "not connected");
      case "timeout": throw new CodexAppServerWebSocketError("codex_turn_start_timeout", "turn/start timed out");
      case "drop": throw new CodexAppServerWebSocketError("codex_app_server_ws_dropped", "socket dropped");
      case "reject": throw new CodexAppServerWebSocketError("codex_jsonrpc_error", "B rejected", { jsonRpcCode: -32042 });
    }
  }

  emitLateSuccess() { this.#late?.({ jsonrpc: "2.0", id: 9, result: {} }); }
  emitLateReject() { this.#late?.({ jsonrpc: "2.0", id: 9, error: { code: -32042, message: "late reject" } }); }
  async startThread() { return this.activeThreadId; }
  async resumeThread(threadId: string) { this.activeThreadId = threadId; return threadId; }
  async listLoadedThreadIds() { return this.activeThreadId ? [this.activeThreadId] : []; }
  rebindActiveThread(threadId: string) { this.activeThreadId = threadId; }
  async dispose() { this.state = "disposed"; }
}

function sequence(prefix = "id") {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

function apiFor(db: Database, runtimes: Map<string, ControlledCodexRuntime>, scheduled: Array<{ callback: () => void; delayMs: number }> = []) {
  const state = createDaemonState({
    db,
    createId: sequence(),
    now: (() => { let n = 0; return () => `2026-07-21T00:00:${String(++n).padStart(2, "0")}.000Z`; })(),
    codexRuntimes: new Map(),
    attachCodexRuntime: async ({ agentName }) => runtimes.get(agentName) ?? new ControlledCodexRuntime(`thread-${agentName}`),
    scheduleTimeout(callback, delayMs) { scheduled.push({ callback, delayMs }); return scheduled.length; },
  });
  return createDaemonApi(state);
}

async function twoCodex(api: ReturnType<typeof createDaemonApi>, source = "source", target = "target") {
  const sourceAttach = await api.attachAgent({ kind: "codex", name: source, cwd: "/repo" });
  await api.attachAgent({ kind: "codex", name: target, cwd: "/repo" });
  await api.connect({ sourceName: source, targetNames: [target] });
  if (!sourceAttach.ok) throw new Error("could not attach source");
  await api.registerCodexChannel({ agentName: source, token: sourceAttach.codexChannelToken! });
  return sourceAttach.codexChannelToken!;
}

async function sendFromCodex(api: ReturnType<typeof createDaemonApi>, token: string, messageId: string, content = messageId) {
  return api.receiveCodexMessage({ agentName: "source", token, messageId, type: "instruction", content: { text: content } });
}

function delivery(db: Database, messageId: string) {
  return db.prepare("select id, status from message_deliveries where message_id = ?").get(messageId) as { id: string; status: string };
}

afterEach(() => vi.unstubAllGlobals());

describe("G1-C Tier 3 reliability composition", () => {
  it("keeps conclusively pre-write failures queued through serialized retries, TTL, and all-or-nothing backpressure", async () => {
    const db = new Database(":memory:");
    applySchema(db);
    const scheduled: Array<{ callback: () => void; delayMs: number }> = [];
    // Attach with a real thread id (eager-start now requires one, W6) then clear
    // it to model binding becoming absent again — this test's actual point is
    // the retry-serialization gate while unbound, not the attach step itself.
    const targetRuntime = new ControlledCodexRuntime("thread-target");
    const runtimes = new Map([["target", targetRuntime]]);
    const api = apiFor(db, runtimes, scheduled);
    const sourceToken = await twoCodex(api);
    targetRuntime.activeThreadId = "";

    await sendFromCodex(api, sourceToken, "retry");
    expect(delivery(db, "retry").status).toBe("queued");
    expect(scheduled.map((x) => x.delayMs)).toContain(250);
    // The target-flush gate serializes this retry; running its callback cannot
    // create a second concurrent turn/start while binding remains absent.
    scheduled.find((x) => x.delayMs === 250)?.callback();
    await Promise.resolve();
    await Promise.resolve();
    expect(delivery(db, "retry").status).toBe("queued");
    const ttl = scheduled.find((x) => x.delayMs >= 299_000);
    ttl?.callback();
    expect(delivery(db, "retry").status).toBe("failed");

    // A full target queue rejects an entire two-target fan-out before a message row is added.
    await api.attachAgent({ kind: "claude", name: "other", cwd: "/repo" });
    await api.connect({ sourceName: "source", targetNames: ["other"] });
    for (let i = 0; i < 32; i += 1) await sendFromCodex(api, sourceToken, `full-${i}`, "hold");
    const before = (db.prepare("select count(*) as count from messages").get() as { count: number }).count;
    await expect(sendFromCodex(api, sourceToken, "atomic", "no partial")).resolves.toMatchObject({ ok: false, reason: "delivery_queue_full" });
    expect((db.prepare("select count(*) as count from messages").get() as { count: number }).count).toBe(before);
    db.close();
  });

  it("makes timeout/drop unconfirmed without reinjection, then accepts exactly one late success", async () => {
    const db = new Database(":memory:");
    applySchema(db);
    const target = new ControlledCodexRuntime("thread-target", ["timeout", "drop"]);
    const api = apiFor(db, new Map([["target", target]]));
    const sourceToken = await twoCodex(api);
    await sendFromCodex(api, sourceToken, "timeout", "ambiguous");
    expect(delivery(db, "timeout").status).toBe("unconfirmed");
    expect(target.requests.filter((x) => x.method === "turn/start")).toHaveLength(1);
    target.emitLateSuccess();
    target.emitLateSuccess();
    expect(delivery(db, "timeout").status).toBe("delivered");
    expect(target.requests.filter((x) => x.method === "turn/start")).toHaveLength(1);
    await sendFromCodex(api, sourceToken, "drop");
    expect(delivery(db, "drop").status).toBe("unconfirmed");
    expect(target.requests.filter((x) => x.method === "turn/start")).toHaveLength(2);
    db.close();
  });

  it("requires confirmation for a direct non-queued manual retransmit", async () => {
    const db = new Database(":memory:");
    applySchema(db);
    const target = new ControlledCodexRuntime("thread-target", ["timeout", "success"]);
    const api = apiFor(db, new Map([["target", target]]));
    const sourceToken = await twoCodex(api);
    await sendFromCodex(api, sourceToken, "manual");
    const row = delivery(db, "manual");
    expect(row.status).toBe("unconfirmed");
    await expect(api.retransmitUnconfirmedDelivery({ deliveryId: row.id, confirmDuplicateRisk: false })).resolves.toEqual({ ok: false, reason: "duplicate_risk_confirmation_required" });
    await expect(api.retransmitUnconfirmedDelivery({ deliveryId: row.id, confirmDuplicateRisk: true })).resolves.toMatchObject({ ok: true, delivery: { status: "delivered" } });
    expect(db.prepare("select count(*) as count from message_deliveries where status = 'queued'").get()).toEqual({ count: 0 });
    expect(target.requests.filter((x) => x.method === "turn/start")).toHaveLength(2);
    db.close();
  });

  it("records one explicit-reject notification without recursion and renders one canonical byte string for Codex and Claude", async () => {
    const db = new Database(":memory:");
    applySchema(db);
    // The notification is deliberately rejected by A after B's original
    // rejection; it must fail terminally without producing a third delivery.
    const source = new ControlledCodexRuntime("thread-source", ["reject"]);
    const target = new ControlledCodexRuntime("thread-target", ["reject"]);
    const api = apiFor(db, new Map([["source", source], ["target", target]]));
    const sourceToken = await twoCodex(api);
    await sendFromCodex(api, sourceToken, "reject");
    const original = delivery(db, "reject");
    expect(original.status).toBe("failed");
    expect(db.prepare("select count(*) as count from delivery_outcome_notifications").get()).toEqual({ count: 1 });
    const notification = db.prepare("select id, outcome_for_delivery_id, content from messages where origin_kind = 'daemon'").get() as { id: string; outcome_for_delivery_id: string; content: string };
    expect(notification).toMatchObject({ outcome_for_delivery_id: original.id });
    expect(notification.content).not.toContain("inReplyToDeliveryId");
    expect(db.prepare("select count(*) as count from reply_rights").get()).toEqual({ count: 0 });
    const codexText = ((source.requests.find((x) => x.method === "turn/start")?.params as { input: Array<{ text: string }> }).input[0]?.text);
    expect(codexText).toBeTruthy();
    const claudeBodies: string[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      claudeBodies.push(String(init.body));
      return new Response(null, { status: 204 });
    });
    await injectClaudeChannel({ getRuntime: () => ({ endpoint: "http://channel.test/send" }) }, { agentName: "claude", content: codexText! });
    const pushed = JSON.parse(claudeBodies[0] ?? "{}") as { content?: string };
    expect(pushed.content).toBe(codexText);

    target.emitLateReject();
    target.emitLateReject();
    expect(db.prepare("select count(*) as count from delivery_outcome_notifications").get()).toEqual({ count: 1 });
    expect(db.prepare("select count(*) as count from messages where origin_kind = 'daemon'").get()).toEqual({ count: 1 });
    expect(db.prepare("select status from message_deliveries order by rowid desc limit 1").get()).toEqual({ status: "failed" });
    db.close();
  });
});
