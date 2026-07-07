# 프로젝트 로그 설정

프로젝트 진입 계약에 로그 저장 위치, 로그 workflow 또는 현재 작업 선택 방식이 지정되지
않았거나, 기존 로그 integration을 점검·복구할 때 이 문서를 읽는다.

이 문서의 핵심 목적은 portable log skill을 현재 repo/project의 실제 workflow와 연결하는
integration이다. 이 문서는 project log integration의 framework를 소유한다. 즉 무엇을 탐색하고,
어떤 상태로 판정하고, 무엇을 제안·승인·검증할지를 정의한다. 실제 파일명, 명령, hook, ignore
방식과 프로젝트별 mapping은 각 project integration이 소유한다. 이 문서의 파일명과 명령명은
예시이며, 특정 파일이나 도구가 없어도 절차는 정상적으로 축소된다.

package 작업에서 필요한 repo-wide instruction, 로그 위치, current-work, 공통 검증 capability의
초기 설정과 감사는 이 문서가 소유한다. package별 검증 명령·권한·외부 service가 실제로 사용
가능한지 재확인하는 per-package probe는 `package-log.md` Bootstrap이 소유한다.

## 절차

각 gate는 순서대로 수행하되, 비어 있거나 비해당인 capability 범주는 즉시 건너뛴다. 작은
프로젝트에서는 대부분의 gate가 축소된다.

1. **Scope와 mode** — bootstrap / audit / update·repair, project boundary, write scope,
   사용자 요구·금지사항을 확정한다.
2. **Capability Probe와 inventory** — 아래 capability 범주를 있으면 조사해 실제 mapping과
   evidence를 proposal evidence로 정리하고, 없거나 비해당이면 disposition에 따라 skip한다.
   승인 전에는 project integration owner에 쓰지 않는다.
3. **Disposition·optional feature 제안** — 각 concern을 상태별 disposition으로 판정하고,
   선택 기능은 opt-in gate로 제시한다. 결과를 Proposal ledger로 한 번에 모은다.
4. **승인 후 Apply** — 사용자가 일괄 승인하거나 예외를 지정한 최소 변경만 수행한다.
   승인된 실제 mapping과 선택한 설정만 project integration owner에 기록한다.
5. **Validate와 Report** — read path, current-work 모호성 처리, 활성화한 feature 동작,
   docs owner 정합과 검증 명령을 확인하고, 적용·보존·보류·잔여 위험을 보고한다.

Setup 작업 자체의 mode, probe evidence, disposition, proposal, 승인, 적용, 검증과 보류 항목도
log skill의 Base loop로 기록한다. 기존 project integration이 로그 위치와 current-work 선택 방식을
제공하면 그 절차로 setup 작업 로그를 선택한다.

Bootstrap에서 setup 작업 기록 위치가 아직 없으면, durable setup 로그 기록은 기록 위치 승인 전까지 보류한다.
이때 probe 결과는 transient proposal evidence로만 유지하고, 첫 Proposal ledger에 log location 또는
setup 작업 기록 위치를 포함한다. 기록 위치가 승인되면 setup 작업용 Base log를 만들거나 사용자가
지정한 기존 로그에 소급 기록한다.

## Mode

작업을 시작할 때 mode를 먼저 정한다.

- **bootstrap**: 프로젝트에 log integration이 없거나 처음 정할 때. 없음은 정상이며 필요한
  항목을 제안하고, 승인 후 적용할 수 있다.
- **audit**: 기존 integration을 portable 계약과 프로젝트 의도에 대조한다. Read-only이며 변경은
  proposal로만 올린다.
- **update·repair**: 확인된 drift나 사용자가 승인한 변경을 기존 integration에 반영한다.

선택 기능이나 특정 integration이 없다는 사실은 어느 mode에서도 그 자체로 drift가 아니다.
기존 계약이나 사용자 의도가 그것을 요구할 때만 drift다. Bootstrap과 update·repair는 사용자가
승인한 변경만 gate 4에서 적용한다.

## Capability Probe

프로젝트별 파일명이나 구조를 가정하지 않는다. 아래 범주는 있으면 조사해 proposal evidence로
정리하고, 없거나 비해당이면 disposition에 따라 skip한다. 승인 전에는 project integration
owner에 쓰지 않는다.

1. **Project boundary** — repo root, workspace, monorepo 범위, write scope, 사용자가 허용한
   변경 범위.
