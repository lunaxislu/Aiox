---
topic: G1-A contract/ingress freeze
description: G1-A contract/ingress freeze kickoff, owner audit, decision closure, fixture sync and Codex ingress evidence tracking.
status: decided
---

## Work Items

- [x] W1 Kickoff owner/prerequisite audit: confirm G0 inputs usable, read G1-A owner refs, classify open decisions and implementation evidence needed before contract freeze.
- [-] W2 Produce the G1-A execution checklist and handoff map after contract decisions close, covering schema/tool fixture sync and Codex ingress evidence. — cancelled: fallback checklist must not own work that belongs to concrete plan stages; the prepared handoff remains historical context only.
- [x] W3 Reflect approved typed send/reply, reply permission, acceptance/ack, and idempotency decisions in owner docs; verify, then hand off W2.

## Required Context

### Return Target

- None: independent log.

### {Global}

- Parent plan: plans/g1-a-contract-ingress.md. Roadmap gate: docs/product/roadmap.md G1-A Contract And Ingress. Scope is contract/ingress freeze only; G1-B envelope cutover, G1-C reliability, G1-D trust boundary and G3 daemon stabilization are downstream/out of scope unless needed as handoff notes.
- Required owner refs before edits: docs/product/roadmap.md G1-A, docs/specs/aiox-message-lifecycle.md, docs/specs/aiox-open-deferred.md, docs/specs/aiox-adapter-model.md, docs/architecture/local-runtime-codex-adapter.md, docs/decisions/codex-per-agent-app-server.md.
- 사용자에게 드리는 설명·보고·질문은 한국어로만 작성한다.

## 2026-07-10 · G1-A kickoff

### 2026-07-10 21:03 · initial scope and evidence frame

G1-A 착수 로그다. 이 로그는 `plans/g1-a-contract-ingress.md`의 첫 활성 단계가 소비한다.

초기 판정:

- [Fact] Roadmap G1-A는 canonical schema, typed send/reply tool, instruction/description/example sync, Codex ingress evidence를 고정하는 gate다.
- [Fact] G1-A의 open decisions는 public `deliveryId` namespace, typed send/reply validation boundary, explicit ack control-plane 여부, Codex structured ingress named app-server surface 검증이다.
- [Inference] 첫 단계는 구현 착수가 아니라 owner/prerequisite audit과 decision queue 정리여야 한다. G1-A는 G1-B/C가 소비할 contract boundary를 여는 gate라서, contract owner와 evidence gap을 먼저 닫아야 한다.

검증 기준:

- roadmap gate intent를 plan checklist로 복사하지 않고, 실행 순서와 로그 포인터만 plan에 둔다.
- contract 본문은 spec owner가, current/as-built 구현 사실은 architecture/code/tests가, 진행 상태는 이 로그와 plan이 소유한다.

### 2026-07-16 16:42 · Log-skill separation and G1-A resumption

재개 경계 확인:

- @user는 log skill 개선을 `/Users/lunaxislu/workSpace/log-skill`로 분리했다고 알렸다. 해당 workspace의 `AGENTS.md`는 public source를 `skills/log/`으로 선언하고, `.agents/`와 local `logs/`는 local-only material로 둔다.
- 이 repository의 `scripts/onramp`는 변함없이 `plans/g1-a-contract-ingress.md`의 G1-A kickoff를 유일한 현재 작업으로 선택한다. 따라서 이 로그 W1이 원래 제품 작업의 재개 지점이다.
- log-system의 다른 open 로그는 각각 별도 workstream이며, onramp가 current로 선택하지 않았다. G1-A scope는 contract/ingress freeze이며 G1-B/C/D 및 G3는 explicit handoff가 필요한 경우 외에는 범위 밖이다.

다음:

- W1에서 G0 입력과 지정된 roadmap/spec/architecture/decision owner를 직접 읽고, `deliveryId` namespace, typed send/reply validation, explicit ack control-plane, Codex named app-server ingress evidence를 decision/evidence queue로 분류한다. 이 기록은 아직 그 owner audit을 완료했다는 뜻이 아니다.

### 2026-07-16 20:38 · W1 owner/prerequisite audit 결과

6개 지정 owner(roadmap G1-A, message-lifecycle spec §4, open-deferred §9,
adapter-model §5, codex-adapter architecture §7, codex-per-agent-app-server
decision)를 읽고 코드 근거를 교차 확인했다.

**G0 prerequisite 사용 가능성 (plan 완료조건 #1)**

- [Fact] G0 전용 plan/log가 없다. `package.json`은 `name: "ai-orchestration"`,
  `version: "1.0.0"`, `license: "ISC"`이고 root `LICENSE` 파일이 없다 — release
  identity가 scaffold/placeholder 수준이다.
- [Fact] canonical protocol 문자열 `aiox.message.v1`이 `src/` 전체에 없다.
  `replyExpected`/`intent` enum/`inReplyToDeliveryId`/reserved-intent도 코드에 없다.
  현재 typed validation은 `src/adapters/shared/dispatch-schema.ts`의 dispatch summary
  output(zod)뿐이다.
- [Fact] support matrix 전용 owner 문서가 없다. `docs/product/roadmap.md`만
  macOS/Linux/WSL2·Node를 산발적으로 언급한다.
- [Inference] G1-A(contract/ingress freeze)가 실제로 소비하는 G0 입력은
  (a) protocol identity `aiox.message.v1`, (b) 지원 Codex/Claude CLI 버전 pin,
  (c) support matrix다. protocol version은 message-lifecycle spec에서 Normative로
  고정됐으므로 contract 본문 freeze 입력으로 사용 가능하다. 코드에 없음은 정상
  (= G1 cutover 대상).
- [판정] G0/G1-A boundary blocker로 분리: ① release package identity(name/version/
  license + LICENSE 파일) 미확정은 G0↔G5 경계 항목이며 G1-A contract 본문 freeze를
  막지 않는다. ② support matrix 전용 owner 부재 + Codex/Claude CLI 버전 pin 미문서화는
  Stage 4(Codex ingress evidence)가 움직이는 target 위에서 검증되지 않도록 그 단계 전에
  pin이 필요하다.

**Open 항목 분류 (decision queue / evidence queue)**

1. public `deliveryId` namespace ↔ repository id — DECISION (schema freeze 전 사용자
   승인 필요). owner: message-lifecycle §4.1/§4.2/§4.5. 현재 store는
   `message_deliveries.id` row PK만 있고, public `deliveryId`가 stored row id와 동일한지
   별도 external id인지 미결. spec이 "G1 schema cutover 전 결정"으로 명시. Stage 3 blocker.
2. typed send/reply validation boundary + reserved intent rejection — DECISION + EVIDENCE.
   decision: typed input shape(send=intent/replyExpected/content,
   reply=inReplyToDeliveryId/intent/replyExpected/content)와 `type` authoring 규칙은
   spec에서 "Recommended, not yet approved" → 사용자 승인 필요. evidence: 현재 코드에
   canonical envelope validation 없음(grep 공집합). 현재는 text-only tool + 5종 label
   instruction(pre-release compatibility). schema validator·MCP instruction·tool
   description·example·fixture를 같은 contract revision으로 교체 + negative test
   (agent-authored reserved intent, unknown intent, label↔typed 충돌) 구축 필요.
   Stage 3 blocker.
3. explicit ack surface = envelope vs control-plane operation — DECISION (G1-A는 surface
   결정만). owner: message-lifecycle §4.3 + "Recommended, not yet approved — explicit ack
   surface"(control-plane operation, caller가 deliveryId 제출, acknowledging identity는
   token/session binding에서 daemon 결정). operation/tool/RPC 이름·adapter별 호출 시점은
   G1 승인 대상. 경계: ack의 retry/timeout 값 tuning·구현은 G1-C. G1-A는 surface 결정 +
   G1-C handoff 경계만 소유.
4. Codex structured ingress named app-server surface 검증 — EVIDENCE (primary). owner:
   open-deferred §9 + codex-adapter §7. [확인됨] adapter가 `turn/start`, loaded-thread
   list, selected thread binding, app-server/WS failure 감지 가능. [미검증]
   `thread/inject_items`, `turn/steer`, canonical deliveryId binding, active-turn policy,
   `turn/started|completed` lifecycle, `thread/tokenUsage/updated`, `outputSchema`,
   Tier 2 semantics. 제약: named app-server surface를 직접 검증해야 하며 generic
   `turn/start` compatibility path로 대체 승인 불가. 검증 항목: TUI 표시, idle wake-up,
   active-turn 충돌, deliveryId 보존, timeout/process-exit/unsupported-method 실패 모드.
   검증 전 Tier 2 주장 금지. `clientUserMessageId`는 deliveryId binding 후보일 뿐 public
   계약 미확인 → 항목 1과 연결. Stage 4 blocker.

**G1-B / G1-C handoff 분리**

- correlated reply authorization(reverse route 요구 vs 원 delivery obligation이 좁은
  reply right 부여)는 spec §4에서 "G1 must decide"지만 roadmap은 G1-B 진입조건에 둔다.
  → G1-A는 `inReplyToDeliveryId` field와 deliveryId namespace를 freeze하고, authorization
  모델은 G1-B로 handoff(단, 항목 1과 강결합).
- ack/retry/idempotency 구현은 G1-C. G1-A는 ack surface 결정만 소유.

W1(owner/prerequisite audit + 분류) 완료. W2(execution checklist·handoff map)로 넘어간다.
항목 1·2·3의 DECISION 부분은 Stage 2(Contract decision closure)에서 사용자 승인이 필요하므로
W2 checklist는 승인 gate를 명시한다.

### 2026-07-16 20:46 · W1 report interpretation for user

- [Fact] W1은 구현 또는 contract 변경 완료 보고가 아니라, G1-A를 시작하기 전에 기존 문서·코드에서 무엇이 이미 정해졌고 무엇이 비어 있는지 조사한 완료 기록이다.
- [Interpretation] 사용자에게 즉시 결정을 요구하는 것은 3개뿐이다: public deliveryId가 DB row id인지 별도 외부 id인지, typed send/reply input 및 reserved intent 거절 규칙을 승인할지, ack를 envelope field로 둘지 별도 control-plane operation으로 둘지. 어느 선택지도 이 entry에서 확정되지 않았다.
- [Fact] Codex ingress 항목은 선택지가 아니라 실제 Codex app-server interface에서 가능한지 시험으로 확인해야 하는 증거 항목이다. support matrix 및 Codex/Claude CLI version pin은 그 시험 전에 고정돼야 한다.
- [State] W2는 위의 미결정을 대신 결정하거나 구현하는 단계가 아니라, 결정을 받는 시점과 그 뒤 schema/tool fixture sync 및 ingress evidence의 담당·순서를 체크리스트로 만드는 작업이다. W2 remains active.

### 2026-07-16 20:57 · G1-A scope explanation requested

- [User context] User requested a one-by-one explanation of G1-A after a long hiatus from the project.
- [Fact] G1-A is a pre-cutover contract/ingress gate: it fixes the shared message boundary and validates the Codex ingress evidence that G1-B (envelope migration) and G1-C (delivery reliability) will consume. It is not the full reliable round-trip implementation.
- [Explanation scope] Explain in order: baseline/current MVP versus target, three contract decisions, schema/tool/fixture implementation, named Codex app-server experiment and evidence classification, then the G1-B/G1-C handoff. Preserve W2 as active; this explanation does not approve any decision or change implementation.

### 2026-07-16 21:32 · W1 decision queue 재검토

- [Fact] Re-read plan, roadmap, message-lifecycle spec, current Codex MCP schema, core message/delivery model, store schema, and turn/start injector. The canonical envelope shape, agent-authored intent subset, and reserved `status`/`notification` rejection are already specified in the message-lifecycle owner; current code remains pre-v1 (`content`-only tools, `parent_message_id`, no canonical envelope fields).
- [Review] W1 is correct that public `deliveryId` namespace is a schema-freeze decision, explicit ack surface needs user approval, and named Codex app-server structured-ingress evidence is distinct from a contract decision. It is also correct that the actual envelope/repository cutover and reliability implementation belong downstream.
- [Correction] Treating “reserved intent rejection” itself as a new user decision is overstated: the spec states that agent/human submission of reserved intents is rejected. The genuinely open typed-tool decision is the exact authoring boundary, especially whether `type` is supplied by send, fixed to `reply` by daemon, and the final public input/error shape. The plan's wording (“validation boundary”) supports this narrower formulation.
- [Process judgment] Before requesting approvals, discuss the message contract in dependency order: (1) confirm the already normative envelope semantics, (2) decide public deliveryId identity/namespace, (3) decide typed send/reply authoring surface and resulting validation, (4) approve ack as a control-plane surface. This is a decision-closure discussion, not a schema migration; W2 remains active and should encode this order rather than pre-empt the decisions.

### 2026-07-17 13:47 · W1 결정 대기열 정정 및 논의 순서

- [사실] 계획·roadmap·message-lifecycle 명세·현재 Codex MCP 도구 schema·core message/delivery model·store schema·`turn/start` 주입기를 다시 대조했다. canonical envelope 형태, agent가 직접 만들 수 있는 intent 범위, 시스템 전용 `status`/`notification` intent의 거절은 이미 message-lifecycle 명세에 규정돼 있다. 반면 현재 구현은 `content` 중심 도구와 `parent_message_id`를 사용하며 canonical envelope 필드를 갖지 않는 pre-v1 상태다.
- [재검토 판정] W1의 `deliveryId` 공개 namespace 결정, explicit ack 표면의 사용자 승인, Codex named app-server structured-ingress 검증을 각각 결정/증거로 분리한 것은 타당하다. envelope·repository 실제 전환은 G1-B, ack·재시도·idempotency 구현은 G1-C라는 handoff도 유지한다.
- [정정] "reserved intent 거절을 승인해야 한다"는 W1 표현은 과도했다. 거절 원칙 자체는 이미 명세가 정한다. G1-A에서 실제로 정할 typed tool 항목은 send가 `type`을 받는지, reply의 `type`을 daemon이 `reply`로 고정하는지, 그리고 최종 public input/error 형태가 무엇인지다. 따라서 open decision #2는 "typed send/reply authoring·validation boundary"로 좁혀 해석한다.
- [정정] Codex app-server/WS 실패는 관찰 지점이 존재하지만, 현재 production 경로에서 해당 callback이 에이전트 연결 해제로 완결되지는 않는다. W1의 "failure 감지 가능"은 관찰 가능성으로만 읽고, 완전한 실패 처리가 확인된 것으로 해석하지 않는다.
- [진행 순서] 사용자 승인 요청 전, (1) 이미 규정된 envelope 의미를 확인하고, (2) public `deliveryId` identity/namespace를 결정하고, (3) typed send/reply authoring surface와 검증을 결정하고, (4) explicit ack를 control-plane operation으로 둘지 승인한다. 이는 schema migration이 아니라 G1-A의 contract decision closure다. W2는 이 순서와 후속 schema/tool fixture sync·Codex evidence handoff를 체크리스트로 정리하는 활성 작업으로 유지한다.

### 2026-07-17 13:49 · 첫 contract 의제 확정

- [진행] 사용자 설명을 위해 첫 contract discussion 의제를 public `deliveryId` identity/namespace로 명확히 했다. canonical envelope의 나머지 기본 의미는 이미 명세에 있으므로 짧게 확인한 뒤, 첫 실제 선택은 `deliveryId`를 current `message_deliveries.id`와 같은 공개 opaque id로 할지, 별도 public id를 발급·저장할지다.
- [근거] 이 선택이 `inReplyToDeliveryId` correlation, explicit ack 대상, retry/idempotency key, repository schema migration과 fixture의 기준을 정한다. typed send/reply authoring surface와 ack operation은 이 identity를 참조하므로 뒤에 논의한다.
- [상태] 사용자 승인 전에는 두 대안 중 어느 것도 채택하지 않는다. W2 remains active.

### 2026-07-17 13:58 · 사용자 이해 중심 contract discussion 방식

