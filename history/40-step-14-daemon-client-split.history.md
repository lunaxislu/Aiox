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
pnpm test       # 319 passing (46 files; +9 Step 14 integration tests, +2 review fixes, +1 daemon startup-failure regression)
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

### Claude channel name fix

#### Problem

The initial Claude foreground-launch fix still did not make the Step 14 manual
E2E smoke viable. `aiox claude --name reviewer --pair p1` could attach the
agent in the daemon and launch the foreground Claude CLI, but Claude could fail
to load the aiox channel server. Without that MCP child process, the channel
server never opened its HTTP ingress, never called `registerClaudeChannel`, and
the daemon had no live Claude endpoint to route messages to.

#### Cause

The launcher used a per-agent channel name such as
`server:aiox-claude-reviewer`. Claude Code treats the `server:<name>` value
as an exact lookup key in the repo `.mcp.json` `mcpServers` map, not as a
display-only channel label. Because `.mcp.json` is static project
configuration, it cannot contain every future agent-specific key. This made the
per-agent channel-name scheme incompatible with foreground Claude channel
registration.

Related prior facts:

- `history/2-claude-adapter.history.md` records that the currently working
  Claude Code local-channel form is
  `--dangerously-load-development-channels server:<name>` backed by a
  matching `.mcp.json` server entry.
- `history/35-step-11-phase-a-claude-channel-decisions.history.md` records the
  Step 11 launcher/channel-server split and token-based daemon registration.

#### Decision

Use one static MCP server key, `aiox-claude-ingress`, and pass the per-agent
identity through inherited environment variables:

- `.mcp.json` registers `mcpServers.aiox-claude-ingress` pointing at
  `dist/src/adapters/claude/channel-server.js`.
- `aiox claude` launches Claude with
  `--dangerously-load-development-channels server:aiox-claude-ingress`.
- `AIOX_CLAUDE_CHANNEL_AGENT_NAME`, `AIOX_CLAUDE_CHANNEL_TOKEN`, and
  `AIOX_SOCKET_PATH` identify the attached agent and daemon socket to the MCP
  child process.

Rejected alternative: dynamically rewrite `.mcp.json` for each agent-specific
channel key. That would introduce cleanup/race risk between concurrent
`aiox claude` sessions and would make a foreground terminal attach mutate
project configuration as a side effect. The static key plus environment
identity keeps configuration stable while preserving per-agent registration.

#### Expected verification

The targeted CLI invocation test should assert that Claude attach launches the
foreground Claude process with `channelName: "aiox-claude-ingress"` while still
passing the agent name, token, and daemon socket path as environment inputs to
the launcher. The Step 14 manual smoke should then use the same built CLI path,
`node dist/src/bin/aiox.js claude --name reviewer --pair p1`, and rely on the
static `.mcp.json` key for channel-server startup.

### Daemon startup failure propagation fix

#### Problem

The first long-running daemon fix made `runDaemonProcess()` wait until shutdown
instead of returning immediately, but the implementation used an async Promise
executor. If `createDaemonSocketServer(...).start()` failed during startup, the
outer `runDaemonProcess()` promise could remain pending while the socket start
error escaped as an unhandled rejection.

#### Cause

`new Promise(async (resolve) => { await start(); ... })` does not wire the async
executor rejection to the Promise constructor outer promise. This is a daemon
lifecycle bug, not a socket transport contract change.

#### Fix

Keep the long-running shutdown promise, but perform socket startup outside the
Promise executor. On startup failure, stop the daemon handle, close the in-memory
SQLite database, and rethrow the original error. On normal stop/SIGTERM/SIGINT,
resolve the shutdown promise instead of calling `process.exit(0)` directly.

#### Verification

Added `tests/unit/daemon/run.test.ts` to assert that
`runDaemonProcess(socketPath)` rejects when the daemon socket server cannot
start instead of hanging.

### Step 14 follow-up: Codex remote MCP injection target

#### Problem

문제는 Step 14 manual smoke에서 `aiox codex --name impl --pair p1`가
Codex TUI를 `--remote ws://...`로 띄웠지만, remote TUI 안에서 aiox MCP
도구가 보이지 않는 것이었다. 같은 smoke에서 사용자 global MCP 중 Notion이
`starting`에 머무르며 Codex startup을 막는 듯한 현상도 함께 관찰됐다.

그 다음 target 이동 후 Notion `starting` hang은 해소됐지만, aiox MCP가
다음 오류로 실패했다.

```text
MCP client for `aiox` failed to start: MCP startup failed:
handshaking with MCP server failed: connection closed: initialize response
MCP startup incomplete (failed: aiox)
```

#### Cause Analysis

