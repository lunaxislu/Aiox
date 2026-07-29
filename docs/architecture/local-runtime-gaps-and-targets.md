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
  state in production. G3 owns wiring observable Codex and Claude runtime failures/disconnects into daemon diagnostics;
  this current-gap pointer does not prescribe delivery-state policy, a Claude disconnect event, or a generic capability/event model.
- **Stale Agent Transition Policy** — The `stale` agent state is defined, but current daemon code has no active
  transition path that marks agents stale. Phase 1 owns the future stale/disconnected operation policy; this current-gap
  claim does not select a signal, threshold, automatic action, or delivery disposition.
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
- **Codex durable queued delivery recovery/drain** — current process-lifetime
  queues flush on attach, resume/rebind, or proxy binding, and conclusively
  pre-write failures use bounded retry. They do not provide durable restart
  replay/mailbox, passive acknowledgement, remote cancellation, or
  heartbeat/time-based stale handling.
- **Codex MCP queued-message pull/read/ack** — the Codex MCP server exposes send/reply tools, but no surface to inspect,
  read, acknowledge, or drain stale queued deliveries from the Codex side.
- **Tier 3 receipt/completion and source resumption** — the runtime now persists and atomically consumes a
  delivery-scoped one-reply right, distinguishes daemon acceptance from target acceptance, and renders outbound
  reply correlation. It still has no target receipt/work-completion producer, automatic reinjection, or native
  source-turn resumption; these remain separate from the daemon's accepted reply result. This is the current-gap
  side of [[docs/specs/aiox-message-lifecycle]] §4.3.
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
    - `defaultAttachCodexRuntime`
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
    - `createDaemonState` token/runtime maps and `attachAgent`
    - `retransmitUnconfirmedDelivery`
    - `dispatchToPairPeers` and `injectMessageIntoClaudeTarget`
    - `registerClaudeChannel`, `registerCodexChannel`, and `authorizeCodexIngress`
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
    - `schedulePreWriteRetry` and `flushQueuedDeliveriesForTarget`
- Codex queued-message pull/read/ack surface gap
  - [[src/adapters/codex/mcp-server.ts]]
    - `src/adapters/codex/mcp-server.ts:184-220`
    - `src/adapters/codex/mcp-server.ts:223-267`
    - `src/adapters/codex/mcp-server.ts:287-334`
- Tier 3 receipt/completion and source-resumption gap
  - [[src/daemon/state.ts]]
    - `receiveCodexMessage`, `receiveCodexReply`, and `dispatchToPairPeers`
  - [[src/adapters/router.ts]]
    - `src/adapters/router.ts:110-112`
    - `src/adapters/router.ts:125-131`
- Channel disconnect event gap
  - [[src/core/events.ts]]
    - `src/core/events.ts:1-27`
  - [[src/daemon/state.ts]]
    - `disconnectCodexChannel`
- Claude channel boot-failure diagnosability gap
  - [[src/daemon/state.ts]]
    - `attachAgent` and `injectMessageIntoClaudeTarget`
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

- Codex queued delivery retry/drain provenance: `logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md` §2.3.
- Codex WebSocket upstream-support provenance: `logs/workspace-reset/packages/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md` W7 C/D
  entries and [[docs/architecture/local-runtime-codex-adapter]] §7.2.

### Target / Proposed / Deferred (Post-MVP Checklist) [Status: Target]

- **Durable Persistence & Durable Queue** — Transitioning from in-memory SQLite to actual durable files on disk with restart recovery.
- **Adapter Registry** — Abstracting daemon dispatch logic via `AdapterRouter` (currently only tested in `fake-integration.test.ts` but deferred in production).
- **Phase 1 Tier 2 reliability target** — authenticated automatic target ack/completed evidence and any
  adapter-specific duplicate suppression required for automatic post-write behavior. Canonical envelope, common
  delivery-creation idempotency, typed replies, and Tier 3 source-result classification are current as-built;
  durable replay, remote federation, and session-expiry limits retain their deferred owners.
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
    - `dispatchToPairPeers`, `dispatchToPairPeersNow`, and queue helpers
- Declared-only events remain declaration-only outside tests unless listed as emitted in the events catalog.
  - [[src/core/events.ts]]
    - `src/core/events.ts:1-27`
  - [[docs/architecture/local-runtime-errors-events-smoke]]
    - `docs/architecture/local-runtime-errors-events-smoke.md:125-128`
