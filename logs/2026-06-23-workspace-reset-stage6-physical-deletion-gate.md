---
topic: workspace reset stage6 물리 삭제 게이트
description: workspace reset plan stage 6 — legacy source map과 history migration map을 소비해 삭제 대상을 확정하고, 삭제 전 owner·decision·archive의 history 출처를 평문 provenance로 전환한 뒤 history/·docs/aiox·prd/·plan/을 물리 삭제하는 실행 게이트
status: decided
---

## Work Items

- [x] W1 삭제 대상 확정 — 두 source map을 소비해 stage 6 물리 삭제 대상을 확정한다. legacy source absorption map(`logs/2026-06-21-workspace-reset-legacy-source-absorption.md`)의 stage-6 target rows(`prd/`·`plan/`·`docs/aiox/`)와 history migration map(`logs/2026-06-19-workspace-reset-W5-history-migration.md`, `history/` 60개)을 대조한다. 비대상 분리: `plans/post-mvp*`(plan stage 9 소유), `prd/post-mvp/aiox-a2a-spec.md`(source map disposition = `keep / execution successor pending` — plan stage 6 본문은 삭제 예고하나 source map은 단일 A2A execution plan successor 전까지 보류; 이 충돌을 stage 6에서 판정). — 완료 2026-06-23: confirmed delete set와 hold set 분리. 보류: `prd/post-mvp/aiox-a2a-spec.md`, `plans/post-mvp*`. W2 선행 후 삭제 후보: `history/58`, `history/59`, `prd/mvp/aiox-mvp-spec.md`.
- [x] W2 provenance 평문화 — W1 확정 대상으로 들어오는 inbound 참조를 평문 provenance로 전환해, 물리 삭제 후에도 WHY·검증 출처가 self-contained하게 한다. 대상(stage 5 W2 flag + W1 inbound sweep): decision 다수가 `history/*` 인용(정식경로 31 + 줄임표기 16), decision 3개가 `docs/aiox/*`·`prd/post-mvp/archive/*` 인용, archive digest의 history/docs/aiox/prd/pre-validation/plan provenance, `history/58`을 가리키는 preserved `plans/post-mvp*` rationale refs, `history/59` Atlas 논의의 log/archive provenance 평문화. — 완료 2026-06-23: decision 14개 Sources/body provenance 평문화, weak provenance 2건 archive 참조 보강, `plans/post-mvp*` `history/58` direct refs repoint, archive digest dead-link Sources 평문화, architecture/spike/test provenance cleanup, `history/59` Atlas digest를 이 로그에 보존. 검증: current owner/decision/plan/spike/test 범위 삭제 예정 live refs 0(남은 match는 archive/log historical provenance 또는 AGENTS/guide 규칙).
- [x] W5 W2 산출물 재검토 게이트 (수용기준 2026-06-23 재확정) — **축1(본문 self-contained)을 게이트**로, 삭제 예정 원문(`history/`·`docs/aiox/`) 없이 owner/decision 본문만으로 load-bearing WHY가 복원되는지 **원문 대조**로 확인한다. 통과 시 출처 줄을 평문 라벨로 바꾸지 않고 **삭제**한다(provenance 평문화 폐기). 본문이 얇으면 WHY를 본문에 흡수한 뒤 삭제한다(포인터로 때우지 않음, git 복원 포인터 금지). 보존내용은 3분류로 라우팅: (가) 현재권위/WHY→owner 본문 / (나) 다음단계 입력→plan stage가 required-read로 가리킴 / (다) 순수역사→버림. 축2(current owner 범위 dead link 0)는 W2에서 확인 완료. source map 로그(history-migration·legacy)는 작업경위라 historical link를 유지하되, self-suff 검증 컬럼이 주장하는 owner 흡수가 실제 owner 본문에 있는지·미보존 WHY flag(`history/57` 등)가 승격됐는지 원문 대조로 게이트한다. 통과 후에만 W3. **[2026-06-23 진행: 게이트 판정 완료 — decision 14개 전부 통과, `history/57` flag 해소, proxy 신호매핑 archive 보존 결정(@user). 남은 행동 = patch 실행(A proxy archive digest → B 출처줄 삭제·repoint → C 보강 → rg 재검증). 상세 scope는 동일자 'W5 게이트 판정 완료' 블록.]**
- [x] W3 물리 삭제 실행 — W1/W2 완료 + W5 재검토 통과 + @user 확인 후 confirmed delete set을 물리 삭제했다. — 완료 2026-06-24: @user 확인(옵션 1, "말 그대로 delete")으로 88개 파일 `rm` 삭제(history/ 1~58+README, docs/aiox/ 19, plan/ 2, prd/mvp/aiox-mvp-spec.md, prd/post-mvp/archive/ 5, prd/pre-validation/ 2). 보류: `history/59`(W4 stage 7 repoint와 함께 삭제), `prd/post-mvp/aiox-a2a-spec.md`·`plans/post-mvp*`(stage 9). 검증: 보류 대상 전부 잔존·삭제 대상 폴더 전부 부재·git deleted 88·owner 범위 dead-ref 0.
- [x] W4 closeout & handoff — 삭제 결과를 legacy source map·history map의 최종 disposition에 반영하고, plan stage 6를 `[x]`로 닫는다. **(나) 다음단계 입력(`history/59` Atlas digest 등)을 plan stage 7(Atlas)가 required-read로 가리키도록 포인터를 이전한다**(로그 유실 방지). **그 repoint 직후 `history/59`를 물리 삭제한다**(W3에서 보류한 잔여 1건). 후속 stage 7(Atlas 설계·구현)로 handoff. — 완료 2026-06-24: stage 7 required-read repoint → `history/59` 삭제(89번째) → 두 source map disposition 반영 → Closeout 섹션 작성 → plan stage 6 `[x]`. stage 7은 전용 로그 미생성으로 `[ ]` 유지(시작 시 활성화).

### Scope

- Primary owner:
  - workspace reset plan stage 6(물리 삭제 게이트) 실행 결과(이 로그)와 `plans/workspace-reset/workspace-reset.md` stage 6 상태 전이.
- Allowed cross-owner updates:
  - `plans/workspace-reset/workspace-reset.md` — stage 6 상태 전이·closeout.
  - provenance 평문화 대상 owner 문서(`docs/decisions/*`, archive digest, 필요 시 `docs/architecture/`·`docs/specs/` inbound) — `history/*`·`docs/aiox/*`·`prd/*` 참조를 평문 provenance로 전환. 본문 수정은 보고·@user 승인 후.
  - legacy source map·history migration map의 최종 disposition 반영.
- Cross-Owner Effects only (이 단계가 직접 수정하지 않음):
  - `plans/post-mvp*` 삭제·roadmap repoint → plan stage 9 소유.
- Evidence inputs:
  - `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`(stage-6 target rows, disposition).
  - `logs/2026-06-19-workspace-reset-W5-history-migration.md`(`history/` owner map).
  - `logs/2026-06-22-workspace-reset-stage5-link-권위-세션재개.md`(W2 inbound flag, stage 6 진입 전제 판정).
  - `logs/2026-06-23-workspace-reset-pre-validation-spike-archive.md`·`logs/2026-06-23-workspace-reset-aiox-smoke-test-archive.md`(archive digest successor).
  - `plans/workspace-reset/workspace-reset.md` stage 6 본문.

### Evidence Ledger

| Topic | Source | Lines | Finding | Owner impact | Action |
| ----- | ------ | ----- | ------- | ------------ | ------ |
| W1 history map | `logs/2026-06-19-workspace-reset-W5-history-migration.md`; `logs/2026-06-22-workspace-reset-W10-split-readiness-map.md`; `logs/2026-06-21-workspace-reset-W9-release-roadmap-authority.md` | W5 583-593, 600-669, 1071-1082, 1091-1130; W10 45-46, 592-603; W9 351-363 | [Fact] B4 map은 `history/1`~`history/59` + `history/README.md` 총 60개를 분류한다. W5 post-W8 sync는 `history/58`·`history/59`를 W10/physical gate 확인 대상으로 보존했다. W10은 `history/*` row를 수정하지 않았지만 `history/58`·`history/59`를 split/decision input으로 소비했다. W9는 Atlas/WS4 방향·근거가 `history/59`에 완전 보존돼 있음을 확인했다. [Inference] stage 6에서는 `history/59` 내용을 log/archive provenance로 평문화한 뒤 원본 삭제 후보로 돌리는 것이 맞다. `history/58`은 남은 live refs를 W2에서 평문화하면 삭제 후보로 승격 가능하다. | W2는 decision/archive `history/*` Sources뿐 아니라 `plans/post-mvp*`의 `history/58` rationale refs와 `history/59` Atlas provenance를 평문화해야 한다. | W2에서 `history/58` inbound refs와 `history/59` digest/provenance를 처리한다. W3 삭제 전 history 전체 deletion set을 재산정한다. |
| W1 legacy source map | `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`; `docs/architecture/local-agent-runtime.md`; `docs/specs/aiox-a2a.md`; `docs/product/product.md` | source map 25-55, 198-214, 340-363; architecture 9-14, 1155-1173; spec 3-12, 856-862; product 1-23 | [Fact] `plan/` 2개, `docs/aiox/` 19개, `prd/post-mvp/archive/` 5개, `prd/pre-validation/` 2개는 `absorb→delete`/`archive→delete`/`delete-only`로 stage 6 handoff 준비 완료. [Fact] legacy MVP PRD는 product/spec/architecture로 흡수됐고 current authority가 아니라고 owner 문서가 명시한다. [Fact] `prd/post-mvp/aiox-a2a-spec.md`는 protocol/architecture/roadmap 권위 흡수는 되었지만 source map은 §11 execution detail 때문에 `keep / execution successor pending`을 유지한다. | W2는 `prd/mvp/aiox-mvp-spec.md` inbound/provenance를 삭제 전 평문화하면 된다. `prd/post-mvp/aiox-a2a-spec.md`는 authority gap이 아니라 execution successor gap으로 stage 6 보류. | W3 confirmed delete set에 `prd/mvp/aiox-mvp-spec.md`를 W2 후 포함한다. `prd/post-mvp/aiox-a2a-spec.md`는 stage 9/single-plan successor 후 재판정. |
| W1 plan boundary | `plans/workspace-reset/workspace-reset.md` | 30-39 | [Fact] stage 6 본문은 history/docs/aiox/prd/plan 삭제 게이트를 소유하지만, `plans/post-mvp*`는 stage 9 소유라고 명시한다. [Fact] `prd/post-mvp/aiox-a2a-spec.md`는 stage 6 본문에서 삭제 예고되나 source map은 successor pending이다. [Inference] 구체 disposition source map이 plan 요약보다 우선하므로 `prd/post-mvp/aiox-a2a-spec.md`는 stage 6 비대상이다. | plan stage 6 closeout 때 stage 6 본문과 실제 보류 판정을 정합화해야 한다. | W4 closeout에서 plan 문구를 필요 시 보정하거나, 보류 판정을 closeout에 명시한다. |
| W1 inbound sweep | `docs/decisions/*`, `logs/*archive.md`, `docs/architecture/local-agent-runtime.md`, `plans/post-mvp*` | W1 subagent sweep; spot refs recorded in 2026-06-23 block | [Fact] current owner/decision/archive에는 `history/*`, `docs/aiox/*`, `prd/*`, `plan/*` provenance/link가 남아 있다. 대표 W2 대상은 14개 decision 문서의 `history/*` Sources, decision 4개의 `docs/aiox`/`prd/post-mvp/archive` Sources, archive digest 3개의 original-source links, architecture generic legacy evidence notes다. | W2 owner 문서 본문 수정 전 사용자 승인 필요. | W2에서 파일별 평문화 patch scope를 보고한 뒤 수정한다. |

