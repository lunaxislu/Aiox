---
topic: specification agent guidelines
description: Rules for agents reading, writing, and splitting specification documents.
---

# Specification Agent Guidelines

이 디렉토리(`docs/specs/`)의 문서는 시스템의 외부 동작, 인터페이스, 프로토콜, 데이터/상태 컨트랙트(Contract)를 정의합니다. 에이전트나 Harness가 이 디렉토리의 문서를 읽거나 수정할 때는 다음 규칙을 엄격히 따라야 합니다.

`docs/` 공통 작성 규칙(링크 형식·중복 금지·staleness·split 일반 규칙)은 상위 [[docs/AGENTS]]가 소유합니다. 아래는 spec type 전용 규칙입니다.

## 1. Spec 작성 원칙 (Content Rules)
- **외부 컨트랙트 중심**: Spec에는 외부 주체, 다른 모듈, 또는 연동 구현체가 호환성을 위해 지켜야 하는 **행동과 외부 계약**만 작성합니다. (제품의 기획/범위/우선순위는 `product`/`roadmap`이 소유하므로 포함하지 않습니다.)
- **내부 구현 상세 금지**: 내부 아키텍처나 현재 구현 상세(HOW)를 길게 복사하여 붙여넣지 마십시오. 내부 구조와 책임 배치는 `docs/architecture/`의 역할입니다.
- **일정/계획 혼합 금지**: Roadmap이나 Plans의 실행 순서, 작업 할당, 마일스톤을 Spec 문서에 섞어 쓰지 마십시오. Spec은 우선순위와 무관한 시스템의 의도된 명세입니다.

## 2. 상태(Status) 표기 규칙
별도의 파일 분리 없이, 기능 단위나 섹션 내부에 다음 상태 어휘를 사용하여 명세의 현재 위치를 표시해야 합니다.
- **`[Status: Normative]`**: 반드시 지켜야 하는 핵심 규범이나 변하지 않는 원칙
- **`[Status: Current]`**: 현재 코드베이스에 이미 구현되어 동작하는 명세. 이 상태를 주장할 때는 test 경로, `docs/architecture/` 섹션, 또는 code `file:line` 중 하나를 근거로 둔다.
- **`[Status: Committed target]`**: 다음 마일스톤에 구현하기로 확정된 명세
- **`[Status: Exploratory]`**: 현재 조사 중이거나 확정되지 않은 탐색적 명세
- **`[Status: Open/deferred]`**: 제안되었으나 현재 보류(Deferred) 중인 미래 명세

*Note: Existing `aiox-a2a.md` predates this status tag format and may use MUST/SHOULD language, section-level defaults, and inline Status notes. New split/slice files should use the `[Status: ...]` tags defined here while preserving the meaning of existing `aiox-a2a.md` sections.*

## 3. 문서 분할 (Section ID 보존)
일반 split 규칙(inbound·anchor 확인, 원본 stub holder 유지, slice는 단일 owner, stub redirect는 wikilink)은 [[docs/AGENTS]]가 소유합니다. 아래는 spec 전용 주의사항입니다.
- spec은 `plans/`·`logs/`의 외부 inbound 참조가 많습니다. 원본의 Section ID(예: `#4-message-routing`)와 제목을 보존해 inbound가 깨지지 않게 하십시오.
- 기존 `aiox-a2a.md`의 MUST/SHOULD·section-level default 의미는 slice로 옮길 때 보존하십시오(§2 status 태그 참고).

## 4. Agent 및 Harness 확인 절차
- **작성 전**: Before adding or changing contract text, check `docs/product/product.md` and `docs/product/roadmap.md` to ensure the spec does not expand product scope or imply roadmap priority that those owners have not approved.
- **작성 후**: `docs/documentation-system.md`의 권한 모델을 위반하지 않았는지 교차 검증하십시오.
- **Decision 참조**: 왜 이 contract가 생겼는지 문서만으로 복원되지 않는 경우에만 `Related decision: docs/decisions/<slug>.md`를 둔다.
- **Roadmap 참조**: 우선순위·release timing을 암시하는 경우에만 `Roadmap: docs/product/roadmap.md` 형태로 선택적으로 둔다.
