# Package Log

이 문서는 하나의 primary artifact/change boundary와 그 변경 때문에 함께 검토·수정·검증되어야
하는 related artifact를 하나의 correct/done 판단으로 다루는 **package workflow**의 portable 의미
계약을 소유한다.

`../SKILL.md`는 package 조건에서만 이 문서를 읽게 하는 on-demand router다. Base 로그 loop는 log
skill이 소유한다. 작업 종류 dispatch, 대상 후보 확정, Route / Contract Gate, 재개 정보 복원 또는
Bootstrap과 작업 루프의 top-level 계약은 `../SKILL.md`가, 파일 구조·Work Items·Required Context·
Record·Reconcile·cross-log/lifetime·Closeout/status의 세부 판정은 `loop-rules.md`가 소유한다.
이 문서는 Base loop를 대체하거나 복제하지 않고 그 위에 package 전용 internal router, package-only
구조와 package overlay owner 계약만 더한다.

이 문서는 portable 의미 계약만 소유한다. 실제 파일 경로, directory 이름, stable key 생성·유지,
검색·감사 명령, vendor 기능·model 이름 같은 repo·harness 전용 mapping은 project integration이
소유하며 여기 두지 않는다.

package 구성·운용, Result consumption과 Compact/Full 선택 예시가 필요하면
`package-log-examples.md`를 lookup 보조로 읽는다. 예시는 이 문서의 계약을 재정의하지 않는다.

package workflow의 phase는 Base loop를 대체하는 별도 loop가 아니라 SKILL.md spine의 각 gate와
작업 루프 위에 붙는 overlay다. 이어지는 section은 package-only 구조와 overlay 계약을 소유한다.

## Package Internal Router

이 문서는 SKILL.md가 package 조건을 확정한 뒤 읽는 package 내부 router다. SKILL.md는 모든
package-only section을 직접 라우팅하지 않으므로, 아래 순서로 필요한 section에 도달한다.

1. **Identity**: package workflow, controlling package log와 logical bundle의 기본 정의가 필요할 때
   먼저 확인한다.
2. **Activation and Entry Routing**: Route / Contract Gate에서 package signal을 판정하거나, 기존 Base
   진행 중 package detach/transfer/not-package 후보를 판정할 때 읽는다.
3. **Bootstrap and Integration Probe**: new package bootstrap 또는 existing package의 contract 갱신
   필요성을 확인할 때 읽는다.
4. **Artifact and Evidence Tests**: package Scope, related artifact, evidence provenance, effect/action
   binding을 판정할 때 읽는다.
5. **State Ownership and Task Contract / Task Record Contract**: existing package 재개, Task Index와
   task record pointer 복원, executable W와 Compact/Full 계약, Package Record overlay의
   controlling log/task record 기록 분담, candidate result 위치와 result disposition을 확인할 때
   읽는다.
6. **Agent Topology and Execution Modes**: inline/delegated, scouting/executing/reviewing 역할과
   two-anchor review 실체화 여부를 정할 때 읽는다. Package Act overlay의 execution mode와 role
   판단도 이 절에서 확인한다.
7. **Fixed Package Skeleton**: controlling package log의 package-only surface를 만들거나 점검할 때
   읽는다.
8. **Package Reconcile**: candidate result 수용·기각·부분 수용, contract 변경, Work Item 전이,
   not-package 반환처럼 package surface와 Base Work state를 함께 맞춰야 할 때 읽는다.
9. **Package Closeout**: Base Closeout/status 전이 전에 package gate와 blocker를 점검할 때 읽는다.

Phase와 SKILL.md spine의 매핑은 아래가 정본이다.

- **activation preflight** → SKILL `Route / Contract Gate`
- **provisional bootstrap** → SKILL `재개 정보 복원 또는 Bootstrap`
- **discovery** → Bootstrap/contract 세팅 국면. delegated scout인 경우만 자기 task record 또는 Full
  child lifecycle 안에서 독립 mini-loop를 돈다.
