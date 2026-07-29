---
topic: G1-A Codex structured ingress evidence
description: Codex named app-server surface에서 typed A2A ingress의 관찰 증거를 수집하고 capability와 degradation을 분류하는 대기 단계.
status: decided
---

## Work Items

- [x] W1 named app-server surface에서 typed ingress, canonical correlation, wake-up·active-turn 및 실패 모드 evidence를 수집하고 capability/degradation으로 분류한다.
- [x] W2 W1 결과를 최종 evidence matrix와 G1-C reliability handoff input으로 정합화한다
- [x] W3 G1-C Codex Tier 3 reliability를 package로 구현·failure-injection 검증하고 결과를 소비한다 — detached: logs/G1/2026-07-20-G1-C-codex-tier3-reliability.md — reason: W2 evidence matrix가 분리된 cross-artifact reliability implementation과 closeout을 요구한다
- [x] W4 G1-A closeout readiness 및 owner reflection audit을 수행한다 — accepted/completed
- [x] W5 outbound reply envelope에 inReplyToDeliveryId를 emit하고 outcomeForDeliveryId를 lifecycle §4.1에 정식 편입하는 A1 corrective slice를 RED→GREEN으로 구현한다. accepted G1-B canonical-envelope 계약과 G1-C W12 outcome field를 context로만 소비하며 어느 package도 reopen하지 않는다.
- [x] W6 W6 G1-B/G1-C cutover의 현재 production model에 맞춰 전체 Vitest를 깨는 6개 stale exact test expectation만 정합화한다. production/schema/migration/docs/architecture/roadmap 및 W4/closeout은 변경·시작하지 않고, G1-B/G1-C를 reopen하지 않는다.
- [x] W7 roadmap reconciliation candidate edit과 검증을 유지하고 result review/acceptance 전에는 G1-A closeout 또는 plan handoff 상태를 바꾸지 않는다
- [x] W8 G1-A closeout readiness / plan-and-handoff reconciliation

## Required Context

### Return Target

- None: independent log.

### {Global}

- 이 stage는 Codex named app-server surface의 관찰 증거를 수집하고 capability/degradation을 분류한다. typed envelope·schema 구현의 완료나 G1-C reliability 구현을 대신 소유하지 않으며, schema/tool/fixture stage의 확정 typed contract를 소비한 뒤 활성화한다.
- G0가 Codex CLI version·검증일·OS·Node·version/capability preflight와 supported fallback 또는 명시적 실패 posture를 구현·검증한다. 이 stage는 그 결과를 실행 환경 evidence로 기록한다. 공식 지원 OS는 macOS·Linux이며 WSL2는 지원 범위 밖이다.
- 현재 Codex adapter는 Tier 3다. daemon-owned per-agent app-server, WebSocket, proxy, fixed MCP projection 및 turn/start compatibility path는 current fact이나 typed lifecycle·canonical ID propagation·runtime automatic receipt를 보장하지 않는다. generic turn/start 성공은 named app-server surface 검증이나 Tier 2 claim을 대체하지 않는다.
- 2026-06-11 version-generated schema에서 thread/inject_items, turn/steer, turn/started|completed, outputSchema, thread/tokenUsage/updated의 존재는 확인됐다. 이 stage는 그 behavior·usage visibility·Tier 2 semantics와 TUI 표시·idle wake-up·active-turn 충돌·canonical deliveryId 보존을 직접 검증한다. clientUserMessageId는 public docs 계약으로 확인되지 않았으므로 deliveryId binding 후보로만 취급한다.
- timeout, app-server process exit, WebSocket drop, unsupported method를 관찰해 evidence와 failure artifact를 남긴다. wake-up·ack·correlation·dedupe를 보장하지 못하면 Tier 2로 과장하지 않고 degradation 또는 G1-C handoff로 분류한다. automatic ack wiring/dedupe, retry/backoff, queued flush, stale/runtime recovery는 G1-C owner다.
- 입력 owner: gate/evidence 형식은 docs/product/roadmap.md G0·G1-A·G1-C, named-surface 제약은 docs/specs/aiox-open-deferred.md §9, tier/degradation은 docs/specs/aiox-adapter-model.md §5, current app-server/WebSocket/proxy/runtime gap은 docs/architecture/local-runtime-codex-adapter.md §7.2–§7.9, typed contract/canonical correlation은 docs/specs/aiox-message-lifecycle.md §4.1–§4.4, topology는 docs/decisions/codex-per-agent-app-server.md, runtime validation policy는 docs/decisions/runtime-support-and-agent-cli-validation-policy.md가 소유한다.
- 계약 결정의 상세 경위·대체된 중간 논의·최종 handoff 추가 근거가 필요할 때는 logs/G1/2026-07-10-G1-A-contractingress-freeze.md를 확인한다. 이 stage의 실행 기준은 이 {Global}과 여기서 가리키는 owner 문서이며, 과거 로그의 superseded된 판단을 현재 계약으로 되살리지 않는다.

### {W1}

- 다음 세션은 최신 W1 evidence matrix의 미완 항목만 실행한다. PASS는 현재 Codex CLI 0.144.5/macOS 환경에서의 관찰 범위일 뿐 named-surface의 미증명 보장을 대체하지 않으며, 각 미완 항목은 PASS 또는 Tier 3 degradation/관찰 불가 artifact로 종결한다.
- Active-turn ingress의 W1 성공 관찰은 steer 수용이 아니다. target이 active일 때 named ingress delivery가 queue로 보존되고, 기존 작업 완료 뒤 TUI에 표시되어 target이 그 메시지에 따른 작업을 시작하는지를 확인한다. steer는 별도 Codex runtime 선택지이며 W1 검증 대상·Tier 2 기준으로 사용하지 않는다.
- 재개 시 검증 완료·W1 검증 가능·별도 owner 항목을 혼동하지 않는다. Tier 2 가능성의 핵심 증거는 canonical deliveryId correlation과 authenticated structured egress이며, 누락 보장은 adapter flag로 노출해야 한다. TUI/wake-up·active-turn queue·outputSchema·timeout·WS drop은 W1 capability/degradation 관찰이고, ack·dedupe·retry·durable queue/recovery·queue flush 구현은 G1-C 범위다.
- 다음 세션 실행 순서: (1) 격리 app-server와 remote TUI로 idle 표시·wake-up, active-turn queued delivery, outputSchema, timeout/independent WS drop을 raw request/response·lifecycle·TUI outcome과 대조한다. (2) aiox daemon과 Codex target runtime 통합으로 canonical deliveryId correlation 및 authenticated structured egress를 확인한다. 각 항목은 PASS 또는 조건·raw artifact를 갖춘 Tier 3 degradation/관찰 불가로 종결하며, 자동 재시도는 dedupe 증명 전 하지 않는다. TUI 화면 최종 확인 또는 login/approval prompt가 필요할 때만 사용자에게 요청한다.

### {W5}

- W5는 accepted G1-B canonical-envelope 및 G1-C W12 outcome field를 context로만 소비한다. write-set은 src/daemon/state.ts의 formatAioxChannelEnvelope, docs/specs/aiox-message-lifecycle.md §4.1, 그리고 필요한 reply/envelope tests로 한정한다. schema/migration, legacy compatibility, W4 owner batch, roadmap 및 G1-A closeout은 제외한다. RED→GREEN으로 reply-only inReplyToDeliveryId, outcome-only outcomeForDeliveryId, Codex/Claude byte equality와 기존 reply authorization/reliability 회귀를 검증한다.

### {W6}

- W6 write-set은 tests/unit/core/messages.test.ts, tests/unit/store/repositories/messages-deliveries.test.ts, tests/unit/daemon/message-fanout-store.test.ts, tests/unit/daemon/socket-transport.test.ts뿐이다. exact .toEqual expectation에 originKind/outcomeForDeliveryId defaults, origin_kind/outcome_for_delivery_id DB row, countByStatus/deliveryCounts.unconfirmed: 0를 명시적으로 추가한다. production code·schema/migration·문서/roadmap과 W4 owner batch/G1-A closeout은 금지한다. RED는 이 네 파일의 exact vitest command에서 6 failure, GREEN은 focused 4 files와 full suite; 추가 실패는 분류만 한다. typecheck, git diff --check, log/package check 뒤 candidate evidence만 남기고 acceptance하지 않는다.

## 2026-07-18 · 2026-07-18 · Codex ingress evidence stage prepared

Codex structured ingress evidence stage의 독립 로그를 준비했다. 이 단계는 named app-server surface를 직접 관찰해 evidence와 degradation을 분류하며, generic turn/start 경로나 Tier 2 추정으로 대체하지 않는다.
현재 Tier 3 기준선, 환경 preflight, 관찰·실패 시나리오, G1-C reliability 경계와 owner 입력을 Required Context에 복원했다. plan pointer를 연결했지만 stage는 아직 대기 상태다.

### 2026-07-18 01:48 · 2026-07-18 · Claude review precision corrections applied

Claude 검토의 Nit 3건을 반영했다. G0는 preflight/fallback 구현·검증 owner이고 Codex stage는 그 결과를 evidence로 기록한다고 분리했다.
named app-server method는 존재 확인됨과 behavior·usage visibility·Tier semantics 검증 대상을 구분했으며, current app-server/WebSocket/proxy 근거의 Codex architecture 범위를 §7.2–§7.9로 정정했다.

### 2026-07-19 16:23 · 2026-07-19 · W1 named app-server direct evidence checkpoint

- 실행 환경: 2026-07-19 macOS Darwin 25.5.0 arm64, Node v24.14.0, Codex CLI 0.144.5. localhost app-server를 ws://127.0.0.1:51994에서 직접 기동했고 initialize 응답은 macOS/unix platform을 확인했다.

- Named surface: `thread/inject_items`와 `turn/steer`는 빈 request에서 각각 threadId 누락 오류를, inject_items는 threadId+빈 items에서 `items must not be empty`를 반환했다. unknown method는 -32600과 supported-method 목록을 반환했다. 이는 named method dispatch와 unsupported-method failure artifact의 직접 증거다.

- Typed ingress: 새 test thread에 raw developer Responses item(`aiox evidence deliveryId=g1a-evidence-delivery-019f7941`)을 `thread/inject_items`로 보냈고 `{}` 응답을 받았다. 이 호출만으로 turn 시작, TUI 표시, idle wake-up 또는 automatic ack는 관찰되지 않았다. `thread/items/list`는 experimentalApi capability 없이는 거부되어 injected raw item에서 canonical deliveryId가 별도 structured field로 보존됐다는 증거도 없다.

- Lifecycle/active turn: `turn/start`는 inProgress turn을 반환하고 `turn/started`, agent-message delta, `thread/tokenUsage/updated`, `turn/completed` notification을 직접 냈다. 즉시 같은 turnId로 보낸 `turn/steer`는 `no active turn to steer`로 거부됐다. 응답상 inProgress와 steer 처리 시점의 active-turn 관찰이 일치하지 않아, active-turn steering 성공·충돌 정책은 미확정이다.

- Process exit: 제가 기동한 test app-server PID 88100을 SIGTERM으로 종료했을 때 연결 client는 close code 1006을 관찰했다. 이는 app-server 종료→WS close failure artifact이지만 production daemon의 runtime disconnect/recovery wiring을 증명하지 않는다.

- 분류: 현재 Codex adapter는 Tier 3를 유지한다. named methods의 존재/일부 수용과 generic turn/start acceptance는 canonical correlation, TUI wake-up, authenticated receipt/automatic ack, dedupe 또는 Tier 2를 뜻하지 않는다. timeout과 TUI 표시·idle wake-up은 현 세션에서 직접 관찰하지 못했으며, ack/dedupe/retry/stale recovery는 G1-C handoff 범위다.

- 검증: `pnpm vitest run tests/unit/adapters/codex-runtime.test.ts tests/unit/daemon/codex-ingress.test.ts` PASS (2 files, 60 tests). 코드 변경 없음.

### 2026-07-19 16:24 · 2026-07-19 · W1 purpose and evidence terminology clarified

사용자는 W1의 제품 목적, positive/negative evidence와 Tier 3의 의미를 쉬운 말로 설명해 달라고 요청했다. 현재 단계는 Codex에 메시지를 넣을 수 있다는 신호와 실제 사용자에게 도착·식별·안전하게 재시도할 수 있다는 보장을 분리해, 아직 없는 보장을 출시 기능처럼 약속하지 않기 위한 검증이다. Tier 3는 목표가 아니라 현재의 보수적 분류이며, 가능하면 근거를 갖춘 더 높은 tier로 올리되 부족한 보장은 degradation/G1-C reliability 작업으로 남긴다.

### 2026-07-19 16:27 · 2026-07-19 · W1 upstream purpose, spike scope and tier ladder clarified

역추적 결과: 제품 목표는 G1 local stable A2A round trip이며, G1-A는 이후 G1-B canonical envelope cutover와 G1-C delivery reliability가 안전하게 소비할 ingress 경계를 고정한다. Codex app-server는 upstream CLI/version에 의존하므로 named API의 존재만으로 제품 약속을 만들 수 없고, 실제 TUI/wake-up/correlation/failure를 검증해 capability 또는 degradation으로 분류해야 한다.

`spikes/codex-app-server-multi-session-poc`은 검증 불가 영역이 아니라 탐색용 실행 도구다. client.ts는 generic turn/start, event-recorder.ts는 notification/loaded thread, inband-proxy.ts는 frame/binding 후보를 관찰할 수 있다. 그러나 현재 automated tests는 helper/proxy behavior 중심이고 TUI 표시, idle wake-up, canonical deliveryId, active-turn conflict의 end-to-end product guarantee를 자동으로 증명하지 않는다. 따라서 spike의 raw run은 evidence 후보이며, G1-A가 owner 기준으로 재실행·해석해 현재 contract/degradation을 확정한다.

Tier는 1부터 4까지 존재한다. Tier 1은 structured full-duplex+deliveryId+authenticated identity+automatic ack+idempotent duplicate handling, Tier 2는 structured side channel이되 missing guarantee를 flag, Tier 3은 prompt-only degradation, Tier 4는 unsupported다. 현 Codex는 Tier 3이며 Tier 1/2 adapter가 현재 구현됐다는 사실은 없다.

### 2026-07-19 16:31 · 2026-07-19 · W1 purpose and verification contract established

### Why this stage exists

- MVP의 generic `turn/start` TUI 주입 자체는 과거 manual smoke/provenance에서 확인된 기준선이다. 이 W1이 다시 여는 핵심 질문은 “TUI에 보이는가”만이 아니다. Codex가 상대 에이전트에게 send한 뒤 자신의 turn이 아직 진행 중일 때, 상대 reply가 inbound로 돌아오면 현재 app-server/runtime이 그 delivery를 별도 turn으로 수용·queue·defer·reject 중 무엇으로 처리하는지와 그 근거를 확정하는 것이다.
- 이 경계가 불명확하면 daemon의 `turn/start` JSON-RPC acceptance를 target receipt/work completion으로 잘못 처리하고, agent가 reply를 기다리려고 같은 turn에서 sleep/polling을 반복하거나, post-acceptance 재주입이 duplicate agent action을 만들 수 있다. 따라서 G1-A는 generic path의 기존 성공을 부정하지 않고, named structured ingress·canonical correlation·active-turn/failure behavior가 기존 Tier 3 경로보다 어떤 보장을 추가하는지 판정한다.
- 결과는 둘 중 하나다: 직접 증거가 있는 capability는 조건과 함께 기록하고, 없는 guarantee는 Tier 2로 과장하지 않고 Tier 3 degradation 및 G1-C reliability handoff로 남긴다. W1은 해당 reliability 기능을 구현하지 않는다.

### Verification contract

- Baseline revalidation: 격리된 `/private/tmp` socket의 temporary aiox daemon과 daemon-owned per-agent Codex app-server/TUI를 기동한다. 기존 generic `turn/start` envelope가 선택된 live thread에 수용되고 TUI에 나타나는지는 baseline으로 기록하되, named-surface 성공의 대체 근거로 쓰지 않는다.
- Named ingress: 동일한 G0 preflight 환경에서 `thread/inject_items`와 `turn/steer`를 정확한 request/response, target thread, lifecycle notification과 함께 실행한다. raw item injection만으로 wake-up 또는 ack를 추론하지 않는다.
- Active turn: 장시간 진행 중인 target turn에 inbound delivery를 보내고, request/response와 `turn/started|completed`/token usage event를 대조하여 accept, queue, defer 또는 reject와 thread association을 기록한다. 짧은 turn의 timing race는 정책 증거가 아니라 관찰 실패로 분류한다.
- Correlation/receipt: unique canonical deliveryId를 candidate field와 rendered payload에 함께 넣고, target-facing structured result 또는 verified passive/explicit ack가 같은 deliveryId+target session으로 돌아오는지 확인한다. `clientUserMessageId`는 public contract가 확인되기 전 후보일 뿐이다.
- Failure: bounded timeout, controlled app-server process exit, WebSocket drop, unsupported method 각각에 setup command, runtime version, timeout, expected transition, raw failure artifact location을 남긴다. post-acceptance timeout은 dedupe가 증명되기 전 automatic retry하지 않는다.
- Evidence disposition: TUI presentation/idle wake-up, authenticated receipt, canonical correlation preservation, dedupe 중 하나라도 직접 증명되지 않으면 Codex effective tier는 Tier 3로 유지한다. Tier 2 uplift 또는 manual/degraded path의 최종 disposition과 ack/retry/queue/stale recovery 구현은 G1-C가 소유한다.

### Execution order

1. temporary daemon preflight와 isolated socket 확인 → 2. generic baseline smoke → 3. named methods + active-turn trace → 4. correlation and failure traces → 5. evidence/degradation matrix를 W1 결과로 reconcile한다.

### 2026-07-19 16:37 · 2026-07-19 · Freeze resolution boundary reconciled

- `logs/G1/2026-07-10-G1-A-contractingress-freeze.md`의 closeout을 재확인했다. 현재 W1은 이미 resolve된 contract decision을 다시 여는 단계가 아니다. 고정 입력은: canonical v1 target-specific delivery, `message_deliveries.id`를 public immutable deliveryId로 사용, typed send/reply authoring boundary와 reserved intent rejection, source-visible result=daemon acceptance/rejection(=target receipt/work completion 아님), automatic target control-plane ack의 방향(구현·dedupe·retry·recovery는 G1-C)이다.
- freeze는 Codex named ingress를 별도 evidence work로 명시적으로 분리했다. W1의 잔여 범위는 named `thread/inject_items`/`turn/steer` behavior, TUI/idle wake-up, active-turn collision, canonical deliveryId propagation, timeout/process-exit/WebSocket/unsupported-method artifact를 관찰해 Tier 3 capability/degradation으로 분류하는 것이다. 즉 current contract를 변경하지 않고, 과거 generic turn/start MVP baseline과 named structured surface가 실제로 추가 보장을 주는지 판정한다.
- 따라서 active-turn 검증의 제품적 이유(과거 polling 원인)는 W1의 context이지만, W1의 acceptance criterion은 freeze가 열어 둔 named-surface evidence다. generic turn/start가 active-turn에서 어떻게 동작하는지도 named-surface 결론의 대체 증거가 아니며, 필요하면 separate baseline/degradation trace로만 기록한다.

### 2026-07-19 16:38 · 2026-07-19 · W1 solution-candidate map clarified

사용자는 named Codex surface가 sleep/polling 문제를 해결할 가능성과 다른 해결책의 mapping을 요청했다. 현재 판단: `turn/steer`는 active turn에 input을 추가하기 위한 upstream candidate이므로 same-turn reply 전달의 후보가 될 수 있으나, 실제 active-turn 성공/충돌 policy, correlation, receipt/dedupe를 아직 증명하지 않았으므로 해결책으로 채택하지 않는다. `thread/inject_items`는 model-visible history append일 뿐 wake-up/receipt를 뜻하지 않는다.

해결책 map: (1) agent가 send acceptance를 reply completion으로 오해해 sleep/polling → tool/instruction이 acceptance·pending을 명확히 드러내고 reply event/control surface를 제공해야 함(G1-B/G1-C); (2) active turn 중 inbound reply → named steer가 수용되면 후보, 아니면 delivery queue/defer 후 turn completion flush(G1-C); (3) idle wake-up/TUI presentation → verified named presentation/wake path 또는 explicit queue/manual pull surface(G1-C); (4) acceptance 뒤 ack 유실·재시도 → canonical deliveryId+authenticated control-plane ack+dedupe, 그 전에는 delivered+unconfirmed/manual retry(G1-C); (5) wrong thread/rebind → existing live binding guard를 유지하고 unconfirmed이면 defer하며, named methods를 binding authority로 추론하지 않음.

