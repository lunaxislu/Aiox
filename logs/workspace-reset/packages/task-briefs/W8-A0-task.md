# Task Brief — W8 Batch A0: config/runtime contract 검증

## 맥락

`docs/specs/aiox-a2a.md`는 A2A protocol contract의 primary owner다. 이 batch는 **runtime/config
contract**(profile namespace, socket/db path override)를 현재 구현, legacy PRD, post-MVP plan과
대조해 owner 상태를 정리한다. protocol message lifecycle(§4)과 분리한 이유는 path/config gap이
lifecycle보다 runtime/config 성격이라 §4 검증과 섞으면 evidence 범위가 폭증하기 때문이다(W8-0 확정).

결과는 `logs/workspace-reset/packages/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`의 Evidence Ledger / Decision
Candidates / Cross-Owner Effects에 기록한다. **spec 본문(`docs/specs/aiox-a2a.md`)은 이 batch에서
수정하지 않는다(Ledger-먼저-본문-나중).**

Controlling log: `logs/workspace-reset/packages/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`.

## 0. 먼저 읽어라

1. Controlling log `logs/workspace-reset/packages/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`
   - Scope, Work Items, 최신 기록, active next pointer, 이 batch 관련 Evidence Ledger rows(W5 B2 spec gap row)
2. `logs/AGENTS.md` (Falsifiability gate·상태 라벨·Archive Gate)
3. `docs/specs/AGENTS.md`
4. `docs/decisions/AGENTS.md` — decision 후보가 나오면
5. `logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md` — disposition append 대상 source map

handoff의 `file:line`은 출발점이다. owner 판정 전에는 최종 source(`src/`)에서 재검증한다.
Phase 3 batch agent는 `docs/specs/`, `docs/decisions/`, `docs/architecture/` 등 어떤 owner
문서도 수정하지 않는다. 이 batch의 산출물은 Evidence Ledger / Decision Candidates /
Cross-Owner Effects / Source Map append candidates / Open Questions뿐이다.

## 1. 이 배치 범위

- 대상: `prd/post-mvp/aiox-a2a-spec.md` §0(정의)·§0.1·§0.2·§1.1 current snapshot·§1.3 install/upgrade/recovery contract 중 **spec으로 흡수할 정의/현재 상태**, 그리고 W5 B2 spec gap(`AIOX_SOCKET_PATH`/`AIOX_DB_PATH`).
- 제외: §4 protocol lifecycle(A1), §5–§9(B/C), §10–§13(Sweep).
- 이 배치가 답해야 할 질문:
  1. `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` absolute override + relative path fail-fast가 **Current Contract**인가? (src cite 필수)
  2. 이 contract를 spec의 어디(§4.5 persistence 인접 또는 신규 config 섹션)에 흡수할지, profile namespace contract(spec 577-582·590-605)와 어떻게 정합하는지.
  3. post-mvp §0 정의 중 현재 spec §2 Glossary에 없는데 contract로 필요한 항목이 있는가?

## 2. 상태 분류 규칙

각 claim을 owner별 상태 라벨로 분류한다. `Post-MVP`는 상태 라벨이 아니라 출처/시점 힌트다.

- spec: `Current Contract` / `Target Contract` / `Proposed Contract` / `Deferred` / `Open Issue` / `Implementation Gap` / `Pre-implementation Blocker`
- legacy source: `Stale`
- **Falsifiability gate (필수):** `Current Contract`로 분류하려면 `src/file:line` + 가능하면 test cite가 있어야 한다. cite가 없으면 `Target Contract`/`Proposed Contract`/`Open Issue`/`Implementation Gap` 중 하나로 강등한다.
- **Claim provenance gate (필수):** 각 claim은 `verified fact` / `inference` / `opinion-proposal` /
  `current implementation` / `target contract/structure` / `bug fix` / `improvement` /
  `stale-drift reference` 중 하나 이상으로 provenance를 표시한다.

## 3. 현재 구현 근거

