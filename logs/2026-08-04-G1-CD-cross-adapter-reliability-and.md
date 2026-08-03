---
topic: G1-C/D cross-adapter reliability and local trust boundary
description: G1-C의 공통 MCP·invocation idempotency·Claude reliability 대칭과 G1-D의 local credential trust boundary를 계약·구현·검증한다.
status: open
---

## Work Items

- [>] W1 G1-C common MCP/reliability contract and G1-D credential-boundary decision/spike
- [ ] W2 implement and verify the accepted G1-C cross-adapter contract
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
- G1-C의 common `send`/`reply` contract와 Codex-only manual recovery tool은 같은 것으로
  취급하지 않는다.

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
- Execution default: contract-first, then TDD implementation; W2 and W3 write scopes are fixed only after
  W1 contract review.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - Required before accepting W2/W3 because the work changes public MCP contracts and a release trust boundary.

## Task Index

- Stable package key: g1-cd-cross-adapter-reliability-trust

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
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
  - Common `send`/`reply` tool names and invocation-key replay are not implemented on either adapter.
  - Claude timeout/response-loss currently resolves as `failed`, not `unconfirmed`; Claude manual recovery
    and end-to-end failure evidence are absent.
  - Claude push and channel-to-daemon message/reply auth, Codex argv secret exposure, explicit runtime
    permissions, constant-time token comparison, and Claude rollback cleanup remain unresolved.

## Cross-Artifact Effects

- Common MCP tool rename affects Codex and Claude MCP servers, tool instructions, schemas, fixtures, and
  agent-facing documentation together; no compatibility alias is allowed without explicit approval.
- Invocation idempotency affects MCP input/output schemas, daemon API/state transaction boundaries,
  persistence/retention, and message/reply-right creation tests.
- G1-D credential changes affect launcher environment/config, channel HTTP headers, daemon socket requests,
  runtime paths, redaction/logging, and negative integration tests.

## Decision Candidates

- G1-C: common `send`/`reply` naming and schema; invocation-key field, replay retention and mismatch error;
  Claude HTTP failure classifier; Claude `unconfirmed` manual-recovery surface.
- G1-D: whether the Claude session credential is reused or purpose-separated for registration, daemon ingress,
  and `/send` push; a Codex argv-safe secret-delivery mechanism subject to verified CLI support.

## Verification Contract

- Revision: 1; History pointer: `2026-08-04 · G1-C/D package bootstrap`.
- Required:
  - RED/GREEN tests for each public contract and negative authorization path; `pnpm typecheck`; focused
    adapter/daemon suites; `git diff --check`.
  - Direct Codex and Claude TUI evidence for accepted delivery, same-key replay, conflict, and the selected
    Claude failure/recovery behavior.
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
