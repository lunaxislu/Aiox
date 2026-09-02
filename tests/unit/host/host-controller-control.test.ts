import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState, type DaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";
import { createAdapterRegistry } from "../../../src/host/adapter-registry.js";
import {
  createFakeAgentRuntimeTerminator,
  type FakeAgentRuntimeTerminator,
} from "../../../src/host/fake-agent-runtime-terminator.js";
import { createFakeHostAdapter, type FakeHostAdapter } from "../../../src/host/fake-host-adapter.js";
import {
  createHostController,
  selectAndStaticPreflightAdapter,
  type HostController,
} from "../../../src/host/host-controller.js";

describe("HostController control relay and terminate-all", () => {
  let db: InstanceType<typeof Database>;
  let nextId: number;
  let api: ReturnType<typeof createDaemonApi>;
  let fake: FakeHostAdapter;
  let terminator: FakeAgentRuntimeTerminator;
  let controller: HostController;

  function createId(): string {
    nextId += 1;
    return `id-${nextId}`;
  }

  beforeEach(async () => {
    db = new Database(":memory:");
    applySchema(db);
    nextId = 0;
    const state: DaemonState = createDaemonState({
      db,
      createId,
      now: () => "2026-08-31T00:00:00.000Z",
    });
    api = createDaemonApi(state);
    const registry = createAdapterRegistry();
    fake = createFakeHostAdapter({ id: "fake" });
    registry.register(fake);
    terminator = createFakeAgentRuntimeTerminator();
    const prepared = await selectAndStaticPreflightAdapter(registry, { cwd: "/repo/demo" });
    if (!prepared.ok) throw new Error("expected adapter preparation to succeed");
    controller = createHostController({ api, terminator, createId });
    await controller.start({
      name: "demo",
      path: "/repo/demo",
      preparedAdapter: prepared.preparedAdapter,
      agents: [
        { name: "reviewer", kind: "claude" },
        { name: "implementer", kind: "codex" },
      ],
    });
  });

  afterEach(() => {
    db.close();
  });

  describe("control request claim/dispatch", () => {
    it("lets the correct controller claim a submitted request", async () => {
      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      expect(submitted.ok).toBe(true);

      const outcome = await controller.handleNextControlRequest();

      expect(outcome).toMatchObject({ claimed: true, kind: "terminate_all" });
    });

    it("rejects a claim attempt from the wrong controller id at the daemon layer", () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");

      expect(
        api.claimHostControlRequest({ hostId: identity.hostId, controllerId: "someone-else" }),
      ).toEqual({
        ok: false,
        reason: "host_controller_mismatch",
        hostId: identity.hostId,
        controllerId: "someone-else",
      });
    });

    it("reports no pending request without throwing when the queue is empty", async () => {
      const outcome = await controller.handleNextControlRequest();

      expect(outcome).toEqual({ claimed: false, reason: "no_pending_request" });
    });

    it("completes a terminate_all control request with a success result", async () => {
      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      if (!submitted.ok) throw new Error("expected submit to succeed");

      const outcome = await controller.handleNextControlRequest();

      expect(outcome).toEqual({
        claimed: true,
        requestId: submitted.requestId,
        kind: "terminate_all",
        result: { ok: true },
      });
      const taken = api.takeHostControlRequestResult({ requestId: submitted.requestId });
      expect(taken).toEqual({ ok: true, status: "completed", result: { ok: true } });
    });

    it("rejects a route mutation with an unknown current-snapshot member before any side effect", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      const callsBefore = fake.calls.length;
      const agentsBefore = api.listHostAgents({ hostId: identity.hostId }).agents;
      const submitted = api.submitHostControlRequest({
        name: "demo",
        kind: "host_route",
        payload: {
          routes: [{ op: "add", name: "audit", members: ["reviewer", "ghost"] }],
        },
      });
      if (!submitted.ok) throw new Error("expected submit to succeed");

      const outcome = await controller.handleNextControlRequest();

      expect(outcome).toEqual({
        claimed: true,
        requestId: submitted.requestId,
        kind: "host_route",
        result: {
          ok: false,
          reason: "invalid_mutation",
          issues: [
            {
              code: "unknown_agent",
              message: 'route "audit" references unknown agent "ghost"',
            },
          ],
        },
      });
      expect(fake.calls).toHaveLength(callsBefore);
      expect(api.listHostAgents({ hostId: identity.hostId }).agents).toEqual(agentsBefore);
    });

    it("narrows the named group's pair to the single directed edge instead of the mesh default (aiox-compose-contract override semantics)", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      for (const [name, kind] of [
        ["reviewer", "claude"],
        ["implementer", "codex"],
      ] as const) {
        const attached = await api.attachAgent({
          hostId: identity.hostId,
          name,
          kind,
          cwd: "/repo/demo",
        });
        if (!attached.ok) throw new Error(`expected ${name} attach`);
        await api.markHostAgentReady({ hostId: identity.hostId, agentName: name });
      }
      await controller.reconcile();
      const submitted = api.submitHostControlRequest({
        name: "demo",
        kind: "host_route",
        payload: {
          routes: [
            { op: "add", name: "development", members: ["reviewer", "implementer"] },
            {
              op: "direct",
              name: "development",
              from: "reviewer",
              to: ["implementer"],
            },
          ],
        },
      });
      if (!submitted.ok) throw new Error("expected submit to succeed");

      const outcome = await controller.handleNextControlRequest();

      // `directed=[reviewer->implementer]` narrows the only member pair to
      // that single declared direction (aiox-compose-contract.md
      // §"Mesh와 directed override의 관계") -- implementer->reviewer is not a
      // separate additive edge on top of the mesh, it is removed.
      expect(outcome).toMatchObject({
        claimed: true,
        kind: "host_route",
        result: {
          ok: true,
          routes: [{ name: "development", members: ["reviewer", "implementer"] }],
          effectiveEdgeCount: 1,
        },
      });
      expect(api.status().routes).toHaveLength(1);
    });

    it("preserves route declarations across natural exit and restores edges when the same name becomes ready again", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      for (const [name, kind] of [
        ["reviewer", "claude"],
        ["implementer", "codex"],
      ] as const) {
        const attached = await api.attachAgent({
          hostId: identity.hostId,
          name,
          kind,
          cwd: "/repo/demo",
        });
        if (!attached.ok) throw new Error(`expected ${name} attach`);
        await api.markHostAgentReady({ hostId: identity.hostId, agentName: name });
      }
      await controller.reconcile();
      const submitted = api.submitHostControlRequest({
        name: "demo",
        kind: "host_route",
        payload: {
          routes: [
            { op: "add", name: "development", members: ["reviewer", "implementer"] },
          ],
        },
      });
      if (!submitted.ok) throw new Error("expected submit to succeed");
      await controller.handleNextControlRequest();
      expect(api.status().routes).toHaveLength(2);

      await api.detachAgent({ hostId: identity.hostId, agentName: "implementer" });
      await controller.reconcile();
      expect(api.status().routes).toEqual([]);

      const registeredAgain = api.registerHostAgent({
        hostId: identity.hostId,
        name: "implementer",
        kind: "codex",
      });
      if (!registeredAgain.ok) throw new Error("expected host agent re-registration");
      const attachedAgain = await api.attachAgent({
        hostId: identity.hostId,
        name: "implementer",
        kind: "codex",
        cwd: "/repo/demo",
      });
      if (!attachedAgain.ok) throw new Error("expected host agent reattach");
      await api.markHostAgentReady({ hostId: identity.hostId, agentName: "implementer" });
      await controller.reconcile();

      expect(api.status().routes).toHaveLength(2);
    });

    it("applies a mixed host-add batch and reports an agent-local launch failure without rolling back declarations", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      fake.failAtCalls([{ atCall: 4, stage: "cli-start", reason: "architect failed" }]);
      const submitted = api.submitHostControlRequest({
        name: "demo",
        kind: "host_add",
        payload: {
          agents: [
            { agentKind: "codex", name: "qa", role: "quality" },
            { agentKind: "claude", name: "architect" },
          ],
          routes: [
            {
              op: "add",
              name: "quality",
              members: ["qa", "reviewer", "architect"],
            },
            { op: "direct", name: "quality", from: "qa", to: ["reviewer", "architect"] },
          ],
        },
      });
      if (!submitted.ok) throw new Error("expected submit to succeed");

      const outcome = await controller.handleNextControlRequest();

      expect(outcome).toMatchObject({
        claimed: true,
        kind: "host_add",
        result: {
          ok: true,
          agents: [
            { name: "qa", kind: "codex", outcome: "started" },
            { name: "architect", kind: "claude", outcome: "failed" },
          ],
          routes: [
            { name: "quality", members: ["qa", "reviewer", "architect"] },
          ],
        },
      });
      expect(api.listHostAgents({ hostId: identity.hostId }).agents.map((agent) => agent.name)).toEqual([
        "reviewer",
        "implementer",
        "qa",
      ]);
    });

    it("extends the implicit full mesh when host-add declares an agent without route operations", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      for (const [name, kind] of [
        ["reviewer", "claude"],
        ["implementer", "codex"],
      ] as const) {
        await api.attachAgent({ hostId: identity.hostId, name, kind, cwd: "/repo/demo" });
        await api.markHostAgentReady({ hostId: identity.hostId, agentName: name });
      }
      await controller.reconcile();
      expect(api.status().routes).toHaveLength(2);

      const submitted = api.submitHostControlRequest({
        name: "demo",
        kind: "host_add",
        payload: { agents: [{ agentKind: "codex", name: "qa" }] },
      });
      if (!submitted.ok) throw new Error("expected submit to succeed");
      const outcome = await controller.handleNextControlRequest();
      expect(outcome).toMatchObject({
        claimed: true,
        kind: "host_add",
        result: { ok: true, routes: [] },
      });

      await api.attachAgent({
        hostId: identity.hostId,
        name: "qa",
        kind: "codex",
        cwd: "/repo/demo",
      });
      await api.markHostAgentReady({ hostId: identity.hostId, agentName: "qa" });
      await controller.reconcile();
      expect(api.status().routes).toHaveLength(6);
    });

    it("removes only successfully terminated agents and cleans their route membership in a partial result", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      const routeRequest = api.submitHostControlRequest({
        name: "demo",
        kind: "host_route",
        payload: {
          routes: [
            { op: "add", name: "development", members: ["reviewer", "implementer"] },
          ],
        },
      });
      if (!routeRequest.ok) throw new Error("expected route submit");
      await controller.handleNextControlRequest();
      terminator.failFor("reviewer", "process did not exit");
      const submitted = api.submitHostControlRequest({
        name: "demo",
        kind: "host_remove",
        payload: { agentNames: ["reviewer", "implementer"] },
      });
      if (!submitted.ok) throw new Error("expected remove submit");

      const outcome = await controller.handleNextControlRequest();

      expect(outcome).toEqual({
        claimed: true,
        requestId: submitted.requestId,
        kind: "host_remove",
        result: {
          ok: false,
          reason: "partial_failure",
          removed: ["implementer"],
          failures: [{ name: "reviewer", reason: "process did not exit" }],
          routes: [{ name: "development", members: ["reviewer"], directed: [] }],
          effectiveEdgeCount: 0,
        },
      });
      expect(controller.listAgents().map((agent) => agent.name)).toEqual(["reviewer"]);
      expect(api.listHostAgents({ hostId: identity.hostId }).agents.map((agent) => agent.name)).toEqual([
        "reviewer",
      ]);
    });

    it("reports irreversible removals and commits their declarations when effective route sync fails", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      const routeRequest = api.submitHostControlRequest({
        name: "demo",
        kind: "host_route",
        payload: {
          routes: [
            { op: "add", name: "development", members: ["reviewer", "implementer"] },
          ],
        },
      });
      if (!routeRequest.ok) throw new Error("expected route submit");
      await controller.handleNextControlRequest();
      terminator.failFor("implementer", "process did not exit");
      vi.spyOn(api, "syncHostEffectiveRoutes").mockReturnValueOnce({
        ok: false,
        reason: "host_not_running",
        hostId: identity.hostId,
      });
      const submitted = api.submitHostControlRequest({
        name: "demo",
        kind: "host_remove",
        payload: { agentNames: ["reviewer", "implementer"] },
      });
      if (!submitted.ok) throw new Error("expected remove submit");

      const outcome = await controller.handleNextControlRequest();

      expect(outcome).toEqual({
        claimed: true,
        requestId: submitted.requestId,
        kind: "host_remove",
        result: {
          ok: false,
          reason: "effective_route_sync_failed",
          routeSyncFailure: { reason: "host_not_running" },
          removed: ["reviewer"],
          failures: [{ name: "implementer", reason: "process did not exit" }],
          routes: [{ name: "development", members: ["implementer"], directed: [] }],
        },
      });
      expect(controller.listAgents().map((agent) => agent.name)).toEqual(["implementer"]);
      expect(api.listHostAgents({ hostId: identity.hostId }).agents.map((agent) => agent.name)).toEqual([
        "implementer",
      ]);

      await controller.reconcile();
      const retryRemoved = api.submitHostControlRequest({
        name: "demo",
        kind: "host_remove",
        payload: { agentNames: ["reviewer"] },
      });
      if (!retryRemoved.ok) throw new Error("expected retry submit");
      await expect(controller.handleNextControlRequest()).resolves.toMatchObject({
        claimed: true,
        kind: "host_remove",
        result: {
          ok: false,
          reason: "invalid_mutation",
          issues: [{ code: "unknown_agent", message: 'agent "reviewer" is not declared' }],
        },
      });
    });

    it("removes one named route while preserving an overlapping edge required by another route", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      for (const [name, kind] of [
        ["reviewer", "claude"],
        ["implementer", "codex"],
      ] as const) {
        const attached = await api.attachAgent({
          hostId: identity.hostId,
          name,
          kind,
          cwd: "/repo/demo",
        });
        if (!attached.ok) throw new Error(`expected ${name} attach`);
        await api.markHostAgentReady({ hostId: identity.hostId, agentName: name });
      }
      await controller.reconcile();
      const addRequest = api.submitHostControlRequest({
        name: "demo",
        kind: "host_route",
        payload: {
          routes: [
            { op: "add", name: "development", members: ["reviewer", "implementer"] },
            { op: "add", name: "review", members: ["reviewer", "implementer"] },
          ],
        },
      });
      if (!addRequest.ok) throw new Error("expected route submit");
      await controller.handleNextControlRequest();
      expect(api.status().routes).toHaveLength(2);

      const removeRequest = api.submitHostControlRequest({
        name: "demo",
        kind: "host_route",
        payload: { routes: [{ op: "remove", name: "development" }] },
      });
      if (!removeRequest.ok) throw new Error("expected route remove submit");
      const outcome = await controller.handleNextControlRequest();

      expect(outcome).toMatchObject({
        claimed: true,
        kind: "host_route",
        result: {
          ok: true,
          routes: [{ name: "review", members: ["reviewer", "implementer"] }],
        },
      });
      expect(api.status().routes).toHaveLength(2);
    });
  });

  describe("terminate-all primitive", () => {
    it("requests termination for only this host's own agents", async () => {
      await controller.terminateAll();

      expect([...terminator.calls.map((call) => call.agentName)].sort()).toEqual([
        "implementer",
        "reviewer",
      ]);
    });

    it("unregisters the running host and clears host-agent runtime after termination requests are sent", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");

      const result = await controller.terminateAll();

      expect(result).toEqual({ ok: true, hostId: identity.hostId });
      expect(api.listRunningHosts().hosts).toEqual([]);
      expect(api.listHostAgents({ hostId: identity.hostId }).agents).toEqual([]);
      expect(controller.listAgents()).toEqual([]);
      expect(controller.getIdentity()).toBeNull();
    });

    it("never calls anything resembling a surface close — the handle contract has no such method", async () => {
      await controller.terminateAll();

      for (const call of fake.calls) {
        expect(Object.keys(call.request)).not.toContain("close");
      }
    });

    it("does not affect a different running host or standalone agents", async () => {
      const otherFake = createFakeHostAdapter({ id: "fake-b" });
      const registryB = createAdapterRegistry();
      registryB.register(otherFake);
      const otherTerminator = createFakeAgentRuntimeTerminator();
      const controllerB = createHostController({
        api,
        terminator: otherTerminator,
        createId,
      });
      const preparedB = await selectAndStaticPreflightAdapter(registryB, { cwd: "/repo/other" });
      if (!preparedB.ok) throw new Error("expected adapter preparation to succeed");
      const resultB = await controllerB.start({
        name: "other",
        path: "/repo/other",
        preparedAdapter: preparedB.preparedAdapter,
        agents: [{ name: "qa", kind: "codex" }],
      });
      if (!resultB.ok) throw new Error("expected the second host to start");

      await controller.terminateAll();

      expect(api.listRunningHosts().hosts.map((h) => h.name)).toEqual(["other"]);
      expect(api.listHostAgents({ hostId: resultB.hostId }).agents).toHaveLength(1);
      expect(otherTerminator.calls).toEqual([]);
    });

    it("returns a deterministic failure on a duplicate terminate-all instead of throwing or double-unregistering", async () => {
      const first = await controller.terminateAll();
      expect(first.ok).toBe(true);

      const second = await controller.terminateAll();
      expect(second).toEqual({ ok: false, reason: "host_not_running" });

      const third = await controller.terminateAll();
      expect(third).toEqual({ ok: false, reason: "host_not_running" });
    });
  });

  describe("terminate-all with a partial termination failure", () => {
    it("normalizes a rejected direct termination and preserves the failed agent and host", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      terminator.rejectFor("implementer", "signal delivery failed");

      const result = await controller.terminateAll();

      expect(result).toEqual({
        ok: false,
        reason: "termination_failed",
        failures: [{ name: "implementer", reason: "signal delivery failed" }],
      });
      expect(api.listRunningHosts().hosts).toHaveLength(1);
      expect(controller.listAgents().map((agent) => agent.name)).toEqual(["implementer"]);
      expect(api.listHostAgents({ hostId: identity.hostId }).agents.map((agent) => agent.name)).toEqual([
        "implementer",
      ]);
    });

    it("direct terminateAll reports a structured failure, keeps the failed agent tracked and its row, and does not unregister the host", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      terminator.failFor("implementer", "process did not exit");

      const result = await controller.terminateAll();

      expect(result).toEqual({
        ok: false,
        reason: "termination_failed",
        failures: [{ name: "implementer", reason: "process did not exit" }],
      });
      expect(api.listRunningHosts().hosts).toHaveLength(1);
      expect(controller.listAgents().map((a) => a.name)).toEqual(["implementer"]);
      const remaining = api.listHostAgents({ hostId: identity.hostId }).agents.map((a) => a.name);
      expect(remaining).toContain("implementer");
      expect(remaining).not.toContain("reviewer");
    });

    it("relayed terminate_all completes the control request with a structured failure and keeps the host running", async () => {
      terminator.failFor("reviewer", "kill signal ignored");
      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      if (!submitted.ok) throw new Error("expected submit to succeed");

      const outcome = await controller.handleNextControlRequest();

      expect(outcome).toEqual({
        claimed: true,
        requestId: submitted.requestId,
        kind: "terminate_all",
        result: { ok: false, failures: [{ name: "reviewer", reason: "kill signal ignored" }] },
      });
      expect(api.listRunningHosts().hosts).toHaveLength(1);
      const taken = api.takeHostControlRequestResult({ requestId: submitted.requestId });
      expect(taken).toEqual({
        ok: true,
        status: "completed",
        result: { ok: false, failures: [{ name: "reviewer", reason: "kill signal ignored" }] },
      });
    });

    it("completes a relayed terminate_all when one agent termination rejects", async () => {
      terminator.rejectFor("reviewer", "signal delivery failed");
      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      if (!submitted.ok) throw new Error("expected submit to succeed");

      const outcome = await controller.handleNextControlRequest();

      expect(outcome).toEqual({
        claimed: true,
        requestId: submitted.requestId,
        kind: "terminate_all",
        result: { ok: false, failures: [{ name: "reviewer", reason: "signal delivery failed" }] },
      });
      expect(api.takeHostControlRequestResult({ requestId: submitted.requestId })).toEqual({
        ok: true,
        status: "completed",
        result: { ok: false, failures: [{ name: "reviewer", reason: "signal delivery failed" }] },
      });
      expect(api.listRunningHosts().hosts).toHaveLength(1);
      expect(controller.listAgents().map((agent) => agent.name)).toEqual(["reviewer"]);
    });

    it("does not affect a different running host or standalone agents when this host's termination partially fails", async () => {
      const otherFake = createFakeHostAdapter({ id: "fake-b" });
      const registryB = createAdapterRegistry();
      registryB.register(otherFake);
      const otherTerminator = createFakeAgentRuntimeTerminator();
      const controllerB = createHostController({
        api,
        terminator: otherTerminator,
        createId,
      });
      const preparedB = await selectAndStaticPreflightAdapter(registryB, { cwd: "/repo/other" });
      if (!preparedB.ok) throw new Error("expected adapter preparation to succeed");
      const resultB = await controllerB.start({
        name: "other",
        path: "/repo/other",
        preparedAdapter: preparedB.preparedAdapter,
        agents: [{ name: "qa", kind: "codex" }],
      });
      if (!resultB.ok) throw new Error("expected the second host to start");

      terminator.failFor("implementer", "process did not exit");
      await controller.terminateAll();

      expect(api.listRunningHosts().hosts.map((h) => h.name).sort()).toEqual(["demo", "other"]);
      expect(api.listHostAgents({ hostId: resultB.hostId }).agents).toHaveLength(1);
      expect(otherTerminator.calls).toEqual([]);
    });
  });

  describe("terminate-all vs. unregister failure (Blocker 3 correction)", () => {
    it("direct terminateAll never resets state before the daemon confirms the host is actually gone, when unregisterRunningHost rejects", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      vi.spyOn(api, "unregisterRunningHost").mockRejectedValueOnce(
        new Error("daemon socket closed before response"),
      );

      const result = await controller.terminateAll();

      expect(result).toEqual({
        ok: false,
        reason: "host_unregister_failed",
        detail: "daemon socket closed before response",
      });
      // Every agent was actually terminated, but identity/host survive the
      // unconfirmed unregister -- a second terminateAll() must still be able
      // to find this host.
      expect(controller.getIdentity()).toEqual(identity);
      expect(api.listRunningHosts().hosts).toHaveLength(1);
    });

    it("direct terminateAll never resets state when unregisterRunningHost returns a structured failure", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      vi.spyOn(api, "unregisterRunningHost").mockReturnValueOnce({
        ok: false,
        reason: "host_not_running",
        hostId: identity.hostId,
      });

      const result = await controller.terminateAll();

      expect(result).toEqual({
        ok: false,
        reason: "host_unregister_failed",
        detail: "host_not_running",
      });
      expect(controller.getIdentity()).toEqual(identity);
    });

    it("relayed terminate_all preserves host/controller identity and completes the request with a structured failure when the atomic unregister call rejects", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      vi.spyOn(api, "completeTerminateAllAndUnregisterHost").mockRejectedValueOnce(
        new Error("daemon socket closed before response"),
      );
      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      if (!submitted.ok) throw new Error("expected submit to succeed");

      const outcome = await controller.handleNextControlRequest();

      expect(outcome).toEqual({
        claimed: true,
        requestId: submitted.requestId,
        kind: "terminate_all",
        result: {
          ok: false,
          reason: "host_unregister_failed",
          detail: "daemon socket closed before response",
        },
      });
      expect(controller.getIdentity()).toEqual(identity);
      expect(api.listRunningHosts().hosts).toHaveLength(1);
      expect(api.takeHostControlRequestResult({ requestId: submitted.requestId })).toEqual({
        ok: true,
        status: "completed",
        result: {
          ok: false,
          reason: "host_unregister_failed",
          detail: "daemon socket closed before response",
        },
      });
    });

    it("relayed terminate_all preserves identity and reports the daemon's own failure reason when the host has already unregistered", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      vi.spyOn(api, "completeTerminateAllAndUnregisterHost").mockReturnValueOnce({
        ok: true,
        unregistered: false,
        reason: "host_not_running",
      });
      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      if (!submitted.ok) throw new Error("expected submit to succeed");

      const outcome = await controller.handleNextControlRequest();

      expect(outcome).toEqual({
        claimed: true,
        requestId: submitted.requestId,
        kind: "terminate_all",
        result: { ok: false, reason: "host_not_running" },
      });
      // The mock intercepted the real daemon call, so the host row was never
      // actually touched -- controller identity must reflect that faithfully.
      expect(controller.getIdentity()).toEqual(identity);
      expect(api.listRunningHosts().hosts).toHaveLength(1);
    });

    it("relayed terminate_all's success path unregisters the host and completes the request atomically -- never one without the other", async () => {
      const identity = controller.getIdentity();
      if (!identity) throw new Error("expected the controller to have started a host");
      const submitted = api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
      if (!submitted.ok) throw new Error("expected submit to succeed");

      const outcome = await controller.handleNextControlRequest();

      expect(outcome).toEqual({
        claimed: true,
        requestId: submitted.requestId,
        kind: "terminate_all",
        result: { ok: true },
      });
      expect(api.listRunningHosts().hosts).toEqual([]);
      expect(controller.getIdentity()).toBeNull();
      expect(api.takeHostControlRequestResult({ requestId: submitted.requestId })).toEqual({
        ok: true,
        status: "completed",
        result: { ok: true },
      });
    });
  });
});
