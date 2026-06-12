---
status: active
scope: TAX-TYPES document type responsibilities
source:
  - migrated LOG-003
  - migrated LOG-004
  - migrated LOG-011
  - migrated LOG-012
  - migrated LOG-015
  - migrated LOG-016
  - migrated LOG-017 decisions/history/guides portion
decided:
  - product owns product intent and principles, not the old PRD folder wholesale.
  - roadmap owns owner/team-facing direction and priority, not task checklists.
  - specs owns stable external conformance and reimplementation contracts.
  - architecture owns internal structure, responsibility placement, and flow satisfying specs.
  - implementation HOW remains code/test authority except for contracts, cross-module invariants, externally observable or safety-bearing behavior, and repeated footguns.
  - decisions owns the selected outcome among alternatives and the still-valid load-bearing rationale and tradeoffs.
  - history/ keeps the name but narrows to hard-to-reconstruct events, investigation, deferrals, resolution, and temporal narrative.
  - history entries are compact post-episode narratives created only when authoritative documents cannot preserve context needed to avoid wrong or repeated work.
  - guides/ is retained as non-authoritative learning/how-to/runbook material for humans and agents.
  - guides own repeatable procedures and link to authoritative values instead of copying them.
open:
  - Whether guide frontmatter or minimum non-authority header is required.
  - Lifecycle handling for superseded decisions and deferred choices.
  - Validation queue owns Batch 1 sample selection and history/archive comparison.op
  - research-spikes-plans.md owns top-level plans/, spikes/, and research/ creation criteria.
related:
  - ./taxonomy-foundation.md
  - ./work-log-and-handoff.md
  - ./research-spikes-plans.md
  - ./validation-and-open-decisions.md
  - ../workspace-reset.md#current-taxonomy-snapshot
distill_to:
  - docs/product/
  - docs/specs/
  - docs/architecture/
  - docs/decisions/
  - docs/history/
  - docs/guides/
---

# Taxonomy Types Log

This topic owns the responsibility and creation-condition discussion for durable
document types: `product`, `roadmap`, `specs`, `architecture`, `decisions`,
`history`, and `guides`.

Cross-links:

- The high-level type list in `LOG-002` is owned by `taxonomy-foundation.md`; this
  file references it as upstream context and does not copy it.
- Work-log as a workflow primitive appears in the second half of `LOG-017`, but
  that portion is owned by `work-log-and-handoff.md`.
- `plans`, `spikes`, and `research` type responsibilities are owned by
  `research-spikes-plans.md`.
- The integrated folder tree and authority-order draft are owned only by
  `workspace-reset.md` `Current Taxonomy Snapshot`.

## LOG-003 — History, Decisions and Records

Status: provisional, requires Batch 1

@codex
초기에는 기존 `history/`를 decisions, specs, architecture, plans, guides와 Git
history로 분해하고 독립 history taxonomy를 제거하는 안을 제안했다.

@claude
이 안에 반대했다.

- Git history는 사건과 판단의 narrative를 대체하지 못한다.
- decision은 주제 축의 선택 근거이고 history는 시간 축의 사건·보류·해결 기록이다.
- history를 해체하면 cold agent가 여러 commit과 ADR을 재조합해야 한다.

@gemini
활성 작업 과정은 plan이 소유하고 완료 시 architecture/spec/decision/Git으로
증류하는 방식을 제안했다. 다만 narrative 손실을 막을 보완책이 필요하다고 했다.

@codex
두 의견을 반영해 `records/` 절충안을 제안했다.

- decisions: 선택, 대안, rationale와 trade-off
- records: 재구성하기 어려운 사건, 조사, 보류와 해결의 narrative
- plans: 활성 실행 상태
- Git: 실제 변경 내역

권장 경계:

> 선택의 rationale과 trade-off는 decisions가 소유하고, 사건·조사·보류·해결의
> 시간적 narrative는 records가 소유하며 서로 링크한다.

@codex

- [ ] 기존 `history/`를 그대로 영구 유지
- [ ] 기존 `history/`를 즉시 폐지하지 않고 migration 입력으로 유지
- [ ] Batch 1에서 decisions/records 분리 가능성과 link churn을 검증
- [ ] 최종 이름을 `records/`로 확정

