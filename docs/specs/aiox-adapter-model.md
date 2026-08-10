# aiox A2A — Adapter Model (4-slot + capability tier) (§5)

This slice belongs to the [[docs/specs/aiox-a2a]] compatibility index. The index owns shared status vocabulary,
layer model and glossary; this slice owns the adapter model contract and current implementation caveats.

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
  authenticated identity, adapter/runtime automatic control-plane ack와 idempotent duplicate 처리를 모두 제공한다.
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

같은 tier의 adapter가 같은 transport나 같은 관측 수단을 가질 필요는 없다. 현재 tier 분류는
adapter 간 공통 delivery FSM 구현을 뜻하지 않으며, 지원하지 않는 보장을 성공처럼 보고하면 안
된다.

Current implementation caveats:

- The shared adapter interface is not yet the full 4-slot runtime model. It is
  currently `AgentAdapter { kind, inject(input) }`, and `AdapterInjectResult`
  distinguishes `success`, `failed` and `deferred`. Current evidence:
  [[src/adapters/contract.ts]] — `src/adapters/contract.ts:19-56`,
  [[src/adapters/router.ts]] — `src/adapters/router.ts:87-114`,
  `src/adapters/router.ts:140-178`,
  [[tests/unit/adapters/fake-integration.test.ts]] — `tests/unit/adapters/fake-integration.test.ts:437-541`.
- The daemon still contains a direct Codex/Claude dispatch branch in the
  production message path. A general adapter dispatch registry is an
  Implementation Gap / execution-plan item, not a Current Contract. Current
  evidence: [[src/daemon/state.ts]] — `dispatchToPairPeers` and
  `dispatchToPairPeersNow`.
- Adapter 4-slot and pair slots are different concepts. Current pair capacity
  is a vendor-agnostic two-slot model, `PairSlot = "a" | "b"`; same-vendor
  pairs can occupy both slots and become ready. Current evidence:
  [[src/core/pairs.ts]] — `src/core/pairs.ts:23-45`, `src/core/pairs.ts:76-130`,
  [[tests/unit/core/pairs.test.ts]] — `tests/unit/core/pairs.test.ts:110-159`.
- Current code surfaces typed injection `failed`/`deferred` results, but does
  not expose a runtime tier evaluator or diagnostics API that proves every
  wake-up, ack, correlation and dedupe guarantee. The tier matrix below is
  therefore a compatibility/status classification, not proof that a runtime has
  a complete Tier 1/2 guarantee.

Current adapter matrix (2026-07-21):

| Runtime         | Launch/attach                               | Ingress                                         | Egress                                             | Identity/correlation                                            | Effective tier                                                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------- | ----------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex CLI       | daemon-owned app-server + TUI launch/resume | canonical envelope JSON through `turn/start` | launch-scoped MCP `send`/`reply`, plus the shared `aiox_retransmit_unconfirmed_delivery` manual retransmit tool | authenticated agent token, bound thread, and public deliveryId correlation | **Tier 3**. Correlated `turn/start` success establishes delivery acceptance, not target receipt or work completion. Post-write ambiguity becomes `unconfirmed` without automatic reinjection; a late matching success may resolve it. The TUI presents raw envelope JSON rather than native activity UI, and native activity, delivery observability, active-turn semantics, target receipt, and target/LLM-action dedupe remain unavailable. Daemon handling still makes a late or duplicate response for the same internal `requestId` a no-op after resolution. |
| Claude Code CLI | effective Local/User/Project static MCP dev-channel launch (`aiox claude setup --scope …` + `server:<name>`) | canonical envelope JSON through `/send.content`, delivered unmodified as the host-owned outer `<channel>` body | typed channel `send`/`reply`, plus the shared `aiox_retransmit_unconfirmed_delivery` manual retransmit tool | channel registration uses a session token verified at daemon registration; `/send` HTTP ingress has no per-request auth in the current code. `inReplyToDeliveryId` is typed by the egress tool. | **Tier 3**. Channel HTTP acceptance is delivery acceptance, not target receipt/work completion. Claude uses a different observation means: 2xx is `delivered`; an explicit non-2xx is `failed`; a positively identified `ECONNREFUSED` defers to the bounded pre-write queue; `AbortError`/timeout and any other fetch failure whose pre-write nature is not provable is `unconfirmed` with no automatic retry. Claude has no late-response observer, so both a primary push and a manual retransmit resolve immediately only. |

Claude registers the same separately named `aiox_retransmit_unconfirmed_delivery`
recovery MCP tool as Codex. [Status: Current] This is not part of the common
messaging `send`/`reply` pair; it requires explicit duplicate-risk confirmation
and does not imply Codex-style late-response observation — a Claude retransmit
resolves immediately from the same fetch-based classification the injector uses
for a primary push, with no late correlation.

Both Codex and Claude targets symmetrically produce a daemon-originated source
outcome notification (`delivery_unconfirmed` or `delivery_target_rejected`)
for a primary delivery, distinct from the manual retransmit tool above.
[Status: Current] The canonical envelope, `(original delivery, outcome type)`
dedupe, and transition/notification independence are adapter-neutral; see
[[docs/specs/aiox-message-lifecycle]] §4.3 for the contract and
[[docs/decisions/delivery-outcome-notification-dedupe-by-type]] for the WHY.

Evidence:

- Claude retransmit tool registration, schema, and handler
  - [[src/adapters/claude/channel-server.ts]]
    - `src/adapters/claude/channel-server.ts:351-366`
    - `src/adapters/claude/channel-server.ts:475-517`
- Daemon-side Claude manual retransmit, immediate-only resolution
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:1867-1956`
- Cross-adapter schema/behavior parity
  - [[tests/unit/adapters/mcp-tool-contract-parity.test.ts]]
  - [[tests/unit/daemon/api.test.ts]]

지원 표에 없는 runtime은 이름만 adapter enum에 추가해서 지원으로 주장하지 않는다. 4-slot,
auth, ack, degradation test를 모두 기록한 뒤 tier를 부여한다.

Current local evidence for the matrix: Codex app-server/TUI launch and fixed MCP
projection are in [[src/adapters/codex/launcher.ts]] — `src/adapters/codex/launcher.ts:40-119`; Codex attach,
WebSocket initialization, proxy startup and runtime failure detection are in
[[src/adapters/codex/runtime.ts]] — `src/adapters/codex/runtime.ts:304-365`; proxy binding observes
`thread/start|resume|fork` responses in [[src/adapters/codex/proxy.ts]] — `src/adapters/codex/proxy.ts:58-193`;
Codex MCP send/reply descriptions and daemon client surface are in
[[src/adapters/codex/mcp-server.ts]] — `src/adapters/codex/mcp-server.ts:140-165`. Claude's static MCP definition and
identity/socket injection are in [[src/adapters/claude/launcher.ts]] — `src/adapters/claude/launcher.ts:30-48`
(`buildClaudeStaticMcpConfig`) and `src/adapters/claude/launcher.ts:70-86`
(`launchClaudeStaticMcpChannel`); channel send/reply/retransmit tool
registration and daemon registration are in [[src/adapters/claude/channel-server.ts]] —
`src/adapters/claude/channel-server.ts:323-366` and
`src/adapters/claude/channel-server.ts:608-642`; daemon-to-channel push and the
current unauthenticated `/send` boundary are in
[[src/adapters/claude/injector.ts]] — `src/adapters/claude/injector.ts:19-78` and
`src/adapters/claude/channel-server.ts:557-595`.

Claude 경로의 daemon-level 통합 증거 공백은 닫혔다. [Status: Current] channel push 실패가
어떤 delivery 상태로 귀결되는지 — ECONNREFUSED(직접·`error.cause.code` 경유 모두)의 bounded
pre-write queue 편입, AbortError/timeout/기타 ambiguous fetch 오류의 `unconfirmed` 귀결과
자동 재시도 부재 — 는 real daemon state 위에서 stubbed `fetch`로 검증됐다. 같은 unconfirmed
delivery에 대한 confirmation-gated manual retransmit도 Codex와 동일한 real-daemon 패턴으로
검증됐고, 한 daemon 인스턴스 안에 Codex·Claude target을 함께 붙여 두 adapter의 ok/reason 결과
shape가 대칭이며 서로의 delivery·event를 건드리지 않음을 확인하는 cross-adapter 증거도 있다.
`/send` ingress handler의 port binding과 POST→notification 정확한 canonical JSON 전달은
별도로 검증돼 있다. 남은 공백은 실제 `claude` CLI 프로세스와 실제 channel-server 자식
프로세스를 띄운 live end-to-end 증거뿐이며, 이는 W4 package-closeout의 direct TUI/CLI evidence
책임이다.

Evidence:

- unit-level push 결과 분류(2xx/명시적 non-2xx/ECONNREFUSED/기타 ambiguous fetch 오류)
  - [[tests/unit/adapters/claude-injector.test.ts]]
    - `tests/unit/adapters/claude-injector.test.ts:12-138`
- daemon-level delivery 상태 귀결과 pre-write fallback (real daemon state, stubbed `fetch`)
  - [[tests/unit/daemon/codex-ingress.test.ts]]
    - `tests/unit/daemon/codex-ingress.test.ts:525-675`
- daemon-level confirmation-gated manual retransmit (Claude 단독)
  - [[tests/unit/daemon/api.test.ts]]
    - `tests/unit/daemon/api.test.ts:1116-1323`
- cross-adapter manual retransmit 대칭성과 상호 격리 (같은 daemon 안의 Codex·Claude target)
  - `tests/unit/daemon/api.test.ts:1325-1413`
- MCP handler 레벨 retransmit 결과 렌더링
  - [[tests/unit/adapters/claude-channel.test.ts]]
    - `tests/unit/adapters/claude-channel.test.ts:939-1066`
- ingress HTTP는 port binding과 POST→notification 전달을 검증
  - `tests/unit/adapters/claude-channel.test.ts:1095-1179`
- cross-adapter MCP tool 이름/스키마 parity
  - [[tests/unit/adapters/mcp-tool-contract-parity.test.ts]]
- fake adapter 기반 Claude 경로 dispatch
  - [[tests/unit/adapters/fake-integration.test.ts]]
    - `tests/unit/adapters/fake-integration.test.ts:388-451`

Claude TUI ingress는 하나의 표면을 완전한 보장처럼 취급하지 않고 다음 fallback map으로
판독한다. 외부 CLI/hook 표면은 current adapter matrix와 함께 재검증한다.

- **Current primary:** static MCP channel notification/push. TUI를 유지하면서 비동기 전달할 수
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
