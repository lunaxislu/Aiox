import { mkdtempSync } from "node:fs";
import { join } from "node:path";

import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonServer } from "../../../src/daemon/server.js";
import {
  createDaemonSocketClient,
  createDaemonSocketServer,
} from "../../../src/daemon/socket-transport.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";

describe("running-host runtime over the daemon API", () => {
  let db: Database;
  let nextId: number;

  function createApi() {
    return createDaemonApi(
      createDaemonState({
        db,
        createId: () => `id-${nextId++}`,
        now: () => "2026-08-28T00:00:00.000Z",
      }),
    );
  }

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
    nextId = 1;
  });

  afterEach(() => {
    db.close();
  });

  it("exposes the running-host registry and host-scoped agents as API DTOs", async () => {
    const api = createApi();

    const registered = await api.registerRunningHost({
      name: "demo",
      path: "/repo/demo",
      controllerId: "controller-1",
      agents: [{ name: "reviewer", kind: "claude", role: "review" }],
    });

    expect(registered).toEqual({
      ok: true,
      host: {
        id: "id-1",
        name: "demo",
        canonicalPath: "/repo/demo",
        controllerId: "controller-1",
        createdAt: "2026-08-28T00:00:00.000Z",
        lastSeenAt: "2026-08-28T00:00:00.000Z",
      },
      agents: [
        {
          id: "id-2",
          hostId: "id-1",
          name: "reviewer",
          kind: "claude",
          status: "starting",
          role: "review",
          description: null,
          instructions: null,
        },
      ],
    });

    expect(await api.lookupRunningHost({ name: "demo" })).toMatchObject({
      ok: true,
      host: { id: "id-1" },
    });
    expect(await api.listRunningHosts()).toEqual({
      ok: true,
      hosts: [registered.ok ? registered.host : null],
    });
    expect(await api.markHostAgentReady({ hostId: "id-1", agentName: "reviewer" })).toMatchObject({
      ok: true,
      agent: { name: "reviewer", status: "ready" },
    });
    expect(await api.listHostAgents({ hostId: "id-1" })).toMatchObject({
      ok: true,
      agents: [{ name: "reviewer", status: "ready" }],
    });
  });

  it("relays a host mutation request from another client to the owning controller and back", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-host-relay-"), "daemon.sock");
    const server = createDaemonSocketServer({ api: createApi(), socketPath });
    const handle = await server.start();
    const controller = createDaemonSocketClient({ socketPath });
    const requester = createDaemonSocketClient({ socketPath });

    try {
      const registered = await controller.registerRunningHost({
        name: "demo",
        path: "/repo/demo",
        controllerId: "controller-1",
      });
      if (!registered.ok) throw new Error("expected the host to register");

      const submitted = await requester.submitHostControlRequest({
        name: "demo",
        kind: "host_add",
        payload: { agents: [{ name: "qa", kind: "codex" }] },
      });
      if (!submitted.ok) throw new Error("expected the request to be accepted");

      const claimed = await controller.claimHostControlRequest({
        hostId: registered.host.id,
        controllerId: "controller-1",
      });
      expect(claimed).toMatchObject({
        ok: true,
        request: {
          id: submitted.requestId,
          kind: "host_add",
          payload: { agents: [{ name: "qa", kind: "codex" }] },
          status: "claimed",
        },
      });

      expect(
        await controller.completeHostControlRequest({
          requestId: submitted.requestId,
          controllerId: "controller-1",
          result: { ok: true, startedAgents: ["qa"] },
        }),
      ).toMatchObject({ ok: true, request: { status: "completed" } });

      expect(
        await requester.takeHostControlRequestResult({ requestId: submitted.requestId }),
      ).toEqual({
        ok: true,
        status: "completed",
        result: { ok: true, startedAgents: ["qa"] },
      });
    } finally {
      controller.close();
      requester.close();
      await handle.close();
    }
  });

  it("fails a relayed request over the socket when the target host unregisters first", async () => {
    const socketPath = join(mkdtempSync("/private/tmp/aiox-host-relay-"), "daemon.sock");
    const server = createDaemonSocketServer({ api: createApi(), socketPath });
    const handle = await server.start();
    const controller = createDaemonSocketClient({ socketPath });
    const requester = createDaemonSocketClient({ socketPath });

    try {
      const registered = await controller.registerRunningHost({
        name: "demo",
        path: "/repo/demo",
        controllerId: "controller-1",
      });
      if (!registered.ok) throw new Error("expected the host to register");

      const submitted = await requester.submitHostControlRequest({
        name: "demo",
        kind: "terminate_all",
      });
      if (!submitted.ok) throw new Error("expected the request to be accepted");

      await controller.unregisterRunningHost({ hostId: registered.host.id });

      expect(
        await requester.takeHostControlRequestResult({ requestId: submitted.requestId }),
      ).toEqual({ ok: true, status: "failed", failureReason: "host_unregistered" });
      expect(
        await requester.submitHostControlRequest({ name: "demo", kind: "terminate_all" }),
      ).toEqual({ ok: false, reason: "host_not_running", name: "demo" });
    } finally {
      controller.close();
      requester.close();
      await handle.close();
    }
  });

  it("starts a restarted daemon server with an empty running-host registry", async () => {
    const first = createDaemonServer({
      db,
      createId: () => `id-${nextId++}`,
      now: () => "2026-08-28T00:00:00.000Z",
    }).start();

    const registered = await first.api.registerRunningHost({
      name: "demo",
      path: "/repo/demo",
      controllerId: "controller-1",
      agents: [{ name: "reviewer", kind: "claude" }],
    });
    if (!registered.ok) throw new Error("expected the host to register");
    await first.api.submitHostControlRequest({ name: "demo", kind: "terminate_all" });
    await first.stop({ daemonOnly: true });

    const restarted = createDaemonServer({
      db,
      createId: () => `id-${nextId++}`,
      now: () => "2026-08-28T00:00:00.000Z",
    }).start();

    expect(await restarted.api.listRunningHosts()).toEqual({ ok: true, hosts: [] });
    expect(await restarted.api.listHostAgents({ hostId: registered.host.id })).toEqual({
      ok: true,
      agents: [],
    });
    expect(
      db.prepare("select count(*) as count from host_control_requests").get(),
    ).toEqual({ count: 0 });
  });

  it("keeps standalone agents independent of host-scoped agents with the same name", async () => {
    const api = createApi();
    await api.attachAgent({ kind: "claude", name: "reviewer", cwd: "/standalone" });
    const hostA = await api.registerRunningHost({
      name: "a",
      path: "/a",
      controllerId: "ctl-a",
      agents: [{ name: "reviewer", kind: "claude" }],
    });
    const hostB = await api.registerRunningHost({
      name: "b",
      path: "/b",
      controllerId: "ctl-b",
      agents: [{ name: "reviewer", kind: "claude" }],
    });
    if (!hostA.ok || !hostB.ok) throw new Error("expected both hosts to register");

    await api.unregisterRunningHost({ hostId: hostA.host.id });

    const status = api.status();
    expect(status.agents.map((agent) => agent.name)).toEqual(["reviewer"]);
    expect(await api.listHostAgents({ hostId: hostA.host.id })).toEqual({
      ok: true,
      agents: [],
    });
    expect(await api.listHostAgents({ hostId: hostB.host.id })).toMatchObject({
      ok: true,
      agents: [{ name: "reviewer" }],
    });
    expect(api.listReachablePeers({ agentName: "reviewer" })).toEqual({
      ok: true,
      peers: [],
    });
  });
});
