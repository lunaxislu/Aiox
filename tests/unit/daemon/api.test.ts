import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { CodexAppServerWebSocketError } from "../../../src/adapters/codex/websocket.js";
import { applySchema } from "../../../src/store/schema.js";

describe("daemon API with fake in-process transport", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("requires duplicate-risk confirmation, delivers on immediate manual retransmit success, and emits one terminal delivered event", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-target",
    });
    const { client, deliveryId } = await setupUnconfirmedManualRetransmit(db, runtime);
    const turnStartBefore = runtime.requests.filter(
      (request) => request.method === "turn/start",
    ).length;

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: false }),
    ).resolves.toEqual({ ok: false, reason: "duplicate_risk_confirmation_required" });
    expect(runtime.requests.filter((request) => request.method === "turn/start")).toHaveLength(
      turnStartBefore,
    );

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: true, delivery: { id: deliveryId, status: "delivered" } });
    expect(runtime.requests.filter((request) => request.method === "turn/start")).toHaveLength(
      turnStartBefore + 1,
    );
    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "delivered" });
    expect(manualEventData(db, "delivery_manual_retransmit")).toEqual({
      actor: "operator",
      attempt: 1,
      confirmDuplicateRisk: true,
    });
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(1);
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(0);
    expect(manualEventData(db, "delivery_manual_retransmit_delivered")).toEqual({
      actor: "operator",
      attempt: 1,
    });
  });

  it("keeps manual_retransmit_failed with no terminal lifecycle event and no removed failed event when no write can be attempted", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-target",
    });
    const { client, deliveryId } = await setupUnconfirmedManualRetransmit(db, runtime);
    // Drop the bound thread so target resolution defers before any turn/start write is issued.
    runtime.activeThreadId = null;

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_failed" });

    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });
    expect(
      db.prepare("select count(*) as count from message_deliveries where status = 'queued'").get(),
    ).toEqual({ count: 0 });
    expect(manualEventCount(db, "delivery_manual_retransmit")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(0);
  });

  it("emits one terminal rejected event and preserves unconfirmed on an immediate manual retransmit reject", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-target",
      turnStartError: new CodexAppServerWebSocketError("codex_jsonrpc_error", "immediate reject", {
        jsonRpcCode: -32001,
        requestId: 7,
      }),
    });
    const { client, deliveryId } = await setupUnconfirmedManualRetransmit(db, runtime);

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_rejected" });

    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(1);
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(0);
    expect(manualEventCount(db, "delivery_target_rejected")).toBe(0);
    expect(manualEventData(db, "delivery_manual_retransmit_rejected")).toEqual({
      actor: "operator",
      attempt: 1,
      requestId: 7,
      adapter: "codex",
      code: -32001,
      reason: "codex_jsonrpc_error",
      message: "immediate reject",
    });
  });

  it("records an unconfirmed observation then a terminal rejected event with no delivery_target_rejected on a late same-requestId reject", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-target",
      turnStartTimeout: true,
    });
    const { client, deliveryId } = await setupUnconfirmedManualRetransmit(db, runtime);

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_unconfirmed" });
    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(1);

    // The late same-requestId reject for the manual attempt must not flip the original to failed.
    runtime.fireLateResponse({ jsonrpc: "2.0", id: 11, error: { code: -32002, message: "late reject" } });

    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(1);
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(0);
    expect(manualEventCount(db, "delivery_target_rejected")).toBe(0);
    expect(outcomeNotificationCount(db)).toBe(0);
    expect(outcomeRelationCount(db, deliveryId)).toBe(0);
    expect(replyRightCount(db, deliveryId)).toBe(0);
    expect(manualEventData(db, "delivery_manual_retransmit_rejected")).toEqual({
      actor: "operator",
      attempt: 1,
      requestId: 11,
      adapter: "codex",
      code: -32002,
      reason: "codex_jsonrpc_error",
      message: "late reject",
    });
  });

  it("records an unconfirmed observation then one terminal delivered event when a timed-out manual retransmit gets duplicate late same-requestId successes", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-target",
      turnStartTimeout: true,
    });
    const { client, deliveryId } = await setupUnconfirmedManualRetransmit(db, runtime);

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_unconfirmed" });
    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(1);

    runtime.fireLateResponse({ jsonrpc: "2.0", id: 12, result: {} });
    runtime.fireLateResponse({ jsonrpc: "2.0", id: 12, result: {} });

    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "delivered" });
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(1);
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(0);
  });

  it("treats a duplicate late response for the same attempt as a no-op with exactly one terminal event", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-target",
      turnStartTimeout: true,
    });
    const { client, deliveryId } = await setupUnconfirmedManualRetransmit(db, runtime);

    await client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true });

    runtime.fireLateResponse({ jsonrpc: "2.0", id: 13, error: { code: -32003, message: "late reject" } });
    runtime.fireLateResponse({ jsonrpc: "2.0", id: 13, error: { code: -32003, message: "late reject" } });

    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(1);
    expect(manualEventCount(db, "delivery_target_rejected")).toBe(0);
  });

  it("surfaces a post-write timeout as unconfirmed with one non-terminal observation, no terminal event, and no removed failed event", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-target",
      turnStartTimeout: true,
    });
    const { client, deliveryId } = await setupUnconfirmedManualRetransmit(db, runtime);

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_unconfirmed" });

    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(1);
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(0);
    expect(manualEventData(db, "delivery_manual_retransmit_unconfirmed")).toEqual({
      actor: "operator",
      attempt: 1,
      requestId: null,
      adapter: "codex",
      code: null,
      reason: "codex_turn_start_timeout",
      message: "turn/start timed out",
    });
  });

  it("surfaces an actual post-write WebSocket drop as unconfirmed with one non-terminal observation and no terminal event", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-target",
      turnStartError: new CodexAppServerWebSocketError(
        "codex_app_server_ws_dropped",
        "socket closed after turn/start write",
      ),
    });
    const { client, deliveryId } = await setupUnconfirmedManualRetransmit(db, runtime);

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_unconfirmed" });

    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(1);
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(0);
    expect(manualEventData(db, "delivery_manual_retransmit_unconfirmed")).toEqual({
      actor: "operator",
      attempt: 1,
      requestId: null,
      adapter: "codex",
      code: null,
      reason: "codex_app_server_ws_dropped",
      message: "socket closed after turn/start write",
    });
  });

  // Case 7 (non-manual first-delivery reject regression: `failed` + exactly one
  // `delivery_target_rejected`, no manual event) is owned by the affected ingress suite
  // `tests/unit/daemon/codex-ingress.test.ts` ("marks a first-attempt Codex JSON-RPC reject
  // failed and emits delivery_target_rejected"). In this in-process harness the first codex
  // dispatch queues behind binding confirmation, whereas manual retransmit is a direct attempt;
  // re-running that ingress suite is the regression guard for the untouched non-manual path.

  it("never creates a W12 outcome notification, relation, or reply-right on a manual retransmit reject", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-target",
      turnStartError: new CodexAppServerWebSocketError("codex_jsonrpc_error", "manual reject", {
        jsonRpcCode: -32001,
        requestId: 9,
      }),
    });
    const { client, deliveryId } = await setupUnconfirmedManualRetransmit(db, runtime);

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_rejected" });

    expect(manualEventCount(db, "delivery_target_rejected")).toBe(0);
    expect(outcomeNotificationCount(db)).toBe(0);
    expect(outcomeRelationCount(db, deliveryId)).toBe(0);
    expect(replyRightCount(db, deliveryId)).toBe(0);
  });

  it("registers an attached agent through a round-trip request", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
    });

    expect(response).toEqual({
      ok: true,
      agent: {
        id: "agent-1",
        name: "impl",
        kind: "codex",
        status: "connected",
        cwd: "/repo",
        pairId: null,
      },
    });
  });

  it("attaches a no-resume Codex runtime without creating a daemon-owned thread", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-new",
    });
    const runtimes = new Map();
    const state = createDaemonState({
      db,
      createId: createIdSequence(["agent-1"]),
      now: createNowSequence([
        "2026-05-18T00:00:00.000Z",
        "2026-05-18T00:00:00.000Z",
        "2026-05-18T00:00:01.000Z",
        "2026-05-18T00:00:01.000Z",
      ]),
      codexRuntimes: runtimes,
      attachCodexRuntime: async ({ agentName, activeThreadId }) => {
        expect(agentName).toBe("impl");
        expect(activeThreadId).toBe(null);
        return runtime;
      },
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
    });

    expect(response).toEqual({
      ok: true,
      agent: {
        id: "agent-1",
        name: "impl",
        kind: "codex",
        status: "connected",
        cwd: "/repo",
        pairId: null,
      },
      codexRuntime: {
        endpoint: "ws://127.0.0.1:54321/",
        activeThreadId: null,
      },
      codexChannelToken: expect.any(String),
    });
    expect(runtimes.get("impl")).toBe(runtime);
    expect(runtime.startThreadCalls).toBe(0);
    expect(db.prepare("select adapter_session_id from agents where name = ?").get("impl")).toEqual({
      adapter_session_id: null,
    });
    expect(db.prepare("select type, data_json from events").all()).toEqual([]);
  });

  it("resumes an explicit Codex session during attach and records a resume rebind", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      resumedThreadId: "thread-resume",
    });
    const state = createDaemonState({
      db,
      createId: createIdSequence(["agent-1", "event-1"]),
      now: createNowSequence([
        "2026-05-18T00:00:00.000Z",
        "2026-05-18T00:00:00.000Z",
        "2026-05-18T00:00:01.000Z",
        "2026-05-18T00:00:01.000Z",
      ]),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
      resumeSessionId: "thread-resume",
    });

    expect(response).toMatchObject({
      ok: true,
      agent: {
        adapterSessionId: "thread-resume",
      },
      codexRuntime: {
        activeThreadId: "thread-resume",
      },
    });
    expect(runtime.resumeThreadCalls).toEqual(["thread-resume"]);
    expect(db.prepare("select type, data_json from events").all()).toEqual([
      {
        type: "agent_thread_id_rebound",
        data_json: JSON.stringify({
          previousId: null,
          nextId: "thread-resume",
          operation: "thread/resume",
          source: "attach_resume",
        }),
      },
    ]);
  });

  it("fails explicit Codex resume attach atomically on returned id mismatch", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      resumedThreadId: "thread-other",
    });
    const state = createDaemonState({
      db,
      createId: createIdSequence(["agent-1"]),
      now: createNowSequence([
        "2026-05-18T00:00:00.000Z",
        "2026-05-18T00:00:00.000Z",
        "2026-05-18T00:00:01.000Z",
        "2026-05-18T00:00:01.000Z",
      ]),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
    });
    const client = createInProcessClient(createDaemonApi(state));

    await expect(
      client.attachAgent({
        kind: "codex",
        name: "impl",
        cwd: "/repo",
        resumeSessionId: "thread-requested",
      }),
    ).resolves.toMatchObject({
      ok: false,
      reason: "codex_resume_failed",
      message: expect.stringContaining("thread-other"),
    });
    expect(runtime.disposeCalls).toBe(1);
    // Rollback on atomic-resume failure now physically removes the just-created
    // row (and its routes) instead of status-flipping it.
    expect((await client.status()).agents).toEqual([]);
    expect(db.prepare("select type from events").all()).toEqual([]);
  });

  it("rejects pair attach when the pair does not exist without registering the agent", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
      pairName: "feature-x",
    });

    expect(response).toEqual({
      ok: false,
      reason: "pair_not_found",
      pairName: "feature-x",
    });
    expect(db.prepare("select id from agents").all()).toEqual([]);
  });

  it("creates a pair reservation through a round-trip request", async () => {
    const state = createDaemonState({
      db,
      createId: () => "pair-1",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.createPair({
      name: "feature-x",
    });

    expect(response).toEqual({
      ok: true,
      pair: {
        id: "pair-1",
        name: "feature-x",
        status: "pending",
      },
    });
  });

  it("rejects duplicate pair reservation names with a typed error", async () => {
    const state = createDaemonState({
      db,
      createId: () => "pair-1",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.createPair({
      name: "feature-x",
    });

    const response = await client.createPair({
      name: "feature-x",
    });

    expect(response).toEqual({
      ok: false,
      reason: "pair_name_already_exists",
      name: "feature-x",
    });
  });

  it("attaches an agent to an existing pair by pairName", async () => {
    const ids = ["pair-1", "agent-1"];
    const state = createDaemonState({
      db,
      createId: () => {
        const id = ids.shift();

        if (!id) {
          throw new Error("unexpected id request");
        }

        return id;
      },
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.createPair({
      name: "feature-x",
    });

    const response = await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
      pairName: "feature-x",
    });

    expect(response).toEqual({
      ok: true,
      agent: {
        id: "agent-1",
        name: "impl",
        kind: "codex",
        status: "connected",
        cwd: "/repo",
        pairId: "pair-1",
      },
    });
  });

  it("connects one source to multiple targets and separates created from already existing routes", async () => {
    const ids = ["agent-source", "agent-one", "agent-two", "route-one", "route-two"];
    const state = createDaemonState({
      db,
      createId: () => {
        const id = ids.shift();

        if (!id) {
          throw new Error("unexpected id request");
        }

        return id;
      },
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "researcher", cwd: "/repo" });

    const first = await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer", "researcher"],
    });
    const second = await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer"],
    });

    expect(first).toEqual({
      ok: true,
      created: [
        {
          id: "route-one",
          sourceAgentId: "agent-source",
          targetAgentId: "agent-one",
          status: "active",
        },
        {
          id: "route-two",
          sourceAgentId: "agent-source",
          targetAgentId: "agent-two",
          status: "active",
        },
      ],
      alreadyExisted: [],
    });
    expect(second).toEqual({
      ok: true,
      created: [],
      alreadyExisted: [
        {
          id: "route-one",
          sourceAgentId: "agent-source",
          targetAgentId: "agent-one",
          status: "active",
        },
      ],
    });
  });

  it("reports an authenticated Claude channel port conflict and projects it as the unavailable runtime cause", async () => {
    let id = 0;
    const state = createDaemonState({
      db,
      createId: () => `id-${++id}`,
      now: () => "2026-08-13T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state)) as ReturnType<
      typeof createDaemonApi
    > & {
      reportClaudeChannelBootFailure(request: {
        agentName: string;
        token: string;
        reason: "claude_channel_port_in_use";
      }): Promise<{ ok: true; agentName: string; recorded: boolean }>;
    };

    await client.createPair({ name: "feature" });
    await client.attachAgent({
      kind: "codex",
      name: "source",
      cwd: "/repo",
      pairName: "feature",
      slot: "a",
    });
    const targetAttach = await client.attachAgent({
      kind: "claude",
      name: "target",
      cwd: "/repo",
      pairName: "feature",
      slot: "b",
    });
    if (!targetAttach.ok || !targetAttach.claudeChannelToken) {
      throw new Error("expected Claude channel token");
    }
    await expect(
      client.reportClaudeChannelBootFailure({
        agentName: "target",
        token: targetAttach.claudeChannelToken,
        reason: "claude_channel_port_in_use",
      }),
    ).resolves.toEqual({ ok: true, agentName: "target", recorded: true });

    await expect(
      client.receiveClaudeChannelMessage({
        agentName: "source",
        messageId: "message-after-claude-boot-failure",
        type: "instruction",
        content: { text: "review this" },
      }),
    ).resolves.toMatchObject({
      ok: true,
      dispatch: {
        deferred: [
          {
            reason: "target_runtime_unavailable",
            cause: "claude_channel_port_in_use",
          },
        ],
      },
    });
  });

  it("rejects wrong tokens and unsupported Claude boot-failure reasons without recording a cause", async () => {
    let id = 0;
    const client = createInProcessClient(
      createDaemonApi(
        createDaemonState({
          db,
          createId: () => `reject-id-${++id}`,
          now: () => "2026-08-13T00:00:00.000Z",
        }),
      ),
    );
    await client.createPair({ name: "reject-pair" });
    await client.attachAgent({ kind: "codex", name: "source", cwd: "/repo", pairName: "reject-pair", slot: "a" });
    const target = await client.attachAgent({ kind: "claude", name: "target", cwd: "/repo", pairName: "reject-pair", slot: "b" });
    if (!target.ok || !target.claudeChannelToken) throw new Error("expected token");

    await expect(client.reportClaudeChannelBootFailure({ agentName: "target", token: "wrong", reason: "claude_channel_port_in_use" })).resolves.toEqual({ ok: false, reason: "claude_channel_boot_failure_report_rejected", detail: "unknown_token" });
    await expect(
      client.reportClaudeChannelBootFailure({
        agentName: "target",
        token: target.claudeChannelToken,
        reason: "some_other_failure",
      } as unknown as Parameters<
        typeof client.reportClaudeChannelBootFailure
      >[0]),
    ).resolves.toEqual({
      ok: false,
      reason: "claude_channel_boot_failure_report_rejected",
      detail: "unsupported_reason",
    });
    await expect(client.receiveClaudeChannelMessage({ agentName: "source", messageId: "rejected-report-message", content: { text: "review" } })).resolves.toMatchObject({ ok: true, dispatch: { deferred: [{ reason: "target_runtime_unavailable" }] } });
    const response = await client.receiveClaudeChannelMessage({ agentName: "source", messageId: "rejected-report-message-2", content: { text: "review again" } });
    if (!response.ok) throw new Error("expected dispatch");
    expect(response.dispatch.deferred[0]).not.toHaveProperty("cause");
  });

  it("ignores a Claude boot-failure report when a channel runtime is already registered", async () => {
    let id = 0;
    const client = createInProcessClient(createDaemonApi(createDaemonState({ db, createId: () => `runtime-id-${++id}`, now: () => "2026-08-13T00:00:00.000Z" }))) as ReturnType<typeof createDaemonApi> & { reportClaudeChannelBootFailure(request: { agentName: string; token: string; reason: "claude_channel_port_in_use" }): Promise<unknown> };
    const attach = await client.attachAgent({ kind: "claude", name: "target", cwd: "/repo" });
    if (!attach.ok || !attach.claudeChannelToken) throw new Error("expected token");
    await client.registerClaudeChannel({ agentName: "target", token: attach.claudeChannelToken, endpoint: "http://127.0.0.1:18789/send" });

    await expect(
      client.reportClaudeChannelBootFailure({
        agentName: "target",
        token: attach.claudeChannelToken,
        reason: "some_other_failure",
      } as unknown as Parameters<
        typeof client.reportClaudeChannelBootFailure
      >[0]),
    ).resolves.toEqual({
      ok: false,
      reason: "claude_channel_boot_failure_report_rejected",
      detail: "unsupported_reason",
    });
    await expect(client.reportClaudeChannelBootFailure({ agentName: "target", token: attach.claudeChannelToken, reason: "claude_channel_port_in_use" })).resolves.toEqual({ ok: true, agentName: "target", recorded: false });
  });

  it("keeps Claude runtime and boot cause mutually exclusive across report/register orderings", async () => {
    let id = 0;
    const runtimes = new Map();
    const client = createInProcessClient(createDaemonApi(createDaemonState({ db, createId: () => `ordering-id-${++id}`, now: () => "2026-08-13T00:00:00.000Z", claudeChannelRuntimes: runtimes }))) as ReturnType<typeof createDaemonApi> & { reportClaudeChannelBootFailure(request: { agentName: string; token: string; reason: "claude_channel_port_in_use" }): Promise<{ ok: true; agentName: string; recorded: boolean }> };
    await client.createPair({ name: "ordering-pair" });
    await client.attachAgent({ kind: "codex", name: "source", cwd: "/repo", pairName: "ordering-pair", slot: "a" });
    const target = await client.attachAgent({ kind: "claude", name: "target", cwd: "/repo", pairName: "ordering-pair", slot: "b" });
    if (!target.ok || !target.claudeChannelToken) throw new Error("expected token");

    await expect(client.reportClaudeChannelBootFailure({ agentName: "target", token: target.claudeChannelToken, reason: "claude_channel_port_in_use" })).resolves.toMatchObject({ recorded: true });
    await client.registerClaudeChannel({ agentName: "target", token: target.claudeChannelToken, endpoint: "http://127.0.0.1:18789/send" });
    await expect(client.reportClaudeChannelBootFailure({ agentName: "target", token: target.claudeChannelToken, reason: "claude_channel_port_in_use" })).resolves.toMatchObject({ recorded: false });

    runtimes.delete("target");
    const response = await client.receiveClaudeChannelMessage({ agentName: "source", messageId: "ordering-message", content: { text: "review" } });
    if (!response.ok) throw new Error("expected dispatch");
    expect(response.dispatch.deferred[0]).not.toHaveProperty("cause");
  });

  it("clears Claude boot causes with session cleanup while daemon-only stop preserves them", async () => {
    let id = 0;
    const client = createInProcessClient(createDaemonApi(createDaemonState({ db, createId: () => `lifecycle-id-${++id}`, now: () => "2026-08-13T00:00:00.000Z" }))) as ReturnType<typeof createDaemonApi> & { reportClaudeChannelBootFailure(request: { agentName: string; token: string; reason: "claude_channel_port_in_use" }): Promise<unknown> };
    await client.attachAgent({ kind: "claude", name: "source", cwd: "/repo" });

    const targets = new Map<string, { id: string; token: string }>();
    for (const name of ["rollback", "disconnect", "detach", "tui", "reattach", "preserve", "normal-stop"]) {
      const attach = await client.attachAgent({ kind: "claude", name, cwd: "/repo" });
      if (!attach.ok || !attach.claudeChannelToken) throw new Error("expected token");
      targets.set(name, { id: attach.agent.id, token: attach.claudeChannelToken });
      await client.connect({ sourceName: "source", targetNames: [name] });
      await client.reportClaudeChannelBootFailure({ agentName: name, token: attach.claudeChannelToken, reason: "claude_channel_port_in_use" });
    }

    await client.rollbackAgentAttach({ agentName: "rollback" });
    await client.disconnectClaudeChannel({ agentName: "disconnect" });
    await expect(
      client.reportClaudeChannelBootFailure({
        agentName: "disconnect",
        token: targets.get("disconnect")!.token,
        reason: "claude_channel_port_in_use",
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "claude_channel_boot_failure_report_rejected",
      detail: "unknown_token",
    });
    await client.detachAgent({ agentName: "detach" });
    await client.notifyTuiExited({ agentName: "tui", exitCode: 0 });
    // Simulate departure through the real production path (detachAgent)
    // rather than a raw status flip: physical delete means there is no
    // "disconnected" row state left to fabricate via SQL.
    await client.detachAgent({ agentName: "reattach" });
    const replacement = await client.attachAgent({
      kind: "claude",
      name: "reattach",
      cwd: "/repo",
    });
    if (!replacement.ok || !replacement.claudeChannelToken) {
      throw new Error("expected replacement token");
    }
    expect(replacement.claudeChannelToken).not.toBe(targets.get("reattach")!.token);
    await expect(
      client.reportClaudeChannelBootFailure({
        agentName: "reattach",
        token: targets.get("reattach")!.token,
        reason: "claude_channel_port_in_use",
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "claude_channel_boot_failure_report_rejected",
      detail: "unknown_token",
    });
    // Reattach is a fresh insert (new id) under the physical-delete redesign,
    // not a reuse of the departed row -- rebase the id used below to the
    // agent that now actually exists under this name.
    targets.set("reattach", { id: replacement.agent.id, token: replacement.claudeChannelToken });
    await client.stop({ daemonOnly: true });

    const beforeNormalStop = await client.receiveClaudeChannelMessage({ agentName: "source", messageId: "lifecycle-before-stop", content: { text: "review" } });
    if (!beforeNormalStop.ok) throw new Error("expected dispatch");
    for (const name of ["rollback", "disconnect", "detach", "tui", "reattach"]) {
      const targetAgentId = targets.get(name)!.id;
      const deferred = beforeNormalStop.dispatch.deferred.find(
        (entry) => entry.targetAgentId === targetAgentId,
      );
      // Departure now physically removes the agent's row *and* its routes
      // (routes.removeAllForAgent), so "source" no longer has an active
      // route to any of these names -- dispatch does not attempt delivery to
      // them at all, rather than attempting and reporting them unavailable.
      // ("reattach" was re-inserted under the same name but with a fresh id
      // and no route was re-`connect()`ed to it, so it is equally absent.)
      expect(deferred).toBeUndefined();
    }
    expect(
      beforeNormalStop.dispatch.deferred.find(
        ({ targetAgentId }) => targetAgentId === targets.get("preserve")!.id,
      ),
    ).toMatchObject({
      reason: "target_runtime_unavailable",
      cause: "claude_channel_port_in_use",
    });

    // A non-daemonOnly stop now removes *every* connected agent's row
    // (`removeAllConnected`), "source" included -- unlike daemonOnly stop,
    // there is no longer a way to probe post-stop dispatch behavior for
    // "normal-stop" via a live send, because the sender itself is gone too.
    // Assert the stronger, directly-observable property instead: nothing
    // survives a non-daemonOnly stop.
    await client.stop({ daemonOnly: false });
    expect((await client.status()).agents).toEqual([]);
  });

  it("rejects connect when the source agent does not exist without creating routes", async () => {
    const state = createDaemonState({
      db,
      createId: () => "route-1",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });

    const response = await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer"],
    });

    expect(response).toEqual({
      ok: false,
      reason: "source_agent_not_found",
      sourceName: "impl",
    });
    expect(db.prepare("select id from routes").all()).toEqual([]);
  });

  it("rejects connect when any target agent does not exist without creating partial routes", async () => {
    const ids = ["agent-source", "agent-one", "route-one"];
    const state = createDaemonState({
      db,
      createId: () => {
        const id = ids.shift();

        if (!id) {
          throw new Error("unexpected id request");
        }

        return id;
      },
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });

    const response = await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer", "missing"],
    });

    expect(response).toEqual({
      ok: false,
      reason: "target_agent_not_found",
      missing: ["missing"],
    });
    expect(db.prepare("select id from routes").all()).toEqual([]);
  });

  it("removes both directions of an agent's routes when it detaches (route-level disconnect no longer exists)", async () => {
    const ids = ["agent-source", "agent-one", "agent-two", "route-one", "route-two", "route-reverse", "event-1"];
    const state = createDaemonState({
      db,
      createId: () => {
        const id = ids.shift();

        if (!id) {
          throw new Error("unexpected id request");
        }

        return id;
      },
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "researcher", cwd: "/repo" });
    await client.connect({ sourceName: "impl", targetNames: ["reviewer", "researcher"] });
    await client.connect({ sourceName: "reviewer", targetNames: ["impl"] });

    await client.detachAgent({ agentName: "reviewer" });

    // Only "reviewer"'s two routes (as source and as target) are gone;
    // "impl"'s unrelated route to "researcher" is untouched. There is no
    // selective route-level disconnect any more -- the only way a route
    // disappears is its agent leaving entirely.
    expect(
      db.prepare("select source_agent_id, target_agent_id from routes order by id").all(),
    ).toEqual([{ source_agent_id: "agent-source", target_agent_id: "agent-two" }]);
  });

  it("returns empty daemon status through a round-trip request", async () => {
    const state = createDaemonState({
      db,
      createId: () => "unused",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    expect(await client.status()).toEqual({
      daemon: {
        pid: process.pid,
        startedAt: "2026-05-18T00:00:00.000Z",
      },
      agents: [],
      pairs: [],
      routes: [],
      messageCount: 0,
      deliveryCounts: {
        queued: 0,
        delivering: 0,
        delivered: 0,
        completed: 0,
        failed: 0,
        unconfirmed: 0,
      },
    });
  });

  it("returns agents, pairs, and routes in daemon status", async () => {
    const ids = ["pair-1", "agent-source", "agent-target", "route-1"];
    const state = createDaemonState({
      db,
      createId: () => {
        const id = ids.shift();

        if (!id) {
          throw new Error("unexpected id request");
        }

        return id;
      },
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.createPair({ name: "feature-x" });
    await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
      pairName: "feature-x",
    });
    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
    await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer"],
    });

    expect(await client.status()).toEqual({
      daemon: {
        pid: process.pid,
        startedAt: "2026-05-18T00:00:00.000Z",
      },
      agents: [
        {
          id: "agent-source",
          name: "impl",
          kind: "codex",
          status: "connected",
          cwd: "/repo",
          pairId: "pair-1",
          deliveryDiagnostics: {
            acceptanceEvidence: "codex_turn_start",
            targetReceiptEvidence: "unavailable",
            automaticTargetAck: false,
            automaticCompletion: false,
            automaticRetry: "conclusive_pre_write_failure_only",
            manualRetransmit: {
              eligibleStatus: "unconfirmed",
              requiresDuplicateRiskConfirmation: true,
              requiredReadiness: "ready_codex_runtime_and_bound_thread",
              dispatch: "direct_never_queued",
              lateTransportOutcomeResolution: "correlated_response",
            },
          },
        },
        {
          id: "agent-target",
          name: "reviewer",
          kind: "claude",
          status: "connected",
          cwd: "/repo",
          pairId: null,
          deliveryDiagnostics: {
            acceptanceEvidence: "claude_http_2xx",
            targetReceiptEvidence: "unavailable",
            automaticTargetAck: false,
            automaticCompletion: false,
            automaticRetry: "conclusive_pre_write_failure_only",
            manualRetransmit: {
              eligibleStatus: "unconfirmed",
              requiresDuplicateRiskConfirmation: true,
              requiredReadiness: "ready_claude_channel_runtime",
              dispatch: "direct_never_queued",
              lateTransportOutcomeResolution: "none",
            },
          },
        },
      ],
      pairs: [
        {
          id: "pair-1",
          name: "feature-x",
          status: "pending",
        },
      ],
      routes: [
        {
          id: "route-1",
          sourceAgentId: "agent-source",
          targetAgentId: "agent-target",
          status: "active",
        },
      ],
      messageCount: 0,
      deliveryCounts: {
        queued: 0,
        delivering: 0,
        delivered: 0,
        completed: 0,
        failed: 0,
        unconfirmed: 0,
      },
    });
  });

  it("stops connected agents through a round-trip request", async () => {
    const ids = ["agent-source", "agent-target"];
    const state = createDaemonState({
      db,
      createId: () => {
        const id = ids.shift();

        if (!id) {
          throw new Error("unexpected id request");
        }

        return id;
      },
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });

    // stoppedAgents is the pre-deletion snapshot returned by
    // `removeAllConnected` -- status is still "connected" (the only value
    // the narrowed type has) because the row is physically deleted, not
    // status-flipped.
    expect(await client.stop({})).toEqual({
      ok: true,
      stoppedAgents: [
        {
          id: "agent-source",
          name: "impl",
          kind: "codex",
          status: "connected",
          cwd: "/repo",
          pairId: null,
        },
        {
          id: "agent-target",
          name: "reviewer",
          kind: "claude",
          status: "connected",
          cwd: "/repo",
          pairId: null,
        },
      ],
    });
    expect((await client.status()).agents).toEqual([]);
  });

  it("waits for async Codex runtime disposal before normal stop resolves", async () => {
    let resolveDisposal!: () => void;
    const disposal = new Promise<void>((resolve) => {
      resolveDisposal = resolve;
    });
    const runtime = {
      state: "ready" as const,
      dispose: vi.fn(() => disposal),
    };
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-18T00:00:00.000Z",
      codexRuntimes: new Map([["impl", runtime]]),
    });
    const client = createInProcessClient(createDaemonApi(state));
    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    let stopResolved = false;
    const stopPromise = Promise.resolve(client.stop({})).then((response) => {
      stopResolved = true;
      return response;
    });

    try {
      expect(runtime.dispose).toHaveBeenCalledOnce();
      await Promise.resolve();
      expect(stopResolved).toBe(false);
    } finally {
      resolveDisposal();
    }

    await expect(stopPromise).resolves.toMatchObject({ ok: true });
  });

  it("finishes an in-flight Codex dispatch before disposing its runtime during normal stop", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      resumedThreadId: "thread-target",
    });
    type CodexResponse = Awaited<ReturnType<typeof runtime.requestCodex>>;
    let resolveTurnStart!: (result: CodexResponse) => void;
    const turnStart = new Promise<CodexResponse>((resolve) => {
      resolveTurnStart = resolve;
    });
    const originalRequestCodex = runtime.requestCodex.bind(runtime);
    const requestCodex = vi.fn(originalRequestCodex);
    requestCodex.mockImplementation((method, params, requestOptions) => {
      if (method === "turn/start") return turnStart;
      return originalRequestCodex(method, params, requestOptions);
    });
    runtime.requestCodex = requestCodex;

    let id = 0;
    const state = createDaemonState({
      db,
      createId: () => `id-${++id}`,
      now: () => "2026-08-12T00:00:00.000Z",
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
      scheduleTimeout: () => 0,
    });
    const client = createInProcessClient(createDaemonApi(state));
    await client.attachAgent({ kind: "claude", name: "source", cwd: "/repo" });
    await client.attachAgent({
      kind: "codex",
      name: "target",
      cwd: "/repo",
      resumeSessionId: "thread-target",
    });
    await client.connect({ sourceName: "source", targetNames: ["target"] });

    const dispatchPromise = client.receiveClaudeChannelMessage({
      agentName: "source",
      messageId: "message-in-flight-codex-stop",
      content: { text: "finish before runtime disposal" },
    });
    await vi.waitFor(() => {
      expect(requestCodex.mock.calls.some(([method]) => method === "turn/start")).toBe(true);
    });

    let stopResolved = false;
    const stopPromise = client.stop({}).then((response) => {
      stopResolved = true;
      return response;
    });

    try {
      await new Promise((resolve) => setImmediate(resolve));
      expect(runtime.disposeCalls).toBe(0);
      expect(stopResolved).toBe(false);
    } finally {
      resolveTurnStart({ turn: { id: "turn-1", status: "inProgress" } });
    }

    await expect(dispatchPromise).resolves.toMatchObject({
      ok: true,
      dispatch: { delivered: 1 },
    });
    await expect(stopPromise).resolves.toMatchObject({ ok: true });
    expect(runtime.disposeCalls).toBe(1);
    expect(stopResolved).toBe(true);
  });

  it("stops only the daemon shell without disconnecting agents", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    expect(await client.stop({ daemonOnly: true })).toEqual({
      ok: true,
      stoppedAgents: [],
    });
    expect((await client.status()).agents).toEqual([
      {
        id: "agent-1",
        name: "impl",
        kind: "codex",
        status: "connected",
        cwd: "/repo",
        pairId: null,
        deliveryDiagnostics: {
          acceptanceEvidence: "codex_turn_start",
          targetReceiptEvidence: "unavailable",
          automaticTargetAck: false,
          automaticCompletion: false,
          automaticRetry: "conclusive_pre_write_failure_only",
          manualRetransmit: {
            eligibleStatus: "unconfirmed",
            requiresDuplicateRiskConfirmation: true,
            requiredReadiness: "ready_codex_runtime_and_bound_thread",
            dispatch: "direct_never_queued",
            lateTransportOutcomeResolution: "correlated_response",
          },
        },
      },
    ]);
  });

  it("rolls back a pre-ready agent attach by disposing runtime and disconnecting the agent", async () => {
    const runtime = fakeRuntime("starting");
    const state = createDaemonState({
      db,
      createId: createIdSequence(["agent-1"]),
      now: () => "2026-05-18T00:00:00.000Z",
      codexRuntimes: new Map([["impl", runtime]]),
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    await expect(client.rollbackAgentAttach({ agentName: "impl" })).resolves.toEqual({
      ok: true,
      agentName: "impl",
      rolledBack: true,
    });
    expect(runtime.disposeCalls).toBe(1);
    expect((await client.status()).agents).toEqual([]);
  });

  it("does not roll back a ready runtime by agent name", async () => {
    const runtime = fakeRuntime("ready");
    const state = createDaemonState({
      db,
      createId: createIdSequence(["agent-1"]),
      now: () => "2026-05-18T00:00:00.000Z",
      codexRuntimes: new Map([["impl", runtime]]),
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    await expect(client.rollbackAgentAttach({ agentName: "impl" })).resolves.toEqual({
      ok: true,
      agentName: "impl",
      rolledBack: false,
    });
    expect(runtime.disposeCalls).toBe(0);
    expect((await client.status()).agents[0].status).toBe("connected");
  });

  it("detaches a ready agent by disposing runtime, removing its row, and emitting a graceful event", async () => {
    const runtime = fakeRuntime("ready");
    const state = createDaemonState({
      db,
      createId: createIdSequence(["agent-1", "event-1"]),
      now: () => "2026-05-18T00:00:00.000Z",
      codexRuntimes: new Map([["impl", runtime]]),
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    db.prepare("update agents set adapter_session_id = ? where name = ?").run(
      "thread-1",
      "impl",
    );

    await expect(client.detachAgent({ agentName: "impl" })).resolves.toEqual({
      ok: true,
      agentName: "impl",
      detached: true,
    });

    expect(runtime.disposeCalls).toBe(1);
    // Physical delete means the row (and whatever adapter_session_id it
    // carried) is gone, not preserved under a "disconnected" status.
    expect(
      db.prepare("select status, adapter_session_id from agents where name = ?").get(
        "impl",
      ),
    ).toBeUndefined();
    expect(db.prepare("select type, data_json from events").all()).toEqual([
      {
        type: "agent_graceful_detach",
        data_json: JSON.stringify({ trigger: "explicit_detach" }),
      },
    ]);
  });

  it("records TUI exit by reusing the graceful detach cleanup path", async () => {
    const runtime = fakeRuntime("ready");
    const state = createDaemonState({
      db,
      createId: createIdSequence(["agent-1", "event-1"]),
      now: () => "2026-05-18T00:00:00.000Z",
      codexRuntimes: new Map([["impl", runtime]]),
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    await expect(
      client.notifyTuiExited({ agentName: "impl", exitCode: 0, signal: null }),
    ).resolves.toEqual({
      ok: true,
      agentName: "impl",
      detached: true,
    });

    expect(runtime.disposeCalls).toBe(1);
    expect(db.prepare("select type, data_json from events").all()).toEqual([
      {
        type: "agent_graceful_detach",
        data_json: JSON.stringify({
          trigger: "tui_exit",
          exitCode: 0,
          signal: null,
        }),
      },
    ]);
  });

  it("keeps detach and TUI-exit cleanup idempotent after the agent is disconnected", async () => {
    const runtime = fakeRuntime("ready");
    const state = createDaemonState({
      db,
      createId: createIdSequence(["agent-1", "event-1"]),
      now: () => "2026-05-18T00:00:00.000Z",
      codexRuntimes: new Map([["impl", runtime]]),
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    expect(await client.detachAgent({ agentName: "impl" })).toEqual({
      ok: true,
      agentName: "impl",
      detached: true,
    });
    expect(
      await client.notifyTuiExited({ agentName: "impl", exitCode: 0, signal: null }),
    ).toEqual({
      ok: true,
      agentName: "impl",
      detached: false,
    });

    expect(runtime.disposeCalls).toBe(1);
    expect(db.prepare("select type from events").all()).toEqual([
      { type: "agent_graceful_detach" },
    ]);
  });

  it("records runtime failure by disconnecting the agent and appending typed reason data", async () => {
    const state = createDaemonState({
      db,
      createId: createIdSequence(["agent-1", "event-1"]),
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    expect(
      state.recordCodexRuntimeFailed({
        agentName: "impl",
        reason: {
          type: "ws_dropped",
          closeCode: 1006,
          closeReason: "network dropped",
        },
        latestDiagnosticNotification: {
          method: "remoteControl/status/changed",
          params: { status: "disconnected" },
        },
      }),
    ).toEqual({
      ok: true,
      agentName: "impl",
      recorded: true,
    });
    expect((await client.status()).agents).toEqual([]);
    expect(db.prepare("select type, data_json from events").all()).toEqual([
      {
        type: "agent_runtime_failed",
        data_json: JSON.stringify({
          reason: {
            type: "ws_dropped",
            closeCode: 1006,
            closeReason: "network dropped",
          },
          latestDiagnosticNotification: {
            method: "remoteControl/status/changed",
            params: { status: "disconnected" },
          },
        }),
      },
    ]);
  });
});

describe("daemon API manual retransmit for Claude targets", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    db.close();
  });

  it("requires duplicate-risk confirmation, delivers on immediate manual retransmit success, and emits one terminal delivered event", async () => {
    const { client, deliveryId } = await setupUnconfirmedManualRetransmitClaude(db);
    const requests: Array<{ url: string; body: unknown }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      requests.push({ url, body: JSON.parse(init.body as string) });
      return new Response("{}", { status: 202 });
    });

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: false }),
    ).resolves.toEqual({ ok: false, reason: "duplicate_risk_confirmation_required" });
    expect(requests).toHaveLength(0);

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: true, delivery: { id: deliveryId, status: "delivered" } });
    expect(requests).toHaveLength(1);
    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "delivered" });
    expect(manualEventData(db, "delivery_manual_retransmit")).toEqual({
      actor: "operator",
      attempt: 1,
      confirmDuplicateRisk: true,
    });
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(1);
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(0);
    expect(manualEventData(db, "delivery_manual_retransmit_delivered")).toEqual({
      actor: "operator",
      attempt: 1,
    });
  });

  it("keeps manual_retransmit_failed with no new event and does not queue when the Claude channel runtime is not registered", async () => {
    const { client, deliveryId } = await setupUnconfirmedManualRetransmitClaude(db, {
      register: false,
    });
    const requests: Array<{ url: string; body: unknown }> = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      requests.push({ url, body: JSON.parse(init.body as string) });
      return new Response("{}", { status: 202 });
    });

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_failed" });

    expect(requests).toHaveLength(0);
    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });
    expect(
      db.prepare("select count(*) as count from message_deliveries where status = 'queued'").get(),
    ).toEqual({ count: 0 });
    expect(manualEventCount(db, "delivery_manual_retransmit")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(0);
  });

  it("emits one terminal rejected event and preserves unconfirmed on an explicit non-2xx manual retransmit reject", async () => {
    const { client, deliveryId } = await setupUnconfirmedManualRetransmitClaude(db);
    vi.stubGlobal("fetch", async () => new Response("rejected", { status: 500 }));

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_rejected" });

    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });
    expect(
      db.prepare("select count(*) as count from message_deliveries where status = 'queued'").get(),
    ).toEqual({ count: 0 });
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(1);
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(0);
    expect(manualEventData(db, "delivery_manual_retransmit_rejected")).toEqual({
      actor: "operator",
      attempt: 1,
      adapter: "claude",
      reason: "claude_channel_push_failed",
      message: "Claude channel push rejected: HTTP 500",
    });
  });

  it("surfaces a timeout/AbortError manual retransmit as unconfirmed with one non-terminal event and no retry", async () => {
    const { client, deliveryId } = await setupUnconfirmedManualRetransmitClaude(db);
    vi.stubGlobal(
      "fetch",
      async () =>
        new Promise((_resolve, reject) => {
          reject(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
        }),
    );

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_unconfirmed" });

    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });
    expect(
      db.prepare("select count(*) as count from message_deliveries where status = 'queued'").get(),
    ).toEqual({ count: 0 });
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(1);
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(0);
    expect(manualEventData(db, "delivery_manual_retransmit_unconfirmed")).toMatchObject({
      actor: "operator",
      attempt: 1,
      adapter: "claude",
      reason: "claude_channel_push_unconfirmed",
    });
  });

  it("surfaces an ambiguous fetch error as unconfirmed with no retry", async () => {
    const { client, deliveryId } = await setupUnconfirmedManualRetransmitClaude(db);
    vi.stubGlobal("fetch", async () => {
      throw new Error("socket closed after request start");
    });

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_unconfirmed" });

    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(1);
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(0);
    expect(manualEventData(db, "delivery_manual_retransmit_unconfirmed")).toMatchObject({
      reason: "claude_channel_push_unconfirmed",
      message: "Claude channel push response was lost: socket closed after request start",
    });
  });

  it("never transitions the original delivery to delivering during a manual retransmit attempt", async () => {
    const { client, deliveryId } = await setupUnconfirmedManualRetransmitClaude(db);
    const statusesAtFetch: string[] = [];
    vi.stubGlobal("fetch", async () => {
      const row = db.prepare("select status from message_deliveries where id = ?").get(
        deliveryId,
      ) as { status: string };
      statusesAtFetch.push(row.status);
      return new Response("{}", { status: 202 });
    });

    await client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true });

    expect(statusesAtFetch).toEqual(["unconfirmed"]);
  });

  it("keeps manual_retransmit_failed with no new event, no queue, and a distinct message when a registered Claude channel refuses the connection (ECONNREFUSED)", async () => {
    const { client, deliveryId } = await setupUnconfirmedManualRetransmitClaude(db);
    vi.stubGlobal("fetch", async () => {
      throw Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    });

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({
      ok: false,
      reason: "manual_retransmit_failed",
      message: "Claude direct write could not be started",
    });

    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });
    expect(
      db.prepare("select count(*) as count from message_deliveries where status = 'queued'").get(),
    ).toEqual({ count: 0 });
    expect(manualEventCount(db, "delivery_manual_retransmit")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(0);
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(0);

    vi.stubGlobal("fetch", async () => new Response("{}", { status: 202 }));
    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: true, delivery: { id: deliveryId, status: "delivered" } });
    expect(manualEventData(db, "delivery_manual_retransmit")).toEqual({
      actor: "operator",
      attempt: 1,
      confirmDuplicateRisk: true,
    });
  });

  it("never creates a W12 outcome notification, relation, or reply-right on a manual retransmit reject", async () => {
    const { client, deliveryId } = await setupUnconfirmedManualRetransmitClaude(db);
    vi.stubGlobal("fetch", async () => new Response("rejected", { status: 500 }));

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_rejected" });

    expect(manualEventCount(db, "delivery_target_rejected")).toBe(0);
    expect(outcomeNotificationCount(db)).toBe(0);
    expect(outcomeRelationCount(db, deliveryId)).toBe(0);
    expect(replyRightCount(db, deliveryId)).toBe(0);
  });
});

