# Base Log Annotated Skeleton

이 문서는 worked example이 아니라 annotated structure skeleton이다. 목적은 상세 규칙을 읽기 전에
Base log의 파일 표면과 owner 경계를 먼저 복원하는 것이다. placeholder 값을 기본값처럼 복사하지
않는다.

세부 Base 규칙은 `../references/loop-rules.md`가 소유한다. 명령 syntax는
`../scripts/log --help`가 소유한다.

```markdown
---
topic: <short stable topic>
description: <stable description, not current next/handoff>
status: open | decided | superseded
---

# <human-readable title>

## Work Items

- [>] W1 <current local actionable work item>
- [ ] W2 <remaining work item>
- [x] W3 <completed work item>
- [-] W4 <cancelled work item> — cancelled: <reason>
- [→] W5 <transferred work item> — transferred: <target>
- [↓] W6 <detached work item> — detached: <child log> — reason: <reason>

## Required Context

### Return Target

- None: independent log.

### {Global}

- <standing frame that applies to the whole log>

### {W1,W2}

- <standing frame scoped to W1 and W2>

## YYYY-MM-DD · <unit block topic>

<first History entry for this owning block>

### YYYY-MM-DD HH:MM · <entry topic>

<later History entry appended to the same owning block>
```

## Owner Notes

- Frontmatter is the minimal structural index: `topic`, `description`, `status`.
  See `../references/loop-rules.md#frontmatter`.
- `## Work Items` owns Work state: markers, `[>]` next pointer, transfer/detach state and actionable work.
  Rationale belongs in History. See `../references/loop-rules.md#work-state--required-context`.
- `## Required Context` owns standing context by scope. Event history and rationale belong in History.
  See `../references/loop-rules.md#work-state--required-context`.
- `### Return Target` owns whether this log returns a result to a source log or is independent.
  See `../references/loop-rules.md#return-target`.
- `## YYYY-MM-DD · <unit block topic>` is the owning History block for one unit.
  See `../references/loop-rules.md#log-blocks`.
- `### YYYY-MM-DD HH:MM · <entry topic>` is a later entry inside the same owning block.
  New facts that change Work state or Required Context must be reconciled in the same action.
  See `../references/loop-rules.md#reconcile`.
