---
topic: architecture agent guidelines
description: Rules for agents reading, writing, and validating architecture documents.
---

# Architecture Agent Guidelines

이 디렉토리(`docs/architecture/`)의 문서는 시스템의 내부 구조, 책임 배치, 모듈/프로세스 경계, 데이터 플로우, 그리고 내부 상태 관리 원칙을 정의합니다. 에이전트나 Harness가 이 디렉토리의 문서를 다룰 때는 다음 규칙을 엄격히 따라야 합니다.

`docs/` 공통 작성 규칙(링크 형식·중복 금지·staleness)은 상위 [[docs/AGENTS]]가 소유합니다. 아래는 architecture type 전용 규칙입니다.

## 1. Architecture 작성 원칙 (Content Rules)
- **책임과 플로우 중심**: 내부 구조, 컴포넌트의 책임, 생명주기 불변성(Lifecycle invariant), 데이터 흐름을 명확히 설명합니다.
- **Spec Contract 복사 금지**: Do not copy protocol or external contract text from `docs/specs/` into architecture documents. Reference the spec owner instead, and keep architecture focused on internal structure, responsibility boundaries, flows, lifecycle invariants, and implementation evidence.
- **국소적 구현 상세(HOW) 위임**: 특정 함수의 세부 로직이나 매우 지엽적인 구현 방법은 코드와 테스트(`code/tests`)에 맡기고, 문서에는 포함하지 않습니다.

## 2. As-Built와 Target의 구분
아키텍처 문서 안에서는 현재 구현 상태와 미래의 목표 구조를 명확히 분리해야 합니다.
- **`Current` 또는 `As-built`**: 현재 시스템에 실제로 구현된 내부 구조
- **`Target` 또는 `Proposed`**: 스펙과 기획을 달성하기 위해 제안되거나 목표로 하는 구조
- **`Deferred`**: 보류된 아키텍처 결정

## 3. 구현 근거 명시 (Code/Test Evidence)
`As-built` 아키텍처를 설명할 때는 단순한 주장이 아니라 코드베이스의 실제 위치를 근거로 달아야 합니다.
- 핵심 컴포넌트나 플로우를 설명하거나 시그니처·로직을 다룰 때는 관련 파일 경로(`file:line`), 진입점 함수명, 또는 이를 검증하는 테스트 코드의 경로를 반드시 명시하십시오.

## 4. Drift(어긋남) 처리 원칙
문서의 내용과 실제 코드/테스트의 동작이 일치하지 않는 것(Drift)을 발견했을 때의 처리 규칙입니다.
- **Code and tests are the fact owner for current implementation behavior.**
- If an as-built architecture claim conflicts with code/tests, treat it as **drift**, identify whether the document or implementation is stale, and update the approved owner accordingly.
- Do **not** silently change product/spec/roadmap intent only because current code behaves differently.

## 5. Agent 및 Harness Validation 절차
- 아키텍처 문서를 갱신하기 전, 항상 연관된 소스 코드(`src/` 등)를 교차 검증(Cross-validation)하여 문서에 적힌 플로우가 실제 코드 구조와 맞는지 확인하십시오.
- 문서 내용이 사실인지(Fact), 코드에 기반한 추론인지(Inference), 설계적 의견인지(Opinion)를 로그에 명확히 구분하여 보고하십시오.
- **Decision 참조**: 왜 이 구조인지 문서만으로 복원되지 않는 경우에만 `Related decision: docs/decisions/<slug>.md`를 둔다.
- **Roadmap 참조**: Target/Proposed 구조가 특정 공개 전 완료 조건과 연결될 때만 선택적으로 `Roadmap: docs/product/roadmap.md` 참조를 둔다.
