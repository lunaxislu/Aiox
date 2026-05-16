# SQLite Restart Recovery Pre-Validation

> Date: 2026-05-16
> Project: `aiox`
> Scope: MVP durable broker pre-validation

## Purpose

This document records the SQLite restart recovery validation for the `aiox`
daemon/router state model.

The validation question is not whether SQLite can store rows. The question is
whether the broker model can survive a daemon restart while preserving enough
state to resume routing decisions without pretending that live transports were
restored.

## Summary

| Area | Result | Decision |
| --- | --- | --- |
| File-backed SQLite open/close/reopen | PASS | Use SQLite for MVP durable state |
| WAL mode | PASS | Enable WAL for daemon writer plus CLI/status readers |
| Agent/route/message/event persistence | PASS | Keep these as first durable tables |
| Restart recovery state policy | PASS | Do not restore transports; mark agents disconnected |
| In-flight message transition | PASS | Requeue `delivering` messages to `queued` |
| Idempotency schema shape and rejection | PASS | Add unique `messages.idempotency_key` and reject duplicates |
| Late reply schema shape | PASS | Link reply via `parent_message_id` and append `late_reply` event |
| Agent event link shape | PASS | Add nullable `events.agent_id` for agent-scoped events |

## Spike

```text
spikes/sqlite-restart-recovery-poc/
```

Files:

```text
store.ts
store.test.ts
better-sqlite3.d.ts
README.md
```

## Validated Schema Shape

The spike validates these durable entities:

- `agents`
- `routes`
- `messages`
- `events`

Important schema properties:

- `events` is append-only in the spike model.
- `messages` is stateful and carries lifecycle status.
- `messages.idempotency_key` is unique.
- `messages.parent_message_id` can link replies to parent messages.
- `events.agent_id` can attach operational events to an agent.
- `events.message_id` can attach operational events to a message.

## Restart Policy

The spike intentionally does not recover live adapter transports. A restarted
daemon reopens durable state and marks previously connected agents as
`disconnected`.

Message transition policy validated:

```text
queued     -> queued
delivering -> queued
delivered  -> delivered
completed  -> completed
failed     -> failed
```

`delivering -> queued` means the broker can retry or re-evaluate delivery after
restart instead of silently dropping in-flight work.

## Late Reply Shape

The spike validates that a late reply can be recorded without mutating the
original completed/failed parent message:

```text
messages:
  msg-parent
  msg-late-reply(parent_message_id = msg-parent, type = reply)

events:
  late_reply(message_id = msg-late-reply)
```

This only validates representation. Product behavior for duplicate delivery,
late reply routing, and user-facing notification remains MVP/Post-MVP work.

## Agent Event Shape

The spike validates that agent-scoped events do not need to bury the agent id
inside JSON payload:

```text
events:
  agent_disconnected_after_restart(agent_id = agent-codex)
```

This keeps status/debug queries simple:

```sql
select * from events where agent_id = ?;
```

## To Add When Promoting to MVP

- `agents.last_seen_at` for stale detection.
- `messages.created_at` and `messages.updated_at` for ordering and diagnostics.
- `events.created_at` for append-only event ordering.

## Verification

Commands run:

```bash
pnpm exec vitest run spikes/sqlite-restart-recovery-poc/store.test.ts
pnpm exec vitest run
pnpm typecheck
```

Result:

```text
PASS: 5 SQLite spike tests
PASS: 11 total Vitest tests
PASS: TypeScript typecheck
```

## Notes

`better-sqlite3` requires its native binding to be built. The root
`package.json` now allows only the `better-sqlite3` build script through
`pnpm.onlyBuiltDependencies`.

The root Vitest config excludes `legacy/**` so the preserved bridge tests do not
pollute the new `aiox` workspace test run.

## Not Validated

- Real daemon process supervision.
- Real Codex or Claude adapter reconnection.
- Duplicate delivery handling beyond unique idempotency rejection.
- Concurrent multi-process read/write stress.
- Versioned migrations.
- Long-running workflow resume semantics.
