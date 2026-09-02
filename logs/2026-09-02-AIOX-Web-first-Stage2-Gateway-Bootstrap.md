---
topic: AIOX Web-first Stage2 Gateway Bootstrap
description: Web-first rewrite Stage 2에서 protocol Local Server React shell과 start open status stop vertical slice를 구현한다
status: decided
---

## Work Items
- [x] W1 Gateway request response event error snapshot schema와 protocol client를 구현한다
- [x] W2 loopback Local Server Control WebSocket HTTP static serving과 endpoint discovery를 구현한다
- [x] W3 authenticated subscribe snapshot sequenced event reconnect protocol을 구현한다
- [x] W4 aiox start open status stop force와 Local Server readiness 범위의 doctor Gateway client 및 shutdown barrier를 구현한다
- [x] W5 React shell GatewayStore snapshot event projection과 reconnect UI를 구현한다
- [x] W6 Local Server CLI React bootstrap vertical slice를 통합 검증한다

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

- Revision: 2; History pointer: `2026-09-02 · W1 protocol contract review`.
- Primary boundary: Gateway protocol and Local Server application bootstrap
- Related artifacts in allowed write-set:
  - `packages/protocol/**` and its workspace manifest/lockfile importer.
  - `apps/server/**`, `apps/cli/**`, and `apps/web/**` only as their owning Work Items activate.
  - Stage 2 focused contract, integration, and browser tests under `tests/**`.
  - `docs/specs/aiox-runtime-control.md`, `docs/architecture/web-first-runtime-lifecycle.md`, and `docs/architecture/web-first-workspace-boundaries.md` when accepted implementation changes their current/as-built claims or verification mapping.
  - This controlling log and its registered W1-W6 task records.
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
  - W1 accepted: `@aiox/protocol`의 strict req/res/event/error/snapshot schemas와 connected text-transport client core가 response correlation, typed failure, validated event delivery와 disposal contract를 제공하며 focused/full verification을 통과했다.
  - W2-W3 accepted: loopback static/Control bootstrap, owner-only endpoint/session publication, exact Host/supplied-Origin gate, atomic authenticated snapshot/event subscription과 mismatch resnapshot이 direct/full verification을 통과했다.
  - W4 accepted: exact root lifecycle CLI, singleton process lock/readiness, fragment handoff, four-check doctor와 normal/force shutdown barrier가 built subprocess/full verification을 통과했다.
  - W5 accepted: React/Vite shell, memory-only fragment consumer, same-origin browser transport와 authoritative GatewayStore/reconnect UI가 jsdom/bundle/full verification을 통과했다.
  - W6 accepted: actual built CLI/server/React assets와 browser-Origin authenticated subscribe, normal stop/file/PID cleanup vertical slice가 통과했고 generated output 없는 isolated copy의 offline frozen install/full check도 통과했다.
- Evidence gaps:
  - 실제 browser visual inspection은 in-app browser instance가 없어 unavailable이다. jsdom interaction, production bundle/static serving과 browser-Origin WebSocket으로 자동 검증했지만 픽셀 수준 수동 QA 증거는 없다.

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

## 2026-09-02 · W1 protocol contract review

- Discovery facts: Stage 1의 `@aiox/protocol`은 empty ESM entry이고 CLI/server/web만 public package edge로 소비한다. Root에 Zod 4.4.3과 ws 8.20.1이 설치돼 있으나 protocol package importer는 아직 비어 있다.
- Contract boundary: W1은 strict req/res/event/error/snapshot runtime schema와 connected text-transport 위 shared client core만 소유한다. WebSocket construction/listener, authentication, atomic subscribe와 reconnect/gap recovery는 W2/W3가 소유한다.
- Write-set: `packages/protocol/src/**`, `packages/protocol/package.json`, protocol lockfile importer, `tests/contract/gateway-protocol.test.ts`, 그리고 구현 결과가 실제 owner claim을 바꿀 때만 세 owner 문서를 수정한다.
- Design choice: cross-runtime core는 Node/DOM ambient type에 결합하지 않는 최소 text transport port를 사용한다. request ID generator는 caller가 제공하고, client는 response correlation, typed remote/protocol/closed error와 validated event delivery를 소유한다.
- Contract review: Scope revision 2와 W1 Brief revision 2가 executable write-set, excluded boundary, focused verification과 W2/W3 result consumer를 판정 가능하게 하므로 Attempt 1 execution에 진입한다.

### 2026-09-02 16:27 · W1 predecessor smoke contract correction

