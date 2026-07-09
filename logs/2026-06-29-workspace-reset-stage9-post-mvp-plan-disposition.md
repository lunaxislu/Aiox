---
topic: workspace reset stage9 post-mvp plan disposition
description: workspace reset plan stage 9 — `plans/post-mvp*` legacy execution plans and `prd/post-mvp/aiox-a2a-spec.md` pending execution detail rows are reconciled by creating or selecting a single A2A execution plan successor, then roadmap/source-map references and deletion disposition are decided.
status: decided
---

## Work Items

- [x] W1 현재 `plans/post-mvp*` 실행 내용과 successor 필요 범위 확정 — `plans/post-mvp.plan.md`, `plans/post-mvp/*.plan.md`, roadmap `Current Execution Candidates`, source map pending rows를 대조해 단일 A2A execution plan이 흡수해야 할 실행 detail과 보존 예외를 식별한다. 완료 2026-07-08.
- [x] W2 단일 A2A execution plan successor 작성 또는 기존 owner 지정 — legacy sub-plan의 checklist/detail을 복사하지 않고 현재 spec/roadmap/architecture 기준으로 실행 가능한 successor plan 구조를 만든다. 완료 2026-07-08 — `plans/a2a-execution.plan.md` 초안 작성. W3 repoint 전 사용자 successor 확인 권장(아래 기록 "검토 요청").
- [x] W3 roadmap/source map 정합 — `docs/product/roadmap.md`의 transitional `Current Execution Candidates` 4 row를 `plans/a2a-execution.plan.md` successor slice로 repoint하고(4 row 유지), `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`의 6개 `keep / execution successor pending` rows를 `successor linked; deletion pending W4 gate` 중간 상태로 재판정했다. 완료 2026-07-08.
- [x] W4 삭제 disposition gate — successor와 source map self-sufficiency를 검증하고, **사용자 승인 뒤에만** `plans/post-mvp*`와 관련 pending legacy 원문의 물리 삭제 여부를 실행한다. 사용자 승인 전에는 어떤 물리 삭제도 하지 않는다. **완료 2026-07-08: 사전 보정 A/B/C 후 6개 파일 물리 삭제, source-map final disposition 확정, dead-ref VERDICT none.**

## Required Context

### Return Target

- None: independent log.

## 2026-06-29 · stage9 착수 — post-mvp legacy plan disposition 로그 생성

Parent pointer: `plans/workspace-reset/workspace-reset.md` stage 9 (`plans/post-mvp*` 삭제 disposition)

@user 지시로 workspace reset plan의 다음 대기 단계를 활성화하고, 이 stage log를 생성했다.

**확인한 사실:**

- `plans/workspace-reset/workspace-reset.md` stage 9는 `plans/post-mvp*`의 실행 내용을 잇는 단일 A2A 실행 plan successor가 생긴 뒤에만 roadmap repoint, physical deletion, source map disposition 확정을 수행한다고 적고 있다.
- `docs/product/roadmap.md`의 `Current Execution Candidates`는 임시 매핑이며 장기 roadmap 구조나 실행 진행 상태의 기준이 아니라고 명시한다. 표에는 4개 sub-plan이 남아 있다:
  - `plans/post-mvp/envelope-metadata.plan.md`
  - `plans/post-mvp/codex-structured-metadata-spike.plan.md`
  - `plans/post-mvp/adapter-dispatch-registry.plan.md`
  - `plans/post-mvp/channel-boot-surface.plan.md`
- `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` W5는 stage 6 target rows는 물리 삭제까지 소비됐지만, `plans/post-mvp*`와 `prd/post-mvp/aiox-a2a-spec.md`는 `keep / execution successor pending`으로 stage 9가 소비해야 하므로 source map 로그가 open이라고 기록한다.
- 현재 파일로는 `plans/post-mvp.plan.md`와 4개 sub-plan이 존재한다.
- `plans/post-mvp.plan.md`는 post-MVP implementation index이며, `Session Re-entry` 안에 오래된 운영환경 셋업 상태와 async-petting-hoare scratch pointer를 포함한다.
- `plans/post-mvp/envelope-metadata.plan.md`는 Local single-daemon A2A의 next kickoff candidate로, A2A envelope/lifecycle migration scope, increments, acceptance criteria, verification, kickoff checklist를 담는다.
- `plans/post-mvp/codex-structured-metadata-spike.plan.md`는 Codex structured metadata path 조사 후보이며, envelope/lifecycle plan scope를 조정할 수 있는 병행 조사로 남아 있다.
- `plans/post-mvp/adapter-dispatch-registry.plan.md`와 `plans/post-mvp/channel-boot-surface.plan.md`는 deferred execution sub-plan이며 각각 spec §5 adapter/runtime surface 관련 실행 detail을 담는다.

**판정:**

- 이 stage의 첫 행동은 삭제가 아니다. 먼저 기존 post-mvp index/sub-plan 5개와 source map pending row가 담은 실행 detail 중 단일 A2A execution plan successor가 흡수해야 할 범위를 확정해야 한다.
- roadmap의 `Current Execution Candidates`는 transitional mapping이므로, successor가 생기기 전에는 삭제나 repoint를 선행하지 않는다.
- `async-petting-hoare` 운영 라인은 workspace reset plan stage 9 문장에 별도 보존이라고 적혀 있으므로, W1에서 `plans/post-mvp.plan.md`의 stale session re-entry와 A2A execution successor 범위를 분리해 판정한다.

**다음 행동:**

- W1부터 진행한다. 읽을 범위는 `plans/post-mvp.plan.md`, `plans/post-mvp/*.plan.md`, `docs/product/roadmap.md`의 `Current Execution Candidates`, `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`의 pending rows와 W5, 그리고 successor가 참조해야 할 현행 owner 문서(`docs/specs/aiox-a2a.md`, `docs/product/roadmap.md`, 관련 architecture/decision)다.

## 2026-07-08 · W1 완료 — 단일 A2A execution successor 흡수 범위 확정

@user 지시로 W1 범위 대조를 subagent 병렬 조사와 controlling agent 재확인으로 수행했다. 파일 수정은 이 로그의 Work Items/기록 갱신만 수행했고, legacy plan·roadmap·source map·owner 문서 본문은 수정하지 않았다.

**조사 분담:**

