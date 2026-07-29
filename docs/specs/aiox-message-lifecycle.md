# aiox A2A — Message Lifecycle (§4)

[[docs/specs/aiox-a2a]] 인덱스가 상태 어휘·layer model·glossary를 소유한다. 이 slice는 §4와
§4.1~§4.5(envelope·routing·delivery·error·persistence)를 함께 소유한다.

## 4. A2A protocol과 message lifecycle

A2A v1의 핵심은 prompt envelope 개선이 아니라 canonical envelope과 delivery lifecycle을
정의하는 것이다.

### 4.1 Typed request and canonical envelope v1

Agent-facing request and target-facing canonical envelope are different contracts.
The caller never supplies source, target, IDs, timestamp, or canonical media type.
All required fields have no default.

```json
// send
{
  "type": "question",
  "intent": "delegation",
  "replyExpected": true,
  "content": { "text": "Review the authentication boundary." }
}
```

```json
// reply
{
  "inReplyToDeliveryId": "delivery_example",
  "intent": "result",
  "replyExpected": false,
  "content": { "text": "The boundary is the API ingress." }
}
```

`send.type` MUST be `question` or `instruction`. `reply` does not accept a
`type`: the daemon fixes it to `reply`. Both calls accept only the agent-authored
intent subset and `content.text`; the daemon fixes canonical
`content.mediaType` to `text/plain`. A missing, unknown, or reserved `intent`
is rejected as a typed request error (§4.4).

다음 JSON object가 complete normative v1 envelope다. wire key는 camelCase를 사용하고,
DB column이나 vendor API의 snake_case는 adapter/repository boundary에서 변환한다.

```json
{
  "protocol": "aiox.message.v1",
  "messageId": "message_example",
  "deliveryId": "delivery_example",
  "source": {
    "kind": "agent",
    "address": "agent://local/release/claude-review"
  },
  "target": {
    "address": "agent://local/release/codex-review"
  },
  "type": "question",
  "intent": "delegation",
  "replyExpected": true,
  "content": {
    "mediaType": "text/plain",
    "text": "Review the authentication boundary."
  },
  "createdAt": "2026-06-11T12:00:00.000Z"
}
```

