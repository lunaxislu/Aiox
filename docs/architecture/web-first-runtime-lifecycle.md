# AIOX Web-first Runtime Lifecycle Architecture

Related:

- [[docs/specs/aiox-runtime-control]]
- [[docs/architecture/local-agent-runtime]]
- [[docs/architecture/web-first-workspace-boundaries]]

Status: Target

This slice owns the Web-first Local Server's internal runtime responsibility boundaries,
lifecycle transition ownership, side-effect ordering, and compensation rules. The
externally observable state meanings and client authority contract are owned by
[[docs/specs/aiox-runtime-control]]. The existing MVP implementation remains documented
by the as-built `local-agent-runtime` index and its slices; it is evidence, not the target
architecture defined here.

## Responsibility composition

```text
Local Server — authoritative live registry, Gateway, shutdown authority
├─ StandaloneAgentController — standalone AgentRuntime transition policy
├─ HostController — HostRuntime and child AgentRuntime transition policy
├─ Adapter Runtime Binding — vendor launch, attach, observe, communicate, cleanup
├─ PTY Manager — AIOX-managed PTY resources and exit observations
├─ Terminal Service — TerminalSession identity, attachments, writer leases
└─ Network Service — membership and routing invariants

CLI / React / runtime-scoped MCP bridge
└─ Gateway clients; never authoritative lifecycle state owners
```

Controllers decide lifecycle transitions and execution policy. Adapter Runtime Bindings
perform vendor-specific operations and return normalized observations. The PTY Manager
owns PTY handles but never mutates an AgentRuntime directly. The Network Service alone
applies connectivity invariants. The Local Server serializes accepted transitions into
its authoritative materialized state before publishing the resulting Gateway event.

```text
client request or Adapter/PTY observation
→ owning Controller validates the precondition
→ Local Server records the authoritative transition
→ Adapter, PTY, and Network side effects run in the defined order
→ success or compensation is recorded
→ Gateway publishes the resulting projection change
```

## Current implementation boundary [Status: As-built]

The pre-rewrite implementation does not already satisfy this target:

- Managed Codex runtime lifecycle is one enum, `starting | ready | failed | disposed`,
  without separate control and execution-observation axes
  ([[src/daemon/state.ts]] — `src/daemon/state.ts:248-251`;
  [[src/adapters/codex/runtime.ts]] — `src/adapters/codex/runtime.ts:34-69`).
- A ready Codex child exit or WebSocket close marks that runtime failed, and the daemon
  callback removes the live agent row rather than preserving a materialized failed
  runtime projection ([[src/adapters/codex/runtime.ts]] —
  `src/adapters/codex/runtime.ts:166-193`;
  [[tests/unit/daemon/codex-runtime-failure-production-wiring.test.ts]] —
  `tests/unit/daemon/codex-runtime-failure-production-wiring.test.ts:48-105`).
- Current global stop has no admission barrier or active-execution guard. It cancels
  timers, optionally removes connected agents, disposes managed Codex runtimes, and
  returns success ([[src/daemon/state.ts]] — `src/daemon/state.ts:1692-1733`).

These are current facts only. They do not constrain the target state model below.

The Stage 2 bootstrap now establishes a narrower current boundary beside that legacy
runtime: it preflights the static index, binds an IPv4-loopback HTTP server, installs the
single `/ws/control` upgrade lane, and atomically publishes endpoint discovery only after
those resources are ready. Startup publication failure closes the listener; accepted
stop best-effort cleans Control sockets, the listener, and only the matching epoch's
discovery and credential records. The Control boundary now also validates exact loopback Host/Origin, requires a
separate session credential for atomic `gateway.subscribe`, and projects the minimal
server lifecycle through a single GatewayState-owned version/sequence cursor. The shared
client replaces its projection on connect/reconnect and resubscribes instead of applying
an epoch, sequence, or version mismatch. The Local Server now also owns the generic
admission/shutdown coordinator described below: barrier acquisition is synchronous,
pre-barrier operations settle before one normalized blocker snapshot, normal rejection
reopens admission, and force changes only that blocker decision. The CLI consumes this
authority through `server.stop`; it never writes lifecycle locally. Current dependency
producers are test/composition seams only—Agent, Host, Terminal, Network, and database
production integration remains deferred.

The React GatewayStore is now the browser-side copy boundary for this minimal projection.
It receives snapshots and validated events from the shared reconnect client, never calls
GatewayState or a lifecycle setter, and preserves the last projection as visibly stale
while connection state is `reconnecting`. A replacement snapshot supersedes that copy.
Stop-request pending and blocker results remain UI/operation state rather than invented
server lifecycle transitions.

An accepted `server.stop` response is flushed before cleanup when possible, but response
delivery is not a shutdown precondition. The response callback, connection close, or
synchronous send failure converges on one idempotent after-response action so a client
disconnect cannot leave the Local Server permanently `stopping` with admission closed.

Evidence:

