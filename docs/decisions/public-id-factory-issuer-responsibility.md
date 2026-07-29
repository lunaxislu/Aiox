# Public ID factory issuer responsibility

## Context

[[docs/decisions/public-message-and-delivery-ids-use-opaque-issuance]] decided
that public protocol `messageId` and `deliveryId` need collision-resistant,
opaque issuance while internal entity IDs retain their existing shared
sequential issuer. The frozen G1-A handoff subsequently described a daemon
issuer for every `messageId`. The decision-time implementation snapshot had a mixed boundary:
Codex and Claude send create source-adapter message IDs, Claude reply and
daemon-originated outcomes use the daemon's shared `createId`, and delivery
rows also use that shared issuer.

The approved B direction needs to settle issuer responsibility without
changing the earlier opaque-ID rationale or implying that the current mixed
implementation is already conformant. The external contract is owned by
[[docs/specs/aiox-message-lifecycle]] §4.1; the historical freeze remains
provenance, not a living contract.

## Decision

Use one common public-ID factory with opaque, collision-resistant issuance.
Each source adapter directly calls the common public-IDs module (not daemon
DI) for its agent-authored send and reply `messageId`; the daemon calls it for
daemon-originated `messageId` and for every `deliveryId`. A delivery factory result is the immutable
`message_deliveries.id` public value.

## Rationale

Issuer responsibility follows the authoring boundary. A source adapter can
issue an agent-authored logical message ID before invoking the daemon, while
the daemon remains the only component that creates deliveries and system
outcomes. Sharing one factory preserves the existing opaque-ID rationale
without encoding agent name, profile, thread, issuer, or ordering information
in a public value.

This clarifies and supersedes only the freeze's issuer-responsibility direction
that the daemon issues every `messageId`; it does not supersede the freeze as
historical provenance or the earlier opaque-issuance decision's rationale.

## Alternatives

- **Keep every `messageId` daemon-issued.** This conflicts with the approved
  source-adapter authoring boundary and unnecessarily makes adapters await a
  daemon issuer for a value they submit.
- **Give each adapter an independent public-ID generator.** This risks drift
  in collision, opacity, and non-parsing rules across Codex and Claude.
- **Replace shared `createId` globally.** Internal agent, pair, route, and
  event identifiers are outside the public-protocol boundary and would expand
  the cutover without an external-contract need.

## Trade-offs

The implementation must wire both production daemon and CLI in-process
entrypoints so all callers receive the same public-ID factory semantics. Each
source handler calls the common module exactly once per invocation and passes
that generated `messageId` unchanged to exactly one daemon call. A user MCP
tool re-invocation is a new invocation and gets a new message ID. Handler to
daemon automatic retry, tool re-invocation dedupe, and a caller-provided ingress
idempotency key are excluded; treating re-invocations as the same logical
message requires a separate ingress-idempotency contract. This is distinct from the daemon's delivery
`idempotencyKey`, which remains the stored `${messageId}:${targetAgentId}`
delivery-creation key and does not identify the issuer or authorize a new
logical message.

No legacy alias, fallback, or dual-write path is introduced. UUID choice and
prefixes such as `message_` and `delivery_` remain non-normative implementation
details. Consumers must not parse prefix, UUID/encoding, sort order, random
source, issuer, agent name, profile, or thread from either public value.

## Re-evaluation

Re-evaluate if a new public ingress needs handler-to-daemon retry, tool
re-invocation idempotency, a caller-provided ingress key, or if Phase 2 durable
replay or federation requires a broader namespace or persistence
protocol. Any such work must preserve the row-PK binding and the existing reply,
`inReplyToDeliveryId`, `outcomeForDeliveryId`, and retransmit correlations.

## Sources

- `logs/G1/2026-07-10-G1-A-contractingress-freeze.md` — historical daemon
  authority and G1-B public-ID-factory handoff.
- `logs/G1/2026-07-18-G1-A-Codex-structured-ingress-evidence.md` — current W4
  is active and is not this decision's execution owner.