| Field                  | Requirement                                                                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocol`             | MUST equal `aiox.message.v1`. 지원하지 않는 major/version은 `unsupported_protocol_version`으로 거부한다.                                                                                      |
| `messageId`            | source scope에서 logical message를 식별하는 non-empty opaque id. fan-out delivery들이 공유한다. 발급 뒤 immutable이다.                                                                             |
| `deliveryId`           | target별 non-empty opaque id. 재전송에서도 바꾸지 않는 public target correlation/retransmit identity다.                                                                                       |
| `source.kind`          | `agent`, `human`, `daemon` 중 하나. current runtime은 agent-authored send/reply와 daemon-originated outcome notification을 지원하며, human ingress는 제공하지 않는다.                              |
| `source.address`       | canonical logical source address. runtime session id를 넣지 않는다.                                                                                                                    |
| `target.address`       | 이 delivery의 단일 target. fan-out envelope 하나에 여러 target을 넣지 않는다.                                                                                                                   |
| `type`                 | `question`, `instruction`, `status`, `event`, `reply` 중 하나. 저장/표시 분류다.                                                                                                           |
| `intent`               | `delegation`, `discussion`, `clarification`, `result`, `conclusion`, `status`, `notification` 중 하나. 행동 의미다.                                                                      |
| `replyExpected`        | boolean. 이 delivery의 원 target에게 한 번의 correlated reply를 허용하는 flag다.                                                                                                               |
| `inReplyToDeliveryId`  | 기존 delivery에 대한 응답이면 REQUIRED, 새 thread면 MUST be absent.                                                                                                                         |
| `outcomeForDeliveryId` | `source.kind=daemon`이 만든 outcome notification에만 존재하는 optional field로, notification이 보고하는 기존 delivery의 id를 담는다. reply가 아니므로 `inReplyToDeliveryId`와 상호배타이며 다른 경우에는 MUST be absent. |
| `content`              | v1은 `text/plain` UTF-8 text만 표준화한다. 빈 text는 `invalid_envelope`이다.                                                                                                                |
| `createdAt`            | UTC RFC 3339 timestamp. ordering authority가 아니며 관측/감사용이다.                                                                                                                        |

Public identifier issuance [Status: Current]: one common public-ID factory
issues collision-resistant opaque values. Codex and Claude source
adapters directly call the common public-IDs module for each agent-authored
send/reply `messageId`; the daemon calls it for each daemon-originated
`messageId` and every `deliveryId`. No issuer may reuse a value for distinct
public messages or deliveries. Each source handler calls the module exactly
once per invocation and passes the resulting `messageId` unchanged to one
daemon call. A user MCP tool re-invocation is a new invocation and gets a new
logical message ID. Handler-to-daemon automatic retry and tool re-invocation
dedupe are not governed by this `messageId` rule; invocation-level idempotency
is a separate contract owned by the G1-C common workstream in §4.3. This
`messageId` rule is
not the daemon delivery `idempotencyKey`; the daemon continues to
derive and persist each delivery `idempotencyKey` as
`${messageId}:${targetAgentId}`.

The issued values are immutable. Retransmission MUST retain the existing
`messageId` and `deliveryId`. Consumers and intermediaries MUST only store,
forward, and compare them for equality; they MUST NOT parse or infer prefix,
UUID/encoding, random source, sort order, issuer, agent name, profile, thread,
or domain meaning. `message_`/`delivery_` prefixes and UUID-like values are
non-normative examples only. No legacy alias, fallback, or dual-write behavior
is present. The opaque issuance rationale remains in
[[docs/decisions/public-message-and-delivery-ids-use-opaque-issuance]]; the
approved issuer responsibility is in
[[docs/decisions/public-id-factory-issuer-responsibility]].

Public identifier lifetime [Status: Current]: Phase 0 in-memory reference
runtime은 `messageId`와 `deliveryId`를 발급한 daemon process lifetime 안에서만
correlation에 사용한다. Daemon restart 뒤 두 public ID의 replay, lookup 또는 기존 ID의
재참조를 약속하지 않는다. Collision-resistant issuance은 새 process가 같은 문자열을
우연히 발급할 위험을 낮추지만, durable history를 제공하지 않는다.

`deliveryId` storage binding [Status: Current]: v1 local reference
runtime에서 protocol `deliveryId`는 `message_deliveries.id`와 같은 immutable value다.
별도 public `delivery_id` column을 만들지 않는다. Phase 2 durable replay 또는 federation이
더 넓은 namespace를 요구하면, 기존 public value를 보존하는 migration을 전제로 이 scope를
재검토한다. 선택의 rationale은
[[docs/decisions/public-delivery-id-is-delivery-primary-key]]가 소유한다.

Public-ID issuance state [Status: Current]: the source adapter directly calls
the common factory for each agent-authored send/reply `messageId`; the daemon
uses the same factory for daemon-originated outcome `messageId` values and all
`deliveryId` values. `deliveryId` remains the immutable delivery-row primary
key. The shared internal `createId` continues to issue internal entity and
event IDs; it is not a public-ID issuer. Current values remain opaque to
consumers: prefix, UUID/encoding, issuer, and ordering parsing are invalid.
The historical daemon-only issuance direction in
`logs/G1/2026-07-10-G1-A-contractingress-freeze.md` is superseded provenance, not
a living contract or a freeze edit target.

v1 receiver는 모르는 optional field를 무시해야 하고, intermediary는 가능한 한 그대로
보존해야 한다. 기존 field의 의미 변경이나 required field 추가는 새 protocol version이
필요하다. vendor-specific 값은 canonical top-level key를 만들지 말고 namespaced extension을
사용한다.

Intent authoring surface는 전체 wire enum보다 좁다. agent가 `send`/`reply`로 직접 만드는
메시지는 `delegation | discussion | clarification | result | conclusion`만 사용한다.
`status`와 `notification`은 daemon/adapter가 lifecycle·presentation event를 만들 때 쓰는
reserved intent이며 authenticated `source.kind=daemon`만 만들 수 있다. agent/human source가
reserved intent를 제출하면 `reserved_intent_not_allowed`로 거부한다. adapter는 daemon
authority를 위임받은 system event 변환에서만 이를 만들며 vendor text만 보고 승격하지 않는다.

Canonical address는 logical agent를 나타낸다. v1 local reference runtime은
`agent://local/<profile>/<agent-name>`을 사용하고, daemon은 canonical address, DB agent id,
adapter kind, 현재 runtime/session id의 mapping을 명시적으로 유지한다. session 재시작은 같은
logical address에 rebind할 수 있지만, 이름 변경은 v1에서 새 identity 생성으로 취급한다.

