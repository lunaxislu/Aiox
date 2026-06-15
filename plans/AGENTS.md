# Plan Authoring Contract

이 파일은 이 repo에서 `plans/`의 plan 문서를 작성하고 유지할 때 적용하는 계약이다.
plan을 만들지 단일 로그로 둘지의 선택과 진입·재개 순서는 root `AGENTS.md`, `plans/`가
소유하는 정보 경계(구현 작업의 단계·실행 순서·진행 상태)와 conflict 규칙은
[documentation taxonomy owner map](../docs/architecture/documentation-system.md),
단계 로그의 작성·종료는 log skill이 소유한다. 이 파일은 그 위에서 plan 파일의 구조,
단계 문법, 유효성과 유지 규칙만 정의한다.

## Structure

plan은 다음 골격으로 작성한다.

```markdown
# <Plan 제목>

## Objective
<무엇을·왜 하는지. 완료되면 무엇이 달라지는지.>

## Completion condition
- <측정 가능한 완료 조건>

## Stages
- [>] <단계명> -> `logs/<단계 로그>.md`
- [ ] <단계명>

## Notes
- <이 plan 고유의 제약·메모만.>
```

- `# ` 제목 한 줄과 `Objective`, `Completion condition`, `Stages`는 필수다.
- `Notes`는 선택이다. 이 계약이 정한 상태 기호나 형식 규칙을 plan마다 다시 적지 않고,
  그 plan에만 해당하는 제약만 둔다.

## Stage Syntax

- 각 단계는 한 줄 불릿이며 형식은 ``- [상태] 단계명 -> `logs/<단계 로그>.md```다.
- 상태 기호는 `[ ]` 대기, `[>]` 활성, `[x]` 완료다.
- 한 plan의 활성 단계 `[>]`는 최대 하나다.
- 아직 시작하지 않은 단계는 포인터를 생략할 수 있다. 시작했거나 끝난 단계는 그 단계의
  로그를 가리킨다.
- plan은 단계 순서, 상태와 단계 로그 포인터만 소유한다. 단계의 목표 세부, 토론, 판정,
  검증 결과와 재개 context는 가리키는 단계 로그가 소유한다.

## Maintenance

- 한 단계를 끝내면 `[x]`로 닫고 다음 단계를 `[>]`로 올려 활성 단계를 하나로 유지한다.
- plan의 단계 상태는 단계 로그의 실제 상태와 맞춘다. plan의 완료 표시와 code·tests의
  검증 결과가 다르면 plan을 실제 결과에 맞춘다(owner map의 conflict 규칙).
- 현재 작업을 다른 로그의 선행 작업으로 전환할 때는, 새 로그에 Work Items를 기록하는
  것만으로 현재 작업 포인터가 바뀌지 않는다. 활성 단계 로그의 next pointer를 그
  로그를 가리키도록 함께 바꿔야 다음 세션이 올바른 작업을 재개한다. 선행 작업을 끝내면
  단계 로그로 돌아와 포인터를 닫고 원래 작업을 재개한다.

## Well-formedness

onramp와 사람이 plan을 신뢰하려면 다음 구조 불변이 성립해야 한다.

- `# ` 제목이 있다.
- `Stages`의 각 단계가 최상위 `- [상태]` 불릿이다.
- 활성 `[>]`는 최대 하나다.
- 포인터가 가리키는 단계 로그 경로가 실제로 존재한다.

이 불변을 검사하는 별도 도구는 두지 않는다. onramp가 활성 `[>]`가 여럿일 때 경고하는
값싼 구조 검사만 하고, 완료·취소·owner 선택 같은 의미 판단은 agent가 한다. 반복되는
구조 편집·검증 비용이 실제로 확인되면 그때 script를 별도로 검토한다.
