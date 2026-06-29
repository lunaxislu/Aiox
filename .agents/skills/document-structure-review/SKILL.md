---
name: document-structure-review
description:
  Use when an agent needs to structurally review, design, or refine durable documents, documentation rules,
  authoring guides, templates, skeletons, or review feedback that affects document structure. Helps decide document
  scope, owner boundaries, section placement, concept hierarchy, duplication, hidden rules, evidence/provenance
  handling, information format selection, and the shortest sufficiently general wording.
---

# Document Structure Review

문서를 새로 쓰거나, 기존 문서를 검토하거나, 작성 지침·템플릿·skeleton을 정리할 때 사용한다.
목표는 문장을 그럴듯하게 고치는 것이 아니라, 다음 작성자나 agent가 같은 판단을 복원할 수
있도록 scope, owner, 개념 위치, 근거, 예외, 표현 형태, 검증을 선명하게 만드는 것이다.

이 검토의 근간은 문서의 identity다 — 이 문서가 자신과 상위·sibling에서 어떤 역할로 정의되는지를
기준으로 구조와 내용을 판단한다. 문서를 생성·삭제하거나 내용을 추가·갱신할 때마다, 그 변경이
관련 문서에서 이 문서의 역할 의미를 깨지 않는지, 기존 역할이 그 변경에서도 유효한지, 내용이나
구조를 함께 바꿔야 하는지를 본다. 아래 규칙들은 이 근간을 상황별로 실행하는 도구다.

구조 문제의 종류나 적합한 rule shape가 애매하면 `references/EXAMPLE.md`의 portable 사례를
읽는다.

## Scope / Non-Goals

이 skill은 문서 구조, owner 배치, 작성 지침과 template의 형태, 정보의 표현 형태를 검토하는
portable한 사고 절차를 제공한다. 문서를 새로 만들기 전의 구조 제안, 작성 지침 설계, 작성 중 발견한 구조
문제를 authoring guide 개선 후보로 되돌리는 판단을 포함한다.

- 특정 프로젝트의 문서 형식, taxonomy, current work 선택, 기록 저장 위치, closeout,
  owner handoff를 소유하지 않는다.
- 프로젝트가 별도 작업 기록 규칙을 가진 경우, 그 규칙을 대체하지 않는다.
- 프로젝트나 현재 작업이 지정한 로그/owner 규칙을 대체하지 않고, 그 규칙 아래에서 문서 구조를
  판단한다.

## Intended Role Recovery

지침, skeleton, template, owner 문서를 바꾸기 전에 사용자가 그 문서에 기대한 역할과 그 근거를
먼저 복원한다. 문서 구조 검토는 예쁜 형식이나 사례 목록을 고르는 일이 아니라, 해당 문서가
프로젝트 계약 안에서 어떤 역할을 수행해야 하는지 확인하는 일이다.

- 사용자가 이 문서를 어떤 역할로 쓰게 하려는지 확인한다.
- 그 의도의 근거가 user prompt, project/root contract, parent/child guideline, log, 실제 문서
  corpus 중 어디에 있는지 구분한다.
- 사용자 의도는 중요한 입력이지만 자동 정답은 아니다. project contract, owner boundary,
  실제 corpus와 충돌하면 확인한 사실, 추론, 제안을 나눠 보고한다.
- 사례와 corpus는 역할과 근거를 검증하고 오해를 드러내는 입력이지, 따라 쓸 template이 아니다.
  template 승격 판단은 `Guideline Structure Models`가 소유한다.
- 이 문서에 어떤 내용이 들어가야 하는지(content 포함 경계)가 user prompt, 계약, owner map,
  corpus로 복원되지 않으면 추측하지 말고 사용자에게 확인한다.

## Review Loop

1. 문제가 된 문장, 섹션, 규칙, 예시를 식별하고, 그 문서의 intended role과 근거, 계약 파생
   관계를 먼저 복원한다. 복원 방법은 `Intended Role Recovery`와 `Context Read Path`를 따른다.
2. 그 내용의 개념 역할을 판정한다: identity, scope, owner boundary, parent/child,
   sibling, evidence, provenance, authoring workflow, style, information format, validation.
