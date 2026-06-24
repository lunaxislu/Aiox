---
topic: workspace reset W5 history migration source/index package
description: workspace reset W5 package — history 최종 삭제 전환을 위한 source/index 작성, decision/log 승격 후보 분류, plan checklist/qa carryover 준비
status: decided
---

## Work Items

- [x] W1 B1 Source Index & Seed Mapping
- [x] W2 B2 Decision Candidates
- [x] W3 B3 Decided Logs / Archive Migration
- [x] W4 B4 Delete Guard / Inbound Cleanup — live refs를 새 owner/archive target으로 repoint하기 전에 각 target이 history 원문 없이도 필요한 현재 사실/WHY/경위를 복원할 수 있는지 확인한다.
- [x] W5 B5 W3-3 Carryover + legacy/prd cleanup handoff — `plan/mvp-implementation-checklist.md`는 W7의 Current as-built/load-bearing 보존 판정과 먼저 reconcile하고, `plan/qa-tracker.md` archive와 G4 delete-only 7개(15·16·19·30·32·43·44) legacy `plan/`·`prd` inbound 정리/이관을 함께 점검한다. W5-제외 `docs/aiox` refs는 docs/aiox 흡수 후 전체 삭제 작업의 dependency로 기록한다. carryover/legacy target도 원본 없이 self-contained인지 검증한다.
- [x] W6 B6 Closeout — deletion gate owner = plan stage, 상세 = logs/2026-06-16-workspace-reset-폴더별-inventory.md. Closeout must explicitly carry docs/aiox refs to legacy checklist/QA and G4 history refs into the integrated physical deletion gate checklist.

### Scope

- Primary output: W5 `history/` source/index. 새 decision 승격이 필요하다고 판정되는 파일의 owner는 `docs/decisions/`다.
- B1 direct updates: 이 로그의 B1 source/index draft, Evidence Ledger, Decision Candidates, Cross-Owner Effects 초안.
- B1 owner-impact only: `docs/decisions/`, `docs/architecture/`, `docs/specs/`, `docs/product/roadmap.md`, `plans/release-plan.md`는 직접 수정하지 않고 Proposed destination, Downstream consumer, Delete guard, Next action, Cross-Owner Effects 후보로만 표시한다.
- Later W5 direct updates: B2 이후 별도 승인·검증된 decision/log/archive migration만 수행한다. B1에서는 `history/`, `plan/`, `plans/`, owner docs 원본을 이동·삭제·수정하지 않는다.
- Exclusions: `docs/aiox` delete/link-hygiene 판단과 정리는 별도 작업. W5에서는 발견 시 dependency로만 기록한다.
- Controlling parent: `logs/2026-06-16-workspace-reset-폴더별-inventory.md`의 active W5 Work Item과 `2026-06-19 · W5 history/migration package preparation` 블록
- Evidence inputs:
  - `logs/2026-06-16-workspace-reset-폴더별-inventory.md` 최신 W5 실행 순서 보정 블록
  - `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` 최신 W7 pointer 소비와 W5 sync 정합화 블록
  - `logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`
  - W7에서 생성한 `docs/decisions/` 6개 문서
  - W7 Evidence Ledger의 history 관련 rows
  - `history/` 전체 목록과 inbound 참조 현황
  - `plan/mvp-implementation-checklist.md`
  - `plan/qa-tracker.md`

## 2026-06-19 · package log 생성

Parent pointer: `logs/2026-06-16-workspace-reset-폴더별-inventory.md` W5

- 사용자 요청 범위에 따라 parent 로그는 수정하지 않고, 이 child package log만 생성한다.
- 이 로그의 seed mapping은 parent의 `2026-06-19 · W5 history/migration package preparation` 블록과 후속 `2026-06-19 · W5 실행 순서 보정 — source/index 선행과 history delete guard` 블록을 1차 권위로 삼는다.
- B1의 이번 생성 단계에서는 disk 존재 확인만 수행하고, inbound 전수조사는 시작하지 않는다.
- B1 next action: `history/` 전 파일에 대해 inbound 참조를 전수 조사하고, W7 absorbed / unprocessed / downstream consumer required / logs archive candidate / final delete candidate를 표로 분류한다.

### Seed Mapping

| Seed history files | Basis | Seed status for W5 | Note |
| --- | --- | --- | --- |
| `history/5`, `history/29` | [Fact] parent W5 prep block + W7 log가 `docs/decisions/codex-per-agent-app-server.md` 승격 완료를 명시 | absorbed by W7; inbound `to verify` | [Fact] target decision file exists on disk. [Inference] content-level trace는 이번 생성 단계에서 재검증하지 않음. |
| `history/13` | [Fact] parent W5 prep block + W7 log가 `docs/decisions/rewrite-go-to-typescript.md` 승격 완료를 명시 | absorbed by W7; inbound `to verify` | [Fact] target decision file exists on disk. |
| `history/28` | [Fact] parent W5 prep block + W7 log가 `docs/decisions/proxy-lazy-observation-cost-model.md` 승격 완료를 명시 | absorbed by W7; inbound `to verify` | [Fact] target decision file exists on disk. |
| `history/38` | [Fact] parent W5 prep block + W7 log가 `docs/decisions/agent-level-mcp-process-scoping.md` 승격 완료를 명시 | absorbed by W7; inbound `to verify` | [Fact] target decision file exists on disk. |
| `history/45`~`history/48` | [Fact] parent W5 prep block이 `docs/decisions/pair-slot-generalization.md` 및 `local-agent-runtime.md` Step 15 반영 근거로 흡수 완료를 명시 | absorbed by W7; inbound `to verify` | [Fact] `docs/decisions/pair-slot-generalization.md` exists. [Inference] Step 15 문서 내 개별 cite는 이번 단계에서 미재검증. |
| `history/49`~`history/56` | [Fact] parent W5 prep block이 `docs/decisions/claude-channel-plugin-default.md` 및 Claude channel D strategy 반영 근거로 흡수 완료를 명시 | absorbed by W7; inbound `to verify` | [Fact] target decision file exists on disk. [Inference] architecture 측 link completeness는 이번 단계에서 미재검증. |
| `history/22`, `history/23`, `history/34` | [Fact] parent W5 prep block이 W7 Evidence Ledger 핵심 line range 검증 완료와 "추가 decision 불필요" 잠정 판정을 명시 | rationale verified in W7; final disposition `to verify` | W5에서 logs archive/delete/consumer-needed 판정 전 inbound와 W8/W10 소비 여부 재확인 필요. |

## Evidence Ledger

| Topic | Source | Lines | Finding | Owner impact | Action |
| ----- | ------ | ----- | ------- | ------------ | ------ |
| B1 history inventory baseline | `history/`, `plan/` | N/A | [Fact] `rg --files history plan`과 `ls` 결과로 `history/` 아래 history 파일 59개(history/1~59)와 `history/README.md` 존재를 확인했다. `plan/`에는 `mvp-implementation-checklist.md`, `qa-tracker.md` 두 파일만 남아 있다. | W5 inventory baseline, W5-4 carryover baseline | 확인 완료. inbound 전수조사는 B1 next action으로 남김 |
| B1 W7 decision seed file existence | `docs/decisions/` | N/A | [Fact] `codex-per-agent-app-server.md`, `rewrite-go-to-typescript.md`, `proxy-lazy-observation-cost-model.md`, `agent-level-mcp-process-scoping.md`, `pair-slot-generalization.md`, `claude-channel-plugin-default.md`가 disk에 존재한다. | absorbed-by-W7 seed를 package 시작점으로 사용할 수 있음 | 확인 완료 |
| B1 downstream consumer constraint | `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md`, parent W5 guard block | Work Items W8/W10, latest W5 guard | [Fact] W8 A2A spec package와 W10 split readiness package가 history/legacy evidence를 후속 입력으로 요구한다. [Inference] W5 B1 source map은 삭제 후보뿐 아니라 후속 consumer가 재사용할 source map이어야 한다. | history/58 및 59는 각각 W8(A2A spec), W10 작업 시 확인할 문서로 보존 | B1 map에 downstream consumer column/notes를 포함하고, history/58은 W8, history/59는 W10 확인 문서로 표시 |

## Decision Candidates

| Source | Lines | Why decision-worthy | Proposed decision | Status |
| ------ | ----- | ------------------- | ----------------- | ------ |
| `history/57-qa-round-4-runtime-namespace-isolation.history.md` | `12-36`, `113-121` | [Fact] QA-003의 dev/build/release runtime namespace 공유 문제를 B안(profile bundle + Unix socket 유지 + 호출부 집중)으로 해결한 WHY, A안 `RuntimeEndpoint` union·manual env 유지·auto-detect-only·env-only 기각 근거가 남아 있다. [Fact] 기존 `docs/decisions/`에는 이 WHY 전용 문서가 없었다. | `docs/decisions/runtime-profile-namespace-isolation.md` | promoted in B2; B4 inbound cleanup/delete guard remains |

## B1 Source Map Output Schema

B1의 산출물은 `history/` 원본을 즉시 삭제하기 위한 판정표가 아니라, 최종 삭제 전환과
후속 W8/W10 소비를 안전하게 만들기 위한 source/index다. Gemini/Claude/Codex 검토는 이
schema를 기준으로 수행한다. B4 이후의 `delete-*`/`logs archive` 판정은 물리 삭제 확정이
아니며, owner/archive target이 history 원본 없이 현재 사실·WHY·검증 맥락을 복원할 수
있는지 별도로 확인해야 한다.

### History source map

| History file | Short summary | Current consumers / inbound | W7 seed status | Proposed destination | Downstream consumer | Delete guard | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

**Column rules:**
- `History file`: `history/` 전체 파일 59개(history/1~59)와 `history/README.md`를 빠짐없이 포함한다.
- `Short summary`: 파일의 핵심 내용. 확인한 내용은 `[Fact]`, 추론은 `[Inference]`로 표시한다.
- `Current consumers / inbound`: disk에서 확인한 inbound 참조. 없으면 `[Fact] none found`처럼 쓴다.
- `W7 seed status`: `absorbed by W7`, `rationale verified in W7`, `not W7 seed`, `to verify` 중 하나로 시작한다.
- `Proposed destination`: `docs/decisions candidate`, `logs archive candidate`, `owner doc already absorbed`, `downstream source only`, `final delete candidate`, `to verify` 중 하나로 시작한다.
- `Downstream consumer`: W8/W10/W9 등 후속 consumer가 있으면 명시한다. 없음을 확인했을 때만 `none found`로 쓴다.
- `Delete guard`: 후속 consumer, inbound, owner 흡수 미확인, docs/aiox dependency, target self-sufficiency 미확인 등 삭제를 막는 조건을 적는다. 삭제 후보도 최종 삭제가 아니라 `candidate after guard cleared`로 쓴다.
- `Next action`: 다음 batch가 해야 할 검증, 승격, archive, inbound 갱신, consumer handoff를 적는다.

### Carryover source map

`plan/mvp-implementation-checklist.md`와 `plan/qa-tracker.md`는 W3-3에서 W5로 이관된
carryover다. B1은 두 파일을 별도 mini-table로 다룬다.

| Carryover file | Short summary | Current consumers / inbound | Proposed destination | Delete/move guard | Next action |
| --- | --- | --- | --- | --- | --- |
| `plan/mvp-implementation-checklist.md` | TBD | TBD | logs archive candidate / to verify | TBD | TBD |
| `plan/qa-tracker.md` | TBD | TBD | logs archive candidate / to verify | TBD | TBD |

Carryover도 동일하게 target self-sufficiency를 확인한다. 단순 archive 후보와 owner 흡수
후 삭제 후보를 분리하고, 삭제 후보는 현재 owner 문서와 archive log만으로 checklist/QA
맥락을 복원할 수 있을 때만 final gate로 넘긴다.

### Classification labels

- `absorbed by W7`: W7에서 decision/architecture/evidence로 이미 흡수된 후보. 내용 재독해보다 W7 ledger와 생성된 decision 문서를 출발점으로 삼는다.
- `decision candidate`: 현재도 유효한 선택 이유가 있고 `docs/decisions/` 승격 후보인 항목.
- `logs archive candidate`: 작업 경위, QA, smoke, 검증 기록으로 `logs/` 보존 후보인 항목.
- `downstream consumer required`: W8/W10/W9 등 후속 작업이 아직 읽어야 하는 항목.
- `final delete candidate`: owner/log/decision 흡수, consumer 해소, target self-sufficiency 확인 뒤 삭제 가능 후보. 지금 삭제 확정이 아니다.
- `downstream consumer unresolved`: W8/W10 작업 시 확인할 문서로 분류되어 삭제 보류된 항목.

## 2026-06-19 · B1 scope 보정 — owner 문서 직접 수정 금지

@user 확인: W5 B1은 `history/` source/index를 먼저 만드는 단계다. 기존 Scope의
`Allowed cross-owner updates` 문구가 `docs/specs/`, `docs/architecture/`,
`docs/product/roadmap.md` 직접 수정까지 허용하는 것처럼 읽힐 수 있어 보정한다.

- [Fact] B1의 직접 산출물은 이 W5 controlling log 안의 source/index draft와 관련 ledger
  초안이다.
- [Fact] `docs/specs/`, `docs/architecture/`, `docs/product/roadmap.md`,
  `plans/release-plan.md`는 B1에서 직접 수정하지 않는다.
- [Fact] `history/` 원본, `plan/mvp-implementation-checklist.md`,
  `plan/qa-tracker.md`도 B1에서 이동·삭제하지 않는다.
- [Inference] 해당 owner 문서에 영향을 줄 수 있는 history 내용은 source map의
  `Proposed destination`, `Downstream consumer`, `Delete guard`, `Next action` 또는
  `Cross-Owner Effects` 후보로만 남기는 것이 W8/W9/W10 후속 소비와 충돌을 줄인다.
- [Fact] Gemini/Claude에게는 이 보정 후 Scope를 우선 적용하도록 전달한다. 이미 owner
  문서를 직접 수정한 작업 결과가 있으면 파일 목록을 먼저 보고하고 멈추게 한다.

### Cross-Owner Effects

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |
| `docs/decisions/runtime-profile-namespace-isolation.md` | runtime profile namespace isolation 결정 승격 완료 | history/57 WHY 미보존 | B2 arbiter가 sources와 decision template 확인 후 생성 |
| plans/post-mvp/adapter-dispatch-registry.plan.md · channel-boot-surface.plan.md | rationale 포인터를 history/45·46·47 → docs/decisions/pair-slot-generalization.md 재지정 | history 삭제 전 dead link 방지 | B4 inbound cleanup에서 실행 |

### Handoff

- Active item: `W2 B2 Decision Candidates`
- Next action: B1 source map의 decision-worthy rows를 검토한다. 우선 `history/57` runtime profile namespace isolation WHY를 `docs/decisions/`로 승격할지 판정하고, 필요하면 `docs/decisions/AGENTS.md`를 읽은 뒤 decision 문서를 작성한다.
- Constraints: parent 로그 수정 금지, B1에서 owner 문서 직접 수정 금지, `history/`·`plan/` 원본 이동/삭제 금지, `docs/aiox` link-hygiene 판단 제외, history/58 및 59는 각각 W8(A2A spec), W10 작업 시 확인할 문서로 지정하여 보존
- Consumer handoff: B1 seed/index는 각 history file의 `absorbed by W7`, `unprocessed`, `delete candidate` 여부뿐 아니라 W8/W10 등 후속 consumer 여부와 근거 owner를 같이 표시해야 한다. consumer가 남은 history 원본은 B4에서 W8/W10 확인 문서로 분류하여 표시한다.
- Open questions: `history/57` decision 승격 여부, logs archive vs final delete candidate 경계, downstream consumer 해소 조건, W3-3 carryover의 최종 archive 위치는 B2/B3/B5에서 근거 확정 필요

### Closeout

- Updated owner documents:
- Validation result:
- Remaining gaps:
- Workflow retrospective:
- Next owner/log:

## 2026-06-19 · B1 source map draft

### History source map

