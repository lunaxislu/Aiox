# aiox Local Runtime — Cross-Cutting Message Routing and Delivery (§8, §4.3)

Related: [[docs/architecture/local-agent-runtime]], [[docs/architecture/local-runtime-daemon-transport-api]], [[docs/decisions/pair-attach-atomicity-and-sentinel]], [[docs/decisions/codex-per-agent-app-server]], [[docs/decisions/pair-slot-generalization]], [[docs/architecture/local-runtime-claude-adapter]], [[docs/architecture/local-runtime-codex-adapter]]
Status: Current

This slice owns cross-cutting routing and delivery state machine behavior. The
`local-agent-runtime` index owns status vocabulary, module overview, authority
links, and the document map; daemon lifecycle/transport/API remain in the
daemon transport/API slice.

§4.3 sendMessage end-to-end sequence was originally under §4 daemon transport,
but the sequence is routing/FSM-owned, so this slice owns it.

## 8. Cross-Cutting Message Routing

### 8.1 Domain Model

- **Message**: [[src/core/messages.ts]] — `src/core/messages.ts:17-23`; type ∈
  `question|instruction|status|event|reply`.
- **Delivery**: [[src/core/deliveries.ts]] — `src/core/deliveries.ts:13-19`. Idempotency key formatted
  `${messageId}:${targetAgentId}` (`src/core/deliveries.ts:34`). Status ∈
  `queued|delivering|delivered|completed|failed` (`src/core/deliveries.ts:3-9`).
- **Pair**: [[src/core/pairs.ts]]. Reaches `ready` when both slots (`a` and
  `b`) are filled (`attachments.length === 2 && slots.has("a") && slots.has("b")`
  — `src/core/pairs.ts:107-117`). Slot assignment is auto-selected at attach time; no
  vendor is hardwired to a specific slot.
- **Route**: directed `(source, target)`. Fan-out filters
  `sourceAgentId === source.id`.

### 8.2 sendMessage Atomicity + Idempotency

`runSendMessageTransaction` ([[src/daemon/state.ts]] — `src/daemon/state.ts:1761-1864`) is wrapped in a single
`withTransaction`. Sequence:

1. `agents.findByName(sourceName)` → `source_agent_not_found`.
2. `routes.list().filter(sourceId)` → empty → `no_active_routes` (β-1
   atomic reject). **No** message/delivery/event
   rows are written on this path.
3. Idempotency preflight: `deliveries.findByIdempotencyKey` per route. Hit
   → throw `sendMessageRollbackSentinel` carrying
   `{reason:"delivery_idempotency_key_exists", existing}` (preflight runs
   inside the tx; rollback via the sentinel pattern —
   [[docs/decisions/pair-attach-atomicity-and-sentinel]]).
4. `createMessageOrRollback` and `deliveries.createQueuedForRoutes` —
   `SQLITE_CONSTRAINT_UNIQUE` is caught and reclassified through the same
   sentinel (dual gate).
5. Append `message_created` event + one `delivery_queued` per delivery.
6. Outer catch unwraps the sentinel via `isSendMessageRollback`; anything
   else rethrows.

Evidence:

- Transaction and rollback paths
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:1761-1864`
    - `src/daemon/state.ts:1951-1985`
    - `src/daemon/state.ts:1988-2012`

The CLI `send` surface (OA1) is **deferred Post-MVP** (provenance:
`logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md` §4.1). Confirmed by absence of any
`send` subcommand in [[src/cli/parse.ts]].
Messages enter only via the four daemon-internal RPCs
(`receiveClaudeChannelMessage`, `receiveClaudeChannelReply`,
`receiveCodexMessage`, `receiveCodexReply`).

Evidence:

- CLI surfaces and daemon-internal ingress
  - [[src/cli/parse.ts]]
    - `src/cli/parse.ts:214-220`
    - `src/cli/parse.ts:291-313`
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:974-1041`
    - `src/daemon/state.ts:1096-1159`

### 8.3 Router and Fan-out

`createAdapterRouter` ([[src/adapters/router.ts]] — `src/adapters/router.ts:39-124`):
1. Call `api.sendMessage(outgoing)`. Propagate `{ok:false}` as-is.
2. Snapshot `api.status()` to look up target agents by id.
3. **Sequential** `for (const delivery of fanout.deliveries)`. Sequential
   chosen for MVP because inject waits only for `turn/start` acceptance
   (WHY: [[docs/decisions/codex-per-agent-app-server]] §4 — inject waits only for
   `turn/start` acceptance). Per-target ack-timeout absolute value is deferred
   (Post-MVP).
4. Per-target partial-failure isolation:
   - `target_agent_not_found` → delivery `failed`, continue.
   - Missing target adapter (`target_adapter_not_registered`) → returned as `deferred` and delivery remains `queued`, continue (`src/adapters/router.ts:87-97`, verified by [[tests/unit/adapters/fake-integration.test.ts]] — `tests/unit/adapters/fake-integration.test.ts:437-485`).
   - Successful inject → `delivering` → `delivered` → `completed`.
   - Failed inject → `failed` carrying the typed reason.

Note: routing inside `dispatchToPairPeers` does **not** go through this
router — it directly calls the per-adapter inject path and manages delivery
transitions inline. Production dispatch remains `dispatchToPairPeers`, with target-kind branching; adapter registry/router refactor is Deferred (D6 registry — [[docs/decisions/pair-slot-generalization]]). The router lives parallel for now and is exercised mainly by adapter integration tests (`tests/unit/adapters/fake-integration.test.ts`).

Evidence:

- Router behavior and test coverage
  - [[src/adapters/router.ts]]
    - `src/adapters/router.ts:47-155`
  - [[tests/unit/adapters/fake-integration.test.ts]]
    - `tests/unit/adapters/fake-integration.test.ts:437-485`
    - `tests/unit/adapters/fake-integration.test.ts:488-540`
