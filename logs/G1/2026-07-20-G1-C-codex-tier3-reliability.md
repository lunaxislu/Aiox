---
topic: G1-C Codex Tier 3 reliability
description: Codex Tier 3 acceptance 경계에서 ack, idempotency, retry, queue와 stale-runtime failure를 구현·failure-injection 검증한다.
status: decided
---

## Work Items
- [x] W1 현재 Tier 3 reliability surface와 G1-C 구현·failure-injection contract를 확정한다
- [x] W2 Tier 3 lifecycle specification·open-policy를 독립 검토한다
- [x] W3 Codex delivery code·test surface를 독립 검토한다
- [x] W4 Codex adapter automatic-ack trigger capability를 검증한다
- [x] W5 `turn/start` 응답의 turn-add 의미와 daemon correlation을 live/TUI로 검증한다
- [x] W6 G1-A evidence premise audit와 cited correction entry를 완료한다
- [x] W7 dev-profile Codex MCP child launcher를 복구하고 직접 사용자/TUI로 재검증한다
- [x] W8 Codex correlation/FSM을 구현하고 late response를 idempotently 해석한다
- [x] W9 W8 accepted result 위에서 pre-write queue/retry를 구현한다
- [x] W10 W8 accepted result 위에서 unconfirmed operator API를 구현한다
- [x] W11 W8/W9/W10/W12 accepted result를 통합 failure-injection/TUI로 재검증한다
- [x] W12 W8/W9 accepted result 위에서 source-visible reject outcome notification을 구현한다
- [x] W13 W11 deterministic integration matrix harness 부재를 보정하고 독립 통합 검증 기반을 만든다
- [x] W14 G1-C re-closeout review를 수행한다
- [x] W15 W10 manual retransmit attempt lifecycle event-cardinality 결함(Q2)을 non-terminal observation과 terminal outcome 분리로 교정한다

## Required Context

### Return Target

- Log: `logs/G1/2026-07-18-G1-A-Codex-structured-ingress-evidence.md`
- Work Item: W3
- Consume when: package accepted result가 W2 matrix의 Tier 3 constraints를 구현·검증하고 G1-A closeout handoff로 승격할 수 있을 때
- Context snapshot: turn/start acceptance is not receipt/ack; post-acceptance automatic retry is unsafe after timeout or WS drop; serial execution observed without durability; daemon-8 to real aiox_reply is live PASS; source-runtime-unavailable remains deferred; implement and failure-injection verify ack/retry/idempotency/queue/stale-runtime failure.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.
- Project integration: `AGENTS.md; logs/AGENTS.md`.
- Global verification requirement: automated unit/failure-injection tests do not by themselves close G1-C. Every implementation or end-to-end verification W must also run a direct user-facing TUI scenario with a user, record the exact observed state/event and outcome, and preserve the evidence in its task record. Read-only discovery W is exempt only when it cannot exercise a TUI path; it must state that exemption explicitly.

## Package Scope

- Revision: 9; History pointer: `2026-07-22 · W15 Brief revision 2 and contract review`.
- Primary boundary: G1-C reliability implementation for Codex Tier 3 delivery lifecycle
- W15 (Q2 corrective) reuses the existing allowed write-set — `src/core/events.ts`, `src/daemon/state.ts`, `src/daemon/api.ts`, `src/adapters/codex/mcp-server.ts`, `tests/unit/daemon/api.test.ts`, `tests/unit/adapters/codex-mcp-server.test.ts`, `tests/integration/codex-tier3-reliability.test.ts`, and `docs/specs/aiox-message-lifecycle.md` — for the manual retransmit attempt-lifecycle event-cardinality correction and its operator-facing API/MCP result alignment (Brief revision 2). All are already in Package Scope; no Scope expansion is required. The decided package is reopened append-only; no W1–W14 accepted history is rewritten.
- Related artifacts in allowed write-set:
- docs/specs/aiox-message-lifecycle.md
- docs/specs/aiox-open-deferred.md
- docs/architecture/local-runtime-codex-adapter.md
- logs/G1/2026-07-18-G1-A-Codex-structured-ingress-evidence.md (append-only cited premise-correction entry only)
- src/adapters/codex/launcher.ts
- tests/unit/adapters/codex-launcher.test.ts
- logs/packages/g1-c-codex-tier3-reliability/tasks/W7.md
- src/core/deliveries.ts
- src/core/messages.ts
- src/core/events.ts
- src/adapters/contract.ts
- src/adapters/router.ts
- src/adapters/codex/websocket.ts
- src/adapters/codex/injector.ts
- src/adapters/claude/injector.ts
- src/daemon/state.ts
- src/daemon/api.ts
- src/adapters/codex/mcp-server.ts
- src/store/schema.ts
- src/store/repositories/messages.ts
- src/store/repositories/deliveries.ts
- docs/specs/aiox-message-lifecycle.md
- docs/specs/aiox-open-deferred.md
- tests/unit/adapters/codex-websocket.test.ts
- tests/unit/adapters/codex-injector.test.ts
- tests/unit/adapters/claude-channel.test.ts
- tests/unit/daemon/codex-ingress.test.ts
- tests/unit/cli/format.test.ts (W8: only the direct `DaemonStatus.deliveryCounts` fixture update for `unconfirmed`)
- tests/unit/core/deliveries.test.ts
- tests/unit/core/messages.test.ts
- tests/unit/daemon/api.test.ts
- tests/unit/daemon/message-fanout-store.test.ts
- tests/unit/store/repositories/messages-deliveries.test.ts
- tests/unit/store/schema.test.ts
- tests/unit/adapters/codex-mcp-server.test.ts
- tests/integration/codex-tier3-reliability.test.ts
- logs/packages/g1-c-codex-tier3-reliability/tasks/W8.md
- logs/packages/g1-c-codex-tier3-reliability/tasks/W9.md
- logs/packages/g1-c-codex-tier3-reliability/tasks/W10.md
- logs/packages/g1-c-codex-tier3-reliability/tasks/W11.md
- logs/packages/g1-c-codex-tier3-reliability/tasks/W12.md
- logs/packages/g1-c-codex-tier3-reliability/tasks/W14.md
- Excluded:
  - Any rewrite of historical G1-A evidence; W6 may append only a correction that cites the affected entries.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution default: inline TDD; W10 may execute only after W8 result review acceptance; W12 may execute only in the next session after W10 accepted result and controlling review; W11 may execute only after W8/W9/W10/W12 accepted results.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - N/A.
  - Activate when: large claim, public contract/security/data/release, irreversible external effect, multi-owner conflict, large blast radius, or low discovery confidence is present.

## Task Index

- Stable package key: g1-c-codex-tier3-reliability

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W15 | Compact | inline | `logs/packages/g1-c-codex-tier3-reliability/tasks/W15.md` |
| W13 | Compact | inline | `logs/packages/g1-c-codex-tier3-reliability/tasks/W13.md` |
| W14 | Compact | inline | `logs/packages/g1-c-codex-tier3-reliability/tasks/W14.md` |
| W12 | Compact | inline | `logs/packages/g1-c-codex-tier3-reliability/tasks/W12.md` |
| W11 | Compact | inline | `logs/packages/g1-c-codex-tier3-reliability/tasks/W11.md` |
| W10 | Compact | inline | `logs/packages/g1-c-codex-tier3-reliability/tasks/W10.md` |
| W9 | Compact | inline | `logs/packages/g1-c-codex-tier3-reliability/tasks/W9.md` |
| W8 | Compact | inline | `logs/packages/g1-c-codex-tier3-reliability/tasks/W8.md` |
| W6 | Compact | delegated | `logs/packages/g1-c-codex-tier3-reliability/tasks/W6.md` |
| W7 | Compact | delegated | `logs/packages/g1-c-codex-tier3-reliability/tasks/W7.md` |
| W5 | Compact | delegated | `logs/packages/g1-c-codex-tier3-reliability/tasks/W5.md` |
| W4 | Compact | delegated | `logs/packages/g1-c-codex-tier3-reliability/tasks/W4.md` |
| W1 | Compact | inline | `logs/packages/g1-c-codex-tier3-reliability/tasks/W1.md` |
| W2 | Compact | delegated | `logs/packages/g1-c-codex-tier3-reliability/tasks/W2.md` |
| W3 | Compact | delegated | `logs/packages/g1-c-codex-tier3-reliability/tasks/W3.md` |

## Evidence

- Current accepted evidence:
  - W2 policy discovery accepted: only a failure conclusively proven before an app-server request is sent is an automatic-retry candidate. A write followed by timeout, response loss, or WS drop is acceptance-ambiguous and has no automatic re-injection. The current W1 correction represents that ambiguity as the independent lifecycle status `unconfirmed`, not as `delivered` plus a degradation. `completed` requires authenticated `deliveryId` acknowledgement or verified per-delivery/session passive acknowledgement. Invocation idempotency and target-ack dedupe are separate contracts. Source: `logs/packages/g1-c-codex-tier3-reliability/tasks/W2.md` Attempt 1; W2 history is preserved, and only its current W1 interpretation is superseded below.
  - W3 current-state discovery accepted as a working-tree observation, not an accepted implementation baseline: generic Codex `turn/start` success is transport acceptance; timeout/WS drop remain ambiguous; no confirmed control-plane ack/deadline/unconfirmed/retry-scheduler surface was identified. Source: `logs/packages/g1-c-codex-tier3-reliability/tasks/W3.md` Attempt 1, rechecked against `src/daemon/state.ts` dispatch paths and `src/adapters/codex/injector.ts`.
  - W4 accepted only the narrower fact: no spontaneous adapter-consumable runtime notification/callback itself carries both exact `deliveryId` and authenticated target identity. It did not test daemon-held request correlation (`deliveryId ↔ JSON-RPC requestId ↔ authenticated per-agent runtime`), so it cannot establish a Tier 3 capability failure for a successful `turn/start` response. Source: `logs/packages/g1-c-codex-tier3-reliability/tasks/W4.md` Attempt 1, corrected by the user's 2026-07-20 correlation objection.
  - W7 accepted: a TypeScript `aiox` entry now configures the injected Codex MCP child to invoke `tsx <entry>.ts mcp-codex`; a built JavaScript entry remains Node-launched and an explicit runtime override remains authoritative. Focused launcher test and typecheck passed; a direct user dev-profile TUI test had no MCP startup error, and the isolated daemon reported both agents connected with bidirectional routes. Source: `logs/packages/g1-c-codex-tier3-reliability/tasks/W7.md` Attempt 1.
- Evidence gaps:
  - W5 must determine whether a successful `turn/start` response means the target turn was added/accepted, and whether daemon-held request correlation plus authenticated per-agent runtime identity supports automatic delivery ack. This requires live app-server evidence and a direct user-and-TUI scenario; code/fake tests alone are insufficient.
  - Retry count/interval, passive-ack timeout, and the exact manual action for accepted-but-unconfirmed delivery remain decision candidates to be fixed by failure injection.
  - G1-C includes process-lifetime bounded queue, serialized flush, retry state, and stale/runtime handling. Only daemon-restart durable replay/mailbox is Phase 2 and excluded.

## Cross-Artifact Effects

- `tests/unit/cli/format.test.ts` is the direct typed `DaemonStatus.deliveryCounts` consumer of W8's independent `unconfirmed` status. Its fixture/output expectation now supplies and renders `unconfirmed=0`; this is contained by W8 Brief revision 3 and needs no owner-doc or API change.
- W10 consumes the accepted W8 status classification and request correlation. W12 consumes accepted W8/W9 results, is not executable until the next session after W10 controlling acceptance, and owns daemon-originated outcome delivery rather than reply routing. W11 consumes accepted W8/W9/W10/W12 results only.

## Decision Candidates

- Retry count and exponential-backoff interval for failures conclusively proven before app-server send.
- Passive-ack deadline for `delivered` Tier 3 delivery.
- `unconfirmed` operator action: manual retry, cancel, archive, or an explicitly selected subset. Reconnect/flush is excluded.
- Automatic-ack branch: undecided. W5 evaluates correlated successful `turn/start` response as a candidate automatic **delivery-acceptance** ack; a response payload need not repeat `deliveryId` if daemon-held request correlation and authenticated target-runtime binding are proven.
- These are decision candidates, not selected values. Failure injection must supply the evidence used to choose them.

## Verification Contract

- Revision: 10; History pointer: `2026-07-22 · W15 Brief revision 2 and contract review`.
- Required:
  - Failure injection must distinguish conclusively pre-send failure from Tier 3 acceptance-ambiguous write/timeout/response-loss/WS-drop.
  - No test may treat generic `turn/start` JSON-RPC success, process survival, or UI presentation as an automatic control-plane ack.
  - W4's missing callback does not exclude automatic delivery-acceptance ack from a correlated `turn/start` response. W5 must prove both response semantics (turn added/accepted) and the daemon's `deliveryId ↔ requestId ↔ authenticated target runtime` correlation before this branch is implemented.
  - Tier 3 post-write ambiguity must prove zero automatic re-injection and the independent `unconfirmed` lifecycle path.
  - Queued-before-injection and post-write-unconfirmed delivery must remain separate lifecycle states: only queued delivery follows bounded hold/serialized flush; unconfirmed delivery never returns to queue or reconnect flush.
  - Pre-write-proven failures may retry only three times after the initial attempt at `250ms → 1s → 4s`; the FIFO per-target queue is bounded to 32, expires at five minutes as `failed` + `delivery_expired`, and flushes serially.
  - A runtime disconnect/WS-drop before a request write is queue/retry eligible; after write it is `unconfirmed` and must not become stale, failed, or queued. No time-based stale policy is implemented.
  - Manual retransmit must require duplicate-risk confirmation plus ready runtime and bound thread, must create a new attempt without queuing, and archive must not mutate delivery state or claim remote cancellation.
- W7 must first reproduce the dev launcher command shape in a focused unit test, then prove a `pnpm dev codex` user TUI can complete the `aiox` MCP initialization. It may not weaken build-profile behavior or use the build profile as a substitute for the dev test.
  - W8 must prove success, post-write timeout/late same-request success, duplicate late success, same-request application reject, and observer-only expiry/socket-close cleanup. It may not implement queue/retry/manual API behavior.
  - W10 may start only after controlling result review accepts W8. W12 consumes accepted W8/W9 results but may start only in the next session after W10 accepted result and controlling review. W11 may start only after W8/W9/W10/W12 are all accepted.
  - Same-request explicit B reject must atomically mark the original A→B delivery `failed` and persist exactly one daemon-originated notification to original source A, correlated by `outcomeForDeliveryId` rather than `inReplyToDeliveryId`. It must neither consume nor grant a reply right; duplicate/late reject is a no-op; notification reject/failure must not produce a further notification.
  - Codex `turn/start` input text and Claude `/send` content must receive byte-for-byte the same `JSON.stringify` canonical notification envelope. Adapter-specific transport metadata may differ only outside that string.
  - W15 (Q2 corrective) manual retransmit attempt lifecycle: for one `{deliveryId, attempt, requestId}`, a post-write timeout/response-loss/WS-drop must record exactly one non-terminal `delivery_manual_retransmit_unconfirmed` observation and never a terminal event; immediate or late same-`requestId` success must record exactly one terminal `delivery_manual_retransmit_delivered` (original → `delivered`); immediate or late same-`requestId` JSON-RPC application reject must record exactly one terminal `delivery_manual_retransmit_rejected` (original stays `unconfirmed`). No path may emit two terminal manual events for one attempt, and a timeout→late-success attempt must leave no residual failure event. `delivery_manual_retransmit_failed` is removed with no alias/dual-write. A duplicate late success/reject for the same `{deliveryId, attempt, requestId}` is a no-op. A manual retransmit reject must not emit `delivery_target_rejected`, create a W12 outcome notification/relation, or grant/consume a reply right; the non-manual first-delivery reject (`failed` + `delivery_target_rejected`) path is unchanged. `requestId` stays internal to transport→injector→daemon audit data and is never exposed in the canonical envelope, `deliveryId`, source-facing MCP/API, or a W12 notification. Audit events remain append-only; a recorded timeout observation is never overwritten into a reject.
  - W15 operator-facing result alignment (Brief revision 2): the `retransmitUnconfirmedDelivery` result and MCP tool must reflect the same lifecycle at the **immediate** outcome — post-write ambiguity (timeout/response-loss/WS-drop/binding-uncertain) returns `manual_retransmit_unconfirmed` ("target acceptance unknown") and the MCP tool renders it as a non-error, not `errorResult`; an explicit immediate JSON-RPC reject returns `manual_retransmit_rejected`; immediate success returns `ok:true` (delivered). The result reason `manual_retransmit_failed` is retained but narrowed to no-attempt failures (no write issued). Late success/reject are observed via delivery status + terminal event, not the already-returned tool result. Each of the nine matrix cases asserts event + delivery status + API result reason (and MCP text where the tool path runs). This is direct-consumer alignment, not new observability; `requestId` is never surfaced.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 8; History pointer: `2026-07-22 · W15 Brief revision 2 and contract review`.
