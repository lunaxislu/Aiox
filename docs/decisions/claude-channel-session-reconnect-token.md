# Claude Channel Session Reconnect Token

## Context

Claude owns the stdio MCP child lifecycle. Disabling and reconnecting the
Claude channel can start a replacement child while the top-level `aiox claude`
session remains alive. The original single-use registration token had already
been consumed, so the replacement child could not register its new loopback
endpoint and Claude could not restore its tools.

[[docs/decisions/claude-channel-trust-and-registration]] remains the rationale
owner for dynamic endpoint registration and rejecting tokenless registration.
This decision supersedes only that document's single-use credential-lifetime
conclusion.

## Decision

Keep a Claude channel registration token valid until the top-level Claude
session disconnects, and allow a replacement channel child to register again
with that token.

## Alternatives

- **Keep a single-use registration token**: rejected. It makes a normal
  disable/reconnect child replacement fail within an otherwise live session.
- **Mint a new token for every child reconnect**: rejected. The child is
  spawned by Claude, so AIOX has no reconnect event on which to safely issue
  and inject a replacement token.
- **Limit reuse with an arbitrary count or TTL**: rejected. It adds a
  failure boundary without resolving the Claude-owned child lifecycle; the
  current local channel is not yet a release-grade end-to-end security
  boundary.

## Rationale

The token authorizes an agent identity for one top-level Claude session, not a
particular stdio child process. Re-registering replaces the daemon's transient
runtime endpoint for that same identity. The current as-built flow is owned by
[[docs/architecture/local-runtime-claude-adapter]] §6.2 and the API lifecycle
by [[docs/architecture/local-runtime-daemon-transport-api]] §5.

## Trade-offs

- A token changes from a one-time claim ticket to a session-scoped credential;
  any holder can rebind the endpoint until disconnect.
- If the top-level Claude process ends without AIOX reaching its disconnect
  path, the in-memory token and runtime can remain stale until daemon cleanup.
- This only covers a replacement child that Claude actually starts. It does
  not make Claude spawn or reconnect a child it does not create.

## Re-evaluation

- Claude exposes a reliable child lifecycle/reconnect callback or native
  channel credential rotation.
- The channel becomes a hardened security boundary and requires shorter-lived
  credentials, proof of child identity, or explicit revocation.

## Sources

- [[docs/decisions/claude-channel-trust-and-registration]] — superseded
  single-use-token conclusion; its dynamic registration topology rationale
  remains in force.
- `logs/G1/2026-07-29-G1-B-canonical-presentation-corrective.md` W8 —
  disable/reconnect reproduction and TUI verification.
