# 작업 로그 예시

이 문서는 사용자 검토용 예시다. 필수 agent read path가 아니며, 실제 규칙은
`loop-rules.md`가 소유한다.

## Work Items marker

`[>]`는 local actionable Work Item이 있을 때 이 로그에서 먼저 재개할 지점(로그당 하나)이다. `[ ]`는 남은 작업, `[x]`는 성공 완료다.
취소·이관·detach는 의미가 다르므로 `[x]`로 묶지 않고 각각 `[-]`, `[→]`, `[↓]`로 구분하며, 해소
사유·target·분리 작업 로그 경로는 줄 끝에 남긴다.

```markdown
## Work Items

- [>] W1 Inspect current log references.
- [ ] W2 Patch user-facing examples.
- [x] W3 Run markdown review.
- [-] W4 Add a compatibility note. — cancelled: 새 구조에서 더 이상 필요하지 않다.
- [→] W5 Write migration checklist. — transferred: logs/log-migration.md — 별도 로그가 소유하고 이 로그는 결과를 기다리지 않는다.
- [↓] W6 Specs assimilation. — detached: logs/specs-assimilation.md
```

## Required Context — 재개 기준을 표면으로

이 로그를 다룰 때 반드시 읽고 적용해야 할 기준이 특정 날짜 블록에만 적혀 있으면, 다음 세션은
최신 블록만 보고 그 기준을 놓친다. `## Required Context`는 그 기준의 **적용 대상 범위**를
선언해 재개 시 읽기 계약으로 복원되게 한다. Work Item이 없는 판단·조사·토론형 로그도 standing
context가 있으면 `{Global}`에 둔다.

W3 토론에서 "W1·W3·W4는 모두 기준 문서 `docs/X.md`를 따른다"가 정해진 경우:

```markdown
## Work Items

- [x] W1 Draft section A.
- [x] W3 Decide shared baseline.
- [>] W4 Draft section B.

## Required Context

### {Global}

- owner map(`docs/documentation-system.md`)을 먼저 확인한다.

### {W1,W3,W4}

- 세 작업은 모두 기준 문서 `docs/X.md`를 공통 기준으로 본다.

## 2026-06-15 · 공통 기준 결정

- W3에서 owner map과 관련 문서를 대조한 결과, W1·W3·W4는 같은 기준을 사용해야 문서 간
  판단이 어긋나지 않는다.
- 세 작업의 공통 기준을 `docs/X.md`로 결정했다.

## 2026-06-16 · Draft section B 착수

- W4를 시작했다. (이 블록만으로는 docs/X.md 공통 기준이 보이지 않는다)
```

W4를 재개하는 fresh 세션의 읽기 계약은 `## Work Items` + `{Global}` + W4가 든 `{W1,W3,W4}` +
최신 블록이다. 최신 블록이 docs/X.md를 언급하지 않아도, W4가 포함된 set의 context에서 공통
기준을 적용한다. 그 기준이 생긴 이유까지 필요하면 `공통 기준 결정` 블록에서 복원한다.
날짜 블록은 결정의 경위와 근거를 보존하고, Required Context는 현재 적용할 기준과 scope를
유지한다.

### Reconcile — Record의 의미 변화를 Current surface에 반영

순수 narrative 블록은 표면을 건드리지 않는다. 하지만 Record에 새 W와 그 W가 기존 기준을 따라야
하는 이유를 남겼다면 Reconcile은 Work Items와 Required Context를 같은 동작에서 갱신한다. set
literal은 신규 W 누락을 자동으로 해결하지 않는다.

```markdown
## Work Items

- [x] W1 Draft section A.
- [x] W3 Decide shared baseline.
- [x] W4 Draft section B.
- [>] W5 Draft section C.

## Required Context

### {Global}

- owner map(`docs/documentation-system.md`)을 먼저 확인한다.

### {W1,W3,W4,W5}

- 네 작업은 모두 기준 문서 `docs/X.md`를 공통 기준으로 본다.

## 2026-06-17 · W5 추가와 context 정합

- section C도 같은 기준을 따르므로 W5를 추가하며 set을 `{W1,W3,W4}`에서 `{W1,W3,W4,W5}`로 넓혔다.
```

### Override — scope 정밀화가 우선, label은 최후수단

특정 W의 예외는 먼저 scope 정밀화로 푼다. 정밀화로 안 되는 진짜 예외만 label 기반 `Override`를
쓴다.

