---
topic: AIOX Web-first Stage0 Runtime Contracts
description: Web-first rewrite Stage 0에서 AgentRuntime, HostRuntime, TerminalSession, Local Server shutdown lifecycle과 client authority/capability contract를 확정한다
status: decided
---

# AIOX Web-first Stage 0 Lifecycle Contracts

## Work Items

- [x] W1 AgentRuntime lifecycle, control, observation transition table과 invalid state 조합을 확정한다
- [x] W2 HostRuntime lifecycle와 health transition table, partial startup compensation과 degraded semantics를 확정한다
- [x] W3 TerminalSession lifecycle, browser detach/reconnect와 writer lease transition table을 확정한다
- [x] W4 Local Server normal/force shutdown barrier와 active execution dependency transition table을 확정한다
- [x] W5 CLI, React operator와 runtime-scoped MCP bridge의 authority/capability matrix를 확정한다

## Required Context

### Return Target

- None: independent package log.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.
- Project integration: `AGENTS.md, plans/AGENTS.md, logs/AGENTS.md, docs/documentation-system.md`.
- Accepted target artifact: `logs/artifacts/aiox-web-first-accepted-target-baseline.md`를 전체 읽고 current fact, accepted target과 미결정 사항을 구분한다. 논의 provenance가 필요할 때만 `logs/2026-09-01-AIOX-Web-first-Local-Gateway-설계.md`의 consolidated baseline과 Codex Goal 위임 block을 추적한다.
- Current implementation evidence는 code와 tests에서 직접 확인하고 target decision과 분리한다. 기존 G2 plan/log는 lineage evidence로만 읽으며 이 Stage 0 package에서 수정·취소·supersede하지 않는다.
- Controllers decide lifecycle transitions and policy; Adapters perform vendor-specific operations; PTY Manager owns AIOX-managed PTY resources; Local Server owns authoritative materialized runtime state; Networks own connectivity invariants.
- Standalone Persistent Network membership와 explicit route endpoint는 active AgentRuntime ID이며 in-memory다. Network name/default/metadata만 durable하고 Host-managed routes는 Manifest Agent Definition을 매 실행의 Runtime ID로 materialize한다.
- Web-first React/Vite, one Gateway Control WS, separate Terminal Stream WS, server-owned Runtime/TerminalSession, UDS cutover 삭제, no pair/connect/compose, no compatibility layer는 새 evidence 없이 다시 열지 않는다.
- pre-v1에서는 auto restart, server restart 후 PTY recovery와 disconnected TUI 화면 완전 복원을 보장하지 않는다. Browser detach/refresh는 Runtime 또는 TerminalSession stop trigger가 아니다.
- 각 transition 표는 trigger, precondition, current/next state, transition owner, Adapter/PTY/Network side effect, Gateway event, failure/compensation과 invalid transition을 포함한다. exact enum과 impossible 조합은 이 package 결과로 근거를 갖고 확정한다.

## Package Scope

- Revision: 2; History pointer: `2026-09-02 · W1 AgentRuntime contract`.
- Primary boundary: AIOX Web-first Stage 0 lifecycle transition contracts and authority/capability matrix
- Related artifacts in allowed write-set:
  - `docs/architecture/web-first-runtime-lifecycle.md`: lifecycle responsibility, internal state-flow, side-effect와 compensation owner.
  - `docs/specs/aiox-runtime-control.md`: externally observable lifecycle, Gateway authority와 operation contract owner.
  - `docs/architecture/local-agent-runtime.md`: current as-built index의 target-successor navigation link만 갱신한다.
  - `logs/2026-09-01-AIOX-Web-first-Local-Gateway-설계.md` source W1 transfer lineage.
  - `plans/aiox-web-first-rewrite.md` Stage 0 state와 pointer.
