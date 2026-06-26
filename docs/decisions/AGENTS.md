---
topic: decision agent guidelines
description: Rules for agents reading, writing, and promoting decision documents in docs/decisions/.
---

# Decision Agent Guidelines

이 디렉토리(`docs/decisions/`)의 문서는 여러 대안 중 선택한 결과와 아직 유효한 load-bearing rationale, trade-off와 재검토 조건을 소유한다.

`docs/` 공통 작성 규칙(링크 형식·중복 금지·evidence·sources·staleness)은 상위 [[docs/AGENTS]]가 소유한다. 아래는 decision type 전용 규칙이다.

## 1. 작성 원칙

- **WHY만 소유한다**: Decision 문서는 왜 이 선택을 했는가를 소유한다. 선택이 만든 제품 범위, contract, 구조, 추진 상태는 각각 product/specs/architecture/roadmap에 반영하고 decision 문서에 복사하지 않는다.
- **outcome은 참조한다**: 선택 결과가 반영된 owner 문서는 `Related:` 또는 본문 링크에서 참조한다. `Sources:`는 로그나 이전 문서처럼 provenance가 중요할 때만 쓴다.
- **load-bearing 부분만 기록한다**: 작업 경위 요약이 아니라, 지금도 유효한 이유와 다른 대안을 배제한 근거만 남긴다.
- **결정 당시의 WHY 스냅샷이다**: Decision 문서는 계속 갱신하는 living document가 아니다. 결정 결과가 바뀌면 product/spec/architecture/roadmap을 갱신한다. 기존 decision을 현재 상태로 패치하지 않는다. 새 rationale이 필요하면 새 decision을 만든다.

## 2. Lifecycle And Mutability

Decision 문서는 기본 document-level `Status:`를 쓰지 않는다.

`docs/decisions/`에 존재하는 decision 문서는 accepted load-bearing rationale snapshot이라는 전제를 가진다. `Accepted`를 status로 반복하지 않는다.

- 보류된 질문은 decision 문서보다 open question, product/roadmap deferred item, spec open/deferred section, 또는 작업 로그가 더 적합한 owner인지 먼저 판단한다.
- 기존 decision의 링크, provenance, 표현 명확화처럼 결정 당시 WHY를 바꾸지 않는 보수는 기존 문서에 적용한다.
- 기존 decision의 선택이나 rationale을 대체하는 새 결론이 필요하면 기존 문서를 현재 상태로 패치하지 않고 새 decision을 만든다.
- 기존 decision을 변경·삭제하기 전에는 §5의 decision-change harness로 보수 업데이트, 새 decision, 삭제 후보 중 어느 경우인지 먼저 분류한다.

## 3. Decision-worthy 기준

다음 중 하나 이상에 해당하면 `docs/decisions/`에 문서를 만든다.

포함해야 할 경우:

- rationale이 load-bearing이다.
- 실질적인 대안이 존재했고, 다른 결론이 날 수 있는 선택이었다.
- 코드·문서만으로 왜 이 방향인지 복원되지 않는다.
- 재논의 시 같은 결론에 도달하는 비용이 크거나, 반복 논의를 막아야 한다.
- 재검토 조건이 명확하다.

포함하지 않아야 할 경우:

- 이미 product/spec/architecture에 이유가 충분히 흡수된 경우.
- 단순 구현 사실이나 국소적 버그 수정.
- 작업 경위만 남아 있고 load-bearing rationale이 없는 경우.

## 4. Decision Skeleton

Use this as an authoring default, not required boilerplate. Omit empty sections.

기존 decision 문서는 이 skeleton에 맞추기 위해 결정 당시 WHY나 섹션 의미를 재배치하지 않는다.

```md
# <Decision Title>

Related:

- [[docs/specs/relevant-spec]]
- [[docs/architecture/relevant-slice]]

## Context

어떤 상황에서 이 결정이 필요했는가.

## Decision

무엇을 선택했는가. 한 문장으로 적는다.

## Alternatives

고려한 다른 선택지와 각각을 선택하지 않은 이유.

## Rationale

왜 이 선택인가. Load-bearing 부분만 기록한다.

## Trade-offs

이 선택으로 포기한 것.

## Re-evaluation

어떤 조건이 생기면 이 결정을 다시 검토하는가.

## Sources

- `logs/...`
```

## 5. Validation And Cross-Owner Checks

- 작성 전: 이 결정의 outcome이 이미 product/spec/architecture/roadmap에 반영됐는지 확인한다. 반영됐다면 그 내용을 decision 문서에 복사하지 않고 참조한다.
- 작성 중: outcome 자체와 현재 추진 상태를 decision 문서가 소유하지 않게 하고, 해당 owner 문서로 링크한다.
- 작성 후: 결정이 만든 outcome이 각 owner 문서에 반영됐는지 확인한다.

기존 decision을 변경·삭제하기 전에는 decision-change harness를 실행한다.

1. 확인 범위:
   - 대상 decision을 읽는다.
   - 대상 decision이 `Related:`, `Sources:`, 본문 링크로 연결한 owner 문서를 확인한다.
   - owner 경계나 현재 권위 판단이 흔들리면 [[docs/AGENTS]]와 [[docs/documentation-system]]도 확인한다.

2. 변경 유형 분류:
   - 보수 업데이트: 링크, provenance, 표현, 형식처럼 결정 당시 WHY를 바꾸지 않는 수정.
   - 새 decision: 기존 선택이나 rationale을 대체하는 새 결론.
   - 삭제 후보: decision이 더 이상 필요한 rationale을 소유하지 않는 것으로 보이는 경우.

3. 삭제 후보는 삭제 전에 모두 확인한다:
   - 이 decision의 WHY(trade-off, rejected alternative, 재검토 조건 포함)가 현재 owner 문서나 code로 복원돼, 어느 owner 문서를 이해하거나 안전하게 수정하는 데 더 이상 필요하지 않다.
   - live reference가 없다. live reference는 현재 owner 문서, active plan, README/AGENTS, 현재 작업 판단에 영향을 주는 open log, code/test 주석처럼 현재 권위·작업·구현 이해에 영향을 주는 참조다.
   - decided 로그와 historical provenance 참조만으로는 삭제를 막지 않는다.

4. 하나라도 불확실하면 삭제하지 않고 다음 중 하나로 처리한다:
   - decision 유지
   - 관련 owner 문서 보강
   - 새 decision 작성
   - 사용자 확인
