import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAdapterRouter, type AdapterDispatchResult } from "../../../src/adapters/router.js";
import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";
import { createFakeAgentAdapter } from "../../fixtures/fake-adapter.js";

interface DeliveryRow {
  id: string;
  message_id: string;
  target_agent_id: string;
  route_id: string | null;
  status: string;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

interface EventRow {
  id: string;
  agent_id: string | null;
  message_id: string | null;
  delivery_id: string | null;
  route_id: string | null;
  type: string;
  data_json: string;
  created_at: string;
}

describe("fake adapter integration", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("captures source outgoing and target inject separately through a reply round-trip", async () => {
    const ids = [
      "agent-codex",
      "agent-claude",
      "route-codex-claude",
      "route-claude-codex",
      "event-message-1",
      "event-queued-1",
      "event-delivering-1",
      "event-delivered-1",
      "event-message-2",
      "event-queued-2",
      "event-delivering-2",
      "event-delivered-2",
    ];
    const api = createDaemonApi(
      createDaemonState({
        db,
        createId: () => shiftId(ids),
        createPublicDeliveryId: createOpaqueIdFactory([
          "opaque delivery id: first",
          "opaque delivery id: reply",
        ]),
        now: () => "2026-05-19T00:00:00.000Z",
      }),
    );
    const codex = createFakeAgentAdapter("codex");
    const claude = createFakeAgentAdapter("claude");
    const router = createAdapterRouter({ api, adapters: [codex, claude] });

    await api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await api.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
    await api.connect({ sourceName: "impl", targetNames: ["reviewer"] });
    await api.connect({ sourceName: "reviewer", targetNames: ["impl"] });

    const firstOutgoing = codex.sendOutgoing({
      sourceName: "impl",
      messageId: "message-1",
      type: "instruction",
      intent: "delegation",
      replyExpected: true,
      content: "please review",
    });

    const firstDispatch = await router.dispatchOutgoing(firstOutgoing);
    expect(firstDispatch).toEqual({
      ok: true,
      deliveries: [
        {
          deliveryId: "opaque delivery id: first",
          targetAgentName: "reviewer",
          ok: true,
        },
      ],
    });
    expect(codex.outgoing).toEqual([firstOutgoing]);
    expect(claude.injections).toHaveLength(1);
    expect(claude.injections[0]?.message).toEqual({
      id: "message-1",
      sourceAgentId: "agent-codex",
      parentMessageId: null,
      type: "instruction",
      intent: "delegation",
      replyExpected: true,
      content: "please review",
    });
    expect(successfulDeliveries(firstDispatch)[0]?.deliveryId).toBe(claude.injections[0]?.delivery.id);

    const replyOutgoing = claude.sendOutgoing({
      sourceName: "reviewer",
      messageId: "message-2",
      type: "reply",
      intent: "result",
      replyExpected: false,
      content: "review complete",
    });

    const replyDispatch = await router.dispatchOutgoing(replyOutgoing);
    expect(replyDispatch).toEqual({
      ok: true,
      deliveries: [
        {
          deliveryId: "opaque delivery id: reply",
          targetAgentName: "impl",
          ok: true,
        },
      ],
    });
    expect(claude.outgoing).toEqual([replyOutgoing]);
    expect(codex.injections).toHaveLength(1);
    expect(codex.injections[0]?.message).toEqual({
      id: "message-2",
      sourceAgentId: "agent-claude",
      parentMessageId: null,
      type: "reply",
      intent: "result",
      replyExpected: false,
      content: "review complete",
    });
    expect(successfulDeliveries(replyDispatch)[0]?.deliveryId).toBe(codex.injections[0]?.delivery.id);
    expect(readDeliveries(db)).toEqual([
      {
        id: "opaque delivery id: first",
        message_id: "message-1",
        target_agent_id: "agent-claude",
        route_id: "route-codex-claude",
        status: "delivered",
        idempotency_key: "message-1:agent-claude",
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      },
      {
        id: "opaque delivery id: reply",
        message_id: "message-2",
        target_agent_id: "agent-codex",
        route_id: "route-claude-codex",
        status: "delivered",
        idempotency_key: "message-2:agent-codex",
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      },
    ]);
    expect(successfulDeliveries(firstDispatch)[0]?.deliveryId).toBe(readDeliveries(db)[0]?.id);
    expect(successfulDeliveries(replyDispatch)[0]?.deliveryId).toBe(readDeliveries(db)[1]?.id);
  });

  it("marks only failed target deliveries failed while other targets complete", async () => {
    const ids = [
      "agent-codex",
      "agent-reviewer",
      "agent-blocked",
      "route-one",
      "route-two",
      "event-message",
      "event-queued-one",
      "event-queued-two",
      "event-delivering-one",
      "event-delivered-one",
      "event-delivering-two",
      "event-failed-two",
    ];
    const api = createDaemonApi(
      createDaemonState({
        db,
        createId: () => shiftId(ids),
        createPublicDeliveryId: createOpaqueIdFactory([
          "opaque delivery id: succeeded",
          "opaque delivery id: failed",
        ]),
        now: () => "2026-05-19T00:00:00.000Z",
      }),
    );
    const codex = createFakeAgentAdapter("codex");
    const claude = createFakeAgentAdapter("claude", {
      failInjectForAgentNames: ["blocked"],
    });
    const router = createAdapterRouter({ api, adapters: [codex, claude] });

    await api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await api.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
    await api.attachAgent({ kind: "claude", name: "blocked", cwd: "/repo" });
    await api.connect({ sourceName: "impl", targetNames: ["reviewer", "blocked"] });

    const outgoing = codex.sendOutgoing({
      sourceName: "impl",
      messageId: "message-1",
      type: "instruction",
      content: "please review",
    });

    const dispatch = await router.dispatchOutgoing(outgoing);
    expect(dispatch).toEqual({
      ok: true,
      deliveries: [
        {
          deliveryId: "opaque delivery id: succeeded",
          targetAgentName: "reviewer",
          ok: true,
        },
        {
          deliveryId: "opaque delivery id: failed",
          targetAgentName: "blocked",
          ok: false,
          reason: "adapter_inject_failed",
          message: "fake claude inject failed for blocked",
        },
      ],
    });
    expect(claude.injections.map((input) => input.targetAgent.name)).toEqual([
      "reviewer",
      "blocked",
    ]);
    expect(successfulDeliveries(dispatch).map((delivery) => delivery.deliveryId)).toEqual(
      claude.injections.map((injection) => injection.delivery.id),
    );
    expect(readDeliveries(db).map((delivery) => [delivery.id, delivery.status])).toEqual([
      ["opaque delivery id: failed", "failed"],
      ["opaque delivery id: succeeded", "delivered"],
    ]);
    expect(new Set(successfulDeliveries(dispatch).map((delivery) => delivery.deliveryId))).toEqual(
      new Set(readDeliveries(db).map((delivery) => delivery.id)),
    );
    expect(readEvents(db)).toEqual([
      {
        id: "event-message",
        agent_id: "agent-codex",
        message_id: "message-1",
        delivery_id: null,
        route_id: null,
        type: "message_created",
        data_json: "{}",
        created_at: "2026-05-19T00:00:00.000Z",
      },
      {
        id: "event-queued-one",
        agent_id: null,
        message_id: "message-1",
        delivery_id: "opaque delivery id: succeeded",
        route_id: "route-one",
        type: "delivery_queued",
        data_json: "{}",
        created_at: "2026-05-19T00:00:00.000Z",
      },
      {
        id: "event-queued-two",
        agent_id: null,
        message_id: "message-1",
        delivery_id: "opaque delivery id: failed",
        route_id: "route-two",
        type: "delivery_queued",
        data_json: "{}",
        created_at: "2026-05-19T00:00:00.000Z",
      },
      {
        id: "event-delivering-one",
        agent_id: "agent-reviewer",
        message_id: "message-1",
        delivery_id: "opaque delivery id: succeeded",
        route_id: "route-one",
        type: "delivery_status_changed",
        data_json: "{\"status\":\"delivering\"}",
        created_at: "2026-05-19T00:00:00.000Z",
      },
      {
        id: "event-delivered-one",
        agent_id: "agent-reviewer",
        message_id: "message-1",
        delivery_id: "opaque delivery id: succeeded",
        route_id: "route-one",
        type: "delivery_status_changed",
        data_json: "{\"status\":\"delivered\"}",
        created_at: "2026-05-19T00:00:00.000Z",
      },
      {
        id: "event-delivering-two",
        agent_id: "agent-blocked",
        message_id: "message-1",
        delivery_id: "opaque delivery id: failed",
        route_id: "route-two",
        type: "delivery_status_changed",
        data_json: "{\"status\":\"delivering\"}",
        created_at: "2026-05-19T00:00:00.000Z",
      },
      {
        id: "event-failed-two",
        agent_id: "agent-blocked",
        message_id: "message-1",
        delivery_id: "opaque delivery id: failed",
        route_id: "route-two",
        type: "delivery_status_changed",
        data_json:
          "{\"status\":\"failed\",\"error\":{\"reason\":\"adapter_inject_failed\",\"message\":\"fake claude inject failed for blocked\"}}",
        created_at: "2026-05-19T00:00:00.000Z",
      },
    ]);
  });

  it("dispatches a Codex-Codex pair message to the receiver adapter injection", async () => {
    const ids = [
      "pair-1",
      "agent-codex-a",
      "agent-codex-b",
      "route-codex-b-codex-a",
      "route-codex-a-codex-b",
      "event-message",
      "event-queued",
      "event-delivering",
      "event-delivered",
      "event-completed",
    ];
    const api = createDaemonApi(
      createDaemonState({
        db,
        createId: () => shiftId(ids),
        createPublicDeliveryId: () => "opaque delivery id: codex pair",
        now: () => "2026-05-19T00:00:00.000Z",
      }),
    );
    const codex = createFakeAgentAdapter("codex");
    const router = createAdapterRouter({ api, adapters: [codex] });

    await api.createPair({ name: "same-vendor" });
    expect(
      await api.attachAgent({
        kind: "codex",
        name: "impl-a",
        cwd: "/repo",
        pairName: "same-vendor",
      }),
    ).toMatchObject({ ok: true });
    expect(
      await api.attachAgent({
        kind: "codex",
        name: "impl-b",
        cwd: "/repo",
        pairName: "same-vendor",
      }),
    ).toMatchObject({ ok: true });

    const outgoing = codex.sendOutgoing({
      sourceName: "impl-a",
      messageId: "message-1",
      type: "instruction",
      content: "please continue",
    });

    const dispatch = await router.dispatchOutgoing(outgoing);
    expect(dispatch).toEqual({
      ok: true,
      deliveries: [
        {
          deliveryId: "opaque delivery id: codex pair",
          targetAgentName: "impl-b",
          ok: true,
        },
      ],
    });
    expect(codex.injections.map((input) => input.targetAgent.name)).toEqual([
      "impl-b",
    ]);
    expect(successfulDeliveries(dispatch)[0]?.deliveryId).toBe(codex.injections[0]?.delivery.id);
    expect(successfulDeliveries(dispatch)[0]?.deliveryId).toBe(readDeliveries(db)[0]?.id);
  });

  it("dispatches a Claude-Claude pair message to the receiver adapter injection", async () => {
    const ids = [
      "pair-1",
      "agent-claude-a",
      "agent-claude-b",
      "route-claude-b-claude-a",
      "route-claude-a-claude-b",
      "event-message",
      "event-queued",
      "event-delivering",
      "event-delivered",
      "event-completed",
    ];
    const api = createDaemonApi(
      createDaemonState({
        db,
        createId: () => shiftId(ids),
        createPublicDeliveryId: () => "opaque delivery id: claude pair",
        now: () => "2026-05-19T00:00:00.000Z",
      }),
    );
    const claude = createFakeAgentAdapter("claude");
    const router = createAdapterRouter({ api, adapters: [claude] });

    await api.createPair({ name: "same-vendor" });
    expect(
      await api.attachAgent({
        kind: "claude",
        name: "review-a",
        cwd: "/repo",
        pairName: "same-vendor",
      }),
    ).toMatchObject({ ok: true });
    expect(
      await api.attachAgent({
        kind: "claude",
        name: "review-b",
        cwd: "/repo",
        pairName: "same-vendor",
      }),
    ).toMatchObject({ ok: true });

    const outgoing = claude.sendOutgoing({
      sourceName: "review-a",
      messageId: "message-1",
      type: "question",
      content: "please review",
    });

    const dispatch = await router.dispatchOutgoing(outgoing);
    expect(dispatch).toEqual({
      ok: true,
      deliveries: [
        {
          deliveryId: "opaque delivery id: claude pair",
          targetAgentName: "review-b",
          ok: true,
        },
      ],
    });
    expect(claude.injections.map((input) => input.targetAgent.name)).toEqual([
      "review-b",
    ]);
    expect(successfulDeliveries(dispatch)[0]?.deliveryId).toBe(claude.injections[0]?.delivery.id);
    expect(successfulDeliveries(dispatch)[0]?.deliveryId).toBe(readDeliveries(db)[0]?.id);
  });

  it("normalizes a missing target adapter as a deferred adapter-not-registered dispatch result", async () => {
    const ids = [
      "agent-codex",
      "agent-claude",
      "route-codex-claude",
      "event-message",
      "event-queued",
      "event-delivering",
      "event-failed",
    ];
    const api = createDaemonApi(
      createDaemonState({
        db,
        createId: () => shiftId(ids),
        createPublicDeliveryId: () => "opaque delivery id: missing adapter",
        now: () => "2026-05-19T00:00:00.000Z",
      }),
    );
    const codex = createFakeAgentAdapter("codex");
    const router = createAdapterRouter({ api, adapters: [codex] });

    await api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await api.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
    await api.connect({ sourceName: "impl", targetNames: ["reviewer"] });

    const outgoing = codex.sendOutgoing({
      sourceName: "impl",
      messageId: "message-1",
      type: "instruction",
      content: "please review",
    });

    const dispatch = await router.dispatchOutgoing(outgoing);
    expect(dispatch).toEqual({
      ok: true,
      deliveries: [
        {
          deliveryId: "opaque delivery id: missing adapter",
          targetAgentName: "reviewer",
          kind: "deferred",
          reason: "target_adapter_not_registered",
        },
      ],
    });
    expect(readDeliveries(db)).toMatchObject([
      {
        id: "opaque delivery id: missing adapter",
        status: "queued",
      },
    ]);
    expect(successfulDeliveries(dispatch)[0]?.deliveryId).toBe(readDeliveries(db)[0]?.id);
  });

  it("leaves delivery queued when a registered adapter defers injection", async () => {
    const ids = [
      "agent-codex",
      "agent-claude",
      "route-codex-claude",
      "event-message",
      "event-queued",
      "event-delivering",
      "event-queued-again",
    ];
    const api = createDaemonApi(
      createDaemonState({
        db,
        createId: () => shiftId(ids),
        createPublicDeliveryId: () => "opaque delivery id: deferred adapter",
        now: () => "2026-05-19T00:00:00.000Z",
      }),
    );
    const codex = createFakeAgentAdapter("codex");
    const claude = createFakeAgentAdapter("claude", {
      deferInjectForAgentNames: ["reviewer"],
    });
    const router = createAdapterRouter({ api, adapters: [codex, claude] });

    await api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await api.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
    await api.connect({ sourceName: "impl", targetNames: ["reviewer"] });

    const outgoing = codex.sendOutgoing({
      sourceName: "impl",
      messageId: "message-1",
      type: "instruction",
      content: "please review",
    });

    const dispatch = await router.dispatchOutgoing(outgoing);
    expect(dispatch).toEqual({
      ok: true,
      deliveries: [
        {
          deliveryId: "opaque delivery id: deferred adapter",
          targetAgentName: "reviewer",
          kind: "deferred",
          reason: "target_runtime_unavailable",
          eligibility: "fake claude runtime for reviewer",
        },
      ],
    });
    expect(readDeliveries(db)).toMatchObject([
      {
        id: "opaque delivery id: deferred adapter",
        status: "queued",
      },
    ]);
    expect(successfulDeliveries(dispatch)[0]?.deliveryId).toBe(claude.injections[0]?.delivery.id);
    expect(successfulDeliveries(dispatch)[0]?.deliveryId).toBe(readDeliveries(db)[0]?.id);
  });

  it("returns nested dispatch counts from sendMessage after storing the message", async () => {
    const ids = [
      "agent-codex",
      "agent-claude",
      "route-1",
      "delivery-1",
      "event-message",
      "event-queued",
    ];
    const api = createDaemonApi(
      createDaemonState({
        db,
        createId: () => shiftId(ids),
        now: () => "2026-05-19T00:00:00.000Z",
      }),
    );

    await api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await api.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
    api.connect({ sourceName: "impl", targetNames: ["reviewer"] });

    expect(
      api.sendMessage({
        sourceName: "impl",
        messageId: "message-1",
        type: "instruction",
        content: "please review",
      }),
    ).toMatchObject({
      ok: true,
      messageId: "message-1",
      dispatch: {
        delivered: expect.any(Number),
        deferred: expect.any(Array),
        failed: expect.any(Array),
      },
    });
  });
});

function shiftId(ids: string[]): string {
  const id = ids.shift();

  if (!id) {
    throw new Error("unexpected id request");
  }

  return id;
}

function createOpaqueIdFactory(ids: string[]): () => string {
  return () => shiftId(ids);
}

function successfulDeliveries(result: AdapterDispatchResult) {
  if (!result.ok) {
    throw new Error(`expected successful dispatch, received ${result.reason}`);
  }
  return result.deliveries;
}

function readDeliveries(db: Database): DeliveryRow[] {
  return db
    .prepare("select * from message_deliveries order by created_at, id")
    .all() as DeliveryRow[];
}

function readEvents(db: Database): EventRow[] {
  return db.prepare("select * from events order by rowid").all() as EventRow[];
}
