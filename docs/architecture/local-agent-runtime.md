# aiox MVP — As-Built Architecture

> Date: 2026-05-26
> Status: MVP implementation closed (closeout baseline: logs/2026-06-19-mvp-history-archive.md §1); promoted to as-built
> architecture authority on 2026-06-16.
> Role: this is the `docs/architecture` authority for the current aiox MVP
> internal structure, responsibility boundaries, data flow, and lifecycle
> invariants.
> Product/spec intent lives in `docs/product/` and `docs/specs/`; the former
> MVP PRD is absorbed/deleted during workspace reset and is not primary
> authority. Legacy pre-validation spike material is archived as workspace-reset
> evidence, not current architecture authority. Decision rationale lives in `docs/decisions/`;
> MVP implementation and QA provenance lives in
> `logs/2026-06-19-mvp-history-archive.md`. When this document
> conflicts with code or authority docs, update this document.
>
> Every concrete claim cites current `file:line` evidence or a migrated
> decision/archive provenance note. Where a
> behavior exists in code but has no recorded rationale, it is marked
> **Implementation-only (no recorded rationale)** — the description is factual,
> not inferred.

---

## 0. Purpose

aiox is a local AI agent orchestration tool. The MVP wires two CLI agent
sessions into a pair (slot `a` and slot `b`) so each can send/reply to the
other through a local daemon. Slots are vendor-agnostic: same-vendor
(codex↔codex, claude↔claude) and mixed (claude↔codex) pairs are both
allowed; the default usage connects one Claude and one Codex session. Pair
cardinality is fixed at exactly 2 (Step 15; `docs/decisions/pair-slot-generalization.md`).
This document is the entry point for
debugging, onboarding, and verifying behavior. It covers:

- Process topology
- SQLite schema and repositories
- Daemon API surface and socket transport
- Claude adapter (channel-server / launcher / injector / ingress RPCs)
- Codex adapter (per-agent app-server + per-agent transparent proxy + TUI +
  MCP ingress + injector + `--resume`)
- Cross-cutting message routing (sendMessage idempotency, router, delivery
  state machine, queued fallback, `parent_message_id`)
- CLI surface + invocation layer + doctor/status
- Consolidated catalogs of typed errors and events
- Lifecycle invariant
- Implementation smoke matrix
- Known gaps / Post-MVP

---

## 1. Process Topology