출발점 파일이다. 여기서 import/call/test 경로를 끝까지 따라간다(미리 준 line ref에서 멈추지 않는다).

- `src/config/paths.ts` — path resolution, `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` absolute override, relative path fail-fast 동작
- `src/store/sqlite.ts` — db path open(WAL helper vs in-memory production 경로 포함)
- `src/daemon/run.ts`, `src/daemon/socket-transport.ts` — socket path 사용 경로
- `src/cli/parse.ts`, `src/cli/invocation.ts` — resolved socket/db path가 CLI/daemon/child process로 전달되는 경로
- `tests/unit/config/paths.test.ts` — config contract 동작 검증
- `tests/unit/cli/invocation.test.ts`, `tests/integration/daemon-client-split.test.ts` — profile/socket path integration evidence

## 4. 반드시 교차 검색

각 source는 현재 사실로 믿지 말고 `src/` + 날짜/history closeout과 대조한다.

- `prd/post-mvp/aiox-a2a-spec.md` §0–§1
- `prd/mvp/aiox-mvp-spec.md` §Storage, §Architecture
- `README.md:65-67` (env contract — code와 일치하는 현재 사실 후보)
- `docs/architecture/local-agent-runtime.md:219-220` (socket path resolution만 소유, absolute override rule 없음 — W7 정합 완료)
- `history/` (profile namespace 관련 — `history/57` runtime profile namespace isolation), `plan/`, `plans/` (관련 없음이어도 Ledger에 남긴다)

## 5. Owner 분류 규칙

- external config/path contract → `docs/specs/aiox-a2a.md` (이 batch의 흡수 후보)
- internal path resolution 구조 → `docs/architecture/local-agent-runtime.md` (W7 정합됨, stale면 Cross-Owner Effects로만)
- rationale/why → `docs/decisions/` (예: history/57 runtime-profile-namespace-isolation는 이미 승격됨 — 재승격 금지, disk 확인)

## 6. Evidence Ledger 출력 (controlling log에 기록)

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |

Finding은 `[Fact]`/`[Inference]`/`[Opinion]`으로 시작한다. Classification은 §2 라벨.
각 row의 Action에는 `owner body apply candidate` / `no owner body apply` / `needs verification` 중
하나를 명시한다.

## 7. Cross-Owner Effects (controlling log에 기록)

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |

## 8. Source Map / Open Questions 출력 (controlling log에 기록)

- Source Map append candidates: `file | claim nature | absorption owner | consuming package | archive? | self-sufficiency check | disposition`
- Open Questions: 추가 검증이 없으면 owner 본문에 반영할 수 없는 질문

## 9. 완료 조건

- 대상 claim이 상태 분류됨 (Falsifiability gate 적용)
- 대상 claim이 provenance 분류됨 (Claim provenance gate 적용)
- `Current Contract` claim마다 `src/file:line`(+가능하면 test) cite 존재
- handoff/legacy `file:line`은 최종 source에서 재확인했고, 재확인하지 못한 line은 `unverified - regrep required`로 낮춤
- `src/tests` 근거와 post-mvp/mvp/README source 대조됨
- **owner 본문 미수정** — Evidence Ledger / Decision Candidates / Cross-Owner Effects / Source Map candidates / Open Questions만 controlling log에 기록
- `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` gap의 흡수 위치 제안과 profile namespace 정합 판단이 Ledger에 남음
- 흡수한 source(`prd/post-mvp` §0–§1 관련, README 해당분) disposition을 source map에 append 후보로 기록
- Ledger `Action` 중 나중에 수행할 항목(본문 반영=W7, decision 승격 등)이 Work Item으로 등록되거나 기존 Work Item이 소유
- Workflow retrospective: batch 분할/task brief/Ledger/Scope 시행착오와 portable 후보를 controlling log + `logs/log-system/2026-06-18-package-workflow-portable-pattern.md`에 기록
- 다음 batch(A1) 또는 cite spot-check(W7)로 이어질 항목이 명확함
