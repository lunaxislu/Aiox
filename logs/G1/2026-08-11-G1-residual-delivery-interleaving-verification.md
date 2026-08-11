---
topic: G1 residual delivery interleaving verification
description: G1 cross-adapter delivery retry/failure and reply/source-result interleavings are tested and dispositioned
status: decided
---

## Work Items
- [x] W1 Add focused tests for the three residual delivery/reply/outcome interleavings
- [x] W2 Independently review W1 candidate tests, coverage, and verification claims
- [x] W3 Independently review W1 rev.2 deterministic target-key-aware scenario-2 evidence

## Required Context

### Return Target

- None: independent package log.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.

## Package Scope

- Revision: 1; History pointer: `2026-08-11 · G1 interleaving verification package bootstrap`.
- Primary boundary: Stage 2: directly verify the three accepted residual delivery/reply/outcome interleaving sequences and determine any corrective or owner-reconciliation follow-up
- Related artifacts in allowed write-set:
- tests/
- src/daemon/
- docs/specs/aiox-message-lifecycle.md
- docs/product/roadmap.md
- Excluded:
  - N/A.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution default: delegated to Claude. Every Claude task prompt must require efficient subagent use for independently bounded discovery, implementation, or verification, while retaining one accountable consolidated result.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - Active: this is a release-gate/public delivery-contract claim. Before accepting a Claude result, controlling assigns an independent subagent to review task record, actual artifact, and verification evidence; only controlling can issue disposition.

## Task Index

