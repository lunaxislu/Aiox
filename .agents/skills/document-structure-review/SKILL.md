---
name: document-structure-review
description:
  Use when an agent needs to create, delete, structurally review, design, or refine durable documents,
  documentation rules, authoring guides, templates, skeletons, or review feedback. Recovers the document's
  identity — what it represents — from the document and its parent and sibling relationships, then derives
  content, representation, structure, rule-altitude, and document-relation judgments from that identity
  through a review loop that propagates only along a change's blast radius.
---

# Document Structure Review

## Definition And Identity

문서는 정보, 지시, history를 담는 durable carrier다. 이 skill의 모든 판단의 근간은 대상
문서의 **identity — "이 문서가 무엇을 나타내는가"** 다. 문서 자체와 parent, 관련 sibling이
정의하는 역할에서 identity를 복원하고, 그 identity에서 내용, 표현, 구조, 규율 고도,
문서-대-문서 관계 판단을 도출한다. 존재·위치·경계·상태·내용을 바꾸는 변경마다 기존 identity가
여전히 유효한지, 관련 문서의 역할 정의와 참조를 함께 바꿔야 하는지 확인한다. 아래 모든 축·loop·
gate·reference는 이 근간을 상황별로 실행하는 도구이며, 다른 규칙이 identity 판단과 충돌하면
identity 판단을 우선한다.

parent와 sibling의 확정된 권위는 기본 constraint이지만 axiom은 아니다. 충돌하면 하위 제안을
수정·기각하거나, 충분한 근거와 해당 owner의 change 절차를 갖춰 상위 변경 후보로 올린다.

**Master invariant — 정답은 형태가 아니라 복원이다.** 같은 내용을 담는 압축률·표현 형태·구조
관계에 보편 정답은 없다. 무엇이 옳은지는 identity가 정한다. 단 모든 형태에 걸치는 보편 기준이
하나 있다: **선택한 형태가 identity가 요구하는 판정을 독자가 복원하게 하는가.** 이 테스트를
통과하는 형태들 사이에서만 독자 비용이 가장 작은 쪽을 택한다. "가장 짧게"는 복원 테스트를
통과한 다음의 tiebreaker이지 1차 기준이 아니다.

Scope:

- durable document의 생성·삭제·검토, owner·scope 배치, 개념 위치, 작성 지침·template 구조,
  정보 표현 형태를 판단하는 portable 절차다.
- 특정 프로젝트의 taxonomy, 문서 형식, current work, 기록 위치, closeout·owner handoff를
  소유하지 않는다. 프로젝트가 지정한 계약·change 절차 아래에서 판단한다.
- 사용자 의도는 중요한 근거지만 자동 정답은 아니다. 확인된 계약·corpus와 충돌하면 사실·추론·
  의견·제안을 구분해 보고한다.

## Derivation Axes

identity에서 내려오는 다섯 축이다. 각 축은 형태의 정답을 미리 정하지 않고, 그 형태가 identity가
요구하는 판정을 복원하는지로 판단한다. 각 축의 세부 사례·smell·형식 목록은 필요할 때만
`Reference Routing`으로 읽고, 목록에 항목을 늘리기 전에 그 항목이 기존 축으로 복원 불가한 재발
패턴인지 먼저 본다. 단순 변종은 추가하지 않는다.

- **내용·압축** — identity가 요구하는 판정을 복원하는 만큼만 담는다. 압축률(행위 수준인지,
  event 수준인지, 값까지인지)은 identity가 정하며 어느 하나가 보편 정답이 아니다. 불변식: 어떤
  요소를 빼도 판정이 같으면 과잉이고, 빼면 합리적 agent가 다른 대상·판단·행동을 고를 수 있으면
  부족이다. 문장은 독립적으로 충분하거나 과잉인 것이 아니다. 앞뒤 문맥과 문서 identity가
  요구하는 판정 단위를 먼저 복원한 뒤, 그 문장이 그 판정을 만들 만큼 충분한지 본다. 해결은 항상
  더 짧게 압축하는 것이 아니라, 필요한 판정을 잃지 않는 밀도를 맞추는 것이다. 행동으로 넘기는
  문장(라우팅·gate 종결·step)이 요구 행동을 지목하지 않고 상태·라벨에 그치면 독자가 행동을
  추론해야 하므로 부족이다. 행동을 다른 절이 소유하면 그 owner까지 지목한다.
