# Log Skill Quick Flow

이 문서는 `../SKILL.md#진입-라우팅`의 그림 요약과 시나리오 예시를 제공한다. agent가 사용자에게
"왜 이 절차로 가는지"를 설명할 때 사용할 수 있는 빠른 locator 역할을 한다.

이 문서는 portable 계약을 독자적으로 재정의하지 않는다. 진입 라우팅 정본은 `../SKILL.md#진입-라우팅`,
상세 판정은 `../SKILL.md`,
`loop-rules.md`, `package-log.md`, `project-setup.md`와 `maintenance.md`가 소유한다.

## 판정 모델

agent는 다음 두 결정을 독립적으로 내리고, 그 사이에서 로그 대상 상태를 확인한다.

| 판정 | 선택 |
| --- | --- |
| 수행할 작업 | 일반 작업·로그 lifecycle / project setup·audit / log skill maintenance |
| 로그 대상 상태 | 새 로그 / 기존 로그 |
| 적용할 기록 계약 | Base / Base + Package Extension |

작업 종류와 기록 계약은 서로 다른 축이다. setup이나 maintenance도 Base로 기록할 수 있고,
package 조건을 만족하면 Base에 Package Extension을 추가할 수 있다. 새 로그와 기존 로그는 작업
종류가 아니라 진입할 로그 대상의 상태다.

## Quick Flow

아래 그림은 `../SKILL.md#진입-라우팅`의 요약이다. 정본은 `../SKILL.md`가 소유한다.

```text
SKILL trigger
   │
   ├─ 작업 종류 판정  (setup·maintenance도 로그 대상 상태·기록 계약을 함께 판정 → Scenario 6·7)
   │     ├─ project setup·audit ───→ project-setup.md
   │     ├─ log skill maintenance ─→ maintenance.md
   │     └─ 일반 작업·로그 lifecycle ─→ 로그 대상 상태 판정
   │
   └─ 로그 대상 상태 판정 (각 상태가 자신의 기록 계약을 함께 확정)
         ├─ 새 · 일반
         │     → Base log 생성 · Base 계약
         ├─ 새 · package 조건 처음부터 명확
         │     → package-log.md Activation 판정
         │     → 확정 시 controlling package log 직접 생성 · Base + Package Extension
         │     → not-package면 Base
         ├─ 기존 · 일반 Base log
         │     → Base Enter로 Work Items·Required Context·재개 block 복원 · Base 계약
         ├─ 기존 · Base 진행 중 package 조건 발견
         │     → package-log.md Activation 판정
         │     → in-place 전환 금지 · detach(source 소비) 또는 transfer(권한 이양)
         │     → 확정 시 별도 controlling package log · Base + Package Extension
         │     → not-package면 기존 Base 유지
         └─ 기존 · package log
               → Base Enter로 상태 복원 + package-log.md로 Package surfaces·Task Index 복원
               → 이미 활성인 Base + Package Extension 계속 적용
```

기록 계약(Base / Base + Package Extension)은 상태 판정 뒤에 오는 별도 단계가 아니라, 각 상태가
확정하는 속성이다. Base는 거쳐 가는 단계가 아니라 모든 상태의
기반 계약이다. package 후보 상태는 activation이 확정돼야 Extension이 붙고, not-package면 Base로
남는다. 신규 작업은 package signal이 처음부터 명확하면 entry에서 activation preflight로 계약을
확정하고 controlling package log로 직접 시작한다. Base log를 먼저 만든 뒤 전환하지 않는다. 기존
일반 로그에서 조건이 발견되면 in-place 전환하지 않고 detach/transfer로 별도 controlling package
log를 연다.

## Owner Routing

| 필요한 판단·행동 | Owner |
| --- | --- |
| log skill 정체성, 진입 라우팅, 공통 불변, 최초 선택·읽기와 top-level loop | `../SKILL.md` |
| 파일 구조, Work Items, Required Context, Record, Reconcile, lifetime과 status 상세 | `loop-rules.md` |
| Base Log 판단·운용 사례와 핵심 도구 결과 예시 | `base-log-examples.md` |
| Package activation, entry routing과 Package Extension | `package-log.md` |
| Package 구성·운용 사례, Result consumption과 Compact/Full 선택 예시 | `package-log-examples.md` |
| project integration bootstrap·audit | `project-setup.md` |
| log skill·reference·script·project integration 유지보수 판단 | `maintenance.md` |

