# 로그 설계 원리

이 문서는 log skill의 현재 구조가 어떤 문제를 풀기 위해 생겼는지 설명한다. 실행 규칙의 정본은
`../SKILL.md`와 `loop-rules.md`가 소유하며, 이 문서는 그 규칙을 적용할 때의 판단 원리만 보조한다.

## 로그의 목적

로그는 대화 덤프가 아니라 세션 간 판단 복원 장치다. 따라서 질문과 답변을 모두 옮기는 것이
목표가 아니다. 다음 세션의 agent가 무엇이 결정됐고, 왜 그렇게 판단했으며, 현재 유효한 상태와
남은 작업이 무엇인지 복원할 수 있을 만큼만 증류한다.

로그가 보존해야 하는 것은 raw conversation이 아니라 판단에 영향을 준 사실, 근거, 제약, 결정,
검증 결과와 남은 행동이다. 단순 진행 발언, 반복 설명, 판단에 쓰지 않은 검색 과정, 이미 다른
owner 문서가 소유하는 결과물은 로그 본문에 누적하지 않는다.

## 세 표면

로그는 세 표면을 분리한다.

- History surface: 로그 블록과 entry. 무엇이 있었고 왜 그렇게 판단했는지를 append-only history로
  보존한다.
- Work state: `## Work Items`, marker, `[>]`, detach/transfer/return 관계. 지금 어디서 재개하고
  무엇이 완료·취소·이관·분리됐는지를 나타내는 가변 상태다.
- Required Context: 이 로그를 다룰 때 반복 적용해야 하는 기준·제약·자료·검증 조건을 scope별로
  소유하는 standing frame이다.

History surface는 경위와 이유를 보존하고, Work state와 Required Context는 현재 재개 상태를
보존한다. 과거 entry를 고쳐 현재 상태처럼 만들지 않고, 현재 상태가 바뀌면 Work state나 Required
Context를 같은 동작에서 맞춘다.

## Work Items

Work Items는 단순 todo 목록이 아니라 재개 가능한 작업 상태다. 한 줄은 "언젠가 할 일"보다 더
구체적으로, 어떤 행동이 아직 local하게 actionable한지, 어떤 행동이 완료·취소·이관·분리됐는지,
그리고 다음 세션이 어느 W-id에서 시작해야 하는지를 나타낸다.

W-id는 작업 상태의 안정 식별자다. 완료·취소·이관·분리된 id도 history와 참조의 안정성을 위해
보존하고 재사용하지 않는다. 기존 W의 identity가 유지되면 수정하고, 별도 완료 판단이나 별도
수명이 생기면 새 W 또는 별도 로그로 분리한다.

`[>]`는 "현재 선택한 항목"이라는 UI 선택 신호가 아니라 local resume pointer다. local actionable
Work Item이 있을 때 로그당 하나만 두며, 해당 로그를 다시 열었을 때 먼저 재개할 지점을 가리킨다.
다른 로그의 결과를 기다리는 source에는 억지로 `[>]`를 남기지 않는다.

## Required Context

Required Context는 반복 토큰을 줄이는 standing frame이다. 매번 과거 블록을 다시 뒤져야 하는
공통 기준, 제약, required-read, 검증 조건을 가장 작은 유효 scope 아래에 둔다.

Required Context에는 history 요약이나 근거 서사를 넣지 않는다. 근거와 경위는 History surface가
소유하고, Required Context는 지금 적용할 기준과 scope만 소유한다. 어떤 기준이 특정 W에만
적용되면 `{Wn}` scope로 좁히고, 로그 전체에 적용되면 `{Global}`에 둔다.

이 분리는 "중요한 말을 과거 날짜 블록에 묻어 둔 채 다음 세션이 놓치는" 문제를 줄이기 위한
것이다. 기준이 owning block 밖에서도 유효해지는 순간, Record만으로 끝내지 않고 Reconcile에서
Required Context로 승격하거나 기존 context를 갱신한다.

## Return Target

Return Target은 child가 parent 전체를 다시 읽지 않게 하는 복귀 pointer다. 분리 작업 로그는
`### Return Target`만으로 source 로그, source Work Item, consume 조건과 context snapshot을
복원할 수 있어야 한다.

parent는 child의 상세 history를 복사하지 않는다. parent는 어떤 source W가 child 결과를 기다리는지,
왜 분리됐는지, 결과를 언제 소비해야 하는지만 소유한다. child는 자체 Work Items와 Required
Context로 독립 재개 가능해야 하며, source를 매번 통독해야만 진행되는 구조가 되면 안 된다.

Transfer와 detach는 다르다. source가 결과를 기다리지 않으면 transfer이고, source W의 완료 판단이
child 결과 소비에 의존하면 detach와 Return Target을 쓴다.

## Record And Reconcile

Record는 의미 있는 checkpoint를 History surface에 증류하는 동작이다. Reconcile은 그 checkpoint가
Work state나 Required Context의 dependency를 바꿨는지 확인하고, 영향받은 표면을 같은 동작에서
갱신하는 동작이다.

따라서 "기록했다"는 것만으로 충분하지 않다. 기록한 내용이 작업 범위, 완료 조건, next pointer,
standing 기준, return 관계를 바꿨다면 관련 표면을 함께 맞춘다. 하나만 고치고 나머지를 후속
점검으로 미루면 다음 세션은 stale한 상태에서 시작한다.

이 원리는 새 용어를 추가하려는 것이 아니다. `Record`, `Reconcile`, `Cross-Log / Lifetime
Transitions`, `Closeout`의 기존 루프를 언제 호출해야 하는지 설명하는 판단 기준이다.

## Script Boundary

`scripts/log`는 의미 판단 도구가 아니라 형식과 guard 도구다. 스크립트는 로그 골격 생성, marker
변환, 원자적 편집, 구조 점검, status guard, long-log hint 같은 기계적으로 확인 가능한 일을
돕는다.

완료·취소·이관·detach·supersede·closeout 같은 판단은 agent와 사용자가 한다. 스크립트가 할 수
있는 것은 "미완료 Work Item이 있는데 decided로 바꾸려 한다", "Return Target section이 없다",
"복수 `[>]`가 있다" 같은 구조 신호를 막거나 알려 주는 것이다.

도구 출력도 같은 경계로 해석한다. 출력이 구조 문제를 보여 줄 수는 있지만, 어떤 작업이 의미상
완료됐는지나 어떤 기준을 Required Context로 승격해야 하는지는 본문 맥락과 owner 관계를 읽고
판단한다.

## Long-Log Hint

long-log hint는 자동 split 명령이 아니라 수명 경계 검토 신호다. 로그가 길어졌다는 사실은
분리를 검토하게 만들 수 있지만, 길이만으로 split이 정당화되지는 않는다.

분리 여부는 별도 목적, 별도 완료 조건, 별도 재개 지점, parent가 결과를 소비해야 하는지에 따라
판단한다. 하나의 수명으로 닫히는 작업이면 긴 로그라도 유지할 수 있고, 짧아도 별도 수명을 갖는
작업이면 child, transfer 또는 independent follow-up으로 분리할 수 있다.

long-log hint가 뜨면 먼저 수명 경계를 묻는다. 현재 로그의 Work state와 Required Context로 재개와
closeout이 가능한지, 별도 로그가 생기면 Return Target이나 transfer 관계가 필요한지, 단순히
history를 옮기는 것이 provenance를 흐리지 않는지 확인한다.
