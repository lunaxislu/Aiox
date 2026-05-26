# MVP Implementation Closeout

## Status

- Date: 2026-05-26
- Scope: close MVP implementation tracking after automated verification and
  implementation smoke with real Claude and Codex terminals.
- Authority context:
  - `prd/mvp/aiox-mvp-spec.md`
  - `plan/mvp-implementation-checklist.md`
  - `history/40-step-14-daemon-client-split.history.md`
  - `history/41-codex-loaded-thread-binding-analysis.history.md`

## Decision

MVP implementation is closed for new feature work. The implementation smoke with
real local Claude and Codex sessions has already passed, and automated
verification has passed. User-led QA can now evaluate the MVP from a
product/usage perspective.

This closeout does not claim Post-MVP work is finished. It only closes the MVP
implementation scope defined by the current PRD and checklist.

## What Is Implemented

- Daemon/client split with a user-local daemon socket.
- Agent attach and reconnect for Codex and Claude.
- Directed routes and pair reservation.
- Claude channel source/reply path through the daemon.
- Codex MCP source/reply path through the daemon.
- Daemon -> Codex injection through the daemon-owned Codex app-server.
- Per-agent Codex app-server plus per-agent transparent proxy.
- Codex active-thread binding from same-connection `thread/start`,
  `thread/resume`, and `thread/fork` responses observed by the proxy.
- Lazy proxy JSON observation: non-binding client frames and upstream frames with
  no pending binding are not parsed, while relay and binding semantics remain
  unchanged.

## Checklist Cleanup

The execution checklist had stale Step 10 placeholders after later Step 14
follow-ups changed the final runtime topology.

Updated checklist state:

- Step 10 is now marked closed.
- `src/adapters/codex/launcher.ts` is marked complete, using the proxy endpoint
  rather than the original app-server endpoint wording.
- `CodexAgentRuntime` state shape is marked complete: SQLite stores durable
  agent identity and adapter session cache/resume metadata; app-server/proxy
  handles and active-thread binding are live runtime state.
- Open Product Issue #2 is marked resolved for MVP by the per-agent app-server +
  per-agent proxy decision.
- Stale transition, long-running delivery timeout, and AI session expiry policy
  remain Post-MVP.

## Implementation Smoke Result

The implementation smoke path uses build output:

```bash
node dist/src/bin/aiox.js daemon start
node dist/src/bin/aiox.js codex --name codex-smoke
node dist/src/bin/aiox.js claude --name claude-smoke
node dist/src/bin/aiox.js connect claude-smoke codex-smoke
node dist/src/bin/aiox.js connect codex-smoke claude-smoke
node dist/src/bin/aiox.js status
```

Use build output because `daemon start` forks a detached child. Running
`pnpm tsx src/bin/aiox.ts daemon start` makes the child process execute the
TypeScript entrypoint with plain `node`, which does not work for the daemon
child.

User-reported implementation smoke matrix:

| Scenario | Expected result |
| --- | --- |
| Basic `claude -> codex -> claude` | message and reply are visible in both agents |
| Codex TUI `/clear` | next Claude -> Codex delivery appears in the visible thread |
| Codex TUI `/new` | next Claude -> Codex delivery appears in the visible thread |
| Codex TUI `/fork` | next Claude -> Codex delivery appears in the visible fork target |
| Codex TUI `/resume` | next Claude -> Codex delivery appears in the resumed visible thread |
| Codex TUI `/resume -> /clear` | next Claude -> Codex delivery appears in the cleared visible thread |
| Codex TUI `/resume -> /new` | next Claude -> Codex delivery appears in the new visible thread |
| Codex TUI `/resume -> /fork` | next Claude -> Codex delivery appears in the forked visible thread |

## Post-MVP Items

These are intentionally not MVP blockers:

- Codex queued delivery retry/drain.
- Codex MCP queued-message pull/read/ack.
- Real authenticated Codex/Claude CI automation.
- GUI terminal split automation.
- `logs`, `inspect`, `rm`, `kill`, compose, and richer lifecycle controls.
- Stale-agent policy, long-running timeout policy, and AI session expiry policy.

## Verification

Closeout verification passed on 2026-05-26:

- `pnpm test` — 48 files / 360 tests passed.
- `pnpm typecheck` — passed.
- `pnpm build` — passed.

The checklist verification baseline was updated with these closeout counts.
