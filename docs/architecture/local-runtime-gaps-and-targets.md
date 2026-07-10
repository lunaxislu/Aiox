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
- **Daemon structured logging / retained diagnostics surface** — The daemon entrypoint and socket transport do not
  own a retained structured log sink or daemon-level diagnostics surface. Adapter helper processes write JSONL events
  to stderr, but daemon lifecycle, socket dispatch, fatal process boundary, and cross-adapter failure context are not
  captured in a daemon-owned artifact that `doctor`/logs/status style tooling can inspect. This is a G3 daemon
  diagnosability gap; the concrete CLI/file surface is still a G3 design choice rather than an already committed
  command contract.
- **Local trust-boundary gaps** — The Claude channel-server HTTP `/send` endpoint accepts loopback POSTs without
  request authentication checks, and daemon pushes to that endpoint do not present channel credentials. Codex MCP launch
  passes the Codex agent token through app-server argv inline TOML instead of a safer secret-delivery channel. Claude channel
  message/reply ingress requests sent back to the daemon carry no per-message token, and the daemon receive path accepts
  them by agent name plus current stored state rather than request authorization. Runtime profile directories and daemon
  sockets are created/listened without explicitly fixing directory or socket permissions. Token checks use ordinary
  string inequality rather than constant-time comparison. Claude attach rollback also leaves `claudePendingTokens`
  uncleared; the Codex rollback path does clear its pending token state, so this cleanup gap is Claude-specific.
- **Experimental WebSocket Transport** — Codex active-thread synchronization uses the Codex app-server WebSocket path.
  The unsupported/experimental upstream status is a recorded current gap, not a fact inferable from local code alone.
- **Codex queued delivery retry/drain** — when `codex_no_loaded_thread` keeps a delivery queued, no later rebind/poll
  path re-tries it.
- **Codex MCP queued-message pull/read/ack** — the Codex MCP server exposes send/reply tools, but no surface to inspect,
  read, acknowledge, or drain stale queued deliveries from the Codex side.
- **A2A send-boundary / inbound reply resumption** — current adapter success is treated as immediate delivery
  completion, and the runtime has no completed G1 path that exposes a source-visible pending reply obligation and
  resumes the source turn from a correlated inbound reply without source-side sleep/poll behavior. This is the
  architecture side of the §4.3 send-boundary contract in [[docs/specs/aiox-message-lifecycle]].
- **`claude_channel_disconnected` event** — Codex has a disconnect event type and daemon emission, while the Claude
  channel side has no equivalent event type or emission.
- **Claude channel boot-failure diagnosability** — a Claude agent attach returns success with a channel token before
  the channel-server is confirmed listening, so a channel-boot fatal (for example `claude_channel_port_in_use` when an
  explicit `AIOX_CLAUDE_CHANNEL_PORT` collides) is written only to the channel-server subprocess stderr and is not
  surfaced in the attach response or daemon state. It re-appears later at inject time as the generic deferred
  `target_runtime_unavailable`, which does not carry the original boot-fatal reason. This is an S5/G3 diagnosability
  gap for the Claude channel specifically, not a general child-process boot contract. See
  [[docs/architecture/local-runtime-claude-adapter]] §6.2 Launch Flow.
- **Daemon socket method dispatch hardening** — the socket transport accepts any string `method`, looks it up through
  the daemon API object's prototype chain, and calls it when the result is a function. Unknown or inherited method
  names should be rejected by an own-property/known-method guard before dispatch.

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
- Daemon structured logging / retained diagnostics surface gap
  - [[src/daemon/run.ts]]
    - `src/daemon/run.ts:24-84`
  - [[src/daemon/socket-transport.ts]]
    - `src/daemon/socket-transport.ts:48-84`
  - [[src/adapters/claude/channel-server.ts]]
    - `src/adapters/claude/channel-server.ts:615-617`
  - [[src/adapters/codex/mcp-server.ts]]
    - `src/adapters/codex/mcp-server.ts:478-480`
- Local trust-boundary gaps
  - [[src/adapters/claude/channel-server.ts]]
    - `src/adapters/claude/channel-server.ts:77-88`
    - `src/adapters/claude/channel-server.ts:320-324`
    - `src/adapters/claude/channel-server.ts:365-369`
    - `src/adapters/claude/channel-server.ts:432-463`
  - [[src/adapters/claude/injector.ts]]
    - `src/adapters/claude/injector.ts:43-48`
  - [[src/adapters/codex/launcher.ts]]
    - `src/adapters/codex/launcher.ts:96-103`
    - `src/adapters/codex/launcher.ts:115-119`
  - [[tests/unit/adapters/codex-launcher.test.ts]]
    - `tests/unit/adapters/codex-launcher.test.ts:161-169`
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:74-88`
    - `src/daemon/state.ts:974-1005`
    - `src/daemon/state.ts:1008-1035`
    - `src/daemon/state.ts:1761-1783`
    - `src/daemon/state.ts:928`
    - `src/daemon/state.ts:1046`
    - `src/daemon/state.ts:1748`
    - `src/daemon/state.ts:610-617`
    - `src/daemon/state.ts:832-849`
  - [[src/config/paths.ts]]
    - `src/config/paths.ts:100-102`
  - [[src/daemon/socket-transport.ts]]
    - `src/daemon/socket-transport.ts:434-440`
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
- A2A send-boundary / inbound reply resumption gap
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:1279-1288`
  - [[src/adapters/router.ts]]
    - `src/adapters/router.ts:110-112`
    - `src/adapters/router.ts:125-131`
- Channel disconnect event gap
  - [[src/core/events.ts]]
    - `src/core/events.ts:1-27`
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:1076-1090`
- Claude channel boot-failure diagnosability gap
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:610-617`
    - `src/daemon/state.ts:1346-1352`
  - [[src/adapters/claude/channel-server.ts]]
    - `src/adapters/claude/channel-server.ts:566-598`
    - `src/adapters/claude/channel-server.ts:667-690`
  - [[docs/architecture/local-runtime-claude-adapter]]
    - `docs/architecture/local-runtime-claude-adapter.md:56-107`
- Daemon socket method dispatch hardening gap
  - [[src/daemon/socket-transport.ts]]
    - `src/daemon/socket-transport.ts:183-194`
    - `src/daemon/socket-transport.ts:245-253`
  - [[src/daemon/api.ts]]
    - `src/daemon/api.ts:299-300`
  - [[src/daemon/run.ts]]
    - `src/daemon/run.ts:66-73`

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
