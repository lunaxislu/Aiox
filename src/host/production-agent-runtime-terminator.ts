import type { DaemonApi } from "../daemon/api.js";
import type {
  AgentRuntimeTerminator,
  AgentTerminationRequest,
  AgentTerminationResult,
} from "./agent-runtime-terminator.js";

/**
 * Production `AgentRuntimeTerminator` (W6 Stage 5D, Blocker 4 correction).
 *
 * The daemon never spawns a host-scoped agent's vendor process itself — the
 * surface's own `aiox claude/codex --host-id` CLI does, via a `ChildProcess`
 * handle only that process owns. An earlier candidate had this terminator
 * call `process.kill(pid, signal)` directly against a PID recorded once at
 * ready-report time; that was rejected because the PID can go stale (the
 * vendor exiting while the row lags behind, or the hosted CLI wrapper dying
 * abnormally) and the OS can hand a stale PID to an unrelated local process,
 * so a "termination" could signal a process that has nothing to do with this
 * agent.
 *
 * Instead, this terminator only ever RECORDS a termination intent for
 * `(hostId, agentName)` through the existing daemon API
 * (`requestHostAgentTermination`) and confirms success by polling the same
 * `host_agents` row the vendor's own natural-exit report already removes
 * (`notifyTuiExited` / `disconnectClaudeChannel` -> `removeDepartedAgent`).
 * The actual signal delivery happens in the hosted CLI process itself (see
 * `waitForHostedTuiExit` in `src/cli/invocation.ts`), against the live
 * `ChildProcess` handle it actually owns — never a raw PID looked up later.
 * A confirmed success here means the process is gone; it does NOT mean the
 * vendor's own shutdown hook ran (see the Stage 5D residual risk in the task
 * record — that is a vendor-side guarantee AIOX cannot verify or control).
 *
 * The signal counts and windows below are AIOX's current termination policy.
 * Public vendor reports do not establish that terminal Ctrl+C and an external
 * OS SIGINT are equivalent or stable across versions. AIOX therefore treats
 * only acknowledged delivery plus the row's eventual disappearance as its
 * observable result; vendor interactive semantics and hook execution remain
 * explicitly unverified.
 */

export interface CreateProductionAgentRuntimeTerminatorOptions {
  api: Pick<DaemonApi, "listHostAgents" | "requestHostAgentTermination">;
  /** Poll-wait seam so tests never depend on real elapsed time. */
  sleep?: (ms: number) => Promise<void>;
  pollIntervalMs?: number;
  /** Claude-only: how long to wait after the first SIGINT before sending a second. */
  doublePressWindowMs?: number;
  /** How long to wait for the vendor's own shutdown/hook path to remove the row. */
  hookGraceMs?: number;
  /** How long to wait for SIGKILL to take effect before reporting failure. */
  forceKillConfirmMs?: number;
  /** How long to wait for the owning wrapper to acknowledge actual child delivery. */
  signalDeliveryConfirmMs?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 50;
const DEFAULT_DOUBLE_PRESS_WINDOW_MS = 1000;
const DEFAULT_HOOK_GRACE_MS = 5000;
const DEFAULT_FORCE_KILL_CONFIRM_MS = 2000;
const DEFAULT_SIGNAL_DELIVERY_CONFIRM_MS = 2000;

export function createProductionAgentRuntimeTerminator(
  options: CreateProductionAgentRuntimeTerminatorOptions,
): AgentRuntimeTerminator {
  const { api } = options;
  const sleep =
    options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const doublePressWindowMs = options.doublePressWindowMs ?? DEFAULT_DOUBLE_PRESS_WINDOW_MS;
  const hookGraceMs = options.hookGraceMs ?? DEFAULT_HOOK_GRACE_MS;
  const forceKillConfirmMs = options.forceKillConfirmMs ?? DEFAULT_FORCE_KILL_CONFIRM_MS;
  const signalDeliveryConfirmMs =
    options.signalDeliveryConfirmMs ?? DEFAULT_SIGNAL_DELIVERY_CONFIRM_MS;

  async function findAgent(request: AgentTerminationRequest) {
    const listed = await api.listHostAgents({ hostId: request.hostId });
    return listed.ok ? listed.agents.find((agent) => agent.name === request.agentName) : undefined;
  }

  async function isAgentGone(request: AgentTerminationRequest): Promise<boolean> {
    return (await findAgent(request)) === undefined;
  }

  async function waitUntilGone(
    request: AgentTerminationRequest,
    timeoutMs: number,
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    if (await isAgentGone(request)) {
      return true;
    }
    while (Date.now() < deadline) {
      await sleep(Math.min(pollIntervalMs, Math.max(0, deadline - Date.now())));
      if (await isAgentGone(request)) {
        return true;
      }
    }
    return false;
  }

  async function requestSignal(
    request: AgentTerminationRequest,
    signal: NodeJS.Signals,
  ): Promise<number | null> {
    try {
      const result = await api.requestHostAgentTermination({
        hostId: request.hostId,
        agentName: request.agentName,
        signal,
      });
      if (result.ok) return result.agent.pendingSignalSeq;
    } catch {
      // The request can commit before its socket response is lost. The read
      // below recovers only the exact still-unacknowledged signal, never an
      // unrelated or already-consumed intent.
    }

    const current = await findAgent(request);
    return current?.pendingSignal === signal &&
      current.pendingSignalSeq > current.deliveredSignalSeq
      ? current.pendingSignalSeq
      : null;
  }

  async function waitForSignalDelivery(
    request: AgentTerminationRequest,
    signalSeq: number,
  ): Promise<"delivered" | "gone" | "timed_out"> {
    const deadline = Date.now() + signalDeliveryConfirmMs;
    while (true) {
      const current = await findAgent(request);
      if (!current) return "gone";
      if (current.deliveredSignalSeq >= signalSeq) return "delivered";
      if (Date.now() >= deadline) return "timed_out";
      await sleep(Math.min(pollIntervalMs, Math.max(0, deadline - Date.now())));
    }
  }

  async function deliverSignal(
    request: AgentTerminationRequest,
    signal: NodeJS.Signals,
  ): Promise<"delivered" | "gone" | "timed_out"> {
    const signalSeq = await requestSignal(request, signal);
    if (signalSeq === null) {
      return (await isAgentGone(request)) ? "gone" : "timed_out";
    }
    return waitForSignalDelivery(request, signalSeq);
  }

  return {
    async terminate(request): Promise<AgentTerminationResult> {
      const agent = await findAgent(request);
      if (!agent) {
        return { ok: true };
      }

      const firstDelivery = await deliverSignal(request, "SIGINT");
      if (firstDelivery === "gone") return { ok: true };
      if (firstDelivery === "timed_out") {
        return { ok: false, reason: "termination_timed_out" };
      }

      if (agent.kind === "claude") {
        if (await waitUntilGone(request, doublePressWindowMs)) {
          return { ok: true };
        }
        const secondDelivery = await deliverSignal(request, "SIGINT");
        if (secondDelivery === "gone") return { ok: true };
        if (secondDelivery === "timed_out") {
          return { ok: false, reason: "termination_timed_out" };
        }
      }

      if (await waitUntilGone(request, hookGraceMs)) {
        return { ok: true };
      }

      const forceDelivery = await deliverSignal(request, "SIGKILL");
      if (forceDelivery === "gone") return { ok: true };
      if (forceDelivery === "timed_out") {
        return { ok: false, reason: "termination_timed_out" };
      }
      if (await waitUntilGone(request, forceKillConfirmMs)) {
        return { ok: true };
      }

      return { ok: false, reason: "termination_timed_out" };
    },
  };
}
