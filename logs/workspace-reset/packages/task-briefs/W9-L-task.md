# Task Brief — W9 Batch L: legacy must-check 흡수 판정 검증

## 맥락

`docs/product/roadmap.md`(release gate/phase/priority owner)와 `plans/release-plan.md`(G6 packaging
checklist)의 관점에서, W8 closeout이 W9로 넘긴 legacy must-check source를 흡수/Archive Gate/handoff로
판정한다. 대상은 `prd/post-mvp/aiox-a2a-spec.md` §12(공개 전 결함 dated audit), `prd/post-mvp/archive/*`
5개, `prd/pre-validation/*` 2개다.

핵심은 **이 legacy source에 roadmap/release owner로 흡수할 release pressure가 있는가**다. roadmap은
이미 `Pre-Release Gap Summary`로 dated audit의 actionable 내용을 gate/phase pressure로 증류했다고
선언한다(`docs/product/roadmap.md:192-212`). 따라서 §12의 dated 세부가 이미 충분히 흡수됐는지, 아니면
추가 흡수가 필요한지 확인한다. archive/pre-validation은 대부분 architecture/product/decision 성격이라
W9 흡수보다 W10/architecture handoff + Archive Gate 판정이 주가 된다.

결과는 `logs/workspace-reset/packages/2026-06-21-workspace-reset-W9-release-roadmap-authority.md`의 Evidence Ledger /
Decision Candidates / Cross-Owner Effects / Source Map append candidates / Open Questions에 기록한다.
**이 batch는 어떤 owner 문서도 수정하지 않는다(Phase 3 Ledger-only).** 물리 삭제도 하지 않는다.

Controlling log: `logs/workspace-reset/packages/2026-06-21-workspace-reset-W9-release-roadmap-authority.md`.

## 0. 먼저 읽어라

1. Controlling log `logs/workspace-reset/packages/2026-06-21-workspace-reset-W9-release-roadmap-authority.md`
   - Scope, Work Items(특히 W5, W6), 최신 기록, 관련 Evidence Ledger rows
2. `logs/AGENTS.md` — **Archive Gate**(보존가치 + self-sufficiency 둘 다 충족 시에만 archive), Legacy
   Source Absorption Map, 상태 라벨
3. `logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md` — source map(archive 5 rows,
   pre-validation 2 rows, aiox-a2a-spec row). 기존 disposition candidate와 codex/gemini 리뷰 메모 확인
4. `logs/workspace-reset/packages/2026-06-21-workspace-reset-W8-A2A-spec-authority.md` — Legacy/Historical Source Handoff(W9 must
   check / W10 must check 분리), W8이 archive를 §4 decision 보조로만 썼다는 기록
5. `docs/decisions/AGENTS.md` — decision 후보가 나오면

handoff·legacy의 `file:line`은 출발점이다. 최종 source에서 재확인하고, 못한 line은
`unverified - regrep required`로 낮춘다.

## 1. 이 배치 범위

- 대상:
  - `prd/post-mvp/aiox-a2a-spec.md` §12 (공개 전 수정 대상 결함 — 단계 매핑, 2026-06-11 점검)
  - `prd/post-mvp/archive/claude-codex-validation.md`
  - `prd/post-mvp/archive/codex-claude-validation.md`
  - `prd/post-mvp/archive/claude-opinion.md`
  - `prd/post-mvp/archive/codex-opinion.md`
  - `prd/post-mvp/archive/gemini-opinion.md`
  - `prd/pre-validation/claude-codex-pre-validation.md`
  - `prd/pre-validation/sqlite-restart-recovery-pre-validation.md`
  - 대조처: `docs/product/roadmap.md` `Pre-Release Gap Summary`·`Gate Evidence`, `plans/release-plan.md`
- 제외:
  - §11 release roadmap → Batch R
  - §13 조사 판정, architecture/decision 내재 rationale → W10 / architecture handoff(분류만)
  - `docs/aiox/*` → W10 owner
- 이 배치가 답해야 할 질문:
  1. §12 dated audit(2026-06-11)의 결함 항목이 현재 roadmap `Pre-Release Gap Summary`의 gate/phase
     pressure로 **이미 충분히 흡수**됐는가? 누락된 release-actionable 항목이 있는가? (있으면 어느 gate)
  2. §12의 dated 세부(파일 위치/severity label/snapshot)는 roadmap이 의도적으로 제외한다고 선언했다
     (`roadmap.md:211-212`). 이 세부는 W9 흡수 대상이 아니라 W5 evidence/decision/log 후보인가?
  3. archive 5개에 roadmap/release owner로 흡수할 **release/packaging/공개 pressure**가 있는가? (gemini
     리뷰: 핵심 결정은 aiox-a2a.md에 통합됐으나 Docker/Mesh/Actor 비교·compose.yaml 스키마 브레인스토밍은
     미커버. 이 중 release sequencing에 영향 주는 게 있는가?)
  4. archive/pre-validation 각각에 **Archive Gate**(보존가치 + self-sufficiency)를 개별 적용하면
     `logs/` digest가 필요한가, 아니면 `absorb→delete`인가? (단 최종 archive vs absorb 확정은 W10도
     관여 — W9는 release 관점 판정분만)
  5. pre-validation 2개(MVP arch PASS 2026-05-14, SQLite restart recovery PASS 2026-05-16)는 release
     risk/gate evidence로 roadmap에 흡수할 게 있는가, 아니면 순수 architecture evidence(W10)인가?

