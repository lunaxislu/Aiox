---
topic: workspace reset stage9 post-mvp plan disposition
description: workspace reset plan stage 9 — `plans/post-mvp*` legacy execution plans and `prd/post-mvp/aiox-a2a-spec.md` pending execution detail rows are reconciled by creating or selecting a single A2A execution plan successor, then roadmap/source-map references and deletion disposition are decided.
status: open
---

## Work Items

- [>] W1 현재 `plans/post-mvp*` 실행 내용과 successor 필요 범위 확정 — `plans/post-mvp.plan.md`, `plans/post-mvp/*.plan.md`, roadmap `Current Execution Candidates`, source map pending rows를 대조해 단일 A2A execution plan이 흡수해야 할 실행 detail과 보존 예외를 식별한다.
- [ ] W2 단일 A2A execution plan successor 작성 또는 기존 owner 지정 — legacy sub-plan의 checklist/detail을 복사하지 않고 현재 spec/roadmap/architecture 기준으로 실행 가능한 successor plan 구조를 만든다.
- [ ] W3 roadmap/source map 정합 — `docs/product/roadmap.md`의 transitional `Current Execution Candidates`와 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`의 `keep / execution successor pending` rows를 successor 기준으로 repoint·재판정한다.
- [ ] W4 삭제 disposition gate — successor와 source map self-sufficiency를 검증하고, 사용자 승인 뒤에만 `plans/post-mvp*`와 관련 pending legacy 원문 삭제 여부를 실행한다.

## Required Context

### Return Target

- None: independent log.

## 2026-06-29 · stage9 착수 — post-mvp legacy plan disposition 로그 생성

Parent pointer: `plans/workspace-reset/workspace-reset.md` stage 9 (`plans/post-mvp*` 삭제 disposition)

@user 지시로 workspace reset plan의 다음 대기 단계를 활성화하고, 이 stage log를 생성했다.

**확인한 사실:**

- `plans/workspace-reset/workspace-reset.md` stage 9는 `plans/post-mvp*`의 실행 내용을 잇는 단일 A2A 실행 plan successor가 생긴 뒤에만 roadmap repoint, physical deletion, source map disposition 확정을 수행한다고 적고 있다.
- `docs/product/roadmap.md`의 `Current Execution Candidates`는 임시 매핑이며 장기 roadmap 구조나 실행 진행 상태의 기준이 아니라고 명시한다. 표에는 4개 sub-plan이 남아 있다:
  - `plans/post-mvp/envelope-metadata.plan.md`
  - `plans/post-mvp/codex-structured-metadata-spike.plan.md`
  - `plans/post-mvp/adapter-dispatch-registry.plan.md`
  - `plans/post-mvp/channel-boot-surface.plan.md`
- `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` W5는 stage 6 target rows는 물리 삭제까지 소비됐지만, `plans/post-mvp*`와 `prd/post-mvp/aiox-a2a-spec.md`는 `keep / execution successor pending`으로 stage 9가 소비해야 하므로 source map 로그가 open이라고 기록한다.
- 현재 파일로는 `plans/post-mvp.plan.md`와 4개 sub-plan이 존재한다.
- `plans/post-mvp.plan.md`는 post-MVP implementation index이며, `Session Re-entry` 안에 오래된 운영환경 셋업 상태와 async-petting-hoare scratch pointer를 포함한다.
- `plans/post-mvp/envelope-metadata.plan.md`는 Local single-daemon A2A의 next kickoff candidate로, A2A envelope/lifecycle migration scope, increments, acceptance criteria, verification, kickoff checklist를 담는다.
- `plans/post-mvp/codex-structured-metadata-spike.plan.md`는 Codex structured metadata path 조사 후보이며, envelope/lifecycle plan scope를 조정할 수 있는 병행 조사로 남아 있다.
- `plans/post-mvp/adapter-dispatch-registry.plan.md`와 `plans/post-mvp/channel-boot-surface.plan.md`는 deferred execution sub-plan이며 각각 spec §5 adapter/runtime surface 관련 실행 detail을 담는다.

**판정:**

- 이 stage의 첫 행동은 삭제가 아니다. 먼저 기존 post-mvp index/sub-plan 5개와 source map pending row가 담은 실행 detail 중 단일 A2A execution plan successor가 흡수해야 할 범위를 확정해야 한다.
- roadmap의 `Current Execution Candidates`는 transitional mapping이므로, successor가 생기기 전에는 삭제나 repoint를 선행하지 않는다.
- `async-petting-hoare` 운영 라인은 workspace reset plan stage 9 문장에 별도 보존이라고 적혀 있으므로, W1에서 `plans/post-mvp.plan.md`의 stale session re-entry와 A2A execution successor 범위를 분리해 판정한다.

**다음 행동:**

- W1부터 진행한다. 읽을 범위는 `plans/post-mvp.plan.md`, `plans/post-mvp/*.plan.md`, `docs/product/roadmap.md`의 `Current Execution Candidates`, `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`의 pending rows와 W5, 그리고 successor가 참조해야 할 현행 owner 문서(`docs/specs/aiox-a2a.md`, `docs/product/roadmap.md`, 관련 architecture/decision)다.
