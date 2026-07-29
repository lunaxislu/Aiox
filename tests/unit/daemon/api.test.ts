import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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
    expect((await client.status()).agents[0].status).toBe("disconnected");
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

  it("disconnects existing routes and ignores absent routes between existing agents", async () => {
    const ids = ["agent-source", "agent-one", "agent-two", "route-one"];
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
    await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer"],
    });

    const response = await client.disconnect({
      sourceName: "impl",
      targetNames: ["reviewer", "researcher"],
    });

    expect(response).toEqual({
      ok: true,
      removed: [
        {
          id: "route-one",
          sourceAgentId: "agent-source",
          targetAgentId: "agent-one",
          status: "active",
        },
      ],
    });
    expect(db.prepare("select id from routes").all()).toEqual([]);
  });

  it("rejects disconnect when the source or any target agent does not exist", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-one",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });

    expect(
      await client.disconnect({
        sourceName: "impl",
        targetNames: ["reviewer"],
      }),
    ).toEqual({
      ok: false,
      reason: "source_agent_not_found",
      sourceName: "impl",
    });
    expect(
      await client.disconnect({
        sourceName: "reviewer",
        targetNames: ["missing"],
      }),
    ).toEqual({
      ok: false,
      reason: "target_agent_not_found",
      missing: ["missing"],
    });
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

    expect(await client.stop({})).toEqual({
      ok: true,
      stoppedAgents: [
        {
          id: "agent-source",
          name: "impl",
          kind: "codex",
          status: "disconnected",
          cwd: "/repo",
          pairId: null,
        },
        {
          id: "agent-target",
          name: "reviewer",
          kind: "claude",
          status: "disconnected",
          cwd: "/repo",
          pairId: null,
        },
      ],
    });
    expect((await client.status()).agents.map((agent) => agent.status)).toEqual([
      "disconnected",
      "disconnected",
    ]);
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
    expect((await client.status()).agents[0].status).toBe("disconnected");
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

  it("detaches a ready agent by disposing runtime, preserving adapter session id, and emitting a graceful event", async () => {
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
    expect(
      db.prepare("select status, adapter_session_id from agents where name = ?").get(
        "impl",
      ),
    ).toEqual({
      status: "disconnected",
      adapter_session_id: "thread-1",
    });
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
    expect((await client.status()).agents[0].status).toBe("disconnected");
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
