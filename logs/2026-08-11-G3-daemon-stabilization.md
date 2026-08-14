---
topic: G3 daemon stabilization
description: daemon lifecycle, socket transport, diagnostics 실패 경계를 release-grade로 고정하는 roadmap G3 게이트: fatal/expected-error 경계, SIGTERM/stop cleanup, redacted fatal diagnosability, socket method dispatch hardening, Claude channel boot-failure diagnosability, Codex·Claude 최소 read-only connection/delivery-guarantee diagnostics
status: decided
---

## Work Items
- [x] W2 Fatal boundary, lifecycle cleanup, structured diagnostics/redaction claim review
- [x] W3 Socket dispatch hardening and bounded input/queue scope review
- [x] W4 Claude boot failure and Codex/Claude read-only diagnostics claim review
- [x] W6 W5-wide independent result review — lifecycle cleanup, fatal diagnostics, accepted-socket expected-error candidate를 source·diff·verification 근거로 독립 재검토한다
- [x] W7 Stage 3 design contract: socket dispatch hardening / bounded input reachability governing-contract 확인, Claude boot-failure diagnosability 구현 범위 확정
- [x] W12 Claude channel boot-failure reporting ordering·lifecycle·typed projection contract 확정
- [x] W13 Claude channel boot-failure authenticated reporting, lifecycle cleanup 및 typed cause projection 구현·검증
- [-] W14 Bounded-input numeric byte limits and transport-specific overflow behavior contract — cancelled: rejected: no AIOX producer, supported user scenario, observed workload, incident, OOM, or governing payload maximum establishes the hypothetical raw-peer accumulation as a G3 defect
- [x] W16 Codex·Claude 최소 read-only diagnostics 표면의 사용자 시나리오, 기존 capability, API 노출 후보와 검증 계약 discovery
- [x] W17 기존 status()/aiox status에 Codex·Claude per-agent 전달 보장·제한 diagnostics를 additive projection으로 TDD 구현·검증
- [x] W18 G3 accepted implementation evidence를 roadmap·architecture·spec owner에 정합화하고 closeout residual을 판정·검증

- [x] W1 G3 gap audit and diagnostics/logging design contract — 현재 4개 gap 영역(fatal/expected-error 경계, Claude channel boot-failure diagnosability, socket method dispatch hardening, Codex/Claude read-only diagnostics)을 code/test 근거로 정밀 확인하고 'bounded input/queue' 범위와 diagnostics 표면 설계 방향을 결정한다
- [x] W5 Stage 2 — fatal/expected-error boundary, redacted fatal diagnosability, SIGTERM/stop cleanup accepted·verified
- [x] W8 Delegated scout — socket method dispatch hardening 및 request-line bounded-input reachability/governing-contract 확인
- [x] W9 Delegated scout — Claude channel boot-failure diagnosability 및 HTTP body bounded-input reachability/governing-contract 확인
- [x] W10 Independent W7 design-result review — W8/W9 evidence, minimal seams, exclusions와 후속 Work Item 분할 검토
- [x] W11 Socket own-method dispatch hardening 구현 및 real-socket unknown/inherited regression
- [x] W15 Connection semantics wiring: Codex runtime-failure callback + Claude confirmed-endpoint-death disconnect

## Required Context

### Return Target

- None: independent package log.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.

## Package Scope

