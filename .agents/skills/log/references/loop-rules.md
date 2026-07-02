# 로그 작업 규칙

이 문서는 `../SKILL.md`의 작업 루프가 가리키는 세부 규칙을 소유한다. 로그 선택과 최초 읽기
계약은 `../SKILL.md` Enter가 소유하고, 파일 구조·기록·Reconcile·cross-log/lifetime
transition·Closeout의 세부 판정은 아래 절이 소유한다.

## Log File Shape

### Frontmatter

frontmatter는 구조 소비자가 읽는 최소 index다. 다음 세 필드만 사용한다.

- `topic`: 로그의 짧은 제목
- `description`: 본문을 열지 않고 필요한 로그인지 판별하는 안정적인 설명
- `status`: 로그의 수명인 `open`, `decided`, `superseded`

`description`에는 현재 단계, handoff, next pointer를 넣지 않는다. 현재 진행 상태는 본문의 최신
기록과 Work Items가 소유한다.

### Work Surface

Work Surface는 `## Work Items`의 marker/pointer, `[>]` next pointer,
`## Required Context`, 복귀 pointer로 이루어지는 Current surface다.

- `## Work Items`는 항상 둔다. 실행 항목이 없는 판단·조사·토론형 로그도 섹션은 두되 비워 둘 수 있다.
- `## Required Context`는 기본으로 비워 두고, 이 로그를 다룰 때 반드시 읽고 적용해야 할
  standing context가 생기면 채운다. 읽어야 할 자료, scope/source 기준, 제약, 검증 기준,
  handoff 조건처럼 날짜 블록에만 두면 다음 세션이 놓칠 내용을 둔다.

Work Item line의 canonical form은 `- [marker] Wn <행동>`이다. `Wn:`처럼 id 뒤에 colon을 붙이지
않는다. id는 완료·취소·이관됐거나 detach로 복귀 소비 대기 상태가 된 경우에도 보존하고
재사용하지 않는다.

**Marker**

| marker | 의미                                                                  | 복귀 소비 의무                          |
| ------ | --------------------------------------------------------------------- | --------------------------------------- |
| `[ ]`  | open. 남아 있는 Work Item                                             | —                                       |
| `[>]`  | active. local actionable Work Item이 있을 때 재개 지점. 로그당 하나만 | —                                       |
| `[x]`  | completed. 성공적으로 완료됨                                          | —                                       |
| `[-]`  | cancelled. 더 이상 수행하지 않기로 함                                 | —                                       |
| `[→]`  | transferred. 다른 로그·owner가 이어받음                               | 없음                                    |
| `[↓]`  | detached. 분리 작업 로그로 위임함                                     | 분리 작업 로그 완료 후 복귀 대상이 소비 |

`[x]`는 성공 완료만 뜻한다. 취소·이관·detach는 각각 `[-]`, `[→]`, `[↓]`로 구분하고 줄 끝에
`— cancelled:`, `— transferred:`, `— detached:`로 사유·경로를 남긴다.

**Scope 표기**

`## Required Context` heading은 `{...}` set literal로만 쓴다.

- `{Global}` — 이 로그를 다룰 때 항상 적용
- `{W1,W3}` — 나열한 W를 다룰 때 추가 적용 (range shorthand `W2-W4` 쓰지 않음)
- `{Global}`은 단독 heading으로만 쓴다. W set과 섞지 않는다.

Work Item entries가 없는 판단·조사·토론형 로그에서도 standing context가 있으면 `{Global}`에
둔다. 완료·취소·이관된 W가 set에 남아 있어도 그 자체로 stale은 아니다. 실제 적용 판단에서는
더 이상 수행하지 않는 W를 제외하고, closeout이나 정리 시점에 완료·취소·이관된 W만 남은 inert
set을 점검한다.

**Required Context 품질 기준**

Required Context는 다음 세션의 판단에 영향을 주는 Current surface다. 각 heading은 적용 범위를,
각 항목은 그 범위에서 적용할 기준을 나타낸다.

항목은 해당 scope에서 적용할 기준을 쓰며 단순 메모나 history 요약을 넣지 않는다. 다음 agent가
적용 여부와 적용 방식을 판단할 수 있을 만큼 구체적으로 쓰고, 항목만으로 기준의 의미, 적용 범위,
근거, 예외를 복원하기 부족하면 필요한 설명이나 확인 경로를 함께 남긴다.

