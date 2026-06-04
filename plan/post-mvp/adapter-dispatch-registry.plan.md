---
title: Adapter dispatch registry refactor — execution sub-plan
description: >
  daemon dispatch 지점의 vendor 분기(Codex/Claude)를 adapter registry surface로 이관하는
  실행 sub-plan. 비권위 execution 문서다 — adapter model 결정 권위는
  prd/post-mvp/aiox-a2a-spec.md §5가 가진다.
status: deferred (post-MVP, unordered candidate)
implements: prd/post-mvp/aiox-a2a-spec.md §5
owner: TBD
rationale: history/45·46·47 (Step 15)
---

> **권위 안내.** adapter 4-slot / runtime surface / capability tier 결정 본문은
> `prd/post-mvp/aiox-a2a-spec.md` §5다. 본 문서는 그 §5를 구현하는 refactor 실행
> detail만 보유한다.

## Motivation

Step 15 D6 lock spec는 vendor pair hardcode를 제거하고 target `agent.kind` 기반
dispatch를 권고했다. MVP 구현은 behavior는 만족하지만 daemon dispatch 지점에
Codex/Claude 분기가 남아 있다.

현재 형태:

```ts
const injectResult =
  targetAgent.kind === "codex"
    ? await injectMessageIntoCodexTarget(input.message, delivery, targetAgent)
    : await injectMessageIntoClaudeTarget(input, delivery, targetAgent);
```

새 vendor를 추가할 때 daemon core 분기가 계속 늘어나지 않도록 adapter registry surface로
이관해야 한다.

## Candidate Direction

- `AgentAdapter` contract에 dispatch/runtime surface를 확장한다.
- daemon dispatch 호출 지점은 `adapters[kind]...` 형태로 단순화한다.
- Codex/Claude별 pre-inject orchestration은 adapter 또는 adapter-adjacent surface에
  캡슐화한다.
- 기존 event/observability/transaction boundary를 보존한다.

## Notes

- shallow option: wrapper dispatch를 adapter 메서드로 이동.
- deeper option: binding resolution, event 발행, render/inject 경계를 adapter contract로
  더 크게 이관.
- P3/P4 A2A adapter model 구현 시 같이 재평가한다.

## Provenance

- Step 15 design: `history/45-step-15-pair-slot-generalization-design.history.md`
- Phase A lock §D6: `history/46-step-15-phase-a-decisions.history.md`
- Phase B closeout: `history/47-step-15-phase-b-closeout.history.md`
- 현재 dispatch 분기 지점: `src/daemon/state.ts` (target `agent.kind` dispatch).
  adapter contract: `src/adapters/contract.ts`.