- Revision: 3; History pointer: `2026-08-14 14:36 · W18 revision 2 adds the actual CLI output owner`.
- Primary boundary: roadmap G3 daemon stabilization gate 통과 조건: daemon lifecycle/transport/diagnostics failure-boundary hardening과 owner 문서 정합
- Related artifacts in allowed write-set:
- docs/product/roadmap.md
- docs/architecture/local-runtime-daemon-transport-api.md
- docs/architecture/local-runtime-gaps-and-targets.md
- docs/architecture/local-runtime-claude-adapter.md
- docs/architecture/local-runtime-cli-and-operator-surfaces.md
- docs/specs/aiox-capability-policy.md
- docs/specs/aiox-adapter-model.md
- src/daemon/run.ts
- src/daemon/socket-transport.ts
- src/daemon/state.ts
- src/daemon/api.ts
- src/adapters/claude/channel-server.ts
- src/adapters/shared/dispatch-schema.ts
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
| W18 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W18.md` |
| W17 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W17.md` |
| W16 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W16.md` |
| W15 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W15.md` |
| W14 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W14.md` |
| W13 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W13.md` |
| W12 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W12.md` |
| W11 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W11.md` |
| W10 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W10.md` |
| W9 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W9.md` |
| W8 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W8.md` |
| W7 | Compact | inline | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W7.md` |
| W6 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W6.md` |
| W5 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W5.md` |
| W4 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W4.md` |
| W3 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W3.md` |
| W2 | Compact | delegated | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W2.md` |
| W1 | Compact | inline | `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - W2 accepted the pre-W5 baseline with narrowed wording: accepted sockets lacked an `error` listener; fatal handlers, awaited runtime/timer cleanup and daemon-owned fatal retention were absent. W5/W6 subsequently closed those selected gaps; W2 remains discovery provenance, not current behavior. A specific ECONNRESET→process-exit chain was never claimed. Evidence: W2 Attempt 1, superseded current state in W5/W6.
  - W3 accepted the pre-W11 dispatch baseline and the bounded-input distinction: inherited `constructor`/`toString` dispatch was live; NDJSON request input and Claude `/send` body remain without numeric byte limits, while the actual common pre-write queue is bounded. W11 closed inherited dispatch; W14 rejected speculative raw-peer byte limits. Evidence: W3 Attempt 1, current disposition in W11/W14.
  - W4 accepted the pre-W13/W15/W17 diagnostics baseline with corrections: attach success was not channel readiness, Codex runtime failure and Claude confirmed refusal were not wired to lifecycle state, and status lacked a purpose-built guarantee projection. W13/W15/W17 subsequently closed the selected boot-cause, disconnect-wiring and read-only projection gaps. `completed` still has no automatic producer and remains reserved for future uplift. Evidence: W4 Attempt 1, current state in W13/W15/W17.
  - W5 accepted after W6 independent result review and controlling revalidation:
    - Shutdown isolates `socketHandle.close()` rejection, then awaits state/server cleanup before DB close and process shutdown resolution.
    - Stop cancels daemon-owned queue-expiry and pre-write retry timers, waits for the target-flush snapshot present at stop entry, then awaits settlement of disconnected Codex runtimes before resolving. Snapshot 이후 새 admission은 이번 W5에서 제외됐다.
    - A fatal unhandled rejection writes owner-only `latest-fatal.json` containing only the allowlisted Node origin, excludes the raw secret sentinel, and preserves default non-zero termination.
    - An accepted-socket expected error is contained to and destroys that socket; close cleanup and a later request on the same server survive.
    - Accepted verification: daemon unit suite 177/177, full suite 635/635, `pnpm typecheck`, `git diff --check`; W6 additionally passed the relevant CLI/integration blast-radius suite 43/43. Evidence: W5 revision 3 Attempts 1–8 and W6 revision 1 Attempt 1.
  - W7 Stage 3 design discovery accepted after W8/W9 delegated scouts, W10 independent review, and controlling source/test revalidation:
    - Socket dispatch accepts any string method and invokes prototype-resolved functions; an own-property guard with the existing `unknown_method` envelope is the narrow hardening seam.
    - Claude attach/token success precedes channel readiness; explicit-port collision is typed in the channel child before daemon registration, while runtime-absent dispatch later exposes only generic `target_runtime_unavailable`.
    - Socket unfinished request lines retain a connection-local string until newline, and Claude `/send` retains request chunks until EOF. This is a code-mechanism fact only: no AIOX producer or supported user scenario holds either framing open indefinitely, and no incident/OOM/governing payload maximum was established. It does not justify a G3 ingress-bound implementation.
    - Verification: socket transport 12/12, Claude channel+CLI invocation+daemon API 124/124, reviewer combined focused baseline 136/136. Evidence: W7 revision 1 Attempt 1, W8/W9 revision 1 Attempt 1, W10 revision 1 Attempt 1.
  - W11 socket dispatch hardening accepted after delegated TDD execution and controlling result review:
    - Dispatch now resolves only own `DaemonApi` properties through `Object.hasOwn`; missing and inherited `constructor`/`toString` names reuse the existing typed `unknown_method` envelope, while a later valid `status` request on the same server succeeds.
    - No new catch/fallback/compatibility path, allowlist, error type, public API or structural refactor was added.
    - Accepted verification: socket transport 13/13, daemon unit 178/178, full suite 636/636, `pnpm typecheck`, `git diff --check`. Evidence: W11 revision 1 Attempt 1 and controlling review entry in the Stage 3 block.
  - W12 Claude boot-failure contract accepted after canonical-path reachability evidence, delegated projection review and controlling revalidation:
    - Claude Code 2.1.229에서 explicit-port collision은 canonical launcher → real Claude CLI → configured MCP child 경로로 도달하며 child-local `claude_channel_port_in_use`가 outer `CONNECTION_CLOSED`로 축약된다. Vendor env inheritance는 as-tested evidence이며 문서화된 보장은 아니다.
    - Reporting은 `claude_channel_port_in_use` 하나만 allowlist하고, session token 인증 뒤 runtime 부재일 때만 record한다. Existing runtime이 있으면 late/replacement report를 `recorded:false`로 무시하며 generation protocol을 추가하지 않는다.
    - Projection B를 승인했다: normalized `reason: target_runtime_unavailable`을 유지하고 optional single-literal `cause: claude_channel_port_in_use`를 추가한다. 이는 `docs/decisions/pair-slot-generalization.md`의 vendor-neutral deferred category 계약을 보존한다.
    - Evidence: W12 revision 2 Attempts 1–3 및 controlling entries `2026-08-13 15:59`, `16:37`, `16:57`.
  - W13 Claude boot-failure reporting implementation accepted after delegated TDD, independent result review, corrective RED→GREEN and controlling revalidation:
    - Own daemon report API authenticates the current Claude session token, allowlists only `claude_channel_port_in_use`, records only without a current runtime, and returns `recorded:false` for late/replacement reports when a runtime exists.
    - New attach, successful registration, rollback, disconnect, detach/TUI exit and non-daemon-only stop clear the in-memory cause; `daemonOnly:true` preserves it. Dispatch retains normalized `reason: target_runtime_unavailable` and adds only optional `cause: claude_channel_port_in_use` through the shared Claude/Codex MCP schema.
    - Real occupied-port reporting is fire-and-forget with rejection consumption, so a failed or never-settling daemon report cannot delay or replace the original typed port-in-use fatal. Verification: focused 166/166, daemon+CLI 200/200, full 643/643, typecheck, diff-check and registry integrity. Evidence: W13 revision 1 Attempts 1–2 and corrective independent review.
  - W15 connection-semantics wiring accepted after delegated TDD and controlling source/test review:
    - Codex production attach now passes the existing runtime-failure callback into the managed runtime, so child-exit/WebSocket-close detection reaches the existing identity-safe daemon disconnect path.
    - Claude own dispatch treats a confirmed refusal from the exact runtime instance used for that dispatch as endpoint death and reuses the existing disconnect effect; a same-name replacement registered while the request is in flight is preserved. Manual retransmit remains attempt-local and does not mutate global connection state.
    - Accepted verification after the unrelated test-environment isolation correction: full suite 646/646, typecheck and diff-check. Evidence: W15 revision 1 Attempt 1 and controlling entries `2026-08-14 13:26`, `13:33`.
  - W16 read-only diagnostics discovery accepted after delegated source tracing and controlling independent review:
    - The G3 facts map to existing sources: `agents[].status` owns the lifecycle connection label; adapter acceptance is Codex matching `turn/start` success or Claude HTTP 2xx, not target receipt/read/work completion; neither runtime automatically produces ack/`completed`; automatic retry is bounded to conclusively pre-write failure; manual recovery is limited to `unconfirmed` with explicit duplicate-risk confirmation, with Codex late-resolution and Claude immediate-only differences.
    - Current `status()`/`aiox status` is the existing single-snapshot operator read path but exposes only agent kind/status and aggregate delivery counts. An additive per-agent guarantee/limitation projection is the smallest fit; a new RPC would duplicate connection data or require composing two snapshots and is not justified by a distinct lifecycle/auth/refresh need.
    - This accepts the discovery evidence and recommendation only. Exact DTO fields and CLI layout remain a public-contract choice before implementation. Controlling independently confirmed focused API/socket/CLI baseline 91/91 outside the sandbox after the sandbox denied Unix-socket listen with `EPERM`; diff-check and registry integrity passed. Evidence: W16 revision 1 Attempt 1.
    - Review clarification (2026-08-14): the roadmap's Phase 2 deferral of a generic capability/tier-evaluator/diagnostics model does not itself prohibit one narrow second read-only RPC. The accepted reason to prefer existing `status()` is fit: the five facts share the same operator refresh/auth/lifecycle, a second method would duplicate connection data or require combining different-time snapshots, and no distinct lifecycle need was established.
  - W17 status-only diagnostics implementation accepted after delegated TDD, independent contract/result review and corrective cycle:
    - `StatusResponse.agents` alone now uses `StatusAgentDto`; shared attach/stop `AgentDto`, daemon state/store, socket mechanism and delivery policy are unchanged. Each row projects adapter acceptance evidence, unavailable target receipt evidence, no automatic target ack/completion, conclusive-pre-write-only retry, and the complete manual retransmit boundary.
    - Manual recovery explicitly exposes `unconfirmed` eligibility, duplicate-risk confirmation, kind-specific ready runtime/channel, direct-never-queued dispatch, and Codex correlated-response versus Claude no-late transport outcome resolution. `aiox status` renders the fixed facts in `DELIVERY GUARANTEES` with explicit `AUTO TARGET ACK`/`AUTO COMPLETION` headers.
    - Accepted verification: post-correction focused 118/118, typecheck, diff-check, registry integrity and controlling/independent full runs 56 files / 647 tests. Evidence: W17 revision 3 Attempts 1–2 and controlling entry `2026-08-14 14:22`.
  - W18 owner reconciliation accepted after delegated document-identity review and independent result review:
    - Seven durable owners now reflect the accepted G3 lifecycle, fatal, socket, Claude, runtime-disconnect, status/CLI and doctor evidence; closed pre-G3 gaps were removed and Phase 1/2 deferrals preserved. The actual CLI/operator owner includes `DELIVERY GUARANTEES` and delegates semantics to the daemon/API owner.
    - Validation passed for markdown inline code, wikilink/path existence, stale-claim search, diff-check and W1–W18 registry integrity. The independent reviewer returned promotion PASS. Evidence: W18 revision 2 Attempt 1 and controlling closeout entry.
  - Design contract history and current amendment (2026-08-12): the user did approve the four implementation directions recorded in `2026-08-12 14:18 · Design contract accepted; W1 closed`; that approval is not treated as false or erased. Subsequent design/YAGNI review amended only mechanism-level commitments as recorded in `2026-08-12 15:08 · W5 contract amendment: approved history preserved, mechanisms reopened`.
    1. Stage 3 bounded input: the previously approved socket request-line + Claude `/send` body direction must be revalidated against a supported reachable failure or governing contract before implementation; the existing common delivery queue remains regression-only. The socket-client response buffer is removed from mutable G3 scope because no independently supported failure was established.
    2. W5 fatal diagnostics: required outcome is redacted, observable fatal diagnostics before termination. W5 must compare existing adapter structured stderr, daemon status/doctor/event surfaces, Node built-ins, installed packages, and the smallest local retention before selecting a mechanism; JSONL/profile namespace/rotation/custom sink are not precommitted. Stage 4 still owns any status/doctor read-only projection.
    3. Stage 4 connection semantics remains as approved: confirmed endpoint death may drive lifecycle `disconnected`; ambiguous post-write failure remains separate health/last-failure information. Codex production callback wiring and Claude semantics are handled there, not in W5.
    4. W5 lifecycle: required outcome is completion of daemon-owned runtime/timer/resource cleanup before shutdown resolves or the process exits. W5 must compare narrow shutdown orchestration using the current `Map` and Node primitives such as `Promise.allSettled` against broad state/API/server async-contract or registry redesign; iterable registry and a full awaitable-API conversion are not precommitted.
- Evidence gaps:
  - G3 `bounded input/queue` is satisfied by the existing common delivery queue contract and regression evidence (capacity 32, TTL 5 minutes, retries 250 ms/1 s/4 s). Socket request-line and Claude HTTP body limits are not G3 work absent an actual supported producer/harm or an explicitly expanded hostile-local-peer threat model.
  - One executor full run passed all 647 assertions but reported 11 post-test closed-DB timer rejections. W18 confirmed the unit teardown closes DB without `state.stop()`, while production awaits stop/timer cleanup before DB close; unchanged rerun, controlling, reviewer and focused rechecks were clean. Classified as nonblocking test-lifecycle hygiene, not a G3 production completion violation.
  - W5 residuals that do not block Stage 2 acceptance: snapshot 이후 normal-stop admission race; 별도 child regression이 없는 `uncaughtException` variant; fatal artifact write-failure fallback; 특정 OS peer action별 errno/event ordering; socket error diagnostics; normal RPC stop 뒤 process signal listener 잔존; unused `createInProcessRuntime()` dead-code cleanup candidate.

## Cross-Artifact Effects

- W5 changed the daemon stop contract from synchronous to awaitable across state → API → server → process shutdown, with regression coverage in daemon API, ingress and run-level tests.
- W5 added a process-lifetime fatal observer and owner-only profile artifact, plus accepted-socket local error containment; owner documentation remains reserved for plan Stage 5 closeout rather than being partially updated here.
- `createInProcessRuntime()` is an unused exported helper whose restart path does not await the new stop contract. It is not on the production CLI topology and has no in-repo consumer, so it is a separate dead-code deletion candidate rather than a W5/Stage 2 blocker.
- W7 made no production/test/doc change. A future Claude typed-cause field could affect `src/adapters/shared/dispatch-schema.ts` and its MCP consumers; this is recorded as an out-of-scope candidate effect, not an authorized write-set expansion.
- W11 changed only the socket transport dispatch lookup and its real-socket regression. The existing request/error envelope and public `DaemonApi` surface are unchanged, so no owner-document update is required before the Stage 5 package-wide evidence reconciliation.
- W12 B approval expands the package write-set to `src/adapters/shared/dispatch-schema.ts` and makes optional typed `cause` observable through both Claude and Codex MCP output consumers. The normalized deferred `reason` category remains unchanged; both consumers require regression coverage in W13.
- W13 realizes that write-set expansion: the optional single-literal cause is now observable through both MCP schemas, while daemon state retains only agent-name keyed allowlisted cause and the Claude child reports it without blocking its original boot fatal. No socket transport production change, generic cause hierarchy, persistence, status/event surface or generation protocol was added.
- W15 connects existing Codex runtime-failure and Claude confirmed-endpoint-death signals to stored agent lifecycle state without a new event type, delivery-state policy or generic health model. W18 reconciled the former architecture gap wording.
- W16 discovery changed no production, test or owner artifact. W17 realized its selected status-only projection and W18 reconciled the durable owners.
- W17 realizes the W16 recommendation in `src/daemon/api.ts` and `src/cli/format.ts`; status exact-shape consumers in API/socket/server/bin tests and formatter semantics were updated. Shared agent responses, state/store, transport implementation, adapters and delivery policy were not changed.
- W18 changed only seven durable owner documents. It removed closed gap claims, updated current architecture/spec/product evidence and kept broader rolling diagnostics, stale policy, trust-boundary hardening, generic evaluator/events and durability deferred.

