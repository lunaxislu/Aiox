---
topic: workspace reset stage8 Atlas 반영·drift 재검토
description: workspace reset plan stage 8 — docs-as-Obsidian-Atlas 도입 뒤 AGENTS.md·docs/guides/workflow.md·관련 owner 문서가 새 탐색 흐름(wikilink 작성 규칙·Obsidian Graph navigation·IDE+Obsidian dual-tool)을 반영해야 하는지, 또는 stale/drift가 생겼는지 재검토한다.
status: open
---

## Work Items

- [>] W1 stage 8 drift 재검토 범위 확정 + 후보 인벤토리 — AGENTS.md·docs/guides/workflow.md·관련 owner 문서 중 docs-as-Atlas 도입으로 반영/정정이 필요한 지점을 식별(추측 변경 금지, 후보 목록부터)

## 2026-06-26 · stage 8 착수 — 경위·범위·W3 handoff 입력

Parent pointer: `plans/workspace-reset/workspace-reset.md` stage 8 (`Atlas 반영·drift 재검토`)

**착수 경위:** stage 7(Atlas 설계와 local 구현)이 2026-06-26 `decided`로 종료됐다. W3
(Obsidian Graph/Backlink docs-as-Atlas 검증)이 PASS하여 docs-as-Obsidian-Atlas가
navigation layer로 유효함이 확인됐다(권위 비대체 + discovery 가치). 그 뒤를 잇는 plan
stage 8 = Atlas 도입 결과를 규칙·가이드 문서에 반영하고 drift를 재검토하는 단계다. stage
7 로그(`logs/2026-06-24-workspace-reset-stage7-Atlas-설계와-local.md`)의 W3 closeout 블록이
검증 결과·근거의 owner이며 여기 복사하지 않는다.

**범위(plan completion 기준):** Atlas 도입 뒤 다음이 새 탐색 흐름을 반영해야 하는지, 또는
stale/drift가 생겼는지 재검토한다.

- `AGENTS.md`(root·하위 계층): wikilink 작성·docs-as-Atlas 탐색이 작업 계약에 반영됐는지.
  (W4에서 `docs/AGENTS.md` 계층은 이미 base rule을 소유 — 중복·누락·root 포인터 보류분
  점검 대상.)
- `docs/guides/workflow.md`: 현재 작업 선택·재개 흐름이 Obsidian navigation을 반영해야
  하는지, 또는 무관하게 유지인지.
- 관련 owner 문서: split·wikilink 도입으로 생긴 stale 참조·drift.

**W3에서 handoff된 구체 drift 후보(stage 7 W3 closeout이 owner):**

1. **Graph 운영법** — Obsidian 노드 라벨이 디렉터리 경로를 생략하고 파일명만 표시한다.
   보완책은 hover 툴팁 + Groups 컬러코딩(폴더별 색). 이 운영법을 workflow/AGENTS가
   안내해야 하는지 판단 대상.
2. **IDE+Obsidian dual-tool workflow** — Obsidian 파일트리에 `.ts`가 안 보여 코딩은
   IDE 주도, Obsidian은 영향도 분석·설계 탐색 "navigation 보조 화면"으로 병행하는 흐름으로
   수렴했다. `docs/guides/workflow.md`가 이 dual-tool 흐름을 반영해야 하는지 판단 대상.

이 두 후보는 "반영해야 한다"가 아니라 "반영 필요 여부를 stage 8에서 판단한다"이다. 추측으로
미리 문서를 바꾸지 않는다.

**종료 판단 기준:** 위 범위의 각 문서가 (a) 반영이 필요하면 승인된 위치에 반영·검증됐고,
(b) 반영이 불필요하면 그 근거가 기록됐을 때 stage 8을 `decided`로 닫는다.

**다음 행동:** W1 — 위 범위·후보를 실제 문서(`AGENTS.md` 계층·`workflow.md`·owner 문서)와
대조해 반영/정정이 필요한 지점을 인벤토리한다. 인벤토리 결과로 W2 이후 실행 항목을 정한다.
