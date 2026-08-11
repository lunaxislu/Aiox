---
topic: G1 gate evidence and owner reconciliation
description: G1 residual delivery direct evidence, owner-document reconciliation, and gate disposition are determined
status: decided
---

## Work Items
- [x] W1 Read-only direct-evidence and owner-contract discovery for G1 residual delivery claims
- [x] W2 Independently review W1 candidate evidence boundary and owner-contract conclusions
- [x] W3 Read-only primary delivery FSM outcome-by-adapter coverage matrix discovery
- [x] W4 Independently review W3 primary-FSM 4×2 coverage matrix and correction claims
- [x] W5 Add a focused Codex target-runtime-unavailable pre-write evidence test
- [x] W6 Independently review W5 Codex target-runtime-unavailable test candidate
- [x] W7 Decide the direct external-transport/live-CLI evidence scope and its G1-C owner before execution
- [x] W8 Preflight the three approved external direct-evidence probes and execution contracts
- [x] W9 Independently review W8 external-evidence preflight contracts and execution boundaries
- [x] W10 Run an isolated normal Codex production app-server WebSocket plus daemon composition probe
- [-] W11 Independently review W10 real Codex app-server plus daemon composition probe and cleanup evidence — not run; W10 was rejected by controlling direct recheck, so this review objective became inapplicable
- [x] W12 Re-run the isolated normal Codex composition probe with review-retained cleanup evidence
- [x] W13 Independently review W12 Attempt 2 real Codex composition evidence and retained manifest
- [x] W14 Design a deterministic real Codex WebSocket late-response/retransmit ordering fault-injection contract
- [x] W15 Preflight a Codex TUI-observable late-response/retransmit/race evidence contract
- [x] W16 Independently review the Codex TUI-observable fault-wrapper evidence contract
- [x] W17 Prepare the isolated Codex TUI two-plane fault-wrapper execution workspace
- [x] W18 Independently review the prepared Codex TUI two-plane fault-wrapper workspace
- [x] W19 Implement the two missing static safety guards in the disposable Codex TUI fault-wrapper workspace
- [-] W20 Run the isolated Codex TUI two-plane late-response/manual-retransmit execution through the user checkpoint — deferred to next session — cancelled: duplicate/out-of-scope external ordering observation; accepted G1-C W4/W15 and Stage-2 ordering evidence already cover release-relevant semantics
- [x] W21 Reconcile accepted G1 evidence into owner documents and prepare the residual gate disposition
- [x] W22 W22 Reconcile roadmap G1 residual requirements with the Handoff 2 evidence disposition
- [x] W23 W23 Decide the G1 residual gate and perform result-consumption and closeout reconciliation
- [x] W24 W24 Reconcile higher-level roadmap G1-C residual-status summaries with the accepted gate boundary
- [x] W25 W25 Reconcile the roadmap Gate Evidence G1 row with accepted residual evidence
- [x] W26 W26 Independently review W14's design/provenance candidate for a qualified terminal disposition

## Required Context

### Return Target

- None: independent package log.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.

## Package Scope

- Revision: 1; History pointer: `2026-08-11 · G1 Stage 3 bootstrap`.
- Primary boundary: Stage 3: determine direct-evidence sufficiency, reconcile roadmap/spec claims with accepted Stage 1–2 evidence, and set the G1 gate disposition
- Related artifacts in allowed write-set:
  - `docs/product/roadmap.md`
  - `docs/specs/aiox-message-lifecycle.md`
  - `docs/specs/aiox-adapter-model.md`
  - `docs/architecture/local-runtime-routing-and-delivery.md`
  - `tests/unit/daemon/codex-ingress.test.ts`
  - `src/adapters/codex/websocket.ts`
- Excluded:
  - Product-code changes, test changes, and owner-document edits until a reviewed W-item supplies the evidence and controlling issues a disposition.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution default: delegated to Claude. Every Claude task prompt must require efficient use of subagents with independently bounded discovery, implementation, or verification roles, and one accountable consolidated result.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - Active: this is a release-gate and multi-owner public-contract claim. Before accepting any Claude result, controlling assigns an independent subagent to review the task record, actual sources/artifacts, and verification evidence; only controlling issues a disposition.

## Task Index

