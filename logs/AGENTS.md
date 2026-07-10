# Log Owner Handoff Contract

이 파일은 이 repo에서 로그의 확정 결과를 taxonomy owner에 반영하고 로그를 닫을 때
적용하는 추가 확인 계약이다. 일반 실행 흐름은 `.agents/skills/log/SKILL.md`, 로그 생성·기록
품질·상태·종료와 Work Items·pointer·점검의 세부 규칙은 그 skill의
`references/loop-rules.md`가 소유한다.

## Owner Handoff

로그의 확정 결과로 현재 권위 내용을 바꿔야 한다면 프로젝트의
[documentation taxonomy owner map](../docs/documentation-system.md)에
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
- 이관한 Work Items와 next pointer의 대상, owner와 수행 조건이 명확한가?

이 추가 점검은 일반 append마다 수행하지 않는다. 완료·취소·이관 여부가 불명확한
항목은 자동으로 수정하지 않고 사용자에게 보고한다.

## Long Log Split Guard

로그 길이는 분리 검토 신호일 뿐 분리 결정 기준이 아니다. 실제 분리 필요성은 log skill의
[Log Lifetime Boundary](../.agents/skills/log/references/loop-rules.md#log-lifetime-boundary)로
판정하고, 다른 로그가 필요하면
[Cross-Log / Lifetime Transitions](../.agents/skills/log/references/loop-rules.md#cross-log--lifetime-transitions)에서
전이 종류를 판정·적용한다.

- Soft threshold: 600 lines. 로그 분리 필요성을 검토한다.
- Hard threshold: 1000 lines. 로그를 분리하거나, 단일 수명으로 유지하는 이유를
  기록한다.
- 두 threshold 모두 자동 분리 기준이 아니다. 분리·미분리 판단은 agent와 사용자가
  로그 수명과 소비 관계를 보고 결정한다.

## Package Log Repository Integration

새로 생성하는 package의 portable 계약과 Compact/Full composition은
[package-log.md](../.agents/skills/log/references/package-log.md)를 따른다. 이 절은 이 repo의
물리 배치와 Registry Integrity 검사만 추가한다.

### Hybrid Layout

- Controlling package log는 `logs/YYYY-MM-DD-<package-topic>.md`에 둔다.
- Compact task record는
  `logs/packages/<stable-package-key>/tasks/W<id>.md`에 둔다.
- Full child task-record log는
  `logs/YYYY-MM-DD-<stable-package-key>-W<id>-<task-topic>.md`에 둔다.
  Full child log 자체가 해당 W의 record이므로 같은 W의 Compact record를 만들지 않는다.
- `<stable-package-key>`의 기본값은 controlling package log의 확장자를 제외한 filename
  stem이다. 첫 task record를 만들기 전에 Task Index에 선언하고, 이후 controlling log의
  이름이나 주제가 바뀌어도 canonical record path 안정을 위해 변경하지 않는다.
- Stable package key는 controlling log의 `## Task Index` 아래 table보다 앞에 다음
  repo-extension line으로 둔다.

  ```markdown
  - Stable package key: <stable-package-key>
  ```

- Task Index의 각 executable W entry는 profile과 repo root 기준 exact canonical record
  path를 가진다. directory나 filename pattern만 적거나 경로를 추론하게 두지 않는다.
- 기존 완료·legacy 로그는 주제별 하위 폴더로 정리되어 있을 수 있다. 새 package 기본
  layout을 소급 적용하지 말고, 이미 존재하는 로그나 task brief를 참조할 때는 현재 실제
  경로를 canonical path로 쓴다.

### Manual Registry Integrity

Executable W를 완료하거나 package를 closeout하기 전에 다음 집합과 pointer를 대조한다.

1. Controlling log의 executable Work Item W-id 집합과 Task Index W-id 집합이 일치하는지
   확인한다. 한 W에 entry가 없거나 둘 이상이면 실패다.
2. 각 Task Index locator가 실제 파일 하나를 가리키며, profile과 물리 위치가 일치하는지
   확인한다.
3. Compact record는 다음 명령의 actual set과 Task Index의 Compact locator set을 대조한다.

   ```sh
   find logs/packages/<stable-package-key>/tasks -type f -name '*.md'
   ```

   actual set에만 있으면 orphan record, Task Index에만 있으면 dangling locator다.
4. `logs/` tree에서 Identity의 `Controlling log`가 현재 controlling package log를
   가리키는 Full record actual set을 찾고 Task Index의 Full locator set과 대조한다.
5. 각 record의 Identity에서 controlling log, package W-id와 profile이 해당 Task Index
   entry와 정확히 일치하는지 확인한다.
6. 각 canonical record path가 전체 controlling package log의 Task Index 중 정확히 한 곳에만
   등록됐는지 확인한다. 여러 package에 등록됐거나 한 W에 Compact와 Full이 함께 있으면
   membership mismatch다.
7. 각 Full child에 다음 검사를 실행한다.

   ```sh
   .agents/skills/log/scripts/log check <full-child-path>
   ```

   이어 `Return Target`의 source log와 Work Item이 controlling log의 해당 W-id를
   가리키는지 확인한다.

orphan record, dangling locator, Identity·profile·Return Target 불일치, 중복 locator 또는
Compact/Full 중복은 Registry Integrity 실패이며 closeout blocker다.

### Prospective-Only Boundary

이 integration은 반영 뒤 새로 생성하는 package에만 적용한다. 기존 workspace-reset/legacy
controlling log, task brief와 Workspace Reset section을 새 package schema로 backfill하거나
in-place upgrade하지 않는다. 물리 경로 정리는 별도 repoint 감사와 사용자 승인으로 수행할 수
있지만, 그 경우에도 기존 자료의 schema나 package membership을 소급 변경하지 않는다.
