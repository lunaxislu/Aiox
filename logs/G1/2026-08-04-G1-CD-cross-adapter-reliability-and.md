---
topic: G1-C/D cross-adapter reliability and local trust boundary
description: G1-C의 공통 MCP·Claude reliability 대칭과 G1-D의 local credential trust boundary를 계약·구현·검증한다.
status: decided
---

## Work Items

- [x] W1 G1-C common MCP/reliability contract and G1-D credential-boundary decision/spike
- [x] W2 implement and verify the common `send`/`reply` MCP contract
- [x] W5 implement Claude delivery reliability symmetry and manual recovery after W2 review
- [x] W7 implement and verify adapter-neutral source-visible delivery outcomes after W5
- [x] W4 perform G1-C Codex/Claude direct CLI/TUI evidence and owner reconciliation after W7 review
- [x] W3 implement and verify G1-D minimal local secret/runtime hygiene after W4
- [x] W6 perform G1-D hygiene owner reconciliation and package closeout after W3 review

## Required Context

### Return Target

- None: independent package log.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.
- G1-C는 historical Codex Tier 3 package를 재개하지 않는다. 그 accepted result와 W8 Claude
  reconnect/scope result를 current inputs로 소비한다.
- G1-C의 common messaging MCP contract는 `send`/`reply`다. 별도 recovery MCP tool
  `aiox_retransmit_unconfirmed_delivery`는 W5에서 Codex·Claude 양쪽에 제공한다.

## Package Scope

- Revision: 5; History pointer: `2026-08-10 · W6 closeout-review remediation — authority, write-set, and provenance correction`.
- Primary boundary: Phase 0 G1-C/D: cross-adapter delivery reliability and G1-D minimal local
  secret/runtime hygiene (Codex argv-safe secret delivery, runtime directory/socket permission, Claude
  attach rollback/detach/stop credential cleanup). Full local trust-boundary hardening — ingress/push
  authentication, UDS route authorization, credential purpose separation, constant-time comparison — is
  Phase 1 and out of this package's current boundary.
- Related artifacts in allowed write-set:
- docs/product/roadmap.md
- docs/specs/aiox-message-lifecycle.md
- docs/specs/aiox-adapter-model.md
- docs/specs/aiox-capability-policy.md
- docs/architecture/local-runtime-routing-and-delivery.md
- docs/architecture/local-runtime-claude-adapter.md
- docs/architecture/local-runtime-codex-adapter.md
- docs/architecture/local-runtime-daemon-transport-api.md
- docs/architecture/local-runtime-gaps-and-targets.md
- Excluded:
  - G0 release identity, Phase 1 automatic ack/completed, Phase 1 G1-D full trust-boundary hardening
    (ingress/push authentication, UDS route authorization, credential purpose separation, constant-time
    comparison), Phase 2 durable replay/federation, G3 generic diagnostics/event model, and a
    compatibility alias for superseded MCP tool names.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution order: W2 common `send`/`reply` implementation -> independent result review -> W5 Claude delivery
  symmetry/manual recovery -> W7 source-visible outcome implementation -> W4 G1-C direct evidence and owner
  reconciliation -> W3 trust boundary -> W6 G1-D owner reconciliation and package closeout.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - Required before accepting W2, W5, or W3 because the work changes public MCP contracts or a release trust boundary.

## Task Index

