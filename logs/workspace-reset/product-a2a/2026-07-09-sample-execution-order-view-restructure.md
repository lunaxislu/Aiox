---
topic: sample 실행 순서 view 재구조화
description: sample.md를 상세 실행 순서 중심 view로 재작성하고 a2a-execution.plan.md 삭제 readiness를 판단하기 위한 토론형 작업 로그
status: decided
---

## Work Items

## Required Context

### Return Target

- None: independent log.

### {Global}

- 이 로그는 토론형 open log다. Work Item 번호 체계를 만들지 않고, 다음 세션에서 문제의식과 검토 범위를 복원하는 데 집중한다.
- `sample.md`는 정식 owner 문서가 아니라 현재 프로젝트의 구현 순서를 보기 위한 분석용 view다.
- 다음 작업의 중심은 `sample.md`를 상세 실행 순서 1~12 중심 view로 유지하고, 삭제 예정인 `plans/a2a-execution.plan.md` 없이도 A2A G1/G3 slice routing을 복원할 수 있는지 검증하는 것이다.
- 이 workstream의 사용자 의도는 `sample.md`가 상세 실행 순서 1~12를 본체로 삼는 것이다. `plans/a2a-execution.plan.md`는 삭제 후보이며, `sample.md` 판단에서 장기 유지 owner로 가정하지 않는다.
- 삭제된 legacy, stage9, source-map 자료는 implementation required read가 아니다. 필요 시 evidence/provenance로만 언급한다.
- workspace reset stage9/source-map decided 상태는 commit `1184e476c566c8f80225d08b9a4120b076c7e83e`에 반영됐다. `sample.md`의 deleted legacy provenance는 새 `HEAD:`가 아니라 삭제 직전 commit SHA `3581b5796dc29fb58e26c170d5ed6656fdea7834`로 pin한다.
- 현재 live owner는 `docs/product/roadmap.md`, `plans/release-plan.md`, `docs/specs/`, `docs/architecture/`, `docs/decisions/`다. A2A G1/G3 slice routing view는 `sample.md` 순서 2~6·11이다.
- 다음 검토 기준은 '충분히 들어갔는가'가 아니라, 다른 세션의 다른 agent가 삭제된 legacy 문서들과 삭제된 `plans/a2a-execution.plan.md` 없이도 release/gate/routing/owner 판단을 복원할 수 있는가다. 이때 `S1~S6`, `B1~B6`, `C1~C6`, `D` 같은 legacy/sample/a2a-execution 라벨 자체를 roadmap에 보존했는지가 아니라, 그 라벨들이 가리키던 내용이 roadmap gate card에는 라벨 없는 content-based pointer로, specs/architecture/decisions/release-plan에는 각 owner 성격에 맞는 contract·gap·rationale·checklist로 남았는지를 대조한다.

## 현재 문제의식

- 처음에는 삭제된 legacy들을 각각의 owner 문서로 옮기고 하나의 successor plan으로 만드는 것이 목표였지만, 실제로 만든 뒤 보니 아직 정리가 덜 된 부분이 있었다.
- `sample.md`를 작성하며 G1-D trust-boundary처럼 legacy에는 있던 구현 gap이 live architecture owner에 부족하게 반영된 사례가 드러났고, 이는 `docs/architecture/local-runtime-gaps-and-targets.md`에 보정됐다.
- `roadmap.md`, `release-plan.md`, specs/architecture gaps, deleted legacy 구현 detail, 현재 구현 문제점이 흩어져 있어 무엇을 어떤 순서로 구현하고 언제 release하는지 보기 어렵다.
- 따라서 `sample.md`는 기존 1~9 설명 섹션이 아니라, 상세 실행 순서 1~12를 본체로 삼아야 한다.
- 삭제 후보 plan의 scope, completion condition, 필수 보정, deferred boundary가 `sample.md` row와 owner 문서로 충분히 복원되는지 검증해야 한다.

## 해야 할 일

- `sample.md`를 상세 실행 순서 중심 view로 유지한다.
- A2A G1/G3 slice routing, 필수 wire-contract 보정, deferred boundary를 row 2~6, row 11, deferred boundary에서 복원 가능하게 유지한다.
- 삭제된 legacy 상세는 아직 live owner 반영 여부를 확인하는 provenance로만 row에 둔다.
- `sample.md`에서 중복되는 설명 섹션, 구조 검토 메모, plan 재구조화 토론은 본체에서 제거하거나 하단 판단 항목으로 낮춘다.
- `sample.md`만 보아도 다음 독자가 전체 구현 순서, current owner, open decision, legacy provenance 위치를 복원할 수 있는지 점검한다.
- workspace reset 삭제 commit 이후 `sample.md`의 `HEAD:prd/post-mvp/...`와 `HEAD:plans/post-mvp/...` 참조를 삭제 직전 commit SHA로 교체했다.

## 알아야 할 것

- G1은 G1-A/B/C/D 전체 통과와 인증된 안정 왕복 전에는 완료가 아니다.
- S1~S5는 release-gating A2A/G3 slice이고, S6는 release-blocking이 아닌 Phase 2 prerequisite이다.
- S2는 correlated-reply authorization과 public `deliveryId` namespace를 결정해야 한다.
- `reply_expected`는 JSON/schema 문맥에서 `replyExpected`, `parent_message_id`는 `inReplyToDeliveryId`로 보정된다.
- `thread_status`는 spec 권위어가 아니며, `awaiting_agent_reply` vs `awaiting_reply` naming tension은 S2에서 owner 대조가 필요하다.
- S5 channel boot surface는 Claude-specific gap이며 broad child-process boot contract로 일반화하지 않는다.
- `async-petting-hoare`, WS1/AGENTS cleanup, Phase 1.5 early-entry trigger는 이 A2A execution path 밖이다.

## 검토 파일

- `sample.md`
- `plans/a2a-execution.plan.md`(삭제 readiness 판단용 입력; 장기 owner 아님)
- `docs/product/roadmap.md`
- `plans/release-plan.md`
- `docs/specs/aiox-message-lifecycle.md`
- `docs/specs/aiox-adapter-model.md`
- `docs/specs/aiox-open-deferred.md`
- `docs/architecture/local-runtime-gaps-and-targets.md`
- `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`
- `docs/decisions/pair-slot-generalization.md`
- 필요 시 provenance 확인용:
  - `logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md`
  - `logs/workspace-reset/plan-stages/2026-06-29-workspace-reset-stage9-post-mvp-plan-disposition.md`

## 판단 질문

- `sample.md` main table에 owner 문서와 slice routing을 어느 정도까지 펼칠지.
- S2 open decisions 두 개를 sample에서 “결정 필요”로만 둘지, 착수 전 checklist 후보로 더 구체화할지.
- 삭제 후보 plan의 Source Disposition Map과 필수 보정이 `sample.md` row/provenance 및 stage9/source-map logs로 충분히 복원되는지.
- 이 view를 근거로 roadmap/release-plan/spec/architecture 중 어떤 owner 문서를 실제로 수정할지.
- `sample.md`에 남은 provenance가 삭제 직전 commit SHA 기준으로 충분히 읽히는지 확인한다. `HEAD:` 참조는 삭제 commit 뒤 깨질 수 있으므로 사용하지 않는다.

## 다음 세션 시작점

1. `sample.md`를 열어 실행 순서 1~12가 현재 작업 의도에 맞게 읽히는지 확인한다.
2. `sample.md` row 2~6, row 11, deferred boundary만으로 삭제 후보 plan의 slice routing과 boundary가 복원되는지 확인한다.
3. `sample.md`의 legacy/provenance 표현이 implementation required read로 오해되지 않는지 점검한다.
4. 남은 판단 질문을 기준으로 owner 문서 수정 여부를 정한다.

## 2026-07-09 · workspace reset decided 이후 provenance 기준

### 2026-07-09 13:47 · 결정 반영

@user가 "workspace-reset legacy source absorption를 decided로 하고 나서 git 커밋과 관련해서 한다음 sample.md라던지 참조된것들을 업데이트"하는 흐름을 확인했다.

**확인한 사실:**

- `logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md`는 이미 `status: decided`이고 W5가 완료 상태다.
- `logs/workspace-reset/plan-stages/2026-06-29-workspace-reset-stage9-post-mvp-plan-disposition.md`는 Work Items W1~W4가 모두 `[x]`이나 frontmatter가 `status: open`으로 남아 있었다.
- `sample.md`는 deleted legacy provenance를 `HEAD:prd/post-mvp/...`와 `HEAD:plans/post-mvp/...` 형식으로 참조한다.

**결정:**

- workspace reset stage9/source-map 완료분은 decided로 닫는 것이 맞다.
- 이 `sample.md` view 로그는 아직 owner 구조 판단과 provenance pinning 후속 작업이 남아 있으므로 open으로 유지한다.
- legacy 삭제가 git commit된 뒤 `sample.md`의 `HEAD:` provenance는 삭제 직전 commit SHA로 pin한다. 새 `HEAD:`를 유지하지 않는다.

### 2026-07-09 13:49 · workspace reset commit 및 sample provenance pinning

**확인한 사실:**

- workspace reset stage9/source-map 완료분은 `1184e476c566c8f80225d08b9a4120b076c7e83e` (`Complete workspace reset stage9 post-mvp disposition`)로 커밋됐다.
- 삭제 직전 commit SHA는 `3581b5796dc29fb58e26c170d5ed6656fdea7834`다.
- 커밋 이후 working tree에는 이 로그와 `sample.md`만 untracked로 남았다.

**반영:**

- `sample.md`의 deleted legacy provenance에서 `HEAD:` 접두사를 `3581b5796dc29fb58e26c170d5ed6656fdea7834:`로 교체했다.
- 따라서 `sample.md`는 삭제 commit 이후 새 `HEAD`가 아니라 삭제 직전 tree를 기준으로 legacy line reference를 복원한다.

**남은 일:**

- `sample.md` view 자체를 다시 읽고 실행 순서/owner routing/open decision이 사용자의 의도대로 보이는지 확인한다.
- 그 결과를 기준으로 roadmap/release-plan/spec/architecture/a2a plan 중 실제 owner 문서 수정 여부를 결정한다.

### 2026-07-09 16:41 · 파악 결과

**확인한 사실:**

- `sample.md`는 현재 12개 실행 순서 row를 본체로 두고, 각 row에 Gate/Phase, 언제, 구현해야 할 것, 현재 owner, Decision/open item, 삭제 legacy/provenance를 둔다.
- `sample.md`는 deleted legacy, stage9/source-map logs, git history를 implementation required read가 아닌 provenance로 제한한다.
- `plans/a2a-execution.plan.md`는 sequencing과 slice 분해, owner mapping만 소유하며, slice별 상세 acceptance와 owner-update는 착수 stage 로그가 소유한다고 명시한다.
- `plans/a2a-execution.plan.md`의 Source Disposition Map과 필수 보정은 legacy→successor traceability와 wire-contract 용어 보정으로 plan 안에 유지되어 있다.
- `logs/workspace-reset/product-a2a/2026-07-09-sample-execution-order-view-restructure.md`는 Work Items와 next pointer가 없고 independent open log로 남아 있다.

**판단:**

- 현재 `sample.md`는 로그의 다음 세션 시작점 1~3을 충족하는 방향으로 이미 재구성되어 있다.
- 남은 핵심 판단은 `sample.md` 본문 자체의 대규모 재작성보다, 이 view를 근거로 어떤 owner 문서 수정이나 stage 로그 생성을 실제 후속 작업으로 열지 정하는 것이다.
- `sample.md`의 main table은 Authority Boundary의 live owner 전체를 필요한 row별 owner locator로 이미 펼치고 있어, 더 펼치면 owner 본문 복제에 가까워질 위험이 있다.

**남은 판단:**

- S2 open decisions를 지금은 "결정 필요" 수준으로 둘지, S2 착수 전 checklist 후보로 더 구체화할지 정한다.
- `sample.md`를 분석용 view로 유지할지, 이 상태에서 충분하다고 보고 closeout 후보로 볼지 정한다.
- 실제 실행으로 넘어가려면 S1 또는 S2 stage 로그를 별도로 만들고 `plans/a2a-execution.plan.md`에 포인터를 연결할지 결정한다.

### 2026-07-09 · subagent 7-way 누락 검증 실행

@user가 "docs 하위 gap + 삭제 legacy 계획이 live owner에 있는지"를 subagent로 ctx를 아끼며 검증하고, 결과를 `sample.md`에 monolithic 통합한 뒤 함께 토론(release-plan/a2a-execution/workflow)하기로 방향을 정했다. deferred 항목도 범위에 포함.

**실행 방식:**

- 7개 general-purpose subagent를 백그라운드로 fan-out. legacy 흡수 축 L1(`prd/post-mvp/aiox-a2a-spec.md`)·L2(`envelope-metadata.plan.md`)·L3(`codex-spike`+`channel-boot-surface`)·L4(`adapter-dispatch-registry`+`post-mvp.plan.md`), 현행 gap 축 A1(`docs/specs/*`)·A2(`docs/architecture/*`), deferred 축 D1(decisions/spec/roadmap/plan). 모두 삭제 직전 commit `3581b5796dc29fb58e26c170d5ed6656fdea7834` 기준 대조.

**확인한 사실(각 agent가 owner 본문 직접 대조):**

- Phase 0 release-gating gap의 큰 그림은 owner와 sample 순서 1~9에 이미 착지. gate G0~G6·P1-1~8·P2-1~12·§13 축·envelope contract·architecture gap #2~#9·spec gap 전부 흡수 확인.
- async-petting-hoare·WS1~4·Phase 1.5는 증발이 아니라 명시적 STALE/제외로 확인.
- 진짜 owner 유실 GAP은 소수. 최우선은 **B1 async send-boundary agent 행동 계약**(accept≠ack → sleep/poll 금지·inbound envelope로 turn 재개·MCP fallback)이 owner에서 유실됨(protocol fact만 lifecycle §4.5 잔존). release-gating이며 open log `logs/workspace-reset/product-a2a/2026-06-10-A2A-응답-대기-polling-원인.md`와 직접 연결.

**반영:**

- 위 결과를 `sample.md`의 새 섹션 `## 통합 검증 원장 (2026-07-09 · subagent 7-way 대조)`에 monolithic 통합했다. 하위: 검증 결론 / B. Owner 반영 GAP(B1~B6) / C. Gate 귀속 판단(C1~C6) / D. Deferred 미반영 인벤토리. `## 아직 판단이 필요한 항목`도 B/C/D 원장을 가리키도록 갱신.
- 각 agent 산출물(대조표·GAP 목록)의 소비 owner는 이 로그가 아니라 sample.md 원장이다. 원본 agent transcript는 세션 scratch에만 있고 durable 아님.

**다음 세션 시작점(토론 단계 — 아직 owner 문서는 미수정):**

1. B1(async send-boundary)을 어느 owner에 어떻게 반영할지 — spec §4.5 caveat vs architecture adapter-render vs S2 stage log, 그리고 `2026-06-10` polling open log와의 병합/선후.
2. C1~C6 gate 귀속을 지금 확정할지 S2/S5 kickoff로 이연할지.
3. B2~B6, D 원장 항목의 owner 반영 여부.
4. 이후 release-plan/a2a-execution/roadmap 가독성(WS-B)·workflow 규정(WS-C)으로 확장.

### 2026-07-09 · sample.md 순서별 실행 view 재구성 (B/C/D → row 연결)

@user 지시로 owner 문서를 수정하지 않고 `sample.md`를 사람이 읽기 쉬운 "순서별 실행 view"로 재구성했다. 통합 검증 원장(B/C/D)이 하단에만 있고 실행 순서 row와 직접 연결되지 않던 상태를 해소했다.

**확인한 사실:**

- 지정 owner 문서 11개를 직접 읽어 anchor를 재확인했다: roadmap(gate G0~G6·Phases·Gate Evidence·Pre-Release Gap Summary), `aiox-message-lifecycle.md`(§4.1~§4.5, §4.5 open decisions=correlated reply auth `:290-296`·type authoring `:297-301`·explicit ack surface `:302-306`), `aiox-adapter-model.md`(capability tier·tier evaluator/diagnostics API gap `:72-76`=C3·Claude `/send` unauth `:99-102`), `aiox-open-deferred.md`(§9 deferred + session expiry `:62-76`=C4), `local-runtime-gaps-and-targets.md`(§13 Current Gaps: Codex queued pull/read/ack `:35-36`=C1·`claude_channel_disconnected` event `:37-38`=C2·Claude boot-failure diagnosability `:39-45`=B3), `pair-slot-generalization.md`(deferred retry+push post-MVP `:75-77`=D), `a2a-execution.plan.md`(Stages S1~S6·필수 보정·Deferred), `release-plan.md`(B1/B2 blockers·publish 순서).
- C1·C2는 이미 architecture §13 Current Gap에 존재하고, C3는 adapter-model §5 caveat에 존재한다. 즉 C 계열은 owner 유실이 아니라 "gate 귀속 판단 필요"가 정확한 성격이다(원장 C 표현과 일치).

**판단:**

