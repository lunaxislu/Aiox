import { describe, expect, it, vi } from "vitest";

import type { DaemonApi, HostAgentDto } from "../../../src/daemon/api.js";
import { createProductionAgentRuntimeTerminator } from "../../../src/host/production-agent-runtime-terminator.js";

/**
 * W6 Stage 5D Blocker 4 correction: the daemon never spawns a host-scoped
 * agent's vendor process, so termination can no longer be a raw
 * `process.kill(pid, ...)` from this terminator's own process -- a stale PID
 * could signal an unrelated local process. Instead this terminator only
 * RECORDS a termination intent (`requestHostAgentTermination`) and confirms
 * success by polling the same `host_agents` row the existing natural-exit
 * report path (`notifyTuiExited`/`disconnectClaudeChannel` ->
 * `removeDepartedAgent`) already removes -- signal delivery itself happens in
 * the hosted CLI process (`waitForHostedTuiExit` in `src/cli/invocation.ts`),
 * covered by its own tests. These tests fake only `api.listHostAgents` and
 * `api.requestHostAgentTermination`, and use small millisecond windows so
 * they run with real timers instead of faking the clock.
 */

function fakeAgent(overrides: Partial<HostAgentDto> = {}): HostAgentDto {
  return {
    id: "host-agent-1",
    hostId: "host-1",
    name: "reviewer",
    kind: "codex",
    status: "ready",
    role: null,
    description: null,
    instructions: null,
    pendingSignal: null,
    pendingSignalSeq: 0,
    deliveredSignalSeq: 0,
    ...overrides,
  };
}

type FakeSignalRequest = { hostId: string; agentName: string; signal: NodeJS.Signals };

function createFakeApi(
  agents: HostAgentDto[],
  requestHostAgentTermination: DaemonApi["requestHostAgentTermination"],
): Pick<DaemonApi, "listHostAgents" | "requestHostAgentTermination"> {
  return {
    listHostAgents: (request) => ({
      ok: true,
      agents: agents.filter((agent) => agent.hostId === request.hostId),
    }),
    requestHostAgentTermination: (request) => {
      const current = agents.find(
        (agent) => agent.hostId === request.hostId && agent.name === request.agentName,
      );
      if (!current) {
        return {
          ok: false as const,
          reason: "host_agent_not_found" as const,
          hostId: request.hostId,
          agentName: request.agentName,
        };
      }
      current.pendingSignal = request.signal;
      current.pendingSignalSeq += 1;
      const result = requestHostAgentTermination(request);
      // This helper models an owning wrapper that truthfully delivered and
      // acknowledged the signal immediately. Connected wrapper timing is
      // covered in invocation tests.
      current.deliveredSignalSeq = current.pendingSignalSeq;
      return result;
    },
  };
}

const FAST_WINDOWS = {
  pollIntervalMs: 1,
  doublePressWindowMs: 20,
  hookGraceMs: 20,
  forceKillConfirmMs: 20,
  signalDeliveryConfirmMs: 20,
};

