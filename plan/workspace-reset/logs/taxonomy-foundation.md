---
status: active
scope: TAX-FOLDERS / TAX-RULESDOC foundation
source:
  - migrated LOG-001
  - migrated LOG-002
  - migrated LOG-008
  - migrated LOG-010
  - migrated LOG-013
  - migrated LOG-014
decided:
  - Batch 0 defines the taxonomy contract before migration.
  - Batch 1 stress-tests current documents read-only before migration.
  - docs/ remains the provisional single parent for durable product, structure, decision, and operating knowledge.
  - plans/, spikes/, and research/ are top-level exceptions.
  - archive/ is not created for now.
  - CONTRIBUTING.md and CHANGELOG.md are not created now; revisit at distribution or external-user readiness.
  - README.md is a human entry document.
  - AGENTS.md owns agent entry contracts.
  - CLAUDE.md is only a thin compatibility pointer when needed.
open:
  - Final taxonomy rules document location.
  - How docs/ mixes authoritative and non-authoritative documents without confusing cold agents.
  - Validation queue owns final authority, lifecycle, naming, metadata, link, and CHANGELOG timing decisions.
related:
  - ./taxonomy-types.md
  - ./work-log-and-handoff.md
  - ./validation-and-open-decisions.md
distill_to:
  - TAX-FOLDERS
  - TAX-RULESDOC
  - TAX-NAMING
  - TAX-LINKS
---

# Taxonomy Foundation Log

This topic owns the foundation for the workspace reset taxonomy: the taxonomy-first
workflow, top-level folder shape, docs single-parent preference, root singleton
documents, and entry/contract document pattern.

Cross-links:

- Type responsibilities such as product/specs/architecture/decisions/history/guides
  belong to `taxonomy-types.md`.
- Plan/session/handoff/work-log mechanics belong to `work-log-and-handoff.md`.
- Batch validation samples and unresolved cross-topic decisions belong to
  `validation-and-open-decisions.md`.

## LOG-001 — Taxonomy First Workflow

Status: accepted, revisable

@user
문서 reset은 먼저 어떤 문서가 있어야 하는지를 정하고, 현재 문서를 샘플로 대입해
검증하는 흐름으로 이해했다.

@codex
- Batch 0은 폴더, 문서 종류, 책임, 권위, lifecycle, naming, link와 판정 규칙을
  정의하는 구조 계약 단계다.
- Batch 1은 복잡한 현재 문서 2~3개를 read-only로 분석하여 taxonomy가 실제로
  작동하는지 검증하는 stress test다.
- Batch 1에서는 실제 이동·통합·삭제 없이 매핑과 분해 판정만 작성한다.

@claude
- 2-batch 흐름에 동의했다.
- Batch 1 결과가 Batch 0을 수정할 수 있어야 하며 Batch 0을 즉시 영구 확정하면
  안 된다고 보완했다.
- Batch 0에서 판정·삭제 규칙과 lifecycle까지 정해야 Batch 1이 즉흥적으로 규칙을
  만들지 않는다고 지적했다.

@gemini
- 메타 문서만으로는 taxonomy의 실제 경계를 검증하기 어렵다고 지적했다.
- product/spec/architecture가 섞인 문서와 decision/narrative가 섞인 history 문서를
  대표 샘플로 포함할 것을 제안했다.

@codex
- [ ] Batch 0: 구조 계약 초안
- [ ] Batch 1: 현재 문서 샘플 stress test
- [ ] Batch 1 결과로 Batch 0을 수정할 수 있음
- [ ] 실제 migration은 taxonomy 검증과 사용자 승인 이후 수행

@user-answer
- [x] Batch 0에서 구조 계약을 정한다.
- [x] Batch 1에서 현재 문서 샘플로 stress test한다.
- [x] 검증 결과에 따라 구조 계약을 수정할 수 있다.
- [x] 실제 migration은 이후 사용자 승인 아래 진행한다.

## LOG-002 — Core Document Taxonomy

Status: provisional

@user
문서 종류가 결국 7~8개 정도인지 질문했다.

@codex
핵심 제품 지식 문서와 실행·입력 문서를 구분했다.

핵심 제품 지식:

- product: 무엇을 왜 만드는가
- roadmap: 어떤 순서로 추진하는가
- spec: 어떤 동작을 보장하는가
- architecture: 현재 어떻게 구성됐는가
- decision: 왜 그렇게 선택했는가
- record: 어떤 사건과 해결 과정이 있었는가
- guide: 어떻게 사용·운영하는가
- changelog: 무엇이 배포됐는가

실행·입력·진입 문서:

- plan: 현재 작업 실행과 상태
- spike: 내부 실험
- research: 미검증 외부 정보
- README/AGENTS: 사람과 agent의 진입점