## Decision Candidates

- W5 decisions accepted:
  - Fatal diagnostics use Node `uncaughtExceptionMonitor` plus the smallest synchronous allowlist artifact in the existing profile/socket namespace; no logger dependency, rotation, status projection or custom sink was added.
  - Shutdown uses existing timer/flush maps and the narrow async state → API → server → run chain; no iterable registry or compatibility layer was added.
  - Accepted-socket expected errors use one socket-local listener and existing close cleanup; no server-wide recovery or socket diagnostics surface was added.
- Stage 3 candidate directions accepted for implementation contract planning:
  - Socket method dispatch: W11 accepted `Object.hasOwn` own-property guard, existing typed `unknown_method`, and real-socket inherited/unknown regression; no additional dispatch mechanism remains.
  - Claude boot failure: first fix allowlist/session-token/no-runtime ordering/clear lifecycle/typed projection contract, then implement child→daemon reporting without status/doctor/event/disconnect or delivery-FSM changes.
  - Bounded input/queue: retain and reverify the existing common delivery queue bounds. Do not invent socket request-line or Claude HTTP body limits from hypothetical raw local peers or unobserved oversized payloads.
- W12 Claude boot-failure reporting contract accepted:
  - Add one own authenticated daemon report method and daemon-owned in-memory record for allowlisted `claude_channel_port_in_use`; never overload successful channel registration with a failure payload.
  - Record only when the session token is valid and no Claude runtime exists. Existing-runtime late/replacement reports return `recorded:false` and cannot remove or replace the current runtime.
  - Clear the record on new attach token issuance, successful registration, rollback, disconnect, detach/TUI-exit and non-daemon-only stop; `daemonOnly:true` preserves it consistently with the current token/runtime lifecycle.
  - Preserve `reason: target_runtime_unavailable` and expose only optional `cause: claude_channel_port_in_use`. Do not introduce generic cause hierarchy, additional literals, generation, persistence, status/doctor/event or delivery-FSM changes.
- Stage 4 diagnostics contract is accepted and implemented by W17: one status-only per-agent `deliveryDiagnostics` projection plus CLI `DELIVERY GUARANTEES`, preserving one operator snapshot and unrelated `AgentDto` responses. No new RPC/dependency, generic capability/tier-evaluator model, delivery-state policy, compatibility layer or generation protocol was added.

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

## 2026-08-13 · Stage 3 kickoff; W7 design-contract discovery opened

- plan `plans/g3-daemon-stabilization.md`의 Stage 3(Socket method dispatch hardening 및 Claude channel boot-failure diagnosability 구현과 evidence)를 `[>]`로 활성화하고 이 controlling log를 가리키게 했다. 사용자가 Stage 2와 동일하게 별도 로그 파일을 만들지 않고 이 controlling log에 새 Work Item으로 이어 쓰는 기존 plan Notes 기본 방향을 재확인했다.
- W7(Compact/inline)을 등록해 Stage 3 design-contract read-only discovery를 시작한다. Scope는 socket dispatch hardening/Claude boot-failure diagnosability 구현 방향과 2026-08-12 15:08 amendment가 요구한 bounded-input(socket request-line + Claude HTTP body) reachability/governing-contract 재확인이다. W3/W4가 이미 확인한 사실은 재도출하지 않되, Stage 2 W5가 관련 파일을 광범위하게 바꿨으므로 현재 source 상태로 재검증한다. Task Brief는 `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W7.md`에 있다.
- Package Scope의 기존 allowed write-set(`src/daemon/{run,socket-transport,state,api}.ts`, `src/adapters/claude/channel-server.ts` 등)과 Verification/Closeout Contract는 package bootstrap(2026-08-11) 때 이미 Stage 3 항목을 포함해 만들어졌으므로 이번 W7에서 재조정하지 않는다.
- Act(실제 조사)는 아직 시작하지 않았다. 이 package의 기존 관행대로 Task Brief 등록까지만 이번 세션에서 진행하고, 실제 read-only discovery 실행은 사용자 go-ahead를 기다린다.

### 2026-08-13 · W7 Stage 3 design discovery accepted after delegated scouts and independent review

- 사용자 지시로 W7을 W8(socket)·W9(Claude) delegated read-only scout로 나눠 실행하고, controlling이 각 source/owner/test 근거를 독립 대조했다. Focused baseline은 socket 12/12, Claude 관련 124/124 통과했다.
- W10 independent review는 dispatch/boot reason-loss와 두 retained-memory 경로를 지지했지만, OOM 확대, 숫자 limit 부재, reusable session token의 replacement-child race, typed cause의 shared dispatch schema blast radius를 지적해 partial accept를 반환했다. Controlling이 decision/source에서 이를 재확인하고 W7/W9 Result를 교정했다. Reviewer combined baseline은 136/136 통과했다.
- Accepted design outcome: socket own-method guard는 구현 가능하다. Claude boot reporting은 allowlist·record-only/no-runtime ordering·clear owner·typed projection을 먼저 확정해야 한다. Bounded input은 숫자와 overflow behavior 결정 뒤 socket/HTTP 구현을 분리한다. Common queue, client response buffer, Stage 4 diagnostics, auth/disconnect policy는 제외 유지한다.
- W7/W8/W9/W10 candidate disposition, Package Evidence/Cross-Artifact Effects/Decision Candidates와 registry를 Reconcile했다. Production/test/doc 변경은 없으며 Stage 3 구현은 시작하지 않았다.
- 다음 할 일은 의존성이 없는 socket dispatch 구현 W11이며 Task Brief만 등록하고 Act/code 수정은 사용자 다음 지시를 기다린다. 이후 후보는 Claude boot-report 계약 확정→구현, bounded-input 숫자/행동 결정→transport별 구현 순서다.

### 2026-08-13 14:30 · W11 accepted after controlling result review; W12 contract work registered

- W11 revision 1 Attempt 1 candidate를 실제 diff/source와 owner 계약에 대조했다. 변경은 `Object.hasOwn(api, request.method)` guard 한 줄과 real-socket regression 한 건뿐이며, 기존 `unknown_method` envelope를 재사용한다. 새 catch/fallback/compatibility/allowlist/error type/API/refactor는 없으므로 전체 수용한다.
- Controlling 재검증은 socket transport 13/13, daemon unit 178/178, 전체 suite 636/636, `pnpm typecheck`, `git diff --check` 통과다. Registry Integrity와 Result Consumption Gate를 대조했고 W11 artifact와 accepted package surfaces가 일치한다.
- W11을 completed로 전이하고 W12를 다음 pointer로 등록한다. W12는 Claude boot-failure reporting의 allowlist·no-runtime ordering·replacement-child boundary·clear lifecycle·typed projection 계약만 read-only로 확정하며 Act는 사용자 다음 지시 전 시작하지 않는다.

### 2026-08-13 14:46 · W12 read-only contract discovery delegated

- 사용자 지시로 W12 execution mode를 `inline`에서 `delegated`로 전환했다. Objective, scope/excluded, allowed write-set과 completion contract는 revision 1 그대로 유지하며, subagent는 source·owner·tests를 읽고 candidate contract와 근거만 반환한다.
- Controlling은 반환 결과를 실제 source·owner 계약·focused baseline과 독립 대조한 뒤 disposition한다. 그 전에는 production/test/doc 변경, shared dispatch schema나 public API write-set 확장, 다음 구현 W 등록을 시작하지 않는다.

### 2026-08-13 14:54 · W12 delegated result independently reviewed; product choice pending

