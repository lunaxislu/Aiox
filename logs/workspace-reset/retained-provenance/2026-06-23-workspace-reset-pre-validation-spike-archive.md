---
topic: MVP pre-validation spike archive
description: workspace reset W3 archive digest for legacy prd/pre-validation spikes (claude-codex injection, sqlite restart recovery)
status: decided
---

## Work Items

## 2026-06-23 · W3 archive digest — pre-validation spikes

This archive is the workspace reset successor for the two legacy
`prd/pre-validation/` spike records:

- `prd/pre-validation/claude-codex-pre-validation.md` (2026-05-14)
- `prd/pre-validation/sqlite-restart-recovery-pre-validation.md` (2026-05-16)

It preserves the spike setup, executed commands, observed measurements, and
PASS/PARTIAL traces that the owner documents do not carry at the same density,
so the legacy `prd/pre-validation/` sources can be physically deleted at the
workspace reset deletion gate (`plans/workspace-reset/workspace-reset.md`)
without losing the historical verification context. The Archive Gate
(`logs/AGENTS.md`) preservation-value + self-sufficiency condition was met for
both files; W10 split/checker PASS classified them `archive→delete after
digest` (`logs/workspace-reset/packages/2026-06-22-workspace-reset-W10-split-readiness-map.md`).

The architecture *direction* these spikes unblocked already lives in current
owner documents; only the empirical trace is preserved here.

## 1. Claude/Codex Injection Pre-Validation

Original source: legacy `prd/pre-validation/claude-codex-pre-validation.md`.
Date 2026-05-14. Scope: MVP architecture pre-validation of the two highest-risk
transcript injection paths. Result framing: these checks confirm the
architecture direction is not blocked; they do not mean final product UX is
complete.

### Result Summary (Preserved)

| Area | Result | Spike conclusion |
| --- | --- | --- |
| Claude channel server with Node.js | PASS | Claude adapter can be Node.js based |
| Claude transcript injection | PASS | Use `notifications/claude/channel` |
| Claude automatic channel instruction execution | PARTIAL | Injection works, but trust/confirmation policy needs product design |
| Codex shared app-server with multiple remote sessions | PASS | Adapter boundary should allow shared app-server |
| Codex thread-targeted `turn/start` | PASS | Thread id can route turns to distinct Codex UIs |

### Claude Channel Node.js Validation (Preserved Trace)

- Spike: `spikes/claude-channel-node-poc/`.
- Repo root `.mcp.json` registered a bare MCP server `aiox-channel-poc`
  (`pnpm tsx spikes/claude-channel-node-poc/server.ts`,
  `AIOX_CHANNEL_POC_PORT=18788`).
- Launch: `claude --dangerously-load-development-channels server:aiox-channel-poc`.
- Spike server created an MCP server with
  `capabilities.experimental["claude/channel"]`, connected over stdio, opened
  HTTP ingress at `127.0.0.1:18788/send`, converted `POST /send` into
  `notifications/claude/channel`, and exposed a `reply` tool for two-way
  confirmation.
- Test message via `curl POST /send` returned `{"ok":true}`. Claude received the
  channel message, asked for user confirmation because the instruction came from
  a channel message (not directly from the user), and after the user confirmed,
  Claude responded with the requested text and called the channel `reply` tool.
- Confirmed: Node.js can run the Claude channel MCP server; Claude Code launches
  it from `.mcp.json`; `capabilities.experimental["claude/channel"]` registers
  the channel; `notifications/claude/channel` injects content into Claude
  transcript/model context; Claude can call a channel-provided reply tool.
- Open product issue at spike time: Claude may treat channel-delivered
  instructions as external/untrusted and ask for confirmation; `aiox` needs an
  explicit trust/policy/instruction design before fully automatic Claude-side
  execution.

### Codex App-Server Multi-Session Validation (Preserved Trace)

- Spike: `spikes/codex-app-server-multi-session-poc/`.
- One `codex app-server --listen ws://127.0.0.1:4500`; two
  `codex --remote ws://127.0.0.1:4500` UI sessions attached.
- `client.ts inspect` reported `loadedThreadCount: 2` with two distinct thread
  ids.
- Targeted `turn/start` to thread A id and thread B id each produced the
  expected per-thread output ("received in thread A" / "received in thread B");
  turns did not appear to cross between the tested sessions.
- Confirmed: one `codex app-server` can host multiple loaded remote Codex UI
  threads; `thread/loaded/list` exposes distinct loaded thread ids; `turn/start`
  can target a specific thread id.
- Open product issue at spike time: `thread/loaded/list` returns thread ids
  only; `aiox` still needs a stable UX/metadata strategy to map human agent
  names/tags to the correct loaded Codex thread.

