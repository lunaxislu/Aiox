# Product Roadmap

Related:

- [[docs/product/product]]

Status: Current

이 문서는 aiox의 공개 전 release gate, 공개 이후 phase, 우선순위와 gate 통과 기준을
소유한다. 구현 checklist, 세부 task 상태와 cutover 절차는 `plans/`의 실행 plan과 code/test
evidence가 소유한다.

현재 승인된 추진 순서는 **로컬 Codex<->Claude 안정 왕복, terminal UX, daemon 안정화, 공개
위생, npm packaging과 macOS/Linux 최종 인증을 통과한 뒤 npm publish와 GitHub 공개를
진행하고, 이후 채택기/확장기/원격기 phase를 계속 개발하는 것**이다.

`plans/release-plan.md`는 별도 roadmap 항목이 아니라 G6 npm packaging gate의 배포 시점
실행 checklist다. Roadmap은 G6의 통과 조건과 release 순서만 소유하고, tarball 내용물 확인,
clean install, CLI smoke 같은 구체 절차는 release plan과 CI evidence가 소유한다.

## Release Path

```text
Phase 0:
  G0
  -> G1/G3 병행
     -> G1-A
     -> G1-B
     -> G1-C + G1-D 병행 가능
     -> G3 병행
  -> G2
  -> G5/G6
  -> G4 final RC
  -> npm publish + GitHub 공개

After public release:
  Phase 1
  -> Phase 2
  -> Phase 3
```

## Gate Overview

| Gate/Phase | 역할                                                         | 다음 판단                                                                             |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| G0         | release identity, protocol/CLI/package/support matrix freeze | G1/G3가 임시 identity 위에서 진행되지 않게 한다.                                      |
| G1-A       | contract/ingress freeze                                      | envelope cutover와 reliability가 소비할 contract boundary를 고정한다.                 |
| G1-B       | canonical envelope cutover                                   | reliability/trust-boundary가 같은 delivery/correlation 모델을 쓰게 한다.              |
| G1-C       | delivery reliability                                         | ack/retry/idempotency/queued/stale/runtime failure 경계를 닫는다.                     |
| G1-D       | local trust boundary                                         | authenticated source, route authorization, runtime secret/socket boundary를 닫는다.   |
| G3         | daemon stabilization                                         | daemon lifecycle, transport, diagnostics failure boundary를 release-grade로 고정한다. |
| G2         | terminal minimum                                             | one-command demo의 최소 terminal UX를 Phase 0 범위로 닫는다.                          |
| G5         | public hygiene                                               | 공개 repo로 나갈 shared/local/sensitive/public surface 경계를 닫는다.                 |
| G6         | npm packaging                                                | npm artifact가 clean install과 daemon smoke를 통과하게 한다.                          |
| G4         | final RC certification                                       | 동일 immutable candidate로 G0-G3/G5/G6 변경을 인증한다.                               |
| Phase 1    | adoption/operation polish                                    | 공개 이후 진단, 가시성, 승인 흐름, demo assets를 다듬는다.                            |
| Phase 2    | expansion prerequisites                                      | vendor expansion, compose, durable replay, extra drivers의 구조 전제를 닫는다.        |
| Phase 3    | remote/federation                                            | remote MCP, internal federation, A2A Protocol bridge를 순서 있게 확장한다.            |

## Phase 0 Release Gates

### G0 — Contract And Release Identity

**목표**

공개 전 release candidate의 protocol identity, CLI/config surface, 지원 matrix, package/release identity를 먼저 고정한다. G1 이후 작업이 임시 이름, 임시 schema, 불명확한 upstream 의존성 위에서 진행되지 않게 한다.

**진입 조건**

- G0가 G1/G3보다 앞선 선행 gate임을 유지한다.
- 제품 포지셔닝을 전제로 삼고, 외부 표면에서 aiox를 별도 A2A standard처럼 표현하지 않는다.
- G1에서 소비할 protocol/schema owner가 식별되어 있다.

**착수 검토 / 열린 결정**

- canonical CLI 이름, command surface, 구현/미구현 표면, config precedence를 결정한다.
- npm package name, 초기 0.x version 정책, license를 결정한다.

**통과 조건**

- versioned schema/example validation 경로, CLI/config/package decision record, support matrix가 owner 문서로 연결되어 있다.
- release identity 결정이 G1-A contract/ingress freeze의 입력으로 사용할 수 있을 만큼 모호하지 않다.
- 공식 지원 OS는 macOS와 Linux이며 WSL2는 공식 지원·release 인증 대상이 아니다. WSL2를 포함하려면 별도 범위 변경 승인이 필요하다.
- 지원 Node 범위는 `20.19.x`, `22.12.x 이상인 22.x`, `24.x`다. `package.json`의 `engines`와 개발·CI 검증은 같은 범위를 사용한다.
- Codex CLI와 Claude CLI는 장기 고정 버전으로 지원을 약속하지 않는다. G0는 매월 검증 기준 버전·검증일·OS·Node·결과를 evidence에 기록하고, version/capability preflight와 supported fallback 또는 명시적 실패 posture를 구현·검증해야 한다.

