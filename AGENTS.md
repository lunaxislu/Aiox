## Temporary Work Entry

현재 작업은 workspace 문서 reset이다. 중복되거나 역할이 불명확한 README, PRD,
spec, plan, docs와 기타 문서를 정리하고, 각 문서의 책임·권위·수명을 명확히 해
agent memory 없이도 repo만으로 현재 상태와 필요한 문맥을 찾을 수 있게 만드는 것이
목표다. 세션 시작 시 `plan/workspace-reset/workspace-reset.md`를 먼저 읽는다.

`plan/workspace-reset/workspace-reset.md`는 hook 전환 전까지 기존 조사 범위와 flow를
찾기 위한 읽기 진입점으로만 유지한다. 현재 작업과 재개 상태는 open 로그가 소유한다.
이 파일은 세션 진입을 위한 최상위 운영 계약만 둔다.

## Workflow

- 현재 작업, 토론, 질문과 Work Items는 `logs/`의 주제별 open 로그에 기록한다.
- 로그 하나의 Work Items와 Resume Pointer로 작업 범위와 재개 지점을 알 수 있으면 plan
  문서를 만들지 않는다.
- 독립된 큰 작업 여러 개의 순서를 따로 관리해야 할 때만 `plans/`에 얇은 plan 문서를
  만든다.

현재 작업을 정하고 재개할 때는 다음 순서를 따른다.

1. 사용자가 작업이나 로그를 지정했으면 그것을 사용한다.
2. 현재 로그의 Resume Pointer가 분리 로그를 가리키면 그 로그를 연다.
3. `plans/`에 관련 plan 문서가 있으면 활성 단계가 가리키는 로그를 연다.
4. 위 포인터가 없으면 `description`으로 관련 open 로그를 찾는다.

선택한 로그 본문의 최신 기록, Work Items와 Resume Pointer에서 현재 단계, 작업 범위와
재개 지점을 확인한다. 여러 후보 중 하나로 정해지지 않으면 `open` 상태만으로 현재
작업을 추측하지 않는다. 별도 Current Work, 세션별 handoff나 세션 요약을 새로 만들지
않는다.

- 일반 작업 흐름과 사례: `docs/guides/workflow.md`
- plan 구조, 단계 문법과 유지: `plans/AGENTS.md`
- 로그 작성, 재개, 상태와 종료: Claude/Codex log skill
- 로그를 닫을 때의 owner 반영과 repo 전용 추가 점검: `logs/AGENTS.md`
- 로그 도구: `.agents/skills/log/scripts/log`

현재 작업 기록은 이 섹션의 open 로그 규칙을 따른다. 아래의 기존
`workspace-reset.md` Current Work/Handoff는 hook 전환 전까지 읽기 진입점으로만
유지하고 더는 갱신하지 않는다.

불변 규칙:

- 현재 작업에 필요한 파일만 명시적으로 선택해 읽고, 기존 `plan/`, `prd/`, `docs/`를
  상태 파악 목적으로 일괄 탐색하지 않는다.
- 기존 WS2 script/hook/skill 구현을 재개하지 않는다.
- 사용자나 다른 agent의 기존 변경을 되돌리거나 덮어쓰지 않는다.
- 사용자 승인 없는 문서 이동·통합·삭제와 agent memory 변경은 하지 않는다.
- 문서 정리가 끝나기 전에는 문서 정리와 무관한 새 workflow, hook, skill,
  Vault·Atlas 구현을 시작하지 않는다. 다만 현재 작업 기록 workflow를 구축·검증하는
  데 필요한 script나 hook은 필요성, 책임과 구현 범위를 사용자에게 보고하고
  승인받은 뒤 만들 수 있다. 의미 판단이나 로그 본문 자동 수정은 도구에 맡기지
  않는다.
- 커밋은 사용자가 명시적으로 요청한 경우에만 목적별로 분류하고 범위를 보고한 뒤
  수행한다.
- legacy `workspace-reset.md` Handoff는 더는 갱신하지 않는다. 재개에 필요한 현재
  위치와 제한 사항은 open 로그의 최신 기록에, 전체 작업 범위와 재개 지점은 Work
  Items와 Resume Pointer에 둔다.
- Vault·Atlas 설계 또는 구현을 시작할 때만
  `history/59-local-obsidian-vault-atlas-discussion.history.md`를 읽는다.

## Workspace Reset Flow

세션 시작 시 기존 hook이 `workspace-reset.md`의 `Current Work`와 `Handoff`를
요약할 수 있다. 이 출력은 전환 중인 legacy onramp이며 현재 상태의 권위가 아니다.
실제 작업은 관련 open 로그의 최신 기록, Work Items와 Resume Pointer를 기준으로 재개하고,
작업 전 현재 할 일, 읽을 범위와 진행 방식을 사용자에게 짧게 보고한다.