- 각 row에 `Target` / `먼저 처리할 것`(entry-gap) / `Current Gap` / `Decision · Open` / `Deferred · Boundary` / `Gate · Release 영향` / `Owner 반영 후보` 축을 복원하되, 해당되는 row에만 채웠다. 기존 `구현해야 할 것`은 목표 상태 `Target`과 진입 전 닫을 `먼저 처리할 것`으로 분리했다.
- B/C/D는 owner 상세를 row에 복사하지 않고 짧은 routing summary로만 연결했다. 상세 owner는 하단 원장으로 유지하고, 원장에 역방향 `→ 순서` 컬럼을 추가해 양방향 탐색이 되게 했다.
- 미확정 항목은 확정처럼 쓰지 않고 "판단 필요", "kickoff 재도출", "코드 미검증", "datum only"로 표기했다. G 번호 오름차순이 아니라 roadmap release 진행 순서를 유지했다.

**반영(수정 파일 = `sample.md`만):**

- 상단에 view 성격(roadmap release 순서 view·G 오름차순 아님·축은 owner 수정 전 routing용)과 축 glossary를 명시했다.
- B/C 매핑: B1→순서3(주)·4(검증), B2→8, B3→6, B4→3·4, B5→8, B6→6 / C1→4, C2→6·11, C3→6·11, C4→4·deferred, C5→2·4, C6→5(auth)·10(Tier2). D 인벤토리는 순서 10~12 큰 축에 연결하고 결정 대기 항목은 그대로 표기.
- 하단 B/C/D 원장은 삭제하지 않고 `→ 순서` 컬럼만 추가. `## 아직 판단이 필요한 항목`은 "row 연결 완료·owner 미수정"을 반영하도록 갱신.

**남은 논의 항목(owner 문서는 여전히 미수정):**

- B1을 어느 owner에 반영할지(spec §4.5 behavior contract vs architecture inbound-envelope turn 재개 vs S2 stage log)와 `2026-06-10` polling open log 병합 — 최우선.
- C1~C6 gate 귀속을 지금 확정할지 S2/S5 kickoff로 이연할지.
- B2~B6, D 원장의 owner 반영 여부.
- 이후 WS-B(roadmap/release 가독성)·WS-C(workflow 규정).

**경계:** 이 작업은 `sample.md`(비권위 view)만 수정했다. roadmap/spec/architecture/decision/plan owner 문서는 수정하지 않았다.

### 2026-07-09 · B1 축 배치 정밀화 반영

@user가 Gemini/Claude 의견을 가져와 B1(async send-boundary agent 행동 계약)을 `먼저 처리할 것`, `Current Gap`, `Target`, `Owner 반영 후보` 중 어디에 어떻게 배치해야 하는지 재검토했다. owner 문서는 수정하지 않고 `sample.md`의 routing view만 정밀화했다.

**확인한 사실:**

- `sample.md` 순서 3은 B1을 `먼저 처리할 것`, `Current Gap`, `Owner 반영 후보`에 배치하고 있었으나, `Target`에는 B1이 닫힌 결과 상태가 직접 드러나지 않았다.
- 기존 `Owner 반영 후보` 문구는 "spec §4.5 behavior contract 또는 architecture inbound-envelope turn 재개 구조 + S2 stage log"로 되어 있어, spec/architecture/stage log 중 일부만 선택하면 된다는 오해를 만들 수 있었다.
- `logs/workspace-reset/product-a2a/2026-06-10-A2A-응답-대기-polling-원인.md`는 B1 source log이며, 진행 중 turn에 inbound turn/start가 어떤 동작을 하는지 확인하는 W1이 아직 검증 대상으로 남아 있다.

**판단:**

- B1의 주 분류는 `Current Gap`이다. 다만 실행상 순서 3/S2 진입 시 먼저 정렬해야 하는 작업이기도 하다.
- `Target`에는 B1 자체가 아니라 B1이 닫힌 결과 상태(send acceptance · delivery ack · reply completion 분리, polling 없는 correlated inbound reply / turn 재개 경로)를 둔다.
- B1 owner는 택일이 아니라 facet별 병렬 반영이다: spec은 agent-visible 행동 계약, architecture는 current gap과 inbound reply / turn 재개 target 구조, S2/S3 stage log는 구현·검증 ledger를 소유한다.
- 기본 happy-path turn 재개와 in-progress turn 중 inbound 주입 처리(queue/reject/defer)는 S2가 1차로 검증하고, S3는 ack/retry/failure-injection 상황의 reliability 검증을 소유하는 분리가 가장 명확하다.

**반영:**

- `sample.md` 순서 3 `Target`에 B1이 닫힌 결과 상태를 추가했다.
- 순서 3 `먼저 처리할 것`은 "B1 전체를 선행 완료"처럼 보이지 않게, 먼저 정렬할 agent-facing 계약·sleep/polling 금지·instruction vs pending/reply event 계약 판단으로 좁혔다.
- 순서 3 `Current Gap`은 protocol fact 일부 존재와 agent-facing 행동 계약/inbound reply 구조의 owner 누락을 분리해 표현했다.
- 순서 3 `Owner 반영 후보`의 OR 표현을 제거하고 spec/architecture/S2·S3 stage log의 facet별 병렬 반영으로 수정했다.
- 순서 4 `먼저 처리할 것`에는 S2 happy-path/W1 검증과 S3 reliability 검증의 경계를 명시했다.

**남은 논의 항목(owner 문서는 여전히 미수정):**

- B1을 실제 owner에 반영할 때 spec §4.5 문구와 architecture §13/routing 문구를 어디까지 쓸지 결정해야 한다.
- `2026-06-10` polling 로그 W1을 S2 stage log에서 어떻게 소비하고, 언제 해당 source log를 close/decide할지 정해야 한다.
- C1~C6, B2~B6, D 원장의 owner 반영 여부는 아직 이 view 밖의 후속 논의다.

### 2026-07-09 · B2/B6 분류 정정

@user가 Gemini의 B2~B6/C1~C6 검토 결과를 공유했다. 이 중 B6은 코드 사실이 바뀌는 주장이라 직접 대조했고, B2 owner 후보도 `aiox-capability-policy.md` 범위를 확인한 뒤 `sample.md` routing view를 정정했다. owner 문서와 코드는 수정하지 않았다.

**확인한 사실:**

- `src/daemon/socket-transport.ts:183-194`의 `dispatchRequest`는 `const method = api[request.method]` 후 `typeof method !== "function"`만 검사한다. `Object.hasOwn` 또는 own-property guard는 없다.
- `src/daemon/socket-transport.ts:245-253`의 `isRequestEnvelope`는 `method`가 string인지까지만 확인하고 known method enum으로 제한하지 않는다.
- `src/daemon/api.ts:299-300`의 `createDaemonApi`는 plain object literal을 반환하고, `src/daemon/run.ts:66-73`의 `wrappedApi`도 spread 기반 plain object literal이다.
- 따라서 Object.prototype 상속 함수 이름이 method로 들어오면 `unknown_method`로 거부되지 않고 function branch로 들어갈 수 있다는 B6 검토 결과는 코드 기준으로 타당하다. 실제 exploit severity는 별도 보안 판정이지만, P2-7 own-property guard 요구는 미해소로 본다.
- `docs/specs/aiox-capability-policy.md` §7.2의 retention/deletion 내용은 durable store, transcript/export/redaction, data handling 보존 정책에 관한 것이다. B2의 package uninstall vs `~/.aiox` purge 분리 계약과는 직접 owner가 다르다.

**판단:**

- B6은 더 이상 "코드 미검증 / 이미 해소됐을 수 있음"으로 둘 수 없다. `sample.md`에서는 "코드 확인 결과 미해소, low·G3 hardening"으로 분류한다.
- B6의 owner 반영 후보는 architecture §13 Current Gaps 신규 항목과 S5/G3 hardening 소폭 수정이다.
- B2는 여전히 비-gating install/uninstall policy 후보이나, `aiox-capability-policy.md` §7.2 retention을 직접 후보 owner로 쓰면 범위가 어긋난다. roadmap G6 install/uninstall UX 또는 새 spec 소섹션 후보로 남긴다.

**반영:**

- `sample.md` 순서 6 `Current Gap`에서 B6을 코드 확인 결과 미해소로 정정하고, `Decision · Open`에서 코드 검증 완료 상태로 S5/G3 hardening 후보라고 표기했다.
- B 원장 B6 row의 현재 상태, 반영 후보 owner, gating 컬럼을 코드 확인 결과에 맞게 수정했다.
- `sample.md` 순서 8 및 B 원장 B2 row의 owner 후보에서 `aiox-capability-policy.md` §7.2 retention을 직접 후보로 보는 표현을 낮추고, 대상 상이를 명시했다.

**남은 논의 항목(owner 문서는 여전히 미수정):**

- B6을 실제 architecture §13 Current Gap에 추가할지, 아니면 S5 kickoff stage log에서 바로 코드 수정 item으로 소비할지 결정해야 한다.
- B2 uninstall/purge 계약을 roadmap G6에 둘지, 새 spec 소섹션으로 둘지는 G6/release packaging 논의에서 정한다.
- C1~C6과 D 원장의 disposition은 여전히 후속 분류 대상이다.

### 2026-07-09 · B1 source log 소비 방식과 B6 처리 방침 결정

@user가 B1 polling log가 S2 작업에서 참고 context로 연결되어 있는지 확인했고, B6은 지금 우선 수정/architecture 반영이 아니라 S5에서 처리하는 선택 A로 두자고 결정했다.

**결정:**

- B1의 `logs/workspace-reset/product-a2a/2026-06-10-A2A-응답-대기-polling-원인.md`는 S2 stage log 생성 시 Required Context로 끌고 가며, 해당 로그의 W1은 S2 검증 항목으로 소비한다.
- B6은 코드 확인된 Current Gap이지만 low·G3 hardening 항목으로 분류한다. 지금 architecture §13 Current Gap에 신규 반영하지 않고, S5/G3 hardening에서 코드 수정 item으로 소비한다.

**반영:**

- `sample.md` 순서 3 `먼저 처리할 것`에 S2 stage log 생성 시 B1 source log를 Required Context로 가져가 W1을 검증 항목으로 소비한다고 명시했다.
- `sample.md` 순서 6 `Decision · Open`과 B 원장 B6 row에 B6을 지금 architecture §13에 신규 gap으로 반영하지 않고 S5/G3 hardening에서 소비한다고 명시했다.

**남은 판단:**

- B1의 실제 spec/architecture owner 반영 문구는 여전히 후속 논의 대상이다.
- B6은 S5 kickoff 또는 별도 hardening 작업이 열릴 때 code item으로 재확인한다.

### 2026-07-09 · owner 흡수 대상 subagent 재검토와 sample 갱신

@user가 각 owner에 흡수해야 하는 gap을 subagent로 확인하고 `sample.md`를 갱신하라고 지시했다. 4개 read-only subagent를 병렬 실행했다: B1+C5, B6, B2/B5, C/D disposition. 파일 수정은 main agent가 `sample.md`와 이 로그에만 수행했다.

**확인한 사실:**

- B1+C5: `aiox-message-lifecycle.md`는 delivery state와 reply obligation 분리를 이미 소유하지만, send success를 reply completion으로 오해하지 않게 하는 agent-visible send-boundary 행동 계약은 충분히 닫혀 있지 않다. C5의 `type` authoring과 explicit ack surface는 §4.5에 Recommended/Open으로 존재하며 B1의 ack/reply 분리와 직접 연결된다.
- B6: `socket-transport.ts`의 dispatch는 `api[request.method]` 조회 뒤 function 여부만 검사하고, request envelope guard는 method string 여부만 본다. api object는 plain object literal이므로 own-property guard gap은 architecture §13 Current Gap 성격이다.
- B2: `aiox-capability-policy.md` §7.2는 durable store/data handling retention 쪽이며 package uninstall vs `~/.aiox` purge 계약과 직접 owner가 다르다. roadmap G6 install/uninstall UX가 1차 owner 후보다.
- B5: `package.json`은 ISC를 선언하고 root LICENSE 파일은 없다. legacy에는 Apache-2.0 후보가 있었으므로 release-plan에 mismatch datum/check 항목으로 흡수하는 것이 가장 맞다.
- C1/C2/C3/C4/C6은 신규 owner 흡수 대상이 아니라 이미 owner가 있는 gap/open의 gate 귀속 또는 defer disposition 문제다. C5만 B1과 묶어 처리한다.
- D 원장은 대부분 `aiox-open-deferred.md`, roadmap, decisions에 이미 owner가 있는 deferred index이며 sample에는 실행 순서 routing과 owner 링크를 유지하는 얇은 인덱스로 두는 것이 맞다.

**판단:**

- 실제 owner 흡수 batch는 B1+C5, B6, B2, B5로 좁힌다.
- B3/B4는 owner 본문에 지금 과확장하지 않고 S5 또는 S2/S3 stage log에서 실행 방법론/해결 방향으로 소비한다.
- C1~C4/C6과 D는 "owner 흡수 대상"이 아니라 "disposition/kickoff/defer 대상"으로 표기한다.

**반영:**

- `sample.md` 상단의 "하단 원장이 상세 owner" 표현을 "상세 근거 원장"으로 고쳤다.
- C5를 B1과 묶어 처리하도록 순서 2의 Decision/Owner 후보를 정리했다.
- B1 원장 row의 OR 표현을 제거하고 spec + architecture + S2/S3 stage log의 facet별 병렬 반영으로 정합화했다.
- B6은 architecture §13 Current Gap + S5/G3 hardening code item으로 owner 흡수 대상화했다. 기존 "지금 architecture §13 신규 gap 반영은 하지 않음" 취지는 제거했다.
- B2는 roadmap G6 1차 owner, B5는 release-plan 1차 owner로 좁혔다.
- D 섹션 제목을 "Deferred owner 인덱스"로 낮추고, 하단에 `Owner 흡수 / disposition 결론` 표를 신설했다.

**남은 작업:**

1. B1+C5 owner 문구 초안을 작성해 spec/architecture 반영 범위를 결정한다.
2. B6 architecture §13 current gap 문구와 evidence를 확정하고 owner에 반영한다.
3. B2/B5를 roadmap/release-plan에 지금 반영할지, G5/G6 작업 때 반영할지 결정한다.
4. C1~C4/C6과 D는 kickoff/defer disposition으로 유지한다.

### 2026-07-09 20:55 · B1/B2/B5/B6 owner handoff 반영

사용자가 이 로그를 이어가자고 지시했고, 최신 재개점의 owner 흡수 batch(B1+C5, B6, B2, B5)를 실제 owner 문서에 반영했다.

**확인한 사실:**

- `docs/specs/aiox-message-lifecycle.md` §4.3은 delivery state와 reply obligation 분리를 이미 소유하고 있었다.
- 현재 구현은 adapter inject success 뒤 delivery를 `delivered`와 `completed`로 즉시 전이한다: `src/daemon/state.ts:1279-1288`, `src/adapters/router.ts:125-131`.
- socket dispatch는 `api[request.method]` lookup 뒤 function 여부만 검사하고, request guard는 method string 여부만 본다: `src/daemon/socket-transport.ts:183-194`, `src/daemon/socket-transport.ts:245-253`. API 객체는 plain object literal 또는 spread object다: `src/daemon/api.ts:299-300`, `src/daemon/run.ts:66-73`.
- `package.json`은 `license: "ISC"`를 선언하고 root `LICENSE` 파일은 없다.

**판단:**

- B1은 spec과 architecture에 나눠 반영한다. spec은 source-visible send-boundary contract(send success != remote answer, sleep/poll 금지)를 소유하고, architecture는 current gap(즉시 completed 전이와 inbound reply / turn 재개 미완)을 소유한다.
- C5의 `type` authoring과 explicit ack surface는 이미 spec open/recommended 항목으로 존재하므로 이번 owner handoff에서 확정하지 않고 S1/S3 승인·검증으로 남긴다.
- B6은 architecture §13 Current Gap과 evidence로 흡수하고, 실제 코드는 S5/G3 hardening item으로 소비한다.
- B2는 roadmap G6 install/uninstall guidance와 release-plan pre-publish check에 둔다. CLI reset/purge 표면이 생기면 새 spec 소섹션 후보로 재검토한다.
- B5는 release-plan license/package metadata 정리 항목으로 둔다. roadmap G5는 LICENSE 결정 gate만 유지한다.

**반영:**

- `docs/specs/aiox-message-lifecycle.md` §4.3에 source-visible send completion boundary를 추가했다.
- `docs/architecture/local-runtime-gaps-and-targets.md` §13 Current Gaps와 Evidence에 B1 inbound reply resumption gap, B6 socket method dispatch hardening gap을 추가했다.
- `docs/product/roadmap.md` G6와 Gate Evidence에 install/uninstall guidance check를 추가했다.
- `plans/release-plan.md`에 license mismatch datum과 uninstall/purge pre-publish check를 추가했다.
- `sample.md`의 owner 흡수 표와 B1/B2/B5/B6 row를 "owner 반영됨 / 남은 stage 소비" 상태로 갱신했다.

**검증:**

- `scripts/check-markdown-inline-code docs/specs/aiox-message-lifecycle.md` 통과.
- `scripts/check-markdown-inline-code docs/architecture/local-runtime-gaps-and-targets.md` 통과.
- `scripts/check-markdown-inline-code docs/product/roadmap.md` 통과.
- `scripts/check-markdown-inline-code plans/release-plan.md` 통과.

**남은 작업:**

- S2 stage log 생성 시 `logs/workspace-reset/product-a2a/2026-06-10-A2A-응답-대기-polling-원인.md`를 Required Context로 끌고 가 B1 W1을 검증 항목으로 소비한다.
- C5 `type` authoring과 explicit ack surface는 S1/S3에서 승인·검증한다.
- B6은 S5/G3 hardening code item으로 소비한다.
- C1~C4/C6과 D는 kickoff/defer disposition으로 유지한다.

