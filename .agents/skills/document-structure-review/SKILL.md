---
name: document-structure-review
description:
  Use when an agent needs to structurally review, design, or refine durable documents, documentation rules,
  authoring guides, templates, skeletons, or review feedback that affects document structure. Helps decide document
  scope, owner boundaries, section placement, concept hierarchy, duplication, hidden rules, evidence/provenance
  handling, and the shortest sufficiently general wording.
---

# Document Structure Review

문서를 새로 쓰거나, 기존 문서를 검토하거나, 작성 지침·템플릿·skeleton을 정리할 때 사용한다.
목표는 문장을 그럴듯하게 고치는 것이 아니라, 다음 작성자나 agent가 같은 판단을 복원할 수
있도록 scope, owner, 개념 위치, 근거, 예외, 검증을 선명하게 만드는 것이다.

구조 문제의 종류나 적합한 rule shape가 애매하면 `references/EXAMPLE.md`의 portable 사례를
읽는다.

## Scope / Non-Goals

이 skill은 문서 구조, owner 배치, 작성 지침과 template의 형태를 검토하는 portable한 사고
절차를 제공한다. 문서를 새로 만들기 전의 구조 제안, 작성 지침 설계, 작성 중 발견한 구조
문제를 authoring guide 개선 후보로 되돌리는 판단을 포함한다.

- 특정 프로젝트의 문서 형식, taxonomy, current work 선택, 기록 저장 위치, closeout,
  owner handoff를 소유하지 않는다.
- 프로젝트가 별도 작업 기록 규칙을 가진 경우, 그 규칙을 대체하지 않는다.
- 프로젝트나 현재 작업이 지정한 로그/owner 규칙을 대체하지 않고, 그 규칙 아래에서 문서 구조를
  판단한다.

## Review Loop

1. 문제가 된 문장, 섹션, 규칙, 예시를 먼저 식별한다.
2. 그 내용의 개념 역할을 판정한다: identity, scope, owner boundary, parent/child,
   sibling, evidence, provenance, authoring workflow, style, validation.
3. 현재 문서를 고립된 파일로 보지 말고, parent/ancestor 계약, 문서 작성 흐름, sibling
   guideline, owner map, 관련 entry 문서와의 관계를 먼저 확인한다.
4. 변경 대상을 문제 문서로 단정하지 않는다. 같은 구조 smell이 parent/ancestor 경계에서
   반복되거나 smell이 ancestor 계약 자체에 위치하면 `local-only`, `ancestor-only`, `both`,
   `no-change` 후보를 분리한다.
   parent/ancestor 계약은 기본 constraint이되 axiom은 아니다. 단 ancestor 변경은 영향권과
   증거 기준이 높고, 이 skill이 단독 override하지 않으며 해당 owner의 change 절차를 따른다.
5. 같은 책임을 이미 소유한 문서나 섹션이 있을 수 있으면 먼저 확인한다.
6. 확인한 내용이 있어도 곧바로 중복으로 보지 않는다. 현재 문서에 삭제, 경계 설명, 요약,
   위임, 재배치 중 무엇이 필요한지 판단한다.
7. 새 섹션이나 새 문서를 추가하기 전에 기존 문맥으로 흡수하거나 제목을 바꾸거나 내용을
   옮겨 해결할 수 있는지 본다.
8. 현재 문제를 해결하는 가장 짧고 일반화 가능한 문장을 제안한다.

## Context Read Path

특정 문서를 검토할 때는 그 문서만 읽고 판단하지 않는다. 판단을 바꿀 수 있는 관계만 read
path에 넣어, 문서가 어떤 계약 아래 있고 어떤 문서와 역할을 나누는지 확인한다.

- 직접 parent 계약에서 시작해, 그 계약이 다시 상위 계약을 위임하면 현재 판단에 영향을 주는
  ancestor 계약까지 따라간다.
- root나 scope boundary에 도달했거나, 더 올라가도 현재 문서의 owner·scope·작성 흐름 판단을
  바꾸지 않으면 멈춘다.
- 프로젝트가 문서 작성·수정 흐름을 따로 정의하면, 현재 변경이 그 흐름에서 언제·어떻게
  수행되어야 하는지 확인한다.
- 문서 taxonomy, owner map, index/entry 문서가 현재 문서의 owner나 독자 역할을 정한다면 확인한다.
- 같은 계층의 sibling guideline이나 template은 대칭·차이 판단에 영향을 줄 때만 비교한다.
- child나 slice 문서는 현재 문서가 skeleton, invariant, index, routing 중 무엇을 소유하는지
  판단해야 할 때만 확인한다.
