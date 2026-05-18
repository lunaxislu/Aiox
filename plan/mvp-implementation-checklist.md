# aiox MVP Implementation Checklist

> Purpose: Track implementation progress for the MVP TDD 10단계 without replacing
> the authority of `history/15-mvp-design-decisions.history.md` and
> `prd/mvp/aiox-mvp-spec.md`.
>
> Step 순서는 `history/15` "다음 구현 순서" + `prd/mvp/aiox-mvp-spec.md`
> "Testing Requirements"를 기준으로 한다.
>
> Step 2 cleanup + Step 3 transaction boundary context:
> `history/16-step-2-sqlite-repository-cleanup.history.md`.
>
> Last updated: 2026-05-17

---

## Step 1: Core type/model tests — ✅ 완료

- [x] Core agent lifecycle domain
  - Commit: `bee7c98 behavior: add agent attach lifecycle core`
  - Files: `src/core/agents.ts`, `tests/unit/core/agents.test.ts`
  - Covered:
    - `pending_attach | connected | disconnected | stale`
    - connected same-name attach rejects
    - disconnected/stale same-name attach reconnects with same identity
    - pending_attach same-name attach transitions same identity to connected

- [x] Core pair reservation domain
  - Commit: `e3732c0 behavior: add pair reservation core`
  - Files: `src/core/pairs.ts`, `tests/unit/core/pairs.test.ts`
  - Covered:
    - `pair --name` creates reservation only
    - no AgentInstance rows at reservation time
    - one Codex slot and one Claude slot
    - second same-kind pair attach rejects
    - one side attached remains pending
    - both sides attached becomes ready

- [x] Core directed route domain
  - Commit: `47b1569 behavior: add directed route core`
  - Files: `src/core/routes.ts`, `tests/unit/core/routes.test.ts`
  - Covered:
    - `connect <source> <target...>` creates source-to-target routes
    - routes are directed
    - disconnect removes only specified directed routes

- [x] Core message fan-out domain
  - Commit: `a742f75 behavior: add message fan-out core`
  - Files:
    - `src/core/messages.ts`
    - `src/core/deliveries.ts`
    - `tests/unit/core/messages.test.ts`
    - `tests/unit/core/deliveries.test.ts`
  - Covered:
    - MVP message types
    - MVP delivery statuses
    - one logical message creates one queued delivery per target route
    - delivery idempotency key shape

- [x] Core delivery lifecycle recovery
  - Commit: `2dea3fe behavior: add delivery lifecycle recovery`
  - Files: `src/core/deliveries.ts`, `tests/unit/core/deliveries.test.ts`
  - Covered:
    - queued delivery transitions to delivering
    - restart recovery maps `delivering -> queued`
    - other delivery states remain unchanged

- [x] Core ids/events domain
  - Commit: `this commit: behavior: add core ids and events`
  - Files: `src/core/ids.ts`, `src/core/events.ts`,
    `tests/unit/core/ids.test.ts`, `tests/unit/core/events.test.ts`
  - Covered:
    - deterministic id factory injection for tests
    - default prefixed ids for `agent`, `pair`, `route`, `message`,
      `delivery`, and `event`
    - append-only event shape with nullable `agent_id`, `message_id`,
      `delivery_id`, and `route_id`
    - core functions can return generated events without coupling to SQLite

---

## Step 2: SQLite schema/repository tests with `message_deliveries` — ✅ 완료

SQLite open/schema/repositories 완료.

- [x] Initial SQLite schema
  - Commit: `3dc72de behavior: add initial sqlite schema`
  - Files: `src/store/schema.ts`, `tests/unit/store/schema.test.ts`
  - Covered:
    - creates MVP durable state tables
    - creates `agents` table with MVP columns
    - enforces unique agent names

- [x] Expanded SQLite MVP schema
  - Commit: `da28cf6 behavior: expand sqlite mvp schema`
  - Files: `src/store/schema.ts`, `tests/unit/store/schema.test.ts`
  - Covered:
    - `pairs` table columns
    - `routes` table columns
    - `messages` table columns
    - `message_deliveries` table columns
    - `events` table columns
    - `agents.last_seen_at`, `messages.created_at`/`updated_at`, `events.created_at` 포함
    - unique pair names
    - unique directed source-target routes
    - unique delivery idempotency keys

