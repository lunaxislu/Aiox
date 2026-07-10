# documentation-system.md를 docs/ 루트에 둔다

## Context

[[docs/documentation-system]]는 이 repo 문서 taxonomy의 owner-map(영역별 정보 owner·질문별 권위·conflict 규칙)을 소유한다. 이 문서는 원래 `docs/architecture/`에 있었고, 그 위치에서는 [[docs/architecture/AGENTS]]의 architecture type 전용 계약(spec 복사 금지·as-built/target·drift 등)의 지배를 받았다.

그런데 taxonomy 자신이 architecture를 "specs와 product intent를 만족시키기 위한 내부 구조"로 정의한다. 이 정의대로면 문서 거버넌스 지도인 taxonomy는 architecture type 콘텐츠가 아니다. 즉 owner-map 권위 문서가 자기 정의에 맞지 않는 owner(architecture) 밑에 misfiled돼 있었다.

이 misfiling은 외관상 거버넌스 순환도 만들었다: `docs/AGENTS.md`가 owner 경계를 taxonomy에 위임 → taxonomy는 `docs/architecture/AGENTS.md` 지배 → `docs/architecture/AGENTS.md`는 공통 규칙을 다시 `docs/AGENTS.md`에 위임.

## Decision

[[docs/documentation-system]]를 `docs/architecture/`에서 `docs/` 루트로 옮겨, leaf owner type 계약이 아니라 [[docs/AGENTS]] 공통 작성 규칙의 직접 지배만 받게 한다.

## Alternatives

- **위치 유지 + "2축 직교" 설명 노트만 추가**: taxonomy(정보 소유 축)와 AGENTS 계약(작업규칙 축)이 직교라는 설명만 단다. 기각 — smell을 제거하지 않고 설명만 한다. taxonomy는 여전히 맞지 않는 type 계약 밑에 남는다.
- **taxonomy의 두 역할 분리**: owner-map과 meta-rule을 별도 문서로 쪼갠다. 기각 — over-engineering. 이 문서는 단일 taxonomy 권위로 응집되어 있다.

## Rationale

물리 위치가 개념 위계와 일치한다 — taxonomy는 leaf owner들의 메타이고, 한 leaf owner의 type 규칙이 아니라 docs 전역 공통 계약의 지배를 받아야 한다. 이동으로 owner/altitude 불일치가 사라지고, 3-노드 외관상 순환이 `docs/AGENTS ↔ taxonomy`의 양성 2-노드 직교 관계(내용 참조 ⊥ 서식 적용)로 정리된다. "물리 배치가 의존 방향을 반영해야 한다"는 top-down 원칙에 부합한다.

## Trade-offs

active 권위 문서의 inbound 참조를 repoint해야 했다([[docs/AGENTS]]·[[docs/guides/workflow]]·[[docs/specs/AGENTS]]·[[plans/AGENTS]]·[[logs/AGENTS]]). 과거 로그의 옛 경로 참조는 historical record로 둔다. 비권위 예시 문자열의 옛 경로는 별도 cleanup 대상이었으며, 현재 live authority inbound로 취급하지 않는다.

## Re-evaluation

미래 taxonomy가 architecture를 문서 시스템 거버넌스까지 포함하도록 명시적으로 재정의하거나, `docs/` 루트에 owner가 아닌 파일이 과도하게 쌓이면 위치를 다시 검토한다.

## Sources

- `logs/workspace-reset/plan-stages/2026-06-26-workspace-reset-stage8-Atlas-반영·drift-재검토.md`
- `logs/docs-system/2026-06-25-docs-하위-지침서와-Obsidian-템플릿-논의.md`