- 판단 근거가 확보되면 멈춘다. 단순 불안 때문에 repo 전체 read path나 모든 sibling으로
  확장하지 않는다.

## Concept Placement

문장을 다듬기 전에 개념의 위치가 맞는지 본다.

- 독립 섹션인가, 도입부나 상위 문맥에 흡수될 내용인가?
- A가 B의 하위 개념인가, 아니면 A와 B가 같은 레벨의 sibling인가?
- 현재 제목이 잘못된 상위 개념을 만들고 있지 않은가?
- 하위에 들어간 내용이 사실은 sibling이면, 상위 제목을 바꾸고 내용을 재배치한다.
- 같은 계열의 개념이라도 목적이 다르면 같은 레벨로 둔다. 예: 직접 근거와 provenance는
  모두 traceability 계열일 수 있지만 서로의 하위 개념은 아닐 수 있다.
- 도구 사용법처럼 보이는 내용도 문서의 정체성이나 편집 조건을 설명하는 흐름이면 도입부에
  흡수하는 편이 자연스러울 수 있다.

## Structure Smells

사용자가 "자리가 이상하다", "중복 같다", "빙빙 돈다", "없어도 될 것 같다",
"이건 다른 owner가 소유해야 한다"처럼 구조적 불편함을 말하면 고가치 신호로 보고, 문장을
고치기 전에 어떤 구조 문제인지 분류한다.

- `duplicated ownership`: 같은 지식이 둘 이상의 owner에 있다.
- `owner or altitude mismatch`: 내용이 잘못된 owner나 잘못된 계층에 놓였다.
- `hidden or implicit authority`: 필요한 규칙, scope, 예외, 결정이 본문 규칙으로 드러나지
  않고 예시, 제목, 관례, 이전 논의 안에만 숨어 있다.
- `orphan local rule`: parent/ancestor 계약이나 owner map과 연결되지 않은 국소 규칙이 생겨
  적용 범위와 우선순위를 복원할 수 없다.
- `hidden sub-kind`: 같은 문서군 안에 index, slice, router, standalone처럼 서로 다른 구조
  subtype이 있는데 skeleton이나 규칙이 단일 형태만 전제한다.
- `over-provisioned structure`: skeleton이나 default section이 아직 없는 subtype, 미래 내용,
  낮은 빈도의 예외를 전제해 agent가 불필요한 섹션을 채우도록 압박한다.
- `copied section meaning`: sibling guideline의 같은 heading이나 섹션 순서를 문서 role 재판정
  없이 복사해, 문서 type마다 달라야 하는 의미가 흐려진다.
- `reverse or circular dependency`: 하위 문서가 자신이 의존하는 상위 규칙을 정의하거나
  지배한다.
- `excessive read path`: 하나의 판단을 복원하려고 너무 많은 문서를 따라가야 한다.
- `contradiction`: 둘 이상의 owner가 양립할 수 없는 주장을 한다.
- `abstract destructive gate`: 되돌리기 어려운 변경을 "더 이상 중요하지 않음", "참조 없음",
  "obsolete" 같은 추상어만으로 허용하고, 확인할 문서군·참조 범위·fallback을 드러내지 않는다.
  hidden authority와 달리 변경이 비가역이라, 숨은 판정을 본문 절차로 끌어내는 우선순위가 높다.

## Owner And Scope

- 문서가 무엇을 소유하는지 먼저 쓴다.
- 물리적 nesting, 파일 경로나 공유 template만으로 ownership 또는 inheritance를 단정하지
  않는다. 판단을 바꿀 수 있는 명시적 계약, 실제 적용 범위, authority, dependency, lifecycle과
  change coupling만 확인한다.
- 문서가 소유하지 않는 내용은 복사하지 말고 owner 문서로 링크하거나 위임한다.
- 이미 다른 문서가 소유하는 원칙을 발견해도, 현재 문서에 경계 문장으로 필요한지 판단한다.
- 현재 문서에 필요하다면 세부 절차를 반복하지 말고 "어디가 소유하는지"와 "이 문서에서는
  어떻게 소비하는지"만 남긴다.
- 특정 프로젝트, repo, 팀의 이름이나 path는 portable skill이나 일반 지침 본문에 박지 않는다.
  사례가 필요하면 추상 패턴으로 바꾼다.

## Wording Rules

