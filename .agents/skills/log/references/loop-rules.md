# 로그 작업 규칙

이 문서는 Base log mechanics의 상세 판정 규칙을 소유한다. `../SKILL.md`의 `## 진입`은 작업
종류 dispatch, 대상 후보 확정, Route / Contract Gate, 재개 정보 복원 또는 Bootstrap을 통해
기록 계약과 시작 상태를 확정한다. 그 뒤 Base 파일 구조·Work Items·Required
Context·Record·Reconcile·lifetime transition·Closeout/status의 상세 판정은 아래 절이 소유한다.
Package 전용 구조와 phase는 `package-log.md`가 소유하며, 이 문서는 Base 규칙을 대체하지 않는
공통 mechanics만 정의한다.

## Log File Shape

### Frontmatter

frontmatter는 구조 소비자가 읽는 최소 index다. 다음 세 필드만 사용한다.

- `topic`: 로그의 짧은 제목
- `description`: 본문을 열지 않고 필요한 로그인지 판별하는 안정적인 설명
- `status`: 로그의 수명인 `open`, `decided`, `superseded`

`description`에는 현재 단계, handoff, next pointer를 넣지 않는다. 현재 진행 상태는 본문의 최신
기록과 Work Items가 소유한다.

### Work State / Required Context

로그는 경위를 보존하는 History surface(로그 블록/entry) 외에 두 갱신 가능한 표면을 둔다.
Work state surface는 `## Work Items`의 marker/pointer, `[>]` next pointer, 복귀 pointer로
작업 선택·재개·handoff 상태를 소유한다. Required Context는 scope 기반 standing frame으로
이 로그를 다룰 때 적용할 기준·제약·자료·검증 조건을 소유한다.

`## Work Items`와 `## Required Context`는 로그의 기본 template surface다. 섹션은 항상 두되,
`## Work Items`는 소유할 항목이 없으면 비워 두고, `## Required Context`는 예약 slot을 유지한 채
채울 내용만 비운다.

- `## Work Items`는 실행 항목이 생기면 marker 규칙에 따라 채운다.
- `## Required Context`는 `### Return Target`과 `### {Global}`을 항상 두는 예약 slot으로 갖는다.
  `### {Global}`은 로그 전체에 적용할 standing context가 없으면 내용 없이 heading만 둔다. 그 밖의
  standing context는 owning block 밖의 다른 unit이나 특정 Work Item scope에도 적용될 때만
  `### {W-set}` scope heading을 만들어 가장 작은 유효 scope 아래에 채운다. 읽어야 할 자료,
  scope/source 기준, 제약, 검증 기준과 handoff 조건을 둔다.

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
| `[→]`  | transferred. 다른 로그가 이어받음                                      | 없음                                    |
| `[↓]`  | detached. 분리 작업 로그로 위임함                                     | 분리 작업 로그 완료 후 복귀 대상이 소비 |

`[x]`는 성공 완료만 뜻한다. 취소·이관·detach는 각각 `[-]`, `[→]`, `[↓]`로 구분하고 줄 끝에
`— cancelled:`, `— transferred:`, `— detached:`로 사유·경로를 남긴다.

**Required Context section**

`## Required Context`의 첫 section은 `### Return Target`이다. 이 section은 이 로그가 다른 source
로그의 결과 소비 대상으로 돌아가야 하는지, 아니면 독립 수명인지 소유한다.

독립 로그는 다음 형태를 쓴다.

```markdown
### Return Target

- None: independent log.
```

분리 작업 로그는 다음 형태를 쓴다.

```markdown
### Return Target

- Log: `logs/source.md`
- Work Item: W2
- Consume when: source W2가 이 로그의 결론을 소비할 조건.
- Context snapshot: source 전체를 다시 읽지 않아도 되는 유효 조건.
```

`Return Target`은 로그 수명 관계를 소유하는 예약 section이다. 일반 standing context는 아래 scope
표기를 따른다.

**Scope 표기**

`## Required Context`의 일반 scope heading은 `{...}` set literal로만 쓴다. 예약 section인
`### Return Target`에는 이 규칙을 적용하지 않는다.

- `{Global}` — 이 로그를 다룰 때 항상 적용
- `{W1,W3}` — 나열한 Work Item scope에 적용
- `{Global}`은 단독 heading으로만 쓴다. W set과 섞지 않는다.
- `### {Global}`은 내용이 없어도 template에 항상 존재하는 예약 slot이다. `### {W-set}`만 필요할 때
  만들고 비면 만들지 않는다.

