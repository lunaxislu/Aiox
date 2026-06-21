# Task Brief — W8 Batch B: adapter & compose 검증 (§5–§6)

## 맥락

`docs/specs/aiox-a2a.md`는 A2A protocol contract의 primary owner다. 이 batch는 **§5 Adapter
(4-slot + capability tier)와 §6 Compose(declarative composition)**를 현재 구현, legacy PRD,
post-MVP plan과 대조해 owner 상태를 정리한다.

[Inference] `src/`에 `compose.*` 파일이 없다(W8-0 사전 확인). 따라서 §6 Compose는 **Current 구현
부재 → Target/Proposed Contract 후보**일 가능성이 높다. 이 batch의 핵심 판정 질문이다. compose
로직이 다른 파일에 내재했는지 반드시 src에서 직접 확인한다.

결과는 controlling log의 Evidence Ledger / Decision Candidates / Cross-Owner Effects에 기록한다.
**spec 본문은 이 batch에서 수정하지 않는다.**

Controlling log: `logs/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`.
Phase 3 batch agent는 `docs/specs/`, `docs/decisions/`, `docs/architecture/` 등 어떤 owner
문서도 수정하지 않는다. 이 batch의 산출물은 Evidence Ledger / Decision Candidates /
Cross-Owner Effects / Source Map append candidates / Open Questions뿐이다.

## 0. 먼저 읽어라

1. Controlling log (Scope, Work Items, 최신 기록, active next pointer)
2. `logs/AGENTS.md` (Falsifiability gate·상태 라벨)
3. `docs/specs/AGENTS.md`
4. `docs/decisions/AGENTS.md` — decision 후보가 나오면
5. `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`

## 1. 이 배치 범위

- 대상: `docs/specs/aiox-a2a.md` §5 Adapter(4-slot + capability tier), §6 Compose(declarative composition).
- 제외: §2–§4(A1), §7–§9(C), §10–§13(Sweep), config(A0).
- 이 배치가 답해야 할 질문:
  1. adapter 4-slot(launch/attach / ingress / egress / identity, spec §5:343-348)과 capability tier(Tier 1~4, §5:365-379)가 spec §5와 맞는가?
     pair는 Step 15 이후 vendor-agnostic 2-slot(`slot: "a"|"b"`)으로 별도 확인한다.
  2. adapter contract 표면(claude/codex launcher·injector·proxy·app-server)이 spec §5와 일치하는가?
  3. §6 Compose / `compose.yaml` 스키마: spec §6:411이 이미 "Committed target, Phase 2, 현재 CLI/config 미구현"으로 self-declare한다. 이 self-declaration을 src로 확인하고(`rg -i compose src/`), 구현이 없으면 Current로 올리지 않는다.

## 2. 상태 분류 규칙

`Post-MVP`는 라벨 아님. spec 라벨: `Current Contract`/`Target Contract`/`Proposed Contract`/`Deferred`/`Open Issue`/`Implementation Gap`/`Pre-implementation Blocker`. legacy source: `Stale`.

**Falsifiability gate (필수):** `Current Contract`는 `src/file:line`(+가능하면 test) cite 없으면 금지 → 강등. 특히 §6 Compose는 src 구현이 없으면 Current로 쓰지 않는다.
**Claim provenance gate (필수):** 각 claim은 `verified fact` / `inference` / `opinion-proposal` /
`current implementation` / `target contract/structure` / `bug fix` / `improvement` /
`stale-drift reference` 중 하나 이상으로 provenance를 표시한다.

## 3. 현재 구현 근거

import/call/test 경로를 끝까지 추적한다.