- [[apps/server/src/bootstrap/local-server.ts]] — `apps/server/src/bootstrap/local-server.ts:69-147`
- [[apps/server/src/gateway/control/websocket-server.ts]] — `apps/server/src/gateway/control/websocket-server.ts:14-59`
- [[apps/server/src/gateway/control/authenticated-session.ts]] — `apps/server/src/gateway/control/authenticated-session.ts:50-137`
- [[apps/server/src/gateway/state/gateway-state.ts]] — `apps/server/src/gateway/state/gateway-state.ts:21-85`
- [[apps/server/src/runtime-files/endpoint-discovery.ts]] — `apps/server/src/runtime-files/endpoint-discovery.ts:10-46`
- [[tests/contract/gateway-subscription.test.ts]] — `tests/contract/gateway-subscription.test.ts:67-224`
- [[tests/integration/gateway-session.test.ts]] — `tests/integration/gateway-session.test.ts:47-179`
- [[apps/server/src/gateway/state/shutdown-coordinator.ts]] — `apps/server/src/gateway/state/shutdown-coordinator.ts:10-139`
- [[apps/cli/src/operations.ts]] — `apps/cli/src/operations.ts:40-283`
- [[tests/contract/server-shutdown.test.ts]] — `tests/contract/server-shutdown.test.ts:12-117`
- [[tests/integration/server-stop-gateway.test.ts]] — `tests/integration/server-stop-gateway.test.ts:37-126`
- [[apps/web/src/gateway-store.ts]] — `apps/web/src/gateway-store.ts:12-147`
- [[apps/web/src/app.tsx]] — `apps/web/src/app.tsx:5-126`
- [[tests/browser/gateway-store.test.tsx]] — `tests/browser/gateway-store.test.tsx:91-216`
- [[tests/integration/web-first-cli-bin.test.ts]] — `tests/integration/web-first-cli-bin.test.ts:44-160`

## AgentRuntime axes and invariants

Every materialization attempt receives a new immutable AgentRuntime ID. A Host Manifest
agent name is a definition reference, not that ID. Standalone Persistent Network
membership and explicit routes use the current AgentRuntime ID; Host-managed network
definitions resolve to the new IDs on each Host start.

The authoritative AgentRuntime projection separates three axes defined by the external
contract:

- lifecycle — Controller-owned materialization outcome;
- control — whether an AIOX Controller still owns a usable Runtime Binding;
- execution observation — timestamped Adapter, PTY, OS, or vendor evidence.

A Controller may apply a transition only after validating the complete current tuple.
An Adapter, PTY callback, registry, Network, or client cannot apply a lifecycle
transition independently.

### AgentRuntime transition table

The Gateway-event column names semantic projection changes. Stage 2 may choose wire
method/event spelling, but must preserve the stated payload meaning.

