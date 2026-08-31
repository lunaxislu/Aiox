import type { AgentKind } from "../core/agents.js";

/**
 * A terminal/IDE product's native-surface integration. Scoped to exactly the
 * responsibilities `HostAdapter`-implementers own (W6 Stage 4 correction —
 * accepted architecture snapshot at `logs/artifacts/w6-aiox-host-agreed-architecture.md`):
 * confirm the integration is usable, then create one native surface per agent
 * and start the existing AIOX agent CLI in it. `createSurfaceAndStart()`
 * resolves once that CLI process has been launched — not once it becomes
 * ready, and not once it exits.
 *
 * A terminal/IDE product's surface is not assumed to reliably observe the
 * vendor process it started, so this contract carries no ready/exit
 * lifecycle and no termination control. The existing AIOX agent CLI is what
 * reports a successful vendor spawn or a natural exit to the daemon's
 * host-agent state (`markHostAgentReady` / `detachHostAgent`); `HostController`
 * observes that state through its own reconcile seam instead of an adapter
 * callback. Agent process termination lives in a separate
 * `AgentRuntimeTerminator` seam, not here. Everything else — vendor
 * argv/instruction assembly, daemon route bookkeeping, host runtime storage,
 * surface close/hold/restore, and category fallback — belongs to
 * `HostController` or the daemon, not here.
 */

export interface HostAdapterDetectContext {
  cwd: string;
}

export type HostAdapterPreflightResult = { ok: true } | { ok: false; reason: string };

export interface HostAdapterAgentSurfaceRequest {
  hostId: string;
  hostName: string;
  agentName: string;
  agentKind: AgentKind;
  /** Working directory for the surface's shell — the host's registered project path. */
  cwd: string;
  /** The existing AIOX CLI binary, e.g. "aiox". Never a shell string. */
  command: string;
  /** Structured argv for the existing `aiox claude`/`aiox codex` invocation. */
  args: readonly string[];
  env: Readonly<Record<string, string>>;
}

export interface HostAdapter {
  readonly id: string;
  /** Fast, synchronous environment signal used by `AdapterRegistry` selection. */
  detect(context: HostAdapterDetectContext): boolean;
  /** Confirms the required executable/API/bridge exists, before any daemon/host side effect. */
  staticPreflight(context: HostAdapterDetectContext): Promise<HostAdapterPreflightResult>;
  /** Confirms current workspace/session access, after the daemon is reachable but before the host is registered. */
  dynamicPreflight(context: {
    hostName: string;
    cwd: string;
  }): Promise<HostAdapterPreflightResult>;
  /** Creates one native surface for this agent and starts the existing AIOX agent CLI in it. */
  createSurfaceAndStart(request: HostAdapterAgentSurfaceRequest): Promise<void>;
}
