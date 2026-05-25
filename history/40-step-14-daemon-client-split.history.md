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

### Step 14 follow-up: queued delivery drain to Claude

#### Observation

After commit `ab6699b fix: resolve codex remote mcp startup`, manual smoke progressed
past Codex MCP startup:

- Codex TUI `/mcp` showed `aiox` successfully.
- Claude MCP showed `aiox-claude-ingress` with tool
  `reply(chat_id, text)`.
- Pair state was ready and bidirectional routes existed:
  `impl -> reviewer` and `reviewer -> impl`.
- When Codex sent a message through `aiox_send_message`, daemon status showed:

```text
DELIVERIES
messages=1 queued=1 delivering=0 delivered=0 completed=0 failed=0
```

The Claude TUI did not display the Codex message. When the user asked Claude to
send to Codex manually, Claude asked for `chat_id` and message text. That response was
not a routed aiox delivery; it was Claude interpreting a normal user request.

#### Current interpretation

The current blocker is not Codex MCP ingress. Codex -> daemon succeeded because
the daemon created one message and one queued delivery. The blocker is the
production path that drains queued deliveries to a connected Claude channel.

The Claude `reply(chat_id, text)` contract appears intentional. The expected flow is:

1. Daemon pushes a queued delivery to the registered Claude channel endpoint.
2. Claude channel-server notifies the Claude TUI with framed content such as
   `<channel source="aiox" chat_id="..." origin="impl">...</channel>`.
3. Claude uses the same `chat_id` when calling `reply(chat_id, text)`.

Therefore the next fix should start before reply handling: make Codex-originated
queued deliveries dispatch to connected Claude channels and transition delivery
status from `queued` to `delivering` to `delivered/completed` or `failed`.

#### Resolution (2026-05-24)

Added the targeted failing daemon test first:

```text
receiveCodexMessage dispatches queued delivery to registered Claude channel
```

The fix keeps Codex ingress as the source of the message, then drains the queued
delivery for connected Claude targets through the registered Claude channel HTTP
endpoint. The daemon sends the message content with `chat_id` set to the aiox
message id and `origin` set to the Codex source agent name, so Claude receives
the normal framed channel notification and can keep using `reply(chat_id, text)`
without asking the user to supply a chat id manually.

Delivery state now transitions through the existing status API from `queued` to
`delivering` and then `delivered`/`completed` on successful Claude channel push,
or `failed` with the injector failure reason when the endpoint is unavailable or
rejects the push. The reply surface was not changed. Step 13 Codex MCP stdout
protocol/token/socket behavior and the Step 14 app-server MCP injection path
remain unchanged.

Verification:

```text
pnpm test tests/unit/daemon/codex-ingress.test.ts tests/unit/adapters/claude-injector.test.ts tests/unit/adapters/codex-mcp-server.test.ts # 40 passing
pnpm test       # 324 passing (46 files)
pnpm typecheck  # PASS
pnpm build      # PASS
```

#### Manual smoke follow-up (2026-05-25)

Clean daemon restart sequence used by the user:

```text
node dist/src/bin/aiox.js daemon stop
node dist/src/bin/aiox.js daemon start
node dist/src/bin/aiox.js pair --name p1
node dist/src/bin/aiox.js claude --name reviewer --pair p1
node dist/src/bin/aiox.js codex --name impl --pair p1
```

After the clean restart, Claude launched successfully with
`server:aiox-claude-ingress`, Codex attached to the same pair, `p1` became
`ready`, and routes existed in both directions: `impl -> reviewer` and
`reviewer -> impl`.

The user manually sent Codex -> Claude through `aiox_send_message`; this worked.
Daemon status showed the expected completed delivery shape:

```text
messages=1 queued=0 delivering=0 delivered=0 completed=1 failed=0
```

Earlier `claude --name reviewer --pair p1` briefly returned `pair_not_found`.
A clean `daemon stop` / `daemon start` cleared it. The likely cause is stale or
mixed daemon lifecycle state against the in-memory `:memory:` DB, not a confirmed
pair attach code defect. If this recurs from a clean daemon on the same socket,
add a focused daemon/client split regression test before changing behavior.

Open next blocker: Claude accepted the instruction to call `reply(chat_id, text)`
and reported success, but Codex TUI did not receive anything and daemon status
still showed only the original Codex -> Claude message/delivery. This means the
current Claude reply path records the callback surface but does not yet create
and drain a routed `reviewer -> impl` reply delivery to the connected Codex
channel.

