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
aiox codex --name <name> [--pair <pair-name>]
aiox claude --name <name> [--pair <pair-name>]
```

Behavior:

- Auto-start daemon if needed.
- Register or reconnect AgentInstance.
- Attach/run the agent in the current terminal.
- Keep the agent connected to daemon while process is alive.
- On process exit, mark the agent `disconnected` or `stale`.

Name policy:

- Reject duplicate name if existing agent is `connected`.
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
- Does not launch terminal panes or agent processes.
- No MVP timeout.
- No MVP cancel command.
- Agents attach with `--pair <pair-name>`.
- When both expected sides attach, daemon creates bidirectional routes.

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

- Checks Node.js, pnpm, Codex CLI, Claude CLI, SQLite/native binding,
  daemon socket/db path, and optional recipe tools such as cmux/tmux.

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
│  │ codex app-server   │   │ MCP channel server          │  │
│  │ (별도 Codex proc;  │   │ (Claude의 자식 process;     │  │
│  │  daemon spawn 또는 │   │  HTTP ingress 노출)         │  │
│  │  외부 띄우고 connect)│  │                             │  │
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
- Codex `app-server`와 Claude MCP channel server는 **adapter-managed 외부 process/endpoint**다. daemon은 이를 spawn/supervise하거나 외부에서 띄운 것에 connect한다. **daemon process 안에서 라이브러리처럼 내장하지 않는다.**
- Claude channel server는 Claude CLI가 stdio로 자식 process로 load한 MCP server이고, 그 server가 HTTP ingress(`/send`)를 노출해 daemon이 push한다.
- Codex app-server는 Codex CLI가 제공하는 별도 process이고, daemon은 WS client로 접속해 `turn/start`를 호출한다.
- agent CLI process(Layer 1)는 사용자 터미널의 foreground다. daemon의 child가 아니므로 daemon이 직접 kill하지 않는다.
- adapter는 daemon 안의 client/injector(Layer 3) + Layer 2 외부 process의 협업 단위로 본다.

### Message Flow (1:N fan-out + reply)

`turn/start`와 `notifications/claude/channel`은 **target에 메시지를 inject하는 경로**이지, source에서 router로 메시지를 꺼내오는 경로가 아니다. source는 별도 outgoing 메커니즘으로 router에 도달한다.

```text
Outgoing (source agent → router)
─────────────────────────────────────
[source agent]
      │
      │ Claude source: channel server의 reply tool 호출
      │ Codex source: tool call / app-server event capture
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
target reply 발생 (Claude: reply tool 호출, Codex: thread output capture)
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

## Adapter Scope

### Codex

MVP adapter skeleton should preserve this boundary:

```text
codex app-server WebSocket
thread/loaded/list
turn/start
```

The pre-validation proved thread-targeted `turn/start` works.

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

1. Claude channel trust/confirmation policy

   Claude may treat channel-delivered instructions as external or untrusted and
   ask for user confirmation before following them. MVP must avoid assuming fully
   automatic Claude-side execution until the trust/wording policy is decided.

2. Codex thread id to agent name mapping

   `thread/loaded/list` exposes loaded Codex thread UUIDs. MVP needs a stable
   strategy to associate those UUIDs with human-friendly `aiox` agent names/tags.

3. Stale agent transition policy

   SQLite recovery can represent `disconnected` and `stale`, but the product
   still needs a policy for when a disconnected agent becomes stale. This likely
   depends on last-seen time, adapter kind, and whether pending deliveries exist.

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
CLI sessions and user auth state.

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
- Quorum/aggregation routing.
