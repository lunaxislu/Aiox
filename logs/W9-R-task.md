# Task Brief — W9 Batch R: roadmap/release/plans 정합·재편 검증

## 맥락

`docs/product/roadmap.md`는 release gate/phase/우선순위의 primary owner다. 이 batch는
`plans/post-mvp.plan.md` + sub-plan 4와 `prd/post-mvp/aiox-a2a-spec.md` §11(Release roadmap)을
현재 roadmap(`Current Execution Candidates`·`Sequenced`·`Phases`·`Gate Evidence`)과 대조해 owner
정합과 plans 재편안을 정리한다. 또한 W7 wording Open Issue 4/5의 roadmap G1 gate 위치를 확인한다.

배포 우선순위는 W2에서 **현재 roadmap 유지**로 확정됐다(gate 순서 `G0->G1/G3->G2->G5/G6->G4`,
npm 1차, macOS/Linux/WSL2). 따라서 이 batch는 roadmap을 새로 정의하지 않는다. owner 본문 변경은
최소(Open Issue gate 위치 확인, Current Execution Candidates inbound 정합)이고, 핵심 산출물은
plans/post-mvp 흡수·재편안이다.

결과는 `logs/2026-06-21-workspace-reset-W9-release-roadmap-authority.md`의 Evidence Ledger /
Decision Candidates / Cross-Owner Effects / Source Map append candidates / Open Questions에 기록한다.
**이 batch는 어떤 owner 문서도 수정하지 않는다(Phase 3 Ledger-only).** owner 본문 반영은 controlling
Claude(checker)의 cite 재검증 PASS 이후 별도 단계가 한다.

Controlling log: `logs/2026-06-21-workspace-reset-W9-release-roadmap-authority.md`.

## 0. 먼저 읽어라

1. Controlling log `logs/2026-06-21-workspace-reset-W9-release-roadmap-authority.md`
   - Scope (Primary owner / Allowed cross-owner / Cross-Owner Effects only / Evidence inputs)
   - Work Items (특히 W3, W4)
   - 최신 기록 (W2 우선순위 결과, W1 batch 분할)
   - 이 batch와 관련된 Evidence Ledger rows
2. `logs/AGENTS.md` — Legacy Source Absorption Map, Package Preparation, **상태 라벨**(roadmap =
   `Release Gate`/`Execution Plan`), Archive Gate
3. `plans/AGENTS.md` — plans owner 작성 규칙(workstream 단계/진행 상태 owner, 단일 plan 재편 기준)
4. `docs/decisions/AGENTS.md` — decision 후보가 나오면
5. handoff 입력:
   - `logs/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`의 Legacy/Historical Source Handoff(W9 must check 행)·split map
   - `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` source map(plans/post-mvp* rows, aiox-a2a-spec row)

handoff·legacy의 `file:line`은 출발점이다. owner 정합·재편안 작성 전 최종 source에서 재검증한다.
재검증 못한 line은 `unverified - regrep required`로 낮춘다.

## 1. 이 배치 범위

- 대상:
  - `plans/post-mvp.plan.md` (index: Candidates 4 / Sequenced 6단계 / Cross-Platform)
  - `plans/post-mvp/envelope-metadata.plan.md` (§4, next kickoff)
  - `plans/post-mvp/codex-structured-metadata-spike.plan.md` (§4·§9)
  - `plans/post-mvp/adapter-dispatch-registry.plan.md` (§5)
  - `plans/post-mvp/channel-boot-surface.plan.md` (§5)
  - `prd/post-mvp/aiox-a2a-spec.md` §11 (Release roadmap, line 901~) — 현재 roadmap과 중복/drift 여부만
  - `docs/product/roadmap.md` (owner — 흡수 결과 반영처. 이 batch는 정합 분석만, 본문 미수정)
  - `plans/release-plan.md` (G6 packaging checklist — roadmap G6 evidence와 정합 여부)
- 제외:
  - `prd/post-mvp/aiox-a2a-spec.md` §12(공개 전 결함 dated audit)·§13(조사 판정) → Batch L / W10
  - `prd/post-mvp/archive/*`, `prd/pre-validation/*` → Batch L
  - architecture/spec 내부 contract 변경 → W10 / 다른 owner
- 이 배치가 답해야 할 질문:
  1. plans/post-mvp.plan.md의 Candidates·Sequenced·Phases가 현재 roadmap `Current Execution
     Candidates`·`Phases`·`Sequenced`와 **중복/drift/누락**이 있는가? (roadmap이 이미 sub-plan 4를
     G1/Phase2로 매핑한다 — 그 매핑이 정확한가?)
  2. 사용자 목표(plans는 단일 plan, post-mvp는 roadmap/release/단일 plan으로 재편 후 삭제)를 만족하는
     **단일 plan 재편안**은 무엇인가? 무엇이 roadmap으로 흡수되고(우선순위/sequencing), 무엇이 단일
     plan에 남고(실행 checklist/acceptance), 무엇이 삭제 후보인가?
  3. **즉시 삭제 불가 제약**을 어떻게 다루는가? `envelope-metadata.plan.md`=next kickoff,
     `post-mvp.plan.md`=async-petting-hoare WS2 current work. 재편 후에도 살아 있어야 하는 부분은?
  4. post-mvp.plan.md의 **Session Re-entry 블록(async-petting-hoare 운영 라인)** 은 별도 보존 대상이다
     (`~/.claude/plans/async-petting-hoare.md`). 이 라인을 plans 재편에서 어떻게 분리/보존하는가?
  5. W7 Open Issue 4(public `deliveryId` namespace)·5(correlated reply authorization)는 현재 roadmap
     **G1-A/B/D** gate 중 어디에 해당하는가? 이미 gate에 표현돼 있는가, 추가 표현이 필요한가?
     (release-plan에는 중복 금지)
  6. roadmap `Current Execution Candidates` 표는 sub-plan 4를 파일 경로로 참조한다. plans 재편/삭제 시
     이 inbound 참조는 어떻게 갱신되는가?

