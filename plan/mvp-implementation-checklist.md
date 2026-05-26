# aiox MVP Implementation Checklist

> Purpose: Track implementation progress for the MVP TDD 11단계 without replacing
> the authority of `history/15-mvp-design-decisions.history.md` and
> `prd/mvp/aiox-mvp-spec.md`.
>
> Step 순서는 `history/15` "다음 구현 순서" + `prd/mvp/aiox-mvp-spec.md`
> "Testing Requirements"를 기준으로 한다. Step 6 (invocation layer + CLI bin
> entrypoint)은 Step 5 마감 후 추가된 단계로, 기존 Step 6~10이 Step 7~11로
> 재번호됐다 (`history/19-step-5-route-fanout-tests.history.md` "다음 step 후보"
> 절 참고).
>
> Step 2 cleanup + Step 3 transaction boundary context:
> `history/16-step-2-sqlite-repository-cleanup.history.md`.
>
> Last updated: 2026-05-26

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
  - Keep route fan-out and pair auto-route assertions for Step 5/7 daemon-level
    tests; Step 3 only proves API shape, state persistence, and transport
    round-trip. (Step 6 invocation layer는 2026-05-19에 신규 삽입되어 pair는 Step 7로 밀림.)
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

## Step 4: CLI command parsing tests — ✅ 완료

13개 명령 모두 parse + validation:

- [x] `aiox daemon start | stop | stop --daemon-only | restart | status`
  - Round 1 files: `src/cli/parse.ts`, `tests/unit/cli/parse.test.ts`.
  - Red 1: `parseCli(["daemon", "start"])` failed because parser module did not exist.
  - Green 1: commander-backed parser skeleton returns `{ kind: "daemon-start" }`.
  - Red 2: daemon stop/restart/status happy paths failed as unknown commands.
  - Green 2: daemon lifecycle 5 commands parse; invalid daemon input throws typed `CliParseError`.
- [x] `aiox codex --name <name> [--pair <pair-name>]`
  - Round 2 files: `src/cli/parse.ts`, `tests/unit/cli/parse.test.ts`.
  - Red: codex attach happy paths failed as unknown commands; empty name could not reach `aiox.invalidName`.
  - Green: codex attach parses required `--name`, optional `--pair`, and rejects empty names.
- [x] `aiox claude --name <name> [--pair <pair-name>]`
  - Round 2 files: `src/cli/parse.ts`, `tests/unit/cli/parse.test.ts`.
  - Red: claude attach happy paths failed as unknown commands.
  - Green: claude attach shares the agent attach parser path and non-empty validation.
- [x] `aiox connect <source> <target...>`
  - Round 2 files: `src/cli/parse.ts`, `tests/unit/cli/parse.test.ts`.
  - Red: connect happy paths failed as unknown commands; missing/empty routing args did not reach typed parser errors.
  - Green: connect parses source plus one-or-more targets, rejects missing targets and empty names.
- [x] `aiox disconnect <source> <target...>`
  - Round 2 files: `src/cli/parse.ts`, `tests/unit/cli/parse.test.ts`.
  - Red: disconnect happy paths failed as unknown commands; missing target did not reach typed parser errors.
  - Green: disconnect shares routing parser path and one-or-more target validation.
- [x] `aiox pair --name <pair-name>`
  - Round 3 files: `src/cli/parse.ts`, `tests/unit/cli/parse.test.ts`.
  - Red: pair create happy path failed as unknown command; empty pair name did not reach `aiox.invalidName`.
  - Green: pair create parses required `--name` and reuses non-empty name validation.
- [x] `aiox status | stop | doctor`
  - Round 3 files: `src/cli/parse.ts`, `tests/unit/cli/parse.test.ts`.
  - Red: global status/stop/doctor happy paths failed as unknown commands; status unknown flag did not reach `aiox.unknownOption`.
  - Green: global status, global stop, and doctor parse as surface-intent variants.

각 명령의 invalid input rejection test 포함.

### Step 4 Review Follow-ups (Round 1 minor 처리)

- [x] Error code namespace normalized to `aiox.*`.
  - Red: invalid parser tests expected `aiox.*`, but commander-origin errors exposed `commander.*`.
  - Green: `CommanderError` conversion preserves message/exitCode while normalizing public codes.
- [x] Help/version handled as successful parse results.
  - Red: `--help` threw a commander help exit and `--version` was unknown.
  - Green: parser captures commander output and returns `{ kind: "help" }` / `{ kind: "version" }`.

### Step 4 Review Follow-ups (Round 2 minor 처리)

- [x] CLI `AgentKind` aligned with the core literal.
  - Red: switching parser/core imports to a shared literal module failed typecheck before the module existed.
  - Green: `src/core/agent-kind.ts` now owns the literal and `src/core/agents.ts` re-exports it.
- [x] CLI version injection replaces parser-local hardcoding.
  - Red: injected version test still returned the default `1.0.0`.
  - Green: `parseCli` accepts `{ version }` while keeping a default fallback.
- [x] Help/error intent clarified without behavior changes.
  - Behavior unchanged: existing tests and typecheck stayed green.

### Step 4 Polish (Round 4)

- [x] Help/version output trim policy clarified.
  - Red: added explicit assertions that help preserves commander trailing newline while version exposes a trimmed scalar.
  - Green: documented the mixed policy in parser code without changing behavior.
- [x] `createProgram` converted to an options object.
  - Red: changing the caller first failed typecheck against the old positional signature.
  - Green: added `CreateProgramOptions` and destructured `{ version, output, setParsed }`.
- [x] Invalid input code assertions strengthened.
  - Red: `stop extra` was first asserted as `aiox.unknownArgument`, exposing commander normalized it as `aiox.excessArguments`.
  - Green: typed code assertions now cover previously loose invalid parser cases.
