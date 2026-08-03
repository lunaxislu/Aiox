# Agent-level MCP Process Scoping

## Context
Injecting MCP servers globally (e.g., modifying user-wide config files like `~/.codex/config.toml` or global Claude plugin configurations) creates scope contamination. Every Codex/Claude session run by the user would try to connect to a non-existent local `aiox` daemon socket, resulting in connection errors or timeouts.

## Decision
We decided that aiox must not modify any agent's shared/global configuration space in a way that affects that agent's other, non-aiox sessions, and that MCP wiring must be scoped to the individual agent process rather than shared across all aiox agents (Global Config Policy). For Codex this means dynamic per-process injection at launch time (`-c` parameters). For Claude, the MCP server definition itself is registered once via a non-overwriting, explicit `aiox claude setup` step ([[docs/decisions/claude-channel-local-static-mcp-only]]); only the per-session identity (agent name, token, daemon socket path) is injected at launch time via env, through `${AIOX_*}` placeholders in that registered definition.

## Alternatives
- **Global MCP configuration modification**: Rejected due to scope contamination and silent daemon-connection failures for non-aiox sessions.
- **Port-based discovery registry**: Rejected as it introduces unnecessary lookup complexity.

## Rationale
Injecting tools dynamically at startup (such as `-c mcp_servers.aiox=...` for Codex, and per-process identity env for Claude's pre-registered Local-scope channel MCP) binds the channel-server directly to the CLI execution context. This isolates aiox-related tools and configurations to the active orchestrator session.

This scoping is agent-level, not aiox-level: each launched agent process receives only the MCP configuration for that agent's runtime, rather than sharing one process-global aiox MCP surface across agents.

## Trade-offs
This requires custom launcher scripts to orchestrate the correct per-process startup configurations.

## Re-evaluation
This can be re-evaluated if upstream agents support dynamic runtime tool registration/deregistration APIs without config file dependencies.

## Sources
- [[docs/architecture/local-runtime-claude-adapter]] §6 +
  [[docs/architecture/local-runtime-codex-adapter]] §7 —
  current Claude/Codex per-process MCP injection and runtime boundary.
- [[docs/decisions/codex-app-server-mcp-injection-and-isolation]] — Codex
  remote-mode refinement of which agent process owns MCP startup.
