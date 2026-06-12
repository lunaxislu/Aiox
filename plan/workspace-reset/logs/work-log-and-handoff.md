---
status: active
scope: TAX-PLAN / work-log and handoff workflow
source:
  - migrated LOG-007
  - migrated LOG-009
  - migrated LOG-017 work-log portion
decided:
  - Session and Step are separate concepts.
  - Phase changes are driven by completion conditions, not session boundaries.
  - Stable textual Step IDs are used and not renumbered.
  - Current Work is the active cursor and is updated as work progresses.
  - Handoff is a thin resume summary for resuming active work.
  - Handoff does not duplicate decisions or history owned elsewhere and is replaced, not appended, when resume state changes.
  - A work log is a workflow primitive, not a durable docs taxonomy type.
  - The former monolithic work-log format is the base candidate for future work-log templates.
open:
  - Exact workflow rules for creating, closing, deleting, or distilling work logs.
  - Whether a work log requires a mutable Current Question Map.
  - When a distilled work-log entry should be retained as a pointer versus deleted.
  - How work-log closeout gates relate to final taxonomy rules and plans/.
related:
  - ./taxonomy-foundation.md
  - ./taxonomy-types.md
  - ../log.md
  - ../workspace-reset.md
distill_to:
  - TAX-PLAN
  - future workflow design
---

# Work Log and Handoff Log

This topic owns the workspace reset workflow discussion around active work state,
work logs, session boundaries, and handoff. It does not own durable document type
responsibilities; those belong to `taxonomy-types.md`.

Cross-links:

- `decisions`, `history`, and `guides` boundaries from `LOG-017` belong to
  `taxonomy-types.md`.
- Topic log indexing, split workflow, and writing rules belong to `log.md`.
- The current resume cursor and handoff summary belong to `workspace-reset.md`.
- Top-level `plans/`, `spikes/`, and `research/` responsibilities belong to
  `research-spikes-plans.md`.

## LOG-007 — Plan, Step and Session

Status: accepted, revisable

@user
Batch 0을 다음 세션에 끝내고 Batch 1을 그 다음 세션에 하려고 해도, context 부족으로
Batch 0 일부만 끝나면 이후 순서가 계속 밀리는 문제를 제기했다.

@codex
논리적 작업 단위와 세션을 분리해야 한다고 제안했다.

- Phase: 큰 작업 묶음
- Step: 완료 조건이 있는 안정 작업 단위
- Session: 시간과 context budget
- Current Work: 현재 작업 cursor
- Handoff: 미완 Step의 임시 재개 정보

@claude
같은 진단에 동의했다. session과 work-unit을 동일시하는 것이 문제이며, 세션이 끝나도
Step ID를 올리거나 잔여분을 새 task로 만들지 않아야 한다고 했다.

Stable Step ID examples:

```text
TAX-FOLDERS
TAX-AUTHORITY
TAX-NAMING
TAX-LIFECYCLE
TAX-ROADMAP
TAX-RESEARCH
TAX-RULESDOC
```

발견 triage:

1. 현재 Step 완료에 필수: 현재 Step checklist에 포함
2. 나중에 필요: stable ID를 부여해 뒤에 추가
3. 현재 범위 밖: research 또는 backlog 후보로 분리

@codex
- [ ] Session과 Step을 분리
- [ ] Phase 전환은 세션이 아니라 완료 조건으로 결정
- [ ] Step ID는 textual stable ID이며 재사용·재번호하지 않음
- [ ] Current Work는 cursor로 매번 갱신
- [ ] Handoff는 미완 시에만 사용하고 세션 로그처럼 append하지 않음
- [ ] 영구 사건은 records, 실제 변경은 Git이 소유

@user-answer
- [x] Session과 Step을 분리한다.
- [x] Phase 전환은 완료 조건으로 판단한다.
- [x] textual stable Step ID를 사용한다.
- [x] Current Work와 Handoff로 다음 세션을 재개한다.

