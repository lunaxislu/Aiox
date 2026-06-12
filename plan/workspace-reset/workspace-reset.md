# Workspace Reset

## Purpose

현재 repo에는 README, PRD, spec, plan, docs와 stage별 기록이 여러 위치에 흩어져
있고, 같은 내용이 반복되거나 문서의 역할과 수명이 불명확하다. 이 때문에 사용자는
어떤 문서를 읽고 관리해야 하는지 판단하기 어렵고, agent도 많은 문서를 반복해서
읽거나 서로 다른 상태를 해석하면서 context와 token을 낭비한다.

이번 reset의 목표는 단순히 파일 수를 줄이는 것이 아니다. 먼저 문서 taxonomy,
폴더 이름, 파일 네이밍, 작성 규칙과 문서 간 관계를 정하고, 그 기준으로 현재 문서를
keep, merge, migrate, split, archive/delete 판정한다.

- 각 문서 종류의 책임, 권위, 수명과 상호 관계를 명확히 한다.
- 문서를 담을 폴더 체계와 파일 네이밍 규칙을 확정한다.
- 중복 내용은 하나의 적절한 위치로 통합하고 불필요한 문서는 검증 후 제거한다.
- 현재 `history/`처럼 decision, spec 변경 근거, 작업 경위가 섞인 영역은 새 taxonomy에
  맞춰 재분류한다.
- 하위 README는 단독으로 삭제하지 않고 상위·동급 문서와 함께 검토한다.
- 사용자가 프로젝트 구조와 현재 상태를 이해하고 직접 관리할 수 있게 한다.
- agent가 repo의 소수 진입 문서와 명시된 입력만 읽고 작업을 재개할 수 있게 한다.
- 공유 상태와 결정이 문서와 workflow에 제대로 배치되게 하여 agent별 memory가
  필요하지 않은 구조를 만든다.
- 정리된 문서 구조를 먼저 만든 뒤, 그 구조를 기준으로 workflow, hook, skill과
  로컬 Vault·Atlas를 설계한다.
- 이후 Vault·Atlas가 repo 문서를 그래프로 해석할 수 있도록 PRD, spec, architecture,
  decision/history, plan, docs, spike 사이의 link 책임을 명확히 한다.

이 파일은 workspace reset 기간의 plan과 todo를 함께 관리하는 임시 진입점이며,
작업 완료 후 삭제한다.

## Current State

- 기존 WS2 script/hook/skill 구현은 중단했다.
- Vault·Atlas 논의는
  `history/59-local-obsidian-vault-atlas-discussion.history.md`에 기록했다.
- 기존 `AGENTS.md` 본문은
  `plan/workspace-reset/AGENTS.previous.md`에 비권위 snapshot으로 보존했다.
- agent memory에는 새 상태나 todo를 추가하지 않는다.

## Current Taxonomy Snapshot

Status: provisional, non-authoritative resume snapshot

이 섹션은 현재까지의 통합 folder tree와 authority-order draft만 소유한다. 세부 문서
type 책임, naming, lifecycle, link 규칙과 rationale은 topic log가 소유하고, 최종
durable taxonomy rules는 workspace reset closeout 전에 별도 rules document로 증류한다.

Topic log 결정이 folder shape나 scoped authority를 바꾸면 이 snapshot도 함께 갱신한다.
다른 topic log, `log.md`, validation 문서는 아래 tree와 scoped authority를 복사하지
않고 이 섹션을 가리킨다.

```text
README.md
AGENTS.md
CLAUDE.md
CONTRIBUTING.md                    # 배포·외부 사용자 준비 시 재검토
CHANGELOG.md                       # 배포 시 재검토

docs/
  README.md                        # 사람용 docs entry
  AGENTS.md                        # docs 영역 agent 작업 계약
  CLAUDE.md                        # 필요 시 docs/AGENTS.md pointer
  product/
    product.md                     # canonical product intent와 제품 원칙
    roadmap.md                     # owner/team-facing 내부 방향 문서
  specs/
  architecture/
  decisions/
  history/
  guides/

plans/
  <workstream>/
    <workstream>.md

spikes/
  <topic>/
    <topic>.md

research/
  inbox.md
  <topic>.md
```

현재 scoped authority:

| Question                             | Owner          |
| ------------------------------------ | -------------- |
| 제품 목적, 범위, 원칙                | `product`      |
| 외부 동작, interface, contract       | `specs`        |
| 내부 구조, 책임, flow                | `architecture` |
| 여러 대안 중 내린 선택과 유효한 근거 | `decisions`    |
| 우선순위와 추진 순서                 | `roadmap`      |
| 실제 구현의 현재 동작                | code and tests |
| 현재 구현 작업의 단계와 진행 상태    | `plans`        |
| agent 작업 범위와 행동 규칙          | `AGENTS.md`    |

