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
| `agent_already_attached` | `AttachAgentResponse` | agent is already attached to this pair | [[src/core/pairs.ts]] `src/core/pairs.ts:39`, `:71`; [[src/store/repositories/pairs.ts]] `src/store/repositories/pairs.ts:118`; [[src/daemon/state.ts]] `src/daemon/state.ts:573` |
| `pair_not_found` | `AttachAgentResponse` | `--pair` unknown | [[src/daemon/api.ts]] `src/daemon/api.ts:148`; [[src/daemon/state.ts]] `src/daemon/state.ts:232`, `:539` |
| `pair_slot_occupied` | `AttachAgentResponse` | target slot already taken by another agent | [[src/core/pairs.ts]] `src/core/pairs.ts:39`, `:93`; [[src/store/repositories/pairs.ts]] `src/store/repositories/pairs.ts:48`, `:150`; [[src/daemon/state.ts]] `src/daemon/state.ts:573-576` |
| `pair_full` | `AttachAgentResponse` | both slots already filled | [[src/core/pairs.ts]] `src/core/pairs.ts:44`, `:81`; [[src/store/repositories/pairs.ts]] `src/store/repositories/pairs.ts:53`, `:128`; [[src/daemon/state.ts]] `src/daemon/state.ts:242`, `:573-576` |
| `agent_kind_mismatch` | `AttachAgentResponse` | reconnect with different kind | [[src/store/repositories/pairs.ts]] `src/store/repositories/pairs.ts:41`, `:94`; [[src/daemon/state.ts]] `src/daemon/state.ts:246`, `:573-576` |
| `codex_resume_failed` | `AttachAgentResponse` / adapter | resume returned mismatched/no id | [[src/daemon/api.ts]] `src/daemon/api.ts:169`; [[src/daemon/state.ts]] `src/daemon/state.ts:253`, `:674`; [[src/adapters/codex/runtime.ts]] `src/adapters/codex/runtime.ts:234`, `:295` |
| `codex_runtime_attach_failed` | `AttachAgentResponse` | codex runtime attach error | [[src/daemon/api.ts]] `src/daemon/api.ts:169`; [[src/daemon/state.ts]] `src/daemon/state.ts:253`, `:664`, `:688` |
| `pair_name_already_exists` | `CreatePairResponse` | duplicate `pair --name` | [[src/daemon/api.ts]] `src/daemon/api.ts:180`; [[src/daemon/state.ts]] `src/daemon/state.ts:268`, `:751` |
| `source_agent_not_found` | many | source name unresolved | [[src/daemon/api.ts]] `src/daemon/api.ts:192`, `:208`, `:229`; [[src/daemon/state.ts]] `src/daemon/state.ts:285`, `:306`, `:332`, `:1769`, `:2190` |
| `target_agent_not_found` | connect / disconnect / state dispatch | target name unresolved | [[src/daemon/api.ts]] `src/daemon/api.ts:197`, `:213`; [[src/daemon/state.ts]] `src/daemon/state.ts:290`, `:311`, `:1263`, `:2206` |
| `no_active_routes` | sendMessage / receiveCodexMessage | source has zero outgoing routes (β-1) | [[src/daemon/api.ts]] `src/daemon/api.ts:234`, `:291`; [[src/daemon/state.ts]] `src/daemon/state.ts:337`, `:1781` |
| `delivery_idempotency_key_exists` | sendMessage / receiveCodex* | duplicate `${messageId}:${targetAgentId}` | [[src/daemon/api.ts]] `src/daemon/api.ts:238`, `:295`; [[src/daemon/state.ts]] `src/daemon/state.ts:341`, `:1794`, `:2004`; [[src/store/repositories/deliveries.ts]] `src/store/repositories/deliveries.ts:45`, `:129` |
| `delivery_not_found` | `updateDeliveryStatus` | unknown id | [[src/daemon/api.ts]] `src/daemon/api.ts:249`; [[src/daemon/state.ts]] `src/daemon/state.ts:392`, `:1201`, `:1216` |
| `claude_channel_registration_failed` (`detail: unknown_token | invalid_endpoint`) | `registerClaudeChannel` | token mismatch / non-loopback endpoint | [[src/daemon/state.ts]] `src/daemon/state.ts:60`, `:931`, `:940` |
| `codex_channel_registration_failed` (`detail: unknown_token`) | `registerCodexChannel` | token mismatch | [[src/daemon/state.ts]] `src/daemon/state.ts:109`, `:1044-1051` |
| `codex_ingress_unauthorized` (`detail: missing_token | agent_not_registered | agent_disconnected | token_mismatch`) | `receiveCodex*` | per `authorizeCodexIngress` check | [[src/daemon/api.ts]] `src/daemon/api.ts:290`; [[src/daemon/state.ts]] `src/daemon/state.ts:1718-1756` |