- Stable package key: g1-cd-cross-adapter-reliability-trust

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W5 | Compact | inline | `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W5.md` |
| W7 | Compact | inline | `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W7.md` |
| W4 | Compact | inline | `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W4.md` |
| W3 | Compact | inline | `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W3.md` |
| W6 | Compact | inline | `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W6.md` |
| W2 | Compact | inline | `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W2.md` |
| W1 | Compact | inline | `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - G1-C historical Codex Tier 3 package is decided: retained request correlation, bounded pre-write
    queue/retry/TTL, `unconfirmed`, confirmation-gated manual retransmit, and primary-reject outcome
    notification are accepted for Codex.
  - W8 Claude scope/reconnect result is committed: effective Local/User/Project registration and
    session-scoped replacement-child registration work in direct TUI evidence.
  - W2 is accepted: both adapters expose the common public `send`/`reply` surface and uniform successful result.
  - W5 is accepted: both adapters expose the confirmation-gated
    `aiox_retransmit_unconfirmed_delivery` recovery tool, and Claude failure/retransmit semantics have unit and
    cross-adapter daemon evidence.
  - W7 is accepted: both target adapters produce correlated daemon-authored primary delivery outcomes with
    composite `(original delivery, outcome type)` dedupe and non-recursion.
  - W4 is accepted: separate real Codex and Claude CLI/TUI runs demonstrate post-write ambiguity, correlated
    source outcomes, user-confirmed one-time recovery, and duplicate target display. This is transport-level
    delivery/recovery evidence only, not target receipt, read, or work completion.
  - W3 is accepted (2026-08-10): Codex argv-safe secret delivery (`env_vars` name-only whitelist plus
    spawn-env value injection), owner-only runtime directory (`0700`)/daemon socket (`0600`) permissions with
    chmod-failure rollback, and Claude attach rollback/detach/notifyTuiExited/stop credential cleanup
    (`claudePendingTokens`/`claudeChannelRuntimes`) all have accepted RED/GREEN test evidence and satisfy the
    Verification Contract's Phase 0 credential-residue/permission requirement.
- Evidence gaps:
  - None for Phase 0 G1-D hygiene: all three named items (Codex argv, runtime directory/socket permissions,
    Claude credential cleanup) are accepted per W3 above.
  - Claude push and channel-to-daemon message/reply ingress authentication and constant-time token comparison
    are Phase 1, deferred out of this package's current scope by Task Brief revision 4 (2026-08-10); they are
    not a current evidence gap for this package. See the 2026-08-10 Phase 1 sequencing correction entry below.

## Cross-Artifact Effects

- Common MCP tool rename affects Codex and Claude MCP servers, tool instructions, schemas, fixtures, and
  agent-facing documentation together; no compatibility alias is allowed without explicit approval.
- G1-D credential changes affect launcher environment/config, channel HTTP headers, daemon socket requests,
  runtime paths, redaction/logging, and negative integration tests.

## Decision Candidates

- G1-C: common `send`/`reply` naming/schema and uniform reply result; Claude HTTP failure classifier and
  `unconfirmed` manual-recovery surface.
- G1-D: the Claude session credential purpose-separation model (existing session-scoped registration
  credential reused for replacement-child rebind; separate daemon-ingress and `/send`-push credentials,
  each constant-time-verified at its boundary) was decided 2026-08-04 (see the W1 contract review and
  acceptance entry below); its implementation is Phase 1, not an open candidate for this package's current
  scope. The Codex argv-safe secret-delivery mechanism (`env_vars` name whitelist plus spawn-env value
  injection) is verified, implemented, and accepted as part of W3 (2026-08-10) — not an open candidate.

## Verification Contract

- Revision: 3; History pointer: `2026-08-09 · source-visible outcome implementation before W4 correction`.
- Required:
  - RED/GREEN tests for each public contract and negative authorization path; `pnpm typecheck`; focused
    adapter/daemon suites; `git diff --check`.
  - W7: RED/GREEN coverage for the canonical source outcome envelope, original-delivery correlation, one-outcome
    suppression/non-recursion, target-adapter symmetry, and the distinct recovery guidance for `unconfirmed` versus
    explicit reject.
  - W4: direct Codex and Claude CLI/TUI evidence for the accepted G1-C common tools, source-visible outcomes, and
    recovery behavior after W7 acceptance.
  - W3: credential scan proving raw secrets are absent from argv, logs, events, errors, and rollback residue;
    permission checks for runtime directories and daemon sockets.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 3; History pointer: `2026-08-10 · Phase 0/Phase 1 boundary correction — P2 remediation`.
- Criteria:
  - G1-C common contract and Claude reliability outcomes meet roadmap G1-C requirements without claiming
    automatic ack/completed or durable replay.
  - G1-D Phase 0 minimal local secret/runtime hygiene is implemented and verified: Codex argv-safe secret
    delivery, owner-only runtime directory/socket permissions, and Claude attach rollback/detach/stop
    credential cleanup leave no raw secret in argv, logs, events, errors, or rollback residue. Full local
    trust-boundary hardening — rejecting unauthenticated/forged ingress and push, invalid tokens, forged or
    duplicate replies, and route bypass, plus daemon-only lifecycle-event authoring — is the selected Phase 1
    target model (see the W1 contract review and acceptance entry below) and is not this package's closeout
    criterion.
  - Relevant spec, architecture, decision and roadmap owner records agree with accepted code and evidence.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-08-04 · G1-C/D package bootstrap

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.

### 2026-08-04 · scope synthesis

- **Confirmed inputs:** roadmap G1-C retains common invocation idempotency, adapter-symmetric state semantics,
  reply/result-path preservation and direct Codex/Claude evidence. G1-D retains authenticated ingress/push,
  raw-secret hygiene, runtime permission and rollback-cleanup requirements. Current code still has Claude
  unauthenticated `/send` and channel-to-daemon ingress, while Codex carries its ingress token through inline
  launch TOML.
- **Plan boundary:** W1 decides the contracts and performs the Codex secret-delivery support spike before any
  production implementation. W2 then owns common MCP naming/idempotency and Claude reliability; W3 owns the
  selected trust model and negative evidence. W4 consumes both results for direct evidence and closeout.
- **Next:** W1 only. Do not begin production code or tool-name removal until the contract review records the
  public fields, conflict behavior, Claude failure classifier, recovery posture, and credential directions.

### 2026-08-04 · W1 contract review and acceptance

- **Confirmed facts:** Codex currently exposes `aiox_send_message`/`aiox_reply`, while Claude exposes `send`/`reply`;
  Claude reply also omits the `message_id` returned by both Codex operations and Claude send. Neither path accepts an
  invocation key or replays an accepted source operation. Claude maps timeout/response loss to terminal `failed`,
  although the lifecycle target requires post-write ambiguity to remain `unconfirmed`. Claude registration is
  session-scoped and must remain reusable for a replacement child; its source ingress and `/send` push are currently
  unauthenticated. Codex currently puts its raw agent token in app-server argv, but the documented stdio MCP
  `env_vars` configuration can forward a named environment variable without placing its value in `-c` argv.
- **Accepted G1-C contract:** Both adapters will expose only `send` and `reply`; no legacy tool alias. Both operations
  require `invocationKey`, an opaque non-empty string, and return `{ ok: true, message_id, dispatch? }`. The key is
  scoped to the authenticated source across both operations. The daemon persists an immutable fingerprint of operation,
  source identity, typed payload, and reply correlation (when present): same key plus same fingerprint replays the
  original accepted projection with no new message, delivery, event, or reply right; a changed fingerprint returns
  stable `invocation_key_mismatch` with no side effect. Retention is process-lifetime only: clear the ledger at daemon
  start rather than imply restart/durable replay.
- **Accepted Claude reliability contract:** 2xx is `delivered`; a provable pre-write failure may enter the existing
  bounded queue/retry path; an explicit non-accepting HTTP response is `failed`; timeout, abort, or any failure whose
  pre-write nature cannot be proven is `unconfirmed` with no automatic retry. Claude receives the same operator-only,
  confirmation-gated direct retransmit surface as Codex; an ambiguous retransmit remains `unconfirmed`. This does not
  claim HTTP late-response reconciliation or automatic ack/completed behavior.
- **Accepted G1-D contract:** Keep the existing session-scoped Claude registration credential for replacement-child
  rebind, and purpose-separate it from a Claude-to-daemon ingress credential and daemon-to-Claude push credential.
  Each is verified at its boundary with constant-time comparison; ingress also binds the registered, connected agent.
  Treat the UDS as untrusted: expose only an explicit authenticated method allowlist, keeping lifecycle/event authoring
  daemon-only. Mint credentials atomically at attach; revoke all on detach, rollback, and stop; redact all values; set
  owner-only runtime-directory/socket permissions. Codex app-server receives secret values through its spawned process
  environment and forwards only named variables via MCP `env_vars`; inline config contains no raw secret.
- **Inference / residual risk:** environment forwarding removes argv exposure but does not protect secrets from a
  same-UID process able to inspect another process environment. W3 must state and test that local threat boundary.
- **Result disposition:** W1 Attempt 1 accepted by controlling review. W2 is now the next Work Item, but has not begun
  because this user turn is limited to W1. W3 remains dependent on this accepted credential boundary.

### 2026-08-05 · invocation-key issuer clarification

- **Accepted clarification:** `invocationKey` is created by the source agent (or a source-side MCP client wrapper acting
  for that agent) once per logical `send` or `reply` operation. The caller reuses exactly that value for a retry caused
  by a timeout, transport retry, or lost tool result; it creates a new value only for a new intended operation. The
  daemon never generates or substitutes the key because it cannot distinguish a retry from a new request after the
  caller has lost the result. This is an API field, not a target-generated ID or the daemon's delivery
  `idempotencyKey`.

### 2026-08-05 · user objection: invocation idempotency versus delivery recovery

- **User position:** invocation-key input may be unnecessary; Claude should instead gain the Codex-like fallback for
  timeout and related delivery failures.
- **Confirmed distinction:** Codex's current bounded retry, `unconfirmed`, late-response correlation and
  confirmation-gated manual retransmit act after the daemon has created a message/delivery and is attempting target
  delivery. Invocation idempotency instead governs a source-to-daemon `send`/`reply` re-call after the caller loses
  the accepted result; without it, that re-call creates a new message, delivery and possibly reply right. Adding the
  former to Claude therefore does not itself implement the latter.
- **Status:** no contract change made. The roadmap and lifecycle spec currently require both cross-adapter observable
  delivery semantics and ingress invocation idempotency. Removing the latter would be a roadmap/spec/plan scope
  decision requiring explicit user approval and owner reconciliation, not an implementation simplification.

### 2026-08-05 · W1 contract correction and W2/W5 sequencing

- **User decision:** remove `invocationKey`, replay, fingerprint, mismatch and ledger requirements from this package.
  The accepted G1-C work is (1) make Codex and Claude public MCP tools uniformly `send` and `reply`, then review that
  candidate independently; (2) only after acceptance, implement Claude delivery behavior symmetric to the accepted
  Codex Tier 3 path: daemon-created message/delivery, `unconfirmed` for timeout/drop ambiguity, and
  confirmation-gated manual retransmit. No automatic reinjection, ack, or `completed` claim is added.
- **Work decomposition:** W2 owns only public MCP naming/schema/result uniformity. W5 owns Claude injector/state/API
  reliability and manual recovery, and cannot begin before W2 result review accepts its candidate. W3 and W4 retain
  their prior G1-D and closeout responsibilities.
- **Owner reconciliation:** roadmap and lifecycle spec now defer source-operation invocation idempotency to a later
  SQLite-backed durable-state decision. This package does not define that future contract.

### 2026-08-05 · W5 transport review and action-gated execution

- **Confirmed code boundary:** Codex carries a JSON-RPC request ID and retains a late-response observer after timeout;
  the Claude channel is a one-way HTTP POST and has no equivalent late-response correlation. The two transports
  therefore cannot share the same recovery mechanism.
- **User-directed W5 gate:** after W2 is independently accepted, Claude must first inspect the concrete
  Claude/Codex transport differences and return a staged action proposal: (1) failure classification and state
  transitions, (2) confirmation-gated manual retransmit API/channel changes, and (3) focused tests and observability.
  No production implementation begins until that proposal is reviewed and an explicit agreement is recorded.
- **Bounded target after agreement:** align observable delivery semantics only — daemon-created message/delivery; 2xx
  `delivered`; timeout or response-loss ambiguity `unconfirmed`; explicit rejection `failed`; operator-confirmed
  direct retransmit. Claude does not promise Codex-style late-response reconciliation unless a separate Claude
  protocol capability is designed and accepted.

### 2026-08-05 · common messaging contract and symmetric recovery tool

- **User decision:** `send` and `reply` are the two common messaging MCP tools. The separately named recovery MCP
  tool `aiox_retransmit_unconfirmed_delivery` is not merged into either operation and is no longer Codex-only: W5
  must provide the same confirmation-gated tool on Claude as part of delivery-symmetry implementation.
- **Scope consequence:** W2 retains Codex's existing recovery tool while completing common messaging naming/schema
  work. W5 owns the Claude registration, schema/handler, daemon target support, instructions, and focused tests for
  the shared recovery tool; its action-review/explicit-agreement gate remains in force.

### 2026-08-05 · W2 accepted; W5 proposal phase opened

- **W2 acceptance:** independent review verified the common `send`/`reply` contract, including real registered MCP
  input/output schema parity; focused tests and type/diff checks passed. The user accepted W2 completion. Direct
  CLI/TUI evidence remains a W4 package-closeout obligation.
- **Next active work:** W5 begins only with a Claude read-only action proposal. It must divide the agreed Claude
  delivery/recovery work into reviewable slices before any production edit; after W5, review whether a separate
  structural common-schema extraction is warranted.

### 2026-08-05 · W5 action proposal controlling agreement

- **Confirmed code facts:** Claude currently collapses HTTP non-2xx and AbortError into
  `claude_channel_push_failed`; daemon dispatch therefore turns both into `failed`. The daemon retransmit API and
  socket proxy are target-neutral, but state-level retransmit currently admits only a Codex target; Claude has no
  recovery-tool registration. Codex's late JSON-RPC response handling is transport-specific and is not reusable by
  Claude's one-way HTTP push.
- **Agreed execution slices:** (A) distinguish Claude timeout/response-loss ambiguity and make it `unconfirmed`,
  while retaining explicit non-2xx as `failed`; (B) add direct, confirmation-gated Claude retransmit in daemon state,
  preserving the original delivery as `unconfirmed` on an unsuccessful attempt; (C) expose the same named
  `aiox_retransmit_unconfirmed_delivery` MCP tool on Claude with the Codex schema/result contract; (D) add focused
  unit/integration evidence and required owner-doc reconciliation. Each slice is TDD-first and returned for review
  before the next slice begins.
- **Scope decisions:** source-facing primary-reject outcome notifications remain Codex-only historical behavior and
  are not part of W5; W5's symmetry requirement is delivery state, manual-retransmit result, event record, and MCP
  recovery surface. No automatic ack, `completed`, durable replay, invocation-key ledger, or HTTP late-response
  reconciliation is added.
- **Failure-classification correction:** W5 must not retain the blanket rule "every non-abort fetch exception is
  pre-write/deferred." Only an error positively identified as connection refusal before a connection is established
  may use the existing bounded queue path. Any other fetch exception whose pre-write nature is not provable becomes
  `unconfirmed` with no automatic retry. Tests must pin both branches; if the runtime cannot expose a reliable
  connection-refusal signal, it must choose `unconfirmed`, not queue.
- **Next:** request Claude's Unit A-only TDD implementation proposal/result. Do not start Units B/C/D until Unit A is
  reviewed.

### 2026-08-05 · W5 official Claude Channels evidence

- **Confirmed official evidence:** the Claude channel is an officially documented, local stdio MCP-server bridge:
  `claude/channel` capability plus `notifications/claude/channel` delivers a `<channel>` event. However, Claude Code
  does not acknowledge that notification: `mcp.notification()` resolves after writing to its transport, not after
  Claude processes the event. If the server is not loaded as a channel or organization policy blocks it, Claude Code
  silently drops the event without reporting an error to the channel server.
- **Contract consequence:** W5's `delivered` state remains a channel-server handoff/transport-write acceptance only;
  it must never claim session receipt, model reading, or work completion. The existing reply tool is a source-message
  path, not an automatic delivery acknowledgement, so this package still does not add ack or `completed`.
- **Scope decision:** this is a documented structural limit of Claude Channels, not a new W5 recovery mechanism.
  Preserve A/B/C/D scope. Unit D must reconcile the lifecycle/Claude-adapter owner docs to state the silent-drop
  limitation and that Channels remain a research-preview dependency. The exact MCP Streamable-HTTP revision history
  is out of scope because this channel path is local stdio plus loopback POST, not Streamable HTTP.

### 2026-08-05 22:57 · 2026-08-05 · W5 Unit C implemented — Claude MCP retransmit tool

- **Scope:** Unit C only, per the agreed A/B/C/D slices. Unit A (failure classification) and Unit B (daemon
  retransmit logic) were already in the working tree and were not modified or reimplemented. Unit D (integration
  tests, owner-doc reconciliation, direct TUI evidence) has not started.
- **Implementation:** `src/adapters/claude/channel-server.ts` now registers `aiox_retransmit_unconfirmed_delivery`
  as a third tool alongside `send`/`reply`. `ClaudeChannelDaemonClient` gained
  `retransmitUnconfirmedDelivery(request: { deliveryId, confirmDuplicateRisk })`; the daemon API and socket
  transport were not touched because both are already adapter-neutral pass-through (confirmed by reading
  `src/daemon/api.ts` and `src/daemon/socket-transport.ts` before implementing). Input schema
  (`{ deliveryId: string, confirmDuplicateRisk: literal(true) }`), output schema
  (`discriminatedUnion("ok", [...])`), and handler branching (`ok:true` delivered / `manual_retransmit_unconfirmed`
  non-error unconfirmed / other reasons as MCP tool errors / thrown daemon-call errors as `daemon_call_failed`)
  are structurally identical to the existing Codex `createRetransmitUnconfirmedDeliveryHandler` in
  `src/adapters/codex/mcp-server.ts`, which was read as the reference implementation and left unmodified. No
  production schema divergence from Codex was needed. `CLAUDE_CHANNEL_INSTRUCTIONS` gained an "Unconfirmed
  Delivery Operations" section and `CLAUDE_RETRANSMIT_UNCONFIRMED_DELIVERY_DESCRIPTION` was written
  Claude-specific (not copied from Codex's Codex-runtime wording): unconfirmed-only, `confirmDuplicateRisk: true`
  required, duplicate-delivery risk, and that a delivered result is channel-transport acceptance only, not Claude
  session receipt/read/completion — consistent with the already-recorded Claude Channels silent-drop limitation.
- **TDD evidence:** tests were added first to `tests/unit/adapters/claude-channel.test.ts` (schema, factory
  registration, and handler-result cases mirroring `codex-mcp-server.test.ts`'s retransmit suite) and
  `tests/unit/adapters/mcp-tool-contract-parity.test.ts` (tool-name-set parity updated to
  `send`/`reply`/`aiox_retransmit_unconfirmed_delivery` on both adapters; W2's send/reply name and input-schema
  parity assertions were left unchanged). RED was confirmed first (12 failing: missing exports/handler,
  stale tool-name-set assertion). Implementation then made all of them GREEN with no other test changes.
- **Verification:** `pnpm vitest run tests/unit/adapters/claude-channel.test.ts
  tests/unit/adapters/mcp-tool-contract-parity.test.ts` → 61/61 passed. `pnpm vitest run tests/unit/adapters
  tests/unit/daemon` → 350/350 passed (no regression in Unit A/B or Codex tests). Full `pnpm vitest run` →
  588/588 passed. `pnpm typecheck` passed. `git diff --check` reported no whitespace errors. Direct Claude
  TUI/CLI verification was not performed; that is W4's package-closeout obligation, not W5's.
- **Not self-accepted:** this is a candidate result for independent review, per the W5 execution-gate contract.
  W5 stays `[>]` active — Unit D (cross-adapter integration evidence and owner-doc reconciliation for the shared
  recovery tool) remains before the Work Item can be considered for completion.

### 2026-08-06 16:59 · 2026-08-06 · W5 Unit C parity-test hardening — RED/GREEN

- **Scope:** test-only follow-up to Unit C, requested explicitly as "production code와 owner docs는 수정하지 말 것."
  Only `tests/unit/adapters/mcp-tool-contract-parity.test.ts` changed: tool-list assertion tightened from
  `arrayContaining`/`not.toContain` to exact-set equality for both Codex and Claude; added retransmit
  input-schema parity (valid, `confirmDuplicateRisk: false`, missing `confirmDuplicateRisk`, extra top-level
  field) and output-schema parity (`{ ok: true, message_id }`, `{ ok: false, reason:
  "manual_retransmit_unconfirmed", message_id }`); corrected the file's stale top comment, which described
  retransmit as Codex-only, to state it is a separate recovery tool (not part of the send/reply common pair)
  provided symmetrically on both adapters.
- **RED/GREEN:** no RED state was produced. `pnpm vitest run tests/unit/adapters/mcp-tool-contract-parity.test.ts`
  passed 17/17 on first run, because Unit C's production `retransmitUnconfirmedDeliveryInputSchema` (`.strict()`,
  `confirmDuplicateRisk: z.literal(true)`) and output `discriminatedUnion` schema on both adapters already
  satisfied every added assertion. This is confirmatory coverage of the already-accepted Unit C schema, not a
  bug-driven fix; no production file was touched. `pnpm vitest run tests/unit/adapters` → 205/205 passed.
  `pnpm typecheck` passed. `git diff --check` clean.

### 2026-08-09 13:23 · W5 Unit D — cross-adapter integration evidence and owner-doc reconciliation

- **Scope:** Unit D only, per the agreed A/B/C/D slices. Units A/B/C were already in the working tree
  and were not modified. This closes the two Unit D obligations recorded at Unit C's disposition:
  cross-adapter integration evidence and owner-doc reconciliation for the shared
  `aiox_retransmit_unconfirmed_delivery` recovery tool.
- **Integration evidence added:** a new `tests/unit/daemon/api.test.ts` describe block
  ("daemon API manual retransmit — cross-adapter symmetry") attaches one Codex target
  (`fakeCodexRuntime`) and one Claude target (stubbed `fetch`) to the *same* real daemon instance and
  proves (1) delivered, (2) explicit-reject, and (3) ambiguous/timeout retransmit all produce the same
  `ok`/`reason` shape on both adapters while leaving the other adapter's delivery row and events
  untouched — i.e. the `targetAgent.kind` routing discriminator in
  `state.ts:retransmitUnconfirmedDelivery` is itself exercised with both kinds present, which no prior
  test did (existing Codex and Claude retransmit suites each used a separate single-kind daemon
  instance). All three new tests were confirmatory (no RED): the routing already worked correctly.
- **Owner-doc reconciliation (within W5's declared write-set only):**
  - `docs/specs/aiox-adapter-model.md`: removed the stale "Codex-only manual retransmit tool" claim
    (now false since Claude has it too), added the tool to Claude's Egress cell, fixed the stale
    Claude effective-tier sentence that still said timeout maps to `claude_channel_push_failed`
    (pre-dates Unit A), promoted the retransmit-tool paragraph's status from `Committed target` to
    `Current` with evidence, and rewrote the "Claude 경로의 통합 증거에는 현재 공백이 있다" paragraph
    — that gap (daemon-level delivery-state resolution for channel push failure/fallback) is now
    closed by Unit A's `codex-ingress.test.ts` coverage and this unit's daemon/api.test.ts coverage;
    the one still-open item is live `claude` CLI end-to-end evidence (W4 scope), stated as such rather
    than claimed done. Also corrected several drifted code-line citations in the same paragraphs
    (channel-server.ts/injector.ts line ranges had shifted from Units A/C growing the file).
  - `docs/specs/aiox-message-lifecycle.md`: generalized the "Codex additionally exposes its own manual
    retransmit tool" caveat (§4.2 and §4.4) to both adapters; restructured the Manual retransmit
    paragraph into common-contract / Codex-means / Claude-means, moving Claude's entry from
    `[Status: Committed target]` to `[Status: Current]` with evidence; updated the two
    remaining-gap sentences (near the G1-C adapter-symmetric committed-target list and the Identifier
    boundary table) that described Claude manual retransmit as not-yet-implemented.
  - `docs/architecture/local-runtime-claude-adapter.md`: added the retransmit tool to the §6.2 step-7
    MCP-tool-registration bullet and added a new §6.3 ingress bullet describing its Claude-specific
    immediate-only resolution (no late-response path, unlike Codex). Fixed the citation on that same
    bullet and the adjacent "tool errors map to..." bullet, which had also drifted.
  - `docs/architecture/local-runtime-daemon-transport-api.md`: generalized the "Codex's separate manual
    retransmit tool" sentence and the `retransmitUnconfirmedDelivery` table row away from Codex-only
    phrasing, clarifying that only Codex resolves a *late* delivered/rejected (via retained
    `requestId` correlation) while Claude resolves immediately only.
  - `docs/product/roadmap.md`, `docs/architecture/local-runtime-routing-and-delivery.md`,
    `docs/architecture/local-runtime-gaps-and-targets.md`, `docs/specs/aiox-capability-policy.md`:
    reviewed, no further change needed — roadmap's G1-C gate criteria correctly still require W4's
    direct-TUI evidence and were not touched (per Roadmap Change Rules, gate criteria aren't lowered by
    implementation progress); the other three had no retransmit-tool-specific content to reconcile.
- **Out-of-write-set drift found, not fixed (flagging for W4, not silently expanding this package's
  write-set):**
  - `docs/architecture/local-runtime-codex-adapter.md:247-249` still states
    `aiox_retransmit_unconfirmed_delivery` "is a **Codex-only** operator direct attempt" — now false.
  - `docs/architecture/local-runtime-errors-events-smoke.md` §10.3 (Adapter — Claude table) still shows
    the pre-Unit-A classification (`claude_channel_unavailable` on "fetch threw (non-abort)",
    `claude_channel_push_failed` on "non-2xx or timeout") and has no row for
    `claude_channel_push_unconfirmed`; §11's `delivery_manual_retransmit_*` events row only cites
    `injectMessageIntoCodexTarget` as an emission site, missing Claude's
    `retransmitClaudeUnconfirmedDelivery`.
  - Neither file is in this package's declared `Related artifacts in allowed write-set`
    (`docs/product/roadmap.md`, `docs/specs/aiox-message-lifecycle.md`,
    `docs/specs/aiox-adapter-model.md`, `docs/specs/aiox-capability-policy.md`,
    `docs/architecture/local-runtime-routing-and-delivery.md`,
    `docs/architecture/local-runtime-claude-adapter.md`,
    `docs/architecture/local-runtime-daemon-transport-api.md`,
    `docs/architecture/local-runtime-gaps-and-targets.md`), so they were left unedited rather than
    expanding scope unilaterally. W4 ("cross-adapter direct evidence, owner reconciliation, and
    package closeout review") is the natural owner to reconcile them.
  - Separately, `docs/architecture/local-runtime-claude-adapter.md` §6.2 step 7 has two more
    pre-existing (not Unit-D-caused) drifted citations left as-is because they sit on bullets this
    unit did not rewrite: "Starts HTTP ingress" cites `channel-server.ts:462-500` (now the retransmit
    handler) and "Calls daemon.registerClaudeChannel"/"process.exit(1)" cites `:513-547` (now unrelated
    code); the accurate current ranges are `startClaudeChannelHttpIngress` at `:557-595` and
    `runClaudeChannelMcpServer`/`registerWithDaemon` at `:666-699`/`:608-642`. Only the citations on
    bullets this unit actually rewrote (tool registration, tool-errors-map) were corrected.
- **Verification:** `pnpm vitest run tests/unit/daemon/api.test.ts -t "cross-adapter symmetry"` → 3/3
  passed. Full `pnpm vitest run` → 597/597 passed (run 3 times to check for flakiness; one run out of
  four surfaced an unhandled-rejection `TypeError: The database connection is not open` attributed to
  `codex-ingress.test.ts`, from a real timer outliving that file's `db.close()` in a shared worker —
  reproduced with `tests/unit/daemon/api.test.ts` reverted to HEAD (pre-Unit-B/D) too, so it predates
  and is independent of this unit's changes; not investigated further as out of Unit D's scope).
  `pnpm typecheck` passed. `git diff --check` clean. `scripts/check-markdown-inline-code` passed on
  every touched doc.
- **Result disposition:** candidate result for independent review, not self-accepted, per W5's
  execution-gate contract. W5 stays `[>]` active pending that review; once accepted, W5 as a whole
  (Units A–D) can be considered for completion. W4 remains the owner for direct Claude TUI/CLI
  evidence and the flagged out-of-write-set doc drift above.

### 2026-08-09 13:44 · W5 Unit D P1 remediation — independent review response

- **Trigger:** independent review of the Unit D candidate returned no P0s but three P1s before W5 could be
  accepted. Executed via three subagents (parallel test-hardening + doc-fix, then a sequential
  re-verification subagent), per explicit user instruction to use subagents; this entry synthesizes and
  verifies their combined result.
- **P1 #1 fixed — cross-adapter event isolation was under-asserted.** The cross-adapter symmetry tests only
  asserted global event-type counts, which would still pass if a Codex retransmit's event were mistakenly
  attributed to the Claude delivery (or vice versa) as long as the total count matched. Added
  `manualEventCountForDelivery(db, type, deliveryId)` to `tests/unit/daemon/api.test.ts` and, in all three
  tests, asserted per-delivery scoping after each call: the correct delivery's event count is 1 (or the
  terminal-type-appropriate value) and the *other* adapter's delivery has 0 for that same type; after the
  second call, re-checked that the first call's attribution is unchanged (not overwritten or duplicated).
  Confirmatory only — no bug found; production code in `state.ts` already passes `deliveryId: delivery.id`
  on every `events.append` in both `retransmitUnconfirmedDelivery` and `retransmitClaudeUnconfirmedDelivery`.
  `pnpm vitest run tests/unit/daemon/api.test.ts` → 43/43 passed.
- **P1 #2 fixed — roadmap current-state claim was stale.** `docs/product/roadmap.md`'s G1-C gate card
  (`착수 검토 / 열린 결정`) said Claude's HTTP 4xx/5xx/timeout delivery-state mapping "후속 구현 workstream에서
  검증한다" (future tense) even though Unit A/D had already verified it. `docs/product/roadmap.md` was
  always in W5's declared write-set — no scope expansion needed, contrary to how the prior entry framed
  this file's status. Changed only that one clause to state the mapping is now verified by daemon-level
  integration tests; left the `통과 조건` direct-TUI-evidence requirement (still genuinely unmet, W4 scope)
  and every other bullet/gate card untouched. `scripts/check-markdown-inline-code` and `git diff --check`
  clean; diff confined to the single hunk.
- **P1 #3 addressed — "597/597" was reported as an unconditional fact without enough runs to support that.**
  A dedicated subagent ran the full suite 5 more times (clean 597/597 every time, no unhandled rejections,
  no timeouts) and additionally traced the previously-observed `codex-ingress.test.ts` DB-closed unhandled
  rejection to a concrete, pre-existing mechanism unrelated to this package: `src/daemon/state.ts`'s
  `schedulePreWriteRetry` falls back to a real un-`unref()`'d `setTimeout` (250ms) with no `.catch()` on its
  promise chain when no fake `scheduleTimeout` is injected, and 5 pre-existing test cases in
  `codex-ingress.test.ts` (lines 776, 1422, 1457, 1738, 1787 — none touched by this package's diff, which is
  a pure insertion at line 522) drive that path without injecting a fake timeout, then `db.close()`
  synchronously in `afterEach`; if the same vitest worker is still alive ~250ms later (file-scheduling
  dependent, hence rare/non-deterministic), the callback throws an unhandled
  `TypeError("The database connection is not open")`. The reviewer's separately-reported `codex-proxy.test.ts:240` 5s timeout has no shared
  mechanism found (that file has no timers at all; its one `onceMessage()` wait has no timeout wrapper and
  simply hits vitest's default 5000ms limit under load) and was not reproduced. Neither symptom reproduced in
  10 combined full-suite runs across both investigation passes (5 earlier + 5 now, one of the 5 earlier runs
  did fail with the DB-closed error). Corrected residual-risk wording (below) replaces the prior unqualified
  "597/597" claim in the Result/Verification record.
- **Verification (this entry):** full `pnpm vitest run` → 597/597 (6th consecutive clean run across this and
  the subagent's 5). `pnpm typecheck` passed. `git diff --check` clean.
  `scripts/check-markdown-inline-code` clean on `docs/product/roadmap.md` and all four previously-touched
  owner docs.
- **Residual risk (supersedes the prior entry's "597/597" framing):** 10 of 10 full-suite runs across this
  package's two verification passes were clean. Two flakes have been independently reported by the reviewer
  and an earlier pass but not reproduced in any of these 10 runs: a 5s timeout in
  `tests/unit/adapters/codex-proxy.test.ts:240` (unexplained, no timer/db mechanism found in that file) and
  an unhandled-rejection DB-closed error attributed to `tests/unit/daemon/codex-ingress.test.ts` (root-caused
  via static review to a pre-existing, un-`unref()`'d real-timer leak in `src/daemon/state.ts` shared by 5
  test cases this package did not add or modify). Both are pre-existing test-isolation defects independent of
  this package's changes, not newly introduced or newly discovered by it, and not fixed by this package
  (out of scope — no production or test file touched to address the leak itself).
- **Result disposition:** still a candidate result for independent re-review, not self-accepted. W5 stays
  `[>]` active. The three P1s from the prior review are addressed; P2s (stale citations in
  `local-runtime-claude-adapter.md` §6.2 step 7 on bullets this package didn't rewrite, and the two
  out-of-write-set files flagged for W4) remain deliberately unfixed and still flagged for W4, per the P2
  disposition in that review ("이는 보고대로 W5 write-set 밖입니다").

### 2026-08-09 · test-isolation follow-up — clean W5 verification

- **Confirmed cause and fix:** the intermittent DB-closed rejection was not a W5 delivery failure. Test setups in
  `tests/unit/daemon/codex-ingress.test.ts` sometimes used the daemon's real timeout fallback, leaving a 250 ms
  pre-write retry or 299000 ms queue-expiry callback to query the in-memory SQLite database after teardown. The
  test file now injects captured schedulers into the paired and two-Codex setups, and a discard scheduler only for
  direct tests that deliberately leave queued work; production `setTimeout` behavior and retry tests that explicitly
  execute callbacks are unchanged.
- **Verification:** focused `codex-ingress` 71/71 and an independent full `pnpm vitest run` 597/597 completed with
  no unhandled rejection; `pnpm typecheck` and `git diff --check` passed. W5 remains a candidate pending its
  independent acceptance; direct TUI evidence remains W4 scope.

### 2026-08-09 19:39 · 2026-08-09 · W5 independent-review P1 correction

- **P1 correction:** the independent W5 review found one direct queued-delivery test still using the daemon\047s real retry scheduler: `keeps Codex-to-Codex delivery queued when the target Codex has no live loaded thread`. This was a test-isolation omission, not a W5 delivery-semantic defect. Added `scheduleTimeout: discardScheduledTimeout` only to that `createDaemonState` setup; no production source changed.
- **Verification:** the named test passed, `tests/unit/daemon/codex-ingress.test.ts` passed 71/71, and full `pnpm vitest run` passed 597/597 with no unhandled rejection. `pnpm typecheck` and `git diff --check` passed.
- **Disposition:** the Codex proxy timeout investigation is recorded as a separate, unconfirmed full-suite execution flake. Per user direction, do not pursue or remediate it now. W5 remains candidate pending an independent re-review after this P1 correction.

### 2026-08-09 19:43 · 2026-08-09 · W5 P1 placement correction and re-verification

- **Correction to the prior entry:** the first edit matched a repeated `createDaemonState` shape and was placed in an unrelated setup. It was immediately removed; the only final change is `scheduleTimeout: discardScheduledTimeout` inside the named no-live-loaded-thread test at `tests/unit/daemon/codex-ingress.test.ts:792`.
- **Verification:** the named test passed, the file passed 71/71, and full `pnpm vitest run` passed 597/597. `pnpm typecheck` and `git diff --check` passed. A fresh independent check is in progress solely to verify this exact placement before W5 acceptance.

### 2026-08-09 21:16 · 2026-08-09 · W5 accepted after independent re-review

- **Acceptance:** user approved W5 after independent re-review. The reviewer found no P0; the only P1 was the remaining real scheduler in the no-live-loaded-thread test. Its exact placement was independently re-checked after correction, and the named test passed.
- **Accepted result:** Units A–D provide Claude failure classification, confirmation-gated daemon retransmit, the symmetric recovery tool, and cross-adapter delivery/event-isolation evidence. The final verification baseline is focused 1/1, `codex-ingress` 71/71, full `pnpm vitest run` 597/597, `pnpm typecheck`, and `git diff --check` all passing.
- **Disposition:** W5 is accepted and marked complete. The separately observed Codex proxy timeout remains an unconfirmed execution flake with no action by user direction. W4 still owns direct CLI/TUI evidence and the explicitly deferred out-of-write-set document drift. W3 is now the sole active Work Item.

### 2026-08-09 21:17 · 2026-08-09 · W3/W4 status correction

- **Status correction:** W5 acceptance does not authorize or begin W3. The prior acceptance entry incorrectly promoted W3 to active merely because it is next in dependency order. W3 is restored to `[ ]` pending explicit user direction; W4 remains `[ ]` and neither work item has code, test, document, or task-record changes.

### 2026-08-09 21:22 · 2026-08-09 · G1-C evidence / G1-D closeout sequencing correction

- **User-approved sequence correction:** W4 is no longer an all-in-one post-W3 closeout. It now owns the accepted G1-C direct Codex/Claude CLI/TUI evidence and the owner reconciliation that follows that evidence. This runs immediately after accepted W5.
- **Split:** W3 begins only after W4 is accepted and owns G1-D implementation plus trust-boundary evidence. New W6 consumes accepted W3 and owns G1-D owner reconciliation, registry/result-consumption gates, and package closeout. No W3, W4, or W6 execution has begun.
- **Reconciled surfaces:** Work Items, Task Index and W3/W4/W6 Compact briefs now express `W2 -> W5 -> W4 -> W3 -> W6`; plan stages and evidence/verification/closeout revision pointers match the split.

### 2026-08-09 21:35 · 2026-08-09 · W4 direct TUI evidence and owner-reconciliation candidate

- **Direct evidence:** on isolated pair `w4-g1c`, the user operated real `w4-codex` and `w4-claude` TUIs. Codex `send` -> Claude `reply` and Claude `send` -> Codex `reply` each returned `ok:true`, `message_id`, and `dispatch.delivered:1`; daemon status corroborated four messages and four delivered deliveries, with `completed=0`.
- **Recovery surface:** both real clients exposed and invoked `aiox_retransmit_unconfirmed_delivery` using `confirmDuplicateRisk:true`; a nonexistent delivery reached the shared daemon `delivery_not_found` result. This demonstrates registration, confirmation input, and error propagation only. No live timeout/drop was induced, so no direct unconfirmed-to-success retransmit claim is made; that controlled state evidence remains accepted W5 coverage.
- **Owner reconciliation candidate:** corrected the Codex-only recovery wording, Unit A Claude failure/event catalog drift, and Claude channel-server citation drift. Focused 145/145 and full 597/597 tests, typecheck, diff and edited-document inline-code checks passed. W4 remains candidate pending independent result review; W3 has not begun.

### 2026-08-09 · W4 controlled direct-recovery evidence added to the active contract

- **User-directed expansion:** the prior direct TUI evidence proved the common tool surface and daemon error
  propagation, but used a nonexistent delivery and did not exercise successful recovery. W4 now additionally
  requires one controlled live `unconfirmed` delivery and one explicit source-TUI recovery call for each adapter.
- **Codex scenario:** a temporary response-drop proxy must forward the initial target `turn/start` and suppress only
  its matching JSON-RPC response. After daemon state is `unconfirmed`, the source Codex TUI calls
  `aiox_retransmit_unconfirmed_delivery` once with `confirmDuplicateRisk:true`; record final daemon state/event and
  the target duplicate marker when observable.
- **Claude scenario:** a temporary HTTP proxy must forward the initial channel `/send` request while withholding its
  response until daemon state is `unconfirmed`. The source Claude TUI makes the same one recovery call; record final
  daemon state/event and target TUI visibility only as supplementary evidence. A channel `2xx` proves transport
  acceptance, never Claude-session receipt, read, or work completion.
- **Boundary:** initial target dispatch in both scenarios is daemon-automatic after `send`; recovery is explicitly
  user-operated through the source TUI. No automatic reinjection is introduced or claimed.

### 2026-08-09 · source-visible unconfirmed outcome — decision candidate

- **User requirement:** when a primary delivery reaches `unconfirmed`, daemon should send the source an explicit
  failure/outcome notification containing the original `deliveryId`, so the source agent can decide whether to call
  `aiox_retransmit_unconfirmed_delivery` with `confirmDuplicateRisk:true`.
- **Current-state boundary:** current W5 records the status and puts the reason in the initiating tool call's dispatch
  summary, but does not create a separate source notification for `unconfirmed`; the public tool result also does
  not expose a delivery ID. Recovery therefore needs external status/harness/operator knowledge today.
- **Scope status:** this is a new product/contract candidate, not an automatic-retransmit decision and not part of
  W4's evidence-only implementation. Its notification ownership, duplicate suppression, notification-delivery
  failure behavior, and cross-adapter scope require agreement before creating a follow-on Work Item.
- **User-guidance refinement:** the intended `unconfirmed` notice asks the source agent to first confirm with its
  user that the target is active, then decide whether the duplicate risk warrants the recovery tool. This remains
  advisory: readiness must be checked again by daemon when the tool runs, because a notice-time snapshot can be
  stale.
- **User decision — common outcome shape:** daemon-originated delivery outcomes must use one canonical, adapter-
  neutral envelope. Codex, Claude, and any later adapter receive the same outcome semantics and fields; only the
  final adapter injection transport differs. W12's byte-identical Codex/Claude renderer is the existing precedent.
  The retained outcome relation distinguishes the notification's own `deliveryId` from the original
  `outcomeForDeliveryId`; any follow-on schema must make the original recovery target unambiguous to agents.
- **User decision — source guidance content:** do not add a machine-action `recovery` object. Keep
  `error.reason`/`error.message` as the stable classification and raw transport/reject diagnostic, while a top-level
  agent-facing `message` supplies the user-consultation guidance. For `unconfirmed`, it asks the source agent to
  confirm target activity and duplicate-risk acceptance with its user before deciding whether to call retransmit.
  For explicit rejection, it says not to call retransmit and to ask the user how to resolve the rejection before a
  possible new message.
- **User-directed documentation sequence:** the follow-on outcome implementation must record its policy in a
  decision document as well as code/tests. After the resulting real W4 Codex/Claude TUI evidence, W4 must reconcile
  the relevant lifecycle, adapter, daemon-transport, error/event and roadmap owner documents to the accepted
  behavior; it must not pre-claim those direct observations.

### 2026-08-09 · independent review — source-visible outcome candidate

- **Confirmed current boundary:** W12 creates one canonical outcome only for a Codex target's primary
  `codex_jsonrpc_error`; it dispatches that same envelope to either Codex or Claude source. W5 creates no source
  outcome for primary `unconfirmed`, and Claude primary non-2xx is `failed` without one. Manual retransmit
  timeout/reject remains attempt-local and must not create a W12-style source outcome.
- **Implementation blocker requiring contract agreement:** the current outcome relation is unique per original
  delivery. If W7 emits `delivery_unconfirmed`, then a later correlated Codex explicit reject reaches the existing
  duplicate guard and can incorrectly suppress the reject transition itself. W7 must therefore separate status
  transition from notification suppression and change dedupe to at least original delivery plus outcome kind before
  the new outcome is implemented.
- **Recommended first W7 boundary:** implement only adapter-neutral primary `delivery_unconfirmed` plus explicit
  primary rejection for both Codex and Claude targets. Keep pre-write queued paths, TTL expiry, dispatch-time missing
  target, ingress/API rejection, and manual-attempt outcomes out of this first change. The former need separate
  policy because retransmit is inapplicable or daemon retry is already authoritative.
- **Superseded pre-activation gate:** this review found the then-current active pointer was W4. The user subsequently
  approved the relation contract and reconciled plan/Work Items/task records. `scripts/onramp` now selects W7 as
  the sole active work; only now may the controlling agent delegate W7 implementation to Claude.

### 2026-08-09 · source-visible outcome implementation activated before W4

- **User decision:** outcome notification dedupe is per original delivery plus outcome type. W7 must separate an
  original-delivery state transition from notification dedupe so an existing `delivery_unconfirmed` notice cannot
  suppress a later correlated explicit rejection transition or its distinct outcome.
- **Execution order now active:** `W2 -> W5 -> W7 -> W4 -> W3 -> W6`. W7 owns the policy decision document,
  implementation and automated evidence. W4 retains its completed partial surface evidence, but is pending until
  W7 is independently accepted; it then owns real-TUI validation and owner-document reconciliation.
- **First-slice boundary:** W7 covers only primary `delivery_unconfirmed` and primary explicit rejection across
  Codex/Claude targets. Queue/pre-write, expiry, target-missing, ingress rejection and manual-attempt outcomes are
  consciously deferred because their recovery policy differs or the caller already receives the result.

### 2026-08-09 · W7 candidate — adapter-neutral source-visible outcome notifications

- **Scope:** implemented via two read-only scout subagents (producer/consumer code map; schema/repository/decision-doc
  rules) followed by TDD-first implementation, per explicit user instruction to use subagents. Scope matches the W7
  task brief exactly: primary `delivery_unconfirmed` and `delivery_target_rejected` outcome notifications for both
  Codex and Claude targets, composite `(original_delivery_id, outcome_type)` dedupe, transition/notification
  independence. Excludes automatic retransmit, durable replay, invocation keys, G1-D credentials, queue/pre-write,
  expiry, missing-target, ingress/API and manual-attempt outcomes, and W4's real-TUI proof.
- **Confirmed implementation:** `delivery_outcome_notifications` gained an `outcome_type` column and a composite
  primary key (new `applyMigration5` upgrades any pre-existing single-key table); the repository dedupe lookup is now
  type-scoped. `src/daemon/state.ts` gained a shared `recordPrimaryOutcomeNotification` core (non-recursion + composite
  dedupe + the required canonical content shape, including the new top-level agent-facing `message` guidance field)
  used by both a refactored Codex reject path (byte-identical to its prior behavior) and a new symmetric Claude reject
  path (`recordClaudeTargetRejectOutcome`), plus a new `recordPrimaryUnconfirmedOutcome` called from the single shared
  `unconfirmed` branch in `dispatchToPairPeersNow` that already covered both target adapters — so both new-outcome
  producers required only one Codex-side and one Claude-side addition each, not per-reason duplication. The original
  delivery's status transition is unconditional in both cases; the notification attempt happens afterward and is
  independently gated only by the composite dedupe.
- **New evidence:** repository-level composite-dedupe tests; a schema-level migration-5 upgrade-path test (rebuilds a
  pre-existing single-key table, backfilling the only outcome kind that existed before); a rewritten
  `codex-ingress.test.ts` test proving the exact bug scenario the decision doc targets — an earlier
  `delivery_unconfirmed` notification does not suppress a later, distinct `delivery_target_rejected` notification for
  the same original delivery; a new `api.test.ts` describe block proving Claude-target `delivery_unconfirmed` and
  `delivery_target_rejected` producers dispatch symmetrically to a Codex source through the existing canonical-envelope
  pipeline, plus a Claude-source non-recursion case. Full `pnpm vitest run` 604/604, `pnpm typecheck` clean,
  `git diff --check` clean, `scripts/check-markdown-inline-code` clean on every touched doc.
- **Owner reconciliation (within W7's write-set only):** `docs/decisions/delivery-outcome-notification-dedupe-by-type.md`
  (new); `docs/specs/aiox-message-lifecycle.md` §4.2/§4.3; `docs/specs/aiox-adapter-model.md`; `docs/architecture/local-runtime-routing-and-delivery.md`
  §8.5 (removed the now-false "single notification relation" claim); `docs/architecture/local-runtime-claude-adapter.md`
  §6.4 step 5; `docs/product/roadmap.md` G1-C 착수 검토 (added a bullet for the newly-verified automated evidence; left
  the direct-CLI-evidence pass criterion untouched). `docs/specs/aiox-capability-policy.md` and
  `docs/architecture/local-runtime-gaps-and-targets.md` were checked and had nothing stale to reconcile.
  `docs/architecture/local-runtime-codex-adapter.md` remains out-of-write-set (already flagged for W4 by W5 Unit D) and
  was not edited.
- **Result disposition:** candidate result for independent review, not self-accepted, per W7's execution-gate contract.
  Full record: `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W7.md`. W7 stays `[>]` active pending that
  review. W4 remains blocked until W7 is accepted.

### 2026-08-09 · W7 independent-review P1 remediation

- **Trigger:** a fresh, independent review subagent (no prior context, read-only) inspected the candidate diff/tests
  above without editing. It found no P0, one genuine P1 code defect (empirically reproduced), one P1 stale citation,
  and one P2 wording precision note. Its verdict: the headline contract — composite dedupe, transition independence,
  Codex/Claude parity, correlation fields, non-recursion, scope boundaries, no overclaiming — was confirmed clean;
  these two items were additional in-scope work to close before acceptance.
- **P1 #1 fixed — duplicate `delivery_status_changed(failed)` event on a rejected notification-of-a-notification.**
  `injectMessageIntoClaudeTarget`'s reject branch only set the outer dispatch loop's `outcomeRecorded` flag inside
  `if (outcome)`, unlike Codex's caller which sets it unconditionally within its reject branch. When an outcome
  notification's own delivery to a Claude source was itself explicitly rejected, the non-recursion guard correctly
  returned `null` from `recordClaudeTargetRejectOutcome` (no second outcome notification), but the missing flag let
  `dispatchToPairPeersNow`'s generic failed-branch fallback redundantly re-run the status transition, duplicating the
  `failed` event. Fixed by returning `outcomeRecorded: true` unconditionally in that branch, mirroring Codex exactly.
  Added a new TDD test (`tests/unit/daemon/api.test.ts`, same describe block) asserting the notification's own
  delivery accumulates exactly `["delivering", "failed"]` — confirmed RED (`["delivering", "failed", "failed"]`)
  against the pre-fix code by temporarily reverting the fix, then GREEN after reapplying it.
- **P1 #2 fixed — stale evidence citation shifted by this candidate's own insertions.** W7 inserted ~190 new lines of
  outcome-producer functions into `src/daemon/state.ts` directly above a pre-existing, unrelated citation in
  `docs/specs/aiox-message-lifecycle.md` ("delivery 상태 매핑과 `unconfirmed` 부여 조건"), shifting
  `dispatchToPairPeersNow`/`injectMessageIntoClaudeTarget` out of the cited `1711-1772`/`1782-1852` ranges. Corrected
  to named-function citations with current accurate ranges (`dispatchToPairPeersNow`
  `src/daemon/state.ts:1789-1900`; `injectMessageIntoClaudeTarget` `src/daemon/state.ts:1902-2006`).
- **P2 addressed — architecture-doc precision.** `docs/architecture/local-runtime-routing-and-delivery.md` §8.5's
  "two independent steps, not one atomic unit" slightly overstated the guarantee: the reject path does perform both
  in one DB transaction, so an unexpected thrown error during notification creation would in fact roll back the
  transition too (not exercised by any test; practically unreachable given collision-resistant ID generation). Reworded
  to state the actual guarantee precisely: the transition applies unconditionally first, and a dedupe-suppressed
  notification attempt is a normal early return (not a thrown error) that never rolls it back.
- **Verification:** full `pnpm vitest run` → 605/605 passed (604 + 1 new). `pnpm typecheck` clean. `git diff --check`
  clean. `scripts/check-markdown-inline-code` clean on both re-touched docs.
- **Result disposition:** still a candidate result for independent re-review, not self-accepted. W7 stays `[>]`
  active.

### 2026-08-09 · W7 candidate — P1 follow-up: reject transaction-boundary separation and lifecycle-doc reconciliation

- **Trigger:** a further controlling-review pass (independent of the prior independent-review P1 remediation above)
  found `recordPrimaryTargetRejectOutcome` still committed the original delivery's `failed` transition/events and
  the outcome-notification creation in one `withTransaction`, contrary to the accepted decision that the transition
  must be unconditional and independent of notification success/failure/suppression
  ([[docs/decisions/delivery-outcome-notification-dedupe-by-type.md]]). A thrown DB exception during notification
  persistence would roll back the already-correct transition too. A second, smaller finding: the accepted W7
  composite-key/second-outcome-kind change had left `docs/specs/aiox-message-lifecycle.md` §4.5's persistence table
  saying "keyed by original delivery" (singular key), listing only migrations 2–4, and naming only "primary
  rejection outcome" as the relation's target.
- **P1-1 fixed — transaction boundary separated.** `src/daemon/state.ts`'s `recordPrimaryTargetRejectOutcome` now
  runs the status transition plus its two events in one `withTransaction`, then — only if that succeeds —
  independently attempts `recordPrimaryOutcomeNotification` in a second `withTransaction`. A notification-persistence
  exception now rolls back only its own sub-writes, never the already-committed transition. No new try/catch was
  added anywhere: propagation to the caller is unchanged from before this fix, since none of the three call sites
  (Claude/Codex immediate reject, Codex late-response reject callback) previously caught this exception either —
  this was confirmed by tracing all three before deciding the minimal-change fix was correct. `recordPrimaryUnconfirmedOutcome`
  was checked and found not to share this defect (its caller already transitions status separately beforehand) and
  was left untouched.
- **TDD evidence:** new test in `tests/unit/daemon/codex-ingress.test.ts` uses the Codex late-reject path
  (`emitLateTurnStartReject`, invoked synchronously) rather than the primary immediate-reject path, because the
  latter runs through `dispatchToPairPeers`'s per-target serialization queue, which leaves an unrelated dangling
  promise (pre-existing, unrelated to this fix) whenever `dispatchToPairPeersNow` throws — using the late-reject
  entry point exercises the identical shared `recordPrimaryTargetRejectOutcome` function without that artifact. The
  test forces a real DB exception (monkey-patched `db.prepare` throwing only for the
  `delivery_outcome_notifications` insert SQL) and proves: the call throws; the original delivery is `failed`; its
  `delivery_status_changed` events are `["delivering", "unconfirmed", "failed"]`; exactly one
  `delivery_target_rejected` event exists; and only the earlier `delivery_unconfirmed` relation persisted (the late
  reject's own relation never did). RED confirmed against the pre-fix code (delivery stayed `unconfirmed`), then
  GREEN after the fix.
- **P1-2 fixed — lifecycle doc reconciled.** `docs/specs/aiox-message-lifecycle.md` §4.5: the relation row now states
  the composite `(original_delivery_id, outcome_type)` key and both outcome kinds; the schema-evolution row now
  includes migration 5 with its backfill behavior; the `src/store/schema.ts` evidence citation was widened to
  actually include the migration-5 backfill statement it now cites as evidence.
- **Verification:** `tests/unit/daemon/api.test.ts` + `tests/unit/daemon/codex-ingress.test.ts` → 119/119;
  `tests/unit/store/schema.test.ts` + `tests/unit/store/repositories/messages-deliveries.test.ts` → 19/19;
  `pnpm typecheck` clean; `git diff --check` clean; `scripts/check-markdown-inline-code` clean on the touched doc.
  Full `pnpm vitest run` → 606/606, repeated 3 times with no unhandled rejection.
- **Out-of-write-set drift found, not fixed:** `docs/architecture/local-runtime-store-and-repositories.md:29` has the
  same stale single-key/"primary rejection outcome" wording; not in W7's declared write-set, flagged for W4.
- **Result disposition:** candidate result only, not self-accepted. Full record:
  `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W7.md`. W7 stays `[>]` active pending independent
  review of this follow-up together with the rest of the W7 candidate.

### 2026-08-10 00:06 · W7 candidate — P1/P2 remediation: notification-persistence exception isolation and doc reconciliation

- **Scope:** P1/P2 remediation on the still-open W7 candidate per the latest controlling-review pass,
  requested explicitly as "최신 P1/P2 보완만 수행하라... self-accept하지 말고 controlling independent
  review로 반환하라." Touches `src/daemon/state.ts`, `tests/unit/daemon/codex-ingress.test.ts`,
  `docs/architecture/local-runtime-routing-and-delivery.md`,
  `docs/decisions/delivery-outcome-notification-dedupe-by-type.md` only.
- **P1-1 fixed — secondary notification-persistence exception isolation.**
  `recordPrimaryTargetRejectOutcome`'s already-separated second transaction (notification persistence)
  still let a thrown DB exception propagate uncaught. Traced the concrete risk: `recordCodexTargetRejectOutcome`
  is called synchronously from the Codex late-response `onLateResponse` callback, itself invoked directly and
  synchronously from `settleResponse` inside `socket.on("message", ...)` in `src/adapters/codex/websocket.ts` —
  no promise wrapper, so an uncaught throw there escapes the WebSocket handler. Investigated existing
  diagnostic policy first (per instruction, before adding any isolation): grepped all of `src/` for
  `console.*`, `logger.`, `process.on(` — zero matches; no logging infrastructure and no process-level error
  handler exist anywhere in this codebase. The only existing precedent for background-path failure isolation
  in this same file is silent `.catch(() => undefined)` (three call sites, including the Codex late-reject's
  own `dispatchOutcomeNotification` call). No dedicated event type exists for an internal persistence failure,
  and none was invented. Fix: wrapped the second `withTransaction` call in try/catch, returning the same
  `null` the function already returns for dedupe/non-recursion suppression — no caller changes needed, since
  all three call sites already treat `null` as "no notification, but transition already committed."
  **Disclosed observability limitation** (not silently swallowed without note, per instruction): this
  isolation is currently fully silent — no log/event records a notification-persistence failure; the source
  agent simply never receives that one outcome notification. The original delivery's `failed` transition and
  its two events are unaffected either way.
- **TDD:** the existing test (asserting `.toThrow(...)`) already proved current code throws; ran it standalone
  first as RED-equivalent baseline confirming the bug is real. Rewrote it to assert `.not.toThrow()` (renamed
  to reflect the new contract), confirmed RED against the unfixed code
  (`AssertionError: expected [Function] to not throw an error but 'Error: simulated notification persist…' was thrown`),
  applied the fix, confirmed GREEN — all of the test's other assertions (original delivery `failed`,
  exact `delivery_status_changed` sequence, exactly one `delivery_target_rejected` event, only the earlier
  `delivery_unconfirmed` relation persisted with no orphaned notification row) were untouched and still pass.
  `recordPrimaryUnconfirmedOutcome` was inspected and left unmodified — out of this task's explicit P1-1 scope
  (it names `recordPrimaryTargetRejectOutcome` specifically). Flagging, not silently ignoring: its own
  transaction is called from the async `dispatchToPairPeersNow`, not a synchronous WS handler, so the risk
  class may differ, but this pass did not verify that either way.
- **P1-2 fixed — architecture doc correction.** `docs/architecture/local-runtime-routing-and-delivery.md`
  §8.5 still said "the reject path performs both in one state transaction," stale since a prior session's
  transaction-boundary split (already true before this task began). Rewrote the paragraph to state the actual
  two-transaction reject-core structure, the unconfirmed producer's different (single-transaction,
  notification-only) structure, and this task's new exception-isolation contract — explicitly not claiming
  retry, durable queuing, or eventual notification delivery.
- **P2 addressed — decision doc reconciliation.**
  `docs/decisions/delivery-outcome-notification-dedupe-by-type.md`: replaced the hypothetical "(가상의)
  file-backed DB" Trade-offs wording with the actual, already-implemented migration 5 backfill behavior; added
  body links to the architecture doc (as-built/exception-isolation owner) and lifecycle spec §4.5
  (persistence-contract owner) near the corresponding claims, per decisions/AGENTS.md's WHY-only-scope rule.
  Left Context/Alternatives/Rationale/Re-evaluation/Sources untouched — accurate as written; the Rationale's
  "ordinary delivery/event path" sentence describes a different failure mode (notification's own dispatch
  failing after its row was created) than the newly-isolated DB-persistence-exception case, deliberately left
  to the architecture doc rather than duplicated here.
- **Verification:** `pnpm vitest run tests/unit/daemon/codex-ingress.test.ts` → 72/72;
  `pnpm vitest run tests/unit/daemon/api.test.ts tests/unit/daemon/codex-ingress.test.ts` → 119/119;
  `pnpm vitest run tests/unit/store/schema.test.ts tests/unit/store/repositories/messages-deliveries.test.ts`
  → 19/19; `pnpm typecheck` clean; `git diff --check` clean. Full `pnpm vitest run` → 606/606, run 4 times
  consecutively, no unhandled rejection or flake in any run (the two previously-reported unrelated flakes did
  not reproduce). `scripts/check-markdown-inline-code` clean on both touched docs.
- **Result disposition:** still a candidate result, not self-accepted by the executing agent. Full record:
  `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W7.md`. W7 stays `[>]` active pending independent
  review of this remediation together with the rest of the candidate.

### 2026-08-10 13:13 · W7 accepted; W4 direct evidence activated

- **User acceptance:** W7 and its two P1 remediation passes are accepted after independent code, test, and
  documentation reviews. The accepted scope is adapter-neutral daemon-authored primary
  `delivery_unconfirmed`/`delivery_target_rejected` outcomes for Codex and Claude targets, canonical
  correlation/guidance payloads, `(original delivery, outcome type)` dedupe, and non-recursion.
- **Accepted evidence:** no P0/P1 remains. The reject core commits the original `failed` transition plus two events
  before separately attempting notification persistence; a forced persistence exception cannot roll back those facts
  or escape the synchronous Codex late-response callback. Focused 138 tests and a fresh full suite passed 606/606;
  typecheck and diff checks are clean.
- **Accepted residual risk:** notification-persistence DB failure is deliberately a silent no-notification result;
  it does not alter the original delivery state/events. Operational diagnostics for that rare internal failure are
  deferred.
- **Disposition / next:** W7 is `[x]`; W4 is the sole active Work Item. W4 must gather real Codex/Claude
  CLI/TUI outcome and controlled-recovery evidence, then reconcile owner docs from that direct evidence. The
  flagged single-key wording in `local-runtime-store-and-repositories.md` is a W4 reconciliation input.

### 2026-08-10 · W4 candidate — direct Codex/Claude outcome and controlled-recovery evidence

- **Confirmed direct evidence:** in separate isolated harnesses, both target adapters received the initial canonical
  envelope before only their acknowledgement path was withheld. Codex produced `codex_turn_start_timeout`; Claude
  produced `claude_channel_push_unconfirmed`. Each source TUI received the daemon-authored correlated
  `delivery_unconfirmed` notification, the user explicitly accepted duplicate risk, and the source invoked the
  shared recovery tool exactly once. Each original delivery then reached `delivered`, and each target TUI displayed
  the same envelope a second time. This proves duplicate-risking transport recovery, not receipt/read/completion.
- **Owner reconciliation:** roadmap G1-C now records the completed two-adapter direct evidence without lowering its
  no-ack/no-completed boundary. Store architecture now states the accepted composite
  `(original_delivery_id, outcome_type)` relation and migration 5.
- **Disposition:** W4 candidate is ready for independent review; W4 remains `[>]` until that review consumes it.

### 2026-08-10 14:29 · W4 independent-review correction — roadmap evidence consistency

- **Independent-review finding:** the direct Codex/Claude evidence itself, its transport-only boundary, and the
  store-architecture composite-key correction were accepted by the read-only Claude review. It found one P1
  documentation defect: `docs/product/roadmap.md` recorded the completed direct evidence in G1-C's entry review,
  but still listed that same evidence as remaining in both the common-requirements list and the Gate Evidence G1 row.
- **Correction:** the two stale remaining labels now record the direct Codex/Claude CLI/TUI evidence as completed
  G1-C evidence, while preserving the two other remaining common requirements and all G1-D evidence. The wording
  retains the boundary that this is transport-level delivery/recovery and target-display evidence, not receipt,
  read, or work completion.
- **Disposition:** W4 remains `[>]`; the corrected candidate must receive a fresh independent result review before
  any acceptance or Work Item transition.

### 2026-08-10 14:30 · W4 accepted; W3 activated

- **Result-review consumption:** the fresh independent Claude review returned `accept`. It verified that the
  corrected `roadmap.md` moves the direct Codex/Claude CLI/TUI evidence out of remaining G1 requirements into
  completed evidence in both the G1-C gate and the Gate Evidence row, while retaining the two actual remaining
  common requirements and all G1-D requirements. No review-blocking defect remained.
- **Accepted boundary:** W4 proves per-adapter transport-level ambiguity/outcome/confirmation-gated recovery and
  duplicate target display; it does not prove target receipt, reading, or work completion. The owner corrections
  retained that boundary and the store relation's composite-key/migration-5 model.
- **Reconcile / next:** W4 is `[x]`, and its accepted evidence is recorded above. W3 is now the sole `[>]` Work
  Item for the accepted G1-D local trust-boundary implementation; W6 remains pending for its later owner
  reconciliation and package closeout.

## 2026-08-10 · W3 trust-boundary execution framing

- **User question:** the prior W3 next-step sentence listed components but did not make their responsibilities or relationships clear.
- **Clarification basis:** current gap/spec/architecture sources identify four connected boundaries: credential issuance and delivery, Claude HTTP ingress/push, daemon UDS method dispatch, and local filesystem permissions/cleanup.
- **Next framing:** describe and implement W3 by boundary and attack path, then verify each boundary with a corresponding negative test and residue/permission check; do not treat launcher, channel, socket, and tests as unrelated file groups.

### 2026-08-10 15:10 · 2026-08-10 15:00 · W3 threat-model reassessment

- **Threat-model reassessment requested:** the user correctly noted that accepted contracts may be revised and asked whether token-theft scenarios are realistically reachable vulnerabilities.
- **Confirmed current reachability:** the Claude `/send` listener accepts any loopback POST without a credential; Claude send/reply calls carry only `agentName` across the daemon UDS and the daemon does no Claude ingress authorization; the socket dispatcher dynamically invokes any DaemonApi method; current `~/.aiox` is mode `drwxr-xr-x`, and the current code has no explicit mode setting for either directory or socket. Codex currently embeds its raw token in `-c` inline TOML argv.
- **Boundary implication:** a local process that can reach the socket requires no token to forge Claude ingress or invoke daemon methods; a local process that discovers the loopback Claude port can inject channel content. Token purpose separation can reduce cross-boundary replay after a secret leak, but it cannot protect against a hostile same-UID process able to read the relevant child environment or operate the owner-accessible UDS. The accepted three-token model therefore needs a user review against this concrete threat model before implementation.

### 2026-08-10 15:15 · 2026-08-10 15:15 · G1-D prioritization review

- **User prioritization input:** this project is expected to be used only by the user and a few collaborators; the user considers G1-D security/trust hardening a likely lower-priority concern.
- **Assessment:** that deployment assumption materially lowers the value of treating same-host adversarial-process resistance as a current release blocker. It does not make the existing unauthenticated UDS and loopback paths safe; rather, it accepts their residual risk and prioritizes reliability/product work. Because W3/W6 and the plan completion condition currently make G1-D release-blocking, deferral requires explicit scope/release-gate reconciliation rather than silently leaving an unmet condition.
- **Decision options prepared:** (1) defer all of W3/W6 to a later trust-boundary package, accepting raw argv and unauthenticated local ingress/UDS risk; (2) retain a narrowly scoped hygiene pass for raw argv, owner permissions, and cleanup while deferring purpose separation/route authorization; or (3) retain the accepted W3 boundary as release-blocking.

### 2026-08-10 · W3 candidate — Codex argv-safe secret delivery slice

- **Scope:** the user directed execution of only the Codex argv-token-exposure piece of W3's already-accepted
  scope (revision 4 Task Brief already lists "Codex argv-safe secret delivery" as in-scope, separate from
  runtime directory/socket permissions and Claude attach rollback/detach/stop cleanup). This does not resolve
  the broader defer/narrow/full-boundary question from the prior entry; it executes one slice explicitly
  named by the user while leaving that question open for the rest of W3.
- **Confirmed schema before implementing:** the prior W1 log summary claimed Codex's stdio `env_vars`
  configuration could forward a named environment variable without an argv value; this was independently
  re-verified rather than trusted as-is, from two sources: the installed local Codex binary
  (`codex-cli 0.147.0`, `@openai/codex-darwin-arm64`) contains `RawMcpServerConfig`'s `env` field plus
  separate `env_vars`-entry error strings (`"env_vars entry \`...\` uses source \`remote\`..."`,
  `"unsupported env_vars source \`...\`; expected \`local\` or \`remote\`"`), and the official config
  reference (`https://learn.chatgpt.com/docs/config-file/config-reference`) documents
  `mcp_servers.<id>.env_vars` as "Additional environment variables to whitelist for an MCP stdio server.
  String entries default to `source = "local"`." A plain string array of names with the default `local`
  source is the verified syntax.
- **Implementation:** `src/adapters/codex/launcher.ts`'s `buildMcpServersAioxInlineToml` now emits
  `env_vars = ["AIOX_CODEX_AGENT_NAME", "AIOX_CODEX_AGENT_TOKEN", "AIOX_SOCKET_PATH"]` (names only) instead
  of `env = { ... }` with raw values; new `buildCodexMcpEnv` supplies those three real values through
  `spawn`'s `env` option on the app-server child process (merged with `...process.env`), only when `mcp` is
  provided. `mcp-server.ts`'s consumer side (`requireEnv(env, "AIOX_CODEX_AGENT_TOKEN")` etc.) needed no
  change — it already read these three names from its own process environment regardless of how Codex
  populates them.
- **TDD evidence:** `tests/unit/adapters/codex-launcher.test.ts`'s existing "injects aiox MCP config..." test
  asserted the old, now-incorrect contract (raw token embedded in inline TOML); rewritten to assert the new
  one. RED confirmed against pre-fix code (inline TOML still contained the raw token; `env_vars` assertion
  failed). GREEN after the fix, no other test file needed changes.
- **Verification:** focused `tests/unit/adapters/codex-launcher.test.ts` → 9/9; `tests/unit/adapters` →
  205/205; full `pnpm vitest run` → 606/606; `pnpm typecheck` clean; `git diff --check` clean;
  `scripts/check-markdown-inline-code` clean on the touched doc. `rg` sweep confirmed `agentToken` in
  `launcher.ts` now flows only into the `spawn` env object, never into the TOML string builder, and no
  Codex-adapter error/log path dumps argv or the raw token.
- **Owner reconciliation (within W3's write-set only):** `docs/architecture/local-runtime-gaps-and-targets.md`
  §13 Current Gaps — split the Codex-argv clause out of the combined "Local trust-boundary gaps" bullet
  (still-open Claude ingress/push auth, permissions, constant-time comparison, and Claude rollback cleanup
  clauses were left untouched) and added an evidence-linked sentence stating the argv exposure is resolved.
- **Result disposition:** candidate result for independent review, not self-accepted, per W3's Risk gate /
  Independent reviewer requirement. Full record:
  `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W3.md`. W3 stays `[>]` active — runtime
  directory/socket permissions, Claude attach rollback/detach/stop cleanup, and the broader W3/W6
  defer/narrow/full-boundary decision from the prior entry remain open.

## 2026-08-10 · 2026-08-10 W3 Codex argv review remediation

### 2026-08-10 · W3 independent-review remediation — Codex argv documentation drift

- **Independent review:** a separate reviewer found no implementation, test, or scope-boundary defect in the Codex argv-safe slice. It found one P2 architecture-document drift: `docs/architecture/local-runtime-codex-adapter.md` still described inline `env={...}`.
- **Remediation:** updated that adapter-owner document to state `env_vars` name-only configuration plus daemon-owned app-server environment injection; raw credential values are not in inline configuration or argv.
- **Recheck:** `git diff --check` and the repository Markdown inline-code checker pass after the documentation correction. The candidate remains pending the package acceptance flow.

## 2026-08-10 · W3 candidate — runtime directory/socket owner-only permissions slice

- **Scope:** the user directed execution of the second named W3 slice (runtime directory/socket owner-only
  permissions), per Task Brief revision 4's already-accepted scope, on top of the still-pending-review Codex
  argv-safe secret delivery slice. Excludes Claude attach rollback/detach/stop credential cleanup and the
  broader defer/narrow/full-boundary W3/W6 decision from the 2026-08-10 15:15 entry, both of which remain open.
- **Confirmed call chain before implementing:** `getSocketPath()` in `src/config/paths.ts` is the sole creator
  of the profile runtime directory (`profileBaseDir()` + `mkdirSync`) when no `AIOX_SOCKET_PATH` override is
  set; that directory also backs the not-yet-wired `state.db`. `createDaemonSocketServer().start()` in
  `src/daemon/socket-transport.ts` is the sole place the actual Unix domain socket file is created, via
  `net.Server.listen()` inside `listenWithStaleSocketRetry`. Both `src/bin/aiox.ts` (production client path
  and `forkDaemonProcess`) and `src/daemon/run.ts` (daemon process entry) route through these two functions
  only; no other call site creates the runtime directory or listens on the socket.
- **Implementation:** `getSocketPath()` now calls a new `ensureOwnerOnlyRuntimeDir(dir)` —
  `mkdirSync(dir, { recursive: true })` followed by an unconditional `chmodSync(dir, 0o700)` — so a
  pre-existing, loosely-permissioned directory is corrected on every call, not only at first creation.
  `createDaemonSocketServer().start()` calls `chmodSync(options.socketPath, 0o600)` immediately after
  `listenWithStaleSocketRetry` resolves, the first point at which the socket file is guaranteed to exist.
- **Scope judgment on `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` overrides (reported per explicit instruction, not
  silently decided):** `getSocketPath()` has never created or owned the directory for an `AIOX_SOCKET_PATH`
  override — it returns the override value immediately without calling `profileBaseDir`/`mkdirSync`. This
  task preserves that boundary: only the resolver-owned default profile directory is hardened; an override's
  containing directory is left untouched because the existing contract already treats it as caller-supplied,
  and forcibly chmod'ing an arbitrary user-chosen directory would be a new, unrequested responsibility. The
  socket *file* permission fix is different in kind: it runs inside `socket-transport.ts` uniformly regardless
  of how `socketPath` was obtained, since correcting the listen target's mode after `listen()` succeeds
  protects the socket file itself, not the directory that happens to contain it. `getStatePath()` is
  intentionally untouched — it remains "SCAFFOLD ONLY" (production daemon still runs `:memory:`) and creates
  no directory today, so it is out of this filesystem-permission-hygiene scope.
- **TDD evidence:** `tests/unit/config/paths.test.ts` gained a new "runtime directory permissions (POSIX
  owner-only)" describe block (new-directory creation, correction of a pre-existing `0o755` directory,
  release-profile root); `tests/unit/daemon/socket-transport.test.ts` gained one new test asserting the
  socket file's mode is `0o600` after listen. RED confirmed first for all four (existing code produced
  umask-default directory/file modes, not `0o700`/`0o600`). GREEN after implementation; no other test file
  needed changes.
