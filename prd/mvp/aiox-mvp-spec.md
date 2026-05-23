# aiox MVP Spec

> Date: 2026-05-16
> Status: Draft for MVP implementation
> Decision source: `history/15-mvp-design-decisions.history.md`

## Goal

Build the first usable `aiox` local agent orchestrator.

The MVP must prove that independently attached local agents can be registered,
connected with explicit directed routes, and used for 1:N fan-out through durable
message delivery state.

## Non-Goals

- YAML `aiox compose up/down`.
- GUI terminal split automation.
- Agent-specific native terminal adapters.
- `logs`, `inspect`, `rm`, `kill`, and single-agent `stop`.
- Complete quorum/aggregation workflow.
- Fully automatic recovery of live Codex/Claude transports after daemon restart.

## Product Principles

- `daemon` is the registry/router/state owner.
- `aiox codex` and `aiox claude` are foreground attach/run commands.
- `connect` and `disconnect` are explicit directed route controls.
- `pair` is a durable compose-like reservation, not a terminal launcher.
- Terminal automation belongs in scripts/recipes, not core MVP behavior.
- `stop` is a Docker-like lifecycle transition, not identity removal.
- Docker's mental model is borrowed for lifecycle and observability:
  `status` now, and future `logs`/`inspect`/`rm`/`kill`.
- The daemon only kills processes it owns.
- The default daemon is a user-local singleton. Commands and agent runtimes that
  use the same configured socket path share one daemon namespace.
- `cwd` is recorded on agents for observability, but MVP does not use cwd as a
  project namespace boundary.

## MVP Commands

### Daemon

```text
aiox daemon start
aiox daemon stop
aiox daemon stop --daemon-only
aiox daemon restart
aiox daemon status
```

`daemon start`:

- Starts daemon if absent.
- If daemon already exists, prints current daemon info.

`daemon stop`:

- Stops daemon.
- Gracefully stops daemon-owned child processes.
- Does not forcibly kill user-attached foreground agent processes.
- Marks registered connected agents as `disconnected`.

`daemon stop --daemon-only`:

- Stops daemon only.
- Leaves externally owned/user-attached processes alone where possible.
- Durable state remains.
- Next daemon start treats agents as reconnect candidates.

`daemon restart`:

- Runs stop then start.
- Used to verify restart recovery.

`daemon status`:

- Prints daemon pid, socket/port, db path, uptime, and version.

### Agent Attach

```text
aiox codex --name <name> [--pair <pair-name>] [--resume <session-id>]
aiox claude --name <name> [--pair <pair-name>]
```

Behavior:

- Auto-start daemon if needed.
- Register or reconnect AgentInstance.
- Attach/run the agent in the current terminal.
- Keep the agent connected to daemon while process is alive.
- On process exit, mark the agent `disconnected` or `stale`.
- Codex only: `--resume <session-id>` explicitly resumes/rebinds a
  rollout-backed Codex thread. The daemon does not auto-resume from
  `adapter_session_id`, does not create fallback threads, and fails fast if
  Codex returns a different thread id.

Name policy:

- Reject duplicate name if existing agent is `connected`.
- If existing agent is `pending_attach`, attach using the same durable identity
  and transition it to `connected`.
- Allow same-name reconnect if existing agent is `disconnected` or `stale`.

### Routing

```text
aiox connect <source> <target...>
aiox disconnect <source> <target...>
```

`connect`:

- Creates directed routes.
- `aiox connect a b c` means `a -> b` and `a -> c`.
- Does not create reverse routes.

`disconnect`:

- Removes directed routes for the given source and targets.
- Does not delete historical messages, deliveries, or events.

### Pair Reservation

```text
aiox pair --name <pair-name>
```

Behavior:

- Creates durable pair reservation.
- Expected sides: one Codex and one Claude.
- Capacity: one Codex and one Claude.
- Does not launch terminal panes or agent processes.
- Does not create AgentInstance rows at reservation time.
- No MVP timeout.
- No MVP cancel command.
- Agents attach with `--pair <pair-name>`.
- When both expected sides attach, daemon creates bidirectional routes.
- Rejects a second agent of the same kind for an already occupied pair side.

### Global

```text
aiox status
aiox stop
aiox doctor
```

`status`:

- Prints daemon state.
- Prints agents, pairs, routes, messages/deliveries summary.

`stop`:

- Shortcut for `aiox daemon stop`.

