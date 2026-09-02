import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createDaemonState,
  productionAttachCodexRuntime,
  type ManagedCodexAgentRuntime,
} from "../../../src/daemon/state.js";
import type { AttachCodexAgentRuntimeOptions } from "../../../src/adapters/codex/runtime.js";
import { applySchema } from "../../../src/store/schema.js";

// `productionAttachCodexRuntime` (the daemon's real, non-test factory for
// daemon-owned/managed Codex runtimes -- distinct from the separate Codex MCP
// self-registration push-ingress channel) is a top-level function. It cannot close
// over `createDaemonState`'s internal `recordCodexRuntimeFailed` logic the way a
// test fixture's `attachCodexRuntime: async () => fakeRuntime` can. This file
// mocks only the one function `defaultAttachCodexRuntime` actually calls
// (`attachCodexAgentRuntime`, from `src/adapters/codex/runtime.ts`) so the test
// goes through the real production factory and the real `attachAgent` call site,
// not a stand-in fixture -- proving whether the `onRuntimeFailed` callback that
// `CodexAgentRuntime` already invokes on child-exit/WS-close (unmodified in this
// task) actually reaches daemon state through that factory.
const attachCodexAgentRuntimeMock = vi.fn();

vi.mock("../../../src/adapters/codex/runtime.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../../src/adapters/codex/runtime.js")>();
  return {
    ...actual,
    attachCodexAgentRuntime: (options: AttachCodexAgentRuntimeOptions) =>
      attachCodexAgentRuntimeMock(options),
  };
});

describe("Codex managed runtime failure — production attach wiring", () => {
  let db: InstanceType<typeof Database>;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
    attachCodexAgentRuntimeMock.mockReset();
  });

  afterEach(() => {
    db.close();
  });

  it("disconnects the agent and records agent_runtime_failed when the managed Codex runtime the production attach factory returned reports a failure", async () => {
    let capturedOnRuntimeFailed:
      | AttachCodexAgentRuntimeOptions["onRuntimeFailed"]
      | undefined;
    attachCodexAgentRuntimeMock.mockImplementation(
      async (options: AttachCodexAgentRuntimeOptions) => {
        capturedOnRuntimeFailed = options.onRuntimeFailed;
        const runtime: ManagedCodexAgentRuntime = {
          state: "ready",
          endpoint: new URL("ws://127.0.0.1:54321/"),
          activeThreadId: null,
          dispose: async () => undefined,
          // Retained interface stub; fresh attach does not call daemon-side
          // thread/start. This test owns onRuntimeFailed wiring.
          startThread: async () => null,
          resumeThread: async () => null,
          listLoadedThreadIds: async () => [],
          rebindActiveThread: () => undefined,
        };
        return runtime;
      },
    );

    let id = 0;
    const state = createDaemonState({
      db,
      createId: () => `id-${++id}`,
      now: () => "2026-08-13T00:00:00.000Z",
      codexRuntimes: new Map(),
      // The production factory, unmodified -- not a test fixture. This is the exact
      // value `src/daemon/run.ts` and `src/bin/aiox.ts` pass in real daemon startup.
      attachCodexRuntime: productionAttachCodexRuntime,
    });

    const attached = await state.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    expect(attached.ok).toBe(true);
    expect(attachCodexAgentRuntimeMock).toHaveBeenCalledTimes(1);

    // Simulate exactly what `CodexAgentRuntime.registerLifecycleListeners` does
    // internally on a real child-process exit or WebSocket close: it invokes the
    // `onRuntimeFailed` callback it was constructed with (see
    // `src/adapters/codex/runtime.ts:264-279`, unmodified by this task). Whether
    // this reaches daemon state depends entirely on whether the production attach
    // path forwarded that callback -- the thing this test exists to prove.
    capturedOnRuntimeFailed?.({
      agentName: "impl",
      reason: { type: "ws_dropped", closeCode: 1006, closeReason: "network dropped" },
    });

    // Physical delete: the row is removed, not status-flipped.
    const agentRow = db
      .prepare("select status from agents where name = 'impl'")
      .get();
    expect(agentRow).toBeUndefined();
    expect(
      db.prepare("select type from events where type = 'agent_runtime_failed'").all(),
    ).toHaveLength(1);
  });
});
