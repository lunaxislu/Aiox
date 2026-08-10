# aiox Local Runtime — Typed Error Catalog, Events Catalog, Smoke Matrix (§10–§12)

Related: [[docs/architecture/local-agent-runtime]]

Status: Current

This slice is the cross-cutting reference appendix for daemon, adapter, router, socket and CLI typed errors,
events, and implementation smoke provenance.

## 10. Consolidated Typed Error Catalog

### 10.1 Daemon API

| Reason | Surface | When | Cite |
|---|---|---|---|
| `agent_name_already_connected` | `AttachAgentResponse` | reattach attempt while connected | [[src/core/agents.ts]] `src/core/agents.ts:34`, `:47`; [[src/daemon/api.ts]] `src/daemon/api.ts:143`; [[src/store/repositories/agents.ts]] `src/store/repositories/agents.ts:35`, `:74` |
| `agent_already_attached` | `AttachAgentResponse` | agent is already attached to this pair | [[src/core/pairs.ts]] `src/core/pairs.ts:39`, `:71`; [[src/store/repositories/pairs.ts]] `src/store/repositories/pairs.ts:118`; [[src/daemon/state.ts]] `attachAgent` |
| `pair_not_found` | `AttachAgentResponse` | `--pair` unknown | [[src/daemon/api.ts]] `src/daemon/api.ts:148`; [[src/daemon/state.ts]] `attachAgent` |
| `pair_slot_occupied` | `AttachAgentResponse` | target slot already taken by another agent | [[src/core/pairs.ts]] `src/core/pairs.ts:39`, `:93`; [[src/store/repositories/pairs.ts]] `src/store/repositories/pairs.ts:48`, `:150`; [[src/daemon/state.ts]] `attachAgent` |
| `pair_full` | `AttachAgentResponse` | both slots already filled | [[src/core/pairs.ts]] `src/core/pairs.ts:44`, `:81`; [[src/store/repositories/pairs.ts]] `src/store/repositories/pairs.ts:53`, `:128`; [[src/daemon/state.ts]] `attachAgent` |
| `agent_kind_mismatch` | `AttachAgentResponse` | reconnect with different kind | [[src/store/repositories/pairs.ts]] `src/store/repositories/pairs.ts:41`, `:94`; [[src/daemon/state.ts]] `attachAgent` |
| `codex_resume_failed` | `AttachAgentResponse` / adapter | resume returned mismatched/no id | [[src/daemon/api.ts]] `src/daemon/api.ts:169`; [[src/daemon/state.ts]] `attachAgent`; [[src/adapters/codex/runtime.ts]] `src/adapters/codex/runtime.ts:234`, `:295` |
| `codex_runtime_attach_failed` | `AttachAgentResponse` | codex runtime attach error | [[src/daemon/api.ts]] `src/daemon/api.ts:169`; [[src/daemon/state.ts]] `attachAgent` |
| `pair_name_already_exists` | `CreatePairResponse` | duplicate `pair --name` | [[src/daemon/api.ts]] `src/daemon/api.ts:180`; [[src/daemon/state.ts]] `createPair` |
| `source_agent_not_found` | many | source name unresolved | [[src/daemon/api.ts]] `src/daemon/api.ts:192`, `:208`, `:229`; [[src/daemon/state.ts]] `runSendMessageTransaction`, `runReplyTransaction`, and ingress methods |
| `target_agent_not_found` | connect / disconnect / state dispatch | target name unresolved | [[src/daemon/api.ts]] `src/daemon/api.ts:197`, `:213`; [[src/daemon/state.ts]] `connect`, `disconnect`, and `dispatchToPairPeersNow` |
| `no_active_routes` | sendMessage / receiveCodexMessage | source has zero outgoing routes (β-1) | [[src/daemon/api.ts]] `src/daemon/api.ts:234`, `:291`; [[src/daemon/state.ts]] `runSendMessageTransaction` |
| `delivery_idempotency_key_exists` | sendMessage / receiveCodex* | duplicate `${messageId}:${targetAgentId}` | [[src/daemon/api.ts]] `src/daemon/api.ts:238`, `:295`; [[src/daemon/state.ts]] `runSendMessageTransaction` and `runReplyTransaction`; [[src/store/repositories/deliveries.ts]] `src/store/repositories/deliveries.ts:45`, `:129` |
| `delivery_queue_full` | send/reply ingress | atomic fan-out would exceed one target's queue capacity | [[src/daemon/api.ts]] `src/daemon/api.ts:231-244`; [[src/daemon/state.ts]] `runSendMessageTransaction` |
| `delivery_not_found` | `updateDeliveryStatus` | unknown id | [[src/daemon/api.ts]] `src/daemon/api.ts:249`; [[src/daemon/state.ts]] `updateDeliveryStatusInTransaction`, `receiveClaudeChannelMessage`, and `receiveClaudeChannelReply` |
| `delivery_not_unconfirmed` | `retransmitUnconfirmedDelivery` | requested delivery is not `unconfirmed` | [[src/daemon/api.ts]] `src/daemon/api.ts:239-247`; [[src/daemon/state.ts]] `retransmitUnconfirmedDelivery` |
| `duplicate_risk_confirmation_required` | `retransmitUnconfirmedDelivery` | operator omitted `confirmDuplicateRisk:true` | [[src/daemon/api.ts]] `src/daemon/api.ts:239-247`; [[src/daemon/state.ts]] `retransmitUnconfirmedDelivery` |
| `manual_retransmit_unconfirmed` / `manual_retransmit_rejected` / `manual_retransmit_failed` | `retransmitUnconfirmedDelivery` | post-write unknown, correlated reject, or no-attempt precondition failure | [[src/daemon/api.ts]] `src/daemon/api.ts:239-247`; [[src/daemon/state.ts]] `retransmitUnconfirmedDelivery` |
| `claude_channel_registration_failed` (`detail: unknown_token | invalid_endpoint`) | `registerClaudeChannel` | token mismatch / non-loopback endpoint | [[src/daemon/state.ts]] `registerClaudeChannel` |
| `codex_channel_registration_failed` (`detail: unknown_token`) | `registerCodexChannel` | token mismatch | [[src/daemon/state.ts]] `registerCodexChannel` |
| `codex_ingress_unauthorized` (`detail: missing_token | agent_not_registered | agent_disconnected | token_mismatch`) | `receiveCodex*` | per `authorizeCodexIngress` check | [[src/daemon/api.ts]] `src/daemon/api.ts:290`; [[src/daemon/state.ts]] `authorizeCodexIngress` |