@user-answer

- [x] 기존 `history/`를 즉시 폐지하지 않는다.
- [x] 실제 샘플 검증 후 최종 구조와 명칭을 결정한다.

Revised:

@user-answer

- [x] 최종 폴더 이름 후보는 `records/`가 아니라 기존 `history/`를 유지한다.
- [x] 다만 성격은 `records/` 절충안이 제안한 범위, 즉 재구성하기 어려운 사건,
      조사, 보류와 해결의 시간적 narrative를 가져간다.
- [x] `history/`는 decision rationale나 현재 실행 상태를 대신 소유하지 않는다.

Open:

- `history/`가 새로운 범용 저장소가 되지 않도록 하는 생성 기준
- 기존 `*.history.md`와 inbound link를 유지할 때 naming 정리 범위
- 실제 샘플에서 narrative와 rationale가 중복 없이 분리되는지

## LOG-004 — Roadmap

Status: provisional

@user
Roadmap이 taxonomy 어디에 있는지, 새로 만들어야 하는지 질문했다.

@codex
`docs/product/roadmap.md`를 제안했다. 제품 방향과 Now/Next/Later를 소유하되 일정,
checklist와 현재 실행 상태는 소유하지 않는다고 설명했다.

@claude
Roadmap은 product나 plan과 lifecycle이 다른 독립 type이라고 판단했다. singleton
하나를 위해 최상위 폴더를 만들 필요는 없으므로 product 인접 위치인
`docs/product/roadmap.md`에 동의했다.

경계:

- product: WHAT, 제품 정의와 범위
- roadmap: ORDER/PRIORITY intent
- plan: 활성 실행 상세
- AGENTS current-work pointer: 지금 수행하는 단일 작업
- CHANGELOG: 완료·배포된 사용자 체감 변경

전이:

```text
roadmap item active
-> plans/<workstream>/<workstream>.md 생성 및 연결

work completed
-> roadmap에서 제거
-> 필요 시 CHANGELOG 또는 records가 결과 인계
```

@codex

- [ ] Roadmap을 독립 document type으로 정의
- [ ] 위치 후보는 `docs/product/roadmap.md`
- [ ] inventory 전에 빈 roadmap 파일을 만들지 않음
- [ ] 기존 문서에서 direction/current-work/checklist 내용을 분리할 수 있는지 검증

@user-answer

- [x] Roadmap을 독립 type으로 보는 현재 안을 유지한다.
- [x] 위치는 `docs/product/roadmap.md`를 우선 검토한다.
- [x] inventory 전에는 새 파일을 만들지 않는다.

Revised:

@user-answer

- [x] 현재 `roadmap.md`의 audience는 외부 사용자가 아니라 repo owner다.
- [x] 나중에 함께 작업하는 사람이 생기면 그 사람과 공유할 수는 있다.
- [x] 따라서 roadmap은 public marketing 문서가 아니라 내부 방향·우선순위 문서로
      취급한다.

## LOG-011 — Guides

Status: provisional

@user
`docs/guides/`가 필요한지 의문을 제기했다. README와 겹치지 않는지,
`CONTRIBUTING.md`도 guides에 들어가는지, guides가 사람과 agent 둘을 위한 문서인지
질문했다.

@codex
`guides/`는 유지하되 범위를 좁게 두는 것이 낫다고 답했다.

- README는 repo 첫 화면, orientation, quickstart와 주요 링크를 소유한다.
- `guides/`는 반복 가능한 절차의 상세 runbook을 소유한다.
- 사람과 agent 모두 사용할 수 있지만 agent policy나 current work state는 소유하지
  않는다.
- `CONTRIBUTING.md`는 GitHub와 개발자 생태계의 root singleton으로 두고, 상세 절차만
  `docs/guides/`로 링크하는 편이 낫다.

@claude
사용자가 aiox 채널 밖에서 별도로 질문한 답변을 제공했다. Claude는 `guides/` 유지를
추천하되 "단단한 계약"이 있어야 한다고 했다.

- `guides/`는 개념 설명과 how-to의 무시간적 축이고, `history/`는 사건·조사
  narrative의 시간축이므로 합치면 축 혼동이 재발한다.