이 문서는 위 owner의 상세 규칙을 복사하거나 변경하지 않고, 어떤 조건에서 무엇을 읽고 적용할지만
연결한다.

## Scenario 1 — 새 일반 로그

사용자 요청: “결제 오류를 조사하고 작업 로그를 만들어라.”

```text
SKILL trigger
→ 작업 종류: 일반 작업
→ 로그 대상: 새 로그
→ Package signal: 없음
→ Base 로그 생성
→ Base loop 수행
```

필요한 read path:

- 공통 계약: `../SKILL.md`
- 구조 상세가 필요할 때: `loop-rules.md`
- 생성 명령 syntax가 필요할 때: `../scripts/log --help`
- 생성 결과 사례가 필요할 때: `base-log-examples.md`

결과:

```text
Base Log
├─ Work Items
├─ Required Context
└─ History
```

## Scenario 2 — Package activation 판정

사용자 요청: “API retry policy를 429와 5xx에 맞게 바꾸고, 코드·테스트·문서·release note까지
correct/done인지 같이 확인해 줘.”

사용자 요청이 여러 artifact의 correct/done 판단을 함께 요구하는지 확인한다. Activation 기준과
anti-signal은 `package-log.md`가 소유한다. 구체 worked example은 `package-log-examples.md`를 본다.

```text
SKILL trigger
→ 작업 종류: 일반 작업
→ 로그 대상: 새 로그 또는 기존 로그
→ package-log.md Activation 판정
   ├─ 조건 불성립 → Base log로 진행
   ├─ 새 작업에서 조건 성립 → Scenario 2A
   └─ 기존 Base log 진행 중 조건 성립 → Scenario 4
```

### Scenario 2A — 처음부터 Package 조건이 명확한 새 작업

사용자 요청: “API 변경과 구현·문서·테스트·migration을 하나의 완료 판단으로 관리하라.”

```text
SKILL trigger
→ 작업 종류: 일반 작업
→ 로그 대상: 새 로그
→ Package signal 확인
→ package-log.md Activation 판정
→ 조건 성립
→ Controlling package log로 직접 생성
→ Base loop + Package Extension 수행
```

결과:

```text
Controlling Package Log
├─ Base surfaces
├─ Package surfaces
└─ Task records
```

Package log도 Base 계약을 사용하지만 처음부터 controlling package log로 생성된다.

## Scenario 3 — 기존 일반 로그 재개

사용자 요청: “`logs/payment-error.md`를 이어가라.”

```text
SKILL trigger
→ 작업 종류: 일반 작업
→ 로그 대상: 기존 로그
→ Base Enter
   ├─ Work Items
   ├─ Required Context
   └─ 재개 대상 block
→ 기존 package 상태 없음
→ Base loop로 계속 작업
```

Package activation을 매번 깊게 판정하지 않고 작업 중 signal이 발견될 때 검토한다.

## Scenario 4 — 기존 일반 로그에서 Package 조건 발견

이 시나리오는 Scenario 2 activation 판정에서 기존 Base log 진행 중 package 조건이 성립한 branch다.
기존 로그를 진행하다가 여러 artifact가 공통 evidence·scope·handoff·closeout gate를 공유해야
하는 package signal이 발견된 경우다.

```text
기존 Base Log 진입
→ 작업 중 Package signal 발견
→ package-log.md Activation 판정
→ 조건 성립
→ 기존 로그를 in-place 변경하지 않음
→ 별도 Controlling Package Log 생성
```

source가 결과를 소비해야 하면 detach한다.

```text
기존 Base Log W2 [↓]
        │
        └─ Controlling Package Log
              Return Target → source W2
```

source가 결과를 기다리지 않고 작업 권한을 넘기면 transfer한다.

## Scenario 5 — 기존 Package Log 재개

사용자 요청: “이 controlling package log를 이어가라.”

```text
SKILL trigger
→ 작업 종류: 일반 작업
→ 로그 대상: 기존 로그
→ Base Enter로 기본 상태 복원
→ Package surfaces와 Task Index 확인
→ 이미 활성화된 Package 계약 적용
→ Base loop + Package gates 수행
```

Package 여부를 새로 결정하지 않고 기존 활성 상태를 복원한다.

## Scenario 6 — Project Setup

사용자 요청: “이 repo에 로그 workflow를 도입하라.”

Project setup은 portable log skill을 현재 repo/project workflow에 연결하는 integration 절차다.
전체 흐름은 5-gate를 유지하되, setup 작업 자체의 기록 위치 원칙을 먼저 적용한다.

