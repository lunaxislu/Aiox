---
topic: product agent guidelines
description: docs/product/ (제품 목적·범위·원칙·roadmap) 작성 규칙. 공통 규칙은 docs/AGENTS.md로 위임한다.
---

# Product Agent Guidelines

`docs/product/`는 제품 scope 문서와 roadmap 문서를 함께 담는 physical scope다. `product.md`와
`roadmap.md`는 같은 폴더 안의 서로 다른 knowledge sub-kind이며, 각각 다른 작성 규칙을 따른다.

- `product.md`: 제품의 목적, 사용자, 범위와 제품 원칙을 소유한다. PRD 전체·구현 계약·우선순위 목록을
  통째로 소유하지 않는다.
- `roadmap.md`: product scope 안의 release gate, phase, 우선순위와 순서를 소유한다. product scope를
  확장하거나 현재 구현 checklist를 대신하지 않는다.

`docs/` 공통 작성 규칙(링크 형식·중복 금지·status 배치·evidence·sources·change/drift
validation)은 상위 [[docs/AGENTS]]가 소유한다. 아래는 product type 전용 규칙이다.

## Product 작성 규칙

- product 문서는 외부 contract, 구현 상세, protocol field, internal architecture state를 소유하지 않는다.
  외부 contract는 관련 spec 문서(예: [[docs/specs/aiox-a2a]]), 내부 구조는 관련 architecture 문서가
  소유한다. Product 문서에는 이를 복사하지 않고 관련 owner 문서로 링크한다. 작성 규칙은
  [[docs/specs/AGENTS]]와 [[docs/architecture/AGENTS]]를 따른다.
- product type은 별도 skeleton을 두지 않고, 아래 authoring invariants를 따른다.
- product-scope 문서는 User Value(왜 필요한가)와 Scope(목적·사용자·포함 범위·핵심 경계)를 중심으로 쓴다.
- 제품의 target direction·positioning은 scope와 경계를 정의하는 데 필요한 만큼만 방향 문장으로 남긴다.
  구체 contract·내부 설계·release phase·실행 task는 각각 specs·architecture·roadmap·plans가 소유한다.
  Product 문서에는 상세를 복사하지 않고 관련 owner 문서로 링크한다.
- 별도 Non-Goals/Boundaries/Deferred 섹션을 기본으로 만들지 않는다. 핵심 경계는 Scope 안에 적고, 보류된
  work는 해당 target owner가 소유한다.

## Roadmap 작성 규칙

- `roadmap.md`는 release gate, phase, 우선순위, gate 통과 기준과 요구 evidence 항목을 소유한다.
- product가 정한 scope 안에서 우선순위·순서만 정하고, product scope를 확장하지 않는다.
- 개별 task 실행 절차·할당·진행 상태·cutover checklist는 `plans/`가 owner다. roadmap에 plan checklist나
  plan 진행 상태를 대신 넣지 않는다.
- contract 본문은 spec owner가 소유한다. roadmap은 관련 spec 문서(예: [[docs/specs/aiox-a2a]])로 링크만
  하고 contract text를 복사하지 않는다. gate는 contract를 정의하지 않고 통과 조건으로만 참조한다.
- `roadmap.md`는 Release Path / Gate Overview / Phase 0 Release Gates / Post-Release Phases /
  Gate Evidence / Cross-Platform Requirement 구조를 따른다.
- Gate card는 `목표`, `진입 조건`, `착수 검토 / 열린 결정`, `통과 조건`, `Owner refs`를 가진다.
  `Owner refs`는 단순 링크 목록이 아니라, 각 owner 문서에서 무엇을 확인하려고 가는지 짧게 설명하는
  annotated refs로 작성한다.
- `G1/G3 Parallel Stabilization`, `G5/G6 Release Preparation`처럼 병행 또는 묶음 처리가 필요한 gate는
  grouping heading 아래에 sub-gate card를 중첩할 수 있다.
- Phase card는 필요할 때 목표, 범위, 순서와 owner refs를 묶되, release gate가 아닌 phase에 gate식
  통과 조건을 강제하지 않는다.

## Roadmap Section Ownership

`roadmap.md`의 각 섹션은 아래 소유 경계를 따른다. 표시된 외부 내용은 복사하지 않고 해당 owner로
annotated ref를 둔다.

- `Release Path`: product scope 안의 release path와 pre-release / post-release 분기를 소유한다.
  product scope 자체는 [[docs/product/product]]가 소유한다.
- `Gate Overview`: gate card를 훑기 전에 필요한 gate 목록, 순서와 한 줄 목적을 소유한다. gate 기준을
  별도 실행 후보 표로 재분류하지 않는다.