- Stable package key: g1-gate-evidence-owner-reconciliation

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W26 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W26.md` |
| W25 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W25.md` |
| W24 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W24.md` |
| W23 | Compact | inline | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W23.md` |
| W22 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W22.md` |
| W21 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W21.md` |
| W20 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W20.md` |
| W19 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W19.md` |
| W18 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W18.md` |
| W17 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W17.md` |
| W16 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W16.md` |
| W15 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W15.md` |
| W14 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W14.md` |
| W13 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W13.md` |
| W12 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W12.md` |
| W11 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W11.md` |
| W10 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W10.md` |
| W9 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W9.md` |
| W8 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W8.md` |
| W7 | Compact | inline | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W7.md` |
| W6 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W6.md` |
| W5 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W5.md` |
| W4 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W4.md` |
| W3 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W3.md` |
| W2 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W2.md` |
| W1 | Compact | delegated | `logs/packages/g1-gate-evidence-owner-reconciliation/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - Stage 1 discovery/review disposition is consumed from `logs/G1/2026-08-10-G1-residual-delivery-reliability.md`.
  - Stage 2 accepted test evidence and its stated limits are consumed from `logs/G1/2026-08-11-G1-residual-delivery-interleaving-verification.md` → `2026-08-11 13:30 · W1 rev.2 and W3 review disposition`.
  - W3/W4 and W5/W6 accept the daemon-level 4-outcome × 2-adapter primary-FSM matrix, including Codex pre-write `target_runtime_unavailable` / `requires target codex runtime`.
  - Stage 2 accepts the three daemon-level interleavings for inbound reply, reply-right, source result, and original/manual late-resolution attribution.
  - Historical accepted G1-C W4 supplies real Codex/Claude CLI/TUI transport evidence for post-write ambiguity, correlated outcome, one user-confirmed recovery, and duplicate target display; it does not prove target receipt, read, or work completion.
  - W21–W25 reconcile the current roadmap, lifecycle, adapter-model, and architecture owners to those accepted boundaries.
- Non-evidence boundaries retained:
  - This package does not prove adapter-level Codex WebSocket observer routing, real two-plane ordering/race composition, target receipt/read/work completion, source-operation invocation idempotency, Phase 1 trust, or Tier 2 guarantees.
  - W20 is cancelled because no current residual owner claim requires its additional two-plane ordering observation; its cancellation does not convert its proposed execution into evidence.

## Cross-Artifact Effects

- W5 added the accepted Codex runtime-unavailable daemon test in `tests/unit/daemon/codex-ingress.test.ts`.
- W21 reconciled the accepted historical W4 boundary into `docs/specs/aiox-message-lifecycle.md` and `docs/specs/aiox-adapter-model.md` without status promotion.
- W22, W24, and W25 reconciled the corresponding G1 residual-status summaries and Gate Evidence row in `docs/product/roadmap.md`.
- `docs/architecture/local-runtime-routing-and-delivery.md` required no G1 claim edit; its existing delivery and attribution boundaries remain compatible.

## Decision Candidates

- G1 disposition: passed only for the plan's two residual claims at the accepted daemon-level boundary; the final independent closeout review accepted the Result Consumption and verification state.
- W11 disposition: currently cancelled as not run and inapplicable after the controlling recheck rejected W10; W12/W13 are a separate corrective execution/review path, not a historical W11 result.
- W14 disposition: W26 independently reviewed and controlling accepted W14 solely as qualified design/provenance; it remains excluded from direct runtime/TUI/G1 evidence.

## Verification Contract

- Revision: 1; History pointer: `2026-08-11 · G1 Stage 3 bootstrap`.
- Required:
  - W1 must provide file/line evidence distinguishing current/as-built facts, committed targets, prior accepted evidence, and unverified inference.
  - W1 must trace roadmap/spec claims to relevant implementation, direct-evidence records, and tests without changing artifacts.
  - Any proposed owner-document edit must identify its owner, exact claim/status consequence, and required approval; W1 must not apply it.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 1; History pointer: `2026-08-11 · G1 Stage 3 bootstrap`.
- Criteria:
  - Direct-evidence scope, owner-document disposition, and the G1 gate decision are each backed by reviewed evidence or explicitly remain open with an owner/action.
  - Owner documents are edited only by a separately authorized and reviewed Work Item.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-08-11 · G1 Stage 3 bootstrap

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.