```text
Project setup trigger
        │
        ▼
1. Scope와 mode 확정
        │
        ├─ mode = bootstrap
        ├─ mode = audit
        └─ mode = update·repair
        │
        ▼
[Setup 기록 위치 원칙 적용]
        │
        ├─ 기존 log location/current-work가 있나?
        │       └─ 있으면 기존 절차로 setup 작업 로그 선택
        │
        ├─ 사용자가 setup 작업 로그를 지정했나?
        │       └─ 있으면 그 로그 사용
        │
        └─ 아직 기록 위치가 없나?
                └─ durable 기록은 보류
                   probe 결과는 transient proposal evidence로 유지
                   첫 proposal에 기록 위치 포함
        │
        ▼
2. Capability Probe
        │
        ├─ Project boundary
        ├─ Instruction/documentation authority
        ├─ Log location
        ├─ Workflow/current-work topology
        ├─ VCS/local-state
        └─ Verification capability
        │
        ▼
3. Disposition + optional proposal
        │
        ├─ preserve
        ├─ amend
        ├─ create
        ├─ skip
        └─ defer
        │
        ▼
Proposal ledger
        │
        ├─ required integration
        ├─ optional features
        ├─ 기록 위치 if missing
        └─ high-impact changes requiring separate approval
        │
        ▼
4. 승인 후 Apply
        │
        ├─ 승인 없음 → project 파일 수정 없음
        └─ 승인 있음 → 승인된 mapping/settings만 project integration owner에 기록
        │
        ▼
5. Validate and Report
        │
        ├─ log location usable?
        ├─ LOG_DIR needed/correct?
        ├─ agent instruction resolves?
        ├─ current-work ambiguity handled?
        ├─ split guard enabled이면 hint/ignore 정합?
        ├─ verification command usable?
        └─ docs/workflow owner stale 없음?
```

수행 절차는 Project Setup이고 기록 계약은 Base 또는 Base + Package Extension이다. setup 작업이
package 조건을 만족하면 Package Extension을 적용할 수 있다.

### Scenario 6A — Bootstrap

초기 setup에서 기록 위치가 없으면 durable 기록은 곧바로 만들지 않는다. Probe와 proposal 자체는
가능하지만, 첫 proposal에서 기록 위치를 정하고 승인 후 setup log에 소급 기록한다.

```text
사용자: “이 repo에 log workflow를 도입해라”
        │
        ▼
mode = bootstrap
        │
        ▼
기존 log location / setup 작업 기록 위치 확인
        │
        ├─ 있음
        │   └─ 그 위치/절차로 setup 작업 로그 선택
        │
        └─ 없음
            └─ 아직 durable log 기록 불가
               probe 결과는 proposal evidence로만 유지
        │
        ▼
최소 probe
        │
        ├─ project boundary
        ├─ instruction authority
        └─ log location 후보
        │
        ▼
첫 Proposal ledger
        │
        ├─ log location 제안
        ├─ setup 작업 기록 위치 제안
        └─ 필요한 경우 root instruction 기록 위치 제안
        │
        ▼
사용자 승인
        │
        ├─ 승인 전
        │   └─ project 파일 생성/수정 없음
        │
        └─ 승인 후
            ├─ log location/project integration 반영
            ├─ setup 작업 Base log 생성 또는 지정 로그 사용
            └─ 이전 probe/proposal/승인 내용을 setup log에 소급 기록
        │
        ▼
나머지 capability probe 진행
        │
        ├─ current-work
        ├─ VCS/local-state
        ├─ verification capability
        └─ optional features
        │
        ▼
최종 proposal/apply/validate/report
```

핵심:

```text
기록 위치가 없으면 durable 기록은 못 한다.
하지만 probe/proposal 자체는 가능하다.
첫 proposal에서 기록 위치를 정하고,
승인 후 setup log에 소급 기록한다.
```

### Scenario 6B — Audit

기존 integration을 read-only로 점검한다. 수정은 report/proposal까지만 하고, write는
update·repair에서 수행한다.