**Owner refs**

- [[docs/product/roadmap]] — G0 gate intent, release 순서, evidence 요구 owner.
- [[docs/product/product]] — 제품 범위와 외부 포지셔닝 owner.
- [[docs/specs/aiox-a2a]] — G1에서 고정할 protocol contract index.
- [[docs/architecture/local-runtime-codex-adapter]] — Codex app-server/WS 의존성과 unsupported surface caveat owner.
- [[docs/decisions/codex-per-agent-app-server]] — per-agent app-server topology와 지원 posture 재검토 근거 owner.
- [[docs/decisions/runtime-support-and-agent-cli-validation-policy]] — 지원 OS·Node 범위와 agent CLI 월별 검증 정책의 rationale owner.

### G1/G3 Parallel Stabilization

#### G1 — Local Stable A2A Round Trip

##### G1-A — Contract And Ingress

**목표**

Local stable A2A의 첫 sub-gate로 canonical schema, typed send/reply tool, instruction/description/example sync, Codex ingress evidence를 고정한다. G1-B envelope cutover와 G1-C reliability가 소비할 contract boundary를 연다.

**진입 조건**

- G0의 release identity와 지원 matrix가 G1-A 검증 범위를 제한할 만큼 결정되어 있다.
- message lifecycle owner의 canonical envelope, delivery correlation, one-reply permission target이 착수 기준으로 확인되어 있다.
- Codex structured ingress spike의 미검증 항목을 열린 결정으로 받아들인다.
- Codex ingress/egress 구조와 capability tier caveat를 현재 사실로 둔다.

**착수 검토 / 열린 결정**

- Codex structured ingress spike는 `aiox-open-deferred`의 named app-server
  surface 제약을 따른다. generic `turn/start` compatibility path로 대체하지
  않고 TUI 표시, idle wake-up, active-turn 충돌, delivery id 보존,
  timeout/process-exit/unsupported-method 실패 모드를 검증한다.
- Tier 2 uplift는 검증 전에는 주장하지 않는다.

**통과 조건**

- canonical schema, typed tool contract, MCP instruction/tool description/example/test fixture가 같은 contract를 가리킨다.
- public `deliveryId` binding, typed validation, automatic control-plane ack의 accepted
  direction이 owner contract와 schema/tool cutover handoff에 반영되어 있다.
- send/reply acceptance가 daemon validation과 route-derived delivery creation일 뿐 target
  receipt·work completion이 아님을 tool surface가 구분한다.
- Codex ingress path의 지원 수준이 evidence로 분류되고, 보장하지 못하는 wake-up/ack/correlation/dedupe는 degradation으로 남는다.
- G1-B로 넘길 envelope cutover owner path와 G1-C로 넘길 reliability/open-policy path가 분리되어 있다.

**Owner refs**

- [[docs/product/roadmap]] — G1-A gate intent와 G1 전체 완료 조건 owner.
- [[docs/specs/aiox-message-lifecycle]] — canonical envelope, typed send/reply, delivery/reply correlation target owner.
- [[docs/specs/aiox-open-deferred]] — Codex structured ingress spike, named
  app-server surface 직접 검증 제약, lifecycle open questions owner.
- [[docs/specs/aiox-adapter-model]] — adapter slots, capability tier, Codex/Claude degradation classification owner.
- [[docs/architecture/local-runtime-codex-adapter]] — current Codex app-server, proxy, `turn/start`, MCP ingress, runtime failure gap owner.
- [[docs/decisions/codex-per-agent-app-server]] — Codex app-server topology와 ack/lifecycle rationale owner.

##### G1-B — Envelope Cutover

**목표**

local A2A 경로를 canonical envelope과 correlation 모델로 전환해, 이후 reliability와 trust-boundary 작업이 하나의 안정된 message lifecycle 위에서 진행되게 한다.

**진입 조건**

- G1-A contract/ingress 결정이 충분히 안정되어 envelope shape를 더 이상 exploratory 대상으로 취급하지 않아도 된다.
- typed send/reply surface와 canonical schema 방향이 message lifecycle owner와 정렬되어 있다.
- correlated reply authorization은 확정된 입력이다. 원 delivery가 원 target에게만 원 source로 향하는 1회 reply permission을 부여하며, 별도 reverse route는 필요 없다.
- persistence migration은 public surface cutover와 분리해 rollback-aware pre-step을 설계해야 한다는
  점이 message lifecycle owner에 반영되어 있다.

