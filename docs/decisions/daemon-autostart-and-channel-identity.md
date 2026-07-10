# Daemon Auto-start Policy and Claude Channel Key Identity

## Context
Splitting the runtime into a persistent socket-backed daemon and transient CLI clients requires coordinating when the background daemon starts. Additionally, in Step 14, dynamically naming the Claude MCP server keys (e.g. `aiox-claude-${command.name}`) inside Claude's `.mcp.json` configuration file caused launch mismatches because Claude resolves MCP servers statically by key name.

## Decision
We decided to enforce command-specific daemon auto-start policies (where only agent execution commands start the daemon, while status/control commands connect-only), and use a static, immutable key name (`aiox-claude-ingress`) in the Claude configuration file, passing runtime-scoped agent identities through environment variables instead of key overrides.

## Alternatives
- **Auto-start daemon on all CLI commands**: Rejected because user control commands like `aiox status` or `aiox daemon status` should fail fast and return clean status reports when the daemon is not running, rather than starting a new detached process.
- **Dynamic key name generation in `.mcp.json`**: Rejected because updating the global configuration with dynamic keys is prone to sync errors and crashes the Claude Code session if a concurrent instance modifies the config file.

## Rationale
- **Auto-start Policy (WHY)**: Only agent-execution commands that need a live daemon to do their work (`aiox codex`, `aiox claude`) auto-start it; control/status commands (`aiox status`, `aiox connect`, `aiox pair`, `aiox daemon status`) are connect-only and fail fast when the daemon is absent. WHY split this way: a status/control command that silently spawns a detached daemon would hide "the daemon is not running" — the exact signal the operator asked for — and could fork orphaned processes from a query. The per-command auto-start vs connect-only table is CLI-surface behavior owned by the architecture doc; see [[docs/architecture/local-runtime-daemon-transport-api]] §4.1 (auto-start wiring) and [[docs/architecture/local-runtime-cli-and-operator-surfaces]] §9.1 (Command Table) rather than re-enumerating it here.
- **Static Ingress Key (WHY)**: Bind the channel server identity to a single static name `aiox-claude-ingress` rather than deriving it per-command (`aiox-claude-${command.name}`). WHY: Claude Code resolves MCP servers statically by key name, so a dynamically generated key drifts between the config write and Claude's lookup and causes launch mismatches; a static name avoids that. The active agent token and daemon socket path do **not** need to be baked into the key — they are injected at launch time as env overrides (`AIOX_SOCKET_PATH`, `AIOX_CLAUDE_CHANNEL_TOKEN`), so a single static identity isolates per-session execution context without per-command key rewrites. Current activation names differ by strategy and are owned by [[docs/architecture/local-runtime-claude-adapter]] §6.1–§6.2. This decision owns only the WHY for avoiding per-command dynamic MCP keys.

## Trade-offs
- Setting a static key means multiple parallel Claude sessions on the same machine share the same tool declaration in the configuration file, although their runtime environments remain isolated.

## Re-evaluation
- Revisit this naming and startup contract if Claude Code supports dynamic tool list injections during shell session initialization without file system writes.

## Sources
- Step 14 daemon/client split smoke provenance and Claude `.mcp.json` mismatch: `logs/workspace-reset/retained-provenance/2026-06-23-workspace-reset-aiox-smoke-test-archive.md` §2.
