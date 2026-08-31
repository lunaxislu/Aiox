/**
 * The termination boundary for one host-scoped agent's underlying process,
 * kept separate from `HostAdapter`. A terminal/IDE product's surface (pane,
 * window, tab) is not assumed to observe or control the vendor process it
 * started — this seam is where that control lives instead. It never closes,
 * holds, or restores a surface: that stays the terminal/IDE product's own
 * policy, unaffected by termination outcome.
 *
 * `HostController` is the only caller. The real product/CLI process control
 * behind this interface (signals, grace timeouts) is Stage 5+ work; W6 Stage 4
 * only introduces the seam and a deterministic fake for testing.
 */

export interface AgentTerminationRequest {
  hostId: string;
  agentName: string;
}

export type AgentTerminationResult = { ok: true } | { ok: false; reason: string };

export interface AgentRuntimeTerminator {
  /** Resolves once termination is confirmed or is confirmed to have failed — never a fire-and-forget request. */
  terminate(request: AgentTerminationRequest): Promise<AgentTerminationResult>;
}
