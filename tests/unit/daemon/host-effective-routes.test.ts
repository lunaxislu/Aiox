import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDaemonApi } from "../../../src/daemon/api.js";
import { createDaemonState } from "../../../src/daemon/state.js";
import { applySchema } from "../../../src/store/schema.js";

describe("host effective routes", () => {
  let db: InstanceType<typeof Database>;
  let nextId: number;
  let api: ReturnType<typeof createDaemonApi>;

  function createId(): string {
    nextId += 1;
    return `id-${nextId}`;
  }

  beforeEach(() => {
    db = new Database(":memory:");
    applySchema(db);
    nextId = 0;
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

  it("synchronizes a deduplicated directed edge set for the ready host-qualified subset", async () => {
    const registered = api.registerRunningHost({
      name: "demo",
      path: "/repo/demo",
      controllerId: "controller",
      agents: [
        { name: "reviewer", kind: "claude" },
        { name: "implementer", kind: "claude" },
        { name: "waiting", kind: "claude" },
      ],
    });
    if (!registered.ok) throw new Error("expected host registration");

    for (const name of ["reviewer", "implementer", "waiting"]) {
      const attached = await api.attachAgent({
        hostId: registered.host.id,
        kind: "claude",
        name,
        cwd: "/repo/demo",
      });
      if (!attached.ok) throw new Error(`expected ${name} attach`);
    }
    await api.markHostAgentReady({ hostId: registered.host.id, agentName: "reviewer" });
    await api.markHostAgentReady({ hostId: registered.host.id, agentName: "implementer" });

    const result = await api.syncHostEffectiveRoutes({
      hostId: registered.host.id,
      edges: [
        { sourceName: "reviewer", targetName: "implementer" },
        { sourceName: "implementer", targetName: "reviewer" },
        { sourceName: "reviewer", targetName: "implementer" },
        { sourceName: "reviewer", targetName: "waiting" },
      ],
    });

    expect(result).toMatchObject({ ok: true });
    expect(api.status().routes).toEqual([
      expect.objectContaining({
        sourceAgentId: registered.agents[0]!.id,
        targetAgentId: registered.agents[1]!.id,
      }),
      expect.objectContaining({
        sourceAgentId: registered.agents[1]!.id,
        targetAgentId: registered.agents[0]!.id,
      }),
    ]);
  });

  it("removes an incident effective edge after the host-agent runtime row is explicitly detached", async () => {
    const registered = api.registerRunningHost({
      name: "demo",
      path: "/repo/demo",
      controllerId: "controller",
      agents: [
        { name: "reviewer", kind: "claude" },
        { name: "implementer", kind: "claude" },
      ],
    });
    if (!registered.ok) throw new Error("expected host registration");
    for (const name of ["reviewer", "implementer"]) {
      const attached = await api.attachAgent({
        hostId: registered.host.id,
        kind: "claude",
        name,
        cwd: "/repo/demo",
      });
      if (!attached.ok) throw new Error(`expected ${name} attach`);
      await api.markHostAgentReady({ hostId: registered.host.id, agentName: name });
    }
    await api.syncHostEffectiveRoutes({
      hostId: registered.host.id,
      edges: [{ sourceName: "reviewer", targetName: "implementer" }],
    });
    expect(api.status().routes).toHaveLength(1);

    await api.detachHostAgent({ hostId: registered.host.id, agentName: "implementer" });
    await api.syncHostEffectiveRoutes({ hostId: registered.host.id, edges: [] });

    expect(api.status().routes).toEqual([]);
  });
});
