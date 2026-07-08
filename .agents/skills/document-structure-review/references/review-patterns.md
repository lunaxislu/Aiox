# Review Patterns

구조 문제를 분류하거나 문서 관계의 read path, 개념 위치, owner와 변경 위치가 애매할 때 읽는다.
각 절은 SKILL 본문의 다섯 축(내용·압축 / 표현 / 구조 관계 / 규율 고도 / 문서-대-문서 관계)과
Review Loop를 concrete instance로 편 것이며, 항목 추가는 recurrence gate(실제 반복 + 기존
축으로 복원 불가)를 통과할 때만 한다.

## Contents

- [Context Read Path](#context-read-path)
- [Concept Placement](#concept-placement)
- [Structure Smells](#structure-smells)
- [Owner And Scope Decisions](#owner-and-scope-decisions)
- [Change Location](#change-location)

## Context Read Path

판단을 바꿀 수 있는 관계만 따라가 문서가 어떤 계약 아래 있고 역할을 어떻게 나누는지 확인한다.

- 직접 parent 계약에서 시작하고, 그 계약이 위임한 ancestor 중 현재 owner·scope 판단에 영향을
  주는 범위까지만 따라간다.
- guideline 계층이 있으면 project/root contract, parent guideline, child guideline, 실제 corpus의
  파생 관계를 필요한 범위에서 확인한다.
- 프로젝트의 문서 작성·수정 흐름, taxonomy, owner map, index나 entry 문서가 현재 문서의 역할을
  정하면 확인한다.
- sibling은 대칭이나 차이가 판단에 영향을 줄 때, child는 현재 문서가 skeleton, invariant,
  index, routing 중 무엇을 소유하는지 판단할 때만 읽는다.
- corpus나 과거 사례는 규칙의 적용 가능성과 오해 가능성을 확인할 때만 읽는다.
- root나 scope boundary에 도달했거나 더 읽어도 판단이 달라지지 않으면 멈춘다.

## Concept Placement

- 독립 섹션인지 도입부나 기존 문맥에 흡수할 내용인지 먼저 판정한다.
- A가 B의 하위 개념인지, 같은 수준의 sibling인지, 제목이 잘못된 상위 개념을 만들고 있는지 본다.
- 같은 계열이어도 목적이 다르면 같은 수준에 둔다. 직접 evidence와 provenance source는 모두
  traceability와 관련되지만 서로의 하위 개념일 필요는 없다.
- 도구 사용법처럼 보여도 실제 역할이 document identity나 edit condition이면 도입부에 흡수할 수
  있다.
- 새 섹션이나 문서를 추가하기 전에 제목 변경, 흡수, 이동이나 위임으로 해결 가능한지 확인한다.

## Structure Smells

각 smell은 identity anchor 또는 다섯 축의 복원 테스트가 실패하는 정적 표면이다. 자주 재발해
이름이 붙은 restoration gap이며, "독자가 이 판정을 복원하는가"라는 같은 테스트를 공유하되
dry-run 없이도 알아볼 수 있는 형태로 굳은 것이다. dry-run으로만 드러나는 동적 gap은 Node
Operation이 함께 모은다. 축은 배타 분류가 아니라 탐색 보조이므로, 한 결함이 여러 축의 복원을
동시에 깨면 관련 축을 모두 route한다. 카탈로그 항목은 recurrence gate(실제 반복 + 기존 축으로
복원 불가)를 통과할 때만 유지하고, 축 원칙만으로 복원되는 항목은 축소 후보다.

**내용·압축 복원 실패** — 필요한 판정을 만들 만큼 담기지 않았거나, 빼도 판정이 같은 내용을 담아
독자 비용을 만든다.

- `over-provisioned structure` — 낮은 빈도의 예외나 미래 내용을 전제한 section이, 빼도 판정이
  같은 내용을 채우도록 유도한다.

  행동으로 넘기는 문장이 요구 행동 대신 상태·라벨에 그치는 문제(구 `inferred action`)는 이 축의
  SKILL 본문 규칙과 Output Contract가 직접 소유하므로 별도 smell로 두지 않는다.

**표현 복원 실패** — 형태가 정보 성격과 어긋나 독자 행동(재진입·검증·종료)이 복원되지 않는다.

- `misaligned reader path` — heading·순서·loop가 실제 작업 단위와 어긋나, 독자가 한 작업을
  끝내는 데 필요한 전이·정리·검증을 놓친다. (구조 관계 복원도 함께 깬다.)
- `abstract destructive gate` — 되돌리기 어려운 변경을 추상 판정어만으로 허용하고
  knowledge-loss, 참조 범위, fallback을 드러내지 않아 독자가 판단 입력을 복원하지 못한다.
  (내용·압축 복원과 Destructive Change gate도 함께 깬다.)

**구조 관계 복원 실패** — 문서·섹션·개념의 계층·sibling·sub-kind 관계가 복원되지 않는다.

- `hidden sub-kind` — index, slice, router, standalone 같은 subtype 차이를 단일 구조가 가린다.
- `mixed concept roles` — 한 섹션이 evidence, provenance, workflow, style처럼 다른 개념 역할을
  섞어 각 역할의 경계와 의미를 흐린다.

**규율 고도 복원 실패** — 규율이 걸리는 고도(global/local)와 소속이 복원되지 않는다.

- `hidden or implicit authority` — 필요한 규칙·scope·예외가 예시, 제목이나 관례에만 숨어,
  독자가 그것이 어느 고도의 규칙인지는커녕 규칙인지조차 복원하지 못한다.
- `orphan local rule` — parent 계약이나 owner map과 연결되지 않아 적용 범위와 우선순위를
  복원할 수 없는 국소 규칙이다. (문서-대-문서 관계 복원도 함께 깬다.)
- `owner or altitude mismatch` — 내용이 잘못된 owner나 개념 계층에 놓여, 어느 고도·소유의
  규율인지 복원되지 않는다. (문서-대-문서 관계·구조 관계에 함께 걸린다.)

**문서-대-문서 관계 복원 실패** — 두 문서의 결합(위임·보완·경계)이 복원되지 않는다.

- `duplicated ownership` — 같은 지식이 둘 이상의 owner에 있어 어느 쪽이 소유이고 어느 쪽이
  위임인지 복원되지 않는다.
- `reverse or circular dependency` — 하위 문서가 자신이 의존하는 상위 규칙을 정의하거나
  지배해 위임 방향이 복원되지 않는다.
- `contradiction` — 둘 이상의 owner가 양립할 수 없는 주장을 한다.
- `copied section meaning` — sibling의 heading이나 순서를 role 재판정 없이 복사해, 두 문서의
  실제 역할 차이가 복원되지 않는다.
- `excessive read path` — 하나의 판단을 복원하려고 필요 이상의 문서를 따라가야 한다.

**identity 근간 복원 실패(축 이전 anchor)** — 축이 파생되는 identity 자체가 과소표현된다.

- `under-scoped identity` — document identity 문장이나 section·scope 표기의 이름이 한 subtype에
  묶여, 그 subtype이 없는 경우까지 담당해야 하는 개념을 담지 못한다. 흔히 altitude mismatch나
  reader path 누락으로 드러나지만 원인은 identity의 과소표현이다.

## Owner And Scope Decisions

- 명시적 계약, 실제 적용 범위, authority, dependency, lifecycle과 change coupling으로 ownership을
  판정한다.
- 다른 문서가 소유하는 내용은 복사하지 말고 owner로 링크하거나 위임한다. 현재 문서에 경계가
  필요하면 세부 절차 대신 owner와 소비 방식만 남긴다.
- 새 내용과 기존 내용의 관계를 같은 owner, sibling, 하위, 무관으로 분류한다. 범위를 벗어나면
  위임, scope 확장, 분리나 상위 개념 승격을 비교한다.
- identity나 scope를 바꾸는 재구조화는 영향 범위가 크므로 더 높은 증거를 요구한다.
- portable skill이나 일반 지침에는 특정 프로젝트, repo, 팀 이름이나 path를 박지 않고 사례는
  추상 패턴으로 바꾼다.

## Change Location

- 구조 smell이 local 문서에서만 발생하는지, parent/ancestor 경계에서 반복되는지 확인한다.
- `local-only`, `ancestor-only`, `both`, `no-change`가 다음 작성자의 행동과 read path를 어떻게
  바꾸는지 비교한다.
- 확정된 상위 권위와 충돌하는 하위 변경은 수정하거나 기각한다. ancestor 자체가 stale,
  overbroad, misplaced라면 영향받는 dependents와 근거를 제시하고 owner 절차로 변경을 올린다.
- ancestor 변경 근거가 부족하면 local 경계 설명이나 `no-change` 같은 비파괴 선택을 유지한다.
