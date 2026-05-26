import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import {
  createDaemonState,
  type ManagedCodexAgentRuntime,
  type ManagedCodexProxyBindingEvent,
} from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";

describe("daemon Codex proxy binding listener", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("rebinds the Codex agent active thread on proxy binding and emits an event with source=proxy_binding", async () => {
    const { runtime, fireBinding } = fakeCodexRuntime();
    const ids = idSequence([
      "agent-1",
      "event-rebind",
    ]);
    const nows = nowSequence([
      "2026-05-26T00:00:00.000Z", // attach now
      "2026-05-26T00:00:00.000Z", // pending token timestamp
      "2026-05-26T00:00:01.000Z", // proxy binding now
    ]);
    const state = createDaemonState({
      db,
      createId: ids,
      now: nows,
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
    });
    const api = createDaemonApi(state);

    await api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    fireBinding({
      method: "thread/resume",
      threadId: "thread-resumed",
      requestId: 42,
    });

    const events = db
      .prepare(
        "select type, data_json from events where type = 'agent_thread_id_rebound'",
      )
      .all();
    expect(events).toEqual([
      {
        type: "agent_thread_id_rebound",
        data_json: JSON.stringify({
          previousId: null,
          nextId: "thread-resumed",
          operation: "thread/resume",
          source: "proxy_binding",
          requestId: 42,
        }),
      },
    ]);

    const agent = db
      .prepare("select adapter_session_id from agents where name = 'impl'")
      .get() as { adapter_session_id: string | null };
    expect(agent.adapter_session_id).toBe("thread-resumed");
    expect(runtime.activeThreadId).toBe("thread-resumed");
  });

  it("preserves order so a later binding supersedes an earlier one", async () => {
    const { runtime, fireBinding } = fakeCodexRuntime();
    const state = createDaemonState({
      db,
      createId: idSequence(["agent-1", "event-1", "event-2"]),
      now: nowSequence([
        "2026-05-26T00:00:00.000Z",
        "2026-05-26T00:00:00.000Z",
        "2026-05-26T00:00:01.000Z",
        "2026-05-26T00:00:02.000Z",
      ]),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
    });
    const api = createDaemonApi(state);

    await api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    fireBinding({ method: "thread/start", threadId: "thread-A", requestId: 1 });
    fireBinding({ method: "thread/resume", threadId: "thread-B", requestId: 2 });

    const ids = db
      .prepare(
        "select data_json from events where type = 'agent_thread_id_rebound' order by id",
      )
      .all() as Array<{ data_json: string }>;
    expect(ids.map((row) => JSON.parse(row.data_json).nextId)).toEqual([
      "thread-A",
      "thread-B",
    ]);

    const agent = db
      .prepare("select adapter_session_id from agents where name = 'impl'")
      .get() as { adapter_session_id: string };
    expect(agent.adapter_session_id).toBe("thread-B");
    expect(runtime.activeThreadId).toBe("thread-B");
  });

  it("is idempotent when the binding repeats the current adapter_session_id", async () => {
    const { runtime, fireBinding } = fakeCodexRuntime();
    const state = createDaemonState({
      db,
      createId: idSequence(["agent-1", "event-1"]),
      now: nowSequence([
        "2026-05-26T00:00:00.000Z",
        "2026-05-26T00:00:00.000Z",
        "2026-05-26T00:00:01.000Z",
        "2026-05-26T00:00:02.000Z",
      ]),
      codexRuntimes: new Map(),
      attachCodexRuntime: async () => runtime,
    });
    const api = createDaemonApi(state);

    await api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    fireBinding({ method: "thread/start", threadId: "thread-A", requestId: 1 });
    fireBinding({ method: "thread/start", threadId: "thread-A", requestId: 2 });

    const events = db
      .prepare(
        "select count(*) as n from events where type = 'agent_thread_id_rebound'",
      )
      .get() as { n: number };
    expect(events.n).toBe(1);
    expect(runtime.activeThreadId).toBe("thread-A");
  });
});

function fakeCodexRuntime(): {
  runtime: ManagedCodexAgentRuntime & { activeThreadId: string | null };
  fireBinding: (event: ManagedCodexProxyBindingEvent) => void;
} {
  let activeThreadId: string | null = null;
  const listeners = new Set<(e: ManagedCodexProxyBindingEvent) => void>();

  const runtime: ManagedCodexAgentRuntime = {
    state: "ready",
    get endpoint() {
      return new URL("ws://127.0.0.1:54900/");
    },
    get activeThreadId() {
      return activeThreadId;
    },
    async startThread() {
      return null;
    },
    async resumeThread(id) {
      activeThreadId = id;
      return id;
    },
    async listLoadedThreadIds() {
      return activeThreadId ? [activeThreadId] : [];
    },
    rebindActiveThread(id) {
      activeThreadId = id;
    },
    onProxyBinding(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async dispose() {
      // no-op
    },
  };

  return {
    runtime: runtime as ManagedCodexAgentRuntime & {
      activeThreadId: string | null;
    },
    fireBinding(event) {
      for (const l of listeners) {
        l(event);
      }
    },
  };
}

function idSequence(ids: string[]): () => string {
  let i = 0;
  return () => {
    if (i >= ids.length) {
      throw new Error(`id sequence exhausted at ${i}`);
    }
    return ids[i++]!;
  };
}

function nowSequence(values: string[]): () => string {
  let i = 0;
  return () => {
    if (i >= values.length) {
      return values[values.length - 1]!;
    }
    return values[i++]!;
  };
}