- `guides/`를 없애면 README가 비대해지거나, 권위 문서가 설명 산문으로 오염되거나,
  `history/`가 개념 설명을 떠안게 되어 더 나쁜 구조가 된다.
- `guides/`는 권위 내용을 복붙하지 않고 링크만 해야 하며, 제품 상태나 약속의
  source가 되어서는 안 된다.
- cold agent의 제품 상태 경로는 `AGENTS.md` pointer, `product/`, roadmap, active
  `plans/`이고 `guides/`는 그 경로에서 제외해야 한다.
- 각 guide에 `authority: no` 같은 표시와 "learning/explainer, not authoritative"
  문구를 두는 방안을 제안했다.
- 권위 문서가 guides에 의존하지 않도록 authority 문서에서 guides로의 inbound link를
  금지하고, guides가 권위 문서를 참조하는 방향만 허용하자고 제안했다.

@codex

- [ ] `docs/guides/`를 제거한다.
- [ ] `docs/guides/`를 유지하되 비권위 learning/how-to/runbook으로 제한한다.
- [ ] README, 권위 문서, `history/`에 guides 역할을 흡수한다.

@user-answer

- [x] `docs/guides/`는 유지한다.
- [x] `guides/`는 사람과 agent가 함께 참고할 수 있는 절차·학습 문서로 보되, 권위
      문서나 agent policy 문서로 취급하지 않는다.

Open:

- `guides/`에 frontmatter를 강제할지, 최소 header 문구만 둘지
- authority 문서에서 guides로의 link 금지 규칙을 얼마나 엄격히 적용할지
- 기존 `docs/aiox/` 성격의 learning record가 Batch 1 샘플에서 guides로 잘 매핑되는지

## LOG-012 — Product, Specs and Architecture Boundaries

Status: provisional, requires Batch 1

@user
`product/`, `specs/`, `architecture/`의 차이를 아직 명확히 이해하지 못했고,
`guides/`가 필요한지도 의문이라고 했다. Gemini에게 줄 read-only 검토 프롬프트를
요청했다.

@gemini
사용자가 별도로 받은 답변을 제공했다. Gemini는 세 폴더를 "무엇을 묘사하는가"와
"언제 변경되는가"로 구분했다.

- `product/`: Intent. 왜 만드는가, 목표, 요구사항, 유즈케이스, 제품 원칙과
  비기능적 제약을 소유한다.
- `specs/`: Contract. 외부 API, CLI, 데이터 스키마, 프로토콜 포맷과 주요 컴포넌트
  사이의 인터페이스 계약을 소유한다.
- `architecture/`: Implementation Topology. specs를 만족하기 위한 내부 모듈 경계,
  프로세스 트리, 데이터 흐름, 상태 머신과 저장 경계를 소유한다.

Gemini의 authority 제안:

- Why/What 충돌은 `product/`가 권위다.
- Interface/Data 충돌은 `specs/`가 권위다.
- 내부 동작과 모듈 경계 충돌은 `architecture/`가 권위다.
- 각 문서는 다른 문서의 세부 내용을 복사하지 않고 링크로 위임한다.

Gemini는 초기 구조에서 `guides/` 제거도 추천했다. 이유는 cold agent가 시스템 이해를
위해 절차 문서보다 reference 문서를 우선 읽어야 하고, agent 행동 지침은 `AGENTS.md`
나 README가 소유할 수 있다는 판단이었다. 대안으로 기본 실행 방법은 README, 운영
시나리오는 architecture, 예제는 specs에 흡수할 수 있다고 했다.

@codex
Gemini의 `product = Intent`, `specs = Contract`, `architecture = Topology` 구분은
현재 taxonomy 초안과 잘 맞는다. 다만 `guides/` 제거 제안은 Claude/Codex의
"tight guides 유지" 판단과 충돌한다. `guides/`를 제거하면 README, authority 문서,
`history/`가 절차·학습 내용을 떠안을 위험이 있으므로 별도 검증이 필요하다.

@user-answer

- [x] `product/`, `specs/`, `architecture/`의 기본 구분은 어느 정도 이해했다.
- [x] 실제 `product` 문서, architecture 문서, `roadmap.md`를 만들 때 작성 결과를
      검증해야 한다.
