# Post-MVP Implementation Plan

Post-MVP 구현의 **index**다. 이 파일은 production spec이 아니며, 제품/아키텍처 권위는
`docs/product/product.md`, `docs/specs/aiox-a2a.md`, `docs/product/roadmap.md`와
관련 `history/`가 가진다.

각 구현 후보는 `plans/post-mvp/<deliverable>.plan.md` 상세 sub-plan을 가진다. 본 파일은
candidate 등록 + sequencing만 담는다. 상세(Motivation/scope/cutover/checklist)는 각
sub-plan에 둔다. 현재 다음 kickoff 후보는 `plans/post-mvp/envelope-metadata.plan.md`다.

## Session Re-entry

> **Current Work Status** — 양 agent(Claude/Codex/Gemini) 공통 진입점. WS2 SessionStart onramp hook이 이 블록을 읽는다. 갱신 규칙: `Last verified`는 확인된 결과만, dirty면 baseline/working 분리.

```text
Project: aiox
Current stage: Post-MVP 운영환경 셋업 (async-petting-hoare) — WS1 완료 · AGENTS.md 정리(cross-WS) Phase 1(item1~9) 커밋 완료(1b26d9b) · **WS2 구현 차례**(추천 순서 hook→/aiox-stage skill→settings 위생) · Phase 2(skill 후 4 body 이동) 대기
Authority:
  - docs/product/product.md              (A2A product)
  - docs/specs/aiox-a2a.md               (A2A protocol/interface/state)
  - docs/product/roadmap.md              (release gates and phase)
  - history/58-post-mvp-a2a-architecture-decisions.history.md
Execution:
  - plans/post-mvp.plan.md               (이 파일 — index)
  - ~/.claude/plans/async-petting-hoare.md (WS1~4 원본 상세, Claude scratch)
Last verified:
  - committed baseline: 1b26d9b (docs: AGENTS.md Phase 1 정리)
  - last work session(2026-06-07): docs-only — AGENTS.md 정리 Phase 1 item3~9 적용(Repository Map 통합 / Authority 단순화 / Vault→transition note / Change Safety 신설 / Work Entry 불변식 hoist + 4 detail body transition note / 구 구현 원칙 흡수), inbound 2곳 sync, 자동관리 nextjs-rules 블록 복원, my-vault 경로 제거. Codex 교차검증 반영. test/typecheck 미요구(docs-only)
  - last known green: R4 closeout (history/57)
Working state: Phase 1 committed (1b26d9b). A2A product/protocol/roadmap authority는 workspace reset W4에서 `docs/product/`와 `docs/specs/`로 증류됐다.
Open:
  - WS1 prune 완료: Claude 22→4(+MEMORY.md), Codex 9→1 thin index, sqlite untouched. AGENTS.md 메모리 정책 명시 + Current Work Status 신설 + qa workflow→qa-tracker 이관.
  - AGENTS.md 정리(cross-WS): Phase 1(item1~9) 적용 완료 — 11섹션 구조(Repository Map/Authority/Memory/Work Entry/Change Safety/Decision/4 detail+transition/Atlas-Vault). AGENTS.md 현재 142줄(자동관리 nextjs 블록 9줄 포함; Vault 2섹션·중복 통합·@user 코멘트 제거로 본문 축소). item9 검증 통과(dead ref 0, @user 0, my-vault 경로 0). Codex 교차검증 4지적 반영(nextjs 블록 복원·my-vault 경로 제거·future path 표기·상태 sync) + 사용자 후속 3변경(legacy 일반화·Repository Map scratch bullet 제거·Authority agent-scratch tier 제거 4계층) → stale consumer 3곳 Codex 정합(plan/README·docs-aiox/README·history/README). **Phase 1 커밋 완료(1b26d9b). 다음=WS2 구현 → 그 안의 /aiox-stage skill이 생기면 Phase 2(4 body 이동)도 이어서 닫음.** 상세는 log skill·`scripts/onramp`·`AGENTS.md`로 흡수(ops-setup.plan.md는 삭제).
  - WS2 tooling 결정 lock (구현 pending): repo-local tools / SessionStart onramp hook / /aiox-stage skill / typecheck=stage exit gate / subagent 0 / MCP 신규 0 + settings.local.json cleanup. **추천 착수 순서 = ① SessionStart onramp hook(read-only, 선행조건 충족) → ② /aiox-stage skill(Phase 2 unblock) → ③ settings 위생.** 미결정: hook이 Current Work Status를 직접 parse vs 작은 renderer script(work-status show) 동반(의논거리 #2·#7).
  - WS3 stage workflow / WS4 repo-as-vault+atlas: 미착수
```

새 Codex/Claude/Gemini 세션은 Post-MVP 작업을 시작하기 전에 이 순서로 읽는다.

1. `AGENTS.md` — repo 운영 규칙.
2. `docs/product/product.md`, `docs/specs/aiox-a2a.md`,
   `docs/product/roadmap.md` — A2A product/protocol/release 설계 약속.
3. `history/58-post-mvp-a2a-architecture-decisions.history.md` — 왜 이렇게 결정했는지.
4. 이 파일 — 현재 구현 위치와 다음 deliverable 후보.

