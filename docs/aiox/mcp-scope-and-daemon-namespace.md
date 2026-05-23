# MCP scope and daemon namespace

> Learning record. Authority lives in `history/38-step-13-mcp-scope-decision.history.md`
> and `prd/mvp/aiox-mvp-spec.md`.

## Background

Step 12 made `aiox doctor`, `aiox status`, and `aiox daemon status` usable. When
we tried to plan a real Codex/Claude E2E smoke, two gaps became clear:

1. Codex can receive daemon-injected turns, but Codex cannot yet send or reply
   back into the daemon.
2. Separate CLI invocations still need long-running daemon/client reuse work
   before they reliably share one daemon state.

Step 13 focuses on the first gap: the `Codex -> daemon` source path.

## The Confusing Part

The phrase "install an MCP tool" hides two different questions:

- Who uses this MCP?
- Where is this MCP registered or injected?

Those are different product surfaces. Mixing them makes it look like users must
manually install multiple MCP servers just to run `aiox`, which is not the MVP
intent.

## Two MCP Categories

```text
                    ┌─────────────────────────────┐
                    │        aiox daemon           │
                    │ registry / router / status   │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
┌─────────────▼─────────────┐             ┌─────────────▼─────────────┐
│ aiox-level control MCP    │             │ agent-level runtime MCP   │
│ user-installed, optional  │             │ aiox-managed, launch only │
└─────────────┬─────────────┘             └─────────────┬─────────────┘
              │                                         │
  External tools operate aiox                Launched agents talk back
  create_pair/connect/status                 send_message/reply
```

### aiox-level control MCP

This is a user-facing control plane. It lets external tools operate aiox itself.

Example tools:

```text
aiox_create_pair
aiox_connect
aiox_status
aiox_stop
```

This can eventually have setup commands:

```text
aiox setup mcp --scope project
aiox setup mcp --scope global
```

For MVP, this is optional and Post-MVP by default.

### agent-level runtime MCP/channel

This is not something users should install manually. It is a runtime data plane
that `aiox codex` or `aiox claude` attaches only to the launched agent session.

Example Codex tools:

```text
aiox_send_message
aiox_reply
```

Example launch shape:

```text
aiox codex --name impl
  ├─ select daemon socket path
  ├─ register/resolve agent impl
  ├─ issue agent token/capability
  ├─ launch Codex with aiox runtime MCP visible only to this session
  └─ Codex calls aiox_send_message/aiox_reply when it needs to talk through daemon
```

The user should not have to run `codex mcp add ...` or edit global config to
make normal `aiox codex` work.

## Why Not One MCP?

One combined MCP looks simpler at first:

```text
aiox MCP
  ├─ create_pair
  ├─ connect
  ├─ status
  ├─ stop
  ├─ send_message
  └─ reply
```

But the permissions and identity are different.

Control tools are for an operator or external assistant. Runtime tools are for a
specific launched agent. A Codex agent named `impl` needs `send_message` and
`reply`; it should not automatically receive general daemon administration
tools such as `stop` or `connect`.

Splitting the categories keeps the security and product boundary clear:

```text
aiox-level MCP      = remote control for aiox
agent-level MCP     = per-agent radio back to daemon
```

## Global Config Policy

MVP should not mutate global Codex or Claude config by default.

Problematic behavior:

```text
aiox codex --name impl
  -> silently edits ~/.codex/config.toml
  -> all later Codex sessions see aiox runtime tools
```

That is risky because:

- unrelated Codex sessions would see tools meant for one aiox agent;
- per-agent socket/token context does not belong in global config;
- cleanup, upgrades, and conflicts become user-visible config problems.

Preferred behavior:

```text
aiox codex --name impl
  -> launch-scoped or per-agent-scoped MCP injection
  -> socket path + agent token are passed only to this launched session
  -> global Codex config remains unchanged
```

### MVP mechanism (Step 13, 2026-05-23)

aiox uses Codex CLI's `-c <key=value>` config override flag with an inline TOML
table, verified against `codex-cli 0.132.0` and recorded in
`history/39-step-13-codex-mcp-ingress.history.md`:

```text
codex [resume <session-id>] --remote <ws-endpoint>
  -c 'mcp_servers.aiox = { command = "<node>", args = ["<aiox-bin>", "mcp-codex"],
       env = { AIOX_CODEX_AGENT_NAME = "impl",
               AIOX_CODEX_AGENT_TOKEN = "<daemon-issued-uuid>",
               AIOX_SOCKET_PATH = "<daemon-socket>" } }'
```

`-c` is passed as a separate spawn argument (no shell escaping), the override
is scoped to that single Codex invocation, and `~/.codex/config.toml` is never
touched. The spawned MCP child reads the env vars and calls
`registerCodexChannel(agentName, token)` once over the daemon socket before
handling tool calls (`aiox_send_message`, `aiox_reply`).

## Daemon Namespace Skeleton

For MVP, the daemon model is intentionally simple:

```text
default socket path = one user-local daemon namespace
```

That means:

```text
~/project-a $ aiox pair --name p1
~/project-b $ aiox status
```

If both commands use the same socket path, they talk to the same daemon and the
same namespace.

Agent and pair names are unique inside that selected daemon namespace. `cwd` is
still recorded on agents, but only for status/debug output.

```text
AgentInstance
  name: impl
  kind: codex
  cwd: /Users/me/project-a
```

`cwd` does not create project isolation in MVP.

## Post-MVP Namespace Questions

These are intentionally deferred:

- Should there be one daemon per project?
- Should one daemon contain project-root namespaces?
- Should `aiox status` default to current project only?
- Should `project-a:p1` and `project-b:p1` both be allowed?
- How should `aiox setup mcp --scope project|global` install the optional
  control MCP?

Step 13 only needs the skeleton: same socket path means same daemon namespace,
and agent-level MCP gets that socket path plus an agent token at launch.

## Step 13 Implication

The Step 13 implementation should use this direction:

```text
Codex session
  └─ aiox_send_message / aiox_reply
       └─ agent-level MCP server
            └─ daemon socket + agent token
                 └─ receiveCodexMessage / receiveCodexReply
                      └─ existing sendMessage/router fan-out
```

App-server notification scraping is not the MVP authoritative source path. It
is brittle and makes source attribution harder.

## Summary

Normal MVP usage should look like this:

```text
aiox daemon start
aiox pair --name p1
aiox codex --name impl --pair p1
aiox claude --name reviewer --pair p1
```

The user does not manually install agent runtime MCPs. aiox attaches those to
the launched agent sessions.

Optional future control-plane setup is separate:

```text
aiox setup mcp --scope project
```

That is for letting external tools operate aiox, not for making launched agents
communicate with their daemon.