### Decision Candidates

| Source | Lines | Why decision-worthy | Proposed decision | Status |
| ------ | ----- | ------------------- | ----------------- | ------ |

### Cross-Owner Effects

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |

### Closeout

- Updated owner documents:
  - `plans/workspace-reset/workspace-reset.md` — stage 7에 `history/59` Atlas digest required-read 추가(W4-1), stage 6 `[>]→[x]` closeout. `plans/post-mvp*` 본문 `history/58` direct refs repoint(W2).
  - `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`(open) — stage 6 물리 삭제 최종 disposition 반영(W4-3). stage 9 미소비로 open 유지.
  - `logs/2026-06-19-workspace-reset-W5-history-migration.md`(decided) — history/1~57+README+58+59 삭제 최종 outcome ledger 반영(W4-3).
  - decision 14개 + `docs/architecture/local-agent-runtime.md` + archive digest(`mvp-history-archive`, `aiox-smoke-test-archive`) Sources/본문 — 삭제 예정 경로 출처 줄삭제·repoint(W2/W5). proxy 신호 매핑 successor `logs/2026-06-23-workspace-reset-codex-proxy-attribution-archive.md` 신규(W5). `pair-attach-atomicity-and-sentinel.md` correction(W5). (이번 closeout 범위 아님 — W2/W5 수행분, 추적용 기록.)
- Validation result: confirmed delete set 88(W3) + `history/59` 1(W4) = **89개 물리 삭제**. owner 범위(`docs/decisions`·`architecture`·`specs`·`product`) + 보존 `plans/post-mvp*`·`spikes`·`tests/unit` 삭제 경로 dead-ref **0**(`docs/decisions/AGENTS.md` 일반 규칙 1건 제외). `history/` 빈 디렉터리. git deleted = 88(W3 커밋 `0ac527b`) + `history/59` D(미커밋). stage 9 보류 대상 전부 잔존.
- Remaining gaps: **stage 9** — `prd/post-mvp/aiox-a2a-spec.md` + `plans/post-mvp.plan.md` + `plans/post-mvp/*`(4) 물리 삭제는 단일 A2A execution plan successor(Atlas 후 작성) 선행 필요로 미수행. legacy source map은 stage 9 소비 위해 `open` 유지.
- Workflow retrospective: (1) **삭제 전 required-read wire 순서** — (나) 다음단계 입력(`history/59` Atlas digest)을 next stage plan이 required-read로 가리키도록 먼저 wire한 뒤 원본을 삭제해 유실 0창 보장. 닫히는 task 로그에 digest가 묻혀 onramp에서 사라지는 문제를 plan stage pointer로 방어. (2) **source map = historical ledger** — 삭제 후 두 map의 inbound 링크/row disposition을 일괄 재작성하지 않고 dated 최종-outcome 기록 append로 처리(W5 결정). row별 churn 회피가 ledger 무결성에 부합. (3) 되돌릴 수 없는 삭제는 @user 확인 cadence(1·2 실행→보고→확인→3→확인→4)로 단계 게이트.
- Next owner/log: **stage 7 — Atlas 설계와 local 구현**(`plans/workspace-reset/workspace-reset.md` stage 7, 현재 `[ ]`). 시작 시 전용 단계 로그 생성 + `[>]` 승격. required-read(`history/59` Atlas digest = 이 로그 `:426-455`)는 stage 7에 wire 완료.

## 2026-06-23 · stage 6 게이트 진입 — 전이로 활성화, 삭제 대상 확정 대기

Parent pointer: `plans/workspace-reset/workspace-reset.md` stage 6(`history/ · docs/aiox · prd/ · plan/ 물리 삭제 게이트`)
소비 map: `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`(legacy) + `logs/2026-06-19-workspace-reset-W5-history-migration.md`(history)

stage 5 검증 게이트(`logs/2026-06-22-workspace-reset-stage5-link-권위-세션재개.md`)가
`decided`로 닫히고 plan stage 6가 `[>]`로 활성화되면서 이 로그가 stage 6를 소유한다.
plan stage 6 pointer는 이 로그로 repoint됐다(이전엔 decided inventory 로그를 가리키던 stale 상태,
stage 5 W4 ④ 이슈 — 이 전이로 해소).

**stage 6 진입 전제 (stage 5에서 충족, 확인한 사실):**

- dead link 0 / 중복 권위·역할 충돌 0 / 잔여 owner 명확화 / stale 0 (stage 5 W2~W4 PASS).
- legacy source map W3 archive digest 완결: pre-validation 2 + docs/aiox manual smoke/E2E 2 →
  digest 2파일(`logs/2026-06-23-...pre-validation-spike-archive.md`,
  `logs/2026-06-23-...aiox-smoke-test-archive.md`). industry-precedents self-sufficiency 확인.
- legacy source map stage-6 target rows disposition 확정(`absorb→delete` /
  `archive→delete` digest done / `delete-only`).

