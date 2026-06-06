# history/

의사결정, incident, step 완료의 **권위 기록**.

## 역할

- 결정의 경위, critical 이슈, step 완료 결과를 기록한다.
- `prd/`와 함께 **최상위 권위 source**다 (Authority Priority 1단계).
- append-only에 가깝다 — 정정(보강)은 OK, 삭제는 X.
- 다른 문서(plan, docs/aiox, vault)는 history를 cite한다.

## 언제 쓰나

- 합의/결정이 끝났을 때 → 결정 + 근거를 박는다.
- step 완료 시 → 변경 내역, 보류 항목, verification baseline을 기록한다.
- Critical 이슈 발견 시 → 해당 step 문서에 "보류 항목" 추가. follow-up commit으로 해결 후 같은 항목 아래 "해결 기록" 추가.

## 파일 이름

`N-<topic>.history.md` (예: `16-step-2-sqlite-repository-cleanup.history.md`)

번호는 시간 순서. topic은 kebab-case.

## 보류 → 해결 패턴 (Critical Issue Workflow)

```
[발견 단계]
- 해당 step 문서에 "보류 항목" 섹션 추가
- 왜 critical인지, 재현/위험 시나리오, 해결 후보를 적는다.

[해결 단계]
- follow-up commit으로 fix
- 같은 보류 항목 아래에 "해결 기록" 추가
  (commit hash, 결정, 변경 파일, verification 결과)

[학습 단계] (사용자가 이해하기 어려워한 경우만)
- docs/aiox/<topic>.md 추가 (시각화 포함)
- history와 docs는 서로 cross-link
```

사례: `16-step-2-sqlite-repository-cleanup.history.md` 4-1 섹션 (보류 → 해결 → `docs/aiox/pair-attach-kind-mismatch.md`로 학습 기록 연결).

## 관련 규칙

- 권위 문서와 메모리의 우선순위는 `AGENTS.md` Authority Priority 섹션.
- Critical 이슈 처리 4단계는 `AGENTS.md` Critical Issue Workflow 섹션.
- Step 진행 규칙은 `AGENTS.md` Step 진행 규칙 섹션.

## 권위 진입점

- `13-aiox-rewrite-decision.history.md` — rewrite 기준 결정
- `15-mvp-design-decisions.history.md` — MVP 설계 권위 (+ `prd/mvp/aiox-mvp-spec.md`)
- `16-step-2-sqlite-repository-cleanup.history.md` — Step 2 cleanup + critical issue 처리 사례
- `42-mvp-implementation-closeout.history.md` — MVP 구현 종료