### 10.2 Adapter — Codex (`AdapterInjectFailureReason`)

Union at [[src/adapters/contract.ts]] — `src/adapters/contract.ts:19-30`.
Returned as `{kind:"failed", reason, message, jsonRpcCode?}`
(`src/adapters/contract.ts:37-51`).

| Reason | When | Cite |
|---|---|---|
| `adapter_inject_failed` | Unrecognized error from `injectTurnStart` | [[src/adapters/codex/injector.ts]] `src/adapters/codex/injector.ts:81` |
| `codex_binding_uncertain` | pre-request or post-ack thread mismatch (Round 4 D7 swap) | [[src/adapters/codex/injector.ts]] `src/adapters/codex/injector.ts:29`, `:55`; [[src/adapters/codex/runtime.ts]] `src/adapters/codex/runtime.ts:295` |
| `codex_app_server_unavailable` | declared in union and state dispatch type, **no emission found** | [[src/adapters/contract.ts]] `src/adapters/contract.ts:21`; [[src/daemon/state.ts]] `src/daemon/state.ts:347` — Implementation-only |
| `codex_app_server_ws_connect_failed` | WS connect timeout/error | [[src/adapters/codex/websocket.ts]] `src/adapters/codex/websocket.ts:322-327` |
| `codex_app_server_ws_initialize_failed` | initialize JSON-RPC failed | [[src/adapters/codex/websocket.ts]] `src/adapters/codex/websocket.ts:217-221` |
| `codex_app_server_ws_dropped` | socket close mid-request | [[src/adapters/codex/websocket.ts]] `src/adapters/codex/websocket.ts:149-163` |
| `codex_turn_start_timeout` | configured request timeout | [[src/adapters/codex/injector.ts]] `src/adapters/codex/injector.ts:46-48`; [[src/adapters/codex/websocket.ts]] `src/adapters/codex/websocket.ts:247` |
| `codex_jsonrpc_error` | app-server returned JSON-RPC error | [[src/adapters/codex/websocket.ts]] `src/adapters/codex/websocket.ts:174-183` |
| `codex_resume_failed` | adapter-level resume failure | [[src/adapters/contract.ts]] `src/adapters/contract.ts:27`; [[src/adapters/codex/runtime.ts]] `src/adapters/codex/runtime.ts:228-236` |
| `codex_channel_unavailable` (state-internal) | runtime missing / not ready (deferred to `target_runtime_unavailable` in delivery) | Emitted at [[src/daemon/state.ts]] `src/daemon/state.ts:1593`, `:1601`; handled at `src/daemon/state.ts:1459-1465` |
| `codex_no_loaded_thread` (state-internal) | `thread/loaded/list` empty -> kept queued (deferred to `target_binding_unconfirmed` in delivery) | Emitted at [[src/daemon/state.ts]] `src/daemon/state.ts:1622`; handled at `src/daemon/state.ts:1418-1456` |

### 10.3 Adapter — Claude

| Reason | When | Cite |
|---|---|---|
| `claude_channel_unavailable` | no registered runtime / fetch threw (non-abort) | [[src/adapters/claude/injector.ts]] `src/adapters/claude/injector.ts:29`, `:72` |
| `claude_channel_push_failed` | non-2xx or timeout | [[src/adapters/claude/injector.ts]] `src/adapters/claude/injector.ts:53`, `:65` |
| `claude_channel_port_in_use` | EADDRINUSE on channel-server listen (fatal boot) | [[src/adapters/claude/channel-server.ts]] `src/adapters/claude/channel-server.ts:422`, `:668-676`, `:687` |
| `daemon_call_failed` (MCP isError) | tool socket call threw | [[src/adapters/claude/channel-server.ts]] `src/adapters/claude/channel-server.ts:347`, `:388`; [[src/adapters/codex/mcp-server.ts]] `src/adapters/codex/mcp-server.ts:216`, `:262` |
| fatal `missing_env_*`, `invalid_env_AIOX_CLAUDE_CHANNEL_PORT` | channel-server boot | [[src/adapters/claude/channel-server.ts]] `src/adapters/claude/channel-server.ts:638-650`, `:652-665` — Implementation-only |

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
| `aiox.invalidScope` | setup with invalid scope value | [[src/cli/parse.ts]] `src/cli/parse.ts:245-255` |
| `aiox.<commander-code>` | other commander error | [[src/cli/parse.ts]] `src/cli/parse.ts:108-111`, `:127-138` |
| `aiox.invocation.missing_daemon_socket_path` | Claude attach without socket path | [[src/cli/invocation.ts]] `src/cli/invocation.ts:200-207` |
| `aiox.invocation.claude_plugin_setup.<code_or_failed>` | CLI setup command failed/errored | [[src/cli/invocation.ts]] `src/cli/invocation.ts:335-342`, `:345-350` |
| `aiox.invocation.claude_plugin_inventory_failed` | CLI attach inventory read error | [[src/cli/invocation.ts]] `src/cli/invocation.ts:415-424` |
| `aiox.invocation.claude_preflight.<code_or_failed>` | CLI attach preflight checks failed | [[src/cli/invocation.ts]] `src/cli/invocation.ts:441-448` |
| `aiox.invocation.invalid_claude_channel_strategy` | invalid strategy env var | [[src/cli/invocation.ts]] `src/cli/invocation.ts:487-498` |
| `aiox.invocation.tui_launch_failed` | Codex TUI spawn error / wait-for-exit error | [[src/cli/invocation.ts]] `src/cli/invocation.ts:528-534`, `:557-563`, `:589-593` |
| `aiox.invocation.unhandled_command` | `assertNever` fallback | [[src/cli/invocation.ts]] `src/cli/invocation.ts:638-642` |
| `aiox.invocation.<reason>` | wrapped daemon `ok:false` | [[src/cli/invocation.ts]] `src/cli/invocation.ts:616-624` |