| History file | Short summary | Current consumers / inbound | W7 seed status | Proposed destination | Downstream consumer | Delete guard | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `history/1-bridge.history.md` | [Fact] bridge daemon 및 socket transport 초기 도입 과정에 대한 역사적 맥락 | `[history/5](file:///Users/lunaxislu/Documents/ai-orchestration/history/5-shared-app-server-validation.history.md#L6)`, `[history/9](file:///Users/lunaxislu/Documents/ai-orchestration/history/9-reverse-path-probe-chat-id-followup.history.md#L5)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/2-claude-adapter.history.md` | [Fact] Claude adapter 초기 설계 흔적 | `[history/40](file:///Users/lunaxislu/Documents/ai-orchestration/history/40-step-14-daemon-client-split.history.md#L182)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/3-bridge-live-session-symmetry.history.md` | [Fact] live session symmetry 검증 기록 | [Fact] none found | not W7 seed | final delete candidate | none found | candidate after guard cleared: git repository history preserved | W4 B4 delete execution |
| `history/4-bridge-app-server-live-session-investigation.history.md` | [Fact] bridge app server live session 분석 내용 | `[history/5](file:///Users/lunaxislu/Documents/ai-orchestration/history/5-shared-app-server-validation.history.md#L5)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/5-shared-app-server-validation.history.md` | [Fact] shared app-server (1:N) 아키텍처 타당성 검증 기록 | `[docs/decisions/codex-per-agent-app-server.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/codex-per-agent-app-server.md#L7)`, `[history/6](file:///Users/lunaxislu/Documents/ai-orchestration/history/6-bridge-ws-client-validation.history.md#L5)`, `[logs/2026-06-16-workspace-reset-폴더별-inventory.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-16-workspace-reset-폴더별-inventory.md#L515)`, `[logs/2026-06-18-package-workflow-portable-pattern.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-18-package-workflow-portable-pattern.md#L325)`, `[logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md#L41)`, `[logs/2026-06-19-workspace-reset-W5-history-migration.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-19-workspace-reset-W5-history-migration.md#L45)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active decisions/logs | W4 B4 inbound cleanup |
| `history/6-bridge-ws-client-validation.history.md` | [Fact] bridge websocket client 동작 검증 기록 | `[history/7](file:///Users/lunaxislu/Documents/ai-orchestration/history/7-bridge-reply-collection-bug.history.md#L5)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/7-bridge-reply-collection-bug.history.md` | [Fact] websocket reply collection 과정의 버그 및 수정 기록 | `[history/8](file:///Users/lunaxislu/Documents/ai-orchestration/history/8-bridge-notification-queue-fix.history.md#L4)`, `[history/10](file:///Users/lunaxislu/Documents/ai-orchestration/history/10-reverse-path-inband-relay.history.md#L4)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/8-bridge-notification-queue-fix.history.md` | [Fact] websocket notification queue 동작 이슈 해결 기록 | `[history/9](file:///Users/lunaxislu/Documents/ai-orchestration/history/9-reverse-path-probe-chat-id-followup.history.md#L4)`, `[history/10](file:///Users/lunaxislu/Documents/ai-orchestration/history/10-reverse-path-inband-relay.history.md#L5)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/9-reverse-path-probe-chat-id-followup.history.md` | [Fact] reverse path probe 과정의 chat-id 매핑 팔로우업 | `[history/10](file:///Users/lunaxislu/Documents/ai-orchestration/history/10-reverse-path-inband-relay.history.md#L6)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/10-reverse-path-inband-relay.history.md` | [Fact] reverse path in-band relay 아키텍처 설계와 구현 | `[history/12](file:///Users/lunaxislu/Documents/ai-orchestration/history/12-durable-relay-architecture.history.md#L4)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/11-resume-session-pending-lifecycle.history.md` | [Fact] session resume 및 pending lifecycle 관리 설계 | `[history/12](file:///Users/lunaxislu/Documents/ai-orchestration/history/12-durable-relay-architecture.history.md#L4)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/12-durable-relay-architecture.history.md` | [Fact] durable relay 아키텍처 구조의 타당성 검토 | `[history/13](file:///Users/lunaxislu/Documents/ai-orchestration/history/13-aiox-rewrite-decision.history.md#L4)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/13-aiox-rewrite-decision.history.md` | [Fact] Go 백엔드에서 TypeScript/Node.js 백엔드로의 개작 결정 | `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L1077)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L1152)`, `[docs/decisions/rewrite-go-to-typescript.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/rewrite-go-to-typescript.md#L23)`, `[history/15](file:///Users/lunaxislu/Documents/ai-orchestration/history/15-mvp-design-decisions.history.md#L5)`, `[logs/2026-06-16-workspace-reset-폴더별-inventory.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-16-workspace-reset-폴더별-inventory.md#L516)`, `[logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md#L152)`, `[logs/2026-06-19-workspace-reset-W5-history-migration.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-19-workspace-reset-W5-history-migration.md#L46)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active decisions/docs/logs | W4 B4 inbound cleanup |
| `history/14- aiox-init.history.md` | [Fact] aiox cli init 설계의 역사적 흔적 | [Fact] none found | not W7 seed | final delete candidate | none found | candidate after guard cleared: git repository history preserved | W4 B4 delete execution |
| `history/15-mvp-design-decisions.history.md` | [Fact] MVP core 설계 및 아키텍처 결정 사항들 | `[history/16](file:///Users/lunaxislu/Documents/ai-orchestration/history/16-step-2-sqlite-repository-cleanup.history.md#L6)`, `[history/17](file:///Users/lunaxislu/Documents/ai-orchestration/history/17-step-3-daemon-api-lifecycle.history.md#L6)`, `[history/24](file:///Users/lunaxislu/Documents/ai-orchestration/history/24-step-8-phase-a-decisions.history.md#L7)`, `[history/25](file:///Users/lunaxislu/Documents/ai-orchestration/history/25-step-9-phase-a-real-socket-transport.history.md#L7)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L4)`, `[prd/mvp/aiox-mvp-spec.md](file:///Users/lunaxislu/Documents/ai-orchestration/prd/mvp/aiox-mvp-spec.md#L6)`, `[prd/post-mvp/archive/codex-claude-validation.md](file:///Users/lunaxislu/Documents/ai-orchestration/prd/post-mvp/archive/codex-claude-validation.md#L18)`, `[prd/post-mvp/archive/codex-opinion.md](file:///Users/lunaxislu/Documents/ai-orchestration/prd/post-mvp/archive/codex-opinion.md#L69)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in prd, plans, history | W4 B4 inbound cleanup |
| `history/16-step-2-sqlite-repository-cleanup.history.md` | [Fact] Step 2 SQLite repository cleanup의 의사결정 및 구현 기록 | `[docs/aiox/README.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/README.md#L58)`, `[docs/aiox/pair-attach-kind-mismatch.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/pair-attach-kind-mismatch.md#L5)`, `[history/17](file:///Users/lunaxislu/Documents/ai-orchestration/history/17-step-3-daemon-api-lifecycle.history.md#L7)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L14)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, history | W4 B4 inbound cleanup |
| `history/17-step-3-daemon-api-lifecycle.history.md` | [Fact] Step 3 daemon API 및 daemon lifecycle 구현 기록 | `[history/18](file:///Users/lunaxislu/Documents/ai-orchestration/history/18-step-4-cli-parsing.history.md#L6)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/18-step-4-cli-parsing.history.md` | [Fact] Step 4 CLI parsing 구조 설계 및 마일스톤 완료 기록 | `[history/19](file:///Users/lunaxislu/Documents/ai-orchestration/history/19-step-5-route-fanout-tests.history.md#L6)`, `[history/20](file:///Users/lunaxislu/Documents/ai-orchestration/history/20-step-6-phase-a-decisions.history.md#L6)`, `[history/21](file:///Users/lunaxislu/Documents/ai-orchestration/history/21-step-6-invocation-bin.history.md#L7)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/19-step-5-route-fanout-tests.history.md` | [Fact] Step 5 route fanout 테스트와 check 마크 기록 | `[history/20](file:///Users/lunaxislu/Documents/ai-orchestration/history/20-step-6-phase-a-decisions.history.md#L7)`, `[history/21](file:///Users/lunaxislu/Documents/ai-orchestration/history/21-step-6-invocation-bin.history.md#L8)`, `[history/22](file:///Users/lunaxislu/Documents/ai-orchestration/history/22-step-7-phase-a-decisions.history.md#L8)`, `[history/23](file:///Users/lunaxislu/Documents/ai-orchestration/history/23-step-7-phase-b-pair-daemon.history.md#L7)`, `[history/24](file:///Users/lunaxislu/Documents/ai-orchestration/history/24-step-8-phase-a-decisions.history.md#L8)`, `[history/25](file:///Users/lunaxislu/Documents/ai-orchestration/history/25-step-9-phase-a-real-socket-transport.history.md#L8)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L10)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in plan, history | W4 B4 inbound cleanup |
| `history/20-step-6-phase-a-decisions.history.md` | [Fact] Step 6 Phase A CLI 디자인 및 에러 처리 결정서 | `[docs/aiox/README.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/README.md#L59)`, `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L738)`, `[docs/aiox/step-6-cli-decisions-walkthrough.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/step-6-cli-decisions-walkthrough.md#L4)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L801)`, `[history/21](file:///Users/lunaxislu/Documents/ai-orchestration/history/21-step-6-invocation-bin.history.md#L6)`, `[history/22](file:///Users/lunaxislu/Documents/ai-orchestration/history/22-step-7-phase-a-decisions.history.md#L6)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L519)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, history | W4 B4 inbound cleanup |
| `history/21-step-6-invocation-bin.history.md` | [Fact] Step 6 CLI invocation binary 엔트리 포인트 연동 기록 | `[history/20](file:///Users/lunaxislu/Documents/ai-orchestration/history/20-step-6-phase-a-decisions.history.md#L207)`, `[history/22](file:///Users/lunaxislu/Documents/ai-orchestration/history/22-step-7-phase-a-decisions.history.md#L7)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/22-step-7-phase-a-decisions.history.md` | [Fact] Step 7 daemon lifecycle 및 connection state 기획 의사결정 | `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L818)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L883)`, `[history/23](file:///Users/lunaxislu/Documents/ai-orchestration/history/23-step-7-phase-b-pair-daemon.history.md#L6)`, `[history/24](file:///Users/lunaxislu/Documents/ai-orchestration/history/24-step-8-phase-a-decisions.history.md#L9)`, `[history/25](file:///Users/lunaxislu/Documents/ai-orchestration/history/25-step-9-phase-a-real-socket-transport.history.md#L9)`, `[logs/2026-06-16-workspace-reset-폴더별-inventory.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-16-workspace-reset-폴더별-inventory.md#L521)`, `[logs/2026-06-18-package-workflow-portable-pattern.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-18-package-workflow-portable-pattern.md#L325)`, `[logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md#L140)`, `[logs/2026-06-19-workspace-reset-W5-history-migration.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-19-workspace-reset-W5-history-migration.md#L51)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L561)` | rationale verified in W7 | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, logs, history | W4 B4 inbound cleanup |
| `history/23-step-7-phase-b-pair-daemon.history.md` | [Fact] Step 7 pair daemon pair-up & listen lifecycle 구현 기록 | `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L145)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L184)`, `[history/22](file:///Users/lunaxislu/Documents/ai-orchestration/history/22-step-7-phase-a-decisions.history.md#L272)`, `[history/24](file:///Users/lunaxislu/Documents/ai-orchestration/history/24-step-8-phase-a-decisions.history.md#L10)`, `[history/25](file:///Users/lunaxislu/Documents/ai-orchestration/history/25-step-9-phase-a-real-socket-transport.history.md#L10)`, `[logs/2026-06-16-workspace-reset-폴더별-inventory.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-16-workspace-reset-폴더별-inventory.md#L521)`, `[logs/2026-06-18-package-workflow-portable-pattern.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-18-package-workflow-portable-pattern.md#L325)`, `[logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md#L140)`, `[logs/2026-06-19-workspace-reset-W5-history-migration.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-19-workspace-reset-W5-history-migration.md#L51)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L562)` | rationale verified in W7 | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, logs, history | W4 B4 inbound cleanup |
| `history/24-step-8-phase-a-decisions.history.md` | [Fact] Step 8 socket buffer size 및 multiplexing 결정서 | `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L776)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L837)`, `[history/25](file:///Users/lunaxislu/Documents/ai-orchestration/history/25-step-9-phase-a-real-socket-transport.history.md#L11)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L584)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, history | W4 B4 inbound cleanup |
| `history/25-step-9-phase-a-real-socket-transport.history.md` | [Fact] Step 9 real socket transport 연동 완료 및 closeout | `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L145)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L184)`, `[history/26](file:///Users/lunaxislu/Documents/ai-orchestration/history/26-step-9-socket-transport-hardening.history.md#L6)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L617)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, history | W4 B4 inbound cleanup |
| `history/26-step-9-socket-transport-hardening.history.md` | [Fact] Step 9 socket transport 안정성 및 예외 처리 설계 보강 | `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L189)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L229)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L619)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan | W4 B4 inbound cleanup |
| `history/27-step-10-codex-clear-new-rebind-spike.history.md` | [Fact] Step 10 Codex rebind 메커니즘 검증 및 rebind spike 분석 | `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L511)`, `[docs/aiox/phase-a-design-decisions.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/phase-a-design-decisions.md#L6)`, `[docs/aiox/proxy-attribution-signals.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/proxy-attribution-signals.md#L33)`, `[docs/aiox/proxy-cost-model.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/proxy-cost-model.md#L21)`, `[docs/aiox/proxy-vs-app-server-tradeoff.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/proxy-vs-app-server-tradeoff.md#L23)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L569)`, `[docs/decisions/codex-per-agent-app-server.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/codex-per-agent-app-server.md#L9)`, `[history/28](file:///Users/lunaxislu/Documents/ai-orchestration/history/28-step-10-proxy-lazy-observation.history.md#L14)`, `[history/29](file:///Users/lunaxislu/Documents/ai-orchestration/history/29-step-10-per-agent-app-server-pivot.history.md#L12)`, `[history/30](file:///Users/lunaxislu/Documents/ai-orchestration/history/30-step-10-per-agent-proxy-runtime.history.md#L15)`, `[history/31](file:///Users/lunaxislu/Documents/ai-orchestration/history/31-step-10-per-agent-app-server-runtime.history.md#L9)`, `[history/33](file:///Users/lunaxislu/Documents/ai-orchestration/history/33-step-10-phase-a-decisions.history.md#L6)`, `[history/34](file:///Users/lunaxislu/Documents/ai-orchestration/history/34-step-10-phase-b-codex-runtime.history.md#L86)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L704)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, decisions, history | W4 B4 inbound cleanup |
| `history/28-step-10-proxy-lazy-observation.history.md` | [Fact] transparent proxy의 Node.js blocking 방지를 위한 lazy parse 패턴 | `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L512)`, `[docs/aiox/proxy-attribution-signals.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/proxy-attribution-signals.md#L207)`, `[docs/aiox/proxy-cost-model.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/proxy-cost-model.md#L258)`, `[docs/aiox/proxy-vs-app-server-tradeoff.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/proxy-vs-app-server-tradeoff.md#L24)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L570)`, `[docs/decisions/proxy-lazy-observation-cost-model.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/proxy-lazy-observation-cost-model.md#L23)`, `[history/27](file:///Users/lunaxislu/Documents/ai-orchestration/history/27-step-10-codex-clear-new-rebind-spike.history.md#L920)`, `[history/29](file:///Users/lunaxislu/Documents/ai-orchestration/history/29-step-10-per-agent-app-server-pivot.history.md#L12)`, `[history/30](file:///Users/lunaxislu/Documents/ai-orchestration/history/30-step-10-per-agent-proxy-runtime.history.md#L16)`, `[history/31](file:///Users/lunaxislu/Documents/ai-orchestration/history/31-step-10-per-agent-app-server-runtime.history.md#L10)`, `[logs/2026-06-16-workspace-reset-폴더별-inventory.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-16-workspace-reset-폴더별-inventory.md#L517)`, `[logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md#L153)`, `[logs/2026-06-19-workspace-reset-W5-history-migration.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-19-workspace-reset-W5-history-migration.md#L47)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active decisions/docs/logs | W4 B4 inbound cleanup |
| `history/29-step-10-per-agent-app-server-pivot.history.md` | [Fact] Codex multi-agent 지원 시 1:N에서 1:1 app-server로의 피벗 결정서 | `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L100)`, `[docs/aiox/proxy-vs-app-server-tradeoff.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/proxy-vs-app-server-tradeoff.md#L238)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L113)`, `[docs/decisions/codex-per-agent-app-server.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/codex-per-agent-app-server.md#L47)`, `[history/30](file:///Users/lunaxislu/Documents/ai-orchestration/history/30-step-10-per-agent-proxy-runtime.history.md#L17)`, `[history/31](file:///Users/lunaxislu/Documents/ai-orchestration/history/31-step-10-per-agent-app-server-runtime.history.md#L11)`, `[history/33](file:///Users/lunaxislu/Documents/ai-orchestration/history/33-step-10-phase-a-decisions.history.md#L7)`, `[logs/2026-06-16-workspace-reset-폴더별-inventory.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-16-workspace-reset-폴더별-inventory.md#L515)`, `[logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md#L41)`, `[logs/2026-06-19-workspace-reset-W5-history-migration.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-19-workspace-reset-W5-history-migration.md#L45)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active decisions/docs/logs | W4 B4 inbound cleanup |
| `history/30-step-10-per-agent-proxy-runtime.history.md` | [Fact] Step 10 per-agent proxy runtime 설계 및 프로세스 스케줄링 검증 | `[docs/aiox/proxy-vs-app-server-tradeoff.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/proxy-vs-app-server-tradeoff.md#L238)`, `[history/31](file:///Users/lunaxislu/Documents/ai-orchestration/history/31-step-10-per-agent-app-server-runtime.history.md#L12)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, history | W4 B4 inbound cleanup |
| `history/31-step-10-per-agent-app-server-runtime.history.md` | [Fact] Step 10 per-agent app server 런타임 모델 설계 결정서 | `[docs/aiox/README.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/README.md#L64)`, `[docs/aiox/agent-runtime-container-model.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/agent-runtime-container-model.md#L5)`, `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L101)`, `[docs/aiox/proxy-attribution-signals.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/proxy-attribution-signals.md#L5)`, `[docs/aiox/proxy-cost-model.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/proxy-cost-model.md#L4)`, `[docs/aiox/proxy-vs-app-server-tradeoff.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/proxy-vs-app-server-tradeoff.md#L5)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L114)`, `[docs/decisions/codex-per-agent-app-server.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/codex-per-agent-app-server.md#L61)`, `[history/27](file:///Users/lunaxislu/Documents/ai-orchestration/history/27-step-10-codex-clear-new-rebind-spike.history.md#L7)`, `[history/28](file:///Users/lunaxislu/Documents/ai-orchestration/history/28-step-10-proxy-lazy-observation.history.md#L5)`, `[history/29](file:///Users/lunaxislu/Documents/ai-orchestration/history/29-step-10-per-agent-app-server-pivot.history.md#L5)`, `[history/30](file:///Users/lunaxislu/Documents/ai-orchestration/history/30-step-10-per-agent-proxy-runtime.history.md#L7)`, `[history/32](file:///Users/lunaxislu/Documents/ai-orchestration/history/32-step-10-per-agent-app-server-resume-spike.history.md#L7)`, `[history/33](file:///Users/lunaxislu/Documents/ai-orchestration/history/33-step-10-phase-a-decisions.history.md#L8)`, `[history/34](file:///Users/lunaxislu/Documents/ai-orchestration/history/34-step-10-phase-b-codex-runtime.history.md#L7)`, `[history/41](file:///Users/lunaxislu/Documents/ai-orchestration/history/41-codex-loaded-thread-binding-analysis.history.md#L12)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L691)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, decisions, history | W4 B4 inbound cleanup |
| `history/32-step-10-per-agent-app-server-resume-spike.history.md` | [Fact] app server resume spike 측정 및 wrong-thread delivery 검증 기록 | `[docs/aiox/README.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/README.md#L65)`, `[history/33](file:///Users/lunaxislu/Documents/ai-orchestration/history/33-step-10-phase-a-decisions.history.md#L4)`, `[history/34](file:///Users/lunaxislu/Documents/ai-orchestration/history/34-step-10-phase-b-codex-runtime.history.md#L8)`, `[history/41](file:///Users/lunaxislu/Documents/ai-orchestration/history/41-codex-loaded-thread-binding-analysis.history.md#L772)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L722)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, history | W4 B4 inbound cleanup |
| `history/33-step-10-phase-a-decisions.history.md` | [Fact] Step 10 Phase A 앱 서버 실행 및 TUI 통신 설계 결정서 | `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L764)`, `[docs/aiox/phase-a-design-decisions.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/phase-a-design-decisions.md#L5)`, `[docs/aiox/round-4-tui-smoke-check.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/round-4-tui-smoke-check.md#L4)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L827)`, `[docs/decisions/codex-per-agent-app-server.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/codex-per-agent-app-server.md#L62)`, `[history/34](file:///Users/lunaxislu/Documents/ai-orchestration/history/34-step-10-phase-b-codex-runtime.history.md#L6)`, `[history/35](file:///Users/lunaxislu/Documents/ai-orchestration/history/35-step-11-phase-a-claude-channel-decisions.history.md#L15)`, `[history/41](file:///Users/lunaxislu/Documents/ai-orchestration/history/41-codex-loaded-thread-binding-analysis.history.md#L12)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L740)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, decisions, history | W4 B4 inbound cleanup |
| `history/34-step-10-phase-b-codex-runtime.history.md` | [Fact] Step 10 Phase B Codex 런타임 에러 처리 정책 및 channel-server 구현 | `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L94)`, `[docs/aiox/observation-asymmetry-and-d7-pivot.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/observation-asymmetry-and-d7-pivot.md#L80)`, `[docs/aiox/round-4-tui-smoke-check.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/round-4-tui-smoke-check.md#L5)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L107)`, `[history/33](file:///Users/lunaxislu/Documents/ai-orchestration/history/33-step-10-phase-a-decisions.history.md#L498)`, `[history/35](file:///Users/lunaxislu/Documents/ai-orchestration/history/35-step-11-phase-a-claude-channel-decisions.history.md#L9)`, `[logs/2026-06-16-workspace-reset-폴더별-inventory.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-16-workspace-reset-폴더별-inventory.md#L521)`, `[logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md#L139)`, `[logs/2026-06-19-workspace-reset-W5-history-migration.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-19-workspace-reset-W5-history-migration.md#L51)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L675)` | rationale verified in W7 | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, logs, history | W4 B4 inbound cleanup |
| `history/35-step-11-phase-a-claude-channel-decisions.history.md` | [Fact] Step 11 Phase A Claude 채널 등록 프로토콜 및 trust model 설계 | `[docs/aiox/industry-precedents-and-observability-models.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/industry-precedents-and-observability-models.md#L40)`, `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L297)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L344)`, `[history/40](file:///Users/lunaxislu/Documents/ai-orchestration/history/40-step-14-daemon-client-split.history.md#L186)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L825)`, `[spikes/claude-channel-registration-poc/README.md](file:///Users/lunaxislu/Documents/ai-orchestration/spikes/claude-channel-registration-poc/README.md#L6)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, spikes, history | W4 B4 inbound cleanup |
| `history/36-step-12-phase-a-doctor-status-decisions.history.md` | [Fact] Step 12 Phase A doctor status 및 dynamic diagnostic API 설계 | `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L885)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L952)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L862)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan | W4 B4 inbound cleanup |
| `history/37-step-13-14-mvp-manual-e2e-planning.history.md` | [Fact] Step 13, 14 MVP 통합 e2e 시나리오 작성 검증 계획 | `[history/39](file:///Users/lunaxislu/Documents/ai-orchestration/history/39-step-13-codex-mcp-ingress.history.md#L276)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in other history files | W4 B4 inbound cleanup |
| `history/38-step-13-mcp-scope-decision.history.md` | [Fact] per-process mcp config dynamic injection 결정서 | `[docs/aiox/README.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/README.md#L66)`, `[docs/aiox/mcp-scope-and-daemon-namespace.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mcp-scope-and-daemon-namespace.md#L3)`, `[docs/decisions/agent-level-mcp-process-scoping.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/agent-level-mcp-process-scoping.md#L23)`, `[history/39](file:///Users/lunaxislu/Documents/ai-orchestration/history/39-step-13-codex-mcp-ingress.history.md#L8)`, `[logs/2026-06-16-workspace-reset-폴더별-inventory.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-16-workspace-reset-폴더별-inventory.md#L518)`, `[logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md#L154)`, `[logs/2026-06-19-workspace-reset-W5-history-migration.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-19-workspace-reset-W5-history-migration.md#L48)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active decisions/docs/logs | W4 B4 inbound cleanup |
| `history/39-step-13-codex-mcp-ingress.history.md` | [Fact] Step 13 Codex MCP ingress 연결 구조 검증 기록 | `[docs/aiox/mcp-scope-and-daemon-namespace.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mcp-scope-and-daemon-namespace.md#L156)`, `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L622)`, `[docs/aiox/step-14-codex-mcp-remote-architecture-bug.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/step-14-codex-mcp-remote-architecture-bug.md#L94)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L679)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L882)`, `[prd/mvp/aiox-mvp-spec.md](file:///Users/lunaxislu/Documents/ai-orchestration/prd/mvp/aiox-mvp-spec.md#L725)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, prd | W4 B4 inbound cleanup |
| `history/40-step-14-daemon-client-split.history.md` | [Fact] Step 14 daemon과 client 분리 구조 설계 및 CLI entrypoint | `[docs/aiox/codex-thread-focus-and-loaded-list.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/codex-thread-focus-and-loaded-list.md#L8)`, `[docs/aiox/mvp-architecture.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L353)`, `[docs/aiox/step-14-codex-mcp-remote-architecture-bug.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/step-14-codex-mcp-remote-architecture-bug.md#L3)`, `[docs/aiox/step-14-codex-thread-mismatch-discovery.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/step-14-codex-thread-mismatch-discovery.md#L109)`, `[docs/aiox/step-14-smoke-test-report.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/step-14-smoke-test-report.md#L5)`, `[docs/architecture/local-agent-runtime.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L407)`, `[history/39](file:///Users/lunaxislu/Documents/ai-orchestration/history/39-step-13-codex-mcp-ingress.history.md#L291)`, `[history/41](file:///Users/lunaxislu/Documents/ai-orchestration/history/41-codex-loaded-thread-binding-analysis.history.md#L10)`, `[history/42](file:///Users/lunaxislu/Documents/ai-orchestration/history/42-mvp-implementation-closeout.history.md#L11)`, `[history/59](file:///Users/lunaxislu/Documents/ai-orchestration/history/59-local-obsidian-vault-atlas-discussion.history.md#L9)`, `[plan/mvp-implementation-checklist.md](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L988)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in docs, plan, history | W4 B4 inbound cleanup |
| `history/41-codex-loaded-thread-binding-analysis.history.md` | [Fact] Codex `/resume` 및 `/clear` 시 wrong-thread delivery 문제(orphan thread 발생 현상)를 분석하고, 1:1 app-server + transparent proxy 구조 도입의 기초 분석을 수행한 문서. | `[docs/aiox/README.md#L63](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/README.md#L63)`, `[docs/aiox/README.md#L67](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/README.md#L67)`, `[docs/aiox/codex-thread-focus-and-loaded-list.md#L9](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/codex-thread-focus-and-loaded-list.md#L9)`, `[docs/aiox/mvp-architecture.md#L472](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L472)`, `[docs/aiox/mvp-architecture.md#L561](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L561)`, `[docs/aiox/mvp-architecture.md#L1050](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L1050)`, `[docs/aiox/observation-asymmetry-and-d7-pivot.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/observation-asymmetry-and-d7-pivot.md#L8)`, `[docs/aiox/observation-asymmetry-and-d7-pivot.md#L70](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/observation-asymmetry-and-d7-pivot.md#L70)`, `[docs/aiox/per-agent-transparent-proxy-decision.md#L9](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/per-agent-transparent-proxy-decision.md#L9)`, `[docs/aiox/proxy-attribution-signals.md#L12](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/proxy-attribution-signals.md#L12)`, `[docs/aiox/proxy-vs-app-server-tradeoff.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/proxy-vs-app-server-tradeoff.md#L8)`, `[docs/architecture/local-agent-runtime.md#L530](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L530)`, `[docs/architecture/local-agent-runtime.md#L619](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L619)`, `[history/42-mvp-implementation-closeout.history.md#L12](file:///Users/lunaxislu/Documents/ai-orchestration/history/42-mvp-implementation-closeout.history.md#L12)`, `[history/45-step-15-pair-slot-generalization-design.history.md#L244](file:///Users/lunaxislu/Documents/ai-orchestration/history/45-step-15-pair-slot-generalization-design.history.md#L244)`, `[plan/mvp-implementation-checklist.md#L736](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L736)`, `[plan/mvp-implementation-checklist.md#L1040](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L1040)`, `[plan/mvp-implementation-checklist.md#L1041](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L1041)`, `[plan/mvp-implementation-checklist.md#L1044](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L1044)`, `[plan/mvp-implementation-checklist.md#L1045](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L1045)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in active decisions/docs/plans | W4 B4 inbound cleanup |
| `history/42-mvp-implementation-closeout.history.md` | [Fact] MVP 구현 종료(Closeout) 선언 문서로서, 전체 48개 파일, 360개 테스트 통과 등 검증 베이스라인을 선언하고 MVP 구현 범위를 확정한 기록. | `[docs/aiox/mvp-architecture.md#L101](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L101)`, `[docs/aiox/mvp-architecture.md#L512](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L512)`, `[docs/aiox/mvp-architecture.md#L561](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L561)`, `[docs/aiox/mvp-architecture.md#L1034](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L1034)`, `[docs/aiox/mvp-architecture.md#L1050](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L1050)`, `[docs/aiox/mvp-architecture.md#L1060](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L1060)`, `[docs/aiox/mvp-architecture.md#L1077](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L1077)`, `[docs/architecture/local-agent-runtime.md#L114](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L114)`, `[docs/architecture/local-agent-runtime.md#L570](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L570)`, `[docs/architecture/local-agent-runtime.md#L619](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L619)`, `[docs/architecture/local-agent-runtime.md#L1112](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L1112)`, `[docs/architecture/local-agent-runtime.md#L1152](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L1152)`, `[history/43-qa-round-1.history.md#L9](file:///Users/lunaxislu/Documents/ai-orchestration/history/43-qa-round-1.history.md#L9)`, `[history/44-qa-round-2.history.md#L11](file:///Users/lunaxislu/Documents/ai-orchestration/history/44-qa-round-2.history.md#L11)`, `[history/49-claude-mcp-config-injection-feasibility.history.md#L158](file:///Users/lunaxislu/Documents/ai-orchestration/history/49-claude-mcp-config-injection-feasibility.history.md#L158)`, `[history/50-claude-channel-injection-verification-and-strategy.history.md#L15](file:///Users/lunaxislu/Documents/ai-orchestration/history/50-claude-channel-injection-verification-and-strategy.history.md#L15)`, `[plan/mvp-implementation-checklist.md#L20](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L20)`, `[plan/qa-tracker.md#L10](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L10)`, `[plan/qa-tracker.md#L162](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L162)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in active docs/plans | W4 B4 inbound cleanup |
| `history/43-qa-round-1.history.md` | [Fact] QA Round 1 진행 문서로서, Claude channel disconnect 시 DB 상태 및 pending token 갱신 누락 버그(QA-001)를 수동 테스트하고 닫은 기록. | `[plan/qa-tracker.md#L50](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L50)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in active plan | W4 B4 inbound cleanup |
| `history/44-qa-round-2.history.md` | [Fact] QA Round 2 진행 문서로서, aiox MCP collaboration protocol Phase 1.5 smoke 테스트(이슈 QA-002 발견) 수행 기록. | `[history/43-qa-round-1.history.md#L114](file:///Users/lunaxislu/Documents/ai-orchestration/history/43-qa-round-1.history.md#L114)`, `[plan/qa-tracker.md#L51](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L51)` | not W7 seed | logs archive candidate | none found | candidate after guard cleared: referenced in plans and other history | W4 B4 inbound cleanup |
| `history/45-step-15-pair-slot-generalization-design.history.md` | [Fact] slot 모델을 vendor 종류와 무관한 일반 routing 모델로 격상하기 위해, kind-bound slot을 kind-agnostic 2-slot으로 설계한 권위 결정 기록. | `[docs/architecture/local-agent-runtime.md#L660](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L660)`, `[docs/decisions/pair-slot-generalization.md#L92](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/pair-slot-generalization.md#L92)`, `[history/44-qa-round-2.history.md#L91](file:///Users/lunaxislu/Documents/ai-orchestration/history/44-qa-round-2.history.md#L91)`, `[history/44-qa-round-2.history.md#L125](file:///Users/lunaxislu/Documents/ai-orchestration/history/44-qa-round-2.history.md#L125)`, `[history/44-qa-round-2.history.md#L139](file:///Users/lunaxislu/Documents/ai-orchestration/history/44-qa-round-2.history.md#L139)`, `[history/44-qa-round-2.history.md#L150](file:///Users/lunaxislu/Documents/ai-orchestration/history/44-qa-round-2.history.md#L150)`, `[history/46-step-15-phase-a-decisions.history.md#L9](file:///Users/lunaxislu/Documents/ai-orchestration/history/46-step-15-phase-a-decisions.history.md#L9)`, `[history/46-step-15-phase-a-decisions.history.md#L225](file:///Users/lunaxislu/Documents/ai-orchestration/history/46-step-15-phase-a-decisions.history.md#L225)`, `[history/46-step-15-phase-a-decisions.history.md#L254](file:///Users/lunaxislu/Documents/ai-orchestration/history/46-step-15-phase-a-decisions.history.md#L254)`, `[history/47-step-15-phase-b-closeout.history.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/history/47-step-15-phase-b-closeout.history.md#L8)`, `[history/47-step-15-phase-b-closeout.history.md#L23](file:///Users/lunaxislu/Documents/ai-orchestration/history/47-step-15-phase-b-closeout.history.md#L23)`, `[history/47-step-15-phase-b-closeout.history.md#L188](file:///Users/lunaxislu/Documents/ai-orchestration/history/47-step-15-phase-b-closeout.history.md#L188)`, `[history/47-step-15-phase-b-closeout.history.md#L213](file:///Users/lunaxislu/Documents/ai-orchestration/history/47-step-15-phase-b-closeout.history.md#L213)`, `[history/47-step-15-phase-b-closeout.history.md#L219](file:///Users/lunaxislu/Documents/ai-orchestration/history/47-step-15-phase-b-closeout.history.md#L219)`, `[plan/mvp-implementation-checklist.md#L1088](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L1088)`, `[plan/mvp-implementation-checklist.md#L1106](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L1106)`, `[plan/mvp-implementation-checklist.md#L1115](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L1115)`, `[plans/post-mvp/adapter-dispatch-registry.plan.md#L10](file:///Users/lunaxislu/Documents/ai-orchestration/plans/post-mvp/adapter-dispatch-registry.plan.md#L10)`, `[plans/post-mvp/adapter-dispatch-registry.plan.md#L52](file:///Users/lunaxislu/Documents/ai-orchestration/plans/post-mvp/adapter-dispatch-registry.plan.md#L52)`, `[prd/mvp/aiox-mvp-spec.md#L505](file:///Users/lunaxislu/Documents/ai-orchestration/prd/mvp/aiox-mvp-spec.md#L505)` | absorbed by W7 | owner doc already absorbed | plans/post-mvp/adapter-dispatch-registry.plan.md (rationale L10, L52) | candidate after guard cleared: 삭제·archive 전 위 plan들의 rationale 포인터를 docs/decisions/pair-slot-generalization.md로 재지정 필요 | W4 B4 inbound cleanup |
| `history/46-step-15-phase-a-decisions.history.md` | [Fact] Step 15 Phase A 의사결정서로서, kind-neutral 2-slot 및 dispatch 일반화, Codex fallback 비활성화 등 9가지 핵심 의사결정(D1-D9) 확정 기록. | `[docs/architecture/local-agent-runtime.md#L139](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L139)`, `[docs/decisions/pair-slot-generalization.md#L94](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/pair-slot-generalization.md#L94)`, `[history/44-qa-round-2.history.md#L131](file:///Users/lunaxislu/Documents/ai-orchestration/history/44-qa-round-2.history.md#L131)`, `[history/44-qa-round-2.history.md#L140](file:///Users/lunaxislu/Documents/ai-orchestration/history/44-qa-round-2.history.md#L140)`, `[history/44-qa-round-2.history.md#L150](file:///Users/lunaxislu/Documents/ai-orchestration/history/44-qa-round-2.history.md#L150)`, `[history/47-step-15-phase-b-closeout.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/47-step-15-phase-b-closeout.history.md#L7)`, `[history/47-step-15-phase-b-closeout.history.md#L23](file:///Users/lunaxislu/Documents/ai-orchestration/history/47-step-15-phase-b-closeout.history.md#L23)`, `[history/47-step-15-phase-b-closeout.history.md#L214](file:///Users/lunaxislu/Documents/ai-orchestration/history/47-step-15-phase-b-closeout.history.md#L214)`, `[history/48-step-15-d8-surface-consistency.history.md#L9](file:///Users/lunaxislu/Documents/ai-orchestration/history/48-step-15-d8-surface-consistency.history.md#L9)`, `[plan/mvp-implementation-checklist.md#L1089](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L1089)`, `[plan/mvp-implementation-checklist.md#L1094](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L1094)`, `[plan/mvp-implementation-checklist.md#L1106](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L1106)`, `[plan/mvp-implementation-checklist.md#L1115](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L1115)`, `[plans/post-mvp/adapter-dispatch-registry.plan.md#L53](file:///Users/lunaxislu/Documents/ai-orchestration/plans/post-mvp/adapter-dispatch-registry.plan.md#L53)` | absorbed by W7 | owner doc already absorbed | plans/post-mvp/adapter-dispatch-registry.plan.md (rationale L10, L53) | candidate after guard cleared: 삭제·archive 전 위 plan들의 rationale 포인터를 docs/decisions/pair-slot-generalization.md로 재지정 필요 | W4 B4 inbound cleanup |
| `history/47-step-15-phase-b-closeout.history.md` | [Fact] Step 15 Phase B 구현 완료 기록으로서, single green commit 정책 도입, schema version 1 마이그레이션 및 same-vendor 라우팅 구현 완료 기록. (Note: W7 검증 당시 F1(lines 55-60)이 추가 의사결정 불필요로 판정함) | `[docs/architecture/local-agent-runtime.md#L139](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L139)`, `[docs/decisions/pair-slot-generalization.md#L97](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/pair-slot-generalization.md#L97)`, `[history/45-step-15-pair-slot-generalization-design.history.md#L190](file:///Users/lunaxislu/Documents/ai-orchestration/history/45-step-15-pair-slot-generalization-design.history.md#L190)`, `[history/48-step-15-d8-surface-consistency.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/48-step-15-d8-surface-consistency.history.md#L7)`, `[history/48-step-15-d8-surface-consistency.history.md#L10](file:///Users/lunaxislu/Documents/ai-orchestration/history/48-step-15-d8-surface-consistency.history.md#L10)`, `[plan/mvp-implementation-checklist.md#L1090](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L1090)`, `[plan/qa-tracker.md#L40](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L40)`, `[plan/qa-tracker.md#L51](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L51)`, `[plans/post-mvp/adapter-dispatch-registry.plan.md#L54](file:///Users/lunaxislu/Documents/ai-orchestration/plans/post-mvp/adapter-dispatch-registry.plan.md#L54)`, `[plans/post-mvp/channel-boot-surface.plan.md#L10](file:///Users/lunaxislu/Documents/ai-orchestration/plans/post-mvp/channel-boot-surface.plan.md#L10)`, `[plans/post-mvp/channel-boot-surface.plan.md#L47](file:///Users/lunaxislu/Documents/ai-orchestration/plans/post-mvp/channel-boot-surface.plan.md#L47)` | absorbed by W7 | owner doc already absorbed | plans/post-mvp/adapter-dispatch-registry.plan.md (rationale L10, L54) + plans/post-mvp/channel-boot-surface.plan.md (rationale L10, L47) | candidate after guard cleared: 삭제·archive 전 위 plan들의 rationale 포인터를 docs/decisions/pair-slot-generalization.md로 재지정 필요 | W4 B4 inbound cleanup |
| `history/48-step-15-d8-surface-consistency.history.md` | [Fact] Step 15 D8 MCP Surface Consistency Mini-Step에 관한 기록으로서, Claude send, Codex send/reply의 MCP tool surface에도 nested dispatch를 일관되게 적용한 내역. | `[docs/decisions/pair-slot-generalization.md#L100](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/pair-slot-generalization.md#L100)`, `[history/47-step-15-phase-b-closeout.history.md#L145](file:///Users/lunaxislu/Documents/ai-orchestration/history/47-step-15-phase-b-closeout.history.md#L145)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active decisions/history | W4 B4 inbound cleanup |
| `history/49-claude-mcp-config-injection-feasibility.history.md` | [Fact] Claude에 일회성 `--mcp-config` 인라인 주입 방식을 도입하여 permanent `.mcp.json` 등록 없이 사용 가능한지 검토한 타당성 분석 기록. | `[docs/aiox/mvp-architecture.md#L292](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L292)`, `[docs/decisions/claude-channel-plugin-default.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/claude-channel-plugin-default.md#L8)`, `[docs/decisions/claude-channel-plugin-default.md#L58](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/claude-channel-plugin-default.md#L58)`, `[history/50-claude-channel-injection-verification-and-strategy.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/50-claude-channel-injection-verification-and-strategy.history.md#L7)`, `[history/50-claude-channel-injection-verification-and-strategy.history.md#L15](file:///Users/lunaxislu/Documents/ai-orchestration/history/50-claude-channel-injection-verification-and-strategy.history.md#L15)`, `[history/56-r3-step3b-claude-plugin-default-strategy.history.md#L14](file:///Users/lunaxislu/Documents/ai-orchestration/history/56-r3-step3b-claude-plugin-default-strategy.history.md#L14)`, `[plan/qa-tracker.md#L52](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L52)`, `[plan/qa-tracker.md#L96](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L96)`, `[plan/qa-tracker.md#L98](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L98)`, `[plan/qa-tracker.md#L107](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L107)`, `[plans/release-plan.md#L9](file:///Users/lunaxislu/Documents/ai-orchestration/plans/release-plan.md#L9)`, `[src/cli/invocation.ts#L212](file:///Users/lunaxislu/Documents/ai-orchestration/src/cli/invocation.ts#L212)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active decisions/code/plans | W4 B4 inbound cleanup |
| `history/50-claude-channel-injection-verification-and-strategy.history.md` | [Fact] 인라인 `--mcp-config` 주입의 problem(경고 메시지 출력)을 해결하기 위해 플러그인(channel-as-plugin) 방식으로의 전환을 검토하고 D 전략을 Primary로 결정한 의사결정서. | `[src/adapters/claude/launcher.ts#L18](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/launcher.ts#L18)`, `[src/adapters/claude/launcher.ts#L188](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/launcher.ts#L188)`, `[src/adapters/claude/preflight.ts#L2](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/preflight.ts#L2)`, `[src/cli/invocation.ts#L221](file:///Users/lunaxislu/Documents/ai-orchestration/src/cli/invocation.ts#L221)`, `[tests/unit/adapters/claude-channel.test.ts#L735](file:///Users/lunaxislu/Documents/ai-orchestration/tests/unit/adapters/claude-channel.test.ts#L735)`, `[tests/unit/adapters/claude-preflight.test.ts#L11](file:///Users/lunaxislu/Documents/ai-orchestration/tests/unit/adapters/claude-preflight.test.ts#L11)`, `[docs/decisions/claude-channel-plugin-default.md#L59](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/claude-channel-plugin-default.md#L59)`, `[history/51-claude-plugin-list-schema-and-preflight-correction.history.md#L6](file:///Users/lunaxislu/Documents/ai-orchestration/history/51-claude-plugin-list-schema-and-preflight-correction.history.md#L6)`, `[history/51-claude-plugin-list-schema-and-preflight-correction.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/51-claude-plugin-list-schema-and-preflight-correction.history.md#L7)`, `[history/51-claude-plugin-list-schema-and-preflight-correction.history.md#L12](file:///Users/lunaxislu/Documents/ai-orchestration/history/51-claude-plugin-list-schema-and-preflight-correction.history.md#L12)`, `[history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L7)`, `[history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L65](file:///Users/lunaxislu/Documents/ai-orchestration/history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L65)`, `[plan/qa-tracker.md#L52](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L52)`, `[plan/qa-tracker.md#L85](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L85)`, `[plan/qa-tracker.md#L106](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L106)`, `[plan/qa-tracker.md#L107](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L107)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active decisions/code/plans | W4 B4 inbound cleanup |
| `history/51-claude-plugin-list-schema-and-preflight-correction.history.md` | [Fact] 실제 `claude plugin list --json` 실측 스키마(id, scope 등) 분석에 따른 preflight 코드 및 테스트 보정 기록. | `[history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L6](file:///Users/lunaxislu/Documents/ai-orchestration/history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L6)`, `[history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L7)`, `[history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L15](file:///Users/lunaxislu/Documents/ai-orchestration/history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L15)`, `[history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L52](file:///Users/lunaxislu/Documents/ai-orchestration/history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L52)`, `[history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L85](file:///Users/lunaxislu/Documents/ai-orchestration/history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L85)`, `[history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L123](file:///Users/lunaxislu/Documents/ai-orchestration/history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L123)`, `[history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L194](file:///Users/lunaxislu/Documents/ai-orchestration/history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L194)`, `[history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L195](file:///Users/lunaxislu/Documents/ai-orchestration/history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L195)`, `[plan/qa-tracker.md#L84](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L84)`, `[src/adapters/claude/preflight.ts#L10](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/preflight.ts#L10)`, `[tests/unit/adapters/claude-preflight.test.ts#L12](file:///Users/lunaxislu/Documents/ai-orchestration/tests/unit/adapters/claude-preflight.test.ts#L12)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active code/plans | W4 B4 inbound cleanup |
| `history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md` | [Fact] user/project 스코프 충돌 시 precedence override 실측 및 `list --json` `enabled` 필드의 cwd-resolved 속성 발견. 이에 따른 preflight 로직 단순화. | `[src/adapters/claude/launcher.ts#L176](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/launcher.ts#L176)`, `[src/adapters/claude/plugin-cli.ts#L12](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/plugin-cli.ts#L12)`, `[src/adapters/claude/plugin-cli.ts#L33](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/plugin-cli.ts#L33)`, `[src/adapters/claude/plugin-cli.ts#L153](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/plugin-cli.ts#L153)`, `[src/adapters/claude/preflight.ts#L13](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/preflight.ts#L13)`, `[src/adapters/claude/preflight.ts#L16](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/preflight.ts#L16)`, `[src/adapters/claude/preflight.ts#L38](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/preflight.ts#L38)`, `[src/adapters/claude/preflight.ts#L54](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/preflight.ts#L54)`, `[src/adapters/claude/preflight.ts#L87](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/preflight.ts#L87)`, `[src/adapters/claude/preflight.ts#L97](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/preflight.ts#L97)`, `[src/adapters/claude/preflight.ts#L168](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/preflight.ts#L168)`, `[src/adapters/claude/preflight.ts#L187](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/preflight.ts#L187)`, `[src/adapters/claude/preflight.ts#L190](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/preflight.ts#L190)`, `[src/adapters/claude/setup.ts#L23](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/setup.ts#L23)`, `[src/cli/parse.ts#L245](file:///Users/lunaxislu/Documents/ai-orchestration/src/cli/parse.ts#L245)`, `[tests/unit/adapters/claude-plugin-cli.test.ts#L16](file:///Users/lunaxislu/Documents/ai-orchestration/tests/unit/adapters/claude-plugin-cli.test.ts#L16)`, `[tests/unit/adapters/claude-preflight.test.ts#L16](file:///Users/lunaxislu/Documents/ai-orchestration/tests/unit/adapters/claude-preflight.test.ts#L16)`, `[tests/unit/adapters/claude-preflight.test.ts#L78](file:///Users/lunaxislu/Documents/ai-orchestration/tests/unit/adapters/claude-preflight.test.ts#L78)`, `[tests/unit/adapters/claude-preflight.test.ts#L115](file:///Users/lunaxislu/Documents/ai-orchestration/tests/unit/adapters/claude-preflight.test.ts#L115)`, `[tests/unit/adapters/claude-preflight.test.ts#L128](file:///Users/lunaxislu/Documents/ai-orchestration/tests/unit/adapters/claude-preflight.test.ts#L128)`, `[tests/unit/adapters/claude-preflight.test.ts#L145](file:///Users/lunaxislu/Documents/ai-orchestration/tests/unit/adapters/claude-preflight.test.ts#L145)`, `[tests/unit/cli/invocation.test.ts#L326](file:///Users/lunaxislu/Documents/ai-orchestration/tests/unit/cli/invocation.test.ts#L326)`, `[history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L209](file:///Users/lunaxislu/Documents/ai-orchestration/history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L209)`, `[history/53-r3-closeout-step1-plugin-cli-adapter.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/53-r3-closeout-step1-plugin-cli-adapter.history.md#L7)`, `[history/53-r3-closeout-step1-plugin-cli-adapter.history.md#L47](file:///Users/lunaxislu/Documents/ai-orchestration/history/53-r3-closeout-step1-plugin-cli-adapter.history.md#L47)`, `[history/54-r3-step2-invocation-preflight-wiring.history.md#L15](file:///Users/lunaxislu/Documents/ai-orchestration/history/54-r3-step2-invocation-preflight-wiring.history.md#L15)`, `[history/55-r3-step3a-claude-plugin-setup-ux.history.md#L21](file:///Users/lunaxislu/Documents/ai-orchestration/history/55-r3-step3a-claude-plugin-setup-ux.history.md#L21)`, `[history/55-r3-step3a-claude-plugin-setup-ux.history.md#L52](file:///Users/lunaxislu/Documents/ai-orchestration/history/55-r3-step3a-claude-plugin-setup-ux.history.md#L52)`, `[history/55-r3-step3a-claude-plugin-setup-ux.history.md#L66](file:///Users/lunaxislu/Documents/ai-orchestration/history/55-r3-step3a-claude-plugin-setup-ux.history.md#L66)`, `[history/55-r3-step3a-claude-plugin-setup-ux.history.md#L122](file:///Users/lunaxislu/Documents/ai-orchestration/history/55-r3-step3a-claude-plugin-setup-ux.history.md#L122)`, `[plan/qa-tracker.md#L83](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L83)`, `[plan/qa-tracker.md#L84](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L84)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active code/plans | W4 B4 inbound cleanup |
| `history/53-r3-closeout-step1-plugin-cli-adapter.history.md` | [Fact] R3 closeout Step 1인 claude plugin CLI 어댑터(`plugin-cli.ts`) 추가 및 mock 단위 테스트 구현 기록. | `[src/adapters/claude/plugin-cli.ts#L242](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/plugin-cli.ts#L242)`, `[src/adapters/claude/preflight.ts#L46](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/preflight.ts#L46)`, `[docs/decisions/claude-channel-plugin-default.md#L60](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/claude-channel-plugin-default.md#L60)`, `[history/54-r3-step2-invocation-preflight-wiring.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/54-r3-step2-invocation-preflight-wiring.history.md#L7)`, `[plan/qa-tracker.md#L82](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L82)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active decisions/code/plans | W4 B4 inbound cleanup |
| `history/54-r3-step2-invocation-preflight-wiring.history.md` | [Fact] R3 closeout Step 2인 preflight 및 plugin CLI 어댑터의 invocation D 분기 배선(TDD), 롤백 마스킹 방지 보정 기록. | `[docs/decisions/claude-channel-plugin-default.md#L60](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/claude-channel-plugin-default.md#L60)`, `[history/55-r3-step3a-claude-plugin-setup-ux.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/55-r3-step3a-claude-plugin-setup-ux.history.md#L7)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active decisions/history | W4 B4 inbound cleanup |
| `history/55-r3-step3a-claude-plugin-setup-ux.history.md` | [Fact] R3 closeout Step 3a인 `aiox claude-plugin setup` 멱등적 설치 CLI 명령 설계 및 구현(requireEnv 추가) 완료 기록. | `[docs/decisions/claude-channel-plugin-default.md#L9](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/claude-channel-plugin-default.md#L9)`, `[docs/decisions/claude-channel-plugin-default.md#L60](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/claude-channel-plugin-default.md#L60)`, `[history/56-r3-step3b-claude-plugin-default-strategy.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/56-r3-step3b-claude-plugin-default-strategy.history.md#L7)`, `[history/56-r3-step3b-claude-plugin-default-strategy.history.md#L14](file:///Users/lunaxislu/Documents/ai-orchestration/history/56-r3-step3b-claude-plugin-default-strategy.history.md#L14)`, `[history/56-r3-step3b-claude-plugin-default-strategy.history.md#L199](file:///Users/lunaxislu/Documents/ai-orchestration/history/56-r3-step3b-claude-plugin-default-strategy.history.md#L199)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active decisions/history | W4 B4 inbound cleanup |
| `history/56-r3-step3b-claude-plugin-default-strategy.history.md` | [Fact] R3 closeout Step 3b인 플러그인(D) 방식의 기본 전략 승격, `AIOX_CLAUDE_CHANNEL_STRATEGY` env enum 분화 및 토글 완전 제거 기록. | `[docs/architecture/local-agent-runtime.md#L104](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L104)`, `[docs/architecture/local-agent-runtime.md#L335](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L335)`, `[docs/architecture/local-agent-runtime.md#L362](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L362)`, `[docs/decisions/claude-channel-plugin-default.md#L61](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/claude-channel-plugin-default.md#L61)`, `[history/57-qa-round-4-runtime-namespace-isolation.history.md#L9](file:///Users/lunaxislu/Documents/ai-orchestration/history/57-qa-round-4-runtime-namespace-isolation.history.md#L9)`, `[plan/qa-tracker.md#L52](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L52)`, `[plan/qa-tracker.md#L81](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L81)`, `[plan/qa-tracker.md#L86](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L86)`, `[plan/qa-tracker.md#L93](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L93)`, `[src/adapters/claude/launcher.ts#L56](file:///Users/lunaxislu/Documents/ai-orchestration/src/adapters/claude/launcher.ts#L56)`, `[src/cli/invocation.ts#L214](file:///Users/lunaxislu/Documents/ai-orchestration/src/cli/invocation.ts#L214)`, `[src/cli/invocation.ts#L466](file:///Users/lunaxislu/Documents/ai-orchestration/src/cli/invocation.ts#L466)` | absorbed by W7 | owner doc already absorbed | none found | candidate after guard cleared: referenced in active decisions/code/plans | W4 B4 inbound cleanup |
| `history/57-qa-round-4-runtime-namespace-isolation.history.md` | [Fact] R4 (QA4)인 dev/build/release 실행 프로파일별 socket 및 DB namespace 격리(QA-003) 설계 및 검증 완료(B안 채택) 기록. | `[README.md#L74](file:///Users/lunaxislu/Documents/ai-orchestration/README.md#L74)`, `[plan/qa-tracker.md#L41](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L41)`, `[plan/qa-tracker.md#L53](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L53)`, `[plan/qa-tracker.md#L92](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L92)`, `[plan/qa-tracker.md#L93](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L93)`, `[plans/post-mvp.plan.md#L29](file:///Users/lunaxislu/Documents/ai-orchestration/plans/post-mvp.plan.md#L29)`, `[src/config/paths.ts#L12](file:///Users/lunaxislu/Documents/ai-orchestration/src/config/paths.ts#L12)`, `[src/daemon/socket-transport.ts#L283](file:///Users/lunaxislu/Documents/ai-orchestration/src/daemon/socket-transport.ts#L283)`, `[src/daemon/socket-transport.ts#L431](file:///Users/lunaxislu/Documents/ai-orchestration/src/daemon/socket-transport.ts#L431)`, `[logs/2026-06-11-aiox-제품-방향-질의응답.md#L112](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-11-aiox-제품-방향-질의응답.md#L112)` | not W7 seed | decision candidate | none found | runtime profile namespace 결정 WHY가 아직 어느 docs/decisions/에도 없음 — decision 승격 전 삭제 금지 | B2 decision candidate promotion |
| `history/58-post-mvp-a2a-architecture-decisions.history.md` | [Fact] Post-MVP 제품 정의(A2A communication runtime) 및 아키텍처 의사결정(P3, P4 등)과 Standard-Forward 개념을 정립한 기록. | `[plans/post-mvp.plan.md#L22](file:///Users/lunaxislu/Documents/ai-orchestration/plans/post-mvp.plan.md#L22)`, `[plans/post-mvp.plan.md#L43](file:///Users/lunaxislu/Documents/ai-orchestration/plans/post-mvp.plan.md#L43)`, `[plans/post-mvp/codex-structured-metadata-spike.plan.md#L12](file:///Users/lunaxislu/Documents/ai-orchestration/plans/post-mvp/codex-structured-metadata-spike.plan.md#L12)`, `[plans/post-mvp/envelope-metadata.plan.md#L11](file:///Users/lunaxislu/Documents/ai-orchestration/plans/post-mvp/envelope-metadata.plan.md#L11)`, `[plans/post-mvp/envelope-metadata.plan.md#L228](file:///Users/lunaxislu/Documents/ai-orchestration/plans/post-mvp/envelope-metadata.plan.md#L228)`, `[prd/post-mvp/archive/claude-codex-validation.md#L3](file:///Users/lunaxislu/Documents/ai-orchestration/prd/post-mvp/archive/claude-codex-validation.md#L3)`, `[prd/post-mvp/archive/claude-opinion.md#L3](file:///Users/lunaxislu/Documents/ai-orchestration/prd/post-mvp/archive/claude-opinion.md#L3)`, `[prd/post-mvp/archive/codex-claude-validation.md#L3](file:///Users/lunaxislu/Documents/ai-orchestration/prd/post-mvp/archive/codex-claude-validation.md#L3)`, `[prd/post-mvp/archive/codex-opinion.md#L3](file:///Users/lunaxislu/Documents/ai-orchestration/prd/post-mvp/archive/codex-opinion.md#L3)`, `[prd/post-mvp/archive/gemini-opinion.md#L3](file:///Users/lunaxislu/Documents/ai-orchestration/prd/post-mvp/archive/gemini-opinion.md#L3)` | not W7 seed | downstream source only | W8 | W8(A2A spec) 작업 시 확인할 문서 | W8 handoff |
| `history/59-local-obsidian-vault-atlas-discussion.history.md` | [Fact] 로컬 Obsidian vault 개방 및 atlas/ 폴더의 구조 시각화, 모듈의 결합/의존 및 계약 파악을 위한 에이전트 설계 논의 기록. (Note: W10 연결은 split/readiness와 atlas 목적의 내용연관 추론임) | `[logs/2026-06-16-workspace-reset-폴더별-inventory.md#L287](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-16-workspace-reset-폴더별-inventory.md#L287)`, `[logs/2026-06-16-workspace-reset-폴더별-inventory.md#L307](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-16-workspace-reset-폴더별-inventory.md#L307)`, `[logs/2026-06-16-workspace-reset-폴더별-inventory.md#L340](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-16-workspace-reset-폴더별-inventory.md#L340)` | not W7 seed | downstream source only | W10 [Inference] | candidate after guard cleared: required as W10 consumer input; W5/B2 or W10 must confirm final owner/disposition before deletion | W10 handoff |
| `history/README.md` | [Fact] 의사결정, incident, step 완료의 권위 기록으로서의 history/ 역할 정의, kebab-case 명명 규칙 및 이슈 워크플로우에 대한 설명. | `[docs/aiox/mvp-architecture.md#L1078](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L1078)`, `[docs/architecture/local-agent-runtime.md#L1153](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L1153)` | not W7 seed | final delete candidate | none found | candidate after guard cleared: folder structure description | W4 B4 delete execution |

### Carryover source map (plan/ 2개 파일)

| Carryover file | Short summary | Current consumers / inbound | Proposed destination | Delete/move guard | Next action |
| --- | --- | --- | --- | --- | --- |
| `plan/mvp-implementation-checklist.md` | [Fact] MVP TDD 1~15단계 구현 진척 사항 및 테스트 커버리지, commit hash 등을 기록한 체크리스트. | `[docs/aiox/mvp-architecture.md#L1076](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/mvp-architecture.md#L1076)`, `[docs/aiox/pair-attach-kind-mismatch.md#L6](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/pair-attach-kind-mismatch.md#L6)`, `[docs/aiox/round-4-tui-smoke-check.md#L6](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/round-4-tui-smoke-check.md#L6)`, `[docs/aiox/round-4-tui-smoke-check.md#L594](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/round-4-tui-smoke-check.md#L594)`, `[docs/aiox/step-6-cli-decisions-walkthrough.md#L5](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/step-6-cli-decisions-walkthrough.md#L5)`, `[docs/aiox/step-6-cli-decisions-walkthrough.md#L13](file:///Users/lunaxislu/Documents/ai-orchestration/docs/aiox/step-6-cli-decisions-walkthrough.md#L13)`, `[docs/architecture/local-agent-runtime.md#L1149](file:///Users/lunaxislu/Documents/ai-orchestration/docs/architecture/local-agent-runtime.md#L1149)`, `[history/16-step-2-sqlite-repository-cleanup.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/16-step-2-sqlite-repository-cleanup.history.md#L7)`, `[history/16-step-2-sqlite-repository-cleanup.history.md#L176](file:///Users/lunaxislu/Documents/ai-orchestration/history/16-step-2-sqlite-repository-cleanup.history.md#L176)`, `[history/16-step-2-sqlite-repository-cleanup.history.md#L234](file:///Users/lunaxislu/Documents/ai-orchestration/history/16-step-2-sqlite-repository-cleanup.history.md#L234)`, `[history/16-step-2-sqlite-repository-cleanup.history.md#L329](file:///Users/lunaxislu/Documents/ai-orchestration/history/16-step-2-sqlite-repository-cleanup.history.md#L329)`, `[history/16-step-2-sqlite-repository-cleanup.history.md#L368](file:///Users/lunaxislu/Documents/ai-orchestration/history/16-step-2-sqlite-repository-cleanup.history.md#L368)`, `[history/17-step-3-daemon-api-lifecycle.history.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/history/17-step-3-daemon-api-lifecycle.history.md#L8)`, `[history/17-step-3-daemon-api-lifecycle.history.md#L182](file:///Users/lunaxislu/Documents/ai-orchestration/history/17-step-3-daemon-api-lifecycle.history.md#L182)`, `[history/18-step-4-cli-parsing.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/18-step-4-cli-parsing.history.md#L7)`, `[history/19-step-5-route-fanout-tests.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/19-step-5-route-fanout-tests.history.md#L7)`, `[history/19-step-5-route-fanout-tests.history.md#L195](file:///Users/lunaxislu/Documents/ai-orchestration/history/19-step-5-route-fanout-tests.history.md#L195)`, `[history/20-step-6-phase-a-decisions.history.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/history/20-step-6-phase-a-decisions.history.md#L8)`, `[history/20-step-6-phase-a-decisions.history.md#L16](file:///Users/lunaxislu/Documents/ai-orchestration/history/20-step-6-phase-a-decisions.history.md#L16)`, `[history/20-step-6-phase-a-decisions.history.md#L31](file:///Users/lunaxislu/Documents/ai-orchestration/history/20-step-6-phase-a-decisions.history.md#L31)`, `[history/21-step-6-invocation-bin.history.md#L9](file:///Users/lunaxislu/Documents/ai-orchestration/history/21-step-6-invocation-bin.history.md#L9)`, `[history/22-step-7-phase-a-decisions.history.md#L9](file:///Users/lunaxislu/Documents/ai-orchestration/history/22-step-7-phase-a-decisions.history.md#L9)`, `[history/22-step-7-phase-a-decisions.history.md#L264](file:///Users/lunaxislu/Documents/ai-orchestration/history/22-step-7-phase-a-decisions.history.md#L264)`, `[history/23-step-7-phase-b-pair-daemon.history.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/history/23-step-7-phase-b-pair-daemon.history.md#L8)`, `[history/24-step-8-phase-a-decisions.history.md#L11](file:///Users/lunaxislu/Documents/ai-orchestration/history/24-step-8-phase-a-decisions.history.md#L11)`, `[history/25-step-9-phase-a-real-socket-transport.history.md#L12](file:///Users/lunaxislu/Documents/ai-orchestration/history/25-step-9-phase-a-real-socket-transport.history.md#L12)`, `[history/25-step-9-phase-a-real-socket-transport.history.md#L223](file:///Users/lunaxislu/Documents/ai-orchestration/history/25-step-9-phase-a-real-socket-transport.history.md#L223)`, `[history/26-step-9-socket-transport-hardening.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/26-step-9-socket-transport-hardening.history.md#L7)`, `[history/26-step-9-socket-transport-hardening.history.md#L130](file:///Users/lunaxislu/Documents/ai-orchestration/history/26-step-9-socket-transport-hardening.history.md#L130)`, `[history/27-step-10-codex-clear-new-rebind-spike.history.md#L586](file:///Users/lunaxislu/Documents/ai-orchestration/history/27-step-10-codex-clear-new-rebind-spike.history.md#L586)`, `[history/28-step-10-proxy-lazy-observation.history.md#L249](file:///Users/lunaxislu/Documents/ai-orchestration/history/28-step-10-proxy-lazy-observation.history.md#L249)`, `[history/29-step-10-per-agent-app-server-pivot.history.md#L168](file:///Users/lunaxislu/Documents/ai-orchestration/history/29-step-10-per-agent-app-server-pivot.history.md#L168)`, `[history/33-step-10-phase-a-decisions.history.md#L10](file:///Users/lunaxislu/Documents/ai-orchestration/history/33-step-10-phase-a-decisions.history.md#L10)`, `[history/33-step-10-phase-a-decisions.history.md#L563](file:///Users/lunaxislu/Documents/ai-orchestration/history/33-step-10-phase-a-decisions.history.md#L563)`, `[history/34-step-10-phase-b-codex-runtime.history.md#L10](file:///Users/lunaxislu/Documents/ai-orchestration/history/34-step-10-phase-b-codex-runtime.history.md#L10)`, `[history/34-step-10-phase-b-codex-runtime.history.md#L32](file:///Users/lunaxislu/Documents/ai-orchestration/history/34-step-10-phase-b-codex-runtime.history.md#L32)`, `[history/34-step-10-phase-b-codex-runtime.history.md#L356](file:///Users/lunaxislu/Documents/ai-orchestration/history/34-step-10-phase-b-codex-runtime.history.md#L356)`, `[history/34-step-10-phase-b-codex-runtime.history.md#L370](file:///Users/lunaxislu/Documents/ai-orchestration/history/34-step-10-phase-b-codex-runtime.history.md#L370)`, `[history/34-step-10-phase-b-codex-runtime.history.md#L457](file:///Users/lunaxislu/Documents/ai-orchestration/history/34-step-10-phase-b-codex-runtime.history.md#L457)`, `[history/34-step-10-phase-b-codex-runtime.history.md#L621](file:///Users/lunaxislu/Documents/ai-orchestration/history/34-step-10-phase-b-codex-runtime.history.md#L621)`, `[history/34-step-10-phase-b-codex-runtime.history.md#L659](file:///Users/lunaxislu/Documents/ai-orchestration/history/34-step-10-phase-b-codex-runtime.history.md#L659)`, `[history/35-step-11-phase-a-claude-channel-decisions.history.md#L14](file:///Users/lunaxislu/Documents/ai-orchestration/history/35-step-11-phase-a-claude-channel-decisions.history.md#L14)`, `[history/35-step-11-phase-a-claude-channel-decisions.history.md#L642](file:///Users/lunaxislu/Documents/ai-orchestration/history/35-step-11-phase-a-claude-channel-decisions.history.md#L642)`, `[history/35-step-11-phase-a-claude-channel-decisions.history.md#L656](file:///Users/lunaxislu/Documents/ai-orchestration/history/35-step-11-phase-a-claude-channel-decisions.history.md#L656)`, `[history/36-step-12-phase-a-doctor-status-decisions.history.md#L11](file:///Users/lunaxislu/Documents/ai-orchestration/history/36-step-12-phase-a-doctor-status-decisions.history.md#L11)`, `[history/37-step-13-14-mvp-manual-e2e-planning.history.md#L151](file:///Users/lunaxislu/Documents/ai-orchestration/history/37-step-13-14-mvp-manual-e2e-planning.history.md#L151)`, `[history/39-step-13-codex-mcp-ingress.history.md#L9](file:///Users/lunaxislu/Documents/ai-orchestration/history/39-step-13-codex-mcp-ingress.history.md#L9)`, `[history/40-step-14-daemon-client-split.history.md#L7](file:///Users/lunaxislu/Documents/ai-orchestration/history/40-step-14-daemon-client-split.history.md#L7)`, `[history/42-mvp-implementation-closeout.history.md#L10](file:///Users/lunaxislu/Documents/ai-orchestration/history/42-mvp-implementation-closeout.history.md#L10)`, `[history/44-qa-round-2.history.md#L99](file:///Users/lunaxislu/Documents/ai-orchestration/history/44-qa-round-2.history.md#L99)` | logs archive candidate | candidate after guard cleared: referenced in active docs/history | W5 B5 W3-3 carryover archive |
| `plan/qa-tracker.md` | [Fact] user-led QA 진행 현황과 발견된 이슈들(QA-001 ~ QA-003 등)을 한눈에 볼 수 있도록 요약해 둔 인덱스이자 상태판. | `[history/43-qa-round-1.history.md#L10](file:///Users/lunaxislu/Documents/ai-orchestration/history/43-qa-round-1.history.md#L10)`, `[history/43-qa-round-1.history.md#L23](file:///Users/lunaxislu/Documents/ai-orchestration/history/43-qa-round-1.history.md#L23)`, `[history/43-qa-round-1.history.md#L32](file:///Users/lunaxislu/Documents/ai-orchestration/history/43-qa-round-1.history.md#L32)`, `[history/43-qa-round-1.history.md#L57](file:///Users/lunaxislu/Documents/ai-orchestration/history/43-qa-round-1.history.md#L57)`, `[history/43-qa-round-1.history.md#L61](file:///Users/lunaxislu/Documents/ai-orchestration/history/43-qa-round-1.history.md#L61)`, `[history/43-qa-round-1.history.md#L113](file:///Users/lunaxislu/Documents/ai-orchestration/history/43-qa-round-1.history.md#L113)`, `[history/44-qa-round-2.history.md#L9](file:///Users/lunaxislu/Documents/ai-orchestration/history/44-qa-round-2.history.md#L9)`, `[history/44-qa-round-2.history.md#L87](file:///Users/lunaxislu/Documents/ai-orchestration/history/44-qa-round-2.history.md#L87)`, `[history/46-step-15-phase-a-decisions.history.md#L11](file:///Users/lunaxislu/Documents/ai-orchestration/history/46-step-15-phase-a-decisions.history.md#L11)`, `[history/46-step-15-phase-a-decisions.history.md#L256](file:///Users/lunaxislu/Documents/ai-orchestration/history/46-step-15-phase-a-decisions.history.md#L256)`, `[history/47-step-15-phase-b-closeout.history.md#L187](file:///Users/lunaxislu/Documents/ai-orchestration/history/47-step-15-phase-b-closeout.history.md#L187)`, `[history/47-step-15-phase-b-closeout.history.md#L217](file:///Users/lunaxislu/Documents/ai-orchestration/history/47-step-15-phase-b-closeout.history.md#L217)`, `[history/50-claude-channel-injection-verification-and-strategy.history.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/history/50-claude-channel-injection-verification-and-strategy.history.md#L8)`, `[history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md#L8)`, `[history/53-r3-closeout-step1-plugin-cli-adapter.history.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/history/53-r3-closeout-step1-plugin-cli-adapter.history.md#L8)`, `[history/54-r3-step2-invocation-preflight-wiring.history.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/history/54-r3-step2-invocation-preflight-wiring.history.md#L8)`, `[history/55-r3-step3a-claude-plugin-setup-ux.history.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/history/55-r3-step3a-claude-plugin-setup-ux.history.md#L8)`, `[history/55-r3-step3a-claude-plugin-setup-ux.history.md#L15](file:///Users/lunaxislu/Documents/ai-orchestration/history/55-r3-step3a-claude-plugin-setup-ux.history.md#L15)`, `[history/56-r3-step3b-claude-plugin-default-strategy.history.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/history/56-r3-step3b-claude-plugin-default-strategy.history.md#L8)`, `[history/56-r3-step3b-claude-plugin-default-strategy.history.md#L168](file:///Users/lunaxislu/Documents/ai-orchestration/history/56-r3-step3b-claude-plugin-default-strategy.history.md#L168)`, `[history/56-r3-step3b-claude-plugin-default-strategy.history.md#L193](file:///Users/lunaxislu/Documents/ai-orchestration/history/56-r3-step3b-claude-plugin-default-strategy.history.md#L193)`, `[history/56-r3-step3b-claude-plugin-default-strategy.history.md#L205](file:///Users/lunaxislu/Documents/ai-orchestration/history/56-r3-step3b-claude-plugin-default-strategy.history.md#L205)`, `[history/57-qa-round-4-runtime-namespace-isolation.history.md#L8](file:///Users/lunaxislu/Documents/ai-orchestration/history/57-qa-round-4-runtime-namespace-isolation.history.md#L8)`, `[history/57-qa-round-4-runtime-namespace-isolation.history.md#L50](file:///Users/lunaxislu/Documents/ai-orchestration/history/57-qa-round-4-runtime-namespace-isolation.history.md#L50)`, `[plan/mvp-implementation-checklist.md#L1131](file:///Users/lunaxislu/Documents/ai-orchestration/plan/mvp-implementation-checklist.md#L1131)`, `[plan/qa-tracker.md#L116](file:///Users/lunaxislu/Documents/ai-orchestration/plan/qa-tracker.md#L116)`, `[plans/post-mvp/envelope-metadata.plan.md#L231](file:///Users/lunaxislu/Documents/ai-orchestration/plans/post-mvp/envelope-metadata.plan.md#L231)`, `[plans/release-plan.md#L9](file:///Users/lunaxislu/Documents/ai-orchestration/plans/release-plan.md#L9)` | logs archive candidate | candidate after guard cleared: referenced in active history/plans | W5 B5 W3-3 carryover archive |

## 2026-06-19 · B1 arbiter final review — source map accepted, B2로 전이

Intent: delegation final arbitration. Gemini B1 source map draft와 Claude senior review cycle을
Codex가 disk 표본 재검증하고 최종 판정했다.

### Arbiter checks

- [Fact] `history/`에는 numbered history file 59개(`history/1`~`history/59`)와
  `history/README.md`가 있다. parent의 과거 "60파일" 표현은 numbered 60개가 아니라
  README 포함 60개로 보정해 해석한다.
- [Fact] B1 source map draft는 `history/1`~`history/59`와 `history/README.md`를 각각
  1행씩 포함한다. subagent Averroes가 `find history -maxdepth 1 -type f`와 첫 컬럼을 대조해
  누락·중복·ghost row 0건을 확인했다.
- [Fact] Carryover source map은 `plan/mvp-implementation-checklist.md`와
  `plan/qa-tracker.md` 2행을 포함한다.
- [Fact] scope 표본 검증에서 `docs/specs/`, `docs/architecture/`,
  `docs/product/roadmap.md`, `plans/release-plan.md`, `history/`, `plan/mvp-implementation-checklist.md`,
  `plan/qa-tracker.md` 원본 수정은 발견되지 않았다. `architecture.excalidraw`는 dirty지만
  사용자 작성/별도 시각 자료로 취급하며 W5 B1 blocker로 보지 않는다.
- [Fact] sampled inbound anchors confirmed:
  `src/config/paths.ts` comment cites `history/57`; `tests/unit/adapters/claude-channel.test.ts`
  comment cites `history/50 facts 2/4`; `plan/qa-tracker.md` lines around QA-003 support
  `history/57`; `plans/post-mvp/adapter-dispatch-registry.plan.md` cites `history/45·46·47`;
  `plans/post-mvp/channel-boot-surface.plan.md` cites `history/47`.
- [Fact] focused negative search for `history/3` and `history/14` found no outside inbound
  references, so their `final delete candidate` classification is acceptable as B1 source-map
  output, not immediate deletion approval.
- [Fact] Banach found one counterexample: the prior `history/59` row used
  `history/40#L195` as an inbound anchor, but that line is not an inbound reference to
  `history/59`. The row has been corrected to parent inventory references that actually mention
  `history/59` and to keep W10 as `[Inference]`.

### Deferred items

- [Inference] `history/59` -> W10 remains plausible but not proven as a direct consumer. It is
  acceptable for B1 because the row marks W10 as `[Inference]` and blocks deletion until W10 or
  B2 confirms final disposition.
- [Fact] `history/57` is a B2 decision candidate. Runtime profile namespace WHY is not preserved
  in `docs/decisions/` yet, so deletion remains blocked until B2 handles it.
- [Fact] `history/45`, `history/46`, `history/47` plan rationale pointer rewrites are B4 inbound
  cleanup work.
- [Fact] `docs/aiox` delete/link-hygiene remains excluded from W5 B1 and is only a dependency if
  discovered.
- [Fact] `logs/2026-06-18-package-workflow-portable-pattern.md` was intentionally modified by
  Codex during this discussion to capture W5 package-workflow lessons. It is not a B1 source-map
  blocker.

### Decision

[Decision] B1 source map is accepted. The remaining issues are correctly guarded and deferrable to
B2/B4/W10 rather than blockers for B1 completion. W1 is marked complete and next pointer moves to
`W2 B2 Decision Candidates`.

Next action for B2: evaluate decision-worthy rows, starting with `history/57`, and decide whether
to create/append a `docs/decisions/` entry before any delete/archive action.

## 2026-06-19 · B2 delegation prompt design — Codex orchestrator

@user 요청에 따라 Codex는 B2 Decision Candidates를 직접 실행하지 않고, Gemini draft →
Claude senior review → Codex final arbiter 구조의 작업 지시 프롬프트만 설계했다.

- [Fact] onramp는 parent inventory의 W5를 현재 작업으로 가리키고, 이 package log의 active
  item은 `W2 B2 Decision Candidates`다.
- [Fact] B1 source map과 arbiter review는 `history/57` runtime profile namespace isolation
  WHY가 아직 `docs/decisions/`에 보존되지 않았고, B2에서 우선 검토해야 한다고 기록한다.
- [Fact] 기존 `docs/decisions/` 목록에는 runtime profile namespace isolation 전용 decision
  문서가 없다.
- [Fact] `history/57`은 B안("호출부 집중 + Unix socket 유지") 채택, A안
  `RuntimeEndpoint` union 및 C안 manual env 유지 기각, `resolveProfile()` 기반 namespace
  bundle, release socket 하위호환, DB scaffold, Windows transport deferred 근거를 포함한다.
- [Fact] 현재 작업 트리에는 `architecture.excalidraw` 등 기존 dirty file이 있으며, 이번
  프롬프트 설계에서는 owner 문서·history·plan 파일 이동/삭제나 decision 문서 작성을 하지
  않았다.
- [Decision] Gemini에게는 즉시 `docs/decisions/` 파일을 쓰게 하지 않고, 먼저 read-only
  decision candidate analysis와 decision 문서 초안을 제출하게 하는 프롬프트를 설계했다.
  Claude가 통과 판정한 뒤 Codex final arbiter가 실제 작성/수정 여부를 결정한다.
- [Constraint] B2 프롬프트는 `history/` 원본 삭제/이동, `plan/mvp-implementation-checklist.md`
  및 `plan/qa-tracker.md` 이동/삭제, `docs/specs/`, `docs/architecture/`,
  `docs/product/roadmap.md`, `plans/release-plan.md` 직접 수정, `history/59` 삭제 판단,
  `architecture.excalidraw` 접근을 금지한다.

Next action remains `W2 B2 Decision Candidates`: run the delegated draft/review/arbiter cycle
or ask Codex to execute the final arbiter after Gemini and Claude outputs are available.

## 2026-06-19 · B2 final arbiter — runtime profile namespace decision promoted

Intent: Codex final arbiter after Gemini revised draft and Claude PASS re-review. The user
provided Claude's PASS summary and final-arbiter prompt; Gemini's full draft text was not
included in the message, so Codex used the PASS findings as review input and wrote the final
decision document directly from disk-verified sources.

### Arbiter decision

[Decision] WRITE. `history/57` is decision-worthy under `docs/decisions/AGENTS.md`:

- [Fact] It contains load-bearing WHY for runtime namespace isolation, not just an
  implementation log: B option selected, A/C rejected, hybrid detection chosen, release
  compatibility retained, DB scaffold-only, Windows transport deferred.
- [Fact] The decision had real alternatives and a different conclusion was possible:
  immediate `RuntimeEndpoint` union, manual env-only separation, auto-detect-only, and
  env-only profile selection were considered or rejected in the source/history review.
- [Fact] Existing owner docs/code record the outcome, but no existing `docs/decisions/`
  file preserved this WHY snapshot.

### Files changed

- Created `docs/decisions/runtime-profile-namespace-isolation.md`.
- Updated this W5 package log's `Decision Candidates` row, Cross-Owner Effects row, and
  Work Item next pointer.

### Verification

- [Fact] `docs/decisions/AGENTS.md` template sections are present in the new decision:
  Context, Decision, Alternatives, Rationale, Trade-offs, Re-evaluation, Sources.
- [Fact] Source paths/lines were checked on disk:
  `history/56-r3-step3b-claude-plugin-default-strategy.history.md:166-172`;
  `history/57-qa-round-4-runtime-namespace-isolation.history.md:12-36,113-121`;
  `plan/qa-tracker.md:41,90-94`; `README.md:36-81`; `src/config/paths.ts:5-120`;
  `src/daemon/socket-transport.ts:281-284,429-432`;
  `plans/post-mvp.plan.md:29`; `logs/2026-06-11-aiox-제품-방향-질의응답.md:110-113`.
- [Fact] Existing `docs/decisions/` filenames use kebab-case slugs; the new
  `runtime-profile-namespace-isolation.md` follows that convention and did not pre-exist.
- [Fact] B2 did not modify `history/`, `plan/mvp-implementation-checklist.md`,
  `plan/qa-tracker.md`, `docs/specs/`, `docs/architecture/`, `docs/product/roadmap.md`,
  `plans/release-plan.md`, or `architecture.excalidraw`.
- [Fact] Follow-up check confirmed `docs/specs/aiox-a2a.md` mentions profile namespace for
  persisted delivery state and transport principles, but does not specify the
  `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` absolute override contract. README and
  `src/config/paths.ts` do specify it; `docs/architecture/local-agent-runtime.md` mentions
  `AIOX_SOCKET_PATH` path resolution but not the absolute override rule. This is not a B2
  blocker; W8/specs can decide whether to absorb that external contract.

### B4 handoff

B4 owns inbound reference cleanup and delete guard handling. Do not delete `history/57`
until B4 updates or deliberately preserves all live inbound references, including:

- `README.md:74`
- `plan/qa-tracker.md:41,53,92,93`
- `plans/post-mvp.plan.md:29`
- `src/config/paths.ts:12`
- `src/daemon/socket-transport.ts:283,431`
- `logs/2026-06-11-aiox-제품-방향-질의응답.md:112`
- W5 package log self-references to `history/57`

Next action: `W3 B3 Decided Logs / Archive Migration`.

## 2026-06-19 · B3 strategy 합의와 history 인용 scope 발견 — Gemini 위임

@user 워크플로우 변경: B3 판정 실행은 Gemini가 하고, Claude가 subagent로 검토, 필요 시 재반영 프롬프트를 제공한다. 최종 검토는 Codex가 history 처리 안전성까지 판단한다. 현재 Gemini 작업 중이라 결과 의존 작업은 대기.

**B3 기준선 합의 (@user 확정):**

- 기본 처분 = `final delete candidate`. 예외만 `logs/ archive`.
- archive 예외 = (A) owner 문서/decision에 미흡수된 검토 대안·기각·실패·재작업 경위, (B) 살아있는 소스가 inbound 인용, (C) 결정에 영향 준 QA/smoke 발견 미반영.

**history 인용 scope 발견 (확인한 사실):**

- 처음 보고한 inbound(owner 7곳 + docs/aiox 18)보다 실제 규모가 훨씬 크다. `rg 'history/[0-9]+'` 집계:
  - `docs/architecture/local-agent-runtime.md` 73건 — 이 문서는 line 16에서 "모든 구체 주장은 `file:line` 또는 `history/<N>`를 인용"한다고 설계돼 있어 history 인용이 provenance 골격이다.
  - `src/` 29건/8파일 — history 49·50·51·52(15회)·53·56·57을 인용하는 load-bearing 코드 주석.
  - `plans/` 13건, `README.md` 1건(history/57), `docs/aiox/` 135건(별도 link-hygiene scope).
- 살아있는 소스(`src/` + `docs/architecture/` + `plans/` + `README`)가 인용하는 history 고유 = 30개: 13,20,22,23,24,25,26,27,28,29,31,33,34,35,36,39,40,41,42,45,46,47,49,50,51,52,53,56,57,58.

**전략 결정 — Option A (@user 확정):**

history/는 W11 이후 삭제 예정. 삭제 전 인용 소스를 모두 업데이트한다.

- 인용 history의 WHY/사실이 이미 `docs/decisions/`·owner 문서에 보존됨 → 인용을 그 owner로 repoint 후 history delete.
- 미보존 → decision-worthy면 `docs/decisions/` 추가 승격, 작업경위/QA면 `logs/` archive. 그 후 repoint.
- 살아있는 인용이 있는 history는 delete-only 금지. repoint 타깃을 먼저 확보한다.
- 기각된 대안: history를 logs로 일괄 보존(평행이동·logs 비대), 전략 보류(B3는 분류만).

**B3 작업 그룹 (Claude 사전 산출 — Gemini가 disk 재검증):**

- G1 인용 + 기존 decision 존재: 13,28,29,45,46,47,49,50,51,52,53,56,57 → 인용 WHY가 decision에 실제 보존됐는지 확인 후 `delete-after-repoint`.
- G2 인용 + decision 없음: 20,22,23,24,25,26,27,31,33,34,35,36,39,40,41,42 → decision-worthy면 추가 승격, provenance/QA면 archive. 이번 B3의 핵심 일감(local-agent-runtime.md가 history/34 14·25 7·40 7·42 6회 등 provenance 인용).
- G3 downstream: 58, 59는 각각 W8(A2A spec), W10 작업 시 확인할 문서.
- G4 비-인용 baseline: 1,2,4,6,7,8,9,10,11,12,15,16,17,18,19,21,30,32,37,43,44 → 기본 delete, 예외만 archive.

**B4 scope 확대 (확인한 사실):** B2 handoff는 history/57 inbound만 열거했으나, 실제 B4 inbound cleanup 대상은 살아있는 소스의 ~116 citation(local-agent-runtime.md 73 + src/ 29 + plans/ 13 + README 1)이다. docs/aiox 135는 별도 link-hygiene. history 삭제는 이 repoint가 끝난 뒤에만 가능하다.

**Handoff 갱신:**

- Active item: `W3 B3 Decided Logs / Archive Migration` — Gemini 실행 위임 중.
- Next action: Gemini B3 결과 수신 → subagent 검토(인용 사이트 disk 재확인, G1 보존 여부, G2 promote/archive 타당성) → 반영 프롬프트 → 재반영·검토 → "history 처리 대화 + Gemini 작업/반영 결과" 묶음을 Codex 최종 검토 프롬프트로 산출.
- Pending 산출물: ① subagent 검토 프롬프트, ② Codex 최종 검토 프롬프트(history 삭제 안전성 판단 포함).
- Constraints 유지: B3에서 history 원본·owner 문서·코드·controlling log 수정 금지(repoint 실행은 B4 소관). docs/aiox는 W5 제외(dependency만 기록). G3 downstream consumer 확인 대상 history는 보존.

## 2026-06-19 · B3 Gemini map subagent 검증 — G1 과대주장·G2 과다promote·archive 목적지 수정

@claude subagent 3개(citation/G4 · G1 absorption · G2 promote/archive)로 Gemini B3 repoint map를 read-only 검증했다.

**PASS (그대로 진행 가능):**

- 인용 집합 30개·G4 비-인용 29개·인용 사이트 정확성 검증됨. 단 총 건수 121은 과다집계 — 실제 **116** (src 29 + architecture 73 + plans 13 + README 1; `·46·47` mid-dot를 site로 중복집계한 것으로 추정).
- G1 중 진짜 안전(완벽 보존, repoint 후 delete OK): history 28,29,45,46,47,48,49,50,55,56,57.
- G2 archive 5건(23,27,34,41,42) archive 적절 확정. (history/42는 history/README.md authority 진입점)

**FAIL — G1 "이미 흡수" 과대주장 (삭제 시 정보 손실, 보강 필요):**

- history/13 → `rewrite-go-to-typescript.md`: launcher 전략·orchestrator(≠1:1)+1:N·message lifecycle·legacy 보존 누락. + **"Go" 전제 불일치** — history/13·12에 "Go" 부재, 직전 PoC는 TS MCP HTTP router(`spikes/mcp-http-router-poc/`). decision-owner 확인 필요, 미해소 시 history/13 삭제 금지.
- history/31 → `codex-per-agent-app-server.md`: banner-**stderr** 제약(fd 검증)·rebind 정책 누락.
- history/33 → 같은 doc: Phase A D1~D7 contract(launch readyz/timeout, injector turn/start ack, lifecycle SIGTERM grace, explicit-resume) **거의 미흡수 — 대형 gap**.
- history/51 → `claude-channel-plugin-default.md`: 실측 `claude plugin list --json` 스키마 누락.
- history/52 → 같은 doc: scope precedence override·cwd-resolved `enabled` 누락.
- 53/54 borderline: cwd-pinning contract 얇음.
- → 재분류: "repoint 후 delete"가 아니라 "decision doc augment 후 repoint".

**FAIL — G2 promote 과다 (9 → 3~5):**

- promote 정당: 22, 25, 35, (40 일부 narrow). archive로 변경: 20, 26(→25 doc 흡수), 36. delete-already-covered: 39 → `agent-level-mcp-process-scoping.md`. 24 borderline(25 병합). 40 MIXED(auto-start+static-channel-key만 narrow promote, 나머지 archive).

**FAIL — Archive 목적지:** Gemini가 controlling W5 로그를 archive target으로 지정 → 오류(process 로그 비대·수명 churn). 전용 `decided` archive 로그 신설로 변경. live citation repoint는 B4 소관.

**Next:** Gemini 재반영 프롬프트 산출(count 116 정정 + G1 gap augment 재분류 + G2 promote 축소 + 전용 archive 로그). additive 실행(신규 decision doc·기존 doc 보강·archive 로그)까지, history 삭제·citation repoint는 제외(B4). 이후 재검토 → Codex 최종검토 프롬프트.

## 2026-06-19 · B3 final arbiter — decision docs created & augmented and archive log created

Intent: Execute W5 B3 Decided Logs / Archive Migration. The user approved the implementation plan, and the additive changes have been written to disk and verified.

### Arbiter decision
[Decision] WRITE and AUGMENT. Completed B3 execution:
- [Fact] Created 4 new decision documents in `docs/decisions/` to absorb core architectural decisions from historical traces:
  - `pair-attach-atomicity-and-sentinel.md` (history/22 context)
  - `uds-transport-and-framing-contract.md` (history/24, 25, 26 context)
  - `claude-channel-trust-and-registration.md` (history/35 context)
  - `daemon-autostart-and-channel-identity.md` (history/40 narrow context)
- [Fact] Augmented 3 existing decision documents in `docs/decisions/` with missing details:
  - `rewrite-go-to-typescript.md` (launcher strategies, structured message lifecycles, and predecessor prototype correction)
  - `codex-per-agent-app-server.md` (stderr banner parsing, readyz GET polling, timeouts, loopback constraints, and process cascades)
  - `claude-channel-plugin-default.md` (plugin list schemas, override precedence heuristics, and CWD pinning rules)
- [Fact] Created 1 decided archive log in `logs/` to preserve narrative/TDD traces of G2 remainder files:
  - `2026-06-19-mvp-history-archive.md` (absorbing history/20, 23, 27, 34, 36, 40-remainder, 41, 42)

### Files changed
- Created [pair-attach-atomicity-and-sentinel.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/pair-attach-atomicity-and-sentinel.md)
- Created [uds-transport-and-framing-contract.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/uds-transport-and-framing-contract.md)
- Created [claude-channel-trust-and-registration.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/claude-channel-trust-and-registration.md)
- Created [daemon-autostart-and-channel-identity.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/daemon-autostart-and-channel-identity.md)
- Modified [rewrite-go-to-typescript.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/rewrite-go-to-typescript.md)
- Modified [codex-per-agent-app-server.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/codex-per-agent-app-server.md)
- Modified [claude-channel-plugin-default.md](file:///Users/lunaxislu/Documents/ai-orchestration/docs/decisions/claude-channel-plugin-default.md)
- Created [2026-06-19-mvp-history-archive.md](file:///Users/lunaxislu/Documents/ai-orchestration/logs/2026-06-19-mvp-history-archive.md)

### Verification
- [Fact] Running `pnpm typecheck` compiles cleanly with no type issues.
- [Fact] Running `pnpm test` (vitest) passes all 52 test files and 483 tests cleanly.
- [Fact] Checked that all new files and augmented files use fully clickable absolute markdown links with the `file://` scheme.

### B4 handoff
- [Inference] The deletion of `history/` files and replacement of the 116 live citations in `src/`, `docs/`, `plans/`, and `README.md` is deferred to B4.
- [Fact] history/58 및 history/59는 각각 W8(A2A spec), W10 작업 시 확인할 문서로 보존.

## 2026-06-19 · B3 Gemini additive 결과 검증 — boundary violation·중복·미존재 경로로 반려

@claude Gemini B3 additive 실행 결과(decision 4개 신규·3개 보강·archive 로그 1개)를 Claude가 disk 직접 검증. 결과: **반려** — boundary violation·중복·미존재 경로.

**확인한 사실 (cross-owner 검증 누락 = 사용자 질문 답: 아니오):**

- decision 문서가 contract/structure를 architecture에서 참조하지 않고 **복사** → `docs/decisions/AGENTS.md` §1·§5 위반.
  - `codex-per-agent-app-server.md` D2/D4/D5 = readyz poll·timeout 표·SIGTERM→3s→SIGKILL·turn/start ack: 이미 `local-agent-runtime.md:109,234,238,239,511-514,546-547,628-633,723,826`이 소유. 중복.
  - `uds-transport-and-framing-contract.md` NDJSON·30s timeout·EADDRINUSE probe/unlink: 이미 architecture transport table(`:234,238,239`) 소유. 중복.
  - `claude-channel-plugin-default.md` `claude plugin list --json` 스키마·cwd-resolved enabled: contract성 서술 복사.
- 7개 decision Sources 어디에도 `local-agent-runtime.md`·`aiox-a2a.md` 참조 없음 → architecture/specs cross-verify 안 함.
- `rewrite-go-to-typescript.md`: "Go" 전제는 **실제로 틀림** — `legacy/bridge-relay-v1`은 TS/JS(js 3646·ts 3414, `.go` 없음). W7 원본 premise 오류라 정정은 정당. 그러나 Gemini "수정"이 미존재 경로 도입: `recipes/cmux-pair.sh`(disk 전무), `spikes/mcp-http-router-poc/`(history/13:22 인용이나 현 disk 없음 — 현 spikes/는 5개 다른 POC). 현재형 서술이라 부정확. "*Correction Candidate*" 메타노트가 본문 잔류(WHY snapshot 규칙 위반). 파일 slug는 여전히 "go".
- 정상: `pair-attach-atomicity-and-sentinel.md`(Symbol rollback sentinel WHY 적합), archive 로그(`status: decided`·history/42 권위 승계), `claude-channel-plugin-default` Sources의 `invocation.ts:161-163,219,239-249` 실재.

**판단:**

- round-1 보강 지시("누락 contract를 decision doc에 추가")가 부정확했음 — subagent B가 architecture를 안 보고 "decision doc에 없음"을 gap으로 본 것을 그대로 전달했다. 실제 contract는 architecture가 이미 소유. decision은 WHY만 + architecture 참조해야 한다.
- 재수정 필요: 복사 contract strip + architecture/specs 참조, rewrite doc 미존재 경로 제거·Go premise 정리·slug, 전 doc을 specs/architecture/plans/prd와 cross-verify.

**Next:** Gemini 2차 재수정 프롬프트(strip+reference, rewrite 정정, cross-owner 검증). 통과 후 Codex 최종검토.

## 2026-06-19 · B3 decision 문서 정합성·stale 직접 감사 — pair reason·token env·15s budget 등 수정 대상

@claude subagent가 세션 한도로 막혀 Claude가 직접 decision 문서 정합성·stale 감사(src 대조). workspace-reset 규칙(src=현재 사실, framing+로직 둘 다, Step15 kind-agnostic stale).

**STALE / INACCURATE (확인한 사실, file:line):**

- `pair-attach-atomicity-and-sentinel.md`: reason `pair_kind_slot_occupied`는 **stale** — 현재 코드는 `pair_slot_occupied`(`src/store/repositories/pairs.ts:150`, `src/core/pairs.ts:93`, `src/daemon/state.ts:576`). Step15 kind-agnostic로 "kind" 탈락. `agent_kind_mismatch`는 현재도 유효. archive 로그 history/23절도 같은 `pair_kind_slot_occupied`(Step7 당시명) — historical로 명시 안 하면 현재로 오독.
- `daemon-autostart-and-channel-identity.md`: env `AIOX_CLAUDE_AGENT_TOKEN`은 **부정확** — 실제 `AIOX_CLAUDE_CHANNEL_TOKEN`(`src/adapters/claude/launcher.ts:112,204`, `channel-server.ts:542`, `preflight.ts:123`). `AIOX_SOCKET_PATH`는 맞음.
- `codex-per-agent-app-server.md`: "총 15초 예산" — src에 명시 상수 없음(`app-server.ts:59` readyz 10s, poll 200ms; banner 5s는 별도). 파생 합을 contract값처럼 서술. D5 SIGTERM 시퀀스가 attach-failure 단일 SIGTERM(no SIGKILL, `app-server.ts:177-185`) 경로 누락 — architecture는 둘 다 구분.
- `rewrite-go-to-typescript.md`: lifecycle을 "message states"로 framing하나 실제는 `MessageDeliveryStatus`(delivery 단위: queued/delivering/delivered/completed/failed, `src/core/deliveries.ts:11`). "expired"는 post-MVP 정확(코드에 없음). + 기존 발견: Go 전제 오류·미존재 경로.

**CONSISTENCY (spec 충돌):**

- `claude-channel-trust-and-registration.md`: 등록 토큰은 실제 검증됨(`src/daemon/state.ts:931` single-use, `unknown_token` reject) → "secure single-use token" 정확. 그러나 spec `aiox-a2a.md:386`이 기록한 daemon→channel **ingress/push auth gap**을 doc이 언급 안 함 → "endpoint hijacking 방지"가 완전한 것처럼 읽힐 위험. spec과 정합 맞춰야.

**ACCURATE (확인):** `AIOX_SPIKE_STRATEGY_D` 제거됨; static key `aiox-claude-ingress`(`invocation.ts:213`, 단 server self-name `aiox-claude-${agentName}` 별도 존재 `channel-server.ts:262`); readyz 10s/poll 200ms; SIGTERM grace 3s(`app-server.ts:61`); delivery status 5종 일치.

**미검증(투명성):** codex 1:1 OS-assigned port launch 세부, uds 30s timeout·EADDRINUSE 실동작, history/24 best-effort fanout, archive 전사 수치(48/360/82d6b27, 29/151/6250a3b).

**판단:** boundary(중복) + accuracy/stale 모두 수정 필요. Gemini 재수정 프롬프트에 accuracy/stale 항목 추가. 통과 후 Codex 최종검토. 미검증 항목은 Codex 또는 추가 감사로 마저 확인.

## 2026-06-20 · B3 subagent 수정 실행 완료 — boundary strip·accuracy/stale 정정·spec 모순·허위 커밋 제거

@claude 새 세션에서 subagent 3개로 decision 문서 8개 수정 실행 완료(disjoint write scope). 검증 = 핵심 수정 grep 확인 + 각 subagent disk-verified refs.

**Boundary strip (contract→architecture 참조, decision은 WHY만):**

- codex-per-agent-app-server.md: D2 readyz·D4 turn/start ack·D5 SIGTERM 시퀀스 제거 → local-agent-runtime.md:511-514,628-633,826,109,723,546-547 참조. WHY만 유지.
- uds-transport-and-framing-contract.md: NDJSON(:234)·30s(:238)·EADDRINUSE(:239)·id-multiplex(:237)·fanout(:820-833) 제거→참조. src 확인: 30s=socket-transport.ts:266, EADDRINUSE retry=397-427, history/24 best-effort fanout=router.ts:71/84/159.
- claude-channel-plugin-default.md: plugin list --json 스키마·cwd-resolved enabled 제거→preflight.ts/architecture 참조. WHY만.

**Accuracy/stale 수정 (확인한 사실):**

- pair-attach: `pair_kind_slot_occupied`→`pair_slot_occupied`(pairs.ts:150, state.ts:576). Symbol sentinel=state.ts:36/1956 검증.
- daemon-autostart: `AIOX_CLAUDE_AGENT_TOKEN`→`AIOX_CLAUDE_CHANNEL_TOKEN`(launcher.ts:112,204). auto-start 표=architecture §9.1 참조로 축소.
- codex: "15초 예산" 제거. (subagent 정정: launcher.ts:38에 defaultTotalTimeoutMs=15_000 있으나 banner phase 전용; 실제 worst-case ~25s = banner 15s + readyz 10s. 어쨌든 "5s+10s=15s" 파생값은 오류라 제거.)
- rewrite: Go 전제 제거, meta-note 제거, 미존재 경로(recipes/cmux-pair.sh·spikes/mcp-http-router-poc/)는 "history/13 시점, 현 disk 없음"으로 명시, lifecycle framing→MessageDeliveryStatus(deliveries.ts:11). expired post-MVP 정확.

**subagent 추가 발견 (수정 반영):**

- trust doc "2xx = ack" 주장이 spec aiox-a2a.md §4.3("성공≠ack")과 **모순** → 제거. + daemon→channel ingress push auth gap을 Trade-offs에 명시(spec:386 정합). 등록 토큰 검증(state.ts:926-953 single-use)은 정확이라 유지.
- archive log 허위 커밋 `82d6b27` → **history/42 원문에 hash 없음**(82d6b27은 다른 커밋) → 제거. "48 files/360 tests", "29 files/151 tests/6250a3b"는 정확.

**Escalation (미해결, owner 결정 필요):**

1. rewrite-go-to-typescript.md slug가 내용과 모순 → `client-orchestrator-runtime-pivot.md` rename 후보(미실행; 사용자 확인+logs inbound 점검 필요. src/arch/specs inbound 없음 확인).
2. architecture local-agent-runtime.md:225 "command table in §10" → 실제 §9.1(drift). B3 write scope 밖이라 미수정.
3. `claude plugin list --json` 외부 스키마 owner 부재 → architecture preflight 섹션(§6.1-6.2)이 흡수 권장.

**Next:** escalation 처리 방침 결정 → Codex 최종검토 프롬프트(history 처리 대화 + 작업/반영 결과 묶음). B4 미검증 항목(codex 1:1 launch 등 일부)도 Codex 또는 추가 감사.

## 2026-06-20 · slug rename 반영·escalation 라우팅·Codex 최종검토 범위 확정

@user 지시로 escalation 라우팅 확정 및 slug rename 반영.

**#1 slug rename 실행 (완료):**

- `git mv docs/decisions/rewrite-go-to-typescript.md → docs/decisions/client-orchestrator-runtime-pivot.md`. 이유: 내용이 Go 전제(오류)를 제거해 slug "go"가 내용과 모순.
- inbound 전수(`rg rewrite-go-to-typescript`): src/architecture/specs 참조 없음. 나머지는 모두 logs(historical 서술 + active B1 map).
- **B4 reconcile**: `history/13` repoint target = `docs/decisions/client-orchestrator-runtime-pivot.md`. B1 source map(line 169·48·60)·parent inventory(516)·W7 log(152·167·418·536)의 옛 이름은 **생성 당시 historical record로 보존**하되, B4 inbound cleanup은 새 경로를 사용한다.

**escalation 라우팅 (@user):**

- #1 rename → 반영 완료(위).
- #2 architecture `local-agent-runtime.md:225` "command table in §10"(실제 §9.1 drift) → Codex 최종검토에서 **무슨 의미인지 설명** 요청.
- #3 `claude plugin list --json` 외부 스키마 owner 부재 → Codex 최종검토에서 **어떻게 할지 의견** 요청.

**Codex 최종검토 추가 범위 (@user):**

1. W5 controlling log의 repoint map(B1 source map)이 **history 관련해서 맞는지** 정합성 재검토.
2. "decision 문서만 생성한 게 맞나" — specs/architecture/logs로 갔어야 할 내용이 decision에 잘못 들어간 건 없는지(상위 boundary 감사).
3. W7-B* 작업(이전 세션) 때 controlling log에 미래지향 내용만 있는 줄 알았으나 **stale 내용이 있어 사용자에게 보고·작업지시**했던 전례 찾기(`logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md` 등) — 같은 유형 stale이 지금도 있는지 점검.
4. 현재 W5 로그(`logs/2026-06-19-workspace-reset-W5-history-migration.md`) 기록 검토.
5. history 삭제 안전성 종합 판정.

**Next:** Codex 최종검토 프롬프트 산출(history 처리 대화 + Gemini 작업/Claude·subagent 반영 결과 + 위 5개 범위).

## 2026-06-20 · B4 execution map and final reconcile

**B3 Grouping Corrections:**
"B3 initial grouping had omissions; B4 uses this corrected map."
기존 B3 grouping 설명에서 누락되었던 7개 파일(`history/3`, `5`, `14`, `38`, `48`, `54`, `55`)을 포함하여 전체 `1~59` 및 `README.md` 총 60개 항목이 빠짐없이 포함된 B4 staging group 분류는 다음과 같다.
- **G1 (인용 + 기존/신규/보강 decision 존재, delete-after-repoint)**: 5, 13, 22, 24, 25, 26, 28, 29, 31, 33, 35, 38, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57 (총 25개)
- **G2 (인용 + decided archive log 이관, archive-after-repoint)**: 20, 23, 27, 34, 36, 39, 40, 41, 42 (총 9개; 이 중 23, 34, 40은 mixed target). archive log 수용 집합과 일치(intro·Sources·body digest 모두 이 9개).
- **G3 (downstream)**: 58, 59 (총 2개). 58은 W8(A2A spec) 작업 시 확인할 문서. 59는 W10 작업 시 확인할 문서.
- **G4 (비-live-cited baseline, final delete candidate / delete-only)**: 1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 17, 18, 19, 21, 30, 32, 37, 43, 44 (총 23개). current-authority(docs/architecture·specs·decisions·src·README) 인용 0 확인 → git history로만 보존, archive 미확장(B3 기준선 = 기본 delete). 단 15·16·19·30·32·43·44는 legacy `plan/`·`prd/` 또는 W5-제외 `docs/aiox/` 인용이 있어 표에 [Fact]로 명시(archive 사유 아님; 해당 legacy/excluded source assimilation 시 함께 정리).
- **G5 (live-cited index, repoint 후 삭제)**: README.md (총 1개). archive log가 진입점 권위 승계 → live 인용 2곳(architecture:1153, plans:33) repoint 후 삭제.
- **Total Count**: G1(25) + G2(9) + G3(2) + G4(23) + G5(1) = 60개 파일

**WHY of history/39 Decision:**
[Fact] `history/39-step-13-codex-mcp-ingress.history.md`는 Codex MCP Ingress 스파이크 및 `aiox mcp-codex` subcommand 구현 결정을 소유한다.
[Inference] 이 메커니즘의 근본적인 WHY(글로벌 config 변경 방지 및 launch-time dynamic override)는 이미 `history/38` 기반의 `docs/decisions/agent-level-mcp-process-scoping.md`에 충분히 흡수되어 있다. 상세한 CLI `-c` TOML override 구현 사실은 `docs/architecture/local-agent-runtime.md` §7.8이 이미 상세히 소유하므로 별도 decision 승격은 불필요하다. 따라서, 기존 architecture의 history/39 인용은 `logs/2026-06-19-mvp-history-archive.md`로 repoint하면 충분하다.
[Fact] archive log 수용 정합 보정: `logs/2026-06-19-mvp-history-archive.md` §2.4에 history/39 provenance digest와 §5 Sources entry를 추가해 repoint 타깃이 실제 내용을 담도록 했다. live 인용 사이트는 architecture `:703`, `:877`(B4 repoint 대상). current behavior owner는 architecture §7.8.

### B4 Execution Map (60 Files Summary)

B4 표의 `Status`는 repoint/delete 후보를 빠르게 분류하기 위한 실행 상태다.
`delete-only`, `delete-after-repoint`, `logs archive`는 물리 삭제 확정이 아니며, B4/B6는
해당 history를 참조하는 owner 문서·decision·archive log가 history 원본 없이 충분한
요약/근거/WHY를 담는지 확인한 뒤 final delete gate로 넘긴다. Source Map을 입력으로 쓰는
W8/W10도 이 self-sufficiency/delete guard를 함께 소비한다.

| History file | Short summary | B4 Repoint Target | Status | Note |
| --- | --- | --- | --- | --- |
| `history/1-bridge.history.md` | [Fact] bridge daemon 초기 도입 맥락 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/2-claude-adapter.history.md` | [Fact] Claude adapter 초기 설계 흔적 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/3-bridge-live-session-symmetry.history.md` | [Fact] live session symmetry 검증 | [Fact] none found | delete-only | |
| `history/4-bridge-app-server-live-session-investigation.history.md` | [Fact] app server session 분석 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/5-shared-app-server-validation.history.md` | [Fact] 1:N shared app-server 검증 | `docs/decisions/codex-per-agent-app-server.md` | delete-after-repoint | |
| `history/6-bridge-ws-client-validation.history.md` | [Fact] websocket client 동작 검증 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/7-bridge-reply-collection-bug.history.md` | [Fact] reply collection 버그 기록 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/8-bridge-notification-queue-fix.history.md` | [Fact] notification queue 이슈 해결 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/9-reverse-path-probe-chat-id-followup.history.md` | [Fact] chat-id 매핑 팔로우업 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/10-reverse-path-inband-relay.history.md` | [Fact] in-band relay 아키텍처 설계 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/11-resume-session-pending-lifecycle.history.md` | [Fact] session resume 라이프사이클 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/12-durable-relay-architecture.history.md` | [Fact] durable relay 아키텍처 검토 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/13-aiox-rewrite-decision.history.md` | [Fact] TS 백엔드 개작 결정 | `docs/decisions/client-orchestrator-runtime-pivot.md` | delete-after-repoint | (B1 stale target 보정) |
| `history/14- aiox-init.history.md` | [Fact] aiox cli init 설계 흔적 | [Fact] none found | delete-only | |
| `history/15-mvp-design-decisions.history.md` | [Fact] MVP core 설계 결정 사항 | [Fact] none found (live) | delete-only | [Fact] inbound(legacy/excluded): plan/checklist·prd/mvp-spec·prd/post-mvp/archive — current authority 아님 |
| `history/16-step-2-sqlite-repository-cleanup.history.md` | [Fact] SQLite repository cleanup 구현 | [Fact] none found (live) | delete-only | [Fact] inbound: plan/checklist(legacy) + docs/aiox×2(W5 제외) |
| `history/17-step-3-daemon-api-lifecycle.history.md` | [Fact] daemon API/lifecycle 구현 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/18-step-4-cli-parsing.history.md` | [Fact] CLI parsing 구조 설계 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/19-step-5-route-fanout-tests.history.md` | [Fact] route fanout 테스트 | [Fact] none found (live) | delete-only | [Fact] inbound: plan/checklist(legacy) |
| `history/20-step-6-phase-a-decisions.history.md` | [Fact] CLI 디자인 및 에러 처리 결정 | `logs/2026-06-19-mvp-history-archive.md` | logs archive | |
| `history/21-step-6-invocation-bin.history.md` | [Fact] CLI invocation binary 연동 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/22-step-7-phase-a-decisions.history.md` | [Fact] daemon connection state 기획 | `docs/decisions/pair-attach-atomicity-and-sentinel.md` | delete-after-repoint | |
| `history/23-step-7-phase-b-pair-daemon.history.md` | [Fact] pair daemon listen lifecycle | **Mixed Target** (see below) | delete-after-repoint | |
| `history/24-step-8-phase-a-decisions.history.md` | [Fact] socket buffer size 및 multiplexing | `docs/decisions/uds-transport-and-framing-contract.md` | delete-after-repoint | |
| `history/25-step-9-phase-a-real-socket-transport.history.md` | [Fact] real socket transport 연동 | `docs/decisions/uds-transport-and-framing-contract.md` | delete-after-repoint | |
| `history/26-step-9-socket-transport-hardening.history.md` | [Fact] socket transport hardening | `docs/decisions/uds-transport-and-framing-contract.md` | delete-after-repoint | |
| `history/27-step-10-codex-clear-new-rebind-spike.history.md` | [Fact] transparent proxy rebind spike | `logs/2026-06-19-mvp-history-archive.md` | logs archive | |
| `history/28-step-10-proxy-lazy-observation.history.md` | [Fact] transparent proxy lazy parse 패턴 | `docs/decisions/proxy-lazy-observation-cost-model.md` | delete-after-repoint | |
| `history/29-step-10-per-agent-app-server-pivot.history.md` | [Fact] 1:1 app-server 피벗 결정 | `docs/decisions/codex-per-agent-app-server.md` | delete-after-repoint | |
| `history/30-step-10-per-agent-proxy-runtime.history.md` | [Fact] per-agent proxy runtime 스케줄링 | [Fact] none found (live) | delete-only | [Fact] inbound: docs/aiox(W5 제외 dependency) |
| `history/31-step-10-per-agent-app-server-runtime.history.md` | [Fact] 1:1 app-server 런타임 결정 | `docs/decisions/codex-per-agent-app-server.md` | delete-after-repoint | (B1 stale target 보정) |
| `history/32-step-10-per-agent-app-server-resume-spike.history.md` | [Fact] app server resume spike 측정 | [Fact] none found (live) | delete-only | [Fact] inbound: plan/checklist(legacy) + docs/aiox(W5 제외) |
| `history/33-step-10-phase-a-decisions.history.md` | [Fact] app server TUI 통신 설계 결정 | `docs/decisions/codex-per-agent-app-server.md` | delete-after-repoint | (B1 stale target 보정) |
| `history/34-step-10-phase-b-codex-runtime.history.md` | [Fact] Codex 런타임 에러 처리 정책 | **Mixed Target** (see below) | delete-after-repoint | |
| `history/35-step-11-phase-a-claude-channel-decisions.history.md` | [Fact] Claude 채널 등록 프로토콜 | `docs/decisions/claude-channel-trust-and-registration.md` | delete-after-repoint | |
| `history/36-step-12-phase-a-doctor-status-decisions.history.md` | [Fact] doctor status API 설계 | `logs/2026-06-19-mvp-history-archive.md` | logs archive | |
| `history/37-step-13-14-mvp-manual-e2e-planning.history.md` | [Fact] MVP e2e 수동 검증 계획 | [Fact] none found | delete-only | inbound: history만(공동 삭제) |
| `history/38-step-13-mcp-scope-decision.history.md` | [Fact] per-process config injection 결정 | `docs/decisions/agent-level-mcp-process-scoping.md` | delete-after-repoint | |
| `history/39-step-13-codex-mcp-ingress.history.md` | [Fact] Codex MCP ingress 연결 검증 | `logs/2026-06-19-mvp-history-archive.md` §2.4 | logs archive | (decision 불필요; archive §2.4 digest+Sources 추가됨; behavior owner=architecture §7.8; repoint 사이트 architecture :703·:877) |
| `history/40-step-14-daemon-client-split.history.md` | [Fact] daemon-client 분리 구조 설계 | **Mixed Target** (see below) | delete-after-repoint | |
| `history/41-codex-loaded-thread-binding-analysis.history.md` | [Fact] Codex wrong-thread 문제 분석 | `logs/2026-06-19-mvp-history-archive.md` | logs archive | |
| `history/42-mvp-implementation-closeout.history.md` | [Fact] MVP 구현 종료 선언 | `logs/2026-06-19-mvp-history-archive.md` | logs archive | |
| `history/43-qa-round-1.history.md` | [Fact] QA Round 1 버그 디버깅 기록 | [Fact] none found (live) | delete-only | [Fact] inbound: plan/qa-tracker(legacy) |
| `history/44-qa-round-2.history.md` | [Fact] QA Round 2 smoke 테스트 기록 | [Fact] none found (live) | delete-only | [Fact] inbound: plan/qa-tracker(legacy) |
| `history/45-step-15-pair-slot-generalization-design.history.md` | [Fact] slot 모델 일반화 설계 결정 | `docs/decisions/pair-slot-generalization.md` | delete-after-repoint | |
| `history/46-step-15-phase-a-decisions.history.md` | [Fact] slot 모델 일반화 의사결정서 | `docs/decisions/pair-slot-generalization.md` | delete-after-repoint | |
| `history/47-step-15-phase-b-closeout.history.md` | [Fact] slot 모델 일반화 구현 완료 | `docs/decisions/pair-slot-generalization.md` | delete-after-repoint | |
| `history/48-step-15-d8-surface-consistency.history.md` | [Fact] MCP tool surface nested dispatch | `docs/decisions/pair-slot-generalization.md` | delete-after-repoint | |
| `history/49-claude-mcp-config-injection-feasibility.history.md` | [Fact] 인라인 MCP config 주입 검토 | `docs/decisions/claude-channel-plugin-default.md` | delete-after-repoint | |
| `history/50-claude-channel-injection-verification-and-strategy.history.md` | [Fact] 플러그인 방식 D 전략 결정 | `docs/decisions/claude-channel-plugin-default.md` | delete-after-repoint | |
| `history/51-claude-plugin-list-schema-and-preflight-correction.history.md` | [Fact] plugin list --json 실측 스키마 | `docs/decisions/claude-channel-plugin-default.md` | delete-after-repoint | |
| `history/52-claude-plugin-scope-precedence-and-resolved-enabled.history.md` | [Fact] scope precedence 실측 및 preflight 단순화 | `docs/decisions/claude-channel-plugin-default.md` | delete-after-repoint | |
| `history/53-r3-closeout-step1-plugin-cli-adapter.history.md` | [Fact] plugin CLI 어댑터 mock TDD | `docs/decisions/claude-channel-plugin-default.md` | delete-after-repoint | |
| `history/54-r3-step2-invocation-preflight-wiring.history.md` | [Fact] preflight invocation 배선 TDD | `docs/decisions/claude-channel-plugin-default.md` | delete-after-repoint | |
| `history/55-r3-step3a-claude-plugin-setup-ux.history.md` | [Fact] plugin setup CLI 구현 기록 | `docs/decisions/claude-channel-plugin-default.md` | delete-after-repoint | |
| `history/56-r3-step3b-claude-plugin-default-strategy.history.md` | [Fact] D strategy 기본 전략 승격 | `docs/decisions/claude-channel-plugin-default.md` | delete-after-repoint | |
| `history/57-qa-round-4-runtime-namespace-isolation.history.md` | [Fact] 실행 프로파일별 namespace 격리 | `docs/decisions/runtime-profile-namespace-isolation.md` | delete-after-repoint | (B1 stale target 보정) |
| `history/58-post-mvp-a2a-architecture-decisions.history.md` | [Fact] Post-MVP A2A 의사결정 기록 | `[Fact] W8 확인 문서` | downstream | W8(A2A spec) 작업 시 확인할 문서 |
| `history/59-local-obsidian-vault-atlas-discussion.history.md` | [Fact] Obsidian vault atlas 설계 기록 | `W10 확인 문서` | downstream [Inference] | W10 작업 시 확인할 문서 |
| `history/README.md` | [Fact] history 디렉토리 진입 설명서 | `logs/2026-06-19-mvp-history-archive.md` | repoint-needed | [Fact] live inbound: local-agent-runtime.md:1153·plans/post-mvp.plan.md:33 → B4에서 archive log로 repoint 후 삭제 |

### Mixed Targets Repoint Mapping Details

1. **`history/23-step-7-phase-b-pair-daemon.history.md`**
   - **Rationale Target (`docs/decisions/pair-attach-atomicity-and-sentinel.md`) — B4 executable repoint**:
     - `docs/architecture/local-agent-runtime.md#L184` (Rollback sentinel pattern `history/23 D2`)
   - **External dependency (W5 제외 — docs/aiox link-hygiene 단계 소관, B4 repoint 비실행, 기록만)**:
     - `docs/aiox/mvp-architecture.md#L145` (Rollback sentinel pattern `history/23 D2`)
   - **Historical / TDD Trace Target (`logs/2026-06-19-mvp-history-archive.md` §2.1)**:
     - `logs/2026-06-19-mvp-history-archive.md#L34` & `L98` (Step 7 TDD/이력 인용)
     - `logs/2026-06-16-workspace-reset-폴더별-inventory.md#L521`

2. **`history/34-step-10-phase-b-codex-runtime.history.md`**
   - **Rationale Target (`docs/decisions/codex-per-agent-app-server.md`)**:
     - `docs/architecture/local-agent-runtime.md` L107 (D5-A.5 normal exit), L114 (banner verification), L350 (Commander options), L513 (banner resolution), L523 (WS client initialize), L538 (TUI child scope), L544 (attach failure single SIGTERM), L625 (declared-only event), L631 (turn/start ack), L638 (input array structure), L712 (Codex runtime attach cascade), L731 (remoteControl status change), L994 (mismatch guard), L1079 (uncertain observed)
   - **Historical / TDD Trace Target (`logs/2026-06-19-mvp-history-archive.md` §2.2)**:
     - `logs/2026-06-19-mvp-history-archive.md#L41` & `L100` (Step 10 TDD 및 에러 처리 구현)

3. **`history/40-step-14-daemon-client-split.history.md`**
   - **Rationale Target (`docs/decisions/daemon-autostart-and-channel-identity.md`)**:
     - `docs/architecture/local-agent-runtime.md#L924` (PRD: "Auto-start daemon if needed" `history/40:27`)
     - `docs/decisions/daemon-autostart-and-channel-identity.md#L26` (Sources)
   - **Historical / TDD Trace Target (`logs/2026-06-19-mvp-history-archive.md` §2.3)**:
     - `docs/architecture/local-agent-runtime.md` L407, L421 (chat_id, origin 매핑 parent_message_id)
     - `docs/architecture/local-agent-runtime.md` L664 (FSM transition; no retry in MVP)
     - `docs/architecture/local-agent-runtime.md` L690, L700 (TUI scope daemon child)
     - `docs/architecture/local-agent-runtime.md` L1127 (Codex queued delivery retry/drain)
     - `logs/2026-06-19-mvp-history-archive.md#L52` & `L102` (CLI multi-terminal concurrency, UDS socket path probe, TUI exit cleanup)

## 2026-06-20 · Codex 최종검토 5건 반영·archive log 정합

Codex 최종검토 5건 + archive log 정합 반영. B4 실행 전 map/log 단계 수정이며 history 원본·코드·owner contract는 미수정(repoint 실행은 B4 소관).

### 반영 내용 (Codex 지적 1~5)

1. **G4 라벨 모순 해소** — 정의가 "즉시 delete"인데 표 다수 행이 archive였음. B3 기준선(기본 delete, 예외만 보존)대로 정리: G4를 archive로 확장하지 않고 `final delete candidate / delete-only`로 통일. 그룹 정의에서 README 분리(→G5), G4=23개. [Fact] G4 23개 모두 current-authority(docs/architecture·specs·decisions·src·README) 인용 0 확인. [Fact] 단 15·16·19·30·32·43·44는 legacy `plan/`·`prd/` 또는 W5-제외 `docs/aiox/` 인용이 있어 표 Note에 [Fact]로 명시(archive 사유 아님; 해당 legacy/excluded source assimilation 시 함께 정리).
2. **history/README repoint-needed로 정정** — `none found/delete-only`는 오류. [Fact] live inbound 2곳: `docs/architecture/local-agent-runtime.md:1153`, `plans/post-mvp.plan.md:33`. Target=archive log(진입점 권위 승계), Status=`repoint-needed`. B4에서 두 인용 repoint 후 삭제. README는 G5로 분리.
3. **history/59 라벨 지정** — W10 작업 시 확인할 문서로 분류. [Fact] 근거: B1 source map(이 로그)이 W10 연계를 `[Inference]`로 확정("내용연관 추론")하고 arbiter가 [Inference] 유지 결정함. history/58은 W8(A2A spec) 작업 시 확인할 문서로 지정.
4. **history/23 mixed target에서 docs/aiox 제외** — `docs/aiox/mvp-architecture.md#L145`를 B4 executable Rationale Target에서 빼고 "External dependency (W5 제외, repoint 비실행, 기록만)"로 이동. [Fact] W5 scope는 docs/aiox link-hygiene 제외(B3 constraints). executable target은 architecture#L184만. h/34·h/40 mixed target은 docs/aiox 미포함 확인(수정 불필요).
5. **history/39 archive 수용 정합** — decision 승격 안 함. [Fact] history/39는 architecture `:703`·`:877`이 live 인용(G2 타당). [Fact] current behavior owner=architecture §7.8 "Codex MCP Ingress"(`:677` 존재 확인). archive log에 §2.4 provenance digest(Step 13 ingress·inline `-c mcp_servers.aiox`·hidden `aiox mcp-codex`·token hardening·Step 14 correction) + intro·§5 Sources entry 추가. B4 repoint 사이트=architecture :703·:877.

### 추가 정합 (검증 중 발견)

- [Fact] archive log Sources(§5)에 `history/13` spurious 항목 존재(본문 digest 없음, B4 map은 13→`docs/decisions/client-orchestrator-runtime-pivot.md`). 제거함. archive 수용 집합을 G2 9개와 일치시킴.

### Verification Ledger

| 항목 | 검증 | 결과 |
| --- | --- | --- |
| B4 표 `logs archive` 상태 행 | grep + awk: 20,27,36,39,41,42(6) + mixed 23,34,40(3, status=delete-after-repoint) | G2 9개 정확 일치 [Fact] |
| B4 표 `delete-only` 행 | awk count | G4 23개(1,2,3,4,6,7,8,9,10,11,12,14,15,16,17,18,19,21,30,32,37,43,44) 정확 [Fact] |
| README 행 | grep | `repoint-needed → archive log` [Fact] |
| history/59 행 | grep | `blocked pending W10 owner confirmation / guard [Inference]` [Fact] |
| history/39 live inbound | `grep -rn` docs/plans/src | architecture:703·877 [Fact]; docs/aiox·plan·prd(legacy/excluded) |
| architecture §7.8 존재 | grep local-agent-runtime.md:677 | [Fact] 존재 |
| G4 7개 inbound 출처 | B1 source map 역참조 추출 | 전부 legacy plan//prd/ 또는 excluded docs/aiox; current authority 0 [Fact] |
| archive log intro/Sources/body | grep 3자 대조 | 모두 {20,23,27,34,36,39,40,41,42} 9개 일치; history/13 제거(0) [Fact] |

### 미해소 / B4 선결

- [Fact] G3 58·59는 보존하며, 각각 W8(A2A spec), W10 작업 시 확인할 문서로 표기.
- [Inference] G4 7개(15,16,19,30,32,43,44)의 legacy plan//prd/ 인용은 해당 legacy source assimilation 단계에서 정리 예정 — history 삭제 시 깨진 링크가 되지만 양끝이 모두 legacy/제외라 current authority 손실 아님. 단 plan//prd/를 current authority로 본다면 재분류 필요(사용자 판단 여지).
- [Fact] docs/aiox 인용(h/16·30·32 등)은 W5 제외 — docs/aiox link-hygiene 단계가 소관.

## 2026-06-20 · Codex 재검토 PASS·archive 29/31 rephrase·B4 cleanup 항목 격상

Codex 재검토 결과 반영. B4 map·archive log는 PASS, blocker 없음. 권장 1건 수정 + cleanup 항목 격상.

### 반영

- [Fact] archive log §3.1 본문(line 76)의 `(history/29/31)` parenthetical을 `(결정 owner: docs/decisions/codex-per-agent-app-server.md)`로 rephrase. 이유: 29·31은 이 archive 수용집합(9개)이 아니라 G1 decision 소유이고, W11에 삭제되므로 survive하는 archive 안에 삭제될 history 번호를 박으면 self-inflicted forward-dangling이 된다. 수정 후 archive 본문의 history/N 참조는 수용집합 {20,23,27,34,36,39,40,41,42}로 한정됨(grep 확인, 29/31=0). ledger의 "body=9개 일치" 주장도 이제 엄밀히 참.

### B4 후 cleanup 항목 (명시 격상)

- [Fact] G4 delete-only 7개(15,16,19,30,32,43,44)는 B4에서 history 삭제 시 legacy `plan/`·`prd/` 및 W5-제외 `docs/aiox/` 문서에 깨진 링크를 남긴다. current authority 손실은 아니므로 B4 blocker는 아니지만, 깨진 링크 정리는 누락 방지를 위해 **B5(legacy/prd assimilation) 또는 docs/aiox link-hygiene 단계의 cleanup 항목**으로 명시 유지한다.
- [Fact] archive log §5 Sources의 `../../history/N` 링크(9개)도 W11 history 삭제 시 dead link가 된다. 이는 "superseded 출처" provenance 기록이므로 archive가 그 후속이며, 평문화 여부는 W11/B4 삭제 실행 시점에서 처리.

### Decision 확정

- [Fact] `plan/`·`prd/`를 current authority로 볼지에 대한 open [Inference]는 Codex Opinion + root/logs 지침(legacy PRD·post-MVP plan·history·old docs는 현재 사실로 자동 승격 금지, owner별 재분류)으로 해소됨 → legacy로 확정. G4 7개 delete-only 분류 최종 고정.

### B4 실행 조건 (재확인)

- history/58은 W8(A2A spec) 작업 시 확인할 문서로 지정, history/59는 W10 작업 시 확인할 문서로 지정.
- README·39·23·34·40 등 live refs는 map대로 repoint하되, repoint target이 history 원문 없이 필요한 현재 사실/WHY/경위를 복원할 수 있는지 확인한다.
- G1 decision repoint, G2 archive repoint, G4 delete-only, G5(README) repoint는 모두 self-sufficiency 검증 후 delete candidate로 둔다. 이 문구는 즉시 물리 삭제를 뜻하지 않는다.

## 2026-06-20 · Package Work Item ownership discussion

@user concern: cleanup ledger를 남겨도 Work Items와 parent/package read path에 걸리지 않으면 다음 agent가 놓칠 수 있다. 또한 cleanup을 계속 새 Work Item으로만 추가하면 전체 Work Item 순서와 소유권 충돌을 점검하지 못할 수 있다.

@codex/subagent review:

- [Fact] W12/W13은 누락 방지용 follow-up으로 추가됐지만, W5 child package의 독립 open Work Item으로 두기에는 owner가 섞여 있었다. W12는 W5 B5가 다룰 legacy `plan/`·`prd/` cleanup과 W5 밖 `docs/aiox` link-hygiene dependency가 섞여 있고, W13은 `plans/workspace-reset/workspace-reset.md`의 단일 물리 삭제 게이트가 소유한다.
- [Fact] Work Items를 재정렬했다. W5는 B5 carryover + legacy/prd cleanup handoff를 명시하고, W12/W13은 `Transferred:`로 닫아 W5 closeout을 부정확하게 막지 않게 했다.
- [Opinion] 이 사례는 package log 운영 규칙으로 일반화할 가치가 있다. Ledger/Cross-Owner `Action`은 Work Item과 대조해야 하고, 새 follow-up item을 추가할 때는 전체 Work Item 순서·충돌·owner를 함께 점검해야 한다.
- [Fact] repo integration 임시 보강은 `logs/AGENTS.md`에 반영했다. portable log skill 자체는 이미 actionable follow-up과 parent/child pointer 규칙을 갖고 있어 이번에는 수정하지 않았다.

## 2026-06-20 · Cross-log audit follow-up — checklist disposition and deletion gate owner

inventory/W5/W7 로그 정합 감사를 이어서 수행하며 Work Items 문구를 보정했다.

**확인한 사실:**

- W7 package는 `plan/mvp-implementation-checklist.md`를 Current as-built/load-bearing 보존 파일로 분류하고 삭제 금지라고 기록한다.
- W5 child의 B1 carryover map과 기존 W5 Work Item은 같은 파일을 logs archive candidate로 다뤘다. 이는 B5 실행 전에 reconcile해야 하는 실제 충돌 후보다.
- `history physical deletion gate`는 여러 기록에서 "W11 gate"로 불렸지만, W4.5 W11은 portable workflow 수집 Work Item이고 history deletion owner가 아니다.

**수정한 Work Items:**

- W5는 `plan/mvp-implementation-checklist.md` archive를 전제하지 않고 W7 Current/load-bearing 판정과 먼저 reconcile하도록 수정했다.
- W6 closeout은 parent 반영 전 history physical deletion gate owner를 명시하도록 수정했다.
- W13은 W11을 target으로 쓰지 않고, W6 closeout이 실제 deletion gate owner를 명시하기 전까지 삭제 실행 조건으로 남긴다고 정정했다.

**남은 일:**

- B5에서 `plan/mvp-implementation-checklist.md`를 owner 보존할지, logs archive로 이관할지, 또는 owner 문서와 archive를 나눌지 결정해야 한다.
- B6 closeout 전 history 물리 삭제 gate가 어느 로그/Work Item에 속하는지 명시해야 한다.

## 2026-06-20 · Delete candidate 기준 보강 — owner/archive self-sufficiency

@user 지적: delete candidate 정리는 단순히 history 참조를 다른 곳으로 돌리는 작업이 아니다.
history를 참조하던 owner 문서나 archive log가 history 원문 없이도 필요한 현재 사실, WHY,
검증 경위 또는 provenance를 복원할 수 있는지 검토해야 한다.

**수정한 기준:**

- B4 live ref repoint는 target self-sufficiency 확인을 포함한다.
- `delete-after-repoint`, `delete-only`, `repoint-needed`는 물리 삭제가 아니라 self-sufficiency
  검증 후 delete candidate로 둔다는 뜻이다.
- G1 decision target, G2 archive target, G5 README archive target은 history 원문 없이 읽히는
  digest/source note를 가져야 한다.
- current owner 문서가 archive log만 가리켜 현재 사실을 설명하는 상태면 부족하다. 현재
  사실은 owner 문서/code/test가 소유하고, archive log는 경위/provenance를 보존해야 한다.
- W6 closeout은 delete candidate 전체가 이 self-sufficiency 기준을 통과했는지 확인하고, 물리 삭제는 `plans/workspace-reset/workspace-reset.md`의 단일 물리 삭제 게이트를 따른다.

## 2026-06-20 · B4 self-sufficiency audit — history refs by role

사용자 지시에 따라 subagent A/B를 read-only로 나눠 돌린 뒤, 핵심 후보를 main Codex가
직접 `file:line`으로 재확인했다. 이 블록은 아직 owner 문서 본문을 repoint하지 않고, B4가
어떤 순서로 repoint/보강/보류해야 하는지 기록한다.

**확인한 사실:**

- `docs/specs/aiox-a2a.md`에는 `history/` 직접 참조가 없다. W8은 `history/58` 내용을
  source map 입력으로 받아 spec owner에 흡수할지 판단해야 한다.
- `docs/decisions/*`의 주요 target은 대부분 본문에 Context/Decision/Alternatives/Rationale을
  갖고 있어 history 원문 없이 WHY를 읽을 수 있다. 예: `codex-per-agent-app-server.md`
  `:3-34`, `pair-slot-generalization.md` `:3-88`, `runtime-profile-namespace-isolation.md`
  `:3-67`, `claude-channel-plugin-default.md` `:3-43`.
- `logs/2026-06-19-mvp-history-archive.md`는 G2 archive target으로서 successor 목적(`:9-11`)과
  per-source digest(`:34-99`)를 갖는다.
- `docs/architecture/local-agent-runtime.md`는 current owner로 충분한 current fact 본문을
  많이 갖고 있지만, header의 citation contract가 아직 `history/<N>`를 허용한다(`:16-18`).
  또한 per-step rationale index가 `history/README.md`를 직접 가리킨다(`:1152-1153`).
- `plan/mvp-implementation-checklist.md`는 Notes에서 future editor에게 `history/15` 또는
  deleted PRD를 먼저 갱신하라고 말한다(`:1150-1152`).
- `plan/qa-tracker.md`는 QA 권위를 `history/4X-qa-round-*.history.md`로 둔다(`:3-10`).
- `plans/post-mvp.plan.md`는 product/architecture 권위에 `history/`를 포함하고(`:3-5`),
  `history/58`을 current Session Re-entry authority와 read path에 둔다(`:18-23`, `:40-43`).
- `logs/2026-06-19-mvp-history-archive.md` §5 Sources는 여전히 `../../history/*.history.md`
  링크를 갖는다(`:103-112`). W5 기존 기록은 이를 history physical deletion gate에서 처리할
  dead-link risk로 본다.

**분류와 B4 판정:**

| Candidate | Role classification | B4 action |
| --- | --- | --- |
| decision docs `Sources`의 `history/N` | WHY/provenance source pointer. 본문은 대체로 self-contained | 물리 삭제 전 Sources를 dead link가 되지 않는 provenance note로 바꾸거나 W6 gate에서 plaintext 처리 기준 확정 |
| `docs/architecture/local-agent-runtime.md:16-18` | current authority/citation contract | B4 repoint 보강 필요. history 삭제 후에는 concrete claim citation을 owner/doc/code/test/archive로 제한해야 함 |
| `docs/architecture/local-agent-runtime.md:1152-1153` | plain source index pointer | `history/README.md` 대신 `logs/2026-06-19-mvp-history-archive.md`와 relevant decision docs로 repoint 필요 |
| `logs/2026-06-19-mvp-history-archive.md:103-112` | archive provenance Sources | archive 자체 digest는 충분. 링크는 W6 physical deletion gate에서 plaintext/provenance note로 전환 필요 |
| `plan/mvp-implementation-checklist.md:1150-1152` | stale authority rule | B5 carryover에서 owner/archive 흡수 후 삭제 candidate로 둘지 결정. 지금 delete candidate 아님 |
| `plan/qa-tracker.md:3-10` | stale authority declaration | B5 carryover에서 archive/owner 분리 필요. 지금 delete candidate 아님 |
| `plans/post-mvp.plan.md:18-23`, `:40-43` | live future plan authority | `history/58`은 W8(A2A spec) 작업 시 확인할 문서. W8/W9가 owner 흡수 뒤 repoint |

**추론/판단:**

- G1 decision docs는 "본문 self-sufficiency"와 "Sources dead-link hygiene"를 분리해서 본다.
  본문이 충분하더라도 Sources가 `../../history/N` 링크인 상태면 physical deletion gate에서
  처리해야 한다.
- G2 archive log는 archive target으로 충분하지만, archive가 원본 history 링크를 계속
  live link로 들고 있으면 history 삭제 직후 dead link를 만든다. 이는 B4 owner repoint보다
  W6 physical deletion readiness audit의 체크리스트에 더 가깝다.
- `plan/mvp-implementation-checklist.md`와 `plan/qa-tracker.md`는 아직 self-contained delete
  target이 아니다. W7에서 checklist를 current/load-bearing으로 본 판정과 W5 carryover
  archive 후보를 B5에서 reconcile해야 한다.
- `history/58`과 `history/59`는 이번 audit 결과 W8(A2A spec) 및 W10 작업 시 확인할 문서로 보존된다.

**다음 실행 순서:**

1. B4에서 architecture live refs(`history/README.md`, `history/39`, `history/40` 등)를
   archive/decision/current owner target으로 repoint한다.
2. G1 decision docs의 Sources는 본문 self-sufficiency는 통과 후보로 두되, physical deletion
   전 dead-link conversion 기준을 W6에 넘긴다.
3. B5에서 checklist/qa carryover를 owner 보존, archive 보존, delete candidate로 나눌지
   결정한다.
4. history/58 및 history/59는 각각 W8(A2A spec) 및 W10 작업 시 확인할 문서로 보존한다.

## 2026-06-20 · B4 architecture repoint partial — README, history/39, history/40

B4 self-sufficiency audit 결과를 바탕으로 `docs/architecture/local-agent-runtime.md`의
가장 직접적인 live history refs 일부를 repoint했다. 이 작업은 history 원문 삭제가 아니라
architecture current owner가 history 원문을 live authority로 요구하지 않도록 하는 준비다.

**수정한 파일:**

- `docs/architecture/local-agent-runtime.md`

**확인한 사실:**

- Architecture header의 "Every concrete claim cites either `file:line` or `history/<N>`" 문구를
  current `file:line` 또는 migrated decision/archive provenance note 기준으로 바꿨다.
- `history/README.md` index 참조를 제거하고, decision-worthy rationale은 `docs/decisions/`,
  MVP implementation/QA trace provenance는 `logs/2026-06-19-mvp-history-archive.md`가
  소유한다고 정리했다.
- `history/39` live refs는 `logs/2026-06-19-mvp-history-archive.md` §2.4로 repoint했다.
- `history/40` live refs는 `logs/2026-06-19-mvp-history-archive.md` §2.3으로 repoint했다.
- `rg -n "history/39|history/40|history/README" docs/architecture/local-agent-runtime.md` 결과
  해당 refs는 더 이상 남지 않는다.

**남은 B4 항목:**

- `docs/architecture/local-agent-runtime.md`에는 아직 `history/23`과 `history/34` 인용이 남아
  있다. 이는 다음 B4 묶음에서 current fact/WHY/provenance로 분류해 decision/archive/current
  owner target으로 repoint해야 한다.
- G1 decision docs의 `Sources` dead-link conversion과 G2 archive §5 Sources conversion은
  physical deletion readiness audit에서 처리 기준을 확정해야 한다.

## 2026-06-20 · B4 Surface 1 verification — architecture history refs cleared

Claude가 `docs/architecture/local-agent-runtime.md` 본문 편집을 마친 뒤 Codex가 검증을
이어받았다. 이번 블록은 W4 B4 안의 Surface 1, 즉 architecture current owner 본문에서
`history/` live refs를 제거/repoint하는 작업의 검증 기록이다.

**확인한 사실:**

- `docs/architecture/local-agent-runtime.md`의 `history/N`, `history/README`,
  `*.history.md` 직접 인용은 grep 기준으로 남지 않는다.
- 검증 명령:
  `rg -n "history/[0-9]+|history/README|\\.history\\.md" docs/architecture/local-agent-runtime.md`
  → 출력 없음(exit 1, no matches).
- `log check logs/2026-06-19-workspace-reset-W5-history-migration.md`는 구조 오류를
  보고하지 않았고, active Work Item은 계속 W4 B4로 남아 있다.
- 편집 범위에는 `docs/architecture/local-agent-runtime.md` 외에도 일부 decision target
  보강이 포함되어 있다. 현재 확인한 변경 파일에는
  `docs/decisions/claude-channel-plugin-default.md`,
  `docs/decisions/client-orchestrator-runtime-pivot.md`,
  `docs/decisions/codex-per-agent-app-server.md`가 포함된다.

**판단:**

- Surface 1 목표는 통과했다. Architecture 본문은 더 이상 `history/` 원문을 current
  authority나 inline provenance로 요구하지 않는다.
- `docs/decisions/*` Sources와
  `logs/2026-06-19-mvp-history-archive.md` §5 Sources에 남은 `history/` 링크는 Surface 2다.
  이는 이번 B4 Surface 1 실패가 아니라 physical deletion gate에서 평문 provenance로
  전환할 대상이다.
- 새 Work Item은 만들지 않는다. W4 B4가 Surface 1 검증을 이미 소유하고, Surface 2는 W6
  closeout에서 parent inventory와 `plans/workspace-reset/workspace-reset.md`의 물리 삭제
  gate에 명시하는 방식으로 이어간다.

**남은 일:**

- B4 안에서 Claude 편집으로 보강된 decision 문서들이 target self-sufficiency와 owner 경계를
  과도하게 넘지 않았는지 필요한 만큼 검토한다.
- 이후 B5에서 `plan/mvp-implementation-checklist.md`와 `plan/qa-tracker.md` carryover를
  owner 보존/archive/delete candidate로 reconcile한다.
- W6 closeout에서 Surface 2 dead-link conversion 기준을 parent inventory와 plan gate에
  명시한다.

## 2026-06-20 · B4 decision target self-sufficiency verification

B4 Surface 1 후 남은 decision target 검토를 Codex가 직접 수행했다. 대상은 직전
기록에 남은 `docs/decisions/claude-channel-plugin-default.md`,
`docs/decisions/client-orchestrator-runtime-pivot.md`,
`docs/decisions/codex-per-agent-app-server.md`다.

**확인한 사실:**

- `docs/decisions/claude-channel-plugin-default.md`의 strategy default, no-fallback,
  cwd-resolved `enabled` 신뢰, spawn cwd 고정 근거는 `src/cli/invocation.ts:161-163`,
  `:219`, `:239-249`, `:487-499` 및 `src/adapters/claude/preflight.ts:11-62`,
  `src/adapters/claude/plugin-cli.ts:12-17`과 일치한다.
- `docs/decisions/client-orchestrator-runtime-pivot.md`는 `history/13`만 단독 source로
  두지 않도록 보강했다. 현재 source는 `legacy/bridge-relay-v1/bridge/README.md`,
  `docs/architecture/local-agent-runtime.md`, `src/core/deliveries.ts:3-11`도 포함한다.
- `docs/decisions/codex-per-agent-app-server.md`의 stderr banner, readyz, turn/start ack,
  lifecycle, explicit resume rationale은 `docs/architecture/local-agent-runtime.md`의 current
  owner section을 outcome reference로 가리킨다. 수치 계약과 flow 상세는 decision 본문으로
  복사하지 않고 architecture owner에 남겼다.
- `rg -n "history/[0-9]+|history/README|\\.history\\.md" docs/architecture/local-agent-runtime.md`
  결과는 출력 없음(exit 1, no matches)이다. Surface 1 정리 상태는 유지된다.
- 세 decision 문서에는 `history/N` provenance가 Sources/Context에 남아 있다. 이는 본문
  self-sufficiency 실패가 아니라 Surface 2 dead-link conversion 대상이며,
  `plans/workspace-reset/workspace-reset.md`의 history/docs-aiox 물리 삭제 게이트가 처리한다.

**판단:**

- B4 decision target은 history 원문 없이도 현재 필요한 WHY를 복원할 수 있다.
- 세 decision 문서는 decision owner 경계 안에 있다. 현재 구현 flow와 수치 계약은
  architecture/code references로 남겼고, decision 본문이 architecture/spec 권위를 대체하지 않는다.
- W4 B4는 완료로 전환한다. 다음 active item은 W5 B5 carryover + legacy/prd cleanup
  handoff다.

**다음:**

- B5에서 `plan/mvp-implementation-checklist.md`의 W7 Current/load-bearing 판정과 W5 archive
  후보를 reconcile한다.
- `plan/qa-tracker.md` archive 여부와 G4 delete-only 7개(15·16·19·30·32·43·44)의 legacy
  `plan/`·`prd/` inbound cleanup을 함께 점검한다.

## 2026-06-20 · B5 carryover reconcile 완료 — B6 closeout으로 진행

B5는 `plan/mvp-implementation-checklist.md`와 `plan/qa-tracker.md`를 즉시 물리 이동/삭제하지
않고, archive digest와 live inbound repoint를 먼저 완료하는 방식으로 처리했다.

**확인한 사실:**

- `plan/mvp-implementation-checklist.md`는 W7에서 Current/as-built migration evidence로
  사용됐지만, 파일 자체는 실행 checklist이며 현재 decision/spec/architecture owner가 아니다.
  W7 표현대로 "absorbed/repointed until" 조건부 load-bearing이었다.
- `plan/qa-tracker.md`는 W7에서 Stale/Archive로 분류됐고, QA-003/R4 decision 내용은
  `docs/decisions/runtime-profile-namespace-isolation.md`에 이미 owner 흡수돼 있다.
- read-only subagent 2개와 main Codex의 `rg` 재확인 결과, current owner 범위
  (`src`, `README.md`, `docs/architecture`, `docs/specs`, `docs/product`, `docs/decisions`,
  `plans`)에는 G4 delete-only 7개(`history/15·16·19·30·32·43·44`) 직접 참조가 남지
  않는다.
- 남은 `plan/mvp-implementation-checklist.md` 직접 참조는 W5 제외 대상인 `docs/aiox/`
  learning records뿐이다. 남은 G4 history 직접 참조도 legacy `plan/` 원본, legacy/stale
  `prd/` 원본 또는 W5 제외 `docs/aiox/` dependency다.

**수행한 작업:**

- `logs/2026-06-20-mvp-plan-carryover-archive.md`를 생성해 legacy checklist와 QA tracker의
  self-contained digest를 보존했다. 이 archive는 checklist의 current/as-built evidence,
  Step 10/13/14/15 provenance, QA-001~QA-003, R1~R4 outcome을 원본 없이 복원할 수 있게
  요약한다.
- `docs/architecture/local-agent-runtime.md`의 legacy checklist authority link를 새 archive로
  repoint했다.
- `docs/decisions/runtime-profile-namespace-isolation.md`의 `plan/qa-tracker.md` source를 새
  archive로 repoint했다.
- `plans/post-mvp/envelope-metadata.plan.md`와 `plans/release-plan.md`의 legacy `plan/`
  inbound를 새 archive 또는 `docs/decisions/claude-channel-plugin-default.md`로 repoint했다.

**판정:**

- `plan/mvp-implementation-checklist.md`: current owner 아님. W7 load-bearing 조건은
  archive digest + live owner repoint로 해소됐다. 남은 `docs/aiox` dependency가 전체
  흡수/삭제 게이트에서 처리되면 delete candidate.
- `plan/qa-tracker.md`: archive digest로 대체됨. live owner/plans inbound는 repoint 완료.
  남은 자기참조와 legacy history 관계는 물리 삭제 게이트에서 처리할 delete candidate.
- G4 delete-only 7개: current-authority blocker 없음. `history/15`의 legacy `prd/` inbound와
  `history/16·30·32`의 `docs/aiox` inbound는 W5 범위 밖 dependency로 기록하고, 별도
  docs/aiox 흡수/삭제 및 통합 물리 삭제 게이트에서 처리한다.

**검증:**

- `rg -n "plan/(mvp-implementation-checklist|qa-tracker)|mvp-implementation-checklist\\.md|qa-tracker\\.md" docs plans README.md AGENTS.md src tests package.json`
  결과, W5 범위의 live owner/plans 참조는 제거됐고 `docs/aiox/` 참조만 남았다.
- `rg -n "history/(15|16|19|30|32|43|44)([^0-9]|$)|history/(15-mvp-design-decisions|16-step-2-sqlite-repository-cleanup|19-step-5-route-fanout-tests|30-step-10-per-agent-proxy-runtime|32-step-10-per-agent-app-server-resume-spike|43-qa-round-1|44-qa-round-2)" docs plans prd plan`
  결과, 남은 직접 참조는 legacy `plan/`, legacy/stale `prd/`, W5 제외 `docs/aiox/`로 분류된다.

**다음:**

- Active item은 W6 B6 Closeout이다. B6에서 parent inventory 반영, W5 source/index closeout,
  Surface 2(history Sources 평문화)와 물리 삭제 게이트 소유권을 확인하고, W5 package를 닫을지
  판단한다.

## 2026-06-20 · B6 closeout — parent W5로 복귀

W5 history migration package를 닫는다. B6 직전 read-only 검증에서 live refs 잔여가 발견되어
closeout 전에 추가 cleanup을 수행했다.

**추가 확인/수정:**

- read-only subagent 검증 결과, B5 이후에도 `README.md`, `src/`, post-MVP execution plan에
  `history/50`~`57` 및 `history/45`~`47` live refs가 남아 있었다. 이는 decision/archive
  Sources가 아니라 code/comment/plan 본문 참조였으므로 W5 cleanup 범위로 처리했다.
- `README.md`, `src/config/paths.ts`, `src/daemon/socket-transport.ts`의 runtime profile /
  Windows transport deferral 참조를 `docs/decisions/runtime-profile-namespace-isolation.md`로
  repoint했다.
- Claude plugin/preflight/setup/launcher 관련 code comment의 `history/49`~`56` live refs를
  제거하거나 `docs/decisions/claude-channel-plugin-default.md`로 repoint했다.
- `plans/post-mvp/adapter-dispatch-registry.plan.md`,
  `plans/post-mvp/channel-boot-surface.plan.md`, `plans/post-mvp.plan.md`의 Step 15/R4 live refs를
  `docs/decisions/pair-slot-generalization.md` 또는
  `docs/decisions/runtime-profile-namespace-isolation.md`로 repoint했다.

**검증:**

- `rg -n "plan/(mvp-implementation-checklist|qa-tracker)|mvp-implementation-checklist\\.md|qa-tracker\\.md" README.md src plans docs/architecture docs/specs docs/product docs/decisions`
  → no matches. Current owner/code/plan 범위에는 legacy `plan/` carryover 직접 참조가 남지 않는다.
- `rg -n "history/(15|16|19|30|32|43|44|45|46|47|50|51|52|53|54|55|56|57)([^0-9]|$)" README.md src plans docs/architecture docs/specs docs/product docs/decisions`
  → matches only in `docs/decisions/*` Sources/body provenance. Code, README, architecture/spec/product,
  and executable/deferred plans에는 해당 live refs가 남지 않는다.
- 넓은 `rg -n "history/[0-9]+|history/[0-9][0-9]-|history/[0-9][0-9]\\b" README.md src plans docs/architecture docs/specs docs/product docs/decisions`
  결과에서 남은 non-decision refs는 `history/58` 관련 post-MVP plan refs와
  `plans/workspace-reset/workspace-reset.md`의 history/58·59 보존 설명뿐이다. 이는 W8/W10
  소비 전 확인 문서로 의도된 잔여다.

**Physical deletion gate handoff:**

- Decision docs와 archive logs의 `Sources`에 남은 `history/` 링크는 본문 self-sufficiency와
  별개로 `plans/workspace-reset/workspace-reset.md`의 통합 물리 삭제 게이트에서 평문
  provenance로 전환한다.
- `history/58`은 W8(A2A spec) 작업 시 확인할 문서, `history/59`는 W10(split readiness)
  작업 시 확인할 문서로 남는다.
- `docs/aiox/` 내부의 legacy checklist/QA refs 및 G4 history refs는 W5 B5/B6 범위에서
  수정하지 않는다. `docs/aiox` 필요분을 owner 문서로 흡수한 뒤 전체 삭제하거나, 보존하기로
  바뀌는 파일은 그 게이트에서 archive/decision target으로 repoint한다.
- Legacy `plan/mvp-implementation-checklist.md`, `plan/qa-tracker.md`, stale `prd/` inbound는
  current owner가 아니며, 통합 물리 삭제 게이트의 delete-candidate batch에서 처리한다.

**Closeout:**

- W1~W6 package Work Items는 모두 완료됐다.
- Parent inventory `logs/2026-06-16-workspace-reset-폴더별-inventory.md` W5-5가 이 결과를
  소비해야 한다.
- 이 child package는 더 이상 open 작업을 소유하지 않으므로 `decided`로 전환한다.

## 2026-06-21 · post-W8 sync — history/58 downstream state update

이 블록은 W5 closeout 당시의 handoff를 W8 완료 이후 상태와 정합화하기 위한 사후 sync다.
W5 history migration의 과거 판정표를 삭제하거나 재작성하지 않고, 현재 삭제 게이트가 소비해야 할
최신 상태를 덧붙인다.

**확인한 사실:**

- W5 B6 closeout 당시 `history/58`은 "W8(A2A spec) 작업 시 확인할 문서"로 보존됐고,
  `history/59`는 "W10(split readiness) 작업 시 확인할 문서"로 보존됐다.
- 이후 W8 package closeout에서 `history/58-post-mvp-a2a-architecture-decisions.history.md`의
  §4 lifecycle WHY(`history/58:61-100`)가
  `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`로 승격됐다.
- W8 closeout은 `history/58`의 남은 compose/capability/federation/product/architecture
  rationale과 live inbound refs를 W10 확인 대상으로 넘겼다.
- W8 closeout은 `history/58` row가 여전히 W5 history migration owner라고 명시했고,
  source map에 duplicate row를 만들지 않는다고 기록했다.
- `history/59`는 W8에서 소비되지 않았고, W10 split readiness input으로 남았다.
- `docs/aiox/*`는 W5 history migration scope가 아니라
  `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` source map과 W10/physical delete
  gate가 추적한다.

**현재 판정:**

- `history/58`: 더 이상 단순한 "W8 확인 문서"가 아니다. W8에서 §4 lifecycle WHY는 일부 소비·승격
  완료. 남은 rationale/live refs는 W10 확인 대상이며, 최종 삭제 여부는 W5 history owner와
  `plans/workspace-reset/workspace-reset.md`의 통합 물리 삭제 게이트가 successor self-sufficiency,
  inbound repoint, 사용자 확인 후 결정한다.
- `history/59`: 기존 판정 유지. W10 split readiness/atlas 관련 확인 문서이며, W10 final
  owner/disposition 확인 전 삭제 후보로 확정하지 않는다.
- `docs/aiox/*`: W5에서 delete candidate로 확정하지 않는다. 필요분 owner 흡수 후
  legacy-source-absorption source map과 통합 물리 삭제 게이트에서 처리한다.

**삭제 게이트 handoff 갱신:**

- Physical deletion gate는 `history/58`을 "W8 일부 소비 완료 + W10 잔여 확인 필요"로 읽어야 한다.
- `history/58` 삭제 전에는 신규 decision
  `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`의 self-sufficiency,
  W10 잔여 rationale 처리, inbound repoint, decision/archive Sources 평문화가 모두 필요하다.
- `history/59` 삭제 전에는 W10 closeout이 successor owner 또는 archive/delete-only 판단을 남겨야 한다.

## 2026-06-24 · stage 6 물리 삭제 반영 (최종 outcome, 이 B4 map 소비 완료)

이 로그는 `decided`다. 본 기록은 재결정이 아니라, 위 "삭제 게이트 handoff 갱신"이 명시한
삭제 전제조건이 stage 6 물리 삭제 게이트에서 모두 충족·실행됐음을 남기는 최종 outcome
ledger다. inbound `file://`/markdown 링크는 W5 결정대로 "삭제 시점 스냅샷"인 historical
record라 평문화·수정하지 않는다(stage6 로그 `:559-562`).

**물리 삭제 완료 (stage 6, `logs/2026-06-23-workspace-reset-stage6-physical-deletion-gate.md`):**

- `history/1`~`history/57` (57) + `history/README.md` (1) — 2026-06-24 W3에서 물리 삭제.
- `history/58-post-mvp-a2a-architecture-decisions.history.md` — 2026-06-24 W3에서 물리 삭제.
  전제조건 충족 확인: §4 lifecycle WHY가 `docs/decisions/a2a-message-lifecycle-envelope-and-
  correlation.md` + spec §4로 승격(self-suff PASS), 보존 `plans/post-mvp*`의 direct `history/58`
  refs repoint 완료, decision/archive Sources 평문화·줄삭제 완료(stage6 로그 W2/W5).
- `history/59-local-obsidian-vault-atlas-discussion.history.md` — 2026-06-24 W4에서 물리 삭제.
  W10 split 입력 역할은 종료. successor 판단 = Atlas 논의 내용을 stage6 로그 "history/59 Atlas
  digest" 섹션(`:426-455`)에 digest로 승계하고, plan stage 7(Atlas)이 그 digest를 required-read로
  가리키도록 repoint(`plans/workspace-reset/workspace-reset.md` stage 7). 삭제는 repoint wire
  직후 실행(유실 0창).

**검증:** 삭제 후 owner 범위(`docs/decisions`·`architecture`·`specs`·`product`) + 보존
`plans/post-mvp*`·`spikes`·`tests/unit`에 삭제된 `history/*` 파일 dead-ref 0(stage6 로그 W3·W4).
`history/` 디렉터리 빈 상태 확인.
