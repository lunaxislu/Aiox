# AIOX Web-first Runtime Control Contract

Related:

- [[docs/architecture/web-first-runtime-lifecycle]]

Status: Committed target

This specification owns the Web-first Gateway's externally observable runtime states,
operation invariants, and client authority boundary. Internal transition ownership,
side-effect ordering, and compensation are defined by
[[docs/architecture/web-first-runtime-lifecycle]]. This target is not a description of
the current UDS/NDJSON implementation.

## Scope and authority

- The Local Server is the sole authority for materialized AgentRuntime, HostRuntime,
  TerminalSession, and live Network projections.
- CLI, React, and the runtime-scoped MCP bridge are clients of one Gateway. A successful
  client request means the authoritative owner accepted or completed the operation as
  specified; it does not let the client write projected state.
- Controllers decide AgentRuntime and HostRuntime transitions. Adapters report normalized
  operation results and observations but never decide policy.
- Server lifecycle and Agent/Host lifecycle are independent. Server stop does not imply
  Agent or Host stop.

## AgentRuntime identity and state

Each materialization has a unique immutable AgentRuntime ID. Reusing a display name or a
Host Manifest definition creates a new ID on the next materialization and grants no
rights inherited from the prior runtime.

The AgentRuntime projection MUST expose these independent axes:

- `lifecycle`: `starting | running | stopping | stopped | failed`.
- `control`: `owned | lost | released`.
- `executionObservation.state`: `unobserved | alive | exited | unknown`.
- `executionObservation.observedAt`: timestamp of the evidence, absent only for
  `unobserved`.
- `executionObservation.source`: Adapter, PTY, OS, or vendor observation source, absent
  only for `unobserved`.

`lifecycle=running` means the owning Controller accepted launch/attach completion, still
owns a usable Runtime Binding, and has current positive execution evidence. It does not
mean the model is actively generating output.

Terminal outcomes and lifecycle causes MUST remain distinguishable:

- requested clean stop → `stopped` with `requested_stop`;
- launch/materialization failure → `failed` with `launch_failed`;
- unexpected exit → `failed` with `unexpected_exit`;
- binding/control loss → `failed` with `control_lost`;
- cleanup failure with unusable/lost control → `failed` with `cleanup_failed` or
  `control_lost`, preserving the strongest observation.

A stop-operation rejection or timeout is not by itself a Runtime lifecycle failure. If
the same Runtime Binding remains usable and current positive execution evidence is
`alive`, the failed stop operation MUST remain observable and the Runtime returns to
`running / owned / alive`. A later explicit stop may retry it. If those preconditions
cannot be established, the Runtime follows the applicable terminal failure or
control-loss transition instead.

When available, an outcome carries `exitCode` and `signal` as separate diagnostics.
Their absence MUST NOT be interpreted as zero exit or clean stop.

### Valid AgentRuntime tuples

| Lifecycle | Control | Execution observation |
| --- | --- | --- |
| `starting` | `owned` | `unobserved` or `alive` |
| `running` | `owned` | `alive` |
| `stopping` | `owned` | `alive` or `exited` |
| `stopped` | `released` | `exited` |
| `failed` | `released` | `unobserved` or `exited` |
| `failed` | `lost` | `alive`, `unknown`, or `exited` |

Every tuple not listed above is invalid. In particular, the Gateway MUST never publish
`running / lost / unknown`, any `stopped` tuple without confirmed `exited`, or any
terminal lifecycle with `control=owned`.

## AgentRuntime operation behavior

- `agent.run` creates a new runtime identity and yields an authoritative `starting`
  projection before a later success or failure projection.
- `agent.stop` is the only standalone client operation that requests AgentRuntime stop.
  A Host child is stopped under HostController policy; a client cannot bypass it with a
  standalone selector.
- A repeated stop for the same in-flight operation is idempotent and MUST NOT start a
  second cleanup attempt.
- A completed stop rejection or timeout may be retried only when the authoritative
  Runtime projection returned to `running / owned / alive`; `failed`, `lost`, and
  `released` runtimes are not retryable through `agent.stop` or `host.stop`.
- Browser disconnect, TerminalView detach, pane close, and writer-lease loss are never
  AgentRuntime stop triggers.
- Unexpected exit removes live Network membership and runtime-qualified routes before
  the failure is presented as a stable projection.
- Automatic restart is not provided in pre-v1. A later run creates a new Runtime ID.

## Connectivity identity

- Standalone Persistent Network membership and explicit route endpoints are active
  AgentRuntime IDs and are in-memory.
