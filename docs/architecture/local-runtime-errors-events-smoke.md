# aiox Local Runtime — Typed Error Catalog, Events Catalog, Smoke Matrix (§10–§12)

> 컨텍스트: [[local-agent-runtime]] 인덱스. status 어휘·module overview·authority links는 인덱스가 소유한다.
>
> 이 slice는 daemon/adapters/router/socket/CLI를 가로지르는 reference appendix(typed error·event
> catalog·implementation smoke 검증 출처)다.

## 10. Consolidated Typed Error Catalog

### 10.1 Daemon API

| Reason | Surface | When | Cite |
|---|---|---|---|
| `agent_name_already_connected` | `AttachAgentResponse` | reattach attempt while connected | `core/agents.ts:34, 47`; `api.ts:143` |
| `agent_already_attached` | `AttachAgentResponse` | agent is already attached to this pair | `core/pairs.ts:39`, `store/repositories/pairs.ts:118`, `daemon/state.ts:573` |
| `pair_not_found` | `AttachAgentResponse` | `--pair` unknown | `state.ts:232, 539` |
| `pair_slot_occupied` | `AttachAgentResponse` | target slot already taken by another agent | `core/pairs.ts:39`; `repositories/pairs.ts:48, 150` |
| `pair_full` | `AttachAgentResponse` | both slots already filled | `core/pairs.ts:44`; `repositories/pairs.ts:53, 128` |
| `agent_kind_mismatch` | `AttachAgentResponse` | reconnect with different kind | `state.ts:246`; `repositories/pairs.ts:41, 94` |
| `codex_resume_failed` | `AttachAgentResponse` / adapter | resume returned mismatched/no id | `state.ts:253, 674`; `runtime.ts:234, 295` |
| `codex_runtime_attach_failed` | `AttachAgentResponse` | codex runtime attach error | `state.ts:253, 664, 688` |
| `pair_name_already_exists` | `CreatePairResponse` | duplicate `pair --name` | `state.ts:268, 751` |
| `source_agent_not_found` | many | source name unresolved | `state.ts:285, 306, 332, 1769` |
| `target_agent_not_found` | connect / disconnect / state dispatch | target name unresolved | `state.ts:290, 311, 1263` |
| `no_active_routes` | sendMessage / receiveCodexMessage | source has zero outgoing routes (β-1) | `state.ts:337, 1781` |
| `delivery_idempotency_key_exists` | sendMessage / receiveCodex* | duplicate `${messageId}:${targetAgentId}` | `state.ts:341, 1794`; `repositories/deliveries.ts:45, 129` |
| `delivery_not_found` | `updateDeliveryStatus` | unknown id | `state.ts:392, 1201` |
| `claude_channel_registration_failed` (`detail: unknown_token | invalid_endpoint`) | `registerClaudeChannel` | token mismatch / non-loopback endpoint | `state.ts:60, 931, 940` |
| `codex_channel_registration_failed` (`detail: unknown_token`) | `registerCodexChannel` | token mismatch | `state.ts:109, 1049` |
| `codex_ingress_unauthorized` (`detail: missing_token | agent_not_registered | agent_disconnected | token_mismatch`) | `receiveCodex*` | per `authorizeCodexIngress` check | `state.ts:1718-1756` |

### 10.2 Adapter — Codex (`AdapterInjectFailureReason`)

Union at [[src/adapters/contract.ts]] — `src/adapters/contract.ts:19-30`.
Returned as `{kind:"failed", reason, message, jsonRpcCode?}`
(`src/adapters/contract.ts:37-51`).

| Reason | When | Cite |
|---|---|---|
| `adapter_inject_failed` | Unrecognized error from `injectTurnStart` | `codex/injector.ts:81` |
| `codex_binding_uncertain` | pre-request or post-ack thread mismatch (Round 4 D7 swap) | `codex/injector.ts:29, 55` |
| `codex_app_server_unavailable` | declared in union, **no emission found** | `contract.ts:21` — Implementation-only |
| `codex_app_server_ws_connect_failed` | WS connect timeout/error | `codex/websocket.ts:322-327` |
| `codex_app_server_ws_initialize_failed` | initialize JSON-RPC failed | `codex/websocket.ts:217-221` |
| `codex_app_server_ws_dropped` | socket close mid-request | `codex/websocket.ts:149-163` |
| `codex_turn_start_timeout` | configured request timeout | `codex/injector.ts:46-48` |
| `codex_jsonrpc_error` | app-server returned JSON-RPC error | `codex/websocket.ts:174-183` |
| `codex_resume_failed` | adapter-level resume failure | `contract.ts:27`; `runtime.ts:228-236` |
| `codex_channel_unavailable` (state-internal) | runtime missing / not ready (deferred to `target_runtime_unavailable` in delivery) | Emitted at `state.ts:1593, 1601`; handled at `state.ts:1459-1465` |
| `codex_no_loaded_thread` (state-internal) | `thread/loaded/list` empty → kept queued (deferred to `target_binding_unconfirmed` in delivery) | Emitted at `state.ts:1622`; handled at `state.ts:1418-1456` |

