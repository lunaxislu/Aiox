# Task Brief — W8 Batch C: capability / federation / deferred 검증 (§7–§9)

## 맥락

`docs/specs/aiox-a2a.md`는 A2A protocol contract의 primary owner다. 이 batch는 **§7 Capability와
sandbox(§7.1 projection feasibility, §7.2 trust boundary), §8 Federation/remote, §9 Open/deferred**를
현재 구현, legacy PRD, post-MVP plan, pre-validation evidence와 대조해 owner 상태를 정리한다.

[Inference] `src/`에 `federation.*`/`remote.*` 파일이 없다(W8-0 사전 확인). 따라서 §8 Federation은
**Deferred/Target Contract 후보**일 가능성이 높다. §7.1 projection feasibility(2026-06-11)는 날짜가
박힌 스냅샷이라 **stale 여부를 src로 확인**해야 한다.

결과는 controlling log의 Evidence Ledger / Decision Candidates / Cross-Owner Effects에 기록한다.
**spec 본문은 이 batch에서 수정하지 않는다.**

Controlling log: `logs/workspace-reset/packages/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`.
Phase 3 batch agent는 `docs/specs/`, `docs/decisions/`, `docs/architecture/` 등 어떤 owner
문서도 수정하지 않는다. 이 batch의 산출물은 Evidence Ledger / Decision Candidates /
Cross-Owner Effects / Source Map append candidates / Open Questions뿐이다.

## 0. 먼저 읽어라

1. Controlling log (Scope, Work Items, 최신 기록, active next pointer)
2. `logs/AGENTS.md` (Falsifiability gate·상태 라벨·**Archive Gate** — pre-validation evidence 판정용)
3. `docs/specs/AGENTS.md`
4. `docs/decisions/AGENTS.md` — decision 후보가 나오면
5. `logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md`

## 1. 이 배치 범위

- 대상: `docs/specs/aiox-a2a.md` §7 Capability·sandbox(§7.1 Claude/Codex projection feasibility, §7.2 Trust boundary and data handling), §8 Federation/remote, §9 Open/deferred.
- 제외: §2–§6(A0/A1/B), §10–§13(Sweep).
- 이 배치가 답해야 할 질문:
  1. §7.1 projection feasibility(2026-06-11) 표가 현재 코드와 맞는가, 아니면 stale인가?
  2. §7.2 trust boundary/data handling이 Current Contract인가 Target인가?
  3. §8 Federation/remote가 구현됐는가(Current), 아니면 Deferred/Target인가? src 부재 시 강등.
  4. §9 Open/deferred 항목이 현행인가? 이미 해소된 항목(코드에 구현됨)이 deferred로 남아 있지 않은가?

## 2. 상태 분류 규칙

`Post-MVP`는 라벨 아님. spec 라벨: `Current Contract`/`Target Contract`/`Proposed Contract`/`Deferred`/`Open Issue`/`Implementation Gap`/`Pre-implementation Blocker`. legacy source: `Stale`.

**Falsifiability gate (필수):** `Current Contract`는 `src/file:line`(+가능하면 test) cite 없으면 금지 → 강등. §8 Federation은 src 구현 없으면 Current로 쓰지 않는다.
**Claim provenance gate (필수):** 각 claim은 `verified fact` / `inference` / `opinion-proposal` /
`current implementation` / `target contract/structure` / `bug fix` / `improvement` /
`stale-drift reference` 중 하나 이상으로 provenance를 표시한다.

## 3. 현재 구현 근거

import/call/test 경로를 끝까지 추적한다.

- §7 capability projection: `src/adapters/contract.ts`, `src/adapters/router.ts`, `src/adapters/claude/*`, `src/adapters/codex/*` (실제 노출 capability)
- §7.2 trust/sandbox: `src/adapters/claude/preflight.ts`, `src/adapters/codex/proxy.ts`, daemon scope 관련 `src/daemon/*` — `rg -i 'sandbox|trust|capability' src/`로 확인
- §8 federation: **src에 federation/remote 파일 없음 — `rg -i 'federation|remote' src/`로 내재 구현 여부 확인**
- §9 deferred: 각 deferred 항목을 src에서 구현 여부 역확인
- tests: `tests/unit/adapters/*`, `tests/unit/spikes/claude-channel-registration-daemon.test.ts`

## 4. 반드시 교차 검색

- `prd/post-mvp/aiox-a2a-spec.md` §7–§9
- `prd/pre-validation/claude-codex-pre-validation.md`(PASS 2026-05-14), `prd/pre-validation/sqlite-restart-recovery-pre-validation.md`(PASS 2026-05-16) — **evidence. Archive Gate(보존가치+self-sufficiency) 개별 적용**해 archive vs absorb 판정
- `docs/aiox/industry-precedents-and-observability-models.md`, `docs/aiox/observation-asymmetry-and-d7-pivot.md`
- `history/58`
- `plan/`, `plans/` (관련 없음이어도 Ledger에 남긴다)

각 source는 `src/` + 날짜/history closeout과 대조한다. pre-validation의 PASS 스냅샷이 현재도 유효한지 src로 확인.

## 5. Owner 분류 규칙

- external capability/federation contract → `docs/specs/aiox-a2a.md`
- internal sandbox/trust 구조 → `docs/architecture/local-agent-runtime.md`(W7 정합됨; stale면 Cross-Owner Effects)
- rationale/why → `docs/decisions/` (**spec contract 고정 rationale만** W8 승격: capability projection 원칙, recipient_visibility defer 등. observation-asymmetry/D7는 architecture 성격 → handoff)
- pre-validation evidence 중 보존 가치 + self-sufficiency 충족분 → `logs/` digest archive, 아니면 `absorb→delete`
- stale legacy source → source map disposition

## 6. Evidence Ledger 출력 (controlling log에 기록)

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |

각 row의 Action에는 `owner body apply candidate` / `no owner body apply` / `needs verification` 중
하나를 명시한다.

## 7. Cross-Owner Effects (controlling log에 기록)

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |

## 8. Source Map / Open Questions 출력 (controlling log에 기록)

- Source Map append candidates: `file | claim nature | absorption owner | consuming package | archive? | self-sufficiency check | disposition`
- Open Questions: 추가 검증이 없으면 owner 본문에 반영할 수 없는 질문

## 9. 완료 조건

- §7–§9 claim이 상태 분류됨 (Falsifiability gate 적용)
- §7–§9 claim이 provenance 분류됨 (Claim provenance gate 적용)
- §7.1 projection feasibility의 stale 여부, §8 Federation의 Current/Deferred/Target 여부가 src 근거로 확정됨
- §9 deferred 항목 중 이미 구현된 것(deferred 해소 후보)이 식별됨
- `Current Contract` claim마다 `src/file:line`(+test) cite 존재
- handoff/legacy `file:line`은 최종 source에서 재확인했고, 재확인하지 못한 line은 `unverified - regrep required`로 낮춤
- pre-validation 2개의 Archive Gate 판정 결과가 source map disposition 후보로 기록됨
- **owner 본문 미수정** — Evidence Ledger / Decision Candidates / Cross-Owner Effects / Source Map candidates / Open Questions만 기록
- decision 후보(contract 고정 rationale)와 handoff 대상이 구분됨
- Ledger `Action` 중 후속 항목이 Work Item으로 등록됨
- Workflow retrospective를 controlling log + portable pattern log에 기록
- Sweep(W6) 또는 cite spot-check(W7)로 이어질 항목이 명확함