`doctor`:

- Checks only current user-facing runtime requirements: Node.js, Codex CLI,
  Claude CLI, SQLite/native binding, and daemon socket reachability.
- Repository development tools such as pnpm/yarn/npm/bun are not runtime doctor
  checks. Future recipe tools such as tmux/cmux are not shown until the recipe
  is implemented and user-visible.

## Architecture

### Process Topology

```text
┌────────────────────────────────────────────────────────────┐
│  Layer 0: user terminals                                   │
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │ aiox codex      │  │ aiox claude      │                 │
│  │ --name impl     │  │ --name reviewer  │                 │
│  └───────┬─────────┘  └────────┬─────────┘                 │
└──────────┼─────────────────────┼───────────────────────────┘
           │ launch              │ launch
┌──────────▼─────────────────────▼───────────────────────────┐
│  Layer 1: agent CLI processes (사용자 owned)               │
│  ┌────────────────┐  ┌─────────────────┐                   │
│  │ Codex CLI      │  │ Claude Code     │                   │
│  │ --remote ws    │  │ + dev channels  │                   │
│  └───────┬────────┘  └────────┬────────┘                   │
└──────────┼────────────────────┼────────────────────────────┘
           │ WS connect          │ stdio (Claude가 spawn)
┌──────────▼────────────────────▼────────────────────────────┐
│  Layer 2: adapter-managed external processes/endpoints     │
│  ┌────────────────────┐   ┌─────────────────────────────┐  │
│  │ CodexAgentRuntime  │   │ MCP channel server          │  │
│  │ per-agent          │   │ (Claude의 자식 process;     │  │
│  │ codex app-server   │   │  HTTP ingress 노출)         │  │
│  │ port :0            │   │                             │  │
│  └─────────┬──────────┘   └──────────┬──────────────────┘  │
└────────────┼─────────────────────────┼─────────────────────┘
             │ WS                       │ HTTP /send
┌────────────▼─────────────────────────▼─────────────────────┐
│  Layer 3: aiox daemon (registry / router / state owner)    │
│  ┌──────────────────┐  ┌───────────────┐  ┌────────────┐   │
│  │ Codex adapter    │  │ Claude adapter│  │ router     │   │
│  │ WS client +      │  │ channel client│  │ (core)     │   │
│  │ injector         │  │ + injector    │  │            │   │
│  └──────────────────┘  └───────────────┘  └─────┬──────┘   │
│                                                  │         │
│                              ┌───────────────────▼──────┐  │
│                              │ SQLite WAL + local API   │  │
│                              └──────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

- daemon은 SQLite WAL, router, local API/MCP, adapter client/injector를 소유한다. router는 daemon process 안에 in-process로 산다.
- Codex runtime과 Claude MCP channel server는 **adapter-managed 외부 process/endpoint**다. daemon은 이를 spawn/supervise하거나 외부에서 띄운 것에 connect한다. **daemon process 안에서 라이브러리처럼 내장하지 않는다.**
- Claude channel server는 Claude CLI가 stdio로 자식 process로 load한 MCP server이고, 그 server가 HTTP ingress(`/send`)를 노출해 daemon이 push한다.
- Codex MVP runtime은 `CodexAgentRuntime` 단위로 본다. 현재 Step 10 구현 방향은 **Codex agent 1개당 Codex app-server 1개**다. 각 app-server는 `codex app-server --listen ws://127.0.0.1:0`로 OS 자동 포트를 할당받고, 각 Codex TUI는 자기 app-server endpoint로 `codex --remote` 연결한다.
- Codex app-server endpoint는 agent identity boundary다. `/clear`, `/new`, `/fork`는 identity attribution 문제가 아니라 같은 per-agent app-server 안에서 active thread id가 바뀌는 문제로 취급한다.
- agent CLI process(Layer 1)는 사용자 터미널의 foreground다. daemon의 child가 아니므로 daemon이 직접 kill하지 않는다.
- adapter는 daemon 안의 client/injector(Layer 3) + Layer 2 외부 process의 협업 단위로 본다.

`CodexAgentRuntime`은 Docker Engine의 container와 비슷한 product boundary로
취급한다. 이는 OS-level container, namespace, cgroup, 또는 별도 VM을 뜻하지
않는다. MVP에서는 process/app-server endpoint/thread id/health/lifecycle을 하나의
named agent runtime으로 묶는 추상화다. 이 경계 덕분에 나중에 내부 구현을
proxy listener나 다른 adapter topology로 바꿔도 사용자 모델은
`aiox codex --name <name>` 중심으로 유지된다.