Per running pair the OS sees the following processes:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│   ┌─────────────────────────────┐         ┌──────────────────────────┐    │
│   │  aiox daemon (in-mem SQLite)│         │  aiox CLI (per command)  │    │
│   │                             │         │                          │    │
│   │  socket: ~/.aiox/daemon.sock│◀───UDS──│  createClientRuntime     │    │
│   │  state.ts / api.ts          │         │  invocation.ts           │    │
│   │  codexRuntimes Map          │         └─────────────┬────────────┘    │
│   │  claudeChannelRuntimes Map  │                       │                 │
│   │  codexChannelRuntimes Map   │                       │ spawn (inherit) │
│   └──────┬──────────────────────┘                       ▼                 │
│          │                                  ┌────────────────────────┐    │
│          │ owns per Codex agent             │  codex --remote <proxy>│    │
│          ▼                                  │  (foreground TUI)      │    │
│   ┌──────────────────┐  WS ┌───────────┐    └───────────┬────────────┘    │
│   │  per-agent proxy │◀───▶│ app-server│◀──────────WS───┘                 │
│   │  (in daemon proc │     │ child proc│                                  │
│   │   :0 WS server)  │     │  --listen │                                  │
│   └──────────────────┘     │  ws://:0  │ spawns MCP host child            │
│          ▲                 └─────┬─────┘                                  │
│          │ daemon                │ -c mcp_servers.aiox = {...}            │
│          │ JSON-RPC              ▼                                        │
│          │              ┌──────────────────────┐                          │
│          │              │  aiox mcp-codex      │                          │
│          │              │  (stdio MCP child)   │                          │
│          │              └──────────┬───────────┘                          │
│          │                         │ unix socket                          │
│          │                         ▼                                      │
│          │                  daemon.receiveCodex*                          │
│          │                                                                │
│          │  per Claude agent                                              │
│          │  ┌──────────────────────────────────────────────────────┐       │
│          │  │  claude CLI                                          │       │
│          │  │   ↓ default: plugin:aiox-channel-ingress@aiox (D)   │       │
│          │  │     legacy:  --mcp-config inline (A, explicit only) │       │
│          │  │  channel-server (stdio)                              │       │
│          │  │  HTTP /send 127.0.0.1:0 │◀── daemon HTTP POST (inject)      │
│          │  └──────────────────────────────────────────────────────┘       │
│          │                                                                │
└──────────┴────────────────────────────────────────────────────────────────┘
```

**Per-agent counts**

- Codex agent → 1 app-server child (daemon-owned) + 1 proxy WS server
  (in-process in daemon) + 1 TUI child (CLI-owned, `stdio:"inherit"`) + 1
  `aiox mcp-codex` stdio child (app-server-owned via Codex MCP host).
- Claude agent → 1 `claude` child (CLI-owned, foreground) + 1 channel-server
  stdio child (Claude-owned; default: activated via `plugin:aiox-channel-ingress@aiox`
  (D strategy; docs/decisions/claude-channel-plugin-default.md); legacy: launcher-injected `--mcp-config` inline
  (`AIOX_CLAUDE_CHANNEL_STRATEGY=inline`, dev/debug only)).

**MVP invariant** (WHY: docs/decisions/codex-per-agent-app-server.md §5)
`Daemon manages exactly one direct child per Codex agent: the app-server.
Cleanup is WS close → SIGTERM → 3s grace → SIGKILL. No process group kill,
no setsid, no PR_SET_PDEATHSIG, no periodic healthz, no auto-reconnect, no
TUI heartbeat. TUI lifecycle is owned by the CLI process scope.`

Authority: docs/decisions/codex-per-agent-app-server.md (per-agent app-server
pivot, production direction); Round 3 implementation and closeout provenance in
logs/2026-06-19-mvp-history-archive.md §2.2, §1.

---

## 2. SQLite Schema

In-memory only — `runDaemonProcess` opens `new Database(":memory:")`
(`src/daemon/run.ts:25`). The file-mode helper `openSqliteDatabase`
(`src/store/sqlite.ts:5-12`) is unused. `applySchema`
(`src/store/schema.ts:14-82`) first runs the idempotent
`create table if not exists` block, then calls `applyMigration1`
(`src/store/schema.ts:81`). `applyMigration1` (`src/store/schema.ts:84-135`)
is the versioned migration introduced by Step 15; the slot model below
depends on it.

| Table | Key columns | Notes |
|---|---|---|
| `agents` | `id PK`, `name UNIQUE NOT NULL`, `kind`, `status`, `cwd`, `pair_id`, `pair_slot`, `adapter_session_id`, `last_seen_at`, timestamps | `adapter_session_id` holds Codex active thread id (nullable). `pair_id` no FK. `pair_slot ∈ {a,b}` (nullable; set on pair attach). |
| `pairs` | `id PK`, `name UNIQUE NOT NULL`, `status` (`pending`/`ready`/`stale`) | `stale` exists in the `PairStatus` type (`src/core/pairs.ts:3`) but no code path writes it — type-only; transition policy unimplemented (gap). |
| `routes` | `id PK`, `source_agent_id`, `target_agent_id`, `status`, `UNIQUE(source,target)` | Directed. No FK. |
| `messages` | `id PK`, `source_agent_id`, `parent_message_id` (nullable), `type`, `content`, timestamps | Type ∈ `question|instruction|status|event|reply`. |
| `message_deliveries` | `id PK`, `message_id`, `target_agent_id`, `route_id`, `status`, `idempotency_key UNIQUE NOT NULL` | UNIQUE constraint is load-bearing for the rollback-sentinel reclassify pattern. |
| `schema_version` | `version PK`, `applied_at` | Migration ledger created by `applyMigration1` (`src/store/schema.ts:125-133`). `isMigrationApplied` gates re-runs (`src/store/schema.ts:137-147`). |
| `events` | `id PK`, `agent_id`/`message_id`/`delivery_id`/`route_id` (all nullable), `type`, `data_json`, `created_at` | Append-only. |

**Migration 1 + slot invariant** (Step 15; docs/decisions/pair-slot-generalization.md).
`applyMigration1` runs entirely inside one `withTransaction`
(`src/store/schema.ts:89-134`) and is skipped once `schema_version` row 1
exists. Steps: (1) preflight — if `pair_slot` is absent, group existing
attached agents by `(pair_id, kind)` and **throw** if any group has >1 row
(`schema.ts:92-107`); (2) `alter table agents add column pair_slot`
(`schema.ts:109`); (3) backfill `codex→'a' / claude→'b'`
(`schema.ts:110-117`); (4) create **partial unique index**
`agents_pair_slot_unique on agents(pair_id, pair_slot) where pair_id is not
null` (`schema.ts:120-124`); (5) record `schema_version` row 1
(`schema.ts:125-133`). The partial unique index is load-bearing: it
enforces the 2-slot occupancy invariant (at most one agent per `(pair_id,
slot)`) at the DB level, independent of the repository-level checks in §3.
Preflight failure throws a typed `SchemaMigrationError` with
`reason: "schema_migration_failed"`,
`detail: "duplicate_pair_slot_after_backfill"` and the conflicting
`(pair_id, kind)` groups (`src/store/schema.ts:5-12, 163-173`); the whole
transaction rolls back, aborting daemon boot.

Related decision: `docs/decisions/pair-slot-generalization.md`.

`recoverAfterRestart` exists on `DeliveryRepository`
(`src/store/repositories/deliveries.ts:148-158`) and resets
`delivering → queued`, but has **no caller** in `src/`
— Implementation-only (no recorded rationale for non-wiring; daemon DB is
in-memory so there is nothing to recover anyway).

---

## 3. Repositories

All under `src/store/repositories/`. Snake-case rows mapped to camelCase
domain objects. Transactional boundaries are owned by callers in
`src/daemon/state.ts`, wrapped through
`src/store/transaction.ts:3-5` (`withTransaction = db.transaction(fn)()`).

| Repo | Key methods | Key transactional logic |
|---|---|---|
| `agents` | `attach`, `findByName`, `list`, `markByNameDisconnected`, `markAllConnectedDisconnected`, `rebindAdapterSessionId` | `attach` upsert; rejects with `agent_name_already_connected` if existing row is `connected`. No internal tx. |
| `pairs` | `createReservation`, `attachAgent` | `attachAgent` runs in own `db.transaction` (`repositories/pairs.ts:77-192`): verifies agent exists; confirms input `kind` equals the stored agent `kind` (consistency check, **not** a vendor-pairing constraint — `repositories/pairs.ts:91-99`); self-loop guard via `agent_already_attached` (`repositories/pairs.ts:101-121`); picks the first open slot a→b kind-agnostically when no explicit slot given (`pickFirstOpenSlot`, `repositories/pairs.ts:246-258`); rejects if the chosen slot is occupied by another agent (`pair_slot` query, `repositories/pairs.ts:132-153`); writes `pair_id`+`pair_slot`; recomputes `status = "ready"` only when both slots a·b are filled, kind-agnostic (`isPairReady`, `repositories/pairs.ts:260-263`). same-vendor pairs (codex↔codex, claude↔claude) are supported. |
| `routes` | `create`, `disconnect`, `findBySourceAndTarget`, `list` | `create` returns typed `route_already_exists`; `disconnect` collects rows then deletes in a tx. |
| `messages` | `create`, `count`, `list` | Plain inserts; no tx. |
| `deliveries` | `createQueuedForRoutes`, `updateStatus`, `findByIdempotencyKey`, `countByStatus`, `recoverAfterRestart` | `createQueuedForRoutes` inserts all rows in one `db.transaction`. UNIQUE collision on `idempotency_key` is caught and reclassified to typed `delivery_idempotency_key_exists` with the existing row attached (`deliveries.ts:117, 215-222`). |
| `events` | `append`, `list` | Append-only. |

**Rollback sentinel pattern** (WHY: docs/decisions/pair-attach-atomicity-and-sentinel.md):
two module-local `Symbol`s in `src/daemon/state.ts:36-37`:

- `attachRollbackSentinel` — used by `attachAgent` so
  `agent_already_attached` / `pair_slot_occupied` / `pair_full` /
  `agent_kind_mismatch` can throw out of `withTransaction` cleanly
  (`src/daemon/state.ts:572-579`). Reclassified at the outer catch via
  `isAttachRollback`.
- `sendMessageRollbackSentinel` — used by `runSendMessageTransaction` to
  unwind on `delivery_idempotency_key_exists` (both the in-tx preflight and
  the UNIQUE-catch path).

The symbols are module-private to ensure unrelated callers cannot fabricate
the rollback token.

---

## 4. Daemon Lifecycle and Socket Transport

### 4.1 Daemon Lifecycle

`aiox _run-daemon --socket <path>` is the hidden long-running entry point
(`src/cli/parse.ts:315-321`; dispatched in `src/cli/invocation.ts:211-215`).
`runDaemonProcess` (`src/daemon/run.ts:24-87`):

1. Opens in-memory SQLite, applies schema.
2. Builds the server with `createDaemonServer`, threading the production
   `attachCodexRuntime`.
3. Wraps the `stop` RPC so the daemon schedules `shutdown()` on
   `setImmediate` after responding to the client (`run.ts:66-73`).
4. Registers once-shot SIGTERM/SIGINT handlers (`run.ts:83-84`).

`shutdown()` (`run.ts:47-61`) closes the socket server, marks all
connected agents disconnected (`stop({})`), and `db.close()`s.

**Socket path resolution** (`src/config/paths.ts:9-25, 92-102`):
`$AIOX_SOCKET_PATH` if set, else `~/.aiox/daemon.sock` for `release` profile, or `~/.aiox/<profile>/daemon.sock` for `dev` and `build` profiles (`mkdir -p` parent).

**Auto-start** is wired only on the `agent-attach` branch
(`src/cli/invocation.ts:108-111`). `aiox daemon start` and all other
commands either start explicitly or are connect-only and will fail if the
daemon is absent. See command table in §9.1.

### 4.2 Socket Transport

`src/daemon/socket-transport.ts`. WHY authority: docs/decisions/uds-transport-and-framing-contract.md.

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

```mermaid
sequenceDiagram
    autonumber
    participant Client as aiox CLI
    participant UDS as ~/.aiox/daemon.sock
    participant Server as socket-transport
    participant API as DaemonApi
    participant State as DaemonState
    participant Tx as withTransaction
    participant DB as SQLite

    Client->>UDS: NDJSON {id,method:"sendMessage",params}\n
    UDS->>Server: data → split lines
    Server->>API: api.sendMessage(params)
    API->>State: state.sendMessage(req)
    State->>Tx: withTransaction(db, fn)
    Tx->>DB: BEGIN
    Tx->>DB: agents.findByName(sourceName)
    alt source missing
        Tx-->>State: {ok:false,reason:"source_agent_not_found"}
        Tx->>DB: COMMIT (no writes)
    else
        Tx->>DB: routes.list filter sourceId
        alt no routes
            Tx-->>State: {ok:false,reason:"no_active_routes"}
        else
            Tx->>DB: deliveries.findByIdempotencyKey (preflight)
            alt existing
                Tx->>Tx: throw sendMessageRollbackSentinel
                Tx->>DB: ROLLBACK
            else
                Tx->>DB: messages.create (UNIQUE catch → sentinel)
                Tx->>DB: deliveries.createQueuedForRoutes (UNIQUE catch → sentinel)
                Tx->>DB: events.append message_created + delivery_queued*
                Tx->>DB: COMMIT
            end
        end
    end
    State-->>API: SendMessageResult
    API-->>Server: SendMessageResponse
    Server->>UDS: {id, ok:true, result}\n
    UDS->>Client: settleResponse(id).resolve
