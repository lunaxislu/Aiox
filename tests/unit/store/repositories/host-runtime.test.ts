import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createHostAgentRepository,
  type HostAgentRepository,
} from "../../../../src/store/repositories/host-agents.js";
import {
  createHostControlRequestRepository,
  type HostControlRequestRepository,
} from "../../../../src/store/repositories/host-control-requests.js";
import {
  createRunningHostRepository,
  type RunningHostRepository,
} from "../../../../src/store/repositories/running-hosts.js";
import { applySchema, purgeRunningHostRuntime } from "../../../../src/store/schema.js";

const now = "2026-08-28T00:00:00.000Z";

describe("SQLite running-host runtime repositories", () => {
  let db: Database;
  let hosts: RunningHostRepository;
  let hostAgents: HostAgentRepository;
  let controlRequests: HostControlRequestRepository;

  function insertHost(id: string, name: string, canonicalPath: string) {
    return hosts.insert({ id, name, canonicalPath, controllerId: `${id}-ctl`, now });
  }

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
    hosts = createRunningHostRepository(db);
    hostAgents = createHostAgentRepository(db);
    controlRequests = createHostControlRequestRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it("enforces one running host per canonical path in the schema itself", () => {
    insertHost("host-1", "demo", "/a");

    expect(() => insertHost("host-2", "other", "/a")).toThrow(/UNIQUE/i);
    expect(() => insertHost("host-2", "demo", "/b")).not.toThrow();
    expect(hosts.findAllByName("demo").map((host) => host.canonicalPath)).toEqual([
      "/a",
      "/b",
    ]);
  });

  it("scopes agent-name uniqueness to a single host in the schema itself", () => {
    insertHost("host-1", "a", "/a");
    insertHost("host-2", "b", "/b");
    hostAgents.insert({ id: "a-1", hostId: "host-1", name: "reviewer", kind: "claude", now });

    expect(() =>
      hostAgents.insert({ id: "a-2", hostId: "host-1", name: "reviewer", kind: "codex", now }),
    ).toThrow(/UNIQUE/i);
    expect(() =>
      hostAgents.insert({ id: "a-3", hostId: "host-2", name: "reviewer", kind: "claude", now }),
    ).not.toThrow();

    expect(hostAgents.listForHost("host-1")).toHaveLength(1);
    expect(hostAgents.listForHost("host-2")).toHaveLength(1);
    expect(hostAgents.removeAllForHost("host-1").map((agent) => agent.id)).toEqual(["a-1"]);
    expect(hostAgents.listForHost("host-2")).toHaveLength(1);
  });

  it("lets only the first claim and the first completion of a request win", () => {
    insertHost("host-1", "demo", "/a");
    controlRequests.insert({
      id: "req-1",
      hostId: "host-1",
      kind: "host_add",
      payload: { agents: [] },
      now,
    });

    expect(
      controlRequests.claim({ requestId: "req-1", controllerId: "ctl-1", now }),
    ).toMatchObject({ status: "claimed", claimedBy: "ctl-1" });
    expect(controlRequests.claim({ requestId: "req-1", controllerId: "ctl-2", now })).toBeNull();
    expect(controlRequests.findById("req-1")?.claimedBy).toBe("ctl-1");

    expect(
      controlRequests.complete({ requestId: "req-1", result: { ok: true }, now }),
    ).toMatchObject({ status: "completed", result: { ok: true } });
    expect(
      controlRequests.complete({ requestId: "req-1", result: { ok: false }, now }),
    ).toBeNull();
  });

  it("terminalizes only the in-flight requests of the given host", () => {
    insertHost("host-1", "a", "/a");
    insertHost("host-2", "b", "/b");
    controlRequests.insert({ id: "req-1", hostId: "host-1", kind: "terminate_all", now });
    controlRequests.insert({ id: "req-2", hostId: "host-1", kind: "host_add", now });
    controlRequests.insert({ id: "req-3", hostId: "host-2", kind: "host_add", now });
    controlRequests.claim({ requestId: "req-2", controllerId: "host-1-ctl", now });

    expect(
      controlRequests
        .failAllInFlightForHost({
          hostId: "host-1",
          failureReason: "host_unregistered",
          now,
        })
        .map((request) => request.id),
    ).toEqual(["req-1", "req-2"]);

    expect(controlRequests.findById("req-1")).toMatchObject({
      status: "failed",
      failureReason: "host_unregistered",
    });
    expect(controlRequests.findById("req-2")).toMatchObject({ status: "failed" });
    expect(controlRequests.findById("req-3")).toMatchObject({ status: "pending" });
  });

  it("drops every running-host runtime row on purge", () => {
    insertHost("host-1", "demo", "/a");
    hostAgents.insert({ id: "a-1", hostId: "host-1", name: "reviewer", kind: "claude", now });
    controlRequests.insert({ id: "req-1", hostId: "host-1", kind: "terminate_all", now });

    purgeRunningHostRuntime(db);

    expect(hosts.list()).toEqual([]);
    expect(hostAgents.listForHost("host-1")).toEqual([]);
    expect(controlRequests.findById("req-1")).toBeNull();
  });
});
