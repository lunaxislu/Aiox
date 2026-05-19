import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAdapterRouter } from "../../../src/adapters/router.js";
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
      "delivery-claude",
      "event-message-1",
      "event-queued-1",
      "event-delivering-1",
      "event-delivered-1",
      "event-completed-1",
      "delivery-codex",
      "event-message-2",
      "event-queued-2",
      "event-delivering-2",
      "event-delivered-2",
      "event-completed-2",
    ];
    const api = createDaemonApi(
      createDaemonState({
        db,
        createId: () => shiftId(ids),
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
      content: "please review",
    });

    expect(await router.dispatchOutgoing(firstOutgoing)).toEqual({
      ok: true,
      deliveries: [
        {
          deliveryId: "delivery-claude",
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
      content: "please review",
    });

    const replyOutgoing = claude.sendOutgoing({
      sourceName: "reviewer",
      messageId: "message-2",
      type: "reply",
      content: "review complete",
    });

    expect(await router.dispatchOutgoing(replyOutgoing)).toEqual({
      ok: true,
      deliveries: [
        {
          deliveryId: "delivery-codex",
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
      content: "review complete",
    });
    expect(readDeliveries(db)).toEqual([
      {
        id: "delivery-claude",
        message_id: "message-1",
        target_agent_id: "agent-claude",
        route_id: "route-codex-claude",
        status: "completed",
        idempotency_key: "message-1:agent-claude",
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      },
      {
        id: "delivery-codex",
        message_id: "message-2",
        target_agent_id: "agent-codex",
        route_id: "route-claude-codex",
        status: "completed",
        idempotency_key: "message-2:agent-codex",
        created_at: "2026-05-19T00:00:00.000Z",
        updated_at: "2026-05-19T00:00:00.000Z",
      },
    ]);
  });
});

function shiftId(ids: string[]): string {
  const id = ids.shift();

  if (!id) {
    throw new Error("unexpected id request");
  }

  return id;
}

function readDeliveries(db: Database): DeliveryRow[] {
  return db
    .prepare("select * from message_deliveries order by created_at, id")
    .all() as DeliveryRow[];
}
