# Step 10 Codex In-Band Proxy: Lazy Observation Working Note

> **STATUS (2026-05-20)**: Step 10 production 방향은 **Codex agent 1개당
> app-server 1개, port는 OS 자동 할당**이다. 권위:
> `history/31-step-10-per-agent-app-server-runtime.history.md`.
>
> 이 문서의 lazy observation은 proxy design을 다시 선택할 때의
> historical/fallback performance refinement로 보존한다.

Date: 2026-05-20

## Context

Predecessor: `history/27-step-10-codex-clear-new-rebind-spike.history.md`.

Step 10 selected **per-agent in-band WebSocket proxy** as the rebind
attribution mechanism for shared Codex app-server (`/clear`·`/new`·`/fork`).
The "Decision: Proxy Is Transparent Relay for All Frames" section of
history/27 locked in *what* the proxy does to traffic: every frame is
forwarded in both directions unchanged.

This document is the follow-up on **how much it costs to do that** and how
to keep the cost in line with the proxy's actual purpose.

User-facing learning record: `docs/aiox/proxy-cost-model.md` (visualizations,
intuition).

## Question that opened this thread

User question:

> 대신에 해당 codex 1개당 proxy 하나가 매핑되는데 성능적으로 문제가 될일이
> 있을지가 궁금한데.

User follow-up insight (this is the key framing for the rest of the doc):

> 결국 proxy는 /new /fork /clear 등에 대한 rebind를 위한 건데.

## Cost Analysis (Per-Agent In-Band Proxy)

Static per-agent resource cost:

| Item | Cost | Notes |
|---|---|---|
| Memory (per proxy, in-process) | KB – low MB | WebSocket buffer + Map + closure. No process fork. |
| File descriptors | 1 listener + 2 connections = **3 FD/agent** | macOS default ulimit 256; 80 agents touches it. `ulimit -n` raises trivially. |
| Ports | 1/agent on loopback | Dynamic (`listenPort: 0`) avoids collisions. 60K capacity. |
| Hop latency | localhost loopback < 0.1 ms | Negligible vs Codex turn latency. |
| CPU per frame | 1× `JSON.parse` + Map lookup + observe callback | Scales with frame size. |

Real risks (Node.js single thread):

1. **Event loop blocking on large frames.** A single agent's large frame
   (1MB+ patch, large exec output, big file read) sync-parses in
   `observeUpstreamFrame`, blocking every other proxy's relay during that
   parse.
2. **Parsing all frames.** Current `inband-proxy.ts` lines 142, 160 call
   `JSON.parse` unconditionally, even for frames that cannot possibly be a
   binding-method message. Token-stream `item/delta` events compound this
   with high frequency.
3. **Single-process chokepoint.** All proxies run inside the daemon event
   loop. A daemon crash drops every agent's Codex connection at once.

## "Large frame" candidates from Codex app-server traffic

| Kind | Approx size | Trigger |
|---|---|---|
| `item` patch / file_change | tens of KB – several MB | Codex rewrites large generated files, lockfiles, snapshots. |
| `exec` command output | 100 KB – several MB | `pnpm install`, `cargo build`, `pytest -v`, `find .`, full test output. |
| `read_file` / FileRead | tens of KB – several MB | `pnpm-lock.yaml`, big logs/CSV, generated TS. |
| MCP tool result | variable | DB query result, web fetch body, search dump. |
| Thread resume history dump | hundreds of KB – several MB | Long conversation re-attach. |
| `patch_apply` plan | tens of KB | Large multi-file refactor plan. |
| Stack trace / error | usually < 50 KB | Rust/Node panic. |

`JSON.parse` ballpark on V8 (~500 MB/s):

| Frame size | Parse time | Effect |
|---|---|---|
| 1 KB | ~2 µs | negligible |
| 100 KB | ~0.2 ms | negligible |
| 1 MB | ~2 ms | mild cross-agent lag |
| 10 MB | ~20 ms | visible, blocks all other agents |

Risk threshold: a single frame parse ≥ 5–10 ms, or cumulative parse rate
exceeding event loop budget.

## Reframing from User Insight

The user reframed the problem:

> proxy의 본질 = `/clear`·`/new`·`/fork` rebind를 위한 attribution.

This separates two roles of the proxy:

- **Relay obligation** — always-on, transparent forwarding of every frame.
  This is what the "transparent relay" decision in history/27 enforces.
- **Attribution observation** — `thread/start`/`thread/fork` request/response
  correlation. This is **the only reason the proxy exists**, and it is only
  relevant during the short window around a slash command (tens of ms).

Current `inband-proxy.ts` pays observation cost (JSON.parse) **always**,
even when there is nothing to observe. The transparent relay decision is
fine; the cost model is not.

## Proposed Implementation: Lazy Observation

Rule:

> Relay always. Observation only when a cheap pre-filter says it might
> matter.

### client → server frames

```text
1. send (relay) immediately.
2. cheap substring sniff:
     frame.indexOf("thread/start") !== -1
   || frame.indexOf("thread/fork")  !== -1
3. only the survivors get JSON.parse'd; register pending binding id on
   confirmed binding-method request.
```

`String.indexOf` / `Buffer.indexOf` runs at ~GB/s, so even a 1MB frame is µs.

### server → client frames