- Integration Red: `tests/workspace/package-entry-boundaries.test.ts`가 Stage 1의 empty package source를 모든 후속 Stage에서도 불변으로 가정해, 구현된 protocol public entry를 거부했다. Protocol typecheck/build와 boundary checker는 통과했다.
- Contract correction: W1 Brief revision 3에 해당 predecessor smoke test만 추가한다. Protocol은 정확한 four-module public export를 기대하고, 나머지 shared package와 adapter의 empty-entry invariant는 유지한다.
- Review: controlling Package Scope revision 2의 `tests/**` 안이며 외부 behavior나 owner를 확장하지 않는다. Red를 consumer expectation 보정으로 닫고 focused integration을 재실행한다.

### 2026-09-02 16:34 · W1 result review와 수용

- Result review: W1 Brief revision 3 Attempt 1의 five protocol source files, manifest/lock importer, 13-case contract test, predecessor smoke correction, spec/architecture owner claim과 generated built entry를 직접 재검토했다.
- Disposition: candidate를 전체 수용한다. Strict frame/snapshot runtime validation, request-response ID correlation, typed remote/protocol/connection-closed failures, validated events와 disposal은 accepted Stage 2 baseline이다. WebSocket/authentication/reconnect/method registry는 아직 수용된 동작이 아니며 W2/W3가 소유한다.
- Verification: focused 3 files/23 tests, protocol typecheck/build/public-name import, frozen offline lockfile-only install, boundary checker, root lint/typecheck/build, full 82 files/1034 tests와 10 child commands, edited-doc Markdown와 diff check가 통과했다.
- Registry Integrity: W1-W6 Task Index, actual records와 Identity 역포인터가 일치한다. Result Consumption: revision 3 Attempt 1 exact Result, full-accept disposition, owner handoff, W2/W3 downstream revalidation과 accepted Evidence 반영을 완료했다.
- Reconcile: W1을 completed로 닫고 W2 loopback Local Server/Control WebSocket/static serving/endpoint discovery를 유일한 next로 활성화한다.

## 2026-09-02 · W2 Local Server bootstrap contract review

- Accepted predecessor: W1 revision 3 Attempt 1의 strict frames/snapshot/shared client와 owner handoff가 controlling accepted state다.
- Discovery facts: `apps/server`는 Node-scoped empty executable entry이고 existing root에는 `ws` 8.20.1/`@types/ws`가 설치돼 있다. Node built-in `http`, `fs`, `path`, `crypto`로 listener/static/discovery lifecycle을 구성할 수 있어 새 framework가 필요하지 않다.
- Responsibility boundary: W2는 fixed `127.0.0.1` listener, `/ws/control` upgrade seam, limited static GET/HEAD와 endpoint discovery readiness/cleanup만 소유한다. Authentication/Origin, atomic subscribe/reconnect는 W3, CLI spawn과 shutdown barrier는 W4가 소유한다.
- Endpoint contract: protocol package가 strict `{ origin, pid, serverEpoch }` non-secret discovery schema를 소유한다. Control URL은 origin과 canonical `/ws/control`에서 파생해 중복 저장하지 않는다.
- Contract review: W2 Brief revision 2의 exact write-set, failure cleanup, runtime/import verification과 W3/W4 consumers가 판정 가능하므로 Attempt 1 execution에 진입한다.

### 2026-09-02 16:40 · W2 source-test resolution correction

- Integration Red: server source의 public `@aiox/protocol` import가 Vitest에서 generated `dist`를 해석해 새 endpoint export를 보지 못했다. Clean tree에서는 dist 부재로 source test가 package를 해석하지 못할 동일 위험이 있다.
- Contract correction: W2 Brief revision 3에 `vitest.config.ts`를 추가한다. Test-only alias는 protocol source public entry를 가리키고 production build/runtime manifest path는 변경하지 않으며 built public import로 별도 검증한다.

## 2026-09-02 · W2 result review와 수용

- Result review: W2 revision 3 Attempt 1의 protocol endpoint contract, server bootstrap composition, static/discovery/Control resource owner, manifest/lock/test alias, 7-case integration과 owner 문서 current/as-built claim을 직접 재검토했다.
- Disposition: candidate를 전체 수용한다. `127.0.0.1` listener, canonical `/ws/control`, static GET/HEAD without `/api/*`, strict atomic discovery readiness와 owning-epoch cleanup이 accepted Stage 2 baseline이다. 인증/Origin/snapshot/event/reconnect는 아직 accepted behavior가 아니며 W3가 소유한다.
- Verification: focused 4 files/26 tests, workspace boundary, protocol/server typecheck/build/built import, frozen offline install, full `pnpm check`의 root 83 files/1041 tests와 10 child commands, diff check가 통과했다. 첫 sandbox run의 6개 `listen EPERM`은 sandbox restriction이었고 동일 test는 승인된 loopback 실행에서 7/7 통과했다.
- Registry Integrity: W1-W6 Task Index와 records/Identity 역포인터가 유지된다. Result Consumption: W2 revision 3 Attempt 1 exact Result, full-accept disposition, three-owner handoff와 W3/W4 revalidation을 기록했다.
- Reconcile: W2를 completed로 닫고 W3 authenticated subscribe/snapshot/sequenced event/reconnect를 유일한 next로 활성화한다.