- **controlling synthesis** → Bootstrap/contract 세팅 국면
- **contract review anchor** → execution `Act` 진입 전 gate
- **execution** → Package `Act` overlay
- **result review anchor** → candidate result를 accepted state로 승격해 Reconcile하기 전 gate
- **result promotion** → Package `Reconcile` overlay
- **closeout** → Package Closeout gate 후 Base Closeout/Status

## Identity

- **Package workflow**는 하나의 primary artifact/change boundary와 related artifact의 correct/done을
  공통 evidence·scope·handoff·closeout gate로 다루는 조건부 절차다.
- **Controlling package log**는 accepted package state의 단일 owner다. base log lifecycle을 복제하지
  않고 package 전용 coordination surface를 더한다.
- **Logical bundle**은 controlling log와 Task Index에 등록된 executable W별 task record로 구성된다.
  각 task record는 정확히 한 controlling package/W-id에 소속된다.

## Activation and Entry Routing

Activation은 파일 수·로그 길이·병렬성이 아니라 primary와 related artifact가 공통 evidence·scope·
handoff·closeout gate를 공유해야 하는지로 판정한다.

- **Activation 신호(하나 이상이면 검토)**: primary 변경이 여러 related artifact의 수정·재검증을
  강제한다(한 곳 누락 시 전체가 correct 아님) · 검증할 claim이 커서 감사·재현·위임 가능한
  evidence가 필요하다 · 작업이 여러 세션·owner·위임으로 이어져 공통 handoff·closeout gate가
  필요하다.
- **Anti-signal**: 파일 수, 로그 길이, 병렬 실행 자체. 파일이 많아도 서로 독립이면 package가
  아니고, 단일 파일이어도 큰 claim 검증과 closeout gate가 있으면 package일 수 있다.