**Override**

scope 정밀화로 풀리지 않는 진짜 예외일 때만 `Override [label]`을 쓴다. label은 Override 대상
bullet에만 붙이는 참조 핸들이며 로그 내에서 유일해야 한다. 중복·dangling·상충 Override는
Reconcile 대상이다.

**전체 예시**

```markdown
---
topic: API retry 분석
description: retry 동작 검증 및 문서화 범위 정의
status: open
---

## Work Items

- [>] W1 API response 조사
- [ ] W2 error handling 테스트
- [x] W3 retry 동작 문서화
- [-] W4 retry note 추가 — cancelled: retry 정책이 범위에서 제외됨
- [→] W5 auth flow 문서화 — transferred: logs/auth-flow.md
- [↓] W6 specs assimilation — detached: logs/specs-assimilation.md

## Required Context

### {Global}

- [no-skill-edit] 실제 skill 파일은 사용자 지시 전 수정하지 않는다.

### {W1,W2}

- 기준 문서 `docs/api-spec.md`를 공통 기준으로 본다.

### {W3}

- Override [no-skill-edit]: 사용자 승인 범위에서 `loop-rules.md`를 수정한다.

## 2026-07-01 · API response 조사 결과

- W1: endpoint X가 503을 반환함. retry 로직은 `src/client.ts`에서 처리.
- W2로 넘어가기 전 error code 목록 확인 필요.
```

### Date Blocks

- 블록 heading은 `## YYYY-MM-DD · <unit>`이고 날짜는 그 unit이 열린 날이다. `<unit>`은 블록이
  소유하는 대상을 명명한다. Work Item slice는 W-id를, topic·질문·결정은 주제를 쓴다. 이후 기록이
  owning block을 찾아 확장할 수 있게 명명은 구분되고 안정적이어야 한다. heading에 W-id가 없는 기존
  로그·블록은 entry body의 W-id나 최신 entry로 owning block을 역추적하되, W-id 단순 언급이 아니라
  그 W를 소유하는 block인지 확인한다.
- 블록은 open date 순으로, 블록 안의 entry는 record date 순으로 둔다.
- 한 블록은 서로 관련된 하나의 unit(topic, Work Item slice, 질문, 결정)만 소유한다.
- 발언 주체를 구분해야 할 때 `@user`, `@agent`처럼 실제 화자를 표시한다. 수행 결과만
  기록하면 생략한다.

블록은 한 번 쓰고 끝나는 checkpoint가 아니라 같은 unit의 dated entry를 누적하는 owning block이다.

- 블록의 `##` 직속 body가 그 블록의 첫 entry이며 record date는 heading 날짜다. 첫 기록에 `###`를
  강제하지 않고, 단일 checkpoint 블록은 body만으로 완결된다. `최신 entry`는 `###`가 있으면 마지막
  `###`, 없으면 `##` body를 가리킨다.
- 뒤의 기록이 같은 unit을 이어가거나 정정·반론·대체·결론 변경하면, 날짜가 바뀌었다는 이유만으로
  새 `##` 블록을 만들지 않고 owning block 아래에 `### YYYY-MM-DD · <entry>`로 append한다.
- 기존 entry는 삭제하거나 고쳐 쓰지 않는다. 정정·반론·대체·결론 변경도 새 entry로 남긴다. 결정이
  바뀌면 이전 결정, 새 결정과 변경 이유를 반드시 함께 남긴다.
- 새 `##` 블록은 기록이 새 unit을 열거나, 여러 unit에 걸치거나, 주제·범위·목적·결정 수명이 바뀌어
  owning block 아래에 두면 다음 독자가 오해할 때 만든다. 여러 unit에 걸친 cross-unit checkpoint는
  누적하지 않는 일회성 블록이다.