### Daemon Namespace

MVP treats the default daemon as a user-local singleton selected by socket path.

- Same configured socket path means same daemon namespace.
- Pair names and agent names are unique inside the selected daemon namespace.
- `AIOX_SOCKET_PATH` or an equivalent config override can select a different
  daemon for tests or advanced operation.
- Agent `cwd` is stored for status/debug output, but cwd does not create a
  separate project namespace in MVP.
- Project-local daemons, project-root namespaces, current-project status
  filtering, and same-name reuse across projects are Post-MVP decisions.

### MCP Categories

aiox has two MCP categories with different ownership and install behavior.

1. **aiox-level control MCP**

   Optional user-installed control plane for external tools that want to operate
   the daemon directly, such as creating pairs, connecting routes, reading
   status, or stopping the daemon. Project/global setup commands for this MCP
   are Post-MVP unless explicitly pulled forward.

2. **agent-level runtime MCP/channel**

   aiox-managed data plane attached only to agent sessions launched by
   `aiox codex` or `aiox claude`. This is how an agent sends or replies through
   its daemon. It must be launch-scoped or per-agent scoped, receive the selected
   daemon socket path and a daemon-issued agent token at launch time, and must
   not require users to manually install global MCP entries.

MVP must not mutate global Codex or Claude config by default. If a future setup
command supports project/global installation, that is a user-facing control MCP
feature, not the default agent runtime path.

### Message Flow (1:N fan-out + reply)

`turn/start`와 `notifications/claude/channel`은 **target에 메시지를 inject하는 경로**이지, source에서 router로 메시지를 꺼내오는 경로가 아니다. source는 별도 outgoing 메커니즘으로 router에 도달한다.

Current implementation status after Step 12:

- Claude → daemon source path exists through the Claude channel reply callback.
- daemon → Claude target injection exists through the registered Claude channel.
- daemon → Codex target injection exists through the per-agent Codex app-server
  `turn/start` path.
- Codex → daemon source path is not yet implemented. This means real
  bidirectional Codex/Claude conversation is not complete even though the
  router and fake-adapter round-trip are already covered.
- Most CLI commands still start an in-process socket runtime for the current
  command instead of connecting to a pre-existing long-running daemon. `aiox
  daemon status` is read-only, but `aiox status`, `aiox pair`, `aiox codex`,
  `aiox claude`, and `aiox connect` still need the client/daemon reuse split
  before reliable manual multi-terminal E2E.

```text
Outgoing (source agent → router)
─────────────────────────────────────
[source agent]
      │
      │ Claude source: channel server의 reply tool 호출
      │ Codex source: aiox-managed agent-level MCP/tool call
      ▼
adapter (daemon 안 client) ──► router
                                 │
                                 ├─ messages row 1개 생성
                                 ├─ route(source → [t1, t2, ...]) 조회
                                 └─ message_deliveries row N개 생성

Injection (router → targets, 각 delivery 독립 transition)
─────────────────────────────────────
router ──► per delivery ──► target adapter (daemon 안 injector)
                              │
                              ├─ Codex target:
                              │    app-server `turn/start` 호출 → Codex UI thread
                              │
                              └─ Claude target:
                                   HTTP POST /send → MCP channel server
                                   → `notifications/claude/channel` → Claude

delivery.status: queued → delivering → delivered (또는 failed)

Reply
─────────────────────────────────────
target reply 발생 (Claude: reply tool 호출, Codex: agent-level MCP/tool call)
  ──► adapter ──► router
                   │
                   ├─ messages row 생성 (parent_message_id = 원본 msg.id)
                   └─ source agent에 injection
                      (injection 메커니즘은 위 Injection 단계와 동일하게 재사용)
```

- `messages`는 1개, `message_deliveries`는 target 수만큼 N개.
- delivery는 독립적으로 transition한다. 한 delivery 실패가 다른 delivery를 막지 않는다 (partial failure best-effort).
- reply는 별도 message로 생성되고 `parent_message_id`로 원본을 가리킨다. source에 다시 보낼 때도 Injection 경로(turn/start 또는 channel push)를 재사용한다.

### Plane → Module Mapping