- **Verification:** focused `pnpm vitest run tests/unit/config/paths.test.ts tests/unit/daemon/socket-transport.test.ts`
  → 27/27; `pnpm vitest run tests/unit/config tests/unit/daemon` → 179/179; full `pnpm vitest run` → 610/610;
  `pnpm typecheck` clean; `git diff --check` clean.
- **Owner reconciliation (within W3's declared write-set only):** `docs/architecture/local-runtime-gaps-and-targets.md`
  §13 Current Gaps — removed the now-resolved "Runtime profile directories and daemon sockets are
  created/listened without explicitly fixing directory or socket permissions" sentence from the still-open
  "Local trust-boundary gaps" bullet, and added an evidence-linked sentence stating the default profile
  directory and daemon socket now receive owner-only permissions, explicitly scoped to exclude the
  `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` override case. `docs/product/roadmap.md` and
  `docs/specs/aiox-capability-policy.md` were reviewed and left unchanged: the roadmap's G1-D gate card
  states its 진입 조건/통과 조건 at whole-gate granularity, not per-sub-item, and capability-policy's Phase 0
  hygiene sentence is a normative target statement rather than a completed-status claim — neither needed a
  change for one resolved sub-item. Full G1-D gate-level roadmap reconciliation remains W6's package-closeout
  responsibility.
- **Result disposition:** candidate result for independent review, not self-accepted, per W3's Risk gate /
  Independent reviewer requirement. Full record:
  `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W3.md`. W3 stays `[>]` active — Claude attach
  rollback/detach/stop credential cleanup and the broader W3/W6 defer/narrow/full-boundary decision remain
  open.

## 2026-08-10 · W3 runtime-permission slice independent-review remediation

### 2026-08-10 · W3 independent-review remediation — chmod rollback, call-path correction, Phase 1 sequencing

- **Scope:** candidate remediation of three independent-review findings on the runtime directory/socket
  owner-only permissions slice above, not self-accepted: (P1) socket `chmod` failure had no rollback, (P2) a
  call-chain overclaim in that slice's own entry and its W3 task record, and (P2) stale Phase 1
  sequencing/evidence-gap wording left over from before Task Brief revision 4. Ingress authentication, UDS
  route authorization, credential purpose separation, and constant-time comparison (Phase 1) were not touched.
- **P1 fixed — socket `chmod` failure now rolls back the listening server and socket file.**
  `createDaemonSocketServer().start()` in `src/daemon/socket-transport.ts` previously let a `chmodSync` failure
  after `listenWithStaleSocketRetry` propagate to the caller (correct) but left the server listening and the
  socket file on disk (not cleaned up). It now wraps that `chmodSync` call in try/catch: on failure it runs a
  new shared `closeServerAndSocketFile(server, sockets, socketPath)` helper — the same close-then-unlink shape
  `handle.close()` already used — inside its own try/catch so a cleanup failure (e.g. `server.close()` erroring)
  cannot replace or mask the original `chmod` error, then rethrows that original error unchanged. Because the
  single `chmodSync` call site runs immediately after `listenWithStaleSocketRetry` resolves regardless of which
  internal branch it took, this applies identically whether the socket bound on the first attempt or only after
  the stale-socket-retry path removed a pre-existing file and retried.
  - **TDD evidence:** two new tests in `tests/unit/daemon/socket-transport.test.ts`. Both mock `chmodSync` via
    `vi.mock("node:fs", ...)` with `importOriginal` passthrough (`vi.mock` under this project's Vitest/ESM setup
    rejects a bare `vi.spyOn` on the `node:fs` namespace with "Module namespace is not configurable in ESM";
    confirmed this failure mode directly before switching approach) and `mockImplementationOnce` to throw only on
    the next `chmodSync` call, leaving every other call — including the pre-existing `0600`-mode assertion test
    in the same file — on the real implementation. (1) direct-listen case: RED confirmed first (`server.start()`
    already rejected with the injected error, but `existsSync(socketPath)` was still `true` — no rollback); GREEN
    after the fix, and additionally asserts `canConnect(socketPath)` resolves `false` (no listener survives).
    (2) stale-socket-retry case: pre-creates a stale file at `socketPath` so `listenWithStaleSocketRetry` takes
    its EADDRINUSE→unlink→retry branch before the same `chmodSync` call fails; RED was confirmed by temporarily
    reverting only the new try/catch (keeping the pre-existing bare `chmodSync` line) and rerunning this exact
    test — same failure shape (reject propagates, `existsSync` stays `true`); GREEN after restoring the fix.
  - **Verification:** focused `tests/unit/daemon/socket-transport.test.ts` → 10/10; focused
    `tests/unit/daemon` plus `tests/unit/config` → 181/181; full `pnpm vitest run` → 612/612; `pnpm typecheck`
    clean; `git diff --check` clean.
- **P2 fixed — call-chain overclaim corrected.** The prior slice's entry above and its W3 task record both
  stated `getSocketPath()` is the sole creator of the runtime directory and that "no other call site creates the
  runtime directory or listens on the socket." This is corrected, not rewritten in place (past History is
  append-only): `getSocketPath()` is the sole creator of the *profile* runtime directory used by the production
  paths (`createClientRuntime`, `forkDaemonProcess`, `src/daemon/run.ts`). It is not the only runtime-directory
  creator in this codebase. `src/bin/aiox.ts`'s `createSocketRuntime()` — its own header comment already labels
  it "legacy in-process runtime, used in tests," and `rg createSocketRuntime src tests` confirms the only
  reference outside its own definition is `tests/unit/cli/bin.test.ts`; production dispatch (`main()` at
  `src/bin/aiox.ts:52`) always uses `createClientRuntime` instead — falls back to `createDefaultSocketPath()`
  when no explicit `socketPath` is given, which calls `mkdtempSync(join(tmpdir(), "aiox-"))`, creating its own
  temporary directory outside the `~/.aiox` profile tree, independent of `getSocketPath()`.
  - **Scope explicitly not decided (reported, not silently judged):** whether that legacy/test-only temp
    directory needs any further hardening is not decided by this remediation. Separated fact from open scope:
    (a) confirmed by direct empirical check on this platform (`node -e` invoking `fs.mkdtempSync` and `statSync`)
    — `mkdtempSync` already creates its directory at mode `0700`, a POSIX `mkdtemp()` guarantee this slice's
    `ensureOwnerOnlyRuntimeDir` neither added nor touched; (b) the socket *file* `createDefaultSocketPath()`
    produces still receives the same unconditional `chmodSync(..., 0o600)` from this same P1 fix, since that call
    runs regardless of how `socketPath` was obtained; (c) whether `createSocketRuntime`/`createDefaultSocketPath`
    warrants further hardening, consolidation, or remains test-only by design is not decided here.