```

---

## 5. Daemon API Surface

All RPCs are declared at `src/daemon/api.ts:49-87`; state implementations in
`src/daemon/state.ts:471-1133`. Daemon API typed errors never throw at the
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

---

## 6. Claude Adapter

### 6.1 Topology

Per Claude agent: 1 Claude CLI process + 1 channel-server stdio child
(spawned by Claude itself) + 1 loopback HTTP `/send` ingress on 127.0.0.1.

**Channel activation strategy** (`src/cli/invocation.ts:161-164, 219-220`):

- **Default (D — plugin strategy)**: `plugin:aiox-channel-ingress@aiox` activates
  the channel-server. `AIOX_CLAUDE_CHANNEL_STRATEGY` unset or `"plugin"`. Preflight
  validates plugin installation before attach.
  Related decision: `docs/decisions/claude-channel-plugin-default.md`.
- **Legacy (A — inline strategy)**: `AIOX_CLAUDE_CHANNEL_STRATEGY=inline` only.
  Launcher injects `--mcp-config` with an inline aiox channel server definition
  (`buildClaudeChannelMcpConfig`). Dev/debug opt-out; no auto-fallback from D.

Channel-server is **not** a daemon child. The daemon only stores an
in-memory pointer (`claudeChannelRuntimes` Map at `state.ts:521-522`); no DB
row. Rationale: docs/decisions/claude-channel-trust-and-registration.md (DB-only + daemon memory registry).

### 6.2 Launch Flow (`aiox claude --name <n>`)

1. Parser registers `--name` and `--pair`. `--resume` is option-scoped to
   the codex subcommand, so commander rejects `--resume` on `claude` at
   parse stage (`src/cli/parse.ts:268-270`).
2. CLI auto-starts daemon, calls `attachAgent({kind:"claude", name, ...})`.
3. Daemon mints a `randomUUID()` claude channel token, stores it in
   `claudePendingTokens[agentName]`, returns it as `claudeChannelToken`
   (`state.ts:625-630`).
4. CLI resolves channel strategy (`invocation.ts:161-164`).
   - **Default — D plugin strategy** (`AIOX_CLAUDE_CHANNEL_STRATEGY` unset or `"plugin"`):
     Preflight checks plugin installation (`preflightStrategyDPlugin`). On pass,
     calls `launchClaudePluginChannel({pluginName:"aiox-channel-ingress", ...})`
     (`invocation.ts:238-248`). Claude activates channel-server via the installed
     plugin `plugin:aiox-channel-ingress@aiox`; token and socket path flow via env
     vars that the plugin's `.mcp.json` expands.
   - **Legacy — A inline strategy** (`AIOX_CLAUDE_CHANNEL_STRATEGY=inline`, dev/debug only):
     Calls `launchClaudeWithChannel({channelName:"aiox-claude-ingress", agentName,
     agentToken, daemonSocketPath})` (`src/adapters/claude/launcher.ts`). The
     launcher appends `--mcp-config` with an inline channel-server definition
     (`buildClaudeChannelMcpConfig`, `launcher.ts:94-118`): `command` = node/tsx (execution-mode
     resolved), `args` = absolute `channel-server.js|ts`, `env` =
     `AIOX_CLAUDE_CHANNEL_AGENT_NAME` / `AIOX_CLAUDE_CHANNEL_TOKEN` /
     `AIOX_SOCKET_PATH`. No auto-fallback from D to A on D preflight failure.
5. Claude spawns the channel-server stdio child (via plugin resolution or injected
   `--mcp-config` depending on strategy).
6. channel-server (`src/adapters/claude/channel-server.ts:549-581`):
   - `parseChannelServerEnv` fatal-exits if any required env is missing
     (`missing_env_*`, `channel-server.ts:538-547, 638-650`).
   - Creates an `McpServer` with capability `experimental:
     {"claude/channel":{}}` and `instructions: CLAUDE_CHANNEL_INSTRUCTIONS`
     (`channel-server.ts:258-305`).
   - Registers MCP tools `send(text)` and `reply(chat_id, text)`
     (`channel-server.ts:272-302`).
   - Starts HTTP ingress on 127.0.0.1:0 (or
     `AIOX_CLAUDE_CHANNEL_PORT`, `channel-server.ts:432-478`).
   - Calls `daemon.registerClaudeChannel({agentName, token, endpoint})`
     (`channel-server.ts:491-525`).
7. Daemon validates the pending token and the endpoint
   (`parseLoopbackHttpEndpoint`: must be `http:` on loopback, path `/send`,
   non-empty port). On failure → `claude_channel_registration_failed` with
   `detail: "unknown_token"` or `"invalid_endpoint"`. Channel-server
   `process.exit(1)` on registration failure (`channel-server.ts:513`).
8. CLI awaits Claude exit then calls
   `disconnectClaudeChannel({agentName})`. Unlike Codex, no
   `claude_channel_disconnected` event is appended — Implementation-only
   (no recorded rationale).

### 6.3 Claude → daemon Ingress (tool calls)

Both `send` and `reply` tool handlers (`channel-server.ts:307-393`) create a
fresh `createDaemonSocketClient` per call and `close()` it `finally`.

- `send(text)` → `daemon.receiveClaudeChannelMessage({agentName, messageId,
  text})` → `runSendMessageTransaction({type:"question"})` → dispatch to
  Codex channels.
- `reply(chat_id, text)` →
  `daemon.receiveClaudeChannelReply({agentName, chatId, text})` →
  `runSendMessageTransaction({type:"reply", parentMessageId: chatId})`.
  **`chat_id` is persisted as `parent_message_id`** (`state.ts:1008-1035`;
  Step 14 provenance: `logs/2026-06-19-mvp-history-archive.md` §2.3).
- Tool errors map to MCP `isError:true` results with `daemon_call_failed`
  or the propagated daemon `reason` string
  (`channel-server.ts:326, 347, 371, 388`).

### 6.4 daemon → Claude Injection

`dispatchToPairPeers` (`state.ts:1246`) is fired by both Codex and Claude
ingress paths. For each delivery whose target is a Claude agent:

1. Transition delivery to `delivering`.
2. Call `injectClaudeChannel(lookup, {agentName, content, chatId:
   message.id, origin: sourceName})` (`src/adapters/claude/injector.ts:21-78`).
   `chat_id` is the **aiox message id**, `origin` is the **source agent
   name** (`state.ts:1364-1366`; Step 14 provenance:
   `logs/2026-06-19-mvp-history-archive.md` §2.3).
3. Injector resolves the runtime; absent → `claude_channel_unavailable`.
   `fetch(endpoint, POST, body)` with `AbortController` 5 s timeout.
   Non-2xx or timeout → `claude_channel_push_failed`. Other fetch error →
   `claude_channel_unavailable`.
4. HTTP ingress (`channel-server.ts:432-478`) validates with `InboundMessage`
   zod schema, builds `<channel source="aiox" chat_id="..." origin="...">…
   </channel>` envelope, and pushes via MCP notification
   (`notifications/claude/channel`). Responds `202` ok / `400` parse error /
   `404` wrong method or path. **Implementation-only (gap)**: The loopback HTTP
   `/send` endpoint is currently unauthenticated. This is a current factual limitation,
   not a security boundary (deferred to post-MVP).
5. On success: `delivered → completed`. On failure: `failed` with typed
   reason.

V1 trusted framing (WHY: docs/decisions/claude-channel-trust-and-registration.md) is enforced by `buildChannelNotification`
(`channel-server.ts:49-69`) and the MCP `instructions` string at lines
95-216, not by per-message confirmation.

### 6.5 Sequence — Claude reply → daemon → Codex

```mermaid
sequenceDiagram
    participant Cl as Claude (LLM)
    participant CS as channel-server (stdio MCP child)
    participant D as daemon (state.ts)
    participant CR as Codex runtime (per-agent)

    Note over Cl: receives <channel chat_id="M1" origin="codex-1">…
    Cl->>CS: MCP tool reply(chat_id="M1", text=…)
    CS->>D: socket.receiveClaudeChannelReply{agentName, chatId:"M1", text}
    D->>D: runSendMessageTransaction{type:reply, parentMessageId:"M1"}
    D->>D: events.append claude_channel_reply_received
    D->>D: dispatchToPairPeers(message, deliveries)
    loop each codex delivery
      D->>CR: resolveCodexReplyTarget(thread/loaded/list, activeThreadId)
      alt no_loaded_thread
        D->>D: events: codex_delivery_target_unavailable + queued_no_loaded_thread
        Note over D: delivery stays queued (MVP — no retry)
      else
        D->>D: event codex_delivery_target_selected; status=delivering
        D->>CR: injectReplyIntoCodexRuntime(threadId, <aiox-channel> envelope)
        alt ok
          D->>CR: rebindActiveThread
          D->>D: optional agents.rebindAdapterSessionId + agent_thread_id_rebound
          D->>D: status delivered → completed
        else
          D->>D: event codex_delivery_target_injection_failed; status=failed
        end
      end
    end
    D-->>CS: {ok:true}
    CS-->>Cl: tool result {ok:true}
