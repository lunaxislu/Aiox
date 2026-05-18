# plan/

Execution checklist와 step 진행 상태. **실행 레이어**.

## 역할

- step별 sub-task와 체크박스를 commit과 1:1 매핑되게 추적한다.
- Authority Priority 2단계 — 권위는 `prd/`와 `history/`, plan은 그 위의 실행 레이어다.
- 권위 문서가 바뀌면 plan을 갱신한다 (역순 X).

## 언제 쓰나

- step 진행 중 sub-task 분해 / 체크박스 갱신.
- step 완료 직후 verification baseline 갱신 (test 개수, typecheck 상태 등).
- Open Question 기록 — 지금 결정 못 하는 항목을 명시 + 결정 시점 명시 후 진행.
- Plan change — 리뷰 결과로 step 범위/순서가 바뀌면 inline 갱신.

## 파일 이름

`<project>-implementation-checklist.md` (예: `mvp-implementation-checklist.md`)

## Step 진행 규칙 (요약)

- Step은 순차적으로 진행.
- 다음 Step 시작 전 현재 Step의 모든 체크박스 완료 확인.
- 미완료가 있으면 다음 Step을 "진행 중"으로 바꾸지 않는다.
- 각 Step 완료 기준: 체크박스 전부 완료 + `pnpm test` + `pnpm typecheck` 통과.
- Step 완료 직후 checklist 상태 + verification baseline 갱신을 같은 commit에 포함.

전체 규칙은 `AGENTS.md` Step 진행 규칙 섹션 참조.

## Open Question 패턴

결정 정보 부족 / 다른 agent 의견 필요 / 보류가 합리적인 경우:

```
1. 해당 step에 "Open Question" 섹션 추가
2. 결정 시점 명시 ("Step N 시작 시 결정")
3. 결정 옵션 + 각 trade-off 기록
4. 결정되면 history에 결정 + 근거 기록 + plan의 Open Question을 결과로 교체
```

사례: Step 3 Open Question — `src/store/transaction.ts` helper 도입 여부.

## .claude/plans/와의 차이

- `plan/` = 장기 execution checklist, 권위 있음 (2단계).
- `.claude/plans/` = Claude 단기 실행 scratch, 권위 X (5단계 — agent-specific scratch). 작업 끝나면 결과만 `history/`와 `plan/`으로 흡수.

## 관련 규칙

- Checklist 위치 원칙은 `AGENTS.md` Checklist / Todo 위치 원칙 섹션.
- Step 진행은 `AGENTS.md` Step 진행 규칙 섹션.
- 권위 우선순위는 `AGENTS.md` Authority Priority 섹션.