describe("daemon API manual retransmit — cross-adapter symmetry", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    db.close();
  });

  it("delivers a retransmit on each adapter from the same daemon with the same ok:true/delivered shape, without touching the other adapter's delivery or events", async () => {
    const codexRuntime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-codex-target",
    });
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 202 }));
    const { client, codexDeliveryId, claudeDeliveryId } =
      await setupCrossAdapterUnconfirmedManualRetransmit(db, codexRuntime);

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId: codexDeliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: true, delivery: { id: codexDeliveryId, status: "delivered" } });
    expect(deliveryStatus(db, claudeDeliveryId)).toEqual({ status: "unconfirmed" });
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(1);
    expect(manualEventCountForDelivery(db, "delivery_manual_retransmit", codexDeliveryId)).toBe(1);
    expect(manualEventCountForDelivery(db, "delivery_manual_retransmit", claudeDeliveryId)).toBe(0);
    expect(
      manualEventCountForDelivery(db, "delivery_manual_retransmit_delivered", codexDeliveryId),
    ).toBe(1);
    expect(
      manualEventCountForDelivery(db, "delivery_manual_retransmit_delivered", claudeDeliveryId),
    ).toBe(0);

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId: claudeDeliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: true, delivery: { id: claudeDeliveryId, status: "delivered" } });
    expect(deliveryStatus(db, codexDeliveryId)).toEqual({ status: "delivered" });
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(2);
    expect(manualEventCountForDelivery(db, "delivery_manual_retransmit", claudeDeliveryId)).toBe(1);
    expect(
      manualEventCountForDelivery(db, "delivery_manual_retransmit_delivered", claudeDeliveryId),
    ).toBe(1);
    // The Codex call's attribution from earlier stays exactly as it was — not
    // overwritten or duplicated by the subsequent Claude retransmit.
    expect(manualEventCountForDelivery(db, "delivery_manual_retransmit", codexDeliveryId)).toBe(1);
    expect(
      manualEventCountForDelivery(db, "delivery_manual_retransmit_delivered", codexDeliveryId),
    ).toBe(1);
  });

  it("rejects a retransmit on each adapter with the same ok:false/manual_retransmit_rejected shape, each preserving only its own delivery as unconfirmed", async () => {
    const codexRuntime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-codex-target",
      turnStartError: new CodexAppServerWebSocketError("codex_jsonrpc_error", "immediate reject", {
        jsonRpcCode: -32001,
        requestId: 7,
      }),
    });
    vi.stubGlobal("fetch", async () => new Response("rejected", { status: 500 }));
    const { client, codexDeliveryId, claudeDeliveryId } =
      await setupCrossAdapterUnconfirmedManualRetransmit(db, codexRuntime);

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId: codexDeliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_rejected" });
    expect(manualEventCountForDelivery(db, "delivery_manual_retransmit", codexDeliveryId)).toBe(1);
    expect(manualEventCountForDelivery(db, "delivery_manual_retransmit", claudeDeliveryId)).toBe(0);
    expect(
      manualEventCountForDelivery(db, "delivery_manual_retransmit_rejected", codexDeliveryId),
    ).toBe(1);
    expect(
      manualEventCountForDelivery(db, "delivery_manual_retransmit_rejected", claudeDeliveryId),
    ).toBe(0);

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId: claudeDeliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_rejected" });
    expect(manualEventCountForDelivery(db, "delivery_manual_retransmit", claudeDeliveryId)).toBe(1);
    expect(
      manualEventCountForDelivery(db, "delivery_manual_retransmit_rejected", claudeDeliveryId),
    ).toBe(1);
    // The Codex call's attribution from earlier stays exactly as it was — not
    // overwritten or duplicated by the subsequent Claude retransmit.
    expect(manualEventCountForDelivery(db, "delivery_manual_retransmit", codexDeliveryId)).toBe(1);
    expect(
      manualEventCountForDelivery(db, "delivery_manual_retransmit_rejected", codexDeliveryId),
    ).toBe(1);

    expect(deliveryStatus(db, codexDeliveryId)).toEqual({ status: "unconfirmed" });
    expect(deliveryStatus(db, claudeDeliveryId)).toEqual({ status: "unconfirmed" });
    expect(manualEventCount(db, "delivery_manual_retransmit_rejected")).toBe(2);
    expect(manualEventCount(db, "delivery_manual_retransmit_delivered")).toBe(0);
  });

  it("leaves a retransmit unconfirmed on each adapter with the same ok:false/manual_retransmit_unconfirmed shape and no automatic retry", async () => {
    const codexRuntime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-codex-target",
      turnStartTimeout: true,
    });
    vi.stubGlobal("fetch", async () => {
      throw new Error("socket closed after request start");
    });
    const { client, codexDeliveryId, claudeDeliveryId } =
      await setupCrossAdapterUnconfirmedManualRetransmit(db, codexRuntime);

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId: codexDeliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_unconfirmed" });
    expect(manualEventCountForDelivery(db, "delivery_manual_retransmit", codexDeliveryId)).toBe(1);
    expect(manualEventCountForDelivery(db, "delivery_manual_retransmit", claudeDeliveryId)).toBe(0);
    expect(
      manualEventCountForDelivery(db, "delivery_manual_retransmit_unconfirmed", codexDeliveryId),
    ).toBe(1);
    expect(
      manualEventCountForDelivery(db, "delivery_manual_retransmit_unconfirmed", claudeDeliveryId),
    ).toBe(0);

    await expect(
      client.retransmitUnconfirmedDelivery({ deliveryId: claudeDeliveryId, confirmDuplicateRisk: true }),
    ).resolves.toMatchObject({ ok: false, reason: "manual_retransmit_unconfirmed" });
    expect(manualEventCountForDelivery(db, "delivery_manual_retransmit", claudeDeliveryId)).toBe(1);
    expect(
      manualEventCountForDelivery(db, "delivery_manual_retransmit_unconfirmed", claudeDeliveryId),
    ).toBe(1);
    // The Codex call's attribution from earlier stays exactly as it was — not
    // overwritten or duplicated by the subsequent Claude retransmit.
    expect(manualEventCountForDelivery(db, "delivery_manual_retransmit", codexDeliveryId)).toBe(1);
    expect(
      manualEventCountForDelivery(db, "delivery_manual_retransmit_unconfirmed", codexDeliveryId),
    ).toBe(1);

    expect(deliveryStatus(db, codexDeliveryId)).toEqual({ status: "unconfirmed" });
    expect(deliveryStatus(db, claudeDeliveryId)).toEqual({ status: "unconfirmed" });
    expect(
      db.prepare("select count(*) as count from message_deliveries where status = 'queued'").get(),
    ).toEqual({ count: 0 });
    expect(manualEventCount(db, "delivery_manual_retransmit_unconfirmed")).toBe(2);
  });
});