```

---

## 7. Codex Adapter

This is the largest surface in the project.

### 7.1 Per-agent Runtime

Held in `CodexAgentRuntime` (`src/adapters/codex/runtime.ts:109-302`). Per
Codex agent: 1 daemon-owned app-server child + 1 daemon-owned per-agent
transparent proxy (in-process `WebSocketServer`) + 1 CLI-owned TUI child +
1 app-server-owned MCP child.

Daemon JSON-RPC writes go **directly** to the app-server (bypassing the
proxy) via the runtime's persistent WS client; the proxy URL is what the
TUI consumes (`runtime.ts:142-148, 259`).

Rationale: docs/decisions/codex-per-agent-app-server.md (per-agent app-server pivot, production direction).

### 7.2 Attach Flow (`aiox codex --name <n>`)

1. CLI parser registers `--name`, `--pair`, and codex-only `--resume`
   (`src/cli/parse.ts:218-249`).
2. `agent-attach` auto-starts daemon, calls `attachAgent` RPC
   (`src/cli/invocation.ts:108-121`).
3. Daemon `attachAgent` (`state.ts:532-745`) wraps DB attach + pair attach
   + route creation in a single `withTransaction`. For Codex, it pre-issues
   `codexChannelToken = randomUUID()` and stores it in `codexPendingTokens`
   (`state.ts:625-630`). Token is used by the MCP child handshake.
4. Daemon calls `attachCodexRuntime` (`state.ts:631-638`) →
   `attachCodexAgentRuntime` (`runtime.ts:304-366`):
   a. `launchCodexAppServer` spawns `codex app-server --listen
      ws://127.0.0.1:0` plus injected `-c mcp_servers.aiox = {...}` args
      (`launcher.ts:40-74, 88-104`).
   b. `parseCodexAppServerBanner` extracts URLs from stderr+stdout for
      `listening on:`, `readyz:`, `healthz:`. Endpoint must be `ws:` on
      loopback; readyz/healthz must be `http:`. Banner timeout 5 s
      (`app-server.ts:90-120`; stderr-first endpoint collection — docs/decisions/codex-per-agent-app-server.md §2).
   c. `waitForCodexReadyz` polls every 200 ms up to 10 s, racing child-exit
      Promise (`app-server.ts:122-175`).
   d. `connectCodexAppServerWebSocket` opens persistent WS, 5 s connect
      timeout. Failure → typed `codex_app_server_ws_connect_failed`
      (`websocket.ts:288-347`). **Current gap (P2-12):** WS transport is
      experimental/unsupported by upstream Codex. This is a current factual
      limitation of the adapter.
   e. `client.initialize()` sends JSON-RPC `initialize` with
      `{clientInfo:{name:"aiox",version:<package.version>}, capabilities:
      {experimentalApi:false}}` (`runtime.ts:402-413` reads package.json). Failure → typed
      `codex_app_server_ws_initialize_failed`.
   f. `startCodexAgentProxy` opens an in-process WS server on
      `127.0.0.1:0` whose upstream is the app-server endpoint
      (`proxy.ts:58-149`, `runtime.ts:337-343`).
5. **Fresh attach skips daemon-side `thread/start`** (Step 14 follow-up,
   provenance logs/2026-06-19-mvp-history-archive.md §3.2). `adapter_session_id` stays null until explicit
   `--resume` or first live loaded-thread delivery.
6. Daemon returns `codexRuntime: { endpoint: proxy.url, activeThreadId:
   adapterSessionId }` (`state.ts:645-657`).
7. CLI spawns TUI with `launchCodexTui({endpoint, resumeSessionId?})`
   (`invocation.ts:122-129`, `launcher.ts:76-86`):
   - Fresh: `codex --remote <proxy-url>`
   - Resume: `codex resume <session-id> --remote <proxy-url>`
   - Stdio `"inherit"` (TUI is CLI-child — docs/decisions/codex-per-agent-app-server.md §5).