- Subagent의 W12 revision 1 Attempt 1 read-only candidate를 controlling이 실제 source·owner·tests에 독립 대조했다. 확인 사실: explicit-port `EADDRINUSE`는 child에서 `claude_channel_port_in_use`로 이미 typing되지만 listen 실패가 daemon registration보다 앞서 reason이 child-local로 남는다. Daemon은 session-scoped reusable token과 current runtime만 소유하며 runtime 부재 dispatch를 `target_runtime_unavailable`로 축약한다. Shared dispatch output schema의 deferred `reason`은 이미 string이므로 새 field 없이 literal을 재사용할 수 있다.
- Candidate 판단을 지지한다: allowlist는 `claude_channel_port_in_use` 하나, token 검증 뒤 no-runtime일 때만 record, existing runtime이 있으면 late/replacement report를 `recorded:false`로 무시, registration·새 attach·rollback·disconnect·detach/TUI-exit·non-daemon-only stop에서 clear한다. 동일 token만으로 child generation을 식별할 수 없어 existing runtime을 failure report로 지우는 것은 안전하지 않으며, replacement-child failure까지 진단하려면 현재 제외된 generation protocol이 필요하다.
- Controlling 교정: `DispatchSummary.deferred[].reason` 재사용은 shared Zod schema/write-set 확장은 아니지만 TypeScript reason union과 외부 관찰 dispatch behavior를 넓힌다. 또한 child→daemon 보고에는 새 own `DaemonApi`/`DaemonState` method가 필요하다. W12 Brief가 public API 확장을 escalation하도록 명시했으므로 아직 accepted contract나 구현 승인으로 승격하지 않는다.
- 독립 검증: Claude channel + CLI invocation + daemon API focused baseline 124/124, package registry integrity, `git diff --check` 통과. W12는 active 상태를 유지하고, 다음 행동은 사용자에게 direct reason 재사용안과 category+cause 확장안의 관찰 결과·tradeoff를 제시해 선택을 받는 것이다. 선택 전 production/test/doc 변경이나 다음 implementation W 등록은 하지 않는다.

### 2026-08-13 15:49 · W12 reachability premise corrected before projection choice

- 사용자와 실행 topology를 다시 구분해 확인한 결과, 현재 증거는 `startClaudeChannelHttpIngress({ port })` 저수준 test에서 explicit-port `EADDRINUSE`가 재현된다는 것뿐이다. 기본 `aiox claude` launcher는 port를 고정하지 않고, 생성하는 MCP config도 `AIOX_CLAUDE_CHANNEL_PORT` placeholder를 포함하지 않는다. `aiox claude` → 실제 Claude CLI → `aiox mcp-claude` 전체 경로에서 임의의 parent env가 MCP process까지 전달되어 이 failure가 발생한다는 end-to-end evidence는 없다.
- 정정 판정: owner 문서가 explicit env collision을 예시로 든 사실과 channel-server seam의 도달 가능성을 실제 canonical user path의 supported/reachable failure 증거로 동일시한 W9/W12 전제는 과도했다. 따라서 14:54의 projection product-choice 대기를 중단하며, direct reason/cause 선택과 report API implementation은 보류한다.
- W12 Brief를 revision 2로 갱신한다. 다음 단일 작업은 production/test/doc 변경 없이 실제 `aiox claude` 경로의 env propagation과 port collision reachability를 가장 작은 실행 probe 또는 Claude-owned authoritative behavior로 확인하는 것이다. 도달이 확인되면 W12 ordering/lifecycle/projection 계약으로 돌아가고, 확인되지 않거나 canonical path에서 차단되면 port-collision reporting 구현을 G3 근거로 승격하지 않고 owner gap/roadmap claim의 정정 후보를 보고한다.

### 2026-08-13 15:55 · W12 revision 2 canonical-path reachability probe delegated

- 사용자 지시로 기존 W12 delegated subagent에게 revision 2 Attempt 2를 재위임한다. 범위는 `AIOX_CLAUDE_CHANNEL_PORT`가 canonical `aiox claude` launcher와 실제 Claude CLI의 MCP spawn을 거쳐 `aiox mcp-claude` environment에 도달하는지, 도달한다면 실제 occupied-port `EADDRINUSE`가 재현되는지를 source·authoritative behavior·가장 작은 안전한 실행 probe로 확인하는 것이다.
- Production/test/doc 및 controlling log 수정, setup/config 변경, reporting API/projection 구현은 금지한다. 실제 Claude 실행은 격리된 비대화형·비변경 probe가 가능할 때만 수행하고, 계정·설정·지속 세션 영향이나 불명확한 외부 동작이 필요하면 실행하지 않고 evidence gap/blocker로 반환한다. Controlling은 반환 evidence를 독립 대조하기 전 reachability나 구현 필요성을 수용하지 않는다.

### 2026-08-13 15:59 · W12 canonical-path port-collision reachability accepted with probe side effect

- W12 revision 2 Attempt 2 candidate를 controlling이 source, task trace와 `/tmp/aiox-w12-occupied-debug.log`에 독립 대조했다. 현재 Claude Code 2.1.229에서 reachability를 수용한다: repo launcher는 parent env 전체를 실제 Claude CLI에 전달하고, real Claude MCP health-check는 config에 선언되지 않은 `AIOX_CLAUDE_CHANNEL_PORT`도 configured `aiox mcp-claude` process에 전달했다. 점유된 `127.0.0.1:58328`에서 child stderr가 local sole producer와 일치하는 port-in-use message를 출력하고 Claude outer surface는 `CONNECTION_CLOSED`로 축약했다.
- 확인 사실/추론 경계: full interactive daemon attach는 실행하지 않았다. 그러나 launcher source/test의 동일 spawn-env 경계와 실제 Claude CLI→configured MCP child 실행을 합성해 canonical reachability를 닫는다. Outer output은 typed field를 직렬화하지 않았지만 exact message의 local producer와 real-listen test가 `reason: claude_channel_port_in_use`를 고정하므로 internal typed error 도달은 source-bound inference로 수용한다. 이 vendor env inheritance는 문서화된 보장이 아니라 tested-version behavior다.
- Probe 부작용: subagent가 read-only로 예상한 `claude mcp get`은 signed-in account의 MCP 목록을 조회하고 `~/.claude.json`을 temp-file rename으로 다시 썼다. 사전 snapshot이 없어 semantic delta나 cache/telemetry 부재는 확인할 수 없다. Controlling은 추가 Claude 실행이나 되돌리기를 하지 않았고, read-only 확인에서 AIOX MCP registration의 command/args/세 identity env entry가 유지됨을 확인했다. 이 외부 write는 향후 동일 probe를 승인 없는 안전한 read-only command로 취급할 수 없다는 residual로 남긴다.
- Disposition: W12 reachability gate는 통과했고 Attempt 1 ordering/lifecycle 후보는 다시 contract-choice 대상으로 유효하다. W12는 아직 active이며 reporting API/projection 구현은 승인되지 않았다. 다음 행동은 사용자에게 새 daemon report method를 포함한 direct `deferred.reason` 안과 broader `cause` DTO 안의 선택을 다시 요청하는 것이다.

### 2026-08-13 16:19 · W12 next-session handoff

- 사용자 지시로 이후 작업은 다음 세션에서 재개한다. `scripts/onramp`로 이 controlling log의 active W12를 선택한 뒤 이 entry, `2026-08-13 15:59 · W12 canonical-path port-collision reachability accepted with probe side effect`, W12 task record revision 2 Attempt 1/2와 current Result를 읽는다.
- 현재 accepted/candidate 경계: Claude Code 2.1.229 canonical-path port-collision reachability는 accepted evidence다. Allowlist=`claude_channel_port_in_use`, authenticated no-runtime-only record, existing-runtime late report 무시, registration/session cleanup clear는 controlling-supported candidate지만 W12 accepted contract가 아니다. Production/test/doc/reporting API 변경과 다음 implementation W 등록은 아직 없다.
- 다음 단일 작업: 사용자에게 projection을 결정받는다. 권고 A는 기존 `DispatchSummary.deferred[].reason`에 `claude_channel_port_in_use`를 직접 사용해 TypeScript union/observable reason만 넓히고 shared schema field를 추가하지 않는 안이다. 대안 B는 `target_runtime_unavailable`을 유지하고 새 `cause` field를 추가해 shared schema와 두 MCP consumer write-set을 넓히는 안이다. 어느 안도 child→daemon authenticated report를 위한 새 own `DaemonApi`/`DaemonState` method는 필요하다.
- 선택 후에만 W12 candidate를 contract review/disposition하고 Result Consumption Gate를 닫는다. 수용 시 W12를 완료하고 별도 implementation W/Brief를 등록하되, 실제 RED/GREEN Act는 그 다음 사용자 지시에서 시작한다. 동일 Claude reachability probe는 signed-in account fetch와 `~/.claude.json` rewrite 부작용이 있었으므로 재실행하지 않는다.

### 2026-08-13 16:37 · W12 projection independent review completed; recommendation corrected to B

- 사용자 지시로 W12 projection A/B와 공통 ordering·lifecycle contract를 subagent에게 read-only 독립 재검토시켰다. Production/test/doc은 수정하지 않았고 Claude 실행·probe·network는 재실행하지 않았다.
- Reviewer의 핵심 반증을 controlling이 `docs/decisions/pair-slot-generalization.md:25,59-63`, `src/daemon/state.ts:407-418`, `src/adapters/contract.ts:35-55`와 직접 대조해 수용한다. `deferred[].reason`은 임의 오류 문자열이 아니라 vendor-neutral normalized category 3종이다. 따라서 A(`reason: claude_channel_port_in_use`)는 코드상 작아도 기존 durable decision의 의미 계약을 조용히 깨므로 권고에서 제외한다.
- 권고를 B로 교정한다: `reason: target_runtime_unavailable`을 유지하고 optional single-literal `cause: claude_channel_port_in_use`를 추가한다. 이 안은 shared `DispatchSummary`/Zod output과 Claude·Codex MCP consumer regression이 필요하지만 category/cause를 분리해 기존 decision과 G3 diagnosability를 함께 보존한다. Generic cause hierarchy나 다른 cause literal은 이번 계약에 포함하지 않는다.
- 공통 후보는 controlling source 재검토에서도 유지한다: allowlist는 `claude_channel_port_in_use` 하나, token 검증 뒤 runtime이 없을 때만 record, runtime이 있으면 late/replacement report를 `recorded:false`로 무시, 새 attach·successful registration·rollback·disconnect·detach/TUI-exit·non-daemon-only stop에서 clear한다. 동일 session token은 child generation을 식별하지 않으므로 generation protocol 없이 existing runtime을 지우거나 교체하지 않는다.
- 구현에는 별도 own `DaemonApi`/`DaemonState` report method, daemon-owned in-memory record, channel-server best-effort report와 B projection이 필요하다. 최소 production 후보는 `src/daemon/state.ts`, `src/daemon/api.ts`, `src/adapters/claude/channel-server.ts`, `src/adapters/shared/dispatch-schema.ts`; socket transport는 generic proxy와 W11 own-method dispatch를 재사용하므로 현재 예상 변경 대상이 아니다.
- 현재 disposition: B는 controlling-supported recommendation이며 아직 사용자 선택·accepted contract·구현 승인이 아니다. W12는 active로 유지한다. 다음 행동은 사용자에게 B 선택 승인을 받은 뒤 W12 Result Consumption Gate를 닫고 별도 implementation W/Brief를 등록하는 것이다. 실제 RED/GREEN 구현은 그 다음 명시적 지시 전 시작하지 않는다.

