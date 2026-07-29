---
topic: G1-B canonical envelope cutover
description: Codex↔daemon 경로의 canonical delivery correlation 최소 수직 슬라이스를 구현하고 live probe로 검증하는 package.
status: decided
---

## Work Items

- [x] W1 W1 G1-B 실행 계약과 integration map을 확정하고 contract review를 통과한다.
- [x] W2 W2 canonical deliveryId envelope and Codex named ingress path를 TDD로 구현한다.
- [x] W3 W3 authenticated delivery-correlated reply right와 source-only routing을 TDD로 구현한다.
- [x] W4 W4 daemon typed content shape를 { text }로 단일화하고 legacy typedText fallback을 제거한다

## Required Context

### Return Target

- Log: `logs/G1/2026-07-18-G1-A-Codex-structured-ingress-evidence.md`
- Work Item: W1
- Consume when: G1-B package가 canonical deliveryId 발급·보존·rendered ingress·authenticated structured reply egress와 live spike evidence를 결과로 확정하면, source W1이 그 결과를 소비해 Tier evidence matrix와 closeout readiness를 갱신한다.
- Context snapshot: G1-A typed contract는 고정 입력이며, current Codex raw inject acceptance만으로 canonical correlation/Tier 2를 주장하지 않는다. G1-B는 pre-v1 compatibility shim을 추가하지 않고 최소 vertical slice의 canonical cutover를 검증한다.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.

## Package Scope

