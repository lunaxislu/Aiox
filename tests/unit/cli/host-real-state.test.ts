import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runHost, type AgentViewHandle, type RunHostOptions } from "../../../src/cli/host.js";
import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState, type ManagedCodexAgentRuntime } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";

/**
 * The mock-API host tests prove which daemon method host called. A recorded
 * `detachAgent` call is not proof that anything was actually removed — these
 * tests run `runHost` against the real `createDaemonState`/`createDaemonApi`
 * production path so every assertion is an actual SQLite row, an actual route
 * row, or an actual `runtime.dispose()`.
 */
describe("runHost against real daemon state", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("leaves no row, runtime, or route behind for the agent whose TUI failed, while the others stay wired", async () => {
    const disposed: string[] = [];
    const runtimes = new Map<string, ManagedCodexAgentRuntime>();
    const state = createDaemonState({
      db,
      createId: idSequence(),
      now: () => "2026-08-20T00:00:00.000Z",
      codexRuntimes: runtimes,
      attachCodexRuntime: async (input) => fakeCodexRuntime(input.agentName, disposed),
    });
    const api = createDaemonApi(state);
    const signals = manualSignal();
    let stateWhileRunning: { agents: string[]; routes: Array<[string, string]> } | null = null;

    const result = await runHost(
      hostOptions({
        api,
        loadConfig: () => ({
          project: "demo",
          agents: [
            { name: "a", type: "codex" },
            { name: "b", type: "codex" },
            { name: "c", type: "codex" },
          ],
          routes: [{ name: "team", members: ["a", "b", "c"] }],
        }),
        launchAgentView: async (request) => {
          if (request.agentName === "b") {
            throw new Error("no terminal surface available");
          }
          return inertView();
        },
        registerSignalHandlers: signals.register,
        watchOwnedAgents: () => {
          // Sampled at foreground entry: the authoritative state the host
          // actually established, before its own shutdown tears it all down.
          stateWhileRunning = { agents: agentNames(db), routes: routeRows(db) };
          queueMicrotask(signals.fire);
          return () => {};
        },
      }),
    );

    // b failed its view launch, so it was never in authoritative state once the
    // host moved on, and it was never wired into the compose topology — while
    // the agents that did come up were meshed with each other.
    expect(stateWhileRunning).toEqual({
      agents: ["a", "c"],
      routes: [
        ["a", "c"],
        ["c", "a"],
      ],
    });
    // b's runtime was disposed at its agent-local cleanup, before a and c were
    // disposed by the final shutdown.
    expect(disposed).toEqual(["b", "a", "c"]);
    expect(agentNames(db)).toEqual([]);
    expect(db.prepare("select count(*) as count from routes").get()).toEqual({ count: 0 });
    expect(result.exitCode).toBe(1);
  });

  it("removes only the departed agent's rows and routes when one agent's view is lost mid-session", async () => {
    const disposed: string[] = [];
    const state = createDaemonState({
      db,
      createId: idSequence(),
      now: () => "2026-08-20T00:00:00.000Z",
      codexRuntimes: new Map(),
      attachCodexRuntime: async (input) => fakeCodexRuntime(input.agentName, disposed),
    });
    const api = createDaemonApi(state);
    const signals = manualSignal();
    const lossListeners = new Map<string, (reason: string) => void>();

    const run = runHost(
      hostOptions({
        api,
        loadConfig: () => ({
          project: "demo",
          agents: [
            { name: "a", type: "codex" },
            { name: "b", type: "codex" },
            { name: "c", type: "codex" },
          ],
          routes: [{ name: "team", members: ["a", "b", "c"] }],
        }),
        launchAgentView: async (request) => ({
          close: async () => {},
          onLost: (listener) => lossListeners.set(request.agentName, listener),
        }),
        registerSignalHandlers: signals.register,
        watchOwnedAgents: () => {
          queueMicrotask(() => lossListeners.get("b")?.("TUI window closed"));
          return () => {};
        },
      }),
    );

    await settle();

    // Only b departed: its row, its runtime, and every route touching it are
    // gone, while a and c are still attached and still routed to each other.
    expect(agentNames(db)).toEqual(["a", "c"]);
    expect(disposed).toEqual(["b"]);
    expect(routeRows(db)).toEqual([
      ["a", "c"],
      ["c", "a"],
    ]);

    signals.fire();
    const result = await run;

    expect(agentNames(db)).toEqual([]);
    expect(disposed).toEqual(["b", "a", "c"]);
    expect(result.exitCode).toBe(1);
  });
});

function hostOptions(
  overrides: Partial<RunHostOptions> & Pick<RunHostOptions, "api" | "launchAgentView">,
): RunHostOptions {
  return {
    cwd: "/repo",
    daemonSocketPath: "/tmp/aiox-host-real-state.sock",
    stderr: { write: () => true },
    checkClaudeMcpRegistration: async () => ({ registered: true }),
    registerSignalHandlers: () => () => {},
    watchOwnedAgents: () => () => {},
    ...overrides,
  };
}

function inertView(): AgentViewHandle {
  return { close: async () => {}, onLost: () => {} };
}

function manualSignal(): {
  register: RunHostOptions["registerSignalHandlers"];
  fire: () => void;
} {
  let handler: ((signal: NodeJS.Signals) => void) | null = null;
  return {
    register: (onSignal) => {
      handler = onSignal;
      return () => {
        handler = null;
      };
    },
    fire: () => handler?.("SIGINT"),
  };
}

async function settle(): Promise<void> {
  for (let i = 0; i < 4; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

function idSequence(): () => string {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

function fakeCodexRuntime(agentName: string, disposed: string[]): ManagedCodexAgentRuntime {
  return {
    state: "ready",
    endpoint: new URL("ws://127.0.0.1:54321/"),
    activeThreadId: null,
    dispose: async () => {
      disposed.push(agentName);
    },
    startThread: async () => `thread-${agentName}`,
    resumeThread: async () => null,
    listLoadedThreadIds: async () => [],
    rebindActiveThread: () => undefined,
  } as unknown as ManagedCodexAgentRuntime;
}

function agentNames(db: InstanceType<typeof Database>): string[] {
  return (db.prepare("select name from agents order by name").all() as Array<{ name: string }>).map(
    (row) => row.name,
  );
}

/** Route rows resolved back to agent names, for readable assertions. */
function routeRows(db: InstanceType<typeof Database>): Array<[string, string]> {
  return (
    db
      .prepare(
        `select source.name as source, target.name as target
         from routes
         join agents as source on source.id = routes.source_agent_id
         join agents as target on target.id = routes.target_agent_id
         order by source.name, target.name`,
      )
      .all() as Array<{ source: string; target: string }>
  ).map((row) => [row.source, row.target]);
}
