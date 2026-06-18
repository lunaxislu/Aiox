# Go-to-TypeScript Rewrite Decision

## Context
During early prototyping, a central Go-based HTTP router was evaluated. However, standard MCP tool calls are pull-based; the orchestrator could not actively force a model to start a task or inject unsolicited turns into a receiving agent's active model context or TUI transcript.

## Decision
We decided to rewrite the central runtime in TypeScript and implement a dedicated client runtime structure containing custom transcript adapters (WebSocket hook + `turn/start` for Codex, development channel plugin + `notifications/claude/channel` for Claude) to support bidirectional local daemon orchestration.

## Alternatives
- **Central HTTP Router only**: Rejected because MCP-only pushes cannot automatically force the model to start a new turn.
- **Process-level terminal injection (e.g., cmux/tmux controller)**: Rejected because multi-terminal splitting and terminal interface controls lack a standard cross-platform API, introducing complex non-portable platform dependencies.

## Rationale
Using TypeScript allows the runtime to share domain schemas cleanly with the node binary ecosystem. Dedicated channel/app servers control the lifecycle without global system contamination, while UDS socket multiplexing provides lightweight, reliable local IPC.

## Trade-offs
Introducing custom client runtimes and launcher scripts increases local bootstrap complexity and requires a running background daemon process, rather than relying on a stateless universal MCP tool.

## Re-evaluation
This decision can be re-evaluated if the Model Context Protocol introduces standard push-based orchestration primitives or first-class agent-to-agent session management.

## Sources
- [13-aiox-rewrite-decision.history.md](../../history/13-aiox-rewrite-decision.history.md)