- Excluded:
  - TypeScript production code, DB schema와 monorepo skeleton 구현.
  - 기존 G2 plan, controlling log, task record와 현재 dirty worktree의 G2 code/test 변경.
  - Stage 1 이후의 library, field spelling과 compatibility implementation 결정.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution default: inline. 다른 Codex thread가 이 package를 재개해도 accepted state는 이 controlling log가 소유하며, 별도 위임이나 independent review가 필요하면 먼저 executable W/task record로 Reconcile한다.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - Lifecycle/public Gateway contract와 architecture/spec 다중 owner 정합은 큰 claim이다. Execution 결과를 accepted state로 승격하기 전 independent reviewer 실체화 필요성을 contract review에서 재판정하고, 실체화하면 별도 W/task record를 만든다.
  - Escalate only when owner discovery 또는 reviewer conflict가 closeout을 막고 source evidence로 해소되지 않는다.

## Task Index

- Stable package key: 2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W5 | Compact | inline | `logs/packages/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts/tasks/W5.md` |
| W4 | Compact | inline | `logs/packages/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts/tasks/W4.md` |
| W3 | Compact | inline | `logs/packages/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts/tasks/W3.md` |
| W2 | Compact | inline | `logs/packages/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts/tasks/W2.md` |
| W1 | Compact | inline | `logs/packages/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - Target baseline과 open-decision 경계: `logs/2026-09-01-AIOX-Web-first-Local-Gateway-설계.md`의 `2026-09-01 · Web-first 전면 개편 consolidated accepted baseline과 다음 세션 handoff`.
  - Goal/session 위임 경계: 같은 source log의 `2026-09-01 · Codex Goal 기반 위임 운용 결정`.
  - Stage 순서 owner: `plans/aiox-web-first-rewrite.md`; Stage 0 완료 전 Stage 1 production rewrite를 시작하지 않는다.
  - W1 current-code evidence: `src/daemon/state.ts:248-251,1692-1733`, `src/adapters/codex/runtime.ts:34-69,166-193`, `tests/unit/daemon/codex-runtime-failure-production-wiring.test.ts:48-105`.
  - W1 accepted target owners: `docs/architecture/web-first-runtime-lifecycle.md`와 `docs/specs/aiox-runtime-control.md`.
  - W2 current drift evidence: `src/host/host-controller.ts:249-267,370-383`, `tests/unit/host/host-controller-integration.test.ts:85-151`.
  - W2 accepted user decision: normal Host stop cleanup timeout/rejection은 implicit terminate/kill로 승격하지 않고 `running/degraded`로 복귀한다.
  - W3 current implementation boundary: `src/adapters/claude/launcher.ts:110-122`와 `src/adapters/codex/launcher.ts:99-106`은 inherited stdio를 사용하며 current source/dependency에는 TerminalSession/PTy web terminal implementation이 없다.
  - W3 accepted target owners: `docs/architecture/web-first-runtime-lifecycle.md`와 `docs/specs/aiox-runtime-control.md`.
  - W4 current implementation boundary: `src/daemon/state.ts:1692-1733`에는 admission barrier/dependency guard가 없고, `src/daemon/run.ts:72-101`은 socket/state/DB cleanup을 수행하며, `src/daemon/server.ts:63-78`은 stop promise를 idempotently 재사용한다.
  - W4 accepted target owners: `docs/architecture/web-first-runtime-lifecycle.md`와 `docs/specs/aiox-runtime-control.md`.
  - W5 current MCP evidence: `src/adapters/codex/mcp-server.ts:450-521`, `src/adapters/claude/channel-server.ts:341-410`, `tests/unit/adapters/mcp-tool-contract-parity.test.ts:87-104`는 두 bridge의 current common tools를 확인한다.
  - W5 accepted target owners: `docs/architecture/web-first-runtime-lifecycle.md`와 `docs/specs/aiox-runtime-control.md`.
- Evidence gaps:
  - Stage 0 closeout을 막는 evidence gap은 없다. Production model, wire/schema,
    library와 cross-platform behavior evidence는 해당 후속 Stage가 직접 확인한다.

## Cross-Artifact Effects

- Architecture state ownership과 spec의 externally observable state/operation은 같은 transition 결과를 서로 다른 책임으로 소비한다. 한쪽 변경은 다른 쪽의 이름·event·invalid transition과 plan Stage 0 closeout을 재검증한다.
- `docs/product/product.md`의 native terminal 유지 및 `docs/product/roadmap.md`의 기존 pair/compose release path는 accepted Web-first target과 충돌한다. Stage 0 architecture/spec state 의미의 근거로 사용하지 않는다. 이 기존 current-owner 교체는 production cutover와 함께 `logs/2026-09-02-AIOX-Web-first-Stage9-Canonical-Cutover.md` W4가 수행·검증하며, Stage 0 계약을 이전 방향으로 되돌리는 근거가 아니다.
- `docs/specs/aiox-capability-policy.md`의 compose/daemon precedence, 기존 `aiox claude setup`과 daemon-token 표현은 legacy target lineage다. Web-first Runtime/Gateway authority로 사용하지 않으며 Stage 9 W4가 해당 clause의 retain/rewrite/remove disposition과 inbound link를 닫는다.
- Stage 0 결과가 구현 field/library/DB schema를 직접 확정하지 않으며, Stage 1 이후 package가 이 contract를 consumer로 사용한다.
- 기존 G2 owner artifacts와 code/tests에서 재사용 가능한 evidence가 발견돼도 이 package는 그것을 수정하지 않고 lineage/evidence로만 기록한다.

## Decision Candidates

- Resolved in W1–W5: Agent/Host/Terminal/Server state, Host normal-stop failure,
  Terminal writer/reconnect, shutdown blocker normalization과 client authority.
- Deferred implementation choices are listed by the architecture/spec owners and do not
  change the accepted Stage 0 behavior.

## Verification Contract

- Revision: 1; History pointer: `2026-09-01 · Stage 0 package bootstrap`.
- Required:
  - 각 current-state claim을 code/test source에서 직접 확인하고 target decision과 분리한다.
  - 네 transition table의 row completeness, invalid transition, cross-table state 조합과 Gateway event 대응을 대조한다.
  - Authority/capability matrix와 transition owner가 모순되지 않는지 검사한다.
  - 관련 owner 문서의 inbound/outbound link와 architecture/spec 책임 분리를 직접 검토한다.
  - `.agents/skills/log/scripts/log check logs/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts.md`.
  - `.agents/skills/log/scripts/package-log check logs/2026-09-01-AIOX-Web-first-Stage0-Runtime-Contracts.md`와 `logs/AGENTS.md` Manual Registry Integrity.
  - `git diff --check`와 실제 diff review.
- Recommended:
  - 기존 lifecycle/error tests 중 표의 current evidence에 사용한 범위만 targeted 실행한다. 문서 target만 다루고 실행 가능한 관련 test가 없으면 이유를 Result에 기록한다.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 1; History pointer: `2026-09-01 · Stage 0 package bootstrap`.
- Criteria:
  - AgentRuntime, HostRuntime lifecycle+health, TerminalSession과 Local Server shutdown barrier 네 표가 durable owner 문서에 존재한다.
  - CLI, React operator와 runtime-scoped MCP bridge authority/capability matrix가 durable owner 문서에 존재한다.
  - 각 표는 trigger, precondition, current/next state, transition owner, Adapter/PTY/Network side effect, Gateway event, failure/compensation과 invalid transition을 포함한다.
  - Accepted baseline과 current code fact, target contract, remaining open decision이 구분되고 owner 간 모순이 없다.
  - 미결정 implementation detail을 임의로 확정하지 않았고 residual/open question은 다음 Stage consumer가 찾을 수 있다.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-09-01 · Stage 0 package bootstrap

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.
- Package activation 판단: Stage 0은 architecture/spec의 여러 owner artifact가 네 transition 표와 하나의 authority matrix를 공통 evidence·verification·closeout gate로 함께 닫아야 하고, 다른 Codex thread에서도 재개될 큰 claim이므로 Base log가 아니라 controlling package log로 시작했다.
- Source 관계 판단: 기존 Web-first 설계 로그 W1은 Stage 0 실행 결과를 다시 소비해 자기 작업을 완료할 owner가 아니라 새 rewrite plan/Stage 0 package에 실행 소유권을 넘긴다. 따라서 detach/Return Target이 아니라 transfer + independent package log를 사용한다.
- Contract review 전제: W1에서 current code/tests와 architecture/spec inbound/outbound owner discovery를 먼저 수행하고 exact artifact write-set을 좁힌다. 위 다섯 executable W의 결과가 accepted state로 승격되기 전 result review를 수행한다.

## 2026-09-02 · 2026-09-02 · accepted baseline artifact와 Stage 1-9 task owner 이관

- @user 지시: accepted Web-first baseline을 artifact로 고정하고 Stage 0-9별 task owner를 생성하며 기존 terminal font/size 질의응답을 새 의견 없이 보존한다.
- Primary baseline: logs/artifacts/aiox-web-first-accepted-target-baseline.md. 21개 target section과 Historical Q&A 13개를 보존한다.
- Stage structure: Stage 1-9 controlling package log와 Compact task record 49개를 생성했다. 미래 Stage는 predecessor decided와 plan activation 전까지 모두 open/inactive다.
- Plan boundary: plans/aiox-web-first-rewrite.md에는 Stage 순서, 상태와 Stage log pointer만 남겼다.
- Authority closeout: source design log는 artifact와 Stage package로 이관 후 decided; G2는 W6-W9 cancellation과 함께 superseded다.
- Current next remains W1 AgentRuntime lifecycle/control/observation transition contract.

## 2026-09-02 · W1 AgentRuntime contract

- Discovery: current Codex runtime은 `starting|ready|failed|disposed` 단일 축이며 failure callback은 live agent row를 제거한다. current global stop에는 admission barrier와 active-execution guard가 없다. 이 fact를 target decision과 분리했다.
- Owner 판정: 내부 transition owner, side-effect와 compensation은 `docs/architecture/web-first-runtime-lifecycle.md`; 외부 state와 operation invariant는 `docs/specs/aiox-runtime-control.md`가 소유한다. 기존 `local-agent-runtime.md`는 as-built index로 유지하고 target-successor link만 추가했다.
- Accepted W1 contract: lifecycle=`starting|running|stopping|stopped|failed`, control=`owned|lost|released`, execution observation=`unobserved|alive|exited|unknown`. `running`은 `owned/alive`만 허용하고 terminal lifecycle에서 `owned`를 금지한다. Controller만 lifecycle을 전이하며 failure/departure 시 Runtime-ID Network membership/edge를 제거하고 auto-restart하지 않는다.
- Result review: W1 revision 1 Attempt 1의 source, owner 문서, required transition columns, invalid tuple, Markdown check와 `git diff --check`를 재검토해 전체 수용했다. Registry Integrity와 Result Consumption Gate가 통과해 W1을 완료하고 W2를 활성화했다.
- Cross-owner effect: current product/roadmap의 terminal·pair/compose 방향은 accepted rewrite와 충돌한다. W1 state contract에는 섞지 않았고 Stage 0 closeout 전에 disposition한다.

## 2026-09-02 · W2 HostRuntime contract

- Current fact: 기존 HostController는 일부 agent launch가 실패해도 성공한 sibling을 유지하고 host start를 성공 처리한다. 이는 target의 `all-running or compensating cleanup`과 다르므로 target 근거로 채택하지 않는다.
- Restored target: lifecycle과 health를 분리하고, materialization 중 하나라도 실패하면 이미 생성한 AgentRuntime/Network를 보상 정리한 뒤 Host `failed`; running 이후 child 장애는 Host `running/degraded`, sibling 유지, auto-restart 없음으로 확정할 수 있다.
- Open product decision: normal `host.stop`에서 child cleanup timeout/거부가 발생할 때 자동 terminate/kill로 승격할지는 baseline이 미결정으로 남겼다. 권고안은 묵시적 kill 없이 `running/degraded`로 복귀하고 명시적 stop 재시도를 허용하는 것이다. 사용자 결정 전 W2 contract review와 Result 승격을 보류한다.

### 2026-09-02 13:54 · stop cleanup failure 결정과 W2 result 수용

- @user 결정: 제안 2를 채택했다. Normal `host.stop` cleanup timeout/거부는 자동 terminate/kill로 승격하지 않는다.
- Accepted behavior: Host는 `running/degraded`로 복귀하고 residual child의 control/observation을 보존한다. 이미 stopped인 sibling은 재시작하지 않고 stale Network route를 복구하지 않으며, 이후 명시적 `host.stop`은 residual controlled child만 재시도한다. Exact timeout duration과 별도 Host force-stop surface는 Stage 0 밖이다.
- Result review: W2 revision 1 Attempt 1의 current-code drift, W1 tuple dependency, 두 owner 문서, 11개 required column, provisional wording 제거와 Markdown/diff 검증을 재확인해 전체 수용했다. Registry Integrity와 Result Consumption Gate가 통과해 W2를 완료하고 W3를 활성화했다.

## 2026-09-02 · W3 TerminalSession contract

- Current fact: Claude와 Codex launcher는 inherited stdio를 사용하고 current source와 dependency에는 server-owned TerminalSession, PTY stream 또는 web terminal 구현이 없다. 이 사실을 target contract의 구현 완료 근거로 사용하지 않았다.
- Accepted identity/state: TerminalSession은 AgentRuntime과 다른 server-owned identity다. lifecycle은 `opening|open|closing|closed|lost`, attachment는 복수 observer set, writer lease는 `unclaimed` 또는 하나의 attached authenticated client connection이다.
- Accepted transitions: Pane close, detach, browser refresh와 WebSocket disconnect는 affected attachment와 writer lease만 정리하며 session/runtime을 stop하지 않는다. Reconnect는 새 attachment와 명시적 writer claim을 요구한다. Input/resize는 현재 writer만 가능하고 takeover는 별도 권한 operation이다.
- Accepted failure boundary: confirmed PTY exit은 `closed`, handle/control loss without exit evidence는 `lost`다. Bounded raw ANSI replay는 허용하지만 full-screen TUI reconstruction과 server-restart PTY recovery는 보장하지 않는다. Runtime-bound terminal stop은 owning Controller policy를 우회하지 않는다.
- Result review: W3 revision 1 Attempt 1의 current evidence, 두 owner 문서, 11개 required column, invalid transitions와 W1 linkage를 재검토했다. Markdown inline-code, table column과 `git diff --check`가 통과해 전체 수용하고 W4를 활성화했다.

## 2026-09-02 · W4 Local Server shutdown contract

- Current fact: current daemon stop에는 atomic admission barrier와 active-execution dependency guard가 없다. State stop은 `daemonOnly` 여부에 따라 live agent/runtime 정리를 달리하고, process wrapper는 socket, state handle, DB를 정리한다. Existing idempotent stop promise만 target에 재사용 가능한 evidence다.
- Accepted lifecycle: Local Server lifecycle은 `starting|running|quiescing|stopping|stopped|failed`. `quiescing`은 mutation/registration admission을 원자적으로 닫고 pre-barrier operation을 포함한 blocker snapshot을 얻는 barrier state다.
- Accepted normal stop: blocker가 있으면 shutdown cleanup을 시작하지 않고 rejection을 authoritative하게 만든 뒤 barrier를 해제해 `running`으로 복귀한다. blocker가 없을 때만 `stopping`으로 진행한다. Persistent Network definition, attachment/lease, history와 idle client는 blocker가 아니다.
- Accepted force stop: 같은 barrier와 graceful Local Server cleanup을 사용하되 active-dependency rejection guard만 우회한다. Agent/Host stop, terminate/kill을 보내거나 residual runtime exit을 주장하지 않는다. Server-owned PTY handle release가 process에 영향을 줄 수 있어 survival도 보장하지 않고 control-lost/orphan risk로 보고한다.
- Result review: W4 revision 1 Attempt 1의 baseline, current producer/consumer, W1–W3 tuple dependency, 두 owner와 11-column table을 대조했다. Markdown inline-code, table column과 `git diff --check`가 통과해 전체 수용하고 W5를 활성화했다.

## 2026-09-02 · W5 client authority contract

- Current fact: current Codex와 Claude MCP bridge는 공통으로 `send`, `reply`, `aiox_retransmit_unconfirmed_delivery`, `agents_list`만 노출한다. 이는 target exact tool naming이 아니라 현재 capability evidence다.
- Accepted principal model: CLI protocol client와 authenticated React session은 같은 operator credential class를 사용한다. Absent Local Server의 start만 Gateway 이전 CLI bootstrap이며, client presentation이나 command 노출 여부는 security authority를 바꾸지 않는다.
- Accepted enforcement: Gateway가 credential class, Runtime scope와 target을 검사한 뒤 Local Server admission gate를 통과시키고, 그 다음 owning Controller/Network/Terminal/Approval/Messaging service가 current state를 검증하고 결정한다. Client와 Adapter는 projection을 직접 쓰지 않는다.
- Accepted MCP scope: runtime-scoped MCP는 authenticated Runtime ID에서 source를 파생하고 reachable-peer/scoped messaging만 사용할 수 있다. Lifecycle/server stop, Network mutation, approval inspect/resolve, terminal attach/writer/I/O와 source identity override는 거부한다. Delegated approval은 별도 credential class가 없으면 허용되지 않는다.
- Result review: W5 revision 1 Attempt 1의 baseline security/MCP boundary, current parity test, W1–W4 owner와 spec matrix를 대조했다. Markdown inline-code, matrix column과 `git diff --check`가 통과해 결과를 전체 수용했다.

## 2026-09-02 · Stage 0 completion audit와 owner handoff

- Requirement audit: W1 AgentRuntime, W2 HostRuntime, W3 TerminalSession, W4 Local Server와 W5 client authority의 모든 requested state/operation이 `docs/architecture/web-first-runtime-lifecycle.md`와 `docs/specs/aiox-runtime-control.md`에 승격됐다. 네 transition table은 trigger부터 invalid transition까지 요구된 11개 열을 모두 갖는다.
- Exactness corrective: TerminalSession `opening` claim의 선택적 표현을 제거했다. Lifecycle/attachment/writer lease의 exhaustive valid tuples를 추가하고 `opening`, `closing`, `closed`, `lost` writer를 금지했으며 `closed/lost` attachment 잔류도 금지했다.
- Owner/link audit: architecture는 내부 owner, 순서, side effect와 compensation을 소유하고 spec은 외부 state/operation/authority를 소유한다. 두 문서는 서로 연결되며 current as-built index `docs/architecture/local-agent-runtime.md`는 target successor를 가리킨다. 모든 edited-doc wikilink target이 존재한다.
- Current evidence verification: lifecycle/Host/daemon/MCP producer-consumer에 사용한 focused 6개 test file의 60개 test가 통과했다. 이 결과는 current fact를 뒷받침하며 아직 production rewrite가 구현됐다는 주장으로 사용하지 않는다.
- Independent-review gate: public contract/security claim을 재평가했다. 변경은 reversible documentation target이고 accepted baseline, direct source/test evidence, cross-owner self-review와 exhaustive table/matrix validation으로 닫혔다. 별도 reviewer 작업을 만들지 않았다.
- Out-of-scope owner disposition: current product/roadmap의 legacy terminal/pair/compose 문구는 Stage 9 W4의 canonical owner replacement 대상으로 이관했다. Stage 0에서는 product/release intent를 재작성하지 않았다.
- Remaining implementation choices: exact TypeScript field layout, Gateway method/event names, credential wire/storage, DB schema, Adapter/PTY/WebSocket libraries, cleanup timeout, replay storage, delegated-approval credential과 process supervisor는 후속 Stage가 이 contract를 보존하며 결정한다. Host/Agent force-stop, automatic restart, server-restart PTY recovery와 full TUI reconstruction은 pre-v1 surface가 아니다.
- Verification: Markdown inline-code check, transition/matrix column count, wikilink target check, package registry check, log check, `git diff --check`와 focused tests가 통과했다. Manual Registry actual set은 Task Index W1–W5와 일치한다.
- Closeout: W1–W5 Result Consumption Gate와 repo owner handoff가 통과해 package를 `decided`로 닫았다. `plans/aiox-web-first-rewrite.md`는 Stage 0 `[x]`, Stage 1만 `[>]`로 전환했고 Stage 1 log W1을 next pointer로 활성화했다.

## 2026-09-02 · Independent review corrective closeout

- Independent review disposition: Host stop retry, legacy capability-spec linkage, Terminal spawn-failure attachment cleanup의 세 finding을 모두 수용했다. 별도 Work Item/task record는 만들지 않고 @user 지시에 따라 closed package의 owner correction과 재검증을 이 controlling block에서 소비한다.
- Agent/Host correction: cleanup timeout/rejection 자체와 Runtime lifecycle failure를 분리했다. 동일 binding이 usable하고 current alive 증거가 있으면 stop operation은 실패하되 AgentRuntime은 running / owned / alive로 복귀하고 이후 명시적 stop만 재시도할 수 있다. control/liveness를 보존하지 못하면 failed / lost 또는 released로 끝나며 host.stop 재시도 대상이 아니다. Host는 running / degraded로 복귀하고 implicit terminate/kill과 stale connectivity 복구는 하지 않는다.
- Terminal correction: opening 중 observer가 붙은 뒤 allocation/spawn이 실패하는 경로가 current attachment set에 spawn_failed를 전달하고 attachment/writer를 원자적으로 제거한 뒤 closed / no attachments / unclaimed로 수렴하도록 transition과 외부 contract를 보강했다.
- Capability owner correction: docs/specs/aiox-runtime-control.md의 prerequisite처럼 보이던 legacy capability-policy Related link를 제거했다. docs/specs/aiox-capability-policy.md의 compose/daemon precedence, 기존 aiox claude setup, daemon-token clause는 Web-first target authority가 아닌 legacy lineage로 명시했고, Stage 9 W4가 exact retain/rewrite/remove disposition과 inbound link를 닫도록 Stage 0/Stage 9 controlling surface에 action-bind했다.
- Exact focused verification command: pnpm exec vitest run tests/unit/adapters/codex-runtime.test.ts tests/unit/daemon/codex-runtime-failure-production-wiring.test.ts tests/unit/host/host-controller-integration.test.ts tests/unit/daemon/run.test.ts tests/unit/daemon/server.test.ts tests/unit/adapters/mcp-tool-contract-parity.test.ts --reporter=dot.
- Verification result: restricted sandbox의 첫 실행은 Unix socket listen EPERM으로 58 passed / 2 failed였고 product failure로 판정하지 않았다. socket 권한이 있는 승인 환경에서 같은 command를 재실행해 Test Files 6 passed, Tests 60 passed를 확인했다. 네 transition table 11-column, authority matrix 5-column, Markdown inline-code, direct wikilink target, Stage 0/Stage 1 log 및 package registry, git diff --check와 cached diff check가 통과했다.
- Closeout: 세 finding의 owner correction과 재검증으로 Stage 0 closeout blocker가 해소됐다. W1-W5 completed, Stage 0 status decided와 plan Stage 0 [x]를 유지하며 Stage 1 W1만 다음 활성 작업이다. Exact TypeScript field, wire name, credential storage, DB schema, library, timeout과 replay mechanism은 여전히 후속 Stage의 implementation choice다.
