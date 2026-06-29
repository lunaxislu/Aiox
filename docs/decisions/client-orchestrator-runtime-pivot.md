# TypeScript Runtime and Client Orchestrator Pivot

## Context
During early prototyping, the predecessor implementation under
`legacy/bridge-relay-v1/` proved that MCP tool calls could route cooperative
messages, but not force a target model to wake up or inject an unsolicited turn
into its TUI transcript. A stateless central MCP router alone was therefore not
enough for the product goal.

## Decision
We decided to pivot to a TypeScript-based background daemon architecture with client launch/runtime surfaces and agent-specific transcript injection adapters to support bidirectional local orchestration, preserving legacy implementations under `legacy/bridge-relay-v1/`. The current process and adapter ownership is documented in [[docs/architecture/local-agent-runtime]].

## Alternatives
- **Central HTTP Router only**: Rejected because MCP-only pulls cannot push turns or wake up target models without explicit polling triggers.
- **Process-level terminal split injection (e.g., automated cmux/tmux layout spawning)**: Rejected because terminal multiplexers lack a standard cross-platform automation API. We decided to decouple terminal split layout management from `aiox` core, leaving terminal-specific layout recipes (an earlier rewrite-decision iteration cited a `cmux-pair.sh`-style recipe, not present on disk now) and manual layout instructions for portability.

## Rationale
- **Orchestrator and Registry**: Transitioning from a simple 1:1 bridge model to a central background orchestrator daemon enables managing agent identities dynamically via memory registries and supporting 1:N logical routes.
- **Structured Lifecycle**: The rewrite rejected synchronous timeout as the primary failure model for long-running work and instead required an explicit asynchronous lifecycle. The current delivery-state outcome is documented in [[docs/architecture/local-runtime-routing-and-delivery]] §8.1 and §8.4.
- **Unified Ecosystem**: TypeScript allows runtime schemas to be shared directly with standard Node/TUI CLI environments, while UDS transport provides fast local IPC.

## Trade-offs
- Introducing custom client launchers and a persistent background daemon increases execution bootstrapping complexity compared to stateless MCP tools.

## Re-evaluation
- This decision can be re-evaluated if MCP introduces standard push-based orchestration primitives or native agent-to-agent session routing APIs.

## Sources
- `legacy/bridge-relay-v1/bridge/README.md` — preserved predecessor bridge
  behavior and MCP-only routing shape.