- [x] Gemini 설명은 참고 입력이며, 아직 최종 확정 규칙으로 취급하지 않는다.

Open:

- Batch 1에서 기존 PRD/spec 성격 문서가 `product/`, `specs/`, `architecture/`로
  중복 없이 분해되는지 검증한다.
- `roadmap.md`가 `product/` 내부의 독립 문서로 충분한지, 별도 top-level singleton이
  필요한지 실제 작성 시 검증한다.
- `guides/` 유지와 제거 중 어느 쪽이 README/AGENTS/authority 문서의 비대화와
  오염을 줄이는지 샘플로 검증한다.

## LOG-015 — PRD Product Split Review

Status: provisional, requires Batch 1

@user
`TAX-TYPES`의 `product` 논점을 위해 `prd/archive`와 `prd.md`를 확인해달라고 했다.
이후 범위를 넓혀, `prd/` 하위 전체와 `plan` 같은 형식에도 현재 프로젝트와 roadmap
설명이 있을 수 있으니 확인하고, Gemini prompt와 Claude read-only 검토를 통해
`docs/product` 하위에 무엇이 들어가고 어떤 내용은 어디로 가야 하는지 보고해달라고 했다.

@codex
로컬에서 `prd/` 전체 파일 목록과 `plan/` 후보 목록을 확인했다. `prd.md` 파일은 없고,
현재 PRD entry는 `prd/README.md`였다. `prd/mvp/aiox-mvp-spec.md`,
`prd/post-mvp/aiox-a2a-spec.md`, pre-validation 문서, `plan/post-mvp.plan.md`,
`plan/mvp-implementation-checklist.md`의 Post-MVP/Open Product Issues 섹션,
`plan/release-plan.md`, `plan/README.md`를 좁게 확인했다.

초기 판정:

- 기존 `prd/`는 새 taxonomy의 `product/`로 그대로 이동할 수 없다.
- `prd/mvp/aiox-mvp-spec.md`와 `prd/post-mvp/aiox-a2a-spec.md`는 product, specs,
  architecture, decisions, history, guides, roadmap, research가 섞인 mega-doc이다.
- `plan/post-mvp.plan.md`는 roadmap 자체가 아니라 execution index지만, `Sequenced`
  섹션은 `docs/product/roadmap.md`로 증류할 후보가 있다.
- `plan/release-plan.md`는 product가 아니라 배포 시점의 plan/checklist 후보이다.

@claude
aiox read-only 검토 결과를 제공했다. 지정 scope의 PRD 10개를 전부 읽고, plan-like
문서는 파일명 중심으로 보았다고 했다.

Claude의 핵심 판정:

- `prd/README.md`는 구 taxonomy 규칙 문서이며 product 콘텐츠가 아니다.
- `prd/mvp/aiox-mvp-spec.md`는 Goal/Non-Goals/Product Principles, CLI 계약,
  architecture, core domain model, storage, open product issues, testing runbook,
  Post-MVP 목록이 섞인 mega-doc이다.
- `prd/post-mvp/aiox-a2a-spec.md`는 product 정의, protocol/spec, adapter/compose contract,
  architecture/capability/location-neutral 원칙, roadmap/deferred/open question,
  guides/research가 섞인 mega-doc이다.
- `prd/post-mvp/archive/*`는 not authority로 표시됐지만 Post-MVP 설계 investigation
  narrative이며, 결론은 `aiox-a2a-spec.md`, 근거는 `history/58`로 consolidated됐다고
  되어 있다.
- `prd/pre-validation/*`는 검증 결과와 spike 참조를 담은 historical evidence에 가깝다.

Claude의 destination 제안:

- `docs/product/product.md`: aiox canonical 정의, product model, MVP Goal/Non-Goals,
  Product Principles. MVP는 closed stage이므로 stage 한정으로 표기한다.
- `docs/product/roadmap.md`: MVP Post-MVP 목록, A2A federation horizon, deferred 목록을
  direction intent로 증류한다.
- `docs/specs/`: CLI 계약, domain model, storage, A2A envelope, adapter 4-slot/tier,
  compose schema, glossary.
