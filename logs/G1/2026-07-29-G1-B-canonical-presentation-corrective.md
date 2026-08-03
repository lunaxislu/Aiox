---
topic: G1-B adapter canonical-presentation corrective
description: Codex·Claude target-facing transport에서 canonical envelope JSON이 adapter-owned wrapper·legacy metadata 없이 정확히 전달·해석·검증되는지 바로잡는 G1-B corrective.
status: decided
---

## Work Items

- [x] W1 Git history로 XML wrapper의 도입 변경·의도·consumer 범위를 확인한다.
- [x] W2-1 공식 Claude Channel contract와 현재 wrapper 관련 테스트를 대조한다. 수동 inner `<channel>` 생성만 검증하고 host의 outer `<channel>` mapping 및 중복 가능성을 놓친 assertion을 식별한다.
- [x] W2-2 W2-1에서 공식 contract와 충돌한다고 판정된 wrapper assertion을 삭제하거나 교체한다. 관련 없는 ingress·error·reply 테스트는 유지한다.
- [x] W2-3 canonical envelope JSON이 notifications/claude/channel.params.content와 정확히 일치하고 meta가 없는 RED 테스트를 작성한다.
- [x] W2-4 W2-3 RED를 GREEN으로 만들도록 수동 inner wrapper와 현재 meta 전달 경로를 제거하고, Claude instructions를 host-owned outer channel과 canonical JSON body 기준으로 정리·간소화한다. Claude HTTP ingress와 daemon notification의 actual wire contract도 검증한다. canonical 전달과 무관한 동작 규칙의 의미는 바꾸지 않는다.
- [x] W2-5 Codex target-facing presentation의 stale `<aiox-channel>` instruction과 이를 pin한 test를 raw canonical envelope JSON 및 daemon notification correlation 기준으로 교체한다. Codex public tool schema는 변경하지 않는다.
- [x] W3 Codex·Claude canonical presentation parity와 Claude `meta` 재도입 필요성의 선택지·영향 범위를 사용자에게 보고하고 결정을 받는다.
- [x] W4 실제 Claude TUI에서 outer `<channel>` 한 겹, canonical JSON body, metadata 전달, 메시지 인식 및 reply 흐름을 검증한다.
- [x] W5 검증된 결과만 Codex·Claude owner 문서·roadmap에 반영하고, W6 전략 검증·결정 이후 G1-B corrective closeout을 판단한다.
- [x] W6 plugin D와 모든 legacy Claude channel fallback을 production code·tests에서 제거하고, Local static MCP(`aiox claude setup` + `aiox mcp-claude`) 단일 경로만 남긴다. npm tarball 검증은 사용자 결정에 따라 release 단계로 이관한다. 제거 결과의 decision·owner docs 반영과 W5 closeout을 진행한다.
- [-] W7 `aiox claude --scope`로 setup scope와 attach·pair runtime scope를 정합시키고, Local/User/Project 선택별 Claude·Codex 협업 검증 계약을 확정·구현한다. — cancelled: W7은 Claude MCP scope 선택만의 독립 작업이 아니다. Claude session의 cwd·workspace·pair agent terminal을 어디서 어떻게 시작할지 정하는 terminal UX(G2) 구현과 함께 설계해야 한다. 따라서 G1-B/W6에서 별도 구현하지 않고 취소한다.
- [x] W8 사용자가 확인한 Claude User-scope cross-cwd MCP 가시성에 맞춰 aiox claude launch gate가 현재 cwd에서 해석된 Local·User·Project 등록을 모두 허용하도록 TDD로 구현·단위 검증한다. Project Pending approval·연결 실패의 gate 의미는 실제 Claude CLI 상태 계약으로 별도 판정해 기록한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 상위 plan은 plans/g1-b-canonical-presentation-corrective.md다. 이 로그는 G1-B의 decided canonical-envelope-cutover 패키지(logs/G1/2026-07-19-G1-B-canonical-envelope-cutover.md)가 이미 확정한 canonical envelope/correlation/opaque public-ID historical core를 재구현하지 않는다. 이 corrective는 Codex·Claude의 target-facing canonical presentation만 소유한다. Claude에서는 공식 Channel contract의 host-owned outer channel body로 canonical JSON을 보내며, Codex에서는 turn/start text input으로 raw canonical JSON을 보낸다. W2에서는 AIOX 수동 inner wrapper와 meta 생성을 제거했고, W2-5에서 Codex stale presentation instruction을 정정한다. W3에서만 Claude meta의 필요성과 최소 transport/routing context를 사용자와 결정한다. daemon ingress authorization·socket validation·canonical type/intent vocabulary 결정과 Telegram/Slack channel 비교는 이 corrective의 통과 조건 밖이며 종료 뒤 별도 논의한다. 착수 검토/통과 조건의 owner는 docs/product/roadmap.md G1-B 섹션(canonical-presentation corrective)이다.
- 각 W 또는 W2 하위 Work Item을 끝낸 뒤, 다음 세션 handoff·활성 pointer 전환을 로그에 기록하기 전에 controller/user에게 확인한 사실, 남은 범위, 다음 작업과 필요한 결정을 먼저 보고한다.

### {W2-1,W2-2,W2-3,W2-4}

- 기준 기록: `2026-07-30 15:59 · W2 착수 전 공식 Channel protocol contract 확인`. W2의 테스트 판정·RED/GREEN 구현은 이 기록의 공식 contract와 판단 기준을 따른다.


### {W2-4}

- W2-4는 현재 사용하지 않는 chatId/origin의 builder 입력·HTTP ingress 전달·builder 호출과 관련 테스트를 producer부터 consumer까지 함께 제거한다. CLAUDE_CHANNEL_INSTRUCTIONS는 canonical envelope 전달·해석과 중복되거나 오래된 수동 wrapper 전제를 정리·간소화하되, collaboration·tool·intent·reply 행동 규칙은 의미를 유지한다. W3에서 실제 TUI/reply 결과를 근거로 meta 필요성을 별도로 결정하며, W2-4는 미래 meta를 위해 dead path를 남기지 않는다.

### {W5}

- 별도 2026-08-02 adapter/canonical-model 정합화 작업의 owner 반영은 W5 closeout에서 유지한다. Claude handler 오류 경로 테스트, canonical MessageType status 제거, daemon reject notification의 replyExpected:false 계약을 code·test·owner docs에 반영했다. raw socket runtime validation은 G1-D trust boundary로 분리하며 이 corrective에 구현하지 않는다.

## 2026-07-29 · corrective 착수 로그 생성

G1-A 완료 후 사용자 결정에 따라 G1-B canonical-presentation corrective를 다음 착수 gate로 확정했다.
`plans/g1-b-canonical-presentation-corrective.md`를 생성하고 이 로그를 그 plan의 Kickoff stage
포인터로 등록했다. 아직 Claude wrapper 구현이나 canonical envelope field에 대한 실제 조사·판정은
수행하지 않았다. W1은 그 조사와 corrective 범위 확정을 위한 착수 상태다.

### 2026-07-29 14:39 · 사용자 승인 · G1-B corrective 실행 순서 확정

사용자는 G1-B canonical-presentation corrective의 실행 순서를 명시했다. W1에서 XML wrapper가 우리 구현에 어떤 변경과 의도로 도입됐는지 Git history 및 실제 consumer 범위로 확인한다. 그 다음 W2에서 wrapper를 제거하고 raw canonical envelope을 직접 전달하도록 `buildChannelNotification`, Claude instructions, 관련 자동 테스트를 함께 변경한다. W2에는 fallback/dual-format을 추가하지 않는다. W3은 자동 테스트와 실제 Claude TUI로 메시지 도착·인식·필드 보존·reply 흐름을 검증한다. W4에서만 검증된 결과를 owner 문서와 roadmap에 반영한다. Telegram/Slack 비교는 이 G1-B corrective의 완료 조건 밖의 후속 discovery로 둔다.

### 2026-07-30 13:27 · W1 완료 · XML wrapper Git history와 consumer 범위 확인

W1 read-only review completed. Git history confirms that `17843e7e` (2026-05-22) introduced `<channel source="…">…</channel>` as AIOX-owned “V1 trusted channel framing”; `4aebda23` then fixed `source` to `aiox`, added XML escaping and tests. The history does not establish XML as a Claude-host-required protocol. Current delivery is canonical JSON → Claude `/send.content` → `buildChannelNotification` XML framing → MCP notification → Claude TUI. W2 must change `buildChannelNotification`, `CLAUDE_CHANNEL_INSTRUCTIONS`, and direct wrapper-expecting tests together. `chat_id` and `origin` remain transport metadata in notification `meta`; W1 found no basis to remove them. Raw JSON host recognition and reply behavior remain unproven until W3 direct Claude TUI evidence.

### 2026-07-30 15:59 · W2 착수 전 공식 채널 protocol contract 확인

사용자가 Claude Code 공식 channel 문서(`code.claude.com/docs/en/channels-reference`)와 로컬 구현을 대조 확인하라고 요청했다. 공식 문서 fetch와 Explore agent의 로컬 코드 조사(`src/adapters/claude/channel-server.ts`)를 함께 수행했다.

핵심 발견(사실):

1. 공식 contract — `notifications/claude/channel`의 `params.content`는 `<channel>` 태그의 순수 body(wrapper 없음)여야 하고, `params.meta`(`Record<string,string>`)는 `<channel>` 태그의 attribute로 자동 변환된다. outer `<channel source="...">...</channel>` 래핑 자체는 Claude Code가 자동 수행하며, `source`는 MCP `Server` 생성자의 `name` 필드에서 온다. 서버가 `content` 안에 `<channel>` 태그를 직접 만들어 넣는 것은 계약 위반이다. 출처: `https://code.claude.com/docs/en/channels-reference` "Notification format"/"Server options" 섹션.
2. 로컬 구현(`src/adapters/claude/channel-server.ts:51-71`, `buildChannelNotification`)은 `input.content`를 `<channel source="aiox" chat_id="..." origin="...">...</channel>` 형태로 직접 wrapping한 문자열을 `params.content`에 넣고, 동일한 `chat_id`/`origin`을 `params.meta`에도 중복으로 넣는다.
3. 1과 2를 대조하면, Claude Code가 이미 wrapped된 `content` 문자열 전체를 자신의 outer `<channel source="aiox" chat_id="..." origin="...">`(meta 기반 attribute 포함)로 다시 감싸게 되어, 코드 구조상 확정적으로 nested/double `<channel>` wrapping이 발생한다. 이는 추론이 아니라 공식 문서 계약과 로컬 코드 구현을 직접 대조해 확인한 사실이다.
4. `CLAUDE_CHANNEL_INSTRUCTIONS`(`channel-server.ts:101`, `Messages arrive as <channel source="aiox" chat_id="..." origin="...">text</channel>.`)도 이 잘못된 이중 구조를 전제로 Claude에게 안내하고 있어 W2에서 함께 수정 대상이다.
5. `docs/architecture/local-runtime-claude-adapter.md:164-165`는 이 wrapper를 "V1 trusted framing... prompt/text framing, not native raw-envelope"이라는 의도적 설계로 서술한다. 이는 지금 확인한 공식 채널 프로토콜 계약(자동 wrapping)과 정합하지 않는 과거 설계 근거로 보이며, W2/W4에서 이 서술도 함께 재검토 대상이다.

남은 미확인 사항: AIOX channel-server의 MCP `Server` 생성자 `name` 필드가 실제로 `'aiox'`로 등록되어 있는지는 이번 조사에서 확인하지 못했다. `source` attribute가 그 `name`에서 자동 도출되므로 W2 구현 전 확인이 필요하다.

사용자는 이 조사 결과를 로그에 기록만 하고, 실제 W2 코드 변경(`buildChannelNotification` wrapper 제거, instructions 수정, 테스트 반영)은 이번 세션에서 진행하지 않고 다음 세션으로 미루기로 결정했다. next pointer는 W2(`buildChannelNotification` 변경) 그대로 유지한다.

### 2026-07-31 14:19 · W2-3 테스트 경계 · 별도 channel negative assertion 미사용

사용자는 W2-3의 RED 테스트에서 `content`에 `"<channel"`이 없다는 별도 negative assertion을 두지 않기로 결정했다. 이유: notification 전체 또는 `params.content`를 canonical envelope JSON 문자열과 정확히 동등 비교(`toEqual`/`toBe`)하면, 수동 inner `<channel>`·prefix/suffix text·XML escaping 등 어떤 추가 framing도 동시에 배제된다. 따라서 `not.toContain("<channel")`은 동일 사실을 중복 검사할 뿐이며, 부분 문자열 검증만 하는 경우에만 보조 assertion으로 의미가 있다. W2-3은 canonical envelope JSON의 정확한 보존과 `meta`의 정확한 transport metadata를 단일 contract assertion으로 검증한다.

### 2026-07-31 15:16 · W2-1 완료 · wrapper 테스트 contract 대조 수용

W2-1 read-only audit confirmed that the wrapper-focused test in `tests/unit/adapters/claude-channel.test.ts` treats AIOX manual inner `<channel>` creation as the expected behavior. The assertion does not cover Claude Code host mapping and conflicts with the official Channel contract. The actual MCP server name is `aiox-claude-${agentName}`, so the host-generated outer `source` is not the inner hard-coded `aiox`. User accepted the audit result and authorized W2-2: remove or replace only the obsolete wrapper-focused test; retain unrelated ingress, error, reply, optional-meta, and outer-channel instruction tests. W2-3 will establish the replacement raw-canonical-content RED contract, with no meta until W3 decides it.

### 2026-07-31 15:57 · W2-2 완료 · obsolete wrapper 테스트 삭제 및 legacy residue 대조

W2-2 review accepted. The only contract-obsolete test was the wrapper-focused `buildChannelNotification` case, and it was removed. Independent ingress, error, reply, launcher, and outer-channel instruction tests contain no manual-inner-wrapper assertion and remain. A read-only residue audit found no further W2-2 deletion candidate. Manual wrapper construction, XML escape helpers, hard-coded inner `source="aiox"`, and wrapper-specific instruction wording remain W2-4 implementation cleanup; chatId/origin transport fields and their daemon/injector paths remain pending the W3 meta decision. Focused test execution was bounded by three sandbox loopback-bind `EPERM` failures unrelated to the deleted test.

### 2026-07-31 16:04 · W2-3 완료 · canonical JSON only RED 및 W2-2 meta 표현 정정

W2-3 RED test was accepted. It invokes buildChannelNotification with a realistic canonical envelope plus chatId/origin inputs and expects exactly method notifications/claude/channel with params containing only content canonicalEnvelope. There is no meta and no separate negative channel assertion. Exact equality already excludes inner wrapper, additional framing, and XML escaping. The named focused test was independently reproduced as RED because the current implementation returns a manual inner wrapper and meta. git diff --check passes. Correction to the W2-2 record: the prior retention of the optional-meta test is superseded by the later user decision. W2 intentionally emits no meta. W3 alone decides whether any metadata is reintroduced.

### 2026-07-31 16:15 · W2-4 범위 정정 · meta 경로 제거와 canonical instructions 정리

User expanded W2-4 scope. Because this corrective owns Claude canonical presentation as received and interpreted by the Claude channel, W2-4 removes the currently unused chatId/origin meta path from its producer through consumer rather than retaining a future-use path. It also simplifies CLAUDE_CHANNEL_INSTRUCTIONS where canonical-envelope delivery or interpretation has duplicate or obsolete manual-wrapper framing, while preserving the meaning of collaboration, tool, intent, and reply rules. Any future metadata is a new W3 decision and must be reintroduced only with its own evidence and TDD. W2-4 remains active pending a read-only implementation readiness check.

### 2026-07-31 16:18 · W2-4 실행 위임 · end-to-end meta 제거와 canonical instructions 정리

W2-4 implementation is now delegated after the readiness check. The approved behavioral target is end-to-end removal of the unused `chatId`/`origin` metadata path: daemon producer, injector HTTP payload, channel-server input/schema/builder call, and related expectations. The canonical-envelope payload remains the exact `params.content` JSON body with no `meta`. Instruction cleanup is limited to canonical delivery/interpretation and obsolete manual-wrapper assumptions; collaboration, tool, intent, and reply rules retain their meaning. The executor must use RED→GREEN: first make the upstream no-meta contract fail, then implement the smallest producer-to-consumer removal, and report focused tests/typecheck plus any scope deviation. Controller review and user report are required before the Work Item is marked complete or the active pointer advances.

### 2026-07-31 19:11 · W2-4 review finding · intent model and daemon notification injection trace

Read-only trace found an implementation/spec distinction relevant to W2-4 review. `src/core/messages.ts` defines agent-authored intents as delegation/discussion/clarification/result/conclusion and `MessageIntent` adds only daemon-authored notification; `status` is a message `type`, not an implemented intent. This differs from the current lifecycle spec wording that lists status under intent, so no conclusion is recorded about the owner correction yet. The generic delivery dispatcher selects the target adapter by agent kind and passes both Claude and Codex targets through the shared `formatAioxChannelEnvelope`. The daemon-created reject outcome is type event / intent notification and has direct tests for delivery to an original Claude source and original Codex source; both assert the canonical envelope notification with outcomeForDeliveryId and no inReplyToDeliveryId. No daemon-produced status-intent injection path was found. W2-4 remains active; this is a review finding, not a scope expansion or pointer change.

### 2026-08-02 15:22 · W2-4 follow-up · canonical fixture, received notification instruction, adapter schema audit

User directed three follow-ups before W2-4 acceptance: (1) correct the canonical-envelope test fixture to the implemented canonical enums, (2) add received daemon notification interpretation to CLAUDE_CHANNEL_INSTRUCTIONS, and (3) independently review adapter type/intent schema definitions and their ingress/daemon implementations for cross-adapter contract defects. The first two remain within W2-4 canonical presentation and must retain RED→GREEN evidence; the third is read-only discovery and must distinguish code facts, spec drift, and recommendations. No Work Item status or pointer changes occur until controller review and user report.

### 2026-08-02 15:27 · broadened review request · Codex type, daemon contract, adapter and test matrix

User requested a renewed, broader read-only audit before any daemon/adapter contract change. The audit must examine whether Codex MCP send type schema, daemon input contracts, outbound canonical-envelope contracts, Claude/Codex adapter implementations, and corresponding tests need deletion, modification, refresh, or addition. It must not assume the earlier MCP-versus-socket finding determines the solution. Candidate findings require exact code/test evidence and separation of implemented fact, test gap, documentation drift, and recommendation. W2-4 remains active; no code/status/pointer change is authorized by this audit request.

### 2026-08-02 15:48 · synthesis review · W2-4 presentation gaps versus separate adapter and daemon-contract work

Broadened independent reviews and external Claude Code review agree on the following. Codex and Claude public send schemas intentionally permit only question/instruction; reply and daemon notification types are producer-authority concerns, so Codex `send.type` must not be widened. A stale Codex instruction/test still claims `<aiox-channel ...>` although the Codex target receives raw canonical JSON via turn/start; this is the same presentation defect class but outside the current plan’s explicitly Claude-scoped W2-4. Direct W2-4 validation gaps remain: actual Claude HTTP /send to MCP notification wire assertion, and daemon notification to Claude through that path. Separate findings: public MCP schemas lack exhaustive rejection coverage for non-agent types; Claude handler error-result mapping has less direct coverage than Codex; daemon raw socket/API bypasses adapter schemas and permits optional/unchecked values; lifecycle spec conflicts with implementation on status-as-intent and notification replyExpected null. Owner-document XML/meta drift remains deferred to W5 after TUI validation. No scope expansion, code change, status change, or pointer change is made by this review record.

### 2026-08-02 16:03 · plan scope expansion · Codex·Claude canonical presentation and pending W2-5

User authorized the plan identity expansion from Claude-only wrapper framing to Codex·Claude target-facing canonical presentation. The plan and this log now explicitly include Codex raw canonical JSON presentation; a pending W2-5 owns only stale Codex instruction/test replacement and daemon notification correlation interpretation, with Codex public tool schema explicitly unchanged. W2-4 retains active ownership of Claude implementation plus actual HTTP ingress and daemon-notification wire verification. Daemon ingress authorization·socket validation·canonical type/intent vocabulary and external channels remain out of scope until this corrective work is finished and the user reopens that discussion. W2-5 may be delegated as a candidate implementation without changing the single active W2-4 pointer; controller review and user report remain required before any state transition.

### 2026-08-02 16:22 · W2-4 완료 · wire-level 검증 추가, W2-5로 pointer 전환