- **P2 fixed — Phase 1 sequencing corrected in the controlling log's Evidence surface.** The package-level
  `## Evidence` → `Evidence gaps` bullet (a current-state surface, not append-only History, per
  `package-log.md`'s Artifact and Evidence Tests) previously listed Claude push/ingress authentication and
  constant-time token comparison — both Phase 1 per the user's already-recorded contract (Phase 0: Codex argv
  secret removal, runtime directory/socket permissions, Claude credential cleanup; Phase 1: Claude/Codex
  ingress/push authentication, UDS route authorization, credential purpose separation, constant-time comparison)
  and per Task Brief revision 4's own Task History entry ("Full ingress/push authentication and route
  authorization move to Phase 1; this W retains only local secret/runtime hygiene") — as still "unresolved for
  W3," without noting they had already been descoped to a deferred Phase 1. Edited in place to separate the
  genuinely open Phase 0 item (Claude attach rollback/detach/stop cleanup) and the two already-candidate Phase 0
  items (Codex argv, runtime permissions) from the Phase 1 items, which are no longer a W3 evidence gap.
  - **Stale "still open" framing also found, not rewritten:** the Result-disposition footers of three prior
    entries — the two 2026-08-10 "W3 candidate" entries above (Codex argv-safe secret delivery slice, and
    runtime directory/socket owner-only permissions slice) and W3.md's matching Attempt records — each state
    "the broader W3/W6 defer/narrow/full-boundary decision from the 2026-08-10 15:15 entry remain[s] open,"
    even though both of those same entries executed against Task Brief revision 4 — which had already resolved
    that three-way choice as option (2), a narrowly scoped Phase 0 hygiene pass, deferring purpose
    separation/route authorization (Phase 1). This entry corrects the record going forward rather than editing
    the four prior occurrences: the defer/narrow/full choice is resolved (narrow); the only genuinely open item
    within current W3 scope is Claude attach rollback/detach/stop credential cleanup.