## 2. 상태 분류 규칙

roadmap/plan claim을 owner 라벨로 분류한다:

- `Release Gate`: 공개·릴리즈 전 완료 조건 → roadmap owner
- `Execution Plan`: 구현 순서/task 계획 → plans owner (roadmap/spec 본문에 복사 금지)
- decision-worthy rationale(왜 이 우선순위/sequencing인지) → `docs/decisions/` 후보
- `Post-MVP`는 상태 라벨이 아니라 출처/시점 힌트다. owner 라벨로 다시 분류한다.

각 claim에 provenance도 분류한다: verified fact / inference / opinion-proposal / current implementation
/ target / stale-drift.

## 3. 현재 구현 근거

sub-plan이 참조하는 §과 실제 구현 상태를 src/tests로 확인한다(우선순위/sequencing 주장이 현재 코드
상태와 모순되지 않는지). 출발점:

- `src/core/`(messages/deliveries/pairs), `src/daemon/state.ts`(dispatch 분기) — envelope/dispatch
  registry 재편 후보의 현재 상태
- `src/adapters/`(codex/claude) — adapter dispatch registry, channel boot surface 후보
- `tests/` — 위 동작의 현재 검증 범위

여기서 시작해 sub-plan이 말하는 deliverable이 현재 구현/미구현 중 무엇인지 확인한다(이미 W8 Batch
Ledger가 일부 검증함 — controlling log handoff 참조하되 재확인).

## 4. 반드시 교차 검색

- `history/` — A2A architecture 결정 경위(특히 `history/58`). 단 W5 history owner이므로 source map row를
  새로 만들지 않는다.
- `plan/`(legacy), `plans/` — 다른 plan과 중복/충돌
- `prd/` — `prd/post-mvp/aiox-a2a-spec.md` §11과 현재 roadmap의 drift
- `docs/product/roadmap.md`, `docs/product/product.md` — owner 정합

`plan/`·`plans/` 검색 결과는 관련 없음이어도 Ledger에 남긴다. 각 source는 현재 사실로 믿지 말고
`src/` + 날짜/history closeout과 대조한다.

## 5. Owner 분류 규칙

- release gate/priority/sequencing → `docs/product/roadmap.md`
- implementation checklist/task ordering/acceptance → `plans/`(단일 재편 plan)
- npm packaging 실행 절차 → `plans/release-plan.md`(roadmap G6 종속)
- rationale/why → `docs/decisions/`
- external protocol/contract → `docs/specs/`(이 batch 범위 아님; 발견 시 분류만)
- internal structure → `docs/architecture/`(이 batch 범위 아님; 분류만)
- stale legacy source → history/legacy migration 후보(source map)

## 6. Evidence Ledger 출력

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |

Finding은 `[Fact]`, `[Inference]`, `[Opinion]`으로 시작한다. Classification에 roadmap 라벨 + provenance.
Action은 `owner body apply candidate` / `no owner body apply` / `needs verification`.

## 7. Cross-Owner Effects

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |

roadmap 본문 변경 후보, plans 단일 재편안, release-plan 정합 후보를 여기 적되 **실제 수정은 하지
않는다**. spec/architecture로 넘길 게 발견되면 분류만 한다(이 batch는 수정 권한 없음).

## 8. Source Map append candidates / Open Questions

- Source Map append candidates: `plans/post-mvp.plan.md` + sub-plan 4 rows, `prd/post-mvp/aiox-a2a-spec.md`
  §11 흡수분의 disposition/self-sufficiency draft(`logs/2026-06-21-workspace-reset-legacy-source-absorption.md`
  표 기준). **draft만 — 표는 controlling이 PASS 후 갱신.**
- Open Questions: 사용자 판단/추가 입력이 필요한 항목(예: 단일 재편 plan의 파일명/위치, async 라인
  분리 방식).

## 9. 완료 조건

- 대상 claim이 roadmap 라벨(`Release Gate`/`Execution Plan`) + provenance로 분류됨
- sub-plan/§11과 현재 roadmap의 중복/drift/누락이 `src/tests` + 날짜로 대조됨
- 단일 plan 재편안(흡수/잔존/삭제 후보 분리)이 제시됨. 즉시 삭제 불가 제약(next kickoff, async 라인)이
  명시됨
- W7 Open Issue 4/5의 roadmap G1 gate 위치가 확인됨(release-plan 중복 없음)
- roadmap `Current Execution Candidates` inbound 참조 갱신 후보가 기록됨
- owner 본문을 수정하지 않음. 산출물은 Evidence Ledger / Cross-Owner Effects / Source Map candidates /
  Open Questions로 제한됨
- Workflow retrospective 후보: batch 분할/task brief/Ledger/Scope/의견 수렴 시행착오를
  `logs/2026-06-18-package-workflow-portable-pattern.md` 기록 대상으로 메모
- Batch L 또는 closeout(W7)으로 이어질 항목이 명확함