- [x] Add `src/store/sqlite.ts`
  - Commit: `e9f8d0d behavior: add sqlite database open`
  - Files: `src/store/sqlite.ts`, `tests/unit/store/sqlite.test.ts`
  - First red test: opening a database applies schema and enables WAL.
  - Verify `pragma journal_mode` reports `wal` for a file-backed database.

- [x] Add `src/store/repositories/agents.ts`
  - Commit: `7794792 behavior: add sqlite agent repository`
  - Files: `src/store/repositories/agents.ts`,
    `tests/unit/store/repositories/agents.test.ts`
  - Persist `AgentInstance`.
  - Implement same-name connected reject.
  - Implement disconnected/stale reconnect with same durable identity.
  - Implement pending_attach attach transition to connected.

- [x] Add `src/store/repositories/pairs.ts`
  - Commit: `c24e036 behavior: add sqlite pair repository`
  - Files: `src/store/repositories/pairs.ts`,
    `tests/unit/store/repositories/pairs.test.ts`
  - Persist pair reservations.
  - Enforce one Codex and one Claude slot.
  - Preserve no-agent-created-at-reservation behavior.

- [x] Add `src/store/repositories/routes.ts`
  - Commit: `650415e behavior: add sqlite route repository`
  - Files: `src/store/repositories/routes.ts`,
    `tests/unit/store/repositories/routes.test.ts`
  - Persist directed routes.
  - Enforce source-target uniqueness.
  - Support directed disconnect.

- [x] Add `src/store/repositories/messages.ts` and `deliveries.ts`
  - Commit: `5323a8e behavior: add sqlite message delivery repositories`
  - Files: `src/store/repositories/messages.ts`,
    `src/store/repositories/deliveries.ts`,
    `tests/unit/store/repositories/messages-deliveries.test.ts`
  - Persist one logical message.
  - Persist N per-target deliveries.
  - Preserve idempotency key uniqueness.
  - Apply restart recovery policy for delivery states.

- [x] Add `src/store/repositories/events.ts`
  - Commit: `296d615 behavior: add sqlite event repository`
  - Files: `src/store/repositories/events.ts`,
    `tests/unit/store/repositories/events.test.ts`
  - Persist append-only events.
  - Support nullable `agent_id`, `message_id`, `delivery_id`, and `route_id`.
  - Preserve insertion order with `created_at`.

---

## Step 3: daemon API tests with fake in-process transport — 🔄 진행 중

- [x] Step 3 pre-work: `src/store/transaction.ts` helper
  - Commit: `this commit: behavior: add sqlite transaction helper`
  - Files: `src/store/transaction.ts`, `tests/unit/store/transaction.test.ts`
  - Covered:
    - callback 내부 여러 insert가 함께 persisted
    - callback throw 시 callback 내부 변경 전체 rollback
    - 외부 `withTransaction` 안에서 내부 transaction을 가진
      `pairs.attachAgent` 호출 후 외부 throw 시 attach 변경까지 rollback
  - `history/16-step-2-sqlite-repository-cleanup.history.md` 4-2 해결.