### 2026-08-11 · Stage 3 contract bootstrap

- The active plan pointer now targets this package. The unrelated A2A open log reported by `scripts/onramp` was not changed because it is a distinct lifetime.
- W1 is read-only discovery. It must determine the direct-evidence boundary and owner conflict before any document or implementation action is proposed.

### 2026-08-11 · W1/W2 reviewed discovery disposition

- Controlling directly rechecked the load-bearing distinction in the independent review: `tests/unit/adapters/codex-websocket.test.ts` uses an actual `WebSocketServer` for out-of-order request IDs and a same-ID late response, while `tests/unit/adapters/claude-injector.test.ts` stubs outbound `fetch`; the real listener test under `claude-channel.test.ts` is inbound. The Stage-2 composition harness explicitly fakes runtime transports.
- Disposition: W1 is **partially accepted**. Its Codex request-ID correction and Claim-1 matrix gap are accepted. Its assertion that Claude already has direct outgoing transport evidence is rejected. The roadmap/spec wording is an apparent owner-status inconsistency, not proof that either owner is stale; no document is changed.
- W2 independent review is accepted. The gate remains open. W3 now owns the read-only Claim-1 primary outcome-by-adapter coverage matrix. A later direct-evidence task requires an explicit contract/owner decision first, especially for live CLI evidence.

### 2026-08-11 · W3/W4 reviewed primary-FSM matrix disposition

- W3 is partially accepted and W4 is accepted. The 4×2 matrix has direct daemon-level evidence for both adapters' ambiguity, rejection, and delivered outcomes, and Claude's pre-write outcome. Codex's pre-write family is directly covered for no-loaded-thread and retry/TTL, but its reply-target `codex_channel_unavailable` mapping to `target_runtime_unavailable` / `requires target codex runtime` is an exact untested subbranch.
- W3's proposed one-test gap closure is accepted as W5. The broader composition correction is qualified: real state/injector execution is covered against faked transports, while production external transport/runtime composition is not. This distinction is retained for the later direct-evidence contract decision.

### 2026-08-11 · W5/W6 unavailable-runtime test disposition

- W5 is accepted and W6 independent review is accepted. `tests/unit/daemon/codex-ingress.test.ts` now directly constructs an existing Codex reply target whose runtime has been detached, then verifies the exact `codex_channel_unavailable` mapping: deferred `target_runtime_unavailable`, eligibility `requires target codex runtime`, queued persistence, no `turn/start`, and no delivering transition.
- W6 independently ran the focused test (1 pass, 76 skipped), `pnpm typecheck`, and `git diff --check`. The test-only change is retained. The 4-outcome × 2-adapter primary daemon-FSM matrix no longer has the previously identified empty subbranch.
- Remaining G1 evidence is not a matrix gap: it is a contract/owner decision about whether and where to require production external transport composition and/or the lifecycle spec's actual `claude` CLI evidence. This package will not start external processes or alter owner documents until that decision is made.

### 2026-08-11 · User approval for external direct evidence

- User approved this Stage 3 package to own and execute the remaining external-evidence path: (1) Codex real app-server WebSocket plus daemon composition, (2) Claude real outbound HTTP listener plus daemon composition, and (3) actual `claude` CLI direct end-to-end evidence. Owner-document reconciliation remains sequenced after reviewed evidence, not authorized by this approval alone.
- Next action is an execution preflight that fixes the exact probe contracts, runtime availability, cleanup, timeout, expected state transition, and retained failure-artifact location without starting external processes.

### 2026-08-11 · W8/W9 external-evidence preflight disposition

- W8 is qualified and W9 independent review is accepted. The first authorized executable scope is a normal, isolated Codex production app-server WebSocket plus daemon composition probe. It must not be reported as deterministic late-response evidence.
- External late response needs a separately scoped controlled fault-injection/proxy contract. Claude outbound HTTP composition needs a new reviewed scratch harness. Actual Claude CLI recovery requires user presence for duplicate-risk confirmation. Persistent `claude` MCP config mutation remains out of scope.

### 2026-08-11 · W10 cleanup recheck correction