- **표현** — 형태는 "그 정보가 무엇인가"로 고른다. 절차·workflow·검토 흐름처럼 독자 행동이
  반복·재진입·검증·종료를 요구하면 단순 나열 대신 gate/flow/loop 형태를 후보로 본다. 되돌아갈
  경로와 종료 조건을 함께 복원하지 못하면 well-formed loop가 아니다. 구체 형태 매핑과 loop
  구성요소 판정은 `Information Format`·`Rule Shape`가 소유한다.
- **구조 관계** — 문서>섹션>문장>단어의 계층인지, 문서<>섹션의 상호 참조인지, 선형인지
  비대칭인지는 identity가 정한다. 보편 형태가 없으므로 대칭·계층을 초기 후보로 비교하되
  identity가 요구하면 비대칭·상호 관계를 쓴다.
- **규율 고도** — 규율·제한·"알아야 할 것"은 문서 전체(global)에 걸리는지 특정 섹션(local)에만
  걸리는지 고도가 있다. 각 규율을 그 고도에 두고, 독자가 어느 고도의 규율인지 복원할 수 있게
  한다. 국소 규율을 전체처럼, 전체 규율을 국소처럼 두지 않는다.
- **문서-대-문서 관계** — 두 문서의 결합은 대표적으로 관심사 분리, 위임, 협응 보완(둘이 필요한
  부분을 나눠 갖고 어느 쪽도 종속이 아님) 등을 포함한다. 이 관계가 내용을 현재 문서에 남길지,
  owner로 링크·위임할지, 공유 섹션으로 보완할지를 정한다. 물리적 nesting·경로·공유 template
  만으로 ownership이나 상속을 단정하지 않는다.

## Review Loop

문서 검토·작성은 identity 앵커에서 출발해, 변경의 blast radius를 따라 도는 loop다. frontier는
처음에 대상 문서 하나다.

### Node Operation (frontier의 각 문서)

1. 대상 문서의 intended identity와 근거를 복원한다. 근거는 user prompt, project/root contract,
   parent/child guideline, owner map, 관련 sibling, 실제 corpus에서 찾는다. 새 문서는 user
   intent와 parent·owner map·sibling에서 identity를 설계한다.
2. 변경 표면을 두 입력에서 모은다. 하나는 존재·위치·경계·상태·내용의 명시적 변경이고, 다른
   하나는 문서가 독자의 판단·행동을 지시할 때 그 문서를 따라 실제 실행 또는 dry-run(실행
   시뮬레이션)해 드러나는 지점이다. 후자에서 다음 행동·분기 착지점·재진입 지점·종료 조건·
   escalation·owner·근거 기준처럼 identity가 요구하는 무언가를 독자가 복원하지 못하면 그
   지점을 **restoration gap**으로 잡는다. 핵심은 예시 목록이 아니라 "따라가 보면 다음 판정이
   복원되는가"라는 단일 테스트다. 두 입력의 표면을 **구조와 내용을 병렬로** 다섯 축(내용·압축 /
   표현 / 구조 관계 / 규율 고도 / 문서-대-문서 관계) 위에서 판정하고, 한 결함이 여러 축에
   걸치면 하나로 못 박지 말고 관련 축을 모두 route한다. 이런 gap에 새 smell이나 structure
   model을 먼저 만들지 말고, 같은 gap이 반복되고 기존 축·reference로 복원하기 어려울 때만
   portable pattern 후보로 승격한다.
