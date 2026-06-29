---
topic: architecture agent guidelines
description: Rules for agents reading, writing, and validating architecture documents.
---

# Architecture Agent Guidelines

이 디렉토리(`docs/architecture/`)의 문서는 시스템의 내부 구조, 책임 배치, 모듈/프로세스 경계, 데이터 플로우, 내부 상태
관리 원칙을 정의한다.

`docs/` 공통 작성 규칙(링크 형식·중복 금지·status 배치·evidence·change/drift validation)은 상위 [[docs/AGENTS]]가
소유한다.
아래는 architecture type 전용 규칙이다.

## 1. Architecture 작성 원칙

- **책임과 플로우 중심**: 내부 구조, 컴포넌트 책임, 생명주기 불변성, 데이터 흐름을 설명한다.
- **Spec Contract 복사 금지**: protocol이나 external contract text를 `docs/specs/`에서 복사하지 않는다. Spec owner를
  링크하고 architecture는 내부 구조, 책임 경계, flow, lifecycle invariant, implementation evidence에 집중한다.
- **국소적 구현 상세 위임**: 특정 함수의 세부 로직·지엽적 구현은 code/tests에 맡긴다. 무엇을 architecture로 승격하고
  무엇을 code/tests에 남기는지의 기준은 [[docs/documentation-system]] Architecture가 소유한다.
- **상속 + architecture 역할**: architecture 문서는 상위 [[docs/AGENTS]]의 공통 계약을 상속한다. 그 위에서 내부
  구조·책임·경계·flow·lifecycle/state invariant를 as-built/current/target/proposed 의미에 맞게 복원하도록 section을
  구성한다.

## 2. Status

문서 레벨 `Status:` 배치와 inline `[Status: ...]` 사용 조건은 상위 [[docs/AGENTS]] Status가 소유한다. 이 절은
architecture 문서가 쓰는 status 어휘만 정의한다.

문서 레벨 `Status: Current`인 architecture 문서 안에도 target/proposed/gap section이 있을 수 있다. 문서가 현재 유효한
owner라는 뜻과, 특정 섹션의 구조가 proposed라는 뜻은 충돌하지 않는다.

Allowed section/claim statuses:

- `As-built`: 현재 코드에 구현된 내부 구조. code/test evidence를 붙인다.
- `Current`: 현재 유효한 architecture statement.
- `Target`: 목표 구조.
- `Proposed`: 제안된 구조이며 아직 current/target으로 확정되지 않음.
- `Deferred`: 의도적으로 보류된 구조.
- `Current gap`: 현재 구현의 알려진 gap, limitation, missing piece.

예:

```md
## Delivery Queue [Status: As-built]

The daemon persists queued deliveries in the message store.
```

## 3. local-agent-runtime Index And Slice Ownership

`docs/architecture/local-agent-runtime.md` is the compatibility index and navigation hub for the split local runtime
architecture.

- Do not add new full architecture body text to `local-agent-runtime.md` when the relevant architecture slice already
  exists.
- Add or update architecture content in the owning slice document instead.
- Keep `local-agent-runtime.md` stubs, status vocabulary, module overview, authority links, and document map consistent
  with the slices.
- When adding a new architecture area, decide whether it belongs in an existing slice or needs a new slice, then update
  `local-agent-runtime.md` only as the index/navigation entry.
- Preserve existing §N / §N.x headings and inbound anchors unless an explicit migration updates inbound references.

## 4. Architecture Slice Composition

새 architecture slice는 고정 skeleton이나 subtype 목록을 채우는 문서가 아니다. 그 slice가 답해야 하는 architecture 질문과
상위 [[docs/AGENTS]]의 가장 좁은 유효 범위 원칙에 따라 필요한 section만 구성한다. 인덱스(`local-agent-runtime.md`)는 이
composition 규칙이 아니라 §3을 따른다.

Architecture slice가 복원해야 하는 내용은 내부 책임과 경계, data/process flow, lifecycle/state invariant, current gap,
target/proposed 구조, schema/catalog나 cross-cutting invariant처럼 문서 질문에 따라 달라진다. 이 목록은 닫힌 subtype
분류가 아니라 authoring 중 확인할 수 있는 architecture content 후보이며, 맞지 않는 항목을 억지로 section으로 만들지 않는다.

`Related:`, `Status:`, `Evidence:`와 `Sources:`의 placement와 block 사용 조건은 상위 [[docs/AGENTS]]를 따른다.
Architecture child의 추가 의무는 current/as-built 내부 구조 주장이 code/test evidence로 검증 가능해야 한다는 점이다.

Architecture evidence mapping 예시:

```md
The daemon persists queued deliveries in the message store. [Status: As-built]

Evidence:

- Queue persistence
  - [[src/path/file.ts]]
    - `src/path/file.ts:10-20`
```

흔한 compact slice form 예시(강제 아님):

```md
# <Architecture Slice Name>

## Responsibility

이 slice가 소유하는 내부 책임과 경계를 적는다.

## Flow

주요 data/process flow를 적는다. 필요하면 Mermaid를 쓴다.

## Drift / Gaps

문서와 코드 차이, 또는 현재 gap을 적는다.
```

## 5. Drift 처리

drift(문서 ↔ code/tests 불일치) 판정·처리의 일반 절차는 [[docs/documentation-system]] Conflict Resolution과
상위 [[docs/AGENTS]] Change And Drift Validation이 소유한다. 아래는 architecture 전용 적용이다.

- `As-built`로 표시된 구조 주장이 code/tests와 어긋나면 drift로 보고, 문서와 구현 중 무엇이 stale한지 확인한 뒤 승인된
  owner를 갱신한다.
- code가 현재 다르게 동작한다는 이유만으로 target architecture를 as-built로 덮거나 product/spec intent를 바꾸지 않는다.

## 6. Validation 및 Cross-Owner 링크

- architecture 문서를 갱신하기 전, 변경하는 claim이 `As-built`/current behavior, `Current` architecture statement,
  `Target`/`Proposed` 구조 중 무엇인지 먼저 분류한다.
- `As-built`/current behavior claim을 추가하거나 바꾸면 관련 source code(`src/` 등)와 tests를 교차 검증해 실제 내부 구조와
  맞는지 확인한다.
- `Target`/`Proposed` 구조가 product intent나 spec contract에 의존하면 해당 owner를 확인하고, code가 다르다는 이유만으로
  target architecture를 current/as-built로 낮추지 않는다.
- 왜 이 구조인지 문서만으로 복원되지 않는 경우에만 관련 decision을 링크한다.
- Target/Proposed 구조가 특정 공개 전 완료 조건과 연결될 때만 roadmap을 선택적으로 참조한다.