`## Work Items` 섹션이 비어 있는 판단·조사·토론형 로그에서도 standing context가 있으면
`{Global}`에 둔다. Return 대상이 없으면 `### Return Target`에는 독립 로그임을 명시한다.

완료·취소·이관된 W가 set에 남아 있어도 그 자체로 stale은 아니다. 실제 적용 판단에서는 더 이상
수행하지 않는 W를 제외하고, closeout이나 정리 시점에 완료·취소·이관된 W만 남은 inert set을
점검한다.

**Required Context 품질 기준**

Required Context는 로그 파일 안에서 해당 로그를 다룰 때 적용할 scope 기반 standing frame을
소유한다. `{Global}`은 로그 전체, `{W-set}`은 해당 Work Item scope에 적용된다. 각 heading은 적용
scope를, 각 항목은 그 scope에서 현재 적용할 기준을 나타낸다.

항목에는 단순 메모나 history 요약을 넣지 않는다. 근거·경위는 로그 블록이 소유하고, Required
Context에는 적용 기준과 scope만 둔다. 항목만으로 적용 여부, 적용 방식, 예외를 판단하기 부족하면
필요한 설명이나 확인 경로를 함께 남긴다.

**Required Context Override**

Required Context 항목이 일부 Work Item에만 다르게 적용되면 먼저 scope heading을 분리한다.
scope heading 분리로도 표현할 수 없는 명확한 예외일 때만 `Override [label]`을 쓴다. 예외인지
scope 변경인지 불명확하면 임의로 Override를 만들지 않고 사용자에게 확인하거나 미결 판단으로
기록한다. label은 Override 대상 bullet에만 붙이는 참조 핸들이며 로그 내에서 유일해야 한다.
중복·dangling·상충 Override는 Reconcile 대상이다.

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
- [↓] W6 specs assimilation — detached: logs/specs-assimilation.md — reason: source W6 completion depends on the separated result

## Required Context

### Return Target

- None: independent log.

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

### Log Lifetime Boundary

이 절은 `../SKILL.md`의 Route / Contract Gate에서 기존 후보가 같은 로그 수명인지 판정할 때
호출되는 Base 판정 owner다. 또한 Base 작업 루프 중 새 행동·unit이 생겼을 때 현재 로그 수명에
배치할 수 있는지 판정한다.

새 행동이나 unit을 배치할 때 다음을 모두 만족하면 현재 로그 수명 안에서 소유한다.

- 현재 로그의 목적에 포함된다.
- 현재 로그의 완료 조건과 함께 닫을 수 있다.
- 현재 로그의 Work state와 Required Context로 재개할 수 있으며, 별도 로그의 독립 재개 지점이나
  복귀 조건을 요구하지 않는다.