### 2026-08-13 16:57 · W12 B contract accepted; W13 implementation handoff registered

- 사용자 승인: W12 projection B를 확정한다. Normalized `reason: target_runtime_unavailable`을 유지하고 optional single-literal `cause: claude_channel_port_in_use`를 추가한다. Allowlist·authenticated no-runtime-only record·existing-runtime late report `recorded:false`·session cleanup clear·새 own daemon report method도 W12 accepted contract로 함께 승격한다.
- Controlling은 W12 revision 2 Attempts 1–3, canonical reachability evidence와 independent projection review를 소비하고 Package Scope/Evidence/Cross-Artifact Effects/Decision Candidates를 revision 2로 Reconcile했다. Shared dispatch schema와 Claude·Codex MCP output regression write-set 확장은 B 승인에 한정하며 generic cause model, generation, status/doctor/event, adapter contract/router, persistence는 계속 제외한다.
- W12 Registry Integrity와 Result Consumption Gate를 닫아 completed로 전이한다. W13 Compact/delegated implementation task와 revision 1 Brief를 등록하고 next pointer로 활성화한다. 실제 RED/GREEN Act, production/test/doc 변경과 Claude probe는 이번 세션에서 시작하지 않는다.
- 다음 세션 재개: `scripts/onramp`로 active W13을 선택한 뒤 이 entry, W13 Task Brief revision 1, W12의 `2026-08-13 16:37` entry와 final disposition을 읽는다. 첫 단일 행동은 delegated executor에게 W13 계약의 최소 RED tests를 먼저 작성·실행하게 하고, controlling이 diff/source/RED command를 독립 재현해 보고하는 것이다. RED 검토 전 GREEN과 범위 확장을 시작하지 않는다.

### 2026-08-13 17:09 · W13 first API-level RED accepted; minimum GREEN pending

- 사용자 지시에 따라 W13 revision 1의 첫 TDD RED slice를 delegated executor에게 위임했다. Scope는 valid current Claude session token + no runtime에서 allowlisted `claude_channel_port_in_use` report가 `recorded:true`를 반환하고, 후속 delivery dispatch가 normalized `reason: target_runtime_unavailable`과 optional `cause: claude_channel_port_in_use`를 함께 반환하는 API-level behavior 하나다.
- `tests/unit/daemon/api.test.ts`에 test 1개(56 lines)만 추가됐다. Production/source/doc/plan, GREEN, 구조 변경, vendor/Claude 실행은 없으며 existing accepted W11 및 log/plan 변경을 보존했다.
- Executor와 controlling이 동일 focused command를 각각 실행해 `client.reportClaudeChannelBootFailure is not a function`으로 1 failed / 49 skipped를 재현했다. Controlling은 실제 diff와 attach token → candidate own daemon API → daemon-owned record → Claude target dispatch projection 경로를 대조했고, 이 실패가 현재 own report method 부재를 직접 드러내며 W12 accepted category/cause 계약을 벗어나지 않는 최소 RED라고 판정했다. 양쪽 `pnpm typecheck`와 `git diff --check`도 통과했다.
- W13은 active/candidate RED 상태를 유지한다. 다음 단일 행동은 사용자 go-ahead 후 accepted API test를 통과시키는 최소 GREEN을 구현하는 것이다: one-literal request/result type과 own `DaemonState`/`DaemonApi` method, in-memory cause record, Claude-target unavailable dispatch projection만 먼저 추가한다. Lifecycle clear, child best-effort producer, shared schema/consumer regression은 이후 각 RED→GREEN slice로 순차 진행하며 이번 checkpoint에서는 시작하지 않는다.

### 2026-08-13 17:53 · W13 accepted after corrective independent review

- 사용자 지시의 후속 RED→GREEN slices를 W13 delegated executor가 수행하고 controlling이 actual diff/source와 검증을 독립 재현했다. Own authenticated report API, allowlist/no-runtime ordering, runtime XOR cause, lifecycle clear/preserve, non-blocking occupied-port producer와 shared Claude/Codex cause projection이 W12 B 계약대로 구현됐다.
- 첫 independent review는 producer가 report Promise를 await해 default socket timeout 또는 never-settling callback만큼 original port-in-use fatal을 지연하는 blocker와 lifecycle test의 undefined-pass 약점을 확인해 전체 수용을 보류했다. Corrective RED는 never-settling reporter에서 fatal 지연을 재현했고, fire-and-forget + rejection consumer GREEN으로 original typed fatal을 다음 turn 전에 보존했다. Lifecycle assertions는 target entry와 normalized reason 존재를 먼저 확인하도록 강화했고 request type/unsupported ordering/replacement token coverage도 교정했다.
- Corrective independent re-review는 prior blockers가 닫혔다고 확인하고 full acceptance를 권고했다. Controlling 재검증: focused changed suites 166/166, daemon+CLI invocation 200/200, full suite 643/643, `pnpm typecheck`, `git diff --check`, package registry integrity 모두 통과. W13 candidate를 accepted package state로 승격하고 Result Consumption Gate를 닫아 completed 처리했다.
- 비차단 residual: fire-and-forget report는 delivery guarantee가 아니라 best-effort attempt이며 process fatal과 경쟁할 수 있다. 이는 W12 accepted contract와 일치한다. 실제 Claude/vendor probe는 재실행하지 않았다.
- 이번 사용자 범위는 W13 후속 cycle과 review까지이므로 새 W를 등록하거나 Stage 3 bounded-input 구현을 시작하지 않는다. 다음 할 일은 Stage 3에 남은 socket request-line/Claude HTTP body numeric byte limit과 transport별 overflow behavior 계약을 별도 Work Item으로 등록·확정하는 것이다.

### 2026-08-13 20:15 · W13 accepted test callback typing corrected

- 사용자 IDE가 `tests/unit/adapters/claude-channel.test.ts`의 `reportBootFailure` option 대입에서 타입 오류를 표시했다. Repo의 `pnpm typecheck`와 clean non-incremental `tsc`는 모두 통과했지만, test mock이 인자 없는 `Mock<() => Promise<void>>`로 추론되어 production callback `(failure: { reason: \"claude_channel_port_in_use\" }) => Promise<void>`와 language-service/version별 assignability 차이를 만들 수 있음을 확인했다.
- Mock에 exact single-literal failure parameter를 명시하고 주변 indentation을 정리했다. Production 변경은 없고 focused occupied-port regression 1/1, `pnpm typecheck`, `git diff --check`가 통과했다. W13 accepted behavior와 completed disposition은 유지한다.

### 2026-08-13 20:34 · W14 delegated contract cycle reviewed; numeric policy choice pending

- 사용자 요청으로 W14 revision 1 Attempt 1 read-only 계약 조사를 delegated subagent에게 위임했다. Production/test/doc/controlling code 변경 없이 UDS request-line과 Claude HTTP body의 byte limit·overflow response·connection lifecycle 후보를 산출했고, controlling이 실제 source/owner/caller/test와 독립 대조했다.
- 확인 사실: 두 ingress 모두 현재 무제한 누적하며 owner 문서·schema에 numeric maximum이 없다. UDS는 parse 전 request id를 신뢰할 수 없고 official multiplex client는 unknown id response를 무시한 뒤 close에서 pending을 reject한다. Claude injector는 HTTP 413을 포함한 explicit non-2xx를 기존 `claude_channel_push_failed`로 분류한다.
- Candidate policy: UDS raw UTF-8 request line 1 MiB(newline 제외), 초과 시 `id:"unknown"`/`request_too_large` one-shot best-effort response 후 offending connection close 및 pipelined dispatch 금지. Claude encoded HTTP body 4 MiB, over-limit Content-Length 선거부 또는 chunk cumulative max+1에서 `{error:"payload_too_large"}` 413 + `Connection: close`, parse/MCP notification/remainder drain 없음, response finish 뒤 destroy. HTTP를 더 크게 둔 이유는 canonical envelope string의 nested JSON serialization이 escape-heavy content에서 약 2x 확장될 수 있기 때문이다.
- 사실/제안 경계: 1 MiB/4 MiB는 telemetry나 normative workload maximum에서 복원된 값이 아니라 release-safety product policy 후보다. Per-request bound는 aggregate concurrent HTTP memory/auth/rate-limit을 해결하지 않으며 이는 W14 excluded다.
- Controlling verification: 최초 focused 실행은 sandbox UDS/loopback `listen EPERM`으로 assertion 전 unavailable; unrestricted 동일 3-file command는 79/79 통과. Node built-in local 413 probe도 response body flush와 connection close를 확인했고 `git diff --check`, package registry integrity가 통과했다.
- Disposition: lifecycle/reason 설계는 controlling-supported candidate지만 numeric policy는 사용자 선택 전 accepted contract로 승격하지 않는다. W14는 active 유지하며 socket/HTTP implementation W도 등록하지 않는다.