- [사용자 요청] 사용자는 프론트엔드 개발자이며 이 프로젝트의 내부 message/delivery model에는 익숙하지 않다. 단순 추천 승인 대신, 각 의제의 사용자 관찰 결과·실패 사례·선택지와 trade-off를 이해한 뒤 피드백하고 결정할 수 있는 진행 방식을 원한다.
- [진행 판정] contract decision closure를 기술 field 나열 순서로 진행하지 않는다. 먼저 "에이전트 A가 B에게 질문을 보내고 B가 답하는" 한 흐름을 UI/UX 관점에서 설명하고, 그 흐름의 한 단계씩을 deliveryId, typed send/reply, ack로 연결한다. 각 의제는 문제 상황 → 사용자에게 보이는 결과 → 선택지 → 장단점 → 현재 명세/코드 제약 → 사용자 결정 순서의 짧은 decision brief로 제시한다.
- [제약] recommendation은 명시적 제안으로만 제시하고, 근거와 대안을 분리한다. 사용자가 이해·피드백할 때까지 승인이나 owner 문서 변경을 가정하지 않는다. W2는 위 decision brief와 후속 구현/evidence handoff를 준비하는 활성 작업으로 유지한다.

### 2026-07-17 14:01 · 사용자 이해 중심 논의 규칙의 owner 배치 검토

- [사실] root `AGENTS.md`는 repo 전역 agent 작업·보고·진입 규칙을 소유한다. `logs/AGENTS.md`는 로그 결과의 owner handoff와 closeout 추가 점검만 소유한다. documentation-system은 반복 적용 방법을 guide, agent 작업 범위·행동 규칙을 해당 scope `AGENTS.md`의 owner로 둔다.
- [판정] 사용자 이해 중심의 decision discussion 방식은 log closeout/owner handoff 규칙이 아니므로 `logs/AGENTS.md`에 두지 않는다. repo 전역 agent 행동 규칙으로 적용하려면 root `AGENTS.md`의 Work Entry에 짧은 조건부 bullet을 추가하는 것이 가장 작은 적정 변경이다.
- [제안] "사용자가 해당 도메인 모델에 익숙하지 않아 설계 결정을 요청하는 경우, field/구현 선택부터 승인받지 않는다. 사용자 시나리오와 UI·이벤트·실패 흐름으로 문제를 먼저 설명하고, 각 선택지의 관찰 가능한 결과·trade-off·근거를 구분해 제시한 뒤 결정을 요청한다." 문구를 root AGENTS에 두고, 구체적 사례나 긴 절차는 반복 필요성이 확인될 때만 workflow guide로 승격한다.
- [상태] 이 entry는 owner 배치 제안이며 root AGENTS 변경 승인을 뜻하지 않는다. W2 remains active.

### 2026-07-17 14:03 · 설명 형식과 사용자 배경 반영

- [사용자 배경] 사용자는 프론트엔드 개발자이며 이 프로젝트의 내부 domain model에는 익숙하지 않다. 이 개인 맥락은 repo 전역 agent rule이 아니라 현재 작업 로그에서 설명의 출발점으로 적용한다.
- [표현 판정] "Composition"은 부분의 책임과 결합이 전체를 이루는 구조를 보여 주는 형식이다. `Transition Across Logs / Lifetimes` 사례에서는 Base File Surfaces → Operations → Transition → source/target Update/Reconcile의 관계를 composition map/tree로, Transition 실행 뒤의 source·target 분기를 ASCII state flow로 함께 제시하는 것이 적절하다.
- [전역 반영] root `AGENTS.md` Evidence And Reporting에, 도메인 모델이 낯선 사용자에게는 구조(tree/composition map) → 순서(ASCII flow) → 사용자 시나리오·UI/이벤트/실패 흐름 → 선택지·근거 순으로 설명한다는 조건부 규칙을 추가했다. 사용자가 밝힌 개인 기술 배경은 해당 작업 로그에만 기록한다.
- [상태] 이 설명 규칙은 G1-A의 contract 결정 내용이나 W2의 범위를 바꾸지 않는다.

### 2026-07-17 14:20 · deliveryId 사용자 시나리오 기반 설명 시작

- [진행] 첫 contract discussion으로 public `deliveryId` identity/namespace를 사용자 시나리오 기반으로 설명한다. 설명 순서는 message와 target별 delivery의 구성 관계 → 전송/답변/재시도 흐름 → 현재 pre-v1 구현 차이 → same-as-row-id versus separate-public-id 선택지와 trade-off다.
- [사실] 명세는 하나의 logical `messageId`가 fan-out target별 서로 다른 `deliveryId`를 가지며, reply correlation·idempotency·ack가 deliveryId를 기준으로 한다고 정한다. 현재 store는 `message_deliveries.id` PK와 message_id를 가지지만 public deliveryId를 노출하지 않고, current reply는 parentMessageId를 사용한다.
- [제약] 이 설명은 `deliveryId` 선택을 승인하거나 correlated reply authorization(G1-B entry decision)을 결정하지 않는다. W2 remains active.

### 2026-07-17 14:28 · deliveryId 선택지의 현재 ID 생성 근거 정정

- [사실] `message_deliveries.id`는 저장소에서 주입받은 `createDeliveryId` 값으로 생성되지만, production daemon은 모든 entity에 공용 `createSequentialId()`를 전달하며 값은 `daemon-1`, `daemon-2`처럼 process 시작마다 다시 시작한다. 이 값은 delivery 전용 prefix나 daemon restart를 넘는 안정성을 현재 보장하지 않는다.
- [정정] 앞서 설명한 "현재 DB 행 ID를 그대로 public deliveryId로 사용"은 현재 구현을 무변경으로 채택하는 선택지가 아니다. 같은 값을 public deliveryId로 쓰려면 해당 ID 생성/수명/외부 안정성 계약을 G1-B에서 바꾸어야 한다. 별도 public deliveryId를 저장하는 방식은 내부 행 ID를 유지하고 public contract만 안정화한다.
- [잠정 제안] v1 public contract에는 target별 stable opaque `deliveryId`가 필요하므로, current raw row id를 노출하지 않는다. 구현 선택은 (A) row id 자체를 `dlv_<stable random id>`로 migration하여 public contract로 승격하거나, (B) immutable public `delivery_id` column을 별도로 추가하는 두 가지로 재구성한다. 어떤 안도 아직 승인되지 않았다.
- [상태] 다음 설명에서는 두 안의 UI/사용자 흐름 불변성은 동일하고, repository migration·향후 저장소 교체·구현 비용의 차이만 비교한다. W2 remains active.

### 2026-07-17 15:16 · 메모리 DB roadmap 및 provenance 재검토

- [사실] roadmap은 durable store/mailbox replay를 G1-C와 G3의 통과 조건에서 명시적으로 제외하고, restart 시 in-memory state 소실을 공개 release 제한으로 둔다. durable persistence는 Phase 2 범위이며, 이를 공개 release blocker로 앞당길 경우 stable daemon identity와 reply idempotency를 먼저 닫아야 한다고 정한다. message-lifecycle은 공개 release가 in-memory DB를 계속 쓰더라도 process lifetime 안에서 canonical message/delivery/ack/reply-obligation 상태를 일관되게 보존해야 한다고 정한다. README도 현재 daemon state가 `:memory:`라고 공개한다.
- [사실] production daemon은 `new Database(":memory:")`를 열지만, WAL file helper와 `delivering → queued` restart-recovery repository method는 존재하고 startup에서 사용되지 않는다. pre-validation spike(2026-05-16)는 file-backed SQLite/WAL, restart 시 transport를 복원하지 않고 agent를 disconnected로 표기, in-flight `delivering → queued`를 검증했으나 real daemon supervision, 실제 adapter reconnection, duplicate delivery beyond schema rejection 등은 검증하지 않았다.
- [provenance] 2026-06-11 product-A2A 로그에서 durable store를 release gate에 넣지 않고 README 제한 표기 + Phase 2 mailbox replay로 묶는 방향이 사용자 지시로 확정되었다. 2026-06-16 W4.5와 2026-06-18 W7은 WAL/file helper와 recovery method가 있어도 production `:memory:`인 점을 별도 current gap으로 유지했고, later architecture owner도 같은 current-gap/Phase-2 target 분류를 유지한다.
- [정정] 앞선 deliveryId 설명에서 "daemon 재시작 뒤에도 유지"라고 넓게 말한 것은 현재 Phase 0 roadmap과 맞지 않는다. G1-A/G1-B에서 deliveryId는 한 daemon process lifetime의 delivery/retry/ack/reply correlation 동안 stable해야 한다. restart 이후 state를 replay·resumption하는 durability는 아직 promise하지 않으며 Phase 2가 소유한다.
- [판정] G1-A 범위에서 in-memory DB를 file-backed store로 바꾸지 않는다. 대신 canonical v1 fields와 delivery lifecycle state를 현재 process lifetime 안에서 저장·검증하는 schema cutover를 진행하고, restart state loss를 public limitation으로 유지한다. durable store 전환을 시작하려면 Phase 2 workstream과 stable daemon identity/reply-idempotency의 선행 결정을 별도로 열어야 한다.

### 2026-07-17 15:16 · deliveryId와 메모리 DB 수명 경계 추가 정정

- [추가 정정] Phase 0 roadmap은 restart 뒤 state replay를 약속하지 않는다. 따라서 current row id가 daemon restart 뒤 재사용된다는 사실만으로 public deliveryId 채택 불가라고 단정할 수는 없다. deliveryId의 필수 안정성은 우선 동일 daemon process lifetime 안의 retransmission/ack/reply correlation이며, restart를 넘는 namespace 안정성은 durable store를 도입할 Phase 2의 별도 계약이다.
- [남은 결정의 재구성] G1-A는 먼저 public deliveryId의 namespace/lifetime을 "현재 daemon instance 범위"로 명시할지, Phase 2 durable replay까지 미리 보장할 외부 namespace로 설계할지 정해야 한다. roadmap의 현재 범위에는 전자가 정합한다. 전자를 승인하면 `message_deliveries.id`를 deliveryId로 승격하는 A안은 가능하되, `daemon-N` 형식이 public opaque identifier로 적절한지와 ID 생성 규칙은 별도 검토 대상이다. B안(별도 public column)은 durable 전환 자체를 앞당기지 않으며, Phase 0에서 반드시 필요하다는 근거는 아직 없다.
- [상태] 이전의 "현재 row id를 공개 deliveryId로 쓸 수 없다"는 단정은 superseded한다. 아직 어떤 namespace 또는 ID 형식도 승인하지 않았으며, W2 remains active.

### 2026-07-17 15:24 · deliveryId 공개 ID와 메모리 DB 재시작 위험 설명

- [사실] `message_deliveries.id`는 이미 해당 테이블의 primary key이며, `message_id`가 원 메시지와의 관계를 나타낸다. SQLite schema에는 실제 `foreign key` constraint 선언은 없다. 따라서 A안은 외래키를 새로 만드는 일이 아니라, 현재 내부 primary key 값을 public `deliveryId`로도 노출·참조하게 하는 선택이다. B안은 `delivery_id` 같은 별도 column을 추가하고 unique하게 발급·저장하며, 내부 `id`는 저장소 구현용으로 남기는 선택이다.
- [정정] memory DB와 daemon 재시작 때문에 `daemon-1` 같은 값이 다시 나올 수 있는 것은 사실이나, 현재 roadmap은 restart 뒤 delivery 상태 replay를 약속하지 않는다. 그래서 이것은 Phase 0의 즉시 데이터 충돌 버그가 아니라, 과거 deliveryId를 restart 뒤에도 외부 시스템/에이전트가 계속 참조해야 한다는 계약을 채택할 때 생기는 namespace 충돌 위험이다.
- [핵심] B안은 column을 추가하는 것만으로 그 위험을 해결하지 않는다. B안도 재시작마다 같은 순번 생성기를 쓰면 public `delivery_id`가 다시 `daemon-1`이 될 수 있다. restart를 넘는 유일성은 durable DB 또는 daemon instance prefix/무작위 ID처럼 별도의 namespace·발급 규칙이 있어야 한다. 현재 G1-A의 실제 선결정은 A/B만이 아니라 deliveryId의 유효 범위(process lifetime 대 restart를 넘는 lifetime)다.
- [설명 방향] 사용자에게는 `현재 daemon이 살아 있는 동안만 유효한 택배 송장 번호`와 `daemon을 껐다 켜도 과거 조회·재개에 쓰이는 영구 송장 번호`의 차이로 설명한다. roadmap은 전자를 현재 범위로, 후자를 Phase 2 durable persistence 범위로 둔다. 어떤 선택도 승인하지 않았다.

### 2026-07-17 15:26 · deliveryId 공개의 코드상 의미 설명

- [설명 정정] 여기서 “공개”는 DB를 네트워크에 노출하거나 외래키를 만드는 뜻이 아니다. daemon이 target agent에게 전달하는 canonical envelope의 `deliveryId`, 그 agent가 보내는 reply/ack의 `inReplyToDeliveryId`, 그리고 도구·API의 성공/실패 결과에서 그 값을 계약상 식별자로 주고받는다는 뜻이다.
- [사실] 현재 내부 경로는 이미 `delivery.id`를 router의 상태 변경·dispatch 결과에 사용하지만, Codex MCP ingress 도구의 공개 input/output은 `content`, `parent_message_id`, `message_id` 중심이며 canonical `deliveryId`는 아직 agent-facing protocol field로 노출되지 않는다. G1 cutover에서 그 경계를 명시한다.
- [설명] A안이면 envelope의 `deliveryId`에 `message_deliveries.id` 값을 그대로 넣고, ack/reply/상태 조회도 그 값을 받아 repository `findById`/상태 갱신에 사용한다. B안이면 envelope에는 새 `delivery_id`만 넣고, repository는 `findByPublicDeliveryId` 같은 별도 조회로 내부 row를 찾아 상태를 바꾼다. 둘 다 DB row 전체나 DB 접속을 공개하지 않는다.

### 2026-07-17 15:36 · deliveryId 두 저장 방식의 사용자 이해 확인

- [사용자 이해 확인] deliveryId 선택지의 기본 구분을 올바르게 정리했다. A안은 기존 `message_deliveries.id` 값을 public `deliveryId`로 재사용·승격하는 방식이고, B안은 내부 `id`와 별개인 `delivery_id` column을 추가해 외부 계약용 값을 발급·저장하는 방식이다. 어느 안도 아직 채택되지 않았다.
- [보충] B안에서 column 추가와 ID 유일성은 별개다. 새 column의 값도 어떤 lifetime에서 유일해야 하는지에 맞는 발급 규칙을 정해야 한다. 현재 roadmap 범위에서는 daemon process lifetime이 우선 검토 대상이다.

### 2026-07-17 15:36 · deliveryId 판단 기준 변경의 사용자 서술 정리

- [정정 요약] 기존에는 memory DB 종료와 sequential id 재시작 때문에 A안(내부 `id` 재사용)을 배제하고 B안(별도 public column)을 사실상 권장하는 방향으로 설명했다. roadmap을 재검토한 결과, Phase 0은 restart 뒤 state replay·과거 deliveryId 재참조를 약속하지 않고 process lifetime만 보장한다. 따라서 재시작 후 `daemon-1` 재사용은 현 범위의 즉시 충돌 근거가 아니며, A안을 배제할 수 없다.
- [현재 기준] 변경된 것은 선택지 자체가 아니라 판단 기준이다. 종전: “restart를 넘어 unique해야 함”을 전제. 현재: “먼저 public deliveryId의 유효 범위가 current daemon process인지, durable Phase 2까지인지 결정”. process lifetime을 채택하면 A/B 모두 가능하고, B안만으로 restart-stable uniqueness가 생기지 않는다.

### 2026-07-17 15:40 · deliveryId lifetime과 메모리 DB의 인과관계 정정

- [인과관계 정정] “roadmap이 전자를 전제로 한다”는 결론을 memory DB 구현만 보고 도출한 것이 아니다. roadmap이 먼저 durable store/mailbox replay를 Phase 2로 미루고 restart state loss를 현재 release limitation으로 명시한다. production `:memory:` DB는 그 제품 범위와 일치하는 현재 구현 근거다. 구현이 roadmap의 범위를 단독으로 정하지 않는다.

