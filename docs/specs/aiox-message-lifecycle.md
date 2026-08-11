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
| `type`                 | `question`, `instruction`, `event`, `reply` 중 하나. 저장/표시 분류다.                                                                                                                     |
| `intent`               | `delegation`, `discussion`, `clarification`, `result`, `conclusion`, `notification` 중 하나. 행동 의미다.                                                                                |
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
dedupe are not governed by this `messageId` rule. Source-operation replay is
deferred until the durable SQLite-state decision; it is not a current G1-C
contract. This `messageId` rule is
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
`notification`은 daemon/adapter가 lifecycle·presentation event를 만들 때 쓰는 reserved
intent이며 authenticated `source.kind=daemon`만 만들 수 있다. public agent `send`/`reply`
input schema는 `notification`을 허용하지 않아 daemon message 생성 전에 거부한다. adapter는
daemon authority를 위임받은 system event 변환에서만 이를 만들며 vendor text만 보고 승격하지
않는다.

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
- A reply's persisted `parentMessageId` records the already-authorized
  originating `deliveryId`; it is not the canonical reply-correlation input.
  The Claude target path adds neither `chat_id` nor `origin` metadata: its
  body is the canonical envelope JSON, whose `source.address` identifies the
  sender.

Current implementation caveats:

- Every target-facing canonical envelope renders its own public
  `deliveryId` from `message_deliveries.id`. The daemon API returns a
  per-target `DeliveryDto` for accepted sends and replies. Both Codex and
  Claude expose only `send` and `reply` as their public messaging MCP tools,
  with uniform `{ ok: true, message_id, dispatch? }` success results; both
  additionally expose the same separately named `aiox_retransmit_unconfirmed_delivery`
  manual retransmit tool, which returns `message_id` and no `dispatch`. None
  exposes per-target delivery IDs or delivery status.
- Reply ingress accepts `inReplyToDeliveryId`, checks original-target identity
  and the one-time reply right, consumes that right, and creates one
  source-only reply delivery. The persisted reply's `parentMessageId` is the
  originating delivery ID; the canonical outbound reply renders it as
  `inReplyToDeliveryId`. This authorization/routing/wire correlation is
  implemented independently of the intentionally smaller agent-facing
  observability projection.
- Daemon-originated outcome notifications (`delivery_unconfirmed`,
  `delivery_target_rejected`) are `type:"event"` notifications with
  `outcomeForDeliveryId` and `replyExpected:false`; they are not replies and
  neither consume nor create a reply right. See §4.3 for their content shape
  and dedupe contract.

Evidence: [[src/daemon/state.ts]] — `src/daemon/state.ts:2297-2328`,
`src/daemon/state.ts:2516-2599`; [[src/daemon/api.ts]] —
`src/daemon/api.ts:101-124`, `src/daemon/api.ts:218-263`; and
[[src/adapters/codex/mcp-server.ts]] — `src/adapters/codex/mcp-server.ts:300-444`.

### 4.3 Delivery, acknowledgement, retry

Delivery transport state와 correlated-reply permission은 독립이다.

**Current as-built — Tier 3, Codex means.** Codex의 retained JSON-RPC `requestId`와
같은 `turn/start` success는 `delivered`다. Write 뒤 timeout, response loss 또는
WebSocket drop은 `unconfirmed`이고 source에 하나의 `delivery_unconfirmed` outcome
notification을 만든다; 같은 `requestId`의 늦은 success만 idempotently `delivered`로
바꾼다. 명시적으로 상관된 JSON-RPC reject는 primary attempt(즉시 또는 늦은 응답 모두)에서
`failed`이며 source에 하나의 `delivery_target_rejected` outcome notification을 만든다.
같은 원 delivery가 먼저 `unconfirmed` notification을, 나중에(late reject로) 별도의
`delivery_target_rejected` notification을 받을 수 있다 — 둘은 서로 다른 kind이므로 하나가
다른 하나를 억제하지 않는다. 이 수용은 target이 업무를 읽거나 완료했다는 뜻이 아니며,
automatic reinjection도 completed producer도 없다.

