import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  closeAioxStore,
  createAioxStore,
  listAgents,
  listEvents,
  listMessages,
  listRoutes,
  recordLateReply,
  recoverAfterRestart,
  recordEvent,
  saveAgent,
  saveMessage,
  saveRoute,
} from "./store.js";

const tempDirs: string[] = [];

function createTempDbPath() {
  const dir = mkdtempSync(join(tmpdir(), "aiox-sqlite-restart-"));
  tempDirs.push(dir);
  return join(dir, "state.db");
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("SQLite restart recovery PoC", () => {
  it("enables WAL mode for file-backed state", () => {
    const dbPath = createTempDbPath();
    const store = createAioxStore(dbPath);

    saveAgent(store, {
      id: "agent-a",
      name: "agent-a",
      kind: "codex",
      status: "connected",
      cwd: "/tmp/project",
      adapterSessionId: "thread-a",
    });

    expect(store.journalMode).toBe("wal");
    expect(existsSync(`${dbPath}-wal`)).toBe(true);
    expect(existsSync(`${dbPath}-shm`)).toBe(true);
    closeAioxStore(store);
  });

  it("persists agents routes messages and events across close and reopen", () => {
    const dbPath = createTempDbPath();
    const first = createAioxStore(dbPath);

    expect(first.journalMode).toBe("wal");

    saveAgent(first, {
      id: "agent-codex",
      name: "codex-main",
      kind: "codex",
      status: "connected",
      cwd: "/tmp/project",
      adapterSessionId: "thread-001",
    });
    saveAgent(first, {
      id: "agent-claude",
      name: "claude-reviewer",
      kind: "claude",
      status: "connected",
      cwd: "/tmp/project",
      adapterSessionId: "chat-001",
    });
    saveRoute(first, {
      id: "route-001",
      sourceAgentId: "agent-claude",
      targetAgentId: "agent-codex",
      status: "active",
    });
    saveMessage(first, {
      id: "msg-001",
      routeId: "route-001",
      sourceAgentId: "agent-claude",
      targetAgentId: "agent-codex",
      type: "instruction",
      status: "delivering",
      idempotencyKey: "claude:msg-001",
      content: "Implement the probe.",
    });
    recordEvent(first, {
      id: "event-001",
      messageId: "msg-001",
      type: "message_queued",
      data: { status: "queued" },
    });
    closeAioxStore(first);

    const second = createAioxStore(dbPath);
    const recovery = recoverAfterRestart(second);

    expect(listAgents(second)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "agent-codex", status: "disconnected" }),
      expect.objectContaining({ id: "agent-claude", status: "disconnected" }),
    ]));
    expect(listRoutes(second)).toEqual([
      expect.objectContaining({ id: "route-001", status: "active" }),
    ]);
    expect(listMessages(second)).toEqual([
      expect.objectContaining({
        id: "msg-001",
        status: "queued",
        idempotencyKey: "claude:msg-001",
      }),
    ]);
    expect(listEvents(second)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "event-001", type: "message_queued" }),
      expect.objectContaining({ messageId: "msg-001", type: "restart_requeued" }),
      expect.objectContaining({
        agentId: "agent-codex",
        type: "agent_disconnected_after_restart",
      }),
      expect.objectContaining({
        agentId: "agent-claude",
        type: "agent_disconnected_after_restart",
      }),
    ]));
    expect(recovery).toEqual({
      disconnectedAgents: 2,
      requeuedMessages: 1,
    });
    closeAioxStore(second);
  });

  it("requeues only delivering messages during restart recovery", () => {
    const dbPath = createTempDbPath();
    const store = createAioxStore(dbPath);

    saveAgent(store, {
      id: "agent-a",
      name: "agent-a",
      kind: "codex",
      status: "connected",
      cwd: "/tmp/project",
      adapterSessionId: "thread-a",
    });
    saveAgent(store, {
      id: "agent-b",
      name: "agent-b",
      kind: "claude",
      status: "connected",
      cwd: "/tmp/project",
      adapterSessionId: "chat-b",
    });
    saveRoute(store, {
      id: "route-001",
      sourceAgentId: "agent-a",
      targetAgentId: "agent-b",
      status: "active",
    });

    for (const status of ["queued", "delivering", "delivered", "completed", "failed"] as const) {
      saveMessage(store, {
        id: `msg-${status}`,
        routeId: "route-001",
        sourceAgentId: "agent-a",
        targetAgentId: "agent-b",
        type: "instruction",
        status,
        idempotencyKey: `agent-a:${status}`,
        content: status,
      });
    }

    recoverAfterRestart(store);

    // This is a focused policy test; the close/open restart path is covered above.
    expect(listMessages(store)).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "msg-queued", status: "queued" }),
      expect.objectContaining({ id: "msg-delivering", status: "queued" }),
      expect.objectContaining({ id: "msg-delivered", status: "delivered" }),
      expect.objectContaining({ id: "msg-completed", status: "completed" }),
      expect.objectContaining({ id: "msg-failed", status: "failed" }),
    ]));
    closeAioxStore(store);
  });

  it("rejects duplicate message idempotency keys", () => {
    const dbPath = createTempDbPath();
    const store = createAioxStore(dbPath);

    saveAgent(store, {
      id: "agent-a",
      name: "agent-a",
      kind: "codex",
      status: "connected",
      cwd: "/tmp/project",
      adapterSessionId: "thread-a",
    });
    saveAgent(store, {
      id: "agent-b",
      name: "agent-b",
      kind: "claude",
      status: "connected",
      cwd: "/tmp/project",
      adapterSessionId: "chat-b",
    });
    saveRoute(store, {
      id: "route-001",
      sourceAgentId: "agent-a",
      targetAgentId: "agent-b",
      status: "active",
    });
    saveMessage(store, {
      id: "msg-001",
      routeId: "route-001",
      sourceAgentId: "agent-a",
      targetAgentId: "agent-b",
      type: "instruction",
      status: "queued",
      idempotencyKey: "agent-a:duplicate",
      content: "First delivery",
    });

    expect(() =>
      saveMessage(store, {
        id: "msg-002",
        routeId: "route-001",
        sourceAgentId: "agent-a",
        targetAgentId: "agent-b",
        type: "instruction",
        status: "queued",
        idempotencyKey: "agent-a:duplicate",
        content: "Duplicate delivery",
      }),
    ).toThrow();
    closeAioxStore(store);
  });

  it("records late replies as linked messages and append-only events", () => {
    const dbPath = createTempDbPath();
    const store = createAioxStore(dbPath);

    saveAgent(store, {
      id: "agent-a",
      name: "agent-a",
      kind: "codex",
      status: "connected",
      cwd: "/tmp/project",
      adapterSessionId: "thread-a",
    });
    saveAgent(store, {
      id: "agent-b",
      name: "agent-b",
      kind: "claude",
      status: "connected",
      cwd: "/tmp/project",
      adapterSessionId: "chat-b",
    });
    saveRoute(store, {
      id: "route-001",
      sourceAgentId: "agent-a",
      targetAgentId: "agent-b",
      status: "active",
    });
    saveMessage(store, {
      id: "msg-parent",
      routeId: "route-001",
      sourceAgentId: "agent-a",
      targetAgentId: "agent-b",
      type: "question",
      status: "completed",
      idempotencyKey: "agent-a:parent",
      content: "Original question",
    });

    recordLateReply(store, {
      id: "msg-late-reply",
      routeId: "route-001",
      sourceAgentId: "agent-b",
      targetAgentId: "agent-a",
      parentMessageId: "msg-parent",
      idempotencyKey: "agent-b:late-reply",
      content: "Late reply",
    });

    expect(listMessages(store)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "msg-late-reply",
        parentMessageId: "msg-parent",
        type: "reply",
        status: "completed",
      }),
    ]));
    expect(listEvents(store)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        messageId: "msg-late-reply",
        type: "late_reply",
      }),
    ]));
    closeAioxStore(store);
  });
});