### 2026-07-09 21:08 · Claude review 수용 및 handoff 정정

@user가 Claude review 결과를 공유했다. 리뷰는 blocker는 없지만 세 concern을 제기했다: B2가 비-gating 후보인데 roadmap Gate Evidence에 들어가 G6 필수 조건으로 승격된 모순, spec §4.3 target 문단의 current 오독 가능성/architecture gap 역참조 부재, 그리고 로그의 검증 ledger가 formatting check를 content verification처럼 보이게 하는 overclaim.

**확인한 사실:**

- `docs/product/roadmap.md` G6 bullet과 Gate Evidence row에 uninstall/purge guidance check가 들어가 있어, roadmap 문맥상 G6 completion criterion처럼 읽혔다.
- `sample.md`와 이 로그는 B2를 비-gating 후보 또는 비-gating 재판정 대상으로 유지하고 있었다.
- `docs/specs/aiox-message-lifecycle.md`의 send-boundary 문단은 target contract인데 status label과 architecture current-gap 역참조가 없었다.
- `docs/architecture/local-runtime-gaps-and-targets.md`의 B1 evidence는 `src/adapters/router.ts:125-131` helper 정의만 가리키고 inject-success call site는 가리키지 않았다.

**판단:**

- B2는 기존 sample/log 분류를 따른다. G6 필수 Gate Evidence로 승격하지 않고, release scope에 uninstall/reset/purge 표면이 포함될 때만 적용되는 조건부 packaging policy로 둔다.
- Spec §4.3 send-boundary는 current implementation claim이 아니라 committed target임을 명시하고, current gap은 architecture §13이 소유하도록 역참조한다.
- "검증" 표현은 formatting check와 content/evidence cross-check를 구분해야 한다. 앞 entry의 4개 `scripts/check-markdown-inline-code`는 markdown hygiene 검증이며, content 근거는 이번 review와 직접 line 대조로 보강한다.

**반영:**

- `docs/product/roadmap.md` G6에서 uninstall/reset/purge 문구를 release-scope 포함 시 조건부 정책으로 낮추고, Gate Evidence row에서 uninstall/purge guidance check를 제거했다.
- `plans/release-plan.md` pre-publish check도 해당 안내/CLI 표면이 release scope에 포함된 경우로 조건화했다.
- `docs/specs/aiox-message-lifecycle.md` send-boundary 문단에 `[Status: Committed target]`과 architecture gap 역참조를 추가했다.
- `docs/architecture/local-runtime-gaps-and-targets.md` B1 evidence에 `src/adapters/router.ts:110-112` call site를 추가했다.
- `sample.md` glossary, 순서 3 owner ref, B1+C5/B2 disposition 표현을 최신 상태로 정정했다.

### 2026-07-09 21:37 · roadmap/release/a2a plan 재구조화 논의 중단점

@user가 `sample.md`에 모은 실행 순서·gap·deferred·target 정보를 다시 durable owner 문서로 정리하려는 방향을 제기했다. 현재 `roadmap.md`, `release-plan.md`, specs/architecture gaps, deleted legacy 구현 detail, 현재 구현 문제점이 흩어져 있어 **무엇을 어떤 순서로 구현하고 언제 release하는지 한눈에 파악하기 어렵다**는 것이 문제의식이다. 특히 G1/S2/Gate/Phase 표현이 여러 문서에 나뉘어 있어 release 상태와 다음 실행 단계를 복원하는 비용이 크다.

**확인한 사실:**

- `docs/product/AGENTS.md` 기준 `roadmap.md`는 release gate, phase, 우선순위, gate evidence를 소유한다. plan checklist/status와 spec/architecture contract 본문은 소유하지 않는다.
- `plans/AGENTS.md` 기준 plan은 단계 순서, 상태, stage log pointer만 소유한다. 단계별 상세 acceptance, verification path, owner-update는 stage log가 소유한다.
- `plans/a2a-execution.plan.md`는 W2에서 rich detail plan으로 작성됐다가 `plans/AGENTS.md` 계약에 맞춰 `Execution Order`를 제거하는 보정을 받았다. 그러나 현재도 `Source Disposition Map`, `필수 보정`, deleted legacy traceability가 남아 있어 사용자가 보기에는 여전히 legacy detail이 과하게 붙은 plan으로 보인다.
- stage9 W4 삭제 gate는 완료됐고 legacy `plans/post-mvp*` 및 `prd/post-mvp/aiox-a2a-spec.md` 물리 삭제도 끝났다. 따라서 삭제 전 traceability를 `a2a-execution.plan.md` 본문에 계속 유지할 필요성은 재검토 대상이다.
- `plans/release-plan.md`는 현재 `plans/` 아래 있지만, 실제 성격은 multi-stage workstream plan이 아니라 npm publish 직전 packaging/release checklist다.

**현재 판단 / 제안:**

- `docs/product/roadmap.md`는 "한눈에 보는 release 상황판"으로 정리한다. G0~G6/Phase 1~3를 유지하되, 각 gate에 successor slice(S1~S6), 현재 open/blocking, gate evidence, 다음 stage log/owner 링크를 연결하는 `Phase 0 Execution Map` 후보를 검토한다.
- `plans/a2a-execution.plan.md`는 진짜 얇은 stage-pointer plan으로 줄인다. 남길 것은 Objective, Completion condition, Stages S1~S6, 최소 Notes 정도이고, legacy `Source Disposition Map`과 `필수 보정`은 `sample.md`/로그/provenance 영역으로 낮추거나 stage log Required Context로 소비한다.
- `plans/release-plan.md`는 `plans/` 밖으로 이동하는 후보가 강하다. 후보:
  - `docs/guides/release.md`: 내부 release/publish runbook 성격이면 가장 taxonomy에 맞음.
  - `RELEASE.md`: public-facing release process/checklist로 노출할 의도가 있으면 후보.
  - `docs/product/release.md`: product release overview에는 가능하지만 publish command checklist를 두면 product/guide owner가 섞일 수 있어 주의.
- `sample.md`는 owner가 아니라 migration audit / legacy-to-owner routing view로 낮추고, owner 재구조화 후 실행 기준이 아님을 명시하는 방향이 적절하다.

**다음 세션에서 이어갈 질문:**

1. `release-plan.md`를 `docs/guides/release.md`로 옮길지, root `RELEASE.md`로 만들지 결정한다.
2. `roadmap.md`에 어떤 형태의 `Phase 0 Execution Map`을 둘지 초안을 만든다.
3. `a2a-execution.plan.md`에서 legacy traceability를 얼마나 제거하고 어디로 이관할지 결정한다.
4. 위 변경이 `docs/documentation-system.md`, `docs/product/AGENTS.md`, `plans/AGENTS.md`의 owner 경계와 충돌하지 않는지 확인한다.

**현재 상태:**

- 아직 파일 수정은 하지 않았다.
- 이번 entry는 다음 세션에서 roadmap/release/a2a plan 재구조화 논의를 이어가기 위한 중단점이다.

### 2026-07-10 00:00 · a2a-execution.plan.md 삭제 readiness repoint

@user가 `plans/a2a-execution.plan.md`를 삭제할 전제로 각 섹션이 legacy 흡수 기록인지, `sample.md`에 충분히 들어갔는지, 또는 roadmap 등 live owner에서 `sample.md`로 repoint해야 하는지 구분하라고 지시했다.

**확인한 사실:**

- `plans/a2a-execution.plan.md`의 `Source Disposition Map`, `필수 보정`, `Deferred / Not In Scope`, `Notes`는 대부분 deleted legacy/source-map/workspace-reset 경위와 successor routing 기록이다.
- S1~S6 slice map과 G1/G3/G1-D/S6 boundary는 `sample.md` 순서 2~6, 11에 이미 들어가 있다.
- `필수 보정` 5개 중 4개(`reply_expected`→`replyExpected`, `parent_message_id`→`inReplyToDeliveryId`, `thread_status` 비권위, `awaiting_agent_reply` vs `awaiting_reply`)는 `sample.md` 순서 3에 있고, Codex named app-server surface는 순서 2에 있다.
- `docs/product/roadmap.md`의 `Current Execution Candidates`는 `plans/a2a-execution.plan.md` 대신 `sample.md` 순서 2/3/4/6/11로 repoint되어 있다.
- `rg -n "plans/a2a-execution\\.plan\\.md|a2a-execution\\.plan\\.md" sample.md docs/product/roadmap.md plans --glob '!plans/a2a-execution.plan.md'` 결과, `sample.md`와 `docs/product/roadmap.md`에는 더 이상 해당 plan 참조가 없고, `plans/workspace-reset/workspace-reset.md`에 과거 W4 완료 기록으로만 남아 있다.

**반영:**

- `docs/product/roadmap.md` 도입부에 `sample.md`가 현재 A2A G1/G3 slice routing view이고 roadmap은 gate/phase를 소유한다는 관계를 추가했다.
- `sample.md`의 live owner/routing 표현은 `plans/a2a-execution.plan.md` 대신 이 문서의 순서 row와 stage log 소유로 정리된 상태를 확인했고, 남아 있던 roadmap line reference를 `docs/product/roadmap.md:164-167`로 보정했다.
- `scripts/check-markdown-inline-code sample.md`와 `scripts/check-markdown-inline-code docs/product/roadmap.md`가 통과했다.

**판단:**

- 현재 기준 `plans/a2a-execution.plan.md`는 삭제 readiness를 충족한다. 삭제해도 slice 순서, 필수 wire-contract 보정, deferred/boundary, legacy disposition 복원 경로는 `sample.md`, roadmap gate/phase, owner docs, stage9/source-map logs로 복원된다.
- 실제 파일 삭제는 destructive action이므로 별도 사용자 승인 또는 명시 지시를 받은 뒤 수행한다.

### 2026-07-10 00:30 · sample/a2a-plan 은퇴 전 roadmap 이관 논의 중단점

@user와 `sample.md`, `plans/a2a-execution.plan.md`를 장기 owner로 유지하지 않는 방향을 논의 중이다. 아직 결정·수정 단계가 아니라, 다음 세션에서 이어서 판단할 논점 정리다.

**논의 배경:**

- `sample.md`는 최종 owner가 아니라 실행순서와 legacy 흡수 상태를 한눈에 보기 위한 staging/view다.
- `plans/a2a-execution.plan.md`도 legacy post-MVP plan을 S1~S6로 묶은 successor였고, 장기 유지 여부를 재검토 중이다.
- 사용자는 `sample.md`를 결국 `roadmap.md` 등 real owner로 보내거나 은퇴시키려 한다. 따라서 "sample에 있으면 충분한가"가 아니라, sample과 a2a-plan이 모두 사라져도 real owner에서 복원되는지가 핵심 기준이다.

**현재까지의 논의:**

- `roadmap.md`는 이미 release까지의 전체 arc를 갖고 있다:
  `G0 -> G1/G3 병행 -> G2 -> G5/G6 -> G4 -> npm publish + GitHub 공개 -> Phase 1 -> Phase 2 -> Phase 3`.
- sample이 추가로 제공한 가치는 새 순서 데이터라기보다, 그 순서를 한눈에 읽히게 하는 view와 혼란 제거다.
- gate 번호는 실행순서가 아니다. 예: G5/G6는 G4보다 먼저다.
- 현재 `roadmap.md`의 Release Gates 하위 섹션 배치는 실행순서와 다르다:
  - 현재 배치: `G0 -> G1 -> G2 -> G3 -> G5 -> G6 -> G4`
  - 실행순서 후보 배치: `G0 -> G1 -> G3 -> G2 -> G5 -> G6 -> G4`
- A-1(상단 요약만 추가)과 A-2(Release Gates 하위 섹션을 실제 실행순서로 재배치)를 비교했고, 사용자는 A-2 쪽이 맞다고 보고 있다.
- 단 A-2는 `sample.md` 전체를 `roadmap.md`로 복사한다는 뜻이 아니다. roadmap이 받을 수 있는 것은 release gate/phase/order에 해당하는 내용뿐이다.
- `S1~S6` 코드는 폐기 후보로 본다. 이후 실제 구현 착수 시에는 `G1-A`, `G1-B`, `G1-C`, `G1-D`, `G3` 같은 roadmap gate 이름을 기준으로 새 plan 또는 stage log를 만들 수 있다.
- `plans/a2a-execution.plan.md`는 현재 삭제 후보로 본다. 삭제 자체의 blocker는 확인되지 않았지만, 삭제 전에는 (1) `sample.md`/roadmap 이관 방향 확정, (2) source-map 로그의 "삭제 후 traceability를 plan이 소유한다"는 forward-claim 정합화, (3) 실제 구현 착수 시 S1~S6 대신 roadmap gate 이름(`G1-A/B/C/D`, `G3`)을 기준으로 plan/stage log를 만들지 여부 확인이 필요하다.
- `plans/a2a-execution.plan.md` 삭제 readiness에 blocker는 없다는 검토 의견이 나왔다. 다만 source-map 로그가 "삭제 후 traceability를 `plans/a2a-execution.plan.md`가 소유한다"고 쓰는 forward-claim은 plan 삭제 전에 정합화해야 한다는 concern이 있다.
- `plans/release-plan.md`는 이번 A2A plan 삭제의 직접 대상은 아니다. 현재 역할은 G6/npm publish 직전 packaging/release checklist이며, 나중에 `docs/guides/release.md` 같은 runbook 위치로 이동할 후보지만 별도 논의가 필요하다.

**아직 논의가 필요한 점:**

- A-2를 실제로 채택할지, 채택한다면 `roadmap.md`의 Release Gates 섹션을 어느 정도까지 재배치할지.
- `sample.md` 각 row 중 무엇이 roadmap으로 갈 수 있고, 무엇은 specs/architecture/decisions/logs에 남아야 하는지.
- `Current Execution Candidates`를 삭제할지, transitional note로 남길지.
- source-map 로그의 `plans/a2a-execution.plan.md` forward-claim을 어떤 최종 owner 표현으로 바꿀지.
- `plans/a2a-execution.plan.md` 삭제와 `sample.md` 은퇴를 어떤 순서로 할지.
- `plans/release-plan.md`를 현재 위치에 둘지, release/publish runbook으로 별도 이동할지.

**다음 세션 복귀 지점:**

파일을 바로 수정하지 말고, 먼저 위 논의를 이어간다. 특히 "A-2로 가면 `roadmap.md`가 어떤 모양이 되는가"를 사용자와 머릿속에 그릴 수 있게 설명한 뒤, 사용자가 승인하면 그때 이관 맵이나 편집안을 만든다.

### 2026-07-10 00:45 · roadmap/plan owner 모델 재논의 필요

@user와 A-2 방향을 더 논의하던 중, `roadmap.md`가 단순 gate/phase 순서표인지, 아니면 release execution map과 owner routing까지 소유해야 하는지 재정의가 필요하다는 쟁점이 드러났다. 아직 결론이나 파일 수정 단계가 아니다.

**논의 배경:**

- `sample.md`를 은퇴시키려면 `roadmap.md`만 보고도 각 gate에서 다음에 읽을 owner 문서를 찾을 수 있어야 한다.
- 그러나 `sample.md`의 `현재 owner` 행을 그대로 옮기면 `roadmap.md`가 다시 mini sample/mini execution spec처럼 비대해진다.
- 반대로 owner refs를 전혀 두지 않으면 roadmap만 보고 specs/architecture/decisions로 이동하는 경로가 복원되지 않는다.
- gate별 plan 파일을 12개 미리 만드는 방안도 떠올랐지만, 미착수 plan이 stale해지고 roadmap/owner 문서 변경 때 참조 유지 비용이 커질 수 있다.

**현재 논의 중인 일반 원칙 후보:**

- `roadmap.md`는 release까지의 실행 지도와 gate/phase 순서, gate outcome, gate evidence, 그리고 gate별 primary owner routing을 소유하는 방향을 검토한다.
- `roadmap.md`는 contract 본문, architecture gap 상세, decision rationale, legacy provenance, implementation checklist, stage-log acceptance ledger를 복사하지 않는다.
- gate별 owner routing은 line ref가 아니라 stable document/section refs 중심으로 둔다. 정확한 line evidence는 stage log나 검증 ledger에서 쓴다.
- plan 파일은 모든 gate에 대해 미리 만들지 않고, 실제 착수 시점에 필요한 gate/workstream 단위로 만든다.
- S1~S6 같은 deprecated alias는 장기 roadmap 본문에 남기지 않는 방향을 검토한다. 필요하면 migration/provenance 로그에서만 추적한다.

**아직 논의가 필요한 질문:**

- `roadmap.md`의 owner 정의를 "release gate/phase/priority/order"에서 "release execution map + owner routing"으로 확장할지.
- 확장한다면 `docs/product/AGENTS.md`와 `docs/documentation-system.md`의 roadmap 정의를 어떻게 바꿀지.
- gate card의 적정 밀도는 어디까지인지: `Goal`, `Done when`, `Owner refs` 정도인지, 더 줄여야 하는지.
- owner refs를 gate별로 둘지, G1 같은 큰 묶음에는 공통 owner refs를 두고 sub-gate에는 추가 refs만 둘지.
- `release-plan.md`는 G6/npm publish checklist로 유지할지, 나중에 `docs/guides/release.md` 같은 runbook으로 이동할지.

