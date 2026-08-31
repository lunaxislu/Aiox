import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonState, type DaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";

describe("daemon running-host runtime", () => {
  let db: Database;
  let state: DaemonState;
  let nextId: number;

  function createState(): DaemonState {
    return createDaemonState({
      db,
      createId: () => `id-${nextId++}`,
      now: () => "2026-08-27T00:00:00.000Z",
    });
  }

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
    nextId = 1;
    state = createState();
  });

  afterEach(() => {
    db.close();
  });

  describe("running host registry", () => {
    it("registers a running host and issues an internal host id", () => {
      const result = state.registerRunningHost({
        name: "demo",
        path: "/repo/demo",
        controllerId: "controller-1",
      });

      expect(result).toEqual({
        ok: true,
        host: {
          id: "id-1",
          name: "demo",
          canonicalPath: "/repo/demo",
          controllerId: "controller-1",
          createdAt: "2026-08-27T00:00:00.000Z",
          lastSeenAt: "2026-08-27T00:00:00.000Z",
        },
        agents: [],
      });
    });

    it("canonicalizes the declared path before storing it", () => {
      const result = state.registerRunningHost({
        name: "demo",
        path: "/repo/./nested/../demo/",
        controllerId: "controller-1",
      });

      expect(result).toMatchObject({ ok: true, host: { canonicalPath: "/repo/demo" } });
      expect(state.lookupRunningHost({ name: "demo", path: "/repo/demo" })).toMatchObject({
        ok: true,
        host: { canonicalPath: "/repo/demo" },
      });
    });

    it("rejects a relative host path instead of resolving it against the daemon cwd", () => {
      expect(
        state.registerRunningHost({
          name: "demo",
          path: "relative/demo",
          controllerId: "controller-1",
        }),
      ).toEqual({ ok: false, reason: "host_path_not_absolute", path: "relative/demo" });
    });

    it("rejects a second running host on the same canonical path", () => {
      const first = state.registerRunningHost({
        name: "demo",
        path: "/repo/demo",
        controllerId: "controller-1",
      });
      if (!first.ok) throw new Error("expected the first registration to succeed");

      expect(
        state.registerRunningHost({
          name: "other",
          path: "/repo/demo/",
          controllerId: "controller-2",
        }),
      ).toEqual({ ok: false, reason: "host_already_running", host: first.host });
    });

    it("allows the same host name on different canonical paths", () => {
      expect(
        state.registerRunningHost({ name: "demo", path: "/a", controllerId: "c-1" }),
      ).toMatchObject({ ok: true });
      expect(
        state.registerRunningHost({ name: "demo", path: "/b", controllerId: "c-2" }),
      ).toMatchObject({ ok: true });

      expect(state.listRunningHosts().map((host) => host.canonicalPath)).toEqual(["/a", "/b"]);
    });

    it("reports a name that matches no running host as not running", () => {
      expect(state.lookupRunningHost({ name: "demo" })).toEqual({
        ok: false,
        reason: "host_not_running",
        name: "demo",
      });
    });

    it("resolves a name that matches exactly one running host", () => {
      const registered = state.registerRunningHost({
        name: "demo",
        path: "/a",
        controllerId: "c-1",
      });
      if (!registered.ok) throw new Error("expected registration to succeed");

      expect(state.lookupRunningHost({ name: "demo" })).toEqual({
        ok: true,
        host: registered.host,
      });
    });

    it("returns candidate canonical paths instead of picking one when a name matches many hosts", () => {
      state.registerRunningHost({ name: "demo", path: "/b", controllerId: "c-1" });
      state.registerRunningHost({ name: "demo", path: "/a", controllerId: "c-2" });

      expect(state.lookupRunningHost({ name: "demo" })).toEqual({
        ok: false,
        reason: "ambiguous_host_name",
        name: "demo",
        candidatePaths: ["/a", "/b"],
      });
    });

    it("disambiguates a duplicated name with an explicit path", () => {
      state.registerRunningHost({ name: "demo", path: "/a", controllerId: "c-1" });
      const second = state.registerRunningHost({
        name: "demo",
        path: "/b",
        controllerId: "c-2",
      });
      if (!second.ok) throw new Error("expected registration to succeed");

      expect(state.lookupRunningHost({ name: "demo", path: "/b" })).toEqual({
        ok: true,
        host: second.host,
      });
    });

    it("reports a name/path mismatch instead of falling back to the name match", () => {
      state.registerRunningHost({ name: "demo", path: "/a", controllerId: "c-1" });
      state.registerRunningHost({ name: "other", path: "/b", controllerId: "c-2" });

      expect(state.lookupRunningHost({ name: "demo", path: "/b" })).toEqual({
        ok: false,
        reason: "host_name_path_mismatch",
        name: "demo",
        canonicalPath: "/b",
        actualName: "other",
      });
    });

    it("reports an explicit path with no running host as not running", () => {
      state.registerRunningHost({ name: "demo", path: "/a", controllerId: "c-1" });

      expect(state.lookupRunningHost({ name: "demo", path: "/missing" })).toEqual({
        ok: false,
        reason: "host_not_running",
        name: "demo",
      });
    });

    it("removes an unregistered host from lookup and listing", () => {
      const registered = state.registerRunningHost({
        name: "demo",
        path: "/a",
        controllerId: "c-1",
      });
      if (!registered.ok) throw new Error("expected registration to succeed");

      expect(state.unregisterRunningHost({ hostId: registered.host.id })).toEqual({
        ok: true,
        host: registered.host,
        removedAgents: [],
        cancelledRequestIds: [],
      });
      expect(state.lookupRunningHost({ name: "demo" })).toEqual({
        ok: false,
        reason: "host_not_running",
        name: "demo",
      });
      expect(state.listRunningHosts()).toEqual([]);
      expect(state.unregisterRunningHost({ hostId: registered.host.id })).toEqual({
        ok: false,
        reason: "host_not_running",
        hostId: registered.host.id,
      });
    });

    it("frees the canonical path for a new running host after unregister", () => {
      const first = state.registerRunningHost({
        name: "demo",
        path: "/a",
        controllerId: "c-1",
      });
      if (!first.ok) throw new Error("expected registration to succeed");
      state.unregisterRunningHost({ hostId: first.host.id });

      expect(
        state.registerRunningHost({ name: "demo", path: "/a", controllerId: "c-2" }),
      ).toMatchObject({ ok: true, host: { controllerId: "c-2" } });
    });

    it("drops running-host runtime state left behind by a previous daemon", () => {
      state.registerRunningHost({ name: "demo", path: "/a", controllerId: "c-1" });

      const restarted = createState();

      expect(restarted.listRunningHosts()).toEqual([]);
      expect(restarted.lookupRunningHost({ name: "demo" })).toEqual({
        ok: false,
        reason: "host_not_running",
        name: "demo",
      });
      expect(
        restarted.registerRunningHost({ name: "demo", path: "/a", controllerId: "c-2" }),
      ).toMatchObject({ ok: true });
    });
  });

  describe("host-scoped agent namespace", () => {
    function registerHost(name: string, path: string): string {
      const result = state.registerRunningHost({ name, path, controllerId: `${name}-ctl` });
      if (!result.ok) throw new Error(`expected ${name} to register`);
      return result.host.id;
    }

    it("registers a host-scoped agent as starting with its declared metadata", () => {
      const hostId = registerHost("demo", "/a");

      const result = state.registerHostAgent({
        hostId,
        name: "reviewer",
        kind: "claude",
        role: "review",
        description: "reviews the implementation",
        instructions: "separate observation from inference",
      });

      expect(result).toEqual({
        ok: true,
        agent: {
          id: "id-2",
          hostId,
          name: "reviewer",
          kind: "claude",
          status: "starting",
          role: "review",
          description: "reviews the implementation",
          instructions: "separate observation from inference",
          createdAt: "2026-08-27T00:00:00.000Z",
          updatedAt: "2026-08-27T00:00:00.000Z",
        },
      });
      expect(state.listHostAgents({ hostId })).toEqual([
        result.ok ? result.agent : null,
      ]);
    });

    it("rejects a duplicate agent name inside the same host", () => {
      const hostId = registerHost("demo", "/a");
      const first = state.registerHostAgent({ hostId, name: "reviewer", kind: "claude" });
      if (!first.ok) throw new Error("expected the first agent to register");

      expect(
        state.registerHostAgent({ hostId, name: "reviewer", kind: "codex" }),
      ).toEqual({
        ok: false,
        reason: "host_agent_name_already_registered",
        existing: first.agent,
      });
      expect(state.listHostAgents({ hostId })).toHaveLength(1);
    });

    it("allows the same agent name under different hosts and alongside a standalone agent", async () => {
      const hostA = registerHost("a", "/a");
      const hostB = registerHost("b", "/b");

      await expect(
        state.attachAgent({ kind: "claude", name: "reviewer", cwd: "/standalone" }),
      ).resolves.toMatchObject({ ok: true, agent: { name: "reviewer" } });
      expect(state.registerHostAgent({ hostId: hostA, name: "reviewer", kind: "claude" })).toMatchObject({
        ok: true,
        agent: { hostId: hostA, name: "reviewer" },
      });
      expect(state.registerHostAgent({ hostId: hostB, name: "reviewer", kind: "claude" })).toMatchObject({
        ok: true,
        agent: { hostId: hostB, name: "reviewer" },
      });

      expect(state.listHostAgents({ hostId: hostA }).map((agent) => agent.name)).toEqual([
        "reviewer",
      ]);
      expect(state.listHostAgents({ hostId: hostB }).map((agent) => agent.name)).toEqual([
        "reviewer",
      ]);
      expect(state.status().agents.map((agent) => agent.name)).toEqual(["reviewer"]);
    });

    it("rejects host-scoped agent registration for a host that is not running", () => {
      expect(
        state.registerHostAgent({ hostId: "missing", name: "reviewer", kind: "claude" }),
      ).toEqual({ ok: false, reason: "host_not_running", hostId: "missing" });
    });

    it("promotes a starting agent to ready only when the spawn is reported", () => {
      const hostId = registerHost("demo", "/a");
      state.registerHostAgent({ hostId, name: "reviewer", kind: "claude" });

      expect(state.listHostAgents({ hostId })[0]?.status).toBe("starting");
      expect(state.markHostAgentReady({ hostId, agentName: "reviewer" })).toMatchObject({
        ok: true,
        agent: { name: "reviewer", status: "ready" },
      });
      expect(state.listHostAgents({ hostId })[0]?.status).toBe("ready");
    });

    it("reports an unknown agent name on ready and detach", () => {
      const hostId = registerHost("demo", "/a");

      expect(state.markHostAgentReady({ hostId, agentName: "ghost" })).toEqual({
        ok: false,
        reason: "host_agent_not_found",
        hostId,
        agentName: "ghost",
      });
      expect(state.detachHostAgent({ hostId, agentName: "ghost" })).toEqual({
        ok: false,
        reason: "host_agent_not_found",
        hostId,
        agentName: "ghost",
      });
    });

    it("deletes the host-scoped agent runtime on detach", () => {
      const hostId = registerHost("demo", "/a");
      const registered = state.registerHostAgent({ hostId, name: "reviewer", kind: "claude" });
      if (!registered.ok) throw new Error("expected the agent to register");

      expect(state.detachHostAgent({ hostId, agentName: "reviewer" })).toEqual({
        ok: true,
        agent: registered.agent,
      });
      expect(state.listHostAgents({ hostId })).toEqual([]);
      expect(state.registerHostAgent({ hostId, name: "reviewer", kind: "codex" })).toMatchObject({
        ok: true,
      });
    });

    it("registers an initial agent batch atomically with the host", () => {
      const result = state.registerRunningHost({
        name: "demo",
        path: "/a",
        controllerId: "c-1",
        agents: [
          { name: "reviewer", kind: "claude" },
          { name: "implementer", kind: "codex", role: "implementation" },
        ],
      });
      if (!result.ok) throw new Error("expected registration to succeed");

      expect(result.agents.map((agent) => [agent.name, agent.status])).toEqual([
        ["reviewer", "starting"],
        ["implementer", "starting"],
      ]);
      expect(state.listHostAgents({ hostId: result.host.id })).toHaveLength(2);
    });

    it("rolls the whole registration back when an agent in the initial batch is a duplicate", () => {
      expect(
        state.registerRunningHost({
          name: "demo",
          path: "/a",
          controllerId: "c-1",
          agents: [
            { name: "reviewer", kind: "claude" },
            { name: "reviewer", kind: "codex" },
          ],
        }),
      ).toEqual({
        ok: false,
        reason: "host_agent_name_already_registered",
        agentName: "reviewer",
      });

      expect(state.listRunningHosts()).toEqual([]);
      expect(state.lookupRunningHost({ name: "demo" })).toEqual({
        ok: false,
        reason: "host_not_running",
        name: "demo",
      });
      expect(
        db.prepare("select count(*) as count from host_agents").get(),
      ).toEqual({ count: 0 });
    });

    it("keeps the host and earlier agents when an incremental registration fails", () => {
      const hostId = registerHost("demo", "/a");
      state.registerHostAgent({ hostId, name: "reviewer", kind: "claude" });
      state.registerHostAgent({ hostId, name: "implementer", kind: "codex" });

      expect(
        state.registerHostAgent({ hostId, name: "reviewer", kind: "codex" }),
      ).toMatchObject({ ok: false, reason: "host_agent_name_already_registered" });

      expect(state.listHostAgents({ hostId }).map((agent) => agent.name)).toEqual([
        "reviewer",
        "implementer",
      ]);
      expect(state.lookupRunningHost({ name: "demo" })).toMatchObject({ ok: true });
    });

    it("cascades host unregister to its own agents only", async () => {
      const hostA = registerHost("a", "/a");
      const hostB = registerHost("b", "/b");
      await state.attachAgent({ kind: "claude", name: "reviewer", cwd: "/standalone" });
      const removed = state.registerHostAgent({ hostId: hostA, name: "reviewer", kind: "claude" });
      state.registerHostAgent({ hostId: hostB, name: "reviewer", kind: "claude" });
      if (!removed.ok) throw new Error("expected the agent to register");

      expect(state.unregisterRunningHost({ hostId: hostA })).toMatchObject({
        ok: true,
        removedAgents: [removed.agent],
      });

      expect(state.listHostAgents({ hostId: hostA })).toEqual([]);
      expect(state.listHostAgents({ hostId: hostB })).toHaveLength(1);
      expect(state.status().agents.map((agent) => agent.name)).toEqual(["reviewer"]);
    });
  });

  describe("existing-daemon control relay", () => {
    function registerHost(name: string, path: string, controllerId: string): string {
      const result = state.registerRunningHost({ name, path, controllerId });
      if (!result.ok) throw new Error(`expected ${name} to register`);
      return result.host.id;
    }

    function submit(
      name: string,
      overrides: { path?: string; kind?: "host_add" | "terminate_all" } = {},
    ) {
      return state.submitHostControlRequest({
        name,
        ...(overrides.path === undefined ? {} : { path: overrides.path }),
        kind: overrides.kind ?? "host_add",
        payload: { agents: [{ name: "qa", kind: "codex" }] },
      });
    }

    it("accepts a request for a running host and leaves it pending", () => {
      const hostId = registerHost("demo", "/a", "ctl-1");

      const submitted = submit("demo");

      expect(submitted).toEqual({ ok: true, requestId: "id-2", hostId });
      expect(state.takeHostControlRequestResult({ requestId: "id-2" })).toEqual({
        ok: true,
        status: "pending",
      });
    });

    it("rejects a request for a name that is not running", () => {
      expect(submit("demo")).toEqual({
        ok: false,
        reason: "host_not_running",
        name: "demo",
      });
    });

    it("rejects an ambiguous name without a path and accepts it with one", () => {
      registerHost("demo", "/a", "ctl-1");
      const hostB = registerHost("demo", "/b", "ctl-2");

      expect(submit("demo")).toEqual({
        ok: false,
        reason: "ambiguous_host_name",
        name: "demo",
        candidatePaths: ["/a", "/b"],
      });
      expect(submit("demo", { path: "/b" })).toMatchObject({ ok: true, hostId: hostB });
    });

    it("rejects a name/path mismatch", () => {
      registerHost("demo", "/a", "ctl-1");
      registerHost("other", "/b", "ctl-2");

      expect(submit("demo", { path: "/b" })).toEqual({
        ok: false,
        reason: "host_name_path_mismatch",
        name: "demo",
        canonicalPath: "/b",
        actualName: "other",
      });
    });

    it("hands a pending request to the owning foreground controller", () => {
      const hostId = registerHost("demo", "/a", "ctl-1");
      const submitted = submit("demo");
      if (!submitted.ok) throw new Error("expected submit to succeed");

      const claimed = state.claimHostControlRequest({ hostId, controllerId: "ctl-1" });

      expect(claimed).toEqual({
        ok: true,
        request: {
          id: submitted.requestId,
          hostId,
          kind: "host_add",
          payload: { agents: [{ name: "qa", kind: "codex" }] },
          status: "claimed",
          claimedBy: "ctl-1",
          result: null,
          failureReason: null,
          createdAt: "2026-08-27T00:00:00.000Z",
          updatedAt: "2026-08-27T00:00:00.000Z",
        },
      });
      expect(state.takeHostControlRequestResult({ requestId: submitted.requestId })).toEqual({
        ok: true,
        status: "claimed",
      });
    });

    it("returns no request when the controller has nothing pending", () => {
      const hostId = registerHost("demo", "/a", "ctl-1");

      expect(state.claimHostControlRequest({ hostId, controllerId: "ctl-1" })).toEqual({
        ok: true,
        request: null,
      });
    });

    it("claims pending requests in submission order and never claims one twice", () => {
      const hostId = registerHost("demo", "/a", "ctl-1");
      const first = submit("demo");
      const second = submit("demo");
      if (!first.ok || !second.ok) throw new Error("expected both submits to succeed");

      expect(
        state.claimHostControlRequest({ hostId, controllerId: "ctl-1" }),
      ).toMatchObject({ ok: true, request: { id: first.requestId } });
      expect(
        state.claimHostControlRequest({ hostId, controllerId: "ctl-1" }),
      ).toMatchObject({ ok: true, request: { id: second.requestId } });
      expect(state.claimHostControlRequest({ hostId, controllerId: "ctl-1" })).toEqual({
        ok: true,
        request: null,
      });
    });

    it("returns the controller result to the requester exactly once", () => {
      const hostId = registerHost("demo", "/a", "ctl-1");
      const submitted = submit("demo");
      if (!submitted.ok) throw new Error("expected submit to succeed");
      state.claimHostControlRequest({ hostId, controllerId: "ctl-1" });

      expect(
        state.completeHostControlRequest({
          requestId: submitted.requestId,
          controllerId: "ctl-1",
          result: { ok: true, startedAgents: ["qa"] },
        }),
      ).toMatchObject({ ok: true, request: { status: "completed" } });

      expect(state.takeHostControlRequestResult({ requestId: submitted.requestId })).toEqual({
        ok: true,
        status: "completed",
        result: { ok: true, startedAgents: ["qa"] },
      });
      expect(state.takeHostControlRequestResult({ requestId: submitted.requestId })).toEqual({
        ok: false,
        reason: "host_control_request_not_found",
        requestId: submitted.requestId,
      });
    });

    it("refuses a claim from a controller that does not own the host", () => {
      const hostId = registerHost("demo", "/a", "ctl-1");
      submit("demo");

      expect(state.claimHostControlRequest({ hostId, controllerId: "ctl-2" })).toEqual({
        ok: false,
        reason: "host_controller_mismatch",
        hostId,
        controllerId: "ctl-2",
      });
    });

    it("never exposes one host's request to another host's controller", () => {
      registerHost("a", "/a", "ctl-a");
      const hostB = registerHost("b", "/b", "ctl-b");
      const submitted = submit("a");
      if (!submitted.ok) throw new Error("expected submit to succeed");

      expect(state.claimHostControlRequest({ hostId: hostB, controllerId: "ctl-b" })).toEqual({
        ok: true,
        request: null,
      });
      expect(
        state.completeHostControlRequest({
          requestId: submitted.requestId,
          controllerId: "ctl-b",
          result: { ok: true },
        }),
      ).toEqual({
        ok: false,
        reason: "host_control_request_not_claimed",
        requestId: submitted.requestId,
        status: "pending",
      });
    });

    it("refuses a completion from a controller that did not claim the request", () => {
      const hostId = registerHost("demo", "/a", "ctl-1");
      const submitted = submit("demo");
      if (!submitted.ok) throw new Error("expected submit to succeed");
      state.claimHostControlRequest({ hostId, controllerId: "ctl-1" });

      expect(
        state.completeHostControlRequest({
          requestId: submitted.requestId,
          controllerId: "ctl-2",
          result: { ok: true },
        }),
      ).toEqual({
        ok: false,
        reason: "host_controller_mismatch",
        requestId: submitted.requestId,
        controllerId: "ctl-2",
      });
    });

    it("refuses a second completion of the same request", () => {
      const hostId = registerHost("demo", "/a", "ctl-1");
      const submitted = submit("demo");
      if (!submitted.ok) throw new Error("expected submit to succeed");
      state.claimHostControlRequest({ hostId, controllerId: "ctl-1" });
      state.completeHostControlRequest({
        requestId: submitted.requestId,
        controllerId: "ctl-1",
        result: { ok: true },
      });

      expect(
        state.completeHostControlRequest({
          requestId: submitted.requestId,
          controllerId: "ctl-1",
          result: { ok: true },
        }),
      ).toEqual({
        ok: false,
        reason: "host_control_request_not_claimed",
        requestId: submitted.requestId,
        status: "completed",
      });
    });

    it("reports an unknown request id to both the controller and the requester", () => {
      expect(
        state.completeHostControlRequest({
          requestId: "ghost",
          controllerId: "ctl-1",
          result: { ok: true },
        }),
      ).toEqual({
        ok: false,
        reason: "host_control_request_not_found",
        requestId: "ghost",
      });
      expect(state.takeHostControlRequestResult({ requestId: "ghost" })).toEqual({
        ok: false,
        reason: "host_control_request_not_found",
        requestId: "ghost",
      });
    });

    it("fails in-flight requests deterministically when the target host unregisters", () => {
      const hostId = registerHost("demo", "/a", "ctl-1");
      const pending = submit("demo");
      const claimedRequest = submit("demo");
      if (!pending.ok || !claimedRequest.ok) throw new Error("expected both submits to succeed");
      state.claimHostControlRequest({ hostId, controllerId: "ctl-1" });

      expect(state.unregisterRunningHost({ hostId })).toMatchObject({
        ok: true,
        cancelledRequestIds: [pending.requestId, claimedRequest.requestId],
      });

      expect(state.takeHostControlRequestResult({ requestId: pending.requestId })).toEqual({
        ok: true,
        status: "failed",
        failureReason: "host_unregistered",
      });
      expect(
        state.takeHostControlRequestResult({ requestId: claimedRequest.requestId }),
      ).toEqual({ ok: true, status: "failed", failureReason: "host_unregistered" });
    });

    it("leaves another host's in-flight requests untouched on unregister", () => {
      const hostA = registerHost("a", "/a", "ctl-a");
      registerHost("b", "/b", "ctl-b");
      const forB = submit("b");
      if (!forB.ok) throw new Error("expected submit to succeed");

      state.unregisterRunningHost({ hostId: hostA });

      expect(state.takeHostControlRequestResult({ requestId: forB.requestId })).toEqual({
        ok: true,
        status: "pending",
      });
    });

    it("carries a terminate-all request with no payload", () => {
      const hostId = registerHost("demo", "/a", "ctl-1");

      const submitted = state.submitHostControlRequest({
        name: "demo",
        kind: "terminate_all",
      });
      if (!submitted.ok) throw new Error("expected submit to succeed");

      expect(
        state.claimHostControlRequest({ hostId, controllerId: "ctl-1" }),
      ).toMatchObject({
        ok: true,
        request: { kind: "terminate_all", payload: null },
      });
    });
  });
});
