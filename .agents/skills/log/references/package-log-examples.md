# Package Log 구성·운용 사례

이 문서는 package workflow의 worked examples를 담는다. `package-log.md`와 base `loop-rules.md`가
계약을 소유하며, 이 문서는 규칙을 재정의하지 않는 lookup 보조다.

물리 경로, stable key, registry integrity command, model ID 같은 repo-specific mapping은 project
integration owner가 소유한다. repo-wide bootstrap/audit 절차는 `project-setup.md`가 소유한다. 이
문서의 locator와 명령은 `<...>` placeholder로만 둔다.

## 공통 읽는 법

package surface 예시는 current accepted state의 모양을 보여준다. 변경 이유, 이전 기준, 정정은
History surface가 소유하고, Package Scope·Verification Contract·Closeout Contract 같은 mutable
contract surface는 current revision과 관련 History pointer만 둔다.
helper command syntax는 예시가 아니라 `../scripts/package-log --help`가 소유하므로, 실제 실행 전
해당 help를 먼저 확인한다.

Task Index의 task-record locator는 project integration이 정한 안정 locator placeholder로 쓴다.
Task Index는 진행 상태를 복제하지 않고 executable W와 profile/mode/record mapping만 보여준다.

```markdown
## Task Index

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W1 | Compact | inline | `<task-record:retry-policy/W1>` |
```

## Worked Patterns

### 직접 시작 — activation 판단부터 controlling skeleton까지

**상황**: 사용자가 "API retry policy를 429와 5xx에 맞게 바꾸고, 코드·테스트·문서·release note까지
correct/done인지 같이 확인해 줘"라고 요청했다. 한 artifact만 고치는 일이 아니라 retry 정책 변경이
여러 related artifact의 수정·재검증을 함께 요구하므로 controlling package log로 직접 시작한다.

**표면·분기**: activation preflight는 full rule을 다시 쓰지 않고 요청에서 드러난 공통 scope/evidence/
closeout gate만 확인한다. repo-wide log 위치, current-work 선택, registry audit가 부재하거나 stale하면
이 package 안에서 고치지 않고 `project-setup.md`로 route-out한다.

지원되는 direct-start skeleton 생성은 먼저 help로 helper surface를 확인한 뒤 `controlling new`로
만든다.

```sh
package-log controlling new --topic "API retry policy package" --description "client 동작, tests, docs, release communication을 함께 검증하는 API retry policy 변경" --scope "API retry policy"
```

**결과 markdown 핵심**: 아래는 raw skeleton 출력이 아니라 bootstrap 내용을 채운 뒤의 accepted
state 모양이다. 생략한 skeleton line(예: Stable package key)은 raw 출력의 placeholder를 유지한다.

