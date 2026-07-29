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

describe("daemon message delivery idempotency store persistence", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("rejects duplicate message-target delivery without adding message, delivery, or event rows", async () => {
    const ids = [
      "agent-source",
      "agent-one",
      "agent-two",
      "route-one",
      "event-1-message",
      "event-2-delivery-one",
      "route-two",
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
      createPublicDeliveryId: () => "opaque delivery id: existing",
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
    await client.sendMessage({
      sourceName: "impl",
      messageId: "message-1",
      type: "instruction",
      content: "please review this change",
    });
    await client.connect({
      sourceName: "impl",
      targetNames: ["researcher"],
    });

    const messagesBefore = readMessages(db);
    const deliveriesBefore = readDeliveries(db);
    const eventsBefore = readEvents(db);

    expect(
      await client.sendMessage({
        sourceName: "impl",
        messageId: "message-1",
        type: "instruction",
        content: "please review this change again",
      }),
    ).toEqual({
      ok: false,
      reason: "delivery_idempotency_key_exists",
      existing: {
        id: "opaque delivery id: existing",
        messageId: "message-1",
        targetAgentId: "agent-one",
        routeId: "route-one",
        status: "queued",
        idempotencyKey: "message-1:agent-one",
      },
    });
    expect(readMessages(db)).toEqual(messagesBefore);
    expect(readDeliveries(db)).toEqual(deliveriesBefore);
    expect(readEvents(db)).toEqual(eventsBefore);
    expect(readDeliveries(db)).toHaveLength(1);
    expect(readDeliveries(db)[0]?.target_agent_id).toBe("agent-one");
  });

  it("reclassifies duplicate message id races as typed idempotency responses", async () => {
    const ids = [
      "agent-source",
      "agent-one",
      "agent-two",
      "route-one",
      "event-1-message",
      "event-2-delivery-one",
      "route-two",
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
      createPublicDeliveryId: () => "opaque delivery id: existing",
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
    await client.sendMessage({
      sourceName: "impl",
      messageId: "message-1",
      type: "instruction",
      content: "please review this change",
    });
    await client.disconnect({
      sourceName: "impl",
      targetNames: ["reviewer"],
    });
    await client.connect({
      sourceName: "impl",
      targetNames: ["researcher"],
    });

    const messagesBefore = readMessages(db);
    const deliveriesBefore = readDeliveries(db);
    const eventsBefore = readEvents(db);

    expect(
      await client.sendMessage({
        sourceName: "impl",
        messageId: "message-1",
        type: "instruction",
        content: "same logical message on a changed route set",
      }),
    ).toEqual({
      ok: false,
      reason: "delivery_idempotency_key_exists",
      existing: {
        id: "opaque delivery id: existing",
        messageId: "message-1",
        targetAgentId: "agent-one",
        routeId: "route-one",
        status: "queued",
        idempotencyKey: "message-1:agent-one",
      },
    });
    expect(readMessages(db)).toEqual(messagesBefore);
    expect(readDeliveries(db)).toEqual(deliveriesBefore);
    expect(readEvents(db)).toEqual(eventsBefore);
  });

  it("rolls back message rows when delivery idempotency fails inside the transaction", async () => {
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
      createPublicDeliveryId: () => "opaque delivery id: new",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
    await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer"],
    });
    db.exec(`
      create trigger inject_delivery_idempotency_race
      after insert on messages
      when new.id = 'message-race'
      begin
        insert into message_deliveries (
          id,
          message_id,
          target_agent_id,
          route_id,
          status,
          idempotency_key,
          created_at,
          updated_at
        ) values (
          'race-existing',
          'seed-message',
          'agent-one',
          'route-one',
          'queued',
          'message-race:agent-one',
          '2026-05-18T00:00:00.000Z',
          '2026-05-18T00:00:00.000Z'
        );
      end
    `);

    const messagesBefore = readMessages(db);
    const deliveriesBefore = readDeliveries(db);
    const eventsBefore = readEvents(db);

    expect(
      await client.sendMessage({
        sourceName: "impl",
        messageId: "message-race",
        type: "instruction",
        content: "race with delivery insert",
      }),
    ).toEqual({
      ok: false,
      reason: "delivery_idempotency_key_exists",
      existing: {
        id: "race-existing",
        messageId: "seed-message",
        targetAgentId: "agent-one",
        routeId: "route-one",
        status: "queued",
        idempotencyKey: "message-race:agent-one",
      },
    });
    expect(readMessages(db)).toEqual(messagesBefore);
    expect(readDeliveries(db)).toEqual(deliveriesBefore);
    expect(readEvents(db)).toEqual(eventsBefore);
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