### 2026-07-17 15:40 · Phase 2 durable replay 범위 설명

- [사실] roadmap의 Phase 2 목표에는 `durable store/mailbox replay`가 명시적으로 포함된다. 즉 daemon 재시작 뒤에도 저장된 delivery 상태를 바탕으로 보류·미완료 전달을 복구하여 처리하는 방향이다. architecture도 in-memory SQLite에서 disk 기반 durable file과 restart recovery로의 전환을 post-MVP target으로 둔다.
- [한계] Phase 2 카드에는 세부 replay 정책(어떤 상태를 재전송하는지, 대상 agent가 재연결되지 않았을 때 처리, UI에 무엇을 표시하는지)은 아직 확정된 구현 checklist가 아니다. roadmap은 durable persistence를 공개 release blocker로 올릴 경우 stable daemon identity와 reply idempotency를 함께 먼저 닫아야 한다고 조건을 둔다. 따라서 “복구한다”는 방향은 확정됐지만, 정확한 사용자 흐름은 Phase 2에서 설계·검증할 일이다.

### 2026-07-17 15:42 · Phase 2 durable 환경에서 deliveryId 선택지의 충분성 설명

- [질문 판정] Phase 2 durable 형태에서도 A안(내부 PK를 public deliveryId로 승격) 또는 B안(별도 public column)은 여전히 유효한 저장·매핑 선택지다. 그러나 둘 중 하나만 고르는 것으로 Phase 2 contract가 완성되지는 않는다.
- [이유] durable DB가 재시작 뒤 기존 row를 보존하므로, 기존 delivery의 ID는 유지된다. 하지만 새 daemon이 새 delivery를 만들 때 과거 값과 충돌하지 않을 stable ID 발급 규칙, daemon identity, replay할 상태와 재전송/대기/실패 처리, reply idempotency를 함께 정해야 한다. A안이면 PK generator가 이를 보장해야 하고 B안이면 public column generator가 이를 보장해야 한다.
- [경계] 현재 Phase 0은 restart replay를 약속하지 않으므로, 우선 process-lifetime public ID와 A/B mapping만 G1-A의 의제다. Phase 2에서 durable replay로 승격될 때 위의 추가 정책을 열면 된다.

### 2026-07-17 15:43 · Phase 2 deliveryId 후속 작업과 호환성 원칙

- [판정] Phase 2 durable replay를 시작하면 deliveryId 관련 후속 작업은 반드시 다시 열린다. 현재 G1-A는 process-lifetime에서 public `deliveryId`가 무엇을 가리키는지와 A/B mapping을 고정하고, Phase 2는 그 같은 public field의 restart-spanning namespace·발급·replay/idempotency semantics를 확장·검증한다.
- [설계 원칙] 이를 “처음 결정을 뒤집는 재작업”으로 만들지 않으려면 G1-A의 public contract가 storage implementation을 노출하지 않고 opaque identifier로 정의돼야 한다. 그러면 Phase 2에서 row PK를 public ID로 유지하든 별도 column으로 migration하든, agent가 받는 `deliveryId` field의 의미·형식은 가능한 한 호환되게 유지할 수 있다. 현재 구현이 `daemon-N` 같은 수명 노출 형식을 public으로 확정하면 Phase 2 migration 부담이 커질 수 있으므로, 형식은 아직 승인하지 않는다.

### 2026-07-17 15:44 · Phase 2 deliveryId 설명 단순화 정정

- [설명 정정] 앞선 “Phase 2에서 같은 field의 의미를 유지한다”는 표현이 추상적이었다. 사용자 설명은 다음처럼 단순화한다: 지금은 deliveryId를 전달 건의 주문번호로 쓰고, Phase 2에서는 주문 기록을 종료 뒤에도 보관해 그 같은 주문번호로 미완료 건을 복구한다. Phase 2의 추가 작업은 ID 발급·저장·복구 처리이며, 현재 A/B 선택을 반드시 다시 뒤집는다는 뜻은 아니다.

### 2026-07-17 15:47 · deliveryId 선택지 불변과 판단 기준 변경 확인

- [사용자 이해 확인 및 정정] 사용자가 roadmap·memory DB 분석 뒤 deliveryId 선택지 자체가 A/B에서 다른 것으로 바뀐 것으로 받아들인 것은 앞선 설명이 “ID lifetime”을 새 선택지처럼 섞어 말했기 때문이다. 실제로 A안(현재 `message_deliveries.id` 재사용·public 승격)과 B안(별도 public column 발급·저장)은 변하지 않았다.
- [현재 유효한 framing] memory DB/roadmap 재검토가 바꾼 것은 A/B의 채택 가능성 판단이다. restart-spanning uniqueness를 Phase 0 필수 전제로 둘 수 없으므로 A안을 자동 배제하거나 B안을 자동 요구할 수 없다. Phase 2 durable replay는 후속 구현/정책이며, 그 작업을 지금 앞당기지는 않는다. G1-A는 A/B 선택과 현 process-lifetime contract만 논의한다.

### 2026-07-17 15:48 · 사용자 제시 A/B deliveryId 설명 재검토 및 보정

- [재검토 판정] 사용자가 인용한 A/B composition과 동일 사용자 흐름 설명은 현재 deliveryId decision brief로 유효하다. 선택지는 변경되지 않았다. 혼란은 memory DB 재검토 뒤 “A는 불가”라는 종전 설명을 철회하면서 ID lifetime 판단을 새로운 선택지처럼 섞은 데서 생겼다.
- [문구 보정] A안의 “기존 id 생성 규칙을 안정적 `dlv_...`로 변경”에서 안정적은 현재 Phase 0에서는 동일 daemon process lifetime 안의 안정성을 뜻하며 restart-spanning 안정성을 뜻하지 않는다. B안도 `delivery_id` column을 추가할 뿐, 별도 ID 발급 규칙을 정해야 한다. “DB 교체 시 A는 공개 ID를 반드시 보존”은 맞지만, A안이 DB 교체를 불가능하게 하는 것은 아니며 data migration으로 보존할 수 있다. B안이 내부 PK 교체를 더 쉽게 만든다는 상대적 trade-off다.
- [현재 사실] production `id`는 delivery 전용 `dlv_...`가 아니라 모든 entity가 공유하는 sequential `daemon-N` 생성값이다. A안이면 이 값의 public format/발급 규칙을 바꿔야 하고, B안이면 기존 `id`를 유지하면서 `delivery_id`를 추가한다. 두 경우 모두 Phase 0에서는 restart replay를 약속하지 않는다.

### 2026-07-17 15:50 · A안의 ID 생성 규칙 표현 정정

- [표현 정정] “A: 현재 id 생성 규칙을 public deliveryId로 쓸 수 있는 규칙으로 변경”은 A안을 별도 선택지처럼 보이게 한 부정확한 표현이다. A안의 본질은 `message_deliveries.id`라는 동일한 값/column을 내부 PK와 public deliveryId로 함께 쓰는 것이다. 현재 `daemon-N` 값의 format을 그대로 공개할지, delivery 전용 `dlv_...` 형식으로 바꿀지는 A안 안에서의 구현 세부 결정이며, 반드시 변경해야 한다고 확정하지 않았다.
- [대비] B안은 동일 delivery에 두 ID 값을 실제로 저장한다는 구조 차이다. 따라서 A/B는 “같은 ID 하나를 공유할지” 대 “내부·외부 ID 두 개를 분리할지”라는 기존 선택지 그대로다. ID 문자열 format 결정은 이 선택과 직교하는 후속 세부 사항이다.

### 2026-07-17 15:51 · daemon instance 충돌의 현재 영향과 필요한 계약 결정

- [사실] message-lifecycle spec은 `deliveryId`를 target별 opaque id이며 retransmission에서 유지되고 reply correlation/idempotency 기준이라고 규정하지만, 생성 namespace·uniqueness scope와 daemon 간 collision 처리는 G1 schema freeze에서 명시할 open issue로 남긴다. 현재 production은 한 process의 shared monotonic `createSequentialId()`로 모든 entity ID를 `daemon-N` 형식으로 만들며, process 안에서는 같은 값이 중복되지 않는다.
- [판정] restart 때문에 즉시 바꿔야 할 코드는 없다. Phase 0 contract를 “deliveryId는 issuing daemon instance/process lifetime에서 unique하고, daemon stop 뒤 기존 delivery state/ID를 replay·재참조하지 않는다”로 명시하면 현재 roadmap과 정합한다. 같은 daemon 안의 retry는 같은 저장 row/deliveryId를 사용하므로 문제없다.
- [동시 instance 경계] 서로 다른 daemon process는 각각 `daemon-1`을 만들 수 있다. 그 둘의 deliveryId를 동일한 shared namespace에서 교차 조회·reply/ack 처리하는 기능을 지원하려면 instance prefix 또는 globally unique generator가 필요하지만, 현재 local Phase 0의 restart replay/daemon 간 federation은 그 contract로 약속되지 않았다. G1-A에서 사용자 결정으로 현재 scope를 instance-local로 둘지 명시한다. durable replay/federation으로 확장할 Phase 2/3는 stable daemon identity 및 collision 처리의 후속 owner다.
- [선택지 영향] 위 namespace 결정은 A/B 중 하나를 정하지 않는다. A면 `id`가 instance-local public ID가 되고, B면 `delivery_id`가 instance-local public ID가 된다. `daemon-N`을 공개 형식으로 유지할지 delivery-only `dlv_...`로 바꿀지는 A/B와 별도의 format 결정이며, 현 범위에서 필수 변경이라고 확정하지 않았다.

### 2026-07-17 15:55 · daemon 종료와 MCP 수명에 대한 사용자 기억 재검토

- [사실] daemon 종료 경로는 socket을 닫고 `api.stop()`으로 connected agent를 disconnected로 표시한 뒤 in-memory DB를 닫는다. production `createDaemonServer`는 default noop supervisor를 사용하며, `state.stop()`은 Codex runtime map/token을 제거하지만 Codex/Claude child process나 MCP server를 kill하는 호출은 하지 않는다. Codex app-server child dispose helper는 존재하나 production daemon stop path에 연결된 근거는 찾지 못했다.
- [판정] 사용자의 핵심 결론(daemon 종료 뒤 과거 deliveryId와 새 daemon의 같은 문자열이 실제로 충돌하는 흐름이 현재 없다)은 roadmap의 no-replay + socket/DB close와 같은 방향이다. 다만 근거는 “모든 MCP가 확실히 함께 종료”가 아니라, old daemon의 socket/DB/agent registration이 사라져 남아 있는 client가 old delivery를 daemon에 reply/ack/조회할 경로가 없다는 것이다. client process가 과거 값을 화면/문맥에 보유할 가능성은 별도이며, durable replay를 구현하지 않는 한 새 daemon이 그것을 기존 delivery로 해석하지 않는다.
- [영향] 이 사실은 current Phase 0 deliveryId namespace를 issuing daemon instance/process-lifetime로 두는 판단을 지지하지만, agent/MCP child lifecycle cleanup의 별도 robustness gap을 해소한 것은 아니다. A/B 선택을 바꾸지 않는다.

### 2026-07-17 15:58 · incremental ID 재사용 판단 철회와 Phase 2 관계 정리

- [철회 범위 정리] 철회할 것은 “in-memory DB와 daemon 재시작으로 incremental id가 재사용될 수 있으므로 현재 A안은 불가하고 B안이 필요하다”는 판단이다. 철회하지 않는 사실은 production `createSequentialId()`가 process 시작마다 `daemon-1`부터 재개하므로 문자열 값 자체는 재사용될 수 있다는 점이다.
- [Phase 2 관계] Phase 2 durable replay는 위 철회와 동일한 사실을 말하는 것이 아니라 보완 근거다. roadmap이 현재 Phase 0에는 restart replay를 약속하지 않고 durable persistence/replay를 Phase 2로 둔다 → 현재의 문자열 재사용은 Phase 0 blocker가 아니다. 반대로 Phase 2에서 restart replay를 실제 지원할 때는 stable daemon identity·reply idempotency와 restart-spanning ID uniqueness를 반드시 설계해야 한다 → 그때는 같은 사실이 실제 해결 과제가 된다.
- [결론] 현재 A/B 선택지는 유지하며 둘 다 가능하다. B안은 column만 추가하는 방식이라 incremental generator 재사용 문제를 스스로 해결하지 않는다. Phase 2는 A/B를 취소하는 것이 아니라, 선택된 public deliveryId의 persistent lifetime/replay 정책을 뒤에 추가하는 작업이다.

### 2026-07-17 15:59 · deliveryId A/B 선택지로 논의 범위 재확정

- [현재 decision framing] deliveryId 의제는 A/B 두 저장·공개 구조 중 하나를 사용자와 선택하는 것으로 확정한다. A: `message_deliveries.id`를 내부 PK와 public deliveryId로 함께 사용. B: 내부 `id`와 별도 `delivery_id`를 둔다. memory DB restart/incremental ID 재사용은 A/B 선택을 강제하는 Phase 0 blocker가 아니다. 아직 사용자가 어느 안도 승인하지 않았다.

### 2026-07-17 15:59 · deliveryId A/B 관찰 가능한 trade-off 정리

- [trade-off 정리] A의 이점은 one source of truth다. public deliveryId와 stored row를 1:1 mapping 없이 바로 조회·상태갱신할 수 있어 mapping mismatch/backfill/추가 unique invariant가 없다. 비용은 storage PK가 public contract가 되어, 향후 DB migration·partition·internal rekey 때 그 값을 보존해야 하고 ID generator/format/immutability가 public contract 수준의 요구를 함께 받아야 한다.
- [trade-off 정리] B의 이점은 public contract와 storage PK의 독립성이다. future DB replacement/rekey/shard에서 public delivery_id를 유지한 채 내부 id를 바꿀 수 있다. 비용은 두 값의 1:1, non-null, immutable, public-unique invariant와 public-id index/lookup을 유지해야 하며, migration/backfill이나 bug에서 잘못된 mapping·누락이 생길 실패 표면이 하나 늘어난다. user/agent flow는 동일하다.
- [현재 범위 적용] Phase 0 in-memory process-lifetime에서는 A의 직접성 이점이 즉시 발생하고 B의 future flexibility는 아직 사용하지 않는다. Phase 2 durable replay가 B를 자동으로 요구하지는 않는다. A도 public PK value를 migration에서 보존하면 durable store로 전환 가능하다. 선택 기준은 “향후 storage identity를 public contract와 독립시켜야 할 구체적 이유가 지금 있는가” 대 “현재 one-ID invariant를 선호하는가”다.

### 2026-07-17 16:02 · roadmap을 반영한 deliveryId 설계 관행과 제안

- [설계 관행] public ID와 DB PK를 분리하는 B, 그리고 opaque public ID 자체를 DB PK로 사용하는 A는 모두 일반적인 설계 패턴이다. 전자는 numeric/private/rekeyable internal PK가 필요할 때, 후자는 UUID/ULID 같은 immutable opaque ID를 domain entity의 primary identity로 둘 때 적합하다. 어느 하나가 보편적으로 표준인 것은 아니다.
- [roadmap 적용 제안] 현재 store의 PK가 이미 text이고 Phase 0은 local single-daemon이며 Phase 2 durable replay도 같은 delivery identity를 보존하면 되는 구조이므로, 구체적 내부 rekey/sharding 요구가 없는 한 A를 제안한다. 단 A의 current `daemon-N`을 public format으로 확정한다는 뜻은 아니다. G1 cutover에서 delivery 전용 opaque `dlv_<random/ordered-id>` 값을 `message_deliveries.id`로 생성하고, 이 하나를 protocol `deliveryId`로 사용한다. 이는 Phase 2 durable DB로 이전할 때도 해당 PK 값을 보존하면 되며, durable store/replay 자체를 앞당기지 않는다.
- [B 선택 조건] 가까운 계획에 storage engine 교체 시 internal PK 재발급, shard-local row ID, numeric DB key 유지, public ID 보안/rotation 정책을 별도 운영해야 하는 구체적 요구가 있으면 B가 타당하다. 현재 roadmap/코드에서 그런 요구는 확인되지 않았으므로, B의 mapping invariant 비용을 지금 지불할 근거는 약하다. 이는 사용자 승인 전 제안이며 결정이 아니다.