`history`, `guides`, `spikes`, `research`는 현재 제품 사실이나 구현 commitment를
결정하는 권위 문서가 아니다. `README.md`는 사람용 진입점이며 durable knowledge를
대신 소유하지 않는다.

`product`, `specs`, `architecture`, `decisions`, `roadmap`, `plans`는 각 scope에서
무엇이어야 하는지에 대한 intended owner다. Code와 tests는 현재 실제 구현이 무엇을
하는지에 대한 fact owner일 뿐, 무엇이어야 하는지를 결정하지 않는다.

문서가 충돌하면 전역 순위로 덮지 않고 질문의 owner를 따른다. 같은 내용을 여러
문서가 소유하면 책임에 맞는 owner로 통합하고 다른 문서는 link한다. Code/tests와
intended owner가 다르면 권위 경쟁이 아니라 drift로 보고, 어느 쪽이 stale한지
확인해 승인된 intent에 맞게 조정한다. 실제 구현을 새 intent로 채택하려면 관련
decision과 intended owner를 명시적으로 갱신한다.

## Working Rules

- 한 번에 한 단계만 진행하고 각 단계마다 사용자 검토를 받는다.
- 이 문서의 `Current Work`가 지정한 파일만 기본 입력으로 읽는다.
- 조사와 분류는 read-only로 시작한다.
- 문서 이동·통합·삭제는 제안과 사용자 승인 후 수행한다.
- 기존 사용자·agent 변경을 되돌리거나 덮어쓰지 않는다.
- 커밋은 사용자가 명시적으로 요청할 때만 목적별로 분류해 수행한다.
- Handoff에는 다른 owner 문서의 결정·이력을 복사하지 않고 다음 세션 재개에 필요한
  변경점, 첫 행동, 제한 사항과 pointer만 기록한다. 재개 상태가 바뀌면 누적하지 않고
  현재 상태로 교체한다.
- workspace reset closeout 전에 `Current Taxonomy Snapshot`을 durable taxonomy rules
  document로 증류했는지 확인한다.

## Agent Coordination

- workspace reset 동안 Codex가 coordinator 역할을 맡는다.
- Claude는 독립적으로 결정을 내리거나 파일을 수정하지 않고, Codex가 aiox MCP를 통해
  명시적으로 요청한 조사, 의견, 보완, 검토만 수행한다.
- Gemini는 현재 aiox MCP에 연결되어 있지 않다. Gemini를 사용할 경우 Codex가
  read-only 조사 프롬프트를 작성하고, 사용자가 그 프롬프트를 Gemini에게 전달한 뒤
  결과를 다시 제공하는 방식으로 진행한다.
- Claude와 Gemini에게 요청하는 기본 작업은 read-only 조사와 구조화된 결과 반환이다.
- Codex는 Claude/Gemini 결과를 그대로 채택하지 않고 원문, Git 근거, inbound link와
  대조한 뒤 사용자에게 판정안을 보고한다.
- Claude/Gemini에게 파일 편집을 맡기려면 사용자에게 별도 승인을 받은 뒤 write scope를
  좁게 지정한다.

## Current Work

### TAX-LIFECYCLE — Document Status and Lifetime

Status: in review

Inputs:

- `AGENTS.md`
- `plan/workspace-reset/log.md`
- `plan/workspace-reset/logs/taxonomy-types.md`
- `plan/workspace-reset/logs/research-spikes-plans.md`
- `plan/workspace-reset/logs/validation-and-open-decisions.md`
- 이 파일

Goal:

- 각 문서 type의 생성, active, superseded, closeout과 삭제·보존 조건을 필요한
  수준으로만 정한다.
- 불필요한 공통 상태 체계를 만들지 않고 type별 실제 수명 차이를 확인한다.
- `TAX-LIFECYCLE` 완료 전에는 naming, Batch 1로 넘어가지 않는다.

Expected output:

- lifecycle 승인안 또는 수정안
- 승인 결과를 반영한 existing owner 문서와 이 파일의 상태 갱신
- 다음 taxonomy 단계에 대한 명시적 gate

Review needed:

- 다음 단계에서 문서 type마다 실제로 필요한 생성·종료·보존 조건을 단순하게
  설명하고 승인/수정한다.

## Handoff

Updated: 2026-06-08

Last action:

- `TAX-TYPES`, `TAX-RESEARCH`, `TAX-AUTHORITY` 승인을 반영하고 completed 처리했다.
- 다음 작업을 `TAX-LIFECYCLE`로 설정한 뒤 세션을 중단했다.

Required pointers:

- 현재 상태와 범위: 이 파일의 `Current Work`
- 승인된 구조와 authority: 이 파일의 `Current Taxonomy Snapshot`
- 세부 type 책임과 근거: `log.md`가 가리키는 topic logs

