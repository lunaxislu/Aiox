# 작업 로그 예시

이 문서는 사용자 검토용 예시다. 필수 agent read path가 아니며, 실제 규칙은
`log-writing-rules.md`와 `work-items-rules.md`가 소유한다.

## Work Items marker

`[>]`는 이 로그 안에서 먼저 재개할 Work Item이다. `[ ]`는 남은 작업이다. `[x]`는 이
로그에서 더 이상 actionable하지 않은 항목이며, 완료·취소·이관을 모두 포함할 수 있다.

```markdown
## Work Items

- [>] W1 Inspect current log references.
- [ ] W2 Patch user-facing examples.
- [x] W3 Run markdown review.
- [x] W4 Cancelled: Add a compatibility note. — 새 구조에서 더 이상 필요하지 않다.
- [x] W5 Transferred: Write migration checklist. → logs/log-migration.md — 별도 로그가 이어받는다.
```

완료와 취소, 이관은 모두 `[x]`지만 의미가 다르다. `Cancelled:`와 `Transferred:`가 있으면
성공 완료가 아니라 해당 이유로 현재 로그에서 해소된 것이다.

## Deferred follow-up surfaces in conversation

대화 중 사용자가 별도 입력 자료·리뷰·승인·patch처럼 지금 답변으로 끝나지 않고 나중에
재개되어야 하는 후속을 꺼내면, 단순 발언으로 넘기지 말고 Work Item 후보인지 점검한다.
"다음 세션에서 ~하고 싶다" 같은 미뤄진 의도도 재개·완료 판단이 필요하면 등록한다.

```markdown
# logs/maintenance-review.md before

## Work Items

- [>] W1 Compare current references against the user's structure model.

## 2026-06-16 · User raises a later review

- 사용자: "다음 세션에서 내가 만든 시나리오·이미지·텍스트로 `maintenance.md`를 비교
  리뷰하고 싶다."
- 이건 별도 입력 자료를 받아 나중에 재개되는 독립 흐름이라 단순 발언이 아니다.
```

```markdown
# logs/maintenance-review.md after

## Work Items

- [>] W1 Compare current references against the user's structure model.
- [ ] W2 사용자가 제공할 시나리오·이미지·텍스트로 `maintenance.md`를 리뷰하고 개선 방향을
  보고한 뒤 승인 시 반영한다.

## 2026-06-16 · Register the deferred review

- 후속 리뷰는 별도 입력을 기다렸다 재개되어야 하므로 W2로 등록했다.
- 현재 재개 지점은 W1이라 `[>]`는 옮기지 않았다.
```

반대로 현재 답변 안에서 끝나는 발언은 등록하지 않는다.

```markdown
## 2026-06-16 · No Work Item needed

- 사용자: "방금 그 marker 규칙을 예를 들어 설명해줘."
- 이해용 예시 요청은 이 답변에서 끝나고 나중에 재개할 독립 행동이 없으므로 Work Item을
  추가하지 않는다.
```

## Parent A creates child B

A의 W2를 계속하려면 B의 결정이 먼저 필요하다. 이때 A에는 child 경로와 복귀 행동을
Work Item 또는 기록 블록에 명시한다.

```markdown
# logs/A.md

## Work Items

- [x] W1 Collect existing naming options.
- [>] W2 Complete `logs/B.md`, then resume the naming decision with B's result.
- [ ] W3 Apply the chosen naming rule to the owner document.

## 2026-06-16 · Split naming question

- W2는 naming decision을 계속하기 전에 별도 조사 B의 결론이 필요하다.
- Child log: `logs/B.md`
- B가 decided 되면 A의 W2를 완료하거나, B 결과에 따라 남은 행동으로 수정한다.
```

```markdown
# logs/B.md

---
topic: Naming evidence check
description: Checks which naming option is supported before A resumes the naming decision.
status: open
---

## Work Items

- [>] W1 Compare current owner documents and pick the supported naming option.

## 2026-06-16 · Start child investigation

Parent pointer: `logs/A.md` W2

- A의 W2를 진행하려면 이 조사가 먼저 필요해 별도 로그로 분리했다.
- 이 로그가 decided 되면 A의 W2를 결과에 맞게 완료하거나 다음 행동으로 갱신한다.
```

## Child B decided, then parent A consumes it

B가 결론을 냈고 A가 그 결과를 소비하면, B의 parent pointer는 수동으로 해소된다. A의 관련
Work Item도 완료, 취소, 이관 또는 남은 행동으로 갱신한다.

