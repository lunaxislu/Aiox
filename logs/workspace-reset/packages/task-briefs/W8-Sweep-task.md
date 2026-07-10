# Task Brief — W8 Sweep: §10–§13 owner 분류 (spec 본문 복사 금지)

## 맥락

`docs/specs/aiox-a2a.md`는 A2A protocol contract owner다. Target Contract Input
`prd/post-mvp/aiox-a2a-spec.md`의 §10–§13은 **spec이 아니라** roadmap/release/blocker/rationale
성격이다. 이 Sweep batch의 목적은 **흡수가 아니라 분류·handoff**다. §10–§13의 어떤 내용도
`docs/specs/aiox-a2a.md` 본문에 복사하지 않는다. 각 claim을 owner로 분류해 W9(roadmap/release),
`docs/decisions/`(선별 승격), architecture/W10로 보낸다.

결과는 controlling log의 Evidence Ledger / Decision Candidates / Cross-Owner Effects에 기록한다.
Phase 3 batch agent는 `docs/specs/`, `docs/decisions/`, `docs/architecture/`, roadmap/release
문서를 포함해 어떤 owner 문서도 수정하지 않는다. 이 batch의 산출물은 Evidence Ledger /
Decision Candidates / Cross-Owner Effects / Source Map append candidates / Open Questions뿐이다.

Controlling log: `logs/workspace-reset/packages/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`.

## 0. 먼저 읽어라

1. Controlling log (Scope, Work Items, 최신 기록, active next pointer, Target Contract Input 범위 Ledger row)
2. `logs/AGENTS.md` (상태 라벨 — 특히 Roadmap `Release Gate`/`Execution Plan`, decision 승격 기준)
3. `docs/decisions/AGENTS.md` (decision-worthy 기준·7섹션 템플릿·history 원본 처리)
4. `docs/specs/AGENTS.md` (spec 본문에 무엇을 넣지 말아야 하는지)
5. `logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md` (W4 decision 후보 5건 + disposition)

## 1. 이 배치 범위

- 대상: `prd/post-mvp/aiox-a2a-spec.md` §10 위험한 은유, §11 Release roadmap(§11.1 게이트 DoD·§11.2 Phase·§11.3 Gate evidence contract), §12 공개 전 수정 대상 결함(§12.1 P1 보안·§12.2 P2 동작 신뢰성), §13 조사 판정·발견 모음(§13.1~§13.7).
- 제외: §0–§9(A0/A1/B/C가 spec 흡수). 이 batch는 §0–§9를 흡수하지 않는다.
- **금지: §10–§13 내용을 `docs/specs/aiox-a2a.md` 본문에 복사하지 않는다.**
- 이 배치가 답해야 할 질문:
  1. §11 release roadmap의 어떤 row가 `docs/product/roadmap.md`/`plans/release-plan.md`로 가야 하나? (W9 handoff)
  2. §12 P1/P2 결함 중 현재 코드에 남아 있는 것은 무엇이고, spec contract와 코드 불일치(Implementation Gap)인 것과 target 구현 전 결함(Pre-implementation Blocker)인 것을 구분.
  3. §13 중 **spec 본문 변경의 이유가 되는 contract 고정 결정**은 무엇인가? (W8 decision 승격 대상) 나머지는 어디로 handoff?

## 2. 상태/owner 분류 규칙

`Post-MVP`는 라벨 아님. 라벨:
- roadmap: `Release Gate`(공개 전 완료 조건), `Execution Plan`(구현 순서/task — `plans/` owner)
- spec: `Implementation Gap`(contract와 구현 불일치), `Pre-implementation Blocker`(target 구현 전 결함) — §12를 spec 라벨로 표기할 때만, 외부 contract 관점일 때
- decision: docs/decisions/ 승격 대상
- legacy: `Stale`
- provenance: 각 claim은 `verified fact` / `inference` / `opinion-proposal` /
  `current implementation` / `target contract/structure` / `bug fix` / `improvement` /
  `stale-drift reference` 중 하나 이상으로 표시한다.

**§13 decision 분류 기준 (W8-0 확정):**
- **W8 승격** = spec 본문 변경의 *이유*가 되는 contract 고정 결정 (예: message lifecycle type/intent/reply_expected, deliveryId, source-only reply routing, recipient_visibility defer, capability projection 원칙)
- **W8 분류만(handoff)** = state.ts god factory 분해·ingress 일반화(§13.2 아키텍처 부채), DX logging/Structured Logger(§13.3), product boundary(§13.6), external precedents(§13.5), vendor 확장 지침(§13.4) → architecture/roadmap/W10/decision package로 넘김

