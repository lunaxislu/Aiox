# Work Items 규칙

이 문서는 로그 안의 작업, Work Items, next pointer, 작업 전이, parent/child pointer,
cross-log 정합화를 다룬다. 기록 품질과 status 전환은 `log-writing-rules.md`를 따른다.

## Work Items 기본 구조

`Work Items`는 로그 수명 안에서 수행할 전체 범위다. 로그당 canonical `## Work Items`
섹션 하나를 유지한다. 항목은 0개 이상 둘 수 있고 단일·복수, 순차·비순차 작업을 표현할
수 있다.

Work Item은 명시 id를 가진다. id는 `W1`, `W2`처럼 발급하고 줄 순서와 별개인 identity다.
완료, 취소, 이관된 id도 보존하며 재사용하지 않는다.

- `- [>] Wn ...`: 재개 시 먼저 할 Work Item
- `- [ ] Wn ...`: 남아 있는 Work Item
- `- [x] Wn ...`: 완료됐거나 취소·이관으로 해소되어 현재 로그에서 더 이상 남은 작업이
  아닌 Work Item

```markdown
## Work Items

- [>] W1 Inspect API responses.
- [ ] W2 Test error handling.
- [ ] W3 Document retry behavior.
```

`[>] Wn`은 현재 로그 안의 재개 지점이다. 로그 간 parent/child pointer와 같은 개념이
아니다.

Work Item 줄은 한 줄 행동 요약과 구조 상태만 소유한다. full why, 사용자 결정,
취소·보류·범위 변경의 의미는 날짜별 기록 블록이 소유한다.

`[x]`는 성공적으로 완료만 뜻하지 않는다. `Cancelled:`나 `Transferred:` 접두어가 있으면
그 항목은 완료가 아니라 취소 또는 이관으로 해소된 것이다.

```markdown
- [x] W1 Inspect API responses.
- [x] W2 Cancelled: Add retry note. — retry 정책이 범위에서 제외됨
- [x] W3 Transferred: Document auth flow. → logs/auth-flow.md — 별도 로그가 이어받음
```

## Work Item 추가

새 Work Item은 현재 로그의 수명 안에서 새로 수행해야 할 행동이 생겼을 때 추가한다.

행동은 작업을 끝내는 순간에만 생기지 않는다. 대화 중 사용자나 agent가 별도 입력
자료, 리뷰, 개선안, 승인, patch처럼 지금 답변으로 끝나지 않고 나중에 재개되어야 하는
후속 흐름을 꺼내면, 단순 발언으로 넘기기 전에 Work Item 후보인지 먼저 점검한다.
"다음 세션에서 ~하고 싶다"처럼 미뤄진 의도도 재개·스캔·완료 판단이 필요한 행동이면
후보다.

추가하는 경우:

- 사용자나 agent 판단으로 현재 로그 안의 새 행동이 생겼다.
- 기존 작업의 후속 행동이 독립적으로 스캔될 만큼 중요하다.
- 대화 중 떠오른 후속 흐름이 별도 입력·리뷰·승인·patch처럼 독립적이고 나중에
  재개되어야 한다.
- 조사, 구현, 검증, 문서 반영처럼 서로 다른 행동을 따로 완료 판단해야 한다.
- child 로그를 만든 뒤 parent 로그에 복귀해 확인해야 할 행동을 남겨야 한다.

추가하지 않는 경우:

- 이미 있는 Work Item의 표현만 더 정확히 고치면 충분하거나, 이미 있는 Work Item이 그
  범위를 소유한다.
- 설명, 이해용 예시, 현재 답변 안에서 끝나는 질문처럼 나중에 재개할 독립 행동이 남지
  않는다.
- 현재 로그의 수명을 벗어난 독립 주제라 별도 로그가 맞다.
- 끝난 로그를 open으로 연장하기 위한 새 작업이다.

후속 흐름이 현재 로그의 수명 안인지 별도 로그인지, 또는 Work Item 후보인지 모호하면
추측해 추가하지 말고 후보와 근거를 보여주고 사용자에게 묻는다.