Next-session target:

```text
receiveClaudeChannelReply creates routed reply delivery to Codex channel
```

or:

```text
claude reply(chat_id, text) reaches connected Codex channel and completes delivery
```

Start with a targeted failing test. Preserve the existing Claude
`reply(chat_id, text)` surface and do not require the user to manually type chat
ids in the normal routed flow.

#### Resolution (2026-05-25)

Added the targeted failing daemon test first:

```text
receiveClaudeChannelReply creates routed reply delivery to connected Codex channel
```

The fix keeps the Claude MCP `reply(chat_id, text)` surface unchanged. When the
daemon receives the callback, it now creates a routed `reply` message from the
Claude agent with `parent_message_id` set to the original aiox message id, creates
the normal route fan-out deliveries, and drains Codex targets through the
connected Codex runtime using the existing `turn/start` injector. Successful
Codex injection moves the reply delivery through `queued -> delivering ->
delivered -> completed`; missing or unready Codex runtimes fail the delivery
with a typed injector reason.

This preserves the Step 13/14 Codex MCP startup and token contracts and does not
change the Claude channel-server tool schema.

Verification:

```text
pnpm test -- tests/unit/daemon/codex-ingress.test.ts # 325 passing
pnpm test       # 325 passing (46 files)
pnpm typecheck  # PASS
pnpm build      # PASS
```

#### Follow-up discovery: Codex completed delivery did not reach visible TUI (2026-05-25)

Manual smoke after `b0eb67b behavior: route claude replies to codex` showed:

- Claude reported that it called `reply(chat_id, text)` successfully.
- `aiox status` showed `messages=2 queued=0 delivering=0 delivered=0 completed=2 failed=0`.
- The visible Codex TUI did not show the Claude reply, and when asked, Codex said it had not read a Claude message.
- The user confirmed they had not run `/new`, `/clear`, or `resume` during the smoke.

Subagent comparison with `legacy/bridge-relay-v1` found the likely regression:

- Legacy bridge did not trust a stored thread id. Before injection it called `thread/loaded/list`, selected the currently loaded Codex thread, and then sent `turn/start` to that thread. See `legacy/bridge-relay-v1/bridge/src/codex-app-server-client.ts`.
- Current aiox stores the thread id returned by daemon-side Codex runtime attach and later injects replies into `runtime.activeThreadId`. The foreground TUI is launched with `codex --remote <endpoint>` and is not forced to display that daemon-created thread.
- Therefore `turn/start` can be accepted by the app-server and marked completed while the user's TUI is attached to another loaded thread.

Policy decision:

1. Codex agent identity remains `agent name + per-agent app-server endpoint`. `activeThreadId` is not a durable identity; it is live binding state.
2. Before Codex target injection, the daemon should discover the currently loaded Codex thread with `thread/loaded/list`. If a loaded thread exists, inject into that live thread and update the runtime/session cache after success.
3. If no loaded Codex thread exists, keep the delivery `queued` rather than marking it `completed` or terminally `failed`. This covers TUI not attached, TUI restart, transient app-server state, and user actions such as `/new` or `/clear`.
4. A future Codex agent-level MCP pull path should let Codex discover/read queued deliveries if push could not happen immediately. This preserves durable relay semantics and prevents false-positive completion.

Decision options considered:

| Option | Trade-off | Reversibility | Deferrability | Decision |
|---|---|---|---|---|
| A. Best-effort push to live loaded thread, keep queued if no live thread | Best MVP UX; may deliver an older reply into the current live thread after user switched context | Low-cost to revise later with stricter parent-thread policy | Can be staged, but false-positive `completed` remains until fixed | **Recommended / selected** |
| B. Always queue and require Codex MCP pull | Durable and explicit, but loses real-time conversation feel | Easy to combine later as fallback | Deferrable after A | Rejected as primary MVP path |
| C. Parent-thread strict delivery, queue/fail on mismatch | Strongest conversational correctness, but can hide messages from the visible TUI | Medium; needs parent thread metadata and policy migration | Deferrable | Post-MVP candidate |
| D. Keep current `turn/start` ack = completed | Smallest code change, but status lies and smoke remains misleading | Easy to undo but not useful | Not acceptable for MVP smoke | Rejected |

