# Documentation System

이 문서는 이 repo의 문서 taxonomy에서 각 영역이 소유하는 정보와 질문별 권위를
정의한다. 문서가 충돌하거나 같은 내용을 중복 소유할 때 어느 영역으로 통합할지
판단하는 기준이다.

## Entry And Contract Documents

- `README.md`는 해당 scope를 위한 사람용 진입점이다. 제품·계약·구조 같은 durable
  knowledge를 대신 소유하지 않는다.
- `AGENTS.md`는 해당 scope에서 agent가 따라야 하는 작업 범위와 행동 규칙을
  소유한다.
- `CLAUDE.md`는 필요한 경우 같은 scope의 `AGENTS.md`를 가리키는 얇은 compatibility
  pointer로만 둔다.

## Knowledge Owners

### Product

`docs/product/product.md`는 제품의 목적, 범위와 제품 원칙을 소유한다.
기존 PRD 전체나 구현 계약, 우선순위 목록을 통째로 소유하지 않는다.

### Roadmap

`docs/product/roadmap.md`는 `product.md`와 같은 `docs/product/` physical scope에 있지만
별도 knowledge owner다. Product가 정한 scope 안에서 release gate, phase, 우선순위와
순서를 소유하며, product scope를 확장하거나 현재 구현 checklist를 대신하지 않는다.

### Specs

`docs/specs/`는 외부 사용 주체, 연동 구현 또는 미래의 재구현이 호환성을 위해 지켜야
하는 동작, interface, protocol, data와 state contract를 소유한다.

### Architecture

`docs/architecture/`는 specs와 product intent를 만족시키기 위한 내부 구조, 책임 배치,
module과 process 경계, data flow와 내부 state 관리 원칙을 소유한다.

구현의 국소적인 HOW는 기본적으로 code와 tests에 둔다. 여러 module에 걸친 invariant,
외부에서 관찰되거나 safety에 영향을 주는 동작, 반복되는 footgun처럼 문서화할 이유가
있는 내용만 specs 또는 architecture로 승격한다.

### Decisions

`docs/decisions/`는 여러 대안 중 선택한 결과와 아직 유효한 load-bearing rationale,
trade-off와 재검토 조건을 소유한다. 선택 결과가 만든 제품 범위, contract, 구조나
추진 상태 자체는 각각의 owner 문서에 반영한다. Decision 문서의 작성 규칙과 승격 기준은 [`docs/decisions/AGENTS.md`](decisions/AGENTS.md)가
소유한다.

### Guides

`docs/guides/`는 사람과 agent가 반복 적용하는 방법과 실무 흐름을 소유한다. 여기에는
how-to, runbook, troubleshooting, onboarding, 반복 실행 패턴과 사례별 workflow가
포함된다.

Guides는 제품 사실, 구현 commitment 또는 구속적인 agent policy를 결정하지 않는다.
그 내용은 해당 owner 문서와 scope의 `AGENTS.md`를 참조하며, 권위 값을 복사하거나
override하지 않고 실제 작업에 적용하는 방법을 설명한다.

## Work And Evidence Owners

- `plans/`는 독립된 여러 단계가 있는 큰 작업이나 workstream의 단계 순서, 진행 상태와
  단계 로그 포인터를 소유한다. Plan 파일의 구조, 단계 문법과 유지 규칙은
  [`plans/AGENTS.md`](plans/AGENTS.md)가 소유한다.
- `research-idea/`는 사용자가 프로젝트에 필요한 아이디어, 외부 링크와 repository·문서에
  대한 미검증 조사 자료를 모아 두는 영역이다. 이 자료는 필요할 때 참고하며, owner 문서나
  구현 commitment를 대신하지 않는다.
- `spikes/`는 `research-idea/`나 구현 중 발견한 가능성과 기술적 불확실성을 검증하는 실험을
  소유한다.
- `logs/`는 주제별 작업 과정과 경위를 소유한다. 확정된 제품·기술 계약이나 현재
  구현 사실 자체의 owner는 아니다.
- code와 tests는 실제 구현이 현재 무엇을 하는지에 대한 fact owner다.

`research-idea/`와 spike 결과는 owner 문서, code 또는 tests에 반영되고 검증되기 전에는
제품 사실이나 구현 commitment가 되지 않는다.

## Scoped Authority

문서 전체에 적용되는 전역 우선순위는 두지 않는다. 질문의 종류에 따라 다음 owner를
따른다.

| 질문                                           | Owner                    |
| ---------------------------------------------- | ------------------------ |
| 제품 목적, 범위, 원칙                          | `product`                |
| 외부 동작, interface, contract                 | `specs`                  |
| 내부 구조, 책임, flow                          | `architecture`           |
| 여러 대안 중 내린 선택과 유효한 근거           | `decisions`              |
| 우선순위와 추진 순서                           | `roadmap`                |
| 실제 구현의 현재 동작                          | code and tests           |
| 현재 큰 작업이나 workstream의 단계와 진행 상태 | `plans`                  |
| agent 작업 범위와 행동 규칙                    | 해당 scope의 `AGENTS.md` |

`product`, `specs`, `architecture`, `decisions`, `roadmap`과 `plans`는 각 scope에서
무엇이어야 하는지에 대한 intended owner다. Code와 tests는 무엇을 해야 하는지를
결정하지 않고 현재 구현 사실을 증명한다.

## Conflict Resolution

- 책임이 다른 문서 사이에는 전체 우선순위를 적용하지 않고 해당 질문의 owner를
  따른다.
- 같은 내용을 여러 문서가 소유하면 책임에 맞는 owner로 통합하고 다른 문서는 그
  owner를 참조한다.
- Code/tests와 intended owner가 다르면 권위 경쟁이 아니라 intended state와 actual
  state 사이의 drift로 본다. 어느 쪽이 stale한지 확인한 뒤 승인된 intent에 맞게
  조정한다.
- 실제 구현을 새 intent로 채택하려면 관련 decision과 intended owner를 명시적으로
  갱신한다. 현재 code가 그렇게 동작한다는 이유만으로 contract나 architecture를
  조용히 바꾸지 않는다.
- 아직 유효한 decision에 반하는 결과 변경은 기존 기록을 조용히 덮어쓰지 않고 해당
  선택을 대체하는 decision을 남긴다.
- Product가 제품 scope를 정하고 roadmap은 그 안의 우선순위와 순서를
  정한다. Roadmap은 product scope를 확장하지 않는다.
- `plans/`의 plan 문서에 표시된 상태가 단계 로그나 실제 검증 결과와 다르면 plan
  상태를 실제 결과에 맞춰 조정한다.
- `AGENTS.md`의 구속적인 agent 규칙은 guide보다 우선한다. Guide는 agent 규칙을
  override하지 않는다.
- Cross-cutting 요구는 새 owner를 만들지 않는다. 외부 보장 동작, 내부 mechanism과
  추진 우선순위를 각각 specs, architecture와 roadmap에 둔다.
