---
name: log
description: 작업 로그를 생성·작성·기록·검색·점검하거나 기존 로그에서 작업을 재개·수정·완료·취소·이관·종료할 때 사용한다. Work Items, Required Context, next pointer, 복귀 pointer, handoff, 로그 작성, 로그 남기기, 로그 점검, 이전 작업 재개, 로그 스킬 개선, 로그 스킬 문제 진단을 요청하면 사용한다.
---

# 작업 로그

작업의 질문, 판단, 결정과 진행을 프로젝트의 로그 저장 위치에 주제별로 기록한다. 로그는
한 문제나 작업 주제가 끝날 때까지 이어 쓰며, 현재 문맥과 세션 간 handoff를 로그 본문에서
제공한다.

로그는 두 표면으로 이루어진다.

- History surface: 날짜 블록. append-only narrative다. 무엇이 있었고 왜 그렇게 판단했는지를
  남기며 과거 블록을 고치지 않는다.
- Current surface: `## Work Items`, `[>]` next pointer, `## Required Context`,
  복귀 pointer. 현재 재개 상태와 이 로그를 다룰 때 반드시 읽고 적용할 context를
  제자리에서 갱신한다.

이 skill은 portable한 로그 작성·재개·종료 규칙을 다룬다. 로그 저장 위치, 세션 시작, 현재
로그 선택 같은 프로젝트별 workflow는 프로젝트 integration이 이 skill을 확장해 정의한다.

## 핵심 불변

- `open` 상태만으로 현재 작업을 추측하지 않는다.
- 완료, 취소, 이관, 분리, 종료 여부는 agent가 본문 맥락과 사용자 의도를 보고 판단한다. 도구는
  구조·형식·검색만 돕고 의미 판단을 대신하지 않는다.
- History surface는 append-only이고 Current surface는 제자리 갱신이다. 계속 적용할 standing
  상태는 Current surface에 두고 옛 블록에 묻어두지 않는다. 같은 unit의 dated entry를 owning
  블록에 누적하는 것은 append-only 위반이 아니다.
- 기록이 결정, 범위, 조건, 읽어야 할 자료, 검증 기준을 바꾸면, 그 변경에 의존하는 Current
  surface를 같은 동작에서 함께 갱신한다.
- 프로젝트의 권위 있는 결과물, 장기 규칙, 구현 사실은 owner 문서가 소유한다. 로그가 대신
  소유하지 않는다.
- local actionable Work Item이 있으면 `[>]`는 로그당 하나의 재개 지점이다. Work Item은 `W1`, `W2`
  같은 명시 W-id를 가지며, 완료·취소·이관됐거나 분리로 복귀 소비 대기 상태가 된 W-id도 보존하고
  재사용하지 않는다.

## 작업 루프

로그 작업은 다음 루프로 돈다. 모든 단계를 매번 거치는 ceremony가 아니라, 해당 obligation이
생긴 단계만 발화한다.

### Enter

사용자 지정 로그나 프로젝트 진입 계약이 있으면 그 범위에서 시작한다. 대상이 하나로
정해지지 않으면 `open` 상태만으로 추측하지 않고 후보와 재개 지점을 보여 사용자 선택을 받는다.

로그를 다룰 때는 먼저 다음 범위를 읽는다.

- `## Work Items`
- `## Required Context`의 `{Global}`
- 선택한 Work Item이 있으면 `## Required Context` 중 대상 W id가 포함된 heading
- 재개 대상의 owning block과 그 최신 entry. `[>] Wn`이 있으면 그 W-id의 owning block을 찾고,
  없으면 가장 최근 entry가 속한 block을 읽는다. lookup 규칙은 `references/loop-rules.md#date-blocks`.

이 범위는 출발점이다. 블록은 open date 순이라 파일의 마지막 블록이 최신 활동이 아닐 수 있다.
현재 질문, 판단, 남은 작업을 복원하기에 부족하면 관련 과거 블록과 entry를 역추적한다. 파일
구조 규칙은 `references/loop-rules.md#log-file-shape`.

### Act

실제 조사, 수정, 토론, 구현을 수행한다. 로그 skill은 작업 수행 방법을 소유하지 않는다.

### Record

의미 있는 checkpoint를 owning block의 entry 또는 새 블록으로 증류한다. 질문과 답마다 즉시
기록하지 않는다. 블록/entry 확장과 새 블록 판정은 `references/loop-rules.md#date-blocks`,
기록할 내용·생략 기준·기록 품질·외부 출처는 `references/loop-rules.md#record`.

### Reconcile

이번 기록이 Current surface가 의존하는 결정, 범위, 조건, 읽어야 할 자료, 검증 기준을
바꿨는지 먼저 판정한다. 바뀌지 않았으면 표면을 건드리지 않고, 바뀌었으면 Work Items,
`[>]`, Required Context와 관련 pointer를 같은 동작 안에서 함께 갱신한다. Reconcile gate와
표면 갱신 규칙은 `references/loop-rules.md#reconcile`.

### Cross-Log / Lifetime Transition

다른 로그·owner와 연결되거나 로그 전체 수명이 바뀌면 순서 있는 판정 기준으로 나눈다. 로그
전체를 다른 로그가 대체하면 `superseded`, source Work Item이 결과를 소비하면 detach, source가
소비하지 않고 소유권을 넘기면 transfer, source Work Item이 없으면 independent follow-up이다.
분리 작업 로그/transfer/independent follow-up 판정과 정합성 검사는
`references/loop-rules.md#cross-log--lifetime-transitions`.

### Closeout

작업을 마치기 전 Current surface 불변(`[>]` 단일성 등)과 Reconcile·cross-log/lifetime
transition 누락을 전이 발생 여부와 무관하게 확인하고, `decided`/`superseded` 가능 여부와 권위
결과의 owner 반영 누수를 확인한다. status 전이와 종료 점검은
`references/loop-rules.md#closeout--status`.

## 도구

`scripts/log`는 로그 검색, 날짜 블록 append, Work Items 전이, status guard를 돕는 보조
도구다. 도구는 형식과 원자적 변경만 처리하고 완료, 취소, 이관, 분리, 종료 같은 의미 판단은
agent와 사용자가 한다.

## 참조

작업 루프의 각 단계가 가리키는 `references/loop-rules.md`가 핵심 규칙을 소유한다. 그 밖에:

- 새 프로젝트에 로그 저장 위치나 workflow가 없거나, 로그 workflow 도입 시 긴 로그 split guard
  임계값을 설정해야 할 때: `references/project-setup.md`
- 이 skill, reference, 도구 동작 변경을 검토할 때: `references/maintenance.md`
- 사용자 검토용 예시: `references/example.md`
