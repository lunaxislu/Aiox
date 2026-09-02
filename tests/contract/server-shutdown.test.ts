import { describe, expect, it } from "vitest";

import { createGatewayState } from "../../apps/server/src/gateway/state/gateway-state.js";
import {
  ServerAdmissionClosedError,
  createShutdownCoordinator,
} from "../../apps/server/src/gateway/state/shutdown-coordinator.js";

function runningState() {
  const state = createGatewayState({ serverEpoch: "epoch-stop" });
  state.setServerLifecycle("running");
  return state;
}

describe("Local Server shutdown admission barrier", () => {
  it("rejects normal stop with normalized blockers and reopens admission", async () => {
    const state = runningState();
    const shutdown = createShutdownCoordinator({ gatewayState: state });
    shutdown.registerDependency({ kind: "agent", id: "agent-2" });
    shutdown.registerDependency({ kind: "terminal", id: "terminal-1" });

    const stop = shutdown.prepareStop(false);

    expect(state.snapshot().server.lifecycle).toBe("quiescing");
    expect(() =>
      shutdown.registerDependency({ kind: "agent", id: "late-agent" }),
    ).toThrow(ServerAdmissionClosedError);
    expect(() => shutdown.admit(async () => {})).toThrow(
      ServerAdmissionClosedError,
    );
    await expect(stop).resolves.toEqual({
      accepted: false,
      force: false,
      blockers: [
        { kind: "agent", id: "agent-2" },
        { kind: "terminal", id: "terminal-1" },
      ],
      residualRisk: false,
    });
    expect(state.snapshot().server.lifecycle).toBe("running");
    expect(() =>
      shutdown.registerDependency({ kind: "agent", id: "after-rejection" }),
    ).not.toThrow();
  });

  it("waits for pre-barrier operations and includes dependencies they register", async () => {
    const state = runningState();
    const shutdown = createShutdownCoordinator({ gatewayState: state });
    let continueOperation: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      continueOperation = resolve;
    });
    const operation = shutdown.admit(async (admission) => {
      await gate;
      admission.registerDependency({ kind: "host", id: "host-from-operation" });
    });

    const stop = shutdown.prepareStop(false);
    expect(state.snapshot().server.lifecycle).toBe("quiescing");
    continueOperation?.();
    await operation;

    await expect(stop).resolves.toMatchObject({
      accepted: false,
      blockers: [{ kind: "host", id: "host-from-operation" }],
    });
  });

  it("force bypasses only blocker rejection and preserves residual evidence", async () => {
    const state = runningState();
    const shutdown = createShutdownCoordinator({ gatewayState: state });
    shutdown.registerDependency({ kind: "agent", id: "agent-live" });

    await expect(shutdown.prepareStop(true)).resolves.toEqual({
      accepted: true,
      force: true,
      blockers: [{ kind: "agent", id: "agent-live" }],
      residualRisk: true,
    });
    expect(state.snapshot().server.lifecycle).toBe("stopping");

    shutdown.completeStop();
    expect(state.snapshot().server.lifecycle).toBe("stopped");
  });

  it("keeps a blocker until every registration reference is released", async () => {
    const state = runningState();
    const shutdown = createShutdownCoordinator({ gatewayState: state });
    const firstRelease = shutdown.registerDependency({
      kind: "operation",
      id: "shared-operation",
    });
    shutdown.registerDependency({
      kind: "operation",
      id: "shared-operation",
    });
    firstRelease();

    await expect(shutdown.prepareStop(false)).resolves.toMatchObject({
      accepted: false,
      blockers: [{ kind: "operation", id: "shared-operation" }],
    });
  });

  it("returns one in-flight stop result without changing its mode", async () => {
    const state = runningState();
    const shutdown = createShutdownCoordinator({ gatewayState: state });
    const first = shutdown.prepareStop(false);
    const second = shutdown.prepareStop(true);

    expect(second).toBe(first);
    await expect(second).resolves.toMatchObject({
      accepted: true,
      force: false,
    });
  });
});