### 4.2 Routing and reply correlation

- daemon은 source identity를 인증한 뒤 active directed route를 검사한다. route가 없으면
  `route_not_allowed`로 거부하며 adapter text가 이를 우회할 수 없다.
- fan-out은 logical message 하나와 target별 envelope/delivery N개를 만든다. 각 delivery는
  같은 `messageId`, 서로 다른 `deliveryId`와 `target.address`를 가진다.
- reply는 `inReplyToDeliveryId`로 원 delivery를 해석하고, **원 source만** 단일 target으로
  삼는 새 logical message를 만든다. replying agent의 현재 outbound route fan-out이나 reverse
  directed route를 사용하지 않는다. 원 delivery가 부여한 narrow reply right가 이 단일 reply의
  authorization이다. 그 rationale은
  [[docs/decisions/original-delivery-narrow-reply-right]]가 소유한다.
- daemon은 원 delivery 존재, authenticated caller가 원 target임, `replyExpected:true`, 그리고
  아직 reply right가 소비되지 않았음을 확인한다. false delivery는 `reply_not_expected`, 원
  target이 아닌 caller는 `correlation_mismatch`, 이미 소비된 right의 두 번째 reply는
  `duplicate_reply`, 없는 delivery는 `unknown_delivery`로 거부한다.
- `replyExpected:true`인 reply delivery는 다음 recipient에게 새 한 번의 right를 부여한다.
  따라서 chain은 각 새 delivery의 flag로 이어지며, `false`가 해당 chain branch를 닫는다.
- `parentMessageId`, Claude `chat_id`, and `origin` are storage or transport
  metadata, not the canonical reply-correlation input. A reply's persisted
  `parentMessageId` records the already-authorized originating `deliveryId`.

Current implementation caveats:

- Every target-facing canonical envelope renders its own public
  `deliveryId` from `message_deliveries.id`. The daemon API returns a
  per-target `DeliveryDto` for accepted sends and replies. Agent-facing MCP
  results are tool-specific projections: Codex `aiox_send_message` and
  `aiox_reply`, and Claude `send`, return `message_id` plus optional `dispatch`;
  Claude `reply` returns optional `dispatch` only; Codex manual retransmit
  returns `message_id` and no `dispatch`. None exposes per-target delivery IDs
  or delivery status.
- Reply ingress accepts `inReplyToDeliveryId`, checks original-target identity
  and the one-time reply right, consumes that right, and creates one
  source-only reply delivery. The persisted reply's `parentMessageId` is the
  originating delivery ID; the canonical outbound reply renders it as
  `inReplyToDeliveryId`. This authorization/routing/wire correlation is
  implemented independently of the intentionally smaller agent-facing
  observability projection.
- Daemon-originated rejection outcomes are `type:"event"` notifications with
  `outcomeForDeliveryId`; they are not replies and neither consume nor create a
  reply right.

Evidence: [[src/daemon/state.ts]] — `src/daemon/state.ts:2297-2328`,
`src/daemon/state.ts:2516-2599`; [[src/daemon/api.ts]] —
`src/daemon/api.ts:101-124`, `src/daemon/api.ts:218-263`; and
[[src/adapters/codex/mcp-server.ts]] — `src/adapters/codex/mcp-server.ts:300-444`.

### 4.3 Delivery, acknowledgement, retry

Delivery transport state와 correlated-reply permission은 독립이다.

**Current as-built — Tier 3, Codex means.** Codex의 retained JSON-RPC `requestId`와
같은 `turn/start` success는 `delivered`다. Write 뒤 timeout, response loss 또는
WebSocket drop은 `unconfirmed`; 같은 `requestId`의 늦은 success만 idempotently
`delivered`로 바꾼다. 명시적으로 상관된 JSON-RPC reject는 primary attempt에서
`failed`이며 source에 한 번의 outcome notification을 만든다. 이 수용은 target이
업무를 읽거나 완료했다는 뜻이 아니며, automatic reinjection도 completed producer도 없다.

