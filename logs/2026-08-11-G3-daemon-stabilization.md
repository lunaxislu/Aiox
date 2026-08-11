---
topic: G3 daemon stabilization
description: daemon lifecycle, socket transport, diagnostics 실패 경계를 release-grade로 고정하는 roadmap G3 게이트: fatal/expected-error 경계, SIGTERM/stop cleanup, structured retained diagnostics/log 표면(redaction 포함), socket method dispatch hardening, Claude channel boot-failure diagnosability, Codex·Claude 최소 read-only connection/delivery-guarantee diagnostics
status: open
---

## Work Items

- [>] W1 G3 gap audit and diagnostics/logging design contract — 현재 4개 gap 영역(fatal/expected-error 경계, Claude channel boot-failure diagnosability, socket method dispatch hardening, Codex/Claude read-only diagnostics)을 code/test 근거로 정밀 확인하고 'bounded input/queue' 범위와 diagnostics 표면 설계 방향을 결정한다

## Required Context

### Return Target

- None: independent package log.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.

## Package Scope

- Revision: 1; History pointer: `2026-08-11 · G3 kickoff`.
- Primary boundary: roadmap G3 daemon stabilization gate 통과 조건: daemon lifecycle/transport/diagnostics failure-boundary hardening과 owner 문서 정합
- Related artifacts in allowed write-set:
- docs/product/roadmap.md
- docs/architecture/local-runtime-daemon-transport-api.md
- docs/architecture/local-runtime-gaps-and-targets.md
- docs/architecture/local-runtime-claude-adapter.md
- docs/specs/aiox-capability-policy.md
- docs/specs/aiox-adapter-model.md
- src/daemon/run.ts
- src/daemon/socket-transport.ts
- src/daemon/state.ts
- src/daemon/api.ts
- src/adapters/claude/channel-server.ts
- Excluded:
  - Durable database/persistence, restart recovery (`docs/architecture/local-runtime-gaps-and-targets.md` §13 "Daemon Database Durability & Recovery"; Phase 2 owner).
  - Stale agent transition policy (signal, threshold, automatic action) — Phase 1 owner.
  - Local trust-boundary auth hardening: ingress/push authentication, route authorization, credential purpose separation, constant-time comparison — Phase 1 trust-boundary hardening owner (G1-D already closed Phase 0 hygiene only).
  - `claude_channel_disconnected` event 신설, generic typed capability/tier-evaluator/diagnostics model·API, adapter registry/event boundary — Phase 2 owner.
  - 새 delivery-state policy, delivery FSM 변경 — roadmap G3는 read-only diagnostics만 요구하고 policy를 만들지 않는다.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution default: W1은 controlling이 현재 thread에서 inline으로 수행하는 read-only discovery다. 이후 구현 W는 W1 synthesis 결과에 따라 inline/delegated를 정한다.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - Active: 이 package는 release-gate(G3)이며 `docs/product/roadmap.md`, 여러 `docs/architecture/`·`docs/specs/` owner와 daemon 핵심 코드를 함께 바꾸는 multi-owner public-contract claim이다. 구현 W의 candidate result를 accepted로 승격하기 전 controlling이 독립 subagent에게 실제 source/artifact/검증 근거 재검토를 맡긴다.

## Task Index

- Stable package key: 2026-08-11-G3-daemon-stabilization

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W1 | Compact | inline | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - Owner-document current-gap claims already read (not yet independently cross-verified against `src/` by this package): `docs/architecture/local-runtime-gaps-and-targets.md` §13 Current Gaps — Runtime Failure Wiring, Daemon structured logging/retained diagnostics surface gap, Local trust-boundary gaps, `claude_channel_disconnected` event gap, Claude channel boot-failure diagnosability gap, Daemon socket method dispatch hardening gap; `docs/architecture/local-runtime-daemon-transport-api.md` §4–5 daemon lifecycle/socket-transport/API surface; `docs/architecture/local-runtime-claude-adapter.md` §6.2 Launch Flow (attach returns success before channel-server listening confirmed); `docs/specs/aiox-capability-policy.md` §7.2 (fatal-exit/redaction norm stated but not yet cited to implementation); `docs/specs/aiox-adapter-model.md` (no runtime tier evaluator/diagnostics API).
- Evidence gaps:
  - "bounded input/queue" in the roadmap G3 Gate Evidence row has no matching named gap in `local-runtime-gaps-and-targets.md` §13 — W1 must determine what this refers to (NDJSON socket line/body bounding? Codex pre-write queue bounding, already implemented under G1-C? Claude HTTP body bounding?) with direct code citation before it can be scoped as a completion condition.
  - `docs/specs/aiox-capability-policy.md` §7.2's fatal-handler-exit and redaction statements are not yet cited to a specific implementation; unclear whether this is current, target, or unimplemented.
  - Exact current behavior of `defaultAttachCodexRuntime` (cited as not passing the failure callback) needs direct re-read before any wiring implementation.