```text
Control plane    src/mcp/             외부 도구가 daemon을 조작
                 src/daemon/api.ts    daemon HTTP/IPC API

Routing plane    src/core/            agents, pairs, routes, messages,
                                      deliveries, events 도메인 로직
                 src/store/           SQLite WAL 영속성

Injection plane  src/adapters/codex/  turn/start 호출
                 src/adapters/claude/ notifications/claude/channel push

Launcher plane   src/launcher/        script/attach default
                                      recipes로 cmux/tmux helper 격하
```

### Module Layout

```text
src/
  bin/aiox.ts

  cli/commands/
    daemon.ts
    codex.ts
    claude.ts
    connect.ts
    disconnect.ts
    pair.ts
    status.ts
    stop.ts
    doctor.ts

  daemon/
    server.ts        # daemon entry point, lifecycle
    api.ts           # CLI ↔ daemon API
    supervisor.ts    # daemon-owned child process 관리
    state.ts         # in-memory state cache + SQLite sync

  core/
    agents.ts        # AgentInstance lifecycle (4-state)
    pairs.ts         # pair reservation lifecycle
    routes.ts        # directed route control
    messages.ts      # message 도메인
    deliveries.ts    # message_delivery 도메인 (per-target)
    events.ts        # append-only event log
    ids.ts           # id 생성/검증

  store/
    sqlite.ts        # better-sqlite3 wrapper, WAL 설정
    schema.ts        # CREATE TABLE 정의
    repositories/
      agents.ts
      pairs.ts
      routes.ts
      messages.ts
      deliveries.ts
      events.ts

  adapters/
    codex/
      app-server.ts   # codex WS server (daemon host)
      websocket.ts    # WS client utilities
      injector.ts     # turn/start 호출
      launcher.ts     # codex CLI invoke (인자, --remote URL)
    claude/
      channel-server.ts  # MCP channel server (daemon host)
      injector.ts        # notifications/claude/channel push
      launcher.ts        # claude CLI invoke (인자, channel 설정)

  launcher/
    script.ts        # MVP default — foreground attach 실행 로직
    attach.ts        # daemon registry attach 헬퍼
    manual.ts        # 사용자가 직접 띄운 경우 처리
    recipes.ts       # cmux/tmux 등 shell helper 등록 (post-MVP plugin)

  mcp/
    server.ts        # MCP control plane (외부 도구 entry point)
    tools.ts         # 노출하는 MCP tool 정의

  config/
    paths.ts         # db/socket/log path 결정
    config.ts        # 사용자 설정 로드

tests/
  unit/
  integration/
```

### Launcher Responsibility 경계

두 개의 launcher가 같은 layer가 아니다:

- `src/adapters/<kind>/launcher.ts` — **adapter binary invoke**. codex CLI를 어떤 인자로 띄울지, channel server를 어떤 stdio 설정으로 띄울지. agent kind별 개별.
- `src/launcher/` — **terminal/process placement**. 사용자 터미널에서 foreground attach 실행, 또는 future background daemon mode. 기본은 script/attach. cmux/tmux/iTerm2 자동화는 `recipes.ts`로 격하.

이 분리 덕에 future post-MVP에서 GUI terminal native split adapter를 추가해도 adapter launcher는 영향을 받지 않는다.

## Core Domain Model

### AgentInstance

Fields:

```text
id
name
kind
status
cwd
pair_id nullable
adapter_session_id nullable
last_seen_at nullable
created_at
updated_at
```

`kind`:

```text
codex
claude
```

`status`:

```text
pending_attach
connected
disconnected
stale
```

### Pair

Fields:

```text
id
name
status
created_at
updated_at
```

MVP statuses:

```text
pending
ready
stale
```

MVP pair is a 1:1 shortcut, not a group. A pair has one Codex slot and one
Claude slot. If the Codex slot is already occupied, another
`aiox codex --name ... --pair <same-pair>` must be rejected. Use explicit
`connect` for extra agents and 1:N routing.

### Route

Fields:

```text
id
source_agent_id
target_agent_id
status
created_at
updated_at
```

Route is directed. For bidirectional communication, two routes exist.

MVP route status starts as `active`. `disconnect` removes the directed route
from the active route set; historical messages, deliveries, and events remain.

### Message

Fields:

```text
id
source_agent_id
parent_message_id nullable
type
content
created_at
updated_at
```

`type`:

```text
question
instruction
status
event
reply
```

### MessageDelivery

Fields:

```text
id
message_id
target_agent_id
route_id nullable
status
idempotency_key
created_at
updated_at
```

