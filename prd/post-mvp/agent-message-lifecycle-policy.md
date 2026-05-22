# Post-MVP — Agent Message Lifecycle Policy

This document parks post-MVP product policy gaps for agent-to-agent message
lifecycle behavior. These items are out of MVP scope and must not block the MVP
implementation.

Authority note: MVP behavior remains defined by `prd/mvp/aiox-mvp-spec.md`. This
document records post-MVP policy candidates discovered during Step 11 Phase A.

## Pair-Level Blocked/Pending Policy

One limited or unavailable agent can make every pair containing that agent look
pending. MVP does not automatically resolve this case.

Post-MVP decisions needed:

- How agent-level availability (`user_reported_limited`, adapter-reported
  failure, unavailable) affects pair-level state.
- Whether limited/unavailable agents should pause all pairs containing that
  agent with a state like `blocked_by_agent`.
- Whether blocked pairs enqueue, reject, or require confirmation for new
  outbound messages.
- Whether reset time should auto-resume a pair or only downgrade the agent to
  `availability_unknown` until explicit user report.
- How to surface blocked-pair status to the source agent.

## Duplicate Outbound, Fan-Out, And User-Interrupted Pending Turns

The duplicate/pending problem is not only one direction. It can happen in either
direction of a pair, and it becomes more complex for 1:N fan-out when only some
targets complete.

Examples:

- `codex -> claude` message A is sent and Claude remains `awaiting_agent_reply`.
- `codex -> claude` message B is sent before A is resolved.
- `claude -> codex` has the same unresolved/re-send problem in the opposite
  direction.
- `codex -> {claude-1, claude-2, codex-2}` fan-out has partial completion:
  some targets reply while others remain pending, limited, or interrupted.
- A user interrupts the target TUI turn with `Esc` or an equivalent UI action.

Post-MVP decisions needed:

- Same-direction duplicate sends while `awaiting_agent_reply` is unresolved:
  queue, coalesce, reject, or require confirmation.
- Opposite-direction duplicates: treat directions as independent lanes, or make
  the pair single-flight.
- Fan-out partial completion: decide how partial completion and target-level
  pending are surfaced to the source agent.
- Fan-out state shape: keep target pending as individual deliveries, or add a
  parent fan-out operation state.
- User interruption when the adapter has no structured signal: use user report,
  cancel command, or keep pending.
- Interrupted message terminal state: `cancelled_by_user`, `failed`,
  `superseded`, or keep `awaiting_agent_reply`.
- Reply correlation constraints across `chat_id`, parent message id, delivery
  id, and fan-out parent id.