Entry routing은 base cross-log 관계로 표현한다(세부 판정은
[loop-rules.md](loop-rules.md#cross-log--lifetime-transitions)).

- 처음부터 activation 조건이 명확하면 controlling package log로 직접 시작한다.
- 기존 일반 log의 Work Item에서 package 조건이 발견되고 source가 결과를 소비해야 하면 그 W를
  별도 controlling package log로 `[↓]` detach하고 child Return Target으로 소비 관계를 소유한다.
- source가 결과를 기다리지 않고 작업 권한을 완전히 넘기면 base transfer를 사용한다.
- 현재 log에 package 8표면을 얹는 in-place upgrade/downgrade는 정의하지 않는다.

**Not-package 반환**: discovery 뒤 공통 scope/closeout gate가 성립하지 않으면 package 표면을
제거하지 않는다. 활성 task, candidate Result와 실제 artifact disposition을 닫고 `not-package` result
outcome을 parent에 반환한다. 이는 새 frontmatter status나 Work Item marker가 아니라 Return
Target을 통해 소비되는 결과다. 처음부터 독립 package log로 시작해 Return Target이 없으면 조건
부정의 근거와 disposition을 기록하고 base closeout 절차로 종료한다.

## Bootstrap and Integration Probe

- **Probe**: 확정된 project integration을 기준으로 이 package에 적용할 owner instruction,
  primary/related owner와 inbound/outbound·producer/consumer 관계, package-specific dependency,
  검증 command·tool·library, 환경·권한·외부 service 가용성을 조사한다. repo-wide instruction,
  log location, current-work 또는 common verification capability가 이 package 실행에 부족하거나
  stale하면 in-package로 고치지 않고 `project-setup.md` audit/update·repair로 보낸다.
- **Seed**: 초기 Scope와 allowed write-set, Workflow / Agent Plan, Task Index, Evidence,
  Verification Contract, Closeout Contract를 만들고 contract review gate에서 execution Act 진입
  가능성을 검토한다.
- **Discovery 위임**: discovery worker 위임은 optional이다. delegated scout는 별도 executable
  W/record를 가지며, controlling은 scout 보고를 원문 source에서 재확인한 뒤 contract를 작성한다.
- **도구 부재 계약**: 필요한 검증 도구·의존이 없거나 추가가 필요하면 임의로 설치·생략하지
  않는다. 필요성·비용·대안·잔여 위험을 먼저 사용자에게 제안·승인받거나 우회 판단을 받은 뒤
  진행한다.

## Artifact and Evidence Tests

package로 다루기로 한 작업 안에서 primary/related artifact, evidence, effect, action binding을
판정하는 절차다. activation과 별개다.

1. **Boundary Test**: 이 package closeout이 correct/done으로 판정해야 하는 중심 대상이 무엇인가?
2. **Related Artifact Test**: primary 변화 때문에 함께 수정·재검증되어야 하는 artifact가 무엇인가?
3. **Scope Authority Test**: related artifact가 allowed cross-artifact write-set 안인가? 밖이면
   `out-of-scope effect`로 기록하고 확인·이관한다.
4. **Evidence / Provenance Test**: owner에 영향을 주는 claim이 최종 source에서 재검증됐는가?
   current-state claim과 target-state claim의 source-of-truth가 분리됐는가? owner artifact 수정은
   evidence 확인 뒤에만 하는가?
5. **Effect / Action Binding Test**: 후속 행동을 Work Item이 소유하는가? cross-session이면 handoff로
   전달되고 Closeout에서 검증되는가?

Evidence surface는 current accepted evidence를 소유한다. accepted evidence가 반증되면 과거 History를
고치지 않고 정정 entry를 남긴 뒤 dependent Scope 분류·effects·Work Items·verification·closeout을
Reconcile한다.

## State Ownership and Task Contract

- 기존 package log를 재개할 때는 SKILL.md의 재개 정보 복원 단계에서 Base Work state를 복원한 뒤
  이 절에서 Package surfaces와 Task Index를 복원한다.
- Base Work Items와 next pointer만 package 진행·완료 상태를 소유한다. Task Index는 W-id,
  Compact/Full profile, inline/delegated execution mode와 canonical task-record file locator의
  mapping만 소유하고 진행·완료 상태를 복제하지 않는다.
- task record 생성과 Task Index 등록은 의미 계약을 이 절에서 확인한 뒤, 지원 여부와 명령 형태를
  먼저 `../scripts/package-log --help`의 `task new` / `index add`에서 확인한다.
- 모든 executable W는 별도 task record file 하나를 가진다. Executable W의 positive signal은 별도
  완료·검증·결과 소비 계약을 가지며 artifact 검토·수정·생성, 별도 agent 위임, 독립 재개, controlling이
  소비할 candidate evidence/result 생성 중 하나 이상을 하는 것이다.
- controlling 대화에서 직접 끝나는 질의응답·승인·coordination은 task record를 만들지 않고
  controlling History에 기록한다. 독립 완료·verification·Result 소비·재개가 없는 검색, 파일 열기,
  작은 수정, 명령 실행은 현재 executable W의 Task History에 남기는 micro-action이며 별도 W나 task
  record로 승격하지 않는다.
- task record는 execution trace와 candidate result를 소유하고, controlling log는 result disposition과
  accepted package-level state를 소유한다. task trace 전체를 controlling에 복사하지 않고 record
  locator와 package-level digest만 남긴다.

### Task Record Contract

일반 task record는 base log가 아닌 제3 문서이며 공통 4표면을 가진다. base log의 frontmatter
status, Work Items, Required Context, Return Target을 두지 않는다.

- **Identity**: controlling log, package W-id, Compact/Full profile, inline/delegated execution mode.
- **Task Brief** (versioned): 현재 유효한 실행 계약. revision과 그 변경 이유·authority를 담은 내부
  Task History entry pointer, objective, scope/excluded/allowed write-set, required reads,
  predecessor/candidate dependency와 expected baseline·isolation,
  completion/verification/review/escalation/result-consumer 계약. Scope, write-set, 완료 조건,
  verification 또는 authority가 바뀌면 revision을 증가시키고 변경 이유·승인·영향을 Task History에
  append한다. material contract 변경은 영향 범위의 contract review 재수행과 active task의 새
  revision 적용 판정을 요구한다.
  Delegated 또는 독립 재개되는 task의 required reads는 controlling log를 명시하고, 그 log의 현재
  Package Scope, 해당 Work Item, 관련 최신 History·next pointer/handoff와 accepted Evidence/contract
  entry를 가리킨다. 이 상태를 task record에 복사하지 않고 owner/path, 대상 entry와 읽은 뒤
  수행할 action을 가장 작은 유효 scope로 binding한다.
- **Task History** (append-only): Brief revision의 이유·authority·영향, Attempt별 source check·실행
  trace·candidate dependency·artifact disposition·escalation. 과거 entry는 고쳐 쓰지 않고 정정·후속
  판단을 새 entry로 append한다.
- **Result / Verification**: W-id·Brief revision·Attempt, 실제 수행 범위·changed artifacts, 완료
  조건별 결과, verification별 evidence와 passed/failed/unavailable/not-run status, candidate
  evidence/effect/decision, 실제 의존한 candidate dependency, 미해결 gap·residual risk, downstream
  dependency·revalidation, controlling 소비용 digest와 controlling disposition pointer.

**Attempt**는 같은 W identity와 특정 Brief revision 아래의 한 번의 실행·검증 주기다. 검증 실패
후 재시도는 같은 task record에 새 Attempt로 append한다. 대상·owner·완료 조건 변화로 Work Item
identity가 달라지면 Attempt나 revision으로 덮지 않고 새 W와 task record를 만든다.

**Compact와 Full**의 차이는 파일 유무가 아니라 실행·재개 계약의 깊이다.

- **Compact**: 위 공통 4표면을 담은 non-log task-record file이며 local lifecycle을 만들지 않는다.
  warm-context inline execution이 기본이며, delegated여도 독립 lifecycle이 필요 없으면 Compact를
  사용한다.
- **Full**: base child log이자 그 W의 task record다. 자체 Work Items/next pointer, 세션 간 독립
  재개, Return Target이 필요할 때만 만든다. 같은 4표면을 base child log의 frontmatter·local Work
  Items·Required Context/Return Target·History와 결합하며, 별도 non-log duplicate를 만들지 않는다.
  base child log 계약은 [loop-rules.md](loop-rules.md#cross-log--lifetime-transitions)를 상속한다.
- 한 executable W는 **Compact 1개 XOR Full 1개**를 가진다. Compact와 Full을 둘 다 만들거나,
  task record와 별도 Brief 파일을 중복 생성하지 않는다.
- Compact/Full 선택은 위임 자체가 아니라 독립 lifecycle 필요성으로 결정한다. Delegation과
  independent review는 profile과 별개 축이다.

```markdown
# Task Record — <package> W<id>

## Identity

- Controlling log: <controlling package log>
- Package W-id: W<id>
- Profile: Compact | Full
- Execution mode: inline | delegated

## Task Brief <!-- 현재 유효 계약. revision N -->

- Revision: N (변경 이유·authority는 Task History entry 참조)
- Objective:
- Scope / Excluded / Allowed write-set:
- Required reads:
- Predecessor / candidate dependency, expected baseline·isolation:
- Completion / verification / review / escalation / result-consumer 계약:

## Task History <!-- append-only -->

- <Brief revision 이유·authority·영향>
- Attempt <k>: source check · 실행 trace · candidate dependency · artifact disposition · escalation

## Result / Verification

- W-id · Brief revision · Attempt:
- Changed artifacts / 완료 조건별 결과:
- Verification: evidence + passed | failed | unavailable | not-run (+ 이유)
- Candidate evidence / effect / decision:
- Actual candidate dependency:
- Residual risk / downstream dependency · revalidation:
- Digest + controlling disposition pointer:
```

Full은 현재 Task Brief를 별도 `Task Brief` section에, 실행 trace와 Attempt·Result를 base History
entry에 둔다. Identity와 진행·재개는 각각 child log 정체성과 base Work Items/next pointer/Return
Target에 결합한다. 실제 물리 위치와 stable key는 project integration이 소유한다.

**Result disposition** (controlling이 소유):

- `candidate`는 disk가 변경되지 않았다는 뜻이 아니라 보고된 evidence·effect·완료 주장과 변경의
  package-level 정당성이 아직 수용되지 않았다는 뜻이다.
- controlling은 result review gate에서 task record·실제 source·산출물·검증 결과를 재확인한 뒤
  candidate result의 accepted state 승격 여부를 판정하고 artifact disposition을 같은 의미 동작으로
  소유한다.
- **전체 수용**: 변경을 유지하고 accepted evidence/effect/action과 package contract 변경으로
  승격한다.
- **부분 수용**: 변경·claim·verification을 독립적으로 분리할 수 있을 때만 허용하며 수용·기각
  범위를 명시한다. 수용 부분은 유지하고 나머지는 revert 또는 corrective Work Item으로 처리한다.
- **전체 기각**: 변경이 격리돼 안전하면 accepted baseline으로 revert하고, blind revert가 사용자·
  다른 task 변경을 훼손하거나 일부를 유지해야 하면 corrective Work Item과 별도 task record로
  처리한다.
- 새 owner, write-set 확장, Verification/Closeout criteria 변경을 요구하는 finding은 controlling
  수용 전 적용하지 않는다. 허용된 write-set 안의 수정이라도 그 정당성이 scope-expanding finding에
  의존하면 함께 보류하고 escalation한다.

**Concurrent candidate isolation**: working-tree 관찰과 controlling이 수용한 accepted baseline을
구분한다. concurrent task가 다른 active task의 candidate 변경을 claim·정당성 근거로 읽으면
sequential dependency, isolated baseline 또는 명시적 candidate dependency 중 하나를 쓰고, upstream
수용·기각·disposition 뒤 영향 범위를 재검증하기 전 accepted state로 승격하지 않는다. 같은 artifact의
concurrent write는 기본 금지하고 단일 artifact owner, 순차 dependency 또는 격리 환경 후 controlling
병합·재검증으로 통제한다. 단, independent reviewer는 Brief가 검토 대상 W·Brief revision·Attempt를
명시한 경우 candidate 변경을 의도적으로 읽을 수 있으며, 이를 accepted baseline이 아니라 검토 대상
candidate로 판정한다.

## Agent Topology and Execution Modes

역할은 기능이며 한 agent 인스턴스가 여러 역할을 겸할 수 있다.

- **Controlling**: accepted package state와 Scope를 소유·Reconcile하고 재개·closeout을 관리한다.
- **Scouting**: bounded read-only discovery. 출력은 검색 범위·coverage, 확인 source,
  `path:line` 직접 확인 사실, 미확인 영역·불확실성과 candidate finding을 가진다. Scope 확정·owner
  수정·correct/done 판정 권한은 없다.
- **Executing**: 승인된 Task Brief와 allowed write-set 안에서 source를 검증한 뒤 artifact를 수정하고,
  candidate result를 controlling에 반환한다. 상태를 소유하지 않는다.
- **Reviewing** (optional): source와 실제 산출물을 독립 재검증하고 근거 있는 candidate 판정을
  발행한다. 비용이 크므로 항상 실체화하지 않고 위험 gate로 조건화한다.

**Execution mode**는 portable에서 inline과 delegated만 정의한다.

- **inline**: 작업이 작거나, 긴밀한 반복이 필요하거나, 관련 context가 controlling thread에 이미
  warm할 때.
- **delegated**: 작업을 Task Brief로 완전히 담을 수 있고, isolation/독립 검증/병렬 이득이 cold-start·
  brief·결과 반환·worker 토큰 비용을 정당화할 때. 위임 시 작업의 reasoning bar와 비용에 맞는
  capability를 고른다. 선택 factor는 portable이고 구체 model ID는 project integration이 매핑한다.
- 기본값은 inline이다. delegated scout/reviewer는 각각 별도 executable W와 task record를 가진다.
  누가 실행하느냐만 바뀌고 accepted 상태 owner는 controlling 하나로 유지된다.

`coordinated team` 같은 vendor-specific orchestration은 portable mode가 아니며, project integration이
이 문서의 owner·task/result·dependency/isolation invariant에 매핑한다.

**Two-anchor review**: 모든 package는 synthesis 뒤 contract review와 result acceptance 전 result
review를 항상 수행한다. 이는 정적 문서 점검이 아니라 실행 gate다. contract review는 execution Act
진입 전 Scope, allowed write-set, Verification Contract, Closeout Contract와 관련 Task Brief를
검토하는 gate이고, result review는 candidate result를 accepted state로 승격해 Reconcile하기 전에
task record·실제 source·산출물·검증 결과를 검토하는 gate다.

- 낮은 위험은 controlling self-review로 충족한다. 최소 checklist는 Scope/write-set 정합, Verification
  실행 가능성, Closeout criteria 판정 가능성이다.
- 큰 claim, public contract/security/data/release, 비가역·외부 영향, 다중 owner 충돌, 큰 blast
  radius, 낮은 discovery confidence 중 위험 gate가 있을 때만 independent reviewer를 실체화한다.
- delegated scout/reviewer는 별도 W/record에, inline discovery는 current task Task History에,
  bootstrap 중 controlling discovery와 self-review는 controlling History와 영향받은 표면에 기록한다.
- reviewer result는 candidate다. controlling이 근거를 갖고 수용하거나 반증 근거를 History에 남기고
  기각한다. 단순 의견 불일치는 escalation 조건이 아니며, unresolved closeout-blocking conflict만
  responsible authority에, 없으면 사용자에게 escalation한다. review W는 판정 전달·소비가 끝나면
  완료할 수 있고, 수정은 controlling이 result를 소비한 뒤 기존 실행 W 재개 또는 별도 corrective
  W가 소유한다.

## Fixed Package Skeleton

Base log의 Work Items, Required Context, History와 status/Closeout 절차는 상속하고 복제하지
않는다. Package 전용으로 아래 8표면을 고정한다. controlling package skeleton 생성을 적용할
때는 의미·계약을 이 절에서 판정한 뒤 `../scripts/package-log --help`의 `controlling new` /
`controlling detach` 지원을 확인한다.

- **Package Scope** — primary artifact/change boundary와 allowed cross-artifact write-set. 비어 있을
  수 없다. write-set 밖 영향은 `out-of-scope effect`로 기록·확인·이관한다.
- **Workflow / Agent Plan** — 이 package의 phase, 역할, execution mode, review anchor와 위험 gate
  계획. 여기 적는 package phase는 [Package Internal Router](#package-internal-router)의 매핑에 따라
  SKILL spine과 Base loop overlay로 접힌다.
- **Task Index** — executable W ↔ (Compact/Full profile, inline/delegated mode, canonical task-record
  locator) mapping.
- **Evidence** — current accepted evidence. Evidence Ledger는 이 surface의 format이다.
- **Cross-Artifact Effects** — primary 변화가 related artifact에 만든 영향.
- **Decision Candidates** — decision-worthy rationale.
- **Verification Contract** — required/recommended/unavailable/waived 검증과 그 source. 실제
  command·tool·waiver 내용은 project integration이 채운다.
- **Closeout Contract** — criteria와 readiness.

- 적용되지 않는 surface는 삭제하지 않고 `N/A`, `Reason`, `Activate when`을 기록한다. package 성립·
  판정에 필수인 Scope, Verification Contract, Closeout Contract는 근거 없이 비적용 처리하지 않는다.
- Scope/write-set·Verification·Closeout 같은 mutable contract는 current revision과 관련 History
  pointer를 가진다. 별도 Amendments section은 만들지 않는다. 변경 이유·이전 기준·승인 경위는
  History surface가 소유한다.

## Package Reconcile

package는 base Reconcile을 복제하지 않고 그 같은 Reconcile을 package 의존 표면으로 확장한다(base
Reconcile은 [loop-rules.md](loop-rules.md#reconcile)).
아래는 portable 최소 Reconcile map이다. 왼쪽 표면이 의미상 바뀌면 오른쪽 표면을 미루지 말고 같은
동작에서 Reconcile한다. 각 프로젝트는 자기 표면 구성에 맞는 row를 추가로 확장할 수 있으나, 나열된
의존 관계는 최소 계약으로 유지하고 선택적으로 취급하지 않는다.

| 바뀐 표면 (trigger)                                                               | 같은 동작에서 함께 Reconcile할 의존 표면                                                                           |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| candidate evidence/result/reviewer 판정 수용·기각·부분 수용                       | accepted Evidence/effects/decision · artifact disposition · Scope · Work Items · verification · closeout readiness |
| related artifact · Scope/write-set 변경                                           | authority · out-of-scope effect · affected Brief revision · waiver scope · verification·closeout criteria          |
| material Brief/contract revision                                                  | affected active/resumed task · contract review · Result 판정 기준                                                  |
| Result 소비                                                                       | Work Items/next pointer · accepted package surface · downstream dependency · closeout readiness                    |
| concurrent conflict · candidate dependency disposition                            | artifact owner·순차화/격리 · downstream invalidation·재검증 · Evidence/Verification/Closeout                       |
| Work Item 완료·취소·이관 또는 locator 변경                                        | Task Index · task record disposition · inbound pointer · History                                                   |
| package direct/detach/transfer routing                                            | Return Target/parent pointer · Task Index bootstrap                                                                |
| not-package 반환                                                                  | task/result/artifact disposition · parent Work Item                                                                |
| verification tool/environment/waiver · handoff · Closeout criteria/readiness 변경 | Work Items · residual risk · status dependency                                                                     |

package rename/split/merge/supersede는 base cross-log/lifetime mechanics를 재정의하지 않고 package
membership, locator, task disposition과 inbound pointer를 함께 Reconcile한다.

## Package Closeout

base Closeout/status 절차 앞에 package gate를 적용한다(base는
[loop-rules.md](loop-rules.md#closeout--status)). 조건이 모두 충족된 뒤에만 base status로 전이한다.

각 executable W는 순서대로 통과해야 한다.

1. **Registry Integrity Check**: Work Item ↔ Task Index ↔ 실제 task record가 일치하고, record
   Identity의 controlling/W-id 역방향 pointer가 맞으며, dangling locator나 orphan record가 없다.
   기계적 registry 점검은 `../scripts/package-log --help`의 `package-log check` 지원을 확인해 사용할
   수 있지만, 결과 의미와 closeout 판정은 agent/user가 이 절의 계약으로 소유한다.
2. **Result Consumption Gate**: exact Brief revision/Attempt 결과, controlling 수용·부분 수용·기각
   disposition, artifact correction·재검증과 accepted package surface Reconcile이 끝났다.

task 실행 완료만으로 Work Item을 완료하지 않는다. 두 gate를 통과한 뒤에만 base Work Items
marker를 전이한다.

package-level로는 아래를 판정한다.

- **Contract integrity**: Scope/write-set·Verification·Closeout revision과 History pointer가 current
  이며, material contract 변경 뒤 contract review를 재수행했다.
- **Artifact integrity**: 실제 artifact와 accepted package state가 일치하고, related artifact·
  inbound/outbound consumer, concurrent candidate 의존, 기각·부분 수용 disposition을 확인했다.
- **Evidence/effects**: accepted claim을 source에서 재검증하고 current/target을 구분했으며,
  Cross-Artifact Effects와 out-of-scope effect의 W/handoff/authority binding을 확인했다.
- **Verification/review**: required verification status, waiver authority/scope/residual risk, two-anchor
  review, reviewer candidate disposition과 unresolved closeout-blocking conflict 부재를 확인했다.
- **Return/status**: child 반환 digest나 not-package disposition이 준비됐다.

미소비 Result, 미완료 disposition, candidate dependency 미재검증, dangling/orphan record, unresolved
effect/review conflict는 closeout blocker다. parent의 실제 result 소비는 parent Work Item이 별도로
소유한다.
