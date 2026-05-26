# QA Tracker

MVP 구현 완료 후 user-led QA의 **살아있는 인덱스**.
권위는 `history/4X-qa-round-*.history.md`, 이 파일은 한눈에 보는 상태판이다.

- 발견 즉시 한 줄 추가 (status: open)
- Codex 픽스 commit 나오면 `Commit` 칸 채우고 status: fixed
- 재검증 통과하면 status: verified + history 파일에 Re-verify 한 줄

연관: [[aiox-step-progress]] · [[aiox-history-doc]] · `history/42-mvp-implementation-closeout.history.md`

---

## Status legend

- `open` — 재현됨, 미수정
- `triaging` — root cause 조사 중 (codex 위임 포함)
- `fixed` — 패치 commit 있음, 재검증 대기
- `verified` — 재검증 통과
- `wontfix` — Post-MVP로 이월 또는 의도된 동작으로 판정

## Active issues

| ID    | Scenario                    | Status | Found  | Commit  | History ref | Note |
| ----- | --------------------------- | ------ | ------ | ------- | ----------- | ---- |
| QA-001 | Claude TUI 종료 후 agent가 DB에 `connected`로 남고 pending token 누수 | verified | R1 | `fb7d8fc` | `43-qa-round-1` S-1 | `disconnectClaudeChannel`가 in-memory runtime registry만 정리, DB status·`claudePendingTokens` 미동기. fix: DB markDisconnected + pending token 정리. |
|       |                             |        |        |         |             |      |

> 추가 시: ID는 발견 순으로 `QA-NNN`. Found 칸은 QA round 번호 (`R1`, `R2`…).

## Rounds

| Round | Date       | Scope                     | History file                      | Outcome |
| ----- | ---------- | ------------------------- | --------------------------------- | ------- |
| R1    | 2026-05-26 | Claude channel disconnect 정합성 | `history/43-qa-round-1.history.md` | in progress (1 verified) |

---

## Workflow (매 새 세션 진입 시)

세션 시작 직후 Claude/Codex가 따라야 할 순서. 기존 `AGENTS.md` Step 진행 규칙의 QA 변형.

### 1. Resume — 컨텍스트 복원 (≤ 5분)
- [ ] `plan/qa-tracker.md` 읽기 → `open`/`triaging`/`fixed` 카운트
- [ ] 직전 round history 파일의 "Open items" 섹션 확인
- [ ] `git log --oneline -10` 으로 마지막 세션 이후 픽스 확인
- [ ] `pnpm test` + `pnpm typecheck` 깨끗한 baseline 확인 (실패 시 → QA 진입 전에 수습)

### 2. Plan — 이번 세션 scope 결정
- [ ] 새 round 시작이면 tracker `Rounds` 표에 한 줄 추가 + `history/4N-qa-round-N.history.md` 생성
- [ ] 이번 세션 목표를 한 문장으로 round history 상단에 적기 (예: "claude channel reconnect 시나리오 5개 시도")
- [ ] 기존 `fixed` 이슈 재검증을 우선 처리할지, 새 시나리오 탐사할지 선택

### 3. Execute — QA 실행
시나리오 단위로:
- [ ] round history에 `Scenario / Steps / Expected vs Actual` 기록
- [ ] 버그 발견 → tracker에 `QA-NNN` 한 줄 추가 (status: open)
- [ ] 재현 명령은 카피-페이스트 가능한 형태로 (`aiox …`, sqlite query, log path)
- [ ] 의심되는 코드 위치 (`src/...:line`) 함께 기록

### 4. Delegate — Codex 위임
- [ ] tracker status `triaging`으로 변경
- [ ] Codex 위임 시 전달: round history 파일 경로 + QA-ID + 재현 절차
- [ ] Codex가 픽스 commit 만들면 tracker `Commit` 칸 채우고 status `fixed`
- [ ] 픽스에 대한 결정/근거가 길면 round history에 "Fix notes" 섹션 추가

### 5. Re-verify
- [ ] 같은 시나리오 재실행
- [ ] tracker status `verified`
- [ ] round history 해당 항목 아래 "Re-verify (commit, date, result)" 한 줄

### 6. Close session
- [ ] round history에 "Open items" 섹션 갱신 (다음 세션에 들고 갈 것)
- [ ] tracker 상단 카운트 일치 확인
- [ ] commit: `qa: round N <scope> — N open / N fixed / N verified`
- [ ] (선택) Post-MVP로 이월할 항목이 생겼으면 `prd/post-mvp/`에 한 줄 + tracker status `wontfix`

---

## Convention notes

- **한 시나리오 = 한 QA-ID**. "같은 영역의 또 다른 버그"는 새 ID로 분리.
- **재현 안 되면 close 금지** — `wontfix`로 두고 reason 명시.
- **Codex가 픽스 후 자체 verify 했다고 해서 `verified` 처리 X** — user가 재실행하기 전엔 `fixed`.
- **Round 단위 commit** 대신 issue 단위 commit이 자연스러우면 그쪽 우선. tracker만 정합 유지.

## 다른 문서와의 관계

- `prd/mvp/aiox-mvp-spec.md` — spec 자체 결함이 발견되면 prd 갱신 + tracker `Note` 칸에 prd 변경 cite
- `history/42-mvp-implementation-closeout.history.md` — MVP closeout baseline (test 360개, 48 files). QA는 이 baseline 위에서 진행
- `docs/aiox/` — QA에서 학습/개념 정리가 나오면 docs로 분리, tracker에서 cite
