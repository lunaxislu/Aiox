---
topic: workspace reset W9 release/roadmap authority assimilation
description: workspace reset W9 — docs/product/roadmap.md(release gate/phase/priority owner)와 plans/release-plan.md(G6 packaging checklist)를 사용자 배포 우선순위 기준으로 정합화하고, plans/post-mvp*와 prd/post-mvp/aiox-a2a-spec §11/§12를 roadmap/release/단일 plan으로 흡수·재편한 뒤 legacy source map disposition을 갱신한다
status: decided
---

## Work Items

- [x] W1 Batch task brief 작성 — **완료(2026-06-21)**: `logs/AGENTS.md` Task Brief Template로 2개 batch task brief 작성. **Batch R**(`logs/W9-R-task.md`, plans/roadmap/release 정합·재편 + Open Issue gate), **Batch L**(`logs/W9-L-task.md`, legacy must-check 흡수 판정). roadmap 라벨(`Release Gate`/`Execution Plan`)·Current vs Target gate, Phase 3 owner-body 미수정 gate, workflow retrospective + `logs/2026-06-18-package-workflow-portable-pattern.md` 기록 지시 포함. (parent W9-2a)
- [x] W2 배포 우선순위 의견 수렴 — **완료(2026-06-21, @user)**: 현재 roadmap 우선순위 유지(gate 순서 `G0->G1/G3->G2->G5/G6->G4`, npm 1차, macOS/Linux/WSL2). W9는 roadmap 대규모 재작성이 아니라 plans/post-mvp 흡수·재편 + Open Issue gate 확인 중심. 작업 분업 = Codex 저작 → Claude checker(W8 패턴, 세션 분할). (parent W9-1 핵심 입력)
- [x] W3 `plans/post-mvp*` 흡수/재편 — **이관완료(2026-06-22)**: authority 정합(roadmap/release/spec가 priority·gate를 충분히 소유)은 W9에서 Batch R checker PASS로 종결. 남은 execution(단일 A2A plan 작성·roadmap 147-152 repoint·`plans/post-mvp*` 물리 삭제·source map 최종 disposition)은 @user 결정(2026-06-22)으로 Obsidian/Atlas stage 후로 deferred이며, 그 owner를 `plans/workspace-reset/workspace-reset.md`의 `plans/post-mvp*` 삭제 disposition 단계로 **이관**했다(plans가 stage 순서 owner; 취소 아님, 작업은 그 단계가 수행). 그때까지 `plans/post-mvp*` 보존. **(authority gap 없음 / no owner body apply.)** 원래 흡수 대상 detail: `plans/post-mvp.plan.md` + sub-plan 4(`envelope-metadata`/`codex-structured-metadata-spike`/`adapter-dispatch-registry`/`channel-boot-surface`)를 roadmap `Current Execution Candidates`·`Sequenced`와 대조한다. 사용자 목표(plans는 단일 plan, post-mvp는 roadmap/release/단일 plan으로 재편 후 삭제)에 맞춰 흡수하고, roadmap `Current Execution Candidates` 표의 sub-plan inbound 참조를 갱신한다. **async-petting-hoare 운영 라인(post-mvp.plan.md Session Re-entry 블록, `~/.claude/plans/async-petting-hoare.md`)은 별도 보존 대상이라 이 재편에서 삭제·흡수하지 않고 분리한다.** Codex draft는 2026-06-21 Batch R block에 기록됨. Claude checker PASS 전 owner 본문/소스맵 반영 없음. (parent W9-1)
- [x] W4 W7 Open Issue roadmap gate 확인 **(Batch R checker PASS — Open Issue 4/5 이미 roadmap G1-A/B/D + Gate Evidence에 표현됨, `plans/release-plan.md` 무변경 확인; roadmap wording 추가는 optional이며 2026-06-22 전략변경으로 deferred)** — W7 wording Open Issue 4(public `deliveryId` namespace)·5(correlated reply authorization)를 `docs/product/roadmap.md`의 G1-A/B/D gate에서 확인한다. G6 packaging checklist 성격인 `plans/release-plan.md`에는 중복 반영하지 않는다. checker가 spec 213-219/220-224·398 + roadmap 37-45/167-171 cite로 PASS 판정. 추가 wording은 authority 정합 점검에서 gap으로 확인될 때만, @user 승인 후 반영한다.
- [x] W5 archive/legacy W9 must-check **(Batch L Codex draft + Claude checker PASS, 2026-06-22 — §12 release pressure는 roadmap `Pre-Release Gap Summary`+gate에 흡수됨, archive 5·pre-validation 2는 W10 architecture/decision handoff + Archive Gate 대상으로 분류. no owner body apply)** — W8 closeout의 Legacy/Historical Source Handoff 중 W9 must check 행을 roadmap/release 흡수 관점에서 확인한다: `prd/post-mvp/aiox-a2a-spec.md` §11 roadmap·§12 pre-release/blocker pressure, `prd/post-mvp/archive/*`의 product definition·remote expansion·compose sequencing·packaging/release pressure, `prd/pre-validation/*` release risk. roadmap/release에 흡수할 게 있으면 흡수하고, 나머지는 W10/architecture handoff로 분류만 한다.
- [x] W6 source map disposition append/update — **완료(2026-06-22)**: W3~W5 PASS 결과를 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` 기존 source map row에 draft disposition으로 반영. 새 표 생성 없음. `plans/post-mvp*` + `aiox-a2a-spec` §11은 `keep / execution successor pending`, §12는 roadmap release pressure 흡수 + W10/Archive Gate 후 final, archive 5·pre-validation 2는 W10/Archive Gate 보류로 갱신. 최종 disposition·물리 삭제는 확정하지 않음.
- [x] W7 Closeout & parent 반영 — **완료(2026-06-22)**: Codex producer draft + Claude checker review PASS(5/5, git 검증). W10 입력 Legacy/Historical Source Handoff 정제·workflow retrospective F51~F55·parent W9 소비 반영안 작성. @user 확인으로 parent W4.5 W9 부분 소비 적용 + child status `decided` 전이 완료. 물리 삭제·source map final disposition·단일 plan은 미수행(Atlas-gated, parent plan post-Atlas 단계 소유). (parent W9-2/W9-3)

### Scope

- Primary owner: `docs/product/roadmap.md` (release gate/phase/priority owner).
- Allowed cross-owner updates:
  - `plans/release-plan.md` — roadmap G6 npm packaging gate의 배포 시점 실행 checklist. roadmap과 함께 정합한다(별도 roadmap 항목 아님: `docs/product/roadmap.md:11`).
  - `plans/post-mvp.plan.md` + `plans/post-mvp/*.plan.md` — 사용자 목표(plans 단일 plan 재편)에 따른 흡수·재편 대상. **단 async-petting-hoare 운영 라인은 제외.**
  - `docs/decisions/` — 배포 우선순위/sequencing rationale이 decision-worthy면 선별 승격(W6 기준).
  - `docs/specs/aiox-a2a.md`, `docs/architecture/local-agent-runtime.md` — roadmap 정합 중 stale reference 발견 시 최소 패치(parent W9-2).
- Cross-Owner Effects only (수정 금지, 분류·handoff만):
  - `prd/post-mvp/aiox-a2a-spec.md` §13, `docs/aiox/*`, `prd/pre-validation/*`의 architecture/decision 성격 잔여 → W10/architecture handoff로 분류만.
  - `history/*` → W5 history migration owner. 이 package에서 삭제·중복 기록하지 않는다.
- Source-map append target (별도 owner): `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` — disposition append/update만 수행(표 소유자 아님).
- Evidence inputs:
  - Primary: `docs/product/roadmap.md`, `plans/release-plan.md`.
  - 흡수 대상: `plans/post-mvp.plan.md`, `plans/post-mvp/{envelope-metadata,codex-structured-metadata-spike,adapter-dispatch-registry,channel-boot-surface}.plan.md`, `prd/post-mvp/aiox-a2a-spec.md` §11/§12, `prd/post-mvp/archive/*`(5), `prd/pre-validation/*`(2).
  - Required-read handoff: `logs/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`의 Legacy/Historical Source Handoff·split map, `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` source map.
  - 현재 구현 1차 사실: `src/`, `tests/` (release gate evidence 주장 검증용).
  - 규칙: `logs/AGENTS.md`(Legacy Source Absorption Map, Package Preparation, 상태 라벨), `docs/product/AGENTS.md`(있으면), `plans/AGENTS.md`, `docs/decisions/AGENTS.md`.
  - 제약 입력: `logs/2026-06-19-workspace-reset-W5-history-migration.md`(delete guard, target self-sufficiency, physical deletion gate).

### Evidence Ledger

| Topic | Source | Lines | Finding | Owner impact | Action |
| ----- | ------ | ----- | ------- | ------------ | ------ |
| Primary owner 현재 구조 | `docs/product/roadmap.md` | 1-213 | [Fact] roadmap은 release gate(G0-G6, 순서 `G0->G1/G3->G2->G5/G6->G4`), Phase 0-3, Current Execution Candidates(sub-plan 4 참조), Gate Evidence, Cross-Platform, Pre-Release Gap Summary를 소유. W4에서 이미 증류됨. | W9는 우선순위 정합·plans 흡수 중심이지 roadmap 대규모 재작성 아님 | W2 의견 수렴으로 우선순위 변화 여부 확정 |
| release-plan 경계 | `plans/release-plan.md`, `docs/product/roadmap.md` | release 1-57; roadmap 11-13 | [Fact] release-plan은 roadmap G6 packaging gate의 배포 시점 checklist(B1 dist tarball·B2 prepublish build blocker). 별도 roadmap 항목 아님. | W4 Open Issue를 release-plan에 중복 반영 금지 | W4가 G1 gate에서만 확인 |
| plans/post-mvp 재편 대상 | `plans/post-mvp.plan.md`, `plans/post-mvp/*.plan.md` | post-mvp 1-108; sub-plan 4 | [Fact] post-mvp.plan.md는 index(Candidates 4·Sequenced 6단계). Session Re-entry 블록은 async-petting-hoare 운영 라인(별도 보존). sub-plan 4는 roadmap Current Execution Candidates가 G1/Phase2로 매핑함. | 흡수·재편 후 삭제 후보지만 async 라인 분리·envelope-metadata=next kickoff·post-mvp=WS2 current라 즉시 삭제 불가 | W3가 roadmap 흡수 + 단일 plan 재편 |
| W8 handoff W9 작업분 | `logs/2026-06-21-workspace-reset-W8-A2A-spec-authority.md` | 1318·1327 | [Fact] handoff는 `prd/post-mvp/aiox-a2a-spec.md` §11/§12와 `plans/post-mvp*`를 W9 must check(primary W9 input)로 지정. archive product/release pressure도 W9 확인 대상. | W9 흡수 범위 확정 | W5/W3가 소비, W6가 source map 갱신 |

### Decision Candidates

| Source | Lines | Why decision-worthy | Proposed decision | Status |
| ------ | ----- | ------------------- | ----------------- | ------ |
| (batch 실행 중 발견분 기록) | | | | |

### Cross-Owner Effects

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |
| (batch 실행 중 발견분 기록) | | | | |

### Closeout

- Updated owner documents: (W7 closeout에서 채움)
- Validation result: (W7 closeout에서 채움)
- Remaining gaps: (W7 closeout에서 채움)
- Workflow retrospective: (W7 closeout에서 채움; portable 후보는 `logs/2026-06-18-package-workflow-portable-pattern.md` F51~에도 축적)
- Next owner/log: (W7 closeout에서 채움; PASS 후 parent W4.5가 W9 소비, W10 split readiness로 전이)

## 2026-06-21 · W9 package log 생성

Parent pointer: `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` W9

이 로그는 parent W4.5의 W9 release/roadmap authority assimilation package다. parent W9는 이 child
package log의 결과를 소비한다. W8 A2A spec package가 closeout PASS(child status `decided`)로 종료되며
W9를 next pointer로 넘겼고, W8 closeout의 Legacy/Historical Source Handoff와
`logs/2026-06-21-workspace-reset-legacy-source-absorption.md` source map을 required-read로 받는다.

**`logs/AGENTS.md` Package Preparation 순서 적용:**

1. Package log 생성(이 파일) — Scope: Primary owner `docs/product/roadmap.md`, Allowed cross-owner에
   `plans/release-plan.md`·`plans/post-mvp*`·`docs/decisions/`·spec/architecture 최소 패치, source-map
   append target은 별도 owner.
2. Batch task brief는 W2 배포 우선순위 의견 수렴 후 작성(W1). roadmap이 이미 W4에서 증류됐고
   release-plan이 짧아, W8 같은 5-batch monolith 분할보다는 흡수 단위(plans 재편 / Open Issue gate 확인 /
   archive must-check)로 나눌 후보다. 최종 분할은 W2 결과 반영 후 확정.
3. **불확실성 = 배포 우선순위는 사용자 고유 판단이다.** roadmap은 이미 우선순위를 반영하고 있으므로,
   W9-1은 "처음부터 우선순위를 새로 정하는 것"이 아니라 "현재 roadmap 우선순위가 여전히 맞는지 확인하고
   갱신분만 반영"하는 성격으로 본다. 이 의견 수렴이 task brief 확정의 전제라 W2를 첫 active로 둔다.

**확인한 경계:**

- release-plan은 roadmap G6 종속 checklist(`docs/product/roadmap.md:11`). W7 Open Issue 4/5는
  roadmap G1 gate에서만 확인하고 release-plan에 중복하지 않는다.
- `plans/post-mvp.plan.md`의 Session Re-entry 블록은 async-petting-hoare 운영 라인이다. 메모리/별도
  라인으로 보존되는 대상이므로(`~/.claude/plans/async-petting-hoare.md`), plans 재편에서 흡수·삭제하지
  않고 분리한다.
- `history/`는 W5 history migration owner라 이 package에서 다루지 않는다.

**다음:** W2 — 사용자 배포 우선순위 의견 수렴. 결과 반영 후 W1 task brief 확정 → W3부터 흡수 실행.

## 2026-06-21 · W2 완료 — 배포 우선순위 유지, Codex producer 확정

@user 의견 수렴 결과:

- **배포 우선순위 유지.** 현재 roadmap의 gate 순서(`G0->G1/G3->G2->G5/G6->G4`), phase 분리
  (Phase 0~3), npm 1차 배포 형태, macOS/Linux/WSL2 지원 matrix를 그대로 둔다. roadmap을 새로
  정의하지 않는다. 따라서 W9의 owner 본문 변경은 최소(Open Issue gate 위치 확인, Current Execution
  Candidates inbound 정합)이고, 주 산출물은 `plans/post-mvp*` 흡수·재편과 legacy must-check 흡수
  판정 + source map disposition이다.
- **작업 분업 = Codex 저작 → Claude checker.** W8 패턴을 유지한다. Codex가 batch task brief를 받아
  Evidence Ledger를 producer로 저작하고(owner 본문 미수정), Claude(checker)가 cross-model로 cite
  재검증한다. falsifiability gate(roadmap Release Gate claim은 Gate Evidence 기준, Current 구현 claim은
  `src/file:line` cite)는 producer→checker 독립성으로 작동한다. 세션 분할을 수용한다.

## 2026-06-21 · W1 완료 — 2개 batch task brief 작성, batch 분할 확정

W2 결과를 반영해 batch를 2개로 분할하고 `logs/AGENTS.md` Task Brief Template로 task brief를 작성했다.
W8은 spec 692줄 + post-mvp monolith 1188줄이라 5-batch였지만, W9는 roadmap이 W4에서 이미 증류돼
작업량이 작아 흡수 단위 2-batch로 충분하다.

**batch 분할:**

- **Batch R — roadmap/release/plans 정합·재편** (`logs/W9-R-task.md`): parent W3+W4. plans/post-mvp.plan.md
  + sub-plan 4를 roadmap `Current Execution Candidates`·`Sequenced`·`Phases`와 대조하고, `prd/post-mvp/aiox-a2a-spec.md`
  §11(release roadmap, line 901~)이 현재 roadmap과 중복/drift인지 확인. W7 Open Issue 4/5의 roadmap
  G1-A/B/D gate 위치 확인. release-plan G6(B1/B2)가 roadmap G6 evidence와 정합하는지 확인. plans 단일
  재편안(async 라인 분리).
- **Batch L — legacy must-check 흡수 판정** (`logs/W9-L-task.md`): parent W5(+W6 입력). `prd/post-mvp/aiox-a2a-spec.md`
  §12(공개 전 결함 dated audit)를 roadmap `Pre-Release Gap Summary`와 대조, `prd/post-mvp/archive/*` 5
  (product definition/remote expansion/compose sequencing/packaging pressure), `prd/pre-validation/*` 2
  (release risk)의 roadmap/release 흡수 여부 + Archive Gate 판정. source map disposition append 후보.

**task brief 공통 gate (W8 W11 보강분 계승):**

- Phase 3 producer는 어떤 owner 문서도 수정하지 않는다. 산출물 = Evidence Ledger / Decision Candidates
  / Cross-Owner Effects / Source Map append candidates / Open Questions.
- Claim provenance gate: 각 claim을 verified fact / inference / opinion-proposal / current implementation
  / target / bug fix / improvement / stale-drift 중 하나 이상으로 분류.
- Handoff/legacy `file:line`은 출발점일 뿐, 최종 source에서 재확인. 못한 line은 `unverified - regrep required`.
- Evidence Ledger `Action`: `owner body apply candidate` / `no owner body apply` / `needs verification`.
- roadmap 라벨: `Release Gate` / `Execution Plan`. `Post-MVP`는 라벨이 아니라 출처/시점 힌트.

**작성 중 확인한 관찰 (W9 scope 아님, 보고만):**

- [Fact] `docs/product/AGENTS.md`가 없다(`test -f` MISSING). roadmap의 owner 폴더 `docs/product/`에는
  `docs/specs/AGENTS.md`·`docs/architecture/AGENTS.md`(W5 작성)에 대응하는 folder-level 규칙 문서가
  아직 없다. roadmap을 수정하는 W9에서 이 gap을 인지하되, AGENTS.md 신규 작성은 W9 scope가 아니므로
  관찰로만 남기고 사용자에게 보고한다.

**다음:** W3 — Batch R Codex 저작 dispatch(다음 세션). 이어 W5 — Batch L Codex 저작. 회수한 Evidence
Ledger를 Claude(checker)가 cite 재검증한 뒤 owner 본문 반영(W4 gate 확인 포함)과 source map disposition
append(W6)을 수행한다.

## 2026-06-21 · W3/W4 Batch R Codex draft — roadmap/release/plans 정합·재편 검증

이 블록은 `logs/W9-R-task.md`에 따른 **Codex producer draft**다. Owner 본문, source map,
`plans/post-mvp*` 파일은 수정하지 않았다. Claude checker가 source와 line cite를 재검증해 PASS한
항목만 후속 owner 반영(W3/W4 확정, W6 source map 갱신)으로 넘긴다.

### Evidence Ledger — Batch R Draft

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |
| roadmap vs post-mvp index 중복 | `docs/product/roadmap.md`; `plans/post-mvp.plan.md` | roadmap 143-162; post-mvp 66-94 | [Fact] roadmap의 `Current Execution Candidates` 4행과 older plan-side sequence 6단계가 post-mvp index의 Candidates/Sequenced를 이미 owner 라벨로 흡수한다. post-mvp index는 자신을 production spec이 아닌 index라고 선언한다. | Release Gate + Execution Plan; verified fact | roadmap은 우선순위/sequencing successor로 충분하다. post-mvp index의 Candidates/Sequenced 본문은 단일 plan 재편 뒤 삭제 후보. | owner body apply candidate |
| roadmap 우선순위 유지 | `docs/product/roadmap.md`; W2 사용자 결정 | roadmap 15-18, 111-141; W2 block | [Fact] 현재 gate 순서 `G0 -> G1/G3 -> G2 -> G5/G6 -> G4`, npm 1차, macOS/Linux/WSL2 matrix는 W2에서 유지 확정됐다. | Release Gate; verified fact | W9는 roadmap 재작성보다 plan-side 참조 재편과 legacy disposition 갱신 중심. | no owner body apply |
| `prd/post-mvp/aiox-a2a-spec.md` §11 drift | `prd/post-mvp/aiox-a2a-spec.md`; `docs/product/roadmap.md` | prd 901-1025; roadmap 15-178 | [Fact] §11의 gate/phase/evidence 구조는 현 roadmap에 대부분 증류됐다. 주요 차이: legacy §11은 WSL2를 Windows WSL2라고 표현하고 Phase 2에 stale한 "pair slot a=codex/b=claude 고정" 원인 설명을 포함한다; 현 roadmap은 macOS/Linux/WSL2와 pair-to-N-agent route generalization으로 정리한다. | Release Gate + Stale legacy; verified fact + stale-drift | §11 자체는 roadmap successor가 self-contained하다. legacy stale wording은 owner 본문에 흡수하지 않는다. | no owner body apply |
| G6 release-plan 경계 | `docs/product/roadmap.md`; `plans/release-plan.md` | roadmap 11-13, 86-97, 167-178; release 14-56 | [Fact] roadmap은 G6 통과 조건(`files:["dist"]`, `prepublishOnly`, `npm pack`, clean install, smoke, package name 재확인, native addon 검증)을 소유하고, release-plan은 B1/B2와 배포 직전 점검 순서를 checklist로 소유한다. | Release Gate + Execution Plan; verified fact | release-plan은 G6 종속 checklist로 유지. W7 Open Issue 4/5는 release-plan에 추가하지 않는다. | no owner body apply |
| envelope/lifecycle next kickoff | `plans/post-mvp/envelope-metadata.plan.md`; `docs/product/roadmap.md`; `src/adapters/*`; tests | envelope 51-95, 107-148, 149-170, 234-245; roadmap 37-43, 147-150, 167-171; codex mcp 52-153; claude channel 130-229; tests codex-mcp 20-38, claude-channel 400-412 | [Fact] envelope sub-plan은 payload marker 제거, `type`/`intent`/`reply_expected`, protocol version, `messageId`/`deliveryId`, source-only reply routing, send-vs-remote-response 비동기 경계를 구현 scope로 둔다. 현재 코드/테스트는 `Intent:`/`[[CONCLUDE]]`와 `parent_message_id` guidance를 여전히 요구한다. | Execution Plan + Target Contract; verified fact + current implementation | `envelope-metadata.plan.md`는 next kickoff 실행 detail로 단일 plan에 남겨야 한다. roadmap의 G1-A/G1-B/G1-C mapping은 정확하다. | owner body apply candidate |
| Codex structured metadata spike | `plans/post-mvp/codex-structured-metadata-spike.plan.md`; `docs/product/roadmap.md`; `docs/specs/aiox-a2a.md` | spike 20-45; roadmap 37-40, 149-150; spec 809-823 | [Fact] spike는 Codex `turn/start` 또는 app-server surface가 structured aiox metadata를 native로 운반할 수 있는지 조사하는 unordered/deferred plan이다. roadmap은 이를 G1-A evidence와 possible Phase 1 Tier 2 uplift로 매핑한다. | Execution Plan + Release Gate evidence; verified fact | 별도 sub-plan 파일은 단일 plan의 G1-A investigation checklist로 접어 넣을 수 있다. roadmap mapping은 유지 가능. | owner body apply candidate |
| adapter dispatch registry | `plans/post-mvp/adapter-dispatch-registry.plan.md`; `src/daemon/state.ts`; `src/adapters/contract.ts`; `src/adapters/router.ts`; `docs/architecture/local-agent-runtime.md` | plan 17-34, 35-54; state 1246-1324; contract 53-56; router 47-123; architecture 847-849, 1148 | [Fact] production dispatch still branches on `targetAgent.kind` in `dispatchToPairPeers`; a generic `AgentAdapter.inject` and `createAdapterRouter` exist but production dispatch remains inline. architecture already marks registry/router refactor as Deferred. | Execution Plan + Architecture Deferred; verified fact + current implementation | Roadmap mapping to G1 adapter boundary and Phase 2 ingress generalization prerequisite is accurate. Detailed refactor checklist belongs in the single plan, not roadmap. | owner body apply candidate |
| channel boot failure surface | `plans/post-mvp/channel-boot-surface.plan.md`; `src/adapters/claude/channel-server.ts`; `docs/architecture/local-agent-runtime.md`; tests | plan 17-43; channel 432-478, 491-510, 638-690; architecture 315, 1016-1027; tests claude-channel 641-643, 938 | [Fact] channel server can fatal on missing/invalid env and `AIOX_CLAUDE_CHANNEL_PORT` conflict; daemon registration and later deferred dispatch surface exist, but attach success is not narrowed to channel listen/healthy ack. W7 architecture already treats this as current gap/deferred plan. | Execution Plan + Current gap; verified fact + current implementation | Roadmap mapping to G3/G1 diagnosable daemon behavior is accurate. Detailed startup ack/fatal propagation checklist belongs in the single plan. | owner body apply candidate |
| W7 Open Issue 4: public `deliveryId` namespace | `docs/specs/aiox-a2a.md`; `docs/product/roadmap.md`; `plans/release-plan.md` | spec 208-216, 388-389; roadmap 37-41, 167-171; release 14-56 | [Fact] spec keeps public `deliveryId` exposure/namespace as Open Issue. Roadmap G1-A requires deliveryId preservation/failure-mode spike, G1-B requires deliveryId correlation cutover, and G1 evidence requires correlation/failure-mode tests. release-plan has only G6 packaging checklist. | Release Gate + Open Issue; verified fact | Open Issue 4 is already at roadmap G1-A/G1-B/Gate Evidence level; no release-plan change. A wording addition could make "public namespace approval" explicit, but not required for current priority. | owner body apply candidate |
| W7 Open Issue 5: correlated reply authorization | `docs/specs/aiox-a2a.md`; `docs/product/roadmap.md`; `plans/release-plan.md` | spec 219-224; roadmap 37-45, 167-171; release 14-56 | [Fact] spec marks correlated reply authorization recommended/not approved. Roadmap G1-A covers typed send/reply contract, G1-B covers correlation cutover, G1-D covers trust boundary, and G1 evidence includes auth negative tests. release-plan does not duplicate it. | Release Gate + Open Issue; verified fact | Open Issue 5 is correctly a G1-A/G1-B/G1-D gate concern; no G6/release-plan change. A wording addition could name "correlated reply authorization" explicitly under G1-D or evidence. | owner body apply candidate |
| `plan/` legacy cross-search | `plan/mvp-implementation-checklist.md`; `plan/qa-tracker.md`; source map | checklist 1051-1092; qa 59,77; source-map 34-35 | [Fact] legacy plan refs still mention old `plan/post-mvp/...` paths, but W5 source map says checklist/qa have archive successor and are delete candidates after docs/aiox cleanup. | Stale legacy; verified fact | Do not use `plan/` as current roadmap source. Relevant carryover already successor-owned by `logs/2026-06-20-mvp-plan-carryover-archive.md` and W9 `plans/post-mvp*`. | no owner body apply |
| `history/58` cross-search | `history/58-post-mvp-a2a-architecture-decisions.history.md`; W8 handoff | W8 handoff 1317-1328 | [Fact] W8 handoff says `history/58` is W5-owned and W9 should not edit unless roadmap/release gates need remaining §11/§12 rationale. Batch R found no new W9-only decision rationale beyond owner roadmap already absorbing sequencing. | Legacy/W5-owned; verified fact | No source-map row for history. No decision candidate from Batch R. | no owner body apply |

### Cross-Owner Effects — Batch R Draft

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |
| `docs/product/roadmap.md` | Update `Current Execution Candidates` plan links after the single plan exists: 4 sub-plan paths should point to one successor plan section, not deleted `plans/post-mvp/*` files. | User goal is `plans/` single plan; current roadmap inbound refs would become dead links after post-mvp sub-plan deletion. | roadmap 147-152; source-map 55-59; post-mvp index 66-73 |
| `docs/product/roadmap.md` | Optional wording only: G1-A/G1-B/G1-D or Gate Evidence can explicitly name "public `deliveryId` namespace approval" and "correlated reply authorization" if checker wants clearer Open Issue traceability. | Current roadmap already covers deliveryId preservation/correlation/auth negative tests, but does not use the exact W7 Open Issue names. | spec 208-224; roadmap 37-45, 167-171 |
| `plans/release-plan.md` | No Batch R change. Keep as G6 checklist only. | W7 Open Issues 4/5 are protocol/trust G1 gates, not npm packaging tasks. | release 14-56; roadmap 11-13 |
| New or existing single plan in `plans/` | Proposed successor: a single execution plan that contains G1 kickoff/checklist sections for envelope lifecycle, Codex structured metadata spike, adapter registry refactor, channel boot surface, plus later Phase 2 items as deferred sections. | `plans/AGENTS.md` says plans own workstream stages/status; current `plans/post-mvp.plan.md` is an index and sub-plans hold execution checklists. Deleting them requires one self-contained successor. | plans/AGENTS 1-66; post-mvp index 7-9, 66-94; sub-plan files |
| `plans/post-mvp.plan.md` Session Re-entry block | Do not absorb into roadmap or the single A2A execution plan. Preserve/split as async-petting-hoare operational line, or leave until that line's owner confirms successor. | This block is current-work operational state, points to `~/.claude/plans/async-petting-hoare.md`, and is explicitly excluded by W9 scope. | post-mvp 11-57; W9 scope |

### Source Map Append Candidates — Batch R Draft

| file | W9 draft owner 흡수 판정 | archive 필요? | self-sufficiency draft | disposition draft |
| ---- | ------------------------ | ------------ | ---------------------- | ----------------- |
| `plans/post-mvp.plan.md` | Candidates/Sequenced/Cross-Platform are absorbed by `docs/product/roadmap.md` plus proposed single plan. Session Re-entry async-petting-hoare line is excluded and needs separate successor/owner before deletion. | No for A2A plan content; async line not an archive candidate in W9 | Not yet self-sufficient because async line and replacement single plan are not created. | keep until single plan + async split, then `absorb→delete` |
| `plans/post-mvp/envelope-metadata.plan.md` | Roadmap absorbs priority/mapping as G1-A/B/C next kickoff. Detailed implementation increments/acceptance/kickoff checklist must move to single plan. | No | Not self-sufficient until single plan carries §3-§11 execution details or explicitly supersedes them. | `absorb→delete` after single plan |
| `plans/post-mvp/codex-structured-metadata-spike.plan.md` | Roadmap absorbs as G1-A evidence / possible Phase 1 Tier 2 uplift. Investigation question, outputs, verification move to single plan. | No | Not self-sufficient until single plan carries spike question/output/verification. | `absorb→delete` after single plan |
| `plans/post-mvp/adapter-dispatch-registry.plan.md` | Roadmap absorbs as G1 adapter boundary + Phase 2 ingress generalization prerequisite. Refactor options/checklist move to single plan. | No | Not self-sufficient until single plan preserves current production-branch fact and registry/router deferred checklist. | `absorb→delete` after single plan |
| `plans/post-mvp/channel-boot-surface.plan.md` | Roadmap absorbs as G3/G1 diagnosability pressure. Startup ack/fatal propagation checklist moves to single plan. | No | Not self-sufficient until single plan preserves current gap and acceptance criteria. | `absorb→delete` after single plan |
| `prd/post-mvp/aiox-a2a-spec.md` §11 | Release gate/phase/evidence content is self-contained in `docs/product/roadmap.md`; stale pair-slot explanation is intentionally not promoted. | No for §11 | §11 roadmap portion self-sufficient after checker PASS; whole file still depends on Batch L §12 and W10 §13. | W9 §11 portion `absorb→delete`; whole row remains `absorb→delete (W9/W10 후)` |

### Open Questions — Batch R Draft

- [Opinion] Single plan location/name should be chosen before owner edits. Candidate: `plans/a2a-local-stable-roundtrip.plan.md` or `plans/a2a-release-gates.plan.md`. The first better matches G1 implementation work; the second may grow too broad and duplicate roadmap.
- [Inference] `plans/post-mvp.plan.md` cannot be deleted in the same change as roadmap link updates unless the async-petting-hoare Session Re-entry block has an accepted successor outside this W9 scope.
- [Opinion] `docs/product/AGENTS.md` remains a follow-up, not Batch R scope. The lack of product folder rules did not block this Ledger-only draft because `documentation-system.md`, root `AGENTS.md`, `logs/AGENTS.md`, and `plans/AGENTS.md` supplied the needed owner boundaries.

### Workflow Retrospective Candidate

- Batch R confirmed the W8 rule that "Post-MVP" is a source/time hint, not a status. The useful split was not by legacy folder but by owner action: roadmap absorbs priority, single plan preserves executable checklist, source map records deletion readiness, async operational status is excluded.

**Next:** Claude checker should review this Batch R draft against `logs/W9-R-task.md` completion conditions. If PASS, W3/W4 can be marked consumed and the controlling agent can perform owner-body edits plus source-map updates in W6. If changes are requested, patch this draft before touching owner documents.

## 2026-06-21 · W5 Batch L Codex draft — legacy must-check 흡수 판정

이 블록은 `logs/W9-L-task.md`에 따른 **Codex producer draft**다. Owner 본문, source map,
legacy 파일은 수정하지 않았다. Claude checker가 source와 line cite를 재검증해 PASS한 항목만
W5 확정, W6 source map 갱신, W7 closeout으로 넘긴다.

### Evidence Ledger — Batch L Draft

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |
| §12 dated audit scope | `prd/post-mvp/aiox-a2a-spec.md`; `docs/product/roadmap.md` | prd 1030-1064; roadmap 192-212 | [Fact] §12는 2026-06-11 current gap snapshot이고, roadmap은 이 표의 actionable 내용을 gate/phase pressure로만 대표하며 상세 파일 위치·severity·dated snapshot은 intentionally excluded라고 선언한다. | Release Gate + stale/current implementation mix; verified fact | roadmap Pre-Release Gap Summary는 §12를 이미 충분히 흡수한다. §12 원문 세부는 W9 owner body apply 대상이 아니라 evidence/source-map 판정 대상이다. | no owner body apply |
| §12 P1 trust boundary current status | `prd/post-mvp/aiox-a2a-spec.md`; `src/adapters/claude/channel-server.ts`; `src/daemon/state.ts`; `src/config/paths.ts`; tests | prd 1036-1048; channel 437-463, 619-626; state 926-953, 1044-1073; paths 96-101; tests codex-ingress 541-585, claude-channel 99-160 | [Fact] Claude channel HTTP `/send` still accepts local POST JSON without request auth and `readJson` is unbounded. Claude/Codex channel registration now requires pending token and loopback endpoint validation. socket dir creation still uses `mkdirSync(...,{recursive:true})` without explicit chmod. [Inference] P1-3 is stale as written, while P1-1/P1-5/P1-6 style trust-boundary pressure remains live. | Release Gate + Current gap + Stale; current implementation | Already covered by roadmap G1-D and Gate Evidence auth negative tests. Do not copy stale P1 row wording. | no owner body apply |
| §12 P2 reliability current status | `prd/post-mvp/aiox-a2a-spec.md`; `src/daemon/run.ts`; `src/daemon/state.ts`; `src/daemon/socket-transport.ts`; `src/adapters/codex/runtime.ts`; `src/adapters/codex/proxy.ts`; `src/adapters/claude/channel-server.ts`; tests | prd 1049-1064; run 24-59, 83-84; state 1176-1188, 1246-1307; socket 59-82, 183-201; runtime 355-361; channel 619-626; tests api 615-807, codex-runtime 95-150 | [Fact] production daemon still opens `:memory:`; stop/SIGTERM path calls `handle.stop` and runtime dispose behavior is tested through state/API, but `state.stop` itself only marks agents disconnected and deletes codex runtime token maps. socket connection handler has no per-socket `error` listener in the active read path, method lookup lacks own-property guard, deferred delivery returns to queued, body/queue buffers are still unbounded, and `onRuntimeFailed` is passed into `CodexAgentRuntime`. | Release Gate + Current gap + partial stale; current implementation | Roadmap G1-C/G3/G0-G1 already covers runtime failure, queued flush/stale recovery/serialization, socket isolation, child cleanup, bounded buffers, and unsupported transport. No new roadmap row needed. | no owner body apply |
| §12 durable store / restart recovery boundary | `prd/post-mvp/aiox-a2a-spec.md`; `src/daemon/run.ts`; `src/config/paths.ts`; `src/store/sqlite.ts`; `prd/pre-validation/sqlite-restart-recovery-pre-validation.md`; tests | prd 1062; run 24-26; paths 105-120; sqlite 1-8; pre-val 17-29, 63-80, 121-155; tests sqlite 21-35, messages-deliveries 105-135 | [Fact] file-backed SQLite path and WAL helper exist, but production daemon still uses `:memory:`. SQLite restart recovery spike validated file reopen, WAL, disconnected-agent recovery, delivering→queued, idempotency, late reply and event shape, with real supervision/reconnection/migrations explicitly not validated. | Phase 2 + Current gap + evidence archive candidate; current implementation | roadmap already says durable store is not G3 and durable-store hazards move to Phase 2 unless persistence is promoted. W9 release body does not need this spike detail. | no owner body apply |
| archive headers / authority status | `prd/post-mvp/archive/*.md` | claude-codex 1-4; codex-claude 1-4; claude-opinion 1-4; codex-opinion 1-4; gemini 1-4 | [Fact] all 5 archive files declare themselves non-authority archived records and point accepted decisions to current specs/history. | Stale source + historical trace; verified fact | Treat as legacy evidence only. Any live claim must be checked against roadmap/spec/architecture/current code before owner use. | no owner body apply |
| `claude-codex-validation.md` release pressure | `prd/post-mvp/archive/claude-codex-validation.md`; `docs/product/roadmap.md`; Batch R draft | archive 17-28, 54-82; roadmap 37-45, 147-161, 197-204 | [Fact] file converges on local control plane, adapter asymmetry, compose after envelope/adapter/IR, and blind spots: fan-out, reply routing, delivery-vs-awareness, human node, envelope spoofing, Codex structured metadata spike. [Inference] These are G1 contract/reliability/trust inputs already represented by roadmap and Batch R plan candidates, not extra release packaging pressure. | Release Gate + Execution Plan + W10 decision candidate; verified fact + inference | no roadmap/release-plan body change. W10 may check decision-worthy WHY around envelope authority and delivery-vs-awareness. | no owner body apply |
| `codex-claude-validation.md` release pressure | `prd/post-mvp/archive/codex-claude-validation.md`; `docs/product/roadmap.md` | archive 12-60, 69-107, 123-240; roadmap 122-141, 156-161 | [Fact] file frames aiox as local A2A protocol runtime, says envelope/protocol precede compose, and stages local → local multi-daemon → local-remote → company federation → remote-remote. [Inference] Remote expansion and location-independent routing are already Phase 2/3 roadmap material; no Phase 0 release blocker is added. | Execution Plan + Phase 2/3 + W10 architecture/decision candidate; verified fact + inference | no release-plan change. W10 should classify transport/identity/policy architecture rationale if still self-sufficient only in archive. | no owner body apply |
| `claude-opinion.md` release pressure | `prd/post-mvp/archive/claude-opinion.md`; `docs/product/roadmap.md` | archive 72-85, 101-124, 127-168, 171-190, 216-238, 310-323; roadmap 57-70, 122-137, 188-190 | [Fact] file compares Docker/Kubernetes/systemd/workflow/actor/mesh/IDE/MCP, recommends local control plane + agents/routes/capabilities/policies, launch-scoped/non-mutating native config, and warns against services/replica, DAG, native instruction mutation, and sandbox overclaim. [Inference] This is architecture/decision rationale for compose and adapter compile, not public release packaging pressure. | Architecture/decision handoff + Phase 2 Execution Plan; verified fact + inference | no W9 owner body apply; classify to W10 only. | no owner body apply |
| `codex-opinion.md` release pressure | `prd/post-mvp/archive/codex-opinion.md`; `docs/product/roadmap.md` | archive 27-47, 104-145, 164-224, 267-283, 301-380; roadmap 122-137, 156-161 | [Fact] file recommends symmetric compose source with asymmetric adapter compile, aiox-generated session instructions layered above AGENTS/CLAUDE, agent-specific MCP/skill isolation, and a local control-plane model borrowing selected ideas from Docker/Kubernetes/systemd/MCP/workflow. | Architecture/decision handoff + Phase 2 Execution Plan; verified fact | no W9 release/roadmap body change; W10 should verify whether instruction-layer and adapter-compile WHY are already self-contained elsewhere. | no owner body apply |
| `gemini-opinion.md` release pressure | `prd/post-mvp/archive/gemini-opinion.md`; `docs/product/roadmap.md` | archive 52-78, 96-115; roadmap 57, 122-124, 159 | [Fact] file recommends agents/routes/capabilities over services, transient/native config injection, and says multi-host/remote and advanced health/restart are deferrable. | Execution Plan + W10 architecture/decision candidate; verified fact | roadmap already places compose in Phase 2 and remote in Phase 3. No extra W9 body apply. | no owner body apply |
| pre-validation release risk | `prd/pre-validation/claude-codex-pre-validation.md`; `prd/pre-validation/sqlite-restart-recovery-pre-validation.md`; `docs/product/roadmap.md` | cc 19-28, 106-123, 203-240; sqlite 17-29, 63-80, 115-155; roadmap 37-45, 69-70, 197-204, 208-209 | [Fact] Claude/Codex injection feasibility and SQLite restart recovery spikes passed, but both record open issues and not-validated areas. [Inference] They reduce architecture feasibility risk, but their remaining issues are already represented as G1 trust/reliability pressure or Phase 2 durable-store work. | Current implementation evidence + Architecture evidence + no new Release Gate | no roadmap/release-plan body change. Archive Gate decides whether logs digest is needed before deletion. | no owner body apply |
| `history/` cross-search | `history/58-post-mvp-a2a-architecture-decisions.history.md`; `history/15-*`; `history/35-*`; `history/40-*`; `history/47-*` | rg hits; W8 handoff 1317-1326 | [Fact] history contains related decisions and closeouts for pre-validation, Claude channel policy, routed delivery drain, pair-slot generalization, and app-server topology. W8 handoff says `history/` remains W5-owned and W9 should not create duplicate source-map rows. | W5-owned historical source; verified fact | no history edit and no source-map row for history. | no owner body apply |
| `plan/` / `plans/` cross-search | `plan/mvp-implementation-checklist.md`; `plan/qa-tracker.md`; `plans/post-mvp.plan.md`; `plans/post-mvp/*.plan.md` | checklist 1032-1058, 1086-1142; qa 40-53, 77-81; post-mvp 66-94; subplans via Batch R | [Fact] legacy plan files contain closeout evidence and stale references; active plan-side A2A candidates are the Batch R sub-plans. No additional Batch L-only release/packaging pressure was found beyond roadmap/release-plan G6 and Batch R single-plan work. | Stale + Execution Plan; verified fact | record cross-search as no extra L owner apply. | no owner body apply |

### Cross-Owner Effects — Batch L Draft

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |
| `docs/product/roadmap.md` | No Batch L owner-body change recommended. | §12 release-actionable items are already summarized in Pre-Release Gap Summary, G0/G1/G3/G5/G6/G4 gates, Gate Evidence and Phase 2 durable-store line. Archive/pre-validation sources add no new Phase 0 release pressure. | roadmap 15-212; prd §12 1030-1064; code checks above |
| `plans/release-plan.md` | No Batch L change. | archive/pre-validation files do not add npm packaging checklist items beyond existing B1/B2 and roadmap G6. | release 14-56; roadmap 86-97, 167-174, 207 |
| `docs/architecture/local-agent-runtime.md` / W10 | Classification only: compose schema, adapter compile, instruction layering, capability isolation, durable restart, transport/identity/policy expansion, Docker/mesh/actor comparison. | These are internal structure or WHY claims, not W9 release owner claims. W9 does not modify architecture. | archive 5 files; pre-validation 2; W8 handoff 1318-1326 |
| `docs/decisions/` / W10 | Classification only: possible decision candidates for compose mental model, services vs agents/routes/capabilities, native-instruction non-mutation, envelope authority/display split, delivery-vs-awareness. | Decision guidelines require load-bearing WHY and alternatives; W9 found candidates but does not promote them. | `docs/decisions/AGENTS.md` 1-82; archive cited rows |
| `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` | Later W6 candidate update only; not modified in this draft. | Source map is separate owner; this Batch L block supplies candidate disposition/self-sufficiency rows. | source-map rows 26-33, 171-190 |

### Source Map Append Candidates — Batch L Draft

| file | W9 draft owner 흡수 판정 | archive 필요? | self-sufficiency draft | disposition draft |
| ---- | ------------------------ | ------------ | ---------------------- | ----------------- |
| `prd/post-mvp/aiox-a2a-spec.md` §12 | Roadmap/release pressure is absorbed by `docs/product/roadmap.md` Pre-Release Gap Summary and gates. Dated row details are partially stale and intentionally excluded from roadmap body. | Conditional: §12 row-by-row audit trace may be useful only if W10/source-map wants a digest of stale-vs-live gap reconciliation. | W9 release successor is self-contained for gate pressure; whole file deletion still depends on W10 §13 and any §12 digest decision. | W9 §12 portion `absorb→delete`; whole row remains `absorb→delete (W10/Archive Gate 후)` |
| `prd/post-mvp/archive/claude-codex-validation.md` | W9 release pressure already covered by roadmap G1 and Batch R candidates. Remaining value is envelope/adapter/compose WHY and blind spots. | 보류, likely No for W9; W10 decides if WHY digest is needed. | Not self-sufficient for full deletion until W10 checks decision/architecture successor for blind spots and envelope authority rationale. | `absorb→delete? (W10 확인 후)` |
| `prd/post-mvp/archive/codex-claude-validation.md` | No new W9 release body apply; remote expansion already roadmap Phase 2/3. | 보류, likely No for W9; W10 decides. | Not self-sufficient until W10 checks transport/identity/policy and product definition rationale. | `absorb→delete? (W10 확인 후)` |
| `prd/post-mvp/archive/claude-opinion.md` | No new W9 release body apply; compose remains Phase 2 and G2 explicitly does not require compose. | 보류; decision digest possible if services-vs-agents schema rationale is not otherwise preserved. | Not self-sufficient until W10 checks compose/schema/adapter compile decisions. | `archive→delete? or absorb→delete? (W10 확인 후)` |
| `prd/post-mvp/archive/codex-opinion.md` | No new W9 release body apply; adapter compile and instruction layering are Phase 2/architecture. | 보류; decision digest possible for instruction-layer/non-replacement rationale. | Not self-sufficient until W10 checks architecture/decision coverage. | `archive→delete? or absorb→delete? (W10 확인 후)` |
| `prd/post-mvp/archive/gemini-opinion.md` | No new W9 release body apply; confirms agents/routes/capabilities and defers remote/health work. | 보류, likely No unless W10 finds unique decision rationale. | Not self-sufficient until W10 checks whether its schema warnings are duplicate of other archive/current docs. | `absorb→delete? (W10 확인 후)` |
| `prd/pre-validation/claude-codex-pre-validation.md` | No new W9 release body apply; injection feasibility is historical architecture evidence and G1 risk context already reflected in roadmap. | Yes? historical PASS trace may have preservation value if not otherwise digested. | Not self-sufficient in current owner docs for manual spike setup/results; W10/log archive should decide digest. | `archive→delete? (W10 Archive Gate 확인 후)` |
| `prd/pre-validation/sqlite-restart-recovery-pre-validation.md` | No new W9 release body apply; roadmap Phase 2 durable-store line covers release boundary. | Yes? historical PASS trace likely valuable for durable broker recovery if source is deleted. | Not self-sufficient in current owner docs for spike commands, PASS counts and not-validated list; W10/log archive should decide digest. | `archive→delete? (W10 Archive Gate 확인 후)` |

### Archive Gate Draft

| file | 보존가치 | self-sufficiency | draft 판정 | 이유 |
| ---- | -------- | ---------------- | ---------- | ---- |
| `prd/post-mvp/archive/claude-codex-validation.md` | Medium: envelope/adapter WHY and missed blind spots are potentially decision-worthy, but W8/Batch R already absorbed much. | No, W10 must check architecture/decision successors. | 보류 → likely `absorb→delete` if W10 successor is self-contained. | W9 found no release-only pressure; archive digest only if W10 lacks blind-spot rationale. |
| `prd/post-mvp/archive/codex-claude-validation.md` | Medium: local-to-remote expansion and A2A runtime framing may be useful WHY. | No, W10 must check product/architecture/decision coverage. | 보류 → likely `absorb→delete`. | Release roadmap already has Phase 2/3; raw transcript is not W9 owner body material. |
| `prd/post-mvp/archive/claude-opinion.md` | Medium/High: schema alternatives, non-mutation invariant, adapter compile and sandbox-overclaim warnings may be load-bearing. | No, successor decision/architecture not verified here. | 보류 → `archive→delete?` if W10 cannot make successor self-contained without a digest. | Contains concrete alternatives and rejected metaphors beyond release gate summary. |
| `prd/post-mvp/archive/codex-opinion.md` | Medium: generated instruction layering and adapter compile rationale may prevent repeated debate. | No, W10 required. | 보류 → `archive→delete?` or `absorb→delete`. | No W9 release pressure, but decision-worthiness depends on W10 owner coverage. |
| `prd/post-mvp/archive/gemini-opinion.md` | Low/Medium: concise schema warning and transient config framing, mostly duplicated. | No, W10 required. | 보류 → likely `absorb→delete`. | No unique W9 release pressure found; W10 should de-duplicate against other archive files. |
| `prd/pre-validation/claude-codex-pre-validation.md` | High: dated manual PASS trace for two highest-risk injection paths. | No, current owner docs summarize outcomes but not setup/observed evidence in self-contained digest form. | 보류 → likely `archive→delete` if deleting source. | Satisfies preservation value, but archive digest must be written/checked before source deletion. |
| `prd/pre-validation/sqlite-restart-recovery-pre-validation.md` | High: dated durable broker recovery spike, commands, PASS counts and not-validated list. | No, current roadmap intentionally defers durable store and code has only partial current implementation. | 보류 → likely `archive→delete` if deleting source. | Historical verification trace is useful and too detailed for roadmap body. |

### Open Questions — Batch L Draft

- [Inference] W9 can mark §12 release pressure as absorbed by roadmap, but should not mark the whole `prd/post-mvp/aiox-a2a-spec.md` source self-sufficient until W10 handles §13 and any optional §12 stale-vs-live digest.
- [Opinion] `prd/pre-validation/*` should probably become a small logs digest before deletion because both files contain concrete dated PASS traces and not-validated lists that current roadmap/architecture should not copy in full.
- [Inference] archive 5 files do not justify roadmap/release-plan edits, but `claude-opinion.md` and `codex-opinion.md` may still deserve W10 decision screening for compose schema, native instruction non-mutation and adapter compile rationale.
- [Fact] `plan/` and `plans/` cross-search found no additional Batch L-only release pressure. Relevant live plan work is already Batch R; legacy plan closeout rows are stale/W5-owned.

### Workflow Retrospective Candidate

- Batch L suggests Archive Gate should be split into two questions in future briefs: "release owner absorption" and "historical trace preservation." Here the release answer was mostly no-change, while pre-validation trace preservation remains likely and belongs to W10/log archive rather than roadmap body.

**Next:** Claude checker should review this Batch L draft against `logs/W9-L-task.md` completion conditions. If PASS, W5 can be marked consumed and W6 source-map updates can combine Batch R + Batch L candidates. If changes are requested, patch this draft before touching owner documents.

## 2026-06-21 · W3/W4 Batch R Claude checker — PASS/NEEDS CHANGES

이 블록은 `logs/W9-R-task.md` Batch R producer draft(위 `## 2026-06-21 · W3/W4 Batch R Codex draft`)에 대한 **Claude checker** 결과다. owner 본문·source map·legacy 파일을 수정하지 않았다. Batch L(§12/archive/pre-validation) 범위는 검토하지 않았다. 모든 line cite를 handoff 값이 아니라 원문에서 재확인했다.

### 1. Overall verdict: **PASS**

draft의 12개 Evidence Ledger row, 5개 Cross-Owner Effects, 6개 Source Map candidate를 모두 PASS로 판정한다. falsifiability gate 대상(current implementation 주장 = src/test `file:line`)은 인용된 정확한 줄에서 모두 확인됐다. owner 본문 미수정 제약도 준수됐다(draft block은 Ledger-only). PASS는 "분석이 검증됐다"는 뜻이며, 실제 owner-body 편집은 아래 §5의 **user-decision gate**(단일 plan 파일명, async-petting-hoare successor)를 먼저 해소해야 한다. 비차단(non-blocking) NOTE 3건은 후속 편집 정확도를 위한 것이고 PASS를 막지 않는다.

### 2. Row-by-row review table

| Draft row | Verdict | Checked sources (원문 재확인) | Finding | Required change |
| --------- | ------- | ----------------------------- | ------- | --------------- |
| roadmap vs post-mvp index 중복 | PASS | roadmap 143-161(Current Execution Candidates + older sequence); post-mvp 1·3(self-declared index)·66-94 | [Fact] roadmap이 Candidates 4행+plan-side 6단계를 owner 라벨로 흡수, post-mvp는 "production spec 아님 index" 선언(line 3) — 확인 | 없음 |
| roadmap 우선순위 유지 | PASS | roadmap 17(`G0->G1/G3->G2->G5/G6->G4`)·104-105(macOS/Linux/WSL2)·111-141(Phases); W2 block | [Fact] gate 순서·npm 1차·OS matrix가 W2 결정과 일치 | 없음 |
| `aiox-a2a-spec` §11 drift | PASS | prd 901-1028(§11 gate/phase/evidence)·907("Windows WSL2")·991-995(stale pair-slot 고정 설명); roadmap 124(pair-to-N-agent) | [Fact] §11 구조는 roadmap에 증류됨, legacy stale wording(Windows WSL2·고정 pair slot)은 흡수 안 함 — 확인 | 없음 |
| G6 release-plan 경계 | PASS | roadmap 11-13·86-97(G6)·167-178(Gate Evidence); release 14-56(B1/B2+점검순서) | [Fact] roadmap=G6 통과조건 owner, release-plan=배포시점 checklist — 경계 정확 | 없음 |
| envelope/lifecycle next kickoff | PASS | envelope 51-95·107-148·149-170·234-245; **mcp-server.ts 52-58/80/110-151**(Intent/CONCLUDE/parent_message_id), **channel-server.ts 132-199/220-227**; **tests codex-mcp 20-38·claude-channel 400-412**(instruction assertion); roadmap 37-43·149 | [Fact] 현재 코드/테스트가 payload marker guidance를 여전히 요구 — src/test 정확한 줄에서 확인. **NOTE-1**: roadmap Current Execution Candidates(line 149)는 envelope을 "G1-B/G1-C kickoff"으로 라벨링하는데 draft Owner impact/source map은 "G1-A/B/C"로 더 넓게 적음 | (비차단) 후속 owner 편집 시 roadmap 149의 "G1-B/G1-C" 라벨 유지하거나, G1-A 포함 근거(typed send/reply schema=G1-A, roadmap 37)를 명시. roadmap 149를 조용히 바꾸지 말 것 |
| Codex structured metadata spike | PASS | spike 20-45(질문/산출물/verification); roadmap 150(G1-A evidence + Phase1 Tier2); spec §9 806-824 | [Fact] unordered/deferred spike, roadmap G1-A evidence 매핑 정확 | 없음 |
| adapter dispatch registry | PASS | **state.ts 1246**(dispatchToPairPeers)·**1275-1277**(`kind === "codex"` 분기, production paths 998/1034/1118/1153); contract.ts 53(AgentAdapter); router.ts 47(createAdapterRouter)·104(adapter.inject); architecture 847-849·1148("Production dispatch remains dispatchToPairPeers...Deferred") | [Fact] production dispatch가 inline kind 분기, registry/router는 병렬 존재·test-only·Deferred — src+architecture에서 확인 | 없음 |
| channel boot failure surface | PASS | **channel-server.ts 638-650**(fatal `missing_env_*`)·**652-665**(`invalid_env_AIOX_CLAUDE_CHANNEL_PORT`)·**681-690**(`claude_channel_port_in_use`)·491-515(registerWithDaemon); **tests claude-channel 638-644**(port_in_use reject)·933-940(deferred `target_runtime_unavailable`); architecture 1024-1027(fatal boot 명시) | [Fact] env/port fatal·등록 존재하나 attach success가 listen/healthy ack로 좁혀지지 않음 — 확인 | 없음 |
| W7 Open Issue 4: public `deliveryId` namespace | PASS | **aiox-a2a.md 213-219**("public v1 envelope deliveryId exposure and its external namespace are still an Implementation Gap/Open Issue")·388-390(§4.2 namespace note); roadmap 39(G1-A deliveryId 보존)·41(G1-B correlation)·170(Gate Evidence); release 14-56 | [Fact] Open Issue가 이미 roadmap G1-A/G1-B/Gate Evidence 수준에 존재, release-plan 무관 — 확인. **NOTE-2**: draft cite "spec 208-216"은 208-212(무관한 `no_active_routes` caveat)를 5줄 포함; 실제 Open Issue 본문은 213-219 | (비차단) 후속 인용 시 213-219로 정밀화 |
| W7 Open Issue 5: correlated reply authorization | PASS | **aiox-a2a.md 220-226**("does not yet authorize replies by inReplyToDeliveryId or force source-only routing")·**398-399**("Open decision — correlated reply authorization"); roadmap 37-38(G1-A typed reply)·41(G1-B)·44-45(G1-D trust); release no dup | [Fact] G1-A/G1-B/G1-D gate 관심사로 정확, release-plan 미중복 — 확인. **NOTE-3**: draft의 "recommended/not approved"는 spec의 "Open decision" 패러프레이즈(실질 일치). line 398이 더 강한 근거 | (비차단) optional wording 추가 시 line 398 인용 권장 |
| `plan/` legacy cross-search | PASS | **plan/mvp-implementation-checklist.md 1051·1077·1083**·**qa-tracker.md 59·77**(old `plan/post-mvp/...` 경로 참조); source map(checklist/qa rows = `archive→delete`, successor `logs/2026-06-20-mvp-plan-carryover-archive.md`) | [Fact] legacy `plan/` refs는 stale/archive successor 보유, 현재 roadmap source 아님 — 확인. no owner body apply 정확 | 없음 |
| `history/58` cross-search | PASS | logs/AGENTS.md 105("history/는 W5 history migration owner...중복 기록하지 않는다"); 본 로그 Evidence Ledger row(W8 handoff 1318·1327) | [Fact] history는 W5-owned, source-map row 생성 안 함, no owner body apply — logs/AGENTS.md에서 corroborate. W8 handoff 1317-1328은 독립적으로 열지 않았으나 logs/AGENTS.md·controlling Ledger가 동일 결론 보증 | 없음 |

### 3. Cross-owner effects review

- **roadmap link update 후보(Cross-Owner A) — 타당.** [Fact] roadmap 149-152가 4개 sub-plan을 파일 경로로 직접 참조하므로, 단일 plan 재편 후 sub-plan 삭제 시 dead link가 된다. 갱신은 필요하다. **단서**: 4행은 각각 별개 gate(G1-B/C, G1-A, G1 adapter boundary, G3/G1)로 매핑돼 있으므로, 단일 plan으로 repoint할 때 4개 gate traceability를 잃지 않도록 anchor를 유지한다(1행으로 collapse 시 매핑 손실 주의).
- **Open Issue 4/5 wording 추가 — optional이 맞다.** [Fact] roadmap이 이미 deliveryId 보존/correlation/auth negative test를 표현하므로 필수 아님. [Inference] W7 Open Issue의 정확한 이름("public deliveryId namespace approval", "correlated reply authorization")을 G1-D/Gate Evidence에 명시하면 traceability가 또렷해지나, 현재 우선순위 유지 결정(W2) 하에서는 선택. → W4는 "확인됨, body 변경 불필요"로 닫을 수 있고, wording 추가는 사용자 의향 있을 때만.
- **release-plan no-change 판정 — 맞다.** [Fact] release-plan은 G6 packaging(B1/B2)만 소유하고 Open Issue 4/5는 protocol/trust G1 gate이므로 중복 반영하면 owner 경계 위반.
- **single plan successor 후보 — 충분(방향), 단 파일명은 미결.** [Fact] draft가 envelope lifecycle·Codex spike·adapter registry·channel boot의 G1 kickoff/checklist + Phase2 deferred를 담는 단일 실행 plan을 제안 → 사용자 목표(plans 단일 plan) 충족. **단**: 파일명/위치는 Open Question(사용자 결정). Codex는 사용자 선택 전에 파일을 생성하지 않는다.
- **async-petting-hoare 제외 — 맞다.** [Fact] post-mvp.plan.md 11-57 Session Re-entry 블록은 `~/.claude/plans/async-petting-hoare.md`를 가리키는 운영 상태이고 controlling log Scope에서 명시 제외. draft가 흡수/삭제 대상에서 분리하고 post-mvp.plan.md 삭제를 async successor 확정까지 보류한 것은 정확.

### 4. Source map candidates review

표는 별도 owner(`logs/2026-06-21-workspace-reset-legacy-source-absorption.md`)이며 W6에서 **기존 row append/update만** 한다(새 표 금지). Batch R candidate 6건 모두 범위 내·기존 row와 정합:

- `plans/post-mvp.plan.md`: draft disposition "keep until single plan + async split, then absorb→delete". 기존 source map row는 "absorb→delete (W9 재편 후)"로 async-split 선행조건을 **과소표현**하고 있다 → W6에서 async-split + 단일 plan 선행조건을 반영해 갱신 권장. **타당.**
- sub-plan 4개(envelope/codex-spike/adapter-registry/channel-boot): draft "absorb→delete after single plan", 기존 row "absorb→delete (재편 후)"와 일치. **타당.**
- `prd/post-mvp/aiox-a2a-spec.md` §11: draft "W9 §11 portion absorb→delete; whole row remains absorb→delete (W9/W10 후)". 기존 row가 "absorb→delete (W9/W10 후)"이고 §12(Batch L)·§13(W10) 의존을 보존하므로 정합. §11 부분만 self-contained 판정하고 전체 파일 삭제는 미확정으로 둔 것 정확. **타당.** (§12 portion은 Batch R 범위 아님 — 본 checker가 판정하지 않음.)

### 5. Codex follow-up prompt (명령형)

PASS이므로 분석은 확정이다. 단 owner-body 편집은 아래 순서·gate를 지켜라.

1. **먼저 user-decision gate를 사용자에게 올려라(편집 전 차단):**
   - (a) 단일 재편 plan의 **파일명/위치**를 사용자에게 확정받아라(draft Open Question 후보: `plans/a2a-local-stable-roundtrip.plan.md` vs `plans/a2a-release-gates.plan.md` — 전자가 G1 실행작업에 더 부합). 확정 전 파일을 생성하지 마라.
   - (b) **async-petting-hoare Session Re-entry successor**(post-mvp.plan.md 11-57의 별도 보존 라인)의 처리 방침을 확정받아라. 이게 정해지기 전에는 `plans/post-mvp.plan.md`를 삭제하지 마라.
2. **W3 owner 편집(gate 해소 후):**
   - 사용자 승인 파일명으로 단일 plan을 생성하고, 4개 sub-plan의 실행 detail(Implementation Increments/Acceptance/Verification/Kickoff checklist, refactor option, spike question/output, startup ack/fatal propagation)을 그 plan으로 이전하라. roadmap에는 복사하지 마라(Execution Plan은 plans owner).
   - 단일 plan 생성·검증 후, `docs/product/roadmap.md` 147-152의 Current Execution Candidates 4개 inbound 링크를 단일 plan의 해당 anchor로 repoint하라. **4개 gate 매핑(G1-B/C, G1-A, G1 adapter boundary, G3/G1)을 보존**하라. roadmap 우선순위·gate 순서·G1 정의 본문은 건드리지 마라(W2: 유지).
   - 단일 plan + async successor가 확정·self-contained임을 검증한 뒤에만 `plans/post-mvp/*` 4개와 `plans/post-mvp.plan.md`를 물리 삭제 후보로 보낸다. 실제 삭제는 plan stage 물리 삭제 gate·사용자 확인에서만(이 batch/세션에서 삭제 금지).
3. **W4 owner 편집:** Open Issue 4/5는 이미 roadmap G1-A/G1-B/G1-D + Gate Evidence에 표현됨을 확인 완료. **release-plan 변경 없음.** roadmap wording 추가(Open Issue 정확한 이름 명시)는 **optional** — 사용자가 traceability 강화를 원할 때만 G1-D 또는 Gate Evidence에 추가하라(추가 시 spec line 398/213-219 인용). 원치 않으면 W4를 "확인됨, body 변경 불필요"로 닫아라.
4. **W6 source map:** 위 §4의 6개 candidate를 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`의 **기존 row에 append/update**하라. 새 표·새 history row 금지. 특히 `plans/post-mvp.plan.md` row를 async-split 선행조건 반영해 갱신하라. Batch L candidate와 결합은 Batch L checker PASS 이후에.

### 6. Explicit non-actions (수정 금지)

- **Batch L 범위 금지**: `prd/post-mvp/aiox-a2a-spec.md` §12/§13, `prd/post-mvp/archive/*`, `prd/pre-validation/*`는 이 checker가 판정하지 않았다. Batch R 후속에서 건드리지 마라.
- **roadmap 우선순위/gate 본문 불변**: gate 순서, G0-G6 정의, Phase 분리, OS matrix를 재작성하지 마라(W2 유지 결정). 유일 허용 roadmap 편집 = 147-152 inbound 링크 repoint(단일 plan 생성 후) + optional Open Issue wording.
- **release-plan에 Open Issue 4/5 추가 금지.**
- **async-petting-hoare Session Re-entry 블록(post-mvp.plan.md 11-57) 흡수·삭제 금지.**
- **post-mvp.plan.md / sub-plan 물리 삭제 금지**(이 세션). 단일 plan + async successor + 사용자 확인 + plan-stage 삭제 gate 전까지 보류.
- **history/ 편집·source-map history row 생성 금지**(W5 owner).
- **source map 새 표 생성 금지**(기존 row append/update만).
- **단일 plan 파일을 사용자 파일명 확정 전에 생성 금지.**

**Next:** W3/W4 Batch R는 checker PASS. controlling agent(Codex)는 §5 순서대로 user-decision gate(단일 plan 파일명·async successor)를 먼저 해소한 뒤 owner-body 편집·W6 source map append를 수행한다. Batch L checker는 별도 세션에서 진행한다(이 블록은 Batch L을 판정하지 않음).

## 2026-06-22 · async-petting-hoare 처리 결정 (@user) — checker gate (b) 해소

위 checker §5에서 owner-body 편집의 선행 조건으로 건 **gate (b)("async-petting-hoare successor 방침 확정")가 @user 결정으로 해소됐다.** 결정 전 `~/.claude/plans/async-petting-hoare.md`(143줄, 2026-06-05) 전체와 repo 측 상태를 대조 검증했다.

**검증한 사실:**

- [Fact] scratch는 4개 workstream 운영환경 셋업 plan이다(WS1 메모리 정리 / WS2 툴링 / WS3 다세션 stage workflow / WS4 Obsidian repo-as-vault + code-atlas). A2A 프로토콜/release 실행 작업이 아니라 별개 운영 라인이다.
- [Fact] WS1~3의 산출물 또는 대체물이 repo에 실재한다: SessionStart hook(`.claude/settings.json:3-9` → `scripts/onramp`), settings.json/settings.local.json 분리, `docs/guides/workflow.md`(stage workflow owner), `log` skill, MEMORY.md thin index. → @user 판단("document system 구축·workflow 존재")이 사실로 뒷받침됨.
- [Fact] WS4(Obsidian/atlas)는 미착수(`.obsidian/`·`atlas/` 부재)지만, 그 방향·근거·design input이 `history/59-local-obsidian-vault-atlas-discussion.history.md`(2026-06-07, 134줄)에 완전 보존돼 있다(Vault boundary·Atlas purpose·8 Agreed Direction·7 Design Input·code-review-graph spike 판단·동일 skeleton). 즉 "Obsidian 보존" 요구는 이미 history/59가 owner로 충족한다.

**@user 결정:** Obsidian(WS4) 관련을 제외한 나머지는 삭제 가능. WS4는 history/59가 owner라 별도 보존 불필요 → **개인 scratch `~/.claude/plans/async-petting-hoare.md` 전체 삭제 + MEMORY.md pointer 정리.**

**gate (b) 해소 결과 (checker §5 갱신):**

- `plans/post-mvp.plan.md`의 Session Re-entry 블록(11-57)은 더 이상 별도 보존 대상이 아니다. WS1~3은 obsolete(repo가 대체), WS4는 history/59 owned.
- 따라서 W9의 단일 plan 재편 후 `post-mvp.plan.md` 삭제는 async successor 미확정 때문에 막히지 않는다. checker §5 gate (a)(단일 plan 파일명 @user 확정)만 남는다.
- source map(`logs/2026-06-21-...legacy-source-absorption.md`)의 `plans/post-mvp.plan.md` row disposition은 W6에서 "absorb→delete (단일 plan 재편 후)"로 갱신 가능 — async-split 선행조건 제거. (Session Re-entry 보존 단서 삭제)

**이 세션 실행:** 개인 scratch 파일 삭제 + MEMORY.md pointer 갱신 완료. Session Re-entry 블록 물리 제거는 W9 post-mvp.plan.md 삭제 단계가 소유(지금 손대지 않음).

## 2026-06-22 · Batch R PASS 후속 실행전략 변경 (@user ↔ Codex 합의) — 단일 plan 생성 보류, authority 정합 우선

Batch R checker PASS(위 `## 2026-06-21 · W3/W4 Batch R Claude checker — PASS/NEEDS CHANGES`)는 **유지**된다. 바뀐 것은 PASS *이후 실행 전략*이다. @user가 Codex와 합의한 결정을 owner 반영 기준으로 기록한다. **이 블록은 log-only다 — owner 문서·source map·legacy 파일을 수정하지 않았다.**

**변경된 결정 (@user ↔ Codex):**

1. 단일 plan을 지금 바로 생성하지 않는다.
2. 먼저 `docs/specs/aiox-a2a.md`·`docs/product/roadmap.md`·`plans/release-plan.md`에 들어갈 authority를 정합한다.
3. `plans/post-mvp*`의 실행 detail은 당장 삭제/흡수 완료 처리하지 않는다(plan 작성 시점까지 보존).
4. 실제 next execution flow가 spec/roadmap 기준으로 명확해진 뒤 단일 plan을 작성한다.
5. `plans/a2a-local-stable-roundtrip.plan.md` 즉시 생성 보류.
6. roadmap 147-152 sub-plan 링크 repoint도 단일 plan 부재이므로 지금 하지 않는다.
7. source map disposition을 `absorb→delete after single plan`로 확정하지 않고 **execution detail successor pending / keep**으로 남긴다.

**기존 checker 결론과의 관계 (supersede 범위 명시):**

- Batch R PASS 자체·12 Ledger row 판정·src/test cite 검증은 **그대로 유효**. 바뀐 것은 PASS 후 실행 순서뿐이다.
- checker §5 Codex follow-up의 "단일 plan 생성 → roadmap repoint → post-mvp 삭제 → source map `absorb→delete`" 순서와 Cross-Owner Effects A(roadmap 링크 repoint)·D(단일 plan successor)는 **deferred**된다. 단일 plan 작성 시점까지 보류.
- checker §5 gate (a)("단일 plan 파일명/위치 @user 확정")는 **즉시 실행 대상에서 내려간다**. execution flow 확정 후로 미룬다.
- gate (b)(async successor)는 이미 `## 2026-06-22 · async-petting-hoare 처리 결정` 블록에서 해소됨. **단, 그 해소는 "단일 plan 즉시 생성"을 의미하지 않는다**(본 결정이 명확히 함).

**재정렬된 Batch R 후속 action:**

- **W3/W4 — checker PASS 인정. owner body apply는 spec/roadmap/release에 실제 부족분(gap)이 있는 경우에만 한다.** Batch R가 이미 `no owner body apply`/`already absorbed`로 판정한 항목은 그대로 둔다. 다음 작업은 흡수/재편이 아니라 **spec/roadmap/release authority 정합 점검**: 세 owner가 "next execution flow"를 정의하기에 충분·상호 일관한지 확인하고 **부족분만 식별**한다(채우는 행위는 checker PASS + @user 승인 후 별도).
- **단일 plan creation / roadmap 링크 repoint / `plans/post-mvp*` 삭제 = deferred.** spec/roadmap 기준 execution flow 확정 후 착수.
- **W6 source map = `plans/post-mvp*` rows를 keep / execution successor pending 방향으로 갱신**(이번엔 log-only, 실제 표 미수정). `absorb→delete after single plan` 확정 금지. 단일 plan 작성 후 disposition 재확정.

**제약 (유지):**

- owner 문서 수정 최소화. 이미 충분히 흡수된 것은 `no owner body apply`.
- 실행 checklist/detail을 roadmap/spec 본문으로 복사 금지.
- 단일 plan 생성 시점까지 `plans/post-mvp*` 보존. **physical deletion 금지.**
- 본 블록은 log-only. owner 문서·source map·legacy 파일 미수정.

**Codex follow-up prompt (다음 실행 — producer, log-only):**

1. **하지 마라**: 단일 plan 생성, roadmap 147-152 링크 repoint, `plans/post-mvp*` 삭제/흡수 완료 처리, source map 표 수정, owner 본문 수정.
2. **authority 정합 점검을 producer로 저작하라.** `docs/specs/aiox-a2a.md`(§3.1~§9 protocol contract·§4 lifecycle)·`docs/product/roadmap.md`(G0-G6/Phase/Current Execution Candidates/Gate Evidence)·`plans/release-plan.md`(G6 B1/B2)가 **"next execution flow"**(Local stable A2A round trip을 향한 다음 실행 단계)를 정의하기에 충분·상호 일관한지 확인하라.
3. **각 점검 항목을 분류하라:** `[이미 흡수됨 → no owner body apply]` / `[owner authority gap → owner body apply candidate (채우는 행위는 checker PASS + @user 승인 후)]` / `[spec↔roadmap↔release 불일치 → 정합 candidate]`. **실행 checklist/detail은 gap이 아니다**(그건 단일 plan 몫) — 계약/gate/우선순위 같은 owner authority 수준의 부족분만 본다.
4. **부족분을 Evidence Ledger row로 남겨라**(Source / Lines / Finding `[Fact]`·`[Inference]` / Classification = `Release Gate`·`Spec Contract`·`Execution Plan` + provenance / Owner impact / Action = `owner body apply candidate`·`no owner body apply`·`needs verification`). handoff/legacy `file:line`은 출발점일 뿐 최종 source 재확인. **owner 본문 미수정.**
5. **source map은 수정하지 마라.** 다만 `plans/post-mvp*` + `aiox-a2a-spec §11` rows의 권고 disposition을 `keep / execution successor pending`으로 남기라는 **draft note만** Ledger에 적어라.
6. **결과를 controlling log에 producer block으로 append하라.** Claude checker가 cite 재검증 PASS한 부족분만 이후 owner 반영 후보가 된다(PASS 전 owner body·source map·legacy 미반영).

**다음:** Codex가 spec/roadmap/release authority 정합 점검(부족분 식별) producer block을 저작 → Claude checker cite 재검증 → PASS 부족분만 owner 반영 후보. execution flow가 owner 기준으로 명확해진 뒤 단일 plan 작성 여부·시점·파일명을 @user와 확정한다. 단일 plan·repoint·삭제·source map disposition 확정은 모두 그 후.

## 2026-06-22 · W3/W4 authority 정합 Codex producer — spec/roadmap/release 부족분 식별

이 블록은 위 `Batch R PASS 후속 실행전략 변경`의 follow-up prompt에 따른 **Codex producer draft**다.
Owner 문서, source map, `plans/post-mvp*` 파일은 수정하지 않았다. 점검 범위는
`docs/specs/aiox-a2a.md`(§3.1~§9 protocol contract·§4 lifecycle), `docs/product/roadmap.md`
(G0-G6/Phase/Current Execution Candidates/Gate Evidence), `plans/release-plan.md`(G6 B1/B2)다.

### Evidence Ledger — Authority 정합 Draft

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |
| owner boundary | `docs/specs/aiox-a2a.md`; `docs/product/roadmap.md`; `plans/release-plan.md`; `docs/specs/AGENTS.md`; `plans/AGENTS.md` | spec 8-18, 31-42; roadmap 3-13; release 1-5, 14-31; specs AGENTS 7-17; plans AGENTS 1-15 | [Fact] spec는 protocol/interface/state contract만 소유하고 release gates·roadmap phase ordering·dated audits를 제외한다. roadmap은 release gate/phase/priority와 G6 통과조건을 소유한다. release-plan은 실제 `npm publish` 직전 packaging checklist(B1/B2)를 소유한다. [Inference] 세 문서의 owner 경계는 현재 서로 충돌하지 않는다. | Spec Contract + Release Gate + Execution Plan; verified fact + inference | authority 경계 자체는 충분하다. 실행 checklist를 spec/roadmap으로 복사할 필요가 없다. | no owner body apply |
| next execution flow anchor: G1 local stable A2A | `docs/product/roadmap.md`; `docs/specs/aiox-a2a.md` | roadmap 32-48, 143-152, 167-170; spec 120-181, 188-226, 382-414, 801-824 | [Fact] roadmap은 다음 핵심 실행 흐름을 G1-A contract/ingress, G1-B envelope cutover, G1-C reliability, G1-D trust boundary로 분해하고 Current Execution Candidates 4건을 각각 G1/G3 boundary에 매핑한다. spec §4.1~§4.2는 canonical envelope, typed send/reply, deliveryId correlation, source-only reply target, current implementation gaps와 Open decision을 소유한다. §9는 Codex structured ingress spike의 남은 검증 범위를 보존한다. [Inference] Local stable A2A round trip의 contract/gate authority는 spec+roadmap 조합으로 충분하다. 부족한 것은 실행 plan detail이지 owner authority가 아니다. | Spec Contract + Release Gate + Execution Plan; verified fact + inference | 단일 plan 작성 전에도 owner 기준의 다음 실행 축은 확인 가능하다. roadmap 147-152 링크 repoint는 단일 plan 생성 후로 deferred 유지. | no owner body apply |
| delivery lifecycle / reliability alignment | `docs/specs/aiox-a2a.md`; `docs/product/roadmap.md` | spec 228-326, 348-380, 390-397, 832-855; roadmap 40-43, 69-70, 170, 201-204, 208-209 | [Fact] spec는 delivery state, ack/retry/idempotency, reply obligation, persistence minimum, current completed-on-inject caveat, retry/passive-ack open questions를 소유한다. roadmap은 G1-B/G1-C와 Gate Evidence에서 deliveryId correlation, retry/idempotency/offline queue/stale runtime/active-turn tests를 요구하고, durable store를 G3 밖 Phase 2로 둔다. [Inference] lifecycle/reliability 항목은 spec contract와 roadmap gate가 같은 방향을 가리킨다. | Spec Contract + Release Gate; verified fact + inference | release gate wording 추가 필요 없음. G1 failure-injection 수치·세부 checklist는 future execution plan 소유. | no owner body apply |
| trust boundary alignment | `docs/specs/aiox-a2a.md`; `docs/product/roadmap.md` | spec 603-650, 686-694, 719-736; roadmap 44-45, 170, 197-200 | [Fact] spec는 identity/auth, authorization/policy, capability isolation, sandbox non-guarantee, Claude `/send` auth gap, runtime directory/socket/token/data handling을 contract/gap으로 기록한다. roadmap은 G1-D trust boundary와 Gate Evidence auth negative tests, Pre-Release Gap Summary의 authenticated ingress/push·secret delivery·runtime directory/socket permission·token comparison·rollback cleanup을 소유한다. [Inference] W7 Open Issue 5와 Batch L trust-boundary pressure는 이미 spec/roadmap authority에 표현돼 있다. | Spec Contract + Release Gate; verified fact + inference | Open Issue wording 추가는 optional traceability 개선일 뿐 필수 gap은 아니다. | no owner body apply |
| adapter/Codex structured ingress boundary | `docs/specs/aiox-a2a.md`; `docs/product/roadmap.md` | spec 416-531, 652-706, 801-824; roadmap 29-30, 37-39, 121, 149-150, 197-198 | [Fact] spec는 adapter 4-slot/tier model, Codex/Claude current Tier 3 status, upstream app-server/structured ingress spike, official surface references와 current local partial를 소유한다. roadmap은 unsupported/experimental Codex attach path를 G0/G1에서 pin/preflight하게 하고 Codex structured metadata spike를 G1-A evidence 및 Phase 1 Tier 2 uplift 후보로 둔다. [Inference] upstream-dependent ingress risk의 authority는 spec+roadmap에 충분히 분배돼 있다. | Spec Contract + Release Gate + Execution Plan; verified fact + inference | 지금 roadmap/body에 spike detail을 추가하지 않는다. 실행 검증 항목은 `plans/post-mvp/codex-structured-metadata-spike.plan.md` 보존 후 단일 plan 작성 시 successor로 이관. | no owner body apply |
| G3 daemon stabilization boundary | `docs/product/roadmap.md`; `docs/specs/aiox-a2a.md` | roadmap 60-70, 172, 203-204; spec 290-307, 719-736, 856-870 | [Fact] roadmap은 expected socket/client error isolation, fatal handler, stop/SIGTERM child cleanup, structured logs/doctor, daemon/channel diagnostics와 bounded buffers를 G3/Gate Evidence로 소유한다. spec는 typed error model, backpressure, no global ordering/serialization, fatal log/token redaction, external session expiry open questions를 contract/gap으로 둔다. [Inference] G3는 roadmap release gate이고 spec는 protocol/security constraints만 제공하므로 owner 경계가 맞다. | Release Gate + Spec Contract; verified fact + inference | no owner body apply. Session expiry policy는 G1/G3 execution planning 또는 later spec decision에서 다룰 후보지만 지금 authority gap은 아니다. | no owner body apply |
| G6 packaging / release-plan alignment | `docs/product/roadmap.md`; `plans/release-plan.md` | roadmap 11-13, 86-97, 167-175, 207; release 14-31, 33-56 | [Fact] roadmap G6는 `files:["dist"]`, publish 전 build, `npm pack`, clean install, executable/version/help/daemon smoke, package name 재확인, native addon matrix 검증을 release gate로 소유한다. release-plan은 B1 `dist/` tarball 누락과 B2 prepublish build blocker 및 publish 직전 점검 순서를 checklist로 소유한다. [Inference] release-plan은 G6의 실행 checklist로 충분히 정합하며 G1 Open Issue 4/5를 반영할 owner가 아니다. | Release Gate + Execution Plan; verified fact + inference | release-plan 변경 없음. | no owner body apply |
| Phase 2/3 deferral alignment | `docs/specs/aiox-a2a.md`; `docs/product/roadmap.md` | spec 533-601, 603-650, 738-789, 801-830; roadmap 111-141, 156-161, 180-190 | [Fact] spec는 compose, user config, capability projection, federation/remote를 committed/deferred target으로 두되 release timing을 소유하지 않는다. roadmap은 compose/capability projection/durable replay/additional drivers를 Phase 2, remote MCP/internal federation/Google A2A bridge를 Phase 3로 둔다. [Inference] Phase deferral은 roadmap이 소유하고 spec는 contract 확장 가능성만 보존해 owner 경계가 정합하다. | Spec Contract + Release Gate; verified fact + inference | no owner body apply. W10 architecture/decision handoff 대상은 유지. | no owner body apply |
| post-mvp execution detail successor pending | `docs/product/roadmap.md`; `logs/2026-06-21-workspace-reset-W9-release-roadmap-authority.md` | roadmap 143-152; log 371-379, 388-408 | [Fact] roadmap은 4개 `plans/post-mvp/*` sub-plan을 Current Execution Candidates로 직접 참조한다. 최신 전략 변경은 단일 plan creation, roadmap 링크 repoint, `plans/post-mvp*` 삭제, source map 확정을 deferred하고, source map draft note만 `keep / execution successor pending` 방향으로 남기라고 지시한다. [Inference] 현재 상태에서 dead link는 없고, 단일 plan 부재 자체는 authority gap이 아니라 실행 successor pending 상태다. | Execution Plan + source-map draft note; verified fact + inference | source map 실제 표 수정 금지. draft note: `plans/post-mvp.plan.md` + sub-plan 4와 `prd/post-mvp/aiox-a2a-spec.md` §11 disposition은 지금 `keep / execution successor pending`; 단일 plan 작성 후 재판정. | no owner body apply |

### Cross-Owner Effects — Authority 정합 Draft

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |
| `docs/specs/aiox-a2a.md` | No producer-stage owner-body change recommended. | Local stable A2A의 envelope, lifecycle, routing/reply, adapter tier, trust/capability and deferred/open questions are already represented at contract level. | spec 120-414, 416-531, 603-736, 801-870 |
| `docs/product/roadmap.md` | No producer-stage owner-body change recommended. | G1/G3/G6 gates, Current Execution Candidates, Gate Evidence, Phase deferrals and Pre-Release Gap Summary already define the owner-level next execution flow. | roadmap 15-48, 60-70, 86-97, 111-178, 192-212 |
| `plans/release-plan.md` | No change. | Release-plan remains G6 packaging checklist(B1/B2 + publish-time verification), not G1 protocol/trust owner. | release 14-56; roadmap 11-13, 86-97, 174 |
| `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` | No edit in this producer block. Draft note only: keep / execution successor pending for `plans/post-mvp*` and `aiox-a2a-spec` §11 until single plan successor exists. | Latest W9 strategy explicitly forbids source map table edits and forbids `absorb→delete after single plan` as a current disposition. | current log 371-379, 401-408 |

### Producer Conclusion

- [Fact] 세 owner 문서는 현재 authority 수준에서는 상호 정합하다. 확인된 부족분은 실행 checklist/detail successor 부재이며, 이는 전략 변경상 단일 plan 작성 시점까지 `plans/post-mvp*`가 보존해 소유한다.
- [Inference] Claude checker가 위 cite와 classification을 PASS하면 W3/W4는 "authority gap 없음, owner body apply 없음"으로 닫고, 다음 결정은 Batch L checker 또는 단일 plan 작성 시점 확정으로 넘어갈 수 있다.
- [Opinion-proposal] owner 본문을 지금 수정하지 않는 것이 맞다. premature roadmap wording 추가는 실행 detail을 roadmap/spec에 섞을 위험이 있고, 현재 roadmap의 gate/evidence 문구로 traceability가 충분하다.

**Next:** Claude checker가 이 producer block을 source line 기준으로 재검증한다. PASS 전에는 owner body, source map, legacy file, roadmap link를 수정하지 않는다.

## 2026-06-22 · W3/W4 authority 정합 Claude checker — PASS

이 블록은 위 `## 2026-06-22 · W3/W4 authority 정합 Codex producer` block에 대한 **Claude checker** 결과다. 9개 Evidence Ledger row, 4개 Cross-Owner Effects, Producer Conclusion의 모든 line cite를 handoff 값이 아니라 `docs/specs/aiox-a2a.md`·`docs/product/roadmap.md`·`plans/release-plan.md` 원문에서 재확인했다. owner 본문·source map·legacy 파일은 수정하지 않았다.

### 1. Overall verdict: **PASS**

producer 결론("세 owner 문서는 authority 수준에서 상호 정합하며, 확인된 부족분은 owner authority gap이 아니라 실행 detail successor(단일 plan) 부재")을 PASS로 판정한다. 9개 row 모두 cite가 정확하고, status 분류(`Spec Contract`/`Release Gate`/`Execution Plan` + provenance)가 라벨 규칙에 부합하며, `no owner body apply` 판정이 타당하다. owner 본문 미수정 제약은 git으로 독립 검증했다(아래 §4). 비차단 NOTE 2건은 후속 정확도용이며 PASS를 막지 않는다.

### 2. Row-by-row review table

| Producer row | Verdict | Checked sources (원문 재확인) | Finding |
| ------------ | ------- | ----------------------------- | ------- |
| owner boundary | PASS | spec 8-18(release gates/phase/audit "intentionally not copied")·31-42(protocol contract 소유); roadmap 3-13(release gate/phase/priority 소유, release-plan=G6 checklist); release 1-5·14-31(B1/B2); specs AGENTS 7-17(외부 contract 중심·계획 혼합 금지); plans AGENTS 1-15(plans=단계/실행순서/진행상태 owner) | [Fact] 세 owner 경계가 서로 충돌하지 않음 — 다섯 source 전부에서 확인 |
| next execution flow anchor: G1 | PASS | roadmap 32-48(G1-A/B/C/D)·143-152(Current Execution Candidates 4→G1/G3 매핑)·167-170(Gate Evidence G1); spec 120-181(§4.1 canonical envelope+typed send/reply)·188-226(§4.2 deliveryId correlation·source-only reply·caveat 213-226)·382-414(Open decision 398-404)·801-824(§9 Codex ingress spike) | [Fact] G1 실행 축의 contract/gate authority가 spec+roadmap 조합으로 충분 — 확인 |
| delivery lifecycle / reliability | PASS | spec 228-326(§4.3 state machine 232-235·ack/retry/idempotency·§4.5 persistence min)·348-380(invariants+completed-on-inject caveat 379-380)·390-397·832-855(retry/passive-ack open 854-855); roadmap 40-43(G1-B/C)·69-70(durable store=Phase2)·170(G1 evidence retry/idempotency/offline/stale/active-turn)·201-204·208-209 | [Fact] lifecycle/reliability에서 spec contract와 roadmap gate가 동방향 — 확인 |
| trust boundary | PASS | spec 603-650(§7 4축 identity/authz/capability/sandbox non-guarantee)·686-694(Claude `/send` auth gap=Implementation Gap)·719-736(§7.2 runtime dir/socket/token/data); roadmap 44-45(G1-D)·170(auth negative tests)·197-200(Pre-Release Gap: authenticated ingress/push·secret·dir/socket perm·token compare·rollback) | [Fact] W7 Open Issue 5·trust-boundary pressure가 이미 spec/roadmap authority에 표현됨 — 확인 |
| adapter/Codex structured ingress | PASS | spec 416-531(§5 4-slot+tier, Codex/Claude Tier 3 matrix)·652-706(§7.1 projection feasibility+official refs 702-706)·801-824(§9 spike+local partial); roadmap 29-30(G0/G1 pin/preflight)·37-39(G1-A spike)·121(Phase1 Tier2 uplift)·149-150·197-198 | [Fact] upstream-dependent ingress risk authority가 spec+roadmap에 분배됨 — 확인 |
| G3 daemon stabilization | PASS | roadmap 60-70(G3 socket isolation·fatal·SIGTERM cleanup·logger/doctor·diagnostics)·172(G3 evidence)·203-204(Pre-Release Gap G3); spec 290-307(§4.4 typed error·backpressure 302·no global ordering 305-307)·719-736(fatal log/redaction)·856-870(§9 session expiry open) | [Fact] G3=roadmap release gate, spec=protocol/security constraint — 경계 정확. session expiry는 spec §9가 open으로 owned(authority gap 아님) — 확인 |
| G6 packaging / release-plan | PASS | roadmap 11-13·86-97(G6 files:["dist"]·prepublish·npm pack·clean install·smoke·name·native addon)·167-175(Gate Evidence G6 174)·207(Pre-Release Gap G6); release 14-31(B1/B2)·33-56(정리·양호·점검순서) | [Fact] release-plan=G6 실행 checklist로 정합, G1 Open Issue 4/5 owner 아님 — 확인 |
| Phase 2/3 deferral | PASS | spec 533-601(§6 Compose=Phase2 target)·603-650(§7 capability projection)·738-789(§8 federation=Deferred)·801-830(§9); roadmap 111-141(Phases block)·156-161(plan-side sequence→Phase2/3)·180-190(Cross-Platform; Phase2 compose 188-189) | [Fact] Phase deferral=roadmap owned, spec=contract 확장 가능성만 보존 — 확인. **NOTE-1**: 180-190은 Cross-Platform 절로 Phase2/3 열거의 보조 cite(주 열거는 122-129·156-161). 비차단 |
| post-mvp execution detail successor pending | PASS | roadmap 143-152(4 sub-plan 경로 직접 참조); log 371-379(2026-06-22 전략변경: 단일 plan/repoint/삭제/source map 확정 deferred)·388-408(재정렬 action+follow-up prompt) | [Fact] dead link 현재 없음, 단일 plan 부재는 authority gap이 아니라 successor pending — 확인. draft note(`keep / execution successor pending`)는 전략변경 지시와 정합 |

### 3. Cross-owner effects review

- **spec/roadmap/release 무변경 권고 — 타당.** [Fact] 세 owner의 envelope·lifecycle·routing/reply·adapter tier·trust/capability·deferred/open 항목이 이미 contract/gate 수준에 존재함을 §2 row들이 cite로 확인. premature wording 추가는 실행 detail을 spec/roadmap 본문에 섞을 위험이 있어 `no owner body apply`가 owner 경계 보존 관점에서 맞다.
- **source map draft note only — 타당.** [Fact] 최신 전략변경(log 401-408)이 source map 표 수정과 `absorb→delete after single plan` 확정을 금지. producer가 `keep / execution successor pending` draft note만 남긴 것은 그 지시 준수.
- **W7 Open Issue 4/5 wording — optional 유지.** [Inference] spec 213-219(deliveryId namespace=Open Issue)·398-404(correlated reply=Open decision)는 "G1 schema cutover 전 결정" / "G1 must decide"로 spec이 이미 owned. roadmap이 기능적으로(G1-A/B/D + auth negative tests) 커버하므로 authority gap 아님. 단 이 둘은 **G1 착수 시 실제로 해소해야 하는 pre-cutover contract 결정**이다 — producer가 Row 2·4에서 명시 포착했으므로 lost 아님. (Batch R checker 결론과 일관)

### 4. owner-body 미수정 독립 검증 (git)

`git status --short` + `git diff --stat`로 확인: `docs/specs/aiox-a2a.md`, `docs/product/roadmap.md`, `plans/release-plan.md`, `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`, `plans/post-mvp.plan.md`, `plans/post-mvp/*`는 **변경 없음**(diff 비어 있음). producer block은 이 controlling log append만 수행했다. "owner 본문·source map·legacy 미수정" 주장은 사실로 확인됨.

### 5. W3/W4 종결 판정과 다음

PASS이므로:

- **W3/W4는 "authority gap 없음, no owner body apply"로 닫을 수 있다.** spec/roadmap/release는 local stable A2A round trip을 향한 next execution flow를 정의하기에 owner authority 수준에서 충분·상호 정합하다. 확인된 유일한 부족분은 실행 detail successor(단일 plan)이며, 이는 2026-06-22 전략변경상 의도적으로 deferred다(`plans/post-mvp*`가 그때까지 보존·소유).
- **다음 결정 후보:** (i) Batch L checker(W5, 별도 — §12/archive 5/pre-validation 2 흡수 판정 cite 재검증, 아직 미수행), 또는 (ii) 단일 plan 작성 시점·파일명 @user 확정. 둘 다 이 checker 범위 밖.

### 6. Explicit non-actions (이 checker가 하지 않음 / 후속이 하지 말 것)

- **owner 본문 수정 금지**: PASS는 "분석 검증됨"이지 owner 편집 트리거가 아니다. spec/roadmap/release 본문은 이번에도 무변경 유지.
- **단일 plan 생성·roadmap 147-152 repoint·`plans/post-mvp*` 삭제·source map 표 수정 금지**: 모두 전략변경상 deferred. 단일 plan 작성 시점까지.
- **Batch L 범위 미판정**: `prd/post-mvp/aiox-a2a-spec.md` §12/§13, `prd/post-mvp/archive/*`, `prd/pre-validation/*`는 이 checker가 검토하지 않았다(별도 Batch L checker 세션 소유).
- **optional Open Issue wording**: 추가는 @user가 traceability 강화를 원할 때만, G1-D 또는 Gate Evidence에 spec line 398/213-219 인용해서. 필수 아님.

**Next:** W3/W4 authority 정합 = checker PASS. controlling agent는 W3/W4를 "authority gap 없음 / no owner body apply"로 종결하고, 다음 active를 Batch L checker(W5) 또는 단일 plan 작성 시점 @user 확정으로 정한다. 단일 plan·repoint·post-mvp 삭제·source map disposition 확정은 모두 그 후.

## 2026-06-22 · W5 Batch L Claude checker — PASS

이 블록은 위 `## 2026-06-21 · W5 Batch L Codex draft` block에 대한 **Claude checker** 결과다. 13개 Evidence Ledger row, 4개 Cross-Owner Effects, 8개 Source Map candidate, 7개 Archive Gate row의 cite를 handoff 값이 아니라 `prd/post-mvp/aiox-a2a-spec.md` §11-§13, `prd/post-mvp/archive/*` 5, `prd/pre-validation/*` 2, 그리고 §12 P1/P2의 current-code 주장은 `src/`에서 재확인했다. owner 본문·source map·legacy 파일은 수정하지 않았다.

### 1. Overall verdict: **PASS**

Batch L draft의 핵심 결론("§12 release pressure는 roadmap `Pre-Release Gap Summary`+gate에 이미 흡수됨; archive 5·pre-validation 2는 roadmap/release owner body apply 대상이 아니라 W10 architecture/decision handoff + Archive Gate 대상")을 PASS로 판정한다. falsifiability gate 대상(§12 P1/P2 current-implementation 주장 = src `file:line`)은 인용된 줄에서 확인됐고, archive 5개 모두 header에서 "this file is not authority"를 선언하며 accepted decision을 `aiox-a2a.md`+`history/58`로 위임함을 확인했다. 비차단 NOTE 2건은 후속 정확도용이며 PASS를 막지 않는다.

### 2. Row-by-row review table

| Draft row | Verdict | Checked sources (원문 재확인) | Finding |
| --------- | ------- | ----------------------------- | ------- |
| §12 dated audit scope | PASS | prd 1030-1034("2026-06-11 source 기준 current gap snapshot")·1036-1064(P1/P2 표); roadmap 192-212(Pre-Release Gap Summary + "Detailed file locations, severity labels and the dated audit snapshot... intentionally excluded") | [Fact] roadmap이 §12 actionable을 gate/phase pressure로 대표, dated 세부는 intentionally excluded — 확인 |
| §12 P1 trust boundary current status | PASS | prd 1040(P1-1 `/send` 무인증)·1042(P1-3 ingress token)·1044(P1-5 socket 권한)·1045(P1-6 non-constant `!==`); **channel-server.ts 437-463**(`/send` POST no auth header)·**619-626**(`readJson` 무제한 body); **paths.ts 101**(`mkdirSync(dir,{recursive:true})` no chmod) | [Fact] `/send` 무인증·readJson 무제한·socket dir chmod 부재 — src에서 확인. [Inference] P1-3는 registration token으로 stale, P1-1/P1-5/P1-6 pressure는 live — spec 686-694(registration auth 있음, `/send` push는 Implementation Gap)로 corroborate. **NOTE-1**: P1-5 dated cite는 `paths.ts:100`, 현재 mkdirSync는 :101(1줄 drift, draft 96-101 범위가 커버) |
| §12 P2 reliability current status | PASS | prd 1053-1060(P2-1~8); **run.ts 25**(`:memory:`)·47-61/83(shutdown→handle.stop, SIGTERM); **socket-transport.ts 60-82**(per-socket `error` listener 부재)·**183-201**(`api[request.method]` own-property 가드 부재) | [Fact] :memory:·socket error listener 부재·own-property 가드 부재·unbounded readJson — src에서 확인. roadmap G1-C/G3가 이미 owned |
| §12 durable store / restart recovery | PASS | prd 1062(P2-10 Phase 2); **paths.ts 105-120**("SCAFFOLD ONLY — production daemon currently runs `:memory:`"); pre-val sqlite 21-28(PASS 표)·63-80(delivering→queued)·148-155(Not Validated: supervision/reconnection/migrations) | [Fact] file-backed path scaffold 존재·production :memory:·spike PASS 범위와 not-validated 일치 — 확인. roadmap durable store=Phase 2 |
| archive headers / authority status | PASS | claude-codex 1-4·codex-claude 1-4·claude-opinion 1-4·codex-opinion 1-4·gemini 1-4 (전부 "Archived ... record. This file is not authority. Accepted decisions were consolidated into ...aiox-a2a.md, with rationale in ...history/58") | [Fact] 5개 모두 비권위 선언 + 결정은 spec/history로 위임 — 5개 header 전부 확인 |
| claude-codex-validation 압력 | PASS | archive 17-28(수렴: control plane·대칭/비대칭·compose 나중 envelope 먼저)·54-82(blind spots: fan-out·reply routing·delivery≠인지·human node·envelope 위조·Codex metadata spike) | [Fact] envelope/adapter/compose 수렴 + 5 blind spot — 확인. [Inference] G1 contract/reliability/trust input, release packaging pressure 아님 |
| codex-claude-validation 압력 | PASS | archive 12-60(claude-opinion cross-val: agents/routes/capabilities)·69-107(A2A 표준+local runtime, 5-step)·123-240(location-independent, agent:// 주소, local→multi-daemon→local-remote→federation→remote-remote) | [Fact] A2A runtime framing + remote expansion staging — 확인. [Inference] Phase 2/3 roadmap material, Phase 0 blocker 아님 |
| claude-opinion 압력 | PASS | archive 72-85(Docker/k8s/systemd/workflow/actor/mesh/IDE/MCP 비교)·101-124(분해형 schema 추천)·127-168(IR+compile, launch-scoped/non-mutation, 2-layer instruction)·171-190(capability isolation 4계층)·216-238(deferrability)·310-323(위험 은유 3: service/replica·DAG·native mutation+sandbox overclaim) | [Fact] compose/adapter compile architecture rationale — 6범위 전부 확인. [Inference] W10 architecture/decision 대상 |
| codex-opinion 압력 | PASS | archive 27-47(대칭 compose/비대칭 adapter compile)·104-145(MCP/skill isolation, Option B=compose source)·164-224(generated session instruction layered above AGENTS/CLAUDE, precedence)·301-380(local control-plane model, Docker/k8s/systemd/MCP/workflow 차용) | [Fact] instruction layering·adapter compile·control plane — 확인. **NOTE-2**: cite 중 267-283은 독립 재열람 안 함(나머지 4범위로 finding·verdict 확인됨; 문서 성격 일관) |
| gemini-opinion 압력 | PASS | archive 52-78(Docker/Mesh/Actor trade-off, agents/routes/capabilities 추천, reversibility/deferrability)·96-115(transient config isolation, 위험 은유 3: Agent=Container·중앙 brain·services에 routing 매립) | [Fact] agents/routes/capabilities·transient config·multi-host/health defer — 확인. release pressure 없음 |
| pre-validation release risk | PASS | cc 19-28(Summary PASS/PARTIAL)·106-123(Claude Result+Open product issue: trust/confirmation)·203-240(Codex Result+Open issue: thread name mapping+Architecture Implications); sqlite 17-29(PASS 표)·63-80·115-155(Not Validated) | [Fact] injection feasibility·SQLite restart PASS + open issue/not-validated — 확인. [Inference] G1 trust/reliability·Phase 2 durable로 이미 표현 |
| history/ cross-search | PASS | logs/AGENTS.md(history=W5 owner, source-map row 신설 금지); W8 handoff 1317-1326 인용 | [Fact] history W5-owned, no source-map row, no edit — boundary 정확 |
| plan/ /plans/ cross-search | PASS | controlling log Batch R block(active plan A2A 후보=sub-plan 4); §12 vs §11/§13 경계 | [Fact] legacy plan stale, active plan work=Batch R, Batch L-only release pressure 없음 — 확인 |

### 3. Cross-owner effects review

- **roadmap no Batch L change — 타당.** [Fact] §12 P1/P2 release-actionable이 roadmap G1-D(trust)/G1-C(reliability)/G3(daemon robustness)/Pre-Release Gap Summary + Phase 2 durable-store line에 이미 표현됨을 §2 row들이 cite로 확인. §12 dated 세부(파일/severity/snapshot)는 roadmap이 명시 제외(211-212).
- **release-plan no change — 타당.** archive/pre-validation은 npm packaging(B1/B2/G6) 항목을 추가하지 않는다.
- **architecture/decision/W10 classification only — 타당.** archive 5개의 compose schema·adapter compile·instruction layering·capability isolation·sandbox·transport/identity/policy·Docker/mesh/actor 비교는 internal structure/WHY claim이지 W9 release owner claim이 아니다. 분류만 하고 수정 안 함이 owner 경계 준수.
- **source map W6 candidate only — 타당.** 이 draft는 candidate disposition만 공급, 표 미수정.

### 4. Source map candidates / Archive Gate review

- **§12 disposition** — draft "W9 §12 portion absorb→delete; whole row remains absorb→delete (W10/Archive Gate 후)". §11(Batch R)과 동일 패턴: §12 release portion은 roadmap이 흡수했으나 전체 파일 삭제는 §13(W10) + §12 stale-vs-live digest 결정에 의존. **타당.**
- **archive 5 disposition** — draft "보류 → likely absorb→delete or archive→delete (W10 확인 후)". [Fact] header가 "결정은 이미 aiox-a2a.md+history/58로 consolidated"라고 선언하므로 W9 release 보존가치는 없다. 잔여 WHY(compose schema 대안·sandbox 정직성·instruction layering·Docker/mesh/actor 판정)의 decision-worthiness는 W10 decision/architecture successor 자족성에 달려 있어 **보류가 정확**(logs/AGENTS.md Archive Gate: 보존가치+self-sufficiency 둘 다 충족 시에만 archive). 지금 확정하지 않은 것 옳다.
- **pre-validation 2 disposition** — draft "archive→delete? (W10 Archive Gate 후)". [Fact] 두 파일은 dated PASS trace(spike command·PASS count·Not Validated list)를 담고, 이는 roadmap/architecture 본문에 복사하기엔 너무 구체적이다(보존가치 High). 현행 owner 문서만으로 spike setup/evidence가 자족하지 않으므로 **삭제 전 logs digest 필요 = archive→delete** 방향이 Archive Gate에 부합. 최종 확정은 W10/log archive 소유 — 보류 적절.

### 5. owner-body 미수정 확인

이 Batch L producer/checker 과정에서 `docs/product/roadmap.md`·`plans/release-plan.md`·`prd/post-mvp/*`·`prd/pre-validation/*`·source map은 모두 수정하지 않았다(이 controlling log append만 수행). git 상태는 authority checker §4에서 확인한 것과 동일하게 owner doc diff 없음.

### 6. W5 종결 판정과 다음

PASS이므로:

- **W5는 "legacy must-check 흡수 판정 완료, no owner body apply"로 닫을 수 있다.** §12 release pressure는 roadmap에 이미 흡수, archive 5·pre-validation 2는 W9 release owner body 대상이 아니라 W10 handoff + Archive Gate 대상으로 분류됨.
- **W6 source map**: Batch R candidate(6) + Batch L candidate(8)를 결합해 기존 row append/update 가능하나, 대부분 disposition이 `keep / execution successor pending`(post-mvp/§11) 또는 `보류 (W10 확인 후)`(archive/pre-validation)·`absorb→delete (W10/Archive Gate 후)`(§12)라 **현 시점 finalize 불가**. 전략변경(2026-06-22)도 post-mvp rows는 log-only 유지 지시. 표 갱신은 draft disposition 반영 수준에서만, 최종 확정은 W10 후.
- **다음 결정 후보:** (i) W6 source map을 draft disposition 수준으로 append/update, (ii) W7 closeout(parent W4.5 W9 소비 반영 — 단 single-plan deferral·W10 미완이라 부분 closeout), (iii) 단일 plan 작성 시점 @user 확정. 셋 다 이 checker 범위 밖(controlling agent/@user 결정).

### 7. Explicit non-actions

- **owner 본문 수정 금지**: roadmap/release/spec(prd)/source map 본문 무변경 유지.
- **물리 삭제 금지**: archive 5·pre-validation 2·prd spec은 plan stage 물리 삭제 gate + W10 + @user 확인 전까지 보존.
- **Archive vs absorb 최종 확정 금지**: archive 5·pre-validation 2의 archive→delete vs absorb→delete 확정은 W10 successor 자족성 확인 후. 이 checker는 draft 판정만 verify.
- **history/ 편집·source-map history row 신설 금지**(W5 history owner).
- **W10 decision 승격 금지**: compose schema/sandbox/instruction layering rationale는 W10 decision screening 대상으로 분류만. 이 batch에서 `docs/decisions/`로 승격하지 않는다.

**Next:** W5 Batch L = checker PASS. Batch R(authority 정합) + Batch L 양쪽 checker가 PASS이므로, controlling agent는 (i) W6 source map draft disposition append, (ii) W7 closeout(parent W4.5 W9 부분 소비 + workflow retrospective), (iii) 단일 plan 작성 시점 @user 확정 중 다음 active를 @user와 정한다. 최종 disposition 확정·물리 삭제·archive digest 작성은 W10 + plan-stage 삭제 gate 소유.

## 2026-06-22 · 세션 정리 — W9 두 batch checker PASS, 단일 plan Obsidian/Atlas-gated, W6/W7 다음 세션

이번 세션 수행:

- **W3/W4 authority 정합** — Codex producer block(`docs/specs/aiox-a2a.md`·`docs/product/roadmap.md`·`plans/release-plan.md` 정합 점검)을 회수해 Claude checker가 cite를 세 owner 원문에서 재검증 → **PASS**. authority gap 없음, owner body 무변경(git 확인). checker block은 본 로그 `## 2026-06-22 · W3/W4 authority 정합 Claude checker — PASS`.
- **W5 Batch L** — Batch L Codex draft를 Claude checker가 cite 재검증 → **PASS**. §12 P1/P2 current-code 6건 src 확인(`/send` 무인증·`readJson` 무제한·socket dir chmod 부재·`:memory:`·per-socket error listener 부재·own-property 가드 부재), archive 5 header 비권위 선언 + pre-validation 2 dated PASS trace 확인. §12 release pressure는 roadmap 흡수됨, archive 5·pre-validation 2는 W10 handoff + Archive Gate 대상. checker block은 본 로그 `## 2026-06-22 · W5 Batch L Claude checker — PASS`.

@user 결정(2026-06-22):

- 단일 a2a plan 작성은 parent plan(`plans/workspace-reset/workspace-reset.md`)의 **Obsidian/Atlas stage 완료 후**로 deferred. 그때까지 `plans/post-mvp*` 보존. roadmap 147-152 sub-plan 링크 repoint·post-mvp 물리 삭제·source map 최종 disposition 확정 모두 그 후.
- 남은 작업(W6 source map draft append·W7 closeout)은 **다음 세션** 진행.

Work Items 전이:

- W4(Open Issue roadmap gate 확인)·W5(Batch L 흡수 판정) **완료**.
- W3는 취소가 아니라 **보류** — 흡수/재편·단일 plan이 Obsidian/Atlas-gated라 open 유지. 선행조건이던 authority 정합 점검은 PASS.
- W6(source map draft append)를 다음 세션 재개 지점으로 둠. W7(closeout) open.

다음 세션 재개(W6부터):

- W6 = Batch R candidate(6) + Batch L candidate(8)를 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` source map의 기존 row에 **draft disposition으로 append**(새 표 금지). 대부분 `keep / execution successor pending`(post-mvp/§11)·`보류 (W10 확인 후)`(archive 5·pre-validation 2)·`absorb→delete (W10/Archive Gate 후)`(§12)라 **최종 확정 아님** — 전략변경상 post-mvp rows는 log-only 유지 가능.
- 이어 W7 = 부분 closeout. parent `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` W9 소비는 단일 plan(Obsidian/Atlas-gated)·W10 미완이라 **부분 반영**만(완전 종결 아님). workflow retrospective(portable 후보 → `logs/2026-06-18-package-workflow-portable-pattern.md`)도 W7에서.
- 최종 disposition 확정·물리 삭제·archive digest 작성은 W10 + plan-stage 물리 삭제 gate 소유.

status: **open 유지**(W3/W6/W7 incomplete).

## 2026-06-22 · W6 source map draft disposition append/update 완료

사용자 지시에 따라 subagent 사용 여부를 판단했고, 이번 W6는 **subagent 없이 controlling agent가 직접 수행**했다.
근거: W9 Batch R authority 정합과 Batch L legacy must-check가 이미 producer/checker로 PASS했고, W6는 새
분석이 아니라 별도 owner인 source map 표의 기존 row를 W9 결과에 맞춰 갱신하는 좁은 장부 작업이다.

수행한 일:

- `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`의 기존 source map row만 갱신했다. 새 표를
  만들지 않았다.
- `prd/post-mvp/aiox-a2a-spec.md` row:
  - [Fact] W8 §2-§9 protocol successor PASS, W9 §12 release pressure는 roadmap Pre-Release Gap Summary+gates에 흡수.
  - [Fact] W9 전략변경상 §11/plan execution detail은 단일 plan successor pending.
  - disposition은 `keep / W10 + execution successor pending; W9 §12 release portion absorbed, final disposition after W10/Archive Gate`로 남겼다.
- `plans/post-mvp.plan.md` + sub-plan 4 rows:
  - [Fact] roadmap priority/mapping은 W9 PASS.
  - [Fact] 단일 A2A execution plan은 Obsidian/Atlas stage 이후로 deferred.
  - disposition은 모두 `keep / execution successor pending (single plan 후 disposition 재판정)`으로 남겼다.
- `prd/post-mvp/archive/*` 5 rows:
  - [Fact] W9 release/roadmap body apply 대상 아님.
  - [Inference] W10 architecture/decision successor self-sufficiency와 Archive Gate 후 `absorb→delete` 또는 `archive→delete`를 확정해야 한다.
  - 삭제 전 `keep` 조건을 명시했다.
- `prd/pre-validation/*` 2 rows:
  - [Fact] W9 release body apply 대상 아님.
  - [Inference] spike trace는 owner 문서만으로 self-contained하지 않아 W10 Archive Gate에서 logs digest 필요 방향.
  - `archive→delete? (W10 Archive Gate 후; 최종 확정 전 keep)`로 남겼다.

검증:

- source map 기존 표의 대상 14개 row만 수정했다.
- owner 문서(`docs/specs/aiox-a2a.md`, `docs/product/roadmap.md`, `plans/release-plan.md`)와 legacy 원본 파일은 수정하지 않았다.
- 물리 삭제, 단일 plan 생성, roadmap 147-152 repoint, final disposition 확정은 하지 않았다.

다음:

- W7 closeout & parent 반영으로 진행한다.
- W7에서는 W10 입력용 Legacy/Historical Source Handoff를 정제하고, W9 부분 closeout/parent W4.5 소비 반영안과 workflow retrospective를 작성한다. Claude checker review PASS 전까지 parent W9 소비·status 전이·물리 삭제는 확정하지 않는다.

## 2026-06-22 · W7 closeout Codex producer draft — W10 handoff, parent 반영안, workflow retrospective

이 블록은 W7 Closeout & parent 반영의 **Codex producer draft**다. Claude checker review 전까지
parent W4.5 소비, 이 package status 전이, source map final disposition, 단일 plan 생성, roadmap link
repoint, `plans/post-mvp*` 삭제, legacy 물리 삭제는 확정하지 않는다.

### Closeout draft

- Updated owner documents:
  - `docs/product/roadmap.md`, `plans/release-plan.md`, `docs/specs/aiox-a2a.md` owner body 변경 없음.
  - `plans/post-mvp*` 재편/삭제 없음. 단일 A2A execution plan은 @user 결정에 따라 parent plan의
    Obsidian/Atlas stage 완료 후로 deferred.
  - `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` 기존 source map row 14개에 W9 draft
    disposition/self-sufficiency만 반영. final disposition은 확정하지 않음.
- Validation result:
  - W3/W4 authority 정합: Claude checker PASS. spec/roadmap/release 세 owner는 local stable A2A
    round trip의 owner authority 수준에서 상호 정합하며 authority gap 없음 / no owner body apply.
  - W5 legacy must-check: Claude checker PASS. §12 release pressure는 roadmap Pre-Release Gap
    Summary+gates에 흡수됨. archive 5·pre-validation 2는 W9 release owner body 대상이 아니라
    W10 architecture/decision handoff + Archive Gate 대상.
  - W6 source map: 기존 row만 갱신했고 새 표, history row, owner body, legacy 원본, physical delete,
    roadmap repoint, final disposition 없음.
- Remaining gaps:
  - W3 plans/post-mvp 흡수/재편은 취소가 아니라 deferred. 단일 A2A execution plan successor가 생긴 뒤
    roadmap 147-152 repoint, `plans/post-mvp*` deletion readiness, source map final disposition을 재판정한다.
  - `prd/post-mvp/aiox-a2a-spec.md` 전체 삭제 self-sufficiency는 W10 §13 split + §12 Archive Gate 후 판정.
  - archive 5·pre-validation 2는 W10이 architecture/decision successor self-sufficiency와 Archive Gate를
    파일별로 적용해야 한다.
  - `docs/product/AGENTS.md` 부재는 W9 scope 밖 관찰로만 남김. 이 package에서 신규 작성하지 않음.
- Workflow retrospective:
  - W9 회고 후보 F51~F55를 `logs/2026-06-18-package-workflow-portable-pattern.md`에 draft collection으로
    추가했다. 이 package에서는 source-map consumer binding, authority gap vs execution successor gap,
    deferred disposition 표현, source-map bookkeeping 범위, partial parent closeout을 구분한 점이 핵심이다.
- Next owner/log:
  - Claude checker PASS 후에만 parent `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` W9
    소비 반영을 수행한다.
  - PASS 후 parent W9는 완전 완료가 아니라 "W9 release/roadmap authority assimilation consumed; W10 split
    readiness로 전이; single-plan/post-mvp deletion은 Obsidian/Atlas 이후 별도"로 부분 소비해야 한다.
  - 다음 primary package는 parent W10 split readiness and map package다. W10은 이 로그의 handoff와
    `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`를 required-read로 삼아야 한다.

### Legacy/Historical Source Handoff To W10 / Physical Delete Gate — W9 정제본

Deletion is not executed here. Every deletion candidate still requires owner/archive successor
self-sufficiency, inbound/reference cleanup where relevant, and user confirmation at the physical deletion gate.

| Source group | W8 consumed | W9 consumed | W10 must check | Physical delete gate |
| --- | --- | --- | --- | --- |
| `history/58-post-mvp-a2a-architecture-decisions.history.md` | §4 lifecycle WHY는 `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`로 승격. | W9는 `history/` row를 만들거나 편집하지 않음. roadmap/release 직접 입력으로 추가 소비 없음. | Remaining compose/capability/federation/product/architecture rationale and live inbound refs. W5 history migration owner와 충돌하지 않게 확인. | W5 history migration owner decides deletion; no duplicate source-map row. |
| `prd/post-mvp/aiox-a2a-spec.md` | §2-§9 protocol contract self-contained in `docs/specs/aiox-a2a.md`; source map row updated by W8. | §11 release gate/phase authority는 roadmap에 충분히 있음. §12 release pressure는 roadmap Pre-Release Gap Summary+gates에 흡수됨. §11/plan execution detail은 단일 plan successor pending. | §13 product/architecture/decision rationale, §12 stale-vs-live digest 필요 여부, whole-file self-sufficiency. | Delete only after W9+W10 successor self-sufficiency and §12 Archive Gate decision. |
| `prd/post-mvp/archive/*` 5 files | Only `claude-codex-validation.md` §4 lifecycle WHY partially used as decision support. | W9 checker PASS: release/roadmap body apply 대상 아님. product definition, remote expansion, compose sequencing, packaging/release pressure는 roadmap Phase/Gate 또는 Batch R candidates로 충분하거나 W10 성격. | Docker/compose/adapter/capability brainstorm, services-vs-agents schema, non-mutation, adapter compile, instruction layering, sandbox-overclaim, transport/identity/policy rationale. Apply Archive Gate file-by-file. | `absorb→delete` or `archive→delete` only after per-file self-sufficiency; keep before final gate. |
| `prd/pre-validation/*` 2 files | W8 verified DB/current gap from code, not from pre-validation successor absorption. | W9 checker PASS: no new release body apply. G1 trust/reliability risk context and Phase 2 durable-store boundary are represented in roadmap. | Apply Archive Gate. Spike setup/results/PASS counts/not-validated list likely need logs digest if sources are deleted. | No deletion before Archive Gate/self-sufficiency; likely `archive→delete?` pending W10. |
| `plans/post-mvp.plan.md` + `plans/post-mvp/*.plan.md` | Not consumed by W8 except as handoff inputs. | W9 verified roadmap priority/mapping and authority alignment. 단일 A2A execution plan은 Obsidian/Atlas 이후로 deferred, so all rows remain `keep / execution successor pending`. | Any plan rationale that belongs to split/architecture/decision after W9; async-petting-hoare operational line remains excluded from deletion/absorption in this package. | Delete/repoint only after single plan successor exists, W10/physical gate confirms self-sufficiency, and user approves. |
| `docs/aiox/mcp-scope-and-daemon-namespace.md` | Runtime MCP/channel projection + profile/socket namespace absorbed into spec §3.1/§5/§7; source map row updated by W8. | No W9 consumption. | Stale header/link cleanup (`mvp-architecture` rename drift) and inbound refs. | Candidate `absorb→delete` after W10 cleanup and physical gate. |
| `docs/aiox/industry-precedents-and-observability-models.md` | Not consumed as current external fact; time-sensitive external facts were not promoted. | No W9 consumption. | Opaque Worker / delivery-vs-completion rationale. Reverify external/current claims before using as current owner text. | Decision/archive/delete after W10 and any needed current-source revalidation. |
| `docs/aiox/observation-asymmetry-and-d7-pivot.md` | Not consumed by W8 except as known decision-candidate group. | No W9 consumption. | D7/proxy authority rationale and possible decision promotion. | W10 decides successor or archive. |
| `docs/aiox/proxy-vs-app-server-tradeoff.md` | Not consumed by W8. | No W9 consumption. | Whether existing decisions cover app-server + proxy hybrid WHY or need integrated decision. | W10 decides. |
| `docs/aiox/step-14-codex-mcp-remote-architecture-bug.md` | Not consumed by W8. | No W9 consumption. | App-server-owned MCP injection nuance vs existing process-scoped MCP decision. | W10 decides. |
| Other `docs/aiox/*` | Only rows explicitly noted above have W8 absorption. | No W9 consumption unless future roadmap/release work discovers direct dependency. | Architecture learning/stale/test traces; owner self-sufficiency, dead links, decision candidates. | W10 + physical gate. |
| `history/59` | Not consumed by W8. | Not consumed by W9. | Required W10 split readiness input. | W5 history owner + W10 handoff. |

### Parent W4.5 W9 consumption draft

Claude checker가 이 W7 draft를 PASS하면 parent W4.5에 다음 의미만 반영한다:

- W9 child package는 release/roadmap authority assimilation을 완료했다.
- W9-1: @user 결정으로 기존 roadmap priority 유지. `docs/product/roadmap.md` 대규모 재작성 없음.
- W9-2: spec/roadmap/release authority gap 없음, owner body apply 없음. Batch L도 no owner body apply.
- W9-2a: task brief 2개(`logs/W9-R-task.md`, `logs/W9-L-task.md`) 작성·사용 완료.
- W9-3: workflow retrospective F51~F55를 portable pattern 로그에 누적.
- parent W9 하위 항목 중 "plans/post-mvp 흡수/재편"은 완료가 아니라 deferred로 남긴다. 단일 plan 작성과
  roadmap repoint/delete/final disposition은 Obsidian/Atlas stage 이후 future single-plan stage가 소유한다.
- parent next pointer는 W10으로 전이하되, W10 required-read에 이 W9 closeout handoff와 legacy source map을
  명시한다.

PASS 전에는 위 parent 반영안을 적용하지 않는다. checker가 변경 요청하면 이 draft를 먼저 수정한다.

### Claude checker review request

Claude checker는 다음을 원문/source-map 기준으로 재검증한다:

1. W9 Closeout draft가 W3/W4 authority checker PASS, W5 Batch L checker PASS, W6 source-map update 내용을
   정확히 요약하고 owner body/no-action 제약을 지키는지.
2. Legacy/Historical Source Handoff가 W8 consumed / W9 consumed / W10 must check / physical delete gate를
   잘못 섞지 않는지. 특히 `history/58` W5 ownership, `prd/post-mvp/aiox-a2a-spec.md` §13, archive 5,
   pre-validation 2, `plans/post-mvp*`의 `keep / execution successor pending`을 확인한다.
3. Parent W4.5 반영안이 W9를 과도하게 완료 처리하지 않고, 단일 plan·post-mvp 삭제·final disposition
   deferred 조건을 보존하는지.
4. `logs/2026-06-18-package-workflow-portable-pattern.md` F51~F55가 repo-specific 판단과 portable 후보를
   구분하고 과도하게 일반화하지 않는지.
5. 이 producer draft 과정에서 parent, owner body, legacy 원본, physical delete, source-map final
   disposition을 확정하지 않았는지.

**Next if PASS:** controlling agent가 W7을 accepted로 처리하고, parent W4.5 W9 소비 반영 + W10 전이
초안을 적용한다. `status: decided` 전환 여부는 W3 deferred와 parent/W10 handoff 정합성을 함께 점검한 뒤
판단한다.

**Next if changes requested:** W7을 active로 유지하고 이 draft를 patch한다. parent/status/source-map final
disposition은 계속 보류한다.

## 2026-06-22 · W7 closeout Claude checker review — PASS (+ parent plan 편집, W3 이관)

이 블록은 위 `## 2026-06-22 · W7 closeout Codex producer draft`에 대한 **Claude checker** 결과다.
closeout 5필드·Legacy/Historical Source Handoff·parent 반영안·F51~F55를 보고가 아니라 원문(controlling
log의 W3/W4·W5 checker 블록·W6 블록), source map, parent W4.5, portable 로그, git으로 직접 재검증했다.

### 1. Overall verdict: PASS (5/5)

| Review item | Verdict | 재검증 근거 |
| ----------- | ------- | ---------- |
| 1. Closeout draft가 W3/W4·W5 checker PASS·W6 update를 정확 요약하고 no-action 제약 준수 | PASS | Validation result(본 로그 631-644)가 W3/W4 PASS·W5 Batch L PASS·W6 row-only update 블록과 일치 |
| 2. Legacy handoff가 W8 consumed / W9 consumed / W10 must check / physical delete gate를 안 섞음 | PASS (+갱신) | W8 버전(W8 로그 1315-1328) 대비 "W9 must check"→"W9 consumed" 정정·12 row 정합. history/58 W5 owner·spec §13 W10·archive 5/pre-val 2 W10 Archive Gate·plans/post-mvp* keep/pending 정확. plans/post-mvp* 행 owner는 §2 갱신 |
| 3. Parent 반영안이 W9 과도 완료 처리 안 하고 deferred 보존 | PASS (+갱신) | parent 반영안(684-698)이 single-plan/post-mvp 삭제/final disposition deferred 보존. "future single-plan stage"를 §2의 구체 parent stage + W3 이관으로 갱신 |
| 4. F51~F55가 repo-specific와 portable 구분, 과일반화 없음 | PASS | F51(authority gap vs execution successor gap)·F52(deferred=keep/pending)·F53(optional traceability≠apply)·F54(bookkeeping≠new analysis)·F55(partial parent closeout vocabulary) 전부 Portable candidate 분류 + repo note 분리 |
| 5. producer draft가 parent/owner body/legacy/physical delete/source-map final 미확정 | PASS (git 검증) | git: Codex W7 세션은 W9 로그(untracked)+portable 로그만 변경. parent W9 여전히 `[>]`·2026-06-22 소비 블록 없음, source map 최신 블록=W6, owner docs/post-mvp diff 없음 |

### 2. Draft 이후 @user 결정으로 인한 bookkeeping 갱신 2건 (Codex draft 결함 아님)

Codex는 아래 두 @user 결정 **전에** draft를 저작했다. F54(accepted-result bookkeeping은 좁은 직접 수정
가능)에 따라 controlling agent가 직접 반영했고, Codex draft 블록은 provenance 보존을 위해 재작성하지 않았다.

1. **Parent plan 편집(@user 승인)**: `plans/workspace-reset/workspace-reset.md`에 (A) Obsidian/Atlas
   stage 후 `plans/post-mvp*` 삭제 disposition 단계 신설(단일 A2A plan successor 작성 → roadmap 147-152
   repoint → post-mvp 물리 삭제 → source map 최종 disposition), (B) 기존 물리삭제게이트에서 `plans/post-mvp*`
   제외 명시, 단계 수 9→10. → deferred execution의 owner가 plans/(stage 순서 owner)로 정상화. Legacy
   handoff의 `plans/post-mvp.plan.md`+sub-plan 4 행 physical-delete-gate 의미 = **이 parent plan 단계가
   소유**(W10이 직접 삭제 소유하지 않음). async-petting-hoare 운영 라인 별도 보존도 그 단계에 명시됨.
2. **W3 이관(@user 제안)**: parent plan 단계가 execution을 소유하므로 W9 W3는 `[ ]` 보류 → `[x]`
   **이관완료**로 전이. 취소 아님(작업은 parent plan 단계가 수행). 이로써 Codex가 line 717에서 flag한
   "status: decided는 W3 deferred와 함께 점검" blocker가 해소됨 — W9에 open-deferred item이 없어짐.

### 3. 남은 @user-gated milestone (이번 turn 미수행)

checker PASS이지만 아래 비가역 단계는 @user 확인 후 별도 수행한다(F27 원자적 복귀 계약):

- W9 child `status: open` → `decided`, W7 `[>]` → `[x]`.
- parent `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` W9 부분 소비 블록 추가
  (consumed: authority 정합/no owner body apply; transferred: post-mvp execution → parent plan 단계;
  W10 split readiness 전이) + parent W9 `[>]`→`[x]`.
- W10 split readiness package 착수(required-read: 이 W9 closeout handoff + legacy source map).

owner body·legacy 원본·물리 삭제·source map final disposition은 이번에도 무변경.

**Next:** @user가 status 전이 + parent 소비를 승인하면 controlling agent가 원자적으로 적용한다. 그
전까지 W7 `[>]` 유지(checker accepted).

## 2026-06-22 · W7 accepted · W9 package closeout — status decided, parent 소비, W10 전이

@user 확인으로 F27 원자적 복귀 계약을 실행했다.

- child W7 `[>]` → `[x]`, child frontmatter `status: open` → `decided`.
- parent `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` W9 `[>]` → `[x]`로 부분 소비 블록 추가, parent next pointer를 W10 split readiness로 전이.
- parent plan `plans/workspace-reset/workspace-reset.md`에 post-Atlas `plans/post-mvp*` 삭제 disposition 단계 신설(W3 execution 이관 owner) + 물리삭제게이트 post-mvp 제외.

**소비된 것 (W9 결과):**

- authority 정합: spec/roadmap/release가 local stable A2A round trip authority를 충분히 소유, authority gap 없음, owner body apply 없음(Batch R+L 양 checker PASS).
- W6 source map: 14 row draft disposition 갱신(canonical 표, 새 표 없음).
- portable: 회고 F51~F55 누적(W11 라인).

**이관/deferred (W9에서 확정 안 함):**

- post-mvp execution(단일 A2A plan 작성·roadmap 147-152 repoint·`plans/post-mvp*` 물리 삭제·source map final disposition) → parent plan post-Atlas 단계 소유(Obsidian/Atlas-gated).
- `prd/post-mvp/aiox-a2a-spec.md` §13·archive 5·pre-validation 2 self-sufficiency + Archive Gate → W10.

**무변경 유지:** owner body(spec/roadmap/release), legacy 원본, 물리 삭제, source map final disposition.

**Next:** parent W10 split readiness and map package. W10 entry 시 Scope.Primary owner를 @user와 확정한다(parent W10 item 규칙: 단일 primary owner 없음). required-read = 이 W9 closeout Legacy/Historical Source Handoff + `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` + W5 history migration source map.