Conclusion:

- Session은 work boundary가 아니라 execution window다.
- Step은 완료 조건을 가진 stable work unit이며, 세션 부족으로 renumber하거나 새 task로
  바꾸지 않는다.
- `workspace-reset.md`의 Current Work와 Handoff가 active cursor와 resume summary를
  소유한다.
- `workspace-reset.md`의 Handoff template은 미완 또는 이월 작업이 없으면 `None`을
  사용한다.
- Handoff에는 다른 owner 문서의 결정·이력·검토 과정을 복사하지 않는다. 현재
  재개에 필요한 변경점, 첫 행동, 제한 사항과 필요한 pointer만 남긴다.
- 재개 상태가 바뀌면 기존 Handoff에 이력을 누적하지 않고 현재 상태로 교체한다.

## LOG-009 — This Collaboration Log

Status: accepted, revisable

@user
사용자는 AI처럼 전체 대화를 기억할 수 없으므로 질문과 답변, Claude/Gemini 의견,
채택과 반론 이유를 읽을 수 있는 문서를 원한다고 했다. 확정 또는 reject한 판단도
작업 중 변경될 수 있어야 한다고 강조했다.

@codex
처음에는 current proposal과 deliberation log를 분리하는 안을 제안했다.

@user
두 문서로 나누지 않고 단일 work-log 형식으로 두기를 요청했다. 사용자와
agent의 질의응답을 다음과 같은 표기로 남기고 싶다고 했다.

```text
@user ...
@gemini ...
@claude ...
@codex
- [ ] option
- [ ] option
@user-answer ...
```

또한 이 기록과 선택은 작업을 위한 협업 상태이며 영구 불변으로 취급하지 말라고
요청했다.

@codex
- [ ] 단일 work-log 사용
- [ ] 질문, agent별 의견, 선택지와 사용자 답변을 같은 논점에 기록
- [ ] 선택은 revisable하며 변경 시 이전 이유를 보존
- [ ] 현재 상태·다음 행동의 권위는 `workspace-reset.md`가 유지
- [ ] 최종 taxonomy가 확정되면 유효한 규칙과 근거를 최종 문서로 이관

@user-answer
- [x] 단일 work-log를 사용한다.
- [x] `@user`, agent별 표기, 선택지와 `@user-answer`를 함께 기록한다.
- [x] 선택은 영구 불변으로 취급하지 않는다.
- [x] 변경 시 이전 판단과 이유를 보존한다.

Conclusion:

- Work log는 active collaboration state를 위한 staging record다.
- Work log는 최종 결정문이 아니며, 판단이 바뀌면 기존 이유를 보존하고 revised entry를
  추가한다.
- Current status와 next action의 권위는 work log가 아니라 `workspace-reset.md`가 가진다.

## LOG-017 — Work Log as Workflow Primitive

Status: accepted for workflow design, revisable

Note:

- This section owns only the work-log and discussion-log portion of `LOG-017`.
- The `decisions`, `history`, and `guides` boundary review portion is owned by
  `taxonomy-types.md`.

@user
workspace reset work log 같은 것도 필요할 것 같다고 했다. 이유는 현재 대화 내용이 어렵고,
꼬리 질문을 하다 보면 origin question, 남은 질문, 어디까지 이해했는지와 승인했는지를
잊기 쉽기 때문이다. 또한 이런 작업 의논 로그가 나중에 spec, architecture, decision,
product 등에 흡수될 것 같다고 했다. 앞으로 workflow와 handoff를 만들 때도 중요할 수
있지만, 관리 포인트가 늘어나므로 더 나은 방법이나 불필요해지는 조건이 있는지 궁금해
했고, Claude와 대화해보라고 했다.