W1의 역할은 위 후보 중 named app-server surface가 (2) 또는 (3)에 실제로 쓸 수 있는지 evidence로 판정하는 것이며, (1)/(4)와 queue/retry/recovery 구현을 대신 소유하지 않는다.

### 2026-07-19 16:40 · 2026-07-19 · W1 steer semantics clarified

`turn/steer`를 “기존 active turn 취소 후 reply 수신”으로 가정하지 않는다. 현재 version-generated schema 설명은 expectedTurnId가 현재 active turn과 일치해야 한다는 precondition을 말하며, active turn에 input을 추가하는 candidate surface로만 취급된다. W1의 직접 관찰에서는 turn/start가 inProgress를 반환한 뒤 같은 turnId steer가 `no active turn to steer`로 거부됐으므로, cancellation·ordering·reply incorporation semantics는 아직 증명되지 않았다. 검증은 long-running turn에서 original work가 interrupted/completed/continued 중 무엇인지와 inbound reply가 어느 turn/thread에 반영되는지를 lifecycle notification 및 TUI/model-visible outcome으로 대조해야 한다.

### 2026-07-19 16:41 · 2026-07-19 · W1 active-turn queue disposition criteria clarified

사용자는 active-turn inbound가 queue에 안전하게 대기했다가 기존 작업 뒤 처리된다면 문제없다고 보았다. 이는 타당한 conditional disposition이다. 다만 “문제없음”의 최소 조건은 (a) target thread와 canonical deliveryId가 queue에 보존, (b) active turn 완료 후 bounded flush 또는 명시적 operator action, (c) duplicate suppression 또는 retry rule, (d) sender/target에 queued·delivered·unconfirmed 상태가 분리되어 보임, (e) process exit/WS drop 중 queue disposition이 명확함이다. 이 조건이 실제 evidence로 확인되면 steer/wake-up을 Tier 2로 올리지 않아도 G1-C의 queue/degradation path가 active-turn problem을 해결할 수 있다. 현재 generic/named Codex path에서 이러한 runtime-owned queue를 확인한 것은 아니며, W1은 existence/policy를 관찰하고 G1-C가 persistence/flush/retry/ack를 소유한다.

### 2026-07-19 16:45 · 2026-07-19 · Existing MVP evidence scope corrected

기존 MVP/provenance를 재대조했다. (1) wrong-thread 방지는 상당 부분 확인됐다: TUI `/resume`의 same-connection proxy 관찰, explicit resume의 기존 thread 연결, mismatch 시 silent rebind를 하지 않는 smoke, live binding 불명확 시 `target_binding_unconfirmed` defer가 있다. (2) delivery를 queued로 남기는 것은 확인됐다. 다만 이는 live loaded thread가 없을 때의 daemon delivery 상태이며, active turn 중 inbound를 runtime/app-server가 queue한 사실이나 turn 완료 뒤 자동 flush한 end-to-end trace는 아니다.

따라서 이전 설명의 “아직 1·2 전체 미검증”은 과도했다. 정확한 상태는: target 선택 안전성과 no-loaded-thread defer는 기존 MVP가 positive evidence를 보유한다. 반면 현재 W1의 남은 좁은 질문은 **active turn이 존재하는 동일 thread**에서 inbound가 어떤 policy(accept/queue/defer/reject)로 처리되는지, queue라면 completion 뒤 실제 표시·처리/상태가 이어지는지다. 현재 architecture도 `turn/start` 성공을 same-client JSON-RPC acceptance로 한정하고 `turn/started|completed`를 기다리지 않는다고 명시한다. 이 gap은 2026-06-10 polling log가 직접 “아직 검증할 점”으로 남긴 W1과 일치한다.

### 2026-07-19 17:16 · 2026-07-19 · W1 next-session verification matrix

### W1 다음 세션 검증 matrix

다음 세션의 재개 대상과 이미 확보한 evidence를 분리한다. 아래 PASS는 현재 검증 환경에서의 직접 관찰이며, Tier 2 보장이 아니다.

| 항목                                       | 상태                    | 다음 행동 또는 한계                                                                                                                                                            |
| ------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 실행 환경·named method dispatch/validation | PASS                    | Codex CLI 0.144.5/macOS에서 `thread/inject_items`·`turn/steer` dispatch와 validation error를 확보했다. version 변경 시 재확인한다.                                             |
| raw `thread/inject_items` 수용             | PASS (제한)             | developer raw item이 `{}` 응답으로 수용됐다. 이는 TUI 표시·wake-up·ack·canonical correlation의 PASS가 아니다.                                                                  |
| lifecycle/token usage visibility           | PASS (baseline)         | `turn/start`에서 `turn/started                                                                                                                                                 | completed`, delta, `thread/tokenUsage/updated`를 관찰했다. named ingress가 그 lifecycle을 일으키는지는 별도 관찰이 필요하다. |
| unsupported method·controlled process exit | PASS (failure artifact) | unknown method error와 test app-server 종료 뒤 WS close 1006을 확보했다. independent WS drop과 timeout은 별도다.                                                               |
| TUI presentation·idle wake-up              | 미완                    | daemon-owned TUI/selected live thread에서 named ingress 뒤 표시와 idle wake 여부를 직접 관찰한다.                                                                              |
| long-running active-turn policy            | 미완                    | 같은 thread의 실제 장시간 turn 중 inbound를 보내 accept/queue/defer/reject와 original work의 continued/interrupted/completed를 lifecycle·TUI outcome으로 대조한다.             |
| canonical deliveryId preservation          | 미완                    | candidate field와 rendered payload를 함께 사용하고 target session의 관찰 가능한 결과에서 같은 deliveryId를 찾는다. `clientUserMessageId`는 public binding으로 가정하지 않는다. |
| `outputSchema` behavior                    | 미완                    | supported capability/response와 structured output의 관찰 가능 범위를 기록한다.                                                                                                 |
| bounded timeout·independent WS drop        | 미완                    | timeout 및 WS drop을 각각 통제해 raw failure artifact와 delivery disposition을 남긴다. dedupe 증명 전 자동 재시도하지 않는다.                                                  |

종료 기준: 위 미완 항목을 모두 직접 PASS로 만들 필요는 없다. 지원하지 않거나 관찰 불가하면 조건·raw artifact·Tier 3 degradation을 기록한다. TUI/wake-up, receipt, canonical correlation, dedupe를 직접 증명하지 못하면 Tier 2로 올리지 않는다.

### 2026-07-19 17:34 · 2026-07-19 17:34 · W1 isolated observation and active-turn scope clarification

- 관찰: 격리 app-server에서 새 thread의 `turn/start`는 `inProgress`를 반환했고, 약 50ms 뒤 `thread/status/changed(active)`와 `turn/started`가 도착했다. lifecycle·item·token usage event를 관찰했으며, raw developer item의 `thread/inject_items`는 `{}`로 수용됐다. `inProgress` 응답 직후 보낸 `turn/steer`는 `no active turn to steer`로 거부됐다. 이 run에는 remote TUI가 없었으므로 표시·idle wake-up·모델 처리, canonical `deliveryId`의 structured 보존, `outputSchema`, bounded timeout, 독립 WS drop은 관찰하지 못했다.
- 판정: 위 steer 오류는 해당 호출이 active notification보다 먼저 도착한 timing artifact일 뿐, Codex가 steer를 지원하지 않는다는 증거가 아니다. 그러나 `turn/steer`의 수용 조건·inbound 반영·queue/flush semantics도 이 관찰로 증명되지 않았다.
- 사용자 판단 수용: `turn/steer`는 A2A delivery tier의 판정 기준이 아니라 target agent가 active turn 중 inbound를 처리하는 별도 runtime 구현 선택지다. A2A delivery는 steer, queue, defer 또는 후속 turn 등 안전한 정책으로 처리될 수 있다. 따라서 W1의 Tier 2 판정은 structured metadata/canonical correlation과 authenticated egress를 중심으로 하고, active-turn policy는 별도 capability/degradation 관찰로 보고한다. 이 기록은 W1의 기존 evidence matrix의 active-turn 행을 Tier 2 승격 요건으로 해석하지 않도록 한다.

### 2026-07-19 17:40 · 2026-07-19 17:40 · W1 active-turn queued-delivery acceptance decision

- 사용자 결정: active-turn 중 A2A inbound의 성공 조건은 `turn/steer`가 아니라 queued delivery다. target이 active일 때 메시지가 queue로 남고, 기존 작업이 끝난 뒤 그 메시지가 TUI에 표시되며, target이 그 메시지에 따라 작업을 시작하면 active-turn ingress 성공으로 분류한다.
- 범위 정정: `turn/steer`는 Codex runtime의 별도 구현 선택지로 둔다. W1은 steer의 수용 조건·동작을 더 이상 검증 대상으로 삼지 않으며, Tier 2 판정에도 사용하지 않는다. canonical `deliveryId` correlation과 authenticated structured egress는 별도 Tier 2 관련 검증으로 유지한다.
- 이전 matrix의 active-turn 행은 위 queue→completion→TUI 표시→후속 작업 관찰로 좁혀 해석한다. accept/defer/reject 및 steer의 개별 동작을 성공 조건으로 요구하지 않는다.

### 2026-07-19 17:45 · 2026-07-19 17:45 · W1 verification classification and Tier 2 boundary

### 검증 완료

- named `thread/inject_items`/`turn/steer` dispatch와 validation error, raw developer item의 `thread/inject_items` `{}` 수용, `turn/start`의 active lifecycle·item/token usage event, unsupported method와 controlled app-server 종료 뒤 WS close artifact를 관찰했다. raw 수용은 delivery 처리 성공·TUI 표시·wake-up·correlation 증거가 아니다.

### W1에서 아직 검증 가능한 항목

| 항목                               | 성공 조건                                                                                         | Tier 2 관계                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------- |
| idle TUI 표시·wake-up              | named ingress 뒤 선택된 live TUI에 메시지가 보이고 idle 상태가 변화                               | 사용성/degradation 관찰               |
| active-turn queued delivery        | active 상태에서 주입 → queue 보존 → 기존 작업 완료 → TUI 표시 → 해당 메시지에 따른 후속 작업 시작 | 사용성/degradation 관찰; steer는 제외 |
| canonical `deliveryId` correlation | 주입한 ID가 target 관찰 결과와 structured egress에서 같은 delivery로 연결                         | Tier 2 핵심 증거                      |
| authenticated structured egress    | target의 reply/result 출처와 delivery 연결을 신뢰 가능하게 확인                                   | Tier 2 핵심 증거                      |
| `outputSchema`                     | 지원 여부와 구조화된 결과의 실제 관찰 범위 확인                                                   | capability 관찰                       |
| bounded timeout                    | timeout 시 request·connection·delivery 상태를 구분해 기록                                         | failure/degradation 관찰              |
| 독립 WS drop                       | 연결 단절 뒤 delivery disposition과 runtime 상태를 관찰                                           | failure/degradation 관찰              |

Tier 2는 canonical `deliveryId` correlation과 authenticated structured egress가 함께 확인되고, wake-up·queue·retry 같은 누락 보장을 adapter flag로 노출할 수 있을 때만 재평가한다. 다른 W1 항목의 성공만으로 자동 승격하지 않는다.

### W1 밖의 reliability 구현 항목

- automatic control-plane ack
- dedupe / idempotent duplicate 처리
- 자동 retry·backoff
- durable queue와 재시작 뒤 복구
- stale runtime recovery
- queue의 영속성·자동 flush 정책 구현

위 항목은 G1-C owner 범위다. W1은 존재·관찰 가능한 disposition을 evidence/degradation으로 분류할 수 있으나, 구현이나 보장을 소유하지 않는다.

### 2026-07-19 17:48 · 2026-07-19 17:48 · W1 next-session full verification handoff

사용자는 남은 W1 검증을 다음 세션에 수행하도록 지시했다. 현재 W1은 계속 active이며, 다음 실행은 아래 순서를 따른다.

1. **격리 app-server + remote TUI 관찰**
   - idle TUI 표시·wake-up: named ingress 뒤 선택된 live TUI의 표시와 idle 상태 변화를 대조한다.
   - active-turn queued delivery: target이 active인 동안 주입하고, delivery가 queue로 보존된 뒤 기존 작업 완료 → TUI 표시 → 해당 메시지에 따른 후속 작업 시작까지 확인한다. `turn/steer`는 호출·성공 여부를 이 검증의 기준으로 사용하지 않는다.
   - `outputSchema`: supported capability/response 및 structured result의 관찰 범위를 기록한다.
   - failure: bounded timeout과 independent WS drop을 별도 통제해 request·connection·delivery disposition raw artifact를 남긴다. dedupe 증명 전 자동 retry하지 않는다.

2. **aiox daemon + Codex target runtime 통합 관찰**
   - canonical `deliveryId` correlation: 주입한 ID가 target 관찰 결과와 structured egress에서 동일 delivery로 연결되는지 확인한다.
   - authenticated structured egress: target reply/result의 출처와 delivery 연결을 신뢰 가능하게 확인한다.

3. **분류와 종료**
   - 각 W1 항목은 직접 PASS 또는 조건·raw artifact를 갖춘 Tier 3 degradation/관찰 불가로 종결한다. 모든 항목이 PASS일 필요는 없다.
   - canonical `deliveryId` correlation과 authenticated structured egress가 함께 확인되고, 빠진 wake-up·queue·retry 보장을 adapter flag로 노출할 수 있을 때만 Tier 2 재평가를 검토한다. 다른 W1 성공만으로 승격하지 않는다.
   - automatic control-plane ack, dedupe/idempotency, retry/backoff, durable queue/restart recovery, stale runtime recovery, queue persistence/automatic flush 구현은 G1-C owner이므로 W1에서 구현하지 않는다.

사용자 지원은 기본적으로 필요하지 않다. 다만 실제 TUI 화면의 최종 표시 확인 또는 login/approval prompt가 나타날 때만 요청한다. 현재 개인 Codex 대화 세션은 외부 JSON-RPC endpoint가 확인되지 않았으므로 시험 대상에 사용하지 않고 새 격리 session을 사용한다.

### 2026-07-19 17:51 · W1 parallel evidence-route audit

- 사용자 지시: W1은 병렬 조사로 효율화하고, 자동화할 수 없는 실제 TUI 표시 또는 login/approval prompt에서만 도움을 요청한다.
- 직접 재확인: 현재 Codex→daemon reply ingress는 `inReplyToDeliveryId`를 pre-v1 `parentMessageId`로 projection하고 event `deliveryId`는 null이다(`src/daemon/state.ts`). Codex target rendering도 `message_id`만 text envelope에 넣고 `injectTurnStart`는 plain text만 보낸다. 따라서 현재 구현 경로만으로 canonical `deliveryId` correlation을 live PASS로 주장할 수 없으며 Tier 3 degradation/G1-B gap으로 분류한다.
- 직접 재확인: token hash로 agent registration·connected state·token equality를 검사하는 Codex ingress authorization은 존재한다. 이는 authenticated egress의 pre-v1 관찰 후보이나, canonical deliveryId 또는 automatic ack 증거는 아니다.
- 병렬 조사: 기존 PoC는 generic `turn/start`, lifecycle/binding JSONL 수집에는 재사용 가능하지만 named `thread/inject_items`, `outputSchema`, independent WS drop, TUI wake-up/queue의 자동 판독 도구는 제공하지 않는다. named request/response와 TUI 화면을 함께 기록할 ephemeral probe가 필요하다.
- 다음 행동: 격리 app-server와 remote TUI를 기동해 named ingress/TUI 관찰을 시도한다. 사용자 조작이 요구되는 화면이나 prompt가 발생할 때만 요청한다.

### 2026-07-19 17:53 · Temporary daemon injection scope raised

- @user는 canonical deliveryId gap을 확인한 뒤, daemon이 Codex에 특정 값을 임시 주입하도록 구현해 직접 검증할 수 있는지 질문했다.
- 현재 판단: daemon-private probe는 deliveryId가 포함된 named ingress의 request/response와 TUI presentation을 관찰할 수 있으나, delivery store/public contract·authenticated structured egress·ack를 바꾸지 않으면 Tier 2 correlation 증거가 되지 않는다. 그 범위를 넘는 최소 vertical slice는 G1-B canonical cutover 일부를 실제로 구현하는 일이다.
- 격리 app-server/TUI 실험은 안전하게 종료했다. 다음 행동은 사용자에게 probe-only와 production vertical slice 중 의도된 scope를 확인한 뒤 정한다.

### 2026-07-19 17:58 · G1-B minimum slice implementation authorization

- @user는 spike에서 G1-B 최소 구현과 그 위의 검증, 필요한 후속 작업을 병렬 agent로 진행하도록 지시했다.
- 직접 확인·병렬 조사 결과: G1-B canonical cutover는 current W1 scope 밖이다. G1-A plan과 W1 Required Context는 G1-B 구현을 제외하고, G1-B는 daemon/store/MCP/rendering/spike의 공통 closeout을 요구하므로 독립 package log와 plan이 필요하다.
- 구조 제약: 현재 G1-A W1이 유일한 활성 plan stage다. 새 G1-B stage를 활성화하면 복수 활성 stage가 되어 onramp가 현재 작업을 선택할 수 없다. 구현 착수 전 G1-A W1을 evidence handoff 상태로 대기 처리하고 G1-B를 활성화할지 사용자 선택이 필요하다.

### 2026-07-19 18:09 · Closeout handoff recorded and W1 lifetime assessed

- 사용자 지시에 따라 `logs/G1/2026-07-18-G1-A-closeout-and-G1-B.md`의 existing W2 handoff register에 G1-B canonical vertical slice/spike와 G1-C tier-dependent reliability update를 표로 기록했다.
- 로그 수명 판정: 이 W1은 아직 `open`을 유지한다. 직접 원인은 W1 matrix의 idle TUI wake-up, active-turn queued delivery, outputSchema, bounded timeout, independent WS drop이 PASS 또는 raw artifact를 갖춘 Tier 3 degradation/관찰 불가로 아직 종결되지 않았기 때문이다. closeout log도 stage pointer의 실제 완료와 plan 상태가 일치할 때만 활성화할 수 있다.
- G1-B 구현은 W1의 현재 수명 안에 넣지 않는다. G1-A plan이 G1-B cutover를 명시적으로 제외하고, G1-B는 별도 daemon/store/MCP/renderer/spike 공통 closeout을 필요로 하는 독립 package다. W1은 현재 evidence를 closeout handoff 입력으로 전달했으며, G1-B 결과의 implementation·verification owner는 별도 plan/package가 된다.
- 따라서 이번 행동은 transfer·detach·status 전환이 아니라 downstream handoff registration이다. W1의 `[>]`와 G1-A active plan pointer는 변경하지 않았다.

### 2026-07-19 18:17 · 2026-07-19 · G1-B detach and deferred closeout-update condition

- @user가 G1-B를 W1의 detach로 실행하고, 완료 뒤 closeout handoff를 갱신하는 순서를 승인했다.
- W1은 `logs/G1/2026-07-19-G1-B-canonical-envelope-cutover.md` controlling package로 `[↓]` detach됐다. G1-A plan의 W1 `[>]`는 유지하고 source에는 local `[>]`를 남기지 않아 onramp가 child package로 재개한다.
- 이 entry는 17:58의 “W1 대기 처리/새 G1-B stage 활성화” 후보를 정정한다. 별도 active plan을 만들지 않으며, G1-B package가 implementation·probe의 실행 owner다.
- G1-B closeout 때 Return Target의 결과 소비를 먼저 수행한다. source W1은 accepted implementation·tests·live artifact를 matrix/Tier 판정에 반영한 뒤 남은 W1 action을 갱신한다. 그 다음 W1 완료와 plan status가 대조될 때에만 closeout W1을 활성화하고, closeout W2-1의 기존 pre-registration 표를 고치지 않고 실제 G1-B outcome·Tier/G1-C 영향·정정 여부를 새 append-only entry로 기록한다.

## 2026-07-19 · 2026-07-19 · G1-B accepted result consumed; W1 evidence work resumed

- G1-B accepted result consumed: `message_deliveries.id`가 public deliveryId로 canonical envelope의 `turn/start` user input에 보존되고, authenticated Codex reply는 originating delivery의 target identity·persisted one-reply right를 확인한 뒤 original source 한 곳에 `route_id:null` delivery만 만든다. migration 3은 canonical historical reply를 consumed right로 backfill한다.
- verification consumed: W3/W4 포함 daemon, store, MCP focused suites와 typecheck/diff check가 통과했다. Claude HTTP listener 3개는 sandbox `listen EPERM`으로 별도 network-bind 환경에서만 재검증 가능하다.
- Tier disposition: G1-B의 isolated idle-thread probe는 canonical JSON이 user message로 persist되고 turn generation을 시작하는 것은 보였으나 native activity, authenticated receipt/ack, active-turn policy, dedupe/retry/recovery는 증명하지 않았다. 따라서 Codex effective tier는 Tier 3를 유지한다.
- W1 return: detached child의 결과를 소비해 W1을 active로 복귀한다. 남은 W1은 idle TUI/wake-up, active-turn queue, outputSchema, bounded timeout, independent WS drop을 PASS 또는 Tier 3 degradation artifact로 종결하고, G1-C reliability handoff의 입력을 갱신하는 일이다.