8. CLI awaits TUI exit. On exit → `api.notifyTuiExited({agentName,
   exitCode, signal})`. On spawn error → `api.rollbackAgentAttach` then
   typed exit `aiox.invocation.tui_launch_failed`
   (`invocation.ts:130-142, 230-237`).

**Attach-failure cleanup ordering**:
WS connect / initialize failure unwinds in reverse — proxy → ws →
`disposeCodexAppServerOnAttachFailure(appServer)` (single SIGTERM, no
SIGKILL escalation, `app-server.ts:177-185`).

### 7.3 Resume Flow (`--resume <session-id>`)

Steps 1–4f are identical. Then:

- Daemon calls `runtime.resumeThread(sessionId)`
  (`state.ts:660`, `runtime.ts:224-240`) → JSON-RPC `thread/resume
  {threadId}` and asserts returned id equals requested id. Mismatch or
  missing throws typed `codex_resume_failed`.
- `agents.rebindAdapterSessionId({...})` persists the new id
  (`state.ts:680-690`).
- `agent_thread_id_rebound` event appended with `operation:"thread/resume",
  source:"attach_resume"` (`state.ts:694-708`).
- CLI launches `codex resume <session-id> --remote <proxy-url>`.

Failure handling cleans up `startingCodexRuntime`, deletes pending token,
marks agent disconnected, returns the typed reason
(`state.ts:719-744, 2059-2069`).

### 7.4 Transparent Proxy

File `src/adapters/codex/proxy.ts`. WHY authority:
docs/decisions/proxy-lazy-observation-cost-model.md (lazy observation cost
model); transparent-relay spike and production reintroduction provenance in
logs/2026-06-19-mvp-history-archive.md §3.1, §1.

**Relay obligation**: every WebSocket frame, both directions, passes
through unchanged. Binary frames preserved as-is; text frames normalized
only for inspection (`proxy.ts:225-239`). Frames received before upstream
`open` are queued (`proxy.ts:72, 78-81, 91`).

**Observation rule** (binding methods: `thread/start`, `thread/resume`,
`thread/fork` — `proxy.ts:46-50`):

- Client→server: `observeClientFrame` records `{requestId → method}` in a
  per-connection `pendingBindings` Map *after* the relay branch
  (`proxy.ts:151-166`).
- Server→client: `observeUpstreamFrame` consumes the matching entry on the
  response with the same `id` (`proxy.ts:168-194`). If `error` is present,
  no event fires. Otherwise extract `result.thread.id` and emit
  `CodexProxyBindingEvent{method, threadId, requestId}`.

**Lazy parse** (commit `edaf02b`; WHY: docs/decisions/proxy-lazy-observation-cost-model.md):
- Client side: `frameMayContainBindingMethod` does `indexOf` substring
  filter on the binding method names; binary frames return `false`
  (`proxy.ts:196-206`). Only survivors get `JSON.parse`d.
- Server side: early bail `if (pendingBindings.size === 0) return`
  (`proxy.ts:173-175`).
- A frame-size cutoff was considered but is **not** implemented; lazy parse
  relies solely on the substring filter
  (docs/decisions/proxy-lazy-observation-cost-model.md, Alternatives) —
  Implementation-only refinement.

The runtime subscribes to proxy binding events via `runtime.onProxyBinding`
(`state.ts:641-643`); the daemon-side handler `handleCodexProxyBinding`
(`state.ts:1629-1673`) rebinds `agents.adapterSessionId` in
`withTransaction` and appends `agent_thread_id_rebound` with
`operation:event.method, source:"proxy_binding"`.

### 7.5 Active-Thread Binding Authority

Three writer sources (in order):

1. **Daemon-originated `thread/resume`** during `--resume` attach
   (state.ts:680-708).
2. **Proxy-observed same-connection response** for
   `thread/start|resume|fork` (state.ts:1655-1670). Covers TUI-originated
   `/clear`, `/new`, `/fork`, and `/resume` when their JSON-RPC responses
   transit the proxy. Empty-thread `/fork` returns a JSON-RPC error so no
   rebind fires.
3. **Live `thread/loaded/list` fallback** at delivery time (see §8.5).

The earlier internal TUI `/resume` wrong-thread risk was resolved for MVP by
same-connection proxy observation and covered by implementation smoke
(provenance: logs/2026-06-19-mvp-history-archive.md §3.2, §1). This depends on Codex continuing to send
`thread/resume` responses for TUI `/resume` through the same proxied
connection.

Event types: `agent_thread_id_rebound` (3 emission sites);
`codex_binding_uncertain_observed` is declared in the union but has **no
production emitter** (`src/core/events.ts:15`; declared but never emitted —
planned at Step 10 but not landed at MVP closeout, Implementation-only).

### 7.6 Injection (`turn/start`)

File `src/adapters/codex/injector.ts`. Ack semantic (Round 2 D4.4,
docs/decisions/codex-per-agent-app-server.md §4): success = same-client JSON-RPC response received
with the runtime's `activeThreadId` still equal to the requested
`threadId`. Does **not** wait for `turn/started` or `turn/completed`.

- Pre-request guard: thread mismatch → `codex_binding_uncertain`
  (`injector.ts:26-32`).
- Request body: `{threadId, input:[{type:"text", text:<envelope>}]}` —
  Codex 0.132.0 schema requires array form (upstream constraint).
- Post-ack guard: re-checks mismatch (`injector.ts:52-58`).
- Error mapping: typed codes pass through; unknown errors → generic
  `adapter_inject_failed`.

The daemon-side wrapper `injectReplyIntoCodexRuntime`
(`state.ts:1675-1697`) constructs a fresh `CodexTurnStartRuntime` view
with the freshly-resolved live thread id so the mismatch guard remains
meaningful without mutating the runtime cache pre-success.

### 7.7 Daemon → Codex Delivery (live loaded-thread + queued fallback)

Entry: `dispatchToPairPeers` (`state.ts:1246`).

1. `resolveCodexReplyTarget` (`state.ts:1571-1627`):
   - Runtime absent / not ready → `codex_channel_unavailable`.
   - `runtime.listLoadedThreadIds()` → `thread/loaded/list` JSON-RPC.
   - **Selection policy**:
     - If `runtime.activeThreadId` is set → policy
       `"proxy_active_thread"`.
     - Empty → `codex_no_loaded_thread`. (The previous `loadedThreadIds.at(-1)`
       fallback was disabled in Step 15 D1 to prevent wrong-thread injection
       in same-vendor codex pairs — docs/decisions/pair-slot-generalization.md).
2. **No loaded thread**: emit `codex_delivery_target_unavailable` +
   `codex_delivery_queued_no_loaded_thread`. Delivery **stays queued**
   and returns `deferred` with reason `target_binding_unconfirmed` (no
   FSM transition; no retry in MVP; Step 14 provenance:
   `logs/2026-06-19-mvp-history-archive.md` §2.3).
3. **Live target**: emit `codex_delivery_target_selected`, transition
   `queued → delivering`, call `injectReplyIntoCodexRuntime` with
   `formatCodexAioxChannelEnvelope(message, sourceAgent?.kind ?? "unknown")`:
   `<aiox-channel source="<sender-agent-kind>" message_id="...">CONTENT</aiox-channel>`
   (state.ts:1504).