describe("primary delivery source outcome notifications — cross-adapter symmetry", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    db.close();
  });

  it("records a delivery_unconfirmed source outcome for a primary Claude push that is ambiguous, and delivers it to the Codex source", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("socket closed");
    });
    const { client, deliveryId } = await setupCodexSourceToClaudeTarget(db);

    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "unconfirmed" });

    const relation = db
      .prepare(
        "select outcome_type, notification_message_id, notification_delivery_id from delivery_outcome_notifications where original_delivery_id = ?",
      )
      .get(deliveryId) as {
      outcome_type: string;
      notification_message_id: string;
      notification_delivery_id: string;
    };
    expect(relation.outcome_type).toBe("delivery_unconfirmed");

    const notification = db
      .prepare("select content from messages where id = ?")
      .get(relation.notification_message_id) as { content: string };
    expect(JSON.parse(notification.content)).toMatchObject({
      type: "delivery_unconfirmed",
      deliveryId: relation.notification_delivery_id,
      outcomeForDeliveryId: deliveryId,
      message:
        "Ask the user to confirm target activity and duplicate-risk acceptance before deciding whether to retransmit.",
      error: { reason: "claude_channel_push_unconfirmed" },
    });
    // The notification's own delivery is dispatched back to the Codex source through the
    // same canonical envelope pipeline Codex-target outcomes already use — proving the
    // renderer is adapter-neutral in the reverse direction (Claude-target failure -> Codex source).
    expect(deliveryStatus(db, relation.notification_delivery_id)).toEqual({ status: "delivered" });
  });

  it("records a delivery_target_rejected source outcome for a primary Claude push that is explicitly rejected, and delivers it to the Codex source", async () => {
    vi.stubGlobal("fetch", async () => new Response("nope", { status: 500 }));
    const { client, deliveryId } = await setupCodexSourceToClaudeTarget(db);

    expect(deliveryStatus(db, deliveryId)).toEqual({ status: "failed" });

    const rejection = db
      .prepare("select data_json from events where type = 'delivery_target_rejected'")
      .get() as { data_json: string };
    expect(JSON.parse(rejection.data_json)).toMatchObject({
      adapter: "claude",
      reason: "claude_channel_push_failed",
    });

    const relation = db
      .prepare(
        "select outcome_type, notification_message_id, notification_delivery_id from delivery_outcome_notifications where original_delivery_id = ?",
      )
      .get(deliveryId) as {
      outcome_type: string;
      notification_message_id: string;
      notification_delivery_id: string;
    };
    expect(relation.outcome_type).toBe("delivery_target_rejected");

    const notification = db
      .prepare("select content from messages where id = ?")
      .get(relation.notification_message_id) as { content: string };
    expect(JSON.parse(notification.content)).toMatchObject({
      type: "delivery_target_rejected",
      deliveryId: relation.notification_delivery_id,
      outcomeForDeliveryId: deliveryId,
      message:
        "Do not retransmit. Ask the user how to resolve the rejection and whether sending a new message is appropriate.",
      error: { reason: "claude_channel_push_failed" },
    });
    expect(deliveryStatus(db, relation.notification_delivery_id)).toEqual({ status: "delivered" });
    void client;
  });

  it("does not create a recursive outcome when the notification's own delivery to a Claude source is itself ambiguous", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-target",
      turnStartError: new CodexAppServerWebSocketError("codex_jsonrpc_error", "rejected", {
        jsonRpcCode: -32042,
      }),
    });
    let id = 0;
    const state = createDaemonState({
      db,
      createId: () => `id-${++id}`,
      now: () => "2026-08-09T00:00:00.000Z",
      claudeChannelRuntimes: new Map(),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
      scheduleTimeout: () => 0,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const sourceAttach = await client.attachAgent({ kind: "claude", name: "source", cwd: "/repo" });
    const claudeToken = (sourceAttach as { ok: true; claudeChannelToken: string }).claudeChannelToken;
    // A notification back to this same Claude source will also fail (ambiguous, non-abort),
    // proving the failure is observable through the normal delivery/event path only and
    // never authors a second, recursive outcome notification.
    vi.stubGlobal("fetch", async () => {
      throw new Error("socket closed");
    });
    await client.registerClaudeChannel({
      agentName: "source",
      token: claudeToken,
      endpoint: "http://127.0.0.1:18789/send",
    });
    await client.attachAgent({
      kind: "codex",
      name: "target",
      cwd: "/repo",
      resumeSessionId: "thread-target",
    });
    await client.connect({ sourceName: "source", targetNames: ["target"] });

    const sent = await client.receiveClaudeChannelMessage({
      agentName: "source",
      messageId: "message-claude-source-recursion",
      content: { text: "please act" },
    });
    if (!sent.ok) throw new Error("expected a delivery");
    const originalDeliveryId = sent.deliveries[0]!.id;

    expect(deliveryStatus(db, originalDeliveryId)).toEqual({ status: "failed" });
    expect(
      db.prepare("select count(*) as count from delivery_outcome_notifications").get(),
    ).toEqual({ count: 1 });
    expect(
      db
        .prepare(
          "select count(*) as count from messages where origin_kind = 'daemon' and intent = 'notification'",
        )
        .get(),
    ).toEqual({ count: 1 });
    const relation = db
      .prepare(
        "select notification_delivery_id from delivery_outcome_notifications where original_delivery_id = ?",
      )
      .get(originalDeliveryId) as { notification_delivery_id: string };
    // The notification's own delivery still surfaces its ambiguous failure through the
    // ordinary delivery-status path (unconfirmed) -- it is simply never itself an
    // outcome-notification source.
    expect(deliveryStatus(db, relation.notification_delivery_id)).toEqual({ status: "unconfirmed" });
  });

  it("records exactly one delivery_status_changed(failed) event when the notification's own delivery to a Claude source is itself explicitly rejected", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-target",
      turnStartError: new CodexAppServerWebSocketError("codex_jsonrpc_error", "rejected", {
        jsonRpcCode: -32042,
      }),
    });
    let id = 0;
    const state = createDaemonState({
      db,
      createId: () => `id-${++id}`,
      now: () => "2026-08-09T00:00:00.000Z",
      claudeChannelRuntimes: new Map(),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
      scheduleTimeout: () => 0,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const sourceAttach = await client.attachAgent({ kind: "claude", name: "source", cwd: "/repo" });
    const claudeToken = (sourceAttach as { ok: true; claudeChannelToken: string }).claudeChannelToken;
    // A notification back to this same Claude source is itself explicitly rejected
    // (non-2xx, not merely ambiguous). The reject core still commits this delivery's
    // own status transition before the non-recursion guard suppresses a further
    // outcome notification; the outer dispatch loop must not redundantly re-run that
    // transition and duplicate its delivery_status_changed event.
    vi.stubGlobal("fetch", async () => new Response("nope", { status: 500 }));
    await client.registerClaudeChannel({
      agentName: "source",
      token: claudeToken,
      endpoint: "http://127.0.0.1:18789/send",
    });
    await client.attachAgent({
      kind: "codex",
      name: "target",
      cwd: "/repo",
      resumeSessionId: "thread-target",
    });
    await client.connect({ sourceName: "source", targetNames: ["target"] });

    const sent = await client.receiveClaudeChannelMessage({
      agentName: "source",
      messageId: "message-claude-source-reject-recursion",
      content: { text: "please act" },
    });
    if (!sent.ok) throw new Error("expected a delivery");
    const originalDeliveryId = sent.deliveries[0]!.id;

    expect(deliveryStatus(db, originalDeliveryId)).toEqual({ status: "failed" });
    // Only the original delivery's own outcome notification exists -- the notification's
    // own rejected delivery does not author a second, recursive one.
    expect(
      db.prepare("select count(*) as count from delivery_outcome_notifications").get(),
    ).toEqual({ count: 1 });
    const relation = db
      .prepare(
        "select notification_delivery_id from delivery_outcome_notifications where original_delivery_id = ?",
      )
      .get(originalDeliveryId) as { notification_delivery_id: string };
    expect(deliveryStatus(db, relation.notification_delivery_id)).toEqual({ status: "failed" });
    // One `delivering` transition plus exactly one `failed` transition -- not a second,
    // redundant `failed` transition/event from the outer dispatch loop's generic fallback.
    const notificationStatusEvents = db
      .prepare("select data_json from events where type = 'delivery_status_changed' and delivery_id = ?")
      .all(relation.notification_delivery_id) as Array<{ data_json: string }>;
    expect(
      notificationStatusEvents.map((row) => (JSON.parse(row.data_json) as { status: string }).status),
    ).toEqual(["delivering", "failed"]);
  });

  it("disconnects a registered Claude channel and marks its agent disconnected when the daemon's own dispatch gets a confirmed ECONNREFUSED", async () => {
    vi.stubGlobal("fetch", async () => {
      throw Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    });
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-codex-source",
    });
    let id = 0;
    const claudeChannelRuntimes = new Map();
    const state = createDaemonState({
      db,
      createId: () => `id-${++id}`,
      now: () => "2026-08-13T00:00:00.000Z",
      claudeChannelRuntimes,
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
      scheduleTimeout: () => 0,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const sourceAttach = await client.attachAgent({
      kind: "codex",
      name: "source",
      cwd: "/repo",
      resumeSessionId: "thread-codex-source",
    });
    const sourceToken = (sourceAttach as { ok: true; codexChannelToken: string }).codexChannelToken;
    await client.registerCodexChannel({ agentName: "source", token: sourceToken });
    const targetAttach = await client.attachAgent({ kind: "claude", name: "target", cwd: "/repo" });
    const claudeToken = (targetAttach as { ok: true; claudeChannelToken: string }).claudeChannelToken;
    await client.registerClaudeChannel({
      agentName: "target",
      token: claudeToken,
      endpoint: "http://127.0.0.1:18789/send",
    });
    expect(claudeChannelRuntimes.has("target")).toBe(true);
    await client.connect({ sourceName: "source", targetNames: ["target"] });

    const sent = await client.receiveCodexMessage({
      agentName: "source",
      token: sourceToken,
      messageId: "message-confirmed-refusal",
      content: { text: "please act" },
    });
    if (!sent.ok) throw new Error("expected a delivery");

    // The registered runtime this dispatch actually pushed to must be gone, and
    // its agent's row (and routes) must be removed -- the same effect
    // `disconnectClaudeChannel` produces -- because ECONNREFUSED against a
    // runtime this function already confirmed was registered means the
    // endpoint is confirmed dead, not merely unregistered.
    expect(claudeChannelRuntimes.has("target")).toBe(false);
    const agentRow = db
      .prepare("select status from agents where name = 'target'")
      .get();
    expect(agentRow).toBeUndefined();
  });

  it("leaves a same-name Claude channel that re-registered mid-flight untouched by a stale confirmed ECONNREFUSED", async () => {
    let resolveFetch: (() => void) | undefined;
    const fetchGate = new Promise<void>((resolve) => {
      resolveFetch = resolve;
    });
    vi.stubGlobal("fetch", async () => {
      await fetchGate;
      throw Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    });
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-codex-source",
    });
    let id = 0;
    const claudeChannelRuntimes = new Map();
    const state = createDaemonState({
      db,
      createId: () => `id-${++id}`,
      now: () => "2026-08-13T00:00:00.000Z",
      claudeChannelRuntimes,
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
      scheduleTimeout: () => 0,
    });
    const client = createInProcessClient(createDaemonApi(state));

    const sourceAttach = await client.attachAgent({
      kind: "codex",
      name: "source",
      cwd: "/repo",
      resumeSessionId: "thread-codex-source",
    });
    const sourceToken = (sourceAttach as { ok: true; codexChannelToken: string }).codexChannelToken;
    await client.registerCodexChannel({ agentName: "source", token: sourceToken });
    const targetAttach = await client.attachAgent({ kind: "claude", name: "target", cwd: "/repo" });
    const claudeToken = (targetAttach as { ok: true; claudeChannelToken: string }).claudeChannelToken;
    await client.registerClaudeChannel({
      agentName: "target",
      token: claudeToken,
      endpoint: "http://127.0.0.1:18789/send",
    });
    await client.connect({ sourceName: "source", targetNames: ["target"] });

    const dispatched = client.receiveCodexMessage({
      agentName: "source",
      token: sourceToken,
      messageId: "message-race-guard",
      content: { text: "please act" },
    });

    // While the push above is still awaiting the gated fetch, the same-named agent
    // detaches and reattaches with a fresh Claude channel registration -- modeling a
    // reconnect that lands before the stale push's ECONNREFUSED resolves.
    await client.detachAgent({ agentName: "target" });
    const reattach = await client.attachAgent({ kind: "claude", name: "target", cwd: "/repo" });
    const freshToken = (reattach as { ok: true; claudeChannelToken: string }).claudeChannelToken;
    await client.registerClaudeChannel({
      agentName: "target",
      token: freshToken,
      endpoint: "http://127.0.0.1:18790/send",
    });
    const freshRuntime = claudeChannelRuntimes.get("target");
    expect(freshRuntime?.endpoint).toBe("http://127.0.0.1:18790/send");

    resolveFetch?.();
    const sent = await dispatched;
    if (!sent.ok) throw new Error("expected a delivery");

    // The stale push's confirmed refusal must not clobber the fresh registration.
    expect(claudeChannelRuntimes.get("target")).toBe(freshRuntime);
    const agentRow = db
      .prepare("select status from agents where name = 'target'")
      .get() as { status: string };
    expect(agentRow.status).toBe("connected");
  });

});