### 2026-08-13 20:40 · W14 prior approval boundary restored after user correction

- 사용자 지적으로 bounded-input 결정 이력을 전체 재검색했다. 2026-08-12 14:18 W1에서 socket request-line + Claude `/send` body를 새 bounded-input 구현 범위로 두고 common queue를 regression-only로 보는 방향은 이미 명시 승인됐다. 15:08 amendment는 그 승인을 취소하지 않았고, supported reachability/governing-contract 확인 뒤 구체 동작을 정하도록 mechanism만 다시 열었다. 이후 W7/W8/W9/W10은 reachability를 닫고 socket-client response buffer를 G3 범위에서 제외했다.
- W1 Result의 residual에는 `exact input limits/rejection behavior`가 명시적으로 open이며, W7 accepted outcome도 `numeric byte limit과 transport별 observable behavior 결정`을 후속 작업으로 남긴다. Repo-wide 검색에서 1 MiB/4 MiB, `request_too_large`, 구체 413/close 조합은 W14 Attempt 1 이전 승인 기록에서 발견되지 않았다.
- 정정 disposition: 두 ingress를 bound한다는 방향, common queue regression-only, client response buffer 제외는 재승인 대상이 아니다. W14에서 사용자 판단이 남은 것은 오직 새 numeric/mechanism 후보(1 MiB/4 MiB 및 상세 overflow lifecycle)의 수용 여부다. 직전 controlling 보고가 이 경계를 뭉뚱그려 이미 승인된 방향까지 다시 선택받는 것처럼 전달한 것은 잘못이다. W14 active 상태는 exact limit/behavior가 여전히 open인 기존 기록과 일치한다.

### 2026-08-13 22:35 · W14 rejected; hypothetical raw-peer accumulation is not a G3 defect

- 사용자 지적을 기준으로 W3/W7/W8/W9/W10의 bounded-input 판정을 actor와 supported user scenario 관점에서 다시 검토했다. UDS 무기한 누적은 별도의 same-user raw socket client가 newline 없이 계속 쓰는 가정이고, Claude HTTP 무기한 누적은 daemon injector가 아닌 별도 loopback client가 request EOF를 주지 않는 가정이다. 정상 AIOX producer는 두 행동을 하지 않는다. “매우 큰 완성 메시지”도 관찰 workload·요구·incident·OOM·governing maximum이 없는 추측이었다.
- 정정 판정: code에 delimiter/EOF까지 보관하는 accumulator가 있다는 사실은 맞지만, 그것만으로 release-path defect가 되지 않는다. 실제 actor·지원 시나리오·harm이 없으며, hostile same-user/loopback peer를 threat model에 새로 넣는 것은 G3에서 제외한 trust-boundary hardening을 조용히 확장하는 일이다. W7 이후 reachability gate 통과 및 후속 numeric-limit 작업 판정은 과도했고 폐기한다.
- W14 revision 1 Attempt 1 candidate를 전체 기각한다. 1 MiB/4 MiB, `request_too_large`, HTTP 413/close, transport별 implementation W 제안은 수용하지 않으며 production/test/doc 변경은 없었다. W14를 cancelled로 전이했다.
- G3의 `bounded input/queue` evidence는 현재 실제 producer와 계약이 있는 공통 delivery queue의 capacity 32, TTL 5분, retry 250 ms/1 s/4 s 및 기존 regression으로만 해석한다. Socket request-line/Claude body limit 구현은 G3 후속 작업이 아니다. 향후 실제 incident, supported producer behavior, product payload contract 또는 명시적인 local-hostile-peer threat model이 생길 때만 별도 hardening 후보로 다시 열 수 있다.

### 2026-08-13 22:42 · Stage 3 reconciled complete; later stages remain pending

- Stage 3의 실행 결과를 현재 accepted package state와 다시 대조했다. W11 own-method socket dispatch hardening과 W13 Claude channel boot-failure authenticated reporting/cause projection은 각각 independent/result review와 required verification을 통과해 accepted 상태이며, W14 ingress-limit 후보는 실제 AIOX producer·지원 시나리오·관찰된 harm이 없어 전체 기각·취소됐다.
- 따라서 Stage 3가 소유한 socket method dispatch hardening과 Claude channel boot-failure diagnosability에는 남은 executable Work Item이 없다. `plans/g3-daemon-stabilization.md`의 Stage 3를 `[x]`로 정합화했다.
- 사용자 지시 범위는 Stage 3 정합화에 한정됐다. Stage 4는 `[ ]`로 유지하고 W15 또는 새 next pointer를 만들지 않았다. G3 package/log도 open으로 유지하며, roadmap의 `bounded input/queue`·`bounded body/queue` 문구를 accepted common delivery queue evidence와 맞추는 owner 정합화는 Stage 5 closeout 책임으로 남는다.
- 현재 재확인: `pnpm typecheck` 통과. 이번 정합화에서 production code, tests, owner 문서는 수정하지 않았다.

## 2026-08-14 · Stage 4 kickoff; W15 connection-semantics wiring registered

- `plans/g3-daemon-stabilization.md`의 Stage 4("Codex·Claude 최소 read-only diagnostics 표면과 runtime failure/disconnect wiring 구현과 evidence")를 `[>]`로 활성화하고 이 controlling log를 가리키게 했다. Stage 2/3와 동일하게 별도 stage log 파일은 만들지 않는다.
- Controlling이 이번 세션에서 read-only로 source를 직접 대조해 Stage 4의 "runtime failure/disconnect wiring" 절반을 구체적인 배선 gap 두 개로 좁혔다. Codex: `CodexAgentRuntime`(`src/adapters/codex/runtime.ts:264-279`)의 child-exit/WS-close 감지 → `recordRuntimeFailure()` → `#onRuntimeFailed` 콜백과 `state.recordCodexRuntimeFailed()`(`state.ts:1127-1167`)는 이미 각각 구현·테스트돼 있으나, production factory `defaultAttachCodexRuntime`(`state.ts:3129-3147`)가 `onRuntimeFailed`를 전달하지 않아 두 조각이 production에서 연결되지 않는다. Claude: `injectClaudeChannel`(`src/adapters/claude/injector.ts:44-74`)은 이미 ECONNREFUSED(confirmed-death 후보)를 non-2xx/timeout(ambiguous)과 구분해 반환하지만, dispatch 호출부(`state.ts` ~2038-2088)는 등록된 runtime에서 온 confirmed refusal도 `claudeChannelRuntimes`/agent 상태를 바꾸지 않는다.
- W15을 delegated Work Item으로 등록했다(`logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W15.md`). Scope는 위 두 배선만 최소로 잇는 것이다: Codex production factory에 콜백 배선 한 줄, Claude confirmed-refusal 시 기존 `disconnectClaudeChannel()` 효과 재사용. Claude 쪽은 push가 비동기라 resolve 시점에 같은 agent 이름으로 새 registration이 먼저 들어와 있을 race가 있어, 실제 push한 runtime instance identity를 확인한 뒤에만 clear하도록 명시적 제약을 Task Brief에 두었다(W12/W13의 late/replacement report 무시 선례와 동일 방향). 새 event 타입, 새 public API, 새 delivery-state policy, `src/adapters/codex/runtime.ts` 변경, Codex MCP push-ingress channel 변경은 모두 명시적으로 제외했다.
- Stage 4의 나머지 절반인 "Codex·Claude 최소 read-only diagnostics 표면"(연결 상태, acceptance/receipt 구분, automatic-ack 지원 여부, retry 안전성, 수동 복구 경계)은 이번 W15에 포함하지 않는다. `status()`가 현재 agent별 kind/status와 전체 delivery 집계만 반환하고(`state.ts:1437-1449`) per-agent 세부 diagnostics가 없다는 gap은 확인했지만, 노출 방식(기존 `status()` 확장 vs 새 method)은 아직 결정되지 않아 별도 후속 Work Item(가칭 W16)으로 남긴다.
- Act(RED/GREEN)는 이번 entry에서 시작하지 않았다. 다음 행동은 W15를 delegated subagent에게 TDD로 위임하고, 결과를 controlling이 실제 diff/source/검증으로 독립 재검토한 뒤 사용자에게 보고하는 것이다.

### 2026-08-14 13:26 · W15 accepted after controlling independent review

