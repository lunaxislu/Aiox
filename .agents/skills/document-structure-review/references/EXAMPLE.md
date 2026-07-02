# Document Structure Review Examples

이 문서는 document-structure-review skill의 판단 패턴을 보여주는 portable 사례 모음이다.
특정 프로젝트 이름, repo path, 팀 이름, 원문 로그를 보존하지 않는다. 사례는 다음 작성자가
같은 구조 판단을 복원할 수 있을 만큼만 추상화한다.

## Contents

1. [Misfiled Owner Map](#1-misfiled-owner-map)
2. [Evidence And Sources Are Siblings](#2-evidence-and-sources-are-siblings)
3. [Tool Guidance Belongs In Document Identity](#3-tool-guidance-belongs-in-document-identity)
4. [Index And Slice Need Different Rules](#4-index-and-slice-need-different-rules)
5. [Same Section Name, Different Drift Meaning](#5-same-section-name-different-drift-meaning)
6. [Example Leaks A Hidden Rule](#6-example-leaks-a-hidden-rule)
7. [Repeated Writing Problem Becomes Guideline Improvement](#7-repeated-writing-problem-becomes-guideline-improvement)
8. [Destructive Change Needs A Gate](#8-destructive-change-needs-a-gate)
9. [Ancestor Contract May Be The Defect](#9-ancestor-contract-may-be-the-defect)
10. [Over-provisioned Skeleton Section](#10-over-provisioned-skeleton-section)
11. [New Content Outgrows Document Scope](#11-new-content-outgrows-document-scope)
12. [New Document Needs An Independent Identity](#12-new-document-needs-an-independent-identity)
13. [Reader Path And Loop Are Misaligned](#13-reader-path-and-loop-are-misaligned)

## 1. Misfiled Owner Map

Situation:

문서 시스템의 taxonomy와 owner map을 설명하는 문서가 특정 leaf document type 아래에 놓여
있다. 해당 leaf type의 작성 규칙은 그 문서가 설명하는 taxonomy에 다시 의존한다.

Structure smell:

- `owner or altitude mismatch`
- `reverse or circular dependency`

Review:

문서의 물리 위치와 개념 계층이 맞지 않는다. taxonomy나 owner map은 한 leaf type의 세부
문서가 아니라 여러 leaf owner를 분류하고 연결하는 meta-level 문서다. 설명 노트를 추가해서
순환처럼 보이는 구조를 해명하는 것보다, 문서를 적절한 parent scope로 옮겨 dependency
방향을 단순하게 만드는 편이 낫다.

Preferred response:

- 문서가 실제로 소유하는 지식의 altitude를 판정한다.
- leaf type 규칙 아래에 둘지, parent/common scope 아래에 둘지 결정한다.
- 이동이 필요하면 active inbound reference만 repoint하고 historical record는 과거 기록으로
  둔다.
- 단순 설명 노트나 과도한 문서 분리는 smell을 제거하지 못하면 rejected alternative로 본다.

## 2. Evidence And Sources Are Siblings

Situation:

초안에서 code/test evidence, provenance sources, historical logs를 모두 하나의 evidence
섹션 아래에 넣었다. 그 결과 provenance가 code/test evidence의 하위 개념처럼 읽힌다.

Structure smell:

- `owner or altitude mismatch`
- concept hierarchy confusion

Review:

Evidence와 Sources는 traceability 계열이라는 점에서는 가깝지만, 서로의 parent/child가 아니다.
Evidence는 current/as-built claim을 검증하는 code/test 근거일 수 있고, Sources는 판단 경위나
provenance를 복원하기 위한 입력일 수 있다.

Preferred response:

- 섹션명을 한쪽 개념으로 좁히지 말고 둘의 sibling 관계가 드러나게 조정한다.
- code/test owner 규칙은 Evidence 쪽 의미로 제한한다.
- provenance owner나 log lifecycle 규칙을 이 섹션에 길게 복사하지 않는다.
- 규칙과 예시가 이미 말하는 설명 문장은 삭제한다.

## 3. Tool Guidance Belongs In Document Identity

Situation:

작성 지침 초안에 별도 "authoring tools" 섹션을 두고, 어떤 syntax나 helper skill을 언제
사용하는지 설명했다. 내용 자체는 필요하지만 전체 문서 흐름에서는 도구 사용법 섹션이 튀어
보인다.

Structure smell:

- `owner or altitude mismatch`
- misplaced section

Review:

도구 사용법처럼 보이는 내용도 실제 역할이 문서의 identity나 edit conditions를 설명하는
것이라면 독립 섹션보다 도입부에 흡수하는 편이 자연스럽다. 먼저 문서군이 무엇인지, 어떤
형식으로 읽히고 편집되는지 밝힌 뒤 그 조건에서 필요한 tool reference를 짧게 연결한다.

Preferred response:

- 독립 섹션이 문서의 상위 개념을 잘못 만들고 있는지 본다.
- 문서군 identity, editor/reader context, tool reference 사이의 흐름을 도입부에 합친다.
- tool instruction이 authority content처럼 보이지 않게 한다.
- 프로젝트 규칙과 tool guidance가 충돌하면 어느 쪽이 우선하는지 명시한다.

## 4. Index And Slice Need Different Rules

Situation:

큰 owner 문서를 index/hub와 여러 slice로 나누었다. 작성 지침의 skeleton이 모든 문서에
적용되는 것처럼 보이고, 새 본문을 index에 써야 하는지 slice에 써야 하는지 모호하다.

Structure smell:

- hidden sub-kind
- duplicated ownership

Review:

한 문서군 안에도 structural sub-kind가 있을 수 있다. Index/hub는 navigation, document map,
stable anchors, vocabulary, overview를 소유할 수 있지만, full contract나 body text는 owning
slice가 소유하는 편이 낫다.

Preferred response:

- skeleton이 어느 sub-kind를 대상으로 하는지 명시한다.
- index/hub에는 navigation entry와 stub만 두고 full body text는 slice로 보낸다.
- 기존 inbound anchor나 numbered section은 명시적 migration 없이는 보존한다.
- split/index 규칙은 generic parent guide보다 해당 owner guideline이 소유하게 한다.

## 5. Same Section Name, Different Drift Meaning

Situation:

Sibling authoring guides가 모두 drift 처리를 다룬다. 한 문서 type은 current implementation을
서술하고, 다른 문서 type은 외부 contract나 target behavior를 규범적으로 정의한다.

Structure smell:

- copied section meaning
- document role mismatch

Review:

대칭은 섹션 순서와 검토 렌즈의 baseline일 뿐, 같은 heading이 같은 의미를 보장하지 않는다.
Descriptive/as-built 문서는 code와 다르면 문서가 stale할 수 있다. Normative/target contract는
code와 다르다는 이유만으로 current implementation으로 덮어쓰면 안 되며, implementation gap일
수 있다.

Preferred response:

- sibling structure를 비교하되 document role을 먼저 분류한다.
- 같은 drift heading을 쓰더라도 stale 판단 기준을 document type에 맞게 다시 도출한다.
- current/as-built claim과 normative/target claim을 같은 update rule로 처리하지 않는다.
- 차이가 필요한 경우 그 차이를 요구하는 content property를 명시한다.

## 6. Example Leaks A Hidden Rule

Situation:

작성 지침의 skeleton 예시에 link form, evidence indentation, status placement 같은 형식이
나타나지만 본문 규칙에는 해당 형식의 owner나 적용 범위가 드러나지 않는다.

Structure smell:

- `hidden or implicit authority`
- orphan local rule

Review:

예시는 규칙을 돕는 용도다. 필요한 규칙이 예시에만 숨어 있으면 다음 작성자는 그것이
required form인지 incidental detail인지 복원하기 어렵다. 반대로 parent guide가 이미 소유하는
형식을 child guide가 다시 정의하면 duplicated ownership이 된다.

Preferred response:

- 예시가 새 규칙을 몰래 만들고 있는지 확인한다.
- 규칙이 필요하면 owner 문서에 본문 rule로 드러낸다.
- parent가 소유하는 형식은 child에서 재정의하지 말고 위임하거나 예시만 conform시킨다.
- skeleton example은 fenced block으로 감싸 host document outline을 오염시키지 않는다.

## 7. Repeated Writing Problem Becomes Guideline Improvement

Situation:

개별 문서를 작성할 때마다 같은 owner boundary 혼동, section placement 문제, skeleton 적용
문제가 반복된다.

Structure smell:

- repeated local fix
- authoring guide gap

Review:

반복 문제는 개별 문서의 문장 문제가 아니라 authoring guide, template, skeleton 문제일 수
있다. 단발성 오적용이면 현재 문서만 고치고 끝낼 수 있지만, 다음 작성자가 같은 실수를 할
가능성이 높으면 지침 개선 후보로 본다.

Preferred response:

- 반복 문제인지 단발성 오적용인지 구분한다.
- 지침을 바꾸기 전에 재배치, 축약, owner boundary 명확화로 해결 가능한지 본다.
- 새 규칙이 필요하면 scope rule, identity rule, decision table, gate-driven flow, feedback loop,
  invariant, negative rule, must rule, destructive-change gate 중 가장 작은 rule shape를 고른다.
- 프로젝트별 기록 위치나 workflow는 해당 프로젝트 규칙에 맡긴다.

## 8. Destructive Change Needs A Gate

Situation:

작성 지침 초안이 오래된 owner 문서를 삭제해도 되는 조건을 "더 이상 중요하지 않음"과
"참조 없음"으로만 설명한다. 이 문서는 현재 상태 자체를 소유하지는 않지만, 과거 선택의
trade-off와 rejected alternative를 담고 있어 삭제하면 왜 현재 방향이 유지되는지 복원하기
어려울 수 있다. 검색 결과에는 active owner 문서의 참조와 과거 로그의 provenance 참조가
섞여 있다.

Structure smell:

- `abstract destructive gate`
- `hidden or implicit authority`

Review:

삭제, 대체, archive, status 전환처럼 되돌리기 어려운 변경은 추상 판정어만으로 허용하면
안 된다. 먼저 무엇이 사라지는지 확인해야 한다: 그 문서로만 복원되는 rationale, trade-off,
rejected alternative, re-evaluation condition이 다른 owner나 code에 남는가. 다음으로 참조의
성격을 분류해야 한다: 현재 owner, active work, entry/contract 문서, code/test comment처럼
현재 판단에 영향을 주는 참조인지, 아니면 provenance-only log/archive 참조인지 구분한다.

Preferred response:

- "중요하지 않음" 같은 추상어를 knowledge-loss 질문으로 바꾼다.
- active/current 영향 참조와 provenance-only 참조를 구분한다.
- 현재 영향 참조가 있으면 삭제 전에 owner 보강이나 reference repoint를 요구한다.
- 하나라도 불확실하면 삭제하지 않고 보류, 사용자 확인, owner 보강, 새 문서 작성 같은
  비파괴 fallback으로 보낸다.
- 프로젝트별 log status, plan 상태, archive 위치 이름은 해당 프로젝트 guideline이 채우게 한다.

## 9. Ancestor Contract May Be The Defect

Situation:

하위 작성 지침을 고칠 때마다 같은 owner 경계 문제가 반복된다. local 문서만 고치면 당장
문장은 정리되지만, 다음 agent는 다시 parent taxonomy나 ancestor owner map을 따라 같은 오판을
한다. ancestor 계약은 여러 문서가 의존하므로 바로 바꾸기에는 영향권이 크다.

Structure smell:

- `owner or altitude mismatch`
- `orphan local rule`
- `contradiction`

Review:

parent/ancestor 계약은 기본 constraint이지만 axiom은 아니다. 반복되는 구조 smell이 ancestor
경계에서 발생하면 변경 대상을 local 문서로 단정하지 않는다. 대신 `local-only`,
`ancestor-only`, `both`, `no-change` 후보를 분리해 본다. ancestor 변경 후보는 하위 dependents에
영향을 주므로 더 높은 증거 기준과 해당 owner의 change 절차가 필요하다.

Preferred response:

- 같은 smell이 단발인지 반복인지 먼저 구분한다.
- 각 후보가 다음 authoring scenario에서 agent 행동을 어떻게 바꾸는지 비교한다.
- ancestor가 문제일 가능성을 제안할 수는 있지만, 하위 문서가 parent 규칙을 조용히 override하게
  두지 않는다.
- ancestor 변경이 필요하면 영향받는 dependents, 충돌 근거, approval/review 필요성을 함께
  드러낸다.
- 증거가 부족하면 local 경계 설명이나 no-change 기록처럼 비파괴 fallback을 택한다.

## 10. Over-provisioned Skeleton Section

Situation:

작성 지침 초안이 새 문서를 위한 skeleton을 제공하면서 `Deferred`, `Non-Goals`, `Boundaries`,
`Links` 같은 default section을 모두 넣었다. 실제 corpus에는 그런 섹션을 항상 채워야 하는
반복 subtype이 없고, 사용자는 "이 섹션은 없어도 될 것 같다"고 말한다.

Structure smell:

- `over-provisioned structure`
- `copied section meaning`

Review:

default section은 중립이 아니라 비용이다. 섹션이 있으면 agent는 빈칸을 채우려 하고, 미래
내용이나 다른 owner가 소유할 내용을 현재 문서에 끌어올 수 있다. 사용자의 "없어도 될 것 같다"는
단순 취향이 아니라 skeleton이 실제 authoring 필요보다 큰 신호일 수 있다.

Preferred response:

- 실제 반복 생성되는 subtype이 있는지 확인한다.
- skeleton이 없으면 agent가 필수 섹션을 빠뜨리는지, skeleton이 있으면 불필요 섹션을 채우는지
  비교한다.
- 각 default section을 delete, absorb, optional, subtype-only, invariant-only 후보로 평가한다.
- 필요한 경계는 상위 `Scope` 같은 기존 섹션에 흡수하고, deferred work나 target detail은 owning
  document type으로 보낸다.
- skeleton 전체보다 section contract, invariant, golden document가 더 작은 해결이면 그쪽을
  택한다.

## 11. New Content Outgrows Document Scope

Situation:

주제 A를 다루도록 좁게 선언된 문서를 작성하던 중, A와 별개인 주제 B의 내용이 필요해진다.
문서 정체성이 A 전용이라 B가 어색하게 끼워진다.

Structure smell:

- `owner or altitude mismatch`
- `under-scoped identity`
- hidden sub-kind

Review:

B를 A 문서에 국소적으로 끼워넣기 전에, 상위 문서부터 A와 B의 관계와 흐름을 먼저 파악한다.
문제는 한 문장의 위치가 아니라 문서 정체성이 새 내용을 담을 수 있느냐다. B가 다른 owner의
소유면 위임이 맞고, A와 B가 공통 상위 주제의 sibling이면 문서를 상위 개념으로 재정의해 A·B를
하위로 두거나 둘로 분리하며, B가 A의 자연스러운 확장이면 정체성 문장을 넓혀 포함한다.

Preferred response:

- 국소 수정 전에 새 내용과 기존 내용의 관계(같은 owner·sibling·하위·무관)를 판정한다.
- 위임, scope 확장, 분리, 상위 개념 승격 중 무엇이 가장 작은 해결인지 비교한다.
- 재발 빈도가 낮은 일회성 내용이면 본문 흡수나 제거로 끝낼 수 있는지 먼저 본다.
- 정체성이나 scope를 바꾸면 inbound 참조와 하위 문서 영향을 확인하고 기존 anchor를 보존한다.

## 12. New Document Needs An Independent Identity

Situation:

기존 owner 문서에 새 주제를 추가하려다 내용이 길어질 것으로 예상해 별도 문서를 만들려 한다.
그러나 새 주제는 기존 문서와 같은 owner와 독자를 가지며 함께 변경되고, parent taxonomy에는
별도 document type이나 sibling 역할이 정의돼 있지 않다.

Structure smell:

- `over-provisioned structure`
- `duplicated ownership`

Review:

내용의 길이만으로 독립 identity가 생기지는 않는다. 기존 문맥에 흡수할 수 있는지 먼저 보고,
owner, scope, reader, lifecycle이나 change coupling의 실제 차이가 독립 역할을 요구할 때만 새
문서를 만든다. 새 문서가 필요하다면 자기 본문이 아직 없으므로 user intent, parent와 관련
sibling에서 intended identity를 설계한다.

Preferred response:

- 같은 책임을 기존 owner나 section이 이미 소유하는지 확인한다.
- 길이, 작성 편의나 미래 가능성만으로 새 문서를 만들지 않는다.
- 독립 identity가 필요하면 owner·scope, parent·sibling 관계와 배치 위치를 먼저 정한다.
- 생성 후 parent index나 taxonomy, inbound reference와 sibling 경계를 함께 갱신한다.
- content 경계가 복원되지 않으면 생성하지 않고 사용자에게 확인한다.

## 13. Reader Path And Loop Are Misaligned

Situation:

Entry 문서는 `Enter`, `Record`, `Reconcile`, `Closeout` 같은 작업 loop를 노출하지만, target
reference는 다른 언어의 제목, 다른 순서, 더 좁은 heading으로 상세 규칙을 배치한다. 독자는 한
phase를 끝내기 위해 여러 section을 오가거나, heading이 실제 포함 범위를 덮지 못해 이관·정리·검증
같은 후속 동작을 놓친다.

Structure smell:

- `under-scoped identity`
- `misaligned reader path`
- `excessive read path`

Review:

문제는 특정 anchor를 하나 더 추가하지 않은 데 있지 않을 수 있다. Entry 문서가 작업 loop나
reader path를 정한다면 target reference의 heading, 순서, section 범위도 그 작업 단위를 받을 수
있어야 한다. 제목은 스타일이 아니라 독자가 다음 행동을 찾는 interface가 될 수 있다. 국소 rule을
추가하기 전에 section rename, 순서 변경, loop map, routing surface 조정으로 문서 경계를 맞출 수
있는지 본다.

Preferred response:

- Entry 문서가 노출하는 phase, step, command나 template 단위를 확인한다.
- Target 문서의 heading과 순서가 같은 작업 단위와 scan path를 제공하는지 대조한다.
- Section 이름이 실제 포함 범위를 덮지 못하면 내용을 줄이거나 이름을 넓힌다.
- Phase가 아닌 파일 틀이나 공통 substrate는 억지로 phase로 만들지 말고 loop map이나 도입부에서
  어떤 phase가 참조하는지 설명한다.
- 새 cross-reference rule을 추가하기 전에 문서 경계, heading, 순서, routing surface 조정이 더
  작은 해결인지 비교한다.