독립 subagent read-only 검토(사실 확인, 파일:라인 근거)에서 W2-4 승인 target 6개 중 5개(수동 inner wrapper·XML escape 제거 및 canonical content 무변형 전달, chatId/origin producer-to-consumer end-to-end 제거, CLAUDE_CHANNEL_INSTRUCTIONS 정리 및 collaboration/tool/intent/reply 규칙 의미 보존, 2026-08-02 15:22 follow-up의 canonical enum fixture 정정, notification 해석 안내와 실제 daemon 필드명 일치)는 완료로 확인됐다. 나머지 1개, W2-4 원문의 "Claude HTTP ingress와 daemon notification의 actual wire contract도 검증한다"는 미구현으로 확인됐다(`startClaudeChannelHttpIngress` 테스트가 포트 처리만 검증하고 `fakeMcpServer`의 `notification`이 호출 인자를 기록하지 않는 no-op이었음). 같은 검토에서 W2-5 범위(Codex stale `<aiox-channel>` instruction 교체)에 해당하는 코드(`src/adapters/codex/mcp-server.ts`, `tests/unit/adapters/codex-mcp-server.test.ts`)가 로그 체크박스는 미착수(`[ ]`)임에도 이미 uncommitted diff로 존재한다는 상태 불일치도 함께 발견됐다.

사용자는 미완료 항목을 이관하지 않고 지금 구현해 W2-4 정의대로 완료 처리하기로 결정했다. 위임받은 구현 subagent가 `fakeMcpServer`(`tests/unit/adapters/claude-channel.test.ts`)에 notification 호출 인자 기록을 추가하고, 실제 HTTP POST → `mcp.server.notification()` 호출까지의 배선을 검증하는 새 테스트(`tests/unit/adapters/claude-channel.test.ts:754-788`)를 `startClaudeChannelHttpIngress` describe 블록에 추가했다. 이 테스트는 최초 실행부터 PASS했다 — 즉 `startClaudeChannelHttpIngress`/`buildChannelNotification` 구현 자체에는 결함이 없었고, 검증 공백만 있었다. 지정된 4개 관련 테스트 파일(`claude-channel`, `claude-injector`, `codex-mcp-server`, `codex-ingress`) 145/145 PASS, `tsc --noEmit` 에러 0, `tests/unit/adapters/` 전체 190/190 PASS를 각각 독립 실행으로 재확인했다. 이로써 W2-4 승인 target 6개 전부가 완료됐다.

W2-4 완료에 따라 W2-5로 active pointer를 전환한다. W2-5 착수 시 위에서 발견한 대로 Codex 쪽 stale instruction 교체 코드가 이미 uncommitted diff에 존재한다는 사실을 출발점으로 삼아야 하며, 이를 새로 작성하는 대신 검증(RED→GREEN 근거, daemon notification correlation 해석의 정확성, Codex public tool schema 불변 여부)부터 시작한다.

세션 중 별도로, `docs/product/roadmap.md`에 이 corrective와 무관한 daemon socket/API trust classification 관련 항목이 uncommitted로 추가되어 있는 것을 발견해 스코프 침범으로 의심했으나, 사용자가 이는 별도로 작업 중인 Codex 에이전트의 변경임을 확인해 주었다. 이 corrective의 작업 대상이 아니므로 그대로 두었고, 코드/로그 변경 없음.

### 2026-08-02 16:51 · W2-5 완료 · Codex canonical presentation 검증 확정

W2-5 대상 코드(`src/adapters/codex/mcp-server.ts`의 `CODEX_INGRESS_INSTRUCTIONS`, `tests/unit/adapters/codex-mcp-server.test.ts`)는 이미 uncommitted diff로 작성되어 있었으며, 이번 작업은 그 기존 코드가 W2-5 완료 조건을 충족하는지 확인하고 부족한 부분을 마저 구현하는 것이었다. 위임받은 구현 subagent가 확인·재실행한 결과를 controller가 각 항목마다 파일:라인을 직접 다시 읽어 독립 재검증했다.

확인된 사실: (1) stale `Messages arrive as <aiox-channel source="..." message_id="...">text</aiox-channel>.` 문구가 raw canonical AIOX envelope JSON 수신 안내와 `intent: "notification"`/`outcomeForDeliveryId` correlation 규칙으로 교체됨(`mcp-server.ts:24-26`, 직접 Read로 확인). (2) Claude(`state.ts:1819`)와 Codex(`state.ts:2012`)가 동일한 `formatAioxChannelEnvelope`(`state.ts:2305-2337`)를 공유하며, `intent`·`outcomeForDeliveryId`·`inReplyToDeliveryId` 생성 조건을 직접 확인. (3) `tests/unit/daemon/codex-ingress.test.ts:2329-2377`의 기존 테스트("dispatches one committed reject notification to the original Codex source without a reverse route")가 실제 Codex turn/start raw JSON에서 `intent: "notification"`, `outcomeForDeliveryId: expect.any(String)`, `inReplyToDeliveryId` 없음을 이미 검증하고 있어 instructions 문구와 실제 daemon 출력 필드가 일치함을 뒷받침. (4) `git diff -- src/adapters/codex/mcp-server.ts`를 라인 단위로 재확인한 결과 변경분은 instructions 문자열 3줄뿐이며, `typedSendInputSchema`/`typedReplyInputSchema`(Codex public tool schema)는 diff에 없음 — public tool schema 불변 확인. (5) 저장소 전체 `grep -rn "aiox-channel"` 재실행 결과 잔존 매치는 전부 `aiox-channel-ingress`(marketplace plugin 이름)뿐이며 stale wrapper를 assert하는 테스트는 없음. (6) `npx vitest run tests/unit/adapters/codex-mcp-server.test.ts tests/unit/daemon/codex-ingress.test.ts` 독립 재실행 101/101 PASS, `npx tsc --noEmit` 에러 0을 controller가 직접 재실행해 확인.

불확실 사항으로 남긴 것: 이 코드가 실제 RED→GREEN 절차를 거쳐 작성됐는지는 uncommitted 상태라 커밋 이력으로 검증할 수 없으며, 현재 시점에 GREEN이라는 사실만 확인됐다.

사용자는 이 검증 결과를 근거로 W2-5를 완료로 기록하도록 확정했다. W2-4·W2-5 모두 완료됨에 따라 다음 미완료 Work Item은 W3(Codex·Claude canonical presentation parity와 Claude `meta` 재도입 필요성을 사용자에게 보고하고 결정을 받는 항목)이지만, 사용자 지시에 따라 이번 세션에서는 pointer를 W3로 전환하거나 착수하지 않고 대기한다.

## 2026-08-02 · 2026-08-02 17:00 · W5 scope · 별도 canonical model 및 owner-document 정합화

이 기록은 현재 canonical-presentation corrective의 W2-W4 실행과 별도로, 사용자가 2026-08-02 논의 뒤 승인한 canonical model·adapter test·owner-document 정합화다. Work Item 상태나 active pointer는 바꾸지 않으며, W5 closeout에서 이 owner 반영을 함께 검토한다.

1. 사용자는 public send.type의 question/instruction 외 전수 거절 회귀 테스트는 추가하지 않기로 결정했다. 기존 Codex/Claude Zod schema가 이미 이를 막고 있으며, 별도 파일 변경은 없다.

2. 사용자는 Claude와 Codex의 즉시 daemon-reject handler 의미를 대칭 검증하도록 결정했다. 프로덕션 handler는 이미 같은 reason-to-errorResult 및 throw-to-daemon_call_failed 동작을 가졌으므로 tests/unit/adapters/claude-channel.test.ts의 Claude MCP handler tests에 send reject, reply의 unknown_delivery/correlation_mismatch/reply_not_expected/duplicate_reply, daemon_call_failed 검증만 추가했다. 이 결정은 반환 reason/isError 의미의 대칭이며 두 adapter의 오류 문구를 byte-for-byte 통일하는 요구는 아니다.

3. 사용자는 producer·전용 routing/FSM/rendering 의미가 없는 canonical MessageType status를 제거하기로 결정했다. src/core/messages.ts의 messageTypes에서 status를 제거했고 tests/unit/core/messages.test.ts의 enum 기대값을 갱신했다. stale reserved-intent test도 tests/fixtures/aiox-message-lifecycle-contract.ts 및 tests/unit/adapters/claude-channel.test.ts에서 intent:status 대신 실제 유일 reserved intent인 intent:notification을 거절하도록 정정했다. owner 반영은 docs/specs/aiox-message-lifecycle.md의 type/intent 표와 authoring surface, docs/specs/aiox-a2a.md glossary, docs/architecture/local-runtime-routing-and-delivery.md 및 docs/architecture/local-runtime-store-and-repositories.md의 as-built type 목록에 적용했다. raw Unix socket의 generic sendMessage params runtime validation 부재는 status 제거와 별개의 G1-D trust-boundary gap으로 남긴다.

4. 사용자는 daemon explicit-reject outcome notification의 replyExpected를 null이 아니라 false로 명시하기로 결정했다. src/daemon/state.ts의 notification message 생성에 replyExpected:false를 두었고, tests/unit/daemon/codex-ingress.test.ts에서 DB reply_expected=0, target canonical envelope replyExpected:false, reply_right 부재를 검증했다. protocol owner docs/specs/aiox-message-lifecycle.md에는 type:event notification이 outcomeForDeliveryId 및 replyExpected:false를 갖고 reply right를 만들지 않는다고 반영했다.

검증 사실: 관련 core/Claude/daemon 테스트 114개 PASS, Codex MCP fixture consumer 34개 PASS, pnpm typecheck 및 git diff --check PASS. 문서-코드 독립 검토에서 reserved notification fixture stale 항목을 추가로 발견해 위 3번에서 정정했다. 검토는 raw socket runtime validation을 이번 workstream에서 변경하지 않았음을 확인했다.

### 2026-08-02 17:17 · 2026-08-02 17:12 · W5 scope · reserved-intent error-model spec 정정

Claude의 독립 read-only review는 2·3·4를 bounded PASS로 판정했다. review가 발견한 실제 owner-document drift는 docs/specs/aiox-message-lifecycle.md가 public agent input schema가 notification을 enum 단계에서 막는 현재 구현과 달리, 존재하지 않는 reserved_intent_not_allowed error code를 주장한 점이다.

사용자는 이 finding을 반영하기로 결정했다. lifecycle spec의 intent authoring surface는 public agent send/reply input schema가 notification을 daemon message 생성 전에 거절한다고 정정했고, Baseline error model 목록에서도 reserved_intent_not_allowed를 제거했다. runtime guard나 raw socket validation은 추가하지 않았다. raw Unix socket generic sendMessage의 unvalidated params는 roadmap G1-D trust-boundary owner에 남는다.

검증: repository-wide reserved_intent_not_allowed 검색은 0건이고, pnpm typecheck 및 git diff --check가 통과했다.

## 2026-08-02 · 2026-08-02 17:20 · W5 scope · reserved-intent 검색 범위 정정

정정: 직전 entry의 “repository-wide 0건”은 이 로그에 남긴 finding provenance 문자열까지 제외한다는 뜻이었으나 표현이 부정확했다. 정확한 사실은 src, docs, tests 범위에서 reserved_intent_not_allowed 검색 결과가 0건이라는 것이다. 로그의 historical finding 문구는 provenance로 유지한다.

### 2026-08-02 17:25 · W3 evidence · Claude meta official-doc recheck and reply-correlation correction

Claude 공식 Channels reference의 2026-08-02 재확인 결과: `content`는 host-owned `<channel>`의 body가 되고, optional `meta`의 각 key/value는 tag attribute가 된다. 문서는 routing context의 예로 chat ID, sender name, alert severity를 든다. key는 letters/digits/underscores만 허용하며 위반 key는 silent drop된다. 현재 Claude adapter는 `params.content`만 canonical envelope JSON으로 내보내고 meta는 없으며, Codex도 raw canonical JSON만 전달한다. 따라서 W3의 no-meta 선택지는 body의 canonical correlation/routing 필드를 단일 source로 유지한다는 근거를 갖는다. 단, 문서의 `for routing context like ...`는 meta의 유일한 용도가 correlation ID echo라고 한정하지 않으며, 문서에 host 특수 처리 설명이 없다는 사실도 그러한 처리가 없다는 증명은 아니다. 또한 daemon notification은 `replyExpected:false`이고 reply right를 만들지 않으므로 `outcomeForDeliveryId`는 알림이 보고하는 원 delivery를 식별할 뿐 `reply(inReplyToDeliveryId=...)` 대상으로 쓰이지 않는다. W3 decision은 아직 받지 않았고 W4 실제 TUI 검증 필요성도 유지된다.

### 2026-08-02 17:40 · W3 결정 · Claude meta 미재도입 확정, parity 근거 정리

Claude가 위 17:25 entry의 세 정정을 독립 검증했다. (1) meta의 문서화된 용도가 correlation echo 하나로 한정되지 않는다는 정정, (2) 문서의 host 특수 처리 미서술이 그 부재의 증명은 아니라는 정정, (3) daemon notification(`replyExpected:false`, reply right 미생성)이므로 `outcomeForDeliveryId`가 `reply(inReplyToDeliveryId=...)` 대상이 아니라는 정정 — 세 항목 모두 공식 문서 원문 및 이 로그의 기존 기록(2026-08-02 17:00 · W5 항목4)과 직접 대조해 사실로 확인됐고 반박 지점을 찾지 못했다. (3)은 Claude가 직전 응답에서 두 correlation 필드를 뭉뚱그려 설명한 실제 오류였다.

사용자는 이를 근거로 W3의 meta 재도입 여부를 A(재도입하지 않음)로 결정했다. 근거: AIOX 내부에는 meta가 되돌려줄 별도 chat/session 소비자가 없다(Telegram/Slack 비교는 이 corrective 범위 밖). canonical envelope의 `deliveryId`/`outcomeForDeliveryId`/source·target 필드가 모델 해석과 daemon correlation의 단일 권위이며, meta 재도입은 동일 데이터의 두 번째 경로만 추가해 drift와 silent-drop(비-식별자 key) 위험만 늘린다.

W3의 나머지 하위 항목인 Codex·Claude canonical presentation parity: 두 transport가 동일한 `formatAioxChannelEnvelope` JSON을 payload로 전달하고(Claude는 host-owned outer `<channel>`이 그 JSON을 감싸고, Codex는 turn/start raw text로 wrapper 없이 전달), 모델이 해석하는 correlation·routing 필드가 완전히 동일하다는 의미에서 parity가 성립한다. outer wrapper 유무 차이는 각 host 프로토콜이 구조적으로 강제하는 것이고, plan의 completion condition이 명시한 대로 이 검증은 UI pixel/card parity를 요구하지 않으므로 결함이 아니다.

불확실 사항: 이 결정은 문서·코드 근거로 내려졌고, 실제 Claude TUI에서 no-meta 전달이 host surface(outer `<channel>` 한 겹 + canonical JSON body)로 그대로 관찰되는지는 아직 실물 검증되지 않았다(W4 완료 조건 유지).

W3 Work Item 상태 전환(`[x]`)과 active pointer의 W4 전환은 아직 하지 않는다. 사용자 확인 후 다음 세션에서 반영한다.

## 2026-08-02 · 2026-08-02 17:48 · W4 preparation · instruction-review findings before Claude TUI reproduction

CLAUDE_CHANNEL_INSTRUCTIONS와 CODEX_INGRESS_INSTRUCTIONS를 현재 code/spec으로 독립 대조했다. (1) Claude Ending a Thread의 `After sending a conclusion, do not call any aiox tool again for that delivery.`는 같은 Claude instruction의 active `thread`와 Codex의 `thread` 표현에 모순되는 실제 prose drift다. (2) Claude server constructor는 name을 `aiox-claude-${agentName}`으로 주고 공식 Channel contract는 이를 outer tag `source`로 자동 매핑한다. envelope body의 `source.address`는 canonical message 발신 identity이므로 의미가 다르다. instruction은 이 구분을 아직 설명하지 않는다. 이것은 모델 오독 가능성이라는 가설이며 TUI 화면만으로는 검증되지 않는다. (3) notification은 `replyExpected:false`로 reply right를 만들지 않고 `outcomeForDeliveryId`는 보고 대상 delivery 식별자이므로, `correlate` 문구에 `do not use reply for it`을 덧붙이는 것은 contract와 정합한다. 실제 변경은 아직 사용자 승인 전이다. 변경한다면 Claude만의 수정이 아니라 target host 형식 차이를 제외한 semantic parity를 위해 Codex notification 문구도 동일하게 명료화하고, Claude source 구분/Ending Thread 및 Codex notification 문구를 각각 회귀 test로 pin해야 한다.

### 2026-08-02 17:43 · instruction-review reassessment · shared vocabulary and example mapping

Claude의 재검토를 수용한다. thread와 delivery는 두 adapter 모두에서 shared host-agnostic 용어로 각각 사용되며, Claude Ending a Thread 한 줄만 delivery로 이탈한다. 이는 adapter 차이가 아니라 editing drift이고 conclusion 뒤 행동 제약을 실질적으로 약화한다. Codex의 Good example은 review 요청을 intent: delegation 및 content.text 형태로 연결하지만 Claude example은 이를 생략한다. schema 충족 여부와 별개로 Typed Message Intent의 review-to-delegation 매핑을 실제 호출 예시에 연결하는 instruction gap이므로 Claude에도 라벨을 추가할 근거가 있다. outer-tag 문구는 connection보다 host contract와 code에 맞는 channel server가 정확하다: The outer channel source attribute identifies this channel server, not the message sender. The envelope source.address field is the actual sender; always read sender identity from the JSON body, never from the outer tag. 이 Claude-only wording은 outer tag가 없는 Codex와의 semantic parity를 깨지 않는다. 사용자 승인 전이므로 코드와 테스트는 아직 변경하지 않았다.

## 2026-08-02 · 2026-08-02 17:50 · W3 accepted · instruction corrections reviewed and W4 active

사용자 승인에 따라 delegated implementation의 결과를 controller가 독립 검토했다. 변경은 Claude instruction의 ending-thread wording, labelled delegation example, host-owned outer channel source와 envelope source.address 구별, Claude/Codex notification no-reply-right/correlation 문구 및 이를 pin하는 focused assertions이다. 현재 code를 spec/daemon contract와 다시 대조한 결과 notification은 replyExpected:false이고 reply right를 만들지 않으며, outer source는 channel server name에서 유래하고 body source.address가 canonical sender라는 설명이 정확하다. 구현 subagent의 RED evidence는 변경 전 instruction assertions 2개 실패였고, controller 재실행에서는 pnpm exec vitest run tests/unit/adapters/claude-channel.test.ts tests/unit/adapters/codex-mcp-server.test.ts가 78/78 PASS, pnpm typecheck PASS, git diff --check PASS였다. 범위 밖 파일 변경이나 public schema 변경은 이 hunk에서 확인되지 않았다. W3는 meta 미재도입/parity 결정을 이미 기록한 상태로 완료됐고, 검증된 instruction correction까지 수용했으므로 [x]를 유지한다. 현재 active W4는 실제 Claude TUI에서 outer wrapper 한 겹, canonical JSON body, no-meta, sender/correlation 해석과 reply flow를 검증한다.

### 2026-08-02 19:06 · W4 완료 · 실제 Claude TUI 재현 검증 및 재현 과정에서 발견한 인프라 결함 2건

사용자와 함께 실제 daemon + Claude/Codex TUI를 기동해 W4를 재현 검증했다. 재현 과정에서 이 corrective와 무관한 두 가지 인프라 결함을 발견해 우회 수정했다.

발견 1: Claude plugin marketplace 등록이 stale path였다. `~/.claude/plugins/known_marketplaces.json`의 `aiox` 항목이 `spike/aiox-channel-marketplace`(2026-05-31 등록, `spike`→`spikes` rename 커밋 `d03ac24` 2026-06-20 이전)를 가리켜 `claude plugin list`가 `Marketplace aiox failed to load: cache-miss`를 냈다. `pnpm dev claude-plugin setup`(`src/adapters/claude/setup.ts:100,112`)의 idempotency 체크는 marketplace 이름/plugin enabled 여부만 보고 `errors` 필드나 경로 유효성은 보지 않아 이 상태를 스스로 감지·복구하지 못했다. `claude plugin marketplace remove aiox` 후 `pnpm dev claude-plugin setup` 재실행으로 올바른 `spikes/aiox-channel-marketplace` 경로에 재등록해 우회했다.