- §5 adapter contract/router: `src/adapters/contract.ts`, `src/adapters/router.ts`, `src/adapters/shared/dispatch-schema.ts`
- §5 slot/pair: `src/core/agent-kind.ts`, `src/core/agents.ts`, `src/core/pairs.ts`(`PairSlot = "a"|"b"`), `src/store/repositories/pairs.ts`, `src/store/schema.ts`(`agents.pair_slot`)
- §5 claude adapter: `src/adapters/claude/*` (channel-server, injector, launcher, plugin-cli, preflight, setup)
- §5 codex adapter: `src/adapters/codex/*` (app-server, injector, launcher, mcp-server, proxy, runtime, websocket)
- §6 compose: **src에 compose 파일 없음 — `rg -i compose src/`로 내재 구현 여부 확인**
- tests: `tests/unit/adapters/*`, `tests/unit/core/pairs.test.ts`, `tests/unit/store/repositories/pairs.test.ts`

## 4. 반드시 교차 검색

- `prd/post-mvp/aiox-a2a-spec.md` §5–§6
- `prd/mvp/aiox-mvp-spec.md` §Adapter Scope, §Pair Attach Behavior
- `docs/aiox/` adapter/proxy/app-server 계열: `per-agent-transparent-proxy-decision.md`, `proxy-vs-app-server-tradeoff.md`, `phase-a-design-decisions.md`, `claude-channel-registration-and-trust-model.md`, `codex-thread-focus-and-loaded-list.md`, `pair-attach-kind-mismatch.md`
- `history/58`, Step 15 history(`history/45`~`48`)
- `prd/post-mvp/archive/` 5개 — compose.yaml 스키마·Docker/Mesh/Actor 비교 brainstorm 맥락이 여기 있음(흡수+self-suffic 검증 전 삭제 보류 대상). 흡수 여부를 Archive Gate로 판정
- `plan/`, `plans/post-mvp/adapter-dispatch-registry.plan.md`(관련) — Ledger에 남긴다

각 source는 `src/` + 날짜/history closeout과 대조한다.

## 5. Owner 분류 규칙

- external adapter/compose contract → `docs/specs/aiox-a2a.md`
- internal adapter 구조/책임 → `docs/architecture/local-agent-runtime.md`(W7 정합됨; stale면 Cross-Owner Effects)
- rationale/why → `docs/decisions/` (**spec contract를 직접 고정하는 결정만** W8 승격: capability projection 원칙 등. proxy-vs-app-server 종합 결정서는 architecture 성격 → handoff)
- compose 구현 순서/계획 → `plans/`(Execution Plan)
- stale legacy source → source map disposition

## 6. Evidence Ledger 출력 (controlling log에 기록)

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |

각 row의 Action에는 `owner body apply candidate` / `no owner body apply` / `needs verification` 중
하나를 명시한다.

## 7. Cross-Owner Effects (controlling log에 기록)

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |

## 8. Source Map / Open Questions 출력 (controlling log에 기록)

- Source Map append candidates: `file | claim nature | absorption owner | consuming package | archive? | self-sufficiency check | disposition`
- Open Questions: 추가 검증이 없으면 owner 본문에 반영할 수 없는 질문

## 9. 완료 조건

- §5–§6 claim이 상태 분류됨 (Falsifiability gate 적용)
- §5–§6 claim이 provenance 분류됨 (Claim provenance gate 적용)
- §6 Compose가 Current/Target/Proposed/Deferred 중 무엇인지 src 근거로 확정됨
- `Current Contract` claim마다 `src/file:line`(+test) cite 존재
- handoff/legacy `file:line`은 최종 source에서 재확인했고, 재확인하지 못한 line은 `unverified - regrep required`로 낮춤
- `prd/post-mvp/archive/` compose/adapter brainstorm 맥락의 흡수 여부가 Archive Gate로 판정되고 source map disposition 후보로 기록됨
- **owner 본문 미수정** — Evidence Ledger / Decision Candidates / Cross-Owner Effects / Source Map candidates / Open Questions만 기록
- decision 후보(contract 고정 rationale)와 handoff 대상(architecture debt 등)이 구분됨
- Ledger `Action` 중 후속 항목이 Work Item으로 등록됨
- Workflow retrospective를 controlling log + portable pattern log에 기록
- 다음 batch(C) 또는 cite spot-check(W7)로 이어질 항목이 명확함