Next implementation target:

```text
Codex target delivery discovers live loaded thread and keeps delivery queued when no Codex TUI thread is loaded
```

Likely TDD entry points:

- `src/adapters/codex/injector.ts`: add live thread discovery before `turn/start`, or add a small runtime method used by the daemon dispatcher.
- `src/adapters/codex/runtime.ts`: expose `thread/loaded/list` and rebind/cache active thread after successful live injection.
- `src/daemon/state.ts`: do not transition Codex target deliveries to `delivering/completed` when no live loaded thread exists; leave them `queued` and append an event/reason.
- `src/adapters/codex/mcp-server.ts`: later add queued-delivery pull/read/ack tools.

Implementation result (2026-05-25):

- Added TDD coverage for stale cached Codex thread ids: when `runtime.activeThreadId` is old and `thread/loaded/list` returns a different live thread, Claude reply delivery now sends `turn/start` to the live loaded thread.
- Added TDD coverage for no loaded Codex thread: Claude reply delivery calls `thread/loaded/list`, does not call `turn/start`, and leaves the delivery `queued` instead of marking it `completed` or terminally `failed`.
- `CodexAgentRuntime` now exposes `listLoadedThreadIds()` and `rebindActiveThread(threadId)`; daemon reply dispatch updates the agent adapter session cache after successful live-thread injection.
- Verification: `pnpm test` passed (46 files, 327 tests), `pnpm typecheck` passed, and `pnpm build` passed.
- Remaining follow-up: queued delivery retry/drain and Codex MCP queued-message pull/read/ack are still planned separately.

Review hardening (2026-05-25):

- Removed the daemon-side loaded-thread parser fallback; Codex runtime is now responsible for `thread/loaded/list` parsing through required `listLoadedThreadIds()`.
- Rebind persistence and `agent_thread_id_rebound` events now occur only when the live loaded thread differs from the cached agent adapter session id.
- No-loaded-thread queued fallback now emits `codex_delivery_queued_no_loaded_thread` instead of reusing the Step 10 binding-uncertain diagnostic event.
- Injection status ordering now preserves observability: no-loaded-thread remains `queued`, while a discovered live target transitions to `delivering` before `turn/start`.
- Manual smoke then showed `completed` while the visible Codex TUI still did not receive the reply. The likely cause is current aiox creating a daemon-owned thread during attach before the foreground TUI creates/loads its own thread, so `thread/loaded/list` can contain both the cached hidden thread and the visible TUI thread.
- Multi-loaded-thread behavior was revised again after manual smoke found that, once the visible thread became cached, the previous alternate-thread heuristic could select the hidden daemon-created thread on the next reply. The daemon now selects the latest id returned by `thread/loaded/list`, which matches the observed hidden-first, visible/current-last app-server behavior and keeps repeated replies on the visible TUI thread.
- Follow-up implementation removed the no-resume attach-time `runtime.startThread()` call. A fresh Codex attach now starts the per-agent app-server and channel token, but leaves `agents.adapter_session_id` null until explicit resume or the first successful live loaded-thread delivery. This prevents a daemon-created hidden thread from being added to `thread/loaded/list` before the foreground TUI creates/loads its visible thread. Explicit `--resume` attach still calls `thread/resume` and records the resume rebind event. Verification: `pnpm test` passed (46 files, 335 tests), `pnpm typecheck` passed, and `pnpm build` passed.
- Added Codex delivery target selection observability. Claude -> Codex dispatch now records `codex_delivery_target_selected` with the loaded thread list, chosen latest-loaded thread, previous cached adapter session id, runtime active thread id, selection policy, message type, source agent id, and source/target names. No-loaded-thread fallback records `codex_delivery_target_unavailable` before the existing queued event, and turn/start failures record `codex_delivery_target_injection_failed` with the chosen thread and failure reason. The event payloads intentionally exclude message content. Runtime-unavailable and not-ready failures remain terminal delivery failures rather than selection audit events because no loaded-thread observation occurred. Verification: targeted daemon/core tests passed, `pnpm test` passed (46 files, 338 tests), `pnpm typecheck` passed, and `pnpm build` passed.

Codex inbound reply trigger follow-up (2026-05-25):

