# Workspace Reset

## Objective

문서 taxonomy(폴더 구조, 문서 종류별 책임·권위·수명, 파일 naming, 문서 간 link
책임)를 먼저 확정하고, 그 기준으로 현재 repo 문서를 keep, merge, migrate, split,
archive, delete 판정한다. 목표는 파일 수 축소가 아니라, 각 문서의 책임·권위·수명을
명확히 해 agent memory 없이 repo 문서만으로 현재 상태와 다음 행동을 찾을 수 있는
문서 구조를 만드는 것이다.

## Completion condition

- 아래 10개 단계가 모두 끝난다.
- 최종 문서 구조에 중복 권위, dead link, stale 상태, 역할 충돌이 없다.
- repo 문서만으로 새 세션이 현재 단계와 다음 행동을 찾을 수 있음을 검증한다.
- 기존 `docs/` owner 문서 자체를 Obsidian-friendly Atlas 본체로 전환한다(별도 `atlas/`
  navigation layer 미생성). 큰 monolith는 W10 split map 기준으로 모듈 slice로 쪼개고,
  문서 간 관계를 wikilink로 연결해 Obsidian Graph/Backlink가 권위 문서를 대체하지 않는
  탐색 계층이 되는지 검증한다.
- Atlas 도입 뒤 `AGENTS.md`, `docs/guides/workflow.md`와 관련 owner 문서가 새 탐색
  흐름을 반영해야 하는지, 또는 stale/drift가 생겼는지 재검토한다.
- 임시 `AGENTS.md` 진입 계약을 정리·졸업한다. legacy `plan/workspace-reset/`의 임시
  plan과 `AGENTS.previous.md`는 inventory 로그 W3-4에서 삭제 완료.

## Stages

- [x] taxonomy 초안과 기존 topic log 판정 -> `logs/workspace-reset/plan-stages/2026-06-12-workspace-reset-taxonomy-단계.md`
- [x] taxonomy 책임 문서 확정 -> `logs/workspace-reset/plan-stages/2026-06-16-workspace-reset-taxonomy-책임문서.md`
- [x] 폴더별 inventory와 문서 판정 -> `logs/workspace-reset/plan-stages/2026-06-16-workspace-reset-폴더별-inventory.md`
- [x] 승인된 이관·통합·삭제 -> `logs/workspace-reset/plan-stages/2026-06-16-workspace-reset-폴더별-inventory.md`
- [x] link·권위·세션 재개 가능성 검증 -> `logs/workspace-reset/plan-stages/2026-06-22-workspace-reset-stage5-link-권위-세션재개.md`
- [x] history/ · docs/aiox · prd/ · plan/ 물리 삭제 게이트 — 삭제 전 owner/decision/archive가 삭제 예정 원문 없이 self-contained한지 검증(self-suff 게이트, W5; 폐기된 "평문 provenance 전환" 대신 출처 줄삭제·본문 흡수)한 뒤 물리 삭제. 완료 2026-06-24(89개 삭제: legacy 88 + history/59) -> `logs/workspace-reset/plan-stages/2026-06-23-workspace-reset-stage6-physical-deletion-gate.md`
  - history/58 = W8(A2A spec)에서 §4 lifecycle WHY 일부 소비·decision 승격 완료,
    잔여 rationale/live refs는 W10 및 이 물리 삭제 게이트에서 확인. history/59 =
    Atlas digest를 stage 7 required-read로 이전 후 삭제. (둘 다 2026-06-24 삭제 완료)
  - prd/post-mvp/aiox-a2a-spec.md = W8(A2A spec)가 Target Contract Input으로 소모(권위 흡수 완료). 단 §11 execution detail은 단일 A2A execution plan successor 필요로 **이 게이트에서 삭제하지 않고 stage 9로 이연**(source map disposition = keep / execution successor pending) — **stage 9 W4에서 2026-07-08 물리 삭제 완료**
  - docs/aiox, prd/하위, plan/하위는 흡수 완료 및 W8~W10 작업 완료 후 이 게이트로 수렴하여 일괄 물리 삭제
  - `plans/post-mvp*`는 이 게이트 대상이 아니다 — Atlas 후 단일 A2A plan successor 작성이 선행해야 삭제 가능(아래 `plans/post-mvp*` 삭제 disposition 단계가 소유) — **stage 9 W4에서 2026-07-08 삭제 완료**