**Current as-built — Tier 3, Claude means.** [Status: Current] Claude channel push의 2xx
응답은 `delivered`다. 명시적으로 식별된 connection refusal(`ECONNREFUSED`)과 미등록
runtime만 deferred로 분류돼 `queued`로 돌아가고 아래 pre-write retry에 참여한다. 그 밖의
명시적 non-2xx 응답은 `failed`이며 source에 하나의 `delivery_target_rejected` outcome
notification을 만든다. AbortError/timeout과, pre-write 실패임이 증명되지 않은 나머지 fetch
오류는 `unconfirmed`이며 source에 하나의 `delivery_unconfirmed` outcome notification을
만들고 자동 재시도가 없다. 이 2xx는 channel-server가 Claude Code transport에 notification을
쓴 수용일 뿐 target session receipt, model read, work completion의 증거가 아니다. Claude
Code가 channel을 load하지 않았거나 조직 정책이 막은 경우에는 그 뒤 event가 silent drop될 수
있다.

`delivered`의 공통 의미는 adapter/transport acceptance이며 adapter별 증거만 다르다:
Codex는 matching `turn/start` JSON-RPC success, Claude는 channel-server의 notification
transport write다. 어느 쪽도 target receipt, acknowledgement 또는 `completed`를 뜻하지 않는다.

**Current as-built — primary source outcome notifications, both adapters.** [Status: Current]
두 adapter 모두, primary delivery가 `unconfirmed`가 되거나 명시적으로 거절될 때 daemon이
원 source에게 하나의 canonical outcome notification을 만든다. Notification content는
`{type, deliveryId, outcomeForDeliveryId, message, error:{reason, message}}` 형태이며,
`type`은 `delivery_unconfirmed` 또는 `delivery_target_rejected`이고 adapter별 raw
`error.reason`/`error.message`를 보존한다. 최상위 `message`는 machine-action `recovery`
object가 아니라 agent-facing 안내 텍스트다: `delivery_unconfirmed`는 재전송 여부를
결정하기 전에 target activity와 중복 위험을 사용자에게 확인하라고 안내하고,
`delivery_target_rejected`는 재전송하지 말고 거절 해결 방법과 새 메시지 필요 여부를
사용자에게 물으라고 안내한다. Dedupe key는 `(원 delivery, outcome type)` 조합이라, 같은 원
delivery가 서로 다른 kind의 outcome을 각각 최대 한 번 받을 수 있다(예: 먼저
`delivery_unconfirmed`, 나중에 late reject로 `delivery_target_rejected`). 이 notification
생성은 원 delivery의 상태 전이와 독립이다: 상태 전이는 notification 성공 여부와 무관하게
먼저 확정되고, notification 자신의 delivery가 실패해도 그 실패는 일반 delivery/event 경로로만
관측되며 또 다른 outcome을 만들지 않는다(non-recursive). 이 결정의 rationale은
[[docs/decisions/delivery-outcome-notification-dedupe-by-type]]가 소유한다.

Evidence:

- Claude push 실패 분류(ECONNREFUSED/timeout/기타 fetch 오류)
  - [[src/adapters/claude/injector.ts]]
    - `src/adapters/claude/injector.ts:34-36`
    - `src/adapters/claude/injector.ts:50-74`
    - `src/adapters/claude/injector.ts:87-97`
- delivery 상태 매핑과 `unconfirmed` 부여 조건
  - [[src/daemon/state.ts]]
    - `dispatchToPairPeersNow` (`src/daemon/state.ts:1789-1900`)
    - `injectMessageIntoClaudeTarget` (`src/daemon/state.ts:1902-2006`)
- primary outcome notification producers(Codex/Claude reject, 양쪽 unconfirmed)와 composite
  dedupe
  - [[src/daemon/state.ts]]
    - `recordPrimaryOutcomeNotification`, `recordPrimaryTargetRejectOutcome`,
      `recordCodexTargetRejectOutcome`, `recordClaudeTargetRejectOutcome`,
      `recordPrimaryUnconfirmedOutcome`
  - [[src/store/repositories/deliveries.ts]]
    - `findOutcomeNotificationByOriginalDeliveryIdAndType`, `createOutcomeNotification`
  - [[tests/unit/daemon/codex-ingress.test.ts]]
    - `tests/unit/daemon/codex-ingress.test.ts:2687-2792`
  - [[tests/unit/daemon/api.test.ts]]
    - `describe("primary delivery source outcome notifications — cross-adapter symmetry")`

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