**착수 검토 / 열린 결정**

- 구현 착수 전에 async send-boundary가 message lifecycle spec과 정렬되어 있는지 확인한다.
- roadmap을 migration checklist로 만들지 않는 선에서 additive schema expansion, backfill/compatibility
  read, write/read authority switch, rollback 또는 downgrade posture의 기대치를 결정한다.
- `thread_status`를 routing/state-transition authority로 만들지 않고, reply permission의
  consumption과 reply creation이 원자적으로 기록되는지 확인한다.
- public `messageId`와 `deliveryId`의 opaque issuance cutover가 canonical envelope와
  acceptance result에 함께 적용되고, tool/example/fixture가 ID 문자열 형식을 의미 있게
  가정하지 않는지 확인한다.
- reliability 작업을 막는 남은 envelope/correlation 결정을 닫거나 명시적으로 이연한다.

**통과 조건**

- G1-C reliability와 G1-D trust-boundary 검증이 같은 delivery/correlation 모델을 사용할 수 있을 만큼 canonical envelope cutover가 완료되어 있다.
- route-derived fan-out acceptance와 original-delivery source-only reply creation이 각각
  all-or-nothing으로 검증된다.
- public `messageId`와 `deliveryId`가 owner contract의 collision-resistant opaque/immutable
  규율로 발급되며,
  delivery row primary-key binding은 유지된다.
- 남은 lifecycle 질문은 owner 문서에서 닫혔거나, 이후 gate decision으로 명시적으로 이월되어 있다.

**Owner refs**

- [[docs/specs/aiox-message-lifecycle]] — canonical envelope, delivery lifecycle, send-boundary contract owner.
- [[docs/decisions/public-message-and-delivery-ids-use-opaque-issuance]] — public-ID scope와 internal-ID exclusion rationale owner.
- [[docs/architecture/local-runtime-routing-and-delivery]] — internal routing, delivery, reply-resumption structure owner.
- [[docs/decisions/reply-permission-rather-than-obligation-fsm]] — one-reply permission rationale owner.
- [[docs/decisions/original-delivery-narrow-reply-right]] — source-only correlated reply rationale owner.
- [[logs/workspace-reset/product-a2a/2026-06-10-A2A-응답-대기-polling-원인]] — async send-boundary 검토의 root-cause context.

##### G1-C — Delivery Reliability

**목표**

canonical delivery/correlation 모델 위에서 local A2A 전달을 신뢰 가능한 release gate로 고정한다. target별 delivery 상태, ack/retry/idempotency, queued delivery flush, target serialization, runtime failure/stale recovery가 같은 lifecycle owner를 따르게 한다.

**진입 조건**

- G1-B envelope cutover가 reliability 검증에 필요한 delivery correlation, consumed one-reply permission, source-visible acceptance boundary를 충분히 고정했다.
- adapter별 capability tier와 degradation이 확인되어 자동 retry와 manual retry의 경계를 target runtime별로 판단할 수 있다.
- runtime failure, stale session, queued delivery drain gap이 architecture owner에 남아 있다.

**착수 검토 / 열린 결정**

- G1 failure-injection으로 retry 기본값, passive ack timeout, post-acceptance retry 허용 범위를 고정한다.
- Codex structured ingress와 active-turn 충돌 처리가 delivery reliability를 Tier 2로 올릴 수 있는지, degraded/manual path로 남길지 판단한다.
- Codex user-facing queued delivery control surface(pull/read/ack 또는 inspect/ack/drain)를 Phase 0 Target에 포함할지 결정한다.
- daemon 시간 기반 stale recovery와 adapter-active 세션 단절 감지의 release 경계를 결정한다.
- stale 또는 disconnected runtime을 감지했을 때 queued delivery를 재시도, 보류, failed 처리 중 어디로 보낼지 owner 문서에서 닫는다.
- durable store와 mailbox replay는 G1-C 통과 조건으로 끌어오지 않는다.

**통과 조건**

- local A2A 왕복에서 adapter/runtime automatic ack, consumed one-reply permission, same-invocation accepted-result recovery, retry/idempotency, queued flush, stale/runtime failure 처리가 같은 delivery correlation 기준으로 검증된다. 재전송은 원 `messageId`와 `deliveryId`를 유지한다.
- retry/failure-injection 중에도 inbound reply와 MCP fallback이 delivery correlation 기준으로 유실 없이 동작한다.
- adapter가 보장하지 못하는 ack/dedupe/wake-up 의미는 completed로 과장하지 않고 degradation 또는 explicit manual action으로 드러난다.
- durable store와 mailbox replay는 Phase 2 owner로 남아 있다.

**Owner refs**