- W10 is rejected. Direct recheck found its retained claim that all scratch directories and child processes were absent was false: one empty W10 scratch directory and W10-associated processes remained. The exact W10 processes were terminated, the named socket was absent afterward, and the empty directory was removed.
- The reported normal-delivery output is not promoted because the final probe artifact had already been deleted and its cleanup completion condition could not be independently verified. A future re-execution must retain sanitized exit/cleanup evidence until independent review completes.

### 2026-08-11 · W12 interrupted attempt continuation

- W12 Attempt 1 was externally interrupted while creating its scratch probe file. The retained scratch is empty and its audit found no socket, manifest, or relevant child. No external evidence was produced. By user direction this is not a failure disposition; W12 remains active and resumes as Attempt 2 with the same retained-evidence contract.

### 2026-08-11 15:49 · W12/W13 qualified normal-composition disposition

- Controlling directly checked the W12 record and W13 independent-review result. W12 Attempt 2 is **partially accepted** only as a sanitized, one-time normal production Codex app-server/WebSocket plus daemon composition observation: the retained scratch permissions/manifest-only state and absence of the recorded PIDs/socket were independently rechecked.
- The `delivered` assertion remains manifest-backed rather than independently reproducible because the probe, database, socket, and stdout were deliberately removed. It is therefore not sufficient to close the G1 direct-evidence gate by itself.
- Accepted boundary: this evidence establishes **none** of late response, manual retransmit, request-ID race, or user-visible/TUI behavior. Those are excluded by the W12 contract and require their own reviewed evidence. W13 is accepted as the independent review of that boundary.
- Next: define a separate, deterministic controlled fault-injection/proxy contract for real Codex WebSocket plus daemon late-response and original/manual retransmit ordering; Claude outbound HTTP composition and live Claude CLI remain separate follow-ups, with the latter requiring user presence for duplicate-risk confirmation.

### 2026-08-11 · W15/W16 TUI contract disposition

- W15 candidate is **qualified** and W16 independent review is accepted. The prior daemon-only relay is insufficient for TUI evidence because daemon and TUI use separate connections. A later scratch wrapper must rewire both the daemon `connectWebSocket` client and the TUI `startProxy` path through the controlled relay, while separating request-ID namespaces per WebSocket connection.
- The only approved future claim is a deterministic ordering of two daemon-originated `turn/start` responses. Daemon correlation, source-TUI outcome/manual action, and target-TUI duplicate display are independent assertions. The display remains transport evidence, not receipt/read/completion; no general race-safety claim is authorized.
- User presence is mandatory at the retransmit checkpoint: the executor must stop after `unconfirmed`, show the duplicate-risk checkpoint, and must not send `confirmDuplicateRisk: true` until the user explicitly directs it. W17 owns scratch preparation only; it must not launch an app-server, relay, daemon, or TUI.

### 2026-08-11 · W17/W18 execution-readiness disposition

- W17 static workspace is retained as a safe preparation artifact and W18 independent review is accepted as **qualified**. It is not an executable harness. Two blocking corrections are required before actual TUI execution: deterministic daemon-versus-TUI relay ingress classification (with unknown connection rejection), and a runtime/schema guard that forbids all response release until explicit user approval plus exactly one operator-led retransmit.
- W19 will implement those two corrections only in the disposable scratch workspace. It will not launch a process or TUI. A second independent review must pass before any actual external TUI execution Work Item opens.

### 2026-08-11 · W19 consolidated preparation disposition

- W19 is accepted as the final static preparation deliverable. Direct recheck confirms the retained manifest requires `unconfirmedObserved`, `sourceTuiObserved`, explicit user approval, exactly one operator retransmit checkpoint, daemon attribution, target TUI display, and cleanup all to be affirmative. The pure guard rejects unknown/TUI/forged ingress records, approval/checkpoint omissions, incorrect order, and repeat release.
- This is still only static readiness: it has not created or connected a relay, daemon, app-server, or TUI. The next Work Item is therefore the meaningful external execution unit, which will implement the disposable runtime harness, launch the isolated components, and halt at the user duplicate-risk checkpoint. No further preparation/review Work Item is opened.

### 2026-08-11 · W20 execution preflight stop and cleanup

