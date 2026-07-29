---
topic: public ID factory B implementation
description: Approved B public-ID issuer contract implementation package; W1 accepted, G1-A consumption reconciled, and package closed.
status: decided
---

## Work Items

- [x] W1 Implement approved B public-ID factory cutover with RED test matrix — accepted/completed.

## Required Context

### Return Target

- Log: `logs/G1/2026-07-18-G1-A-Codex-structured-ingress-evidence.md`
- Work Item: W4
- Consumed: W1 passed controlling result review and was accepted; W4 was
  separately resumed, accepted, and consumed the issuer-cutover result as a
  closeout-readiness input on 2026-07-23. Both G1-A logs subsequently closed
  as `decided`; this package did not advance or accept W4 itself.
- Context snapshot: public-ID factory B corrects a recorded G1-B public-ID
  issuance gap. It does not reconcile the roadmap or satisfy the other G1-A
  evidence/owner-reflection gates.

### {Global}

- Package contract: `log skill/references/package-log.md`.
- Base loop contract: `log skill/references/loop-rules.md`.

## Package Scope

- Revision: 6; History pointer: `2026-07-23 · W1 revision 6 stale delivery-consumer scope correction`.
- Primary boundary: Common public-ID factory cutover across source adapters, daemon-originated messages, delivery row PK issuance, and production/CLI in-process wiring.
- Related artifacts in allowed write-set:
- src/core/public-ids.ts (new common factory module)
- src/adapters/codex/mcp-server.ts
- src/adapters/claude/channel-server.ts
- src/daemon/api.ts
- src/daemon/socket-transport.ts
- src/daemon/state.ts
- src/daemon/server.ts
- src/daemon/run.ts
- src/bin/aiox.ts
- tests/unit/core/public-ids.test.ts (new)
- tests/unit/adapters/codex-mcp-server.test.ts
- tests/unit/adapters/claude-channel.test.ts
- tests/unit/adapters/fake-integration.test.ts
- tests/unit/daemon/api.test.ts
- tests/unit/daemon/socket-transport.test.ts
- tests/unit/daemon/codex-ingress.test.ts
- tests/unit/daemon/message-idempotency-store.test.ts
- tests/unit/daemon/message-fanout-store.test.ts
- tests/unit/daemon/server.test.ts
- tests/unit/daemon/run.test.ts
- tests/unit/cli/bin.test.ts
- Excluded:
  - Internal shared `createId` cutover for agent, pair, route, or event IDs.
  - Schema or migration changes, durable replay/migration, and public-ID storage redesign.
  - Compatibility alias, fallback, or dual-write behavior.
  - Handler-to-daemon automatic retry, MCP tool re-invocation dedupe, or a
    caller-provided ingress idempotency key.
  - Roadmap reconciliation and every G1-A W4 acceptance, owner-reflection, or closeout action.
  - Changes outside the exact write-set unless a later user-approved brief revision adds them.

## Workflow / Agent Plan

- Phase: activation preflight -> provisional bootstrap -> discovery -> controlling synthesis -> contract review -> execution -> result review -> result promotion/Reconcile -> closeout.
- Execution: W1 was executed inline under revision 6 and accepted; only
  package closeout reconciliation remains.
- Review anchors:
  - Contract review: before execution Act.
  - Result review: before candidate result promotion/Reconcile.
- Risk gate / Independent reviewer:
  - N/A.
  - Activate when: large claim, public contract/security/data/release, irreversible external effect, multi-owner conflict, large blast radius, or low discovery confidence is present.

## Task Index

- Stable package key: public-id-factory-b

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W1 | Compact | inline | `logs/packages/public-id-factory-b/tasks/W1.md` |

## Evidence

- Current accepted evidence:
  - W1's accepted revision-6 evidence records focused and full 55-file/564-test
    passes, `pnpm typecheck`, lifecycle Markdown, registry, and diff checks.
  - Current source has the common opaque public-ID factory: Codex/Claude
    send/reply issue public message IDs directly; daemon issues outcome message
    IDs and all delivery IDs while internal `createId` remains internal-only.
- Evidence gaps:
  - None within this package's accepted public-ID factory contract. Broader
    G1-C reliability and G1-D trust-boundary work remain separate owners.

## Cross-Artifact Effects

- Factory injection must reach both source adapters, daemon-originated outcome
  creation, all three delivery-issuer paths (fan-out, reply, and W12 outcome),
  the production daemon, and CLI in-process runtime without changing
  internal-ID ownership. Claude reply additionally crosses adapter request,
  daemon API/socket, and state boundaries with its source-issued message ID.
  Source adapters call the common module directly; they do not receive a
  production factory through daemon DI.

