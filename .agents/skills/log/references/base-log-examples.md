# Base Log 판단·운용 사례

이 문서는 Base Log marker 읽기 안내, 판단·운용 Worked Patterns와 핵심 `scripts/log` 결과 예시를
담는다. 명령 syntax는 `../scripts/log --help`로 확인하고, 실제 규칙은 `loop-rules.md`가 소유한다.
이 문서는 규칙을 재정의하지 않는다.

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

## Worked Patterns

### 새 로그 skeleton 생성

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

**주의점**: 첫 block body가 필요하면 이어서 `entry add`나 수동 편집으로 기록한다. 새 로그 이름과
위치는 project workflow가 정한 로그 저장 위치를 따른다.

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

### child 로그로 detach

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

### {Global}

## 2026-07-03 · W1 · evidence check

- A에서 분리된 evidence check를 시작한다.
- 완료 후 A W2가 결과를 소비해야 한다.
```

**주의점**: source가 child 결과를 기다리지 않으면 detach가 아니라 transfer다. 소비 관계가 불명확하면
적용 전에 사용자에게 확인한다. new·detach 결과에는 빈 `### {Global}`이 항상 생성되며, 전역 기준은
이후 `context add`로 채운다.

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