- Production dispatch path
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:1246-1324`
    - `src/daemon/state.ts:1346-1393`
    - `src/daemon/state.ts:1396-1568`

### 8.4 Delivery State Machine

```mermaid
stateDiagram-v2
    [*] --> queued: runSendMessageTransaction
    queued --> delivering: router pre-inject /\n dispatchToPairPeers (generic)
    queued --> queued: pre-inject deferred /\n target_binding_unconfirmed / target_runtime_unavailable /\n target_adapter_not_registered
    queued --> failed: target_agent_not_found
    delivering --> delivered: adapter inject ok
    delivered --> completed: immediate
    delivering --> failed: adapter inject !ok (typed reason)
    delivering --> queued: adapter deferred revert /\n daemon restart recoverAfterRestart
    failed --> [*]
    completed --> [*]
```

Each persisted status transition appends `delivery_status_changed` via helper
`updateDeliveryStatusInTransaction` (`src/daemon/state.ts:1192-1244`). Some
deferred paths remain `queued` without first writing `delivering`; other
deferred paths revert an already-`delivering` delivery to `queued`.
Transitions are driven by:
- Daemon RPC `updateDeliveryStatus` (`src/daemon/state.ts:828-830`)
- Daemon internal `dispatchToPairPeers` (`src/daemon/state.ts:1246-1324`)
- Per-adapter internal `injectMessageIntoClaudeTarget` (`src/daemon/state.ts:1346-1393`; detail [[docs/architecture/local-runtime-claude-adapter]] §6.4) or `injectMessageIntoCodexTarget` (`src/daemon/state.ts:1396-1568`; detail [[docs/architecture/local-runtime-codex-adapter]] §7.7)
- Restart recovery in the delivery repository (`src/store/repositories/deliveries.ts:148-158`)

Evidence:

- Deferred queued behavior
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:1292-1307`
    - `src/daemon/state.ts:1346-1393`
    - `src/daemon/state.ts:1396-1513`
  - [[tests/unit/daemon/codex-ingress.test.ts]]
    - `tests/unit/daemon/codex-ingress.test.ts:509-538`
    - `tests/unit/daemon/codex-ingress.test.ts:1229-1256`

### 8.5 `parent_message_id`

This is the pre-G1 current correlation mechanism, not the committed v1 public contract. The G1 target uses
`inReplyToDeliveryId`, source-only reply creation, and a daemon-owned consumed reply right; see
[[docs/specs/aiox-message-lifecycle]] §4.2. The current facts below remain as-built until that cutover.

**Implemented.** Persisted column ([[src/store/repositories/messages.ts]] —
`src/store/repositories/messages.ts:24-32`, `:53-73`, `:94-103`), created by
`messages.create({...,parentMessageId})` (`src/store/repositories/messages.ts:42-75`),
surfaced on `MessageDto.parentMessageId` ([[src/daemon/api.ts]] —
`src/daemon/api.ts:113-119`, `:519-526`).

Wired on both sides:
- Claude reply path: MCP `reply.chat_id` → daemon `chatId` → message
  `parentMessageId` via `receiveClaudeChannelReply` (`src/daemon/state.ts:1010-1016`).
- Codex reply path: MCP `aiox_reply.parent_message_id` → daemon
  `parentMessageId` → message `parentMessageId` via `receiveCodexReply`
  (`src/daemon/state.ts:1132-1138`, MCP handler parameter mapping in
  [[src/adapters/codex/mcp-server.ts]] — `src/adapters/codex/mcp-server.ts:226-243`).

Cross-agent reply correlation (`parent_message_id`) semantics were finalized at
Step 13; the provenance is preserved in
`logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md` §2.4.
The router/FSM do not consume `parentMessageId` —
it is purely correlative data on the persisted message and the
`<aiox-channel message_id="...">` envelope.

### 8.6 Pair Reservation + Routes

Pair attach is X-strict (WHY: [[docs/decisions/pair-attach-atomicity-and-sentinel]]): `agents.attach` accepts no
`pairId`; pair association happens separately via `pairs.attachAgent`
which enforces three checks in its own `db.transaction`: agent exists,
kind matches, slot not occupied by another agent. Failures
`pair_slot_occupied` / `pair_full` / `agent_kind_mismatch` are thrown out
of the outer `withTransaction` via `attachRollbackSentinel`.
(`pair_kind_slot_occupied` was superseded in Step 15 D3; `pair_slot_occupied`
and `pair_full` are now the canonical reason codes — `src/core/pairs.ts:39,44`.)

When the pair becomes `ready`, `createBidirectionalPairRoutes`
(`src/daemon/state.ts:2099-2135`) creates bidirectional routes between `slotA` and `slotB`, supporting both same-vendor and mixed-vendor configurations dynamically. Each is skipped if already present (bidirectional, silent idempotent, no audit event).

Directed routes via `aiox connect <source> <target>...` go through
`state.connect` (`src/daemon/state.ts:766-805`). Duplicates land in `alreadyExisted`.

Evidence:

- Pair reservation and route creation
  - [[src/store/repositories/pairs.ts]]
    - `src/store/repositories/pairs.ts:76-191`
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:563-593`
    - `src/daemon/state.ts:766-805`
    - `src/daemon/state.ts:2099-2156`

---

## 4.3 sendMessage end-to-end (sequence)

원본에서 이 sequence는 §4 Daemon Lifecycle and Socket Transport 아래 있었으나, routing/FSM이
실제 소유하는 흐름(`src/daemon/state.ts:1761-1864`)이라 이 routing slice가 가진다.

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
