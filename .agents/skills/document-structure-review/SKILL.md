---
name: document-structure-review
description:
  Use when an agent needs to create, delete, structurally review, design, or refine durable documents,
  documentation rules, authoring guides, templates, skeletons, or review feedback. Recovers document identity
  from the document and its parent and sibling relationships, then evaluates owner boundaries, scope, placement,
  change propagation, evidence, information format, and the shortest wording that preserves the decision.
---

# Document Structure Review

## Identity And Scope

이 skill의 모든 판단은 문서의 identity를 근간으로 한다. 문서 자체와 parent, 관련 sibling이
정의하는 역할에서 document identity를 복원하고, 그 역할을 기준으로 구조와 내용을 판단한다.
존재, 위치, 경계, 상태, 내용을 바꾸는 변경마다 기존 identity가 여전히 유효한지, 관련 문서의
역할 정의와 참조를 함께 바꿔야 하는지 확인한다. 아래 Core Invariants, Review Workflow,
Conditional Gates와 reference는 모두 이 근간을 상황별로 실행하는 도구이며, 다른 규칙이
identity 판단과 충돌하면 identity 판단을 우선한다.

이 skill은 durable document의 생성·삭제·검토, owner와 scope 배치, 개념 위치, 작성 지침과
template 구조, 정보 표현 형태를 판단하는 portable 절차를 제공한다.

- 특정 프로젝트의 taxonomy, 문서 형식, current work, 기록 위치, closeout이나 owner handoff를
  소유하지 않는다.
- 프로젝트가 지정한 문서·로그·owner 계약과 change 절차를 대체하지 않고 그 아래에서 판단한다.
- 사용자 의도는 중요한 근거지만 자동 정답은 아니다. 확인된 계약이나 corpus와 충돌하면 사실,
  추론, 제안을 구분해 보고한다.

## Core Invariants

- 편집 전에 대상 문서의 intended identity와 그 근거를 복원한다. 근거는 user prompt,
  project/root contract, parent/child guideline, owner map, 관련 sibling, 실제 corpus에서 찾는다.
- owner와 scope를 먼저 판정하되, 대상 문서의 역할상 경계 선언이 필요할 때만 본문에 명시한다.
  물리적 nesting, 파일 경로나 공유 template만으로 ownership이나 inheritance를 단정하지 않는다.
- 판단을 바꿀 수 있는 관계 문서만 읽고 근거가 확보되면 멈춘다. 단순 불안 때문에 모든 ancestor,
  sibling, child나 corpus로 read path를 확장하지 않는다.
- parent와 sibling의 확정된 권위는 기본 constraint이지만 axiom은 아니다. 충돌하면 하위 제안을
  수정·기각하거나, 충분한 근거와 해당 owner의 change 절차를 갖춰 상위 변경 후보로 올린다.
- 변경 후 parent의 역할 정의, owner map·taxonomy, inbound reference와 sibling 경계가 계속
  유효한지 확인하고 stale해지면 같은 변경에서 갱신하거나 해당 owner에게 보낸다.
- content 포함 경계나 authority를 복원할 수 없으면 추측하지 않고 사용자에게 확인한다.
- 적용 대상과 조건, 판단 기준, 요구 행동이나 결과를 복원 가능하게 쓴다. 권위·예외·관계가
  판정을 바꿀 때는 함께 남기고, 그 판정을 바꾸지 않는 범위에서만 줄인다.

## Review Workflow

1. 대상 문서의 intended identity와 근거를 복원한다. 새 문서는 user intent와 parent, owner map,
   관련 sibling에서 intended identity를 설계한다.
2. 변경 표면을 존재·위치·경계·상태·내용으로 분류하고, 문제의 개념 역할을 identity, scope,
   owner, hierarchy, evidence, provenance, workflow, style, information format, validation 중에서 판정한다.
   한 결함이 여러 역할에 걸치면 하나로 못 박지 말고 관련 역할을 모두 식별해 판단을 route한다.
3. 판단에 영향을 주는 parent/ancestor, owner map, sibling, child, entry 문서와 representative
   corpus만 확인한다.
4. 책임 owner와 변경 위치를 정하고 `local-only`, `ancestor-only`, `both`, `no-change` 후보를
   비교한다. 문제 문서가 항상 변경 대상이라고 가정하지 않는다.
5. 변경 유형에 해당하는 `Conditional Gates`를 적용한다. 같은 책임을 이미 소유한 문서가 있으면
   삭제, 경계 설명, 요약, 위임, 재배치 중 필요한 처리를 고른다.
