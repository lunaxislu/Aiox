---
status: active
scope: split coverage review / validation gate / open decisions
source:
  - migrated Batch 0 Proposed Steps
  - migrated Batch 1 Proposed Validation
  - migrated Open Decisions
  - cross-topic unresolved items from topic logs
decided:
  - Batch 1 is a validation gate, not a full inventory.
  - Batch 1 sample selection should stress taxonomy-breaking documents.
  - Batch 1 results may revise Batch 0 rules before migration.
  - Source draft and temporary topic-log proposal were deleted after split closeout.
open:
  - Batch 1 sample list.
  - Lifecycle/status model.
  - Naming rules for folders and files.
  - Metadata/frontmatter requirements.
  - Link syntax and link responsibility rules.
  - Classification rules for keep/merge/migrate/split/archive/delete.
  - Whether prd/post-mvp/aiox-a2a-spec.md is Batch 1 stress sample 1.
  - Whether to compare history/58 with prd/post-mvp/archive/* for unique narrative.
  - Whether CHANGELOG.md is defined now and created later, or created now.
related:
  - ./taxonomy-foundation.md
  - ./taxonomy-types.md
  - ./work-log-and-handoff.md
  - ./research-spikes-plans.md
  - ../log.md
  - ../workspace-reset.md
distill_to:
  - TAX-CLASSIFY
  - TAX-AUTHORITY
  - TAX-LIFECYCLE
  - TAX-NAMING
  - TAX-METADATA
  - TAX-LINKS
  - Batch 1 validation plan
---

# Validation and Open Decisions Log

This topic owns the split closeout control surface: Batch 0 status, Batch 1
validation criteria, open cross-topic decisions, and coverage checks that should
not be buried inside a single topic log.

It does not own the current folder tree or authority-order snapshot. That snapshot
is owned only by `workspace-reset.md` `Current Taxonomy Snapshot`.

Cross-links:

- `log.md` owns the split workflow and coverage review checklist.
- Topic-local rationale remains in the corresponding topic logs.
- This file owns the review queue for unresolved cross-topic choices and Batch 1
  sample selection.

## Batch 0 Proposed Steps

Status: provisional

| Step ID | Scope | Status |
| --- | --- | --- |
| `TAX-FOLDERS` | 최상위와 하위 폴더 구조 | completed |
| `TAX-TYPES` | 문서 종류와 생성 조건 | completed |
| `TAX-AUTHORITY` | 권위 범위와 충돌 해결 | completed |
| `TAX-LIFECYCLE` | 상태, 수명과 전이 | in review |
| `TAX-NAMING` | 폴더·파일 naming | in review |
| `TAX-LINKS` | 문서 간 link 책임 | in review |
| `TAX-CLASSIFY` | keep/merge/migrate/split/archive/delete 기준 | pending |
| `TAX-PLAN` | Phase/Step/Session/Current Work/Handoff 계약 | provisional |
| `TAX-ROADMAP` | Roadmap 책임과 전이 | provisional |
| `TAX-RESEARCH` | 외부 intake와 검증 workflow | completed |
| `TAX-METADATA` | 필수 header/frontmatter 여부 | open |
| `TAX-RULESDOC` | 최종 taxonomy 규칙의 소유 위치 | provisional |

Batch 0 completion conditions:

- 모든 Step의 계약 초안을 사용자가 검토한다.
- 미결 항목은 명시적으로 deferred하거나 Batch 1 검증 항목으로 지정한다.
- Batch 1에서 사용할 판정표와 삭제 전제조건을 확정한다.

Notes:

- Some statuses above were inherited from the deleted source draft and reconciled
  during topic-log split closeout.
- `TAX-TYPES` and `TAX-RESEARCH` are approved in their active topic logs, but final
  durable rules have not been distilled.
- `TAX-PLAN` has an active topic log and remains provisional.

## Batch 1 Proposed Validation

Status: pending

Sample selection criteria:

1. decision과 narrative가 섞인 history 문서
2. product/spec/architecture가 섞인 PRD 또는 spec
3. 하위 README 또는 plan/docs 중복 문서

Judgment output draft:

| Source | Content role | Destination | Action | Unique information | Inbound links | Delete prerequisites |
| --- | --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD | TBD | TBD |

Batch 1 is not a full inventory. It is a validation gate using samples likely to
break the taxonomy. Its result may revise Batch 0 rules before migration.

Open:

- Whether `prd/post-mvp/aiox-a2a-spec.md` is Batch 1 stress sample 1.
- Whether to compare `history/58` with `prd/post-mvp/archive/*` for unique narrative.
- Which lower README or duplicated plan/docs sample should be used.

## Open Decisions

Status: unresolved

Authority model:

@user-answer
- [x] 전역 authority 순서를 사용하지 않고 질문별 scoped authority를 사용한다.
- [x] 같은 내용을 여러 문서가 소유하면 순위로 덮지 않고 책임에 맞는 owner로
  통합하고 다른 문서는 link한다.
- [x] `history`, `guides`, `spikes`, `research`는 현재 제품 사실이나 구현 commitment를
  결정하는 권위 문서가 아니다.

Scoped authority:

| Question | Owner |
| --- | --- |
| 제품 목적, 범위, 원칙 | `product` |
| 외부 동작, interface, contract | `specs` |
| 내부 구조, 책임, flow | `architecture` |
| 여러 대안 중 내린 선택과 유효한 근거 | `decisions` |
| 우선순위와 추진 순서 | `roadmap` |
| 실제 구현의 현재 동작 | code and tests |
| 현재 구현 작업의 단계와 진행 상태 | `plans` |
| agent 작업 범위와 행동 규칙 | `AGENTS.md` |

`product`, `specs`, `architecture`, `decisions`, `roadmap`, `plans`는 각 scope에서
무엇이어야 하는지에 대한 intended owner다. Code와 tests는 현재 실제 구현이 무엇을
하는지에 대한 fact owner일 뿐, 무엇이어야 하는지를 결정하지 않는다.

Conflict rules:

- 책임이 다른 문서는 서로의 전체 우선순위를 정하지 않고 각 질문의 owner를 따른다.
- 같은 책임의 내용이 충돌하면 owner 문서를 기준으로 다른 문서를 수정하거나 link로
  바꾼다.
- code/tests와 `specs`, `architecture`, `plans`가 다르면 권위 경쟁이 아니라 intended
  state와 actual state 사이의 drift로 본다. Code/tests는 현재 사실을 증명하고,
  intended owner는 승인된 목표를 정의한다. 어느 쪽이 stale한지 확인해 승인된
  intent에 맞게 조정한다.
- 실제 구현을 새 intent로 채택하려면 관련 `decision`과 intended owner를 명시적으로
  갱신한다. Code가 그렇게 동작한다는 이유만으로 contract나 architecture를 조용히
  바꾸지 않는다.
- 아직 유효한 `decision`에 반하는 결과 변경은 기존 문서를 조용히 편집하지 않고
  해당 선택을 대체하는 새 decision을 필요로 한다.
- 제품 scope와 non-goals는 `product`, 그 scope 안의 우선순위와 순서는 `roadmap`이
  소유한다. Roadmap은 product scope를 확장하지 않는다.
- `plans`의 완료 표기와 code/tests의 실제 검증 결과가 다르면 drift로 보고 plan의
  상태를 실제 결과에 맞춰 조정한다.
- `AGENTS.md`는 구속적인 agent 규칙을 소유하고 `guides`는 비권위 절차만 소유한다.
  Guide는 `AGENTS.md` 규칙을 override하지 않는다.
- Cross-cutting 요구도 새 owner를 만들지 않는다. 외부에 보장할 동작은 `specs`,
  이를 만족하는 내부 mechanism은 `architecture`, 추진 우선순위는 `roadmap`이
  소유한다.
- `README.md`는 사람용 진입점이며 durable product/spec/architecture 내용을 대신
  소유하지 않는다.

Metadata model:

@codex
- [ ] 공통 frontmatter를 강제
- [ ] 문서 종류별 최소 Markdown header만 강제
- [ ] machine-readable 검사가 필요한 문서에만 frontmatter 사용

Link model:

@codex
- [ ] 상대경로 Markdown link만 허용
- [ ] 향후 Atlas를 고려해 다른 link syntax 병행을 허용

History naming:

@codex
- [ ] `records/` 명칭 확정
- [ ] 기존 `history/` 명칭을 유지하되 생성 규칙을 축소

Changelog timing:

@codex
- [ ] `CHANGELOG.md`를 taxonomy에만 정의하고 release 시작 시 생성
- [ ] 현재부터 생성

@user-answer
- 아직 선택하지 않음.

Notes:

- Coverage review status for inherited options:
  - Authority model: scoped authority and owner-based conflict resolution are approved.
    The existing folder model remains unchanged.
  - Metadata model: still open.
  - Link model: still open.
  - History naming: `history/` name is provisionally accepted; final creation criteria
    remain open.
  - Changelog timing: creating `CHANGELOG.md` now is superseded; revisit at distribution
    or external-user readiness remains the trigger.
- `history/` naming has provisional direction in `taxonomy-types.md`, but final
  creation criteria remain open.
- `CHANGELOG.md` is currently not created; distribution or external-user readiness is
  the revisit trigger in `taxonomy-foundation.md`.

## Coverage Review Queue

Status: completed

Checks inherited from `log.md`:

- `Current Synthesis`는 `workspace-reset.md`에만 있고 topic logs에는 복사되지 않는다.
- The former source draft `Current Synthesis` was checked against the
  `workspace-reset.md` snapshot and retired.
- The former source draft `Purpose` and `Recording Format` were superseded by
  `log.md` Purpose, Writing Rules, and Topic Log Template.
- 모든 `LOG-*`, Batch section, Open Decisions가 owner 또는 explicit reference를 가진다.
- 한 LOG의 body owner는 하나만 둔다. 다른 topic에서는 reference로만 연결한다.
- 작업 순서와 split 운영 규칙은 `log.md`가 소유한다.
- dangling forward links는 split closeout 전 해소한다.

Current topic ownership map:

| Source area | Owner |
| --- | --- |
| `LOG-001`, `LOG-002`, `LOG-008`, `LOG-010`, `LOG-013`, `LOG-014` | `taxonomy-foundation.md` |
| `LOG-003`, `LOG-004`, `LOG-011`, `LOG-012`, `LOG-015`, `LOG-016`, `LOG-017` decisions/history/guides portion | `taxonomy-types.md` |
| `LOG-005`, `LOG-006` | `research-spikes-plans.md` |
| `LOG-007`, `LOG-009`, `LOG-017` work-log portion | `work-log-and-handoff.md` |
| Batch 0, Batch 1, Open Decisions, coverage queue | `validation-and-open-decisions.md` |
| Purpose and Recording Format supersession, split workflow, and writing rules | `log.md` |
| Current Work, Handoff, Current Taxonomy Snapshot | `workspace-reset.md` |

Open coverage tasks:

- [x] Reconcile stale status labels inherited from the deleted source draft.
- [x] Resolve or explicitly defer forward links before split closeout.
- [x] Delete the source draft after user approval.
- [x] Close the temporary topic-log proposal after split closeout.
- [x] Delete the closed topic-log proposal record after user approval.

Closeout review, 2026-06-08:

- The former source draft `Current Synthesis` matched the snapshot shape and former
  authority-order draft in `workspace-reset.md`; it is retired and superseded by the
  current folder shape and scoped-authority model there.
- The former source draft `Purpose` and `Recording Format` were superseded by `log.md`
  Purpose, Writing Rules, and Topic Log Template.
- All LOG sections, Batch sections, and Open Decisions have an owner or explicit
  reference in the topic ownership map above.
- No blocking dangling forward link was found in the approved topic-log set.
- User approved deleting the former source draft and closed topic-log proposal record.
- Topic log `source:` entries now use migrated source identifiers rather than links to
  deleted files.
