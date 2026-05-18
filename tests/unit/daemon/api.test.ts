import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";

describe("daemon API with fake in-process transport", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("registers an attached agent through a round-trip request", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
    });

    expect(response).toEqual({
      ok: true,
      agent: {
        id: "agent-1",
        name: "impl",
        kind: "codex",
        status: "connected",
        cwd: "/repo",
        pairId: null,
      },
    });
  });

  it("rejects pair attach when the pair does not exist without registering the agent", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
      pairName: "feature-x",
    });

    expect(response).toEqual({
      ok: false,
      reason: "pair_not_found",
      pairName: "feature-x",
    });
    expect(db.prepare("select id from agents").all()).toEqual([]);
  });

  it("creates a pair reservation through a round-trip request", async () => {
    const state = createDaemonState({
      db,
      createId: () => "pair-1",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    const response = await client.createPair({
      name: "feature-x",
    });

    expect(response).toEqual({
      ok: true,
      pair: {
        id: "pair-1",
        name: "feature-x",
        status: "pending",
      },
    });
  });

  it("rejects duplicate pair reservation names with a typed error", async () => {
    const state = createDaemonState({
      db,
      createId: () => "pair-1",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.createPair({
      name: "feature-x",
    });

    const response = await client.createPair({
      name: "feature-x",
    });

    expect(response).toEqual({
      ok: false,
      reason: "pair_name_already_exists",
      name: "feature-x",
    });
  });

  it("attaches an agent to an existing pair by pairName", async () => {
    const ids = ["pair-1", "agent-1"];
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

    await client.createPair({
      name: "feature-x",
    });

    const response = await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
      pairName: "feature-x",
    });

    expect(response).toEqual({
      ok: true,
      agent: {
        id: "agent-1",
        name: "impl",
        kind: "codex",
        status: "connected",
        cwd: "/repo",
        pairId: "pair-1",
      },
    });
  });

  it("connects one source to multiple targets and separates created from already existing routes", async () => {
    const ids = ["agent-source", "agent-one", "agent-two", "route-one", "route-two"];
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
    await client.attachAgent({ kind: "claude", name: "researcher", cwd: "/repo" });

    const first = await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer", "researcher"],
    });
    const second = await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer"],
    });

    expect(first).toEqual({
      ok: true,
      created: [
        {
          id: "route-one",
          sourceAgentId: "agent-source",
          targetAgentId: "agent-one",
          status: "active",
        },
        {
          id: "route-two",
          sourceAgentId: "agent-source",
          targetAgentId: "agent-two",
          status: "active",
        },
      ],
      alreadyExisted: [],
    });
    expect(second).toEqual({
      ok: true,
      created: [],
      alreadyExisted: [
        {
          id: "route-one",
          sourceAgentId: "agent-source",
          targetAgentId: "agent-one",
          status: "active",
        },
      ],
    });
  });

  it("rejects connect when the source agent does not exist without creating routes", async () => {
    const state = createDaemonState({
      db,
      createId: () => "route-1",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });

    const response = await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer"],
    });

    expect(response).toEqual({
      ok: false,
      reason: "source_agent_not_found",
      sourceName: "impl",
    });
    expect(db.prepare("select id from routes").all()).toEqual([]);
  });

  it("rejects connect when any target agent does not exist without creating partial routes", async () => {
    const ids = ["agent-source", "agent-one", "route-one"];
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

    const response = await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer", "missing"],
    });

    expect(response).toEqual({
      ok: false,
      reason: "target_agent_not_found",
      missing: ["missing"],
    });
    expect(db.prepare("select id from routes").all()).toEqual([]);
  });

  it("disconnects existing routes and ignores absent routes between existing agents", async () => {
    const ids = ["agent-source", "agent-one", "agent-two", "route-one"];
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
    await client.attachAgent({ kind: "claude", name: "researcher", cwd: "/repo" });
    await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer"],
    });

    const response = await client.disconnect({
      sourceName: "impl",
      targetNames: ["reviewer", "researcher"],
    });

    expect(response).toEqual({
      ok: true,
      removed: [
        {
          id: "route-one",
          sourceAgentId: "agent-source",
          targetAgentId: "agent-one",
          status: "active",
        },
      ],
    });
    expect(db.prepare("select id from routes").all()).toEqual([]);
  });

  it("rejects disconnect when the source or any target agent does not exist", async () => {
    const state = createDaemonState({
      db,
      createId: () => "agent-one",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });

    expect(
      await client.disconnect({
        sourceName: "impl",
        targetNames: ["reviewer"],
      }),
    ).toEqual({
      ok: false,
      reason: "source_agent_not_found",
      sourceName: "impl",
    });
    expect(
      await client.disconnect({
        sourceName: "reviewer",
        targetNames: ["missing"],
      }),
    ).toEqual({
      ok: false,
      reason: "target_agent_not_found",
      missing: ["missing"],
    });
  });

  it("returns empty daemon status through a round-trip request", async () => {
    const state = createDaemonState({
      db,
      createId: () => "unused",
      now: () => "2026-05-18T00:00:00.000Z",
    });
    const client = createInProcessClient(createDaemonApi(state));

    expect(await client.status()).toEqual({
      daemon: {
        startedAt: "2026-05-18T00:00:00.000Z",
      },
      agents: [],
      pairs: [],
      routes: [],
    });
  });

  it("returns agents, pairs, and routes in daemon status", async () => {
    const ids = ["pair-1", "agent-source", "agent-target", "route-1"];
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

    await client.createPair({ name: "feature-x" });
    await client.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
      pairName: "feature-x",
    });
    await client.attachAgent({ kind: "claude", name: "reviewer", cwd: "/repo" });
    await client.connect({
      sourceName: "impl",
      targetNames: ["reviewer"],
    });

    expect(await client.status()).toEqual({
      daemon: {
        startedAt: "2026-05-18T00:00:00.000Z",
      },
      agents: [
        {
          id: "agent-source",
          name: "impl",
          kind: "codex",
          status: "connected",
          cwd: "/repo",
          pairId: "pair-1",
        },
        {
          id: "agent-target",
          name: "reviewer",
          kind: "claude",
          status: "connected",
          cwd: "/repo",
          pairId: null,
        },
      ],
      pairs: [
        {
          id: "pair-1",
          name: "feature-x",
          status: "pending",
        },
      ],
      routes: [
        {
          id: "route-1",
          sourceAgentId: "agent-source",
          targetAgentId: "agent-target",
          status: "active",
        },
      ],
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