async function setupCodexSourceToClaudeTarget(
  db: Database,
): Promise<{ client: ReturnType<typeof createDaemonApi>; deliveryId: string }> {
  const runtime = fakeCodexRuntime({
    endpoint: "ws://127.0.0.1:54321/",
    startedThreadId: "thread-codex-source",
  });
  let id = 0;
  const state = createDaemonState({
    db,
    createId: () => `id-${++id}`,
    now: () => "2026-08-09T00:00:00.000Z",
    claudeChannelRuntimes: new Map(),
    codexRuntimes: new Map(),
    attachCodexRuntime: async () => runtime,
    scheduleTimeout: () => 0,
  });
  const client = createInProcessClient(createDaemonApi(state));

  const sourceAttach = await client.attachAgent({
    kind: "codex",
    name: "source",
    cwd: "/repo",
    resumeSessionId: "thread-codex-source",
  });
  const sourceToken = (sourceAttach as { ok: true; codexChannelToken: string }).codexChannelToken;
  await client.registerCodexChannel({ agentName: "source", token: sourceToken });
  const targetAttach = await client.attachAgent({ kind: "claude", name: "target", cwd: "/repo" });
  const claudeToken = (targetAttach as { ok: true; claudeChannelToken: string }).claudeChannelToken;
  await client.registerClaudeChannel({
    agentName: "target",
    token: claudeToken,
    endpoint: "http://127.0.0.1:18789/send",
  });
  await client.connect({ sourceName: "source", targetNames: ["target"] });

  const sent = await client.receiveCodexMessage({
    agentName: "source",
    token: sourceToken,
    messageId: "message-claude-primary-outcome",
    content: { text: "please act" },
  });
  if (!sent.ok) throw new Error("expected a delivery");
  return { client, deliveryId: sent.deliveries[0]!.id };
}