- **Out-of-explicit-scope drift found, not fixed (flagging for W6, not silently expanding this remediation's
  write-set):** the package-level `## Closeout Contract` (revision 2) still states G1-D's full trust model —
  "rejects unauthenticated/forged ingress and push, invalid tokens, forged or duplicate replies, route bypass"
  — as this package's closeout criteria, and `## Decision Candidates` still frames Claude credential
  purpose-separation as an open decision for this package. Neither literally matches the two stale patterns this
  remediation was scoped to fix ("W3's current unresolved evidence gap" / "defer/narrow/full 중 결정 대기"), and
  package-level Closeout Contract reconciliation after the Phase 0/1 split is W6's explicit responsibility
  ("perform G1-D hygiene owner reconciliation and package closeout after W3 review" — see Work Items). Left
  unedited rather than reconciling it here.
- **Not touched, confirmed by scope:** ingress authentication (Claude HTTP `/send`, Claude/Codex daemon UDS
  message/reply), UDS route authorization, credential purpose separation, and constant-time comparison — all
  Phase 1 — received no code, test, or contract changes in this remediation.
- **Result disposition:** candidate remediation for independent review, not self-accepted. W3 stays `[>]`
  active — Claude attach rollback/detach/stop credential cleanup remains the sole open Phase 0 item; Phase 1 is
  out of this package's current scope, not an open decision.