| Trigger | Precondition | Current state | Next state | Transition owner | Adapter side effect | PTY side effect | Network side effect | Gateway event | Failure / compensation | Invalid transition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accepted standalone run or Host materialization intent | Definition/adapter input valid; new Runtime ID; Local Server admits registrations | absent | `starting / owned / unobserved` | StandaloneAgentController or HostController | Create a Runtime Binding and begin vendor launch | Allocate only when the binding requests an AIOX-managed PTY | None before execution is confirmed | AgentRuntime added with `starting` | Any created binding/PTY is cleaned up; record `failed / released / unobserved` or the stronger exit observation | Reusing a Runtime ID; request while server admission is closed; duplicate active materialization of the same Host definition instance |
| Normalized launch-ready observation | Binding identity matches; lifecycle `starting`; control `owned`; execution evidence is current | `starting / owned / unobserved-or-alive` | `running / owned / alive` | Owning Agent Controller | Retain ready binding | Retain live PTY when present | Join requested standalone networks, or apply Host-materialized membership/routes | Lifecycle changed to `running` with observation source/time | If Network application fails, remove applied connectivity, request Adapter/PTY cleanup, and finish `failed`; compensation failure is retained | Ready for a different Runtime ID; ready after a terminal lifecycle; ready without an owned binding |
| Explicit `agent.stop` or owning Host stop | lifecycle `starting` or `running`; control `owned` | `starting-or-running / owned / current observation` | `stopping / owned / current observation` | Owning Agent Controller | Request vendor cleanup/termination | PTY remains owned until Adapter/PTY confirms closure | Remove membership and runtime-qualified edges before further delivery | Lifecycle changed to `stopping` | Remain `stopping` until confirmed exit, a retryable stop-operation failure, or control loss is classified; timeout alone does not prove Runtime failure | Stop from `stopped`; stop by Adapter/PTY/Network/client directly; stop a Host child outside HostController policy |
| Stop cleanup rejects or times out while execution remains controllable | lifecycle `stopping`; the stop operation has settled unsuccessfully; the same binding is usable and current positive execution evidence is `alive` | `stopping / owned / alive` | `running / owned / alive` | Owning Agent Controller | Retain the usable binding for a later explicit stop retry; do not terminate or kill implicitly | Retain the live PTY/session when present | Keep membership and Runtime-ID edges removed; do not recreate stale connectivity | Stop operation failed, then AgentRuntime lifecycle returned to `running` with the current observation | If usable control or current liveness cannot be established, follow the control-loss or terminal-failure path instead; the failed stop result remains observable | Returning to `running` without an owned usable binding and current alive evidence; recreating removed connectivity; implicit terminate/kill; treating the failed operation as a successful stop |
| Expected exit after stop | lifecycle `stopping`; observation belongs to the active binding | `stopping / owned / alive-or-exited` | `stopped / released / exited` | Owning Agent Controller | Release binding after its cleanup settles | Close/release associated runtime-bound session | Verify runtime membership and edges are absent | Lifecycle changed to `stopped`, outcome `requested_stop` | Cleanup errors are retained even if exit is confirmed; a still-usable resource prevents `stopped` | Exit observation for another binding; `stopped` while control remains owned or observation is not `exited` |
| Unexpected execution exit | lifecycle `starting` or `running`; matching direct exit evidence | `starting-or-running / owned / current observation` | `failed / released / exited` | Owning Agent Controller | Release/clean remaining binding resources | Close the associated runtime-bound TerminalSession with the same outcome | Remove memberships and runtime-qualified edges | Lifecycle changed to `failed`, outcome `unexpected_exit` | Best-effort cleanup failures are attached to the failure; no automatic restart | Converting unexpected exit to `stopped`; retaining network presence; Adapter directly changing lifecycle |
| Control channel/binding loss without confirmed exit | lifecycle `starting`, `running`, or `stopping`; matching loss observation | nonterminal lifecycle with `owned` control | `failed / lost / unknown` | Owning Agent Controller | Stop issuing operations through the lost binding; retain diagnostic identity only | Mark an associated live session `lost` if its PTY control is also lost | Remove memberships and runtime-qualified edges | Lifecycle changed to `failed`, outcome `control_lost` | No process-liveness claim and no automatic recovery; a later exit is diagnostic enrichment, not lifecycle resurrection | Keeping lifecycle `running`; claiming `released` without cleanup/exit evidence; automatically attaching a replacement binding |
| Repeated stop request while stop is in flight | Same Runtime ID and active stop operation | `stopping / owned / *` | unchanged | Owning Agent Controller | Return the existing operation/result handle | None | None | No duplicate lifecycle event | Original stop result remains authoritative | Starting a second cleanup operation or changing requested-stop into force semantics |
| Late observation after terminal lifecycle | Observation identity matches but lifecycle is terminal | terminal lifecycle with released or lost control | lifecycle/control unchanged; observation diagnostic may become `exited` | Owning Agent Controller | None except idempotent handle release | Idempotent session outcome enrichment | None | Diagnostic update only when new evidence is stronger | Never undo a terminal lifecycle or recreate network state | Any transition back to a nonterminal lifecycle; accepting evidence for a different binding |

### AgentRuntime impossible combinations

`*` below means the observation value does not make the tuple valid by itself.

| Lifecycle | Allowed control | Allowed execution observation | Impossible examples |
| --- | --- | --- | --- |
| `starting` | `owned` | `unobserved`, `alive` | `starting/lost/*`, `starting/released/*`, `starting/*/exited` |
| `running` | `owned` | `alive` | `running/lost/unknown`, `running/released/*`, `running/owned/unobserved` |
| `stopping` | `owned` | `alive`, `exited` | `stopping/lost/*` (must become `failed`), `stopping/released/*` |
| `stopped` | `released` | `exited` | `stopped/owned/*`, `stopped/lost/*`, stopped with `alive`, `unknown`, or `unobserved` |
| `failed` | `released`, `lost` | `unobserved`, `exited` when released; `alive`, `unknown`, `exited` when lost | `failed/owned/*`, released failure with `alive` or `unknown`, `failed/lost/unobserved` |

An `alive` observation is evidence at its `observedAt` instant, not a perpetual liveness
claim. Once control is lost and current liveness cannot be confirmed, the Controller
records `unknown`; it never presents `running / lost / unknown` as current fact.

## HostRuntime lifecycle and health

HostRuntime is the HostController materialization of one validated Host Manifest. Its
identity is distinct from every child AgentRuntime identity. Host lifecycle answers
whether that materialization was established; health answers whether an established,
running materialization still has all declared children in their expected running
condition.

```text
validate the complete Host Manifest
→ create HostRuntime starting
→ materialize every child AgentRuntime
→ materialize Host-managed Network definitions into those Runtime IDs
→ all succeed: running / healthy
→ any fail before success: compensate every created child and network effect
→ failed / not_applicable, retaining every compensation result
```

The policy is **all-running or compensating cleanup**. The current implementation's
partial-success behavior is not retained: today a failed surface launch detaches only
that child and can return Host start success while earlier children survive
([[src/host/host-controller.ts]] — `src/host/host-controller.ts:249-267,370-383`;
[[tests/unit/host/host-controller-integration.test.ts]] —
`tests/unit/host/host-controller-integration.test.ts:85-151`).

