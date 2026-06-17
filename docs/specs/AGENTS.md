---
topic: specification agent guidelines
description: Rules for agents reading, writing, and splitting specification documents.
---

# Specification Agent Guidelines

이 디렉토리(`docs/specs/`)의 문서는 시스템의 외부 동작, 인터페이스, 프로토콜, 데이터/상태 컨트랙트(Contract)를 정의합니다. 에이전트나 Harness가 이 디렉토리의 문서를 읽거나 수정할 때는 다음 규칙을 엄격히 따라야 합니다.

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

## 3. 문서 분할 및 앵커 보존 (Section ID Preservation)
거대한 통합 문서를 분리(Split)할 때 가장 주의해야 할 규칙입니다. 기존 `plans/`나 로그 등에서 스펙 문서의 특정 섹션을 가리키는 외부 참조(Inbound Reference)가 깨지지 않아야 합니다.
- 문서를 새 파일로 쪼갤 때, 원본 파일에서 기존 Section ID(예: `#4-message-routing`)와 제목을 완전히 삭제하지 마십시오.
- **Section Stub (호환 앵커) 방식**: 기존 참조를 보존하기 위해 섹션 제목은 그대로 유지하되, body를 "이 섹션은 분리되었습니다. 상세 스펙은 `[새 파일명.md](./새-파일명.md)`를 참고하세요"라는 리다이렉션 문구로 교체합니다.

## 4. Agent 및 Harness 확인 절차
- **작성 전**: Before adding or changing contract text, check `docs/product/product.md` and `docs/product/roadmap.md` to ensure the spec does not expand product scope or imply roadmap priority that those owners have not approved.
- **작성 후**: `docs/architecture/documentation-system.md`의 권한 모델을 위반하지 않았는지 교차 검증하십시오.
- **Decision 참조**: 왜 이 contract가 생겼는지 문서만으로 복원되지 않는 경우에만 `Related decision: docs/decisions/<slug>.md`를 둔다.
- **Roadmap 참조**: 우선순위·release timing을 암시하는 경우에만 `Roadmap: docs/product/roadmap.md` 형태로 선택적으로 둔다.
