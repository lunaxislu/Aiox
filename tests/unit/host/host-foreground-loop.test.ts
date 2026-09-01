import { describe, expect, it, vi } from "vitest";

import type {
  HandleControlRequestResult,
  HostController,
  HostControllerIdentity,
} from "../../../src/host/host-controller.js";
import { defaultStartHostForegroundLoop } from "../../../src/host/host-foreground-loop.js";

/**
 * W6 Stage 5D: the smallest deterministic loop that repeats
 * `reconcile()` + `handleNextControlRequest()` (Stage 5B/5C's own
 * "no scheduler/event bus" principle) and stops once the controller's
 * identity goes null (a successful `terminate_all`, per the task record's
 * exit-condition wording). Uses a real, short `setInterval` -- these tests
 * poll for the expected call counts instead of faking the clock.
 *
 * Blocker "Foreground loop 보강" correction: a tick that throws is a real
 * daemon/host failure, not a transient condition worth retrying forever --
 * the loop stops itself and reports it exactly once through `onFatalError`
 * instead of logging to stderr and quietly continuing.
 */

function createFakeController(overrides: Partial<HostController> = {}): HostController {
  return {
    start: () => {
      throw new Error("not used by the foreground loop");
    },
    listAgents: () => [],
    reconcile: async () => {},
    terminateAll: () => {
      throw new Error("not used by the foreground loop");
    },
    handleNextControlRequest: async () => ({ claimed: false, reason: "no_pending_request" }),
    getIdentity: () => ({ hostId: "host-1", controllerId: "controller-1", name: "demo", path: "/repo" }),
    ...overrides,
  };
}

async function waitUntil(predicate: () => boolean, timeoutMs = 500): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() > deadline) {
      throw new Error("timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

describe("defaultStartHostForegroundLoop", () => {
  it("repeats reconcile and handleNextControlRequest on each tick", async () => {
    let reconcileCalls = 0;
    let controlCalls = 0;
    const controller = createFakeController({
      reconcile: async () => {
        reconcileCalls += 1;
      },
      handleNextControlRequest: async () => {
        controlCalls += 1;
        return { claimed: false, reason: "no_pending_request" };
      },
    });

    const stop = defaultStartHostForegroundLoop({
      controller,
      intervalMs: 5,
      onTerminated: () => {},
      onFatalError: () => {},
    });

    await waitUntil(() => reconcileCalls >= 3 && controlCalls >= 3);
    stop();
  });

  it("claims and processes another shell's control request through the existing relay", async () => {
    let claimed: HandleControlRequestResult | null = null;
    const controller = createFakeController({
      handleNextControlRequest: async () => {
        const result: HandleControlRequestResult = {
          claimed: true,
          requestId: "req-1",
          kind: "host_route",
          result: { ok: true, routes: [], effectiveEdgeCount: 0 },
        };
        claimed = result;
        return result;
      },
    });

    const stop = defaultStartHostForegroundLoop({
      controller,
      intervalMs: 5,
      onTerminated: () => {},
      onFatalError: () => {},
    });

    await waitUntil(() => claimed !== null);
    stop();
    expect(claimed).toMatchObject({ claimed: true, kind: "host_route" });
  });

  it("does not busy-spin: a slow tick is never re-entered before it finishes", async () => {
    let concurrentTicks = 0;
    let maxConcurrentTicks = 0;
    let tickStarts = 0;
    const controller = createFakeController({
      reconcile: async () => {
        tickStarts += 1;
        concurrentTicks += 1;
        maxConcurrentTicks = Math.max(maxConcurrentTicks, concurrentTicks);
        await new Promise((resolve) => setTimeout(resolve, 20));
        concurrentTicks -= 1;
      },
    });

    const stop = defaultStartHostForegroundLoop({
      controller,
      intervalMs: 1,
      onTerminated: () => {},
      onFatalError: () => {},
    });

    await waitUntil(() => tickStarts >= 2, 1000);
    stop();
    expect(maxConcurrentTicks).toBe(1);
  });

  it("calls onTerminated once the controller's identity goes null after a tick", async () => {
    let identity: HostControllerIdentity | null = {
      hostId: "host-1",
      controllerId: "controller-1",
      name: "demo",
      path: "/repo",
    };
    const controller = createFakeController({
      handleNextControlRequest: async () => {
        identity = null;
        return {
          claimed: true,
          requestId: "req-1",
          kind: "terminate_all",
          result: { ok: true, hostId: "host-1" },
        };
      },
      getIdentity: () => identity,
    });
    const onTerminated = vi.fn();

    const stop = defaultStartHostForegroundLoop({
      controller,
      intervalMs: 5,
      onTerminated,
      onFatalError: () => {},
    });

    await waitUntil(() => onTerminated.mock.calls.length >= 1);
    stop();
  });

  it("does not call onTerminated a second time even if a later tick would also see a null identity", async () => {
    const controller = createFakeController({ getIdentity: () => null });
    const onTerminated = vi.fn();

    const stop = defaultStartHostForegroundLoop({
      controller,
      intervalMs: 5,
      onTerminated,
      onFatalError: () => {},
    });

    await waitUntil(() => onTerminated.mock.calls.length >= 1);
    await new Promise((resolve) => setTimeout(resolve, 30));
    stop();
    expect(onTerminated).toHaveBeenCalledTimes(1);
  });

  it("a tick failure stops the loop and reports it through onFatalError exactly once, instead of retrying forever", async () => {
    let calls = 0;
    const stderr = { write: vi.fn() };
    const controller = createFakeController({
      reconcile: async () => {
        calls += 1;
        throw new Error("daemon socket closed before response");
      },
    });
    const onFatalError = vi.fn();

    const stop = defaultStartHostForegroundLoop({
      controller,
      intervalMs: 5,
      onTerminated: () => {},
      onFatalError,
      stderr,
    });

    await waitUntil(() => onFatalError.mock.calls.length >= 1);
    const callsAtFailure = calls;
    // No further ticks after the loop has stopped itself.
    await new Promise((resolve) => setTimeout(resolve, 30));
    stop();

    expect(calls).toBe(callsAtFailure);
    expect(onFatalError).toHaveBeenCalledTimes(1);
    expect(onFatalError).toHaveBeenCalledWith(expect.objectContaining({ message: "daemon socket closed before response" }));
    expect(stderr.write).toHaveBeenCalledWith(
      expect.stringContaining("daemon socket closed before response"),
    );
  });

  it("stop() clears the interval so no further ticks occur", async () => {
    let calls = 0;
    const controller = createFakeController({
      reconcile: async () => {
        calls += 1;
      },
    });

    const stop = defaultStartHostForegroundLoop({
      controller,
      intervalMs: 5,
      onTerminated: () => {},
      onFatalError: () => {},
    });
    await waitUntil(() => calls >= 1);
    stop();
    const callsAtStop = calls;
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(calls).toBe(callsAtStop);
  });
});