- Reopening note: the W14 `decided` closeout is superseded as *final* by the W15 (Q2 corrective) reopening. The prior W14 closeout evidence remains valid append-only history; G1-C must not be treated as finally complete, and its Return Target must not be consumed for G1-A closeout, until W15 is accepted and the package is re-closed.
- Criteria:
  - W15 (Q2 corrective) manual retransmit attempt lifecycle is implemented and its deterministic matrix passes, asserting **event + delivery status + API result reason** (and MCP tool text where the tool path runs) for each case: immediate success/reject, timeout observation, timeout→late success/reject, duplicate-late no-op, primary reject regression, no-W12-trigger, and the no-attempt eligibility failure. Exactly one terminal event per manual attempt; the `delivery_manual_retransmit_failed` event is removed; the API result reason `manual_retransmit_unconfirmed`/`manual_retransmit_rejected` replaces a definitive-failure reason for post-write timeout/explicit reject, and `manual_retransmit_failed` remains only for no-attempt failures. The W11 composition matrix (`tests/integration/codex-tier3-reliability.test.ts`) is re-run and passes after acceptance.
  - W1 contract explicitly scopes process-lifetime queue/flush/retry/stale handling separately from Phase 2 daemon-restart durable replay/mailbox.
  - The accepted numeric retry/queue/manual policy is implemented and failure-injection verified without introducing time-based stale inference or daemon-restart durable replay/mailbox.
  - W5 must settle the correlated `turn/start` acknowledgement branch with live app-server plus user-and-TUI evidence before G1-C implementation scope is finalized.
  - W7 must be accepted with its focused automated regression test and a user-observed dev-profile Codex TUI MCP initialization before W5 daemon-owned validation resumes.
  - In addition to automated checks, every implemented branch must be directly exercised with a user through the TUI; its task record must retain the observed delivery state/event and outcome.
- Accepted implementation and deterministic failure-injection evidence cover the selected G1-C reliability boundary without adding daemon-restart durable replay/mailbox behavior.
- W8 result review is the explicit consumption gate for W9/W10; W12 consumes accepted W8/W9 results and begins only in the next session after W10 controlling acceptance; W11 consumes accepted results from W8, W9, W10, and W12 only.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-07-20 · G1-C package bootstrap

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.

### 2026-07-20  · Delegated discovery tasks added

- 사용자 지시에 따라 W1의 contract synthesis는 controlling inline으로 유지하고, 서로 독립적인 policy source 검토(W2)와 현재 code/test surface 검토(W3)를 Compact delegated task로 분리했다.
- 두 task는 read-only discovery이며 각 candidate 결과는 controlling이 owner source와 actual source를 재확인한 뒤에만 Evidence 또는 implementation contract로 수용한다. W1은 그 수용·종합을 계속 소유한다.
- Registry Integrity: `.agents/skills/log/scripts/package-log check logs/G1/2026-07-20-G1-C-codex-tier3-reliability.md` passed after W2/W3 registration.

### 2026-07-20  · W2/W3 discovery result review

- W2 policy candidate was accepted after direct recheck: Tier 3's accepted-but-unacknowledged injection is `delivered` + `unconfirmed`, not `completed` or automatic retry; explicit retry needs duplicate-risk acknowledgement. Ack dedupe, invocation idempotency, bounded queue/backpressure, and one-reply permission are distinct concerns.
- W3 current-state candidate was accepted only as a working-tree observation: Codex `turn/start` JSON-RPC success is acceptance, not protocol ack; current timeout/WS-drop handling cannot prove non-acceptance; restart `delivering → queued` must not be promoted to Tier 3 auto-redelivery. Uncommitted code was not accepted as the G1-C implementation baseline.
- Reconcile: W2/W3 are complete discovery tasks. W1 remains the sole active item and owns contract synthesis. The task-record candidate results are consumed here; implementation Work Items are not created pending resolution of the open policy values and durability-scope conflict.

### 2026-07-20  · User-corrected Tier 3 boundary

- User correction accepted after rechecking `aiox-message-lifecycle` §4.3/§4.5, roadmap G1-C, and the G1-A W2 timeout/WS-drop trace. Automatic retry is not a generic "pre-acceptance" rule: it is only a candidate where failure before sending a request to the app-server is conclusively proven. Write-after timeout, response loss, WS drop, and uncertain `turn/start` acceptance are `delivered` + `unconfirmed` and cannot automatically re-inject.
- Scope correction: G1-C includes in-process bounded queue, serialized flush, retry state, and stale/runtime handling; it excludes only daemon-restart durable replay/mailbox, which remains Phase 2. Reference-runtime process-lifetime state must be retained consistently.
- State separation: queued-before-injection delivery may be held and flushed under a bounded/serialized policy. Accepted-but-unconfirmed delivery is not queued, must not return to queue, and is not eligible for reconnect flush; its future operator action is restricted to an explicit manual retry/cancel/archive policy. Retry values, passive-ack deadline, and the selected operator actions are now recorded as decision candidates.

### 2026-07-20 · Automatic-ack capability gate added

- User directed that W2/W3 discovery must not settle the implementation contract. W4 is a delegated, read-only capability verification: it must inspect the adapter/runtime event and callback path for a reliable trigger carrying both `deliveryId` and authenticated target identity. `turn/start` JSON-RPC success is expressly excluded.
- Reconcile: W1 remains active and cannot assign the automatic-ack implementation branch until W4 is reviewed. A negative W4 verdict is an explicit Tier 3 capability failure, not a reason to invent an ack; the permitted implementation/verification branch is only `delivered + unconfirmed`. A positive verdict must name the concrete trigger and add automatic-ack, dedupe, and `completed` failure-injection coverage.
- Global validation correction: code tests are necessary but insufficient. Every future implementation/end-to-end verification W must include a direct user-and-TUI scenario and preserve its evidence; W2/W3 are read-only discovery and explicitly cannot satisfy that runtime validation.

### 2026-07-20 · W4 automatic-ack capability verdict

- Controlling result review directly rechecked W4's candidate against the current adapter paths. Accepted verdict: **explicit Tier 3 capability failure for the current adapter surface**. No reliable adapter-consumable runtime event/callback contains both exact outbound `deliveryId` and authenticated target identity. The conclusion is bounded to this code/runtime evidence; it does not assert that a future Codex app-server version cannot provide such a trigger.
- Reconcile: the automatic-ack branch is removed from G1-C implementation scope. The only permitted branch is `delivered + unconfirmed`, preserving no automatic re-injection after write/timeout/response-loss/WS-drop. Automatic ack, receipt dedupe, and runtime-receipt-driven `completed` are prohibited. Any future reopening needs direct runtime-and-TUI capture plus a deterministic failure-injection seam.

### 2026-07-20 · W4 verdict narrowed; W5 correlation test added

- User correctly identified an untested alternate correlation path: an app-server response need not itself carry `deliveryId` when daemon retains the pending request's `deliveryId`, and the per-agent runtime connection provides authenticated target identity. W4 proved only that no separate callback/event supplies all fields; it did not disprove this request-response path.
- Reconcile: the earlier package-level capability-failure disposition is superseded, not deleted. W5 owns live verification that `turn/start` success actually means a turn was added/accepted and that the correlation is sound across timeout/drop behavior. It must include the global direct user-and-TUI evidence. Until W5 result review, no implementation contract may claim either automatic ack or its absence.

### 2026-07-20 · G1-A premise audit consumed

- W6 read the entire G1-A evidence log and its cited correction candidate was source-rechecked before append. The parent log now has `G1-C consumption correction: correlated turn/start success`, citing the 2026-07-19 16:31/16:37/23:57 and 2026-07-20 00:05/00:11/01:03/01:13 entries.
- Accepted correction: the G1-A ban on equating generic acceptance with target receipt/work completion remains. The incorrect premise was treating that ban as also excluding daemon-held request-response correlation as an automatic **delivery-acceptance** ack candidate. Timeout/response-loss/WS-drop ambiguity and zero automatic reinjection remain unchanged. W5's fresh correlated user-and-TUI evidence is still required before implementation selection.

### 2026-07-20 · W7 dev MCP launcher repair authorized

- **Confirmed fact:** the README defines `pnpm dev codex` as a supported TypeScript-direct development flow. Its current MCP injection derives `runtimeBinary` from `process.execPath` and `aioxBin` from `process.argv[1]`; under `tsx src/bin/aiox.ts`, this produces `node src/bin/aiox.ts mcp-codex`. Direct reproduction exited before MCP initialization with `ERR_MODULE_NOT_FOUND` for `src/adapters/codex/launcher.js`, matching the users' Codex TUI `MCP startup failed ... initialize response` observation.
- **Scope/reconcile:** user authorized the repair. W7 is the sole active implementation item; W1 remains pending and W5 remains an incomplete live validation. Package Scope, Task Index, Verification Contract, and Closeout Contract now explicitly permit the launcher/test/task-record change. W7 must use RED→GREEN and direct user/TUI verification; build profile is a comparison guard only, not a workaround.

### 2026-07-20 · W7 result review accepted; W5 resumed

- **Result review:** W7's actual diff is limited to `src/adapters/codex/launcher.ts` and its focused unit test. It selects `tsx` only when the configured aiox entry ends in `.ts`; `.js` entries continue to use Node and an explicit `runtimeBinary` still overrides either default. The focused runner (`pnpm exec vitest run tests/unit/adapters/codex-launcher.test.ts`) passed 9 tests, `pnpm typecheck` passed, and `git diff --check` passed. An attempted `pnpm test -- <file>` invoked the whole suite and hit unrelated sandbox socket/listen failures; it is not consumed as a W7 regression failure.
- **Direct user/TUI verification:** after restarting the isolated `:memory:` W5 daemon to load the change and recreating the pair, the user opened both README-prescribed `pnpm dev codex` sessions and reported no `MCP startup failed` error. Daemon status independently showed `w5-source` and `w5-target` connected, `w5-validation` ready, and both routes present.
- **Reconcile:** W7 is accepted and completed. W5 is again the sole active Work Item; it may now test daemon-owned source-to-target delivery, but no W7 result establishes delivery acceptance ack, retry policy, or `completed` semantics.

### 2026-07-20 · W5 daemon-owned normal-path TUI checkpoint

- **Confirmed live observation:** after W7, the user had both dev-profile Codex agents connected through the isolated daemon and used source-side `aiox_send_message` exactly once with marker `W5_E2E_20260720`. The user confirmed that marker appeared in target TUI. Immediate daemon status showed one message and `delivered=1`, with no queued, delivering, completed, or failed deliveries.
- **Boundary:** this is normal-path delivery evidence, not direct proof of a persisted per-attempt JSON-RPC request id/correlation record. Current status does not expose those values and current code has no such durable attempt surface. W5 remains active; it cannot turn this observation into an automatic ack/dedupe contract or declare target work completion.

### 2026-07-20 · W5 post-write deadline ambiguity observed

- **Confirmed live observation:** in a fresh standalone App Server plus user TUI run, the timeout probe wrote one `turn/start` request successfully, immediately considered its local post-write deadline expired, then received the same request id's success response 2ms later. Independent lifecycle observation saw the target thread become active then idle; `thread/read` and the user TUI both showed exactly one completed marker turn. No retransmission was made.
- **Interpretation:** this is direct current evidence that a local deadline after write cannot establish non-acceptance. It supports `delivered + unconfirmed` and zero automatic reinjection for the daemon equivalent. It does not establish a universal upstream guarantee, target work-completion receipt, or current daemon dedupe implementation. The preceding 1ms control received success before deadline and is not timeout evidence.

### 2026-07-20 · W5 timeout-state interpretation correction

- **Correction:** the Attempt 4 probe kept its WebSocket open after locally declaring the post-write deadline expired. It then received the same request id's JSON-RPC success 2ms later. Thus this observed request was only *temporarily* unconfirmed; its final state is `delivered` because the late correlated response, lifecycle events, TUI, and history confirmed the accepted turn.
- **Unchanged constraint:** `delivered + unconfirmed` is the terminal degradation only when no correlated response is available after post-write timeout/response loss/drop. It remains the safe policy for the later WS-drop case if no response can be recovered, and it still prohibits automatic reinjection.

### 2026-07-20 · W5 result review accepted; W1 contract synthesis resumed

- **Confirmed WS-drop observation:** a one-shot injection client wrote `turn/start(W5_WS_DROP_20260720_51999)` successfully and immediately terminated only its own daemon-role WebSocket; it closed with code 1006 before receiving any response. The App Server remained connected to the user TUI. Later `thread/read` showed exactly one completed marker turn, and the user confirmed the same marker in TUI. Thus a pre-response client drop did not prove non-acceptance in this run. The separately launched observer's 45-second window elapsed before the delayed probe actually sent, so lifecycle notifications from that observer are explicitly unavailable and not cited.
- **Result review / accepted W5 conclusion:** source inspection establishes the current in-flight `delivery → injector promise → request id → per-agent runtime/thread` correlation; fresh normal-path daemon/TUI evidence establishes actual source-to-target delivery; fresh standalone user/TUI evidence establishes that `turn/start` success means the addressed turn is accepted; timeout may later resolve to `delivered` when its same request id's success arrives; and pre-response WS-drop may leave acceptance unknown even though the App Server completes the turn. This is sufficient to select the **candidate** automatic delivery-acceptance branch for W1: persist the correlation and make success/late-success idempotently transition to `delivered`; preserve post-write timeout/drop with no recoverable response as `delivered + unconfirmed`, never auto-reinject.
- **Reconcile:** W5 is accepted and completed. W1 is the sole active item and must now turn this evidence into the bounded implementation/failure-injection contract. This conclusion does not make `turn/start` a target receipt/work-completion signal, does not promote `completed`, and does not claim current code already persists/dedupes the required attempt state.

### 2026-07-20 · W1 contract synthesis checkpoint

- **Current contract (supersedes only current G1-C interpretation):** `delivered` transitions only when daemon receives the JSON-RPC `turn/start` success for the same delivery's retained request id, confirming that B Codex App Server accepted the specified thread turn. A WebSocket write callback is socket-write evidence, not B acceptance ack. Write-after timeout, response loss, or WS-drop leaves the target delivery in `unconfirmed` degradation; it must not auto-retry, return to queue, or reconnect-flush. A late success for that same retained request id may resolve `unconfirmed → delivered` idempotently.
- **Separate outcomes:** explicit JSON-RPC reject is that target delivery's failed/rejected outcome and does not retroactively change the original A→daemon accepted result. B's application reply and Codex `turn/completed` are not original A→B delivery acceptance state; `replyExpected` remains a separate correlated-reply permission. W2/W3/W4/W5/W6 history entries are not rewritten.
- **Session boundary:** do not implement, alter owner docs, or amend the decided freeze log in this session. Next session's W1 contract review decides unconfirmed storage representation, late-success resolution/dedupe, source-visible explicit-reject failure event, and the retry/manual-retry/queue/stale implementation Work Items.

### 2026-07-20 · W1 contract synthesis checkpoint — session close

