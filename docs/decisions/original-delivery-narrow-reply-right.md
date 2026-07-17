# 원 delivery는 원 target에게 좁은 correlated reply right를 부여한다

## Context

Delivery correlation identifies which target-specific delivery a reply refers
to, but it does not alone decide whether the replying identity may send to the
original source when no reverse directed route exists. Reusing the replying
agent's ordinary outbound routes would also make a reply fan out beyond the
source that initiated the delivery.

The resulting routing and validation contract is owned by
[[docs/specs/aiox-message-lifecycle]] §4.2; its persistence and reliability
consequences are owned by §4.3–§4.5.

## Decision

An original delivery with reply permission grants only its authenticated
original target one correlated reply right to the original source; that right
does not require a reverse directed route.

## Alternatives

- **Require a reverse directed route for every correlated reply.** Rejected
  because a sender's delivery that expressly permits a reply already establishes
  the narrow relationship needed for that reply, while an additional route can
  block ordinary request/response exchanges for administrative reasons unrelated
  to the delivery.
- **Route replies through the replying agent's normal outbound fan-out.**
  Rejected because it can send one correlated reply to targets other than the
  original source and makes reply authorization depend on mutable route state.
- **Grant the replying agent a general route-bypass capability.** Rejected
  because the original delivery should authorize exactly one return path, not
  future independent sends or access to arbitrary targets.

## Rationale

The original delivery is the least broad authority that can establish a reply
path: it fixes the original target, original source, and correlation id. Binding
the right to the authenticated original target prevents another agent from
claiming the delivery; binding its destination to the original source prevents
reply fan-out. Limiting it to one correlated reply prevents the right from
becoming a standing reverse channel.

This separates two different capabilities cleanly. A new independent send
continues to require an active directed route, while a reply uses only the
return path created by the original delivery. The result permits a normal
request/response exchange without weakening route authorization outside that
specific exchange.

## Trade-offs

- Correlated reply authorization now depends on preserving original-delivery
  identity and consumed-right state, not only on current route lookup.
- Operators cannot use reverse-route removal alone to suppress an already
  granted reply; explicit future cancellation policy would need its own
  decision.
- Phase 0 permits a chain of newly granted one-reply rights without a length or
  expiry limit.

## Re-evaluation

Re-evaluate if group recipients, delegated identities, federation, or an
explicit cancellation/expiry policy makes the original source/target pair
insufficient to bound the return path, or if security evidence shows that this
right needs an additional independently authenticated constraint.

## Sources

- `logs/2026-07-10-G1-A-contractingress-freeze.md` — W3 approval of
  source-only routing, reverse-route independence, identity validation, and
  Phase 0 scope.
- [[docs/decisions/a2a-message-lifecycle-envelope-and-correlation]] — the
  earlier lifecycle rationale whose open correlated-reply-authorization
  alternative this decision supersedes.