- Investigation found no reliable model-visible structured metadata path for Codex `turn/start`; the local schema supports text/image/localImage/skill/mention user input variants, while extra `origin`/`meta` fields are either validation-risky or not known to surface to the model. Decision: use a minimal model-visible text envelope for daemon -> Codex aiox deliveries and keep repeated behavioral instruction in the Codex MCP server instructions/tool description, not inside every delivered message body.
- Implemented Codex target injection envelope:
  `<aiox-channel source="claude" message_id="...">\n...\n</aiox-channel>`.
  The envelope uses the stored aiox message id as `message_id`, XML-escapes content/attributes for injection only, and leaves `messages.content` unchanged.
- Updated Codex MCP guidance so `aiox_reply(parent_message_id, content)` uses the envelope `message_id` as `parent_message_id`. Also fixed reply delivery symmetry: `receiveCodexReply()` now dispatches successful reply messages through the existing Claude channel injector path.
- Verification: targeted daemon/Codex MCP tests passed, `pnpm test` passed (46 files, 341 tests), `pnpm typecheck` passed, and `pnpm build` passed.
- Review follow-up: Claude review found missing `<` escaping in envelope attribute values and requested a regression for `receiveCodexReply()` when the Claude channel is unregistered. Fixed attribute escaping, switched the daemon interface to the `ReceiveCodexReplyResult` alias, and added the unregistered-channel failed-delivery test. Wrong-kind route delivery skip remains a follow-up outside current route invariants. Verification: targeted daemon tests passed, `pnpm test` passed (46 files, 342 tests), `pnpm typecheck` passed, and `pnpm build` passed.

Claude initiator path follow-up (2026-05-25):

- Manual smoke clarified that `chat_id` is not required for routing. The daemon routes by source agent name and active routes; `chat_id` only preserves reply parentage as `parent_message_id`.
- Added Claude channel `send(text)` as the chat-id-free initiator surface, separate from `reply(chat_id, text)`. This mirrors Codex `aiox_send_message(content)` and allows Claude to start a routed message after `/clear` or in a first-message scenario.
- Added daemon `receiveClaudeChannelMessage({ agentName, messageId, text })`; it writes a `question` message with no parent and reuses the existing Claude-to-Codex delivery path.

Post-MVP deferral (2026-05-25, user decision):

- Queued delivery retry/drain (rebind on later loaded-thread signal) and Codex MCP queued-message pull/read/ack are deferred to post-MVP. Rationale: cold-start manual smoke (`codex -> claude -> reply`) on 2026-05-25 was confirmed visible in the foreground Codex TUI after the alternate-thread preference fix, so the visible MVP message path is covered. The queued retry/drain + MCP pull paths remain valuable as a safety net for transient no-loaded-thread windows but are no longer Step 14 smoke blockers.

#### Original next-session target

Do not start with Claude reply routing. First add a targeted failing test for
Codex ingress to Claude delivery drain, for example:

```text
receiveCodexMessage dispatches queued delivery to registered Claude channel
```

or:

```text
codex ingress message reaches connected claude channel and completes delivery
```

Likely files to inspect first:

- `src/daemon/state.ts`: `receiveCodexMessage` / `sendMessage` creation and delivery status APIs.
- `src/adapters/router.ts`: existing dispatch abstraction currently used by fake adapter tests.
- `src/adapters/claude/injector.ts`: HTTP push to registered Claude channel endpoint with optional `chatId` and `origin`.
- `src/adapters/claude/channel-server.ts`: `buildChannelNotification`, `reply(chat_id, text)`, and channel HTTP ingress.
- `tests/unit/daemon/codex-ingress.test.ts` and `tests/unit/adapters/claude-injector.test.ts`.

Constraints for next fix:

- Keep Step 13 Codex `aiox mcp-codex` stdout protocol/token/socket contract intact.
- Keep the Step 14 app-server injection and MCP handshake fix intact.
- Preserve Claude `reply(chat_id, text)` as the reply surface; do not make users manually provide chat ids in normal routed flow.
- TDD first: add the failing drain test before implementation.

## Commits

- `cf17e68` structure: extract stable socket path + export canConnect
- `1172a74` behavior: daemon/client split — createClientRuntime + _run-daemon entry point

## Out of Scope (preserved)

- CI automation for real Codex/Claude authenticated sessions.
- GUI terminal split automation.
- Post-MVP `logs`, `inspect`, `rm`, `kill`, compose.
- Persistent SQLite path (`:memory:` per Step 14 checklist; explicit approval needed).
