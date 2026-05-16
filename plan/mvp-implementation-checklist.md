# aiox MVP Implementation Checklist

> Purpose: Track implementation progress for the MVP TDD 10단계 without replacing
> the authority of `history/15-mvp-design-decisions.history.md` and
> `prd/mvp/aiox-mvp-spec.md`.
>
> Step 순서는 `history/15` "다음 구현 순서" + `prd/mvp/aiox-mvp-spec.md`
> "Testing Requirements"를 기준으로 한다.
>
> Last updated: 2026-05-16

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

## Step 2: SQLite schema/repository tests with `message_deliveries` — 🟡 진행 중

SQLite open/schema part 완료, repositories 진행 중.

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
  - Commit: `this commit: behavior: add sqlite database open`
  - Files: `src/store/sqlite.ts`, `tests/unit/store/sqlite.test.ts`
  - First red test: opening a database applies schema and enables WAL.
  - Verify `pragma journal_mode` reports `wal` for a file-backed database.

- [ ] Add `src/store/repositories/agents.ts`
  - Persist `AgentInstance`.
  - Implement same-name connected reject.
  - Implement disconnected/stale reconnect with same durable identity.
  - Implement pending_attach attach transition to connected.

- [ ] Add `src/store/repositories/pairs.ts`
  - Persist pair reservations.
  - Enforce one Codex and one Claude slot.
  - Preserve no-agent-created-at-reservation behavior.

- [ ] Add `src/store/repositories/routes.ts`
  - Persist directed routes.
  - Enforce source-target uniqueness.
  - Support directed disconnect.

- [ ] Add `src/store/repositories/messages.ts` and `deliveries.ts`
  - Persist one logical message.
  - Persist N per-target deliveries.
  - Preserve idempotency key uniqueness.
  - Apply restart recovery policy for delivery states.

- [ ] Add `src/store/repositories/events.ts`
  - Persist append-only events.
  - Support nullable `agent_id`, `message_id`, `delivery_id`, and `route_id`.
  - Preserve insertion order with `created_at`.

---

## Step 3: daemon API tests with fake in-process transport — ⏳ To be planned

- [ ] `src/daemon/api.ts` — CLI ↔ daemon API contract
- [ ] `src/daemon/server.ts` — daemon entry point + lifecycle
- [ ] `src/daemon/supervisor.ts` — daemon-owned child process 관리 (Post-MVP에서 활용)
- [ ] `src/daemon/state.ts` — in-memory state cache + SQLite sync
- [ ] fake in-process transport로 control plane round-trip 검증

작업 시작 시 sub-task로 분해.

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

- `pnpm test`: passing, 12 files, 44 tests (Step 1 complete + Step 2 sqlite open까지 반영)
- `pnpm typecheck`: passing

각 step 완료 시 위 baseline을 갱신한다.

---

## Notes

- Keep this file as an execution checklist only.
- If product behavior changes, update `history/15` 또는 `prd/mvp/aiox-mvp-spec.md` first, then adjust this checklist.
- Do not use this file as the source of truth for MVP decisions.
- Step 3-10 sub-task는 해당 step 시작 시점에 더 구체화한다. 지금은 placeholder.
- vault `work/active/aiox.md` Implementation Status 섹션은 이 checklist의 high-level mirror일 뿐이고 todo 표기는 두지 않는다 (AGENTS.md "Checklist / Todo 위치 원칙").