- **Current contract:** `delivered` may transition only after the daemon receives JSON-RPC `turn/start` success for the requestId retained with that delivery's `deliveryId`. A WebSocket write callback is not target delivery acknowledgement. Post-write timeout, response loss, and WS drop remain `unconfirmed`; automatic retry, queue return, and reconnect flush are prohibited. If the connection remains available and a late success arrives for that same retained requestId, it may idempotently resolve `unconfirmed → delivered`.
- **Separate outcomes:** explicit JSON-RPC reject is the target delivery's failed/rejected outcome and does not retroactively cancel the source's original daemon acceptance. Target `turn/completed` and B's business reply are separate from A→B delivery acceptance. W2–W7 history and results remain unchanged.
- **Next session:** W1 contract review must decide (1) the persisted `unconfirmed` representation, (2) late-success resolution/dedupe, (3) the source-visible explicit-reject failure event, and (4) retry/manual-retry/queue/stale implementation Work Items. This session changes no G1-A evidence matrix, G1-A closeout or freeze log, owner documentation, production code, or tests; it closes only after package integrity and whitespace checks are recorded.

### 2026-07-20 · W1 session-close verification

- `.agents/skills/log/scripts/package-log check logs/G1/2026-07-20-G1-C-codex-tier3-reliability.md` passed: stable package key, W1–W7 task identities, and registry integrity all reported `OK`.
- `git diff --check` passed with no output. No implementation, test, owner-document, or G1-A artifact action was performed in this session.

### 2026-07-20 · W1 session-close verification rerun

- `.agents/skills/log/scripts/package-log check logs/G1/2026-07-20-G1-C-codex-tier3-reliability.md` passed again: stable package key, W1–W7 task identities, and registry integrity all reported `OK`.
- `git diff --check` passed again with no output. This rerun made no implementation, test, owner-document, G1-A artifact, freeze-log, or historical W2–W7 change.

### 2026-07-20 · W1 contract review opened

- The current synthesis checkpoint and W1 Task Brief revision 8 were reread before review. Current source inspection confirms that production still maps injector success directly to `delivered` and injector failure directly to `failed`; it has no accepted implementation yet for retained request correlation, `unconfirmed`, late-success resolution, source-visible JSON-RPC reject, or the selected retry/queue/stale policy.
- This review asks the user to decide only four bounded contract values: persisted `unconfirmed` representation; late correlated-success dedupe/resolution; source-visible explicit JSON-RPC reject event; and retry/manual-retry/queue/stale policy plus the failure-injection matrix. No code, owner document, freeze, G1-A closeout, or historical W2–W7 artifact is authorized before those choices and an implementation Work Item/allowed write-set are fixed.

### 2026-07-20 · W1 contract synthesis correction — unconfirmed lifecycle state

- **Correction:** the preceding checkpoint was internally inconsistent. If only JSON-RPC `turn/start` success with the retained same requestId proves `delivered`, then post-write timeout, response loss, and WS drop without a correlated response cannot be represented as `delivered`. The W1 current contract is therefore `queued → delivering`; same-requestId success → `delivered`; same-requestId explicit JSON-RPC error → `failed/rejected`; post-write timeout/drop without a correlated response → independent `unconfirmed`; late same-requestId success → `unconfirmed → delivered`.
- **Scope of correction:** this supersedes only the current W1 interpretation and current package surfaces that described `delivered + unconfirmed`. It does not rewrite W2–W7 history/results, G1-A evidence/closeout/freeze, owner documentation, production code, or tests. The next user decision starts from independent `unconfirmed`; the remaining review covers late-success dedupe, source-visible reject events, and retry/manual-retry/queue/stale policy.

### 2026-07-20 · W1 selected semantic contract — matrix review pending

- **Selected meanings:** `unconfirmed` is an independent lifecycle status (1B). The daemon retains process-lifetime `{deliveryId, requestId, authenticated target runtime/session, attempt}` correlation and only a matching late success resolves `unconfirmed → delivered`; duplicate success is idempotent/no-op (2A). A matching JSON-RPC error transitions the delivery to `failed/rejected` and emits source-visible `delivery_target_rejected` with delivery, target, adapter, JSON-RPC error, and attempt context (3A). Pre-send-proven failure alone is automatic-retry eligible; queued delivery uses bounded serialized flush; post-write `unconfirmed` has neither automatic retry nor queue/reconnect flush; manual retransmit is an explicit new attempt from `unconfirmed → delivering` whose error or no-response returns to `unconfirmed` because an earlier attempt may have been accepted (4A).
- **Open numeric policy only:** retry count/backoff, queue bound/TTL, stale predicate/timeout, and manual-retransmit confirmation wording remain undecided until the following failure-injection matrix is reviewed. No implementation Work Item or expanded allowed write-set is authorized yet.

### 2026-07-20 · W1 error-classifier correction — numeric policy pending

- **Classifier:** only an explicit App Server JSON-RPC **application reject** correlated to the retained requestId is a delivery-level `failed/rejected` outcome and emits `delivery_target_rejected`. A local failure conclusively observed before any request write is instead `queued`/automatic-retry eligible. A transport error, timeout, response loss, or WS drop after write with no correlated response transitions the delivery to independent `unconfirmed`.
- **Preserved rules:** manual retransmit remains an attempt from `unconfirmed → delivering`; an error local to that later attempt is recorded as attempt-local rejection/error and returns the original delivery to `unconfirmed`, because an earlier attempt may have been accepted. It must not overwrite the original delivery as failed. The state model, late-success correlation/dedupe, and prohibition on automatic retry/queue/reconnect flush from `unconfirmed` are unchanged. Numeric retry, queue, stale, and confirmation values remain pending user decision.

### 2026-07-20 · W1 revision 11 semantic contract accepted — session close

- **Accepted current contract:** independent `unconfirmed`; retained same-requestId/runtime/session correlation and idempotent late-success resolution; explicit App Server JSON-RPC application reject as `delivery_target_rejected` plus delivery-level `failed/rejected`; local pre-write failure as queued/automatic-retry candidate; post-write transport error, timeout, response loss, and WS drop as `unconfirmed`. Manual retransmit error remains attempt-local and preserves the original delivery as `unconfirmed`.
- **Next session boundary:** resume W1 contract review and present only numeric policy choices and recommendations for (1) pre-write `K`/backoff, (2) per-target queued `Q`/TTL, (3) runtime stale predicate/`Δstale`, and (4) manual-retransmit duplicate-risk confirmation plus cancel/retry UX. Until the user approves those values, do not create an implementation Work Item or allowed write-set, and do not change production code/tests, owner documents, G1-A artifacts, or freeze material.

### 2026-07-20 · W1 revision 11 session-close verification

- `.agents/skills/log/scripts/package-log check logs/G1/2026-07-20-G1-C-codex-tier3-reliability.md` passed: stable package key, W1–W7 task identities, and registry integrity all reported `OK`.
- `git diff --check` passed with no output. This session made no production, owner-document, G1-A, or freeze-material change.

### 2026-07-20 · W1 numeric policy selected; implementation proposal pending authorization

- **User-selected numeric policy:** only failures conclusively proven before a request write retry, at most three times after the initial attempt with `250ms → 1s → 4s`. The per-target queue is FIFO, capacity 32, TTL five minutes, and serialized flush; TTL expiry becomes `failed` with `delivery_expired`. No time-based stale predicate is introduced.
- **Post-write invariant:** runtime disconnect/WS-drop before write is queue/retry eligible; after write it always becomes independent `unconfirmed` and must not transition to stale, failed, or queue. Manual retransmit requires duplicate-risk confirmation and a ready runtime/bound thread, is a new non-queued attempt, and preserves `unconfirmed` on local error/no-response. Cancel is not provided; archive neither changes the original delivery state nor claims remote cancellation.
- **Reconcile:** Verification and Closeout contracts now carry the selected values. W1 remains the only active Work Item. The user requested only a proposed implementation Work Item, failure-injection matrix, and allowed write-set next; no implementation Work Item, production/test/owner-document change, G1-A artifact, or freeze change is authorized or created.

### 2026-07-20 · W1 backpressure boundary selected; split implementation plan required

- **User-selected boundary:** queue capacity applies to the whole fan-out before persistence. If any target would exceed its capacity, reject the entire send atomically with `backpressure`; create neither its message nor any delivery.
- **Planning constraint:** a single Full implementation task is rejected. The next proposal must split correlation/FSM, queue/retry, operator API, and integrated failure-injection/TUI verification into distinct Work Items with explicit dependencies and allowed write-sets.
- **Late-response constraint:** the plan must define the cleanup lifecycle for retained same-socket late-response correlation independently of runtime stale; no task is authorized or registered yet.

### 2026-07-20 · W1 session-close decisions — split plan approved, no execution

- **Late-response cleanup:** user approved the five-minute same-socket late-response correlation window. Correlation expiry and socket close clean only their observer; they do not change the delivery state and are not runtime-stale transitions.
- **Future work shape:** W8 correlation/FSM, W9 queue/retry, W10 operator API, and W11 integrated failure-injection/TUI verification are approved as separate future Work Items. This entry does not register them, create task records, or authorize their execution.
- **Manual retry/reject semantics:** daemon API/tool must require `confirmDuplicateRisk:true` in addition to the UI warning. A first-attempt correlated application reject is delivery-level `failed/rejected`; a manual retransmit attempt reject is attempt-local and preserves the original delivery as `unconfirmed`.
- **Session boundary:** this session changes only this controlling log and W1 Task History. Code, tests, docs/owner documents, W8–W11 registration, G1-A, and freeze artifacts remain unchanged. Run package registry and whitespace checks, record them, then end the session.

### 2026-07-20 · W1 session-close verification — approved split plan checkpoint

- `.agents/skills/log/scripts/package-log check logs/G1/2026-07-20-G1-C-codex-tier3-reliability.md` passed: stable key, W1–W7 identities, and registry integrity all reported `OK`.
- `git diff --check` passed with no output. This session appended only the approved-decision checkpoint to the controlling log and W1 Task History; it did not register W8–W11 or change code, tests, owner documents, G1-A, or freeze material.

### 2026-07-20 · W8–W11 registration and contract review accepted

- **Confirmed facts:** `src/adapters/codex/websocket.ts` deletes a timed-out pending JSON-RPC request and ignores its later response; `src/daemon/state.ts` currently maps injector success directly to `delivered` and all failures to `failed`. Therefore W8 must own the same-socket request-id observer as well as the delivery FSM; a state-only change cannot resolve a late response.
- **Registered briefs:** W8 owns correlation/FSM; W9 owns only pre-write queue/retry and consumes accepted W8 classification; W10 owns only the unconfirmed operator API and consumes accepted W8 semantics; W11 owns integrated deterministic failure injection plus direct user/TUI evidence and consumes accepted W8/W9/W10 results. Their exact task records, test files, dependencies, and write-sets are registered in the Task Index records.
- **Contract review:** passed controlling self-review. Scope/write-set closes over the actual websocket → injector → daemon transition chain; W8 keeps `failed/rejected` as existing `failed` status plus rejection reason/event (not a new `rejected` status), adds independent `unconfirmed`, and treats five-minute observer expiry/socket close as correlation cleanup only. No queue/retry/manual behavior is permitted in W8. W9/W10/W11 remain unstarted.
- **Reconcile:** W1 is completed. W8 is the sole active Work Item and may begin RED; W9/W10/W11 have no execution authority until the stated accepted-result gates pass.

### 2026-07-20 · W8 execution started — independent status RED→GREEN

- W8 began with the smallest contract increment: its focused core test first failed because `unconfirmed` was absent, then passed after adding it to the typed delivery-status vocabulary. This does not yet implement request-id retention, late-response resolution, rejection eventing, or any queue/retry/manual behavior.
- W9/W10/W11 remain unstarted. The next W8 RED must exercise the currently missing same-socket late-response observer; its implementation must be coordinated carefully with existing unrelated working-tree edits in daemon/ingress paths.

### 2026-07-20 · W8 scope escalation — status-count consumer

- **Confirmed fact:** the W8 `unconfirmed` status vocabulary makes `DaemonStatus.deliveryCounts` require an `unconfirmed` field. `pnpm typecheck` currently fails at `tests/unit/cli/format.test.ts:89` because its fixture omits that field.
- **Scope conflict:** that fixture is outside W8 Task Brief revision 2's exact allowed test write-set. The WebSocket observer RED→GREEN increment is recorded in the W8 task trace, but W8 cannot claim its required typecheck or candidate result until the controlling scope/Brief decision authorizes this directly affected consumer test (or supplies another approved resolution). W9/W10/W11 remain unstarted and unmodified.

### 2026-07-20 · W8 checkpoint correction — observer test not green

- **Correction:** the preceding phrase “WebSocket observer RED→GREEN increment” was inaccurate. The observer test was added, but `pnpm exec vitest run tests/unit/adapters/codex-websocket.test.ts --reporter=verbose` timed out in the pre-existing first five WebSocket tests and reported `Server is not running` during cleanup. Therefore the observer test has no passing verification yet. W8 has no candidate result, no result review, and no accepted result.

### 2026-07-20 · W8 direct consumer-test scope correction accepted

- **User-authorized scope correction:** `tests/unit/cli/format.test.ts` is added only to update the direct `DaemonStatus.deliveryCounts` fixture for the independent `unconfirmed` delivery status. W8 Task Brief revision 3 carries the same narrow write-set change.
- **Contract review:** accepted. This is a typed consumer correction, not authority to alter production beyond W8's existing websocket/injector/daemon FSM boundary, or to start queue/retry (W9), manual API (W10), or integrated verification (W11).

### 2026-07-20 · W8 correlation/FSM checkpoint — candidate not yet eligible

- **Verified implementation slice:** a timeout or WS-drop delivery becomes `unconfirmed`; the retained same-socket callback passes through injector and moves only that still-unconfirmed delivery to `delivered`; duplicate callback is a no-op. First-attempt JSON-RPC application reject remains `failed` and appends `delivery_target_rejected`. Focused injector/daemon tests (62), `pnpm typecheck`, `git diff --check`, and package registry integrity passed.
- **Baseline failure isolation:** with the observer code and observer test removed temporarily, the WebSocket suite's existing first five tests still timed out and produced `Server is not running` during cleanup. The observer therefore is not evidenced as the cause. Its focused test has not yet passed because the suite is currently blocked before it reaches that test.
- **Unmet W8 gates:** explicit observer expiry/socket-close cleanup evidence and the required direct user-operated TUI scenario remain. This is not a candidate result; W9/W10/W11 remain unstarted and unmodified.

### 2026-07-20 · W8 TUI verification correction

- An isolated daemon and two Codex sessions were opened through the agent's private tool PTY. They were not visible in the user's TUI and cannot constitute direct user-operated evidence. The isolated daemon was stopped without sending or claiming a marker delivery. W8 remains unaccepted; W9/W10/W11 remain unstarted and unmodified.

### 2026-07-20 · W8 direct user/TUI normal-path evidence

- **User-observed fact:** from visible `w8-source`/`w8-target` TUI sessions on the isolated `/private/tmp/aiox-w8-tui.sock` daemon, the source MCP call sent `W8_TUI_MARKER_20260720` as `codex-msg-fcd9be08-530e-40d5-b1d3-b250cd47cb83`; the target displayed its canonical envelope (`deliveryId: daemon-10`) and the marker receipt.
- **Daemon correlation:** immediate status read on that same socket reported one message and `delivered=1`, with `unconfirmed=0` and `failed=0`. The target later appeared disconnected, but the observed delivery was already terminally delivered. This closes normal-path user/TUI evidence only. Observer expiry/socket-close cleanup remains an unverified W8 gate; W9/W10/W11 remain unstarted and unmodified.

### 2026-07-20 · W8 controlling result review — accepted

- **Review facts:** the W8 candidate in `tasks/W8.md` revision 3 was rechecked against the actual allowed source/test diff. `src/adapters/codex/websocket.ts` retains a timed-out request id only through a five-minute observer and deletes that observer on response, expiry, or socket close; deterministic injected scheduling proves expiry without a five-minute wall-clock wait. `src/adapters/codex/injector.ts` converts the retained same-id success/error into typed late results, and `src/daemon/state.ts` guards late resolution by current `unconfirmed` state, giving exactly-once delivered/failed transitions. The explicit rejection event payload contains adapter, target agent id/name/thread id, JSON-RPC code/message, and attempt 1, while event links contain agent/message/delivery/route.
- **Failure-environment finding:** sandboxed WebSocket tests fail before observer/client execution at loopback `listen EPERM`, followed by cleanup's `Server is not running`; an approved loopback execution passed the complete exact suite. This is an environment limitation, not a W8 implementation failure.
- **Verification reviewed:** exact focused suite passed 84/84, `pnpm typecheck`, `git diff --check`, and package registry integrity passed. The user-operated visible TUI normal-path marker and daemon status are retained in W8's task record. The actual source has no W9 queue/retry, W10 manual API, W11 integration, persistence, stale, or owner-document changes.
- **Disposition / Reconcile:** accept W8 Attempt 1 in full. W8 becomes completed; its accepted result is recorded as the dependency input for W9/W10, but this does not authorize their activation. Per the user's current instruction W9/W10/W11 remain unstarted and unmodified.