2. **Instruction·documentation authority** — root 지침(예: `AGENTS.md`, `CLAUDE.md`), scope별
   agent 지침, 문서 index·taxonomy·owner map, 사람용 진입점(예: `README`, `CONTRIBUTING`).
3. **Log location** — 로그 저장 위치, 기본 위치 사용 여부, 비기본 위치에서 `LOG_DIR`가 필요한지,
   로그 디렉터리의 지역 지침 존재 여부.
4. **Workflow·current-work topology** — workflow·runbook·development guide, plan/current-work
   체계, current-work command, session start hook, pointer나 anchor의 선택 방식.
5. **VCS·local-state** — VCS 유무, ignore 방식, local state 배치, commit하지 말아야 할 tool
   state 위치.
6. **Verification capability** — manifest, 기존 setup·검증 명령, CI·test·lint·docs validation.
   manifest는 독립 설치 대상이 아니라 setup·검증 명령을 찾는 입력이다.

Probe 결과는 approval 전까지 proposal evidence로만 정리한다. 각 결과에는 확인한 evidence,
현재 owner/path, 상태, 불확실성을 포함한다. 이 결과는 project integration 기록이 아니며, approval
전에는 project integration owner에 쓰지 않는다. 파일명은 범주의 구현 예시일 뿐이며, 특정 파일
부재만으로 integration 부재나 drift를 단정하지 않는다.

## Disposition

탐색 결과의 "없음"을 일률적으로 질문하지 않는다. 각 concern은 상태별로 처리한다.

| State | Action |
| --- | --- |
| exists and adequate | 보존한다. 필요하면 evidence만 기록한다. |
| exists but conflicts with contract or intent | amend/repair proposal로 올린다. |
| missing required integration | 사용자에게 확인하거나 최소 create proposal을 제시한다. |
| missing optional feature | 기본으로 만들지 않는다. 필요하면 opt-in proposal로 제시한다. |
| planned by user or project | 계획 방향을 먼저 확인하고 그에 맞춰 defer하거나 제안한다. |
| not applicable | 질문하지 않고 skip한다. |
| unknown or ambiguous | 근거, 불확실성, blocker와 후보를 보고하고 추측하지 않는다. |

판정 값은 `preserve`, `amend`, `create`, `skip`, `defer` 중 하나로 남긴다. 로그 위치나 log
workflow를 기록할 owner처럼 동작에 필요한 항목은 required integration일 수 있다. Split guard,
session hook, 자동 current-work command 같은 편의 기능은 optional feature다.

## Optional Features

선택 기능은 필수 설치가 아니라 명시적 opt-in gate로 제시한다.

- current-work 자동 선택 command
- session start hook
- 긴 로그 split guard
- 추가 validation command 연결 또는 문서화

CI 추가나 기존 workflow 의미 변경은 작은 편의 기능으로 취급하지 않는다. 필요한 경우 Proposal
ledger에서 별도 승인 항목으로 올린다.

### 긴 로그 split guard

Base의 의미 기반 Log Lifetime Boundary(`loop-rules.md`)는 길이와 무관하게 항상 적용된다. 새
행동·unit을 배치할 때마다 목적·완료 조건·재개 가능성으로 판정한다. 줄 수 threshold로 그 판정을
다시 하도록 촉발하는 split guard와 `.log-hints` 상태 관리만 선택적 project integration이다.
Guard를 끄는 것은 길이를 무시한다는 뜻이 아니라 길이 threshold 알림을 하지 않는다는 뜻이다.

상태는 셋으로 구분한다.

- **enabled** — soft/hard 값, `.log-hints` 상태 위치, VCS ignore 방식을 확정하고,
  실제 적용값을 project owner에 기록한다.
- **disabled** — split guard를 설치하지 않는다. `.log-hints/`나 ignore rule을 만들지 않는다.
- **undecided** — 결정하지 않았음을 남기고 필요할 때 다시 제안한다.

사용자가 판단을 위임하면 최소 integration에서는 disabled를 기본 제안한다. 활성화를 원하고 값을
지정하지 않으면 soft 600 / hard 1000을 추천한다. 활성 시 `.log-hints/`는 도구 상태이므로
commit하지 않고 프로젝트의 VCS·local-state 방식에 맞춰 제외한다. VCS가 없으면 ignore 처리는
skip한다.

## Proposal ledger

