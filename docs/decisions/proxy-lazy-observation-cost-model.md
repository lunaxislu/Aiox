# Proxy Lazy Observation Cost Model

## Context
Running a transparent WebSocket proxy per Codex agent introduces performance risks (CPU usage, event loop blocking) in Node.js when parsing large binary/text frames (MB-level logs, file patches, shell output).

## Decision
We decided to separate the relay obligation from the attribution observation. The proxy forwards all WebSocket frames unconditionally and does not require full `JSON.parse` for the relay path. Current proxy behavior is owned by [[docs/architecture/local-runtime-codex-adapter]] §7.4.

## Alternatives
- **Full JSON Parsing**: Rejected because parsing MB-level payloads in every frame would cause event loop lag in Node.js, directly impacting interactive CLI latency.
- **No Proxy (Direct API-only)**: Rejected because the orchestrator cannot observe user-triggered TUI mutations (such as `/new`, `/resume`, `/fork`) without intercepting WebSocket signals.

## Rationale
Relaying frames without making JSON parsing a precondition is extremely performant in Node.js. On client-to-server frames, `indexOf` filters (`"thread/start"`, `"thread/resume"`, `"thread/fork"`) isolate binding request candidates with minimal overhead before full `JSON.parse`. On server-to-client frames, the proxy skips parsing entirely when no client-side binding is currently pending.

## Trade-offs
If the message format changes slightly (e.g., whitespace variations inside the binding method key string), the pattern matching could fail.

## Re-evaluation
This cost model can be re-evaluated if Codex provides first-class event hook callbacks directly via Unix Socket or HTTP, removing the need for a proxy.

## Sources
- `logs/workspace-reset/retained-provenance/2026-06-23-workspace-reset-codex-proxy-attribution-archive.md` — retained
  proxy attribution signal mapping and lazy-observation measurement digest.