**주의 / 다음 agent가 신경쓸 것:**

- 사용자는 지금 결론을 내리기 전 문서 모델을 머릿속에 그리려는 중이다. 바로 파일을 수정하거나 "반영하겠다"고 진행하지 않는다.
- `sample.md` 전체를 `roadmap.md`로 복사하지 않는다.
- `roadmap.md`를 너무 깨끗하게 만들겠다는 이유로 owner refs를 제거하면, 사용자가 roadmap만 보고 다음 문서를 찾을 수 없게 된다.
- 반대로 sample의 owner 행, B/C/D 원장, legacy provenance, 필수 보정표를 그대로 옮기면 roadmap이 과밀해진다.
- 사용자가 강한 표현으로 중단시킨 지점은 대부분 "아직 대화 중인데 agent가 먼저 실행하려 한 것"과 "맥락 없는 축약 문장으로 subagent가 이해할 수 없는 로그를 제안한 것"이었다. 다음 세션에서는 먼저 확인한 사실/추론/의견을 구분해 설명하고, 사용자가 승인하기 전에는 편집하지 않는다.

**최신 복귀 기준 보정:**

- 위 `00:30` entry의 "A-2로 가면 `roadmap.md`가 어떤 모양이 되는가"는 최신 복귀점이 아니다.
- 이후 논의에서 먼저 `roadmap.md`의 문서 정체성 자체를 재검토해야 한다는 점이 드러났다.
- 다음 agent는 A-2 편집안이나 sample 이관 맵을 바로 만들지 않는다.
- 먼저 `roadmap.md`를 단순 gate/phase/priority/order 문서로 둘지, release execution map + gate별 primary owner routing 문서로 확장할지 사용자와 논의한다.
- 확장 후보에 포함될 수 있는 것은 gate outcome, gate evidence, stable owner refs다.
- 여전히 제외해야 하는 것은 contract 본문, architecture 상세, decision rationale, legacy provenance, implementation checklist, stage-log acceptance ledger다.
- 사용자가 이 roadmap 모델을 승인한 뒤에만 A-2 섹션 재배치, sample row 이관, `a2a-execution.plan.md` 삭제 순서를 판단한다.

### 2026-07-10 13:55 · forward-map / triage / stage-log 작업 흐름 결정

@user와 Codex/Claude/Gemini 의견, 그리고 Kubernetes/Rust/OpenTelemetry 등 prior art를 대조해
`sample.md` 은퇴 전 문서 모델과 다음 작업 흐름을 정리했다. 이 entry는 아직 owner 문서 수정이
아니라, 다음 세션의 판단·검증 순서를 고정하는 기록이다.

**확인된 방향:**

- `docs/specs/`, `docs/architecture/`, `docs/decisions/`에서 gap/deferred/target 본문을 전부 빼면 안 된다.
  확정된 contract, structure, rationale, owner-worthy gap, deferred target의 본문은 해당 owner 문맥에 남긴다.
- `docs/product/roadmap.md`가 mini-spec, mini-architecture 또는 implementation checklist가 되면 안 된다.
- `sample.md`가 반복 생성된 것은 durable forward view가 필요하다는 증거다. 다만 필요한 것은 durable
  content owner가 아니라 durable routing/tracking surface다.
- 장기적으로는 metadata/query generated view가 가장 좋지만, 지금 당장은 수동 문서 모델이 필요하다.
- `navigation index`와 `triage backlog`는 lifecycle이 다르다.
  - navigation index: 이미 분류된 gate/phase와 owner refs. 낮은 churn. roadmap에 적합.
  - triage backlog: 아직 owner/gate/phase가 미정인 후보. 높은 churn. roadmap에 넣으면 roadmap이 다시
    dumping ground가 될 위험이 크다.
- 따라서 roadmap 안에 backlog/triage까지 넣는 안은 약하다. `roadmap.md`는 active gate별 얇은
  navigation index를 가질 수 있지만, 미분류 후보는 roadmap에 섞지 않는다.
- slice는 gate 쪽으로 흡수한다. `S1~S6`는 장기 taxonomy 용어가 아니라 migration alias로 보고,
  실제 실행 착수 시에는 `G1-A`, `G1-B`, `G1-C`, `G1-D`, `G3`, `Phase 2` 같은 roadmap gate/phase
  이름을 기준으로 stage log나 plan을 만든다.

**현재 working model:**

```text
specs/architecture/decisions
  owner-worthy 본문

roadmap.md
  release gate / phase / order / evidence
  + active gate별 얇은 owner routing index

triage surface
  아직 위치 미정. docs/backlog.md로 확정하지 않는다.
  후보: plans/backlog.md, plans/triage.md, dedicated open log, open log Work Items,
        또는 매우 작은 임시 note

plans/logs
  착수된 실행 단계, 검증 ledger, closeout/reconcile

sample.md
  migration/audit view, 분해 후 은퇴 후보
```

**roadmap 경계:**

- `roadmap.md`에 둘 수 있는 것:
  - gate/phase/order
  - release-gating 여부
  - gate evidence
  - gate별 primary owner refs
  - 분류 완료된 active gate의 얇은 navigation index
  - 필요 시 미분류 후보의 위치를 가리키는 짧은 링크
- `roadmap.md`에 두지 않는 것:
  - contract 본문
  - architecture HOW/detail
  - implementation checklist
  - B/C/D 검증 원장 전체
  - legacy provenance 전체
  - stage-log acceptance ledger
  - `retryCount` 필드 추가, stale runtime queue 처리, `Object.hasOwn` guard 같은 단발 code checklist

**triage surface 경계:**

- triage surface는 본문 owner가 아니라 대기실이다.
- 대상은 미분류 후보, owner 미확정 legacy residue, gate/phase 미정 candidate, 단발 TODO 후보 등이다.
- 다만 위치는 아직 미정이다. `docs/backlog.md`나 `docs/product/backlog.md` 같은 knowledge owner로
  바로 확정하지 않는다.
- Claude 지적에 따라 triage backlog는 항목이 분류되면 떠나는 queue라서 durable knowledge보다
  work/evidence surface에 가깝다는 점을 인정한다. prior art도 tracking issue/enhancement tracking처럼
  design 본문과 tracking surface를 분리한다.
- backlog/triage를 도입하려면 promotion protocol과 triage cadence owner가 함께 필요하다.

**분류 기준:**

- 이미 owner가 확정된 gap/target → specs/architecture/decision으로 둔다.
- release gate에 붙은 분류 완료 항목 → roadmap navigation index 후보.
- 실제 착수할 작업 → stage log/plan.
- owner/gate/phase가 아직 불명확한 후보 → triage surface 후보.
- legacy provenance만 남은 것 → source-map log나 기존 migration log.
- 단발 코드 TODO → stage log 또는 issue-like work item. 단, 작은 코드 수정처럼 보여도 daemon dispatch
  trust boundary나 public method dispatch invariant처럼 반복 참조될 구조적 invariant이면 architecture
  current gap 후보가 될 수 있다.

**아직 미결인 질문:**

1. triage/backlog가 `docs/` 지식 문서인가, `plans/`/log 쪽 work surface인가.
2. 별도 backlog 파일이 필요할 만큼 미분류 후보가 실제로 많은가.
3. backlog를 만든다면 누가 언제 비우고, owner 문서/roadmap/stage log로 승격시키는가.

**작업 흐름 결정:**

- 지금 단계에서는 stage log를 만들지 않는다. 아직 `G1-B` 구현 같은 release gate 실행 stage에 들어간
  것이 아니라, 문서 taxonomy와 `sample.md` 분해 방식을 정하는 토론/구조 판단 작업이다.
- 따라서 현재 작업 로그는 이 파일(`logs/workspace-reset/product-a2a/2026-07-09-sample-execution-order-view-restructure.md`)이 맞다.
- stage log가 필요한 시점은 실제 release gate 작업을 착수할 때다. 예:
  - `logs/2026-xx-xx-G1-B-envelope-cutover.md`
  - `logs/2026-xx-xx-G1-C-delivery-reliability.md`
  - `logs/2026-xx-xx-G3-daemon-diagnosability.md`
- 현재 세션/다음 세션의 작업은 stage log 생성이 아니라, 이 open log 안에서 구조 판단을 계속하는 것이다.

**다음 세션 작업 순서:**

1. `sample.md` B/C/D 원장에서 진짜 unclassified candidate 수를 센다.
2. 각 후보를 `owner 확정`, `gate 확정`, `triage 필요`, `provenance only`, `stage-log TODO`로 나눈다.
3. triage 필요 항목이 적으면 별도 backlog를 만들지 않고 현재 로그나 향후 gate kickoff log로 흡수한다.
4. triage 필요 항목이 반복적이고 많으면 `plans/triage.md`, dedicated open log 등 work-surface 후보를 검토한다.
5. 그 다음에 promotion protocol과 triage cadence owner를 정한다.
6. 사용자와 `roadmap.md` active gate navigation index, triage surface, slice 흡수 결정을 확정한다.
7. 승인된 뒤에만 `documentation-system.md`, `docs/product/AGENTS.md`, `roadmap.md`, 필요 시
   `plans/AGENTS.md`/`logs/AGENTS.md` 같은 owner 문서를 수정한다.
8. 그 후 `sample.md`와 `plans/a2a-execution.plan.md` 삭제/은퇴 readiness를 판단한다.

### 2026-07-10 14:20 · sample row는 Bn/Cn 라벨이 아니라 내용 기준으로 gate에 흡수

@user와 `sample.md`의 S/B/C/D 원장을 다시 해석했다. 직전 entry의 "진짜 unclassified candidate
수를 세고 backlog/triage 필요성을 판단한다"는 접근은 아직 가능한 보조 절차지만, 최신 판단에서는
별도 backlog보다 gate 흡수와 kickoff review가 1차 경로다.

**확인한 사실:**

- `sample.md` 상단은 이 파일이 실행 순서 토론과 routing을 위한 view이며, 실제 계약·구조·release
  상태는 owner 문서가 소유한다고 명시한다.
- `sample.md`의 S1~S6는 장기 taxonomy가 아니라 G1/G3/Phase 2 실행 순서를 설명하기 위한 slice
  alias다.
- B/C/D 원장은 legacy A2A execution/source를 owner 문서와 gate 순서에 대조한 audit/routing
  결과다. 다수 항목은 이미 owner 반영, stage log 소비, gate/disposition 판단, deferred owner
  index로 분류되어 있다.

**수정된 판단:**

- `Bn`, `Cn`, `Dn` 번호 자체를 장기 문서 라벨이나 roadmap 항목으로 보존하지 않는다. 번호는
  `sample.md` audit view 내부의 provenance/분석 라벨일 뿐이다.
- 필요한 것은 `B1`, `C2` 같은 라벨이 아니라 그 **내용**이다. 예: "async send-boundary 계약",
  "Claude channel disconnected event 귀속", "runtime diagnostics API 부재" 같은 claim/action을
  gate kickoff 또는 owner 문서 맥락에서 다룬다.
- 따라서 `roadmap.md`에 "B1/B4/C2를 처리한다"처럼 번호 중심으로 옮기면 장기 복원성이 약하다.
  옮긴다면 gate별로 내용 중심의 kickoff review 항목으로 표현한다.
- `sample.md`가 legacy `a2a-execution` 계열 내용을 migration/audit한 view라면, owner 문서와
  gate kickoff 항목으로 흡수된 뒤에는 별도 영구 필요성이 약하다. 필요한 provenance는 이 로그와
  source-map 계열 로그가 보존한다.

**현재 선호 모델:**

```text
S1~S6
  -> G1-A / G1-B / G1-C / G1-D / G3 / Phase 2 gate·phase로 흡수
  -> S alias는 장기 roadmap 용어에서 제거

B/C/D 원장 내용
  -> owner 문서에 이미 반영된 것은 owner 문서가 소유
  -> release gate와 연결된 것은 해당 gate kickoff review item으로 흡수
  -> 실제 구현·검증 항목은 gate stage log가 착수 시 소비
  -> provenance only는 logs/source-map에만 남김
  -> gate로도 owner로도 붙지 않는 진짜 orphan이 남을 때만 backlog/triage surface 재검토

roadmap.md
  -> gate/phase/order/evidence
  -> former slice 흡수 상태
  -> gate별 content-based kickoff review items와 owner refs
  -> Bn/Cn 번호 중심 원장, legacy provenance 전체, implementation checklist는 싣지 않음

sample.md
  -> gate/owner 흡수 확인 뒤 은퇴 후보
```

**roadmap 표현 예시 후보:**

```markdown
### G1-B — canonical envelope cutover

Kickoff review:
- Align the async send-boundary contract: accept does not mean remote reply completion; reply resumes
  through correlated inbound envelopes; no sleep/polling wait pattern.
- Decide how envelope migration is staged so additive pre-steps and revert safety are preserved.

Owner refs:
- `docs/specs/aiox-message-lifecycle.md`
- `docs/architecture/local-runtime-routing-and-delivery.md`
- `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`
```

**작업 흐름 보정:**

1. 다음 작업은 `sample.md`의 S/B/C/D를 번호 중심으로 backlog화하는 것이 아니다.
2. 먼저 각 row의 내용을 `gate absorption`, `kickoff review`, `owner already reflected`,
   `stage-log consume`, `provenance only`, `orphan candidate`로 나눈다.
3. `orphan candidate`가 실제로 남지 않거나 매우 적으면 별도 `backlog.md`/`triage.md`는 만들지 않는다.
4. 승인되면 `roadmap.md`에는 content-based gate kickoff review와 owner refs만 반영한다.
5. 그 뒤 `sample.md`와 `plans/a2a-execution.plan.md` 은퇴 readiness를 판단한다.

### 2026-07-10 14:35 · sample.md는 보존 대상이 아니라 삭제할 monolithic migration artifact

@user가 `sample.md`의 정체성을 다시 명확히 했다. `sample.md`는 legacy 자료와
`plans/a2a-execution.plan.md` 내용을 합쳐 만든 monolithic migration/audit view이며, 최종 owner나
보존 대상이 아니다. 따라서 `sample.md`를 로그나 다른 문서로 crosswalk 형태로 재복제하는 방향은
피한다.

**최신 결정 방향:**

- `sample.md` 자체와 S/B/C/D 번호 체계는 장기 보존하지 않는다.
- `S1`, `S2`, `B1`, `C2` 같은 legacy/migration label은 `roadmap.md`나 새 backlog에 옮기지 않는다.
- `sample.md`에서 필요한 것은 라벨이 아니라 내용이다. 필요한 내용만 현재 roadmap gate, owner 문서,
  또는 향후 gate stage log가 소비할 항목으로 흡수한다.
- `roadmap.md`에는 gate/phase/order/evidence와, 해당 gate에서 착수·통과 전에 봐야 할 주제나
  disposition question을 **pointer 고도**로 둔다. contract 본문, architecture 상세, implementation
  checklist, legacy provenance 전체를 복사하지 않는다.
- kickoff해야 하는 B/C 계열 내용이나 disposition을 미뤄야 하는 토의 내용도 `Bn/Cn` 라벨 없이
  gate의 착수/통과 조건 또는 open decision 주제로 쓸 수 있다.
- 별도 `backlog.md`/`triage.md`는 기본적으로 만들지 않는다. gate/owner/stage-log/provenance 어디에도
  붙지 않는 진짜 orphan candidate가 발견될 때만 재검토한다.
- `sample.md` 삭제 전에 해야 할 일은 `sample.md` 자체를 보존하는 것이 아니라, 필요한 내용이
  owner 문서 또는 roadmap gate pointer/stage-log 착수 흐름으로 흡수됐는지 확인하는 것이다.
- 로그에는 `sample.md`의 세부 원장을 다시 복사하지 않는다. 남길 것은 삭제 판단과 그 이유,
  그리고 필요 내용이 어떤 owner/gate 흐름으로 흡수됐다는 수준의 결정 기록이다.

**roadmap 반영 고도:**

허용:

- `G1-B 착수 전 async send-boundary 계약 정렬 여부를 message lifecycle spec 기준으로 확인한다.`
- `G3에서 Claude channel boot-failure 진단성 처리 방향을 결정한다.`
- G3 통과 전 channel disconnected event와 runtime diagnostics API가 Phase 0 release-gating인지
  Phase 2 boundary인지 결정한다.

비허용:

- `B1`, `B3`, `C2` 같은 sample 내부 번호를 장기 라벨로 쓰는 것.
- `accept≠ack`의 계약 본문, correlated inbound envelope 상세, retry/queue 구현 절차 같은 owner
  본문을 roadmap에 재서술하는 것.
- `sample.md`의 legacy provenance, 7-way audit 원장, B/C/D 표를 로그나 roadmap에 다시 복사하는 것.

**다음 작업의 실제 의미:**

1. `sample.md`를 보존하려고 crosswalk를 만들지 않는다.
2. `sample.md`에서 아직 필요한 내용만 gate별 roadmap pointer 또는 owner/stage-log 흐름으로 흡수할
   수 있는지 확인한다.
3. 그 확인 결과를 현재 로그에 짧게 기록한다.
4. 승인되면 `roadmap.md`를 gate 중심 pointer 고도로 수정한다.
5. 이후 `sample.md`와 `plans/a2a-execution.plan.md` 삭제 readiness를 판단한다.

### 2026-07-10 16:49 · roadmap 승격 전제와 subagent 검토