**Current as-built — Tier 3, Claude means.** [Status: Current] Claude channel push의 2xx
응답은 `delivered`다. 연결 실패와 미등록 runtime은 deferred로 분류돼 `queued`로 돌아가고
아래 pre-write retry에 참여한다. 그 밖의 non-2xx 응답과 push timeout은 모두 `failed`이며,
Claude 경로는 `unconfirmed`를 만들지 않는다. 따라서 수용 여부가 불명한 timeout이 확정
거절과 같은 상태로 접힌다. 이는 아래 adapter-symmetric 요구를 아직 만족하지 않는 current
gap이다.

Evidence:

- Claude push timeout과 결과 분류
  - [[src/adapters/claude/injector.ts]]
    - `src/adapters/claude/injector.ts:34-36`
    - `src/adapters/claude/injector.ts:50-74`
- delivery 상태 매핑과 `unconfirmed` 부여 조건
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:1711-1772`
    - `src/daemon/state.ts:1782-1852`

```text
queued -> delivering -> delivered
delivering -> unconfirmed -> delivered
delivering | unconfirmed -> failed     (primary correlated reject)
queued | delivering -> failed          (expiry or terminal pre-write failure)
```

`completed`는 현재 status enum에는 남아 있지만 current Tier 3 transition의 producer가
없다. `replyExpected:true`는 waiting/completion state가 아니라 originating delivery의
one-time reply right만 만든다.

Current pre-write delivery work is bounded but is not durable restart policy:
fan-out admission is atomic at target queue capacity 32; queued work expires after
5 minutes; conclusively pre-write failures retry after 250 ms, 1 s, and 4 s
(maximum three retries). Post-write ambiguity never joins that automatic retry
path. `recoverAfterRestart` is an unused repository helper, not replay recovery.

Manual retransmit is an operator-only direct attempt for an `unconfirmed`
Codex delivery, requiring `confirmDuplicateRisk:true`, a ready runtime, and a
bound thread. Immediate or late success makes the original `delivered`.
Timeout/drop leaves it `unconfirmed` and records the attempt as unconfirmed.
Immediate or late reject records an attempt-local rejected event while the
original remains `unconfirmed`; it does not make the primary reject outcome or
create a notification/reply right. Thus timeout/drop is a non-terminal
observation: only immediate/late delivered or rejected resolves the attempt,
and no response leaves no terminal attempt outcome. Duplicate late responses
are no-ops.

**Committed target — G1-C adapter-symmetric delivery semantics.** 두 adapter가 같은
transport나 같은 관측 수단을 가질 필요는 없지만, 외부에서 관찰되는 delivery 상태 의미는
대칭이어야 한다.

- 확정적으로 전송 전에 실패하면 queue 또는 bounded retry로 처리한다.
- target 수용 여부가 불명이면 `unconfirmed`로 두고 자동 재전송하지 않는다.
- 확정 거절은 `failed`와 명시적 결과로 드러낸다.
- 수용 응답은 `delivered`이며 `completed`가 아니다.
- retry와 failure 처리 중 inbound reply, §4.2의 one-time reply right, source에게 돌아가는
  결과 경로를 유실하거나 다른 delivery에 잘못 귀속시키지 않는다.

Claude HTTP 4xx/5xx/timeout의 정확한 상태 매핑과 Claude 쪽 수동 복구 수단은 이 의미를
만족하는 범위 안에서 G1-C implementation decision으로 남는다. 이 문서는 특정 HTTP status의
의미를 미리 규정하지 않는다.

**Committed target — G1-C invocation idempotency.** 같은 invocation key를 가진 같은 요청의
재시도는 새 message, 새 delivery 또는 새 reply right를 만들지 않고 최초 accepted result를
반환해야 한다. 이는 Codex와 Claude 공통 요구이며, 아래 delivery-creation `idempotencyKey`나
Codex 내부 `requestId`와 같은 것이 아니다. 현재는 두 adapter의 source handler가 invocation
마다 새 `messageId`를 발급하므로 invocation key 자체가 없고, 재사용된 delivery key는 최초
결과 재생이 아니라 typed rejection으로 거절된다. request의 실제 field 이름, key retention
범위, 같은 key에 다른 요청이 온 경우의 mismatch 처리는 G1-C implementation decision이다.

Evidence:

- invocation마다 새 public message ID 발급
  - [[src/adapters/codex/mcp-server.ts]]
    - `src/adapters/codex/mcp-server.ts:247`
    - `src/adapters/codex/mcp-server.ts:291`
  - [[src/adapters/claude/channel-server.ts]]
    - `src/adapters/claude/channel-server.ts:336`
    - `src/adapters/claude/channel-server.ts:385`
- 재사용된 delivery key의 typed rejection
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:2436-2448`

