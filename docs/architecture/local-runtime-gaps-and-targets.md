# aiox Local Runtime — Known Gaps / Post-MVP (§13)

Related: [[docs/architecture/local-agent-runtime]]

This mixed-state slice separates `Current gap` claims from `Target`/`Proposed`/`Deferred`
Post-MVP items. The split keeps as-built module slices current-focused while this slice owns the consolidated gap and
future-work view. The index owns status vocabulary, module overview, and authority links.

## 13. Known Gaps / Post-MVP

The system architecture distinguishes between current, as-built gaps in the local agent runtime implementation and proposed future targets/deferred items:

### Current Gaps (As-built limitations) [Status: Current gap]

- **Daemon Database Durability & Recovery** — The production daemon still opens an in-memory SQLite database. The
  durable database helper and restart-recovery repository method exist, but current production startup does not call
  them.
- **Runtime Failure Wiring** — The production Codex runtime attach path does not pass the runtime failure callback into
  `attachCodexAgentRuntime`, so post-attach app-server or WebSocket runtime failures are not wired back through daemon
  state in production.
- **Stale Agent Transition Policy** — The `stale` agent state is defined, but current daemon code has no active
  transition path that marks agents stale.
- **Unauthenticated Channel Ingress** — The Claude channel-server HTTP `/send` endpoint accepts loopback POSTs without
  request authentication checks (P1-1).
- **Experimental WebSocket Transport** — Codex active-thread synchronization uses the Codex app-server WebSocket path.
  The unsupported/experimental upstream status is a recorded current gap, not a fact inferable from local code alone.
- **Codex queued delivery retry/drain** — when `codex_no_loaded_thread` keeps a delivery queued, no later rebind/poll
  path re-tries it.
- **Codex MCP queued-message pull/read/ack** — the Codex MCP server exposes send/reply tools, but no surface to inspect,
  read, acknowledge, or drain stale queued deliveries from the Codex side.
- **`claude_channel_disconnected` event** — Codex has a disconnect event type and daemon emission, while the Claude
  channel side has no equivalent event type or emission.

Evidence:

- Daemon database durability and recovery gap
  - [[src/daemon/run.ts]]
    - `src/daemon/run.ts:24-34`
  - [[src/store/sqlite.ts]]
    - `src/store/sqlite.ts:5-11`
  - [[src/store/repositories/deliveries.ts]]
    - `src/store/repositories/deliveries.ts:148-158`
- Runtime failure wiring gap
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:2024-2041`
  - [[src/adapters/codex/runtime.ts]]
    - `src/adapters/codex/runtime.ts:54-61`
    - `src/adapters/codex/runtime.ts:87-107`
    - `src/adapters/codex/runtime.ts:355-362`
- Stale agent transition gap
  - [[src/core/agents.ts]]
    - `src/core/agents.ts:5-12`
- Claude channel ingress auth gap
  - [[src/adapters/claude/channel-server.ts]]
    - `src/adapters/claude/channel-server.ts:77-88`
    - `src/adapters/claude/channel-server.ts:432-463`
  - [[docs/specs/aiox-adapter-model]]
    - `docs/specs/aiox-adapter-model.md:97-101`
- Codex WebSocket transport gap
  - [[src/adapters/codex/runtime.ts]]
    - `src/adapters/codex/runtime.ts:25-30`
    - `src/adapters/codex/runtime.ts:328-343`
  - [[src/adapters/codex/websocket.ts]]
    - `src/adapters/codex/websocket.ts:288-347`
  - [[docs/architecture/local-runtime-codex-adapter]]
    - `docs/architecture/local-runtime-codex-adapter.md:63-67`
- Codex queued delivery retry/drain gap
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:1417-1450`
- Codex queued-message pull/read/ack surface gap
  - [[src/adapters/codex/mcp-server.ts]]
    - `src/adapters/codex/mcp-server.ts:184-220`
    - `src/adapters/codex/mcp-server.ts:223-267`
    - `src/adapters/codex/mcp-server.ts:287-334`
- Channel disconnect event gap
  - [[src/core/events.ts]]
    - `src/core/events.ts:1-27`
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:1076-1090`

Sources:

- Codex queued delivery retry/drain provenance: `logs/2026-06-19-mvp-history-archive.md` §2.3.
- Codex WebSocket upstream-support provenance: `logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md` W7 C/D
  entries and [[docs/architecture/local-runtime-codex-adapter]] §7.2.

### Target / Proposed / Deferred (Post-MVP Checklist) [Status: Target]

- **Durable Persistence & Durable Queue** — Transitioning from in-memory SQLite to actual durable files on disk with restart recovery.
- **Adapter Registry** — Abstracting daemon dispatch logic via `AdapterRouter` (currently only tested in `fake-integration.test.ts` but deferred in production).
- **Reliability Features** — Canonical envelope wrapping, ack/retry policies, remote federation, and session expiry limits.
- **TUI Protocol Drift** — Future updates to Codex protocol schemas crossing transparent proxy layers will require active maintenance of binding parsers.
- **Declared-only Events** — Activating `agent_registered`, `agent_reconnected`, `agent_disconnected`, `pair_created`, `pair_ready`, `route_connected`, `route_disconnected`, `codex_binding_uncertain_observed`, and `late_reply` events.

Evidence:

- Adapter registry target is not the production dispatch path today.
  - [[src/adapters/router.ts]]
    - `src/adapters/router.ts:47-123`
  - [[tests/unit/adapters/fake-integration.test.ts]]
    - `tests/unit/adapters/fake-integration.test.ts:456-485`
    - `tests/unit/adapters/fake-integration.test.ts:510-540`
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:1246-1568`
- Declared-only events remain declaration-only outside tests unless listed as emitted in the events catalog.
  - [[src/core/events.ts]]
    - `src/core/events.ts:1-27`
  - [[docs/architecture/local-runtime-errors-events-smoke]]
    - `docs/architecture/local-runtime-errors-events-smoke.md:125-128`