## 2026-08-10 · W3 socket-transport rollback P2 remediation — test evidence and Phase 0/Phase 1 contract alignment

### 2026-08-10 · P2 #1 — chmod-rollback failure-path test evidence

- **Trigger:** a fresh independent review of the runtime-permission remediation candidate above found no P0/P1
  code defect, but flagged two P2s: (1) no test proved the chmod-rollback swallow-catch actually preserves the
  original `chmod` error when the cleanup step itself also fails, and (2) Phase 0/Phase 1 contract drift in
  `docs/product/roadmap.md` and this controlling log's current-state sections. This entry addresses both,
  candidate-only, not self-accepted.
- **Test design and a corrected assumption:** the first attempt mocked `unlinkSync` to fail and asserted the
  rollback still surfaces the original `chmod` error. Confirming RED against a deliberately broken variant of
  the code showed the mocked `unlinkSync` was never invoked at all — direct empirical check
  (`node -e` calling `net.createServer().listen(path)` then `.close()`) proved `server.close()` on a Unix
  domain socket already removes the socket file as part of a successful close, synchronously by the time its
  callback fires, on this platform/Node version. `closeServerAndSocketFile`'s own `existsSync`/`unlinkSync`
  fallback is therefore dead code on the normal close-succeeds path; it cannot be exercised by an `unlinkSync`
  failure alone, since `existsSync` is already `false` by the time that branch is reached. The test was
  redesigned around the path that is actually reachable and actually produces residue: `server.close()` itself
  failing (via `vi.spyOn(net.Server.prototype, "close")`), which leaves both the listener bound and the socket
  file in place, since neither libuv's auto-unlink nor the fallback `unlinkSync` ever run in that case.
