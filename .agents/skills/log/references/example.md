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

## Record — 판단 구조를 보존하는 증류

결론만 남기면 다음 agent가 조건과 행동의 매핑을 다시 추론해야 하는 경우, 그 판단 관계를
보존한다. 예를 들어 다음 기록은 정책이 있다는 사실만 남기고 응답별 조건과 행동을 복원하지
못한다.

```markdown
- API 응답별 retry 정책을 결정했다.
```

판단에 필요한 매핑은 같은 판단을 재현할 수 있는 형태로 남긴다.

```markdown
| 응답 | 조건 | 행동 |
| --- | --- | --- |
| `401` | access token 만료 | token 갱신 후 한 번 재시도 |
| `429` | `Retry-After` 있음 | 해당 시간 뒤 재시도 |
| `5xx` | 멱등 요청 | backoff를 적용해 재시도 |
```

원래 표를 그대로 복사해야 한다는 뜻은 아니다. 같은 조건·판정축·행동 관계를 보존한다면 더 짧은
목록이나 decision tree로 바꿀 수 있다.

## Block extension — 같은 unit은 owning block에 entry로 누적

블록은 일회성 checkpoint가 아니라 같은 unit(topic, Work Item slice, 질문, 결정)의 dated entry를
누적하는 owning block이다. 첫 기록은 `##` body에 바로 쓰며 그 body가 그 블록의 첫 entry다. 같은
unit을 나중에 이어가거나 정정·결론 변경하면, 날짜가 바뀌었다는 이유만으로 새 `##` 블록을 만들지
않고 owning block 아래에 `### YYYY-MM-DD HH:MM · <entry>`로 append한다. 기존 entry는 고쳐 쓰지
않는다.

```markdown
## Work Items

- [x] W3 List error codes.
- [>] W2 Decide retry policy.
- [ ] W4 Document retry policy.

## 2026-06-16 · W2 · retry policy 조사

- 처음에는 5xx만 재시도 대상으로 검토했다. (첫 entry는 `##` body이고 `###`를 강제하지 않는다)

### 2026-06-18 09:30 · 결론 변경

- 429도 재시도 대상에 포함한다. 이전 5xx-only 판단을 대체한다.
- 이유: rate limit은 backoff 후 성공할 수 있다.

## 2026-06-17 · W3 · error code 목록 정리

- W3은 별도 unit이므로 W2 owning block에 넣지 않고 자체 블록을 연다.

## 2026-06-18 · retry 확정에 따른 W4 착수 조건

- W2가 429 포함으로 확정돼 W4(문서화) 착수 조건이 갖춰졌다.
- 여러 W에 걸친 cross-unit checkpoint라 특정 W-id로 키잉하지 않고 일회성 블록으로 둔다.
```

W2 owning block의 `최신 entry`는 `### 2026-06-18 09:30 · 결론 변경`이다. 블록은 open date 순이라 W2 owning block(06-16)이
이후 06-17·06-18 블록보다 앞에 있어도, `[>] W2`로 재개하는 세션은 heading의 W2로 owning block을
찾고 최신 entry에서 현재 결론(429 포함)을 복원한다. 5xx-only가 왜 바뀌었는지는 첫 entry와
`결론 변경` entry가 함께 보존한다. 반대로 별도 unit(W3)이나 여러 unit에 걸친 checkpoint는 owning
block에 누적하지 않고 새 `##` 블록으로 둔다.

## Required Context — 재개 기준을 표면으로

이 로그를 다룰 때 반드시 읽고 적용해야 할 기준이 특정 owning block에만 적혀 있으면, 다른 owning
block을 재개하는 세션은 그 블록을 읽지 않아 기준을 놓친다. `## Required Context`는 그 기준의 **적용 대상 범위**를
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

## 2026-06-15 · W3 · 공통 기준 결정

- W3에서 owner map과 관련 문서를 대조한 결과, W1·W3·W4는 같은 기준을 사용해야 문서 간
  판단이 어긋나지 않는다.
- 세 작업의 공통 기준을 `docs/X.md`로 결정했다.

## 2026-06-16 · W4 · Draft section B 착수

- W4를 시작했다. (이 블록만으로는 docs/X.md 공통 기준이 보이지 않는다)
```

W4를 재개하는 fresh 세션은 `## Work Items`, `{Global}`, W4가 든 `{W1,W3,W4}`, W4의 owning
block과 최신 entry를 읽는다. 그 block이 docs/X.md를 언급하지 않아도, W4가 포함된 set의 context에서 공통
기준을 적용한다. 그 기준이 생긴 이유까지 필요하면 `W3 · 공통 기준 결정` 블록에서 복원한다.
로그 블록은 결정의 경위와 근거를 보존하고, Required Context는 현재 적용할 기준과 scope를
유지한다.

## Reconcile — Record의 의미 변화를 Work state·Required Context에 반영

Work state나 Required Context의 dependency를 바꾸지 않는 기록은 History surface에만 둔다. 하지만
Record에 새 W와 그 W가 기존 기준을 따라야 하는 이유를 남겼다면 Reconcile은 Work Items와 Required
Context를 같은 동작에서 갱신한다. set literal은 신규 W 누락을 자동으로 해결하지 않는다.

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

## Override — scope 정밀화가 우선, label은 최후수단

특정 W의 예외는 먼저 scope 정밀화로 푼다. 정밀화로 안 되는 진짜 예외만 label 기반 `Override`를
쓴다.

