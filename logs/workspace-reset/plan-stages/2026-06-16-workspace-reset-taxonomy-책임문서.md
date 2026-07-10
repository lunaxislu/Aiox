---
topic: workspace reset taxonomy 책임문서 확정
description: workspace reset stage 2 — taxonomy 책임 문서(docs/architecture/documentation-system.md)의 미결 항목(naming, link syntax)을 판정하고 단계를 완료 처리한다
status: decided
---

## Work Items

- [x] W1 Decided: 전역 naming 규칙 불필요, link syntax는 Obsidian 작업 때 결정 — scope별 naming은 실제 필요가 생길 때 해당 scope AGENTS.md가 소유

## 2026-06-16 · stage 2 시작

stage 1(taxonomy 초안과 기존 topic log 판정)이 완료됐다.
`docs/architecture/documentation-system.md`는 stage 1에서 생성됐으며 소유 경계, scoped authority, conflict 규칙, history 타입 제거가 반영됐다.

stage 1에서 lifecycle은 불필요로 판정해 W3 Decided 처리했다.

**현재 미결 항목** (documentation-system.md 8번째 줄 명시):
- 파일 naming 규칙
- 문서 간 link syntax

W1: 이 두 항목도 lifecycle과 동일하게 "실제 문제가 없으면 불필요" 관점으로 판정한다.

## 2026-06-16 · stage 2 종료

naming 전역 규칙 불필요 — scope별 naming은 실제 필요가 생길 때 해당 scope AGENTS.md가 소유한다.
link syntax defer — Obsidian 작업 때 결정.
documentation-system.md 임시 disclaimer(lifecycle/naming/link 미결 안내 2줄) 삭제.

다음: workspace-reset stage 3(폴더별 inventory와 문서 판정) → logs/workspace-reset/plan-stages/2026-06-16-workspace-reset-폴더별-inventory.md
