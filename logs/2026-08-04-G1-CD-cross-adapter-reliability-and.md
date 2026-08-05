---
topic: G1-C/D cross-adapter reliability and local trust boundary
description: G1-C의 공통 MCP·Claude reliability 대칭과 G1-D의 local credential trust boundary를 계약·구현·검증한다.
status: open
---

## Work Items

- [x] W1 G1-C common MCP/reliability contract and G1-D credential-boundary decision/spike
- [x] W2 implement and verify the common `send`/`reply` MCP contract
- [>] W5 implement Claude delivery reliability symmetry and manual recovery after W2 review
- [ ] W3 implement and verify the accepted G1-D local trust boundary
- [ ] W4 perform cross-adapter direct evidence, owner reconciliation, and package closeout review

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

- Revision: 1; History pointer: `2026-08-04 · G1-C/D package bootstrap`.
- Primary boundary: Phase 0 G1-C/D: cross-adapter delivery reliability and local trust-boundary hardening
- Related artifacts in allowed write-set:
- docs/product/roadmap.md
- docs/specs/aiox-message-lifecycle.md
- docs/specs/aiox-adapter-model.md
- docs/specs/aiox-capability-policy.md
- docs/architecture/local-runtime-routing-and-delivery.md
- docs/architecture/local-runtime-claude-adapter.md
- docs/architecture/local-runtime-daemon-transport-api.md
- docs/architecture/local-runtime-gaps-and-targets.md
- Excluded:
  - G0 release identity, Phase 1 automatic ack/completed, Phase 2 durable replay/federation, G3 generic
    diagnostics/event model, and a compatibility alias for superseded MCP tool names.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution order: W2 common `send`/`reply` implementation -> independent result review -> W5 Claude delivery
  symmetry/manual recovery -> W3 trust boundary -> W4 closeout.
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
| W4 | Compact | inline | `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W4.md` |
| W3 | Compact | inline | `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W3.md` |
| W2 | Compact | inline | `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W2.md` |
| W1 | Compact | inline | `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - G1-C historical Codex Tier 3 package is decided: retained request correlation, bounded pre-write
    queue/retry/TTL, `unconfirmed`, confirmation-gated manual retransmit, and primary-reject outcome
    notification are accepted for Codex.
  - W8 Claude scope/reconnect result is committed: effective Local/User/Project registration and
    session-scoped replacement-child registration work in direct TUI evidence.
- Evidence gaps:
  - Common `send`/`reply` tool names and uniform reply results are not implemented on both adapters.
  - Claude timeout/response-loss currently resolves as `failed`, not `unconfirmed`; Claude manual recovery
    and end-to-end failure evidence are absent.
  - Claude push and channel-to-daemon message/reply auth, Codex argv secret exposure, explicit runtime
    permissions, constant-time token comparison, and Claude rollback cleanup remain unresolved.

## Cross-Artifact Effects

- Common MCP tool rename affects Codex and Claude MCP servers, tool instructions, schemas, fixtures, and
  agent-facing documentation together; no compatibility alias is allowed without explicit approval.
- G1-D credential changes affect launcher environment/config, channel HTTP headers, daemon socket requests,
  runtime paths, redaction/logging, and negative integration tests.

## Decision Candidates

- G1-C: common `send`/`reply` naming/schema and uniform reply result; Claude HTTP failure classifier and
  `unconfirmed` manual-recovery surface.
- G1-D: whether the Claude session credential is reused or purpose-separated for registration, daemon ingress,
  and `/send` push; a Codex argv-safe secret-delivery mechanism subject to verified CLI support.

## Verification Contract

- Revision: 1; History pointer: `2026-08-04 · G1-C/D package bootstrap`.
- Required:
  - RED/GREEN tests for each public contract and negative authorization path; `pnpm typecheck`; focused
    adapter/daemon suites; `git diff --check`.
  - Direct Codex and Claude TUI evidence for common `send`/`reply` availability and the selected Claude
    failure/recovery behavior.
  - Credential scan proving raw secrets are absent from argv, logs, events, errors, and rollback residue;
    permission checks for runtime directories and daemon sockets.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 1; History pointer: `2026-08-04 · G1-C/D package bootstrap`.
- Criteria:
  - G1-C common contract and Claude reliability outcomes meet roadmap G1-C requirements without claiming
    automatic ack/completed or durable replay.
  - G1-D selected trust model rejects unauthenticated/forged ingress and push, invalid tokens, forged or
    duplicate replies, route bypass, and daemon-only lifecycle-event authoring.
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