- Revision: 2; History pointer: `2026-07-19 · W1 integration map and contract review accepted`.
- Primary boundary: public deliveryId와 canonical envelope을 Codex ingress·authenticated reply egress까지 단일 수직 경로로 cutover
- Related artifacts in allowed write-set:
- src/daemon/state.ts
- src/daemon/api.ts
- src/core/**
- src/store/schema.ts
- src/store/repositories/**
- src/adapters/codex/injector.ts
- src/adapters/codex/mcp-server.ts
- src/adapters/codex/**
- tests/unit/daemon/**
- tests/unit/adapters/**
- tests/unit/store/**
- docs/specs/aiox-message-lifecycle.md
- spikes/codex-app-server-multi-session-poc
- Excluded:
  - G1-C automatic ack, dedupe, retry/backoff, durable queue/restart recovery implementation. G1-B의 JSON-RPC acceptance를 ack로 오인하지 않도록 현재의 즉시 `completed` 전이만 `delivered`로 정정한다.
  - G1-D source-authentication and route-authorization hardening beyond the existing authenticated ingress boundary.
  - Dual-read/write, alias, fallback or other pre-v1 compatibility shims.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution default: W1 controlling inline discovery/contract review; subsequent executable implementation and live-probe W items receive Compact task records. Isolated read-only scouts may run in parallel; the controlling log alone accepts results.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - N/A.
  - Activate when: large claim, public contract/security/data/release, irreversible external effect, multi-owner conflict, large blast radius, or low discovery confidence is present.

## Task Index

- Stable package key: 2026-07-19-G1-B-canonical-envelope-cutover

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W4 | Compact | inline | `logs/packages/2026-07-19-G1-B-canonical-envelope-cutover/tasks/W4.md` |
| W1 | Compact | inline | `logs/packages/2026-07-19-G1-B-canonical-envelope-cutover/tasks/W1.md` |
| W2 | Compact | inline | `logs/packages/2026-07-19-G1-B-canonical-envelope-cutover/tasks/W2.md` |
| W3 | Compact | inline | `logs/packages/2026-07-19-G1-B-canonical-envelope-cutover/tasks/W3.md` |

## Evidence

- Current accepted evidence:
  - W1 previously observed `thread/inject_items` raw developer-item acceptance, but it neither binds nor proves canonical deliveryId correlation, TUI presentation, wake-up, receipt or ack.
  - Current daemon reply ingress projects `inReplyToDeliveryId` to `parentMessageId`; Codex renderer/injector currently exposes text/message_id rather than a canonical envelope.
- Evidence gaps:
  - Exact public ID/store binding and all affected producer/consumer paths.
  - Canonical envelope shape at the Codex renderer boundary and raw named injection ABI.
  - Reply authorization/source-only routing behavior and a traceable structured MCP result/event.
  - Unit/integration evidence plus live Codex spike artifacts using one original deliveryId.

## Cross-Artifact Effects

- Pending discovery: daemon message/store mutation changes the Codex renderer payload and MCP reply correlation consumer; tests and the live spike must be revised together before result acceptance.

## Decision Candidates

- N/A.
- Reason: no decision candidate recorded yet.
- Activate when: decision-worthy rationale or competing options appear.

## Verification Contract

- Revision: 3; History pointer: `2026-07-19 20:52 · W2 disposition selects turn-start canonical envelope with explicit UX limitation`.
- Required:
  - TDD unit/integration tests for original deliveryId preservation, canonical envelope rendering, authenticated reply authorization and source-only reply routing.
  - Canonical envelope uses `message_deliveries.id` as the public deliveryId and does not add a second public delivery-id store column.
  - Reply-right state is persisted and rejects unknown, wrong-target, reply-not-expected and duplicate replies; the accepted reply creates one delivery only to the original source.
  - Codex injection uses `turn/start` with the complete canonical envelope JSON as its user input; its JSON user-message rendering is an accepted UX limitation. Turn-start acceptance remains distinct from receipt/ack, native activity, and active-turn policy.
  - Existing affected daemon/Codex adapter tests pass.
  - A live, isolated Codex App Server probe records `turn/start` with one original deliveryId in the canonical JSON input and confirms that same JSON is persisted in `thread/read`; it records the raw user-message JSON UX limitation and does not imply daemon receipt/ack, native activity, or active-turn handling.
  - `git diff --check` and package registry integrity pass.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 2; History pointer: `2026-07-19 · W1 integration map and contract review accepted`.
- Criteria:
  - The accepted result states whether the minimal vertical slice is complete, partial, or blocked and preserves raw verification artifacts/limitations.
  - The Return Target is consumed: G1-A W1 incorporates the accepted G1-B result into its evidence matrix/Tier disposition before the detached W1 is resolved.
  - After W1 completion and G1-A plan-status reconciliation, closeout W2-1 is updated by a new append-only entry; the pre-registered handoff tables are not rewritten.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-07-19 · 2026-07-19 · G1-B package detached from G1-A W1

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.

### 2026-07-19 18:19 · 2026-07-19 · W1 integration map and contract review accepted

- W1 discovery confirmed `message_deliveries.id` is already issued/stored per target and is the approved public `deliveryId` binding; no second public delivery-id column is in scope.
- Current outbound flow loses that identity at `formatCodexAioxChannelEnvelope(message, source)` and injects a plain `turn/start` text input. Current inbound reply accepts `inReplyToDeliveryId` but projects it to `parentMessageId` and fans out the replying agent routes.
- Contract decision: the minimum vertical slice must persist and consume a reply right, resolve the original delivery, require the authenticated target identity, create exactly one source-target reply delivery, render the complete envelope JSON in a raw developer `thread/inject_items` request, and expose correlation in MCP/daemon artifacts. Anything less is probe-only and cannot validate the registered G1-B completion condition.
- TDD sequencing: first isolate public deliveryId→canonical envelope content, then named injection transport, then authenticated source-only reply behavior, then live spike. No compatibility read/write path is added.
- Contract review (controlling self-review): Scope/write-set and verification/closeout criteria cover the producer/store/renderer/MCP/spike dependency chain; execution may begin with a task record.

### 2026-07-19 · W2 whole-path cutover and W3 reply split reconfirmed

- User authorized work across G1-B and, only where actually needed, G1-C. Read-only producer/store and lifecycle scouts independently confirmed that a complete no-fallback Codex cutover requires typed metadata persistence and propagation through all common Codex renderer consumers; the existing optional dispatch-only metadata is insufficient.
- The required G1-B path is: typed producer/request -> persisted message metadata -> per-delivery canonical renderer -> named `thread/inject_items` raw developer item. `message_deliveries.id` remains the only public delivery ID binding. The envelope must include `content.mediaType: "text/plain"` and profile-derived canonical addresses.
- Reply authorization/source-only routing is a separately testable G1-B completion condition, so W3 is now explicit rather than being implicit in W2. The new W has its own Compact record before execution.
- G1-C full reliability work is not required now. However, success currently changes `delivered` immediately to `completed` in both daemon and adapter-router paths although JSON-RPC acceptance is not ack. W2 includes the narrow cross-boundary correction to stop at `delivered`; automatic ack, dedupe, retry/backoff, queue drain/recovery, and unconfirmed-degradation persistence remain excluded. Tier-2/ack claims remain withheld until that work exists.

### 2026-07-19 · W2 session handoff

- Resume target: `[>] W2` and `logs/packages/2026-07-19-G1-B-canonical-envelope-cutover/tasks/W2.md`, Task Brief revision 2, Attempt 4.
- Accepted baseline is still the pre-W2 suite; the working tree contains an unaccepted W2 candidate. Do not treat its renderer/schema changes as accepted package state until controlling result review.
- First action: run `pnpm vitest run tests/unit/daemon/codex-ingress.test.ts tests/unit/adapters/codex-injector.test.ts` to reproduce the current 12 daemon failures. Convert their XML/`turn/start`/immediate-`completed` expectations to the one canonical JSON + named `thread/inject_items` + `delivered` behavior, preserving their thread-selection and failure assertions.
- Then complete the missing required-field cutover for generic producers and inject the runtime profile for canonical local addresses. Do not add XML, alias, fallback, or dual-read/write compatibility behavior. The nullable migration-2 columns exist only for pre-v1 schema transition; canonical rendering must not silently manufacture missing intent/replyExpected values.
- Required gates before W2 result review: focused deliveryId-envelope test, injector suite, affected daemon/store/adapter suites, `pnpm typecheck`, `git diff --check`, then live Codex spike with one original deliveryId. Start W3 only after W2 is controlling-reviewed and accepted.

## 2026-07-19 · 2026-07-19 · W2 TDD checkpoint

- TDD checkpoint: the initial daemon+injector suite reproduced 11 daemon failures (not the prior 12); injector tests already passed. The first lifecycle expectation was converted from `completed` to `delivered` and passed in isolation.
- RED→GREEN completed for a Claude→Codex complete envelope test with explicit `intent` and `replyExpected`, stored `message_deliveries.id`, and a `build` profile address. The daemon state now receives an optional runtime profile and the production daemon passes `resolveProfile()`; direct test state retains the release default.
- Core and repository metadata persistence tests were made RED by requiring explicit expected fields, then GREEN by providing typed metadata. This confirms persistence but does not yet add a new runtime rejection error for untyped generic RPC callers; that public error-contract expansion has not been silently assumed.
- Remaining focused failures are old XML/`turn/start` expectations and their fake failure trigger. Failure fakes now fail `thread/inject_items`, and the status/failure assertions have begun conversion. Continue W2 with one named developer-item expectation at a time; preserve thread selection/deferred/failure semantics and do not begin W3.

## 2026-07-19 · 2026-07-19 · W2 named developer-item assertions

- TDD: converted six stale Codex ingress assertions one at a time from `turn/start` XML to `thread/inject_items` developer `input_text` assertions. Each focused test was green before the next conversion.
- Preserved independent thread-selection checks: `thread-impl`, live `thread-new`, proxy-bound `thread-focused`, and cached/live `thread-visible`; the proxy-selected event assertions remain intact.
- Added exact canonical-envelope checks for raw JSON-sensitive content and routed replies, including deliveryId, profile-derived addresses, typed metadata, and `text/plain` content.
- Repaired directly affected expectation drift in Codex runtime, fake adapter dispatch, fan-out persistence, and SQLite schema. Verification: ingress/injector/core/repository 58 passed; added affected group 33 passed; `pnpm typecheck` passed.
- Full `pnpm vitest run` remains non-green because network-listening tests cannot bind `0.0.0.0` in this sandbox (`listen EPERM`), independently reproduced in codex-proxy (11 setup failures). This is environmental evidence, not an assertion of pre-existing repository failure outside this sandbox.

## 2026-07-19 · 2026-07-19 · W2 live App Server injection probe

- Live environment: isolated `codex app-server --listen ws://127.0.0.1:51995`, Codex CLI `0.144.5`; a fresh `thread/start` returned one isolated thread id. Temporary App Server/TUI processes were then stopped.
- Actual request: named `thread/inject_items` with `{ threadId, items: [{ type: "message", role: "developer", content: [{ type: "input_text", text: <complete aiox.message.v1 JSON envelope> }] }] }`. The App Server returned `{}` for each of two injections.
- Context visibility probe: the second injected developer item contained the otherwise undisclosed marker `AIOX_CONTEXT_MARKER_6F84`. A subsequent `turn/start` user question did not include that marker and asked only for the reviewer marker. `thread/read(includeTurns: true)` recorded the completed agent message exactly `AIOX_CONTEXT_MARKER_6F84`.
- Conclusion: this directly verifies current App Server acceptance of the named developer-item shape and next-turn model visibility for an already loaded thread. It does not prove automatic wake-up, receipt/ack, TUI presentation, or the separate W2 requirement to correlate a daemon-issued original deliveryId through MCP artifacts.
- Spike helper TDD: added `create`, `inject`, and `read` commands plus request builder tests. Verification: `pnpm vitest run spikes/codex-app-server-multi-session-poc/client.test.ts` (8 passed), `pnpm typecheck`, and `git diff --check` passed.

## 2026-07-19 · 2026-07-19 · W2 ingress wake-up contract reopened for next session

- User discussion reopened the product-flow question after the named developer-item cutover: when Claude delegates to Codex, should the target begin generative work automatically, including while another Codex turn is active?
- Confirmed App Server facts: `thread/inject_items` appends raw Responses items to a loaded thread's model-visible history and does not start a user turn; `turn/start` accepts text input, starts Codex generation, and can carry the complete canonical envelope as JSON text. The live isolated probe in this package verified developer-item acceptance and next-turn model visibility, not automatic wake-up.
- Current W2 candidate switched from `turn/start` to `thread/inject_items` because the W2 contract required a raw developer item containing the canonical JSON envelope; the logged rationale was canonical structured/developer ingress, not an observed active-turn collision solution. Existing G1-A evidence explicitly leaves active-turn accept/queue/defer/reject and queue flush unverified.
- Consequence: `thread/inject_items` alone does not close the intended automatic Claude→Codex work loop. A future decision must choose one coherent ingress/wake contract: (A) canonical JSON as `turn/start` text (immediate generative turn, user role), or (B) developer `thread/inject_items` plus a defined automatic wake policy. For active target turns, do not assume App Server `turn/start` queues; verify or explicitly define queue/defer/steer behavior and delivery state.
- No implementation or contract decision was changed in this session. W2 remains an unaccepted candidate; do not start W3. Next session should decide the desired agent-to-agent interaction semantics before accepting, reverting, or extending the transport cutover.

### 2026-07-19 19:45 · 2026-07-19 · W2 manual recipient-TUI presentation probe

- 확인 사실: 사용자가 현재 candidate를 isolated pair와 수신 Codex TUI로 수동 실행했으며, `thread/inject_items` developer marker가 수신 TUI에 즉시 표시되지 않았다고 관찰했다. W2 task record Attempt 5에 execution trace와 verification 상태를 기록했다.
- 해석: 이 결과는 named developer item의 다음-turn model visibility와 모순되지 않지만, user-visible delivery signal이라는 제품 요구에는 negative evidence다. 자동 wake-up, receipt/ack, active-turn policy는 이 probe에서 검증하지 않았다.
- 상태: W2 candidate는 계속 unaccepted다. `thread/inject_items` transport의 전체 철회, canonical envelope/metadata와 delivered-state correction의 분리 유지 여부, 그리고 `turn/start` 기반 ingress/wake 계약은 아직 결정·적용하지 않았다. W3는 시작하지 않는다.

### 2026-07-19 19:56 · 2026-07-19 · W2 native tool-activity presentation is primary requirement

- User clarified the primary product requirement: agent-originated inbound delivery must appear in the Codex TUI as native MCP tool activity (for example, `Called <tool>` with its activity/result), not as a user-authored prompt. This makes raw canonical JSON through `turn/start` unsuitable as the final ingress UX even though it would be visible and start generation.
- Verified boundary: the documented App Server methods establish `turn/start` as user-input/generation and `thread/inject_items` as model-visible history without a user turn. Neither current evidence nor the API overview establishes that an externally initiated `mcpServer/tool/call` or injected raw tool-call Responses item produces the requested TUI activity. Those are distinct, unverified candidates.
- Disposition: no transport replacement is selected. Keep W2 unaccepted and do not revert to `turn/start` solely as a substitute. Before a contract revision, run an isolated presentation spike that tests the narrow candidate surface(s) for a native tool-activity render, records the TUI and thread/event results, and separately checks automatic wake and active-turn behavior.

### 2026-07-19 20:05 · W2 presentation probe must also prove autonomous generation

- 성공 기준을 세 부분으로 분리한다: (1) 수신 TUI가 native MCP tool activity를 표시하는가, (2) 그 호출/결과의 delivery payload를 Codex 모델이 읽는가, (3) 외부 사용자 입력이나 별도 `turn/start` 없이 그 payload에 근거한 새 생성 turn이 자동으로 시작하고 내용-연관된 답을 내는가.
- 따라서 다음 isolated spike는 controlled marker를 tool payload에만 넣고, TUI 관찰·`thread/read`/item/event trace·생성 응답을 같은 deliveryId로 함께 기록한다. 표시 성공이나 다음-turn 수동 질의로의 marker 회수만으로는 자동 work-loop PASS가 아니다.
- `mcpServer/tool/call` 또는 raw `mcp_call` item 주입 중 어느 것도 현재 자동 생성의 증거가 없다. 자동 turn이 없다면 해당 후보는 presentation/context candidate일 뿐, 요구된 Claude→Codex delegation ingress로 채택하지 않는다.

### 2026-07-19 20:12 · W2 mcpServer/tool/call autonomous-generation probe failed

- 실측 환경: Codex CLI 0.144.6 isolated App Server와 compiled aiox MCP를 사용했다. generated schema에서 `mcpServer/tool/call` params는 `{threadId, server, tool, arguments?, _meta?}`, 응답은 `{content, structuredContent?, isError?, _meta?}`로 확인했다. `mcpServerStatus/list`는 aiox ready 및 두 tool을 반환했다.
- materialized thread의 baseline turn 뒤 `mcpServer/tool/call`로 `aiox_send_message`를 marker와 함께 호출했다. RPC는 tool result(격리 socket의 예상 ENOENT error)를 반환했지만, post-call notification은 0개였고 `turn/started`, `turn/completed`, `item/started`, `item/completed`가 없었다. `thread/read(includeTurns:true)`에는 baseline user/agent message만 남았고 MCP call item이나 marker가 없었다.
- 결론: 현재 버전에서 이 named method는 configured MCP tool을 직접 호출할 뿐, thread model context에 결과를 저장하거나 자동 생성 turn을 시작하지 않는다. 따라서 요구된 native activity + model-read + autonomous generation ingress로는 FAIL이다. GUI TUI frame은 별도 capture하지 못했지만, App Server stream/persisted thread에 TUI가 렌더할 activity item이 없었으므로 native activity 표시도 증명되지 않았으며 기대하지 않는다.
- 다음 disposition: `mcpServer/tool/call`은 final ingress 후보에서 제외한다. `turn/start` canonical envelope fallback을 선택하기 전, raw `mcp_call` item injection이 TUI item rendering과 context/automatic generation을 바꿀 수 있는지 별도 spike로만 판정한다; 그것도 자동 turn을 만들지 못하면 final ingress가 아니다.

### 2026-07-19 20:15 · W2 mcpServer/tool/call probe scope correction

- 정정/범위 한계: 직전 `mcpServer/tool/call` probe는 Claude→daemon→Codex의 성공한 end-to-end inbound delivery가 아니었다. probe client가 isolated Codex App Server에 직접 RPC를 보냈고, App Server가 configured aiox MCP의 기존 `aiox_send_message`(Codex→daemon 방향) tool을 실행했다. 격리 daemon socket 부재로 tool result는 예상 ENOENT error였다.
- 이 probe가 직접 증명한 것은 error result를 반환한 direct `mcpServer/tool/call`이 turn/item persistence나 autonomous generation을 만들지 않았다는 점이다. 성공한 aiox tool result에서도 native TUI item·model context·automatic turn이 없는지는 아직 실측하지 않았다. 따라서 end-to-end rejection 또는 final transport disposition으로 과장하지 않는다.
- 다음 정확한 검증은 controlled success fixture MCP tool(예: `aiox_inbound_delivery`)을 configured target thread에서 성공 호출하고, 그 결과로 TUI item·thread history·model visibility·automatic generation을 관찰하는 것이다. 이 call 자체가 daemon→Codex ingress를 대체한다는 보장은 없으며, direction과 wake semantics는 별도로 판정한다.

### 2026-07-19 20:19 · W2 combined MCP-activity plus turn-start candidate clarified

- 사용자 제안의 정확한 후보는 단일 `mcpServer/tool/call` wake-up이 아니라 두 단계 ingress다: Claude의 aiox send tool → daemon delivery → daemon이 target Codex App Server의 configured temporary receive MCP tool을 `mcpServer/tool/call`로 성공 호출하여 native activity를 만들고 → daemon이 별도 `turn/start`로 Codex generation을 시작한다.
- 이 후보의 spike는 paired/live Codex TUI와 its loaded thread에 연결한 상태에서, temporary `aiox_inbound_delivery` fixture MCP tool을 configured server로 등록하고 canonical marker envelope를 성공 반환하도록 해야 한다. 이어 daemon-equivalent dispatcher가 direct tool call과 trigger turn을 순서대로 보내고 TUI·thread items/events·grounded response를 같은 deliveryId로 대조한다. 실제 Claude caller는 daemon ingress와 동등한 request를 쓰는 controlled sender로 우선 대체 가능하되, 최종 수직 검증에서는 Claude tool까지 연결한다.
- 별도 판정: App Server 문서상 `turn/start`는 user input을 추가한다. 그러므로 이 두 단계가 답변을 자동 생성하더라도 trigger가 TUI에서 user-message로 보이는지, tool activity와 어떻게 함께 보이는지는 실측 성공 조건으로 남긴다. 이를 숨겨진 wake-up이라고 가정하지 않는다.
- 상태: 이는 raw tool-call-only 후보가 아니라 new combined presentation+wake candidate다. 기존 direct errored tool-call probe는 이 candidate의 PASS/FAIL 판정에 사용할 수 없으며, W2 contract revision이나 implementation 전 isolated presentation spike가 필요하다.

### 2026-07-19 20:26 · W2 desired single-call MCP ingress semantics corrected

- 사용자 의도 정정: 목표 후보는 daemon의 단일 `mcpServer/tool/call`이 canonical envelope을 target Codex TUI의 native tool activity로 주입하고, 같은 tool result를 Codex 모델이 읽어 자동 생성 turn/답변까지 만드는 end-to-end semantics다. 별도의 `turn/start`는 이 후보의 필수 단계가 아니라, 후보가 실패할 때만 검토할 fallback이다.
- 따라서 기존 설명의 presentation+wake 두 단계 조합은 사용자의 가설을 대체하지 않는다. 다음 spike는 temporary successful receive MCP tool + paired/visible Codex TUI + App Server websocket로 이 단일-call 가설의 4개 효과(TUI render, persisted item, model visibility, autonomous grounded generation)를 한 번에 판정해야 한다.
- 현재 direct error-result probe는 tool/call 단독의 no-item/no-turn negative signal일 뿐 성공한 receive tool과 live TUI의 definitive rejection은 아니다. W2 remains unaccepted.

### 2026-07-19 20:33 · W2 successful single-call MCP fixture disproved autonomous generation

- Successful-fixture probe: a fresh Codex CLI 0.144.6 App Server was launched with temporary `aiox_inbound.deliver_message` stdio MCP fixture. After a materialized baseline turn, external `mcpServer/tool/call` with `{deliveryId:"delivery-1", marker:"AIOX_MCP_PRESENTATION_MARKER"}` returned successful `content` and `structuredContent`.
- Direct observation after success: `thread/read(includeTurns:true)` still contained only the baseline user/agent items. No MCP item, marker, new turn, status transition, or automatic grounded response appeared. This removes the prior daemon-socket ENOENT tool error as the explanation for absent context/wake behavior.
- Conclusion: the desired single-call semantics fails the required model-context and autonomous-generation conditions on a successful fixture. A visible TUI was not attached in this headless preflight, so native activity rendering itself remains unobserved; it cannot rescue the candidate because autonomous response already fails. Temporary App Server was stopped.
- Spike artifacts added: `client.ts` has a tested `mcp-call` request path; `inbound-fixture.ts` is a controlled success MCP tool; README documents the four independent observations. Verification: focused 10 tests, `pnpm typecheck`, `git diff --check` passed.
- Disposition: do not request user TUI observation for this single-call candidate unless only presentation evidence is independently desired. It cannot meet the combined product requirement. Any `turn/start` fallback is a distinct contract that visibly adds user input and must be chosen explicitly.

### 2026-07-19 20:37 · W2 paired TUI rejects successful external MCP tool-call presentation

- Paired-TUI probe: a user opened a remote Codex TUI on the temporary App Server. `thread/loaded/list` found its one loaded thread. External `mcpServer/tool/call` invoked the successful `aiox_inbound.deliver_message` fixture with `deliveryId=delivery-tui-1` and `marker=AIOX_TUI_PRESENTATION_MARKER`; the App Server returned the expected successful content and structured result.
- Direct user observation: no new tool activity or other visible TUI change appeared. This closes the previously unobserved presentation dimension as FAIL for the single external tool-call candidate.
- Combined evidence: Attempt 6 proves no persisted model context/autonomous generation after successful tool result; Attempt 7 proves no native recipient-TUI presentation. Therefore external `mcpServer/tool/call` cannot implement the desired daemon→Codex single-call ingress semantics in the tested Codex CLI 0.144.6 setup.
- Status: W2 remains unaccepted. Keep the temporary paired process alive until the user finishes inspecting it or asks cleanup; do not silently change to `turn/start`.

### 2026-07-19 20:42 · 2026-07-19 20:45 · W2 Codex channel ingress capability survey

- 조사 결과(확인 사실): Codex CLI 0.144.6 experimental App Server v2 generated schema의 ClientRequest 전체에, 일반 TUI thread로 외부 named channel/notification/event를 push하는 API는 없다. `thread/inject_items`는 model-visible history append이며 user turn을 시작하지 않는다. `turn/steer`는 active `expectedTurnId`와 user input을 요구하고, `thread/realtime/appendText`는 experimental realtime input(role 기본값 user)이다.
- 기존 실측과의 결합: 성공한 `aiox_inbound.deliver_message` fixture의 external `mcpServer/tool/call`은 paired TUI에서 새 activity가 표시되지 않았고, thread item·model context·autonomous turn도 만들지 않았다. 따라서 Claude식 inbound channel의 대체로 채택할 수 없다.
- 후보의 한계(추론): `thread/inject_items` 안에 raw `function_call`/`function_call_output` 또는 custom tool response item을 넣는 것은 schema-accepted shape일 수 있으나, native Called activity 렌더·MCP tool binding·자동 wake의 근거가 없다. 별도 channel API로 주장하지 않는다.
- 상태: named standard-TUI conversation에 Claude-style channel push를 구현하는 현재 App Server protocol capability는 확인되지 않았다. W2는 unaccepted이며, user-input `turn/start` fallback을 선택하지 않는다.

### 2026-07-19 20:45 · W2 raw canonical MCP tool-call injection is silently ignored

- Raw item probe: a normal Codex turn genuinely called the controlled fixture and produced persisted canonical App Server `mcpToolCall` item (`server=aiox_inbound`, `tool=deliver_message`, completed status, arguments and result). Its source TUI rendered native `Called aiox_inbound.deliver_message(...)` plus result.
- The exact captured item was then used as raw `thread/inject_items` input in another loaded thread. The RPC returned `{}`, but there was no persisted item/turn, no model visibility (a later explicit user question said the result was absent), no autonomous turn, and no TUI activity even when a TUI was attached. Thus `{}` is not evidence of UI-item injection.
- Result: raw canonical `mcpToolCall` injection fails all required effects. Raw Responses input and App Server display ThreadItems are distinct; raw injection is not a supported construction route for native activity in this tested version.
- Cleanup: the user-visible temporary App Server at `127.0.0.1:4501` and its fixture were terminated at user request; readyz now refuses connections.

### 2026-07-19 20:50 · W2 required UX is renderer-owned activity, not expandable user JSON

- User compared actual TUI surfaces: `turn/start` with the full canonical JSON renders as an ordinary expandable user message containing raw JSON, not as the desired compact native activity. The desired reference is a completed hook/activity row (`SessionStart hook (completed)` with collapsed context and transcript expansion), i.e. a renderer-owned ThreadItem surface with title/status/detail rather than text formatting.
- Consequence: wrapping, shortening, or pretty-printing the `turn/start` envelope cannot meet the required UX; it remains a user message. The negative evidence for external `mcpServer/tool/call` and raw `mcpToolCall` injection means neither provides that ThreadItem creation route in the tested setup.
- Remaining candidate boundary: generated schema exposes model-driven `dynamicToolCall` / `item/tool/call` which is structurally closer to native activity but is experimental/unverified TUI behavior, starts only inside an explicit `turn/start`, and cannot synthesize an idle external inbound item. Do not describe it as a solution until a focused paired-TUI spike passes.

### 2026-07-19 20:52 · W2 disposition selects turn-start canonical envelope with explicit UX limitation

- User disposition after direct TUI probes: choose canonical envelope via `turn/start` as the current best Codex ingress. This explicitly accepts that the envelope is rendered as a user-message JSON surface, not native activity; no concealment field or renderer-owned external activity creation route was verified.
- Consequence for W2: do not accept the current `thread/inject_items` developer-item transport merely as a minimal asynchronous contract when the product choice is automatic generation. Reconcile the candidate toward `turn/start` canonical envelope while retaining independent valid work: `message_deliveries.id` as deliveryId, canonical renderer, typed metadata persistence, and `delivered` rather than false `completed` on injection acceptance.
- Unresolved/explicitly excluded from this selection: active-turn accept/queue/defer/reject policy, receipt/ack, dedupe/retry/recovery, and native TUI activity. `turn/start` starts generation for the tested idle thread but its active-turn behavior must not be assumed. W3 reply authorization/source-only route remains gated on accepted W2 result.
- Handoff instruction: the next Codex should revise the W2 Task Brief before changing code/tests, retract named developer injection transport-only assertions, restore canonical JSON as the `turn/start` user input, update affected tests, then run required focused suites/live idle-thread probe. It must record the user-message JSON UX as an accepted limitation and not claim native activity.

## 2026-07-19 · 2026-07-19 · W2 turn-start contract revision and candidate verification

- Contract review: user-selected `turn/start` is inside the existing W2 allowed write-set; its App Server ABI is `input: [{ type: "text", text }]`, not a raw string. This replaces, rather than coexists with, the withdrawn developer `thread/inject_items` transport.
- TDD result: the canonical-input assertion was RED against the withdrawn transport, GREEN after restoring `turn/start`; an ABI correction was separately RED/GREEN after the live probe confirmed the input-array form. DeliveryId binding, typed metadata persistence, profile-derived addresses, and the `delivered` (not `completed`) transition remain in the candidate.
- Verification: 91 focused tests across adapter/daemon/core/store groups passed; `pnpm typecheck`, `git diff --check`, and package registry integrity passed. An isolated Codex CLI 0.144.6 App Server idle thread persisted the exact `probe-delivery-1` envelope as a `userMessage` and started a turn; the model began an agent response. The temporary App Server was terminated.
- Limitation: this confirms selected idle-thread turn creation and user-message JSON persistence, not native activity, receipt/ack, active-turn policy, retry/dedupe/recovery, or a production daemon-issued delivery trace. The candidate requires controlling result review before W2 can be accepted and before W3 starts.

## 2026-07-19 · 2026-07-19 · W2 result review accepted

- Result review scope: revision-3 Task Brief, `src/adapters/codex/injector.ts`, affected daemon/adapter/core/store tests, and the isolated App Server trace were rechecked. The source sends exactly one `turn/start` request with `input: [{ type: "text", text: canonicalEnvelope }]`; no developer `thread/inject_items` fallback remains.
- Accepted result: `message_deliveries.id` remains the sole public deliveryId, typed metadata and profile-derived canonical addresses remain rendered, and injection acceptance remains `delivered` rather than `completed`. The 91 focused tests, typecheck, diff check, and registry check passed. The live idle-thread trace persisted the same `probe-delivery-1` canonical JSON as a user message and began generation.
- Accepted limitation: native activity is not implemented; raw JSON is visibly a user message. Receipt/ack, active-turn accept/queue/defer/reject, retry/dedupe/recovery, and production daemon-issued live correlation are not claimed by W2 and remain outside this accepted slice.
- Disposition: accept W2 revision 3. Its transport result is now available to W3, whose only scope is authenticated reply right and original-source-only routing; W3 must not treat this result as acknowledgement or an active-turn policy.

### 2026-07-19 21:17 · W2 post-acceptance review found verification-count drift and a schema-test regression

- 확인 사실: revision-3 source는 production Codex ingress에서 `thread/inject_items`를 호출하지 않고, `turn/start`에 `{ input: [{ type: "text", text: canonicalEnvelope }] }` 하나를 보낸다. canonical JSON에는 message-deliveries id, source/target profile address, intent/replyExpected, text/plain content, createdAt이 포함되고 성공 직후 delivery status는 `delivered`에 머문다.
- 독립 검증: 명시된 7개 관련 test files는 75 tests PASS였고, `pnpm typecheck` 및 `git diff --check`도 PASS였다. 따라서 기존 기록의 “91 focused tests”는 이 재현 명령과 일치하지 않으며, 정확한 별도 91-test command를 기록하거나 75로 정정해야 한다.
- 발견한 회귀: `pnpm vitest run tests/unit/store/repositories/pairs.test.ts --reporter=verbose`가 1개 실패했다. migration 2가 schema_version에 `{ version: 2 }`를 추가하지만 legacy migration assertion은 `{ version: 1 }`만 기대한다. 이는 sandbox network 제한과 무관한 assertion drift다. W2 accepted verification의 “relevant/full suite green”으로 해석해서는 안 되며, W3 진행 전 이 테스트 expectation을 migration-2 contract에 맞춰 갱신하고 전체 검증 범위를 다시 보고해야 한다.
- 범위 한계: full `pnpm test`의 network/listen 실패들은 기존 로그가 설명한 sandbox EPERM 계열이라 W2 전환의 새 결함으로 판정하지 않았다.

## 2026-07-19 · 2026-07-19 · W2 verification provenance corrected

- Verification-count correction: the prior `91` and the separate post-review `75` claims are both superseded by a reproducible current command: `pnpm vitest run tests/unit/adapters/codex-injector.test.ts tests/unit/adapters/codex-runtime.test.ts tests/unit/daemon/codex-ingress.test.ts tests/unit/adapters/fake-integration.test.ts tests/unit/core/messages.test.ts tests/unit/daemon/message-fanout-store.test.ts tests/unit/store/repositories/messages-deliveries.test.ts tests/unit/store/repositories/pairs.test.ts`. Its direct output is 8 files / 93 tests PASS.
- Schema correction: `tests/unit/store/repositories/pairs.test.ts` was RED because its legacy migration test expected only `{ version: 1 }`, while migration 2 correctly added `{ version: 2 }`. The test now expects `[1, 2]` and is GREEN; this was expectation drift, not a sandbox network/listen limitation.
- Revalidation: the 93-test command, `pnpm typecheck`, and `git diff --check` passed. W2 remains accepted with its corrected verification provenance; W3 has not been implemented in this correction.

## 2026-07-19 · 2026-07-19 · W3 pre-implementation verification

- 확인 사실: W3 task record는 execution not started이며, current `receiveCodexReply`와 `receiveClaudeChannelReply`는 `inReplyToDeliveryId`를 `parentMessageId`로만 projection한 뒤 `runSendMessageTransaction`과 replying agent의 active outbound routes로 fan-out한다. reply-right persistence/consumption과 original-source-only dispatch는 없다.
- 검증: `pnpm vitest run tests/unit/daemon/codex-ingress.test.ts tests/unit/adapters/codex-mcp-server.test.ts tests/unit/adapters/claude-channel.test.ts tests/unit/store/repositories/messages-deliveries.test.ts`는 100 PASS, 3 FAIL였다. 3개 실패는 Claude HTTP listener bind의 sandbox `listen EPERM`이며 W3 assertion failure는 아니다. `pnpm typecheck`와 `git diff --check`는 PASS했다.
- 판정: Existing green tests are not W3 completion evidence: they confirm legacy parent-link/general-route behavior and no test currently exercises unknown delivery, wrong target, replyExpected false, duplicate consumption, or exactly-one original-source delivery. W3 remains active and unimplemented; no acceptance or reply-right claim is made.

### 2026-07-19 21:34 · W3 candidate review: incomplete coverage, missing-right atomicity risk, and stale task record

- 확인 사실: W3 candidate는 `reply_rights` migration 3과 `runReplyTransaction`을 추가했고, normal new `replyExpected:true` delivery에는 right를 grant한 뒤 authenticated target identity를 확인하고 원 source 하나에 routeId null delivery를 만든다. unknown/reply-not-expected/one-time consumption focused Codex tests는 PASS했다.
- 미충족 완료 기준: Task Brief가 요구한 wrong-target (`correlation_mismatch`)와 alternate outbound route가 있어도 original source 한 곳만 받는 source-only 반증 test는 현재 없다. 전체 `tests/unit/daemon/codex-ingress.test.ts`는 47개 중 12개 실패하며, checkpoint도 이를 legacy Claude-reply expectations의 미전환으로 기록한다. 그러므로 W3를 완료/수용으로 표기할 수 없다.
- 결함 후보: `runReplyTransaction`은 reply_rights row 존재를 확인하지 않고 message/delivery를 먼저 insert한 뒤 consume한다. row가 없는 기존 replyExpected delivery에서는 consume=false로 `duplicate_reply`를 반환하지만 transaction은 rollback하지 않아 orphan reply message/delivery가 commit될 수 있다. migration 3 역시 기존 deliveries의 reply rights를 backfill하지 않는다. 먼저 right 존재를 authorization 조건으로 확인하고, consume 실패는 rollback해야 하며, legacy-data policy/backfill 여부를 명시·검증해야 한다.
- 기록 정합: W3 task record는 여전히 “execution not started / verification not run”으로 남아 controlling log의 active TDD checkpoint와 불일치한다. 결과를 acceptance review에 올리기 전에 Attempt/verification 상태를 task record에 갱신해야 한다.

## 2026-07-19 · 2026-07-19 · W3 reply-right TDD checkpoint

- TDD RED→GREEN: unknown delivery rejection, `replyExpected:false` rejection, and one-time right consumption now have focused Codex ingress tests.
- Implementation candidate: migration 3 adds persisted `reply_rights`; each `replyExpected:true` delivery grants one right. Reply ingress authenticates Codex first, resolves the originating delivery, checks target identity/flag/consumption, then creates exactly one route-less delivery to the original source and atomically consumes the right. Claude channel reply shares the same resolver after its channel boundary.
- Current verification: `pnpm vitest run tests/unit/daemon/codex-ingress.test.ts -t "daemon receiveCodexReply"` is 7 PASS; `pnpm typecheck` and `git diff --check` PASS. Full Codex ingress suite is not yet green: 12 legacy Claude-reply assertions still encode `chatId`/general-route behavior or expect non-null route ids, and must be converted to canonical deliveryId/source-only expectations before result review.
- Status: W3 remains active; do not accept until the full affected suite, wrong-target/source-only assertions, MCP/daemon result mapping, and schema migration tests pass.

### 2026-07-19 22:58 · W3 follow-up review: rollback fixed, but backfill semantics and public-error contract remain

- 재검증 PASS: current `runReplyTransaction`은 missing right를 reply insert 전에 `reply_right_unavailable`으로 거부한다. consume=false는 sentinel throw로 `withTransaction` rollback을 거친 뒤 typed error로 반환하므로 이전 orphan-commit 위험은 해소됐다. wrong-target 및 alternate route source-only tests도 추가돼 Codex reply focused command는 10 PASS였다.
- 미해결 migration semantics: migration 3 backfill query는 모든 `messages.reply_expected = 1` delivery에 unconsumed right를 만든다. 과거 reply message의 `parent_message_id = originating deliveryId`를 검사해 already-consumed right로 backfill하지 않으므로, migration 전에 이미 답한 delivery의 reply right를 다시 열 수 있다. one-reply invariant를 유지하려면 existing correlated reply를 consumed state로 backfill하거나 과거 records에 대한 explicit policy와 test가 필요하다.
- 공개 오류 계약 drift: `reply_right_unavailable`은 daemon union에는 추가됐지만 lifecycle v1 typed error list와 Codex MCP typed reply error fixtures에는 없다. corruption/migration-gap error로 외부에 노출할지, existing contract error로 map할지 결정·문서화·MCP test가 필요하다.
- 검증: `tests/unit/store/schema.test.ts`와 `tests/unit/store/repositories/pairs.test.ts`를 재실행하면 각각 reply_rights table expectation 및 schema version 3 expectation 미갱신으로 실패한다. migration 3 backfill을 직접 검증하는 test도 없다. 따라서 W3 remains active/unaccepted; full Claude reply conversion 외에도 이 migration/public-error 정합이 result review의 선행 조건이다.

## 2026-07-19 · W3 re-review: consumed backfill fixed, but public contract and deterministic migration remain

- 확인 사실: migration 3은 now prior reply message(`parent_message_id = originating deliveryId`)를 찾아 consumed message/delivery/timestamp까지 backfill하며, 새 schema test가 그 경우를 PASS했다. schema table expectation과 legacy schema version expectation도 갱신돼 schema/pairs tests PASS다.
- 미해결 공개 계약: daemon은 `reply_right_unavailable`을 반환하지만 `docs/specs/aiox-message-lifecycle.md` v1 typed error 목록과 `tests/fixtures/aiox-message-lifecycle-contract.ts` / Codex MCP fixture에는 여전히 없다. MCP handler가 generic reason으로 외부에 노출하므로 이 누락은 실제 public-contract drift다.
- 미해결 backfill 결정성: migration query의 `left join message_deliveries reply_delivery on reply_delivery.message_id = reply.id`는 과거 general-route fan-out reply가 여러 delivery를 가졌을 때 여러 후보를 만들며 `insert or ignore`의 최초 row에 의존한다. `consumed_reply_delivery_id`가 어떤 값이 되는지 SQL order가 보장하지 않는다. one source-only target으로 가정하지 말고 deterministic selection 또는 migration policy/test를 추가해야 한다.
- 독립 검증: `pnpm vitest run tests/unit/daemon/codex-ingress.test.ts tests/unit/store/schema.test.ts tests/unit/store/repositories/pairs.test.ts tests/unit/adapters/codex-mcp-server.test.ts` 결과 schema/pairs/MCP tests는 PASS이나 Codex ingress는 50 tests 중 12 FAIL이다. 이는 아직 전환되지 않은 Claude reply test setup/assertion들이다. W3 remains active/unaccepted.

## 2026-07-19 · 2026-07-19 · W3 completion candidate verification

## 2026-07-19 · W3 completion candidate verification

- 확인 사실: legacy Claude reply test 12개를 canonical delivery correlation으로 전환했다. 원본은 `replyExpected:true`를 명시하고, stored reply parent는 원 `deliveryId`, direct original-source delivery의 `route_id`는 null을 기대한다. Claude target runtime이 없는 경우도 실제 originating delivery를 만든 뒤 deferred dispatch를 검증한다.
- Migration 결정성: migration 3은 canonical historical reply를 consumed로 backfill하며, 동일 reply message의 과거 delivery가 여럿이면 `created_at, id` 순 첫 delivery를 `consumed_reply_delivery_id`로 선택한다. 이를 schema test로 검증했다.
- 공개 오류 계약: missing `reply_rights` row는 공개 새 code가 아니라 기존 `duplicate_reply`로 fail-closed mapping된다. lifecycle spec, MCP typed-reply fixtures, daemon/API union은 모두 `unknown_delivery`, `correlation_mismatch`, `reply_not_expected`, `duplicate_reply` 네 code로 일치함을 확인했다.
- 검증: `pnpm vitest run tests/unit/daemon/codex-ingress.test.ts tests/unit/store/schema.test.ts tests/unit/store/repositories/pairs.test.ts tests/unit/adapters/codex-mcp-server.test.ts` → 4 files / 88 tests PASS; `pnpm typecheck` PASS; `git diff --check` PASS.
- 상태: W3 implementation candidate의 known local assertion failures는 해소됐다. controlling result review 전까지 W3는 active/unaccepted다.

## 2026-07-19 · 2026-07-19 · W3 accepted result review

## 2026-07-19 · W3 accepted result review

- 검토 판정: 외부 검토가 제시한 one-reply consumption, original-target authentication, source-only route-less delivery, transaction rollback, consumed backfill 및 공개 오류 계약 근거를 현재 코드에서 재확인했다. W3 목표 계약은 수용 가능하다.
- follow-up fix: reviewer가 재현한 duplicate reply `messageId`의 raw SQLite constraint 예외를 `duplicate_reply` typed rejection으로 매핑했다. rollback 뒤 message/delivery count가 불변임을 daemon test로 검증했다.
- cutover cleanup: 사용되지 않는 `ReceiveClaudeChannelReplyRequest.chatId` alias를 제거하고, Claude event tests를 `inReplyToDeliveryId` assertion으로 전환했다. 실제 Claude channel MCP handler는 이미 canonical deliveryId만 전달한다.
- coverage follow-up: Codex MCP reply handler가 `unknown_delivery`, `correlation_mismatch`, `reply_not_expected`, `duplicate_reply`를 각각 실제 error result로 relay하는 test와, initial/right-chain grant를 DB에서 직접 확인하는 test를 추가했다.
- 재검증: core 4-file command는 88 PASS. follow-up 포함 five-file run은 127 PASS; 3 failures는 변경과 독립적인 sandbox Claude HTTP listener `listen EPERM`이다. daemon Claude reply-event focused test는 3 PASS, `pnpm typecheck` 및 `git diff --check` PASS.
- disposition: W3 Attempt 1을 accepted로 수용한다. listener bind는 network-bind-capable environment에서만 별도 재검증 가능하며, W3 코드 변경의 실패로 분류하지 않는다.

## 2026-07-19 · 2026-07-19 · W4 legacy content-shape cutover accepted

## 2026-07-19 · W4 legacy content-shape cutover accepted

- closeout 대조에서 발견한 G1-A→G1-B handoff 누락을 처리했다. daemon public ingress request는 `content: { text }`만 허용하며, `typedText()`·`text?`·reply `parentMessageId` compatibility alias는 제거됐다. 내부 message store의 string content representation은 공개 request shape와 별개로 유지된다.
- TDD: request field 제거로 legacy callers가 typecheck에서 RED가 된 뒤, Codex/Claude daemon test callers를 typed object로 전환하고 stored/adapter body의 string assertions을 보존해 GREEN을 확인했다.
- 검증: `tests/unit/daemon/codex-ingress.test.ts` 52 PASS; Claude reply-event focused 3 PASS; `pnpm typecheck`, `git diff --check` PASS.
- result review: G1-B pre-registered content-shape handoff와 canonical intent envelope requirement의 대조를 완료했다. intent는 existing canonical envelope tests에서 보존되며, compatibility cutover 항목은 W4로 수용한다. W4 accepted.

## 2026-07-19 · 2026-07-19 · G1-B package closeout

## 2026-07-19 · G1-B package closeout

- 완료 범위: W1 contract/integration, W2 canonical delivery envelope via `turn/start`, W3 authenticated one-reply right/source-only routing, W4 typed `{ text }` content cutover가 모두 accepted다. public reply correlation은 canonical deliveryId를 사용하며 compatibility aliases를 남기지 않는다.
- evidence disposition: isolated idle-thread probe는 canonical envelope JSON의 persistence와 turn start를 확인했지만, native TUI activity·receipt/ack·active-turn policy·dedupe/retry/recovery를 확인하지 않았다. 이 한계는 G1-A W1 evidence owner에 소비됐고 Codex Tier 3 유지 및 G1-C 범위로 분류됐다.
- verification: W3 core 4 files/88 PASS, W4 Codex ingress 52 PASS 및 Claude reply-event 3 PASS, typecheck/diff PASS. Claude HTTP listener 3개는 sandbox `listen EPERM`으로 network-bind 환경 재검증이 필요하다.
- closeout: Return Target을 G1-A W1에 소비했고 package registry integrity가 PASS다. G1-B를 decided로 닫는다.