```markdown
# logs/B.md

---
topic: Naming evidence check
description: Checks which naming option is supported before A resumes the naming decision.
status: decided
---

## Work Items

- [x] W1 Compare current owner documents and pick the supported naming option.

## 2026-06-16 · Decision

- 결정: owner 문서의 기존 용례와 충돌하지 않는 `work log`를 사용한다.
- 반영 필요: parent `logs/A.md` W2가 이 결과를 소비해야 한다.
- `logs/A.md` W2에 결과를 반영했고, B에 남은 질문은 없다.
```

```markdown
# logs/A.md

## Work Items

- [x] W1 Collect existing naming options.
- [x] W2 Complete `logs/B.md`, then resume the naming decision with B's result.
- [>] W3 Apply the chosen naming rule to the owner document.

## 2026-06-16 · Consume B result

- `logs/B.md` 결정은 `work log` 명칭을 사용한다는 것이다.
- A의 W2는 child 결과를 확인하고 naming decision을 재개했으므로 완료했다.
- 다음 재개 지점은 W3이다.
```

## 현재 작업 중 새 로그를 만들 때 (decision table 사례)

아래는 `work-items-rules.md`의 일반 decision table을 A/B/C라는 구체 이름으로 보여주는
예시다. 핵심은 pointer chain 순서(A -> B -> C)나 새 로그를 어디서 만들었는지가 아니라 새
로그의 결과를 누가 소비하는지로 연결을 정한다는 것이다. 복귀 의무나 의존성은 Work Item
또는 기록 블록에 명시된 경우에만 해석한다.

```markdown
# Case 0: C is current log's child

# logs/B.md
## Work Items

- [>] W1 Complete `logs/C.md`, then resume B's decision.

## 2026-06-16 · Split C from B

- B의 W1을 결정하려면 C의 확인이 먼저 필요하다.
- C는 A가 아니라 B의 W1이 소비한다.

# logs/C.md
## 2026-06-16 · Start child check

Parent pointer: `logs/B.md` W1

- B의 W1을 진행하려면 이 확인이 필요해 C로 분리했다.
- C가 decided 되면 B의 W1이 결과를 소비한다.
```

```markdown
# Case 1: C is required before A can continue

# logs/A.md
## Work Items

- [>] W2 Complete `logs/B.md`, then resume release decision.

# logs/B.md
## 2026-06-16 · Result redirects dependency

Parent pointer: `logs/A.md` W2

- B 조사 결과, A의 release decision은 C의 compatibility result가 있어야 계속할 수 있다.
- Rewired child dependency: `logs/C.md`

# logs/A.md after consuming B
## Work Items

- [>] W2 Complete `logs/C.md`, then resume release decision.

## 2026-06-16 · Rewire child dependency

- B는 A의 질문에 직접 답하지 못했고, C의 compatibility result가 필요하다고 결론냈다.
- A의 소비 Work Item W2가 기존 child B 대신 C를 기다리도록 갱신했다. W2가 `[>]`였으므로
  next pointer도 C를 가리킨다.

# logs/C.md
## 2026-06-16 · Start compatibility check

Parent pointer: `logs/A.md` W2

- B가 A의 release decision이 C의 compatibility result에 의존한다고 결론냈다.
- Source context: `logs/B.md`.
- C가 decided 되면 A의 W2가 결과를 소비한다.
```

```markdown
# Case 2: C is not a continuation of A

# logs/B.md
## 2026-06-16 · Decision and separate follow-up

Parent pointer: `logs/A.md` W2

- A가 필요로 한 결정은 완료됐다.
- 별도 개선 주제 C가 생겼지만 A의 남은 작업은 C에 의존하지 않는다.
- Separate log: `logs/C.md`

# logs/A.md after consuming B
## Work Items

- [x] W2 Complete `logs/B.md`, then resume release decision.
- [>] W3 Apply B's decision to release notes.

## 2026-06-16 · Consume B without following C

- B의 결정은 A에 반영됐다.
- `logs/C.md`는 독립 follow-up이며 A의 next pointer가 아니다.
```

```markdown
# Case 3: 소비 Work Item이 모호하면 사용자에게 묻는다

# logs/B.md
## 2026-06-16 · Ambiguous consumer

Parent pointer: `logs/A.md` W2

- C가 필요하지만 C 결과를 A의 release decision이 소비할지 B의 후속 검증이 소비할지
  현재 기록만으로 정해지지 않는다.
- 연결을 추측하지 않고 후보(A W2 재배선 vs B의 child)와 근거를 사용자에게 제시한다.
```

