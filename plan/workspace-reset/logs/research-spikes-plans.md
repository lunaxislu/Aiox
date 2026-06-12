---
status: active
scope: TAX-RESEARCH / plans, spikes, and external intake
source:
  - migrated LOG-005
  - migrated LOG-006
decided:
  - research/ owns investigation of external links, ideas, repositories, and documents.
  - spikes/ owns experiments for possibilities and implementation uncertainties found through research or active implementation.
  - plans/ owns planning and execution of implementation derived from product and roadmap.
  - Research and spike outputs inform implementation but do not become authority by themselves.
  - Critical standards-watch items remain research while claims are unverified.
open:
  - The name and mechanism for standards-watch review metadata are deferred to metadata/workflow design.
  - Validation queue references this topic but does not own these top-level creation criteria.
related:
  - ./taxonomy-foundation.md
  - ./taxonomy-types.md
  - ./work-log-and-handoff.md
  - ../log.md
  - ../workspace-reset.md
distill_to:
  - TAX-RESEARCH
  - final taxonomy rules for plans/
  - final taxonomy rules for spikes/
  - final taxonomy rules for research/
---

# Research, Spikes, and Plans Log

This topic owns the workspace reset discussion around unverified external intake,
critical standards-watch items, and the still-open responsibilities for top-level
`plans/`, `spikes/`, and `research/`.

Cross-links:

- Top-level folder placement for `plans/`, `spikes/`, and `research/` is owned by
  `taxonomy-foundation.md`.
- Durable document type responsibilities such as product/specs/architecture/decisions
  are owned by `taxonomy-types.md`.
- Step/session/current-work/handoff mechanics are owned by `work-log-and-handoff.md`.
- `LOG-007` discovery triage is referenced here only for the research/current-work boundary;
  the `LOG-007` body owner is `work-log-and-handoff.md`.

## LOG-005 — External Research Intake

Status: decided

@user
작업 외 시간에 발견한 외부 저장소, PR과 아이디어 링크를 어디에 담고 어떤 성격으로
관리할지 질문했다.

Examples:

- kanbots: CLI 및 운영체제별 모델
- shadcn-ui PR: proxy 관련
- microsoft/apm: compose YAML과 유사한 구성 모델

@codex
이 정보는 requirement, accepted decision, plan이나 단순 bookmark가 아니라 아직 검증되지
않은 외부 적용 후보인 `research lead`라고 분류했다.

@claude
research를 최하위 비권위 external intake type으로 정의했다.

- `docs/`가 아니라 top-level `research/`를 추천
- research는 외부 구현으로의 포인터와 적용 가설
- spike는 우리가 수행하는 내부 POC이므로 별개
- 외부 아이디어가 우리 약속으로 바뀌려면 decision을 거쳐야 함

Structure draft:

```text
research/
  inbox.md
  <topic>.md
```

Status draft:

```text
unreviewed -> investigating -> adopted | rejected | deferred
```

Required information draft:

- URL과 추가 날짜
- provenance
- 관심 이유
- 적용 가능성 가설
- 예상 target
- status
- 기각 이유 또는 재검토 조건
- 채택 시 생성된 artifact 링크

Transition firewall:

```text
research -> decision -> product/spec/architecture
research -> spike/plan -> 검증 결과 -> decision -> 권위 문서
```

@codex
- [x] research lead를 별도 type으로 둠
- [x] authority는 없음
- [x] 위치 후보는 top-level `research/`
- [x] inventory 전에 빈 inbox를 만들지 않음

@user-answer
- [x] 외부 참고 입력을 research 성격으로 분류한다.
- [x] 영향도가 높아도 검증 전에는 권위를 부여하지 않는다.
- [x] top-level `research/`와 decision 경유 전이를 현재 안으로 유지한다.

Conclusion:

- Research owns investigation of external links, ideas, repositories, and documents.
- Research is investigation input, not authority or an implementation commitment.
- `research/` is a top-level candidate. Empty inbox or topic files are not created
  yet; this remains a provisional operating constraint until inventory or actual
  intake need justifies them.

## LOG-006 — Critical Standards Watch

Status: provisional, unverified

@user
2026년 7월 28일 MCP protocol의 stateless 전환을 주장하는 LinkedIn 게시물을 제공하고,
제품 영향이 커도 research인지 질문했다.

@codex
영향도와 권위는 별도 축이므로 여전히 research라고 답했다.

```text
type: standards-watch
authority: none
impact: potentially-critical
urgency: high
status: unverified
review-by: 2026-07-28
```

Reasoning:

- LinkedIn은 2차 출처
- Release Candidate 주장으로 최종 표준이 아님
- 현재 코드와 실제 충돌 범위를 조사하지 않음
- 대응 방향이 아직 결정되지 않음

Needed flow:

```text
critical research lead
-> 공식 RC와 최종 specification 검증
-> 현재 제품 영향 분석
-> 필요 시 spike
-> 대응 decision
-> spec/architecture/roadmap/plan 반영
```

@user-answer
- [x] 중요도가 높아도 검증 전에는 research라는 구분을 수용했다.

Open:

- 게시물의 각 주장을 공식 MCP 자료와 대조
- 실제 aiox 영향 범위
- `review-by`가 deadline인지 review trigger인지 metadata 이름 확정

Conclusion:

- Criticality changes urgency and review priority, not authority.
- Standards-watch can be high-impact research while remaining unverified.
- Official-source verification and impact analysis are required before decision or
  authority documents change.

## Reference — LOG-007 Discovery Triage

Status: reference only

The `LOG-007` body is owned by `work-log-and-handoff.md`. This topic references only
the discovery triage rule that affects research and current work:

1. 현재 Step 완료에 필수: 현재 Step checklist에 포함
2. 나중에 필요: stable ID를 부여해 뒤에 추가
3. 현재 범위 밖의 외부 자료 조사: research 후보로 분리

This reference does not introduce a backlog document type or folder.

## TAX-RESEARCH Decision

Status: decided

@user-answer

- [x] `research/`는 외부 링크, 아이디어, repository와 문서를 조사하고 정리한다.
- [x] `spikes/`는 research에서 발견했거나 구현 중 드러난 가능성과 불확실성을
  실험한다.
- [x] `plans/`는 product와 roadmap에 따른 구현을 계획하고 실행한다.
- [x] plan 진행 중 구현 불확실성이 생기면 spike로 분리해 실험하고 결과를 plan에
  반영할 수 있다.
- [x] backlog나 추가 문서 type, 복잡한 상태·전이 체계는 이 단계에서 정의하지 않는다.

Approved flow:

```text
외부 링크·아이디어·문서 조사
-> research

research 또는 구현 과정에서 나온 가능성·불확실성 실험
-> spike

product·roadmap에 따른 구현 계획과 실행
-> plan
```

Creation tests:

- `research`: 외부 자료나 아이디어를 조사·정리할 필요가 있는가?
- `spike`: 구현에 필요한 가능성이나 불확실성을 실험으로 확인해야 하는가?
- `plan`: product와 roadmap에 따라 구현할 내용을 계획하고 실행해야 하는가?