발견 2: plugin bundle이 stale이었다. `spikes/aiox-channel-marketplace/plugins/aiox-channel-ingress/channel-server.js`(esbuild 산출물)와 설치된 `~/.claude/plugins/cache/aiox/aiox-channel-ingress/0.1.0/channel-server.js`가 바이트 단위로 동일했고 둘 다 mtime이 2026-06-20 20:29였다 — 이 corrective(W1 착수 2026-07-29)보다 이전 빌드였다. 실제로 grep한 결과 구버전 번들에 `chat_id`/`source="aiox"` 수동 wrapper 흔적이 17건 남아 있었다. `spikes/aiox-channel-marketplace/build-plugin.sh`(현재 `src/adapters/claude/channel-server.ts`를 재번들링)를 실행해도 `claude plugin update aiox-channel-ingress@aiox`는 "already at the latest version (0.1.0)"만 반환하고 캐시를 갱신하지 않았다 — plugin.json의 버전 문자열만 비교하고 내용 해시는 안 보기 때문으로 판단된다. `claude plugin uninstall` 후 `pnpm dev claude-plugin setup` 재설치로 캐시를 새 번들(945404 bytes, mtime 갱신, stale 마커 0건)로 교체해 우회했다.

부가로, 기존에 떠 있던 daemon이 2026-07-19 시작된 13일 된 프로세스였다(tsx 장기 실행 — 이번 corrective의 모든 uncommitted 소스 변경을 반영하지 못함). `pnpm dev daemon restart`로 재기동해 현재 소스를 반영시켰다.

두 결함을 우회 수정한 뒤 daemon pair(`g1b-w4-smoke`)를 재구성하고 사용자가 실제 터미널에서 `pnpm dev claude --name claude-smoke --pair g1b-w4-smoke`, `pnpm dev codex --name codex-smoke --pair g1b-w4-smoke`로 attach했다. Codex의 `send` 툴 호출로 canonical envelope 메시지를 전달하고 Claude TUI 화면을 사용자가 직접 관찰해 보고했다.

확인된 사실(사용자가 실제 TUI 화면에서 직접 관찰해 보고): (1) outer `<channel source="plugin:aiox-channel-ingress:aiox-claude-ingress">` 래핑이 한 겹만 존재하고 중첩이 없다. (2) body가 canonical envelope JSON(`protocol":"aiox.message.v1"` 등) 그대로이고 adapter-owned 수동 wrapper·legacy meta가 없다. (3) Claude가 발신자를 outer tag가 아니라 body의 `source.address`(`agent://local/dev/codex-smoke`)에서 정확히 읽었다. (4) `replyExpected:true` 메시지에 대해 Claude가 `reply` 툴을 호출했고 daemon이 정상 전달했다.

daemon 쪽 독립 corroboration: `pnpm dev status` 재확인 결과 `messages=3 delivered=3 failed=0 unconfirmed=0` — 이는 Claude 자기 보고가 아니라 daemon 자체 delivery 집계다.

이로써 W4 completion condition(outer wrapping 한 겹, canonical JSON body, metadata 전달, 메시지 인식, reply 흐름)이 실물 근거로 충족됐다고 판단한다. 발견한 두 인프라 결함(marketplace stale-path 미검출, plugin bundle staleness)은 이 corrective의 canonical presentation 범위 밖이므로 별도 독립 로그로 옮긴다.

### 2026-08-02 · Claude plugin marketplace 책임 재확인

사용자가 `spikes/aiox-channel-marketplace/`의 성격을 재질문해 code·manifest·decision을 재대조했다. 앞서 “검증용 spike라 production과 무관”으로 설명한 것은 정정한다. 확인 사실: (1) `resolveClaudeChannelMarketplacePath()`의 기본 경로는 이 디렉터리이며, `aiox claude-plugin setup`이 그 경로를 Claude marketplace로 등록한다. (2) 기본 전략 D(plugin)는 그 marketplace의 `aiox-channel-ingress`를 활성화하고, `.mcp.json`은 번들된 `channel-server.js`를 실행한다. (3) 공식 decision은 D를 기본 활성화 전략, inline A를 dev/debug opt-out으로 정한다. 따라서 현재 checkout에서 이 디렉터리는 “검증만 하고 버려도 되는 spike”가 아니라 default Claude adapter를 실제로 실행시키는 배포 패키지 원천이다. 다만 파일·주석이 R3 spike라는 과거 명칭을 유지하고, invocation 주석은 post-MVP packaging에서 위치를 확정·재배치한다고 명시한다. 결론: `spikes/` 배치는 임시 taxonomy이고 D adapter의 production-level activation artifact라는 두 사실은 양립한다. stale-path/bundle 결함의 직접 원인은 위치가 아니라 setup·cache 갱신 절차다. 위치 정리 여부는 W5 범위가 아닌 별도 packaging/decision 작업으로 다룬다.

## 2026-08-02 · W6 · mcp-claude 기반 Claude MCP 주입 전략 검증

사용자 요청으로 W6를 추가했다. 범위는 plugin D를 즉시 삭제하는 구현이 아니라, Codex와 같은 mcp-claude hidden CLI 실행 경로가 Claude MCP 주입에서 성립하는지 설계·실측 검증하고 그 결과로 D 및 spikes/aiox-channel-marketplace의 유지·제거를 결정하는 것이다.

확인한 사실: 현재 Claude inline(A)는 --mcp-config로 aiox-claude-ingress MCP 서버를 주입하지만 channel-server 파일 경로를 직접 실행한다. Codex는 현재 AIOX CLI의 mcp-codex 서브커맨드를 -c로 주입한다. mcp-claude는 전자의 실행 대상을 후자와 같은 CLI 진입점으로 바꾸는 제안이다.

검증 조건: dev·build·npm 설치 레이아웃에서 send/수신/reply가 동작하는지, plugin 등록 없이 도구가 보이는지, server: activation의 경고 및 승인 프롬프트가 실제로 어떤지 확인한다. mcp-claude는 실행 경로를 단순화하지만 --dangerously-load-development-channels server:aiox-claude-ingress 활성화 의존 자체를 없애지 않는다는 점을 분리해 기록한다.

W5는 아직 active이며, W6는 W5의 owner 반영 후 재개할 open 항목이다. W6 결과가 나올 때까지 G1-B closeout은 판단하지 않는다.

### 2026-08-02 20:45 · W6 활성화

사용자 지시에 따라 W5의 active pointer를 해제하고 W6를 현재 재개 지점으로 전환했다. W5의 owner-document 반영 및 final closeout 판단은 W6 결과가 나온 뒤 재개한다.

### 2026-08-02 23:54 · 공식 Claude 문서 기반 진단 범위 정정

2026-08-02 공식 Claude Code 문서를 재확인했다. CLI reference는 --mcp-config가 JSON 파일 또는 JSON 문자열에서 MCP server를 로드한다고 명시하고, Channels reference는 bare .mcp.json server를 --dangerously-load-development-channels server:<name>로 시험하는 방식을 명시한다. channel example의 mcpServers entry는 command와 args만으로 충분하며, stdio type 필드는 이 경로의 필수 조건으로 문서화되지 않았다. 따라서 inline 실행의 tools fetch failed는 type:stdio 누락이라는 가설로 고정하지 않는다. Claude 문서는 failed-to-connect의 stderr trace를 세션 debug log에서 확인하라고 안내하므로, 실제 TUI 관찰 뒤 해당 debug log와 MCP initialize/tools/list wire 또는 process stderr를 D 성공 경로와 비교하는 것을 W6의 우선 진단으로 둔다.

### 2026-08-03 00:00 · inline MCP tools fetch failure 수정 · TUI 재검증 대기

구현 subagent와 controller가 원인을 독립 대조했다. `mcp-claude` dispatch는 `runClaudeChannelMcpServer()`를 호출해 stdio MCP transport와 HTTP ingress를 시작한 뒤 반환한다. 그러나 공통 CLI main이 기존에 성공 결과에도 `process.exit(await runAioxCli())`를 호출하여, 반환 직후 MCP process를 강제 종료했다. 이는 direct plugin bundle의 channel-server direct-invocation guard가 Node를 강제 종료하지 않는 경로와 달라 Claude TUI의 connected → tools fetch failed → Not connected 관찰을 설명한다.

행위 수정: src/bin/aiox.ts에 runAioxCliMain을 추가해 nonzero exit만 process.exit로 전파하고 성공(0)은 자연 종료하도록 바꿨다. ordinary CLI는 남은 handle이 없어 자연 종료하며, stdio MCP server는 ingress handle을 유지한다. tests/unit/cli/bin.test.ts에 성공 long-lived command는 강제 exit하지 않고 nonzero command는 exit code를 전파한다는 RED→GREEN lifecycle tests를 추가했다. controller 독립 검증: pnpm exec vitest run tests/unit/cli/bin.test.ts 15/15 PASS, pnpm typecheck PASS, git diff --check PASS. `pnpm test -- tests/...`는 package script가 전체 suite를 실행해 현재 socket/port 계열 환경 실패를 섞으므로 focused result의 대체 근거로 쓰지 않았다.

TUI 재검증은 사용자 관찰이 필요하다. inline 환경변수로 새 Claude process를 실행해 MCP tools, send/reply, stderr/debug trace 및 server activation warning/consent를 확인한다. plugin D/default strategy·marketplace/spikes 및 dead resolver 정리는 이 결과 전까지 변경하지 않는다.

### 2026-08-03 00:04 · inline dev TUI 정상 동작 사용자 확인

사용자가 2026-08-03 현재 inline mcp-claude 경로가 정상 동작한다고 직접 보고했다. 이는 직전 process.exit lifecycle 수정 후 새 Claude TUI process에서 tools fetch failure가 해소되었다는 실물 확인으로 기록한다. 사용자가 이 응답에서 개별 화면 문구, send/reply delivery 집계, warning/consent 여부를 별도로 열거하지 않았으므로 그 세부는 미확인으로 남긴다. W6의 build 및 npm 설치 레이아웃 검증, 기본 전략 변경 여부와 plugin D/marketplace/spikes의 유지·제거 결정은 아직 수행하지 않았으므로 W6 active pointer와 W5 대기는 유지한다.

### 2026-08-03 00:06 · build 레이아웃 실측 준비

사용자 요청에 따라 pnpm dev stop으로 dev-profile daemon을 중지했고 exit 0을 확인했다. 이어 pnpm build(tsc)를 실행해 dist entrypoint를 생성했고 exit 0을 확인했다. 다음 사용자 실측은 build-profile daemon과 별도 pair에서 AIOX_CLAUDE_CHANNEL_STRATEGY=inline pnpm claude를 사용해, dist aiox CLI가 mcp-claude를 Node로 재호출하는 레이아웃을 검증한다. TUI 관찰과 send/reply는 사용자가 수행한다.

### 2026-08-03 00:09 · inline build TUI 정상 동작 사용자 확인

사용자가 build-profile daemon과 pnpm claude/pnpm codex 조합에서 inline mcp-claude 경로가 정상 동작한다고 직접 보고했다. 이는 dist/src/bin/aiox.js를 Node로 재호출하는 build 레이아웃에서도 직전 CLI lifecycle 수정이 MCP tool discovery 및 실행을 막지 않는다는 실물 확인이다. 사용자가 개별 화면 문구, delivery 집계, warning/consent 여부를 별도로 열거하지 않았으므로 그 세부는 미확인으로 남긴다. npm 설치본의 격리 검증과 plugin D/marketplace/spikes의 유지·제거 결정은 아직 남아 있어 W6 pointer를 유지한다.

### 2026-08-03 00:13 · plugin D와 inline A의 Claude TUI 표면 비교

사용자가 같은 Claude TUI surface의 두 startup 표시를 직접 관찰했다. plugin D에서는 Channels notice가 `plugin:aiox-channel-ingress@aiox`를 activation entry로 표시하고, MCP 목록은 `plugin:aiox-channel-ingress:aiox-claude-ing...`가 connected 및 2 tools로 표시된다. inline A(mcp-claude)에서는 Channels notice가 `server:aiox-claude-ingress`를 activation entry로 표시하며, 그 아래에 `server:aiox-claude-ingress · no MCP server configured with that name` startup warning이 보이지만, MCP 목록의 `aiox-claude-ingress`는 connected 및 2 tools다. 따라서 warning은 MCP process/tool discovery 실패가 아니라 server: development-channel activation name lookup surface의 별도 경고이며, inline MCP 자체는 연결·도구 2개로 정상임을 사용자 관찰이 뒷받침한다.

### 2026-08-03 00:14 · inline server activation warning 제거 후보

사용자는 inline A의 `server:aiox-claude-ingress · no MCP server configured with that name` startup warning 제거를 요구한다. 확인 사실: inline MCP 목록은 같은 이름으로 connected 및 2 tools라서 `--mcp-config`가 process/tool discovery에는 성공한다. 그러나 channel activation notice는 server: lookup에서 warning을 낸다. plugin D의 plugin: activation은 warning이 없다. 공식 Channels 문서는 bare channel 시험에 project .mcp.json에 server를 등록한 뒤 server:<name>을 쓰는 방식을 보이며, CLI reference는 --mcp-config JSON string도 지원한다고만 명시한다.

추론: channel activation name lookup과 one-shot --mcp-config loader가 서로 다른 inventory/시점으로 동작해, ephemeral config를 server: resolver가 발견하지 못하는 것으로 보인다. 아직 direct trace나 file-config 실측으로 확정하지 않았다.

후보: (A) plugin D를 유지하면 현재 warning-free(확인됨). (B) inline을 유지하면서 Claude가 server inventory로 인식하는 static project/user MCP config(.mcp.json 또는 claude mcp registration)를 쓰고, session별 AIOX agent token/socket은 launcher가 child env로 공급하도록 바꾸는 방법을 별도 실험한다. 이 방법은 dynamic env·config merge와 user/project persistent state UX를 검증해야 하며 아직 구현·검증하지 않았다. 단순 type:stdio 추가나 warning 숨김은 근거 없는 해결책으로 채택하지 않는다.

### 2026-08-03 00:31 · 정적 MCP 등록을 통한 server activation warning 제거 실측 계획

Claude Code 공식 문서 재조사 결과를 사용자가 공유했다. 확인 사실: CLI reference는 --mcp-config가 JSON 파일·문자열에서 MCP를 로드한다고, Channels reference는 channel 시험에서 project .mcp.json 등록 뒤 server:<name> activation을 사용한다고 설명한다. .mcp.json은 env 값에서 ${VAR} 확장과 MCP child process로의 env 전달을 지원한다. 따라서 정적 MCP 정의와 매 세션 agent/token/socket 주입을 분리하는 후보는 공식 기능만으로 구성 가능하다.

정정: --mcp-config가 server: activation lookup inventory에서 제외된다는 직접 문서화와 AIOX의 정확한 warning 문구 원인은 아직 확인되지 않았다. GitHub Issue #71792은 inbound channel notification 드롭이라는 다른 증상이므로 이 warning의 원인 근거로 쓰지 않는다. Local/User scope가 server: lookup을 통과하는지도 미실측이다.

다음 W6 행동: plugin D를 변경하지 않고, 가장 작은 격리 실험으로 Claude Local scope에 aiox-claude-ingress의 static MCP 정의와 ${AIOX_*} env 참조를 등록한 뒤 aiox claude가 세션 환경값을 공급하여 실행한다. 사용자가 Claude TUI에서 (1) server: warning 유무, (2) MCP connected·2 tools, (3) Codex send 수신과 Claude reply delivery, (4) 최초 승인/추가 UX를 직접 확인한다. 이 실험이 통과하기 전에는 --mcp-config 제거·기본 전략 변경·plugin D/spikes 제거를 결정하지 않는다.

### 2026-08-03 13:32 · W6 실험 중 CLI lifecycle 회귀 및 static tsx PATH 의존 후보

새 W6 구현 직후 pnpm dev status와 pnpm dev daemon start가 장시간 종료되지 않고 pnpm dev stop은 빠르다는 관찰이 보고됐다. 코드 대조 사실: src/bin/aiox.ts의 최근 runAioxCliMain 변경은 성공 exitCode에서 process.exit를 호출하지 않도록 바뀌었다. src/cli/invocation.ts의 status branch는 runtime.getDaemonApi()가 만든 persistent socket client로 api.status()를 호출하지만 close하지 않는다. 반면 createClientRuntime.stopDaemon과 daemonStatus는 finally에서 client.close()를 호출한다. 따라서 status의 열린 socket handle이 강제 종료 제거 뒤 CLI event loop를 붙잡는다는 설명은 코드상 강하게 뒷받침되지만, 아직 handle trace/재현으로 확정하지 않았다.

inline-static의 tools fetch failed에 대한 추가 확인 사실: Local MCP 등록은 command에 executable tsx/dist/cli.mjs를 직접 넣었고, 해당 파일은 executable이지만 첫 줄이 #!/usr/bin/env node다. 즉 MCP child env가 PATH를 보존하지 않으면 tsx CLI 자체가 node를 찾지 못한다. 기존 정상 inline builder는 이 PATH 의존을 피하려고 absolute Node binary를 command로, absolute tsx CLI를 첫 args로 사용한다. 정적 등록도 동일한 command/args 형태로 맞춰 TUI 재현 전에 비교해야 한다. Local-scope env merge 동작은 여전히 미확인이다.

### 2026-08-03 13:38 · CLI lifecycle 회귀 수정 및 inline-static Node 실행 정의 준비

W6 작업에서 두 독립 결함을 수정했다. CLI lifecycle: runAioxCli는 invokeParsedCommand가 끝날 때 runtime.dispose를 호출하고, production createClientRuntime은 자신이 생성한 persistent daemon socket clients를 추적·close한다. 이로써 mcp-claude의 stdio lifecycle은 유지하면서 status 같은 ordinary client command가 열린 socket handle로 자연 종료를 막지 않게 한다. subagent는 pnpm dev daemon start와 pnpm dev status가 1.5초 내 완료됨을 실측했고, controller는 합쳐진 상태의 typecheck와 focused CLI/Claude tests를 재확인했다.

inline-static: launcher에 buildClaudeInlineStaticMcpConfig를 추가했다. dev 등록 정의는 absolute Node command + absolute tsx CLI + src/bin/aiox.ts mcp-claude args를 사용하여 tsx executable의 env node shebang/PATH 의존을 제거한다. build/npm 레이아웃은 Node + compiled aiox bin을 쓴다. 실제 ~/.claude.json Local entry는 자동 변경하지 않았고, TUI에서 기존 entry 충돌 여부 확인 후 사용자가 등록·관찰한다.

검증: subagent의 RED→GREEN(정적 정의 builder 2 tests, CLI dispose tests) 뒤 controller가 현재 합쳐진 worktree에서 pnpm typecheck, git diff --check, tests/unit/cli/bin.test.ts + tests/unit/cli/invocation.test.ts + tests/unit/adapters/claude-channel.test.ts를 실행해 92/92 PASS를 확인했다. TUI 결과(정적 Local registration의 warning·tools·send/reply)는 아직 사용자 확인 대기다. plugin D/marketplace/spikes는 변경하지 않았다.

### 2026-08-03 13:49 · inline-static Node 실행 정의 TUI 재현 실패 및 debug trace 확보 전환

사용자 TUI 실측: Local MCP entry를 absolute Node command + absolute tsx CLI args로 교체한 뒤에도 aiox-claude-ingress가 connected · tools fetch failed 및 Not connected로 표시됐다. config는 ~/.claude.json의 현재 project local scope에 존재하며 env placeholders도 기록돼 있다. 따라서 tsx direct-command shebang/PATH 의존은 단독 원인이 아니다. server: warning 제거 여부는 이 관찰 화면에 명시되지 않아 별도 확인이 필요하다.

다음 진단은 Claude debug file로 실제 MCP child stderr를 얻는 것이다. aiox launcher는 추가 Claude CLI args를 전달하지 않으므로 code 변경 없이 임시 wrapper command(AIOX_CLAUDE_COMMAND)를 사용해 --debug-file을 앞에 넣어 같은 inline-static TUI를 재현한다. plugin D와 Local entry는 이 trace 확보 전 변경하지 않는다.

### 2026-08-03 13:53 · debug trace로 확인한 plugin과 Local static MCP의 이중 등록 충돌

debug trace와 코드 대조로 inline-static tools fetch failed의 직접 원인을 확정했다. 같은 Claude session에서 installed plugin MCP와 Local static MCP가 모두 같은 agentName/token 환경으로 spawn됐다. trace상 plugin은 daemon_register_succeeded를 먼저 기록했고, static은 daemon_register_request 뒤 곧바로 clean connection close가 났다. state.registerClaudeChannel은 첫 성공 등록에서 claudePendingTokens의 해당 agent token을 delete한다(src/daemon/state.ts:1129-1152). 따라서 static의 두 번째 등록은 unknown_token 결과를 받고 channel-server.registerWithDaemon이 process.exit(1)한다(src/adapters/claude/channel-server.ts:520-548). 다음 TUI 실측은 plugin을 임시 disable하여 static MCP 단독으로 수행한다. 이 격리 전에는 static 전략 성공·실패를 판정하지 않는다.

