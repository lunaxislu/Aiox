# Task Brief — W8 Batch A1: protocol core 검증 (§2–§4)

## 맥락

`docs/specs/aiox-a2a.md`는 A2A protocol contract의 primary owner다. 이 batch는 **protocol core**
(glossary, layer model, envelope, routing/reply, delivery/ack/retry, error model, persistence minimum)을
현재 구현, legacy PRD, post-MVP plan, history와 대조해 owner 상태를 정리한다.

결과는 `logs/workspace-reset/packages/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`의 Evidence Ledger / Decision
Candidates / Cross-Owner Effects에 기록한다. **spec 본문은 이 batch에서 수정하지 않는다.**

Controlling log: `logs/workspace-reset/packages/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`.

## 0. 먼저 읽어라

1. Controlling log (Scope, Work Items, 최신 기록, active next pointer, primary owner 현재 구조 Ledger row)
2. `logs/AGENTS.md` (Falsifiability gate·상태 라벨)
3. `docs/specs/AGENTS.md`
4. `docs/decisions/AGENTS.md` — decision 후보가 나오면
5. `logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md`

handoff의 `file:line`은 출발점이다. 판정 전 `src/`에서 재검증한다.
Phase 3 batch agent는 `docs/specs/`, `docs/decisions/`, `docs/architecture/` 등 어떤 owner
문서도 수정하지 않는다. 이 batch의 산출물은 Evidence Ledger / Decision Candidates /
Cross-Owner Effects / Source Map append candidates / Open Questions뿐이다.

## 1. 이 배치 범위

- 대상: current spec `docs/specs/aiox-a2a.md` §2 Glossary, §3 Layer model, §4.1 Canonical envelope v1, §4.2 Routing and reply correlation, §4.3 Delivery/acknowledgement/retry, §4.4 Baseline error model and defaults, §4.5 Reference runtime persistence minimum.
- 제외: config/path gap(A0), §5–§9(B/C), §10–§13(Sweep).
- 이 배치가 답해야 할 질문:
  1. envelope v1 필드(`type`/`intent`/`reply_expected`/`deliveryId`/correlation)가 코드와 일치하는 Current Contract인가?
  2. routing/reply correlation의 source-only reply routing이 코드 동작과 맞는가? (Step 15 2-slot generalization 반영 여부)
  3. delivery/ack/retry defaults, error model defaults가 Current Contract인가?
  4. §4.5 persistence minimum: WAL helper vs in-memory production 경로가 `Current Contract`,
     `Target Contract`, 또는 `Implementation Gap` 중 무엇인지 판정한다(W7 known gap 연계).

## 2. 상태 분류 규칙

`Post-MVP`는 라벨 아님. spec 라벨: `Current Contract`/`Target Contract`/`Proposed Contract`/`Deferred`/`Open Issue`/`Implementation Gap`/`Pre-implementation Blocker`. legacy source: `Stale`.

**Falsifiability gate (필수):** `Current Contract`는 `src/file:line`(+가능하면 test) cite 없으면 금지 → 강등.
**Claim provenance gate (필수):** 각 claim은 `verified fact` / `inference` / `opinion-proposal` /
`current implementation` / `target contract/structure` / `bug fix` / `improvement` /
`stale-drift reference` 중 하나 이상으로 provenance를 표시한다.

## 3. 현재 구현 근거

import/call/test 경로를 끝까지 추적한다.

- §4.1 envelope: `src/core/messages.ts`, `src/core/ids.ts`, `src/adapters/shared/dispatch-schema.ts`
- §4.2 routing/reply: `src/core/routes.ts`, `src/store/repositories/routes.ts`, `src/daemon/state.ts`(`createBidirectionalPairRoutes`)
- §4.3 delivery/ack/retry: `src/core/deliveries.ts`, `src/store/repositories/deliveries.ts`, `src/store/repositories/messages.ts`
- §4.4 error model: `src/daemon/api.ts`, `src/adapters/contract.ts`
- §4.5 persistence: `src/store/schema.ts`, `src/store/sqlite.ts`, `src/store/transaction.ts`, `src/store/repositories/*`
- tool ingress/egress surface: `src/adapters/claude/channel-server.ts`, `src/adapters/codex/mcp-server.ts`
- tests: `tests/unit/core/messages.test.ts`, `tests/unit/core/routes.test.ts`, `tests/unit/core/deliveries.test.ts`,
  `tests/unit/store/repositories/routes.test.ts`, `tests/unit/store/repositories/messages-deliveries.test.ts`,
  `tests/unit/daemon/api.test.ts`, `tests/unit/daemon/message-fanout-store.test.ts`,
  `tests/unit/daemon/message-idempotency-store.test.ts`, `tests/unit/daemon/connect-store.test.ts`,
  `tests/unit/adapters/claude-channel.test.ts`, `tests/unit/adapters/codex-mcp-server.test.ts`,
  `tests/unit/daemon/codex-ingress.test.ts`

## 4. 반드시 교차 검색

- `prd/post-mvp/aiox-a2a-spec.md` §2–§4
- `prd/mvp/aiox-mvp-spec.md` §Core Domain Model, §Fan-Out Behavior
- `history/58-post-mvp-a2a-architecture-decisions.history.md`, Step 15 history(`history/45`~`48`)
- `docs/aiox/mcp-scope-and-daemon-namespace.md`, `docs/aiox/step-14-*`
- W7 생성 decision 문서(`docs/decisions/pair-slot-generalization.md` 등)
- `plans/post-mvp/envelope-metadata.plan.md`, `plan/`, `plans/` (관련 없음이어도 Ledger에 남긴다)

각 source는 `src/` + 날짜/history closeout과 대조한다. post-mvp의 "current snapshot" 서술도 stale일 수 있다.

## 5. Owner 분류 규칙

- external protocol/contract → `docs/specs/aiox-a2a.md`
- internal structure/state/process → `docs/architecture/local-agent-runtime.md` (W7 정합됨; stale면 Cross-Owner Effects)
- rationale/why → `docs/decisions/` (**spec contract를 직접 고정하는 결정만** W8 승격: envelope type/intent/reply_expected, deliveryId, source-only reply routing 등)
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

- §2–§4 claim이 상태 분류됨 (Falsifiability gate 적용)
- §2–§4 claim이 provenance 분류됨 (Claim provenance gate 적용)
- `Current Contract` claim마다 `src/file:line`(+가능하면 test) cite 존재
- handoff/legacy `file:line`은 최종 source에서 재확인했고, 재확인하지 못한 line은 `unverified - regrep required`로 낮춤
- "변경 없음"은 (a) 서술/framing 축과 (b) 동작/트랜잭션 로직 축을 둘 다 `src/`와 대조한 뒤에만 사용
- §4.5 WAL/in-memory가 `Current Contract`/`Target Contract`/`Implementation Gap` 중 하나로 명시됨
- **owner 본문 미수정** — Evidence Ledger / Decision Candidates / Cross-Owner Effects / Source Map candidates / Open Questions만 기록
- decision 후보(contract 고정 rationale)는 Decision Candidates에, 비-contract rationale은 handoff로 분류
- Ledger `Action` 중 후속 항목이 Work Item으로 등록됨
- Workflow retrospective를 controlling log + portable pattern log에 기록
- 다음 batch(B) 또는 cite spot-check(W7)로 이어질 항목이 명확함
