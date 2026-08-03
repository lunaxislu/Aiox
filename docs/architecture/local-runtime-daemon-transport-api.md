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
`runDaemonProcess` ([[src/daemon/run.ts]] — `src/daemon/run.ts:24-87`):

1. Opens in-memory SQLite, applies schema.
2. Builds the server with `createDaemonServer`, threading the production
   `attachCodexRuntime`.
3. Wraps the `stop` RPC so the daemon schedules `shutdown()` on
   `setImmediate` after responding to the client (`src/daemon/run.ts:66-73`).
4. Registers once-shot SIGTERM/SIGINT handlers (`src/daemon/run.ts:83-84`).

`shutdown()` (`src/daemon/run.ts:47-61`) closes the socket server, marks all
connected agents disconnected (`stop({})`), and `db.close()`s.

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
| Transport | Unix Domain Socket (`net.createServer`) | `src/daemon/socket-transport.ts:48-84` |
| Framing | NDJSON; `\n`-terminated lines, partial-line buffer both sides | `src/daemon/socket-transport.ts:64-76`, `src/daemon/socket-transport.ts:262-327`, `src/daemon/socket-transport.ts:381-382` |
| Request envelope | `{ id, method, params? }` | `src/daemon/socket-transport.ts:27-31` |
| Response envelope | `{ id, ok:true, result }` or `{ id, ok:false, error: { reason, message } }` | `src/daemon/socket-transport.ts:33-46` |
| Client topology | Single persistent socket per `createDaemonSocketClient`; per-request id multiplex via `Map<id, PendingRequest>` | `src/daemon/socket-transport.ts:118-152`, `src/daemon/socket-transport.ts:262-392` |
| Request timeout | `requestTimeoutMs` default 30 s | `src/daemon/socket-transport.ts:266`, `src/daemon/socket-transport.ts:373-378` |
| Stale-path retry | Listen-first; on EADDRINUSE, probe `canConnect`; if live → fail; else `unlink` + single retry | `src/daemon/socket-transport.ts:398-427`, `src/daemon/socket-transport.ts:452-464` |
| Transport vs daemon API errors | Transport envelope `error.reason ∈ {invalid_json, invalid_envelope, unknown_method, internal_error}`; daemon API typed errors return as `ok:true, result:{ok:false, reason}` at the envelope layer | `src/daemon/socket-transport.ts:155-218`, `src/daemon/api.ts:299-358` |

**Implementation-only behaviors**: the `setImmediate(shutdown)` ordering in
`src/daemon/run.ts:66-73` and the fact that `recordCodexRuntimeFailed` exists on
`DaemonState` but is omitted from `DaemonApi` (so it is not callable over
the socket — only via in-process state references). Evidence:
[[src/daemon/state.ts]] — `recordCodexRuntimeFailed`;
[[src/daemon/api.ts]] — `src/daemon/api.ts:49-87`, `src/daemon/api.ts:299-358`.

### 4.3 sendMessage end-to-end (sequence)

이 섹션은 [[docs/architecture/local-runtime-routing-and-delivery]]로 이동했습니다.

---

## 5. Daemon API Surface

All RPCs are declared at [[src/daemon/api.ts]] — `src/daemon/api.ts:49-87`, and exposed by
`createDaemonApi` at `src/daemon/api.ts:299-358`. State implementations are in
[[src/daemon/state.ts]] and cited per row. Daemon API typed errors never throw at the
transport; they are returned as `{ ok:false, reason }` results.

The daemon API's accepted send/reply response contains per-target
`DeliveryDto` values (including public `id`/delivery ID and status). The
agent-facing MCP projection is tool-specific rather than a shared
`message_id`/`dispatch` contract: Codex send/reply and Claude send return
`message_id` plus optional `dispatch`; Claude reply returns optional `dispatch`;
Codex manual retransmit returns `message_id` without `dispatch`. None is a
delivery-status observability API.