- `docs/architecture/`: process topology, module layout, plane/module mapping,
  message flow, daemon namespace, capability model, location-neutral 원칙.
- `docs/decisions/`: Step 15/Step 13, open product issues, pre-validation Decision 열.
- `docs/history/`: post-mvp archive investigation narrative와 pre-validation 검증 과정.
- `docs/guides/`: smoke 명령 runbook, 위험한 은유/anti-pattern explainer.
- `research/`: A2A spec 말미 외부 링크.
- `spikes/`: pre-validation이 참조하는 POC 코드.
- `plans/`: post-mvp plan, release plan, QA tracker, implementation checklist, sub-plans.

Claude가 지적한 risks:

- `mvp-spec` 내부에 superseded invariant와 Step 15 amendment가 공존한다.
- closed MVP 문서에 과거 진행 상태와 현재 상태가 섞여 있다.
- `aiox-a2a-spec.md`에도 `:memory:` 같은 현재 상태가 spec에 박혀 있을 수 있다.
- `claude-opinion.md` 일부는 텍스트가 깨졌으므로 migration 전 cleaning 필요하다.
- archive 5개 고유 추론이 `history/58`에 이미 증류됐는지 대조해야 한다.

@codex
Claude 결과와 로컬 확인은 대체로 정합한다. `docs/product/`에 바로 들어갈 것은 제품의
intent와 방향뿐이며, 기존 PRD mega-doc을 이름만 바꿔 넣으면 taxonomy가 실패한다.
특히 `aiox-a2a-spec.md`는 Batch 1 stress sample 1순위로 적합하다.

@codex

- [x] 기존 `prd/`를 통째로 `docs/product/`로 이동하지 않는다.
- [x] `prd/mvp/aiox-mvp-spec.md`와 `prd/post-mvp/aiox-a2a-spec.md`를 mega-doc으로 보고
      product/specs/architecture/decisions/history/guides/research로 split 판정한다.
- [x] `docs/product/product.md`에는 canonical product intent와 제품 원칙만 증류한다.
- [x] `docs/product/roadmap.md`에는 owner/team-facing 방향과 우선순위만 증류한다.

@user-answer

- 2026-06-08: 사용자가 `product`와 `roadmap`의 책임·생성 조건·금지 범위 잠정안에
  동의했다.
- 승인된 범위: 기존 `prd/`를 `docs/product/`로 통째 이동하지 않고, product는 제품
  intent와 원칙만 소유하며, roadmap은 owner/team-facing 방향과 우선순위만 소유한다.
- 승인되지 않은 범위: Batch 1 샘플 선정, `history/58`과 archive 대조, authority,
  lifecycle, naming, link 규칙.

Open:

- `history/58`과 archive 5개를 대조해 고유 narrative가 남아 있는지 확인해야 한다.
- MVP spec을 현재 권위 spec으로 볼지, closed-stage record와 아직 유효한 contract의
  혼합물로 볼지 결정해야 한다.
- `aiox-a2a-spec.md`를 Batch 1 stress sample 1순위로 삼을지 결정해야 한다.

## LOG-016 — Specs and Architecture Boundary Review

Status: proposed, awaiting user decision

@user
`specs`가 결국 architecture의 세부 구현 설명이 아니냐고 물었고, 구현 세부는 해당
코드와 테스트를 읽는 것이 맞는지 확인했다. 이후 Claude에게 의견을 들어보라고 했다.

@codex
초기 기준으로 `architecture`는 시스템 구조, 책임 배치, 흐름과 원칙을 소유하고,
`specs`는 CLI, JSON-RPC, A2A envelope, adapter interface, compose schema, storage
shape, error/state behavior처럼 경계에서 검증 가능한 contract를 소유한다고 제안했다.
구현 세부의 call order, helper 사용, local control flow는 기본적으로 code/test가
권위이며, 공유 invariant, 외부 관찰 behavior, data/protocol safety rule, 반복
footgun일 때만 문서로 승격한다고 설명했다.

@claude
Codex의 방향은 대체로 맞지만 `verifiable at boundaries`는 architecture flow도
integration test로 검증될 수 있어 모호하다고 지적했다. 더 나은 판별선은
`외부 conformer/재구현이 구속되는가`라고 제안했다.

Claude의 핵심 제안:

- `specs`는 aiox를 처음부터 재구현해도 호환을 위해 동일하게 유지해야 하는
  vendor-neutral contract다.
- `architecture`는 그 specs를 만족시키는 내부 배치이며, 재구현하면 정당하게 바뀔 수
  있는 구조와 책임 배치다.
- adapter는 한 type으로 묶지 않는다. 새 adapter가 구현해야 할 interface slot은
  `specs`, 특정 vendor adapter 내부 topology는 `architecture`다.
- state/error behavior도 나눈다. 외부 관찰 가능하거나 safety-bearing인 transition은
  `specs`, 내부 state 관리와 cache sync는 `architecture`다.
- 구현 HOW는 code/test가 권위다. 특히 test나 type이 더 안정적으로 고정할 수 있으면
  문서가 아니라 test와 짧은 code pointer를 우선한다.
- `difficult state transition`이 아니라 `observable/safety-bearing state transition`만
  문서 승격 기준으로 삼는다.

@codex
Claude의 `external conformance / reimplementation survival` 기준이 기존
`verifiable at boundaries`보다 더 명확하다고 판단한다. 사용자 승인 후보는 다음이다.

- [ ] `specs`는 외부 conformer 또는 미래 재구현이 호환성을 위해 반드시 지켜야 하는
      contract를 소유한다.
- [ ] `architecture`는 specs를 만족시키기 위한 내부 구조, 책임 배치, 흐름과 원칙을
      소유한다.
- [ ] 구현 세부 HOW는 기본적으로 code/test가 권위이며, 문서는 conformance contract,
      cross-module invariant, externally observable behavior, safety-bearing transition,
      반복 footgun만 승격한다.
- [ ] adapter와 state/error behavior는 단일 type으로 넣지 않고 interface/observable
      contract와 internal topology/state management로 분리한다.

@user-answer

- 2026-06-08: 사용자가 `specs`와 `architecture`의 포함관계 설명 후 잠정 승인했다.
- 승인된 범위: `specs`는 외부 conformer 또는 미래 재구현이 호환성을 위해 반드시
  지켜야 하는 stable contract를 소유하고, `architecture`는 그 contract를 만족시키기
  위한 내부 구조, 책임 배치, 흐름과 원칙을 소유한다.
- 승인된 구현 세부 원칙: 구현 HOW는 기본적으로 code/test가 권위이며, 문서는
  conformance contract, cross-module invariant, externally observable behavior,
  safety-bearing transition, 반복 footgun만 승격한다.
- 추가 질문: 사용자가 `prd/post-mvp/archive/codex-claude-validation.md`의
  `local 내부 -> local-remote -> 회사 내부망 -> remote <-> remote` 같은 점진 확장
  단계가 roadmap인지 물었다.
- Codex 판정: 이 내용은 세부 task checklist가 아니라 local-first에서 remote/federation
  horizon으로 가는 제품·플랫폼 확장 순서이므로 `roadmap` 성격이 맞다. 다만
  `AioxEnvelope`, `AioxRoute`, `AioxTransport`, `AioxIdentity`, `AioxPolicy` 같은
  구성요소와 location-independent 원칙은 각각 `specs` 또는 `architecture`로 분리해야
  한다.

@claude
현재 변경 내용을 read-only로 리뷰했다. Blocking 이슈는 없고, `specs`와
`architecture` 잠정 승인 기록은 정확하다고 했다. 다만 roadmap 판정과 구성요소 분류는
Batch 1에서 흔들리지 않도록 더 정밀하게 기록해야 한다고 지적했다.

Claude review findings:

- 같은 local->remote->federation 단계라도 source 문맥에 따라 역할이 다르다.
  `aiox-a2a-spec.md`의 단계 목록은 구현 순서가 아니라 location-neutrality가 보존해야
  하는 확장 범위이므로 `architecture` invariant 또는 forward-compat contract 성격이다.
  반면 `codex-claude-validation.md`의 "내 추천 확장 순서" 문맥은 roadmap priority
  intent다.
- 따라서 roadmap은 local->remote->federation 우선순위 intent만 증류하고, 5단계
  invariance scope 자체는 architecture가 소유해야 한다. 양쪽에 같은 목록을 복붙하지
  않고 roadmap은 architecture invariant를 링크해야 한다.