Identifier boundary [Status: Current]:

| Identifier | Current role |
| --- | --- |
| `idempotencyKey` | daemon-common delivery-creation key, `${messageId}:${targetAgentId}`, enforced by DB UNIQUE before either adapter |
| `deliveryId` | target-specific public correlation ID (`message_deliveries.id`) |
| Codex `requestId` | internal JSON-RPC late/duplicate-response correlation only; never a source-facing API, MCP, or envelope value |

Claude does not use the Codex `requestId` late-response correlation mechanism.
The adapter-symmetric requirement above asks for the same observable state
meaning, not the same mechanism; the Claude means of producing it is not yet
implemented or evidenced.

**Committed target — Phase 1 Tier 2 uplift.** An authenticated, correlated
automatic ack and completed transition/evidence may be added only with
adapter-specific duplicate suppression and durable evidence. That target is
not current Tier 3 behavior.

Source-visible daemon acceptance is not a remote answer. [Status: Current] A
successful daemon API call atomically validates/authenticates/authorizes and
stores the message plus all route-derived deliveries. The daemon API returns
the per-target deliveries. MCP results remain tool-specific: Codex send/reply
and Claude send can return `message_id` plus `dispatch`, while Claude reply
returns `ok` plus `dispatch` without a `message_id`. Neither surface implies
target read, runtime acceptance, work completion, or a remote reply.

Adapter가 target runtime의 실행 lifecycle을 관측할 수 있으면 `target_started`,
`target_progress`, `target_finished`, `target_failed` 같은 progress evidence를 event로 surface할
수 있다. 이는 source에게 "전달 후 처리 중인가"를 보여주는 visibility signal이지 delivery
ack나 correlated reply가 아니다. `target_started`나 `target_progress`는 delivery를 completed로
만들지 않고, `target_finished`도 reply right를 소비하지 않는다. 다만 event가 특정
`deliveryId`와 target session에 상관되고 adapter가 그 의미를 보장할 때에는 별도의 passive ack
evidence를 함께 생성할 수 있다. adapter는 progress visibility 지원 여부를 capability/degradation
surface에 보고하고, vendor lifecycle event를 지원하지 않으면 progress를 추정해 만들지 않는다.

### 4.4 Baseline error model and defaults

v1 typed errors는 최소한 `invalid_envelope`, `unsupported_protocol_version`,
`unauthorized_source`, `route_not_allowed`, `unknown_target`, `message_id_conflict`,
`unknown_delivery`, `correlation_mismatch`, `reply_not_expected`, `duplicate_reply`, `backpressure`,
`reserved_intent_not_allowed`, `adapter_unavailable`, `delivery_failed`를 구분한다. error는
stable code와 human-readable message를 함께 제공하며 secret/token/raw credential을
포함하지 않는다.

The daemon API current result is transport-independent at its boundary: an
accepted send returns its `messageId` and per-target deliveries, and an
accepted reply returns its new `messageId` and one reply delivery. Rejections
return typed `reason` values. The agent-facing MCP projection is intentionally
narrower and tool-specific: Codex send/reply and Claude send return
`message_id` plus optional `dispatch`; Claude reply returns optional `dispatch`;
Codex manual retransmit returns `message_id` without `dispatch`. None exposes
per-target delivery ID/status observability. It does not change the canonical
envelope or authorization contract. Lifecycle is the public code/meaning owner;
G1-B canonical cutover creates the shared daemon/MCP/CLI registry source, and
G1-C adds reliability-specific entries.

- target availability를 모르면 기본은 queue다. 명시적 policy만 reject로 바꿀 수 있다.
- fan-out aggregate terminal state는 v1에 만들지 않고 target별 delivery를 authoritative하게
  유지한다.
- backpressure 한도를 넘으면 무제한 메모리 적재 대신 typed reject 또는 bounded queue를 쓴다.
- user cancellation은 ack 또는 reply-right consumption을 추론하지 않는다. delivery policy가
  cancellation을 지원하면 별도 evidence를 기록한다.
- v1은 global total ordering을 약속하지 않는다. 같은 target에 대한 live injection attempt는
  adapter/session별로 serialize해 interleaving을 막고, 관측 순서는 `createdAt`이 아니라 daemon
  sequence/event order로 표현한다.