## Decision Candidates

- N/A.
- Reason: no decision candidate recorded yet.
- Activate when: decision-worthy rationale or competing options appear.

## Verification Contract

- Revision: 6; History pointer: `2026-07-23 · W1 revision 6 stale delivery-consumer scope correction`.
- Required:
  - Start with RED tests in `public-ids.test.ts` for the common public factory:
    opaque values have no agent/profile/thread input or encoding, and the
    message/delivery issue functions are directly callable by their owners.
  - RED→GREEN adapter-direct tests: Codex send/reply and Claude send/reply each
    call the common public-IDs module exactly once per handler invocation and
    forward that exact `messageId` to one daemon call. Claude reply covers its
    adapter request, daemon API/socket consumer, and daemon-state ingress.
    Existing adapter `createMessageId` overrides are removed; adapter tests use
    a common-module mock, with no adapter factory injection seam.
  - RED→GREEN invocation boundary tests: a separate MCP tool invocation gets a
    new message ID. Do not add handler-to-daemon automatic retry, MCP
    re-invocation dedupe, or caller-provided ingress idempotency keys.
  - RED→GREEN: daemon-originated W12-style rejection outcome obtains its
    `messageId` from the factory. The factory issues every delivery ID in all
    three paths—ordinary fan-out, source-only reply delivery, and W12 outcome
    notification—and each is persisted unchanged as `message_deliveries.id`.
  - RED→GREEN: production daemon and CLI in-process entrypoints supply the
    daemon-owned default factory. `CreateDaemonStateOptions` adds optional
    `createPublicMessageId` and `createPublicDeliveryId` test injection seams,
    each defaulting to the core public factory so existing state-option callers
    remain valid; `server.test.ts` verifies forwarding/default behavior.
    Internal agent/pair/route/event IDs still use shared sequential `createId`.
  - RED→GREEN store tests: `message-fanout-store.test.ts` and
    `message-idempotency-store.test.ts` inject a deterministic opaque daemon
    public-delivery seam; ordinary fan-out remains target-specific and its
    idempotency key remains `${messageId}:${targetAgentId}`. Reply and W12
    outcome tests prove their respective delivery issuer paths.
  - RED→GREEN fixture discipline: each independent Claude reply fixture uses a
    distinct source-issued `messageId`; tests intentionally exercising a
    duplicate identical `messageId` retain their existing idempotency meaning.
  - RED→GREEN stale-consumer coverage:
    `fake-integration.test.ts` removes sequential `deliveryId` literals,
    injects adversarial opaque values through the optional daemon
    public-delivery seam, and asserts equality only between returned
    `deliveryId`, the persisted delivery row, and injection correlation for
    normal fan-out, injection failure, missing adapter, and deferred
    injection. No prefix/UUID parsing, fallback, or compatibility path is
    permitted.
  - Regression matrix: `message-idempotency-store.test.ts` proves fan-out `idempotencyKey` remains
    `${messageId}:${targetAgentId}`; reply right and
    `inReplyToDeliveryId`; daemon outcome `outcomeForDeliveryId`; and manual
    retransmit each preserve the original row-PK `deliveryId` and existing
    message ID. Inject adversarial opaque IDs through the daemon factory seams
    and assert equality-only consumers do no prefix/UUID/ordering/issuer
    parsing.
  - Focused matrix, affected suites, `pnpm typecheck`, Markdown checks for the
    two owner docs if changed by a later brief revision, `git diff --check`,
    and package registry integrity pass.
- Recommended:
  - N/A.
- Unavailable/waived:
  - None at bootstrap.

## Closeout Contract

- Revision: 6; History pointer: `2026-07-23 · W1 revision 6 stale delivery-consumer scope correction`.
- Criteria:
  - Controlling result review confirms every producer/entrypoint and the exact
    RED matrix above, with no excluded compatibility or internal-ID cutover.
  - The public factory contract remains consistent with
    [[docs/decisions/public-id-factory-issuer-responsibility]] and
    [[docs/specs/aiox-message-lifecycle]] §4.1.
  - G1-A W4 separately consumed the accepted W1 result in its 2026-07-23
    closeout-readiness assessment and was accepted without this package
    advancing W4; both G1-A logs later closed as `decided`.
  - Registry Integrity Check passes.
  - Result Consumption Gate passes for every executable W.
  - Required verification passed or has an explicit waiver with residual risk.
  - Accepted package state matches actual artifact disposition.