처음에는 원인을 remote mode에서 사용자 global MCP config를 headless로 읽는
문제 또는 `CODEX_HOME`/profile/`sqlite_home` 공유 문제일 수 있다고
생각했다. 하지만 사용자의 manual smoke에서 Notion `starting` hang이 target
이동 후 해소됐으므로, 이 부분은 별도 격리 없이 app-server target mismatch와
함께 해결된 것으로 관찰했다. Notion OAuth 실패 자체는 사용자 설정 문제이며,
aiox bug로 보지 않는다. DB lock이나 `sqlite_home` 경합은 이 변경에서 원인으로
확정하지 않았다.

확인된 원인은 두 가지였다.

1. Step 13 구현은 Codex TUI process가 MCP host라고 보고 foreground TUI launch에
   `-c mcp_servers.aiox = {...}`를 주입했다. Step 14 remote mode에서는 MCP host가
   foreground TUI가 아니라 daemon-owned `codex app-server`였기 때문에, 주입 대상이
   틀렸다.
2. target을 app-server로 옮긴 뒤 남은 aiox startup failure의 원인은
   `aiox mcp-codex` lifecycle/handshake 순서였다. 기존 hidden subcommand는 stdio
   MCP server가 안정적으로 initialize handshake를 받기 전에 daemon channel
   registration을 먼저 시도했고, `mcp.connect()`가 resolve되면 CLI invocation이
   반환될 수 있었다. 그 결과 registration 실패 또는 즉시 반환 경로에서 Codex가
   initialize 응답을 받기 전에 MCP child process가 닫힐 수 있었다. built-command
   probe로 daemon socket이 없는 조건에서 이 동작을 확인했다.

#### Resolution

해결은 구조 변경 없이 Step 14 blocker에 필요한 행위 변경만으로 제한했다.

- `src/adapters/codex/launcher.ts`: aiox MCP
  `-c mcp_servers.aiox = {...}` 주입을 foreground TUI launch에서 daemon-owned
  `codex app-server --listen ...` launch로 이동했다.
- `src/cli/invocation.ts`: foreground TUI에는 remote 접속 args만 남겼다
  (`--remote <endpoint>` 또는 `resume <thread> --remote <endpoint>`).
- `src/daemon/state.ts`: Codex channel token을 `attachCodexRuntime()` 전에
  pre-issue하고, 같은 daemon socket path를 runtime attach/app-server launch 경계로
  전달했다. attach 실패 시 pre-issued pending token은 제거한다.
- `src/adapters/codex/runtime.ts`: `agentName`, pre-issued token,
  daemon socket path를 app-server MCP injection으로 넘긴다.
- `src/adapters/codex/mcp-server.ts`: `aiox mcp-codex`가 stdio MCP connect를
  먼저 수행하고, daemon registration은 connect 이후 수행하도록 바꿨다. Registration
  실패는 stderr event로 남기되 process를 종료하지 않는다. Hidden subcommand는 stdio
  transport close까지 살아있게 유지한다.

이 변경으로 Step 13 hidden `aiox mcp-codex` stdout MCP protocol, token hardening,
and same socket path contract는 유지됐다. `CODEX_HOME`, profile, `sqlite_home`
격리는 추가하지 않았다.

#### Verification

Manual smoke 결과:

- Notion `starting` hang은 target 이동 후 해소됨.
- aiox MCP startup failure는 MCP lifecycle/handshake fix 후 해소됨.
- Codex TUI `/mcp`에서 `aiox`가 성공적으로 로드됨.

Automated verification:

```sh
pnpm test -- tests/unit/adapters/codex-launcher.test.ts tests/unit/adapters/codex-runtime.test.ts tests/unit/daemon/codex-ingress.test.ts tests/unit/cli/invocation.test.ts tests/unit/daemon/api.test.ts
pnpm test -- tests/unit/adapters/codex-mcp-server.test.ts tests/unit/daemon/codex-ingress.test.ts tests/integration/daemon-client-split.test.ts tests/unit/daemon/run.test.ts tests/unit/cli/invocation.test.ts
pnpm test       # 323 passing (46 files)
pnpm typecheck  # PASS
pnpm build      # PASS
```

Built-command probe:

- `node dist/src/bin/aiox.js mcp-codex`가 daemon registration 실패 조건에서도
  MCP `initialize` response를 stdout으로 반환함을 확인했다.
- registration 실패는 stderr event로 남고, initialize 전에 process가 닫히지 않는다.

## Commits

- `cf17e68` structure: extract stable socket path + export canConnect
- `1172a74` behavior: daemon/client split — createClientRuntime + _run-daemon entry point

## Out of Scope (preserved)

- CI automation for real Codex/Claude authenticated sessions.
- GUI terminal split automation.
- Post-MVP `logs`, `inspect`, `rm`, `kill`, compose.
- Persistent SQLite path (`:memory:` per Step 14 checklist; explicit approval needed).
