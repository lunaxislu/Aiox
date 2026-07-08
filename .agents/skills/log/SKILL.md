---
name: log
description: 작업 로그를 생성·작성·기록·검색·점검하거나 기존 로그에서 작업을 재개·수정·완료·취소·이관·종료할 때 사용한다. Work Items, Required Context, next pointer, 복귀 pointer, handoff, 로그 작성, 로그 남기기, 로그 점검, 이전 작업 재개, 로그 스킬 개선, 로그 스킬 문제 진단을 요청하면 사용한다.
---

# 작업 로그

작업의 질문, 판단, 결정과 진행을 프로젝트의 로그 저장 위치에 주제별로 기록한다. 로그는
한 문제나 작업 주제가 끝날 때까지 이어 쓰며, 현재 문맥과 세션 간 handoff를 로그 본문에서
제공한다.

로그는 세 표면을 분리해 유지한다. 로그 블록(History surface)은 무엇이 있었고 왜 그렇게
판단했는지를 보존한다. Work Items·`[>]`·복귀 pointer(Work state)는 작업 선택·재개·handoff
상태를, Required Context는 이 로그를 다룰 때 적용할 scope 기반 standing frame을 소유한다.
Record가 Work state나 Required Context를 바꾸면 Reconcile에서 같은 동작 안에 맞춘다.

이 skill은 portable한 로그 작성·재개·종료 규칙을 다룬다. 로그 저장 위치, 세션 시작, 현재
로그 선택 같은 프로젝트별 workflow는 프로젝트 integration이 이 skill을 확장해 정의한다.

## 참조

이 절은 `## 진입`과 작업 루프가 직접 라우팅하지 않는 보조 reference만 나열한다.
진입 흐름은 `## 진입`, Base 상세 규칙은 `references/loop-rules.md`를 따른다.

- 로그 모델의 목적, History surface / Work state / Required Context 분리, Work Items, Return
  Target과 script boundary의 판단 원리를 복원할 때:
  `references/design-principles.md`
- Base Log marker 읽기, Work Item 전이, block/entry 구분, Required Context Override와 핵심
  `scripts/log` 사용 사례를 확인할 때. 실제 규칙 정본은 `references/loop-rules.md`에 둔다:
  `references/base-log-examples.md`
- 진입 흐름의 그림 요약, Scenario별 read path와 사용자 설명용 locator가 필요할 때:
  `references/quick-flow.md`

## 핵심 불변

- `open` 상태만으로 현재 작업을 추측하지 않는다.
- 완료, 취소, 이관, 분리, 종료 여부는 agent가 본문 맥락과 사용자 의도를 근거로 판단한다.
- 도구 출력은 구조·형식·검색 확인에만 사용한다. 완료·취소·이관·분리·종료 같은 의미 판단을
  도구에 맡기지 않는다.
- 과거 로그 블록과 entry를 의미상 고쳐 쓰지 않는다. 정정, 반론, 대체나 결론 변경도 새 기록으로
  남긴다.
- 작업 선택·재개 지점이나 다른 로그와의 복귀·handoff 관계가 바뀌면 Work Items, `[>]`, 복귀
  pointer를 같은 동작에서 갱신한다.
- standing 기준·제약·자료·검증 조건은 적용 범위가 그 기준이 속한 owning block 안에 닫히면 block
  entry로 두고, block 밖(다른 unit·로그 전체)에도 적용되면 Required Context로 올린다. 승격할 때
  근거·경위는 block에 남기고 Required Context에는 적용 기준과 scope만 둔다.
- 프로젝트의 권위 있는 결과물, 장기 규칙, 구현 사실은 owner 문서가 소유한다. 로그가 대신
  소유하지 않는다.
- local actionable Work Item이 있으면 `[>]`는 로그당 하나의 재개 지점이다. Work Item은 `W1`, `W2`
  같은 명시 W-id를 가지며, 완료·취소·이관됐거나 분리로 복귀 소비 대기 상태가 된 W-id도 보존하고
  재사용하지 않는다.

## 진입

log skill이 trigger되면 아래 순서대로 작업 종류, 대상 후보, 기록 계약과 재개 정보를 확정한 뒤
`## 작업 루프`로 이동한다. 이 절은 위에서 아래로 실행하는 entry/router이며, 상세 판정과 표면
규칙은 지목한 owner가 소유한다.