## 2026-07-23 · approved B decision and implementation registration

- Controlling package log skeleton created. Activation was already decided by the agent/user; this tool did not decide activation.

### 2026-07-23 · approved B contract registered; implementation remains unstarted

- [Fact] User approved B: source adapters issue agent-authored send/reply
  message IDs through one common factory; daemon issues daemon-originated
  messages and delivery IDs through the same factory; delivery ID remains the
  immutable `message_deliveries.id` value.
- [Fact] G1-A W4 is still the onramp-selected candidate/blocked closeout item.
  This independent package neither activates W4 nor changes the roadmap,
  freeze, or G1-A closeout state.
- [Decision] W1 is registered as an open implementation proposal with the
  exact write-set and RED matrix above. This session records no production,
  schema/migration, test, or roadmap change.

### 2026-07-23 · W1 boundary correction — Claude reply, invocation retry, and W4 consumption

- [Fact] Claude reply currently omits `messageId` in its adapter request and
  receives it from daemon state through shared `createId`; the API/socket and
  adapter/state path must therefore be cut over together.
- [Decision] The retry rule is limited to attempts inside one handler
  invocation. A user tool re-invocation is new work with a new ID;
  ingress-idempotency is explicitly out of scope.
- [Reconcile] W1's exact write-set, RED matrix, and closeout contract now name
  the Claude reply path, three delivery issuers, server wiring/test,
  idempotency and adversarial non-parsing tests, and its W4 Return Target.
  W1 remains open and unstarted; W4 remains blocked/candidate.

### 2026-07-23 · W1 invocation and test-matrix correction

- [Decision] A source handler makes exactly one direct common-module factory
  call and one daemon call per invocation. Automatic handler retry, MCP tool
  re-invocation dedupe, and caller-supplied ingress idempotency are excluded.
- [Reconcile] Package Scope, Verification Contract, Closeout Contract, and W1
  Brief are revision 4. The exact test set adds message-idempotency store and
  fan-out store coverage, factory/direct-adapter/daemon-injection seams, and
  target-specific ordinary fan-out delivery issuance.

### 2026-07-23 00:48 · W1 correction recorded through package log tool

- [Record] This entry registers the same revision-2 correction stated below: Claude reply API/socket/state belongs to W1; source retries mean only daemon-call attempts within one handler invocation; the accepted W1 result returns to G1-A W4 as a future closeout gate.
- [State] W1 remains open and unstarted. This record does not activate W4 or perform its acceptance, roadmap reconciliation, or closeout.

### 2026-07-23 00:53 · W1 revision 4 invocation and exact-test correction

- [Decision] Each source handler directly calls the common public-IDs module once and forwards that generated ID unchanged through one daemon call. Handler retry, tool re-invocation dedupe, and caller-provided ingress idempotency are excluded.
- [Reconcile] Package Scope, Verification Contract, Closeout Contract, and W1 Brief are revision 4. The exact write-set/test matrix now includes `message-idempotency-store.test.ts`, `message-fanout-store.test.ts`, public-factory tests, adapter-direct factory tests, daemon injection seam tests, and ordinary fan-out target-specific delivery issuance.
- [State] W1 remains open and unstarted; the W4 Return Target remains future consumption only.

### 2026-07-23 · W1 revision 4 active-W4 and seam clarification

- [Correction] W4 is already active `[>]`. After W1 is accepted, W4 is
  separately resumed/progressed and consumes the result during closeout
  readiness; W1 neither advances nor accepts W4.
- [Implementation contract] `CreateDaemonStateOptions` receives optional public
  message/delivery factory test seams with core defaults. Source adapters call
  the common module directly; existing `createMessageId` overrides become test
  seams/module mocks, never production fallbacks. Adversarial opaque IDs enter
  through daemon seams to prove equality-only consumers.

### 2026-07-23 00:58 · W1 revision 5 active-W4 and factory-seam correction

- [Correction] W4 is already active `[>]`. W1 acceptance does not advance or accept it; W4 is separately resumed/progressed and consumes the accepted W1 result during closeout-readiness assessment.
- [Implementation contract] `CreateDaemonStateOptions` gets optional `createPublicMessageId` / `createPublicDeliveryId` test seams with core defaults, preserving existing callers. Source adapters call the common module directly; existing `createMessageId` overrides are test-only seams or module mocks, never production fallbacks. Adversarial opaque IDs are injected through daemon seams to prove equality-only consumers.
- [Reconcile] Package Scope, Verification Contract, Closeout Contract, and the W1 Brief are revision 5. W1 remains open and unstarted.