@user와 Claude/Gemini 검토 의견을 바탕으로 `spikes/roadmap-restructure.md`를
`docs/product/roadmap.md`로 승격하기 전의 결정과 남은 작업을 정리했다. main agent는 draft에
승격 전 cleanup 일부를 반영했고, 2개 read-only subagent로 owner 규칙과 정보 손실 가능성을
분리 검토했다.

**확인한 사실:**

- `spikes/roadmap-restructure.md`는 현재 untracked draft이며, `Status: Spike`, `Drafting Rules`,
  `sample.md` 대조 지시문, `S1~S6`/`B/C/D` migration label을 제거한 상태다.
- draft는 G1 open decision 귀속을 다음처럼 반영한다:
  - `deliveryId` namespace는 G1-A schema freeze에서 결정한다.
  - `correlated reply authorization` 모델은 G1-B 진입 조건으로 확정한다.
  - G1-D는 G1-B에서 확정한 모델이 wrong/forged correlated reply를 negative evidence로 거부하는지
    검증한다.
- `docs/product/AGENTS.md`는 아직 기존 `Release Gates / Phases / Gate Evidence` 구조를 따른다고
  쓰고, `Current Execution Candidates`와 `Pre-Release Gap Summary`를 section ownership에 둔다.
- `docs/documentation-system.md`는 roadmap/logs/plans/spikes owner 모델을 이미 지원한다. 이번
  승격만으로는 갱신 필요성이 낮다.

**결정:**

- `Current Execution Candidates`는 roadmap 승격 시 제거한다. gate card가 같은 역할을 흡수하므로
  gate 기준 표로 대체하지 않는다.
- `Pre-Release Gap Summary`도 roadmap에는 유지하지 않는다. 현재 release pressure는 gate card가
  소유하고, dated audit/source provenance는 로그가 소유한다. 별도 `Validation Provenance` 섹션도
  만들지 않는다.
- `sample.md`, `plans/a2a-execution.plan.md`, legacy provenance, B/C/D 원장을 roadmap에 복사하지
  않는다.

**subagent 검토 결과:**

- owner 규칙 검토: `docs/product/AGENTS.md`는 roadmap 승격 전 또는 같은 배치에서 갱신해야 한다.
  gate card 슬롯, annotated owner refs, transitional `Current Execution Candidates` retire,
  `Pre-Release Gap Summary` 제거와 audit provenance의 log 귀속을 규칙에 반영해야 한다.
- 정보 손실 검토: `Current Execution Candidates`와 `Pre-Release Gap Summary` 제거는 대체로 가능하다.
  단 `dead/scaffold code handling`은 current roadmap summary에만 명시적으로 남아 있어, 여전히 G5
  concern이면 promoted G5 wording이나 release-plan owner에 내용 기준으로 흡수할지 결정해야 한다.
- 삭제 readiness 검토: `sample.md`와 `plans/a2a-execution.plan.md` 삭제는 roadmap 승격 직후에도
  자동으로 안전해지지 않는다. `sample.md`에는 S2 polling source log 소비, S3 inbound reply/MCP
  fallback 검증, S5 B3/B6 소비, C1~C4/C6 kickoff/defer disposition 같은 실행 재개 detail이 남아
  있다. `plans/a2a-execution.plan.md`는 아직 S1~S6 stage-log pointer가 없고 전 slice 미착수라고
  명시한다.

**다음 작업:**

1. `spikes/roadmap-restructure.md`에 남은 보정 후보를 판단한다:
   - G1-A 통과 조건에도 `deliveryId` namespace 결정 완료를 명시할지.
   - `dead/scaffold code handling`을 G5에 내용 기준으로 흡수할지.
2. `docs/product/AGENTS.md`를 gate-card roadmap 구조에 맞게 갱신한다.
3. `spikes/roadmap-restructure.md`를 `docs/product/roadmap.md`로 승격하고,
   `Current Execution Candidates`와 `Pre-Release Gap Summary`를 제거한다.
4. 그 후 `sample.md`와 `plans/a2a-execution.plan.md` 삭제 readiness를 별도로 재판정한다. 필요하면
   실제 G1/G3 착수 시 stage log를 만들거나 retained execution successor를 정한다.

### 2026-07-10 14:50 · roadmap restructure spike 초안 생성

@user가 `spikes/roadmap-restructure.md`를 생성했다. 이 파일은 정식 product roadmap owner가 아니라,
읽기 어려운 현행 `docs/product/roadmap.md`를 바로 수정하기 전에 새 구조를 눈으로 검토하기 위한
임시 구조 실험 초안이다.

**결정:**

- `spikes/roadmap-restructure.md`는 `roadmap.md` 대체본이 아니라 restructure draft다.
- 첫 작업은 내용을 채우는 것이 아니라 섹션 골격만 작성한다.
- 초안은 `sample.md`를 보존하거나 재복제하지 않는다.
- `S1~S6`, `B/C/D` 번호 체계, legacy provenance 원장, implementation checklist는 초안의 장기
  구조에 넣지 않는다.
- 이후 초안을 보며 `roadmap.md`에 반영할 gate 구조, pointer 고도, open decision/disposition question
  위치를 판단한다.

### 2026-07-10 15:00 · Pre-Release Pressure / Source Disposition은 gate별로 흡수

@user와 `spikes/roadmap-restructure.md` 하단의 `Pre-Release Pressure`와 `Source Disposition`
섹션 성격을 다시 정리했다.

**결정:**

- `Pre-Release Pressure`를 정식 roadmap 하단 섹션으로 계속 유지하지 않는다.
- release pressure 중 현재 gate 판단에 필요한 내용은 각 gate의 착수/통과 조건, open decision,
  evidence 항목으로 흡수한다.
- `Source Disposition`은 roadmap 정식 섹션으로 두지 않는다. legacy/source 흡수 provenance와 삭제
  판단은 logs/source-map/current open log가 소유한다.
- 따라서 roadmap restructure 초안의 하단 pressure/disposition 섹션은 최종 구조가 아니라 임시
  검토 흔적이거나 제거 후보로 본다.

**적용 기준:**

- G1-B/G1-C/G1-D/G3/G5/G6 등 특정 gate에 영향을 주는 pre-release pressure는 해당 gate 아래의
  pointer 고도 항목으로 옮긴다.
- gate와 무관한 legacy provenance, 원장, 삭제 경위는 roadmap에 옮기지 않는다.
- gate별로도 contract 본문, architecture detail, implementation checklist를 복사하지 않고
  "무엇을 확인/결정해야 하는가"와 owner refs 수준으로만 둔다.

### 2026-07-10 15:10 · roadmap restructure 골격에 병렬 gate topology 반영

@user와 `G1/G3`가 실제 실행상 병렬 workstream이라는 점을 문서 섹션 구조에 반영하기로 했다.

**변경:**

- `spikes/roadmap-restructure.md`에서 `G1`과 `G3`를 단순 선형 sibling으로 나열하지 않고
  `G1/G3 Parallel Stabilization` wrapper 아래 sibling gate로 배치했다.
- `G1-A/B/C/D`는 `G1` 내부 sub-gate로 닫았다.
- `G3`는 `G1`의 하위가 아니라 병렬 stabilization gate로 둔다.
- `G5`와 `G6`도 `G5/G6 Release Preparation` wrapper 아래 sibling으로 묶었다.

**의도:**

- Phase 0 실행 topology를 `G0 -> (G1 + G3 병행) -> G2 -> (G5 + G6) -> G4`로 복원 가능하게 한다.
- 물리적 문서 순서가 "G1 완료 후 G3" 같은 잘못된 선형 의도를 암시하지 않게 한다.
- 아직 정식 `docs/product/roadmap.md`는 수정하지 않는다. 이 변경은 spike 초안의 구조 실험이다.

### 2026-07-10 15:25 · gate card template과 섹션별 복원 검증 방식 결정

@user와 Claude 리뷰를 반영해 `spikes/roadmap-restructure.md`의 다음 작업 방식을 정했다. 현재는
섹션별 큰 틀만 잡힌 상태이며, 곧바로 `docs/product/roadmap.md`를 수정하지 않고 spike 초안을
gate별로 채우며 복원성과 정합성을 검증한다.

**결정:**

- `Execution handoff`라는 별도 슬롯은 만들지 않는다.
- 대신 `Owner refs`를 단순 링크 목록이 아니라 annotated refs로 쓴다. 각 ref는 "어디를 볼지"와
  "왜 봐야 하는지"를 한 줄로 복원하게 한다.
- roadmap의 복원 목표는 구현 checklist 전체가 아니라 다음 착수 경로다:
  - 어느 gate인지
  - 왜 지금 이 gate인지
  - 진입을 막는 조건이 무엇인지
  - 닫아야 할 open decision이 무엇인지
  - 자세한 contract/architecture/checklist는 어느 owner/ref에서 봐야 하는지
- checklist성 내용은 roadmap에 저장하지 않는다. durable gap/contract/evidence pointer에서 실제
  gate stage log 착수 시 재생성한다.
- `sample.md`에만 있는 세부 후보를 보존하려고 roadmap이나 로그에 재복제하지 않는다. 필요한 경우
  gate의 open decision으로 "재도출/판단"을 명시한다.

**gate card template 후보:**

```markdown
### Gx — Gate Name

Goal

Entry criteria

Kickoff review / Open decisions

Exit criteria

Owner refs
```

**작성 고도:**

- `Goal`: 이 gate가 왜 필요한지와 gate의 제품/release 의미.
- `Entry criteria`: 이 gate에 들어가기 전 닫혀야 하는 gate-level 선행 조건. 구현 checklist가 아님.
- `Kickoff review / Open decisions`: 착수 시 닫아야 할 판단이나 disposition question. `S/B/C/D` 번호를
  쓰지 않고 내용으로 쓴다.
- `Exit criteria`: 이 gate가 통과됐다고 볼 수 있는 의미. 상세 evidence ledger가 아님.
- `Owner refs`: annotated refs. 예: `[[docs/specs/aiox-message-lifecycle]] — async send-boundary contract owner`.
  필요하면 관련 log도 "근거 context"로 링크할 수 있지만, stage log Required Context
  명령문은 roadmap에 쓰지 않는다.

**다음 작업 방식:**

1. 현재 섹션 골격은 유지한다.
2. @user와 함께 gate를 하나씩 채우며 복원성/정합성을 검증한다.
3. 먼저 `G1-B`처럼 복잡한 gate와 `G2`처럼 단순한 gate를 test case로 채워 템플릿 고도를 검증한다.
4. 각 gate 작성 후 다음을 확인한다:
   - roadmap만 보고 gate intent와 착수 경로가 복원되는가.
   - contract 본문, architecture detail, implementation checklist를 복사하지 않았는가.
   - annotated refs가 kickoff/open decision과 매핑되어 있는가.
   - `sample.md`의 legacy label이나 provenance 원장을 재도입하지 않았는가.
5. template이 통과하면 같은 형식으로 나머지 gate를 채운다.
6. spike 초안이 충분히 검증된 뒤에만 정식 `docs/product/roadmap.md` 반영과
   `docs/product/AGENTS.md` 정합화 여부를 판단한다.

### 2026-07-10 15:45 · subagent 초안 통합으로 roadmap restructure draft 1차 작성

@user 요청으로 subagent들에게 `spikes/roadmap-restructure.md`의 gate/phase 카드 초안을 나눠 작성하게
했다. subagent들은 파일을 직접 수정하지 않고 markdown snippet만 반환했고, Codex가 고도와 중복을
검토해 spike 파일에 통합했다.

**수행:**

- G0, G1-A, G1-C, G1-D, G3, G5, G6, G4, Phase 1~3 초안을 subagent 결과 기반으로 통합했다.
- 기존 테스트 카드였던 G1-B와 G2는 같은 template 아래 유지했다.
- `Drafting Rules`, `Release Path`, `Gate Overview`, `Gate Evidence`, `Cross-Platform Requirement`도
  비어 있지 않게 채웠다.
- 이전 결정에 맞춰 `Pre-Release Pressure`와 `Source Disposition`은 정식 하단 섹션으로 남기지 않고
  제거했다. 필요한 pressure는 gate별 card와 evidence로 흡수하는 방향을 유지한다.

**현재 draft 상태:**

- `spikes/roadmap-restructure.md`는 전체 구조를 볼 수 있는 1차 spike draft가 됐다.
- 아직 정식 `docs/product/roadmap.md`에는 반영하지 않았다.
- 이 draft는 바로 승격하지 않고, gate별로 @user와 함께 복원성/정합성을 검토해야 한다.

**다음 검토 포인트:**

- 각 gate card가 너무 길거나 mini-spec/mini-architecture로 내려갔는지 확인한다.
- `Entry criteria`가 checklist가 아니라 gate-level 선행 조건으로 유지되는지 확인한다.
- `Owner refs`가 단순 링크 목록이 아니라 착수 경로를 복원하는 annotated refs인지 확인한다.
- `Gate Evidence`와 각 gate의 `통과 조건`이 중복되지 않는지 확인한다.
- `docs/product/AGENTS.md`의 기존 roadmap section ownership과 새 구조가 충돌하는지 승격 전에 따로
  검토한다.

### 2026-07-10 · G1-A Codex named app-server surface 제약 반영

@user가 `sample.md` 삭제 전 G1-A의 "generic `turn/start`로 대체하지 않고 named app-server
surface를 검증한다"는 제약을 영구 owner로 이관할 수 있는지 코드 근거를 요구했다.

**확인한 사실:**

- 현재 Codex injector는 `turn/start`만 호출하고, 성공은 JSON-RPC ack와 active thread 불변성으로
  판정한다.
- Codex proxy의 thread binding 관측 대상은 `thread/start`, `thread/resume`, `thread/fork`이며
  `turn/start`는 binding signal이 아니다.
- runtime notification 관측은 현재 `remoteControl/status/changed` 진단 상태만 보며,
  `turn/started|completed`와 `thread/tokenUsage/updated` 기반 lifecycle/usage 관측은 없다.
- `outputSchema`는 현재 Codex app-server ingress 검증이 아니라 aiox MCP tool schema 쪽에서만 쓰인다.

**판단:**

- `turn/start` current local partial은 G1-A Codex structured ingress spike의 named app-server
  surface 검증을 대체할 수 없다.
- 따라서 `docs/specs/aiox-open-deferred.md`에 "generic `turn/start` compatibility path로 간소화해
  대체 승인하지 않는다"는 제약을 두는 것은 기술적으로 타당하다.
- 이 말은 현재 코드가 named API들을 이미 사용한다는 뜻이 아니라, G1-A 검증이 현재 partial을
  Tier 2 또는 structured ingress 증거로 과장하지 말아야 한다는 뜻이다.

**반영:**

- `docs/specs/aiox-open-deferred.md`의 Codex structured ingress spike 항목에 named app-server
  surface 직접 검증과 `turn/start` 대체 금지 제약을 추가했다.
- 같은 항목의 local partial caveat에 `turn/started|completed`, `thread/tokenUsage/updated`,
  `outputSchema` behavior도 아직 증명하지 못한다고 명시했다.
- `spikes/roadmap-restructure.md` G1-A card의 착수 검토와 Owner refs에 해당 spec 제약을 연결했다.

**검증:**

- `scripts/check-markdown-inline-code docs/specs/aiox-open-deferred.md` 통과.
- `scripts/check-markdown-inline-code spikes/roadmap-restructure.md` 통과.

### 2026-07-10 15:53 · G1-B B4 migration / field 정합 코드 조사

@user가 `sample.md` 삭제 전 G1-B 순서 3의 B4 마이그레이션 모순과 `thread_status`,
`awaiting_agent_reply`/`awaiting_reply` 정합을 실제 소스로 검증해 Research Brief를 요청했다.

**확인한 사실:**

- `docs/specs/aiox-message-lifecycle.md` §4.1은 schema validator, MCP instruction, tool description,
  example, test fixture를 "한 변경"으로 교체한다고 쓰지만, 현행 SQLite schema는 `messages`에
  `intent`, `replyExpected`, `inReplyToDeliveryId`/canonical address/protocol이 없고
  `message_deliveries`에도 retry/ack/reply-obligation 저장 필드가 없다.
- 현행 migration 구현은 `applySchema`가 table 생성 후 versioned migration을 실행하고, migration 1은
  conflict preflight 뒤 트랜잭션 안에서 `alter table`/backfill/index/version 기록을 수행한다. corrupt
  legacy DB 실패 시 `pair_slot`과 `schema_version`이 남지 않는 테스트가 있다.
- daemon send/reply 경로는 `messages.type`, `parent_message_id`, route fan-out, `message_deliveries.status`
  를 기준으로 동작한다. `thread_status`는 `src/`와 `tests/`에 존재하지 않는다.
- `awaiting_agent_reply`는 `docs/specs/aiox-open-deferred.md`의 open question에만 남아 있고,
  lifecycle spec 권위어는 `awaiting_reply | fulfilled | cancelled | expired`다.

**판단:**

- B4는 타당하다. "한 변경으로 교체"는 user-facing/tool/schema surface의 coordinated cutover framing으로는
  가능하지만, persistent schema와 rollback/revert-safety까지 포함한 배포 전략으로 해석하면 부족하다.
  v1 저장 필드 추가/backfill/dual-read 또는 nullable pre-step/새 코드 write/read 전환/구버전 rollback
  허용 범위를 분리해 설계해야 한다.