### 10.2 Adapter — Codex (`AdapterInjectFailureReason`)

Union at [[src/adapters/contract.ts]] — `src/adapters/contract.ts:19-30`.
Returned as `{kind:"failed", reason, message, jsonRpcCode?}`
(`src/adapters/contract.ts:37-51`).

| Reason | When | Cite |
|---|---|---|
| `adapter_inject_failed` | Unrecognized error from `injectTurnStart` | [[src/adapters/codex/injector.ts]] `src/adapters/codex/injector.ts:81` |
| `codex_binding_uncertain` | pre-request or post-ack thread mismatch (Round 4 D7 swap) | [[src/adapters/codex/injector.ts]] `src/adapters/codex/injector.ts:29`, `:55`; [[src/adapters/codex/runtime.ts]] `src/adapters/codex/runtime.ts:295` |
| `codex_app_server_unavailable` | declared in union and state dispatch type, **no emission found** | [[src/adapters/contract.ts]] `src/adapters/contract.ts:21`; [[src/daemon/state.ts]] `dispatchToPairPeersNow` — Implementation-only |
| `codex_app_server_ws_connect_failed` | WS connect timeout/error | [[src/adapters/codex/websocket.ts]] `src/adapters/codex/websocket.ts:322-327` |
| `codex_app_server_ws_initialize_failed` | initialize JSON-RPC failed | [[src/adapters/codex/websocket.ts]] `src/adapters/codex/websocket.ts:217-221` |
| `codex_app_server_ws_dropped` | socket close mid-request | [[src/adapters/codex/websocket.ts]] `src/adapters/codex/websocket.ts:149-163` |
| `codex_turn_start_timeout` | configured request timeout | [[src/adapters/codex/injector.ts]] `src/adapters/codex/injector.ts:46-48`; [[src/adapters/codex/websocket.ts]] `src/adapters/codex/websocket.ts:247` |
| `codex_jsonrpc_error` | app-server returned JSON-RPC error | [[src/adapters/codex/websocket.ts]] `src/adapters/codex/websocket.ts:174-183` |
| `codex_resume_failed` | adapter-level resume failure | [[src/adapters/contract.ts]] `src/adapters/contract.ts:27`; [[src/adapters/codex/runtime.ts]] `src/adapters/codex/runtime.ts:228-236` |
| `codex_channel_unavailable` (state-internal) | runtime missing / not ready (deferred to `target_runtime_unavailable` in delivery) | Emitted by [[src/daemon/state.ts]] `resolveCodexReplyTarget`; handled by `dispatchToPairPeersNow` |
| `codex_no_loaded_thread` (state-internal) | `thread/loaded/list` empty -> kept queued (deferred to `target_binding_unconfirmed` in delivery) | Emitted by [[src/daemon/state.ts]] `resolveCodexReplyTarget`; handled by `dispatchToPairPeersNow` |