### Current Owners After Absorption

- Claude channel injection/trust/registration WHY:
  `docs/decisions/claude-channel-trust-and-registration.md`; channel identity:
  `docs/decisions/daemon-autostart-and-channel-identity.md`.
- Codex shared/per-agent app-server WHY:
  `docs/decisions/codex-per-agent-app-server.md`.
- As-built runtime structure (Claude channel + Codex app-server boundary,
  thread targeting): `docs/architecture/local-agent-runtime.md`.
- A2A protocol contract (directed routes, delivery lifecycle, capability tiers
  that absorbed the "trust/confirmation" open issue): `docs/specs/aiox-a2a.md`.

## 2. SQLite Restart Recovery Pre-Validation

Original source: legacy `prd/pre-validation/sqlite-restart-recovery-pre-validation.md`.
Date 2026-05-16. Scope: MVP durable broker pre-validation. Validation question:
not whether SQLite can store rows, but whether the broker model can survive a
daemon restart while preserving enough state to resume routing decisions without
pretending that live transports were restored.

### Result Summary (Preserved)

| Area | Result | Spike conclusion |
| --- | --- | --- |
| File-backed SQLite open/close/reopen | PASS | Use SQLite for MVP durable state |
| WAL mode | PASS | Enable WAL for daemon writer + CLI/status readers |
| Agent/route/message/event persistence | PASS | Keep these as first durable tables |
| Restart recovery state policy | PASS | Do not restore transports; mark agents disconnected |
| In-flight message transition | PASS | Requeue `delivering` messages to `queued` |
| Idempotency schema shape and rejection | PASS | Unique `messages.idempotency_key`, reject duplicates |
| Late reply schema shape | PASS | Link reply via `parent_message_id`, append `late_reply` event |
| Agent event link shape | PASS | Nullable `events.agent_id` for agent-scoped events |

### Validated Schema and Policy (Preserved Trace)

- Spike: `spikes/sqlite-restart-recovery-poc/` (`store.ts`, `store.test.ts`,
  `better-sqlite3.d.ts`, `README.md`).
- Durable entities: `agents`, `routes`, `messages`, `events`. `events` is
  append-only; `messages` is stateful and carries lifecycle status;
  `messages.idempotency_key` is unique; `messages.parent_message_id` links
  replies; `events.agent_id` / `events.message_id` attach events.
- Restart policy: a restarted daemon reopens durable state and marks previously
  connected agents `disconnected`; it does not recover live adapter transports.
- Validated message transition on restart:
  `queued -> queued`, `delivering -> queued`, `delivered -> delivered`,
  `completed -> completed`, `failed -> failed`. `delivering -> queued` lets the
  broker retry/re-evaluate delivery instead of silently dropping in-flight work.
- Late reply: a late reply can be recorded (child message with
  `parent_message_id` + `late_reply` event) without mutating the
  completed/failed parent. This validates representation only; product behavior
  for duplicate delivery, late reply routing, and notification stayed MVP/Post-MVP.
- "To add when promoting to MVP" (spike note): `agents.last_seen_at`,
  `messages.created_at`/`updated_at`, `events.created_at`.

### Verification (Preserved)

Commands run:

```bash
pnpm exec vitest run spikes/sqlite-restart-recovery-poc/store.test.ts
pnpm exec vitest run
pnpm typecheck
```

Result: PASS 5 SQLite spike tests; PASS 11 total Vitest tests; PASS TypeScript
typecheck. Notes: `better-sqlite3` native binding allowed via
`pnpm.onlyBuiltDependencies`; root Vitest config excludes `legacy/**`.

### Not Validated at Spike Time (Preserved)

Real daemon process supervision; real Codex/Claude adapter reconnection;
duplicate delivery handling beyond unique idempotency rejection; concurrent
multi-process read/write stress; versioned migrations; long-running workflow
resume semantics.

### Current Owners After Absorption

- A2A message lifecycle, delivery state, idempotency, late reply / reply
  correlation contract: `docs/specs/aiox-a2a.md` §4 and
  `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`.
- Durable store as-built structure and current gaps (including the `:memory:`
  gap surfaced against this spike's durable-store conclusion):
  `docs/architecture/local-agent-runtime.md` and `docs/specs/aiox-a2a.md`.

## 3. Disposition

- Both `prd/pre-validation/` files are delete candidates at the workspace reset
  physical deletion gate. The architecture direction and contract conclusions
  are owned by the documents listed above; this digest preserves the
  spike-specific setup, commands, measurements, and PASS/PARTIAL traces that
  are not carried at the same density by those owners.
- `history/` files may still mention these spike paths as part of their original
  provenance; those are not live owner references.
