---
name: document-structure-review
description: Use when Codex needs to write, review, restructure, or refine durable documents, documentation rules, authoring guides, templates, skeletons, or feedback records. Helps decide document scope, owner boundaries, section placement, concept hierarchy, duplication, evidence/provenance handling, and the shortest sufficiently general wording.
---

# Document Structure Review

문서를 새로 쓰거나, 기존 문서를 검토하거나, 작성 지침·템플릿·skeleton을 정리할 때 사용한다.
목표는 문장을 그럴듯하게 고치는 것이 아니라, 다음 작성자나 agent가 같은 판단을 복원할 수
있도록 scope, owner, 개념 위치, 근거, 예외, 검증을 선명하게 만드는 것이다.

## Review Loop

1. 문제가 된 문장, 섹션, 규칙, 예시를 먼저 식별한다.
2. 그 내용의 개념 역할을 판정한다: identity, scope, owner boundary, parent/child,
   sibling, evidence, provenance, workflow, style, validation.
3. 같은 책임을 이미 소유한 문서나 섹션이 있을 수 있으면 먼저 확인한다.
4. 확인한 내용이 있어도 곧바로 중복으로 보지 않는다. 현재 문서에 삭제, 경계 설명, 요약,
   위임, 재배치 중 무엇이 필요한지 판단한다.
5. 새 섹션이나 새 문서를 추가하기 전에 기존 문맥으로 흡수하거나 제목을 바꾸거나 내용을
   옮겨 해결할 수 있는지 본다.
6. 현재 문제를 해결하는 가장 짧고 일반화 가능한 문장을 제안한다.
7. 확정 규칙은 문서에 짧게 남기고, 시행착오·rejected alternative·상세 피드백은 작업 로그나
   feedback 기록에 남긴다.

## Concept Placement

문장을 다듬기 전에 개념의 위치가 맞는지 본다.

- 독립 섹션인가, 도입부나 상위 문맥에 흡수될 내용인가?
- A가 B의 하위 개념인가, 아니면 A와 B가 같은 레벨의 sibling인가?
- 현재 제목이 잘못된 상위 개념을 만들고 있지 않은가?
- 하위에 들어간 내용이 사실은 sibling이면, 상위 제목을 바꾸고 내용을 재배치한다.
- 같은 계열의 개념이라도 목적이 다르면 같은 레벨로 둔다. 예: 직접 근거와 provenance는
  모두 traceability 계열일 수 있지만 서로의 하위 개념은 아닐 수 있다.
- 도구 사용법처럼 보이는 내용도 문서의 정체성이나 편집 조건을 설명하는 흐름이면 도입부에
  흡수하는 편이 자연스러울 수 있다.

## Owner And Scope

- 문서가 무엇을 소유하는지 먼저 쓴다.
- 문서가 소유하지 않는 내용은 복사하지 말고 owner 문서로 링크하거나 위임한다.
- 이미 다른 문서가 소유하는 원칙을 발견해도, 현재 문서에 경계 문장으로 필요한지 판단한다.
- 현재 문서에 필요하다면 세부 절차를 반복하지 말고 "어디가 소유하는지"와 "이 문서에서는
  어떻게 소비하는지"만 남긴다.
- 특정 프로젝트, repo, 팀의 이름이나 path는 portable skill이나 일반 지침 본문에 박지 않는다.
  사례가 필요하면 추상 패턴으로 바꾼다.

## Wording Rules

- 문제의 핵심을 흐리는 부연을 제거한다.
- 더 긴 문장으로 포괄하려 하기보다, 더 정확하고 넓은 개념어를 고른다.
- 규칙과 예시가 이미 말하는 내용을 별도 해설 문장으로 반복하지 않는다.
- 예시는 규칙을 돕는 용도다. 예시가 규칙을 대신하거나 새 예외처럼 읽히면 줄이거나 빼라.
- 추상적 가능성만으로 예외, 필드, 안전 단계를 추가하지 않는다. 실제 사례와 재발 가능성을
  근거로 둔다.
- 너무 구체적인 사례는 일반 규칙을 흐리고, 너무 추상적인 문장은 실행 시 판단에 도움이
  되지 않는다. 현재 문제를 해결할 만큼만 일반화한다.

## Rule Shape

새 규칙을 추가하기 전에 어떤 형식이 필요한지 고른다.

- `scope rule`: 적용 범위가 흔들릴 때 사용한다.
- `identity rule`: 문서나 구조의 정체성이 흔들릴 때 사용한다.
- `decision table`: 결과가 여러 갈래로 나뉠 때 사용한다.
- `invariant` 또는 `negative rule`: 금지할 해석이 반복될 때 사용한다.
- `must rule`: 조건은 명확하지만 agent가 실행을 미루거나 빠뜨릴 때 사용한다.

이 형식들은 선택 도구다. 모든 문서 개선에 강제하지 않는다.

## Maintenance Principles

- 단순화가 우선이다. 편의나 불안 때문에 문서, 필드, 섹션, 예외를 계속 늘리지 않는다.
- 같은 규칙을 여러 문서에서 재정의하지 않는다.
- router나 요약 문서는 세부 절차를 반복하지 않고, 다음 작성자가 어디서 시작하고 무엇을
  확인해야 하는지만 복원 가능하게 쓴다.
- 새 문서가 read path를 늘리는지 먼저 본다. 기존 문서의 재배치, 축약, 삭제로 해결할 수
  있으면 새 문서를 만들지 않는다.
- 기존 문구가 유효한 사례를 제외하거나 제외해야 할 사례를 허용하게 읽히면 scope 표현을
  조정한다. 단순히 더 자연스럽다는 이유만으로 바꾸지 않는다.
- 조정 후에는 새 표현이 문제 사례를 포함하는지, 제외해야 할 사례까지 열지 않는지, owner
  경계와 충돌하지 않는지 다시 점검한다.

## Feedback Capture

사용자 지적이나 리뷰 피드백을 문서화할 때는 원문 덤프가 아니라 판단 가능한 사례로 정리한다.
단, 사용자가 원문형 보존을 명시하면 그 범위에서는 원문성을 우선한다.

- 사례: 문제가 된 문구, 구조, 예시, 규칙.
- 사용자 지적: 왜 문제가 되는지, 어떤 대안을 제안했는지.
- 확인한 사실: 읽은 문서, 기존 owner, 관련 규칙.
- 판단: 수용, 부분 수용, 비수용 이유.
- 반영 후보: 실제 문서에 넣을 짧은 문안.
- 남은 질문: 아직 결정되지 않은 것.

## Output Checklist

최종 제안이나 수정안을 내기 전에 확인한다.

- 이 내용의 owner와 scope가 드러나는가?
- parent/child와 sibling 관계가 뒤섞이지 않았는가?
- 이미 소유한 문서를 확인했는가?
- 중복 제거가 아니라 경계 설명이나 위임이 필요한 사례는 아닌가?
- 새 섹션이나 새 문서 없이 해결 가능한가?
- 현재 문제를 해결하는 가장 짧은 문장인가?
- 예시, 근거, provenance, workflow, style이 한 섹션에서 섞여 의미를 흐리지 않는가?
- 확정 규칙과 논의 과정이 알맞은 위치에 나뉘어 있는가?