---

## 11. Consolidated Events Catalog

Declaration: [[src/core/events.ts]] — `src/core/events.ts:1-27` (25 entries). All emissions go through
`events.append`.

| Event type | Payload | Emission site | When |
|---|---|---|---|
| `message_created` | `{}` | [[src/daemon/state.ts]] `src/daemon/state.ts:1829-1836` | inside sendMessage tx |
| `delivery_queued` | `{}` | [[src/daemon/state.ts]] `src/daemon/state.ts:1840-1848` | per queued delivery |
| `delivery_status_changed` | `{status, error?}` | [[src/daemon/state.ts]] `src/daemon/state.ts:1223-1238` | each `updateDeliveryStatus` |
| `agent_runtime_failed` | `{reason, latestDiagnosticNotification?}` | [[src/daemon/state.ts]] `src/daemon/state.ts:902-918` | Codex runtime exit / WS drop |
| `agent_graceful_detach` | `{trigger}` or `{trigger:"tui_exit", exitCode, signal}` | [[src/daemon/state.ts]] `src/daemon/state.ts:1895-1911` | `detachCodexAgent` |
| `agent_thread_id_rebound` | `{previousId, nextId, operation, source, requestId?}` | [[src/daemon/state.ts]] `src/daemon/state.ts:696-710` (attach_resume), `:1552-1566` (loaded_list), `:1657-1672` (proxy_binding) | Codex active-thread rebinds |
| `codex_delivery_queued_no_loaded_thread` | `{reason, message}` | [[src/daemon/state.ts]] `src/daemon/state.ts:1441-1451` | dispatch found no loaded thread |
| `codex_delivery_target_selected` | `{operation, loadedThreadIds, chosenThreadId, previousAdapterSessionId, runtimeActiveThreadId, selectionPolicy, deliveryMessageType, sourceAgentId, sourceAgentName, targetAgentName}` | [[src/daemon/state.ts]] `src/daemon/state.ts:1476-1494` | live target resolved |
| `codex_delivery_target_unavailable` | `{...same shape with reason}` | [[src/daemon/state.ts]] `src/daemon/state.ts:1421-1438` | paired with `queued_no_loaded_thread` |
| `codex_delivery_target_injection_failed` | `{chosenThreadId, loadedThreadIds, reason, message, source/target names}` | [[src/daemon/state.ts]] `src/daemon/state.ts:1518-1533` | `injectReplyIntoCodexRuntime` failed |
| `claude_channel_message_received` | `{text, messageId?}` | [[src/daemon/state.ts]] `src/daemon/state.ts:985-995` | `receiveClaudeChannelMessage` |
| `claude_channel_reply_received` | `{chatId, text, messageId?}` | [[src/daemon/state.ts]] `src/daemon/state.ts:1020-1031` | `receiveClaudeChannelReply` |
| `codex_channel_registered` | `{tokenHash}` (short hash) | [[src/daemon/state.ts]] `src/daemon/state.ts:1063-1072` | `registerCodexChannel` |
| `codex_channel_disconnected` | `{}` | [[src/daemon/state.ts]] `src/daemon/state.ts:1076-1091` | `disconnectCodexChannel` (only if had runtime) |
| `codex_ingress_message_received` | `{messageId}` | [[src/daemon/state.ts]] `src/daemon/state.ts:1108-1117` | `receiveCodexMessage` ok |
| `codex_ingress_reply_received` | `{messageId, parentMessageId}` | [[src/daemon/state.ts]] `src/daemon/state.ts:1140-1152` | `receiveCodexReply` ok |

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
