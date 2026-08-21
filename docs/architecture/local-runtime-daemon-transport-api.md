# aiox Local Runtime — Daemon Lifecycle, Socket Transport, API Surface (§4–§5)

Related:
- [[docs/architecture/local-agent-runtime]]
- [[docs/architecture/local-runtime-routing-and-delivery]]
- [[docs/decisions/uds-transport-and-framing-contract]]

Status: Current

This slice owns daemon lifecycle, socket transport, and daemon API surface
architecture. The index owns status vocabulary, module overview, and authority
links. The former §4.3 sendMessage end-to-end sequence is owned by
[[docs/architecture/local-runtime-routing-and-delivery]].

## 4. Daemon Lifecycle and Socket Transport

### 4.1 Daemon Lifecycle

`aiox _run-daemon --socket <path>` is the hidden long-running entry point
([[src/cli/parse.ts]] — `src/cli/parse.ts:354-360`; dispatched in [[src/cli/invocation.ts]] — `src/cli/invocation.ts:302-305`).
`runDaemonProcess` ([[src/daemon/run.ts]] — `src/daemon/run.ts:48-122`):

1. Opens in-memory SQLite, applies schema.
2. Builds the server with `createDaemonServer`, threading the production
   `attachCodexRuntime`.
3. Wraps the `stop` RPC so the daemon schedules `shutdown()` on
   `setImmediate` after responding to the client (`src/daemon/run.ts:93-103`).
4. Starts the socket server, then installs a fatal monitor and once-shot
   SIGTERM/SIGINT handlers (`src/daemon/run.ts:105-116`).

`shutdown()` (`src/daemon/run.ts:72-91`) closes the socket server first, contains
a socket-close rejection so remaining cleanup still runs, awaits state
`stop({})`, and only then closes the database. State stop cancels registered
queue-expiry and pre-write-retry timers, awaits the target-flush snapshot taken
at stop entry, clears session maps, removes connected agents' rows (and their
routes) rather than status-flipping them, and awaits managed Codex runtime
disposal settlement before resolving
([[src/daemon/state.ts]] — `src/daemon/state.ts:1402-1442`;
[[tests/unit/daemon/codex-ingress.test.ts]] —
`tests/unit/daemon/codex-ingress.test.ts:199-306`;
[[tests/unit/daemon/api.test.ts]] — `tests/unit/daemon/api.test.ts:1154-1256`).

The fatal monitor writes only `{origin}` to `latest-fatal.json` beside the
daemon socket with mode `0600`; it does not retain the thrown value, message,
stack, or credentials, and it does not install a recovery handler. Node's
default fatal termination remains authoritative
([[src/daemon/run.ts]] — `src/daemon/run.ts:27-45`;
[[tests/unit/daemon/run.test.ts]] — `tests/unit/daemon/run.test.ts:25-101`).

**Socket path resolution** ([[src/config/paths.ts]] — `src/config/paths.ts:9-25, 92-102`):
`$AIOX_SOCKET_PATH` if set, else `~/.aiox/daemon.sock` for `release` profile, or `~/.aiox/<profile>/daemon.sock` for `dev` and `build` profiles (`mkdir -p` parent).

**Auto-start** is wired only on the `agent-attach` branch
([[src/cli/invocation.ts]] — `src/cli/invocation.ts:157-167`). `aiox daemon start` and all other
commands either start explicitly or are connect-only and will fail if the
daemon is absent. See command table in §9.1.

### 4.2 Socket Transport

[[src/daemon/socket-transport.ts]]. WHY authority: [[docs/decisions/uds-transport-and-framing-contract]].

| Property | Value | Cite ([[src/daemon/socket-transport.ts]]) |
|---|---|---|
| Transport | Unix Domain Socket (`net.createServer`) | `src/daemon/socket-transport.ts:51-115` |
| Framing | NDJSON; `\n`-terminated lines, partial-line buffer both sides | `src/daemon/socket-transport.ts:71-84`, `src/daemon/socket-transport.ts:328-353`, `src/daemon/socket-transport.ts:387-408` |
| Request envelope | `{ id, method, params? }` | `src/daemon/socket-transport.ts:27-31` |
| Response envelope | `{ id, ok:true, result }` or `{ id, ok:false, error: { reason, message } }` | `src/daemon/socket-transport.ts:33-46` |
| Client topology | Single persistent socket per `createDaemonSocketClient`; per-request id multiplex via `Map<id, PendingRequest>` | `src/daemon/socket-transport.ts:145-178`, `src/daemon/socket-transport.ts:287-420` |
| Request timeout | `requestTimeoutMs` default 30 s | `src/daemon/socket-transport.ts:291`, `src/daemon/socket-transport.ts:398-404` |
| Stale-path retry | Listen-first; on EADDRINUSE, probe `canConnect`; if live → fail; else `unlink` + single retry | `src/daemon/socket-transport.ts:423-453`, `src/daemon/socket-transport.ts:459-466` |
| Transport vs daemon API errors | Transport envelope `error.reason ∈ {invalid_json, invalid_envelope, unknown_method, internal_error}`; daemon API typed errors return as `ok:true, result:{ok:false, reason}` at the envelope layer | `src/daemon/socket-transport.ts:189-278`, `src/daemon/api.ts:345-412` |