새 항목이 즉시 재개 지점이면 `[>]`로 두고 기존 `[>]`는 `[ ]`로 내린다. 동시에 여러
`[>]`를 두지 않는다.

## Work Item 수정

Work Item 수정은 기존 id가 가리키는 행동의 identity가 유지될 때만 한다.

수정하는 경우:

- 표현이 모호하거나 대상 파일, 범위, 검증 방식이 더 명확해졌다.
- 같은 행동의 조건이나 순서가 바뀌었다.
- 오타나 오래된 명칭 때문에 다음 agent가 오해할 수 있다.

새 id로 분리하는 경우:

- 원래 행동과 별도로 완료 판단해야 하는 새 행동이 생겼다.
- 기존 행동의 일부가 별도 로그나 별도 owner로 이관된다.
- 원래 행동을 더 이상 하지 않기로 했고 다른 행동이 대체한다.

수정할 때 과거 판단을 지우지 않는다. 본문에는 원래 행동, 변경 이유, 현재 행동이
구분되게 남긴다. 줄의 순서를 바꾸는 것만으로 priority 변경을 표현하지 말고, 재개 지점이
바뀌면 `[>]`를 옮기고 이유를 기록한다.

수정 기록에는 최소한 다음을 남긴다.

- 원래 행동
- 바뀐 행동이나 조건
- 변경 이유
- next pointer가 바뀌었는지 여부

## 완료

완료는 해당 Work Item이 이 로그에서 더 이상 actionable하지 않다는 뜻이다. 다음 조건을
확인한다.

- 요청된 행동이 실제로 수행됐다.
- 필요한 검증이나 확인이 끝났다.
- 결과와 검증 실패·성공 여부가 필요한 만큼 기록됐다.
- 권위 있는 결과를 바꿔야 한다면 승인된 위치에 반영됐거나 별도 항목으로 남았다.

완료 후에도 로그 전체가 자동으로 `decided`가 되지 않는다. 다른 미완료 항목, 미결 질문,
parent 복귀, 권위 문서 반영이 남았는지 `log-writing-rules.md`의 status 전환 점검에서
따로 판단한다.

완료 기록에는 최소한 다음을 남긴다.

- 수행한 일
- 결과
- 검증이나 확인 결과
- 남은 일이 있으면 다음 Work Item이나 parent 복귀 위치

## 취소

`Cancelled:`는 실패나 폐기라는 고정 의미가 아니다. 해당 Work Item이 이 로그에서 더 이상
actionable하지 않다는 구조 상태이며, 이유가 중요하다.

취소하는 경우:

- 사용자가 하지 않기로 결정했다.
- 더 적절한 행동으로 대체되어 원래 행동을 수행하지 않는다.
- 조건 변화로 원래 행동이 불필요해졌다.
- 같은 목적이 다른 방식으로 충족됐고 이 항목을 계속 둘 필요가 없다.

본문에는 무엇을 하지 않게 됐는지, 왜 그런지, 대체 행동이 있는지, 남은 일이 있는지를
남긴다. 취소 이유가 단순 보류라면 취소하지 않고 `open` 항목으로 남겨야 하는지 먼저
판단한다.

취소 기록에는 최소한 다음을 남긴다.

- 취소한 행동
- 취소 이유
- 대체 행동이 있는지
- 남은 일이 없는지 또는 어디로 이어지는지

## 이관

`Transferred:`는 해당 Work Item이 현재 로그의 actionable 항목이 아니며 다른 로그, 문서,
owner, 작업 흐름이 이어받는다는 뜻이다.

이관하는 경우:

- 별도 로그에서 독립적으로 재개, 결정, 종료해야 한다.
- 현재 로그는 결론을 냈고 구현이나 후속 작업은 다른 책임 문서나 작업 로그가 소유한다.
- 기존 로그 전체가 다른 로그로 대체되지는 않지만 일부 범위가 이동한다.

