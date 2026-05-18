# docs/aiox/

사용자가 이해해야 하는 개념, agent 설명, 시각화, **learning record**.

## 역할

- 사용자가 잘 모르는 topic에 대한 agent의 답변/설명을 기록한다.
- **구현 결정 자체의 권위 문서가 아니다** — 권위는 `history/`와 `prd/`에 있다.
- Authority Priority 3단계 — `prd/history > plan` 다음, `memory/session > agent-specific scratch` 보다 위.
- `docs/`의 일반 규칙("구현에 직접 필요한 것만")의 **예외**다 — learning record는 구현에 직접 필요하지 않더라도 사용자 본인을 위해 둔다.

## 언제 쓰나

- 사용자가 critical 이슈/결정/개념을 이해하지 못해서 agent가 설명한 내용을 다시 찾고 싶을 때.
- Critical Issue Workflow의 4단계 "Learning record"로 등록될 때.
- 같은 질문을 다음 세션에서 또 하지 않기 위해.

## 파일 이름

`<topic>.md` — kebab-case로 topic을 명확히. 사용자가 파일명만 보고 무엇에 대한 기록인지 알 수 있게.

사례: `pair-attach-kind-mismatch.md` (caller-trusted kind가 invariant를 깨는 버그에 대한 학습 기록).

## 권장 구조

```
1. 배경 — 이 topic이 왜 나왔는가
2. 이해 못 했던 부분 — 사용자가 어디서 막혔는가
3. agent의 설명 — 핵심 개념을 간단히
4. 시각화 — 다이어그램/시나리오/before-after (필수)
5. 해결 단계 — 어느 step에서 어떻게 닫았는가
6. commit 내역 — hash + 변경 파일 + verification
7. 어떻게 해결했는가 — 구체 코드/로직
8. 배운 점 요약 — 다음에 비슷한 상황에서 적용할 원칙
```

시각화는 필수. 텍스트만 있으면 다시 봐도 한 번 더 머릿속에서 풀어야 함.

## history/와의 차이

| docs/aiox/ | history/ |
|---|---|
| 사용자 본인을 위한 학습 기록 | 의사결정/incident의 권위 기록 |
| 시각화 + 설명이 핵심 | 결정 + 근거 + commit이 핵심 |
| 권위 X (learning record) | 권위 O (최상위) |
| 같은 topic을 사용자가 다시 학습할 때 entry point | agent/사람이 결정 cite할 때 entry point |

서로 cross-link한다: history → docs/aiox URL, docs/aiox → history URL.

## 관련 규칙

- 학습 기록 작성 트리거는 `AGENTS.md` Critical Issue Workflow 섹션 4단계.
- 권위 우선순위는 `AGENTS.md` Authority Priority 섹션.
- 예외 규칙은 `AGENTS.md` Docs Rules 섹션.

## 현재 진입점

- `pair-attach-kind-mismatch.md` — Step 2 cleanup 중 발견한 caller-trusted kind 버그 (관련 권위: `history/16-step-2-sqlite-repository-cleanup.history.md` 4-1).