describe("createProductionAgentRuntimeTerminator", () => {
  it("resolves ok immediately when the host-agent row is already gone, without requesting any signal", async () => {
    const requestHostAgentTermination = vi.fn();
    const api = createFakeApi([], requestHostAgentTermination);
    const terminator = createProductionAgentRuntimeTerminator({ api });

    const result = await terminator.terminate({ hostId: "host-1", agentName: "reviewer" });

    expect(result).toEqual({ ok: true });
    expect(requestHostAgentTermination).not.toHaveBeenCalled();
  });

  it("Codex: requests exactly one SIGINT and succeeds once the row disappears within the hook grace window", async () => {
    const agents = [fakeAgent({ kind: "codex" })];
    const requestHostAgentTermination = vi.fn((_request: FakeSignalRequest) => {
      setTimeout(() => {
        agents.length = 0;
      }, 5);
      return { ok: true as const, agent: agents[0]! };
    });
    const api = createFakeApi(agents, requestHostAgentTermination);
    const terminator = createProductionAgentRuntimeTerminator({ api, ...FAST_WINDOWS });

    const result = await terminator.terminate({ hostId: "host-1", agentName: "reviewer" });

    expect(result).toEqual({ ok: true });
    expect(requestHostAgentTermination).toHaveBeenCalledTimes(1);
    expect(requestHostAgentTermination).toHaveBeenCalledWith({
      hostId: "host-1",
      agentName: "reviewer",
      signal: "SIGINT",
    });
  });

  it("Codex: escalates to SIGKILL once the hook grace window elapses, then confirms", async () => {
    const agents = [fakeAgent({ kind: "codex" })];
    const requestHostAgentTermination = vi.fn((request: FakeSignalRequest) => {
      if (request.signal === "SIGKILL") {
        setTimeout(() => {
          agents.length = 0;
        }, 2);
      }
      return { ok: true as const, agent: agents[0]! };
    });
    const api = createFakeApi(agents, requestHostAgentTermination);
    const terminator = createProductionAgentRuntimeTerminator({ api, ...FAST_WINDOWS });

    const result = await terminator.terminate({ hostId: "host-1", agentName: "reviewer" });

    expect(result).toEqual({ ok: true });
    expect(requestHostAgentTermination.mock.calls.map((call) => call[0]!.signal)).toEqual([
      "SIGINT",
      "SIGKILL",
    ]);
  });

  it("does not start the hook grace window or issue the next signal before actual delivery is acknowledged", async () => {
    let elapsedMs = 0;
    const now = vi.spyOn(Date, "now").mockImplementation(() => elapsedMs);
    const agent = fakeAgent({ kind: "codex" });
    const agents = [agent];
    const requestedAt: Array<{ signal: NodeJS.Signals; elapsedMs: number }> = [];
    const api: Pick<DaemonApi, "listHostAgents" | "requestHostAgentTermination"> = {
      listHostAgents: () => ({ ok: true, agents }),
      requestHostAgentTermination: (request) => {
        agent.pendingSignal = request.signal;
        agent.pendingSignalSeq += 1;
        requestedAt.push({ signal: request.signal, elapsedMs });
        return { ok: true, agent };
      },
    };
    const terminator = createProductionAgentRuntimeTerminator({
      api,
      pollIntervalMs: 1,
      hookGraceMs: 5,
      forceKillConfirmMs: 1,
      signalDeliveryConfirmMs: 20,
      sleep: async (ms) => {
        elapsedMs += ms;
        if (agent.pendingSignalSeq === 1 && elapsedMs >= 10) {
          agent.deliveredSignalSeq = 1;
        }
        if (agent.pendingSignal === "SIGKILL") {
          agents.length = 0;
        }
      },
    });

    try {
      await expect(
        terminator.terminate({ hostId: "host-1", agentName: "reviewer" }),
      ).resolves.toEqual({ ok: true });
      expect(requestedAt).toEqual([
        { signal: "SIGINT", elapsedMs: 0 },
        { signal: "SIGKILL", elapsedMs: 15 },
      ]);
    } finally {
      now.mockRestore();
    }
  });

  it("Codex: reports a structured failure if the row never disappears even after SIGKILL", async () => {
    const agents = [fakeAgent({ kind: "codex" })];
    const requestHostAgentTermination = vi.fn((_request: FakeSignalRequest) => ({
      ok: true as const,
      agent: agents[0]!,
    }));
    const api = createFakeApi(agents, requestHostAgentTermination);
    const terminator = createProductionAgentRuntimeTerminator({ api, ...FAST_WINDOWS });

    const result = await terminator.terminate({ hostId: "host-1", agentName: "reviewer" });

    expect(result).toEqual({ ok: false, reason: "termination_timed_out" });
    expect(requestHostAgentTermination.mock.calls.map((call) => call[0]!.signal)).toEqual([
      "SIGINT",
      "SIGKILL",
    ]);
  });

  it("Claude: a single SIGINT that succeeds within the double-press window requests no second SIGINT", async () => {
    const agents = [fakeAgent({ kind: "claude" })];
    const requestHostAgentTermination = vi.fn((_request: FakeSignalRequest) => {
      setTimeout(() => {
        agents.length = 0;
      }, 2);
      return { ok: true as const, agent: agents[0]! };
    });
    const api = createFakeApi(agents, requestHostAgentTermination);
    const terminator = createProductionAgentRuntimeTerminator({ api, ...FAST_WINDOWS });

    const result = await terminator.terminate({ hostId: "host-1", agentName: "reviewer" });

    expect(result).toEqual({ ok: true });
    expect(requestHostAgentTermination).toHaveBeenCalledTimes(1);
    expect(requestHostAgentTermination).toHaveBeenCalledWith({
      hostId: "host-1",
      agentName: "reviewer",
      signal: "SIGINT",
    });
  });

  it("Claude: requests a second SIGINT when the double-press window elapses without exit, then succeeds during the hook grace window", async () => {
    const agents = [fakeAgent({ kind: "claude" })];
    const requestHostAgentTermination = vi.fn((_request: FakeSignalRequest) => {
      if (requestHostAgentTermination.mock.calls.length === 2) {
        setTimeout(() => {
          agents.length = 0;
        }, 2);
      }
      return { ok: true as const, agent: agents[0]! };
    });
    const api = createFakeApi(agents, requestHostAgentTermination);
    const terminator = createProductionAgentRuntimeTerminator({ api, ...FAST_WINDOWS });

    const result = await terminator.terminate({ hostId: "host-1", agentName: "reviewer" });

    expect(result).toEqual({ ok: true });
    expect(requestHostAgentTermination.mock.calls.map((call) => call[0]!.signal)).toEqual([
      "SIGINT",
      "SIGINT",
    ]);
  });

  it("Claude: escalates to SIGKILL when even the second SIGINT does not end the session in time", async () => {
    const agents = [fakeAgent({ kind: "claude" })];
    const requestHostAgentTermination = vi.fn((request: FakeSignalRequest) => {
      if (request.signal === "SIGKILL") {
        setTimeout(() => {
          agents.length = 0;
        }, 2);
      }
      return { ok: true as const, agent: agents[0]! };
    });
    const api = createFakeApi(agents, requestHostAgentTermination);
    const terminator = createProductionAgentRuntimeTerminator({ api, ...FAST_WINDOWS });

    const result = await terminator.terminate({ hostId: "host-1", agentName: "reviewer" });

    expect(result).toEqual({ ok: true });
    expect(requestHostAgentTermination.mock.calls.map((call) => call[0]!.signal)).toEqual([
      "SIGINT",
      "SIGINT",
      "SIGKILL",
    ]);
  });

  it("tolerates the termination-intent call throwing (a transport race) and still confirms via the row", async () => {
    const agents = [fakeAgent({ kind: "codex" })];
    const requestHostAgentTermination = vi.fn((_request: FakeSignalRequest) => {
      throw new Error("daemon socket closed before response");
    });
    const api = createFakeApi(agents, requestHostAgentTermination);
    setTimeout(() => {
      agents.length = 0;
    }, 2);
    const terminator = createProductionAgentRuntimeTerminator({ api, ...FAST_WINDOWS });

    const result = await terminator.terminate({ hostId: "host-1", agentName: "reviewer" });

    expect(result).toEqual({ ok: true });
  });

  it("requests termination for a still-starting agent (no pid concept any more) exactly like a ready one", async () => {
    const agents = [fakeAgent({ kind: "codex", status: "starting" })];
    const requestHostAgentTermination = vi.fn((_request: FakeSignalRequest) => {
      setTimeout(() => {
        agents.length = 0;
      }, 2);
      return { ok: true as const, agent: agents[0]! };
    });
    const api = createFakeApi(agents, requestHostAgentTermination);
    const terminator = createProductionAgentRuntimeTerminator({ api, ...FAST_WINDOWS });

    const result = await terminator.terminate({ hostId: "host-1", agentName: "reviewer" });

    expect(result).toEqual({ ok: true });
    expect(requestHostAgentTermination).toHaveBeenCalledWith({
      hostId: "host-1",
      agentName: "reviewer",
      signal: "SIGINT",
    });
  });

  it("isolates termination by hostId: a same-named agent on another host is unaffected", async () => {
    const agents = [
      fakeAgent({ hostId: "host-1" }),
      fakeAgent({ hostId: "host-2" }),
    ];
    const requestHostAgentTermination = vi.fn((request: FakeSignalRequest) => {
      if (request.hostId === "host-1") {
        const index = agents.findIndex((agent) => agent.hostId === "host-1");
        if (index !== -1) {
          setTimeout(() => {
            agents.splice(index, 1);
          }, 2);
        }
      }
      return { ok: true as const, agent: agents.find((agent) => agent.hostId === request.hostId)! };
    });
    const api = createFakeApi(agents, requestHostAgentTermination);
    const terminator = createProductionAgentRuntimeTerminator({ api, ...FAST_WINDOWS });

    const result = await terminator.terminate({ hostId: "host-1", agentName: "reviewer" });

    expect(result).toEqual({ ok: true });
    expect(requestHostAgentTermination).toHaveBeenCalledWith({
      hostId: "host-1",
      agentName: "reviewer",
      signal: "SIGINT",
    });
    expect(requestHostAgentTermination).not.toHaveBeenCalledWith(
      expect.objectContaining({ hostId: "host-2" }),
    );
    expect(agents).toEqual([expect.objectContaining({ hostId: "host-2" })]);
  });
});
