# aiox A2A Protocol Spec

This document is the self-contained protocol, interface, and state contract for
aiox A2A semantics. It was extracted from the legacy PRD monolith during
workspace reset W4 and keeps the original source section numbers for sections 2
through 9.

Source section 0 product context has moved to `docs/product/product.md`. Source
section 1 current/as-built architecture has moved to
`docs/architecture/local-agent-runtime.md` and architecture owner documents. Release
gates, roadmap phase ordering, dated implementation audits, and market rationale
are intentionally not copied here; use the product, architecture, roadmap, and
evidence owners for those topics. Brief cross-references that remain inside the
copied protocol text are preserved as source context.
Source sections 10 through 13 are owner-split input, not hidden spec sections:
misleading metaphors stay out of the contract body, release gates and dated
audit pressure belong to `docs/product/roadmap.md` and `plans/`, and product or
architecture rationale belongs to product, architecture or decision owners.

Sentence status is read as follows:

- **Normative**: `MUST`, `MUST NOT`, `SHOULD`, or explicit invariant language.
  Implementations and tests are expected to follow it.
- **Current**: dated implementation facts from the source. Revalidate if code or
  date-sensitive external conditions have changed.
- **Committed target**: approved release/phase contract that may not yet be
  implemented.
- **Exploratory**: a hypothesis or spike topic that is not a product promise
  until verified and approved.

Unless a paragraph says otherwise, sections 2 through 5 describe the protocol
contract and should be treated as Normative. Sections 6 through 8 are Committed
targets where their local status notes say they are not yet implemented. Section
9 is Open/deferred and records unresolved decisions.

This document is the current approved intent and contract, not an immutable
charter. Normative and Committed target text can change after investigation,
user/agent discussion, test evidence, and explicit approval. Until changed,
agents should follow the current contract and should not silently replace it
based on convenience, guesses, or external changes. Contract changes should
update the responsible document owner together with implementation and tests
when applicable.

## 2. Glossary

- **aiox-native agent**: structured envelope ingestion, reply correlation, route/mailbox,
  capability/policy, presentation handling을 runtime object로 1급 지원하는 agent.
- **adapter-backed agent**: aiox protocol을 native로 지원하지 않아 adapter가 prompt,
  MCP, plugin, config, channel 등으로 변환해 연결하는 agent.
- **degraded rendering**: non-native TUI agent를 위한 compatibility surface. 텍스트
  envelope/prompt injection은 protocol authority가 아니라 display/behavior guidance다.
- **messageId**: logical message/group id.
- **deliveryId**: target-specific delivery correlation id. fan-out에서 target마다 다를 수
  있으며 reply correlation의 기준이다.
- **agent address**: logical agent의 canonical identity. runtime process/session id와 분리된다.
  v1 local 형식은 `agent://local/<profile>/<agent-name>`이며 authority/project/agent segment는
  URL percent-encoding 후 비교한다. 현재 DB의 agent id/name은 이 주소로 가는 local mapping이다.
- **type**: 저장/시스템 분류 축. 기존 `messages.type`과 연결되며, 협업 의미나 reply
  필요 여부를 단독으로 표현하지 않는다.
- **intent**: 협업 의미 축. agent-authored 값은 delegation/discussion/clarification/
  result/conclusion이고, status/notification은 daemon-authored reserved 값이다.
- **reply_expected**: target 행동 신호 축. "답해야 하는 메시지인가"를 명시한다.
  `intent`만으로 reply 여부를 추론하지 않는다.
- **source-only routing**: reply의 기본 routing. reply는 원 message의 source에게만 돌아간다.
- **mailbox**: per-recipient 수신함. target offline을 전제로 delivery를 보관한다.
- **capability tier**: adapter-backed runtime이 A2A semantics를 어느 수준으로 지원하는지
  설명하는 등급.
- **Capability Projection Layer**: common grant를 per-agent runtime projection으로 만들고,
  adapter가 native config/plugin/MCP/skill surface로 compile하는 계층.

## 3. Layer model

1. **Protocol contract layer**: vendor/location-neutral envelope, address, route, delivery,
   reply correlation, capability, policy, presentation semantics.
2. **Reference runtime layer**: daemon store, mailbox, router, token/policy authority,
   pending/reply lifecycle surface.
3. **Adapter layer**: non-native runtime의 launch/attach, ingress/egress, identity,
   render/compile 차이를 흡수한다.
4. **Composition layer**: compose/config가 agents/routes/capabilities/policies/instructions
   desired state를 선언한다.

### 3.1 Runtime config / profile namespace

**Status: Current for profile and socket path resolution; current scaffold plus
Implementation Gap for state DB path wiring.** The reference runtime uses one
profile namespace bundle for daemon socket and future state DB paths. Profile
selection is `dev | build | release`; `AIOX_PROFILE` wins over binary-path
detection, and invalid profile names fail fast. Current code evidence:
`src/config/paths.ts:15-37`, `tests/unit/config/paths.test.ts:14-52`.