### 2026-07-20 · Source-visible correlated reject — W12 design boundary

- **User-selected semantic contract:** an explicit, same-requestId JSON-RPC application reject from B for original A→B delivery must create a separate daemon-originated delivery-outcome notification to original source A. It is not B's business reply: it consumes or grants no reply right, never derives routing from `replyExpected`, has a new notification `deliveryId`, and preserves the original delivery id as explicit outcome correlation.
- **Placement:** this is a future, unregistered G1-C W12 candidate, separate from W8 FSM/event recording, W9 queue/retry, and W10 unconfirmed operator action. No W12 task record, production/test/document change, or W9/W10/W11 action is authorized by this entry; the requested design is reported in the current conversation before any registration/implementation decision.

### 2026-07-20 · Source-visible correlated reject — W12 design revision 2

- **Confirmed correction:** current `inReplyToDeliveryId` is reply-only at the executable boundary: both Codex/Claude MCP reply schemas require it, and G1-B W3 uses it to authorize and atomically consume a one-reply right before source-only dispatch. Outcome notification must not reuse it. The future canonical envelope/storage field is instead proposed as optional `outcomeForDeliveryId`, permitted only for daemon-originated `type:"event"` / `intent:"notification"`; it carries no reply-right semantics.
- **Persistence/idempotency design:** because the current message store requires an agent `sourceAgentId`, W12 needs an explicit persisted daemon-originated message representation as well as `outcomeForDeliveryId`. A unique `delivery_outcome_notifications.original_delivery_id` (or equivalently a unique notification-origin relation) must atomically bind one original delivery to one notification message/delivery. The original `failed` transition, internal rejection event, and notification persistence occur in one transaction; network dispatch occurs only after commit. Duplicate/late duplicate reject observes the existing relation and is a no-op.
- **Presentation/adapter correction:** the canonical structured rejection detail remains stored in the outcome relation/event data, while the target TUI receives human-readable plain text. Claude's actual `POST /send` currently accepts only `{content, chat_id?, origin?}` and renders it as a channel notification. W12 must add a distinct optional `outcome_delivery_id` metadata field; `chat_id` is the new notification message id, never the original delivery id. The endpoint is selected from the original source A's registered runtime map entry, not from a reverse route.
- **Dependency/reconcile proposal only:** W12 continues to require accepted W8 and W9. Once W12 is registered and accepted, W11's future Brief/Verification/Closeout dependency must change from W8/W9/W10 to W8/W9/W10/W12 and add the notification failure-injection/TUI cases. No W11 text or task state is changed now.

### 2026-07-20 · Source-visible correlated reject — W12 renderer policy fixed

- **User-selected renderer invariant:** Codex and Claude source adapters receive the exact same complete daemon-originated notification canonical-envelope JSON. Codex sends `JSON.stringify(envelope)` as `turn/start` `input.text`; its full JSON user-message presentation in the Codex TUI is the already accepted G1-B UX limitation. Claude sends that same JSON string as HTTP `/send` `content`; it must not substitute a separate human-only message. The human-readable outcome explanation remains only `envelope.content.text`, for model context inside the common JSON envelope.
- **Future test criterion:** a W12 renderer test constructs one notification envelope and asserts byte-for-byte JSON equality at Codex `turn/start` input text and Claude `/send` content, while each adapter's transport metadata stays adapter-specific. This is a future design/test criterion only; no adapter, test, W11, or task-registration change is made now.

### 2026-07-20 · W9 controlling result review — accepted

- **Brief correction / contract review:** W9 Brief revision 2 omitted `src/core/events.ts`, although the user's explicit W9 scope requires typed `delivery_expired`. Revision 3 adds only that direct event owner. The Package Scope already permits it, no owner document/API surface or other W scope is added, and this controlling review rechecks the corrected Brief.
- **Review facts:** W9 Attempt 1 was rechecked against its revision 3 allowed write-set. The queue admission happens before message/delivery persistence and rejects an entire fan-out when any target would exceed 32 queued deliveries. Queued delivery receives the five-minute TTL event, retries only the pre-write/deferred branch at 250ms, 1s, and 4s, then remains queued for reconnect flush; same-target dispatch and retry work share one serialized chain. Target Codex reattach and its eventual proxy thread binding both trigger the queued-target flush.
- **Verification reviewed:** exact focused suite passed 88/88; `pnpm typecheck`, `git diff --check`, and registry integrity passed. User-operated TUI evidence observed the queued state after automatic retries, followed by target receipt after reconnect/thread binding; final status was `messages=1 queued=0 delivering=0 delivered=1 completed=0 failed=0 unconfirmed=0`.
- **Boundary review:** W8's timeout/WS-drop `unconfirmed` path remains excluded from scheduling and reconnect flush. W10 manual operations, W11 integration work, W12 design/renderer work, durable replay, stale policy, and owner documents remain unchanged.
- **Disposition / Reconcile:** accept W9 Attempt 1 in full. W9 is completed and becomes an accepted W11 dependency; W11 remains inactive because W10 is still not accepted. W9 task result is consumed here; no next Work Item is activated.

### 2026-07-20 · W12 registration and W11 dependency reconciliation

- **Confirmed fact:** the immediately preceding W9 controlling result review accepts W9 Attempt 1 in full: 88/88 focused tests, typecheck, diff/registry checks, and the user-operated queued→reconnect→delivered TUI observation. W9 is therefore completed and is an accepted dependency, not merely a task-record candidate.
- **Registered W12 Brief:** explicit same-requestId B reject transitions the original A→B delivery to `failed` and atomically persists exactly one separately delivered daemon-originated outcome notification for original source A. The notification has its own delivery id and correlates with `outcomeForDeliveryId`; it is never a reply, never sets or reuses `inReplyToDeliveryId`, and consumes/grants no one-reply right. A unique original→notification relation makes duplicate/late reject idempotent. Notification reject/failure remains terminal/observable without producing another notification.
- **Renderer invariant:** Codex `turn/start` `input.text` and Claude `/send` `content` receive byte-for-byte the same `JSON.stringify` canonical envelope; only transport metadata remains adapter-specific. The notification uses the original source runtime, not reverse-route inference.
- **Dependency and activation:** W12 consumes accepted W8/W9 results. Per user direction it is registered but must not start until the next session, after W10 has an accepted result and controlling review. W11 Brief revision 3, Verification Contract, Closeout Contract, Scope, Task Index, and Work Items now consume accepted W8/W9/W10/W12; W11 remains inactive. W10 is the sole active implementation Work Item and is limited to its existing unconfirmed manual retransmit/archive API Brief. No W10, W11, or W12 implementation was started by this reconciliation.
- **Contract review / Reconcile:** controlling self-review passed: the W12 write-set closes over canonical message/delivery persistence, reject producer, both renderer paths, and direct tests; reply-right tooling and W10/W11 boundaries remain excluded. Package Scope revision 7, Verification Contract revision 8, and Closeout Contract revision 6 point here. Registry Integrity and result-consumption state are to be rechecked below.

## 2026-07-20 · W10 implementation checkpoint

- **Confirmed implementation candidate:** W10 adds daemon API methods `retransmitUnconfirmedDelivery` and `archiveUnconfirmedDelivery`, plus Codex MCP tools `aiox_retransmit_unconfirmed_delivery` and `aiox_archive_unconfirmed_delivery`. Retransmit accepts only an `unconfirmed` delivery and `confirmDuplicateRisk:true`; it performs a new direct Codex attempt only after the existing target-runtime/thread resolution and never calls queue/retry scheduling. A manual failed/rejected attempt leaves the original delivery `unconfirmed`; archive emits only an operator event and does not mutate state or claim remote cancellation.
- **TDD/verification facts:** the initial MCP-schema RED failed because the confirmation schema did not exist. GREEN focused tests now cover confirmation-gated zero attempt, confirmed direct delivery, failure preservation with no queued delivery, and archive state preservation. `pnpm exec vitest run tests/unit/daemon/api.test.ts tests/unit/adapters/codex-mcp-server.test.ts --reporter=dot` passed 50/50; `pnpm typecheck`, edited-spec inline-code checks, `git diff --check`, and package registry integrity passed.
- **Owner effects and boundary:** `aiox-message-lifecycle` now makes `unconfirmed` an independent state and defines this bounded operator API; `aiox-open-deferred` retains remote cancellation, stale classification, retention, and reply-right cleanup as deferred. No W8 observer/FSM, W9 queue/retry, W11 integration, W12 outcome notification, durable replay, cancellation, or stale timer code was changed by W10.
- **Unmet acceptance gate:** the required direct user-operated TUI scenario has not yet run, so this is not an accepted result. W10 remains the sole active Work Item; W11/W12 stay inactive. The task record names the required scenario and verification evidence.

### 2026-07-20 · W10 direct source-TUI MCP verification — incomplete attempt recorded

- **Confirmed fact:** a temporary response-drop harness made two real daemon deliveries `unconfirmed`, and an MCP-injected source Codex runtime reached the source TUI. The source TUI showed the prescribed retransmit prompt and then an actual approval prompt for `aiox_archive_unconfirmed_delivery` with the known raw delivery id.
- **Boundary / disposition:** that approval prompt was not completed in the agent-controlled run, so neither requested operation produced a tool result. No result review or acceptance is permitted: raw daemon-socket invocation and a pending tool-approval screen do not meet the direct source-TUI MCP-call requirement. W10 remains active; W12 remains unstarted and does not own unconfirmed notification or delivery observability.

### 2026-07-20 · W10 direct source-TUI MCP verification — candidate evidence complete

- **User-observed retransmit flow:** in a fresh visible source/target Codex TUI run, a response-drop proxy forwarded the initial target `turn/start` for `w10-6` and dropped only its matching response. The daemon recorded `w10-6` as `unconfirmed`. The source TUI then actually called `aiox_retransmit_unconfirmed_delivery({ deliveryId: "w10-6", confirmDuplicateRisk: true })` and displayed `manual retransmit accepted for w10-6`. The target TUI displayed the same canonical envelope/marker twice, making the duplicate risk observable. The final daemon trace recorded `w10-6=delivered` and one `delivery_manual_retransmit` event.
- **User-observed archive flow:** a separate response-dropped `w10-18` reached `unconfirmed`. The source TUI actually called `aiox_archive_unconfirmed_delivery({ deliveryId: "w10-18" })`. The target TUI displayed its canonical envelope/marker only once, from the initial forwarded request; archive caused no additional target `turn/start`/marker. The final daemon trace recorded `w10-18=unconfirmed` and one `delivery_archived` event. The source TUI was cleaned up after daemon event observation, before its final text result bubble could be retained; this is not a claim of remote cancellation.
- **Disposition:** W10 now has its required direct source-TUI MCP evidence plus its prior focused automated candidate evidence. It remains active pending a separate controlling result review; W11 and W12 remain inactive, and this checkpoint neither adds delivery observability nor treats `unconfirmed` as a W12 notification outcome.

### 2026-07-20 · W10 scope reduced to retransmit-only — Brief revision 3 contract review

- **User decision:** remove archive from W10. W10 is reduced to a retransmit-only operator API. The prior retransmit+archive candidate and its direct-TUI archive evidence (`w10-18`) are preserved as historical records; the current valid W10 completion criteria no longer include archive. This is recorded append-only; no history is rewritten.
- **Result-review finding that preceded this decision (confirmed facts):** the candidate diff writes three W10 typed events — `delivery_manual_retransmit`, `delivery_manual_retransmit_failed`, `delivery_archived` — into `src/core/events.ts`, but W10 Brief revision 2's exact allowed write-set omitted that file. Package Scope already permits `src/core/events.ts`, so this mirrors the accepted W9 revision 2→3 direct-event-owner correction. `delivery_archived` was verified used only in `src/core/events.ts`, `src/daemon/state.ts` (archive emission), and `tests/unit/daemon/api.test.ts` (archive test) — W10-only.
- **Brief revision 3 (contract review):** W10 Task Brief is updated to retransmit-only. Its exact allowed write-set adds `src/core/events.ts` as the direct event owner (retained `delivery_manual_retransmit`/`delivery_manual_retransmit_failed`; removal of `delivery_archived`) and otherwise keeps `src/daemon/api.ts`, `src/daemon/state.ts`, `src/adapters/codex/mcp-server.ts`, `docs/specs/aiox-message-lifecycle.md`, `docs/specs/aiox-open-deferred.md`, `tests/unit/daemon/api.test.ts`, `tests/unit/daemon/codex-ingress.test.ts`, `tests/unit/adapters/codex-mcp-server.test.ts`, the task record, and this controlling log. Completion criteria retain the confirmation-gated, ready-runtime/bound-thread, non-queued direct retransmit with attempt-local failure preserving `unconfirmed`, add a focused test asserting the archive MCP tool is absent, and require a fresh direct source-TUI retransmit-only verification. No backward-compatible archive alias or deprecated tool may remain. W11/W12 boundaries and the W12 reject-notification/delivery-observability exclusions are unchanged.
- **Contract self-review:** passed. The write-set closes over the actual API/state/MCP/event/spec/test removal surface; it introduces no queue/retry, FSM, cancellation, remote-cancellation, durable-replay, stale, or W11/W12 scope. This entry authorizes the archive-removal implementation within that write-set only.
- **Acceptance gate (unchanged):** W10 remains an active, non-accepted candidate. A direct user-operated source Codex TUI retransmit-only verification against the reduced code is a mandatory acceptance gate, coordinated separately. The candidate must not be promoted to accepted/completed before that verification and a separate controlling result review. W11 and W12 remain inactive; no delivery observability is added.

### 2026-07-20 · W10 archive-removal implementation checkpoint — TUI gate pending

- **Confirmed removal (within revision 3 write-set):** archive is fully removed from W10. Deleted the `archiveUnconfirmedDelivery` daemon API/state path and its request/result/response types and mapper, the `aiox_archive_unconfirmed_delivery` MCP schema/handler/registration/description/client method/input interface, the `delivery_archived` event kind (verified used only in `src/core/events.ts`, `src/daemon/state.ts`, and `tests/unit/daemon/api.test.ts` before removal), the archive-only unit test, the archive `fakeDaemonClient` surface, and the archive spec text in both lifecycle/deferred specs. `docs/specs/aiox-open-deferred.md` now lists local archive among deferred operator actions. No backward-compatible alias or deprecated tool remains.
- **Retained:** `unconfirmed` status; `aiox_retransmit_unconfirmed_delivery`; enforced `confirmDuplicateRisk:true`; ready-runtime + bound-thread non-queued direct attempt; manual failure/reject preserving the original `unconfirmed`. W11 dependency and the W12 reject-notification boundary are unchanged; no delivery observability is added.
- **Automated verification:** added a focused test asserting the retransmit tool is registered and the archive tool is absent from the MCP tool set. Focused suite `tests/unit/daemon/api.test.ts` + `tests/unit/adapters/codex-mcp-server.test.ts` passed 50/50; `pnpm typecheck`, `scripts/check-markdown-inline-code` on both edited specs, `git diff --check`, and package registry integrity all passed (exit 0).
- **Disposition:** W10 remains active and non-accepted. The mandatory direct user-operated source Codex TUI retransmit-only verification against this reduced code has not yet run; it is the coordinated acceptance gate. The candidate must not be promoted to accepted/completed before that verification and a separate controlling result review. W11 and W12 remain inactive.

### 2026-07-20 · W10 delegated verification/review results — one blocking retransmit defect

