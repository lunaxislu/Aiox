# Claude Channel Effective Registration Scope

## Context

[[docs/decisions/claude-channel-local-static-mcp-only]] chose one static MCP
activation path, but its launch gate only accepted a Local entry. That made a
successfully provisioned User or Project entry unusable by `aiox claude`, even
though Claude resolves those entries as the effective MCP configuration for
the current working directory.

User scope is shared Claude configuration. This therefore narrows the default
shared-configuration policy in [[docs/decisions/agent-level-mcp-process-scoping]]:
only an operator's explicit `aiox claude setup --scope user` may create that
shared static definition; `aiox claude` launch itself never writes it.

## Decision

Keep one pre-registered static MCP definition and make the `aiox claude`
launch gate accept its effective Local, User, or Project registration in the
current working directory. User and Project definition scopes are opt-in
provisioning choices, while agent name, token, and daemon socket identity stay
scoped to the spawned AIOX Claude process.

## Alternatives

- **Keep Local-only launch activation**: rejected. It contradicts the
  supported `setup --scope user|project` provisioning surface and turns a
  valid Claude-effective registration into an AIOX-only failure.
- **Choose and rewrite a scope-specific definition ourselves**: rejected.
  Claude owns scope precedence and configuration resolution; duplicating it
  would add a second resolver and new drift risk.
- **Return to per-launch inline configuration**: rejected. It reintroduces
  the deleted activation path and its separate configuration and secret
  exposure failure modes.
- **Allow User/Project scope without explicit setup**: rejected. Scope-wide
  definitions must remain an operator choice rather than a side effect of
  launch or reconnect.

## Rationale

The launch preflight only needs to establish whether the named static MCP is
available to the Claude process it will start in this cwd. `claude mcp get`
already answers that effective-scope question. Delegating precedence to Claude
keeps AIOX's check aligned with the host that launches the MCP child.

## Trade-offs

- The gate is an existence/scope preflight, not a channel readiness probe.
  A recognized registration can still fail to connect after Claude starts it.
- The same static name can resolve differently by cwd because Claude's scope
  precedence remains authoritative.
- An explicit User definition can be visible to non-AIOX Claude sessions, and
  a Project definition can likewise affect other Claude sessions resolving
  that project configuration. Those sessions do not receive AIOX's
  per-process identity env and can fail to connect to the static entry. This
  is an accepted, explicit provisioning trade-off rather than a claim that
  definition scope is isolated per process.

## Re-evaluation

- Claude changes the effective-scope semantics or stops exposing them through
  `claude mcp get`.
- AIOX needs to compare or own the registered definition rather than only
  accept Claude's effective registration.

## Sources

- [[docs/decisions/claude-channel-local-static-mcp-only]] — superseded
  Local-only gate conclusion; static-MCP-only activation rationale remains in
  force.
- [[docs/decisions/agent-level-mcp-process-scoping]] — default shared-config
  policy; this decision records the explicit User/Project definition-scope
  exception while preserving per-process runtime identity.
- `logs/G1/2026-07-29-G1-B-canonical-presentation-corrective.md` W8 — scope
  verification and cross-cwd User-scope observation.
