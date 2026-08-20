import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";

// G2 W? — agents_list no-input MCP tool. See docs/specs/aiox-message-lifecycle.md
// §4.2: `peers` is scoped to outbound-sendable targets only (routes where the
// caller is the source), an empty result is a normal `{ peers: [] }` response
// (not an error), and missing role/description render as `null`.

describe("daemon listReachablePeers store persistence", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("returns only outbound-sendable peers with role/description, never private instructions, and maps Claude to the claude-code wire type", async () => {
    const ids = ["agent-impl", "agent-reviewer", "agent-bystander", "route-impl-reviewer"];
    const state = createDaemonState({
      db,
      createId: () => {
        const id = ids.shift();
        if (!id) {
          throw new Error("unexpected id request");
        }
        return id;
      },
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await client.attachAgent({
      kind: "claude",
      name: "reviewer",
      cwd: "/repo",
      role: "architect",
      description: "reviews the diff",
      instructions: "keep private review notes out of peer discovery",
    });
    // Not connected to impl — must not appear in impl's peers.
    await client.attachAgent({ kind: "claude", name: "bystander", cwd: "/repo" });

    await client.connect({ sourceName: "impl", targetNames: ["reviewer"] });

    expect(await client.listReachablePeers({ agentName: "impl" })).toEqual({
      ok: true,
      peers: [
        {
          name: "reviewer",
          type: "claude-code",
          role: "architect",
          description: "reviews the diff",
        },
      ],
    });
  });

  it("renders {peers: []} — not an error — when the caller has no active outbound route", async () => {
    const ids = ["agent-impl", "agent-reviewer"];
    const state = createDaemonState({
      db,
      createId: () => {
        const id = ids.shift();
        if (!id) {
          throw new Error("unexpected id request");
        }
        return id;
      },
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });

    expect(await client.listReachablePeers({ agentName: "impl" })).toEqual({
      ok: true,
      peers: [],
    });
  });

  it("renders missing role/description as null, not omitted", async () => {
    const ids = ["agent-impl", "agent-reviewer", "route-impl-reviewer"];
    const state = createDaemonState({
      db,
      createId: () => {
        const id = ids.shift();
        if (!id) {
          throw new Error("unexpected id request");
        }
        return id;
      },
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });

    await client.connect({ sourceName: "impl", targetNames: ["reviewer"] });

    const result = await client.listReachablePeers({ agentName: "impl" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok result");
    expect(result.peers).toEqual([
      { name: "reviewer", type: "claude-code", role: null, description: null },
    ]);
  });

  it("does not return a peer reachable only via the inbound-only direction of a directed route", async () => {
    const ids = ["agent-impl", "agent-reviewer", "route-reviewer-impl"];
    const state = createDaemonState({
      db,
      createId: () => {
        const id = ids.shift();
        if (!id) {
          throw new Error("unexpected id request");
        }
        return id;
      },
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });

    // Only reviewer -> impl is routable; impl has no outbound route to reviewer.
    await client.connect({ sourceName: "reviewer", targetNames: ["impl"] });

    expect(await client.listReachablePeers({ agentName: "impl" })).toEqual({
      ok: true,
      peers: [],
    });
    expect(await client.listReachablePeers({ agentName: "reviewer" })).toEqual({
      ok: true,
      peers: [{ name: "impl", type: "codex", role: null, description: null }],
    });
  });

  it("no longer returns a peer after it leaves (stale-peer fix): agents_list reverts to empty once the peer's row is removed", async () => {
    const ids = ["agent-impl", "agent-reviewer", "route-impl-reviewer", "event-1"];
    const state = createDaemonState({
      db,
      createId: () => {
        const id = ids.shift();
        if (!id) {
          throw new Error("unexpected id request");
        }
        return id;
      },
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
    await client.connect({ sourceName: "impl", targetNames: ["reviewer"] });

    expect(await client.listReachablePeers({ agentName: "impl" })).toEqual({
      ok: true,
      peers: [{ name: "reviewer", type: "claude-code", role: null, description: null }],
    });

    // "reviewer" leaves: detachAgent physically removes its row and route
    // (routes.removeAllForAgent) rather than status-flipping it, so it must
    // not keep showing up as a stale peer.
    await client.detachAgent({ agentName: "reviewer" });

    expect(await client.listReachablePeers({ agentName: "impl" })).toEqual({
      ok: true,
      peers: [],
    });
  });

  it("returns source_agent_not_found for an unknown caller name", async () => {
    const state = createDaemonState({
      db,
      createId: () => {
        throw new Error("unexpected id request");
      },
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    expect(await client.listReachablePeers({ agentName: "ghost" })).toEqual({
      ok: false,
      reason: "source_agent_not_found",
      sourceName: "ghost",
    });
  });
});

function createInProcessClient<TApi extends object>(api: TApi): TApi {
  return new Proxy(api, {
    get(target, property) {
      const value = Reflect.get(target, property);

      if (typeof value !== "function") {
        return value;
      }

      const fn = value as (...args: unknown[]) => unknown;

      return async (...args: unknown[]) => {
        const serializedArgs = JSON.parse(JSON.stringify(args));
        const response = await fn(...serializedArgs);

        return JSON.parse(JSON.stringify(response));
      };
    },
  });
}