3. 판단을 바꿀 수 있는 관계 문서만 읽는다. 단순 불안으로 모든 ancestor·sibling·child·corpus로
   확장하지 않는다.
4. 책임 owner와 변경 위치를 정하고 local-only, ancestor-only, both, no-change 후보를 비교한다.
   문제 문서가 항상 변경 대상이라고 가정하지 않는다.
5. 변경 유형에 해당하는 `Change Gates`를 적용한다.
6. 역할 정합과 필요한 전파를 모두 충족하는 후보 중 blast radius가 가장 작은 변경을 수행한다. 내용 위치를 정한
   뒤 표현 축으로 형태를 고르고, 복원 테스트를 통과한 후보들 사이에서 독자 비용이 가장 작은
   쪽을 택한다. 짧음은 그 판단의 한 요소일 뿐이다.
7. 이 문서와 직접 관련 문서의 identity·참조가 유효한지 검증하고 결과를 분기한다:
   - **pass** → 이 문서 node를 닫고 `Propagation`으로 간다.
   - **local verify fail**(복원한 identity·owner는 유지되나 변경 위치·형태·owner 후보가 검증
     실패) → 4로 돌아가 이 문서 변경만 재도출한다.
   - **identity-invalidation fail**(새 근거·전파 결과가 이 문서의 원래 identity·owner 복원
     자체를 뒤집음) → 1로 돌아가 identity 복원부터 다시 한다.

### Propagation

- pass한 변경이 깰 수 있는 관계만 blast radius로 산출한다: 상위 역할 정의, owner map·taxonomy,
  inbound reference, sibling 경계, 하위 skeleton·invariant. 전수 검토가 아니라 판정을 바꿀
  관계만 올린다.
- blast radius의 각 문서를 frontier에 추가하고 Node Operation을 재적용한다. frontier 문서가 또
  바뀌면 그 문서의 blast radius도 추가한다.

### Termination

- frontier가 비고 최종 verify가 pass하면 수렴이다. 보통 blast radius가 작아 한 번에 수렴한다.
- loop의 모든 재진입 — N7 back-edge(→4·→1)와 Propagation의 frontier 재추가 — 은 새 근거·전파
  결과·검증 실패 원인처럼 다음 판정을 바꾸는 입력을 소비할 때만 정당하다. 재진입 지점이 산출하는
  상태(step 1=identity·owner, step 4=변경 위치·형태·owner 후보, Propagation=새 blast 없는 같은
  frontier 문서)를 새 입력 없이 다시 만들면 순환이며, back-edge·재추가 대신 escalation으로 넘긴다.
- 미수렴(순환·발산), 파괴적 변경, 또는 identity·경계·authority가 불확실하면 추측하지 않고
  사용자에게 확인한다.
- "매 검토 = 전체 문서군 순회"로 만들지 않는다. 그 자체가 과설계다.

### Meta Ring (스킬 자기 개선, 조건부·비차단)

- 이번 검토가 현재 축·gate·smell·case로 이름 붙일 수 없는 재발 패턴을 노출했을 때만 발화한다.
  아니면 발화하지 않는다.
- 재발이 아니면 park하고, 재발이면 domain 용어(특정 repo·팀·log 이름)를 제거해 portable한지
  본다. portable하지 않으면 스킬이 아니라 프로젝트 규칙 후보다.
- 제안된 스킬 변경은 이 스킬의 Review Loop와 Change Gates로 자기 검토(dogfood)한다.
- 종료는 스킬 개선 후보 제안까지다. 스킬은 owner 문서이므로 자동 편집하지 않고 사용자 승인을
  받는다.

## Change Gates

변경 유형에 해당하는 gate만 Node Operation 5단계에서 적용한다. gate는 축을 특정 변경에 적용한
instance다.

### New Document