| Method | Mutates | Emits | Typed errors | Cite ([[src/daemon/state.ts]]) |
|---|---|---|---|---|
| `attachAgent` | agents upsert; pairs.attachAgent; routes bidirectional if pair ready; in-memory `codexRuntimes` / pending tokens | `agent_thread_id_rebound` on resume | `agent_name_already_connected`, `pair_not_found`, `agent_already_attached`, `pair_slot_occupied`, `pair_full`, `agent_kind_mismatch`, `codex_resume_failed`, `codex_runtime_attach_failed` | `attachAgent` |
| `createPair` | pairs insert | — | `pair_name_already_exists` | `createPair` |
| `connect` | routes insert in tx | — | `source_agent_not_found`, `target_agent_not_found` | `connect` |
| `disconnect` | routes delete in tx | — | `source_agent_not_found`, `target_agent_not_found` | `disconnect` |
| `sendMessage` | messages + deliveries + events (single tx) | `message_created`, `delivery_queued` | `source_agent_not_found`, `no_active_routes`, `delivery_idempotency_key_exists`, `delivery_queue_full` | `sendMessage` → `runSendMessageTransaction` |
| `updateDeliveryStatus` | deliveries.updateStatus + events | `delivery_status_changed` | `delivery_not_found` | `updateDeliveryStatus` → `updateDeliveryStatusInTransaction` |
| `rollbackAgentAttach` | disposes in-flight codex runtime; removes pending token; marks agent disconnected | — | none typed (`{ok:true,rolledBack}`) | `rollbackAgentAttach` |
| `detachAgent` | dispose codex runtime + clear channel maps; mark disconnected | `agent_graceful_detach` (trigger=`explicit_detach`) | none | `detachAgent` → `detachCodexAgent` |
| `notifyTuiExited` | same as detachAgent cleanup | `agent_graceful_detach` (trigger=`tui_exit`) | none | `notifyTuiExited` → `detachCodexAgent` |
| `registerClaudeChannel` | validates session token; inserts or replaces `claudeChannelRuntimes` | — | `claude_channel_registration_failed` (`unknown_token`/`invalid_endpoint`) | `registerClaudeChannel`; [[docs/decisions/claude-channel-session-reconnect-token]] |
| `disconnectClaudeChannel` | removes runtime and session token | — | none | `disconnectClaudeChannel` |
| `receiveClaudeChannelMessage` | runSendMessageTransaction (`request.type ?? "question"`, typed `question\|instruction`) + dispatch to codex | `claude_channel_message_received` + sendMessage events + dispatch events | sendMessage typed errors | `receiveClaudeChannelMessage` → `runSendMessageTransaction` |
| `receiveClaudeChannelReply` | typed `inReplyToDeliveryId` reply authorization + source-only dispatch | `claude_channel_reply_received` + downstream | `unknown_delivery`, `correlation_mismatch`, `reply_not_expected`, `duplicate_reply`, plus send errors | `receiveClaudeChannelReply` → `runReplyTransaction` |
| `registerCodexChannel` | consumes pending token; inserts `codexChannelRuntimes` | `codex_channel_registered` | `codex_channel_registration_failed` (`unknown_token`) | `registerCodexChannel` |
| `disconnectCodexChannel` | removes runtime + pending token | `codex_channel_disconnected` (if had runtime) | none | `disconnectCodexChannel` |
| `receiveCodexMessage` | authz + sendMessage(`request.type ?? "question"`, typed `question\|instruction`) + dispatch to claude | `codex_ingress_message_received` + downstream | `codex_ingress_unauthorized` + sendMessage errors | `receiveCodexMessage` → `authorizeCodexIngress` → `runSendMessageTransaction` |
| `receiveCodexReply` | authz + typed `inReplyToDeliveryId` reply authorization + source-only dispatch | `codex_ingress_reply_received` + downstream | `codex_ingress_unauthorized`; `unknown_delivery`, `correlation_mismatch`, `reply_not_expected`, `duplicate_reply`; send errors | `receiveCodexReply` → `authorizeCodexIngress` → `runReplyTransaction` |
| `retransmitUnconfirmedDelivery` | no queued write; direct operator attempt for one unconfirmed Codex delivery | `delivery_manual_retransmit`; immediate/late delivered or rejected event is terminal, while timeout/drop records non-terminal `_unconfirmed` | `delivery_not_found`, `delivery_not_unconfirmed`, `duplicate_risk_confirmation_required`, `manual_retransmit_unconfirmed`, `manual_retransmit_rejected`, `manual_retransmit_failed` | `retransmitUnconfirmedDelivery` |
| `status` | none | none | none | `status` |
| `stop` | `markAllConnectedDisconnected` unless `daemonOnly`; clears channel maps | — | none | `stop` |