- [[docs/specs/aiox-message-lifecycle]] — delivery state, ack/retry/idempotency, one-reply permission, persistence minimum owner.
- [[docs/decisions/public-message-and-delivery-ids-use-opaque-issuance]] — public-ID issuance boundary rationale owner.
- [[docs/specs/aiox-open-deferred]] — retry/passive ack timeout, session expiry, pending/blocked policy의 열린 결정 owner.
- [[docs/architecture/local-runtime-routing-and-delivery]] — current routing/FSM, queued/deferred delivery behavior, production dispatch path owner.
- [[docs/architecture/local-runtime-gaps-and-targets]] — runtime failure wiring, stale transition, queued delivery retry/drain gap owner.
- [[docs/decisions/reply-permission-rather-than-obligation-fsm]] — permission-consumption rationale owner.

##### G1-D — Trust Boundary

**목표**

Local stable A2A가 같은 machine 안의 편의적 loopback 통신이 아니라 authenticated source, authorized route, protected runtime secret, owner-only local runtime surface 위에서 동작하게 한다.

**진입 조건**

- G1-A/G1-B가 source identity, route authorization, typed send/reply, delivery correlation의 authority boundary를 canonical model로 고정했다.
- Claude channel registration token 결정과 남은 reverse push/ingress auth gap이 분리되어 있다.
- runtime directory/socket permission, token comparison, secret delivery, rollback cleanup gap이 architecture owner에 남아 있다.

**착수 검토 / 열린 결정**

- G1-B에서 확정한 correlated reply authorization 모델이 trust-boundary 검증에 필요한 negative test와
  runtime guard로 연결되어 있는지 확인한다.
- G1-D auth는 API 요청 권한/route 검증 gate이고, full Tier 2 delivery-ack 완성은 Phase 1 uplift임을 착수 scope에서 분리한다.
- Claude daemon-to-channel push와 channel-to-daemon ingress 각각에서 어떤 token/header 검증이 필요한지 구분한다.
- Claude channel-server `/send`가 request auth 없이 loopback POST를 수용하는 현재 ingress gap을 release-gating auth 취약점으로 다룬다.
- Codex secret 전달 방식, runtime directory/socket 권한, token comparison, rollback cleanup의 release-grade 최소선을 정한다.

**통과 조건**

- Claude와 Codex 경로 모두에서 unauthenticated ingress/push, forged source, invalid token,
  wrong/forged correlated reply, `replyExpected:false` reply, consumed-right duplicate reply, route bypass가 negative evidence로 거부된다.
- secret/token/raw credential이 argv, log, event, error, rollback residue에 release-blocking 방식으로 남지 않는다.
- runtime directory와 daemon/channel socket surface가 owner-only local boundary로 취급되며, 실패/rollback 후에도 stale credential이나 pending token이 남지 않는다.

**Owner refs**

- [[docs/architecture/local-runtime-gaps-and-targets]] — local trust-boundary current gaps와 release pressure owner.
- [[docs/decisions/claude-channel-trust-and-registration]] — Claude channel registration token 결정과 reverse push-auth gap owner.
- [[docs/decisions/original-delivery-narrow-reply-right]] — correlated reply authorization rationale owner.
- [[docs/specs/aiox-message-lifecycle]] — source identity, route authorization, reply correlation, typed error boundary owner.
- [[docs/specs/aiox-capability-policy]] — identity/auth, authorization/policy, capability isolation, runtime data handling boundary owner.

#### G3 — Daemon Stabilization

**목표**

daemon이 공개 전 release path에서 조용히 실패하거나 손상된 상태로 계속 실행되지 않도록 lifecycle, transport, diagnostics의 실패 경계를 release-grade로 고정한다.

**진입 조건**

- G1의 local A2A 경로가 daemon 안정화 검증에 사용할 만큼 충분히 재현 가능하다.
- daemon lifecycle, socket transport, adapter launch/ingress 경계의 current gap이 owner 문서에서 확인되어 있다.

**착수 검토 / 열린 결정**

- expected client/socket error와 fatal process error의 경계를 구분하고, fatal path의 structured log/exit 방향을 닫는다.
- `stop`/SIGTERM이 daemon-owned runtime과 child/process resource를 어디까지 정리해야 하는지 owner별로 확인한다.
- daemon-owned retained diagnostics/log surface가 daemon 생존, socket 응답, channel 등록/부재, boot failure
  reason을 어느 수준까지 보존하고 doctor/logs/status 계열 tooling에 노출해야 gate 통과로 볼지 정한다.
