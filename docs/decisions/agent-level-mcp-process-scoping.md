# Agent-level MCP Process Scoping

## Context
Injecting MCP servers globally (e.g., modifying user-wide config files like `~/.codex/config.toml` or global Claude plugin configurations) creates scope contamination. Every Codex/Claude session run by the user would try to connect to a non-existent local `aiox` daemon socket, resulting in connection errors or timeouts.

## Decision
We decided that global configurations must remain untouched (Global Config Policy), and ingress MCP configuration must be dynamically injected per-process scope at launch time (using `-c` parameters or inline env flags).

## Alternatives
- **Global MCP configuration modification**: Rejected due to scope contamination and silent daemon-connection failures for non-aiox sessions.
- **Port-based discovery registry**: Rejected as it introduces unnecessary lookup complexity.

## Rationale
Injecting tools dynamically at startup (such as `-c mcp_servers.aiox=...` for Codex and Strategy D plugins for Claude) binds the channel-server directly to the CLI execution context. This isolates aiox-related tools and configurations to the active orchestrator session.

## Trade-offs
This requires custom launcher scripts to orchestrate the correct per-process startup configurations.

## Re-evaluation
This can be re-evaluated if upstream agents support dynamic runtime tool registration/deregistration APIs without config file dependencies.

## Sources
- [38-step-13-mcp-scope-decision.history.md](../../history/38-step-13-mcp-scope-decision.history.md)