- Persistent Network name, ID, default policy, and metadata may be durable; active
  membership and explicit Runtime-ID edges are not.
- Host-managed Network definitions refer to Host Manifest agent definitions and are
  materialized into the current run's AgentRuntime IDs.
- Runtime departure removes its membership and all Runtime-ID edges. A replacement
  runtime does not inherit them.

## HostRuntime state and materialization

A HostRuntime has its own immutable ID and represents one accepted materialization of a
fully validated Host Manifest. Manifest agent names are definition references. They are
resolved to new AgentRuntime IDs for each Host run and MUST NOT appear as live Network
route endpoints.

The HostRuntime projection MUST expose independent axes:

- `lifecycle`: `starting | running | stopping | stopped | failed`.
- `health`: `not_applicable | healthy | degraded`.

Valid combinations are:

| Lifecycle | Health |
| --- | --- |
| `starting` | `not_applicable` |
| `running` | `healthy` or `degraded` |
| `stopping` | `not_applicable` |
| `stopped` | `not_applicable` |
| `failed` | `not_applicable` |

Every unlisted combination is invalid. `failed` means the initial Host materialization
did not succeed. `degraded` is health after a successful materialization; it is never a
lifecycle state.

### Start and compensation

- The complete Host Manifest MUST parse and pass semantic validation before a
  HostRuntime or child side effect is created.
- Host start succeeds only after every declared AgentRuntime is running and every
  Host-managed Network definition has been materialized against that run's Runtime IDs.
- If any child launch/readiness or Network materialization step fails, Host start fails.
  The HostController MUST attempt cleanup for every child, PTY, membership, and route
  created by that attempt.
- Compensation failure MUST remain visible per resource, including control-lost and
  unknown-execution evidence. It MUST NOT be collapsed into a clean Host failure.
- A failed materialization MUST NOT leave successful siblings presented as a running
  Host. Automatic retry is not provided.

### Running degradation

- After `running/healthy`, an unexpected child failure changes that AgentRuntime to its
  appropriate failed tuple and changes Host health to `degraded`.
- Host lifecycle remains `running`; unaffected siblings remain running.
- The failed child's Runtime-ID memberships and edges are removed.
- Pre-v1 does not restart the child or Host automatically. A degraded Host does not
  return to healthy by inventing replacement Runtime IDs.

### Host stop

- Only `host.stop` requests Host lifecycle stop. It does not stop the Local Server.
- A Host stop is owned by HostController and applies to all remaining Host children; a
  client cannot bypass Host policy with a standalone child selector.
- A repeated stop for the same in-flight operation is idempotent.
- `stopped` may be published only after all child outcomes are terminal and all
  Host-materialized Network state is absent.
- A child cleanup timeout or rejection MUST NOT escalate implicitly to terminate/kill.
  The Host returns to `running/degraded` and preserves each child's operation result,
  control, and execution evidence. Only a child that returns to
  `running / owned / alive` remains eligible for a later explicit `host.stop` retry;
  failed, lost, or released children remain diagnostic residuals and shutdown blockers
  when their execution may still be live.
- Already stopped siblings remain stopped and MUST NOT be restarted to reconstruct a
  healthy Host. Removed connectivity is not recreated from stale Runtime IDs.
- The timeout duration is not fixed by this contract. A separately authorized Host
  force-stop operation is outside the pre-v1 surface.

## TerminalSession state and writer authority

A TerminalSession is a Local Server-owned PTY/process-session identity, distinct from an
AgentRuntime. A runtime may have no terminal; a standalone terminal may have no runtime.
A browser TerminalView and its Pane are client UI identities and never become the
TerminalSession authority.

The TerminalSession projection exposes:

- lifecycle: `opening | open | closing | closed | lost`;
- its immutable TerminalSession ID and current server epoch;
- optional owning AgentRuntime relation;
- current PTY size as positive integer columns and rows after a successful resize;
- attachment metadata suitable for authorized clients;
- writer lease state: `unclaimed` or one claimed authenticated client connection;
- terminal outcome diagnostics, with `exitCode` and `signal` separate when observed.

The valid lifecycle/attachment/lease combinations are exhaustive:

| Lifecycle | Attachments | Writer lease |
| --- | --- | --- |
| `opening` | zero or more | `unclaimed` |
| `open` | zero or more | `unclaimed`, or claimed by exactly one attached connection |
| `closing` | zero or more | `unclaimed` |
| `closed` | none | `unclaimed` |
| `lost` | none | `unclaimed` |

Every other tuple is invalid. In particular, a writer claim cannot be recorded during
`opening`, a holder must belong to the attachment set, and `closed` or `lost` cannot
retain attachments for later reconnect.