### 2026-07-17 16:03 · DB 엔진 용어 설명

- [용어 설명] 여기서 DB 엔진은 MySQL, PostgreSQL, SQLite처럼 데이터를 저장·조회하는 DB 소프트웨어를 뜻한다. 현재 production daemon은 `better-sqlite3`로 SQLite를 사용하며 `:memory:` DB를 연다. “DB 엔진 교체”는 예를 들어 SQLite에서 PostgreSQL로 바꾸는 유형의 저장소 교체를 의미하며, 현재 roadmap의 Phase 2 durable store는 우선 SQLite file-backed 전환일 수 있고 엔진 교체 자체를 확정하지 않는다.

### 2026-07-17 16:05 · SQLite zero-setup 사용자 의도와 deliveryId 제안의 정합

- [사용자 의도] 사용자는 frontend/mobile 개발자와 designer 등 별도 DB server를 설치·운영하지 않는 로컬 사용자까지 포함하는 zero-setup local runtime을 위해 SQLite를 선택했다.
- [판정] 이 의도는 current local daemon/SQLite 선택 및 roadmap의 durable store를 Phase 2로 두는 방향과 정합한다. Phase 2의 natural next step은 SQLite를 PostgreSQL/MySQL로 교체하는 것이 아니라, 현재 SQLite `:memory:` 연결을 profile별 file-backed SQLite path로 전환하고 restart recovery/mailbox replay를 추가하는 것이다. PostgreSQL/MySQL 설치·운영을 요구하는 것은 현재 사용자 목표와 맞지 않는 scope expansion이다.
- [deliveryId 관계] A/B는 SQLite 선택과 독립된 ID mapping 결정이다. 제안한 A(opaque `dlv_...` text ID를 SQLite PK이자 public deliveryId로 사용)는 local SQLite와 잘 맞고, Phase 2에서도 같은 SQLite 파일에 해당 값을 보존하면 된다. B가 SQLite를 더 잘 쓰게 만드는 것은 아니다. 이 제안은 DB engine 변경을 전제하지 않는다.

### 2026-07-17 16:08 · deliveryId 기본키 공개 사용 A안 사용자 결정 및 owner 반영

- [사용자 결정] 사용자는 deliveryId A안을 승인했다. v1 local reference runtime에서 `message_deliveries.id`의 immutable 값이 protocol `deliveryId`이며, 별도 public `delivery_id` column은 추가하지 않는다.
- [owner 반영] external contract owner `docs/specs/aiox-message-lifecycle.md` §4.1에 committed target binding과 Phase 0 process-lifetime/Phase 2 re-evaluation boundary를 반영했다. 기존 envelope/correlation decision이 이 항목을 의도적으로 미결로 둔 과거 snapshot이므로 수정하지 않고, 새 rationale owner `docs/decisions/public-delivery-id-is-delivery-primary-key.md`를 만들었다. plan은 audit 완료·Contract decision closure 활성으로 전이했다.
- [남은 범위] 이 결정은 public ID와 stored PK의 mapping만 닫는다. G1-A의 typed send/reply authoring boundary와 explicit ack surface 결정, ID generator의 구체 format/검증, schema·tool·fixture 구현은 아직 남아 있다. W2는 남은 결정을 반영한 execution checklist와 handoff map을 정리하는 활성 작업으로 유지한다.

### 2026-07-17 16:09 · 다음 typed send/reply authoring 경계 의제 시작

- [다음 의제] deliveryId A안 결정 뒤 다음 G1-A contract decision은 typed `send`/`reply` authoring·validation boundary다. 현재 Codex tools는 `content`와 reply의 `parent_message_id`만 받고 본문 `Intent:` label을 파싱한다. 목표 명세는 send의 `intent`, `replyExpected`, `content`와 reply의 `inReplyToDeliveryId`, `intent`, `replyExpected`, `content` typed input이다.
- [설명 순서] 먼저 agent가 직접 작성할 필드와 daemon이 발급·고정할 필드를 구분한다. 이어 send의 `type`을 caller가 `question | instruction`으로 명시할지, reply `type`을 daemon이 `reply`로 고정할지, reserved `status`/`notification`을 왜 거절하는지를 사용자 시나리오로 설명한다. 아직 이 의제의 어떤 선택도 승인하지 않았다.

### 2026-07-17 16:54 · fan-out, send request와 delivery envelope의 경계

- [사용자 이해 확인] 1:N 발송을 세 표면으로 분리해 이해했다: (1) caller가 여러 대상을 지정하는 send request, (2) 공유 `messageId`를 가진 logical message, (3) target별 canonical delivery envelope. 이 구분은 현재 W3의 typed tool authoring 논의에 영향을 주므로 기록한다.
- [사실] message-lifecycle §4.1은 canonical envelope의 `target.address`와 `deliveryId`를 각각 하나의 target별 delivery로 정의하고, §4.2는 fan-out을 `1 logical message = N target-specific deliveries`로 규정한다. 현재 v1은 fan-out aggregate terminal state를 두지 않고 target별 delivery를 authoritative하게 유지한다. group recipient visibility/shared group context는 open/deferred다.
- [판정] canonical envelope에 `deliveryIds` 또는 `target.addresses` 배열을 넣지 않는다. target별 ack, retry, idempotency, reply correlation이 각각 하나의 stable `deliveryId`를 기준으로 동작하기 때문이다. 배열을 수신 envelope에 넣으면 동일 상태를 인덱스/매핑과 partial aggregate로 다시 표현해야 하며, 수신자별 정보 최소화도 별도 규칙으로 보장해야 한다. 이는 "배열은 업계에서 불가능" 또는 "LLM이 필연적으로 혼동"한다는 주장이 아니라, 현재 v1의 독립 delivery lifecycle에 더 직접적인 모델이라는 판단이다.
- [경계] 여러 target을 받는 array-shaped send request와 target별 delivery 결과 목록은 유용한 future tool/API surface 후보지만, 현재 canonical envelope 계약이나 v1 public tool schema에 아직 승인된 field가 아니다. daemon은 그런 요청을 검증한 뒤 target별 envelope/delivery로 fan-out할 수 있다. 단체 채팅은 단순 fan-out request가 아니라 conversation id, membership/visibility snapshot, room-post reply policy가 필요한 별도 additive extension이며, 현 source-only correlated reply 계약을 자동으로 바꾸지 않는다.
- [다음] W3는 이 구분을 전제로 typed send/reply authoring·validation boundary를 결정한다. 특히 send가 "여러 target을 직접 받는 request"까지 이번 v1 surface에 포함할지와, reply가 원 delivery 하나를 `inReplyToDeliveryId`로 참조해 원 source로 향한다는 경계를 분리해 검토한다.

### 2026-07-17 16:55 · typed send/reply 논의를 위한 current boundary 확인

- [사실] 현재 Codex MCP 도구는 `aiox_send_message({content})`, `aiox_reply({parent_message_id, content})`만 받고, instruction의 free-form `Intent:` label을 따르게 한다. daemon은 ingress send의 `type`을 `question`, reply의 `type`을 `reply`로 hard-code하며 reply correlation은 `parentMessageId`에 연결한다. 이는 v1 typed/canonical contract가 아니라 pre-v1 compatibility surface다.
- [사실] message-lifecycle의 committed cutover target은 send에 `intent`, `replyExpected`, `content`, reply에 `inReplyToDeliveryId`, `intent`, `replyExpected`, `content`를 typed input으로 요구한다. agent-authored intent는 `delegation | discussion | clarification | result | conclusion`으로 좁고, `status | notification`은 authenticated daemon/adapter만 생성하며 agent/human 제출은 typed rejection 대상이다. `type` authoring은 아직 "send caller가 `question | instruction`, reply는 daemon이 `reply`로 고정"이라는 recommended-not-approved 상태다.
- [경계] source identity는 token/session binding에서 daemon이 결정하고, `messageId`, target별 `deliveryId`, canonical source/target address와 `createdAt`도 caller authoring field가 아니다. 현재 send의 multi-target request는 v1 승인 범위가 아니며 route-authorized fan-out이 target별 delivery를 만든다. `inReplyToDeliveryId`로 원 source에 보내는 reply 방향은 target이지만, 원 delivery obligation이 reverse route 없이 narrow reply right를 주는지 여부는 별도 open decision이다.
- [다음] typed authoring/validation 논의는 먼저 (a) send `type`의 explicit enum 대 intent/content inference, (b) reply `type` fixed 여부를 닫고, 이어 required/default 여부와 tool-schema versus daemon-authority validation 분담을 정한다. correlated reply authorization과 explicit ack surface는 이 결정을 혼합하지 않고 후속 W3 의제로 유지한다.

### 2026-07-17 16:57 · roadmap의 N-agent 확장 범위 확인

- [사실] roadmap Phase 2는 `ingress generalization`, `pair-to-N-agent route generalization`, `group recipient visibility / shared group context prerequisite design`을 명시한다. G1-A의 완료 조건은 typed send/reply input과 validation boundary이며, `targets[]` 같은 direct multi-target caller API를 요구하거나 그 schema를 정하지 않는다.
- [정정/범위] 따라서 "direct `targets[]` send request는 별도 future API decision"은 roadmap의 문구를 그대로 인용한 사실이 아니라, Phase 2의 N-agent route/group-context 전제가 먼저라는 범위에서 도출한 판단이다. Phase 0의 current canonical contract는 authenticated source의 active directed route를 검사하고 target별 delivery로 fan-out한다. 이번 typed-tool 결정을 N-agent sender-directed addressing까지 확장하지 않는다.

### 2026-07-17 17:00 · CLI directed route와 per-message target 구분

- [사실] 현재 CLI `pnpm connect <source> <target...>`는 daemon의 `connect({sourceName, targetNames})` API를 호출해 source→각 target directed route를 저장한다. 예를 들어 `pnpm connect claude-a codex-a codex-b`는 두 route를 만든다. `pnpm status`는 저장된 route를 보여 준다. named `pair`는 두 agent가 attach되면 양방향 route를 만들기 위한 reservation path다.
- [구분] 이것은 agent의 각 send tool call이 `targets[]`를 직접 지정하는 API가 아니다. 현재 send ingress는 caller의 authenticated source와 이미 저장된 outbound routes를 기준으로 target별 delivery를 fan-out한다. 따라서 route configuration은 control-plane setup, send/reply는 message-plane action이다.
- [주의] route는 방향성이 있다. `claude-a → codex-a`만 만들면 Claude의 일반 send가 Codex로 갈 수 있으나 Codex의 일반 send에는 별도 `codex-a → claude-a` route가 필요하다. v1 correlated reply를 reverse route 없이 original source로 허용할지 여부는 여전히 별도 open decision이다.

### 2026-07-17 17:05 · replyExpected=false의 reply 허용 경계

- [사용자 논점] `replyExpected: false` delivery에는 target agent가 correlated reply를 하지 않게 해야 하는지 제기했다. 이는 typed reply input과 reply-obligation lifecycle을 연결하는 W3 validation question이다.
- [사실] message-lifecycle은 `replyExpected: true`인 completed delivery만 `awaiting_reply` obligation을 만든다고 규정한다. 따라서 false는 최소한 sender가 reply completion을 기다리지 않는다는 뜻이다. 그러나 false delivery에 대한 correlated reply를 반드시 거부할지, 아니면 obligation 없이 허용할지는 현재 명세가 명시적으로 닫지 않았다.
- [검토 축] (A) false를 strict no-reply로 두어 tool instruction과 daemon validation에서 `reply_not_expected`로 거부할지, (B) no-obligation/advisory로 두어 sender가 기다리지는 않되 target의 자발적 result reply는 허용할지 결정해야 한다. 이 선택은 ack와 다르다. receipt/ack는 delivery 수용 상태이고 reply는 업무 결과·대화 행위다.

### 2026-07-17 17:08 · send 뒤 종료 정책과 false reply 금지의 구분 확인

- [확인된 결정] message-lifecycle §4.3의 committed send-boundary는 성공한 send/reply를 daemon이 source request를 accepted하고 target delivery 또는 rejection을 식별했다는 사건으로만 정의한다. agent instruction/tool description은 source에게 transport success로 target completion을 추론하거나 sleep/poll하지 말라고 요구한다. 보존된 2026-06-10 polling 원인 로그도 같은 turn에서 reply를 기다리며 sleep/poll한 동작을 정상 workflow가 아니라고 판정했다. 따라서 사용자 기억의 "agent가 보내면 그 turn은 끝낸다"는 정책은 확인된다.
- [범위 정정] 이 정책은 source turn의 비동기 종료 규칙이며, `replyExpected: false` delivery에 target이 correlated reply를 절대 만들 수 없다는 결정은 아니다. false는 현재 최소한 reply obligation을 만들지 않는다는 뜻이다.
- [사용자 방향 및 미보장] 사용자는 false delivery의 업무 예외는 agent 설정 오류로 보고 target agent가 자신의 human user에게 자동 보고할 것으로 예상한다. 이는 제품/agent behavior로는 가능한 방향이나, current AIOX contract가 daemon 또는 target agent의 user-facing 자동 보고를 보장한다는 근거는 찾지 못했다. strict no-reply를 택하려면 그러한 human-report를 transport failure/reply-obligation의 대체 보장으로 주장하지 않고, agent instruction/configuration 책임으로 분리해야 한다.
- [다음 결정] false를 strict no-reply로 확정할지 여부는 사용자의 위 방향을 바탕으로 W3 typed validation에서 명시 승인받아 닫는다. 채택 시 daemon은 false origin에 대한 correlated reply를 typed rejection하고, tool instruction은 target에게 user-facing exception 처리 경로를 따르도록 안내하는 후보가 된다.

### 2026-07-17 17:10 · send-boundary와 replyExpected 축 분리 정정

- [사용자 정정 수용] 이전 기록의 "`replyExpected: false`는 sender가 reply completion을 기다리지 않는다"는 설명은 send-boundary와 reply-obligation을 혼합했다. send와 reply tool call은 `replyExpected` 값과 무관하게 daemon acceptance/rejection을 받은 뒤 현재 turn을 끝내며, target receipt·업무 완료·상대 reply를 동기적으로 기다리지 않는다.
- [현재 유효한 분리] `replyExpected`는 현재 turn blocking 여부가 아니라, original delivery가 이후 target의 correlated reply를 기대/관리하는 reply-obligation을 만들지 여부를 나타내는 별도 lifecycle 축이다. `true`여도 source는 polling하지 않고 후속 inbound reply 또는 obligation state transition으로만 관측한다. `false`의 정확한 contract는 "reply obligation 없음"이며, target reply를 금지할지/허용할지는 이 축 위에서 별도로 결정해야 한다.
- [표현 정정] 이후 typed tool 설명에서는 `replyExpected`를 "답장을 지금 기다릴지"로 설명하지 않는다. 대신 "이 delivery가 완료된 뒤에도 target의 업무 응답을 AIOX 상에서 기대하고 추적할 것인가"로 설명한다.

### 2026-07-17 17:13 · reply obligation의 필요성 재검토

- [사실] current message-lifecycle는 `replyExpected: true` delivery의 `awaiting_reply → fulfilled` obligation, persistence record와 source-visible pending/resumption을 committed target으로 둔다. roadmap G1-C도 reply obligation을 delivery reliability 통과 조건에 포함한다. current implementation에는 이 state/persistence/resumption path가 없으며 architecture는 이를 G1 gap으로 분류한다.
- [구분] inbox는 수신 message/delivery를 보관·표시·읽음 처리하는 표면이고, reply obligation은 sender-side에서 특정 delivery의 후속 업무 reply를 pending/fulfilled/cancelled/expired로 추적하는 lifecycle state다. inbox 구현만으로 obligation이 자동으로 필요해지지는 않으며, `inReplyToDeliveryId`를 thread/correlation link로 보존하는 것과 obligation FSM도 별개의 선택이다.
- [사용자 재검토] 사용자는 source agent가 send 뒤 끝나는 async policy와 미래 inbox 필요성만으로 obligation FSM을 도입하는 것은 불필요할 수 있다고 제기했다. 이 방향을 채택하면 `replyExpected`/obligation을 Phase 0에서 제거하거나, field를 유지하지 않고 correlated reply를 independent inbound message로만 다루는 대안이 있다. 이는 current committed target과 G1-C completion wording을 바꾸는 material contract decision이므로 사용자 승인 전에는 반영하지 않는다.