After a Host has reached `running`, a child failure no longer rewrites the historical
materialization result. The affected child becomes failed, its connectivity is removed,
the Host remains `running`, and health becomes `degraded`. Siblings continue without
automatic restart.

### HostRuntime transition table

| Trigger | Precondition | Current state | Next state | Transition owner | Adapter side effect | PTY side effect | Network side effect | Gateway event | Failure / compensation | Invalid transition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accepted `host.start` | Entire manifest parses and validates; adapter preflight succeeds; server admits registrations | absent | `starting / not_applicable` | HostController | Prepare bindings; no child is yet declared successful | Allocate only as each binding requires | Validate definitions but create no live edge before Runtime IDs exist | HostRuntime added with `starting` | Pre-admission validation failure creates no HostRuntime or side effect | Duplicate active manifest materialization; request during closed admission; partial validation followed by launch |
| All child launches and Host network materialization succeed | Every declared child is `running / owned / alive`; all definition references resolve to this run's Runtime IDs | `starting / not_applicable` | `running / healthy` | HostController | Retain every ready binding | Retain each optional live PTY | Atomically expose Host memberships, defaults, and materialized edges | Host lifecycle `running`, health `healthy` | A failure in the final network application enters the same compensation path as child launch failure | Publishing running before every child and network invariant succeeds; carrying definition names as live route endpoints |
| Any child launch/ready or Host network step fails during materialization | Host lifecycle `starting`; failure belongs to this materialization attempt | `starting / not_applicable` | `failed / not_applicable` after compensation settles | HostController | Request cleanup for every binding created by the attempt, including previously successful children | Close/release every created PTY; retain per-resource failures | Remove every membership/edge created by the attempt | Host lifecycle `failed` with launch and compensation results | Cleanup is best-effort but exhaustive; failed cleanup produces child `failed/lost` evidence and remains an active server-shutdown dependency | Returning partial start success; leaving successful siblings as a running Host; hiding cleanup failure; auto-retrying launch |
| Child exits or loses control after Host is running | Matching child belonged to this HostRuntime and Host lifecycle is `running` | `running / healthy-or-degraded` | `running / degraded` | HostController, consuming the child Controller result | No sibling operation; release failed child's binding as Agent contract permits | Close or mark lost only the affected session | Remove affected Runtime ID membership and edges; keep sibling connectivity | Child failure plus Host health `degraded` | Record the child cause and cleanup result; no child or Host auto-restart | Changing Host lifecycle to `failed`; stopping healthy siblings; keeping failed child routes; reporting `healthy` |
| Explicit `host.stop` accepted | Host lifecycle `running`; no other Host stop operation active | `running / healthy-or-degraded` | `stopping / not_applicable` | HostController | Request stop for every remaining controlled child under Host policy | Runtime-bound PTYs follow their Agent stop operations | Remove Host-managed connectivity as child stop begins | Host lifecycle `stopping` | Successful and failed child cleanup results are collected; no implicit force escalation | Client stopping a child outside HostController; Host stop changing Local Server lifecycle; duplicate cleanup operation |
| One or more child cleanup operations timeout or reject | Host lifecycle `stopping`; at least one child is not confirmed terminal or released | `stopping / not_applicable` | `running / degraded` | HostController | Do not escalate to terminate/kill; children with a usable binding and current alive evidence follow the AgentRuntime retryable stop-failure transition, while lost/released children remain failed | Retain live sessions only for retryable controlled children; mark lost sessions accurately and never recreate a closed PTY | Keep Host-managed connectivity removed; do not recreate prior edges for any child | Host stop failed plus lifecycle `running`, health `degraded`, and per-child operation/lifecycle results | Already stopped siblings remain stopped; no automatic restart; a later explicit `host.stop` retries only children that returned to `running / owned / alive` | Publishing `stopped`; retrying a failed/lost or released child; implicit kill; restoring stopped siblings or stale routes |
| Every controlled child and Host network effect is released | Host lifecycle `stopping`; all child outcomes are terminal and no residual controlled resource exists | `stopping / not_applicable` | `stopped / not_applicable` | HostController | Release remaining bindings | Release all Host-owned session relations | Verify all materialized membership/edges are absent | Host lifecycle `stopped`, outcome `requested_stop` | Cleanup diagnostics remain observable even after successful terminalization | `stopped` with a live/unknown child dependency or materialized route |
| Repeated `host.stop` while stop is in flight | Same HostRuntime ID and active stop operation | `stopping / not_applicable` | unchanged | HostController | Return the existing operation/result handle | None | None | No duplicate lifecycle event | Original stop result remains authoritative | Starting a second child cleanup sweep or adding force semantics |

### HostRuntime valid state combinations

| Lifecycle | Allowed health | Meaning |
| --- | --- | --- |
| `starting` | `not_applicable` | Materialization has not established the Host invariant |
| `running` | `healthy`, `degraded` | Materialization succeeded; health describes current child condition |
| `stopping` | `not_applicable` | Explicit Host cleanup is in progress |
| `stopped` | `not_applicable` | Explicit Host cleanup completed with no live/unknown child dependency |
| `failed` | `not_applicable` | Initial materialization failed, including any retained compensation diagnostics |