### Lifecycle behavior

- Creation publishes `opening`; confirmed PTY readiness publishes `open`.
- Allocation or spawn failure while `opening` publishes `spawn_failed` to the current
  attachment set, removes every attachment and writer lease, and terminates as
  `closed / no attachments / unclaimed`.
- Only a standalone TerminalSession may be stopped directly. A runtime-bound terminal is
  stopped through its owning `agent.stop` or `host.stop` policy.
- Confirmed PTY exit publishes `closed`. A requested standalone or owning-runtime stop
  remains distinguishable from unexpected exit.
- Loss of the PTY handle/control without confirmed exit publishes `lost`, never
  `closed` or an invented zero exit code.
- `closed` and `lost` are terminal. Late exit evidence may enrich diagnostics but never
  reopens the session.

### Attach, disconnect, and reconnect

- Multiple authorized client connections may attach as observers to one `opening` or
  `open` TerminalSession.
- Attach does not grant writer authority. Detach, Pane close, browser refresh, and
  WebSocket disconnect remove only affected attachments.
- Removing the last attachment does not stop the TerminalSession or its owning runtime.
- Reconnect creates a new attachment, bootstraps the current server-owned projection,
  and requires a new explicit writer claim.
- A server may return bounded raw ANSI replay and must identify a replay gap when known.
  Pre-v1 does not guarantee reconstruction of a previous full-screen TUI.
- A new Local Server epoch does not recover old TerminalSessions or PTYs. Old IDs are
  absent and stale-epoch/not-found attachment is rejected.

### Writer lease and stream operations

- Exactly zero or one attached authenticated client connection holds the writer lease.
- Only the holder may send terminal input or resize the shared PTY. `cols` and `rows`
  must be positive integers calculated from the rendered terminal geometry, not CSS
  lengths.
- Writer claim requires an unclaimed open session. Release by the holder and connection
  loss atomically return the lease to `unclaimed`.
- Takeover is a distinct authorized control operation. It atomically revokes the old
  holder before granting the requester; attach or input never implies takeover.
- Input or resize from an observer, stale connection, stale session, non-open session,
  or runtime-scoped MCP bridge is rejected without changing the lease or lifecycle.
- Browser disconnect and writer loss are not AgentRuntime or TerminalSession stop
  triggers.

## Local Server shutdown contract

The externally observable Local Server lifecycle is `starting`, `running`, `quiescing`,
`stopping`, `stopped`, or `failed`. Its epoch changes on each successful bootstrap. Server
lifecycle is independent of every AgentRuntime and HostRuntime lifecycle.

### Admission barrier and normal stop

- An authorized normal stop atomically changes `running` to `quiescing` and closes
  admission for all state-mutating Gateway operations and new Controller, Runtime, Host,
  and TerminalSession registrations. Snapshot, health, and operation-status reads may
  remain available.
- The server then waits for operations admitted before the barrier to settle and computes
  one normalized active-execution dependency snapshot.
- If the blocker set is non-empty, stop is rejected with the blocker projection. The
  server returns to `running` and reopens admission without stopping an Agent, Host, or
  TerminalSession and without beginning shutdown cleanup.
- If the blocker set is empty, lifecycle becomes `stopping`; the server flushes state,
  closes Gateway/Terminal/HTTP transports, releases server-owned handles, closes its
  database, and exits.
- Persistent Network definitions, default metadata, history, observer attachments,
  writer leases, and idle clients are not active execution dependencies.

Active blockers are nonterminal AgentRuntimes, failed/lost runtimes with possibly live
execution, starting/running/stopping Hosts or incomplete Host compensation, live or
possibly-live TerminalSessions, and in-flight Controller/Adapter/PTY/Terminal/live-
Network operations. Host/child reporting may be grouped but cannot hide a blocker.

### Force stop

- Force follows the same barrier and graceful Local Server cleanup protocol.
- It bypasses only rejection caused by active execution dependencies. It does not bypass
  admission closure, state flush, transport close, handle release, or database cleanup.
- It MUST NOT invoke `agent.stop` or `host.stop`, send terminate/kill, or claim that a
  residual runtime exited.
- Before transports close, the server best-effort publishes residual dependency and
  control-loss/orphan risk. Releasing server-owned PTY handles may affect child processes,
  so survival is not guaranteed either.
- A new server epoch does not automatically re-register residual runtimes or recover old
  TerminalSessions.