- W20 did not launch: it found before scratch creation that a valid run needs both a custom two-plane attach/relay and human-visible source/target Codex TUI terminal surfaces. The ordinary production attach cannot inject both seams; relay/DB state cannot substitute for source-TUI display observation.
- Cleanup status directly checked: all W20 subagents are complete; no W20 scratch directory or socket exists. A process scan found unrelated pre-existing Codex/Node processes but no W20-scoped artifact, so none were terminated. W20 is open, pending the user-visible terminal surfaces rather than an agent task.

### 2026-08-11 · W20 resumed with user-visible terminal surfaces

- User confirmed the source and target terminal surfaces are ready. W20 resumes under its original no-auto-retransmit contract: create the isolated runtime and stop at the `unconfirmed` checkpoint before requesting explicit duplicate-risk approval.

### 2026-08-11 · Next-session handoff — remaining direct evidence

- User directed that the remaining work be resumed in a later session. All subagents are stopped. No W20 process, socket, relay, daemon, app-server, TUI, retransmit, held-response release, or approval input was created; the final empty W20 scratch was removed.
- Do not split further preparation/review micro-actions into new Work Items. Treat the remaining work as three meaningful deliverables: (1) W20 direct Codex two-plane relay plus TUI controlled-ordering run through the user checkpoint; (2) one direct Claude end-to-end run that combines the real outbound-HTTP-listener plus daemon composition with actual Claude CLI outcome/recovery, stopping for user duplicate-risk confirmation; (3) reviewed owner-document reconciliation and G1 gate disposition.
- Existing accepted bounds remain: daemon-level primary FSM matrix and three interleaving sequences are closed; W12/W13 normal Codex composition is qualified only and is not late-response/retransmit/race/TUI evidence. W17-W19 are retained static preparation artifacts, not runtime evidence and not new deliverables.
- Resume order: start W20 by directly implementing the fresh custom attach/two-plane operational harness, then run it in the user-visible source/target terminal surfaces; do not use a daemon-only substitute. After its reviewed result, run the combined user-present Claude HTTP-plus-CLI E2E, then owners/gate.

## 2026-08-11 · 2026-08-11 · W20 delegated harness preparation disposition

- User directed a delegated W20 harness preparation and requested the operator procedure. A fresh 0700 candidate scratch `/private/tmp/aiox-g1-w20-RfWtfg` now contains only 0600 harness files; no app-server, daemon, relay, TUI, socket, DB, endpoint, retransmit, approval, or held-response release has run.
- Controlling directly rechecked the fixed daemon/TUI ingress paths, no-release approval/checkpoint sequence, scratch permissions, and then required a correction for attach/start failure cleanup. The candidate now has a scratch-only `try`/`finally` cleanup path and sanitized pending-manifest boundary. Static parsing found no scratch-local diagnostic; imported repository type errors remain outside this candidate check.
- This is accepted only as W20 execution preparation, not runtime evidence. W20 stays open: when the user is ready at two visible terminals, run the harness to the `originalHeld` plus source-TUI `unconfirmed` checkpoint and stop for explicit duplicate-risk approval.

## 2026-08-11 · 2026-08-11 · W20 live attempt 4 failure disposition

- W20 live Attempt 4 directly observed the intended original timeout boundary: classified daemon/TUI relay ingress, original response hold, one persisted unconfirmed delivery, source-TUI unconfirmed outcome, and target-TUI first display. These observations do not establish any manual retransmit ordering or duplicate target display.
- After explicit approval, the user performed exactly one manual retransmit invocation, but supplied the daemon notification event delivery ID instead of its `outcomeForDeliveryId`. The daemon rejected it as already delivered; the relay showed `manualHeld: false`, with no checkpoint and no held-response release. A second invocation was not authorized in the same run.
- The user closed both TUIs. The harness stop path then remained pending, so controlling terminated only the identified W20 harness parent. Recheck found no W20 process, socket, or database; the retained 0600 manifest reports complete manifest-only cleanup. W20 remains open. A future attempt needs a fresh scratch, corrected relay shutdown, unambiguous operator guidance, and fresh user approval.

## 2026-08-11 · W20 duplication and residual-scope comparison