- **Scope:** two subagents ran the automated verification and a read-only scope/correctness review of the retransmit-only candidate (the mandatory user-operated TUI gate was excluded). Both findings below were independently re-traced against the actual code by the controlling agent before recording.
- **Automated verification — PASS:** focused suite `tests/unit/daemon/api.test.ts` + `tests/unit/adapters/codex-mcp-server.test.ts` 50/50; `pnpm typecheck`, `scripts/check-markdown-inline-code` (both specs), `git diff --check`, and package registry integrity all exit 0. Residual archive symbols in `src/` are zero; the only archive reference in `tests/` is the negative assertion in the archive-absence test.
- **Review — archive-removal criteria PASS:** archive is fully removed with no orphans or backward-compatible alias/deprecated tool; retransmit gating (`unconfirmed`-only, `confirmDuplicateRisk:true` at daemon and MCP `z.literal(true)`, ready-runtime/bound-thread, non-queued direct attempt, success→`delivered`) holds for the immediate path; write-set discipline, W11/W12 boundary non-intrusion, and spec accuracy all hold.
- **Finding 1 (confirmed; blocks accepting retransmit semantics as contracted):** the manual retransmit path reuses `injectMessageIntoCodexTarget` (`src/daemon/state.ts:936-938`), which wires an unconditional late-response callback (`src/daemon/state.ts:1824-1843`). On a `turn/start` write that succeeds but times out, `websocket.ts:279-298` registers a five-minute late-response observer and `injector.ts:76-83` maps a late JSON-RPC error to `codex_jsonrpc_error`. Because the callback guards only on the delivery still being `unconfirmed` (`state.ts:1825`) and the original was preserved as `unconfirmed` by the immediate `manual_retransmit_failed` return, a late reject then runs `updateDeliveryStatusInTransaction({ status: "failed" })` (`state.ts:1833-1837`) and appends `delivery_target_rejected` (`state.ts:1838`). This flips the ORIGINAL delivery to terminal `failed`, contradicting the explicit contract (this log's `W1 error-classifier correction` and W10 Brief revision 3): a manual attempt error/reject must remain attempt-local and preserve the original as `unconfirmed` because an earlier attempt may already have been accepted. It is untested — the api.test.ts manual-failure case uses a synchronously-throwing runtime and never exercises the timeout-then-late-reject race.
- **Finding 2 (confirmed; latent, non-blocking today):** a manual retransmit reject also emits the delivery-level `delivery_target_rejected` event with hardcoded `attempt: 1` on both the immediate (`state.ts:1873-1878`) and late (`state.ts:1838-1841`) paths. That event is the W1/W12-designated trigger for a source-visible first-attempt outcome notification; emitting it from an operator attempt-local manual reject is semantically wrong and would produce a spurious source notification once W12's consumer exists. Same root cause as Finding 1.
- **Root cause:** W10 reuses `injectMessageIntoCodexTarget` (built by W8 for the normal first-delivery path) for the manual retransmit path without giving the manual attempt its own attempt-local late-response/reject semantics.
- **Recommended remediation (within W10 write-set, pending user decision):** give the manual path attempt-local semantics — a late success may resolve `unconfirmed → delivered`, but a manual-attempt reject (immediate or late) must not transition the original to `failed` and must not emit delivery-level `delivery_target_rejected`; record it attempt-locally (e.g., `delivery_manual_retransmit_failed`) and preserve `unconfirmed`. Add a test exercising the timeout-then-late-reject race.
- **Disposition:** W10 remains active and non-accepted. This defect is separate from and additional to the pending user-operated TUI gate; remediation of Finding 1 is a production-code change to retransmit logic beyond the archive-removal authorization and awaits a user decision. W11 and W12 remain inactive.

### 2026-07-20 · W10 Finding 1/2 remediation authorized — Brief revision 4 contract review

- **User decision:** fix Finding 1 (and the related Finding 2) now within W10. Constraint: do not change W8's first (non-manual) delivery attempt semantics; give only the manual retransmit attempt a separate late-response disposition. Required contract: a manual attempt's immediate JSON-RPC reject and late same-requestId reject must not transition the original delivery to `failed`; the original stays `unconfirmed`; the manual attempt must not emit `delivery_target_rejected` (so it cannot trigger a future W12 source outcome notification); instead record an attempt-local rejection/failure event carrying attempt, requestId, adapter/code/message; only a manual attempt's late same-requestId success may resolve `unconfirmed → delivered`; the first non-manual attempt reject → `failed` + `delivery_target_rejected` stays unchanged. Deterministic tests for timeout→late-reject race, immediate reject, late reject, late success, and duplicate-late no-op are required.
- **Brief revision 4 / write-set expansion (contract review):** implementing the attempt-local event's `requestId` field requires surfacing the Codex transport request id, which is currently internal to `src/adapters/codex/websocket.ts`. Revision 4 additively adds an optional `requestId?` to the Codex inject-failure result and the immediate JSON-RPC error, touching `src/adapters/contract.ts`, `src/adapters/codex/websocket.ts`, and `src/adapters/codex/injector.ts`. These three are already in Package Scope; the change is additive observability only and does not alter W8's first-delivery transition semantics. The manual disposition itself lives in `src/daemon/state.ts` (`injectMessageIntoCodexTarget` gains a `manualAttempt` option that suppresses the delivery-level rejection transition/event and records the attempt-local event; the late-response callback branches on it). This mirrors the earlier events.ts direct-owner write-set correction.
- **Contract self-review:** passed. The expansion is bounded to additive requestId surfacing plus the manual-only disposition; it introduces no queue/retry, W9/W11/W12, cancellation, durable-replay, stale, or delivery-observability behavior, and leaves the non-manual first-delivery reject path (`failed` + `delivery_target_rejected`) untouched.
- **Acceptance gate (unchanged):** W10 remains active and non-accepted. After the fix and re-verification, the mandatory direct user-operated source Codex TUI retransmit-only verification is still the acceptance gate; the candidate must not be promoted to accepted/completed before that verification and a separate controlling result review. W11 and W12 remain inactive.

### 2026-07-20 · W10 Finding 1/2 remediation implemented — TUI gate pending

- **Confirmed implementation (within Brief revision 4 write-set):** `injectMessageIntoCodexTarget` now takes a `manualAttempt` option; in manual mode it never transitions the original delivery to `failed` and never emits the delivery-level `delivery_target_rejected` (neither immediate nor late). The late-response callback branches on `manualAttempt`: late same-requestId success resolves `unconfirmed → delivered`; late same-requestId reject records an attempt-local `delivery_manual_retransmit_failed` (attempt, requestId, adapter, code, message) and a closure `manualLateResolved` flag makes a duplicate late response a no-op. The non-manual first-delivery reject path (`failed` + `delivery_target_rejected`) is unchanged. Finding 1 (the `unconfirmed → failed` flip on late reject) and Finding 2 (the spurious `delivery_target_rejected` from a manual attempt) are both resolved.
- **Additive transport surfacing:** optional `requestId` added to the Codex inject-failure result across `src/adapters/contract.ts`, `src/adapters/codex/websocket.ts`, and `src/adapters/codex/injector.ts` (immediate error carries `response.id`; late path maps `response.id`). One existing injector assertion in `tests/unit/adapters/codex-injector.test.ts` was updated for the additive field; that test file is added to the write-set as a direct-consumer correction. No W8 transition semantics changed — `codex-ingress.test.ts` and `codex-websocket.test.ts` first-delivery reject behavior is unaffected.
- **Deterministic tests added (`tests/unit/daemon/api.test.ts`):** immediate manual reject, timeout→late-reject (the Finding 1 regression), timeout→late-success, and duplicate-late no-op — each asserting the original stays `unconfirmed` (except the late-success case → `delivered`), zero `delivery_target_rejected`, and the attempt-local event where applicable.
- **Verification:** the exact five-file focused suite (`api` + `codex-mcp-server` + `codex-injector` + `codex-websocket` + `codex-ingress`) passed 133/133; `pnpm typecheck`, `scripts/check-markdown-inline-code` (both specs), `git diff --check`, and package registry integrity all exit 0.
- **Disposition:** W10 remains active and non-accepted. The mandatory direct user-operated source Codex TUI retransmit-only verification against this fixed code has not yet run; it is the acceptance gate, coordinated separately. The candidate must not be promoted to accepted/completed before that verification and a separate controlling result review. W11 and W12 remain inactive; no delivery observability is added.

### 2026-07-20 · W10 revision 4 accepted — requestId containment audit and exact write-set reconciliation

- **User approval:** the revision 4 write-set expansion is approved and must not be reverted. `requestId` is an internal correlation value only, flowing WebSocket transport response → injector → W10 attempt-local audit event; it must not appear in or gain meaning within the canonical envelope, `deliveryId`, source-facing MCP/API payload, or a W12 notification.
- **Containment audit (confirmed facts):** every W10 `requestId` use is contained. `src/adapters/contract.ts` (`AdapterInjectResult.failed.requestId?`), `src/adapters/codex/websocket.ts` (immediate JSON-RPC error detail + error field, sourced from `response.id`), and `src/adapters/codex/injector.ts` (`toInjectFailure`/`toLateInjectResult`) are the internal transport→injector carriers. In `src/daemon/state.ts` `requestId` appears only in `injectMessageIntoCodexTarget`'s internal failed-return type/value and in the two `delivery_manual_retransmit_failed` audit-event emissions (`state.ts:956` immediate, `:1837/1881` late helper). `formatCodexAioxChannelEnvelope` carries no `requestId`; `src/daemon/api.ts` (`DeliveryDto`/`MessageDto`, `RetransmitUnconfirmedDeliveryResponse`) and `src/adapters/codex/mcp-server.ts` (tool response `{ ok, message_id }`) carry no `requestId`. The manual path emits no `delivery_target_rejected`, and `delivery_target_rejected`'s own event data is `{adapter, target, jsonRpc, attempt}` with no `requestId` (asserted at `tests/unit/daemon/codex-ingress.test.ts:2039`), so the future W12 notification (which keys off `delivery_target_rejected`) cannot reach `requestId`. The pre-existing `state.ts:204/2073/2101` `requestId` belongs to proxy `agent_thread_id_rebound` correlation and is unrelated to W10.
- **Exact write-set reconciliation:** every file changed for W10 (archive removal + Finding 1/2 remediation) is within the Brief revision 4 allowed write-set — production: `src/daemon/api.ts`, `src/daemon/state.ts`, `src/adapters/codex/mcp-server.ts`, `src/core/events.ts`, `src/adapters/contract.ts`, `src/adapters/codex/websocket.ts`, `src/adapters/codex/injector.ts`; specs: `docs/specs/aiox-message-lifecycle.md`, `docs/specs/aiox-open-deferred.md`; tests: `tests/unit/daemon/api.test.ts`, `tests/unit/adapters/codex-mcp-server.test.ts`, `tests/unit/adapters/codex-injector.test.ts`; plus this controlling log and the W10 task record. `tests/unit/daemon/codex-ingress.test.ts` is permitted but was not edited. No W10 change lands outside the write-set.
- **Explicit regression coverage (all passing):** first-attempt immediate reject → `failed` + `delivery_target_rejected` (`codex-ingress.test.ts:1987`); first-attempt late reject → `failed`, one `delivery_target_rejected`, idempotent (`codex-ingress.test.ts:2051`); manual immediate reject → `unconfirmed` preserved + attempt-local event with `requestId` (`api.test.ts`); manual timeout → late reject → `unconfirmed` preserved, zero `delivery_target_rejected` (`api.test.ts`); manual timeout → late success → `delivered` (`api.test.ts`); duplicate late response → no-op (`api.test.ts`).
- **Contract self-review:** passed. W8 first-attempt immediate/late reject semantics (`failed` + `delivery_target_rejected`) are unchanged; only the W10 manual attempt immediate/late reject behavior changed (original `unconfirmed` preserved + attempt-local event). `requestId` remains an internal audit correlation value with no source-facing or W12 exposure.
- **Disposition:** W10 remains active and non-accepted. Automated verification is re-run below; the mandatory direct user-operated source Codex TUI retransmit-only verification is still the acceptance gate and must precede any W10 result review. W11 and W12 remain inactive.

### 2026-07-20 19:26 · W10 controlling result review — passed; promotion pending user direction

- **Result-review scope and evidence:** reviewed W10 Brief revision 4, the Attempt 6 candidate evidence, actual API/state/MCP/event/transport chain, and the focused test provenance. The direct source-TUI gate is satisfied: the source tool list showed only `aiox_reply`, `aiox_retransmit_unconfirmed_delivery`, and `aiox_send_message`; after the terminal Enter gate, the response-drop proxy left `w10-6` unconfirmed, the target TUI showed the identical canonical envelope/marker exactly twice, and the final daemon trace showed `w10-6=delivered` with exactly one `delivery_manual_retransmit` event.
- **Scope and contract review — PASS:** daemon and MCP both require duplicate-risk confirmation; the manual path remains direct/non-queued; archive symbols are absent from `src/` and the only test reference is the MCP negative assertion. The manual immediate/late reject and duplicate-late tests preserve `unconfirmed`, emit no `delivery_target_rejected`, and retain requestId only in the attempt-local audit path; non-manual W8 reject semantics remain covered separately. No W11/W12, observability, cancellation, stale, or durable-replay behavior was introduced.
- **Verification re-run — PASS:** the five-file focused suite passed 133/133 at review time. `pnpm typecheck`, both edited-spec inline-code checks, `git diff --check`, and package registry integrity all passed. The initial `delivery_queued` in the live trace is the repository-defined fan-out admission event before first injection; it is not a manual retransmit queue entry, and no additional queue/retry event occurred.
- **Review disposition:** W10 candidate result is technically accepted for promotion: its required automated and direct TUI evidence, scope, and revision-4 semantics pass this review. Per the current user instruction, this entry records review only; W10 remains active/non-accepted until the user explicitly directs the controlling accepted/completed transition. W11/W12 remain inactive.

### 2026-07-20 19:32 · W10 accepted result promotion and session close

- **User acceptance / result promotion:** the user formally accepted the passed controlling review. W10 is accepted and completed as the **retransmit-only** unconfirmed-delivery operator API; archive remains removed, with no retained API, MCP tool, event, documentation, test, or compatibility path.
- **Accepted result digest:** revision 4 confines manual immediate/late reject to an attempt-local failure disposition: the original stays `unconfirmed`, no `delivery_target_rejected` is emitted, and requestId remains internal to the attempt-local audit event; late manual success alone may resolve `delivered`. The direct source-TUI retransmit-only run created `w10-6` unconfirmed by dropping only the matching initial response, completed exactly one retransmit call, showed the same canonical envelope/marker twice in the target TUI, and ended `delivered` with exactly one `delivery_manual_retransmit` event and no automatic retry/requeue. Focused 133/133, typecheck, both spec checks, diff check, and registry check passed.
- **Reconcile:** W10 is `[x]`. W11 may now consume W10 as accepted evidence but remains inactive because it also requires accepted W12. W12 was not started in this session; it is the sole next-session active Work Item. Delivery observability remains an unimplemented separate follow-up candidate. No code, tests, or specifications changed in this promotion.
- **Session close / next pointer:** this session is closed for W10. Next session: execute W12 only; do not start W11, and preserve its inactive dependency gate.

## 2026-07-20 · W12 execution started — canonical notification RED

- **Read-only preflight:** onramp, W10 accepted result, W12 registration/Brief, relevant owner instructions, working-tree scope audit, and the original-reject → state/store → renderer/test path were reread. W11 remains inactive. Existing W12-scope changes are candidate-only; no out-of-scope blocker was identified.
- **RED:** added the smallest immediate same-request reject test. `pnpm exec vitest run tests/unit/daemon/codex-ingress.test.ts --reporter=dot` now fails only the new case: expected one `event`/`notification` message but found zero (59 passing, 1 failing). This is the W12 baseline; no candidate result or acceptance is claimed.

### 2026-07-20 19:55 · W12 atomic persistence GREEN

- W12 atomic persistence GREEN: same-request explicit Codex reject is persisted in one state-level transaction as original `failed`, its `delivery_target_rejected` event, one `origin_kind:"daemon"` / `type:"event"` / `intent:"notification"` message with `outcomeForDeliveryId`, one direct queued delivery to original source A, and a unique original→notification relation. Focused 79 tests and typecheck pass; late duplicate reject remains no-op for events/messages/relations. No renderer, transport dispatch, recursion policy, docs, or TUI work has begun; W11 remains inactive.

### 2026-07-20 20:02 · W12 common renderer GREEN

- W12 renderer GREEN: replaced the Codex-only formatter with one state-level canonical serializer used by both Codex `turn/start` input and Claude `/send` content. Focused ingress tests (60/60), typecheck, and diff check pass. Notification remains queued-only; dispatch/lifecycle, recursion protection, automated full verification, direct TUI evidence, and result review remain pending. W11 remains inactive.

### 2026-07-21 13:22 · W12 session close — renderer GREEN checkpoint

- **Session close checkpoint:** W12 is recorded only through common-renderer GREEN. The accepted-in-session facts are: atomic original `failed` plus exactly one persisted daemon notification/relation; Codex `turn/start` `input.text` and Claude `/send` `content` use the same state-level canonical serializer; and the Claude raw-content RED reached common-renderer GREEN. Focused ingress 60/60, typecheck, diff check, and registry check passed. Notification is still queued-only. Post-commit dispatch, notification lifecycle, recursive-failure prevention, and direct Codex/Claude TUI evidence are unimplemented; W11 remains inactive. **Next pointer:** W12 post-commit dispatch/lifecycle TDD only.

### 2026-07-21 · W12 post-commit dispatch/lifecycle candidate — automated GREEN

- **Confirmed implementation facts:** the state-level reject transaction persists original `failed`, events, one notification message/delivery and the unique relation before returning an exact notification dispatch payload. Only after that return does the caller dispatch the direct stored source target, with daemon source metadata; no network action occurs inside the transaction. The dispatch uses the common canonical renderer already installed for Codex `turn/start` and Claude `/send`, does not consult a reverse route, and does not touch reply rights or `inReplyToDeliveryId`.
- **Focused TDD evidence:** post-commit dispatch tests were RED with no Claude fetch/Codex second `turn/start`, then GREEN for both source kinds. A notification-self-reject regression was RED with two outcome relations, then GREEN with one; notification reject/failure makes only the notification terminal. Late duplicate reject causes no second relation/message/dispatch. A notification post-write timeout leaves the original `failed` and the notification `unconfirmed`, with no automatic reinjection. The existing atomic persistence and common-renderer tests remain GREEN.
- **Automated verification:** ingress 65/65; the exact ingress + Codex injector + Claude channel suite passed 110/110 when permitted to bind loopback. The sandboxed first run failed only the three HTTP-listen tests with `EPERM` before assertions; the permitted rerun passed them. `pnpm typecheck`, `git diff --check`, and package registry integrity passed. The current spec diff belongs to prior W10 candidate work; W12 changed no owner document while non-accepted.
- **Disposition / next pointer:** W12 Attempt 1 is an automated candidate only. Required direct user-operated Codex and Claude TUI scenarios are next; no W12 result review/acceptance occurs in this entry, W11 remains inactive, and delivery-observability scope remains untouched.

### 2026-07-21 · W12 external review response and late-notification regression — candidate maintained

- **Claude review (read-only input, independently checked):** no blocker or major defect was reported. The review confirmed the post-transaction dispatch shape, direct source binding, duplicate guards, recursive-notification guard, original-status isolation, and common serializer. It identified one direct-assertion gap: notification timeout followed by its retained late explicit reject was not covered. Other suggestions (Codex commit-time assertion, cross-adapter byte-equality in one test, direct reply-right row assertion) were judged optional because the current producer path is shared/direct; no production behavior change was recommended.
- **Response / implementation:** added the focused timeout→late-reject regression. It proves the notification transitions from `unconfirmed` to `failed` without a second outcome relation/message or a third `turn/start`, while the original remains `failed`. Focused ingress is now 66/66; `pnpm typecheck`, `git diff --check`, and registry integrity passed. The review's `sourceAgentName:"unknown"` diagnostic observation is delivery observability scope and is deliberately excluded.
- **Next scope, evidence only:** conduct direct user-operated visible TUI scenarios before any result review: (1) Codex as original source A, explicit B reject, then retain source notification envelope plus original/notification ids and final statuses; (2) Claude as A with the equivalent source-visible `/send` content; in each scenario observe a duplicate/late reject produces no extra notification/dispatch. Record these observations in W12 only. W12 remains non-accepted; W11 remains inactive; no delivery-observability change is authorized.

### 2026-07-21 14:25 · W12 inbound marker observation — not source-visible outcome evidence

- **Observed input (not acceptance evidence):** this Codex target conversation visibly received `W12_CODEX_SOURCE_EXPLICIT_REJECT_20260721` and `W12_NOTIFICATION_SELF_REJECT_20260721` as two `aiox.message.v1` envelopes from `agent://local/release/codex-source`, both addressed to `agent://local/release/codex-target`, `type:"instruction"`, `intent:"result"`, and `replyExpected:false`. No daemon-originated `type:"event"` / `intent:"notification"` envelope, original/notification delivery IDs, final statuses, or duplicate-dispatch observation accompanied them. They therefore do not prove W12 source-visible outcome delivery or recursion handling; W12 remains candidate-only and W11 remains inactive.

## 2026-07-21 · W12 direct TUI candidate evidence session close

- **Session-close checkpoint:** Direct user TUI candidate evidence is complete: Codex source and Claude source each visibly received the full daemon-originated canonical notification envelope after B returned a correlated explicit JSON-RPC application reject. In both isolated real-code traces, the original delivery was `failed`; `delivery_target_rejected`, notification message, unique outcome relation, and notification delivery were exactly one; `outcomeForDeliveryId` matched the original; no reply right or `inReplyToDeliveryId` existed; duplicate explicit reject was a no-op; and notification reject was terminal with no recursive notification. The same daemon-rendered Codex `input.text` was sent through the real Claude `/send` injector and recorded byte-for-byte equal at 576 bytes. This is candidate evidence only: W12 remains non-accepted, no result review/accept or W11 activation occurred.
- **Session-close verification:** package registry integrity and `git diff --check` pass. **Next pointer:** W12 controlling result review only; it requires separate user direction before any acceptance/promotion or W11 activation.

### 2026-07-21 14:54 · W12 controlling result review — accepted

- **확인한 사실:** `recordCodexTargetRejectOutcome`는 하나의 SQLite transaction에서 original `delivering`/`unconfirmed` delivery를 `failed`로 전이하고, 상태·`delivery_target_rejected` 이벤트, daemon-originated `event`/`notification` message, 원 source A를 직접 target으로 하는 새 queued delivery, unique `delivery_outcome_notifications` relation을 저장한다. 같은 original의 relation이 있으면 즉시 no-op이고, notification 자체의 reject는 그 notification만 `failed`로 만들고 새 outcome을 만들지 않는다. dispatch는 transaction 반환값에 대해서만 commit 뒤 수행한다.
- **대조 결과:** notification은 새 delivery id를 canonical envelope의 `deliveryId`로 사용하고, stored/envelope `outcomeForDeliveryId`는 original id와 일치한다. reply transaction/right와 `inReplyToDeliveryId` 또는 route lookup을 호출하지 않으며, original source agent id로 direct delivery를 만든다. Codex `turn/start` input text와 Claude `/send` content는 같은 `formatAioxChannelEnvelope`의 한 `JSON.stringify` 결과를 소비한다.
- **검증 사실:** 현재 재실행한 focused Codex ingress + Codex injector + Claude channel은 111/111 passed, `pnpm typecheck`, 두 W10 spec의 inline-code check, `git diff --check`, package registry integrity는 모두 passed다. W12 task record의 최신 direct user-operated TUI candidate evidence는 Codex/Claude source 각각의 full envelope, duplicate no-op, notification reject non-recursion 및 real-Claude-injector byte equality(576 bytes)를 보존한다.
- **Disposition / Reconcile:** W12 revision 2 Attempt 1을 accepted/completed로 수용한다. W12는 W11의 accepted dependency가 되며, W11을 유일한 다음 실행 Work Item으로 표시한다. 이번 review-only 세션에서는 W11을 시작하지 않는다.

### 2026-07-21 14:54 · W12 review session close

- **Session close:** W12 Attempt 1 is accepted/completed and recorded in its task record; W11 now consumes accepted W8/W9/W10/W12 and is the sole `[>]` next Work Item.
- **Final checks:** after the reconcile, package registry integrity and `git diff --check` both passed.
- **Next pointer:** begin W11 only in a later explicitly authorized execution session. This session performed no production, test, spec, or harness implementation change.

### 2026-07-21 15:27 · W11 integration preflight defect and corrective return

- **확인한 사실:** W11 Brief revision 3의 유일한 허용 통합 산출물 `tests/integration/codex-tier3-reliability.test.ts`는 현재 working tree에 없다. 기존 W8–W12 unit suites에는 각 branch의 단위 seam이 있으나, W11이 요구하는 composition-level deterministic matrix를 실행하는 integration artifact는 확인되지 않았다.
- **판정:** 이 누락은 W11의 자동 통합 검증을 막는 결함이다. unit PASS나 W8–W12의 이전 direct-TUI evidence로 대체하거나 W11 candidate/result review를 열지 않는다. 사용자 지시대로 production code, unit test, owner docs, G1-A/freeze artifacts는 수정하지 않았다.
- **반환:** pending W13을 등록했다. W13은 `tests/integration/codex-tier3-reliability.test.ts`만 만들어 W11 matrix 전체를 deterministic composition test로 복구하며, production defect가 발견되면 별도 corrective W로 다시 반환한다. W11은 `[>]` active로 유지하되 W13 candidate/result review를 소비하기 전 자동 검증과 Codex·Claude user-TUI 직접 검증을 시작하지 않는다.
- **정합성:** package registry integrity와 `git diff --check`가 pass했다. G1-C/G1-A closeout은 수행하지 않았다.

### 2026-07-21 · W13 deterministic integration harness candidate

- **확인한 사실:** W13 Attempt 1은 누락됐던 `tests/integration/codex-tier3-reliability.test.ts`를 만들었다. 이 파일은 실제 in-memory SQLite schema, `DaemonState`/`DaemonApi`, Codex `turn/start` injector와 Claude `/send` injector를 조립하고, runtime/transport 결과만 제어한다. 4개 scenario는 pre-write queued retry/TTL/all-or-nothing backpressure, timeout/drop `unconfirmed` 및 late-success dedupe, confirmation-gated non-queued manual retransmit, explicit JSON-RPC reject의 original `failed`/single notification/correlation/no reply right/non-recursion/canonical byte equality를 검증한다.
- **검증 사실:** W13 integration suite 4/4, `pnpm typecheck`, package registry integrity, `git diff --check`가 모두 pass했다. production code, unit tests, owner docs, G1-A/freeze artifact는 수정하지 않았다.
- **상태와 다음 포인터:** 이는 W13 candidate evidence의 기록일 뿐 controlling result review나 result promotion이 아니다. W11은 `[>]` active로 유지하고 W13 controlling review를 소비하기 전 automatic W11 rerun, W11 candidate/result review, TUI verification, G1-C/G1-A closeout을 시작하지 않는다.

### 2026-07-21 · W13 controlling result review — accepted

- **확인한 사실:** review는 W13 Brief revision 1, 새 integration harness와 실제 state/API/schema/injector 경로를 대조했다. runtime/transport만 제어하며, production code·unit tests·owner docs·G1-A/freeze artifacts에는 write가 없다. queue/retry/TTL/backpressure, ambiguous timeout/drop과 late response idempotency, manual confirmation/directness, explicit reject outcome transaction/notification/non-recursion, and the same canonical JSON passed to Codex and Claude transport are each suite assertion으로 존재한다.
- **검증 사실:** W13 suite 4/4, `pnpm typecheck`, package registry integrity, `git diff --check`가 pass했다.
- **Disposition / Reconcile:** W13 revision 1 Attempt 1 candidate를 accepted/completed로 수용한다. W11은 이 accepted automated evidence를 소비할 수 있으나, 아직 W11 candidate/result review나 direct TUI verification을 열지 않는다. 다음 포인터는 W11 automatic evidence consumption이다.

### 2026-07-21 · W11 automatic evidence consumption complete

- **확인한 사실:** W11은 accepted W13 harness를 재실행해 W8/W9/W10/W12 composition matrix의 automatic portion을 소비했다. integration suite 4/4, `pnpm typecheck`, package registry integrity, `git diff --check`가 pass했다. 이번 동작은 production code, unit tests, owner docs, G1-A/freeze artifacts를 수정하지 않았다.
- **상태와 다음 포인터:** W11은 `[>]` active이며 automatic evidence만 완료했다. 다음은 사용자와 함께 실제 Codex와 Claude TUI에서 각 scenario의 state/event/outcome을 확인하고 W11 record에 기록하는 일이다. 이 entry는 W11 candidate result/result review, G1-C/G1-A closeout을 수행하거나 암시하지 않는다.

### 2026-07-21 · W11 direct user TUI evidence complete

- **확인한 사실:** 사용자가 isolated real-runtime harness에서 remote Codex source와 Claude source를 각각 직접 조작했다. 두 source TUI 모두 B의 controlled explicit JSON-RPC reject 뒤 full daemon-originated canonical notification envelope를 표시했다. Codex trace는 original `w12-8` `failed`, notification `w12-18` `delivered`, one rejection event/message/relation/delivery, correlation match, no reply right/`inReplyToDeliveryId`, duplicate no-op 및 notification reject non-recursion을 기록했다. Claude trace도 original `w12-43` `failed`, notification `w12-53` `delivered`와 같은 one/correlation/no-reply/duplicate invariant을 기록했다. Real Claude injector equality probe는 Codex `input.text`와 Claude `/send` content가 모두 576 bytes이며 `equal:true`임을 기록했다.
- **검증 사실:** direct evidence를 W11 Attempt 3a/3b에 기록한 뒤 package registry integrity와 `git diff --check`가 pass했다.
- **상태와 다음 포인터:** W11은 `[>]` active다. automatic 및 direct-TUI evidence는 완결됐지만, 이 entry는 W11 candidate result/result review, G1-C/G1-A closeout을 수행하지 않는다. 별도 사용자 지시가 있을 때만 W11 candidate/result review를 진행한다.

### 2026-07-21 · W11 candidate result review — accepted and G1-C closeout-ready

- **확인한 사실:** W11 Brief revision 3, W8/W9/W10/W12의 accepted controlling dispositions, W13의 accepted composition harness, W11 Attempts 2–3b의 direct evidence, 그리고 현재 `tests/integration/codex-tier3-reliability.test.ts`를 대조했다. 실제 재실행 `pnpm exec vitest run tests/integration/codex-tier3-reliability.test.ts --reporter=dot`은 4/4 PASS였고, `pnpm typecheck`, package registry integrity, `git diff --check`도 PASS였다. Matrix는 pre-write retry/queue/TTL/backpressure와 serialized gate, post-write timeout/drop→`unconfirmed`·자동 재주입 없음, late success/dedupe, confirmation-gated non-queued retransmit, explicit reject의 original `failed`·정확히 하나의 notification, `outcomeForDeliveryId`·no reply-right/`inReplyToDeliveryId`, duplicate reject no-op, notification reject/failure non-recursion, Codex/Claude canonical JSON byte equality를 검증한다.
- **분리한 expected injection outcome:** `dispatch.failed: codex_jsonrpc_error`는 harness의 `ControlledCodexRuntime`이 B의 explicit JSON-RPC application reject를 재현하려고 의도적으로 주입한 outcome이다. 이 값은 original-delivery failed/one-notification branch의 expected input이며, matrix failure나 dispatch failure로 집계하지 않는다.
- **직접 TUI evidence:** W11 record Attempts 3a/3b는 사용자가 실제 Codex source와 Claude source TUI를 각각 조작했고, 둘 다 full daemon-originated notification을 표시한 것을 보존한다. Codex는 `w12-8`→`w12-18`, Claude는 `w12-43`→`w12-53` trace로 original failed, 하나의 event/message/relation/delivery, correlation, no reply-right/`inReplyToDeliveryId`, duplicate no-op, notification-reject non-recursion을 기록한다. Real Claude injector byte probe는 576-byte/`equal:true`다.
- **Disposition / Reconcile:** W11 revision 3 Attempt 4를 accepted/completed로 수용하고 W11을 `[x]`로 reconcile한다. 모든 executable Work Item이 completed이고 Registry Integrity가 통과하므로 G1-C는 **closeout-ready**다. 이번 세션에는 G1-C package closeout 또는 G1-A closeout을 실행하지 않는다.
- **다음 세션 pointer:** G1-C package closeout만 시작한다. G1-A closeout은 이 package closeout의 결과를 Return Target에서 소비할 때까지 시작하지 않는다.

### 2026-07-21 · W14 closeout pointer registration

- **Reconcile:** closeout-ready 상태를 실행으로 오인하지 않도록 W14를 log-only Compact task로 등록하고 유일한 `[>]` next pointer로 둔다. W14는 다음 세션의 package closeout checklist/registry/result-consumption/Return Target handoff만 소유하며, production code, test, spec, harness 또는 G1-A closeout을 허용하지 않는다.

## 2026-07-21 · W14 package closeout

- **Closeout gates:** Registry Integrity Check passed for W1–W14. The Result Consumption Gate passed: controlling dispositions accept W1–W13, including W8/W9/W10/W12 accepted dependencies, W13's accepted harness, and W11's accepted integrated result; no candidate disposition remains for an executable Work Item.
- **Current verification:** `pnpm exec vitest run tests/integration/codex-tier3-reliability.test.ts --reporter=dot` passed 4/4; `pnpm typecheck` and `git diff --check` passed; the package registry check passed. The accepted matrix covers the bounded G1-C reliability boundary, and direct user-TUI evidence for implemented branches is preserved in their accepted task records.
- **Owner/handoff check:** the accepted operator lifecycle and deferred boundary are already reflected in their owner specs; this log does not duplicate them. No package-owned implementation, test, specification, or unresolved artifact correction remains. The Return Target digest is ready for `logs/G1/2026-07-18-G1-A-Codex-structured-ingress-evidence.md` W3, but G1-A's actual result consumption and closeout remain a separate owner action and were not performed here.
- **Disposition / Reconcile:** W14 is completed. All package Work Items are completed, no local actionable pointer remains, and G1-C is closed as decided.

### 2026-07-21 20:16 · W14 accepted result and G1-A handoff supplement

- **W11 review/reconcile confirmation:** W11 revision 3 Attempt 4 remains accepted/completed after its controlling review: the accepted W8/W9/W10/W12 results, accepted W13 composition harness, deterministic matrix, and retained direct Codex/Claude user-TUI evidence were consumed. Its controlled `codex_jsonrpc_error` is the intended explicit-reject input, not a matrix failure.
- **Accepted package closeout result:** W14's Registry Integrity and Result Consumption gates pass. The current integration matrix is 4/4 PASS, and typecheck, whitespace, and package registry checks pass. The accepted boundary is process-lifetime delivery correlation: pre-write retry/queue/TTL/backpressure, post-write `unconfirmed` without automatic reinjection, idempotent late success, confirmation-gated direct retransmit, and explicit reject with exactly one daemon-originated notification.
- **Residual Tier 3 limitations:** this result does not claim Tier 2/native activity semantics, target work completion, automatic receipt beyond the bounded correlated `turn/start` acceptance, daemon-restart durable replay/mailbox, time-based stale inference, remote cancellation, retention, reply-right cleanup, or delivery-observability work. Codex's user-facing rendering remains the canonical envelope JSON rather than a native activity presentation; that limitation is preserved, not normalized into an acknowledgement claim.
- **G1-A Return Target handoff:** `logs/G1/2026-07-18-G1-A-Codex-structured-ingress-evidence.md` W3 may now consume this accepted result. It must retain the Tier 3 disposition: correlated JSON-RPC acceptance is delivery acceptance only, not target receipt/work completion; unresolved native activity/raw-JSON UX and delivery-observability gaps remain explicit. G1-A owns the consumption/reconcile; this package makes no G1-A closeout transition.
- **Disposition:** this supplements, without changing, the accepted W14 closeout result. G1-C remains decided.

### 2026-07-21 20:16 · W14 long-log split review

- **Split review:** the 605-line soft threshold is exceeded, but this is a decided, single-lifetime controlling package record with stable task locators and no remaining local Work Item. Splitting it now would add migration/pointer risk without improving a future execution path. No split is required; the accepted W14 supplement is the final package record.

## 2026-07-22 · W15 registration and Q2 corrective contract review

- **Reopening (append-only):** the W14 `decided` closeout is reopened as *non-final* to register a Q2 corrective. No W1–W14 accepted history is rewritten. The user directive's "W13" id is already consumed (W13 = deterministic integration harness, W14 = package closeout), so the corrective is registered as **W15**, the next available id; the directive's model, invariants, and test matrix are applied unchanged.
- **확인한 사실 (Q2 defect, current code):** the manual retransmit path emits two terminal `delivery_manual_retransmit_failed` events for one attempt when a timeout is followed by a late reject — immediate at `src/daemon/state.ts:956` (reason `codex_turn_start_timeout`, because `injectMessageIntoCodexTarget` returns `kind:"failed"` via `src/adapters/codex/injector.ts:66-68`) and late at `src/daemon/state.ts:1974`. A timeout→late-success attempt emits the immediate `_failed` yet ends `delivered`. The closure flag `manualLateResolved` (`state.ts:1950`) dedupes only late callbacks against each other, not against the immediate emission. Existing tests (`tests/unit/daemon/api.test.ts:160-247`) filter `delivery_manual_retransmit_failed` by the `codex_jsonrpc_error` flavor and never count the immediate `codex_turn_start_timeout`-flavored event, so the defect was uncaught.
- **Distinct from W10 Finding 1/2:** revision 4 already fixed the original→`failed` flip and the spurious `delivery_target_rejected` from a manual attempt (verified: manual path at `state.ts:1961-1981` does not call `recordCodexTargetRejectOutcome`, unlike the non-manual path at `:1991-2007`/`:2038-2051`). Q2 is the event-cardinality residual of that fix, not a regression of it.
- **`delivery_manual_retransmit_failed` fate (traced):** declared `src/core/events.ts:14`, produced only `src/daemon/state.ts:956,1932`, consumed only `tests/unit/daemon/api.test.ts:146,187,244`; no CLI/format/UI/owner-doc consumer. It is removed and replaced by the lifecycle events with no deprecated alias or dual-write.
- **Selected model (contract review):** manual retransmit attempt lifecycle — start `delivery_manual_retransmit` (unchanged); post-write timeout/response-loss/WS-drop → non-terminal `delivery_manual_retransmit_unconfirmed` (original stays `unconfirmed`); immediate or late same-`requestId` success → terminal `delivery_manual_retransmit_delivered` (original → `delivered`); immediate or late same-`requestId` JSON-RPC application reject → terminal `delivery_manual_retransmit_rejected` (original stays `unconfirmed`). Exactly one terminal event per `{deliveryId, attempt, requestId}`; duplicate late is a no-op; audit events append-only; `requestId` internal-only; manual reject never emits `delivery_target_rejected`, a W12 notification/relation, or a reply-right; the non-manual first-delivery reject (`failed` + `delivery_target_rejected`) path is unchanged. W15 Brief revision 1 carries the objective, write-set, invariants, and the eight-case deterministic test matrix.
- **Contract review disposition — PASS:** the W15 write-set (`src/core/events.ts`, `src/daemon/state.ts`, `tests/unit/daemon/api.test.ts`, `tests/integration/codex-tier3-reliability.test.ts`, and conditionally `src/daemon/api.ts` / `docs/specs/aiox-message-lifecycle.md`) is a subset of the existing Package Scope, so no Scope expansion is required. Scope revision 8, Verification Contract revision 9, and Closeout Contract revision 7 now carry the W15 invariants and the "not finally closed until W15 accepted" reopening note. Execution (TDD) may begin only under this contract. One bounded contract sub-decision is deferred to execution: whether `retransmitUnconfirmedDelivery`'s immediate result reason should stop surfacing a timeout as `manual_retransmit_failed` (touches `src/daemon/api.ts`); it must not expose `requestId` source-facing.
- **정합성:** `package-log check` and `.agents/skills/log/scripts/log check` pass (status `open`, W15 the sole `[>]`, registry integrity OK); `git diff --check` exit 0. No production, test, or spec code changed in this registration.
- **Reconcile / next pointer:** W15 is the sole active Work Item and G1-C is `open` (reopened). Its Return Target must not be consumed for G1-A closeout until W15 is accepted and the package is re-closed. G1-A W3/W4 closeout, X1/X2 cleanup, and D/P/C/T owner drift are out of W15 scope. Next: execute W15 via TDD under the reviewed contract.
- **Long-log note:** 615 lines (soft ≥ 600). Per the Long Log Split Guard this is a single-lifetime controlling package record reopened for a bounded corrective; splitting mid-correction adds pointer/migration risk without a lifetime boundary, so no split is taken.

## 2026-07-22 · W15 Brief revision 2 and contract review

- **User direction (reason for revision 2):** the earlier judgment to leave the source-facing API return contract out of W15 scope was rejected. If a post-write timeout is redefined as provisional/`unconfirmed`, then `retransmitUnconfirmedDelivery` and the Codex MCP tool must not express that timeout as a definitive `manual_retransmit_failed`. This revision aligns the operator-facing result with the provisional lifecycle as a direct-consumer correction, not a new observability feature.
- **확인한 사실 (current consumer surface, all in Package Scope):** the daemon result reasons live at `src/daemon/state.ts:436` (`RetransmitUnconfirmedDeliveryResult`) and `src/daemon/api.ts:262-267` (`RetransmitUnconfirmedDeliveryResponse` + `mapRetransmitUnconfirmedDeliveryResult` at `:507-511`). The MCP handler `createRetransmitUnconfirmedDeliveryHandler` (`src/adapters/codex/mcp-server.ts:322-343`) renders any `!result.ok` through `errorResult`, so a timeout currently surfaces to the operator as an error — the exact misrepresentation the user flagged. The spec `docs/specs/aiox-message-lifecycle.md:214-217` lumps manual "error/reject" together as preserving `unconfirmed`. All of these (api.ts, mcp-server.ts, codex-mcp-server.test.ts, the spec) are already inside Package Scope, so revision 2 needs no Scope expansion.
- **Selected operator-facing result model (Brief revision 2):** the `retransmitUnconfirmedDelivery` result and MCP tool reflect the **immediate** outcome (late resolution is observed via status + terminal event, since the tool has already returned). Immediate success → `ok:true` (delivered). Post-write ambiguity (write issued; timeout/response-loss/WS-drop/binding-uncertain acknowledgement) → `ok:false, reason:"manual_retransmit_unconfirmed"` ("target acceptance unknown"), rendered by the MCP tool as a **non-error** result (not `errorResult`), original stays `unconfirmed`. Explicit immediate JSON-RPC application reject → `ok:false, reason:"manual_retransmit_rejected"`, original stays `unconfirmed`. No-attempt failure (no write issued: unresolved target, runtime unavailable/deferred, resume failed, missing ready runtime/bound thread) → `ok:false, reason:"manual_retransmit_failed"` (retained but narrowed), MCP error, original unchanged.
- **Naming distinction (avoid conflation):** the **event kind** `delivery_manual_retransmit_failed` is still removed (replaced by `delivery_manual_retransmit_unconfirmed`/`_delivered`/`_rejected`). The **API result reason** string `manual_retransmit_failed` is a distinct identifier that is retained but narrowed to no-attempt failures only. `requestId` is never surfaced through any of these result/text paths.
- **Contract review disposition — PASS:** Brief revision 2 adds the API/MCP/test/spec consumers to the W15 write-set (all already in Package Scope), and extends the deterministic matrix to nine cases each asserting event + delivery status + API result reason (plus MCP tool text where the tool path runs). Package Scope revision 9, Verification Contract revision 10, and Closeout Contract revision 8 now carry the operator-facing alignment. The non-manual first-delivery reject path (`failed` + `delivery_target_rejected`) and the W12/reply-right boundaries remain unchanged.
- **정합성:** `package-log check` registry-integrity OK and `git diff --check` exit 0 after this revision (no production/test/spec/API/MCP code changed — this session only records Brief revision 2 and its contract review).
- **Session close / next pointer:** this session performed only W15 Brief revision 2 and its controlling contract review. No RED test and no production, test, spec, API, or MCP implementation change was made. W15 remains `[>]` active and G1-C remains `open`. **Next session:** open `logs/G1/2026-07-20-G1-C-codex-tier3-reliability.md` explicitly (G1-C is `open`; `scripts/onramp`'s default active log is G1-A, so this path must be named) and execute W15 under Brief revision 2 — TDD RED → GREEN for the event + delivery-status + API-result (and MCP-text) matrix, then the post-acceptance W11 composition re-run. Do not start W11 re-verification, G1-C re-closeout, or G1-A W3/W4 consumption/closeout until W15 is accepted.

## 2026-07-22 · 2026-07-22 · W15 implementation GREEN candidate checkpoint

- **Confirmed candidate implementation:** the manual path now emits `delivery_manual_retransmit_delivered` once on immediate/late success, `delivery_manual_retransmit_rejected` once on immediate/late correlated JSON-RPC reject, and `delivery_manual_retransmit_unconfirmed` once for post-write ambiguity. Deferred no-write eligibility remains API `manual_retransmit_failed` with no terminal lifecycle event. The removed `delivery_manual_retransmit_failed` event has zero remaining `src/`, `tests/`, or `docs/` references. The non-manual first-delivery rejection branch remains isolated and its owner regression stays green.
- **Operator result alignment:** state/API classify post-write ambiguity as `manual_retransmit_unconfirmed` and explicit reject as `manual_retransmit_rejected`; the MCP returns non-error text stating target acceptance unknown/unconfirmed only for the former, while reject/no-attempt outcomes remain errors. No source-facing result, MCP text/structured content, or canonical envelope adds `requestId`.
- **Focused verification — PASS:** `pnpm exec vitest run tests/unit/daemon/api.test.ts tests/unit/adapters/codex-mcp-server.test.ts tests/unit/daemon/codex-ingress.test.ts tests/unit/core/events.test.ts` (4 files, 130 tests); `pnpm typecheck`; `scripts/check-markdown-inline-code docs/specs/aiox-message-lifecycle.md`; `git diff --check`; `.agents/skills/log/scripts/package-log check logs/G1/2026-07-20-G1-C-codex-tier3-reliability.md`.
- **Candidate-only disposition / remaining gates:** W15 stays `[>]` and G1-C stays `open`. No result review or accepted transition is performed. The global direct user-TUI scenario is not run in this session; W15 controlling result review and acceptance remain required. Only after acceptance may W11 composition `tests/integration/codex-tier3-reliability.test.ts` be re-run, followed by G1-C re-closeout. G1-A consumption/closeout is not started.

## 2026-07-22 · 2026-07-22 · W15 independent-review blocker correction candidate checkpoint

- **Confirmed corrective:** manual retransmit now resolves ready Codex runtime + authoritative bound thread before incrementing `manualDeliveryAttempts` or appending `delivery_manual_retransmit`. If that eligibility check fails, the API returns only `manual_retransmit_failed`; the original delivery remains `unconfirmed` and no start, unconfirmed, delivered, or rejected manual lifecycle event is appended. The resolved target is passed into the actual injector call, so the start event represents an eligible direct write attempt rather than a deferred resolution probe.
- **TDD evidence:** added the case-9 assertion that the no-attempt path has zero `delivery_manual_retransmit` events; its focused RED run failed exactly there (received 1). The production preflight makes that test GREEN. The timeout→late-success case now sends the same late success twice and confirms delivered status plus exactly one delivered terminal event; the existing duplicate late-reject test remains.
- **Focused verification — PASS:** `pnpm exec vitest run tests/unit/daemon/api.test.ts tests/unit/adapters/codex-mcp-server.test.ts tests/unit/daemon/codex-ingress.test.ts tests/unit/core/events.test.ts` (4 files, 130 tests); `pnpm typecheck`; `scripts/check-markdown-inline-code docs/specs/aiox-message-lifecycle.md`; `git diff --check`; `.agents/skills/log/scripts/package-log check logs/G1/2026-07-20-G1-C-codex-tier3-reliability.md`.
- **Candidate-only disposition / remaining gates:** this corrects the independent review blocker but does not perform W15 result review, acceptance, Work Item transition, W11 rerun, or G1-C re-closeout. W15 remains `[>]` active and G1-C remains open; direct user-TUI evidence and controlling result review/explicit acceptance are still required before the post-acceptance W11 composition rerun.

## 2026-07-22 · W15 implementation candidate result review — blocked

- **확인한 사실:** Brief revision 2의 구현 경로는 preflight가 ready runtime과 bound thread를 확인한 뒤에만 attempt/start event를 할당하며, no-attempt API 결과는 `manual_retransmit_failed`, original은 `unconfirmed`, start 포함 manual lifecycle event는 0이다. 이 start=0 assertion은 `tests/unit/daemon/api.test.ts`에 실제로 있다. 성공·timeout·immediate/late reject·duplicate late success/reject의 state/event/API 분리, MCP non-error uncertainty, non-manual `failed` + `delivery_target_rejected` 및 W12 notification 회귀, source-facing API/MCP/canonical envelope의 `requestId` 비노출은 현재 source와 해당 test surface에서 대조했다. Candidate record의 focused four-file 130-test PASS, typecheck, spec inline-code, diff check, registry check는 명령과 대상 파일 범위가 Brief의 relevant consumers와 일치한다. 이번 read-only review에서 package registry check와 `git diff --check`도 다시 PASS했다.
- **남은 concern / exact blocker:** Brief case 8은 manual reject가 reply-right를 만들지 않는 것을 요구하지만, 새 manual-reject test는 `delivery_target_rejected`, outcome notification, message relation만 0으로 assert하고 `reply_rights` row의 부재는 assert하지 않는다. 또한 post-write ambiguity classifier가 timeout/response-loss/WS-drop을 함께 포함하는 반면, manual attempt matrix는 timeout만 직접 주입한다. 따라서 reply-right isolation과 manual WS-drop `_unconfirmed` observation은 현재 테스트로 계약을 직접 증명하지 못한다.
- **판단:** W15 implementation candidate result review는 PASS가 아니다. W15는 `[>]` active/candidate, G1-C는 open으로 유지한다. blocker 해소와 별도의 direct user-TUI evidence/result review 전에는 accepted/completed 전환, W11 재실행, G1-C re-closeout 또는 G1-A 작업을 시작하지 않는다.

## 2026-07-22 · W15 candidate result review

- candidate result review PASS; direct TUI evidence pending; not accepted

## 2026-07-22 · W15 direct-TUI MCP output-schema corrective candidate

- **확인한 사실 (user-operated evidence):** the temporary W15 harness used response-drop for the original and exactly one manual retransmit. The source Codex TUI exposed `aiox_retransmit_unconfirmed_delivery` and called it once with `deliveryId:"w15-6"` plus `confirmDuplicateRisk:true`. The target displayed the canonical envelope marker on original and retransmit; daemon observation recorded `delivery_manual_retransmit:1`, `delivery_manual_retransmit_unconfirmed:1`, `delivery_manual_retransmit_delivered:0`, and original status `unconfirmed`. The source TUI did not render the required non-error uncertainty text: it showed `Output validation error: Tool aiox_retransmit_unconfirmed_delivery has an output schema but no structured content was provided`.
- **확인한 원인:** `createRetransmitUnconfirmedDeliveryHandler` returned content-only for `manual_retransmit_unconfirmed`, whereas the registered retransmit tool had an output schema for only `{ ok:true, message_id }`. The installed MCP SDK validates non-error tool output against that schema and rejects missing structured content. This is a direct source-TUI result-contract defect, not a daemon lifecycle/event-cardinality failure.
- **Attempt 4 candidate corrective (TDD):** a RED assertion required the unconfirmed branch to return structured content and failed because it was absent. GREEN returns `{ ok:false, reason:"manual_retransmit_unconfirmed", message_id }` with the existing target-acceptance-unknown text, and the retransmit-only output schema now admits the success and unconfirmed shapes. A registered-schema assertion prevents this non-error shape from drifting out of the schema. `pnpm exec vitest run tests/unit/adapters/codex-mcp-server.test.ts --reporter=dot` passed 32/32 after GREEN; `pnpm typecheck` and `git diff --check` passed.
- **Disposition / next evidence:** candidate only. W15 remains `[>]` and G1-C remains open. A new user-operated W15 run must confirm the source Codex TUI displays the non-error target-acceptance-unknown result without output validation error, while retaining the exact-one start / `_unconfirmed` event trace and target retransmit marker. No W15 acceptance/completion, W11 composition run, G1-C re-closeout, or G1-A work is performed here.

## 2026-07-22 · W15 post-fix direct-TUI evidence candidate

- **확인한 사실 (user-operated source and target TUI):** after the output-schema corrective, source Codex listed `aiox_retransmit_unconfirmed_delivery`, called it exactly once with `deliveryId:"w15-6"` and `confirmDuplicateRisk:true`, and displayed `manual retransmit sent for w15-6; target acceptance unknown (unconfirmed)` without validation error. Target visibly displayed the same canonical `aiox.message.v1` marker envelope on the original and retransmit.
- **확인한 사실 (harness/daemon trace):** original `w15-6` remained `unconfirmed`; manual start was recorded at `2026-07-22T09:52:03.314Z`; one `delivery_manual_retransmit_unconfirmed` observation followed at `2026-07-22T09:52:03.318Z`; cardinality was `delivery_manual_retransmit:1`, `_unconfirmed:1`, `_delivered:0`. The response-drop proxy recorded a forwarded `turn/start` plus matching dropped response for both original and manual retransmit, and its source-frame observation saw the target-acceptance-unknown text once.
- **판단 / disposition:** this closes the direct-TUI evidence gap for the post-write ambiguity branch and confirms the output-schema corrective in the actual Codex TUI. It is candidate evidence for the still-required W15 controlling result review only. W15 remains `[>]`, G1-C remains open, and this entry does not perform acceptance/completion, W11 composition, G1-C re-closeout, or G1-A work.

## 2026-07-22 · 2026-07-22 · W15 final result review and acceptance

- **확인한 사실:** W15 Brief revision 2, task-record candidate evidence, prior candidate review, and post-fix direct-TUI evidence were re-read against the current source and focused tests. The no-attempt path has no start or terminal manual event and retains only API/MCP `manual_retransmit_failed`. Timeout, response loss, and actual post-write WS-drop map to exactly one `_unconfirmed` observation with immediate MCP non-error target-acceptance-unknown text; immediate/late success and reject map to the required terminal event/status outcomes, and duplicate late responses are no-ops. Manual reject has zero `delivery_target_rejected`, W12 notification/relation, and reply-right rows; the non-manual rejection regression remains in the ingress suite. `requestId` is absent from source-facing API/MCP result contracts and canonical-envelope output.
- **자동 검증:** current focused command passed 4 files / 133 tests (the record’s prior 132-test PASS checkpoint remains historical evidence; the additional passing test is the subsequent coverage strengthening), plus `pnpm typecheck` and `scripts/check-markdown-inline-code docs/specs/aiox-message-lifecycle.md`.
- **직접 TUI evidence:** source Codex called `aiox_retransmit_unconfirmed_delivery` once and displayed the non-error `target acceptance unknown (unconfirmed)` result; target received original and retransmit canonical-envelope markers. The response-drop trace recorded manual start=1, `_unconfirmed`=1, `_delivered`=0, original `unconfirmed`, and dropped matching responses for original/manual attempts.
- **Result review / disposition:** PASS — accept W15 Brief revision 2, Attempt 5 evidence in full. Task Index mapping and canonical W15 record remain unchanged and registry-valid. This is result consumption, not package closeout: G1-C remains `open`; W11 is now the sole active Work Item for integrated re-verification. W11 is not executed in this session.
- **Reconcile / next pointer:** W15 is completed; W11 is `[>]` and its existing task record is the only local execution entry. Do not begin G1-C re-closeout, G1-A W3/W4 consumption/closeout, or unrelated work in this session. Next: W11 integrated re-verification under its existing Brief, consuming accepted W15.

## 2026-07-22 · W11 integrated re-verification candidate checkpoint

- **Scope and dependency matrix — PASS:** re-read the current W11 Brief plus Verification/Closeout Contracts and consumed accepted W8/W9/W10/W12/W15 records. W8/W9 cover pre-write bounded queue/retry/TTL/backpressure and post-write `unconfirmed` with no automatic reinjection; W8 covers late same-request success/duplicate no-op and first-attempt explicit reject → `failed` + `delivery_target_rejected`. W15 covers no-attempt with no manual start, timeout/drop → `manual_retransmit_unconfirmed` plus MCP non-error, reject → `manual_retransmit_rejected` with original `unconfirmed` and no W12 notification/relation/reply-right, success → delivered, duplicate-late no-op, and source-facing `requestId` non-exposure. W12 covers exactly-once daemon notification after primary reject, shared byte-identical Codex/Claude canonical JSON, duplicate reject no-op, and non-recursive notification failure/reject.
- **Integrated automated matrix — PASS:** `pnpm exec vitest run tests/integration/codex-tier3-reliability.test.ts --reporter=dot` passed 1 file / 4 tests. Its four composition cases re-exercised pre-write queue/retry/TTL/backpressure, timeout/drop → `unconfirmed` with no reinjection plus late-success dedupe, confirmation-gated direct non-queued manual retransmit, and primary reject notification/canonical-renderer/recursion behavior. It does not independently expand W15's full manual event/API matrix; that remains accepted dependency evidence, not an unverified inference.
- **Direct TUI consumption — PASS:** W12's accepted direct user-operated Codex and Claude source-TUI evidence satisfies the current Brief's two source-TUI notification scenarios (including exact state/event/outcome and canonical bytes). W15's accepted direct user-operated Codex TUI response-drop evidence supplies the revised manual-retransmit uncertainty path. The current W11 Brief requires Codex and Claude scenarios but does not require a new Claude manual-retransmit interaction after W15; no new user action was required or performed.
- **Session verification — PASS:** `.agents/skills/log/scripts/package-log check logs/G1/2026-07-20-G1-C-codex-tier3-reliability.md` reported registry integrity OK; `git diff --check` passed with no output. No production code, API, spec, owner document, harness, or test was changed.
- **Disposition:** candidate checkpoint only. W11 remains the sole `[>]` Work Item and G1-C remains `open`; this entry does not accept/complete W11, start G1-C re-closeout, consume G1-C in G1-A W3/W4, or reflect owner documents.

## 2026-07-22 · W11 final result review and acceptance

- **확인한 사실:** W11 Brief revision 3, Attempt 5 candidate checkpoint, the actual four-case integration source, and accepted W8/W9/W10/W12/W15 records were re-read together. The rerun `pnpm exec vitest run tests/integration/codex-tier3-reliability.test.ts --reporter=dot` passed 1 file / 4 tests. Its direct coverage is pre-write queue/retry/TTL/backpressure, post-write timeout/drop → `unconfirmed` with zero reinjection and late-success dedupe, confirmation-gated direct/non-queued manual retransmit, and primary reject → original `failed`, exactly-one notification, canonical renderer equality, duplicate no-op, and non-recursion. It does not itself rerun W15's nine-case event/status/API/MCP matrix; the accepted W15 record owns that focused proof, including no-attempt start=0, uncertainty/non-error, reject isolation, duplicate-late, and `requestId` containment. This division matches Closeout Contract revision 8, which requires W15's deterministic matrix and then a passing W11 composition rerun.
- **직접 TUI 조건:** W12's accepted user-operated Codex and Claude source-TUI scenarios provide the two notification scenarios required by the current W11 Brief, including observed state/event/outcome and 576-byte canonical equality. W15's accepted user-operated Codex response-drop scenario provides the revised manual uncertainty path. The current W11 Brief requires direct Codex and Claude scenarios but does not add a Claude-specific manual-retransmit scenario; no new user interaction was required or performed.
- **Result review / disposition:** PASS — accept W11 Brief revision 3, Attempt 5 re-verification checkpoint in full. This is acceptance of the composed evidence, not a claim that the four-test integration file independently duplicates every W15 focused assertion.
- **Reconcile / next pointer:** W11 is completed. G1-C remains `open` because its reopened package closeout has not been re-reviewed. W14 is the sole `[>]` next Work Item, limited to G1-C re-closeout review. Do not start that review, consume G1-C in G1-A, or reflect owner documents in this result-review session.

## 2026-07-22 · W14 re-closeout review

- **확인한 사실 — Q2/W15:** accepted W15 Brief revision 2 and its current source/test consumers were rechecked. The no-attempt eligibility path returns only `manual_retransmit_failed` and records zero manual lifecycle events. A post-write timeout, response loss, or WS drop records one non-terminal `delivery_manual_retransmit_unconfirmed` observation and preserves the original `unconfirmed`; immediate/late success and immediate/late explicit reject each record their distinct terminal event exactly once. The current focused matrix includes duplicate late-response no-op, manual-reject isolation from `delivery_target_rejected`/W12 notification/relation/reply-right, and source-facing `requestId` non-exposure. The MCP schema/unit consumer preserves the non-error target-acceptance-unknown result for `_unconfirmed`, while reject and no-attempt failure remain distinct error outcomes.
- **확인한 사실 — accepted package contract:** W8 supplies retained canonical `deliveryId ↔ requestId` correlation and idempotent late-response handling; W9 supplies bounded pre-write FIFO queue/retry/backpressure and keeps `unconfirmed` out of flush; W10 supplies confirmation-gated direct non-queued retransmit; W12 supplies exactly-once explicit primary-reject notification with canonical Codex/Claude rendering and non-recursion. Accepted W11 Attempt 6 re-ran the four-case composition matrix after W15 and consumes W15's detailed focused proof and direct Codex TUI evidence, alongside W12's direct Codex/Claude TUI evidence.
- **이번 review 재검증:** `pnpm exec vitest run tests/unit/daemon/api.test.ts tests/unit/adapters/codex-mcp-server.test.ts tests/unit/daemon/codex-ingress.test.ts tests/unit/core/events.test.ts --reporter=dot` passed 4 files / 133 tests; `pnpm exec vitest run tests/integration/codex-tier3-reliability.test.ts --reporter=dot` passed 1 file / 4 tests; `pnpm typecheck` passed. Final `.agents/skills/log/scripts/package-log check logs/G1/2026-07-20-G1-C-codex-tier3-reliability.md` reported every W1–W15 identity and registry integrity `OK`; final `git diff --check` passed with no output.
- **closeout 판정:** Registry Integrity, Result Consumption, contract/artifact integrity, required verification, accepted direct TUI evidence, and W15→W11 corrective revalidation gates all pass. G1-C is therefore `decided`; W14 is completed and no local `[>]` remains. This closes only the bounded process-lifetime Tier 3 reliability boundary: canonical correlation, queue/retry/backpressure, non-automatic post-write ambiguity, manual retransmit, and primary explicit-reject notification.
- **명시적 제외/후속 ownership:** daemon-restart durable replay/mailbox, heartbeat or time-based stale inference, native TUI tool-activity/native activity semantics, remote cancellation, retention, reply-right cleanup, and delivery observability are not G1-C completion claims. Their existing spec/roadmap deferred owners remain unchanged; they require a later G1-A/Phase 2 or separate workstream decision, not a corrective G1-C Work Item.
- **owner handoff readiness (read-only):** `docs/specs/aiox-message-lifecycle.md` already owns and states W15's manual retransmit event/result boundary, including `_unconfirmed` vs terminal success/reject and reject isolation. `docs/architecture/local-runtime-codex-adapter.md` and `docs/architecture/local-runtime-routing-and-delivery.md` already describe the as-built correlation, `unconfirmed`/late-success and manual-reject-local boundaries at their architecture altitude. The existing decisions retain their rationale without a new decision-worthy policy. Thus no owner-document drift is proven for G1-A W4 to repair; no owner document was modified in this review.
- **G1-A handoff reconciliation (pointer-only):** the protected G1-A consumer log was read only. Its W3 is already marked completed from the prior W14 closeout and W4 is its current pointer; this Q2 re-closeout cannot be made G1-A's next pointer without reopening/modifying that protected consumer log, which this review is forbidden to do. The authoritative return target remains G1-A W3: it must re-consume this now-decided W15-corrected G1-C result before any later G1-A closeout claim. Parent consumption is deliberately not a G1-C closeout blocker.
