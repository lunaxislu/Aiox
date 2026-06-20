# Daemon Auto-start Policy and Claude Channel Key Identity

## Context
Splitting the runtime into a persistent socket-backed daemon and transient CLI clients requires coordinating when the background daemon starts. Additionally, in Step 14, dynamically naming the Claude MCP server keys (e.g. `aiox-claude-${command.name}`) inside Claude's `.mcp.json` configuration file caused launch mismatches because Claude resolves MCP servers statically by key name.

## Decision
We decided to enforce command-specific daemon auto-start policies (where only agent execution commands start the daemon, while status/control commands connect-only), and use a static, immutable key name (`aiox-claude-ingress`) in the Claude configuration file, passing runtime-scoped agent identities through environment variables instead of key overrides.

## Alternatives
- **Auto-start daemon on all CLI commands**: Rejected because user control commands like `aiox status` or `aiox daemon status` should fail fast and return clean status reports when the daemon is not running, rather than starting a new detached process.
- **Dynamic key name generation in `.mcp.json`**: Rejected because updating the global configuration with dynamic keys is prone to sync errors and crashes the Claude Code session if a concurrent instance modifies the config file.

## Rationale
- **Auto-start Policy (WHY)**: Only agent-execution commands that need a live daemon to do their work (`aiox codex`, `aiox claude`) auto-start it; control/status commands (`aiox status`, `aiox connect`, `aiox pair`, `aiox daemon status`) are connect-only and fail fast when the daemon is absent. WHY split this way: a status/control command that silently spawns a detached daemon would hide "the daemon is not running" — the exact signal the operator asked for — and could fork orphaned processes from a query. The per-command auto-start vs connect-only table is CLI-surface behavior owned by the architecture doc; see `docs/architecture/local-agent-runtime.md` §4.1 (auto-start wiring) and §9.1 (Command Table) rather than re-enumerating it here.
- **Static Ingress Key (WHY)**: Bind the channel server identity to a single static name `aiox-claude-ingress` rather than deriving it per-command (`aiox-claude-${command.name}`). WHY: Claude Code resolves MCP servers statically by key name, so a dynamically generated key drifts between the config write and Claude's lookup and causes launch mismatches; a static name avoids that. The active agent token and daemon socket path do **not** need to be baked into the key — they are injected at launch time as env overrides (`AIOX_SOCKET_PATH`, `AIOX_CLAUDE_CHANNEL_TOKEN`), so a single static identity isolates per-session execution context without per-command key rewrites.

  Scope note (current as-built): `aiox-claude-ingress` is the static channel identity name used as the legacy inline (A) path's injected `mcpServers` key (`src/cli/invocation.ts:213`) — injected one-off via `--mcp-config`, not written to a permanent `.mcp.json` (`src/adapters/claude/launcher.ts:92-93, 106-107`). It is also the plugin name (`CLAUDE_CHANNEL_PLUGIN_NAME`, `invocation.ts:35`) for the default (D) plugin path, whose own bundled `.mcp.json` carries only `${VAR}` placeholders (`launcher.ts:186`). Either way the WHY holds: one static identity, no per-command key generation. This name is distinct from the channel-server's MCP self-name `aiox-claude-${agentName}` (`src/adapters/claude/channel-server.ts:262`); do not conflate the two.

## Trade-offs
- Setting a static key means multiple parallel Claude sessions on the same machine share the same tool declaration in the configuration file, although their runtime environments remain isolated.

## Re-evaluation
- Revisit this naming and startup contract if Claude Code supports dynamic tool list injections during shell session initialization without file system writes.

## Sources
- [40-step-14-daemon-client-split.history.md](../../history/40-step-14-daemon-client-split.history.md)
- Auto-start wiring: `src/cli/invocation.ts:166` (`agent-attach` calls `startDaemon()`); control/status commands (`status`, `connect`, `disconnect`, `pair-create`, `daemon-status`) call `getDaemonApi()` only (`invocation.ts:148-152, 262-289`).
- Static channel identity `aiox-claude-ingress`: `src/cli/invocation.ts:213` (inline-A `mcpServers` key) and `:35` (`CLAUDE_CHANNEL_PLUGIN_NAME`); env injection `AIOX_SOCKET_PATH` + `AIOX_CLAUDE_CHANNEL_TOKEN` at `src/adapters/claude/launcher.ts:204-205` (plugin path) and `:112-113` (inline path); channel-server self-name `aiox-claude-${agentName}` at `src/adapters/claude/channel-server.ts:262`.
- CLI-surface command behavior and auto-start (architecture authority): `docs/architecture/local-agent-runtime.md` §4.1 (auto-start wiring), §9.1 (Command Table).