async function setupCrossAdapterUnconfirmedManualRetransmit(
  db: Database,
  codexRuntime: ReturnType<typeof fakeCodexRuntime>,
): Promise<{
  client: ReturnType<typeof createDaemonApi>;
  codexDeliveryId: string;
  claudeDeliveryId: string;
}> {
  let id = 0;
  const claudeChannelRuntimes = new Map();
  const state = createDaemonState({
    db,
    createId: () => `id-${++id}`,
    now: () => "2026-08-06T00:00:00.000Z",
    claudeChannelRuntimes,
    codexRuntimes: new Map(),
    attachCodexRuntime: async () => codexRuntime,
    scheduleTimeout: () => 0,
  });
  const client = createInProcessClient(createDaemonApi(state));

  await client.attachAgent({ kind: "claude", name: "source", cwd: "/repo" });
  const codexTargetAttach = await client.attachAgent({
    kind: "codex",
    name: "codex-target",
    cwd: "/repo",
    resumeSessionId: "thread-codex-target",
  });
  const claudeTargetAttach = await client.attachAgent({
    kind: "claude",
    name: "claude-target",
    cwd: "/repo",
  });
  const codexTargetId = (codexTargetAttach as { ok: true; agent: { id: string } }).agent.id;
  const claudeTargetId = (claudeTargetAttach as { ok: true; agent: { id: string } }).agent.id;
  const claudeToken = (claudeTargetAttach as { ok: true; claudeChannelToken: string })
    .claudeChannelToken;
  await client.registerClaudeChannel({
    agentName: "claude-target",
    token: claudeToken,
    endpoint: "http://127.0.0.1:18789/send",
  });

  await client.connect({ sourceName: "source", targetNames: ["codex-target", "claude-target"] });
  const sent = await client.sendMessage({
    sourceName: "source",
    messageId: "message-cross-adapter",
    type: "instruction",
    content: "duplicate risk",
  });
  if (!sent.ok) throw new Error("expected fan-out deliveries");
  const codexDeliveryId = sent.deliveries.find(
    (delivery) => delivery.targetAgentId === codexTargetId,
  )!.id;
  const claudeDeliveryId = sent.deliveries.find(
    (delivery) => delivery.targetAgentId === claudeTargetId,
  )!.id;
  await client.updateDeliveryStatus({ deliveryId: codexDeliveryId, status: "unconfirmed" });
  await client.updateDeliveryStatus({ deliveryId: claudeDeliveryId, status: "unconfirmed" });

  return { client, codexDeliveryId, claudeDeliveryId };
}