- `Phase 0 Release Gates`: Phase 0 공개 전 gate별 목표, 진입 조건, 착수 검토 / 열린 결정, 통과 조건과
  annotated owner refs를 소유한다. spec contract 본문, architecture HOW, plan checklist/status,
  migration audit ledger는 넣지 않는다.
- `Post-Release Phases`: 공개 이후 phase의 목표, 범위, 순서와 관련 owner refs를 소유한다. 해당
  phase가 release gate가 아니라면 gate식 통과 조건을 강제하지 않는다.
- `Gate Evidence`: gate별 요구 evidence 항목과 기준을 소유한다. evidence 산출물(test, CI, clean-host
  run)과 구현은 code/tests/`plans/`가 소유한다. dated audit/source provenance는 `logs/`가 소유하므로
  별도 Validation Provenance 섹션을 만들지 않는다.
- `Cross-Platform Requirement`: cross-platform이 gate와 phase에 거는 제약을 소유한다. OS별 구현
  상세는 architecture/code가 소유한다.

## Roadmap Change Rules

`roadmap.md`를 수정할 때는 변경 종류를 먼저 분류한다.

- Add: 새 gate card, phase card, evidence 기준이나 owner ref를 추가할 때는 product scope 안에 있는지
  먼저 확인한다. 새 contract 본문은 specs로, 내부 구현 방향은 architecture로, 실행 checklist는
  `plans/`로 보낸다.
- Update: gate 순서, phase 범위, priority, evidence 기준을 바꿀 때는 product scope와 기존 roadmap
  intent를 바꾸는지 확인한다. intent 변경이면 사용자에게 보고하고 승인된 방향으로만 수정한다.
- Delete: gate card, phase card, evidence 기준이나 owner ref를 삭제할 때는 해당 내용이 다른 owner에
  남는지 확인한다. 현재 release 판단을 복원하는 유일한 정보이면 삭제하지 말고 축약, 이동 또는
  annotated owner ref 연결 중 하나를 택한다.
- Move/Reclassify: roadmap 내용이 plan task, spec contract, architecture detail, audit provenance에
  가깝다면 roadmap에 복사해 두지 않고 owning 문서로 이동하거나 링크한다.
- Retire removed sections: `Current Execution Candidates`는 제거하고 gate 기준 표로 대체하지 않는다.
  `Pre-Release Gap Summary`도 제거한다. 현재 release pressure는 gate card로, dated audit/source
  provenance는 `logs/`로 보낸다.

## Status

product 문서가 쓰는 section/claim status 어휘만 정의한다. 문서 레벨 `Status:` 배치와 inline
`[Status: ...]` 사용 조건은 상위 [[docs/AGENTS]] Status가 소유한다.

- `Current`: 현재 제품 목적·범위·원칙, 또는 현재 승인된 roadmap 상태.
- `Target`: 목표 제품 방향이나 목표 추진 상태.

문서 전체가 `Current`여도 내부에 `Target` claim이 있을 수 있다. 보류된 work는 product status가 아니라
roadmap phase, spec target, architecture target이 소유한다.

## Drift 처리

`product.md`는 현재 구현 동작 주장을 거의 소유하지 않으므로 일반 drift 절차는 상위
[[docs/AGENTS]] Change And Drift Validation과 [[docs/documentation-system]] Conflict Resolution이
소유한다. `roadmap.md`의 주장은 아래로 분류한다.

- current/progress claim(gate 완료, current gap/status, plan 참조)이 plan·code·test와 어긋나면 stale 여부를 확인하고
  갱신한다.
- gate/target criterion(통과 기준, target phase)은 code가 아직 못 한다는 이유만으로 낮추지 않는다.
  바꾸려면 product/roadmap intent 변경으로 보고·승인한다(절차는 상위 [[docs/AGENTS]] Change And Drift
  Validation).
- current claim인지 target criterion인지 불명확하면 임의 판정하지 않고 사용자에게 확인한다.

## Validation And Cross-Owner Checks

- product scope나 product principle을 바꾸면 관련 spec, architecture, roadmap이 새 scope를 암시하거나
  위반하지 않는지 확인한다.
- roadmap gate, phase, priority를 바꾸면 product scope를 확장하지 않는지, contract 본문을 specs에서
  복사하지 않았는지, plan checklist/status를 대신하지 않는지 확인한다.
- roadmap gate card와 phase card를 바꾸면 `Owner refs`가 링크만 나열하지 않고 확인 목적을 설명하는지,
  migration audit ledger나 dated source provenance를 복사하지 않았는지 확인한다.
- 작성 후 [[docs/documentation-system]] 권한 모델을 위반하지 않았는지 교차 검증한다.
- 왜 제품 방향이나 priority가 바뀌었는지 문서만으로 복원되지 않는 경우에만 관련 decision을 링크한다.