## 2026-09-02 · W3 authenticated subscription contract review

- Accepted predecessors: W1 revision 3과 W2 revision 3의 exact Results, strict frame/snapshot/client와 loopback Control/discovery bootstrap이 controlling accepted state다.
- Security boundary: session credential은 endpoint/query와 분리한 0600 raw secret file로 atomic publish한다. Upgrade에서 exact current loopback Host와, 존재할 경우 exact same Origin을 검사한다. Origin 없는 CLI connection도 credential을 생략할 수 없다.
- Subscription boundary: first authenticated operation은 `gateway.subscribe`이며 credential validation, snapshot cursor capture, subscriber registration을 한 synchronous authority operation으로 묶는다. Response 전 발생 event는 buffer해 snapshot response 뒤에 보낸다.
- Reconnect boundary: shared protocol orchestrator가 snapshot을 authoritative replacement하고 epoch/seq/stateVersion을 검증한다. close/gap/version/epoch mismatch는 local continuation이 아니라 새 connect+subscribe snapshot으로 recovery한다. Node/browser socket construction은 W4/W5가 소유한다.
- Contract review: W3 Brief revision 2의 exact write-set, failure flows, focused/full verification과 W4/W5 consumers가 판정 가능하므로 Attempt 1 execution에 진입한다.

## 2026-09-02 · W3 result review와 수용

- Result review: W3 revision 2 Attempt 1의 protocol schemas/reconnect state machine, server credential/Host-Origin/auth session/GatewayState, bootstrap ordering, 10 direct failure behaviors, source/public exports와 owner 문서 claim을 직접 재검토했다.
- Disposition: candidate를 전체 수용한다. Separate 0600 session credential, exact Host/supplied-Origin gate, authenticated atomic `gateway.subscribe`, response-before-buffered-event, monotonic epoch/seq/stateVersion와 mismatch resnapshot이 accepted Stage 2 baseline이다. Platform WebSocket construction/browser token handoff와 shutdown method/barrier는 W4/W5가 소유한다.
- Verification: focused 6 files/36 tests, protocol/server typecheck/build/built imports, workspace boundary, frozen offline install, full `pnpm check`의 root 85 files/1051 tests와 10 child commands, Markdown/diff check가 통과했다. 중간 1회 hang은 test fixture가 renamed option을 assertion에 잘못 적용해 TypeError reconnect loop를 만든 것이며 fixture correction 후 6 reconnect tests와 full suite가 종료·통과했다.
- Registry Integrity: W1-W6 Task Index와 records/Identity 역포인터가 일치한다. Result Consumption: W3 revision 2 Attempt 1 exact Result, full-accept disposition, owner handoff와 W4/W5 downstream revalidation을 기록했다.
- Reconcile: W3를 completed로 닫고 W4 CLI process lifecycle/doctor/shutdown barrier를 유일한 next로 활성화한다.

## 2026-09-02 · W4 CLI와 shutdown composition contract review

- Accepted predecessors: W1-W3 exact Results의 shared client/reconnect, endpoint/session discovery와 authenticated Control/GatewayState가 controlling accepted baseline이다.
- CLI boundary: `apps/cli`는 Node WebSocket/fs/spawn/browser adapter와 command presentation만 소유하고 authoritative lifecycle을 쓰지 않는다. Healthy probe가 성공하면 start는 spawn하지 않고, browser credential은 URL query가 아닌 fragment로 handoff한다.
- Shutdown boundary: server admission gate가 running→quiescing과 동시에 새 mutation/registration을 닫고 pre-barrier operation settle 뒤 normalized blocker snapshot을 얻는다. Normal rejection만 running/admission을 복구하고 force는 blocker rejection만 우회한다. 둘 다 Agent/Host stop 또는 process kill을 호출하지 않는다.
- Doctor boundary: endpoint/session file, authenticated Gateway snapshot과 React static response까지만 Stage 2가 검사하며 provider/runtime/database 상세 진단은 Stage 8 provider extension으로 남긴다.
- Contract review: W4 Brief revision 3의 exact write-set, process/security/failure paths와 W5/W6 consumers가 판정 가능하므로 Attempt 1 execution에 진입한다.