### 2026-07-17 17:17 · late reply correlation과 reply obligation의 분리

- [사용자 시나리오] A가 B에게 요청을 보낸 뒤 다른 agent/user와 작업을 계속하고, 한참 뒤 B가 답장했을 때 A와 daemon이 어느 요청의 답장인지 식별할 수 있어야 한다는 요구가 제기됐다.
- [판정] 이 요구는 reply obligation FSM이 아니라 reply correlation의 핵심 책임이다. original delivery의 target-specific `deliveryId`를 reply의 `inReplyToDeliveryId`로 제출하면, daemon은 B가 그 delivery의 original target인지 확인하고 original source A에 새 inbound reply를 전달할 수 있다. A는 새 turn/message에서 해당 id를 통해 원 요청과 연결한다. fan-out에서는 shared `messageId`만으로 특정 target delivery를 구분할 수 없으므로 `inReplyToDeliveryId`를 유지한다.
- [경계] A가 reply를 동기적으로 기다리거나 daemon이 `awaiting_reply` state를 저장할 필요는 없다. link-only reply는 late reply의 provenance/correlation은 보존하되 pending, timeout, fulfilled, expiry, source-turn resumption 약속을 만들지 않는다. 나중 inbox/history UI는 이 correlation link로 원 요청과 답장을 묶어 보여 줄 수 있지만, 그것이 obligation 도입 조건은 아니다.
- [남은 open] daemon이 original delivery를 근거로 B→A의 좁은 reply route를 허용할지, 현재처럼 reverse directed route를 요구할지는 correlated reply authorization의 별도 W3 decision이다. 이는 link-only model에서도 필요하다.

### 2026-07-17 17:22 · replyExpected를 reply permission으로 쓰는 후보

- [사용자 제안] free-form instruction으로 의미 없는 reply를 억제하기보다, original delivery의 `replyExpected: false`이면 correlated reply 자체를 허용하지 않고 daemon이 typed rejection을 반환하는 구조적 정책을 검토한다. target agent는 rejection을 받은 뒤 필요하면 자신의 human user에게 설명할 수 있으나, daemon이 human-report를 자동 보장하는 것은 별도 product surface가 없으면 주장하지 않는다.
- [판정] daemon은 reply 본문의 의미가 "의미 없는 대화"인지 신뢰성 있게 판별할 수 없다. 대신 `inReplyToDeliveryId`가 가리키는 original delivery의 boolean과 authenticated replying identity를 검사해 `reply_not_expected`로 무조건 거절해야 한다. 이는 text instruction보다 강한 protocol guard다.
- [후보 모델] obligation FSM은 제거하되 `replyExpected`는 "이 delivery가 correlated reply를 허용/요청하는가"라는 authorization/turn-continuation field로 남긴다. `true` delivery에는 target의 substantive correlated reply 하나를 허용하고, 그 reply의 own `replyExpected`가 다음 turn 허용 여부를 결정한다. `false` delivery는 chain terminal이다. `true` reply가 이미 소비됐는지의 최소 1:1 mapping/unique guard는 중복 reply를 막기 위해 필요하지만, awaiting/pending/timeout/expiry state는 만들지 않는다.
- [미결] true delivery당 exactly one correlated reply를 강제할지, progress/result처럼 여러 substantive reply를 허용할지 결정해야 한다. 사용자 목표인 대화 루프 억제에는 one-reply guard와 reply message의 `replyExpected` continuation flag가 더 정합한다.

### 2026-07-17 17:29 · typed send/reply와 reply permission의 owner 반영 후보

- [사용자 방향] 현재 Phase 0에는 reply-obligation FSM(`awaiting_reply`, fulfilled/cancelled/expired, pending/timeout/expiry 및 source wait/resumption)을 두지 않는 방향으로 논의했다. 대신 `replyExpected`를 waiting flag가 아니라 delivery별 correlated reply permission/turn-continuation flag로 유지하는 후보다: false delivery에는 reply를 허용하지 않고 `reply_not_expected`로 거절하며, true delivery에는 authenticated original target의 substantive correlated reply 하나를 허용한다. 그 reply의 own flag가 다음 turn 허용 여부를 정한다.
- [typed surface 후보] send는 caller-authored `type: question | instruction`, `intent`, `replyExpected`, `content`; reply는 `inReplyToDeliveryId`, `intent`, `replyExpected`, `content`을 받고 daemon이 `type: reply`를 고정한다. source identity, target routing/fan-out, message/delivery IDs, timestamp는 daemon authority다. reply permission check는 natural-language "의미 없음" 판별이 아니라 original delivery boolean, correlation id, authenticated identity와 one-reply guard로 수행한다.
- [유지되는 사용자 흐름] send/reply tool call은 flag와 무관하게 daemon acceptance/rejection 뒤 현재 turn을 끝낸다. true의 late reply는 `inReplyToDeliveryId`로 원 request를 식별해 A에 새 inbound message로 전달하며, sender-side pending state를 만들지 않는다. false에 대해 reply를 시도한 target은 typed error를 받고, 필요 시 자신의 human user에게 일반 대화로 설명할 수 있으나 daemon이 human-report를 보장하지 않는다.
- [owner impact 후보 — 아직 미반영] 승인·W3 closure 뒤 external contract owner `docs/specs/aiox-message-lifecycle.md`에서 `replyExpected` 정의, §4.3 reply-obligation/persistence/send-boundary 문장과 reply validation/error model을 바꾸고, rationale owner `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`를 갱신해야 한다. roadmap `docs/product/roadmap.md` G1-C의 reply-obligation 통과 조건과 architecture `docs/architecture/local-runtime-gaps-and-targets.md`의 pending/resumption gap도 새 link-only/one-reply guard 모델에 맞춰 disposition한다. MCP tool schema/instruction, daemon validation, fixtures/tests는 G1-A W2/G1-B implementation handoff로 연결한다.
- [미결 유지] 이번 기록은 owner 문서를 바꾸거나 모든 W3 결정을 닫지 않는다. send `type`의 explicit authoring 승인, true delivery의 one-reply semantics 승인, original delivery가 reverse directed route 없이 narrow reply right를 주는지 여부, explicit ack surface는 계속 open이다.

### 2026-07-17 19:15 · typed send/reply type boundary agreed

[2026-07-17] W3 typed send/reply type 경계 합의: agent-authored send는 type question|instruction을 명시하고, daemon은 reply delivery의 type을 항상 reply로 고정한다. reply는 최종 답변이 아니라 특정 원 delivery에 인과적으로 연결된 응답이라는 분류이며, 의미는 intent(result|clarification|conclusion 등)가 나타낸다. 따라서 clarification을 주고받는 티키타카는 reply 체인으로 허용한다. 기존 요청의 답과 새 독립 작업 요청이 함께 있으면 reply/result와 send/question|instruction으로 분리한다. 하나의 reply는 inReplyToDeliveryId 하나만 가리킨다. 미결: replyExpected:true일 때 허용할 reply 횟수, original delivery가 주는 narrow reply right와 reverse directed route의 관계, explicit ack.

### 2026-07-17 19:21 · replyExpected true one reply per delivery agreed

[2026-07-17] W3 replyExpected:true reply-count 경계 합의: replyExpected는 대기 상태가 아니라 후속 correlated reply 허용 여부다. replyExpected:true인 원 delivery마다 원래 target이 보낼 수 있는 유효한 correlated reply는 정확히 1개다. fan-out send가 N개의 target-specific delivery를 만들면, true인 각 delivery에 대해 각 target의 reply 1개씩은 가능하다(한 logical message 전체에 하나가 아님). 후속 논의가 필요하면 B의 유일한 reply를 intent:clarification 등으로 보내고 replyExpected:true로 다음 턴을 연다. A는 그 B delivery에 대한 하나의 reply로 필요한 해소·검색 결과를 보낸 뒤 false로 닫거나, 필요하면 다시 true로 다음 한 턴을 연다. 장기 진행 업데이트·여러 답변은 같은 inReplyToDeliveryId에 누적하지 않으며 별도 send 또는 명시적으로 연 새 턴을 사용한다. daemon은 동일 원 delivery를 가리키는 두 번째 유효 reply를 거절해야 한다.

### 2026-07-17 19:35 · pair CLI lifecycle redesign deferred to Phase 2

[2026-07-17] W3 후속 roadmap 분류: pair CLI의 장기 UX(현재 reservation+각 agent attach 흐름을 유지할지, pair가 여러 agent 실행·attach까지 orchestration할지)는 G1-A typed send/reply contract에 포함하지 않는다. roadmap 확인 결과 Phase 2가 pair-to-N-agent route generalization, group recipient/shared context prerequisite, compose/config/onboarding split을 소유한다. 따라서 topology·pair identity·agent lifecycle을 바꿀 수 있는 pair command 재설계는 Phase 2에서 함께 재논의한다. 단, 현재 pair semantics를 바꾸지 않는 단순 wrapper/one-command demo의 adoption friction만 다루는 작은 개선은 Phase 1 또는 G2 후속 후보로 분리 가능하나, 현 논의는 lifecycle/관계 모델까지 열어 Phase 2로 둔다.

### 2026-07-17 19:37 · Phase 2 pair CLI owner updates added to W3 handoff

[2026-07-17] W3 owner-impact 후보 보완(19:29 entry의 후속): W3 contract owner 반영과 별개로, Phase 2 재논의 항목을 해당 owner에도 추가한다. `docs/product/roadmap.md` Phase 2의 pair-to-N-agent route generalization / compose-config-onboarding split 아래에 “pair CLI가 reservation만 만들지, agent launch·attach orchestration까지 맡을지 및 그 실패·재시작 lifecycle” 재논의를 기록한다. `docs/decisions/pair-slot-generalization.md` Re-evaluation에 같은 pair CLI lifecycle/UX와 N-agent topology 결합을 추가한다. 이는 현 Phase 0 CLI를 바꾸거나 G1-A의 typed send/reply implementation 범위를 넓히지 않는다. W3 closure 뒤 owner-doc 변경 묶음에 포함한다.

### 2026-07-17 19:46 · acceptance ack and common typed error direction agreed

[2026-07-17] W3 acceptance ack 및 error 경계 합의: typed send/reply의 source-visible 성공은 daemon acceptance다. daemon이 typed validation, authenticated source, route/correlation 권한을 확인하고 canonical delivery를 생성·저장하면 즉시 성공을 반환한다. send 성공값은 messageId와 fan-out으로 생성된 deliveryId/target 목록, reply 성공값은 새 messageId와 deliveryId/target 및 inReplyToDeliveryId를 포함한다. 이 성공값은 target read/runtime acceptance/work completion/reply를 뜻하지 않는다. delivery ack/retry는 G1-C reliability 축이다. 실패는 공통 typed error envelope로 수렴시키며 stable code와 human-readable redacted message를 제공한다. 확인 결과 lifecycle §4.4는 이미 stable code+message 원칙 및 baseline codes를 정했지만, 현재 daemon API는 endpoint별 ok:false+reason union이고 Codex MCP는 isError text를 반환한다. `reply_not_expected`는 current baseline 목록에 없으므로 reply-permission 결정 반영 시 추가해야 한다. W3 closure 뒤 lifecycle spec, decision rationale, roadmap G1-C, architecture gap 및 MCP/daemon schema·tests owner 변경 묶음에 포함한다.

### 2026-07-17 19:48 · separate error catalog proposed and W3 remaining sequence recorded

[2026-07-17] W3 error catalog 후속 방향: stable error code를 lifecycle §4.4 안의 나열에만 두지 않고, daemon/API/MCP/CLI가 공유하는 별도 error catalog owner로 모으는 방향을 검토한다. catalog는 code, 발생 경계, stable meaning, human-readable/redaction 규칙, retryability 또는 caller action을 소유하고, lifecycle은 message/delivery/reply 관련 code의 사용 규칙만 참조한다. 새 owner 문서 생성·정확한 schema는 W3 owner-doc 반영 시 document-structure review로 기존 spec taxonomy와 함께 확정한다. W3의 남은 논의 순서는 (1) original delivery 기반 narrow correlated-reply authorization을 명시 결론으로 기록, (2) typed send/reply validation/error catalog의 최소 code·response envelope 경계 확정, (3) 결정 audit 후 owner 문서 반영·W2 handoff다.

### 2026-07-17 19:52 · correlated reply authorization agreed and structured contract snapshot

[2026-07-17] W3 correlated reply authorization 확정 및 contract structure snapshot

### 2026-07-17 19:54 · lifecycle spec versus W3 structure snapshot drift recorded

[2026-07-17] W3 structure snapshot 대 lifecycle spec 대조: send/reply canonical envelope의 protocol/messageId/deliveryId/source/단일 target/type/intent/content/createdAt 및 reply envelope의 inReplyToDeliveryId 위치는 현재 lifecycle §4.1과 구조적으로 일치한다. 다만 owner 반영 전 material drift가 세 가지 있다. (1) §4.1은 typed send의 type caller-authoring을 recommended-not-approved로 두고 최소 input에는 type을 넣지 않지만, W3는 send type question|instruction explicit과 reply type daemon-fixed reply를 합의했다. (2) §4.1/§4.3은 replyExpected를 reply-obligation 생성 및 awaiting_reply FSM으로 정의하지만, W3는 permission/one-reply turn-continuation으로 재정의하고 obligation FSM을 제거한다. §4.2의 duplicate_terminal_reply는 obligation 종료가 아닌 one-reply guard로 바꿔야 한다. (3) W3 acceptance/rejection JSON은 canonical envelope가 아니라 typed tool/API response contract이며, current lifecycle은 exact shape를 소유하지 않고 reply_not_expected도 baseline error 목록에 없다. 별도 error catalog owner와 lifecycle 참조를 함께 반영해야 한다.

### 2026-07-17 20:07 · separate error catalog declined for current scope

[2026-07-17] W3 error catalog 재판정: 별도 machine-readable error registry/catalog 파일은 현재 만들지 않는다. 현재 stable error 수와 소비 경로에서는 lifecycle §4.4의 code+redacted message 계약을 owner로 유지하고, daemon API/MCP/CLI는 이 code를 각 transport 표면에 매핑한다. 별도 JSON/TypeScript registry를 도입하면 source-of-truth가 늘고 lifecycle spec과 중복될 위험이 현재 이점보다 크다. `reply_not_expected` 등 이번 W3 code는 lifecycle baseline error model에 추가한다. cross-surface error metadata(재시도 정책, caller action, generated docs)가 실제로 반복되어 lifecycle에 과부하가 생길 때 별도 registry를 재평가한다. 이전 19:48의 separate error catalog 제안은 superseded한다.

### 2026-07-17 20:10 · reply chain and daemon-owned reply identifiers confirmed

[2026-07-17] W3 reply chain 및 daemon-owned reply fields 확인: direct A→B route가 최초 send를 시작하고, 원 delivery 및 이후 각 reply delivery의 replyExpected:true가 다음 1회의 correlated reply를 연다. 따라서 A/B는 각 새 delivery의 flag를 true로 두는 한 reply chain을 이어갈 수 있고, false가 chain을 닫는다. 같은 inReplyToDeliveryId에 누적 reply를 보내지 않는다. reply caller는 inReplyToDeliveryId, intent, replyExpected, content만 authoring한다. daemon은 original delivery를 해석해 type=reply, canonical source=authenticated caller, target=original source, 새 logical messageId, 새 target-specific deliveryId, createdAt을 생성한다. reply messageId는 원 logical messageId를 재사용하지 않는다; 각 reply는 새 logical message이고 inReplyToDeliveryId가 인과 관계를 보존한다.

