# Codex D7 Authoritative Binding Scope

## Context

The Codex runtime needs to keep the daemon's active Codex thread binding aligned
with the thread the user can see in the Codex TUI. During Step 10 Phase B, the
daemon could connect to the same Codex app-server as a separate WebSocket client,
but that separate client did not receive the JSON-RPC success response for
operations originated by the TUI connection.

The daemon could see broadcast notifications such as `thread/started`, but those
notifications did not carry the originating request id or enough source context
to prove which client caused the change. Updating the binding from those
notification-only signals would violate D7: replacements must have attributable
request/response evidence.

## Decision

Only Codex thread binding changes backed by authoritative same-operation
request/response evidence may update the daemon's active binding.
Notification-only observations are not binding authority.

At the time of the Step 10 scope reduction, this limited MVP binding replacement
to aiox-originated operations where the daemon owned both the request and the
success response. TUI-originated `/clear`, `/new`, `/fork`, and later resume-like
mutations required either a transparent same-connection proxy or a future
upstream callback/read API with equivalent attribution.

## Alternatives

- **Use app-server broadcast notifications as binding authority.** Rejected
  because notifications report that something happened, not which request and
  owner caused it.
- **Hijack or route TUI slash commands through aiox.** Rejected because the TUI
  is outside aiox control and command hijacking would weaken the local runtime
  boundary.
- **Keep the direct app-server topology but scope binding replacement down to
  daemon-owned operations.** Accepted as the Step 10 fallback because it preserved
  D7 while leaving TUI-originated replacement as an explicit open issue.
- **Add a transparent proxy.** Deferred at first, then later reintroduced for MVP
  once wrong-thread delivery made TUI-originated binding observation necessary.

## Rationale

The load-bearing rule is not "use a proxy"; it is "do not replace binding from
unattributed observation." A separate daemon WebSocket client sees context and
notifications, but it does not see another client's response frame. Without that
same-client response, the daemon cannot prove that a specific TUI operation
created the thread id it is about to persist.

The scope reduction avoided a dangerous half-solution: it allowed the Codex
runtime foundation to proceed while forbidding notification-derived binding
updates. Later proxy work satisfies the same rule by observing the TUI
connection's request and matching success response, rather than by trusting
broadcast notifications ([[docs/architecture/local-runtime-codex-adapter]]
§7.4–§7.7).

## Trade-offs

- The Step 10 fallback left TUI-originated rebind incomplete until a proxy or
  equivalent upstream API existed.
- The later transparent proxy adds maintenance risk because it observes Codex
  JSON-RPC frames, but it preserves the attribution boundary that notification
  observation lacked ([[docs/decisions/proxy-lazy-observation-cost-model]]).
- If a future Codex API exposes an authenticated active-thread read or callback,
  aiox can replace the proxy without changing the underlying D7 rule.

## Re-evaluation

Re-evaluate this decision if Codex app-server provides a supported callback,
subscription, active-thread read, or response-forwarding API that carries enough
operation/source context to satisfy D7 without a proxy.

Also re-evaluate when moving beyond two-agent MVP routing if multiple TUI
connections can mutate the same runtime and require a richer ownership model.

## Sources

- `logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md:45-53` - retained digest of the Step
  10 D7 finding.
