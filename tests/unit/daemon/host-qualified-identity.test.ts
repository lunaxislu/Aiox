import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi, type DaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { createRouteRepository } from "../../../src/store/repositories/routes.js";
import { applySchema } from "../../../src/store/schema.js";

// W6 Stage 5A — host-qualified routable identity. A host selector
// `(hostId, agentName)` is resolved to a routable agent id at attach; that id
// (never a bare name) is authoritative afterward. Standalone selectors
// (bare name) keep their pre-Stage-5A behavior unchanged.

describe("host-qualified agent identity", () => {
  let db: Database;
  let nextId: number;
  let api: DaemonApi;

  function createId(): string {
    return `id-${nextId++}`;
  }

  async function registerHost(name: string, path: string): Promise<string> {
    const result = await api.registerRunningHost({
      name,
      path,
      controllerId: `controller-${name}`,
      agents: [
        { name: "reviewer", kind: "claude" },
        { name: "impl", kind: "codex" },
      ],
    });
    if (!result.ok) {
      throw new Error(`expected registerRunningHost(${name}) to succeed`);
    }
    return result.host.id;
  }

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
    nextId = 1;
    api = createDaemonApi(
      createDaemonState({
        db,
        createId,
        now: () => "2026-08-31T00:00:00.000Z",
      }),
    );
  });

  afterEach(() => {
    db.close();
  });

  describe("Increment 1 — selector resolution and no-side-effect rejection", () => {
    it("a standalone name selector resolves attach and detach to the same agent id", async () => {
      const attached = await api.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
      expect(attached.ok).toBe(true);
      if (!attached.ok) throw new Error("expected attach to succeed");

      const detached = await api.detachAgent({ agentName: "reviewer" });
      expect(detached).toEqual({ ok: true, agentName: "reviewer", detached: true });
    });

    it("a hostId + agentName selector attaches and detaches the correct host-scoped agent", async () => {
      const hostId = await registerHost("demo", "/repo/demo");
      const [declaredReviewer] = (await api.listHostAgents({ hostId })).agents.filter(
        (agent) => agent.name === "reviewer",
      );

      const attached = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/demo",
        hostId,
      });
      expect(attached.ok).toBe(true);
      if (!attached.ok) throw new Error("expected attach to succeed");
      expect(attached.agent.id).toBe(declaredReviewer?.id);

      const detached = await api.detachAgent({ agentName: "reviewer", hostId });
      expect(detached).toEqual({ ok: true, agentName: "reviewer", detached: true });
    });

    it("rejects attach against a hostId that is not a running host, before any side effect", async () => {
      const before = await api.status();

      const attached = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/ghost",
        hostId: "ghost-host",
      });

      expect(attached).toEqual({ ok: false, reason: "host_not_running", hostId: "ghost-host" });

      // No agent row, and codexChannelToken/claudeChannelToken were never
      // issued -- no runtime/token/channel side effect occurred.
      const after = await api.status();
      expect(after.agents).toEqual(before.agents);
      expect(after.agents).toEqual([]);
    });

    it("rejects a host selector whose agent name was not declared for that host, before any side effect", async () => {
      const registered = await api.registerRunningHost({
        name: "demo",
        path: "/repo/demo",
        controllerId: "controller-demo",
        agents: [{ name: "reviewer", kind: "claude" }],
      });
      if (!registered.ok) throw new Error("expected host registration to succeed");
      const before = await api.status();

      const attached = await api.attachAgent({
        kind: "claude",
        name: "undeclared",
        cwd: "/repo/demo",
        hostId: registered.host.id,
      });

      expect(attached).toEqual({
        ok: false,
        reason: "host_agent_not_found",
        hostId: registered.host.id,
        agentName: "undeclared",
      });
      expect((await api.status()).agents).toEqual(before.agents);
    });

    it("detach with a hostId that has no matching agentName is a no-op and leaves other agents untouched", async () => {
      const hostId = await registerHost("demo", "/repo/demo");
      const standalone = await api.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
      expect(standalone.ok).toBe(true);

      const detached = await api.detachAgent({ agentName: "never-attached", hostId });
      expect(detached).toEqual({ ok: true, agentName: "never-attached", detached: false });

      // The unrelated standalone "reviewer" is untouched.
      expect(await api.listReachablePeers({ agentName: "reviewer" })).toEqual({
        ok: true,
        peers: [],
      });
    });

    it("detach against the wrong host does not remove a same-named agent registered under a different host", async () => {
      const hostA = await registerHost("host-a", "/repo/host-a");
      const hostB = await registerHost("host-b", "/repo/host-b");

      const attached = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/host-a",
        hostId: hostA,
      });
      expect(attached.ok).toBe(true);

      // hostB never had a "reviewer" agent; detaching by (hostB, "reviewer")
      // must not touch hostA's "reviewer" row.
      const mismatchedDetach = await api.detachAgent({ agentName: "reviewer", hostId: hostB });
      expect(mismatchedDetach).toEqual({ ok: true, agentName: "reviewer", detached: false });

      // hostA's agent is still attached: a correctly-scoped detach succeeds.
      const correctDetach = await api.detachAgent({ agentName: "reviewer", hostId: hostA });
      expect(correctDetach).toEqual({ ok: true, agentName: "reviewer", detached: true });
    });
  });

  describe("Increment 2 — same-name Host A / Host B / standalone concurrent attach", () => {
    it("attaches Host A/reviewer, Host B/reviewer, and standalone/reviewer at the same time with three distinct routable ids", async () => {
      const hostA = await registerHost("host-a", "/repo/host-a");
      const hostB = await registerHost("host-b", "/repo/host-b");

      const standalone = await api.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
      const onHostA = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/host-a",
        hostId: hostA,
      });
      const onHostB = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/host-b",
        hostId: hostB,
      });

      expect(standalone.ok && onHostA.ok && onHostB.ok).toBe(true);
      if (!standalone.ok || !onHostA.ok || !onHostB.ok) {
        throw new Error("expected all three concurrent attaches to succeed");
      }

      const ids = [standalone.agent.id, onHostA.agent.id, onHostB.agent.id];
      expect(new Set(ids).size).toBe(3);

      // All three display as "reviewer" in status/agents_list -- the routable
      // id split is internal and never surfaces as a renamed/encoded identity.
      expect(standalone.agent.name).toBe("reviewer");
      expect(onHostA.agent.name).toBe("reviewer");
      expect(onHostB.agent.name).toBe("reviewer");

      const status = await api.status();
      const reviewerNames = status.agents
        .filter((agent) => agent.name === "reviewer")
        .map((agent) => agent.id);
      expect(new Set(reviewerNames)).toEqual(new Set(ids));
    });

    it("rejects a duplicate agent name attached twice under the same host", async () => {
      const hostId = await registerHost("demo", "/repo/demo");

      const first = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/demo",
        hostId,
      });
      expect(first.ok).toBe(true);

      const duplicate = await api.attachAgent({
        kind: "codex",
        name: "reviewer",
        cwd: "/repo/demo",
        hostId,
      });

      expect(duplicate.ok).toBe(false);
      if (duplicate.ok) throw new Error("expected duplicate host-scoped attach to be rejected");
      expect(duplicate.reason).toBe("agent_name_already_connected");
    });

    it("each same-named agent's agents_list call is scoped to its own selector, not conflated with the others", async () => {
      const hostA = await registerHost("host-a", "/repo/host-a");
      const hostB = await registerHost("host-b", "/repo/host-b");

      await api.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
      await api.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo/host-a", hostId: hostA });
      await api.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo/host-b", hostId: hostB });

      // No routes declared for any of them yet -- each of the three
      // same-named "reviewer" selectors independently resolves to its own
      // empty peer list instead of erroring or aliasing another scope.
      expect(await api.listReachablePeers({ agentName: "reviewer" })).toEqual({
        ok: true,
        peers: [],
      });
      expect(await api.listReachablePeers({ agentName: "reviewer", hostId: hostA })).toEqual({
        ok: true,
        peers: [],
      });
      expect(await api.listReachablePeers({ agentName: "reviewer", hostId: hostB })).toEqual({
        ok: true,
        peers: [],
      });
    });
  });

  describe("Increment 3 — ID-keyed Codex/Claude runtime/token/channel registration and lookup", () => {
    it("same-named Codex runtimes do not collide across two hosts", async () => {
      const codexRuntimes = new Map();
      const seenAttachRequests: unknown[] = [];
      let codexIdCounter = 0;
      const scopedApi = createDaemonApi(
        createDaemonState({
          db,
          createId,
          now: () => "2026-08-31T00:00:00.000Z",
          codexRuntimes,
          attachCodexRuntime: async (request) => {
            codexIdCounter += 1;
            seenAttachRequests.push(request);
            return fakeCodexRuntime(`thread-${codexIdCounter}`);
          },
        }),
      );
      api = scopedApi;

      const hostA = await registerHost("host-a", "/repo/host-a");
      const hostB = await registerHost("host-b", "/repo/host-b");

      const onHostA = await api.attachAgent({
        kind: "codex",
        name: "impl",
        cwd: "/repo/host-a",
        hostId: hostA,
      });
      const onHostB = await api.attachAgent({
        kind: "codex",
        name: "impl",
        cwd: "/repo/host-b",
        hostId: hostB,
      });

      if (!onHostA.ok || !onHostB.ok) {
        throw new Error("expected both codex attaches to succeed");
      }

      expect(codexRuntimes.size).toBe(2);
      expect(codexRuntimes.get(onHostA.agent.id)).toBeDefined();
      expect(codexRuntimes.get(onHostB.agent.id)).toBeDefined();
      expect(codexRuntimes.get(onHostA.agent.id)).not.toBe(codexRuntimes.get(onHostB.agent.id));
    });

    it("same-named Claude pending token/channel registrations do not collide across two hosts", async () => {
      const claudeChannelRuntimes = new Map();
      const scopedApi = createDaemonApi(
        createDaemonState({
          db,
          createId,
          now: () => "2026-08-31T00:00:00.000Z",
          claudeChannelRuntimes,
        }),
      );
      api = scopedApi;

      const hostA = await registerHost("host-a", "/repo/host-a");
      const hostB = await registerHost("host-b", "/repo/host-b");

      const onHostA = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/host-a",
        hostId: hostA,
      });
      const onHostB = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/host-b",
        hostId: hostB,
      });
      if (!onHostA.ok || !onHostB.ok) {
        throw new Error("expected both claude attaches to succeed");
      }

      const registeredA = await api.registerClaudeChannel({
        agentName: "reviewer",
        hostId: hostA,
        token: onHostA.claudeChannelToken!,
        endpoint: "http://127.0.0.1:18789/send",
      });
      const registeredB = await api.registerClaudeChannel({
        agentName: "reviewer",
        hostId: hostB,
        token: onHostB.claudeChannelToken!,
        endpoint: "http://127.0.0.1:18790/send",
      });

      expect(registeredA.ok).toBe(true);
      expect(registeredB.ok).toBe(true);
      expect(claudeChannelRuntimes.size).toBe(2);
      expect(claudeChannelRuntimes.get(onHostA.agent.id)).toMatchObject({
        endpoint: "http://127.0.0.1:18789/send",
      });
      expect(claudeChannelRuntimes.get(onHostB.agent.id)).toMatchObject({
        endpoint: "http://127.0.0.1:18790/send",
      });
    });

    it("rejects a valid token presented against the wrong host selector", async () => {
      const hostA = await registerHost("host-a", "/repo/host-a");
      const hostB = await registerHost("host-b", "/repo/host-b");

      const onHostA = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/host-a",
        hostId: hostA,
      });
      await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/host-b",
        hostId: hostB,
      });
      if (!onHostA.ok) throw new Error("expected hostA attach to succeed");

      // hostA's real token, but addressed at hostB's "reviewer" selector.
      const crossed = await api.registerClaudeChannel({
        agentName: "reviewer",
        hostId: hostB,
        token: onHostA.claudeChannelToken!,
        endpoint: "http://127.0.0.1:18789/send",
      });

      expect(crossed).toMatchObject({
        ok: false,
        reason: "claude_channel_registration_failed",
        detail: "unknown_token",
      });
    });

    it("one agent's channel registration/boot-failure does not affect a same-named agent on another host", async () => {
      const claudeChannelRuntimes = new Map();
      api = createDaemonApi(
        createDaemonState({
          db,
          createId,
          now: () => "2026-08-31T00:00:00.000Z",
          claudeChannelRuntimes,
        }),
      );

      const hostA = await registerHost("host-a", "/repo/host-a");
      const hostB = await registerHost("host-b", "/repo/host-b");

      const onHostA = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/host-a",
        hostId: hostA,
      });
      const onHostB = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/host-b",
        hostId: hostB,
      });
      if (!onHostA.ok || !onHostB.ok) {
        throw new Error("expected both claude attaches to succeed");
      }

      await api.registerClaudeChannel({
        agentName: "reviewer",
        hostId: hostA,
        token: onHostA.claudeChannelToken!,
        endpoint: "http://127.0.0.1:18789/send",
      });
      await api.registerClaudeChannel({
        agentName: "reviewer",
        hostId: hostB,
        token: onHostB.claudeChannelToken!,
        endpoint: "http://127.0.0.1:18790/send",
      });

      // hostA's reviewer disconnects; hostB's same-named reviewer must be untouched.
      const disconnected = await api.disconnectClaudeChannel({
        agentName: "reviewer",
        hostId: hostA,
      });
      expect(disconnected).toMatchObject({ ok: true, disconnected: true });

      expect(claudeChannelRuntimes.has(onHostA.agent.id)).toBe(false);
      expect(claudeChannelRuntimes.get(onHostB.agent.id)).toMatchObject({
        endpoint: "http://127.0.0.1:18790/send",
      });

      // hostA's agent row is gone; hostB's is still reachable via its own selector.
      expect(await api.listReachablePeers({ agentName: "reviewer", hostId: hostA })).toEqual({
        ok: false,
        reason: "source_agent_not_found",
        sourceName: "reviewer",
      });
      expect(await api.listReachablePeers({ agentName: "reviewer", hostId: hostB })).toEqual({
        ok: true,
        peers: [],
      });
    });
  });

  describe("Increment 4 — ID-isolated message, route, detach, and cleanup", () => {
    it("treats a hosted Claude channel boot failure as agent-local detach", async () => {
      const hostA = await registerHost("host-a", "/repo/host-a");
      const hostB = await registerHost("host-b", "/repo/host-b");
      const onHostA = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/host-a",
        hostId: hostA,
      });
      const onHostB = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/host-b",
        hostId: hostB,
      });
      const standalone = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/standalone",
      });
      if (!onHostA.ok || !onHostB.ok || !standalone.ok) {
        throw new Error("expected all Claude agents to attach");
      }
      if (!onHostA.claudeChannelToken) throw new Error("expected hosted Claude token");

      await expect(
        api.reportClaudeChannelBootFailure({
          agentName: "reviewer",
          hostId: hostA,
          token: onHostA.claudeChannelToken,
          reason: "claude_channel_port_in_use",
        }),
      ).resolves.toEqual({ ok: true, agentName: "reviewer", recorded: true });

      expect(
        (await api.listHostAgents({ hostId: hostA })).agents.map((agent) => agent.name),
      ).toEqual(["impl"]);
      expect((await api.listHostAgents({ hostId: hostB })).agents).toHaveLength(2);
      expect((await api.status()).agents.map((agent) => agent.id)).toEqual([
        onHostB.agent.id,
        standalone.agent.id,
      ]);
      expect((await api.listRunningHosts()).hosts).toHaveLength(2);
    });

    it("routes and cleans up same-named agents by routable id without touching another host or standalone", async () => {
      const hostA = await registerHost("host-a", "/repo/host-a");
      const hostB = await registerHost("host-b", "/repo/host-b");
      const onHostA = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/host-a",
        hostId: hostA,
      });
      const onHostB = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/host-b",
        hostId: hostB,
      });
      const standalone = await api.attachAgent({
        kind: "claude",
        name: "reviewer",
        cwd: "/repo/standalone",
      });
      if (!onHostA.ok || !onHostB.ok || !standalone.ok) {
        throw new Error("expected all same-named agents to attach");
      }

      const routes = createRouteRepository(db);
      routes.create({
        id: "route-a-to-b",
        sourceAgentId: onHostA.agent.id,
        targetAgentId: onHostB.agent.id,
        now: "2026-08-31T00:00:00.000Z",
      });
      routes.create({
        id: "route-b-to-standalone",
        sourceAgentId: onHostB.agent.id,
        targetAgentId: standalone.agent.id,
        now: "2026-08-31T00:00:00.000Z",
      });
      routes.create({
        id: "route-standalone-to-a",
        sourceAgentId: standalone.agent.id,
        targetAgentId: onHostA.agent.id,
        now: "2026-08-31T00:00:00.000Z",
      });

      const sent = await api.sendMessage({
        sourceName: "reviewer",
        sourceHostId: hostA,
        messageId: "host-a-message",
        type: "instruction",
        content: "review host B",
      });
      expect(sent.ok).toBe(true);
      if (!sent.ok) throw new Error("expected host-A message to be routed");
      expect(sent.message.sourceAgentId).toBe(onHostA.agent.id);
      expect(sent.deliveries.map((delivery) => delivery.targetAgentId)).toEqual([
        onHostB.agent.id,
      ]);

      await api.detachAgent({ agentName: "reviewer", hostId: hostA });
      const status = await api.status();
      expect(status.agents.map((agent) => agent.id)).toEqual([
        onHostB.agent.id,
        standalone.agent.id,
      ]);
      expect(status.routes).toEqual([
        expect.objectContaining({
          id: "route-b-to-standalone",
          sourceAgentId: onHostB.agent.id,
          targetAgentId: standalone.agent.id,
        }),
      ]);
    });
  });
});

function fakeCodexRuntime(threadId: string) {
  return {
    state: "ready" as const,
    endpoint: new URL("ws://127.0.0.1:0/"),
    activeThreadId: threadId,
    async startThread() {
      return threadId;
    },
    async resumeThread(requestedThreadId: string) {
      return requestedThreadId;
    },
    async listLoadedThreadIds() {
      return [threadId];
    },
    rebindActiveThread() {},
    async dispose() {},
  };
}
