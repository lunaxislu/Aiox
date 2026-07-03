# 작업 로그 예시

이 문서는 agent가 빠르게 찾아보는 case index와 worked examples다. CLI 매뉴얼이 아니며, 실제
규칙은 `loop-rules.md`가 소유한다. 각 예시는 **상황 → 명령 → 결과 markdown 핵심 → 주의점**
순서로 읽는다.

## Case Index

| case | 볼 곳 |
| --- | --- |
| 새 로그 만들기 | [log new](#log-new) |
| block 추가 | [block add](#block-add) |
| 기존 block에 entry 추가 | [entry add --after-line](#entry-add---after-line) |
| Work Item 추가 | [item add](#item-add) |
| Work Item 상태 변경 | [item set active/open/completed/cancelled/transferred](#item-set-activeopencompletedcancelledtransferred) |
| 별도 로그로 분리 | [detach](#detach) |
| `[↓]` child 결과 소비 | [[↓] child 결과 소비 후 source item completed](#-child-결과-소비-후-source-item-completed) |
| Required Context 추가·수정·삭제 | [context add/set/delete](#context-addsetdelete) |
| frontmatter 수정 | [meta set topic/description/status](#meta-set-topicdescriptionstatus) |
| 검색·점검 | [check/search](#checksearch) |
| 긴 로그 hint | [long-log hint와 $LOG_DIR/.log-hints](#long-log-hint와-log_dirlog-hints) |
| 판단 구조 보존 | [Worked Patterns](#worked-patterns) |

## 공통 읽는 법

`[>]`는 local actionable Work Item이 있을 때 이 로그에서 먼저 재개할 지점이며 로그당 하나만 둔다.
`[ ]`는 open, `[x]`는 성공 completed다. 취소·이관·분리는 성공 완료가 아니므로 각각 `[-]`, `[→]`,
`[↓]`로 구분하고 줄 끝에 사유나 target을 남긴다.

```markdown
## Work Items

- [>] W1 Inspect current log references.
- [ ] W2 Patch user-facing examples.
- [x] W3 Run markdown review.
- [-] W4 Add temporary scope note. — cancelled: 새 구조에서 더 이상 필요하지 않다.
- [→] W5 Write migration checklist. — transferred: logs/log-migration.md — 별도 로그가 소유하고 이 로그는 결과를 기다리지 않는다.
- [↓] W6 Specs assimilation. — detached: logs/specs-assimilation.md — reason: source W6 consumes the separated result
```

도구는 형식과 원자적 변경을 돕는다. 완료·취소·이관·분리·종료 같은 의미 판단은 agent가 본문
맥락과 사용자 의도를 근거로 먼저 해야 한다.

## log new

**상황**: 새 주제의 open 로그가 필요하고, 첫 block 골격과 재개할 Work Item을 함께 만든다.

**명령**:

```sh
.agents/skills/log/scripts/log new "retry-policy" \
  --description "Decide API retry behavior." \
  --block "W1 · retry policy 조사" \
  --context Global "owner map(docs/documentation-system.md)을 먼저 확인한다." \
  --item active "Compare API responses and retry actions."
```

**결과 markdown 핵심**:

```markdown
---
topic: retry-policy
description: Decide API retry behavior.
status: open
---

## Work Items

- [>] W1 Compare API responses and retry actions.

## Required Context

### Return Target

- None: independent log.

### {Global}

- owner map(docs/documentation-system.md)을 먼저 확인한다.

## 2026-07-03 · W1 · retry policy 조사
```

**주의점**: `log new`는 첫 block heading과 기본 surface를 만든다. 첫 block body가 필요하면 이어서
`entry add`나 수동 편집으로 기록한다. 새 로그 이름과 위치는 프로젝트 workflow가 정한 로그 저장
위치를 따르며, 실제 파일명은 보통 날짜 prefix가 붙은 도구 출력 경로를 그대로 쓴다. `ReturnTarget`은
`log new`와 `log detach` 생성 표면에서만 만든다.

## block add

**상황**: 기존 block 아래에 넣으면 오해할 정도로 unit, 질문, 목적, 수명이 바뀌어 새 owning block이
필요하다.

**명령**:

```sh
.agents/skills/log/scripts/log block add logs/retry-policy.md "W2 · error code 목록 정리" <<'EOF'
- API 문서에서 retry 판단에 필요한 error code를 추렸다.
- W1의 retry 정책 판단과 연결되지만, code 목록 자체는 별도 unit이다.
EOF
```

**결과 markdown 핵심**:

```markdown
## 2026-07-03 · W2 · error code 목록 정리

- API 문서에서 retry 판단에 필요한 error code를 추렸다.
- W1의 retry 정책 판단과 연결되지만, code 목록 자체는 별도 unit이다.
```

**주의점**: 날짜가 바뀌었다는 이유만으로 새 block을 만들지 않는다. 같은 unit의 후속 판단이나 정정은
기존 owning block에 entry로 누적한다.

## entry add --after-line

**상황**: 같은 unit을 이어가거나 기존 판단을 정정한다. 과거 entry는 고치지 않고 새 entry를 붙인다.

**명령**:

```sh
.agents/skills/log/scripts/log entry add logs/retry-policy.md \
  --after-line 24 "결론 변경" <<'EOF'
- 429도 재시도 대상에 포함한다. 이전 5xx-only 판단을 대체한다.
- 이유: rate limit은 backoff 후 성공할 수 있다.
EOF
```

**결과 markdown 핵심**:

```markdown
## 2026-06-16 · W1 · retry policy 조사

- 처음에는 5xx만 재시도 대상으로 검토했다.

### 2026-07-03 14:20 · 결론 변경

- 429도 재시도 대상에 포함한다. 이전 5xx-only 판단을 대체한다.
- 이유: rate limit은 backoff 후 성공할 수 있다.
```

**주의점**: `--after-line`은 entry를 붙일 날짜 unit block heading 라인을 가리켜야 한다. entry는
그 block 끝, 즉 다음 `##` heading 직전에 붙는다. W-id로 자동 검색하지 않으므로, 먼저 대상 block과
heading line을 확인한다.

## item add

**상황**: 현재 로그 수명 안에서 나중에 재개할 독립 행동이 생겼다.

**명령**:

```sh
.agents/skills/log/scripts/log item add logs/retry-policy.md open \
  "Document retry policy in docs/api.md."
```

**결과 markdown 핵심**:

```markdown
## Work Items

- [>] W1 Compare API responses and retry actions.
- [ ] W2 Document retry policy in docs/api.md.
```

**주의점**: 기존 W가 소유하거나 현재 답변에서 끝나는 요청은 Work Item으로 등록하지 않는다. 끝난 로그를
다시 open으로 늘리는 새 작업이면 current log에 억지로 추가하지 않고 cross-log 판정을 한다.

## item set active/open/completed/cancelled/transferred

**상황**: Work Item의 재개 상태나 수명이 바뀌었다.

**명령**:

```sh
.agents/skills/log/scripts/log item set logs/retry-policy.md --id W2 --status active
.agents/skills/log/scripts/log item set logs/retry-policy.md --id W1 --status open
.agents/skills/log/scripts/log item set logs/retry-policy.md --id W1 --status completed
.agents/skills/log/scripts/log item set logs/retry-policy.md --id W3 --status cancelled \
  --reason "scope에서 제외됐다."
.agents/skills/log/scripts/log item set logs/retry-policy.md --id W4 --status transferred \
  --target "logs/release-checklist.md" \
  --reason "release checklist가 소유하고 source는 결과를 기다리지 않는다."
```

**결과 markdown 핵심**:

```markdown
## Work Items

- [x] W1 Compare API responses and retry actions.
- [>] W2 Document retry policy in docs/api.md.
- [-] W3 Add temporary release note. — cancelled: scope에서 제외됐다.
- [→] W4 Write release checklist. — transferred: logs/release-checklist.md — release checklist가 소유하고 source는 결과를 기다리지 않는다.
```

**주의점**: `[>]`는 하나만 남아야 한다. `cancelled`에는 `--reason`, `transferred`에는 `--target`과
`--reason`이 필요하다. `detached`는 `item set`으로 만들지 않고 `log detach`를 사용한다.

## detach

**상황**: source W가 별도 child 로그의 결과를 소비해야 한다. source는 `[↓]`로 바뀌고 child에는
`Return Target`이 생긴다.

**명령**:

```sh
.agents/skills/log/scripts/log detach logs/A.md \
  --id W2 \
  --target logs/B.md \
  --reason "source W2 completion depends on B evidence" \
  --topic "B evidence check" \
  --description "Check evidence before A consumes the result." \
  --block "W1 · evidence check" \
  --context ReturnTarget "A W2 consumes B result" "A W2 before detach" \
  --item active "Check evidence and report result for A W2." <<'EOF'
- A에서 분리된 evidence check를 시작한다.
- 완료 후 A W2가 결과를 소비해야 한다.
EOF
```

**결과 markdown 핵심**:

```markdown
<!-- logs/A.md -->
## Work Items

- [↓] W2 Resume decision after B evidence. — detached: logs/B.md — reason: source W2 completion depends on B evidence
```

```markdown
<!-- logs/B.md -->
## Work Items

- [>] W1 Check evidence and report result for A W2.

## Required Context

### Return Target

- Log: `logs/A.md`
- Work Item: W2
- Consume when: A W2 consumes B result
- Context snapshot: A W2 before detach

## 2026-07-03 · W1 · evidence check

- A에서 분리된 evidence check를 시작한다.
- 완료 후 A W2가 결과를 소비해야 한다.
```

**주의점**: source가 child 결과를 기다리지 않으면 detach가 아니라 transfer다. 소비 관계가 불명확하면
적용 전에 멈추고 사용자에게 확인한다.

## [↓] child 결과 소비 후 source item completed

**상황**: child 로그가 결과를 냈고, source W가 그 결과를 본문에 소비했다. source의 `[↓]`를 `[x]`로
닫는다.

**명령**:

```sh
.agents/skills/log/scripts/log entry add logs/A.md \
  --after-line 31 "Consume B result" <<'EOF'
- B 결과: retry policy에는 429와 idempotent 5xx만 포함한다.
- A W2의 결정에 이 결과를 반영했고 남은 source 행동은 없다.
EOF

.agents/skills/log/scripts/log item set logs/A.md --id W2 --status completed
```

**결과 markdown 핵심**:

```markdown
## Work Items

- [x] W2 Resume decision after B evidence. — detached: logs/B.md — reason: source W2 completion depends on B evidence

## 2026-07-03 · W2 · retry decision

### 2026-07-03 15:10 · Consume B result

- B 결과: retry policy에는 429와 idempotent 5xx만 포함한다.
- A W2의 결정에 이 결과를 반영했고 남은 source 행동은 없다.
```

**주의점**: `[↓]`는 child가 끝났다는 이유만으로 자동 완료하지 않는다. source 로그에 결과 소비 기록이
있고 source W의 남은 행동이 없어야 completed로 바꾼다. detached target과 reason tail은 보존한다.

## context add/set/delete

**상황**: 재개 시 반드시 적용해야 하는 기준을 `Required Context` 표면에 올리거나 고친다.

**명령**:

```sh
.agents/skills/log/scripts/log context add logs/retry-policy.md Global \
  "owner map(docs/documentation-system.md)을 먼저 확인한다."

.agents/skills/log/scripts/log context add logs/retry-policy.md W1,W3,W4 \
  "세 작업은 모두 기준 문서 docs/X.md를 공통 기준으로 본다."

.agents/skills/log/scripts/log context set logs/retry-policy.md \
  --scope W1,W3,W4 --index 1 \
  "W1, W3, W4는 docs/X.md와 docs/Y.md를 함께 기준으로 본다."

.agents/skills/log/scripts/log context delete logs/retry-policy.md \
  --scope Global --index 1
```

**결과 markdown 핵심**:

```markdown
## Required Context

### {W1,W3,W4}

- W1, W3, W4는 docs/X.md와 docs/Y.md를 함께 기준으로 본다.
```

**주의점**: block 안의 결정 경위와 `Required Context`의 현재 적용 기준은 역할이 다르다. 새 W가 같은
기준을 따라야 하면 set literal도 함께 넓혀야 한다.

## meta set topic/description/status

**상황**: frontmatter의 topic, description, status를 조정한다.

**명령**:

```sh
.agents/skills/log/scripts/log meta set logs/retry-policy.md --topic "api-retry-policy"
.agents/skills/log/scripts/log meta set logs/retry-policy.md --description "Decide retry behavior for API errors."
.agents/skills/log/scripts/log meta set logs/retry-policy.md --status decided
```

**결과 markdown 핵심**:

```markdown
---
topic: api-retry-policy
description: Decide retry behavior for API errors.
status: decided
---
```

**주의점**: `status`는 `open`, `decided`, `superseded`만 쓴다. unresolved `[ ]`, `[>]`, `[↓]`가 있으면
닫기 전에 먼저 closeout 점검을 한다.

## check/search

**상황**: 로그 구조를 점검하거나 관련 로그를 찾는다.

**명령**:

```sh
.agents/skills/log/scripts/log check logs/retry-policy.md
.agents/skills/log/scripts/log check --status open
.agents/skills/log/scripts/log search retry --status open
```

**결과 markdown 핵심**:

```text
work_items: active=1 open=2 closed=0 detached=0 incomplete=3
next: line 13 · W1 Compare API responses and retry actions.
```

완료 후보가 된 로그에서는 closeout hint가 따로 나온다.

```text
work_items: active=0 open=0 closed=3 detached=0 incomplete=0
next: none
HINT closeout: 미완료 Work Items/next pointer가 없습니다. decided 후보인지 확인하세요
```

```text
logs/2026-07-03-retry-policy.md  [open]  api-retry-policy — Decide retry behavior for API errors.
```

**주의점**: 도구 출력은 구조·형식·검색 확인용이다. 도구가 보여준 hint만으로 완료, 취소, 이관, 분리,
종료 의미를 확정하지 않는다.

## long-log hint와 $LOG_DIR/.log-hints

**상황**: append 계열 동작 뒤 로그가 길어져 split 검토가 필요하다.

**명령**:

```sh
LOG_SOFT_LINES=600 LOG_HARD_LINES=1000 \
  .agents/skills/log/scripts/log block add logs/retry-policy.md "W5 · follow-up" <<'EOF'
- 긴 로그 split 필요성을 검토한다.
EOF
```

**결과 markdown 핵심**:

```text
HINT long-log: 620 lines >= soft threshold 600. 분리 필요성을 검토하세요: logs/retry-policy.md
```

또는:

```text
WARN long-log: 1004 lines >= hard threshold 1000. 분리하거나 단일 수명 유지 이유를 기록하세요: logs/retry-policy.md
```

**주의점**: hint 중복 출력 상태는 기본적으로 `$LOG_DIR/.log-hints`에 저장된다. 이 디렉터리는 사람이
읽는 로그 본문이 아니라 도구의 hint state다. hard threshold를 넘겼다고 항상 detach하는 것은 아니며,
같은 로그 수명을 유지할 이유가 있으면 그 판단을 기록한다.

## Worked Patterns

### 판단 구조를 보존하는 증류

**상황**: 결론만 남기면 다음 agent가 조건과 행동의 매핑을 다시 추론해야 한다.

**명령**:

```sh
.agents/skills/log/scripts/log entry add logs/retry-policy.md \
  --after-line 24 "retry response matrix" <<'EOF'
| 응답 | 조건 | 행동 |
| --- | --- | --- |
| `401` | access token 만료 | token 갱신 후 한 번 재시도 |
| `429` | `Retry-After` 있음 | 해당 시간 뒤 재시도 |
| `5xx` | 멱등 요청 | backoff를 적용해 재시도 |
EOF
```

**결과 markdown 핵심**: 판단 축인 response, condition, action이 함께 남는다.

**주의점**: 원래 표를 그대로 복사해야 한다는 뜻은 아니다. 같은 조건·판정축·행동 관계가 복원되면 짧은
목록이나 decision tree도 가능하다.

### same-unit entry와 cross-unit block 구분

**상황**: W2 결론 변경, W3 별도 목록 정리, 여러 W에 걸친 checkpoint가 함께 생겼다.

**명령**:

```sh
.agents/skills/log/scripts/log entry add logs/retry-policy.md --after-line 18 "결론 변경" <<'EOF'
- W2 결론을 5xx-only에서 429 포함으로 바꿨다.
EOF

.agents/skills/log/scripts/log block add logs/retry-policy.md "W3 · error code 목록 정리" <<'EOF'
- W3은 별도 unit이므로 W2 owning block에 넣지 않는다.
EOF

.agents/skills/log/scripts/log block add logs/retry-policy.md "retry 확정에 따른 W4 착수 조건" <<'EOF'
- W2가 확정돼 W4 착수 조건이 갖춰졌다.
- 여러 W에 걸친 cross-unit checkpoint라 특정 W-id로 키잉하지 않는다.
EOF
```

**결과 markdown 핵심**: 같은 unit은 `###` entry로 누적하고, 별도 unit이나 cross-unit checkpoint는
새 `##` block으로 둔다.

**주의점**: `[>] W2`로 재개하는 세션은 W2 owning block의 최신 entry에서 현재 결론을 복원한다. block
순서가 날짜순으로 뒤섞여 보여도 W-id와 heading으로 owning block을 찾는다.

### scope 정밀화와 Override

**상황**: 대부분의 W에는 전역 제약이 적용되지만 특정 W만 승인 범위 안에서 예외를 갖는다.

**명령**:

```sh
.agents/skills/log/scripts/log context add logs/log-skill.md Global \
  "[no-skill-edit] 실제 .agents/skills/log/* 파일은 사용자 지시 전 수정하지 않는다."

.agents/skills/log/scripts/log context add logs/log-skill.md W3 \
  "Override [no-skill-edit]: 사용자 승인 범위에서 loop-rules.md를 수정한다."
```

**결과 markdown 핵심**:

```markdown
## Required Context

### {Global}

- [no-skill-edit] 실제 .agents/skills/log/* 파일은 사용자 지시 전 수정하지 않는다.

### {W3}

- Override [no-skill-edit]: 사용자 승인 범위에서 loop-rules.md를 수정한다.
```

**주의점**: 먼저 scope 정밀화로 풀고, 정밀화로 안 되는 진짜 예외만 label 기반 `Override`를 쓴다.