- [x] Parser exit code semantics aligned.
  - Red: added coverage for representative commander-origin and aiox-origin parse errors.
  - Green: parser errors are documented and tested as exit code `1`; a shared constant backs aiox-origin throws.
- [x] CLI help descriptions added.
  - Red: root help lacked the orchestrator description and spec-facing command phrases.
  - Green: root, daemon, attach, routing, pair, global status/stop, and doctor commands expose short descriptions.

---

## Step 5: route/connect fan-out tests (daemon level) — ✅ 완료

Step 1에서 core unit으로 cover된 fan-out logic을 **daemon API + store 결합 레벨**에서 재검증.

- [x] daemon connect 호출 → store에 directed routes 생성
  - Red: added store-level assertions for directed route rows, internal timestamps, duplicate connect idempotency, and missing-target all-or-nothing.
  - Green: existing daemon/store implementation already persisted the expected route rows without code changes.
- [x] daemon disconnect → 명시 route만 제거, history 보존
  - Red: added store-level assertions that disconnect removes only explicit routes and keeps messages, deliveries, and events.
  - Green: existing daemon/store implementation already preserved historical rows without code changes.
- [x] message fan-out → message + N deliveries store 영속화
  - Red: added daemon-level store assertions for messages, queued deliveries, and fan-out events created from active directed routes.
  - Green: added minimal `sendMessage` daemon API/state path that persists the message, deliveries, and events in one transaction.
- [x] idempotency (message_id, target_agent_id) 거부
  - Red: duplicate `sendMessage` with a newly added active route hit a message primary-key error instead of typed delivery idempotency and all-or-nothing store preservation.
  - Green: daemon preflights active-route delivery idempotency keys and returns the existing delivery without adding message, delivery, or event rows.

---

## Step 6: invocation layer + CLI bin entrypoint — ✅ 완료

Step 4 parser가 만든 `ParsedCommand`를 Step 3/5 daemon API로 dispatch하고, `package.json#bin` + `src/bin/aiox.ts`로 사용자가 실제 명령을 실행할 수 있게 한다. parse layer는 surface intent만 표현했고 daemon-* / global-* shortcut 매핑, exit code 전파, help/version 출력은 이 step의 책임.

진입 전 spec 결정 마감 (`history/20-step-6-phase-a-decisions.history.md`):
1. **commander origin `exitCode` 정책** — 옵션 A. `err.exitCode ?? 1`로 commander origin 값을 통과하고 없으면 1.
2. **`sendMessage` CLI surface** — 옵션 (ii). MVP CLI에 `aiox send` 류 명령을 추가하지 않고 daemon API/internal only로 유지.
3. **`sourceRoutes` empty 시 동작** — 옵션 β-1. `{ ok: false, reason: "no_active_routes" }` atomic reject, message/delivery/event row 추가 없음.

Phase B Round 1 구조 결정 마감 (`history/20-step-6-phase-a-decisions.history.md`):
- invocation 위치: `src/cli/invocation.ts` 단일 파일.
- dispatch 패턴: exhaustive `switch` + `assertNever`.
- shortcut 정규화: invocation 단계.
- invocation/runtime error: `aiox.invocation.*` namespace.
- β-1 구현: `sourceRoutes` 조회 직후 early return.
- bin source: `src/bin/aiox.ts`; `src/cli/`는 parser/invocation 모듈 전용.

- [x] parse → daemon API dispatch mapping
  - 13개 `ParsedCommand` variant 각각이 daemon API 호출(또는 stdout 출력)로 매핑되는 invocation table.
  - `global-stop` → `daemon.stop()` 등 shortcut 정규화 위치 결정.
  - Red: added invocation tests for all parser variants, shortcut normalization, help/version stdout, and `aiox.invocation.*` error wrapping.
  - Green: added `src/cli/invocation.ts` with exhaustive `switch` + `assertNever`.
- [x] CLI bin entrypoint (`package.json#bin` + `src/bin/aiox.ts`)
  - `process.argv` 수신 → parse → invocation → daemon 연결 → `process.exit(code)`.
  - 현 단계는 fake/in-process transport로 충분. real socket transport는 별도 후속 step/보류 항목으로 유지.
  - Red: added bin tests for help/version stdout, parse/invocation exit codes, and package bin path alignment.
  - Green: added `src/bin/aiox.ts` with fake in-process runtime and aligned `package.json#bin` to compiled output.
- [x] exit code propagation
  - `CliParseError.exitCode` 직통 vs. normalize (위 spec 결정 (1)에 따름).
  - invocation/runtime error는 별도 코드 체계 정의.
  - Green: bin catch returns `err.exitCode ?? 1`; invocation failures use `aiox.invocation.*`.