@claude
권위 문서와 비권위 guide를 모두 `docs/` 아래 둘 경우 cold agent가 권위를 혼동할
수 있다고 지적했다. 단일 `docs/` 부모를 유지하려면 폴더별 권위 규칙 또는 metadata
가드가 필요하다고 제안했다.

@gemini
`docs/README.md`가 taxonomy와 작성 규칙의 단일 권위를 소유하는 안에 동의했다.

Open:

- `docs/` 단일 부모 아래 권위·비권위 문서를 함께 둘 때 사용할 authority metadata
- `CHANGELOG.md`가 현재 release 운영에 실제로 필요한지
- frontmatter를 전 문서에 강제할지, 문서 종류별 최소 header만 둘지

Note:

- Detailed type responsibilities belong to `taxonomy-types.md`.

## LOG-008 — Managing the Taxonomy

Status: provisional

@user
문서 종류가 늘어날 때 전체 관리를 어떻게 할지 질문했다.

@codex
문서 종류를 각각 독립적으로 관리하기보다 정보의 intake부터 closeout까지 전이
workflow로 관리한다고 설명했다.

```text
research
-> 필요 시 spike
-> decision
-> product/spec/architecture
-> roadmap
-> plan
-> history/changelog
```

관리 원칙:

- 모든 작업에 모든 문서를 만들지 않는다.
- 내용의 책임과 수명이 필요할 때만 해당 문서를 생성한다.
- 전이 시 원본과 결과를 링크하며 같은 내용을 복사하지 않는다.
- 주기적 형식 관리보다 research triage, 작업 활성화, 계약 변경, closeout과 release
  같은 event에 맞춰 검토한다.
- 자동 검사는 reset과 workflow 확정 후에만 검토한다.

Note:

- The workflow mechanics for creating, closing, and distilling logs belong to
  `work-log-and-handoff.md`.

## LOG-010 — Docs Single Parent

Status: provisional

@user
`TAX-FOLDERS`부터 사용자와 하나씩 의논하고, 아직 제안된 구조를 확정안으로 취급하지
말라고 요청했다. 선택지와 추천, 장단점을 제시하고 사용자 답변을
workspace reset work log에 기록하라고 했다.

@codex
첫 논점으로 `docs/` 단일 부모를 유지할지, 권위 문서와 비권위 문서를 최상위부터
분리할지 제시했다.

- A: `docs/` 아래에 제품 지식 문서를 모은다.
- B: 권위 문서와 비권위 문서를 최상위부터 분리한다.
- C: `docs/`는 관리된 지식 문서로 두고 `plans/`, `spikes/`, `research/`,
  `archive/`는 top-level로 분리한다.

@codex
권장안은 C였지만, A도 진입점이 단순하고 `docs/README.md`가 taxonomy와 작성 규칙을
소유하기 쉽다는 장점이 있다고 설명했다. 단점은 권위가 다른 문서가 같은 부모 아래
놓여 cold agent가 혼동할 수 있으므로 authority 규칙이나 최소 header가 필요하다는
점이다.

@user-answer
- [x] A: `docs/` 단일 부모를 우선한다.
- 이 선택은 `TAX-FOLDERS`의 현재 선호이며 영구 확정안은 아니다.
- `plans/`, `spikes/`, `research/`, `archive/`까지 `docs/` 아래에 둘지 또는
  top-level 예외로 둘지는 다음 논점에서 별도 검토한다.

Revised:

@user-answer
- [x] `plans/`, `research/`, `archive/`, `spikes/`는 top-level로 둔다.
- 따라서 `docs/` 단일 부모는 제품·구조·결정·운영 지식 문서에 적용하고, 활성 실행
  상태, 외부 입력, 실험, 예외 보존 영역은 root에서 분리한다.

Revised:

@user-answer
- [x] `archive/`는 현재 필요하지 않으므로 만들지 않는다.
- [x] 폐기 보존 영역이 실제로 필요해지면 그때 다시 토의한다.

## LOG-013 — Root Singleton Documents

Status: provisional

@codex
`TAX-FOLDERS`를 마무리하기 위한 다음 논점으로 root singleton 기준을 제안했다.
`README.md`, `AGENTS.md`는 유지에 가깝고, `CONTRIBUTING.md`, `CHANGELOG.md`는 언제
만들지 결정해야 한다고 했다.

@user
`CONTRIBUTING.md`는 npm 또는 GitHub 배포 직전, 다른 사람들이 실제로 사용할 수 있게
하기 직전에 작성하는 것이 맞다고 했다. `CHANGELOG.md`도 배포 직전에 작성하고 배포
후 올리는 형식이 좋을 것 같으며, 그 시점에 다시 토의해야 한다고 했다.

현재 배포 계획은 CLI로 Codex와 Claude를 포함한 완전한 구성을 갖춘 뒤이며, 필요하면
Gemini CLI 등 가능한 agent를 추가한 뒤 배포하는 것이다. 배포 상세는 `roadmap.md`,
`product.md` 등 문서를 만든 후 다시 이야기한다.