- 같은 책임을 기존 owner 문서·섹션이 이미 소유하는지, 기존 문맥에 흡수 가능한지 먼저 확인한다.
- owner, scope, reader, lifecycle, change coupling의 실제 차이가 독립 identity를 요구할 때만 새
  문서를 만든다.
- 생성 전 intended identity, owner·scope, parent·sibling 관계와 배치를 정하고, 생성 후 parent
  taxonomy·index·inbound reference·sibling 경계가 새 역할을 옳게 설명하는지 확인한다.

### Content Or Identity Change

- 새 내용이 기존 identity와 같은 owner·scope이면 흡수하고, 하위 개념이면 필요한 섹션에 배치한다.
- identity·scope를 초과하면 국소적으로 끼우지 않는다. owner 위임, scope 확장, 문서 분리, 상위
  개념 승격을 비교한다.
- 이동·rename·split·merge·identity/scope 변경은 증거 기준을 높이고, 기존 anchor·inbound
  reference를 명시적 migration 없이 깨지 않는다.

### Destructive Change

- 삭제·대체·archive·status 전환 전에는 이 문서로만 복원되는 knowledge(rationale, trade-off,
  rejected alternative, re-evaluation 조건)가 다른 owner나 code에 남는지 확인한다.
- 참조가 current authority·active work·implementation용인지 provenance-only인지 분류한다. 보존
  이나 참조 영향이 불확실하면 보류·보강·새 문서·사용자 확인 같은 비파괴 fallback을 택한다.

### Guideline Or Template Change

- default section·template을 중립으로 보지 않는다. 실제 반복 subtype과 누락 위험이 확인될 때만
  추가하고, 기존 문맥 흡수나 invariant가 더 작은 해결인지 먼저 본다.
- 개념보다 좁게 명명된 section·scope가 다른 subtype이나 subtype 없는 경우를 누락시키지 않는지
  확인한다. 좁은 identity는 새 section 전에 rename·일반화·scope 재정의로 개념과 맞춘다.
- 사례·corpus는 규칙을 검증하는 입력이지 자동 template이 아니다.

## Reference Routing

모든 reference는 선택 도구다. 현재 판단을 바꾸는 조건에 해당할 때만 읽는다. 각 reference의
목록은 다섯 축의 instance이며, 항목 추가는 recurrence gate(실제 반복 + 기존 축으로 복원 불가)를
통과할 때만 한다.

- 구조 문제 분류, context read path, 개념 위치, owner·scope·변경 위치가 애매하면
  `references/review-patterns.md`.
- rule shape, wording, 표현 형태, guideline/template 구조나 sibling guide 비교가 필요하면
  `references/authoring-patterns.md`.
- 위 기준을 concrete scenario에 적용하는 방식이 애매하면 `references/EXAMPLE.md`의 관련 사례만.

## Output Contract

최종 제안·수정안에는 관련 항목만 적용한다.

- 확인한 사실, 추론, 의견과 제안을 구분했는가?
- 대상 문서의 identity와 그 근거를 복원했는가?
- 내용·표현·구조·규율 고도·문서 관계 판단을 그 identity에서 도출했는가?
- 행동으로 넘기는 문장이 요구 행동을, 다른 절이 owner면 그 owner까지 복원하게 하는가?
- 지시·절차 문서를 dry-run했을 때 restoration gap이 남지 않았는가?
- 선택한 형태가 identity가 요구하는 판정을 복원하며, 그 다음에야 독자 비용이 가장 작은가?
  (복원을 깨면서 줄이지 않았는가, 판정이 같은데 남기지 않았는가?)
- owner·scope·변경 위치가 적절하며 필요한 gate를 적용했는가? parent 역할 정의, owner map,
  inbound reference, sibling 경계가 계속 유효한가?
- 불확실한 content 경계·authority나 파괴적 변경을 추측으로 통과시키지 않았는가?
- loop가 수렴했거나, 미수렴을 추측으로 종결하지 않고 escalation했는가?
