import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonServer } from "../../../src/daemon/server.js";
import type { Supervisor } from "../../../src/daemon/supervisor.js";
import { applySchema } from "../../../src/store/schema.js";

describe("daemon server lifecycle shell", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it("starts idempotently and exposes the daemon API", async () => {
    const server = createDaemonServer({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-18T00:00:00.000Z",
    });

    const first = server.start();
    const second = server.start();

    expect(second).toBe(first);
    expect(await first.api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" })).toEqual({
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

  it("stops supervisor and disconnects connected agents", async () => {
    const supervisor = createRecordingSupervisor();
    const server = createDaemonServer({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-18T00:00:00.000Z",
      supervisor,
    });
    const handle = server.start();

    await handle.api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    expect(await handle.stop()).toEqual({
      ok: true,
      stoppedAgents: [
        {
          id: "agent-1",
          name: "impl",
          kind: "codex",
          status: "disconnected",
          cwd: "/repo",
          pairId: null,
        },
      ],
    });
    expect(supervisor.stopCalls).toBe(1);
    expect((await handle.api.status()).agents[0]?.status).toBe("disconnected");
  });

  it("propagates daemonOnly stop without disconnecting connected agents", async () => {
    const supervisor = createRecordingSupervisor();
    const server = createDaemonServer({
      db,
      createId: () => "agent-1",
      now: () => "2026-05-18T00:00:00.000Z",
      supervisor,
    });
    const handle = server.start();

    await handle.api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });

    expect(await handle.stop({ daemonOnly: true })).toEqual({
      ok: true,
      stoppedAgents: [],
    });
    expect(supervisor.stopCalls).toBe(1);
    expect((await handle.api.status()).agents[0]?.status).toBe("connected");
  });

  it("reconnects an agent by name after restart", async () => {
    const ids = ["agent-1", "unused-new-agent-id"];
    const server = createDaemonServer({
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

    const first = server.start();
    await first.api.attachAgent({ kind: "codex", name: "impl", cwd: "/repo" });
    await first.stop();

    const second = server.start();
    const reattached = await second.api.attachAgent({
      kind: "codex",
      name: "impl",
      cwd: "/repo",
    });

    expect(reattached).toEqual({
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
});

function createRecordingSupervisor(): Supervisor & { stopCalls: number } {
  let state: Supervisor["state"] = "idle";

  return {
    stopCalls: 0,
    get state() {
      return state;
    },
    start() {
      state = "started";
    },
    stop() {
      this.stopCalls += 1;
      state = "stopped";
    },
  };
}
