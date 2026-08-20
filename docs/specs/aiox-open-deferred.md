# aiox A2A — Open / Deferred (§9)

The [[docs/specs/aiox-a2a]] index owns the status vocabulary, layer model and
glossary. This slice owns §9 open/deferred contract questions and current local
partial caveats.

## 9. Open / deferred

- group recipient visibility / shared group context.
- Reply-chain operational policy: Phase 0에서는 `replyExpected:true` chain의 길이·expiry를
  제한하지 않는다. rate limit, abuse control, operator-visible stale 기준, explicit close/cancel
  policy가 필요해지면 one-reply permission (§4)과 별개인 운영 policy로 재검토한다.
- remote/federated delivery implementation and durable replay. Phase 0 in-memory process
  lifetime 밖의 기존 delivery 재참조는 보장하지 않으며, public `deliveryId`를 보존하는
  migration/namespace policy가 필요해지면 Phase 2/3에서 함께 재검토한다.
- attachments, binary, and ordered multimodal content parts. v1 canonical envelope은 text only다.
  미래 확장은 part별 media type와 attachment reference/id·digest·size만 envelope에 두고 raw
  local path나 bytes를 넣지 않는다. transfer/storage plane, access capability, integrity,
  streaming/resume, retention/cleanup, target adapter capability를 함께 결정한다.
- Codex structured ingress and presentation. G1-A observed the official
  `thread/inject_items`, `turn/steer`, `turn/started|completed`, `outputSchema`,
  and `thread/tokenUsage/updated` surfaces, but `thread/inject_items` only proved
  model-visible history, not TUI presentation or wake-up. G1-B/G1-C now preserve
  the public `deliveryId` in the canonical envelope and use correlated
  `turn/start` success as delivery acceptance; that is neither target receipt nor
  work completion. The current Codex TUI renders the canonical envelope as raw
  JSON, not native tool/activity UI. Native activity semantics, active-turn
  policy, `turn/steer` behavior, `outputSchema` behavior, delivery observability,
  and a Tier 2 uplift remain open. The current bounded late-response observer and
  `unconfirmed` path prevent automatic reinjection after post-write ambiguity;
  they do not create a durable replay or target-receipt guarantee. See
  [[docs/specs/aiox-message-lifecycle]] §4.3 and
  [[docs/architecture/local-runtime-codex-adapter]] §7.6–§7.7.
- OS/process/filesystem/network sandbox enforcement.
- full external MCP internal tool allow/deny enforcement.
- skill knowledge recall/revocation guarantee.
- Claude TUI의 외부 structured injection은 공식 지원 표면이 생기기 전까지 channel
  compatibility path를 유지한다. 관련 upstream issue는 상태가 바뀔 수 있으므로 adapter
  착수 시 재확인한다.

Lifecycle policy open questions:

- Pair-level blocked/pending policy:
  - How agent-level availability (`user_reported_limited`, adapter-reported failure,
    unavailable) affects pair-level state.
  - Whether limited/unavailable agents should pause all pairs containing that agent with
    a state like `blocked_by_agent`.
  - 기본 delivery는 §4.4에 따라 queue하되, pair-level UX와 explicit reject policy를 어떻게
    표현할지.
  - Whether reset time should auto-resume a pair or only downgrade the agent to
    `availability_unknown` until explicit user report.
  - How blocked-pair status is surfaced to the source agent.
- Duplicate outbound and reply-chain operational UX: 같은 logical request의
  coalescing/confirmation UX, opposite-direction lane serialization, 그리고 long-running
  progress를 새로운 send 또는 explicitly opened turn으로 어떻게 surface할지.
- Fan-out partial completion:
  - v1 authority는 individual delivery다. source에게 partial completion을 어떤 summary로
    보여줄지만 open이다.
- User-interrupted pending turns:
  - When the adapter has no structured signal, whether to use user report, cancel command,
    or keep pending.
  - Interrupted delivery state: `cancelled_by_user`, `failed`, `superseded`, or remain
    transport-unconfirmed; interruption does not consume a reply right.
- Tier 3 unconfirmed operator policy beyond direct manual retransmit: current runtime requires
  `confirmDuplicateRisk:true`, ready runtime, and bound thread for a non-queued manual attempt. Local archive,
  explicit remote cancellation, stale classification, retention, and reply-right cleanup remain deferred.
- Current Tier 3 pre-write retry is bounded at 250 ms / 1 s / 4 s (maximum
  three retries), with target queue capacity 32, TTL 5 minutes, and queued
  flush when attach, resume/rebind, or proxy binding makes a target usable.
  Durable restart replay/mailbox and passive/automatic target ack remain
  deferred; so do remote cancellation and heartbeat/time-based session-expiry policy.
- **Phase 1 owner — session-expiry operation policy:** heartbeat, elapsed-time,
  and external-session-disconnect signals, and the resulting queued-delivery
  retry/hold/failed disposition, are decided and implemented in Phase 1. This
  deferred entry fixes no threshold, automatic action, or public field.
- AI agent session expiry handling (absorbed from the legacy MVP PRD Open Product Issue #5):
  - adapter 외부 세션은 Claude development channel/MCP server 연결 idle timeout, Codex
    `app-server` WebSocket idle disconnect, Codex thread unload/disappearance, 또는
    Claude/Codex 사용자 auth token/session 만료로 끊길 수 있다.
  - 결정 필요: adapter가 만료를 어떻게 감지하는가(heartbeat, WS close,
    `thread/loaded/list` polling, API error 감지 등).
  - 결정 필요: 감지 후 현재 이탈 경로처럼 agent row와 관련 route를 즉시 물리 삭제할지,
    아니면 명시적 별도 유예 상태(soft state)를 도입할지.
  - 결정 필요: in-flight delivery를 재시도할지, 즉시 failed 처리할지, 사용자 알림 후
    대기시킬지.
  - 결정 필요: reconnect 시도 정책을 automatic backoff, 사용자 수동, 새 attach 명령 중
    어디에 둘 것인가.
  - 결정 필요: source agent에게 session expiry 사실을 어떻게 surface할 것인가.
  - 이 정책은 daemon 관점의 시간 기반 session-expiry 감지·유예 처리와 별개이며,
    adapter가 외부 세션 단절을 능동 감지하는 시나리오다.
