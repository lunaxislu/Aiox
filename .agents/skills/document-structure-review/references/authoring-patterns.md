# Authoring Patterns

문서 구조와 owner 위치를 정한 뒤 rule shape, wording, information format이나 guideline/template
구조를 선택할 때 읽는다.

## Contents

- [Wording](#wording)
- [Rule Shape](#rule-shape)
- [Information Format](#information-format)
- [Guideline Structure Models](#guideline-structure-models)
- [Comparative Guideline Review](#comparative-guideline-review)
- [Guideline Improvement](#guideline-improvement)

## Wording

- 문제의 핵심을 흐리는 부연을 제거하고 더 정확하고 넓은 개념어를 고른다.
- 어떤 요소를 제거했을 때 합리적인 agent가 다른 대상, 판단, 행동 또는 변경 범위를 선택할 수
  있다면 충분하지 않다. 제거해도 판정이 같다면 중복 후보로 본다.
- 규칙과 예시가 이미 말하는 내용을 해설로 반복하지 않는다. 예시가 규칙을 대신하거나 새 예외를
  만들면 줄이거나 본문 규칙으로 올린다.
- 추상적 가능성만으로 예외, 필드나 안전 단계를 추가하지 않는다. 실제 사례와 재발 가능성을
  근거로 둔다.
- 너무 구체적인 사례나 실행 판단에 도움이 되지 않는 추상어를 피하고 현재 문제만큼 일반화한다.

## Rule Shape

이 형식들은 선택 도구이며 모든 개선에 강제하지 않는다. 새 규칙이 필요하면 아래 범주에서
문제에 맞는 shape를 고른다. 아래에 없는 shape는 실제 반복과 portable 근거(recurrence + 기존
축·shape로 복원 불가)를 통과할 때만 추가한다.

**적용 범위·정체성**

- `scope rule` — 적용 범위가 흔들릴 때 쓴다.
- `identity rule` — 문서나 구조의 정체성이 흔들릴 때 쓴다.

**조건 분기와 순서·재진입**

- `decision table` — 조건과 결과가 여러 갈래로 나뉠 때 쓴다.

`gate-driven flow`와 `feedback loop`는 표현 축이 절차·workflow·검토 흐름을 flow/loop 형태로
제안할 때 그 구성요소를 판정하는 instance다. 두 shape는 아래 요소 중 각자 필요한 것으로 복원한다.

- `entry` — 진입 조건.
- `state` — 반복 중 들고 도는 대상(변경 후보, 미해결 항목 등).
- `operation` — 한 번 돌 때 하는 일.
- `back-edge` — 어떤 결과가 어느 앞 단계로 되돌리는가.
- `termination` — 어떤 목표가 달성되면 빠져나오는가.
- `escalation` — loop가 스스로 끝낼 수 없을 때 넘기는 곳.

각 shape는 이 중 필요한 요소로 정의한다.

- `gate-driven flow` — 같은 대상을 순서 있는 gate로 판정하고 각 결과가 다음 행동이나 종료 경로를
  바꿀 때 쓴다. entry, gate 순서(operation), 분기 결과, termination을 명시한다. 각 분기 결과는 요구
  행동을 지목하는 지시로, 분기 간 평행한 형태로 쓴다. 행동을 다른 절이 소유하면 그 owner 절을
  지목하고, 상태·라벨만 적어 독자가 행동을 추론하게 두지 않는다. 되돌아가는 경로가 없는 단방향
  흐름이다.
- `feedback loop` — 실행이나 검증 결과가 앞 단계의 판정을 다시 발화할 수 있을 때 쓴다.
  gate-driven flow의 요소에 back-edge와 반복 state를 더해 재진입 조건과 돌아갈 단계를 명시한다.
  되돌아갈 경로와 termination을 함께 복원하지 못하면 well-formed loop가 아니다. 각 반복은 state를
  termination에 더 가깝게 바꿔야 하며, state가 진전 없이 되풀이되면 back-edge로 다시 돌지 않고
  escalation으로 넘긴다. 되돌아가는 경로만 있고 종료 조건이 없으면 loop로 부르지 않는다.

**제약·안전장치**

- `invariant` 또는 `negative rule` — 금지할 해석이 반복될 때 쓴다. negative instruction만으로
  적용 대상을 특정하기 어렵다면 classification이나 decision table로 올린다.
- `must rule` — 조건은 명확하지만 실행을 반복해서 빠뜨릴 때 쓴다.
- `destructive-change gate` — 삭제·대체·archive·status 전환의 knowledge 보존, 참조 영향과
  비파괴 fallback을 명시할 때 쓴다.

## Information Format

형태는 그 정보가 무엇인지로 고른다. 같은 판정을 복원하는 형태가 여럿이면, 복원 테스트를
통과한 것들 사이에서 독자 비용이 가장 작은 쪽을 택한다. 짧음은 복원 후의 tiebreaker이지 1차
기준이 아니다. 목표는 최대 압축이 아니라 필요한 판정을 잃지 않는 밀도다.

**Table** — 항목에 둘 이상의 독립 속성이 있고 행·열이 모두 의미 있거나, 조건별 결과 lookup이
필요할 때 쓴다. 단일 컬럼, 두 속성의 단순 쌍, 긴 prose 셀, 빈 셀이 많은 표나 절차 중간의 표는
bullet, definition, prose나 별도 section으로 같은 판정을 더 낮은 독자 비용에 복원할 수 있는지
먼저 본다.

**Bullet list** — 순서가 결과에 영향 없는 독립 항목에 쓴다. 목록의 의미를 알리는 도입문을 두고,
단일 항목에는 쓰지 않는다. 7-8개가 넘으면 범주화나 다른 형태를 검토한다.

**Numbered list** — 순서가 결과나 의미에 영향을 주는 절차, 단계나 우선순위에 쓴다. 단일
항목에는 쓰지 않는다. 절차가 단방향 순서를 넘어 재진입·분기·종료 판정을 요구하면 numbered로
누르지 말고 `Rule Shape`의 `gate-driven flow`나 `feedback loop`를 본다.

**Prose paragraph** — 근거, 맥락, why나 개념 관계처럼 서사 흐름이 필요할 때 쓴다. 관계와
사실·추론·의견 구분을 list나 table로 과분해하지 않는다.

**Definition style** (`term — explanation`) — 어휘, smell, 옵션이나 parameter처럼 term과
definition이 쌍을 이룰 때 쓴다. 한 term에 셋 이상의 독립 속성이 붙으면 table을 검토한다.

**Code block / fenced example** — 명령, 출력, template, skeleton이나 literal example을 본문 규칙과
분리할 때 쓴다. command와 output을 나누고, placeholder의 의미와 치환 방법을 설명한다.

**Callout or highlighted note** — 주요 흐름 밖의 정보이면서 놓치면 오해·손실·위험이 생길 때만
쓴다. 본문에 자연스럽게 녹으면 prose를 쓰고, 연속 callout이나 일반 규칙 강조에는 쓰지 않는다.

형식 선택 후에는 bullet 과용, prose 과분해, callout 남발, table에 prose 압축, command와 output
혼합, 단일 numbered item이 판단 복원을 방해하지 않는지 확인한다.

## Guideline Structure Models

책임 owner guideline이 구조 모델을 이미 확정했다면 아래 선택지로 override하지 않는다.

- `skeleton-primary` — 익숙한 형태와 필수 section 누락 방지가 중요할 때 쓴다. 적용 subtype과
  빈 section 생략 조건을 함께 명시한다.
- `invariant-primary` — 문서 형태는 다양하지만 owner 경계나 의미 제약만 공통일 때 쓴다.
- `decision-table` — 문서군에 명확한 subtype이나 조건별 구조가 있을 때 쓴다.
- `composition blocks` — 여러 문서 type이 일부 section을 공유하지만 전체 template을 상속하면
  안 될 때 쓴다.
- `golden document` — 추상 template보다 구체적 모범이 명확할 때 쓴다. 무엇을 보여주는지 밝히고
  incidental detail이 규칙처럼 읽히지 않게 한다.

각 default section은 delete, absorb, optional, subtype-only, invariant-only 후보를 먼저
통과시킨다. skeleton이 없을 때의 누락 위험과 있을 때의 불필요한 작성 압력을 비교한다.

## Comparative Guideline Review

- 대칭은 baseline이지 요구사항이 아니다. parallel role이면 순서와 역할을 평행하게 두되,
  차이가 필요하면 document role이나 content property로 설명한다.
- heading이 같다는 이유로 section meaning을 복사하지 않는다.
- 한 문서군에 sub-kind가 있으면 skeleton 적용 대상을 명시한다.
- skeleton example은 자신이 가르치는 link form, indentation, evidence shape와 fence 규칙을 지킨다.
- stale하거나 충돌하는 주장을 판단하기 전에 statement의 normative, descriptive, provenance 같은
  document role을 먼저 분류한다.

## Guideline Improvement

- 반복되는 owner, placement나 skeleton 혼동은 개별 문서 문제가 아니라 guideline 개선 후보인지
  본다. 단발성 오적용이면 local 수정으로 끝낸다.
- 새 문서군에는 owner, reader, required evidence, lifecycle과 sibling 관계를 먼저 제안한다.
- 같은 규칙을 여러 문서에서 재정의하지 않고, 재배치·축약·경계 명확화가 새 규칙보다 작은지 본다.
- 구조 변경 후보가 갈리면 1-3개 authoring scenario로 다음 작성자의 read path와 오판 가능성을
  비교한다.
- router나 요약 문서는 세부 절차를 반복하지 않고 시작 위치와 확인 대상을 복원 가능하게 쓴다.
- 변경 후 문제 사례를 포함하고 제외할 사례를 열지 않으며 owner 경계와 충돌하지 않는지 확인한다.
