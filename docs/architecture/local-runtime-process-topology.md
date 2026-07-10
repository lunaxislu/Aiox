# aiox Local Runtime — Process Topology (§1)

Related:

- [[docs/architecture/local-agent-runtime]]
- [[docs/decisions/codex-per-agent-app-server]]
- [[docs/decisions/claude-channel-plugin-default]]

Status: Current

This slice owns the current local runtime process topology. The
[[docs/architecture/local-agent-runtime]] index owns status vocabulary, the
module overview, and authority links.

## 1. Process Topology

Per running pair the OS sees the following processes:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   ┌─────────────────────────────┐         ┌──────────────────────────┐    │
│   │  aiox daemon (in-mem SQLite)│         │  aiox CLI (per command)  │    │
│   │                             │         │                          │    │
│   │  socket: ~/.aiox/daemon.sock│◀───UDS──│  createClientRuntime     │    │
│   │  state.ts / api.ts          │         │  invocation.ts           │    │
│   │  codexRuntimes Map          │         └─────────────┬────────────┘    │
│   │  claudeChannelRuntimes Map  │                       │                 │
│   │  codexChannelRuntimes Map   │                       │ spawn (inherit) │
│   └──────┬──────────────────────┘                       ▼                 │
│          │                                  ┌────────────────────────┐    │
│          │ owns per Codex agent             │  codex --remote <proxy>│    │
│          ▼                                  │  (foreground TUI)      │    │
│   ┌──────────────────┐  WS ┌───────────┐    └───────────┬────────────┘    │
│   │  per-agent proxy │◀───▶│ app-server│◀──────────WS───┘                 │
│   │  (in daemon proc │     │ child proc│                                  │
│   │   :0 WS server)  │     │  --listen │                                  │
│   └──────────────────┘     │  ws://:0  │ spawns MCP host child            │
│          ▲                 └─────┬─────┘                                  │
│          │ daemon                │ -c mcp_servers.aiox = {...}            │
│          │ JSON-RPC              ▼                                        │
│          │              ┌──────────────────────┐                          │
│          │              │  aiox mcp-codex      │                          │
│          │              │  (stdio MCP child)   │                          │
│          │              └──────────┬───────────┘                          │
│          │                         │ unix socket                          │
│          │                         ▼                                      │
│          │                  daemon.receiveCodex*                          │
│          │                                                                │
│          │  per Claude agent                                              │
│          │  ┌──────────────────────────────────────────────────────┐       │
│          │  │  claude CLI                                          │       │
│          │  │   ↓ default: plugin:aiox-channel-ingress@aiox (D)   │       │
│          │  │     legacy:  --mcp-config inline (A, explicit only) │       │
│          │  │  channel-server (stdio)                              │       │
│          │  │  HTTP /send 127.0.0.1:0 │◀── daemon HTTP POST (inject)      │
│          │  └──────────────────────────────────────────────────────┘       │
│          │                                                                │
└──────────┴────────────────────────────────────────────────────────────────┘
```

**Per-agent counts**

- Codex agent → 1 app-server child (daemon-owned) + 1 proxy WS server
  (in-process in daemon) + 1 TUI child (CLI-owned, `stdio:"inherit"`) + 1
  `aiox mcp-codex` stdio child (app-server-owned via Codex MCP host).
- Claude agent → 1 `claude` child (CLI-owned, foreground) + 1 channel-server
  stdio child (Claude-owned; default: activated via `plugin:aiox-channel-ingress@aiox`
  (D strategy; [[docs/decisions/claude-channel-plugin-default]]); legacy: launcher-injected `--mcp-config` inline
  (`AIOX_CLAUDE_CHANNEL_STRATEGY=inline`, dev/debug only)).

**MVP invariant** (WHY: [[docs/decisions/codex-per-agent-app-server]] §5):

```
Daemon manages exactly one direct child per Codex agent: the app-server.
Cleanup is WS close → SIGTERM → 3s grace → SIGKILL. No process group kill,
no setsid, no PR_SET_PDEATHSIG, no periodic healthz, no auto-reconnect, no
TUI heartbeat. TUI lifecycle is owned by the CLI process scope.
```

Evidence:

- CLI and daemon registry topology
  - [[src/bin/aiox.ts]]
    - `src/bin/aiox.ts:52-56`
    - `src/bin/aiox.ts:78-90`
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:519-526`
- Codex process topology
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:631-647`
  - [[src/adapters/codex/launcher.ts]]
    - `src/adapters/codex/launcher.ts:40-49`
    - `src/adapters/codex/launcher.ts:76-85`
    - `src/adapters/codex/launcher.ts:106-119`
  - [[src/adapters/codex/proxy.ts]]
    - `src/adapters/codex/proxy.ts:58-74`
    - `src/adapters/codex/proxy.ts:138-142`
  - [[src/cli/invocation.ts]]
    - `src/cli/invocation.ts:295-299`
- Claude process topology
  - [[src/cli/invocation.ts]]
    - `src/cli/invocation.ts:87-90`
    - `src/cli/invocation.ts:214-219`
    - `src/cli/invocation.ts:482-490`
  - [[src/adapters/claude/launcher.ts]]
    - `src/adapters/claude/launcher.ts:189-208`
  - [[src/adapters/claude/channel-server.ts]]
    - `src/adapters/claude/channel-server.ts:465-475`
    - `src/adapters/claude/channel-server.ts:562-580`
- Codex cleanup invariant
  - [[src/adapters/codex/runtime.ts]]
    - `src/adapters/codex/runtime.ts:193-208`
  - [[src/adapters/codex/app-server.ts]]
    - `src/adapters/codex/app-server.ts:61`
    - `src/adapters/codex/app-server.ts:187-214`

Sources:

- [[docs/decisions/codex-per-agent-app-server]] — per-agent app-server pivot and production direction.
- `logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md` §2.2, §1 — Round 3 implementation and closeout provenance.
