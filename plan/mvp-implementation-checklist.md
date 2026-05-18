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

## Step 3: daemon API tests with fake in-process transport — ✅ 완료

- [x] Step 3 pre-work: `src/store/transaction.ts` helper
  - Commit: `this commit: behavior: add sqlite transaction helper`
  - Files: `src/store/transaction.ts`, `tests/unit/store/transaction.test.ts`
  - Covered:
    - callback 내부 여러 insert가 함께 persisted
    - callback throw 시 callback 내부 변경 전체 rollback
    - 외부 `withTransaction` 안에서 내부 transaction을 가진
      `pairs.attachAgent` 호출 후 외부 throw 시 attach 변경까지 rollback
  - `history/16-step-2-sqlite-repository-cleanup.history.md` 4-2 해결.

- [x] `src/daemon/api.ts` — CLI ↔ daemon API contract
  - [x] TDD first red: fake in-process client can call `attachAgent` and receive a
    registered `connected` agent response.
    - Files: `src/daemon/api.ts`, `src/daemon/state.ts`,
      `tests/unit/daemon/api.test.ts`
    - Red: missing `src/daemon/api.ts` module.
    - Green: minimal daemon state wraps `agents.attach`; daemon API exposes
      `attachAgent`.
    - Review follow-up: resolved by later Step 3 increments for missing
      `pairName`, pair attach, DTO response mapping, and fake client JSON
      serialization.
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
  - [x] TDD red/green: daemon API maps repository results to explicit DTO
    responses and fake in-process transport applies JSON request/response
    round-trip.
    - Files: `src/daemon/api.ts`, `tests/unit/daemon/api.test.ts`
    - Red: `attachAgent` and `createPair` responses leaked repository
      timestamp/session fields.
    - Green: introduced `AgentDto`, `PairDto`, `AttachAgentResponse`, and
      `CreatePairResponse`; API maps state results to DTOs.
    - DTO field decision: attach responses expose `id`, `name`, `kind`,
      `status`, `cwd`, and `pairId`; pair responses expose `id`, `name`, and
      `status`. Repository timestamps, adapter session metadata, and last-seen
      timestamps stay internal until a status/inspect API needs them.
    - Serialization: fake client now JSON round-trips request and response.
    - Verification: `pnpm test`, `pnpm typecheck`.
  - [x] Define daemon request/response types without binding to HTTP/socket yet.
  - [x] Replace repository return types with daemon API DTO response types.
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
    - [x] `connect({ sourceName, targetNames })`
      - Files: `src/daemon/api.ts`, `src/daemon/state.ts`,
        `tests/unit/daemon/api.test.ts`
      - Red: `client.connect` missing method.
      - Green: daemon state resolves source/targets by name, wraps multi-target
        route creation in `withTransaction`, separates `created` from
        `alreadyExisted`, and returns typed source/target missing errors.
      - Atomicity: missing target names are checked before route writes, so no
        partial route is created when any target is absent.
      - Verification: `pnpm test`, `pnpm typecheck`.
    - [x] `disconnect({ sourceName, targetNames })`
      - Files: `src/daemon/api.ts`, `src/daemon/state.ts`,
        `tests/unit/daemon/api.test.ts`
      - Red: `client.disconnect` missing method.
      - Green: daemon state resolves source/targets by name and delegates route
        removal to the route repository.
      - Policy: missing agent names are typed errors; an absent route between
        existing agents is not an error and is omitted from `removed`.
      - Verification: `pnpm test`, `pnpm typecheck`.
    - [x] `status()`
      - Files: `src/daemon/api.ts`, `src/daemon/state.ts`,
        `src/store/repositories/agents.ts`,
        `src/store/repositories/pairs.ts`,
        `tests/unit/daemon/api.test.ts`
      - Red: `client.status` missing method.
      - Green: daemon state returns deterministic daemon metadata plus
        repository-listed agents, pairs, and routes; API maps them to DTOs.
      - Repository change: added `agents.list()` and `pairs.list()` so daemon
        state reads through repositories instead of direct SQL. `routes.list()`
        already existed.
      - Serialization: fake client now JSON round-trips no-arg calls via an
        argument list, so `status()` participates in the same boundary check.
      - Verification: `pnpm test`, `pnpm typecheck`.
    - [x] `stop({ daemonOnly? })`
      - Files: `src/daemon/api.ts`, `src/daemon/state.ts`,
        `src/store/repositories/agents.ts`, `tests/unit/daemon/api.test.ts`
      - Red: `client.stop` missing method.
      - Green: daemon state wraps stop in `withTransaction`; default stop marks
        all connected agents `disconnected` and returns `stoppedAgents`; daemon
        shell-only stop leaves agent status unchanged and returns
        `stoppedAgents: []`.
      - Repository change: added `agents.markAllConnectedDisconnected(now)` for
        the bulk state transition.
      - Serialization: stop requests/responses pass through the fake JSON
        round-trip with DTO-only agent payloads.
      - Verification: `pnpm test`, `pnpm typecheck`.
  - Keep route fan-out and pair auto-route assertions for Step 5/6 daemon-level
    tests; Step 3 only proves API shape, state persistence, and transport
    round-trip.
