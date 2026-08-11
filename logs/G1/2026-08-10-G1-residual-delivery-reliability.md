---
topic: G1 residual delivery reliability
description: G1 release gate에 남은 cross-adapter delivery FSM 대칭과 retry/failure 중 inbound reply 및 source result 무손실 증거를 판정·보강한다
status: decided
---

## Work Items
- [x] W2 Independently review W1 Claude discovery candidate against primary sources and test evidence
- [→] W3 Add focused tests for the three residual delivery/reply/outcome interleavings — transferred: logs/G1/2026-08-11-G1-residual-delivery-interleaving-verification.md — W3 is execution work belonging to plan stage 2, not stage-1 evidence discovery

- [x] W1 current implementation·test·evidence boundary를 대조하여 G1 residual claims의 검증 계약과 후속 Work Item을 확정한다

## Required Context

### Return Target

- None: independent package log.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.

## Package Scope

- Revision: 1; History pointer: `2026-08-10 · G1 residual reliability package bootstrap`.
- Primary boundary: G1 release gate의 잔여 delivery reliability evidence를 current code, tests, direct adapter evidence와 대조하고 필요한 검증·구현·owner reconciliation을 하나의 closeout으로 관리한다.
- Related artifacts in allowed write-set:
- docs/product/roadmap.md
- docs/specs/aiox-message-lifecycle.md
- docs/specs/aiox-adapter-model.md
- docs/architecture/local-runtime-routing-and-delivery.md
- src/daemon/
- src/adapters/
- tests/
- Excluded:
  - N/A.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution default: delegated to Claude for task execution. Each Claude prompt must direct Claude to use subagents efficiently for independently bounded discovery, implementation, or verification work, while retaining one accountable task result.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - Active: this is a release-gate/public delivery-contract claim. Before accepting each Claude task result, controlling assigns an independent subagent review of the task record, actual source/artifacts, and verification evidence; the review remains candidate evidence until controlling disposition.

## Task Index

