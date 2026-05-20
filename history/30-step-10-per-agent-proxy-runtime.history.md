# Step 10 Decision: Per-Agent Proxy Runtime

> **STATUS (2026-05-20)**: Superseded before implementation.
> This file incorrectly recorded the current production path as per-agent
> proxy port. The user corrected the current direction to **one Codex
> app-server per Codex agent**. Current authority:
> `history/31-step-10-per-agent-app-server-runtime.history.md`.

Date: 2026-05-20

## Context

Predecessors:

- `history/27-step-10-codex-clear-new-rebind-spike.history.md`
- `history/28-step-10-proxy-lazy-observation.history.md`
- `history/29-step-10-per-agent-app-server-pivot.history.md`

History 27/28 validated per-agent in-band WebSocket proxy attribution for
Codex `/clear` and `/new` through same-client `thread/start` request/response
correlation. History 29 recorded a serious alternative: per-agent Codex
app-server. That alternative makes attribution trivial, but costs one Codex
app-server process per agent.

After reviewing the trade-off, the user chose the current Step 10 production
direction:

```text
per-agent proxy port + shared Codex app-server
```

Per-agent app-server remains a reliable fallback, not the first production path.

## Decision

Step 10 uses one proxy endpoint per Codex agent:

```text
Codex TUI alpha -> proxy alpha -> shared codex app-server
Codex TUI beta  -> proxy beta  -> shared codex app-server
```

The proxy endpoint is the agent identity boundary. Binding authority remains
same-client request/response correlation observed on that agent's proxy
connection:

- `/clear`: `thread/start` with `sessionStartSource: "clear"`; successful
  response `result.thread.id` gives the new active thread id.
- `/new`: `thread/start` with `sessionStartSource: null`; successful response
  `result.thread.id` gives the new active thread id.
- `/fork`: `thread/fork`; only a successful response with a new thread id and
  matching `forkedFromId` can rebind. Empty-thread `no rollout found` is an
  expected no-rebind error because there is no rollout/history to fork. Other
  error responses also keep the old binding unless a later policy says
  otherwise.

Broadcast `thread/started` remains context only and is never binding authority
by itself.

## Alternatives Kept

1. **Per-agent app-server**
   - Strong fallback. Endpoint equals agent, so attribution is trivial.
   - Local measurement on Codex CLI `v0.131.0`: empty app-server was about
     94 MB RSS total across the Node wrapper and Rust `codex app-server`
     process, with boot to readyz under one second.
   - Codex supports `--listen ws://127.0.0.1:0`, so OS-assigned ports avoid
     developer port collisions.
   - Deferred because the user chose to continue with proxy-first for Step 10.

2. **One proxy listener with per-agent connection state**
   - Possible future optimization to reduce visible listener count.
   - Still needs connection-local binding state and an agent identity token
     such as path/query/capability token.
   - Deferred because per-agent proxy port is simpler and already matches the
     validated spike.

3. **One proxy listener with one shared upstream connection**
   - Not recommended for MVP. It requires JSON-RPC id namespace multiplexing,
     response demux, broadcast notification routing, and close/error
     propagation. That turns the proxy into a Codex protocol router.

## Product Model: Aiox Runtime As Engine

The user's Docker analogy is useful, with one important limit.

Docker does not create a full VM per workload; Docker Engine manages isolated
containers on top of the host. Aiox can follow the same product shape at the
agent-runtime level, but without promising OS-level containerization in MVP.

```text
aiox daemon = local engine
CodexAgentRuntime = container-like runtime handle
  - Codex TUI process
  - per-agent proxy endpoint
  - shared app-server connection
  - active Codex thread id
  - lifecycle state, logs, health, and cleanup hooks
```

This is a product/runtime abstraction, not a claim that MVP provides Linux
namespaces, cgroups, filesystem isolation, or a virtual OS. Future versions can
add stronger isolation behind the same runtime model: process groups, cgroups
on Linux, per-agent worktree/cwd, network tokens, or even per-agent app-server.

The important product direction is:

```text
Users think in named agent runtimes.
Implementation details such as proxy-per-agent, one proxy listener, or
per-agent app-server can change behind that boundary.
```

## Step 10 Implementation Direction

Phase A should define a `CodexAgentRuntime` contract before coding adapter
details:

1. Runtime owns a per-agent proxy listener endpoint.
2. Runtime launches Codex TUI with `codex --remote <proxy-url>`.
3. Runtime connects each proxy to the shared Codex app-server.
4. Runtime tracks current active thread id from same-client binding events.
5. Runtime exposes injection target metadata to the daemon adapter.
6. Runtime health includes proxy listener, upstream connection, TUI process
   liveness where available, and binding certainty.
7. Runtime cleanup closes proxy sockets and marks the agent disconnected/stale
   according to adapter policy.

Transparent relay tests from history/27 remain required. Lazy observation from
history/28 remains a performance refinement, but relay correctness comes first.

## Status

- 2026-05-20: production direction set to per-agent proxy port + shared Codex
  app-server. Per-agent app-server retained as fallback. No implementation yet.