- **TDD evidence:** new test in `tests/unit/daemon/socket-transport.test.ts` ("preserves the original chmod
  error, and leaves the listener/socket file behind, when the close() rollback step also fails"). RED confirmed
  first by temporarily removing the outer `try { await closeServerAndSocketFile(...) } catch {}` swallow in
  `src/daemon/socket-transport.ts` (restoring a bare `await closeServerAndSocketFile(...)` before the
  `throw chmodError`) and rerunning the new test standalone: it failed with the injected `close` error
  (`"simulated server.close failure during rollback"`) surfacing instead of the `chmod` error — proving the test
  is meaningful. The swallow-catch was restored immediately after (no other production line changed), and the
  test went GREEN with no production diff from this remediation's starting state. The test captures the real
  `net.Server` instance via the `close()` spy's `this` and performs a genuine second `close()` call in a
  `finally` block so the intentionally-leaked listener does not survive past the test.
- **Direct-listen vs. stale-socket-retry choice (task item 4):** the new test uses the direct-listen path only.
  Both paths converge on the identical `chmodSync` call site and swallow-catch immediately after
  `listenWithStaleSocketRetry` resolves, already proven by the two prior (accepted) chmod-only-failure tests —
  one per path, both passing. Re-running the cleanup-failure scenario a second time via the stale-retry path
  would exercise the same shared catch block a second time without new coverage; the direct-listen path was
  chosen because it has one fewer moving part (no pre-existing stale file / prior `unlinkSync` call to
  interleave with the injected failure).
- **Residual risk — fact vs. judgment:**
  - Fact, empirically confirmed: on this platform/Node version, a *successful* `server.close()` on a bound Unix
    domain socket removes the socket file itself; the application's own `existsSync`/`unlinkSync` fallback in
    `closeServerAndSocketFile` is not reached in that case.
  - Fact, per Node's documented `server.close([callback])` contract: the callback receives an `Error` only when
    the server was not open/listening — a case that, per that same documentation, has nothing bound to clean up
    in the first place.
  - Judgment: given the two facts above, a `close()` failure that both reports an error *and* leaves a real,
    previously-bound listener/socket-file behind is not a documented, empirically-reachable Node/libuv failure
    mode on this platform today; the new test reaches it only via `vi.spyOn` fault injection, not a naturally
    occurring code path in this codebase. This does not make the swallow-catch pointless — it is still the
    correct defense-in-depth if Node/libuv behavior differs on another OS, in a future version, or under
    resource exhaustion — but the currently-provable residual risk of "a stale socket file survives a
    chmod-failure rollback" is low-probability/undemonstrated-in-production rather than a known live gap.
  - Separately, unrelated to this remediation: `createSocketRuntime`'s legacy/test-only `mkdtempSync`-based
    temp socket path (flagged in the prior remediation entry) is not affected by this fix or this residual-risk
    assessment one way or the other; this entry does not revisit that flagged, still-undecided item.
- **Verification:** `pnpm vitest run tests/unit/daemon/socket-transport.test.ts` → 11/11 (10 pre-existing + 1
  new). Broader/full-suite and typecheck/diff verification for this entire remediation (test evidence plus the
  Phase 0/Phase 1 doc corrections below) is recorded once, together, at the end of this entry.

### 2026-08-10 · P2 #2 — Phase 0/Phase 1 contract alignment across owner documents

- **Scope:** read `docs/product/roadmap.md`, this controlling log, `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W3.md`, `plans/g1-cd-cross-adapter-reliability-trust.md`, and
  `docs/specs/aiox-capability-policy.md` looking for sentences that state or imply full local trust-boundary
  hardening, or unauthenticated ingress/push/route-bypass rejection, as a Phase 0/W3 closeout condition, or that
  re-open the already-decided minimal-hygiene scope as if it were still undecided. `plans/g1-cd-cross-adapter-reliability-trust.md`,
  `docs/specs/aiox-capability-policy.md`, and `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W3.md`
  were already correctly scoped (plan's Completion condition and capability-policy §7.2 already state the
  Phase 0 hygiene / Phase 1 deferral boundary correctly; W3.md's Task Brief revision 4 already states the
  narrowed scope correctly) — left unedited. Two files needed correction:
  - `docs/product/roadmap.md`'s G1-D "착수 검토 / 열린 결정" list (the gate's "목표" and "통과 조건" sections
    were already correctly scoped) still posed API request authentication, route verification/classification,
    Claude push/ingress token verification, and the `/send` unauthenticated-ingress gap as open decisions for
    G1-D's current scope — one bullet explicitly said to treat the `/send` gap "as a release-gating auth
    vulnerability." This directly conflicts with the decided Phase 1 deferral (`Phase 1` phase card, lines
    ~465-476, already states the correct forward contract). Replaced the four stale bullets with a scope
    statement (Phase 0 = Codex argv delivery, runtime dir/socket permission, Claude rollback cleanup) plus an
    explicit Phase 1 deferral bullet naming every deferred item, and reworded the `/send` bullet to state it is
    a documented current gap in Phase 1 scope rather than release-gating. No Phase 1 item was deleted — all are
    still named, just correctly classified.
  - This controlling log's `## Package Scope`, `## Decision Candidates`, and `## Closeout Contract` (all
    current-state surfaces per `package-log.md`'s Artifact/Evidence Tests, not append-only History) had been
    explicitly flagged as out-of-scope drift in the prior remediation entry above ("flagging for W6, not
    silently expanding this remediation's write-set... Left unedited rather than reconciling it here"). This
    task's explicit user instruction directs fixing these now, without preempting W6's later full owner
    reconciliation — a narrower fix than W6's eventual pass. Corrected: `Package Scope`'s primary boundary from
    unqualified "local trust-boundary hardening" to the Phase 0 hygiene subset, with Phase 1 items added to the
    `Excluded` list (previously listed only "Phase 1 automatic ack/completed," a G1-C item — G1-D's Phase 1
    items were entirely absent from `Excluded`). `Decision Candidates`' G1-D bullet, which posed
    purpose-separation as an open "whether" question and Codex argv delivery as still "subject to verified CLI
    support," corrected to state both are already decided/implemented (with dates and pointers), not open
    candidates. `Closeout Contract`'s G1-D criterion, which required this package's own closeout to reject
    unauthenticated/forged ingress and push and route bypass — full Phase 1 criteria — narrowed to the Phase 0
    hygiene subset, with the full trust model re-labeled as the selected Phase 1 target (not deleted, not this
    package's closeout gate). All three sections' `Revision` counters were bumped with a history pointer to
    this entry, consistent with how prior revisions in this same log were tracked.
- **Not fixed, explicitly out of this task's scope (reported, not silently left):** the flagged
  `createSocketRuntime`/`mkdtempSync` legacy temp-path hardening question and the out-of-write-set doc drift in
  `docs/architecture/local-runtime-codex-adapter.md` / `local-runtime-errors-events-smoke.md` /
  `local-runtime-store-and-repositories.md` (all previously flagged for W4/W6) remain unresolved by this entry;
  none of them are Phase 0/Phase 1 boundary conflicts, and none were named in this task's remediation targets.
- **Verification:** `scripts/check-markdown-inline-code docs/product/roadmap.md` clean. This same command
  against this controlling log reports four pre-existing inline-code issues at lines 345/347/360/361 — all
  inside the unrelated 2026-08-05 "W5 Unit C" entry, predating and untouched by this remediation; left as-is
  per scope discipline (fix only what this edit touched). `git diff --check` and the full verification run are
  recorded together below.

### 2026-08-10 · Combined verification for this remediation

- `pnpm vitest run tests/unit/daemon/socket-transport.test.ts` → 11/11.
- `pnpm vitest run tests/unit/daemon tests/unit/config` → 182/182 (181 pre-existing + 1 new; no regression).
- Full `pnpm vitest run` → 613/613 (612 pre-existing + 1 new).
- `pnpm typecheck` clean.
- `git diff --check` clean.
- `scripts/check-markdown-inline-code docs/product/roadmap.md` clean.
- `.agents/skills/log/scripts/package-log check logs/G1/2026-08-04-G1-CD-cross-adapter-reliability-and.md` →
  all `OK` (stable-key, all seven W-id identities, registry-integrity); nothing actionable.
- **Result disposition:** candidate remediation for independent review, not self-accepted by the executing
  agent. W3 stays `[>]` active — Claude attach rollback/detach/stop credential cleanup remains the sole open
  Phase 0 item. This entry does not itself change W3's completion status; it only hardens W3's existing
  runtime-permission rollback test evidence and corrects Phase 0/Phase 1 contract drift the independent
  reviewer found.

## 2026-08-10 · W3 candidate — Claude attach rollback/detach/stop credential cleanup

- **Scope:** the user directed TDD implementation of W3's last remaining Phase 0 item — Claude attach
  rollback/detach/stop credential cleanup — explicitly as a candidate, not self-accepted. Excludes Codex lifecycle,
  ingress/push authentication, UDS route authorization, credential purpose separation, and constant-time comparison
  (Phase 1), all untouched.
- **Confirmed gap, traced before implementing:** `registerClaudeChannel`/`disconnectClaudeChannel` were already
  correct (the accepted W1 rebind contract keeps `claudePendingTokens` alive across same-token re-registration while
  attached, and `disconnectClaudeChannel` already clears both `claudePendingTokens` and `claudeChannelRuntimes` on
  explicit disconnect). Three other Claude credential-bearing exit paths did not: `rollbackAgentAttach`
  (`src/daemon/state.ts:1049`) cleared only `codexPendingTokens`/`codexChannelRuntimes`/`codexRuntimes`, never
  touching the two Claude maps even for a Claude agent name; the shared `detachCodexAgent` helper
  (`src/daemon/state.ts:2887`, used by both the generic `detachAgent` and `notifyTuiExited` DaemonApi methods, which
  the socket transport dispatches by method name only — confirmed via `src/daemon/socket-transport.ts:205`'s
  `api[request.method]` dynamic dispatch, not gated by agent kind) had the identical gap; and `stop()`
  (`src/daemon/state.ts:1402`) only deleted the two Codex maps for agents it marked disconnected, never the Claude
  ones, regardless of `daemonOnly`. Separately confirmed Claude ingress (`receiveClaudeChannelMessage`/`Reply`) has
  no token or connection-status check at all (`ReceiveClaudeChannelMessageRequest` carries no `token` field, unlike
  Codex's `authorizeCodexIngress`) — this is the already-documented Phase 1 gap and was not touched. The
  residue-relevant runtime state actually consumed by later dispatch is `claudeChannelRuntimes`, gated only by
  `claudeChannelRuntimes.has(targetAgent.name)` in `injectMessageIntoClaudeTarget`/`retransmitClaudeUnconfirmedDelivery`
  (`src/daemon/state.ts:1930`/`2036`), with no `agent.status` check — so a stale entry surviving detach/rollback/stop
  would let the daemon keep pushing to a since-torn-down HTTP endpoint.
- **TDD:** wrote 8 tests first in `tests/unit/adapters/claude-channel.test.ts:378-691` (new describe block
  "Claude credential cleanup — attach rollback, detach, and stop"): registration with the issued pending token
  rejected (`unknown_token`) after `rollbackAgentAttach`, `detachAgent`, `notifyTuiExited`, and a full `stop` (not
  `daemonOnly`) respectively; a registered runtime cleared and the agent marked disconnected after `rollbackAgentAttach`;
  a paired second Claude agent's message to a since-detached/since-stopped Claude target deferring
  (`target_runtime_unavailable`) instead of using its stale runtime; and one confirmatory test proving same-token
  re-registration while still attached — the accepted rebind contract — keeps working. RED confirmed first: 6 of 7
  negative tests failed against pre-fix code (the live-rebind test and the eventual 8th test were unaffected by the
  gap and passed immediately, correctly not exercising these paths).
- **Implementation:** three call sites in `src/daemon/state.ts` each gained two lines — `claudePendingTokens.delete`
  and `claudeChannelRuntimes.delete` for the affected agent name — alongside their existing Codex-map deletes, with
  no other logic changed: `rollbackAgentAttach` (:1067-1068), the shared `detachCodexAgent` (:2911-2912), and `stop`'s
  per-stopped-agent loop (:1411-1412, still gated by the pre-existing `!request.daemonOnly` condition, unchanged).
  `registerClaudeChannel`, `disconnectClaudeChannel`, Codex lifecycle, and all Phase 1 surfaces are untouched.
- **Verification:** the focused new describe block → 8/8. Full `tests/unit/adapters/claude-channel.test.ts` →
  58/58. `tests/unit/daemon` → 163/163 (no regression). Full `pnpm vitest run` → 621/621, run three times
  consecutively with no flake. `pnpm typecheck`
  clean. `git diff --check` clean. `rg` sweep found no new path where a raw Claude token reaches a log/event/error;
  the only production reference pattern remains the existing hashed `claudeTokenFingerprint`/`tokenHash` bookkeeping
  already in place before this change.
- **Owner reconciliation (within W3's declared write-set only):** `docs/architecture/local-runtime-gaps-and-targets.md`
  §13 Current Gaps — replaced the stale "Claude attach rollback also leaves `claudePendingTokens` uncleared... this
  cleanup gap is Claude-specific" sentence (now false) with an evidence-linked sentence covering all three fixed exit
  paths, and added a new Evidence sub-entry citing the changed function ranges and the new test block.
  `scripts/check-markdown-inline-code` clean on the touched doc.
- **Not changed, confirmed by scope:** Codex lifecycle (`recordCodexRuntimeFailed`, `codexRuntimes` disposal),
  Claude/Codex ingress or push authentication, UDS route authorization, credential purpose separation, and
  constant-time comparison — all received no code, test, or contract changes.
- **Result disposition:** candidate result for independent review, not self-accepted, per W3's Risk gate /
  Independent reviewer requirement. Full record: `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W3.md`.
  W3 stays `[>]` active — this closes the last named Phase 0 item (Claude attach rollback/detach/stop credential
  cleanup); the broader W3/W6 defer/narrow/full-boundary decision was already resolved as narrow (Phase 0 only) per
  the 2026-08-10 remediation entry above, so no scope decision remains open for W3 itself. This log is now past the
  hard split threshold (1200+ lines); not split in this turn — flagging per the Long Log Split Guard rather than
  deciding unilaterally.

## 2026-08-10 · 2026-08-10 W3 acceptance and W6 owner reconciliation

### 2026-08-10 · W3 accepted; W6 owner reconciliation started

- **W3 result consumption:** independent review found no P0/P1 defect in the three Phase 0 hygiene slices (Codex argv-safe secret delivery, runtime directory/socket permissions including chmod-failure rollback, and Claude credential cleanup). The controlling review accepts W3 revision 4; its Phase 1 exclusions remain deferred and are not W3 gaps.
- **Work transition:** W3 is `[x]`; W6 is now the single active `[>]` Work Item for owner reconciliation and package closeout.
- **User-directed decision ownership:** retain `docs/decisions/claude-channel-trust-and-registration.md` as the historical rationale owner for dynamic endpoint registration and rejecting tokenless registration. Retain `docs/decisions/claude-channel-session-reconnect-token.md` as the current session-scoped credential and replacement-child rebind decision; current owner documents must prefer it for credential-lifetime claims. Do not create or delete a decision document in this reconciliation.
- **Long-log lifetime decision:** the controlling log remains a single lifetime because W1 through W6 share the same G1-C/D package contract, evidence chain, and closeout consumer. Its 1000-line threshold is therefore recorded as reviewed rather than triggering a split.
- **Immediate owner edits:** W6 corrected the plan Objective to the Phase 0 hygiene / Phase 1 auth-route boundary, made the reconnect decision state its narrow supersession explicitly, and changed roadmap/spec/Claude architecture references so the current credential conclusion appears before the historical topology rationale.

### 2026-08-10 · W6 candidate — G1-D hygiene owner reconciliation audit and package closeout readiness

- **Scope:** continuation of W6 (still `[>]`, not self-accepted). Four parallel read-only subagents audited (a)
  W1–W7 task-record disposition/dependency consistency and Registry Integrity, (b) W3's `src`/test diffs against
  this log's narrative, (c) roadmap/capability-policy/architecture Phase 0/1 boundary and decision-reference
  correctness, (d) whether the three doc-drift items W5 Unit D and W7 had flagged as out-of-write-set "for W4"
  were actually resolved. Findings consumed below; full detail in
  `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W6.md`.
- **This log's own Evidence/Decision Candidates sections were stale and corrected above:** the `## Evidence` →
  `Evidence gaps` bullet still said Claude credential cleanup "remains unresolved for W3" and Codex
  argv/runtime-permission work was "pending independent result-review acceptance," even though this log's own
  2026-08-10 "W3 accepted; W6 owner reconciliation started" entry had already accepted all three.
  `## Decision Candidates`'s Codex argv sentence had the same staleness ("pending independent review"). Both
  are edited in place (current-state surfaces, not append-only History) to state W3's accepted disposition;
  no History entry was rewritten.
- **W3.md (Compact task record) was stale relative to this log:** independent audit found W3.md was the only
  one of W1/W2/W4/W5/W7/W3 whose Compact record never received a final acceptance digest — its last entry
  still read "W3 stays `[>]` active" although this log accepted W3 on 2026-08-10. Appended a closing entry to
  W3.md mirroring this log's already-recorded acceptance; no prior W3.md entry was rewritten.
- **Roadmap drift found and corrected:** `docs/product/roadmap.md`'s Gate Overview table listed G1-A/B/C but
  had no `G1-D` row despite G1-D having its own full gate card. The Gate Evidence table's `G1` row still listed
  "raw-secret residue checks, runtime permission, and rollback-cleanup evidence" under "Remaining G1 release
  evidence" after W3's acceptance. Both corrected: added the missing Gate Overview row; moved the now-accepted
  G1-D Phase 0 hygiene evidence into the completed/consumed clause.
- **Architecture-doc completeness gap found and corrected:** `docs/architecture/local-runtime-claude-adapter.md`
  (in this package's declared write-set) described only the normal `disconnectClaudeChannel` exit path; it did
  not mention the three other Claude-credential-bearing exit paths W3 added
  (`rollbackAgentAttach`/shared `detachCodexAgent`/`stop`), even though `local-runtime-gaps-and-targets.md` §13
  already covered them and the sibling Codex argv fix had updated both the gaps doc and the Codex adapter doc.
  Added a new §6.2 step 10 with evidence citations.
- **Confirmed already correctly reconciled, not touched:** `docs/specs/aiox-capability-policy.md` §7.1/§7.2 (best
  aligned of the five docs audited), `docs/architecture/local-runtime-gaps-and-targets.md` §13 (all three Phase 0
  items evidence-linked and independently re-verified against source line ranges), `plans/g1-cd-cross-adapter-reliability-trust.md`
  Objective/Completion condition, both Claude decision documents (neither deleted, merged, or rewritten as
  current fact; `claude-channel-session-reconnect-token` is cited before `claude-channel-trust-and-registration`
  everywhere credential lifetime is the claim), and `docs/specs/aiox-message-lifecycle.md`/`aiox-adapter-model.md`
  (no G1-D-specific content to reconcile).
- **Residual risk — Package Scope write-set vs. accepted practice mismatch (not resolved here):** Package
  Scope's declared "Related artifacts in allowed write-set" omits `docs/architecture/local-runtime-codex-adapter.md`,
  yet this log's own 2026-08-10 "W3 Codex argv review remediation" entry records an independent-review-directed
  edit to exactly that file, and the edit is present as verified, correct, uncommitted content in the current
  working tree. This is reported, not silently fixed or reverted — expanding or narrowing a declared write-set
  is a governance call this candidate pass does not decide unilaterally.
- **Residual — minor provenance gap (not resolved here):** the already-correct composite-key wording in
  `docs/architecture/local-runtime-store-and-repositories.md` (fixed in commit `75d762f`) has no explicit
  W-attribution in either W4.md's or W7.md's Changed-artifacts list. Content is correct; only the provenance
  record is thin. Not corrected because doing so would mean editing another W's append-only Result record.
- **Verification:** `pnpm vitest run` → 621/621; `pnpm typecheck` clean; `git diff --check` clean across the
  full working tree; `scripts/check-markdown-inline-code` clean on every doc touched this pass (`roadmap.md`,
  `local-runtime-claude-adapter.md`, `W3.md`, `W6.md`, and this log); this log's own 4 pre-existing inline-code
  flags at lines 345/347/360/361 (inside the unrelated 2026-08-05 "W5 Unit C" entry) are unchanged and remain
  out of scope per this log's own 2026-08-10 remediation entry. `.agents/skills/log/scripts/package-log check`
  → all `OK` (stable-key, all 7 W-id identities, registry-integrity). Raw-secret residue scan
  (`rg agentToken src/adapters/codex/launcher.ts`, `rg "console\.|logger\." src/`) found no exposure path.
- **Result disposition:** candidate reconciliation pass, not self-accepted, and package closeout is not
  declared. W6 stays `[>]` active pending independent review of this pass. Phase 1 (Claude/Codex ingress/push
  authentication, UDS route authorization, credential purpose separation, constant-time comparison, Tier 2
  ack/`completed`) remains untouched and unimplemented — pointers: `docs/product/roadmap.md` Phase 1 section
  (~line 481), `docs/specs/aiox-capability-policy.md` §7.2, `docs/architecture/local-runtime-gaps-and-targets.md`
  §13's remaining "Local trust-boundary gaps" clause.

### 2026-08-10 22:45 · 2026-08-10 · W6 closeout-review remediation — authority, write-set, and provenance correction

- **Independent-review remediation:** direct source inspection confirmed that `process.stderr.write` output paths exist in `src/bin/aiox.ts`, `src/adapters/claude/channel-server.ts`, and `src/adapters/codex/mcp-server.ts`. The prior W6 raw-secret wording is corrected: the reviewed source shows no raw W3 token value passed to those inspected output calls (Claude registration uses `tokenHash`), rather than claiming no logging path exists.
- **Decision provenance:** `docs/decisions/claude-channel-trust-and-registration.md` now carries a conservative current-authority note. It preserves the historical dynamic-registration/tokenless-rejection WHY while directing only the superseded single-use credential conclusion and its source evidence to `docs/decisions/claude-channel-session-reconnect-token.md`.
- **Write-set and provenance correction:** Package Scope revision 5 explicitly names `docs/architecture/local-runtime-codex-adapter.md`, which W3 changed to reconcile Codex argv-safe delivery. W3.md now records that accepted affected-owner artifact. W4.md now records the composite-key owner-document correction from `75d762f`; W7 had explicitly routed that drift to W4. These corrections do not expand Phase 0 or revive Phase 1 work.
- **Disposition:** this remediation is a W6 candidate only. W6 remains `[>]`; package closeout remains undeclared pending independent review.

## 2026-08-10 · 2026-08-10 W6 acceptance and package closeout

### 2026-08-10 · W6 independent-review acceptance and package closeout

- **Independent-review disposition:** a fresh re-review found no P0/P1/P2 blocker in W6 Attempt 2. It confirmed the historical Claude decision preserves topology/tokenless-rejection WHY while current credential lifetime points to the reconnect decision; write-set, raw-secret scan, and W4 provenance remediations are coherent.
- **Result consumption:** W1, W2, W3, W4, W5, and W7 are accepted, W6 reconciliation is accepted, and current package Scope/Evidence/Verification/Closeout surfaces agree with the Phase 0 hygiene result. The Result Consumption Gate passes.
- **Required verification:** `pnpm typecheck`, package registry integrity, and `git diff --check` pass. One initial full Vitest closeout run showed broad socket/HTTP test failures; its cause was not established. The focused socket suite then passed 11/11, and two subsequent full default runs passed 621/621. No production change occurred between the runs. This is recorded as a non-reproduced test-stability observation, not evidence of a Phase 0 regression.
- **Closeout:** all package criteria are met for the explicitly narrowed Phase 0 scope. W6 and this package are closed. Phase 1 ingress/push authentication, UDS route authorization, credential purpose separation, constant-time comparison, and Tier 2 ack/completed remain deferred in roadmap/capability/architecture owners and are not implied complete by this closeout.
