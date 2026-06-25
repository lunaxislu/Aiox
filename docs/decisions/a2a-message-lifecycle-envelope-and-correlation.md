# A2A Message Lifecycle Envelope And Correlation

## Context

The post-MVP A2A work needed a contract that could answer three questions that
the MVP text-push surface could not answer reliably:

- why the source is sending a message;
- whether the target owes a reply;
- which target-specific delivery a reply or acknowledgement is about.

The MVP data model already had a storage/display `type`, directed routes, one
logical message fanned out to one or more delivery rows, and adapter-specific
reply identifiers. That was enough for a local preview, but not enough for a
versioned protocol contract. In particular, text-rendered envelopes can guide a
non-native CLI agent, but they cannot be protocol authority because the model can
copy, edit, or forge displayed text.

The outcome of this decision is reflected in [[aiox-message-lifecycle]] §4. This
decision records only the load-bearing rationale.

## Decision

A2A v1 treats message lifecycle as a daemon-owned, delivery-correlated protocol
contract: `type`, `intent`, and `replyExpected` are separate axes; the canonical
envelope is vendor-neutral; fan-out uses one logical message with target-specific
deliveries; and daemon store, authenticated identity, token/policy checks, and
typed control-plane state remain authoritative over adapter-rendered text.

## Alternatives

- **Infer reply behavior from `intent` alone.** Rejected because `intent` says
  why the source is sending, not whether the target owes a response. A
  delegation usually expects a reply, but the protocol should not make that an
  implicit rule that every adapter must guess.
- **Use `type` as the only collaboration classification.** Rejected because the
  existing `type` axis is storage/display classification. Overloading it with
  collaboration intent and reply obligation would make future validation and
  UI/state transitions ambiguous.
- **Use one message id for all fan-out correlation.** Rejected because fan-out
  creates one logical message and multiple target obligations. Reply,
  acknowledgement, idempotency, retry, and duplicate suppression need a
  target-specific correlation key.
- **Put adapter tool names or prompt labels in the canonical envelope.**
  Rejected because names such as concrete reply tool labels belong to adapter
  rendering. Putting them in the canonical contract would leak a compatibility
  surface into the protocol.
- **Treat rendered prompt text as authority.** Rejected because rendered text is
  a display and behavior-guidance surface. It can be copied or changed by model
  output, so it cannot be the source of truth for identity, policy, delivery
  state, or reply correlation.

## Rationale

Separating `type`, `intent`, and `replyExpected` keeps the protocol axes
falsifiable. `type` answers "what kind of record is this"; `intent` answers "why
is it being sent"; `replyExpected` answers "does this delivery create a reply
obligation." This prevents adapters and agents from inferring reply behavior
from natural-language labels.

Per-target delivery correlation follows from fan-out. A single source message
may be rendered to multiple targets, and each target has its own acceptance,
acknowledgement, retry, and reply lifecycle. A logical `messageId` is therefore
not enough to identify the obligation a reply fulfills. The contract needs a
target-specific delivery correlation id.

Vendor-neutrality keeps the canonical envelope stable while allowing degraded
adapter surfaces. Codex, Claude, and future runtimes can expose different
ingress/egress mechanisms, but those mechanisms are adapter projections of the
same protocol object, not protocol authority themselves.

Daemon authority is load-bearing because non-native agents currently receive
part of the contract through prompt or side-channel rendering. The daemon store
and authenticated control plane must remain the authority for source identity,
route authorization, delivery state, reply correlation, and policy. Rendered
text can help the target agent behave correctly, but it must not be trusted as
the canonical state.

## Trade-offs

- The protocol carries more explicit fields than the MVP compatibility surface.
  This increases schema and migration work, but avoids adapter-specific guessing.
- Delivery-correlated lifecycle requires repository and adapter cutover work
  before the current implementation can claim conformance.
- Keeping adapter text non-authoritative means Tier 3 prompt-only adapters remain
  degraded even when the prompt appears to contain a complete envelope.
- The decision deliberately leaves some related policy questions open rather
  than closing them prematurely.

## Re-evaluation

Re-evaluate this decision if a supported agent runtime provides native,
authenticated A2A envelope ingestion and acknowledgement semantics that make a
different correlation boundary safer, or if G1 schema/cutover evidence shows
that the chosen axes create duplicated state that cannot be validated cleanly.

Two items are explicitly not closed by this decision:

- **Correlated reply authorization remains open.** The target direction is
  delivery correlation by `inReplyToDeliveryId`, but G1 must still decide whether
  a correlated reply requires a reverse directed route or whether the original
  delivery obligation grants a narrow reply right to the original source.
- **Public `deliveryId` namespace remains Target/Open.** This decision requires
  target-specific delivery correlation, but it does not decide that the public
  v1 `deliveryId` is identical to the current stored `message_deliveries.id`.

## Sources

- `aiox-message-lifecycle.md` §4 — owner outcome for canonical envelope, routing,
  reply correlation, delivery lifecycle, persistence minimum, current caveats,
  and open questions.
- `logs/2026-06-21-workspace-reset-W8-A2A-spec-authority.md` — W7 checker PASS
  and W8 constraints that keep correlated reply authorization and public
  `deliveryId` namespace open.