`AIOX_SOCKET_PATH` is the top-priority daemon socket override. It MUST be an
absolute path; a relative override is a configuration error because child
agents can launch from different working directories. Without the override,
`release` uses `~/.aiox/daemon.sock`, while `dev` and `build` use
`~/.aiox/<profile>/daemon.sock`. Current code evidence:
`src/config/paths.ts:88-102`, `tests/unit/config/paths.test.ts:55-84`.

`AIOX_DB_PATH` follows the same absolute override and profile namespace
resolver contract for the future file-backed state DB path. However, this is
not an active durable-store guarantee: the production daemon currently opens
`:memory:` and does not wire `getStatePath()` into daemon startup. Current
resolver evidence: `src/config/paths.ts:105-120`,
`tests/unit/config/paths.test.ts:87-123`. Current production gap evidence:
`src/daemon/run.ts:24-26`.

CLI and adapter-launched child agents inherit the resolved socket namespace.
The CLI starts the daemon with one resolved socket path, and launch adapters
receive that path through `AIOX_SOCKET_PATH`; canonical agent identity remains
the logical `agent://local/<profile>/<agent-name>` address, not a filesystem
socket path. Current evidence: `src/bin/aiox.ts:78-102`,
`src/bin/aiox.ts:166-180`, `src/cli/invocation.ts:200-254`,
`src/adapters/codex/launcher.ts:88-119`,
`src/adapters/claude/launcher.ts:94-118`.

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
  reason. Current evidence: `src/daemon/state.ts:323-338`,
  `src/daemon/state.ts:1761-1783`,
  `tests/unit/daemon/message-fanout-store.test.ts:198-222`,
  `tests/unit/daemon/codex-ingress.test.ts:589-602`.
- The current store has a `message_deliveries.id` primary key, but public v1
  envelope `deliveryId` exposure and its external namespace are still an
  Implementation Gap/Open Issue. Current schema evidence:
  `src/store/schema.ts:58-67`, `tests/unit/store/schema.test.ts:174-195`.
  The target contract is a stable target-specific delivery id; whether that
  public id is identical to the stored row id or a separate external id must
  be decided before G1 schema cutover.
- Current reply ingress creates a `type: "reply"` message linked by
  `parentMessageId`/`parent_message_id` and dispatches it through the replying
  agent's active outbound routes. It does not yet authorize replies by
  `inReplyToDeliveryId` or force source-only routing to the original source.
  Current evidence: `src/daemon/state.ts:315-320`,
  `src/daemon/state.ts:1800-1821`,
  `tests/unit/daemon/codex-ingress.test.ts:633-710`.

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
- reply obligation: originating deliveryId, state(`awaiting_reply | fulfilled | cancelled |
expired`), fulfilling reply message/delivery id.
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
  `src/core/messages.ts:17-23`, `src/core/messages.ts:33-40`.
- Current fan-out creates one logical message plus one queued delivery per
  route. The stored delivery row has a generated `id`, shared `messageId`,
  target agent id, route id, status and idempotency key, but it does not yet
  persist retry attempt metadata, ack evidence, reply obligation state or
  degradation code. Current evidence: `src/core/messages.ts:57-74`,
  `src/core/deliveries.ts:13-19`, `src/core/deliveries.ts:26-35`,
  `src/store/repositories/deliveries.ts:102-112`.
- Current SQLite schema has `messages`, `message_deliveries` and `events`
  tables with timestamps and correlation ids, but it is still below the G1
  persistence minimum because canonical v1 envelope fields, ack records, retry
  scheduling and reply obligations are absent. Current evidence:
  `src/store/schema.ts:48-78`.

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

## 5. Adapter (4-slot + capability tier)

Adapter는 vendor/runtime 차이를 흡수하는 compatibility connector다. Protocol contract가
요구하는 semantics를 non-native runtime에 가능한 가장 좁은 native surface로 projection한다.

Adapter id는 closed enum이 아니라 runtime connector id로 열어둔다. 현재 구현은 Codex와
Claude에 가깝지만, contract는 `codex-cli`, `claude-cli`, `gemini-cli`, `ollama-local`,
`vscode-agent`, `remote-agent` 같은 새 runtime을 같은 adapter model 위에 추가할 수
있어야 한다.

Adapter 4-slot:

- **launch/attach**: agent runtime을 어떻게 실행하거나 기존 session에 연결하는가.
- **ingress**: aiox message를 agent runtime이 어떻게 받는가.
- **egress**: agent가 aiox로 어떻게 reply/result/conclusion을 제출하는가.
- **identity**: session/app/worker instance를 어떻게 식별하는가.

Runtime surface는 점진적으로 `launch / attach / connect / disconnect`, `ingress / egress`,
`identity / health`, `render / compile`을 포함한다.