변경이 필요하면 concern별 판정을 한 번에 모아 제시하고, 사용자가 전체를 승인하거나 예외를
지정하게 한다. 항목마다 개별 대화를 만들지 않는다.

| Concern | 현재 owner/state | 제안 action | Optional? | 영향 파일 |
| --- | --- | --- | --- | --- |

각 proposal은 다음을 포함한다.

- 대상 capability
- 현재 evidence와 불확실성
- 제안 변경
- 변경할 owner 파일이나 project integration 위치
- optional 여부
- 검증 방법
- 보류하거나 되돌릴 조건

다음은 반드시 별도 승인을 받는다.

- 선택 기능 활성화
- hook·script·CI 추가
- 기존 workflow 의미 변경
- 새 durable owner 파일 생성
- 외부 도구 설치

## Apply

승인된 proposal만 적용한다. 실제 파일명, 명령, hook, ignore 방식과 문서 taxonomy는 승인 후에만
프로젝트 integration에 기록한다. Portable skill 문서에는 특정 프로젝트의 mapping을 고정하지
않는다.

적용 중 승인 범위를 넘는 변경이 필요하면 중단하고 새 proposal로 올린다. 사용자 승인 없이 root
지침, script 기본값, hook, CI, ignore rule, current-work selection 의미를 변경하지 않는다.

## Validate and Report

적용 후 승인된 범위에 맞춰 검증한다.

- log location이 존재하거나 생성 가능하다.
- 비기본 로그 위치에서 `LOG_DIR`가 필요한 경우 명령 예시가 맞다.
- agent instruction에서 log workflow와 project integration을 찾을 수 있다.
- current-work command나 hook이 있으면 후보를 하나로 좁히지 못하는 상태를 안전하게 보고한다.
- split guard가 enabled이면 threshold, hint state, ignore 방식이 정합하다.
- 검증 명령이 있으면 실행 가능하거나 실행 불가 이유를 보고한다.
- docs/workflow owner나 navigation을 건드렸으면 참조가 stale하지 않다.

보고에는 다음을 구분한다.

- 적용한 변경
- 보존한 기존 integration
- skip한 optional 항목
- 보류한 proposal
- 미해결 ambiguity와 blocker
- 사용자가 나중에 결정할 항목

## current-work integration 최소 계약

프로젝트가 current-work 선택 도구(command)나 session start hook을 두기로 했다면, 그 구현은
아래 계약을 만족해야 한다. 이 계약은 "어떤 로그가 현재 작업인지" 정하는 구조 규칙만 다루고,
의미 판단은 다루지 않는다.

- `open` status만으로 현재 작업을 추측하지 않는다.
- 사용자가 지정한 로그나 주제를 최우선으로 둔다.
- 프로젝트에 활성 plan 단계가 있으면 그 단계가 가리키는 로그를 anchor로 삼는다. anchor
  로그에 local `[>]`가 있으면 anchor를 선택한다. local `[>]`가 없고 unresolved `[↓]`가 하나면
  명시된 분리 작업 로그를 따라가며, 각 source에서도 같은 기준을 적용한다.
- anchor에 local `[>]`가 없고 unresolved `[↓]`가 여러 개거나 target이 깨졌으면 현재 작업을
  추측하지 않고 후보와 pointer를 보여 사용자에게 선택을 요청한다.
- 활성 plan 단계가 없으면, `open` 로그가 하나일 때만 그 로그를 자동 선택한다.
- `open` 로그가 여러 개면 후보와 각 local `[>]`, unresolved `[↓]` pointer를 보여주고 멈춰
  사용자가 고르게 한다.
- 선택한 로그는 agent가 `log check <파일>`(또는 동등한 구조 점검)으로 Work Items와 next pointer
  구조를 확인하고, 최신 entry는 본문에서 확인한 뒤 재개한다.
- hook이나 current-work command는 의미 판단, Work Item 완료·취소·이관, status 전환을 자동
  수행하지 않는다. 전체 `open` 로그를 자동으로 정합화하지도 않는다. 구조 신호만 제시하고,
  판단과 변경은 agent와 사용자가 한다.

## 예시

아래 skeleton은 새 프로젝트가 처음 도입할 수 있는 일반 형태다. 폴더명과 도구 이름은 예시일
뿐 강제가 아니다.

### 예시 A — 작은 작업: 로그 하나만 사용