- 구성요소를 `specs 또는 architecture`로 남기면 migration 때 ad-hoc 판정 위험이 있다.
  `AioxEnvelope` wire contract, `agent://...` address format, `AioxRoute` schema와
  semantics는 `specs`다.
- `AioxTransport`는 socket, named pipe, TCP 같은 OS transport를 contract로 굳히면
  재구현을 부당하게 구속하므로 `architecture`다.
- `AioxPolicy`와 `AioxIdentity`는 split한다. Policy의 관찰 가능한 enforcement와
  Identity address format은 `specs`, policy engine과 identity resolution은
  `architecture`다.
- `workspace-reset.md` Handoff가 LOG 결정을 재진술하면 drift가 생길 수 있으므로,
  장기적으로는 LOG ID pointer 중심으로 줄이는 것이 좋다.
- `Current Synthesis`에 `product/product.md`가 누락되어 있었고, authority order에
  `archive`가 남아 있었으며, `TAX-TYPES`와 `TAX-ROADMAP` 중 어느 Step이 roadmap
  contract를 최종 소유하는지 caveat가 필요하다.

Revised:

@codex

- [x] `specs`는 외부 conformer 또는 미래 재구현이 호환성을 위해 반드시 지켜야 하는
      contract를 소유한다.
- [x] `architecture`는 specs를 만족시키기 위한 내부 구조, 책임 배치, 흐름과 원칙을
      소유한다.
- [x] 구현 세부 HOW는 기본적으로 code/test가 권위이며, 문서는 conformance contract,
      cross-module invariant, externally observable behavior, safety-bearing transition,
      반복 footgun만 승격한다.
- [x] adapter와 state/error behavior는 단일 type으로 넣지 않고 interface/observable
      contract와 internal topology/state management로 분리한다.
- [x] roadmap은 local->remote->federation priority intent를 소유할 수 있지만,
      location-neutrality 보존 범위와 extension invariant는 architecture가 소유한다.
- [x] `AioxEnvelope`, address format, route schema/semantics는 `specs`다.
- [x] `AioxTransport`와 identity/policy internal resolution·engine은 `architecture`다.
- [x] roadmap 관련 세부 수명·전이 계약은 `TAX-ROADMAP`에서 최종 조정하고,
      `TAX-TYPES`는 roadmap의 document type 책임만 잠정 정의한다.

## LOG-017 — Decisions, History, Guides Boundary Review

Status: decided

@user
`decisions`는 specs, architecture, plan, product 등에 대한 선택에서 tradeoff 후보
중 왜 특정 하나를 선택했는지 작성하는 것인지 물었다. 이어 `history`와 `guides`가
현재 workspace reset work-log 기록 방식과 비슷한지, history는 대화 주제, 사용자 질문, agent
답변, 다른 agent 의견, 종합, 재질문, revised 같은 템플릿이면 좋지 않겠냐고 제안했다.

@codex
`decisions`는 중요한 선택의 이유를 소유한다고 답했다. 즉 문제, 선택지, tradeoff,
최종 선택, 받아들인 비용, 재검토 조건, 영향을 받는 문서 링크를 기록한다. 단 최종
contract 자체는 `specs`, 구조 설명은 `architecture`, 제품 intent는 `product`, 실행
순서는 `roadmap` 또는 `plans`, 시간순 narrative는 `history`, 절차는 `guides`가
소유한다.

`history`는 무슨 일이 어떤 맥락에서 일어났는지 보존하는 durable narrative이며,
조사 과정, 대화나 실험의 흐름, 결정 전후의 맥락, 실패·보류·재시도, 현재 권위 문서만
봐서는 알기 어려운 배경을 담는다고 설명했다.

`guides`는 반복 작업 절차, runbook, troubleshooting, 사용법, onboarding 같은
반복 가능한 수행 절차를 담는다고 설명했다.

사용자가 제안한 history 템플릿은 방향이 맞지만 raw chat log가 아니라 보존 가치 있는
논의 흐름만 압축한 historical narrative여야 한다고 답했다.

