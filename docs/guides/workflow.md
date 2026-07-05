# 작업 Workflow

이 문서는 권위 계약이 아니라, 이 repo에서 사람과 agent가 실제 작업(기능 구현, 버그
수정, spec 구현, 문서 정리 등)을 어떻게 진행하는지 이해하기 위한 비권위 guide다.
실제 권위는 다음이 소유하며, 이 문서는 그것을 다시 정의하지 않고 전체 흐름과 repo
사례를 연결해 설명한다.

- 진입과 재개 순서, plan과 로그의 관계: `AGENTS.md`
- plan 작성 형식, 단계 문법, 유효성과 유지: `plans/AGENTS.md`
- 문서 taxonomy, 영역별 owner와 충돌 해결: `docs/documentation-system.md`
- 로그 생성·작성, Work Items, pointer, 상태 의미와 종료 조건: log skill
  (`.agents/skills/log/SKILL.md`와 `references/`)
- 구조 검색·append·상태 guard 보조 도구: log skill의 `.agents/skills/log/scripts/log`
- 로그를 닫을 때의 owner 반영과 repo 전용 점검: `logs/AGENTS.md`

세부 규칙이 필요하면 해당 owner 문서를 읽는다. 가설을 조용히 계약으로 승격하거나
구현 편의를 위해 계약을 임의로 바꾸지 않는다.

## 일반 작업 흐름

작업의 종류와 무관하게 흐름은 같다.

1. **진입·재개** — 세션 시작 시 현재 작업을 정한다(아래 "세션 시작과 재개"). 작업
   전 현재 할 일과 읽을 범위를 짧게 보고한다.
2. **작업 수행** — 작은 작업은 로그 하나의 Work Items와 next pointer로, 큰 작업은 plan과 단계
   로그로 진행한다. 진행 중 의도·판단·근거·제약·결정·남은 일을 로그에 증류한다.
3. **owner 문서 반영** — 확정되어 계속 유효할 결론은 책임 owner 문서나 code·tests에
   반영한다. 무엇이 어느 owner인지는 `documentation-system.md`가 정한다. 승인 전
   반영 예정 위치를 로그에 권위처럼 적지 않고, 후보를 보고한 뒤 승인받아 반영한다.
4. **종료** — 일반 종료 조건과 상태 전환은 log skill을 따르고, owner 반영 누락 등 repo
   전용 추가 점검은 `logs/AGENTS.md`를 따른다.

작업 종류별 차이는 결론을 반영할 owner 문서뿐이다.

- **기능 구현** — 현재 동작의 fact owner는 code와 tests다. 여러 module에 걸친
  invariant나 외부에서 관찰되는 동작만 specs·architecture로 승격한다.
- **버그 수정** — 재현·원인·수정은 로그와 code·tests에 둔다. 반복되는 footgun이면
  architecture에 기록한다.
- **spec 구현** — spec은 무엇을 만들지에 대한 권위다. 구현 중 확정·변경된 외부
  계약은 `docs/specs/`에 반영한다. spec의 절 순서와 구현 순서는 같을 필요가 없다.
- **문서 정리(workspace reset)** — 문서의 책임·권위·수명을 정해 owner 문서로
  통합한다. 큰 작업이므로 plan과 단계 로그로 진행한다.

## 변경 영향 추적

이 repo의 작업은 한 파일을 고치는 일이 아니라, 그 변경이 의존하거나 깨뜨릴 수 있는
관계를 끝까지 추적해 owner와 검증 경로를 맞추는 일이다. 탐색 도구는 후보를 찾는 데
쓰고, 최종 판단은 선택된 로그, owner 문서, code와 tests의 직접 근거로 확인한다.

- **문서를 읽거나 수정할 때** — 대상 문서의 owner와 type-specific `AGENTS.md`를 확인하고,
  body link, `Related:`, `Sources:`, inbound reference와 sibling 문서가 가리키는 관계를
  함께 본다. 다른 owner의 내용을 복사하거나 조용히 바꾸지 않고, stale한 쪽을 판정한 뒤
  승인된 owner에 반영한다.
- **코드를 읽거나 수정할 때** — 국소 함수만 보지 않고 호출 경로, producer/consumer,
  저장소·transport·adapter 같은 경계, 관련 tests와 docs의 current/as-built claim을
  따라간다. code와 tests는 현재 구현 사실의 owner이고, product/spec/architecture/decision은
  intended state와 이유를 소유하므로 서로 대체하지 않는다.
- **코드를 추가·삭제하거나 전반적으로 개편할 때** — 새 경계가 어느 owner 문서의 contract,
  architecture invariant, decision rationale, roadmap gate에 영향을 주는지 먼저 분류한다.
  삭제나 이동은 그 파일이나 문서만으로 복원되는 knowledge, live reference, test coverage가
  남는지 확인한 뒤 수행한다.
