# Workspace Reset Work Logs

Status: draft
Authority: non-authoritative work-log index
Owner plan: [workspace-reset.md](./workspace-reset.md)

## Purpose

이 문서는 workspace reset work log의 entry point다. 현재 진행 위치와 handoff는
`workspace-reset.md`가 소유하고, 이 파일은 log 파일 목록과 작성 규칙만 소유한다.

Work log는 결정을 만드는 과정의 staging record이며, 최종 권위 문서가 아니다. 작업이
닫힐 때 내용은 owning document type으로 증류되거나 삭제된다.

## Current Snapshot Owner

현재 통합 folder tree와 authority-order draft의 단일 owner는
[`workspace-reset.md`](./workspace-reset.md)의 `Current Taxonomy Snapshot`이다.
`log.md`와 topic logs는 그 내용을 복사하지 않고 pointer만 둔다.

## Topic Logs

| Topic log                                        | Scope                             | Status | Digest                                                         | Distill target               |
| ------------------------------------------------ | --------------------------------- | ------ | -------------------------------------------------------------- | ---------------------------- |
| [logs/taxonomy-foundation.md](./logs/taxonomy-foundation.md) | taxonomy foundation and folder entry contracts | active | Batch flow, docs parent, root singleton, README/AGENTS patterns | `TAX-FOLDERS` / `TAX-RULESDOC` |
| [logs/taxonomy-types.md](./logs/taxonomy-types.md) | durable document type responsibilities | active | product, roadmap, specs, architecture, decisions, history, guides | final taxonomy rules |
| [logs/work-log-and-handoff.md](./logs/work-log-and-handoff.md) | active work logs and handoff workflow | active | Step/session split, work-log staging, Current Work/Handoff roles | `TAX-PLAN` / workflow design |
| [logs/research-spikes-plans.md](./logs/research-spikes-plans.md) | external research, standards watch, and top-level plans/spikes/research boundaries | active | Research authority firewall, critical standards-watch, plan/spike open boundaries | `TAX-RESEARCH` / final taxonomy rules |
| [logs/validation-and-open-decisions.md](./logs/validation-and-open-decisions.md) | split coverage review, Batch validation, and cross-topic open decisions | active | Batch 0/1 gates, unresolved authority/metadata/link/classification choices | `TAX-CLASSIFY` / validation plan |

## Split Workflow

The monolithic source draft was kept until all approved topic logs were created and
coverage review passed. The user then approved deleting the source draft and the
temporary topic-log proposal.

1. Source draft LOG 항목을 topic log로 옮긴다.
2. `log.md`의 index에 생성된 topic log와 status를 기록한다.
3. `workspace-reset.md`로 옮겨야 하는 현재 통합 snapshot은 `Current Taxonomy Snapshot`
   에만 둔다.
4. Claude read-only review를 받고, blocking/minor/ok를 사용자에게 보고한다.
5. 사용자가 확인한 뒤 다음 approved topic log를 진행한다. 이 단계는 split 생성 중에만
   적용한다.
6. 모든 topic log 생성 후 source draft 기준으로 coverage review를 수행한다.
7. coverage review가 통과하면 topic log의 `source:`를 유지, 축소, 삭제할지 결정한다.
8. 마지막에 source draft 삭제 또는 보존 여부를 사용자 승인으로 결정한다.

Coverage review checks:

- `Current Synthesis`는 `workspace-reset.md`에만 있고 topic logs에는 복사되지 않는다.
- Source draft `Current Synthesis`는 coverage review 때 `workspace-reset.md` snapshot과
  대조한 뒤 retired/superseded 처리 여부를 결정한다.
- Source draft `Purpose`와 `Recording Format`은 이 파일의 Purpose, Writing Rules,
  Topic Log Template로 supersede되는지 확인한다.
- 모든 `LOG-*`, Batch section, Open Decisions가 owner 또는 explicit reference를 가진다.
- 한 LOG의 body owner는 하나만 둔다. 다른 topic에서는 reference로만 연결한다.
- 작업 순서와 split 운영 규칙은 `log.md`가 소유한다.
- dangling forward links는 split closeout 전 해소한다.

## Writing Rules

- `log.md`는 전체 index와 작성 규칙만 담는다.
- 현재 어디를 진행 중인지는 `workspace-reset.md`의 `Current Work`와 `Handoff`가 소유한다.
- topic log는 topic별 frontmatter에 decided/open/distill target을 둔다.
- topic log body는 append-only로 작성한다. 기존 이유를 지우지 않고 `Revised`를 추가한다.
- 사용자 승인 없이 `[x]`나 decided 항목으로 표시하지 않는다.
- 사실 확인 전 주장은 `unverified`, 샘플 검증 전 합의는 `provisional`로 표시한다.
- Work log는 세션별 활동 로그가 아니다. taxonomy 결정에 영향을 주는 대화만 남긴다.
- raw transcript를 붙이지 않고, 질문·입장·반론·리뷰·revised·결론을 요약한다.
- Handoff는 topic log 내용을 복사하지 않고 필요한 topic log로 point한다.
- topic log의 결론은 closeout 때 owning document type으로 증류한다.

## Topic Log Template

```markdown
---
status: active | draft | closed | revisit
scope: <batch-or-topic>
source:
  - <source path or LOG ids>
decided:
  - <user-approved or closed point>
open:
  - <open question>
related:
  - <related topic log or source>
distill_to:
  - <owning document type or path>
---

# <Topic> Log

## LOG-001 — <question or decision topic>

Status: proposed | accepted | revised | closed

@user
<question, concern, or proposal summary>

@codex
<answer, position, or proposal summary>

@claude
<review, objection, or independent opinion summary>

Revised:

- <what changed and why>

Conclusion:

- <current provisional conclusion or link to owning document>
```

## Distillation Guide

| Content role                                       | Owning destination                                       |
| -------------------------------------------------- | -------------------------------------------------------- |
| Product intent, target, principles, scope          | `docs/product/`                                          |
| Direction, priority, horizon                       | `docs/product/roadmap.md` or roadmap owner decided later |
| External conformance contract                      | `docs/specs/`                                            |
| Internal structure, responsibility, flow           | `docs/architecture/`                                     |
| Selected option and still-valid rationale/tradeoff | `docs/decisions/`                                        |
| Durable episode narrative, dead ends, deferrals    | `docs/history/`                                          |
| Repeatable procedure or runbook                    | `docs/guides/`                                           |
| Execution steps and active work                    | `plans/`                                                 |
| External intake before adoption                    | `research/`                                              |
| Experiment or POC                                  | `spikes/`                                                |