async function setupUnconfirmedManualRetransmitClaude(
  db: Database,
  options: { register?: boolean } = {},
): Promise<{ client: ReturnType<typeof createDaemonApi>; deliveryId: string }> {
  const register = options.register ?? true;
  let id = 0;
  const claudeChannelRuntimes = new Map();
  const state = createDaemonState({
    db,
    createId: () => `id-${++id}`,
    now: () => "2026-07-20T00:00:00.000Z",
    claudeChannelRuntimes,
    scheduleTimeout: () => 0,
  });
  const client = createInProcessClient(createDaemonApi(state));
  await client.attachAgent({ kind: "codex", name: "source", cwd: "/repo" });
  const targetAttach = await client.attachAgent({ kind: "claude", name: "target", cwd: "/repo" });
  if (register) {
    const claudeToken = (targetAttach as { ok: true; claudeChannelToken: string })
      .claudeChannelToken;
    vi.stubGlobal("fetch", async () => new Response("{}", { status: 202 }));
    await client.registerClaudeChannel({
      agentName: "target",
      token: claudeToken,
      endpoint: "http://127.0.0.1:18789/send",
    });
  }
  await client.connect({ sourceName: "source", targetNames: ["target"] });
  const sent = await client.sendMessage({
    sourceName: "source",
    messageId: "message-manual-claude",
    type: "instruction",
    content: "duplicate risk",
  });
  if (!sent.ok) throw new Error("expected delivery");
  const deliveryId = sent.deliveries[0]!.id;
  await client.updateDeliveryStatus({ deliveryId, status: "unconfirmed" });
  return { client, deliveryId };
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
      throw new Error("unexpected now request");
    }

    return value;
  };
}