Adapter는 OS별 launch detail도 흡수한다. shell quoting, environment variable, path,
process signal, temp/runtime directory 차이는 daemon core나 A2A protocol에 새지 않아야
한다.

Attach 방식은 runtime별로 다를 수 있다:

- **direct/native**: agent runtime이 aiox envelope/reply를 직접 지원한다.
- **plugin/extension**: Claude plugin, editor extension처럼 host 확장 표면으로 연결한다.
- **bridge/sidecar**: app 옆의 local process가 app API와 aiox daemon을 연결한다.
- **prompt/text fallback**: structured surface가 없어 prompt injection으로 연결한다. 이
  방식은 best-effort이며 typed degradation으로 드러내야 한다.

Capability tier:

- **Tier 1 `full_duplex_structured`**: structured envelope ingress/egress, deliveryId 보존,
  authenticated identity, explicit ack와 idempotent duplicate 처리를 모두 제공한다.
- **Tier 2 `side_channel`**: structured metadata와 authenticated egress는 제공하지만 message
  presentation 또는 wake-up이 runtime-specific secondary channel을 사용한다. 누락 guarantee를
  adapter가 개별 flag로 보고한다.
- **Tier 3 `prompt_only`**: message/correlation metadata를 text로 렌더한다. target receipt,
  identity, correlation 또는 dedupe 중 하나 이상을 강제할 수 없다. prompt injection 성공만으로
  acknowledged를 보고하면 안 된다.
- **Tier 4 `unsupported`**: 신뢰할 수 있는 ingress 또는 egress 경로가 없어 route target으로
  등록할 수 없다.

4-slot은 adapter 구현 입력 모델이고, tier는 그 결과로 해당 runtime이 지원하는 A2A 수준을
설명한다. 모든 runtime을 Tier 1로 취급하지 않는다.

Current implementation caveats:

- The shared adapter interface is not yet the full 4-slot runtime model. It is
  currently `AgentAdapter { kind, inject(input) }`, and `AdapterInjectResult`
  distinguishes `success`, `failed` and `deferred`. Current evidence:
  `src/adapters/contract.ts:19-56`,
  `src/adapters/router.ts:87-114`,
  `src/adapters/router.ts:140-178`,
  `tests/unit/adapters/fake-integration.test.ts:437-541`.
- The daemon still contains a direct Codex/Claude dispatch branch in the
  production message path. A general adapter dispatch registry is an
  Implementation Gap / execution-plan item, not a Current Contract. Current
  evidence: `src/daemon/state.ts:1274-1277`.
- Adapter 4-slot and pair slots are different concepts. Current pair capacity
  is a vendor-agnostic two-slot model, `PairSlot = "a" | "b"`; same-vendor
  pairs can occupy both slots and become ready. Current evidence:
  `src/core/pairs.ts:23-45`, `src/core/pairs.ts:76-130`,
  `tests/unit/core/pairs.test.ts:110-159`.
- Current code can surface typed adapter degradation and deferred injection,
  but it does not expose a runtime tier evaluator or diagnostics API that
  proves every wake-up, ack, correlation and dedupe guarantee. The tier matrix
  below is therefore a compatibility/status classification, not proof that a
  runtime has a complete Tier 1/2 guarantee.

Current adapter matrix (2026-06-11):

| Runtime         | Launch/attach                               | Ingress                                         | Egress                                             | Identity/correlation                                            | Effective tier                                                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------- | ----------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex CLI       | daemon-owned app-server + TUI launch/resume | app-server turn/prompt compatibility path       | launch-scoped MCP `aiox_send_message`/`aiox_reply` | agent token + thread/session; reply는 logical parent message id | **Tier 3**. Current local code launches an app-server, connects WebSocket, starts a per-agent proxy, injects fixed `mcp_servers.aiox`, and uses `turn/start` for ingress. Upstream support/stability and methods such as `thread/inject_items`/`turn/steer` must be revalidated before G0/G1 cutover. |
| Claude Code CLI | dev-channel/plugin channel launch           | local channel push/notification + text envelope | channel `send`/`reply`                             | agent name + `chat_id`; 현재 daemon->channel push auth gap 존재 | **Tier 3 preview**. Current local code can launch inline/plugin channel paths and register/send/reply through the channel server, but daemon->channel `/send` push lacks request auth and delivery ack is not complete. Authentication and ack completion are prerequisites for any Tier 2 claim. |

지원 표에 없는 runtime은 이름만 adapter enum에 추가해서 지원으로 주장하지 않는다. 4-slot,
auth, ack, degradation test를 모두 기록한 뒤 tier를 부여한다.

