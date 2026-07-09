# A2A Execution Plan

## Objective

로컬 단일 daemon Codex↔Claude A2A 안정 왕복(roadmap G1)과 daemon 진단성(roadmap G3)
workstream의 실행을 하나의 execution plan으로 잇는다. 기존 `plans/post-mvp.plan.md` index와
네 개 `plans/post-mvp/*.plan.md` sub-plan, `prd/post-mvp/aiox-a2a-spec.md §11`에 흩어진
실행 detail을 현행 owner 문서 기준으로 재정렬해 흡수한 successor다.

완료되면 A2A 실행이 legacy sub-plan 다섯 개가 아니라, roadmap gate·spec contract·
architecture gap·decision에 앵커된 단일 ordered slice 목록에서 재개·검증된다.

## Authority Boundary

이 plan은 **실행 sequencing과 slice 분해, 그리고 각 slice가 앵커된 gate·owner mapping만**
소유한다. slice별 상세 acceptance 조건, verification path, owner-update 반영은 각 slice
착수 시 생성하는 stage 로그가 owner docs를 대조해 소유한다(`plans/AGENTS.md`). 이 plan은
product/roadmap/spec/architecture/decision의 권위 본문을 다시 소유하거나 복제하지 않는다.
각 slice가 참조할 owner는 아래와 같다.

- Release gate 통과 조건·phase·순서: `docs/product/roadmap.md`
- 외부 contract(envelope, lifecycle, adapter, open/deferred): `docs/specs/aiox-a2a.md`
  index와 slice `docs/specs/aiox-message-lifecycle.md`(§4), `docs/specs/aiox-adapter-model.md`(§5),
  `docs/specs/aiox-open-deferred.md`(§9)
- 내부 구조·gap·target: `docs/architecture/local-agent-runtime.md`,
  `docs/architecture/local-runtime-routing-and-delivery.md`,
  `docs/architecture/local-runtime-codex-adapter.md`,
  `docs/architecture/local-runtime-claude-adapter.md`,
  `docs/architecture/local-runtime-gaps-and-targets.md`
- 결정 근거: `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`,
  `docs/decisions/pair-slot-generalization.md`,
  `docs/decisions/codex-per-agent-app-server.md`,
  `docs/decisions/claude-channel-trust-and-registration.md`

gate가 무엇을 요구하는지는 roadmap이, contract 본문은 spec이, 왜 그렇게 설계했는지는
decision이 소유한다. 이 plan은 그 조건을 slice 순서로 배치하기만 하고, 각 slice가 완료 후
어느 owner를 어떻게 갱신할지는 해당 stage 로그가 착수 시 정한다.

## Completion condition

- release-gating slice(S1 G1-A ~ S5 G3/G1 boundary)가 각자의 roadmap gate evidence
  (`docs/product/roadmap.md` Gate Evidence)를 충족하고, 착수 stage 로그가 정한 owner
  반영을 마친다.
- G1은 `docs/product/roadmap.md §G1`에 따라 G1-A/B/C/D 네 단위를 모두 통과하고
  인증된 안정 왕복이 확인되기 전에는 완료로 보지 않는다. G3는 §G3 진단성 항목을 충족한다.
- envelope decision이 열어 둔 두 항목 — correlated-reply authorization 경로 모델과
  public `deliveryId` namespace — 이 S2에서 결정된다. 결정 결과(current outcome/status)는
  spec/architecture/roadmap owner에 반영하고, 새 rationale이 필요하면 새 decision을 작성하며
  기존 decision은 provenance/link만 보수한다(decision을 current-state owner로 패치하지 않는다).
- S6(adapter dispatch registry)은 release-blocking이 아닌 later-execution candidate /
  Phase 2 prerequisite로 명시적으로 이연된다. A2A 왕복 완료 조건에 포함되지 않는다.
- 이 plan의 어떤 slice도 contract·gate·rationale 본문을 복제하지 않고 owner 문서를 참조한다.

## Source Disposition Map

legacy source별로 이 plan이 흡수/보정/제외하는 범위. 권위 본문은 흡수하지 않고 owner가
이미 소유한다(W8/W9/W10 흡수 완료). 이 표는 실행 detail의 disposition만 정하며, W3의
roadmap repoint·source-map 재판정이 정보 손실 없이 이 표를 근거로 수행된다.

