# aiox Local Runtime — Daemon Lifecycle, Socket Transport, API Surface (§4–§5)

> 컨텍스트: [[local-agent-runtime]] 인덱스. status 어휘·module overview·authority links는 인덱스가 소유한다.
>
> §4.3 sendMessage end-to-end sequence는 routing/FSM 소유라 [[local-runtime-routing-and-delivery]]로 이동했습니다.

## 4. Daemon Lifecycle and Socket Transport

### 4.1 Daemon Lifecycle

`aiox _run-daemon --socket <path>` is the hidden long-running entry point
([[src/cli/parse.ts]] — `src/cli/parse.ts:315-321`; dispatched in [[src/cli/invocation.ts]] — `src/cli/invocation.ts:211-215`).
`runDaemonProcess` ([[src/daemon/run.ts]] — `src/daemon/run.ts:24-87`):

1. Opens in-memory SQLite, applies schema.
2. Builds the server with `createDaemonServer`, threading the production
   `attachCodexRuntime`.
3. Wraps the `stop` RPC so the daemon schedules `shutdown()` on
   `setImmediate` after responding to the client (`run.ts:66-73`).
4. Registers once-shot SIGTERM/SIGINT handlers (`run.ts:83-84`).

`shutdown()` (`run.ts:47-61`) closes the socket server, marks all
connected agents disconnected (`stop({})`), and `db.close()`s.

**Socket path resolution** ([[src/config/paths.ts]] — `src/config/paths.ts:9-25, 92-102`):
`$AIOX_SOCKET_PATH` if set, else `~/.aiox/daemon.sock` for `release` profile, or `~/.aiox/<profile>/daemon.sock` for `dev` and `build` profiles (`mkdir -p` parent).

**Auto-start** is wired only on the `agent-attach` branch
(`src/cli/invocation.ts:108-111`). `aiox daemon start` and all other
commands either start explicitly or are connect-only and will fail if the
daemon is absent. See command table in §9.1.

### 4.2 Socket Transport

[[src/daemon/socket-transport.ts]]. WHY authority: [[uds-transport-and-framing-contract]].

| Property | Value | Cite |
|---|---|---|
| Transport | Unix Domain Socket (`net.createServer`) | `socket-transport.ts:60` |
| Framing | NDJSON; `\n`-terminated lines, partial-line buffer both sides | `socket-transport.ts:64-69, 269-270, 303-306` |
| Request envelope | `{ id, method, params? }` | `socket-transport.ts:27-31` |
| Response envelope | `{ id, ok:true, result }` or `{ id, ok:false, error: { reason, message } }` | `socket-transport.ts:33-46` |
| Client topology | Single persistent socket per `createDaemonSocketClient`; per-request id multiplex via `Map<id, PendingRequest>` | `socket-transport.ts:262-392` |
| Request timeout | `requestTimeoutMs` default 30 s | `socket-transport.ts:266, 373-378` |
| Stale-path retry | Listen-first; on EADDRINUSE, probe `canConnect`; if live → fail; else `unlink` + single retry | `socket-transport.ts:397-427` |
| Transport vs daemon API errors | Transport envelope `error.reason ∈ {invalid_json, invalid_envelope, unknown_method, internal_error}`; daemon API typed errors return as `ok:true, result:{ok:false, reason}` at the envelope layer | `socket-transport.ts:155-218` |

**Implementation-only behaviors**: the `setImmediate(shutdown)` ordering in
`run.ts:66-73` and the fact that `recordCodexRuntimeFailed` exists on
`DaemonState` but is omitted from `DaemonApi` (so it is not callable over
the socket — only via in-process state references).

### 4.3 sendMessage end-to-end (sequence)

이 섹션은 [[local-runtime-routing-and-delivery]]로 이동했습니다.

---

## 5. Daemon API Surface

All RPCs are declared at [[src/daemon/api.ts]] — `src/daemon/api.ts:49-87`; state implementations in
[[src/daemon/state.ts]] — `src/daemon/state.ts:471-1133`. Daemon API typed errors never throw at the
transport — they are returned as `{ ok:false, reason }` results.

| Method | Mutates | Emits | Typed errors | Cite |
|---|---|---|---|---|
| `attachAgent` | agents upsert; pairs.attachAgent; routes bidirectional if pair ready; in-memory `codexRuntimes` / pending tokens | `agent_thread_id_rebound` on resume | `agent_name_already_connected`, `pair_not_found`, `agent_already_attached`, `pair_slot_occupied`, `pair_full`, `agent_kind_mismatch`, `codex_resume_failed`, `codex_runtime_attach_failed` | state.ts:532-745 |
| `createPair` | pairs insert | — | `pair_name_already_exists` | state.ts:747-764 |
| `connect` | routes insert in tx | — | `source_agent_not_found`, `target_agent_not_found` | state.ts:766-806 |
| `disconnect` | routes delete in tx | — | `source_agent_not_found`, `target_agent_not_found` | state.ts:808-823 |
| `sendMessage` | messages + deliveries + events (single tx) | `message_created`, `delivery_queued` | `source_agent_not_found`, `no_active_routes`, `delivery_idempotency_key_exists` | state.ts:1761-1864 |
| `updateDeliveryStatus` | deliveries.updateStatus + events | `delivery_status_changed` | `delivery_not_found` | state.ts:828-830, 1192-1244 |
| `rollbackAgentAttach` | disposes in-flight codex runtime; removes pending token; marks agent disconnected | — | none typed (`{ok:true,rolledBack}`) | state.ts:832-866 |
| `detachAgent` | dispose codex runtime + clear channel maps; mark disconnected | `agent_graceful_detach` (trigger=`explicit_detach`) | none | state.ts:868-873 + 1866-1919 |
| `notifyTuiExited` | same as detachAgent cleanup | `agent_graceful_detach` (trigger=`tui_exit`) | none | state.ts:875-882 |
| `registerClaudeChannel` | consumes pending token; inserts `claudeChannelRuntimes` | — | `claude_channel_registration_failed` (`unknown_token`/`invalid_endpoint`) | state.ts:926-954 |
| `disconnectClaudeChannel` | removes runtime | — | none | state.ts:956-972 |
| `receiveClaudeChannelMessage` | runSendMessageTransaction (type=`question`) + dispatch to codex | `claude_channel_message_received` + sendMessage events + dispatch events | sendMessage typed errors | state.ts:974-1006 |
| `receiveClaudeChannelReply` | sendMessage (type=`reply`, parent=chatId) + dispatch | `claude_channel_reply_received` + downstream | sendMessage typed errors | state.ts:1008-1042 |
| `registerCodexChannel` | consumes pending token; inserts `codexChannelRuntimes` | `codex_channel_registered` | `codex_channel_registration_failed` (`unknown_token`) | state.ts:1044-1074 |
| `disconnectCodexChannel` | removes runtime + pending token | `codex_channel_disconnected` (if had runtime) | none | state.ts:1076-1094 |
| `receiveCodexMessage` | authz + sendMessage(`question`) + dispatch to claude | `codex_ingress_message_received` + downstream | `codex_ingress_unauthorized` + sendMessage errors | state.ts:1096-1125 |
| `receiveCodexReply` | authz + sendMessage(`reply`, parent=`parentMessageId`) + dispatch | `codex_ingress_reply_received` + downstream | same as above | state.ts:1127-1160 |
| `status` | none | none | none | state.ts:1162-1174 |
| `stop` | `markAllConnectedDisconnected` unless `daemonOnly`; clears channel maps | — | none | state.ts:1176-1190 |