### 2026-08-03 13:57 · Local static MCP 단독 TUI 정상 동작 사용자 확인

사용자가 plugin을 임시 비활성화한 뒤 Local static MCP 단독 TUI 검증이 정상 동작했다고 보고했다. 직전 tools fetch failed는 static 실행 정의가 아니라 installed plugin과 static MCP의 동시 등록 충돌이었음이 확정됐다. 이 격리 검증은 Local static 등록 + aiox claude의 dynamic env 주입 경로가 plugin 없이 MCP 실행·channel activation에 성립함을 뒷받침한다. 사용자가 이 응답에서 warning 문구·delivery count를 개별 재인용하지 않았으므로 세부 표면은 과장하지 않는다. plugin D/marketplace 제거 여부와 기본 전략 변경은 아직 사용자 결정 전이다.

### 2026-08-03 14:01 · 사용자 결정 · plugin D disabled 유지와 W6 제품화 순서

사용자 결정: plugin D는 이번 실험 뒤 다시 enable하지 않고 disabled 상태로 유지한다. 이는 아직 plugin D/spikes를 repository에서 삭제한다는 최종 결정은 아니며, Local static MCP 경로 검증·제품화가 끝날 때까지의 현재 runtime 선택이다.

W6 다음 순서: (1) disabled plugin D를 유지한 Local static MCP 경로를 현재 선택으로 둔다. (2) 사용자가 수동으로 수행한 claude mcp add-json을 aiox setup claude 제품 명령으로 설계·구현한다. 이 명령은 Local scope AIOX MCP의 등록·안전 갱신·제거 경로와 dev/build/npm 설치 레이아웃별 실행 정의를 소유한다. (3) npm tarball 격리 설치에서 npm 설치 → aiox setup claude → aiox claude/aiox codex → 양방향 send/reply를 실측한다. 현재 src/bin/aiox.ts를 가리키는 dev Local entry는 이 최종 검증의 근거가 아니다. (4) 2·3 통과 후 plugin D 및 spikes/aiox-channel-marketplace의 제거/유지와 D→Local static MCP decision 변경을 확정하고, 그 뒤 W5 owner docs·roadmap closeout으로 진행한다.

### 2026-08-03 14:01 · 부수 조사 · Codex node_repl startup failure는 AIOX와 독립

부수 조사(node_repl): repository에는 node_repl 또는 mcp_servers.node_repl 참조가 없고, Codex 전역 ~/.codex/config.toml의 별도 MCP 설정이 /Applications/ChatGPT Classic.app/...를 가리킨다. 현재 시스템에는 해당 경로가 없고 /Applications/ChatGPT.app/...에 현행 node_repl/node 바이너리가 존재한다. 따라서 Codex startup failed는 AIOX 변경과 독립된 stale user-global path로 판단한다. AIOX send/reply 정상 사용자 실측도 이를 지지한다. 전역 config 수정은 사용자 승인 없이는 수행하지 않는다.

### 2026-08-03 14:12 · W6 구현 계약 · aiox claude setup과 Local static MCP 기본화

W6 구현 계약 보강: Claude의 MCP entrypoint는 Codex와 대칭인 aiox mcp-claude hidden subcommand이며, Claude 제품 UX는 aiox claude setup(1회 Local-scope MCP 등록)과 aiox claude(매 세션 agent/token/socket 주입)로 나눈다. Codex는 aiox codex가 aiox mcp-codex를 런타임 주입하므로 별도 setup을 만들지 않는다.

aiox claude setup은 현재 실행 레이아웃에 맞는 static MCP 정의를 Claude 공식 MCP 관리 CLI로 등록한다. 등록 없음은 생성, AIOX가 생성할 정의와 동일하면 idempotent success, 같은 이름의 다른 정의는 덮어쓰지 않고 명확히 실패한다. remove/uninstall 명령은 사용자 요구가 아니므로 만들지 않는다. 테스트 중 실제 사용자 ~/.claude.json을 바꾸지 않고 CLI 호출은 injection/mock으로 다룬다.

aiox claude의 새 기본은 Local static MCP + server:aiox-claude-ingress다. setup이 없거나 기대 정의와 다르면 daemon attach/token 발급 전 aiox claude setup 실행을 안내하며 실패한다. plugin D는 disabled로 유지하고, fallback으로 자동 사용하지 않는다. D/marketplace/spikes의 실제 삭제·decision/owner docs 반영은 npm 설치본의 setup→Claude/Codex 양방향 실측 이후에만 판단한다.

### 2026-08-03 14:37 · Local static MCP 기본화 구현 완료 · idempotency 계약 실측 기반 정정

구현 완료 사실: 신규 어댑터 `src/adapters/claude/mcp-cli.ts`(`claude mcp add-json`/`claude mcp get` CLI wrapper), `src/adapters/claude/mcp-setup.ts`(`setupClaudeMcp` orchestrator). CLI 확장: `src/cli/parse.ts`에 `aiox claude setup` nested subcommand(claude의 `--name`을 commander `requiredOption`에서 수동 검증으로 전환해야 subcommand dispatch가 성립함을 실측 확인 — requiredOption 유지 시 `claude setup`이 `--name` 누락 오류로 오분류됨). `src/cli/invocation.ts`에 `claude-mcp-setup` dispatch, `requireClaudeMcpLocalRegistration` 게이트(daemon start/attachAgent/token 발급 이전 실행), `resolveClaudeChannelStrategy` 기본값을 plugin→inline-static(Local static MCP)로 전환.

계약 정정(사용자 실시간 결정, 위 14:12 entry의 "동일하면 idempotent success" 문구와 다름): 격리 fake HOME에서 `claude mcp --help`/`add-json`/`get`/`list`를 직접 실측한 결과(사실), `add-json`은 동일 정의 재등록도 항상 exit 1이고, `get`/`list`는 등록된 command/args/env를 구조화된 형태로 노출하지 않아 저장된 정의와 AIOX가 생성할 정의를 비교할 공식 CLI 방법이 없음을 확인했다. 이 gap을 AskUserQuestion으로 보고하자 사용자는 "자동 비교 없이 충돌 시 항상 실패"를 선택했다(결정). 따라서 구현은 동일 정의 여부와 무관하게 모든 이름 충돌을 `already_registered`로 실패 처리하며 절대 덮어쓰지 않는다 — 14:12 entry의 "동일하면 idempotent success" 절은 이 실측 결과로 대체된 것으로 기록한다.

검증(RED→GREEN): 신규 `tests/unit/adapters/claude-mcp-cli.test.ts`(9), `claude-mcp-setup.test.ts`(4). `parse.test.ts`에 4개 신규 케이스(setup 파싱, `--name` 누락 등). `invocation.test.ts`에 default-strategy 전환·게이트·`claude-mcp-setup` dispatch 신규/수정 케이스 추가, 기존 "default=plugin" 가정 테스트 4개는 explicit `withChannelStrategy("plugin", ...)`로 정정(동작 자체는 불변, 전제만 명시화). 관련 13개 파일 319 tests PASS, `tests/unit` 전체 50 files/572 tests PASS, `tsc --noEmit` 0 errors, `git diff --check` PASS.

E2E 실측(격리 fake HOME, 실 사용자 ~/.claude.json 미접촉 — 읽기만 실 `claude` CLI 사용, 쓰기도 fake HOME 안에서만 수행): `aiox claude --name X`(setup 미실행) 실행 시 정확히 "Claude AIOX MCP가 Local scope에 등록되어 있지 않습니다.\n먼저 aiox claude setup 을 실행하세요." exit 1과 daemon 미기동(status로 재확인)을 확인했다. `aiox claude setup` 최초 실행 성공(exit 0) 및 `claude mcp get`으로 Local scope 등록을 실측 확인했다. 재실행 시 already_registered로 정확히 실패(덮어쓰지 않음)함을 확인했다.

미검증 사실로 명시: 등록 통과 이후 실제 interactive Claude TUI가 정상 spawn되는 마지막 구간은 이번 세션에서 실물 재현하지 못했다 — headless 환경에서 안전하게 트리거할 방법이 없었다(AIOX_CLAUDE_COMMAND를 fake 바이너리로 치환하면 mcp-cli.ts의 registration check도 같은 env var를 참조해 함께 오탐 실패하는 것을 직접 확인 — plugin-cli.ts와 동일한 기존 관례이며 이번에 새로 만든 결함은 아님). 이 구간은 "등록됨" mock으로 launcher 호출 인자까지 assert하는 unit test로만 커버된다. npm 설치본에서의 build/npm 레이아웃 실측도 아직 수행하지 않았다 — 14:01 entry의 W6 (3)이 그대로 남아 있다.

plugin D, spikes/aiox-channel-marketplace, marketplace 관련 코드는 건드리지 않았다(git diff에 해당 파일 변경 없음, 직접 확인). remove/uninstall 명령은 만들지 않았다(사용자 지시).

W6는 여전히 active([>])다. 다음 순서는 14:01 entry의 (3) npm tarball 격리 설치에서의 실측이다.

## 2026-08-03 · W6 구현 독립 리뷰 · Local entry 이름-only launch gate의 보안·계약 gap

독립 read-only 리뷰 2건이 같은 high-risk gap을 확인했다. `checkClaudeMcpLocalRegistration`은 `claude mcp get` 출력에서 `Scope: Local config`와 이름만 확인하고 정의(command/args/env)가 AIOX 생성물인지 검증하지 않는다(`src/adapters/claude/mcp-cli.ts`). 이어 `aiox claude`는 해당 Local entry가 무엇이든 dynamic agent token·daemon socket 환경변수를 주입해 spawn한다(`src/cli/invocation.ts`, `src/adapters/claude/launcher.ts`). 따라서 오래됐거나 사용자 소유인 동일 이름 entry가 통과해 비-AIOX 명령에 세션 값을 전달할 수 있다. setup의 충돌 시 refuse 정책은 overwrite를 막지만 launch false-positive는 막지 못한다. 공식 CLI가 구조화된 정의 조회를 제공하지 않는다는 기존 사실 때문에 parser만으로 고칠 수 없다. npm tarball 검증 전에 Local entry를 trusted user-owned configuration으로 명시적으로 수용할지, 아니면 AIOX 소유·버전을 증명하는 다른 등록/검증 설계를 둘지 사용자 결정이 필요하다.

추가 확인: `claude mcp get`은 Local scope 확인과 함께 연결 health check를 수행할 수 있다. 동적 AIOX env 없이 호출되는 preflight에서 Connection closed가 출력됐던 관찰이 있으므로, scope 문구를 포함한 실패가 exit 0인지 실제 CLI로 재확인해야 한다. 현재 테스트는 성공 출력만 다룬다. 문구상 `idempotent`도 현재 모든 name collision을 nonzero로 거부하는 계약과 맞지 않아 `non-overwriting provisioning` 등으로 정정이 필요하다.

검증: 독립 리뷰와 별도로 `claude-mcp-cli`, `claude-mcp-setup`, parse, invocation focused suite 105/105 PASS를 재실행했다. 코드 수정은 하지 않았다.

## 2026-08-03 · W6/W7 범위 결정 · setup scope 확장과 attach scope 분리

사용자 결정: `aiox claude setup`은 Claude CLI와 같은 `--scope local|user|project`를 제공하며, 옵션이 없으면 Claude CLI 기본과 동일하게 local로 등록한다. W6에서 이 setup scope 지원과 npm 설치본의 기본 Local 경로 검증을 우선한다.

`aiox claude --scope`는 단순 setup 옵션의 연장이 아니라 Claude attach·Codex pair 런타임이 어느 scope의 static entry를 신뢰·검사할지 정하는 후속 작업이므로 W7로 분리했다. 따라서 W6에서 user/project에 등록하는 것은 provisioning까지만 다루며, 그 등록을 선택해 attach하는 runtime UX·검증은 W7이 소유한다. 현재 Local entry 이름-only 검증 gap도 scope를 넓히기 전에 별도 결정으로 해소하거나 trusted user-owned configuration으로 명시 수용해야 한다.

### 2026-08-03 15:12 · W6 `claude setup --scope` 구현 완료 · local/user/project 등록과 scope-aware 충돌 메시지

확인한 사실(구현):

1. 신규 `src/core/claude-mcp-scope.ts`에 `claudeMcpScopes = ["local","user","project"]`와 `ClaudeMcpScope` 단일 정의를 두었다. `src/cli/parse.ts`·`src/adapters/claude/mcp-cli.ts`·`src/adapters/claude/mcp-setup.ts`·`src/cli/invocation.ts` 네 곳 모두 이 타입을 import해서 쓰며, 중복 string union은 추가하지 않았다.
2. `src/cli/parse.ts`: `claude setup`에 `--scope <local|user|project>`(commander default `"local"`)를 추가했다. 검증 함수 `requireClaudeMcpScope`는 잘못된 값을 기존 `claude-plugin setup --scope`와 같은 에러 코드 `aiox.invalidScope`로 거부한다. `ParsedCommand`의 `claude-mcp-setup` kind에 `scope: ClaudeMcpScope` 필드를 추가했다.
3. `src/adapters/claude/mcp-cli.ts`: `AddClaudeMcpJsonOptions.scope`(필수 필드)를 추가하고 `-s local` 하드코딩을 `-s ${options.scope}`로 교체했다. `already_registered` 오류 메시지에 실제 scope를 명시하도록(`... is already registered in ${scope} scope ...`) 정정했다.
4. `src/adapters/claude/mcp-setup.ts`: `SetupClaudeMcpInput.scope`를 추가해 `addClaudeMcpJson` 호출에 그대로 전달한다. 충돌 안내 메시지의 `claude mcp remove ... -s local` 하드코딩을 `-s ${input.scope}`로, 재실행 안내를 `aiox claude setup --scope ${input.scope}`로 각각 정정했다. 자동 비교·자동 성공·overwrite·remove/uninstall은 이번에도 구현하지 않았다(기존 사용자 결정 유지).
5. `src/cli/invocation.ts`: `claude-mcp-setup` dispatch가 `command.scope`를 `claudeMcpSetupResult(scope, options)`로 전달하고, 그 값이 `setupClaudeMcp({..., scope})` 호출과 성공 출력(`scope: ${scope}`) 모두에 반영된다. `aiox claude`의 Local-only launch gate(`requireClaudeMcpLocalRegistration`, 항상 local 고정)는 변경하지 않았다 — attach 쪽 scope 정합은 W7 소관이라는 이번 세션 앞선 사용자 결정을 그대로 따랐다.
6. plugin D·marketplace·spikes/·`aiox claude --scope`·remove/uninstall 명령: `git diff`에 해당 파일 변경이 없음을 직접 확인했다 — 손대지 않았다.

TDD 절차(사실): parse → mcp-cli → mcp-setup → invocation 순서로 각 계층마다 신규/변경 assertion을 먼저 vitest로 직접 실행해 RED(실패)를 확인한 뒤, 최소 구현으로 GREEN 전환하는 순서를 반복했다.

검증(사실):

- `pnpm exec vitest run tests/unit/cli/parse.test.ts tests/unit/cli/invocation.test.ts tests/unit/cli/bin.test.ts tests/unit/adapters/claude-mcp-cli.test.ts tests/unit/adapters/claude-mcp-setup.test.ts tests/unit/adapters/claude-channel.test.ts tests/unit/adapters/claude-injector.test.ts tests/unit/adapters/codex-mcp-server.test.ts tests/unit/daemon/codex-ingress.test.ts tests/unit/core/messages.test.ts` 294/294 PASS.
- `pnpm typecheck`(tsc --noEmit) 0 errors, `git diff --check` PASS.
- 격리 fake HOME(`scratchpad/w6-scope-e2e/home`) + fake project cwd에서 실제 `claude` CLI로 직접 실측: `aiox claude setup`(옵션 없음) → local 등록, `--scope user` → user 등록, `--scope project` → project 등록 각각 exit 0과 성공 메시지의 `scope: <값>` 표시를 확인했다. 세 scope 모두 재실행 시 정확한 scope 이름을 포함한 `already_registered`로 nonzero 실패(예: local은 `already registered in local scope ... -s local ... --scope local`, user는 동일 패턴의 `in user scope ... -s user ... --scope user`)함을 실제 stdout으로 확인했다. `claude mcp list`/`claude mcp get`과 fake HOME의 project `.mcp.json`·user-level `mcpServers` JSON을 직접 읽어 등록 내용을 대조했다.
- 실 사용자 `~/.claude.json`은 건드리지 않았다: 테스트 후 `mcpServers.aiox-claude-ingress`(user scope) 부재, 실 repo 경로의 project entry `mcpServers` 빈 배열, fake project 경로가 실 config에 기록되지 않음을 Node로 직접 파싱해 확인했다. 실 repo에 `.mcp.json` 파일 자체도 없다.
- fake-HOME 실측 중 `claude mcp list`/`claude mcp get`이 동적 AIOX env 없이 호출돼 `Status: ✘ Failed to connect`(Connection closed)를 냈다. 이는 `checkClaudeMcpLocalRegistration`이 stdout의 `Scope:` 문구만 파싱하고 이 health-check 결과를 보지 않아 등록 판정에 영향을 주지 않음을 코드로 확인했다 — 기존 동작이며 이번 세션에서 새로 발견한 결함은 아니다.

미검증/범위 밖으로 남긴 것: npm tarball 격리 설치 레이아웃에서의 동일 검증(위 14:01 entry의 (3))은 이번 구현의 범위가 아니었으므로 수행하지 않았다. `aiox claude --scope`(attach·pair runtime이 신뢰할 scope 결정)는 W7 소관이라 손대지 않았다. 앞선 독립 리뷰가 지적한 Local entry 이름-only launch gate의 신뢰 경계 gap은 scope가 늘어난 지금도 해소되지 않았다 — `checkClaudeMcpLocalRegistration`은 여전히 이름과 `Scope:` 문구만 보고 정의 내용(command/args/env)은 검사하지 않는다.

W6는 여전히 active([>])다. W6 완료 처리나 W7 pointer 전환은 이 기록에서 하지 않는다.

## 2026-08-03 · W6 scope setup 독립 검증 · non-overwriting 계약 표현 정정

사용자 지시에 따라 static Claude MCP setup의 잘못된 `idempotent` 표현을 코드 주석에서 `non-overwriting provisioning`으로 정정했다(`src/cli/parse.ts`, `src/cli/invocation.ts`, `src/adapters/claude/mcp-setup.ts`, `mcp-cli.ts`). 이는 기존 이름이 있으면 항상 nonzero 실패하는 계약과 일치한다. Plugin D의 idempotent 주석은 별도 plugin setup 계약이므로 변경하지 않았다.

독립 read-only 검증 결과(사실): 단일 `ClaudeMcpScope`가 parse→invocation→setup→`claude mcp add-json -s <scope>`까지 전달되고, default local·user/project 명시 선택·invalid rejection·선택 scope별 collision failure가 테스트로 확인됐다. `aiox claude --scope` 또는 attach gate 변경은 없으며 W7 분리가 유지된다. plugin D/marketplace/spikes/aiox-channel-marketplace 변경도 없다(기존 별도 POC 수정은 제외).

검증: focused 4 suites 119/119 PASS, 전체 unit 50 files/586 tests PASS, `pnpm typecheck` 및 `git diff --check` PASS. 사소한 test-header 표현(Local-scope만 언급)은 user/project 테스트 사실과 불일치하지만 동작·계약에는 영향 없는 문서성 drift다. 코드 수정은 하지 않는다.

### 2026-08-03 15:35 · `claude mcp add-json` 충돌 시 실제 CLI 출력 실측 및 정규식 분류 결함 발견

`aiox claude setup --scope <local|user|project>`를 실 사용자 환경에서 직접 실행해 세 scope 모두 정상 등록됨을 사용자가 확인했다(local/user/project 각각 성공 출력). 이어서 충돌 메시지 정책을 논의하기 전, 격리 fake HOME에서 `claude mcp add-json`을 직접 두 번씩 실행해 raw 출력을 실측했다(사실):