### 작업 종류 dispatch

1. repo/project integration, 로그 위치, current-work, setup/audit 작업이면
   `references/project-setup.md`로 라우팅한다.
2. log skill 자체, reference, `scripts/log`, 기록 규칙, log workflow 유지보수 작업이면
   `references/maintenance.md`로 라우팅한다.
3. 그 밖의 일반 작업·로그 lifecycle 작업은 아래 단계로 계속 간다.

setup/maintenance도 해당 작업을 로그로 기록해야 하면, 해당 owner의 분류·검토를 수행한 뒤 이
spine으로 돌아와 대상 후보, 기록 계약과 작업 루프를 확정한다.

### 대상 후보 확정

1. 사용자가 특정 로그나 경로를 지정했으면 그 대상을 우선 후보로 둔다.
2. 사용자가 주제, 범위, Work Item, parent/child 관계를 지정했으면 그 조건으로 후보를 좁힌다.
3. 지정이 없으면 project integration의 current-work 절차를 따른다.
4. 후보가 하나로 좁혀지지 않으면 `open` 로그 수나 파일 순서만으로 추측하지 않고, 후보와 각
   재개 지점을 보여 사용자 선택을 받는다.

이 단계는 후보 확정만 수행한다. 새 로그를 만들지, 기존 로그를 재개할지, 기존 로그에 새 block을
열지는 다음 gate에서 판정한다.

### Route / Contract Gate

아래 ordered discriminator로 기록 계약을 확정한다. 모든 로그는 Base 계약을 쓰며, package 조건이
확정된 경우에만 Package Extension을 overlay로 더한다. Package Extension은 Base loop를 대체하지
않는다.

1. 사용자가 새 로그·새 작업을 명시했거나 대상 후보가 없는가?
   - Yes: 새 unit 후보로 두고 4로 간다.
   - No: 기존 후보를 대상으로 2로 간다.
2. 기존 후보가 현재 작업을 담는 같은 로그 수명인가?
   - `references/loop-rules.md#log-lifetime-boundary`로 수명 안/밖만 판정한다.
   - 후보 수명 안이면 `references/loop-rules.md#record-placement-loop`로 기존 block 재개 또는
     기존 로그 안의 새 block 생성을 판정한 뒤 3으로 간다.
   - 후보 수명 밖이면 `references/loop-rules.md#cross-log--lifetime-transitions`로 source 소비 관계와
     independent/detach/transfer 후보를 판정한 뒤 4로 간다.
3. 수명 안의 기존 후보가 package skeleton을 가진 로그인가?
   - Yes: existing package로 보고 bootstrap을 중복하지 않는다.
   - No: existing Base로 두고 5로 간다. 단, package signal이 있으면 먼저 별도 재개점이 필요한지
     2의 수명 판정을 재검토한다. 재검토 결과 수명 밖이면 2의 수명 밖 분기로 돌아가 source 관계와
     detach/transfer 후보를 판정한다.
4. 새 로그, 기존 로그의 새 block, 또는 수명 밖 전이 후보에 package signal이 있는가?
   - Yes: `references/package-log.md#activation-and-entry-routing`으로 activation을 판정한다.
     확정되면 앞에서 판정한 source 소비 관계에 맞춰 controlling package log를 직접 시작하거나
     detach/transfer 관계로 연결한다. activation 부정이면 Base로 남는다.
   - No: 앞에서 판정한 Base log, Base block 또는 cross-log 관계로 진행한다.
5. 기존 Base를 재개했거나 진행 중 package signal을 발견했는가?
   - Yes: in-place upgrade하지 않는다. `references/package-log.md#activation-and-entry-routing`으로
     detach(`[↓]`) / transfer(`[→]`) / not-package를 판정한다. detach/transfer mechanics는
     `references/loop-rules.md#cross-log--lifetime-transitions`가 소유한다. 대상이 바뀌면
     `대상 후보 확정`으로 재진입한다. not-package가 진입 판정에서 확정되면 기존 Base로 남는다.
   - No: 확정한 Base 또는 existing package 계약으로 계속한다.

이미 controlling package log가 생성된 뒤 discovery outcome이 not-package로 반환되는 경우는 진입
판정의 Base 유지와 다르다. package 표면을 삭제하지 않고 task/result/artifact disposition과 parent
반환을 `references/package-log.md#activation-and-entry-routing` 및
`references/package-log.md#package-reconcile`에 따라 닫는다.