### 2026-07-19 23:55 · 2026-07-19 · named injection remote-TUI idle and active-turn observation

- 실행 환경: 2026-07-19 macOS에서 새 격리 `codex app-server --listen ws://127.0.0.1:51995`와 `codex --remote` TUI thread `019f7ad9-8256-7713-87ae-5759077680f6`를 사용했다. remote TUI는 interactive 상태였고 login/approval prompt는 없었다.
- idle 관찰: `thread/inject_items`에 canonical-looking JSON(`deliveryId=w1-idle-019f7ad9`, marker `W1_IDLE_WAKE_MARKER`)을 주입했을 때 `{}`를 반환했다. 30초 JSONL에는 target lifecycle notification이 없었고 remote TUI 화면에도 marker·새 working 상태가 없었다. 따라서 raw item acceptance는 idle presentation/wake-up 증거가 아니며, 이 환경에서는 Tier 3 degradation(accepted but no observed wake/presentation)으로 분류한다.
- active 관찰: 같은 TUI thread에 `turn/start`로 2000-word 응답을 시작해 turnId `019f7ada-877b-7461-8161-a1b7a6b70bd4`를 받은 뒤, active notification(`thread/status/changed active`) 뒤 `deliveryId=w1-active-019f7ada`, marker `W1_ACTIVE_QUEUE_MARKER`를 `thread/inject_items`로 주입했다. 호출은 다시 `{}`였지만 45초 JSONL에 injected marker/별도 turn/queue disposition notification이 없었고, 종료 뒤 `thread/read`에는 original turn과 agent response만 있고 marker가 없었다. TUI도 marker에 따른 후속 작업을 시작하지 않았다.
- 결론: 이 run은 active-turn queued delivery(보존 → 기존 turn 완료 → TUI 표시 → 후속 작업)의 positive evidence가 아니다. named inject의 `{}`는 receipt, persistence, queue, flush, canonical correlation을 의미하지 않는다. raw artifacts는 `/private/tmp/aiox-w1-events.jsonl`, `/private/tmp/aiox-w1-active-events.jsonl`이며 일시 관찰물이다.
- 현재 W1은 Tier 3 유지. 다음에는 `outputSchema` request surface와 bounded timeout/independent WS-drop을 각각 통제해 raw artifact로 종결한다; G1-C의 ack/dedupe/retry/queue 구현 범위는 열지 않는다.

### 2026-07-19 23:57 · 2026-07-19 · outputSchema and failure-mode observation

- `outputSchema` capability: Codex CLI 0.144.6의 fresh experimental generated schema는 `turn/start` params에 “final assistant message를 constrain하는 optional JSON Schema”를 명시했다. live `turn/start`에 `{type:"object", properties:{ok:{type:"boolean"}}, required:["ok"], additionalProperties:false}`를 보냈고 inProgress turn `019f7ae0-a904-76f3-84b8-4e8fc13e7a08`을 수용했다. `thread/read` final answer는 정확히 `{"ok":true}`였다. 따라서 이 version/격리 thread에서 `outputSchema`는 PASS(capability)이나 ingress/receipt 보장은 아니다.
- bounded timeout: 동일 thread에서 `turn/start`를 1ms client deadline으로 단 한 번 보냈다. client는 `timeout:turn/start:1`을 보고했지만, 재시도하지 않은 뒤 `thread/read`에는 completed turn `019f7ae1-0cf8-7f83-b4a3-b000daf87d8d`와 `W1_TIMEOUT_MARKER` final answer가 남았다. 즉 client timeout은 target 미실행·미전달 증거가 아니며, 이 surface에는 receipt/delivery disposition이 관찰되지 않는다. Tier 3 degradation으로 분류한다.
- independent WS drop: 별도 raw WS client가 `thread/inject_items` marker를 write callback까지 보낸 뒤 즉시 `terminate()`했고 client close code 1006을 관찰했다. 후속 `thread/read`에는 `W1_WS_DROP_MARKER`가 없고 last turn은 completed였지만 server측 acceptance/reject/queue disposition notification도 없었다. 따라서 단절 뒤 delivery 상태는 관찰 불가이며, retry/dedupe 없이 Tier 3 degradation으로 분류한다.
- W1 matrix의 idle wake-up·active queue·outputSchema·bounded timeout·independent WS drop은 이번 run에서 각각 degradation, degradation, PASS capability, degradation, degradation raw artifact를 확보했다. canonical `deliveryId` correlation과 authenticated structured egress는 기존 G1-B result가 여전히 증명하지 못하므로 Tier 3를 유지하며, 이 전이를 G1-C reliability handoff 입력으로 사용한다.

### 2026-07-20 00:02 · 2026-07-20 · active-turn ingress route corrected to turn/start

- 사용자 정정: `thread/inject_items`는 현재 ingress 후보에서 철회됐다. 따라서 23:55의 active-turn inject 관찰은 named ingress의 historical negative evidence일 뿐, 현재 active-turn delivery 경로의 acceptance criterion으로 쓰지 않는다.
- 새 관찰 질문: Codex target이 active turn일 때 같은 thread에 두 번째 generic `turn/start`를 보냈을 경우 request가 즉시 reject, server-side queue, parallel/serial 별도 turn 중 무엇으로 처리되는지 확인한다. queue PASS는 second request의 identity가 보존되고 first turn 완료 뒤 bounded하게 second turn이 TUI에 표시·실행·완료되는 trace다. reject 또는 관찰 불가도 raw lifecycle/thread-history artifact로 Tier 3 degradation으로 분류한다.
- 이 정정은 G1-B canonical correlation·authenticated structured egress 또는 G1-C reliability 구현의 owner를 바꾸지 않는다.

### 2026-07-20 00:05 · 2026-07-20 · turn/start idle wake-up and active-turn serial execution evidence

- `turn/start` active-turn 관찰(2026-07-20): fresh remote TUI thread `019f7ae6-887b-76e1-b4ec-a6c128077e71`에서 첫 요청(`019f7ae6-fa73-7233-b12e-fc5d3eaa1177`)으로 3000-word 응답을 시작했다. `thread/status/changed(active)`를 받은 3ms 뒤 동일 thread에 두 번째 `turn/start`(`019f7ae6-fa96-77d3-b66f-89162e97555a`, `W1_SECOND_TURN_MARKER`)를 보냈고, 둘 다 inProgress 응답으로 수용됐다.
- 직접 관찰: TUI는 첫 응답을 끝낸 뒤 두 번째 user message와 `W1_SECOND_TURN_MARKER` answer를 순서대로 표시했다. `thread/read`도 first user/agent pair 뒤 second user/agent pair를 같은 thread history에 순서대로 보존했다. raw second turn id가 history의 별도 turn record로 노출되지는 않아 public per-delivery correlation/receipt 근거는 아니다.
- 판정: 이 isolated Codex CLI 0.144.6/macOS run에서 same-thread active-turn 뒤 두 번째 `turn/start`가 first completion 뒤 처리되는 queue/serial execution의 positive capability evidence다. 단, durable queue, bounded flush contract, restart/WS-drop disposition, dedupe, canonical deliveryId correlation, authenticated structured egress는 이 run으로 증명되지 않았으므로 effective Tier 3은 유지한다.
- 정정: 철회된 `thread/inject_items` 기반 idle/active/WS-drop 결과는 현재 `turn/start` ingress 경로의 결론으로 사용하지 않는다. `turn/start`로 재검증하지 않은 WS-drop 결과는 별도 미완 항목으로 남긴다.

### 2026-07-20 00:11 · turn/start WS drop observation

- 실행 환경: fresh `codex app-server --listen ws://127.0.0.1:51997`와 remote TUI의 idle thread `019f7aed-532a-78d1-831e-bd4dd0ead435` (Codex CLI 0.144.6/macOS)를 사용했다. raw client는 `initialize` 완료 뒤 `turn/start`(`W1_TURN_START_WS_DROP_MARKER`)를 한 번 write callback까지 보낸 즉시 `terminate()`했다. client는 JSON-RPC response를 받지 못한 채 close code `1006`을 관찰했다. 재전송은 하지 않았다.
- 직접 관찰: 10초 뒤 별도 재연결의 `thread/read`는 user prompt와 final `W1_TURN_START_WS_DROP_MARKER`를 포함하는 completed turn `019f7aed-e5b9-7322-8bdc-3c94c9277381`(duration 1475ms)을 보였다. remote TUI도 같은 prompt와 marker answer를 순서대로 표시했다. 따라서 이 isolated run에서는 client WS가 response 전에 drop되어도 server가 이 `turn/start` 요청을 처리·완료했다.
- 한계/분류: write callback은 server receipt가 아니고, 이번 1회 성공은 drop 시 항상 실행됨·exactly-once·durability·restart recovery를 뜻하지 않는다. 같은 request를 retry하면 duplicate turn이 생길 위험이 여전히 있으며 public `deliveryId`별 acceptance/disposition도 노출되지 않는다. WS-drop 관찰 항목은 `turn/start` 경로의 positive capability evidence로 종결하되 effective Tier 3를 유지하고, retry/dedupe/durable queue/receipt는 G1-C reliability owner의 별도 검증 대상으로 남긴다.

### 2026-07-20 00:47 · G1-B live egress correlation evidence audit

- 확인 사실: G1-B W2의 live probe는 one canonical `deliveryId` envelope가 Codex `turn/start` user input으로 persist되고 generation을 시작하는 ingress evidence다. G1-B W3의 `aiox_reply(inReplyToDeliveryId)` authorization·source-only routing·structured result는 daemon/MCP unit·integration evidence다. 기존 artifact에는 한 original deliveryId가 실제 Codex runtime의 MCP reply를 거쳐 daemon event/store/source-only reply까지 이어진 live trace가 없다.
- 재현 시도: daemon UDS·production Codex runtime·inline aiox MCP를 묶은 isolated probe를 실행했으나, 임시 probe의 runtime capture, route creation, `receiveClaudeChannelMessage` request shape 오류 때문에 canonical delivery 생성 또는 MCP tool call 전에 종료됐다. production source/log 수정은 없고 temporary probe는 제거됐다. 따라서 이 실패는 Codex egress의 negative evidence나 “실측 불가” 판정 근거가 아니다.
- 유효한 판정: Codex runtime-level `deliveryId` correlation 및 automatic receipt는 현재 live end-to-end 실측으로 검증되지 않았으며 보장할 수 없다. effective Tier 3 degradation으로 취급한다. “그 기능이 없다”라고 단정하지 않는다. G1-B package closeout의 live proof는 ingress와 egress unit/integration을 결합한 것일 뿐 end-to-end runtime proof로 소비하지 않는다. 다음 선택은 deterministic integration harness를 고쳐 same deliveryId의 real MCP `aiox_reply`→daemon artifact를 관찰하거나, 이 Tier 3 disposition을 G1-A closeout/G1-C policy input으로 수용하는 것이다.

### 2026-07-20 01:01 · 2026-07-20 · G1-B live correlation probe reply accepted; source dispatch deferred

- 확인 사실: `g1b-source`의 typed probe envelope가 `deliveryId=daemon-8`로 현재 Codex agent에 도착했다. 이 agent는 `aiox_reply(inReplyToDeliveryId=daemon-8)`로 result reply를 제출했고 daemon은 reply message `codex-msg-ee5baf56-cbb5-4e4a-82a9-56ac874aec27`를 생성했다.
- 전달 결과: daemon dispatch는 `delivered:0`, source target `daemon-5`에 `target_runtime_unavailable` 사유의 deferred 1건을 보고했다. 이는 target runtime receipt/처리 증거가 아니라 daemon-level accepted reply와 deferred dispatch evidence다.
- 판정: live correlation probe는 deliveryId를 reply API 입력으로 사용하는 adapter/daemon boundary를 관찰했지만, source runtime egress 수신까지의 end-to-end correlation 또는 authenticated runtime receipt를 증명하지 않는다. effective Tier 3 판정은 유지한다.

### 2026-07-20 01:03 · live Codex deliveryId-to-MCP-reply correlation

- 실행 환경: build profile의 fresh temporary daemon/socket, production `dist/src/bin/aiox.js` MCP child, Codex CLI 0.144.6 remote TUI thread `019f7b1a-db44-7bb1-b292-7af09a6c74d1`를 사용했다. source `g1b-source`가 `replyExpected:true` message를 보내 target Codex delivery `daemon-8`을 만들었고, dispatch는 `delivered: 1`이었다.
- 직접 trace: `thread/read` user message에는 canonical envelope의 `deliveryId:"daemon-8"`, source `agent://local/build/g1b-source`, target `agent://local/build/g1b-codex`가 그대로 보존됐다. Codex turn은 실제 MCP item `aiox.aiox_reply`를 `inReplyToDeliveryId:"daemon-8"`으로 호출했고 completed result는 `ok:true`, reply message `codex-msg-ee5baf56-cbb5-4e4a-82a9-56ac874aec27`, dispatch target `daemon-5`(원 source) 하나와 source Claude runtime unavailable에 따른 deferred를 보였다. 이후 same `daemon-8`의 별도 direct `mcpServer/tool/call`은 `duplicate_reply`로 거절됐다.
- 판정: G1-B W2 ingress와 W3 authenticated reply 처리의 live Codex runtime correlation은 이 trace로 확인됐다. 단 MCP result의 `delivered: 0`/source-runtime deferred는 target receipt 또는 automatic ack가 아니며, retry/dedupe의 runtime-wide exactly-once·durable recovery도 증명하지 않는다. canonical correlation/authenticated structured egress 항목은 live PASS로 갱신하되 Codex effective Tier 3를 유지한다.

## 2026-07-20 · W2 evidence matrix and G1-C handoff input

W1의 직접 관찰은 종결됐다. W2는 authoritative 2026-07-20 01:03 live correlation trace와 turn/start 관찰을 단일 matrix로 정리하고, G1-A closeout이 소비할 G1-C reliability 입력을 확정한다. 새 Codex probe나 G1-C 구현은 금지한다.

### 2026-07-20 01:13 · W2 final evidence matrix and closeout handoff input

| 항목                                       | 확정 evidence                                                                                                                         | W1 판정                                                   | G1-C에 넘길 제약                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| idle wake-up                               | isolated remote TUI에서 turn/start user message와 후속 답변이 표시됐다.                                                               | PASS: 이 환경의 turn/start wake capability.               | acceptance나 화면 표시는 receipt/ack가 아니다.                                   |
| active-turn second turn/start              | first turn active 뒤 3ms에 보낸 second turn/start가 first completion 뒤 같은 thread history/TUI에서 실행됐다.                         | PASS: serial execution 관찰.                              | durable queue, bounded flush, restart recovery는 보장하지 않는다.                |
| outputSchema                               | turn/start의 JSON schema가 수용되고 final {"ok":true}가 관찰됐다.                                                                     | PASS: capability only.                                    | ingress receipt나 delivery completion을 뜻하지 않는다.                           |
| client timeout                             | 1ms client timeout 뒤 해당 turn이 완료돼 marker가 남았다.                                                                             | Tier 3 degradation: timeout은 no-execution 증거가 아니다. | post-acceptance automatic retry는 duplicate turn 위험 때문에 금지한다.           |
| WS drop                                    | response 전 WS가 끊긴 뒤에도 server가 turn/start를 처리·완료한 1회 trace가 있다.                                                      | Tier 3 positive capability with unconfirmed disposition.  | retry, exactly-once, durability, restart recovery를 주장하지 않는다.             |
| canonical deliveryId ↔ real Codex reply    | daemon-8 envelope가 actual user message에 보존되고 Codex가 aiox.aiox_reply(inReplyToDeliveryId=daemon-8)를 호출했다.                  | live PASS.                                                | 이 correlation을 ack/completed와 혼동하지 않는다.                                |
| authenticated one-reply/source-only egress | daemon은 인증·one-reply right consume 후 원 source daemon-5 한 곳만 dispatch했고 same deliveryId 재호출은 duplicate_reply로 거절했다. | live PASS.                                                | source runtime unavailable은 deferred이며 source receipt/automatic ack가 아니다. |

- 최종 판정: W1 evidence 항목은 PASS 또는 조건이 명시된 Tier 3 degradation으로 모두 종결됐다. effective Codex tier는 Tier 3로 유지한다.
- closeout 소비 입력: G1-C는 이 matrix를 전제로 automatic control-plane ack, deliveryId+authenticated-target identity ack dedupe, invocation idempotency, safe retry/backoff, durable queue/flush/restart recovery, stale/runtime failure를 구현하고 failure injection으로 검증한다. acceptance, timeout, WS write 또는 TUI 표시를 receipt/ack/completed로 승격하지 않는다.
- 범위 종결: W2는 새 correlation probe나 G1-C 구현을 수행하지 않는다. 이 entry를 G1-A closeout W1의 stage-result 입력으로 넘긴다.

### 2026-07-20 · G1-C consumption correction: correlated `turn/start` success

- **확인된 사실:** 2026-07-19 16:31 verification contract와 16:37 freeze boundary가 금지한 것은 daemon의 JSON-RPC acceptance를 *target receipt 또는 work completion*으로 오인하는 것이다. 2026-07-20 00:05에는 같은 thread의 두 `turn/start`가 모두 `inProgress`로 수용된 뒤 TUI/history에서 순차 실행된 직접 trace가 있고, 00:11에는 response 전 WS drop 뒤에도 해당 `turn/start`가 completed turn으로 남은 직접 trace가 있다. 따라서 success 응답은 delivery-acceptance 후보 근거가 될 수 있지만, response loss/drop은 미수락 증거가 아니다.
- **정정할 전제:** 01:13 W2 handoff의 “acceptance, timeout, WS write 또는 TUI 표시를 receipt/ack/completed로 승격하지 않는다”를, daemon이 write 전에 보존한 `deliveryId ↔ JSON-RPC requestId ↔ per-agent target runtime/thread` 상관관계까지 배제하는 문장으로 소비하면 과도하다. response payload가 `deliveryId`를 반복하지 않아도, 이 상관관계가 직접 검증되면 success는 **automatic delivery-acceptance ack** 후보가 될 수 있다. 이는 target receipt/work completion이나 `completed`와 동의어가 아니다.
- **변경되지 않는 제약:** 2026-07-19 23:57의 1ms timeout과 2026-07-20 00:11의 pre-response WS-drop은 write 뒤 acceptance가 불명인 경로다. 이 경로는 `delivered + unconfirmed`이며 자동 재주입하지 않는다. 2026-07-20 01:03의 `aiox_reply(inReplyToDeliveryId)`도 authenticated reply/one-reply evidence일 뿐 target receipt/automatic ack가 아니다.
- **남은 미검증 조건:** G1-A trace는 per-attempt `(deliveryId, requestId, target runtime identity, threadId)` 보존, response authenticity/late-response dedupe, 또는 그 상태 전이 구현을 증명하지 않는다. G1-C W5 및 후속 구현은 fresh correlated request trace와 사용자·TUI scenario로 이를 확인한 뒤에만 acceptance-ack branch를 선택할 수 있다.

## 2026-07-21 · W3 G1-C accepted closeout consumption

- **Consumed result:** G1-C W11's accepted integration evidence and W14's accepted package closeout were rechecked, including the 4/4 deterministic matrix, current typecheck/diff/registry checks, and the accepted direct Codex/Claude TUI evidence. W3 is therefore completed: G1-C has implemented and verified its bounded process-lifetime Tier 3 reliability boundary.
- **Preserved disposition:** correlated `turn/start` success is delivery acceptance only, not target receipt or work completion. The current Codex experience remains Tier 3: canonical envelope JSON presentation rather than native activity UX; no claim of native activity semantics or automatic target receipt; delivery observability remains unimplemented. Daemon-restart replay/mailbox, time-based stale inference, remote cancellation, retention, and reply-right cleanup remain deferred.
- **Boundary:** this consumes the detached G1-C Return Target only. It does not perform G1-A closeout, change historical G1-A/G1-B/G1-C evidence, or claim a Tier 2 uplift.

### 2026-07-22 19:40 · 2026-07-22  · W3 G1-C final result re-consumption and Q2/W15 reconciliation

