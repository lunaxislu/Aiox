---
topic: G3 daemon stabilization
description: daemon lifecycle, socket transport, diagnostics 실패 경계를 release-grade로 고정하는 roadmap G3 게이트: fatal/expected-error 경계, SIGTERM/stop cleanup, redacted fatal diagnosability, socket method dispatch hardening, Claude channel boot-failure diagnosability, Codex·Claude 최소 read-only connection/delivery-guarantee diagnostics
status: open
---

## Work Items
- [x] W2 Fatal boundary, lifecycle cleanup, structured diagnostics/redaction claim review
- [x] W3 Socket dispatch hardening and bounded input/queue scope review
- [x] W4 Claude boot failure and Codex/Claude read-only diagnostics claim review
- [x] W6 W5-wide independent result review — lifecycle cleanup, fatal diagnostics, accepted-socket expected-error candidate를 source·diff·verification 근거로 독립 재검토한다

- [x] W1 G3 gap audit and diagnostics/logging design contract — 현재 4개 gap 영역(fatal/expected-error 경계, Claude channel boot-failure diagnosability, socket method dispatch hardening, Codex/Claude read-only diagnostics)을 code/test 근거로 정밀 확인하고 'bounded input/queue' 범위와 diagnostics 표면 설계 방향을 결정한다
- [x] W5 Stage 2 — fatal/expected-error boundary, redacted fatal diagnosability, SIGTERM/stop cleanup accepted·verified

## Required Context

### Return Target

- None: independent package log.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.

## Package Scope

- Revision: 1; History pointer: `2026-08-11 · G3 kickoff`.
- Primary boundary: roadmap G3 daemon stabilization gate 통과 조건: daemon lifecycle/transport/diagnostics failure-boundary hardening과 owner 문서 정합
- Related artifacts in allowed write-set:
- docs/product/roadmap.md
- docs/architecture/local-runtime-daemon-transport-api.md
- docs/architecture/local-runtime-gaps-and-targets.md
- docs/architecture/local-runtime-claude-adapter.md
- docs/specs/aiox-capability-policy.md
- docs/specs/aiox-adapter-model.md
- src/daemon/run.ts
- src/daemon/socket-transport.ts
- src/daemon/state.ts
- src/daemon/api.ts
- src/adapters/claude/channel-server.ts
- Excluded:
  - Durable database/persistence, restart recovery (`docs/architecture/local-runtime-gaps-and-targets.md` §13 "Daemon Database Durability & Recovery"; Phase 2 owner).
  - Stale agent transition policy (signal, threshold, automatic action) — Phase 1 owner.
  - Local trust-boundary auth hardening: ingress/push authentication, route authorization, credential purpose separation, constant-time comparison — Phase 1 trust-boundary hardening owner (G1-D already closed Phase 0 hygiene only).
  - `claude_channel_disconnected` event 신설, generic typed capability/tier-evaluator/diagnostics model·API, adapter registry/event boundary — Phase 2 owner.
  - 새 delivery-state policy, delivery FSM 변경 — roadmap G3는 read-only diagnostics만 요구하고 policy를 만들지 않는다.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution default: W1은 controlling이 현재 thread에서 inline으로 수행하는 read-only discovery다. 이후 구현 W는 W1 synthesis 결과에 따라 inline/delegated를 정한다.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - Active: 이 package는 release-gate(G3)이며 `docs/product/roadmap.md`, 여러 `docs/architecture/`·`docs/specs/` owner와 daemon 핵심 코드를 함께 바꾸는 multi-owner public-contract claim이다. 구현 W의 candidate result를 accepted로 승격하기 전 controlling이 독립 subagent에게 실제 source/artifact/검증 근거 재검토를 맡긴다.

## Task Index