### 재개 정보 복원 또는 Bootstrap

- **existing Base**: `## Work Items`를 읽어 local actionable Work Item과 `[>]`를 확인한다.
  `## Required Context`의 `Return Target`, `{Global}`, 선택 W-scope를 적용한 뒤 재개 block 전체를
  읽는다. 이 범위로 현재 질문, 판단, 남은 작업이 복원되지 않으면 관련 과거 block을 역추적한다.
- **existing log + new block**: 기존 로그의 Work state와 Required Context를 먼저 확인한다. 이어
  `references/loop-rules.md#record-placement-loop`가 정한 새 owning block을 열고, 기존 `[>]`나
  Required Context와 충돌하는 새 Work state가 생기면 같은 동작에서 Reconcile한다.
- **existing Package**: 먼저 existing Base 절차로 Work state와 Required Context를 복원한다. 이어
  `references/package-log.md#state-ownership-and-task-contract`와 package-log 내부 spine으로
  Package surfaces, Task Index와 task record pointer를 복원한다.
- **new Base**: Base log를 생성하고 Work Items, Required Context와 첫 History block을 현재 작업
  수명에 맞게 둔다. 파일 구조와 block 규칙은 `references/loop-rules.md`가 소유한다.
- **new Package**: activation 통과 뒤 package bootstrap을 수행한다. controlling package의
  discovery, synthesis, contract review는 execution 전 bootstrap/contract 세팅 국면이며, package
  실행으로 보지 않는다.

delegated scout/executor는 자기 task record 또는 Full child lifecycle 안에서 독립 mini-loop를 돈다.
accepted package state와 최종 disposition은 controlling package log가 소유한다.

확정한 상태와 계약으로 아래 `## 작업 루프`를 수행한다. Base 세부 규칙은
`references/loop-rules.md`, Package 세부 규칙은 `references/package-log.md`를 순서대로 읽는다.

## 작업 루프

로그 작업은 다음 루프로 돈다. 매번 모든 단계를 전부 이행하지 않고, 현재 작업에서 필요하다고
판단되는 단계만 확인하고 수행한다.

로그 구조, Work state나 Required Context를 생성·수정·점검해야 하면 먼저 `## 도구`의 도구 사용·수동
편집 경계를 확인한다.

Package Extension은 Base loop를 대체하지 않고 overlay로 붙는다. package 조건이 활성인 경우에도
Base의 Work Items, Required Context, Record, Reconcile, cross-log/lifetime, Closeout 절차를
유지하고 package 표면·Task Index·task record 계약을 같은 loop에 더한다.

작업 중 로그 수명, 대상 로그, Base/package 기록 계약이나 source/target 관계가 바뀌는 근거가
생기면 현재 loop를 그대로 밀지 않고 `## 진입`의 Route / Contract Gate로 돌아가 다시 확정한다.

### Act

실제 조사, 수정, 토론, 구현을 수행한다. 작업 방법과 검증 기준은 작업 대상의 owner 계약과
프로젝트 지침을 따르고, 로그 skill은 그 과정에서 생긴 판단과 상태의 기록·갱신만 소유한다.

Package overlay에서는 execution phase만 controlling main Act로 본다. Discovery, synthesis와
contract review anchor는 Act 진입 전 bootstrap/contract gate이며, execution Task Brief와 allowed
write-set이 확정된 뒤에 실행한다.

### Record

기록은 현재 세션의 기억이 사라진 뒤에도 다른 agent가 판단, 근거, 제약, 현재 상태와 남은 일을
복원할 수 있게 남긴다. 의미 있는 checkpoint를 로그에 증류하며, 질문과 답마다 즉시 기록하지 않는다.

Package overlay에서는 controlling log와 task record의 기록 분담을 지킨다. task trace와 candidate
result는 task record가 소유하고, controlling log는 accepted package state, result disposition,
contract 변경과 package-level digest를 소유한다.

#### 기록 위치

같은 unit의 후속 판단, 정정, 반론, 대체나 결론 변경이면 기존 로그 블록에 새 entry로 append한다.
새 unit이 열리거나, 기존 블록 아래에 두면 오해할 정도로 주제·범위·목적·수명이 바뀌면 새 로그
블록을 만든다. 세부 판정은 `references/loop-rules.md#log-blocks`를 따른다.

