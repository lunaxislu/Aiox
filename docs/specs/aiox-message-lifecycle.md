# aiox A2A — Message Lifecycle (§4)

[[docs/specs/aiox-a2a]] 인덱스가 상태 어휘·layer model·glossary를 소유한다. 이 slice는 §4와
§4.1~§4.5(envelope·routing·delivery·error·persistence)를 함께 소유한다.

## 4. A2A protocol과 message lifecycle

A2A v1의 핵심은 prompt envelope 개선이 아니라 canonical envelope과 delivery lifecycle을
정의하는 것이다.

### 4.1 Canonical envelope v1

다음 JSON object가 complete normative v1 envelope다. wire key는 camelCase를 사용하고,
DB column이나 vendor API의 snake_case는 adapter/repository boundary에서 변환한다.

```json
{
  "protocol": "aiox.message.v1",
  "messageId": "msg_01J...",
  "deliveryId": "dlv_01J...",
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

| Field                 | Requirement                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `protocol`            | MUST equal `aiox.message.v1`. 지원하지 않는 major/version은 `unsupported_protocol_version`으로 거부한다.            |
| `messageId`           | source scope에서 logical message를 식별하는 non-empty opaque id. fan-out delivery들이 공유한다.                     |
| `deliveryId`          | target별 non-empty opaque id. 재전송에서도 바꾸지 않으며 reply correlation과 idempotency의 기준이다.                |
| `source.kind`         | `agent`, `human`, `daemon` 중 하나. v1 reference runtime은 `agent`만 완전 지원한다.                                 |
| `source.address`      | canonical logical source address. runtime session id를 넣지 않는다.                                                 |
| `target.address`      | 이 delivery의 단일 target. fan-out envelope 하나에 여러 target을 넣지 않는다.                                       |
| `type`                | `question`, `instruction`, `status`, `event`, `reply` 중 하나. 저장/표시 분류다.                                    |
| `intent`              | `delegation`, `discussion`, `clarification`, `result`, `conclusion`, `status`, `notification` 중 하나. 행동 의미다. |
| `replyExpected`       | boolean. delivery 완료와 별개인 reply obligation 생성 여부다.                                                       |
| `inReplyToDeliveryId` | 기존 delivery에 대한 응답이면 REQUIRED, 새 thread면 MUST be absent.                                                 |
| `content`             | v1은 `text/plain` UTF-8 text만 표준화한다. 빈 text는 `invalid_envelope`이다.                                        |
| `createdAt`           | UTC RFC 3339 timestamp. ordering authority가 아니며 관측/감사용이다.                                                |

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

G1 cutover 뒤 canonical send/reply tool은 free-form `Intent:` label parsing을 authority로 쓰지
않는다. send는 최소 `intent`, `replyExpected`, `content`를, reply는
`inReplyToDeliveryId`, `intent`, `replyExpected`, `content`를 typed input으로 받는다. 현재
Claude/Codex의 text-only tool과 5종 label instruction은 pre-release compatibility surface이므로
schema validator, MCP instruction, tool description, example과 test fixture를 한 변경으로
교체한다. negative test는 agent-authored reserved intent, unknown intent, label과 typed field가
충돌하는 legacy input을 포함한다.

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
  삼는 새 logical message를 만든다. replying agent의 현재 outbound route fan-out을 사용하지
  않는다.
- unknown delivery, 원 target과 다른 replying identity, 이미 terminal reply로 닫힌
  obligation의 중복 reply는 각각 `unknown_delivery`, `correlation_mismatch`,
  `duplicate_terminal_reply`로 거부한다.
- 현재 Codex `parentMessageId`와 Claude `chat_id`는 logical message id를 가리키므로 이
  계약에 비준수다. v1 cutover에서 deliveryId로 바꾸며, migration 중에는 둘을 혼동하지
  않도록 별도 field로 읽는다.

Current implementation caveats:

- The current pre-v1 daemon/API reason for "source has no active directed
  routes" is `no_active_routes`; v1 `route_not_allowed` is the canonical
  protocol error name for the same condition and is not yet the public API
  reason. Current evidence: [[src/daemon/state.ts]] — `src/daemon/state.ts:323-338`,
  `src/daemon/state.ts:1761-1783`,
  [[tests/unit/daemon/message-fanout-store.test.ts]] — `tests/unit/daemon/message-fanout-store.test.ts:198-222`,
  [[tests/unit/daemon/codex-ingress.test.ts]] — `tests/unit/daemon/codex-ingress.test.ts:589-602`.
- The current store has a `message_deliveries.id` primary key, but public v1
  envelope `deliveryId` exposure and its external namespace are still an
  Implementation Gap/Open Issue. Current schema evidence:
  [[src/store/schema.ts]] — `src/store/schema.ts:58-67`, [[tests/unit/store/schema.test.ts]] — `tests/unit/store/schema.test.ts:174-195`.
  The target contract is a stable target-specific delivery id; whether that
  public id is identical to the stored row id or a separate external id must
  be decided before G1 schema cutover.
- Current reply ingress creates a `type: "reply"` message linked by
  `parentMessageId`/`parent_message_id` and dispatches it through the replying
  agent's active outbound routes. It does not yet authorize replies by
  `inReplyToDeliveryId` or force source-only routing to the original source.
  Current evidence: `src/daemon/state.ts:315-320`,
  `src/daemon/state.ts:1800-1821`,
  [[tests/unit/daemon/codex-ingress.test.ts]] — `tests/unit/daemon/codex-ingress.test.ts:633-710`.

### 4.3 Delivery, acknowledgement, retry

Delivery transport state와 reply obligation은 독립이다.

```text
queued -> delivering -> delivered -> completed
queued | delivering | delivered -> failed
```

- `queued`: delivery가 저장됐지만 push를 시작하지 않았다.
- `delivering`: adapter push attempt가 진행 중이다.
- `delivered`: adapter가 입력을 받아들였다. target agent가 봤거나 처리했다는 뜻은 아니다.
  ack deadline을 넘기면 상태를 거짓으로 failed/completed 처리하지 않고 `unconfirmed`
  degradation을 함께 기록한다.
- `completed`: daemon이 해당 `deliveryId`에 대한 explicit ack 또는 adapter별로 검증된
  passive ack를 받았다.
- `failed`: bounded retry가 소진됐거나 재시도 불가능한 terminal failure다. dead-letter는
  별도 상태가 아니라 failed delivery를 운영 표면에서 분류하는 정책으로 시작한다.

Ack는 `deliveryId`, acknowledging identity, evidence kind(`explicit | passive`), timestamp를
기록해야 한다. explicit ack가 기본이다. Stop hook 같은 passive signal은 해당 delivery와
target session을 상관할 수 있을 때만 ack다. 단순 HTTP/JSON-RPC 성공, process 생존,
사용자 interrupt는 ack가 아니다.

재전송은 같은 `messageId`, `deliveryId`, canonical content를 유지하고 attempt만 증가시킨다.
수신 adapter/agent는 이미 ack한 `deliveryId`를 다시 받아도 LLM action이나 reply obligation을
중복 생성하면 안 된다. `messageId`가 같지만 canonical content 또는 target set이 다르면
`message_id_conflict`로 거부한다. 한 target의 실패는 다른 fan-out delivery를 막지 않는다.

Retry eligibility는 acceptance 전후로 나눈다.

- adapter가 입력을 받지 않았다고 확정한 pre-acceptance failure는 모든 tier에서 bounded
  automatic retry 대상이다.
- adapter acceptance 뒤 ack만 유실된 delivery는 target-side duplicate suppression을 보장하는
  Tier 1/2 adapter(§5 capability tier)만 automatic re-injection할 수 있다.
- Tier 3처럼 duplicate agent action을 막을 수 없는 adapter는 acceptance 뒤 ack timeout을
  `delivered` 상태의 `unconfirmed` degradation으로 surface하고 자동 재주입하지 않는다. 사용자가
  duplicate risk를 확인한 explicit retry만 허용하며 event에 manual actor와 retransmit marker를
  남긴다.

Reference runtime release baseline은 retry-eligible attempt에 bounded retry, exponential
backoff, 최대 attempt와 `nextAttemptAt` 관측을 MUST 제공한다. 정확한 기본 횟수/간격은 G1
failure-injection 결과로 고정하되 무한 retry는 금지한다. G1 idempotency evidence는 daemon의
동일 delivery 중복 저장·dispatch 방지, Tier 1/2 adapter duplicate suppression, Tier 3의
post-acceptance no-auto-retry를 각각 검증한다. Tier 3에서 LLM action exactly-once를 주장하지
않는다.

`replyExpected: true`인 completed delivery는 별도 `awaiting_reply` obligation을 만든다.
유효한 correlated reply가 이를 fulfilled로 바꾼다. reply가 ack보다 먼저 도착하면 그 reply는
해당 delivery의 explicit ack evidence도 겸한다. delivery 완료는 reply 완료가 아니다.
reply timeout은 기본 hard failure가 아니라 pending visibility threshold이며, hard deadline과
cancellation은 explicit policy가 있을 때만 terminal state를 만든다.

Adapter가 target runtime의 실행 lifecycle을 관측할 수 있으면 `target_started`,
`target_progress`, `target_finished`, `target_failed` 같은 progress evidence를 event로 surface할
수 있다. 이는 source에게 "전달 후 처리 중인가"를 보여주는 visibility signal이지 delivery
ack나 correlated reply가 아니다. `target_started`나 `target_progress`는 delivery를 completed로
만들지 않고, `target_finished`도 reply obligation을 fulfilled로 만들지 않는다. 다만 event가 특정
`deliveryId`와 target session에 상관되고 adapter가 그 의미를 보장할 때에는 별도의 passive ack
evidence를 함께 생성할 수 있다. adapter는 progress visibility 지원 여부를 capability/degradation
surface에 보고하고, vendor lifecycle event를 지원하지 않으면 progress를 추정해 만들지 않는다.

### 4.4 Baseline error model and defaults

v1 typed errors는 최소한 `invalid_envelope`, `unsupported_protocol_version`,
`unauthorized_source`, `route_not_allowed`, `unknown_target`, `message_id_conflict`,
`unknown_delivery`, `correlation_mismatch`, `duplicate_terminal_reply`, `backpressure`,
`reserved_intent_not_allowed`, `adapter_unavailable`, `delivery_failed`를 구분한다. error는
stable code와 human-readable message를 함께 제공하며 secret/token/raw credential을
포함하지 않는다.

- target availability를 모르면 기본은 queue다. 명시적 policy만 reject로 바꿀 수 있다.
- fan-out aggregate terminal state는 v1에 만들지 않고 target별 delivery를 authoritative하게
  유지한다.
- backpressure 한도를 넘으면 무제한 메모리 적재 대신 typed reject 또는 bounded queue를 쓴다.
- user cancellation은 ack/reply를 추론하지 않는다. 원 obligation에 별도 cancellation
  evidence를 기록한다.
- v1은 global total ordering을 약속하지 않는다. 같은 target에 대한 live injection attempt는
  adapter/session별로 serialize해 interleaving을 막고, 관측 순서는 `createdAt`이 아니라 daemon
  sequence/event order로 표현한다.

### 4.5 Reference runtime persistence minimum

G1 schema/cutover가 완료되면 repository는 최소한 다음 정보를 잃지 않고 조회할 수 있어야
한다. 실제 table 분리는 구현 detail이지만 의미를 합치거나 생략할 수 없다.

- message: protocol, messageId, source kind/address, type, intent, replyExpected, canonical
  content, createdAt.
- delivery: deliveryId, messageId, target address, route id, status, idempotency key, attempt,
  retry eligibility, nextAttemptAt, ack deadline, degradation code, last failure code.
- ack: deliveryId, acknowledging identity, evidence kind, timestamp.
- reply obligation: originating deliveryId, state
  (`awaiting_reply | fulfilled | cancelled | expired`), fulfilling reply
  message/delivery id.
- event: state transition, actor, correlation ids와 redacted diagnostic data.

현재 schema는 message의 sourceAgentId/parentMessageId/type/content와 delivery status/
idempotencyKey까지만 저장한다. 따라서 v1 field를 prompt에만 렌더하고 저장하지 않는 구현은
conformant하지 않다. 공개 release가 계속 in-memory DB를 쓰더라도 process lifetime 안에서는
위 상태와 전이를 일관되게 보존해야 한다.

Current implementation caveats:

- Current in-memory/domain messages carry `id`, `sourceAgentId`,
  `parentMessageId`, `type` and text `content`; they do not carry protocol
  version, canonical source/target address, `intent`, `replyExpected`, a
  structured `content` object or public `deliveryId` fields. Current evidence:
  [[src/core/messages.ts]] — `src/core/messages.ts:17-23`, `src/core/messages.ts:33-40`.
- Current fan-out creates one logical message plus one queued delivery per
  route. The stored delivery row has a generated `id`, shared `messageId`,
  target agent id, route id, status and idempotency key, but it does not yet
  persist retry attempt metadata, ack evidence, reply obligation state or
  degradation code. Current evidence: `src/core/messages.ts:57-74`,
  [[src/core/deliveries.ts]] — `src/core/deliveries.ts:13-19`, `src/core/deliveries.ts:26-35`,
  [[src/store/repositories/deliveries.ts]] — `src/store/repositories/deliveries.ts:102-112`.
- Current SQLite schema has `messages`, `message_deliveries` and `events`
  tables with timestamps and correlation ids, but it is still below the G1
  persistence minimum because canonical v1 envelope fields, ack records, retry
  scheduling and reply obligations are absent. Current evidence:
  [[src/store/schema.ts]] — `src/store/schema.ts:48-78`.

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
- reply timeout은 기본 hard failure cutoff가 아니라 pending visibility threshold다.
  hard deadline은 explicit policy로만 둔다.
- delivery lifecycle은 push 후 **ack로 완결**되며, 미확인 delivery는 §4.3 정책에 따른다.

Current non-native caveat:

- Codex/Claude 같은 TUI target injection은 prompt-level compatibility path다.
- adapter-backed runtime이 structured envelope ingestion이나 presentation policy를 강제하지
  못하면 typed degradation으로 surface해야 한다.
- 현재 `AdapterInjectResult.kind === "success"`는 adapter/transport acceptance일 뿐 ack가
  아니다. 현재 구현처럼 곧바로 `completed`로 전이하는 동작은 G1에서 교체한다.

Implementation review notes (G1 착수 시 사용자와 재검토):

- §4.1의 complete normative object 예시는 새 thread용이다. `inReplyToDeliveryId`는 reply에서만
  required인 조건부 field이므로 현재 예시에서 빠진 것이 계약 위반은 아니다. 다만 schema,
  fixture와 문서 구현 시 새 thread와 reply 예시를 각각 두어 reply 구현이 이 field를 누락하지
  않게 한다.
- `messageId`는 현재 source scope의 opaque id로 정의돼 있다. `deliveryId`의 생성 namespace와
  uniqueness scope, repository unique constraint, daemon 간 federation 시 충돌 처리까지 어느
  범위에서 보장할지는 G1 schema를 고정할 때 명시한다.
- Tier 3에서 acceptance 뒤 ack를 끝내 얻지 못한 `delivered + unconfirmed` delivery의 retention,
  operator-visible stale 기준, 수동 retry·cancel·archive 처리와 reply obligation 정리 정책은 G1
  failure-injection 결과를 보고 결정한다. 자동 재주입 금지 원칙은 유지한다.
- reply가 ack보다 먼저 도착할 수 있으므로 구현은 reply obligation을 `completed` 전에도 유실
  없이 식별하거나 reply 처리와 함께 원 delivery의 ack evidence·obligation fulfillment를
  원자적으로 기록해야 한다. obligation 생성 시점과 state transition의 정확한 저장 모델은 G1
  schema 설계에서 확정한다.
- **Open decision — correlated reply authorization:** current implementation is
  route-based fan-out for reply messages, while the v1 target candidate is
  source-only delivery correlation by `inReplyToDeliveryId`. G1 must decide
  whether a correlated reply requires a reverse directed route or whether the
  original delivery obligation grants a narrow reply right to the original
  source. Until that decision is approved, source-only correlation remains the
  target direction but not an implemented current contract.
- **Recommended, not yet approved — `type` authoring:** canonical `send`는 caller가
  `question | instruction`을 명시하고, canonical `reply`는 daemon이 `reply`로 고정하며,
  `status | event`는 인증된 daemon/system path만 생성하는 방식을 우선 검토한다. `type`은
  `intent`에서 암묵적으로 추론하지 않는다. 정확한 typed input과 validation 규칙은 G1에서
  사용자 승인을 받아 확정한다.
- **Recommended, not yet approved — explicit ack surface:** explicit ack는 일반 message
  envelope이 아니라 인증된 control-plane operation으로 두는 방식을 우선 검토한다. caller는
  `deliveryId`를 제출하고 acknowledging identity는 caller 입력을 신뢰하지 않고 token/session
  binding에서 daemon이 결정한다. operation/tool/RPC 이름과 adapter별 호출 시점은 G1에서
  사용자 승인을 받아 확정한다.