### 4.5 Current partial persistence matrix

The current in-memory SQLite runtime persists the following current Tier 3
state; it does not thereby promise durable restart/replay behavior.

| Surface | Current persistence |
| --- | --- |
| messages | `origin_kind`, `intent`, `reply_expected`, `outcome_for_delivery_id`, plus source, parent, type, content and timestamps |
| deliveries | public `id`/`deliveryId`, message/target/route, status, and common internal `idempotency_key` |
| reply authorization | `reply_rights`, including the originating delivery and one-time consuming reply message/delivery |
| primary rejection outcome | `delivery_outcome_notifications`, keyed by original delivery |
| schema evolution | migrations 2 (`intent`/`reply_expected`), 3 (`reply_rights`), and 4 (`origin_kind`/outcome notification surface) |

The following are not persisted or guaranteed: attempt/retry/`nextAttemptAt`,
ack deadline/evidence, accepted-operation replay durability, durable
replay/mailbox, heartbeat or time-based stale detection, remote cancellation,
and automatic post-write retry. The `recoverAfterRestart` helper only rewrites
`delivering` to `queued` and has no production caller; it is not replay
recovery.

Evidence: [[src/store/schema.ts]] — `src/store/schema.ts:38-115`;
[[src/store/repositories/messages.ts]] — `src/store/repositories/messages.ts:5-145`;
[[src/store/repositories/deliveries.ts]] — `src/store/repositories/deliveries.ts:5-238`;
and [[src/store/repositories/reply-rights.ts]] —
`src/store/repositories/reply-rights.ts:3-83`.

Protocol invariants:

- `type`, `intent`, `reply_expected`는 분리한다.
  - `type`: 저장/시스템 분류.
  - `intent`: agent-authored 5종과 daemon-authored reserved 2종으로 나뉘는 협업 의미.
  - `reply_expected`: target 행동 신호. intent만으로 reply 여부를 추론하지 않는다.
- envelope은 explicit protocol version을 운반한다. 예: `protocol: "aiox.message.v1"`.
- canonical envelope은 vendor-neutral하다. concrete reply tool name은 adapter render
  단계에서 채운다.
- `source.kind`는 `agent | human | daemon`을 예약한다. human intervention 구현은 defer한다.
- envelope은 logical message와 target-specific delivery metadata를 포함한다.
- presentation/rendering은 delivery 단위로 생성한다.
- fan-out은 `1 message = N deliveries`다.
- `messageId`는 logical group/original message id다.
- `deliveryId`는 target-specific delivery/turn correlation id다.
- Codex `clientUserMessageId` 후보는 `messageId`가 아니라 `deliveryId`다.
- reply routing default는 `source-only`다.
- `recipient_visibility`는 v1 field로 넣지 않는다. shared/group recipient visibility는
  additive extension으로 defer한다.
- prompt text, TUI-injected envelope, `additionalContext["aiox.envelope"]`은
  display/correlation aid일 수 있지만 authority가 아니다.
- 진짜 authority는 daemon store + token + policy다.
- `replyExpected` is a one-reply permission, not a pending/timeout/expiry FSM.
- current Tier 3 lifecycle은 delivery acceptance까지만 보장하며, completed는 committed target이다.

Current non-native caveat:

- Codex/Claude 같은 TUI target injection은 prompt-level compatibility path다.
- adapter-backed runtime이 structured envelope ingestion이나 presentation policy를 강제하지
  못하면 typed degradation으로 surface해야 한다.
- 현재 `AdapterInjectResult.kind === "success"`는 adapter/transport acceptance일 뿐 target receipt나
  ack가 아니다. automatic ack/completed는 committed target이다.

Current implementation and deferred review limits:

- `messageId`는 현재 source scope의 opaque id로 정의돼 있고, `deliveryId`는
  `message_deliveries.id`를 public으로 사용한다. Phase 0의 process-lifetime
  generator와 delivery-creation DB UNIQUE 경계는 G1에서 구현·검증됐다. daemon 간
  federation collision 처리는 계속 Phase 2/3 deferred review 항목이다.
- Tier 3 `unconfirmed` delivery의 retention, stale 기준, cancellation and reply-right cleanup remain
  deferred. Automatic reinjection remains prohibited.