`idempotency_key` must be unique per delivery intent. The MVP should prevent
injecting the same logical message to the same target more than once.

`status`:

```text
queued
delivering
delivered
completed
failed
```

MVP intentionally starts with the 5 states validated by the SQLite restart
recovery spike. Additional states such as `started`, `waiting`, `cancelled`,
`expired`, and `stale` can be added when implementation proves they are needed.

Restart transition policy:

```text
queued      -> queued
delivering  -> queued
delivered   -> delivered
completed   -> completed
failed      -> failed
```

### Event

Fields:

```text
id
agent_id nullable
message_id nullable
delivery_id nullable
route_id nullable
type
data_json
created_at
```

Events are append-only in MVP.

Event links are denormalized for query ergonomics. An event can attach to an
agent, message, delivery, or route when that makes status/debug output simpler.

## Fan-Out Behavior

When source agent sends one message to a route with N targets:

1. Create one `messages` row.
2. Create N `message_deliveries` rows.
3. Attempt delivery per target independently.
4. Mark failed delivery as `failed`.
5. Continue other deliveries.

MVP does not implement quorum or aggregated completion.

1:N fan-out is MVP behavior. The MVP command surface for 1:N is explicit
directed connect, for example:

```text
aiox connect impl reviewer researcher
```

This creates `impl -> reviewer` and `impl -> researcher`. Pair reservation does
not provide 1:N group membership.

## Pair Attach Behavior

Given:

```text
aiox pair --name feature-x
aiox codex --name feature-x-codex --pair feature-x
aiox claude --name feature-x-claude --pair feature-x
```

Expected result:

```text
feature-x-codex -> feature-x-claude
feature-x-claude -> feature-x-codex
```

If only one side attaches:

- attached agent remains `connected`.
- pair remains `pending`.
- no timeout.

If a second agent of the same kind tries to attach to the same pair:

```text
aiox codex --name stranger --pair feature-x
```

and the pair already has a Codex side, daemon rejects the attach with a clear
message. The user should either create another pair or attach the agent normally
and use `aiox connect` for explicit routes.

`aiox pair --name feature-x` does not create `pending_attach` agents, because
the agent names are not known yet. `pending_attach` is reserved for desired
state flows that already know agent names, such as future YAML compose.

## Adapter Scope

### Codex

MVP adapter skeleton should preserve this boundary:

```text
CodexAgentRuntime
per-agent codex app-server endpoint
OS-assigned localhost port (:0)
thread/start and thread/fork active-thread tracking
turn/start injection to active thread id
```

The pre-validation proved thread-targeted `turn/start` works.

Step 10 production direction is per-agent app-server first:

- Each Codex agent gets its own local Codex app-server endpoint.
- Each app-server is launched with `--listen ws://127.0.0.1:0`; the OS assigns
  an available port atomically, avoiding developer port collisions.
- Aiox parses the assigned endpoint from the app-server output banner, waits
  for `readyz`, and launches the TUI with
  `codex --remote <assigned-endpoint>`. Current Codex CLI verification observed
  the banner on stderr, so implementation drains both stdout and stderr and does
  not rely on stdout as the endpoint source.
- MVP does not require users to choose or remember Codex app-server ports.
- `thread/loaded/list` is app-server memory/cache state, not an active TUI list.
- In-band proxy remains a validated spike/fallback, not the MVP production path.
- Step 13 must add the missing Codex source path into daemon. Until that exists,
  Codex can receive injected turns from daemon but cannot authoritatively send
  or reply back into the aiox router.
- Step 13 primary direction is an explicit aiox-managed agent-level MCP/tool
  callback. App-server notification scraping is not the MVP authoritative
  source path because it is brittle and makes identity attribution harder.

### Claude

MVP adapter skeleton should preserve this boundary:

```text
Node.js MCP channel server
notifications/claude/channel
reply tool
```

The pre-validation proved channel injection works with confirmation caveats.

## Storage

Use SQLite with WAL enabled.

MVP tables:

```text
agents
pairs
routes
messages
message_deliveries
events
```

SQLite restart recovery must not pretend to restore live transports. It restores
durable identity and state only.

## Open Product Issues

These issues are known product policy gaps. They should not block MVP skeleton
implementation, but adapter behavior and UX must reference them.