- exit code: 성공 0, 충돌 1(모두). 메시지는 stdout이 아니라 **stderr**에 실린다(직접 stdout/stderr 분리해 확인, stdout은 빈 문자열).
- 충돌 메시지 문구는 scope마다 다르다: local `MCP server <name> already exists in local config`, user `MCP server <name> already exists in user config`, project `MCP server <name> already exists in .mcp.json`(local/user와 달리 "scope"·"project"라는 단어 자체가 없음).
- 동일 JSON 재등록도 다른 JSON 재등록도 구분 없이 항상 exit 1(기존 기록과 일치).

이 실측으로 `src/adapters/claude/mcp-cli.ts`의 기존 `ALREADY_EXISTS_PATTERN = /already exists in \w+ config/i`가 project scope의 실제 stderr(`already exists in .mcp.json`)와 매칭되지 않음을 정규식 직접 테스트로 확인했다(`local`/`user`는 true, `project`는 false). 즉 `aiox claude setup --scope project` 충돌 시 `already_registered`로 분류되지 못하고 범용 `claude_mcp_cli_failed`로 떨어져, `setupClaudeMcp`의 scope-aware 안내문(`claude mcp get`/`claude mcp remove -s project`/재실행 힌트)이 뜨지 않는 실제 결함이었다.

### 2026-08-03 15:50 · 사용자 결정 · 충돌 메시지 passthrough 정책 채택, 분류 로직 제거

사용자에게 세 선택지(A: 완전 passthrough·분류 제거, B: 분류·커스텀 안내문 유지하며 정규식만 project까지 확장, C: passthrough + 실패 종류 무관 고정 힌트 추가)를 관찰 가능한 결과·장단점과 함께 제시했다. 사용자는 **A(완전 passthrough)**를 선택했다.

결정된 계약: `addClaudeMcpJson`은 `claude mcp add-json`의 성공/실패(exit code)만 판정하고, 실패 사유를 더 이상 분류하지 않는다. 어떤 nonzero 실패든(충돌 포함) CLI의 stderr를 그대로 노출하되, aiox가 이미 알고 있는 name/scope만 접두어로 붙인다(`claude mcp add-json <name> -s <scope> failed: <raw stderr 또는 stderr 부재 시 error.message>`). "선택한 scope에 이미 등록됨을 명확히 말해야 한다"는 이번 W6 원 요구사항은 이 접두어(aiox가 파싱이 아니라 스스로 알고 있는 값)로 계속 충족되며, `claude mcp get`/`claude mcp remove`/재실행 커스텀 안내문은 원 지시사항에 없던 구현 임의 추가였으므로 제거한다.

구현 사실:

1. `src/adapters/claude/mcp-cli.ts`: `ALREADY_EXISTS_PATTERN`과 그 분기를 삭제했다. `ClaudeMcpCliErrorCode`를 `"claude_mcp_cli_failed"` 단일 값으로 단순화했다. `addClaudeMcpJson`은 이제 `stderr.trim()`이 있으면 그것을, 없으면(예: spawn ENOENT) `error.message`를 detail로 써서 `claude mcp add-json <name> -s <scope> failed: <detail>` 형태로만 던진다. 모듈 상단 CONTRACT 주석을 이 passthrough 정책(scope별 문구 차이와 무분류 사실 포함)으로 다시 썼다.
2. `src/adapters/claude/mcp-setup.ts`: `SetupClaudeMcpResult`의 `code`를 `"claude_mcp_cli_failed"` 단일 값으로 좁혔다. `already_registered` 분기·커스텀 안내문 생성 코드를 삭제하고, `ClaudeMcpCliError`를 잡으면 `error.message`를 그대로 `result.message`에 넣어 반환한다(무분류 verbatim passthrough). 모듈 주석도 이 정책으로 정정했다.
3. `src/cli/invocation.ts`/`src/cli/parse.ts`: 변경 없음 — `already_registered`라는 문자열은 애초에 이 두 파일에 없었다.

TDD 절차(사실): `claude-mcp-cli.test.ts`에서 local/user/project 세 scope 충돌 stderr(오늘 실측한 정확한 문구, project는 `.mcp.json` 포함)에 대해 `claude_mcp_cli_failed` 단일 코드와 raw stderr·`-s <scope>` 포함을 요구하는 RED를 먼저 작성해 실패를 직접 확인한 뒤 구현했다. `claude-mcp-setup.test.ts`의 collision 테스트를 커스텀 안내문 assertion에서 verbatim passthrough assertion으로 교체했다(이 테스트는 `mcp-cli.ts` 수정 전에는 dead-code 경로 때문에 우연히 GREEN이었고, `pnpm typecheck`가 `mcp-setup.ts`의 `error.code === "already_registered"` 비교를 도달 불가능한 타입 비교로 직접 잡아내 dead code 존재를 확인시켰다). `invocation.test.ts`의 collision 테스트 mock을 `code:"claude_mcp_cli_failed"`로 갱신했다.

검증(사실):

- `pnpm exec vitest run tests/unit/adapters/claude-mcp-cli.test.ts tests/unit/adapters/claude-mcp-setup.test.ts` 21/21 PASS, 전체 `tests/unit` 50 files/587 tests PASS.
- `pnpm typecheck`(tsc --noEmit) 0 errors, `git diff --check` PASS.
- 격리 fake HOME + fake project cwd에서 실제 `claude` CLI로 재현: local/user/project 세 scope 모두 1차 등록 성공 후 재실행 시 다음과 같이 나옴을 실측했다.
  - local: `claude mcp add-json aiox-claude-ingress -s local failed: MCP server aiox-claude-ingress already exists in local config`
  - user: `claude mcp add-json aiox-claude-ingress -s user failed: MCP server aiox-claude-ingress already exists in user config`
  - project: `claude mcp add-json aiox-claude-ingress -s project failed: MCP server aiox-claude-ingress already exists in .mcp.json`
  세 경우 모두 exit 1이며, project scope도 이제 별도 처리 없이 정상적으로 scope 라벨(`-s project`)이 붙은 채로 노출된다 — 정규식 분류 결함이 재현되지 않음을 직접 확인했다.
- 실 사용자 `~/.claude.json`은 이번 재현에서도 건드리지 않았다(fake HOME만 사용, 종료 후 삭제).

W6는 여전히 active([>])다. 이 기록에서 W6 완료 처리나 W7 pointer 전환은 하지 않는다.

### 2026-08-03 15:55 · `aiox claude setup --help` 문구를 passthrough 정책에 맞게 정정

`src/cli/parse.ts`의 `claude setup` 서브커맨드 `--help` 설명에 conflict 관련 언급이 아예 없었던 것을, "Never overwrites an existing entry under that name — a conflict fails with Claude's own error message."로 추가해 지금 코드가 실제로 하는 동작(커스텀 안내문 없이 raw CLI 오류로 실패)과 일치시켰다. `claude mcp get`/`remove` 같은 이제 존재하지 않는 커스텀 안내문 문구를 help에 새로 넣지 않았다. `npx tsx src/bin/aiox.ts claude setup --help` 실행으로 렌더링 확인, `pnpm typecheck`/`git diff --check`/전체 unit 50 files·587 tests PASS 재확인. 관련 pinning test는 없었다(help 문구를 verbatim assert하는 기존 테스트 없음).

## 2026-08-03 · W6 범위 조정 · npm tarball 검증을 release 단계로 이관

사용자 결정: npm tarball 격리 설치 검증은 현재 W6에서 수행하지 않는다. 사용자는 tarball이 성립할 것으로 판단하며, 실제 npm 배포 시점에 다시 검증할 것을 선택했다. 따라서 W6의 tarball Local Claude·Codex 양방향 실측은 release 검증으로 이관하고, 이를 근거로 현재 작업을 지연시키지 않는다.

남은 W6 판단은 (1) Local MCP 이름-only entry를 사용자 신뢰 구성으로 수용할지 또는 별도 ownership 검증을 설계할지, (2) 그 결과를 바탕으로 disabled plugin D와 `spikes/aiox-channel-marketplace`를 삭제할지 유지할지, (3) 선택된 결과의 decision/owner docs 반영이다. W7의 attach runtime `--scope`·Codex pair 정합은 계속 별도 open item이다.

## 2026-08-03 · W6 사용자 결정 · plugin D와 legacy Claude channel fallback 전면 제거

사용자 결정: plugin D를 삭제하며, plugin 전략으로의 fallback과 기존 one-off inline(A) fallback도 production code와 테스트에서 남기지 않는다. Claude 채널의 유일한 경로는 Local static MCP(`aiox claude setup`, `aiox mcp-claude`, `server:aiox-claude-ingress`)다. npm tarball 격리 설치 검증은 사용자 결정으로 현재 수행하지 않고 release 단계에서 재검증한다.

### 2026-08-03 16:30 · W6 구현 · plugin D·legacy inline(A)·spike marketplace 물리 삭제 및 decision/architecture/README 반영

위 사용자 결정을 구현했다. 삭제한 production 파일: `src/adapters/claude/plugin-cli.ts`, `src/adapters/claude/preflight.ts`, `src/adapters/claude/setup.ts`(D), `spikes/aiox-channel-marketplace/` 전체(`spikes/claude-channel-registration-poc/`는 무관한 별도 POC라 손대지 않았다). 삭제한 테스트: `tests/unit/adapters/claude-plugin-cli.test.ts`, `claude-preflight.test.ts`, `claude-setup.test.ts` — "없어야 한다"를 검증하는 최종 테스트로 남기지 않고 코드와 함께 제거했다.

`src/adapters/claude/launcher.ts`에서 legacy inline(A)의 `buildClaudeChannelMcpConfig`/`ClaudeChannelMcpConfigInput`/`resolveInlineChannelServerEntry`/`launchClaudeWithChannel`과 plugin(D)의 `buildLaunchClaudePluginArgs`/`launchClaudePluginChannel`을 삭제했다. `buildLaunchClaudeChannelArgs`(A/static 공유)와 `buildClaudeInlineStaticMcpConfig`/`launchClaudeInlineStaticChannel`(static 전용)만 남겼다.

`src/cli/parse.ts`에서 `claude-plugin-setup` `ParsedCommand` variant, `addClaudePluginCommand`, `requireSetupScope`와 그 등록을 삭제했다. `claude-mcp-setup`/`requireClaudeMcpScope`(이번 corrective 이전 W6 sub-task 산출물)는 그대로 유지된다.

`src/cli/invocation.ts`에서 `AIOX_CLAUDE_CHANNEL_STRATEGY` 환경변수 분기(`resolveClaudeChannelStrategy`, `ClaudeChannelStrategy` 타입), D preflight(`preflightStrategyDPlugin`, `SETUP_FIXABLE_PREFLIGHT_CODES`, `claudePreflightFailureMessage`), `claude-plugin-setup` case(`claudePluginSetupResult`, `formatSetupSummary`), marketplace 경로 resolver(`resolveClaudeChannelMarketplacePath`), plugin/legacy 관련 `InvocationOptions` 필드(`launchClaudeWithChannel`, `launchClaudePluginChannel`, `loadClaudePluginInventory`, `fileExists`, `setupClaudePlugin`, `claudeChannelMarketplacePath`)를 모두 삭제했다. `agent-attach`의 claude 분기는 이제 무조건 `requireClaudeMcpLocalRegistration` 게이트 → `launchClaudeInlineStaticChannel` 활성화만 수행한다(strategy 분기 없음).

`package.json`의 `"claude-plugin"` script를 삭제했다.

테스트: `tests/unit/adapters/claude-channel.test.ts`에서 legacy(A)/plugin(D) 관련 describe 블록(`buildLaunchClaudePluginArgs`, `launchClaudePluginChannel`, `buildClaudeChannelMcpConfig`, `resolveInlineChannelServerEntry`, `buildLaunchClaudeChannelArgs`의 `--mcp-config` 테스트)을 삭제하고 import를 정리했다. `tests/unit/cli/invocation.test.ts`에서 strategy 분기·D preflight·`claude-plugin-setup`·`claudePreflightFailureMessage` 관련 테스트 전체(및 `withChannelStrategy`/`passingInventory` 헬퍼)를 삭제하고, "Local MCP 등록 시 static launcher로 라우팅"/"미등록 시 게이트 실패"/"게이트 예외 wrap" 세 테스트로 단일 경로 계약을 커버하도록 통합했다(기존에 이미 "AIOX_CLAUDE_CHANNEL_STRATEGY unset일 때 static 경로로 간다"는 default-path 테스트가 있었으므로, strategy 분기 삭제 후에는 그 default 동작이 유일한 동작이 되어 새 RED 테스트 없이 기존 assertion이 그대로 회귀 검증 역할을 했다). `tests/unit/cli/parse.test.ts`에서 `claude-plugin setup` 관련 3개 테스트를 삭제했다(`claude setup` static MCP 테스트는 유지).

Doc harness(docs/decisions/AGENTS.md §5) 적용: 기존 decision `docs/decisions/claude-channel-plugin-default.md`("D를 기본으로")는 새 결론(D/A 완전 삭제, static 단일 경로)으로 대체되는 사안이라 patch하지 않고, 새 decision `docs/decisions/claude-channel-local-static-mcp-only.md`를 작성했다(Context/Decision/Alternatives/Rationale/Trade-offs/Re-evaluation/Sources 전 섹션, legacy/호환 코드 기본 삭제 정책을 근거로 명시). 기존 decision 파일은 물리적으로 삭제하지 않고 제목 아래에 "Superseded by ..." 한 줄만 추가해 historical WHY snapshot으로 남겼다 — decisions/AGENTS.md §1의 "결정 당시 WHY 스냅샷, 패치하지 않고 새 decision을 만든다" 원칙과, 사용자의 "문서를 조용히 삭제하지 마라" 지시를 함께 반영한 것이다. `docs/architecture/local-runtime-claude-adapter.md`(§6.1 Topology, §6.2 Launch Flow 1~9단계, evidence 라인 재검증), `local-runtime-process-topology.md`(§1 ASCII 다이어그램·prose), `local-runtime-cli-and-operator-surfaces.md`(§9.1 테이블에서 `claude-plugin setup` 행 삭제, `claude setup` 행 신규 추가)의 `Related:`/본문 링크를 새 decision으로 repoint했다. `docs/decisions/agent-level-mcp-process-scoping.md`의 Rationale에 예시로 남아있던 "Strategy D plugins for Claude" 문구를 현재 static MCP 사실로 교체했다(WHY 자체는 불변이므로 §5.2 보수 업데이트로 처리). `README.md`의 "External agent config"(marketplace 검증 bullet 삭제), "Claude Plugin Setup", "Claude Channel Strategy" 세 섹션을 "Claude Channel Setup" 단일 섹션(`aiox claude setup --scope`+`aiox claude --name`)으로 교체했다. `plans/release-plan.md`의 "연관:" 줄을 새 decision 경로로 갱신했다. 모든 편집 문서에 `scripts/check-markdown-inline-code`를 실행해 줄바꿈으로 깨진 inline code span을 확인·수정했다.

범위 밖으로 남긴 것(발견했지만 이번 작업에서 고치지 않음, 사실): `docs/architecture/local-runtime-cli-and-operator-surfaces.md` §9.1 테이블의 다른 행들(`daemon start` 등)의 evidence 라인 번호가 이미 이번 작업 이전부터 stale했다 — 이번에 손댄 행(`claude --name`, `claude setup`)만 현재 라인으로 갱신했고, 나머지 행은 pre-existing drift로 그대로 두었다.

검증(사실): `pnpm typecheck` 0 errors. `npx vitest run tests/unit` 47 files/516 tests PASS(삭제 전 50 files/587 tests에서 3개 파일·테스트 통합만큼 감소, 실패 없음). `git diff --check` PASS. `rg`로 `AIOX_CLAUDE_CHANNEL_STRATEGY`/`claude-plugin`/`claude/plugin-cli`/`claude/preflight.ts`/`claude/setup.ts`/`launchClaudePluginChannel`/`launchClaudeWithChannel`/`buildClaudeChannelMcpConfig`/`resolveInlineChannelServerEntry`/`aiox-channel-marketplace`를 `src`/`tests`/`package.json`/`plans`/`README.md`/`docs`(logs/ 제외) 전역에서 재확인했다 — 남은 참조는 새 decision doc의 역사적 서술과 옛 decision doc 본문(의도적으로 보존) 뿐이었다. 실 Claude TUI 재검증과 npm tarball 검증은 이번 작업에서 하지 않았다(각각 W6 기존 미검증 항목, 사용자 결정에 따른 release 단계 이관).

W6는 여전히 active([>])다. 이 기록에서 W6/W5 완료 처리나 W7 pointer 전환은 하지 않는다. 남은 W6 판단은 이 삭제 결과에 대한 최종 검토(사용자)와, W5 closeout 판단이다.

## 2026-08-03 · W6 cleanup 독립 감사 · legacy 잔재와 current 문서 drift

독립 read-only 감사 3건 결과. 실행 코드에서 plugin D, `AIOX_CLAUDE_CHANNEL_STRATEGY`, plugin CLI/preflight/setup, marketplace resolver, one-off `--mcp-config` builder는 발견되지 않았고, 현재 `aiox claude`는 Local registration gate→daemon attach/token→`launchClaudeInlineStaticChannel`→`aiox mcp-claude` 단일 경로로 확인됐다. 그러나 엄격한 cleanup에는 다음 잔재가 남았다: (1) `channel-server.ts`의 plugin bundle/inline A를 현행처럼 설명하는 주석과 direct-execution guard — 내부 호출은 없으므로 plugin bundle용 legacy였을 가능성이 높지만 외부 계약은 미확인, (2) `.gitignore`의 삭제된 marketplace bundle ignore 규칙, (3) static launcher 테스트의 중복 `not.toContain("--mcp-config")` 및 legacy 비교 문구 — 완전 args assertion이 이미 양성 계약을 증명하므로 삭제 가능, (4) `ClaudeInlineStatic…` 명명과 historical comparison 주석.

문서 drift 사실: README의 fresh dev/build smoke가 `aiox claude setup`을 생략한다. `docs/specs/aiox-capability-policy.md`, `docs/specs/aiox-adapter-model.md`, `plans/release-plan.md`, `docs/architecture/local-runtime-errors-events-smoke.md`, `docs/decisions/agent-level-mcp-process-scoping.md`가 삭제된 plugin/inline/launch-time-only 모델 또는 죽은 code reference를 current로 서술한다. superseded plugin decision은 historical 보존 자체는 적절하지만 내부 live line reference 정리가 필요하다. 또한 `setup --scope user|project`는 지금 등록만 수행하고 attach는 Local만 검사한다(W7 전), 따라서 README/new decision/architecture가 세 scope를 동일 runtime처럼 읽히지 않게 limitation을 명시해야 한다.

이번 감사는 read-only이며 코드를 수정하지 않았다. 다음 cleanup에는 위 code/test/.gitignore/doc 정합화를 포함해야 한다.

### 2026-08-03 17:05 · W6 cleanup 후속 정리 · legacy 잔재·문서 drift 해소 및 검증

직전 독립 감사(바로 위 entry)가 지적한 4개 code/test 잔재와 6개 문서 drift, scope 제한 명시 부재를 정리했다. W6/W5 완료 처리와 W7 pointer 전환은 하지 않는다.

확인한 사실(code/test):

1. `src/adapters/claude/channel-server.ts`: plugin bundle(D)/legacy inline(A) 공존을 전제한 주석(`runClaudeChannelMcpServer` 위 4줄)을 `aiox mcp-claude` 단일 dispatch 사실로 정정했다. direct-execution guard(`if (process.argv[1] === new URL(import.meta.url).pathname)`)는 `rg -n "channel-server\\.(ts|js)"` 전역 검색과 `package.json`의 `bin`(`dist/src/bin/aiox.js` 단일)을 직접 확인해 repo 내부에 이 파일을 직접 실행하는 호출이 없음을 확인한 뒤 제거했다. 이 guard에서만 쓰이던 `isClaudeChannelPortInUseError` 헬퍼도 함께 제거했다(제거 후 유일한 참조가 사라짐을 grep으로 확인). `ClaudeChannelPortInUseError` 타입·`createClaudeChannelPortInUseError`·`toListenError`는 유지했다 — `startClaudeChannelHttpIngress`의 typed rejection 계약을 검증하는 기존 테스트("rejects with a typed error when the requested explicit port is already in use")가 guard와 무관하게 이들을 계속 행사하기 때문이다.
2. `.gitignore`: 삭제된 `/spikes/aiox-channel-marketplace/plugins/aiox-channel-ingress/channel-server.js` ignore 규칙을 제거했다. 규칙 제거 직후 `git status`로 그 경로의 실제 생성물(945404 bytes, mtime 2026-08-02 18:44 — 2026-08-02 19:06 entry의 plugin bundle staleness 재현 당시 산출물)이 여전히 디스크에 남아 untracked로 드러나는 것을 확인했다. 이 파일과 그 결과 완전히 빈 `spikes/aiox-channel-marketplace/` 트리를 삭제해, 16:30 entry가 기록한 "물리적으로 삭제"를 실제로 완결했다.
3. `src/adapters/claude/launcher.ts` 및 참조 파일: `ClaudeInlineStaticMcpConfigInput`→`ClaudeStaticMcpConfigInput`, `buildClaudeInlineStaticMcpConfig`→`buildClaudeStaticMcpConfig`, `LaunchClaudeInlineStaticChannelOptions`→`LaunchClaudeStaticMcpChannelOptions`, `launchClaudeInlineStaticChannel`→`launchClaudeStaticMcpChannel`로 일괄 리네이밍했다(`src/adapters/claude/launcher.ts`, `src/cli/invocation.ts`, `tests/unit/adapters/claude-channel.test.ts`, `tests/unit/cli/invocation.test.ts`, `docs/architecture/local-runtime-claude-adapter.md`, `docs/decisions/claude-channel-local-static-mcp-only.md`). "instead of injecting a one-off --mcp-config"/"never --mcp-config" 같은 legacy 비교 주석·테스트 제목을 제거하고, `expect(args).not.toContain("--mcp-config")` negative assertion을 삭제했다(인접한 완전 `toEqual` array 비교가 이미 유일한 양성 계약을 증명하므로 중복). 지시대로 plugin/legacy "없음"을 검사하는 새 negative test는 추가하지 않았다.