### 10.3 Adapter — Claude

| Reason | When | Cite |
|---|---|---|
| `claude_channel_unavailable` | no registered runtime / fetch threw (non-abort) | `claude/injector.ts:29, 72` |
| `claude_channel_push_failed` | non-2xx or timeout | `claude/injector.ts:53, 65` |
| `claude_channel_port_in_use` | EADDRINUSE on channel-server listen (fatal boot) | `claude/channel-server.ts:422, 668-676, 687` |
| `daemon_call_failed` (MCP isError) | tool socket call threw | `claude/channel-server.ts:347, 388` (also in Codex MCP server `mcp-server.ts:216, 262`) |
| fatal `missing_env_*`, `invalid_env_AIOX_CLAUDE_CHANNEL_PORT` | channel-server boot | `claude/channel-server.ts:638-650, 652-665` — Implementation-only |

### 10.4 Router

| Reason | When | Cite |
|---|---|---|
| `target_agent_not_found` | router cannot resolve delivery's targetAgentId | `router.ts:25, 73, 81` |
| `target_adapter_not_registered` | no adapter for target kind (part of deferred logical dispatch) | `contract.ts:33` (type), `router.ts:94` (returned value) |
| `adapter_not_found` | declared at router signature, **never returned** | `router.ts:25` — Implementation-only / dead union member |

### 10.5 Socket Transport (envelope)

| Reason | When | Cite |
|---|---|---|
| `invalid_envelope` | not a request envelope | `socket-transport.ts:177` |
| `unknown_method` | method not on `DaemonApi` | `socket-transport.ts:190` |
| `internal_error` | API handler threw | `socket-transport.ts:213` |
| `invalid_json` | frame not parseable as JSON | `socket-transport.ts:228` |

### 10.6 CLI Parse / Invocation

| Code | When | Cite |
|---|---|---|
| `aiox.missingCommand` | no subcommand | `cli/parse.ts:117-122, 128-131` |
| `aiox.invalidName` | empty or control-char name | `cli/parse.ts:149-165` |
| `aiox.missingTargets` | connect/disconnect with zero targets | `cli/parse.ts:300-305` |
| `aiox.invalidScope` | setup with invalid scope value | `cli/parse.ts:251-255` |
| `aiox.<commander-code>` | other commander error | `cli/parse.ts:108-111, 127-138` |
| `aiox.invocation.missing_daemon_socket_path` | Claude attach without socket path | `cli/invocation.ts:205` |
| `aiox.invocation.claude_plugin_setup.<code_or_failed>` | CLI setup command failed/errored | `cli/invocation.ts:335-342, 345-350` |
| `aiox.invocation.claude_plugin_inventory_failed` | CLI attach inventory read error | `cli/invocation.ts:420-424` |
| `aiox.invocation.claude_preflight.<code_or_failed>` | CLI attach preflight checks failed | `cli/invocation.ts:441-448` |
| `aiox.invocation.invalid_claude_channel_strategy` | invalid strategy env var | `cli/invocation.ts:492-498` |
| `aiox.invocation.tui_launch_failed` | Codex TUI spawn error / wait-for-exit error | `cli/invocation.ts:528-534, 557-563, 589-593` |
| `aiox.invocation.unhandled_command` | `assertNever` fallback | `cli/invocation.ts:640` |
| `aiox.invocation.<reason>` | wrapped daemon `ok:false` | `cli/invocation.ts:622` |

---

## 11. Consolidated Events Catalog

Declaration: [[src/core/events.ts]] — `src/core/events.ts:1-27` (25 entries). All emissions go
through `events.append`.