## 2. 상태 분류 규칙

- `Release Gate` / `Execution Plan` → roadmap/plans owner
- `Stale`: 현재 코드·history closeout·owner 문서로 대체된 과거 서술
- decision-worthy → `docs/decisions/` 후보
- architecture 내부 구조/evidence → `docs/architecture/` 또는 W10 handoff(이 batch는 분류만)
- `Post-MVP`는 라벨 아님(출처/시점 힌트)

각 claim에 provenance 분류: verified fact / inference / opinion-proposal / current implementation /
target / stale-drift.

## 3. 현재 구현 근거

§12 결함 항목과 pre-validation open issue가 현재 코드에서 해소됐는지/여전히 gap인지 확인한다. 출발점:

- `src/daemon/`(socket error isolation, SIGTERM child cleanup), `src/store/`(in-memory vs file-backed,
  WAL), `src/config/paths.ts`(DB path) — §12 daemon robustness/persistence 결함의 현재 상태
- `src/adapters/`(token/auth, push auth) — §12 trust boundary 결함의 현재 상태
- `tests/` — 위 동작의 현재 검증

이미 W8 Batch Ledger가 일부 검증했다(controlling log handoff 참조하되 재확인). gate 결함이 현재
코드로 해소됐으면 stale, 여전히 gap이면 roadmap gate pressure로 유효함을 표시.

## 4. 반드시 교차 검색

- `history/` — 특히 `history/58`, dated audit 관련 closeout. W5 owner이므로 source map row 신설 금지
- `plan/`(legacy), `plans/` — 중복/충돌
- `prd/` — archive 간 중복, §12 vs §11/§13 경계
- `docs/product/roadmap.md` `Pre-Release Gap Summary` — 이미 흡수된 범위

`plan/`·`plans/` 검색 결과는 관련 없음이어도 Ledger에 남긴다.

## 5. Owner 분류 규칙

- release gate/priority → `docs/product/roadmap.md`
- npm packaging 절차 → `plans/release-plan.md`
- rationale/why → `docs/decisions/`
- internal structure/evidence → `docs/architecture/` 또는 W10(분류만)
- 보존가치 있는 historical 검증 trace → `logs/` digest(Archive Gate 충족 시)
- stale legacy → history/legacy migration 후보(source map)

## 6. Evidence Ledger 출력

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |

Finding은 `[Fact]`/`[Inference]`/`[Opinion]`. Classification에 상태 라벨 + provenance. Action은
`owner body apply candidate` / `no owner body apply` / `needs verification`.

## 7. Cross-Owner Effects

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |

roadmap/release로 흡수할 게 있으면 후보로 적되 **수정하지 않는다**. architecture/decision/W10로 넘길
건 분류만 한다.

## 8. Source Map append candidates / Archive Gate 판정 / Open Questions

- Archive Gate 판정: archive 5 + pre-validation 2 각각에 (1)보존가치 (2)self-sufficiency를 적용해
  `archive→delete`(digest 필요) vs `absorb→delete`(digest 불필요) vs `보류`(W10 대조 필요) draft.
- Source Map append candidates: 위 판정을 `logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md`
  표의 해당 row disposition/self-sufficiency draft로. **draft만 — 표는 controlling이 PASS 후 갱신.**
- Open Questions: W9(release)와 W10(architecture/decision)의 경계가 모호한 항목, 사용자 확인 필요 항목.

## 9. 완료 조건

- §12 결함 항목이 roadmap `Pre-Release Gap Summary` 흡수 범위와 대조됨(이미 흡수 / 누락 / dated 세부 제외)
- archive 5 + pre-validation 2에 release/packaging pressure 유무가 판정됨
- 각 파일에 Archive Gate(보존가치 + self-sufficiency)가 개별 적용된 draft가 있음
- §12 결함의 현재 코드 해소 여부가 `src/tests`로 확인됨(stale vs 유효 gap)
- W9 흡수분과 W10/architecture handoff분이 분리됨
- owner 본문/물리 삭제 없음. 산출물은 Evidence Ledger / Cross-Owner Effects / Source Map candidates /
  Archive Gate 판정 / Open Questions로 제한됨
- Workflow retrospective 후보가 `logs/log-system/2026-06-18-package-workflow-portable-pattern.md` 기록 대상으로 메모됨
- closeout(W7)으로 이어질 항목이 명확함