- User questioned whether W20 duplicates previously accepted work. Direct comparison confirms substantial overlap: the decided G1-C W4 already used a real Codex TUI response-drop wrapper, observed correlated `delivery_unconfirmed`, required one user-confirmed manual recovery using the original `outcomeForDeliveryId`, and observed the target's second display. Its controlling result was independently accepted and reconciled into the roadmap.
- W20 has one narrower stated distinction: it proposes holding both original and manual JSON-RPC responses and releasing manual then original to observe an explicit late-response/retransmit ordering race. W4 records held initial acknowledgement plus recovery/duplicate display, but does not claim that two-response release ordering. However, the current residual plan explicitly says the decided G1-C package is input evidence only and its remaining conditions concern adapter-FSM symmetry plus retry/failure crossing inbound replies or MCP/channel source results. W20 Attempt 4 did not exercise either residual condition.
- No Work Item state changes are made from this finding. Controlling should not repeat W20 without the user deciding whether the unproven ordering-race assertion is a necessary residual claim or should be removed as duplicate/out-of-scope.

## 2026-08-11 · Claude direct-evidence duplication comparison

- The same comparison confirms that the planned Claude outbound-HTTP-listener plus actual-CLI outcome/recovery run substantially duplicates accepted G1-C W4. W4's Claude-target run used a per-process real Claude MCP ingress that forwarded the initial `/send` request while withholding its HTTP response, observed `claude_channel_push_unconfirmed` and the correlated `outcomeForDeliveryId`, then completed one user-confirmed retransmit and a second target-TUI display. Its paired Codex-target run separately had a real Claude source TUI observe the Codex timeout outcome and perform the one recovery call.
- The W4 controlling log records that both actual clients received the source outcome, the user confirmed duplicate risk, the shared recovery tool was called exactly once, each original delivery became `delivered`, and each target TUI displayed the envelope twice; an independent review accepted that transport-level boundary. W8 nevertheless proposed a new Claude HTTP+daemon scratch and a separate actual Claude CLI run while treating W4 only as provenance.
- Current working-tree diff names only `tests/unit/daemon/codex-ingress.test.ts`. Post-W4 commits inspected here cover Claude credential cleanup and documentation/hygiene rather than a cited change to Claude outbound delivery/retransmit semantics. No evidence found in the current Stage-3 records explains why the accepted W4 Claude direct evidence would be invalidated. The plan's decided-package-as-input constraint therefore weighs against rerunning it absent a newly stated regression question.

## 2026-08-11 · Ordering-race evidence provenance comparison

- Historical G1-C W15 already has accepted user-operated Codex TUI response-drop evidence for the original and exactly one manual retransmit: both target presentations were observed, both matching responses were dropped, the original remained `unconfirmed`, and the manual attempt produced the source-visible non-error uncertainty result. Its final review also covers immediate/late success and reject plus duplicate-late no-op behavior.
- Stage 2 then added and independently accepted the two original/manual late-resolution callback orders as its scenario 3. Its explicit evidence boundary is narrower: this is daemon callback-closure ordering and does not establish adapter-level real WebSocket request-ID observer routing. The same Stage-2 package separately closed the inbound-reply/late-resolution and retry/outcome attribution sequences.
- Therefore W20's proposed real two-plane app-server/TUI release ordering is not byte-for-byte duplicate evidence: it would add external adapter-composition observation of the manual-then-original release order. But no current G1 residual condition or owner document names that extra composition claim as required, while the decided G1-C evidence and Stage-2 callback-order evidence already cover the release-relevant semantics. This remains a decision point, not a basis to rerun W20 by default.

## 2026-08-11 · W20 cancellation and owner/gate handoff

- **W20 disposition completed:** User cancelled W20 as duplicate/out-of-scope. The task record preserves the failed-run trace and cancellation rationale; both exact 0700 disposable W20 scratch directories were removed after direct absence checks. No W20 process, socket, database, harness, or manifest remains. The Work Item is cancelled, not deferred; no replacement external Codex or Claude direct-evidence run is authorized.
- **Handoff 1 — owner reconciliation (not yet started):** Re-open the Stage-3 owner comparison from accepted evidence only: the Stage-2 4×2 primary-FSM matrix plus three interleavings, and accepted G1-C W4/W15 direct evidence. Audit the allowed owners (`docs/product/roadmap.md`, `docs/specs/aiox-message-lifecycle.md`, `docs/specs/aiox-adapter-model.md`, `docs/architecture/local-runtime-routing-and-delivery.md`) through their inbound/outbound references. The known candidate drift is lifecycle §4.3's statement that actual `claude` CLI direct E2E remains, which conflicts with accepted W4; verify every other claim before proposing edits. Create a separately reviewed owner-edit Work Item before changing owner documents.
- **Handoff 2 — G1 residual gate disposition (after owner review):** Decide whether the two remaining G1 claims are closed by accepted evidence: (a) adapter-symmetric primary FSM meaning is supported by the direct 4×2 matrix, including Codex runtime-unavailable; (b) retry/failure preserves inbound reply, reply-right, source-result, and original/manual late-resolution attribution across the accepted Stage-2 sequences. Treat the external two-plane ordering observation as non-required unless a new owner requirement explicitly adds it. Then perform an independent result review, Registry Integrity and Result Consumption checks, reconcile the plan/log status, and issue either a G1 pass disposition or an explicit remaining owner/action.