- **재소비 범위와 확인한 사실:** G1-C의 최종 decided re-closeout(W14) 및 accepted records W8/W9/W10/W12/W15와 W11 re-verification을 재확인했다. W8은 retained same-request correlation/FSM과 late-success idempotence, W9는 pre-write 한정 FIFO retry/TTL/backpressure, W10은 duplicate-risk-confirmed direct non-queued retransmit-only path, W12는 primary explicit-reject의 exactly-once source notification/canonical render, W15는 manual-attempt lifecycle/API/MCP correction(무시된 no-attempt, post-write `_unconfirmed` non-error uncertainty, attempt-local reject, source-facing `requestId` 비노출), W11은 이를 4-case composition 및 accepted direct-TUI evidence로 재검증했다. W14는 registry/result-consumption/verification gate를 통과시켜 G1-C를 bounded process-lifetime Tier 3 reliability로 re-closeout했다.
- **G1-A W2/Tier 3 정합 판정:** 변경 없음. `turn/start` success는 retained correlation이 있을 때 delivery acceptance일 뿐 target receipt·work completion이 아니고, timeout/response loss/WS drop은 acceptance unknown/`unconfirmed`이며 자동 reinjection하지 않는다. target canonical-envelope JSON presentation은 native TUI tool-activity가 아니며 native activity semantics와 delivery observability는 여전히 없다. durable restart replay/mailbox, heartbeat/time-based stale, remote cancellation, retention, reply-right cleanup은 G1-C final capability가 아닌 명시적 후속 범위다. 업무 reply는 authenticated separate reply flow이고 delivery acceptance와 같은 outcome이 아니다.
- **Q2/W15 효과 판정:** 기존 G1-A statement/pointer 정정 없음. W15는 `unconfirmed` original delivery를 보존한 manual attempt의 outcome/event와 source MCP result를 정밀화했을 뿐, post-write acceptance를 성공으로 추정하거나 native activity/target receipt/runtime cancellation 같은 새 capability를 만들지 않았다. 따라서 기존 W3의 Tier 3 result와 degradation 경계는 그대로 유효하다.
- **W4 owner-audit 입력(시작/반영은 금지):** 이미 current owner에 반영된 항목은 `docs/specs/aiox-message-lifecycle.md`의 W15 manual outcome/reject isolation, `docs/specs/aiox-adapter-model.md`의 Tier 3/acceptance boundary, `docs/specs/aiox-open-deferred.md` 및 Codex/routing architecture의 `unconfirmed`·late-success·deferred boundary다. 이번 재소비에서 직접 확인한 actual owner drift 후보는 없다. 명시적 후속 범위는 durable replay/mailbox, heartbeat/time-based stale, native TUI activity/tool-activity semantics, remote cancellation, retention, reply-right cleanup, delivery observability다. History logs와 accepted G1-C records는 수정 대상이 아니다.
- **Reconcile:** Q2/W15-corrected G1-C final result까지 W3 consumption contract를 충족하므로 W3 completed를 유지한다. 과거 W4 audit entry는 history로 보존하되, 이번 지시의 owner-audit handoff를 아직 수행하지 않았으므로 W4를 유일한 active next Work Item으로 재개한다; G1-A closeout은 시작하지 않는다.

### 2026-07-22 19:41 · 2026-07-22  · W3 reconciliation verification

- **Closeout-safe verification (this reconciliation only):** `.agents/skills/log/scripts/log check logs/G1/2026-07-18-G1-A-Codex-structured-ingress-evidence.md` passed with G1-A `open`, W3 completed, and W4 as the single active next Work Item. `.agents/skills/log/scripts/package-log check logs/G1/2026-07-20-G1-C-codex-tier3-reliability.md` passed every W1–W15 identity and registry-integrity check. `git diff --check` passed with no output. No production code, test, spec, architecture, decision, G1-C record, or W4 owner-audit action was changed or started.

## 2026-07-21 · W4 closeout readiness and owner reflection audit registration

- **Objective:** audit G1-A closeout readiness and owner reflection against the accepted G1-A evidence matrix and accepted G1-B/G1-C closeout results.
- **Method:** read historical G1-A/G1-B/G1-C logs only as append-only evidence; trace the relevant plan, spec, architecture, decision, roadmap, code, and tests; distinguish actual owner drift from historical narrative. Change only the current owner that direct comparison proves stale. Any owner change requires a separate RED/verification path within an explicitly authorized follow-up scope.
- **Required preservation:** retain the final Tier 3 disposition precisely: raw JSON TUI presentation is a limitation, native activity semantics are absent, delivery observability is unimplemented, and correlated delivery acceptance is not target receipt/work completion. Do not rewrite historical logs.
- **Gate:** W4 result review must complete before creating or activating a G1-A closeout pointer. G1-A closeout remains a later separate stage.

### 2026-07-21 20:21 · W4 owner reflection audit result review — accepted

- **Audit facts:** the G1-A W2 matrix, decided G1-B canonical-envelope closeout, and decided G1-C W11/W14 closeout were compared with the current plan, lifecycle/deferred specs, adapter model, Codex/Claude adapter architecture, routing architecture, decisions, implementation, and tests. The decisions remain compatible: `turn/start` acceptance is delivery acceptance, not target receipt/work completion; no decision rewrite is required.
- **Confirmed owner drift and reflection:** six current-owner slices had stale pre-G1 claims (immediate `completed`, legacy reply authority, or missing `unconfirmed`/late correlation). Only those current claims were corrected in `aiox-open-deferred`, `aiox-adapter-model`, and the Codex, Claude, and routing architecture slices. Historical G1-A/G1-B/G1-C logs were read as append-only evidence and were not rewritten.
- **Verification:** Markdown inline-code checks, `git diff --check`, `pnpm typecheck`, and the focused G1-C integration/Codex injector/Codex ingress suite passed (79 tests). No production-code change was needed, so no RED implementation cycle applies; verification instead binds each corrected current/as-built claim to the existing code/test evidence.
- **Final disposition:** G1-A remains Tier 3. The raw canonical-JSON TUI limitation, absence of native activity semantics, lack of delivery observability, and distinction between delivery acceptance and target receipt/work completion are explicitly retained. W4 is accepted/completed. A G1-A closeout pointer may now be created, but closeout itself is a distinct next stage.

### 2026-07-22 19:48 · 2026-07-22 · W4 owner audit matrix and proposed owner-reflection scope

- **Audit scope and immutable evidence:** Re-read G1-C final re-closeout (W14) plus accepted W8/W9/W10/W11/W12/W15 records; traced producer/consumer code and focused tests. The focused suite `tests/unit/daemon/codex-ingress.test.ts`, `tests/unit/adapters/codex-injector.test.ts`, `tests/unit/adapters/codex-mcp-server.test.ts`, `tests/unit/daemon/api.test.ts`, and `tests/integration/codex-tier3-reliability.test.ts` passed 143/143. Historical logs and G1-C records were not edited; implementation/tests were not changed.

- **Audit matrix — 수정 필요:** (1) `docs/specs/aiox-message-lifecycle.md` §4.2 Current implementation caveats still says public `deliveryId` exposure, `inReplyToDeliveryId` authorization, persisted one-reply right, and source-only reply routing are absent. Actual code renders per-delivery canonical `deliveryId`, authenticates original target, consumes the reply right exactly once, and creates the reply only to the original source; `parentMessageId` is provenance, while Claude `chat_id` remains transport metadata. Preserve only the actual `no_active_routes` caveat. (2) §4.3 must separate current Tier 3 FSM (`queued→delivering→delivered`, post-write timeout/response-loss/WS-drop→`unconfirmed`, late same-request success→`delivered`, explicit reject→`failed`, no automatic reinjection) from future automatic ack/`completed`; no current Codex ack producer or `completed` transition was found. (3) routing architecture §8.3 generic `success→completed` and §8.4 terminal `completed`, and Codex architecture §7.8 assertion that the target sends automatic control-plane ack, contradict the current Codex FSM and need the same current-vs-future split.

- **Audit matrix — 현재 문구 유지:** lifecycle §4.3 W15 direct manual attempt semantics; adapter model Tier 3; open/deferred; Codex architecture §§7.6–7.7 and routing §§8.4–8.5. They correctly state: same-requestId `turn/start` success is App Server acceptance, never receipt/work completion; post-write ambiguity is `unconfirmed`; no automatic reinjection; raw canonical JSON is not native activity; business reply is a separate authenticated flow; W12 primary reject produces one daemon-originated notification, while W15 manual reject remains attempt-local. Durable replay/mailbox, heartbeat/time-based stale, remote cancellation, native activity UI, retention/reply-right cleanup, and delivery observability remain excluded/deferred.

- **Proposed exact owner-doc scope only (not applied):** `aiox-message-lifecycle.md` §4.2 caveats and §4.3 current/target labels; `local-runtime-routing-and-delivery.md` §§8.3–8.4 current FSM wording; `local-runtime-codex-adapter.md` §7.8 ack statement. No proposed change to `aiox-open-deferred.md`, `aiox-adapter-model.md`, §7.6–7.7, §8.5, or W15 manual text. A separate owner-reflection implementation/review would be needed before any document edit.

- **Record placement and state:** this Base controlling log has no separate G1-A W4 task-record artifact (confirmed by registry/path search); its registered W4 section is therefore the sole W4 task record and receives this append. W4 remains the only active Work Item; W3 remains completed; G1-A closeout has not started.

### 2026-07-22 20:33 · 2026-07-22 · W4 owner-audit re-scope: schema/events/transport-API gaps and §4.1 envelope divergence

This audit was run read-only against the current working tree (already-modified owner docs + working-tree code), including the "other git changes" beyond the earlier W4 slices. Verified via code `file:line` reads plus two parallel read-only sub-audits (architecture cross-doc; git-changes owner-gap sweep). No owner doc, code, test, or historical log was edited. Facts are code-verified; inferences are marked.

- **Two prior W4 entries reconciled (no contradiction):** the 2026-07-21 20:21 result applied a first correction pass to codex §7.6–§7.7, routing §8.1/§8.3/§8.5, claude §6.4, `aiox-adapter-model` matrix (Codex row), `aiox-open-deferred`, lifecycle §4.3 FSM/§4.5 (= the current git-modified docs). The 2026-07-22 19:48 matrix then flagged still-unedited items (lifecycle §4.2, §4.3 ack/`completed`, codex §7.8). The working tree confirms both: round-1 edits are present; round-2 proposals are unapplied. They are sequential passes, not conflicting claims.

- **Scope correction — prior W4 audits (incl. the 2026-07-22 19:40 W3 handoff "no owner drift" line) under-scoped.** They audited lifecycle/routing/codex/claude/adapter-model but did not audit the schema owner, the events-catalog owner, the transport-API owner, or the new delivery failure modes. Those hold confirmed uncaptured drift below. The earlier "actual owner drift 후보 없음" is superseded by this wider scope.

- **Confirmed normative-vs-implementation divergence (needs a decision, must NOT be silently doc-matched):**
  - Envelope §4.1 normative field table marks `inReplyToDeliveryId` REQUIRED for reply envelopes (`docs/specs/aiox-message-lifecycle.md:80`), but `formatAioxChannelEnvelope` never emits it (`src/daemon/state.ts:2297-2326`). Reply *ingress authorization* by `inReplyToDeliveryId` is implemented (`runReplyTransaction`, `src/daemon/state.ts:2512-2560`); the *outgoing* reply envelope carries no back-reference. Additionally the formatter emits `outcomeForDeliveryId` as a canonical top-level key (`state.ts:2322-2324`) though it is absent from the §4.1 table, and §4.1 forbids new canonical top-level keys outside the contract (`:107-110`). Resolution requires a choice — emit `inReplyToDeliveryId` in the formatter (code fix) or amend the normative contract (spec + decision) — and formally admit `outcomeForDeliveryId` into the §4.1 table. Per `docs/specs/AGENTS.md` §5, code difference alone must not overwrite a Normative contract.
  - Automatic control-plane ack / `completed`: lifecycle §4.3 (`:184-193`) still states auto-ack and `completed` in normative present tense without a Current-vs-Committed-target split; codex architecture §7.8 (`docs/architecture/local-runtime-codex-adapter.md:247`) asserts "its target runtime sends control-plane ack automatically" as current as-built. Code has no ack producer and no transition into `completed`; `completed` is an enum member only (`src/core/deliveries.ts:7`). Lifecycle §4.3 fix = relabel the ack/`completed` block as `Committed target` (do not delete). §7.8 fix = correct the stale as-built ack claim and the cutover framing.

- **Confirmed owner-doc stale — mechanical reconciliation (no decision):**
  - lifecycle §4.2 Current implementation caveats (`:145-165`) still says public `deliveryId` unexposed and `inReplyToDeliveryId`/source-only routing unimplemented; contradicts implemented code and the already-updated routing §8.5. The `deliveryId` caveat needs a split: target-side envelope `deliveryId` IS rendered, but source-facing delivery observability is absent (send/reply result = `delivered` count + `deferred`/`failed` arrays keyed by `targetAgentId`, no per-target `deliveryId`; `src/adapters/shared/dispatch-schema.ts`, `src/daemon/state.ts:402`). Keep only the real `no_active_routes` caveat.
  - `inReplyToDeliveryId` cutover not propagated to five surfaces: codex §7.8 tool list (still `aiox_send_message({content})` / `aiox_reply({parent_message_id, content})`), claude §6.3–§6.4, transport-API reply rows (parent=chatId / parentMessageId), events §11 reply-received field lists (`chatId` / `parentMessageId`), and the `aiox-adapter-model` Claude row ("text envelope" / "legacy chat_id"). Code uses typed tools with `inReplyToDeliveryId` and both adapters render the same canonical JSON envelope (`state.ts:1809` Claude, `:2004` Codex).
  - CLI operator surface §9.3 documents five delivery statuses; code prints six incl. `unconfirmed` (`src/cli/format.ts:64-68`, `src/core/deliveries.ts:3-10`).

- **Confirmed uncaptured drift — owners never touched by the workstream:**
  - Schema owner `local-runtime-store-and-repositories.md`: missing `reply_rights` and `delivery_outcome_notifications` tables, the new `messages` columns (`origin_kind`, `intent`, `reply_expected`, `outcome_for_delivery_id`), and migrations 2/3/4. It documents only `applyMigration1` and the old `messages` column set. Evidence: `src/store/schema.ts:48-135`, `src/store/repositories/reply-rights.ts`.
  - Events-catalog owner `local-runtime-errors-events-smoke.md` §11: declares 25 entries; `src/core/events.ts` now has 31, with six uncatalogued (`delivery_expired`, `delivery_manual_retransmit`, `_unconfirmed`, `_delivered`, `_rejected`, `delivery_target_rejected`).
  - Transport-API owner `local-runtime-daemon-transport-api.md`: missing the `retransmitUnconfirmedDelivery` RPC (`src/daemon/api.ts:57-59,259-267`) and the new typed errors on `sendMessage`/reply (`delivery_queue_full`, `unknown_delivery`, `correlation_mismatch`, `reply_not_expected`, `duplicate_reply`); reply rows still describe `parent=chatId`/`parentMessageId`.
  - New delivery failure modes with no owner at all: queue admission cap 32 → `delivery_queue_full` (fan-out-atomic; `src/daemon/state.ts:2411-2421`), and queued TTL 5 min → `delivery_expired` (`queued→failed`; `src/daemon/state.ts:1393-1417`). The routing §8 FSM shows only `queued→failed` via `target_agent_not_found`.
  - Frozen retry constants: pre-write schedule `[250ms,1s,4s]`, max 3 attempts, queued-flush on runtime ready/rebind (`src/core/deliveries.ts:17,23-24`, `state.ts:1447-1497`). Lifecycle §4.3 still defers the values to G1 failure-injection, but code has frozen them; current behavior is not recoverable from the owner docs. (Inference: whether to document the frozen values now or keep them deferred is a judgment for the spec owner.)

- **Correctly stated (no change):** `unconfirmed` FSM/state; reply-right one-reply correlation contract (§4.2/§8.5); canonical envelope base object vs §4.1; W12 daemon-originated reject notification behavior (§7.7/§8.5); the five-minute late-response observer (§7.6); claude §6.5 sequence diagram; `deliveryId:null` on reply-received events; adapter-model Tier 3 / open-deferred boundaries.

- **Disposition:** W4 stays active. Owner reflection is NOT applied. Two items block a clean G1-A closeout because they need a decision, not an edit: (1) the §4.1 `inReplyToDeliveryId`/`outcomeForDeliveryId` envelope divergence, (2) the auto-ack/`completed` current-vs-target labelling. The remaining findings are safe mechanical owner reconciliations across lifecycle §4.2, codex §7.8, claude §6.3–§6.4, transport-API, events §11, CLI §9.3, `aiox-adapter-model` Claude row, and the schema owner. No production code, test, spec, architecture, decision, or historical log was changed by this audit.

### 2026-07-22 20:58 · 2026-07-22 · A1 accepted as closeout blocker — corrective-work scope (proposal only)

User accepted A1 as a real closeout blocker: do not lower owner docs to match code; run a separate bounded corrective work that emits `inReplyToDeliveryId` on the outbound reply envelope and formally admits `outcomeForDeliveryId` into the §4.1 field table. No legacy alias/fallback/dual-write. This entry is proposal-only: no code, doc, or roadmap was changed; package ownership awaits the user's decision.

- **Feasibility fact (code-verified):** the data to emit `inReplyToDeliveryId` already exists — `runReplyTransaction` stores the originating delivery id as `parentMessageId` on the reply message (`src/daemon/state.ts:2552`). Both adapters serialize through one function `formatAioxChannelEnvelope` (`state.ts:2297-2326`; Codex call `:2004`→`turn/start input.text`, Claude call `:1809`→`/send content`), so byte-equality is achievable at a single producer.
- **Producer/consumer:** producer = `formatAioxChannelEnvelope` (sole envelope serialization point for send/reply/outcome, both adapters). Data sources = `message.parentMessageId` (originating deliveryId, replies only) and `message.outcomeForDeliveryId` (daemon outcome notifications). Consumers = `injectReplyIntoCodexRuntime` (`:2004`), `injectClaudeChannel` (`:1809`), and receiving-agent MCP tool docs that already reference `inReplyToDeliveryId`. Spec consumer = lifecycle §4.1 field table.
- **Allowed write-set (proposed):** `src/daemon/state.ts` `formatAioxChannelEnvelope` only (conditional `inReplyToDeliveryId` for `type==="reply"`; keep `outcomeForDeliveryId`); `docs/specs/aiox-message-lifecycle.md` §4.1 field table (add `outcomeForDeliveryId` row as a deliberate contract addition; confirm the existing `inReplyToDeliveryId` REQUIRED row); the reply/envelope test files below. Explicitly out of scope: schema (no new column — `parentMessageId` already holds the deliveryId; the name-vs-semantics smell is flagged, not fixed), the B mechanical owner batch, roadmap, historical logs, and any legacy alias/fallback/dual-write. To confirm during RED: a daemon outcome-notification message must not also carry `parentMessageId`, so `inReplyToDeliveryId` and `outcomeForDeliveryId` stay mutually exclusive on the wire.
- **Test matrix (proposed):** (1) byte-equality of Codex `turn/start input.text` vs Claude `/send content` for reply, outcome-notification, and normal send; (2) field presence — reply envelope includes `inReplyToDeliveryId`=originating deliveryId, new-thread send omits it, outcome notification includes `outcomeForDeliveryId` and omits `inReplyToDeliveryId`; (3) regression — reply-right one-time consume, source-only route, `duplicate_reply`, W12 notification grants no reply-right, no automatic reinjection. Owner files: `tests/unit/daemon/codex-ingress.test.ts`, `tests/unit/adapters/codex-injector.test.ts`, `tests/unit/adapters/claude-channel.test.ts`, `tests/unit/daemon/api.test.ts`, `tests/integration/codex-tier3-reliability.test.ts`.
- **Ownership recommendation:** the defect spans the G1-B envelope-field contract and the G1-C W12 outcome-notification field, and both packages are `decided`. Recommend a NEW bounded G1-A work item (W5) that owns the corrective slice and consumes G1-B/G1-C as accepted context, rather than reopening a decided package (a shared-contract completion should not drag either closed closeout back open). Alternative if the user prefers package-local ownership: reopen G1-B as the envelope-contract owner. Decision requested before any work-item/plan change.
- **A2 roadmap reconciliation input:** automatic control-plane ack / `delivered→completed` is a roadmap-committed target but scoped to Phase 1 Tier 2 delivery-ack uplift (`docs/product/roadmap.md:239,:438,:449`), explicitly separated from Phase 0; roadmap `:211` forbids overstating unguaranteed ack as `completed`; G1-C `:201` was a judgment gate and its Phase 0 outcome for Codex was degraded/manual (Tier 3, `unconfirmed`), not automatic ack. So the owner-reflection direction is: label the ack/`completed` block `Committed target` (Phase 1 Tier 2 uplift), separate from as-built Tier 3 — not `Current`, not merely `deferred/open`. Flag for the later roadmap reconciliation: roadmap `:438`'s "Phase 0 G1-C baseline adapter automatic ack" assumption vs the actual degraded/manual G1-C outcome may itself be roadmap drift.
- **Sequencing:** B mechanical stale items remain a single batch owner-reflection to apply after A1 corrective work is accepted; then roadmap reconciliation, then G1-A W4/closeout. W4 stays active.