```markdown
# logs/2026-01-10-checkout-bug.md

---

topic: Checkout 결제 실패 수정
description: Fixes the intermittent checkout failure on the payment step.
status: open

---

## Work Items

- [>] W1 실패 재현 케이스를 만들고 원인을 좁힌다
- [ ] W2 수정안을 적용한다
- [ ] W3 회귀 테스트를 추가한다

## Required Context

## 2026-01-10 · W1 · 조사 시작

- 증상: 결제 단계에서 간헐적으로 500이 발생한다.
- 현재 가설: 토큰 만료 타이밍 경쟁.
```

사용자가 이 로그를 현재 작업으로 지정하면, agent는 `log check logs/2026-01-10-checkout-bug.md`로
Work Items·next pointer 구조를 확인하고 본문 최신 entry를 본 뒤, `[>] W1`이 가리키는 재개
지점부터 이어 작업한다. 로그가 하나뿐이므로 plan이나 선택 도구는 필요 없다.

### 예시 B — 큰 작업: plan anchor에서 분리 작업 로그로 이동

가벼운 plan 문서로 단계 순서를 관리한다. 아래 `<project-plan-location>`은 프로젝트가 정하는
plan 위치를 가리키는 placeholder이고, plan 형식도 강제가 아니다.

```markdown
# <project-plan-location>/payment-hardening.md

## Stages

- [>] 결제 경로 안정화 -> `logs/2026-01-10-checkout-bug.md`
- [ ] 정산 리포트 정합성
```

활성 단계가 anchor 로그를 가리키고, anchor에 local `[>]` 없이 unresolved `[↓]` 하나가 있으면
그 target을 현재 분리 작업 로그로 따른다.

```markdown
# logs/2026-01-10-checkout-bug.md (anchor)

## Work Items

- [↓] W1 Apply the token-race result to the checkout flow. — detached: logs/2026-01-12-token-race.md — reason: checkout fix depends on token-race evidence
```

```markdown
# logs/2026-01-12-token-race.md (child)

---

topic: 토큰 만료 경쟁 조사
description: Investigates the token expiry race behind checkout failures.
status: open

---

## Work Items

- [>] W1 경쟁 구간을 로그로 좁힌다

## Required Context

### Return Target

- Log: `logs/2026-01-10-checkout-bug.md`
- Work Item: W1
- Consume when: token expiry race 원인을 확정하면 source W1이 결과를 소비한다.
- Context snapshot: checkout failure의 token expiry race 원인 범위만 조사한다.

### {Global}

- checkout failure 중 token expiry race 범위만 조사한다.

## 2026-01-12 · 분리 조사 시작

- Source W1의 완료 판정에 이 조사 결과가 필요해 분리 작업 로그로 시작했다.
- 원인을 확정하면 복귀 대상 W1이 결과를 소비해 checkout flow 수정을 이어간다.
```

current-work 선택은 활성 plan 단계의 anchor 로그에서 시작한다. anchor에 local `[>]`가 없고
unresolved `[↓]`가 하나이므로 `logs/2026-01-12-token-race.md`를 따라가 그 로그의 `[>] W1`을
현재 재개 지점으로 정한다. agent는 그 로그를 `log check`로 확인하고 재개한다.

### 예시 C — session start hook 흐름

current-work 자동 선택을 원할 때, session start hook을 아래 순서로 둘 수 있다. command 이름
`project-current-work`는 예시이며, 프로젝트가 자유롭게 정한다.

1. 프로젝트 root 지침(AGENTS.md, CLAUDE.md 등)을 읽는다.
2. root 지침이 current-work command(예: `project-current-work`)를 지정하면 실행한다.
3. command가 현재 로그 하나를 분명히 고르면, 그 로그를 `log check <파일>`로 확인하고 재개한다.
4. command가 후보를 하나로 좁히지 못하면 자동 선택하지 않고, 후보와 next pointer를 보여준 뒤
   사용자에게 어떤 로그로 진행할지 묻는다.

hook과 command는 위치를 가리키고 구조를 점검할 뿐, 완료·취소·이관이나 status 전환 같은 의미
판단은 하지 않는다.

## 제약

- 사용자 승인 없이 root 지침이나 script 기본값을 변경하지 않는다.
- starter workflow, 선택 도구, hook, split guard, validation command 연결은 사용자 승인 후에만
  프로젝트 integration으로 둔다.
- 이 skill의 portable 규칙과 프로젝트별 integration의 경계를 흐리지 않는다.