확인한 사실(docs, 6개 대상 + 관련 architecture/decision 2개):

- README.md: Development/Build Smoke/Manual Routes/Pair Reservation 4개 fresh 흐름 모두에 `aiox claude setup`(또는 `pnpm dev claude setup`/`pnpm claude setup`) 선행 스텝을 추가했다(현재 게이트가 launch 전에 Local 등록을 요구하므로, 이 스텝 없이는 각 흐름이 그대로 실패한다). `--scope user|project`는 등록만 하고 attach는 항상 Local만 본다는 제한을 "Claude Channel Setup" 섹션에 명시했다.
- docs/specs/aiox-capability-policy.md: "Claude per-session MCP/instruction" row와 그 아래 caveat bullet이 서술하던 inline `--mcp-config`/plugin channel activation 이원 모델을 Local static MCP 단일 경로로 갱신하고, 죽은 `launcher.ts:94-117`/`:189-206`(현재 파일은 87줄뿐이라 범위 밖) 참조를 `launcher.ts:30-48`/`:70-86`로 교체했다.
- docs/specs/aiox-adapter-model.md: adapter matrix의 Claude 행("dev-channel/plugin channel launch", XML-escaped notification, chat_id/origin)과 "Current primary: plugin channel notification/push" 문구를 현재 static MCP 단일 경로 서술로 교체했다. 죽은 `launcher.ts:9-27`/`:94-118`/`:189-209` 참조도 `launcher.ts:30-48`/`:70-86`로 정정했다. 추가로 직접 코드 대조 중 발견한 사실 하나를 정정했다: "`/send` ingress handler는 port binding 외에 어떤 test도 POST하지 않는다"는 현재 거짓이다 — `tests/unit/adapters/claude-channel.test.ts:847-882`("forwards a real HTTP POST body to mcp.server.notification as the exact canonical JSON, unmodified")가 이미 실제 POST→notification 배선을 검증한다(W2-4 corrective 산출물). 이 한 문장과 관련 evidence만 정정했고, "실제 Claude target까지 이어지는 end-to-end 증거는 없다"는 나머지 claim은 그대로 유지했다(별도 자동 테스트 없음, 사실).
- plans/release-plan.md: B1 blocker와 "양호" 섹션이 서술하던 channel-server.js 자체 경로 self-resolve(`import.meta.url`) 모델을 현재 사실(단일 bin이 모든 서브커맨드를 dispatch하고, `buildClaudeStaticMcpConfig`가 `process.argv[1]`을 그대로 써서 cwd-독립적)로 교체했다. tarball 내용물 검증 항목을 `channel-server.js` 개별 확인에서 `dist/src/bin/aiox.js` 단일 확인으로 단순화했다(전자는 더 이상 별도 진입점이 아니므로). 배포 전 점검 순서 4번의 "R3 수동 smoke (dev-channel ↔ --mcp-config resolve)"를 "`aiox claude setup` → `aiox claude`/`aiox codex` 양방향 send/reply" static MCP smoke로 교체했다. npm tarball 검증 자체는 사용자 결정대로 이번 세션에서 수행하지 않았다.
- docs/architecture/local-runtime-errors-events-smoke.md: §10.6 CLI Parse/Invocation 표에서 삭제된 4개 에러 코드 행(`claude_plugin_setup.<code_or_failed>`, `claude_plugin_inventory_failed`, `claude_preflight.<code_or_failed>`, `invalid_claude_channel_strategy` — 4개 모두 `rg`로 현재 `src/cli/invocation.ts`에 문자열 자체가 없음을 확인)을 현재 Local static MCP setup/gate가 실제로 던지는 4개 코드(`claude_mcp_setup_failed`, `claude_mcp_setup.<code>`, `claude_mcp_registration_check_failed`, `claude_mcp_not_registered`)로 교체하고 정확한 현재 라인을 직접 읽어 채웠다. 같은 표의 `missing_daemon_socket_path`/`tui_launch_failed`/`unhandled_command`/`aiox.invocation.<reason>`과 §10.3의 `claude_channel_port_in_use`/`daemon_call_failed`/`missing_env_*` 행도 이번 세션의 channel-server.ts·invocation.ts 편집으로 라인이 밀리거나(직접 원인) 이미 어긋나 있던 것(사전 존재 drift, 예: `daemon_call_failed`가 `347,:388`을 가리켰으나 실제는 `369,:417`)을 모두 직접 코드를 읽어 검증된 값으로 정정했다.
- docs/decisions/agent-level-mcp-process-scoping.md: Decision 섹션의 "global configurations must remain untouched... injected per-process scope at launch time"이 현재 Claude의 1회성 영구 Local-scope 등록(`aiox claude setup`)과 충돌한다고 판단해, decision-change harness(§5.2 보수 업데이트로 분류 — WHY인 "aiox가 다른 세션의 공유 config를 건드리지 않는다"는 불변, mechanism 서술만 정정)에 따라 Codex는 여전히 순수 launch-time injection, Claude는 "정의는 1회 등록 + identity만 launch-time env 주입"으로 구분해 서술을 교체하고 `[[docs/decisions/claude-channel-local-static-mcp-only]]`를 body link로 연결했다. Rationale 절은 이미 직전 세션(16:30 entry)에서 정정돼 있었다.
- docs/decisions/claude-channel-plugin-default.md: historical/superseded 상태(직전 세션에서 이미 표기)는 그대로 유지했다. Rationale §2와 Sources가 삭제된 `src/adapters/claude/preflight.ts`·`src/adapters/claude/plugin-cli.ts`와 옛 `invocation.ts` 내부 함수를 현재 유효한 `file:line`인 것처럼 wikilink·라인 인용하던 것을, "당시 구현, D strategy와 함께 삭제됨 — provenance만 남는다"는 과거형 서술로 바꾸고 두 삭제 파일의 wikilink 대괄호를 뗐다(파일이 없으므로). "채널 활성화 전략·preflight 흐름(아키텍처 권위): [[local-runtime-claude-adapter]] §6.1–6.2" 줄은, 그 섹션이 지금은 이 historical 전략이 아니라 현재 static MCP 경로를 서술한다는 사실을 명시하는 문장으로 교체했다.
- scope 제한 명시(README 외 2곳 추가): `docs/decisions/claude-channel-local-static-mcp-only.md`의 Decision 절과 `docs/architecture/local-runtime-claude-adapter.md` §6.1에 각각, `--scope user|project`는 지금은 등록(provisioning)까지만 하고 `aiox claude` attach의 launch-time gate(`requireClaudeMcpLocalRegistration`)는 등록 scope와 무관하게 항상 Local scope 항목만 확인·활성화하며, 등록된 user/project 항목으로 attach하는 기능은 아직 구현되지 않았다는 문장을 추가했다. W7 구현 자체는 추가하지 않았다.

불확실/범위 밖으로 남긴 것(사실로 확인했지만 이번 작업에서 고치지 않음):

- `docs/architecture/local-runtime-claude-adapter.md` §6.3–6.4와 그 결론부는 지금도 수동 XML wrapper(`<channel source="aiox" chat_id="..." origin="...">`)와 `chat_id`/`origin` transport metadata를 현재 동작처럼 서술한다. 이는 W2 corrective(2026-07-30~31)에서 이미 제거된 모델이며 이번 W6 legacy-inline/plugin 삭제 범위보다 앞선 drift다. 같은 파일 §6.1/§6.2의 최신화는 이번에 했지만, §6.3/§6.4는 W5(owner-doc 반영) 소관으로 판단해 손대지 않았다.
- `docs/specs/aiox-capability-policy.md`의 `channel-server.ts:432-456`(loopback POST 무인증 claim), `521-555`(daemon registration) 같은 일부 evidence 라인은 직접 대조한 결과 이미 코드 내용과 어긋나 있었으나, 이번 세션의 편집(guard/comment 제거, rename)이 원인이 아니고 실제 대상 함수도 옮기지 않아 이번 작업의 원인 범위 밖으로 판단해 손대지 않았다.

검증(사실):

- `pnpm exec vitest run tests/unit/adapters/claude-channel.test.ts tests/unit/adapters/claude-injector.test.ts tests/unit/cli/invocation.test.ts tests/unit/cli/parse.test.ts tests/unit/cli/bin.test.ts tests/unit/adapters/codex-mcp-server.test.ts tests/unit/daemon/codex-ingress.test.ts tests/unit/core/messages.test.ts` — 8 files / 242 tests PASS.
- `pnpm exec vitest run tests/unit` 전체 — 47 files / 516 tests PASS(삭제·리네이밍 전후 개수 불변 — 직전 세션의 47 files/516 tests 기준과 일치).
- `pnpm typecheck`(tsc --noEmit) 0 errors. `git diff --check` PASS.
- `rg` 전역 재확인(대상: `src`, `tests`, `docs`(`logs/` 제외), `plans`, `README.md`, `package.json`): `aiox-channel-marketplace`, `claude-plugin`/`plugin-cli`/`claude/preflight`/`claude/setup.ts`, `ClaudeInlineStatic`, `launchClaudeWithChannel`/`buildClaudeChannelMcpConfig`/`resolveInlineChannelServerEntry`/`launchClaudePluginChannel`, `AIOX_CLAUDE_CHANNEL_STRATEGY` 검색 결과, 남은 매치는 전부 `docs/decisions/claude-channel-local-static-mcp-only.md`와 `docs/decisions/claude-channel-plugin-default.md`(의도적으로 보존하는 historical 서술) 뿐이었다.

실제 Claude TUI 재검증과 npm tarball 검증은 사용자 지시대로 이번 작업에서 수행하지 않았다.

## 2026-08-03 · W6 cleanup 독립 재검토 · legacy 제거 통과와 scope decision 충돌

독립 read-only 검토 3건 결과. 코드·테스트 cleanup은 통과했다: plugin D/A strategy env·plugin launcher/preflight/setup·marketplace·`--mcp-config` runtime builder와 전용 tests는 active scope에 남지 않았고, marketplace spike와 stale bundle/.gitignore rule도 제거됐다. direct-execution guard 제거는 repo 내부 직접 호출이 없고 `aiox mcp-claude` dispatch가 `runClaudeChannelMcpServer`를 직접 호출하므로 내부 계약상 안전하다. static launcher의 exact args·dynamic env·daemon/token 전 Local registration gate 양성 테스트만 남아 legacy-negative test는 없다. 독립 실행도 focused 5~6 suites 136~153 tests, 전체 unit 47 files/516 tests, typecheck, diff check가 모두 통과했다.

남은 것은 current docs/decision 정합성이다. (1) `aiox claude setup --scope user|project` help가 둘도 attach 전에 실행하면 되는 듯 표현하나 현재 attach는 Local entry만 본다(W7 전) — 제한 문구 필요. (2) `plans/release-plan.md`의 B1만으로 npm 동작 보장·bin 하나 포함이 나머지 dist 포함을 증명한다는 서술은 tarball 미검증/B2와 충돌하므로 과장을 제거해야 한다. (3) `local-runtime-errors-events-smoke.md` invalid-scope evidence line은 확인된 stale reference다. (4) 가장 중요한 현재 decision 충돌: `agent-level-mcp-process-scoping.md`는 shared/global agent config를 수정하지 않고 process-scoped injection만 쓴다고 하나, W6 `setup --scope user|project`는 user-wide `~/.claude.json` 또는 project `.mcp.json`을 변경한다. user/project scope UX를 유지하려면 기존 decision에 명시적 Claude static registration 예외와 비-AIOX session 동작 계약을 decision-change harness로 추가해야 한다. 이 충돌은 legacy residue가 아니라 closeout 전 해결해야 할 current policy 선택이다.

이번 검토에서는 코드 수정·pointer 전환을 하지 않았다.

## 2026-08-03 · 사용자 결정 · Claude setup 다중 scope 유지와 W7 runtime 책임

사용자 결정: `aiox claude setup --scope local|user|project` UX를 유지한다. 따라서 `agent-level-mcp-process-scoping`의 “공유/global config를 수정하지 않는다” 원칙은 Claude static MCP registration에 대한 명시적 예외와 계약으로 갱신한다. Local은 현재 attach의 유일 runtime scope이며, User/Project 등록은 W7에서 선택·해석할 대상이다.

W7의 의미 정정: 단순 `--scope` parse 옵션이 아니라 Claude 세션이 어느 cwd에서 시작되고 그 cwd에서 Local/Project/User MCP 정의가 어떤 precedence로 해석되는지를 AIOX가 명시적으로 선택·검증하는 runtime 기능이다. Project scope는 spawn cwd의 `.mcp.json`, Local scope는 그 cwd에 결합된 private project entry, User scope는 user-wide entry이므로, `aiox claude --scope`는 selected definition이 shadow되지 않도록 launch cwd·effective registration·pair startup contract를 함께 소유한다. Codex는 `aiox mcp-codex`를 런타임 주입하며 Claude MCP scope를 읽지 않는다. W7에서 Codex가 관여하는 부분은 동일 pair의 agent start/cwd coordination이지 Claude MCP scope 자체가 아니다.

## 2026-08-03 · W6/W7 해석 정정 · setup scope는 경로 독립 MCP 사용 UX

사용자 정정 수용: `aiox claude setup --scope`의 제품 목적은 AIOX MCP를 어느 경로에서든 사용 가능하게 하기 위한 등록 범위 선택이다. local은 현재 cwd 한정, project는 해당 프로젝트 구성, user는 사용자 전역 사용을 위한 선택지다. 따라서 `agent-level-mcp-process-scoping`과의 차이는 새 UX의 정당성 자체를 다시 결정해야 하는 정책 충돌이 아니라, 기존 “launch-time injection만” 문서가 Local static registration 모델을 아직 반영하지 못한 owner-doc drift다. 해당 decision은 Claude static MCP registration의 명시적 예외/새 모델로 갱신하면 된다.

W7의 제품 목적도 정정: User/Project 등록이 실제로 어느 cwd에서 시작해도 사용 가능하게 되도록 `aiox claude`가 선택 scope·cwd·effective MCP resolution을 정합시키는 기능이다. Codex는 MCP를 런타임 주입하므로 Claude scope 저장소를 공유하지 않으며, pair coordination은 보조 책임이다.

## 2026-08-03 · G2 요구 정정 · Claude scope가 아닌 Codex·Claude pair terminal launch 모델

사용자 정정: G2 terminal minimum의 scope/cwd 열린 결정은 Claude 단독 항목이 아니라 Codex·Claude pair의 terminal launch 모델로 다뤄야 한다. tmux driver 또는 no-tmux fallback은 pair를 구성하는 두 agent를 어떤 workspace/cwd에서 각각 시작하고, pair name·daemon profile·resume/termination을 어떻게 연결하는지 소유한다. Claude는 해당 cwd의 static MCP registration을 해석하고, Codex는 `aiox mcp-codex`를 launch-time 주입하지만, 둘 다 G2의 동일 pair terminal UX에서 함께 검증해야 한다. roadmap G2의 “착수 검토 / 열린 결정”에 넣을 요구는 이 pair-level 책임으로 표현한다.

## 2026-08-03 · 사용자 승인 · G2 pair launch 요구와 release/evidence 문서 최소 정합화

사용자 승인으로 최소 owner 문서 갱신을 반영했다. `docs/product/roadmap.md` G2의 착수 검토/열린 결정에 tmux/no-tmux가 Codex·Claude pair의 workspace/cwd, pair name·daemon profile·resume·종료를 함께 소유하고 두 MCP 준비 방식이 동일 pair UX에서 성립해야 한다는 요구를 추가했다. `plans/release-plan.md`은 npm artifact 동작을 B1만으로 보장한다고 과장하지 않고 tarball 목록·clean-install smoke로 확인하게 정정했으며, release smoke를 static MCP setup→Claude/Codex 양방향으로 갱신했다. `local-runtime-errors-events-smoke.md`의 invalidScope evidence를 현재 parse.ts:229-238로 맞췄다. static scope의 interim 상태를 제품 제한처럼 README/new decision에 추가하거나 agent-level scoping decision에 예외를 덧붙이는 변경은 사용자 정정에 따라 하지 않았다.

검증: `scripts/check-markdown-inline-code` 대상 3문서와 `git diff --check` 통과. W6/W5 상태·W7 취소 상태는 변경하지 않았다.

### 2026-08-03 18:17 · W6 Local static MCP TUI 재검증 완료

사용자 확인: plugin D와 legacy inline(A) 제거 뒤의 Local static MCP 단일 경로를 실제 Claude TUI에서 이미 재검증했다. `aiox claude setup` 등록 뒤 `aiox claude`의 MCP 도구 노출과 Codex→Claude 전달·Claude→Codex reply가 정상 동작했다. 따라서 W6의 TUI 미검증 항목은 해소됐다. npm tarball 격리 설치 검증은 기존 사용자 결정대로 release 단계에 남긴다. 현재 남은 G1-B 작업은 W5의 canonical-presentation owner 문서 정합화와 closeout 판단이다.

### 2026-08-03 18:22 · W5 owner 문서 독립 감사 · canonical presentation과 CLI evidence drift

독립 read-only 문서 감사 3건과 현재 코드 대조 결과. W5에서 현재 계약으로 갱신할 semantic owner 문서는 (1) `docs/architecture/local-runtime-claude-adapter.md` §6.4의 제거된 `chatId`/`origin`·수동 XML inner wrapper 모델, (2) `docs/architecture/local-runtime-codex-adapter.md` §7.10의 `/send {content, chat_id, origin}` sequence, (3) `docs/specs/aiox-message-lifecycle.md` §4.2의 Claude `chat_id`/`origin` metadata claim, (4) `docs/product/roadmap.md` G1-B의 wrapper-free presentation 미구현·미검증 서술이다. 현재 계약은 canonical envelope JSON body만 전달하고 Claude host가 outer `<channel>` 한 겹을 소유하며 sender는 body `source.address`에서 식별한다.

같은 W5 owner-doc pass에서 line evidence를 유지하는 문서인 `local-runtime-claude-adapter.md` §6.2–6.4, `local-runtime-cli-and-operator-surfaces.md`(hidden `mcp-claude` 누락 및 parse/invocation refs), `local-runtime-process-topology.md`(Claude `aiox mcp-claude` node 누락 및 stale refs), `local-runtime-errors-events-smoke.md`, `aiox-capability-policy.md`의 stale line refs도 현재 코드로 맞춘다. `plans/release-plan.md`은 static MCP release smoke/tarball release-stage 결정과 이미 정합해 변경 대상이 아니다. superseded plugin D decision과 Local static MCP decision의 history/context, generic Claude official capability surface, 다른 spikes POC는 provenance/current-runtime claim이 아니므로 W5에서 삭제·현재화하지 않는다. scope runtime UX는 G2 소관으로 확장하지 않는다.

### 2026-08-03 18:27 · W5 구현 · canonical presentation owner 문서 및 CLI evidence 정합화