- Stable package key: 2026-08-11-G3-daemon-stabilization

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W6 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W6.md` |
| W5 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W5.md` |
| W4 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W4.md` |
| W3 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W3.md` |
| W2 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W2.md` |
| W1 | Compact | inline | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - W2 accepted with narrowed wording: accepted daemon sockets lack an `error` listener; process fatal handlers are absent; stop/SIGTERM does not await Codex runtime disposal or cancel queue-expiry/retry timers; daemon-owned retained diagnostics/common redaction is absent. A specific ECONNRESET→process-exit chain remains unproven until a regression reproduces it. Helper-process stderr JSONL and point token fingerprints exist, so repo-wide "no structured logging/redaction" is not an accepted claim. Evidence: `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W2.md` Attempt 1.
  - W3 accepted: inherited `constructor`/`toString` dispatch is live-reproduced; daemon NDJSON request input and Claude `/send` body are unbounded; the pre-write queue is already daemon-common bounded behavior (capacity 32, TTL 5m, retries 250ms/1s/4s), not a new Codex-only gap. Evidence: `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W3.md` Attempt 1.
  - W4 facts accepted with correction: Claude attach success precedes channel readiness and port-conflict reason remains child-local; production Codex runtime failure does not automatically disconnect the daemon agent because the callback wiring is absent; Claude push failure does not mutate connection state; current status/dispatch/count/retransmit pieces are not a purpose-built diagnostics surface. `completed` has no runtime automatic producer, but generic update/storage and status/CLI consumers exist; removal is rejected for G3 because current owner docs reserve it for Phase 1 automatic-ack uplift. Evidence: `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W4.md` Attempt 1.
  - W5 accepted after W6 independent result review and controlling revalidation:
    - Shutdown isolates `socketHandle.close()` rejection, then awaits state/server cleanup before DB close and process shutdown resolution.
    - Stop cancels daemon-owned queue-expiry and pre-write retry timers, waits for the target-flush snapshot present at stop entry, then awaits settlement of disconnected Codex runtimes before resolving. Snapshot 이후 새 admission은 이번 W5에서 제외됐다.
    - A fatal unhandled rejection writes owner-only `latest-fatal.json` containing only the allowlisted Node origin, excludes the raw secret sentinel, and preserves default non-zero termination.
    - An accepted-socket expected error is contained to and destroys that socket; close cleanup and a later request on the same server survive.
    - Accepted verification: daemon unit suite 177/177, full suite 635/635, `pnpm typecheck`, `git diff --check`; W6 additionally passed the relevant CLI/integration blast-radius suite 43/43. Evidence: W5 revision 3 Attempts 1–8 and W6 revision 1 Attempt 1.
  - Design contract history and current amendment (2026-08-12): the user did approve the four implementation directions recorded in `2026-08-12 14:18 · Design contract accepted; W1 closed`; that approval is not treated as false or erased. Subsequent design/YAGNI review amended only mechanism-level commitments as recorded in `2026-08-12 15:08 · W5 contract amendment: approved history preserved, mechanisms reopened`.
    1. Stage 3 bounded input: the previously approved socket request-line + Claude `/send` body direction must be revalidated against a supported reachable failure or governing contract before implementation; the existing common delivery queue remains regression-only. The socket-client response buffer is removed from mutable G3 scope because no independently supported failure was established.
    2. W5 fatal diagnostics: required outcome is redacted, observable fatal diagnostics before termination. W5 must compare existing adapter structured stderr, daemon status/doctor/event surfaces, Node built-ins, installed packages, and the smallest local retention before selecting a mechanism; JSONL/profile namespace/rotation/custom sink are not precommitted. Stage 4 still owns any status/doctor read-only projection.
    3. Stage 4 connection semantics remains as approved: confirmed endpoint death may drive lifecycle `disconnected`; ambiguous post-write failure remains separate health/last-failure information. Codex production callback wiring and Claude semantics are handled there, not in W5.
    4. W5 lifecycle: required outcome is completion of daemon-owned runtime/timer/resource cleanup before shutdown resolves or the process exits. W5 must compare narrow shutdown orchestration using the current `Map` and Node primitives such as `Promise.allSettled` against broad state/API/server async-contract or registry redesign; iterable registry and a full awaitable-API conversion are not precommitted.
- Evidence gaps:
  - Stage 3 must establish the supported reachability/contract for socket request-line and Claude HTTP body harm before choosing byte limits or rejection/close behavior. The existing common delivery queue needs regression evidence only, not new implementation.
  - Exact confirmed-death criteria (which failure signals qualify) remain an implementation-W decision (direction fixed, specifics open).
  - W5 residuals that do not block Stage 2 acceptance: snapshot 이후 normal-stop admission race; 별도 child regression이 없는 `uncaughtException` variant; fatal artifact write-failure fallback; 특정 OS peer action별 errno/event ordering; socket error diagnostics; normal RPC stop 뒤 process signal listener 잔존; unused `createInProcessRuntime()` dead-code cleanup candidate.

## Cross-Artifact Effects

- W5 changed the daemon stop contract from synchronous to awaitable across state → API → server → process shutdown, with regression coverage in daemon API, ingress and run-level tests.
- W5 added a process-lifetime fatal observer and owner-only profile artifact, plus accepted-socket local error containment; owner documentation remains reserved for plan Stage 5 closeout rather than being partially updated here.
- `createInProcessRuntime()` is an unused exported helper whose restart path does not await the new stop contract. It is not on the production CLI topology and has no in-repo consumer, so it is a separate dead-code deletion candidate rather than a W5/Stage 2 blocker.

## Decision Candidates

- W5 decisions accepted:
  - Fatal diagnostics use Node `uncaughtExceptionMonitor` plus the smallest synchronous allowlist artifact in the existing profile/socket namespace; no logger dependency, rotation, status projection or custom sink was added.
  - Shutdown uses existing timer/flush maps and the narrow async state → API → server → run chain; no iterable registry or compatibility layer was added.
  - Accepted-socket expected errors use one socket-local listener and existing close cleanup; no server-wide recovery or socket diagnostics surface was added.
- Stage 3/4 candidates remain unresolved outside W5. No new dependency, public diagnostics API, delivery-state policy, or compatibility layer is authorized by W5 acceptance.

## Verification Contract

- Revision: 2; History pointer: `2026-08-12 15:08 · W5 contract amendment: approved history preserved, mechanisms reopened`.
- Required:
  - W5 client/socket-error gate: reproduce a supported peer fault or bind behavior to an owner contract before changing production handling; if changed, prove expected error isolation. Independently prove an unhandled fatal produces redacted observable diagnostics before termination.
  - W5 shutdown cleanup tests: normal stop and SIGTERM wait for daemon-owned runtime/timer/resource cleanup; injected `socketHandle.close()` rejection cannot skip state stop, DB close, or shutdown resolution. Queue-expiry timers are covered; retry timers/in-flight flushes are tracked or excluded only after ownership/race evidence.
  - W5 solution-fit evidence: record the existing code, Node built-in, installed-package, and smallest-local-implementation comparison for lifecycle and fatal diagnostics before accepting a broad contract change, custom sink, or new dependency.
  - Socket method dispatch hardening test (unknown/inherited method name rejected as typed error, not executed).
  - Stage 3 bounded-input work, if its reachability/contract gate passes, proves the selected socket-line and Claude-body rejection behavior. The common delivery queue is regression-only; socket-client response buffering is not a G3 candidate.
  - Claude channel boot-failure diagnosability test (e.g. port-in-use surfaces its real reason, not only generic `target_runtime_unavailable`).
  - Minimal read-only Codex/Claude diagnostics surface test (connection state, acceptance/receipt distinction, automatic-ack support, automatic-retry safety, manual-recovery boundary).
  - `pnpm typecheck` and existing regression suite stay green.
  - Each implementation W records exact test files/commands after its reachability and solution-fit gates; package-wide `pnpm typecheck` and existing regression suite stay green.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 1; History pointer: `2026-08-11 · G3 kickoff`.
- Criteria:
  - roadmap G3의 각 통과 조건(fatal/expected-error 경계·SIGTERM cleanup·bounded input/queue·log redaction·doctor diagnosis, Claude boot-failure diagnosability, socket dispatch hardening, Codex/Claude read-only diagnostics)이 accepted evidence로 닫히거나, 닫히지 않는 항목은 명시적 residual owner/action으로 남는다.
  - `docs/product/roadmap.md` G3 카드와 Gate Evidence 표, 관련 `docs/architecture/`·`docs/specs/` owner가 accepted 결과와 정합화된다.
  - Excluded 항목(durable store, stale policy, trust-boundary auth, `claude_channel_disconnected` event, adapter registry)이 G3 완료 주장에 섞이지 않는다.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-08-11 · G3 kickoff

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.

### 2026-08-11 23:34 · Package contract seeded; W1 discovery opened

- Filled Package Scope(Excluded), Workflow/Agent Plan(Execution default, Risk gate — Active, release-gate multi-owner claim), Evidence(owner-document current-gap claims consulted; evidence gaps incl. undefined "bounded input/queue" roadmap wording), Verification Contract(category placeholders), Closeout Contract(package-specific criteria) from prior turn's roadmap G3 card + owner-doc read (`docs/architecture/local-runtime-daemon-transport-api.md`, `local-runtime-gaps-and-targets.md` §13, `local-runtime-claude-adapter.md` §6.2/6.4, `docs/specs/aiox-capability-policy.md` §7.2, `docs/specs/aiox-adapter-model.md`).
- W1 (`logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W1.md`) registered as Compact/inline read-only discovery: re-verify the four gap areas against `src/` with direct `path:line` citation, resolve the "bounded input/queue" ambiguity, and propose the next implementation W split. No code/doc edits in W1.
- Plan file `plans/g3-daemon-stabilization.md` is being created in the same session with Stage 1 pointing to this controlling log.

### 2026-08-12 13:46 · Independent review disposition; W1 contract choices remain

- User requested independent subagent review of the supplied Claude four-area audit. W2-W4 were registered as delegated read-only reviews; their focused suites passed (147, 156, and 128 tests), and W3 additionally reproduced inherited `constructor`/`toString` dispatch through the live socket transport.
- Result review accepted the core fatal/lifecycle, dispatch/input-bound, Claude boot-failure, callback-wiring, and diagnostics gaps with corrections recorded in Package Evidence. Rejected claims: repo-wide structured logging is wholly absent; production Codex already auto-disconnects; `completed` is wholly unused or should be removed in G3.
- W2-W4 results are consumed. W1 remains active because exact input limits/rejection behavior, socket-client response-buffer scope, retained diagnostic schema/capacity/projection, and awaitable cleanup ownership require contract confirmation before implementation W split.

### 2026-08-12 14:18 · Design contract accepted; W1 closed

- User confirmed all four Decision Candidates (bounded body/queue scope, diagnostics artifact design, connection semantics split, awaitable lifecycle contract) recorded in the prior entry. Design contract is now locked; see Package Evidence "Design contract accepted" for the accepted text.
- W1 completion condition met: all four gap areas have direct code/test evidence (via W2-W4 independent review), the `bounded input/queue` scope is resolved (socket request-line + Claude HTTP body as new work, existing common queue as regression-only), and diagnostics-surface design direction is fixed. W1 closed `[x]`.
- Registry Integrity Check passed (`package-log check`): stable-key and all W1-W4 identities/records consistent.
- Next: implementation Work Items are not yet opened. Plan Stages 2-4 (`plans/g3-daemon-stabilization.md`) map onto this accepted contract: Stage 2 = fatal/expected-error containment + lifecycle awaitable cleanup + diagnostics sink (decisions 2 and 4, plus accepted-socket error containment); Stage 3 = socket dispatch hardening + bounded input (socket line + Claude HTTP body) + Claude boot-failure diagnosability (decision 1, plus dispatch/boot findings); Stage 4 = Codex/Claude connection-semantics wiring and read-only diagnostics projection (decision 3). Awaiting user go-ahead before registering the next Work Item and starting Stage 2 execution.

### 2026-08-12 14:25 · W5 Task Brief registered; execution deferred to next session

- 사용자가 W5(Stage 2) Task Brief 등록까지 진행하고 실제 구현(Act)은 다음 세션으로 미루기로 확인했다.
- W5를 active(`[>]`) Work Item으로 등록하고 `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W5.md`에 Task Brief(scope/excluded/allowed write-set/required reads/predecessor/completion 계약)를 채웠다. Task History는 "Brief revision 1 created"만 있고 Attempt는 없다 — 코드 변경 없음.
- plan Stage 2를 `[>]`로 표시하고 이 controlling log를 가리키게 했다(plan 자체 Notes의 기존 방침대로 별도 stage log를 만들지 않음).
- `log check` 재확인: next pointer가 W5로 채워지고 closeout 오탐 hint가 사라짐을 확인했다(재개 ctx 충분성 문제 해소).
- Next: 다음 세션에서 사용자 go-ahead를 받아 W5 Attempt 1을 시작한다(fatal/expected-error 격리, awaitable stop/lifecycle cleanup, diagnostics sink 구현).

### 2026-08-12 15:08 · W5 contract amendment: approved history preserved, mechanisms reopened

- 사용자는 14:18에 기록된 four-direction 계약을 실제로 승인했음을 다시 확인했다. 당시 승인 내용은 socket request-line + Claude `/send` body를 새 bounded-input work로 두고 common queue를 regression-only로 보는 것, daemon-owned bounded/redacted JSONL retained artifact를 profile namespace와 status/doctor projection으로 두는 것, confirmed endpoint death와 ambiguous post-write failure를 분리하는 것, awaitable stop/API/server와 iterable registry로 cleanup을 완결하는 것이었다.
- 후속 설계/YAGNI 검토는 승인 사실을 취소하지 않고 구현 수단 선약만 수정했다. 현재 W5 계약은 fatal diagnostics의 redacted observability와 shutdown 전 resource cleanup 완료를 outcome으로 두며, 기존 structured stderr·status/doctor/event, Node built-ins, installed packages, 최소 local implementation과 좁은 shutdown orchestration/current `Map`/`Promise.allSettled`를 먼저 비교한다. JSONL/profile namespace/rotation/custom sink, iterable registry, 전면적 async API 전환은 evidence 없이 선택하지 않는다.
- Accepted-socket 변경은 supported reproduction 또는 owner contract gate를 통과한 경우에만 한다. `socketHandle.close()` rejection 후속 cleanup을 필수 fault-injection으로 추가하고, queue-expiry timer는 정리 대상으로 유지하되 retry timer와 in-flight flush는 소유·race를 확인한 뒤 필요한 것만 구현한다.
- Stage 3의 socket request-line/Claude HTTP body 방향은 도달 가능한 supported failure 또는 governing contract를 다시 확인한 뒤 구체 동작을 정한다. socket-client response buffer는 독립적으로 입증된 failure가 없어 mutable G3 candidate에서 제거했다. Common queue는 계속 regression-only이며, `completed` 제거와 repo-wide structured logging 부재 주장은 G3 범위/accepted evidence가 아니다.
- W5 Task Brief를 revision 2로 갱신했고 Attempt는 시작하지 않았다. W5와 plan Stage 2는 active 상태를 유지하며 production code 변경은 없다.

### 2026-08-12 15:43 · W5 close-rejection GREEN checkpoint and next-session handoff

- W5 Brief revision 3 / Attempt 1의 첫 lifecycle slice를 완료했다. `src/daemon/run.ts`는 `socketHandle.close()` rejection을 좁게 격리해 `handle.stop({})`, DB close, shutdown resolution을 계속 수행한다. `tests/unit/daemon/run.test.ts`에는 이 behavior를 고정하는 API-level regression test 1개가 추가됐다.
- 검증: focused regression 1/1 통과, 실제 Unix socket을 포함한 전체 `run.test.ts` 3/3 통과(sandbox 밖 실행), `pnpm typecheck` 통과, `git diff --check` 통과. 새 dependency, diagnostics mechanism, refactor는 없다.
- 이 결과는 W5 전체 완료가 아니며 independent result review 전 candidate checkpoint다. W5와 plan Stage 2는 active로 유지한다.
- 다음 세션 재개: `scripts/onramp`로 W5를 선택하고 이 entry와 W5 Task History 최신 entry를 읽는다. 사용자 지시대로 한 단계만 진행한다. 다음 단일 단계는 `state.stop()`이 outstanding `queueExpiryTimers`를 취소하지 않는 현재 경로를 source/test로 재확인하고, fake timer를 사용한 가장 작은 RED regression test 하나를 subagent에게 맡기는 것이다. Production GREEN, runtime disposal, retry timer, fatal diagnostics는 그 RED를 사용자에게 보고하기 전 시작하지 않는다.

### 2026-08-12 15:54 · W5 queue-expiry cleanup RED checkpoint

- 사용자 지시로 W5 다음 단일 단계를 subagent에 위임했다. `state.stop()`은 agent/channel 상태만 정리하고 outstanding `queueExpiryTimers`를 취소하지 않으며, 공통 queued-delivery expiry helper가 예약한 timer가 stop 뒤에도 남는 경로를 source에서 재확인했다.
- `tests/unit/daemon/codex-ingress.test.ts`에 fake timer 기반 최소 regression test 1개가 추가됐다. Subagent와 controlling이 각각 focused command를 실행했고 모두 stop 뒤 timer count가 1로 남아 `expected 1 to be +0`에서 의도대로 RED(1 failed, 77 skipped)임을 확인했다.
- Production code와 GREEN, runtime disposal, retry timer, in-flight flush, fatal diagnostics는 시작하지 않았다. W5/Stage 2는 active이며 다음 행동은 사용자 지시를 기다린다.

### 2026-08-12 15:59 · W5 queue-expiry cleanup GREEN checkpoint

- W5 Attempt 2의 queue-expiry GREEN을 subagent에 위임했다. `src/daemon/state.ts`는 기존 `queueExpiryTimers`와 `cancelTimeout`만 사용해 stop 진입 시 outstanding expiry handle을 모두 취소하고 Map을 비운다. 새 abstraction·dependency·테스트 변경은 없다.
- Subagent와 controlling이 각각 focused test 1/1, 영향 파일 `codex-ingress.test.ts` 78/78, `pnpm typecheck`, `git diff --check` 통과를 확인했다. Cleanup은 `daemonOnly` 분기 전이라 두 stop mode에 공통 적용된다.
- 이 결과는 independent result review 전 candidate checkpoint이며 W5 전체 완료가 아니다. 다음 단일 probe는 normal stop이 async Codex runtime disposal 완료를 기다리지 않는 현재 경로와 가장 작은 API-level RED를 source/test로 재확인하는 것이다. Retry timer, in-flight flush, fatal diagnostics는 아직 시작하지 않는다.

### 2026-08-12 16:06 · W5 async runtime-disposal RED checkpoint

- 사용자 지시로 W5 다음 lifecycle probe를 subagent에 위임했다. `codexRuntimes`는 async `dispose()` runtime을 소유하지만 주입 계약은 `get/set/delete`만 제공하고, 현재 state/API/server stop은 동기이며 state stop은 registry에 접근하지 않는다. Process shutdown도 `handle.stop({})`을 await하지 않는다.
- `tests/unit/daemon/api.test.ts`에 deferred disposal을 사용한 API-level regression test 1개가 추가됐다. Normal `client.stop({})`은 runtime `dispose()`를 호출하고 완료 전 resolve되지 않아야 하나, 현재 `dispose()`가 0회라 focused test가 의도대로 RED(1 failed, 47 skipped)다.
- Controlling이 최초 test-only typecheck 결함을 발견해 subagent가 테스트 안에서 최소 교정했다. 교정 후 controlling도 동일 RED를 재현했고 `pnpm typecheck`와 `git diff --check` 통과를 확인했다. Production code/contract는 변경하지 않았다. GREEN의 후보 blast radius는 state/API/server/run stop await chain과 runtime 열거 경계이며 mechanism 결정 전 사용자 지시를 기다린다.

### 2026-08-12 16:14 · W5 async runtime-disposal candidate GREEN review

- 사용자 지시대로 subagent가 Attempt 3 GREEN을 구현하고 controlling이 실제 diff·소스·호출 경로를 재검토했다. `state.stop({})`은 transaction이 실제 disconnected 처리한 agent 이름을 사용해 기존 `get/set/delete` registry 계약으로 runtime을 찾고, 기존 best-effort `disposeRuntime()`을 `Promise.all`로 기다린 뒤 entry를 삭제한다. `daemonOnly`는 stopped agent가 없어 runtime을 보존하며, 새 registry·dependency·compatibility layer는 추가되지 않았다.
- Async stop 계약은 필요한 `state → api → server → run shutdown` 경로에만 전파됐다. Controlling 재검증은 `pnpm vitest run tests/unit/daemon` 171/171, `pnpm typecheck`, `git diff --check` 모두 통과했다. 이 slice는 candidate GREEN으로 수용하되 W5 전체 Result/independent review/accepted promotion은 아직 남아 있다.
- 다음 단일 작업은 실제 `SIGTERM` shutdown에 deferred runtime cleanup을 결합한 run-level fault-injection으로 DB close·shutdown resolution이 disposal 완료를 앞서지 않는지 검증하는 것이다. Production 추가 변경, retry timer, in-flight flush, fatal diagnostics는 이 결과를 보고하고 사용자 지시를 받기 전에 시작하지 않는다.

### 2026-08-12 16:46 · Claude stop/runtime ownership clarification

- 확인 사실: `stop({ daemonOnly: false })`는 kind와 무관하게 connected agent 전체를 disconnected 처리하고 Codex/Claude channel·pending-token Map entry를 삭제한다. Claude cleanup은 `tests/unit/adapters/claude-channel.test.ts`의 stop 후 token 재등록 거부 및 stale endpoint 제거 테스트로 고정돼 있다.
- 확인 사실: awaited `dispose()`는 Codex에만 적용된다. `codexRuntimes` 값은 daemon이 직접 생성·소유하는 `ManagedAgentRuntime`으로 `dispose()` 계약이 있지만, `claudeChannelRuntimes` 값은 Claude CLI가 소유한 별도 MCP/HTTP process의 endpoint·등록시각·token fingerprint metadata일 뿐 lifecycle handle이나 `dispose()`가 없다.
- 확인 사실: Claude CLI 종료 시 launcher/invocation 경로가 `disconnectClaudeChannel()`을 호출하고, channel MCP HTTP server 자체는 Claude CLI의 stdio parent process lifecycle에 종속된다. 따라서 현재 W5 normal-stop slice가 Codex runtime만 await하는 것은 현 소유 모델과 일치한다.
- 판단: daemon stop이 Claude child/channel process 종료 완료까지 책임져야 한다는 새 계약은 현재 구현돼 있지 않다. 이는 누락이라고 단정할 수 없으며 daemon이 그 process handle을 소유하지 않는 현재 architecture에서 별도 ownership 변경이 필요한 후보이므로 W5 범위에 조용히 추가하지 않는다.

### 2026-08-12 16:50 · W5 next-session handoff

- 사용자 지시: 이후 구현은 현재 세션에서 진행하지 않고 다음 세션에서 재개한다.
- 재개 순서: `scripts/onramp` 출력으로 이 controlling log와 active W5를 선택한 뒤, 이 entry, `2026-08-12 16:14 · W5 async runtime-disposal candidate GREEN review`, `2026-08-12 16:46 · Claude stop/runtime ownership clarification`, 그리고 `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W5.md`의 최신 Task History를 읽는다. 15:43의 과거 next-session handoff는 이후 완료된 queue-expiry/runtime-disposal 작업 전 상태이므로 이 entry가 다음 행동을 대체한다.
- 현재 accepted/candidate 경계: socket-close rejection cleanup, queue-expiry cleanup, async Codex runtime disposal은 candidate GREEN이며 W5 전체 Result와 independent result review/accepted promotion은 아직 남아 있다. Claude channel runtime은 daemon-owned disposable process handle이 아니라 endpoint metadata이므로 이번 Codex disposal 검증에 섞지 않는다.
- 다음 단일 작업: subagent에게 실제 `SIGTERM` shutdown과 deferred Codex runtime disposal을 결합한 run-level fault-injection test만 위임한다. Runtime disposal 완료 전 DB close와 `runDaemonProcess()` resolution이 발생하지 않는지를 먼저 검증한다. 테스트 결과를 controlling이 source/diff/command로 독립 검토한 뒤 사용자에게 보고한다.
- 중지 경계: 위 검증과 보고 전에는 production 추가 변경, retry timer, in-flight flush, fatal diagnostics, Stage 3/4 작업을 시작하지 않는다. 테스트가 RED이면 원인·blast radius만 보고하고 GREEN은 다음 사용자 지시를 기다린다; 이미 GREEN이면 기존 coverage가 계약을 충분히 증명하는지 근거와 함께 보고하고 범위를 확장하지 않는다.

### 2026-08-12 16:53 · W5 Attempt 4 SIGTERM disposal run-level verification delegated

- 사용자 지시에 따라 W5의 다음 단일 작업을 subagent에 위임한다. 범위는 실제 `SIGTERM` shutdown과 deferred Codex runtime disposal을 결합한 `runDaemonProcess()` 수준 fault-injection test 1건의 추가·실행으로 한정한다.
- 검증 계약: runtime disposal 완료 전 DB close와 daemon Promise resolution이 발생하지 않아야 한다. 기존 candidate production code를 먼저 그대로 검증하며, production code·retry timer·in-flight flush·fatal diagnostics·Stage 3/4는 수정하거나 시작하지 않는다.
- 결과를 받은 뒤 controlling이 source/diff/명령 출력을 독립 검토한다. RED이면 원인과 blast radius만 보고하고 GREEN 구현은 사용자 지시를 기다린다. 이미 GREEN이면 기존 구현이 계약을 충족하는지 근거와 함께 보고하고 범위를 확장하지 않는다.

### 2026-08-12 16:56 · W5 SIGTERM deferred-disposal candidate GREEN verified

- subagent가 `tests/unit/daemon/run.test.ts`에 실제 `runDaemonProcess()`와 state/API/server 경로를 통과하는 SIGTERM + deferred Codex runtime disposal fault-injection test 1건을 추가했다. SIGTERM 후 `dispose()` 1회, disposal 대기 중 DB close 0회와 daemon unresolved, disposal 완료 후 DB close 1회와 daemon resolved가 관찰되어 기존 production candidate가 추가 변경 없이 GREEN이다.
- Controlling이 diff·source·호출 경로를 재검토하고 `pnpm vitest run tests/unit/daemon/run.test.ts` 4/4, `pnpm typecheck`, `git diff --check` 통과를 독립 확인했다. 이 결과는 candidate GREEN이며 W5 전체 Result와 independent result review/accepted promotion은 아직 남아 있다.
- 다음 단일 작업 후보는 남은 lifecycle residual인 untracked pre-write retry timer, in-flight `targetFlushes`, shutdown 중 새 요청 race의 producer/consumer/ownership을 read-only로 추적하고, 실제 daemon-owned cleanup gap과 가장 작은 RED 경계를 한 건으로 좁히는 것이다. 사용자 지시 전에는 이 probe나 fatal diagnostics를 시작하지 않는다.

### 2026-08-12 16:57 · W5 lifecycle residual ownership probe delegated

- 사용자 지시에 따라 W5의 다음 단일 단계를 subagent에게 위임한다. 범위는 pre-write retry timer, in-flight `targetFlushes`, shutdown 중 새 요청 race의 producer/consumer, handle ownership, stop 도달성을 source/tests에서 읽기 전용으로 추적하는 것이다.
- 산출물은 각 후보별 직접 확인 사실, daemon-owned cleanup gap 여부, 가장 작은 지원 가능한 RED 경계 또는 W5 제외 근거다. Production/test/log/doc 수정과 RED 작성, GREEN 구현, fatal diagnostics 착수는 금지한다.
- Controlling은 보고를 실제 source·tests와 독립 대조한 뒤 2번(최소 RED 한 건) 또는 3번(제외 근거 기록 후 fatal diagnostics) 진행 여부를 사용자에게 보고한다.

### 2026-08-12 17:02 · W5 lifecycle residual probe reviewed; retry RED selected

- subagent의 read-only ownership trace를 controlling이 실제 source/tests에서 독립 대조했다. 직접 확인 사실: pre-write retry `scheduleTimeout()` handle은 저장되지 않아 stop이 취소하지 못한다; `targetFlushes` Promise chain은 stop이 await하거나 admission을 차단하지 않는다; SIGTERM은 socket close가 선행하지만 normal stop RPC는 runtime disposal 대기 중 socket이 열려 있고 state에는 stopping gate가 없어 새 send가 DB row와 expiry timer를 만들 수 있다.
- 판정: retry timer는 daemon-owned cleanup gap으로 볼 직접 근거가 충분하고 가장 작은 RED 경계가 확정됐다. In-flight dispatch의 DB-close 이후 continuation과 normal-stop 재입력 side effect는 source상 지원되는 위험이지만 실제 회귀 재현 전에는 확인 사실로 승격하지 않는다.
- 다음 행동은 `tests/unit/daemon/codex-ingress.test.ts`의 기존 expiry cleanup/retry fixture를 재사용해 stop 뒤 retry timer가 남는 최소 RED test 1건만 추가하는 것이다. 이 RED 결과 보고 전 production GREEN, targetFlushes/quiesce 수정, fatal diagnostics는 시작하지 않는다. 따라서 2번은 계속 진행 대상이고, 3번으로 바로 넘어가지는 않는다.

### 2026-08-12 17:09 · W5 retry-timer stop-cleanup RED delegated

- 사용자 지시에 따라 subagent에게 pre-write retry timer stop-cleanup의 최소 RED regression test 1건만 위임한다. 기존 `tests/unit/daemon/codex-ingress.test.ts`의 expiry cleanup 패턴과 retry fixture를 재사용해 retry가 예약된 뒤 `state.stop({})` 후 timer가 남는 현재 behavior를 검증한다.
- Test-only 범위다. Production code, 다른 tests, targetFlushes/quiesce, normal-stop admission, fatal diagnostics, Stage 3/4는 수정하거나 시작하지 않는다. RED이면 원인과 예상 GREEN blast radius만 반환한다.
- Controlling은 결과를 실제 diff·source·focused command로 독립 검토한 뒤 다음 진행 여부를 사용자에게 보고한다.

### 2026-08-12 17:12 · W5 pre-write retry timer cleanup RED confirmed

- subagent가 `tests/unit/daemon/codex-ingress.test.ts`에 최소 regression test 1건만 추가했다. 250ms retry와 별도 expiry timer가 함께 예약되어 stop 전 2개임을 확인한 뒤, stop 후 0개를 기대했으나 retry 1개가 남아 `expected 1 to be +0`으로 RED다.
- Controlling이 diff/source를 검토하고 focused test 1 failed/78 skipped를 독립 재현했으며 `pnpm typecheck`, `git diff --check` 통과를 확인했다. Production code와 다른 test 변경은 없다.
- 직접 원인은 retry `scheduleTimeout()` 반환 handle을 저장하지 않아 stop이 취소할 수 없는 것이다. 다음 단일 GREEN 후보는 `src/daemon/state.ts` 내부에서 retry handle을 delivery별로 추적하고 callback 실행 시 제거하며 stop에서 cancel/clear하는 좁은 변경이다. 새 API·registry redesign·targetFlushes/quiesce·fatal diagnostics는 이 단계에 포함하지 않는다.

### 2026-08-12 17:32 · W5 retry-timer GREEN next-session handoff

- 사용자 지시: GREEN 구현은 현재 세션에서 진행하지 않고 다음 세션에서 재개한다.
- 재개 시 이 entry, `2026-08-12 17:12 · W5 pre-write retry timer cleanup RED confirmed`, 그리고 `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W5.md`의 최신 Task History를 읽는다. Focused RED는 `pnpm vitest run tests/unit/daemon/codex-ingress.test.ts -t "cancels an outstanding pre-write retry timer when state stops"`이며 현재 `expected 1 to be +0`이다.
- 다음 단일 작업: subagent에게 `src/daemon/state.ts` 내부의 최소 GREEN만 위임한다. Retry timeout handle을 delivery별로 추적하고 callback 실행 시 제거하며 `stop()`에서 cancel/clear한다. 현재 RED와 영향 suite, `pnpm typecheck`, `git diff --check`를 controlling이 독립 검증한 뒤 보고한다.
- 중지 경계: 새 API·registry redesign, targetFlushes/quiesce, normal-stop admission race, fatal diagnostics, Stage 3/4는 이 GREEN 결과 보고 전 시작하지 않는다. 기존 working-tree 변경은 W5 candidate이며 보존한다.

### 2026-08-12 17:37 · W5 retry-timer cleanup candidate GREEN reviewed

- 사용자 지시에 따라 subagent가 Attempt 5 최소 GREEN을 구현했다. `src/daemon/state.ts`는 기존 queue-expiry ownership 패턴과 injected `cancelTimeout`을 재사용해 `preWriteRetryTimers`를 delivery id별로 추적하고, callback 진입 시 entry를 제거하며, `stop()`에서 outstanding handle을 cancel/clear한다. 새 API·abstraction·dependency·구조 refactor는 없다.
- Controlling이 실제 diff와 producer/callback/stop 경로를 독립 검토했다. 기존 RED test는 변경되지 않았고, focused 1/1, 영향 파일 79/79, daemon unit suite 173/173, `pnpm typecheck`, `git diff --check`를 모두 독립 실행해 통과를 확인했다. 따라서 retry-timer stop-cleanup slice는 candidate GREEN으로 수용한다.
- 확인 사실: `targetFlushes`는 여전히 stop이 await하거나 admission을 차단하지 않고, normal stop RPC 중 socket이 열린 상태에서 새 요청이 들어올 수 있다는 source-level residual은 남아 있다. 다만 DB-close 이후 continuation 또는 새 side effect는 아직 deterministic regression으로 재현하지 않았으므로 결함 해결을 주장하지 않는다.
- 다음 단일 작업 후보는 subagent에게 in-flight `targetFlushes`와 normal-stop admission race 중 shutdown cleanup 계약을 직접 위반하는 가장 작은 deterministic API-level RED 1건만 찾고 작성하도록 위임하는 것이다. 이 probe 결과를 보고하기 전 production GREEN, fatal diagnostics, Stage 3/4는 시작하지 않는다.

### 2026-08-12 18:13 · W5 in-flight target dispatch cleanup RED confirmed

- 사용자 지시에 따라 subagent가 lifecycle residual 두 후보를 비교하고, 새 admission/response policy 없이 기존 Claude push fetch seam으로 직접 재현 가능한 in-flight `targetFlushes`를 선택해 API-level test 1건만 추가했다.
- 직접 확인 사실: normal `client.stop({})`은 deferred Claude push가 끝나기 전에 resolve됐다. 그 시점 delivery는 `delivering`이었고 push release 뒤 `delivered`로 갱신되어, stop resolution 뒤 daemon-owned dispatch가 DB side effect를 계속하는 shutdown cleanup 계약 위반이 재현됐다.
- Controlling이 diff/source/cleanup 경로를 검토하고 focused command를 독립 실행해 expected `pending` vs received `resolved`의 동일 RED(1 failed, 79 skipped)를 확인했다. `pnpm typecheck`, `git diff --check`, package registry integrity는 통과했다. Production code와 기존 test는 변경되지 않았다.
- 다음 단일 GREEN 후보는 `src/daemon/state.ts` 내부에서 stop이 현재 in-flight target flush를 quiesce/await하도록 ordering을 좁게 보완하는 것이다. Public API·server/run 계약 또는 normal-stop admission 변경 필요성은 아직 확인되지 않았으므로 포함하지 않는다. GREEN 결과 보고 전 fatal diagnostics와 Stage 3/4는 시작하지 않는다.

### 2026-08-12 18:21 · W5 target-flush quiesce candidate GREEN reviewed

- 사용자 지시에 따라 subagent가 Attempt 6 최소 GREEN을 구현했고, controlling 검토에서 최초 disposal-then-flush ordering의 Codex runtime interference 위험을 발견해 같은 subagent가 source 근거로 교정했다.
- 직접 확인 사실: Codex dispatch는 registry runtime을 캡처한 뒤 async target resolution과 `turn/start`를 수행하고, production runtime `dispose()`는 호출 즉시 WebSocket을 닫는다. 따라서 최종 ordering은 stop 진입 시 flush snapshot 고정 → timer cancellation → snapshot이 있으면 `Promise.allSettled()` → disconnect/channel cleanup → Codex runtime disposal → return이다. Empty snapshot은 await하지 않아 기존 dispose 호출 시점을 보존한다.
- Controlling이 최종 diff와 source를 검토하고 target-dispatch focused 1/1, runtime-disposal focused 1/1, daemon suite 174/174, `pnpm typecheck`, `git diff --check`를 독립 실행해 모두 통과를 확인했다. 신규 RED test와 public API/server/run은 변경되지 않았다. 이 slice를 candidate GREEN으로 수용한다.
- 남은 lifecycle residual은 snapshot 이후 normal-stop 중 새 dispatch admission 가능성이다. 현재는 source-supported risk지만 deterministic side effect 재현은 아직 없으므로 다음 단일 작업 후보는 기존 deferred disposal/dispatch seam으로 이 race의 최소 API-level RED 성립 여부를 조사·검증하는 것이다. 그 결과 전 fatal diagnostics와 Stage 3/4는 시작하지 않는다.

### 2026-08-12 18:34 · W5 Codex in-flight ordering regression verified

- 사용자 지시에 따라 subagent가 Codex in-flight dispatch + normal stop ordering을 직접 고정하는 API-level regression test 1건을 `tests/unit/daemon/api.test.ts`에 추가했다. 기존 fake runtime의 `turn/start`만 deferred로 두고 production API/state dispatch 경로를 통과한다.
- 직접 관찰: deferred dispatch 완료 전 runtime dispose 0회와 stop pending, release 뒤 dispatch delivered → runtime dispose 1회 → stop resolve 순서다. 기존 `state.ts` candidate는 production 추가 변경 없이 GREEN이었다.
- Controlling이 diff와 test seam을 검토하고 focused 1/1, `api.test.ts` 49/49, daemon suite 175/175, `pnpm typecheck`, `git diff --check`를 독립 실행해 모두 통과를 확인했다. Codex 전용 ordering 검증 공백은 닫혔다.
- 사용자가 admission race를 이번 검증에서 제외했다. 다음 W5 본 작업은 fatal/expected-error 경계와 redacted fatal diagnosability의 현재 producer/observer/termination 경로를 source/tests에서 복원하고 가장 작은 deterministic RED 경계를 정하는 것이다. 구현이나 새 diagnostics mechanism은 이 probe 결과 전 시작하지 않는다.

### 2026-08-12 19:12 · W5 fatal-boundary source/test probe delegated

- 사용자 지시에 따라 W5의 다음 단일 단계를 subagent에게 위임한다. 범위는 fatal/expected-error producer, observer, redaction, flush/termination 경로와 관련 tests를 읽기 전용으로 복원하고, 기존 표면·Node built-in·설치 package·최소 local implementation의 적합성을 비교해 가장 작은 deterministic RED 경계를 제안하는 것이다.
- Production/test/log/doc 수정, RED 작성, mechanism 선택·구현, Stage 3/4 착수는 금지한다. Controlling은 반환 결과를 실제 source/tests와 독립 대조한 뒤 확인 사실·추론·제안 및 다음 행동을 보고한다.

### 2026-08-12 19:18 · W5 fatal-boundary probe reviewed; child-process RED selected

- subagent의 read-only probe를 controlling이 source·tests·manifest와 독립 대조했다. 확인 사실: production daemon은 detached `stdio: "ignore"`라 stderr-only fatal 진단이 관측되지 않는다; status·doctor·in-memory events는 fatal 뒤 접근/보존 표면이 아니다; 설치 production dependency에는 logger/redactor가 없다; request/API throw는 typed `internal_error`로 격리되지만 raw message를 반환한다; accepted socket에는 runtime `error` listener가 없다.
- solution-fit 판정: Node `uncaughtExceptionMonitor`로 default crash/exit를 보존하고, raw error message/stack을 쓰지 않는 allowlist record를 owner-only single latest-fatal JSON artifact에 동기 기록하는 최소 local 후보가 가장 작다. Node diagnostic report는 민감정보 surface와 Node 20 호환 제약, stderr-only는 detached 관측 불가, status/doctor/event는 fatal 후 접근 불가, 새 logger/rotation은 과도해 제외한다. Artifact filename/location/schema는 아직 구현 계약으로 확정하지 않았다.
- 다음 최소 RED 후보: isolated child process가 raw secret sentinel을 포함한 unhandled rejection을 발생시키고, non-zero 종료·종료 후 structured artifact 존재·origin=`unhandledRejection`·sentinel 부재를 함께 검증한다. 예상 write 범위는 `tests/unit/daemon/run.test.ts`와 필요 시 작은 fixture 하나이며 production 구현은 RED 보고 뒤 별도 지시 전 시작하지 않는다. 별도 후속 expected-error RED는 spec §7.2에 binding해 accepted socket synthetic `error` 후 socket cleanup과 daemon 생존을 검증한다.
- Controlling 재검증: `pnpm vitest run tests/unit/daemon/run.test.ts tests/unit/daemon/socket-transport.test.ts` 15/15, `pnpm typecheck`, `git diff --check` 통과. Production/test는 이번 probe에서 변경하지 않았다. Stage 3/4는 미착수다.

### 2026-08-12 19:36 · W5 fatal diagnostics RED next-session handoff

- 사용자 지시에 따라 이후 Act는 다음 세션으로 미룬다. 재개 시 이 entry, `2026-08-12 19:18 · W5 fatal-boundary probe reviewed; child-process RED selected`, `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W5.md`의 Attempt 7 handoff와 Brief revision 3 Fatal boundary/Solution-fit/Verification 계약을 읽는다.
- 첫 단일 작업: subagent에게 isolated child-process fatal diagnostics RED test만 위임한다. Raw secret sentinel을 포함한 unhandled rejection의 non-zero 종료, 종료 후 owner-only single latest-fatal structured artifact 존재/flush, `origin=unhandledRejection`, raw sentinel 부재를 검증한다. Artifact locator/schema는 RED expectation에 필요한 최소 범위만 고정하고 raw message/stack/reason은 기록하지 않는다.
- 중지 경계: RED를 controlling이 source/diff/command로 독립 재현해 사용자에게 보고하기 전 production GREEN, expected-socket RED, status/doctor/event 변경, 새 dependency, Stage 3/4를 시작하지 않는다. 기존 lifecycle code/tests는 W5 candidate working tree로 보존하고 accepted baseline으로 오인하지 않는다.

### 2026-08-12 19:46 · W5 isolated child-process fatal diagnostics RED confirmed

- 사용자 지시에 따라 delegated subagent가 `tests/unit/daemon/run.test.ts`에 isolated child-process fatal diagnostics regression test 1건만 추가했다. Child는 임시 `HOME`과 dev profile에서 실제 daemon entrypoint/socket을 시작한 뒤 raw sentinel을 포함한 unhandled rejection을 발생시킨다.
- 최소 RED expectation은 profile runtime의 단일 `latest-fatal.json`, `origin=unhandledRejection`, artifact 전체의 raw sentinel 부재와 mode `0600`이다. 세부 schema·rotation·dependency는 고정하지 않았다. Production, fixture, docs, dependency와 기존 tests는 변경하지 않았다.
- Controlling이 diff/source를 검토하고 focused test를 독립 재실행했다. Child non-zero 종료는 통과했지만 artifact가 없어 `artifactNames=[]`, `structuredJson=false`, `artifactOrigin=undefined`, `rawSecretAbsent=false`, `artifactMode=null`로 의도한 RED(1 failed, 4 skipped)였다. `pnpm typecheck`와 `git diff --check`는 통과했다.
- 다음 단일 작업 후보는 `src/daemon/run.ts`와 필요 시 직접 연관된 작은 daemon helper 안에서 Node fatal observer, 동기 owner-only latest artifact 기록, allowlist redaction의 최소 GREEN을 구현하는 것이다. Production GREEN, expected-socket RED, Stage 3/4는 사용자에게 이 RED를 보고하기 전 시작하지 않는다.

### 2026-08-12 20:04 · W5 minimal fatal diagnostics candidate GREEN reviewed

- 사용자 지시에 따라 delegated subagent가 Attempt 7 fatal diagnostics 최소 GREEN을 구현했고 controlling이 실제 diff/source와 listener lifecycle을 독립 검토했다. 변경은 `src/daemon/run.ts`뿐이며 기존 RED test, lifecycle candidates, dependency·config·docs·public API는 추가 변경하지 않았다.
- 확인 사실: socket server start 성공 뒤 `uncaughtExceptionMonitor`를 설치하고 fatal 시 socket/profile namespace의 `latest-fatal.json`에 `{ origin }`만 동기 기록한다. Raw error/message/stack/reason은 읽지 않으며 생성·기존 파일 mode를 `0600`으로 맞춘다. 기록 실패는 default crash를 대체하지 않고 normal shutdown에서 listener를 제거한다.
- Controlling 재검증은 focused fatal 1/1, daemon suite 176/176, `pnpm typecheck`, `git diff --check` 모두 통과했다. Unhandled rejection child는 artifact flush·origin·sentinel 부재·0600과 non-zero 종료를 함께 관찰한다. 이 결과는 W5-wide independent result review/accepted promotion 전 candidate GREEN이다.
- 잔여 범위: `uncaughtException` variant는 동일 callback의 Node origin 분기지만 별도 child regression은 없고, artifact write failure fallback은 이번 최소 계약 밖이다. 다음 단일 작업 후보는 spec §7.2에 binding한 accepted-socket synthetic `error` 후 해당 socket cleanup과 daemon 후속 request 생존의 deterministic RED 한 건이다. 그 RED나 Stage 3/4는 사용자 지시 전 시작하지 않는다.

### 2026-08-12 20:07 · W5 expected-socket RED next-session handoff

- 사용자 지시에 따라 이후 Act는 다음 세션으로 미룬다. 재개 시 `scripts/onramp`로 이 controlling log의 active W5를 선택하고, `2026-08-12 20:04 · W5 minimal fatal diagnostics candidate GREEN reviewed`, `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W5.md`의 Attempt 7 RED/GREEN·Attempt 8 handoff·current Result와 Brief revision 3 Accepted-socket/Verification 계약을 읽는다.
- 현재 경계: lifecycle cleanup과 fatal diagnostics code/tests는 W5 candidate working tree이며 W5-wide independent result review와 accepted promotion 전이다. Fatal focused 1/1, daemon 176/176, typecheck와 diff-check가 마지막으로 통과했다. 기존 변경을 보존하고 accepted baseline으로 오인하지 않는다.
- 다음 단일 작업: subagent에게 `tests/unit/daemon/socket-transport.test.ts`의 accepted-socket expected-error deterministic RED test 1건만 위임한다. Server가 수락한 socket에 synthetic `error`를 발생시킨 뒤 해당 socket cleanup과 daemon의 후속 정상 request 생존을 관찰한다. 먼저 injection seam이 실제 Node expected-error boundary를 대표하는지 source/test로 재확인한다.
- 중지 경계: RED를 controlling이 diff/source/focused command로 독립 재현해 보고하기 전 production GREEN, fatal 추가 test/fallback, public API·dependency·compatibility code, Stage 3/4를 시작하지 않는다. RED 성립이 지원되지 않으면 production을 바꾸지 말고 contract/reproduction 공백만 보고한다.

### 2026-08-12 22:14 · W5 accepted-socket expected-error RED independently confirmed

- 사용자 지시로 W5 Attempt 8의 seam 검증과 test-only RED 작성을 delegated subagent에게 위임했고, controlling이 실제 source·diff·focused command로 독립 검토했다.
- 확인 사실: `createDaemonSocketServer()`가 수락한 server-side `net.Socket`에는 `data`와 `close` listener만 있고 `error` listener가 없다. Test는 production connection callback이 받은 동일 socket을 캡처해 synthetic `error`를 emit하므로 EventEmitter/socket error-dispatch boundary를 직접 통과한다. 특정 OS peer action의 errno/event sequence는 재현하지 않는다.
- `tests/unit/daemon/socket-transport.test.ts`에 test 1건만 추가됐다. 독립 focused 실행은 의도한 RED(1 failed, 11 skipped): error가 boundary 밖으로 escape했고 socket `close`가 100ms 내 관찰되지 않았다. Soft assertion 뒤 별도 client `status()`가 성공해 같은 daemon server의 후속 request 생존은 확인됐다.
- 첫 controlling 실행은 sandbox Unix socket `listen EPERM`으로 assertion 전 실패해 증거에서 제외했고, sandbox 밖 동일 command로 위 두 failure를 재현했다. `pnpm typecheck`와 `git diff --check`는 controlling도 독립 통과했다.
- Candidate disposition: spec §7.2에 binding 가능한 deterministic RED seam을 유지한다. Production GREEN, fatal 추가 범위, Stage 3/4는 시작하지 않았다. 최소 GREEN blast-radius 후보는 accepted connection callback 내부의 socket-local expected-error containment와 destroy/Set cleanup이며, 다음 행동은 사용자 지시를 기다린다.

### 2026-08-12 22:25 · W5 accepted-socket expected-error candidate GREEN reviewed

- 사용자 지시로 같은 delegated subagent에게 W5 Attempt 8 최소 production GREEN을 위임했고, controlling이 실제 diff·source·검증을 독립 검토했다.
- 변경은 `src/daemon/socket-transport.ts` accepted connection callback의 socket-local `error` listener 1개다. Listener는 error 값을 읽거나 기록하지 않고 faulted socket만 `destroy()`하며 기존 `close` listener가 `sockets` Set 제거를 계속 소유한다. 기존 RED test, 다른 production/API/docs/dependency/compatibility code는 변경하지 않았다.
- Subagent는 변경 전 RED를 재현하고 변경 후 focused 1/1, socket transport 12/12, daemon 177/177, typecheck와 diff-check 통과를 보고했다. Controlling은 최종 diff와 listener/close/handle-close 경로를 검토하고 sandbox 밖 전체 daemon suite 177/177, `pnpm typecheck`, `git diff --check` 통과를 독립 확인했다.
- Candidate disposition: expected socket error가 connection boundary 밖으로 escape하지 않고 해당 socket close cleanup을 완료하며 같은 server의 후속 정상 request가 유지되는 최소 GREEN을 보존한다. 특정 OS peer action별 errno/event ordering과 socket error diagnostics는 입증·구현 범위가 아니다.
- W5 전체 lifecycle/fatal/expected-error 결과는 아직 candidate이며, package risk gate가 요구하는 W5-wide independent result review와 accepted promotion은 남아 있다. 다음 행동은 그 review를 시작하기 전 사용자 지시를 기다린다.

### 2026-08-12 22:30 · W5-wide independent review handoff

- 재개 기준: controlling log의 current Package Scope·Evidence·Verification/Closeout Contract, W5 Brief revision 3, W5 Task History Attempt 1~8과 current Result, 그리고 이 entry를 읽는다. Working tree의 W5 code/tests는 모두 candidate이며 accepted baseline이 아니다.
- 다음 행동: 사용자 go-ahead 뒤 package risk gate에 맞는 별도 delegated reviewer W/task record를 등록하고, W5-wide read-only result review만 위임한다. Reviewer는 `src/daemon/{run,socket-transport,state,api,server}.ts`와 `tests/unit/daemon/{run,socket-transport,codex-ingress,api}.test.ts`의 실제 diff·호출/cleanup 경로·검증을 대조한다. Production/test/doc 교정이나 accepted promotion은 reviewer 범위가 아니다.
- Review claims: socket-handle close rejection 뒤 state/DB cleanup과 shutdown resolution, queue-expiry·pre-write retry timer cancellation, normal stop/SIGTERM의 Codex runtime disposal await, in-flight target flush-before-dispose ordering, redacted fatal artifact 후 default non-zero termination, accepted socket expected-error containment/close와 후속 request 생존이다. 마지막 controlling 검증은 daemon 177/177, `pnpm typecheck`, `git diff --check` 통과다.
- 명시 residual/excluded: 사용자가 이번 W5 검증에서 제외한 snapshot 이후 normal-stop admission race; 별도 child regression이 없는 `uncaughtException` origin variant; fatal artifact write-failure fallback; 특정 OS peer action별 errno/event ordering; socket error diagnostics. Reviewer는 이를 구현 누락으로 조용히 확대하지 말고 현재 계약·사용자 제외와 W5 completion/closeout blocker 여부를 구분해 판정한다.
- 중지 경계: reviewer candidate를 controlling이 source·diff·verification과 독립 대조하고 disposition하기 전 W5 accepted promotion/완료, plan Stage 2 완료, Stage 3/4, owner 문서 반영을 시작하지 않는다.

### 2026-08-13 12:32 · W6 independent W5 result review started

- 사용자 지시로 package risk gate의 W5-wide independent result review를 시작한다. W6 Compact/delegated task record를 등록하고 W5 candidate는 open 대기로 전환했다.
- Reviewer 범위는 W5 revision 3 Attempts 1–8의 실제 diff·production call/cleanup path·tests·required verification을 read-only로 대조하는 것이다. Production/test/doc/log 수정, accepted promotion, Stage 3/4 착수는 금지한다.
- Reviewer 결과는 candidate이며 controlling이 source·diff·명령 결과를 독립 재검토해 disposition한다. 그 전에는 W5 accepted promotion이나 plan Stage 2 완료를 하지 않는다.

### 2026-08-13 12:39 · W6 review accepted; W5 promotion held for async-stop consumer regression

- W6 independent reviewer 결과를 controlling이 실제 diff와 호출 경로에 대조하고, daemon 177/177·전체 suite 635/635·typecheck·diff-check 통과 및 별도 in-process restart probe를 독립 확인했다. Reviewer 결과를 수용하고 W6 Result Consumption Gate를 닫는다.
- 수용된 판정: W5 핵심 여섯 behavior는 좁힌 claim으로 supported 또는 scoped partial이다. In-flight target flush ordering은 stop snapshot 시 이미 등록된 flush에 한정하고, runtime cleanup은 dispose 성공이 아니라 Promise settlement 대기로 표현한다.
- 승격 blocker: `DaemonServerHandle.stop()`이 async가 됐지만 `createInProcessRuntime().restartDaemon()`은 stop을 await하지 않고 즉시 start해 기존 handle/API를 재사용한다. Controlling probe도 `sameApiAfterRestart: true`를 재현했다. Repo 내부 consumer는 없지만 W5가 만든 production contract regression이며 `src/bin/aiox.ts`는 현재 W5 allowed write-set 밖이다.
- Disposition: W5 accepted promotion과 plan Stage 2 완료를 보류한다. 다음 행동은 사용자에게 (a) W5 write-set을 좁게 확장해 await ordering + regression을 교정하거나 (b) 실제 dead surface로 확인한 뒤 helper 삭제를 별도 승인받는 선택지를 보고하는 것이다. 교정 전 Stage 3/4는 시작하지 않는다.
- Blocker가 아닌 residual: RPC stop 뒤 signal listener 잔존, snapshot 이후 admission race, 별도 uncaughtException child regression 부재, fatal artifact write-failure fallback, OS별 socket ordering, socket diagnostics.

### 2026-08-13 12:51 · W6 blocker classification corrected; dead in-process helper is non-blocking residual

- 사용자의 이의 제기에 따라 reviewer의 blocker 판정을 production topology와 package 전제에 다시 대조했다. 확인 사실: 실제 CLI는 `createClientRuntime()`과 별도 daemon/socket 경로를 사용하고, `createInProcessRuntime()`은 저장소 전체에서 선언 외 consumer가 없다. 프로젝트는 pre-v1이고 외부 consumer가 없다는 전제를 가진다.
- Controlling 정정 판정: `createInProcessRuntime().restartDaemon()`의 stale-handle 재현 자체는 사실이지만 현재 production 사용자 시나리오에 도달하지 않는 dead exported helper의 결함이다. W5의 release-path lifecycle outcome을 무효화하지 않으므로 accepted promotion blocker가 아니다. W6 reviewer의 근거는 수용하되 blocker classification은 기각한다.
- Disposition: W5는 좁힌 claim으로 promotion/Reconcile 가능하다. `createInProcessRuntime()`은 별도 dead-code 삭제 후보이며, W5에 조용히 섞거나 compatibility fix를 추가하지 않는다. 다음 행동은 W5 accepted promotion과 plan Stage 2 완료 여부를 controlling이 Reconcile하는 것이다.

### 2026-08-13 12:54 · W5 accepted; plan Stage 2 completed

- 사용자 지시 1~2에 따라 W5 revision 3 Attempts 1–8을 accepted package state로 승격했다. W6 independent review와 controlling 재검증을 소비했고, reviewer의 async in-process helper blocker classification은 production topology·consumer 부재·pre-v1 전제에 따라 non-blocking dead-code residual로 정정한 상태를 유지한다.
- Accepted outcome: socket-close rejection 뒤 cleanup 지속; queue-expiry/retry timer 취소; stop-entry target-flush snapshot quiesce 후 disconnected Codex runtime disposal settlement 대기; allowlist fatal artifact 후 default non-zero termination; accepted-socket error containment/close와 후속 request 생존. Verification은 daemon 177/177, 전체 635/635, W6 추가 관련 suite 43/43, typecheck와 diff-check 통과다.
- Package Evidence, Cross-Artifact Effects, Decision Candidates와 W5 current Result를 accepted state로 Reconcile했다. W5/W6 registry와 Result Consumption Gate가 닫혀 W5를 completed 처리하고 plan Stage 2를 `[x]`로 전이했다.
- 사용자 범위가 1~2까지이므로 Stage 3 Work Item 등록·활성화·구현은 시작하지 않는다. 다음 단계는 명시적 지시 후 Stage 3 Work Item/Brief를 등록하는 것이다. Stage 5 owner 문서 정합화도 아직 남아 있다.