3. 현재 문서를 고립된 파일로 보지 말고, parent/ancestor 계약, 문서 작성 흐름, sibling
   guideline, owner map, 관련 entry 문서와의 관계를 먼저 확인한다.
4. 변경 대상을 문제 문서로 단정하지 않는다. 같은 구조 smell이 parent/ancestor 경계에서
   반복되거나 smell이 ancestor 계약 자체에 위치하면 `local-only`, `ancestor-only`, `both`,
   `no-change` 후보를 분리한다.
   parent/ancestor 계약은 기본 constraint이되 axiom은 아니다. 상위나 sibling의 내용이
   참·권위로 확정된 경우, 하위 변경이 그것과 정합하는지 먼저 검증하고, 충돌하면 하위 제안을
   수정·기각하거나 증거와 함께 상위 변경(`both`·`ancestor-only`)으로 승격한다. ancestor 변경은
   영향권과 증거 기준이 높고, 이 skill이 단독 override하지 않으며 해당 owner의 change 절차를
   따른다.
5. 같은 책임을 이미 소유한 문서나 섹션이 있을 수 있으면 먼저 확인한다.
6. 확인한 내용이 있어도 곧바로 중복으로 보지 않는다. 현재 문서에 삭제, 경계 설명, 요약,
   위임, 재배치 중 무엇이 필요한지 판단한다.
7. 새 섹션이나 새 문서를 추가하기 전에 기존 문맥으로 흡수하거나 제목을 바꾸거나 내용을
   옮겨 해결할 수 있는지 본다.
8. 내용 위치가 정해지면, 그 정보를 어떤 표현 형태로 둘지 `Information Format`에 따라 고른다.
9. 현재 문제를 해결하는 가장 짧고 일반화 가능한 문장을 제안한다.

## Context Read Path

특정 문서를 검토할 때는 그 문서만 읽고 판단하지 않는다. 판단을 바꿀 수 있는 관계만 read
path에 넣어, 문서가 어떤 계약 아래 있고 어떤 문서와 역할을 나누는지 확인한다.

- 직접 parent 계약에서 시작해, 그 계약이 다시 상위 계약을 위임하면 현재 판단에 영향을 주는
  ancestor 계약까지 따라간다.
- guideline 계층이 있으면 project/root contract → parent guideline → child guideline → 실제
  corpus 순서로 파생 관계를 확인한다. 단 이 경로는 판단을 바꿀 수 있는 범위까지만 따른다.
- root나 scope boundary에 도달했거나, 더 올라가도 현재 문서의 owner·scope·작성 흐름 판단을
  바꾸지 않으면 멈춘다.
- 프로젝트가 문서 작성·수정 흐름을 따로 정의하면, 현재 변경이 그 흐름에서 언제·어떻게
  수행되어야 하는지 확인한다.
- 문서 taxonomy, owner map, index/entry 문서가 현재 문서의 owner나 독자 역할을 정한다면 확인한다.
- 같은 계층의 sibling guideline이나 template은 대칭·차이 판단에 영향을 줄 때만 비교한다.
- child나 slice 문서는 현재 문서가 skeleton, invariant, index, routing 중 무엇을 소유하는지
  판단해야 할 때만 확인한다.
- representative corpus나 과거 agent 사례는 규칙의 적용 가능성과 오해 가능성을 확인할 때만
  읽는다.
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
- 작성 중 새 내용이 현재 문서의 정체성이나 scope를 벗어나면, 끼워넣기 전에 상위 문서부터
  관계와 흐름을 확인한 뒤(→ `Context Read Path`) 결정한다. 새 내용을 owner 문서로 위임할지,
  문서 정체성을 넓혀 포함할지, 문서를 분리하거나 상위 개념으로 승격할지를 새 내용과 기존
  내용의 관계(같은 owner·sibling·하위·무관)와 재발 빈도로 가른다.
- 한 문서의 변경은 고립되지 않는다. 그 변경이 상위 owner map·taxonomy가 이 문서를 가리키는
  identity, inbound 참조, sibling의 cross-reference나 대칭을 stale하게 만드는지 확인하고,
  stale하면 같은 변경에서 함께 갱신하거나 영향이 크면 해당 owner의 change 절차로 보낸다.
