import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState, type DaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";
import { createAdapterRegistry, type AdapterRegistry } from "../../../src/host/adapter-registry.js";
import {
  createFakeAgentRuntimeTerminator,
  type FakeAgentRuntimeTerminator,
} from "../../../src/host/fake-agent-runtime-terminator.js";
import { createFakeHostAdapter, type FakeHostAdapter } from "../../../src/host/fake-host-adapter.js";
import type { HostAdapter } from "../../../src/host/host-adapter.js";
import { createHostController, type HostController } from "../../../src/host/host-controller.js";

describe("HostController", () => {
  let db: InstanceType<typeof Database>;
  let nextId: number;
  let api: ReturnType<typeof createDaemonApi>;
  let registry: AdapterRegistry;
  let fake: FakeHostAdapter;
  let terminator: FakeAgentRuntimeTerminator;

  function createId(): string {
    nextId += 1;
    return `id-${nextId}`;
  }

  function createController(overrideRegistry?: AdapterRegistry): HostController {
    return createHostController({
      api,
      registry: overrideRegistry ?? registry,
      terminator,
      createId,
    });
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
    registry = createAdapterRegistry();
    fake = createFakeHostAdapter({ id: "fake" });
    registry.register(fake);
    terminator = createFakeAgentRuntimeTerminator();
  });

  afterEach(() => {
    db.close();
  });

  const twoAgents = [
    { name: "reviewer", kind: "claude" as const, role: "review", description: "reviews work" },
    { name: "implementer", kind: "codex" as const, instructions: "keep changes small" },
  ];

  describe("happy path", () => {
    it("registers the host, launches every agent, and returns the started subset with host identity", async () => {
      const controller = createController();

      const result = await controller.start({
        name: "demo",
        path: "/repo/demo",
        agents: twoAgents,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected start to succeed");
      expect(result.host.name).toBe("demo");
      expect(result.host.canonicalPath).toBe("/repo/demo");
      expect(result.agents).toEqual([
        { name: "reviewer", kind: "claude", outcome: "started" },
        { name: "implementer", kind: "codex", outcome: "started" },
      ]);

      const stored = api.listHostAgents({ hostId: result.hostId });
      expect(stored.agents.map((a) => [a.name, a.status])).toEqual([
        ["reviewer", "starting"],
        ["implementer", "starting"],
      ]);
    });

    it("preserves each agent's name/kind/role/description/instructions and passes cwd/env to the adapter", async () => {
      const controller = createController();

      await controller.start({
        name: "demo",
        path: "/repo/demo",
        agents: [
          {
            name: "reviewer",
            kind: "claude",
            role: "review",
            description: "reviews work",
            instructions: "be terse",
          },
        ],
      });

      expect(fake.calls).toHaveLength(1);
      const request = fake.calls[0]!.request;
      expect(request.agentName).toBe("reviewer");
      expect(request.agentKind).toBe("claude");
      expect(request.cwd).toBe("/repo/demo");
      expect(request.command).toBe("aiox");
      expect(request.args).toContain("claude");
      expect(request.args).toContain("--name");
      expect(request.args).toContain("reviewer");
      expect(request.args).toContain("--role");
      expect(request.args).toContain("review");
      expect(request.args).toContain("--description");
      expect(request.args).toContain("reviews work");
      expect(request.args).toContain("--instructions");
      expect(request.args).toContain("be terse");
      expect(request.env).toEqual({});
    });

    it("transitions an agent to ready only after reconcile observes the daemon's host-agent state", async () => {
      const controller = createController();
      const result = await controller.start({ name: "demo", path: "/repo/demo", agents: twoAgents });
      if (!result.ok) throw new Error("expected start to succeed");

      expect(controller.listAgents().map((a) => [a.name, a.status])).toEqual([
        ["reviewer", "starting"],
        ["implementer", "starting"],
      ]);

      // The existing AIOX agent CLI (Stage 5+) is what actually reports a
      // successful vendor spawn to the daemon; this simulates that report
      // directly against Stage 3's accepted daemon API.
      await api.markHostAgentReady({ hostId: result.hostId, agentName: "reviewer" });
      await controller.reconcile();

      expect(controller.listAgents().map((a) => [a.name, a.status])).toEqual([
        ["reviewer", "ready"],
        ["implementer", "starting"],
      ]);
      expect(
        api.listHostAgents({ hostId: result.hostId }).agents.find((a) => a.name === "reviewer"),
      ).toMatchObject({ status: "ready" });
    });

    it("runs static detect before dynamic preflight, and registers the running host only after dynamic preflight succeeds", async () => {
      const order: string[] = [];
      let hostRegisteredBeforeSurface = false;
      const orderingAdapter: HostAdapter = {
        id: "ordering",
        detect: () => true,
        staticPreflight: async () => {
          order.push("static");
          return { ok: true };
        },
        dynamicPreflight: async () => {
          order.push("dynamic");
          expect(api.listRunningHosts().hosts).toEqual([]);
          return { ok: true };
        },
        createSurfaceAndStart: async (request) => {
          order.push(`surface:${request.agentName}`);
          hostRegisteredBeforeSurface = api.listRunningHosts().hosts.length === 1;
        },
      };
      const orderingRegistry = createAdapterRegistry();
      orderingRegistry.register(orderingAdapter);
      const controller = createController(orderingRegistry);

      const result = await controller.start({ name: "demo", path: "/repo/demo", agents: twoAgents });

      expect(result.ok).toBe(true);
      expect(order).toEqual(["static", "dynamic", "surface:reviewer", "surface:implementer"]);
      expect(hostRegisteredBeforeSurface).toBe(true);
    });
  });

  describe("partial and all-agent failure", () => {
    const threeAgents = [
      { name: "reviewer", kind: "claude" as const },
      { name: "implementer", kind: "codex" as const },
      { name: "qa", kind: "codex" as const },
    ];

    it("treats the N-th surface-creation failure as agent-local: earlier agents survive, the failed one is detached", async () => {
      fake.failAtCalls([{ atCall: 3, stage: "surface" }]);
      const controller = createController();

      const result = await controller.start({ name: "demo", path: "/repo/demo", agents: threeAgents });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected start to succeed");
      expect(result.agents).toEqual([
        { name: "reviewer", kind: "claude", outcome: "started" },
        { name: "implementer", kind: "codex", outcome: "started" },
        {
          name: "qa",
          kind: "codex",
          outcome: "failed",
          reason: expect.stringContaining("fake surface failure"),
        },
      ]);
      expect(controller.listAgents().map((a) => a.name)).toEqual(["reviewer", "implementer"]);
      expect(
        api.listHostAgents({ hostId: result.hostId }).agents.map((a) => a.name),
      ).toEqual(["reviewer", "implementer"]);
      expect(api.listRunningHosts().hosts).toHaveLength(1);
      expect(terminator.calls).toEqual([]);
    });

    it("treats the N-th CLI-start failure as agent-local, identically to a surface-creation failure", async () => {
      fake.failAtCalls([{ atCall: 2, stage: "cli-start" }]);
      const controller = createController();

      const result = await controller.start({ name: "demo", path: "/repo/demo", agents: threeAgents });

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("expected start to succeed");
      expect(result.agents.map((a) => [a.name, a.outcome])).toEqual([
        ["reviewer", "started"],
        ["implementer", "failed"],
        ["qa", "started"],
      ]);
      expect(controller.listAgents().map((a) => a.name)).toEqual(["reviewer", "qa"]);
      expect(
        api.listHostAgents({ hostId: result.hostId }).agents.map((a) => a.name),
      ).toEqual(["reviewer", "qa"]);
    });

    it("detaches an agent that exits before ever becoming ready, and leaves other agents running", async () => {
      const controller = createController();
      const result = await controller.start({ name: "demo", path: "/repo/demo", agents: threeAgents });
      if (!result.ok) throw new Error("expected start to succeed");

      // The existing AIOX agent CLI reports a natural exit/detach to the
      // daemon (Stage 5+); this simulates that report directly.
      await api.detachHostAgent({ hostId: result.hostId, agentName: "implementer" });
      await controller.reconcile();

      expect(controller.listAgents().map((a) => a.name)).toEqual(["reviewer", "qa"]);
      expect(
        api.listHostAgents({ hostId: result.hostId }).agents.map((a) => a.name),
      ).toEqual(["reviewer", "qa"]);
      expect(api.listRunningHosts().hosts).toHaveLength(1);
    });

    it("detaches an agent that exits after becoming ready, and leaves other agents running", async () => {
      const controller = createController();
      const result = await controller.start({ name: "demo", path: "/repo/demo", agents: threeAgents });
      if (!result.ok) throw new Error("expected start to succeed");

      await api.markHostAgentReady({ hostId: result.hostId, agentName: "implementer" });
      await controller.reconcile();
      expect(controller.listAgents().find((a) => a.name === "implementer")).toMatchObject({
        status: "ready",
      });

      await api.detachHostAgent({ hostId: result.hostId, agentName: "implementer" });
      await controller.reconcile();

      expect(controller.listAgents().map((a) => a.name)).toEqual(["reviewer", "qa"]);
      expect(
        api.listHostAgents({ hostId: result.hostId }).agents.map((a) => a.name),
      ).toEqual(["reviewer", "qa"]);
    });

    it("unregisters the running host when every declared agent fails to launch", async () => {
      fake.failAtCalls([
        { atCall: 1, stage: "surface" },
        { atCall: 2, stage: "cli-start" },
      ]);
      const controller = createController();

      const result = await controller.start({
        name: "demo",
        path: "/repo/demo",
        agents: [
          { name: "reviewer", kind: "claude" as const },
          { name: "implementer", kind: "codex" as const },
        ],
      });

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("expected start to fail");
      expect(result.stage).toBe("all_agents_failed");
      expect(api.listRunningHosts().hosts).toEqual([]);
      if (result.stage !== "all_agents_failed") throw new Error("expected all_agents_failed");
      expect(api.listHostAgents({ hostId: result.hostId }).agents).toEqual([]);
      expect(terminator.calls).toEqual([]);
    });

    it("leaves any pending control request for the fully-cleaned-up host with no home", async () => {
      fake.failAtCalls([{ atCall: 1, stage: "surface" }]);
      const controller = createController();

      await controller.start({
        name: "demo",
        path: "/repo/demo",
        agents: [{ name: "reviewer", kind: "claude" as const }],
      });

      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      expect(submitted).toEqual({ ok: false, reason: "host_not_running", name: "demo" });
    });

    it("does not affect a different running host or its agents", async () => {
      const controllerA = createController();
      const otherFake = createFakeHostAdapter({ id: "fake-b" });
      const registryB = createAdapterRegistry();
      registryB.register(otherFake);
      const controllerB = createHostController({ api, registry: registryB, terminator, createId });

      fake.failAtCalls([{ atCall: 2, stage: "surface" }]);
      const resultA = await controllerA.start({
        name: "host-a",
        path: "/repo/a",
        agents: threeAgents,
      });
      const resultB = await controllerB.start({
        name: "host-b",
        path: "/repo/b",
        agents: [{ name: "reviewer", kind: "claude" as const }],
      });

      if (!resultA.ok || !resultB.ok) throw new Error("expected both hosts to start");

      expect(controllerB.listAgents().map((a) => a.name)).toEqual(["reviewer"]);
      expect(api.listHostAgents({ hostId: resultB.hostId }).agents).toHaveLength(1);
      expect(api.listRunningHosts().hosts).toHaveLength(2);
    });
  });

  describe("static/dynamic preflight failure", () => {
    it("fails with no daemon/host/agent/surface side effect when no adapter matches (static bucket)", async () => {
      const emptyRegistry = createAdapterRegistry();
      const controller = createController(emptyRegistry);

      const result = await controller.start({ name: "demo", path: "/repo/demo", agents: twoAgents });

      expect(result).toMatchObject({ ok: false, stage: "static_preflight" });
      expect(api.listRunningHosts().hosts).toEqual([]);
    });

    it("fails with no daemon/host/agent/surface side effect when static preflight itself fails", async () => {
      fake.setStaticPreflight({ ok: false, reason: "cmux not installed" });
      const controller = createController();

      const result = await controller.start({ name: "demo", path: "/repo/demo", agents: twoAgents });

      expect(result).toEqual({ ok: false, stage: "static_preflight", reason: "cmux not installed" });
      expect(api.listRunningHosts().hosts).toEqual([]);
      expect(fake.calls).toEqual([]);
    });

    it("fails with no running host/agent/surface when dynamic preflight fails, though static preflight already ran", async () => {
      fake.setDynamicPreflight({ ok: false, reason: "no vscode workspace open" });
      const controller = createController();

      const result = await controller.start({ name: "demo", path: "/repo/demo", agents: twoAgents });

      expect(result).toEqual({
        ok: false,
        stage: "dynamic_preflight",
        reason: "no vscode workspace open",
      });
      expect(api.listRunningHosts().hosts).toEqual([]);
      expect(fake.calls).toEqual([]);
    });
  });
});
