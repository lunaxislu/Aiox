# Step 10 Decision: Per-Agent App-Server Runtime

Date: 2026-05-20

## Context

Predecessors:

- `history/27-step-10-codex-clear-new-rebind-spike.history.md`
- `history/28-step-10-proxy-lazy-observation.history.md`
- `history/29-step-10-per-agent-app-server-pivot.history.md`
- `history/30-step-10-per-agent-proxy-runtime.history.md`

History 30 incorrectly recorded the current production direction as
per-agent proxy port. The user corrected the direction:

```text
current plan = one Codex app-server per Codex agent
```

This document is the current Step 10 authority.

## Decision

Step 10 production path uses one Codex app-server per Codex agent:

```text
Codex TUI alpha -> codex app-server alpha
Codex TUI beta  -> codex app-server beta
```

Each app-server is launched with an OS-assigned localhost port:

```bash
codex app-server --listen ws://127.0.0.1:0
```

Aiox parses the assigned endpoint from the app-server output banner, waits for
`readyz`, then launches the TUI:

```bash
codex --remote ws://127.0.0.1:<assigned>
```

Endpoint equals agent identity boundary. The proxy attribution problem is
therefore removed from the MVP production path.

## Runtime Model

`CodexAgentRuntime` remains the product boundary:

```text
aiox daemon = local engine
CodexAgentRuntime = container-like runtime handle
  - Codex TUI process
  - per-agent Codex app-server process
  - assigned app-server endpoint
  - active Codex thread id
  - lifecycle state, logs, health, and cleanup hooks
```

This is not OS-level containerization. MVP does not provide namespaces, cgroups,
filesystem snapshots, or a separate OS. It provides a named runtime handle that
owns the adapter resources for one agent.

## Rebind Policy

Within a per-agent app-server, identity is already known by endpoint. Step 10
still tracks active thread id changes:

- `/clear` and `/new`: update the active thread id when the per-agent
  app-server reports a successful new `thread/start` / `thread/started` result.
- `/fork`: update only on a successful fork result with a new thread id and
  expected `forkedFromId`.
- Empty-thread `/fork`: `no rollout found` is an expected no-rebind error
  because there is no rollout/history to fork. Keep the old binding.

## Superseded Work

- Per-agent in-band proxy remains a validated spike and fallback idea, not the
  current production path.
- `history/28` lazy observation is historical unless proxy is revived.
- `history/30` is superseded by this document.

## Step 10 Implementation Direction

1. Define `CodexAgentRuntime` state shape.
2. Implement per-agent app-server launch with `--listen ws://127.0.0.1:0`.
3. Parse assigned endpoint from the app-server output banner and wait for
   `readyz`.
4. Launch Codex TUI with `codex --remote <assigned-endpoint>`.
5. Store runtime endpoint and active thread id in adapter state.
6. Implement injector through the per-agent app-server endpoint.
7. Add lifecycle handling: graceful shutdown, process exit, health failure,
   zombie defense, and reconnect/fallback policy.

## 2026-05-21 Launch Banner Verification

Decision 2 follow-up checked the app-server launch output directly before
locking the Phase B implementation contract.

Command shape:

```bash
codex app-server --listen ws://127.0.0.1:0
```

Observed result over 3 runs in this project environment:

- The app-server banner was emitted on **stderr**, not stdout.
- stdout was empty.
- stderr contained one observed chunk per run with:
  - `listening on: ws://127.0.0.1:<assigned>`
  - `readyz: http://127.0.0.1:<assigned>/readyz`
  - `healthz: http://127.0.0.1:<assigned>/healthz`
- Node 18 `fetch` to the emitted `readyz` URL returned HTTP 200.

Implementation consequence:

- Do not make stdout the endpoint source contract.
- Parse the endpoint/readyz banner from process output with stderr-first
  support, while draining both stdout and stderr.
- Treat stream chunk boundaries as non-contractual. Even though the banner was
  observed as one stderr chunk, implementation must accumulate chunks until the
  endpoint/readyz pattern is matched or the endpoint parse timeout expires.
- Keep draining both streams after endpoint parse so child output cannot block
  the process.

## Status

- 2026-05-20: current production direction corrected to per-agent Codex
  app-server. No implementation yet.
- 2026-05-21: launch banner verification corrected the earlier stdout
  assumption. Current contract is process output banner parse with stderr-first
  support and stdout/stderr drain.