4. On success: `runtime.rebindActiveThread(targetThreadId)`. If chosen
   thread ≠ `agent.adapter_session_id`, persist and emit
   `agent_thread_id_rebound` with `operation:"thread/loaded/list",
   source:"loaded_list"`. Transition `delivered → completed`.
5. On failure: emit `codex_delivery_target_injection_failed`; delivery
   `failed`.

### 7.8 Codex MCP Ingress (Codex → daemon)

File `src/adapters/codex/mcp-server.ts`. The Step 13 ingress provenance is
preserved in `logs/2026-06-19-mvp-history-archive.md` §2.4; current behavior is
owned here.

**Tools**:
- `aiox_send_message({content})` → daemon `receiveCodexMessage`.
- `aiox_reply({parent_message_id, content})` → daemon `receiveCodexReply`.

**Launcher injection** (`launcher.ts:88-120`):
`-c mcp_servers.aiox = { command=<process.execPath>, args=[<aioxBin>,
"mcp-codex"], env={AIOX_CODEX_AGENT_NAME, AIOX_CODEX_AGENT_TOKEN,
AIOX_SOCKET_PATH} }`. Injected into the **daemon-owned app-server**, not
into the foreground TUI. The Step 14 correction is preserved in
`logs/2026-06-19-mvp-history-archive.md` §2.3: earlier Step 13 injected into
the TUI, which in `--remote` mode is not the MCP host, so the aiox MCP never
registered.

**Token handshake**:
1. Daemon pre-issues `codexChannelToken = randomUUID()` and stores it in
   `codexPendingTokens` (state.ts:625-630).
2. Token + agent name + socket path are env-passed through to the MCP
   child.
3. MCP child does `mcp.connect()` first, then `registerCodexChannel`
   (Step 14 correction provenance: `logs/2026-06-19-mvp-history-archive.md`
   §2.3).
4. Daemon consumes the pending token, stores `tokenHash =
   sha256(token)` in `codexChannelRuntimes` (full SHA-256, not 12-char
   prefix — Step 13 ingress provenance: `logs/2026-06-19-mvp-history-archive.md`
   §2.4), appends `codex_channel_registered`.
5. Every subsequent tool call calls `authorizeCodexIngress` (state.ts:1711-1759)
   which checks token presence, agent registration, connection status, and
   token hash equality. Reasons: `codex_ingress_unauthorized` with `detail
   ∈ {missing_token, agent_not_registered, agent_disconnected,
   token_mismatch}`.

### 7.9 Lifecycle and Ownership

**Ownership model** (WHY: docs/decisions/codex-per-agent-app-server.md §5; memory
`aiox-codex-attach-ownership`): `attachAgent` is the Codex runtime
lifecycle owner. The daemon is the only owner of the app-server child; the
daemon owns same-client JSON-RPC authority; the CLI is the sole parent of
the TUI child. Claude attach is DB-only.

**Dispose ordering** (`runtime.dispose()`, `runtime.ts:193-209`):
1. `webSocket.close()`
2. Best-effort fire-and-forget `closeProxyBestEffort` (proxy close runs
   before SIGTERM yields the event loop — Implementation-only ordering
   note at `runtime.ts:204-205`).
3. `await disposeAppServer(appServer)` → SIGTERM → 3 s grace → SIGKILL
   (`app-server.ts:187-219`).

**Listen-only observers** (`runtime.ts:264-286`):
- `appServer.child.exit` → `recordRuntimeFailure({type:"app_server_process_exited"})`
- `webSocket.onClose` → `recordRuntimeFailure({type:"ws_dropped"})`
- `webSocket.onNotification` for `remoteControl/status/changed` →
  stored as `latestDiagnosticNotification` (D7 — diagnostic context only, not
  binding authority; provenance logs/2026-06-19-mvp-history-archive.md §2.2).

**Current gap (P2-3):** Runtime-failure callback flows up to
`recordCodexRuntimeFailed` (`state.ts:884-924`), appending
`agent_runtime_failed`, but is **not wired** in production.
`defaultAttachCodexRuntime` (`state.ts:2024-2042`) does not pass
`onRuntimeFailed`, meaning the app-server dying does not properly
disconnect the agent in MVP.

### 7.10 Sequence — Codex MCP → daemon → Claude

```mermaid
sequenceDiagram
  participant Codex as Codex model
  participant TUI as Codex TUI (--remote proxy)
  participant AppSrv as codex app-server (MCP host)
  participant MCP as aiox mcp-codex child
  participant D as daemon.state
  participant ClChan as Claude channel HTTP /send

  Codex->>TUI: tool call aiox_send_message / aiox_reply
  TUI->>AppSrv: MCP tools/call forward
  AppSrv->>MCP: stdio MCP tools/call
  MCP->>D: receiveCodexMessage / receiveCodexReply (unix socket)
  D->>D: authorizeCodexIngress(tokenHash, connection)
  alt unauthorized
    D-->>MCP: {ok:false, reason:"codex_ingress_unauthorized", detail}
  else
    D->>D: runSendMessageTransaction (queued deliveries)
    D->>D: event codex_ingress_message_received / codex_ingress_reply_received
    D->>D: dispatchToPairPeers
    loop each Claude target
      D->>ClChan: POST /send {content, chat_id=msgId, origin=src}
      alt 2xx
        D->>D: delivery delivered → completed
      else
        D->>D: delivery failed (claude_channel_unavailable | claude_channel_push_failed)
      end
    end
    D-->>MCP: {ok:true, message_id}
  end
  MCP-->>AppSrv: tool result
  AppSrv-->>TUI: tool result
```

---

## 8. Cross-Cutting Message Routing

### 8.1 Domain Model

- **Message**: `src/core/messages.ts:17-23`; type ∈
  `question|instruction|status|event|reply`.
- **Delivery**: `src/core/deliveries.ts:13-19`. Idempotency key formatted
  `${messageId}:${targetAgentId}` (line 34). Status ∈
  `queued|delivering|delivered|completed|failed` (lines 3-9).
- **Pair**: `src/core/pairs.ts`. Reaches `ready` when both slots (`a` and
  `b`) are filled (`attachments.length === 2 && slots.has("a") && slots.has("b")`
  — `pairs.ts:107-117`). Slot assignment is auto-selected at attach time; no
  vendor is hardwired to a specific slot.
- **Route**: directed `(source, target)`. Fan-out filters
  `sourceAgentId === source.id`.

### 8.2 sendMessage Atomicity + Idempotency

`runSendMessageTransaction` (`state.ts:1761-1864`) is wrapped in a single
`withTransaction`. Sequence:

1. `agents.findByName(sourceName)` → `source_agent_not_found`.
2. `routes.list().filter(sourceId)` → empty → `no_active_routes` (β-1
   atomic reject). **No** message/delivery/event
   rows are written on this path.
3. Idempotency preflight: `deliveries.findByIdempotencyKey` per route. Hit
   → throw `sendMessageRollbackSentinel` carrying
   `{reason:"delivery_idempotency_key_exists", existing}` (preflight runs
   inside the tx; rollback via the sentinel pattern —
   docs/decisions/pair-attach-atomicity-and-sentinel.md).
4. `createMessageOrRollback` and `deliveries.createQueuedForRoutes` —
   `SQLITE_CONSTRAINT_UNIQUE` is caught and reclassified through the same
   sentinel (dual gate).