현재 위치:

- 문서 consolidation은 완료된 상태로 본다.
- 다음 구현은 **Local single-daemon A2A**에서 시작한다.
- kickoff entry point는 `plans/post-mvp/envelope-metadata.plan.md`이며,
  `plans/post-mvp/codex-structured-metadata-spike.plan.md`를 병행 조사 후보로 본다.
- Compose, local multi-daemon, remote/federation은 A2A envelope/lifecycle과 adapter/runtime
  connector가 정리되기 전까지 구현을 시작하지 않는다.
- **운영 환경 셋업 (async-petting-hoare): WS1 완료, WS2 구현 대기.** 진행 기록·handoff·의논거리는
  log skill·`scripts/onramp`·`AGENTS.md`·현재 open 로그의 Work Items/next pointer가 흡수했다
  (`ops-setup.plan.md`는 흡수 후 삭제). 상태 요약은 위 Current Work Status.
  WS1~4 원본 상세는 `~/.claude/plans/async-petting-hoare.md`(Claude scratch).

## 규약

- 파일 경계는 architecture component(daemon/envelope/adapter)가 아니라 **deliverable
  (구현 가능한 변경 단위)** 다. 한 deliverable은 여러 component를 가로질러 건드릴 수 있다.
- 각 sub-plan은 frontmatter `implements:`로 구현하는 spec §을 명시한다 (traceability).
- 항목 추가: `plans/post-mvp/<name>.plan.md` 생성 + 아래 Candidates에 1줄 등록.

## Candidates

| Deliverable | Sub-plan | Implements | 한 줄 |
| --- | --- | --- | --- |
| A2A envelope/lifecycle migration | [`envelope-metadata.plan.md`](post-mvp/envelope-metadata.plan.md) | §4 | **Next kickoff**. payload-level marker를 A2A envelope/lifecycle metadata로 이전하고 Local single-daemon A2A v1을 안정화 |
| Codex structured metadata spike | [`codex-structured-metadata-spike.plan.md`](post-mvp/codex-structured-metadata-spike.plan.md) | §4·§9 | Codex `turn/start` 또는 app-server surface가 structured aiox metadata를 native로 운반할 수 있는지 조사 |
| Adapter dispatch registry refactor | [`adapter-dispatch-registry.plan.md`](post-mvp/adapter-dispatch-registry.plan.md) | §5 | daemon dispatch의 vendor 분기를 adapter registry surface로 이관 |
| Channel server boot failure surface | [`channel-boot-surface.plan.md`](post-mvp/channel-boot-surface.plan.md) | §5 | Claude channel server child 부팅 실패를 daemon attach response에 surface |

## Sequenced

현재 구현 순서는 아래처럼 본다. 이 순서는 production spec이 아니라 새 세션이 이어받기
위한 현재 위치와 실행 흐름이다. 실제 Step 번호, acceptance criteria, verification
baseline은 kickoff 때 각 sub-plan에 붙인다.

1. **Local single-daemon A2A**: 같은 project, 같은 daemon 안에서 A2A envelope/lifecycle을
   먼저 안정화한다. `envelope-metadata.plan.md`가 kickoff entry point이고, Codex structured
   metadata spike는 text fallback의 한계를 줄일 수 있는지 병행 확인한다.
2. **Adapter/runtime connector**: Codex/Claude vendor 분기를 adapter registry와 runtime
   connector model로 정리한다.
3. **Capability + instruction projection**: agent별 MCP/tool/skill/instruction 주입과
   instruction precedence를 구현한다.
4. **Compose**: agents/routes/capabilities/policies/instructions를 선언형 desired state로
   올린다. terminal 자동 배치는 core가 아니라 recipe/plugin 후보로 둔다.
5. **Same machine multi-daemon**: project/profile별 daemon namespace와 local transport를
   다룬다. Windows named pipe 또는 TCP loopback 같은 transport 예시는 이 단계의 구현
   후보이며, 1~4단계에서는 그런 transport 차이가 나중에 들어와도 막히지 않게 유지한다.
6. **Local-remote 이후**: remote daemon registration, daemon-to-daemon auth, internal
   federation, remote-remote federation은 deferred다.

## Cross-Platform Requirement

Windows/Linux/macOS 호환은 별도 후반 단계가 아니라 1~4단계에 계속 걸리는 조건이다.
불변식 본문은 spec에 있고, 여기서는 어느 단계에서 무엇을 지키는지만 가리킨다.

- **Stage 1 — A2A envelope/lifecycle**: transport-neutral protocol (`docs/specs/aiox-a2a.md` §8).
- **Stage 2 — Adapter/runtime connector**: OS launch/shell/path/signal 차이 흡수
  (`docs/specs/aiox-a2a.md` §5).
- **Stage 3 — Capability + instruction projection**: OS path resolver와 symlink/copy fallback
  (`docs/specs/aiox-a2a.md` §7).
- **Stage 4 — Compose**: OS-neutral config, OS-specific command/path/env는 compiler 또는
  recipe/plugin에서 처리 (`docs/specs/aiox-a2a.md` §6).
