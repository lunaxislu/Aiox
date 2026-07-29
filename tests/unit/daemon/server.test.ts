import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../src/core/public-ids.js", () => ({
  createPublicMessageId: vi.fn(() => "opaque core default message"),
  createPublicDeliveryId: vi.fn(() => "opaque core default delivery"),
}));

import { CodexAppServerWebSocketError } from "../../../src/adapters/codex/websocket.js";
import {
  createPublicDeliveryId,
  createPublicMessageId,
} from "../../../src/core/public-ids.js";
import { createDaemonServer } from "../../../src/daemon/server.js";
import type { Supervisor } from "../../../src/daemon/supervisor.js";
import { applySchema } from "../../../src/store/schema.js";

describe("daemon server lifecycle shell", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
    vi.mocked(createPublicMessageId).mockReset();
    vi.mocked(createPublicMessageId).mockReturnValue("opaque core default message");
    vi.mocked(createPublicDeliveryId).mockReset();
    vi.mocked(createPublicDeliveryId).mockReturnValue("opaque core default delivery");
  });

  afterEach(() => {
    db.close();
  });

  it("starts idempotently and exposes the daemon API", async () => {
    const server = createDaemonServer({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-18T00:00:00.000Z",
    });

    const first = server.start();
    const second = server.start();

    expect(second).toBe(first);
    expect(await first.api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" })).toEqual({
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

  it("forwards public delivery seams while retaining createId for internal agents and events", async () => {
    const internalIds = ["internal-agent-source", "internal-agent-target", "internal-route", "internal-event-message", "internal-event-delivery"];
    const server = createDaemonServer({
      db,
      createId: () => internalIds.shift() ?? "unexpected-internal-id",
      createPublicMessageId: () => "opaque daemon message seam",
      createPublicDeliveryId: () => "opaque daemon delivery seam",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const api = server.start().api;
    await api.attachAgent({ kind: "codex", name: "source", cwd: "/repo" });
    await api.attachAgent({ kind: "claude", name: "target", cwd: "/repo" });
    await api.connect({ sourceName: "source", targetNames: ["target"] });

    const result = await api.sendMessage({ sourceName: "source", messageId: "source-issued", type: "question", content: "hello" });

    expect(result).toMatchObject({
      ok: true,
      deliveries: [{ id: "opaque daemon delivery seam" }],
    });
    expect((await api.status()).agents).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "internal-agent-source" }),
      expect.objectContaining({ id: "internal-agent-target" }),
    ]));
  });

  it("uses the core public delivery default when no server seam is supplied", async () => {
    const internalIds = ["internal-agent-source", "internal-agent-target", "internal-route", "internal-event-message", "internal-event-delivery"];
    const server = createDaemonServer({
      db,
      createId: () => internalIds.shift() ?? "unexpected-internal-id",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const api = server.start().api;
    await api.attachAgent({ kind: "codex", name: "source", cwd: "/repo" });
    await api.attachAgent({ kind: "claude", name: "target", cwd: "/repo" });
    await api.connect({ sourceName: "source", targetNames: ["target"] });

    const result = await api.sendMessage({ sourceName: "source", messageId: "source-issued", type: "question", content: "hello" });

    if (!result.ok) throw new Error("expected accepted message");
    expect(createPublicDeliveryId).toHaveBeenCalledOnce();
    expect(result.deliveries[0]?.id).toBe("opaque core default delivery");
    expect(result.deliveries).toHaveLength(1);
  });

  it("uses the forwarded public message seam for the W12 daemon-originated outcome", async () => {
    const deliveryIds = ["opaque W12 normal delivery seam", "opaque W12 outcome delivery seam"];
    const server = createDaemonServer({
      db,
      createId: createIdSequence(),
      createPublicMessageId: () => "opaque W12 message seam",
      createPublicDeliveryId: () => deliveryIds.shift() ?? "unexpected delivery seam call",
      now: () => "2026-05-18T00:00:00.000Z",
      attachCodexRuntime: async () => rejectingCodexRuntime(),
    });
    const api = server.start().api;
    const sourceToken = await connectRegisteredCodexPair(api);

    const result = await api.receiveCodexMessage({ agentName: "source", token: sourceToken!, messageId: "source-issued", content: { text: "hello" } });
    expect(result).toMatchObject({ ok: true, dispatch: { failed: [{ reason: "codex_jsonrpc_error" }], deferred: [] } });

    expect(readOutcome(db)).toEqual({
      original_delivery_id: expect.any(String),
      notification_message_id: "opaque W12 message seam",
      notification_delivery_id: "opaque W12 outcome delivery seam",
    });
    expect(readNotification(db, "opaque W12 message seam", "opaque W12 outcome delivery seam")).toEqual({
      message_id: "opaque W12 message seam",
      delivery_id: "opaque W12 outcome delivery seam",
    });
  });

  it("uses the core public message default for the W12 daemon-originated outcome", async () => {
    vi.mocked(createPublicDeliveryId)
      .mockReturnValueOnce("opaque core default normal delivery")
      .mockReturnValueOnce("opaque core default outcome delivery");
    const server = createDaemonServer({
      db,
      createId: createIdSequence(),
      now: () => "2026-05-18T00:00:00.000Z",
      attachCodexRuntime: async () => rejectingCodexRuntime(),
    });
    const api = server.start().api;
    const sourceToken = await connectRegisteredCodexPair(api);

    const result = await api.receiveCodexMessage({ agentName: "source", token: sourceToken!, messageId: "source-issued", content: { text: "hello" } });
    expect(result).toMatchObject({ ok: true, dispatch: { failed: [{ reason: "codex_jsonrpc_error" }], deferred: [] } });

    expect(createPublicMessageId).toHaveBeenCalledOnce();
    expect(createPublicDeliveryId).toHaveBeenCalledTimes(2);
    expect(readOutcome(db)).toEqual({
      original_delivery_id: expect.any(String),
      notification_message_id: "opaque core default message",
      notification_delivery_id: "opaque core default outcome delivery",
    });
    expect(readNotification(db, "opaque core default message", "opaque core default outcome delivery")).toEqual({
      message_id: "opaque core default message",
      delivery_id: "opaque core default outcome delivery",
    });
  });

  it("stops supervisor and disconnects connected agents", async () => {
    const supervisor = createRecordingSupervisor();
    const server = createDaemonServer({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-18T00:00:00.000Z",
      supervisor,
    });
    const handle = server.start();

    await handle.api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    expect(await handle.stop()).toEqual({
      ok: true,
      stoppedAgents: [
        {
          id: "agent-1",
          name: "impl",
          kind: "codex",
          status: "disconnected",
          cwd: "/repo",
          pairId: null,
        },
      ],
    });
    expect(supervisor.stopCalls).toBe(1);
    expect((await handle.api.status()).agents[0]?.status).toBe("disconnected");
  });

  it("propagates daemonOnly stop without disconnecting connected agents", async () => {
    const supervisor = createRecordingSupervisor();
    const server = createDaemonServer({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-18T00:00:00.000Z",
      supervisor,
    });
    const handle = server.start();

    await handle.api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    expect(await handle.stop({ daemonOnly: true })).toEqual({
      ok: true,
      stoppedAgents: [],
    });
    expect(supervisor.stopCalls).toBe(1);
    expect((await handle.api.status()).agents[0]?.status).toBe("connected");
  });

  it("returns the cached response when a handle is stopped twice", async () => {
    const supervisor = createRecordingSupervisor();
    const server = createDaemonServer({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-18T00:00:00.000Z",
      supervisor,
    });
    const handle = server.start();

    await handle.api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    const first = await handle.stop();
    const second = await handle.stop();

    expect(second).toEqual(first);
    expect(supervisor.stopCalls).toBe(1);
  });

  it("does not let an old stopped handle affect a restarted server", async () => {
    const supervisor = createRecordingSupervisor();
    const ids = ["agent-old", "agent-fresh"];
    const server = createDaemonServer({
      db,
      createId: () => {
        const id = ids.shift();

        if (!id) {
          throw new Error("unexpected id request");
        }

        return id;
      },
      now: () => "2026-05-18T00:00:00.000Z",
      supervisor,
    });

    const old = server.start();
    await old.api.attachAgent({ kind: "codex", name: "old", cwd: "/repo" });
    await old.stop();

    const fresh = server.start();
    await fresh.api.attachAgent({ kind: "claude", name: "fresh", cwd: "/repo" });

    await old.stop();

    expect(supervisor.stopCalls).toBe(1);
    expect((await fresh.api.status()).agents).toContainEqual({
      id: "agent-fresh",
      name: "fresh",
      kind: "claude",
      status: "connected",
      cwd: "/repo",
      pairId: null,
    });
  });

  it("reconnects an agent by name after restart", async () => {
    const ids = ["agent-1", "unused-new-agent-id"];
    const server = createDaemonServer({
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

    const first = server.start();
    await first.api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await first.stop();

    const second = server.start();
    const reattached = await second.api.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
    });

    expect(reattached).toEqual({
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
});

function createRecordingSupervisor(): Supervisor & { stopCalls: number } {
  return {
    stopCalls: 0,
    start() {},
    stop() {
      this.stopCalls += 1;
    },
  };
}

function createIdSequence(): () => string {
  let next = 0;
  return () => `internal-${++next}`;
}

function rejectingCodexRuntime() {
  let rejected = false;
  return {
    state: "ready" as const,
    endpoint: new URL("ws://127.0.0.1:54321/"),
    activeThreadId: "thread-target",
    async requestCodex(method: string) {
      if (method === "thread/loaded/list") return { data: ["thread-target"] };
      if (method === "turn/start" && !rejected) {
        rejected = true;
        throw new CodexAppServerWebSocketError("codex_jsonrpc_error", "rejected", { jsonRpcCode: -32042 });
      }
      return { turn: { id: "turn-1", status: "inProgress" } };
    },
    async startThread() { return "thread-target"; },
    async resumeThread(threadId: string) { return threadId; },
    async listLoadedThreadIds() { return ["thread-target"]; },
    rebindActiveThread() {},
    dispose() {},
  };
}

async function connectRegisteredCodexPair(api: ReturnType<ReturnType<typeof createDaemonServer>["start"]>["api"]) {
  const source = await api.attachAgent({ kind: "codex", name: "source", cwd: "/repo" });
  const target = await api.attachAgent({ kind: "codex", name: "target", cwd: "/repo" });
  if (!source.ok || !target.ok) throw new Error("expected Codex agents");
  if (!source.codexChannelToken || !target.codexChannelToken) {
    throw new Error("expected Codex channel tokens");
  }
  await api.registerCodexChannel({ agentName: "source", token: source.codexChannelToken });
  await api.registerCodexChannel({ agentName: "target", token: target.codexChannelToken });
  await api.connect({ sourceName: "source", targetNames: ["target"] });
  return source.codexChannelToken;
}

function readOutcome(database: Database) {
  return database.prepare(
    "select original_delivery_id, notification_message_id, notification_delivery_id from delivery_outcome_notifications",
  ).get();
}

function readNotification(database: Database, messageId: string, deliveryId: string) {
  return database.prepare(
    "select message_id, id as delivery_id from message_deliveries where message_id = ? and id = ?",
  ).get(messageId, deliveryId);
}