- `thread_status`는 현재 구현 권위 필드가 아니며, 새 routing/state transition authority로 승격하지
  않아야 한다. conclusion은 `intent`, reply 대기는 별도 obligation state로 모델링하는 기존 plan/spec
  방향이 코드 근거와 맞다.
- `awaiting_agent_reply`는 stale/open-deferred 용어로 보이며 S2 owner 정합에서 `awaiting_reply`로
  수렴하거나 legacy alias로 명시 폐기해야 한다.

**후속 owner 후보:**

- `spikes/roadmap-restructure.md` 또는 G1-B stage kickoff에는 migration pre-step/revert-safety를
  open decision/entry criterion으로 남긴다.
- 승인되면 `docs/specs/aiox-message-lifecycle.md` §4.1의 "한 변경" 문구는 tool/schema surface cutover로
  좁히고, persistence migration sequencing은 §4.5 또는 stage plan/roadmap owner로 분리한다.

### 2026-07-10 15:56 · G1-B B4 / field 정합 owner 반영

@user가 조사 결과를 반영하고 로그 기록·보고를 요청했다.

**반영:**

- `docs/specs/aiox-message-lifecycle.md` §4.1의 "한 변경" framing을 public contract revision
  cutover로 좁혔다. 같은 문단에 repository migration을 한 deploy step으로 압축하라는 뜻이
  아니라고 명시했다.
- 같은 spec §4.5 Current implementation caveats에 G1 persistence cutover가 rollback-aware schema
  migration plan을 요구한다는 caveat를 추가했다. 현행 migration pattern과 테스트 근거를
  `src/store/schema.ts` 및 `tests/unit/store/repositories/pairs.test.ts`로 연결했다.
- `docs/specs/aiox-open-deferred.md`의 `awaiting_agent_reply` 표현을 lifecycle 권위어
  `awaiting_reply`로 정합했다.
- `spikes/roadmap-restructure.md` G1-B card에 migration pre-step/revert-safety 기대치와
  `thread_status` 비권위 확인을 착수 검토로 추가했다.
- `plans/a2a-execution.plan.md`의 stale 정합 note를 "이미 spec에서 정합됐고 S2에서 stale 명칭
  재도입을 확인"하는 note로 바꿨다.
- `sample.md`의 G1-B row와 B4 원장을 최신 owner 반영 상태로 보정했다.

**검증:**

- `scripts/check-markdown-inline-code docs/specs/aiox-message-lifecycle.md docs/specs/aiox-open-deferred.md spikes/roadmap-restructure.md plans/a2a-execution.plan.md sample.md` 통과.
- `rg`로 `awaiting_agent_reply`, `thread_status`, B4 stale framing을 재검색했다. 남은
  `awaiting_agent_reply`와 `thread_status`는 plan/sample/roadmap draft에서 legacy·비권위 용어임을
  설명하는 의도적 언급이다. `docs/specs/aiox-open-deferred.md`의 권위 상태명은 `awaiting_reply`로
  정리됐다.

**주의:**

- 작업 트리에는 이번 요청 범위 밖의 기존 수정(`docs/architecture/local-runtime-gaps-and-targets.md`,
  `docs/product/roadmap.md`, `plans/release-plan.md`, log skill 개선 로그 등)이 남아 있다. 이번 기록은
  위 B4/field 정합 반영 범위만 소유한다.
- Long log guard: 이 로그는 1000 lines를 넘었지만 아직 `sample.md` 삭제 readiness와 G1/G3 owner
  반영 판단이라는 단일 수명 안에 있고, 별도 독립 재개 지점이나 분리 작업 로그가 필요한 새 unit은
  아니다. 따라서 이번 entry에서는 분리하지 않고 open 토론 로그로 유지한다.

## 2026-07-10 · roadmap-restructure 섹션별 반영 충분성 검토

**사용자 질문:**

`sample.md`와 `plans/a2a-execution.plan.md`는 삭제 예정이며, `sample.md` 내용이 `spikes/roadmap-restructure.md`에 충분히 반영됐는지 각 섹션별 검증 중이다. Gemini는 C1 사용자 큐 제어 도구, C4 세션 능동 감지 배포 경계, B1-S3 교차 장애 검증 가이드가 부족하다고 지적했다.

**확인한 사실:**

- `sample.md` 순서 4(G1-C/S3)는 C1을 Current Gap으로 직접 둔다: Codex측 queued delivery pull/read/ack surface 부재(stale queued delivery inspect/ack/drain tool). 또한 Decision/Open에 "queued surface를 이 순서 Target에 명시할지 판단 필요"를 둔다.
- `sample.md` 순서 4는 C4를 Decision/Open 및 Deferred/Boundary에 직접 둔다: adapter-active 세션 단절 능동 감지를 S3에 넣을지 deferred로 둘지 release 전 결정 필요, daemon 시간기반 stale recovery와 별개.
- `sample.md` 순서 4의 먼저 처리할 것은 B1 검증분을 S2/S3로 분리한다: S2는 happy-path turn 재개와 in-progress turn inbound 주입 처리를 1차 검증하고, S3는 ack/retry/failure-injection 상황에서도 inbound reply / MCP fallback이 유실 없이 동작하는지 검증한다.
- `spikes/roadmap-restructure.md` G1-C는 C1의 구체 표면명(pull/read/ack, inspect/ack/drain)을 직접 쓰지 않고, queued delivery drain gap과 explicit manual action 정도로 추상화한다.
- `spikes/roadmap-restructure.md` G1-C는 C4를 stale/disconnected runtime 판단 및 session expiry owner ref로 남기지만, daemon 시간기반 stale recovery와 adapter-active 단절 감지의 배포 경계를 명시적으로 분리하지 않는다.
- `spikes/roadmap-restructure.md` G1-C 및 Gate Evidence는 failure-injection/retry/idempotency/offline queue/stale runtime/active-turn 검증을 요구하지만, 그 와중의 inbound reply / MCP fallback 무손실 교차 검증을 직접 명명하지 않는다.

**판단:**

- Gemini의 세 지적은 `sample.md` 자체에는 이미 반영된 항목을 다시 지적한 것이 아니라, `roadmap-restructure.md` 승격 초안에서 구체성이 줄어든 지점을 짚은 것으로 보는 편이 정확하다.
- C1은 roadmap의 gate 카드에 "Target으로 승격할지 착수 검토에서 결정" 정도의 문장이 필요하다. user-facing queue control surface를 release target으로 약속할지 여부가 현재 초안에서는 희미하다.
- C4는 현재 초안만으로도 owner ref는 있지만, release 전 decision이 "daemon stale recovery와 adapter-active disconnect detection의 경계"라는 점이 부족하다.
- B1-S3 교차 장애 검증은 roadmap의 통과 조건 또는 Gate Evidence에 한 줄 보강하는 것이 적절하다. implementation checklist로 과확장하지 않고도 release gate evidence의 핵심 위험을 보존할 수 있다.

### 2026-07-10 · G3 반영 충분성 검토

**사용자 질문:**

`sample.md`와 `plans/a2a-execution.plan.md`는 삭제 예정이며, `sample.md` 내용이
`spikes/roadmap-restructure.md`에 충분히 반영됐는지 각 섹션별 검증 중이다. G3에 대해 B3 해결
방향 후보 3개, B6 socket dispatch hardening, C2/C3 gate 귀속 판단이 누락 또는 부족하다는
지적이 있었다.

**확인한 사실:**

- `sample.md` 순서 6(G3/G1/S5)은 B3 해결 방향 후보를 명시한다: startup ack 경로, attach success
  반환 의미 축소, child fatal 관측 후 propagate.
- `sample.md` 순서 6과 B6 원장은 daemon socket dispatch own-property guard가 코드 확인 결과
  미해소이며, architecture §13 Current Gap/evidence에 반영됐고 S5/G3 hardening code item으로
  소비한다고 둔다.
- `sample.md` 순서 6/11과 C 원장은 `claude_channel_disconnected` event 및 runtime tier
  evaluator/diagnostics API를 G3 diagnosability에 묶을지 Phase 2 events/adapter boundary로 이연할지
  판단해야 한다고 둔다.
- `spikes/roadmap-restructure.md`의 기존 G3 card는 Claude boot-failure diagnosability와 runtime
  diagnostics disposition을 언급했지만, 위 세 항목의 구체적인 착수 판단/통과 조건이 부족했다.
- 정식 owner 문서 기준으로 B6은 이미 `docs/architecture/local-runtime-gaps-and-targets.md` §13에
  current gap/evidence로 반영되어 있다. C2도 같은 architecture gap owner에 있고, C3는
  `docs/specs/aiox-adapter-model.md` current implementation caveat에 있다.

**판단:**

- 세 지적은 `sample.md` 누락이 아니라 `spikes/roadmap-restructure.md` G3 card 승격 초안에서
  pointer 고도가 너무 낮아진 지점으로 보는 것이 정확하다.
- B3의 세 해결 후보는 roadmap에 구현 선택으로 확정하지 않고, G3 kickoff에서 재도출할 방향 후보로
  두는 것이 맞다.
- B6은 roadmap에서 release-gating severity를 새로 단정하지 않고, G3 hardening 범위와 통과 조건에
  "unknown/inherited method를 실행하지 않음" 수준으로 둔다.
- C2/C3는 지금 G3로 확정하지 않고, G3 완료 주장 전에 Phase 0 포함 또는 Phase 2 명시 이연 중 하나로
  disposition을 닫게 한다.

**반영:**

- `spikes/roadmap-restructure.md` G3 `착수 검토 / 열린 결정`에 Claude boot failure 해결 방향 후보
  3개, socket dispatch own-property/known-method hardening, C2/C3 Phase 0 vs Phase 2 귀속 판단을
  추가했다.
- G3 `통과 조건`에 unknown/inherited socket method 거부와 C2/C3의 검증 또는 명시 이연 조건을
  추가했다.
- G3 `Owner refs`에서 `local-runtime-gaps-and-targets`와 `aiox-adapter-model` annotated refs가
  channel disconnect, boot failure, socket dispatch hardening, runtime diagnostics/tier evaluator gap을
  복원하도록 보강했다.

**검증:**

- `scripts/check-markdown-inline-code spikes/roadmap-restructure.md` 통과.
- `rg`로 `startup ack`, `own-property`, `claude_channel_disconnected`, `runtime tier evaluator`,
  `inherited method`, `Phase 2 owner path`가 G3 card에 존재함을 확인했다.

### 2026-07-10 · long-log split guard

**확인한 사실:**

- `scripts/log`가 이 로그에 대해 `1044 lines >= hard threshold 1000` 경고를 냈다.

**판단:**

- 현재 추가 기록은 `sample.md`의 roadmap-restructure 반영 충분성 검토이며, 기존 로그의 중심 수명(`sample.md` 상세 실행 순서 view 유지 및 `plans/a2a-execution.plan.md` 삭제 readiness 판단) 안에 있다.
- 별도 실행 unit이나 독립 owner handoff가 열린 것이 아니므로 지금은 로그를 분리하지 않는다.
- 이후 실제 `roadmap-restructure.md` 수정, `docs/product/roadmap.md` 승격, 또는 S1/S2/S3 stage log 생성으로 작업 수명이 바뀌면 별도 로그 또는 해당 owner/stage log로 전이한다.

### 2026-07-10 · G1-C 보강 반영

**사용자 지시:**

Gemini가 지적한 C1 사용자 큐 제어 도구, C4 세션 능동 감지 배포 경계, B1-S3 교차 장애 검증 가이드를 `spikes/roadmap-restructure.md`에 반영하고, 상세하게 만들 필요가 없는 이유를 로그로 기록하라고 지시했다.

**확인한 사실:**

- `sample.md` 순서 4는 이미 C1 pull/read/ack surface, C4 adapter-active 세션 단절 능동 감지의 S3/deferred 판단, B1-S3 failure-injection 중 inbound reply / MCP fallback 무손실 검증을 상세히 소유한다.
- `spikes/roadmap-restructure.md` Drafting Rules는 roadmap 초안에 S1~S6/B/C/D migration label, contract 본문, architecture detail, implementation checklist, legacy provenance 원장을 복사하지 않는다고 정의한다.
- `spikes/roadmap-restructure.md` G1-C 카드에는 기존에 retry/failure-injection, stale/disconnected runtime, queued delivery drain gap이 있었지만 C1 surface target 판단, C4 daemon stale vs adapter-active disconnect 경계, B1-S3 inbound reply/MCP fallback 교차 검증은 직접 명명되지 않았다.

**반영:**

- `spikes/roadmap-restructure.md` G1-C `착수 검토 / 열린 결정`에 Codex user-facing queued delivery control surface(pull/read/ack 또는 inspect/ack/drain)를 Phase 0 Target에 포함할지 결정한다는 bullet을 추가했다.
- 같은 섹션에 daemon 시간 기반 stale recovery와 adapter-active 세션 단절 감지의 release 경계를 결정한다는 bullet을 추가했다.
- G1-C `통과 조건`에 retry/failure-injection 중에도 inbound reply와 MCP fallback이 delivery correlation 기준으로 유실 없이 동작한다는 bullet을 추가했다.

**판단 / 이유:**

- 보강은 세 줄로 제한했다. `roadmap-restructure.md`는 release gate 구조 초안이고, `sample.md`의 상세 검증 원장이나 specs/architecture/stage log의 계약·구현 detail을 복제하면 owner 중복과 drift 위험이 커진다.
- C1/C4/B1-S3의 핵심 위험은 release gate 판단에서 사라지면 안 되므로 gate-level open decision 또는 통과 조건으로 남겼다.
- 세부 surface 이름, owner line, stage log verification ledger는 `sample.md`, spec/architecture owner, 이후 S3 stage log가 소비한다.

### 2026-07-10 · G1-D 보강 반영

**사용자 지시:**

`sample.md`와 `plans/a2a-execution.plan.md`는 삭제 예정이며, `sample.md`의 G1-D 내용이 `spikes/roadmap-restructure.md`에 충분히 반영됐는지 검증 중이라고 밝혔다. 사용자는 C6 어휘 분리(Auth vs Tier 2 Ack) 누락과 Claude loopback `/send` 보안 취약점 명확성 약화를 지적했다.

**확인한 사실:**

- `sample.md` 순서 5는 C6 auth 부분을 직접 명명한다: Claude channel-server `/send`가 request auth 없이 loopback POST를 수용하고, daemon push가 channel credential을 제시하지 않는 auth gap이 G1-D release-gating이다.
- `sample.md` 순서 5는 C6 어휘 분리를 직접 둔다: Claude `/send` auth는 G1-D release-gating이고, full Tier 2 delivery-ack 완성은 Phase 1이다.
- `spikes/roadmap-restructure.md` G1-D는 기존에 "auth와 Tier 2 delivery-ack 어휘가 분리되어 있는지 확인"이라는 대조 문구와 token/header 검증 bullet은 있었지만, 착수 scope에서 auth와 Tier 2 ack를 분리하라는 지침과 unauthenticated loopback POST 취약점 자체를 직접 명명하지 않았다.

**판단:**

- 사용자의 두 지적은 `sample.md`의 누락이 아니라 `roadmap-restructure.md` 승격 초안의 추상화 손실로 보는 것이 정확하다.
- G1-D 카드에는 상세 implementation checklist가 아니라 release gate scope를 흐리지 않는 최소 문구가 필요하다. 특히 auth gate를 Tier 2 delivery-ack uplift와 섞으면 Phase 0 release-gating 범위가 잘못 넓어지거나, 반대로 auth 취약점이 Phase 1로 밀릴 위험이 있다.

**반영:**

- `spikes/roadmap-restructure.md` G1-D `착수 검토 / 열린 결정`에 G1-D auth는 API 요청 권한/route 검증 gate이고 full Tier 2 delivery-ack 완성은 Phase 1 uplift임을 착수 scope에서 분리한다는 bullet을 추가했다.
- 같은 섹션에 Claude channel-server `/send`가 request auth 없이 loopback POST를 수용하는 현재 ingress gap을 release-gating auth 취약점으로 다룬다는 bullet을 추가했다.

**판단 / 이유:**

- 보강은 두 bullet로 제한했다. `roadmap-restructure.md`는 roadmap gate 초안이므로 `sample.md`의 C6 원장 전체, code evidence line, 세부 token 전달 설계를 복제하지 않는다.
- 그래도 auth/Tier 2 ack 경계와 unauthenticated loopback POST 위험은 gate scope를 바꾸는 핵심이므로 G1-D 착수 검토에 직접 남겼다.

### 2026-07-10 16:15 · G5/G6 보강 반영

**사용자 지시:**

`sample.md`와 삭제 예정 `a2a execution.md` 내용을 `spikes/roadmap-restructure.md`에 충분히 반영했는지 섹션별로 검증 중이며, G5/G6에서 두 누락을 지적했다.

**확인한 사실:**

- `sample.md` 순서 8과 B 원장은 B5를 "Apache-2.0 후보 vs `package.json` ISC, root `LICENSE` 파일 없음"이라는 license mismatch datum으로 보존하고 있다.
- 현재 `package.json`은 `license: "ISC"`를 선언하고, root `LICENSE` 파일은 없다.
- 삭제 직전 legacy `prd/post-mvp/aiox-a2a-spec.md:954-976`에는 G5에서 Apache-2.0 검토와 현재 `package.json` ISC 불일치, G6에서 npm-first packaging과 package/version 결정 압력이 있었다.
- `sample.md` 순서 8과 B2 원장은 package removal과 user data purge 분리, `~/.aiox` 자동삭제 금지, destructive reset/purge confirmation과 scope 한정을 보존하고 있다.
- `plans/release-plan.md`도 release scope에 설치/제거 안내나 reset/purge 표면이 포함될 경우 package uninstall과 `~/.aiox` purge 분리, confirmation/scope 확인을 pre-publish check로 둔다.