#### 기록할 내용

무엇이 바뀌었고 왜 그렇게 판단했는지, 현재 유효한 상태와 남은 일을 남긴다. 반복 설명,
대화 덤프, 판단에 쓰지 않은 검색 과정은 제외한다. 세부 기준은 `references/loop-rules.md#record`를
따른다.

### Reconcile

Record의 Reconcile 진입 gate를 통과하면 영향받는 Work Items, `[>]`, Required Context와 관련
pointer를 같은 동작 안에서 함께 갱신한다. Reconcile loop는
`references/loop-rules.md#reconcile`을 따른다.

Package overlay에서는 package surfaces, Task Index, result disposition, verification, closeout
readiness를 `references/package-log.md#package-reconcile`에 따라 함께 맞춘다. result review anchor는
accepted state 승격과 Reconcile 전에 통과해야 하는 gate다.

### Cross-Log / Lifetime Transitions

사용자 지시나 작업 중 발견으로 새 행동·unit의 별도 로그 배치 또는 로그 전체 수명 대체 후보가
생기면 이유·근거와 예상 전이 관계를 먼저 짧게 보고한다. 새 행동·unit이 현재 로그 수명에 속하는지는
`references/loop-rules.md#log-lifetime-boundary`에서 판정하고, 다른 로그와 연결되거나 로그 전체
수명이 바뀌면 이 단계에서 판정하고 적용한다. 같은 로그 안의 Work Item 전이는 Reconcile이 소유한다.

현재 로그 수명 경계나 결과 소비 관계가 불명확하거나, `superseded` 또는 history를 옮기는 migration
detach처럼 파괴적 변경이면 적용 전에 사용자 확인을 받는다.

`superseded`, detach, transfer, independent follow-up의 세부 판정·적용과 정합성 검사는
`references/loop-rules.md#cross-log--lifetime-transitions`를 따른다.

Package overlay에서는 package membership, Full child, parent/source 관계와 inbound pointer 정합을
함께 확인한다. activation, detach, transfer, not-package 판정 자체는 `## 진입`의 Route / Contract
Gate가 소유한다.

### Closeout

작업이나 세션을 마치기 전에 마지막으로 현재 상태를 점검한다. 새 전이나 Reconcile 기준을
정의하지 않고, 누락된 처리와 status 전환 가능성만 확인한다.

- Work state 불변(`[>]` 단일성 등)과 Required Context 정합
- 마지막 의미 변화에 대한 Reconcile 진입 gate 적용 누락
- 처리되지 않은 cross-log/lifetime transition
- 권위 있는 결과의 owner 반영 누락
- `decided`/`superseded` 전환 가능성

Package Extension이 활성인 로그는 `references/package-log.md#package-closeout`의 Package Closeout
gate를 먼저 통과한 뒤 Base status 전이를 판단한다.

status 전이와 종료 점검은 `references/loop-rules.md#closeout--status`를 따른다.

## 도구

`scripts/log`는 로그 생성, frontmatter 수정, block/entry 추가, Work Items와 Required Context
변환·삭제, 검색, 구조 점검과 status guard를 돕는 보조 도구다. 도구는 형식과 원자적 변경만 처리하고
완료, 취소, 이관, 분리, 종료 같은 의미 판단은 agent와 사용자가 한다.

도구가 지원하는 로그 구조 변경은 도구로 수행한다. 지원하지 않는 변경은 사용자가 수동 편집을
지시한 경우에만 수동으로 편집하고, 사용자 지시 없이 수동으로 편집한 구조 변경은 작업 후 변경
범위와 이유를 보고한다.

명령 syntax는 `scripts/log --help`로 확인한다.

`Return Target`은 `log new`와 `log detach` 생성 표면에서만 만든다. 이후 consume 조건이나 snapshot을
바꿔야 하면 도구로 자동 전이하지 않고 사용자가 확인한 뒤 수동 편집한다.

`[↓]` Work Item은 child 결과를 source가 소비한 뒤 `log item set --status completed`로 `[x]` 처리할
수 있다. 이때 detached target과 reason tail은 보존한다. `[↓]`의 취소·이관·남은 행동 재구성은
도구가 자동 판단하지 않으므로 사용자가 확인한 뒤 수동 편집한다.