- Claude channel boot failure는 Claude-specific diagnosability gap으로 다룬다. 착수 시 startup ack 경로, attach success 반환 의미 축소, child fatal 관측 후 전파 중 어떤 방향으로 닫을지 재도출한다.
- Daemon socket dispatch가 inherited/prototype-chain method name을 호출하지 않도록 own-property 또는 known-method guard를 hardening 범위에 포함한다.
- `claude_channel_disconnected` event와 runtime tier evaluator/diagnostics API를 G3 Phase 0 diagnosability에 묶을지, Phase 2 adapter/events boundary로 명시 이연할지 결정한다.
- durable store는 G3 통과 조건에서 제외하고, restart 시 in-memory state 소실은 공개 release의 명시된 제한으로 둔다.

**통과 조건**

- client crash isolation, fatal handler exit, SIGTERM/stop cleanup, bounded input/queue, log redaction, doctor diagnosis가 G4에서 같은 release candidate로 재검증될 수 있다.
- Claude channel boot failure처럼 늦게 generic unavailable로 보이는 실패가 원인 진단 가능한 daemon behavior로 드러난다.
- socket API dispatch는 unknown 또는 inherited method 이름을 실행하지 않고 typed error로 거부한다.
- channel disconnect event와 runtime diagnostics/tier evaluation은 G3에서 검증됐거나, Phase 2 owner path로 명시 이연되어 G3 완료 주장에 섞이지 않는다.
- durable persistence와 mailbox replay는 Phase 2 owner path로 남아 있으며 G3 완료 주장에 포함되지 않는다.

**Owner refs**

- [[docs/product/roadmap]] — G3 gate intent, evidence level, durable-store 제외 범위 owner.
- [[docs/architecture/local-runtime-daemon-transport-api]] — daemon lifecycle, socket transport, API surface owner.
- [[docs/architecture/local-runtime-gaps-and-targets]] — G3 robustness/diagnostics, channel disconnect event, boot-failure diagnosability, socket dispatch hardening gap owner.
- [[docs/architecture/local-runtime-claude-adapter]] — Claude channel launch/registration/boot-failure 진단 경계 owner.
- [[docs/specs/aiox-capability-policy]] — daemon trust boundary, sensitive log/data handling, log redaction direction owner.
- [[docs/specs/aiox-adapter-model]] — OS launch/path/signal 차이를 adapter가 흡수해야 한다는 runtime boundary와 runtime diagnostics/tier evaluator gap owner.

### G2 — Terminal Minimum

**목표**

terminal automation이나 compose를 Phase 0 protocol requirement로 만들지 않으면서, 공개 가능한 one-command demo의 최소 terminal experience를 제공한다.

**진입 조건**

- G1/G3 stabilization이 충분히 진행되어 terminal demo path가 protocol 또는 daemon instability를 가리는 대신 release path를 검증할 수 있다.
- G2 surface는 승인된 Phase 0 범위 안에 머문다: tmux driver 1개와 no-tmux fallback.

**착수 검토 / 열린 결정**

- 최소 terminal driver와 fallback story가 product boundary 및 compose boundary와 맞는지 확인한다.
- README Quick Start가 실제 command surface와 일치하는지 확인한다.

**통과 조건**

- clean user가 tmux driver 또는 문서화된 no-tmux fallback으로 최소 demo path를 실행할 수 있다.
- compose, extra view driver, user-config persistence는 명시적으로 승격하지 않는 한 Phase 2에 남는다.

**Owner refs**

- [[docs/product/roadmap]] — current G2 gate와 evidence owner.
- [[docs/product/product]] — terminal experience boundary와 product scope owner.
- [[docs/specs/aiox-compose-contract]] — compose와 view-driver boundary owner.
- [[README]] — G2 command path와 일치해야 하는 public Quick Start surface.

### G5/G6 Release Preparation

#### G5 — Public Hygiene

**목표**

repository를 공개 가능한 형태로 내보낼 수 있도록 shared asset, local/sensitive artifact, public-facing 문서와 project metadata의 경계를 정리한다.

**진입 조건**

- 공개 전 release path에서 G0 package/license identity와 G2/G3 public-facing surfaces가 대략 고정되어 있다.
- repository에 남길 shared 작업 자산과 제외할 local/sensitive artifact의 구분 원칙을 owner 문서 기준으로 적용할 수 있다.

**착수 검토 / 열린 결정**

- ignore 정책은 실제 local/sensitive artifact에만 적용하고, shared `.agents/`, scripts, guides, 공개하기로 한 log/report를 blanket 제외하지 않는다.
- 한국어 작업 문서 공개 범위, commit author/path 노출, README 영문화, product messaging, LICENSE와 package metadata 정합성을 결정한다.
- G5 license datum은 축약하지 않는다: deleted legacy는 Apache-2.0 검토를 후보로 두었고, 현재 `package.json`은 `ISC`를 선언하며 root `LICENSE` 파일은 없다. G0/G5/G6 release identity 확정 전 이 불일치를 명시적으로 닫는다.
- GitHub public hygiene surface의 최소 묶음을 정한다.
- 공개 repo에 남는 dead/scaffold code의 허용 범위와 처리 정책을 정한다. 남길 경우 의도와 public-facing 상태가 설명 가능해야 하고, 제거할 경우 release candidate의 동작·문서·테스트 참조가 함께 정리되어야 한다.
- history rewrite가 필요하면 내부 commit-hash reference 갱신을 같은 gate batch로 묶을지 결정한다.