@claude
세 경계는 sound하다고 리뷰했다. 다만 `decisions`와 `history`가 모두 과거의 why를
다루므로 템플릿 차원에서 경계를 더 못 박아야 한다고 했다.

Claude review findings:

- `decisions`는 "지금 무엇이 참이고 왜인가"를 소유한다. 선택 결과와 아직 유효한
  rationale/tradeoff이며, 선택을 방어하거나 재검토할 때 인용한다.
- `history`는 "무엇이 일어났는가"를 소유한다. 선택에 도달한 narrative, 가지 않은 길,
  실패와 보류를 포함하지만 권위 사실을 소유하지 않는다.
- 테스트: "지금 무엇이 참이고 왜?"는 `decisions`, "무엇이 일어났나?"는 `history`.
- `history`와 `guides`의 경계는 명확하다. `history`는 1회성 사건의 시간축 narrative,
  `guides`는 반복 가능한 무시간축 절차다.
- 사용자 제안 템플릿은 채택 가능하지만, `Codex answer`나 `other agents' opinions`
  같은 agent-centric 필드명을 durable record에 박으면 안 된다. 1년 뒤 중요한 것은
  어떤 agent가 말했는지가 아니라 어떤 입장과 논거가 있었는지다.
- `history`는 진행 중 transcript가 아니라 episode 종료 후 사후 작성하는 압축
  narrative여야 한다.
- `Synthesis`가 binding choice가 되면 그것은 `decisions` 소유다. `history`는 결과
  decision/spec/architecture/plan 링크로 닫고 재도출하지 않는다.
- 생성 기준은 durability test다. 오늘의 specs/architecture/decisions만으로 미래
  독자가 맥락을 재구성할 수 있으면 history entry를 만들지 않는다.
- 1 episode = 1 compact entry이며, session 단위가 아니다. 교훈 없는 일상 세션은
  history entry가 아니다.

Proposed history template:

```markdown
### <history entry: topic>

- Topic: 중요했던 질문/문제 한 줄
- Trigger: 무엇이 이 논의를 촉발했나
- Considered positions: 테이블에 오른 실질 논거/대안
- Synthesis: 어떻게 정리됐나 (1~3문장)
- Outcome / authority: 결과 decision/spec/architecture/plan link
- Dropped / deferred: 가지 않거나 미룬 길과 이유 (있으면)
```

@codex

- [x] `decisions`는 여러 대안 중 선택한 결과와 아직 유효한 load-bearing
      rationale/tradeoff를 소유한다. 선택을
      방어하거나 재검토할 때 인용하는 문서다.
- [x] `history`는 선택에 도달한 종료된 episode narrative를 소유한다. 권위 사실이나
      active state를 재진술하지
      않고 결과 문서를 link한다.
- [x] `guides`는 반복 가능한 무시간축 절차, runbook, troubleshooting, onboarding을
      소유한다.
- [x] history 생성 기준은 durability test다. 현재 권위 문서만으로 미래 독자가 맥락을
      충분히 재구성할 수 있거나, 기록 부재가 잘못되거나 반복되는 작업을 유발하지 않으면
      entry를 만들지 않는다.
- [x] history 템플릿은 agent별 Q&A가 아니라 topic, trigger, considered positions,
      synthesis, outcome link, dropped/deferred 중심의 사후 압축 episode로 둔다.
- [x] guides는 절차가 바뀔 때 갱신하며, product/spec/architecture/decision의 권위 값이
      바뀔 때 함께 고쳐야 하는 내용을 복사하지 않고 해당 권위 문서로 link한다.

@user-answer

- [x] 2026-06-08 위 경계와 생성 기준을 승인했다.
- [x] 분류 질문은 다음과 같이 둔다.
  - decisions: 여러 대안 중 무엇을 골랐고, 그 선택이 지금도 유효한 근거는 무엇인가?
  - history: 권위 문서만으로 복원되지 않는, 여기까지 온 경위는 무엇인가?
  - guides: 다음에도 같은 일을 어떻게 수행하는가?
- [x] superseded decision과 deferral의 상세 배치는 후속 lifecycle 검토로 넘긴다.

Cross-topic continuation:

- The later `LOG-017` discussion about `work log` as a workflow primitive is owned
  by `work-log-and-handoff.md`.