5. Append `message_created` event + one `delivery_queued` per delivery.
6. Outer catch unwraps the sentinel via `isSendMessageRollback`; anything
   else rethrows.

The CLI `send` surface (OA1) is **deferred Post-MVP** (provenance: logs/2026-06-19-mvp-history-archive.md §4.1).
Confirmed by absence of any `send` subcommand in `src/cli/parse.ts`.
Messages enter only via the four daemon-internal RPCs
(`receiveClaudeChannelMessage`, `receiveClaudeChannelReply`,
`receiveCodexMessage`, `receiveCodexReply`).

### 8.3 Router and Fan-out

`createAdapterRouter` (`src/adapters/router.ts:39-124`):
1. Call `api.sendMessage(outgoing)`. Propagate `{ok:false}` as-is.
2. Snapshot `api.status()` to look up target agents by id.
3. **Sequential** `for (const delivery of fanout.deliveries)`. Sequential
   chosen for MVP because inject waits only for `turn/start` acceptance
   (WHY: docs/decisions/codex-per-agent-app-server.md §4 — inject waits only for
   `turn/start` acceptance). Per-target ack-timeout absolute value is deferred
   (Post-MVP).
4. Per-target partial-failure isolation:
   - `target_agent_not_found` → delivery `failed`, continue.
   - Missing target adapter (`target_adapter_not_registered`) → returned as `deferred` and delivery remains `queued`, continue (`src/adapters/router.ts:87-97`, verified by `tests/unit/adapters/fake-integration.test.ts:437`).
   - Successful inject → `delivering` → `delivered` → `completed`.
   - Failed inject → `failed` carrying the typed reason.

Note: routing inside `dispatchToPairPeers` does **not** go through this
router — it directly calls the per-adapter inject path and manages delivery
transitions inline. Production dispatch remains `dispatchToPairPeers`, with target-kind branching; adapter registry/router refactor is Deferred (D6 registry — docs/decisions/pair-slot-generalization.md). The router lives parallel for now and is exercised mainly by adapter integration tests (`tests/unit/adapters/fake-integration.test.ts`).

### 8.4 Delivery State Machine

```mermaid
stateDiagram-v2
    [*] --> queued: runSendMessageTransaction
    queued --> delivering: router pre-inject /\n dispatchToPairPeers (generic)
    queued --> queued: target_binding_unconfirmed / target_runtime_unavailable /\n target_adapter_not_registered (stays queued)
    queued --> failed: target_agent_not_found
    delivering --> delivered: adapter inject ok
    delivered --> completed: immediate
    delivering --> failed: adapter inject !ok (typed reason)
    delivering --> queued: daemon restart recoverAfterRestart / deferred revert
    failed --> [*]
    completed --> [*]
```

Each transition appends `delivery_status_changed` via helper `updateDeliveryStatusInTransaction` (`src/daemon/state.ts:1192-1244`).
Transitions are driven by:
- Daemon RPC `updateDeliveryStatus` (`src/daemon/state.ts:828-830`)
- Daemon internal `dispatchToPairPeers` (`state.ts:1246-1324`)
- Per-adapter internal `injectMessageIntoClaudeTarget` (`state.ts:1354`) or `injectMessageIntoCodexTarget` (`state.ts:1496`)

### 8.5 `parent_message_id`

**Implemented.** Persisted column (`src/store/repositories/messages.ts` (L27, L58, L66, L98)),
created by `messages.create({...,parentMessageId})` (repo:46), surfaced on
`MessageDto.parentMessageId` (`api.ts:115`).

Wired on both sides:
- Claude reply path: MCP `reply.chat_id` → daemon `chatId` → message
  `parentMessageId` via `receiveClaudeChannelReply` (`src/daemon/state.ts:1010-1016`).
- Codex reply path: MCP `aiox_reply.parent_message_id` → daemon
  `parentMessageId` → message `parentMessageId` via `receiveCodexReply`
  (`src/daemon/state.ts:1132-1138`, MCP handler parameter mapping in
  `src/adapters/codex/mcp-server.ts:223` and `L243`).

Cross-agent reply correlation (`parent_message_id`) semantics were finalized at
Step 13; the provenance is preserved in
`logs/2026-06-19-mvp-history-archive.md` §2.4.
The router/FSM do not consume `parentMessageId` —
it is purely correlative data on the persisted message and the
`<aiox-channel message_id="...">` envelope.

### 8.6 Pair Reservation + Routes

Pair attach is X-strict (WHY: docs/decisions/pair-attach-atomicity-and-sentinel.md): `agents.attach` accepts no
`pairId`; pair association happens separately via `pairs.attachAgent`
which enforces three checks in its own `db.transaction`: agent exists,
kind matches, slot not occupied by another agent. Failures
`pair_slot_occupied` / `pair_full` / `agent_kind_mismatch` are thrown out
of the outer `withTransaction` via `attachRollbackSentinel`.
(`pair_kind_slot_occupied` was superseded in Step 15 D3; `pair_slot_occupied`
and `pair_full` are now the canonical reason codes — `src/core/pairs.ts:39,44`.)

When the pair becomes `ready`, `createBidirectionalPairRoutes`
(`state.ts:2099-2135`) creates bidirectional routes between `slotA` and `slotB`, supporting both same-vendor and mixed-vendor configurations dynamically. Each is skipped if already present (bidirectional, silent idempotent, no audit event).

Directed routes via `aiox connect <source> <target>...` go through
`state.connect` (`state.ts:723-763`). Duplicates land in `alreadyExisted`.

---

## 9. CLI / Invocation / Doctor / Status

### 9.1 Command Table

| Command | Auto-starts daemon? | Cite |
|---|---|---|
| `aiox daemon start` | n/a (this IS the start) | parse `cli/parse.ts:185-190`; invoke `cli/invocation.ts:136-141`; fork `bin/aiox.ts:95-102` (fork cmd at `182-194`) |
| `aiox daemon stop [--daemon-only]` | no | `cli/parse.ts:192-198`; `bin/aiox.ts:104-120` |
| `aiox daemon restart` | yes (after stop) | `cli/parse.ts:200-205`; `bin/aiox.ts:122-126` |
| `aiox daemon status` | no | `cli/parse.ts:207-212`; `bin/aiox.ts:128-147` |
| `aiox codex --name <n> [--pair <p>] [--resume <id>]` | **yes** | `cli/parse.ts:214, 257-289`; `cli/invocation.ts:157-199` |
| `aiox claude --name <n> [--pair <p>]` | **yes** | `cli/parse.ts:215, 257-289`; `cli/invocation.ts:157-164, 200-259` |
| `aiox connect <source> <target...>` | no | `cli/parse.ts:216, 291-313`; `cli/invocation.ts:262-270` |
| `aiox disconnect <source> <target...>` | no | `cli/parse.ts:217, 291-313`; `cli/invocation.ts:271-279` |
| `aiox pair --name <pair-name>` | no | `cli/parse.ts:218, 315-323`; `cli/invocation.ts:280-285` |
| `aiox status` | no | `cli/parse.ts:327-331`; `cli/invocation.ts:286-289` |
| `aiox stop` | no | `cli/parse.ts:333-338`; `cli/invocation.ts:290-292` |
| `aiox doctor` | no | `cli/parse.ts:340-345`; `cli/doctor.ts:17-43` |
| `aiox claude-plugin setup [--scope <scope>]` | no | parse `cli/parse.ts:219, 225-243`; invoke `cli/invocation.ts:300-301, 317-352` |
| `aiox mcp-codex` *(hidden)* | no | `cli/parse.ts:347-352`; `cli/invocation.ts:295-299` |
| `aiox _run-daemon --socket <path>` *(hidden)* | n/a | `cli/parse.ts:354-360`; `cli/invocation.ts:302-306` |

