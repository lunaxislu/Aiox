# aiox MVP Implementation Checklist

> Purpose: Track implementation progress for the MVP without replacing the
> authority of `history/15-mvp-design-decisions.history.md` and
> `prd/mvp/aiox-mvp-spec.md`.
>
> Last updated: 2026-05-16

## Completed

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
    - unique pair names
    - unique directed source-target routes
    - unique delivery idempotency keys

## Next

- [ ] Add `src/store/sqlite.ts`
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

## Verification Baseline

Latest full verification before this checklist:

- `pnpm test`: passing, 9 files, 37 tests
- `pnpm typecheck`: passing

## Notes

- Keep this file as an execution checklist only.
- If product behavior changes, update `history/` or `prd/` first, then adjust this checklist.
- Do not use this file as the source of truth for MVP decisions.