### 2026-07-22 21:34 · 2026-07-22 · W5 ownership fixed + producer-side audit grounded (proposal only, not yet registered)

User fixed ownership: the A1 corrective slice is a NEW G1-A work item **W5**. Do not reopen G1-B/G1-C; reference them only as accepted context / producer history. W4 stays active; the B owner batch, roadmap reconciliation, and G1-A closeout do not start until W5 is accepted. This entry does not register W5 and changes no code, doc, or roadmap — it records the grounded audit and the finalized W5 brief for the user's next go/no-go. Legacy alias/fallback/dual-write and schema migration remain forbidden.

- **Producer-side audit (code-verified this session):**
  - `type:"reply"` has exactly one producer — `runReplyTransaction` (`src/daemon/state.ts:2553`), invoked only by `receiveClaudeChannelReply` (`:1206`) and `receiveCodexReply` (`:1332`), the dedicated reply RPCs. It deterministically sets `parentMessageId = originatingDelivery.id` (`:2552`), a deliveryId.
  - The agent-authored send tool restricts `type` to `z.enum(["question","instruction"])` (`src/adapters/codex/mcp-server.ts:223`); an agent cannot author a `reply` through send. The Codex reply tool is daemon-fixed to `reply` (`:140`) and routes through the reply RPC, not send.
  - No producer populates `AdapterOutgoingMessage.parentMessageId` / `SendMessageRequest.parentMessageId` on the non-reply path: the only `parentMessageId` writes are the reply path (`:2552`) and the send path's verbatim pass-through (`:2445`), and no adapter assigns it. Therefore gating the emit on `type==="reply"` is both sufficient (catches every reply) and non-polluting (never emits for question/instruction/status/event even if some future message carried a `parentMessageId`). Gating on `type` is strictly safer than gating on `parentMessageId` presence.
  - The W12 daemon outcome notification (`:1592`) is `type:"event"` with `outcomeForDeliveryId` set and `parentMessageId` unset (→ null). So `inReplyToDeliveryId` (reply-only) and `outcomeForDeliveryId` (notification-only) are structurally mutually exclusive on the wire — disjoint message kinds, not a convention.
  - Byte-equality is structural: both injection sites pass the `formatAioxChannelEnvelope` return verbatim to their transport — Claude as `content` (`:1809`), Codex as `input.text` (`:2004`) — so identical `StoredMessage`+`StoredDelivery` inputs yield an identical wire string. The test locks this invariant rather than establishing it.

- **W5 brief (proposed, not registered):**
  1. **Brief / verification contract / dependency / allowed write-set** — Brief: emit `inReplyToDeliveryId` on the outbound reply envelope and formally admit `outcomeForDeliveryId` into lifecycle §4.1, as one atomic corrective change. Verification contract = the test matrix below (RED first). Dependency = accepted G1-B envelope contract + G1-C W12 outcome field (context only, not reopened). Allowed write-set = `src/daemon/state.ts` `formatAioxChannelEnvelope` only; `docs/specs/aiox-message-lifecycle.md` §4.1; the five test files below. Out of scope: schema/migration, the B batch, roadmap, history.
  2. **Reply-only emit invariant** — the formatter emits `inReplyToDeliveryId = message.parentMessageId` iff `message.type === "reply"`; for every other type the key is absent.
  3. **Producer-side audit basis** — the audit above is the standing justification that reply-only gating is non-polluting: `parentMessageId` is populated only on reply messages, and no non-reply producer sets it.
  4. **Mutual exclusion** — an outcome notification emits `outcomeForDeliveryId` only and never `inReplyToDeliveryId`; guaranteed structurally by disjoint message kinds (event+`outcomeForDeliveryId` vs reply+`parentMessageId`).
  5. **Byte-equality triad** — Codex `turn/start input.text` == Claude `/send content` for normal send, reply, and outcome notification each.
  6. **Regression list** — reply-right one-time consume; source-only route; `duplicate_reply`; W12 notification grants no reply-right; no automatic reinjection.
  7. **§4.1 atomicity** — the `outcomeForDeliveryId` field-table admission ships in the same corrective change as the emit code (not a separate B item).

- **Disposition:** W5 is proposed, not registered; no plan/work-item/code/doc/roadmap change was made. Awaiting the user's go to register W5 and begin RED.

### 2026-07-22 21:48 · W4 pending owner-batch scope clarification — delivery idempotency and transport dedupe

- **Pending owner-reflection distinction (not an implementation claim or a W5 scope change):** the later W4 mechanical owner batch must distinguish three different correlation/deduplication responsibilities. (1) daemon common delivery-creation idempotency is `idempotencyKey = messageId:targetAgentId`, persisted under a UNIQUE database constraint; it prevents a duplicate target delivery from being created before either the Codex or Claude adapter is selected. (2) Codex transport response dedupe is the internal `requestId` correlation used to classify late/duplicate App Server responses; it is a Codex-specific Tier 3 reliability surface established by G1-C W8/W15. (3) Claude has no separately verified or guaranteed transport-level receipt/dedupe equivalent to Codex `requestId`; the common daemon delivery-creation idempotency must not be presented as such a guarantee.
- **Evidence:** common idempotency construction/collision handling is in `src/store/repositories/deliveries.ts:113-142` and the database UNIQUE field is in `src/store/schema.ts:62-71`. Codex late/duplicate request correlation is in `src/adapters/codex/websocket.ts:192-210,278-286` and `src/daemon/state.ts:2000-2034`.
- **Placement/disposition:** this is an append-only scope clarification for the pending W4 owner batch. It changes no Work Item state, does not register W5, and does not edit any owner document before W5 is accepted. Apply it minimally where lifecycle/Codex/Claude wording would otherwise conflate `idempotencyKey`, public `deliveryId`, and Codex-internal `requestId`; do not duplicate already-correct store/routing ownership text.

### 2026-07-22 22:52 · 2026-07-22 · W5 registered and implemented — RED→GREEN candidate evidence (stop before acceptance)

Concurrent-writer reconciliation (recorded per user authorization): a parallel Codex session had also registered W5, reconciled Work Items (W4→open, W5 sole active), added the `### {W5}` Required Context, and appended its own `## W5 A1 …` registration entry. The user authorized deleting Codex's overlapping additions. Kept: the reconciled Work Items state, the `### {W5}` Required Context, and the `21:48 · W4 pending owner-batch scope clarification` entry (its `idempotencyKey`/public `deliveryId`/Codex `requestId` distinction was independently verified against `src/store/repositories/deliveries.ts:120`, `src/store/schema.ts:67`, `src/adapters/codex/websocket.ts:192-210,287`). Removed: Codex's duplicate `## W5 A1` registration entry, which this implementation-evidence entry supersedes.

- **RED (verified failing against pre-change code):** two reply wire-envelope assertions in `tests/unit/daemon/codex-ingress.test.ts` were tightened to require `inReplyToDeliveryId` = originating deliveryId — the Claude-transport reply exact-string case ("receiveCodexReply dispatches routed reply delivery to registered Claude channel") and the Codex-transport reply `toMatchObject` case ("creates routed reply delivery to connected Codex channel"). Focused run before GREEN: exactly these 2 failed, 65 passed — the omission was the only gap.
- **GREEN (minimal, single producer):** `src/daemon/state.ts` `formatAioxChannelEnvelope` now appends `inReplyToDeliveryId: message.parentMessageId` iff `message.type === "reply" && message.parentMessageId`, alongside the existing conditional `outcomeForDeliveryId`. No other code path changed; no schema, migration, alias, fallback, or dual-write. Focused run after GREEN: 67/67 pass in `codex-ingress.test.ts`.
- **§4.1 admission (same atomic change):** `docs/specs/aiox-message-lifecycle.md` §4.1 field table gained an `outcomeForDeliveryId` row (optional, `source.kind=daemon` outcome-notification only, mutually exclusive with `inReplyToDeliveryId`, otherwise MUST be absent). The existing `inReplyToDeliveryId` REQUIRED row was already correct; the corrective code brings the wire into compliance with it rather than changing the row. This is an optional canonical field already emitted by shipped code, so no protocol version bump (v1 receivers ignore unknown optional fields).
- **Test matrix coverage:** byte-equality — a new fan-out test ("serializes a normal send byte-identically for Codex turn/start and Claude /send") normalizes only `deliveryId` + `target.address` and asserts byte-identical remainder; reply and outcome byte-equality are pinned by the paired per-transport assertions (reply on both transports, notification on both transports). Field presence — reply carries `inReplyToDeliveryId`, normal send carries neither correlation field (existing exact-string send tests already lock this), notification carries `outcomeForDeliveryId` and, by two added `not.toHaveProperty("inReplyToDeliveryId")` locks, never the reply field. Regression — reply-right one-time consume, source-only route, `duplicate_reply`, W12 no reply-right, no reinjection all still pass unchanged.
- **Checks:** `tsc --noEmit` clean; `scripts/check-markdown-inline-code docs/specs/aiox-message-lifecycle.md` clean; `git diff --check` clean. Changed files limited to the allowed write-set: `src/daemon/state.ts`, `docs/specs/aiox-message-lifecycle.md`, `tests/unit/daemon/codex-ingress.test.ts`.
- **Pre-existing unrelated failures (fact, flagged, not W5):** the full `vitest run` shows 6 failures across 4 files outside the write-set — `tests/unit/core/messages.test.ts` (2), `tests/unit/store/repositories/messages-deliveries.test.ts` (1, a `unconfirmed` `countByStatus` key), `tests/unit/daemon/message-fanout-store.test.ts` (1), `tests/unit/daemon/socket-transport.test.ts` (2). Stashing only my `state.ts` change and re-running these four files reproduced the same 6 failures, so they are independent of the W5 corrective change and belong to the in-progress uncommitted schema/messages/deliveries work in the working tree. Not fixed here; reported for the user.
- **Candidate status:** W5 implementation is complete and verified within its scope (RED→GREEN + §4.1 atomic). W5 is NOT marked accepted — that is the user's gate. Per instruction, the B mechanical owner batch, roadmap reconciliation, and G1-A W4/closeout are NOT started. Stopping at candidate evidence.

### 2026-07-22 23:04 · 2026-07-22 · W5 candidate result review — verdict: candidate PASS

Read-only verification pass at user request; no code/doc/roadmap/Work-Item change. Each review item verified against current code/tests:

- **Write-set confinement — PASS.** This session's only edits are `src/daemon/state.ts` `formatAioxChannelEnvelope` (the `type==="reply"` conditional, `:2322-2324`), `docs/specs/aiox-message-lifecycle.md` §4.1 (`outcomeForDeliveryId` row `:81`), and `tests/unit/daemon/codex-ingress.test.ts`. No schema/migration, no roadmap, no other adapter or production file, no other spec. The many other modified files in the working tree pre-date this session (in-flight G1-B/G1-C cutover).
- **Reply-only `inReplyToDeliveryId` — PASS.** Serializer gates on `input.message.type === "reply" && input.message.parentMessageId` (`state.ts:2322`). Producer-side audit stands: `type:"reply"` is produced only by `runReplyTransaction` (`:2553`), which always sets `parentMessageId = originatingDelivery.id`; no non-reply producer sets `parentMessageId`.
- **Normal send omits both correlation fields — PASS.** Send is `type` question/instruction (≠reply) with `outcomeForDeliveryId=null`, so both conditionals are skipped. Locked by the byte-equality test's `not.toHaveProperty` on send and by the pre-existing exact-string send assertions.
- **Outcome notification emits only `outcomeForDeliveryId` — PASS.** W12 notification is `type:"event"`, `parentMessageId=null`, `outcomeForDeliveryId` set → emits `outcomeForDeliveryId`, omits `inReplyToDeliveryId`. Locked by the two `not.toHaveProperty("inReplyToDeliveryId")` assertions on the Claude- and Codex-transport notification envelopes.
- **Byte-equality send/reply/outcome — PASS.** One serializer feeds both transports verbatim (Claude `content` `:1809`, Codex `turn/start input.text` `:2004`). New fan-out test asserts byte-identical send envelope after normalizing only `deliveryId`+`target.address`; reply and outcome are pinned by paired per-transport exact/matchObject assertions.
- **Regression — PASS.** reply-right one-time consume, source-only route, `duplicate_reply`, W12 notification grants no reply-right, no automatic reinjection — all green in the 67/67 `codex-ingress.test.ts` run.
- **§4.1 ↔ code atomicity — PASS.** The reply now satisfies the pre-existing `inReplyToDeliveryId` REQUIRED row (`:80`); the new `outcomeForDeliveryId` row (`:81`) matches the already-emitted daemon-notification field and its mutual exclusion. Both spec and code change ship together.
- **6-failure independence + acceptance relation — evidence recorded.** Re-run with `src/daemon/state.ts` stashed reproduces the same 6 failures (6 failed | 10 passed) across `core/messages.test.ts` (2), `store/repositories/messages-deliveries.test.ts` (1), `daemon/message-fanout-store.test.ts` (1), `daemon/socket-transport.test.ts` (2); state.ts restored after. Root cause (diagnosed): stale exact `.toEqual` expectations that omit three fields the in-flight G1-B/G1-C work added — `originKind`/`origin_kind`, `outcomeForDeliveryId`/`outcome_for_delivery_id` (message model), and the `unconfirmed` delivery-status enum entry (`countByStatus`). Evidence the fields are non-W5: `git show HEAD:src/core/messages.ts` has 0 occurrences of `originKind`/`outcomeForDeliveryId`; the working tree has 6. These four test files are outside the W5 write-set, so the failures are not a W5-contract defect; they do mean the full suite is not green and belong to whoever owns the G1-B/G1-C test cutover.

- **Verdict: candidate PASS** for the W5 contract on all seven scope items. Caveat carried forward, not a W5 blocker: the full `vitest run` is red due to the 6 pre-existing out-of-write-set failures above. W5 remains not accepted (user gate); no downstream step started.

### 2026-07-22 23:29 · W5 accepted — reply-envelope corrective slice completed; 6-failure independence separated

Read-only acceptance/reconcile pass at user request. 이번 세션은 code·test·spec·architecture·roadmap을 변경하지 않았고, W5 acceptance 외 Work Item 상태도 바꾸지 않았다. git stash/reset/restore/checkout은 수행하지 않았다.

- **Acceptance basis — 이 세션에서 직접 재대조한 사실:** candidate evidence(22:52)와 candidate result review(23:04)의 scope 항목을 현재 code·spec에 직접 재확인했다. `formatAioxChannelEnvelope`는 `type==="reply" && parentMessageId`일 때만 `inReplyToDeliveryId`를 emit하고 `outcomeForDeliveryId`가 있을 때만 그 field를 emit한다(`src/daemon/state.ts:2322-2327`). lifecycle §4.1 field table은 `inReplyToDeliveryId` REQUIRED row(`docs/specs/aiox-message-lifecycle.md:80`)와 새 `outcomeForDeliveryId` optional·mutually-exclusive row(`:81`)를 함께 담아 code와 atomic하다. `git diff --check` clean; `log check` PASS(G1-A `open`, W5 `[>]` 단일 active, W3 completed).
- **Acceptance basis — candidate 기록에서 소비한 checkpoint(이 세션 미재실행):** focused 67/67(`tests/unit/daemon/codex-ingress.test.ts`), `tsc --noEmit` clean, `scripts/check-markdown-inline-code docs/specs/aiox-message-lifecycle.md` clean은 candidate evidence·result review의 기록을 근거로 소비했다. 이 세션은 전체 suite 재실행이나 stash 기반 재현을 하지 않았다.
- **6개 계약 충족 판정 (모두 PASS):** (1) reply만 `inReplyToDeliveryId` emit — reply-only conditional 확인. (2) normal send는 두 correlation field omit — question/instruction + `parentMessageId`/`outcomeForDeliveryId` 없음으로 두 conditional 모두 skip. (3) outcome notification은 `outcomeForDeliveryId`만 emit — W12 event는 `parentMessageId=null`이라 reply field 배제(`not.toHaveProperty` 2건 lock). (4) Codex/Claude send·reply·outcome canonical serialization byte-equality — 단일 serializer가 두 transport에 verbatim 공급(Claude `content` `:1809`, Codex `turn/start input.text` `:2004`), byte-equality fan-out test + paired per-transport assertion으로 lock. (5) reply-right/source-only/`duplicate_reply`/W12 no-right/no-reinjection 회귀 green. (6) §4.1 `outcomeForDeliveryId` field-table가 code emit과 atomic. 추가 scope인 write-set confinement도 PASS: W5 세션 편집은 `src/daemon/state.ts`·`docs/specs/aiox-message-lifecycle.md`·`tests/unit/daemon/codex-ingress.test.ts`로 한정.
- **6-failure 분리 기록 — W5와 독립(사실은 candidate 기록에서 소비):** 전체 `vitest run`의 6개 실패는 W5 write-set 밖이며, candidate 기록에서 `src/daemon/state.ts`만 stash 후 재실행해 동일 6건이 재현돼 W5와 독립임이 확인됐다. 파일 분포: `tests/unit/core/messages.test.ts`(2), `tests/unit/store/repositories/messages-deliveries.test.ts`(1), `tests/unit/daemon/message-fanout-store.test.ts`(1), `tests/unit/daemon/socket-transport.test.ts`(2). 근본 원인 분류: (a) message/store 신규 필드(`originKind`/`origin_kind`, `outcomeForDeliveryId`/`outcome_for_delivery_id`) 반영 안 된 stale exact-expectation 3개, (b) `unconfirmed` delivery-status(`countByStatus` 등) 반영 안 된 stale expectation 3개. 이 6건은 in-flight G1-B/G1-C schema/messages/deliveries cutover에 뒤처진 test-consumer stale expectation이며 W5 계약 결함이 아니다. **W5 acceptance blocker는 아니지만, 전체 suite가 green이 아니므로 G1-A final closeout 전 별도 corrective가 반드시 필요하다.** (a·b의 3+3 근본원인 grouping은 candidate 기록의 진단과 이번 지시의 분류를 따른 것이며, `message-fanout-store`/`socket-transport`의 per-file 원인은 이 세션에서 재실행으로 재확인하지 않았다.)
- **Disposition:** W5 accepted/completed. B mechanical owner batch, roadmap reconciliation, G1-A W4/closeout은 시작하지 않았다. W6은 등록하지 않았다. W5 완료로 active `[>]`가 없으며 W4는 `[ ]` open으로 유지된다(W4 owner batch 착수와 W6 등록은 모두 user-gated).
- **Next — 유일 pointer(제시만, 이 세션 미등록):** `W6 test-consumer corrective registration` — 위 6개 stale test expectation을 in-flight G1-B/G1-C cutover에 맞춰 정합화하는 새 work item. W5와 동일하게 user go 이후 등록·RED→GREEN 구현한다.

## 2026-07-22 · 2026-07-22 · W6 stale Vitest exact-expectation corrective registered

- **Registration basis:** W5 is completed/accepted, W4 remains open, and the Work Items had no active marker before this registration; W6 is now the sole active item.
- **Exact write-set:** `tests/unit/core/messages.test.ts`, `tests/unit/store/repositories/messages-deliveries.test.ts`, `tests/unit/daemon/message-fanout-store.test.ts`, `tests/unit/daemon/socket-transport.test.ts` only. No production, schema/migration, docs/spec/architecture/roadmap, W4, closeout, or G1-B/G1-C package change.
- **RED matrix:** run exactly `pnpm exec vitest run tests/unit/core/messages.test.ts tests/unit/store/repositories/messages-deliveries.test.ts tests/unit/daemon/message-fanout-store.test.ts tests/unit/daemon/socket-transport.test.ts`; expected independent failures: message defaults (2), repository `unconfirmed: 0` count (1), persisted DB row defaults (1), socket status delivery count (2).
- **GREEN matrix:** update only exact `.toEqual` expected values with `originKind: "agent"`, `outcomeForDeliveryId: null`, `origin_kind: "agent"`, `outcome_for_delivery_id: null`, and `unconfirmed: 0`; no loose matcher. Re-run focused matrix, then full `pnpm exec vitest run`; any new failure is classification-only. Finish with `pnpm exec tsc --noEmit`, `git diff --check`, and log/package check. Candidate evidence only; W6 acceptance is explicitly deferred.