```text
사용자: “현재 로그 workflow가 맞는지 점검해라”
        │
        ▼
mode = audit
        │
        ▼
기존 project integration에서 log location / setup 작업 기록 위치 / current-work 확인
        │
        ├─ 기록 위치 있음
        │   └─ setup/audit 작업 로그 선택 가능
        │
        └─ 기록 위치 불명확
            └─ 후보와 불확실성 보고
               durable 기록은 보류하거나 사용자 지정 필요
        │
        ▼
Capability Probe
        │
        ├─ instruction/documentation authority
        ├─ log location
        ├─ workflow/current-work
        ├─ VCS/local-state
        └─ verification capability
        │
        ▼
Disposition
        │
        ├─ exists and adequate → preserve
        ├─ conflict → amend proposal
        ├─ missing optional → skip/opt-in proposal
        ├─ not applicable → skip
        └─ unknown → blocker 보고
        │
        ▼
Report only
        │
        └─ audit은 read-only이므로 수정 없음
```

### Scenario 6C — Update·Repair

승인된 변경이나 drift 복구를 기존 integration에 반영한다.

```text
사용자: “audit에서 나온 문제를 고쳐라”
        │
        ▼
mode = update·repair
        │
        ▼
기존 setup/audit evidence 확인
        │
        ▼
변경 대상 capability 특정
        │
        ├─ log location
        ├─ instruction owner
        ├─ current-work command
        ├─ split guard
        └─ verification command
        │
        ▼
Proposal ledger 확인/재제시
        │
        ▼
사용자 승인
        │
        ├─ 승인 없음 → 수정 없음
        └─ 승인 있음 → Apply
        │
        ▼
project integration owner에 승인된 변경 기록
        │
        ▼
Validate and Report
        │
        ▼
setup 작업 로그에 적용 결과/검증/보류 항목 기록
```

### Scenario 6D — Split Guard

Split guard는 optional feature다. Base Lifetime Boundary는 항상 의미 기반으로 적용되고, split
guard는 threshold reminder만 제공한다.

```text
split guard 필요성 등장
        │
        ▼
Optional feature로 분류
        │
        ▼
상태 판정
        │
        ├─ enabled
        │   ├─ soft/hard 값 확정
        │   ├─ .log-hints 위치 확정
        │   └─ VCS ignore 방식 확정
        │
        ├─ disabled
        │   └─ 설치 안 함, .log-hints/ignore 생성 안 함
        │
        └─ undecided
            └─ 나중에 다시 제안
        │
        ▼
승인 후에만 project integration에 기록
```

### Scenario 6E — Package 작업과 Project Setup

Package 작업에서 repo-wide setup이 부족하면 `project-setup.md`로 repo-wide integration을 먼저
setup/audit하고, 이후 `package-log.md`에서 per-package probe를 수행한다.

```text
package 작업 trigger
        │
        ▼
package-log.md activation 검토
        │
        ▼
repo-wide setup이 부족한가?
        │
        ├─ 부족함
        │   └─ project-setup.md로 repo-wide integration setup/audit
        │
        └─ 충분함
            └─ package-log.md에서 per-package probe
        │
        ▼
package-specific 검증/권한/service 확인
```

경계:

```text
project-setup.md:
- repo-wide instruction
- log location
- current-work
- common verification capability

package-log.md:
- per-package verification command
- permission
- external service
- package closeout gate
```

## Scenario 7 — Log Skill Maintenance

사용자 요청: “log `SKILL.md` 구조를 검토하고 개선하라.”

```text
SKILL trigger
→ 작업 종류: Log skill maintenance
→ maintenance.md 읽기
→ 지정된 기존 작업 로그 확인
→ Base Enter로 Work Item과 현재 판단 복원
→ maintenance 절차로 owner·영향 범위 검토
→ 필요하면 Package activation 별도 판정
→ 결정과 결과를 Base loop로 Record·Reconcile
```

수행 절차는 Maintenance이고 기록 계약은 Base 또는 Base + Package Extension이다.

## 문서군 개편에서 사용하는 방법

각 owner 문서를 만들거나 개편할 때 다음을 확인한다.

1. 위 Quick Flow에서 해당 문서가 소유할 판정과 행동만 가져간다.
2. 다른 owner의 상세 계약을 복사하지 않고 조건과 target을 명시해 routing한다.
3. 각 Scenario에서 필요한 read path만으로 다음 행동과 owner를 복원할 수 있는지 확인한다.
4. 신규 package 직접 시작, 기존 일반 로그의 detach/transfer와 기존 package 재개를 하나의
   in-place profile 전환으로 합치지 않는다.
5. setup·maintenance 작업 종류, 새 로그·기존 로그 상태와 Base·Package 기록 계약을 같은 분류축으로
   섞지 않는다.
