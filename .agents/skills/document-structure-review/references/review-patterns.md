# Review Patterns

구조 문제를 분류하거나 문서 관계의 read path, 개념 위치, owner와 변경 위치가 애매할 때 읽는다.

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

- `duplicated ownership` — 같은 지식이 둘 이상의 owner에 있다.
- `owner or altitude mismatch` — 내용이 잘못된 owner나 개념 계층에 놓였다.
- `hidden or implicit authority` — 필요한 규칙·scope·예외가 예시, 제목이나 관례에만 숨어 있다.
- `orphan local rule` — parent 계약이나 owner map과 연결되지 않아 적용 범위와 우선순위를 복원할
  수 없는 국소 규칙이다.
- `hidden sub-kind` — index, slice, router, standalone 같은 subtype 차이를 단일 구조가 가린다.
- `over-provisioned structure` — 낮은 빈도의 예외나 미래 내용을 전제한 section이 불필요한 작성을
  유도한다.
- `copied section meaning` — sibling의 heading이나 순서를 role 재판정 없이 복사한다.
- `reverse or circular dependency` — 하위 문서가 자신이 의존하는 상위 규칙을 정의하거나 지배한다.
- `excessive read path` — 하나의 판단을 복원하려고 필요 이상의 문서를 따라가야 한다.
- `contradiction` — 둘 이상의 owner가 양립할 수 없는 주장을 한다.
- `abstract destructive gate` — 되돌리기 어려운 변경을 추상 판정어만으로 허용하고 knowledge-loss,
  참조 범위와 fallback을 드러내지 않는다.
- `mixed concept roles` — 한 섹션이 evidence, provenance, workflow, style처럼 다른 개념 역할을
  섞어 각 역할의 의미를 흐린다.

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