### 2026-07-23 · W1 revision 6 stale delivery-consumer scope correction

- [Fact] The current focused failure classification identifies six direct
  stale consumers in `tests/unit/adapters/fake-integration.test.ts`: each
  asserts a legacy sequential `deliveryId` literal after daemon delivery
  issuance moved to the public factory. The file was outside revision 5's
  exact write-set.
- [Decision] Revision 6 adds only that test file. Its permitted changes are
  limited to replacing sequential literals with equality/correlation checks
  using adversarial opaque values injected through the optional daemon
  public-delivery seam, across normal fan-out, injection failure, missing
  adapter, and deferred injection. Prefix/UUID parsing, fallback, and
  compatibility behavior remain prohibited.
- [Reconcile] The RED matrix now also requires deterministic opaque daemon
  seams for fan-out/idempotency tests, distinct source-issued message IDs for
  independent Claude reply fixtures, and preservation of intentional duplicate
  identical-message-ID idempotency coverage. Package Scope, Verification
  Contract, Closeout Contract, and W1 Task Brief are revision 6.
- [Contract review] PASS: revision 6 adds the sole directly affected stale
  test consumer, preserves all exclusions and W4/roadmap/closeout boundaries,
  and makes the relevant RED matrix executable. W1 remains open and
  unstarted; this review authorizes no production or test execution.

### 2026-07-23 13:06 · 2026-07-23 · W1 candidate evidence state alignment

- [Reconcile] W1 marker is now `[>] active` to match its completed revision-6 implementation and RED/GREEN candidate evidence in `logs/packages/public-id-factory-b/tasks/W1.md` (latest: 2026-07-23 12:44).
- [State] This is a candidate-state alignment only: W1 has not undergone result review and is not accepted or completed. W4 consumption/resumption, roadmap reconciliation, and package/G1-A closeout remain unstarted.

### 2026-07-23 13:09 · W1 revision 6 candidate-state verification

- [Fact] Controlling W1 remains the sole `[>] active` item. Its latest pre-verification state entry (2026-07-23 13:06) points to the task record’s same revision-6 GREEN candidate (2026-07-23 12:44); the task record also retains the revision-6 RED candidates.
- [Fact] W1 has not undergone controlling result review and is neither accepted nor completed. W4 consumption/resumption, roadmap reconciliation, and package/G1-A closeout remain unstarted.
- [Fact] The Return Target is consistent: only after W1 result review/acceptance, active W4 is separately resumed/progressed and consumes the accepted result in its closeout-readiness assessment. W1 neither activates nor accepts W4; G1-A’s current marker is already W4 `[>]`.
- [Verification] `package-log check logs/G1/2026-07-23-public-ID-factory-B-implementation.md`, `log check logs/G1/2026-07-18-G1-A-Codex-structured-ingress-evidence.md`, and `git diff --check` passed. No result review, acceptance/completion, W4 consumption, roadmap reconciliation, or closeout action was performed.

### 2026-07-23 · W1 controlling result review

- [Result review] candidate result review PASS — direct acceptance pending.
- [Fact] Revision 6 contract, implementation paths, RED→GREEN record, and current verification were rechecked. W1 remains `[>]` candidate/active; no acceptance/completion, W4 consumption/resumption, roadmap reconciliation, or closeout action is performed.

### 2026-07-23 13:42 · W1 accepted/completed — direct acceptance and result-consumption handoff

- [Acceptance] W1 candidate result review PASS를 직접 수용한다. revision 6 W1은 accepted/completed이며, controlling package state와 artifact disposition은 task record의 `2026-07-23 · Accepted result / reconcile` entry를 따른다.
- [Accepted evidence] task record에 기록된 focused/full test (55 files / 564 tests), `pnpm typecheck`, lifecycle Markdown check, package registry check, `git diff --check` PASS를 수용 근거로 한다. 이 disposition을 위해 새 테스트나 추가 검증을 실행하지 않았다.
- [Reconcile] W1 Work Item을 completed로 전환한다. package closeout/next pointer: **W1 accepted; G1-A W4가 별도로 재개되어 결과 소비 필요**.
- [Boundary] W4 marker/status는 변경하지 않는다. W4 자체는 이미 active owner-document candidate이고, 아직 미시작인 것은 W1 accepted result의 W4 closeout-readiness 소비이다. roadmap reconciliation과 G1-A closeout은 시작하지 않았다.