Every other lifecycle/health pair is impossible. In particular, `starting/healthy`,
`failed/degraded`, and `stopped/healthy` conflate materialization outcome with running
health.

### Host stop cleanup failure [Status: Target]

A normal `host.stop` timeout or cleanup rejection does not automatically escalate to
terminate/kill. The observable policy is:

```text
one or more child cleanup operations timeout or reject
→ do not implicitly escalate to force/kill
→ classify each child using the AgentRuntime stop-failure transitions
→ usable binding + current alive evidence: running / owned / alive and retryable
→ lost/released control: failed and not retryable through host.stop
→ HostRuntime returns to running / degraded
→ already stopped siblings remain stopped; no automatic restart
→ explicit host.stop may retry only children that returned to running / owned / alive
```

The exact timeout duration remains an implementation/configuration decision, but it may
not change this no-implicit-force policy. A separately authorized Host force-stop
surface is not part of the pre-v1 contract.

## TerminalSession identity and lifecycle

A TerminalSession is a Local Server-owned identity for one AIOX-managed PTY/process
session. It is never the AgentRuntime ID. An AgentRuntime may have zero or one associated
runtime-bound TerminalSession; a standalone shell TerminalSession may have no
AgentRuntime. A TerminalView is a browser-owned renderer attachment and a Pane is only a
layout container.

The Terminal Service owns three independent axes:

- lifecycle — `opening | open | closing | closed | lost`;
- attachments — the set of authenticated Gateway client connections currently
  observing the session;
- writer lease — `unclaimed` or `claimed` by exactly one attached connection.

The PTY Manager owns the PTY handle and produces ready, output, resize-result, and exit
observations. It does not decide AgentRuntime lifecycle. A runtime-bound PTY exit is
reported to the owning Agent Controller, which applies the AgentRuntime transition.

```text
browser attach
→ observer receives current session metadata and future PTY output
→ explicit writer claim
→ authenticated input/resize accepted only from lease holder
→ disconnect or release drops the lease, not the TerminalSession
→ reconnect creates a new attachment and must claim again
```

The current implementation has no Local Server TerminalSession or managed PTY boundary.
Claude and Codex TUI launchers attach the foreground child directly to inherited stdio
([[src/adapters/claude/launcher.ts]] — `src/adapters/claude/launcher.ts:110-122`;
[[src/adapters/codex/launcher.ts]] — `src/adapters/codex/launcher.ts:99-106`).

### TerminalSession transition table