- Delegated subagent가 W15 revision 1 Attempt 1을 TDD로 구현했다: Codex는 production factory `defaultAttachCodexRuntime`에 `onRuntimeFailed` 콜백을 배선(agent를 재사용해 새 hoisted `performRecordCodexRuntimeFailed`로 위임), Claude는 `injectMessageIntoClaudeTarget`의 confirmed `claude_channel_unavailable`(등록된 runtime에서 온 ECONNREFUSED) 분기에서 identity-guard(`runtimeAtDispatch` capture 후 재확인)를 거쳐 새 hoisted `performDisconnectClaudeChannel`을 호출하도록 구현했다. 두 refactor(`recordCodexRuntimeFailed`/`disconnectClaudeChannel`을 hoisted 함수로 추출)는 기존 public method가 그대로 위임하는 behavior-preserving 변경이다.
- Controlling이 diff 전체(`git diff -- src/daemon/state.ts`)를 원본 소스 읽기 기록과 직접 대조하고, 새 test 3개(Codex production-factory wiring 1개, Claude confirmed-refusal 1개, Claude mid-flight re-registration race-guard 1개)를 읽어 모두 실제 production dispatch 경로를 통과하며 race guard가 gated-fetch Promise로 실제 동시성 시나리오를 구성함을 확인했다. Controlling이 독립 재실행한 결과는 subagent 보고와 일치한다: 새 test 2개 파일 57/57, `tests/unit/daemon` 185/186, 전체 suite 645/646(둘 다 동일한 1개 pre-existing 실패), `pnpm typecheck` 0 error, `git diff --check` 0 error, package registry integrity 통과.
- Pre-existing 실패 `run.test.ts > writes redacted fatal diagnostics before an unhandled rejection exits`를 sandbox 밖에서 재확인했다. `src/daemon/run.ts`/`run.test.ts`는 마지막 커밋(`136b34f`, Stage 2 close) 이후 미변경이며 이번 W15 diff에 없다. Stage 2 accepted 당시(`daemon 177/177`)는 통과했던 test라 code 회귀가 아니라 environment drift 후보로 본다. W15 범위 밖이라 이 task에서 고치지 않으며, 별도 확인이 필요한 residual로 남긴다.
- Subagent가 스스로 표시한 design judgment(Claude confirmed-disconnect를 `transitionToDelivering !== false`로 gate해 수동 retransmit은 제외)를 controlling이 승인한다: sibling `claude_channel_push_failed` 분기가 이미 동일 gate를 쓰고, 기존 accepted manual-retransmit test가 "attempt-local, global state 불변"을 전제하므로 이걸 깨는 건 W15 범위를 넘는 별도 행동 변경이다. 수동 retransmit도 confirmed-refusal에서 disconnect를 유발해야 하는지는 열린 질문으로 남기되 이번 W에서는 현재 gate를 accepted로 확정한다.
- W15를 accepted package state로 승격하고 completed 처리했다. Stage 4는 아직 `[>]`로 유지한다 — 남은 절반인 Codex·Claude read-only diagnostics 표면(가칭 W16, 연결 상태/acceptance-receipt 구분/automatic-ack 지원 여부/retry 안전성/수동 복구 경계를 read-only로 노출)은 아직 미착수다. 노출 방식(기존 `status()` 확장 vs 새 method)은 여전히 사용자 결정 대기 항목이다.
- 다음 행동: 사용자에게 (a) W15 accepted 결과와 pre-existing `run.test.ts` residual, (b) W16 착수 여부와 노출 방식 결정을 보고한다.

### 2026-08-14 13:33 · run.test.ts pre-existing residual fixed; W16 next-session handoff

- 사용자 지시로 W15 Result에 남긴 `run.test.ts` pre-existing 실패를 controlling이 직접 원인 조사했다. 근본 원인은 code 회귀가 아니라 test 환경 격리 누락이다: `tests/unit/daemon/run.test.ts:54`가 자식 프로세스 env를 `{ ...process.env, AIOX_PROFILE: "dev", HOME: testHome }`로 구성했는데, `getSocketPath()`(`src/config/paths.ts:110-120`)는 `AIOX_SOCKET_PATH`를 `HOME`/profile보다 높은 우선순위 override로 취급한다. 이 repo의 현재 세션 자체가 `aiox claude --name claude-smoke`로 켜진 aiox-연결 세션이라 쉘 env에 `AIOX_SOCKET_PATH=/Users/lunaxislu/.aiox/dev/daemon.sock`가 이미 export돼 있었고, 테스트가 이를 지우지 않아 자식이 `HOME` override를 무시하고 실제 살아있는 dev daemon(PID 확인됨, `lsof`로 listening 확인)과 같은 socket 경로로 붙으려 했다.
- `listenWithStaleSocketRetry()`(`src/daemon/socket-transport.ts:423-453`)가 EADDRINUSE 시 `canConnect()`로 생존 여부를 먼저 확인하고 살아있으면 unlink 없이 에러만 던지도록 이미 안전하게 설계돼 있어, 이 세션의 실제 aiox 채널이나 그 daemon의 socket 파일은 영향받지 않았음을 직접 확인했다. 다만 그 `"daemon socket is already in use"` 에러가 `installFatalDiagnostics()`(`src/daemon/run.ts:113`, fatal observer 등록)보다 먼저 발생해 `runDaemonProcess()`가 fatal observer 설치 전에 reject되고, 테스트가 이를 `void`로 호출해 첫 unhandled rejection이 관측 대상 secret rejection보다 먼저 발생 — observer 미설치 상태로 Node 기본 종료가 일어나 `latest-fatal.json`이 기록되지 않았다. 재현 스크립트로 `HOME` override가 무시되고 실제 홈 경로가 쓰이는 것까지 직접 확인했다.
- 수정: `tests/unit/daemon/run.test.ts`의 자식 env에 `AIOX_SOCKET_PATH: undefined`를 추가해 자식에서 그 변수를 제거했다(Node `child_process`가 `undefined` 값 키를 자식 env에서 제외함을 직접 검증). Test-only, 1개 파일, W15/G3 production 범위와 무관하다.
- 검증: `run.test.ts` 5/5, 전체 `vitest run` 646/646(pre-existing 실패 완전히 해소), `pnpm typecheck` 0 error, `git diff --check` 0 error. `logs/packages/2026-08-11-G3-daemon-stabilization/tasks/W15.md`의 residual 항목은 해소된 것으로 반영했다.
- 다음 세션 재개(사용자 지시로 이번 세션은 여기서 멈춘다): Stage 4(`plans/g3-daemon-stabilization.md`)는 `[>]`로 유지된다. W15는 accepted/completed다. 남은 것은 W16(가칭) "Codex·Claude 최소 read-only diagnostics 표면"뿐이며 아직 Work Item으로 등록하지 않았다. 재개 시 이 entry와 controlling log의 이전 turn 요약(연결 상태/acceptance-receipt 구분/automatic-ack 지원 여부/retry 안전성/수동 복구 경계를 read-only로 노출하는 최소 표면, `status()`가 현재 agent별 kind/status와 전체 delivery 집계만 반환하고 per-agent 세부가 없다는 gap)을 먼저 읽는다. 노출 방식 결정(기존 `status()` 확장 vs 새 `DaemonApi` method)이 W16 등록의 선행 조건이며 사용자 결정이 아직 없다. Stage 4 완료 뒤에는 plan의 마지막 Stage("G3 gate evidence 정합화, owner 문서 반영과 closeout")가 남는다.

### 2026-08-14 13:38 · W16 delegated diagnostics discovery registered

- 사용자 지시에 따라 Stage 4의 남은 diagnostics 작업을 W16 delegated discovery로 등록했다. 현재 미결인 public surface 선택을 subagent가 임의 구현하지 않도록 production/test/owner 문서 변경은 제외하고, existing capability와 producer/consumer/test 경로, `status()` 확장 대 새 read-only method의 관찰 결과와 blast radius를 path:line 근거로 비교하게 했다.
- Controlling은 subagent 결과를 실제 source·owner·검증으로 독립 재확인하고, 사용자에게 responsibility map, event flow, 선택지, 권고와 구현 후속 할 일을 보고한다. W16의 discovery 결과가 수용되기 전에는 implementation contract나 public DTO를 확정하지 않는다.

### 2026-08-14 13:44 · W16 discovery accepted; implementation choice pending

- Delegated W16 revision 1 Attempt 1의 source/doc/test trace를 controlling이 원본 `state.ts`/`api.ts`/socket/CLI/adapter/spec/roadmap과 대조했다. 요구 다섯 항목의 source mapping, 현재 `status()` gap, 기존 status 확장이 새 method보다 작은 fit이라는 recommendation을 accepted했다. Exact DTO field와 CLI layout은 public contract choice라 아직 확정하지 않았고 production/test/owner artifact는 수정하지 않았다.
- Controlling focused baseline은 sandbox 안에서 Unix socket listen이 `EPERM`으로 차단돼 socket transport 13개가 환경 실패했지만, 같은 명령을 sandbox 밖에서 재실행해 5 files 91/91을 확인했다. `git diff --check`와 package registry integrity도 통과했다.
- W16 discovery Result Consumption Gate를 닫고 completed 처리한다. 다음 행동은 사용자에게 responsibility map/flow, 기존 status 확장 대 새 method의 관찰 결과와 권고를 보고해 선택을 받은 뒤, 별도 TDD implementation W를 등록하는 것이다. Stage 4와 package는 계속 open이다.

### 2026-08-14 14:04 · W16 external review clarification accepted