W5 owner-doc 정합화를 반영했다. `local-runtime-claude-adapter.md` §6.4는 daemon/ingress가 `chatId`·`origin`을 공급하고 AIOX가 XML inner wrapper를 만든다는 구형 설명을 canonical envelope JSON body 무변형 전달, Claude host-owned outer `<channel>` 한 겹, sender body `source.address` 식별 모델로 교체했다. `local-runtime-codex-adapter.md`의 Claude ingress sequence도 `{content: canonical-envelope-JSON}`만 전달하도록 맞췄고, `aiox-message-lifecycle.md`의 Claude `chat_id`/`origin` metadata claim을 제거했다.

`roadmap.md` G1-B는 corrective가 미구현·미검증이라는 서술을 W4/W6 TUI 검증 완료 결과로 갱신했다. CLI/operator surface와 process topology에 hidden `aiox mcp-claude`를 `mcp-codex`와 대칭으로 반영했다. `local-runtime-claude-adapter.md`, `local-runtime-cli-and-operator-surfaces.md`, `local-runtime-process-topology.md`, `local-runtime-errors-events-smoke.md`, `aiox-capability-policy.md`의 Claude 관련 evidence line도 현재 코드 위치로 맞췄다. historical plugin D decision, scope/G2 UX, 코드·테스트는 변경하지 않았다.

검증: `scripts/check-markdown-inline-code` 대상 8개 문서 및 `git diff --check` 통과. W5/W6 상태·pointer는 이 기록에서 전환하지 않는다.

### 2026-08-03 18:34 · W5 완료 · owner 문서 정합화 closeout

W5 완료: canonical-presentation owner 문서 반영을 마쳤다. Claude·Codex adapter 문서, message lifecycle, G1-B roadmap, CLI/topology/error/capability evidence를 현재 canonical JSON body·host-owned outer wrapper·`aiox mcp-claude` 계약으로 정합화했고 Markdown inline-code/diff 검증을 통과했다. W6의 active pointer는 유지하며, 이후 사용자 지시까지 대기한다.

### 2026-08-03 19:03 · W6 완료 · static MCP 단일 경로 전환 및 legacy 제거 closeout

W6 완료: Local static MCP 단일 경로(`aiox claude setup` + `aiox mcp-claude`) 전환, plugin D·legacy inline 코드/테스트/marketplace 삭제, 실제 Claude TUI에서 MCP 도구·Codex→Claude 전달·Claude→Codex reply 재검증, decision·owner 문서 반영까지 완료했다. npm tarball 격리 설치 검증은 사용자 결정대로 이 Work Item의 미완료가 아니라 release 단계에서 수행할 별도 검증으로 남긴다. W5도 완료됐으므로 G1-B에는 active Work Item이 없다.

## 2026-08-03 · W7 취소 후속 · W8 신설 — attach 등록-활성 상태 확인 gap 실측

사용자가 W7을 취소 처리하고 새 Work Item W8을 개설하도록 지시했다. W8의 범위와 현재까지 확인한 문제를 실제 구현·문서 변경 전에 먼저 기록한다.

W8 범위: `aiox claude`의 attach 게이트(`checkClaudeMcpLocalRegistration`, `src/adapters/claude/mcp-cli.ts:126-144`)가 등록 이름과 `Scope:` 텍스트만 확인하고 실제 활성(연결 가능) 상태는 보지 않는 현재 계약의 사실 관계를 조사·기록한다. Local/User/Project 중 어느 scope를 attach가 신뢰할지 정하는 설계·구현은 W7 취소 사유(Claude session cwd·workspace·pair terminal을 정하는 G2와 함께 설계해야 함)를 그대로 따르며, 이 W는 다루지 않는다.

확인한 사실(격리 fake HOME + fake project cwd, 실 `claude` CLI v2.1.220 직접 실행, 쓰기도 scratch 안에서만 수행 — 실 사용자 `~/.claude.json`은 읽지도 쓰지도 않았다):

1. `claude mcp get`/`claude mcp list`의 상태 표시는 scope마다 다르다. local·user scope는 등록 직후 바로 health check로 넘어가 `✘ Failed to connect` 등을 낸다. project scope(`.mcp.json`)만 `⏸ Pending approval (run \`claude\` to approve)` 상태를 거친다(`claude mcp --help`의 `get`/`list` 설명에도 "Unapproved .mcp.json servers are shown as ⏸ Pending approval" 명시).
2. 이 "Pending approval"은 MCP 서버 단위 승인이 아니라 프로젝트 폴더 단위 신뢰 여부로 확인됐다. `~/.claude.json`의 `projects[<cwd>].enabledMcpjsonServers` 배열에 서버 이름을 직접 추가해도 상태가 바뀌지 않았지만, 같은 project entry의 `hasTrustDialogAccepted`를 `false`에서 `true`로 바꾸자 즉시 `✘ Failed to connect`(health check 상태)로 전환됐다.
3. 현재 코드의 `LOCAL_SCOPE_PATTERN = /Scope:\s*Local config/`는 project scope 텍스트와 애초에 매칭되지 않으므로, 이번에 확인한 gap은 지금 shipped Local-only 게이트의 정확성에는 영향을 주지 않는다. project scope를 attach 신뢰 대상에 포함시키는 미래 설계가 생길 때만 실제 문제가 된다.

미확인으로 남은 것: 실제 interactive `claude` TUI 세션이 Pending approval 상태의 project MCP 서버를 만났을 때 정확히 어떤 흐름을 보이는지(자동 프롬프트로 막고 대기하는지, 무시하고 진행하는지), `enabledMcpjsonServers` 배열이 실제로 어떤 경로에서 유효한지는 로그인된 실 계정 없이 이 세션에서 재현하지 못했다.

이 기록에서는 코드·문서 변경을 하지 않았다. W8은 `[>]`로 활성 상태다.

## 2026-08-03 · W8 확장 · Claude Channels가 research-preview·dev-only 플래그 의존이라는 근본 발견

W8 진행 중 사용자가 "지금 gate가 등록 여부만 보는 게 일반적인 Claude MCP 사용 흐름처럼 느껴지지 않는다"는 의문을 제기했고, 이를 조사한 결과 원래 W8 범위(project scope Pending approval)보다 더 근본적인 사실을 확인했다. 사용자 지시로 별도 W를 만들지 않고 W8에 그대로 묶어 기록한다.

확인한 사실 1 (실측, 실 HOME + 실 로그인 상태, `claude` v2.1.220): `~/Documents/ai-orchestration-w8-mcp-smoke-test`에 local scope로 더미 MCP(`aiox-autoload-test`, command:`true`)를 등록한 뒤 `--dangerously-load-development-channels` 같은 특수 플래그 없이 `claude -p "..." --debug-file`만 실행해도 디버그 로그에 `MCP server "aiox-autoload-test": Starting connection with timeout of 30000ms`가 찍혔다. 즉 등록된 MCP의 툴 연결 자체는 특수 플래그 없이 자동으로 시도된다.

확인한 사실 2 (공식 문서, `https://code.claude.com/docs/en/channels.md` 직접 fetch): "Being in `.mcp.json` isn't enough to push messages: a server also has to be named in `--channels`."라고 명시한다. 즉 MCP 툴 연결과 daemon→Claude "push"(AIOX가 필요로 하는 채널 알림) 활성화는 서로 다른 두 게이트다.

확인한 사실 3 (같은 문서): Channels는 "research preview" 기능이며 Anthropic 인증(claude.ai 또는 Console API key)이 필요하고 Bedrock/Vertex/Foundry에서는 쓸 수 없다. "During the preview, `--channels` only accepts plugins from an Anthropic-maintained allowlist, or from your organization's allowlist..."이고, AIOX의 커스텀 채널은 이 allowlist에 없다. "To test a channel you're building, use `--dangerously-load-development-channels`."이 공식 안내이며, "Neither `--channels` nor `--dangerously-load-development-channels` appears in `claude --help` while the feature is in preview. The flags work even though they aren't listed."도 명시한다 — 즉 이 플래그가 `--help`에 없는 것은 우연이 아니라 의도적인 preview 상태다.

확인한 사실 4 (같은 문서, Enterprise controls 절): `channelsEnabled` 조직 설정이 꺼져 있으면 "Blocks all channels including the development flag when off"라고 명시한다. Team/Enterprise Claude 조직은 기본값이 꺼짐이고, "Pro and Max users without an organization skip these checks entirely"라고 한다.

확인한 사실 5 (git history, `git log --all -- src/adapters/claude/launcher.ts`): 가장 최초 구현 커밋(`4f0fbc5`, "feat(r3): channel-as-plugin (strategy D) spike")부터 이미 `--dangerously-load-development-channels`를 썼다(`plugin:<name>@<marketplace>` 형태). 당시 코드 주석은 "it is the prerequisite shape for a future `--channels` allowlist"라고 스스로 밝히고 있었다. 즉 삭제된 plugin D와 현재 static MCP(`server:<name>` 형태) 모두 동일한 dev-only 플래그에 의존했고, 이는 W6에서 새로 생긴 문제가 아니라 R3 최초 구현부터 있던 조건이다.

추론(문서·코드 근거로 뒷받침되지만 별도 실측 계정 비교는 안 함): 지금 이 사용자 계정(조직 없는 개인 Pro/Max로 추정)에서는 `channelsEnabled` 체크를 안 받아 정상 동작하는 것으로 보이지만, Team/Enterprise Claude 계정에서 AIOX를 쓰면 이 push 메커니즘 자체가 막힐 수 있다.

미확인으로 남은 것: 사용자가 준비한 실제 interactive `claude` 세션에서의 승인 프롬프트 재현(앞선 W8 항목의 project scope Pending approval 실측)은 아직 결과를 받지 못했다. `--channels`/`--dangerously-load-development-channels`의 정확한 protocol이 향후 어떻게 바뀔지는 공식 문서도 "may change based on feedback"라고만 밝혀 예측할 수 없다.

이 기록에서는 코드·문서 변경을 하지 않았다. W8은 계속 `[>]`로 활성 상태이며, scope 확장 설계·channels 프로덕션화 여부의 결정은 여전히 사용자 결정 대기다.

## 2026-08-03 · 사용자 결정 · Channels research-preview 의존 리스크 인지 후 현행 유지

사용자 결정: AIOX Claude push(channel) 메커니즘이 Anthropic research-preview·dev-only `--dangerously-load-development-channels` 플래그에 의존한다는 리스크(위 블록 참조)를 인지하고 수용한 뒤, 우선 현재 방식을 그대로 유지하기로 했다. 대안 메커니즘 탐색이나 코드·설계 변경은 지금 하지 않는다.

이 결정으로 W8의 (2) channels 의존 리스크 항목은 "사실 확인 + 사용자 결정"까지 완료됐다. W8의 (1) project scope Pending approval 실측(사용자가 준비된 테스트 폴더에서 실제 `claude`를 실행해 승인 프롬프트를 관찰하는 건)은 아직 결과를 받지 못해 남아 있다. W8은 계속 `[>]`로 활성 상태다.

### 2026-08-03 19:36 · 사용자 승인 · effective MCP scope gate 구현 완료

사용자가 User-scope MCP를 다른 cwd에서 확인한 결과를 근거로, 기존 Local-only attach gate를 현재 cwd에서 Claude가 해석한 effective Local·User·Project 등록을 모두 허용하는 계약으로 변경했다. scope 등록 자체의 upstream 동작은 사용자가 수동으로 확인하며, 이 변경은 그 세 scope를 임의로 막지 않는다.

구현은 checkClaudeMcpRegistration으로 이름을 정정하고 claude mcp get 출력의 Scope: Local|User|Project config만 명시적으로 판정한다. Status 텍스트는 의도적으로 해석하지 않는다. 따라서 Project Pending approval 또는 연결 실패는 등록 사실과 별개이며, 이 gate가 Connected를 보장한다고 주장하지 않는다.

TDD: Local·User·Project 각각의 RED scope 사례를 먼저 추가한 뒤 구현했다. 검증은 focused Vitest 33 passed, pnpm typecheck 통과, git diff --check 통과다. 사용자 수동 검증은 실제 User/Project/Local 등록 각각에서 aiox claude를 실행해 MCP 및 channel flow가 실제로 시작되는지 확인하는 다음 단계로 남긴다.

### 2026-08-03 19:50 · W8 수동 검증 · User scope 최초 attach 통과와 MCP 재연결 한계

사용자가 다른 cwd에서 User-scope aiox-claude-ingress를 실행해 최초 도구 노출을 확인했다. 따라서 Local-only gate를 effective Local·User·Project scope로 확장한 변경의 User cross-cwd 최초 attach 가설은 수동으로도 지지된다.

같은 Claude 세션에서 aiox-claude-ingress를 disable한 뒤 enable하면 Claude UI가 Reconnected라고 표시하지만 tools fetch는 Not connected로 실패했다. 이는 등록 scope를 찾는 launch gate 이후, Claude MCP manager의 disable-enable 재연결 경로에서 관찰된 별도 실패다. 현 구현은 최초 aiox claude launch의 attach token·daemon registration·channel startup만 검증하며 disable-enable을 독립 재초기화 계약으로 구현하거나 검증하지 않았다. 원인과 복구 계약은 별도 조사 없이는 단정하지 않으며, 이 검증에서는 Claude 세션을 종료한 뒤 새 aiox claude launch로만 최초 attach를 재현한다.

### 2026-08-03 20:00 · W8 구현 · 등록 누락 gate 영어 진단 메시지

사용자가 다른 cwd에서 aiox claude를 실행해 등록 누락 gate 메시지를 직접 확인하고 영어 표기로 변경해 달라고 요청했다. 최소 행동 변경으로, 등록 누락 메시지를 Claude AIOX MCP is not registered for this directory. Run aiox claude setup --scope local|user|project first.로 바꿨다. 오류 code와 fail-fast 위치는 유지했다.

TDD: English message를 기대하도록 invocation unit test를 먼저 변경해 RED를 확인한 뒤 production string만 바꿨다. focused Vitest 33 passed, pnpm typecheck 및 git diff --check 통과.

### 2026-08-03 20:15 · W8 수동 재현 · disable-enable 뒤 연결 표시는 복구되나 MCP 도구 registry 미복구

사용자가 실제 Claude 세션에서 aiox-claude-ingress를 disable한 뒤 enable한 후의 대화를 재현했다. Claude는 서버가 다시 연결된 것 같다고 표시하지만 aiox-claude-ingress send 도구가 시스템에 등록되지 않았다고 두 번 연속 보고해 호출하지 못했다. 따라서 관찰 가능한 상태는 connection 표시와 tool registry가 불일치하는 상태다.

확인한 사실: 최초 aiox claude launch에서는 도구 연결·호출이 됐고, disable-enable 뒤에는 tool discovery/fetch가 Not connected로 실패하며 Claude가 재시도해도 send가 등록되지 않는다. 추론: AIOX의 session-start registration과 Claude의 MCP disable-enable reconnection lifecycle 중 적어도 하나가 tool rediscovery를 복구하지 못한다. 현재 증거만으로 어느 쪽이 원인인지 단정하지 않는다. 이 로그의 scope gate 변경과는 별도 재연결 결함이며, 사용자는 현 시점에서 구현을 보류했다.

## 2026-08-03 · 2026-08-03 · W8 원인 분석 검토 · Claude disable-enable 재등록 토큰 계약

사용자가 수집한 코드 분석을 현재 소스와 대조했다.

확인한 사실: `attachAgent(kind:"claude")`가 이름별 pending token을 발급하고, `registerClaudeChannel`은 올바른 token과 loopback endpoint를 검증한 뒤 현재 `claudePendingTokens.delete(...)`를 실행한다. 반면 `disconnectClaudeChannel`은 runtime과 pending token 모두를 삭제하고, CLI 호출 경로에서는 외부 Claude TUI 프로세스 종료 후에만 호출된다. 재등록 성공 시에는 `claudeChannelRuntimes.set(agentName, runtime)`이므로 같은 세션 credential을 허용하면 새 endpoint로 덮어쓴다. 현재 단위 테스트는 최초 성공 후 동일 token 재등록과 disconnect 뒤 재등록 거부를 명시하지 않는다.

추론: Claude가 disable-enable에서 MCP 자식 프로세스를 재기동한다면, 새 프로세스가 고정 env의 이미 소비된 token으로 등록해 `unknown_token`을 받고 즉시 종료한다는 설명이 사용자가 관찰한 `Reconnected` 뒤 tool fetch 실패와 일치한다. Claude 내부 재기동 자체와 실제 실패 응답은 아직 stderr/PID로 직접 실측하지 않았으므로 원인 확정은 아니다.

수정 판단: pending token을 external Claude session의 `disconnectClaudeChannel`까지 유지해 session-scoped re-registration credential으로 바꾸는 후보 A가 최소 수정이다. 구현 전에는 TDD로 (1) 같은 token 재등록이 새 endpoint를 갱신하는 성공, (2) disconnect 뒤 같은 token 등록은 `unknown_token` 실패를 추가해야 한다. 동시 구 프로세스/신 프로세스의 경합은 마지막 등록 endpoint가 승리하는 현재 Map 계약으로 남으므로, endpoint ownership/세대 검증은 별도 요구가 생길 때만 검토한다. 사용자는 아직 구현 지시를 하지 않았다.

## 2026-08-03 · 2026-08-03 · W8 위임 준비 · Claude용 재등록 결함 수정 프롬프트

사용자는 Codex를 검토자·작업 위임자로 두고, Claude에게 구현을 맡길 프롬프트를 요청했다. 위임 범위는 session-scoped Claude MCP 재등록 token 계약의 TDD 구현이며, 기존 scope gate 변경과 무관한 파일을 수정하지 않도록 한다. Claude 결과는 diff와 테스트 출력으로 받아 Codex가 별도 검토한다.

### 2026-08-03 20:25 · W8 구현 · Claude MCP 재등록 pending token 유지 TDD 완료

위임받은 구현자가 후보 A(pending token을 registerClaudeChannel 성공 시 삭제하지 않고 disconnectClaudeChannel까지 유지)를 TDD로 구현했다.

변경 파일: `src/daemon/state.ts`(`registerClaudeChannel`에서 `claudePendingTokens.delete(request.agentName);` 한 줄 삭제 — 성공 시 pending token을 더 이상 소거하지 않는다), `tests/unit/adapters/claude-channel.test.ts`(신규 테스트 2개: "동일 token 재등록 성공 및 endpoint 갱신", "disconnectClaudeChannel 뒤 동일 token 재등록은 unknown_token 실패").

RED 근거(사실): "with the same token twice" 테스트는 수정 전 `{ ok: false, reason: "claude_channel_registration_failed", detail: "unknown_token" }`로 실패했다 — 기존 코드가 최초 성공 즉시 pending token을 지워 두 번째 등록을 미등록 token으로 취급했기 때문이다. disconnect-후-재등록 테스트는 수정 전에도 이미 PASS였다(기존 코드가 최초 성공 시 token을 지우므로 우연히 같은 결과였음) — 이 테스트는 수정 후에도 동일 계약이 disconnect 경로로 보존되는지 지키는 회귀 assertion으로 유지한다.

GREEN 검증(사실): `pnpm exec vitest run tests/unit/adapters/claude-channel.test.ts` 39/39 PASS, `pnpm exec vitest run tests/unit/daemon/codex-ingress.test.ts tests/unit/adapters/claude-injector.test.ts` 73/73 PASS(회귀 없음), `pnpm exec vitest run tests/unit` 전체 47 files/520 tests PASS, `pnpm typecheck` 0 errors, `git diff --check` PASS.

범위: scope gate(`checkClaudeMcpRegistration`), Claude MCP setup(`mcp-cli.ts`/`mcp-setup.ts`), launcher, 기존 uncommitted 파일(`src/cli/invocation.ts`, `src/adapters/claude/mcp-cli.ts`, 관련 테스트)은 이번 구현에서 손대지 않았다(diff에 추가 변경 없음, 직접 확인).

남는 추론·한계(미확정): Claude가 실제로 disable-enable 시 MCP 자식 프로세스를 재기동해 같은 env token으로 재등록을 시도한다는 것은 여전히 코드 대조에 근거한 추론이며, 이 세션에서 stderr/PID로 직접 재현하지 않았다. 동시 구/신 프로세스 경합 시 마지막 등록 endpoint가 승리하는 현재 `Map.set` 계약은 그대로 남아 있으며, endpoint ownership/세대 검증은 이번 최소 수정 범위 밖이다. 실제 Claude TUI에서 disable-enable 재현 검증은 사용자 확인이 필요하다.

## 2026-08-03 · 2026-08-03 · W8 실측 반증 · token 재등록 수정 뒤에도 disable-enable 미복구