| Trigger | Precondition | Current state | Next state | Transition owner | Adapter side effect | PTY side effect | Network side effect | Gateway event | Failure / compensation | Invalid transition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Accepted terminal creation | Server admits sessions; new session ID; valid standalone intent or owning Runtime Binding request | absent | `opening / no attachments / unclaimed` | Terminal Service | Runtime Binding receives the session relation when runtime-bound | PTY Manager allocates and begins spawn | None | TerminalSession added with `opening` | Allocation/spawn failure delivers `spawn_failed` to the pre-transition attachment set, atomically releases any attachments and writer lease, closes created handles, and finishes `closed / no attachments / unclaimed` | Reused session ID; create during shutdown admission barrier; browser creating a runtime-bound session directly; retaining attachments after spawn failure |
| PTY ready | Matching PTY handle is live; lifecycle `opening` | `opening / any attachments / unclaimed` | `open / same attachments / unclaimed` | Terminal Service, consuming PTY observation | Binding may consume ready result; no lifecycle policy change | Retain PTY and begin stream fan-out | None | Terminal lifecycle `open` plus integer cols/rows | If readiness fails or PTY exits, close the session and report the observation | Ready for another handle; ready after `closing`, `closed`, or `lost`; carrying a writer claim out of `opening` |
| Authenticated observer attach | lifecycle `opening` or `open`; client authorized for the session | same lifecycle / attachment absent / valid lease | same lifecycle / attachment added / same lease | Terminal Service | None | Begin output delivery; optional bounded raw replay may precede live output | None | Attachment added with replay/gap metadata | Stream bootstrap failure removes only the new attachment | Attach to `closing`, `closed`, or `lost`; attach without authorization; implicit writer grant |
| Explicit observer detach or Pane close | Attachment exists; lifecycle is `opening`, `open`, or `closing` | nonterminal lifecycle / attachment present / valid lease | same lifecycle / attachment removed / unclaimed if holder detached | Terminal Service | None | Stop output delivery to that view; keep PTY running or closing as already directed | None | Attachment removed and optional writer release | Detach is idempotent for an already absent view; it never closes session/runtime | Treating last detach as PTY, Agent, or Host stop; detach changing lifecycle |
| Browser/Control/Terminal connection loss | One or more attachments belong to the lost connection; lifecycle is `opening`, `open`, or `closing` | nonterminal lifecycle / affected attachments / valid lease | same lifecycle / affected attachments removed / unclaimed if holder disconnected | Terminal Service | None | Keep the PTY in its existing running or closing operation | None | Attachment removals and writer release | Cleanup all connection-owned attachments atomically; no runtime transition | Stopping session/runtime; retaining a lease for a dead connection; transferring lease implicitly |
| Explicit writer claim | lifecycle `open`; requester is attached and authorized; lease `unclaimed` | `open / requester attached / unclaimed` | `open / same attachments / claimed by requester` | Terminal Service | None | None | None | Writer claimed | Failed response leaves lease unclaimed | Claim by detached/unauthorized client; claim while another holder exists without takeover |
| Explicit writer takeover | lifecycle `open`; requester attached with takeover authority; another live holder exists | `open / both attached / claimed by old holder` | `open / same attachments / claimed by requester` | Terminal Service | None | Serialize switch before accepting new input/resize | None | Writer released from old holder then claimed by requester in one ordered change | If authorization fails, old holder remains; no split-brain interval | Implicit takeover on attach/input; two holders; takeover by runtime-scoped MCP bridge |
| Writer release | Requester is current holder, or its connection is being removed | `open / attachments / claimed by requester` | `open / attachments / unclaimed` | Terminal Service | None | Stop accepting requester input/resize after the ordered release | None | Writer released | Repeated release is idempotent | One client releasing another client's lease without takeover authority |
| Terminal input | lifecycle `open`; authenticated stream maps to current attached lease holder | unchanged | unchanged | Terminal Service authorizes; PTY Manager performs | Adapter does not inspect or authorize bytes | Write bytes to matching PTY | None | No lifecycle event; input failure diagnostic when applicable | Write failure triggers PTY observation handling; it never silently changes holder | Input from observer/non-holder, stale connection/session, any non-open lifecycle, or MCP bridge |
| Terminal resize | lifecycle `open`; requester is current attached lease holder; cols/rows are valid positive integers | unchanged | unchanged, with authoritative size metadata updated after success | Terminal Service authorizes; PTY Manager performs | None | Invoke PTY resize with integer cols/rows | None | Terminal size changed | Failed resize retains previous authoritative size and emits diagnostic | CSS length; non-integer/non-positive size; resize by observer/non-holder; stale session |
| Explicit standalone terminal stop | lifecycle `opening` or `open`; session has no owning AgentRuntime | opening-or-open / any attachments / any lease | `closing / same attachments / unclaimed` | Terminal Service | None | Request PTY/process cleanup | None | Terminal lifecycle `closing` and writer release | Cleanup failure or control loss finishes `lost`; preserve strongest PTY observation | Direct stop of runtime-bound session; Pane close as stop; stop from terminal lifecycle |
| PTY exit | Matching PTY; lifecycle `opening`, `open`, or `closing` | nonterminal lifecycle / any attachments / valid lease | `closed / no attachments / unclaimed` | Terminal Service; then owning Agent Controller if runtime-bound | Binding receives normalized exit | Release PTY; preserve exitCode and signal separately | Runtime connectivity changes only through Agent Controller | Deliver terminal `closed` and outcome to the pre-transition attachment set, then remove those attachments | Fan-out failure does not undo closure; runtime Controller independently classifies requested stop vs failure | Exit for another PTY; reopening session; retaining attachments or writer; Terminal Service directly mutating AgentRuntime |
| PTY handle/control lost without confirmed exit | Matching session; lifecycle `opening`, `open`, or `closing` | nonterminal lifecycle / any attachments / valid lease | `lost / no attachments / unclaimed` | Terminal Service; owning Agent Controller consumes observation when runtime-bound | Binding receives control-lost observation | Drop unusable handle; do not claim process exit | Runtime connectivity changes only through Agent Controller | Deliver terminal `lost` to the pre-transition attachment set, then remove those attachments | No automatic attach/recovery; later exit may enrich diagnostics only | Publishing `open`; retaining attachments or writer; claiming complete cleanup; recovering same session after server restart |

### TerminalSession invariants and reconnect

- Valid lifecycle/attachment/lease combinations are exhaustive:

  | Lifecycle | Attachments | Writer lease |
  | --- | --- | --- |
  | `opening` | zero or more | `unclaimed` |
  | `open` | zero or more | `unclaimed`, or claimed by exactly one member of attachments |
  | `closing` | zero or more | `unclaimed` |
  | `closed` | none | `unclaimed` |
  | `lost` | none | `unclaimed` |

  Every other combination is impossible, including a claim during `opening`, any writer
  outside `open`, a holder absent from attachments, multiple holders, or retained
  attachments after `closed` or `lost`.
- Only `open` sessions accept input or resize, and only from the current writer lease
  holder. Attachments may observe without a lease.
- `opening`, `closing`, `closed`, and `lost` always have no writer. Writer claim before
  `open` is rejected rather than recorded for later activation.
- Closing a Pane, detaching the last view, refreshing a browser, or losing a WebSocket
  never stops the TerminalSession, AgentRuntime, or HostRuntime.