@codex
- [ ] `CONTRIBUTING.md`를 지금 생성한다.
- [ ] `CHANGELOG.md`를 지금 생성한다.
- [ ] 둘 다 taxonomy의 root singleton 후보로만 남기고, 배포·외부 사용 준비 시점에
  다시 토의한다.

@user-answer
- [x] `CONTRIBUTING.md`는 지금 만들지 않는다.
- [x] `CHANGELOG.md`는 지금 만들지 않는다.
- [x] 둘 다 배포 또는 외부 사용자 준비 시점에 다시 토의한다.
- [x] 배포 계획의 상세는 `roadmap.md`, `product.md` 등 권위 문서를 만든 뒤 다시
  다룬다.

## LOG-014 — README and Agent Entry Documents

Status: provisional

@user
폴더 구조에서 `docs/README.md`나 하위 폴더의 `README.md`를 agent가 반드시 읽는지
질문했다. 이어서 `docs/README.md`는 사람을 위한 문서로 두고, agent 진입 계약은
`AGENTS.md` 또는 필요 시 `CLAUDE.md` 같은 파일에 두는 편이 낫지 않냐고 제안했다.

@codex
하위 `README.md`는 agent가 자동으로 반드시 읽는다고 보장할 수 없다고 답했다. 읽게
하려면 `AGENTS.md` 같은 agent 진입 계약에 명시해야 하며, 초기에는 하위 README를 많이
만들지 않는 편이 낫다고 설명했다.

정리:

- root `README.md`: 사람용 repo 첫 화면.
- `AGENTS.md`: agent 공통 진입 계약, 반드시 읽을 파일, 금지사항, current work pointer.
- `CLAUDE.md`: 실제 Claude 도구가 자동 인식할 때만 두며, 가능하면 `AGENTS.md`로
  위임하는 얇은 pointer.
- `docs/README.md`: 사람이 읽고 관리할 수 있는 문서 taxonomy 설명서. agent도 문서
  작업 시 참고할 수 있지만 강제 진입 계약은 소유하지 않는다.
- `docs/<folder>/README.md`: 처음부터 만들지 않고, 문서 수가 늘거나 읽는 순서가
  실제로 필요할 때만 생성한다.

@user-answer
- [x] `docs/README.md`는 사람 중심의 taxonomy 설명 문서로 둔다.
- [x] agent가 반드시 읽어야 하는 계약은 `AGENTS.md`가 소유한다.
- [x] `CLAUDE.md`는 필요할 때만 얇은 호환 pointer로 검토한다.
- [x] 하위 폴더 README는 초기 구조에 기본 생성하지 않는다.

Revised:

@user-answer
- [x] `docs/README.md`도 긴 taxonomy 본문을 소유하기보다, root의 agent pointer 문서처럼
  얇은 entry/pointer 역할로 두는 방향을 선호한다.
- [x] 자세한 taxonomy 규칙의 최종 소유 위치는 `TAX-RULESDOC`에서 다시 결정한다.
- [x] 현재 workspace에는 root `CLAUDE.md`가 없으므로, 이 결정은 특정 파일을 기준으로
  한 변경이 아니라 "얇은 pointer 문서" 패턴에 대한 선호로 기록한다.

Revised:

@user-answer
- [x] `docs/README.md`는 사람을 위한 docs entry 문서로 둔다.
- [x] `docs/AGENTS.md`는 agent가 docs 영역을 다룰 때 읽는 문서 작업 계약으로 둔다.
- [x] `docs/CLAUDE.md`는 필요 시 `docs/AGENTS.md`를 가리키는 얇은 compatibility
  pointer로 둔다.
- [x] root `AGENTS.md`는 repo 전체 agent 진입 계약을 계속 소유하고, docs-specific
  규칙은 `docs/AGENTS.md`로 위임할 수 있다.

Revised:

@user-answer
- [x] `README.md`는 사람이 읽는 entry 문서로 본다.
- [x] `README.md`와 `AGENTS.md`, 필요 시 `CLAUDE.md`는 같은 scope에 붙어 있는
  entry/contract set으로 본다.
- [x] 패턴은 `<scope>/README.md`, `<scope>/AGENTS.md`, `<scope>/CLAUDE.md?`이다.
- [x] 이 set은 모든 폴더에 만들지 않고, root와 `docs/`처럼 충분히 큰 scope에만 둔다.

Revised:

@user-answer
- [x] 사용자가 root `CLAUDE.md`를 생성했다.
- [x] 현재 root `CLAUDE.md` 내용은 `@AGENTS.md` 한 줄 pointer다.
- [x] 이는 root `AGENTS.md`를 canonical agent 계약으로 두고, Claude 전용 파일은 얇은
  compatibility pointer로 둔다는 원칙과 맞다.