- **Obsidian Graph/Backlink를 쓸 때** — docs-as-Atlas는 영향 후보와 설계 맥락을 찾는
  navigation 보조다. IDE와 shell은 코드 검색·수정·테스트 실행의 주 도구로 두고, Graph와
  Backlink는 관련 문서·decision·spec·architecture·code/test 후보를 찾는 데 병행한다. Graph
  노드가 파일명만 보여 경로가 모호하면 hover나 folder grouping으로 실제 경로를 확인한다.

## 세션 시작과 재개

Claude와 Codex의 `SessionStart`는 같은 `scripts/onramp`를 호출한다. onramp는 단일
활성 plan 단계가 명시적 `-> ` 마커로 가리키는 anchor 로그에서 시작한다. anchor에 local
`[>]` 재개 지점이 있으면 그 로그를 현재 작업 로그로 보여주고, 없고 unresolved `[↓]` 분리
작업 로그가 정확히 하나면 그 분리 로그를 따라가 같은 기준을 다시 적용한다. 최신 블록 제목과
재개 지점만 요약하며 로그 본문의 의미나 복귀 소비 여부를 재구성하지 않는다. 활성 plan이
없을 때 open 로그가 하나면 그 로그를 선택한다. open 로그가 여러 개면 `[↓]` 분리 작업 로그
참조 그래프에서 다른 open 로그가 실제로 가리키고 자신은 더 이상 다른 로그를 가리키지 않는
leaf가 정확히 하나일 때만 그 로그를 선택한다. 복수 후보·복수 leaf·복수 활성 단계·복수
`[↓]`·깨진 포인터·순환은 자동 판단하지 않고 후보나 경고를 출력한다. 이 출력은 현재 작업의
권위가 아니다.

현재 작업을 정하고 재개하는 순서는 `AGENTS.md`가 소유한다. 요약하면 사용자 지정(주제만
지정하면 `description` 검색) → 활성 plan 단계 anchor에서 local `[>]` 또는 단일 unresolved
`[↓]` 따라가기 → 활성 plan이 없으면 단일 open 로그 또는 `[↓]` 참조 그래프의 유일한 leaf
순으로 대상 로그를 정하고, 선택한 로그 본문의 최신 기록·Work Items·재개 지점에서 현재
단계와 재개 지점을 확인한다. 여러 후보 중 하나로 정해지지 않으면 추측하지 않고 사용자에게
묻는다. 작업 전 현재 할 일과 읽을 범위를 짧게 보고한다.

`description`은 현재 단계나 첫 행동이 아니라, 로그를 열기 전에 관련 로그인지
판별하는 검색 index다.

## 작업 구성 판단

현재 작업은 진행 단위, 로그 수명과 다른 로그로의 전이, package activation을 서로 다른 축으로
판단한다. 세 축은 서로 독립이며 하나의 작업에 함께 적용될 수 있다. 진행 단위 축에서는 로그 하나로
진행할지 plan으로 독립된 큰 단계들의 순서를 관리할지 선택한다.

### 작은 작업

로그 하나의 Work Items와 next pointer로 작업 범위와 재개 지점을 알 수 있으면 plan을
만들지 않는다. W-id Work Items, `[>]` next pointer와 분리 절차는 log skill을 따른다.

### 큰 작업과 plan

독립된 큰 단계 여러 개의 순서를 별도로 관리해야 할 때만 얇은 plan을 만든다.

```markdown
# 문서 정리

- [x] 분류 -> `logs/2026-06-09-문서-분류.md`
- [>] 점검 -> `logs/2026-06-10-문서-점검.md`
- [ ] 이동
- [ ] 삭제
```

위 예시는 비권위 요약이다. plan의 template, 단계 문법, 정보 경계와 검증 규칙은
`plans/AGENTS.md`를 따른다.

### 다른 로그로 작업 전환

현재 작업을 다른 로그의 선행 작업으로 전환할 때는, 새 로그에 행동을 기록하는 것만으로
현재 작업 포인터가 바뀌지 않는다. plan 단계가 작업을 소유하면 plan 단계 pointer를,
source 로그의 Work Item에서 분리 작업 로그(child)가 생겼다면 source의 `[↓]` detached Work
Item(target·reason)과 child의 `### Return Target`을 함께 맞춰야 다음 세션이 올바른 작업을
재개한다. plan 단계 문법의 권위는 `plans/AGENTS.md`의 Maintenance이고, detach와 Return
Target 기록 규칙은 log skill이 소유한다.

### Package workflow

Package workflow의 의미와 Compact/Full composition은
`.agents/skills/log/references/package-log.md`, 실제 경로·stable key·locator와 수동 감사 절차는
`logs/AGENTS.md`, base lifecycle은 `.agents/skills/log/references/loop-rules.md`를 따른다.
이 절은 그 계약을 다시 정의하지 않고 실제 수행 순서만 연결한다.

1. **Package activation을 판정한다.** 변경 영향 조사 결과에
   `package-log.md`의 Activation 조건과 anti-signal을 적용한다. 조건이 성립하지 않으면
   package 표면을 만들지 않고 일반 작업 흐름을 계속한다.
