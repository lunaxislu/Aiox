# Step 2 SQLite Repository Cleanup

> 작성일: 2026-05-16
> 작성자: Claude (Opus 4.7)
> 관련 기록:
> - `history/15-mvp-design-decisions.history.md`
> - `plan/mvp-implementation-checklist.md` (Step 2 / Step 3)
> - `.claude/plans/iridescent-splashing-tarjan.md` (이번 cleanup의 실행 plan)

---

## 배경

Step 2 (SQLite repositories — agents, pairs, routes, messages, deliveries, events)
구현이 완료된 시점에서 사용자가 "한번 리뷰해줘"라고 요청. Step 3 (daemon API)
진입 전에 발견된 이슈를 정리하기 위해 코드 리뷰 → 의사결정 합의 → 묶음 cleanup
순서로 진행함.

본 문서는 **다음 세션의 codex가 한 화면에서 맥락을 잡을 수 있도록** 이번 리뷰에서
발견한 이슈, 사용자와 합의한 결정, 실제 수정 내역, 보류 항목을 한 곳에 기록한다.

---

## 1. 발견한 이슈 (8개)

### 🔴 Critical

#### #1. `pairs.attachAgent` — 동일 agent 재-attach 시 자기 자신에 의해 거절됨

```ts
// src/store/repositories/pairs.ts (수정 전)
const occupied = db
  .prepare("select id from agents where pair_id = ? and kind = ?")
  .all([input.pairId, input.kind])[0];

if (occupied) {
  return { ok: false, reason: "pair_kind_slot_occupied", existingAgentId: occupied.id };
}
```

같은 `(pairId, agentId, kind)`로 두 번 호출하면 두 번째 호출에서 본인이 `occupied`로
잡혀 `existingAgentId === input.agentId`인 reject가 발생. core 도메인이 disconnect
후 재-attach를 허용하는 점과 충돌.

또한 `agents` 테이블에 `input.agentId` row가 **존재하는지** 검증하지 않아 orphan
`pair_id` 생성 가능성 있음.

#### #2. 모든 repository — 트랜잭션 부재

`pairs.attachAgent`는 agents update + pairs update가 별개 statement. 중간 실패 시
inconsistent state. `deliveries.createQueuedForRoutes`도 N개 idempotency check 후
N개 insert를 atomic하지 않게 실행.

better-sqlite3는 동기 라이브러리라 `db.transaction(() => { ... })`로 감싸는 비용이
거의 없음.

#### #3. `deliveries.ts` — application-level idempotency check가 UNIQUE constraint를 대체하지 못함

스키마에 `idempotency_key text not null unique`가 있는데 코드에서 미리 select로 검사.
동시 진행되는 두 호출이 둘 다 select에서 "없음"을 보고 둘 다 insert하면 후자는
SQLite 예외를 throw — 현재 코드는 잡지 않음.

### 🟡 nit (취향)

#### #4. `.all(...)[0]` 대신 `.get(...)`

`agents.ts:151`, `pairs.ts:87`, `pairs.ts:121`, `routes.ts:137`, `deliveries.ts:141` —
single row 조회는 `.get()`이 정석. 의미가 명확하고 row 1개에서 멈춤.

#### #5. binding style 혼재

`agents.ts`는 named (`@id`), `pairs.ts` / `routes.ts`는 mix (named + positional).

#### #6. `routes.disconnect` — N개 select + delete N번

MVP 단계에선 단일 쿼리화는 over-engineering. 최소 변경으로 트랜잭션 래핑만.

#### #7. 테스트 boilerplate 반복

각 `it()`마다 `db = new Database(":memory:"); applySchema(db); const xxx = createXxxRepository(db);`
4-5번 반복.

#### #8. `pairs.test.ts`에 동일 agent re-attach 테스트 부재

이슈 #1을 그래서 못 잡았음.

---

## 2. 사용자와의 의사결정 합의

### Q1. 수정 범위