이관할 때는 target과 reason을 기록한다. target 로그에 이어받을 Work Item과 next pointer가
있는지는 agent가 만들거나 확인한다. source 로그의 `Transferred:` 줄만으로 target이 준비된
것으로 보지 않는다.

이관은 supersede와 다르다. 일부 항목만 이동하면 Work Item 전이이고, 로그 전체의 수명을
다른 로그가 대체할 때만 `superseded`를 검토한다.

parent 로그의 항목을 child 로그가 먼저 처리한 뒤 parent로 돌아와야 한다면 이관이 아니라
parent/child pointer다. source가 더 이상 그 작업을 소유하지 않을 때만 `Transferred:`를
사용한다.

이관 기록에는 최소한 다음을 남긴다.

- 이관한 행동
- target 로그, 문서, owner 또는 작업 흐름
- 이관 이유
- target이 이어받을 Work Item이나 next pointer를 만들었거나 확인했는지

## Pointer와 Cross-Log 정합화

이 섹션은 두 가지 혼동을 막기 위한 규칙이다.

1. agent는 모든 open 로그를 매번 역검색하거나 자동 동기화하지 않는다. 현재 작업에서
   명시적으로 알려진 known graph만 처리한다.
2. `[>] Wn` next pointer와 parent/child pointer는 다르다. `[>] Wn`은 현재 로그 안의
   재개 지점이고, parent/child pointer는 parent 로그의 작업에서 child 로그가 생겼음을
   기록하는 로그 간 참조다.

이 문서에서 pointer는 두 가지를 구분한다.

- next pointer: 현재 로그의 `## Work Items` 안에 있는 단일 `[>] Wn`
- parent/child pointer: parent 로그의 작업에서 child 로그가 생겼음을 남기는 로그 간 참조

### parent/child pointer의 identity

child 로그의 parent는 "그 child의 결과를 소비해야 하는 Work Item"이다. 출처가 같다거나
같은 세션에서 나왔다는 사실만으로 parent가 정해지지 않는다. child가 결론을 내면 그
결론을 받아 완료·취소·이관 또는 다음 행동으로 갱신해야 하는 Work Item이 곧 그 child의
parent다.

이 identity가 다음을 가른다.

- child 결과를 소비할 Work Item이 있으면 child 로그다. 그 Work Item이 parent pointer가
  가리키는 대상이다.
- 어떤 Work Item도 그 결과를 기다리지 않으면 child가 아니라 독립 follow-up 로그다.

parent/child pointer는 frontmatter에 넣지 않는다. parent 쪽은 소비할 Work Item에, child
쪽은 첫 기록 블록에 `Parent pointer: <parent 경로> Wn` 형태로 남긴다. child의 parent
줄은 자동 역참조나 양방향 동기화가 아니라 출처와 소비 위치를 사람이 읽게 하는 passive
return hint다.

parent Work Item 예시:

```markdown
- [>] W2 Complete `logs/B.md`, then resume naming decision.
```

child 첫 블록 예시:

```markdown
Parent pointer: `logs/A.md` W2

- A의 W2를 진행하려면 이 조사가 먼저 필요해 별도 로그로 분리했다.
- 이 로그가 decided 되면 A의 W2를 결과에 맞게 완료하거나 다음 행동으로 갱신한다.
```

### 현재 작업 중 새 로그를 만들 때

현재 로그에서 작업하다 새 로그가 필요해지면, 새 로그를 어디에 붙일지는 그것을 "어디서
만들었는가"(pointer chain 순서나 어느 로그에서 분리됐는지)가 아니라 "새 로그의 결과를
누가 소비하는가"로 먼저 판단한다.