function fakeRuntime(state: "starting" | "ready") {
  return {
    state,
    disposeCalls: 0,
    async dispose() {
      this.disposeCalls += 1;
      this.state = "disposed" as typeof this.state;
    },
  };
}

function fakeCodexRuntime(options: {
  endpoint: string;
  startedThreadId?: string;
  resumedThreadId?: string;
  turnStartError?: Error;
  turnStartTimeout?: boolean;
}) {
  const requests: Array<{ method: string; params: unknown; options: unknown }> = [];
  let capturedLateResponse: ((response: unknown) => void) | undefined;
  return {
    state: "ready" as const,
    endpoint: new URL(options.endpoint),
    activeThreadId: null as string | null,
    startThreadCalls: 0,
    resumeThreadCalls: [] as string[],
    disposeCalls: 0,
    requests,
    // Deliver a late same-requestId response to whatever onLateResponse the
    // injector registered on the most recent turn/start (models the websocket
    // late-response observer for tests that use turnStartTimeout).
    fireLateResponse(response: unknown) {
      capturedLateResponse?.(response);
    },
    async requestCodex(method: string, params?: unknown, requestOptions?: unknown) {
      requests.push({ method, params, options: requestOptions });
      if (method === "thread/loaded/list") {
        return { data: this.activeThreadId ? [this.activeThreadId] : [] };
      }
      if (method === "turn/start") {
        const onLateResponse = (requestOptions as { onLateResponse?: (r: unknown) => void } | undefined)
          ?.onLateResponse;
        if (onLateResponse) capturedLateResponse = onLateResponse;
        if (options.turnStartTimeout) {
          throw new CodexAppServerWebSocketError("codex_turn_start_timeout", "turn/start timed out");
        }
        if (options.turnStartError) {
          throw options.turnStartError;
        }
      }
      return { turn: { id: "turn-1", status: "inProgress" } };
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
      return this.activeThreadId ? [this.activeThreadId] : [];
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

async function setupUnconfirmedManualRetransmit(
  db: Database,
  runtime: ReturnType<typeof fakeCodexRuntime>,
): Promise<{ client: ReturnType<typeof createDaemonApi>; deliveryId: string }> {
  let id = 0;
  const state = createDaemonState({
    db,
    createId: () => `id-${++id}`,
    now: () => "2026-07-20T00:00:00.000Z",
    codexRuntimes: new Map(),
    attachCodexRuntime: async () => runtime,
  });
  const client = createInProcessClient(createDaemonApi(state));
  await client.attachAgent({ kind: "claude", name: "source", cwd: "/repo" });
  await client.attachAgent({
    kind: "codex",
    name: "target",
    cwd: "/repo",
    resumeSessionId: "thread-target",
  });
  await client.connect({ sourceName: "source", targetNames: ["target"] });
  const sent = await client.sendMessage({
    sourceName: "source",
    messageId: "message-manual",
    type: "instruction",
    content: "duplicate risk",
  });
  if (!sent.ok) throw new Error("expected delivery");
  const deliveryId = sent.deliveries[0]!.id;
  await client.updateDeliveryStatus({ deliveryId, status: "unconfirmed" });
  return { client, deliveryId };
}

function deliveryStatus(db: Database, deliveryId: string) {
  return db.prepare("select status from message_deliveries where id = ?").get(deliveryId);
}

function manualEventCount(db: Database, type: string): number {
  return (
    db.prepare("select count(*) as count from events where type = ?").get(type) as {
      count: number;
    }
  ).count;
}

function manualEventCountForDelivery(db: Database, type: string, deliveryId: string): number {
  return (
    db
      .prepare("select count(*) as count from events where type = ? and delivery_id = ?")
      .get(type, deliveryId) as {
      count: number;
    }
  ).count;
}

function manualEventData(db: Database, type: string): Record<string, unknown> | undefined {
  const row = db.prepare("select data_json from events where type = ?").get(type) as
    | { data_json: string }
    | undefined;
  return row ? (JSON.parse(row.data_json) as Record<string, unknown>) : undefined;
}

function outcomeNotificationCount(db: Database): number {
  return (
    db.prepare("select count(*) as count from delivery_outcome_notifications").get() as {
      count: number;
    }
  ).count;
}

function outcomeRelationCount(db: Database, deliveryId: string): number {
  return (
    db
      .prepare("select count(*) as count from messages where outcome_for_delivery_id = ?")
      .get(deliveryId) as { count: number }
  ).count;
}

function replyRightCount(db: Database, deliveryId: string): number {
  return (
    db
      .prepare("select count(*) as count from reply_rights where originating_delivery_id = ?")
      .get(deliveryId) as { count: number }
  ).count;
}