- Stable package key: g1-residual-delivery-interleaving-verification

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W3 | Compact | delegated | `logs/packages/g1-residual-delivery-interleaving-verification/tasks/W3.md` |
| W2 | Compact | delegated | `logs/packages/g1-residual-delivery-interleaving-verification/tasks/W2.md` |
| W1 | Compact | delegated | `logs/packages/g1-residual-delivery-interleaving-verification/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - Stage 1 partially accepted discovery is consumed from `logs/G1/2026-08-10-G1-residual-delivery-reliability.md` → `2026-08-11 00:20 · W1 candidate and W2 independent review disposition`.
  - Existing partial evidence covers queued-origin reply/late reply-delivery resolution and source-outcome correlation/non-recursion.
  - W1 attempt 1 adds direct daemon-level sequence evidence for original-unconfirmed/inbound-reply/late-resolution and two original/manual late-resolution orders, but it has not completed the package contract.
  - W1 attempt 2 verifies target-key-aware ordering and attribution: two originals serialize on `impl`; their awaited outcome notifications serialize on `reviewer`; relations/envelopes retain distinct IDs.
- Evidence gaps:
  - original `unconfirmed` -> inbound reply -> original late resolution;
  - different deliveries' retry dispatch and outcome-notification dispatch sharing a target/source;
  - original and manual-retransmit request-id late-resolution ordering.
  - Deterministic target-key-aware evidence for concurrent retry and outcome-notification attribution: the rejected attempt-1 scenario incorrectly treated target `impl` and source `reviewer` notification dispatch as one shared `targetFlushes` queue.
  - Adapter-level WebSocket request-ID observer routing is not covered by the daemon callback-closure tests.

## Cross-Artifact Effects

- N/A.
- Reason: no accepted cross-artifact effect recorded yet.
- Activate when: primary changes affect related artifacts or out-of-scope artifacts.

## Decision Candidates

- N/A.
- Reason: no decision candidate recorded yet.
- Activate when: decision-worthy rationale or competing options appear.

## Verification Contract

- Revision: 1; History pointer: `2026-08-11 · G1 interleaving verification package bootstrap`.
- Required:
  - Focused tests directly construct and assert all three accepted residual sequences, including original delivery status, reply-right consumption, delivery IDs, and outcome relation/envelope attribution.
  - Run `pnpm vitest run tests/unit/daemon/codex-ingress.test.ts tests/unit/daemon/api.test.ts tests/integration/codex-tier3-reliability.test.ts`.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 1; History pointer: `2026-08-11 · G1 interleaving verification package bootstrap`.
- Criteria:
  - Each residual sequence has direct passing evidence, or a failing sequence receives a separately reviewed corrective disposition.
  - Any resulting roadmap/spec owner effect is explicitly dispositioned; owner documents do not change merely because a selected test turns green.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-08-11 · G1 interleaving verification package bootstrap

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.

### 2026-08-11 13:05 · W1 candidate and W2 review disposition

- W2 independently confirmed the reported focused test command (127 passing tests) and typecheck. These are verification facts, not completion by themselves.
- Scenario 1 directly controls unconfirmed -> inbound reply -> late success and asserts reply-right/correlation preservation. Scenario 3 controls daemon late-callback order in both directions, but does not prove adapter WebSocket request-ID observer routing.
- Scenario 2 is not accepted: retry dispatch targets `impl`, whereas an outcome notification targets `reviewer`; `targetFlushes` is keyed per target. The candidate has no deterministic barrier proving the claimed overlap, and its “shared per-target queue” comment is false.
- Controlling disposition: W1 attempt 1 is qualified, not completed. W1 rev.2 must use subagents as contracted and correct scenario 2 around the actual two-queue attribution property before a new independent review.

### 2026-08-11 13:18 · W1 rev.2 attempt 2 candidate result

- W1 rev.2 attempt 2 used the two contracted subagents. Subagent A independently verified the `targetFlushes` target-key flow directly from `src/daemon/state.ts` and existing tests: retry (`schedulePreWriteRetry`) and a same-target delivery's own initial dispatch (`dispatchToPairPeers`) key by the SAME target agent id ("impl"), while the two deliveries' outcome notifications key separately by the original message's source ("reviewer") — a different, non-overlapping `targetFlushes` key. It also confirmed the promise-chain registration for both the retry callback and `dispatchToPairPeers` is fully synchronous up to `targetFlushes.set`, and that `dispatchToPairPeersNow` awaits its nested outcome-notification dispatch before returning. Subagent B used these confirmed facts to design a deterministic, test-file-only spy scheme (a `fetch` recording spy plus the existing `fakeCodexRuntime.requests` call-order array, both correlated via the dispatch envelope's own `deliveryId`/`outcomeForDeliveryId`) and predicted the actual dispatch order.
- Scenario 2 in `tests/unit/daemon/codex-ingress.test.ts` was rewritten: the false "shared per-target queue" claim (between retry and outcome-notification dispatch) is removed. The test now directly asserts (a) delivery 1's retry and delivery 2's own dispatch share one real target id via `message_deliveries.target_agent_id`, with their actual `turn/start` dispatch order asserted from `runtime.requests`; (b) the two outcome notifications separately share a different real target id, with their actual dispatch order asserted from a `fetch` spy; (c) per-delivery outcome relation/envelope attribution stays correct regardless of order (retained from attempt 1). A negative control (temporarily reversing the expected order) was run and failed as expected, confirming the order assertions are load-bearing rather than vacuous; the file was restored immediately after.
- Scenarios 1 and 3 (unconfirmed/inbound-reply/late-resolution; manual-retransmit vs. original late-resolution crossings) were left unchanged.
- Verification: `pnpm vitest run tests/unit/daemon/codex-ingress.test.ts tests/unit/daemon/api.test.ts tests/integration/codex-tier3-reliability.test.ts` — 127 passed. `pnpm typecheck` — passed. `git status` confirms only `tests/unit/daemon/codex-ingress.test.ts` changed; no `src/` or owner docs touched.
- This is a candidate result only. Per the package's risk gate, an independent subagent review of this record, the actual diff, and the verification evidence is required before controlling disposition.

### 2026-08-11 13:30 · W1 rev.2 and W3 review disposition

- W3 independently confirmed focused Vitest (127 passing) and typecheck. W1 rev.2 is accepted: scenario 2 proves target-key-aware registration/order and relation/envelope attribution; it does not prove arbitrary scheduler overlap. Scenario 3 remains daemon callback-closure evidence only.
- No product defect was found; the accepted change is limited to `tests/unit/daemon/codex-ingress.test.ts`. Adapter-level observer routing, claim-1 complete matrix, and roadmap/spec owner reconciliation remain Stage-3 inputs.