- 정체성이나 scope를 바꾸는 재구조화는 영향 범위가 크므로 증거 기준이 높고, 기존 anchor는
  명시적 migration 없이 보존한다.
- 이미 다른 문서가 소유하는 원칙을 발견해도, 현재 문서에 경계 문장으로 필요한지 판단한다.
- 현재 문서에 필요하다면 세부 절차를 반복하지 말고 "어디가 소유하는지"와 "이 문서에서는
  어떻게 소비하는지"만 남긴다.
- 특정 프로젝트, repo, 팀의 이름이나 path는 portable skill이나 일반 지침 본문에 박지 않는다.
  사례가 필요하면 추상 패턴으로 바꾼다.

## Wording Rules

- 문제의 핵심을 흐리는 부연을 제거한다.
- 더 긴 문장으로 포괄하려 하기보다, 더 정확하고 넓은 개념어를 고른다.
- 짧음은 복원가능성과 관련 정보의 응집(관계·흐름 보존)을 해치지 않는 선까지의 목표다.
  근거, 관계, 맥락을 잃을 만큼 줄이지 않는다.
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

## Information Format

문서 구조(section 배치, owner 경계)가 정해진 뒤, 개별 정보를 어떤 형태로 쓸지 고른다.
목표는 독자가 정보를 조합하지 않고 복원할 수 있는 형태다. 여러 형태가 가능하면 가장 짧은
쪽을 택한다.

### 형태별 사용 기준

**Table** — 항목이 2개 이상의 독립적인 속성을 가지고 행·열 모두 의미 있을 때 쓴다.
조건과 결과가 여러 갈래로 나뉘는 decision mapping이나 빠른 lookup이 필요한 reference에
적합하다.

피해야 할 때: 단일 컬럼, 2속성 쌍, 셀에 긴 prose가 들어가는 경우, 절차 단계 중간 삽입,
빈 셀이 많은 경우. 각각 bullet list, definition style, 별도 섹션, prose나 numbered list가
더 짧은지 먼저 본다.

**Bullet list** — 순서가 결과에 영향 없는 독립 항목을 열거할 때 쓴다. 리스트 전에는 항목들이
무엇의 목록인지 알려주는 introductory sentence를 둔다. 단일 항목에는 쓰지 않고, 항목이
7-8개를 넘으면 카테고리화나 다른 구조를 고려한다.

**Numbered list** — 순서가 결과나 의미에 영향을 주는 절차, 단계, 우선순위에 쓴다. 단일
항목에는 쓰지 않는다.

**Prose paragraph** — 근거, 맥락, 배경, why처럼 서사 흐름이 필요한 설명에 쓴다. 개념 간 관계나
사실·추론·의견의 구분을 흐름 안에서 전달해야 하면 list나 table로 과분해하지 않는다.

**Definition style** (`term — explanation`) — 어휘, smell 이름, 옵션, 파라미터처럼 term과
definition이 쌍을 이룰 때 쓴다. 한 term에 3개 이상의 독립 속성이 붙으면 table을 고려한다.

**Code block / fenced example** — 명령, 출력, 예시, template, skeleton처럼 본문 규칙과 분리해야
할 literal content에 쓴다. 적용 가능한 경우 언어 식별자를 붙인다. 명령(command)과 출력(output)은
분리된 블록으로 두고, placeholder가 있으면 의미와 치환 방법을 설명한다. multi-line inline
code 대신 fenced block을 쓴다.

- command: 실행 가능한 명령어.
- output: 명령과 분리된 실제 또는 예상 출력.
- example/template: 형태를 보여주는 예시나 채워야 할 구조.
- evidence: claim을 지지하는 파일, 위치, range. 구체 형식은 프로젝트 규칙을 따른다.

**Callout or highlighted note** — 주요 흐름 밖의 정보로, 독자가 놓치면 오해, 손실, 위험이
생기는 경우에만 쓴다. 본문 흐름에 자연스럽게 녹으면 callout 대신 prose를 쓴다. 여러 callout을
연속 배치하지 않는다. 길어지면 전용 섹션과 heading으로 바꾼다. 일반 규칙이나 일상적 정보를
callout으로 강조하지 않는다.