### 10.3 Adapter — Claude

| Reason | When | Cite |
|---|---|---|
| `claude_channel_unavailable` | no registered runtime, or positively identified `ECONNREFUSED` | [[src/adapters/claude/injector.ts]] `src/adapters/claude/injector.ts:23-30`, `:64-69`, `:87-96` |
| `claude_channel_push_failed` | explicit non-2xx response | [[src/adapters/claude/injector.ts]] `src/adapters/claude/injector.ts:44-50` |
| `claude_channel_push_unconfirmed` | AbortError/timeout or other fetch error whose pre-write status is not provable | [[src/adapters/claude/injector.ts]] `src/adapters/claude/injector.ts:56-74` |
| `claude_channel_port_in_use` | EADDRINUSE on channel-server listen (fatal boot) | [[src/adapters/claude/channel-server.ts]] `src/adapters/claude/channel-server.ts:582-585`, `:766-787` |
| `daemon_call_failed` (MCP isError) | a send, reply, or retransmit tool socket call threw | [[src/adapters/claude/channel-server.ts]] `src/adapters/claude/channel-server.ts:409-416`, `:461-468`, `:508-512`; [[src/adapters/codex/mcp-server.ts]] `src/adapters/codex/mcp-server.ts:320-323`, `:362-363` |
| fatal `missing_env_*`, `invalid_env_AIOX_CLAUDE_CHANNEL_PORT` | channel-server boot | [[src/adapters/claude/channel-server.ts]] `src/adapters/claude/channel-server.ts:655-663`, `:737-763` — Implementation-only |

### 10.4 Router

| Reason | When | Cite |
|---|---|---|
| `target_agent_not_found` | router cannot resolve delivery's targetAgentId | [[src/adapters/router.ts]] `src/adapters/router.ts:25`, `:73`, `:81` |
| `target_adapter_not_registered` | no adapter for target kind (part of deferred logical dispatch) | [[src/adapters/contract.ts]] `src/adapters/contract.ts:33`; [[src/adapters/router.ts]] `src/adapters/router.ts:94` |
| `adapter_not_found` | declared at router signature, **never returned** | [[src/adapters/router.ts]] `src/adapters/router.ts:25` — Implementation-only / dead union member |

### 10.5 Socket Transport (envelope)

| Reason | When | Cite |
|---|---|---|
| `invalid_envelope` | not a request envelope | [[src/daemon/socket-transport.ts]] `src/daemon/socket-transport.ts:177` |
| `unknown_method` | method not on `DaemonApi` | [[src/daemon/socket-transport.ts]] `src/daemon/socket-transport.ts:190` |
| `internal_error` | API handler threw | [[src/daemon/socket-transport.ts]] `src/daemon/socket-transport.ts:213` |
| `invalid_json` | frame not parseable as JSON | [[src/daemon/socket-transport.ts]] `src/daemon/socket-transport.ts:228` |

### 10.6 CLI Parse / Invocation

