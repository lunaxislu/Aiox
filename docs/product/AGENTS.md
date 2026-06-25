---
topic: product agent guidelines
description: docs/product/ (제품 목적·범위·원칙·roadmap) 작성 규칙. 공통 규칙은 docs/AGENTS.md로 위임한다.
---

# Product Agent Guidelines

`docs/` 공통 작성 규칙(링크 형식·중복 금지·staleness·split)은 상위 [[docs/AGENTS]]가
소유한다. 아래는 product type 전용 규칙이다.

`docs/product/`는 제품 사실의 owner다.

- `product.md`: 제품의 목적, 범위, 제품 원칙을 소유한다. PRD 전체·구현 계약·우선순위
  목록을 통째로 소유하지 않는다.
- `roadmap.md`: product scope 안의 추진 방향·우선순위·순서를 소유한다. product scope를
  확장하거나 현재 구현 checklist를 대신하지 않는다.

## 작성 규칙

- product가 제품 scope를 정하고 roadmap은 그 안의 우선순위·순서를 정한다. roadmap은
  scope를 확장하지 않는다.
- 외부 contract는 [[docs/specs/AGENTS]], 내부 구조는 [[docs/architecture/AGENTS]]
  owner로 보내고 여기에 복사하지 않는다.
- 실행 순서·task 할당·마일스톤 checklist는 `plans/`가 owner다. roadmap에 실행 checklist를
  섞지 않는다.