- [x] Atlas 설계와 local 구현 -> `logs/workspace-reset/plan-stages/2026-06-24-workspace-reset-stage7-Atlas-설계와-local.md`
  - **방향(2026-06-25 확정): docs-as-Obsidian-Atlas.** 별도 `atlas/` 폐기, 기존 `docs/`
    owner 문서 자체를 Obsidian-friendly로 전환한다. 실행 순서 = `docs/AGENTS.md` base rule
    → W10 split map 소비 body split(`aiox-a2a.md`·`local-agent-runtime.md`) → wikilink 연결
    → Obsidian Graph 검증. 상세는 stage 7 로그 "W1 closeout" 블록.
  - required-read: `history/59` Atlas 논의 digest(사용자 문제·MCP name mismatch 검증 사례·합의된 방향 8개·후속 설계 입력) — `logs/workspace-reset/plan-stages/2026-06-23-workspace-reset-stage6-physical-deletion-gate.md` "history/59 Atlas digest" 섹션(`:426-455`). 원문 `history/59`는 stage 6 W4에서 이 digest로 대체 후 물리 삭제됨. Atlas 설계 착수 전 이 digest를 읽는다.
- [x] Atlas 반영·drift 재검토 -> `logs/workspace-reset/plan-stages/2026-06-26-workspace-reset-stage8-Atlas-반영·drift-재검토.md`
- [x] `plans/post-mvp*` 삭제 disposition (Obsidian/Atlas stage 완료 후) — `plans/post-mvp*`의 실행 내용을 잇는 단일 A2A 실행 plan(별도 workstream, Atlas 후 작성)이 생긴 뒤에만: `docs/product/roadmap.md`의 `Current Execution Candidates` 표에 있는 sub-plan 링크를 successor로 repoint → `plans/post-mvp*` 물리 삭제 → `logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md` 해당 row 최종 disposition 확정. async-petting-hoare 운영 라인은 별도 보존(W9 closeout handoff 참조). (근거: W9 결정 2026-06-22; W9 child log W3 이관) **완료 2026-07-08 (W4): successor `plans/a2a-execution.plan.md` 작성(W2)·roadmap repoint(W3)·`plans/post-mvp*`+`prd/post-mvp/aiox-a2a-spec.md` 6개 파일 물리 삭제·source-map final disposition(decided) 확정. 사전 보정 A(channel-boot gap hygiene)/B(exploratory digest)/C(dangling path)도 반영. 2026-07-10 후속 검증에서 `plans/a2a-execution.plan.md` 자체도 roadmap/release/spec owner로 흡수 가능한 transitional view로 판정되어 삭제됐고, stage 9 로그는 decided로 닫혔다.** -> `logs/workspace-reset/plan-stages/2026-06-29-workspace-reset-stage9-post-mvp-plan-disposition.md`
- [x] 임시 AGENTS.md 진입 계약 졸업 — root `AGENTS.md`의 workspace reset 기간 한정 섹션과 `logs/AGENTS.md`의 workspace reset assimilation 전용 live-rule/template 섹션 삭제 완료. legacy `plan/workspace-reset/` 자료는 W3-4에서 삭제 완료.

## Notes

- 문서 이동·통합·삭제와 책임 문서 변경은 보고와 사용자 승인 뒤에만 수행한다.
- Atlas는 사용자와 agent가 프로젝트 구조, 오류 디버깅 경로, 구현 지점과 설계 영향을
  빠르게 파악하기 위한 local navigation layer다. 권위 문서를 대체하지 않으며, 구현 뒤
  AGENTS/workflow/관련 owner 문서에 예시나 진입 설명을 추가해야 하는지 재검토한다.