Auto-start is wired only on `agent-attach` (`cli/invocation.ts:166`). The
legacy PRD auto-start requirement is absorbed here as current architecture
behavior; Step 14 provenance is preserved in
`logs/2026-06-19-mvp-history-archive.md` §2.3.

### 9.2 Invocation Layer

`invokeParsedCommand` (`src/cli/invocation.ts:131-310`) is a switch on
`ParsedCommand.kind`. Cross-cutting helpers:

- `ensureOk(response)` (cli/invocation.ts:616-625) checks `{ok:false,
  reason}` and throws `InvocationError` with `code:
  "aiox.invocation."+reason, exitCode: 1`.
- Parse errors use `CliParseError` (cli/parse.ts:71-81) with codes
  `aiox.<commander-code>`, `aiox.missingCommand`, `aiox.invalidName`,
  `aiox.missingTargets`. Commander's exit code is propagated as-is
  (provenance: logs/2026-06-19-mvp-history-archive.md §4.1).

`agent-attach` exit code is the TUI child's exit code:
`tuiExit.exitCode ?? (tuiExit.signal ? 1 : 0)` (cli/invocation.ts:198,
258). Codex attach on TUI spawn error calls `rollbackAgentAttach` first
(cli/invocation.ts:189-192, 538-565).

### 9.3 Doctor + Status

**`aiox doctor`** runs five checks in order (`src/cli/doctor.ts:17-43`):
node, codex (`which codex`), claude (`which claude`), sqlite-native
(`require("better-sqlite3")`), daemon socket (`existsSync(socketPath)`).
Exit code 1 if any check is `error`, else 0 (cli/invocation.ts:609-614).

**`aiox status`** renders DAEMON → AGENTS → PAIRS → ROUTES → DELIVERIES
in fixed order (`src/cli/format.ts:30-75`; doctor/status output decisions in logs/2026-06-19-mvp-history-archive.md §4.2). DELIVERIES line
always prints all five statuses (`messages=N queued=N delivering=N
delivered=N completed=N failed=N`).

`StatusResponse.status()` (state.ts:1162-1174) aggregates via repository
`COUNT(*)`. Tmux check and pnpm check were intentionally removed at closeout
(logs/2026-06-19-mvp-history-archive.md §4.2).

---

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

Union at `src/adapters/contract.ts:19-30`. Returned as `{kind:"failed", reason,
message, jsonRpcCode?}` (`contract.ts:37-51`).

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

Declaration: `src/core/events.ts:1-27` (25 entries). All emissions go
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
| basic `claude → codex → claude` | message and reply visible both sides | ✅ | Automated (`tests/unit/adapters/fake-integration.test.ts`, `tests/unit/daemon/codex-ingress.test.ts`) |
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

---

## 13. Known Gaps / Post-MVP

The system architecture distinguishes between current, as-built gaps in the local agent runtime implementation and proposed future targets/deferred items:

### Current Gaps (As-built limitations)
- **Daemon Database Durability & Recovery** — The daemon process runs on an in-memory SQLite database (`new Database(":memory:")` inside `src/daemon/run.ts:25`). The durability helper `openSqliteDatabase` (`src/store/sqlite.ts:5`) and recovery logic `recoverAfterRestart` (`src/store/repositories/deliveries.ts:148`) are implemented but have zero active callers.
- **Runtime Failure Wiring** — The daemon state initialization does not register a failure listener on the Codex runtime. `defaultAttachCodexRuntime` (`src/daemon/state.ts:2024`) omits passing the `onRuntimeFailed` callback to `attachCodexAgentRuntime`, leaving runtime process failures unwired in production (P2-3).
- **Stale Agent Transition Policy** — The `stale` state is defined in `AgentInstanceStatus` (`src/core/agents.ts:9`), but the daemon has no active logic to transition agents to this status.
- **Unauthenticated Channel Ingress** — The Claude channel-server HTTP `/send` endpoint operates without authentication checks (P1-1).
- **Experimental Websocket Transport** — Codex active-thread synchronization uses an experimental Websocket transport unsupported upstream (P2-12).
- **Codex queued delivery retry/drain** — when `codex_no_loaded_thread` keeps a delivery queued, no later rebind/poll re-tries it (Step 14 provenance: `logs/2026-06-19-mvp-history-archive.md` §2.3).
- **Codex MCP queued-message pull/read/ack** — no surface to inspect or acknowledge stale queued deliveries from the Codex side.
- **`claude_channel_disconnected` event** — Claude side has no equivalent to Codex's `codex_channel_disconnected`.

### Target / Proposed / Deferred (Post-MVP Checklist)
- **Durable Persistence & Durable Queue** — Transitioning from in-memory SQLite to actual durable files on disk with restart recovery.
- **Adapter Registry** — Abstracting daemon dispatch logic via `AdapterRouter` (currently only tested in `fake-integration.test.ts` but deferred in production).
- **Reliability Features** — Canonical envelope wrapping, ack/retry policies, remote federation, and session expiry limits.
- **TUI Protocol Drift** — Future updates to Codex protocol schemas crossing transparent proxy layers will require active maintenance of binding parsers.
- **Declared-only Events** — Activating `agent_registered`, `agent_reconnected`, `agent_disconnected`, `pair_created`, `pair_ready`, `route_connected`, `route_disconnected`, `codex_binding_uncertain_observed`, and `late_reply` events.

---

## 14. Authority Links

- **As-built architecture**: `docs/architecture/local-agent-runtime.md` (this document)
- **Product and roadmap authority**: `docs/product/product.md`,
  `docs/product/roadmap.md`
- **Specs authority**: `docs/specs/` where external contracts are migrated.
- **Legacy MVP PRD**: absorbed into `docs/product/product.md`,
  `docs/specs/aiox-a2a.md` and this document during workspace reset; it is not
  primary authority for this document.
- **Legacy execution checklist**:
  `logs/2026-06-20-mvp-plan-carryover-archive.md` preserves the useful digest
  from the old MVP checklist; legacy `plan/` paths are not primary authority for
  this document.
- **Migrated step rationale**: decision-worthy rationale lives in
  `docs/decisions/`; MVP implementation and QA trace provenance lives in
  `logs/2026-06-19-mvp-history-archive.md`. Legacy step records are
  workspace-reset migration inputs, not architecture authority.
- **Pre-validation**: legacy pre-validation spike records are archived in
  `logs/2026-06-23-workspace-reset-pre-validation-spike-archive.md`; they are
  not current architecture authority.
- **Learning records**: legacy aiox learning records are absorbed into
  decision, architecture or archive owners; they are not current architecture
  authority.
- **Memory index entry points**: `aiox-mvp-spec`, `aiox-history-doc`,
  `aiox-step-progress`, `aiox-codex-attach-ownership`,
  `aiox-authority-map`.

When this document conflicts with code, code wins — update this document.
