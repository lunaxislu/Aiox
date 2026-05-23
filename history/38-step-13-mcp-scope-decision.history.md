# Step 13 — MCP Scope Decision

## Context
As part of Step 13, we need an authoritative source path from Codex back into the `aiox` daemon. The preferred mechanism is an explicit adapter callback using an `aiox`-owned MCP server. However, injecting an MCP server into Codex or Claude raises questions about global state mutation and the boundaries between `aiox` orchestrator APIs and individual agent sessions.

## Finding
MCP servers can serve two completely different purposes in this ecosystem:
1. **aiox-level MCP**: Providing orchestrator-level tools (e.g., "list active pairs", "disconnect routes", "read daemon status") to external clients.
2. **agent-level MCP**: Providing an ingress back into `aiox` solely for a specific agent session (e.g., `aiox_send_message`, `aiox_reply`) to facilitate bidirectional routing.

Modifying global configuration files (`~/.codex/config.toml` or global Claude config) to inject agent-level MCP servers creates significant risks. It forces every instance of Codex/Claude launched by the user—even those unrelated to `aiox`—to attempt to connect to an `aiox` MCP server that may only be relevant to a specific orchestrator session.

## Decision
1. **aiox-level MCP**: This is designated as an optional control plane and is a **Post-MVP** setup target. It will not be implemented in Step 13.
2. **agent-level MCP**: This is an `aiox`-managed, launch-scoped runtime MCP. It is the designated target for Step 13.
3. **Global Config Policy**: `aiox` MUST NOT automatically modify global Codex or Claude configuration files to inject MCP servers. All MCP server injections must be scoped exclusively to the process launched by `aiox` (e.g., via temporary configuration files, specific environment variables, or launch flags like `-c`).
4. **Daemon Namespace Skeleton**: The MVP default daemon is a user-local singleton selected by socket path. Same socket path means same daemon namespace. Agent/pair names are unique inside that selected namespace. Agent `cwd` is recorded for observability only and does not create project isolation in MVP.

## Deferred Post-MVP Decisions

- Project-local daemon vs user-local singleton.
- Project-root namespace inside one daemon.
- Current-project filtered `aiox status`.
- Same agent/pair name reuse across different projects.
- User-facing `aiox setup mcp --scope project|global` install UX for the optional aiox-level control MCP.

## Verification Requirements
Implementation of the agent-level MCP injection in Step 13 must first empirically verify a configuration mechanism that respects the **Global Config Policy** without relying on unverified assumptions about Codex CLI arguments (such as assuming `-c` accepts a path without testing).