| 새 로그 결과를 소비하는 대상 | 연결 방식 | 처리 |
| --- | --- | --- |
| 현재 로그의 Work Item | 새 로그는 현재 로그의 child | 현재 Work Item에 새 로그 경로와 복귀 행동을 남기고, 새 로그 첫 블록에 `Parent pointer: <현재 로그> Wn`을 남긴다. |
| known parent 로그의 Work Item | parent를 새 로그로 재배선 | parent의 소비 Work Item이 기존 child 대신 새 로그를 기다리도록 갱신한다. 그 항목이 `[>]`였다면 next pointer도 새 로그를 가리키게 된다. 현재 로그는 그 판단의 근거/source로 기록한다. |
| 어떤 Work Item도 기다리지 않음 | 독립 follow-up | 새 로그를 독립 open 로그로 두고 parent pointer를 만들지 않는다. 현재 로그에는 별도 follow-up으로만 언급한다. |
| 소비 Work Item이 모호함 | 사용자 판단 | 후보 Work Item과 근거를 보여주고 사용자가 연결을 고르게 한다. 추측으로 붙이지 않는다. |

재배선이나 독립 분리를 적용한 뒤에는 그 판단의 이유만 본문에 남기고, 토론과 근거 전체를
로그 사이에 복사하지 않는다.

child 로그가 끝나면 agent는 현재 문맥에서 알고 있는 parent pointer를 소비해야 한다.
소비한다는 것은 child 결과를 parent에 반영하고, parent의 관련 Work Item을 완료, 취소,
이관, 또는 남은 행동으로 수정한다는 뜻이다.

pointer chain 자체만으로 의존성, 소유권 이전, parent 복귀 의무가 생기지는 않는다. 복귀
의무나 의존성은 Work Item이나 날짜별 기록 블록에 명시된 경우에만 해석한다. 순환 pointer는
만들지 않는다.

known graph는 현재 작업에서 명시적으로 알려진 로그 관계다. 다음으로 제한한다.

- 사용자가 명시한 로그
- 프로젝트 진입 계약이나 project integration이 제공한 pointer chain
- 현재 next pointer의 Work Item에 직접 명시된 로그
- 현재 Work Item이나 최신 기록에 직접 명시된 로그

관련 open 로그를 찾기 위한 역방향 검색이나 owner 키워드 검색은 기본 동작이 아니다.
연결도 없고 대상도 식별할 수 없는 cross-log drift는 탐지하지 않는다.

A가 B를 가리키는 경우 B만 재개한 agent는 역검색으로 A를 찾아 수정하지 않는다. A와 B가
현재 문맥에 함께 알려졌거나, B에 parent pointer가 명시되어 있거나, 사용자가 parent 복귀를
요청한 경우에는 A가 known graph에 포함되므로 함께 처리한다.

parent에서 child 결과를 확인할 때는 다음처럼 판단한다.

- child가 아직 `open`이면 child의 next pointer를 따른다.
- child 작업이 끝났으면 parent의 기존 pointer를 해소한다.
- child 결과가 parent의 범위를 일부만 수행했으면 parent에 실제 결과와 남은 범위를
  기록한다.
- child에서 또 다른 로그가 생겼으면 위 "현재 작업 중 새 로그를 만들 때" 결정표로 연결을
  정한다.

## 점검

사용자가 로그 점검, 특정 로그 점검 또는 열린 로그 전체 점검을 요청하면 다음 순서를
따른다.

1. 사용자 요청, 프로젝트 포인터 또는 next pointer로 대상을 정한다.
2. 대상이 하나로 정해지지 않으면 후보와 next pointer를 보여주고 선택을 요청한다.
3. 사용자가 전체 open 로그를 명시한 경우에만 모두 점검한다.
4. 구조적 미완료 항목을 찾는다.
5. 각 항목을 같은 로그의 후속 기록과 known graph 안의 명시 pointer와 대조한다.
6. `완료가 명백함`, `계속 유효함`, `판단 필요`로 분류하고 근거를 보고한다.
7. 점검 중에는 사용자 요청 없이 완료, 취소, 이관, 분리를 적용하거나 로그를 수정하지
   않는다.

점검 도구가 있더라도 의미 판단은 agent가 한다. 도구는 구조, 형식, 원자적 변환, 검색을
돕는 수단이며 완료, 취소, 이관, 종료 여부를 대신 결정하지 않는다.