2. **진입 관계를 정한다.** `package-log.md`의 Entry Routing에 따라 direct, detach 또는
   transfer로 진입하고, pointer와 Return Target 같은 실제 전이는 `loop-rules.md`를 따른다.
   Discovery 뒤 package 조건이 부정되면 `package-log.md`의 not-package 반환 절차를 적용한다.
3. **Controlling package log를 준비한다.** `package-log.md`의 Bootstrap, Fixed Package
   Skeleton과 첫 contract review를 적용한다. 물리 배치와 stable key 준비는
   `logs/AGENTS.md`를 따른다.
4. **Controlling log에서 task record까지 순서대로 읽는다.** 현재 Package Scope, 실행할
   Work Item과 accepted package state를 확인하고, Task Index에서 해당 W의 profile, execution
   mode와 exact locator를 찾은 뒤 그 task record를 연다. locator를 경로 규칙으로 추론하지 않는다.
5. **Profile과 execution mode를 별도로 선택한다.** 독립 lifecycle이 필요하지 않으면 Compact,
   자체 Work Items·next pointer·세션 간 독립 재개·Return Target이 필요하면 Full을 선택한다.
   그와 별도로 `package-log.md`의 기준에 따라 inline 또는 delegated mode를 선택한다.
   Compact도 독립 lifecycle이 필요 없는 delegated task에 사용할 수 있다.
6. **Required-read binding을 확인한다.** Delegated 또는 독립 재개 task는 controlling log의
   현재 Package Scope, 해당 Work Item, 관련 최신 History·next pointer/handoff와 accepted
   Evidence/contract entry를 가장 작은 유효 scope로 가리켜야 한다. 실행 전에 Task Brief가
   이 owner·대상 entry·후속 action을 복원하는지 확인한다.
7. **Task를 실행하고 candidate 결과를 반환한다.** 유효한 Task Brief 범위에서 source와
   artifact를 확인하고, 수행 trace와 Result / Verification을 task record에 남긴 뒤 controlling에
   candidate result와 digest를 반환한다.
8. **Controlling이 결과를 판정한다.** 두 번째 result review에서 해당 Brief revision과 Attempt,
   실제 source·산출물·검증 결과를 다시 확인하고 `package-log.md`에 따라 전체 수용, 부분 수용 또는
   기각한다. 필요한 artifact correction과 dependency 재검증도 이 disposition에 결합한다.
9. **Package Reconcile을 수행한다.** disposition과 그로 인한 의미 변화를
   `package-log.md`의 Package Reconcile map 및 base Reconcile에 따라 accepted package surface,
   Work Items·pointer, dependency, verification과 closeout readiness에 같은 동작으로 반영한다.
10. **Manual Registry Integrity를 검사한다.** Executable W 완료 또는 package closeout 전에
    `logs/AGENTS.md`의 절차로 Work Item, Task Index, 실제 record와 역방향 pointer를 대조한다.
11. **Result Consumption Gate를 적용한다.** Registry Integrity 통과 뒤
    `package-log.md`의 Result Consumption Gate로 exact result disposition, correction·재검증과
    accepted surface Reconcile 완료를 확인한다. 두 gate를 모두 통과하기 전에는 task 실행이
    끝났다는 이유만으로 base Work Item marker를 완료로 바꾸지 않는다.
12. **Package를 closeout한 뒤 base lifecycle을 적용한다.** `package-log.md`의 package-level
    Closeout을 먼저 통과하고, 그 다음 `loop-rules.md`의 base Closeout/status 절차를 적용한다.
    Child 결과의 parent 소비가 남아 있으면 parent Work Item이 별도로 처리한다.

## 충돌과 예외 흐름

정상 흐름 밖의 상황은 새 권위를 만들지 않고 해당 owner의 규칙을 적용한다.

- **다른 agent의 동시 변경** — 사용자나 다른 agent의 기존 변경을 되돌리거나 덮어쓰지
  않는다(`AGENTS.md`). 충돌하면 보고하고 사용자 판단을 받는다.
- **책임 문서와 code/tests의 drift** — 권위 경쟁이 아니라 intended state와 actual
  state의 차이로 본다. 어느 쪽이 stale한지 확인한 뒤 승인된 intent에 맞게 조정한다
  (`documentation-system.md`의 Conflict Resolution).
- **plan 상태와 실제 검증 결과 불일치** — plan의 완료 표시를 실제 code·tests 결과에
  맞춰 조정한다(`documentation-system.md`).
- **과거 decision과 새 방향 충돌** — 기존 기록을 조용히 덮어쓰지 않는다. 같은 로그의
  결론이 바뀌면 이전 결정, 새 결정과 변경 이유를 남기고, 종료된 결정을 대체하면 이를
  대체하는 decision을 남긴다(log skill의 status와 결정 변경 규칙).
