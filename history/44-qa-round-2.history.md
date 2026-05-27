# QA Round 2

## Status

- Date: 2026-05-27
- Round: R2
- Scope: aiox MCP collaboration protocol Phase 1.5 smoke.
- Authority context:
  - `plan/qa-tracker.md` (live issue/round index)
  - `plan/post-mvp-aiox-mcp-envelope-metadata.md` (Phase 2 single source)
  - `history/42-mvp-implementation-closeout.history.md` (MVP closeout baseline)

## Round Goal

Verify that Phase 1.5 instruction + send/reply tool description hardening supports
purposeful delegation, multi-round discussion, explicit conclusion, and no-call
cases without reintroducing agent reflex loops.

## Scope Under Test

- Codex MCP instruction and tool descriptions:
  - `src/adapters/codex/mcp-server.ts`
- Claude channel instruction and tool descriptions:
  - `src/adapters/claude/channel-server.ts`
- Regression assertions:
  - `tests/unit/adapters/codex-mcp-server.test.ts`
  - `tests/unit/adapters/claude-channel.test.ts`

No daemon protocol, schema, or persistence behavior changed in this round.

---

## Scenarios

### S-1 Single Delegation

- **Expected**
  - The initiating agent starts a purposeful delegation thread with an Intent
    label, goal, expected output, context, and constraints.
  - The receiving agent returns one concrete result reply.
  - The initiating agent does not send a social acknowledgment or follow-up
    reflex after receiving the result.
- **Actual**
  - PASS. Delegation produced a result and then stopped.

### S-2 Multi-round Discussion

- **Expected**
  - Discussion can continue across multiple turns when each turn adds a new
    argument, counter-argument, evidence, proposal, question, decision, or
    commitment.
  - Agreement, paraphrase, or social acknowledgment alone does not create a new
    aiox tool call.
- **Actual**
  - PASS. Discussion continued across substantive turns without premature stop
    or meaningless loop.

### S-3 Korean Termination Trigger (`"마무리해"`)

- **Expected**
  - The active thread is concluded with `Intent: conclusion` and `[[CONCLUDE]]`.
  - The peer receiving `[[CONCLUDE]]` does not reply with any aiox tool.
- **Actual**
  - PASS. Termination concluded the thread and the peer did not continue.

### S-4 No-call Case

- **Expected**
  - Greeting, simple acknowledgment, thanks, or social follow-up inputs do not
    trigger `send`/`reply` tool calls.
- **Actual**
  - PASS. No unintentional tool call observed.

---

## Observed Metrics

- Intent label compliance: PASS.
- `[[CONCLUDE]]` leak: none observed.
- Reflex loop recurrence: none observed.
- Unintentional calls for greeting/acknowledgment: none observed.

## Issues (this round)

### QA-002 Same-vendor pair attach rejection (codex↔codex / claude↔claude)

- Tracker row: `plan/qa-tracker.md` QA-002
- 발견 경위 (2026-05-27): R2 smoke 4/4 PASS 이후 사용자가 codex↔codex pair attach를 시도해 `pair_kind_slot_occupied`로 거절됨을 관찰.
- Verdict: **expected rejection — wontfix**. MVP `prd/mvp/aiox-mvp-spec.md` §Pair의 "one Codex slot + one Claude slot" 정책에 부합. 버그 아님.
- 후속 결정: 사용자 판단으로 vendor 무관 일반화가 확장성 측면에서 필요 → Step 15 design lock으로 격상.
- **Design authority**: `history/45-step-15-pair-slot-generalization-design.history.md` (2026-05-27).
  - 두 축 동시 변경 (pair capacity 모델 + injection dispatch generic화)
  - vendor-neutral deferred semantics (`target_binding_unconfirmed` / `target_runtime_unavailable` / `target_adapter_not_registered`)
  - claude↔claude도 channel server unavailable 시 deferred로 surface
  - self-loop 이중 방어
  - migration: `agents.pair_slot` column + backfill + unique index + versioned migration
- **부수 변경**:
  - `prd/mvp/aiox-mvp-spec.md` §Pair에 Step 15 amendment block 추가.
  - `plan/mvp-implementation-checklist.md`에 "Step 15: Pair slot generalization — Design locked" 섹션 추가.
- Step 15 진입 조건: 본 R2 round 종료 후.

## Deferred Follow-up

Phase 2 (`intent` / conclusion status moved from payload markers to
envelope/metadata) is deferred to post-MVP refactoring kickoff. The single source
for trigger, scope, and cutover is:

- `plan/post-mvp-aiox-mcp-envelope-metadata.md`

Trigger Phase 2 earlier if any of the following are observed:

- Intent label omission rate rises above the documented threshold.
- `[[CONCLUDE]]` leaks into user-facing answers.
- Reflex loops recur.
- Greeting/acknowledgment payloads produce unintentional send/reply calls.

## Session Log

- `2026-05-27` — User-led Phase 1.5 smoke completed: S-1 through S-4 all PASS.
  Phase 2 remains deferred and tracked in
  `plan/post-mvp-aiox-mcp-envelope-metadata.md`.
- `2026-05-27` — Same-vendor pair attach 시도에서 `pair_kind_slot_occupied`
  거절 관찰. QA-002로 tracker 등록 (wontfix, expected). 후속으로 Step 15
  (pair slot generalization) design lock 진행:
  `history/45-step-15-pair-slot-generalization-design.history.md` 작성,
  `prd/mvp/aiox-mvp-spec.md` §Pair에 amendment block 추가,
  `plan/mvp-implementation-checklist.md`에 Step 15 reservation 섹션 추가.
  R1은 동일 세션에 close 처리 (1 verified, 0 open).

## Open Items

- [ ] At post-MVP refactoring kickoff, surface
  `plan/post-mvp-aiox-mcp-envelope-metadata.md` before implementing envelope
  metadata migration.
