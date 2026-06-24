# Codex App-Server MCP Injection And Isolation

## Context

Step 13 proved that Codex can receive the `aiox` MCP server through a per-process
`-c mcp_servers.aiox=...` override, avoiding global Codex config mutation. Step
14 then moved Codex TUI execution to `codex --remote <endpoint>`, backed by a
daemon-owned `codex app-server`.

That changed the MCP host. In remote mode, the foreground TUI is not the process
that owns and starts MCP servers; the app-server is. Injecting `mcp_servers.aiox`
into the TUI process made the remote TUI ignore the aiox MCP configuration, so
the tool did not appear.

The same investigation exposed a second boundary: a daemon-owned background
app-server can read the user's global Codex MCP config and start interactive MCP
servers in a headless process. That can hang startup or leak unrelated user
configuration into an aiox-managed runtime.

## Decision

For Codex remote mode, aiox injects the `aiox` MCP server into the daemon-owned
`codex app-server`, not into the foreground TUI process. The foreground TUI
receives only the remote endpoint arguments needed to connect.

The app-server must be treated as an aiox-managed runtime process whose MCP
configuration and credentials need per-agent isolation. The current MVP moved
the aiox MCP injection target to app-server and preserved token/socket scoping;
broader isolation from unrelated user MCP config remains a release hardening
concern owned by the adapter/runtime configuration work.

## Alternatives

- **Inject `mcp_servers.aiox` into the foreground TUI.** Rejected because the
  remote TUI is not the MCP host and ignores the injected MCP config.
- **Modify global Codex MCP config.** Rejected because it contaminates non-aiox
  Codex sessions and can create silent daemon connection failures.
- **Let app-server load the user's full global config.** Rejected as the
  long-term boundary because unrelated interactive MCP servers can run in a
  headless daemon-owned process.
- **Use an isolated Codex home/profile for the app-server.** Kept as the
  preferred hardening direction when the adapter config surface is generalized.

## Rationale

The target of MCP injection must follow the process that owns MCP startup. In
Codex remote mode, that process is `codex app-server`. The TUI is only a remote
client. Putting MCP config on the wrong process creates a false sense of
per-process scoping while the actual MCP host never receives the aiox server.

The app-server also sits on a different trust and lifecycle boundary than a
foreground user TUI. It is started by the daemon, has headless stdio, and should
carry only the agent-scoped MCP surface needed for that runtime. Reading
unrelated global MCP entries makes aiox startup depend on external interactive
auth flows and user-local configuration that the daemon does not own.

This decision refines the broader agent-level MCP scoping rule: per-process
injection is necessary, but the selected process must be the vendor runtime's
actual MCP host, and daemon-owned background hosts need config isolation.

## Trade-offs

- Moving injection to app-server requires the daemon to pre-issue the Codex
  channel token and pass agent identity/socket data across the app-server launch
  boundary.
- Isolating app-server config can hide user-declared MCP servers unless aiox
  later provides an explicit capability projection mechanism.
- A per-agent isolated profile/home adds setup and cleanup work, but avoids
  headless interactive MCP hangs and global config contamination.

## Re-evaluation

Re-evaluate this decision if Codex changes remote mode so the TUI owns MCP
startup again, or if Codex provides a first-class runtime API for dynamic MCP
registration that does not depend on process launch config.

Also re-evaluate the isolation mechanism when compose/capability projection
lands, because aiox may need to selectively project user-declared MCP servers
into the app-server rather than using a fully empty profile.

## Sources

- `docs/architecture/local-agent-runtime.md` §7.2 and §7.8 - current outcome:
  app-server launch receives `mcp_servers.aiox`, TUI receives only remote args,
  and token/socket identity crosses the MCP child handshake.
- `docs/decisions/agent-level-mcp-process-scoping.md` - broader global-config
  non-mutation and per-process MCP scoping policy refined by this decision.