**통과 조건**

- secret/PII/path scan과 tracked-vs-local file review가 통과하고, 공개 repo에 남는 문서와 제외되는 artifact의 의도가 설명 가능하다.
- LICENSE 파일과 package metadata의 license 값이 승인된 license 결정과 일치하고, README, SECURITY, CONTRIBUTING, issue template, CI/link surface가 공개 전 release candidate에 포함된다.
- package metadata와 public repository messaging이 G0/G6의 release identity와 충돌하지 않는다.

**Owner refs**

- [[docs/product/roadmap]] — G5 gate intent와 required evidence owner.
- [[docs/specs/aiox-capability-policy]] — credential, transcript, local sensitive data, telemetry opt-in boundary owner.
- [[docs/specs/aiox-runtime-profile-namespace]] — profile/state path scaffold의 current contract와 공개 전 노출 상태 owner.
- [[docs/decisions/runtime-profile-namespace-isolation]] — file-backed database path scaffold의 rationale와 durable-store 전환 시 재평가 지점 owner.
- [[plans/release-plan]] — LICENSE/package metadata가 publish 직전 정합성을 가져야 하는 배포 실행 owner.
- [[docs/product/product]] — public messaging과 product positioning owner.

#### G6 — Npm Packaging

**목표**

공개 release의 1차 배포 형태인 npm artifact가 repo 밖 clean install 환경에서 실제 CLI와 daemon smoke를 통과하도록 packaging gate를 고정한다.

**진입 조건**

- G0에서 package name, version policy, supported Node/OS matrix, license 방향이 충분히 확정되어 있다.
- G5에서 public repo hygiene와 package metadata가 공개 가능한 수준으로 정리되어 있다.
- G3의 daemon start/stop behavior가 npm-installed artifact에서 smoke 대상으로 삼을 수 있을 만큼 안정화되어 있다.

**착수 검토 / 열린 결정**

- roadmap은 packaging gate의 통과 기준만 소유하고, tarball inspection과 clean install 절차는 release plan이 소유한다.
- package name은 publish 직전에 다시 확인하며, 선점 시 승인된 scoped 대안으로 갈지 결정한다.
- install/uninstall guidance는 release scope에 포함될 때만 G6 표면으로 다룬다. 포함한다면 package removal과 runtime/user-data purge를 분리하고, `~/.aiox` 같은 user data directory는 package uninstall 경로에서 자동 삭제하지 않는다.
- destructive reset/purge 표면을 제공한다면 사용자의 명확한 confirmation과 영향 범위(scope) 한정을 요구한다. CLI reset/purge 표면이 실제로 생기면 G6만으로 닫지 않고 spec 소섹션 필요성을 재검토한다.
- native dependency는 지원 matrix에서 prebuilt 또는 fallback build prerequisite를 clean-host 기준으로 검증한다.

**통과 조건**

- npm tarball이 설치 가능한 CLI artifact를 포함하고, publish 전 build 보장과 tarball content assertion이 gate evidence로 남는다.
- repo 밖 clean temp install에서 executable, version/help, daemon start/stop smoke가 통과한다.
- release scope에 install/uninstall 또는 reset/purge guidance가 포함된 경우 package removal이 user data purge를 수행하지 않고, destructive purge/reset에는 confirmation과 scope 제한이 문서화되어 있다.
- npm publish가 Phase 0의 1차 배포 형태이며, curl/standalone binary는 Phase 2 이후 후보로 남는다.

**Owner refs**

- [[docs/product/roadmap]] — G6 gate intent, npm-first release order, G4로 넘길 evidence level owner.
- [[plans/release-plan]] — publish 직전 packaging checklist와 tarball/clean-install 실행 owner.
- [[docs/architecture/local-runtime-daemon-transport-api]] — installed CLI의 daemon start/stop smoke가 기대하는 lifecycle/API owner.
- [[docs/specs/aiox-capability-policy]] — destructive purge/reset guidance가 release scope에 포함될 때 적용할 data-handling boundary owner.

### G4 — Final Release Candidate Certification

**목표**

G0-G3/G5/G6의 code, config, package 변경을 모두 포함한 동일 immutable release candidate를 공개 전 최종 인증한다.

**진입 조건**

- G0, G1, G2, G3, G5, G6가 통과했고, 인증 대상 candidate가 더 이상 바뀌지 않는다.
- npm packaging 검증은 `plans/release-plan.md`의 배포 직전 실행 checklist로 닫혀 있어야 한다.
- macOS/Linux 지원 matrix와 runtime version이 확정되어 있다.