## 2026-07-22 · 2026-07-22 · W6 stale exact-expectation corrective — candidate evidence (stop before acceptance)

- **Scope confinement:** W6 changed only the four authorized test files. No production code, schema/migration, documentation/spec/architecture/roadmap, G1-B/G1-C package record, W4 owner batch, or closeout artifact was changed.
- **RED reproduced:** `pnpm exec vitest run tests/unit/core/messages.test.ts tests/unit/store/repositories/messages-deliveries.test.ts tests/unit/daemon/message-fanout-store.test.ts tests/unit/daemon/socket-transport.test.ts` produced exactly 6 failures / 10 passes: `core/messages` (2 default-field omissions), `messages-deliveries` (1 missing `unconfirmed: 0`), `message-fanout-store` (1 missing persisted `origin_kind`/`outcome_for_delivery_id`), and `socket-transport` (2 missing `deliveryCounts.unconfirmed: 0`).
- **GREEN implementation:** updated exact `.toEqual` expected objects only: message outputs now require `originKind: "agent"` and `outcomeForDeliveryId: null`; persisted message row requires `origin_kind: "agent"` and `outcome_for_delivery_id: null`; repository and socket status maps require `unconfirmed: 0`. No matcher was loosened and no production producer/consumer changed.
- **Focused verification:** the same four-file command is GREEN: 4 files, 16 tests passed.
- **Full verification:** `pnpm exec vitest run` is GREEN: 54 files, 552 tests passed. No new failure appeared, so no out-of-scope classification was needed.
- **Additional checks:** `pnpm exec tsc --noEmit` clean; `git diff --check` clean; `.agents/skills/log/scripts/log check logs/G1/2026-07-18-G1-A-Codex-structured-ingress-evidence.md` passes with W6 sole active and W4 open; `.agents/skills/log/scripts/package-log check logs/G1/2026-07-20-G1-C-codex-tier3-reliability.md` passes registry integrity.
- **Candidate disposition:** W6 implementation and verification evidence is complete. Per user instruction, W6 is not accepted/marked complete; W4 owner batch, roadmap reconciliation, and G1-A closeout remain unstarted.

## 2026-07-22 · 2026-07-22 · W6 candidate result review — verdict: candidate PASS

- **Verdict: candidate PASS.** This is a read-only result review; W6 remains active and is neither accepted nor completed.
- **Write-set and non-scope surface:** W6’s six corrective assertions are confined to the four Brief files: `tests/unit/core/messages.test.ts` (two `originKind: "agent"` + `outcomeForDeliveryId: null` exact output assertions), `tests/unit/store/repositories/messages-deliveries.test.ts` (one exact `unconfirmed: 0` count), `tests/unit/daemon/message-fanout-store.test.ts` (one exact DB-row `origin_kind` + `outcome_for_delivery_id` assertion), and `tests/unit/daemon/socket-transport.test.ts` (two exact `deliveryCounts.unconfirmed: 0` assertions). No W6 change uses a loose matcher. The candidate chronology records production/schema/docs/roadmap/G1-B/G1-C package state as untouched; the current dirty `git diff` is aggregate and cannot independently attribute pre-existing unrelated changes, but exposes no W6-required production or owner-surface edit.
- **RED/root-cause confirmation:** `createMessage` defaults to `originKind: "agent"` and `outcomeForDeliveryId: null` (`src/core/messages.ts:59-70`); the store persists the corresponding snake-case columns; delivery statuses include `unconfirmed` and `countByStatus()` initializes every status at zero (`src/core/deliveries.ts:3-12`, `src/store/repositories/deliveries.ts:225-238`). Therefore the six prior failures are three stale message/row exact omissions and three stale status/count exact omissions, not behavioral defects.
- **W5 independence:** W5’s `formatAioxChannelEnvelope` is a downstream canonical-JSON formatter for already-stored messages/deliveries and gates reply `inReplyToDeliveryId` separately (`src/daemon/state.ts:2297-2328`). W6 covers core-message defaults, raw store row, repository counts, and daemon-status socket output; none invokes or asserts the formatter, so no causal path connects the W5 reply correction to these six expectation updates.
- **Verification evidence independently rechecked in this review:** focused Vitest 4 files / 16 tests GREEN; full Vitest 54 files / 552 tests GREEN; `pnpm exec tsc --noEmit` and `git diff --check` GREEN; G1-A `log check` and G1-C `package-log check` GREEN. These match the candidate evidence.
- **Record placement:** W6 is an inline G1-A Work Item with no separate G1-A task record; this append immediately following its candidate evidence is the applicable W6 result-review record.

## 2026-07-22 · 2026-07-22 · W6 accepted/completed — stale exact-expectation corrective reconciled

- **Acceptance: W6 accepted/completed.** The candidate and independent result review are consumed as a single disposition; this changes only W6 Work Item state. No source, test, schema/migration, documentation, roadmap, G1-B/G1-C package state, or other Work Item changed in this acceptance.
- **Accepted scope/result:** the four authorized test files contain the six exact stale-expectation corrections only: three `originKind`/`outcomeForDeliveryId` message-or-row expectations and three `unconfirmed: 0` status/count expectations. The assertions remain exact `.toEqual` values; no loose matcher was introduced for those six assertions.
- **Accepted verification:** recorded RED was exactly 6 failures / 10 passes; subsequent focused run was 4 files / 16 tests GREEN and full Vitest was 54 files / 552 tests GREEN. `pnpm exec tsc --noEmit`, `git diff --check`, G1-A `log check`, and G1-C `package-log check` all passed and were rechecked for this disposition.
- **Accepted boundary:** W5 canonical reply formatter is downstream of W6’s core-message defaults, stored row, delivery count, and socket-status assertions; no formatter call or data/control path makes the W5 correction causal for W6. The dirty-worktree aggregate diff cannot prove every session-level attribution, but that limitation is recorded and no blocker exists in W6’s six assertions.
- **Reconcile:** W6 is completed; W4 remains open and unchanged. No W4 owner batch, roadmap reconciliation, or G1-A closeout has begun.
- **Next — W4 owner-document batch implementation**

## 2026-07-22 · 2026-07-22 · W4 owner-document batch — candidate evidence (stop before acceptance)

- **Scope/result:** W4 is the sole active Work Item. This candidate reflects accepted G1-B/G1-C/W5/W6 implementation into the lifecycle and direct owner documents only: lifecycle §4.2 separates target-envelope `deliveryId`, daemon API `DeliveryDto`, and narrower agent MCP projection; §4.3 separates current Tier 3 from the Phase 1 Tier 2 target and distinguishes `idempotencyKey` / public `deliveryId` / internal Codex `requestId`; §4.5 is now a partial-persistence matrix. Routing, Codex, Claude, daemon API, errors/events, CLI, store/repositories, adapter model, current-gap, and index wording were reconciled where their owner claims drifted. `aiox-open-deferred` was changed only to retain the non-implemented archive/deferred boundary and corrected lifecycle terminology.
- **Current facts reflected:** correlated reply authorization/right consume, source-only routing and reply wire `inReplyToDeliveryId`; daemon-originated `outcomeForDeliveryId` notifications; Tier 3 post-write `unconfirmed`/late-success handling with no automatic reinjection or completed producer; pre-write retry 250ms/1s/4s, capacity 32, TTL 5m as non-durable in-memory behavior; typed Codex/Claude reply tools and common canonical JSON delivery; primary versus manual retransmit reject difference; 31-event catalog and six-status CLI output; migrations 2/3/4, message fields, `reply_rights`, and `delivery_outcome_notifications`.
- **Current-versus-target boundary:** current docs do not attribute Codex-equivalent receipt/requestId dedupe to Claude, do not treat socket/HTTP write success as work completion, and do not call `recoverAfterRestart` durable recovery. Automatic authenticated ack/completed remains explicitly the committed Phase 1 Tier 2 uplift; roadmap itself was not edited.
- **Validation:** inspected current producers/consumers in `src/daemon/state.ts`, `src/daemon/api.ts`, core delivery/message/event types, Codex/Claude MCP surfaces, repositories and schema. `scripts/check-markdown-inline-code` passed for every changed docs file; `git diff --check` passed; G1-A `log check` passed with W4 sole active; G1-C `package-log check` passed registry integrity. No production code, tests, schema/migration, roadmap, G1-B/G1-C package state, or Work Item other than W4 activation was changed.
- **Candidate disposition:** W4 owner-document batch is ready for result review only. W4 is not accepted/completed; roadmap reconciliation and G1-A closeout have not begun.

### 2026-07-23 13:54 · 2026-07-23 · W4 resume-preparation comprehensive audit — W1 accepted consumption and exact reflection scope

- [Fact] W1 public-ID factory B is accepted/completed in `logs/packages/public-id-factory-b/tasks/W1.md` and its controlling package. The accepted result records focused and full 55-file/564-test passes, typecheck, lifecycle Markdown check, package registry check, and diff check; it explicitly leaves W4 independently active for separate consumption.
- [Fact] Current source matches the approved issuer boundary: `src/core/public-ids.ts` is the common opaque factory; Codex and Claude send/reply handlers direct-call it; `createDaemonState` defaults daemon issuance for daemon-originated messages and every delivery; normal fan-out and replies use that delivery issuer. `message_deliveries.id` remains public `deliveryId`; reply right, `inReplyToDeliveryId`, W12 `outcomeForDeliveryId`, retransmit, and `${messageId}:${targetAgentId}` DB-UNIQUE idempotency remain delivery-correlated. `createId` remains internal entity/event issuance.
- [Fact] The mandatory current owner drift is lifecycle §4.1: its public-ID issuance/lifetime/row-PK material remains labelled committed target and its Current paragraph still describes the now-replaced mixed sequential state. The freeze's daemon-only issuer direction is historical provenance, not a W4 edit target. This accepted result supersedes the unresolved-decision premise of the preceding 00:26/00:29 proposal entries; no new issuer decision is needed for W1's implemented contract.
- [Fact] Existing W4 owner corrections remain aligned for typed reply/outcome envelope fields, Tier 3 versus Phase 1 Tier 2, tool-specific MCP projections, manual retransmit/source-observability limit, bounded queue/flush versus durable replay, AdapterRouter test-only boundary, and W12/reliability FSM. The former `G1 착수 시 재검토` wording is no longer current-contract text.
- [Fact] Two independently reverified mechanical drifts remain: routing §8.4 omits the current queued TTL expiry -> `failed` / `delivery_expired` edge; adapter-model's current caveat and gaps §13 contain stale `state.ts` line citations. `state.ts:1274-1277`, for example, is Codex-channel registration event data, not production dispatch.
- [Inference] Exact W4 candidate write-set: lifecycle §4.1 public-ID current/status paragraph (and only necessary status wording); routing §8.4 TTL-expiry edge; adapter-model current-caveat locator; gaps §13 affected evidence locators. A narrow historical-status clarification in the public-ID issuer decision Context is a candidate because its present-tense mixed-code snapshot is stale; it does not reopen the decision. An architecture issuer-boundary addition is optional discoverability, not a required protocol correction.
- [Separate work] Roadmap G1-C automatic-ack/gate framing versus current Tier 3/Phase 1 Tier 2 wording is roadmap-reconciliation input, not a W4 mechanical edit. Any ingress re-invocation idempotency, retry, durable replay, or federation namespace work needs its own decision/work item; W1 excludes it.
- [Next] Keep W4 `[>] active`; before any owner edit, review this bounded write-set against the current owner identities and perform the separately authorized W4 owner-reflection edit. Do not start W4 acceptance, roadmap reconciliation, or G1-A closeout from this audit.

## 2026-07-22 · 2026-07-22 · W4 candidate correction — Claude channel presentation boundary

- **Correction to W4 candidate evidence:** direct source recheck distinguishes two layers. `formatAioxChannelEnvelope` supplies byte-identical canonical JSON to Codex `turn/start` input and Claude HTTP `/send.content` (`src/daemon/state.ts:1805-1819`, `:2002-2009`, `:2297-2328`). Claude channel-server then calls `buildChannelNotification`, which XML-escapes that content into `<channel source="aiox" …>…</channel>` before `notifications/claude/channel` (`src/adapters/claude/channel-server.ts:25-71`, `:471-493`). Thus Claude transport-inner content is canonical JSON, but Claude-facing presentation is prompt/text framing, not raw canonical JSON or native activity UI. W4 Claude adapter and adapter-model wording were corrected; no code/test/roadmap or Work Item state changed.
- **Correction validation:** focused Markdown inline-code checks and `git diff --check` pass. W4 remains candidate only; acceptance, roadmap reconciliation and closeout remain unstarted.

### 2026-07-23 00:06 · W4 candidate correction — owner-truth blockers

- **Scope/disposition:** independent review blockers only were corrected in the existing W4 owner-document candidate. No code, tests, schema/migration, roadmap, G1-B/G1-C package record, acceptance/review state, or Work Item changed. W4 remains a candidate and G1-A closeout remains unstarted.

- **Verified facts reflected:** `src/core/events.ts` has 31 event types, so the catalog count remains 31. `deliveryId` is public target correlation/retransmit identity; creation idempotency is the internal DB-UNIQUE `idempotencyKey = messageId:targetAgentId`. Current source coverage is agent-authored send/reply plus daemon-originated outcome notifications; human ingress is not provided. MCP success projections are tool-specific, not a shared `message_id + dispatch` result.

- **Reliability/FSM corrections:** current Tier 3 has bounded pre-write retry (250 ms / 1 s / 4 s), queue cap 32, TTL 5 minutes, and attach/resume-rebind/proxy-binding queued flush. Durable restart replay/mailbox, passive/automatic ack, remote cancellation, and heartbeat/time-based stale remain deferred. Manual timeout/drop is non-terminal `_unconfirmed`; only immediate/late delivered or rejected is terminal, with manual reject preserving the original `unconfirmed`. The routing diagram now separates primary late reject → `failed` from manual late reject → original `unconfirmed`.

- **Contract/detail corrections:** transport API lists `delivery_queue_full`, ingress preserves `request.type ?? "question"` for `question|instruction`, reply-received payloads include `text`, and Claude ingress is described as non-empty-content validation plus XML framing rather than canonical-JSON validation. Claude `/send` examples include `chat_id`/`origin`; Codex target/LLM-action dedupe absence is separated from daemon same-`requestId` late/duplicate-response no-op.

- **Validation:** affected-doc Markdown inline-code checks, `git diff --check`, G1-A `log check`, and G1-C `package-log check` all passed.

- **Candidate evidence only:** this append updates correction evidence; it does not perform W4 result review or acceptance.

### 2026-07-23 00:19 · W4 candidate correction — MCP projection and locator rebase

- **Scope/disposition:** W4 candidate owner-document correction only. No code, tests, schema/migration, roadmap, acceptance/review state, G1-A closeout, or Work Item changed.

- **Lifecycle projection and current boundary:** §4.3 now matches §4.2/§4.4: daemon API exposes per-target `DeliveryDto`; Codex send/reply and Claude send can return `message_id` plus `dispatch`, whereas Claude reply returns `ok` plus `dispatch` without `message_id`. §4.5 is retitled to current implementation/deferred limits; the Phase 0 process-lifetime generator and delivery-creation DB UNIQUE boundary are recorded as implemented and verified. Federation collision plus retention/stale/cancellation/reply-right cleanup remain deferred.

- **Evidence locator rebase:** W4-corrected routing, transport API, and event catalog claims now use `src/daemon/state.ts` function locators for transaction, ingress, dispatch, manual retransmit, status, and event paths rather than stale line ranges. The corresponding Claude/Codex/store owner scan rebased W4-relevant state evidence to function-level locators without removing the source-evidence relationship.

- **Validation:** affected-document inline-code checks, `git diff --check`, G1-A log check, and G1-C registry check passed.

- **Candidate evidence only:** this append does not review or accept W4.

### 2026-07-23 00:26 · Public ID issuance bounded triage — evidence and proposal

- **Scope/disposition:** read-only bounded triage only. No code, owner document, roadmap, decision, G1-B/G1-C history, Work Item, status, W4 acceptance, roadmap reconciliation, or G1-A closeout changed. This entry is evidence plus a proposal, not acceptance or a work registration.
- **Verified contract conflict:** the opaque-issuance decision requires collision-resistant opaque issuance for both public `messageId` and `deliveryId` (`docs/decisions/public-message-and-delivery-ids-use-opaque-issuance.md:16-18`) and explicitly rejects process-lifetime sequential public IDs (`:22-25`). Lifecycle §4.1 marks daemon issuance of both IDs, restart-resistant collision avoidance, and `deliveryId = message_deliveries.id` as **Committed target** (`docs/specs/aiox-message-lifecycle.md:85-106`).
- **Verified current path:** production injects `daemon-${runningId++}` as the common `createId` (`src/daemon/run.ts:17-35`); CLI/in-process runtime injects `cli-${nextId++}` (`src/bin/aiox.ts:241-253,361-370,465-470`). Codex send/reply and Claude send make UUID-based source message IDs, while Claude reply and every delivery use that daemon/CLI factory (`src/adapters/codex/mcp-server.ts:241-300,381-385`; `src/adapters/claude/channel-server.ts:331-408`; `src/daemon/state.ts:1204-1213,2437-2464,2515-2588`). Thus sequential IDs are locally incrementing in a live runtime, but their current lack of a demonstrated same-process collision does not satisfy the distinct public opaque/restart-reuse contract.
- **Safety boundary preserved by either corrective:** public `deliveryId` is the delivery row ID and is used for reply authorization, persisted reply `parentMessageId`, `inReplyToDeliveryId`, W12 `outcomeForDeliveryId`, and retransmit (`src/daemon/state.ts:2297-2328,2456-2474,2515-2588,1533-1623`). Common internal `idempotencyKey` remains `${messageId}:${targetAgentId}` DB-UNIQUE (`src/store/schema.ts:62-71`; `src/store/repositories/deliveries.ts:112-148`); Codex JSON-RPC `requestId` is a separate local late-response observer identity, not a public envelope/MCP value (`src/adapters/codex/websocket.ts:189-199,274-315`).
- **W4 evidence correction:** lifecycle current-limits wording says source-scope opaque `messageId` and an implemented Phase-0 process-lifetime generator (`docs/specs/aiox-message-lifecycle.md:334-339`), but it does not distinguish the source/daemon split or reconcile it with the committed daemon-owned issuance. W4 therefore remains candidate/blocked pending an accepted corrective decision; this entry does not review or alter it.
- **Proposal only — two bounded alternatives:** (1) implement the committed target: introduce a daemon-owned collision-resistant issuer for public message and delivery IDs, update ingress/adapter result paths, schemas/tests and the delivery-PK generator while retaining public delivery-row binding; no compatibility alias/fallback/dual-write is proposed. (2) create a new superseding/clarifying decision/spec: permit source-issued collision-resistant `messageId` with explicit source/namespace/validation responsibility while retaining daemon-issued opaque `deliveryId`; state current truth, committed target, and deferred federation/replay separately. The existing decision should not be silently rewritten because it records the rejected asymmetry and rationale. User decision is required before either implementation or owner/roadmap work.
- **Separate reconciliation candidates only:** W9 retry/queued-flush versus post-write unconfirmed/manual-only, W12 daemon rejection outcome semantics, stale architecture locators/routing TTL/AdapterRouter/MCP gaps, lifecycle tool-result wording, and the historical G1 re-review text are independent backlog/roadmap reconciliation candidates, not part of this ID corrective.
- **Next proposal (not registered):** user selects whether to preserve the committed daemon-owned opaque issuance or supersede it with explicit split issuance; then a bounded corrective/decision package should own implementation and affected owner/roadmap reconciliation. Until then retain W4 candidate/blocked.

### 2026-07-23 00:29 · Public-ID issuance decision proposal — corrected issuer authority

- **Scope/disposition:** read-only corrective decision proposal only. The earlier triage is corrected: the opaque-issuance decision requires collision-resistant opaque issuance for both public IDs but does **not** name the `messageId` issuer; lifecycle §4.1 alone makes the daemon issuer of both as a committed target. No code, owner document, roadmap, existing decision, G1-B/G1-C history, Work Item, W4 acceptance, reconciliation, or closeout changed.

- **Verified current boundary:** Codex send/reply and Claude send mint UUID-based source `messageId`s before daemon ingress; the daemon persists that request value. Claude reply and daemon-originated outcome notifications instead obtain a `messageId` through `options.createId()`. All deliveries obtain `message_deliveries.id` through that same factory and canonical envelopes render stored message ID plus delivery-row ID. Production and CLI wire that factory to process-local sequential generators. Thus current implementation has source-issued opaque IDs in three paths and daemon-issued sequential public IDs in the remaining message/delivery paths; no live collision was asserted, but restart-safe opaque issuance is not provided for those paths.

