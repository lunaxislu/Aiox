# aiox A2A Protocol Spec

This document is the self-contained protocol, interface, and state contract for
aiox A2A semantics. It was extracted from the legacy PRD monolith during
workspace reset W4 and keeps the original source section numbers for sections 2
through 9.

During workspace reset W5 the protocol body (§3.1 and §4 through §9) was split
into per-topic slice files for Obsidian/Atlas navigation. This file remains the
**compatibility index and navigation hub**: it keeps the intro, status
vocabulary, the §2 glossary and §3 layer model overview, and preserves every
§N / §N.x heading as an anchor-stable stub that links to its slice. Inbound
references to `aiox-a2a.md#<section>` stay valid here; the full contract text
lives in the linked slices.

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

## Document map (split slices)

각 protocol slice는 자기 owner 책임만 소유한다. 상태 어휘와 아래 §2 glossary·§3 layer
model overview는 이 인덱스가 소유한다.

- §3.1 Runtime config / profile namespace → [[docs/specs/aiox-runtime-profile-namespace]]
- §4 A2A protocol과 message lifecycle (§4.1~§4.5) → [[docs/specs/aiox-message-lifecycle]]
- §5 Adapter (4-slot + capability tier) → [[docs/specs/aiox-adapter-model]]
- §6 Compose (declarative composition) → [[docs/specs/aiox-compose-contract]]
- §7 Capability와 sandbox (§7.1~§7.2) → [[docs/specs/aiox-capability-policy]]
- §8 Federation / remote → [[docs/specs/aiox-federation-remote]]
- §9 Open / deferred → [[docs/specs/aiox-open-deferred]]

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
  Current mapping evidence: [[src/store/schema.ts]] — `src/store/schema.ts:16-28`;
  [[src/store/repositories/agents.ts]] — `src/store/repositories/agents.ts:19-26`,
  `src/store/repositories/agents.ts:112-154`.
- **type**: 저장/시스템 분류 축. 기존 `messages.type`과 연결되며, 협업 의미나 reply
  필요 여부를 단독으로 표현하지 않는다. Current evidence:
  [[src/core/messages.ts]] — `src/core/messages.ts:7-23`; [[src/store/schema.ts]] —
  `src/store/schema.ts:48-56`.
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

이 섹션은 [[docs/specs/aiox-runtime-profile-namespace]]로 분리되었습니다.

## 4. A2A protocol과 message lifecycle

이 섹션은 [[docs/specs/aiox-message-lifecycle]]로 분리되었습니다. §4.1~§4.5는 같은 slice가 소유합니다.

### 4.1 Canonical envelope v1

[[docs/specs/aiox-message-lifecycle]] 참조.

### 4.2 Routing and reply correlation

[[docs/specs/aiox-message-lifecycle]] 참조.

### 4.3 Delivery, acknowledgement, retry

[[docs/specs/aiox-message-lifecycle]] 참조.

### 4.4 Baseline error model and defaults

[[docs/specs/aiox-message-lifecycle]] 참조.

### 4.5 Reference runtime persistence minimum

[[docs/specs/aiox-message-lifecycle]] 참조.

## 5. Adapter (4-slot + capability tier)

이 섹션은 [[docs/specs/aiox-adapter-model]]로 분리되었습니다.

## 6. Compose (declarative composition)

이 섹션은 [[docs/specs/aiox-compose-contract]]로 분리되었습니다.

## 7. Capability와 sandbox

이 섹션은 [[docs/specs/aiox-capability-policy]]로 분리되었습니다. §7.1~§7.2는 같은 slice가 소유합니다.

### 7.1 Claude/Codex projection feasibility (2026-06-11)

[[docs/specs/aiox-capability-policy]] 참조.

### 7.2 Trust boundary and data handling

[[docs/specs/aiox-capability-policy]] 참조.

## 8. Federation / remote

이 섹션은 [[docs/specs/aiox-federation-remote]]로 분리되었습니다.

## 9. Open / deferred

이 섹션은 [[docs/specs/aiox-open-deferred]]로 분리되었습니다.
