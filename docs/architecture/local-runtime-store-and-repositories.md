# aiox Local Runtime — SQLite Schema and Repositories (§2–§3)

Related:

- [[docs/architecture/local-agent-runtime]]
- [[docs/decisions/pair-slot-generalization]]
- [[docs/decisions/pair-attach-atomicity-and-sentinel]]

Status: Current

## 2. SQLite Schema

In-memory only — `runDaemonProcess` opens `new Database(":memory:")`
([[src/daemon/run.ts]] — `src/daemon/run.ts:25`). The file-mode helper `openSqliteDatabase`
([[src/store/sqlite.ts]] — `src/store/sqlite.ts:5-12`) is unused. `applySchema`
([[src/store/schema.ts]] — `src/store/schema.ts:14-82`) first runs the idempotent
`create table if not exists` block, then calls `applyMigration1`
(`src/store/schema.ts:81`). `applyMigration1` (`src/store/schema.ts:84-135`)
is the versioned migration introduced by Step 15; the slot model below
depends on it.

| Table | Key columns | Notes |
|---|---|---|
| `agents` | `id PK`, `name UNIQUE NOT NULL`, `kind`, `status`, `cwd`, `pair_id`, `pair_slot`, `adapter_session_id`, `last_seen_at`, timestamps | `adapter_session_id` holds Codex active thread id (nullable). `pair_id` no FK. `pair_slot ∈ {a,b}` (nullable; set on pair attach). |
| `pairs` | `id PK`, `name UNIQUE NOT NULL`, `status` (`pending`/`ready`/`stale`) | `stale` exists in the `PairStatus` type ([[src/core/pairs.ts]] — `src/core/pairs.ts:3`) but no code path writes it — type-only; transition policy unimplemented (gap). |
| `routes` | `id PK`, `source_agent_id`, `target_agent_id`, `status`, `UNIQUE(source_agent_id,target_agent_id)` | Directed. No FK. |
| `messages` | `id PK`, `source_agent_id`, `parent_message_id` (nullable), `type`, `content`, timestamps | Type ∈ `question|instruction|status|event|reply`. |
| `message_deliveries` | `id PK`, `message_id`, `target_agent_id`, `route_id`, `status`, `idempotency_key UNIQUE NOT NULL` | UNIQUE constraint is load-bearing for the rollback-sentinel reclassify pattern. |
| `schema_version` | `version PK`, `applied_at` | Migration ledger created by `applyMigration1` (`src/store/schema.ts:125-133`). `isMigrationApplied` gates re-runs (`src/store/schema.ts:137-147`). |
| `events` | `id PK`, `agent_id`/`message_id`/`delivery_id`/`route_id` (all nullable), `type`, `data_json`, `created_at` | Append-only. |

**Migration 1 + slot invariant** (Step 15; [[docs/decisions/pair-slot-generalization]]).
`applyMigration1` runs entirely inside one `withTransaction`
(`src/store/schema.ts:89-134`) and is skipped once `schema_version` row 1
exists. Steps: (1) preflight — if `pair_slot` is absent, group existing
attached agents by `(pair_id, kind)` and **throw** if any group has >1 row
(`src/store/schema.ts:92-107`); (2) `alter table agents add column pair_slot`
(`src/store/schema.ts:109`); (3) backfill `codex→'a' / claude→'b'`
(`src/store/schema.ts:110-117`); (4) create **partial unique index**
`agents_pair_slot_unique on agents(pair_id, pair_slot) where pair_id is not null`
(`src/store/schema.ts:120-124`); (5) record `schema_version` row 1
(`src/store/schema.ts:125-133`). The partial unique index is load-bearing: it
enforces the 2-slot occupancy invariant (at most one agent per
`(pair_id, slot)`) at the DB level, independent of the repository-level checks in §3.
Preflight failure throws a typed `SchemaMigrationError` with
`reason: "schema_migration_failed"`,
`detail: "duplicate_pair_slot_after_backfill"` and the conflicting
`(pair_id, kind)` groups (`src/store/schema.ts:5-12, 163-173`); the whole
transaction rolls back, aborting daemon boot.

