# Step 7 Phase B — Pair Daemon/Store Invariants

> 작성일: 2026-05-19
> 작성자: Codex
> 관련 기록:
> - `history/22-step-7-phase-a-decisions.history.md` (Phase A 결정 D1-D9)
> - `history/19-step-5-route-fanout-tests.history.md` Open Concern O1
> - `plan/mvp-implementation-checklist.md` Step 7

---

## 배경

Step 6 마감 후 Step 7 로 진입하면서 daemon `attachAgent` 가
`pairs.attachAgent` 를 호출하지 않고 `agents.attach({ pairId })` 로만 pair binding
을 처리하는 gap 이 확인됐다. 그 결과 daemon level 에서 pair slot reject,
`agent_kind_mismatch`, pair `ready` 전환, bidirectional auto-route 가 검증되지
않았다.

Phase A (`history/22`) 에서 결정한 대로 본 phase 는 pair daemon/store invariant
만 다룬다. `sendMessage` sentinel 회귀 정정, idempotency preflight transaction
경계(O1), send CLI surface(OA1)는 본 step 범위 밖으로 유지했다.

---

## 구현 결과

| commit | 내용 |
|---|---|
| `85af63e` | `behavior: add daemon pair store invariants` |
| `6250a3b` | `test: verify daemon pair attach rollback` |

요청된 red commit 은 만들지 않았다. `.ai/tdd.md` 와 repo 커밋 규율이 passing
상태 커밋을 요구하므로, red 는 로컬에서 확인하고 green 상태만 commit 했다.

주요 변경:

- `tests/unit/daemon/pair-store.test.ts` 를 추가해 Step 7 row-level invariant 를
  daemon API + SQLite store 결합 레벨에서 검증한다.
- `agents.attach` 의 `pairId` request 인자를 제거했다 (D1 X-strict). agent
  repository 는 agent lifecycle 만 담당하고, `pair_id` update 는
  `pairs.attachAgent` 가 전담한다.
- daemon `attachAgent` 를 single `withTransaction` 으로 재결선했다 (D2).
- pair attach reject 는 module-local `Symbol` rollback sentinel 을 throw 하고,
  transaction 밖 catch 에서 typed daemon response 로 복원한다. 일반 runtime error
  는 rethrow 한다.
- `pair_kind_slot_occupied` 와 `agent_kind_mismatch` 를 daemon
  `AttachAgentResult` / `AttachAgentResponse` union 에 passthrough 로 노출했다
  (D2 P passthrough, D5).
- pair 가 `ready` 로 전환되면 daemon state 에서 codex→claude, claude→codex
  directed route 를 silent idempotent 로 생성한다 (D3 B-direct, D4 R-1).
- `route_created` / `pair_ready` event 는 추가하지 않았다 (D4 event audit 없음).

---

## TDD 기록

Red 확인:

- `tests/unit/daemon/pair-store.test.ts` 신규 4가설 작성 후
  `pnpm test tests/unit/daemon/pair-store.test.ts` 실행.
- 실패 2건:
  - 두 expected side attach 후 pair status 가 `ready` 가 아니라 `pending`.
  - 같은 kind 두 번째 pair attach 가 `pair_kind_slot_occupied` 로 reject 되지 않고
    agent 생성 성공.

Green:

- `src/store/repositories/agents.ts` 에서 `AttachStoredAgentRequest.pairId` 제거.
- `src/daemon/state.ts` 에 single transaction + rollback sentinel +
  `pairs.attachAgent` 호출 + bidirectional auto-route 추가.
- `src/daemon/api.ts` 에 pair attach typed reject response union 확장.
- `pnpm test tests/unit/daemon/pair-store.test.ts`: 4 tests passing.
- `pnpm typecheck`: passing.
- `pnpm test`: 29 files, 151 tests passing.

Rollback 보강:

- `agent_kind_mismatch` reconnect 경로를 row-level 로 추가 검증.
- reject 시 agents / pairs / routes / events row 가 이전 상태와 동일함을 assert.
- `pnpm test tests/unit/daemon/pair-store.test.ts`: 5 tests passing.
- `pnpm typecheck`: passing.

---

## 결정 Trace

- **D1 X-strict**: `agents.attach` 는 pair id request 를 받지 않는다.
  reconnect 는 existing `pairId` 를 보존하고, new agent 는 `pairId: null` 로 시작.
- **D2 single transaction + sentinel**: daemon attach 에서 agent attach, pair
  attach, auto-route 를 하나의 `withTransaction` 으로 묶었다. rollback 은 callback
  return 이 아니라 sentinel throw 로 처리한다.
- **D2 P passthrough**: `pair_kind_slot_occupied`, `agent_kind_mismatch` 를 daemon
  API response 로 그대로 노출했다.
- **D3 B-direct**: pair repository 는 route repository 를 모른다. daemon state 가
  ready 전환을 보고 route orchestration 을 수행한다.
- **D4 bidirectional + R-1**: auto-route 는 양방향 2 directed route 이고,
  existing route 는 silent skip 한다. attach response 에 route 정보는 노출하지
  않는다.
- **D4 event audit 없음**: lifecycle event audit 은 D7 로 deferred 유지.
- **D5 typed error**: reconnect 가능한 기존 row 의 stored kind 와 caller intent
  kind 가 다르면 `agent_kind_mismatch` typed reject 를 반환하고 rollback 한다.
- **D6 partial row 방지**: same-kind reject / kind mismatch reject 모두 agents /
  pairs / routes / events row 상태 무변경을 검증했다.

---

## Verification

2026-05-19 Step 7 마감 검증:

- `pnpm test`: passing, 29 files, 152 tests
- `pnpm typecheck`: passing
- `pnpm build`: passing

---

## Deferred 유지

본 step 신규 Open Concern 없음.

다음 deferred 항목은 `history/22` D7-D9 그대로 유지:

- D7: `pair_ready` / route lifecycle event audit 정책.
- D8: pair detach / pair delete.
- D9: `sendMessage` sentinel 회귀 정정, idempotency preflight transaction 경계(O1),
  send CLI surface(OA1)는 real socket transport step 또는 후속 product 결정에서
  처리.