**착수 검토 / 열린 결정**

- 수동 smoke만으로 통과시키지 않으며, CI suite 또는 clean-host run evidence 중 어떤 형태로 retained diagnostics를 남길지 정한다.
- G4는 새 기능을 추가하는 gate가 아니라 동일 candidate 인증 gate이므로 post-release scope를 끌어오지 않는다.

**통과 조건**

- 동일 immutable candidate가 macOS/Linux에서 G1-G3 smoke를 통과한다.
- 각 evidence는 setup command, supported runtime version, timeout, expected state transition, failure artifact location을 남긴다.
- diagnostics가 보존되어 재현 가능한 실패 분석이 가능하다.

**Owner refs**

- [[docs/product/roadmap]] — G4 gate 순서, matrix 요구, evidence 기준 owner.
- [[plans/release-plan]] — G6/npm publish 직전 packaging 실행 checklist owner.
- [[docs/architecture/local-runtime-gaps-and-targets]] — release candidate가 닫아야 할 local runtime gap pressure owner.

## Post-Release Phases

### Phase 1 — Adoption And Operation Polish

**목표**

공개 이후 사용자가 실제로 채택하고 운영할 때 막히는 진단, 가시성, 승인 흐름, 데모 자산을 다듬는다.

**진입 조건 / 경계**

- npm publish와 GitHub 공개 이후 시작한다.
- Phase 1은 adoption friction과 human-controlled operation에 집중하며, compose, durable replay, third vendor, federation은 Phase 2/3로 둔다.
- Phase 0 G1-C의 baseline adapter automatic ack와 idempotency 위에서, Phase 1은 stronger Tier 2 wake-up, structured ingress, and operational guarantees를 uplift한다.
- 이 카드는 gate가 아니므로 통과 조건 슬롯을 강제하지 않는다.

**주요 범위**

- demo assets와 doctor attachment guide.
- transcript surface와 vendor-provided token/cost visibility.
- pending/blocked delivery에 대한 human approval surface.
- approved artifact distillation.
- retry/backoff/dead-letter 조정.
- deferred delivery 자동 retry와 source push notification.
- G1 Codex ingress/reliability evidence가 충분할 때 stronger Tier 2 delivery-ack/wake-up uplift.

**Owner refs**

- [[docs/product/roadmap]] — Phase 1 adoption 범위와 Phase 2/3 경계 owner.
- [[docs/specs/aiox-open-deferred]] — pending, blocked, retry, Codex structured ingress 같은 열린 운영 정책 owner.
- [[docs/architecture/local-runtime-gaps-and-targets]] — diagnostics, queued delivery, runtime failure, events gap의 후속 pressure owner.
- [[docs/specs/aiox-adapter-model]] — Tier 2 ack/auth/dedupe 보장 조건과 현재 runtime tier classification owner.
- [[docs/decisions/pair-slot-generalization]] — deferred delivery 자동 retry와 source push notification의 post-MVP 재평가 지점 owner.

### Phase 2 — Expansion Prerequisites

**목표**

vendor 확장과 더 큰 topology를 가능하게 하는 구조적 전제 조건을 닫는다.

**진입 조건 / 경계**

- 공개 release path가 안정화된 뒤 시작한다.
- ingress generalization, `state.ts` decomposition, pair-to-N-agent route generalization이 우선 전제다.
- compose, third vendor, durable store/mailbox replay, 추가 view driver는 G2가 아니라 Phase 2 범위다.
- durable persistence를 공개 release blocker로 승격할 때는 stable daemon identity와 restart-safe reply idempotency, 이미 발급된 messageId/deliveryId 및 consumed reply-right history 보존을 함께 닫아야 한다. 이들이 불명확하면 restart/replay가 중복 reply, 잘못된 reply 귀속, stale daemon state 복원을 만들 수 있으므로 durable store 자체보다 먼저 blocker framing을 확정한다.
- G3가 `claude_channel_disconnected` event 또는 runtime diagnostics/tier-evaluator API를 Phase 0에서
  닫지 않고 명시 이연했다면, 이 phase가 adapter/events boundary cleanup으로 최종 disposition을 소유한다.
- 이 카드는 phase pointer이므로 gate식 착수 검토/통과 조건 슬롯을 강제하지 않는다.

**주요 범위**

- ingress generalization과 adapter boundary 정리.
- runtime events surface와 diagnostics/tier-evaluator API의 adapter boundary 정리.
- pair-to-N-agent route generalization.
- pair CLI가 reservation만 만들지, agent launch·attach orchestration까지 맡을지와 그 실패·재시작 lifecycle 재논의.
- app-server MCP config isolation hardening and capability projection boundary.
- group recipient visibility / shared group context prerequisite design.
- third vendor support.
- compose.yaml v1, config/onboarding split.
- extra view drivers.
- durable store와 mailbox replay.
- native Windows community path.

