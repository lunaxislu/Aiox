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

## 작업 루프

로그 작업은 다음 루프로 돈다. 매번 모든 단계를 전부 이행하지 않고, 현재 작업에서 필요하다고
판단되는 단계만 확인하고 수행한다.

### Enter

1. 사용자가 특정 로그를 지정했으면 그 로그에서 시작한다.
2. 사용자가 범위나 주제를 지정했으면 그 범위를 우선해 대상 후보를 좁힌다.
3. 지정이 없으면 프로젝트 진입 계약이 정한 선택 절차를 따른다.
4. 위 절차가 현재 대상을 하나로 좁히면 그 로그에서 시작한다.
5. 하나로 정해지지 않으면 `open` 로그 수나 파일 순서만으로 추측하지 않고, 후보와 재개 지점을
   보여 사용자 선택을 받는다.

로그를 다룰 때는 다음 순서로 읽는다.

1. `## Work Items`를 읽어 local actionable Work Item과 `[>]` 재개 지점이 있는지 확인한다.
2. `## Required Context`의 `{Global}`이 있으면 읽고 적용한다.
3. 선택한 Work Item이나 `[>] Wn`이 있으면, `## Required Context`에서 그 W id가 포함된 heading이
   있는지 확인하고 있으면 읽는다.
4. 재개 대상 로그 블록 전체를 읽는다.
   - `[>] Wn`이 있으면 그 W-id의 로그 블록을 찾는다.
   - 사용자가 특정 Work Item을 선택했으면 그 W-id의 로그 블록을 찾는다.
   - Work Item 재개 대상이 없으면 최신 기록 entry가 속한 로그 블록을 읽는다.
   - W-id, 최신 기록 entry와 로그 블록 lookup 규칙은 `references/loop-rules.md#log-blocks`를 따른다.
5. 위 범위만으로 현재 질문, 판단, 남은 작업이 복원되지 않으면 관련 과거 로그 블록을 역추적한다.
   파일 구조 규칙은 `references/loop-rules.md#log-file-shape`를 따른다.

### Act

실제 조사, 수정, 토론, 구현을 수행한다. 작업 방법과 검증 기준은 작업 대상의 owner 계약과
프로젝트 지침을 따르고, 로그 skill은 그 과정에서 생긴 판단과 상태의 기록·갱신만 소유한다.

### Record

기록은 현재 세션의 기억이 사라진 뒤에도 다른 agent가 판단, 근거, 제약, 현재 상태와 남은 일을
복원할 수 있게 남긴다. 의미 있는 checkpoint를 로그에 증류하며, 질문과 답마다 즉시 기록하지 않는다.

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

### Cross-Log / Lifetime Transitions

사용자 지시나 작업 중 발견으로 새 행동·unit의 별도 로그 배치 또는 로그 전체 수명 대체 후보가
생기면 이유·근거와 예상 전이 관계를 먼저 짧게 보고한다. 새 행동·unit이 현재 로그 수명에 속하는지는
`references/loop-rules.md#log-lifetime-boundary`에서 판정하고, 다른 로그와 연결되거나 로그 전체
수명이 바뀌면 이 단계에서 판정하고 적용한다. 같은 로그 안의 Work Item 전이는 Reconcile이 소유한다.

현재 로그 수명 경계나 결과 소비 관계가 불명확하거나, `superseded` 또는 history를 옮기는 migration
detach처럼 파괴적 변경이면 적용 전에 사용자 확인을 받는다.

`superseded`, detach, transfer, independent follow-up의 세부 판정·적용과 정합성 검사는
`references/loop-rules.md#cross-log--lifetime-transitions`를 따른다.

### Closeout

작업이나 세션을 마치기 전에 마지막으로 현재 상태를 점검한다. 새 전이나 Reconcile 기준을
정의하지 않고, 누락된 처리와 status 전환 가능성만 확인한다.

- Work state 불변(`[>]` 단일성 등)과 Required Context 정합
- 마지막 의미 변화에 대한 Reconcile 진입 gate 적용 누락
- 처리되지 않은 cross-log/lifetime transition
- 권위 있는 결과의 owner 반영 누락
- `decided`/`superseded` 전환 가능성

status 전이와 종료 점검은 `references/loop-rules.md#closeout--status`를 따른다.

## 도구

`scripts/log`는 로그 검색, 로그 블록 append, Work Items 전이, status guard를 돕는 보조
도구다. 도구는 형식과 원자적 변경만 처리하고 완료, 취소, 이관, 분리, 종료 같은 의미 판단은
agent와 사용자가 한다.

## 참조

작업 루프의 각 단계가 가리키는 `references/loop-rules.md`가 핵심 규칙을 소유한다. 그 밖에:

- 새 프로젝트에 로그 저장 위치나 workflow가 없거나, 로그 workflow 도입 시 긴 로그 split guard
  임계값을 설정해야 할 때: `references/project-setup.md`
- 이 skill, reference, 도구 동작 변경을 검토할 때: `references/maintenance.md`
- 사용자 검토용 예시: `references/example.md`