A second stop request while `quiescing` or `stopping` returns the existing operation and
cannot change its mode from normal to force. Mutation requests during either lifecycle
are rejected as server shutting down and are never queued for replay. Cleanup failure
publishes `failed` while a transport remains available and MUST NOT be presented as
`stopped` or rolled back to `running` after shutdown side effects have begun.

## Client authority and capability matrix

The matrix specifies protocol authorization, not whether an initial CLI command or React
view exposes every allowed operation. `Allow` means the credential may request the
operation; the named owner still validates state and decides the transition. `Scoped`
means the authenticated Runtime ID and current Network reachability constrain every
target. `Deny` is enforced by the Gateway before domain side effects.

| Operation | CLI operator client | React operator session | Runtime-scoped MCP bridge | Decision / enforcement owner |
| --- | --- | --- | --- | --- |
| Bootstrap an absent Local Server | Local bootstrap, not Gateway | Deny; no server exists to authenticate it | Deny | CLI bootstrap and Local Server readiness |
| Read server health, snapshot, lifecycle, and operation result | Allow | Allow | Deny global state; own minimal runtime context may accompany scoped results | Gateway projection policy |
| Read Agent/Host inventory and diagnostics | Allow | Allow | Scoped reachable-peer summaries only | Gateway projection policy plus Network Service |
| Request standalone `agent.run` or `agent.stop` | Allow | Allow | Deny | StandaloneAgentController after Gateway authorization |
| Request `host.start` or `host.stop` | Allow | Allow | Deny | HostController after Gateway authorization |
| Request normal or force Local Server stop | Allow | Allow | Deny | Local Server shutdown owner and admission gate |
| Create/delete Persistent Network or change default policy | Allow | Allow | Deny | Network Service and persistent repository transaction |
| Join/leave a live Runtime ID or change explicit routes | Allow | Allow | Deny | Network Service |
| Read pending structured approvals | Allow | Allow | Deny for the generic runtime credential | Approval Broker projection policy |
| Resolve a structured approval | Allow | Allow | Deny; delegated approval requires a distinct credential class | Approval Broker plus Adapter capability |
| Attach/detach as TerminalSession observer | Allow when a client surface implements it | Allow | Deny | Terminal Service |
| Claim/release/take over terminal writer; send input or resize | Allow when attached and a client surface implements it | Allow when attached | Deny | Terminal Service, then PTY Manager for accepted I/O |
| Send/read/wait/reply to runtime messages and events | Allow | Allow | Scoped | Messaging Service with Network reachability enforcement |
| Read or mutate another Runtime ID by supplying a source identity | Allow only under operator target selection | Allow only under operator target selection | Deny; source identity is credential-derived | Gateway authentication and scope policy |
| Write lifecycle, lease, approval, or Network projection directly | Deny | Deny | Deny | No client; only the owning Controller/service may mutate |

CLI and React operator access use the same operator credential class and therefore cannot
silently diverge in security authority. Product navigation may omit a command or control;
that is surface availability, not a weaker or stronger principal. All mutation requests
also pass the Local Server admission gate, so an otherwise allowed request is rejected
while the server is `quiescing` or `stopping`.

Runtime-scoped MCP requirements:

- derive `sourceAgentRuntimeId` from the authenticated credential and ignore/reject any
  caller-supplied replacement;
- filter peer discovery, message reads, waits, sends, replies, and delivery events by the
  source runtime's current Network reachability and message scope;
- reject stale, stopped, released, or wrong-epoch runtime credentials;
- do not infer structured capability from raw PTY output; and
- do not gain approval or terminal-writer authority through attach, message content, or
  Adapter-specific tool naming.

Current Codex and Claude MCP servers expose `send`, `reply`,
`aiox_retransmit_unconfirmed_delivery`, and `agents_list`. That is current implementation
evidence, not a promise that the rewrite retains those exact tool names. The target
generic messaging surface may name send/read/wait/reply operations during protocol design
but MUST preserve the scoped authority above.

## Pre-v1 exclusions

The target does not promise automatic runtime restart, server-restart PTY recovery,
disconnected TUI screen reconstruction, pair/connect/compose compatibility, UDS/NDJSON
compatibility, or old database migration compatibility.

The legacy [[docs/specs/aiox-capability-policy]] still contains compose/daemon command
and projection terminology. Those clauses are lineage for the current implementation,
not authority for this Web-first committed target. Their canonical disposition and
replacement are owned by Stage 9 cutover; they MUST NOT override the Runtime, Gateway,
Network, or client-authority contract in this document.

Sources:

- `logs/artifacts/aiox-web-first-accepted-target-baseline.md` §§3–4, 6–7, 9–14, 18–21.
- `logs/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts.md` — Stage 0 decision provenance.