### 잘못된 형태 선택과 agent 오류

- **bullet point 과용**: 맥락 손실, 중요도 희석, 왜 중요한지 복원 불가.
- **prose를 list로 과분해**: 논리 흐름 단절, 관계와 big picture 손실.
- **callout 남발**: 독자가 callout을 건너뛰어 정작 중요한 warning도 무시함.
- **table에 prose 욱여넣기**: 셀이 길어지고 행 사이 비교가 어려워짐.
- **개념을 table로 압축**: 관계나 흐름이 필요한 내용을 셀로 밀어 넣어 오해를 만듦.
- **code block 안에 명령과 출력 혼합**: 실행할 부분과 확인할 부분이 섞임.
- 속성이 3개 이상인데 `term — explanation` 패턴을 반복한다.
- 단일 항목에 numbered list를 써 절차처럼 보이게 만든다.

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
- skeleton, template이나 example을 본 agent가 어떤 불필요한 section이나 claim을 추가할지
  예상하고, optional 생략 조건이나 negative rule로 그 오해를 막는다.
- 사례, subtype 표와 golden document는 규칙을 검증하는 입력이지 기본 template이 아니다.
  문서 역할상 template이 필요하다는 근거가 있을 때만 template으로 승격한다.
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
- 사용자가 이 문서에 기대한 역할과 그 근거를 확인했는가?
- project/root contract → parent guideline → child guideline → actual corpus로 규칙이 어떻게
  파생되는지 설명 가능한가?
- 이 내용의 owner와 scope가 드러나는가?
- parent/child와 sibling 관계가 뒤섞이지 않았는가?
- parent/ancestor 계약, 문서 작성 흐름, owner map, 관련 sibling/child와의 상호작용을 확인했는가?
- 상위나 sibling이 참·권위로 확정된 경우, 하위 변경이 그것과 정합하는지 검증하고 충돌 시
  수정·기각·승격을 정했는가?
- parent/ancestor 계약 자체가 stale, overbroad, misplaced일 가능성을 후보로 봐야 하는 사례인가?
- 필요한 경우 `local-only`, `ancestor-only`, `both`, `no-change` 후보를 비교했는가?
- 이미 소유한 문서를 확인했는가?
- 중복 제거가 아니라 경계 설명이나 위임이 필요한 사례는 아닌가?
- 새 섹션이나 새 문서 없이 해결 가능한가?
- 새 내용이 문서의 정체성이나 scope를 초과하는데 국소 수정으로 끼워넣고 있지 않은가?
  위임·scope 확장·분리·승격을 비교했는가?
- 이 변경이 상위 owner map의 이 문서 identity나 sibling 참조·대칭을 stale하게 만드는데
  함께 갱신하지 않고 있지 않은가?
- content 포함 경계가 복원되지 않을 때 추측하지 않고 사용자에게 확인했는가?
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
- 사례를 template으로 고정하지 않고, 역할 판정과 composition 판단을 돕는 입력으로 사용했는가?
- 문서 작성 중 발견한 반복 문제를 개별 문서 수정으로 끝낼지, authoring guide나 template
  개선 후보로 볼지 판단했는가?
- 표현 형태(table, bullet, numbered, prose, definition, code block, callout)가 정보의 차원,
  순서와 목적에 맞게 선택됐는가?
- callout이 본문 흐름에 자연스럽게 녹을 수 있는 정보를 강조 목적으로만 분리하지 않았는가?
  callout 연속 배치나 과다 사용이 없는가?
- code block에서 실행 가능한 명령, 출력, 예시가 분리됐는가? placeholder가 있으면 설명이
  함께 있는가?
- 단일 컬럼 table, 2속성 쌍 table, 절차 중간의 table처럼 더 짧은 형태로 대체할 수 있는
  table이 없는가?
- bullet list로 분해된 항목이 사실은 prose로 써야 할 근거, 맥락, 관계 설명이 아닌가?
  리스트 전에 introductory sentence가 있는가?
- skeleton이 불필요한 section이나 claim을 채우도록 압박하지 않는가?
- optional section의 생략 조건이 드러나는가?
- example이나 golden document의 incidental detail이 규칙처럼 읽히지 않는가?