Accepted sockets install a local error handler that destroys only that client
connection; later clients remain serviceable. Request dispatch calls only own
properties of the API object, so unknown and inherited names such as
`constructor` and `toString` receive `unknown_method` without executing a
prototype-chain function ([[src/daemon/socket-transport.ts]] —
`src/daemon/socket-transport.ts:62-68`, `src/daemon/socket-transport.ts:189-228`;
[[tests/unit/daemon/socket-transport.test.ts]] —
`tests/unit/daemon/socket-transport.test.ts:293-398`).

**Implementation-only behaviors**: the `setImmediate(shutdown)` ordering in
`src/daemon/run.ts:93-103` and the fact that `recordCodexRuntimeFailed` exists on
`DaemonState` but is omitted from `DaemonApi` (so it is not callable over the
socket). The production Codex attach path instead supplies an in-process
`onRuntimeFailed` callback that reaches the same state transition
([[src/daemon/state.ts]] — `src/daemon/state.ts:753-759`,
`src/daemon/state.ts:1529-1575`, `src/daemon/state.ts:3180-3200`).

### 4.3 sendMessage end-to-end (sequence)

이 섹션은 [[docs/architecture/local-runtime-routing-and-delivery]]로 이동했습니다.

---

## 5. Daemon API Surface

All RPCs are declared at [[src/daemon/api.ts]] — `src/daemon/api.ts:53-97`, and exposed by
`createDaemonApi` at `src/daemon/api.ts:345-412`. State implementations are in
[[src/daemon/state.ts]] and cited per row. Daemon API typed errors never throw at the
transport; they are returned as `{ ok:false, reason }` results.

The daemon API's accepted send/reply response contains per-target
`DeliveryDto` values (including public `id`/delivery ID and status). The
agent-facing MCP projection is narrower but uniform across adapters: Codex
and Claude `send`/`reply` all return `message_id` plus optional `dispatch`.
Both adapters' separate manual retransmit tool, `aiox_retransmit_unconfirmed_delivery`,
returns `message_id` without `dispatch`. None is a delivery-status observability API.