**Legacy source deleted after W4 (2026-07-08):** 아래 표의 6개 legacy source는 stage 9 W4에서 물리
삭제됐다. 이 표는 삭제 후에도 legacy→successor slice traceability를 남기는 historical mapping이며, 각
path는 더 이상 live 파일이 아니다(권위는 이미 roadmap/spec/architecture/decision owner가 소유). 삭제
경위는 `logs/2026-06-29-workspace-reset-stage9-post-mvp-plan-disposition.md` W4와
`logs/2026-06-21-workspace-reset-legacy-source-absorption.md`가 소유한다.

| Legacy source | Disposition | Target slice / 처리 |
| --- | --- | --- |
| `plans/post-mvp.plan.md` (index + Session Re-entry) | 부분 흡수 / 부분 제외 | sequencing intent만 이 plan으로. stale 운영환경 셋업(async-petting-hoare) 상태 서술은 제외. `~/.claude/plans/async-petting-hoare.md` scratch pointer는 별도 보존(아래 Deferred) |
| `plans/post-mvp/envelope-metadata.plan.md` | 흡수 + 보정 | §3 scope 1–2 → S1(G1-A), §4 increment·§5 acceptance·§8 cutover → S2(G1-B), delivery lifecycle/reliability 인접 실행 detail → S3(G1-C). 용어 보정 아래 "필수 보정" |
| `plans/post-mvp/codex-structured-metadata-spike.plan.md` | 흡수 + 재분류 | S1(G1-A) evidence / ordering spike. Tier 2 승격 근거 아님(`docs/specs/aiox-open-deferred.md` §9: 검증 전 Tier 2 금지). 조사 surface는 named app-server method로 보정 |
| `plans/post-mvp/adapter-dispatch-registry.plan.md` | 이연 배치 | S6 later-execution candidate / Phase 2 prerequisite. current contract 아니라 implementation gap(`docs/specs/aiox-adapter-model.md`) |
| `plans/post-mvp/channel-boot-surface.plan.md` | 흡수 + 범위 제한 | S5(G3/G1 boundary) Claude-specific 진단성. broad child-process boot contract로 일반화 금지(구 sub-plan이 Codex/기타 startup surface를 별도 후보로 분리했음; 원본 deleted after W4) |
| `prd/post-mvp/aiox-a2a-spec.md §11` | 참조 흡수 | release gate/DoD/blocker detail을 각 slice의 gate 관련성 앵커로 사용. 권위는 roadmap/spec이 이미 흡수. §11 본문 복제 안 함. source-map final disposition은 W4 |

### 필수 보정 (legacy → 현행 wire contract)

`docs/specs/aiox-message-lifecycle.md §4.1` canonical envelope v1 기준. wire key는 camelCase다.
이 보정 mapping은 legacy 용어가 어느 현행어로 바뀌는지를 보존하며, 실제 적용·확정은 해당
slice 착수 stage 로그가 owner와 대조해 수행한다.

- `reply_expected` → wire/schema에서는 `replyExpected`. 개념 축 이름(prose)으로서의
  `reply_expected`는 spec Glossary/§4.5에도 남아 있어 허용되나 JSON/schema 문맥은 `replyExpected`.
- reply correlation `parent_message_id` → `inReplyToDeliveryId`. 현재 코드의
  `parentMessageId`/Claude `chat_id`는 logical message id를 가리켜 비준수이며 v1 cutover에서
  deliveryId 기반으로 교체(spec §4.2, decision envelope-and-correlation).
- `thread_status`는 spec 권위어가 아니다. conclusion은 `intent: "conclusion"`으로 표현하고,
  reply obligation 상태는 `awaiting_reply | fulfilled | cancelled | expired`다. thread-lifecycle
  저장 명칭은 S2 kickoff에서 현행 code naming과 대조해 확정한다(구 envelope-metadata.plan.md도 이
  명칭을 stale로 self-flag했었다; 원본 deleted after W4).
- 용어 불일치 조정: `docs/specs/aiox-open-deferred.md`의 `awaiting_agent_reply` vs lifecycle
  권위어 `awaiting_reply`를 S2에서 정합한다.
- Codex spike는 generic `turn/start`가 아니라 named app-server surface(`thread/inject_items`,
  `turn/steer`, `turn/started|completed`, `outputSchema`, `thread/tokenUsage/updated`)를 조사한다.

## Stages

