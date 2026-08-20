import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";

describe("agent departure history", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("removes live agent and route state without deleting message, delivery, or event history", async () => {
    let id = 0;
    const api = createDaemonApi(
      createDaemonState({
        db,
        createId: () => `id-${++id}`,
        now: () => "2026-08-20T00:00:00.000Z",
      }),
    );

    await api.attachAgent({ kind: "claude", name: "source", cwd: "/repo" });
    await api.attachAgent({ kind: "claude", name: "target", cwd: "/repo" });
    await api.connect({ sourceName: "source", targetNames: ["target"] });
    const sent = await api.receiveClaudeChannelMessage({
      agentName: "source",
      messageId: "message-1",
      content: { text: "preserve this history" },
    });
    if (!sent.ok) {
      throw new Error("expected message to be persisted before departure");
    }

    const historyBefore = countHistoryRows(db);
    expect(historyBefore.messages).toBe(1);
    expect(historyBefore.deliveries).toBe(1);
    expect(historyBefore.events).toBeGreaterThan(0);

    await api.detachAgent({ agentName: "target" });

    expect((await api.status()).agents.map((agent) => agent.name)).toEqual(["source"]);
    expect((await api.status()).routes).toEqual([]);
    expect(countHistoryRows(db)).toEqual({
      messages: historyBefore.messages,
      deliveries: historyBefore.deliveries,
      events: historyBefore.events + 1,
    });
  });
});

function countHistoryRows(db: Database): {
  messages: number;
  deliveries: number;
  events: number;
} {
  const count = (table: "messages" | "message_deliveries" | "events") =>
    (db.prepare(`select count(*) as count from ${table}`).get() as { count: number }).count;

  return {
    messages: count("messages"),
    deliveries: count("message_deliveries"),
    events: count("events"),
  };
}
