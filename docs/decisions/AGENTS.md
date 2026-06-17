---
topic: decision agent guidelines
description: Rules for agents reading, writing, and promoting decision documents in docs/decisions/.
---

# Decision Agent Guidelines

이 디렉토리(`docs/decisions/`)의 문서는 여러 대안 중 선택한 결과와 아직 유효한
load-bearing rationale, trade-off와 재검토 조건을 소유한다. 에이전트나 Harness가
이 디렉토리의 문서를 읽거나 작성할 때는 다음 규칙을 엄격히 따라야 한다.

## 1. 작성 원칙 (Content Rules)

- **WHY만 소유한다**: Decision 문서는 왜 이 선택을 했는가를 소유한다. 그 선택이
  만든 제품 범위, contract, 구조, 추진 상태는 각각의 owner 문서(product/specs/
  architecture/roadmap)에 반영하고 decision 문서에 복사하지 않는다.
- **outcome은 참조한다**: 선택 결과가 반영된 owner 문서를 `Sources` 또는 본문에서
  참조한다.
- **load-bearing 부분만 기록한다**: 역사적 맥락 서술이나 작업 경위 요약이 아니라,
  지금도 유효한 이유와 다른 대안을 배제한 근거만 남긴다.
- **결정 당시의 WHY 스냅샷이다**: Decision 문서는 결정 당시의 rationale을 기록하며
  계속 갱신하는 living document가 아니다. 결정 결과가 바뀌면 product/spec/
  architecture/roadmap을 갱신한다. 기존 decision을 현재 상태로 패치하지 않는다.
  새 rationale이 필요하면 새 decision을 만든다.

## 2. Decision-worthy 기준

다음 중 하나 이상에 해당하면 `docs/decisions/`에 문서를 만든다.

**포함해야 할 경우:**
- rationale이 load-bearing: 현재 또는 미래 선택에 여전히 영향을 준다
- 실질적인 대안이 존재했고, 다른 결론이 날 수 있는 선택이었다
- 코드·문서만으로 왜 이 방향인지 복원되지 않는다
- 재논의 시 같은 결론에 도달하는 비용이 크거나, 반복 논의를 막아야 한다
- 재검토 조건이 명확해 미래에 다시 열어야 할 시점을 알 수 있다

**포함하지 않아야 할 경우:**
- 이미 product/spec/architecture에 이유가 충분히 흡수된 경우
- 단순 구현 사실이나 국소적 버그 수정
- 작업 경위만 남아 있고 load-bearing rationale이 없는 경우

## 3. 문서 구조 (템플릿)

파일명: `docs/decisions/<slug>.md`

```markdown
# [결정 제목]

## Context
어떤 상황에서 이 결정이 필요했는가.

## Decision
무엇을 선택했는가. (한 문장)

## Alternatives
고려한 다른 선택지와 각각을 선택하지 않은 이유.

## Rationale
왜 이 선택인가. Load-bearing 부분만 기록한다.

## Trade-offs
이 선택으로 포기한 것.

## Re-evaluation
어떤 조건이 생기면 이 결정을 다시 검토하는가.

## Sources
근거 자료 경로 (history 파일, 로그, spec section 등).
```

## 4. History 원본 처리

`history/`에서 `docs/decisions/`로 승격할 때 순서:

1. Decision 문서의 `Sources`에 history 파일 경로를 기록한다.
2. 현재 작업 로그에 이동 사실을 기록한다.
3. Inbound reference 확인: history 파일을 가리키는 live 참조(plans/, docs/ 내
   active 문서)를 새 `docs/decisions/` 경로로 갱신한다.
4. 위 단계 완료 후 history 원본을 삭제한다. 장기 보존하지 않는다.

오래된 decision이 더 이상 live reference의 대상이 아니면 inbound 정리 후 삭제할 수
있다. 추적성은 새 decision의 `Sources`, 작업 로그, git history로 남긴다.

## 5. Agent 및 Harness 확인 절차

- **작성 전**: 이 결정의 outcome이 이미 product/spec/architecture/roadmap에
  반영됐는지 확인한다. 반영됐다면 그 내용을 decision 문서에 복사하지 않고 참조한다.
- **작성 후**: 결정이 만든 outcome이 각 owner 문서에 반영됐는지 확인한다.
- **history 승격 시**: Sources 기록 → inbound reference 갱신 → 원본 삭제 순서를
  지킨다.