`recoverAfterRestart` exists on `DeliveryRepository`
([[src/store/repositories/deliveries.ts]] — `src/store/repositories/deliveries.ts:148-158`) and resets
`delivering → queued`, but has **no caller** in `src/`
— Implementation-only (no recorded rationale for non-wiring; daemon DB is
in-memory so there is nothing to recover anyway).

---

## 3. Repositories

All under `src/store/repositories/`. Snake-case rows mapped to camelCase
domain objects. Transactional boundaries are owned by callers in
[[src/daemon/state.ts]], wrapped through
[[src/store/transaction.ts]] (`src/store/transaction.ts:3-5`, `withTransaction = db.transaction(fn)()`).

| Repo | Key methods | Key transactional logic |
|---|---|---|
| `agents` | `attach`, `findByName`, `list`, `markByNameDisconnected`, `markAllConnectedDisconnected`, `rebindAdapterSessionId` | `attach` upserts disconnected rows and inserts new rows ([[src/store/repositories/agents.ts]] — `src/store/repositories/agents.ts:80-150`); rejects with `agent_name_already_connected` if an existing row is `connected` (`src/store/repositories/agents.ts:70-78`). No internal tx. |
| `pairs` | `createReservation`, `attachAgent` | `attachAgent` runs in own `db.transaction` ([[src/store/repositories/pairs.ts]] — `src/store/repositories/pairs.ts:77-192`): verifies agent exists; confirms input `kind` equals the stored agent `kind` (consistency check, **not** a vendor-pairing constraint — `src/store/repositories/pairs.ts:91-99`); self-loop guard via `agent_already_attached` (`src/store/repositories/pairs.ts:101-121`); picks the first open slot a→b kind-agnostically when no explicit slot given (`pickFirstOpenSlot`, `src/store/repositories/pairs.ts:246-258`); rejects if the chosen slot is occupied by another agent (`pair_slot` query, `src/store/repositories/pairs.ts:132-153`); writes `pair_id`+`pair_slot` (`src/store/repositories/pairs.ts:155-166`); recomputes `status = "ready"` only when both slots a·b are filled, kind-agnostic (`isPairReady`, `src/store/repositories/pairs.ts:260-263`). Same-vendor pairs (codex↔codex, claude↔claude) are supported. |
| `routes` | `create`, `disconnect`, `findBySourceAndTarget`, `list` | `create` returns typed `route_already_exists` ([[src/store/repositories/routes.ts]] — `src/store/repositories/routes.ts:103-150`); `disconnect` collects rows then deletes in a tx (`src/store/repositories/routes.ts:83-100`). |
| `messages` | `create`, `count`, `list` | Plain inserts; no tx ([[src/store/repositories/messages.ts]] — `src/store/repositories/messages.ts:40-91`). |
| `deliveries` | `createQueuedForRoutes`, `updateStatus`, `findByIdempotencyKey`, `countByStatus`, `recoverAfterRestart` | `createQueuedForRoutes` inserts all rows in one `db.transaction` ([[src/store/repositories/deliveries.ts]] — `src/store/repositories/deliveries.ts:95-115`). UNIQUE collision on `idempotency_key` is caught and reclassified to typed `delivery_idempotency_key_exists` with the existing row attached (`src/store/repositories/deliveries.ts:117-132, 215-221`). |
| `events` | `append`, `list` | Append-only ([[src/store/repositories/events.ts]] — `src/store/repositories/events.ts:32-71`). |

**Rollback sentinel pattern** (WHY: [[docs/decisions/pair-attach-atomicity-and-sentinel]]):
two module-local `Symbol`s in `src/daemon/state.ts:36-37`:

- `attachRollbackSentinel` — used by `attachAgent` so
  `agent_already_attached` / `pair_slot_occupied` / `pair_full` /
  `agent_kind_mismatch` can throw out of `withTransaction` cleanly
  (`src/daemon/state.ts:571-578`). Reclassified at the outer catch via
  `isAttachRollback` (`src/daemon/state.ts:719-721`).
- `sendMessageRollbackSentinel` — used by `runSendMessageTransaction` to
  unwind on `delivery_idempotency_key_exists` (both the in-tx preflight and
  the UNIQUE-catch path: `src/daemon/state.ts:1791-1797, 1823-1825, 1988-2012`).

The symbols are module-private to ensure unrelated callers cannot fabricate
the rollback token.