- [ ] `src/daemon/api.ts` — CLI ↔ daemon API contract
  - [x] TDD first red: fake in-process client can call `attachAgent` and receive a
    registered `connected` agent response.
    - Files: `src/daemon/api.ts`, `src/daemon/state.ts`,
      `tests/unit/daemon/api.test.ts`
    - Red: missing `src/daemon/api.ts` module.
    - Green: minimal daemon state wraps `agents.attach`; daemon API exposes
      `attachAgent`.
    - Review follow-up:
      - `pairName` was removed from first-increment `attachAgent`; pair attach
        will be added with a failing test for typed missing-pair behavior.
      - DTO response boundary is intentionally still pending; current return
        type reuses repository result and must be replaced before this API task
        is checked complete.
    - fake client JSON serialization boundary is intentionally pending and
      should be added with the DTO increment.
    - Verification: `pnpm test`, `pnpm typecheck`.
  - [x] TDD red/green: `attachAgent` with missing `pairName` returns typed error
    and does not register a partial agent.
    - Files: `src/daemon/state.ts`, `tests/unit/daemon/api.test.ts`
    - Red: request with `pairName` was silently accepted and created an agent
      with `pairId: null`.
    - Green: daemon state checks pair existence before agent attach and returns
      `{ ok: false, reason: "pair_not_found", pairName }`.
    - Verification: `pnpm test`, `pnpm typecheck`.
  - [x] TDD red/green: `attachAgent` with existing `pairName` stores the pair id
    on the attached agent.
    - Files: `src/daemon/state.ts`, `tests/unit/daemon/api.test.ts`
    - Red: existing pair was found but `agents.attach` still created an agent
      with `pairId: null`.
    - Green: daemon state passes the resolved pair id to `agents.attach`.
    - Transaction decision: no outer `withTransaction` yet. This increment does
      one durable write after a pair existence read; MVP has no pair delete
      command, and the existing missing-pair test covers the current partial
      write risk. Revisit when pair slot status/auto-route updates add
      cross-repository writes.
    - Verification: `pnpm test`, `pnpm typecheck`.
  - Define daemon request/response types without binding to HTTP/socket yet.
  - Replace repository return types with daemon API DTO response types.
  - Expose MVP control methods needed before CLI parsing:
    - `attachAgent({ kind, name, cwd })`
    - `attachAgent({ kind, name, cwd, pairName })`
    - [x] `createPair({ name })`
      - Files: `src/daemon/api.ts`, `src/daemon/state.ts`,
        `tests/unit/daemon/api.test.ts`
      - Red: `client.createPair` missing method.
      - Green: daemon state delegates to pair repository with injected
        `createId`/`now`.
      - Red: duplicate pair name leaked SQLite unique constraint.
      - Green: duplicate pair name returns
        `{ ok: false, reason: "pair_name_already_exists", name }`.
      - Verification: `pnpm test`, `pnpm typecheck`.
    - `connect({ sourceName, targetNames })`
    - `disconnect({ sourceName, targetNames })`
    - `status()`
    - `stop({ daemonOnly? })`
  - Keep route fan-out and pair auto-route assertions for Step 5/6 daemon-level
    tests; Step 3 only proves API shape, state persistence, and transport
    round-trip.
- [ ] `src/daemon/state.ts` — daemon state/usecase layer + SQLite sync
  - Build repositories from a single `Database` handle.
  - Own deterministic `createId`/`now` injection for daemon tests.
  - Wrap cross-repository writes in `withTransaction`.
  - Attach behavior:
    - register/reconnect agent by name through repository rules
    - [x] missing pair returns typed error without partial agent attach
    - [x] optional `pairName` attaches the agent to the existing pair
  - Pair behavior:
    - [x] create durable reservation
    - [x] duplicate pair name returns typed error
  - Connect/disconnect behavior:
    - resolve names to agent ids
    - return typed error for missing source/target
    - persist directed route changes through route repository
  - Status behavior:
    - report daemon metadata plus stored agents, pairs, and routes
- [ ] fake in-process transport로 control plane round-trip 검증
  - Add `tests/unit/daemon/api.test.ts`.
  - Create a fake transport/client pair that calls the daemon API in-process.
  - Verify request/response serialization boundary uses DTOs, not repository
    internals.
  - Cover error responses through the same fake client.
- [ ] `src/daemon/server.ts` — daemon entry point + lifecycle shell
  - Compose database, state, API, and transport.
  - Start is idempotent at API-lifecycle level for tests.
  - Stop marks connected agents disconnected and closes the transport shell.
  - No real socket/process management in Step 3.
- [ ] `src/daemon/supervisor.ts` — daemon-owned child process boundary stub
  - Define minimal interface for daemon-owned child process lifecycle.
  - Add tests for no-op supervisor behavior used by Step 3 server stop.
  - Keep real adapter child supervision for Post-MVP/future steps.