Current local evidence for the matrix: Codex app-server/TUI launch and fixed MCP
projection are in `src/adapters/codex/launcher.ts:40-119`; Codex attach,
WebSocket initialization, proxy startup and runtime failure detection are in
`src/adapters/codex/runtime.ts:304-365`; proxy binding observes
`thread/start|resume|fork` responses in `src/adapters/codex/proxy.ts:58-193`;
Codex MCP send/reply descriptions and daemon client surface are in
`src/adapters/codex/mcp-server.ts:140-165`. Claude inline/plugin launch and
identity/socket injection are in `src/adapters/claude/launcher.ts:9-27`,
`src/adapters/claude/launcher.ts:94-118` and
`src/adapters/claude/launcher.ts:189-209`; channel send/reply tools and daemon
registration are in `src/adapters/claude/channel-server.ts:258-304` and
`src/adapters/claude/channel-server.ts:491-520`; daemon-to-channel push and the
current unauthenticated `/send` boundary are in
`src/adapters/claude/injector.ts:21-78` and
`src/adapters/claude/channel-server.ts:432-456`.

Claude TUI ingress는 하나의 표면을 완전한 보장처럼 취급하지 않고 다음 fallback map으로
판독한다. 외부 CLI/hook 표면은 current adapter matrix와 함께 재검증한다.

- **Current primary:** plugin channel notification/push. TUI를 유지하면서 비동기 전달할 수
  있지만 idle delivery와 receipt를 자체 보장하지 않으므로 G1 auth·ack·retry 계약이 필요하다.
- **Committed compatibility rule:** Stop hook은 pending mailbox 확인 또는 passive ack의 보조
  신호로만 쓴다. 특정 `deliveryId`와 target session에 상관되지 않으면 ack가 아니다.
- **Exploratory fallback:** UserPromptSubmit hook은 다음 사용자 입력에 pending delivery를
  동봉할 수 있지만 idle session을 깨우지 못하므로 primary ingress나 delivery guarantee가
  아니다.
- **Exploratory alternate runtime:** headless stream/SDK 경로는 더 강한 structured control을
  줄 수 있지만 TUI continuity와 billing/runtime 분류가 달라질 수 있다. 실제 vendor policy와
  account usage를 검증하기 전에는 현재 adapter의 대체 계약으로 채택하지 않는다.
- **Tier 3 last resort:** prompt injection이나 terminal key injection은 명시적
  `prompt_only` degradation으로만 허용한다.

Adapter status와 diagnostics는 현재 선택된 ingress path, fallback 발생 이유, wake-up·ack·dedupe
보장 여부를 각각 노출해야 한다. fallback이 성공했다는 이유만으로 effective tier를 올리지 않는다.

## 6. Compose (declarative composition)

**Status: Committed target, Phase 2. 현재 CLI/config에는 구현되어 있지 않다.** 아래 command와
schema 이름은 v1 compose contract를 승인할 때까지 provisional이다. Current repository
spot-check: `rg -n "compose|Compose|compose.yaml" src tests package.json README.md` finds no
compose implementation or user-facing command outside this spec.

Compose는 Docker clone이 아니다. Compose는 collaboration protocol/runtime 위에서 project
collaboration topology와 runtime projection을 선언하는 config layer다.

Top-level schema 방향:

- `version`
- `project`
- `agents`
- `routes`
- `capabilities`
- `policies`
- `instructions`

Principles:

- Docker식 `services`, `scale`, `replica` 은유는 피한다. agent는 non-fungible participant다.
- `project`는 compose가 만든 desired state의 logical ownership label이다. `up`/`down`
  같은 lifecycle command는 "이 compose project가 만든 것"만 대상으로 삼아야 하며,
  같은 daemon/profile 안의 unrelated manually attached agent를 소유한다고 약속하지 않는다.
- `AGENTS.md`/`CLAUDE.md` 같은 native project instruction은 read-only base layer로 둔다.
- compose-generated instruction은 aiox-launched session에만 주입되는 launch-scoped
  orchestration layer다.
- Instruction precedence는 `host policy > native project docs > compose session
instruction > user prompt > agent memory` 순서로 본다. 여기서 native project docs는
  `AGENTS.md`/`CLAUDE.md` 같은 host-native instruction을 뜻한다.
- compose config는 OS-neutral하게 둔다. OS별 command/path/env 차이는 adapter compiler나
  recipe/plugin이 처리한다.
- native docs replacement나 global native config mutation을 기본값으로 두지 않는다.
- terminal/editor auto-layout은 core protocol이 아니다. Manual attach를 portable baseline으로
  두고, tmux/VS Code tasks/Windows Terminal 같은 자동 배치는 recipe/plugin layer로 둔다.
- `pair`, `connect`, `pending_attach`는 future compose desired state의 seed로 볼 수 있다.
- **user-level preference와 project-level compose를 분리한다.**
  터미널 종류/view driver/기본 profile 같은 사람 취향은 user config
  (`~/.aiox/config.json`, 첫 실행 onboarding이 env 감지 — `$TERM_PROGRAM`·`$TMUX`·
  `$WT_SESSION` — 로 생성)가 소유하고, topology/capability 같은 프로젝트 계약은
  compose 파일이 소유한다. compose에 사용자 취향을 넣으면 커밋마다 팀원과 충돌한다
  (shadcn `components.json`이 "프로젝트 계약만 담아서" 작동하는 것과 같은 이유).
  설치(postinstall) 시 interactive 질문은 안티패턴(CI·비대화형 설치에서 실패) —
  묻는 시점은 첫 실행이다.