| Code | When | Cite |
|---|---|---|
| `aiox.missingCommand` | no subcommand | [[src/cli/parse.ts]] `src/cli/parse.ts:117-122`, `:127-131` |
| `aiox.invalidName` | empty or control-char name | [[src/cli/parse.ts]] `src/cli/parse.ts:149-165` |
| `aiox.missingTargets` | connect/disconnect with zero targets | [[src/cli/parse.ts]] `src/cli/parse.ts:300-305` |
| `aiox.invalidScope` | setup with invalid scope value | [[src/cli/parse.ts]] `src/cli/parse.ts:229-238` |
| `aiox.<commander-code>` | other commander error | [[src/cli/parse.ts]] `src/cli/parse.ts:108-111`, `:127-138` |
| `aiox.invocation.missing_daemon_socket_path` | Claude attach without socket path | [[src/cli/invocation.ts]] `src/cli/invocation.ts:195-200` |
| `aiox.invocation.claude_mcp_setup_failed` | `aiox claude setup` orchestrator threw | [[src/cli/invocation.ts]] `src/cli/invocation.ts:298-303` |
| `aiox.invocation.claude_mcp_setup.<code>` | `aiox claude setup` returned a non-ok result (e.g. name collision) | [[src/cli/invocation.ts]] `src/cli/invocation.ts:305-310` |
| `aiox.invocation.claude_mcp_registration_check_failed` | effective Claude MCP registration check threw | [[src/cli/invocation.ts]] `src/cli/invocation.ts:328-333` |
| `aiox.invocation.claude_mcp_not_registered` | `aiox claude` attach: no effective Local, User, or Project registration in the cwd (points to `aiox claude setup --scope <local|user|project>`) | [[src/cli/invocation.ts]] `src/cli/invocation.ts:335-341` |
| `aiox.invocation.tui_launch_failed` | Codex TUI spawn error / wait-for-exit error | [[src/cli/invocation.ts]] `src/cli/invocation.ts:353-359`, `:382-388`, `:413-418` |
| `aiox.invocation.unhandled_command` | `assertNever` fallback | [[src/cli/invocation.ts]] `src/cli/invocation.ts:464-467` |
| `aiox.invocation.<reason>` | wrapped daemon `ok:false` | [[src/cli/invocation.ts]] `src/cli/invocation.ts:446-449` |

---

## 11. Consolidated Events Catalog

Declaration: [[src/core/events.ts]] — `src/core/events.ts:1-34` (31 entries). All emissions go through
`events.append`.

| Event type | Payload | Emission site | When |
|---|---|---|---|
| `message_created` | `{}` | [[src/daemon/state.ts]] `runSendMessageTransaction` | inside sendMessage tx |
| `delivery_queued` | `{}` | [[src/daemon/state.ts]] `runSendMessageTransaction` | per queued delivery |
| `delivery_expired` | `{reason:"delivery_expired"}` | [[src/daemon/state.ts]] `scheduleQueuedDeliveryExpiry` | queued delivery reaches the 5-minute TTL |
| `delivery_status_changed` | `{status, error?}` | [[src/daemon/state.ts]] `updateDeliveryStatusInTransaction` | each `updateDeliveryStatus` |
| `delivery_manual_retransmit` | `{actor, attempt, confirmDuplicateRisk}` | [[src/daemon/state.ts]] `retransmitUnconfirmedDelivery`, `retransmitClaudeUnconfirmedDelivery` | an operator direct attempt begins after a direct write can start |
| `delivery_manual_retransmit_unconfirmed` / `_delivered` / `_rejected` | attempt-local correlation data | [[src/daemon/state.ts]] `retransmitUnconfirmedDelivery`, `retransmitClaudeUnconfirmedDelivery` | `_unconfirmed` preserves the original `unconfirmed`; `_delivered` transitions it to `delivered`; `_rejected` also preserves it. Codex may reconcile a late response; Claude has no late-response resolution. |
| `agent_runtime_failed` | `{reason, latestDiagnosticNotification?}` | [[src/daemon/state.ts]] `recordCodexRuntimeFailed` | Codex runtime exit / WS drop |
| `agent_graceful_detach` | `{trigger}` or `{trigger:"tui_exit", exitCode, signal}` | [[src/daemon/state.ts]] `detachCodexAgent` | `detachCodexAgent` |
| `agent_thread_id_rebound` | `{previousId, nextId, operation, source, requestId?}` | [[src/daemon/state.ts]] `attachAgent`, `injectMessageIntoCodexTarget`, `handleCodexProxyBinding` | Codex active-thread rebinds |
| `codex_delivery_queued_no_loaded_thread` | `{reason, message}` | [[src/daemon/state.ts]] `injectMessageIntoCodexTarget` | dispatch found no loaded thread |
| `codex_delivery_target_selected` | `{operation, loadedThreadIds, chosenThreadId, previousAdapterSessionId, runtimeActiveThreadId, selectionPolicy, deliveryMessageType, sourceAgentId, sourceAgentName, targetAgentName}` | [[src/daemon/state.ts]] `injectMessageIntoCodexTarget` | live target resolved |
| `codex_delivery_target_unavailable` | `{...same shape with reason}` | [[src/daemon/state.ts]] `injectMessageIntoCodexTarget` | paired with `queued_no_loaded_thread` |
| `codex_delivery_target_injection_failed` | `{chosenThreadId, loadedThreadIds, reason, message, source/target names}` | [[src/daemon/state.ts]] `injectMessageIntoCodexTarget` | `injectReplyIntoCodexRuntime` failed |
| `delivery_target_rejected` | `{adapter, target, jsonRpc, attempt}` | [[src/daemon/state.ts]] `recordCodexTargetRejectOutcome` | primary correlated Codex JSON-RPC reject; creates the source outcome relation |
| `claude_channel_message_received` | `{text, messageId?}` | [[src/daemon/state.ts]] `receiveClaudeChannelMessage` | `receiveClaudeChannelMessage` |
| `claude_channel_reply_received` | `{messageId, inReplyToDeliveryId, text}` | [[src/daemon/state.ts]] `receiveClaudeChannelReply` | typed `receiveClaudeChannelReply` |
| `codex_channel_registered` | `{tokenHash}` (short hash) | [[src/daemon/state.ts]] `registerCodexChannel` | `registerCodexChannel` |
| `codex_channel_disconnected` | `{}` | [[src/daemon/state.ts]] `disconnectCodexChannel` | `disconnectCodexChannel` (only if had runtime) |
| `codex_ingress_message_received` | `{messageId}` | [[src/daemon/state.ts]] `receiveCodexMessage` | `receiveCodexMessage` ok |
| `codex_ingress_reply_received` | `{messageId, inReplyToDeliveryId, text}` | [[src/daemon/state.ts]] `receiveCodexReply` | typed `receiveCodexReply` ok |