### 2026-07-17 20:21 · multimodal attachments deferred beyond Phase 0

[2026-07-17] Future extension 분류: 현재 v1 content는 text/plain 단일 본문으로 유지한다. text/image/video 혼합은 ordered content parts와 attachment lifecycle을 요구하므로 Phase 0 typed send/reply/envelope cutover에 넣지 않는다. 미래 multimodal model은 canonical envelope에는 part별 mediaType과 attachment reference/id·digest·size 같은 metadata만 두고, 실제 binary/file bytes는 별도 attachment transfer/storage plane(local daemon store, remote upload/download 또는 object/blob transfer)에서 다룬다. raw local file path를 canonical envelope에 넣지 않는다. remote 전송에는 bytes transfer 방식, 접근 capability, integrity/digest, size/streaming/resume, retention/cleanup, target adapter capability가 함께 결정돼야 하므로 Phase 2 local expansion 및 Phase 3 remote/federation 재평가 항목이다.

### 2026-07-17 20:23 · required fields without defaults agreed; W3 ready for external review

[2026-07-17] W3 required/default 경계 확정: agent-authored send는 type, intent, replyExpected, content를 모두 필수로 받고 기본값을 두지 않는다. agent-authored reply는 inReplyToDeliveryId, intent, replyExpected, content를 모두 필수로 받고 기본값을 두지 않는다. reply의 type은 input으로 받지 않으며 daemon이 reply로 고정한다. source/target/messageId/deliveryId/createdAt도 caller input이 아니라 daemon authority다. 이로써 W3의 설계 방향은 external review 전 후보 결론 세트가 되었으며, review 결과에 따라 수정될 수 있다. W3 Work Item은 owner 반영·review 전에는 완료 처리하지 않는다.

### 2026-07-17 20:38 · external review claims classified for evidence verification

[2026-07-17] External W3 review 후속 검증 계획: Claude review는 obligation→one-reply permission 변경의 owner drift, G1-B/G1-C roadmap 영향, one-reply guard 최소 persistence, typed validation/response owner, chain/route의 edge case를 지적했다. 이 중 decision/roadmap/spec의 인용은 owner 문서로 재확인 가능하고, current API/MCP response shape·intent/type validation·fan-out transaction/partial acceptance·reply-as-ack·delivery status gating은 src/tests로 검증 가능하다. 무한 reply chain, narrow right의 보안 적정성, stale right expiry, future inbox lookup은 구현 전 proposal의 state-machine/threat-model 검증 또는 product decision이지 현재 사실 검증이 아니다. 다음 external review는 각 claim을 verified / contradicted / not-yet-verifiable로 나누고 file+line/test evidence 또는 scenario proof를 요구한다. 구현·문서 수정은 하지 않는다.

### 2026-07-17 20:43 · duplicate_reply error code agreed

[2026-07-17] W3 duplicate correlated reply error code 확정: replyExpected:true 원 delivery에 이미 1개의 correlated reply가 accepted된 뒤 같은 inReplyToDeliveryId로 다시 reply하면 `duplicate_reply`로 거절한다. `duplicate_terminal_reply`는 obligation FSM의 terminal 의미를 전제해 reply chain 모델과 맞지 않으므로 재사용하지 않는다. `reply_not_expected`는 원 delivery의 replyExpected:false로 애초 reply 권한이 없는 경우에만 사용한다.

### 2026-07-17 20:46 · unbounded reply chains accepted for Phase 0

[2026-07-17] W3 reply chain length/expiry 정책 확정: A→B directed route로 시작된 chain은 A→B(true), B→A(true)를 반복해 제한 없이 이어질 수 있다. 이는 오류나 route authorization bypass가 아니라, 각 delivery의 authenticated one-reply right로 허용되는 지속 협업 성질이다. Phase 0에는 max turns, chain idle timeout, reply-right expiry 같은 별도 제한을 두지 않는다. 각 hop의 false가 명시적으로 chain을 닫고, delivery별 one-reply guard 및 일반 backpressure/reliability guard는 유지한다. 실제 비용·루프·운영 문제가 관찰될 때 Phase 1+에서 length/idle/rate policy를 별도 검토한다.

### 2026-07-17 20:50 · code review verified and remaining W3 decisions consolidated

[2026-07-17] Claude code-review 재확인 및 W3 decision checklist: 직접 재확인 결과 (a) docs/decisions/AGENTS.md는 기존 rationale 대체 시 새 decision을 요구하고, (b) current daemon API는 ok/reason union, Codex MCP는 message_id 중심 structured success와 text error를 반환하며 W3 acceptance shape는 신규 agent-facing surface이고, (c) send fan-out message/delivery/event 생성은 state.ts의 단일 transaction 안에서 수행되어 route-derived deliveries 생성·저장 기준 all-or-nothing이며 adapter/runtime 결과는 그 뒤 router에서 처리되고, (d) current schema/message repository에는 intent/replyExpected/inReplyTo/reply-right state가 없으며 ingress intent 검증도 현재 없음, type은 저장·DTO/diagnostic 외 routing/state branch 소비가 없다. 이미 확정: duplicate_reply, delivery 생성·저장 all-or-nothing acceptance, Phase 0 unbounded reply chain. 사용자 확인이 필요한 W3 항목: reply에서 허용할 5-intent 전체 대 제한 enum, v1 request content에 caller mediaType을 유지할지 daemon-fixed text/plain으로 얇게 할지, logical acceptance/rejection response shape의 lifecycle owner 및 adapter/MCP mapping, obligation 대체 persistence(replyExpected/right-consumed/correlation link와 ack/idempotency 보존), failed/deferred delivery reply의 permission/status reconciliation, type(question|instruction)를 routing effect 없는 storage/display classification으로 유지할지. 새 decision 문서는 obligation→permission rationale 및 narrow reply right rationale의 대체 계보를 보존하는 별도 owner 반영으로 처리한다.

### 2026-07-17 21:06 · all five agent intents allowed for reply

[2026-07-17] W3 reply intent enum 확정: reply request도 agent-authored intent 5종(delegation|discussion|clarification|result|conclusion)을 모두 허용한다. type=reply와 inReplyToDeliveryId가 기존 delivery에 대한 인과 관계를 구조적으로 제한하고, intent는 그 reply의 협업 의미를 나타낸다. daemon은 reply 본문 의미로 새 독립 작업 여부를 판별하거나 delegation intent를 금지하지 않는다. status|notification은 계속 daemon/adapter reserved intent이며 agent send/reply에서 거절한다.

### 2026-07-17 21:07 · daemon-fixed text plain content for v1 agreed

[2026-07-17] W3 v1 content authoring 확정: typed send/reply request의 content는 caller-authored text만 받으며 mediaType은 input field가 아니다. v1 daemon은 canonical envelope를 만들 때 content.mediaType을 text/plain으로 고정한다. 따라서 request content는 `{ text: string }`, canonical envelope content는 `{ mediaType: "text/plain", text: string }`이다. text/plain 이외 media type, ordered parts, attachment/binary plane은 Phase 0 범위 밖 future expansion으로 유지한다.

### 2026-07-17 21:08 · reply permission independent of delivery status agreed

[2026-07-17] W3 delivery status와 reply permission 경계 확정: original delivery의 queued/deferred/failed 상태는 correlated reply permission의 직접 조건이 아니다. original delivery 존재, authenticated caller=original target, replyExpected:true, reply right 미소비이면 reply를 수용한다. 수용된 reply는 target receipt/ack evidence가 될 수 있으며 G1-C reliability가 원 delivery 상태를 reconcile한다. 따라서 adapter ack/status 기록 지연이나 stale failure 관찰만으로 실제 수신 target의 valid reply를 거절하지 않는다. daemon restart로 original delivery가 사라진 경우만 unknown_delivery로 거절한다.

### 2026-07-17 21:11 · acceptance result colocated with lifecycle contract agreed

[2026-07-17] W3 acceptance result owner 확정: canonical envelope와 source-visible send/reply acceptance/rejection result는 모두 aiox-message-lifecycle owner에 둔다. 단 acceptance result는 envelope field가 아니라 별도 JSON contract다. logical success는 status=accepted와 messageId 및 send deliveries[] 또는 reply delivery/inReplyToDeliveryId를, logical rejection은 status=rejected와 stable error code/redacted message를 쓴다. daemon API는 이 logical result를 직접 반환하고, MCP/CLI는 각 transport의 outer wrapper(isError/content, text/exit code 등) 안에 같은 의미를 매핑한다.

### 2026-07-17 21:14 · idempotency key ownership opened by daemon-generated message IDs

[2026-07-17] W3 idempotency 경계 추가 발견: idempotency는 동일 기술적 send/reply request가 acceptance 응답 유실·timeout 뒤 재시도돼도 새 message/delivery/reply를 중복 생성하지 않고 기존 결과를 반환하는 성질이다. one-reply guard와 다르다: guard는 같은 original delivery에 대한 의미상 두 번째 reply를 거절하고, idempotency는 같은 reply operation의 재전송을 재수용한다. current pre-v1 state는 caller-generated messageId를 target별 idempotency key에 포함한다. W3는 daemon-generated messageId를 채택했으므로, source-scoped caller retry token/idempotencyKey를 typed request에 둘지 또는 adapter/tool transport가 생성·재사용할지 별도 결정이 필요하다. 이 결정 전에는 W3 request field table과 G1-C idempotency implementation handoff를 완료로 두지 않는다.

### 2026-07-17 21:17 · adapter-owned idempotency keys agreed

[2026-07-17] W3 idempotencyKey ownership 방향 확정: agent는 idempotencyKey를 생성·입력·재사용하지 않는다. agent-facing typed send/reply schema에는 해당 field를 두지 않는다. MCP/adapter transport가 tool invocation별 opaque idempotencyKey를 daemon 호출 전에 생성하고, 같은 invocation의 socket/transport 자동 재시도에는 같은 key를 재사용한다. daemon은 authenticated source scope와 key를 기준으로 기존 accepted result를 반환한다. agent가 이후 새 tool call을 명시적으로 시작하면 새 operation/new key로 본다. invocation process가 응답 유실 뒤 종료돼 같은 key를 복원할 수 없는 ambiguity/replay는 Phase 0 no-durable-replay 제한이며, durable recovery는 Phase 2 재검토 대상이다.

### 2026-07-17 21:22 · latest W3 direction and owner reflection audit

[2026-07-17] W3 final-direction audit (owner reflection 전): 최신 합의는 다음과 같다. (1) canonical envelope=target-specific delivery; fan-out=shared messageId+target별 deliveryId/target. (2) agent send required={type:question|instruction,intent(5종),replyExpected,content:{text}}; agent reply required={inReplyToDeliveryId,intent(동일 5종),replyExpected,content:{text}}; type은 reply input에 없고 daemon-fixed reply다. (3) daemon owns authenticated source, route/correlation-derived target, messageId, deliveryId, createdAt; envelope content.mediaType=text/plain. (4) replyExpected는 permission/turn-continuation이며 true delivery당 authenticated original target의 1 reply; false=reply_not_expected, second=duplicate_reply; status queued/deferred/failed 자체는 permission gate가 아니고 valid reply=ack evidence. (5) narrow reply right는 reverse route 불요, 새 send만 directed route 필요; chain은 true를 이어 제한 없이 지속 가능하고 false로 종료. (6) acceptance is all-or-nothing delivery creation/persistence, not remote receipt; lifecycle owns separate accepted/rejected logical result and adapters map it. (7) one-reply guard state, ack/idempotency를 process lifetime 보존; adapter owns invocation-scoped idempotencyKey, agent schema에는 없음. (8) v1 text-only; multimodal attachment, group/targets[], pair CLI lifecycle은 deferred. 기존 19:52 snapshot의 request mediaType 및 separate catalog 문구는 후속 20:07/21:07 결정으로 superseded되었으므로 owner 반영 시 최신 방향만 사용한다. Owner reflection: 새 decision 2개, lifecycle, roadmap, architecture, adapter model/runtime routing docs, Phase 2 pair owners, W2 implementation checklist/tests.

### 2026-07-17 21:28 · error registry scheduled for G1-B cutover

[2026-07-17] W3 error registry 방향 변경 및 일정 확정: 별도 error 관리 파일은 필요하다는 사용자 결정으로 20:07의 no-registry 판단을 supersede한다. W3는 public stable error meaning/code를 lifecycle에 고정한다. G1-B canonical envelope/typed tool cutover에서 daemon·MCP·CLI가 가져다 쓰는 typed registry source file을 만든다(정확한 JSON-vs-JSON-shaped-TypeScript representation은 implementation checklist에서 확정). G1-C는 ack/retry/idempotency/runtime failure 관련 reliability error와 mapping을 보강한다. roadmap/W2 handoff에 이 시점과 owner를 명시하고, lifecycle spec은 외부 error contract의 정본으로 유지한다.

### 2026-07-17 21:29 · adapter-owned automatic delivery ack agreed

[2026-07-17] W3 target delivery ack surface 확정: target agent의 MCP/adapter runtime이 delivery를 수신·수용한 뒤 daemon에 authenticated control-plane ack(deliveryId)를 자동 전송한다. agent/LLM에게 별도 ack tool 호출을 요구하지 않는다. daemon은 token/session binding에서 acknowledging target identity를 결정한다. ack 재전송은 deliveryId+acknowledging identity(및 필요한 evidence kind)의 동일성으로 멱등 처리해 기존 ack/state를 반환하며 별도 agent-facing idempotencyKey를 요구하지 않는다. send/reply의 adapter-owned invocation idempotencyKey와 ack의 deterministic deliveryId-based dedupe는 구분한다. adapter가 reliable receipt를 보장하지 못하는 Tier 3 경로는 G1-C에서 unconfirmed/degradation으로 surface한다.

## 확정 규칙

- 원 delivery의 `target`만 그 delivery의 `deliveryId`를 `inReplyToDeliveryId`로 사용해 정확히 한 번 correlated reply를 보낼 수 있다.
- daemon은 원 delivery 존재, authenticated caller=원 target, `replyExpected:true`, 아직 미사용을 검증한 뒤 target을 원 source로만 결정한다.
- 이 일회성 narrow reply right에는 별도 reverse directed route가 필요 없다. 새 독립 `send`에는 source→target directed route가 필요하다.
- `replyExpected`는 현재 turn의 대기 플래그가 아니라 다음 correlated reply의 허용 여부다. `true` delivery당 reply 1개이며, 그 reply의 own flag가 다음 한 턴을 연다.

```text
A -- send / true --> daemon -- delivery dlv_A_B --> B
B -- reply(inReplyToDeliveryId: dlv_A_B) --> daemon -- new reply delivery --> A
```

## 1. Agent가 daemon에 보내는 typed request

```json
{
  "type": "question",
  "intent": "delegation",
  "replyExpected": true,
  "content": {
    "mediaType": "text/plain",
    "text": "인증 경계를 검토해줘."
  }
}
```

Agent는 source, target, messageId, deliveryId, createdAt을 authoring하지 않는다. daemon이 authenticated source와 configured directed routes에서 결정한다.

## 2. Daemon이 fan-out해 전달하는 canonical envelope

```json
{
  "protocol": "aiox.message.v1",
  "messageId": "msg_01J_SHARED",
  "deliveryId": "dlv_01J_TO_CODEX_A",
  "source": {
    "kind": "agent",
    "address": "agent://local/release/claude-review"
  },
  "target": { "address": "agent://local/release/codex-a" },
  "type": "question",
  "intent": "delegation",
  "replyExpected": true,
  "content": { "mediaType": "text/plain", "text": "인증 경계를 검토해줘." },
  "createdAt": "2026-07-17T12:00:00.000Z"
}
```

fan-out의 B용 envelope는 같은 `messageId`/content에 고유한 `deliveryId`와 B의 `target.address`를 갖는다.

## 3. Agent가 daemon에 보내는 reply request