| Event type | Payload | Emission site | When |
|---|---|---|---|
| `message_created` | `{}` | `state.ts:1827-1836` | inside sendMessage tx |
| `delivery_queued` | `{}` | `state.ts:1838-1848` | per queued delivery |
| `delivery_status_changed` | `{status, error?}` | `state.ts:1221-1238` | each `updateDeliveryStatus` |
| `agent_runtime_failed` | `{reason, latestDiagnosticNotification?}` | `state.ts:900-918` | Codex runtime exit / WS drop |
| `agent_graceful_detach` | `{trigger}` or `{trigger:"tui_exit", exitCode, signal}` | `state.ts:1893-1911` | `detachCodexAgent` |
| `agent_thread_id_rebound` | `{previousId, nextId, operation, source, requestId?}` | three sites: `state.ts:694-710` (attach_resume), `1550-1566` (loaded_list), `1655-1672` (proxy_binding) | Codex active-thread rebinds |
| `codex_delivery_queued_no_loaded_thread` | `{reason, message}` | `state.ts:1439-1451` | dispatch found no loaded thread |
| `codex_delivery_target_selected` | `{operation, loadedThreadIds, chosenThreadId, previousAdapterSessionId, runtimeActiveThreadId, selectionPolicy, deliveryMessageType, sourceAgentId, sourceAgentName, targetAgentName}` | `state.ts:1474-1494` | live target resolved |
| `codex_delivery_target_unavailable` | `{...same shape with reason}` | `state.ts:1419-1438` | paired with `queued_no_loaded_thread` |
| `codex_delivery_target_injection_failed` | `{chosenThreadId, loadedThreadIds, reason, message, source/target names}` | `state.ts:1516-1533` | `injectReplyIntoCodexRuntime` failed |
| `claude_channel_message_received` | `{text, messageId?}` | `state.ts:983-995` | `receiveClaudeChannelMessage` |
| `claude_channel_reply_received` | `{chatId, text, messageId?}` | `state.ts:1018-1031` | `receiveClaudeChannelReply` |
| `codex_channel_registered` | `{tokenHash}` (short hash) | `state.ts:1063-1072` | `registerCodexChannel` |
| `codex_channel_disconnected` | `{}` | `state.ts:1082-1091` | `disconnectCodexChannel` (only if had runtime) |
| `codex_ingress_message_received` | `{messageId}` | `state.ts:1108-1117` | `receiveCodexMessage` ok |
| `codex_ingress_reply_received` | `{messageId, parentMessageId}` | `state.ts:1140-1152` | `receiveCodexReply` ok |

**Declared but not emitted in current `src/`** (Implementation-only):
`agent_registered`, `agent_reconnected`, `agent_disconnected`,
`pair_created`, `pair_ready`, `route_connected`, `route_disconnected`,
`codex_binding_uncertain_observed`, `late_reply`. Planned at Step 10 but did
not land at MVP closeout.

---

## 12. Implementation Smoke Matrix

The closeout smoke (logs/2026-06-19-mvp-history-archive.md §1) ran from build output because
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
| basic `claude → codex → claude` | message and reply visible both sides | ✅ | Automated ([[tests/unit/adapters/fake-integration.test.ts]], [[tests/unit/daemon/codex-ingress.test.ts]]) |
| Codex TUI `/clear` | next Claude→Codex delivery appears in visible thread | ✅ | Manual smoke test scenario (Relies on proxied JSON-RPC observation tested in `codex-proxy.test.ts`) |
| Codex TUI `/new` | next delivery in visible thread | ✅ | Manual smoke test scenario (Relies on proxied JSON-RPC observation tested in `codex-proxy.test.ts`) |
| Codex TUI `/fork` | next delivery in visible fork target | ✅ | Manual smoke test scenario (Relies on proxied JSON-RPC observation tested in `codex-proxy.test.ts`) |
| Codex TUI `/resume` | next delivery in resumed visible thread | ✅ | Manual smoke test scenario (Relies on proxied JSON-RPC observation tested in `codex-proxy.test.ts`) |
| `/resume → /clear` | next delivery in cleared visible thread | ✅ | Manual smoke test scenario (Relies on proxied JSON-RPC observation tested in `codex-proxy.test.ts`) |
| `/resume → /new` | next delivery in new visible thread | ✅ | Manual smoke test scenario (Relies on proxied JSON-RPC observation tested in `codex-proxy.test.ts`) |
| `/resume → /fork` | next delivery in forked visible thread | ✅ | Manual smoke test scenario (Relies on proxied JSON-RPC observation tested in `codex-proxy.test.ts`) |

Verification baseline (`logs/2026-06-19-mvp-history-archive.md` §1): 48 files
/ 360 tests / typecheck / build PASS. (Vitest test suite has grown to 52 test
files / 483 tests as of W7 reset).