```markdown
---
topic: API retry policy package
description: client 동작, tests, docs, release communication을 함께 검증하는 API retry policy 변경
status: open
---

## Work Items

- [>] W1 현재 retry 동작과 related artifact 영향을 확인한다
- [ ] W2 승인된 retry policy 변경을 구현한다

## Required Context

### Return Target

- None: independent package log.

### {Global}

- Package contract: `package-log.md`; base loop contract: `loop-rules.md`.
- Project integration placeholder: 실제 경로, stable key, registry integrity command, model ID는 여기서 정의하지 않는다.

## Package Scope

- Revision: 1; History pointer: `2026-07-06 · controlling bootstrap`.
- Primary boundary: client request의 API retry policy.
- Related artifacts in allowed write-set:
  - `<client retry implementation>`
  - `<retry policy tests>`
  - `<API behavior docs>`
  - `<release note or changelog entry>`
- Excluded:
  - retry policy가 호출하는 범위를 제외한 authentication refresh behavior.
  - out-of-scope effect로 올리기 전의 global logging/telemetry schema 변경.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution default: W1은 inline, W2는 Brief review 뒤 inline 또는 delegated.
- Review anchors:
  - Contract review after W1 synthesis.
  - Result review before consuming W2 Result.
- Result review와 consumption은 별도 task record가 아니라 controlling History entry로 기록한다.
- Risk gate: public API contract, data safety, multi-owner conflict risk가 발견될 때만 independent reviewer를 둔다.

## Task Index

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W1 | Compact | inline | `<task-record:retry-policy/W1>` |
| W2 | Compact | inline | `<task-record:retry-policy/W2>` |

## Evidence

- Current accepted evidence:
  - `<source:client retry implementation>`는 현재 idempotent 5xx만 retry한다.
  - `<source:test suite>`에는 5xx retry coverage가 있지만 429 `Retry-After` case가 없다.
  - `<source:API docs>`는 retry behavior를 "transient server errors"로만 설명한다.
- Evidence gaps:
  - non-idempotent request가 retry에서 제외되는지 확인해야 한다.

## Cross-Artifact Effects

- 429 retry support 추가는 implementation, tests, docs, release note wording에 영향을 준다.
- `Retry-After` parsing이 shared HTTP date parsing을 요구하면 shared utility code를 수정하기 전에
  out-of-scope effect로 기록한다.

## Decision Candidates

- Candidate: `Retry-After`가 있는 `429`만 retry하고, 없으면 retry하지 않는다.
  - Rationale: unbounded client retry를 막고 server-rate-limit authority를 명확히 둔다.
- Candidate: 5xx retry는 idempotent request로 제한한다.
  - Rationale: duplicate side effect를 막는다.

## Verification Contract

- Revision: 1; History pointer: `2026-07-06 · controlling bootstrap`.
- Required:
  - `<retry behavior unit/integration verification>`
  - `<docs consistency check>`
- Recommended:
  - `<release note wording manual review>`
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 1; History pointer: `2026-07-06 · controlling bootstrap`.
- Criteria:
  - Accepted Scope가 실제 changed artifacts와 일치한다.
  - W2 Result를 review했고 accepted/partially accepted/rejected disposition과 artifact disposition이 끝났다.
  - Required verification이 passed이거나 residual risk를 포함한 명시적 waiver가 있다.
  - Task Index locator가 project-owned registry integrity check 기준의 실제 task record와 일치한다.
```

**주의점**: 이 예시는 activation rule 전체를 checklist로 복제하지 않는다. 직접 시작은 "공통
correct/done 판단이 필요한가"를 확인하는 짧은 판단이고, package surface가 확정 계약을 소유한다.

### 기존 Base 로그에서 package 조건 발견

**상황**: 일반 base log의 W4가 "retry docs만 보완"으로 시작했지만, 확인 중 docs 변경이 client
behavior, tests, release note의 동반 수정·검증 없이는 correct/done이 될 수 없다는 사실이 드러났다.

**표면·분기**: source W4가 child package 결과를 소비해야 하면 `[↓]` detach를 쓴다. source가 더 이상
결과를 기다리지 않고 ownership을 넘기면 `[→]` transfer를 쓴다. 기존 base log에 package 8표면을
붙여 in-place upgrade하거나, package log에서 base log로 downgrade하지 않는다.

Portable helper를 쓰는 경우 `controlling detach`는 source Work Item의 detach 전이와 child package
controlling skeleton 생성을 한 동작으로 묶는다.

```sh
package-log controlling detach <source-log> --id W4 --topic "API retry policy package" --description "retry docs completion depends on behavior, tests, and release note consistency" --scope "API retry policy"
```

**결과 markdown 핵심**:

```markdown
## Work Items

- [↓] W4 Retry docs update — detached: `<package-log:api-retry-policy>` — reason: docs 작업을 닫기 전 source W4가 package result를 소비해야 한다
```

```markdown
## Work Items

- [→] W4 Retry docs update — transferred: `<package-log:api-retry-policy>` — package log가 남은 lifecycle을 소유하고 source는 result를 소비하지 않는다
```

child package log:

```markdown
## Required Context

### Return Target

- Log: `<source-base-log>`
- Work Item: W4
- Consume when: source W4가 package Result digest와 artifact disposition으로 retry docs 완료 여부를 판단할 수 있을 때.
- Context snapshot: source W4에서 retry docs가 implementation, tests, release note consistency에 의존함을 발견했다.
```

