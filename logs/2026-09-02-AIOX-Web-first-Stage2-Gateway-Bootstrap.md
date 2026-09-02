---
topic: AIOX Web-first Stage2 Gateway Bootstrap
description: Web-first rewrite Stage 2에서 protocol Local Server React shell과 start open status stop vertical slice를 구현한다
status: open
---

## Work Items
- [>] W1 Gateway request response event error snapshot schema와 protocol client를 구현한다
- [ ] W2 loopback Local Server Control WebSocket HTTP static serving과 endpoint discovery를 구현한다
- [ ] W3 authenticated subscribe snapshot sequenced event reconnect protocol을 구현한다
- [ ] W4 aiox start open status stop force와 Local Server readiness 범위의 doctor Gateway client 및 shutdown barrier를 구현한다
- [ ] W5 React shell GatewayStore snapshot event projection과 reconnect UI를 구현한다
- [ ] W6 Local Server CLI React bootstrap vertical slice를 통합 검증한다

## Required Context

### Return Target

- None: independent package log.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.
- Project integration: `AGENTS.md, plans/AGENTS.md, logs/AGENTS.md, docs/documentation-system.md`.
- Accepted target artifact: `logs/artifacts/aiox-web-first-accepted-target-baseline.md`를 전체 읽고 current fact, accepted target과 open decision을 구분한다.
- Stage 0 contract: `logs/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts.md`가 `decided`일 때 accepted lifecycle·authority 결과와 owner handoff를 읽는다.
- Immediate predecessor: `logs/2026-09-02-AIOX-Web-first-Stage1-Monorepo-Foundation.md`가 `decided`이고 plan에서 Stage 2이 활성화된 뒤에만 이 package를 활성화한다.
- Current implementation claim은 code와 tests에서 직접 재확인하고 predecessor candidate 변경을 accepted evidence처럼 사용하지 않는다.

## Package Scope

- Revision: 1; History pointer: `2026-09-02 · Stage 2 package bootstrap`.
- Primary boundary: Gateway protocol and Local Server application bootstrap
- Related artifacts in allowed write-set:
  - `logs/artifacts/aiox-web-first-accepted-target-baseline.md`
  - `logs/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts.md`
  - `logs/2026-09-02-AIOX-Web-first-Stage1-Monorepo-Foundation.md`
- Excluded:
  - Terminal Stream WebSocket와 PTY.
  - Agent Host Network production operation.
  - REST 또는 UDS domain API와 dual transport.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution default: inline. 각 executable W는 Compact task record를 사용하고 accepted 결과 승격 전 controlling result review를 거친다.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - Public protocol, process lifecycle, security, persistence 또는 release claim은 result promotion 전에 independent review 필요성을 재판정한다.
  - Activate when: large claim, public contract/security/data/release, irreversible external effect, multi-owner conflict, large blast radius, or low discovery confidence is present.

## Task Index

- Stable package key: 2026-09-02-AIOX-Web-first-Stage2-Gateway-Bootstrap

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W6 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage2-Gateway-Bootstrap/tasks/W6.md` |
| W5 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage2-Gateway-Bootstrap/tasks/W5.md` |
| W4 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage2-Gateway-Bootstrap/tasks/W4.md` |
| W3 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage2-Gateway-Bootstrap/tasks/W3.md` |
| W2 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage2-Gateway-Bootstrap/tasks/W2.md` |
| W1 | Compact | inline | `logs/packages/2026-09-02-AIOX-Web-first-Stage2-Gateway-Bootstrap/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - Accepted target와 open-decision boundary는 `logs/artifacts/aiox-web-first-accepted-target-baseline.md`가 제공한다.
  - Stage 0 accepted lifecycle·authority 계약과 predecessor의 decided result만 실행 baseline으로 사용한다.
- Evidence gaps:
  - exact HTTP WebSocket library와 protocol version implementation.
  - credential file and browser handoff의 Stage 0 authority 결과 적용.

## Cross-Artifact Effects

- 이 Stage의 primary 구현은 protocol architecture spec tests와 다음 Stage consumer를 함께 변경하거나 재검증한다.
- allowed write-set 밖의 effect는 조용히 적용하지 않고 새 Work Item 또는 후속 Stage handoff로 기록한다.

## Decision Candidates

- N/A.
- Reason: no decision candidate recorded yet.
- Activate when: decision-worthy rationale or competing options appear.

## Verification Contract

- Revision: 2; History pointer: `2026-09-02 13:42 · Doctor responsibility boundary revision`.
- Required:
  - protocol schema runtime validation과 request response correlation contract test.
  - authenticated snapshot plus sequenced event reconnect and gap recovery integration test.
  - start open status stop normal force와 endpoint/session credential, Gateway connect, React static serving readiness만 진단하는 doctor CLI vertical-slice test.
  - React GatewayStore가 server events만 authoritative lifecycle로 반영하는 browser test.
  - git diff --check와 package registry integrity.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 2; History pointer: `2026-09-02 13:42 · Doctor responsibility boundary revision`.
- Criteria:
  - CLI와 React가 동일 protocol client와 Control WebSocket을 사용한다.
  - Local Server readiness endpoint discovery authentication snapshot event shutdown barrier가 통합 검증된다.
  - normal stop guard와 force guard bypass가 Stage 0 shutdown contract와 일치한다.
  - Stage 2 doctor는 Local Server discovery/readiness만 소유하고 Adapter, Agent Runtime, Host, Network, Terminal, SQLite 진단은 Stage 8 provider 확장으로 남긴다.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-09-02 · Stage 2 package bootstrap

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.
- Activation guard: Stage 0와 immediate predecessor가 `decided`이고 plan에서 Stage 2이 `[>]`가 되기 전에는 모든 Work Item을 `[ ]`로 유지한다.
- Task contract: Work Item별 Compact task record를 생성했으며 plan은 이 package의 task·검증·closeout 내용을 소유하지 않는다.

### 2026-09-02 13:42 · Doctor responsibility boundary revision

- 리뷰 결과를 수용해 W4와 Verification/Closeout Contract를 revision 2로 갱신했다.
- Stage 2의 `doctor`는 새 명령 표면이 아니라 기존 root operation의 bootstrap 구현이며 Local Server discovery/readiness, endpoint/session credential, Gateway 연결과 React static serving까지만 진단한다.
- Adapter, Agent Runtime, Host, Network, Terminal과 SQLite 진단은 Stage 8 W4가 동일 operation에 diagnostic provider를 추가하는 방식으로 소유한다.

## 2026-09-02 · Stage 1 predecessor 수용과 Stage 2 활성화

- Activation evidence: `logs/2026-09-02-AIOX-Web-first-Stage1-Monorepo-Foundation.md`가 W1-W5, Registry Integrity, Result Consumption, isolated frozen install과 owner handoff를 완료하고 `decided`다.
- Plan state: `plans/aiox-web-first-rewrite.md`에서 Stage 1은 `[x]`, Stage 2는 유일한 `[>]`다.
- Current next: W1 Gateway request/response/event/error/snapshot schema와 protocol client. Stage 1의 empty protocol boundary와 Stage 0 accepted lifecycle/authority를 producer baseline으로 다시 확인한 뒤 contract review를 시작한다.
