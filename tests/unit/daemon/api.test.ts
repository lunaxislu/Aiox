import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
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

  it("starts a Codex runtime during attach and binds the authoritative thread id", async () => {
    const runtime = fakeCodexRuntime({
      endpoint: "ws://127.0.0.1:54321/",
      startedThreadId: "thread-new",
    });
    const runtimes = new Map();
    const state = createDaemonState({
      db,
      createId: createIdSequence(["agent-1", "event-1"]),
      now: createNowSequence([
        "2026-05-18T00:00:00.000Z",
        "2026-05-18T00:00:00.000Z",
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
        adapterSessionId: "thread-new",
      },
      codexRuntime: {
        endpoint: "ws://127.0.0.1:54321/",
        activeThreadId: "thread-new",
      },
    });
    expect(runtimes.get("impl")).toBe(runtime);
    expect(runtime.startThreadCalls).toBe(1);
    expect(db.prepare("select adapter_session_id from agents where name = ?").get("impl")).toEqual({
      adapter_session_id: "thread-new",
    });
    expect(db.prepare("select type, data_json from events").all()).toEqual([
      {
        type: "agent_thread_id_rebound",
        data_json: JSON.stringify({
          previousId: null,
          nextId: "thread-new",
          operation: "thread/start",
        }),
      },
    ]);
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
        startedAt: "2026-05-18T00:00:00.000Z",
      },
      agents: [],
      pairs: [],
      routes: [],
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
}) {
  return {
    state: "ready" as const,
    endpoint: new URL(options.endpoint),
    activeThreadId: null as string | null,
    startThreadCalls: 0,
    resumeThreadCalls: [] as string[],
    disposeCalls: 0,
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
    async dispose() {
      this.disposeCalls += 1;
      this.state = "disposed" as typeof this.state;
    },
  };
}
