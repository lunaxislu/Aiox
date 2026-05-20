# Step 10 Pivot: From In-Band Proxy to Per-Agent App-Server

> **STATUS (2026-05-20)**: Restored as the basis for the current production
> direction. The final authority is
> `history/31-step-10-per-agent-app-server-runtime.history.md`, which confirms
> one Codex app-server per Codex agent with OS-assigned localhost ports.

Date: 2026-05-20

## Context

`history/27` and `history/28` selected **per-agent in-band WebSocket proxy +
shared Codex app-server** as the Step 10 attribution mechanism for
`/clear`·`/new`·`/fork` rebind. Spike data, transparent relay decision, and
lazy observation cost model were all built on that choice.

After history/28 was written, the user raised the natural question:

> 야 근데 이렇게 websocket으로 proxy 띄울거면 각각의 codex마다 app-server를
> 띄우는게 더 나으려나?

This document records the cross-validation with codex and the resulting
**pivot to per-agent Codex app-server**. The pivot supersedes the proxy
choice in the production path.

## Decision

**Step 10 production path: per-agent Codex app-server (one
`codex app-server` Rust process per aiox Codex agent).**

The in-band WebSocket proxy spike (`spikes/codex-app-server-multi-session-poc/inband-proxy.ts`),
the transparent relay decision (history/27), and the lazy observation
proposal (history/28) are preserved as **spike/exploration records, not
production design**. Their authority is downgraded to "validated but not
chosen".

Implementation constraints:

1. **OS-assigned port**: each app-server launched with
   `codex app-server --listen ws://127.0.0.1:0`. Parse the actual assigned
   port from stdout and store in agent state. No fixed-port allocation, no
   port collision with developer-occupied ports.
2. **TUI launch**: `codex --remote ws://127.0.0.1:<assigned>` for each agent.
3. **Attribution**: trivially self-evident. endpoint = agent. No proxy
   needed.
4. **Lifecycle**: aiox daemon is the supervisor — start/stop/health check
   per app-server, zombie process defense, graceful shutdown on agent
   detach.

## Cross-Validation Summary (codex)

Three questions were submitted to codex with explicit anti-sunk-cost
instruction. codex's responses, condensed:

### Q-A: WebSocket layer replacement (closure / `new Proxy`)

- **A-1**: closure refactor is cosmetic. `pendingBindings` is already
  connection-local; `new Proxy` is a JS object trap and does not change
  WebSocket frame boundaries.
- **A-2**: WebSocket endpoint itself cannot be replaced. Codex TUI is an
  external process and `codex --remote` only accepts `ws://` / `wss://`
  endpoints. A daemon-internal in-memory client has no place for the TUI to
  connect.
- Authority: https://developers.openai.com/codex/cli/features#connect-the-tui-to-a-remote-app-server,
  https://developers.openai.com/codex/cli/reference#command-overview.

### Q-B: proxy vs per-agent app-server tradeoff

codex measurements (Codex CLI v0.131.0, empty app-server, local):

| Item | per-agent app-server |
|---|---|
| Node wrapper RSS | ~47 MB |
| Rust codex app-server RSS | ~47 MB |
| **Total per agent** | **~94 MB** |
| FD | Node ~12 + Rust ~25 ≈ ~37 |
| Boot to readyz | < 1 s |
| Model API client / SQLite / log handle / thread cache | process-local |

- **shared app-server's real gains are limited**: process-local HTTP/model
  client reuse, thread cache, MCP/config init sharing. None of these
  justify attribution complexity in local single-user + low-agent-count
  scenario.
- **per-agent lifecycle is not free** (graceful shutdown, health, port,
  zombies) but is a *standard process supervision problem*, easier than
  protocol-transparent relay + lazy parse + rebind attribution.
- **Codex's design intent**: app-server is documented as a remote TUI /
  debug / local dev endpoint and is still **Experimental**. No authority
  signal that "multiplex many aiox agent identities through one
  app-server" is a supported pattern.
- **Recommendation**: pivot to per-agent app-server. Premise: local
  single-user, agent count single-digit, ~100MB idle RSS per agent
  acceptable.

### Q-C: virtual port / port collision (user follow-up)

- Codex supports OS-assigned port via `--listen ws://127.0.0.1:0`.
- Verified locally: server emits `listening on: ws://127.0.0.1:<assigned>`
  on stdout, plus `readyz`/`healthz` HTTP endpoints on the same port.
- Workflow: launch with `:0` → parse stdout → wait for readyz → launch TUI
  with `--remote ws://127.0.0.1:<assigned>` → store endpoint in agent state.
- Atomic port allocation. No "find free port then bind" race.

### Q-D: one proxy listener for multiple TUIs (user follow-up)

This question was about whether the proxy choice could be salvaged by
sharing one proxy listener across agents.

- Possible but complex. Three structural options:
  1. **per-agent proxy port** (current spike): simple, multiple ports.
  2. **one proxy listener + per-agent upstream connection**: one port,
     identity via path/query/token (e.g. `ws://127.0.0.1:<p>/codex/alpha?token=...`).
     State still split per connection.
  3. **one proxy listener + shared upstream connection**: requires manual
     JSON-RPC id namespace multiplex, server notification broadcast demux,
     close/error propagation. Becomes a quasi-router, not a transparent
     proxy. **MVP not recommended.**
- codex's note: if proxy is kept, option 2 is least bad. But since we are
  pivoting away from proxy entirely, this question's value is in
  documenting *why proxy salvage was rejected*, not in choosing among
  options.

## Why the Pivot Is the Right Call

Independent reasons that compound:

1. **Attribution problem disappears** at the protocol layer. endpoint =
   agent is trivially self-evident. No spike, no policy, no regression
   matrix for `/clear`·`/new`·`/fork` rebind.