- Reconnect creates a new attachment under the current server epoch. The client obtains
  the authoritative session projection and must explicitly claim writer again.
- A server may provide bounded raw ANSI replay with an explicit gap/range indication.
  It must not promise reconstruction of the previous full-screen TUI state.
- After Local Server restart, old TerminalSession IDs are not recovered. The new epoch's
  snapshot omits them and attach returns not-found/stale-epoch; no PTY recovery is
  inferred.
- A runtime-bound terminal cannot be stopped around its Controller. The client requests
  `agent.stop` or `host.stop`; PTY cleanup follows that transition. A standalone terminal
  can use the Terminal Service stop operation.

## Local Server lifecycle and shutdown barrier

The Local Server lifecycle is `starting`, `running`, `quiescing`, `stopping`, `stopped`,
or `failed`. `quiescing` is an atomic admission-barrier state, not a synonym for stopping:
it blocks new state-mutating operations and Controller, Runtime, Host, and
TerminalSession registrations while the server obtains one dependency snapshot.
Authorized snapshot, health, and current-operation reads may continue.

```text
normal stop request
→ atomically running → quiescing
→ close mutation/registration admission
→ normalize active execution dependencies including already admitted operations
├─ non-empty → publish rejection → quiescing → running → reopen admission
└─ empty → quiescing → stopping → flush and release Local Server resources

force stop request
→ atomically running → quiescing
→ close mutation/registration admission
→ record dependencies but bypass only their rejection guard
→ quiescing → stopping → the same Local Server cleanup
```

### Active execution dependency normalization

The shutdown owner computes the blocker set from one authoritative projection after the
barrier is acquired. A dependency is active when any of these is true:

- an AgentRuntime has a nonterminal lifecycle, or is failed with lost control and an
  `alive` or `unknown` execution observation;
- a HostRuntime is starting, running, or stopping, or its failed startup still has an
  incomplete compensation resource;
- a TerminalSession is opening, open, or closing, or is lost with a possibly live PTY;
- a Controller, Adapter, PTY, Terminal, or live-Network operation admitted before the
  barrier has not settled.

Host and child entries may be grouped for reporting but MUST NOT be discarded from the
guard merely because they share one execution. Stopped/released runtimes, closed or
fully released lost terminals, observer attachments, writer leases, idle Gateway
connections, event history, and Persistent Network definitions/default metadata are not
active execution dependencies. Live membership/routes backed only by a terminal runtime
tuple are stale state to clean and diagnose, not permission to call that runtime inactive.

### Local Server transition table

| Trigger | Precondition | Current state | Next state | Transition owner | Adapter side effect | PTY side effect | Network side effect | Gateway event | Failure / compensation | Invalid transition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Process bootstrap accepted | Configuration and persistent-state preflight admitted a new server epoch | absent | `starting` | Local Server bootstrap | Load Adapter manifests/capabilities; do not launch runtimes | Initialize PTY service without creating a session | Load durable definitions without materializing runtime edges | Server epoch added with lifecycle `starting` | Startup failure releases created resources and records `failed` when an endpoint exists to observe it | Reusing an active epoch; publishing `running` before listener, DB, Gateway, and state authority are ready |
| Readiness established | Listener, persistent state, Gateway, registries, and services are ready for admission | `starting` | `running` | Local Server bootstrap | None | None | None | Server lifecycle `running` with epoch and endpoint health | A readiness failure follows startup cleanup and never opens admission | Accepting mutation while `starting`; readiness for a partially initialized authority |
| Normal or force stop admitted | Lifecycle `running`; caller has matching stop authority; no stop operation active | `running` | `quiescing` | Local Server shutdown owner | None; do not request runtime stop | None while the barrier and snapshot are acquired | Reject new live or durable mutations after the barrier | Server lifecycle `quiescing` with stop mode | Barrier acquisition is atomic with closing mutation/registration admission | Check-then-close race; Controller/Runtime/Host/Terminal registration or Network mutation admitted after barrier; client directly changing state |
| Mutation arrives after barrier | Lifecycle `quiescing` or `stopping` | unchanged | unchanged | Local Server admission gate | None | None | None | Operation rejected as server shutting down | Read-only snapshot/health access may continue while available | Queuing mutation for replay after restart; admitting it because it is not itself an execution dependency |
| Normal-stop dependency snapshot is non-empty | Barrier held; complete normalized snapshot contains at least one active execution dependency | `quiescing` | `running` | Local Server shutdown owner | None | None | None | Stop rejected with normalized blockers, then lifecycle `running` | Release barrier and reopen admission only after rejection state is authoritative; do not stop or mutate dependencies | Partial blocker list deciding success; cleanup begun before the guard result; remaining quiescent after rejection |
| Normal-stop dependency snapshot is empty | Barrier held; all pre-barrier operations settled; normalized blocker set is empty | `quiescing` | `stopping` | Local Server shutdown owner | Release only inactive/server-owned Adapter infrastructure | Close idle Terminal streams and release terminal service resources; no live PTY dependency exists | Flush durable definitions and verify no live runtime connectivity | Server lifecycle `stopping` and cleanup progress | Cleanup continues best-effort and retains per-resource diagnostics | Reopening admission; sending Agent/Host stop; deleting Persistent Network definitions as runtime cleanup |
| Force-stop dependency snapshot taken | Barrier held; stop mode force; snapshot may be non-empty | `quiescing` | `stopping` | Local Server shutdown owner | Do not invoke Agent/Host Controller stop and do not send terminate/kill | Close streams and release server-owned PTY handles as server cleanup, not as a runtime stop guarantee | Drop in-memory live connectivity; retain durable Network definitions | Server lifecycle `stopping`, force mode, normalized residual dependencies and orphan/control-loss risk | Best-effort publish control-loss projections before transports close; external process survival or exit is not claimed | Bypassing admission barrier or cleanup; treating force as runtime kill; claiming dependencies were stopped |
| Local Server cleanup completes | Lifecycle `stopping`; state flush and owned resource releases settled | `stopping` | `stopped` | Local Server shutdown owner | Release Adapter infrastructure | Release all server-owned handles | Close repositories after flush | Server lifecycle `stopped` when observable, then endpoint closes | Per-resource cleanup diagnostics remain in stop result/logs | `stopped` before DB/listener/owned handles settle; claiming forced residual runtimes exited |
| Startup or shutdown cleanup cannot establish its terminal invariant | Matching lifecycle operation; cleanup failure recorded | `starting` or `stopping` | `failed` | Local Server bootstrap or shutdown owner | Continue safe best-effort release | Continue safe best-effort release without inventing PTY exit | Preserve durable definitions; diagnose incomplete volatile cleanup | Server lifecycle `failed` and operation failure while transport remains available | Do not roll back to `running` after shutdown side effects began; process-level termination policy is deferred | Publishing `stopped`; silently reopening admission; converting cleanup failure into Agent/Host stop |
| Repeated stop while an operation is active | Same server epoch and current stop operation | `quiescing` or `stopping` | unchanged | Local Server shutdown owner | None | None | None | Return existing operation/result handle; no duplicate lifecycle event | Original mode and result remain authoritative | Starting a second snapshot/cleanup; changing normal to force in place; weakening the barrier |