| Method | Mutates | Emits | Typed errors | Cite ([[src/daemon/state.ts]]) |
|---|---|---|---|---|
| `attachAgent` | agents upsert; pairs.attachAgent; routes bidirectional if pair ready; in-memory `codexRuntimes` / pending tokens | `agent_thread_id_rebound` on resume | `agent_name_already_connected`, `pair_not_found`, `agent_already_attached`, `pair_slot_occupied`, `pair_full`, `agent_kind_mismatch`, `codex_resume_failed`, `codex_runtime_attach_failed` | `attachAgent` |
| `createPair` | pairs insert | — | `pair_name_already_exists` | `createPair` |
| `connect` | routes insert in tx | — | `source_agent_not_found`, `target_agent_not_found` | `connect` |
| `sendMessage` | messages + deliveries + events (single tx) | `message_created`, `delivery_queued` | `source_agent_not_found`, `no_active_routes`, `delivery_idempotency_key_exists`, `delivery_queue_full` | `sendMessage` → `runSendMessageTransaction` |
| `updateDeliveryStatus` | deliveries.updateStatus + events | `delivery_status_changed` | `delivery_not_found` | `updateDeliveryStatus` → `updateDeliveryStatusInTransaction` |
| `detachAgent` | dispose codex runtime + clear channel maps; removes the agent's row and its routes | `agent_graceful_detach` (trigger=`explicit_detach`) | none | `detachAgent` → `detachCodexAgent` |
| `notifyTuiExited` | same as detachAgent cleanup | `agent_graceful_detach` (trigger=`tui_exit`) | none | `notifyTuiExited` → `detachCodexAgent` |
| `registerClaudeChannel` | validates session token; inserts or replaces `claudeChannelRuntimes` | — | `claude_channel_registration_failed` (`unknown_token`/`invalid_endpoint`) | `registerClaudeChannel`; [[docs/decisions/claude-channel-session-reconnect-token]] |
| `reportClaudeChannelBootFailure` | validates the session token and fixed cause; records `claude_channel_port_in_use` only while no channel runtime is registered | — | `claude_channel_boot_failure_report_rejected` (`unknown_token`/`unsupported_reason`) | `reportClaudeChannelBootFailure` |
| `disconnectClaudeChannel` | removes runtime, session token and boot cause; removes the agent's row and its routes | — | none | `disconnectClaudeChannel` |
| `receiveClaudeChannelMessage` | runSendMessageTransaction (`request.type ?? "question"`, typed `question\|instruction`) + dispatch to codex | `claude_channel_message_received` + sendMessage events + dispatch events | sendMessage typed errors | `receiveClaudeChannelMessage` → `runSendMessageTransaction` |
| `receiveClaudeChannelReply` | typed `inReplyToDeliveryId` reply authorization + source-only dispatch | `claude_channel_reply_received` + downstream | `unknown_delivery`, `correlation_mismatch`, `reply_not_expected`, `duplicate_reply`, plus send errors | `receiveClaudeChannelReply` → `runReplyTransaction` |
| `registerCodexChannel` | consumes pending token; inserts `codexChannelRuntimes` | `codex_channel_registered` | `codex_channel_registration_failed` (`unknown_token`) | `registerCodexChannel` |
| `disconnectCodexChannel` | removes runtime + pending token and the agent's row and routes | `codex_channel_disconnected` (if had runtime) | none | `disconnectCodexChannel` |
| `receiveCodexMessage` | authz + sendMessage(`request.type ?? "question"`, typed `question\|instruction`) + dispatch to claude | `codex_ingress_message_received` + downstream | `codex_ingress_unauthorized` + sendMessage errors | `receiveCodexMessage` → `authorizeCodexIngress` → `runSendMessageTransaction` |
| `receiveCodexReply` | authz + typed `inReplyToDeliveryId` reply authorization + source-only dispatch | `codex_ingress_reply_received` + downstream | `codex_ingress_unauthorized`; `unknown_delivery`, `correlation_mismatch`, `reply_not_expected`, `duplicate_reply`; send errors | `receiveCodexReply` → `authorizeCodexIngress` → `runReplyTransaction` |
| `retransmitUnconfirmedDelivery` | no queued write; direct operator attempt for one unconfirmed Codex or Claude delivery | `delivery_manual_retransmit`; immediate delivered or rejected event is terminal (Codex additionally resolves a late delivered/rejected via its retained JSON-RPC `requestId` correlation; Claude has no late path and resolves immediately only), while timeout/drop records non-terminal `_unconfirmed` | `delivery_not_found`, `delivery_not_unconfirmed`, `duplicate_risk_confirmation_required`, `manual_retransmit_unconfirmed`, `manual_retransmit_rejected`, `manual_retransmit_failed` | `retransmitUnconfirmedDelivery` |
| `status` | none; API mapping adds a status-only static per-kind delivery-guarantee projection without changing shared attach/stop agent DTOs | none | none | `status`; [[src/daemon/api.ts]] — `src/daemon/api.ts:110-129`, `src/daemon/api.ts:303-313`, `src/daemon/api.ts:544-578` |
| `listReachablePeers` | none; reads the caller's outbound routes and the currently attached target agents | none | `source_agent_not_found` | `listReachablePeers` |
| `stop` | cancels registered expiry/retry timers; awaits stop-entry target flushes and managed runtime disposal; `removeAllConnected` (agent rows + their routes) and clears session/boot-cause maps unless `daemonOnly` | — | none | `stop` |

The `status` projection is the existing read-only operator snapshot, not a
generic runtime tier evaluator. It exposes per agent: kind-specific acceptance
evidence, unavailable target-receipt evidence, no automatic target ack or
completion, conclusive-pre-write-only automatic retry, and the readiness,
duplicate-risk confirmation, direct/non-queued dispatch and kind-specific late
transport-outcome boundary for manual retransmit. `aiox status` renders the same
fields in `DELIVERY GUARANTEES` ([[src/cli/format.ts]] —
`src/cli/format.ts:30-109`; [[tests/unit/daemon/api.test.ts]] —
`tests/unit/daemon/api.test.ts:999-1104`; [[tests/unit/cli/format.test.ts]] —
`tests/unit/cli/format.test.ts:106-180`).
