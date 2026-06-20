# Workspace Reset

## Objective

문서 taxonomy(폴더 구조, 문서 종류별 책임·권위·수명, 파일 naming, 문서 간 link
책임)를 먼저 확정하고, 그 기준으로 현재 repo 문서를 keep, merge, migrate, split,
archive, delete 판정한다. 목표는 파일 수 축소가 아니라, 각 문서의 책임·권위·수명을
명확히 해 agent memory 없이 repo 문서만으로 현재 상태와 다음 행동을 찾을 수 있는
문서 구조를 만드는 것이다.

## Completion condition

- 아래 9개 단계가 모두 끝난다.
- 최종 문서 구조에 중복 권위, dead link, stale 상태, 역할 충돌이 없다.
- repo 문서만으로 새 세션이 현재 단계와 다음 행동을 찾을 수 있음을 검증한다.
- Atlas local navigation layer가 최종 owner 문서를 기준으로 생성되고, 권위 문서를
  대체하지 않는 탐색 보조 계층으로 검증된다.
- Atlas 도입 뒤 `AGENTS.md`, `docs/guides/workflow.md`와 관련 owner 문서가 새 탐색
  흐름을 반영해야 하는지, 또는 stale/drift가 생겼는지 재검토한다.
- 임시 `AGENTS.md` 진입 계약을 정리·졸업한다. legacy `plan/workspace-reset/`의 임시
  plan과 `AGENTS.previous.md`는 inventory 로그 W3-4에서 삭제 완료.

## Stages

- [x] taxonomy 초안과 기존 topic log 판정 -> `logs/2026-06-12-workspace-reset-taxonomy-단계.md`
- [x] taxonomy 책임 문서 확정 -> `logs/2026-06-16-workspace-reset-taxonomy-책임문서.md`
- [x] 폴더별 inventory와 문서 판정 -> `logs/2026-06-16-workspace-reset-폴더별-inventory.md`
- [>] 승인된 이관·통합·삭제 -> `logs/2026-06-16-workspace-reset-폴더별-inventory.md`
- [ ] link·권위·세션 재개 가능성 검증
- [ ] history/ · docs/aiox 물리 삭제 게이트 — 삭제 전 관련 owner 문서·decision·archive의 history 출처를 평문 provenance로 전환한 뒤 삭제 -> `logs/2026-06-16-workspace-reset-폴더별-inventory.md`
  - history/58 = W8(A2A spec) 작업 시 확인할 문서, history/59 = W10 작업 시 확인할 문서 (소비·확정 후 삭제)
  - docs/aiox는 흡수(필요분) 후 삭제 — 기존 dependency 표현이 있으면 이 게이트로 수렴
- [ ] Atlas 설계와 local 구현
- [ ] Atlas 반영·drift 재검토
- [ ] 임시 AGENTS.md 진입 계약 졸업 (legacy `plan/workspace-reset/` 자료는 W3-4에서 삭제 완료)

## Notes

- 문서 이동·통합·삭제와 책임 문서 변경은 보고와 사용자 승인 뒤에만 수행한다.
- Atlas는 사용자와 agent가 프로젝트 구조, 오류 디버깅 경로, 구현 지점과 설계 영향을
  빠르게 파악하기 위한 local navigation layer다. 권위 문서를 대체하지 않으며, 구현 뒤
  AGENTS/workflow/관련 owner 문서에 예시나 진입 설명을 추가해야 하는지 재검토한다.
