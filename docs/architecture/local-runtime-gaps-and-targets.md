# aiox Local Runtime — Known Gaps / Post-MVP (§13)

> 컨텍스트: [[local-agent-runtime]] 인덱스. status 어휘·module overview·authority links는 인덱스가 소유한다.
>
> 이 slice는 `Current gap`(as-built 한계)과 `Target`/`Proposed`/`Deferred`(Post-MVP)를
> 분리해 둔다. as-built module slice들은 current-focused로 유지하기 위해 future 항목은 여기 모은다.

## 13. Known Gaps / Post-MVP

The system architecture distinguishes between current, as-built gaps in the local agent runtime implementation and proposed future targets/deferred items:

### Current Gaps (As-built limitations)
- **Daemon Database Durability & Recovery** — The daemon process runs on an in-memory SQLite database (`new Database(":memory:")` inside [[src/daemon/run.ts]] — `src/daemon/run.ts:25`). The durability helper `openSqliteDatabase` (`src/store/sqlite.ts:5`) and recovery logic `recoverAfterRestart` (`src/store/repositories/deliveries.ts:148`) are implemented but have zero active callers.
- **Runtime Failure Wiring** — The daemon state initialization does not register a failure listener on the Codex runtime. `defaultAttachCodexRuntime` (`src/daemon/state.ts:2024`) omits passing the `onRuntimeFailed` callback to `attachCodexAgentRuntime`, leaving runtime process failures unwired in production (P2-3).
- **Stale Agent Transition Policy** — The `stale` state is defined in `AgentInstanceStatus` (`src/core/agents.ts:9`), but the daemon has no active logic to transition agents to this status.
- **Unauthenticated Channel Ingress** — The Claude channel-server HTTP `/send` endpoint operates without authentication checks (P1-1).
- **Experimental Websocket Transport** — Codex active-thread synchronization uses an experimental Websocket transport unsupported upstream (P2-12).
- **Codex queued delivery retry/drain** — when `codex_no_loaded_thread` keeps a delivery queued, no later rebind/poll re-tries it (Step 14 provenance: `logs/2026-06-19-mvp-history-archive.md` §2.3).
- **Codex MCP queued-message pull/read/ack** — no surface to inspect or acknowledge stale queued deliveries from the Codex side.
- **`claude_channel_disconnected` event** — Claude side has no equivalent to Codex's `codex_channel_disconnected`.

### Target / Proposed / Deferred (Post-MVP Checklist)
- **Durable Persistence & Durable Queue** — Transitioning from in-memory SQLite to actual durable files on disk with restart recovery.
- **Adapter Registry** — Abstracting daemon dispatch logic via `AdapterRouter` (currently only tested in `fake-integration.test.ts` but deferred in production).
- **Reliability Features** — Canonical envelope wrapping, ack/retry policies, remote federation, and session expiry limits.
- **TUI Protocol Drift** — Future updates to Codex protocol schemas crossing transparent proxy layers will require active maintenance of binding parsers.
- **Declared-only Events** — Activating `agent_registered`, `agent_reconnected`, `agent_disconnected`, `pair_created`, `pair_ready`, `route_connected`, `route_disconnected`, `codex_binding_uncertain_observed`, and `late_reply` events.
