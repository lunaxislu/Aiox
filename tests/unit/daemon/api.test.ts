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
        adapterSessionId: null,
        lastSeenAt: "2026-05-18T00:00:00.000Z",
        createdAt: "2026-05-18T00:00:00.000Z",
        updatedAt: "2026-05-18T00:00:00.000Z",
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
        createdAt: "2026-05-18T00:00:00.000Z",
        updatedAt: "2026-05-18T00:00:00.000Z",
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
});

function createInProcessClient<TApi extends object>(api: TApi): TApi {
  return new Proxy(api, {
    get(target, property) {
      const value = Reflect.get(target, property);

      if (typeof value !== "function") {
        return value;
      }

      const fn = value as (request: unknown) => unknown;

      return async (request: unknown) => fn(request);
    },
  });
}