### 2026-07-29 13:18 · 2026-07-29 · package decided closeout review — NOT READY: accepted result surface not reconciled

[Fact] W1은 accepted/completed이며 registry integrity는 PASS다. 현재 source도 common opaque public-ID factory를 직접 사용한다: Codex/Claude send·reply의 `createPublicMessageId`, daemon outcome의 public message/delivery issuance 및 fan-out/reply delivery의 `createPublicDeliveryId`를 확인했다.

[Fact] Return Target의 실제 소비도 완료됐다. G1-A evidence W4의 2026-07-23 14:21 accepted entry는 W1 handoff가 lifecycle §4.1 current issuer reflection에 소비됐음을 기록하며, 두 G1-A 로그는 이후 `decided`로 종료됐다.

[Judgment — NOT READY for decided] controlling package의 현재 표면은 아직 수용 전 상태를 말한다: description의 “registration only”, W1의 “do not begin”, Execution default의 later activation, Evidence의 adapter-local/sequential current-state, 그리고 active W4 Return Target/Closeout Contract이다. 이는 accepted package surface Reconcile 및 Return/status digest가 완료됐다는 기록과 충돌하므로 package-closeout gate를 통과했다고 판정할 수 없다.

[Boundary / next] 구현·테스트·owner 문서의 추가 작업은 요구되지 않는다. 별도 승인된 bounded reconciliation에서 package current surface와 Return Target 소비 상태만 현행 accepted result에 맞춘 뒤, closeout gate를 재검토한다. 이 review는 상태 전환·Return Target 수정·코드/테스트/owner 문서 변경을 하지 않는다.

### 2026-07-29 13:21 · 2026-07-29 · accepted-result current-surface and Return Target reconciliation applied

[Reconcile] Current package surfaces now reflect the accepted W1 disposition: description, completed W1 action, Return Target consumption state, execution/evidence/closeout sections, and the Compact task record Result/Verification digest.

[Fact] This changes no historical Task History or prior acceptance entries. W1 remains accepted/completed; G1-A W4 was separately accepted after consuming the handoff, and both G1-A logs are `decided`.

[Boundary] No code, test, owner document, roadmap, G1-C, G1-D, or other package log was changed. The package remains `open` solely for a fresh closeout/status review.

### 2026-07-29 13:21 · 2026-07-29 · package decided closeout re-review — PASS after current-surface reconciliation

[Fact] Registry Integrity Check PASS: W1, Task Index, and Compact task record identity are consistent. Result Consumption Gate PASS: revision-6 RED→GREEN, controlling acceptance, task-result digest, and G1-A W4’s separate 2026-07-23 consumption are mutually consistent; both G1-A logs are `decided`.

[Fact] Contract/artifact/effect verification PASS: current package surfaces no longer describe a registration-only or unconsumed state; direct source inspection confirms the common factory in Codex/Claude send/reply and daemon outcome/delivery issuance. The lifecycle/decision owners remain the authority; no owner update is missing from this closeout.

[Verification] `log check` passed for this package and both G1-A logs; `package-log check` reports registry integrity OK; `git diff --check` passed. All local Work Items are completed and there is no next pointer. Historical pre-acceptance entries remain provenance only.

[Judgment — PASS / status transition eligible] The package meets Package Closeout and Base `decided` conditions. A separately authorized finalization may append one final disposition entry and change only this controlling log frontmatter from `open` to `decided`; code, tests, owner documents, roadmap, G1-A/G1-C/G1-D logs, and task-history evidence remain unchanged.

### 2026-07-29 13:30 · 2026-07-29 · public-ID-factory-B final disposition — decided

최종 결과: public-ID-factory-B implementation package를 `decided`로 전환한다.

근거: W1 revision 6은 controlling review를 거쳐 accepted/completed이며, Result/Verification digest와 package surface가 현재 disposition에 정합한다. G1-A W4는 결과를 별도로 소비·수용했고, 두 G1-A 로그도 `decided`다.

검증: package registry integrity, controlling/G1-A log checks, direct current-source anchors, 그리고 `git diff --check`가 PASS했다. local Work Item·next pointer·미소비 Return Target은 없다.

범위: 이 전환은 이 controlling log의 최종 기록과 frontmatter status만 변경한다. 코드, 테스트, owner 문서, roadmap, task-history evidence와 G1-A/G1-C/G1-D의 상태는 변경하지 않는다.