- 새 unit이 별도 수명·closeout·독립 재개나 복귀 조건을 가지면 블록 안에서 해결하지 않고
  [Cross-Log / Lifetime Transitions](#cross-log--lifetime-transitions)의 detach/child log 규칙을 쓴다.

질문과 답변마다 즉시 기록하지 않는다. 결정·제약 확정, 의미 있는 조사 결과, 작업·검증 완료,
주제 전환처럼 의미 변화가 확정되는 checkpoint에서 owning block의 entry 또는 새 블록으로 증류한다.
누적된 최신 entry는 그 unit 경위의 최신 기록일 뿐이며, 계속 적용할 standing 기준은 Reconcile을
거쳐 Required Context가 소유한다.

## Record

기록은 형식보다 의미 복원을 우선한다. 다음 질문에 답할 수 있어야 한다.

- 무엇이 결정, 변경, 완료, 취소, 이관됐는가?
- 왜 그렇게 판단했는가?
- 현재 유효한 다음 행동은 무엇인가? 없다면 왜 없는가?
- 어떤 파일, 로그, owner 문서, 검증 결과나 외부 출처가 판단에 영향을 줬는가?
- 이전 기록과 달라진 점이 있다면 무엇이 대체됐고 무엇이 아직 남았는가?

기록 여부는 "이 내용을 빼면 다음 agent가 의도, 판단, 근거, 제약, 현재 상태 또는 남은 일을
잘못 이해할 가능성이 있는가?"로 판단한다.

Record는 의미 변화의 경위와 판단 근거를 History surface에 보존한다. 그중 다음 세션의 판단에
계속 영향을 주는 dependency가 있는지는 Reconcile gate로 넘긴다.

### 기록할 내용

- 사용자의 의도, 질문, 제약, 피드백, 승인과 거부
- agent의 제안, 선택지, 판단과 근거
- 반대 근거, 동의되지 않은 의견과 보류 이유
- 결정과 결정이 변경된 이유
- 수행한 작업과 검증 결과
- 남은 질문, Work Item·next pointer의 변경과 그 이유
- 판단이나 후속 확인에 사용한 외부 출처와 확인한 사실

### 기록 품질

- 전달력: 다음 agent가 결정, 근거, 현재 상태, 남은 일을 빠르게 이해할 수 있게 쓴다.
- 목적성: 재개·판단·검증에 필요한 내용만 남기고 대화 덤프나 설명용 반복을 피한다.
- 접근성: 제목, bullet, 화자 표시, 경로, Work Item id를 사용해 필요한 정보를 쉽게 찾게 한다.
- 구조 보존: 목적성 범위에서, 결론만 남기면 다음 agent가 적용 대상·조건·판정축·예외·요구
  행동의 관계를 다시 추론해야 하는 경우 그 관계를 평탄화하지 않는다. 원문 형식을 복사하지 않고,
  누락된 관계를 추론하지 않아도 같은 판단을 적용할 수 있는 가장 짧은 형식으로 남긴다.
- 시간 안정성: 완료 사실, 취소 이유, 보류 조건, 다음 행동을 구분한다.

### 생략할 내용

- 반복 질문과 같은 의미의 답변
- 단순 확인이나 진행 발언
- 사용자 이해만을 위한 설명과 예시
- 판단에 영향을 주지 않은 검색 과정과 실패한 검색어
- 외부 자료의 긴 원문
- 이미 기록된 배경의 반복

### 외부 출처

판단 근거로 사용한 경로·URL, 확인한 사실, 그 사실이 판단에 미친 영향을 함께 기록한다.
판단에 사용하지 않은 검색 링크는 남기지 않고 원문을 길게 옮기지 않는다.

## Reconcile

`Reconcile`은 Record에서 확정된 의미 변화와 Current surface를 같은 판단 안에서 맞추는
gate-driven 협응 루프다.

**Gate** — 이번 기록이 Current surface가 의존하는 사실(결정, 범위, 조건, 읽을 자료, 검증
기준)을 바꿨는가?

- 아니오: 순수 narrative 블록이다. Work Items, `[>]`, Required Context, pointer를 건드리지 않는다.
- 예: 바뀐 dependency에 걸린 표면을 같은 동작에서 함께 갱신한다. 하나만 고치고 후속 점검으로
  미루지 않는다.

**Co-fire arms** — 순서 있는 단계가 아니라 같은 의미 변화에서 함께 발화할 수 있는 표면이다.

- **Work Item surface**: 행동, 범위, 완료 조건, marker, `[>]` next pointer가 바뀌면 Work Items를
  갱신한다. 전이 방법은 아래 `Work Item 전이`가 소유한다.
- **Required Context**: 다음 세션이 반드시 읽고 적용해야 할 기준, 제약, source 기준, 검증 조건이
  생기거나 바뀌면 scope heading과 context bullet을 갱신하고 위 품질 기준을 적용한다.
- **Cascade**: 위 표면 중 하나를 바꿔 다른 표면이 stale해졌으면 같은 동작에서 함께 갱신한다. 새
  W가 생기면 기존 context 중 새 W에도 적용할 것이 있는지 보고, label 대상 bullet이 바뀌면
  `Override` drift를 점검한다.

**검증과 되돌림** — 갱신 후 현재 적용해야 할 기준이 날짜 블록에만 묻혀 있지 않은지, Required
Context만으로 적용 여부와 적용 방식을 판단할 수 있는지 확인한다. 전자는 영향받는 Current
surface를 갱신하고, 후자는 필요한 설명이나 확인 경로를 보강한다. 이 과정에서 새로운 의미
변화가 확인되면 Record에 checkpoint를 남기고 Reconcile gate를 다시 적용한다.

다른 로그·owner와 연결되거나 로그 전체 수명이 바뀌면 co-fire arm으로 처리하지 않고
[Cross-Log / Lifetime Transitions](#cross-log--lifetime-transitions)로 판정한다.

### Work Item 전이

전이의 why·결과 narrative는 날짜 블록에 남긴다. 전이할 때 marker 변경과 날짜 블록 기록은 한
동작에서 같이 한다.

- **추가** — 현재 로그 수명 안에서 새로 수행할 행동이 생겼을 때. 이미 있는 W가 그 범위를
  소유하거나, 현재 답변에서 끝나거나, 로그 수명을 벗어난 독립 주제거나, 끝난 로그를 open으로
  연장하려는 새 작업이면 추가하지 않는다. 모호하면 후보와 근거를 보여 사용자에게 묻는다. 새
  항목이 즉시 재개 지점이면 `[>]`로 두고 기존 `[>]`는 `[ ]`로 내린다.
- **수정** — 기존 id가 가리키는 행동의 identity가 유지될 때만 한다. 원래 행동과 별도로 완료
  판단할 새 행동이 생기거나, 일부가 다른 owner로 이관되거나, 대체 행동이 생기면 새 id로 분리한다.
- **완료(`[x]`)** — 행동이 실제 수행됐고, 검증이 끝났고, 결과가 기록됐을 때. 완료해도 로그
  전체가 자동으로 `decided`가 되지는 않는다.
- **취소(`[-]`)** — 더 이상 actionable하지 않을 때. 이유가 중요하다. 단순 보류면 `[ ]`로
  남길지 먼저 판단한다.

이관(`[→]`)과 detach(`[↓]`)처럼 다른 로그·owner와 연결되는 전이는 다음 절에서 판정한다.

## Cross-Log / Lifetime Transitions

다른 로그·owner와 연결되거나 로그 전체 수명이 바뀌면 아래 discriminator로 먼저 판정한다.

1. 다른 로그가 이 로그 전체 수명을 대체하고, 이 로그에서 더 재개하지 않는가?
   - 예: `superseded`. 상세 status 전환 조건은 [Closeout / Status](#closeout--status)가 소유한다.
   - 아니오: 2로 간다.
2. 다른 로그·owner와 연결되는 전이인가?
   - 아니오: 같은 로그 안 전이이므로 Reconcile의 `Work Item 전이`가 소유한다.
   - 예: 3으로 간다.
3. 그 나가는 작업을 소유하거나 연결하는 source Work Item이 이 로그에 있는가?
   - 아니오: independent follow-up. 복귀 pointer 없는 독립 open 로그로 둔다.
   - 예: 4로 간다.
4. source가 그 결과를 나중에 소비하거나 완료 판정에 사용해야 하는가?
   - 예: detach(`[↓]`).
   - 아니오: transfer(`[→]`).

### Detach(`[↓]`)

detach는 source Work Item이 분리 작업 로그의 결과를 소비해야 할 때 쓴다. 이미 완료된 상세
history를 새 로그로 옮겨 즉시 decided 처리하는 migration detach도 같은 기준을 따른다.

- source Work Item line에 `— detached: <분리 작업 로그 경로>`를 남기고 marker는 `[↓]`로 둔다.
- 분리 작업 로그에는 `## 복귀 대상`, 자체 `## Required Context`, 자체 Work Items와 `[>]`를 둔다.
- snapshot은 effective result로 평탄화한다. source의 `Override`를 dangling reference로 옮기지 않는다.
- source에 다른 local actionable W가 있으면 그중 하나를 `[>]`로 둔다. 없으면 source에 `[>]`를
  억지로 남기지 않고 분리 작업 로그의 `[>]`를 따른다.
- 분리 작업 로그가 끝나면 source는 결과를 소비해 해당 W를 완료, 취소, 이관 또는 남은 행동으로
  갱신한다.

**Migration detach**

기본은 source의 기존 history를 그대로 두고 분리 작업 로그를 snapshot으로 시작하는 것이다.
완료된 상세 history가 source의 재개 표면이나 작업 수명을 흐리고, 이동 후에도 provenance와
knowledge를 보존할 수 있을 때만 해당 history를 분리 작업 로그로 옮긴다.

이동할 때는 source에 migration ledger를 append해 이동 범위, target, 이동 이유와 결과 소비
조건을 남긴다. 과거 기록을 조용히 삭제하거나 재작성하지 않으며, target에는 옮긴 history의
출처와 최종 결과를 복원할 수 있게 남긴다.

### Transfer(`[→]`)

transfer는 source가 해당 작업의 소유권을 넘기고 결과를 기다리지 않을 때 쓴다.

- source Work Item line에 `— transferred: <target>`과 이유를 남긴다.
- target 로그·owner에 이어받을 Work Item이나 next pointer가 준비됐는지 확인한다. source의
  `[→]` 줄만으로 target 준비를 가정하지 않는다.
- source context 변경은 target에 자동 전파하지 않는다. 전파가 필요하면 이관 기록에 명시한다.

### Independent Follow-Up

independent follow-up은 source Work Item이 없고 어떤 known Work Item도 결과를 기다리지 않는 새
수명이다. 복귀 pointer 없이 독립 open 로그로 둔다.

### Transition Verify

전이를 적용한 같은 동작에서 다음을 확인한다.

- `[>]`는 로그당 하나 이하이며 실제 local 재개 지점을 가리키는가?
- `[↓]`에는 target 경로와 소비할 source Work Item이 있고, 분리 작업 로그에는 복귀 대상과
  snapshot이 있는가?
- `[→]`는 source가 결과를 소비하지 않는 경우에만 쓰였는가?
- independent follow-up에 복귀 pointer를 만들지 않았는가?
- `superseded` 후보는 Closeout / Status가 소유하는 status 전환 기준으로 넘겼는가?

## Closeout / Status

`Closeout`은 작업이나 세션을 마치기 전 Current surface 불변, Reconcile 누락, 처리되지 않은
cross-log/lifetime 전이, status 전환 후보를 확인하는 안전망이다. 새 전이를 재정의하지 않고,
전이 발생 여부와 무관하게 다음 end-state를 확인한다.

- 마지막 의미 변화에 Reconcile gate를 적용했는가?
- local actionable Work Item이 있으면 `[>]`는 로그당 하나이며 실제 재개 지점을 가리키는가?
- Required Context에 완료·취소·이관된 W만 남은 inert set이나 dangling Override가 있는가?
- 처리되지 않은 cross-log/lifetime transition이 남아 있으면 해당 transition 섹션으로 돌려보냈는가?
- 권위 있는 결과 반영이나 검증이 남았는가?
- 로그 전체가 `decided` 또는 `superseded` 후보인가?
- Work Item entries가 없는 판단·조사·토론형 로그라면 답·결론, 알려진 복귀 대상 반영, 남은
  질문이 정리됐는가?

### 복귀 pointer 소비

분리 작업 로그를 Closeout할 때 알려진 복귀 pointer를 소비한다. 결과를 복귀 대상에 반영하고
복귀 대상의 관련 Work Item을 완료·취소·이관·남은 행동으로 갱신한다. 분리 작업 로그가 아직
open이면 그 로그의 next pointer를 따르고, 결과가 복귀 대상 범위를 일부만 수행했으면 복귀
대상에 실제 결과와 남은 범위를 기록한다.

### Status

- `open`: 질문이나 작업이 남아 있다. 여러 open 로그를 허용하며 현재 선택된 작업이라는 뜻이
  아니다.
- `decided`: 결정 반영, 필요한 작업과 검증 완료, 남은 일 없음이 모두 충족됐다.
- `superseded`: 다른 로그가 이 로그 전체의 작업 수명을 대체했다.

### Decided

`decided`는 이 로그의 질문, 판단, 조사, 작업 수명이 끝났다는 뜻이다. 다음을 모두 만족할 때만
`decided`로 바꾼다.

1. 결정이나 결과가 본문에 기록됐다.
2. 프로젝트 integration/owner 절차가 요구하는 반영·검증이 처리됐거나, 별도 로그나 owner 추적 항목으로 이관됐다.
3. 필요한 구현과 검증이 끝났다.
4. 미결 질문과 미완료 Work Item이 없다.
5. 알려진 복귀 pointer 소비가 필요한 경우 처리됐다.

다섯 조건이 충족됐으면 `decided`로 전환한다. Work Items가 있다는 이유만으로 완료된 로그를
`open`에 남기지 않는다. 로그의 자체 작업 수명이 끝났으면 새 작업을 next pointer로 달아 open을
연장하지 말고 독립 로그로 시작한다.

`decided`로 바꿀 때는 마지막 기록 블록에 최소한 다음을 남긴다.

- 최종 결정이나 결과
- 반영한 위치와 검증 결과, 또는 반영이 필요 없는 이유
- 남은 일이 없다는 판단 근거
- 복귀 pointer를 소비했다면 복귀 대상에 반영한 내용

Work Item entries가 없는 판단·조사·토론형 로그는 다음을 모두 만족하면 `decided`로 전환한다.
이는 위 조건을 직접 소유한 실행 작업이 없는 경우에 구체화한 것이지 완화한 것이 아니다.

1. 로그가 시작한 질문에 답이나 결론이 났다.
2. 남은 질문이 없다.
3. 프로젝트 integration/owner 절차가 요구하는 반영·검증이 처리됐거나, 별도 로그나 owner 추적 항목으로 이관됐다.
   알려진 복귀 pointer가 있으면 복귀 대상에 결과를 반영한다. 반영 대상이 없으면 충족된 것으로 본다.

세 조건이 충족됐는데도 `open`으로 남기거나 "중단"으로 재라벨하지 않는다.

### Superseded

새 로그가 기존 로그 전체를 대체할 때만 `superseded`로 바꾼다. 로그가 스스로 결론을 내 끝나는
것은 `decided`다. `superseded`는 다른 로그가 이 로그의 범위를 통째로 이어받아 더 이상 이
로그에서 재개하지 않을 때만 쓴다. 대체 후에도 결정 과정과 근거를 추적해야 하므로 로그를
삭제하지 않는다.

`superseded`로 바꾸기 전에 기존 미완료 Work Items, unresolved `[↓]`, `[>]` next pointer를 모두
해소한다. `superseded`로 바꿀 때는 마지막 기록 블록에 대체 로그 경로, 대체 이유, 미완료 Work
Items를 각각 어떻게 처리했는지, next pointer를 어떻게 해소했는지를 남긴다.

## Audit

사용자가 로그 점검을 요청하면:

1. 사용자 요청·프로젝트 pointer·next pointer로 대상을 정한다. 하나로 안 정해지면 후보와 next
   pointer를 보여 선택을 요청한다. 전체 open 로그는 사용자가 명시했을 때만 점검한다.
2. 구조적 미완료 항목을 찾고, 같은 로그의 후속 기록과 알려진 범위의 명시 pointer와 대조한다.
3. `완료 명백` / `계속 유효` / `판단 필요`로 분류하고 근거를 보고한다.
4. 점검 중에는 사용자 요청 없이 완료·취소·이관·분리를 적용하거나 로그를 수정하지 않는다.

점검 도구가 있어도 의미 판단은 agent가 한다.

## Lint Boundary

`scripts/log` 같은 도구는 구조 신호까지만 돕는다. 다음은 lint 후보다.

- 신규 W가 어떤 명시 set에도 없을 때의 약신호
- inert set(완료·취소·이관된 W만 남은 set)
- duplicate Override label, dangling Override label
- dangling detached/transferred pointer
- `{Global}`과 W-id 혼용

lint는 의미 판단·삭제·이관을 대신하지 않는다.
