---
topic: workspace reset W8 A2A spec authority assimilation
description: workspace reset W8 — docs/specs/aiox-a2a.md를 protocol contract owner로 자립시키는 authority assimilation package. legacy source(prd post-mvp/mvp a2a-spec, docs/aiox, pre-validation, history/58)를 owner별로 분류 흡수하고 §11-§13은 roadmap/decision/architecture로 handoff한다
status: open
---

## Work Items

- [x] W1 Batch task brief 작성 — A0/A1/B/C/Sweep 5개 batch task brief를 `logs/AGENTS.md` Task Brief Template로 작성한다. Falsifiability gate와 Ledger-먼저-본문-나중 6-phase를 완료 조건에 명시하고, workflow retrospective와 `logs/2026-06-18-package-workflow-portable-pattern.md` 기록 지시를 포함한다.
- [x] W2 Batch A0 — config/runtime contract: post-mvp §0–§1에서 spec 흡수할 정의/현재 snapshot + `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` absolute override·relative fail-fast gap. Evidence Ledger만 작성(spec 본문 미수정).
- [x] W3 Batch A1 — protocol core: current spec §2 Glossary, §3 Layer model, §4.1–4.5 envelope/routing/delivery/error/persistence. Evidence Ledger만 작성.
- [x] W4 Batch B — adapter & compose: §5 Adapter(4-slot+capability tier), §6 Compose. Evidence Ledger만 작성.
- [x] W5 Batch C — capability/federation/deferred: §7 Capability·sandbox, §8 Federation/remote, §9 Open/deferred. Evidence Ledger만 작성.
- [x] W6 Sweep — §10–§13 owner 분류: spec 본문에 복사하지 않고 §11 roadmap·§12 blocker → roadmap/release(W9), §13 decision 후보 → spec contract 고정 rationale만 docs/decisions/ 승격·나머지는 architecture/W10 handoff. 분류 결과를 Evidence Ledger와 Cross-Owner Effects에 남긴다.
- [x] W7 Cite spot-check & 본문 반영 **(Codex 저작 → Claude checker review)**: Codex가 batch별 spec 본문 변경을 draft하고 `src/file:line`+test cite를 제시한다. Claude(checker)가 각 row를 `src/`로 full cite 재검증하고 리뷰 pass분만 수용한다. Claude review PASS 전까지 draft는 확정 spec 사실로 보지 않는다. **완료(2026-06-21): pending queue 3개(Batch C §7-§9, §4.5+intro §10-§13, §4 decision 후보) 전부 Claude review. 본문 단위(§3.1·§4.2·§4.5·§5·§6·§7·§8·§9·intro §10-§13) 모두 PASS 확정, §4.3는 target-framed로 caveat 불필요. §4 decision 승격은 W8로 이관. 상세=최하단 "W7 Claude review — pending queue 전체 PASS" 블록.**
- [>] W8 Disposition append **(Codex 저작 → Claude checker review)**: Codex가 흡수한 source 파일의 disposition·self-sufficiency 검증을 batch별로 draft하고 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` source map append/update안을 제시한다. Claude(checker)가 각 row를 legacy source, successor owner 문서, W7/W9/W10 handoff와 대조해 full cite 재검증하고 리뷰 pass분만 source map에 수용한다. PASS 전까지 source map disposition은 확정하지 않는다. **W8에는 W7 리뷰에서 이관된 §4 lifecycle/correlation decision 저작도 포함된다(구속 조건 2건: correlated reply 인가 Open 유지, public deliveryId Target/Open 유지).**
- [ ] W9 Closeout & parent 반영 **(Codex 저작 closeout → Claude checker review)**: Codex가 split map(W10 입력), workflow retrospective, parent `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` W8 소비 반영안을 draft한다. Claude review PASS 전까지 parent W8 소비와 package closeout은 확정하지 않는다.
- [x] W11 Codex task brief 리뷰 확인 및 반영 — 5개 batch task brief(W8-A0/A1/B/C/Sweep) + package log를 Codex가 리뷰. 결과 반영 후 W2부터 Phase 3 batch dispatch(내 subagent) 착수. 실행은 다음 세션.

### Scope

- Primary owner: `docs/specs/aiox-a2a.md` (A2A protocol contract authority).
- Allowed cross-owner updates:
  - `docs/decisions/` — spec contract를 직접 고정하는 rationale의 신규 decision 문서 생성(선별 승격).
  - `docs/architecture/local-agent-runtime.md` — spec 정합 중 stale reference 발견 시 최소 패치(W7에서 이미 정합됨).
  - **Phase 3 constraint:** 위 Allowed cross-owner updates는 controlling cite spot-check 이후 **W7 apply phase 전용**이다. Phase 3 batch agent는 `docs/specs/`·`docs/decisions/`·`docs/architecture/`를 포함한 어떤 owner 문서도 수정하지 않는다(decision 파일 생성 포함). Phase 3 산출물은 Evidence Ledger·Decision Candidates·Cross-Owner Effects·source-map append candidate로 제한한다.
- Cross-Owner Effects only (수정 금지, 분류·handoff만):
  - `docs/product/roadmap.md`, `plans/release-plan.md` — §11 roadmap/§12 blocker에서 넘어갈 row를 Evidence Ledger/Cross-Owner Effects에 기록하고 W9가 소비한다.
- Evidence inputs:
  - Primary: `docs/specs/aiox-a2a.md` (692줄, §2–§9).
  - Target Contract Input: `prd/post-mvp/aiox-a2a-spec.md` (1188줄, §0–§13 monolith).
  - Legacy spec source: `prd/mvp/aiox-mvp-spec.md`, `docs/aiox/mcp-scope-and-daemon-namespace.md`, 기타 `docs/aiox/*`.
  - Evidence: `prd/pre-validation/claude-codex-pre-validation.md`, `prd/pre-validation/sqlite-restart-recovery-pre-validation.md`, `history/58-post-mvp-a2a-architecture-decisions.history.md`.
  - 현재 구현 1차 사실: `src/`(core/store/adapters/daemon/config), `tests/`.
  - 규칙: `logs/AGENTS.md` (Legacy Source Absorption Map, Package Preparation, 상태 라벨), `docs/specs/AGENTS.md`, `docs/decisions/AGENTS.md`.
  - 제약 입력: `logs/2026-06-19-workspace-reset-W5-history-migration.md` (delete guard, target self-sufficiency, physical deletion gate), `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` (source map).

### Evidence Ledger

| Topic | Source | Lines | Finding | Owner impact | Action |
| ----- | ------ | ----- | ------- | ------------ | ------ |
| Primary owner 현재 구조 | `docs/specs/aiox-a2a.md` | §2–§9 (헤더 1·40·67·78·83·151·167·229·248·333·410·478·526·569·584·636) | [Fact] 현재 spec은 §2 Glossary~§9 Open/deferred의 protocol contract만 소유. roadmap/blocker/decision 섹션 없음. | W8 흡수 후에도 contract owner로 자립해야 함 | batch A1/B/C가 섹션별 검증 |
| Target Contract Input 범위 | `prd/post-mvp/aiox-a2a-spec.md` | §0–§13 (1188줄) | [Fact] §0 정의·§1 멘탈모델/아키텍처/snapshot·§2–§9 protocol·§10 은유·§11 release roadmap·§12 공개전 결함·§13 조사판정/rationale이 한 파일에 섞임 | §11–§13은 spec 본문이 아니라 roadmap/decision/architecture owner | Sweep(W6)이 owner 분류 |
| W5 B2 spec gap | `docs/specs/aiox-a2a.md`, `README.md`, `src/config/paths.ts` | specs 577-582·590-605; README 65-67; paths 65-75·88-96·104-116 | [Fact] profile namespace는 spec에 있으나 `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` absolute override + relative fail-fast contract는 spec에 부재. README/code엔 존재 | spec contract gap | batch A0가 흡수 여부 판정 |

### Decision Candidates

| Source | Lines | Why decision-worthy | Proposed decision | Status |
| ------ | ----- | ------------------- | ----------------- | ------ |
| (batch 실행 중 발견분 기록) | | | | |

### Cross-Owner Effects

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |
| (batch 실행 중 발견분 기록) | | | | |

### Closeout

- Updated owner documents:
- Validation result:
- Remaining gaps:
- Workflow retrospective:
- Next owner/log:

## 2026-06-21 · package log 생성과 W8-0 의견 수렴 결과

Parent pointer: `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` W8

이 로그는 parent W4.5의 W8 A2A spec authority assimilation package다. parent W8은 이 child
package log의 결과를 소비한다. 이전 W8 실행 산출물은 2026-06-20 parent 블록에서 폐기됐고,
이 package는 재시작 지점에서 새로 시작한다.

**W8-0 agent 의견 수렴 결과 (claude 종합 + @user + @codex):**

- **A0/A1 분리 확정.** `AIOX_SOCKET_PATH`/`AIOX_DB_PATH`는 protocol lifecycle이 아니라
  runtime/config contract라, §4 protocol 검증과 섞으면 evidence 범위가 커진다. 따라서
  A0(config/runtime gap)과 A1(§2–§4 protocol core)을 분리한다.
- **Falsifiability gate 확정.** `Current Contract`로 쓰려면 `src/file:line` + 가능하면 test
  cite가 있어야 한다. cite가 없으면 `Target Contract`/`Proposed Contract`/`Open Issue`/
  `Implementation Gap` 중 하나로 강등한다. 이 규칙으로 "그럴듯한 추론"이 spec 사실로
  흡수되는 경로를 차단한다. (W7-B* 검증 불안에 대한 구조적 대응)
- **Ledger-먼저-본문-나중 (6-phase) 확정.** batch agent는 `docs/specs/aiox-a2a.md`를 직접
  수정하지 않는다. Phase 1 package log → Phase 2 task brief → Phase 3 batch별 Evidence
  Ledger만 → Phase 4 controlling cite spot-check → Phase 5 pass 후 본문 반영 → Phase 6
  §10–§13 sweep handoff. 잘못된 흡수가 본문에 박히기 전에 차단하고, 컨텍스트 비용을
  batch별 ledger + 표적 검증으로 통제한다.
- **상태 라벨은 repo 정확한 이름 사용.** spec: `Current Contract`/`Target Contract`/
  `Proposed Contract`/`Deferred`/`Open Issue`/`Implementation Gap`/`Pre-implementation
  Blocker`. legacy source: `Stale`. roadmap: `Release Gate`/`Execution Plan`. `Post-MVP`는
  상태 라벨이 아니라 출처/시점 힌트다.
- **§13 decision 후보는 선별 승격.** W8에서 승격할 것은 spec 본문 변경의 *이유*가 되는
  결정뿐이다(예: message lifecycle의 type/intent/reply_expected, deliveryId, source-only
  reply routing, recipient_visibility defer, capability projection 원칙처럼 §4–§7 contract를
  직접 고정하는 것). state.ts god factory, DX logging, product boundary, external
  precedents, vendor 확장 지침은 W8에서 분류만 하고 W9/W10 또는 architecture/decision으로
  handoff한다.
  - [Inference] absorption map W4의 decision 후보 5건(industry-precedents, observation-
    asymmetry/D7, §13.2 아키텍처 부채 3축, step-14 mcp bug, proxy-vs-app-server)은 대부분
    architecture/product 성격이라 W8(spec) package의 직접 승격 대상이 아니라 분류·handoff
    대상이다. W8이 새로 승격할 decision은 §4–§7 contract를 고정하는 다른 것들이다.

**다음:** W1 — A0/A1/B/C/Sweep batch task brief를 작성한다.

## 2026-06-21 · W1 완료 — 5개 batch task brief 작성 (Phase 2)

`logs/AGENTS.md` Task Brief Template로 5개 batch task brief를 작성했다. 명명은 W7 규칙
(`logs/W*-task.md`)을 따랐다.

- `logs/W8-A0-task.md` — config/runtime contract (post-mvp §0–§1 흡수분 + `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` gap)
- `logs/W8-A1-task.md` — protocol core (§2 Glossary, §3 Layer, §4.1–4.5)
- `logs/W8-B-task.md` — adapter & compose (§5, §6)
- `logs/W8-C-task.md` — capability/federation/deferred (§7, §8, §9)
- `logs/W8-Sweep-task.md` — §10–§13 owner 분류 (spec 본문 복사 금지)

**task brief에 박은 핵심 규칙:**

- 모든 batch에 **Falsifiability gate** 완료 조건: `Current Contract`는 `src/file:line`(+가능하면 test) cite 없으면 강등.
- 모든 batch에 **spec 본문 미수정** 완료 조건: Evidence Ledger만 controlling log에 기록(본문 반영은 W7).
- batch별 정확한 `src/`·`tests/` 진입점을 매핑해 batch agent 컨텍스트 비용을 줄였다.
- workflow retrospective + `logs/2026-06-18-package-workflow-portable-pattern.md` 기록 지시 포함.

**작성 중 확인한 사실 (task brief 판정 질문으로 반영):**

- [Fact] `src/`에 `compose.*`·`federation.*`·`remote.*` 파일이 없다(`find src -name '*.ts'` 결과). → batch B의 §6 Compose, batch C의 §8 Federation은 Current 구현 부재 가능성이 높아 각 task brief의 핵심 판정 질문(Current vs Target/Deferred)으로 박았다. batch agent는 `rg -i`로 내재 구현 여부를 src에서 직접 확인한다.

**남은 판단 — Phase 3 실행 방식:** batch 실행(Phase 3)은 컨텍스트 비용이 드는 단계다. subagent
dispatch 여부와 방식(controlling agent의 subagent vs 사용자 주도 외부 agent)은 사용자 확인 후
정한다.

**다음:** W2 — Batch A0 실행(`logs/W8-A0-task.md`). 단 Phase 3 실행 방식 확정 후 착수.

## 2026-06-21 · Phase 3 실행 방식 결정 — subagent dispatch + Codex 리뷰 게이트 + 다음 세션

@user 결정:

- Phase 3 batch 실행은 **옵션 1(controlling agent가 subagent로 dispatch)**로 한다. 각 batch
  task brief를 subagent에 넘겨 Evidence Ledger만 회수하고, controlling agent가 cite
  spot-check만 수행한다.
- 단 dispatch 전에 **Codex가 5개 task brief + package log를 리뷰**한다. 리뷰 결과를 반영한
  뒤 batch를 dispatch한다.
- **실제 batch 실행은 다음 세션**에서 한다.

**처리:**

- W2(Batch A0)를 active에서 내리고, 새 active Work Item W11을 추가했다: Codex task brief 리뷰
  확인 및 반영 → 그 뒤 W2부터 dispatch. 다음 세션 onramp의 재개 지점이 W11이 된다.
- 이번 세션 산출물은 W8 package log + 5개 task brief(Phase 1·2)까지다. Phase 3 이후는
  다음 세션.

**다음 세션 재개 지점:** W11 — Codex의 task brief 리뷰 결과를 확인·반영한 뒤, W2(Batch A0)부터
subagent로 Phase 3를 dispatch한다.

## 2026-06-21 · W11 완료 — Codex/Claude task brief 리뷰 반영

@claude의 F41~F43 리뷰와 @codex의 W8 task brief 리뷰를 종합해 dispatch 전 task brief를 보강했다.

**반영한 공통 gate:**

- Phase 3 batch agent는 `docs/specs/`, `docs/decisions/`, `docs/architecture/`,
  roadmap/release 등 어떤 owner 문서도 수정하지 않는다. 산출물은 Evidence Ledger, Decision
  Candidates, Cross-Owner Effects, Source Map append candidates, Open Questions로 제한했다.
- Claim provenance gate를 모든 batch에 추가했다. 각 claim은 `verified fact`, `inference`,
  `opinion-proposal`, `current implementation`, `target contract/structure`, `bug fix`,
  `improvement`, `stale-drift reference` 중 하나 이상으로 분류한다.
- Handoff/legacy `file:line`은 출발점일 뿐이며 최종 source에서 재확인해야 한다. 재확인하지 못한
  line은 `unverified - regrep required`로 낮춘다.
- Evidence Ledger row의 `Action`에는 `owner body apply candidate`, `no owner body apply`,
  `needs verification` 중 하나를 명시하게 했다.
- 각 batch에 Source Map append candidates와 Open Questions 출력 섹션을 추가했다.

**batch별 반영:**

- `logs/W8-A0-task.md`: CLI/runtime path 전달 경로(`src/cli/parse.ts`,
  `src/cli/invocation.ts`)와 관련 tests(`tests/unit/cli/invocation.test.ts`,
  `tests/integration/daemon-client-split.test.ts`)를 추가했다.
- `logs/W8-A1-task.md`: adapter tool ingress/egress surface(`src/adapters/claude/channel-server.ts`,
  `src/adapters/codex/mcp-server.ts`), 실제 test 경로, `plans/post-mvp/envelope-metadata.plan.md`를
  추가했다. spec 라벨이 아닌 `Current gap` 표현은 `Current Contract`/`Target Contract`/
  `Implementation Gap` 판정으로 정리했다.
- `logs/W8-B-task.md`: "4-slot pair" 혼선을 제거하고 adapter 4-slot(launch/ingress/egress/identity)과
  pair 2-slot(`slot: "a"|"b"`) 검증을 분리했다.
- `logs/W8-C-task.md`, `logs/W8-Sweep-task.md`: 공통 gate와 Source Map/Open Questions 출력 조건을
  추가했다.
- `logs/2026-06-18-package-workflow-portable-pattern.md`: F41~F43에 F41↔F42 결합, handoff cite
  재도출, F43 cross-reference와 artifact별 라벨 일반화 후보를 반영했다.

**판단:**

- W11의 리뷰 확인·반영 목적은 완료됐다.
- 다음 재개 지점은 W2 Batch A0 dispatch다. Batch 실행은 여전히 Ledger-only Phase 3이며, 본문
  반영은 W7 cite spot-check 이후에만 수행한다.

## 2026-06-21 · Phase 3 producer 결정 변경 — subagent → Codex (cross-model 검증)

@user 결정: Phase 3 batch Evidence Ledger 작성(producer)을 controlling agent의 subagent가
아니라 **Codex**가 한다.

**이전 결정 (2026-06-21 Phase 3 실행 방식 결정 블록):** 옵션 1 = controlling agent(@claude)가
subagent로 batch를 dispatch하고 Evidence Ledger 회수.

**새 결정:** Codex가 4개 batch(A0/A1/B/C) task brief를 받아 producer로 Evidence Ledger를
작성한다. @claude는 회수한 Ledger를 controlling log에 통합하고 **cite spot-check(W7)** 를
cross-model로 수행한다(checker).

**변경 이유:**

- 이 package의 존재 이유는 falsifiability gate — "그럴듯한 추론이 spec 사실로 흡수되는 경로
  차단"(W8-0). gate는 producer→checker 독립성이 강할수록 잘 작동한다.
- subagent는 @claude와 **동일 모델**이라 같은 cite 착각을 공유할 위험이 있다. Codex producer +
  @claude checker는 **cross-model**이라 hallucinated cite 검출에 강하다.
- task brief는 이미 portable하게 작성됐고 W11에서 **Codex 리뷰를 거쳐** handoff 준비가 끝났다.

**수용한 trade-off:** 단일 세션 자동화(@claude가 dispatch→통합→spot-check를 한 흐름에서)를
포기한다. 대신 @user가 Codex를 4개 task brief(`logs/W8-A0/A1/B/C-task.md`)에 직접 돌려
Evidence Ledger를 산출하고, 그 결과가 controlling log로 돌아와 @claude의 cite spot-check를 받는다.

**불변 유지:** Phase 3는 여전히 Ledger-only다. producer(Codex 포함)는 어떤 owner 문서도
수정하지 않는다. spec 본문 반영은 W7 cite spot-check pass 이후에만 한다.

**재개 지점 불변:** active next pointer는 W2 Batch A0 그대로다. 바뀐 것은 *누가* producer인지
(subagent → Codex)이며, *무엇을/어디서*(Batch A0, Ledger-only)는 그대로다. Sweep(W6)은 §10–§13
분류로 성격이 달라 A0/A1/B/C 다음 단계로 분리한다.

## 2026-06-21 · W2-W5 완료 — producer 4개 batch Ledger 회수

@user 지시로 subagent 4개를 producer로 dispatch해 `logs/W8-A0-task.md`,
`logs/W8-A1-task.md`, `logs/W8-B-task.md`, `logs/W8-C-task.md`를 실행했다. 모든 producer는
owner 문서를 수정하지 않았다고 보고했고, 산출물은 Phase 3 Ledger-only 범위에 머물렀다.

**모델 정체 정정:** 2026-06-21 “Phase 3 producer 결정 변경” 블록의 의도는 Codex producer였다.
그러나 실제 dispatch artifact(`019ee8ad-...` subagent id)는 producer가 Codex인지 Claude인지
판별할 수 있는 모델 증거를 제공하지 않는다. 따라서 아래 producer 산출물은 **모델 정체 미검증
subagent producer 결과**로 취급한다. cross-model 독립성 근거는 W7에서 자동 성립한다고 보지 않고,
W7 checker가 `src/`·tests·owner 문서를 직접 재검증해야 한다.

- A0 producer: `019ee8ad-146b-7e31-a59a-e083e296b39d`
- A1 producer: `019ee8ad-1568-7390-bb14-214f2826f2d9`
- B producer: `019ee8ad-17b9-7a40-8c70-3c0b6ffe31a0`
- C producer: `019ee8ad-18df-7093-bbe8-a846b0a24b4d`

**Controlling 판단:** 아래 row는 producer 산출물의 통합본이다. 아직 W7 cite spot-check 전이므로
owner 본문에 반영된 사실이 아니다. `Current Contract` row는 producer 기준으로 `src/file:line`과
가능한 test cite가 제시됐다. W7에서 표적 재검증 후에만 spec 본문을 수정한다. 상단 canonical
`### Evidence Ledger` 표(초기 3 row)는 package kickoff 요약이고, W6/W7이 소비할 Phase 3 실제
Ledger는 이 날짜 블록의 batch별 table이다.

### Batch A0 Evidence Ledger — config/runtime

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |
| Runtime profile resolver | `src/config/paths.ts`, `tests/unit/config/paths.test.ts` | paths 15-37·40-55; test 14-52 | [Fact] `AIOX_PROFILE`은 `dev/build/release`를 선택하고 invalid value는 실패한다. fallback은 `.ts`=dev, `node_modules`=release, repo `dist`=build, 그 외 release다. | Current Contract; verified fact/current implementation | profile namespace 선택은 current runtime/config contract로 흡수 후보. protocol identity authority로 쓰면 안 됨. | owner body apply candidate |
| Socket path override | `src/config/paths.ts`, `tests/unit/config/paths.test.ts` | paths 67-76·88-102; test 55-84 | [Fact] `AIOX_SOCKET_PATH`는 최우선 override이고 absolute path만 허용한다. relative value는 fail-fast. release 기본값은 `~/.aiox/daemon.sock`, dev/build는 `~/.aiox/<profile>/daemon.sock`. | Current Contract; verified fact/current implementation | 현재 spec에는 absolute override/fail-fast 외부 config contract가 빠져 있음. | owner body apply candidate |
| State DB path override scaffold | `src/config/paths.ts`, `src/daemon/run.ts`, `tests/unit/config/paths.test.ts` | paths 105-120; run 24-26; test 87-123 | [Fact] `AIOX_DB_PATH` resolver는 같은 absolute/fail-fast contract를 갖지만 production daemon은 여전히 `:memory:`를 열고 `getStatePath()`를 호출하지 않는다. | Current Contract for resolver scaffold + Implementation Gap for production DB wiring | spec은 file-backed DB가 active라고 쓰면 안 됨. scaffolded config contract와 current in-memory limit을 구분해야 함. | owner body apply candidate |
| Production socket wiring | `src/bin/aiox.ts`, `src/cli/parse.ts`, `src/cli/invocation.ts`, `src/daemon/run.ts`, `tests/integration/daemon-client-split.test.ts` | bin 78-179; parse 52-56; invocation 302-305; run 24-34·75-80; test 217-242 | [Fact] CLI runtime은 하나의 resolved socket path를 사용하고 `_run-daemon --socket <path>`로 daemon에 전달한다. daemon은 같은 path로 register/listen한다. | Current Contract; verified fact/current implementation | resolved socket path가 daemon namespace boundary라는 spec 문장 후보. | owner body apply candidate |
| Child agent socket propagation | `src/cli/invocation.ts`, `src/adapters/codex/launcher.ts`, `src/adapters/claude/launcher.ts`, `tests/unit/cli/invocation.test.ts` | invocation 200-254; codex launcher 95-119; claude launcher 100-114·199-206; test 240-340 | [Fact] Claude inline/plugin과 Codex inline MCP config에 `AIOX_SOCKET_PATH`가 주입된다. | Current Contract; verified fact/current implementation | child adapter config가 parent runtime namespace를 상속한다는 contract 후보. | owner body apply candidate |
| Existing spec profile namespace gap | `docs/specs/aiox-a2a.md`, `prd/post-mvp/aiox-a2a-spec.md`, `docs/decisions/runtime-profile-namespace-isolation.md` | spec 51-53·146-148·248-265·577-605; post-mvp 91-101·149-190·228-241; decision 13-60·69-82 | [Fact] spec은 `<profile>` local address와 profile storage를 말하지만 `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` override/fail-fast는 정의하지 않는다. post-mvp §0-§1의 runtime/current DB snapshot은 코드 cite로 검증한 부분만 흡수 가능하다. profile namespace rationale은 이미 decision으로 승격됨. | Current gap + Stale source where verified by src | W7에서 §4.5 인접 또는 별도 runtime config subsection 후보. 새 decision은 현시점 불필요. | owner body apply candidate |

### Batch A1 Evidence Ledger — protocol core §2-§4

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |
| A1 owner scope | `docs/specs/aiox-a2a.md` | 67-260 | [Fact] §2-§4는 glossary/layer/envelope/routing/delivery/error/persistence contract를 정의하지만 §4 상당 부분은 G1/cutover target이고 current implementation이 아니다. | verified fact; target contract/structure | `docs/specs/aiox-a2a.md`가 external protocol contract owner임은 유지. | no owner body apply |
| Current message model vs canonical envelope | `src/core/messages.ts`, `src/store/schema.ts`, tests | messages 7-23·33-40; schema 48-56; `messages.test.ts` 11-35; `codex-ingress.test.ts` 312-339 | [Fact] 현재 `Message` interface는 `id/sourceAgentId/parentMessageId/type/content`를 포함한다. schema layer에는 timestamp columns가 있으나 API 반환 여부는 W7에서 재검증해야 한다. `protocol/intent/replyExpected/source.kind/address/target.address/canonical content object`는 저장하지 않는다. | Current Contract for current fields + Implementation Gap vs v1 envelope; timestamp return needs W7 verification | §4.1을 fully current로 취급하면 안 됨. 기존 spec gap note는 대체로 타당. | owner body apply candidate |
| Fan-out and delivery identity | `src/core/messages.ts`, `src/core/deliveries.ts`, `src/store/repositories/deliveries.ts`, `tests/unit/daemon/message-fanout-store.test.ts` | messages 57-74; deliveries 26-35; repo 102-112; test 52-195 | [Fact] 현재 fan-out은 하나의 logical message와 route별 delivery row를 만든다. delivery row는 고유 `id`, shared `messageId`, target agent id, route id, status, idempotency key를 가진다. [Inference] `1 message = N deliveries`는 부분적으로 뒷받침되지만 v1 `deliveryId`/address envelope는 노출하지 않는다. | Current Contract with Implementation Gap | §4.2/§4.5는 current storage/fan-out과 v1 target을 분리해야 함. | owner body apply candidate |
| Directed routing and reply correlation | `src/store/repositories/routes.ts`, `src/daemon/state.ts`, adapter ingress tests | routes 46-53·102-164; state 766-805·1008-1039·1127-1158·1761-1821; route tests 24-105; adapter tests cited by producer | [Fact] route는 directed source→target으로 저장된다. reply ingress는 `parentMessageId`/Claude `chatId`/Codex `parent_message_id`를 받아 `type: "reply"` message를 만들고, replying source의 active outbound routes로 fan-out한다. original target identity 검증, `inReplyToDeliveryId`, source-only single-target reply routing은 없다. | Current Contract for directed routes/parent-message reply compatibility + Implementation Gap vs §4.2 | source-only delivery correlation은 target/current gap. `route_not_allowed`는 current API wording이 아니라 target vocabulary. | owner body apply candidate |
| Delivery/ack/retry | `src/core/deliveries.ts`, `src/daemon/state.ts`, `src/adapters/router.ts`, tests | deliveries 3-11·38-55; state 1192-1244·1279-1288·1785-1797; router 99-131; tests cited by producer | [Fact] status는 `queued/delivering/delivered/completed/failed`; `delivering`은 restart recovery에서 `queued`로 돌아간다. adapter success는 `delivered` 뒤 곧바로 `completed`로 전이한다. ack evidence table, retry attempt count, `nextAttemptAt`, ack deadline, degradation code, bounded backoff state는 없다. | Current Contract for status/idempotency/recovery + Target Contract/Implementation Gap for ack/retry | §4.3 retry baseline과 §4.5 retry fields는 target/gap으로 남겨야 함. | owner body apply candidate |
| Error model | `src/daemon/api.ts`, `src/daemon/state.ts`, `src/adapters/contract.ts`, tests | api 130-251·282-297; state 128-142·345-394; contract 19-51; tests cited by producer | [Fact] current typed errors는 `source_agent_not_found`, `target_agent_not_found`, `no_active_routes`, `delivery_idempotency_key_exists`, `codex_ingress_unauthorized`, adapter deferred/failed reasons 등을 포함한다. [Inference] §4.4 v1 errors는 대부분 target vocabulary이며 current API와 1:1 mapping이 아니다. | Current Contract for existing typed errors + Target Contract for v1 error vocabulary | §4.4 full set을 current로 표기하지 않는다. | owner body apply candidate |
| Persistence minimum, WAL, in-memory | `src/store/schema.ts`, `src/store/sqlite.ts`, `src/daemon/run.ts`, `src/config/paths.ts`, tests | schema 48-78; sqlite 5-11; run 24-26; paths 105-120; `sqlite.test.ts` 21-39; fanout test 131-195 | [Fact] file-backed helper는 WAL과 schema apply를 수행하지만 production daemon은 `new Database(":memory:")`를 연다. schema는 messages/deliveries/routes/events를 저장하지만 v1 protocol/intent/replyExpected/ack/retry obligation fields는 없다. | Current Contract for in-memory production path + file-backed WAL helper; Implementation Gap for §4.5 minimum | WAL helper는 current utility, production persistence는 in-memory current gap/scaffold로 분류. | owner body apply candidate |

### Batch B Evidence Ledger — adapter/compose §5-§6

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |
| §5 adapter model scope | `docs/specs/aiox-a2a.md`, `src/adapters/contract.ts`, `tests/unit/adapters/fake-integration.test.ts` | spec 333-379; contract 53-56; tests 309-530 | [Fact] spec은 adapter compatibility connector, open runtime connector id, 4-slot input model, capability tier output model을 정의한다. current shared `AgentAdapter` surface는 `kind` + `inject(input)`뿐이고 full 4-slot interface는 없다. | Current Contract for current adapter surface + Target Contract for 4-slot model | §5가 current unified 4-slot `AgentAdapter` interface를 암시하면 안 됨. | owner body apply candidate |
| Adapter dispatch registry gap | `src/daemon/state.ts`, `plans/post-mvp/adapter-dispatch-registry.plan.md` | state 1275-1277; plan 1-15·19-48 | [Fact] daemon은 여전히 `targetAgent.kind === "codex"` 분기로 Codex/Claude injection을 선택한다. [Inference] adapter registry refactor는 deferred execution plan과 일치한다. | Implementation Gap + Execution Plan | registry refactor를 Current Contract로 올리지 않음. | no owner body apply |
| Adapter deferred/failure reasons | `src/adapters/contract.ts`, `src/adapters/router.ts`, tests | contract 19-51; router 87-113·140-178; tests 437-530 | [Fact] adapter result는 `failed`와 `deferred`를 분리한다. missing adapter는 queued `target_adapter_not_registered`로 남고 deferred injection은 delivery를 queued로 둔다. | Current Contract; verified fact/current implementation | typed degradation framing은 지원하지만 full capability tier computation은 아님. | owner body apply candidate |
| Pair slot model | `src/core/pairs.ts`, `src/store/schema.ts`, `src/store/repositories/pairs.ts`, tests | pairs 23-45·76-130; schema 22-24·120-124; repo 123-168·246-270; tests cited by producer | [Fact] current pair capacity는 vendor-agnostic 2-slot `PairSlot = "a" | "b"`다. same-vendor pairs도 두 slot을 차지해 ready가 될 수 있고 self-loop/occupied/full은 거부된다. | Current Contract; verified fact/current implementation | adapter 4-slot과 pair 2-slot은 별개 개념. legacy MVP codex+claude fixed pair는 stale. | owner body apply candidate |
| Codex adapter surface | `src/adapters/codex/*`, tests | launcher 40-120; runtime 304-365; mcp 17-153·184-220; injector 22-63; proxy 58-193; tests cited by producer | [Fact] Codex current launch/attach는 daemon-owned app-server, `--listen ws://127.0.0.1:0`, optional MCP injection, WS initialize, per-agent proxy, TUI `--remote`를 쓴다. MCP egress는 agent token/message id로 daemon을 호출하고 ingress는 active thread guarded `turn/start`를 사용한다. | Current Contract; verified fact/current implementation | §5 Codex current matrix 후보. upstream stability/version claims는 W7 spot-check 필요. | owner body apply candidate |
| Claude adapter surface | `src/adapters/claude/*`, tests | launcher 9-27·94-209; channel 49-69·258-507; injector 21-78; tests cited by producer | [Fact] Claude current path는 dev channel/plugin launch, env/MCP config token/socket injection, channel endpoint registration, HTTP `/send` daemon push, MCP send/reply handlers를 제공한다. | Current Contract; verified fact/current implementation | §5 Claude preview surface 후보. auth/ack/retry guarantee는 gap. | owner body apply candidate |
| Capability tier current status | `docs/specs/aiox-a2a.md`, current adapter code/tests | spec 365-408 | [Fact] spec은 Tier 1-4와 Codex/Claude Tier 3/Tier 3 preview를 말한다. [Inference] code에는 typed deferred/failure와 adapter surfaces가 있지만 selected ingress/fallback/ack/dedupe guarantee를 노출하는 runtime tier evaluator/diagnostics API는 없다. | Target Contract + partial Current Contract | tier definitions는 유지하되 matrix/diagnostics는 W7 검증 전 target으로 취급. | owner body apply candidate |
| §6 Compose implementation absence | `docs/specs/aiox-a2a.md`, `rg -n "compose" src tests package.json README.md` | spec 410-477; search no matches | [Fact] spec은 Compose를 “Committed target, Phase 2”와 “currently not implemented in CLI/config”로 self-declare한다. src/tests/package/README에서 compose 구현 match가 없다. | Target Contract; verified implementation absence | §6은 Current Contract로 승격 금지. | owner body apply candidate |
| Compose legacy/archive rationale | `history/58-post-mvp-a2a-architecture-decisions.history.md`, `prd/post-mvp/archive/*`, `prd/post-mvp/aiox-a2a-spec.md` | history 23-45·130-139·219-256; post-mvp 613-679; archive cites by producer | [Fact] legacy/archive는 Compose를 Docker clone이 아니라 protocol/runtime 위 declarative layer로 수렴시킨다. post-mvp §6은 current spec §6과 거의 같다. [Inference] archive에는 owner body material은 아니지만 brainstorm provenance가 일부 남아 있다. | Target Contract + legacy source | Archive Gate에서 digest 필요 여부를 W8/W10이 판단해야 함. | needs verification |

### Batch C Evidence Ledger — capability/federation/deferred §7-§9

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |
| §7 capability model | `docs/specs/aiox-a2a.md`, `prd/post-mvp/aiox-a2a-spec.md` | spec 526-550; post-mvp 681-727·744-753 | [Fact] spec/post-mvp는 capability projection을 target model로 정의하고 registry/resolution/conflict detection/projection cleanup/arbitrary user capability compile이 미구현이라고 말한다. [Inference] policy model은 Current Contract가 아니라 Target/Deferred다. | Target Contract / Deferred | full capability projection이 존재한다고 쓰지 않는다. | owner body apply candidate |
| Fixed aiox projection | `src/adapters/codex/launcher.ts`, `src/adapters/claude/launcher.ts`, `src/adapters/claude/preflight.ts`, `src/adapters/claude/channel-server.ts`, tests | codex launcher 88-119; codex test 133-170; claude launcher 94-117·189-206; preflight 128-240; channel 258-300; claude tests cited by producer | [Fact] Codex launcher는 fixed `mcp_servers.aiox` config를 주입한다. Claude는 inline MCP config 또는 plugin activation으로 fixed aiox channel/plugin을 지원한다. N grants/multi-plugin/settings precedence는 구현 증거가 없다. | Current Contract for fixed aiox projection + Target for generalization | §7.1은 fixed projection만 current로 cite하고 general capability compile은 target으로 둔다. | owner body apply candidate |
| Trust boundary: tokens and push-auth gap | `src/daemon/state.ts`, `src/adapters/claude/injector.ts`, `src/adapters/claude/channel-server.ts`, `docs/decisions/claude-channel-trust-and-registration.md`, tests | state 610-638·926-953·1044-1130; injector 21-58; channel 432-477; decision 22-25; tests cited by producer | [Fact] Claude/Codex attach는 transient token을 발급하고 registration/ingress는 missing/wrong token을 거부한다. 그러나 decision은 token guarantee가 channel→daemon registration에 한정되고 daemon→channel `/send` push auth는 open이라고 기록한다. code도 loopback endpoint에 auth header 없이 post한다. | Current Contract for registration/ingress auth + Implementation Gap/Open Issue for reverse push auth | §7.2는 identity checks와 `/send` auth gap을 분리해야 함. | owner body apply candidate |
| Data handling/log sensitivity | `src/daemon/state.ts`, `src/adapters/claude/channel-server.ts`, `docs/specs/aiox-a2a.md` | state 983-1031·1221-1237; channel 494-497·551-555·611-617; spec 577-582 | [Fact] 일부 logs는 token hash를 사용하지만 daemon events는 Claude message/reply text를 event data에 저장한다. [Inference] message/transcript/log sensitive policy는 타당하나 current retention/redaction guarantee는 증명되지 않았다. | Open Issue / Implementation Gap | token-hash practice와 broader transcript retention/redaction gap을 구분. | owner body apply candidate |
| DB lifetime/retention | `docs/specs/aiox-a2a.md`, `src/bin/aiox.ts`, `src/store/sqlite.ts`, tests | spec 580-582; bin 241-244·362; sqlite 5-11; `sqlite.test.ts` 21-35 | [Fact] production runtime은 여전히 `:memory:` default이고 file-backed SQLite helper/WAL scaffold는 존재한다. | Current Contract + Target gap | no retention/deletion guarantee는 유지하되 file-backed scaffold 존재를 지우지 않음. | owner body apply candidate |
| §8 federation/remote | `docs/specs/aiox-a2a.md`, `docs/decisions/uds-transport-and-framing-contract.md`, `find src -name '*federation*' -o -name '*remote*'` | spec 584-625; decision 13-23·29-35; find output empty | [Fact] spec은 remote/federation implementation을 deferred로 둔다. src에는 federation/remote implementation file이 없다. local UDS rationale은 decision-backed이고 daemon↔daemon WebSocket/mTLS는 구현되지 않았다. | Current for local UDS rationale + Deferred/Target for remote federation | §8은 local/location-neutral design intent를 제외하고 Current가 아니다. | owner body apply candidate |
| §9 Codex structured ingress partial | `src/adapters/codex/runtime.ts`, `src/adapters/codex/injector.ts`, `src/adapters/codex/proxy.ts`, tests | runtime 242-285; injector 22-60; proxy 46-58·151-194; tests cited by producer | [Fact] `turn/start`, `thread/loaded/list`, per-agent proxy binding, WS/app-server failure detection은 구현·테스트되어 있다. `thread/inject_items`, `turn/steer`, `outputSchema`, token usage, `clientUserMessageId` binding은 local code로 증명되지 않았다. | Current Contract partial + Open Issue | §9 Codex structured ingress spike는 resolved partial과 remaining deferred를 분리해야 함. | owner body apply candidate |
| §9 remaining deferred | `docs/specs/aiox-a2a.md`, `rg` over `src tests` | spec 638-692; no matching guarantees | [Fact] group recipient visibility, hard reply expiration, OS sandbox enforcement, full external MCP tool allow/deny, skill recall/revocation은 구현/test를 찾지 못했다. Codex app-server exit/WS drop detection은 current partial이지만 broader session expiry/stale policy/retry/backoff/source surfacing은 open이다. | Deferred / Open Issue + Current Contract partial for runtime failure detection | deferred 항목을 Current로 승격하지 않음. | no owner body apply for still-deferred rows; owner body apply candidate for partial resolution |
| Pre-validation evidence | `prd/pre-validation/claude-codex-pre-validation.md`, `prd/pre-validation/sqlite-restart-recovery-pre-validation.md`, current code cites | cc pre-val 21-28·106-123·203-234; sqlite pre-val 17-29·63-80·121-154 | [Fact] pre-validation 2개는 historical PASS와 open issue를 담는다. [Inference] current owner docs만으로 manual trace detail이 self-contained하지 않아 보존 가치가 있다. | Evidence archive candidate | source map에서 `archive→delete?` 후보 유지. | needs verification |

### Decision Candidates

| Source | Lines | Why decision-worthy | Proposed decision | Status |
| ------ | ----- | ------------------- | ----------------- | ------ |
| `history/58-post-mvp-a2a-architecture-decisions.history.md` | 61-100 | [Inference] `type`/`intent`/`reply_expected`, delivery-level envelope, `deliveryId`, source-only reply routing, daemon-store authority는 §4 contract를 고정하는 load-bearing protocol choices다. 전용 decision은 아직 확인되지 않았다. | “A2A message lifecycle envelope and correlation contract” decision 후보. WHY만 기록하고 outcome은 spec §4 참조. | W6/W7 controller review |
| `prd/post-mvp/aiox-a2a-spec.md` | 520-534 | [Fact] correlated reply authorization, type authoring, explicit ack surface는 “Recommended, not yet approved”로 표시됨. | 결정으로 승격하지 않고 Open Issue/Proposed Contract로 유지. | no decision promotion now |
| `prd/post-mvp/archive/claude-codex-validation.md`, `history/58-post-mvp-a2a-architecture-decisions.history.md` | archive 40-48·74-79; history 38-45 | [Inference] adapter 4-slot input model과 capability tier output model의 직교성은 §5에서 load-bearing이고 code만으로 WHY가 복원되지 않는다. | adapter slots는 implementation surface, capability tier는 resulting protocol guarantee라는 WHY를 decision 후보로 검토. | candidate; no Phase 3 file creation |
| `prd/post-mvp/archive/claude-opinion.md`, `history/58-post-mvp-a2a-architecture-decisions.history.md` | archive 101-166·220-226; history 130-139·244-256 | [Inference] Compose schema가 Docker `services/scale/replica`와 native doc mutation을 거부한 이유는 schema 논쟁 재개 시 load-bearing일 수 있다. | Compose는 existing daemon protocol 위 collaboration topology/capability를 선언하고 native docs는 read-only base로 둔다는 WHY 후보. | candidate; W9/W10 가능성 높음 |
| `docs/aiox/industry-precedents-and-observability-models.md` | 16-37 | [Inference] Opaque Worker / delivery-vs-completion separation은 §9 lifecycle과 ack/deferred 선택을 설명한다. | “Opaque worker delivery acknowledgement and semantic completion are separate.” | candidate for W8/W10 |
| `docs/aiox/observation-asymmetry-and-d7-pivot.md`, `docs/decisions/pair-slot-generalization.md` | docs/aiox 48-72; decision 52-61 | [Inference] same-connection/proxy authority와 `thread/loaded/list` 비권위화 rationale은 기존 decision에 일부만 있음. | active Codex binding은 same-connection/proxy-observed causal response가 필요하고 loaded-list는 diagnostics/fallback only라는 decision 후보. | candidate; `codex-per-agent-app-server.md`/`proxy-lazy-observation-cost-model.md` 재확인 필요 |
| `prd/post-mvp/aiox-a2a-spec.md` | 681-727·744-753 | [Inference] capability projection과 OS sandbox 분리는 §7 overclaim 방지에 중요하지만 spec 본문만으로 충분할 수 있음. | W7에서 spec text로 WHY 복원 불가할 때만 decision 후보. | weak candidate |

### Cross-Owner Effects

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |
| `docs/specs/aiox-a2a.md` | W7 apply 후보: A0 runtime config subsection, §4 current-vs-target 재분류, §5 unified adapter/tier/compose current성 조정, §7-§9 partial current/deferred 분리. | A0-A1-B-C producer가 spec body 후보를 식별했으나 Phase 3에서는 수정 금지. | 각 batch Evidence Ledger row |
| `docs/decisions/` | §4 lifecycle/envelope/correlation, adapter 4-slot vs tier, Compose schema WHY, Opaque Worker, D7/proxy authority 후보 검토. | WHY가 load-bearing일 수 있으나 Phase 3 decision 생성 금지. | Decision Candidates table |
| `docs/architecture/local-agent-runtime.md` | handoff 후보: socket override/fail-fast cross-ref, current scattered adapter surfaces vs target registry, Claude reverse push auth gap, Codex runtime failure detection, file-backed DB scaffold vs memory production default. | 일부 findings는 external contract가 아니라 internal runtime structure. | A0/B/C rows |
| `plans/post-mvp/adapter-dispatch-registry.plan.md` | deferred execution plan으로 유지. | current daemon은 여전히 Codex/Claude 분기, shared adapter는 `inject()`만 있음. | `src/daemon/state.ts` 1275-1277; `src/adapters/contract.ts` 53-56 |
| `plans/post-mvp/envelope-metadata.plan.md` | spec authority가 아니라 execution-plan owner input으로 유지. | plan 자체가 non-authoritative이고 spec §4를 authority로 참조한다고 producer가 확인. | plan 14-18·225-229 |
| `docs/product/roadmap.md`, `plans/release-plan.md` | trust hardening, structured ingress remainder, sandbox/federation은 roadmap/release gate 후보. | deferred/release work이지 current protocol behavior가 아님. | C producer: post-mvp §9/§12 관련 rows |
| `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` | W8에서 소비한 source disposition append/update 필요. | W8 W8 Work Item이 source map 반영을 소유. | Source Map candidates below |

### Source Map Append Candidates

| file | claim nature | absorption owner | consuming package | archive? | self-sufficiency check | disposition |
| ---- | ------------ | ---------------- | ----------------- | -------- | ---------------------- | ----------- |
| `prd/post-mvp/aiox-a2a-spec.md` | §0-§9 runtime/profile/protocol/adapter/compose/capability/federation/deferred target+snapshot mix | spec + architecture + roadmap + decision | W8 + W9 + W10 | §12만 별도 판단; A0-C는 대체로 No | W7 cite spot-check 후 spec/decision/architecture/roadmap successor가 self-contained해야 함 | absorb→delete after W8/W9/W10 |
| `prd/mvp/aiox-mvp-spec.md` | old daemon namespace, fixed codex+claude pair, MVP store/architecture claims | spec + architecture stale | W8/W10 | No for A0-C | current resolver/pair/storage facts는 src/tests가 supersede | absorb→delete? |
| `docs/aiox/mcp-scope-and-daemon-namespace.md` | daemon namespace and MCP socket/token launch context | spec + architecture | W8/W10 | No | spec/architecture should carry same resolved socket path = namespace and adapter env facts | absorb→delete? |
| `docs/aiox/mvp-architecture.md` | stale old socket path snapshot | architecture stale | W10, with W8 evidence | No | current architecture/spec/decision supersede old default socket statement | delete-only? after W10 stale review |
| `plans/post-mvp/envelope-metadata.plan.md` | §4 execution plan | plans/roadmap | W9, with W8 A1 evidence | No | current implementation claims must not be sourced from plan alone | absorb→delete after plan consolidation |
| `plans/post-mvp/adapter-dispatch-registry.plan.md` | deferred adapter registry refactor | plans | W9/W10, referenced by W8 | No | still live as deferred plan; current code confirms gap | keep until plan consolidation, then absorb→delete |
| `prd/post-mvp/archive/claude-codex-validation.md` | adapter 4-slot+tier and compose-before-envelope rationale | spec + decision? | W8 | ? | accepted claims mostly in spec/history; decide if WHY digest needed | absorb→delete? |
| `prd/post-mvp/archive/claude-opinion.md` | Compose brainstorm and schema alternatives | spec + decision?/architecture | W8/W10 | ? | spec §6 absorbed selected claims; brainstorm may need digest only if historically valuable | archive→delete? or absorb→delete? |
| `prd/post-mvp/archive/codex-claude-validation.md` | Compose validation and contract-first rationale | spec + roadmap/plans | W8/W9 | ? | current spec/history absorbed accepted claims; raw transcript likely not owner body | absorb→delete? |
| `prd/post-mvp/archive/codex-opinion.md` | Compose/generated instruction and adapter compile brainstorm | spec + architecture/plans | W8/W10 | ? | some claims absorbed; adapter `compile()` remains future architecture/plan | archive→delete? or absorb→delete? |
| `prd/post-mvp/archive/gemini-opinion.md` | Compose schema alternatives and Docker/service rejection | spec + decision? | W8/W10 | ? | spec has accepted principles; raw brainstorm likely conditional archive only | absorb→delete? |
| `prd/pre-validation/claude-codex-pre-validation.md` | historical PASS spike for Claude/Codex injection feasibility | architecture evidence + decision provenance | W8/W10 | Yes? | current owner docs do not preserve manual trace detail | archive→delete? |
| `prd/pre-validation/sqlite-restart-recovery-pre-validation.md` | historical PASS spike for durable broker recovery | architecture evidence + release/roadmap provenance | W8/W10 | Yes? | current code has scaffold but not full recovery guarantee; digest likely needed if deleting source | archive→delete? |
| `docs/aiox/industry-precedents-and-observability-models.md` | Opaque Worker rationale | decision + architecture | W8/W10 | ? | decision promotion likely needed before deletion | absorb→delete? after decision/architecture absorption |
| `docs/aiox/observation-asymmetry-and-d7-pivot.md` | D7/proxy authority rationale | decision + architecture | W8/W10 | ? | existing decisions partially cover; verify before deletion | archive→delete? or absorb→delete? |
| `docs/aiox/proxy-vs-app-server-tradeoff.md` | per-agent app-server/proxy tradeoff | decision + architecture | W8/W10 | No? | `codex-per-agent-app-server.md` covers app-server; proxy authority still needs check | absorb→delete? |
| `docs/aiox/claude-channel-registration-and-trust-model.md` | Claude channel token/registration trust model | architecture + decision? | W8/W10 | No? | current code/decision cover registration; push-auth gap remains open | absorb→delete? |
| `docs/aiox/per-agent-transparent-proxy-decision.md` | Codex per-agent proxy rationale | architecture + decision? | W8/W10 | No? | current code/tests implement proxy; rationale may belong in architecture/decision | absorb→delete? |
| `docs/aiox/pair-attach-kind-mismatch.md` | historical kind mismatch bug learning | architecture/log archive | W8/W10 | No? | current tests cover fix; stale for Step 15 pair capacity | delete-only? or absorb→delete? |

### Open Questions For W6/W7

- [Open Issue] W7에서 runtime config를 §4.5에 접을지, 별도 “Runtime config / profile namespace” subsection으로 둘지 결정해야 한다. producer 권고는 별도 subsection.
- [Open Issue] `AIOX_DB_PATH`는 resolver scaffold current로만 쓸지, production DB wiring 전까지 spec 본문에서 제외할지 wording risk가 있다.
- [Open Issue] v1 `route_not_allowed`를 current `no_active_routes`의 wire-level canonical mapping으로 볼지, current API reason을 바꿀지 결정 필요.
- [Open Issue] public envelope의 `deliveryId`를 stored `message_deliveries.id`와 동일시할지, 별도 stable external id/namespace를 둘지 결정 필요.
- [Open Issue] correlated reply authorization이 reverse route를 요구하는지, original delivery obligation만으로 충분한지 미승인 상태다.
- [Open Issue] explicit ack operation/tool/RPC surface, timeout/backoff defaults, retry evidence model은 current code에 없다.
- [Open Issue] §5 “Current adapter matrix (2026-06-11)”는 local src/tests만으로 vendor upstream support level과 Tier 3 wording을 fully prove하지 못하므로 W7에서 좁혀야 한다.
- [Open Issue] adapter tier diagnostics API가 없으므로 diagnostics/matrix는 Target Contract로 낮출지 결정해야 한다.
- [Open Issue] §7.1 vendor official-doc feasibility snapshot은 2026-06-11 기준이므로 adapter work 전 최신 vendor doc 재검증이 필요할 수 있다.
- [Open Issue] §7.2가 Claude daemon→channel `/send` auth gap을 명시해야 하는지 확인 필요.
- [Open Issue] §9 Codex structured ingress spike는 implemented `turn/start`/proxy binding과 still-open `thread/inject_items`/`turn/steer`/deliveryId binding으로 나눌 후보다.
- [Open Issue] Opaque Worker와 D7/proxy authority는 하나의 decision인지 두 decision인지, 기존 decisions와 중복되는지 W6/Sweep에서 재확인 필요.
- [Open Issue] pre-validation 2개와 post-mvp archive brainstorm의 Archive Gate 최종 판정이 필요하다.

**완료 판정:**

- W2 A0, W3 A1, W4 B, W5 C Phase 3 producer work 완료.
- owner 문서 수정 없음.
- spec 본문 반영 없음.
- 다음 재개 지점은 W6 Sweep — §10-§13 owner 분류 및 위 decision/source-map 후보의 Sweep 범위 판정.

## 2026-06-21 · Controller sample cite spot-check (pre-W6, NOT W7 full)

@claude(controlling/checker)가 W6 진행 전 producer 산출물 신뢰도를 가늠하려고 **표적 sample
cite spot-check**를 수행했다. 이는 **W7 full cite spot-check가 아니다** — 전체 row 대상 검증과
spec 본문 반영은 여전히 W7가 소유한다.

검증한 5건(batch별 high-stakes Current Contract / Implementation Gap) 모두 src와 일치:

- [A0] `AIOX_SOCKET_PATH` absolute-only override + relative fail-fast → `src/config/paths.ts:72-77,93-103` 일치.
- [A0] `AIOX_DB_PATH` resolver는 scaffold, production daemon은 `:memory:` → `src/config/paths.ts:105-121`(docstring "SCAFFOLD ONLY — production runs :memory:"), `src/daemon/run.ts:25` 일치.
- [A1] 현재 message가 protocol/intent/replyExpected/address 미저장 → `src/core/messages.ts:17-23` 일치(timestamps over-reach는 본 세션에서 정정됨).
- [B] §6 Compose 구현 부재 → `rg -i compose src tests package.json` 0 match 일치.
- [C] federation/remote 구현 파일 부재 → `find src -name '*federation*' -o -name '*remote*'` empty 일치.

**판단:** sample 5/5 일치로 producer Ledger 신뢰도가 섰다. 단 (1) 이건 sample이고 full W7 검증은
미완, (2) producer 모델 정체 미검증 전제는 유지되므로 W7 checker는 모델 독립성에 기대지 않고
전체 `Current Contract`/`Implementation Gap` row를 `src/file:line`+test로 직접 재검증한다.

**다음:** active pointer는 W6 Sweep. 이번 라운드는 A0/A1/B/C만 실행됐고 Sweep batch
(`logs/W8-Sweep-task.md`, §10-§13 owner 분류)는 아직 미실행이다. W6는 Sweep producer dispatch →
그 산출물 통합 순으로 진행한다.

## 2026-06-21 · W6 Sweep 완료 — §10-§13 owner 분류

@user 결정에 따라 subagent dispatch 없이 Codex가 W6 Sweep을 직접 수행했다. 범위는
`logs/W8-Sweep-task.md`의 §10-§13 분류이며, owner 문서(`docs/specs/`, `docs/decisions/`,
`docs/architecture/`, roadmap/release)는 수정하지 않았다. 아래는 ledger-only 산출물이다.

**검증 입력:**

- `prd/post-mvp/aiox-a2a-spec.md:882-1188` (§10-§13 원문)
- `docs/product/roadmap.md:1-212` (현재 roadmap owner)
- `plans/release-plan.md:1-70` (G6 npm packaging checklist owner)
- `docs/decisions/` 현황: 11개 decision 파일 확인. `claude-channel-trust-and-registration.md`,
  `codex-per-agent-app-server.md`, `pair-slot-generalization.md`,
  `proxy-lazy-observation-cost-model.md` 등이 일부 WHY를 이미 소유하지만, Opaque Worker,
  D7 scope reduction, app-server+proxy hybrid 종합, architecture debt 3축/structured logger는
  전용 decision으로는 아직 부재/미흡하다.
- §12 spot-check: `src/` 현재 코드와 `docs/architecture/local-agent-runtime.md`의 current gap
  섹션을 대조했다.

### Sweep Evidence Ledger — §10-§13 owner 분류

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |
| §10 dangerous metaphors | `prd/post-mvp/aiox-a2a-spec.md` | 882-897 | [Fact] MCP-only, phone ownership, terminal launcher, Docker services/replicas, compose replacing native docs, capability=sandbox, central LLM brain 같은 오해 방지 문구다. | opinion-proposal + product/architecture rationale | spec contract body가 아니라 product/architecture framing. 일부는 §5-§7 spec wording의 overclaim 방지 원칙으로만 간접 소비. | no owner body apply |
| §11 gate/phase/evidence | `prd/post-mvp/aiox-a2a-spec.md`, `docs/product/roadmap.md` | post-mvp 901-1028; roadmap 1-212 | [Fact] 현재 `docs/product/roadmap.md`가 release gates, phase, gate evidence, pre-release gap summary를 이미 소유한다. `plans/release-plan.md`는 G6 checklist로 한정됨. | Release Gate + Execution Plan; verified fact | §11은 W9 roadmap/release owner가 소비할 source이며 spec body로 복사 금지. 현재 roadmap successor는 큰 구조상 self-contained해 보이나 W9가 세부 누락을 최종 판정해야 함. | no owner body apply; W9 handoff |
| §11 G6 packaging details | `prd/post-mvp/aiox-a2a-spec.md`, `plans/release-plan.md` | post-mvp 969-976; release-plan 1-70 | [Fact] `plans/release-plan.md`가 tarball allowlist, prepublish build, pack/install smoke checklist를 이미 소유한다. | Execution Plan; verified fact | release-plan owner로 유지. roadmap은 통과 조건만 소유. | no owner body apply; W9/release handoff |
| §12 dated audit snapshot | `prd/post-mvp/aiox-a2a-spec.md`, `docs/product/roadmap.md` | post-mvp 1030-1064; roadmap 192-212 | [Fact] roadmap은 §12의 상세 파일 위치/심각도 표를 그대로 소유하지 않고 gate/phase pressure로 요약한다. | Release Gate + Implementation Gap/Pre-implementation Blocker source | dated audit 원문은 W9/W10/source-map 판단 대상. W7 spec에 파일 위치 표를 복사하지 않는다. | no owner body apply; W9/W10 handoff |
| §12 P1 security current drift | `src/adapters/claude/channel-server.ts`, `src/daemon/state.ts`, `src/adapters/codex/launcher.ts`, `src/config/paths.ts` | channel 437-463; state 926-954, 1044-1055; launcher 40-119; paths 93-101 | [Fact] Claude reverse HTTP `/send`는 여전히 request auth 없이 JSON body만 처리한다. Codex token은 inline MCP config/env TOML로 argv에 실릴 수 있다. socket dir creation still relies on default mkdir mode. [Fact] 하지만 P1-3의 "Claude→daemon ingress token 검증 없음"은 stale: `registerClaudeChannel` now checks pending token and deletes it. | Current gap/Pre-implementation Blocker for remaining trust issues; Stale for P1-3 as written | W9 roadmap can keep trust-boundary gate pressure, but W10/architecture/source-map must not preserve stale P1-3 wording as current. | needs verification; W9/W10 handoff |
| §12 P2 reliability current drift | `src/daemon/run.ts`, `src/daemon/state.ts`, `src/daemon/socket-transport.ts`, `src/adapters/codex/proxy.ts`, `src/adapters/claude/channel-server.ts`, `src/adapters/codex/runtime.ts` | run 24-70; state 1176-1188, 1275-1307, 2024-2042; socket 60-84, 183-201; proxy 71-91; channel 619-625; runtime 355-362 | [Fact] production daemon still opens `:memory:`; stop marks agents disconnected but does not dispose Codex runtimes in `state.stop`; socket server lacks per-socket error listener and own-property method guard; queued deliveries are requeued/deferred but no registration-time flush was found; `defaultAttachCodexRuntime` does not pass `onRuntimeFailed`; proxy/body buffers are unbounded. | Current gap/Pre-implementation Blocker + Release Gate | Most §12 P2 rows remain valid gate pressure, but detailed row-by-row final status belongs W9/W10, not spec. | needs verification; W9/W10 handoff |
| §12 resolved/stale details | `src/daemon/state.ts`, `docs/architecture/local-agent-runtime.md` | state 832-849, 926-954; arch 301-324, 1138-1143 | [Fact] rollback now deletes `codexPendingTokens`; Claude channel registration token is implemented and documented as current. Architecture already records Codex runtime failure production wiring gap. | Stale-drift reference + Current architecture gap | Source-map should mark dated snapshot as partially stale; successor must be current owner docs plus code cites, not raw §12 table. | needs verification; W8 source-map candidate |
| §13.1 discoveries | `prd/post-mvp/aiox-a2a-spec.md`, current docs | post-mvp 1073-1090; roadmap 197-202; arch 1117-1124 | [Fact] Contains mixed Verified/Observed/Hypothesis: Codex structured ingress, remote/mobile hypothesis, billing hypothesis, terminal env hints, code strengths. [Inference] current owner split is roadmap for gate pressure, architecture for durable code assets, product for adoption/positioning. | mixed current implementation + hypothesis + architecture asset | W8 spec decision promotion not appropriate except where §4/§5 contract WHY cannot be recovered. External/vendor claims require revalidation at implementation/public prep. | no owner body apply |
| §13.2 architecture debt 3 axes | `prd/post-mvp/aiox-a2a-spec.md`, `src/daemon/state.ts`, `src/store/schema.ts`, `docs/decisions/pair-slot-generalization.md` | post-mvp 1092-1108; state wc=2218 lines and vendor ingress methods 926-1160; schema 23, 121-122; decision pair-slot 21-57 | [Fact] `state.ts` is 2218 lines; vendor-specific ingress method families remain; pair is now kind-agnostic 2-slot but still pair cardinality. [Inference] state decomposition + ingress generalization are architecture/W10; pair-to-N is roadmap Phase 2/architecture target, not W8 spec decision. | architecture current gap/target + Execution Plan | W10 architecture split input. Existing pair-slot decision covers kind-agnostic 2-slot only, not state/ingress debt. | no owner body apply; W10 handoff |
| §13.3 DX prescription | `prd/post-mvp/aiox-a2a-spec.md`, `rg console\\.|logger`, `docs/product/roadmap.md` | post-mvp 1110-1124; roadmap 60-68, 203-204 | [Fact] `src/` has no general structured logger/aiox logs surface found; roadmap G3 already requires JSONL structured logger, `aiox logs`, doctor. | Release Gate + architecture/DX improvement | W9/G3 and W10 architecture owner, not spec. Structured logger may deserve decision only if alternative logging architecture is contested. | no owner body apply; W9/W10 handoff |
| §13.4 vendor expansion guidance | `prd/post-mvp/aiox-a2a-spec.md`, `docs/product/roadmap.md` | post-mvp 1126-1141; roadmap 135-141, 156-161 | [Fact] Guidance says do container first, use §5 4-slot template, honest tiers, version preflight, billing verification, APM review. | Execution Plan + architecture/product guidance | Belongs W9/W10. W8 spec only preserves adapter/capability contract, not vendor kickoff instructions. | no owner body apply |
| §13.5 external precedents | `prd/post-mvp/aiox-a2a-spec.md` | 1143-1155 | [Fact] Lists Google A2A, Microsoft APM, kanbots, shadcn proxy PR, OpenAI Codex app-server as limited references and says to reverify status. | external evidence + hypothesis; needs revalidation | Do not promote to current fact. Opaque Worker / delivery-vs-completion rationale from `docs/aiox/industry-precedents...` remains decision/W10 candidate, but external links need recheck before owner body use. | needs verification; W10/decision handoff |
| §13.6 product boundary | `prd/post-mvp/aiox-a2a-spec.md`, `docs/product/roadmap.md` | post-mvp 1157-1173; roadmap 131-141 | [Fact] Product rationale/hypothesis about local cross-vendor boundary, compose topology, federation bridge. | product rationale + hypothesis | Product owner/W9. Not W8 spec contract. | no owner body apply; W9 handoff |
| §13.7 adoption/commercial hypotheses | `prd/post-mvp/aiox-a2a-spec.md` | 1175-1188 | [Fact] Explicitly exploratory: demo/adoption/contributions, possible open-core, hosted relay optionality, transcript/cost/approval value. | product hypothesis | Product/roadmap only after validation; no spec/decision promotion now. | no owner body apply |

### Decision Candidates

| Source | Lines | Why decision-worthy | Proposed decision | Status |
| ------ | ----- | ------------------- | ----------------- | ------ |
| `history/58-post-mvp-a2a-architecture-decisions.history.md`; A1 ledger | history 61-100; A1 ledger §4 rows | [Inference] type/intent/reply_expected, delivery-level envelope, deliveryId, source-only reply routing, daemon-store authority directly fix §4 protocol contract and are not fully covered by existing decisions. | “A2A message lifecycle envelope and correlation contract.” Outcome references spec §4; decision owns WHY only. | W8 decision promotion candidate after W7 wording target chosen |
| `prd/post-mvp/aiox-a2a-spec.md` §13.2 | 1092-1108 | [Inference] state.ts decomposition + ingress generalization + pair-to-N prerequisites are load-bearing for Phase 2 vendor expansion, but they are architecture/roadmap choices rather than W8 spec contract rationale. Existing `pair-slot-generalization.md` only covers kind-agnostic 2-slot. | “Vendor expansion requires finishing existing hexagonal boundaries before adding more vendors.” | W10/architecture decision handoff, not W8 promotion |
| `docs/aiox/industry-precedents-and-observability-models.md`; §13.5 | source-map W4; post-mvp 1143-1155 | [Inference] Opaque Worker / delivery-vs-completion separation could explain ack vs semantic completion, but current W8 ledger already has enough §4 contract facts from code/spec unless W7 needs WHY text. | “Delivery acknowledgement and semantic completion are separate.” | W8 weak candidate; otherwise W10 decision handoff. External/source revalidation needed |
| `docs/aiox/observation-asymmetry-and-d7-pivot.md`; `docs/decisions/pair-slot-generalization.md`; architecture §7.5 | source-map W4; arch 614-623, 657-665 | [Inference] same-connection/proxy-observed causal response as authority and loaded-list fallback limits are partly in architecture and pair-slot decision, but D7 scope reduction is not a standalone decision. | “Codex binding authority is same-connection/proxy-observed causality; loaded-list is diagnostic/fallback only.” | W10/decision handoff; W7 may cite existing architecture if enough |
| `docs/aiox/proxy-vs-app-server-tradeoff.md`; existing decisions | source-map W4; decisions `codex-per-agent-app-server.md`, `proxy-lazy-observation-cost-model.md` | [Fact] Existing decisions separately cover 1:1 app-server and proxy lazy observation. [Inference] A combined app-server+proxy hybrid decision may still be missing but is architecture rationale, not spec contract. | “Codex adapter uses 1:1 app-server plus 1:1 transparent proxy with split injection/observation duties.” | W10/decision handoff |
| `docs/aiox/step-14-codex-mcp-remote-architecture-bug.md`; `agent-level-mcp-process-scoping.md` | source-map W4; decision process-scoping 1-20 | [Inference] process-scoped MCP is decided; Step 14 app-server injection/isolation nuance may be architecture rationale not fully captured. | Clarify app-server-owned MCP injection boundary. | W10/decision handoff |
| `prd/post-mvp/aiox-a2a-spec.md` §13.3 | 1110-1124 | [Inference] structured logger is important G3/DX work, but without contested alternatives it is likely roadmap/architecture target rather than decision. | No decision unless logging architecture alternatives become contested. | no promotion now |

### Cross-Owner Effects

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |
| `docs/product/roadmap.md` | W9 should treat §11 as already substantially absorbed; only verify omissions against `prd/post-mvp/aiox-a2a-spec.md:901-1028`. | Roadmap currently owns release gates/phases/evidence and pre-release gap summary. | `docs/product/roadmap.md:1-212` |
| `plans/release-plan.md` | Keep as G6 npm packaging execution checklist; W9 should not duplicate all release-plan details into roadmap. | Roadmap explicitly narrows release plan to G6 checklist. | `docs/product/roadmap.md:11-13`; `plans/release-plan.md:1-70` |
| `docs/product/roadmap.md` / W9 | §12 remains gate pressure, but stale detail rows must not be copied as current facts. | P1-3 and P1-7 have drifted since 2026-06-11; roadmap already summarizes detailed audit intentionally. | `src/daemon/state.ts:832-849,926-954`; roadmap 192-212 |
| `docs/architecture/local-agent-runtime.md` / W10 | Carry state.ts decomposition, ingress generalization, pair-to-N route target, Codex runtime failure wiring, Claude push auth gap, structured logger/doctor architecture. | These are internal structure/current-gap issues, not spec body. | post-mvp 1092-1124; architecture 301-324, 1138-1143 |
| `docs/decisions/` | W8 may promote §4 lifecycle/correlation only after W7 spec wording is chosen; W10 should handle architecture/product rationale candidates. | Decision docs own WHY only; existing decisions partially cover proxy/app-server/pair/trust but not all candidates. | `docs/decisions/` file list + targeted grep |
| `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` | Source map append/update should mark `prd/post-mvp/aiox-a2a-spec.md` §10-§13 as split across roadmap/product/architecture/decision, with §12 partially stale and §13 mostly handoff. | W6 classified source disposition but W8 does not update source map until W8 Work Item W8. | this block |

### Source Map Append Candidates

| file | claim nature | absorption owner | consuming package | archive? | self-sufficiency check | disposition |
| ---- | ------------ | ---------------- | ----------------- | -------- | ---------------------- | ----------- |
| `prd/post-mvp/aiox-a2a-spec.md` | §10 product/architecture metaphors, §11 roadmap, §12 dated audit, §13 rationale/hypotheses | spec + roadmap + release + architecture + decision | W8 + W9 + W10 | §12 detailed audit maybe conditional; §10/§11/§13 mostly No if successors self-contained | W7 spec + W9 roadmap/release + W10 architecture/decision must cover live claims; §12 stale rows require current-code reconciliation before deletion | absorb→delete after W8/W9/W10 |
| `docs/aiox/industry-precedents-and-observability-models.md` | external precedent + Opaque Worker rationale | decision + architecture | W8/W10 | ? | Needs external/source revalidation and decision/architecture successor before deletion | absorb→delete? |
| `docs/aiox/observation-asymmetry-and-d7-pivot.md` | D7/proxy authority rationale | decision + architecture | W8/W10 | ? | Existing architecture/pair decision partial; standalone D7 decision still candidate | archive→delete? or absorb→delete? |
| `docs/aiox/proxy-vs-app-server-tradeoff.md` | Codex app-server/proxy tradeoff | decision + architecture | W8/W10 | No? | Existing decisions split coverage; W10 should decide if combined WHY still needed | absorb→delete? |
| `docs/aiox/step-14-codex-mcp-remote-architecture-bug.md` | MCP injection/isolation empirical bug | decision + architecture | W8/W10 | ? | Process scoping decision exists; Step 14 app-server-owned MCP nuance needs W10 check | archive→delete? |

### Open Questions For W7/W9/W10

- [Open Issue] W7: whether W8 should create a §4 lifecycle/correlation decision before or after spec text is patched. Safer order: W7 chooses exact spec wording first, then decision WHY references that outcome.
- [Open Issue] W7: §10 metaphor claims should not become spec text, but W7 can use them as negative constraints when avoiding overclaim in §5-§7.
- [Open Issue] W9: compare `prd/post-mvp/aiox-a2a-spec.md:901-1028` against `docs/product/roadmap.md:1-212` for omission, but keep detailed execution/checklist content in `plans/`.
- [Open Issue] W9/W10: §12 P1/P2 needs full row-by-row current audit before any owner body update; this W6 did targeted spot-check and found stale rows.
- [Open Issue] W10: decide if architecture debt 3 axes and structured logger deserve decision docs or architecture target sections only.
- [Open Issue] W10: external precedent links in §13.5 are time-sensitive and must be revalidated before current owner text uses them.

**완료 판정:**

- §10-§13 각 항목은 owner로 분류됨.
- §11/§12 handoff rows are recorded for W9/W10.
- §13 decision candidates are split into W8 possible spec-contract rationale vs W10 architecture/product handoff.
- `docs/specs/aiox-a2a.md` 본문 수정 없음.
- owner 문서 수정 없음.
- 다음 재개 지점은 W7 Cite spot-check & 본문 반영.

**Workflow retrospective:**

- Sweep처럼 dated audit와 current owner가 이미 일부 정리된 범위는 source 원문을 그대로
  successor로 옮기는 방식이 위험하다. 먼저 current owner가 이미 흡수한 요약을 확인하고,
  raw audit row는 code drift를 spot-check해 stale/remaining을 나눈 뒤 handoff해야 한다.

## 2026-06-21 · Controller W6 §12 drift 검증 — stale/잔존 판정 양쪽 확인

@claude(checker)가 W6 Sweep에서 리스크가 가장 큰 §12 dated-audit drift 판정("이전 blocker가
지금 해소됐는지")을 실제 코드로 표적 검증했다. drift 오판은 실재 보안 gate를 떨어뜨릴 수 있어
양쪽(stale로 내린 것 / 잔존으로 남긴 것)을 모두 확인했다.

- [Stale 판정 확인] P1-3 "Claude→daemon registration 토큰 미검증"은 stale이 맞다.
  `src/daemon/state.ts:927-934`가 pending token 불일치를 `unknown_token`으로 거부하고
  `:945`에서 `claudePendingTokens.delete()`로 소비한다. registration 경로 토큰 검증 존재.
- [잔존 gate 확인] Claude reverse push `/send`는 여전히 request auth가 없다.
  `src/adapters/claude/channel-server.ts:438-456`은 method/url만 보고 auth 헤더 검증 없이
  body를 파싱·notify한다. → 잔존 Pre-implementation Blocker로 남기는 게 맞다.

**판단:** producer가 registration auth(해소)와 reverse push auth(미해소)를 정확히 구분했다.
F44 패턴대로 dated audit를 통째 이관하지 않고 code drift로 stale/잔존을 갈랐다. 구조 검사(owner
문서 무수정, next=W7 단일 pointer)와 합쳐 W6 Sweep는 checker review를 통과한다. 단 이는 §12의
대표 2건 sample이고, P1/P2 전체 row-by-row 최종 audit는 W9/W10이 소유한다(W6 Open Questions에
기록됨).

## 2026-06-21 · 다음 세션 패턴 확정 — Codex 실행(저작) + Claude 리뷰

@user 결정: 현재 분업 패턴을 다음 세션에서도 그대로 유지한다. 패턴 방향은 **Codex가
실행/저작(does) → Claude가 리뷰(review)** 다. package log가 세션 간 handoff를 소유하며 재진입
지점은 active pointer W7이다.

**[정정] 이 블록 최초 작성 시 controller가 방향을 거꾸로(Claude 저작 → Codex 재검증) 적었고,
@user가 즉시 바로잡았다. 실제 패턴은 W2-C와 동일하게 Codex가 실행/저작하고 Claude가
리뷰하는 방향이다.**

**W7+ 매핑 (Codex 실행 → Claude 리뷰):**

- W7~W10은 producer Ledger 생산 단계가 아니라 spec 본문 저작·owner 반영·handoff 단계다. 패턴
  유지 = 그 저작/실행을 Codex가 하고, Claude가 cross-model로 리뷰한다.
- cross-model 독립성: **저작자(Codex) ≠ 리뷰어(Claude)**. irreversible 지점(spec 본문 write)에서
  작성한 모델과 다른 모델이 cite를 검증한다. W2-C producer 모델 미검증이므로 W7 리뷰는 모델
  독립성에 기대지 않고 Claude가 실제 `src/`로 직접 재검증한다.
- W7 batch별 흐름:
  1. Codex가 batch별 spec 본문 변경을 draft/작성하고(working tree), 각 row의 `src/file:line`+test
     cite를 제시한다(does).
  2. Claude(checker)가 그 변경을 실제 `src/file:line`+test로 full cite spot-check하고, 패키지
     결정(W8-0 falsifiability gate, 상태 라벨)·`docs/specs/AGENTS.md` 정합성을 리뷰한다(review).
  3. Codex는 wording Open Issue를 self-decide하지 않고 @user 결정으로 환원한다. Claude는 리뷰에서
     환원 누락·상태 라벨 오용·미검증 cite를 잡는다.
  4. **리뷰 통과분만 batch를 최종 수용(commit/finalize)한다.** Codex 저작이 working tree에 먼저
     들어와도, Claude 리뷰 pass 전에는 확정 spec 사실로 보지 않는다. 실패 row는 되돌린다.
  5. wording Open Issue(runtime config subsection 배치, `AIOX_DB_PATH` scaffold 표기,
     `deliveryId` 외부 식별자, correlated reply 인가 등)는 @user 결정 대상이다.

**비용 메모:** round-trip을 줄이려면 Codex가 batch별이 아니라 묶음으로 본문 변경을 제시하고
Claude가 일괄 리뷰할 수 있다(controller 판단). cost-ceiling 신호가 보이면 일괄로 전환한다.

**불변:** Codex 저작이 working tree에 들어와도 Claude 리뷰 pass 전에는 확정 사실 아님. 다음 세션
재진입 = W7.

## 2026-06-21 · W7 wording Open Issue 5건 @user 결정

W7 batch별 spec 본문 draft(Codex 저작)가 self-decide로 막히지 않도록, controller가 이 파일
349-353에 모인 wording Open Issue 5건을 @user에게 환원해 결정을 받았다. Codex W7 draft는 이
기준을 따른다. 각 결정의 current 사실 근거는 W2-C Evidence Ledger와 controller spot-check(이 파일
376-386·493-498)에 있다.

1. **runtime config 배치 = 별도 subsection.** `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` absolute
   override + relative fail-fast는 §4.5에 접지 않고 별도 "Runtime config / profile namespace"
   subsection으로 둔다. (producer 권고 수용. socket/db path는 protocol lifecycle이 아니라
   runtime/config 영역.)
2. **`AIOX_DB_PATH` = resolver scaffold를 Current Contract로 표기 + Implementation Gap 분리.**
   resolver의 absolute/fail-fast는 Current Contract로 쓰되, production daemon이 여전히
   `:memory:`이고 file-backed가 미배선인 점을 Implementation Gap으로 명시한다. "active
   file-backed DB"로 오인되게 쓰지 않는다.
3. **error 명칭 = current reason 유지 + canonical mapping.** current API reason
   `no_active_routes`를 그대로 두고, v1 `route_not_allowed`는 wire-level canonical mapping으로만
   문서화한다. W7에서 API reason을 코드 변경으로 바꾸지 않는다(별도 구현 task).
4. **`deliveryId` = Target/Open만, current contract 고정 금지.** 별도 stable external
   id/namespace 방향(B)을 Target Contract/Open으로만 표기한다. public `deliveryId`를 stored
   `message_deliveries.id`와 동일시하는 current contract로 고정하지 않는다.
5. **correlated reply = current/target 분리, 최종 인가는 Open Issue 유지.** current는
   route-based fan-out reply(replying source active outbound routes로 fan-out, A), target은
   source-only delivery correlation(B)으로 분리 기술한다. 단 "correlated reply authorization이
   reverse route를 요구하는지 / original delivery obligation만으로 충분한지"의 최종 contract는
   Open Issue로 유지한다(승인하지 않는다).

**불변:** 이 결정은 spec *wording* 분류 기준이다. spec 본문 write는 여전히 Codex 저작 → Claude
full cite spot-check 리뷰 pass 후에만 확정된다(이 파일 506-539 패턴). 4·5의 Open 표기는 W7에서
임의로 contract로 승격하지 않는다.

**다음:** W7 — Codex가 위 5개 결정을 기준으로 batch별(A0/A1/B/C) spec 본문 변경을 working tree에
draft한다. Claude(checker)가 각 row를 `src/file:line`+test로 직접 재검증하고 리뷰 pass분만 수용한다.

## 2026-06-21 · W7 partial — A0 runtime config + A1 §4 current caveat draft

@user 결정으로 Open Issue 1-5의 처리 기준을 확정하고, Codex가 W7의 첫 작은 draft 단위로
`docs/specs/aiox-a2a.md`를 수정했다. 이번 단위는 A0 runtime config와 A1 §4 protocol core의
high-risk caveat만 반영했다. §5 이후 batch 본문 반영은 아직 수행하지 않았다.

**사용자 결정 반영:**

- runtime config 위치: 별도 `Runtime config / profile namespace` subsection으로 둔다.
- `AIOX_DB_PATH`: resolver scaffold는 Current로 기록하되 production daemon `:memory:` 미배선은
  Implementation Gap으로 분리한다.
- error 명칭: current pre-v1 API reason `no_active_routes`와 v1 canonical
  `route_not_allowed`를 분리한다. W7에서 code reason 변경은 하지 않는다.
- public `deliveryId`: stored `message_deliveries.id`를 그대로 public contract로 확정하지 않고,
  stable external id namespace를 Target/Open으로 둔다.
- correlated reply authorization: current route fan-out과 v1 target candidate(source-only
  delivery correlation)를 분리하고 최종 authorization model은 Open decision으로 유지한다.

**수정한 owner 문서:**

- `docs/specs/aiox-a2a.md`
  - §3.1 `Runtime config / profile namespace` 신설.
  - §4.2 `Current implementation caveats` 추가.
  - `Recommended, not yet approved — correlated reply authorization`을 `Open decision`으로 낮춰
    current route fan-out vs target source-only correlation을 분리.

**Evidence Ledger spot-check (Codex self-check):**

| Topic | Source | Lines | Finding | Classification | Result |
| ----- | ------ | ----- | ------- | -------------- | ------ |
| profile resolver | `src/config/paths.ts`; `tests/unit/config/paths.test.ts` | paths 15-37; test 14-52 | `AIOX_PROFILE` selects `dev/build/release`; invalid value fails fast. | Current Contract | spec §3.1 cite added |
| socket path override | `src/config/paths.ts`; `tests/unit/config/paths.test.ts` | paths 88-102; test 55-84 | `AIOX_SOCKET_PATH` is top-priority absolute override; relative path fails fast; default profile paths are namespaced. | Current Contract | spec §3.1 cite added |
| DB path scaffold | `src/config/paths.ts`; `tests/unit/config/paths.test.ts`; `src/daemon/run.ts` | paths 105-120; test 87-123; run 24-26 | `AIOX_DB_PATH` resolver exists and is tested, but production daemon still opens `:memory:`. | Current scaffold + Implementation Gap | spec §3.1 cite added |
| CLI/child socket propagation | `src/bin/aiox.ts`; `src/cli/invocation.ts`; adapter launchers | bin 78-102, 166-180; invocation 200-254; codex launcher 88-119; claude launcher 94-118 | CLI uses one resolved socket path for daemon/client, and adapters pass it into child env/config as `AIOX_SOCKET_PATH`. | Current Contract | spec §3.1 cite added |
| no route error vocabulary | `src/daemon/state.ts`; tests | state 323-338, 1761-1783; message-fanout test 198-222; codex-ingress test 589-602 | Current pre-v1 API returns `no_active_routes`; v1 `route_not_allowed` remains canonical protocol vocabulary. | Current Contract + Target Contract | spec §4.2 caveat added |
| delivery id exposure | `src/store/schema.ts`; `tests/unit/store/schema.test.ts` | schema 58-67; test 174-195 | Store has `message_deliveries.id`, but public v1 envelope `deliveryId` exposure/external namespace is not implemented/approved. | Implementation Gap/Open Issue | spec §4.2 caveat added |
| current reply routing | `src/daemon/state.ts`; `tests/unit/daemon/codex-ingress.test.ts` | state 315-320, 1800-1821; test 633-710 | Current reply ingress stores `parentMessageId` and dispatches through active outbound routes, not `inReplyToDeliveryId` source-only routing. | Current Contract + Target/Open split | spec §4.2 caveat and Open decision updated |

**검증:**

- `pnpm test tests/unit/config/paths.test.ts tests/unit/daemon/message-fanout-store.test.ts tests/unit/daemon/codex-ingress.test.ts tests/unit/store/schema.test.ts`
  - PASS: 4 files, 70 tests.

**남은 W7 범위:**

- Claude review: 이번 Codex draft의 cite, 상태 라벨, owner 경계 검증.
- W7 계속: A1 §4 나머지 wording 필요 여부, Batch B §5-§6, Batch C §7-§9, Sweep handoff 적용 여부를
  같은 방식으로 작은 단위로 진행.
- W7 완료 전까지 Work Item W7은 active 유지. W8 source-map append와 W9 closeout은 아직 착수하지
  않는다.

## 2026-06-21 · W7 partial Claude review — A0 §3.1 + A1 §4.2 PASS

@claude(checker)가 위 Codex W7 partial draft(A0 runtime config §3.1 + A1 §4.2 caveat +
correlated reply Open decision)를 cross-model full cite spot-check로 리뷰했다. **판정: PASS.**
이 단위를 확정 spec 사실로 수용한다.

**cite full 재검증 (전부 `src/`·tests 직접 확인, 일치):**

- §3.1 profile/socket: `src/config/paths.ts:15-37`(profile dev|build|release, `AIOX_PROFILE`
  우선, invalid fail-fast), `:88-102`(`AIOX_SOCKET_PATH` absolute-only via
  `requireAbsoluteOverride:72-77`, release `~/.aiox/daemon.sock`, dev/build namespaced),
  test `14-52`·`55-84` 일치.
- §3.1 DB scaffold/gap: `src/config/paths.ts:105-120`(getStatePath resolver, docstring
  "SCAFFOLD ONLY — production runs :memory:"), `src/daemon/run.ts:24-26`(`new Database(":memory:")`,
  getStatePath import·호출 없음), test `87-123` 일치.
- §3.1 inheritance: `src/bin/aiox.ts:78-102`(resolved socketPath로 fork)·`166-180`
  (`_run-daemon --socket`), `src/cli/invocation.ts:200-254`(daemonSocketPath launcher 전달),
  `src/adapters/codex/launcher.ts:118`·`claude/launcher.ts:113`(env `AIOX_SOCKET_PATH` 주입)
  일치. address `agent://local/<profile>/<agent-name>`는 spec §2:52 정의와 정합.
- §4.2 error: `src/daemon/state.ts:337`(union)·`1778-1783`(`sourceRoutes.length===0 →
  no_active_routes`), test message-fanout `198-222`·codex-ingress `589-602` 일치.
- §4.2 deliveryId: `src/store/schema.ts:58-67`(`message_deliveries.id` PK), test `174-195` 일치.
- §4.2 reply: `src/daemon/state.ts:315-320`(SendMessageRequest에 parentMessageId 有,
  inReplyToDeliveryId 無)·`1800-1821`(parentMessageId 전달 + source outbound routes fan-out),
  test codex-ingress `633-668`(type:"reply" 고정)·`670-710`(routed dispatch) 일치.

**테스트 직접 재현:** `pnpm test` 4 files / 70 tests PASS (Codex self-check와 동일, cross-model 재현).

**falsifiability gate / 결정 준수:**

- Current로 올린 항목은 전부 src+test cite 있음. scaffold(DB)·Implementation Gap(production
  `:memory:`)·Target/Open(deliveryId)·Open decision(correlated reply)으로 정확히 강등됨 —
  추론이 current contract로 흡수되지 않았다.
- @user 결정 1-5 정확 반영(§3.1 별도 subsection / DB scaffold+gap 분리 / no_active_routes
  유지+route_not_allowed mapping / deliveryId Target·Open / correlated reply current·target
  분리 후 Open).
- `docs/specs/AGENTS.md` 정합: 외부 contract 중심 유지, 내부 HOW 장황 복사 없음, product/roadmap
  scope 미확장.

**Minor 관찰 (블로커 아님, 수용):**

1. §4.2가 `route_not_allowed`를 `no_active_routes`의 "same condition" canonical 명칭으로 매핑.
   결정 3 범위 내 wording이고 "not yet the public API reason"으로 안전 분리됐다. 단
   no_active_routes(source outbound route 부재) ↔ route_not_allowed(라우팅 불허)의 의미 폭 1:1
   여부는 G1 error model 확정 시 재확인 권고.
2. §3.1 status를 정식 `[Status: ...]` 태그 대신 산문("Status: Current for...")으로 표기. 기존
   aiox-a2a.md가 태그 포맷 predates(`docs/specs/AGENTS.md` §2 Note)라 허용 범위. W10 split 시
   정식 태그 전환 후보.
3. **로그 순서 [해소]:** 초기 Codex partial 삽입으로 시간순이 역전됐으나(partial이 결정 블록
   앞), @user 요청으로 controller가 결정 → partial → review 시간순으로 재정렬했다(Codex 산출물
   본문은 미수정, 블록 위치만 조정). 5개 결정의 owner는 결정 블록이며, partial 블록의 "사용자 결정
   반영" 요약과 일부 중복되나 충돌은 없다.

**수용 범위:** 이번 PASS는 A0 §3.1 + A1 §4.2 caveat + correlated reply Open decision 단위에
한정한다. A1 §4 나머지 wording, Batch B §5-§6, Batch C §7-§9, Sweep §10-§13 handoff 적용은 같은
Codex 저작 → Claude 리뷰 방식으로 후속한다.

**다음:** Work Item W7 active 유지. 다음 Codex draft 단위(A1 §4 나머지 또는 B §5-§6) 대기.

## 2026-06-21 · subagent read-path 검증 반영 — W7 Open Issue 4·5 / W9 handoff

@user 요청으로 subagent 2개를 띄워 W7 wording Open Issue 4(`deliveryId` namespace)·5(correlated
reply authorization)와 shared source map consumer binding이 W9/W10 진입 경로에 충분히 연결되는지
검증했다. 두 subagent 모두 파일 수정 없이 read-only 검증을 수행했다.

**확인된 사실:**

- `deliveryId`는 current contract로 고정되지 않았고, `docs/specs/aiox-a2a.md`에서는 public
  `deliveryId` exposure/external namespace를 Implementation Gap/Open Issue로 남긴 상태다.
- correlated reply authorization은 current route-based fan-out과 target source-only delivery
  correlation/Open decision으로 분리되어 있다.
- W9 read-path는 존재한다: parent W4.5 Work Item이 W8 child package 완료 후 W9 재개를 소유하고,
  W9 진입 시 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` source map을 required-read로
  두도록 보강됐다.
- source map consumer binding은 `logs/AGENTS.md`와 parent W4.5 W9/W10 Work Item에 반영됐다.

**정정된 handoff 기준:**

- W7 Open Issue 4·5의 직접 owner는 `docs/product/roadmap.md`의 G1 gate다. `plans/release-plan.md`는
  현재 G6 npm packaging checklist 성격이므로, 이 둘을 release-plan에 중복 반영하지 않는다.
- W9 task brief/closeout에는 "Issue 4·5는 roadmap G1-A/B/D에서 확인하고 release-plan에는 중복
  반영하지 않는다"를 명시한다.
- W10 required-read는 W5 history migration source map의 정확한 경로
  `logs/2026-06-19-workspace-reset-W5-history-migration.md`와
  `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`를 함께 명시한다.

**적용:** parent W4.5 Work Item W9/W10에 위 정정사항을 반영했다. W8 closeout(W9) 때 최신 handoff
블록에도 같은 기준을 재기록한다.

**다음:** Work Item W7 active 유지. 다음 Codex draft 단위(A1 §4 나머지 또는 B §5-§6) 대기.

## 2026-06-21 · W7 partial — Batch B §5-§6 adapter/compose current caveat draft

Codex가 W7의 다음 draft 단위로 `docs/specs/aiox-a2a.md` §5 Adapter와 §6 Compose를 수정했다.
이번 단위는 Batch B Evidence Ledger의 owner body apply 후보 중 Current Contract와
Target/Implementation Gap이 섞여 있던 부분을 좁히는 작업이다. Claude checker review 전이므로,
아래는 Codex self-check 기준이며 최종 PASS는 별도 review 블록이 필요하다.

**수정한 owner 문서:**

- `docs/specs/aiox-a2a.md`
  - §5에 `Current implementation caveats` 추가.
  - current shared adapter interface가 full 4-slot runtime model이 아니라
    `AgentAdapter { kind, inject(input) }`임을 명시.
  - adapter dispatch registry는 아직 production current가 아니며 daemon current path에는
    Codex/Claude direct branch가 남아 있음을 Implementation Gap으로 분리.
  - adapter 4-slot과 pair 2-slot(`PairSlot = "a" | "b"`)을 분리.
  - current code가 typed deferred/failure는 surface하지만 tier evaluator/diagnostics API는 없으므로
    matrix를 complete Tier 1/2 guarantee로 읽지 않도록 제한.
  - Codex/Claude current matrix wording을 local code evidence 중심으로 낮추고, upstream/vendor
    support 상태는 G0/G1 전 재검증 대상으로 분리.
  - §6 Compose status 문장에 current repository spot-check를 추가해 CLI/config/user-facing command
    구현 부재를 명시.

**Evidence Ledger spot-check (Codex self-check):**

| Topic | Source | Lines | Finding | Classification | Result |
| ----- | ------ | ----- | ------- | -------------- | ------ |
| Shared adapter surface | `src/adapters/contract.ts`; `src/adapters/router.ts`; `tests/unit/adapters/fake-integration.test.ts` | contract 19-56; router 87-114, 140-178; test 437-541 | Current shared adapter contract is `kind + inject(input)` with `success/failed/deferred`; missing adapter/deferred injection leave delivery queued/deferred. | Current Contract + Target Contract for full 4-slot | spec §5 caveat added |
| Production dispatch registry gap | `src/daemon/state.ts` | 1274-1277 | Production message dispatch still branches on `targetAgent.kind === "codex"` vs Claude path. | Implementation Gap / Execution Plan | spec §5 caveat added |
| Pair slot separation | `src/core/pairs.ts`; `tests/unit/core/pairs.test.ts` | pairs 23-45, 76-130; test 110-159 | Current pair model is vendor-agnostic two-slot `a|b`; same-vendor pairs can occupy both slots and become ready. | Current Contract | spec §5 caveat added |
| Codex adapter local evidence | `src/adapters/codex/launcher.ts`; `runtime.ts`; `proxy.ts`; `mcp-server.ts` | launcher 40-119; runtime 304-365; proxy 58-193; mcp-server 140-165 | Current local code launches app-server/TUI remote, injects fixed `mcp_servers.aiox`, initializes WS/proxy, observes binding methods, and exposes MCP send/reply daemon client surface. | Current Contract partial | spec §5 matrix evidence added |
| Claude adapter local evidence | `src/adapters/claude/launcher.ts`; `channel-server.ts`; `injector.ts` | launcher 9-27, 94-118, 189-209; channel 258-304, 432-456, 491-520; injector 21-78 | Current local code supports inline/plugin channel launch, identity/socket injection, channel send/reply tools, daemon registration, and daemon-to-channel `/send`; `/send` has no request auth. | Current Contract partial + Implementation Gap | spec §5 matrix evidence added |
| Compose implementation absence | `rg -n "compose\|Compose\|compose.yaml" src tests package.json README.md` | exit 1 / no matches | No compose implementation or user-facing command found in src/tests/package/README. | Target Contract / verified implementation absence | spec §6 status evidence added |

**검증:**

- `pnpm test tests/unit/adapters/fake-integration.test.ts tests/unit/core/pairs.test.ts tests/unit/adapters/codex-launcher.test.ts tests/unit/adapters/codex-runtime.test.ts tests/unit/adapters/codex-proxy.test.ts tests/unit/adapters/codex-mcp-server.test.ts tests/unit/adapters/claude-channel.test.ts tests/unit/adapters/claude-injector.test.ts tests/unit/cli/invocation.test.ts`
  - PASS: 9 files, 135 tests.

**주의 / review 대상:**

- `Current adapter matrix (2026-06-11)` heading은 기존 dated snapshot 제목을 유지했다. 이번 draft는
  upstream/vendor support 주장을 current fact로 재검증하지 않았고, local code evidence와
  “G0/G1 전 재검증”으로 낮췄다. Claude review에서 heading 또는 dated wording이 여전히 과한지
  확인 필요.
- §5에 code line cite가 많이 들어갔다. `docs/specs/AGENTS.md`는 외부 contract 중심을 요구하므로,
  review에서 내부 HOW 과다 여부를 확인해야 한다.

**다음:** Work Item W7 active 유지. Claude checker가 이번 Batch B §5-§6 draft의 cite, 상태 라벨,
owner 경계와 `docs/specs/AGENTS.md` 정합성을 review한다. PASS 전까지 이번 단위는 확정 spec 사실로
보지 않는다.

## 2026-06-21 · [SUPERSEDED] Deferred Review Handoff 템플릿 — W7/W8/W9 세션 분할 운영

> **Superseded (2026-06-21).** 이 블록은 Claude 세션 만료로 즉시 checker review가 불가능했던
> 동안 "Codex가 draft를 미뤄두고(drift) Claude가 나중에 review"하던 임시 세션-분할 운영 모드였다.
> Claude 세션이 복구되고 W7 pending queue가 전부 review PASS됐으므로 이 운영 모드와 전용
> deferred handoff 템플릿을 폐기한다. 이후 W8/W9는 표준 패턴 **Codex 저작(does) → Claude checker
> review**(이 로그 "다음 세션 패턴 확정" 블록)로 진행한다. 세션 간 handoff는 별도 deferred 템플릿이
> 아니라 package log의 active next pointer·Work Items가 소유한다.

## 2026-06-21 · [RESOLVED] W7 Claude review handoff 통합 — Batch B PASS + pending queue + W8 병렬 진행

> **Resolved (2026-06-21).** 아래 pending queue(Batch C §7-§9, §4.5+intro §10-§13, §4 decision 후보)는
> 모두 Claude checker review 완료 — 최하단 "W7 Claude review — pending queue 전체 PASS" 블록 참조.
> W7=[x], W8=[>]. 이 블록은 그 review의 입력(Codex draft handoff) 기록으로 보존한다. 아래
> "Operating guard"의 W7 pending 관련 항목은 그 블록으로 해소됐다.

@user 지시와 최신 상태를 반영해 기존 개별 섹션 3개와 별도 decision draft 로그 내용을 이 섹션 하나로 통합했다.

- 통합 대상:
  - `W7 partial Claude review — Batch B §5-§6 PASS`
  - `Codex handoff — W7 Batch C §7-§9 draft pending Claude review`
  - `Codex handoff — W7 remaining §4.5 + Sweep guard draft pending Claude review`
  - 삭제된 `logs/W8-a2a-lifecycle-correlation-decision-draft.md` 내용
- W7 Claude review는 별도로 병렬 실행한다.
- Codex는 W8 source-map disposition **draft-only** 작업을 진행한다.
- Claude PASS 전까지 pending W7 draft와 W8 draft는 확정 spec/source-map/closeout 사실이 아니다.
- W9 closeout과 parent reflection은 아직 하지 않는다.

### Accepted by Claude review

- A0 §3.1 runtime config.
- A1 §4.2 caveat + correlated reply Open decision.
- Batch B §5-§6 adapter/compose.

### Accepted detail — Batch B §5-§6

Batch B §5 Adapter / §6 Compose 변경은 checker가 full cite spot-check로 리뷰했고 PASS로 수용했다. 이 단위만 확정 spec 사실이다.

Verified cites:

- §5 shared adapter surface:
  - `src/adapters/contract.ts:19-56` — current interface is `AgentAdapter { kind, inject(input) }` with `success | failed | deferred`.
  - `src/adapters/router.ts:87-114`, `src/adapters/router.ts:140-178`, `tests/unit/adapters/fake-integration.test.ts:437-541` — missing adapter and deferred injection surface as queued/deferred.
- §5 production dispatch registry gap:
  - `src/daemon/state.ts:1274-1277` — production message path still uses `targetAgent.kind === "codex"` direct branch and Claude fallback. General adapter dispatch registry is Implementation Gap / execution-plan item, not Current Contract.
- §5 pair slot separation:
  - `src/core/pairs.ts:23-45`, `src/core/pairs.ts:76-130` — `PairSlot = "a" | "b"` two-slot capacity.
  - `tests/unit/core/pairs.test.ts:110-159` — Codex-Codex and Claude-Claude same-vendor pair can fill two slots and become ready.
- §5 Codex local matrix evidence:
  - `src/adapters/codex/launcher.ts:40-119` — app-server/TUI remote and fixed MCP projection.
  - `src/adapters/codex/runtime.ts:304-365` — attach, WS initialize, proxy and failure callback.
  - `src/adapters/codex/proxy.ts:58-193` — binding method observation.
  - `src/adapters/codex/mcp-server.ts:140-165` — MCP send/reply daemon client surface.
- §5 Claude local matrix evidence:
  - `src/adapters/claude/launcher.ts:9-27`, `src/adapters/claude/launcher.ts:94-118`, `src/adapters/claude/launcher.ts:189-209` — inline/plugin launch and identity/socket injection.
  - `src/adapters/claude/channel-server.ts:258-304`, `src/adapters/claude/channel-server.ts:491-520`, `src/adapters/claude/channel-server.ts:432-456`, `src/adapters/claude/injector.ts:21-78` — send/reply tools, daemon registration, daemon-to-channel `/send` push and current request-auth gap.
- §6 Compose absence:
  - `rg -n "compose|Compose|compose.yaml" src tests package.json README.md` returned exit 1 / no matches, matching current CLI/config/user-facing command absence.

Test reproduced:

- `pnpm test tests/unit/adapters/fake-integration.test.ts tests/unit/core/pairs.test.ts tests/unit/adapters/codex-launcher.test.ts tests/unit/adapters/codex-runtime.test.ts tests/unit/adapters/codex-proxy.test.ts tests/unit/adapters/codex-mcp-server.test.ts tests/unit/adapters/claude-channel.test.ts tests/unit/adapters/claude-injector.test.ts tests/unit/cli/invocation.test.ts`
- Result: PASS — 9 files / 135 tests.

Batch B accepted boundary:

- Current로 올린 항목은 code/test cite와 일치한다.
- upstream/vendor support claims는 Current Contract로 승격하지 않고 G0/G1 재검증 대상으로 낮췄다.
- tier matrix는 complete Tier 1/2 guarantee가 아니라 compatibility/status classification으로 제한되어 있다.
- §6 Compose는 Phase 2 committed target과 current implementation absence를 분리한다.
- `docs/specs/AGENTS.md` 정합: 외부 contract·compatibility surface 중심이며, code HOW cite는 current/stale 구분을 falsify하기 위한 evidence로 제한되어 허용 가능하다고 판단했다. Product roadmap과도 충돌하지 않는다.

### Pending Claude review 1 — Batch C §7-§9

Drafted owner changes:

- `docs/specs/aiox-a2a.md` §7 Capability/sandbox:
  - fixed aiox MCP/channel projection 일부만 Current.
  - arbitrary capability compiler와 sandbox enforcement는 미구현/Deferred.
  - Codex fixed `mcp_servers.aiox`, Claude fixed inline/plugin channel projection.
  - registration/ingress auth Current와 Claude daemon→channel `/send` auth gap 분리.
  - durable store/retention 문장에 production `:memory:`와 file-backed state path scaffold cite 추가.
- `docs/specs/aiox-a2a.md` §8 Federation/remote:
  - same-daemon local/socket control-plane은 Current.
  - same-machine multi-daemon, remote, federation은 Deferred/Target.
  - `src`에 federation/remote 구현 파일 없음.
  - daemon-to-daemon WebSocket/token/mTLS, signed envelope/replay protection은 Deferred.
- `docs/specs/aiox-a2a.md` §9 Open/deferred:
  - Codex structured ingress를 fully deferred로 두지 않고 local partial current와 still-open 항목으로 분리.
  - local partial current: `turn/start`, loaded-thread list, proxy thread binding, app-server/WS failure detection.
  - still-open: `thread/inject_items`, `turn/steer`, canonical `deliveryId` binding, active-turn policy, Tier 2 semantics.

Codex cited:

- Fixed Codex aiox projection:
  - `src/adapters/codex/launcher.ts:88-119`
  - `tests/unit/adapters/codex-launcher.test.ts:133-170`
- Fixed Claude aiox projection / channel registration:
  - `src/adapters/claude/launcher.ts:94-117`
  - `src/adapters/claude/launcher.ts:189-206`
  - `src/adapters/claude/channel-server.ts:491-507`
  - `tests/unit/adapters/claude-channel.test.ts:673-739`
- Registration/ingress auth vs Claude reverse push auth gap:
  - `src/daemon/state.ts:926-953`
  - `src/daemon/state.ts:1044-1073`
  - `src/daemon/state.ts:1711-1758`
  - `src/adapters/claude/channel-server.ts:432-456`
  - `docs/decisions/claude-channel-trust-and-registration.md:25-34`
- DB retention gap:
  - `src/daemon/run.ts:24-26`
  - `src/bin/aiox.ts:238-245`
  - `src/bin/aiox.ts:361-363`
  - `src/config/paths.ts:105-120`
- Federation/remote absence and local socket control-plane:
  - `find src -iname '*federation*' -o -iname '*remote*'` returned no matches.
  - `src/daemon/socket-transport.ts:48-85`
- Codex structured ingress partial:
  - `src/adapters/codex/injector.ts:22-63`
  - `src/adapters/codex/runtime.ts:180-190`
  - `src/adapters/codex/runtime.ts:242-285`
  - `src/adapters/codex/runtime.ts:330-365`
  - `src/adapters/codex/proxy.ts:46-58`
  - `src/adapters/codex/proxy.ts:151-194`
  - `tests/unit/adapters/codex-proxy.test.ts:27-97`
  - `src/daemon/state.ts:1418-1482`
  - `src/daemon/state.ts:1684-1696`
- Still-open/deferred search:
  - `rg -n "thread/inject_items|turn/steer|clientUserMessageId|recipient_visibility|hard reply expiration|skill knowledge recall|sandbox enforcement" src tests`
  - Result: exit 1 / no matches.
- Test command:
  - `pnpm test tests/unit/adapters/codex-launcher.test.ts tests/unit/adapters/claude-channel.test.ts tests/unit/adapters/codex-proxy.test.ts tests/unit/daemon/codex-ingress.test.ts tests/unit/config/paths.test.ts`
  - Result: PASS — 5 files / 114 tests.

Claude must review:

- Full cite spot-check for every cite above.
- Whether §7 `registration/ingress auth` wording overclaims Claude channel push security.
- Whether §8 “Current for same-daemon local addressing and local socket control-plane transport” is supported or should be narrowed.
- Whether §9 local Codex partial current wording remains narrow enough and does not imply Tier 2 delivery semantics.
- §7 external contract vs architecture/security internals.
- §8 roadmap/remote sequencing must remain Target/Deferred and not imply product priority.
- §9 must not promote official/vendor app-server method names to Current Contract from source search alone.

### Pending Claude review 2 — §4.5 persistence caveat + §10-§13 owner-boundary guard

Drafted owner changes:

- `docs/specs/aiox-a2a.md` intro:
  - added owner-boundary sentence for legacy source sections §10-§13.
  - §10 metaphors stay out of spec.
  - §11/§12 release gates and audit pressure belong to roadmap/plans.
  - §13 product/architecture rationale belongs to product, architecture or decision owners.
- `docs/specs/aiox-a2a.md` §4.5 Reference runtime persistence minimum:
  - added `Current implementation caveats`.
  - separated current message/domain fields, current fan-out delivery fields, and current SQLite tables from the G1 v1 persistence minimum.
  - marked missing protocol version, canonical source/target address, `intent`, `replyExpected`, public `deliveryId`, retry attempt metadata, ack evidence, reply obligation state and degradation code as current gaps rather than current contract.

Codex cited:

- Current message/domain fields:
  - `src/core/messages.ts:17-23`
  - `src/core/messages.ts:33-40`
- Current fan-out and delivery fields:
  - `src/core/messages.ts:57-74`
  - `src/core/deliveries.ts:13-19`
  - `src/core/deliveries.ts:26-35`
  - `src/store/repositories/deliveries.ts:102-112`
- Current SQLite tables / gap against G1 persistence minimum:
  - `src/store/schema.ts:48-78`
- Sweep owner boundary:
  - W6 Sweep ledger in this log classifies §10 as no spec-body apply, §11/§12 as W9/W10 handoff, and §13 as mostly product/architecture/decision handoff rather than spec contract.
  - `docs/product/roadmap.md:1-212`
  - `plans/release-plan.md:1-70`
- Search/check command:
  - `rg -n "Source sections 10 through 13|Current implementation caveats:|reply obligation state|retry scheduling|message_deliveries" docs/specs/aiox-a2a.md`
  - Result: expected new/related lines found.
- Tests:
  - No test run. Docs-only draft; code behavior unchanged.

Claude must review:

- Full cite spot-check for the §4.5 caveat lines above.
- Whether the intro §10-§13 owner-boundary sentence belongs in the spec owner, or should move to package log/source-map handoff only.
- Whether §4.5 now has too much internal HOW detail for `docs/specs/AGENTS.md`.
- Whether current/gap distinction justifies the code evidence in spec.

### Pending Claude review 3 — §4 lifecycle/correlation WHY decision candidate

Draft location:

- This candidate is recorded in this log only. No `docs/decisions/` file exists yet.
- Former separate draft log `logs/W8-a2a-lifecycle-correlation-decision-draft.md` was removed after merging into this handoff.

Decision candidate:

- A2A v1 treats message lifecycle as a daemon-owned, delivery-correlated protocol contract.
- It separates `type`, `intent`, and `replyExpected`.
- It uses per-target `deliveryId` correlation.
- It uses source-only reply routing as the target direction.
- It keeps the canonical envelope vendor-neutral; adapter-rendered text/tool names are not protocol authority.

WHY candidate:

- `intent` says why the source is sending; it does not tell the target whether a reply is owed.
- `type` is storage/display classification and cannot also own all collaboration semantics.
- fan-out creates one logical message with multiple target deliveries, so reply/idempotency need per-target delivery correlation.
- replies should attach to the original delivery obligation instead of becoming a new outbound route fan-out.
- prompt text and adapter-rendered envelope text can be copied, changed, or forged by model output; daemon store, authenticated identity, token/policy checks, and typed control-plane state remain authoritative.

Sources checked:

- `docs/decisions/AGENTS.md` — decisions own WHY only, reference owner outcomes, and avoid copying owner body.
- `docs/specs/aiox-a2a.md:115-186` — canonical envelope fields, versioning, vendor-neutrality, typed authoring.
- `docs/specs/aiox-a2a.md:188-226` — source-only reply correlation target and current caveats.
- `docs/specs/aiox-a2a.md:228-288` — delivery/ack/retry and reply obligation separation.
- `docs/specs/aiox-a2a.md:309-326` — G1 persistence minimum and current schema gap framing.
- `history/58-post-mvp-a2a-architecture-decisions.history.md:61-100` — legacy P3 lifecycle WHY.
- `prd/post-mvp/archive/claude-codex-validation.md:35-82` — cross-validation rationale for separated axes, vendor neutrality, fan-out, reply routing and daemon authority.
- Existing `docs/decisions/` file list was checked at summary level. No existing decision directly owns this §4 lifecycle/envelope/correlation WHY as a single decision; existing decisions cover adjacent runtime, transport, channel registration, pair/general routing, proxy, and profile namespace rationale.

Claude must review:

- Whether to promote this as one `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md` decision after W7 spec wording PASS, or split it.
- Whether the candidate overstates source-only reply routing while correlated reply authorization remains open: reverse route required vs original delivery obligation grants narrow reply right.
- Whether public `deliveryId` namespace uncertainty is correctly treated as open, not already decided.
- Whether `recipient_visibility` defer and explicit ack surface belong in this same decision or should remain separate Open Issues.

### Operating guard

- W7 remains active until Claude review resolves the pending queue.
- Claude review can run in parallel with Codex continuing W8.
- Codex next work: W8 source-map disposition draft only.
- Do not mark W7 complete before Claude PASS.
- Do not treat pending W7 drafts as accepted spec/decision facts.
- Do not finalize W8 source-map disposition before Claude PASS.
- Do not start W9 closeout or parent reflection as accepted/final work from these drafts.

## 2026-06-21 · W7 Claude review — pending queue 전체 PASS (Batch C §7-§9 + §4.5 + intro §10-§13), §4 decision 후보 W8 이관

@user 지시: 이전 세션 만료로 Codex가 W7 draft를 working tree에 넣고 확정을 미뤄둔(drift) 상태였다. 이번 세션에서 @claude(checker)가 그 pending draft 전체를 cross-model full cite spot-check로 리뷰했다.

**리뷰 방식 판단 (subagent vs 직접) — 직접 수행.** 근거:
1. gate의 cross-model 독립성은 "저작자 Codex ≠ 리뷰어 Claude"로 이미 충족된다. Claude subagent는 controller와 동일 모델이라 독립성 이득이 없고 같은 cite 착각을 공유할 위험만 남는다(이 로그 209-211 producer 논리와 동형).
2. review는 irreversible 게이트(spec 본문 수용)의 판단 단계로 controller가 소유한다(AGENTS.md Evidence/Reporting: 타 에이전트 분석 무비판 수용 금지).
3. W8-0 falsifiability gate·@user wording 결정 5건·`docs/specs/AGENTS.md` 라벨 규칙 등 무거운 package 맥락을 cold subagent에 옮기는 비용이 cite fan-out 절감분보다 크다.
4. 선례 일관성: A0/A1/B PASS도 controller가 직접 수행. cite 수도 3 queue로 bounded.

**리뷰 대상 (Codex pending handoff 3 queue):** Queue 1 Batch C §7-§9 / Queue 2 §4.5 persistence caveat + intro §10-§13 owner-boundary guard / Queue 3 §4 lifecycle/correlation WHY decision 후보.

### Queue 1 — Batch C §7-§9 — PASS

전 cite를 `src/`+test로 직접 재검증, 일치:

- **§7 fixed projection:** `src/adapters/codex/launcher.ts:88-119`(`buildMcpServersAioxInlineToml` = fixed `mcp_servers.aiox` + agentName/token/`AIOX_SOCKET_PATH`), `src/adapters/claude/launcher.ts:94-117`(inline mcpServers env)·`:189-206`(plugin spawn env), `src/adapters/claude/channel-server.ts:491-507`(`registerWithDaemon`→`registerClaudeChannel`). test `codex-launcher.test.ts:133-170`·`claude-channel.test.ts:673-739` 일치(inline + plugin 양 form).
- **§7 auth 분리:** `src/daemon/state.ts:926-953`(`registerClaudeChannel` pending token 검증 + single-use delete), `:1044-1073`(`registerCodexChannel` token 검증), `:1711-1758`(`authorizeCodexIngress` missing/agent_not_registered/disconnected/token_mismatch 거부) = registration/ingress auth 구현. `src/adapters/claude/channel-server.ts:432-456`(`/send` handler가 method/url만 보고 auth 헤더 없이 body 파싱·notify) = reverse push 무인증 Implementation Gap. `docs/decisions/claude-channel-trust-and-registration.md:25`("registration direction only ... does not secure the reverse daemon→channel loopback HTTP `/send`") 정합. → §7 wording이 Claude push 보안을 overclaim하지 않음.
- **§7 DB retention:** `src/daemon/run.ts:24-26`(`:memory:` 하드코딩), `src/bin/aiox.ts:361-363`(동일), `src/config/paths.ts:105-120`(`getStatePath` docstring "SCAFFOLD ONLY — production runs :memory:", 미배선) 일치.
- **§8 federation:** `find src -iname '*federation*' -o -iname '*remote*'` 무출력(부재), `src/daemon/socket-transport.ts:48-85`(Node `net` 소켓 서버 + resolved socketPath) = local control-plane Current / multi-daemon·remote·federation Deferred 정합.
- **§9 Codex structured ingress partial:** `src/adapters/codex/injector.ts:22-63`(`turn/start` + thread mismatch guard), `runtime.ts:242-285`(`thread/loaded/list`; app-server exit·ws onClose → `recordRuntimeFailure`), `:330-365`(attach/WS initialize/startProxy/onRuntimeFailed), `proxy.ts:46-58`(binding methods `thread/start|resume|fork`)·`:151-194`(client/upstream frame 관찰 → `onBinding`), `state.ts:1418-1482`(loaded-thread target 선택 events). still-open(`thread/inject_items`/`turn/steer`/`clientUserMessageId`/sandbox 등) `rg` exit 1(부재) → "does not prove ... Tier 2 delivery semantics" 정확.
- **test 재현(cross-model):** `pnpm test tests/unit/adapters/codex-launcher.test.ts tests/unit/adapters/claude-channel.test.ts tests/unit/adapters/codex-proxy.test.ts tests/unit/daemon/codex-ingress.test.ts tests/unit/config/paths.test.ts` = **5 files / 114 tests PASS** (Codex self-check 114와 동일).

### Queue 2 — §4.5 caveat + intro §10-§13 — PASS

- **§4.5 caveat cite 일치:** `src/core/messages.ts:17-23`(Message = id/sourceAgentId/parentMessageId/type/content; intent/replyExpected/address/protocol/deliveryId/structured content 없음)·`:57-74`(fan-out 1 logical message + route별 queued delivery), `src/core/deliveries.ts:13-19,26-35`, `src/store/repositories/deliveries.ts:102-112`(stored row = generated id/shared messageId/targetAgentId/routeId/status/idempotencyKey; retry/ack/obligation/degradation 없음), `src/store/schema.ts:48-78`(messages/message_deliveries/events + timestamp/correlation id; v1 envelope/ack/retry/obligation 컬럼 없음). → current field/스키마를 G1 persistence minimum과 정확히 분리, current gap으로 강등.
- **§4.3 교차 확인:** §4.3는 전부 normative/G1 target 언어(MUST, "Reference runtime release baseline은 ... MUST 제공한다", "G1 failure-injection 결과로 고정")로 ack/retry/obligation을 *target*으로 기술하며 current 구현으로 주장하지 않는다. §4.5 caveat가 current 부재를 명시하므로 충돌 없음 → §4.3에 별도 current caveat 불필요(남은 §4 wording gap 없음).
- **intro §10-§13 owner-boundary 문장:** PASS. 최초 owner-boundary leak(soon-to-be-deleted legacy doc의 section 번호 참조)을 의심했으나, spec intro(lines 4-13)가 이미 W4부터 legacy monolith의 source-section disposition(section 0→`docs/product/product.md`, section 1→`docs/architecture/local-agent-runtime.md`, gates/audits/rationale→owner)을 문서화하는 패턴을 확립했고 §10-§13 문장은 그와 동형이다. spec intro 자체가 "It was extracted from the legacy PRD monolith" provenance를 owner로 가진다. `docs/specs/AGENTS.md` §1 "일정/계획 혼합 금지"도 roadmap/plans 내용을 섞는 게 아니라 owner를 가리키는 boundary 문장이라 위반 아님.

### Queue 3 — §4 lifecycle/correlation WHY decision 후보 — 승인하되 W8 decision 저작으로 이관

spec 본문 변경이 아니라 decision 후보이며 현재 `docs/decisions/` 파일 미생성(operating guard 준수). 승격은 W8 action(spec wording PASS 이후)으로 적절하다 — wording은 이번 PASS로 충족됨. 승격 시 **2개 구속 조건**을 건다:

1. **correlated reply authorization은 Open 유지.** @user 결정 5에 따라 "reverse directed route 요구 vs original delivery obligation grants narrow reply right"의 최종 인가 모델은 미승인 Open Issue다. decision은 `type`/`intent`/`replyExpected` 분리·vendor-neutral canonical envelope·fan-out(1 logical message = N target deliveries)→per-target delivery correlation·daemon-store authority의 WHY만 소유하고, source-only reply routing을 결정사항으로 단정하지 않는다.
2. **public `deliveryId`는 Target/Open 유지.** @user 결정 4에 따라 stored `message_deliveries.id`와 동일시하는 current contract로 고정하지 않는다.

승격 흐름: W8에서 Codex가 `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`(또는 분할)를 위 조건으로 저작 → Claude 리뷰. 기존 decision 목록에 이 §4 lifecycle/envelope/correlation WHY를 단일 소유하는 decision은 없음(인접 runtime/transport/channel/pair/proxy/profile만 부분 커버)을 producer가 source-check로 확인(이 로그 997-1006).

### Minor 관찰 (블로커 아님, 수용)

1. `src/bin/aiox.ts:238-245`(`createSocketRuntime`)는 `:memory:`가 *기본값*(`options.dbPath` override 가능)으로 `run.ts:24-26`·`bin/aiox.ts:361-363` 하드코딩과 다르다. 다만 `getStatePath` 미배선이라 production에서 file path가 주입되지 않으므로 "production opens :memory:" 결론은 유효. cite는 aggregate로 정확.
2. §5/§7/§4.5의 code line cite 밀도가 높다. Batch B PASS에서 ratify된 기준(code HOW를 current/stale falsify evidence로 제한 시 허용)과 동일하게 수용. W10 split에서 정식 `[Status: ...]` 태그 전환과 함께 cite 정리 후보.
3. intro §10-§13 문장은 lines 11-13 substance와 일부 중복. W10에서 source-section disposition(0 / 1 / 2-9 / 10-13)을 하나로 통합 정리 후보.

### falsifiability gate / @user 결정 / AGENTS.md 정합

- Current로 올린 항목 전부 src+test cite 보유. scaffold(DB)·Implementation Gap(`/send` 무인증, production `:memory:`)·Deferred(federation)·Target/Open(deliveryId)·Open(correlated reply)으로 정확히 강등 — 추론이 current contract로 흡수되지 않음.
- @user wording 결정 1-5 반영 확인(§3.1 별도 subsection / DB scaffold+gap / no_active_routes 유지 + route_not_allowed mapping / deliveryId Target·Open / correlated reply Open).
- `docs/specs/AGENTS.md`: 외부 contract·compatibility 중심, code HOW는 current/stale falsify evidence로 제한, product/roadmap scope 미확장.

### 수용 범위 / 상태

- 이번 PASS로 W7 "Cite spot-check & 본문 반영"의 spec 본문 단위(§3.1·§4.2·§4.5·§5·§6·§7·§8·§9·intro §10-§13)가 모두 Codex 저작 → Claude 리뷰 PASS로 확정됐다. §4.3는 target-framed로 추가 caveat 불필요. Work Item W7 = [x].
- working tree `M docs/specs/aiox-a2a.md`는 review-PASS 상태이나 **uncommitted**. commit은 @user 요청 시에만(harness 규칙: 요청 없이 commit 금지).
- **다음 (W8, active):** Codex가 (a) source-map disposition draft(`logs/2026-06-21-workspace-reset-legacy-source-absorption.md` append/update), (b) §4 lifecycle decision 파일을 위 2 구속 조건으로 저작 → Claude 리뷰. W9 closeout/parent 반영은 그 뒤.
