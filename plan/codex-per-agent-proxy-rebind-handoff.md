# Codex Per-Agent Proxy Rebind Handoff

Status: Implemented and manually smoke-verified
Owner: Claude implementation, Codex review/documentation follow-up
Date: 2026-05-26

## Authority Entry Points

- `history/41-codex-loaded-thread-binding-analysis.history.md`
- `prd/mvp/aiox-mvp-spec.md`
- `docs/aiox/per-agent-transparent-proxy-decision.md`

## Decision

Implement per-agent 1:1 transparent proxy in front of the existing per-agent
1:1 Codex app-server.

Do not switch to a shared 1:N app-server. Do not build one shared proxy upstream
for multiple Codex agents as part of this fix.

Runtime shape:

```text
Codex TUI alpha -> proxy alpha -> app-server alpha
Codex TUI beta  -> proxy beta  -> app-server beta
```

## Problem

`thread/loaded/list.at(-1)` is not an active TUI authority. Internal Codex TUI
`/resume` can focus an older loaded thread while the latest loaded thread remains
different, causing successful `turn/start` delivery to the wrong, non-visible
thread.

## Required Behavior

The proxy observes only same-client JSON-RPC request/response pairs for:

- `thread/start`
- `thread/resume`
- `thread/fork`

On a matching success response with `result.thread.id`, daemon state must rebind
that Codex agent's `activeThreadId` to the response thread id.

For `thread/fork`, bind to response `result.thread.id`, not request
`params.threadId`.

## TDD Starting Points

1. Add/extend proxy tests for binding events:
   - `thread/start`
   - `thread/resume`
   - `thread/fork`
   - error response does not bind
   - missing `result.thread.id` does not bind
2. Add daemon state tests:
   - binding event updates active Codex thread for the correct agent
   - later binding event on same agent supersedes earlier binding
   - delivery target prefers response-based active binding over loaded-list order
3. Wire runtime:
   - launch app-server with `:0`
   - start per-agent proxy to upstream app-server endpoint
   - launch TUI with proxy endpoint
   - keep daemon injection pointed at the app-server endpoint or an explicit
     internal client path; proxy is for TUI observation, not required for daemon
     injection unless the implementation chooses one unified endpoint

## Constraints

- Proxy must be transparent. Relay frames unchanged.
- Production logging must emit summarized binding events, not raw frames.
- Preserve app-server process isolation per Codex agent.
- Keep `thread/loaded/list` only as diagnostics/cache context.
- Follow `.ai/tdd.md`: red, green, refactor; do not mix structural and behavior
  changes in one commit.

## Implementation Result

Claude implemented the per-agent proxy rebind path.

New files:

- `src/adapters/codex/proxy.ts`
- `tests/unit/adapters/codex-proxy.test.ts`
- `tests/unit/daemon/state-codex-proxy-rebind.test.ts`

Updated files:

- `src/adapters/codex/runtime.ts`
- `src/daemon/state.ts`
- `tests/unit/adapters/codex-runtime.test.ts`
- `tests/unit/daemon/api.test.ts`
- `tests/unit/daemon/codex-ingress.test.ts`

Behavior now covered by tests:

- proxy emits binding events for `thread/start`, `thread/resume`, and
  `thread/fork` success responses.
- error responses and missing `result.thread.id` do not bind.
- runtime owns proxy lifecycle and exposes the proxy endpoint to TUI launch.
- daemon subscribes to proxy binding events and records
  `agent_thread_id_rebound` with `source: "proxy_binding"`.
- Codex reply target selection prefers runtime `activeThreadId` with
  `selectionPolicy: "proxy_active_thread"` and keeps loaded-list selection as
  `latest_loaded_thread_fallback`.

Verification reported by Claude:

- `pnpm test`: 48 files / 357 tests passed.
- `pnpm typecheck`: clean.
- `pnpm build`: clean.

Codex follow-up verification:

- `pnpm test tests/unit/adapters/codex-proxy.test.ts tests/unit/daemon/state-codex-proxy-rebind.test.ts tests/unit/adapters/codex-runtime.test.ts tests/unit/daemon/codex-ingress.test.ts`
  passed: 4 files / 66 tests.

Manual smoke:

- User ran build-output smoke with `node dist/src/bin/aiox.js`.
- Passed scenarios: basic `claude -> codex -> claude`, `/clear`, `/new`,
  `/fork`, `/resume`, `/resume -> /clear`, `/resume -> /new`,
  `/resume -> /fork`.

Remaining:

- Optional follow-up: lazy parse optimization. Current production proxy is
  transparent and does not raw-log frames, but it parses JSON frames broadly
  rather than using the cost-model prefilter.