`force` changes only the active-dependency decision. It does not skip the barrier, state
flush, transport close, handle release, or database cleanup. Releasing a server-owned PTY
handle can affect its child process, so the server MUST report uncertainty rather than
promise that an external runtime survives or assert that it was stopped. Recovery,
automatic re-registration, and PTY recovery in a new epoch remain outside pre-v1.

## Gateway request authority and enforcement

Client authorization permits a request; it never transfers transition authority from
the responsible Controller or service. Enforcement is ordered so that a request cannot
pass authorization and then race through the Local Server shutdown barrier.

```text
authenticated client connection
→ Gateway derives principal, credential class, Runtime scope, and capabilities
→ capability policy authorizes the operation and target
→ Local Server admission gate admits or rejects the mutation
→ Controller or owning service validates current state and applies the operation
→ Gateway publishes the authoritative result/projection
```

The operator credential class is shared by CLI protocol clients and authenticated React
operator sessions. Presentation does not change authority. Starting an absent Local
Server is the one exception: it is a local CLI bootstrap action before any Gateway exists,
not a Gateway lifecycle mutation. Exact CLI commands and React controls may expose a
subset of authorized protocol operations without creating a new security role.

The runtime-scoped MCP bridge derives its source AgentRuntime identity from the
authenticated connection; request content cannot override it. It may use only scoped
peer discovery and messaging operations. It cannot request lifecycle/server changes,
mutate Network state, inspect or resolve operator approvals, attach to terminals, acquire
writer authority, or access another runtime's data. A future delegated-approval
credential would be a distinct credential class and is not an expansion of the generic
runtime credential.

Decision ownership remains:

- Agent lifecycle — StandaloneAgentController or HostController;
- Host lifecycle — HostController;
- Local Server lifecycle and admission — Local Server shutdown owner;
- live and durable connectivity — Network Service;
- TerminalSession attach and writer operations — Terminal Service;
- structured approval resolution — Approval Broker with Adapter capability enforcement;
- runtime-scoped peer discovery and messaging — Network and Messaging services.

An Adapter reports capabilities and performs an accepted vendor operation, but is never
a client authority. The Gateway rejects denied operations before reaching it and emits an
auditable denial without changing lifecycle, leases, approvals, or Network state.

## Deferred implementation choices

This architecture does not choose TypeScript object layout, Gateway wire names, database
schema, WebSocket library, or Adapter SDK field spelling. It also does not add automatic
restart, server-restart PTY recovery, TUI screen reconstruction, legacy UDS/NDJSON, or
pair/connect/compose compatibility paths.

Sources:

- `logs/artifacts/aiox-web-first-accepted-target-baseline.md` §§3–4, 6–7, 9–14, 18–21.
- `logs/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts.md` — Stage 0 execution provenance.
