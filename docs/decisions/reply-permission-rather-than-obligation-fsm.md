# replyExpected는 obligation FSM 대신 한 번의 reply permission을 부여한다

## Context

Earlier lifecycle rationale described `replyExpected` as creating an
`awaiting_reply` obligation with fulfillment, cancellation, expiry, and timeout
policy. That representation coupled a target's permission to answer with a
daemon model of whether work was still pending. It made delayed acknowledgement,
stale delivery failure observation, and a reply arriving before acknowledgement
look like lifecycle-state questions before the daemon could answer the simpler
authorization question.

The public contract outcome is owned by [[docs/specs/aiox-message-lifecycle]]
§4.2–§4.5.

## Decision

`replyExpected: true` grants the authenticated original target one correlated
reply permission for that delivery; it is consumed by the first accepted reply,
and is not an obligation FSM.

## Alternatives

- **Keep an awaiting/fulfilled/cancelled/expired obligation FSM.** Rejected
  because it makes reply authorization depend on operational policy and
  transport observation that can lag an actual target reply.
- **Treat `replyExpected` as an unlimited conversation flag.** Rejected because
  it cannot distinguish a retry of one reply operation from a new semantic
  reply and leaves duplicate replies unbounded.
- **Infer permission from delivery completion or acknowledgement.** Rejected
  because a valid reply can itself be receipt evidence; requiring prior ack
  would reject that legitimate ordering.

## Rationale

The permission answers one stable question: whether this specific delivery
authorizes its original target to create the next correlated message. Its
minimal state is therefore whether the right exists and whether it was
consumed, rather than a claim about the target's work, availability, or wait
state.

This keeps authorization independent of queued, deferred, or failed transport
observations. Reliability processing may reconcile those observations with a
reply, but it must not turn a stale observation into an authorization denial.
It also makes the duplicate boundary explicit: an accepted first reply consumes
the right; a later distinct reply is not a retry and must be rejected. Transport
idempotency remains a separate concern because retransmission of the same
operation should recover its earlier result rather than consume a second right.

## Trade-offs

- The protocol does not model an agent as owing work or expose a generic
  waiting-state lifecycle from this flag.
- The reference runtime must persist the consumed-right/correlation boundary
  consistently for its process lifetime, even before durable replay is added.
- A chain continues only when each newly created delivery grants its own next
  permission; Phase 0 does not impose a length or expiry policy.

## Re-evaluation

Re-evaluate if a supported workflow needs enforceable deadlines, cancellation
semantics, or operational SLA state that cannot remain separate from reply
authorization, or if durable replay requires a different representation while
preserving the one-reply authorization result.

## Sources

- `logs/2026-07-10-G1-A-contractingress-freeze.md` — W3 approval of the
  permission boundary, delivery-status independence, duplicate handling, and
  Phase 0 chain scope.
- [[docs/decisions/a2a-message-lifecycle-envelope-and-correlation]] — the
  earlier lifecycle rationale whose obligation-FSM premise this decision
  supersedes.