## 2026-09-02 · W4 result review와 수용

- Result review: W4 revision 3 Attempt 1의 protocol stop contract, admission/shutdown state owner, authenticated route/cleanup ordering, server process lock/bin, CLI parser/operations/Node platform, direct failure tests와 owner claims를 재검토했다.
- Disposition: candidate를 전체 수용한다. Exact five root lifecycle operations, healthy/concurrent singleton start, fragment credential handoff, four-check bootstrap doctor, atomic normal/force barrier와 same cleanup이 accepted Stage 2 baseline이다. Force는 blocker guard만 우회하며 Agent/Host stop·terminate·kill path가 없다.
- Verification: focused 11 files/49 tests, two built subprocess slices, no orphan audit, protocol/server/CLI typecheck/build/built imports, workspace boundary, frozen offline install, full `pnpm check`의 root 90 files/1064 tests와 10 child commands, Markdown/registry/diff가 통과했다. Cleanup-order Red는 HTTP close callback이 upgraded WS를 기다린다는 direct evidence로 순서를 교정한 뒤 회귀가 통과했다.
- Registry Integrity: W1-W6 index/records/Identity가 일치한다. Result Consumption: W4 revision 3 exact Result, full-accept disposition, owner handoff와 W5/W6 downstream revalidation을 기록했다.
- Reconcile: W4를 completed로 닫고 W5 React shell/GatewayStore/reconnect UI를 유일한 next로 활성화한다.

## 2026-09-02 · W5 React shell와 GatewayStore contract review

- Accepted predecessors: W3 shared reconnect/authenticated snapshot-event contract와 W4 fragment/browser/static handoff가 accepted baseline이다.
- Dependency evidence: web importer에는 React/Vite/test DOM이 없었다. Minimal stack으로 React/React DOM 19.2.8, Vite 8.2.2, plugin-react 6.1.1, type packages와 jsdom 30.0.1을 기존 store/lock에서 추가했고 Router/Zustand/UI/xterm은 YAGNI로 제외했다.
- Authority boundary: fragment credential은 memory로 회수한 즉시 current URL에서 erase한다. GatewayStore는 shared reconnect client가 검증한 snapshot/event만 적용하고 request pending을 lifecycle과 별도 UI state로 유지한다.
- Build boundary: Vite SPA HTML/assets와 Stage 1 public ESM entry/declaration을 한 web build에서 보존한다. SSR/custom server/HTTP domain API를 추가하지 않는다.
- Contract review: W5 Brief revision 2의 exact write-set, browser/security/reconnect failure tests와 W6 consumer가 판정 가능하므로 Attempt 1 execution에 진입한다.

## 2026-09-02 · W5 result review와 수용

- Result review: W5 revision 2 Attempt 1의 fragment credential 소비, browser transport, shared reconnect 기반 GatewayStore, authoritative lifecycle UI, production/public dual build, direct tests와 owner claims를 재검토했다.
- Disposition: candidate를 전체 수용한다. Fragment 즉시 erase와 memory-only credential, same-origin `/ws/control`, snapshot replacement/validated event projection, request-pending과 authoritative lifecycle 분리, reconnect UI가 accepted Stage 2 baseline이다.
- Verification: focused 7 files/26 tests와 build-race correction 2 files/8 tests, web typecheck/build 107 modules, built public import, frozen offline install, 최종 `pnpm check`의 root 92 files/1068 tests와 10 child commands가 통과했다. 실제 browser visual inspection은 in-app browser instance가 없어 unavailable이며 jsdom behavior와 production bundle/static tests로 자동 검증했다.
- Regression correction: Stage 1 shared-tooling smoke는 web의 Vite build를 명시했고, root test 중 recursive build mutation을 제거해 Vite `emptyOutDir`와 산출물 reader의 race를 닫았다.
- Registry Integrity: W1-W6 index/records/Identity가 일치한다. Result Consumption: W5 revision 2 exact Result, full-accept disposition, owner handoff와 W6 downstream revalidation을 기록했다.
- Reconcile: W5를 completed로 닫고 W6 Local Server/CLI/React bootstrap vertical slice 통합 검증을 유일한 next로 활성화한다.

## 2026-09-02 · W6 integrated closeout contract review

