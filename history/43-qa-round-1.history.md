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

Claude channel attach/disconnect lifecycle의 DB ↔ in-memory registry 정합성을
수동으로 한 바퀴 돈다. 첫 진입은 disconnect 경로(QA-001) 정합 확인.

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

### S-1 Claude channel `disconnectClaudeChannel`이 DB status·pending token을 갱신하지 않음

- **Setup**
  - 빈 daemon, fresh sqlite, agent 0개
  - 시나리오 a) `attachAgent({kind:"claude", name:"alpha", cwd:"/repo"})` → channel register 전에 `disconnectClaudeChannel({agentName:"alpha"})`
  - 시나리오 b) attach → register → disconnect
- **Expected**
  - 두 경로 모두 종료 후 `status()`에서 agent `status === "disconnected"`
  - `claudePendingTokens` 잔존 없음 (token leak 방지)
  - 반환 `{ ok: true, disconnected: true }`
- **Actual (수정 전)**
  - 경로 a) DB agent가 `connected` 그대로 남음, `disconnected: false` 반환
  - 경로 b) DB agent가 `connected` 그대로 남음 (runtime registry는 정리되지만 DB 미동기)
  - `claudePendingTokens`는 register 성공 시점에만 비워지므로, register 직전 disconnect 시 token leak
- **Verdict**
  - FAIL → `QA-001`
- **Suspect**
  - `src/daemon/state.ts:913` `disconnectClaudeChannel` — runtime Map만 삭제, DB·pending token 미처리

---

## Issues (this round)

이 round에서 신규로 생성된 QA-ID만 적는다. 자세한 표/상태는 `plan/qa-tracker.md` 권위.

### QA-001 Claude channel disconnect가 DB·pending token 미동기

- Tracker row: `plan/qa-tracker.md` QA-001
- 발견 시나리오: S-1
- 재현 (unit-level):
  - `tests/unit/adapters/claude-channel.test.ts` "marks attached Claude agent disconnected even when channel never registered" — 수정 전엔 `status()` agent가 여전히 `connected`로 반환됨
- Root cause:
  - `disconnectClaudeChannel`이 in-memory `claudeChannelRuntimes` Map과 동작 의미가 너무 좁았음. attach 단계에서 DB는 `connected`로 마킹되는데, disconnect는 runtime registry만 청소. registration 전 disconnect 경로에서는 runtime이 애초에 없어 `disconnected: false`로 잘못 반환.
  - `claudePendingTokens`도 registerClaudeChannel 성공 경로에서만 정리되므로 register 직전 disconnect 시 token이 영구 leak.
- Fix:
  - commit: `fb7d8fc` — `src/daemon/state.ts:913-929` `disconnectClaudeChannel` 확장
  - 변경:
    1. `claudePendingTokens.delete(agentName)` 추가 (token leak 차단)
    2. `agents.findByName` → `status === "connected"` 면 `agents.markByNameDisconnected(name, now())` 호출
    3. 반환 `disconnected = (runtime had) || (was connected)` — 둘 중 하나라도 상태 전이 발생하면 true
  - 멱등성: 이미 `disconnected` 상태인 agent는 `wasConnected=false`라 추가 markDisconnected 호출 없음
  - 일관성: 다른 disconnect 경로(`state.ts:689,810,856,1781`)와 동일한 `markByNameDisconnected(name, now())` 패턴
- Test:
  - 기존 "removes runtime from registry after disconnect" 강화 → `status()` agent가 `disconnected`인지도 어서트
  - 신규 "marks attached Claude agent disconnected even when channel never registered" — registration 전 disconnect 경로 cover
  - 기존 "disconnect when not registered returns disconnected: false" — agent 자체가 없으므로 false 유지 (regression 없음)
- Re-verify:
  - 2026-05-26 / `fb7d8fc` / `pnpm test` 361 passed, `pnpm typecheck` PASS

---

## Session log

세션 단위로 한 줄씩 append. 다음 세션 resume의 1차 자료.

- `2026-05-26` — Round goal 확정, S-1 시나리오 작성, QA-001 발견·fix·verified 동일 세션 처리 (claude channel disconnect 정합성). 다음 시나리오 미진행.

---

## Open items (carry to next session)

다음 세션이 들어왔을 때 가장 먼저 봐야 할 것. round 종료 시 정리.

- [ ] Claude channel attach/disconnect 외 시나리오 미시작 (재진입, 동시 다중 agent, status race 등)
- [ ] Codex 측 attach/detach 대칭성 동일 패턴 확인 필요 (`disconnectCodexChannel` 등 존재 여부 점검)

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