**주의점**: detach와 transfer는 source log의 lifecycle 관계다. package 여부를 발견했다는 이유만으로
source block의 과거 history를 rewrite하지 않는다.

### discovery 후 not-package 반환

**상황**: direct-start package로 열었지만 W1 discovery 결과, requested "retry policy change"가 실제로는
docs wording cleanup 하나였고 implementation/tests/release note가 공통 closeout gate를 공유하지
않는다고 확인됐다.

**핵심 markdown**:

```markdown
## Evidence

- Discovery result:
  - `<source:client retry implementation>`는 문서화된 429와 5xx behavior와 이미 일치한다.
  - `<source:test suite>`는 docs가 주장하는 behavior를 이미 cover한다.
  - `<API behavior docs>`의 wording만 stale이다.

## Cross-Artifact Effects

- N/A.
- Reason: docs wording cleanup을 위해 함께 변경하거나 재검증해야 하는 related artifact가 discovery에서 발견되지 않았다.
- Activate when: future retry behavior change가 implementation, tests, docs, release communication에 함께 영향을 줄 때.

## Decision Candidates

- Candidate: `not-package`를 반환하고 docs wording cleanup은 base-log task 또는 source W disposition으로 이어간다.

## 2026-07-06 · Discovery result

- W1이 common package gate가 성립하지 않음을 확인했다.
- Candidate Result outcome: `not-package`.
- Artifact disposition:
  - package log는 discovery record로 보존한다.
  - active package execution W는 남기지 않는다.
  - Docs wording cleanup은 `<source W or independent base log>`로 반환해 일반 base handling으로 처리한다.
```

**결과 markdown 핵심**: package surface는 삭제하지 않는다. active task, result, artifact disposition을
닫고, source가 있는 경우 Return Target을 통해 `not-package`를 Result outcome으로 반환한다.

**주의점**: `not-package`는 frontmatter status나 Work Item marker가 아니다. Return Target이 없으면
근거와 disposition을 기록한 뒤 base closeout/status 절차로 종료 가능성을 판단한다.

### 기존 package log 재개

**상황**: 이미 열린 API retry package log를 이어받았다. 이전 세션이 W2 implementation task를 진행했고
candidate Result를 남겼을 수 있다.

**표면·분기**: SKILL.md `재개 정보 복원 또는 Bootstrap`의 existing Base 절차로 Work state(`[>]`, Work Items)와
Required Context를 먼저 복원한다. 이어 `package-log.md#state-ownership-and-task-contract`와
Package Internal Router로 Package surfaces, Task Index와 task record pointer를 복원한다. 이미 package인
로그를 다시 activation 판정하지 않는다.

**결과 markdown 핵심**:

```markdown
## Work Items

- [ ] W1 현재 retry 동작과 related artifact 영향을 확인한다
- [>] W2 승인된 retry policy 변경을 구현한다

## Task Index

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W2 | Compact | inline | `<task-record:retry-policy/W2>` |
```

재개 시 읽기 순서 요약:

```markdown
- (a) existing Base 절차: `## Work Items`에서 `[>] W2`를 확인했다. Required Context `{Global}`과
  `{W2}` scope가 있으면 적용했다. W2 owning History block을 읽어 Work state와 Required Context를
  복원했다.
- (b) Package Internal Router(`package-log.md#state-ownership-and-task-contract`): Current Package
  Scope, Evidence, Verification Contract, Closeout Contract revision과
  `<task-record:retry-policy/W2>` Task Index locator를 복원했다.
```

**주의점**: resume는 package status를 재선택하는 시간이 아니다. task record가 없거나 Task Index locator가
dangling이면 registry integrity issue로 기록하고 Reconcile/Closeout blocker로 다룬다.

### Two-anchor review와 result 소비·판정

**상황**: W2가 retry implementation, tests, docs, release note를 수정하고 candidate Result를 남겼다.
controlling은 바로 `[x] W2`로 바꾸지 않고 contract review anchor와 result review anchor를 구분한다.

**표면·분기**: anchor 1은 실행 전 contract review다. anchor 2는 Result acceptance 전 result review다.
accepted/partial/rejected disposition을 controlling이 기록하고, Result Consumption Gate가 끝난 뒤에만
accepted package surfaces와 Work Item marker를 Reconcile한다.

**결과 markdown 핵심**:

```markdown
## 2026-07-06 · Contract review anchor