6. 역할 정합과 필요한 전파를 모두 충족하는 후보 중 가장 작은 변경을 수행한다. 내용 위치를
   정한 뒤 정보 형식을 고르고, 충분성을 통과한 표현 사이에서 가장 짧은 쪽을 택한다.
7. 관련 문서의 identity와 참조가 계속 유효한지 검증하고, 확인한 사실·추론·의견과 제안을
   구분해 보고한다.

## Conditional Gates

### New Document

- 같은 책임을 기존 owner 문서나 섹션이 이미 소유하는지, 기존 문맥에 흡수할 수 있는지 먼저
  확인한다.
- 기존 문서 흡수로 해결되지 않고 owner, scope, reader, lifecycle 또는 change coupling의 실제
  차이가 독립 identity를 요구할 때만 새 문서를 만든다.
- 생성 전에 intended identity, owner와 scope, parent·sibling 관계와 배치 위치를 정한다.
- 생성 후 parent taxonomy나 index, inbound reference와 sibling 경계가 새 역할을 올바르게
  설명하는지 확인하고 필요한 문서를 함께 갱신한다.

### Content Or Identity Change

- 새 내용이 기존 identity와 같은 owner·scope이면 기존 문맥에 흡수하고, 하위 개념이면 필요한
  section에 배치한다.
- identity나 scope를 초과하면 국소적으로 끼워 넣지 않는다. owner 문서 위임, scope 확장,
  문서 분리, 상위 개념 승격을 비교한다.
- 이동, rename, split, merge나 identity·scope 변경은 영향권과 증거 기준을 높이고, 기존 anchor와
  inbound reference를 명시적 migration 없이 깨지 않는다.

### Destructive Change

- 삭제, 대체, archive나 status 전환 전에는 이 문서로만 복원되는 knowledge가 다른 owner나
  code에 남는지 확인한다.
- 참조가 current authority·active work·implementation용인지 provenance-only인지 분류한다.
  knowledge 보존이나 참조 영향이 불확실하면 보류, 보강, 새 문서, 사용자 확인 같은 비파괴
  fallback을 택한다.

### Guideline Or Template Change

- default section이나 template을 중립으로 보지 않는다. 실제 반복 subtype과 누락 위험이
  확인될 때만 추가하고, 기존 문맥 흡수나 invariant가 더 작은 해결인지 먼저 본다.
- 문서군에 subtype이 있으면, 기존 section·scope 표기의 이름이 담당 개념 전체가 아니라 한
  subtype에 묶여 다른 subtype이나 subtype이 없는 경우를 누락시키지 않는지 확인한다. 개념보다
  좁게 명명된 identity는 새 section 추가 전에 rename, 일반화, scope 재정의로 개념과 맞춘다.
- 사례와 corpus는 규칙을 검증하는 입력이지 자동 template이 아니다. guideline, skeleton,
  information format의 상세 판단은 `Reference Routing`에 따라 필요한 reference만 읽는다.

## Reference Routing

모든 reference는 선택 도구다. 현재 판단을 바꾸는 조건에 해당할 때만 읽는다.

- 구조 문제의 분류, context read path, 개념 위치, owner·scope와 변경 위치가 애매하면
  `references/review-patterns.md`를 읽는다.
- rule shape, wording, information format, guideline/template 구조나 sibling guide 비교가
  필요하면 `references/authoring-patterns.md`를 읽는다.
- 위 기준을 concrete scenario에 적용하는 방식이 애매하면 `references/EXAMPLE.md`에서 관련
  사례만 읽는다.

## Output Contract

최종 제안이나 수정안에는 관련되는 항목만 적용한다.

- 확인한 사실, 추론, 의견과 제안을 구분했는가?
- 대상 문서의 identity와 그 근거를 복원했는가?
- owner, scope와 변경 위치가 적절하며 필요한 조건부 gate를 적용했는가?
- parent의 역할 정의, owner map, inbound reference와 sibling 경계가 계속 유효한가?
- 불확실한 content 경계·authority나 파괴적 변경을 추측으로 통과시키지 않았는가?
- 적용 대상과 조건, 판단 기준, 요구 행동이나 결과가 복원되는가? 권위·예외·관계가 판정을
  바꾸면 필요한 정보도 남겼는가? 반대로, 제거해도 판정이 같은 줄은 없는가?