```markdown
## Required Context

### {Global}

- [no-skill-edit] 실제 `.agents/skills/log/*` 파일은 사용자 지시 전 수정하지 않는다.

### {W3}

- Override [no-skill-edit]: 사용자 승인 범위에서 `loop-rules.md`를 수정한다.
```

## Work Item 추가와 Log Lifetime Boundary

새 행동은 먼저 W 추가 후보인지 판정한다. 이미 있는 W가 소유하거나 현재 답변에서 끝나면 W를
추가하지 않는다. 끝난 로그를 `open`으로 연장하려는 새 작업이면 현재 로그에 W를 추가하지 않고
Cross-Log로 보낸다. 그 밖에 지속할 행동은 현재 로그의 목적·완료 조건·재개 상태로 소유할 수
있는지 Log Lifetime Boundary를 적용한다.

| 상황 | 행동 |
| --- | --- |
| 기존 W가 소유하거나 현재 답변에서 끝남 | W를 추가하지 않고 끝낸다 |
| 끝난 로그를 `open`으로 연장하려는 새 작업 | 현재 로그에 W를 추가하지 않고 Cross-Log로 보낸다 |
| 현재 로그 수명 안에서 지속함 | 새 W를 추가하고 필요하면 `[>]`로 둔다 |
| 별도 목적·closeout·재개 상태가 필요함 | 현재 로그에 W를 추가하지 않고 Cross-Log에서 판정한다 |
| 수명 경계가 불명확함 | 이유와 후보를 제시하고 사용자에게 확인한다 |

아래 예시는 대화 중 사용자가 별도 입력 자료·리뷰·승인·patch처럼 나중에 재개해야 할 후속을
꺼낸 경우다. "다음 세션에서 ~하고 싶다" 같은 미뤄진 의도가 현재 로그 수명 안에서 재개·완료할
행동이라 W로 등록한 사례다.

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

## Cross-Log / Lifetime Transitions — ordered discriminator

별도 로그 후보가 생기면 이유·근거와 예상 전이 관계를 먼저 짧게 보고한다. 수명 경계나 결과 소비
관계가 불명확하거나, `superseded` 또는 history를 옮기는 migration detach이면 적용 전에 사용자
확인을 받는다. 종류는 다음 순서로 판정한다.

| 판정 | 결과 |
| --- | --- |
| 다른 로그가 현재 로그 전체를 대체함 | Superseded 절을 적용한다 |
| 신규·기존 다른 로그를 수반하지 않음 | Cross-Log를 끝내고 same-log Work Item 전이를 적용한다 |
| 다른 로그를 수반하지만 source W가 없음 | Independent Follow-Up을 적용한다 |
| source W가 있고 그 결과를 소비함 | Detach를 적용한다 |
| source W가 있지만 결과를 소비하지 않음 | Transfer를 적용한다 |

소비 관계가 불명확하면 다음처럼 적용 전에 멈춘다.

```markdown
## 2026-06-16 · Cross-Log 소비 관계 확인

- 이유·근거: compatibility 결과가 release decision과 후속 검증 양쪽에 영향을 줄 수 있다.
- 후보 관계: A W2가 소비하면 Detach, 현재 로그가 결과를 기다리지 않으면 Transfer다.
- 소비 owner가 현재 기록만으로 정해지지 않아 사용자 확인 전에는 전이를 적용하지 않는다.
```

Transfer는 source 표시만으로 끝내지 않고 target의 이어받을 재개 지점도 확인한다.

```markdown
# logs/A.md (source excerpt)

## Work Items

- [→] W3 Rewrite migration checklist. — transferred: logs/migration-checklist.md — 현재 로그는 결과를 소비하지 않는다.

# logs/migration-checklist.md (target excerpt)

## Work Items

- [>] W1 Rewrite the migration checklist transferred from `logs/A.md` W3.
```

Independent Follow-Up은 source W와 복귀 pointer 없이 별도 `open` 로그로 시작한다.

```markdown
# logs/release-notes-cleanup.md (excerpt)

---
topic: Release notes cleanup
description: Cleans up release-note structure independently from the source discussion.
status: open
---

## Work Items

- [>] W1 Review and simplify the release-note structure.

## Required Context
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

W3은 W2가 B의 결과를 소비해 naming decision을 닫은 뒤에야 actionable하므로, source A에는
`[>]`를 남기지 않는다.

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
- Consume when: B가 naming option의 근거를 확정하면 A W2가 결과를 소비해 naming decision을 닫는다.
- Context snapshot: owner map을 기준으로 현재 owner 문서들이 지지하는 naming option만 비교한다.

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
- Consume when: 보존한 slice #1-#9의 최종 결과를 A W2가 확인하면 architecture retrofit 소비를 닫는다.
- Context snapshot: architecture retrofit slice #1-#9의 유효한 결론과 검증 결과를 보존한다.

## Work Items

- [x] W1 Preserve migrated architecture slice #1-#9 and record final result.

## Required Context

### {Global}

- 이 로그는 A에서 옮겨 온 architecture retrofit 상세 history를 소유한다.

## 2026-06-16 · Migrated detail and final result

- A에서 architecture retrofit slice #1-#9 상세 기록을 옮겨 왔다.
- provenance: 2026-06-16에 `logs/A.md`에서 migration ledger를 남기고 이동했다.
- 최종 결과: owner 문서 반영과 검증이 완료됐다.
- 복귀 대상 `logs/A.md` W2가 이 결과를 소비해야 한다.
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