**Declared but not emitted in current `src/`** (Implementation-only):
`agent_registered`, `agent_reconnected`, `agent_disconnected`,
`pair_created`, `pair_ready`, `route_connected`, `route_disconnected`,
`codex_binding_uncertain_observed`, `late_reply`. Planned at Step 10 but did
not land at MVP closeout.

---

## 12. Implementation Smoke Matrix

The closeout smoke (logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md §1) ran from build output because
`daemon start` forks a detached child — `pnpm tsx` makes the child run
plain `node` against the TS entrypoint, which is not supported.

```bash
node dist/src/bin/aiox.js daemon start
node dist/src/bin/aiox.js codex --name codex-smoke
node dist/src/bin/aiox.js claude --name claude-smoke
node dist/src/bin/aiox.js connect claude-smoke codex-smoke
node dist/src/bin/aiox.js connect codex-smoke claude-smoke
node dist/src/bin/aiox.js status
```

The validation suite maps into the following automated (Vitest) vs. manual verification categories:

| Scenario | Expected | Reported result | Type / Verification Source |
|---|---|---|---|
| basic `claude -> codex -> claude` | message and reply visible both sides | PASS | Automated ([[tests/unit/adapters/fake-integration.test.ts]], [[tests/unit/daemon/codex-ingress.test.ts]]) |
| Codex TUI `/clear` | next Claude -> Codex delivery appears in visible thread | PASS | Manual smoke test scenario. Proxied JSON-RPC observation has automated coverage in [[tests/unit/adapters/codex-proxy.test.ts]]. |
| Codex TUI `/new` | next delivery in visible thread | PASS | Manual smoke test scenario. Proxied JSON-RPC observation has automated coverage in [[tests/unit/adapters/codex-proxy.test.ts]]. |
| Codex TUI `/fork` | next delivery in visible fork target | PASS | Manual smoke test scenario. Proxied JSON-RPC observation has automated coverage in [[tests/unit/adapters/codex-proxy.test.ts]]. |
| Codex TUI `/resume` | next delivery in resumed visible thread | PASS | Manual smoke test scenario. Proxied JSON-RPC observation has automated coverage in [[tests/unit/adapters/codex-proxy.test.ts]]. |
| `/resume -> /clear` | next delivery in cleared visible thread | PASS | Manual smoke test scenario. Proxied JSON-RPC observation has automated coverage in [[tests/unit/adapters/codex-proxy.test.ts]]. |
| `/resume -> /new` | next delivery in new visible thread | PASS | Manual smoke test scenario. Proxied JSON-RPC observation has automated coverage in [[tests/unit/adapters/codex-proxy.test.ts]]. |
| `/resume -> /fork` | next delivery in forked visible thread | PASS | Manual smoke test scenario. Proxied JSON-RPC observation has automated coverage in [[tests/unit/adapters/codex-proxy.test.ts]]. |

Sources:

- MVP closeout smoke baseline: `logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md` §1 recorded 48 files / 360 tests /
  typecheck / build PASS.
- W7 reset verification: `logs/workspace-reset/packages/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md` records a dated
  `pnpm typecheck && pnpm test` pass with 52 files / 483 tests. Do not treat that dated count as the current
  test-suite size; W2 retrofit review on 2026-06-28 observed 49 files under `tests/`.