- [x] help/version stdout 처리
  - parser가 capture한 `{ kind: "help", text }` / `{ kind: "version", value }` variant를 bin이 stdout 출력. parser 자체는 side-effect free 유지 (Step 4 결정 #5).
  - Green: bin writes parser-captured help/version to stdout and leaves parser side-effect free.
- [x] `sendMessage` empty route β-1 적용
  - Red: added daemon store test expecting `no_active_routes` with no message, delivery, or event rows.
  - Green: `sendMessage` now returns before transaction when active source routes are empty.
- [x] `sendMessage` CLI 노출 deferred (OA1)
  - `history/20-step-6-phase-a-decisions.history.md` 결정 2에 따라 MVP Step 6에서는 CLI surface 미노출.
  - post-MVP 또는 send CLI 필요 시점에 `aiox send` 및 `allowOrphanMessage` flag 여부 재검토.

---

## Step 7: pair reservation tests (daemon level) — ✅ 완료

Step 1에서 core unit으로 cover된 pair logic을 **daemon API + store 결합 레벨**에서 재검증.
Phase A pre-implementation decisions: `history/22-step-7-phase-a-decisions.history.md`.
Phase B implementation record: `history/23-step-7-phase-b-pair-daemon.history.md`.

Phase B 결과:
- TDD red 로 pair daemon/store gap 을 먼저 고정한 뒤 X-strict signature 정리와
  daemon orchestration 변경을 green commit 으로 구현.
- daemon attach flow 는 single transaction + rollback sentinel + `pairs.attachAgent`
  호출 + bidirectional auto-route 로 구현 완료.
- `sendMessage` sentinel 회귀 정정 / idempotency preflight transaction 경계 (O1) /
  send CLI surface (OA1)는 본 step 밖으로 유지.

- [x] daemon pair create → reservation row, AgentInstance 미생성
- [x] codex/claude attach with `--pair` → AgentInstance 생성 + pair slot occupy
- [x] 두 expected side attach 완료 → bidirectional routes 자동 생성
- [x] 같은 kind 두 번째 attach → reject
  - 추가 cover: `agent_kind_mismatch` typed reject + rollback, reject 시 agents /
    pairs / routes / events row 상태 무변경.

---

## Step 8: fake adapter integration tests — ✅ 완료

실제 Codex/Claude 의존 없이 adapter contract 검증.
Phase A pre-implementation decisions: `history/24-step-8-phase-a-decisions.history.md`.
Phase B implementation record: `history/24-step-8-phase-a-decisions.history.md`.

Phase A 결정:
- thin adapter-facing interface 를 `src` 에 두고, fake Codex/Claude 는 그 contract 를 구현.
- source outgoing capture 와 target inject capture 는 별도 buffer 로 분리.
- reply round-trip 은 새 `reply` message fan-out 까지만 검증하고 parent/thread
  correlation 은 Step 10 Codex UUID mapping 정책으로 이월.
- partial failure 는 실패 target delivery 를 `failed` 로 기록하고 다른 target 은
  계속 진행.
- real socket transport + O1 + `sendMessage` sentinel 정정은 Step 9 에서 처리.

Phase B 결과:
- `src/adapters/contract.ts` 의 thin adapter-facing interface 와
  `src/adapters/router.ts` 의 fake/real 공통 dispatch path 추가.
- fake adapter fixture 는 source outgoing capture 와 target inject capture 를 별도
  buffer 로 유지.
- `DaemonApi.updateDeliveryStatus` + `DeliveryRepository.updateStatus` 로 adapter inject
  결과를 delivery status 와 `delivery_status_changed` event 에 반영.
- O1 / `sendMessage` sentinel / real socket transport 는 Step 9 follow-up 으로 유지.

- [x] fake Codex adapter: outgoing capture + turn/start injection 시뮬레이션
- [x] fake Claude adapter: outgoing capture + channel push 시뮬레이션
- [x] end-to-end: source agent → fake adapter outgoing → router → fake target adapter inject → reply round-trip
- [x] partial failure: 한 target inject 실패해도 다른 target 진행 (best-effort)

---

## Step 9: real socket transport + O1/sendMessage atomicity — ✅ 완료

권위 범위: real socket transport interface 도입 + O1 idempotency preflight
transaction 경계 정정 + `sendMessage` sentinel rollback 정정.
Phase A pre-implementation decisions:
`history/25-step-9-phase-a-real-socket-transport.history.md`.
Follow-up hardening:
`history/26-step-9-socket-transport-hardening.history.md`.

Step 9 밖:
- Codex app-server adapter skeleton.
- Claude channel adapter skeleton.
- Codex thread UUID mapping.
- Claude channel automatic execution policy.
- doctor/status output.

Phase A 결정:
- transport protocol 은 Unix domain socket primary. TCP loopback 은 future/test hook,
  Windows named pipe 는 MVP 밖.
- framing 은 NDJSON request/response envelope.
- client identity 는 stateless control client. request `id` 로 response correlation.
- O1 은 preflight transaction 내부 이동 + UNIQUE catch reclassify 를 함께 적용.
- rollback sentinel 적용 범위는 `sendMessage` flow 로 제한.
- transport/protocol error 만 envelope error 로 두고 daemon API typed response 는
  기존 shape 를 보존.
- shutdown 은 listening server close, live sockets 종료, owned socket path cleanup.

Phase B 결과:
- `src/daemon/socket-transport.ts` 에 UDS + NDJSON request/response transport 추가.
- socket transport 는 daemon API typed response 를 보존하고, protocol error 만
  envelope error 로 반환.
- `src/bin/aiox.ts` default runtime 을 socket client boundary 로 재결합.
- `sendMessage` preflight 를 transaction 내부로 이동하고, delivery conflict 는
  rollback sentinel throw 로 처리.
- `messages.id` / delivery idempotency UNIQUE conflict 를 typed
  `delivery_idempotency_key_exists` 로 reclassify.

- [x] transport interface + NDJSON codec contract tests
- [x] daemon server socket listen/connect boundary
- [x] CLI/bin runtime socket client 재결합
- [x] `sendMessage` sentinel regression test + rollback pattern 적용
- [x] O1 idempotency preflight transaction 경계 정정 + UNIQUE violation typed reclassify
- [x] 신규 transport contract tests + 가능한 idempotency race-ish regression
- [x] Step 9 Phase B history/verification baseline 갱신
- [x] Follow-up: socket client connection reuse + id multiplex
- [x] Follow-up: socket client request timeout + close fallback
- [x] Follow-up: stale socket `EADDRINUSE` race hardening
  - History: `history/26-step-9-socket-transport-hardening.history.md`.
  - Files: `src/daemon/socket-transport.ts`,
    `tests/unit/daemon/socket-transport.test.ts`.
  - Red/Green: per-request connection count failed at `2`; pending close/hang
    requests failed to reject; stale path retry contract added.
  - Green: persistent socket client with pending id map, request timeout,
    close fallback, and listen-first `EADDRINUSE` stale retry.
  - Verification: `pnpm test tests/unit/daemon/socket-transport.test.ts`,
    `pnpm test`, `pnpm typecheck`, `pnpm build`.

---

## Step 10: Codex per-agent app-server runtime — ⏳ To be planned

Phase B started on 2026-05-21. Round 1 foundation and Round 2 D4 protocol
surface are recorded under
`history/34-step-10-phase-b-codex-runtime.history.md`.

- [x] `src/adapters/codex/runtime.ts` — `CodexAgentRuntime` contract:
  per-agent app-server endpoint, active thread id, lifecycle
  cleanup, and injection metadata
- [x] `src/adapters/codex/app-server.ts` — per-agent Codex app-server
  process/connection metadata; launch with `--listen ws://127.0.0.1:0`; daemon
  does not host app-server in-process
- [x] `src/adapters/codex/websocket.ts` — WS client utilities
- [x] `src/adapters/codex/injector.ts` — `turn/start` 호출
- [ ] `src/adapters/codex/launcher.ts` — codex CLI invoke with
  `codex --remote <assigned-app-server-url>`

**Dependency**: Open Product Issue #2 (Codex thread UUID → agent name mapping)
MVP direction decided in
`history/31-step-10-per-agent-app-server-runtime.history.md`: **Codex agent
1개당 Codex app-server 1개, port는 OS 자동 할당 (`ws://127.0.0.1:0`)**.
2026-05-21 D2 launch banner verification: current Codex CLI emits the
app-server banner on stderr, not stdout. Phase B must parse the endpoint/readyz
from the process output banner with stderr-first support, drain both
stdout/stderr, and not rely on stream chunk boundaries matching lines.

Product model: `CodexAgentRuntime` is the user-facing runtime boundary, similar
to a lightweight container handle managed by an engine. This is not OS-level
containerization. MVP runtime owns process/app-server endpoint/thread id/health
lifecycle metadata so future implementations can switch to a proxy design
without changing the user model.

`history/27-step-10-codex-clear-new-rebind-spike.history.md` 기준으로
TUI `/clear`/`/new`는 `thread/started`를 내지만 old thread가 loaded 상태로
남을 수 있다. `thread/loaded/list`는 active TUI 목록이 아니라 app-server
memory/cache 목록으로 취급한다.

2026-05-20 spike 결과: config-injected `agentNickname`은 root TUI attribution
신호로 사용할 수 없다. Unique cwd pathing과 in-band proxy는 verified fallback이지만
path/protocol complexity가 있다. Per-agent app-server endpoint는 현재 MVP의
agent identity boundary다.

2026-05-20 proxy matrix 결과: empty-session `/clear`와 `/new`는 same-client
`thread/start` response가 새 thread id를 반환해 rebind 가능함을 확인했다.
Empty-session `/fork`는 same-client `thread/fork` request를 보내지만 app-server가
`no rollout found` error를 반환한다. 이는 fork할 rollout/history가 없는 빈
thread의 expected error로 취급한다. 이 spike는 post-MVP TUI-originated rebind
revival 근거로 보존한다.

2026-05-20 per-agent app-server resume/rebind spike:
`history/32-step-10-per-agent-app-server-resume-spike.history.md`. Completed-turn
`/clear`와 `/new`는 same-client `thread/start` success response가 각각 새
thread id를 반환함을 확인했다. Completed-turn `/fork`는 same-client
`thread/fork` success response가 새 thread id와 expected `forkedFromId`를
반환함을 확인했다. `codex resume <thread-id> --remote <endpoint>`는 app-server
`thread/resume` method를 사용하며, rollout-backed thread는 새 app-server
process에서도 resume 가능하고, resume 직후 같은 client의 `turn/start`
injection이 동일 thread id에서 completed turn으로 처리됨을 확인했다. Empty
thread resume은 실패했다.

현재 확인된 Step 10 정책: Codex app-server endpoint 자체가 agent identity
boundary다. Phase B Round 4 D7 replacement 범위는 사용자 결정에 따라
**aiox-originated authoritative 작업**으로 한정한다. 즉 daemon이 직접 보낸
programmatic `thread/start` / 이후 `sendMessage`(`turn/start`)처럼 same-operation
success response를 받을 수 있는 작업만 active thread id 갱신 근거로 사용한다.
TUI-originated `/clear`, `/new`, `/fork` rebind는 direct per-agent app-server에서
daemon이 same-client returned id를 볼 수 없으므로 post-MVP Open Product Issue로
분리한다. 해당 기능을 부활시킬 때는 `history/27` / `history/32`의 transparent
proxy same-client response 근거 또는 future Codex authoritative callback/read API
근거를 사용한다.

Step 10 Phase A decisions are closed in
`history/33-step-10-phase-a-decisions.history.md`. Phase B implementation must
follow the D5-A/D5-B MVP invariant: no zombie defense, process group kill,
setsid, `PR_SET_PDEATHSIG`, periodic healthz, auto-reconnect, or TUI heartbeat.

Phase B implementation tasks:

- [ ] Define `CodexAgentRuntime` state shape and what is persisted in
  `AgentInstance.adapter_session_id` versus in-memory runtime state.
- [x] Implement per-agent app-server launch with `--listen ws://127.0.0.1:0`,
  parse assigned endpoint from the process output banner, and wait for
  `readyz`.
- [x] Ensure user-facing CLI never asks for or exposes a required fixed Codex
  app-server port; ports are runtime metadata.
- [x] Define app-server lifecycle: graceful shutdown, process exit handling,
  and event-listener-only WS close handling. `CodexAgentRuntime.dispose()`
  cleanup is Round 3 D5-A.5: WS close → SIGTERM → 3s grace → SIGKILL.
  `agent_runtime_failed` and `agent_graceful_detach` lifecycle events are
  wired. Hardening items remain deferred by D5-B.
- [x] Define binding/rebind policy for aiox-originated authoritative operations:
  replace the previous binding only when Codex returns an authoritative
  thread/session id to the daemon-owned request; fail-fast on missing/conflicting
  ids or notification-only signals. TUI-originated rebind is post-MVP.
- [x] Re-run completed-turn `/clear`, `/new` matrix after Codex usage limit
  cleared.

Round 2 D4 protocol surface closed on 2026-05-21:

- [x] Persistent per-agent WebSocket client with numeric request ids, pending
  response map, notification listener channel, initialize handshake, timeout,
  and JSON-RPC typed errors.
- [x] `turn/start` injector with D4.4 Option B ack semantics:
  same-client JSON-RPC response accepted on the active runtime thread, not
  `turn/completed`.
- [x] `AdapterInjectResult` reason union extended for Codex D4.6 reasons:
  `codex_app_server_unavailable`,
  `codex_app_server_ws_connect_failed`,
  `codex_app_server_ws_initialize_failed`,
  `codex_app_server_ws_dropped`,
  `codex_turn_start_timeout`, and `codex_jsonrpc_error`.
- [x] Runtime attach flow extended to launch app-server, connect WS,
  initialize, and mark ready. `dispose()` closes WS now; process cleanup remains
  Round 3 D5-A.5.
- [x] Round 2-fix attach atomicity and D4.7 version alignment:
  - Commit: `d1e21cb behavior: cleanup codex app-server on attach failure`.
  - WS connect failure and initialize failure before attach-ready now cleanup the
    launched app-server with `SIGTERM` while preserving the original typed error.
  - initialize sends `clientInfo.version` from `package.json.version`.
  - Gemini D7 learning record corrected in
    `01c4e00 docs: correct d7 option d learning record`.
  - Verification: `pnpm test tests/unit/adapters/codex-runtime.test.ts`,
    `pnpm test` (36 files / 192 tests), `pnpm typecheck`, `pnpm build`.

Round 4 D7 replacement + TUI launch + explicit resume closed on 2026-05-21:

- [x] `codex_binding_uncertain` and `codex_resume_failed` adapter reasons
  wired; injector pre-request and post-ack mismatch now fail with
  `codex_binding_uncertain`.
- [x] `agent_thread_id_rebound` and `codex_binding_uncertain_observed` event
  types added; daemon-owned thread start/resume rebind emits
  `agent_thread_id_rebound`.
- [x] Option A attach ownership decision recorded: daemon `attachAgent` creates
  and stores `CodexAgentRuntime`; CLI receives endpoint metadata and launches
  the TUI as its own child.
- [x] `aiox codex --name <name> --resume <session-id>` parser/invocation/API
  path wired. Claude `--resume` remains rejected by parser.
- [x] CLI TUI lifecycle wired: `codex --remote <endpoint>` for attach,
  `codex resume <session-id> --remote <endpoint>` for resume, spawn error
  rollback via `rollbackAgentAttach`, and TUI exit notify via
  `notifyTuiExited`.
- [x] Round 4-fix: launcher TUI/app-server command env override added for
  testability; S4 full manual smoke passed via TUI-only ENOENT path.

---

## Step 11: Claude channel adapter skeleton — ✅ closed (Phase A + Phase B, 2026-05-22)

### Phase A — Decision walkthrough (✅ closed, 2026-05-22)

- [x] Spike R `spikes/claude-channel-registration-poc/` — token-based registration
  handshake + push injection + framing variant (S1~S6 manual observation).
- [x] D1 Trust stance + framing — V1 trusted channel framing + fully automatic
  execution target. aiox no extra confirmation gate; Claude safety prompts surface
  as adapter behavior. (`history/35` D1)
- [x] D2 Ownership boundary — DB-only + daemon memory `claudeChannelRuntime`
  registry. endpoint not persisted to DB. registration token handshake (pending
  token → `.mcp.json` env → `registerClaudeChannel` → daemon verify).
  channel server lifecycle owner: Claude CLI. (`history/35` D2)
- [x] D3 Reply round-trip — reply → daemon HTTP POST back. D6-B integration
  deferred to Phase B separate decision. (`history/35` D3)
- [x] D4 Session expiry typed errors — 3-type model: `claude_channel_unavailable`
  + `claude_channel_push_failed` + `claude_channel_registration_failed`.
  Open Product Issue #5 deferral maintained. (`history/35` D4)

**Phase A authority**: `history/35-step-11-phase-a-claude-channel-decisions.history.md`.

### Phase B — Implementation (✅ closed, 2026-05-22)

- [x] `src/adapters/claude/channel-server.ts` — MCP server (stdio child of Claude
  CLI), HTTP ingress, daemon `registerClaudeChannel` POST on startup
- [x] `src/adapters/claude/launcher.ts` — `claude --dangerously-load-development-channels
  server:...` invoke + attach token delivery via env (`.mcp.json` or equivalent)
- [x] `src/adapters/claude/injector.ts` — HTTP POST to registered endpoint +
  3-type typed error model (D4)
- [x] daemon: `claudeChannelRuntime` registry + `registerClaudeChannel` / `disconnect`
  RPCs + `attachAgent` integration (D2)
- [x] daemon: reply callback endpoint `POST /channel/reply` (D3 Option A) — implemented
  via Unix socket RPC `receiveClaudeChannelReply`; records `claude_channel_reply_received`
  event with chatId/text/agentId link

---

## Step 12: doctor/status output — ✅ closed (2026-05-22)

- [x] `aiox doctor` — Node.js, Codex CLI, Claude CLI, SQLite native binding, daemon socket/db path 점검
- [x] `aiox status` — daemon + agents + pairs + routes + deliveries 요약 출력
- [x] `aiox daemon status` — daemon pid/socket/db/uptime/version

출력 포맷은 Docker-like (STATUS, NAME, KIND 컬럼 정렬).

Phase A authority: `history/36-step-12-phase-a-doctor-status-decisions.history.md`.
Phase B implementation: `src/cli/format.ts`, `src/cli/doctor.ts`,
`src/cli/invocation.ts`, `src/bin/aiox.ts`, `src/daemon/api.ts`,
`src/daemon/state.ts`, `src/store/repositories/messages.ts`,
`src/store/repositories/deliveries.ts`.

---

## Step 13: Codex source path + reply ingress — ✅ Closed (2026-05-23)

Goal: close the missing `Codex -> daemon` side of the message loop. After this
step, Codex should be able to create a routed message or reply through daemon
instead of only receiving daemon-injected turns.

Authority:

- `prd/mvp/aiox-mvp-spec.md` "Message Flow" and "Codex" sections.
- Current gap discovered during MVP manual-test planning after Step 12: daemon
  can inject into Codex, but Codex has no authoritative source path back to
  daemon.
- `history/39-step-13-codex-mcp-ingress.history.md` (spike, decision, closeout).

Scope:

- [x] Document the Step 13 MCP/daemon skeleton before implementation:
  - default daemon is user-local singleton selected by socket path.
  - same socket path = same daemon namespace.
  - agent `cwd` is observability metadata, not a project namespace boundary.
  - aiox-level control MCP is optional/user-installed and Post-MVP by default.
  - agent-level runtime MCP/channel is aiox-managed and launch-scoped.
- [x] Implement the Codex outbound mechanism as an explicit aiox-managed
  agent-level MCP/tool callback:
  - app-server notification scraping is not the MVP authoritative path.
  - The selected path must identify the source `AgentInstance` without asking
    the user to pass hidden ids.
  - Identity must use launch-injected socket path plus daemon-issued agent token
    or equivalent capability, not agent name alone.
- [x] Add adapter-facing API for Codex-originated outbound messages
  (`receiveCodexMessage` / `receiveCodexReply` RPCs).
- [x] Route Codex-originated messages through existing daemon/router
  `sendMessage` behavior (shared `runSendMessageTransaction` helper).
- [x] Support Codex replies with `parent_message_id` correlation where the
  incoming Codex event/tool call includes a parent message reference.
- [x] Preserve existing daemon -> Codex `turn/start` injection behavior
  (273 → 298 tests; existing 273 still PASS).
- [x] TDD coverage:
  - Codex outbound source path creates one message and deliveries for active
    routes.
  - Codex reply creates a `reply` message linked to the parent and routes back
    through the original source path.
  - Missing/unknown Codex agent identity is a typed error
    (`codex_ingress_unauthorized` with `missing_token` / `agent_not_registered`
    / `token_mismatch` detail).
  - One failed Codex outbound attempt does not prevent later valid outbound
    attempts (token persists in-memory across tool calls).

Implementation summary:

- Pre-impl spike (`history/39`): Codex CLI 0.132.0 `-c 'mcp_servers.<name>={...}'`
  inline TOML override verified to register a per-invocation MCP server and
  carry `env = {...}` to the spawned child, with no mutation of the global
  `~/.codex/config.toml`.
- New daemon RPCs: `registerCodexChannel`, `disconnectCodexChannel`,
  `receiveCodexMessage`, `receiveCodexReply`. Pending-token Map mirrors Claude
  channel pattern; after the Step 14 remote-mode follow-up, the token is
  pre-issued before Codex runtime attach so the daemon-owned app-server can
  launch the `aiox mcp-codex` child immediately, then exchanged once on
  register.
- New event types: `codex_channel_registered`, `codex_channel_disconnected`,
  `codex_ingress_message_received`, `codex_ingress_reply_received`.
- New `aiox mcp-codex` hidden subcommand spawns the stdio MCP server with two
  tools: `aiox_send_message(content)` and
  `aiox_reply(parent_message_id, content)`. All diagnostic logs go to stderr;
  stdout is reserved for MCP protocol.
- Codex MCP injection originally targeted the foreground TUI in Step 13, but
  the Step 14 remote-mode follow-up moved `-c 'mcp_servers.aiox = { command, args, env }'`
  to the daemon-owned `codex app-server` launch. The TUI launcher now keeps
  only remote connection args.
- The daemon/server path exposes the same socket path to Codex runtime attach so
  the launch-scoped app-server MCP config can point `aiox mcp-codex` back at
  the daemon.

Commits (in order):

- `72b8bb4` docs: record codex mcp ingress decision (spike result)
- `292a1d7` structure: extract sendMessage transaction helper
- `a776744` behavior: add daemon codex ingress rpcs
- `fe44d7e` behavior: add aiox mcp-codex subcommand and server
- `8ce0323` behavior: wire codex runtime mcp launch
- (this) docs: close step 13 plan and history

Verification baseline:

```
pnpm test       # 298 passing (+25 vs Step 12 baseline of 273)
pnpm typecheck  # PASS
pnpm build      # PASS
```

Review follow-up (2026-05-23): 3 security/correctness issues fixed (stale token revocation, full SHA-256 hash, control-char name validation). +8 tests.

```
pnpm test       # 306 passing (+8 from review follow-up)
pnpm typecheck  # PASS
pnpm build      # PASS
```

Out of scope (preserved):

- Full terminal E2E with real Codex + real Claude in separate shells. That needs
  Step 14's long-running daemon/client reuse.
- YAML compose and terminal pane automation.
- TUI-originated `/clear` `/new` `/fork` rebind via MCP callback (post-MVP
  Open Product Issue carried from Step 10 D7 Option D).
- aiox-level control MCP setup UX (Post-MVP).

---

## Step 14: Long-running daemon/client reuse + manual E2E smoke — ✅ Closed (2026-05-23)

Goal: make separate `aiox` CLI invocations share the same daemon process so a
person can run real Codex and Claude terminals and verify message exchange.

Authority:

- `prd/mvp/aiox-mvp-spec.md` daemon command semantics and Testing Requirements.
- `history/40-step-14-daemon-client-split.history.md` — implementation decisions,
  verification, and manual smoke flow.

Scope:

- [x] Split CLI client behavior from daemon start behavior:
  - `aiox daemon start` owns daemon creation (forks `aiox _run-daemon` as a
    detached child process via `createClientRuntime.startDaemon()`).
  - `aiox daemon status` remains read-only (`canConnect` probe only).
  - `aiox codex` and `aiox claude` auto-start daemon if absent (PRD explicit).
  - `aiox pair`, `aiox connect`, `aiox status` connect to existing daemon; error
    if none running (E2E flow starts daemon explicitly first).
- [x] Ensure `aiox pair`, `aiox codex`, `aiox claude`, `aiox connect`, and
  `aiox status` operate on the same long-running daemon state across terminal
  invocations (same stable socket path `~/.aiox/daemon.sock`).
- [x] Keep MVP storage at `:memory:` (no persistent DB path change).
- [x] Add integration tests around socket client reuse without launching real
  Codex/Claude CLIs (9 new tests in `tests/integration/daemon-client-split.test.ts`).
- [x] Add a documented manual smoke flow (see `history/40`):
  - `aiox daemon start`
  - `aiox pair --name p1`
  - `aiox codex --name impl --pair p1`
  - `aiox claude --name reviewer --pair p1`
  - verify bidirectional routed message/reply behavior
  - `aiox status`
  - `aiox daemon stop`

Commits (in order):

- `cf17e68` structure: extract stable socket path + export canConnect
- `1172a74` behavior: daemon/client split — createClientRuntime + _run-daemon entry point

Verification baseline:

```
pnpm test       # 325 passing (46 files; + Step 14 Claude reply -> Codex routed delivery drain)
pnpm typecheck  # PASS
pnpm build      # PASS
```

Follow-up status:

Resolved Step 14 follow-up:

- [x] Claude channel initiator send path: added Claude MCP `send(text)` for chat-id-free routed messages, daemon `receiveClaudeChannelMessage`, `claude_channel_message_received` observability, and tests proving Claude -> Codex can start from a fresh/no-chat-id context. `reply(chat_id, text)` remains the parent-preserving reply path. Verification: `pnpm test` passed, `pnpm typecheck` passed, `pnpm build` passed.
- [x] Claude reply -> Codex routed delivery drain: `receiveClaudeChannelReply` now creates a routed `reply` message from the Claude agent with `parent_message_id` set to the original aiox message id, drains Codex target deliveries through the existing Codex `turn/start` injector, and moves successful reply deliveries through `queued -> delivering -> delivered -> completed`. The Claude `reply(chat_id, text)` surface is unchanged, and users should not manually provide chat ids in normal routed flow. Verification: targeted daemon/Codex/Claude channel tests, `pnpm test` (325 passing, 46 files), `pnpm typecheck`, `pnpm build`. Authority context: `history/40-step-14-daemon-client-split.history.md`.
- [x] Codex -> Claude queued delivery drain: `receiveCodexMessage` now drains queued deliveries for connected Claude targets through the registered Claude channel endpoint, sends `chat_id` as the aiox message id and `origin` as the Codex source agent name, and moves delivery state through `queued -> delivering -> delivered -> completed` or `failed`. Claude `reply(chat_id, text)` remains the reply surface; users should not manually provide chat ids in normal routed flow. Verification: targeted daemon/Claude/Codex ingress tests, `pnpm test` (324 passing, 46 files), `pnpm typecheck`, `pnpm build`. Authority context: `history/40-step-14-daemon-client-split.history.md`.
- [x] Codex remote MCP injection target mismatch: aiox MCP injection now targets the daemon-owned `codex app-server` launch instead of the foreground remote TUI. The daemon pre-issues the Codex channel token before runtime attach and passes the same daemon socket path into app-server launch. Manual smoke confirmed the prior Notion `starting` hang is resolved. Follow-up fixed `aiox mcp-codex` startup so stdio MCP connects before daemon registration and the hidden subcommand stays alive until transport close. This preserves Step 13 stdout MCP protocol, token hardening, and same socket path contract. No `CODEX_HOME`/profile/`sqlite_home` isolation was added. Authority context: `history/40-step-14-daemon-client-split.history.md`; learning record: `docs/aiox/step-14-codex-mcp-remote-architecture-bug.md`.

Open Step 14 follow-up:

- [x] Codex live loaded-thread delivery + queued fallback: manual smoke on 2026-05-25 showed daemon `completed` for Claude -> Codex reply while the visible Codex TUI did not show/read the message. Implemented live `thread/loaded/list` discovery before Codex target injection, latest loaded-thread selection to avoid cached/hidden thread oscillation, successful rebind/cache update only when the live thread changes, no-loaded-thread queued fallback, and `codex_delivery_queued_no_loaded_thread` observability. Verification: `pnpm test` passed (46 files, 331 tests), `pnpm typecheck` passed, `pnpm build` passed. Authority context: `history/40-step-14-daemon-client-split.history.md`; PRD policy: `prd/mvp/aiox-mvp-spec.md` Message Flow.
- [x] Codex no-resume attach hidden-thread reduction: fresh Codex attach no longer calls daemon-side `runtime.startThread()`; it launches/registers the runtime and leaves `adapter_session_id` null until explicit resume or first successful live loaded-thread delivery. This removes the daemon-created hidden thread from the common cold-start loaded-list set while preserving `--resume` binding. Verification: targeted daemon API/Codex ingress/CLI tests passed, `pnpm test` passed (46 files, 335 tests), `pnpm typecheck` passed, and `pnpm build` passed. Authority context: `history/40-step-14-daemon-client-split.history.md`, `history/41-codex-loaded-thread-binding-analysis.history.md`; PRD policy: `prd/mvp/aiox-mvp-spec.md` Message Flow.
- [x] Codex delivery target selection observability: Claude -> Codex delivery now records `codex_delivery_target_selected`, `codex_delivery_target_unavailable`, and `codex_delivery_target_injection_failed` events so completed/queued/failed outcomes can be traced back to `thread/loaded/list`, the latest-loaded-thread selection, cached adapter session id, runtime active thread id, source agent id/name, and target agent without storing message content. Runtime-unavailable and not-ready failures remain terminal delivery failures because no loaded-thread observation occurred. Verification: targeted daemon/core tests passed, `pnpm test` passed (46 files, 338 tests), `pnpm typecheck` passed, and `pnpm build` passed. Authority context: `history/40-step-14-daemon-client-split.history.md`, `history/41-codex-loaded-thread-binding-analysis.history.md`.
- [x] Codex aiox inbound envelope + reply dispatch symmetry: Claude -> Codex `turn/start` injection now wraps delivered text in `<aiox-channel source="claude" message_id="...">` while preserving stored message content, Codex MCP instructions/tool description map envelope `message_id` to `aiox_reply(parent_message_id, content)`, and `receiveCodexReply()` drains successful reply deliveries through the registered Claude channel. Verification: targeted daemon/Codex MCP tests passed, `pnpm test` passed (46 files, 341 tests), `pnpm typecheck` passed, and `pnpm build` passed. Authority context: `history/40-step-14-daemon-client-split.history.md`.
- [x] Codex envelope review hardening: Claude review follow-up fixed XML `<` escaping for envelope attributes, used the `ReceiveCodexReplyResult` daemon interface alias, and added coverage for `receiveCodexReply()` failing delivery when the Claude channel is unregistered. Verification: targeted daemon tests passed, `pnpm test` passed (46 files, 342 tests), `pnpm typecheck` passed, and `pnpm build` passed. Authority context: `history/40-step-14-daemon-client-split.history.md`.
- [x] Codex per-agent proxy active-thread rebind: replaced `thread/loaded/list.at(-1)` as the authoritative visible-thread signal with a per-agent transparent proxy that observes same-connection `thread/start`, `thread/resume`, and `thread/fork` responses. Manual build-output smoke passed basic `claude -> codex -> claude`, `/clear`, `/new`, `/fork`, `/resume`, `/resume -> /clear`, `/resume -> /new`, and `/resume -> /fork`. Authority context: `history/41-codex-loaded-thread-binding-analysis.history.md`; plan handoff: `plan/codex-per-agent-proxy-rebind-handoff.md`; PRD policy: `prd/mvp/aiox-mvp-spec.md`.
- [x] Codex proxy lazy parse optimization: production proxy still relays all frames unchanged and emits the same binding events, but now skips `JSON.parse` for client frames without binding method needles and skips upstream parsing while no binding request is pending. Verification: `pnpm test tests/unit/adapters/codex-proxy.test.ts` passed (11 tests), targeted proxy/rebind/runtime/ingress tests passed (4 files, 69 tests), and `pnpm typecheck` passed. Remaining risk is a mostly theoretical escaped-slash JSON encoder form such as `"thread\/start"`; observed Codex frames and normal `JSON.stringify` use `"thread/start"`. Authority context: `history/41-codex-loaded-thread-binding-analysis.history.md`.

Deferred to Post-MVP (2026-05-25, user decision):

- Codex queued delivery retry/drain: when a Claude -> Codex reply remains queued because no live loaded thread exists, retry/drain it after Codex channel registration or a later loaded-thread signal. The 2026-05-25 cold-start smoke shows the alternate-thread preference already covers the visible MVP path, so the queued retry/drain safety net moves to post-MVP.
- Codex MCP queued-message pull/read/ack: agent-level pull path so Codex can discover and acknowledge queued deliveries when push could not happen immediately. Tied to the queued retry/drain safety net; deferred together to post-MVP.


Remaining out of scope:

- CI automation for real Codex/Claude authenticated sessions.
- GUI terminal split automation.
- Post-MVP `logs`, `inspect`, `rm`, `kill`, and compose.

---

## Open Product Issues (구현 중 정책 결정 필요)

권위: `prd/mvp/aiox-mvp-spec.md` "Open Product Issues" 섹션.

1. Claude channel trust/confirmation policy → **MVP 결정 완료**:
   V1 trusted channel framing + fully automatic execution target
2. Codex thread UUID → agent name mapping → **Step 10 시작 전 결정 필요**
3. Stale agent transition policy → Step 2 repositories 또는 Step 3 daemon API 단계에 영향
4. Long-running delivery timeout policy → MVP에는 timeout 없음 default. Step 5/8 통합 테스트에서 노출될 수 있음
5. AI agent session expiry handling → Step 10/11 adapter 구현 시 노출될 수 있음

Post-MVP parking lot:

- `prd/post-mvp/agent-message-lifecycle-policy.md` tracks pair-level
  blocked/pending policy plus duplicate outbound, fan-out, and user-interrupted
  pending-turn policy. These are not MVP implementation scope.

---

## Verification Baseline

Latest full verification:

- `pnpm test`: passing, 46 files, 323 tests (Step 14 Codex remote MCP injection target + MCP handshake fix, 2026-05-24)
- `pnpm typecheck`: passing
- `pnpm build`: passing

각 step 완료 시 위 baseline을 갱신한다.

---

## Notes

- Keep this file as an execution checklist only.
- If product behavior changes, update `history/15` 또는 `prd/mvp/aiox-mvp-spec.md` first, then adjust this checklist.
- Do not use this file as the source of truth for MVP decisions.
- Step 3-12 sub-task는 해당 step 시작 시점에 더 구체화한다. 지금은 placeholder.
- vault `work/active/aiox.md` Implementation Status 섹션은 이 checklist의 high-level mirror일 뿐이고 todo 표기는 두지 않는다 (AGENTS.md "Checklist / Todo 위치 원칙").