- [x] `src/daemon/state.ts` — daemon state/usecase layer + SQLite sync
  - Build repositories from a single `Database` handle.
  - Own deterministic `createId`/`now` injection for daemon tests.
  - Wrap cross-repository writes in `withTransaction`.
  - Attach behavior:
    - [x] register/reconnect agent by name through repository rules
      - Covered by `tests/unit/daemon/server.test.ts` restart scenario:
        start → attach agent `"impl"` → stop → start → attach same name keeps
        the same agent id and restores `connected` status via repository rules.
    - [x] missing pair returns typed error without partial agent attach
    - [x] optional `pairName` attaches the agent to the existing pair
  - Pair behavior:
    - [x] create durable reservation
    - [x] duplicate pair name returns typed error
  - Connect/disconnect behavior:
    - [x] resolve names to agent ids
    - [x] return typed error for missing source/target
    - [x] persist directed route changes through route repository
  - Status behavior:
    - [x] report daemon metadata plus stored agents, pairs, and routes
- [x] fake in-process transport로 control plane round-trip 검증
  - [x] Add `tests/unit/daemon/api.test.ts`.
  - [x] Create a fake transport/client pair that calls the daemon API in-process.
  - [x] Verify request/response serialization boundary uses DTOs, not repository
    internals.
  - [x] Cover error responses through the same fake client.
- [x] `src/daemon/server.ts` — daemon entry point + lifecycle shell
  - Files: `src/daemon/server.ts`, `tests/unit/daemon/server.test.ts`
  - Red: missing `src/daemon/server.ts` module.
  - Green: server composes db, state, API, and supervisor; `start()` is
    idempotent and returns the same handle while running; `stop()` delegates to
    API stop, marks connected agents disconnected, calls `supervisor.stop()`,
    and clears the in-process transport shell for a later restart.
  - Restart coverage: start → attach `"impl"` → stop → start → attach same name
    reconnects the existing row with the same agent id and `connected` status.
  - Policy: repeated `start()` returns the existing handle instead of erroring,
    matching `daemon start` idempotence in the PRD.
  - Verification: `pnpm test`, `pnpm typecheck`.
- [x] `src/daemon/supervisor.ts` — daemon-owned child process boundary stub
  - Files: `src/daemon/supervisor.ts`,
    `tests/unit/daemon/supervisor.test.ts`
  - Red: missing `src/daemon/supervisor.ts` module.
  - Green: defines minimal `Supervisor` interface (`start(): void`, `stop():
    void`) and `createNoopSupervisor()` returning empty no-op implementations;
    repeated `start()`/`stop()` calls are harmless by construction.
  - Decision (Round D follow-up `2e1e316`): the initial cut exposed an
    observable `idle | started | stopped` state field, but that field was only
    consumed by its own test. It was dropped to keep the boundary contract
    narrow — real supervisor will need a different state model (children
    health, restart policy) that wouldn't reuse this enum. Tests that need to
    observe lifecycle calls construct a local recording supervisor instead.
  - Verification: `pnpm test`, `pnpm typecheck`.

### Step 3 Review Follow-ups (Round D)

After Step 3 closed, code review surfaced three follow-up gaps. All handled in
isolated commits, Step 3 header stays `✅ 완료`.

- [x] `server.stop` propagates `daemonOnly` to `api.stop` (`1c2254c`)
  - Red: `handle.stop({ daemonOnly: true })` was silently dropped; agents got
    marked `disconnected` even though spec says daemon-only stop preserves
    them.
  - Green: `DaemonServerHandle.stop` signature becomes
    `stop(options?: StopRequest): StopResponse`; server passes
    `options ?? {}` to `api.stop`.
  - Decision: `supervisor.stop()` is invoked for both stop modes. Reason:
    `prd/mvp/aiox-mvp-spec.md` line 60–65 protects "externally owned /
    user-attached" processes only; daemon-owned children remain in the
    supervisor's domain regardless of `daemonOnly`.
- [x] `Supervisor` interface trimmed to `{ start; stop }` (`2e1e316`)
  - See `src/daemon/supervisor.ts` entry above.
- [x] `DaemonServerHandle.stop` is idempotent and restart-safe (`f566931`)
  - Red: calling `handle.stop()` twice re-invoked `api.stop` and
    `supervisor.stop`. Additionally, retaining an old handle across
    `server.start() → stop → start()` could mutate the shared DB state used by
    the fresh session because the old handle's closure still held the original
    `api`.
  - Green: handle closure captures a `stoppedResponse` cache; the first call
    runs `api.stop` + `supervisor.stop` and freezes the response, every
    subsequent call returns the cached `StopResponse` without re-touching
    state.
  - Decision: prefer the cached response over a typed
    `{ ok: false, reason: "already_stopped" }`. Reason: a typed error widens
    the `StopResponse` contract and forces every caller to branch. The cache
    keeps the contract narrow and matches the supervisor's idempotent
    posture.

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