- 사용자가 전달한 Claude 재검토 중 source 재대조 결과와 A안 지지는 controlling의 독립 검토 결과와 일치한다. 추가로 `doctor()`는 daemon RPC가 아니라 CLI-local 환경 점검 축이라 per-agent diagnostics의 대안이 아니라는 구분도 수용한다.
- 프레이밍 우려 1건은 타당하다고 판정했다. Roadmap의 Phase 2 이연은 generic capability/tier-evaluator/diagnostics model을 대상으로 하며, 요구 다섯 사실만 반환하는 좁은 두 번째 read-only RPC 자체를 금지한다고 해석하지 않는다. B안이 덜 적합한 근거는 금지가 아니라 별도 refresh/auth/lifecycle 필요가 없고, connection data 복제 또는 다른 시점 snapshot 조합을 유발한다는 현재 시스템 fit이다.
- 이 정정은 A안 권고와 W16 completed 상태를 바꾸지 않는다. Production/test/owner 문서는 수정하지 않았고, exact DTO/CLI contract와 구현은 여전히 사용자 승인 뒤 별도 TDD Work Item으로 남는다.

### 2026-08-14 14:09 · Existing-status direction approved; W17 delegated TDD cycle registered

- 사용자가 subagent 위임과 cycle 실행을 지시해 W16의 A안(existing `status()`/`aiox status` additive projection)을 구현 방향으로 승인한 것으로 소비했다. W17을 delegated/active로 등록했다.
- Contract는 agent별 고정 `deliveryDiagnostics`와 별도 CLI `DELIVERY GUARANTEES` table로 좁혔다. API projection은 Codex/Claude acceptance 차이, receipt 미관측, automatic ack/completion 없음, conclusively pre-write-only retry, confirmation-gated unconfirmed retransmit, Codex-only late-resolution observability를 표현한다. State/store 저장, 새 RPC/command, socket special case, adapter/core 변경, generic capability model과 새 delivery policy는 제외한다.
- Executor는 API → socket round-trip → CLI 순서로 one-test-at-a-time RED→GREEN을 수행한다. Controlling은 candidate diff/source/tests를 독립 검토하고 package risk gate의 별도 reviewer 결과까지 소비하며, 지적이 있으면 같은 W17에서 revision/Attempt cycle을 재개한다.

### 2026-08-14 14:12 · W17 brief revision 2 isolates status-only DTO

- Controlling caller/consumer trace에서 shared `AgentDto`가 status 외 attach-existing/stop 응답에도 사용됨을 확인했다. Revision 1 문구대로 여기에 required diagnostics를 붙이면 unrelated public response contracts까지 바뀐다.
- Executor에게 production edit 전 pause/correction을 전달하고 W17 brief를 revision 2로 갱신했다. `AgentDto`는 유지하고 `StatusResponse.agents`만 status 전용 row DTO를 사용한다. 기존 objective/CLI behavior/allowed write-set/exclusions는 변하지 않는다.

### 2026-08-14 14:18 · Independent contract review drives W17 revision 3

- Independent read-only reviewer가 manual recovery boundary 누락과 terminology overclaim을 차단 이슈로 보고했다. Controlling이 실제 retransmit state/spec 경로를 재확인해 수용했다: manual attempt에는 kind별 ready runtime/channel, direct attempt, never queued 경계가 있으며 Codex late correlation은 target receipt가 아니라 transport outcome resolution이다.
- Revision 3는 target receipt evidence를 `unavailable`, ack를 target-qualified false로 고정하고, manual projection에 kind별 readiness, `direct_never_queued`, late transport outcome `correlated_response`/`none`을 추가한다. 기존 `not_observed`/unqualified `observable` 후보는 폐기한다.
- Reviewer가 찾은 exact-shape consumers `tests/unit/daemon/server.test.ts`와 `tests/unit/cli/bin.test.ts`를 allowed test write-set과 focused verification에 추가했다. Executor는 revision 2 API GREEN을 revision 3에 맞춰 다시 RED→GREEN하고 CLI/final 검증으로 진행한다.

### 2026-08-14 14:22 · W17 accepted after corrective review cycle; Stage 4 complete

- Delegated executor의 revision 3 Attempt 1은 API/status-only mapping, socket/server/bin exact consumers와 CLI table까지 RED→GREEN했다. Independent result review가 CLI의 `TARGET ACK`/`COMPLETION` 헤더가 automatic qualifier를 잃어 `completed` 상태 자체가 없는 것처럼 읽힐 수 있다고 지적해 promotion을 보류했다.
- 같은 W17 Attempt 2에서 exact expectation을 먼저 RED로 만들고 production header만 `AUTO TARGET ACK`/`AUTO COMPLETION`으로 고쳤다. Executor post-correction focused 118/118, typecheck/diff-check를 통과했고 independent reviewer가 blocker 해소와 전체 source/diff 의미를 재확인해 promotion PASS를 냈다.
- Controlling도 status-only DTO 격리, shared attach/stop shape 보존, kind별 literal과 manual boundary, allowed write-set을 직접 대조했다. 독립 실행 결과는 focused 6 files 118/118, typecheck, diff-check, package registry integrity, full 56 files/647 tests 모두 통과했다. W17 candidate를 accepted package state로 승격한다.
- 최초 executor full run에서 assertion 647개는 모두 통과했지만 existing retry callback과 DB teardown 사이의 비결정적 closed-DB timer rejection 11건이 관측됐다. 동일 변경의 executor rerun, independent reviewer full run, controlling full run에서는 재현되지 않았고 W17 production은 pure status mapping/formatting이라 인과가 없다. W17 blocker는 아니지만 Stage 5 closeout에서 disposition할 residual로 보존한다.
- W15 runtime failure/disconnect wiring과 W17 read-only diagnostics가 모두 accepted돼 plan Stage 4 완료 조건을 충족한다. W17을 completed 처리하고 Stage 4를 `[x]`로 정합화한다. 다음은 Stage 5 owner 문서/evidence 정합화와 package closeout이다.

## 2026-08-14 · Stage 5 owner reconciliation and closeout

- Plan Stage 5를 `[>]`로 활성화하고 W18 delegated owner-reconciliation Work Item을 등록했다. W18은 accepted W5/W11/W13/W15/W17 evidence를 roadmap, daemon/Claude architecture와 adapter/capability specs의 고유 책임에 맞게 current state로 반영한다.
- Production/test 변경은 금지한다. Pre-G3 gap 문구를 단순 history로 누적하지 않고 실제 남은 gap과 닫힌 evidence를 분리하며, generic Phase 1/2 보장이나 speculative socket/body byte limits를 G3 성과로 확대하지 않는다.
- 최초 full run에서 한 번 관측된 closed-DB retry-timer residual은 W18이 read-only로 completion-condition 영향 여부를 판정한다. 실제 G3 blocker이면 closeout을 멈추고 별도 implementation W를 제안해야 하며, 비차단이면 근거와 추적 위치를 Result에 남긴다. Controlling과 별도 reviewer가 문서 identity/source/diff를 검토한 뒤에만 Stage 5와 package를 닫는다.

### 2026-08-14 14:36 · W18 revision 2 adds the actual CLI output owner

- Independent review가 `docs/architecture/local-runtime-cli-and-operator-surfaces.md` §9.3이 `aiox status` rendering order의 owner이지만 W17 이후에도 `DELIVERY GUARANTEES` 없는 과거 순서를 주장함을 확인했다. Roadmap candidate도 이 문서를 operator surface owner로 링크하므로 그대로 두면 owner closeout이 닫히지 않는다.
- W18 revision 1 write-set에 없던 실제 owner라 executor를 finalization 전에 중지하고 Package Scope revision 3/W18 Brief revision 2에 해당 문서를 추가했다. 변경은 output order와 formatter/test evidence를 current로 만들고 diagnostics 의미는 daemon/API owner로 위임하는 데 한정한다; CLI 구현 추가나 다른 architecture taxonomy 변경은 허용하지 않는다.

### 2026-08-14 14:48 · W18 accepted; G3 package closeout complete

- W18 revision 2 Attempt 1은 roadmap, daemon/Claude/CLI/gaps architecture, capability/adapter specs의 일곱 owner를 accepted G3 state로 정합화했다. Controlling은 실제 doc diff와 source/test citation, owner 고도, inbound/outbound delegation을 직접 대조했고 independent reviewer는 CLI owner 누락, stale citation, roadmap 고도와 gap-owner 중복의 교정 결과까지 재검토해 promotion PASS를 냈다.
- Accepted validation: W18 residual probe API 56/56; seven-doc markdown inline-code check; wikilink/path scan missing 0; stale closed-gap search 0; `git diff --check`; W1–W18 registry integrity. Package-wide implementation verification의 최신 controlling 결과는 focused 118/118, typecheck, full 56 files/647 tests다.
- Closed-DB timer 관측은 unit `afterEach`가 `state.stop()` 없이 DB를 직접 닫는 test lifecycle에서 발생했고 production은 stop/timer/flush cleanup을 await한 뒤 DB를 닫는다. 후속 동일/독립/controlling runs에서 재현되지 않아 G3 blocker가 아닌 test-hygiene residual로 disposition했다. W5의 명시 비차단 residual과 Phase 1/2 excluded 항목도 G3 완료 주장에 섞지 않았다.
- Closeout Contract를 대조했다: roadmap G3와 Gate Evidence, 관련 owner docs, doctor/status surface, excluded boundaries, Result Consumption W1–W18, required verification과 actual artifacts가 일치한다. W18을 completed, plan Stage 5를 `[x]`, controlling log를 `decided`로 전이한다. G3에 남은 local actionable Work Item이나 next pointer는 없다; 다음 release work 선택은 onramp의 별도 plan/log가 소유한다.