Next action:

- 다음 세션에서 `TAX-LIFECYCLE`을 시작하고 type별 수명 조건을 단순하게 설명한다.
- `TAX-LIFECYCLE` 완료 전에는 naming, Batch 1로 넘어가지 않는다.

Do not proceed to:

- naming, Batch 1, 문서 이동·통합·삭제
- workflow/hook/skill 또는 Vault·Atlas 구현
- 전체 문서 영역 일괄 탐색이나 agent memory 변경

## Templates

### Current Work Template

```markdown
## Current Work

### <batch or task name>

Status: in review | in progress | blocked | completed

Inputs:

- `<path>`

Goal:

- <what this batch is trying to decide or change>

Expected output:

- <review, decision, patch, inventory, or migration result>

Review needed:

- <specific user decision needed before proceeding>
```

### Handoff Template

```markdown
## Handoff

None
```

Use `None` when the next session can start from `Current Work` alone. If the
task is paused or carried into the next session, use:

```markdown
## Handoff

Updated: YYYY-MM-DD

Last action:

- <what was just done>

Required pointers:

- <owner document or section needed to resume>

Next action:

- <first concrete action for the next session>

Do not proceed to:

- <work that remains explicitly blocked or out of scope>
```

Do not copy decisions, history, or review logs owned by other documents into
Handoff. Keep only the current resume delta, first action, constraints, and
required pointers. Replace stale Handoff content instead of appending a session
history.

## Work Sequence

1. **Document taxonomy and naming model** — in progress
   - 문서를 담을 폴더 체계와 파일 네이밍 규칙을 먼저 정의한다.
   - README, PRD, spec, architecture, decision/history, docs, plan과 필요한 경우
     spike의 책임, 권위, 수명, 작성 규칙과 상호 link 책임을 정한다.
   - 문서 종류별 `keep`, `merge`, `migrate`, `split`, `archive`, `delete` 판정
     기준과 삭제 전 검증 조건을 정한다.
   - 이 taxonomy와 작성 규칙을 어디에 기록할지와 첫 적용 inventory/migration
     review batch를 정한다.
2. **Batch inventory and review** — pending
   - Gemini가 승인된 문서 묶음을 읽고 고유 정보, 중복, 참조와 역할을 조사한다.
   - Codex가 원문·Git 근거와 조사 결과를 대조하고 사용자에게 판정안을 제시한다.
   - 하위 README는 해당 상위 폴더와 같은 선상의 문서를 함께 조사한다.
3. **Document structure and migration decisions** — pending
   - 실제 inventory를 근거로 현재 폴더와 파일을 새 taxonomy에 매핑한다.
   - README, roadmap, PRD, spec, architecture, decision/history, docs, plan, spike와
     AGENTS.md의 최종 책임과 수명을 묶음별로 결정한다.
   - MVP/Post-MVP PRD, 기존 plan/checklist, `spike/`·`spikes/`, docs와 history에서
     보존할 결정의 목적지를 검토한다.
4. **Batch migration and deletion** — pending
   - 승인된 내용을 먼저 이동·통합하고 참조를 갱신한다.
   - 고유 정보 보존, inbound link와 대체 진입점을 확인한 뒤 승인된 문서만 삭제한다.
5. **Repository documentation validation** — pending
   - 최종 문서 구조에 중복, dead link, stale 상태와 역할 충돌이 없는지 확인한다.
   - repo 문서만으로 새 세션이 필요한 상태와 문맥을 찾을 수 있는지 확인한다.
   - 이 조건을 충족하면 agent memory를 제거하거나 비우는 작업을 검토한다.
6. **Workflow design** — pending
   - 정리된 문서 구조를 기준으로 세션 진입, 작업 단위, handoff, 검토, 완료와 커밋
     방식을 정한다.
7. **Hook, skill, Vault and Atlas** — pending
   - 확정된 workflow를 기준으로 필요한 hook과 skill을 구현한다.
   - Vault·Atlas 설계 시 `history/59-local-obsidian-vault-atlas-discussion.history.md`를
     입력으로 읽고 granularity, note schema와 `code-review-graph` spike를 결정한다.
8. **Closeout** — pending
   - 최종 AGENTS.md와 진입 문서를 검증한다.
   - `plan/workspace-reset/AGENTS.previous.md`와 이 임시 plan을 삭제한다.
   - 기존 WS2 계획 중 새 구조에서 여전히 필요한 항목만 재평가한다.

## Next Review

사용자가 문서 taxonomy, 폴더/파일 네이밍 모델, 작성 규칙 초안, 해당 모델을 기록할
위치, 첫 적용 inventory/migration review batch와 Gemini 사용 여부를 확정한다.