## Investigation log with no Work Item entries

조사·토론 로그도 canonical한 `## Work Items` 섹션은 그대로 두되 actionable한 항목은 없을 수
있다. 이런 로그는 질문에 답이 났고, 남은 질문이 없고, known parent 반영이 끝나면 `decided`로
전환한다. "후보"로만 두지 않는다. 이 hard rule은 `log-writing-rules.md`가 소유한다.

```markdown
# logs/term-question.md

---
topic: Term choice discussion
description: Decides which term to use for user-facing log documentation.
status: open
---

## Work Items

## 2026-06-16 · Start discussion

- 질문: 사용자 문서에서 `next pointer`를 그대로 쓸지 한국어로 풀어 쓸지 결정한다.
- 판단 범위: example 문서의 표현만 다룬다.
- Parent pointer: `logs/A.md` W4
- 종료 판단 기준: 용어 하나를 결정하고 A의 W4에 반영할 수 있으면 끝난다.
```

```markdown
# logs/term-question.md after decision

---
topic: Term choice discussion
description: Decides which term to use for user-facing log documentation.
status: decided
---

## Work Items

## 2026-06-16 · Decision

- 결정: 사용자 예시에는 `next pointer`를 병기하고, 첫 설명에서 "재개 지점"이라고 푼다.
- parent `logs/A.md` W4에 이 결론을 반영했다.
- 남은 질문과 반영 작업은 없다.
```

## Superseded and unresolved Work Items

`superseded`는 새 로그가 기존 로그 전체의 수명을 대체할 때만 사용한다. 바꾸기 전에 기존
미완료 Work Items와 `[>]` next pointer가 모두 해소되어야 한다.

```markdown
# logs/old-example-cleanup.md before superseded

---
topic: Old example cleanup
description: Cleans up outdated log examples.
status: open
---

## Work Items

- [x] W1 Inventory outdated examples.
- [>] W2 Rewrite pointer examples.
- [ ] W3 Add superseded examples.
```

```markdown
# logs/old-example-cleanup.md after superseded

---
topic: Old example cleanup
description: Cleans up outdated log examples.
status: superseded
---

## Work Items

- [x] W1 Inventory outdated examples.
- [x] W2 Transferred: Rewrite pointer examples. → logs/new-example-guide.md — 새 로그의 W1이 이어받는다.
- [x] W3 Transferred: Add superseded examples. → logs/new-example-guide.md — 새 로그의 W2가 이어받는다.

## 2026-06-16 · Superseded by new example guide

- 대체 로그: `logs/new-example-guide.md`
- 대체 이유: 기존 로그의 범위가 새 example guide 작성 흐름으로 전체 대체됐다.
- W2는 `logs/new-example-guide.md` W1로 이관했다.
- W3는 `logs/new-example-guide.md` W2로 이관했다.
- 기존 `[>]` next pointer는 남기지 않았고, 이 로그에서는 더 이상 재개하지 않는다.
```

취소로 해소되는 경우도 가능하다.

```markdown
## Work Items

- [x] W1 Transferred: Rewrite pointer examples. → logs/new-example-guide.md — 새 로그가 이어받는다.
- [x] W2 Cancelled: Add temporary compatibility section. — 새 로그 구조에서 compatibility section이 필요 없어졌다.
```

## What not to do

아래 형태는 만들지 않는다.

```markdown
# frontmatter에 parent/child 구조 필드를 추가하지 않는다.
---
topic: Child work
description: Example of a bad structure.
status: open
parent: logs/A.md
children:
  - logs/C.md
---
```

```markdown
# B만 재개했는데 reverse search로 모든 open log를 찾아 자동 수정하지 않는다.
- Run global search for every log that mentions `logs/B.md`.
- Update all parents and sibling logs automatically.
```

```markdown
# A가 B를 가리킨다고 해서 B가 A를 자동으로 동기화하지 않는다.
# B에 parent pointer가 있거나 현재 known graph에 A가 들어온 경우에만 사람이 읽고 소비한다.
```

```markdown
# 순환 pointer를 만들지 않는다.

# logs/A.md
- [>] W1 Complete `logs/B.md`, then resume A.

# logs/B.md
- [>] W1 Complete `logs/A.md`, then resume B.
```
