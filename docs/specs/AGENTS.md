---
topic: specification agent guidelines
description: Rules for agents reading, writing, and splitting specification documents.
---

# Specification Agent Guidelines

이 디렉토리(`docs/specs/`)의 문서는 시스템의 외부 동작, 인터페이스, 프로토콜, 데이터/상태 컨트랙트(Contract)를 정의한다.

`docs/` 공통 작성 규칙(링크 형식·중복 금지·status 배치·evidence·staleness)은 상위 [[docs/AGENTS]]가 소유한다.
아래는 spec type 전용 규칙이다.

## 1. Spec 작성 원칙

- **외부 컨트랙트 중심**: 외부 주체, 다른 모듈, 또는 연동 구현체가 호환성을 위해 지켜야 하는 행동과 외부 계약만 작성한다.
- **내부 구현 상세 금지**: 내부 아키텍처나 현재 구현 상세(HOW)를 길게 복사하지 않는다. 내부 구조와 책임 배치는
  `docs/architecture/`가 소유한다.
- **일정/계획 혼합 금지**: Roadmap, Plans의 실행 순서, 작업 할당, 마일스톤을 Spec 문서에 섞지 않는다.

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

기존 `aiox-a2a.md`는 이 status tag 형식보다 먼저 작성되었으므로 MUST/SHOULD language, section-level defaults, inline
status notes를 유지할 수 있다. 새 split/slice 파일은 위 status 어휘를 사용하되 기존 section 의미를 보존한다.

## 3. aiox-a2a Index And Slice Ownership

`docs/specs/aiox-a2a.md` is the compatibility index and navigation hub for the split A2A protocol.

- Do not add new full contract text to `aiox-a2a.md` when the relevant protocol slice already exists.
- Add or update contract text in the owning slice document instead.
- Keep `aiox-a2a.md` stubs, status vocabulary, glossary, layer model, and document map consistent with the slices.
- When adding a new protocol area, decide whether it belongs in an existing slice or needs a new slice, then update
  `aiox-a2a.md` only as the index/navigation entry.
- Preserve existing §N / §N.x headings and inbound anchors unless an explicit migration updates inbound references.
- Existing MUST/SHOULD and section-level default meaning must be preserved when moving or editing slice text.

## 4. Spec Slice Skeleton

새 spec slice를 작성할 때의 authoring default다. 강제 boilerplate가 아니며 빈 섹션은 생략한다. 이 skeleton은 spec slice
작성용이며, 인덱스(`aiox-a2a.md`)는 이 skeleton이 아니라 §3을 따른다.

```md
# <Contract / Protocol Slice Name>

Related:

- [[docs/specs/aiox-a2a]]
- [[docs/architecture/relevant-slice]]
- [[docs/decisions/relevant-decision]]

Status: Current

## Scope

이 slice가 소유하는 외부 contract/interface/protocol 범위를 적는다.

## Contract

MUST/SHOULD, field, state, protocol behavior, compatibility rule, externally observable lifecycle/state transition을 적는다.

## Implementation Evidence

current/as-built contract claim을 할 때만 code/test 근거를 적는다. 내부 구조 설명은 architecture owner로 링크한다.

Evidence:

- [[src/path/file.ts]]
  - `src/path/file.ts:10-20`

## Open Questions

아직 확정되지 않은 contract 질문만 적는다.

## Sources

- `logs/...`
```

## 5. Spec Drift 처리

drift(문서 ↔ code/tests 불일치) 판정·처리의 일반 절차는 [[docs/documentation-system]] Conflict Resolution과 상위
[[docs/AGENTS]] Staleness And Drift가 소유한다. 아래는 spec 전용 적용이다.

- `Current` contract나 current/as-built 동작 주장이 code/tests와 어긋나면 drift로 보고, 문서와 구현 중 무엇이 stale한지
  확인한 뒤 승인된 owner를 갱신한다.
- code가 현재 다르게 동작한다는 이유만으로 `Normative` 또는 `Committed target` contract를 current/as-built로 덮거나
  product/roadmap intent를 바꾸지 않는다.
- 실제 구현 동작을 새 contract로 채택하려면 관련 spec 문서와 필요한 decision을 명시적으로 갱신하고, 구현·테스트 근거를
  함께 남긴다.

## 6. Validation 및 Cross-Owner 링크

- contract text를 추가하거나 변경할 때 product scope나 roadmap priority를 확장할 위험이 있거나, 새 spec 영역 또는 target
  contract를 추가하는 경우 `docs/product/product.md`와 `docs/product/roadmap.md`를 확인한다.
- 작성 후 [[docs/documentation-system]]의 권한 모델을 위반하지 않았는지 교차 검증한다.
- 왜 이 contract가 생겼는지 문서만으로 복원되지 않는 경우에만 관련 decision을 링크한다.
- 우선순위·release timing을 암시하는 경우에만 roadmap을 선택적으로 참조한다.