```markdown
## Required Context

### {Global}

- [no-skill-edit] 실제 `.agents/skills/log/*` 파일은 사용자 지시 전 수정하지 않는다.

### {W3}

- Override [no-skill-edit]: 사용자 승인 범위에서 `loop-rules.md`를 수정한다.
```

## Deferred follow-up surfaces in conversation

대화 중 사용자가 별도 입력 자료·리뷰·승인·patch처럼 지금 답변으로 끝나지 않고 나중에 재개되어야
하는 후속을 꺼내면, 단순 발언으로 넘기지 말고 Work Item 후보인지 점검한다. "다음 세션에서
~하고 싶다" 같은 미뤄진 의도도 재개·완료 판단이 필요하면 등록한다.

```markdown
## Work Items

- [>] W1 Compare current references against the user's structure model.
- [ ] W2 사용자가 제공할 시나리오·이미지·텍스트로 `maintenance.md`를 리뷰하고 개선 방향을
      보고한 뒤 승인 시 반영한다.

## 2026-06-16 · Register the deferred review

- 사용자: "다음 세션에서 내가 만든 시나리오·이미지·텍스트로 `maintenance.md`를 비교 리뷰하고 싶다."
- 별도 입력을 기다렸다 재개되는 독립 흐름이라 W2로 등록했다. 현재 재개 지점은 W1이라 `[>]`는
  옮기지 않았다.
```

반대로 현재 답변 안에서 끝나는 발언은 등록하지 않는다.

```markdown
## 2026-06-16 · No Work Item needed

- 사용자: "방금 그 marker 규칙을 예를 들어 설명해줘."
- 이해용 예시 요청은 이 답변에서 끝나고 재개할 독립 행동이 없으므로 Work Item을 추가하지 않는다.
```

## Cross-log / lifetime transition — source W와 소비 여부로 판정

다른 로그·owner와 연결될 때는 먼저 source Work Item이 있는지, 그 source가 결과를 소비하는지로
나눈다. 아래 예시는 같은 "새 로그"라도 결과가 달라지는 대표 사례다.

```markdown
# detach: source W가 있고, source가 child 결과를 소비한다.

## Work Items

- [↓] W2 Resume release decision. — detached: logs/release-compatibility.md

## 2026-06-16 · Split compatibility check

- W2의 완료 판정은 compatibility 조사 결과를 소비해야 하므로 분리 작업 로그로 나눴다.
```

```markdown
# transfer: source W가 있지만, source는 결과를 기다리지 않고 target이 소유한다.

## Work Items

- [→] W3 Rewrite migration checklist. — transferred: logs/migration-checklist.md — migration checklist는 별도 로그가 소유하고 이 로그의 closeout은 그 결과에 의존하지 않는다.

## 2026-06-16 · Transfer migration checklist

- W3는 현재 로그의 결정 소비 항목이 아니라 별도 maintenance 작업이므로 target 로그로 이관했다.
```

```markdown
# independent follow-up: 넘길 source W가 없다.

## 2026-06-16 · Separate follow-up

- 논의 중 별도 개선 주제 `logs/release-notes-cleanup.md`가 생겼다.
- 현재 로그의 어떤 Work Item도 그 결과를 기다리지 않으므로 복귀 pointer 없는 독립 follow-up이다.
```

## Detach — 분리 작업 로그를 만들 때 (`[↓]`)

A의 W2가 별도 로그 B의 결과를 기다리게 분리하면, A의 W2는 `[↓]`로 두고 분리 작업 로그 경로를
남긴다. B는 자체 `## Required Context`, `## 복귀 대상`, snapshot 한 줄을 둬서 A를 매번
해석하지 않아도 재개 가능하게 한다.

```markdown
# logs/A.md

## Work Items

- [x] W1 Collect existing naming options.
- [↓] W2 Resume the naming decision with B's result. — detached: logs/B.md
- [ ] W3 Apply the chosen naming rule to the owner document.

## 2026-06-16 · Split naming question

- W2를 결정하려면 별도 조사 B의 결론이 먼저 필요해 분리 작업 로그로 나눴다.
- B가 decided 되면 W2를 완료하거나 B 결과에 따라 남은 행동으로 수정한다.
```

```markdown
# logs/B.md

---

topic: Naming evidence check
description: Checks which naming option is supported before A resumes the naming decision.
status: open

---

## 복귀 대상

- Log: `logs/A.md`
- Work Item: W2
- Context snapshot: source `{Global}` on 2026-06-16.

## Work Items

- [>] W1 Compare current owner documents and pick the supported naming option.

## Required Context

### {Global}

- owner map을 먼저 확인한다.

## 2026-06-16 · Start separated investigation

- A의 W2를 진행하려면 이 조사가 먼저 필요해 별도 로그로 분리했다.
- snapshot은 effective result로 평탄화해 가져왔다. source의 Override는 옮기지 않는다.
```

## 분리 작업 로그 decided, 복귀 대상이 소비

B가 결론을 내면 A는 복귀 pointer를 소비한다 — A의 `[↓]` W2를 완료·취소·이관 또는 남은 행동으로
갱신한다.

```markdown
# logs/A.md

## Work Items

- [x] W1 Collect existing naming options.
- [x] W2 Resume the naming decision with B's result. — detached: logs/B.md
- [>] W3 Apply the chosen naming rule to the owner document.

## 2026-06-16 · Consume B result

- `logs/B.md` 결정은 `work log` 명칭을 사용한다는 것이다.
- W2는 분리 작업 로그 결과를 확인하고 naming decision을 재개했으므로 완료했다. 다음 재개 지점은 W3이다.
```

## Migration detach — 이미 쌓인 상세 기록을 옮기는 예외

아래는 `loop-rules.md`의 Migration detach 조건을 충족해 상세 history를 옮긴 뒤 source에
migration ledger를 남기고 target이 provenance와 결과를 보존한 형태다.

```markdown
# logs/A.md (migration 후)

## Work Items

- [x] W1 Inventory owner documents.
- [↓] W2 Consume architecture retrofit result. — detached: logs/B.md
- [>] W3 Continue source-map closeout.

## 2026-06-16 · Migrate architecture retrofit detail to B

- A에 축적된 architecture retrofit slice #1-#9 상세 기록을 `logs/B.md`로 옮겼다.
- A는 W2의 복귀 pointer, 소비 조건, stage-level next pointer만 소유한다.
- `logs/B.md`가 decided 되면 A의 W2가 결과를 소비한다.
- 조용한 삭제가 아니라 이 migration ledger로 이동 범위와 target을 남겼다.
```

```markdown
# logs/B.md

---

topic: Architecture retrofit detail
description: Owns the migrated architecture retrofit history split from A.
status: decided

---

## 복귀 대상

- Log: `logs/A.md`
- Work Item: W2
- Context snapshot: migrated from A on 2026-06-16.

## Work Items

- [x] W1 Preserve migrated architecture slice #1-#9 and record final result.

## Required Context

### {Global}

- 이 로그는 A에서 옮겨 온 architecture retrofit 상세 history를 소유한다.

## 2026-06-16 · Migrated detail and final result

- A에서 architecture retrofit slice #1-#9 상세 기록을 옮겨 왔다.
- 최종 결과: owner 문서 반영과 검증이 완료됐다.
- 복귀 대상 `logs/A.md` W2가 이 결과를 소비해야 한다.
```

## 현재 작업 중 새 로그를 만들 때 (decision table 사례)

새 로그 연결은 pointer chain 순서나 어디서 만들었는지가 아니라 source Work Item 존재 여부와
그 source가 결과를 소비하는지로 정한다.

```markdown
# Case 1: 새 로그의 결과를 known 복귀 대상 A가 소비 → 복귀 대상을 재배선

# logs/A.md (재배선 후)

## Work Items

- [↓] W2 Resume release decision. — detached: logs/C.md

## 2026-06-16 · Rewire return target

- B는 A의 질문에 직접 답하지 못했고 C의 compatibility result가 필요하다고 결론냈다.
- A의 소비 Work Item W2가 기존 분리 작업 로그 B 대신 C를 기다리도록 갱신했다. W2가 local `[>]`였다면
  `[↓]`로 바꾸고, A에 다른 local action이 없으면 C의 `[>]`를 따른다. 토론 전체는 복사하지 않고
  판단 이유만 남긴다.
```

```markdown
# Case 2: source Work Item이 없거나 어떤 Work Item도 안 기다림 → 독립 follow-up

# logs/A.md (B 소비 후)

## Work Items

- [x] W2 Resume release decision. — detached: logs/B.md
- [>] W3 Apply B's decision to release notes.

## 2026-06-16 · Consume B without following C

- B의 결정은 A에 반영됐다.
- `logs/C.md`는 별도 개선 주제이고 A의 남은 작업은 C에 의존하지 않는다. C를 기다리는 source
  Work Item이 없으므로 독립 follow-up이며 A의 next pointer가 아니다.
```

```markdown
# Case 3: 소비 Work Item이 모호하면 사용자에게 묻는다

## 2026-06-16 · Ambiguous consumer

- C 결과를 A의 release decision이 소비할지 B의 후속 검증이 소비할지 현재 기록만으로 정해지지
  않는다. 연결을 추측하지 않고 후보(A W2 재배선 vs B의 분리 작업 로그)와 근거를 사용자에게
  제시한다.
```

## Work Item entries가 없는 판단·조사·토론형 로그

판단·조사·토론형 로그도 canonical `## Work Items` 섹션은 그대로 두되 actionable 항목은 없을 수
있다. 질문에 답이 났고, 남은 질문이 없고, known 복귀 대상 반영이 끝나면 `decided`로 전환한다.
"후보"로만 두지 않는다. 이 규칙은 `loop-rules.md`가 소유한다.

```markdown
# logs/term-question.md (진행 중)

---

topic: Term choice discussion
description: Decides which term to use for user-facing log documentation.
status: open

---

## Work Items

## Required Context

### {Global}

- 이 토론은 사용자-facing 예시 문서의 용어만 다루고, 실제 skill command 이름은 바꾸지 않는다.

## 2026-06-16 · Start discussion

- 질문: 사용자 문서에서 `next pointer`를 그대로 쓸지 한국어로 풀어 쓸지 결정한다.
```

```markdown
# logs/term-question.md (결정 후)

---

topic: Term choice discussion
description: Decides which term to use for user-facing log documentation.
status: decided

---

## Work Items

## Required Context

### {Global}

- 이 토론은 사용자-facing 예시 문서의 용어만 다루고, 실제 skill command 이름은 바꾸지 않는다.

## 2026-06-16 · Decision

- 결정: 사용자 예시에는 `next pointer`를 병기하고 첫 설명에서 "재개 지점"이라고 푼다.
- 복귀 대상 `logs/A.md` W4에 이 결론을 반영했다. 남은 질문과 반영 작업은 없다.
```

## Superseded and unresolved Work Items

`superseded`는 새 로그가 기존 로그 전체의 수명을 대체하고 이 로그에서 더 재개하지 않을 때만
쓴다. 바꾸기 전에 기존 미완료 Work Items, unresolved `[↓]`, `[>]` next pointer를 모두 해소한다.

```markdown
# logs/old-example-cleanup.md (superseded 후)

---

topic: Old example cleanup
description: Cleans up outdated log examples.
status: superseded

---

## Work Items

- [x] W1 Inventory outdated examples.
- [→] W2 Rewrite pointer examples. — transferred: logs/new-example-guide.md — 새 로그의 W1이 이어받는다.
- [-] W3 Add a temporary compatibility section. — cancelled: 새 로그 구조에서 필요 없어졌다.

## 2026-06-16 · Superseded by new example guide

- 대체 로그: `logs/new-example-guide.md`
- 대체 이유: 기존 범위가 새 example guide 작성 흐름으로 전체 대체됐다.
- W2는 새 로그 W1로 이관, W3은 취소했다. 기존 `[>]`는 남기지 않았고 더 이상 재개하지 않는다.
```

## What not to do

```markdown
# frontmatter에 복귀 pointer 구조 필드를 추가하지 않는다.

---

topic: Separated work
status: open
return_to: logs/A.md
separated_logs:

- logs/C.md

---
```

```markdown
# Required Context scope를 잘못 쓴 형태

### {Global, W3} # {Global}은 단독 heading. W set과 섞지 않는다.

### {W2-W4} # range shorthand 금지. {W2,W3,W4}로 명시 나열한다.

### {W3}

- Required-read: docs/X.md
```

```markdown
# B만 재개했는데 reverse search로 모든 open log를 찾아 자동 수정하지 않는다.

# A가 B를 가리킨다고 해서 B가 A를 자동 동기화하지 않는다.

# B에 복귀 pointer가 있거나 현재 알려진 범위에 A가 들어온 경우에만 사람이 읽고 소비한다.
```

```markdown
# 중첩 분리에서 root 로그로 직접 복귀시키지 않는다.

# logs/A.md

- [↓] W2 Resume release decision. — detached: logs/B.md

# logs/B.md

## Work Items

- [↓] W3 Compatibility check. — detached: logs/C.md

# logs/C.md

## 복귀 대상

- Log: `logs/B.md`
- Work Item: W3
```

```markdown
# 순환 pointer를 만들지 않는다.

# logs/A.md

- [↓] W1 Resume A. — detached: logs/B.md

# logs/B.md

- [↓] W1 Resume B. — detached: logs/A.md
```