@codex
workspace reset work log 같은 문서는 `history`가 아니라 active workstream의 `work log` 또는
`discussion log`로 보는 것이 맞다고 설명했다. 이는 origin question, current question
map, user-understood-so-far, provisional approvals, open questions, agent opinions,
revised reasoning을 추적하는 staging area이며, 작업 종료 시 product, roadmap, specs,
architecture, decisions, history, guides, plans로 증류되거나 삭제되어야 한다.

@claude
새 mechanism을 발명하지 말고 현재 workspace reset work-log 패턴을 `work log`라는 named
workflow primitive로 승격하라고 권고했다. 단 이는 docs taxonomy type이 아니라 workflow
개념이며, 정식 spec은 workflow design 단계로 이월해야 한다고 했다.

Claude의 4-layer model:

- L1 live conversation: 비영속 대화.
- L2 work log: active deliberation ledger. workstream이 열린 동안 존재하고,
  origin question, open/approved state, revised reasoning을 담는다.
- L3 handoff: thin resume index. 다음에 무엇을 할지와 work log pointer를 담는다.
- L4 durable authorities: product, specs, architecture, decisions, history, guides,
  plans 같은 distilled 생존물.

Claude의 권고:

- work log 상단에는 mutable `Current Question Map`을 둔다. origin question,
  sub-question tree, open/provisionally-approved/closed 상태, user-understood/approvals를
  유지한다.
- 아래에는 append-only LOG ledger를 둔다. 즉 "위=가변 지도, 아래=불변 대장" 구조다.
- distillation은 sub-question 또는 episode closure 시점에만 한다.
- distill 후 work log 항목은 복사본을 장기 유지하지 않고 `distilled -> <link>` 같은
  pointer로 줄인다.
- 활성 workstream당 work log는 하나만 둔다. workstream closeout 때 삭제하거나 증류
  gate를 통과해야 한다.
- handoff만으로는 불충분하다. handoff에 live deliberation을 넣으면 빠른 재진입 기능이
  깨진다.
- agent memory나 외부 issue tracker는 repo 자족 목표와 맞지 않는다.

@codex
- [x] `work log`는 docs taxonomy type이 아니라 workflow primitive로 이월한다.
- [x] `TAX-TYPES`에서는 work log가 decisions/history/specs/architecture/product 등으로
  증류되는 staging source라는 경계만 기록한다.
- [x] 정식 work-log 구조, `Current Question Map`, handoff와의 관계, closeout 삭제 또는
  distillation gate는 `TAX-PLAN` 또는 workflow design 단계에서 다룬다.
- [x] workflow design에서 work-log template을 만들 때 현재 workspace reset work-log 형식을
  base로 삼는다. 기본 흐름은 질문/문제 제기 -> 답변/의견 -> 반론/리뷰 -> revised ->
  잠정 결론 -> owning document type으로 distillation이다.
- [ ] 현재 작업에는 work-log 상단에 `Current Question Map`을 추가하는 개선
  후보가 있다. 단 이 변경은 `TAX-TYPES` 범위를 넘으므로 별도 승인 후 수행한다.

@user-answer
- 2026-06-08: 사용자가 Claude의 work-log 권고에 동의했고, workflow를 만들어보면서
  확정하기로 했다.
- 2026-06-08: 사용자가 workflow design에서 현재 workspace reset work-log 형식을 work-log
  template의 base로 삼는다고 명시하라고 했다.

Revised:

- 2026-06-08: 사용자가 `workflow-and-handoff.md`보다 `work-log-and-handoff.md`가 실제
  책임을 더 정확히 표현한다고 보고 이 topic log 생성을 승인했다.

Conclusion:

- Work log는 durable docs taxonomy type이 아니라 active workflow primitive다.
- Handoff는 work log를 대체하지 않는 thin resume index다.
- Handoff는 결정과 이력의 보관소가 아니며, 다른 owner의 내용을 복제하지 않는다.
- Work log closeout 때 살아남을 내용은 owning durable document type이나 `plans/`로
  증류되고, 나머지는 삭제 또는 pointer로 축소되어야 한다.