**@user 결정 (2026-06-23):** decision 14파일 `history/` provenance 평문화는 stage 6 전제가
아니라 **stage 6 작업(W2)**으로 이동한다(plan stage 6 본문 `workspace-reset.md:30`이 "삭제 전
평문 provenance 전환 후 삭제"를 명시 소유).

**이 게이트가 소유하는 것:**

1. W1 삭제 대상 확정 — 두 map 소비. legacy map stage-6 rows + history map.
2. W2 provenance 평문화 — inbound `history/*`·`docs/aiox/*`·`prd/*` 참조를 평문 전환(owner 본문 수정, @user 승인 후).
3. W3 물리 삭제 — `history/`·`docs/aiox`·`prd/`·`plan/`(되돌릴 수 없음, @user 확인 후 폴더 단위).
4. W4 closeout — map 최종 disposition 반영, plan stage 6 `[x]`, stage 7(Atlas) handoff.

**경계 / 미해소 flag (W1에서 판정):**

- `plans/post-mvp*`는 이 게이트 대상이 **아니다**(plan stage 9 소유).
- `prd/post-mvp/aiox-a2a-spec.md`는 plan stage 6 본문(line 34)은 "W8 소모 후 삭제"로 적지만,
  legacy source map row disposition은 `keep / execution successor pending`(§11 plan execution
  detail이 단일 A2A execution plan successor 필요)이다. [Inference] 이 두 기록이 충돌하므로
  W1에서 `prd/post-mvp/aiox-a2a-spec.md`의 실제 stage 6 삭제 가부를 source map 기준으로 판정한다
  (현 disposition대로면 stage 6 비대상, stage 9 successor 후 재판정).

**다음:** W1 — 두 source map을 소비해 실제 삭제 대상을 확정하고, 위 충돌(`prd/post-mvp/aiox-a2a-spec.md`)을 판정한다.

## 2026-06-23 · W1 삭제 대상 확정 — 병렬 조사 통합과 보류 분리

@user 결정으로 W1은 subagent 병렬 조사 후 controlling agent가 최종 판정하는 방식으로 수행했다.
subagent 범위는 read-only로 제한했다.

**사용한 조사 분할:**

- history map 담당: `logs/2026-06-19-workspace-reset-W5-history-migration.md`의 60개 history row와 post-W8 sync 확인.
- legacy source map 담당: `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`의 `prd/`·`plan/`·`docs/aiox/` rows 확인.
- inbound 담당: current owner/decision/archive/log digest의 `history/`·`docs/aiox/`·`prd/`·`plan/` 참조 sweep.

**확인한 사실:**

- `history/`는 disk와 W5 map 모두 numbered 59개 + `README.md` 총 60개다. W5 B4 map은
  G1/G2/G4/G5 58개를 delete/delete-after-repoint/archive/repoint 후보로 분류한다
  (`logs/2026-06-19-workspace-reset-W5-history-migration.md:583-593`,
  `:600-669`).
- W5 post-W8 sync는 `history/58`을 "W8 일부 소비 완료 + W10 잔여 확인 필요"로,
  `history/59`를 "W10 final owner/disposition 확인 전 삭제 후보 아님"으로 남겼다
  (`logs/2026-06-19-workspace-reset-W5-history-migration.md:1091-1130`). 이후 W10은
  `history/58`·`history/59`를 split/decision input으로 소비했지만 `history/*` row는 W5 owner라
  수정하지 않았다(`logs/2026-06-22-workspace-reset-W10-split-readiness-map.md:592-603`).
- W9는 Atlas/WS4 방향·근거·design input이 `history/59`에 완전 보존돼 있다고 확인했다
  (`logs/2026-06-21-workspace-reset-W9-release-roadmap-authority.md:351-363`). [Inference] stage 6에서는
  이 내용을 별도 log/archive provenance로 평문화한 뒤 원본을 삭제 후보로 돌리는 것이 적절하다.
- legacy source map은 `plan/` 2개, `docs/aiox/` 19개, `prd/post-mvp/archive/` 5개,
  `prd/pre-validation/` 2개를 stage 6 physical gate candidate로 둔다
  (`logs/2026-06-21-workspace-reset-legacy-source-absorption.md:27-54`, `:361-363`).
- `prd/post-mvp/aiox-a2a-spec.md`는 source map row가 `keep / execution successor pending`이며,
  전체 파일 삭제는 single execution plan successor 후 재판정이라고 적는다
  (`logs/2026-06-21-workspace-reset-legacy-source-absorption.md:26`).
- `prd/mvp/aiox-mvp-spec.md`는 source map row가 아직 `self-sufficiency 검증 = TBD`,
  `disposition = absorb→delete?`다(`logs/2026-06-21-workspace-reset-legacy-source-absorption.md:25`).
  그러나 owner 문서가 legacy MVP PRD를 product/spec/architecture로 흡수했고 current authority가
  아니라고 명시한다(`docs/architecture/local-agent-runtime.md:9-14`, `:1155-1173`;
  `docs/specs/aiox-a2a.md:856-862`; `docs/product/product.md:1-23`). [Inference] W2에서 남은
  provenance refs만 평문화하면 stage 6 삭제 후보로 포함 가능하다.
- `plans/post-mvp*`는 plan stage 9 소유이며 stage 6 대상이 아니다
  (`plans/workspace-reset/workspace-reset.md:36-39`).

**W1 판정:**

- Confirmed delete set:
  - `history/` 기본 58개: `history/58-post-mvp-a2a-architecture-decisions.history.md`와
    `history/59-local-obsidian-vault-atlas-discussion.history.md`를 제외한 나머지 numbered history
    57개 + `history/README.md`.
  - `docs/aiox/` 19개 전부.
  - `plan/mvp-implementation-checklist.md`, `plan/qa-tracker.md`.
  - `prd/mvp/aiox-mvp-spec.md` — owner 흡수는 확인됐고 W2 provenance 평문화 후 삭제 후보.
  - `prd/post-mvp/archive/` 5개 전부.
  - `prd/pre-validation/` 2개 전부.
- W2 선행 후 delete set에 편입할 후보:
  - `history/58-post-mvp-a2a-architecture-decisions.history.md` — W10 소비 완료 전제하에, 남은 `plans/post-mvp*`·decision inbound provenance를 평문화하면 삭제 후보.
  - `history/59-local-obsidian-vault-atlas-discussion.history.md` — Atlas 다음 단계 입력으로 log/archive provenance를 평문화하면 삭제 후보.
- Stage 6 hold / non-target:
  - `prd/post-mvp/aiox-a2a-spec.md` — `keep / execution successor pending`; stage 9 successor 후 재판정.
  - `plans/post-mvp.plan.md`와 `plans/post-mvp/*.plan.md` — plan stage 9 소유.

**W2 provenance 평문화 대상(확정 후보):**

- Decision docs with `history/*` provenance: `a2a-message-lifecycle-envelope-and-correlation.md`,
  `agent-level-mcp-process-scoping.md`, `claude-channel-plugin-default.md`,
  `claude-channel-trust-and-registration.md`, `client-orchestrator-runtime-pivot.md`,
  `codex-app-server-mcp-injection-and-isolation.md`, `codex-d7-authoritative-binding-scope.md`,
  `codex-per-agent-app-server.md`, `daemon-autostart-and-channel-identity.md`,
  `pair-attach-atomicity-and-sentinel.md`, `pair-slot-generalization.md`,
  `proxy-lazy-observation-cost-model.md`, `runtime-profile-namespace-isolation.md`,
  `uds-transport-and-framing-contract.md`.
- Decision/docs with `docs/aiox/*` or `prd/post-mvp/archive/*` provenance:
  `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`,
  `docs/decisions/codex-d7-authoritative-binding-scope.md`,
  `docs/decisions/codex-app-server-mcp-injection-and-isolation.md`,
  `docs/decisions/codex-per-agent-app-server.md`,
  plus generic legacy evidence notes in `docs/architecture/local-agent-runtime.md`.
- Archive/digest logs with original-source links/provenance:
  `logs/2026-06-19-mvp-history-archive.md`,
  `logs/2026-06-20-mvp-plan-carryover-archive.md`,
  `logs/2026-06-23-workspace-reset-pre-validation-spike-archive.md`,
  `logs/2026-06-23-workspace-reset-aiox-smoke-test-archive.md`.
- Preserved plans/log inputs that must not keep live links to deleted sources:
  `plans/post-mvp.plan.md`, `plans/post-mvp/envelope-metadata.plan.md`,
  `plans/post-mvp/codex-structured-metadata-spike.plan.md` (`history/58` rationale refs),
  and an Atlas/history59 digest or current log block for `history/59`.

**추론과 제안:**

- Source map row-level disposition이 plan summary보다 구체적이므로, 충돌 시 row-level disposition을 우선한다.
  단 `prd/mvp/aiox-mvp-spec.md`는 source map row가 stale하게 남았고 owner 문서 흡수 근거가 더 최신·구체적이다.
- W3는 "폴더 전체 삭제"가 아니라 W2 평문화 완료 후 delete set을 재산정해 실행한다. `history/58`·`history/59`
  는 보존 고정이 아니라 W2 처리 후 삭제 후보로 본다.
- `prd/post-mvp/aiox-a2a-spec.md`는 권위 흡수와 execution successor gap을 구분한다. 권위 흡수는 확인됐지만,
  source map과 W9/F51-F52가 §11 execution detail successor pending을 명시하므로 stage 6 삭제 대상에 넣지 않는다.

**Work Item 전이:**

- W1 `[>]` → `[x]` 완료.
- W2 `[ ]` → `[>]` 활성화. 다음 행동은 W2 patch scope를 사용자에게 보고하고 승인받은 뒤,
  위 provenance 후보를 평문 provenance로 전환하는 것이다.

## 2026-06-23 · W2 read-only inbound sweep — subagent 병렬 조사 통합

@user 승인으로 W2 provenance 평문화 scope를 read-only subagent 4개로 병렬 조사했다. 파일 수정은
하지 않았다. controlling agent가 `rg`로 핵심 패턴을 spot-check했고, `architecture.excalidraw`는
root 지침상 개인 자산이라 판정에서 제외했다.

**확인한 사실:**

- `docs/decisions/*.md`에는 삭제 예정 `history/*` provenance가 다수 남아 있다. 확인된 대상:
  `pair-slot-generalization.md`, `a2a-message-lifecycle-envelope-and-correlation.md`,
  `uds-transport-and-framing-contract.md`, `pair-attach-atomicity-and-sentinel.md`,
  `agent-level-mcp-process-scoping.md`, `proxy-lazy-observation-cost-model.md`,
  `client-orchestrator-runtime-pivot.md`, `codex-per-agent-app-server.md`,
  `runtime-profile-namespace-isolation.md`, `claude-channel-plugin-default.md`,
  `codex-app-server-mcp-injection-and-isolation.md`, `codex-d7-authoritative-binding-scope.md`,
  `daemon-autostart-and-channel-identity.md`, `claude-channel-trust-and-registration.md`.
- `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`는 `history/58`와
  `prd/post-mvp/archive/claude-codex-validation.md`를 Sources로 가리킨다.
- `docs/decisions/codex-d7-authoritative-binding-scope.md`,
  `docs/decisions/codex-app-server-mcp-injection-and-isolation.md`,
  `docs/decisions/codex-per-agent-app-server.md`는 `docs/aiox/*` learning record를 Sources로
  가리킨다.
- `docs/architecture/local-agent-runtime.md`에는 `prd/pre-validation/*`와 `docs/aiox/*.md`
  legacy evidence note가 남아 있다.
- `logs/2026-06-19-mvp-history-archive.md` Sources에는 `../../history/*.history.md` Markdown
  링크 9개가 남아 있어 history 삭제 후 dead link가 된다. 본문 digest 자체는 self-contained로
  보인다.
- `logs/2026-06-23-workspace-reset-aiox-smoke-test-archive.md`에는 `docs/aiox/*` original source와
  `history/33`·`history/34`·`history/40` provenance가 남아 있으며, `history` files가 authoritative
  step record로 남는다는 문구가 있어 history 삭제 전 평문화가 필요하다.
- `logs/2026-06-20-mvp-plan-carryover-archive.md`와
  `logs/2026-06-23-workspace-reset-pre-validation-spike-archive.md`는 digest 본문은
  self-contained로 보이나, legacy `plan/*`·`prd/pre-validation/*` original source literal은
  W2 평문화 후보로 남아 있다.
- 보존 대상 `plans/post-mvp*`에는 `history/58` live rationale refs가 남아 있다:
  `plans/post-mvp.plan.md`, `plans/post-mvp/envelope-metadata.plan.md`,
  `plans/post-mvp/codex-structured-metadata-spike.plan.md`. `adapter-dispatch-registry.plan.md`와
  `channel-boot-surface.plan.md`에서는 같은 범위의 직접 참조를 발견하지 못했다.
- `plan/mvp-implementation-checklist.md`, `plan/qa-tracker.md`, `prd/mvp/aiox-mvp-spec.md`로
  들어오는 current owner 직접 참조는 이번 좁힌 sweep에서 발견하지 못했다.
- W2 핵심 owner 범위 밖이지만 deletion 후 dead-ref 후보가 있다:
  `spikes/claude-channel-registration-poc/README.md`의 `history/35`·`docs/aiox/round-4-tui-smoke-check.md`,
  `spikes/codex-app-server-multi-session-poc/README.md`의 `history/`, 그리고
  `tests/unit/*`의 `history/50`~`history/52` 주석 provenance.

**추론과 제안:**

- W2 patch scope는 우선 owner/long-lived 문서 중심으로 잡는다: decision Sources/본문,
  architecture legacy evidence note, archive digest Sources/original-source 문구, 보존될
  `plans/post-mvp*`의 `history/58` rationale refs.
- `spikes/`와 `tests/unit` dead-ref는 owner 문서 본문은 아니지만 삭제 후 깨진 provenance가 되므로
  W2 본 patch에 포함하거나 별도 cleanup 항목으로 분리해야 한다.
- 다음 행동은 사용자에게 W2 patch scope를 보고하고 승인받은 뒤 수정하는 것이다. 승인 전에는
  owner 문서 본문을 수정하지 않는다.

## 2026-06-23 · W2 patch 중단 — self-sufficiency 우선 절차로 보정

**확인한 사실:**

- W5 history migration은 delete candidate 기준을 "owner/archive가 `history/*` 원문 없이도
  필요한 현재 사실, WHY, 검증/provenance를 복원할 수 있어야 한다"로 보강했다
  (`logs/2026-06-19-workspace-reset-W5-history-migration.md`, "Delete candidate 기준 보강").
- W5는 decision docs의 **본문 self-sufficiency**와 `Sources`의 **dead-link hygiene**를
  분리해서 보라고 기록했다. 본문이 충분하더라도 `Sources`가 `../../history/N` 링크인
  상태면 physical deletion gate에서 평문 provenance 또는 surviving owner/archive로 전환해야 한다.
- W5에서 명시적으로 직접 self-sufficiency 검증한 decision은 최소 3개다:
  `docs/decisions/claude-channel-plugin-default.md`,
  `docs/decisions/client-orchestrator-runtime-pivot.md`,
  `docs/decisions/codex-per-agent-app-server.md`.
  이 3개는 "history 원문 없이도 현재 필요한 WHY를 복원할 수 있다"고 기록됐다.
- legacy `prd/`·`plan/`·`docs/aiox/` source map 쪽은 W2/W3/W4에서 disposition과
  self-sufficiency 검증이 대체로 완료됐다. digest가 필요한 항목은
  `logs/2026-06-23-workspace-reset-pre-validation-spike-archive.md`,
  `logs/2026-06-23-workspace-reset-aiox-smoke-test-archive.md`로 생성됐다.
- `history/58`은 별도 미완 조건이 있다. W5 post-W8 sync는 `history/58` 삭제 전
  `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md` self-sufficiency,
  W10 잔여 rationale 처리, inbound repoint, decision/archive Sources 평문화가 모두
  필요하다고 적는다.
- 2026-06-23 현재 세션에서 decision 14개에 대해 일부 patch를 시작했다. 변경 내용은
  주로 `Sources`의 삭제 예정 경로(`history/*`, `docs/aiox/*`,
  `prd/post-mvp/archive/*`)를 "Legacy Step ... record" 같은 평문 provenance로
  바꾼 것이다. 이 patch는 **W2 완료가 아니라 중간 상태**다.
- 사용자 피드백: `Legacy ... record`로만 바꾸는 것은 충분하지 않을 수 있다. 각 decision이
  실제로 self-contained한지 먼저 확인하고, 부족하면 해당 `history/*` 원문에서 필요한
  WHY/검증 요지만 본문에 흡수해야 한다. 경우에 따라 `Sources`는 삭제 예정 원본 대신
  살아남는 archive log(`logs/2026-06-19-mvp-history-archive.md`,
  `logs/2026-06-23-workspace-reset-aiox-smoke-test-archive.md` 등)를 참조하게 할 수 있다.

**판정:**

- 다음 세션은 지금 partial patch를 그대로 "완료"로 간주하지 않는다.
- W2의 실제 완료 조건은 파일별로 다음 셋 중 하나를 명시 판정하는 것이다:
  1. decision/owner 본문이 이미 self-contained하므로 `Sources` dead-link만 평문화한다.
  2. 본문은 핵심 WHY만 담고, 상세 검증 trace는 살아남는 archive log를 `Sources`로 참조한다.
  3. 본문이 얇으므로 삭제 예정 `history/*` 또는 legacy source에서 load-bearing WHY/검증
     요지를 추가 흡수한 뒤 원본 경로를 제거한다.

**다음 세션 절차:**

1. 먼저 `git diff -- docs/decisions`를 확인해 현재 partial patch 범위를 파악한다.
2. `docs/decisions/*` 14개에 대해 self-sufficiency 판정표를 만든다. 표는
   `file | legacy source(s) | 기존 검증 근거 | 판정(검증완료/archive 참조/본문 보강 필요) |
   수정 action` 형식이면 충분하다.
3. 이미 self-sufficiency가 확인된 decision/source는 **다시 검증하지 않는다**. 기존 로그
   근거를 판정표에 인용하고, 남은 작업은 `Sources` dead-link hygiene 또는 surviving
   archive/owner 참조 구체화로 제한한다.
4. 검증이 명시되지 않은 decision만 관련 `history/*` 원문을 읽고, 원문 없이도 WHY가
   복원되는지 확인한다. 부족하면 owner 경계 안의 rationale만 본문에 보강한다.
5. `history/58` 관련 문서(`a2a-message-lifecycle-envelope-and-correlation.md`,
   `plans/post-mvp*`)는 별도 항목으로 다룬다. W8/W10 successor와 surviving archive/log
   참조 가능성을 먼저 확인한 뒤 삭제 후보 편입 여부를 판정한다.
6. 그 다음에만 architecture §14, archive digest logs, preserved `plans/post-mvp*`,
   spike/test provenance cleanup을 이어간다.
7. 마지막 검증은 `rg -n "history/|docs/aiox|prd/post-mvp/archive|prd/pre-validation|plan/mvp-implementation|plan/qa-tracker|prd/mvp/aiox-mvp-spec" docs/decisions docs/architecture logs/2026-06-19-mvp-history-archive.md logs/2026-06-20-mvp-plan-carryover-archive.md logs/2026-06-23-workspace-reset-pre-validation-spike-archive.md logs/2026-06-23-workspace-reset-aiox-smoke-test-archive.md plans/post-mvp.plan.md plans/post-mvp spikes tests/unit`
   로 수행하고, 남은 match를 "surviving current reference / historical log-only / still-dead"
   로 분류한다.

**주의:**

- `Sources`에 삭제 예정 원본 파일명이 없어도 된다. 단, owner 문서가 원본 없이 독립적으로
  읽히거나, 살아남는 archive/owner 문서를 통해 필요한 검증 trace를 찾을 수 있어야 한다.
- 현재 partial patch에 들어간 `Legacy ... record` 문구는 self-sufficiency 판정 후 유지,
  구체화, archive-log 참조, 또는 본문 보강으로 조정할 수 있다.

## 2026-06-23 · W2 작업 방식 확정 — 기존 source map 소비 + read-only subagent 조사

사용자 확인으로 W2의 다음 진행 방식은 subagent 병렬 조사를 사용하되, subagent는
read-only 조사와 판정 초안까지만 맡기고 controlling agent가 최종 판정·파일 수정·로그 기록을
소유하는 방식으로 확정했다.

**확인한 사실:**

- `docs/decisions/*` 관련 source map은 새로 만들 대상이 아니라, 기존 두 map을 소비해야 한다.
  - history 출처는 `logs/2026-06-19-workspace-reset-W5-history-migration.md`의
    B4 Execution Map(`history/*` → decision/archive target)이 기준이다.
  - `docs/aiox/*`·`prd/post-mvp/archive/*` 출처는
    `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`의 legacy source absorption map이
    기준이다.
- W5 기록은 decision docs의 **본문 self-sufficiency**와 `Sources`의 **dead-link hygiene**를
  분리해서 보라고 명시한다. 따라서 W2는 단순히 `Sources` 경로를 평문으로 바꾸는 작업이 아니라,
  기존 map의 target/self-sufficiency 근거를 소비해 파일별로 남은 조치만 판정해야 한다.
- 이미 W5에서 직접 self-sufficiency가 확인된 decision 3개
  (`claude-channel-plugin-default.md`, `client-orchestrator-runtime-pivot.md`,
  `codex-per-agent-app-server.md`)는 재검증하지 않고, 기존 근거를 판정표에 인용한 뒤
  dead-link hygiene만 처리한다.

**subagent 분할(다음 실행 시 read-only):**

- A: W5 B4 Execution Map에서 `history/*` → `docs/decisions/*` 매핑과 self-sufficiency/dead-link
  관련 근거를 추출한다.
- B: 현재 `docs/decisions/*` 14개와 `git diff -- docs/decisions`를 읽고, 각 decision 본문이
  원문 없이 WHY를 복원할 수 있는지 초안 판정한다.
- C: legacy source absorption map에서 `docs/aiox/*`, `prd/post-mvp/archive/*`가 decision으로
  흡수된 row와 W5/W6 checker PASS 근거를 추출한다.
- D: `history/58` 관련 `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`와
  preserved `plans/post-mvp*` rationale refs를 별도 검토한다.

**controlling agent 책임:**

- subagent 의견을 그대로 수용하지 않고, 기존 source map·현재 파일·로그 근거로 재검증한다.
- 결과는 새 source map이 아니라 W2 실행용 판정표로 정리한다:
  `decision file | mapped legacy source(s) | 기존 self-suff 근거 | 판정 | 수정 action`.
- 판정 뒤에만 partial patch를 유지·구체화·archive 참조로 변경·본문 보강 중 하나로 조정한다.
- 실제 owner 문서 수정과 W2 ledger/closeout 기록은 controlling agent가 직접 수행한다.

**다음:** 위 방식으로 W2 decision provenance 판정표를 작성한 뒤, 수정 action을 확정한다.

## 2026-06-23 · W2 실행 — decision/source-map 소비, provenance 평문화, history59 digest

사용자 지시에 따라 subagent 4개를 read-only로 병렬 실행했다. subagent 결과는 controlling agent가
기존 source map, 현재 파일, `git diff`와 대조해 최종 판정했다.

**subagent 결과 소비:**

- A(W5 B4 map): `logs/2026-06-19-workspace-reset-W5-history-migration.md` B4 Execution Map에서
  `history/*` → `docs/decisions/*` target을 추출했다. 핵심 guard는 B4 status가 물리 삭제
  확정이 아니며, target self-sufficiency와 dead-link hygiene을 함께 확인해야 한다는 점이다.
- B(decision body/diff): 현재 partial patch 이후 decision 14개 본문은 모두 load-bearing WHY를
  원문 없이 복원 가능하다고 판정했다. 본문 보강 필요는 0. 다만
  `claude-channel-plugin-default.md`, `codex-per-agent-app-server.md`는 검증 provenance를
  살아남는 archive log로 보강하는 것이 적절하다고 판정했다.
- C(legacy source map): `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`에서
  `docs/aiox/*`·`prd/post-mvp/archive/*` decision 흡수 row와 W10/W5/W6 checker PASS 근거를
  추출했다. 대부분 `absorb→delete candidate`; `industry-precedents` 잔여 self-sufficiency는
  W3에서 spec §4 + lifecycle decision으로 해소된 것으로 확인했다.
- D(`history/58`): `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`는
  direct path가 이미 평문화됐고, `history/58:61-100` §4 lifecycle WHY가 decision/spec으로
  승격 완료됐다. 보존될 `plans/post-mvp*` 3곳의 direct `history/58` refs만 repoint하면
  stage 6 삭제 후보로 볼 수 있다고 판정했다.

**decision 판정표(요약):**

| Decision file | Mapped legacy source(s) | 기존 self-suff 근거 | 판정 | 수정 action |
| --- | --- | --- | --- | --- |
| `a2a-message-lifecycle-envelope-and-correlation.md` | `history/58`; `prd/post-mvp/archive/claude-codex-validation.md`; `docs/aiox/industry-precedents...` | W8 decision review PASS; legacy source map W10/W5/W6 PASS; `industry-precedents` W3 self-suff 확인 | self-contained | Sources 평문화 유지 |
| `agent-level-mcp-process-scoping.md` | `history/38` | W5 B4 target; 본문 WHY 충분 | self-contained | Sources 평문화 |
| `claude-channel-plugin-default.md` | `history/49`~`56` | W5 직접 self-suff 검증 3개 중 하나; 본문 WHY 충분 | self-contained + provenance 보강 | `logs/2026-06-20-mvp-plan-carryover-archive.md` §2 참조 추가 |
| `claude-channel-trust-and-registration.md` | `history/35`; `docs/aiox/claude-channel-registration...` | W5 B4 target + legacy source map checker PASS | self-contained | Sources 평문화 |
| `client-orchestrator-runtime-pivot.md` | `history/13` | W5 직접 self-suff 검증 3개 중 하나 | self-contained | Sources/body 평문화 |
| `codex-app-server-mcp-injection-and-isolation.md` | `history/40`; `docs/aiox/step-14-codex-mcp...` | W10 promoted decision checker PASS | self-contained | Sources 평문화 |
| `codex-d7-authoritative-binding-scope.md` | `history/34`; `docs/aiox/observation-asymmetry...` | W10 promoted decision checker PASS; archive digest §2.2 exists | self-contained | Sources 평문화 |
| `codex-per-agent-app-server.md` | `history/5`, `29`, `31`, `33`, `34`; `docs/aiox/proxy-vs-app-server...` | W5 직접 self-suff 검증 3개 중 하나; legacy map checker PASS | self-contained + provenance 보강 | pre-validation, MVP history, smoke archive refs 추가 |
| `daemon-autostart-and-channel-identity.md` | `history/40` mixed target | W5 mixed target map | self-contained | Sources 평문화 |
| `pair-attach-atomicity-and-sentinel.md` | `history/22`, `23` mixed target | W5 B4 + mixed target map | self-contained | Sources 평문화 |
| `pair-slot-generalization.md` | `history/45`~`48`; docs/aiox thread/kind mismatch rows | W5 B4 target + legacy map checker PASS | self-contained | Sources 평문화 |
| `proxy-lazy-observation-cost-model.md` | `history/28`; docs/aiox proxy rows | W5 B4 target + legacy map checker PASS | self-contained | Sources 평문화 |
| `runtime-profile-namespace-isolation.md` | `history/56`, `57`; carryover QA archive | W5 B4 + direct self-suff source check in W5 | self-contained | Sources 평문화 |
| `uds-transport-and-framing-contract.md` | `history/24`~`26` | W5 B4 target; 본문 WHY 충분 | self-contained | Sources/body 평문화 |

**수정한 범위:**

- `docs/decisions/*` 14개: 삭제 예정 `history/*`, `docs/aiox/*`,
  `prd/post-mvp/archive/*` direct Sources/body refs를 평문 legacy provenance 또는 surviving
  archive/owner ref로 전환했다.
- `docs/architecture/local-agent-runtime.md`: legacy pre-validation/history/docs-aiox note를
  current authority처럼 보이지 않게 archive/decision provenance 문구로 정리했다.
- `logs/2026-06-19-mvp-history-archive.md`: `../../history/*.history.md` Markdown Sources를
  살아남는 archive의 평문 legacy step provenance 목록으로 전환했다.
- `logs/2026-06-23-workspace-reset-aiox-smoke-test-archive.md`: `history/33/34/40` direct
  provenance와 "history files remain authoritative" 문구를 surviving decision/archive owner
  provenance로 전환했다.
- `plans/post-mvp.plan.md`, `plans/post-mvp/envelope-metadata.plan.md`,
  `plans/post-mvp/codex-structured-metadata-spike.plan.md`: preserved plan의 `history/58`
  direct rationale refs를 lifecycle decision + W8 provenance log로 repoint했다.
- `spikes/*`와 `tests/unit/*`: 삭제 예정 `history/*`·`docs/aiox/*` 주석 provenance를
  surviving decision/archive provenance 또는 plain measured contract wording으로 바꿨다.

**history/59 Atlas digest (원문 소비):**

`history/59-local-obsidian-vault-atlas-discussion.history.md`는 2026-06-07 local Obsidian
vault + Atlas 논의 기록이다. 확인한 핵심 facts:

- 사용자 문제는 일반 노트 관리가 아니라, SQLite/CLI/command/MCP/socket 등 낯선 개념과
  구현 속도를 따라가기 위한 구조 지도 필요성, 오류 시 데이터 흐름·의존·변경 영향 범위 파악,
  agent가 관련 계약·소비자·테스트를 놓치지 않게 하는 변경 전 탐색 비용 감소다.
- 검증 사례는 Claude MCP server 이름 mismatch 회귀다. 실제 이력은
  `c525a1f5c2bbf6b015675b98bdb04a9ec1c752bb`에서 dynamic
  `aiox-claude-${command.name}`와 `.mcp.json`의 기존 key가 불일치했고,
  `de0c6b612024c11d16d15d677816200b916c3b24`에서 static `aiox-claude-ingress` key와
  env identity 전달로 수정됐다. Atlas 가치는 문자열 검색이 아니라 producer/consumer/config/test를
  같은 contract node에서 찾게 하는 것이다. 실제 재발 방지는 공용 상수와 계약 테스트가 담당한다.
- 합의된 방향 8개: repo 자체를 Obsidian vault로 연다; `.obsidian/`과 `atlas/`는 local-only;
  Atlas는 memory/todo가 아니라 구현 지도; 모듈·계약·data flow·변경 영향·코드 위치·테스트·
  decision/spec link를 연결한다; Graph View는 전체 탐색, Canvas는 핵심 흐름/관계 유형,
  Atlas note는 상세 설명; Atlas는 discovery 도구이고 enforcement는 상수/API/계약 테스트가 담당;
  `code-review-graph`는 유력 후보지만 별도 read-only spike 전 채택하지 않는다; Vault/Atlas 생성과
  운영 자동화는 hook/skill 설계·구현 단계에서 진행한다.
- 후속 설계 입력: note granularity, 관계 유형 표기, Graph filter/color, Canvas 핵심 flow,
  source 변경과 Atlas 갱신을 연결하는 hook/skill 책임, `code-review-graph` spike와 수동 Atlas 결합.
  예상 skeleton은 local-only `.obsidian/`, `atlas/modules`, `atlas/contracts`, `atlas/flows`,
  `atlas/maps`.
- 원문은 Vault/Atlas 파일, `.gitignore`, hook, skill, agent settings를 생성·변경하지 않았고
  `code-review-graph`도 설치/실행하지 않았다.

[Inference] 이 digest와 W9/W10 로그의 Atlas handoff가 있으면 `history/59` 원문 없이도 stage 7
Atlas 설계 착수에 필요한 WHY·검증 사례·합의 방향·설계 입력을 복원할 수 있다. 따라서
`history/59`는 W3 deletion set에 편입 가능하다.

**검증:**

- `rg -n "history/|docs/aiox|prd/post-mvp/archive|prd/pre-validation|plan/mvp-implementation|plan/qa-tracker|prd/mvp/aiox-mvp-spec" docs/decisions docs/architecture/local-agent-runtime.md plans/post-mvp.plan.md plans/post-mvp spikes tests/unit`
  결과: `plans/post-mvp.plan.md`의 과거 status 문장 1건(`history/README`)과
  `docs/decisions/AGENTS.md`의 decision 작성 규칙 1건만 남음. 둘 다 삭제 예정 live ref가 아니다.
- archive/log 범위의 남은 `docs/aiox/*`, `prd/pre-validation/*`, `plan/*`, `history/*` match는
  archive가 자신이 승계한 original source를 평문 provenance로 설명하거나, decided/task log의
  historical record다. Markdown link dead-ref는 제거했다.
- `rg -n "\\]\\(\\.\\./\\.\\./history/|\\]\\(.*history/|history/58-post-mvp|history/35-step|docs/aiox/round-4|docs/aiox/step-14|prd/post-mvp/archive|prd/mvp/aiox-mvp-spec" docs/decisions docs/architecture/local-agent-runtime.md plans/post-mvp.plan.md plans/post-mvp spikes tests/unit logs/2026-06-19-mvp-history-archive.md logs/2026-06-23-workspace-reset-aiox-smoke-test-archive.md`
  결과: aiox smoke archive의 original-source 평문 4건만 남음. 이 archive가 해당 original source의
  successor라서 의도된 provenance다.
- `git diff --check` 통과.

**Work Item 전이:**

- W2 `[>]` → `[x]` 완료.
- W3 `[ ]` → `[>]` 활성화. 실제 물리 삭제는 되돌릴 수 없으므로 @user 확인 전 수행하지 않는다.

## 2026-06-23 · stage 6 재개 기준 정리 — W2 수용 기준 명확화, W3 전 재검토 게이트(W5) 신설

@user 질문: stage 6 작업을 다시 해야 하는가, 그리고 다음 세션에서 진행하고 싶다.

**판정:** 처음부터 재작업이 아니다. W1(삭제 대상 확정) 유효. W2(provenance 평문화)도 작업
자체는 일관적이나, 이번 세션에서 삭제 **수용 기준**이 명확해졌으므로 W3(물리 삭제,
되돌릴 수 없음) 전에 그 기준으로 W2 산출물을 재검토·보강해야 한다. 이를 위해 재검토
게이트(W5)를 신설하고 W3 앞에 둔다.

**명확해진 삭제 수용 기준 (2축, 우선순위 있음):**

- 축 1 (게이트, 먼저): 원문(`history/`·`docs/aiox/`) 없이도 owner/decision **본문만으로
  WHY가 복원되나(self-contained)**. 실패 시 삭제 불가 — 원문에서 load-bearing WHY를
  본문에 흡수한 뒤에만 삭제 후보. 보강은 본문으로 하고 포인터로 때우지 않는다.
- 축 2 (위생, 그다음): 삭제 후 dead link(존재하지 않는 경로를 가리키는 live 링크) 0.
  처리 = (a) 살아남는 archive log/owner로 repoint, 또는 (b) 줄 삭제 / non-actionable 평문 메모.

**평문 "Legacy ... record" 라벨 처리 원칙:**

- 평문 라벨은 기계적으로는 dead link가 아니라 `rg` 검증을 통과하지만, "가리킬 곳 없는
  dangling 출처"가 될 수 있다. 그 안전성은 결국 축 1(본문 self-contained)로 환원된다.
- 깔끔한 종착 상태는 둘뿐: (a) 본문 self-contained → dead 줄 삭제 또는 non-actionable 메모,
  (b) 보존 가치 있는 디테일 → 이미 살아남는 archive log에 있어야 하고 거기로 repoint.

**결정 변경 (이전 제안 철회):** 직전에 제안했던 "정확한 `history/53` id를 남겨 `git show`로
복원 가능하게"는 철회한다. 이유: 이 작업의 목적은 `history/`·`docs/aiox/`를 **참조 대상에서
제거**하는 것인데, 정확한 id 복원 포인터를 남기면 삭제된 파일을 다시 문서화된 참조 대상으로
되살려 "새 세션이 legacy를 쫓는" 문제를 재생산한다. 성공 조건은 "원본을 복원할 수 있다"가
아니라 **"원본이 다시 필요할 일이 없다"**. git history는 재앙 복구 안전망일 뿐 문서 참조
경로가 아니다.

**현재 검증 상태 (확인한 사실, 이 세션에서 재확인):**

- 축 2(dead link): `rg`로 current owner/decision/architecture/plan/spike/test에 삭제 예정
  live ref 0건 재확인.
- 삭제 대상 폴더 `history/`·`docs/aiox/`·`prd/`·`plan/`는 아직 디스크에 존재(W3 미실행,
  되돌릴 수 있는 상태).

**W5에서 할 일 (다음 세션):**

- W2 산출물을 위 기준으로 감사한다. 특히 **살아남는 포인터 없이 본문에만 의존하는
  `absorb→delete` 파일**(예: `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`의
  "Archived Claude/Codex cross-validation record" 평문 라벨 등)의 축 1 self-sufficiency를
  원문 대조로 재확인한다.
- 부족하면 본문 보강(rubber-stamp 아님, 실제 작업 가능). dangling 라벨은 (a)/(b)로 정리.
  git 복원 포인터는 만들지 않는다.
- 전체 14개를 처음부터 다시 보지 않고, 본문이 가장 얇은 `absorb→delete` 후보부터 우선한다.
  이미 W5/W6 checker PASS로 self-suff가 확인된 항목은 기존 근거를 인용하고 재검증하지 않는다.
- 통과한 뒤에만 W3 물리 삭제(@user 확인, 폴더/파일군 단위).

@user 진행: 실제 W5 작업은 다음 세션에서 수행한다.

## 2026-06-23 · W5 수용기준 재확정 — 평문화 폐기·줄삭제, 유실 3분류, source map 로그 점검

@user 논의로 W2/W5 처리 방식을 확정한다. 직전 "provenance 평문화" 방향을 일부 철회한다.

**결정 (확정):**

1. **provenance 평문화 폐기.** W2가 만든 평문 `Legacy ... record` 줄은 더 만들지 않고,
   이미 만든 것도 삭제 대상이다. 이유: 어차피 삭제할 출처 줄을 "링크 → 평문 설명"으로
   바꾼 중간단계는 불필요하다. (직전 세션도 W2를 중간상태로 인정했으므로 손실 아님.)
2. **줄 삭제가 기본.** 단 절대 전제는 축1(본문 self-contained). 삭제 예정 원문
   (`history/`·`docs/aiox/`) 없이 owner/decision 본문만으로 load-bearing WHY가 복원되는지
   원문 대조로 확인한 뒤에만 출처 줄을 삭제한다. 본문이 얇으면 WHY를 본문에 흡수한 뒤
   삭제한다. 포인터로 때우지 않는다.
3. **보존가치 내용 유실 방지 3분류.** 근거: 로그는 작업경위 owner지 현재권위 owner가
   아니라 닫히면 onramp에서 빠진다. 찾아야 할 내용을 로그에만 두면 새 세션이 잃는다.
   - (가) 현재 권위 / WHY → owner 문서 본문에 흡수(self-contained). 로그/archive 아님.
   - (나) 다음 단계가 쓸 입력 → 그 단계의 plan stage가 required-read로 직접 가리킨다
     (`logs/AGENTS.md` consumer read binding). 로그 깊숙이 두지 않는다.
   - (다) 아무도 안 쓸 순수 역사 → 보존하지 않는다.

**구체 유실 위험과 처리:**

- `history/59` Atlas digest는 현재 이 로그(`:426-455`)에만 통째로 있다 = (나). W4 closeout에서
  plan stage 7(Atlas)가 required-read로 가리키도록 포인터를 이전한다. (안 하면 stage 6가 닫힌
  뒤 stage 7 진입 시 유실된다.)

**source map 로그 점검 (@user 지적 "history-migration에도 있을거임" 반영, grep 확인):**

- [Fact] `logs/2026-06-19-...W5-history-migration.md` B4 map과
  `logs/2026-06-21-...legacy-source-absorption.md`에는 삭제 예정 경로(`history/`·`docs/aiox/`·
  `prd/post-mvp/archive/`·`plan/`·`plans/post-mvp/`) inbound가 markdown/`file://` 링크로 다수
  남아 있다(예: history-migration `:202` history/40 row, `:220` history/58 row, `:221` history/59 row).
- [판정] 두 로그는 source map = 작업경위 + 검증 ledger다. 그 inbound 링크는 "삭제 시점
  스냅샷"이라 삭제 후 dead가 되어도 historical record이고, current owner 범위의 dead-link
  위생(축2) 대상이 **아니다**. 두 로그는 stage 6/9 게이트가 disposition을 소비할 때까지
  open 유지(기존 결정). 따라서 링크 자체는 평문화/수정하지 않는다.
- [W5 게이트 추가] 단 (가) 유실 점검은 W5가 한다: legacy source map의 `self-sufficiency 검증`
  컬럼이 "owner 흡수, self-contained"라 주장하는 항목이 실제 owner 본문에 있는지 원문 대조로
  게이트한다(컬럼 주장 ≠ 자동 통과). 또한 history-migration의 미보존 WHY flag(예: `history/57`
  runtime profile namespace WHY, `:138`/`:268`/`:295`)가 실제 owner 승격됐는지 확인한다.
  [Inference] W2 판정표(`:405`)에서 `runtime-profile-namespace-isolation.md`를 self-contained로
  판정했으므로 이미 승격된 것으로 보이나, W5에서 원문 대조로 확정한다.

**plans/post-mvp/ 경계 재확인:** stage 6 물리 삭제 대상은 `history/`·`plan/`·`docs/aiox/`·
`prd/`(일부 보류). `plans/post-mvp/`는 plan **stage 9** 소유(파일 자체 삭제). 그 안의 `history/58`
참조 흔적만 stage 6 제거(W2 repoint 완료).

@user 요청으로 이 결정을 Work Items에 못박는다(아래 W5/W4/W3 갱신).

## 2026-06-23 · W5 게이트 판정 완료 — patch scope 확정, 실행은 다음 세션

작업 방식: @user 승인으로 read-only subagent 3개가 원문↔owner 본문 **사실 대조표만** 추출(판정 금지), controlling agent가 self-sufficiency 판정·결정·기록을 소유했다.

**게이트 판정 (확인한 사실): decision 14개 전부 통과.**

- GAP 없음 9개: `claude-channel-plugin-default`, `client-orchestrator-runtime-pivot`,
  `codex-d7-authoritative-binding-scope`, `codex-per-agent-app-server`,
  `daemon-autostart-and-channel-identity`, `pair-attach-atomicity-and-sentinel`,
  `pair-slot-generalization`, `runtime-profile-namespace-isolation`,
  `uds-transport-and-framing-contract`.
- GAP 보고된 5개 → 판정 결과 load-bearing WHY 유실 아님:
  - `a2a-message-lifecycle-envelope-and-correlation`: GAP 3건(reply timeout 3종 모델,
    `source.kind` human/daemon 예약, explicit protocol version 필드)은 **spec §4에 흡수 확인**
    (`docs/specs/aiox-a2a.md:278`,`:370-371` reply timeout=pending visibility threshold;
    `:153`,`:357` source.kind 예약+human defer; `:127`,`:150`,`:354` `aiox.message.v1`).
    decision `:19-20`이 "outcome은 spec §4, 여기는 rationale only"로 명시 owner 분리 → 의도된 분리, 유실 아님.
  - `agent-level-mcp-process-scoping`: `-c` 실증=검증 트레이스(버림), Daemon Namespace Skeleton=다른 owner,
    aiox-level/agent-level 구분=scope 정의(약한 정합성 gap, 선택 보강 후보).
  - `claude-channel-trust-and-registration`: spike S1/S2 reject ledger=검증 트레이스(버림),
    DB 저장 금지 근거=transient 성격으로 본문 함의, Data Leakage=Identity Theft 귀결(선택 보강 후보).
  - `codex-app-server-mcp-injection-and-isolation`: 실증 증거 4종=살아남는 aiox-smoke-test archive 소관,
    MCP handshake/lifecycle fix=architecture §7.2 + codex-per-agent decision scope(이 decision scope 밖).

**source map 점검 (W5 게이트 추가분):**

- `history/57` 미보존 WHY flag 해소 확인: runtime profile namespace WHY가
  `docs/decisions/runtime-profile-namespace-isolation.md` Rationale `:33-50`·Alternatives `:21-29`에 승격·실재.
  (architecture엔 outcome만, 단 owner는 decision이라 정상.)
- legacy source map의 cite 단 row(`industry-precedents`/`observation-asymmetry`/`step-14-codex-mcp`)는
  spec·decision owner 본문에 실재 확인. cite 없는 row(`prd/post-mvp/archive/*` 5건 등)는 W7/W10 checker PASS 근거 의존(확인 보류).

**proxy 신호 매핑 결정 (@user):**

- `proxy-lazy-observation-cost-model` decision 자체는 통과(cost-model WHY self-contained). 단
  삭제 예정 `docs/aiox/proxy-attribution-signals.md`+`proxy-cost-model.md`가 담은 measured 신호 매핑
  (`sessionStartSource`=`/clear`vs`/new`, `forkedFromId`=`/fork`)이 삭제 시 영구 유실 위험.
- @gemini는 "`history/27`·`41`·`32`에 표로 보존됨 → 유실 아님"이라 결론냈으나, **그 history 3개도 stage 6 삭제 대상**
  (W1 confirmed delete set, 58/59만 제외)이라 결론 무효임을 controlling agent가 짚었다.
  [Fact] roadmap/plan에 proxy 정교화 작업 없음(`rg proxy` 0줄), `sessionStartSource`/`forkedFromId` src 미구현,
  살아남는 곳은 `logs/2026-06-19-mvp-history-archive.md` 한 줄 언급뿐.
- @user 결정: **archive digest로 보존**. W5 archive gate(스파이크 측정치 + self-sufficiency) 부합, 줄삭제 우선 방침의 예외.

**확정 patch scope (다음 세션 실행):**

- A. proxy 신호 매핑 archive digest 생성 — 새 파일 `logs/2026-06-23-workspace-reset-codex-proxy-attribution-archive.md`:
  신호 매핑 표 + 응답 필드 + proxy 아는것/모르는것 + 미래 `sessionStartSource` enum 확장, measured-from `history/27` spike + `history/41` 분석 명기.
  → `docs/aiox/proxy-attribution-signals.md`·`proxy-cost-model.md`의 보존가치 successor.
- B. decision 14개 평문 `Legacy … record` 출처 줄 삭제(평문화 폐기·줄삭제). 살아남는 ref(spec/architecture/src/logs-archive)는 유지.
  Sources 비는 2개 repoint: `agent-level-mcp`(architecture/codex-app-server 역참조), `proxy-lazy`(A의 archive digest).
- C. 선택 본문 보강 2건: `agent-level-mcp`(aiox-level/agent-level 구분 한 줄), `claude-channel-trust`(Data Leakage 시나리오 한 줄).
- D. digest archive provenance(`mvp-history-archive` 등)는 W5 historical record 원칙상 유지(source map 로그와 동일 취급), 추가 줄삭제 불필요.
- 실행 후 `rg` 재검증 → W5 닫고 W3(물리 삭제, @user 확인 후)로.

@user: 실제 patch는 다음 세션 수행. 이 세션은 게이트 판정과 scope 확정까지.

## 2026-06-24 · W5 patch 실행·검증 완료 — Codex 저작 / Claude 검증, pair-attach drift 오인 정정

작업 방식: @user 결정으로 W5 patch는 **Codex 저작 → Claude 검증** 분업으로 수행. 확정 scope(A/B/C/D)는 이전 블록 `:619-628` 소유.

**확인한 사실 (Claude file:line 검증):**

- A. proxy 신호 매핑 archive digest 생성: `logs/2026-06-23-workspace-reset-codex-proxy-attribution-archive.md`.
  원본 2개(`docs/aiox/proxy-attribution-signals.md`·`proxy-cost-model.md`)의 measured 신호
  (`sessionStartSource` clear/null, `forkedFromId`, `-32600` error, lazy-observation 4KB cutoff)를
  줄 단위 대조 — 유실 0. `/resume → …` 조합 3행은 measured 아님 → derived로 명시 보강(경미 반영).
- B. decision 14개: 삭제 예정 경로 출처 줄만 삭제, 본문 load-bearing WHY 보존, 살아남는 ref(spec/architecture/src/logs-archive) 유지. repoint 2건(`agent-level-mcp`→architecture+codex-app-server, `proxy-lazy`→A digest) 적절.
- C. 본문 보강 2건(`agent-level-mcp` aiox/agent-level 구분, `claude-channel-trust` data-leakage→identity-theft) 적절.
- 경미 반영: 본문 인라인 `history/N` 경로를 자연 서술로 전환(`claude-channel-plugin-default`·`codex-per-agent`·`client-orchestrator`·`uds-transport`). `rg` "legacy…record" 출처구 0건.
- 최종 검증: owner 범위(`docs/decisions`·`docs/architecture/local-agent-runtime.md`) 삭제 예정 live ref 0(`docs/decisions/AGENTS.md` 일반 규칙 1건 제외), `git diff --check` clean.

**pair-attach drift 오인 정정 (확인한 사실):**

- Claude 1차 검증이 grep 범위를 `pairs.ts`/`core/pairs.ts`/`db.ts`로 좁혀 "sentinel 부재 = decision↔코드 drift"로 **과잉 판단**했다. 이는 오류였다.
- Codex 재추적 + Claude file:line 재확인 결과 **drift 아님**: rollback sentinel은 daemon orchestration layer에 실재한다 — `src/daemon/state.ts:36`(`attachRollbackSentinel = Symbol`), `:549`(outer `withTransaction`), `:551`(`agents.attach` 선행 write), `:578`(`throw createAttachRollback`), `:719-721`(outer catch → typed response 복원), `:1956`/`:1976`(생성·타입가드). decision Trade-offs의 "API dispatch layer" 단서가 가리킨 위치다.
- architecture가 같은 구조를 current owner로 설명: `:187` Rollback sentinel pattern, `:896` "agents.attach accepts no pairId".
- Codex가 decision 보정(검증 PASS): Decision "all database modifications"→"daemon-level attach orchestration", Rationale에 repository pre-validation vs daemon sentinel 경계 추가, Sources를 살아있는 owner 4개(architecture §3/§8.6, `state.ts`, `pairs.ts`, `pair-store.test.ts`)로 교체. history 삭제 경로 0. 빈 Sources 해소.
- [판정] 별도 drift Work Item 불필요. pair-attach는 correction으로 정합 완료.

**검증 종합:** W5 게이트 PASS. decision 14개 + A digest + 경미 2건 + pair-attach correction 모두 self-sufficiency·dead-link 위생 충족.

**Work Item 전이:** W5 `[>]`→`[x]`. W3 `[ ]`→`[>]`(물리 삭제, 되돌릴 수 없어 @user 확인 게이트).

**다음:** W3 — confirmed delete set 최종 목록을 @user에 제시하고 확인받은 뒤 폴더/파일군 단위 물리 삭제. `history/58`·`history/59`는 W2/W5 inbound 정리 완료로 편입 가능하나, `history/59` Atlas digest는 W4 closeout의 plan stage 7 required-read repoint와 함께 다룬다.

## 2026-06-24 · W3 물리 삭제 실행 — confirmed set 88개 삭제, history/59·stage9 보류

@user 확인으로 W3을 실행했다. @user는 "물리 삭제 = 말 그대로 delete(`rm`)"임을 재확인했고
옵션 1(history/59 보류, stage 9 대상 보류)로 진행을 승인했다. git history는 재앙 복구
안전망일 뿐 참조 경로가 아니라는 W5 원칙을 유지하고, 커밋은 하지 않았다.

**삭제 전 재검증 (확인한 사실, 이 세션 재확인 — 기록 신뢰 대신 직접 확인):**

- 디스크 실태를 W1 confirmed set과 대조: history/ 60개(1~59 + README), docs/aiox/ 19,
  plan/ 2, prd/ 8(mvp 1 + post-mvp/aiox-a2a-spec 1 + archive 5 + pre-validation 2),
  plans/post-mvp* 5. W1 set과 일치.
- dead-link 위생(축2) 재확인: current owner(`docs/decisions`·`architecture`·`specs`·
  `product`), 보존 `plans/post-mvp*`, `spikes`, `tests/unit` 전 범위에서 삭제 예정 경로
  live ref 0(`docs/decisions/AGENTS.md` 일반 규칙 1건 제외). W5 검증이 현재도 유효.

**삭제한 것 (88개, `rm` / `find -delete`, 그룹 단위):**

- `history/` — `59-local-obsidian-vault-atlas-discussion.history.md` 1개만 남기고 전부 삭제
  (1~58 numbered 58개 + `README.md` = 59개). `find history -maxdepth 1 -type f
  ! -name '59-*.history.md' -delete`.
- `docs/aiox/` — 폴더 전체 19개 (`rm -rf`).
- `plan/` — 폴더 전체 2개 (`mvp-implementation-checklist.md`, `qa-tracker.md`).
- `prd/mvp/aiox-mvp-spec.md` — 1개 (+ 빈 `prd/mvp/` 디렉터리 정리).
- `prd/post-mvp/archive/` — 폴더 전체 5개.
- `prd/pre-validation/` — 폴더 전체 2개.

**보류한 것 (의도된 잔존, 확인됨):**

- `history/59-local-obsidian-vault-atlas-discussion.history.md` — Atlas digest가 이 로그
  `:426-455`에 보존돼 있으나, W4 closeout에서 plan stage 7(Atlas) required-read repoint를
  먼저 wire한 뒤 삭제한다(유실 0창 보장). W4로 이월.
- `prd/post-mvp/aiox-a2a-spec.md` — plan stage 9 (단일 A2A execution plan successor pending).
- `plans/post-mvp.plan.md` + `plans/post-mvp/` 4개 — plan stage 9.

**삭제 후 검증 (확인한 사실):**

- 보류 대상 3종 전부 잔존 확인(`history/59`, `prd/post-mvp/aiox-a2a-spec.md`,
  `plans/post-mvp.plan.md` + 4 children).
- 삭제 대상 폴더 전부 부재 확인(`docs/aiox`, `plan`, `prd/mvp`, `prd/post-mvp/archive`,
  `prd/pre-validation`). `history/` 잔존 파일 1개(59), `prd/` 잔존 파일 1개(aiox-a2a-spec).
- `git status --short` deleted entries = **88**(삭제 set과 일치). 동시에 보이는 M/?? 항목은
  이전 세션 W2/W5 provenance 작업의 미커밋 변경분이며 이번 삭제와 무관.
- 삭제 경로 dead-ref 최종 sweep: owner 범위(`docs/decisions`·`architecture`·`specs`·
  `product`) + `plans/post-mvp*` + `spikes` + `tests/unit`에서 삭제된 `docs/aiox`·`prd/*`·
  `plan/*`·`history/1~58`·`history/README` live ref **0**.
- 단 1건 match — `plans/post-mvp.plan.md:34` `history/README` — 은 fenced code block 안
  과거 작업 서술("stale consumer 3곳 Codex 정합")이다. markdown link/live 경로가 아니라
  과거 완료 작업의 historical 기록이고, 이 파일은 stage 9 소유 보존 plan이라 stage 6
  dead-link 위생 대상이 아니다(W2 `:461` 분류와 일치). 조치 불필요.

**Work Item 전이:**

- W3 `[>]` → `[x]` 완료(confirmed set 88개 삭제, history/59 잔여는 W4로 명시 이월).
- W4 `[ ]` → `[>]` 활성화. W4는 (1) plan stage 7(Atlas) required-read repoint → (2) 그 직후
  `history/59` 물리 삭제 → (3) legacy source map·history map 최종 disposition 반영 →
  (4) plan stage 6 `[x]` closeout → stage 7 handoff 순서를 소유한다.

**다음:** W4 — plan stage 7가 `history/59` Atlas digest(이 로그 `:426-455`)를 required-read로
가리키도록 포인터 이전, 그 뒤 `history/59` 삭제, 두 source map disposition 반영, plan
stage 6 closeout.

## 2026-06-24 · W4 진행 — repoint·history/59 삭제·source map 반영 (closeout 전 체크포인트)

@user 지시 cadence(1·2 실행→보고→확인→나머지)에 따라 W4를 단계별로 수행했다. step 4
(plan stage 6 closeout 전이)는 @user 확인 전까지 보류한다. W4는 `[>]` 유지.

**step 1 — plan stage 7 required-read repoint (확인한 사실):**

- `plans/workspace-reset/workspace-reset.md` stage 7(`Atlas 설계와 local 구현`) 아래에
  sub-bullet 추가: `history/59` Atlas digest(이 로그 "history/59 Atlas digest" 섹션 `:426-455`)를
  required-read로 명시. 섹션 이름을 함께 적어 줄 이동 시에도 locate 가능. → (나) 다음단계 입력이
  stage 6 closeout(이 로그 `decided`) 후에도 stage 7 진입 시 읽히도록 wire 완료.

**step 2 — `history/59` 물리 삭제 (되돌릴 수 없음, @user 확인 후 실행):**

- @user가 "1·2번 실행 후 보고" 지시로 step 2까지 승인. `rm
  history/59-local-obsidian-vault-atlas-discussion.history.md` 실행. `history/` 디렉터리 빈 상태
  확인(파일 0). git `D history/59-...`. W3에서 보류했던 잔여 1건 해소.
- 삭제 전·후 dead-ref sweep: owner 범위(`docs/decisions`·`architecture`·`specs`·`product`) +
  보존 `plans/post-mvp*`·`spikes`·`tests/unit`에 삭제된 `history/59` 파일 가리키는 live link 0.
  잔존 2 match는 dead link 아님 — `workspace-reset.md:32`(stage 6 게이트 자기 서술 문구),
  `:38`(step 1이 추가한 required-read 포인터, 대상은 살아있는 digest 로그 섹션이지 삭제 파일 아님).

**step 3 — 두 source map 최종 disposition 반영 (확인한 사실):**

- 분량 산정: W5 결정(이 로그 `:559-562`)상 두 map은 작업경위+검증 ledger이고 inbound 링크는
  "삭제 시점 스냅샷"이라 평문화·수정 금지. 따라서 row별 disposition 재작성이 아니라 dated
  최종-outcome 기록 append가 맞는 작업이다(subagent 불필요 — 인라인 처리).
- `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`(status `open`): W5 Work Item에
  `[2026-06-24] stage 6 게이트 소비 완료` 주석 추가 + "2026-06-24 · stage 6 물리 삭제 반영"
  기록 append(삭제 완료 target rows 29건 enumerate, stage 9 보존 rows 명시). `plans/post-mvp*` +
  `prd/post-mvp/aiox-a2a-spec.md` 미소비라 `open` 유지.
- `logs/2026-06-19-workspace-reset-W5-history-migration.md`(status `decided`): 재결정 아닌 최종
  outcome ledger로 "2026-06-24 · stage 6 물리 삭제 반영" append — history/1~57+README+58(W3)+
  59(W4) 삭제 완료, 58/59 삭제 전제조건 충족 경위 기록.

**검증:** `history/` 빈 상태, git 추가 `D history/59` 1건 + `M`(plan, legacy map, history map,
이 로그). owner 범위 dead-ref 0 유지.

**남은 것(step 4, @user 확인 후):** plan stage 6 `[x]` closeout — 이 로그 Closeout 섹션 작성,
W4 `[>]→[x]`, `workspace-reset.md` stage 6 `[>]→[x]`, stage 7(Atlas) handoff.

**다음:** @user 확인 후 step 4(closeout) 실행. 또는 @user 지시에 따른다.

## 2026-06-24 · W4 step 4 closeout — stage 6 종료, decided 전이

@user 확인("Step 4 진행해")으로 closeout을 실행했다. log skill의 종료 절차(`log-writing-rules.md`
Decided 5조건, `plans/AGENTS.md` stage maintenance)를 따랐다.

**최종 결정·결과:** stage 6 물리 삭제 게이트 종료. W1(삭제 대상 확정)~W4(closeout) 전부 완료.
누적 89개 물리 삭제(W3 88 + W4 `history/59`). owner/decision/archive/plan은 삭제된 legacy
원본 없이 self-contained(W5 게이트 PASS, 원문 대조 검증). `history/`·`docs/aiox`·`plan/`·삭제
대상 `prd/*` 부재.

**반영 위치·검증:** `### Closeout` 섹션이 owner 문서 갱신 목록·검증·remaining gap·retrospective를
소유한다. 핵심 검증 = 89개 삭제, owner 범위 dead-ref 0, stage 9 보류 대상 잔존, `history/` 빈
디렉터리. 두 source map 최종 disposition 반영 완료(legacy=open 유지/stage 9 대기, history=decided
outcome ledger).

**parent pointer 소비:** 이 로그의 parent = `plans/workspace-reset/workspace-reset.md` stage 6
Work Item. closeout으로 plan stage 6를 `[>]→[x]`로 닫아 소비했다. 다음 단계 stage 7(Atlas
설계와 local 구현)은 전용 로그가 아직 없어 `[ ]`로 둔다(`plans/AGENTS.md`: 시작하지 않은 단계는
포인터 생략 가능, 활성 `[>]` 0개 허용). stage 7 착수 = 전용 로그 생성 + `[>]` 승격 + 이미 wire된
required-read(`history/59` Atlas digest = 이 로그 `:426-455`) 소비.

**남은 일 없음 근거:** Decided 5조건 충족 — (1) 결과 본문 기록 완료, (2) 권위 반영(plan·source
map) 완료, (3) 물리 삭제·검증 완료, (4) 미완료 Work Item·미결 질문 0, (5) parent(plan stage 6)
복귀 처리 완료. stage 9(aiox-a2a-spec·plans/post-mvp* 삭제)는 이 stage의 범위가 아니라 plan
stage 9 소유 — open 연장 사유 아님.

**status:** `open` → `decided`.

**다음 owner:** stage 7(Atlas 설계와 local 구현). onramp는 plan stage 6 `[x]` 이후 stage 7을
다음 시작 단계로 surface한다.