```text
1. send (relay) immediately.
2. early bail: pendingBindings.size === 0  ->  skip observation entirely.
3. else: if frame.length >= 4 KB           ->  skip (binding response is
                                                 always small).
         else                              ->  JSON.parse; if message.id is
                                                 in pendingBindings, run
                                                 observeUpstreamFrame.
```

Justifications:

- Binding responses carry thread metadata only — empirically < 1 KB in
  history/27 spike logs. 4 KB cutoff has wide margin.
- 99% of upstream frames during normal turns (item delta, exec output, file
  read) either hit the early bail or the size cutoff.
- An alternative if 4 KB cutoff feels fragile: substring-match `frame`
  against each outstanding pending id (UUID/integer ids work either way) and
  only parse when there is a match. Same cost class.

### Side benefits

- Cost is proportional to *binding events*, not *traffic volume*.
- Cost is independent of frame size in the common case.
- Transparent relay decision is untouched: relay is still always-first.
- Forward compatibility: if Codex adds new method names, only the
  pre-filter substring list needs updating, not the parse logic.

## What Did Not Change

- The "Decision: Proxy Is Transparent Relay for All Frames" rule from
  history/27 still holds: every frame is forwarded unchanged. No frame is
  delayed, rewritten, swallowed, or synthesized by the proxy.
- `binding_uncertain` semantics from history/27 are unchanged.
- Daemon-side error handling for binding-method errors is unchanged.
- `--cd <unique-per-agent-symlink>` fallback is unchanged.

## Why Per-Agent Process Isolation Is Deferred

Splitting each proxy into its own child process would isolate event loop
blocking entirely. It is *not* the first choice because:

- Lazy observation already removes the main JSON.parse cost in normal
  traffic — the structural reason to fork was sync parse of large frames.
- Process supervision adds complexity: lifecycle, restart, IPC, FD
  inheritance, signal forwarding.
- Adds latency hop (additional IPC).
- The current spike scope is to validate proxy attribution, not to optimize
  scheduling.

Revisit if measurement after lazy observation still shows event loop lag at
target agent counts.

## Measurement Plan (Before Optimization)

Optimization decision depends on data. Add measurement hook **before**
implementing lazy observation:

1. In `inband-proxy.ts` `observe` events, include `frame.length` on
   `jsonrpc_frame` entries (one-line change).
2. Run a realistic Codex workload: 1 / 5 / 10 / 20 concurrent agents
   performing turn that produces large file read, large patch, and full
   `pnpm install`-class exec output.
3. Record:
   - frame size distribution per method.
   - daemon RSS over time.
   - event loop lag (e.g., setInterval drift sampling).
   - end-to-end turn latency.

If frame size distribution confirms ≥ 1MB frames at meaningful rate, lazy
observation is justified. Otherwise the change can wait without risk.

## Regression Test Plan (After Implementation)

Add tests to
`spikes/codex-app-server-multi-session-poc/inband-proxy.test.ts`:

1. **Large frame does not trigger observation.** Send a 10 KB+ upstream
   `item/delta` shape. Assert: client receives exact frame; no
   `binding_candidate`; no `binding_uncertain`; parse counter (spy) shows
   zero calls.
2. **Binding-method substring miss is cheap-skipped.** Send an arbitrary
   client method (`turn/start`, `thread/loaded/list`) whose payload does
   not contain `thread/start` or `thread/fork` substrings. Assert: no
   pending binding registered; no JSON.parse spy call.
3. **Binding request/response still works.** Same as the existing positive
   test; lock in that lazy filter did not break the happy path.
4. **pendingBindings empty + upstream frame = skip parse.** With no
   pending request, send any upstream frame (notification, large or
   small). Assert: no JSON.parse spy call; relay still happens.
5. **pendingBindings non-empty + large upstream frame = skip parse.**
   Register a pending id by sending `thread/start` request, then send a
   ≥ 4 KB upstream frame with that same id (synthetic edge case). Assert:
   relay happens; observation skips parse; `binding_uncertain { reason:
   "missing_thread_id" or similar }` is *not* emitted (skip is silent).
6. **All four passthrough cases from history/27 still pass** (binding
   error, server-initiated request, non-binding notification,
   unknown-method frame).

## Open Questions / Followups

1. Does Codex app-server ever return a binding response close to 4 KB
   when `agentNickname`/`agentRole`/`name` are populated? If so, the size
   cutoff should be widened (8 KB or 16 KB) after measurement.
2. Should the proxy expose an optional "always parse" debug mode for
   diagnostics, even when lazy observation is enabled in production?
3. Once lazy observation is in, is there any reason left to keep
   `parseJsonRpcMessage` running on frames that hit the cheap filter but
   are not binding methods? Probably no, but confirm via tests.

## Cross-References

- `history/27-step-10-codex-clear-new-rebind-spike.history.md` — authority
  for the transparent relay decision this builds on. See "Decision: Proxy
  Is Transparent Relay for All Frames".
- `docs/aiox/proxy-cost-model.md` — user-facing learning record with full
  visualizations and intuition.
- `spikes/codex-app-server-multi-session-poc/inband-proxy.ts` — current
  implementation that will be modified.
- `spikes/codex-app-server-multi-session-poc/inband-proxy.test.ts` —
  regression test target.
- `plan/mvp-implementation-checklist.md` — Step 10 entry to update once
  measurement + lazy observation lands.

## Status

- 2026-05-20: working note created. Measurement hook, lazy observation
  implementation, and regression tests not yet started. No commits.
