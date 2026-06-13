# Workspace Reset

## Objective

문서 taxonomy(폴더 구조, 문서 종류별 책임·권위·수명, 파일 naming, 문서 간 link
책임)를 먼저 확정하고, 그 기준으로 현재 repo 문서를 keep, merge, migrate, split,
archive, delete 판정한다. 목표는 파일 수 축소가 아니라, 각 문서의 책임·권위·수명을
명확히 해 agent memory 없이 repo 문서만으로 현재 상태와 다음 행동을 찾을 수 있는
문서 구조를 만드는 것이다.

## Completion condition

- 아래 6개 단계가 모두 끝난다.
- 최종 문서 구조에 중복 권위, dead link, stale 상태, 역할 충돌이 없다.
- repo 문서만으로 새 세션이 현재 단계와 다음 행동을 찾을 수 있음을 검증한다.
- legacy 임시 진입 자료(legacy `plan/workspace-reset/`의 임시 plan과
  `AGENTS.previous.md`, 임시 `AGENTS.md` 진입 계약)를 정리·졸업한다.

## Stages

- [>] taxonomy 초안과 기존 topic log 판정 -> `logs/2026-06-12-workspace-reset-taxonomy-단계.md`
- [ ] taxonomy 책임 문서 확정
- [ ] 폴더별 inventory와 문서 판정
- [ ] 승인된 이관·통합·삭제
- [ ] link·권위·세션 재개 가능성 검증
- [ ] 임시 AGENTS.md와 legacy workspace-reset 자료 정리

## Notes

- 문서 이동·통합·삭제와 책임 문서 변경은 보고와 사용자 승인 뒤에만 수행한다.
