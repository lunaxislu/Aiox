# Package Controlling Log Annotated Skeleton

이 문서는 worked example이 아니라 annotated structure skeleton이다. 목적은 상세 규칙을 읽기 전에
controlling package log의 파일 표면과 owner 경계를 먼저 복원하는 것이다. placeholder 값을 기본값처럼
복사하지 않는다.

Package controlling log는 Base log surface를 유지하고 package 전용 8표면을 더한다. 세부 Package
규칙은 `../../references/package-log.md`가 소유한다. Base mechanics는
`../../references/loop-rules.md`가 소유한다. 명령 syntax는 `../../scripts/package-log --help`와
`../../scripts/log --help`가 소유한다.

```markdown
---
topic: <package topic>
description: <stable package description>
status: open | decided | superseded
---

# <package title>

## Work Items

- [>] W1 <package executable or coordination work item>

## Required Context

### Return Target

- None: independent log.

### {Global}

- <standing package-wide frame>

## Package Scope

- Revision: N; History pointer: <history pointer>
- Primary boundary: <primary artifact/change boundary>
- Related artifacts in allowed write-set:
  - <related artifact or TBD>
- Excluded:
  - <excluded artifact or N/A>

## Workflow / Agent Plan

- <package phase, role, execution mode, review anchor, risk gate plan>

## Task Index

| W-id | Profile | Mode | Task record |
| --- | --- | --- | --- |
| W1 | Compact | inline | <task record path> |

## Evidence

- <current accepted package-level evidence>

## Cross-Artifact Effects

- <primary-to-related effect, or N/A with Reason and Activate when>

## Decision Candidates

- <decision-worthy rationale, or N/A with Reason and Activate when>

## Verification Contract

- Revision: N; History pointer: <history pointer>
- Required: <verification and source>
- Recommended: <verification and source>
- Unavailable: <verification and reason>
- Waived: <verification and authority>

## Closeout Contract

- Revision: N; History pointer: <history pointer>
- Criteria: <package done/correct criteria>
- Readiness: <current readiness or blockers>

## YYYY-MM-DD · <unit block topic>

<package History entry>
```

## Owner Notes

- Base Work Items, Required Context, History and status/Closeout mechanics remain present.
  See `../../references/loop-rules.md`.
- Package-specific structure is the fixed 8-surface skeleton above.
  See `../../references/package-log.md#fixed-package-skeleton`.
- The fixed 8-surface skeleton may be used for shallow recognition of an existing controlling package log before
  Route / Contract Gate. Package activation and task-record restoration are owned elsewhere.
- Do not delete non-applicable package surfaces. Use `N/A`, `Reason`, and `Activate when`.
  Scope, Verification Contract and Closeout Contract require evidence before being marked not applicable.
- `Package Scope` owns the primary boundary, related artifacts and allowed cross-artifact write-set.
  See `../../references/package-log.md#artifact-and-evidence-tests`.
- `Task Index` maps executable W to Compact/Full profile, execution mode and canonical task record path.
  It does not own progress/completion state. See `../../references/package-log.md#state-ownership-and-task-contract`.
- `Evidence` owns current accepted evidence. Contradictions are recorded in History and reconciled.
  See `../../references/package-log.md#artifact-and-evidence-tests`.
- `Cross-Artifact Effects`, `Decision Candidates`, `Verification Contract` and `Closeout Contract` participate in
  package Reconcile and Closeout. See `../../references/package-log.md#package-reconcile` and
  `../../references/package-log.md#package-closeout`.
