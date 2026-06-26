---
topic: architecture agent guidelines
description: Rules for agents reading, writing, and validating architecture documents.
---

# Architecture Agent Guidelines

이 디렉토리(`docs/architecture/`)의 문서는 시스템의 내부 구조, 책임 배치, 모듈/프로세스 경계, 데이터 플로우, 내부 상태
관리 원칙을 정의한다.

`docs/` 공통 작성 규칙(링크 형식·중복 금지·status 배치·evidence·staleness)은 상위 [[docs/AGENTS]]가 소유한다.
아래는 architecture type 전용 규칙이다.

## 1. Architecture 작성 원칙

- **책임과 플로우 중심**: 내부 구조, 컴포넌트 책임, 생명주기 불변성, 데이터 흐름을 설명한다.
- **Spec Contract 복사 금지**: protocol이나 external contract text를 `docs/specs/`에서 복사하지 않는다. Spec owner를 링
  크하고 architecture는 내부 구조, 책임 경계, flow, lifecycle invariant, implementation evidence에 집중한다.
- **국소적 구현 상세 위임**: 특정 함수의 세부 로직·지엽적 구현은 code/tests에 맡긴다. 무엇을 architecture로 승격하고
  무엇을 code/tests에 남기는지의 기준은 [[docs/documentation-system]] Architecture가 소유한다.

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

Evidence:

- [[src/daemon/state.ts]]
  - `src/daemon/state.ts:1761-1864`
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

## 4. Architecture Slice Skeleton

새 architecture slice를 작성할 때의 authoring default다. 강제 boilerplate가 아니며 빈 섹션은 생략한다. 이 skeleton은
architecture slice 작성용이며, 인덱스(`local-agent-runtime.md`)는 이 skeleton이 아니라 §3을 따른다.

```md
# <Architecture Slice Name>

Related:

- [[docs/architecture/local-agent-runtime]]
- [[docs/specs/relevant-spec]]

Status: Current

## Responsibility

이 slice가 소유하는 내부 책임과 경계를 적는다.

## Flow

주요 data/process flow를 적는다. 필요하면 Mermaid를 쓴다.

## Implementation Evidence

현재 구현 사실의 code/test 근거를 적는다.

Evidence:

- [[src/path/file.ts]]
  - `src/path/file.ts:10-20`

## Drift / Gaps

문서와 코드 차이, 또는 현재 gap을 적는다.

## Sources

- `logs/...`
```

## 5. Drift 처리

drift(문서 ↔ code/tests 불일치) 판정·처리의 일반 절차는 [[docs/documentation-system]] Conflict Resolution과 상위
[[docs/AGENTS]] Staleness And Drift가 소유한다. 아래는 architecture 전용 적용이다.

- `As-built`로 표시된 구조 주장이 code/tests와 어긋나면 drift로 보고, 문서와 구현 중 무엇이 stale한지 확인한 뒤 승인된
  owner를 갱신한다.
- code가 현재 다르게 동작한다는 이유만으로 target architecture를 as-built로 덮거나 product/spec intent를 바꾸지 않는다.

## 6. Validation 및 Cross-Owner 링크

- architecture 문서를 갱신하기 전, 연관된 source code(`src/` 등)를 교차 검증해 문서의 flow가 실제 코드 구조와 맞는지
  확인한다. 사실·추론·의견 구분 보고는 repo root `AGENTS.md`의 Evidence And Reporting을 따른다.
- 왜 이 구조인지 문서만으로 복원되지 않는 경우에만 관련 decision을 링크한다.
- Target/Proposed 구조가 특정 공개 전 완료 조건과 연결될 때만 roadmap을 선택적으로 참조한다.