- **Invariant evidence:** reply authorization/one-time consumption and the persisted reply `parentMessageId` are keyed by the originating delivery row ID; canonical replies render it as `inReplyToDeliveryId`. Delivery creation has DB-UNIQUE `idempotencyKey = messageId:targetAgentId`; W12 binds an outcome to the original delivery row through `outcomeForDeliveryId` and `delivery_outcome_notifications`; Codex `requestId` is internal late/duplicate JSON-RPC correlation, not a public ID. `message_deliveries.id` remains the public `deliveryId` binding.

- **Three decision candidates (same criteria):**
  1. **Daemon owns opaque `messageId` and `deliveryId`:** satisfies the lifecycle committed target and existing opaque decision. It changes adapter/daemon producer boundary and MCP result derivation: adapters must stop treating locally minted message IDs as final, while results return the committed daemon message ID. Reply-right, delivery-PK binding and W12 can stay delivery-keyed. However, daemon-minting a new message ID per repeated ingress defeats the current `messageId:targetAgentId` retry dedupe unless a new explicit ingress idempotency/correlation contract is decided. Existing public persisted IDs would need an intentional reset or transactional reference migration (messages, deliveries, reply rights, outcomes, events and idempotency); no alias/fallback/dual-write is proposed. Daemon becomes security/namespace owner for both public ID spaces.
  2. **Source ingress owns opaque `messageId`; daemon owns opaque `deliveryId`:** this can retain `public-message-and-delivery-ids-use-opaque-issuance` unchanged, because that decision settles opacity/restart resistance rather than issuer ownership. A superseding/clarifying decision must replace lifecycle §4.1's single daemon-issues-both sentence with origin/issuer responsibilities: authenticated source-adapter issuance plus namespace/format/validation obligations for message IDs, daemon collision-resistant issuance for delivery-row PKs, and daemon-originated message issuance. Existing source message IDs, MCP send/result projection, reply right, parent delivery reference, `messageId:targetAgentId` idempotency and W12 original-delivery correlation remain structurally compatible. The decision must resolve Claude reply explicitly (source adapter issues it, or a named daemon exception) and make all daemon-originated public message IDs opaque. Future issuance needs no schema migration; any historic sequential delivery IDs require an explicit reset/migration choice, not compatibility code. Namespace/security responsibility is split and must be authenticated at ingress.
  3. **Keep sequential public delivery IDs by changing the normative contract:** consumer behavior, MCP projection, reply-right, idempotency, delivery-row binding and W12 stay as-is; no implementation or migration follows merely from the decision. But it cannot retain the existing opaque-ID decision: it must supersede that decision's requirement for collision-resistant opaque `deliveryId` (and address daemon-issued sequential Claude-reply/outcome `messageId`s). It explicitly accepts order-revealing, predictable process-local values and restart/runtime namespace reuse. These IDs are not the primary authorization mechanism in current code, but they are public correlation handles; this is policy regression rather than a documentation correction.

- **Proposal/recommendation:** choose candidate 2, subject to a bounded new decision whose scope is only issuer responsibility and namespace/security obligations for public `messageId` versus `deliveryId`, including agent-authored reply and daemon-originated outcome cases. It preserves the opaque-ID decision and current delivery-scoped safety/idempotency model while requiring opaque daemon delivery issuance and a single resolved rule for the two remaining message paths. Candidate 1 is viable only after a separate ingress retry/idempotency decision; candidate 3 is not recommended because it replaces, rather than implements, the accepted opaque public-ID policy.

- **Proposed sequence, not started:** (1) obtain user choice of candidate 2 and Claude-reply issuer rule; (2) create a bounded superseding/clarifying decision, then update lifecycle current/committed/deferred wording and the decision's owner references; (3) implement opaque daemon delivery plus daemon-origin message issuer and affected adapter/MCP tests, with an explicit reset-versus-migration decision if persisted public values are in scope; (4) only then return the evidence to W4 result review, roadmap reconciliation, and G1-A closeout in that order. W4 remains candidate/blocked on this unresolved decision; no Work Item state was changed.

## 2026-07-23 · 2026-07-23 · W4 resume-preparation comprehensive audit — authoritative digest and next

- [Fact] W1 public-ID factory B is accepted/completed (its W1 task record and controlling package); its accepted verification is focused/full 55 files/564 tests, typecheck, lifecycle Markdown, package registry and diff checks. It leaves W4 independently active.
- [Fact] Current as-built uses the shared opaque public-ID factory for Codex/Claude agent-authored send/reply, daemon-originated message IDs and all delivery IDs. The `message_deliveries.id` public delivery binding, reply/W12/retransmit correlations, internal `createId`, and `${messageId}:${targetAgentId}` idempotency key remain unchanged.
- [Fact] Required W4 mechanical corrections are: lifecycle §4.1's stale public-ID target/current-state wording; routing §8.4's missing queued TTL expiry -> `failed`/`delivery_expired` edge; adapter-model and gaps-document stale `state.ts` locators. Existing W4 corrections for reply/outcome fields, Tier 3 boundaries, MCP result shapes/retransmit, queues versus durable replay, AdapterRouter, and W12 remain aligned.
- [Fact] The G1-A freeze is historical provenance only. The previous public-ID decision proposal's unresolved premise is superseded by W1 accepted implementation; no new issuer decision is needed. Roadmap automatic-ack/Tier-2 framing is separate reconciliation input.
- [Next] W4 remains `[>] active`. The next single action is a bounded owner-reflection edit limited to the identified files/sections, before which their owner identities are rechecked. Do not start W4 acceptance, roadmap reconciliation, or G1-A closeout.

### 2026-07-23 14:04 · W4 owner-document reflection candidate edit — public-ID as-built and locator rebase

- [Candidate scope] W4 remains `[>] active`. This append records only owner-document candidate edits; it does not perform result review/acceptance, roadmap reconciliation, freeze revision, G1-A closeout, or create a decision/work item.

- [Changed owner sections] `docs/specs/aiox-message-lifecycle.md` §4.1 now records the public-ID issuer boundary, issuance/lifetime/storage binding as Current, retains opaque non-parsing, and marks the freeze daemon-only direction as superseded provenance. `docs/architecture/local-runtime-routing-and-delivery.md` §8.1 adds the as-built issuer boundary and §8.4 adds `queued → failed : TTL expiry / delivery_expired`. `docs/specs/aiox-adapter-model.md`, `docs/architecture/local-runtime-codex-adapter.md`, `docs/architecture/local-runtime-errors-events-smoke.md`, `docs/architecture/local-runtime-cli-and-operator-surfaces.md`, `docs/architecture/local-runtime-gaps-and-targets.md`, and `docs/architecture/local-runtime-process-topology.md` replace stale `state.ts` numeric citations with current responsibility/function locators. `docs/decisions/public-id-factory-issuer-responsibility.md` Context limits its former mixed-boundary statement to the decision-time implementation snapshot.

- [Current-as-built evidence] `src/core/public-ids.ts` exports the common opaque message/delivery factories; Codex `createSendMessageHandler`/`createReplyHandler` and Claude `createSendHandler`/`createReplyHandler` call the message factory; `createDaemonState`, `runSendMessageTransaction`, `runReplyTransaction`, and `recordCodexTargetRejectOutcome` use the daemon factory boundary for deliveries and daemon-originated outcomes. `scheduleQueuedDeliveryExpiry` transitions a still-queued row to `failed` with `delivery_expired`. `message_deliveries.id` remains the public delivery ID; internal `createId` remains entity/event issuance.

- [Retain / separate reconciliation] The historical freeze remains provenance only. Current Tier 3 versus Phase 1 Tier 2 automatic ack/completed, ingress re-invocation idempotency, durable replay, federation namespace, and roadmap framing remain separate owner/reconciliation inputs; none was changed or accepted here.

- [Candidate evidence] All specified owner documents were inspected with their producer/consumer functions. The evidence is candidate-only pending the separately authorized W4 result review.

### 2026-07-23 14:12 · W4 candidate blocker correction — Claude evidence and reply sequence

- [Write-set revision] User-authorized W4 candidate write-set now additionally includes `docs/architecture/local-runtime-claude-adapter.md`; this correction edits only that slice and `docs/architecture/local-runtime-gaps-and-targets.md`, plus this append-only controlling-log evidence. W4 remains `[>]` active; no code, tests, roadmap, freeze, acceptance, result review, or G1-A closeout is in scope.

- [Correction basis] The Claude boot-failure gap must cite the actual `attachAgent` token-return path and `injectMessageIntoClaudeTarget` runtime lookup/deferred path, not `receiveCodexReply`. The Claude adapter final reply-to-Codex Mermaid must reflect the current source-issued reply message ID, daemon forwarding, `injectReplyIntoCodexRuntime` canonical-envelope injection, and Tier 3 acceptance branches.

- [Mermaid renderer availability] Repository search found no Mermaid parser or renderer dependency, command, or document-render harness. `mmdc` and `mermaid` are unavailable on PATH; no dependency installation or package change is authorized. The block will use the existing Codex sequence-diagram syntax pattern, but no parse/render PASS is asserted.

### 2026-07-23 14:13 · W4 candidate blocker correction evidence — Claude path and Mermaid availability

- [Claude boot-failure correction evidence] `attachAgent` returns a Claude channel token before the channel-server registers; `injectMessageIntoClaudeTarget` later checks `claudeChannelRuntimes` and maps absence or Claude-channel unavailability to deferred `target_runtime_unavailable`. `receiveCodexReply` is not on this Claude consumer path and was removed from the gap evidence.

- [Claude reply-sequence correction evidence] The final Mermaid now shows the reply tool correlation and text content, channel-server forwarding of `agentName`, source-issued `messageId`, `inReplyToDeliveryId`, and content, then daemon `runReplyTransaction` and `dispatchToPairPeers`. It shows canonical-envelope JSON through `injectReplyIntoCodexRuntime`: correlated success becomes `delivered`, explicit application rejection becomes `failed`/rejected, and post-write timeout, response loss, or WS drop becomes `unconfirmed` without automatic reinjection. Its note keeps reply-right and work completion separate from delivery acceptance.

- [Mermaid renderer result] No repository Mermaid parser/renderer or document-render harness exists; `mmdc` and `mermaid` are unavailable on PATH. No dependency or package change was made, so parse/render verification is explicitly unavailable rather than PASS.

### 2026-07-23 14:18 · W4 candidate result review PASS — direct acceptance pending

- [Result review] W4 candidate result review PASS — direct acceptance pending.
- [Fact — W1 accepted B consumption] `logs/G1/2026-07-23-public-ID-factory-B-implementation.md` records W1 accepted/completed; its task record and package registry are consistent. Current source confirms that Codex and Claude send/reply handlers issue agent-authored `messageId` values through the common public-ID factory; daemon state issues daemon-originated outcome `messageId` values and all `deliveryId` values. `message_deliveries.id` remains the immutable public delivery-row primary key. Shared `createId` remains limited to internal entity/event IDs. Lifecycle §4.1 records opaque equality-only/non-parsing semantics and classifies the daemon-only freeze direction as superseded provenance, not a living contract.
- [Fact — drift treatment] Routing §8.4 now shows `queued -> failed` on TTL expiry with `delivery_expired`, matching `scheduleQueuedDeliveryExpiry`. The stale `state.ts` numeric evidence is rebased to responsibility/function locators. Claude boot-failure text follows `attachAgent` token return and `injectMessageIntoClaudeTarget` deferred runtime lookup, not `receiveCodexReply`. Claude reply Mermaid expresses source-issued reply ID, daemon forwarding, canonical injection, and Tier 3 success/reject/unconfirmed branches. Current Tier 3 versus committed Phase 1 Tier 2 remains distinct; retain/roadmap/new-decision work is not consumed or started.
- [Fact — write-set and decision boundary] The modified owner set is the W4 candidate owner batch: architecture index plus Claude, Codex, routing, transport API, errors/events, CLI, gaps, topology, store/repositories; adapter model, lifecycle, and open/deferred specs; and the public-ID decision. The later bounded candidate entries refine/rebase portions of that batch rather than narrow the earlier authorized batch. The decision is a decision-time rationale snapshot and delegates current protocol state to lifecycle §4.1; it was not rewritten as a current spec. No roadmap, freeze, code, test, or closeout artifact was edited by this review.
- [Fact — verification] Re-ran `scripts/check-markdown-inline-code` across all 13 modified architecture/spec documents: PASS. `git diff --check`: PASS. G1-A `log check`: PASS with W4 the sole `[>]` active item. G1-C and public-ID-factory-B `package-log check`: PASS registry integrity. User directly confirmed that the final Mermaid in `docs/architecture/local-runtime-claude-adapter.md` renders normally in the UI; this is accepted as W4 visual evidence. Repository-local Mermaid parser/render harness remains unavailable, so no contrary local render PASS is claimed.
- [Disposition] W4 remains `[>] active/candidate`; this result review neither accepts/completes W4 nor starts roadmap reconciliation or G1-A closeout.

### 2026-07-23 14:21 · W4 accepted/completed — direct acceptance and reconcile

- [Acceptance] W4 candidate result review PASS를 직접 수용한다. W4는 accepted/completed이며, owner-reflection candidate batch의 artifact disposition과 G1-A accepted state는 14:18 result-review entry를 따른다.
- [Accepted basis] W1 public-ID factory B의 accepted/completed handoff가 lifecycle §4.1의 current issuer reflection에 소비된 것을 확인했다. 후보 review에는 13개 architecture/spec 문서의 Markdown/inline-code PASS, G1-A log check PASS, G1-C 및 public-ID-factory-B package registry PASS, `git diff --check` PASS가 기록돼 있다. 사용자가 `docs/architecture/local-runtime-claude-adapter.md`의 최종 Mermaid UI 정상 렌더를 직접 확인한 visual evidence도 수용한다.
- [Reconcile] W4를 `[x] accepted/completed`로 전환하고, W7 `roadmap reconciliation`을 유일한 `[>]` next pointer로 설정한다. roadmap automatic-ack/Tier-2 framing은 W4 owner batch와 분리된 reconciliation input이므로 roadmap 파일은 이 전환에서 수정하지 않는다.
- [Boundary] G1-A closeout은 아직 시작하지 않는다. W4 수용은 owner reflection을 닫을 뿐, W7 roadmap reconciliation의 별도 owner/state 정합과 그 결과 소비를 선행하지 않는다.

## 2026-07-23 · 2026-07-23 · W7 roadmap reconciliation preflight — audit and proposal only

- [Fact] Read-only W7 preflight directly rechecked the current roadmap, G1 plan/W4 pointer, historical freeze, G1-B and G1-C accepted closeouts, public-ID-factory-B W1 accepted handoff, lifecycle/open-deferred/adapter/architecture owners, and accepted code/test locators. G1-B is decided only for canonical envelope, opaque public IDs with immutable delivery-row-PK binding, authenticated original-target source-only one-reply right, and typed content; it does not claim target receipt, automatic ack/completed, active-turn policy, dedupe/retry/recovery, or native activity. B W1 supplies the current issuer correction: source adapters use one opaque common factory for agent-authored send/reply message IDs; daemon uses it for daemon-originated message IDs and every delivery ID.
- [Fact] The freeze remains historical provenance. Its daemon-issues-every-messageId direction alone is superseded by docs/decisions/public-id-factory-issuer-responsibility.md; opaque/non-parsing, reply-right, acceptance-not-receipt, and deferred rationale remain historical/current-owner aligned. No freeze edit is proposed.
- [Fact] G1-C is decided only for bounded process-lifetime Tier 3: pre-write bounded queue/retry/TTL/backpressure and serialized flush; post-write timeout/loss/drop -> unconfirmed with zero automatic reinjection and late same-request success dedupe; confirmation-gated non-queued manual retransmit; and non-manual primary explicit reject -> exactly one daemon-originated outcome notification correlated by outcomeForDeliveryId, with no reply right and non-recursion. Current lifecycle/adapter owners place authenticated automatic ack/completed in Phase 1 Tier 2; durable replay/mailbox, heartbeat/time stale, native activity, remote cancellation, retention, reply-right cleanup, observability, and federation remain deferred.
- [Proposal matrix] roadmap G1-B envelope/reply/public-ID gate: RETAIN. G1-C pass conditions: W7 roadmap edit to replace current automatic-ack wording with the accepted Tier 3 boundary and point automatic ack/completed/receipt dedupe to Phase 1 Tier 2. G1-C retry/queued wording: W7 wording clarification to distinguish pre-write bounded retry/flush from post-write unconfirmed/manual-only. G1-C primary-reject outcome notification: W7 roadmap edit with non-manual/W12 boundary. Phase 1 Tier 2, Phase 2 durable replay/mailbox, Phase 3 remote/federation, heartbeat/stale/native-activity/remote-cancellation deferred wording: RETAIN. Freeze issuer direction: historical provenance only. Ingress re-invocation idempotency is excluded from B and delivery idempotency; if prioritized, it requires a new decision/work item. Broader durable/federation namespace policy is likewise future-triggered decision work, not a W7 claim.
- [Boundary] This is audit/proposal evidence only. No roadmap, plan, code, test, decision, freeze, W7 result review/acceptance, or G1-A closeout action was performed. W7 remains the sole active item; a subsequent user-authorized W7 roadmap edit may use this matrix.

### 2026-07-23 14:32 · 2026-07-23 · W7 roadmap reconciliation candidate edit and verification

- [Candidate edit] User-authorized W7 write-set changed only `docs/product/roadmap.md`. G1-B now records canonical envelope/correlation, source-only one-reply right, opaque public-ID issuance and immutable delivery-row-PK binding as completed/consumed; decisions and accepted package evidence remain historical provenance, while restart/durable replay stays Phase 2 and ingress re-invocation idempotency stays a separate user-decision/work-item candidate.
- [Candidate edit] G1-C now records only its accepted process-lifetime Tier 3 boundary: W8/W15 correlation and `unconfirmed`, W9 bounded pre-write queue/retry/TTL/flush, W10 confirmation-gated manual retransmit, W12 non-manual primary-reject exactly-once outcome notification, and W11 composition/direct-TUI re-verification. It explicitly preserves zero post-write automatic reinjection and excludes automatic ack/`completed`, wake-up, adapter duplicate suppression, heartbeat/stale, durable replay/mailbox, native activity, remote cancellation, and federation from the completed claim.
- [Candidate edit] Phase 1 and Gate Evidence now separate current Tier 3 evidence from future Tier 2 and G1-D evidence. G1-D, G2, Phase 2, Phase 3, and `plans/` were not changed; the G1-A closeout/handoff stage remains the residual split. No W7 acceptance/completion, G1-A closeout, plan state transition, or package transition was performed.
- [Verification] `scripts/check-markdown-inline-code docs/product/roadmap.md`, G1-A log check, G1-B/G1-C/public-ID package registry checks, and `git diff --check` passed. No repository Markdown formatter is installed (`pnpm exec prettier --check docs/product/roadmap.md` reports command not found); the repository exposes no other Markdown check beyond the inline-code script.

### 2026-07-23 14:40 · W7 candidate wording correction and residual closeout input

- [Candidate correction] Roadmap G1-C pass conditions now contain capability/evidence only: retained correlation and idempotent late resolution; `unconfirmed` post-write classification; bounded pre-write queue/retry/TTL/backpressure with usable-target flush; confirmation-gated manual retransmit; primary explicit reject to `failed`; exactly-once non-recursive daemon outcome notification; and Tier 3 composition/direct-TUI evidence. Internal W8/W9/W10/W11/W12/W15 labels were removed. It retains no post-write automatic reinjection and keeps automatic authenticated ack/`completed`, wake-up, adapter duplicate suppression, and stale/native-activity policy as Phase 1 or later.
- [Candidate correction] G1-B remains capability-only; the public-ID-factory task label was removed while decision, accepted package log, and test evidence remain provenance references. Release Path now labels G1-B → G1-C as a completed/consumed historical dependency and lists G1-D as a remaining release gate. G1-D, G2, Phase 2, Phase 3, lifecycle, plans, and existing closeout/handoff history were not changed.
- [Residual input] After W7 acceptance, the G1-A closeout stage must reconcile `plans/g1-a-contract-ingress.md` and closeout-log handoff language against consumed accepted G1-B/G1-C/public-ID-factory results and the remaining G1-D plus future Tier 2 handoff boundary. This is a residual input only: no acceptance, completion, closeout, plan, or Work Item/log status change occurred here.