### Decision: `src/store/transaction.ts` helper 도입

**Step 2에서 도입하지 않은 이유**:
- Step 2의 트랜잭션 수요는 **single-repository 내부**에 국한됨
  (`pairs.attachAgent`, `deliveries.createQueuedForRoutes`, `routes.disconnect`).
- 각 repository가 자체적으로 `db.transaction(...)`을 호출하는 것으로 충분했고,
  helper를 미리 만들면 step3 요구사항을 보기 전에 인터페이스가 굳어버릴 위험이
  있어 보류함.

**Step 3에서 필요해질 수 있는 이유**:
- daemon API가 한 호출에서 **여러 repository를 동시에** 변경하는 시나리오가 등장:
  - `agent attach + pair attach + bidirectional route 자동 생성` 한 단위
  - `message create + N개 deliveries 생성 + event append` 한 단위
- 이 cross-repository 작업이 atomic해야 하면 repository 외부에서 트랜잭션을
  열어야 한다.

**결정**: Step 3 진입 전에 minimal helper를 도입한다.
- Reference: `history/16-step-2-sqlite-repository-cleanup.history.md` 4-2.
- 신규: `src/store/transaction.ts`의 `withTransaction(db, fn)`.
- 기존 repository 내부 `db.transaction(...)`은 유지한다.
- 이유: 현재 `better-sqlite3@12.10.0`은 nested `db.transaction()` 호출을
  `SAVEPOINT` / `RELEASE` / `ROLLBACK TO`로 처리하므로, 외부 transaction과
  repository 내부 transaction이 충돌하지 않는다.
- boundary ownership:
  - cross-repository atomicity: daemon/usecase layer의 `withTransaction`.
  - single-repository atomicity: repository 내부 transaction.

**TDD result for Step 3 pre-work**:
- [x] `tests/unit/store/transaction.test.ts`를 먼저 작성하고 Red 확인.
- [x] commit: callback 내부 여러 insert가 함께 persisted.
- [x] rollback: callback throw 시 callback 내부 변경 전체 rollback.
- [x] nested: 외부 `withTransaction` 안에서 내부 transaction을 가진
  `pairs.attachAgent` 호출 후 외부 throw 시 attach 변경까지 rollback.

**확장 기준**:
- write 경합에서 `SQLITE_BUSY`/lock wait가 보이면 mode(`immediate` 등), retry,
  timeout을 추가한다.
- 두 번째 이상 cross-repository write usecase에서 같은 패턴이 반복되면
  `createStore(db)` 또는 transaction-aware store context로 확장한다.
- result failure에서도 rollback해야 하는 규칙이 반복되면 result-aware transaction
  helper를 검토한다.

---

## Step 4: CLI command parsing tests — ⏳ To be planned

13개 명령 모두 parse + validation:

- [ ] `aiox daemon start | stop | stop --daemon-only | restart | status`
- [ ] `aiox codex --name <name> [--pair <pair-name>]`
- [ ] `aiox claude --name <name> [--pair <pair-name>]`
- [ ] `aiox connect <source> <target...>`
- [ ] `aiox disconnect <source> <target...>`
- [ ] `aiox pair --name <pair-name>`
- [ ] `aiox status | stop | doctor`

각 명령의 invalid input rejection test 포함.

---

## Step 5: route/connect fan-out tests (daemon level) — ⏳ To be planned

Step 1에서 core unit으로 cover된 fan-out logic을 **daemon API + store 결합 레벨**에서 재검증.

- [ ] daemon connect 호출 → store에 directed routes 생성
- [ ] daemon disconnect → 명시 route만 제거, history 보존
- [ ] message fan-out → message + N deliveries store 영속화
- [ ] idempotency (message_id, target_agent_id) 거부

---

## Step 6: pair reservation tests (daemon level) — ⏳ To be planned

Step 1에서 core unit으로 cover된 pair logic을 **daemon API + store 결합 레벨**에서 재검증.