사용자가 Claude가 구현한 session-scoped token 변경을 적용해 수동 재시험했으나, 최초 연결은 성공하고 disable-enable 뒤 연결은 여전히 실패한다고 보고했다. 현재 diff를 검토한 결과 token 삭제 제거와 동일 token 재등록·disconnect 뒤 거부 테스트는 요청 계약대로 구현되어 있다. 따라서 이전 unknown_token 가설만으로는 실제 결함을 설명할 수 없거나, 재연결 경로가 새 channel-server의 daemon 등록까지 도달하지 않는다.

확인한 사실: 단위 테스트는 daemon state의 직접 API 재등록만 검증하며 Claude CLI MCP manager의 disable-enable lifecycle, static server resolution, child spawn, stdio handoff는 검증하지 않는다. channel-server는 등록 결과를 JSON stderr(`daemon_register_request`, `daemon_register_succeeded`, `daemon_register_failed`)로만 남긴다.

다음 조치: 구현을 추가하지 않고 Claude debug file과 channel-server stderr, disable 전후 mcp-claude PID를 수집해 재등록 요청이 일어나는지와 실제 실패 지점을 먼저 판정한다. Codex는 해당 관측 결과와 diff를 재검토한다.

## 2026-08-03 · 2026-08-03 · W8 비교 실험 계획 · Codex MCP enable-disable

사용자는 Claude 재연결 결함의 원인 분리를 위해 Codex에서도 AIOX MCP enable-disable를 시험할 필요를 제기했다. 코드·architecture 문서상 Codex는 `aiox codex`가 daemon-owned app-server에 `mcp_servers.aiox`를 동적 주입하고, app-server가 `aiox mcp-codex` 자식을 소유하는 구조인 반면 Claude는 Claude CLI가 local static MCP 자식을 소유한다. 따라서 같은 toggle 결과가 나와도 동일 lifecycle이라고 단정할 수 없지만, AIOX ingress/daemon 재등록 계층이 공통 원인인지 판별하는 유효한 비교 실험이다.

실험 조건: 반드시 `aiox codex --name <고유이름>`로 시작한 Codex 세션에서 aiox MCP만 disable-enable 하고, 최초 tool call·toggle 후 tool list·toggle 후 send call 결과와 Codex/app-server의 상태 메시지를 기록한다. 일반 `codex`로 시작한 세션은 AIOX MCP가 주입되지 않아 대조군으로도 부적절하다.

## 2026-08-03 · 2026-08-03 · W8 재현 증거 · Claude MCP 자식 미재기동 및 token 가설 반증

두 독립 세션(`claude-user`의 ~/Documents cwd, `claude-smoke`의 repo cwd)에서 OS 프로세스 관측으로, 최상위 Claude는 생존한 채 `mcp-claude` 자식만 최초 생성 후 4~7초 내 소멸하고 disable-enable 뒤에도 다시 생성되지 않는 패턴이 확인됐다. 이 관측은 session-scoped token 재사용 구현이 실제 재연결을 복구하지 못했다는 사용자 수동 시험과 일치한다.

확인한 사실: 현재 `registerClaudeChannel`은 성공 시 pending token을 삭제하지 않으며, `disconnectClaudeChannel`은 최상위 Claude 종료 뒤에만 호출된다. 두 재현에서 enable 뒤 새 `mcp-claude` PID가 없었으므로, 재기동된 프로세스의 env 전달·daemon registration·tool discovery를 전제하는 token 가설은 이 증거만으로 원인이 될 수 없다. channel-server JSON stderr는 `stdio: inherit`으로 사용자 터미널에만 흐르고 이 재현에서는 포착하지 못했다. 기존 Claude `--debug-file`은 channel-server stderr를 포함하지 않는 것도 확인됐다.

검토 판단: 지금의 token 유지 변경은 직접 API 재등록 단위계약만 만족하며 관측된 실패를 해결하지 못한다. pre-v1 default 및 불필요한 코드 삭제 원칙상, 종료 원인을 stderr로 확인하거나 일반 stdio MCP 대조를 하기 전 이 변경을 유지할 근거는 없다. 다음 최소 조사 대상은 최초 자식 종료의 stdout/stderr·exit reason이며, enable 동작은 그 자식을 재생성하지 않는 관측 결과를 별도 Claude dev-channel lifecycle 한계로 다룬다.

## 2026-08-03 · 2026-08-03 · W8 위임 준비 · 효과 없는 token 재등록 변경 되돌리기

사용자는 실제 disable-enable 재현을 고치지 못한 session-scoped token 재등록 변경을 되돌리는 작업만 Claude에게 위임할 프롬프트를 요청했다. 되돌림 범위는 `src/daemon/state.ts`의 pending token 삭제 제거와 `tests/unit/adapters/claude-channel.test.ts`의 전용 재등록 테스트 2개이며, 다른 기존 미커밋 변경은 보존한다.

## 2026-08-03 · 2026-08-03 · W8 조사 범위 재정의 · Claude MCP toggle 원리와 AIOX lifecycle 합동 분석

사용자는 stderr만 수집하는 진단보다 먼저 Claude가 MCP를 disable-enable할 때의 상태 전이 원리와 AIOX가 사용하는 static dev-channel/stdio MCP lifecycle을 함께 파악해야 한다고 지적했다. 이 판단을 채택한다.

조사 범위는 (1) Claude CLI의 일반 등록 stdio MCP와 `--dangerously-load-development-channels server:<name>`에서 disable/enable이 각각 process spawn, transport close, server state, tool discovery를 어떻게 바꾸는지, (2) AIOX의 `launcher.ts` → static MCP config/env → `channel-server.ts` stdio·HTTP ingress·daemon register → daemon runtime map 흐름이 어느 상태에 기대는지를 한 관측 표로 대조하는 것이다. 목표는 단일 UI 증상에 맞춘 추측성 수정이 아니라, AIOX가 고칠 수 있는 lifecycle contract와 Claude preview 기능의 한계를 분리하는 것이다.

## 2026-08-03 · 2026-08-03 · W8 독립 검토 · token 재등록 변경 되돌림 승인

Codex subagent가 Claude의 되돌림 결과를 독립 검토했다.

확인한 사실: `src/daemon/state.ts`와 `tests/unit/adapters/claude-channel.test.ts`는 HEAD와 동일하며 git status에도 없다. `registerClaudeChannel`의 성공 경로에는 `claudePendingTokens.delete(request.agentName)`가 복원됐고 disconnect 경로의 삭제도 유지된다. 남은 변경은 기존 log, mcp-cli/invocation 및 해당 unit test 4개뿐이며 되돌림이 이를 건드린 흔적은 없다. sandbox 내 loopback EPERM으로 ingress 4개가 실패했으나 승인된 환경의 focused 재실행에서 claude-channel 37/37, typecheck, diff check가 모두 통과해 Claude의 검증 주장이 재현됐다.

검토 결론: 되돌림은 1회용 token 계약을 정확히 복구했고 범위가 깨끗하다. 이 되돌림 자체는 disable-enable 결함을 해결하지 않으며, 이후 원인 조사는 Claude toggle lifecycle과 AIOX lifecycle의 합동 실측으로 진행한다.

## 2026-08-03 · 2026-08-03 · W8 합동 조사 검토 · Claude dev-channel 재연결 실패의 소유 경계

세 조사 결과를 Codex가 검토했다.

확인한 사실: Claude dev-channel 활성화 뒤 `mcp-claude` 자식은 idle에서 장시간 생존하며, disable은 약 1초 내 자식을 정상 종료한다. 엔트리 재선택에 의한 재연결은 새 PID·connected 성공과 새 PID 미생성·tools fetch failed 양쪽을 같은 절차에서 보였다. AIOX daemon의 pending token 재사용 여부는 새 자식이 없는 실패 경로에 관여할 수 없다. `launcher.ts` 이후 MCP 자식의 spawn/kill/respawn은 Claude가 소유하고, AIOX에는 disable-enable event 또는 child-exit 감지 경로가 없다. AIOX runtime map은 child 사멸만으로 자동 무효화되지 않는다.

검토 정정: "AIOX 코드 결함이 아니다"는 backend token/registration 결함에는 현재 증거로 강하게 성립하지만, 전체 제품 책임을 사실로 면제할 수는 없다. AIOX는 research-preview dev-channel static MCP 경로를 선택·의존하며, 대체 launch architecture 또는 stale runtime 관측을 할 수 있는 설계 선택권은 남는다. 따라서 근본 실패의 직접 소유는 Claude의 dev-channel stdio reconnect lifecycle로 보되, dev-channel 고유성·일반 stdio 공통성, 그리고 AIOX가 UX 차원의 완화를 할지 여부는 미확정/사용자 결정으로 유지한다.

현재 제안: token 변경은 되돌린 상태를 유지한다. 근본 수정은 하지 않고, (A) 재연결 실패 시 세션 재시작 안내, (B) stale runtime 감지/진단만 별도 workstream, (C) dev-channel 의존을 제거하는 대체 architecture 검토 중 사용자 선택 전까지 코드 변경을 추가하지 않는다.

## 2026-08-03 · 2026-08-03 · W8 검토 보류 · 재연결 성공 관측과 1회용 token 계약의 모순

Codex 검토에서 추가 확인이 필요한 모순을 발견했다. 현재 코드의 1회용 token 계약에서는 최초 child가 `registerClaudeChannel`에 성공한 순간 pending token이 삭제된다. 같은 최상위 Claude 세션에서 disable 뒤 새 `mcp-claude` child가 spawn하면, static definition의 고정 env token으로 다시 `registerWithDaemon`을 호출하는 한 `unknown_token` 실패 후 종료해야 한다.

따라서 조사 보고의 run8 "새 PID 생성·connected 성공"은 (a) Claude UI의 transport/tool discovery 표시만 성공하고 AIOX daemon 등록·실제 send는 실패했는지, (b) 테스트 조건에서 새 token 또는 새 attach가 생겼는지, (c) env/등록 경로가 예상과 다른지를 분리해야 한다. run9처럼 child 자체가 없는 실패에서는 token이 직접 원인이 아니라는 점은 유지하지만, run8을 근거로 token 가설 전체를 폐기하거나 backend 결함이 아니라고 확정할 수는 없다. child stderr가 별도 socket으로 캡처되지 않은 현재 증거에서는 이 모순을 해결하지 못했다.

다음 최소 확인: run8 조건에서 실제 `send` tool call 결과와 daemon `registerClaudeChannel` 응답(또는 child exit code/daemon event)을 확보하고, 동일 top-level Claude PID·agent name에서 attach가 1회였는지 확인한다. 이 확인 전에는 새 구현 결정을 보류한다.

## 2026-08-03 · 2026-08-03 · W8 위임 준비 · run8 재연결 성공 표시와 token 계약 모순 검증

사용자는 run8 재연결 성공 관측과 1회용 token 계약의 모순을 해소할 Claude subagent용 프롬프트를 요청했다. 조사 범위는 동일 top-level session의 attach 횟수, 재연결 뒤 실제 send tool call, daemon registration·child exit 증거를 분리해 확인하는 것이며 코드·설정 변경은 하지 않는다.

## 2026-08-03 · 2026-08-03 · W8 재연결 결론 갱신 · spawn 실패와 token 거부의 두 경로

run8 모순 검증의 새 독립 재현에서 동일 top-level Claude PID·단일 attach·동일 daemon 세션 중 disable-enable 뒤 새 `mcp-claude` child가 실제 spawn됐고, 곧 소멸했으며 `/mcp`는 `connected · tools fetch failed`, 도구 inventory에는 send/reply 없음, daemon delivery도 증가 없음으로 관측됐다. 이는 UI transport 연결 표시가 AIOX daemon registration 또는 usable tool discovery를 보장하지 않는다는 사실을 강화한다.

결론 갱신: 재연결에는 두 경로가 있다. (A) Claude가 child를 spawn하지 않는 경우 — AIOX token 변경으로 해결할 수 없는 Claude dev-channel lifecycle 실패. (B) Claude가 child를 spawn하지만 tool fetch가 실패하는 경우 — 현재 1회용 token 계약에서 새 child가 같은 고정 env token으로 registration에 실패하는 흐름과 강하게 정합하며, token을 session-scoped로 유지하면 해결할 수 있는 AIOX 경로다. stderr/exit reason은 직접 포착하지 못해 B의 `unknown_token` 자체는 추론으로 남지만, token 재사용 구현을 단순히 무의미하다고 되돌린 직전 판단은 과도했다.

검토 제안: Candidate A(session 종료까지 pending token 유지)를 동일 token 재등록·disconnect 뒤 거부 테스트와 함께 다시 적용할 근거가 생겼다. 단, 이는 B만 완화하며 A(새 child 미spawn)는 남는다. Claude dev-channel의 비결정적 spawn 실패는 별도 limitation으로 안내/재시작 fallback을 유지한다. 사용자 구현 결정 전에는 코드 변경을 추가하지 않는다.

## 2026-08-03 · 2026-08-03 · W8 구현 위임 · session-scoped Claude token 재등록 복원

사용자가 경로 B(Claude가 새 MCP child를 spawn하지만 기존 1회용 token 때문에 daemon 등록이 실패하는 경로)를 대상으로 Candidate A 구현을 subagent에게 위임하도록 지시했다. 구현은 TDD로 `registerClaudeChannel` 성공 뒤 token을 session 종료까지 유지하고, 동일 token 재등록 endpoint 갱신과 disconnect 뒤 재등록 거부를 테스트한다. Codex는 결과 diff와 검증을 독립 검토한다.

## 2026-08-03 · 2026-08-03 · W8 공식 문서 검증 · 경로 A 보류와 B 구현 검토 통과

공식 Anthropic 문서 조사 결과, Channels는 Claude가 subprocess를 spawn하고 stdio로 통신하는 research-preview MCP server이며 development channel은 `--dangerously-load-development-channels server:<name>`로 승인 뒤 spawn된다고만 설명한다. 일반 MCP 문서는 config에서 stdio subprocess를 Claude 시작 시 spawn하고 `/mcp`는 상태 확인이라고 설명한다. `/mcp` Disable/reconnect의 child 종료·재spawn 보장, connected의 의미, stdio retry 정책, dev-channel과 일반 stdio의 차이는 모두 미문서다.

run8 최상위 Claude PID 7192가 원인 미확인으로 종료됐으므로, 그 세션의 child 없음은 parent 종료의 정상 결과와 구분되지 않는다. 따라서 경로 A(살아있는 parent가 spawn을 생략한다)는 독립된 실제 경로가 아니라 추가 검증 대상으로 보류한다. 경로 B(살아있는 동일 parent·daemon·단일 attach에서 새 child spawn, connected+tools fetch failed, child 종료)는 실제 재현된 AIOX-관여 경로로 유지한다.

사용자 지시의 Candidate A 구현은 subagent가 TDD로 완료했고 Codex가 독립 검토했다. 변경은 `src/daemon/state.ts`의 성공 뒤 token 삭제 제거와 `tests/unit/adapters/claude-channel.test.ts`의 재등록 성공·disconnect 뒤 거부 테스트뿐이다. Codex의 focused run은 39/39 PASS, typecheck 및 diff check PASS였다. 이 구현은 확정된 B 경로만 완화하며, 보류된 A를 해결한다고 주장하지 않는다. 커밋은 하지 않았다.

## 2026-08-03 · 2026-08-03 · W8 수동 검증 통과 · session-scoped token 재등록으로 B 경로 복구

사용자가 새 daemon·새 Claude TUI에서 Candidate A 구현을 적용한 뒤 disable → reconnect를 수동 재시험했고 성공을 보고했다. 이는 새 MCP child가 spawn되는 확정 경로 B에서, 최초 등록 뒤 token을 삭제하지 않고 session 종료까지 유지하는 변경이 재등록·도구 복구를 실제로 가능하게 했다는 수동 검증이다.

확인한 사실: 이전 1회용 token 구현에서는 동일 조작 뒤 `connected · tools fetch failed` 및 send/reply 부재가 관측됐고, 변경 후 사용자가 같은 class의 조작 성공을 확인했다. 추론: 원인 B는 pending token의 최초 성공 시 삭제로 인한 재등록 실패였다는 결론의 확신도가 높아졌다. child spawn이 일어나지 않는 미문서 Claude 상태(보류한 경로 A)는 이번 검증의 대상이 아니며, 이 구현으로 해결됐다고 주장하지 않는다. 커밋은 아직 하지 않았다.

## 2026-08-03 · 2026-08-03 · W8 Tidy First 검토 · 핵심 구현 리팩터링 불필요, stale Local-only 용어 정리 후보

TDD/Tidy First 기준의 독립 subagent 검토에서 현재 focused 3 files 72/72, typecheck, diff check가 통과한 것을 다시 확인했다. session-scoped token 재등록 변경은 state 한 줄과 lifecycle 경계 테스트 2개로 최소화돼 있으며 helper 추출·endpoint 로직 추출은 의도를 숨기거나 불필요한 구조 변경이라 하지 않기로 했다.

확인된 구조 정리 후보는 scope gate가 effective Local/User/Project 등록을 허용하도록 바뀐 뒤에도 launcher, mcp-setup, parse, invocation 및 invocation test 일부가 "Local-only" static definition/launch 전략이라고 남긴 설명·테스트 이름이다. 이는 동작 변경 없이 "static MCP definition" 및 "effective registration" 용어로 맞출 수 있는 documentation cleanup이다. token TTL·generation, scope adapter 일반화는 새 행위/정책이므로 이번 범위에서 제외한다.

사용자는 현재 리팩터링 후보 조사만 지시했으므로 파일은 수정하지 않았다. 적용할 경우 scope 용어 정리는 behavioral scope gate·token reconnect와 분리한 별도 structural commit으로 다룬다.

## 2026-08-03 · 2026-08-03 · W8 owner 문서 drift 검토 · 새 decision 선행 필요

Document Structure Review 기반의 read-only subagent 검토에서 현재 코드 계약(setup Local/User/Project, effective registration gate, session-scoped Claude token 재등록)을 owner 문서와 대조했다.

확인한 사실: as-built architecture/spec 문서에는 Local-only gate·one-time token·기존 한국어 오류 표현이 남아 current code와 drift한다. 과거 WHY snapshot인 `claude-channel-local-static-mcp-only`는 user/project provisioning만·launch Local-only를 명시하고, `claude-channel-trust-and-registration`은 secure single-use attach token을 선택했다고 명시해 둘 다 current contract와 직접 충돌한다.

문서 구조 판단: 과거 decision을 현재 코드에 맞춰 조용히 덮어쓰지 않는다. static definition은 유지하되 effective scope gate를 Local/User/Project로 확장한 결정과, token을 top-level Claude session 동안 재등록 가능하게 바꾼 결정을 새 decision 하나 또는 둘로 먼저 소유해야 한다. 이후 `local-runtime-claude-adapter`, process topology, CLI operator surface, daemon transport API, errors/smoke, adapter model/capability policy의 current as-built claims를 국소 갱신한다. `/mcp` child 미spawn은 독립 재현 미확정이므로 문서화하지 않는다. 사용자는 현재 검토만 지시했으므로 문서를 수정하지 않았다.

## 2026-08-03 · 2026-08-03 · W8 owner 반영 위임 · scope/token decision 및 as-built 문서 정합화

사용자가 확인된 owner 문서 drift를 실제 문서에 반영하도록 지시했다. 기존 decision snapshot은 보존하고 scope gate 확장과 session-scoped reconnect token의 load-bearing rationale을 새 decision 두 개로 작성한 뒤, 필요한 architecture/spec current claims에만 결과를 전파하도록 subagent에게 위임한다.

## 2026-08-03 · 2026-08-03 · W8 owner 반영 완료 · 새 decision과 current architecture/spec 정합화

사용자 승인 후 subagent가 owner 문서 drift를 반영했고 Codex가 독립 검토했다. 기존 historical decision은 수정하지 않고 `claude-channel-effective-registration-scope`와 `claude-channel-session-reconnect-token` 새 decision 두 개를 추가했다. scope decision은 explicit User/Project provisioning의 shared-definition trade-off와 per-process runtime identity 경계를 명시하고, token decision은 replacement child 재등록을 session 종료까지 허용하는 rationale·trade-off를 소유한다.

current/as-built owner는 Claude adapter, process topology, CLI/operator surface, daemon transport API, error catalog, adapter model, capability policy만 갱신했다. 미확정 child 미spawn 경로는 문서화하지 않았다. capability policy의 기존 stale code evidence range와 Codex ingress/egress 용어도 current state lines로 정정했다.

검증: 수정 문서 9개 inline-code check 통과, `git diff --check` 통과. Codex가 권한 환경에서 Claude 관련 focused unit 4 files 79/79, typecheck를 통과시켰다. 코드·문서 변경은 아직 커밋하지 않았다.