### 2026-07-23 14:59 · W7 candidate precision correction — G1-A consumption and Codex scope

- [Candidate correction] G1-A no longer presents G1-B/G1-C as future handoffs. It now records their accepted/completed canonical envelope/public-ID/reply-right and Tier 3 results as historical consumption, separates the remaining G1-D trust-boundary and Phase 1 Tier 2 responsibilities, and marks automatic control-plane ack as a future Tier 2 direction rather than a current guarantee.
- [Candidate correction] G1-C now limits retained JSON-RPC request correlation, late-response idempotent resolution, direct manual retransmit, and correlated explicit JSON-RPC reject to the Codex App Server/Codex target. Bounded pre-write queue/retry/TTL/backpressure and post-write `unconfirmed` remain general lifecycle boundaries; the exactly-once non-recursive daemon outcome notification remains its canonical renderer. Claude canonical-envelope transmission/presentation is not asserted to provide Codex late-response, receipt, or dedupe guarantees.
- [Boundary] This append is W7 candidate evidence only. No internal Work Item IDs were added to the roadmap, and no W7 acceptance/completion, G1-A closeout, plan, lifecycle, existing closeout/handoff log, or Work Item/log status change occurred.

### 2026-07-23 15:02 · W7 candidate wording correction — Phase 0 versus Phase 1 boundary

- [Candidate wording correction] Roadmap G1-A now separates the remaining Phase 0/release gate, G1-D trust boundary, from the post-public-release Phase 1 Tier 2 uplift. Authenticated automatic ack/`completed` and related Tier 2 behavior are not a Phase 0/release claim.
- [Boundary] This is candidate evidence only. No other roadmap, plan, log history, Work Item/status, W7 acceptance/completion, or G1-A closeout change occurred.

### 2026-07-23 15:09 · 2026-07-23 · W7 controlling result review — PASS; acceptance pending

- **판정: PASS.** 이 entry는 W7 controlling result review 기록일 뿐이다. W7의 accepted/completed 전환, G1-A closeout 시작, plan·기존 handoff/closeout log 변경은 수행하지 않는다.

- **확인한 사실 — roadmap identity/표현:** `docs/product/roadmap.md`는 release gate와 공개 이후 phase의 owner이며, 제품·gate 본문에 내부 Work Item ID를 남기지 않는다 (`rg` inline-code/`W[0-9]` check: no match). Release Path/Gate Overview와 G1-A는 G1-B/G1-C를 completed/consumed historical dependency로, 결정·accepted package evidence를 historical provenance로 구분한다. G1-D는 remaining Phase 0/release trust gate이고, authenticated automatic ack/`completed` Tier 2 uplift는 public release 뒤 Phase 1이다.

- **확인한 사실 — accepted-result reconciliation:** G1-B controlling log is `decided` with W1–W4 accepted, and its registry check passes. G1-C controlling log is `decided` with all registered W items completed, and its registry check passes. public-ID-factory-B W1 is accepted/completed; its registry check passes. Roadmap G1-B retains only canonical envelope/correlation, source-only one-reply right, opaque public-ID issuance, and immutable delivery-row-PK binding; it explicitly keeps durable/restart replay in Phase 2 and ingress re-invocation idempotency as a separate future user-decision/work-item candidate.

- **확인한 사실 — capability boundary:** Roadmap G1-C scopes retained JSON-RPC request correlation, idempotent late-response resolution, direct confirmation-gated manual retransmit, and explicit JSON-RPC primary reject to the Codex App Server/Codex target. It does not ascribe those Codex-only guarantees to Claude. General lifecycle claims are limited to bounded pre-write queue/retry/TTL/backpressure/flush, post-write `unconfirmed`, and canonical exactly-once non-recursive daemon outcome rendering; it does not claim target receipt/work completion, post-write automatic reinjection, automatic ack/`completed`, wake-up, adapter duplicate suppression, stale/native activity, durable replay, remote/federation, G1-D, or G2 as completed/consumed.

- **검증:** `scripts/check-markdown-inline-code docs/product/roadmap.md` PASS; G1-A `log check` PASS with W7 the sole active item; G1-B/G1-C/public-ID-factory-B package registry checks PASS; `git diff --check` PASS.

- **Residual:** W7 acceptance 뒤에만 G1-A closeout이 `plans/g1-a-contract-ingress.md` 및 기존 closeout/handoff wording을 accepted G1-B/G1-C/public-ID-factory-B consumption, remaining G1-D, 그리고 future Phase 1 Tier 2 boundary와 reconcile해야 한다. 이번 review는 그 artifacts를 수정하지 않았다.

### 2026-07-23 15:11 · 2026-07-23 · W7 accepted/completed — reconciliation accepted; W8 pointer registered

- **Acceptance:** W7 controlling result review PASS를 수용한다. roadmap reconciliation은 accepted/completed이며, 수용 근거는 바로 앞 candidate corrections와 15:09 controlling review의 재대조다.

- **Reconcile:** roadmap은 내부 Work Item ID를 포함하지 않고, G1-B/G1-C accepted 결과를 completed/consumed historical dependency로, decisions/accepted package evidence를 provenance로 분리한다. Codex-only Tier 3 request correlation·late resolution·direct manual retransmit·explicit JSON-RPC reject를 Claude 공통 보장으로 주장하지 않는다. G1-D는 남은 Phase 0/release gate이며 Tier 2 authenticated ack/`completed`는 public release 뒤 Phase 1이다. G2, Phase 2/3, ingress re-invocation idempotency는 retain되어 completed/consumed로 전환되지 않았다.

- **Verification accepted:** roadmap inline-code check, G1-A log check, G1-B/G1-C/public-ID-factory-B registry integrity checks, and `git diff --check` all PASS.

- **Next pointer / boundary:** W8 `G1-A closeout readiness / plan-and-handoff reconciliation` is the sole active pointer. This acceptance does not start a G1-A closeout audit or closeout, and it does not modify `plans/g1-a-contract-ingress.md`, existing closeout/handoff logs, code, tests, roadmap, or owner documents. W8 must first reconcile the residual plan and existing handoff wording against accepted G1-B/G1-C/public-ID-factory-B consumption, remaining G1-D, and future Phase 1 Tier 2 boundary.

## 2026-07-23 · 2026-07-23 · W8 G1-A closeout readiness / plan-and-handoff reconciliation audit — PASS

- **판정: PASS (W8 audit only).** 이 기록은 read-only reconciliation 감사다. code·test·roadmap·plan·기존 handoff/owner 문서·Work Item/status는 수정하지 않았고 새 Work Item도 등록하지 않았다.

- **확인한 사실 — pointer/검사:** onramp는 이 controlling log의 W8을 유일한 active pointer로 보인다. controlling W3/W4/W5/W6/W7은 accepted/completed다. G1-B는 `decided` (W1–W4 complete), G1-C는 W15 corrective re-closeout 뒤 `decided`, public-ID-factory-B W1은 accepted/completed다. 이번 G1-A `log check`, G1-B/G1-C/public-ID-factory-B `package-log check`, `git diff --check`는 모두 PASS다.

- **확인한 사실 — current owner boundary:** roadmap은 B canonical envelope/public-ID/source-only reply-right와 C process-lifetime Tier 3을 completed/consumed historical dependency로 둔다. G1-D trust boundary는 remaining Phase 0/release gate다. automatic authenticated ack/`completed`, wake-up, adapter-specific duplicate suppression은 public release 뒤 Phase 1 Tier 2; durable replay/mailbox는 Phase 2; remote/federation은 Phase 3이다. ingress tool re-invocation idempotency는 delivery-creation `idempotencyKey` 및 Codex internal `requestId` correlation과 별개의 future decision/work-item responsibility다. W4 owner reflection 및 W7 roadmap reconciliation 뒤 current owner/roadmap residual drift는 이 범위에서 발견되지 않았다.

- **감사 matrix:** (1) closeout W2-1 및 2026-07-19 15:13/16:01/16:14의 B canonical envelope/correlation, source-only reply, `{ text }` 단일 content, intent wording은 G1-B W2/W3/W4와 public-ID-factory-B W1로 **already accepted/consumed**됐으므로 provenance wording만 정합화한다. (2) 15:15 C row의 pre-write retry/TTL/flush, post-write `unconfirmed`, confirmation-gated manual retransmit, primary-reject notification은 accepted C Tier 3으로 **already accepted/consumed**됐으므로 provenance wording만 정합화한다. (3) 같은 C row의 automatic ack, ack dedupe, receipt/`completed`, wake-up, adapter duplicate suppression은 **post-release Phase 1 Tier 2**다. (4) queue persistence/restart recovery/durable replay-mailbox는 **Phase 2**다. (5) adapter-owned invocation idempotency/accepted-result recovery는 accepted general guarantee가 아니며 **ingress re-invocation idempotency future responsibility**다. (6) 15:15 G1-D auth/route/secret boundary 및 negative tests는 **G1-D Phase 0/release gate**다. (7) broader federation implication은 **Phase 2/3 future responsibility**다.

- **추론 — responsibility boundary:** future-tense B/C handoff wording은 unstarted obligation이 아니라 stale provenance다. G1-A closeout은 accepted external package results를 자체 contract/evidence/owner/roadmap boundary에 소비·정합화했다고만 기록해야 하며, G1-A가 B/C를 직접 구현했다고 주장하거나 decided package를 reopen하면 안 된다. 기존 handoff 표는 append-only evidence로 보존하고 새 reconciliation entry가 그 operational reading을 supersede해야 한다.

- **Candidate closeout write-set (not applied):** (1) `plans/g1-a-contract-ingress.md` — Stage pointer/status 및 Objective/Completion wording만, B/C future-consumer 서술을 consumed provenance로 교체하고 G1-D/Phase 1/2/3/ingress-idempotency boundary를 보존. (2) `logs/G1/2026-07-18-G1-A-closeout-and-G1-B.md` — 기존 2026-07-19 표를 고치지 않는 append-only reconciliation/handoff register entry와 실제 closeout progression이 정당화하는 Work Item/Required Context/status 전이만. (3) 이 controlling log — W8 result-review/acceptance/reconcile entry와 authorized Work Item/pointer transition만. roadmap 및 current owner documents에는 edit을 제안하지 않는다.

- **Candidate acceptance criteria (not applied):** plan/log active pointer가 각 전이에서 하나이고, B/C/public-ID accepted consumption과 G1-A implementation을 구분하며, G1-D만 G1 Phase 0 trust gate로 남고, Tier 2=post-release Phase 1·durable replay=Phase 2·remote/federation=Phase 3·ingress re-invocation idempotency=separate decision gate를 명시한다. historical table rewrite/package reopen 없이, authorized edit 뒤 G1-A log·relevant package registry·`git diff --check`가 PASS해야 한다.

- **Boundary:** PASS는 audit 완료 및 bounded future write-set 식별일 뿐 G1-A closeout acceptance, plan/handoff completion, owner/roadmap change가 아니다.

### 2026-07-23 15:21 · W8 controlling result review — PASS

- **판정: PASS (review record only).** W8 accepted/completed 전환, plan/handoff 변경, G1-A closeout은 수행하지 않았다. 이 entry는 기존 W8 audit의 근거를 지정 범위에서 재대조한 append-only review 기록이다.
- **확인한 사실 — responsibility boundary:** roadmap과 accepted G1-B/G1-C/public-ID-factory-B 결과는 G1-A가 canonical envelope/public ID/source-only reply-right 또는 Tier 3 reliability를 직접 구현했다고 주장하지 않는다. G1-A의 정확한 역할은 accepted 결과를 contract/ingress evidence와 owner boundary에 소비·정합화하는 것이다. G1-B/G1-C registry integrity 및 public-ID-factory-B registry integrity는 모두 PASS다.
- **확인한 사실 — residual location:** current owner/roadmap drift는 발견되지 않았다. 불일치는 `plans/g1-a-contract-ingress.md`의 B/C future-consumer stage wording과 `logs/G1/2026-07-18-G1-A-closeout-and-G1-B.md`의 historical future-tense handoff rows에 한정된다. 따라서 historical table은 고쳐 쓰지 않고 append-only reconciliation으로 operational reading만 supersede해야 한다.
- **확인한 사실 — phase separation:** G1-D trust boundary는 remaining Phase 0/release gate, authenticated ack/`completed`는 Phase 1 Tier 2, durable replay/mailbox는 Phase 2, remote/federation은 Phase 3이다. ingress re-invocation idempotency는 delivery-creation `idempotencyKey` 및 Codex request correlation과 구별되는 separate future decision/work item이다.
- **확인한 사실 — sufficient future write-set:** 다음 authorized closeout action의 최소 write-set은 plan, existing closeout handoff log의 append-only reconciliation, 그리고 이 controlling log의 pointer/reconcile이다. roadmap과 current owner documents 수정은 필요하지 않다.
- **검증:** G1-A `log check`, G1-B/G1-C/public-ID-factory-B `package-log check`, `git diff --check` 모두 PASS. 새 blocker는 발견되지 않았다. W8은 sole active pointer로 유지한다.

### 2026-07-23 15:25 · W8 candidate edit applied — evidence and next pointer

- **Candidate evidence:** Updated only the authorized plan and append-only closeout-handoff provenance. The plan now treats accepted G1-B/G1-C/public-ID-factory-B results as consumed/reconciled external results, replaces the future B/C handoff stage with `accepted-result provenance reconciliation → G1-A closeout`, and preserves the G1-D Phase 0/release, Phase 1 Tier 2 ack/`completed`, Phase 2 durable replay/mailbox, Phase 3 federation, and separate ingress re-invocation idempotency boundaries.
- **Historical preservation:** The closeout log retains every earlier future-tense B/C row and its contemporaneous decision. Its new reconciliation entry states that those B/C obligations are completed/consumed accepted results without attributing their implementation to G1-A; G1-D and the future responsibilities remain explicit.
- **Next pointer:** W8 remains the sole active pointer for candidate review/acceptance. G1-A final closeout/acceptance is not performed, no Work Item is completed, and roadmap, code, tests, and owner documents remain outside this edit.

### 2026-07-23 15:31 · W8 candidate state correction — closeout activation reverted

- **Correction basis:** The controlling log's W8 is the sole active pointer, while the historical closeout log's W1 had been marked active despite the candidate reconciliation stating that W1–W3 were unchanged and G1-A final closeout had not started.
- **Applied correction:** Restored only historical closeout W1 from `[>]` to pending `[ ]`. W2/W3, the handoff register, all history rows, W8 status, and the candidate reconciliation text are unchanged.
- **Result / next pointer:** The closeout lifecycle has no active Work Item; W8 remains the sole candidate/active pointer pending review or acceptance. This correction neither starts nor accepts G1-A closeout.

### 2026-07-23 15:40 · W8 closeout-reconciliation candidate controlling result review — PASS

- **판정: PASS (review record only).** 이 entry는 candidate의 controlling-result read-only review와 append-only 기록뿐이다. W8 accepted/completed 전환, historical closeout W1 활성화, plan/handoff/roadmap/owner 문서 수정, G1-A final closeout은 수행하지 않았다.
- **확인한 사실 — accepted-result consumption:** `plans/g1-a-contract-ingress.md`는 accepted G1-B canonical-envelope/public-ID와 G1-C process-lifetime Tier 3 결과를 G1-A가 소비·정합화하되 직접 구현한 owner가 아니라고 명시한다. completion/Notes는 public-ID-factory-B provenance도 같은 방식으로 구분한다. G1-B와 G1-C controlling package는 `decided`, public-ID-factory-B W1은 accepted/completed이며, 이번 G1-B/G1-C/public-ID-factory-B package registry checks는 모두 PASS했다.
- **확인한 사실 — historical and state boundary:** `logs/G1/2026-07-18-G1-A-closeout-and-G1-B.md`의 2026-07-19 future-tense B/C/D rows는 보존돼 있다. 2026-07-23 candidate reconciliation만이 그 operational reading을 accepted/consumed external result로 supersede하고 G1-A의 직접 구현 claim을 배제한다. historical closeout W1–W3 및 W2 register는 모두 pending이며 active item이 없고, 이 controlling log의 W8만 sole active pointer다.
- **확인한 사실 — phase and owner boundary:** G1-D trust boundary는 남은 Phase 0/release gate, authenticated automatic ack/`completed`·wake-up·adapter-specific duplicate suppression은 Phase 1 Tier 2, durable replay/mailbox는 Phase 2, remote/federation은 Phase 3이다. ingress tool re-invocation idempotency는 delivery-creation `idempotencyKey` 및 Codex internal `requestId` correlation과 별개인 future decision/work item이다. plan, roadmap, candidate reconciliation은 이 구분에서 일치한다. 따라서 scoped reconciliation에 roadmap 또는 current owner 문서 추가 수정 근거는 없다.
- **검증 / write-set:** G1-A `log check`, G1-B/G1-C/public-ID-factory-B `package-log check`, `git diff --check`는 PASS했다. candidate의 확인된 변경은 plan, historical closeout log의 append-only reconciliation, controlling log의 candidate/status entries라는 authorized write-set에 맞는다. worktree에는 이 review보다 선행한 다수의 unrelated dirty changes가 있으므로 그 소유권은 이 판정으로 귀속하지 않는다. scoped candidate에서 새 blocker 또는 write-set 밖 candidate 변경의 증거는 발견되지 않았다.
- **Boundary:** 이 PASS는 candidate controlling result가 acceptance-ready임을 뜻할 뿐 acceptance나 closeout 전환을 수행하지 않는다. W8 remains the sole active pointer.

### 2026-07-23 15:39 · W8 accepted/completed — closeout-reconciliation accepted and next pointer recorded

- **Acceptance / reconcile:** W8 closeout-reconciliation candidate is accepted/completed after re-comparing the latest candidate, controlling-result review, and final independent review evidence. The accepted reconciliation consumes and aligns G1-B, G1-C, and public-ID-factory-B results; it does not attribute their implementation to G1-A.
- **Confirmed conditions:** W8 had been this controlling log’s sole active item. Historical closeout W1–W3 and the W2 register remain pending with no active item. Historical future-tense B/C/D rows are preserved; only the append-only reconciliation corrects their current operational reading.
- **Boundary retained:** G1-D remains the Phase 0/release gate; Tier 2 is Phase 1; durable replay/mailbox is Phase 2; federation is Phase 3; ingress re-invocation idempotency remains a separate future decision boundary. No roadmap or owner-document change and no new blocker is introduced.
- **Next pointer (not activated in this session):** `G1-A final closeout execution — historical handoff reconciliation and plan finalization`. This is not an activation of historical closeout W1, a new Work Item, or a `decided`/final-closeout transition.

### 2026-07-23 16:00 · candidate reconciliation evidence / W1 readiness re-review pointer

- **Candidate evidence:** the authorized plan-state and closeout current-contract reconciliation is applied. The plan’s completed evidence stage is `[x]`; its sole active final-closeout stage points to the historical closeout log, where W1 is already the sole active item. The closeout register retains 2026-07-19 B/C/D rows as historical provenance while reconciling only current B/C/D status cells.
- **Boundary:** accepted G1-B/G1-C/public-ID-factory-B results are consumed external provenance, not G1-A implementation. G1-D remains the Phase 0/release gate; Tier 2=Phase 1, durable replay/mailbox=Phase 2, federation=Phase 3, and ingress re-invocation idempotency remains a separate future decision/work item.
- **Next pointer:** `W1 readiness re-review` in `logs/G1/2026-07-18-G1-A-closeout-and-G1-B.md`, limited to re-checking the reconciled current contract and plan state. This append does not reactivate any completed W1–W8 item, complete W1/W2/W3, or transition G1-A to `decided`.

### 2026-07-29 13:13 · 2026-07-29 13:12 · G1-A Codex structured ingress evidence final disposition — decided

최종 결과: G1-A Codex structured ingress evidence stage를 `decided`로 전환한다.

반영·검증: W1–W8은 모두 완료되었고, closeout 로그의 2026-07-29 final gate 재검토는 PASS였다. W9 provenance/implementation traceability 감사도 `decided`/PASS이며, G1-B·G1-C 및 public-ID-factory-B의 package registry 정합성도 확인됐다.

범위: 이 로그가 소비하는 것은 accepted G1-C process-lifetime Tier 3 결과뿐이며, ingress re-invocation idempotency·accepted-result recovery 등 남은 Codex·Claude 공통 구현은 roadmap과 W10 reconciliation이 소유한 G1-C 작업으로 남는다. G1-D 및 이후 Phase 경계도 변경하지 않는다.

남은 local Work Item·next pointer·Return Target은 없다. 기존 15:39/15:40 W8 기록의 물리적 순서는 역사적 provenance로 보존하며, 이후 accepted entry와 최종 재검토 결과가 현재 결론을 명확히 한다.