실행 slice(진입 순서). 각 slice의 상세 acceptance, verification path, owner-update는 이 plan이
소유하지 않는다. 각 slice 착수 시 그 slice의 stage 로그를 생성해 아래 불릿에 포인터로 연결하고,
그 로그가 착수 시점에 owner docs(roadmap gate·spec contract·architecture gap·decision)를 대조해
상세를 소유·검증한다. 실행 자체는 이 stage 9 범위 밖의 후속 workstream이며 현재 전 slice
미착수 상태다.

- [ ] S1 G1-A — contract·ingress freeze + Codex structured-ingress spike (G1-A evidence; S2 Codex render 경로 선행 결정)
- [ ] S2 G1-B — canonical envelope v1 cutover (S1 spike 결과 의존; envelope decision open 2항목을 여기서 결정)
- [ ] S3 G1-C — delivery reliability (§4 schema 고정 후 S4와 병행)
- [ ] S4 G1-D — local trust boundary (§4 schema 고정 후 S3와 병행; 인증된 왕복 필수)
- [ ] S5 G3/G1 boundary — daemon diagnosability·Claude channel boot-failure surface (G1과 병행 가능; Claude 한정, broad boot contract로 일반화 금지)
- [ ] S6 adapter dispatch registry·adapter boundary cleanup (deferred; G1 이후·Phase 2 prerequisite, release-blocking 아님)

## Deferred / Not In Scope

- product/roadmap gate·spec contract·decision rationale 본문 복제 금지. 이 plan은 owner를 링크한다.
- `async-petting-hoare` 운영환경 셋업 라인은 이 A2A execution에 흡수하지 않는다. scratch pointer
  `~/.claude/plans/async-petting-hoare.md`(WS1~4 원본 상세, Claude scratch)는 별도 보존(repo 밖
  개인 scratch, W9 closeout handoff). 그 주변 WS1~4 상태 서술은 stale.
- Phase 1.5 early-entry trigger를 gate로 승격하지 않는다. roadmap에는 Phase 1.5가 없고,
  구 envelope-metadata.plan.md §7 early-entry trigger는 kickoff-candidate 상태로 대체됐다(원본 deleted after W4).
- WS1/AGENTS cleanup 상태(stale 운영 셋업)는 재작성하지 않는다.
- adapter registry(S6)를 current contract로 과확장하지 않고, channel boot surface(S5)를 broad
  child-process boot contract로 일반화하지 않는다.
- durable store / mailbox replay는 Phase 2이며 G3 gate가 아니다.
- Compose, 3rd vendor, N-agent routing, remote/federation은 Phase 2/3 범위로 이 plan 밖이다.
- 이 successor plan 작성만으로 roadmap repoint·source-map 재판정·물리 삭제를 수행하지 않는다.
  그 경계는 stage 9 로그(`logs/2026-06-29-workspace-reset-stage9-post-mvp-plan-disposition.md`)의
  W3/W4가 소유한다:
  - W3(정합, 물리 삭제 아님): `docs/product/roadmap.md` `Current Execution Candidates`의 4개 legacy
    row를 이 successor로 repoint하되 successor + slice mapping을 보존하고,
    `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`의
    `keep / execution successor pending` rows를 successor 연결 상태로 재판정한다.
  - W4(삭제 gate): 사용자 승인 후 `plans/post-mvp*`와 `prd/post-mvp/aiox-a2a-spec.md`를 물리 삭제하고
    source-map final deletion disposition을 실행했다(2026-07-08 완료). 위 Source Disposition Map은
    삭제 후 legacy→slice traceability로 유지된다.

## Notes

- 이 plan은 `plans/AGENTS.md` 골격(제목·Objective·Completion condition·Stages)을 따르는 얇은
  stage-pointer plan이다. slice 순서·상태·stage 로그 포인터와 legacy source→slice disposition
  mapping만 소유하고, slice별 상세 acceptance/verification/owner-update와 실행 중 산출되는
  검증 결과·판정·재개 context는 각 slice 착수 시 생성하는 stage 로그가 소유한다.
- Source Disposition Map과 필수 보정은 owner 본문 복제가 아니라 legacy→successor disposition
  mapping이므로 이 plan이 유지한다. W3의 roadmap repoint·source-map 재판정은 이 mapping을 근거로
  정보 손실 없이 수행한다.
- Sources(provenance, 현재 권위 대체 아님): `logs/2026-06-29-workspace-reset-stage9-post-mvp-plan-disposition.md`
  W1(흡수 범위 확정)·W2(successor 작성·구조 보정), `plans/workspace-reset/workspace-reset.md` stage 9.