- Stable package key: g1-residual-delivery-reliability

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W3 | Compact | delegated | `logs/packages/g1-residual-delivery-reliability/tasks/W3.md` |
| W2 | Compact | delegated | `logs/packages/g1-residual-delivery-reliability/tasks/W2.md` |
| W1 | Compact | delegated | `logs/packages/g1-residual-delivery-reliability/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - Claim 1: shared dispatch maps Codex and Claude classifier outcomes to the common FSM; `completed` is enum-only. Existing tests directly cover manual-retransmit symmetry and selected primary outcome reverse paths, but not a single complete primary-FSM symmetry matrix.
  - Claim 2: existing partial evidence covers a queued origin with reply and late reply-delivery resolution, plus primary outcome correlation/non-recursion. It does not directly cover the three residual cross-delivery ordering sequences below.
- Evidence gaps:
  - original `unconfirmed` -> inbound reply -> original late resolution;
  - different deliveries' retry dispatch and outcome-notification dispatch sharing a target/source;
  - original and manual-retransmit request-id late-resolution ordering.

## Cross-Artifact Effects

- Out-of-scope effect: `docs/product/roadmap.md` places claim 2 under remaining requirements while stating it is verified; `docs/specs/aiox-message-lifecycle.md` keeps the complete sentence as a committed target. Owner reconciliation is deferred until test evidence and controlling disposition are complete.

## Decision Candidates

- Candidate: after residual test disposition, decide whether roadmap wording and lifecycle-spec status/evidence require reconciliation. No owner document change is accepted yet.

## Verification Contract

- Revision: 2; History pointer: `2026-08-11 00:20 · W1 candidate and W2 independent review disposition`.
- Required:
  - Focused tests must directly construct and assert each accepted residual ordering sequence, including original delivery status, reply-right consumption, delivery IDs, and outcome relation/envelope attribution.
  - Run `pnpm vitest run tests/unit/daemon/codex-ingress.test.ts tests/unit/daemon/api.test.ts tests/integration/codex-tier3-reliability.test.ts`; broaden only when focused harness limitations require it.
- Recommended:
  - Preserve existing partial evidence in the test review so W3 does not duplicate it.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 2; History pointer: `2026-08-11 00:20 · W1 candidate and W2 independent review disposition`.
- Criteria:
  - Claim 1 is either backed by an explicit primary-FSM symmetry matrix or retained as an accurately scoped residual; it is not closed solely from shared-engine inference.
  - Claim 2's three accepted residual sequences have direct passing evidence, or any failing sequence has a separately reviewed corrective disposition.
  - Roadmap/spec wording effect has an explicit owner disposition after evidence review.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-08-10 · G1 residual reliability package bootstrap

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.

### 2026-08-10 23:12 · user-approved package start and W1 boundary

사용자가 roadmap의 남은 G1 release evidence를 닫기 위한 실행 plan과 로그 시작을 승인했다.

- 확인한 입력: `docs/product/roadmap.md`는 delivery FSM 의미 대칭과 retry/failure 중 inbound reply·MCP/channel source 결과 무손실을 남은 G1 evidence로 둔다.
- 경계: decided G1-C/D package의 accepted 결과를 재개하지 않는다. source-operation invocation idempotency, Phase 1 auth/Tier 2 guarantee, durable replay는 범위 밖이다.
- Activation 판단: public delivery contract, adapter implementation, tests, direct evidence, roadmap owner가 하나의 closeout을 공유하므로 controlling package log로 시작한다.
- 현재 재개 지점: W1은 read-only discovery로 claim-to-evidence matrix와 후속 executable Work Item의 계약을 확정한다.

### 2026-08-11 00:00 · controller, Claude execution, and independent-review operating rule

- 사용자 지시: controlling agent가 package state와 result disposition을 소유한다. 실제 task execution은 Claude에 위임한다.
- 적용: Claude에 주는 각 task prompt는 독립적으로 나눌 수 있는 discovery·구현·검증 subtask에 subagent를 효율적으로 사용하도록 명시하고, 단일 accountable task result로 source·변경·검증·미확인 영역을 반환하게 한다.
- 결과 수용: release-gate/public-contract 위험 gate를 활성화한다. Claude 결과를 accepted state로 승격하기 전 controlling은 별도 subagent에게 task record, 실제 source/artifact, verification evidence의 독립 검토를 맡긴다. 그 검토도 candidate이며, 수용·부분 수용·기각은 controlling만 결정한다.

### 2026-08-11 00:20 · W1 candidate and W2 independent review disposition

- 독립 W2 검토가 W1 candidate의 load-bearing 근거를 primary source에서 재확인했다. Claim 1은 shared daemon dispatch, adapter별 classifier, enum-only `completed`, existing tests로 의미상 강하게 지지되지만, `api.test.ts:1325-1413`은 manual retransmit 대칭 test이므로 primary FSM 전체를 직접 닫는 증거로 과장하지 않는다.
- Claim 2는 전혀 미검증이 아니다. `tests/unit/daemon/codex-ingress.test.ts:2167-2210`에는 queued origin의 reply와 reply delivery late success가 함께 있고, `tests/unit/daemon/api.test.ts:1485-1558` 및 `codex-ingress.test.ts:2687-2791`에는 source outcome/late reject correlation의 부분 증거가 있다. 그러나 original `unconfirmed` -> inbound reply -> original late resolution, 서로 다른 delivery의 retry와 outcome notification 경쟁, original/manual request-id 교차 순서의 명시적 test는 확인되지 않았다.
- Controlling disposition: W1 discovery는 부분 수용한다. roadmap의 claim 2는 남은 요구 아래에 있으면서 완료형으로 쓰였고 spec은 committed target으로 둔다. 이를 undocumented evidence로 추정하지 않고 owner reconciliation 후보로 보류한다. W-A는 위 세 gap만 대상으로 한 focused test work로 좁히며, defect correction과 owner-document 변경은 각각 W-A 결과와 controlling disposition 뒤에만 연다.

### 2026-08-11 00:35 · Stage 1 closeout and Stage 2 transfer

- W3는 discovery가 아니라 plan Stage 2의 test execution임을 확인했다. 실행하지 않은 W3를 `logs/G1/2026-08-11-G1-residual-delivery-interleaving-verification.md`의 independent Stage-2 package W1으로 이관했다.
- Stage 1은 W1 discovery와 W2 independent review의 결과를 부분 수용하고, accepted evidence boundary·verification contract·후속 실행 조건을 다음 stage에 전달한 시점에서 종료한다. product/owner artifact는 변경하지 않았다.
