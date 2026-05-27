import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";

interface MessageRow {
  id: string;
  source_agent_id: string;
  parent_message_id: string | null;
  type: string;
  content: string;
  created_at: string;
  updated_at: string;
}

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

describe("daemon message fan-out store persistence", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("persists one message, one queued delivery per active source route, and fan-out events", async () => {
    const ids = [
      "agent-source",
      "agent-one",
      "agent-two",
      "agent-three",
      "route-one",
      "route-two",
      "delivery-one",
      "delivery-two",
      "event-1-message",
      "event-2-delivery-one",
      "event-3-delivery-two",
    ];
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
    await client.attachAgent({ kind: "claude", name: "observer", cwd: "/repo" });
    await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer", "researcher"],
    });

    expect(
      await client.sendMessage({
        sourceName: "impl",
        messageId: "message-1",
        type: "instruction",
        content: "please review this change",
      }),
    ).toEqual({
      ok: true,
      messageId: "message-1",
      message: {
        id: "message-1",
        sourceAgentId: "agent-source",
        parentMessageId: null,
        type: "instruction",
        content: "please review this change",
      },
      deliveries: [
        {
          id: "delivery-one",
          messageId: "message-1",
          targetAgentId: "agent-one",
          routeId: "route-one",
          status: "queued",
          idempotencyKey: "message-1:agent-one",
        },
        {
          id: "delivery-two",
          messageId: "message-1",
          targetAgentId: "agent-two",
          routeId: "route-two",
          status: "queued",
          idempotencyKey: "message-1:agent-two",
        },
      ],
      dispatch: {
        delivered: 0,
        deferred: [],
        failed: [],
      },
    });
    expect(readMessages(db)).toEqual([
      {
        id: "message-1",
        source_agent_id: "agent-source",
        parent_message_id: null,
        type: "instruction",
        content: "please review this change",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
    ]);
    expect(readDeliveries(db)).toEqual([
      {
        id: "delivery-one",
        message_id: "message-1",
        target_agent_id: "agent-one",
        route_id: "route-one",
        status: "queued",
        idempotency_key: "message-1:agent-one",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
      {
        id: "delivery-two",
        message_id: "message-1",
        target_agent_id: "agent-two",
        route_id: "route-two",
        status: "queued",
        idempotency_key: "message-1:agent-two",
        created_at: "2026-05-18T00:00:00.000Z",
        updated_at: "2026-05-18T00:00:00.000Z",
      },
    ]);
    expect(readEvents(db)).toEqual([
      {
        id: "event-1-message",
        agent_id: "agent-source",
        message_id: "message-1",
        delivery_id: null,
        route_id: null,
        type: "message_created",
        data_json: "{}",
        created_at: "2026-05-18T00:00:00.000Z",
      },
      {
        id: "event-2-delivery-one",
        agent_id: null,
        message_id: "message-1",
        delivery_id: "delivery-one",
        route_id: "route-one",
        type: "delivery_queued",
        data_json: "{}",
        created_at: "2026-05-18T00:00:00.000Z",
      },
      {
        id: "event-3-delivery-two",
        agent_id: null,
        message_id: "message-1",
        delivery_id: "delivery-two",
        route_id: "route-two",
        type: "delivery_queued",
        data_json: "{}",
        created_at: "2026-05-18T00:00:00.000Z",
      },
    ]);
  });

  it("rejects messages from a source with no active routes without inserting rows", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-source",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    expect(
      await client.sendMessage({
        sourceName: "impl",
        messageId: "message-1",
        type: "instruction",
        content: "please review this change",
      }),
    ).toEqual({
      ok: false,
      reason: "no_active_routes",
    });
    expect(readMessages(db)).toEqual([]);
    expect(readDeliveries(db)).toEqual([]);
    expect(readEvents(db)).toEqual([]);
  });
});

function readMessages(db: Database): MessageRow[] {
  return db.prepare("select * from messages order by created_at, id").all() as MessageRow[];
}

function readDeliveries(db: Database): DeliveryRow[] {
  return db
    .prepare("select * from message_deliveries order by created_at, id")
    .all() as DeliveryRow[];
}

function readEvents(db: Database): EventRow[] {
  return db.prepare("select * from events order by created_at, id").all() as EventRow[];
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