## 3. 현재 구현 근거 (분류 검증용)

§12 결함이 현재 코드에 남아 있는지 확인할 때만 src를 본다(이 batch는 src 흡수가 목적이 아님).

- §12 P1 보안 결함: 해당 영역 `src/`(daemon/adapters/config)에서 결함 잔존 여부 확인
- §12 P2 동작 신뢰성: 해당 동작의 src 구현 확인
- `rg`로 §12 각 항목 키워드를 src에서 역확인

## 4. 반드시 교차 검색

- `prd/post-mvp/aiox-a2a-spec.md` §10–§13
- `logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md` W4 decision 후보 5건과 대조:
  - industry-precedents → Opaque Worker (product/architecture)
  - observation-asymmetry/D7 → D7 Scope Reduction (architecture)
  - aiox-a2a §13.2 → 아키텍처 부채 3축 + Structured Logger (architecture)
  - step-14 mcp bug → App Server 주입·격리 (architecture)
  - proxy-vs-app-server → app-server+proxy 하이브리드 (architecture)
  - [중요] 이 5건은 대부분 architecture/product 성격이라 **W8(spec)의 직접 승격 대상이 아님**. W8은 분류·handoff. spec contract 고정 결정만 W8 승격.
- `docs/product/roadmap.md`, `plans/release-plan.md` — §11/§12 handoff 대상(현재 내용 확인, 수정은 W9)
- `docs/decisions/` — 이미 승격된 결정 disk 재확인(중복 승격 금지)
- `history/58`, `history/59`(W10 확인 문서)
- `plan/`, `plans/post-mvp.plan.md` + sub-plan(roadmap/release 재편 = W9; Execution Plan 분류)

## 5. Owner 분류 규칙

- release gate/priority/sequencing → `docs/product/roadmap.md` 또는 `plans/release-plan.md` (W9 — 이 batch는 분류·기록만, 수정 금지)
- implementation checklist/task ordering → `plans/` (Execution Plan)
- rationale/why (contract 고정) → `docs/decisions/` (W8 선별 승격)
- rationale/why (architecture/product) → architecture package / W10 / decision handoff
- internal structure debt → `docs/architecture/` (handoff)

## 6. Evidence Ledger 출력 (controlling log에 기록)

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |

각 §11/§12/§13 항목을 row로 분류하고, handoff 대상 owner와 W9/W10/decision 행동을 `Action`에 남긴다.
각 row의 Action에는 `owner body apply candidate` / `no owner body apply` / `needs verification` 중
하나를 명시한다.

## 7. Cross-Owner Effects (controlling log에 기록)

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |

§11/§12에서 roadmap/release로 넘어갈 row를 여기에 명시한다(실행은 W9). §13 decision 승격은 Decision Candidates에.

## 8. Source Map / Open Questions 출력 (controlling log에 기록)

- Source Map append candidates: `file | claim nature | absorption owner | consuming package | archive? | self-sufficiency check | disposition`
- Open Questions: 추가 검증이 없으면 owner 본문에 반영할 수 없는 질문

## 9. 완료 조건

- §10–§13 각 항목이 owner로 분류됨 (roadmap/release/decision/architecture/plans/stale)
- §10–§13 각 항목이 provenance 분류됨
- **`docs/specs/aiox-a2a.md` 본문에 §10–§13 내용이 복사되지 않음**
- **어떤 owner 문서도 수정하지 않음** — Decision Candidates / Cross-Owner Effects / Source Map candidates / Open Questions만 기록
- §11 release roadmap·§12 blocker의 W9 handoff row가 Evidence Ledger/Cross-Owner Effects에 명시됨
- §12 결함의 Implementation Gap vs Pre-implementation Blocker 구분이 src 근거로 됨
- handoff/legacy `file:line`은 최종 source에서 재확인했고, 재확인하지 못한 line은 `unverified - regrep required`로 낮춤
- §13 decision 후보가 W8 승격(contract 고정)과 handoff(architecture/product)로 구분됨
- absorption map W4 5건과의 매핑·중복 승격 여부가 disk 재확인으로 정리됨
- Ledger `Action` 중 후속 항목(W9 roadmap 반영, decision 승격, W10 입력)이 Work Item으로 등록되거나 기존 Work Item이 소유
- 흡수/분류한 source disposition이 source map append 후보로 기록됨
- Workflow retrospective를 controlling log + `logs/log-system/2026-06-18-package-workflow-portable-pattern.md`에 기록
- closeout(W9)로 이어질 split map 입력이 정리됨