**판단:**

- `spikes/roadmap-restructure.md`의 기존 G5 문구 "LICENSE와 package metadata 정합성을 결정한다"는 B5 datum의 구체 위험을 복원하기에 부족했다.
- 기존 G6 문구 "runtime/user-data purge와 package removal은 분리한다"는 B2 안전장치 중 `~/.aiox` 자동삭제 금지와 destructive reset/purge confirmation/scope 한정을 복원하기에 부족했다.

**반영:**

- `spikes/roadmap-restructure.md` G5 착수 검토에 Apache-2.0 후보, 현재 `package.json` ISC, root `LICENSE` 없음 datum을 명시하고, 통과 조건에 LICENSE 파일과 package metadata license 값의 정합성을 추가했다.
- G6 착수 검토에 release scope 포함 시 package removal과 runtime/user-data purge 분리, `~/.aiox` 자동삭제 금지, destructive reset/purge confirmation과 scope 한정, CLI reset/purge 표면 생성 시 spec 소섹션 재검토를 추가했다.
- G6 통과 조건에도 해당 표면이 release scope에 포함된 경우 package removal이 user data purge를 수행하지 않고 destructive purge/reset에는 confirmation/scope 제한이 문서화되어야 한다고 보강했다.

**남은 상태:**

- 이번 작업은 `spikes/roadmap-restructure.md`만 수정했다. `sample.md`, roadmap/release-plan/spec/architecture owner 문서는 수정하지 않았다.

### 2026-07-10 16:19 · Phase 1 roadmap restructure draft 누락 보정

@user가 `sample.md`와 `plans/a2a-execution.plan.md` 삭제 예정 맥락에서 `spikes/roadmap-restructure.md` Phase 1 카드에 두 항목이 충분히 반영됐는지 검증 중이라고 알렸다.

**확인한 사실:**

- `sample.md` 순서 10 Phase 1 row에는 `deferred delivery 자동 retry + source push notification`이 `docs/decisions/pair-slot-generalization.md:75-77` 출처와 함께 Phase 1 대상으로 들어가 있다.
- 같은 row에는 C6(Tier 2 부분), 즉 full Tier2 delivery-ack 완성이 Phase 1이며 순서 5 G1-D auth와 분리된다고 적혀 있다.
- `docs/decisions/pair-slot-generalization.md`는 deferred delivery 자동 retry와 source push notification을 본 결정 범위 밖(post-MVP) 재평가 지점으로 둔다.
- `spikes/roadmap-restructure.md`의 Phase 1 카드는 `retry/backoff/dead-letter 조정`과 `선택적 Tier 2 uplift`만 두고 있어, source push notification과 G1-D에서 미룬 full Tier 2 delivery-ack 도달 목표가 흐려져 있었다.

**판단:**

- 두 항목은 `sample.md`에는 흡수됐지만, `roadmap-restructure.md` Phase 1 draft에는 실질적으로 부족했다.
- roadmap spike에는 contract 본문이나 구현 checklist를 복사하지 않고, Phase 1 범위·경계·owner routing 수준으로만 반영한다.

**반영:**

- `spikes/roadmap-restructure.md` Phase 1 `진입 조건 / 경계`에 G1-D가 auth/trust-boundary gate이고 full Tier 2 delivery-ack completion은 Phase 1 uplift target이라는 연결을 추가했다.
- Phase 1 `주요 범위`에 deferred delivery 자동 retry와 source push notification, full Tier 2 delivery-ack uplift를 명시했다.
- Phase 1 `Owner refs`에 `aiox-adapter-model`과 `pair-slot-generalization`을 추가해 Tier 2 보장 조건과 source push notification 재평가 지점을 복원할 수 있게 했다.

**남은 검증:**

- `roadmap-restructure.md`의 다른 gate/phase도 같은 방식으로 `sample.md` 대비 누락·과밀을 섹션별로 계속 확인한다.

### 2026-07-10 16:24 · Phase 2 roadmap restructure draft 누락 보정

@user가 `sample.md`와 삭제 예정 `plans/a2a-execution.plan.md` 내용을 `spikes/roadmap-restructure.md`에
충분히 반영했는지 섹션별로 검증 중이며, Phase 2/S6에서 세 누락을 지적했다.

**확인한 사실:**

- `sample.md` 순서 11 Phase 2 row는 D 원장 Phase 2 항목으로 capability/instruction projection,
  app-server MCP config isolation hardening, native Windows/Named Pipes transport, group recipient
  visibility를 둔다.
- 같은 row는 C2(`claude_channel_disconnected` event)와 C3(runtime tier evaluator/diagnostics
  API·adapter registry)가 G3 diagnosability가 아니라 events/registry로 판정되면 Phase 2/S6로
  귀속된다고 둔다.
- `docs/decisions/codex-app-server-mcp-injection-and-isolation.md`는 daemon-owned app-server가
  unrelated global MCP config를 읽는 boundary를 release hardening concern으로 두며, isolated
  profile/home을 capability projection과 함께 재평가할 방향으로 둔다.
- `docs/specs/aiox-open-deferred.md`는 group recipient visibility / shared group context를 open/deferred
  항목으로 둔다.
- `spikes/roadmap-restructure.md` 기존 Phase 2 카드는 adapter boundary cleanup, durable replay,
  compose, third-vendor pressure만 대조 문구에 두고, app-server MCP config isolation과 group
  recipient visibility를 주요 범위나 owner refs에서 직접 복원하지 못했다. C2/C3도 G3 카드에는
  disposition 판단이 있었지만 Phase 2 카드의 수용 경계가 약했다.

**판단:**

- 세 지적은 `sample.md` 누락이 아니라 `roadmap-restructure.md` Phase 2 승격 초안에서 구체성이
  줄어든 지점이다.
- Phase 2는 gate card가 아니므로 착수 검토/통과 조건을 늘리지 않고, phase boundary·주요 범위·
  owner refs 수준에서 삭제 예정 문서 없이 복원되게 하는 것이 맞다.
- C2/C3는 지금 Phase 2로 확정하는 것이 아니라, G3에서 Phase 0으로 닫지 않고 명시 이연한 경우
  Phase 2가 최종 disposition을 소유한다고 표현하는 것이 맞다.

**반영:**

- `spikes/roadmap-restructure.md` Phase 2 목표 대조 문구에 event/diagnostics disposition과
  app-server MCP config isolation을 추가했다.
- Phase 2 `진입 조건 / 경계`에 G3가 C2/C3를 Phase 0에서 닫지 않고 명시 이연한 경우 이 phase가
  adapter/events boundary cleanup으로 최종 disposition을 소유한다고 추가했다.
- Phase 2 `주요 범위`에 runtime events surface와 diagnostics/tier-evaluator API의 adapter boundary
  정리, app-server MCP config isolation hardening and capability projection boundary, group recipient
  visibility / shared group context prerequisite design을 추가했다.
- Phase 2 `Owner refs`에 `aiox-adapter-model`, `aiox-open-deferred`,
  `codex-app-server-mcp-injection-and-isolation`을 추가하고, `local-runtime-gaps-and-targets` 설명에
  channel disconnect event를 포함했다.

**검증:**

- `scripts/check-markdown-inline-code spikes/roadmap-restructure.md` 통과.
- `rg`로 `app-server MCP config isolation`, `group recipient visibility`, `shared group context`,
  `runtime diagnostics/tier-evaluator`, `claude_channel_disconnected`, `adapter/events boundary`,
  `capability projection`이 Phase 2 카드에 존재함을 확인했다.

### 2026-07-10 17:06 · roadmap gate-card 규칙과 잔여 gap 흡수

@user가 subagent를 사용해 다음 두 작업을 수행하라고 지시했다: `docs/product/AGENTS.md`를 gate-card
roadmap 구조에 맞게 갱신하고, `spikes/roadmap-restructure.md`에 G1-A deliveryId 통과 조건, G5
dead/scaffold code, Phase 2 durable-store hazard를 보강한다.

**확인한 사실:**

- subagent 2개를 병렬로 실행했다. 하나는 `docs/product/AGENTS.md`만 수정했고, 하나는
  `spikes/roadmap-restructure.md`만 수정했다.
- `docs/product/AGENTS.md`는 기존 "Release Gates / Phases / Gate Evidence" skeleton 지시를
  Release Path / Gate Overview / Phase 0 gate cards / Post-Release phase cards / Gate Evidence /
  Cross-Platform Requirement 구조로 바꿨다.
- 같은 파일은 gate card 슬롯(`목표`, `진입 조건`, `착수 검토 / 열린 결정`, `통과 조건`,
  `Owner refs`), phase card 예외, annotated owner refs, `Current Execution Candidates` 제거,
  `Pre-Release Gap Summary` 제거, audit/source provenance의 `logs/` 귀속을 규칙에 반영했다.
- `docs/documentation-system.md`는 roadmap을 release gate, phase, priority, order owner로 정의하므로
  이번 skeleton 변경만으로는 수정하지 않았다.
- `spikes/roadmap-restructure.md` G1-A 통과 조건에 public `deliveryId` namespace 결정이 schema
  freeze와 repository schema에 반영되어야 한다는 조건을 추가했다.
- G5 착수 검토에 공개 repo에 남는 dead/scaffold code의 허용 범위와 처리 정책 결정을 추가했고,
  `docs/specs/aiox-runtime-profile-namespace`와
  `docs/decisions/runtime-profile-namespace-isolation`을 G5 owner refs에 추가했다.
- Phase 2 경계에 durable persistence를 공개 release blocker로 승격할 때 stable daemon identity와
  reply idempotency를 함께 닫아야 한다는 hazard framing을 추가했다.
- G5 Gate Evidence에 dead/scaffold code disposition을 추가했다.

**판단:**

- `Pre-Release Gap Summary` 제거 전에 남던 현재 release pressure 중 이번 범위에서 필요한 항목은
  gate/phase card로 흡수됐다.
- 별도 `Validation Provenance` 섹션은 만들지 않는 결정을 유지한다. 과거 audit/source provenance는
  roadmap이 아니라 `logs/` owner로 둔다.
- `docs/product/AGENTS.md`와 `roadmap-restructure.md`의 새 구조는
  `docs/documentation-system.md`의 roadmap owner 정의와 충돌하지 않는다.

**검증:**

- `scripts/check-markdown-inline-code docs/product/AGENTS.md spikes/roadmap-restructure.md logs/workspace-reset/product-a2a/2026-07-09-sample-execution-order-view-restructure.md` 통과.
- `rg`로 `deliveryId` schema freeze 통과 조건, `dead/scaffold`, `stable daemon identity`,
  `reply idempotency`가 `spikes/roadmap-restructure.md`에 존재함을 확인했다.

**남은 상태:**

- `docs/product/roadmap.md` 승격은 아직 수행하지 않았다.
- `sample.md`와 `plans/a2a-execution.plan.md` 삭제 readiness는 아직 별도 재판정이 필요하다.

### 2026-07-10 17:15 · roadmap 승격과 계약-산출물 drift 해소

@user가 Claude 리뷰의 cross-file drift 지적을 반영하라고 지시했다. 핵심은 `docs/product/AGENTS.md`가
gate-card roadmap 구조와 removed sections를 이미 규정하는데, 실제 `docs/product/roadmap.md`가 아직
구조 개편 전 상태라 계약과 산출물이 어긋난다는 점이었다.

**확인한 사실:**

- `docs/product/roadmap.md`에는 승격 전 `sample.md` inbound note, `Current Execution Candidates`,
  `Pre-Release Gap Summary`가 남아 있었다.
- `docs/product/AGENTS.md`는 이미 `Current Execution Candidates`와 `Pre-Release Gap Summary`를
  removed sections로 규정하고 있었다.
- `spikes/roadmap-restructure.md`는 gate-card 구조와 G1-A/G5/Phase 2 보강을 포함한 승격 source였다.

**반영:**

- `spikes/roadmap-restructure.md` 본문을 `docs/product/roadmap.md`로 승격했다.
- `docs/product/roadmap.md`의 정식 title, `Related`, `Status: Current`, roadmap owner 설명과
  `plans/release-plan.md` 경계 설명은 유지했다.
- 승격 과정에서 `sample.md` inbound note, `Current Execution Candidates`,
  `Pre-Release Gap Summary`를 제거했다.
- `docs/product/AGENTS.md`의 section label을 실제 roadmap heading과 맞춰 `Phase 0 Release Gates`,
  `Post-Release Phases`로 고쳤다.
- 승격 뒤 남아 있던 초안 문구 "이 spike가 승격되기 전까지"와 모호한 "G1 spike" 표현을 정식 roadmap
  표현으로 낮췄다.

**검증:**

- `scripts/check-markdown-inline-code docs/product/roadmap.md docs/product/AGENTS.md logs/workspace-reset/product-a2a/2026-07-09-sample-execution-order-view-restructure.md` 통과.
- `rg`로 `sample.md`, `Product Roadmap Restructure Draft`, `Status: Spike`, `Drafting Rules`,
  `승격되기 전`, `G1 spike`, 구 section label이 `docs/product/roadmap.md`와
  `docs/product/AGENTS.md`에 남지 않았음을 확인했다. `Current Execution Candidates`와
  `Pre-Release Gap Summary`는 `AGENTS.md`의 removed-section 규칙 설명에만 남아 있다.

**남은 상태:**

- `docs/product/AGENTS.md`와 `docs/product/roadmap.md`의 contract-ahead-of-artifact drift는 해소됐다.
- `plans/a2a-execution.plan.md`의 Source Disposition Map / traceability forward-claim 삭제 blocker는
  이번 승격으로 자동 해소되지 않았으므로 별도 재판정이 필요하다.

### 2026-07-10 17:24 · 승격 spike 삭제와 sample stale anchor 처리 방침

@user가 후속 리뷰의 권장 작업 중 1번과 2번을 수행하고, 3번(`sample.md` stale roadmap anchor)은
삭제 예정이므로 고치지 않고 삭제 판단으로 가는 것으로 명시하라고 지시했다.

**확인한 사실:**

- `spikes/roadmap-restructure.md`는 `docs/product/roadmap.md`로 이미 승격됐고, 독립 검토에서
  roadmap 본문과 spike 본문의 실질 차이가 초안 흔적 제거뿐임이 확인됐다.
- `docs/product/roadmap.md`에는 더 이상 `sample.md`, `Current Execution Candidates`,
  `Pre-Release Gap Summary` 참조가 없다.
- `sample.md`에는 제거된 roadmap section을 향한 stale line anchor가 남아 있지만, 사용자는 이를
  수정하지 않고 삭제 판단으로 넘기라고 지시했다.

**반영:**

- `spikes/roadmap-restructure.md`를 삭제했다.
- `docs/product/AGENTS.md`에 `G1/G3 Parallel Stabilization`, `G5/G6 Release Preparation` 같은 grouping
  heading 아래 sub-gate card 중첩을 허용하는 규칙을 추가했다.
- `sample.md`의 stale roadmap anchor는 수정하지 않았다. 이 stale anchor는 `sample.md` 유지보수
  대상이 아니라 삭제 readiness 판단에서 소비할 known issue로 둔다.

**남은 상태:**

- `sample.md` 삭제 판단은 stale anchor 수정이 아니라 삭제 readiness 판정으로 진행한다.
- `plans/a2a-execution.plan.md` 삭제는 Source Disposition Map / traceability forward-claim 재판정이
  여전히 필요하다.

### 2026-07-10 17:35 · a2a-plan Source Disposition Map 재판정 방식 결정

@user와 `plans/a2a-execution.plan.md` 삭제 blocker인 Source Disposition Map forward-claim 해소 방식을
논의했다. 결정 방향은 표를 다른 durable 문서로 재복제하지 않고, 현재 owner 문서와 decided source-map
로그만으로 충분한지 검증한 뒤 이 open log에 현재 재판정을 남기는 것이다.

**확인한 사실:**

- `plans/a2a-execution.plan.md`에는 `## Source Disposition Map`과 `### 필수 보정`이 있으며, legacy
  6개 source와 wire-contract 보정 mapping을 보존한다.
- `logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md`의 6개 legacy row는 모두
  `plans/a2a-execution.plan.md` Source Disposition Map을 삭제 후 traceability owner로 가리킨다.
- 같은 source-map 로그는 `2026-07-08` physical deletion 이후 legacy→successor slice traceability를
  `plans/a2a-execution.plan.md` Source Disposition Map이 historical mapping으로 소유한다고 기록한다.
- `logs/workspace-reset/plan-stages/2026-06-29-workspace-reset-stage9-post-mvp-plan-disposition.md`도 `plans/a2a-execution.plan.md`
  Source Disposition Map과 필수 보정은 삭제하지 않고 유지한다고 기록한다.
- `docs/product/roadmap.md` 승격 후 gate/phase/order/evidence와 G1/G3/Phase 2 routing은 roadmap
  gate-card 구조로 복원 가능하다.

**결정:**