- Scope/write-set, Verification Contract, Closeout Contract, W2 Task Brief revision 1을 review했다.
- Finding: W2는 `<client retry implementation>`, `<retry policy tests>`, `<API behavior docs>`, `<release note>`를 수정할 수 있다.
- Finding: shared HTTP date parser는 allowed write-set 밖이다. 필요하면 edit 전에 out-of-scope effect로 올린다.
- Disposition: W2 execution contract를 accepted로 판정했다.
```

```markdown
## 2026-07-06 · W2 Result review anchor

- Brief revision 1, Attempt 1의 `<task-record:retry-policy/W2>` Result를 review했다.
- Source check:
  - `<client retry implementation>`은 `Retry-After`가 있는 429만 retry한다.
  - `<retry policy tests>`는 `Retry-After`가 있는 429, 없는 429, idempotent 5xx, non-idempotent exclusion을 cover한다.
  - `<API behavior docs>`와 `<release note>`는 accepted behavior를 설명한다.
- Verification:
  - `<retry verification>` passed.
  - `<docs consistency check>` passed.
- Disposition: accepted.
- Artifact disposition: W2 changes를 모두 유지한다.
- Result Consumption Gate 뒤 Reconcile:
  - accepted implementation/test/doc sources로 Evidence를 갱신했다.
  - Cross-Artifact Effects를 addressed로 표시했다.
  - Closeout readiness를 갱신했다.
  - 이제 W2 marker를 `[x]`로 옮길 수 있다.
```

부분 수용 예시:

```markdown
- Disposition: partial.
- Accepted: 429 `Retry-After` implementation과 tests.
- Rejected: 모든 429를 retry한다고 약속하는 release note wording.
- Artifact disposition: implementation/tests/docs는 유지하고, W2를 consume하기 전 release note wording corrective W4를 만든다.
```

기각 예시:

```markdown
- Disposition: rejected.
- Reason: W2가 accepted Scope 밖에서 non-idempotent retry behavior를 바꿨다.
- Artifact disposition: 격리돼 있으면 W2 candidate changes를 revert하고, 아니면 corrective W4를 만들어 correction review 전까지 W2를 unconsumed로 둔다.
```

**주의점**: task 실행 완료는 package 완료가 아니다. Work Item marker 전이는 Result Consumption Gate
뒤에만 가능하며, 그보다 앞서지 않는다.

### Compact vs Full 선택

**상황**: API retry package에는 W1 discovery, W2 implementation과 optional W5 delegated review의
task record가 필요하다. 각 record를 Compact로 둘지 Full로 둘지 판정해야 한다.

**표면·분기**: profile은 lifecycle 필요성만으로 고른다. 독립 lifecycle이 없으면 Compact를 쓴다.
자체 Work Items/next pointer, Return Target 또는 세션 간 독립 재개가 필요하면 Full을 쓴다. 위임만으로
Full이 필요해지는 것은 아니다.

**결과 markdown 핵심**:

```markdown
## Task Index

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W1 | Compact | inline | `<task-record:retry-policy/W1>` |
| W2 | Compact | delegated | `<task-record:retry-policy/W2>` |
| W5 | Full | delegated | `<child-log:retry-policy-review>` |
```

판정 메모:

```markdown
- W1 Compact: warm-context discovery이고 local Work Items나 독립 재개가 없다.
- W2 Compact: delegated execution이지만 Brief 하나, Result 하나로 끝나며 별도 child lifecycle이 없다.
- W5 Full: review가 여러 세션에 걸쳐 자체 Work Items, next pointer와 Return Target을 필요로 한다.
```

**주의점**: 하나의 executable W를 Compact와 Full 양쪽에 중복 등록하지 않는다. examples에서 full
task-record template을 다시 출력하지 않고, 전체 shape가 필요하면 계약 owner를 보게 한다.