- [ ] daemon pair create → reservation row, AgentInstance 미생성
- [ ] codex/claude attach with `--pair` → AgentInstance 생성 + pair slot occupy
- [ ] 두 expected side attach 완료 → bidirectional routes 자동 생성
- [ ] 같은 kind 두 번째 attach → reject

---

## Step 7: fake adapter integration tests — ⏳ To be planned

실제 Codex/Claude 의존 없이 adapter contract 검증.

- [ ] fake Codex adapter: outgoing capture + turn/start injection 시뮬레이션
- [ ] fake Claude adapter: outgoing capture + channel push 시뮬레이션
- [ ] end-to-end: source agent → fake adapter outgoing → router → fake target adapter inject → reply round-trip
- [ ] partial failure: 한 target inject 실패해도 다른 target 진행 (best-effort)

---

## Step 8: Codex app-server adapter skeleton — ⏳ To be planned

- [ ] `src/adapters/codex/app-server.ts` — adapter-managed Codex app-server
  endpoint process/connection metadata; daemon does not host app-server
  in-process
- [ ] `src/adapters/codex/websocket.ts` — WS client utilities
- [ ] `src/adapters/codex/injector.ts` — `turn/start` 호출
- [ ] `src/adapters/codex/launcher.ts` — codex CLI invoke

**Dependency**: Open Product Issue #2 (Codex thread UUID → agent name mapping) 정책 결정 필요.

---

## Step 9: Claude channel adapter skeleton — ⏳ To be planned

- [ ] `src/adapters/claude/channel-server.ts` — Node.js MCP channel server
  loaded by Claude dev channel over stdio, exposing HTTP ingress for daemon
  push; daemon does not host it in-process
- [ ] `src/adapters/claude/injector.ts` — `notifications/claude/channel` push
- [ ] `src/adapters/claude/launcher.ts` — claude CLI invoke (`--dangerously-load-development-channels server:...`)

**Dependency**: Open Product Issue #1 (Claude channel trust/confirmation policy) 정책 결정 필요.

---

## Step 10: doctor/status output — ⏳ To be planned

- [ ] `aiox doctor` — Node.js, pnpm, Codex CLI, Claude CLI, SQLite native binding, daemon socket/db path, 선택적 recipe tool (cmux/tmux) 점검
- [ ] `aiox status` — daemon + agents + pairs + routes + deliveries 요약 출력
- [ ] `aiox daemon status` — daemon pid/socket/port/db/uptime/version

출력 포맷은 Docker-like (STATUS, NAME, KIND 컬럼 정렬).

---

## Open Product Issues (구현 중 정책 결정 필요)

권위: `prd/mvp/aiox-mvp-spec.md` "Open Product Issues" 섹션.

1. Claude channel trust/confirmation policy → **Step 9 시작 전 결정 필요**
2. Codex thread UUID → agent name mapping → **Step 8 시작 전 결정 필요**
3. Stale agent transition policy → Step 2 repositories 또는 Step 3 daemon API 단계에 영향
4. Long-running delivery timeout policy → MVP에는 timeout 없음 default. Step 5/7 통합 테스트에서 노출될 수 있음
5. AI agent session expiry handling → Step 8/9 adapter 구현 시 노출될 수 있음

---

## Verification Baseline

Latest full verification:

- `pnpm test`: passing, 18 files, 65 tests (Step 3 transaction pre-work)
- `pnpm typecheck`: passing

각 step 완료 시 위 baseline을 갱신한다.

---

## Notes

- Keep this file as an execution checklist only.
- If product behavior changes, update `history/15` 또는 `prd/mvp/aiox-mvp-spec.md` first, then adjust this checklist.
- Do not use this file as the source of truth for MVP decisions.
- Step 3-10 sub-task는 해당 step 시작 시점에 더 구체화한다. 지금은 placeholder.
- vault `work/active/aiox.md` Implementation Status 섹션은 이 checklist의 high-level mirror일 뿐이고 todo 표기는 두지 않는다 (AGENTS.md "Checklist / Todo 위치 원칙").
