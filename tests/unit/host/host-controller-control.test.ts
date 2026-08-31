import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState, type DaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";
import { createAdapterRegistry } from "../../../src/host/adapter-registry.js";
import {
  createFakeAgentRuntimeTerminator,
  type FakeAgentRuntimeTerminator,
} from "../../../src/host/fake-agent-runtime-terminator.js";
import { createFakeHostAdapter, type FakeHostAdapter } from "../../../src/host/fake-host-adapter.js";
import { createHostController, type HostController } from "../../../src/host/host-controller.js";

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
    controller = createHostController({ api, registry, terminator, createId });
    await controller.start({
      name: "demo",
      path: "/repo/demo",
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

    for (const kind of ["host_add", "host_remove", "host_route"] as const) {
      it(`completes a ${kind} control request with an explicit not-supported result instead of leaving it pending`, async () => {
        const submitted = api.submitHostControlRequest({ name: "demo", kind });
        if (!submitted.ok) throw new Error("expected submit to succeed");

        const outcome = await controller.handleNextControlRequest();

        expect(outcome).toEqual({
          claimed: true,
          requestId: submitted.requestId,
          kind,
          result: { ok: false, reason: "not_supported_in_current_stage" },
        });
        const taken = api.takeHostControlRequestResult({ requestId: submitted.requestId });
        expect(taken).toEqual({
          ok: true,
          status: "completed",
          result: { ok: false, reason: "not_supported_in_current_stage" },
        });
        // The host itself must still be running: an unsupported mutation is a
        // declined request, not a reason to tear the host down.
        expect(api.listRunningHosts().hosts).toHaveLength(1);
      });
    }
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
        registry: registryB,
        terminator: otherTerminator,
        createId,
      });
      const resultB = await controllerB.start({
        name: "other",
        path: "/repo/other",
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
        registry: registryB,
        terminator: otherTerminator,
        createId,
      });
      const resultB = await controllerB.start({
        name: "other",
        path: "/repo/other",
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
});