- Subagent 1: `plans/post-mvp.plan.md`와 `plans/post-mvp/*.plan.md`의 실행 detail, stale 항목, 보존 예외를 분류했다.
- Subagent 2: `docs/product/roadmap.md` `Current Execution Candidates`와 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` pending rows/W5의 successor·repoint·삭제 제약을 확인했다.
- Subagent 3: 현행 owner 문서(`docs/specs/aiox-a2a.md`와 split slice, roadmap, architecture, decisions) 기준으로 legacy theme과 충돌/보정 지점을 확인했다.
- Controlling agent가 동일 범위를 직접 대조해 subagent 결과를 수용·보정했다.

**확인한 사실:**

- `plans/post-mvp.plan.md`는 post-MVP execution index이며 production authority가 아니라고 선언한다. 현재 kickoff는 Local single-daemon A2A이고 entry point는 `plans/post-mvp/envelope-metadata.plan.md`, 병행 조사 후보는 `plans/post-mvp/codex-structured-metadata-spike.plan.md`다.
- `plans/post-mvp/envelope-metadata.plan.md`는 §4 envelope/lifecycle execution detail을 가진다: typed metadata input, payload marker 제거, protocol/message/delivery id, source-only reply routing, delivery rendering, send 접수와 원격 응답 완료 분리, no sleep/polling guidance, dual adapter cutover, tests/smoke, increment/checklist.
- `plans/post-mvp/codex-structured-metadata-spike.plan.md`는 Codex `turn/start` 또는 app-server surface가 A2A metadata를 structured context로 운반할 수 있는지 조사하는 spike다.
- `plans/post-mvp/adapter-dispatch-registry.plan.md`와 `plans/post-mvp/channel-boot-surface.plan.md`는 §5 adapter/runtime surface execution detail이다. 전자는 production dispatch의 Codex/Claude 분기 제거, 후자는 Claude channel-server boot failure를 attach/daemon diagnosability에 surface하는 후보를 담는다.
- `docs/product/roadmap.md`의 `Current Execution Candidates`는 임시 mapping이며 장기 roadmap/status authority가 아니다. 현재 4개 sub-plan path를 가리킨다.
- source map의 stage 9 미소비 rows는 `prd/post-mvp/aiox-a2a-spec.md`와 `plans/post-mvp.plan.md` + 4개 sub-plan이다. 모두 `keep / execution successor pending` 상태다.
- `docs/specs/aiox-a2a.md`는 Atlas split 뒤 compatibility index이며 §4/§5/§9 본문은 각각 `docs/specs/aiox-message-lifecycle.md`, `docs/specs/aiox-adapter-model.md`, `docs/specs/aiox-open-deferred.md`가 소유한다.
- roadmap의 현재 release gate 구조는 G1 Local Stable A2A Round Trip을 `G1-A contract/ingress`, `G1-B envelope cutover`, `G1-C reliability`, `G1-D trust boundary`로 나눈다.

**추론 / 판정:**

- 단일 successor는 legacy sub-plan을 그대로 병합한 문서가 아니라, G1/G3 gate와 현행 split owner 문서를 기준으로 재작성되는 execution plan이어야 한다.
- successor의 첫 active slice는 G1-A/B 중심의 canonical envelope/lifecycle cutover다. `envelope-metadata`의 실행 detail은 흡수하되, 권위 문장과 용어는 현행 `aiox-message-lifecycle` 기준으로 보정한다.
- Codex structured metadata spike는 Tier 2 승격 근거가 아니라 G1-A evidence / ordering decision이다. `aiox-open-deferred`가 말하듯 현재 local code는 `turn/start` 등 일부 surface만 확인됐고 canonical `deliveryId` binding, active-turn policy, Tier 2 delivery semantics는 검증 전이다.
- adapter dispatch registry는 현재 contract가 아니라 implementation gap / later execution candidate다. `aiox-adapter-model`은 production path에 direct Codex/Claude branch가 남아 있음을 caveat로 둔다.
- channel boot surface는 Claude-specific G3/G1 diagnosability work로 다뤄야 하며, Codex runtime startup/failure wiring까지 일반화한 broad child-process boot contract로 확장하면 안 된다.
- `async-petting-hoare` 운영환경 셋업 라인은 A2A execution successor에 흡수하지 않는다. `plans/post-mvp.plan.md`의 stale Session Re-entry 안에서 보이는 별도 보존 pointer로만 취급한다.
- `prd/post-mvp/aiox-a2a-spec.md`는 W8/W9/W10 owner 흡수가 끝났더라도 §11 execution detail 때문에 단일 successor 작성 후 stage 9에서 source map final disposition을 재판정해야 한다.

**Successor 범위:**

- 흡수: Local single-daemon A2A execution 흐름, G1-A/B/C/D와 G3 boundary mapping, `envelope-metadata`의 increment/acceptance/verification/checklist, Codex structured metadata spike의 조사 질문·산출물·검증, adapter registry와 channel boot surface의 later candidate detail.
- 보정: legacy `reply_expected` 문구는 wire contract에서 `replyExpected`; reply correlation은 `parent_message_id`가 아니라 `inReplyToDeliveryId`; `thread_status`는 spec authority term이 아니므로 kickoff에서 current code naming과 lifecycle model에 맞춰 결정한다.
- 제외/보존: production/product/protocol authority 본문 복제, Phase 1.5 early-entry triggers의 gate화, WS1/AGENTS cleanup 상태, `async-petting-hoare` 운영 원문 상세.
- successor가 직접 참조해야 할 owner: `docs/product/roadmap.md`, `docs/specs/aiox-a2a.md`, `docs/specs/aiox-message-lifecycle.md`, `docs/specs/aiox-adapter-model.md`, `docs/specs/aiox-open-deferred.md`, `docs/architecture/local-agent-runtime.md`, `docs/architecture/local-runtime-routing-and-delivery.md`, `docs/architecture/local-runtime-codex-adapter.md`, `docs/architecture/local-runtime-claude-adapter.md`, `docs/architecture/local-runtime-gaps-and-targets.md`, `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`, `docs/decisions/pair-slot-generalization.md`, `docs/decisions/codex-per-agent-app-server.md`, `docs/decisions/claude-channel-trust-and-registration.md`.

**다음 행동:**

- W2로 진행한다. 단일 A2A execution plan successor를 새 plan으로 작성하거나 기존 owner를 지정한다. 후보 구조는 `plans/a2a-execution.plan.md` 같은 단일 파일이며, 기존 legacy checklist를 복사하지 않고 위 owner 문서 기준으로 G1/G3 execution slices와 acceptance/verification만 소유하게 한다.

## 2026-07-08 · W2 완료 — 단일 A2A execution plan successor 초안 작성

@user 지시로 W2를 subagent 병렬 자료수집(roadmap / spec / architecture·decision / legacy post-mvp plan) + controlling agent 직접 재확인으로 수행했다. 파일 변경은 새 `plans/a2a-execution.plan.md` 생성과 이 로그 갱신뿐이다. legacy plan·roadmap·source map·owner 본문은 수정하지 않았다.

**작성물:**

- `plans/a2a-execution.plan.md` — 단일 A2A execution plan successor 초안. `plans/AGENTS.md` 골격(제목·Objective·Completion condition·Stages, 활성 `[>]` ≤1)을 따르고 sibling `plans/post-mvp/*.plan.md`처럼 실행 detail을 본문에 소유한다. 구조: Objective · Authority Boundary · Completion condition · Source Disposition Map(표) · Stages(S1~S6, 전부 `[ ]` 미착수) · Execution Order(slice별 gate·release relevance·owner target·legacy source·acceptance·verification·owner-update checkpoint) · Deferred/Not In Scope · Notes.

**경로 선택 근거:**

- 후보 `plans/a2a-execution.plan.md`를 그대로 채택했다. `.plan.md` suffix는 sibling(`post-mvp.plan.md`, `envelope-metadata.plan.md`)과 일치하고, top-level 단일 파일이 네 sub-plan을 잇는 단일 successor라는 정체성에 맞다. 별도 폴더나 다른 경로가 더 낫다고 볼 근거는 없었다.

**확인한 사실(직접 재확인, subagent 결과 검증):**

- roadmap gate 구조: G1은 G1-A(contract/ingress)·G1-B(envelope cutover)·G1-C(reliability)·G1-D(trust boundary)로 나뉘고 네 단위 통과+인증 왕복 전에는 미완료(`docs/product/roadmap.md:43-54`). gate 순서 `G0 → G1/G3 병행 → G2 → G5/G6 → G4`(`:23-24`). G3는 daemon 안정화이며 durable store는 G3 gate 아님(`:66-76`).
- `Current Execution Candidates`는 임시 매핑이며 4개 sub-plan을 가리킨다(`:149-160`). envelope-metadata→G1-B/C kickoff, codex-spike→G1-A evidence+possible Phase 1 Tier 2 uplift, adapter-registry→G1 boundary+Phase 2 prerequisite, channel-boot→G3/G1 boundary.
- canonical envelope v1 wire key는 camelCase(`docs/specs/aiox-message-lifecycle.md:13-52`): `replyExpected`·`inReplyToDeliveryId`·`deliveryId`(reply correlation·idempotency 기준). `thread_status`는 어느 spec에도 없음. conclusion=`intent:"conclusion"`, reply obligation=`awaiting_reply|fulfilled|cancelled|expired`.
- adapter dispatch registry는 현행 contract가 아니라 Implementation Gap(`docs/specs/aiox-adapter-model.md`; production path에 direct Codex/Claude branch 잔존, decision `pair-slot-generalization` D6 이연).
- Codex structured metadata는 `docs/specs/aiox-open-deferred.md §9`에서 일부 surface만 확인·검증 전 Tier 2 금지. spike가 조사할 named app-server method는 `thread/inject_items`·`turn/steer`·`turn/started|completed`·`outputSchema`·`thread/tokenUsage/updated`.
- `async-petting-hoare` scratch pointer 원문: `~/.claude/plans/async-petting-hoare.md`(WS1~4 원본 상세, Claude scratch) — repo 밖 개인 scratch. 별도 보존 대상이며 흡수 안 함.

**추론 / 판정:**

- successor는 네 sub-plan을 병합한 문서가 아니라 G1/G3 gate와 split owner 기준으로 재작성한 slice 목록이다. slice 순서: S1 G1-A(+Codex spike, S2 render 선행 결정) → S2 G1-B(envelope cutover, spike 의존) → S3 G1-C / S4 G1-D(§4 schema 고정 후 병행) → S5 G3/G1 boundary(Claude 한정 진단성, G1과 병행) → S6 adapter registry(deferred, release-blocking 아님, Phase 2 prerequisite).
- W1의 흡수/보정/제외 범위를 그대로 실행 구조로 옮겼다. 필수 보정(`reply_expected`→`replyExpected`, `parent_message_id`→`inReplyToDeliveryId`, `thread_status`→intent=conclusion+obligation 명칭 S2 확정, `awaiting_agent_reply`↔`awaiting_reply` 정합, spike surface 보정)을 Source Disposition Map에 명시했다.
- envelope decision이 연 두 항목(correlated-reply authorization 경로 모델, public `deliveryId` namespace)을 S2가 "가정 금지, 반드시 결정"으로 소유하게 배치했다. 이는 spec/decision이 open으로 남긴 것을 실행 시 결정→owner 반영하도록 checkpoint로 연결한 것이다.
- adapter registry(S6)와 channel boot surface(S5)의 과확장 방지를 Deferred/범위 가드에 명시했다. channel boot는 Claude 한정, adapter registry는 current contract화 금지.

**검토 요청(blocker 아님, W3 전 확인 권장):**

- 구조 판단: `plans/AGENTS.md` 골격은 얇은 stage-pointer plan을 규정하는데("plan은 단계 순서·상태·포인터만 소유"), sibling `post-mvp/*.plan.md`는 실행 detail을 본문에 소유한다. successor는 후자(deliverable execution plan) 성격이 강해 `## Stages`(얇은 slice 목록)와 `## Execution Order`(rich detail)를 함께 두는 절충을 택했다. 이 이중 구조가 적절한지, 아니면 detail을 slice별 stage 로그로 밀어야 하는지는 사용자 확인 여지가 있다.
- W3(roadmap Current Execution Candidates repoint)는 이 successor를 대상으로 삼으므로, repoint 실행 전 successor 초안을 사용자가 확인하는 것이 안전하다.

**다음 행동:**

- W3로 진행한다. `docs/product/roadmap.md` `Current Execution Candidates`의 4개 sub-plan 링크를 `plans/a2a-execution.plan.md` successor 기준으로 repoint하고, `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`의 `keep / execution successor pending` rows를 재판정한다. 단 repoint는 owner 문서 수정이므로 위 "검토 요청"의 successor 확인을 받은 뒤 실행한다. `plans/post-mvp*` 물리 삭제와 source-map final disposition은 W4(사용자 승인 게이트).

## 2026-07-08 · W2 보정 — successor plan 구조를 `plans/AGENTS.md` 계약에 맞춰 얇게 정리

@user 지시로 W2 산출물 `plans/a2a-execution.plan.md`의 구조를 보정했다. W2는 이미 완료 상태이며 이 보정으로 되돌리지 않는다(W2 `[x]`, W3 `[>]` 유지). 파일 변경은 `plans/a2a-execution.plan.md` 재작성과 이 로그 append뿐이다. roadmap·source map·spec/architecture/decision owner 본문은 수정하지 않았다.

**보정 계기(확인한 사실):**

- `plans/AGENTS.md:42-43`은 "plan은 단계 순서, 상태와 단계 로그 포인터만 소유한다. 단계의 목표 세부, 토론, 판정, 검증 결과와 재개 context는 가리키는 단계 로그가 소유한다"고 규정한다.
- 보정 전 `plans/a2a-execution.plan.md`는 `## Execution Order`에서 S1~S6 각각의 acceptance·verification·owner-update checkpoint를 상세히 소유했다. 이는 위 계약과 충돌하는 rich detail이며, W2 완료 기록의 "검토 요청"이 self-flag한 이중 구조(`## Stages` 얇은 목록 + `## Execution Order` rich detail)였다.
- `docs/decisions/AGENTS.md:17`은 "결정 결과가 바뀌면 product/spec/architecture/roadmap을 갱신한다. 기존 decision을 현재 상태로 패치하지 않는다. 새 rationale이 필요하면 새 decision을 만든다"고 규정한다. 보정 전 plan의 S2 owner-update checkpoint "decision Re-evaluation 갱신" 및 S3/S4/S6의 유사 표현은 decision을 living status owner처럼 보이게 할 여지가 있었다.

**추론 / 판정:**

- successor plan은 sibling `plans/post-mvp/*.plan.md`의 rich-detail 관행이 아니라 `plans/AGENTS.md` 얇은 stage-pointer 계약을 따라야 한다. W2의 "이중 구조가 적절한지" 검토 요청에 대한 판정: `## Execution Order`를 제거하고 상세를 각 slice 착수 stage 로그로 넘긴다.
- 단, legacy source → slice mapping은 W3(roadmap repoint·source-map 재판정)의 근거이므로 정보 손실이 나면 안 된다. 이 mapping은 이미 `## Source Disposition Map` 표와 `### 필수 보정` subsection이 소유하므로, 이 둘은 유지한다. 이는 owner 본문 복제가 아니라 legacy→successor disposition mapping이라 얇은 plan이 소유해도 계약 위반이 아니다.

**수정 내용:**

- `## Execution Order` 섹션(S1~S6 slice별 Roadmap gate·Release relevance·Owner target·Legacy source·Acceptance·Verification·Owner-update checkpoint) 전체 제거.
- `## Stages` 도입 문장 보정: 각 slice의 상세 acceptance/verification/owner-update는 plan이 소유하지 않고, 각 slice 착수 stage 로그가 owner docs를 대조해 소유·검증한다고 명시. slice 불릿은 한 줄 gate 앵커 + 의존/병행 관계 수준으로 유지(S2에 envelope decision open 2항목 결정, S5에 broad boot contract 일반화 금지 힌트 유지).
- `## Authority Boundary` 보정: "실행 sequencing, slice 분해, acceptance 조건, verification path, owner-update checkpoint만 소유" → "실행 sequencing과 slice 분해, 각 slice가 앵커된 gate·owner mapping만 소유. slice별 상세 acceptance/verification/owner-update 반영은 착수 stage 로그가 소유". owner 링크 목록(각 slice 참조 앵커)은 유지.
- `## Completion condition` decision 표현 보정: 두 open 항목이 S2에서 결정되면 그 결과(current outcome/status)는 spec/architecture/roadmap owner에 반영하고, 새 rationale이 필요하면 새 decision을 작성하며 기존 decision은 provenance/link만 보수한다(decision을 current-state owner로 패치하지 않는다)로 명시. owner-update checkpoint 충족 → 착수 stage 로그가 정한 owner 반영으로 표현 조정.
- `## Deferred / Not In Scope` W3/W4 경계 명확화: 기존 한 불릿("W3/W4 범위다")을 W3(정합, 물리 삭제 아님)과 W4(삭제 gate, 사용자 승인)로 분리하고, W3가 roadmap 4개 legacy row repoint 시 successor + slice mapping을 보존하고 source-map pending rows를 successor 연결 상태로 재판정(중간 재판정)함을 명시.
- `## Notes` 보정: "sibling처럼 실행 detail을 본문에 소유한다" 문장 제거, 얇은 stage-pointer plan임을 명시. Source Disposition Map 유지 근거(mapping이지 owner 복제 아님)와 W3가 이 mapping을 근거로 정보 손실 없이 수행함을 추가. Sources에 W2를 successor 작성·구조 보정으로 갱신.

**보존된 legacy source → slice mapping(정보 손실 없음 확인):**

- `## Source Disposition Map` 표: `plans/post-mvp.plan.md`, envelope-metadata, codex-spike, adapter-dispatch-registry, channel-boot-surface, `prd/post-mvp/aiox-a2a-spec.md §11`의 6개 row 전부 유지(disposition·target slice 그대로).
- `### 필수 보정` subsection: `reply_expected`→`replyExpected`, `parent_message_id`→`inReplyToDeliveryId`, `thread_status`→intent=conclusion+obligation 명칭, `awaiting_agent_reply`↔`awaiting_reply`, Codex spike named surface 보정 전부 유지.

**W3 진행 조건:**

- W3는 owner 문서(`docs/product/roadmap.md`) 수정이므로, W2 완료 기록의 "검토 요청"에 있던 successor 초안 사용자 확인을 받은 뒤 실행한다. 구조 보정으로 "이중 구조 적절성" 검토 항목은 해소됐으나, repoint 대상이 이 successor라는 확인은 여전히 필요하다.
- W3 수행 시 roadmap 4개 legacy row는 하나로 뭉개지 말고 successor + slice mapping(Source Disposition Map 기준)을 보존해 repoint한다. source-map pending rows는 successor 연결 상태로 재판정하되 물리 삭제·final deletion disposition은 하지 않는다(W4).
- `plans/post-mvp*` 물리 삭제, source-map final deletion disposition은 W4 사용자 승인 게이트 유지.

## 2026-07-08 · W3 완료 — roadmap repoint + source-map 중간 재판정

@user 지시로 W3를 수행했다. 지시에서 successor(`plans/a2a-execution.plan.md`)를 명시적으로 지목하고 slice 방향(envelope→S1/S2/S3, codex-spike→S1, adapter→S6, channel-boot→S5)까지 제시했으므로, W2 완료 기록이 대기시킨 "repoint 대상이 이 successor라는 사용자 확인" 조건이 충족됐다. 수정 파일은 `docs/product/roadmap.md`, `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`, 이 stage 9 로그다. legacy `plans/post-mvp*` 원문, `prd/post-mvp/aiox-a2a-spec.md`, spec/architecture/decision owner 본문은 수정하지 않았다.

**확인한 사실:**

- roadmap `## Current Execution Candidates`(수정 전 `docs/product/roadmap.md:149-160`)는 4 row가 legacy sub-plan 4개(`plans/post-mvp/envelope-metadata.plan.md`, `codex-structured-metadata-spike.plan.md`, `adapter-dispatch-registry.plan.md`, `channel-boot-surface.plan.md`) path를 직접 가리키고 있었다.
- `docs/product/AGENTS.md`의 `Current Execution Candidates` owner 규칙: "roadmap과 plan의 매핑만 소유한다. plan task 내용은 `plans/`가 소유하고, successor plan 생성과 repoint는 owning plan/log가 소유한다." + Roadmap Change Rules "Retire transitional content: successor owner가 생기면 stale 여부를 확인하고 축약, repoint, 삭제 후보를 비교한다." → successor가 생긴 지금 repoint가 규칙에 부합한다.
- `prd/post-mvp/aiox-a2a-spec.md §11`(`:901-1030`)은 release roadmap gate DoD(G0~G6, G1-A/B/C/D 분해)·Phase·gate evidence contract를 담는다. 이는 이미 `docs/product/roadmap.md`의 Release Gates/Phases/Gate Evidence가 흡수한 권위이고, successor plan은 이 gate를 slice의 gate 앵커로만 참조한다(본문 복제 없음).
- successor `plans/a2a-execution.plan.md`의 `## Source Disposition Map`이 legacy source→slice mapping과 필수 보정을 이미 소유한다(envelope→S1/S2, codex-spike→S1, adapter→S6, channel-boot→S5, §11→gate 앵커 참조).
- source-map 로그의 stage 9 미소비 6 row는 모두 `keep / execution successor pending` 상태였다(`:26`, `:55-59`).

**추론 / 판정:**

- envelope/lifecycle migration row의 원래 roadmap mapping은 "G1-B/G1-C kickoff"였다. successor Source Disposition Map은 envelope-metadata를 S1(G1-A)·S2(G1-B)로 매핑하지만, envelope-metadata plan의 delivery lifecycle·async 경계·timeout=pending threshold·retry 인접 내용은 reliability(G1-C=S3)로 이어진다. 따라서 이 candidate를 `S1 → S2 → S3`로 repoint해 원래 G1-B/G1-C kickoff 의미(특히 G1-C reliability 연결)를 보존했다.
- adapter-dispatch-registry는 S6(deferred, Phase 2 prerequisite, release-blocking 아님) 성격을 유지했다. release blocker로 승격하지 않았다.
- channel-boot-surface는 S5(G3/G1 boundary, Claude 한정 진단성)로 유지했다. broad child-process boot contract로 일반화하지 않았다(sub-plan `:43`이 Codex 등 다른 startup surface를 별도 후보로 분리한 것과 정합).
- source-map 6 row 재판정은 final deletion이 아니라 중간 상태다. successor가 존재하게 됐으므로 `keep / execution successor pending` → `successor linked; deletion pending W4 gate`로만 올린다. 물리 삭제 가능 확정이라고 쓰지 않았다.

**수정한 파일과 방식:**

- `docs/product/roadmap.md` `## Current Execution Candidates`:
  - 4 row를 유지(하나로 뭉개지 않음)하고 각 row의 plan 링크를 legacy sub-plan → `plans/a2a-execution.plan.md` + slice로 repoint. 컬럼 헤더 `Plan` → `Successor slice`.
  - repoint 매핑: envelope/lifecycle → `S1 → S2 → S3`(G1-A/B/C), codex-spike → `S1`(G1-A evidence), adapter-registry → `S6`(deferred, not release-blocking), channel-boot → `S5`(G3/G1 boundary, Claude 한정).
  - note callout을 "실행 detail과 slice별 acceptance/verification은 successor plan `plans/a2a-execution.plan.md`의 slice가 소유한다"로 보정. roadmap은 candidate가 어느 slice인지만 알게 하고 legacy source-map 상세는 담지 않음.
- `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`:
  - 6 row disposition column을 `successor linked (2026-07-08 W3) → <slice>; deletion pending W4 gate (물리 삭제 미확정, 사용자 승인 필요)`로 재판정.
  - dated 기록 `## 2026-07-08 · stage 9 W3 — successor linked 중간 재판정`을 추가해 legacy source→slice mapping 표와 async-petting-hoare 경계(successor 제외·repo 밖 scratch 별도 보존)를 source-map/log가 소유하게 했다.
  - source map은 W4(물리 삭제 게이트) 소비 전까지 `open` 유지, W5는 이 W3로 닫지 않음을 명시.

**`plans/a2a-execution.plan.md` `Source Disposition Map` 처리 판정(축약 안 함):**

- 결정: successor plan의 `## Source Disposition Map`과 `### 필수 보정`을 **수정하지 않고 그대로 둔다.**
- 근거:
  1. `### 필수 보정`(reply_expected→replyExpected, parent_message_id→inReplyToDeliveryId, thread_status→intent=conclusion+obligation 명칭, awaiting_agent_reply↔awaiting_reply, Codex spike named surface)은 successor의 실행 scope를 정의하는 고유 소유물로 roadmap·source-map 어디에도 중복되지 않는다.
  2. `Source Disposition Map`은 successor의 **흡수/보정/제외 scope**를 정의한다. 이는 source-map 로그가 소유하는 **deletion disposition**(keep/pending gate/삭제)과 축이 다르고, roadmap이 소유하는 **candidate→slice mapping**과도 다르다. 세 문서가 겹치는 것으로 보여도 소유 축이 달라 중복 owner가 아니다.
  3. W4는 물리 삭제 게이트다. 삭제 직전 단계에서 traceability 소스를 제거하면 W4 검증 체인이 끊길 위험이 있다. 6 row 규모라 "얇은 stage-pointer plan"에 과부하도 아니다.
- plan `Notes`가 이미 "Source Disposition Map과 필수 보정은 owner 본문 복제가 아니라 legacy→successor disposition mapping이므로 이 plan이 유지한다"고 밝히고, `Deferred / Not In Scope`가 W3/W4 경계를 stage 9 로그 소유로 명시하므로, plan 본문을 추가 수정하지 않아도 정합이 유지된다.

**W4 착수 전 남은 검증 / 승인 조건:**

- 물리 삭제는 되돌릴 수 없고 plan Notes·source-map 삭제 가드상 **사용자 승인이 선행**돼야 한다. W4는 사용자 승인 전 어떤 물리 삭제도 하지 않는다.
- W4 착수 시 검증할 self-sufficiency: (a) `plans/a2a-execution.plan.md` successor가 4 sub-plan의 실행 detail을 slice로 잇는지, (b) source-map 6 row의 successor 링크가 삭제 후에도 legacy→slice traceability를 남기는지, (c) `prd/post-mvp/aiox-a2a-spec.md` 전체 파일 삭제 시 §2-§9 protocol contract(spec successor)·§11 gate(roadmap successor)·§13(architecture/roadmap successor)가 self-contained한지.
- async-petting-hoare 운영 라인은 A2A successor 제외이며 repo 밖 scratch로 별도 보존한다. `plans/post-mvp.plan.md` 삭제 시 이 scratch pointer가 successor로 이전 대상이 아님을 W4에서 재확인한다.

**다음 행동:**

- W4로 진행 대기. 단 W4는 삭제 게이트이므로 **사용자 승인 전에는 `plans/post-mvp*`·`prd/post-mvp/aiox-a2a-spec.md` 물리 삭제와 source-map final deletion disposition을 수행하지 않는다.** 사용자에게 successor·source-map self-sufficiency 검증 결과를 보고하고 삭제 승인을 받은 뒤에만 W4를 실행한다.

## 2026-07-08 · W3 후속 reconcile — roadmap/source-map 문구와 envelope S3 traceability 보정

@user 지시로 W3 검토에서 나온 저위험 보정 3건을 반영했다. W3는 완료 상태로 유지하고, W4
next pointer는 바꾸지 않았다. 물리 삭제·final deletion disposition은 수행하지 않았다.

**확인한 사실:**

- `docs/product/roadmap.md`의 `Current Execution Candidates` note가 "acceptance/verification은
  successor plan slice가 소유"처럼 읽혀, `plans/a2a-execution.plan.md`의 "slice 착수 stage 로그가
  owner docs를 대조해 소유" 경계와 표현이 어긋났다.
- roadmap/source-map은 envelope legacy row를 S1→S2→S3(G1-A/B/C)로 보존했지만,
  `plans/a2a-execution.plan.md`의 envelope disposition row는 S1/S2 중심으로 적혀 있었다.
- source-map 로그의 최신 row와 dated block은 `successor linked; deletion pending W4 gate`였지만,
  Work Items W5 문구에는 과거 `keep / execution successor pending` 상태가 남아 있었다.

**수정 내용:**

- `docs/product/roadmap.md` note를 "acceptance/verification은 각 successor slice 착수 stage 로그가
  owner docs를 대조해 소유한다"로 보정했다.
- `plans/a2a-execution.plan.md` Source Disposition Map의 `envelope-metadata.plan.md` row에
  delivery lifecycle/reliability 인접 실행 detail → S3(G1-C)를 추가해 roadmap/source-map의
  S1→S2→S3 traceability와 맞췄다.
- `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` W5 Work Item을 현재 상태
  `successor linked; deletion pending W4 gate`로 reconcile했다.

**다음 행동:**

- W4 삭제 disposition gate로 진행 대기. W4는 먼저 self-sufficiency를 검증하고 사용자 승인 뒤에만
  물리 삭제와 source-map final deletion disposition을 실행한다.

## 2026-07-08 · W4 self-sufficiency 검증 — 삭제 가능 확인 (물리 삭제 미실행, 승인 게이트 대기)

@user 지시로 W4의 1단계인 "삭제 가능 self-sufficiency 검증"을 수행했다. **어떤 물리 삭제도
하지 않았고, final deletion disposition도 확정하지 않았다.** W4는 active `[>]` 유지. 파일 변경은
이 로그 append뿐이며 owner 문서·legacy 원문·successor·source-map 본문은 수정하지 않았다.

**검증 방법:**

- subagent 2개 병렬 조사 + controlling agent 직접 owner-doc 재검증(`AGENTS.md`: 타 에이전트 판단
  맹신 금지). Axis A = `plans/post-mvp*` 5개를 successor·roadmap·source-map·owner docs와 대조,
  Axis B = `prd/post-mvp/aiox-a2a-spec.md` §2–§13을 지정 owner 문서 실물과 section별 대조.
- controlling agent가 `docs/specs/aiox-message-lifecycle.md`(§4), `docs/specs/aiox-adapter-model.md`(§5),
  `docs/specs/aiox-open-deferred.md`(§9), `docs/architecture/local-runtime-gaps-and-targets.md`(§13),
  `docs/product/product.md`, `docs/architecture/local-runtime-claude-adapter.md`(§6), `docs/decisions/pair-slot-generalization.md`,
  `docs/product/roadmap.md`를 직접 열어 subagent 판정을 재확인·수용했다. 아래 ✓는 controlling
  agent가 owner 문서 실물에서 직접 확인한 항목이다.

**확인한 사실 — PRD monolith §2–§13 owner self-containment:**

- §2/§3 → `docs/specs/aiox-a2a.md` index가 glossary·layer model을 verbatim + code evidence로 소유. ✓
- §4 → `docs/specs/aiox-message-lifecycle.md`가 §4.1~§4.5 전문 + current caveats + code evidence 보유
  (legacy보다 정밀; correlated-reply authorization을 Open decision으로 보존해 successor S2 open 항목과 정합). ✓
- §5 → `docs/specs/aiox-adapter-model.md`가 4-slot·tier·matrix 전문 + "direct Codex/Claude dispatch
  branch = Implementation Gap, not Current Contract"(evidence `src/daemon/state.ts:1274-1277`) 보유. ✓
- §6/§7/§8/§9 → `aiox-compose-contract`·`aiox-capability-policy`·`aiox-federation-remote`·`aiox-open-deferred`
  slice가 소유. §9 slice는 legacy MVP PRD Open Product Issue #5(session expiry)까지 흡수. ✓(§9 직접 확인,
  §6/§7/§8은 index wikilink 연결 + Axis B가 verbatim 확인)
- §11 → `docs/product/roadmap.md`가 G0~G6 DoD·Phase·Gate Evidence·G1-A/B/C/D 분해 소유 +
  `plans/a2a-execution.plan.md` S1~S6 gate anchor. ✓
- §12 → `roadmap.md` Pre-Release Gap Summary가 gate/phase pressure로 흡수하고 "detailed file locations,
  severity labels and the dated audit snapshot are **intentionally excluded**"를 명시. P1/P2 중 load-bearing
  gap은 `docs/architecture/local-runtime-gaps-and-targets.md`가 code evidence와 함께 current gap으로 소유하며
  dated 원본·severity·파일목록은 W9 로그 provenance. ✓
- §13.2 architecture 부채 3축 → `roadmap.md` Phase 2 선행조건(ingress generalization·state.ts decomposition·
  pair-to-N-agent route generalization) + `pair-slot-generalization.md` Re-evaluation이 "a2a-spec 축 C"를 명시
  링크 + adapter-model/gaps 소유. 정량 수치(state.ts 1921행 등)는 code 재검증 가능·log provenance. ✓
- §13.3 DX 처방 → `roadmap.md` G3(JSONL structured logger·`aiox logs`·doctor 확장) + architecture atlas. ✓
- §13.6 product boundary → `docs/product/product.md` Scope("single-vendor 내부 협업은 각 vendor 1st-party
  담당")·Product Principles·External Positioning이 durable product scope로 소유. ✓
- §13.4/§13.5/§13.7 → non-authority/provenance. Google A2A positioning·Codex app-server reference는 owner
  (product.md External Positioning·`aiox-capability-policy`·codex decision) 소유. Microsoft APM 검토 지침
  (§13.4.7), kanbots/shadcn PR(§13.5), open-core/commercial 가설(§13.7)은 durable owner 미승격이며, §13.7은
  스스로 "release commitment/수익 예측/우선순위 아님"을 선언(zero load-bearing authority). W8/W10 로그 provenance.
  ✓(docs 전역 open-core/commercial 언급 0건 grep 확인)

**확인한 사실 — `plans/post-mvp*` 실행 detail 복원성:**

- `envelope-metadata.plan.md`: §4 increment 7개/§5 acceptance/§6 verification/§11 kickoff checklist가 spec §4
  + roadmap G1-A/B/C + Gate Evidence + successor S1→S2→S3 매핑·필수 보정으로 복원 가능. verbatim 없는 것 =
  additive structural pre-step cutover 전략, 2026-06-09/06-10 회귀 dated trace(결과 계약은 §4.2/§4.3에 증류됨,
  load-bearing 아님).
- `codex-structured-metadata-spike.plan.md`: §9 open-deferred가 named app-server surface(`thread/inject_items`,
  `turn/steer`, `turn/started|completed`, `outputSchema`, `thread/tokenUsage/updated`)와 verification 항목까지
  legacy보다 정밀하게 소유 → 완전 복원(가장 강한 delete-ready).
- `adapter-dispatch-registry.plan.md`: `pair-slot-generalization.md`(D6 Alternatives+Trade-offs+Re-evaluation)
  + adapter-model §5 + gaps §13 Adapter Registry로 sub-plan보다 풍부하게 복원. S6 deferred·Phase 2 prerequisite·
  non-release-blocking 연결 충분.
- `channel-boot-surface.plan.md`: roadmap S5+G3 + claude-adapter §6.2 + gaps §13 + pair-slot로 방향/priority/
  scope-limit 복원. broad child-process boot contract 일반화 금지가 successor에 보존.
- `post-mvp.plan.md`: 6단계 Sequenced가 roadmap Phases + "older plan-side sequence maps into the final roadmap"
  블록 + successor Stages로 명시 흡수. async-petting-hoare 운영 라인은 A2A successor **비대상**(successor
  Deferred + source-map row + source-map 2026-07-08 W3 경계 블록 3곳 일관 확인), repo 밖 scratch 별도 보존.

**확인한 사실 — live reference / dead-ref scan (controlling agent 직접 grep):**

- durable/active surface(`docs/`·`src/`·`scripts/`·root AGENTS/README·active plans)에서 6개 후보로의
  load-bearing authority 참조·code 참조 **0건**. roadmap Current Execution Candidates는 W3에서 successor slice로
  이미 repoint됨.
- 남은 live 참조 2곳(둘 다 workspace-reset machinery 내부, 외부 authority 의존 아님):
  1. `plans/a2a-execution.plan.md`(active successor) Source Disposition Map(`:6-7`, `:62-67`)이 6개 후보를
     disposition-mapping source로 참조. 권위 의존이 아니라 "흡수됨" 기록(`:67`은 "권위는 roadmap/spec이 이미
     흡수. §11 본문 복제 안 함"). 물리 삭제 시 dangling path가 된다.
  2. `plans/workspace-reset/workspace-reset.md:36`이 `prd/post-mvp/aiox-a2a-spec.md`를 stage-6 이연 사유로
     참조(historical process note; stage 9가 소비 중).
- historical logs(source-map·stage 로그)의 inbound 참조는 규칙상 historical record로 유지
  (`logs/AGENTS.md` Legacy Source Absorption Map 경계).

**판정:**

- 6개 후보 전부 `delete-ready pending user approval`. `gap — not self-contained` 또는
  `needs successor/stage-log before deletion` 후보는 **없음**. hard blocker 없음.
- owner 어디에도 없는 내용은 전부 non-load-bearing(dated snapshot·정량 수치·exploratory 참조·commercial
  가설)이며 각각 code 재검증 가능 또는 log provenance로 처리된다.

| 삭제 후보 | 실행 detail / owner 복원 근거 | 판정 |
| --- | --- | --- |
| `prd/post-mvp/aiox-a2a-spec.md` | §2–§9 spec slice verbatim+evidence · §11 roadmap+plan · §12 roadmap 제외 명시+W9 provenance · §13 owner/non-authority 분할 | delete-ready pending user approval |
| `plans/post-mvp.plan.md` | roadmap Phases+old-sequence-mapping+successor Stages; async-petting-hoare repo 밖 별도 보존 | delete-ready pending user approval |
| `plans/post-mvp/envelope-metadata.plan.md` | spec §4 + roadmap G1-A/B/C + successor S1→S2→S3·필수 보정 | delete-ready pending user approval |
| `plans/post-mvp/codex-structured-metadata-spike.plan.md` | spec §9 named surfaces + roadmap G1-A + successor S1 | delete-ready pending user approval |
| `plans/post-mvp/adapter-dispatch-registry.plan.md` | pair-slot decision(D6) + adapter-model §5 + gaps §13 + successor S6 | delete-ready pending user approval |
| `plans/post-mvp/channel-boot-surface.plan.md` | roadmap S5+G3 + claude-adapter §6.2 + gaps §13 + successor S5(scope-limit) | delete-ready pending user approval |

**삭제 전 선택 조치 (전부 blocking 아님, 사용자 결정 사항):**

1. (hygiene, owner 본문 수정 — 이번 검증 범위 밖) channel-boot-surface의 유일한 plan-only 현재 사실 —
   "Claude attach가 channel-server boot/health 확인 전 success 반환 → boot 실패(`claude_channel_port_in_use` 등)가
   attach에 미surface, inject 시점 `target_runtime_unavailable`로만 노출" — 을 `docs/architecture/local-runtime-gaps-and-targets.md`
   §13 Current Gaps에 한 줄 흡수하면 완전 self-contained. S5 stage 로그가 `src/`+claude-adapter §6.2로 재도출
   가능하므로 필수는 아니며, 승인 시 별도 수행한다.
2. (dangling-ref disposition) 물리 삭제 실행 시 successor Source Disposition Map(`:6-7`, `:62-67`)의 6개 path와
   `workspace-reset.md:36` 참조 처리 방식 결정 필요 — stage 6 선례(inbound 링크를 삭제 시점 historical 스냅샷으로
   두고 평문화 안 함)를 따를지, 과거형/"(deleted)" 주석 처리할지. self-sufficiency blocker 아님.
3. (preservation, low-stakes) §13.7 open-core/commercial 가설과 §13.4.7 Microsoft APM 검토 지침은 durable owner에
   없다. exploratory·비계약이라 삭제해도 authority 손실은 없으나, 전략 사고 보존을 원하면 삭제 전 log/decision
   digest 또는 compose/capability slice review note로 남기는 선택지가 있다.

**다음 행동:**

- 사용자에게 삭제 승인 요청 가능 상태다. self-sufficiency 검증상 6개 후보 물리 삭제는 복원 불가한 정보 손실이
  없다. 사용자 승인을 받으면 W4 2단계(물리 삭제 + source-map final deletion disposition 확정 + 위 hygiene/
  dangling-ref 처리)를 실행한다. 승인 전에는 어떤 물리 삭제도 하지 않는다.
- W4 Work Item은 `[>]` active 유지(삭제 미실행).

**검증 보고 후 사용자 disposition (2026-07-08):**

- self-sufficiency 검증 결과(6개 후보 전부 `delete-ready pending user approval`, hard blocker 없음)를
  @user에게 보고하고 물리 삭제 승인을 요청했으나 @user가 **삭제 보류(추가 검토)**를 선택했다.
- §13.7 open-core/commercial 가설·§13.4.7 Microsoft APM 검토 지침 preservation 처리는 **나중에 결정**으로
  보류됐다.
- 따라서 물리 삭제·source-map final deletion disposition·선택 조치 3건(channel-boot gap 흡수·dangling-ref
  처리·전략 사고 digest)은 모두 **미실행**이며, W4는 `[>]` active로 유지된다.
- 재개 시 이 검증 기록(판정표·dead-ref scan·선택 조치 3건)을 근거로 삭제 승인 여부부터 다시 확인한다.
  추가 검토가 특정 후보나 근거에 한정되면 그 범위만 재검증한다.

## 2026-07-08 · W4 사전 보정 — channel-boot gap hygiene(A)·exploratory digest(B)·dangling-ref 방침(C)

@user 삭제 승인에 따라 W4를 실행한다. 이 블록은 물리 삭제 **전** 사전 보정 A/B/C를 기록한다.
물리 삭제와 reconcile은 다음 블록이 소유한다. 사전 보정은 controlling agent가 owner 문서·코드·plan을
직접 확인해 적용했고, 두 subagent(① load-bearing 참조 스캔 ② 보정 A code evidence) 결과는 controlling
agent가 `src/`에서 재검증했다(`AGENTS.md`: 타 에이전트 판단 맹신 금지).

**사전 보정 A — channel boot current gap hygiene (owner 문서 반영):**

- `docs/architecture/local-runtime-gaps-and-targets.md` §13 Current Gaps에 "Claude channel boot-failure
  diagnosability" gap 한 bullet + Evidence block을 추가했다. `channel-boot-surface.plan.md` 삭제 후에도
  이 유일한 plan-only 현재 사실이 owner에 self-contained하게 남도록 흡수한 것이다.
- 확인한 사실(controlling agent가 `src/` 직접 재확인):
  - Claude attach는 channel-server listen/health 확인 없이 channel token을 반환한다(`src/daemon/state.ts:610-617`).
  - channel-server `main()`은 HTTP ingress(`channel-server.ts:566`)를 daemon 등록(`:570`) 전에 await하고,
    boot fatal `claude_channel_port_in_use`(명시 `AIOX_CLAUDE_CHANNEL_PORT` 충돌 시에만 발생,
    `channel-server.ts:667-690`은 `listenPort > 0` 조건)는 subprocess stderr에만 기록 후 `exit(1)` —
    attach response·daemon state에 미surface(`channel-server.ts:566-598`).
  - inject 시 generic deferred `target_runtime_unavailable`로만 늦게 드러나고 원래 boot-fatal reason을
    담지 않는다(`src/daemon/state.ts:1346-1352`).
- 범위: S5/G3 diagnosability gap, Claude 한정. broad child-process boot contract 일반화 아님
  (claude-adapter §6.2 Launch Flow 링크로 연결, 본문 복제 안 함). `scripts/check-markdown-inline-code` PASS.

**사전 보정 B — exploratory digest (삭제 전 사고 보존, decision/owner 승격 아님):**

`prd/post-mvp/aiox-a2a-spec.md`가 durable owner로 승격하지 않은 exploratory 서술 2건을 삭제 전 log
digest로만 보존한다. 아래는 owner fact가 아니며 decision/owner 문서로 승격하지 않는다.

- **§13.7 Adoption and commercial hypotheses**(원문 `:1175-1188`): 장기 open-core/commercial 경계(local
  daemon/protocol/adapter/CLI를 공개 core로, team transcript·audit·policy·governance를 별도 운영 제품으로)
  가설. 원문이 스스로 "Exploratory이며 release commitment, 수익 예측 또는 개인 작업 우선순위가 아니다"
  (`:1177`)라고 선언했다. 즉 future strategy hypothesis일 뿐 release commitment·revenue forecast·priority가
  아니다.
- **§13.4 항목 7 + §13.5 Microsoft APM 검토 지침**(원문 `:1140`, `:1143-1155`): capability projection을
  자작하기 전 microsoft/apm의 agent package/manifest·capability projection 선례를 §6/§7 착수 조건으로
  검토하라는 지침. external precedent 검토 후보였고 현재 owner fact가 아니다.
- 둘 다 A2A execution successor scope, roadmap gate, spec/architecture authority를 바꾸지 않는다. docs
  전역 open-core/commercial 언급 0건(grep 재확인)이라 삭제해도 authority 손실이 없다.

**사전 보정 C — dangling path 처리 방침 (적용은 물리 삭제 후 다음 블록):**

- historical logs/source-map inbound 링크는 stage 6 선례대로 "삭제 시점 스냅샷"인 historical record로
  유지한다(평문화·수정하지 않음).
- active plan 쪽(`plans/a2a-execution.plan.md` Source Disposition Map, `plans/workspace-reset/workspace-reset.md`
  stage note)은 혼선을 줄이기 위해 legacy path 참조를 과거형/`(deleted after W4)` 주석으로 보정한다.
- 단 `plans/a2a-execution.plan.md`의 legacy→slice traceability(Source Disposition Map 표·필수 보정)는
  삭제하지 않고 유지한다. dead-ref 스캔이 지목한 세 in-plan citation(`a2a-execution.plan.md:66` →
  `channel-boot-surface.plan.md:43`, `:82` → `envelope-metadata.plan.md:219-220`, `:111` →
  `envelope-metadata.plan.md §7`)은 삭제 파일 내부 line/section을 가리켜 cosmetic dangling이 되므로 중립화한다.

**상태:** 물리 삭제 미실행. W4 `[>]` 유지. 다음 블록이 물리 삭제 + reconcile을 수행한다.

## 2026-07-08 · W4 실행 — 물리 삭제 + source-map final disposition + reconcile

@user 삭제 승인에 따라 앞 블록의 사전 보정 A/B/C 뒤 물리 삭제와 reconcile을 수행했다. 삭제는 되돌릴
수 없다(tracked 파일이라 커밋 전까지 `git checkout`으로 복구 가능).

**물리 삭제 (2026-07-08 — `rm`):**

- `prd/post-mvp/aiox-a2a-spec.md`
- `plans/post-mvp.plan.md`
- `plans/post-mvp/envelope-metadata.plan.md`
- `plans/post-mvp/codex-structured-metadata-spike.plan.md`
- `plans/post-mvp/adapter-dispatch-registry.plan.md`
- `plans/post-mvp/channel-boot-surface.plan.md`
- 빈 디렉토리 `plans/post-mvp/`·`prd/post-mvp/`·`prd/` 제거.

**dead-ref scan (controlling agent 직접 grep + subagent 독립 재검증 — VERDICT: none):**

- `docs/`·`src/`·`scripts/`·`README.md`·`AGENTS.md`·`CLAUDE.md`에 6개 후보 참조 0건.
- `docs/product/roadmap.md` `Current Execution Candidates`는 W3에서 이미 `plans/a2a-execution.plan.md`
  slice로만 repoint됨(legacy path 0건, 직접 재확인). load-bearing breakage 없음.
- 남은 live 참조는 전부 active plan의 legacy→successor traceability/disposition record이며 삭제 후
  historical로 유지: `plans/a2a-execution.plan.md` Source Disposition Map,
  `plans/workspace-reset/workspace-reset.md` stage note. 보정 C로 `(deleted after W4)` 주석 처리했다.
- `logs/**` 참조는 work-history ledger로 historical record다. (이 6개 path가 여러 workspace-reset 로그
  본문에 아직 등장하지만 전부 historical 경위 기록이며 surviving source-map/plan traceability로 대체됨.)

**사전 보정 적용 요약:**

- A(gap hygiene): `docs/architecture/local-runtime-gaps-and-targets.md` §13 Current Gaps에 "Claude channel
  boot-failure diagnosability" bullet + Evidence(state.ts:610-617·1346-1352, channel-server.ts:566-598·667-690,
  claude-adapter §6.2) 추가. inline-code check PASS.
- B(exploratory digest): §13.7 open-core/commercial 가설·§13.4/§13.5 Microsoft APM 검토 지침을 앞 블록에
  digest로 보존. decision/owner 승격 아님.
- C(dangling path): `plans/a2a-execution.plan.md` Source Disposition Map에 deleted 헤더 노트 + 3개 dangling
  citation 중립화 + W4 서술 과거형화; `plans/workspace-reset/workspace-reset.md` stage 6/9 note 삭제 완료 주석.

**source-map final disposition:** `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` 6 row
disposition을 `deleted 2026-07-08 (stage 9 W4 physical deletion)`로 확정, dated block append, W5 `[>]`→`[x]`,
source map을 `decided`로 closeout(stage 6 + stage 9 W4가 모든 target rows 소비, 남은 open 없음).

**owner self-containment 근거:** 삭제된 6개 파일의 실행 detail·현재 사실이 owner/successor에
self-contained함은 이 로그 앞 "2026-07-08 · W4 self-sufficiency 검증" 판정표가 소유한다. 보정 A로
channel-boot의 마지막 plan-only 현재 사실도 owner(gaps §13)에 흡수됐다.

**Work state 전이:**

- 이 로그: W4 `[>]`→`[x]`. 모든 Work Item(W1~W4) 완료 → stage 9 목표 달성. status `open`→`decided`.
- source-map 로그: W5 `[>]`→`[x]`, status `decided`.
- `plans/workspace-reset/workspace-reset.md`: stage 9 `[>]`→`[x]`. 남은 stage = "임시 AGENTS.md 진입 계약
  졸업"(`[ ]` 대기). 이 stage는 작업 착수 전이라 자동 `[>]` 활성화하지 않고 대기 상태로 두고 보고한다
  (추측 금지). 활성화 여부는 @user 결정.

**남은 open work:** workspace-reset plan의 마지막 stage(임시 AGENTS.md 진입 계약 졸업)만 대기. 이 stage 9
로그는 목표 완료로 closed.