## Cross-Artifact Effects

- N/A.
- Reason: no accepted cross-artifact effect recorded yet.
- Activate when: primary changes affect related artifacts or out-of-scope artifacts.

## Decision Candidates

- N/A.
- Reason: no decision candidate recorded yet.
- Activate when: decision-worthy rationale or competing options appear.

## Verification Contract

- Revision: 1; History pointer: `2026-08-11 · G3 kickoff`.
- Required:
  - Client/socket-error vs fatal-process-error boundary test (expected error does not crash daemon; unhandled fatal exits with redacted structured log).
  - SIGTERM/stop cleanup test (daemon-owned runtime and child/process resources fully torn down).
  - Socket method dispatch hardening test (unknown/inherited method name rejected as typed error, not executed).
  - Claude channel boot-failure diagnosability test (e.g. port-in-use surfaces its real reason, not only generic `target_runtime_unavailable`).
  - Minimal read-only Codex/Claude diagnostics surface test (connection state, acceptance/receipt distinction, automatic-ack support, automatic-retry safety, manual-recovery boundary).
  - `pnpm typecheck` and existing regression suite stay green.
  - Exact test files/commands and the "bounded input/queue" scope are W1 deliverables; this list is a category placeholder pending W1 synthesis, not a final command set.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 1; History pointer: `2026-08-11 · G3 kickoff`.
- Criteria:
  - roadmap G3의 각 통과 조건(fatal/expected-error 경계·SIGTERM cleanup·bounded input/queue·log redaction·doctor diagnosis, Claude boot-failure diagnosability, socket dispatch hardening, Codex/Claude read-only diagnostics)이 accepted evidence로 닫히거나, 닫히지 않는 항목은 명시적 residual owner/action으로 남는다.
  - `docs/product/roadmap.md` G3 카드와 Gate Evidence 표, 관련 `docs/architecture/`·`docs/specs/` owner가 accepted 결과와 정합화된다.
  - Excluded 항목(durable store, stale policy, trust-boundary auth, `claude_channel_disconnected` event, adapter registry)이 G3 완료 주장에 섞이지 않는다.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-08-11 · G3 kickoff

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.

### 2026-08-11 23:34 · Package contract seeded; W1 discovery opened

- Filled Package Scope(Excluded), Workflow/Agent Plan(Execution default, Risk gate — Active, release-gate multi-owner claim), Evidence(owner-document current-gap claims consulted; evidence gaps incl. undefined "bounded input/queue" roadmap wording), Verification Contract(category placeholders), Closeout Contract(package-specific criteria) from prior turn's roadmap G3 card + owner-doc read (`docs/architecture/local-runtime-daemon-transport-api.md`, `local-runtime-gaps-and-targets.md` §13, `local-runtime-claude-adapter.md` §6.2/6.4, `docs/specs/aiox-capability-policy.md` §7.2, `docs/specs/aiox-adapter-model.md`).
- W1 (`logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W1.md`) registered as Compact/inline read-only discovery: re-verify the four gap areas against `src/` with direct `path:line` citation, resolve the "bounded input/queue" ambiguity, and propose the next implementation W split. No code/doc edits in W1.
- Plan file `plans/g3-daemon-stabilization.md` is being created in the same session with Stage 1 pointing to this controlling log.
