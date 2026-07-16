# Package Task Record Annotated Skeleton

이 문서는 worked example이 아니라 annotated structure skeleton이다. 목적은 상세 규칙을 읽기 전에
package task record의 Compact/Full shape와 owner 경계를 먼저 복원하는 것이다. placeholder 값을
기본값처럼 복사하지 않는다.

세부 task record 계약은 `../../references/package-log.md#task-record-contract`가 소유한다. Compact와
Full 선택은 독립 lifecycle 필요성으로 판단한다. 명령 syntax는 `../../scripts/package-log --help`가
소유한다.

## Compact Task Record

Compact는 base log가 아닌 non-log task-record file이며 local lifecycle을 만들지 않는다. frontmatter
status, Work Items, Required Context, Return Target을 두지 않는다. 공통 4표면만 가진다.

```markdown
# Task Record — <package> W<id>

## Identity

- Controlling log: <controlling package log>
- Package W-id: W<id>
- Profile: Compact
- Execution mode: inline | delegated

## Task Brief <!-- 현재 유효 계약. revision N -->

- Revision: N (reason and authority are in a Task History entry)
- Objective:
- Scope / Excluded / Allowed write-set:
- Required reads:
- Predecessor / candidate dependency, expected baseline·isolation:
- Completion / verification / review / escalation / result-consumer contract:

## Task History <!-- append-only -->

- <Brief revision reason, authority and effect>
- Attempt <k>: source check · execution trace · candidate dependency · artifact disposition · escalation

## Result / Verification

- W-id · Brief revision · Attempt:
- Changed artifacts / results by completion condition:
- Verification: evidence + passed | failed | unavailable | not-run (+ reason)
- Candidate evidence / effect / decision:
- Actual candidate dependency:
- Residual risk / downstream dependency · revalidation:
- Digest + controlling disposition pointer:
```

## Full Task Record

Full은 base child log이자 그 W의 task record다. 자체 Work Items/next pointer, 세션 간 독립 재개,
Return Target이 필요할 때만 만든다. Full은 Base child log surface와 공통 4표면을 결합하고, 별도
non-log duplicate를 만들지 않는다.

```markdown
---
topic: <full child task topic>
description: <stable task description>
status: open | decided | superseded
---

# Task Record — <package> W<id>

## Work Items

- [>] W1 <local child-log work item>

## Required Context

### Return Target

- Log: <controlling package log>
- Work Item: W<id>
- Consume when: <condition for controlling log to consume this result>
- Context snapshot: <valid snapshot for independent resume>

### {Global}

- <standing task frame>

## Identity

- Controlling log: <controlling package log>
- Package W-id: W<id>
- Profile: Full
- Execution mode: inline | delegated

## Task Brief <!-- 현재 유효 계약. revision N -->

- Revision: N (reason and authority are in a Task History entry)
- Objective:
- Scope / Excluded / Allowed write-set:
- Required reads:
- Predecessor / candidate dependency, expected baseline·isolation:
- Completion / verification / review / escalation / result-consumer contract:

## Task History <!-- append-only -->

- <Brief revision reason, authority and effect>
- Attempt <k>: source check · execution trace · candidate dependency · artifact disposition · escalation

## Result / Verification

- W-id · Brief revision · Attempt:
- Changed artifacts / results by completion condition:
- Verification: evidence + passed | failed | unavailable | not-run (+ reason)
- Candidate evidence / effect / decision:
- Actual candidate dependency:
- Residual risk / downstream dependency · revalidation:
- Digest + controlling disposition pointer:

## YYYY-MM-DD · <unit block topic>

<base child log History entry>
```

## Owner Notes

- One executable W has Compact 1개 XOR Full 1개. Do not create both.
  See `../../references/package-log.md#task-record-contract`.
- Compact owns execution trace and candidate result without a local Base lifecycle.
- Full inherits Base child log mechanics and combines them with the task record 4 surfaces.
  See `../../references/loop-rules.md#cross-log--lifetime-transitions`.
- Task Brief is versioned. Material changes to scope, write-set, completion, verification or authority increment
  the revision and append the reason/authority/effect to Task History.
- Result / Verification is candidate state until the controlling package log accepts, rejects or partially accepts it.
  See `../../references/package-log.md#package-reconcile`.
