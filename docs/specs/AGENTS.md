---
topic: specification agent guidelines
description: Rules for agents reading, writing, and splitting specification documents.
---

# Specification Agent Guidelines

이 디렉토리(`docs/specs/`)의 문서는 시스템의 외부 동작, 인터페이스, 프로토콜, 데이터/상태 컨트랙트(Contract)를 정의한다.

`docs/` 공통 작성 규칙(링크 형식·중복 금지·status 배치·evidence·change/drift validation)은 상위 [[docs/AGENTS]]가 소유한다.
아래는 spec type 전용 규칙이다.

## 1. Spec 작성 원칙

- **외부 컨트랙트 중심**: 외부 주체, 다른 모듈, 또는 연동 구현체가 호환성을 위해 지켜야 하는 행동과 외부 계약만 작성한다.
- **내부 구현 상세 금지**: 내부 아키텍처나 현재 구현 상세(HOW)를 길게 복사하지 않는다. 내부 구조와 책임 배치는
  `docs/architecture/`가 소유한다.
- **일정/계획 혼합 금지**: Roadmap, Plans의 실행 순서, 작업 할당, 마일스톤을 Spec 문서에 섞지 않는다.
- **상속 + spec 역할**: spec 문서는 상위 [[docs/AGENTS]]의 공통 계약을 상속한다. 그 위에서 외부 contract,
  compatibility rule, protocol state, externally observable lifecycle을 normative/current/target/open 의미에 맞게
  복원하도록 section을 구성한다.

## 2. Status

문서 레벨 `Status:` 배치와 inline `[Status: ...]` 사용 조건은 상위 [[docs/AGENTS]] Status가 소유한다. 이 절은 spec
문서가 쓰는 section/claim status 어휘만 정의한다.

Allowed section/claim statuses:

- `Normative`: 반드시 지켜야 하는 contract/invariant.
- `Current`: 현재 구현 또는 현재 승인된 contract 상태.
- `Committed target`: 승인된 target contract.
- `Exploratory`: 탐색 중인 contract 후보.
- `Open/deferred`: 열려 있거나 보류된 contract 질문.

예:

```md
## Message Routing [Status: Normative]

Implementations MUST preserve source-only reply routing unless an explicit route override is defined.
```

## 3. Spec Ownership

현재 TUI 제품의 설계 진입점은 [[docs/aiox-tui-product]]다. 각 spec은 runtime, collaboration,
host, configuration/Web의 외부 계약을 소유한다. 다른 spec의 계약을 복제하지 않고 owning
문서로 연결한다. 새 영역을 분리할 때에는 설계 진입점의 문서 지도도 함께 갱신한다.
이전 A2A index와 §N anchor를 새 문서에 호환 요구로 유지하지 않는다.

## 4. Spec Slice Composition

새 spec slice는 고정 skeleton을 채우는 문서가 아니다. 그 slice가 답해야 하는 external contract 질문과 상위 [[docs/AGENTS]]의
가장 좁은 유효 범위 원칙에 따라 필요한 section만 구성한다. 문서 간 소유 경계는 §3을 따른다.

Spec slice가 복원해야 하는 내용은 scope, normative contract, field/state table, protocol behavior, compatibility rule,
externally observable lifecycle/state transition, current implementation caveat, open/deferred contract question처럼 문서 질문에
따라 달라진다. 이 목록은 닫힌 subtype 분류가 아니라 authoring 중 확인할 수 있는 spec content 후보이며, 맞지 않는 항목을
억지로 section으로 만들지 않는다.

`Related:`, `Status:`, `Evidence:`와 `Sources:`의 placement와 block 사용 조건은 상위 [[docs/AGENTS]]를 따른다. Spec child의
추가 의무는 `Current` contract나 current implementation claim이 code/test evidence로 검증 가능해야 한다는 점이다.
Open/deferred contract 질문이 있을 때만 `Open Questions` 같은 body section을 둔다.

Spec evidence mapping 예시:

```md
The current pre-v1 daemon rejects messages with no active directed route as `no_active_routes`. [Status: Current]

Evidence:

- No active route rejection
  - [[src/path/file.ts]]
    - `src/path/file.ts:10-20`
```

흔한 compact slice form 예시(강제 아님):

```md
# <Contract / Protocol Slice Name>

## Scope

이 slice가 소유하는 외부 contract/interface/protocol 범위를 적는다.

## Contract

MUST/SHOULD, field, state, protocol behavior, compatibility rule, externally observable lifecycle/state transition을 적는다.
```

## 5. Spec Drift 처리

drift(문서 ↔ code/tests 불일치) 판정·처리의 일반 절차는 [[docs/documentation-system]] Conflict Resolution과 상위
[[docs/AGENTS]] Change And Drift Validation이 소유한다. 아래는 spec 전용 적용이다.

- `Current` contract나 current implementation 동작 주장이 code/tests와 어긋나면 drift로 보고, 문서와 구현 중 무엇이 stale한지
  확인한 뒤 승인된 owner를 갱신한다.
- code가 현재 다르게 동작한다는 이유만으로 `Normative` 또는 `Committed target` contract를 `Current` contract로 덮거나
  product/roadmap intent를 바꾸지 않는다.
- 실제 구현 동작을 새 contract로 채택하려면 관련 spec 문서와 필요한 decision을 명시적으로 갱신하고, 구현·테스트 근거를
  함께 남긴다.

## 6. Validation 및 Cross-Owner 링크

- spec 문서를 갱신하기 전, 변경하는 claim이 `Normative`, `Current`, `Committed target`, `Exploratory`, `Open/deferred`
  중 무엇인지 먼저 분류한다.
- `Current` contract나 current implementation claim을 추가하거나 바꾸면 관련 source code(`src/` 등)와 tests를 교차 검증해
  실제 외부 동작과 맞는지 확인한다.
- 새 spec 영역을 추가하거나, 변경이 product scope나 roadmap priority를 확장할 위험이 있으면 `docs/product/product.md`와
  `docs/product/roadmap.md`를 확인한다. `Normative` 또는 `Committed target` contract를 바꿀 때는 이 확인을 특히
  빠뜨리지 않는다.
- 작성 후 [[docs/documentation-system]]의 권한 모델을 위반하지 않았는지 교차 검증한다.
- 왜 이 contract가 생겼는지 문서만으로 복원되지 않는 경우에만 관련 decision을 링크한다.
- 우선순위·release timing을 암시하는 경우에만 roadmap을 선택적으로 참조한다.