## 2026-08-11 · 2026-08-11 · W21 independent result review and acceptance

- **W21 disposition: accepted.** Controlling directly rechecked the two-spec diff against the accepted G1-C W4 result and reran `git diff --check` plus `scripts/check-markdown-inline-code` for both edited specs. Two separately assigned result-review subagents accepted the candidate: the wording is W4-backed transport-level evidence only, preserves the receipt/read/work-completion exclusion, does not rely on the ambiguous W15 attribution, and does not promote `Committed target` or `[Status: Current]`. The allowed write-set is respected; roadmap and architecture remain untouched.
- **Report correction:** W21’s `git status --porcelain` summary omitted pre-existing untracked plan/log/package files visible in the worktree. This does not alter the verified W21 diff (only the two allowed specs) and is not a scope breach; it is recorded here to prevent treating the status summary as a complete worktree inventory.
- **Unresolved gate judgment:** roadmap’s “remaining common requirements” heading still contains one completed-tense attribution bullet, while the FSM bullet remains residual. W21 correctly did not resolve either. Handoff 2 must decide from the accepted daemon-level 4×2 matrix and three interleavings whether claims (a)/(b) close, then reconcile roadmap wording, run Registry Integrity and Result Consumption, and issue the G1 disposition.

## 2026-08-11 · 2026-08-11 · W22 independent result review and acceptance

- **W22 disposition: accepted.** The roadmap-only diff reconciles both G1 residual bullets as closed by accepted daemon-level evidence: Stage 3’s 4×2 matrix including the Codex runtime-unavailable subbranch for primary-FSM symmetry, and Stage 2’s three interleavings for inbound reply/reply-right/source-result/original-manual attribution. Controlling directly checked the diff and reran `scripts/check-markdown-inline-code docs/product/roadmap.md` and `git diff --check`; a separately assigned result-review subagent independently accepted it.
- **Boundary retained:** this reconciliation proves neither target receipt/read/work completion nor adapter-level WebSocket observer routing or real two-plane ordering/race composition. No current owner requires the cancelled W20 observation or a new Claude run.
- **Next gate:** W22 consumes the owner-document reconciliation only. G1 disposition still requires an explicit controlling decision, followed by Result Consumption and closeout checks; neither W22 nor this acceptance declares G1 pass.

## 2026-08-11 · 2026-08-11 · W24 independent result review and acceptance

- **W24 disposition: accepted.** Independent review confirmed the three permitted roadmap summary edits accurately align them with the detailed accepted daemon-level residual closure without widening any guarantee. The detailed WebSocket/two-plane and receipt/read/completion exclusions remain intact.
- **Residual owner action:** roadmap Gate Evidence G1 row still calls the two closed residual claims “Remaining G1 release evidence.” W24 disclosed this as out of scope; it remains a closeout blocker and needs a separate reviewed owner-edit before W23 can decide G1 pass.

## 2026-08-11 · 2026-08-11 · W25 independent result review and acceptance

- **W25 disposition: accepted.** Independent result review confirms the single Gate Evidence G1-row edit reconciles the last roadmap residual wording with accepted daemon-level evidence without expanding guarantees. Inline-code validation and `git diff --check` pass. W25 itself does not declare G1 pass.

## 2026-08-11 · 2026-08-11 · W23 result-consumption reconciliation