- 위의 "tmux/VS Code tasks/Windows Terminal 같은 자동 배치"
  recipe/plugin layer를 **view driver**(`--ui tmux|wt|iterm2|none`)로 명명한다.
  모델은 docker compose와 동형: `aiox compose up` = daemon 관리 detached 기동,
  `aiox attach <agent>` = 모든 터미널에서 동작하는 보편 표면(여기까지가 core),
  view driver = 제어 표면이 있는 멀티플렉서/터미널에만 제공하는 표시 계층.
  "어떤 터미널이든"이라는 요구는 split 제어가 아니라 attach 보편성으로 충족한다
  (macOS Terminal.app·PowerShell 콘솔·IntelliJ·VSCode 터미널 패널은 외부 split 제어
  표면이 없다). 자체 PTY 호스팅(node-pty + scrollback + resize)은 "미니 tmux" 함정 —
  detach 백엔드는 tmux에 위임한다(G2 최소 driver).

User config도 현재 미구현 target이다. 도입 시 precedence는
`CLI flag > environment > profile-scoped user config > built-in default`로 고정하고,
config에는 schema version, profile scope, validation error, migration 규칙을 둔다. 첫 실행
onboarding은 interactive TTY에서만 제안하며 CI/non-interactive 실행은 질문 없이 default 또는
명시적 오류로 끝난다. compose 파일명과 discovery 규칙은 compose 착수 전에 별도 승인한다.

Implementation review note (Compose 착수 시 사용자와 재검토):

- `host policy > native project docs > compose session instruction > user prompt > agent memory`는
  책임과 의도상 우선순위를 표현한 현재 원칙이다. 실제 runtime마다 instruction role, config
  precedence와 강제 가능 범위가 다르므로 이를 모든 adapter의 기술적 precedence로 미리
  가정하지 않는다. Compose 구현 전에 adapter별 주입 surface와 충돌 동작을 검증하고, 원칙을
  보존할 수 없는 경우 degradation 또는 runtime별 계약과 함께 사용자 승인을 받아 갱신한다.

## 7. Capability와 sandbox

**Status: policy model은 Normative target, capability projection과 sandbox enforcement는
미구현이다.** 현재 token/route enforcement와 fixed aiox MCP/channel projection 일부가
존재하지만 release-grade security boundary나 arbitrary capability compiler로 간주하지
않는다.

Capability isolation의 중심 개념은 **Capability Projection Layer**다.

Security와 isolation은 네 축으로 나눠서 본다:

1. **Identity/Auth**: 누가 말하는가. agent token, daemon token, org identity 같은 축이다.
2. **Authorization/Policy**: 무엇을 할 수 있는가. route allow, capability allow/deny,
   project/org policy 같은 축이다.
3. **Capability Isolation**: 어떤 tool/MCP/skill/instruction이 보이는가. launch-scoped
   projection과 per-agent grant가 이 축이다.
4. **Sandbox/Execution Isolation**: 실제 OS, 파일, 네트워크, 프로세스를 어디까지 막는가.
   이 축은 reserved/non-guarantee 상태이며 capability isolation과 같지 않다.

Model:

1. aiox capability registry가 MCP server, tool grant, skill, generated instruction source를
   보관한다.
2. compose/daemon이 agent별 effective grant를 resolve한다.
   - Scope precedence는 `global aiox defaults -> project compose -> agent override` 순서다.
   - Allow/grant는 좁은 scope가 추가하거나 override할 수 있지만, deny/restriction은 보수적으로
     누적한다.
3. session launch 때 per-agent runtime projection을 만든다.
4. adapter가 projection을 Codex/Claude/Gemini native config/plugin/MCP/skill surface로
   compile한다.

Principles:

- native global config/skill folder는 기본 수정하지 않는다.
- aiox-launched session에만 runtime projection을 주입한다.
- runtime projection은 OS별 path와 filesystem 제약을 고려한다. host의 session-only
  plugin/config 표면을 우선하고, filesystem materialization이 필요한 경우에만 symlink-first와
  Windows copy fallback을 사용한다.
- MCP server 주입 여부는 강하게 제어할 수 있다.
- aiox-owned route/tool surface는 daemon token/policy로 강제한다. 기본값은
  deny-by-default + explicit allow다.
- routing graph와 capability graph는 schema에서 분리한다. 다만 enforcement 시점에는 route가
  없는 send/reply capability를 daemon policy가 거부해야 한다.
- external MCP/native surface의 내부 tool allow/deny는 host/server 지원에 따라
  degradation을 surface한다. aiox가 항상 강제한다고 약속하지 않는다.
