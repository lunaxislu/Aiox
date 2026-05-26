# QA Round 1

## Status

- Date: 2026-05-26 ~
- Round: R1 (post-MVP-closeout user-led QA의 첫 라운드)
- Scope: TBD — round 시작 시 본 문서 상단에 한 문장으로 박을 것.
- Authority context:
  - `history/42-mvp-implementation-closeout.history.md` (baseline: 48 files / 360 tests)
  - `plan/qa-tracker.md` (live issue/round 인덱스)
  - `prd/mvp/aiox-mvp-spec.md`

## Round Goal

> _(예: "claude channel attach/disconnect 시나리오 + codex multi-thread 재진입을 수동으로 한 바퀴 돈다.")_
>
> 이 round에서 다룰 시나리오 범위를 한두 문장으로 적기. 너무 넓으면 R2로 쪼개기.

## Baseline 확인

- [ ] `git log --oneline -5` — 직전 commit이 42 closeout 또는 그 이후 fix인지
- [ ] `pnpm test` 360개 통과
- [ ] `pnpm typecheck` 통과
- [ ] `plan/qa-tracker.md` open/triaging/fixed 카운트 확인

> Baseline이 깨져 있으면 QA 진입 전에 수습. 결과는 아래 "Session log"에 기록.

---

## Scenarios

각 시나리오는 `### S-N <한 줄 제목>` 으로 추가한다.
시나리오 결과로 버그가 잡히면 `plan/qa-tracker.md`에 `QA-NNN` 한 줄 추가 + 아래 "Issues" 섹션에서 cross-link.

### S-1 (template) `<시나리오 제목>`

- **Setup**
  - 사전 상태 (예: 빈 daemon, agent 0개, db 새로 init)
  - 명령:
    ```sh
    aiox attach claude --name alpha --cwd /repo
    # ...
    ```
- **Expected**
  - 어떤 결과/이벤트/DB 상태가 나와야 하는지
- **Actual**
  - 실제 관찰. 로그/sqlite 스냅샷/CLI 출력 붙여넣기
- **Verdict**
  - PASS / FAIL → FAIL이면 issue ID 부여 (`QA-NNN`)
- **Suspect**
  - 의심 코드 위치 (`src/...:line`) — 비어 있어도 됨, codex가 채울 수 있음

> 시나리오 복사 후 위 5칸 채워 가면 됨.

---

## Issues (this round)

이 round에서 신규로 생성된 QA-ID만 적는다. 자세한 표/상태는 `plan/qa-tracker.md` 권위.

### QA-NNN `<제목>` (template)

- Tracker row: `plan/qa-tracker.md` QA-NNN
- 발견 시나리오: S-N
- 재현 절차 요약:
  ```sh
  # 최소 재현 명령
  ```
- Root cause (codex 분석):
  - _hypothesis & 확인 결과_
- Fix:
  - commit: `<hash>`
  - 변경 파일: `<paths>`
  - 결정/근거 한 단락
- Re-verify:
  - date / commit / result

---

## Session log

세션 단위로 한 줄씩 append. 다음 세션 resume의 1차 자료.

- `YYYY-MM-DD HH:MM` — _세션 요약 1줄_ (예: "S-1 PASS, S-2에서 QA-002 발견 → codex 위임, S-3 시도 중 종료")

---

## Open items (carry to next session)

다음 세션이 들어왔을 때 가장 먼저 봐야 할 것. round 종료 시 정리.

- [ ] _e.g. QA-002 재검증 대기 (commit X 적용 후)_
- [ ] _e.g. S-4 시나리오 미시작_

## Round close

Round 종료 commit 메시지 템플릿:

```
qa: round 1 <scope> — N open / N fixed / N verified

- S-N ... summary
- QA-NNN ... outcome
```

종료 후:
- [ ] `plan/qa-tracker.md` Rounds 표 R1 행에 Outcome 갱신
- [ ] 다음 round 필요하면 `history/44-qa-round-2.history.md` 생성 + tracker R2 행 추가
- [ ] MVP spec/PRD에 영향이 있으면 `prd/`에 반영하고 여기서 cite