```json
{
  "inReplyToDeliveryId": "dlv_01J_TO_CODEX_A",
  "intent": "result",
  "replyExpected": false,
  "content": {
    "mediaType": "text/plain",
    "text": "API ingress가 인증 경계입니다."
  }
}
```

reply의 `type`은 caller field가 아니며 daemon이 `reply`로 고정한다.

## 4. Daemon이 A에 전달하는 reply envelope

```json
{
  "protocol": "aiox.message.v1",
  "messageId": "msg_01J_REPLY",
  "deliveryId": "dlv_01J_REPLY_TO_A",
  "source": { "kind": "agent", "address": "agent://local/release/codex-a" },
  "target": { "address": "agent://local/release/claude-review" },
  "type": "reply",
  "intent": "result",
  "replyExpected": false,
  "inReplyToDeliveryId": "dlv_01J_TO_CODEX_A",
  "content": {
    "mediaType": "text/plain",
    "text": "API ingress가 인증 경계입니다."
  },
  "createdAt": "2026-07-17T12:10:00.000Z"
}
```

## 5. Source-visible acceptance ack

send 성공은 daemon acceptance이며 target read/runtime acceptance/work completion/reply가 아니다.

```json
{
  "status": "accepted",
  "messageId": "msg_01J_SHARED",
  "deliveries": [
    {
      "deliveryId": "dlv_01J_TO_CODEX_A",
      "target": { "address": "agent://local/release/codex-a" }
    },
    {
      "deliveryId": "dlv_01J_TO_CODEX_B",
      "target": { "address": "agent://local/release/codex-b" }
    }
  ]
}
```

reply 성공은 새 delivery와 원 delivery의 correlation을 반환한다.

```json
{
  "status": "accepted",
  "messageId": "msg_01J_REPLY",
  "delivery": {
    "deliveryId": "dlv_01J_REPLY_TO_A",
    "target": { "address": "agent://local/release/claude-review" },
    "inReplyToDeliveryId": "dlv_01J_TO_CODEX_A"
  }
}
```

## 6. 공통 typed rejection 방향

```json
{
  "status": "rejected",
  "error": {
    "code": "reply_not_expected",
    "message": "The referenced delivery does not permit a correlated reply."
  }
}
```

stable error code, redacted human-readable message, 발생 경계와 caller action을 별도 error catalog owner로 모으는 방향이다. 현재 lifecycle baseline 목록에 없는 `reply_not_expected`는 owner 반영 때 추가한다.

## 2026-07-17 · 2026-07-17 · W3 owner reflection handoff

### 2026-07-17 · W3 owner reflection handoff

다음 세션의 첫 작업은 구현이 아니라 owner 문서 반영이다. W3는 owner 반영·검증 전까지 active로 유지한다. 이 block이 W3의 최신 handoff 정본이며, 19:52 structure snapshot 안의 caller mediaType 및 separate-error-catalog 문구는 후속 결정으로 superseded되었다.

#### 확정된 W3 contract 방향

- Canonical envelope는 target-specific delivery다. fan-out은 shared messageId와 target별 deliveryId/target.address로 N개 delivery를 만든다.
- Agent send 필수 input: type(question|instruction), intent(5종), replyExpected, content:{text}. Agent reply 필수 input: inReplyToDeliveryId, intent(동일 5종), replyExpected, content:{text}. 기본값 없음.
- Daemon owns authenticated source, route/correlation-derived target, messageId, deliveryId, createdAt; reply type은 daemon-fixed reply; canonical envelope content.mediaType은 text/plain이다.
- replyExpected는 wait/obligation FSM이 아니라 one-reply permission/turn-continuation이다. true delivery당 authenticated original target의 reply는 1회, false는 reply_not_expected, 두 번째는 duplicate_reply다.
- Correlated reply는 original delivery의 narrow reply right로 source-only routing한다. reverse route는 불요; 새 독립 send만 directed route가 필요하다. true chain은 Phase 0에서 length/expiry 제한 없이 이어지고 false로 닫는다.
- Permission은 queued/deferred/failed 상태 자체에 막히지 않는다. valid reply는 ack evidence가 될 수 있고 G1-C가 상태를 reconcile한다. daemon restart 뒤 original delivery 부재는 unknown_delivery다.
- Acceptance는 route-derived deliveries 생성·저장의 all-or-nothing 결과이며 remote receipt/work completion이 아니다. lifecycle은 accepted/rejected logical result를 envelope와 별도 contract로 소유하고 MCP/CLI는 outer transport wrapper로 mapping한다.
- Send/reply idempotencyKey는 agent-facing schema에 없다. adapter/MCP transport가 invocation별 opaque key를 생성하고 same-invocation retry에 재사용한다. ack는 deliveryId + authenticated target identity로 dedupe한다.
- Target delivery ack는 target adapter/runtime이 수신·수용 뒤 자동 control-plane ack(deliveryId)를 보낸다. LLM이 ack tool을 직접 호출하지 않는다. Tier 3 receipt 미보장은 G1-C unconfirmed/degradation으로 surface한다.
- Error registry source file은 필요하다: W3는 lifecycle의 public code/meaning을 고정하고, G1-B canonical cutover에서 daemon/MCP/CLI shared registry를 만든다. G1-C가 reliability errors를 보강한다.
- v1은 text only다. attachments/binary/parts, group/targets[], pair CLI lifecycle, durable replay는 deferred다.

#### owner 반영 순서와 write-set

1. 새 decision 2개를 먼저 작성한다: (a) reply-obligation FSM을 one-reply permission으로 대체한 rationale, (b) original delivery narrow reply right rationale. 기존 a2a-message-lifecycle-envelope-and-correlation decision은 history로 보존하고 supersede link만 추가한다.
2. docs/specs/aiox-message-lifecycle.md: §4.1 typed request/envelope/intent/content; §4.2 fan-out+narrow reply authorization+validation; §4.3 FSM 제거, reply-as-ack 보존, automatic target ack boundary, acceptance result; §4.4 reply_not_expected/duplicate_reply/error result; §4.5 reply-right consumed/correlation/idempotency persistence. Current caveats/open decisions도 최신 상태로 정렬한다.
3. docs/product/roadmap.md: G1-B precondition은 W3 authorization direction과 정렬; G1-C의 reply obligation wording을 one-reply guard+ack+retry/idempotency correlation으로 변경(명시적 gate-criterion change); G1-D forged reply/route bypass negative evidence와 narrow right 경계 연결; Phase 2 pair CLI lifecycle pointer 추가.
4. docs/architecture/local-runtime-gaps-and-targets.md 및 routing/delivery, Codex adapter/adapter-model owners: pending obligation/source-turn resumption gap을 link-only inbound correlation, automatic ack, adapter-owned idempotency, structured tool result gap으로 재정의한다. Current fact와 committed target을 섞지 않는다.
5. docs/specs/aiox-open-deferred.md: obsolete obligation timeout/pending questions을 정리하고 Phase 1+ chain operational policy, attachment/remote, durable replay re-evaluation pointer를 정합화한다. docs/decisions/pair-slot-generalization.md Re-evaluation과 roadmap Phase 2에도 pair CLI lifecycle을 남긴다.
6. W2 handoff: MCP schemas/instructions, daemon validation/storage migration, shared error registry in G1-B, automatic ack/retry/idempotency G1-C, positive/negative fixtures/tests로 분해한다.

#### 다음 세션 검증 checklist

- decision guidelines를 다시 읽고 새 decision의 WHY와 outcome owner를 분리한다.
- lifecycle 변경 전 roadmap G1-C criterion change 및 product/roadmap rules를 확인한다.
- docs/architecture and adapter owners의 current code evidence를 재검증한다; target contract를 current behavior로 덮지 않는다.
- test matrix: fan-out atomic acceptance; send/reply typed validation + reserved intents; false/duplicate/forged/unknown reply; fan-out isolation; true/false chain; reply-as-ack from deferred/failed observation; adapter ack duplicate; same-invocation send/reply retry; restart old delivery unknown.
- owner 문서와 W2 checklist가 모두 반영되고 link/reference check가 끝나기 전 W3를 completed로 바꾸지 않는다.

### 2026-07-17 21:42 · 2026-07-17 · W3 owner reflection execution order confirmed

[2026-07-17] 사용자 확인: W3 owner reflection의 큰 순서는 새 decision → lifecycle spec → roadmap → architecture/adapter owners → deferred spec → W2 handoff로 이해했다. 재검토 결과 decision outcome을 lifecycle contract에 먼저 반영한 뒤, lifecycle의 현재 open/deferred 항목을 정리하고 roadmap gate/Phase wording과 architecture target/gap을 각각 반영하는 것이 owner 경계상 더 안전하다. 실행 순서는 (1) 새 decision 2개와 기존 decision의 supersede link, (2) lifecycle §4.1–§4.5, (3) open-deferred 정합, (4) roadmap G1-B/G1-C/G1-D/Phase 2, (5) architecture + adapter owners, (6) cross-link/evidence review, (7) W2 handoff이다. 문서 간 link가 closeout review에서 모두 확인되면 W3를 완료하고 W2를 활성화한다.

### 2026-07-17 21:53 · 2026-07-17 · W3 owner reflection 1–6 complete; Claude review pending

[2026-07-17] W3 owner reflection 1–6 checkpoint: decision rationale two documents, lifecycle/deferred contract, roadmap gates/phases, and architecture/adapter responsibility boundaries were updated and cross-checked. `git diff --check` and markdown inline-code checks passed. Current-code caveats remain explicit: v1 fields, source-only reply authorization, automatic ack, reply-right persistence, and structured result are targets, not as-built claims. Historical `reply obligation` wording remains only in the superseded legacy decision. W2 was not opened. Next action is user-mediated Claude review using the supplied prompt; after review feedback is evidence-classified and reflected, user decides whether W2 begins now or next session.

### 2026-07-17 23:24 · 2026-07-17 · Claude review findings resolved; W2 decision pending

[2026-07-17] Claude review follow-up accepted and applied. C1 was valid against the already approved adapter-owned invocation retry direction, so lifecycle §4.3 now requires daemon lookup by authenticated source scope + invocation key, returning the prior accepted result without a new message/delivery or second reply-right consumption; §4.5 persists the accepted-operation record separately from delivery dedupe and target-ack dedupe. I1 was fixed by reducing Codex adapter target prose to adapter projection/result mapping and linking lifecycle §4.1–§4.4. N1 label is unified as A2A send-boundary / inbound reply resumption. N2 check found pair CLI lifecycle absent from pair-slot re-evaluation, so Phase 2 roadmap scope and the decision Re-evaluation now add it. `git diff --check` and all edited-doc inline-code checks pass. W2 remains unopened pending user session choice.

### 2026-07-17 23:42 · 2026-07-17 · delivery ID generator change candidate identified

[2026-07-17] ID issuance follow-up: direct code confirms production daemon passes one process-local `createSequentialId()` (`daemon-N`) into every entity creation path, and delivery rows obtain `id` through that shared `options.createId()` callback. `src/core/ids.ts` already provides `createRandomPrefixedId`, but production does not use it. Since approved A makes `message_deliveries.id` the public deliveryId, changing the observable delivery ID is a valid G1-B cutover candidate. Proposal pending user approval: introduce a delivery-specific opaque generator (e.g. `delivery_<randomUUID>` or separately approved `dlv_...`) rather than changing the shared generator for agents/pairs/routes/messages/events. This preserves the A one-ID binding while limiting blast radius. Exact public prefix/algorithm is not yet approved.

## 2026-07-17 · 2026-07-17 · public message/delivery opaque issuance owner reflection

[2026-07-17] 사용자 승인에 따라 public protocol ID 범위를 delivery-only가 아닌 messageId+deliveryId(A′)로 확정했다. 새 decision `public-message-and-delivery-ids-use-opaque-issuance`은 WHY만 소유하며, 두 공개 ID에는 restart 뒤 우연한 재사용을 피하는 collision-resistant opaque issuance을 쓰고 internal entity ID는 이번 cutover에서 제외하는 이유를 기록한다. lifecycle §4.1은 immutable·retransmission stability·consumer non-parsing을 committed target으로, prefix/UUID 표현은 non-normative example으로 반영했다. roadmap G1-B는 envelope/acceptance result 동시 cutover와 fixture 형식 의존 제거, G1-C는 retransmission ID stability, Phase 2는 이미 발급된 messageId/deliveryId history 보존을 반영했다. 기존 delivery PK decision은 history snapshot으로 보존한다. 검사: `git diff --check`, edited-doc inline-code check, old `msg_`/`dlv_` example grep pass. W2는 여전히 미개시이며 Claude review 결과 반영 후 사용자 결정 대기.

## 2026-07-18 · 2026-07-18 · Claude opaque-ID review findings reflected; W2 remains pending

[2026-07-18] Claude 재검토 결과 Critical 없음, I1/I2와 Nit 3건을 분류했다. I1은 수용: lifecycle §4.1이 Phase 0 process-lifetime/no-replay·lookup·재참조 미약속을 messageId와 deliveryId 모두에 공통으로 명시하고 collision-resistant issuance이 durable history가 아님을 분리했다. I2는 contract 결함이 아닌 G1-B 구현 handoff로 수용: W2는 public-ID 전용 factory를 messageId의 모든 ingress 발급 지점과 delivery `createDeliveryId` seam에만 배선하고, daemon 및 실제 public message/delivery를 발급하는 CLI in-process entrypoint를 모두 확인해야 한다. 공용 `createId` 교체로 internal entity ID까지 바꾸지 않는다. 각 entrypoint의 positive issuance 및 `daemon-N`/`cli-N` 형식 파싱 의존성 검사를 fixture/test에 포함한다. N1은 기존 delivery-PK decision에서 새 issuance rationale으로 보수 forward link를 추가했고, N2는 public sequential issuance 유지 대안을 명시했다. N3는 I1의 no-replay 문장으로 별도 조치 없이 해소했다. 검사: markdown inline-code 및 `git diff --check` 통과. W2는 계속 미개시.

## 2026-07-18 · 2026-07-18 · public-ID roadmap boundary and W2 readiness confirmed

[2026-07-18] 공개 ID issuance의 문서 배치를 재확인했다. roadmap G1-B는 public messageId/deliveryId의 collision-resistant opaque/immutable issuance과 fixture의 형식 비의존이라는 gate outcome을 소유한다. 반면 state.ts의 모든 message 발급 지점, delivery createDeliveryId seam, daemon·CLI in-process entrypoint에 public-ID 전용 factory를 배선하고 `daemon-N`/`cli-N` 형식 의존을 제거·검증하는 구현 범위는 roadmap에 복사하지 않고 W2 handoff가 소유한다. Claude review의 Critical은 없고 I1/N1/N2는 owner 문서에 반영됐으며 I2가 W2 handoff로 구체화됐으므로, W3의 이 public-ID reflection은 implementation 착수 관점에서 준비됐다. 다음 사용자 결정: W2를 현 세션에서 활성화해 schema/tool/daemon/fixture 작업을 시작할지, 다음 세션으로 넘길지.

## 2026-07-18 · 2026-07-18 · W2 G1-A execution checklist and handoff map (prepared, not active)

W2는 구현을 지금 시작했다는 상태가 아니라, W3에서 확정한 contract를 실행 가능한 작업 묶음으로 넘기는 handoff block이다. W2를 활성화하기 전에는 W3 closeout과 사용자 세션 선택이 필요하다.

#### 고정 입력

- Typed send={type(question|instruction), intent, replyExpected, content:{text}}와 reply={inReplyToDeliveryId, intent, replyExpected, content:{text}}. daemon이 source/target/type=reply/messageId/deliveryId/createdAt/mediaType를 소유한다.
- Fan-out all-or-nothing acceptance, original-delivery one-reply permission, source-only reply route, accepted/rejected logical result와 lifecycle error code를 구현 기준으로 쓴다.
- Public messageId/deliveryId만 collision-resistant opaque issuance으로 전환한다. deliveryId는 `message_deliveries.id`를 그대로 쓴다. prefix/UUID 형식은 계약이 아니며 internal entity ID는 유지한다.