**Owner refs**

- [[docs/product/roadmap]] — Phase 2 구조 전제와 포함/제외 경계 owner.
- [[docs/specs/aiox-compose-contract]] — compose, user config, view driver target 계약과 미구현 caveat owner.
- [[docs/specs/aiox-adapter-model]] — adapter registry implementation gap과 runtime diagnostics/tier-evaluator API caveat owner.
- [[docs/specs/aiox-open-deferred]] — group recipient visibility/shared group context와 deferred runtime/session policy owner.
- [[docs/decisions/codex-app-server-mcp-injection-and-isolation]] — app-server MCP config isolation hardening과 capability projection 재평가 owner.
- [[docs/decisions/pair-slot-generalization]] — 현재 2-slot 결정과 future N-agent 재평가 지점 owner.
- [[docs/architecture/local-runtime-gaps-and-targets]] — channel disconnect event, durable persistence, adapter registry, reliability target의 architecture pressure owner.

### Phase 3 — Remote And Federation

**목표**

single-machine release path를 넘어 remote MCP exposure, internal federation, A2A Protocol bridge를 순서 있게 확장한다.

**진입 조건 / 경계**

- envelope와 daemon model이 transport-independent하게 유지되고, Phase 2의 local expansion 전제가 충분히 닫힌 뒤 시작한다.
- Phase 3 순서는 L2 mobile remote MCP exposure, L1 internal federation, L3 A2A Protocol bridge로 둔다.
- remote/federation은 Phase 0 약속이 아니며, lower scope protocol contract를 깨지 않는 additive extension이어야 한다.
- exploratory phase이므로 세부 구현 checklist와 federation contract 본문은 이 카드에 복사하지 않는다.

**주요 범위**

- mobile/remote client가 local aiox MCP surface에 안전하게 도달할 수 있는 L2 가설 검증.
- daemon-to-daemon WebSocket over HTTPS와 token/mTLS 방향의 L1 internal federation.
- 외부 vendor 또는 A2A Protocol bridge인 L3 검토.
- remote registration, daemon auth, signed envelope, replay protection, partial failure policy 같은 deferred federation topics의 단계별 승격.

**Owner refs**

- [[docs/product/roadmap]] — Phase 3 post-release 순서와 Phase 0 제외 경계 owner.
- [[docs/specs/aiox-federation-remote]] — location-ready protocol 원칙, transport 방향, L2/L1/L3 sequencing owner.
- [[docs/specs/aiox-open-deferred]] — remote/federated delivery deferred state owner.

## Gate Evidence

Gate completion requires reproducible evidence, not only a status label. 각 gate card의 `통과 조건`은 의미를 설명하고, 이 섹션은 증거 종류를 요약한다.

| Gate | Required evidence                                                                                                                                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G0   | versioned schema/example validation, CLI/config/package decision record, support matrix                                                                                                   |
| G1   | canonical schema and typed tool fixture sync, Codex ingress evidence, automated Codex<->Claude integration, retry/idempotency/offline queue/stale runtime/active-turn/auth negative tests |
| G2   | tmux path and no-tmux fallback clean-user smoke, README command match                                                                                                                     |
| G3   | client crash isolation, fatal handler exit, SIGTERM child cleanup, bounded body/queue, log redaction, doctor diagnosis tests                                                              |
| G5   | secret/PII/path scan, tracked-vs-local file review, dead/scaffold code disposition, LICENSE/README/SECURITY/CONTRIBUTING/issue template presence and link check                           |
| G6   | npm pack, tarball content assertion, clean temp install, executable/version/help/start-stop smoke                                                                                         |
| G4   | same immutable G0-G6 candidate verified on macOS/Linux CI or recorded clean-host runs with retained diagnostics                                                                           |

Each evidence item records setup command, supported runtime version, timeout, expected state transition and failure artifact location. Demo GIFs and manual recordings are adoption assets, not gate evidence.

## Cross-Platform Requirement

Cross-platform support is not a late separate phase. It constrains Phase 0 gates and Phase 2 design.

- G1 keeps protocol and envelope decisions transport-neutral.
- G1/G3 absorb OS launch, shell, path, permission and signal differences in adapters and daemon lifecycle.
- G2 provides tmux as the minimum driver and a no-tmux fallback, without making terminal automation core protocol.
- G5/G6 verify public repo and npm packaging behavior against the supported matrix.
- Phase 2 compose/config work uses OS-neutral declarations and leaves OS-specific command/path/env handling to compiler, recipe or plugin layers.
- G4 certifies the supported matrix before public release.