- **W11 current closeout disposition:** W11 never executed: its task record contains no Attempt, verification, or result. The earlier completed marker was therefore unsupported. Controlling directly rejected W10 after its cleanup claim was contradicted; W12/W13 then formed a separate corrective execution/review path. W11 is now marked cancelled solely as a current administrative disposition — *not run; W10 was rejected by controlling direct recheck, so the W11 review objective became inapplicable* — not as a claim of a historical user cancellation or W12/W13 supersession.
- **W14 result-consumption correction:** W14 remains an unaccepted design/provenance candidate: a daemon-delivery WebSocket fault-relay proposal, not direct runtime, TUI, or G1 gate evidence. W15/W16 consumed it only as an input and qualified the distinct two-plane execution contract for any TUI-observable claim; that did not independently accept W14. W20 is cancelled and no current residual owner claim requires the proposed extra ordering observation, but a bounded independent W14 result review is still required to close Result Consumption.
- **Controlling-surface reconciliation:** Evidence, Cross-Artifact Effects, and Decision Candidates now reflect accepted Stage 1–2/W3–W6/historical W4 evidence and accepted W21–W25 owner reconciliation. The remaining step is final independent review plus the registry, document, diff, and scoped worktree checks; no G1 pass is issued by this entry.

## 2026-08-11 · 2026-08-11 · W23 final-review correction

- **Final independent-review outcome: rejected for closeout.** The reviewer reconfirmed that the two exact plan residual claims have sufficient accepted daemon-level evidence; W11’s current administrative cancellation is also supported. However, W14’s task record still states `candidate; independent review pending`. W15/W16 limited it to candidate design/provenance input but did not accept it. The earlier W23 wording that called W14 accepted was corrected immediately.
- **Remaining action:** open and complete a bounded independent review of W14’s source-backed design result, then record an explicit qualified design-only or other terminal controlling disposition. Re-run W23 final review afterward. Until then Result Consumption fails and G1/package/plan remain open. The checked worktree inventory separates W23 scope from the pre-existing `src/daemon/server.ts` import-format-only change.

## 2026-08-11 · 2026-08-11 · W26 W14 result-review contract

- The final W23 reviewer rejected closeout because W14 was still recorded as an unreviewed candidate. Controlling corrected its own overstatement, returned W23 to open, and opened W26 as the bounded independent review required to consume W14. W26 may only evaluate W14 as design/provenance, never as direct runtime/TUI/G1 evidence; W23 resumes only after its disposition.

## 2026-08-11 · 2026-08-11 · W26 independent result review and acceptance

- **W26 disposition: accepted.** Controlling directly rechecked W26 against W14/W15/W16 and the cited runtime/test paths. W14 is now consumed solely as a qualified source-backed design/provenance artifact for a daemon-delivery fault-relay seam. It is expressly excluded from direct runtime, real app-server, TUI, real two-plane ordering, receipt/read/completion, and G1 evidence. W15/W16 qualify a distinct prospective two-plane execution contract; they do not turn W14 into runtime evidence. W20 cancellation neither proves nor is required for that design.
- **Result Consumption effect:** This resolves the former W14 candidate-only blocker without changing its historical task record. W23 resumes for a renewed final independent closeout review; G1 pass is still not issued by this acceptance.

## 2026-08-11 · 2026-08-11 · W23 final G1 disposition and closeout

- **Final independent-review disposition: accepted.** After W26 consumed W14 strictly as qualified design/provenance, the renewed reviewer passed Registry Integrity, Result Consumption, all four owner-document inline-code checks, `git diff --check`, and the scoped worktree audit.
- **G1 decision: PASS, bounded.** The plan’s two residual claims are closed at daemon level: (a) the 4×2 adapter-symmetric primary-FSM matrix including the Codex runtime-unavailable subbranch; and (b) the Stage-2 three interleavings preserving inbound reply, reply-right, source-result, and original/manual attribution. This decision does not prove target receipt/read/work completion, adapter-level WebSocket observer routing, real two-plane ordering/race composition, source-operation idempotency, Phase 1 trust, or Tier 2 guarantees.
- **Closeout inventory:** Package-owned reconciliations are the roadmap/spec edits, accepted daemon test, and plan/log/package records. `src/daemon/server.ts` is a five-line import-format-only change outside W23’s write-set and is not attributed to this closeout. No current owner or plan requires a W20 rerun or a new Claude run.