- skill은 tool과 다르다. skill은 instruction/assets 노출에 가깝고, 한 번 읽힌 지식은
  완전히 회수하기 어렵다.
- capability/policy grant와 OS sandbox는 분리한다.

### 7.1 Claude/Codex projection feasibility (2026-06-11)

이 절은 compose 구현 완료를 주장하지 않고, §7의 `registry -> resolve -> projection ->
adapter compile` 중 마지막 compile 단계에 사용할 수 있는 현재 표면을 구분한다. 확인
환경은 Claude Code 2.1.170과 Codex CLI 0.137.0이며, 실제 지원 범위는 adapter preflight와
version matrix로 다시 고정한다.

| Projection                                 | Current evidence                                                                                                                                                                                                                                                               | Feasibility judgment                                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex per-session MCP                      | 현재 launcher가 `-c mcp_servers.aiox=...`로 aiox send/reply MCP와 agent identity env를 주입한다(`src/adapters/codex/launcher.ts`). unit test도 inline config 생성을 검증한다.                                                                                                  | **Proven for one fixed aiox server.** compose 선언의 N개 server와 tool grant로 일반화하는 것은 낮은 위험의 compiler 작업이지만 아직 구현되지 않았다.                                                      |
| Claude per-session MCP/instruction         | inline 경로는 `--mcp-config`, 기본 경로는 channel plugin activation으로 aiox tool과 MCP server instructions를 세션에 연결한다(`src/adapters/claude/launcher.ts`, `channel-server.ts`).                                                                                         | **Proven for one fixed aiox plugin/server.** `--strict-mcp-config`, settings precedence와 여러 plugin 충돌을 포함한 일반화는 구현·통합 시험이 필요하다.                                                   |
| Claude user-declared skill/MCP/instruction | 공식 CLI는 session-only `--plugin-dir`, `--mcp-config`, `--settings`, `--append-system-prompt(-file)`을 제공하고 plugin은 skill과 MCP server를 함께 묶을 수 있다.                                                                                                              | **Official surface exists.** plugin으로 패키징된 skill은 symlink/copy 없이 per-agent 부여할 수 있다. raw skill directory 조합과 Windows path 처리는 별도 compiler fallback이다.                           |
| Codex user-declared MCP/instruction        | 공식 CLI의 `-c/--config`는 arbitrary key override를 지원하고 `mcp_servers`, `developer_instructions`/`model_instructions_file`, MCP tool allow/deny를 config로 표현한다.                                                                                                       | **Official surface exists.** current one-off aiox injection을 일반화할 수 있으나 quoting, secret 전달과 managed-policy 충돌 test가 필요하다.                                                              |
| Codex per-agent skill/plugin set           | Codex는 repo/user/admin skill discovery, symlinked skill folder와 plugin bundle을 제공하고, 공식 config 문서는 installed plugin의 `enabled` 값을 정의한다. 현재 `codex plugin` CLI는 add/list/remove만 노출하고 session-only `--plugin-dir`에 해당하는 flag는 확인되지 않았다. | **Spike required.** preinstalled plugin의 one-off `-c` toggle, generated `--profile`, agent별 worktree/projection directory 중 어떤 방식이 동일 repo 동시 session에서 실제 격리되는지 검증한 뒤 계약한다. |

따라서 compose는 새 vendor mechanism 발명보다 현재 하드코딩된 aiox projection을 선언형
N개 grant로 일반화하는 작업에 가깝다. 그러나 현재 코드는 registry, dependency resolution,
conflict detection, projection cleanup과 arbitrary user capability compile을 구현하지 않았으므로
"절반 구현"은 adapter compile primitive에만 해당한다.

Current implementation caveats:

- Current Codex projection is a fixed per-session `mcp_servers.aiox` injection
  carrying agent identity, token and socket path; it is not a general
  multi-server grant compiler. Current evidence:
  `src/adapters/codex/launcher.ts:88-119`,
  `tests/unit/adapters/codex-launcher.test.ts:133-170`.
- Current Claude projection is either inline MCP config or plugin channel
  activation for the fixed aiox channel/server, with agent identity, token and
  socket path passed to the launched process. Current evidence:
  `src/adapters/claude/launcher.ts:94-117`,
  `src/adapters/claude/launcher.ts:189-206`,
  `src/adapters/claude/channel-server.ts:491-507`,
  `tests/unit/adapters/claude-channel.test.ts:673-739`.
- Registration/ingress auth is implemented for channel registration and Codex
  MCP egress, but Claude daemon-to-channel `/send` remains an Implementation
  Gap: the channel HTTP ingress accepts loopback POSTs without a request auth
  header. Current evidence:
  `src/daemon/state.ts:926-953`,
  `src/daemon/state.ts:1044-1073`,
  `src/daemon/state.ts:1711-1758`,
  `src/adapters/claude/channel-server.ts:432-456`,
  `docs/decisions/claude-channel-trust-and-registration.md:25-34`.