- 다음 세션에서는 Source Disposition Map을 새 문서나 roadmap으로 옮기지 않는다.
- 대신 다음 기준을 통과하면 `plans/a2a-execution.plan.md`의 Source Disposition Map은 더 이상 삭제 후
  survivor owner가 아니며, legacy→owner traceability는 decided source-map logs + current owner docs +
  roadmap gate cards로 충분하다고 현재 재판정한다.
- decided source-map 로그의 과거 forward-claim은 당시 disposition record로 남기고, 현재 삭제 판단은
  이 open log의 새 재판정 entry가 대체한다. 과거 로그 entry를 조용히 수정하지 않는다.

**다음 세션 검증 기준:**

1. `plans/a2a-execution.plan.md` Source Disposition Map의 legacy 6-source 목록과 disposition을 뽑는다.
2. `logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md`와
   `logs/workspace-reset/plan-stages/2026-06-29-workspace-reset-stage9-post-mvp-plan-disposition.md`만으로 legacy 6-source별 삭제
   경위, successor 연결, self-sufficiency 판단을 복원할 수 있는지 확인한다.
3. `docs/product/roadmap.md`에서 G1-A/B/C/D, G3, G2, G5/G6, G4, Phase 1/2/3 순서와 owner refs를
   복원할 수 있는지 확인한다.
4. 필수 wire-contract 보정이 durable owner에 남아 있는지 확인한다: `replyExpected`,
   `inReplyToDeliveryId`, `thread_status` 비권위, `awaiting_reply`/`awaiting_agent_reply` 정합,
   Codex named app-server surface 제약.
5. 위 기준을 통과하면 새 entry에 "plan Source Disposition Map은 삭제 후 survivor owner가 아니다",
   "삭제 시 source-map 로그의 forward-claim은 historical claim으로 남고 현재 재판정이 대체한다"를
   명시한다.

**남은 상태:**

- 아직 `plans/a2a-execution.plan.md`와 `sample.md`를 삭제하지 않는다.
- 다음 세션의 첫 작업은 위 검증 기준으로 a2a-plan deletion readiness를 재판정하는 것이다.

### 2026-07-10 · a2a-plan deletion readiness 재판정

@user가 작업 진행을 지시했다. 17:35 entry의 검증 기준에 따라 `plans/a2a-execution.plan.md` 없이도
legacy 삭제 경위, gate routing, wire-contract 보정이 복원되는지 직접 대조했다. subagent는 새로 쓰지
않았다. 이번 작업은 이미 생성된 roadmap/owner 문서와 decided 로그의 self-sufficiency를 판정하는
작업이라, 추가 병렬 조사보다 main agent의 직접 대조가 적합했다.

**확인한 사실:**

- `logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md`는 6개 legacy source의 row와 2026-07-08
  dated blocks에서 삭제 경위, successor 연결, 최종 deletion disposition을 보존한다:
  `prd/post-mvp/aiox-a2a-spec.md`, `plans/post-mvp.plan.md`,
  `plans/post-mvp/envelope-metadata.plan.md`, `plans/post-mvp/codex-structured-metadata-spike.plan.md`,
  `plans/post-mvp/adapter-dispatch-registry.plan.md`,
  `plans/post-mvp/channel-boot-surface.plan.md`.
- `logs/workspace-reset/plan-stages/2026-06-29-workspace-reset-stage9-post-mvp-plan-disposition.md`는 W1~W4에서 successor 필요 범위,
  Source Disposition Map 생성 이유, W4 self-sufficiency 검증, 6개 후보 `delete-ready` 판정,
  사용자 승인 후 물리 삭제와 dead-ref 결과를 보존한다.
- `docs/product/roadmap.md`는 G0 → G1/G3 병행 → G2 → G5/G6 → G4 → publish → Phase 1/2/3 순서,
  G1-A/B/C/D, G3, G2, G5/G6, G4 gate card, Gate Evidence, annotated Owner refs를 보존한다.
- 필수 wire-contract 보정은 durable owner에서 복원된다:
  - `replyExpected`, `inReplyToDeliveryId`, reply obligation state `awaiting_reply`는
    `docs/specs/aiox-message-lifecycle.md`에 있다.
  - `thread_status`를 routing/state-transition authority로 만들지 않는 검토는 roadmap G1-B에 있다.
  - `awaiting_agent_reply`는 docs 전역에서 제거되어 정합 완료됐고, lifecycle 권위어
    `awaiting_reply`만 durable owner에 남아 있다.
  - Codex named app-server surface 직접 검증과 generic `turn/start` 대체 금지는
    `docs/specs/aiox-open-deferred.md`와 roadmap G1-A에서 복원된다.
- live docs/plan scan 결과, `sample.md` 참조는 `docs/product/roadmap.md`에서 제거됐다.
  `plans/a2a-execution.plan.md` 참조는 `plans/workspace-reset/workspace-reset.md`의 완료 기록에만 남는다.
  `S1~S6`/`B1~B6`/`C1~C6` 검색 결과 중 `plans/release-plan.md`의 `B1/B2`는 release-plan 자체 항목 번호이고,
  `docs/architecture/local-runtime-gaps-and-targets.md`의 `S5/G3`는 Claude boot-failure gap의 historical
  gate/slice 설명이다. 둘 다 `sample.md` label 보존 요구가 아니다.

**판단:**

- `plans/a2a-execution.plan.md`의 Source Disposition Map은 더 이상 삭제 후 survivor owner가 아니다.
  과거에는 legacy 삭제 게이트를 통과시키는 transitional successor였지만, 현재는 decided source-map logs,
  stage9 deletion log, roadmap gate cards, spec/architecture/decision owner 문서가 복원 경로를 분담한다.
- decided 로그의 "`plans/a2a-execution.plan.md` Source Disposition Map이 traceability를 소유한다"는 문구는
  2026-07-08 당시의 historical claim으로 유지한다. 현재 삭제 readiness 판단은 이 entry가 대체한다.
- `sample.md`도 장기 owner가 아니며, roadmap 승격 뒤 남은 stale anchor는 수정 대상이 아니라 삭제 판단에서
  소비할 known issue다.
- 별도 backlog/triage/crosswalk 문서는 만들지 않는다. orphan candidate는 확인되지 않았다.
- 이 로그는 1000 lines를 넘었지만 지금 분리하지 않는다. 현재 남은 판단은 같은 수명 안의
  `sample.md`/`plans/a2a-execution.plan.md` 은퇴 readiness closeout이며, 새 로그로 분리하면 삭제 판단과
  이전 roadmap 승격 경위가 갈라져 복원 비용이 커진다. 실제 release gate 실행에 들어갈 때는 별도
  `G1-A`/`G1-B`/`G3` stage log를 생성한다.

**Deletion readiness:**

- `plans/a2a-execution.plan.md`: 삭제 가능. 삭제해도 legacy 6-source deletion disposition, G1/G3/Phase 2
  routing, wire-contract 보정과 deferred boundary는 decided logs + current owner docs에서 복원된다.
- `sample.md`: 삭제 가능. 필요한 content-based gate pointer와 owner refs는 roadmap/owner docs로 흡수됐고,
  stale roadmap anchor를 고칠 이유는 없다.
- 실제 파일 삭제는 destructive action이므로 별도 명시 승인 뒤 수행한다.

### 2026-07-10 · sample/a2a-plan 삭제 실행

@user가 "오케이 삭제하라"고 명시 승인했다. 앞선 deletion readiness 재판정과 Claude review C-1 정정 뒤,
삭제 대상 두 파일을 실제로 제거했다.

**삭제 실행:**

- `sample.md`
- `plans/a2a-execution.plan.md`

**확인한 사실:**

- 삭제 후 두 파일은 filesystem에 존재하지 않는다.
- `git status --short -- sample.md plans/a2a-execution.plan.md` 결과, tracked 파일
  `plans/a2a-execution.plan.md`는 `D` 상태다. `sample.md`는 untracked file이었으므로 status 출력에 남지
  않는다.
- live docs/plan 참조 스캔 결과:
  - `plans/a2a-execution.plan.md` 참조는 `plans/workspace-reset/workspace-reset.md`의 2026-07-08
    완료 기록 1건뿐이다. 이는 historical 완료 기록이며 active authority가 아니다.
  - `sample.md` 참조는 live docs/plan/root entry surface에서 확인되지 않았다.
  - `plans/release-plan.md`의 `B1/B2`는 release-plan 자체 항목 번호이고 sample B 원장 라벨이 아니다.
  - `docs/architecture/local-runtime-gaps-and-targets.md`의 `S5/G3`는 Claude boot-failure diagnosability
    gap 설명 안의 historical gate/slice label이며, 삭제 blocker가 아니다.

**판단:**

- 삭제 후 새 active blocker는 확인되지 않았다.
- 이 로그는 deletion readiness와 실행 기록을 소유한다. decided source-map/stage9 로그의 과거
  `plans/a2a-execution.plan.md` traceability claim은 historical claim으로 유지하고, 현재 복원 경로는
  이 로그의 재판정 entry가 대체한다.

### 2026-07-10 · 다음 legacy/a2a-execution 복원 검토 기준 보정

@user가 다음 검토 기준을 정정했다. 핵심은 `S1~S6`, `B1~B6`, `C1~C6`, `D` 같은 label을 없앴다는
사실 자체가 아니라, 삭제된 legacy 문서들과 삭제된 `plans/a2a-execution.plan.md`에서 그 label들이
가리키던 내용이 현재 owner 문서에서 복원되는지다.

**다음 작업자가 명심할 기준:**

- 질문은 "충분히 들어갔는가"가 아니라 "다른 세션의 다른 agent가 삭제된 legacy 문서와 삭제된
  `plans/a2a-execution.plan.md` 없이도 release/gate/routing/owner 판단을 복원할 수 있는가"다.
- `S1~S6`, `B1~B6`, `C1~C6`, `D` 같은 legacy/sample/a2a-execution label 자체를 roadmap에 보존했는지
  확인하는 작업이 아니다.
- 대신 그 label이 가리키던 내용이 다음 위치에 owner 성격에 맞게 남았는지 대조한다:
  - roadmap: gate/phase/order/evidence와 gate별 content-based kickoff/open-decision pointer.
  - specs: external contract, wire key, lifecycle state, open/deferred contract.
  - architecture: current gap, internal routing/adapter/runtime structure, target/deferred structure.
  - decisions: rationale, trade-off, re-evaluation condition.
  - release-plan: G6/npm publish 직전 packaging checklist.
- 따라서 검토 산출물도 label crosswalk를 새로 보존하는 것이 아니라, 각 legacy/a2a-execution 항목의
  내용이 어느 owner에서 복원되는지와, 빠진 load-bearing 내용이 있는지만 보고한다.

### 2026-07-10 · 다음 복원 검토 대상 파일 세트

@user가 다음 작업에서 대조해야 할 삭제 source와 current owner 문서 세트를 정리했다. 이 목록은 다음
세션/다른 agent가 검토 범위를 복원하기 위한 required input이다. 원칙은 위 entry와 같다: label
crosswalk를 새로 보존하는 것이 아니라, 삭제 source와 deleted successor에 있던 내용이 current owner에서
복원되는지 확인한다.

**삭제된 stage9 legacy source 6개:**

- `prd/post-mvp/aiox-a2a-spec.md` — product/protocol/architecture/roadmap 통합 monolith. 특히 §11 release
  gate/DoD, §12 release pressure, §13 architecture debt/structured logger를 확인한다.
- `plans/post-mvp.plan.md` — Post-MVP 실행 index / sequencing intent. `async-petting-hoare` 운영 라인은
  A2A successor 제외, repo 밖 scratch 별도 보존으로 판정된 상태다.
- `plans/post-mvp/envelope-metadata.plan.md` — G1-A/B/C로 이어지는 envelope/lifecycle migration 실행
  detail. canonical envelope, `replyExpected`, `inReplyToDeliveryId`, send-boundary, no sleep/polling,
  migration/backfill/rollback, reliability 연결을 확인한다.
- `plans/post-mvp/codex-structured-metadata-spike.plan.md` — Codex structured ingress spike. named app-server
  surface, generic `turn/start` 대체 금지, Tier 2 과장 금지를 확인한다.
- `plans/post-mvp/adapter-dispatch-registry.plan.md` — adapter registry / dispatch cleanup deferred plan.
  Phase 2 prerequisite, adapter registry가 current contract가 아님, runtime diagnostics/tier evaluator를
  확인한다.
- `plans/post-mvp/channel-boot-surface.plan.md` — Claude channel boot diagnosability plan. G3/S5
  diagnosability, Claude-specific gap, broad child-process boot contract로 일반화 금지를 확인한다.

**방금 삭제한 transitional successor:**

- `plans/a2a-execution.plan.md` — 위 6개를 한때 S1~S6로 이어준 transitional successor. Source Disposition
  Map, 필수 보정, S1~S6 routing이 이제 `docs/product/roadmap.md`와 owner docs에서 복원되는지 확인한다.

**현재 대조해야 할 owner 문서:**

- `docs/product/roadmap.md` — release order, G0~G6, G1-A/B/C/D, G3, Phase 1~3, Gate Evidence.
- `docs/specs/aiox-message-lifecycle.md` — canonical envelope, `replyExpected`, `inReplyToDeliveryId`,
  send-boundary, `awaiting_reply`.
- `docs/specs/aiox-open-deferred.md` — Codex named app-server surface, `turn/start` 대체 금지,
  deferred lifecycle/session/retry topics.
- `docs/specs/aiox-adapter-model.md` — adapter tier, Codex/Claude capability caveat, adapter registry/runtime
  diagnostics gap.
- `docs/architecture/local-runtime-gaps-and-targets.md` — send-boundary/inbound reply, queued delivery,
  channel disconnect, Claude boot failure, socket dispatch hardening, adapter registry target.
- `docs/architecture/local-runtime-routing-and-delivery.md` — routing/delivery/reply resumption 구조.
- `docs/architecture/local-runtime-codex-adapter.md` — Codex app-server, `turn/start`, proxy,
  ingress/runtime failure caveat.
- `docs/architecture/local-runtime-claude-adapter.md` — Claude channel launch/registration/boot-failure boundary.
- `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md` — envelope/correlation rationale,
  correlated reply authorization open decision.
- `docs/decisions/pair-slot-generalization.md` — adapter registry/N-agent/future route generalization,
  deferred retry/source push.
- `docs/decisions/codex-per-agent-app-server.md` — Codex app-server topology, fire-and-forget `turn/start`
  rationale.
- `docs/decisions/claude-channel-trust-and-registration.md` — Claude registration token, reverse push auth gap.
- `plans/release-plan.md` — G6/npm publish 직전 checklist: `dist`, `prepublishOnly`, license/package metadata,
  `npm pack`, clean install smoke.

### 2026-07-10 20:40 · 2026-07-10 · structured logger / daemon-silence G3 owner 반영

@user가 structured logger / daemon-silence current gap 후보가 어느 roadmap gate에서 풀려야 하는지 물었고, G3 Daemon Stabilization이 primary gate라고 확인한 뒤 owner 반영을 지시했다.

**확인한 사실:**

- `docs/product/roadmap.md` G3는 daemon이 조용히 실패하거나 손상된 상태로 계속 실행되지 않게 lifecycle, transport, diagnostics의 실패 경계를 release-grade로 고정하는 gate다.
- 현행 `docs/architecture/local-runtime-gaps-and-targets.md` Current Gaps에는 daemon-owned retained structured log sink 또는 daemon-level diagnostics surface 부재가 별도 gap으로 없었다.
- 코드 대조 결과 daemon entrypoint/socket transport 쪽에는 retained log sink가 확인되지 않았고, adapter helper process 쪽에는 stderr JSONL helper가 존재한다: `src/daemon/run.ts:24-84`, `src/daemon/socket-transport.ts:48-84`, `src/adapters/claude/channel-server.ts:615-617`, `src/adapters/codex/mcp-server.ts:478-480`.

**판단:**

- 삭제 readiness blocker는 아니지만, `prd/post-mvp/aiox-a2a-spec.md` §13 계열 structured logger / daemon silence 부채 중 load-bearing한 현재 gap은 architecture owner에 남기는 것이 맞다.
- 이 gap의 primary roadmap gate는 G3다. G4는 동일 release candidate 재검증, G5는 log redaction/secret exposure 교차검증에 가깝다.
- `aiox logs` command나 특정 daemon log file path는 아직 committed command contract로 확정하지 않고, G3에서 결정할 diagnostics/log surface 후보로 둔다.

**반영:**

- `docs/architecture/local-runtime-gaps-and-targets.md` Current Gaps에 `Daemon structured logging / retained diagnostics surface`를 추가했다.
- 같은 문서 Evidence에 daemon entrypoint/socket transport와 adapter stderr JSONL helper 근거를 추가했다.
- `docs/product/roadmap.md` G3 착수 검토 항목을 `daemon-owned retained diagnostics/log surface`가 어느 수준까지 보존되고 doctor/logs/status 계열 tooling에 노출되어야 하는지 결정하는 문구로 보강했다.

**검증:**

- `scripts/check-markdown-inline-code docs/architecture/local-runtime-gaps-and-targets.md` 통과.
- `scripts/check-markdown-inline-code docs/product/roadmap.md` 통과.

**남은 작업:**

- 이 문서 정리 workstream 자체의 blocker는 새로 확인되지 않았다.
- 실제 G1/G3 구현 착수 시에는 roadmap gate 이름 기준으로 stage log 또는 plan을 열고, G3 stage log가 이 diagnostics/log surface gap을 구현·검증 항목으로 소비해야 한다.