하나라도 별도 작업 수명을 요구하면 현재 로그의 Work Item이나 로그 블록에 넣지 않고
[Cross-Log / Lifetime Transitions](#cross-log--lifetime-transitions)에서 판정한다. 경계가 불명확하면
이유와 후보를 제시해 사용자에게 확인한다. 이 판정은 새 행동·unit의 배치에 적용한다. 다른 로그가
현재 로그 전체 수명을 대체하는 후보는 이 경계를 거치지 않고 Cross-Log discriminator의 첫 단계에서
판정한다.

### Log Blocks

블록은 한 번 쓰고 끝나는 checkpoint가 아니라 같은 unit의 dated entry를 누적하는 owning block이다.

#### Block Identity

- 블록 heading은 `## YYYY-MM-DD · <unit>`이고 날짜는 그 unit이 열린 날이다. `<unit>`은 블록이
  소유하는 대상을 명명한다. Work Item slice는 W-id를, topic·질문·결정은 주제를 쓴다.
- 한 블록은 서로 관련된 하나의 unit(topic, Work Item slice, 질문, 결정)만 소유한다.
- 이후 기록이 owning block을 찾아 확장할 수 있게 명명은 구분되고 안정적이어야 한다.
  heading에 W-id가 없는 기존 로그·블록은 entry body의 W-id나 최신 entry로 owning block을
  역추적하되, W-id 단순 언급이 아니라 그 W를 소유하는 block인지 확인한다.

#### Entry Format and History

- 블록은 open date 순으로, 블록 안의 entry는 record date 순으로 둔다.
- 블록의 `##` 직속 body가 그 블록의 첫 entry이며 record date는 heading 날짜다. 첫 기록에 `###`를
  강제하지 않고, 단일 checkpoint 블록은 body만으로 완결된다.
- 이후 entry heading은 `### YYYY-MM-DD HH:MM · <entry>` 형식을 쓴다. `HH:MM`은 작성 환경의 로컬
  시간 기준 timestamp다. 기존 date-only heading(`### YYYY-MM-DD · <entry>`)은 유효하지만 timestamp
  없는 entry로 본다.
- 발언 주체를 구분해야 할 때 `@user`, `@agent`처럼 실제 화자를 표시한다. 수행 결과만
  기록하면 생략한다.
- 기존 entry는 삭제하거나 고쳐 쓰지 않는다. 정정·반론·대체·결론 변경도 새 entry로 남긴다. 결정이
  바뀌면 이전 결정, 새 결정과 변경 이유를 반드시 함께 남긴다.

각 entry는 turn 단위 기록이 아니라 [Record](#record)에서 증류한 checkpoint다.

#### Record Placement Loop

기록할 checkpoint가 생기면 다음 순서로 위치를 정한다.
`../SKILL.md`의 Route / Contract Gate에서 이미 같은 로그 수명 안이라고 판정한 뒤 기존 block 재개와
새 block 생성을 가르기 위해 이 loop를 호출했다면, 아래 2단계의 Log Lifetime Boundary 재적용은
생략하고 1단계와 3단계만 적용한다.

1. 기존 owning block이 소유하는 unit을 이어가는 기록인가?
   - 후속 판단, 순차 실행 단계, 수행 결과, 정정, 반론, 대체와 결론 변경을 포함한다.
   - Yes: 날짜가 바뀌거나 새 섹션에 진입했다는 이유만으로 새 `##` 블록을 만들지 않고 owning
     block 아래에 새 entry로 append한다.
2. 새 unit인가?
   - Yes: [Log Lifetime Boundary](#log-lifetime-boundary)를 적용한다. 현재 로그 수명 밖이면 그
     절이 지시한 Cross-Log 판정으로 보내고, 안이면 3으로 간다.
3. 새 unit을 열거나, 여러 unit에 걸치거나, 주제·범위·목적·결정 수명이 바뀌어 owning block 아래에
   두면 다음 독자가 오해하는가?
   - Yes: 새 `##` 블록을 만든다. 여러 unit에 걸친 cross-unit checkpoint는 누적하지 않는 일회성
     블록이다.

#### Latest Entry Lookup

로그 전체의 `최신 기록 entry`는 다음 순서로 판단한다.

1. 비교 대상 entry들이 모두 비교 가능한 timestamp를 가지는가?
   - Yes: 가장 늦은 timestamp의 entry를 최신 기록 entry로 본다.
2. timestamp가 없거나 timestamp만으로 비교할 수 없는 entry가 섞였는가?
   - Yes: 파일 안의 entry 순서로 판단한다.

한 블록 안의 `최신 entry`는 다음 순서로 판단한다.

1. 블록 안에 `###` entry가 있는가?
   - Yes: 마지막 `###` entry를 최신 entry로 본다.
2. `###` entry가 없는가?
   - Yes: `##` 직속 body를 최신 entry로 본다.

#### Required Context Boundary

누적된 최신 entry는 그 unit 경위의 최신 기록일 뿐이다. 적용 범위가 그 owning block 안에 닫힌
기준은 entry로 두고, block 밖에도 적용될 standing 기준만 Reconcile을 거쳐 Required Context가 소유한다.

## Record

Record는 의미 변화의 경위와 판단 근거를 다음 agent가 복원할 수 있는 구조로 History surface에
보존한다. 다음 순서로 기록 여부와 내용을 정한다.

### Record Loop

1. 이 내용을 빼면 다음 agent가 의도, 판단, 근거, 제약, 현재 상태 또는 남은 일을 잘못 이해할
   가능성이 있는가?
   - No: 기록하지 않는다.
   - Yes: 다음 단계로 간다.
2. 무엇이 의미 있게 바뀌었는지 식별한다.
   - 사용자의 의도, 질문, 제약, 피드백, 승인과 거부
   - agent의 제안, 선택지, 판단과 근거, 반대 근거와 보류 이유
   - 결정과 결정이 변경된 이유
   - 수행한 작업과 검증 결과
   - 남은 질문, Work Item·next pointer 변경과 그 이유
   - 판단이나 후속 확인에 사용한 외부 출처와 확인한 사실
3. 기록의 대상, 적용 범위와 관계를 복원한다.
   - owning block의 문맥만으로 대상과 범위가 명확하지 않으면, 다음 agent가 이를 특정하는 데
     필요한 안정적인 식별자와 관계를 함께 남긴다.
   - 제안·비교·판정이 표, 단계, 조건 집합처럼 정보 구조에 의존하면 적용 대상·조건·판정축·예외·
     요구 행동의 대응 관계를 보존한다. 원래 형식을 복사할 필요는 없지만, 다음 agent가 원래
     제안과 같은 판단을 재구성할 수 있어야 한다.
4. 재개·판단·검증에 필요한 내용만 증류한다.
   - 반복 질문과 같은 의미의 답변, 단순 확인이나 진행 발언, 사용자 이해만을 위한 설명과 예시,
     판단에 영향을 주지 않은 검색 과정, 외부 자료의 긴 원문, 이미 기록된 배경은 생략한다.
   - 판단에 사용한 외부 출처는 경로·URL, 확인한 사실과 그 사실이 판단에 미친 영향을 남긴다.
     판단에 사용하지 않은 검색 링크는 남기지 않는다.
   - 제안·의견 등 승인되지 않은 내용을 기록할 때는 제목이나 본문이 확정된 결정으로 읽히지 않게
     쓴다. 승인 여부를 판단할 수 없으면 사용자에게 확인한다.
   - 제목, bullet, 화자 표시나 필요한 식별자를 사용해 필요한 정보를 찾게 하고, 3단계에서 식별한
     대상·범위·관계를 보존하는 가장 짧은 구조로 쓴다.
5. 기록만으로 다음을 복원할 수 있는지 확인한다.
   - 무엇이 결정, 변경, 완료, 취소, 이관됐는가?
   - 왜 그렇게 판단했는가?
   - 현재 유효한 상태와 다음 행동은 무엇인가? 다음 행동이 없다면 왜 없는가?
   - 어떤 근거와 검증 결과가 판단에 영향을 줬는가?
   - 이전 기록 중 무엇이 대체됐고 무엇이 아직 남았는가?
6. 정리한 내용을 History surface에 기록한 뒤 **Reconcile 진입 gate**를 적용한다. Work state가
   의존하는 내용이 바뀌었거나, standing dependency가 owning block 밖에도 적용되거나, 기존
   Required Context의 내용·scope가 바뀌었는가?
   - No: Record를 끝낸다.
   - Yes: Reconcile로 넘긴다.

## Reconcile

`Reconcile`은 Reconcile 진입 gate를 통과한 의미 변화에 맞춰 Work state와 Required Context를
재조정하고, 갱신 결과가 새로운 의미 변화를 드러내면 Reconcile 진입 gate를 다시 적용하는
feedback loop다. 다음 순서로 돈다.

1. **영향받은 표면을 같은 동작에서 갱신한다.** 하나만 고치고 후속 점검으로 미루지 않는다.
   - **Work state**: 행동, 범위, 완료 조건, marker나 `[>]` next pointer가 바뀌면 Work Items를
     갱신한다. 전이 방법은 아래 `Work Item 전이`가 소유한다.
   - **Required Context**: 기준, 제약, 읽을 자료나 검증 조건이 owning block 밖의 다른 unit이나
     로그 전체에도 적용되면 해당 scope heading과 context bullet을 갱신하고
     `Required Context 품질 기준`을 적용한다. 적용 범위가 owning block 안으로 좁아졌거나 다른 결정이 대체한 항목은 같은
     동작에서 내리거나 제거한다.
2. **cascade를 닫는다.** 한 표면의 변경으로 다른 표면이 stale해졌으면 1단계를 다시 적용한다. 새
   W가 생기면 기존 context 중 새 W에도 적용할 것이 있는지 확인하고, label 대상 bullet이 바뀌면
   `Override` drift를 점검한다. 더 이상 stale한 표면이 없을 때 다음 단계로 간다.
3. **정합을 검증한다.** 변경된 행동·범위·완료 조건·재개 지점이 Work state에 반영됐는지, 각
   standing 기준이 가장 작은 유효 scope에 놓였는지, Required Context만으로 적용 여부와 적용 방식을
   판단할 수 있는지 확인한다.
   - 2단계가 놓친 반영 누락이 있으면 1단계로 돌아가 보정하고 다시 검증한다.
   - 새로운 결정, 범위 또는 조건 변화가 확인되면 Record에 checkpoint를 남기고 `Record Loop`의
     Reconcile 진입 gate를 다시 적용한다. No면 Reconcile을 끝내고, Yes면 1단계로 돌아간다.
   - 모두 통과하면 Reconcile을 끝낸다.

### Work Item 전이

전이의 why·결과 narrative는 로그 블록에 남긴다. 전이할 때 marker 변경과 로그 블록 기록은 한
동작에서 같이 한다.

- **추가** — 먼저 W 추가 후보인지 판정한다.
  - 이미 있는 W가 그 범위를 소유하거나 현재 답변에서 끝나면 W를 추가하지 않고 이 전이를 끝낸다.
  - 끝난 로그를 `open`으로 연장하려는 새 작업이면 W를 추가하지 않고
    [Cross-Log / Lifetime Transitions](#cross-log--lifetime-transitions)로 보낸다.
  - 그 밖에 지속할 새 행동이면 [Log Lifetime Boundary](#log-lifetime-boundary)를 적용한다. 현재 로그
    수명 밖이면 W를 추가하지 않고 그 절이 지시한 Cross-Log 판정으로 보내고, 안이면 새 W를 추가한다.

  추가 여부가 모호하면 후보와 근거를 보여 사용자에게 묻는다. 새 항목이 즉시 재개 지점이면
  `[>]`로 두고 기존 `[>]`는 `[ ]`로 내린다.
- **수정** — 기존 id가 가리키는 행동의 identity가 유지될 때만 그 W를 수정한다. 다음 중 하나로
  identity가 갈라지면 수정하지 않고 새 id로 분리한다.
  - 원래 행동과 별도로 완료 판단할 새 행동이 생긴다.
  - 일부 행동이 다른 로그로 이어진다. 나가는 행동을 새 id로 분리한 뒤 해당 전이는
    [Cross-Log / Lifetime Transitions](#cross-log--lifetime-transitions)에서 판정한다.
  - 대체 행동이 생긴다.
- **완료(`[x]`)** — 행동이 실제 수행됐고, 검증이 끝났고, 결과가 기록됐을 때. 완료해도 로그
  전체가 자동으로 `decided`가 되지는 않는다.
- **취소(`[-]`)** — 더 이상 actionable하지 않을 때. 이유가 중요하다. 단순 보류면 `[ ]`로
  남길지 먼저 판단한다.

이관(`[→]`)과 detach(`[↓]`)처럼 다른 로그와 연결되는 전이는 다음 절에서 판정한다.

## Cross-Log / Lifetime Transitions

새 행동·unit의 배치는 [Log Lifetime Boundary](#log-lifetime-boundary)가 먼저 판정한다. 이 절은
다른 로그와 연결되는 후보 또는 로그 전체 수명 대체 후보를 아래 ordered discriminator로 분류한 뒤,
각 종결 분기가 가리키는 절차를 적용한다.

1. 다른 로그가 이 로그 전체 수명을 대체하고, 이 로그에서 더 재개하지 않는가?
   - Yes: [Superseded](#superseded)의 전환 조건과 절차를 적용한다.
   - No: 2로 간다.
2. 다른 로그를 새로 만들거나 기존 다른 로그와 연결하는 전이인가?
   - No: 이 절을 끝내고 Reconcile의 [Work Item 전이](#work-item-전이)를 적용한다.
   - Yes: 3으로 간다.
3. 그 나가는 작업을 소유하거나 연결하는 source Work Item이 이 로그에 있는가?
   - No: [Independent Follow-Up](#independent-follow-up)을 적용한다.
   - Yes: 4로 간다.
4. source가 그 결과를 나중에 소비하거나 완료 판정에 사용해야 하는가?
   - Yes: [Detach(`[↓]`)](#detach)를 적용한다.
   - No: [Transfer(`[→]`)](#transfer)를 적용한다.

### Detach(`[↓]`)

detach는 source Work Item이 분리 작업 로그의 결과를 소비해야 할 때 쓴다. 이미 완료된 상세
history를 새 로그로 옮겨 즉시 decided 처리하는 migration detach도 같은 기준을 따른다.

- source Work Item line에 `— detached: <분리 작업 로그 경로> — reason: <reason>`을 남기고 marker는
  `[↓]`로 둔다.
- 분리 작업 로그에는 자체 `## Work Items`와 `## Required Context`를 두고, Required Context의
  `### Return Target`만으로 source 로그 경로, 결과를 소비할 source W-id와 소비 조건을 복원할 수
  있게 쓴다. local actionable Work Item이 있으면 `[>]` 하나를 둔다.
- snapshot은 effective result로 평탄화한다. source의 `Override`를 dangling reference로 옮기지 않는다.
- source에 다른 local actionable W가 있으면 그중 하나를 `[>]`로 둔다. 없으면 source에 `[>]`를
  억지로 남기지 않는다. 분리 작업 로그에 local actionable W가 있으면 그 로그의 `[>]`가 재개
  지점이며, 즉시 `decided` 처리하는 migration target에는 `[>]`를 만들지 않는다.
- source에 `[↓]`가 남아 있는 동안 source 로그는 child 결과 소비 대기 상태이므로 `open`으로 둔다.
  child 결과를 source가 소비해 해당 W를 완료·취소·이관 또는 남은 행동으로 갱신한 뒤에야 source
  closeout을 판단한다.
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
- target 로그에 이어받을 Work Item이나 next pointer가 준비됐는지 확인한다. source의
  `[→]` 줄만으로 target 준비를 가정하지 않는다.
- source context 변경은 target에 자동 전파하지 않는다. 전파가 필요하면 이관 기록에 명시한다.

### Independent Follow-Up

independent follow-up은 source Work Item이 없고 어떤 known Work Item도 결과를 기다리지 않는 새
수명이다. 복귀 pointer 없이 독립 open 로그로 둔다.

### Transition Verify

전이를 적용한 같은 동작에서 다음을 확인한다.

- `[>]`는 로그당 하나 이하이며 실제 local 재개 지점을 가리키는가?
- `[↓]`에는 target 경로와 reason이 있고, 분리 작업 로그의 `### Return Target`에는 소비할 source
  Work Item, consume condition과 snapshot이 있는가?
- `[→]`는 source가 결과를 소비하지 않는 경우에만 쓰였는가?
- independent follow-up에 복귀 pointer를 만들지 않았는가?
- 복귀 pointer가 실제 결과 소비 source W를 가리키며 unrelated ancestor로 건너뛰지 않는가?
- 명시 pointer graph에 순환이 생기지 않았는가?
- `superseded` 분기는 [Superseded](#superseded)의 선행 해소와 기록을 마치고 source frontmatter의
  `status`를 `superseded`로 바꿨는가?

## Closeout / Status

`Closeout`은 작업이나 세션을 마치기 전 Work state 불변과 Required Context 정합, Reconcile 진입
gate 누락, 처리되지 않은 cross-log/lifetime 전이, status 전환 후보를 확인하는 안전망이다. 새
전이를 재정의하지 않고, 전이 발생 여부와 무관하게 다음 end-state를 확인한다.

- 마지막 의미 변화에 Reconcile 진입 gate를 적용했는가?
- local actionable Work Item이 있으면 `[>]`는 로그당 하나이며 실제 재개 지점을 가리키는가?
- Required Context에 적용 범위가 owning block 안으로 좁아졌거나 대체되어 더 이상 선언 scope에
  적용되지 않는 항목, 완료·취소·이관된 W만 남은 inert set, dangling Override가 있는가?
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

`[↓]` Work Item이 남아 있으면 알려진 복귀 pointer 소비가 끝나지 않은 것이므로 `decided`로
전환하지 않는다.

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

새 로그가 기존 로그 전체를 대체할 때만 기존 로그 frontmatter의 `status`를 `superseded`로
바꾼다. 로그가 스스로 결론을 내 끝나는 것은 `decided`다. `superseded`는 다른 로그가 이 로그의
범위를 통째로 이어받아 더 이상 이 로그에서 재개하지 않을 때만 쓴다. 대체 후에도 결정 과정과
근거를 추적해야 하므로 로그를 삭제하지 않는다.

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