- 문제의 핵심을 흐리는 부연을 제거한다.
- 더 긴 문장으로 포괄하려 하기보다, 더 정확하고 넓은 개념어를 고른다.
- 규칙과 예시가 이미 말하는 내용을 별도 해설 문장으로 반복하지 않는다.
- 예시는 규칙을 돕는 용도다. 예시가 규칙을 대신하거나 새 예외처럼 읽히면 줄이거나 빼라.
- 추상적 가능성만으로 예외, 필드, 안전 단계를 추가하지 않는다. 실제 사례와 재발 가능성을
  근거로 둔다.
- 너무 구체적인 사례는 일반 규칙을 흐리고, 너무 추상적인 문장은 실행 시 판단에 도움이
  되지 않는다. 현재 문제를 해결할 만큼만 일반화한다.

## Rule Shape

새 규칙을 추가하기 전에 어떤 형식이 필요한지 고른다.

- `scope rule`: 적용 범위가 흔들릴 때 사용한다.
- `identity rule`: 문서나 구조의 정체성이 흔들릴 때 사용한다.
- `decision table`: 결과가 여러 갈래로 나뉠 때 사용한다.
- `invariant` 또는 `negative rule`: 금지할 해석이 반복될 때 사용한다.
  negative rule만으로 적용 대상 claim을 특정하기 어려워 세션마다 다르게 읽히면, claim type
  classification이나 decision table로 올린다.
- `must rule`: 조건은 명확하지만 agent가 실행을 미루거나 빠뜨릴 때 사용한다.
- `destructive-change gate`: 삭제·대체·archive·status 전환처럼 되돌리기 어려운 변경에 쓴다.
  추상 판정어 대신 두 가지를 확인하게 한다: 이 문서로만 복원되는 knowledge가 다른 owner나
  code에 남는가, 그 문서를 가리키는 참조가 현재 권위·작업·구현용인가 provenance-only인가.
  하나라도 불확실하면 비파괴 fallback(보류, 보강, 새 문서, 사용자 확인)으로 보낸다.

이 형식들은 선택 도구다. 모든 문서 개선에 강제하지 않는다.

## Guideline Structure Models

작성 지침이나 authoring guide를 만들거나 검토할 때는, 그 지침이 다루는 문서군에 맞는 구조
모델을 고른다.

- 이미 책임 owner guideline이 구조 모델을 확정했다면, 이 목록으로 그 결정을 override하지
  않는다. 이 목록은 새 지침을 설계하거나 기존 지침의 구조 문제가 드러났을 때 쓰는 선택
  도구다.
- skeleton이나 default section은 중립이 아니라 비용이다(`over-provisioned structure` smell). 각 default section은
  delete, absorb, optional, subtype-only, invariant-only 후보를 먼저 통과해야 한다.
- 모델 선택 전에 묻는다: 실제 반복 생성되는 subtype이 있는가, skeleton이 없으면 필요한
  섹션을 빠뜨리는가, skeleton이 있으면 불필요 섹션을 채우는가, invariant-only가 더 작은
  해결인가.
- `skeleton-primary`: 새 문서가 익숙한 형태를 따라야 하고 예상 섹션 누락이 주요 위험일 때
  쓴다. 빈 섹션 생략과 skeleton 적용 대상은 함께 명시한다.
- `invariant-primary`: 문서 형태는 다양하지만 owner 경계나 의미 제약 몇 가지를 반드시
  보존해야 할 때 쓴다.
- `decision-table`: 문서군에 명확한 subtype이나 조건별 케이스가 있을 때 쓴다.
- `composition blocks`: 여러 문서 type이 재사용 가능한 섹션을 공유하지만 하나의 전체
  template을 상속하면 안 될 때 쓴다.
- `golden document`: 추상 template보다 구체적 모범 문서가 더 명확할 때 쓴다. 예시는
  drift하거나 incidental detail을 포함할 수 있으므로 무엇을 보여주는 예시인지 함께 적는다.

## Comparative Guideline Review

Sibling guideline이나 template을 검토할 때는 편집 전에 구조를 먼저 비교한다.

- 대칭은 기본값이지 요구사항이 아니다.
- 문서들이 parallel role을 가지면 섹션 순서와 역할을 가급적 평행하게 둔다.
- 한 sibling에 다른 섹션이나 규칙이 필요하면, 그 차이를 요구하는 document role이나 content
  property를 명시한다.
