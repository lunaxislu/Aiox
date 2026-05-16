# SQLite Restart Recovery PoC

> Date: 2026-05-16
> Scope: `aiox` durable broker pre-validation

## Purpose

This spike validates whether the `aiox` broker state model can survive a daemon
restart. The question is not whether SQLite can store rows. The question is
whether the schema can represent agents, routes, messages, append-only events,
restart recovery, idempotency, and late replies without recovering live
transports.

## What This Validates

- File-backed SQLite state can be opened, closed, and reopened.
- WAL mode is enabled for daemon writer plus CLI/status reader scenarios.
- `-wal` and `-shm` sidecar files are created while the DB is open.
- `agents`, `routes`, `messages`, and `events` can be persisted.
- On restart, active transport is not restored. Previously connected agents are
  marked `disconnected`.
- In-flight `delivering` messages are requeued to `queued`.
- Stable message states remain stable across restart:

```text
queued     -> queued
delivering -> queued
delivered  -> delivered
completed  -> completed
failed     -> failed
```

- `messages.idempotency_key` exists and is unique.
- Duplicate `messages.idempotency_key` inserts are rejected.
- A late reply can be represented as:
  - a `reply` message linked by `parent_message_id`
  - a `late_reply` append-only event
- Agent-scoped events can be linked through `events.agent_id`.

## To Add When Promoting to MVP

- `agents.last_seen_at` for stale detection.
- `messages.created_at` and `messages.updated_at` for ordering and diagnostics.
- `events.created_at` for append-only event ordering.

## What This Does Not Validate

- Real daemon process supervision.
- Real Codex or Claude adapter reconnection.
- Duplicate delivery handling beyond unique idempotency rejection.
- Concurrent multi-process read/write load.
- Migrations/versioned schema management.
- Long-running workflow resume semantics.

## Files

```text
spikes/sqlite-restart-recovery-poc/
  store.ts
  store.test.ts
  better-sqlite3.d.ts
  README.md
```

## Run

```bash
pnpm exec vitest run spikes/sqlite-restart-recovery-poc/store.test.ts
```

If `better-sqlite3` has not built its native binding yet:

```bash
pnpm rebuild better-sqlite3
```