- **선택**: 🔴 + 🟡 nit 5개 전부 (이슈 #1~#8 모두)
- 단일 cleanup 묶음으로 정리.

### Q2. 트랜잭션 적용 범위

사용자가 "이거에 대해 이해를 잘 못해서 설명해달라"고 요청 → Claude가 다음을 설명:

- better-sqlite3는 **동기** 라이브러리. statement 호출이 즉시 디스크에 반영됨.
- **Atomicity**: 한 논리적 작업이 여러 statement로 쪼개졌을 때 중간 실패 시 반쯤
  반영된 상태가 남음.
- **Race**: 여러 process가 같은 DB 파일을 열면 select-then-insert 사이에 다른
  process가 끼어들 수 있음.
- `db.transaction(() => { ... })`는 BEGIN/COMMIT을 자동으로 감싸고 throw 시 rollback.

세 옵션 제시:
- **A. 다중-statement만**: `pairs.attachAgent`, `deliveries.createQueuedForRoutes`
  만 래핑. 단일 statement는 SQLite가 이미 atomic이라 redundant.
- **B. 모든 mutating 메서드**: 8개 메서드 전부 래핑. 일관성 ↑ but redundant.
- **C. helper 추출**: `src/store/transaction.ts` 헬퍼. 지금 도입하면 step3 요구사항
  보기 전에 형태가 굳어버림.

- **선택**: **A** — 다중-statement 두 메서드만. step3 시작 시 cross-repository
  트랜잭션 필요해지면 그때 helper 도입 여부를 codex와 다시 상의.

### Q3. UNIQUE 위반 race 처리 방식

- **선택**: **트랜잭션 + insert-first, application-check 제거**.
  - 트랜잭션 안에서 곧장 insert 시도
  - UNIQUE 위반 SqliteError(`SQLITE_CONSTRAINT_UNIQUE`)를 catch
  - 충돌 row를 select로 다시 조회하여 `delivery_idempotency_key_exists` 결과 반환
  - DB가 single source of truth

### Q4. 이슈 #1의 orphan `pair_id` 검증 추가 여부

- **선택**: **보류 — gemini와 상의 후 결정**.
- 결정 시 `pairs.attachAgent`에 `agent_not_found` 결과 분기 + 회귀 테스트 추가.

---

## 3. 실제 수정 내역

작업은 plan(`.claude/plans/iridescent-splashing-tarjan.md`)의 Step A–H 순서로 진행.
TDD red-green 사이클 유지.

### Step A. 회귀 테스트 추가 (이슈 #8)
- `tests/unit/store/repositories/pairs.test.ts`에 same-agent re-attach 케이스 추가
- 추가 직후 fail 확인 → red 상태 검증

### Step B. pair self-reject 수정 (이슈 #1)
- `src/store/repositories/pairs.ts`의 `occupied` 쿼리에 `and id <> @agentId` 추가
- 명명 파라미터(named binding)로 통일 (이슈 #5도 함께 처리)
- Step A 테스트 green 확인

### Step C. deliveries 트랜잭션 + UNIQUE race 처리 (이슈 #2, #3)
- `src/store/repositories/deliveries.ts`의 application-level idempotency check 루프 제거
- N개 insert를 `db.transaction((deliveries) => { ... })`로 래핑
- `isUniqueConstraintError` helper 추가 — SqliteError의 `code === "SQLITE_CONSTRAINT_UNIQUE"` 판별
- UNIQUE 위반 catch 시 `findByIdempotencyKey`로 충돌 row 조회 후 결과 반환

### Step D. pairs.attachAgent 트랜잭션 래핑 (이슈 #2)
- `attachAgentTxn = db.transaction((input) => { ... })` 클로저로 분리
- occupied check + agents update + readAttachedKinds + pairs update + select를 한 트랜잭션 안에 묶음

### Step E. `.all(...)[0]` → `.get(...)` 교체 (이슈 #4)
- 5개 repository의 single-row 조회를 `.get()`으로 일괄 교체
- 부수효과: `spikes/sqlite-restart-recovery-poc/better-sqlite3.d.ts`의 ambient Statement
  타입에 `.get()` 시그니처 추가 (이 declaration이 main project tsconfig include로 들어옴)

### Step F. binding style 통일 (이슈 #5)
- `pairs.ts`, `routes.ts`의 positional binding을 named binding으로 통일
- single-column query는 그대로 둠 (named로 바꿔도 가독성 이득 없음)

### Step G. routes.disconnect 트랜잭션 래핑 (이슈 #2, #6)
- `disconnectTxn = db.transaction((input) => { ... })` 클로저로 분리
- single-query 최적화는 보류 (MVP 단계에선 over-engineering)
- `findBySourceAndTarget`을 closure helper로 분리해 `this.` 호출 제거

### Step H. 테스트 boilerplate 정리 (이슈 #7)
- 5개 테스트 파일에 `beforeEach`로 db/repository 세팅 추출
- `agents.test.ts`의 reconnect 테스트는 `it.each(["disconnected", "stale"])`로 분리
  (loop 내부 db 갈아끼우기 패턴 제거)

### Verification baseline 갱신
- `plan/mvp-implementation-checklist.md`의 "Verification Baseline" 섹션을 58 → 60 tests로 갱신
- `pnpm test`: 17 files, 60 tests passing
- `pnpm typecheck`: passing

---

## 4. 보류 항목 (다음 세션에서 결정 필요)

### 4-1. `pairs.attachAgent`의 agent 존재 + kind consistency 검증

이슈 #1의 두 번째 항목에서 확장됨. 현재 `attachAgent`는 `input.agentId`가
`agents` 테이블에 존재하는지 검증하지 않음. step3 daemon이 항상 agent attach 후
호출하는 contract라면 OK지만, repository 단에서 명시하는 게 안전.

Codex review에서 추가로 확인한 같은 계열의 문제:

- `attachAgent`가 `input.kind`를 caller-provided 값으로 신뢰한다.
- persisted `agents.kind`와 `input.kind`가 다르면 pair slot invariant가 깨질 수 있다.
- 예: 이미 Codex side가 찬 pair에 다른 Codex agent를 `kind: "claude"`로 넘기면
  Claude slot이 비어 있다고 판단해 attach가 성공할 수 있다.
- 따라서 이 보류 항목은 단순 `agent_not_found`뿐 아니라
  `agent_kind_mismatch` 또는 "DB의 agent kind를 source of truth로 사용" 결정을 포함한다.

**해결 위치**: Step 2 cleanup follow-up으로 닫는 것이 맞다.

이유:

- pair capacity는 Step 2 repository invariant다.
- Step 3 daemon API가 이 repository 위에 올라가기 전에 boundary contract를 고정해야 한다.
- daemon layer에서만 막으면 repository test가 우회 가능한 상태로 남는다.

**수정 후보**:

- `attachAgent`가 먼저 `agents` row를 조회한다.
- agent가 없으면 `agent_not_found` 반환.
- agent가 있으면 DB의 `agents.kind`를 slot 판단의 source of truth로 사용한다.
- API 입력에서 `kind`를 제거하거나, 유지한다면 DB kind와 다를 때
  `agent_kind_mismatch`를 반환한다.
- 회귀 테스트:
  - missing agent attach rejects.
  - persisted Codex agent cannot occupy Claude slot by passing mismatched kind.
  - same-agent same-pair re-attach remains idempotent.

### 4-2. `src/store/transaction.ts` helper 도입

`plan/mvp-implementation-checklist.md`의 Step 3 "Open Question" 섹션에 상세 기록.

**Step 2에서 안 한 이유**: Step 2의 트랜잭션 수요는 single-repository 내부에 국한.
helper를 미리 만들면 step3 요구사항 보기 전에 인터페이스가 굳어버릴 위험.

**Step 3에서 필요해질 수 있는 이유**: daemon API가 한 호출에서 여러 repository를
동시에 변경하는 시나리오(`agent attach + pair attach + bidirectional route 자동 생성`
등). 이 cross-repository 작업이 atomic해야 하면 외부에서 트랜잭션을 열어야 하는데,
SQLite는 nested 트랜잭션 미지원이라 현재 구조와 충돌.

**결정 절차**: Step 3 첫 sub-task가 cross-repository write를 요구하는지 확인 후
codex와 상의.

**해결 위치**: Step 3 시작 시 결정한다.

이유:

- Step 2에서는 single-repository 내부 transaction으로 충분했다.
- Step 3 daemon API가 `agent attach + pair attach + bidirectional routes` 또는
  `message create + deliveries + events` 같은 cross-repository write를 요구하면
  외부 transaction boundary가 필요해질 수 있다.
- SQLite nested transaction 미지원 때문에, 이 경우 기존 repository 내부
  `db.transaction(...)` 구조를 조정해야 할 수 있다.

---

## 5. 변경된 파일 목록

소스:
- `src/store/repositories/agents.ts`
- `src/store/repositories/pairs.ts`
- `src/store/repositories/routes.ts`
- `src/store/repositories/deliveries.ts`

테스트:
- `tests/unit/store/repositories/agents.test.ts`
- `tests/unit/store/repositories/pairs.test.ts`
- `tests/unit/store/repositories/routes.test.ts`
- `tests/unit/store/repositories/messages-deliveries.test.ts`
- `tests/unit/store/repositories/events.test.ts`

타입:
- `spikes/sqlite-restart-recovery-poc/better-sqlite3.d.ts`

문서:
- `plan/mvp-implementation-checklist.md`
