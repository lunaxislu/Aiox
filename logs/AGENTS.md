# Log Owner Handoff Contract

이 파일은 이 repo에서 로그의 확정 결과를 taxonomy owner에 반영하고 로그를 닫을 때
적용하는 추가 확인 계약이다. 일반 실행 흐름은 `.agents/skills/log/SKILL.md`, 본문
필수 구조와 표현 지침은 그 skill의 `references/recording-contract.md`, 로그 상태·점검·종료는
`references/lifecycle.md`가 소유한다.

## Owner Handoff

로그의 확정 결과로 현재 권위 내용을 바꿔야 한다면 프로젝트의
[documentation taxonomy owner map](../docs/architecture/documentation-system.md)에
따라 책임 문서, agent 계약, code 또는 test에 반영한다.

- 책임 문서나 code의 현재 내용을 로그에 새로 복사하지 않는다.
- process나 사용법이 바뀌면 해당 guide, agent 작업 규칙이 바뀌면 해당 범위의
  `AGENTS.md`에 반영한다.

## Decided Narrative

로그는 작업 경위의 owner지만, 중요한 결정이나 현재 권위 내용 자체의 owner는
아니다. 책임 문서에 반영되지 않는 작업 경위 중 실패, 검토한 대안과 변경 이유처럼
잘못된 판단이나 반복 작업을 막는 데 필요한 내용은 로그에 보존한다.

## Closeout Check

`decided` 또는 `superseded` 전환 전에는 log skill의 일반 점검·종료 절차를 따른 뒤,
다음 repo 전용 누수만 추가로 확인한다.

- 책임 문서와 구현에 반영할 내용이 빠지지 않았는가?
- 책임 문서나 code의 현재 내용을 로그에 새로 복사하지 않았는가?
- 이관한 Work Items와 Resume Pointer의 대상, owner와 수행 조건이 명확한가?

이 추가 점검은 일반 append마다 수행하지 않는다. 완료·취소·이관 여부가 불명확한
항목은 자동으로 수정하지 않고 사용자에게 보고한다.
