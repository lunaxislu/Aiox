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
- **Historical/rolling diagnostics beyond the G3 minimum** — The accepted fatal artifact and current status snapshot
  are owned by [[docs/architecture/local-runtime-daemon-transport-api]]. The remaining gap is a retained rolling
  structured-log sink or historical cross-adapter failure timeline. That broader operational history is post-release
  diagnostics work, not a missing part of the accepted G3 fatal/status boundary.
- **Local trust-boundary gaps** — The Claude channel-server HTTP `/send` endpoint accepts loopback POSTs without
  request authentication checks, and daemon pushes to that endpoint do not present channel credentials. Claude channel
  message/reply ingress requests sent back to the daemon carry no per-message token, and the daemon receive path accepts
  them by agent name plus current stored state rather than request authorization. Token checks use ordinary
  string inequality rather than constant-time comparison. Claude attach rollback, explicit detach/TUI-exit, and daemon
  stop now clear `claudePendingTokens` and `claudeChannelRuntimes` for the affected agent name, matching the Codex
  rollback/detach path's existing pending-token and channel-runtime cleanup; a message/reply dispatch to a
  since-rolled-back/detached/stopped Claude agent defers instead of using its stale registered runtime, and its old
  pending token can no longer register a new channel.
  Codex MCP launch no longer passes the raw agent token through app-server argv/inline TOML: the token is delivered
  only through the app-server child's own process environment, and the inline config whitelists just the env var
  *names* via `env_vars` for Codex to forward. The default (non-override) runtime profile directory and the daemon
  Unix domain socket file are now created/corrected to owner-only POSIX permissions (`0700`/`0600`); this covers only
  the resolver-owned profile directory, not a caller-supplied `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` override directory,
  which this resolver has never created and does not own.

  Evidence:

  - Codex argv-safe secret delivery
    - [[src/adapters/codex/launcher.ts]]
      - `src/adapters/codex/launcher.ts:89-136`
    - [[tests/unit/adapters/codex-launcher.test.ts]]
      - `tests/unit/adapters/codex-launcher.test.ts:133-190`
  - Runtime directory/socket owner-only permissions
    - [[src/config/paths.ts]]
      - `src/config/paths.ts:91-120`
    - [[src/daemon/socket-transport.ts]]
      - `src/daemon/socket-transport.ts:87-90`
    - [[tests/unit/config/paths.test.ts]]
      - `tests/unit/config/paths.test.ts:127-162`
    - [[tests/unit/daemon/socket-transport.test.ts]]
      - `tests/unit/daemon/socket-transport.test.ts:102-121`
  - Claude attach rollback/detach/stop credential cleanup
    - [[src/daemon/state.ts]]
      - `src/daemon/state.ts:1049-1085` (`rollbackAgentAttach`)
      - `src/daemon/state.ts:2887-2941` (`detachCodexAgent`, shared by `detachAgent`/`notifyTuiExited`)
      - `src/daemon/state.ts:1402-1417` (`stop`)
    - [[tests/unit/adapters/claude-channel.test.ts]]
      - `tests/unit/adapters/claude-channel.test.ts:378-691`
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

Evidence:

- Daemon database durability and recovery gap
  - [[src/daemon/run.ts]]
    - `src/daemon/run.ts:24-34`
  - [[src/store/sqlite.ts]]
    - `src/store/sqlite.ts:5-11`
  - [[src/store/repositories/deliveries.ts]]
    - `src/store/repositories/deliveries.ts:148-158`
- Historical/rolling diagnostics beyond the G3 minimum
  - [[src/daemon/run.ts]]
    - `src/daemon/run.ts:27-122`
  - [[src/adapters/claude/channel-server.ts]]
    - `src/adapters/claude/channel-server.ts:741-742`
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
- **Declared-only Events** — Activating `agent_registered`, `agent_reconnected`, `pair_created`, `pair_ready`, `route_connected`, `codex_binding_uncertain_observed`, and `late_reply` events.

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