- heading이 같다는 이유만으로 section meaning을 문서 type 사이에서 복사하지 않는다.
- 한 문서군 안에 구조적 sub-kind가 있으면 skeleton이 어느 sub-kind를 대상으로 하는지
  명시한다.
- skeleton 예시는 link form, indentation, evidence shape, fenced example boundary처럼 자신이
  가르치는 규칙을 스스로 지켜야 한다.
- stale하거나 충돌하는 주장을 검토할 때는 무엇이 stale한지 판단하기 전에 statement의
  document role을 먼저 분류한다.

## Authoring Guideline Improvement

문서를 새로 만들거나 작성하는 과정에서 반복되는 혼란, 구조 문제, owner 경계 문제를 발견하면
개별 문서만 고치지 말고 작성 지침, template, skeleton 개선 후보인지 판단한다.

- 새 문서군을 만들 때는 먼저 owner, reader, required evidence, lifecycle, sibling 관계를
  제안한다.
- 단순화가 우선이다. 편의나 불안 때문에 문서, 필드, 섹션, 예외를 계속 늘리지 않는다.
- 같은 규칙을 여러 문서에서 재정의하지 않는다.
- 작성 중 같은 문제가 반복되면 개별 문서 내용 문제가 아니라 authoring guide나 skeleton
  문제인지 본다.
- skeleton, template, owner boundary, ancestor contract처럼 하위 문서나 작성 흐름에 구조적
  영향을 주는 변경 후보가 갈리면, 1-3개 concrete authoring scenario로 비교한다. agent가
  어느 문서를 먼저 읽는지, 현 구조에서 어떤 owner·skeleton 오판을 하는지, 각 후보가 그
  행동을 어떻게 바꾸는지, read path가 과하게 늘지 않는지 본다.
- 작성 지침을 바꾸기 전에 재배치, 축약, owner 경계 명확화로 해결할 수 있는지 먼저 확인한다.
- router나 요약 문서는 세부 절차를 반복하지 않고, 다음 작성자가 어디서 시작하고 무엇을
  확인해야 하는지만 복원 가능하게 쓴다.
- 새 문서나 새 지침이 read path를 늘리는지 먼저 본다. 기존 문서의 재배치, 축약, 삭제로
  해결할 수 있으면 새로 만들지 않는다.
- 기존 문구가 유효한 사례를 제외하거나 제외해야 할 사례를 허용하게 읽히면 scope 표현을
  조정한다. 단순히 더 자연스럽다는 이유만으로 바꾸지 않는다.
- 조정 후에는 새 표현이 문제 사례를 포함하는지, 제외해야 할 사례까지 열지 않는지, owner
  경계와 충돌하지 않는지 다시 점검한다.

## Output Checklist

최종 제안이나 수정안을 내기 전에 확인한다.

- 확인한 사실, 추론, 의견과 제안을 구분해 보고하는가?
- 이 내용의 owner와 scope가 드러나는가?
- parent/child와 sibling 관계가 뒤섞이지 않았는가?
- parent/ancestor 계약, 문서 작성 흐름, owner map, 관련 sibling/child와의 상호작용을 확인했는가?
- parent/ancestor 계약 자체가 stale, overbroad, misplaced일 가능성을 후보로 봐야 하는 사례인가?
- 필요한 경우 `local-only`, `ancestor-only`, `both`, `no-change` 후보를 비교했는가?
- 이미 소유한 문서를 확인했는가?
- 중복 제거가 아니라 경계 설명이나 위임이 필요한 사례는 아닌가?
- 새 섹션이나 새 문서 없이 해결 가능한가?
- 현재 문제를 해결하는 가장 짧은 문장인가?
- 판단에 필요한 규칙, 예외, 적용 범위가 예시나 관례 속에만 숨어 있지 않고 본문에서
  드러나는가?
- 규칙이 모호한 negative instruction인지, 실행 가능한 classification이나 decision table인지
  확인했는가?
- 삭제·대체·archive·status 전환 같은 고위험 변경을 허용한다면, 추상 판정어 대신 확인할
  참조 범위와 불확실할 때의 비파괴 fallback이 본문에 있는가?
- 예시, 근거, provenance, authoring workflow, style이 한 섹션에서 섞여 의미를 흐리지 않는가?
- skeleton이나 template 예시가 fence로 제대로 감싸져 예시 heading이 실제 문서 heading으로
  누출되지 않는가?
- 문서 작성 중 발견한 반복 문제를 개별 문서 수정으로 끝낼지, authoring guide나 template
  개선 후보로 볼지 판단했는가?