**Manual retransmit — common contract.** [Status: Current] Manual retransmit is
an operator-only direct attempt for an `unconfirmed` delivery through the same
separately named `aiox_retransmit_unconfirmed_delivery` MCP tool on both
adapters, requiring `confirmDuplicateRisk:true`. It remains outside the common
messaging `send`/`reply` pair. Immediate or late reject records an
attempt-local rejected event while the original remains `unconfirmed`; it does
not make the primary reject outcome or create a notification/reply right.
Thus timeout/drop is a non-terminal observation: only a delivered or rejected
resolution resolves the attempt, and no response leaves no terminal attempt
outcome. Duplicate late responses are no-ops.

**Codex means.** Requires a ready runtime and a bound thread. Immediate or
late success (via the retained JSON-RPC `requestId` correlation) makes the
original `delivered`. Timeout/drop leaves it `unconfirmed` and records the
attempt as unconfirmed; a late same-`requestId` reject or success may still
resolve the attempt afterward.

**Claude means.** Requires a ready channel runtime. The attempt reuses the
same fetch-based classification as a primary push (2xx `delivered`, explicit
non-2xx `manual_retransmit_rejected`, `AbortError`/timeout/other ambiguous
fetch failure `manual_retransmit_unconfirmed`) and resolves immediately only —
Claude has no Codex-style late-response reconciliation, so an unconfirmed
manual retransmit attempt does not later resolve on its own.

Evidence:

- Claude manual retransmit registration, schema, handler, and daemon-side
  immediate resolution
  - [[src/adapters/claude/channel-server.ts]]
    - `src/adapters/claude/channel-server.ts:351-366`
    - `src/adapters/claude/channel-server.ts:475-517`
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:1867-1956`
- cross-adapter behavior symmetry and isolation in one daemon
  - [[tests/unit/daemon/api.test.ts]]
    - `tests/unit/daemon/api.test.ts:1325-1413`

**Committed target — G1-C adapter-symmetric delivery semantics.** 두 adapter가 같은
transport나 같은 관측 수단을 가질 필요는 없지만, 외부에서 관찰되는 delivery 상태 의미는
대칭이어야 한다.

- 확정적으로 전송 전에 실패하면 queue 또는 bounded retry로 처리한다.
- target 수용 여부가 불명이면 `unconfirmed`로 두고 자동 재전송하지 않는다.
- 확정 거절은 `failed`와 명시적 결과로 드러낸다.
- 수용 응답은 `delivered`이며 `completed`가 아니다.
- `delivered`는 adapter/transport acceptance까지만 뜻한다. Codex의 JSON-RPC success와
  Claude의 channel notification transport write는 서로 다른 증거이지만, 어느 쪽도 target
  receipt, model read 또는 work completion을 보장하지 않는다.
- retry와 failure 처리 중 inbound reply, §4.2의 one-time reply right, source에게 돌아가는
  결과 경로를 유실하거나 다른 delivery에 잘못 귀속시키지 않는다.

Claude의 non-2xx/timeout/fetch-오류 상태 매핑과 수동 복구 수단
(`aiox_retransmit_unconfirmed_delivery`)은 위 Claude as-built 문단과 Manual retransmit
문단(Claude means)에 기술된 대로 구현되어 이 committed target을 만족한다. 실제 Codex·Claude
CLI/TUI를 통한 direct end-to-end evidence는 격리된 harness에서 확보됐다: 두 target이
canonical envelope을 받은 뒤 acknowledgement만 보류된 상태로 각각
`codex_turn_start_timeout`/`claude_channel_push_unconfirmed`를 만들었고, source TUI가
상관된 `delivery_unconfirmed` notification을 받아 사용자가 duplicate risk를 명시적으로
수락한 뒤 공유 recovery tool을 정확히 한 번 호출했으며, 각 원 delivery가 `delivered`로
전이하고 target TUI가 같은 envelope을 두 번째로 표시했다. 이 증거는 duplicate-risking
transport-level recovery까지만 증명하며 target receipt, read 또는 work completion은
증명하지 않는다.

Sources:

- `logs/G1/2026-08-04-G1-CD-cross-adapter-reliability-and.md` W4 — accepted direct Codex/Claude
  CLI/TUI transport-level evidence and its receipt/read/completion boundary.

**Open/deferred — source-operation invocation idempotency.** 현재 MCP tool 재호출은 새 logical
message를 만든다. 동일 source operation의 accepted result를 replay해야 하는지, 필요하다면 public
field·retention·mismatch 규칙을 어떻게 둘지는 SQLite-backed durable state와 restart behavior를
검토할 때 결정한다. 이것은 delivery-creation `idempotencyKey`나 Codex 내부 `requestId`와 같은
것이 아니다.

Evidence:

- tool invocation마다 새 public message ID 발급
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

Claude does not use the Codex `requestId` late-response correlation
mechanism. The adapter-symmetric requirement above asks for the same
observable state meaning, not the same mechanism. Claude's `delivered`/
`unconfirmed`/`failed` state-transition means and its manual retransmit
surface are both implemented and evidenced (see the Claude as-built and
Manual retransmit paragraphs above). Claude has no Codex-style late-response
reconciliation, and none is required or claimed without a separately accepted
protocol capability.

**Committed target — Phase 1 Tier 2 uplift.** An authenticated, correlated
automatic ack and completed transition/evidence may be added only with
adapter-specific duplicate suppression and durable evidence. That target is
not current Tier 3 behavior.

Source-visible daemon acceptance is not a remote answer. [Status: Current] A
successful daemon API call atomically validates/authenticates/authorizes and
stores the message plus all route-derived deliveries. The daemon API returns
the per-target deliveries. The agent-facing MCP projection is narrower than
the daemon API but uniform across `send`/`reply` on both adapters: each
returns `ok` plus `message_id` plus optional `dispatch`. Neither surface
implies target read, runtime acceptance, work completion, or a remote reply.

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
`adapter_unavailable`, `delivery_failed`를 구분한다. error는
stable code와 human-readable message를 함께 제공하며 secret/token/raw credential을
포함하지 않는다.

The daemon API current result is transport-independent at its boundary: an
accepted send returns its `messageId` and per-target deliveries, and an
accepted reply returns its new `messageId` and one reply delivery. Rejections
return typed `reason` values. The agent-facing MCP projection is intentionally
narrower than the daemon API but uniform across adapters: Codex and Claude
`send`/`reply` all return `message_id` plus optional `dispatch`. The shared
manual retransmit tool on both adapters returns `message_id` without
`dispatch`. None exposes per-target delivery ID/status observability. It does not change the canonical envelope or
authorization contract. Lifecycle is the public code/meaning owner; G1-B
canonical cutover creates the shared daemon/MCP/CLI registry source, and G1-C
adds reliability-specific entries.

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
| primary delivery outcome | `delivery_outcome_notifications`, keyed by `(original_delivery_id, outcome_type)` for `delivery_unconfirmed` and `delivery_target_rejected` |
| schema evolution | migrations 2 (`intent`/`reply_expected`), 3 (`reply_rights`), 4 (`origin_kind`/outcome notification surface), and 5 (`outcome_type` column plus composite `(original_delivery_id, outcome_type)` primary key; backfills any pre-existing single-key row as `delivery_target_rejected`) |

The following are not persisted or guaranteed: attempt/retry/`nextAttemptAt`,
ack deadline/evidence, accepted-operation replay durability, durable
replay/mailbox, heartbeat or time-based stale detection, remote cancellation,
and automatic post-write retry. The `recoverAfterRestart` helper only rewrites
`delivering` to `queued` and has no production caller; it is not replay
recovery.

Evidence: [[src/store/schema.ts]] — `src/store/schema.ts:38-99`,
`src/store/schema.ts:101-141`;
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