1. Claude channel trust/confirmation policy — resolved for MVP

   MVP targets fully automatic Claude-side execution for channel-delivered
   instructions. aiox will use trusted channel framing and will not insert an
   additional per-message confirmation layer before Claude follows an injected
   channel instruction. Claude MCP tools are expected to be enabled by the
   operator for this mode.

   This is a product stance, not a guarantee from Claude. If Claude still treats
   a channel instruction as external or asks for confirmation, aiox surfaces that
   runtime behavior instead of trying to bypass Claude's own safety boundary.

2. Codex thread id to agent name mapping

   `thread/loaded/list` exposes loaded Codex thread UUIDs, but it is app-server
   memory/cache state rather than an active TUI list. MVP Step 10 maps Codex
   thread ids to human-friendly `aiox` names through a per-agent app-server
   endpoint: endpoint = agent identity boundary. Active thread id is then tracked
   within that per-agent app-server. In-band proxy remains a validated fallback,
   not the production path.

3. Stale agent transition policy

   SQLite recovery can represent `disconnected` and `stale`, but the product
   still needs a policy for when a disconnected agent becomes stale. This likely
   depends on last-seen time, adapter kind, and whether pending deliveries exist.

4. Long-running delivery timeout policy

   MVP delivery에는 자동 timeout/expire가 없다. agent가 connected이면 reply가
   몇 시간이 걸리든 `delivering`으로 머무르고, disconnected이면 `queued`로
   무한 대기한다. 다음 결정이 필요하다:

   - delivery에 max age 정책을 둘 것인가 (예: 7일 후 `failed` 자동 전환)
   - source agent가 ask 시점에 per-message timeout을 지정할 수 있게 할 것인가
   - 사용자가 명시적 cancel하는 명령(`aiox cancel <delivery-id>` 등)을 둘 것인가
   - timeout 발생 시 delivery status는 새 `expired` enum인가, 기존 `failed`인가

   현재는 Post-MVP `resume-safe long-running workflow`에 묶여 있지만, 실사용에서
   먼저 필요해질 가능성이 크므로 별도 정책 결정이 필요하다.

5. AI agent session expiry handling

   adapter 외부 세션은 다양한 이유로 만료될 수 있다:

   - Claude의 development channel/MCP server 연결 idle timeout
   - Codex `app-server` WebSocket idle disconnect
   - Codex thread가 일정 시간 후 unload되거나 사라짐
   - 사용자 auth token/세션 만료 (Claude, Codex 둘 다)

   결정 필요:

   - adapter가 만료를 어떻게 감지하는가 (heartbeat? WS close? thread/loaded/list
     polling? API error 감지?)
   - 감지 후 agent를 자동으로 `stale`로 전환할 것인가, `disconnected`로 둘 것인가
   - in-flight delivery는 어떻게 처리하는가 (재시도? 즉시 failed? 사용자 알림 후 대기?)
   - reconnect 시도 정책 (자동 backoff? 사용자 수동? 새 attach 명령 필요?)
   - source agent에게 만료 사실을 어떻게 surface하는가

   이 정책은 `stale` 판정(#3)과는 별개다. #3는 daemon 관점의 시간 기반 판정이고,
   #5는 adapter가 외부 세션 단절을 능동 감지하는 시나리오다.

## Testing Requirements

Follow TDD.

MVP test layers:

- Core model tests.
- SQLite schema/repository tests.
- Route connect/disconnect tests.
- 1:N fan-out delivery tests.
- Pair reservation tests.
- Restart recovery tests.
- CLI command parsing tests.
- Fake adapter integration tests.

Actual Codex/Claude E2E tests remain manual/smoke because they depend on local
CLI sessions and user auth state. A real MVP smoke requires both:

- Codex source path into daemon, so Codex can send/reply through aiox.
- Long-running daemon/client reuse, so independent terminal commands share the
  same daemon state instead of creating isolated in-process runtimes.

## Post-MVP

- `aiox compose up/down`.
- YAML declarative environment.
- `aiox logs <name>`.
- `aiox inspect <name|route>`.
- `aiox stop <agent>`.
- `aiox rm <agent>`.
- `aiox kill <agent>`.
- `aiox pair cancel <name>`.
- GUI terminal native split adapters.
- Shared Codex app-server optimization.
- Full resume-safe long-running workflow.
- Agent message lifecycle policies that are not needed for MVP:
  `prd/post-mvp/agent-message-lifecycle-policy.md`.
- Quorum/aggregation routing.
