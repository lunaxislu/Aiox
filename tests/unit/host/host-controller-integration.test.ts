import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState, type DaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";
import { createAdapterRegistry } from "../../../src/host/adapter-registry.js";
import { createFakeAgentRuntimeTerminator } from "../../../src/host/fake-agent-runtime-terminator.js";
import { createFakeHostAdapter } from "../../../src/host/fake-host-adapter.js";
import { createHostController } from "../../../src/host/host-controller.js";

/**
 * Increment 5: registry + controller + FakeHostAdapter + the real Stage 3
 * daemon API (in-process, in-memory SQLite — no daemon process is started)
 * walked through one end-to-end lifecycle, confirming every stage's cleanup
 * contract holds together rather than only in isolation.
 */
describe("HostController end-to-end lifecycle (Increment 5)", () => {
  let db: InstanceType<typeof Database>;
  let nextId: number;
  let api: ReturnType<typeof createDaemonApi>;

  function createId(): string {
    nextId += 1;
    return `id-${nextId}`;
  }

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
    nextId = 0;
    const state: DaemonState = createDaemonState({
      db,
      createId,
      now: () => "2026-08-31T00:00:00.000Z",
    });
    api = createDaemonApi(state);
  });

  afterEach(() => {
    db.close();
  });

  it("does nothing when static preflight fails, before any daemon/host side effect", async () => {
    const registry = createAdapterRegistry();
    const fake = createFakeHostAdapter({ staticPreflight: { ok: false, reason: "not installed" } });
    registry.register(fake);
    const controller = createHostController({
      api,
      registry,
      terminator: createFakeAgentRuntimeTerminator(),
      createId,
    });

    const result = await controller.start({
      name: "demo",
      path: "/repo/demo",
      agents: [{ name: "reviewer", kind: "claude" }],
    });

    expect(result).toEqual({ ok: false, stage: "static_preflight", reason: "not installed" });
    expect(api.listRunningHosts().hosts).toEqual([]);
    expect(fake.calls).toEqual([]);
  });

  it("leaves no running host when dynamic preflight fails, though the daemon itself may keep running", async () => {
    const registry = createAdapterRegistry();
    const fake = createFakeHostAdapter({ dynamicPreflight: { ok: false, reason: "no workspace" } });
    registry.register(fake);
    const controller = createHostController({
      api,
      registry,
      terminator: createFakeAgentRuntimeTerminator(),
      createId,
    });

    const result = await controller.start({
      name: "demo",
      path: "/repo/demo",
      agents: [{ name: "reviewer", kind: "claude" }],
    });

    expect(result).toEqual({ ok: false, stage: "dynamic_preflight", reason: "no workspace" });
    // The daemon (this in-process api/db) is trivially still usable — the
    // point under test is that no running-host row exists, not that the
    // process died.
    expect(api.listRunningHosts().hosts).toEqual([]);
    expect(api.status()).toBeTruthy();
  });

  it("runs a full lifecycle: partial launch success, ready transitions, a relayed terminate-all, then full cleanup", async () => {
    const registry = createAdapterRegistry();
    const fake = createFakeHostAdapter();
    registry.register(fake);
    fake.failAtCalls([{ atCall: 2, stage: "surface" }]);
    const terminator = createFakeAgentRuntimeTerminator();
    const controller = createHostController({
      api,
      registry,
      terminator,
      createId,
    });

    // Partial success: 2 of 3 agents launch.
    const started = await controller.start({
      name: "demo",
      path: "/repo/demo",
      agents: [
        { name: "reviewer", kind: "claude" },
        { name: "implementer", kind: "codex" },
        { name: "qa", kind: "codex" },
      ],
    });
    if (!started.ok) throw new Error("expected partial start to succeed");
    expect(started.agents.map((a) => [a.name, a.outcome])).toEqual([
      ["reviewer", "started"],
      ["implementer", "failed"],
      ["qa", "started"],
    ]);

    // Ready transition for one of the two survivors — the existing AIOX agent
    // CLI (Stage 5+) reports this to the daemon; this simulates that report
    // directly and reconciles the controller's local cache from it.
    await api.markHostAgentReady({ hostId: started.hostId, agentName: "reviewer" });
    await controller.reconcile();
    expect(controller.listAgents()).toEqual([
      { name: "reviewer", kind: "claude", status: "ready" },
      { name: "qa", kind: "codex", status: "starting" },
    ]);

    // Another shell relays a terminate-all through the existing daemon
    // control path instead of the controller being called directly.
    const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
    if (!submitted.ok) throw new Error("expected terminate_all submission to succeed");

    const handled = await controller.handleNextControlRequest();
    expect(handled).toEqual({
      claimed: true,
      requestId: submitted.requestId,
      kind: "terminate_all",
      result: { ok: true },
    });

    // Full cleanup: running host gone, host-agent runtime gone, controller
    // state cleared, requester sees the completed result exactly once.
    expect(api.listRunningHosts().hosts).toEqual([]);
    expect(api.listHostAgents({ hostId: started.hostId }).agents).toEqual([]);
    expect(controller.listAgents()).toEqual([]);
    expect(controller.getIdentity()).toBeNull();
    expect([...terminator.calls.map((call) => call.agentName)].sort()).toEqual(["qa", "reviewer"]);
    expect(api.takeHostControlRequestResult({ requestId: submitted.requestId })).toEqual({
      ok: true,
      status: "completed",
      result: { ok: true },
    });
  });

  it("keeps two hosts fully isolated through independent partial failures and independent terminate-all", async () => {
    const registryA = createAdapterRegistry();
    const fakeA = createFakeHostAdapter({ id: "fake-a" });
    registryA.register(fakeA);
    const controllerA = createHostController({
      api,
      registry: registryA,
      terminator: createFakeAgentRuntimeTerminator(),
      createId,
    });

    const registryB = createAdapterRegistry();
    const fakeB = createFakeHostAdapter({ id: "fake-b" });
    registryB.register(fakeB);
    fakeB.failAtCalls([{ atCall: 1, stage: "cli-start" }]);
    const terminatorB = createFakeAgentRuntimeTerminator();
    const controllerB = createHostController({
      api,
      registry: registryB,
      terminator: terminatorB,
      createId,
    });

    const resultA = await controllerA.start({
      name: "host-a",
      path: "/repo/a",
      agents: [{ name: "reviewer", kind: "claude" }],
    });
    const resultB = await controllerB.start({
      name: "host-b",
      path: "/repo/b",
      agents: [{ name: "solo", kind: "codex" }],
    });

    if (!resultA.ok) throw new Error("expected host A to start");
    expect(resultB).toMatchObject({ ok: false, stage: "all_agents_failed" });

    // Host B's all-agent failure must not touch host A.
    expect(api.listRunningHosts().hosts.map((h) => h.name)).toEqual(["host-a"]);
    expect(api.listHostAgents({ hostId: resultA.hostId }).agents).toHaveLength(1);

    const terminated = await controllerA.terminateAll();
    expect(terminated).toEqual({ ok: true, hostId: resultA.hostId });
    expect(api.listRunningHosts().hosts).toEqual([]);
    expect(terminatorB.calls).toEqual([]);
  });
});