#### 실행 묶음과 순서

1. **G1-B contract/tool cutover** — MCP send/reply schema, instruction, description, examples와 CLI/daemon API mapping을 typed contract로 교체한다. shared error-registry source를 만들고 lifecycle-owned public code/meaning과 동기화한다.
2. **G1-B daemon/model/store cutover** — typed validation, canonical envelope 생성, fan-out atomic acceptance/rejection, narrow reply-right authorization/consumption, accepted-operation record를 구현한다. additive migration, compatibility read, authority switch와 rollback posture를 명시한다.
3. **G1-B public-ID issuance** — 공용 `createId`를 바꾸지 않는다. messageId의 모든 ingress 발급 지점과 delivery `createDeliveryId` seam에 public-ID 전용 factory를 배선한다. production daemon 및 public message/delivery를 실제 발급하는 CLI in-process entrypoint를 확인·포함한다.
4. **G1-B Codex ingress evidence** — Codex app-server/proxy ingress에서 typed send/reply가 daemon acceptance와 canonical messageId/deliveryId propagation으로 이어지는 positive evidence를 만든다. 지원하지 못하는 idle wake-up·active-turn 충돌·receipt 의미는 성공으로 과장하지 않고 capability/degradation evidence로 분류한다.
5. **fixture/test cutover** — typed valid/invalid/reserved input, fan-out atomicity/isolation, false·forged·unknown·duplicate reply, invocation retry의 prior accepted-result recovery, public ID immutability/retransmission stability, ID format non-parsing을 검증한다. Codex ingress fixture는 tool input→daemon result→delivery correlation을 최소 end-to-end로 검증한다.

#### G1-C로 넘기는 경계

- automatic target control-plane ack의 실제 adapter wiring·dedupe, retry/backoff, queued flush, stale/runtime failure, durable accepted-operation/reply-right replay는 G1-C reliability 또는 Phase 2 durable replay의 owner다.
- W2는 G1-C가 사용할 canonical IDs, correlation, persistence shape와 test seam을 준비하지만 Tier 2 wake-up/LLM exactly-once/remote receipt를 완료로 주장하지 않는다.

#### 완료 증거와 착수 전 확인

- `daemon-N`/`cli-N` 형식을 parse·sort·의미 판단하는 production/test/diagnostic 의존성이 없는지 grep하고, 내부 agent ID fixture는 불필요하게 바꾸지 않는다.
- daemon과 applicable CLI entrypoint에서 새 logical message/delivery가 opaque public ID를 받고, retransmission은 원 ID를 유지하는 positive test를 둔다.
- current implementation과 committed target의 구분을 유지하며, code/test 변경 뒤 lifecycle owner와 roadmap G1-B/G1-C criterion을 다시 대조한다.
- 이 block이 준비됐다고 W2 implementation이 자동 활성화되지는 않는다. 사용자가 현 세션/다음 세션을 선택하면 Work Item과 next pointer를 그때 전이한다.

### 2026-07-18 00:14 · 전체 로그 재독 후 W2 범위 정정

#### 전체 로그 재독 후 W2 범위 정정

- W2 Work Item의 직접 산출물은 **G1-A execution checklist와 handoff map**이다. 아래 G1-B/G1-C 항목은 W2가 지금 구현한다는 뜻이 아니라, G1-A contract freeze 뒤 각각의 downstream gate가 실행할 work package와 evidence를 넘기는 것이다.
- Codex ingress evidence는 단순 tool input→daemon acceptance만으로 충분하지 않다. support matrix와 Codex/Claude CLI version pin을 먼저 확인한 뒤, named app-server surface에서 TUI 표시, idle wake-up, active-turn 충돌, canonical deliveryId 보존, timeout/process-exit/unsupported-method 실패 모드를 직접 검증한다. generic `turn/start` compatibility path는 이를 대체하지 못한다. 확인되지 않은 Tier 2 의미는 capability/degradation으로 기록한다.
- G1-B handoff는 typed MCP schema/instruction/description/example, daemon validation·canonical envelope·storage migration·public-ID issuance·shared error registry와 positive/negative fixture를 포함한다. G1-C handoff는 automatic ack wiring/dedupe, retry·queued flush·stale/runtime failure 및 invocation idempotency의 reliability evidence를 포함한다. W2는 이 분리를 checklist와 test map으로 고정하며, 이 두 downstream gate의 완료를 주장하지 않는다.
- G1-A Codex evidence fixture는 typed request→daemon accepted/rejected result→canonical messageId/deliveryId correlation을 검증하되, named app-server 위의 관찰 결과와 transport/degradation 분류를 함께 남긴다.

### 2026-07-18 00:28 · owner reflection completeness audit

- [Fact] W3에서 확정한 external contract는 lifecycle §4.1–§4.5(typed request/envelope, public ID, fan-out/reply right, automatic ack/idempotency, logical result/error, persistence minimum)에 반영돼 있다. rationale은 public delivery PK, public opaque IDs, one-reply permission, narrow reply right의 네 decision과 legacy decision의 supersede links에 남아 있다. roadmap G1-B/G1-C/G1-D·Phase 2, open/deferred, adapter model, Codex/routing/gap architecture, pair lifecycle re-evaluation도 각각의 owner 경계에서 확인했다.
- [Fact] Current/as-built와 committed target은 lifecycle caveat 및 architecture gap에서 구분돼 있다. Codex ingress는 adapter model의 Tier 3와 open/deferred의 named app-server 검증 항목으로 남아 있어, `turn/start` 현재 동작을 Tier 2 보장으로 과장하지 않는다.
- [Gap] support matrix와 Codex/Claude CLI version pin의 구체 값·owner는 아직 확인되지 않는다. roadmap은 G0/G1 경계에서 이를 명시하라고 요구하고, 이 로그도 Codex evidence 전제라고 기록하지만 현재 문서는 runtime capability 표만 둘 뿐 version pin 또는 지원 조합을 소유하지 않는다. 또한 named app-server의 TUI 표시, idle wake-up, active-turn 충돌, canonical deliveryId 보존, timeout/process-exit/unsupported-method 결과 evidence는 아직 수행·기록되지 않았다.
- [State] 따라서 owner reflection은 W3 contract 결정 범위에서는 complete이지만, G1-A 전체 completion condition은 위 G0 support/version owner gap과 Codex evidence가 남아 완료로 주장할 수 없다. W2는 이 누락을 해결할 owner/evidence handoff를 명시한 open Work Item으로 유지한다.

### 2026-07-18 00:28 · W2 fallback boundary clarified by user

- [User clarification] W2 was previously removed and has been restored only as a fallback. The reason for removal was that an agent had incorrectly treated work owned by separate `plans/` stages as W2 execution work.
- [Operational boundary] W2 does not own or execute downstream G1-B/G1-C implementation, fixture, or ingress-evidence stages. Its only permitted role is to preserve or clarify the handoff/checklist when a plan-stage boundary is missing; the actual work remains in the concrete stage and its own log. No W2 activation follows from this clarification.

### 2026-07-18 00:28 · 사용자 응답 언어 기준

- [사용자 지시] 이후 사용자에게 드리는 설명·보고·질문은 한국어로만 작성한다. 코드·파일 경로·고유 식별자는 필요한 경우 원문 표기를 유지하되, 서술 언어를 영어로 바꾸지 않는다.

### 2026-07-18 00:28 · Codex ingress 작업 owner 정정

- [정정] Codex named app-server ingress evidence는 owner가 없는 미결 항목이 아니다. 실행 단계 owner는 `plans/g1-a-contract-ingress.md`의 `Codex structured ingress evidence` stage다. `docs/specs/aiox-open-deferred.md`는 직접 검증할 named surface와 미확인 의미를, `docs/specs/aiox-adapter-model.md`은 capability tier/degradation을, `docs/architecture/local-runtime-codex-adapter.md`는 현재 구현 사실을 각각 소유한다.
- [상태] 아직 evidence가 수행되지 않았다는 사실은 유지하되, 이를 W2나 support/version 문서 owner 공백으로 혼동하지 않는다. W2는 이 stage의 실행을 대신하지 않는 fallback handoff다.

### 2026-07-18 00:28 · WSL2 로드맵 배치 정정

- [사실] `docs/product/roadmap.md`는 G0에서 지원 Node·agent CLI 버전과 macOS/Linux/WSL2 matrix를 고정하고, G4에서 동일 immutable candidate의 G1–G3 smoke를 macOS/Linux/WSL2에서 인증하도록 둔다. G4 착수 시 WSL2 검증을 공개 전 gate로 유지할지 범위 변경 승인으로 제외할지도 재검토한다.
- [정정] 현재 macOS Codex ingress evidence는 G1-A의 한 환경 관찰이며, Linux/WSL2를 단순한 불특정 미래 후속으로 미루는 뜻이 아니다. G1은 transport-neutral contract를 유지하고 G1/G3는 OS launch·shell·path·permission·signal 차이를 흡수해야 하며, cross-platform final evidence는 G4가 소유한다.

### 2026-07-18 01:08 · W2 fallback handoff 취소

- [사용자 지시] W2를 취소한다. W2는 concrete plan stage의 작업을 실행하거나 소유하지 않는 fallback으로만 복원됐으나, 그 fallback을 열린 Work Item으로 유지하면 다시 stage 작업을 흡수하는 오해를 만든다.
- [상태] 준비된 checklist·handoff map은 이력으로 보존한다. 이후 schema/tool/fixture sync, Codex structured ingress evidence, closeout과 G1-B/G1-C handoff는 각각 `plans/g1-a-contract-ingress.md`의 concrete stage와 해당 stage log가 소유한다.

### 2026-07-18 01:12 · G0 지원 정책 문서화와 WSL2 정정

- [사용자 결정] 공식 지원·release 인증 OS는 macOS와 Linux다. WSL2는 공식 지원 범위에서 제외하며, 포함하려면 별도 범위 변경 결정을 연다. 이전 WSL2 entry의 macOS/Linux/WSL2 G4 인증 설명은 이 결정으로 대체된다.
- [사용자 결정] Node 지원 범위는 `20.19.x`, `22.12.x 이상인 22.x`, `24.x`다. `package.json` engines와 개발·CI 검증 기준을 같은 범위로 맞춘다. Node 21·23과 범위 밖 patch는 공식 지원으로 주장하지 않는다.
- [사용자 결정] Codex/Claude는 장기 고정 version을 약속하지 않는다. G0에서 매월 검증 기준과 environment evidence를 남기고 version/capability preflight 및 supported fallback 또는 명시적 실패 posture를 구현·검증한다. 이는 현재 구현 완료 사실이 아니라 G0 통과 조건이다.
- [owner] rationale은 `docs/decisions/runtime-support-and-agent-cli-validation-policy.md`, release outcome과 evidence 기준은 `docs/product/roadmap.md` G0/G4가 소유한다. G1-A의 concrete stage 작업 또는 W2 handoff로 이관하지 않는다.

## 2026-07-18 · 2026-07-18 · contract decision closure closeout

### 최종 결정과 방향
- Canonical v1은 target-specific delivery다. fan-out은 하나의 messageId와 target별 deliveryId·target을 만들고, agent send는 type(question|instruction)·5개 intent·replyExpected·content:{text}, reply는 inReplyToDeliveryId·동일 intent·replyExpected·content:{text}를 기본값 없이 받는다. reply type, authenticated source, route/correlation-derived target, messageId, deliveryId, createdAt, envelope text/plain mediaType은 daemon authority다. reserved status·notification은 agent input에서 거절한다.
- `message_deliveries.id`의 immutable value를 protocol deliveryId로 쓰며 별도 public delivery_id column은 만들지 않는다. public messageId·deliveryId는 collision-resistant opaque issuance, immutability, retransmission stability, consumer non-parsing을 목표로 한다. 이 발급·저장 cutover 구현은 G1-B가 소유하며 internal entity ID는 이번 범위에서 유지한다.
- replyExpected는 obligation FSM이 아니라 원 target에게 한 번의 correlated reply를 허용하는 permission이다. daemon은 원 delivery 존재·authenticated caller=원 target·replyExpected:true·right 미소비를 확인하고, reply를 원 source로만 보낸다. reverse directed route는 필요 없고 independent send만 directed route를 쓴다. false/forged/duplicate/missing은 각각 reply_not_expected/correlation_mismatch/duplicate_reply/unknown_delivery다. Phase 0 chain은 false로 닫히며 length·expiry 정책은 이연한다.
- source-visible result는 daemon acceptance/rejection이며 target receipt·work completion·reply가 아니다. agent-facing idempotencyKey는 없고 adapter가 invocation-scoped key를 생성·재사용한다. target control-plane ack는 adapter/runtime이 보낼 방향으로 확정했으나 wiring·dedupe·retry·recovery는 G1-C가 검증한다. v1은 text only이며 attachment·group/targets[]·pair CLI lifecycle·durable replay는 deferred다.

### 반영한 owner와 검증
- `docs/specs/aiox-message-lifecycle.md` §4.1–§4.5: typed request/envelope, public ID binding·lifetime, fan-out/narrow reply authorization, permission·ack/idempotency persistence, accepted/rejected logical result와 baseline error contract를 소유한다. 현재 pre-v1 caveat를 target과 분리한다.
- Rationale decisions: `docs/decisions/public-delivery-id-is-delivery-primary-key.md`, `docs/decisions/public-message-and-delivery-ids-use-opaque-issuance.md`, `docs/decisions/reply-permission-rather-than-obligation-fsm.md`, `docs/decisions/original-delivery-narrow-reply-right.md`. 기존 `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`는 supersede links를 통해 당시 open rationale을 history로 보존한다.
- `docs/product/roadmap.md`: G1-A의 contract/ingress outcome, G1-B canonical cutover·public-ID issuance, G1-C ack/retry/idempotency/reliability, G1-D forged-reply/route-bypass negative evidence, Phase 2 pair lifecycle·durable history 조건을 각 gate owner에 배치했다. G0의 macOS/Linux·Node·monthly agent-CLI preflight/fallback 정책은 `docs/decisions/runtime-support-and-agent-cli-validation-policy.md`와 roadmap G0/G4가 소유한다.
- `docs/specs/aiox-open-deferred.md`, `docs/specs/aiox-adapter-model.md`, `docs/architecture/local-runtime-codex-adapter.md`, `docs/architecture/local-runtime-routing-and-delivery.md`, `docs/architecture/local-runtime-gaps-and-targets.md`은 각각 named Codex surface/deferred policy, Tier/degradation, current app-server fact, current routing/store fact, current-to-target reliability gap을 소유한다. `docs/decisions/pair-slot-generalization.md`에는 Phase 2 pair CLI lifecycle 재평가를 남겼다.
- owner 문서·decision supersede 관계·plan·freeze 및 생성된 schema/Codex stage 로그를 다시 대조했다. schema/Codex Global의 Claude review 결과를 반영했고 `log check`와 `git diff --check`를 통과했다.

### downstream handoff와 closeout 판단
- `logs/2026-07-18-G1-A-schema-typed-tool-fixture.md`는 typed public surface·instruction·example·contract fixture만 동기화한다. daemon canonical envelope/fan-out/reply-right/store migration, public-ID issuance, shared error registry는 G1-B로, accepted-result recovery·ack/retry/reliability는 G1-C로 넘긴다.
- `logs/2026-07-18-G1-A-Codex-structured-ingress-evidence.md`는 named app-server behavior·TUI/wake-up/active-turn/canonical correlation/failure evidence를 Tier 3/degradation 기준으로 분류한다. G0 preflight 결과를 evidence로 소비하며 Tier 2를 선주장하지 않는다.
- G0 preflight 구현과 Codex evidence는 아직 완료되지 않았지만 freeze의 결정·owner reflection 범위 밖에서 명시적으로 owner와 stage를 가진다. 이들은 G1-A 전체 closeout blocker이지 contract decision closure의 미결 질문이나 미완료 Work Item은 아니다. freeze에는 Return Target·detached item·next pointer가 없고 W1/W3은 완료, W2는 취소됐으므로 이 로그 수명에는 남은 일이 없다.