Host가 제공하면 client-visible MCP tool surface도 좁힐 수 있다. 예를 들어 Codex는
server별 enabled/disabled tool을, Claude는 tool allow/deny와 strict MCP config를 제공한다.
다만 이것은 외부 MCP server process 내부의 side effect, 동적 tool 변경이나 이미 skill에서
읽은 지식까지 회수하는 sandbox가 아니다. projection artifact와 secret은 owner-only 임시
경로에 만들고 session 종료 시 정리해야 한다.

Primary references: [Claude CLI reference](https://code.claude.com/docs/en/cli-reference),
[Claude plugins reference](https://code.claude.com/docs/en/plugins-reference),
[Codex advanced config](https://developers.openai.com/codex/config-advanced),
[Codex skills](https://developers.openai.com/codex/skills),
[Codex app-server](https://developers.openai.com/codex/app-server/).

Sandbox vocabulary is reserved but non-guarantee until explicitly implemented.

Reserved profiles:

- `none`
- `cwd-readonly`
- `cwd-write`
- `container`
- `vm`
- `remote-worker`

### 7.2 Trust boundary and data handling

- daemon socket, Claude channel endpoint, adapter credentials와 per-agent token은 trust
  boundary다. release 전에 runtime directory는 owner-only, socket/token file은 최소 권한으로
  생성하고 모든 ingress/push path에서 identity를 검증한다.
- 예상 가능한 client socket 오류는 request/connection boundary에서 처리한다. 최상위
  `unhandledRejection`/`uncaughtException`은 secret을 제거한 structured fatal log를 남기고
  process를 종료해야 하며, 손상 가능 상태에서 계속 실행하는 복구 수단으로 쓰지 않는다.
- message/transcript/log는 source code나 credential을 포함할 수 있는 local sensitive data다.
  기본 저장 위치는 profile namespace 아래여야 하고, public telemetry 전송은 opt-in 전에는
  금지한다. token/raw credential은 log/event/error에 남기지 않는다.
- 현재 DB는 process-lifetime이므로 retention/deletion guarantee가 없다. durable store를
  도입할 때 보존 기간, project/profile 삭제, transcript export/redaction, schema migration과
  crash recovery를 함께 정의한다. 이 항목 없이 "durable mailbox"를 release하지 않는다.
  Current evidence: production daemon paths still open `:memory:`
  (`src/daemon/run.ts:24-26`, `src/bin/aiox.ts:238-245`,
  `src/bin/aiox.ts:361-363`), while file-backed state path resolution is scaffolded
  but not wired (`src/config/paths.ts:105-120`).

## 8. Federation / remote

aiox는 local-first로 시작하지만, protocol contract는 location-ready하게 둔다.

**Status: Current for same-daemon local addressing and local socket control-plane
transport; Deferred/Target for same-machine multi-daemon, remote and federation
implementation.** No `src/` federation/remote implementation files are present as
of this assimilation pass (`find src -iname '*federation*' -o -iname '*remote*'`
returns no matches).

이 protocol contract는 다음 범위로 커져도 깨지지 않아야 한다:

1. **Same daemon local**: 같은 machine, 같은 daemon 안에서 agent끼리 대화한다.
2. **Same machine multi-daemon**: 같은 machine 안의 project/profile별 daemon이 서로
   주소화될 수 있다.
3. **Local-remote**: local daemon과 remote daemon 사이에서 agent가 대화한다.
4. **Company internal federation**: 회사 내부망의 team/project/org 경계를 정책으로 다룬다.
5. **Remote-remote**: remote daemon끼리 public/private transport로 대화한다.

위 목록은 구현 순서가 아니라 protocol contract가 보존해야 하는 확장 범위다. 높은 범위의 기능은 낮은
범위의 protocol contract를 깨지 않는 additive extension으로만 추가한다.

Principles:

- A2A envelope/route는 location-neutral하게 둔다.
- A2A protocol은 OS transport를 몰라야 한다. Unix domain socket, Windows named pipe,
  TCP loopback 같은 선택은 transport 구현 detail이다.
- local socket path나 process 위치를 canonical message identity로 박지 않는다.
- address/identity는 URI-like extension 가능성을 보존한다.
- local/remote 차이는 transport와 identity 계층이 처리한다.
- remote/federation 구현은 defer한다.
- **Committed transport direction:** protocol은 transport를 모르지만,
  reference runtime의 선택은 기록한다 — **거리마다 다른 transport, 같은 protocol**:
  ① 로컬 제어 평면(CLI↔daemon) = UDS 유지 + Windows는 named pipe(Node `net` 모듈
  동일 API, 전환 지점은 `src/daemon/socket-transport.ts` 주석에 표시됨. TCP loopback은
  차선 — 포트 충돌·로컬 다중 사용자 접근 제어 약함·Windows 방화벽 팝업).
  ② agent ingress = vendor 표면이 결정(MCP stdio/HTTP loopback/WS) — 선택권 없는 층.
  ③ daemon↔daemon(L1 사내망/L2 remote) = WebSocket over HTTPS + token/mTLS
  (`ws` 의존성 기보유, tunnel — tailscale/cloudflared — ·프록시 친화).
  ④ 자체 TCP 바이너리 프로토콜은 만들지 않는다.
- **Exploratory sequencing:** remote 확장 후보 순서는 **L2 → L1 → L3**다. L2는
  모바일/원격 client가 지원하는 connector와 secure tunnel을 이용해 local aiox MCP
  surface에 도달하는 가설이다. 실제 mobile client 지원 범위, 인증, background lifecycle,
  user consent를 spike하기 전에는 "신규 프로토콜 없이 가능" 또는 제품 기능으로 약속하지
  않는다. L1은 사내망 daemon federation, L3는 외부 vendor/Google A2A bridge이며 vendor
  표면 의존성이 더 크다. 전부 동시에 진행하지 않는다.

Current implementation caveat: the local control plane is implemented with a
Node `net` socket server/client around a resolved socket path
(`src/daemon/socket-transport.ts:48-85`), but daemon-to-daemon WebSocket/token/mTLS,
remote registration, signed envelopes and replay protection remain deferred.

Deferred federation topics:

- remote daemon registration
- daemon-to-daemon auth
- signed envelope
- replay protection
- ordering/retry
- partial failure policy
- company SSO/mTLS/public federation/cloud relay
- remote capability marketplace

## 9. Open / deferred

- group recipient visibility / shared group context.
- hard reply expiration default.
- remote/federated delivery implementation.
- Codex structured ingress spike. 2026-06-11 official app-server surface에서
  `thread/inject_items`, `turn/steer`, `turn/started|completed`, `outputSchema`,
  `thread/tokenUsage/updated` 존재는 확인했다. version-generated schema에서 본
  `clientUserMessageId`는 public docs 계약으로 확인되지 않았으므로 deliveryId binding
  후보일 뿐이다. 남은 검증은 TUI 표시, active turn 충돌, wake-up 조합, correlation id
  보존과 실패 모드다. 검증 전에는 Tier 2로 올리지 않는다.
  Current local partial: the Codex adapter can call `turn/start`, list loaded
  threads, bind selected thread identity through the proxy, and detect
  app-server/WS runtime failure (`src/adapters/codex/injector.ts:22-63`,
  `src/adapters/codex/runtime.ts:180-190`,
  `src/adapters/codex/runtime.ts:242-285`,
  `src/adapters/codex/runtime.ts:330-365`,
  `src/adapters/codex/proxy.ts:46-58`,
  `src/adapters/codex/proxy.ts:151-194`,
  `tests/unit/adapters/codex-proxy.test.ts:27-97`,
  `src/daemon/state.ts:1418-1482`,
  `src/daemon/state.ts:1684-1696`). This does not prove
  `thread/inject_items`, `turn/steer`, canonical `deliveryId` binding, active
  turn policy or Tier 2 delivery semantics.
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
- Duplicate outbound while `awaiting_agent_reply` is unresolved: 같은 logical request의
  coalescing/confirmation UX와 opposite-direction lane serialization.
- Fan-out partial completion:
  - v1 authority는 individual delivery다. source에게 partial completion을 어떤 summary로
    보여줄지만 open이다.
- User-interrupted pending turns:
  - When the adapter has no structured signal, whether to use user report, cancel command,
    or keep pending.
  - Interrupted message terminal state: `cancelled_by_user`, `failed`, `superseded`, or
    remain `awaiting_agent_reply`.
- Retry 기본 횟수/간격과 passive ack timeout의 release 값. §4.3 범위 안에서 G1
  failure-injection으로 고정한다.
- AI agent session expiry handling (absorbed from the legacy MVP PRD Open Product Issue #5):
  - adapter 외부 세션은 Claude development channel/MCP server 연결 idle timeout, Codex
    `app-server` WebSocket idle disconnect, Codex thread unload/disappearance, 또는
    Claude/Codex 사용자 auth token/session 만료로 끊길 수 있다.
  - 결정 필요: adapter가 만료를 어떻게 감지하는가(heartbeat, WS close,
    `thread/loaded/list` polling, API error 감지 등).
  - 결정 필요: 감지 후 agent를 자동으로 `stale`로 전환할 것인가, `disconnected`로
    둘 것인가.
  - 결정 필요: in-flight delivery를 재시도할지, 즉시 failed 처리할지, 사용자 알림 후
    대기시킬지.
  - 결정 필요: reconnect 시도 정책을 automatic backoff, 사용자 수동, 새 attach 명령 중
    어디에 둘 것인가.
  - 결정 필요: source agent에게 session expiry 사실을 어떻게 surface할 것인가.
  - 이 정책은 daemon 관점의 시간 기반 stale 판정과 별개이며, adapter가 외부 세션 단절을
    능동 감지하는 시나리오다.