- Accepted predecessors: W1-W5 exact Results의 strict protocol, Local Server bootstrap/auth/reconnect, CLI lifecycle/shutdown과 React GatewayStore/bundle이 controlling accepted baseline이다.
- Coverage gap: fake static 기반 built CLI subprocess, source Local Server/Gateway tests, jsdom/store와 bundle tests는 각각 통과하지만 actual built CLI→server→production React assets→same-Origin subscribe→CLI stop/cleanup을 한 흐름으로 닫는 증거가 없다.
- W6 boundary: production feature를 추가하지 않고 `web-first-cli-bin` characterization을 실제 `apps/web/dist`와 browser-like authenticated socket/cleanup assertion으로 강화한 뒤 frozen isolated full verification과 owner/registry/result-consumption closeout만 수행한다.
- Contract review: W6 Brief revision 2는 exact write-set, observable vertical slice, no-orphan/cleanup, unavailable visual evidence와 Stage 2→3 transition을 판정 가능하게 하므로 Attempt 1 execution에 진입한다.

## 2026-09-02 · W6 result review와 Stage 2 closeout

- Result review: W6 revision 2 Attempt 1의 actual built CLI/server/React asset/authenticated browser-like Gateway/normal stop cleanup flow, clean-tree protocol type boundary correction, direct tests와 세 owner handoff를 재검토했다.
- Disposition: candidate를 전체 수용한다. W1-W5 accepted pieces가 한 built vertical slice에서 결합되고 endpoint/session/lock/PID cleanup까지 닫힌다. Private protocol은 clean no-emit consumer를 위해 source `types`를 제공하고 runtime `import`는 built dist를 유지한다.
- Verification: focused vertical slice 1/1, boundary/package focused 3 files/13 tests, consumer typecheck/build, current worktree와 isolated clean copy의 `pnpm check`가 각각 root 92 files/1068 tests와 10 child commands로 통과했다. Isolated copy는 generated dist/node_modules 없이 offline frozen install부터 시작했다. Markdown inline-code, log structure, registry/result fields와 diff check도 통과했다.
- Failed closeout evidence: 첫 isolated run은 root compiler, 두 번째는 child consumer가 unbuilt protocol declaration을 요구해 실패했고, source-types/built-runtime split으로 원인을 제거했다. 세 번째 lint failure는 fail-closed checker의 stale uniform-export 가정이었고 exact protocol exception 후 final isolated gate가 통과했다.
- Registry Integrity: Work Items/Task Index/actual W1-W6 records/Identity 역포인터가 일치하고 orphan/dangling/duplicate record가 없다. Result Consumption: W1-W6 exact Result와 각 controlling full-accept disposition, downstream handoff가 모두 기록됐다.
- Owner handoff: runtime-control spec은 current wire/auth/CLI/React/shutdown surface, lifecycle architecture는 state authority/cleanup, workspace architecture는 physical dependency/build/typecheck/verification 경계를 소유한다. Deferred Terminal/PTY와 domain runtime은 Stage 3 이후 소유이며 Stage 2에 구현하지 않았다.
- Residual: actual browser visual inspection만 browser instance 부재로 unavailable이며 automated jsdom/bundle/browser-Origin evidence가 있다. Stage 2 required automated verification gap은 없다.
- Closeout: W6를 completed로 닫고 이 package를 `decided`로 종료한다. Plan은 Stage 2를 `[x]`, existing Stage 3 log를 가리키는 Stage 3만 `[>]`로 전환하며 Stage 3 implementation은 시작하지 않는다.

### 2026-09-02 20:54 · W4 post-closeout response-failure correction

- Independent review에서 accepted `server.stop`이 `stopping` 전환 뒤 response send 성공 callback에만 cleanup을 의존해, client disconnect 또는 send failure 시 admission이 닫힌 채 고착될 수 있음을 확인했다.
- W4 Brief revision 4 / Attempt 2로 response callback error와 connection close 회귀를 먼저 Red로 재현했다. Authenticated session은 response flush를 우선 시도하되 callback, close 또는 synchronous send failure가 동일 after-response action을 정확히 한 번 시작하도록 보정했고 정상 stop 회귀와 함께 Green이다.
- Reconnect delay callback rejection은 기본 browser delay에서 발생하지 않으며 실패 시 retry 또는 terminal error 중 어떤 정책을 적용할지 기존 계약이 정하지 않았다. 이번 correction에서 임의 정책을 추가하지 않고 residual로 남긴다.
- 최종 검증은 Stage 2 focused 13 files/58 tests, repository root single-worker 92 files/1069 tests, workspace boundary lint, recursive typecheck/build, Stage 2-9 package registry, onramp와 `git diff --check`를 통과했다. Reconnect delay callback rejection은 별도 failure policy가 필요한 residual로 유지한다.
- 이 correction은 Stage 2 scope와 closeout 판정을 바꾸지 않으며 Stage 3 W1만 다음 작업으로 활성화했다.