2. **Codex design alignment**. Codex documents app-server as per-session;
   running one per agent matches that intent. Proxy multiplex is against
   the grain.
3. **Resource cost is acceptable** for MVP target scenario (local
   single-user, single-digit agent count). ~100 MB × N is not the
   bottleneck.
4. **Operational simplicity**. Process supervision is a well-known pattern.
   Protocol-transparent relay + lazy parse + binding correlation is novel
   and Codex-protocol-specific, with forward-compat risk on every Codex
   release.
5. **Codex app-server is Experimental**. Building a transparent relay
   against an experimental protocol is structurally risky; per-process
   isolation localizes the blast radius of protocol breakage.
6. **Port collision concern resolved** via `--listen ws://127.0.0.1:0`.
   Developer-occupied ports no longer a worry.
7. **Sunk cost explicitly excluded** from the evaluation. codex
   cross-validation was instructed to ignore prior proxy work; the
   recommendation still favors pivot.

## Supersede Map From This Intermediate Branch

This map records what this branch supersedes now that per-agent app-server is
the current production direction. Current authority is
`history/31-step-10-per-agent-app-server-runtime.history.md`.

| Artifact | Pre-pivot status | Post-pivot status |
|---|---|---|
| `history/27` "Decision: Proxy Is Transparent Relay for All Frames" | Production decision | **Spike validation result. Production decision superseded by this document.** Spike record retained for Codex protocol understanding. |
| `history/28` lazy observation working note | Pending implementation | **Premise invalidated for production by per-agent app-server.** Preserved as fallback proxy exploration. |
| `docs/aiox/proxy-cost-model.md` | Learning record (active) | **Learning record (historical).** Captures Codex behavior under shared app-server + proxy hypothesis. Not a guide to current production. |
| `docs/aiox/proxy-attribution-signals.md` | Learning record (active) | **Learning record (active).** Codex `/clear`·`/new`·`/fork` signal mapping is intrinsic to Codex protocol and still valuable for any future Codex attribution work, including per-agent app-server crash recovery and rebind on resume. |
| `spikes/codex-app-server-multi-session-poc/inband-proxy.ts` | Production-bound spike | **Validated spike, not production.** Retain in spike folder. README to mark "validated but not chosen". |
| `spikes/codex-app-server-multi-session-poc/inband-proxy.test.ts` | Pending regression expansion | **Frozen.** No further test additions. |
| `plan/mvp-implementation-checklist.md` Step 10 entry | "In-band proxy attribution" | **Replace with**: "Per-agent app-server lifecycle + OS-assigned port + TUI launch wiring". |

Each affected document will receive a `> **STATUS (2026-05-20)**:` marker
at the top citing this history file.

## Migration Plan (Step 10 Implementation Direction)

Phase A — design decisions (to be opened in Step 10 Phase A walkthrough,
**not in this document**):

1. **App-server launch contract**: command, args, working directory,
   environment, stdout/stderr capture, readyz polling timeout, failure
   modes.
2. **Lifecycle ownership**: who starts (daemon on agent attach), who stops
   (daemon on detach/exit), who restarts (on crash detected via readyz or
   process exit).
3. **State persistence**: agent ↔ endpoint mapping in
   `AgentInstance.adapter_session_id` (now app-server endpoint + active
   thread id) or new column. SQLite migration if needed.
4. **Health check policy**: readyz interval, failure threshold, recovery
   semantics for in-flight turn.
5. **TUI launch wiring**: pass `--remote ws://127.0.0.1:<assigned>` from
   stored endpoint. Handle endpoint change on app-server restart.
6. **`/clear`·`/new`·`/fork` rebind under per-agent app-server**: now
   purely about updating `adapter_session_id.thread_id`, not about
   identity. Source signal: `thread/started` notifications on the
   per-agent connection (no ambiguity).
7. **Crash recovery semantics**: app-server died — what state survives,
   what is lost, what is reported to user.
8. **Resource limits**: max concurrent agents, soft/hard caps, error
   path when exceeded.

Phase B — implementation (codex delegated, Claude-reviewed cycle per
[[aiox-collaboration-workflow]]).

This document is the *pivot decision*; Phase A/B decisions are out of scope
here.

## Open Questions Deferred to Phase A

1. Does Codex app-server expose a stable signal for "ready to accept TUI"
   beyond readyz? Race between port emitted and TUI connectable.
2. What happens if a single agent's app-server is killed mid-turn — does
   the TUI display a useful error, or does aiox need to surface it?
3. Is there a meaningful difference between killing the app-server vs
   killing the TUI for graceful exit?
4. Can app-servers share an MCP server config or do they each load
   independently? Affects launch cost if MCP setup is expensive.
5. The proxy-cost-model.md `frame.length` measurement hook is now moot;
   should any measurement carry forward to per-agent benchmarks (RSS
   curves under N agents, model API client pool behavior under N parallel
   turns)?

## Status

- 2026-05-20: pivot decision recorded. Supersede markers to be added to
  affected documents in the same commit window. No code changes yet —
  Step 10 implementation enters new Phase A.

## Cross-References

- `history/27-step-10-codex-clear-new-rebind-spike.history.md` — spike that
  this document supersedes (production decision). Spike data retained.
- `history/28-step-10-proxy-lazy-observation.history.md` — proposal whose
  premise this document invalidates.
- `docs/aiox/proxy-vs-app-server-tradeoff.md` — user-facing learning
  record of the cross-validation that led to this pivot.
- `spikes/codex-app-server-multi-session-poc/inband-proxy.ts` — validated
  but not chosen.
- Codex CLI docs:
  https://developers.openai.com/codex/cli/features#connect-the-tui-to-a-remote-app-server,
  https://developers.openai.com/codex/cli/reference#command-overview.
