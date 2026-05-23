# Step 14 — Daemon/Client Split + Manual E2E Smoke Infrastructure

## Status

- Date: 2026-05-23
- Phase: Step 14 implementation — completed.
- Authority: `plan/mvp-implementation-checklist.md` Step 14,
  `prd/mvp/aiox-mvp-spec.md` daemon command semantics and Testing Requirements.

## Problem

Separate terminal invocations of `aiox` created isolated in-process daemon state
instead of sharing one long-running socket-backed daemon. The root cause was two
compounding issues:

1. `createDefaultSocketPath()` called `mkdtempSync()` each invocation, so each
   CLI process used a different socket path.
2. `createSocketRuntime()` started its own in-process daemon server even when the
   intent was to connect to an existing one.

## Auto-Start Policy Decision

Source of authority: `prd/mvp/aiox-mvp-spec.md` "Agent Attach" section.

| Command | Policy | Rationale |
|---|---|---|
| `aiox codex`, `aiox claude` | auto-start daemon if absent | PRD explicit: "Auto-start daemon if needed" |
| `aiox pair`, `aiox connect`, `aiox disconnect`, `aiox status` | connect-only, error if no daemon | manual E2E smoke starts daemon explicitly first |
| `aiox daemon start` | explicit daemon fork | PRD daemon command |
| `aiox daemon status` | read-only, never starts daemon | PRD daemon status spec |
| `aiox stop`, `aiox daemon stop` | no-op if no daemon | graceful |

## Implementation

### Structure commit (`cf17e68`)

- `src/config/paths.ts`: `getDefaultSocketPath()` → `~/.aiox/daemon.sock`
  (or `AIOX_SOCKET_PATH` env override). All invocations sharing this env
  variable or the same home directory target the same daemon namespace.
- `src/daemon/socket-transport.ts`: exported `canConnect(socketPath)` so the
  client runtime can probe whether a daemon is reachable without creating one.

### Behavior commit (`1172a74`)

**`createClientRuntime` (`src/bin/aiox.ts`)**

Pure socket-client runtime. No in-process server creation.

- `getDaemonApi()`: `canConnect` → connect or throw "daemon is not running".
- `startDaemon()`: `canConnect` → no-op; else fork `aiox _run-daemon` as a
  detached child process and wait for the socket to become reachable (up to
  10 s, polling every 50 ms).
- `stopDaemon()`: sends `stop` RPC, then waits for socket to become
  unreachable (up to 5 s). Does not need the daemon PID because the daemon
  auto-closes after responding to stop (see below).
- `daemonStatus()`: `canConnect` check → returns `{ running: false }` without
  any side effect when no daemon is present.
- `restartDaemon()`: `stopDaemon` → `startDaemon`.
- `daemonSocketPath()`: returns the resolved socket path (same value used by
  all RPC calls) — preserves Step 13 Codex MCP ingress contract.

**`runDaemonProcess` (`src/daemon/run.ts`)**

Long-running daemon entry point:

1. Opens an in-memory SQLite DB and applies schema.
2. Creates `DaemonServer` and starts it.
3. Wraps the `stop()` API method: after returning the stop response to the
   client, schedules `socketServer.close()` + DB close + `process.exit(0)` via
   `setImmediate`. This means the client only needs to wait for the socket to
   disappear — no PID tracking or SIGTERM sending required.
4. Creates `DaemonSocketServer` on the given socket path.
5. Registers SIGTERM/SIGINT handlers as a fallback for external termination.
6. Returns (the active `net.Server` keeps the event loop alive).

**`_run-daemon` hidden CLI command (`src/cli/parse.ts` + `src/cli/invocation.ts`)**

`aiox _run-daemon --socket <path>` (hidden, not shown in help):

- Parser: new `ParsedCommand` variant `{ kind: "_run-daemon"; socketPath: string }`.
- Invocation: calls `runDaemonProcess(command.socketPath)` (injectable via
  `InvocationOptions.runDaemonProcessFn` for testing).
- `aiox daemon start` → `createClientRuntime.startDaemon()` → forks
  `aiox _run-daemon --socket <stable-path>` as a detached child → unref → waits
  for socket.

**Agent-attach auto-start (`src/cli/invocation.ts`)**

`case "agent-attach"` now calls `await options.runtime.startDaemon()` before
`getDaemonApi()`. Since `startDaemon()` is idempotent (no-op if already running),
this is safe for all callers including tests.

## Tests Added

`tests/integration/daemon-client-split.test.ts` — 9 new tests:

1. `daemonStatus returns { running: false } without creating a socket when no daemon exists`
2. `getDaemonApi throws a typed error when no daemon is running`
3. `getDaemonApi connects to an existing socket-backed daemon and returns a working client`
4. `daemonStatus returns { running: true } when a daemon socket is reachable`
5. `two separate createClientRuntime instances share pair state through the same socket`
6. `agent attached via one client runtime is visible to a second client runtime`
7. `stopDaemon shuts down the daemon and makes the socket unreachable`
8. `daemonSocketPath returns the socket path used by getDaemonApi (Step 13 regression)`
9. `two createClientRuntime instances with no explicit socketPath use the same default path`

Tests 1–9 use an in-process socket server (no real `child_process.fork`) to verify
the socket client/server sharing semantics. The daemon-fork path is verified by
manual E2E smoke (see below).

`tests/unit/cli/invocation.test.ts` — updated expected call sequences to include
`["startDaemon"]` before each `agent-attach` call.

## Verification

```
pnpm test       # 318 passing (45 files; +9 from Step 14 integration tests, +2 review fixes)
pnpm typecheck  # PASS
pnpm build      # PASS
```

## Manual E2E Smoke Flow

Prerequisites: `pnpm build` (binary at `dist/src/bin/aiox.js`; package bin `aiox`
points to the same file).

```sh
# Terminal 1
node dist/src/bin/aiox.js daemon start
node dist/src/bin/aiox.js daemon status    # shows running: true, same pid
node dist/src/bin/aiox.js pair --name p1
node dist/src/bin/aiox.js status           # shows p1 pair

# Terminal 2 (separate shell, same user)
node dist/src/bin/aiox.js status           # sees p1 pair from Terminal 1
node dist/src/bin/aiox.js codex --name impl --pair p1   # auto-starts if daemon down, else attaches
node dist/src/bin/aiox.js status           # sees impl agent connected

# Terminal 3
node dist/src/bin/aiox.js claude --name reviewer --pair p1
node dist/src/bin/aiox.js status           # sees bidirectional routes impl↔reviewer

# Cleanup
node dist/src/bin/aiox.js daemon stop
node dist/src/bin/aiox.js daemon status    # running: false
```

## Review Fixes (2026-05-23)

Codex review found three Step 14 gaps and this follow-up addressed them:

- `aiox claude` now launches the Claude foreground CLI after daemon attach when
  the daemon returns a `claudeChannelToken`, passing channel name, agent token,
  and daemon socket path to the launcher.
- `aiox daemon start` now prints daemon status output after the idempotent start
  operation, including the already-running daemon case.
- The manual smoke command path now matches `pnpm build` output.

## Commits

- `cf17e68` structure: extract stable socket path + export canConnect
- `1172a74` behavior: daemon/client split — createClientRuntime + _run-daemon entry point

## Out of Scope (preserved)

- CI automation for real Codex/Claude authenticated sessions.
- GUI terminal split automation.
- Post-MVP `logs`, `inspect`, `rm`, `kill`, compose.
- Persistent SQLite path (`:memory:` per Step 14 checklist; explicit approval needed).
