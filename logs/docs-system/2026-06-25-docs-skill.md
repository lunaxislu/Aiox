---
topic: docs-skill 도입 검토 및 설계
description: 문서화 구조 및 품질 검토용 portable docs-skill의 역할, 범위, 기존 document-structure-review 스킬과의 관계 정의
status: superseded
---

## Work Items

- 열린 work item 없음. 이 로그의 docs-skill 설계·검토 작업 — spine 전면 개편(identity-first) · references 5축 migration · Review Loop dogfood 검증 — 은 모두 완료됐다. 세부 경위와 검증 ledger는 아래 날짜별 기록 블록이 소유한다.
- 이 로그는 종료하지 않고 docs-skill 설계의 open owner 로그로 유지한다(@user 결정 2026-07-08). 추가 설계 변경·검토는 이 로그에 새 기록으로 append한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- @user가 의견·검토를 요청하면 document-structure-review 스킬 파일을 승인 전 수정하지 않고 검토·보고·제안한다.
- 이 로그의 대상 스킬은 `.agents/skills/document-structure-review/`(및 `.claude/skills/` symlink)이며, 스킬 본문·reference·EXAMPLE 내용을 로그에 복사하지 않고 경로 참조로 유지한다.

## 2026-06-25 · 작업 기록 — document-structure-review skill 초안 생성

@user가 “log skill에서 가져올 내용에 대해서 있는지 판단해서, 문서 작성, 문서 검토를 위한 skill 초안”을 만들자고 요청했다.

확인한 파일:

- `/Users/lunaxislu/.codex/skills/.system/skill-creator/SKILL.md`
- `.agents/skills/log/SKILL.md`
- `.agents/skills/log/references/maintenance.md`
- `.agents/skills/log/references/log-writing-rules.md`

판단:

- `maintenance.md`에서 가져올 일반화 가능한 내용은 문제 분류, owner 분리, 단순화 우선, 중복 재정의 금지, 새 문서/read path 증가 점검, rule shape 선택, scope 표현 재점검이다.
- `log-writing-rules.md`의 Work Items, 로그 status, frontmatter 같은 로그 전용 구조 규칙은 문서 작성/검토 skill에 직접 넣지 않는 것이 맞다.
- 새 skill은 repo-local `Related`, `Evidence`, `Status` 규칙을 담는 것이 아니라, 그런 규칙을 만들거나 검토할 때 쓰는 사고 절차를 담아야 한다.

생성한 초안:

- `.agents/skills/document-structure-review/SKILL.md`

## 2026-06-25 · 착수 — docs-skill 도입 검토 및 설계

이 로그는 **docs-skill**(문서화 관련 portable skill)의 신설/개선 여부와 범위, 그리고 기존의 `document-structure-review` 스킬과의 통합 및 분리 방안을 정의하기 위해 생성했다.

**성격:** 토론/설계 로그.

**논의 범위:**

- `docs-skill`의 주요 목적: agent가 docs 하위 문서를 작성/리뷰할 때 적용할 portable한 구조, 형식 및 품질 점검 규칙 정의.
- 기존 [document-structure-review](file:///Users/lunaxislu/Documents/ai-orchestration/.agents/skills/document-structure-review/SKILL.md)와의 관계: 중복 여부 확인 및 역할 흡수/대체 방안 검토.
- portable rules(`SKILL.md`)와 repo-specific rules(`docs/AGENTS.md`)의 하향식 계약 분리.

**명시적 비범위:**

- `docs-skill` 구현 전의 자동화 스크립트 작성은 이 로그의 직접 범위가 아니다.
- W6 등의 다른 active plan 변경분 반영은 별도 로그에서 소유한다.

**종료 기준:**

- `docs-skill`의 portable한 역할 범위와 기존 skill과의 관계를 정의한다.
- 신규 스킬로의 승격 또는 기존 스킬의 개편 방향을 확정한다.

## 2026-06-25 · Feedback — Sources/provenance 문구는 중복 없이 표기 규칙으로 둠

**사례:**

`Evidence And Sources` 후보에 아래 두 문장이 함께 있었다.

```md
- `Sources:`는 logs, history files, 이전 owner 문서처럼 provenance가 중요할 때 기록한다.
- `Sources`, provenance, 로그 경위처럼 경로 자체가 근거인 경우에는 backtick path를 유지한다.
```

**@user 지적/의견:**

- 두 문장이 일부 중복된다.
- 다만 `Sources`, provenance, 로그 경위처럼 경로 자체가 근거인 경우에는 backtick path를 유지한다는 표현은 더 넓고 의도가 잘 드러난다.
- “두 섹션 모두 owner 내용을 대신하지 않는다. durable conclusion은 적절한 docs owner로 증류한다”는 문구는 필요한지 의문을 제기했다.
- 해당 owner handoff/증류 원칙은 이미 `logs/AGENTS.md`에 있는 내용이라고 지적했다.

**@codex 확인/판단:**

- `logs/AGENTS.md`를 확인했다.
- 확인한 사실: `logs/AGENTS.md`는 로그가 작업 경위의 owner일 뿐 중요한 결정이나 현재 권위 내용 자체의 owner가 아니며, 확정 결과는 taxonomy owner 문서, agent 계약, code/test에 반영해야 한다고 규정한다.
- 따라서 `Evidence And Sources`에 “owner 내용을 대신하지 않는다 / durable conclusion은 docs owner로 증류한다”를 반복하면 중복이다.

**수용한 방향:**

- `Evidence And Sources`는 `Evidence:`/`Sources:` 표기 규칙에 집중한다.
- owner handoff/증류 원칙은 `Logs And Plans` 경계와 `logs/AGENTS.md`가 소유한다.
- `Sources:` 관련 두 문장은 가능하면 한 문장으로 합쳐 중복을 줄인다.

## 2026-06-25 · Feedback — Inline Code Stability는 style이 아니라 구조 안정성 guard

**사례:**

초안에 기존 `### Inline Code Stability` 내용을 유지했다.

```md
### Inline Code Stability

- inline code는 한 물리적 줄 안에서만 쓴다. multi-line inline code를 만들지 않는다.
- 코드·evidence·경로·명령 텍스트에 줄바꿈이 필요하면 fenced code block을 쓰거나 한 줄짜리 inline code 여러 개로 쪼갠다.
- docs 파일을 편집하면 `scripts/check-markdown-inline-code <file>`를 돌린다.
- 편집 범위 밖에 이미 있는 닫히지 않은 span은 repair-when-touched로 다룬다...
```

**@user 지적/의견:**

- 이 내용이 `## Writing Style`의 “짧고 명확하게 쓴다 / owner 내용을 길게 복사하지 않는다 / fact-inference-opinion 구분”에 포함되는 것 아니냐고 질문했다.
- `repair-when-touched` 표현의 의미도 물었다.

**@codex 판단/수용:**

- `Inline Code Stability`는 문체가 아니라 Markdown 구조 안정성/검증 guard라서 `Writing Style`에 흡수하면 agent가 문체 취향으로 오해할 수 있다고 판단했다.
- 다만 기존 문구는 길고 과거 회귀 설명이 장황하므로 축약하는 편이 낫다.
- `repair-when-touched`는 “이번 편집 범위 안에서 발견한 문제는 고치되, 명시적 scope 없이 파일/문서 전체나 repo 전역 정리로 확장하지 않는다”는 뜻으로 풀어 쓰는 편이 더 명확하다.

**반영 후보:**

```md
### Inline Code Stability

- inline code는 한 물리적 줄 안에서만 쓴다. multi-line inline code를 만들지 않는다.
- 줄바꿈이 필요한 code/evidence/path/command는 fenced code block이나 여러 개의 한 줄 inline code로 나눈다.
- docs 파일을 편집하면 `scripts/check-markdown-inline-code <file>`를 돌려 inline code span이 닫힌 상태인지 확인한다.
- 이번 편집 범위 안에서 발견한 inline code 문제는 고치되, 명시적 scope 없이 파일/문서 전체나 repo 전역 정리로 확장하지 않는다.
```

## 2026-06-25 · Feedback — Code/test evidence 설명 문장은 규칙 중복이면 삭제

## 2026-06-27 · document-structure-review 개선 리뷰 입력 검토

@user가 `document-structure-review` skill 개선에 대한 @claude 리뷰를 전달했다. 리뷰의 핵심은 A-F 개선 후보를 모두 새 섹션으로 늘리기보다, 기존 섹션에 흡수·sharpening하는 것이 skill 자신의 단순화/read-path 원칙과 맞는다는 내용이었다.

@codex 확인:

- `.agents/skills/document-structure-review/SKILL.md`는 실제로 `Context Read Path`, `Structure Smells`, `Rule Shape`, `Guideline Structure Models`, `Output Checklist`를 이미 갖고 있다.
- 예시 파일은 루트 `EXAMPLE.md`가 아니라 `.agents/skills/document-structure-review/references/EXAMPLE.md`에 있다.
- `references/EXAMPLE.md`에는 8개 사례가 있으며, ancestor 자체를 후보로 비교하는 절차와 concrete authoring scenario 검증은 본문 규칙으로는 아직 직접 드러나지 않는다.

@codex 판단:

- @claude의 "Minimal patch 우선" 방향은 타당하다. 특히 skeleton minimality, over-provisioned section smell, negative rule을 classification으로 올리는 guard, checklist 보강은 기존 섹션에 흡수하는 편이 맞다.
- ancestor를 검토 가능한 constraint로 보는 문제와 scenario 비교는 실제 신규 gap이지만, 바로 별도 대형 섹션 여러 개로 늘리면 skill의 단순화 원칙과 충돌한다.
- 다음 반영 후보는 `Guideline Structure Models`, `Structure Smells`, `Rule Shape`, `Output Checklist` 중심의 minimal patch이며, 필요 시 별도 승인 후 `Change Candidates` 결합 절과 예시 추가를 검토한다.

## 2026-06-27 · external repo 조사 입력에 따른 skill 개선 방향 재판정

@user가 공개 GitHub repo 사례를 조사한 Gemini 결과를 전달했다. 조사 목적은 ancestor를 쉽게 무시하지 않는 gate와 scenario test를 조건부로만 적용하는 패턴을 다른 repo에서 확인하는 것이었다.

@codex 확인:

- Kepler `AGENTS.md`는 `AGENTS.md`, `CLAUDE.md`, `GOVERNANCE.md` 수정과 architecture change를 approval/proposal gate로 둔다.
- Waza `skills/think/SKILL.md`는 hard rule과 plan이 충돌하면 contradiction을 드러내고 `Do not silently override the rule`, blocking이면 stop and ask하도록 한다. 또한 Lightweight/Evaluation/Triage처럼 작업 성격별 모드를 나눈다.
- GSA-TTS `cdc-places-mcp-server/AGENTS.md`는 risk mode를 두고 broad/infrastructure 변경일수록 더 강한 approval을 요구한다.

@codex 판단:

- 외부 사례는 `ancestor는 constraint이지만 axiom은 아니다`와 `silent override 금지`를 함께 두는 방향을 뒷받침한다.
- scenario 검증은 모든 문서 수정에 강제하지 않고 skeleton/template/owner boundary/ancestor contract처럼 구조적 영향이 큰 변경 후보에 한정하는 것이 적절하다.
- 다만 Gemini의 `Boundary And Change Gates` 신규 섹션 제안은 `document-structure-review`의 흡수·단순화 원칙과 긴장한다. 반영은 새 섹션이 아니라 `Review Loop`, `Authoring Guideline Improvement`, `Structure Smells`, `Guideline Structure Models`, `Rule Shape`, `Output Checklist`에 흡수하는 방향이 더 맞다.

## 2026-06-25 · 원문 기록 — 문서 작성/구조 리뷰 스킬 일반화 논의

@user가 2026-06-25-docs-하위-지침서와-Obsidian-템플릿-논의.md의 작업을 위한 세션 대화 내용을 발췌하라고 하였다.

**@user:**

> docs-review도 좋은데 문서를 작성할 때라던지도 필요 할거 같다는 생각도 들고
> 현재 너의 초안을 봤는데 이건 repo에만 사용가능하고 너무 국한되어있는거 같은데?
> 그리고 로그 스킬의 maintenance등을 참고 하라는게 로그등을 참고하라는게 아니라 파일에 있는 내용들중 문서들에 대해 리뷰할 문장들이 있으면 그 문장들을 가져오라는거임
>
> 그리고 일반화를 해야지 씨발아

**@codex:**

> 맞습니다. 방금 초안은 repo-local 규칙을 너무 많이 끌고 들어갔고, “문서 작성/검토 스킬”로 일반화하지 못했습니다. 먼저 중단된 패치가 파일을 남겼는지 확인하고, 그 다음 일반화된 스킬 구조로 다시 잡겠습니다.

**@codex 확인:**

```sh
test -e .agents/skills/docs-review/SKILL.md && sed -n '1,220p' .agents/skills/docs-review/SKILL.md || true
```

출력 없음. 즉 `.agents/skills/docs-review/SKILL.md`는 생성되지 않았다.

**@codex:**

> 맞습니다. 방금 초안은 실패 방향이었습니다.
>
> 문제:
>
> - `docs/AGENTS.md`, `logs/AGENTS.md`, repo-specific owner 구조를 너무 직접 박았습니다.
> - “문서 작성/검토 스킬”이 아니라 “이 repo의 docs 검토 체크리스트”가 됐습니다.
> - maintenance를 참고하라는 뜻도 내가 잘못 받았습니다. 로그 파일을 참고하라는 게 아니라, `maintenance.md` 안의 문서 검토에 일반화 가능한 판단 문장/원칙을 뽑아 쓰라는 뜻이었습니다.
>
> 중단된 패치는 파일을 남기지 않았습니다. `.agents/skills/docs-review/SKILL.md`는 생성되지 않았습니다.
>
> 일반화하면 스킬 이름도 `docs-review`보다 넓게 잡는 게 낫습니다.
>
> 추천 이름:
>
> - `document-authoring-review`
> - 또는 짧게 `document-review`
>
> 역할:
>
> - 문서를 새로 작성할 때
> - 기존 문서를 리뷰할 때
> - 지침서/템플릿/skeleton을 정리할 때
> - 작성 규칙이 중복되거나 owner/scope가 흐릴 때
> - feedback을 문서화할 때
>
> repo-specific 용어는 빼고, 이런 일반 원칙으로 가야 합니다.

```md
# Document Authoring Review

문서 작성, 문서 리뷰, 작성 지침, 템플릿, skeleton을 정리할 때 사용한다.
목표는 문장을 더 그럴듯하게 만드는 것이 아니라, 다음 작성자나 agent가 같은 판단을 복원할 수 있게 scope, owner, 근거, 예외, 검증을 선명하게 만드는 것이다.

## Core Review Questions

- 이 문서가 무엇을 소유하는가?
- 이 문서가 소유하지 않는 것은 무엇인가?
- 같은 규칙이나 내용이 다른 문서에 중복되어 있지 않은가?
- 규칙의 적용 범위가 명확한가?
- 예시는 규칙을 돕고 있는가, 아니면 예시가 규칙을 대신하고 있는가?
- 새 섹션이나 새 문서가 read path를 늘리는 만큼 가치가 있는가?
- 더 단순한 scope 조정, 문장 축약, 재배치로 해결할 수 있는가?
- 근거, 추론, 의견, 제안이 구분되어 있는가?
```

**@codex:**

> maintenance에서 뽑을 일반화 원칙은 이런 것들입니다.

```md
## Maintenance-Inspired Principles

- 단순화가 우선이다. 문제나 편의를 이유로 문서, 필드, 예외를 계속 늘리지 않는다.
- 같은 규칙을 여러 문서에서 재정의하지 않는다.
- 새 문서를 만들기 전에 기존 문서의 재배치나 축약으로 해결 가능한지 본다.
- 특정 사례를 바로 예외로 박기 전에, 그 사례가 어떤 형식의 규칙을 요구하는지 고른다.
- scope rule은 적용 범위가 흔들릴 때 쓴다.
- identity rule은 문서나 구조의 정체성이 흔들릴 때 쓴다.
- decision table은 결과가 여러 갈래로 나뉠 때 쓴다.
- invariant나 negative rule은 금지할 해석이 반복될 때 쓴다.
- must rule은 조건은 명확하지만 agent가 실행을 미룰 때 쓴다.
- 설명 문서에는 확정된 규칙만 짧게 남기고, 시행착오와 rejected alternative는 작업 로그나 feedback 기록에 남긴다.
```

**@codex:**

> 그리고 feedback 기록 품질은 repo-independent하게 이렇게:

```md
## Feedback Capture

사용자 지적이나 리뷰 피드백을 문서화할 때는 원문 대화 덤프가 아니라 판단 가능한 사례로 정리한다.

- 사례: 문제가 된 문구, 구조, 예시, 규칙.
- 사용자 지적: 왜 문제가 되는지, 어떤 대안을 제안했는지.
- 검토 판단: 확인한 사실, 수용/부분 수용/비수용 이유.
- 반영 후보: 실제 문서에 넣을 짧은 문안.
- 남은 질문: 아직 결정되지 않은 것.
```

**@codex:**

> 즉 새 스킬은 특정 repo의 `Related`, `Evidence`, `Status` 규칙을 직접 담으면 안 됩니다. 대신 그런 규칙을 만들 때 쓰는 검토 프레임을 담아야 합니다.
>
> 내가 다시 만들면 방향은 이겁니다.
>
> - 스킬명: `document-review`
> - 언어: 한국어
> - repo-specific path 없음
> - maintenance에서 일반화 가능한 문장만 추출
> - 문서 작성과 리뷰 둘 다 trigger
> - reference 파일 없이 `SKILL.md` 하나로 짧게 시작
> - 나중에 사례가 쌓이면 `references/feedback-patterns.md` 같은 식으로 분리
>
> 원하면 다음 턴에서 이 기준으로 실제 `.agents/skills/document-review/SKILL.md`를 만들겠습니다.

**@user:**

> 내가 지적했던것들과 더불어서
> 해당 개념,섹션이 포함관계인가 sibling인가를 봤고,
> 사례에서 log관련 지침서가 있는지 등 확인을 했잖아? 이건 docs 문서등에서 내용이 있는지를 내가 찾아서 확인하라고 했으니까 이거에 대해선 추론해서 확인 부터 해보는거지, 그리고 있다고 중복이라 보는것이 아니라 이 내용이 그래도 필요한건지, 필요하지 않은건지등을 판단 하는거고,
>
> 그리고 `문서 참조는 repo 기준 경로로 작성한다`라고 쓰면 wikilink든 backtick path든 모두 포함하므로 충분하다. 이런식으로
> 현재의 문제에 집중해서 해결을 제시하는것이 아니라 뭐라고 할까 음..

**@codex:**

> 맞습니다. 네가 말하는 건 단순한 “문서 리뷰 체크리스트”가 아니라, 문서 규칙을 검토할 때의 사고 절차에 가깝습니다.
>
> 핵심은 이겁니다.
>
> 1. 개념 관계를 먼저 판정한다
>    - A가 B의 하위 개념인가?
>    - A와 B가 sibling인가?
>    - A가 다른 owner가 소유하는 절차/정책인가?
>    - 지금 위치에 두면 계층이 틀어지는가?
>
> 예: `Sources:`가 `Evidence:` 하위인가?
> 판단: 아니다. 둘은 sibling이다. 그래서 `Code And Test Evidence` 밑에 `Sources`를 넣으면 계층이 흐려진다.
>
> 2. 이미 소유한 문서가 있는지 먼저 확인한다
>    - “이 내용이 다른 문서에 있을 것 같다”는 추론이 들면 먼저 확인한다.
>    - 확인 전에는 중복이라고 단정하지 않는다.
>    - 확인 후에도 바로 삭제하지 않고, 현재 문서에 필요한 경계 설명인지 판단한다.
>
> 예: durable conclusion을 owner 문서로 증류한다는 내용.
> 확인: `logs/AGENTS.md`에 owner handoff 원칙이 있음.
> 판단: `Evidence And Sources`에는 반복하지 않고, `Logs And Plans`에서 경계와 위임만 남기는 게 낫다.
>
> 3. 문제를 더 큰 일반론으로 도망가지 않고, 현재 문장의 실패를 고친다
>    - “문서 참조는 wikilink 여부와 관계없이…” 같은 과설명은 현재 문제가 뭔지 흐린다.
>    - 사용자가 지적한 문제는 “wikilink냐 아니냐”가 아니라 “문서 참조 경로를 어떻게 쓸 거냐”였다.
>    - 그래서 해결은 더 일반적이고 짧은 문장이어야 한다.
>
> 예:

```md
- 문서 참조는 repo 기준 경로로 작성한다.
```

**@codex:**

> 4. 중복 여부보다 ‘현재 문서에서의 역할’을 본다
>    - 다른 문서에 같은 원칙이 있어도 현재 문서에 경계 문장으로 필요한 경우가 있다.
>    - 반대로 같은 말이 현재 섹션의 책임을 흐리면 빼야 한다.
>    - “있다/없다”가 아니라 “여기에 이 정도로 필요한가”를 판단한다.
> 5. 표현의 추상도와 위치를 같이 본다
>    - 너무 구체적인 사례는 일반 규칙을 흐린다.
>    - 너무 추상적인 문장은 agent가 실제 수정할 때 못 쓴다.
>    - 좋은 문장은 현재 문제를 해결하면서도 다음 유사 사례에 재사용된다.
>
> 이걸 스킬로 만들면 이름은 `document-review`보다 `document-structure-review` 쪽이 더 맞을 수도 있습니다. 그냥 문장 리뷰가 아니라 문서 구조, 개념 계층, owner, 중복, scope를 보는 스킬이니까요.
>
> 스킬의 핵심 루프는 이렇게 잡으면 됩니다.

```md
1. 문제가 된 문장/섹션/규칙을 식별한다.
2. 그 내용의 개념 역할을 판정한다: parent/child, sibling, owner boundary, evidence, provenance, workflow, style.
3. 같은 책임을 소유한 문서가 있는지 확인한다.
4. 확인한 문서가 있어도 곧바로 중복으로 보지 말고, 현재 문서에 필요한 경계/요약/위임인지 판단한다.
5. 현재 문제를 해결하는 가장 짧은 문장을 제안한다.
6. 필요하면 사례를 규칙으로 일반화하되, repo-local 이름이나 임시 상황을 skill 본문에 박지 않는다.
```

**@codex:**

> 그리고 네가 말한 “뭐라고 할까”는 아마 이런 표현이 맞습니다.
>
> 문제 해결형 문장 다듬기가 아니라, 문서 규칙의 책임과 추상도를 조정하는 리뷰 스킬.
>
> 즉:
>
> - copyedit 아님
> - style guide 아님
> - docs repo 전용 체크리스트 아님
> - “이 규칙이 어디에 있어야 하고, 어느 정도 추상도로 써야 하며, 다른 문서와 어떤 관계여야 하는가”를 판단하는 스킬
>
> 이 방향으로 만들면 일반화가 됩니다.

**@user:**

> 그리고 뭐냐
> `## Authoring Skills` 을 삭제하고 상위로 올리면서 했던 사고 과정
> `## Code And Test Evidence -> ## Evidence And Sources` 로 변경하는 사고 과정도 내가 생각했던거고 나는 이런것들을 중요시 하는거 같음 뭔말인지 알지?

**@codex:**

> 응, 무슨 말인지 알겠습니다.
>
> 네가 중요하게 보는 건 단순히 “문장을 더 예쁘게 고치는 것”이 아니라, 문서 안에서 개념이 어디에 있어야 하는지 재배치하는 사고 과정입니다.
>
> 예를 들면:
>
> `## Authoring Skills` 케이스는:
>
> - 처음에는 별도 섹션처럼 보였음
> - 그런데 전체 문서 구조에서 보면 도구 사용법만 따로 튀었음
> - 실제로는 `docs/`의 정체성, Obsidian vault 문서라는 성격, 편집 시 skill 사용 조건이 한 흐름으로 이어져야 했음
> - 그래서 “섹션 유지”가 아니라 “도입부 정체성 설명으로 흡수”가 맞았음
>
> 즉 판단 기준은:
>
> - 이 개념이 독립 섹션인가?
> - 아니면 문서 정체성을 설명하는 도입부의 일부인가?
> - 독립 섹션으로 두면 read path나 개념 계층이 어색해지는가?
>
> `Code And Test Evidence -> Evidence And Sources` 케이스는:
>
> - 처음에는 code/test evidence 섹션 안에 Sources 이야기가 섞였음
> - 그런데 Sources는 Evidence의 하위가 아니라 sibling 개념이었음
> - 둘 다 근거/추적성 계열이지만, 하나는 current/as-built code/test 근거이고 다른 하나는 provenance임
> - 그래서 섹션명을 Evidence And Sources로 바꾸고, 둘의 관계를 같은 레벨로 재정리하는 게 맞았음
>
> 즉 판단 기준은:
>
> - A가 B의 하위 개념인가?
> - A와 B가 같은 레벨의 sibling인가?
> - 현재 섹션명이 개념 관계를 왜곡하고 있지 않은가?
>
> 이건 꽤 중요한 패턴입니다. 스킬로 만들면 핵심은 “문서 작성/검토”보다 더 정확히는:
>
> 문서 구조와 개념 배치 리뷰
>
> 정도로 잡는 게 맞습니다.
>
> 스킬에 들어가야 할 핵심 사고 절차는 이런 겁니다.
>
> - 문장을 고치기 전에 해당 내용의 개념 역할을 판정한다.
> - 독립 섹션인지, 상위 문맥에 흡수될 내용인지, 다른 개념과 sibling인지 확인한다.
> - 이미 다른 문서가 소유하는 내용이면 먼저 확인하고, 현재 문서에는 경계/위임만 필요한지 판단한다.
> - 중복 여부만 보지 말고, 현재 위치에서 필요한 역할이 있는지 판단한다.
> - 현재 문제를 해결하는 가장 짧고 일반화 가능한 문장으로 바꾼다.
> - 예시는 규칙을 돕는 용도이지, 규칙을 대신하지 않게 한다.
>
> 네가 중요하게 보는 건 “정답 문구”보다 왜 그 문구가 그 위치에 있어야 하는가입니다. 이걸 스킬의 중심에 둬야 합니다.

**@user:**

> `Code And Test Evidence -> Evidence And Sources` 케이스는:
>
> - 처음에는 code/test evidence 섹션 안에 Sources 이야기가 섞였음
> - 그런데 Sources는 Evidence의 하위가 아니라 sibling 개념이었음
> - 둘 다 근거/추적성 계열이지만, 하나는 current/as-built code/test 근거이고 다른 하나는 provenance임
> - 그래서 섹션명을 Evidence And Sources로 바꾸고, 둘의 관계를 같은 레벨로 재정리하는 게 맞았음
>
> 여기서는 결국 Evidence and Sources로 변경하면서 Code and test에 대한 설명도 하위로 가게 되었잖아? 맞나?

**@codex:**

> 맞습니다.
>
> 정확히는 `Code And Test Evidence`라는 섹션 제목/상위 개념은 사라지고, 그 안에 있던 필요한 내용은 `Evidence And Sources` 아래의 `Evidence` 설명으로 내려갔습니다.
>
> 구조 변화는 이겁니다.
>
> 이전 구조:

```md
## Code And Test Evidence

- 코드와 테스트는 현재 구현 사실의 owner다.
- current/as-built 동작을 주장할 때는 관련 code/test 근거를 남긴다.
- ...
- Sources/provenance 관련 문장도 여기 섞임
```

**@codex:**

> 문제:
>
> - 섹션명이 code/test만 포괄함
> - 그런데 안에는 `Sources:`/provenance 이야기도 들어감
> - 그래서 `Sources`가 `Code And Test Evidence`의 하위처럼 보임
>
> 변경 후 구조:

```md
## Evidence And Sources

- 코드와 테스트는 현재 구현 동작의 사실 owner다.
- `Evidence:`는 current/as-built 동작 주장에 대한 code/test 근거를 기록한다.
- `Evidence:`에서는 code/test 파일을 wikilink하고, 정확한 range는 그 아래에 적는다.
- 정확한 code/test range는 `file:line` 또는 `file:line-line`으로 쓴다.
- `Sources:`는 provenance가 중요할 때 쓰며, logs/history 경로처럼 경로 자체가 근거인 경우에는 backtick path로 적는다.
```

**@codex:**

> 여기서 계층은:

```text
Evidence And Sources
├─ Evidence: code/test 근거
│  └─ code/test는 current/as-built fact owner
└─ Sources: provenance/log/history/source 경위
```

**@codex:**

> 즉 `Code And Test Evidence`는 독립 섹션이 아니라 `Evidence:`라는 하위 개념의 설명으로 들어간 겁니다.
>
> 이게 중요한 이유는:
>
> - `Evidence`와 `Sources`가 sibling이라는 구조가 살아남
> - code/test 규칙은 사라지지 않고 Evidence 쪽 의미로 정확히 제한됨
> - `Sources`가 code/test evidence의 변종처럼 오해되지 않음
>
> 그래서 이 사례는 “섹션 rename”이 아니라 상위 개념을 다시 잡고 기존 내용을 알맞은 하위 위치로 재배치한 사례입니다.

**@user:**

> 그치 뒤바뀐거잖아?

**@codex:**

> 맞습니다. 정확히는 상하 관계가 뒤바뀐 겁니다.
>
> 처음 구조는 암묵적으로 이렇게 되어 있었습니다.

```text
Code And Test Evidence
├─ Evidence
└─ Sources / provenance
```

**@codex:**

> 이러면 `Sources`가 code/test evidence 섹션의 하위처럼 보입니다. 그런데 실제 개념 관계는 그게 아니었습니다.
>
> 올바른 구조는 이쪽입니다.

```text
Evidence And Sources
├─ Evidence
│  └─ code/test evidence
└─ Sources
   └─ provenance / logs / history
```

**@codex:**

> 즉 `Code And Test Evidence`가 최상위 섹션이면 안 되고, `Evidence` 하위 설명으로 내려가야 했습니다. `Sources`는 `Evidence`와 같은 레벨에 있어야 했고요.
>
> 이게 네가 중요하게 보는 패턴입니다.
>
> - 현재 제목이 잘못된 상위 개념을 만들고 있지 않은가?
> - 하위에 들어간 내용이 사실은 sibling 아닌가?
> - 기존 상위 섹션이 사실은 새 상위 개념의 하위 설명 아닌가?
> - 그러면 제목을 바꾸고 내용을 재배치해야 함
>
> 스킬에 반드시 들어갈 만한 핵심 패턴입니다.

## 2026-06-25 · 요약 결론 — 문서 작성/구조 리뷰 스킬 설계 입력

이 전체 논의를 통해 새 스킬은 단순히 문장 교정이나 repo-local docs checklist가 아니라 아래 성격을 가져야 한다.

- 문서 작성과 문서 리뷰 둘 다 지원한다.
- 문장보다 구조와 개념 배치를 먼저 본다.
- 문서/섹션/규칙의 owner와 scope를 판정한다.
- parent/child 관계인지 sibling 관계인지 확인한다.
- 다른 문서가 이미 소유하는 내용인지 추론하고 확인한다.
- 확인 후에도 단순 중복 판단이 아니라 현재 문서에서 필요한 경계/요약/위임인지 판단한다.
- 섹션을 추가하기보다 기존 섹션의 재배치, 흡수, 축약으로 해결 가능한지 먼저 본다.
- 현재 문제를 해결하는 가장 짧고 일반화 가능한 문장을 제안한다.
- repo-local 이름, 임시 path, 현재 프로젝트의 구체 규칙을 skill 본문에 박지 않는다.
- 구체 사례는 pattern으로 일반화한다.

스킬의 핵심 질문 후보:

```md
- 이 내용은 독립 섹션인가, 도입부/상위 문맥에 흡수될 내용인가?
- 이 개념은 다른 개념의 하위인가, sibling인가?
- 현재 제목이 잘못된 상위 개념을 만들고 있지 않은가?
- 이미 이 책임을 소유한 문서가 있는가? 확인했는가?
- 그 문서가 있다면 현재 문서에는 삭제, 경계 설명, 요약, 위임 중 무엇이 필요한가?
- 현재 문장은 문제 해결에 필요한 만큼만 말하는가?
- 예시가 규칙을 돕고 있는가, 아니면 규칙을 대체하거나 오해를 만들고 있는가?
- 새 섹션/새 문서가 read path를 늘리는 만큼 가치가 있는가?
```

## 2026-06-25 · 작업 기록 — Claude skills symlink 추가

@user가 `.claude/skills`와도 symlink를 걸어달라고 요청했다.

확인한 사실:

- `.claude/skills`는 이미 존재했다.
- 기존 `json-canvas`, `log`, `obsidian-markdown`은 `.agents/skills/*`를 가리키는 상대 symlink였다.

수행:

- 동일한 패턴으로 `.claude/skills/document-structure-review`를 추가했다.
- 링크 대상은 `../../.agents/skills/document-structure-review`다.

## 2026-06-26 · stage8 반영 결과 — document-structure-review skill 현행 상태

workspace reset stage8 W5(`logs/workspace-reset/plan-stages/2026-06-26-workspace-reset-stage8-Atlas-반영·drift-재검토.md`)에서
`docs/specs/AGENTS.md` 작성·리뷰 과정의 portable 패턴을 `document-structure-review` skill에 반영했다.
이 로그는 원래 docs-skill 설계 owner 성격의 open 로그이므로, stage8의 cross-owner effect를 여기에도 남긴다.

**확인한 반영:**

- `.agents/skills/document-structure-review/SKILL.md` description을 특정 실행 주체가 아닌 `an agent` 기준으로 중립화했다.
- `Scope / Non-Goals`를 추가해 이 skill이 project-specific docs format, log lifecycle, Work Items, closeout,
  owner handoff를 소유하지 않음을 명시했다.
- `Context Read Path`를 추가하되 stop criteria를 포함했다: 직접 parent에서 시작해 위임된 ancestor 계약까지 따라가되,
  root/scope boundary에 도달했거나 더 올라가도 현재 판단을 바꾸지 않으면 멈춘다. owner map, sibling, child/slice는
  현재 판단을 바꿀 수 있을 때만 읽는다. 프로젝트가 문서 작성·수정 흐름을 따로 정의하면, 현재 변경이 그 흐름에서
  언제·어떻게 수행되어야 하는지도 확인한다.
- `Structure Smells`에 `hidden or implicit authority`, `orphan local rule` 등을 추가했다.
- `Guideline Structure Models`와 `Comparative Guideline Review`를 추가했다. 단, 기존 owner guideline이 구조를
  확정한 경우 이 모델 목록으로 override하지 않는 guard를 둔다.
- `Feedback Capture` 섹션은 log skill·현재 작업 로그 owner와 경계가 흐려져 삭제했다.
- Review Loop에서 시행착오·rejected alternative·상세 피드백의 기록 위치를 말하던 step도 log 작업 성격이라 삭제했다.
- `feedback records`처럼 기록 owner로 읽힐 수 있는 description 표현을 `review feedback that affects document structure`로
  좁혔다. `상위/parent`로 남아 있던 표현은 parent/ancestor 계약 체인 기준으로 정리했고, 일반 `workflow`는
  `authoring workflow`로 좁혔다.
- Output Checklist에 확인한 사실/추론/의견/제안 구분, 숨은 규칙 노출, skeleton fence 누출 방지를 추가했다.

**검토 경위:**

- @user 요청으로 subagent가 `logs/docs-system/2026-06-25-docs-하위-지침서와-Obsidian-템플릿-논의.md`,
  이 로그, stage8 로그, log skill과 maintenance reference, `logs/AGENTS.md`, root `AGENTS.md`,
  `docs/AGENTS.md`, `docs/documentation-system.md`를 읽고 비판 리뷰했다.
- 수용한 핵심 지적: feedback 기록 owner 모호성, SKILL.md 과확장 위험, docs-skill 로그 stale 위험,
  Context Read Path stop criteria 부족, 구조 모델의 owner guideline override 위험, fact/inference/opinion/proposal
  보고 구분 누락.

**남은 결정:**

- 현재는 `SKILL.md` 단일 파일에 유지한다. 향후 더 길어지거나 사례가 누적되면 reference 분리 여부를 다시 판단한다.
- 이 로그의 종료 여부는 stage8 W5의 나머지 child AGENTS 완료 및 2026-06-25 docs 하위 지침서 논의 로그 closeout과 함께
  재검토한다.

## 2026-06-26 · document-structure-review examples reference 추가

@user 요청으로 `.agents/skills/document-structure-review/references/EXAMPLE.md`를 추가했다. 이 reference는 현재
프로젝트 원문 로그나 repo path를 보존하지 않고, `docs/decisions/documentation-system-location.md`와 2026-06-25/26
문서 지침 논의에서 나온 판단을 portable 사례로 추상화한다.

**반영:**

- `SKILL.md` 도입부에 구조 문제의 종류나 적합한 rule shape가 애매하면 `references/EXAMPLE.md`를 읽는 routing 문장을
  추가했다.
- `EXAMPLE.md`에는 misfiled owner map, Evidence/Sources sibling 관계, tool guidance의 identity 흡수,
  index/slice sub-kind, 문서 type별 drift 의미 차이, skeleton 예시의 hidden rule, 반복 작성 문제가 authoring guide
  개선 후보가 되는 사례를 넣었다.

**SKILL.md 추가 반영 검토:**

- 사례들은 현재 `SKILL.md`의 `Context Read Path`, `Concept Placement`, `Structure Smells`, `Comparative Guideline Review`,
  `Authoring Guideline Improvement`로 대부분 설명된다.
- 다만 `Structure Smells`에 `hidden sub-kind`(index/slice처럼 한 문서군 안 구조적 sub-kind가 숨어 있는 문제)와
  `copied section meaning`(sibling guideline의 같은 heading 의미를 문서 role 재판정 없이 복사하는 문제)을 추가할지
  검토 후보로 남긴다. 현재는 `Comparative Guideline Review`와 `EXAMPLE.md`가 설명하므로 즉시 반영 필수는 아니다.

**검증:**

- `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md .agents/skills/document-structure-review/references/EXAMPLE.md`
  → exit 0 (PASS).
- `python3 /Users/lunaxislu/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/document-structure-review`
  → local Python에 `yaml` 모듈이 없어 `ModuleNotFoundError: No module named 'yaml'`로 중단. 기존과 같은 환경 문제이며
  quick validation 통과로 보지 않는다.

**기록 범위:**

- @user 지시에 따라 이 변경은 이 docs-skill 로그에만 기록하고, stage8 작업 로그에는 기록하지 않는다.

## 2026-06-26 · EXAMPLE.md 기반 Structure Smells 후속 반영

@user 요청으로 `references/EXAMPLE.md` 사례에서 도출한 추가 smell 후보 2건을
`.agents/skills/document-structure-review/SKILL.md`의 `Structure Smells`에 반영했다.

**반영:**

- `hidden sub-kind`: 같은 문서군 안에 index, slice, router, standalone처럼 서로 다른 구조 subtype이 있는데
  skeleton이나 규칙이 단일 형태만 전제하는 문제.
- `copied section meaning`: sibling guideline의 같은 heading이나 섹션 순서를 문서 role 재판정 없이 복사해,
  문서 type마다 달라야 하는 의미가 흐려지는 문제.

**기록 범위:**

- @user 지시에 따라 docs-skill 로그에만 기록하고 stage8 작업 로그에는 기록하지 않는다.

## 2026-06-26 · document-structure-review scenario harness 반영 배경

**최근 추가한 내용:**

- `Structure Smells`에 `abstract destructive gate`
- `Rule Shape`에 `verification harness`
- 새 섹션 `Scenario Harnesses`
- `Output Checklist`에 고위험 변경 harness 점검 항목

**추가 배경:**

`docs/decisions/AGENTS.md`를 정리하면서 기존 decision 문서를 변경·삭제하는 규칙을 논의했다. 처음에는 아래처럼 단순한 문장이 있었다.

```md
- 더 이상 load-bearing rationale이 아니고 live reference도 없으면 삭제한다.
```

이 문장은 방향은 맞지만, agent가 `load-bearing rationale`과 `live reference`를 감으로 해석할 위험이 있었다. 특히:

- `load-bearing rationale`이 어떤 owner 문서를 이해하거나 안전하게 수정하는 데 필요한 WHY인지 명확하지 않았다.
- `live reference`가 현재 owner 문서, active plan, open log, README/AGENTS, code/test 주석, decided 로그 provenance 중 무엇을 포함하는지 불명확했다.
- 경계 케이스에서 agent가 decision 삭제를 너무 쉽게 하거나, 반대로 decided 로그 provenance까지 live로 봐서 아무것도 삭제하지 못할 위험이 있었다.
- Compatibility stub / Superseded note 같은 새 lifecycle mechanism을 도입할지 논의했지만, corpus에 그런 패턴이 없어 도입하지 않는 쪽으로 정리했다.

그래서 `docs/decisions/AGENTS.md`에는 repo-specific `decision-change harness`를 넣었다. 구조는:

- 대상 decision과 연결 owner 문서를 확인한다.
- owner 경계나 현재 권위 판단이 흔들리면 `docs/AGENTS`와 `documentation-system`을 확인한다.
- 보수 업데이트 / 새 decision / 삭제 후보로 먼저 분류한다.
- 삭제 후보는 WHY 복원 가능성, live reference 부재, decided provenance 참조 제외를 확인한다.
- 불확실하면 삭제하지 않고 decision 유지, owner 보강, 새 decision 작성, 사용자 확인으로 처리한다.

이 사례에서 일반화한 패턴은 다음이다.

> 삭제·대체·archive·status 전환처럼 되돌리기 어려운 durable knowledge 변경은 `obsolete`, `더 이상 중요하지 않음`, `참조 없음` 같은 추상 판정어만으로 허용하지 말고, read path + scenario classification + reference classification + fallback을 갖춘 harness로 표현해야 한다.

이 portable 패턴을 `.agents/skills/document-structure-review/SKILL.md`에 추가했다. repo-specific decision 규칙 자체는 skill에 박지 않고, 고위험 문서 lifecycle 변경을 검토할 때 필요한 일반 구조로만 증류했다.

**검증:**

- `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md docs/decisions/AGENTS.md` → exit 0 (PASS).

## 2026-06-26 · document-structure-review destructive-change gate 리뷰 반영

**이전 반영안(Claude 리뷰 전):**

`docs/decisions/AGENTS.md`의 decision 삭제 규칙 검토에서 나온 portable 패턴을 처음에는 아래 4개 변경으로 `.agents/skills/document-structure-review/SKILL.md`에 반영했다.

1. `Structure Smells`에 `abstract destructive gate` 추가.

```md
- `abstract destructive gate`: 삭제, 대체, archive, status 전환처럼 되돌리기 어려운 변경을
  "더 이상 중요하지 않음", "참조 없음", "obsolete" 같은 추상어만으로 허용하고, 확인해야 할
  문서군·참조 범위·불확실할 때의 fallback을 드러내지 않는다.
```

2. `Rule Shape`에 `verification harness` 추가.

```md
- `verification harness`: 삭제, 대체, archive, status 전환처럼 고위험 문서 변경에서 사용한다.
  읽을 계약, 분기할 시나리오, 확인해야 할 참조 종류, 불확실할 때의 fallback을 함께 둔다.
```

3. 새 H2 `Scenario Harnesses` 추가.

```md
## Scenario Harnesses

작성 지침이 삭제, 대체, archive, status 전환처럼 durable knowledge의 lifecycle을 바꾸는 행동을
허용한다면, agent가 추상어를 감으로 해석하지 않도록 scenario harness를 둔다.

- 먼저 ancestor 계약, owner map, target 문서, target이 링크하거나 링크받는 owner 문서처럼 판단을
  바꿀 수 있는 read path를 적는다.
- 가능한 결과를 분류한다. 예: 보수적 수정, 새 문서 작성, owner 문서 보강, 삭제/archival 후보,
  사용자 확인 필요.
- 각 결과가 성립하기 위한 확인 질문을 적는다. 질문은 "load-bearing인가?"처럼 추상어만 두지
  말고, 어떤 현재 문서가 이해·검증·수정 가능하게 남는지, 어떤 trade-off나 rejected alternative가
  사라지는지, 어떤 참조가 현재 작업이나 권위 판단에 영향을 주는지로 풀어 쓴다.
- 참조 범위를 분류한다. 현재 owner 문서, active work, entry/contract 문서, code/test comment처럼
  현재 판단에 영향을 주는 참조와, provenance-only history/log/archive 참조를 구분한다.
- 하나라도 불확실하면 destructive path를 선택하지 않게 한다. fallback은 보류, 사용자 확인, owner
  문서 보강, 새 문서 작성, 더 좁은 보수적 수정 중 하나로 둔다.
- harness는 프로젝트별 로그, plan, 문서 taxonomy 이름을 직접 소유하지 않는다. 구체 경로와 상태
  이름은 해당 프로젝트의 owner guideline이 채운다.
```

4. `Output Checklist`에 아래 항목 추가.

```md
- 삭제, 대체, archive, status 전환처럼 고위험 변경을 허용한다면 추상 판정어 대신 scenario
  harness와 불확실할 때의 fallback이 있는가?
```

**Claude 리뷰 수령:**

@user가 Claude 리뷰를 공유했다. 리뷰는 파일 수정 없이 `SKILL.md` 추가분 4개와 `references/EXAMPLE.md`를 확인한 구조 리뷰였다.

확인된 주요 finding:

- High: `Scenario Harnesses` H2가 skill 자기 원칙과 충돌한다. `Authoring Guideline Improvement`는 새 지침/read path 증가를 먼저 점검하라고 하는데, `Scenario Harnesses` 6개 bullet 중 상당수가 기존 섹션의 재진술이었다.
  - read path bullet은 `Context Read Path`가 이미 소유한다.
  - 가능한 결과 분류는 `Rule Shape`의 `decision table`과 겹친다.
  - 추상어를 확인 질문으로 풀라는 내용은 `hidden or implicit authority`와 `abstract destructive gate` smell이 설명한다.
  - 프로젝트별 이름을 직접 소유하지 말라는 내용은 `Scope / Non-Goals`와 `Owner And Scope`가 이미 소유한다.
- Medium: `verification harness`는 다른 rule shape와 비대칭이다. 다른 shape는 1줄 항목인데 `verification harness`만 rule shape 항목과 별도 H2를 모두 가져 duplicated ownership 신호가 있다. 또한 harness는 rule shape라기보다 procedure에 가깝고, 이름도 test/tool-oriented한 메타포로 튄다.
- Medium: `abstract destructive gate`는 `hidden or implicit authority`의 한 형태로 보일 수 있으므로, 별도 smell로 둘 거면 고유 속성인 비가역성·고위험성을 설명해야 한다.
- Low: "삭제, 대체, archive, status 전환" 목록이 smell/rule shape/H2/checklist에 4회 반복된다.
- Low: Output Checklist 항목이 `scenario harness`라는 섹션명에 결합되어, 섹션을 흡수·개명하면 함께 수정해야 한다.
- Info: `references/EXAMPLE.md`에는 아직 destructive gate/harness 대응 사례가 없고, 사례 7의 rule shape 목록에도 새 shape가 없다. 이번 변경 scope에 반드시 포함할 필요는 없으나 drift 후보로 볼 수 있다.

Claude가 유지 권장한 핵심:

- 현재-영향 참조와 provenance-only 참조를 구분하는 규칙은 신규·고유하며, `docs/decisions/AGENTS.md`의 decision 삭제 판단에서 실제로 유용했다.
- 불확실할 때 비파괴 fallback을 두는 규칙도 신규·고유하며 high-stakes guard의 핵심이다.
- `고위험` 한정어가 있어 모든 문서 변경에 과적용될 위험은 낮다.

Claude의 권고:

- 별도 H2 `Scenario Harnesses`를 제거한다.
- `verification harness` 대신 `reversible-change gate` 또는 유사한 이름으로 rule shape에 흡수한다.
- `abstract destructive gate`에는 `hidden authority`와 다른 이유(비가역 변경이라 숨은 판정을 본문 절차로 끌어내는 우선순위가 높음)를 추가한다.
- Output Checklist는 섹션명 `scenario harness`를 직접 가리키지 않고, 확인할 참조 범위와 불확실할 때의 비파괴 fallback이 있는지 묻도록 바꾼다.

**@codex 판단:**

- Claude 리뷰의 High/Medium finding은 타당하다고 판단했다.
- 단, 이름은 `reversible-change gate`보다 `destructive-change gate`가 더 정확하다고 판단했다. 이유: 다루는 것은 되돌릴 수 있는 변경이 아니라 되돌리기 어려운 변경이며, 기존 smell `abstract destructive gate`와 문제/해법 쌍으로 읽히기 때문이다.
- `Scenario Harnesses` H2는 제거하고, 핵심을 `loss 평가 + reference 평가 + 비파괴 fallback`으로 축약하는 방향을 채택했다.
- `EXAMPLE.md` 사례 추가는 유용하지만 이번 요청의 필수 반영 범위에서는 제외했다. 후속 drift 후보로 남길 수 있다.

**최종 수정(SKILL.md 반영):**

1. `abstract destructive gate` 문안을 아래처럼 보강했다.

```md
- `abstract destructive gate`: 되돌리기 어려운 변경을 "더 이상 중요하지 않음", "참조 없음",
  "obsolete" 같은 추상어만으로 허용하고, 확인할 문서군·참조 범위·fallback을 드러내지 않는다.
  hidden authority와 달리 변경이 비가역이라, 숨은 판정을 본문 절차로 끌어내는 우선순위가 높다.
```

2. `verification harness`를 삭제하고 `destructive-change gate`로 교체했다.

```md
- `destructive-change gate`: 삭제·대체·archive·status 전환처럼 되돌리기 어려운 변경에 쓴다.
  추상 판정어 대신 두 가지를 확인하게 한다: 이 문서로만 복원되는 knowledge가 다른 owner나
  code에 남는가, 그 문서를 가리키는 참조가 현재 권위·작업·구현용인가 provenance-only인가.
  하나라도 불확실하면 비파괴 fallback(보류, 보강, 새 문서, 사용자 확인)으로 보낸다.
```

3. H2 `Scenario Harnesses` 섹션 전체를 삭제했다. 삭제 이유는 해당 섹션의 대부분이 기존 `Context Read Path`, `Rule Shape`, `Scope / Non-Goals`, `Owner And Scope`를 재진술했고, skill 자신의 "새 섹션/read path 증가 점검" 원칙과 맞지 않았기 때문이다.

4. Output Checklist 항목을 아래처럼 수정했다.

```md
- 삭제·대체·archive·status 전환 같은 고위험 변경을 허용한다면, 추상 판정어 대신 확인할
  참조 범위와 불확실할 때의 비파괴 fallback이 본문에 있는가?
```

**검증:**

- `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md` → exit 0 (PASS).

**남은 후보:**

- `references/EXAMPLE.md`에 destructive-change gate 사례를 추가할지 여부는 아직 결정하지 않았다. Claude 리뷰상 미세 drift 후보지만, 이번 반영 범위에는 포함하지 않았다.

## 2026-06-26 · document-structure-review EXAMPLE destructive-change gate 사례 추가

**반영:**

Claude 리뷰에서 `references/EXAMPLE.md`에 destructive-change gate 대응 사례가 없고, 사례 7의 rule shape 목록에도 새 shape가 빠져 있다는 Info finding이 있었다. @user 요청으로 `.agents/skills/document-structure-review/references/EXAMPLE.md`에 portable 사례를 추가했다.

- 사례 7의 rule shape 목록에 `destructive-change gate`를 추가했다.
- 새 사례 `8. Destructive Change Needs A Gate`를 추가했다.
- 사례는 특정 repo path나 decision 문서 이름을 쓰지 않고, 오래된 owner 문서 삭제 조건이 "더 이상 중요하지 않음"과 "참조 없음" 같은 추상어에 머무는 상황으로 일반화했다.
- Preferred response는 knowledge-loss 질문으로 바꾸기, active/current 영향 참조와 provenance-only 참조 구분, 필요 시 owner 보강·reference repoint, 불확실하면 비파괴 fallback으로 보내기를 다룬다.

**검증:**

- `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md .agents/skills/document-structure-review/references/EXAMPLE.md` → exit 0 (PASS).

## 2026-06-27 · document-structure-review broader-by-absorption 반영

@user가 external repo 조사와 @claude/@codex 검토를 종합해 `document-structure-review` skill에 broader-by-absorption 방식으로 반영하라고 승인했다.

**반영(SKILL.md):**

- `Review Loop`에 변경 대상을 문제 문서로 단정하지 않고, 반복 smell이 parent/ancestor 경계에서 발생하면 `local-only` / `ancestor-only` / `both` / `no-change` 후보를 분리하는 절차를 추가했다.
- 같은 문단에 parent/ancestor 계약은 기본 constraint이되 axiom은 아니며, ancestor 변경은 영향권·증거 기준이 높고 skill이 단독 override하지 않으며 해당 owner change 절차를 따른다는 gate를 추가했다.
- `Structure Smells` 트리거에 "없어도 될 것 같다", "다른 owner가 소유해야 한다" 유형을 추가하고, `over-provisioned structure` smell을 추가했다.
- `Rule Shape`의 `negative rule` 설명에 적용 대상 claim이 모호하면 claim type classification이나 decision table로 올린다는 guard를 추가했다.
- `Guideline Structure Models`에 skeleton/default section은 비용이며, 각 default section은 delete/absorb/optional/invariant-only 후보를 먼저 통과해야 한다는 원칙과 모델 선택 질문을 추가했다.
- `Authoring Guideline Improvement`에 skeleton/template/owner boundary/ancestor contract처럼 구조적 영향이 있는 변경 후보가 갈릴 때만 1-3개 concrete authoring scenario로 비교한다는 조건부 절차를 추가했다.
- `Output Checklist`에 ancestor 자체가 stale/overbroad/misplaced일 가능성, 4후보 비교, negative instruction vs classification 확인 항목을 추가했다.

**반영(EXAMPLE.md):**

- 새 portable 사례 `9. Ancestor Contract May Be The Defect`를 추가했다.
- 새 portable 사례 `10. Over-provisioned Skeleton Section`을 추가했다.
- `references/EXAMPLE.md`는 현재 git 기준 untracked 파일이므로, 이후 커밋 시 새 파일 추가 대상으로 포함해야 한다.

**검증:**

- `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md .agents/skills/document-structure-review/references/EXAMPLE.md` → exit 0 (PASS).

## 2026-06-27 · broader-by-absorption 패치 @claude 리뷰 + Review Loop 트리거 보정

@claude가 Codex의 broader-by-absorption 적용본(Review Loop step4·Structure Smells·Rule Shape·Guideline Structure
Models·Authoring Guideline Improvement·Output Checklist 흡수 + EXAMPLE 9·10)을 파일 기준으로 리뷰했다. 판정: 흡수
품질 높음·신규 섹션 0·product/AGENTS 리뷰와 정합(product=invariant-only는 over-provisioned 회피, roadmap=section
contract는 실재·고위험이라 정당, taxonomy 불일치=no-change 후보). HIGH 없음.

**반영(LOW-MEDIUM 1건):**

- `SKILL.md` Review Loop step 4 트리거 확장 — "parent/ancestor 경계에서 반복되면" → "반복되거나 smell이 ancestor
  계약 자체에 위치하면". 근거: ancestor 내부 `contradiction`(예: taxonomy 자기모순)은 단일발생이라 반복 게이트에 안
  걸리던 under-trigger 해소 + Output Checklist의 "ancestor 자체가 결함일 가능성"(반복 조건 없음)과 정렬. 고신뢰
  신호라 "parent 쉽게 흔들기" 가드(단독 override 금지·증거기준↑·owner 절차)는 유지.

**LOW polish 2건(@user 지시로 반영):**

- (b) `SKILL.md` Guideline Structure Models "비용" 줄에 `(over-provisioned structure smell)` 명시 → smell↔비용규칙
  어휘 링크 선명화.
- (c) `EXAMPLE.md` 사례 10 smell tag에서 `hidden sub-kind` 제거(over-provisioning은 다중 subtype 충돌이 아님) →
  `over-provisioned structure` + `copied section meaning`만 유지.

**검증:** `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md .agents/skills/document-structure-review/references/EXAMPLE.md` → exit 0 (PASS, b·c 반영 직후 + LOW-MEDIUM 트리거 보정 포함).

**다음:** document-structure-review skill thread는 이 보정으로 마감. 다음 작업 = stage8 W5 마지막 child `guides/AGENTS.md`(다음 세션에 @user 초안 제공 시 검토 렌즈 ①–⑤로 진행).

## 2026-06-28 · document-structure-review 후속 개선 재개 — guideline 관계 일반화

- @user가 새 portable 관계 규칙 검토와 skill 개선을 이어가기 위해 이 로그를 `decided`에서 `open`으로 재개하도록 지시했다. 기존 stage8 W10 로그에 임시로 남긴 관련 기록은 이 블록으로 증류한 뒤 제거한다.
- 배경: architecture/spec child guideline의 단일 full skeleton이 dense catalog, sequence, invariant, mixed current/target 같은 실제 subtype에 부적합한 문제가 드러났다. 이 repo에서는 `docs/AGENTS.md`가 공통 construct 의미·placement·validation loop를, child AGENTS가 type identity·status vocabulary·subtype·section composition·type-specific validation을 소유하는 방향을 W10에서 검토 중이다.
- [Fact] 현행 `document-structure-review` skill에는 parent/ancestor review, sibling 비교, owner map, hidden sub-kind, index/slice, skeleton/invariant/decision-table/composition-block 모델이 이미 있으나, guideline 관계와 ownership 배치를 한곳에서 직접 판정하는 규칙은 없다.
- [Fact] 이 repo의 docs knowledge topology도 단일 parent/child 관계가 아니다. 질문별 sibling authority, spec↔architecture↔roadmap의 horizontal owner boundary, compatibility index→slice delegation, 같은 physical scope의 별도 sub-kind, decision snapshot→living owner 반영, intended docs↔actual code/test drift, compatibility pointer가 함께 존재한다.
- [Initial candidate, withdrawn] “관계를 정해진 taxonomy로 먼저 분류하고, 중첩 guideline이면 parent가 공통 규칙을, child가 type/subtype 구조를 소유한다”는 문구를 검토했으나 portable 후보로 철회했다. 적용 조건 뒤의 ownership 결과를 하나로 고정하는 must rule이며, 현재 repo의 taxonomy를 다른 프로젝트에 과적용할 수 있기 때문이다.
- [Current candidate: negative invariant] 물리적 nesting, 파일 경로, heading이나 같은 template만으로 conceptual ownership·inheritance를 추정하지 않는다.
- [Current candidate: decision heuristic] 현재 판단에 실제로 영향을 주는 scope, authority, dependency, lifecycle과 change coupling을 확인한다. 여러 문서에 동일하게 적용되고 함께 변경되는 규칙이면 shared/ancestor owner를 후보로 보고, type·subtype·lifecycle에 따라 의미가 달라지거나 예외가 늘면 local owner, explicit delegation, decision table 또는 composition을 후보로 비교한다. 프로젝트가 이미 inheritance, override나 precedence를 정의했다면 그 계약을 검토하며 portable skill이 특정 계층 배치를 강제하지 않는다.
- [Open question] 이 문제가 실제 skill gap인지, 기존 규칙의 조합으로 충분한지, 새 문구가 필요하다면 must invariant와 heuristic을 어떻게 나누고 어느 기존 section에 흡수할지 독립 검토가 필요하다. 닫힌 relation taxonomy 신설은 기본 후보가 아니다.
- @user는 Claude의 독립 의견을 함께 받아 개선 작업을 진행하기로 했다. Claude에게는 기존 결론을 전제로 수용하지 말고 skill·portable examples·이 repo의 실제 guideline을 대조하여 `no-change | 최소 보정 | 구조적 보정`, exact patch candidate와 regression scenario를 제시하되 아직 파일을 수정하지 말도록 요청할 예정이다.
- 다음 행동: Claude 리뷰를 이 로그에 append하고 Codex가 독립 재검토한다. 사용자 승인 뒤에만 `.agents/skills/document-structure-review/SKILL.md` 및 필요한 portable example을 수정·검증하고 결과를 기록한다.

## 2026-06-28 · Claude 독립 리뷰 수령 + Codex 재검토

- @user가 Claude의 독립 리뷰 전문을 공유했다. Claude는 파일을 수정하지 않고 `no-change | 최소 보정 | 구조적 보정`을 비교해 최소 보정을 권장했다.
- [Claude fact finding] 현행 skill은 parent/ancestor, sibling, owner map, child/slice, concept hierarchy, owner/altitude mismatch, hidden sub-kind, copied section meaning, reverse dependency와 기존 owner contract 우선 검토를 이미 분산 소유한다. “parent=공통/child=구체” 강제 문구는 실제 skill에 들어간 적이 없고 철회된 candidate일 뿐이다.
- [Claude gap finding] 물리적 nesting/path/shared template만으로 ownership·inheritance를 추정하지 말라는 통합 negative 원칙과 `change coupling` 신호는 직접 명시돼 있지 않다. 이 repo 논의에서 skill을 읽고도 nested→parent/common으로 과일반화한 사실은 discoverability gap의 실증으로 보았다.
- [Claude recommendation] 새 taxonomy나 section을 만들지 않고 `Owner And Scope` 첫 bullet 뒤에 negative invariant 1개를 추가한다. Placement 결과(shared/local/delegation/composition)를 다시 설명하면 기존 `Guideline Structure Models`, `Rule Shape`, `Owner And Scope`와 중복되므로 추가하지 않고, 신규 신호인 change coupling만 포함한다. EXAMPLE 추가는 선택 사항으로 보았다.
- [Codex agreement] gap을 discoverability 문제로 보고 최소 보정하는 판정, 닫힌 taxonomy·구조적 보정을 거부한 판정, `Owner And Scope` 배치, EXAMPLE no-change에 동의한다.
- [Codex correction 1] Claude patch의 “actual scope, authority, dependency, lifecycle과 change coupling으로 판단한다”는 모든 신호를 매번 확인하는 체크리스트로 읽힐 수 있다. 현행 `Context Read Path`의 “판단을 바꿀 관계만 읽고 근거가 확보되면 멈춘다”와 맞추어, 판단을 바꿀 수 있는 신호만 확인하도록 좁히는 편이 낫다.
- [Codex correction 2] Claude patch의 “프로젝트가 정의한 inheritance·override·precedence 계약이 있으면 그것을 우선한다”는 기존 `Review Loop`의 “parent/ancestor 계약은 기본 constraint이되 axiom은 아니다”와 긴장한다. 계약을 무조건 결론으로 따르기보다, 구조적 추정 대신 해당 명시 계약과 owner change 절차를 확인한다고 써야 한다.
- [Codex exact wording candidate, unapplied]:
  `- 물리적 nesting, 파일 경로나 공유 template만으로 ownership 또는 inheritance를 단정하지 않는다. 판단을 바꿀 수 있는 명시적 계약, 실제 적용 범위, authority, dependency, lifecycle과 change coupling만 확인한다.`
- [Open] 위 문구는 negative invariant가 결과 ownership을 강제하지 않으면서 change coupling을 도입하는 최소안이다. 다만 `change coupling`을 그대로 둘지 “함께 변경되는 범위”로 풀어 쓸지는 사용자 승인 전 최종 wording에서 선택한다.
- Claude가 언급한 stage8 W10의 관련 3개 블록은 이미 @user 지시에 따라 이 `docs-skill` 로그로 이동·증류됐고 원래 W10 로그에서는 삭제됐다. 이후 skill 개선 기록은 이 로그가 소유한다.
- Skill과 EXAMPLE은 아직 수정하지 않았다. 다음 행동은 사용자 wording 승인 후 최소 patch 적용과 inline-code/diff 검증이다.

## 2026-06-28 · 최소 보정 patch 적용 — ownership 추정 negative invariant

- @user가 "오케이 반영" 승인 + docs-skill 로그에만 기록 지시(stage8 작업 로그 미기록).
- [Fact] 적용 문구 = 직전 블록의 Codex exact wording candidate. Codex correction 1(매번 전체 신호 확인 체크리스트로 읽히는 것을 "판단을 바꿀 수 있는 신호만 확인"으로 축소)·2("…계약이 있으면 우선한다"의 과진술을 제거하고 명시 계약을 확인 대상으로 흡수)를 반영한 최소안이며, Claude 1차 초안 문구는 이 보정본으로 교체했다.
- [Analysis] Claude도 두 보정에 독립 동의했다: 보정 1은 `Context Read Path`의 "판단을 바꿀 관계만 확인하고 멈춘다" 미니멀리즘과, 보정 2는 `Review Loop`의 "parent/ancestor 계약은 constraint이되 axiom 아님"과 정합을 높인다. regression #3(override cascade) 가드는 "판단을 바꿀 수 있는 명시적 계약"이 그대로 포함하므로 손실 없음. `change coupling` 용어는 그대로 유지([Open] 해소).
- 반영 위치: `.agents/skills/document-structure-review/SKILL.md` `## Owner And Scope`, 첫 bullet("문서가 무엇을 소유하는지 먼저 쓴다") 바로 뒤. 새 section·닫힌 relation taxonomy 미신설(기존 섹션 흡수).
- 적용된 bullet:

```md
- 물리적 nesting, 파일 경로나 공유 template만으로 ownership 또는 inheritance를 단정하지
  않는다. 판단을 바꿀 수 있는 명시적 계약, 실제 적용 범위, authority, dependency, lifecycle과
  change coupling만 확인한다.
```

- `references/EXAMPLE.md` 무변경(Claude 권고 + Codex 동의 — placement 결과 재설명은 기존 `Guideline Structure Models`/`Rule Shape`/`Owner And Scope`와 중복).
- 검증: `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md` → exit 0 (PASS).
- working tree: `.agents/skills/document-structure-review/SKILL.md` uncommitted(커밋은 @user 지시 시).
- 다음: guideline-관계 일반화 thread는 이 patch로 마감 가능. closeout 여부는 @user 결정.

## 2026-06-28 · subtype-only disposition 추가 — W10 composition/subtype 결론 반영

- @user가 SKILL 전반 점검을 요청 → @claude가 현행 SKILL.md+EXAMPLE.md를 전수 점검(구조 결함·stale·overfit 없음 확인). 발견한 후보 3건 중 @user가 ①만 반영 지시(② composition blocks 모델 보강은 overfit 인접이라 보류, ③ ownership-inference/config-cascade example은 선택이라 미반영).
- [Fact] gap: W10 결론은 default section을 `required | optional | absorb | subtype-only | delete`로 판정하는데(onramp stage8 로그 `1095`,`1131`,`1277-1278`; `docs/AGENTS.md:60-61` 적용본), 현행 skill `Guideline Structure Models`의 default-section 후보 목록은 `delete, absorb, optional, invariant-only`만 있어 `subtype-only`가 누락돼 있었다.
- [Analysis] `subtype-only`(섹션을 특정 subtype에만 조건부 포함) ≠ `invariant-only`(섹션을 invariant로 접음). 전자는 `hidden sub-kind`·`composition blocks`와 직결되는 disposition으로, ownership을 강제하지 않는 disposition 추가라 overfit 위험 없이 W10 composition/subtype 결론을 portable하게 담는다. repo의 "상위=composition / 하위=subtype" 분담 자체를 portable 문구로 올리는 ②는 철회된 must-rule(`899`,`1440`) 프레이밍에 가까워 보류했다.
- 반영:
  - `SKILL.md` `Guideline Structure Models`: default section 후보 목록에 `subtype-only` 추가 → `delete, absorb, optional, subtype-only, invariant-only`.
  - `references/EXAMPLE.md` 사례 10(Over-provisioned Skeleton Section): 평가 후보 목록을 동일하게 정합(`delete, absorb, optional, subtype-only, invariant-only`).
- 검증: `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md .agents/skills/document-structure-review/references/EXAMPLE.md` → exit 0 (PASS).
- working tree: `SKILL.md`·`references/EXAMPLE.md` uncommitted(커밋은 @user 지시 시).
- 미반영 후보(향후): ② composition blocks 모델 nested-split 보강(보류), ③ EXAMPLE에 ownership-inference + config-cascade override 사례 추가(선택).

## 2026-06-28 · Architecture AGENTS 사례화 우려에서 document-structure-review 기준 확장

이 블록은 @user의 명시 요청에 따라, 아래 사용자 프롬프트부터 현재 지시까지의 논의를 축약하지 않고 보존한다. 일반 로그 작성 규칙은 대화 덤프를 피하지만, 이번 경우에는 `document-structure-review` skill의 판단 기준을 바꿀 수 있는 원문 피드백 자체가 검토 대상이므로 원문 보존을 우선한다.

## 왜 이 프롬프트가 나왔는가

직전 작업 흐름은 stage8 W10의 `docs/architecture/AGENTS.md` 정합이었다. 새 parent `docs/AGENTS.md`는 `Related:`, `Status:`, `Evidence:`, `Sources:`를 공통 skeleton이 아니라 조건부 composition block으로 정의했고, child AGENTS는 자기 type-specific identity, status vocabulary, subtype, section composition, validation만 소유해야 한다고 했다.

그 기준으로 architecture AGENTS를 처음 수정하면서 `Architecture Slice Skeleton` 안의 hard-coded `Related`, `Status: Current`, `Implementation Evidence`, `Sources`를 제거하고, `Responsibility`, `Flow`, `Drift / Gaps` 중심의 최소 authoring default와 조건부 `Evidence:`/`Sources:` 규칙을 남겼다.

그 뒤 @user는 architecture 문서 안에서 evidence 배치가 케이스마다 달라질 수 있음을 설명하기 위해 compact component, dense schema/catalog, end-to-end sequence, cross-cutting invariant, mixed current/target, index/hub, gap/absence, proposed architecture 같은 케이스를 제시했다. @codex는 이 제안을 “architecture document subtype 판정과 composition block 선택 규칙”으로 격상하는 방향으로 해석했고, `docs/architecture/AGENTS.md` §4를 `Architecture Subtypes And Composition`으로 바꾸는 패치를 적용했다.

이 보정이 바로 @user가 우려한 문제를 만들었다. 케이스 표를 지침 본문에 두면 agent가 “이 문서는 이 케이스니까 해당 케이스의 형식만 채우면 된다”고 오해할 수 있고, architecture 문서가 상위 docs 계약을 소비해 architecture 역할과 개별 문서 역할을 수행해야 한다는 본래 목적이 약해진다. 그래서 @user는 “처음 수정한거로 되돌려놔”라고 지시했고, subtype/composition 보정은 철회됐다.

이 배경 때문에 @user의 다음 프롬프트는 단순한 architecture AGENTS 문구 교정이 아니라, `document-structure-review` skill 자체가 문서를 볼 때 무엇을 기준으로 봐야 하는지에 대한 기준 확장으로 이어졌다. 핵심은 “사례/케이스를 나열하면 agent가 사례별 템플릿만 채우게 되므로, 먼저 사용자가 이 문서에 어떤 역할을 기대했는지, 그 근거가 무엇인지, root `AGENTS.md` → `docs/AGENTS.md` → 하위 `AGENTS.md` → 실제 문서 사례로 규칙이 어떻게 파생되는지 봐야 한다”는 것이다.

## 원문 기록 1 — @user의 첫 문제 제기

@user:

> 내가 말하고 싶은건 해당 아키텍처 문서에대해서 케이스 사례별로 나두면 그 해당 사례 케이스별로만 작성할거 아니냐? 
>
> 결국 아키텍처 문서는 상위 문서의 내용을 상속받아서 아키텍처의 역할과 문서의 역할을 할 수 있게끔 하는 문서 작성을 하도록 해야 하는거 아니냐?

@codex 응답:

> 맞습니다. 사용자가 말한 핵심이 정확합니다.
>
> 제가 두 번째로 넣었던 “케이스별 subtype 표”는 방향이 틀어질 위험이 있습니다. 그걸 넣으면 agent가 이렇게 오해할 수 있습니다.
>
> - “이 문서는 catalog 케이스니까 catalog 표만 맞추면 된다”
> - “sequence 케이스니까 sequence 근거만 채우면 된다”
> - “target architecture니까 Sources만 있으면 된다”
>
> 즉, architecture 문서가 해야 하는 본래 역할보다 “사례별 양식 맞추기”로 좁아집니다.
>
> 더 맞는 구조는 이겁니다.
>
> - 상위 `docs/AGENTS.md`가 문서 일반 계약을 소유함:
>   - owner boundary
>   - 최소 read path
>   - status 배치
>   - evidence/source 배치
>   - change/drift validation
>   - 빈 섹션 생략
>   - 가장 좁은 유효 범위 배치
>
> - `docs/architecture/AGENTS.md`는 그걸 “architecture 문서로 쓸 때 어떻게 해석하느냐”만 소유함:
>   - architecture는 내부 구조, 책임 경계, flow, lifecycle invariant를 설명한다
>   - spec/product/decision 내용을 복사하지 않는다
>   - `As-built` claim은 code/test로 검증한다
>   - `Target/Proposed`는 code가 다르다고 as-built로 낮추지 않는다
>   - architecture 문서 안의 section은 역할에 맞게 선택하고, 강제 skeleton으로 채우지 않는다
>
> 그러니까 architecture AGENTS의 바람직한 중심은 “케이스 목록”이 아니라 “상위 문서 계약의 architecture-specific specialization”입니다.
>
> 제가 지금 유지해둔 첫 수정안도 완벽하진 않습니다. `Architecture Slice Skeleton`이라는 제목과 `Responsibility / Flow / Drift` 예시가 아직 “compact component형 skeleton”처럼 보일 수 있습니다. 더 정확히 하려면 다음처럼 바꾸는 게 맞습니다.
>
> - `Architecture Slice Skeleton` → `Architecture Writing Contract` 또는 `Architecture Composition Rules`
> - fixed skeleton 예시는 줄이거나 제거
> - 대신 다음 원칙만 둠:
>   - architecture claim의 역할을 먼저 판정한다
>   - 상위 docs composition block을 architecture claim에 맞게 사용한다
>   - section은 문서 역할상 필요할 때만 둔다
>   - 사례는 규칙이 아니라 예시일 뿐이라고 명시한다
>
> 즉, 네 말대로 “케이스별 작성법”이 아니라 “상위 docs 계약을 상속받아 architecture 역할을 수행하게 하는 작성 계약”이어야 합니다.

## 원문 기록 2 — `Architecture Composition Rules` 명명 제안

@user:

> Architecture Composition Rules 이게 더 나을 거 같음 따라서 제안해봐

@codex 응답:

> 확인한 사실:
>
> - 상위 [docs/AGENTS.md](/Users/lunaxislu/Documents/ai-orchestration/docs/AGENTS.md)는 이미 `Related`, `Status`, `Evidence`, `Sources`를 “공통 skeleton”이 아니라 조건부 composition block으로 정의하고 있습니다.
> - 현재 [docs/architecture/AGENTS.md](/Users/lunaxislu/Documents/ai-orchestration/docs/architecture/AGENTS.md)는 §4 제목이 `Architecture Slice Skeleton`이라서, 여전히 “아키텍처 문서는 이 형태를 따라야 한다”로 읽힐 수 있습니다.
>
> 추론:
>
> - 네가 말한 방향이 맞습니다. architecture AGENTS는 케이스별 템플릿 모음이 아니라, 상위 docs 계약을 architecture 역할에 맞게 해석하는 문서여야 합니다.
> - 따라서 `Architecture Composition Rules`가 더 정확합니다. “skeleton”보다 덜 강제적이고, “상위 규칙을 architecture 문서에 어떻게 조합할지”를 설명합니다.
>
> 제안하는 §4 구조는 이렇습니다.
>
> ```md
> ## 4. Architecture Composition Rules
>
> Architecture 문서는 단일 full skeleton을 상속하지 않는다. 상위 [[docs/AGENTS]]의 structure,
> placement, status, evidence, sources 규칙을 따르되, architecture 문서가 소유하는 내부 구조,
> 책임 경계, flow, lifecycle invariant와 gap을 복원하는 데 필요한 block만 조합한다.
>
> 새 architecture 문서나 slice를 작성할 때는 먼저 이 문서가 설명하려는 architecture claim의
> 역할을 판정한다.
>
> - 내부 책임과 경계를 설명해야 하면 `Responsibility`나 이에 준하는 body section을 둔다.
> - process, data, lifecycle 순서가 판단의 핵심이면 `Flow`를 둔다.
> - 현재 구현 구조를 주장하면 `As-built` 또는 current behavior claim으로 보고 code/test evidence를
>   claim 가까이에 둔다.
> - 목표 구조나 제안 구조를 설명하면 `Target`/`Proposed`로 표시하고, code evidence를 붙이지 않는다.
>   필요한 경우 product/spec/decision owner나 provenance를 링크한다.
> - 문서와 code/tests 차이, known limitation, missing behavior를 설명해야 하면 `Drift / Gaps`를 둔다.
> - 과거 로그나 이전 owner 문서가 현재 판단, 재검토, 삭제 안전성에 필요할 때만 `Sources:`를 둔다.
>
> `Related:`, document-level `Status:`, `Evidence:` block, `Sources:` block은 architecture 전용
> 필드가 아니라 상위 [[docs/AGENTS]]의 조건부 composition block이다. 문서 전체에 적용될 때만
> document-level로 두고, section이나 claim에만 적용되면 해당 본문 가까이에 둔다.
>
> 인덱스(`local-agent-runtime.md`)는 body architecture를 새로 소유하지 않는다. Slice map, status
> vocabulary, module overview, authority links와 document map처럼 index가 직접 소유하는 claim만
> 유지하고, slice body claim의 evidence나 상세 flow를 index로 복사하지 않는다.
> ```
>
> 이게 지금 대화 기준으로 제일 맞습니다.
>
> - `Skeleton`이라는 오해를 제거함
> - 케이스별 표로 agent를 가두지 않음
> - 상위 `docs/AGENTS.md`를 상속/소비한다는 관계가 분명함
> - architecture의 고유 역할만 남김
> - `Evidence`뿐 아니라 `Flow`, `Status`, `Sources`, `Drift/Gaps`도 모두 조건부 composition으로 처리함
>
> 승인하면 이 방향으로 §4만 교체하는 게 좋습니다.

## 원문 기록 3 — doc skill 자체의 판단 기준 질문

@user:

> 오케이 결국 doc skill도 어떤 기준으로 봐야 할거 같냐?

@codex 응답:

> doc skill은 “좋은 문장/좋은 템플릿”을 보는 게 아니라, agent가 문서를 잘못 상속·복사·채우지 않게 만드는 구조 기준을 봐야 합니다.
>
> 내 기준으로는 6개입니다.
>
> 1. 상속이 아니라 소비 관계인지
>
> 하위 AGENTS가 상위 문서를 “복사”하거나 “재정의”하는 게 아니라, 상위 계약을 자기 문서 타입에 맞게 소비하고 있는지 봐야 합니다.
>
> 예:
>
> - 나쁨: architecture도 `Related/Status/Evidence/Sources`를 다시 정의함
> - 좋음: architecture에서는 상위 `docs/AGENTS`의 composition block을 architecture claim에 어떻게 적용하는지만 말함
>
> 2. 템플릿이 agent를 과잉 작성으로 몰고 가지 않는지
>
> skeleton/default section은 비용입니다. doc skill은 항상 물어야 합니다.
>
> - 이 section이 없으면 실제로 중요한 내용을 빠뜨리는가?
> - 이 section이 있으면 agent가 빈 내용, 억지 Flow, 억지 Evidence를 채우게 되는가?
> - skeleton보다 invariant나 composition rule이 더 작은 해결인가?
>
> 지금 architecture 건은 이 기준에 걸린 겁니다. `Architecture Slice Skeleton`은 agent에게 “이 모양으로 써라”는 압박을 줍니다. 그래서 `Architecture Composition Rules`가 더 낫습니다.
>
> 3. 문서 역할과 섹션 역할이 같은 층위인지
>
> doc skill은 heading이 만드는 개념 계층을 봐야 합니다.
>
> 예:
>
> - `Architecture Slice Skeleton`은 “slice에는 skeleton이 있다”는 구조를 만듦
> - `Architecture Composition Rules`는 “architecture 문서는 상위 block을 역할에 맞게 조합한다”는 구조를 만듦
>
> 후자가 실제 의도와 맞습니다.
>
> 4. 사례가 규칙을 대체하고 있지 않은지
>
> 사례 표, 예시 skeleton, golden document는 유용하지만 위험합니다. agent가 사례를 규칙으로 오해할 수 있습니다.
>
> doc skill은 이렇게 판단해야 합니다.
>
> - 사례가 decision aid인가?
> - 아니면 사실상 subtype template으로 굳어지는가?
> - 사례 없이도 원칙을 적용할 수 있는가?
> - 사례를 넣는다면 “예시일 뿐, 문서 역할을 먼저 판정한다”는 guard가 있는가?
>
> 5. owner boundary가 복원 가능한지
>
> 문서를 읽는 agent가 다음을 바로 알 수 있어야 합니다.
>
> - 이 문서가 소유하는 것
> - 상위 문서가 소유하는 것
> - sibling owner가 소유하는 것
> - code/tests가 사실 owner인 것
> - logs/plans가 provenance일 뿐인 것
>
> doc skill은 “이 문장이 어느 owner의 말인가?”를 계속 봐야 합니다.
>
> 6. 가장 작은 일반화인지
>
> 너무 구체적이면 사례별 템플릿이 되고, 너무 추상적이면 실행이 안 됩니다.
>
> 좋은 doc skill 판단은 이 중간입니다.
>
> - “architecture 문서는 Compact/Catalog/Sequence 중 하나다” → 너무 구체적
> - “필요한 섹션을 적절히 쓴다” → 너무 추상적
> - “상위 composition block을 architecture claim의 역할에 따라 가장 좁은 유효 범위에 둔다” → 적절함
>
> 정리하면 doc skill의 핵심 질문은 이겁니다.
>
> > 이 변경이 다음 agent에게 “무엇을 채워야 하는가”를 시키는가, 아니면 “어떤 역할을 판정해서 어디에 배치해야 하는가”를 복원하게 하는가?
>
> 이번 architecture 케이스에서는 후자가 맞고, 그래서 `Architecture Composition Rules`가 정확한 방향입니다.

## 원문 기록 4 — 사용자 의도·근거·계약 파생·사례 corpus를 봐야 한다는 추가 의견

@user:

> 여기에 내가 의견을 추가하고 싶은 건  결국 사용자가 어떤 문서 어떤 역할을 하게 하고 싶은가 그 근거가 있는가 ?, 그리고 repo/AGENTS.md 문서부터 어떻게 이 docs/AGENTS.md 하위 AGENTS.md까지 작성 되는지 추론하고agent들의 사례별도 봐야 하는거고  
>
> 이 문서의 역할과 무엇을 작성하는지에 대한 역할에 따라 문서 지침, 내용들도 봐야 하는거라 생각하는데

@codex 응답:

> 맞습니다. doc skill 기준에 그 축이 빠지면 문서 구조 리뷰가 너무 “형식 비평”으로 흐릅니다.
>
> 확인한 사실:
>
> - root `AGENTS.md`는 사용자 지시도 무조건 수용하지 말고, 확인한 사실/추론/의견을 구분하라고 합니다.
> - `docs/AGENTS.md`는 `docs/**/AGENTS.md`가 type-specific identity, status vocabulary, subtype, section composition, validation을 소유한다고 합니다.
> - 현재 `document-structure-review` skill에는 parent/ancestor 계약, owner map, sibling guideline 확인은 있지만, “사용자가 이 문서에 기대한 역할과 그 근거”를 독립 기준으로 강하게 보라는 문장은 약합니다.
>
> 추론:
>
> doc skill은 문서를 볼 때 다음 4단계를 기준으로 삼아야 합니다.
>
> 1. 사용자 의도와 근거
>
> 먼저 봐야 할 것:
>
> - 사용자가 이 문서를 어떤 역할로 쓰려고 했는가?
> - 그 의도가 어디에 남아 있는가? 대화, 로그, AGENTS, docs 계약, 실제 문서 corpus 중 어디인가?
> - 그 의도는 현재 repo 계약과 충돌하는가, 아니면 보강하는가?
>
> 단, 사용자 의도는 권위 입력이지 자동 정답은 아닙니다. root `AGENTS.md` 기준상 근거와 충돌 여부를 검증해야 합니다.
>
> 2. 계약 파생 경로
>
> 문서를 고립해서 보면 안 되고, 위에서 아래로 파생을 봐야 합니다.
>
> ```text
> repo/AGENTS.md
> → docs/AGENTS.md
> → docs/<owner>/AGENTS.md
> → 실제 owner 문서들
> ```
>
> 즉 doc skill은 “이 child AGENTS가 상위 계약을 어떻게 소비해서 자기 type의 역할로 특화하는가”를 봐야 합니다.
>
> 3. 실제 사례 corpus
>
> 규칙만 보면 추상적이고, 사례만 보면 템플릿화됩니다. 그래서 둘 다 봐야 합니다.
>
> - 실제 agent들이 어떻게 오해했는가?
> - 기존 문서들은 어떤 형태로 작성돼 있는가?
> - 어떤 section이 반복적으로 필요한가?
> - 어떤 section이 있으면 agent가 억지로 채우는가?
> - 어떤 예시는 규칙을 돕고, 어떤 예시는 규칙을 대체해버리는가?
>
> 4. 문서 역할과 작성 내용의 일치
>
> 마지막으로 봐야 하는 건 이겁니다.
>
> - 이 문서의 역할은 무엇인가?
> - 이 문서가 작성하게 하려는 내용은 무엇인가?
> - 현재 지침이 그 역할을 수행하게 하는가?
> - 아니면 특정 사례/형식/섹션을 채우게 만드는가?
>
> 그래서 doc skill에 추가한다면 기준은 이렇게 정리할 수 있습니다.
>
> > Before changing a guideline or skeleton, recover the intended role of the document from user intent, project contracts, logs, and representative corpus. Then trace how the rule should derive from root/project contracts through parent and child AGENTS. Do not treat examples as templates unless the document role requires a template.
>
> 한국어로는:
>
> > 지침이나 skeleton을 바꾸기 전에, 사용자가 그 문서에 기대한 역할과 그 근거를 먼저 복원한다. 그 다음 root/project 계약에서 parent AGENTS, child AGENTS, 실제 문서 corpus로 규칙이 어떻게 파생되어야 하는지 추론한다. 사례는 규칙을 검증하는 입력이지, 문서 역할상 필요한 경우가 아니면 템플릿으로 고정하지 않는다.
>
> 이 기준이 들어가야 지금 architecture 건 같은 문제를 더 잘 잡습니다.  
> 즉 “Architecture 문서에는 어떤 케이스들이 있는가?”보다 먼저 “사용자는 Architecture AGENTS가 상위 docs 계약을 받아서 어떤 역할을 하게 만들고 싶은가?”를 보게 됩니다.

## 원문 기록 5 — 현재 기록 요청

@user:

> docs-skill log 를 open으로 열고 
>
>
> › 내가 말하고 싶은건 해당 아키텍처 문서에대해서 케이스 사례별로 나두면 그 해당 사례 케이스별로만 작성할거 아니냐?
>
>   결국 아키텍처 문서는 상위 문서의 내용을 상속받아서 아키텍처의 역할과 문서의 역할을 할 수 있게끔 하는 문서 작성을 하도록 해야 하
>   는거 아니냐?
>
> 라는 내 프롬프트 부터 해서 현재까지 내용을 로그로 축약하지 말고 기록해놔 
>
> 기록 할 때 왜 내 프롬프트에서 저런 말이 나왔는지도 작성해야 할것이야

## 현재까지의 결정 후보 / skill 반영 후보

이 대화는 `document-structure-review` skill의 기준 보강 후보를 만든다. 아직 skill 본문에는 반영하지 않았다.

반영 후보:

1. `Review Loop` 또는 `Context Read Path` 앞단에 “Intended Role Recovery”를 추가한다.
   - 사용자가 어떤 문서를 어떤 역할로 쓰게 하려는지 먼저 복원한다.
   - 그 근거가 user prompt, project/root AGENTS, parent/child AGENTS, logs, representative corpus 중 어디에 있는지 구분한다.
   - 사용자 의도는 중요한 입력이지만 자동 정답이 아니며, repo 계약과 충돌하면 fact/inference/proposal로 나눠 보고한다.
2. `Context Read Path`에 root/project contract → parent AGENTS → child AGENTS → actual corpus 파생 경로를 명시한다.
   - 단 repo 전체 sweep이 기본값은 아니다. 현재 판단을 바꾸는 범위까지만 읽는다.
3. `Guideline Structure Models` 또는 `Comparative Guideline Review`에 “examples are test cases, not templates by default” guard를 추가한다.
   - 사례는 규칙을 검증하고 오해를 드러내는 입력이다.
   - 문서 역할상 template이 필요한 경우에만 사례를 template으로 승격한다.
4. Output Checklist에 다음 질문을 추가한다.
   - “사용자가 이 문서에 기대한 역할과 그 근거를 확인했는가?”
   - “규칙이 root/project → parent → child → corpus로 어떻게 파생되는지 설명 가능한가?”
   - “사례를 template으로 고정하지 않고, 역할 판정과 composition 판단을 돕는 입력으로 사용했는가?”

## 현재 상태

- `logs/docs-system/2026-06-25-docs-skill.md`는 이 블록 작성 전부터 `status: open`이었다.
- 이 블록은 docs-skill/document-structure-review 기준 개선 논의의 입력으로 남긴다.
- 실제 `.agents/skills/document-structure-review/SKILL.md` 수정은 아직 하지 않았다.

## 2026-06-28 · document-structure-review intended-role 기준 반영

- @user가 직전 블록의 docs-skill 반영 후보를 실제 skill에 반영하라고 지시했다.
- 반영 대상: `.agents/skills/document-structure-review/SKILL.md`.

### 반영

- `## Intended Role Recovery` 섹션을 추가했다.
  - 지침, skeleton, template, owner 문서를 바꾸기 전에 사용자가 그 문서에 기대한 역할과 그 근거를 먼저 복원하도록 했다.
  - 근거 위치를 user prompt, project/root contract, parent/child guideline, log, 실제 문서 corpus로 구분하게 했다.
  - 사용자 의도는 중요한 입력이지만 자동 정답이 아니며, project contract·owner boundary·actual corpus와 충돌하면 fact/inference/proposal로 나눠 보고하도록 했다.
  - 사례와 corpus는 규칙 검증과 오해 탐지 입력이며, 문서 역할상 template이 필요한 경우가 아니면 template으로 고정하지 않도록 했다.
- `Review Loop` 앞단을 조정했다.
  - 문제 문장/섹션/규칙/예시 식별 후 intended role과 근거를 먼저 복원한다.
  - project/root contract → parent guideline → child guideline → actual corpus 파생 관계를 확인한다.
- `Context Read Path`를 보강했다.
  - guideline 계층이 있으면 project/root contract → parent guideline → child guideline → actual corpus 순서로 따라가되, 판단을 바꿀 수 있는 범위까지만 읽도록 했다.
  - representative corpus나 과거 agent 사례는 적용 가능성과 오해 가능성을 확인할 때만 읽고, 사례가 많다는 이유만으로 사례별 template을 만들지 않도록 했다.
- `Guideline Structure Models`와 `Comparative Guideline Review`를 보강했다.
  - 사례, subtype 표, golden document는 규칙을 검증하는 입력이지 기본 template이 아니라고 명시했다.
  - 사례 비교 시 사례별 형식을 따라 쓰게 만드는지, 문서 역할을 판정해 필요한 block을 조합하게 만드는지 구분하도록 했다.
- `Output Checklist`를 보강했다.
  - 사용자가 문서에 기대한 역할과 근거 확인 여부.
  - project/root contract → parent guideline → child guideline → actual corpus 파생 설명 가능 여부.
  - 사례를 template으로 고정하지 않고 역할 판정과 composition 판단 입력으로 사용했는지 여부.

### 검증

- `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md` → exit 0 (PASS).
- `git diff --check -- .agents/skills/document-structure-review/SKILL.md` → exit 0 (PASS).

### 상태

- 직전 블록의 반영 후보는 `.agents/skills/document-structure-review/SKILL.md`에 반영됐다.
- 이 로그는 docs-skill/document-structure-review 설계·개선 흐름의 open 로그로 유지한다.

## 2026-06-28 · intended-role 반영분 중복 정리 — single owner 확정 (최소 보정)

- @user 지시: 직전 블록의 intended-role 반영을 @claude가 SKILL 자기 기준으로 재검토했고, 거기서 제기한 중복 분산 문제를 최소 보정으로 반영하고 반영 이유와 로그를 남겨라.
- [Fact] ⑦ intended-role 반영은 세 메시지를 분산 주입했다.
  - "사례≠template": `Intended Role Recovery`·`Context Read Path`·`Guideline Structure Models`·`Comparative Guideline Review` 본문 4곳 + `Output Checklist` 1곳 + 기존 `Wording Rules`의 예시 일반 원칙.
  - "계약 파생 경로(project/root → parent → child → corpus)": `Review Loop`·`Context Read Path`·`Output Checklist` 3곳.
  - "intended role 복원": `Intended Role Recovery`·`Review Loop`·`Output Checklist` 3곳.
- [Analysis] SKILL이 가르치는 기준을 SKILL 자신이 위반한 사례다. `Structure Smells`의 `duplicated ownership`, `Authoring Guideline Improvement`의 "같은 규칙을 여러 문서에서 재정의하지 않는다", `Wording Rules`의 "이미 말한 내용을 별도 해설로 반복하지 않는다"에 걸린다. 단 `Output Checklist`의 재등장은 본문 규칙을 질문으로 되묻는 checklist 고유 역할이라 중복이 아니다(by-design, 유지).
- [Decision] no-change / 최소 / 구조적 중 **최소 보정**. gap 자체는 ⑦이 이미 메웠고 남은 작업은 single owner 확정 + 중복 제거뿐이라 구조적 재편은 불필요.
- 반영(`.agents/skills/document-structure-review/SKILL.md`):
  - "사례≠template" single owner = `Guideline Structure Models`(template 승격 판단의 owner).
    - `Intended Role Recovery` 마지막 bullet: 승격 조건문을 제거하고 "사례·corpus는 검증 입력이지 따라 쓸 template이 아니다" + owner 위임 pointer로 축소.
    - `Context Read Path`: "사례가 많다고 사례별 template 만들지 마라" 문장 제거(corpus를 언제 읽는지만 남김).
    - `Comparative Guideline Review`: "사례 비교 시 형식 복사 vs block 조합 구분" bullet 제거. 같은 섹션의 "heading 같다고 section meaning 복사 금지" + `Guideline Structure Models`의 composition blocks가 이미 owner.
    - `Wording Rules`의 예시 일반 원칙과 `Output Checklist` 질문형은 역할이 달라 유지.
  - `Review Loop` 1–2단계(intended role 복원 + 파생 경로)를 1단계로 합치고, 복원 방법은 `Intended Role Recovery`·`Context Read Path`를 따르도록 진입점 pointer로 대체 → 9단계에서 8단계로. 절차가 원칙 섹션을 호출하는 형태로 정리(`Owner And Scope`의 "세부 절차 반복 말고 어디가 소유하는지만 남긴다"와 정합).
- [Fact] 검증 ledger:
  - `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md` → exit 0 (PASS).
  - `git diff --check -- .agents/skills/document-structure-review/SKILL.md` → exit 0 (PASS).
- [관찰/미반영] 파생 경로의 `Review Loop`↔`Context Read Path` 잔여 언급은 절차 시점과 read-범위 시점이 달라 허용 범위로 두었다. `references/EXAMPLE.md`는 이번 정리 대상이 아니라 무변경.
- working tree: `SKILL.md` uncommitted(커밋은 @user 지시 시). 이 로그는 open 유지.

## 2026-06-29 · Information Format + Skeleton/Example risk 반영

@user가 Gemini 조사 보고서
`/Users/lunaxislu/.gemini/antigravity-cli/brain/3ddfe919-0bc8-4ada-836e-7d16a29074fe/information_format_selection_research.md`와
Claude 정리안을 전달했고, `document-structure-review` skill에 portable한 정보 표현 형식 기준을 추가하라고 지시했다.
후속으로 skeleton/example이 문서 내용을 왜곡하는 risk도 함께 반영할 필요를 제기했다.

### 확인한 사실

- Gemini 보고서는 현재 repo `docs/AGENTS.md`의 표현 형태 선택 기준과 외부 docs style guide 공통 원칙을 구분해,
  SKILL.md에는 portable 기준만 넣고 Obsidian callout 문법, wikilink, file:line, repo validation script 같은 환경 결합
  규칙은 넣지 말라고 정리했다.
- 현재 `.agents/skills/document-structure-review/SKILL.md`에는 `Rule Shape`와 `Guideline Structure Models`가 있었지만,
  정보 단위가 table/list/prose/code/callout 중 어떤 표현 형태를 택해야 하는지, 잘못된 형식 선택이 만드는 문제,
  LLM/agent format 오류 패턴은 별도 규칙으로 없었다.
- 기존 `Guideline Structure Models`는 skeleton 비용과 golden document를 다루지만, skeleton/example이 불필요한 claim을
  유도하는 content risk는 독립적으로 드러나 있지 않았다.

### 반영

- `## Information Format` 섹션을 `Rule Shape` 뒤, `Guideline Structure Models` 앞에 추가했다.
  - table, bullet list, numbered list, prose paragraph, definition style, code block/fenced example, callout/highlighted note의
    사용 기준과 피해야 할 경우를 portable하게 정리했다.
  - code block은 command/output/example/template/evidence를 구분하되, evidence의 구체 형식은 프로젝트 규칙을 따른다고
    낮췄다.
  - Obsidian callout 문법, wikilink, file:line 같은 repo-specific 표기는 넣지 않았다.
  - 잘못된 형태 선택이 만드는 문제와 LLM/agent가 자주 하는 format 오류를 추가했다.
- `## Skeleton And Example Risk` 섹션을 `Guideline Structure Models` 뒤에 추가했다.
  - skeleton은 누락 위험이 큰 반복 문서에만 쓰고, optional section 생략 조건을 함께 쓰도록 했다.
  - skeleton heading이 미래 내용, 낮은 빈도 예외, 다른 owner 내용을 유도하지 않도록 했다.
  - example은 규칙을 대신하지 않으며, incidental detail이 template처럼 복사될 위험을 막도록 했다.
  - golden document는 기본 template이 아니라 어떤 품질을 보여주는 예시인지 설명할 수 있을 때만 쓰도록 했다.
- `Output Checklist`에 information format과 skeleton/example risk 점검 항목을 추가했다.

### 검증

- `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md` → exit 0 (PASS).
- `git diff --check -- .agents/skills/document-structure-review/SKILL.md` → exit 0 (PASS).
- `/Users/lunaxislu/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/document-structure-review` 직접 실행 →
  permission denied(실행 비트 없음).
- `python3 /Users/lunaxislu/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/document-structure-review` →
  `ModuleNotFoundError: No module named 'yaml'`. PyYAML 누락으로 skill validator는 완료하지 못했다.

### 상태

- `.agents/skills/document-structure-review/SKILL.md` 반영 완료, uncommitted.
- 이 로그는 docs-skill/document-structure-review 설계·개선 흐름의 open 로그로 유지한다.

## 2026-06-29 · docs/AGENTS.md 중복 허용 확인 + 대표 smell 보강

@user가 `docs/AGENTS.md` 변경 사항을 확인하라고 요청했고, skill과 중복되는 내용은 사용자가 허락한 중복이라고 명시했다.

### 확인한 사실

- `docs/AGENTS.md`에는 SKILL.md와 겹치는 section placement, structure smell, writing style, information format 기준이
  추가돼 있었다.
- 겹치는 내용은 다음 성격으로 분리된다.
  - SKILL.md: portable 판단 기준.
  - `docs/AGENTS.md`: repo docs 작성 계약과 agent가 멈추고 보고해야 하는 local gate.
- `docs/AGENTS.md`의 `Structure Smells` 목록은 SKILL.md 전체 taxonomy의 subset이라, 전체 smell 목록처럼 읽힐 수 있는
  여지가 있었다.

### 반영

- `Composition Fit Check`의 "아래 신호"를 "아래 대표 신호"로 보강했다.
- `Structure Smells`의 "아래 이름"을 "아래 대표 이름"으로 보강했다.

### 검증

- `scripts/check-markdown-inline-code docs/AGENTS.md` → exit 0 (PASS).
- `git diff --check -- docs/AGENTS.md` → exit 0 (PASS).

### 상태

- `docs/AGENTS.md`와 SKILL.md의 중복은 허용된 중복으로 유지한다.
- 이 보강은 smell subset을 exhaustive taxonomy로 오해하지 않게 하는 범위 표시이며, owner 구조나 규칙 의미를 바꾸지 않는다.

## 2026-06-29 · Information Format/Skeleton risk 중복 리뷰 수용

@user가 Claude 리뷰를 전달했고, 리뷰는 `Information Format` 내부 중복과 `Skeleton And Example Risk` 섹션의 기존
섹션 중복을 지적했다. @user 지시로 리뷰를 반영했다.

### 확인한 사실

- `Skeleton And Example Risk`의 다수 항목은 이미 `Guideline Structure Models`, `Structure Smells`,
  `Wording Rules`, `Comparative Guideline Review`가 소유하고 있었다.
- 실제 신규에 가까운 기준은 skeleton/template/example을 본 agent가 불필요한 section이나 claim을 추가할 수 있으므로,
  그 오해를 생략 조건이나 negative rule로 막아야 한다는 점이었다.
- `Information Format`의 "잘못된 형태 선택이 만드는 문제"와 "LLM/agent가 자주 하는 format 오류"는 bullet/list,
  callout, code block 항목에서 같은 내용을 관점만 바꿔 반복했다.

### 반영

- `## Skeleton And Example Risk` 섹션을 삭제했다.
- 신규 risk 기준은 `Guideline Structure Models`에 한 bullet로 흡수했다:
  skeleton, template이나 example을 본 agent가 어떤 불필요한 section이나 claim을 추가할지 예상하고,
  optional 생략 조건이나 negative rule로 오해를 막는다.
- `Information Format`의 중복 하위목록 2개를 `잘못된 형태 선택과 agent 오류` 하나로 병합했다.
- 중복된 agent 오류 항목은 삭제하고, 별도 가치가 있는 `term — explanation` 반복과 단일 numbered list 오류만 남겼다.
- `Output Checklist`의 skeleton/example 항목은 축약 유지하고, golden document 항목은 기존 checklist/본문과 중복이라 제거했다.

### 검증

- `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md` → exit 0 (PASS).
- `git diff --check -- .agents/skills/document-structure-review/SKILL.md` → exit 0 (PASS).

### 상태

- Claude 리뷰의 핵심 finding A/B는 반영 완료.
- `Information Format`은 유지하되 내부 반복을 줄였고, skeleton/example risk는 별도 섹션이 아니라 기존 구조 모델 기준으로 흡수했다.

## 2026-06-29 · document-structure-review 후속 개선 — Information Format 1급 승격·cross-document 정합·근간 명시

@user가 Codex의 Finding A/B 반영(직전 블록) 이후 @claude에게 추가 리뷰와 설계를 요청했고,
여러 라운드 토론으로 아래를 확정·반영했다. 모든 반영 대상은 owner 문서
`.agents/skills/document-structure-review/SKILL.md`와 `references/EXAMPLE.md`다.
(`.claude/skills/document-structure-review`는 `.agents/...`로의 디렉토리 symlink라 한쪽 편집이 양쪽에 반영된다.)

### 결정과 반영

- Information Format 1급 승격(@user 확정): orphan이던 `Information Format`을 정체성 선언부에 연결.
  description에 `information format selection` 추가, 도입부 목표·`Scope/Non-Goals`에 "표현 형태" 추가,
  `Review Loop` step 2 개념역할 목록에 `information format` 추가, step 8을 "표현 형태 선택"으로 신설하고
  기존 wording 단계를 step 9로 밀어 구조→표현→wording 순서를 명시.
- Skeleton 처리 = Codex 흡수 유지(@claude 판단, @user 위임): 응집 전용 섹션·references 분리는 reject.
  근거 — skeleton harness는 `Guideline Structure Models`가 이미 응집 소유, log skill 관례가 "한 주제 한 owner",
  별도 `Skeleton And Example Risk` 섹션은 그 위 3중 중복이었다.
- scope-outgrows 재구조화(@user 제기, 기존 부재): 새 내용이 문서 정체성/scope를 초과할 때
  위임·scope 확장·분리·상위 승격을 새 내용·기존 내용의 관계와 재발 빈도로 가르는 결정을
  `Owner And Scope`에 추가. `EXAMPLE.md` #11(New Content Outgrows Document Scope)과 Output Checklist 점검 동반.
- 짧음 vs 응집 균형(@user 제기): `Wording Rules`에 "짧음은 복원가능성·응집(관계·흐름 보존)을 해치지 않는
  선까지의 목표"를 추가해 `Information Format` 도입부의 복원가능성 상한과 짝지음.
- golden document checklist(@user 재확인): 별도 줄 복원 대신 Output Checklist 항목을
  "example이나 golden document"로 일반화. positive 점검("무엇을 보여주는 예시인지")은 본문
  `Guideline Structure Models`가 이미 소유하므로 별도 복원 불필요로 판단.
- 변경 전파/identity 정합(@user 제기): 한 문서 변경이 상위 owner map의 이 문서 identity, inbound 참조,
  sibling cross-reference·대칭을 stale하게 만드는지 확인하고 함께 갱신/승격하는 규칙을 `Owner And Scope`에 추가.
  scope-outgrows의 "inbound 참조" 문구는 이 규칙으로 위임해 중복 제거. Output Checklist 점검 동반.
- content admission + 사용자 확인(@user 제기): content 포함 경계가 user prompt·계약·owner map·corpus로
  복원되지 않으면 추측하지 말고 사용자에게 확인하는 규칙을 `Intended Role Recovery`에 추가.
  @user 확인 — "단계마다 작업 확인"이 아니라 skill 규칙으로 명시하는 것이 맞다. Output Checklist 점검 동반.
- 권위 게이트(@user 재지적, @claude 판단 정정): @claude의 이전 "Q1 안전장치 충분, 추가 안 함" 판단을 철회.
  원칙(기본 constraint)은 있었으나 실행 게이트가 없었다. `Review Loop` step 4에 양방향 게이트 추가 —
  상위·sibling이 참·권위로 확정된 경우 하위 변경의 정합을 검증하고, 충돌 시 하위 제안 수정·기각 또는
  증거와 함께 상위 변경(`both`·`ancestor-only`) 승격. Output Checklist 점검 동반.
- 근간 명시(@user 제기): skill의 근간 = 문서 identity(자신·상위·sibling이 정의하는 역할) 기준 +
  lifecycle(생성·삭제·추가·갱신)마다 역할 정합 검토. 그동안 흩어져 채운 규칙들의 공통 "왜"가
  본문에 없던 hidden authority였다. 도입부에 근간 선언을 추가하고 "아래 규칙들은 이 근간을 상황별로
  실행하는 도구다"로 개별 규칙을 묶음.

### 검증

- 각 편집 후 `scripts/check-markdown-inline-code <대상>` → exit 0 (PASS), `git diff --check -- <대상>` → exit 0 (PASS).
  대상은 SKILL.md와 EXAMPLE.md.
- skill validator `quick_validate.py`는 PyYAML 누락(`ModuleNotFoundError: No module named 'yaml'`)으로 미실행.
  환경 문제이며 SKILL 내용 문제가 아니다(직전 블록과 동일 상태).

### 상태

- SKILL.md와 EXAMPLE.md 반영 완료, uncommitted (커밋은 @user 지시 시).
- 이 로그는 open 유지 — 설계 흐름이 이어질 수 있고 커밋이 남았다.

## 2026-06-29 · identity 근간 기준 구조 리뷰

@user가 도입부의 "문서 identity를 근간으로 lifecycle 변경마다 관련 문서의 역할 의미를
재검증한다"는 선언을 기준으로 현행 `document-structure-review` skill을 다시 검토해 달라고
요청했다. 이번 턴은 리뷰만 수행했고 skill 본문은 수정하지 않았다.

### 확인한 사실

- identity 근간은 도입부뿐 아니라 `Intended Role Recovery`, `Review Loop`, `Context Read Path`,
  `Owner And Scope`, `Output Checklist`에 실행 규칙으로 연결돼 있다.
- portable 판단 절차라는 자기 정의와 log/Obsidian/JSON Canvas sibling skill의 역할 경계는
  충돌하지 않는다. `Information Format`도 description·Scope·Review Loop에 연결돼 orphan
  responsibility는 아니다.
- 상위 skill 작성 지침은 core workflow를 간결하게 두고, 긴 세부 기준과 사례는 progressive
  disclosure reference로 분리하라고 한다. 현행 SKILL.md는 361줄, Output Checklist는 45줄이며,
  `references/EXAMPLE.md`는 304줄이다.

### 리뷰 findings

1. **Output Checklist가 상황별 도구라는 identity를 전수 compliance checklist로 바꿀 위험이 있다.**
   `Context Read Path`는 판단을 바꿀 관계만 읽고 근거가 확보되면 멈추라고 하지만, checklist는
   project/root → parent → child → corpus 파생과 sibling/child 상호작용, format별 세부 점검을
   조건 없이 모두 묻는다. core identity invariants와 조건부 점검을 분리하거나, 세부 점검을
   관련 섹션/reference로 위임하는 편이 자기 원칙과 맞다.
2. **`Owner And Scope`의 "문서가 무엇을 소유하는지 먼저 쓴다"는 검토 행위와 본문 작성 명령이
   섞여 있다.** 모든 문서가 ownership 선언을 본문에 가져야 한다는 뜻으로 읽히면 대상 문서의
   identity와 무관한 boilerplate를 유도한다. "검토 시 먼저 판정한다"와 "본문에는 역할상 경계
   선언이 필요할 때만 드러낸다"를 구분해야 한다.
3. **근간 선언의 lifecycle 열거가 실제 identity 변경 표면보다 좁다.** 생성·삭제·내용
   추가·갱신만 명시해 이동·rename·split·merge·status/role 변경이 도입부 기준에서 빠져 있다.
   후속 섹션이 일부를 다루지만, 근간 문장은 존재·위치·경계·상태·내용을 바꾸는 변경 전체를
   포괄하는 편이 안정적이다.
4. **`Intended Role Recovery`의 적용 대상이 skill trigger보다 좁게 적혀 있다.** metadata와
   도입부는 durable document 전반의 작성·검토를 포함하지만 이 절은 지침·skeleton·template·
   owner 문서를 바꾸기 전으로 시작한다. 일반 진입문은 "검토 대상 문서를 바꾸기 전에"로 두고,
   template/guideline 전용 판단은 뒤의 전용 섹션이 소유하는 편이 역할 정합성이 높다.
5. **reference 탐색성은 비blocking gap이다.** 304줄의 `references/EXAMPLE.md`에 목차가 없어,
   긴 reference에는 scope를 빠르게 볼 수 있는 목차를 두라는 상위 skill 작성 지침과 어긋난다.

### 현재 판단

- identity-first 방향 자체는 타당하고 이미 skill 전반에 실질적으로 반영돼 있다.
- 우선순위는 새 identity 규칙 추가가 아니라, 그 근간과 충돌하는 절대형 문장과 전수 checklist를
  줄이는 것이다.
- 권장 변경 순서는 Output Checklist 조건부화/축약 → owner 판정과 본문 표기의 분리 → lifecycle
  문장 일반화 → Intended Role Recovery 진입 범위 정합 → EXAMPLE 목차다.
- 실제 SKILL.md/EXAMPLE.md 수정은 사용자 승인 뒤 수행한다.

## 2026-06-29 · identity 기준 축약 risk 판단

@user가 앞선 리뷰에서 권고한 축약의 위험을 질문했다. 이번 판단은 skill 본문을 수정하지 않고,
축약 설계 시 보존해야 할 조건을 정리한 것이다.

### 판단

- 가장 큰 위험은 세부 규칙의 수가 줄어드는 것 자체가 아니라, identity를 실제 변경 판단으로
  변환하는 gate까지 함께 사라지는 것이다.
- 특히 변경 전파, 권위 충돌, 파괴적 변경의 비파괴 fallback, content 포함 경계의 사용자 확인은
  낮은 빈도여도 실패 비용이 커서 core 또는 명시적 조건부 gate로 남겨야 한다.
- 반대로 현행 Output Checklist를 그대로 두면 상황별 도구가 전수 compliance 절차로 읽혀
  excessive read path와 불필요한 boilerplate를 유도할 수 있다.
- 따라서 적절한 축약 형태는 항목 삭제 중심이 아니라 계층화다: identity·owner·영향 범위·근거를
  core gate로 유지하고, destructive change, guideline/template, information format 같은 상세
  검사는 해당 조건에서만 관련 본문 절로 라우팅한다.

### 주요 risk

- 낮은 빈도의 고위험 사례가 보이지 않아 삭제·대체·status 변경을 일반 편집처럼 처리할 수 있다.
- `local-only` 수정으로 오판해 parent owner map, inbound reference, sibling 대칭을 stale하게 둘 수 있다.
- owner/scope 판단과 본문 표기 조건을 너무 줄이면 경계 선언이 필요한 문서와 불필요한 boilerplate를
  구분하지 못할 수 있다.
- 사실·추론·제안 구분이나 사용자 확인 gate가 요약문에 암묵화되면 agent별 해석 편차가 커질 수 있다.
- detail을 reference로 옮기면서 trigger 문장을 남기지 않으면 progressive disclosure가 아니라
  사실상 규칙 유실이 된다.

### 축약 안전 조건

- core checklist에는 문서 identity, owner/scope, 관련 문서 영향, 근거와 불확실성, 가장 짧은 충분한
  표현을 남긴다.
- 고위험·특수 검사는 조건과 이동할 절을 한 줄로 명시한다.
- 삭제 전후에 대표 시나리오로 누락 여부를 검증한다: 일반 내용 추가, scope 초과 내용,
  parent/sibling 정합 변경, 삭제·status 전환.
- 같은 판단을 본문과 checklist가 반복하면 checklist는 상세 규칙을 재서술하지 않고 해당 절로
  라우팅한다.

## 2026-06-29 · identity-first skill 작성 구조 제안

@user가 축약 risk를 통제하면서 skill을 어떻게 작성할지 질문했다. 이번 블록은 구현 전 설계
제안이며, owner 문서는 아직 수정하지 않았다.

### 제안

- `SKILL.md`는 identity 기반 판단 엔진을 소유한다. 도입부의 identity 근간, core invariants,
  짧은 review workflow, 고위험 gate, output contract와 reference routing만 둔다.
- core workflow는 role/evidence 복원 → 변경 표면 분류 → 판단을 바꿀 관계만 읽기 → owner와
  변경 위치 결정(`local-only`, `ancestor-only`, `both`, `no-change`) → 최소 정합 변경과 관련
  문서 전파 → 사실·추론·제안 구분 및 검증 순서로 구성한다.
- 항상 적용할 core gate는 identity 유효성, owner/scope, 관련 문서 영향, 근거·불확실성,
  최소 충분 표현이다. content 포함 경계를 복원할 수 없을 때의 사용자 확인과 파괴적 변경의
  비파괴 fallback은 실패 비용이 높으므로 core에 유지한다.
- 현행 Output Checklist는 5-6개 completion gate로 줄이고, 세부 규칙을 반복하지 않는다.
- `Concept Placement`·`Structure Smells`의 상세 taxonomy는 구조 문제가 애매할 때 읽는
  `references/review-patterns.md` 후보로, `Information Format`·`Rule Shape`·guideline/template
  모델의 상세 기준은 해당 작업에서 읽는 `references/authoring-patterns.md` 후보로 분리한다.
  `references/EXAMPLE.md`는 사례가 필요할 때만 읽고 100줄 이상 reference 지침에 따라 목차를 둔다.
- 모든 reference는 `SKILL.md`에서 직접 연결하고, 조건과 읽을 목적을 한 줄로 명시한다. reference
  간 중첩 routing은 만들지 않는다.

### 권장 SKILL.md 상위 구조

1. identity와 scope
2. core invariants
3. review workflow
4. conditional gates
5. reference routing
6. output contract

### 검증 기준

- 일반 내용 추가, scope 초과 내용, parent/sibling 정합 변경, 삭제·status 전환의 네 시나리오에서
  core만으로 최초 판단과 필요한 reference 선택이 가능한지 forward-test한다.
- 축약 후에도 관련 문서 변경 누락, 과도한 read path, owner boilerplate, 고위험 변경의 무조건 실행이
  발생하지 않아야 한다.

## 2026-06-29 · 최소 충분 표현의 판정 기준 보완

@user가 앞선 설계의 "가장 짧은 충분한 표현"은 충분성 기준 없이 쓸 수 없다고 지적했다.

### 확인과 정정

- 현행 `Wording Rules`에는 복원가능성, 관계·흐름 보존, 근거·맥락을 잃지 말라는 방향이 있지만,
  무엇을 복원할 수 있어야 하는지 판정 항목이 명시되지 않아 독립 실행 기준으로는 약하다.
- "가장 짧음"은 core completeness 기준이 아니라, completeness를 통과한 표현 후보 사이의
  최적화 원칙으로 내려야 한다.

### 제안 기준

- 표현은 최소한 적용 대상·조건, 판단 기준, 요구 행동 또는 결과를 복원할 수 있어야 한다.
- owner·authority 충돌이 판단을 바꾸는 경우에는 권위와 위임 관계를 남긴다.
- 예외·불확실성·실패 비용이 판단을 바꾸는 경우에는 예외 조건과 fallback을 남긴다.
- parent/sibling 관계가 문서 identity나 변경 범위를 바꾸는 경우에는 그 관계와 전파 범위를 남긴다.
- 어떤 요소를 제거했을 때 합리적인 agent가 다른 대상, 판단, 행동 또는 변경 범위를 선택할 수
  있다면 그 표현은 충분하지 않다. 제거해도 판정이 같다면 중복 후보로 본다.

권장 문구는 "판정을 바꾸지 않는 범위에서 줄인다. 적용 대상과 조건, 판단 기준, 요구 행동을
복원 가능하게 쓰고, 권위·예외·관계가 판정을 바꿀 때는 해당 정보도 남긴다"이다.

## 2026-06-29 · 최소 충분 표현 판정 기준 반영

@user 승인에 따라 `.agents/skills/document-structure-review/SKILL.md`에 직전 판정 기준을 반영했다.

### 반영

- `Review Loop` 마지막 단계를 "가장 짧은 문장" 제안에서 충분성 우선 절차로 변경했다. 적용
  대상·조건, 판단 기준, 요구 행동이나 결과를 복원하고, 권위·예외·관계가 판정을 바꿀 때 이를
  드러낸 뒤 판정을 바꾸지 않는 범위에서 줄이게 했다.
- `Wording Rules`에 충분성의 필수 구성요소, 조건부로 남길 권위·fallback·관계 정보, 요소 제거 시
  다른 판단이 가능한지를 보는 제거 테스트를 추가했다. 짧음은 충분성을 통과한 표현 사이의
  최적화 기준으로 명시했다.
- `Information Format`의 최단 형태 선택 조건을 "같은 판정을 복원하는" 경우로 한정했다.
- `Output Checklist`의 추상적인 최단 문장 점검을 충분성 구성요소 점검으로 교체했다.

### 검증

- `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md` → exit 0 (PASS).
- `git diff --check -- .agents/skills/document-structure-review/SKILL.md` → exit 0 (PASS).
- `quick_validate.py`는 환경의 PyYAML 부재(`ModuleNotFoundError: No module named 'yaml'`)로 실행되지
  않았다. 이전 검증과 같은 환경 제약이며 validator 결과는 확보하지 못했다.

## 2026-06-29 · 6영역 재구성안과 기반영 범위 정리

@user가 앞서 제안된 `Identity And Scope` 등 6영역 재구성안이 후속 대화와 반영을 거쳐 어떤
상태인지 확인했다.

### 확인한 사실

- 직전 반영은 최소 충분 표현의 판정 기준만 현행 `Review Loop`, `Wording Rules`,
  `Information Format`, `Output Checklist`에 적용했다.
- 6영역으로의 heading 재구성, 상세 기준 reference 분리, Output Checklist 전체 축약은 아직
  수행하지 않았다.

### 수정된 제안 상태

- 6영역 상위 구조와 identity-first core workflow 방향은 유지한다.
- `가장 짧으면서도 판단을 복원하기 충분한가?`는 폐기하고, 적용 대상·조건, 판단 기준, 요구
  행동이나 결과의 복원 여부와 판정에 영향을 주는 권위·예외·관계의 보존 여부를 묻는 기준으로
  교체한다. 짧음은 충분성 통과 후의 최적화다.
- `최소 변경`도 단순 변경량 최소가 아니라 역할 정합과 필요한 전파를 모두 충족한 후보 중
  가장 작은 변경이라는 뜻으로 제한한다.
- owner/scope의 core 판정과 변경 전파 불변은 `SKILL.md`에 남긴다. reference로 옮길 수 있는 것은
  structure smell taxonomy와 상세 비교·authoring pattern이며, identity 실행 gate까지 이동하지 않는다.
- 따라서 다음 구조 반영은 기존 세부 내용을 기계적으로 이동하는 작업이 아니라, core gate 보존과
  조건부 reference routing을 함께 설계하는 별도 변경이다.

## 2026-06-29 · 새 문서 생성과 내용 추가 gate 보완

@user가 6영역 재구성안에서 문서 추가·문서 생성이 어떻게 처리되는지 확인했다.

### 판단

- workflow의 변경 표면 중 `존재`가 새 문서 생성에 해당하지만, 분류만으로는 생성 허용 기준이
  부족하다. 새 문서 생성은 `Conditional Gates`의 별도 gate로 명시해야 한다.
- 새 문서는 아직 자기 identity가 없으므로 user intent, parent/owner map, 관련 sibling과 기존
  corpus에서 intended identity를 설계한다. 기존 문서는 자기 identity를 기준으로 content 포함
  여부를 판정한다.

### 새 문서 생성 gate

- 같은 책임을 기존 owner 문서나 섹션이 이미 소유하는지 먼저 확인한다.
- 기존 문서 흡수로 해결되지 않고 owner·scope·reader·lifecycle·change coupling 중 실제 역할
  차이가 독립 identity를 요구할 때만 새 문서를 만든다.
- 생성 전 intended identity, owner/scope, parent·sibling 관계와 배치 위치를 정한다. 경계가
  복원되지 않으면 사용자에게 확인한다.
- 생성 후 parent taxonomy/index, inbound reference와 sibling 경계가 새 문서의 역할을 올바르게
  설명하는지 확인하고 필요한 관련 문서를 함께 갱신한다.

### 기존 문서 내용 추가 gate

- 새 내용이 기존 identity와 같은 owner/scope이면 흡수하고, 하위 개념이면 기존 문맥이나 필요한
  section에 배치한다.
- identity를 초과하면 국소 추가하지 않고 owner 문서 위임, scope 확장, 문서 분리, 상위 승격을
  비교한다.

따라서 제안된 conditional gate에는 "새 문서 생성이면 기존 owner로의 흡수 가능성과 독립
identity 필요성을 판정하고, 생성 후 parent·index·reference·sibling 역할을 정합화한다"를
추가하는 것이 적절하다.

## 2026-06-29 · identity-first 6영역 재구성 종합 반영

@user가 앞선 리뷰와 토론을 종합해 반영하고, 남은 일이 없으면 없다고 보고하라고 요청했다.
검토 결과 구조 개편과 reference 분리가 미반영 상태였으므로 owner skill에 반영했다.

### 반영한 파일

- `.agents/skills/document-structure-review/SKILL.md`
- `.agents/skills/document-structure-review/references/review-patterns.md` (신규)
- `.agents/skills/document-structure-review/references/authoring-patterns.md` (신규)
- `.agents/skills/document-structure-review/references/EXAMPLE.md`

### 구조와 역할

- `SKILL.md`를 `Identity And Scope`, `Core Invariants`, `Review Workflow`, `Conditional Gates`,
  `Reference Routing`, `Output Contract`의 6영역으로 재구성했다.
- identity 근간을 존재·위치·경계·상태·내용 변경 전체로 일반화하고, owner 판정과 본문 경계
  표기를 분리했다.
- core에는 bounded read path, authority 충돌, cross-document 전파, content/authority 불확실성,
  최소 충분 표현 기준을 유지했다.
- 새 문서 생성, content/identity 변경, destructive change, guideline/template 변경을 조건부
  gate로 분리했다. 새 문서 생성은 기존 owner 흡수 가능성과 독립 identity 필요성을 먼저
  판정하고 생성 후 parent/index/reference/sibling 정합화를 요구한다.
- 상세 context read path, concept placement, structure smell, owner와 변경 위치 판단은
  `review-patterns.md`로 이동했다.
- wording, rule shape, information format, guideline 구조 모델과 sibling 비교는
  `authoring-patterns.md`로 이동했다.
- Output Contract는 전수 checklist에서 6개 core completion gate로 축약하고, 관련 항목만
  적용한다고 명시했다.
- `EXAMPLE.md`에 12개 사례 목차와 `New Document Needs An Independent Identity` 사례를 추가했다.

### 검증 ledger

- `SKILL.md`: 361줄에서 117줄로 축약. core 판단과 조건부 routing은 본문에 유지했다.
- 모든 대상 파일에 `scripts/check-markdown-inline-code` 실행 → exit 0 (PASS).
- `git diff --check -- .agents/skills/document-structure-review` → exit 0 (PASS).
- 대상 파일 trailing whitespace 검색 → 결과 없음 (PASS; `rg` exit 1은 no match).
- 100줄을 넘는 `authoring-patterns.md`와 `EXAMPLE.md`에 목차가 있다.
- read-only fresh Codex forward-test에서 네 시나리오를 실행했다:
  새 문서 길이만 긴 경우 기존 owner 흡수, scope 초과 내용은 content/identity gate와
  `review-patterns.md`, 혼합 참조 삭제는 destructive gate와 비파괴 fallback, 반복되는
  child/parent 충돌은 guideline gate와 `authoring-patterns.md`로 판정했다 (PASS).
- `quick_validate.py`는 PyYAML 부재(`ModuleNotFoundError: No module named 'yaml'`)로 실행되지
  않았다. frontmatter는 `name`과 `description`만 유지했지만 validator 결과는 확보하지 못했다.

### 남은 상태

- 합의된 구조·내용 반영과 실행 검증은 완료했다.
- 커밋은 사용자 요청이 없어 수행하지 않았다. 이 로그는 기존 설계 흐름과 커밋 대기 상태에
  따라 open을 유지한다.

## 2026-06-29 · identity 근간 강화와 내용 보존 점검

@user가 (1) codex 축약의 내용 보존을 어떻게 다룰지, (2) 내부 모순 해소에서 checklist보다 나은
방안이 있는지, (3) 근간 선언의 지위 강화를 요청했다. (1)(2)는 판단하고 (3)과 (1)의 누락분을
반영했다.

### 확인한 사실

- 원본 `Output Checklist`(약 40항목)를 codex의 `SKILL.md`·`references/review-patterns.md`·
  `references/authoring-patterns.md`와 대조했다. 항목 대부분은 reference 본문에 규칙으로
  보존돼 있다: skeleton fence 누출 → `authoring-patterns.md` Comparative Guideline Review,
  단일컬럼 table 대체 → Information Format, negative instruction vs decision table → Rule Shape,
  hidden authority → `review-patterns.md` Structure Smells.
- 직접 대응이 약해진 항목은 1개다: 원본의 "예시·근거·provenance·workflow·style이 한 섹션에서
  섞이지 않는가". codex의 `Concept Placement`는 같은 수준 배치는 다루지만 한 섹션 내 역할
  혼재 금지 smell은 빠져 있었다.

### 판단

- 내용 보존을 위해 checklist를 다시 키우는 것은 이 skill 자신의 중복 금지 원칙(`authoring-patterns`
  Wording)과 codex가 해소한 전수 compliance 모순에 역행한다. 보존은 규칙을 owner 본문에 두고
  누락분만 복원하는 방식이 맞다.
- checklist보다 나은 형태는 codex가 이미 적용한 3층 구조다: `Core Invariants`(불변),
  `Conditional Gates`(변경 유형별 분기), `Output Contract`(6 completion gate). 단일 checklist를
  추가로 손보거나 별도 decision table을 끼울 필요는 없다.

### 반영

- `SKILL.md` `Identity And Scope` 첫 문단에 "이 skill의 모든 판단은 문서의 identity를 근간으로
  한다"와 "Core Invariants·Review Workflow·Conditional Gates·reference는 이 근간을 실행하는
  도구이며, 다른 규칙이 identity 판단과 충돌하면 identity 판단을 우선한다"를 명시해 근간의
  지위를 강화했다. lifecycle 일반화(존재·위치·경계·상태·내용)는 유지했다.
- `references/review-patterns.md` Structure Smells에 `mixed concept roles`를 복원했다.

### 검증 ledger

- `scripts/check-markdown-inline-code SKILL.md review-patterns.md` → exit 0 (PASS).
- `git diff --check -- SKILL.md review-patterns.md` → exit 0 (PASS).
- `quick_validate.py`는 직전 블록과 동일하게 PyYAML 부재로 미실행. frontmatter는 name·description만
  유지했으나 validator 결과는 확보하지 못했다(미해결 gap).

### 남은 상태(이번 블록)

- 커밋은 @user 지시 없어 수행하지 않았다. 이 로그는 open 유지.

## 2026-07-01 · 구조·루프 우선 검증 invariant 추가

@user가 `document-structure-review` 적용 중 놓친 사례를 바탕으로, 새 규칙을 추가하기보다 문서
개편, 구조 개편, 루프 조정으로 해결 가능한지 먼저 검증하는 원칙을 반영하고, 추가 이유·사례·
반영 내용을 이 로그에 남기라고 지시했다.

### 추가 이유

- 이번 사례에서 Codex는 `SKILL.md`와 `loop-rules.md`의 owner/placement와 일부 누락 규칙은
  검토했지만, 두 문서가 phase/section pair로 맞물리는지 충분히 보지 못했다.
- `SKILL.md`가 `Enter`, `Record`, `Reconcile`, `Detach`, `Closeout` 같은 루프를 노출한다면
  상세 문서도 같은 loop 단위와 heading으로 독자 경로를 받아야 한다. 이 문제는 개별
  `heading/anchor` 검증 규칙을 추가하는 것보다 문서 경계, section 순서, reader path, loop
  구조를 다시 맞추는 편이 더 일반적인 해결책이다.
- 따라서 특정 프로젝트의 `SKILL.md`/`loop-rules.md` 사례에 묶인 rule이 아니라, durable 문서
  전반에서 새 rule·section·template·field·reference를 늘리기 전에 기존 구조와 lifecycle/loop
  재배치로 해결 가능한지 확인하는 invariant가 필요하다고 판단했다.

### 사례

- 로그 스킬 개편 초안에서 `SKILL.md`는 영어 phase loop를 갖고 있었지만 `loop-rules.md`는
  일부 섹션이 한국어 heading이거나 `Detach`가 transfer와 independent follow-up까지 포함하는
  넓은 내용을 담아 phase pair가 약했다.
- 사용자 리뷰를 통해 `Detach`는 `Detach / Transfer`로 넓히고, `loop-rules.md` 주요 섹션도
  `Record`, `Reconcile`, `Detach / Transfer`, `Closeout / Status`처럼 router phase와 맞추는
  구조 개편이 더 적절하다고 정리됐다.
- 이 사례는 "문서 간 참조는 interface다"라는 국소 규칙을 박기보다, 구조와 loop가 작업 단위와
  어긋나 반복 홉이나 누락을 만드는지 먼저 보고 문서 경계·heading·순서·routing surface를
  조정해야 한다는 일반 원칙을 보여준다.

### 반영

- `.agents/skills/document-structure-review/SKILL.md` `Core Invariants`에 다음 원칙을 추가했다:
  새 rule, section, template, field, reference를 추가하기 전에 문제가 기존 문서의 identity,
  owner 배치, section 구조, reader path, lifecycle/loop 순서, information format 재배치로
  해결되는지 먼저 검증한다.
- 같은 invariant에서 구조나 loop가 작업 단위와 어긋나 반복 홉이나 누락을 만들면 국소 규칙을
  늘리기보다 문서 경계, heading, 순서, routing surface를 조정하라고 명시했다.

### 검증

- 반영 위치: `.agents/skills/document-structure-review/SKILL.md` `Core Invariants`.
- 이번 변경은 portable 문서 리뷰 절차의 상위 판단 원칙 추가이며, 프로젝트별 로그 구조나 로그
  스킬 초안 파일은 직접 수정하지 않았다.

## 2026-07-01 · 구조·루프 우선 검증 reference 보강

@user가 앞선 `Core Invariants` 추가를 기준으로, `references/` 하위 파일에도 넣을 문서가 있는지
파악·검토한 뒤 전부 반영하라고 지시했다.

### 확인한 사실

- `references/review-patterns.md`에는 이미 `excessive read path`, `copied section meaning`,
  `mixed concept roles`, `Change Location`이 있어 이번 문제를 수용할 구조 smell와 변경 위치
  판단 자리가 있었다.
- `references/authoring-patterns.md`에는 `Guideline Improvement`가 있고, router/summary 문서의
  세부 절차 반복 금지와 authoring scenario 기반 read path 비교가 이미 있었다.
- `references/EXAMPLE.md`에는 owner, skeleton, destructive gate, new document identity 사례는
  있었지만, entry 문서의 loop와 target reference heading/order가 어긋나는 사례는 없었다.

### 반영한 내용

- `references/review-patterns.md` `Structure Smells`에 `misaligned reader path`를 추가했다.
  heading, 순서, routing surface나 loop가 실제 작업 단위와 어긋나 반복 홉이나 누락을 만드는
  smell로 정의했다.
- 같은 파일 `Change Location`에 국소 rule 추가 전 section 재배치, heading rename, 순서 변경,
  routing surface 조정으로 reader path와 작업 단위를 맞출 수 있는지 비교하라는 문장을 추가했다.
- `references/authoring-patterns.md` `Guideline Improvement`에 router/summary 문서가 phase,
  step, command, template 단위로 target 문서를 가리킬 때 target heading과 순서가 같은 작업
  단위와 scan path를 제공하는지 보라는 문장을 추가했다.
- `references/EXAMPLE.md`에 `Reader Path And Loop Are Misaligned` 사례를 추가했다. 특정 로그
  스킬 사례를 보존하지 않고, entry 문서가 loop를 노출하지만 target reference의 heading/order가
  맞지 않아 반복 홉이나 누락이 생기는 portable 사례로 추상화했다.

### 추가 이유

- `SKILL.md`의 invariant는 상위 원칙이고, reference에는 agent가 실제 검토 중 발견할 smell,
  변경 위치 판단, authoring guide 개선 판단, forward-test 사례가 필요했다.
- "문서 간 참조는 interface"라는 국소 규칙을 직접 박기보다, 구조와 loop가 작업 단위와 어긋나는
  반복 문제를 smell와 사례로 포착하는 편이 portable하고 재사용 가능하다고 판단했다.

## 2026-07-01 · bounded self-audit — 과인코딩 삭감·Output Contract mirror 복구

@user와 타 agent(Gemini) 사이 토론에서, 앞선 두 블록(invariant 추가·reference 보강)이 같은
신호를 5곳에 인코딩한 것 자체가 이 skill이 경계하는 "새 규칙으로 해결하려는 문제"의 실사례라는
지적이 나왔다. 합의: skill을 자기 원칙(제거 테스트)으로 한 번 self-audit하고, 순 라인이 0 또는
음수로 닫히도록 과인코딩을 삭감하며, Output Contract의 mirror 누락만 복구한다.

### 확인한 사실

- 앞선 변경이 같은 "misaligned reader path" 신호를 5곳에 넣었다: `SKILL.md` Core Invariant,
  `review-patterns.md` smell, 같은 파일 Change Location 줄, `authoring-patterns.md` Guideline
  Improvement 줄, `EXAMPLE.md` 사례 13.
- `SKILL.md` Core Invariants 마지막 항목은 "…복원 가능하게 쓴다. …그 판정을 바꾸지 않는
  범위에서만 줄인다"로 sufficiency와 trim(잉여 제거) 두 방향을 다 갖는다. 그러나 Output Contract
  마지막 항목은 sufficiency 절반만 mirror하고 trim 방향을 떨어뜨렸다.
- Output Contract 6항목을 제거 테스트로 재검하면 6개 모두 서로 다른 축(evidence/identity/
  placement/propagation/negative-guard/sufficiency)이라 순수 잉여는 없다. 유일한 결함은 위
  trim 방향 mirror 누락이다.

### 판정(제거 테스트)

| 대상 | 판정 | 근거 |
| ---- | ---- | ---- |
| Core Invariant "추가 전 재배치 검증" | 삭제 | 1문장=기존 Guideline/Template gate·Concept Placement·Guideline Improvement·Workflow step6 재서술 / 2문장=invariant 아닌 탐지 패턴(smell 자리) |
| smell `misaligned reader path` | 유지+트림 | 유일한 net-new 신호. "반복 홉"은 `excessive read path`와 겹쳐 제거, 구조↔작업단위 어긋남으로 인한 전이·정리·검증 누락으로 좁힘 |
| Change Location 추가 줄 | 삭제 | 기존 local/ancestor/both/no-change 비교 + Guideline Improvement 재서술 |
| authoring Guideline Improvement 추가 줄 | 삭제 | 바로 위 router 복원성 줄 + smell의 근접 중복 |
| EXAMPLE 13 | 유지+수정 | 고유 teaching 사례. smell 목록의 `copied section meaning`은 상황(발산)과 불일치라 제거 |

### 반영

- `SKILL.md` Core Invariants: "추가 전 재배치 검증" invariant 삭제(8→7항목).
- `SKILL.md` Output Contract 마지막 항목에 "반대로, 제거해도 판정이 같은 줄은 없는가?" 추가 —
  부모 Core Invariant의 trim 방향을 gate에 mirror(항목 수 6 유지).
- `references/review-patterns.md`: smell `misaligned reader path` 트림, Change Location 추가 줄
  삭제.
- `references/authoring-patterns.md`: Guideline Improvement 추가 줄 삭제.
- `references/EXAMPLE.md`: 사례 13 smell 목록에서 `copied section meaning` 제거(사례 본문·ToC
  유지).

### 검증

- 순 diff: 삭제 3곳(invariant·change-location·authoring) + 트림 2곳(smell·example smell목록) +
  추가 1곳(Output Contract 반쪽 문장). 앞선 두 블록 대비 순 라인 음수.
- 커버 보존 확인(삭제 항목이 verdict를 잃지 않는지):
  - "추가 전 재배치 우선" → `Conditional Gates` Guideline/Template(기존 문맥 흡수·invariant가
    더 작은 해결인지), `review-patterns.md` Concept Placement(제목변경·흡수·이동·위임),
    Guideline Improvement(재배치·축약·경계 명확화가 새 규칙보다 작은지), Review Workflow step6
    (가장 작은 변경)에 그대로 존재.
  - net-new 신호(구조/loop↔작업단위 어긋남으로 인한 후속 누락) → smell + EXAMPLE 13에 탐지·
    사례 2곳으로 보존.
- 반영 위치는 portable skill 파일에 한정. 프로젝트 로그 구조나 로그 스킬 초안 파일은 수정하지
  않았다.
- 커밋은 @user 지시 없어 수행하지 않았다. 이 로그는 open 유지.

## 2026-07-01 · under-scoped identity smell 도입 — log skill 사례에서 촉발

@user가 log skill 개선 검토 중 발견한 문제(토론형 로그처럼 Work Item이 없는 로그에도 미래
세션이 따라야 할 standing rule 표면이 필요한데 `Work Item Requirements`라는 이름이 그 개념보다
좁음)를 계기로, "document-structure-review가 이 class(section identity 과소명명)를 왜 못 잡았고
어떻게 잡아야 하는가"를 검토했다. log skill 자체 해결(rename 등)은 log skill thread가 소유하고,
이 로그는 document-structure-review 감지력만 다룬다.

### 확인한 사실

- 문제는 durable section/identity의 이름·scope가 담당 개념보다 좁은 구조 결함이다. primary는
  identity/scope이고 `owner or altitude mismatch`(내용 배치)·`misaligned reader path`(증상)는
  근사일 뿐 결함을 명명하지 못했다.
- `references/EXAMPLE.md` #2·#3·#11·#13이 이미 이 현상을 다루고, #13은 해결 문장("Section 이름이
  실제 포함 범위를 덮지 못하면 … 이름을 넓힌다")까지 갖고 있었으나 흩어진 태그 밑에 있고 named
  smell이 없었다 → log 사례 과적합이 아니라 corpus가 4회 증명한 패턴의 명명.
- EXAMPLE 13개 중 12개가 smell을 2개 이상 co-tag한다. 즉 "여러 smell 동시 발화"는 이미 corpus의
  규범인데 Review Workflow 2("…중에서 판정한다")는 단일 선택처럼 읽혔다.
- (Claude·Codex 수렴) 반영 위치: always-read gate가 필수이고 조건부 reference만 고치면 reach가
  약하다. smell은 vocabulary 보조. `authoring-patterns.md` Wording("넓은 개념어를 고른다")이
  naming 원칙을 이미 담아 gap은 wording이 아니라 detection이다.

### 반영 (portable skill 파일 한정)

- `SKILL.md` `Guideline Or Template Change` gate: 기존 section·scope 이름이 한 subtype에 묶여
  다른/부재 subtype을 누락시키지 않는지 확인하고, 좁게 명명된 identity는 rename·일반화·scope
  재정의로 맞추라는 bullet 추가.
- `SKILL.md` Review Workflow 2: "여러 역할에 걸치면 하나로 못 박지 말고 모두 식별해 route" 절
  추가(corpus co-tag 규범의 명시화).
- `references/review-patterns.md` Structure Smells: `hidden sub-kind` 옆에 `under-scoped identity`
  추가. `hidden sub-kind`(subtype을 가림)의 역방향(subtype에 묶임)이라 그 smell의 과부하 해소.
- `references/EXAMPLE.md`: #13(필수)·#11(document identity altitude)의 smell 목록에
  `under-scoped identity` 추가. #2는 sibling hierarchy가 primary라 제외.
- Codex 정합 지적 반영: smell 정의를 "document identity 문장이나 section·scope 표기의 이름"으로
  넓혀 #11(document altitude)과 coextensive하게 함. 단 gate는 section/scope altitude를 유지 —
  document identity가 scope를 초과하는 유형은 `Content Or Identity Change` gate("scope 확장·상위
  개념 승격")가 이미 소유하므로 gate 확장은 책임 중복이 된다.

### 검증

- `authoring-patterns.md` 미변경(Wording 규칙과 중복 회피). #2 태그 미변경.
- gate·smell·example·workflow가 한 신호를 서로 다른 altitude·역할로 분담(중복 재인코딩 아님):
  gate=탐지 trigger(always-read), smell=vocabulary, example=적용 사례, workflow=co-activation 원칙.
- 이번 커밋에는 앞선 2026-07-01 두 블록(`misaligned reader path` 도입·bounded self-audit)의
  미커밋 변경도 같은 thread 결과물로 함께 포함한다. @user 지시로 docs-skill 로그 +
  document-structure-review 스킬을 커밋한다. 이 로그는 open 유지.

## 2026-07-02 · Rule Shape flow와 feedback loop 선택 기준

@user가 log skill의 `Log Blocks`와 `Record`를 순서 있는 판정 구조로 재편한 경험을 바탕으로,
document-structure-review에도 어떤 상황과 내용에서 loop 형태를 선택할지 판단하는 기준을
추가하자고 제안하고 반영을 지시했다.

### 확인한 사실

- `references/authoring-patterns.md#Rule Shape`는 scope rule, identity rule, decision table,
  invariant, must rule과 destructive-change gate를 선택지로 제공하지만, 순서 있는 gate와 재진입
  구조를 구분하는 rule shape는 없었다.
- 같은 파일의 `Information Format`은 순서가 결과에 영향을 주는 절차에 numbered list를 쓰도록
  하지만, 한 방향 절차와 앞 단계로 돌아가는 loop의 의미 차이는 소유하지 않는다.
- `references/EXAMPLE.md` 사례 7은 Rule Shape의 선택지를 직접 열거하므로 owner 목록이 늘면 함께
  정합화해야 한다.
- log skill 사례 중 latest-entry lookup과 record placement는 순서 있는 판정이지만 자체 재진입은
  없고, Record 결과를 Reconcile한 뒤 새 의미 변화가 발견되어 Record로 돌아가는 경로는 실제
  feedback loop다.

### 판단

- 순서가 있다는 이유만으로 모두 loop라고 부르면 one-way procedure와 반복 lifecycle의 차이가
  사라진다. `gate-driven flow`는 순서 있는 gate의 분기·종료를, `feedback loop`는 그 flow에 더해
  실행·검증 결과가 앞 단계 판단을 다시 발화하는 재진입을 소유하게 구분한다.
- 두 형태 모두 Rule Shape 선택 문제이므로 상세 owner인 `authoring-patterns.md`에 둔다. `SKILL.md`
  Core Invariants나 review smell에 반복하면 앞선 bounded self-audit에서 제거한 과인코딩을 다시
  만든다.
- 품질 기준처럼 순서와 무관하게 항상 적용되는 독립 항목은 loop 단계로 강제하지 않고 invariant나
  verification checklist로 유지한다.

### 반영

- `.agents/skills/document-structure-review/references/authoring-patterns.md#Rule Shape`에
  `gate-driven flow`와 `feedback loop`를 추가했다.
- `gate-driven flow`에는 진입 조건, gate 순서, 분기 결과와 종료 조건을, `feedback loop`에는 추가로
  재진입 조건과 돌아갈 단계를 명시하도록 했다. 되돌아가는 경로가 없으면 loop로 부르지 않는다.
- `.agents/skills/document-structure-review/references/EXAMPLE.md` 사례 7의 rule-shape 열거를 새 owner
  목록과 맞췄다. `SKILL.md`, `review-patterns.md`와 다른 사례는 변경하지 않았다.

### 검증

- 변경 파일 `authoring-patterns.md`, `EXAMPLE.md`, `logs/docs-system/2026-06-25-docs-skill.md`에 `git diff --check`를
  실행해 PASS.
- `rg`로 `gate-driven flow`, `feedback loop`가 owner 정의, 직접 소비하는 사례 목록과 이 변경
  기록에만 존재하고, 기존 `decision table`·numbered list의 책임을 재정의하지 않음을 확인했다.
- `scripts/check-markdown-inline-code`를 변경한 skill reference 두 파일에 실행해 PASS했다.
- skill-creator의 `quick_validate.py`는 환경에 `yaml` 모듈이 없어 `ModuleNotFoundError`로 미실행됐다.
  frontmatter는 변경하지 않았으며 validator 결과는 확보하지 못했다.
- 문서 구조와 rule-shape vocabulary만 바뀌어 script나 runtime 검증은 필요하지 않았다.

## 2026-07-02 · Rule Shape 범주화와 gate 명명 정리

@claude가 위 gate-driven flow / feedback loop 추가를 리뷰하며 두 관찰을 남겼다. @user가 두 가지
반영을 지시했다.

- ① Rule Shape bullet 수가 스킬 자신의 임계에 닿음.
- ② `gate-driven flow`와 기존 `destructive-change gate`가 term 이름에 `gate`를 공유함.

### 확인한 사실

- `references/authoring-patterns.md#Rule Shape`는 gate-driven flow / feedback loop 추가로 평면 bullet
  8개가 됐다. 같은 파일 `Information Format`은 bullet이 7-8개를 넘으면 범주화나 다른 형태를
  검토하라고 규정한다 — 초과가 아니라 임계 경계다.
- `gate-driven flow`와 `destructive-change gate` 두 term에 `gate` 단어가 함께 들어간다. 다만 각
  정의는 서로 다른 영역(순서 있는 flow vs 삭제·대체·archive·status 전환 safeguard)을 이미 소유한다.
- `references/EXAMPLE.md` 사례 7은 rule shape를 flat menu로 나열하는 scenario 예시이지 owner의 내부
  범주를 미러링하지 않는다.

### 판단

- ①은 Information Format이 처방한 remedy 그대로 적용한다. 8개 평면 bullet을 `적용 범위·정체성`(2),
  `조건 분기와 순서·재진입`(3), `제약·안전장치`(3) 3개 라벨 그룹으로 묶는다. 정의(term —
  explanation) 형태와 term 이름은 그대로 두어 사례·소비자 정합을 유지한다. singleton 그룹이
  생기지 않도록 destructive-change gate를 invariant·must와 같은 safeguard 성격으로 묶었다.
- ②는 범주 배치로 반영한다. `gate-driven flow`를 `조건 분기와 순서·재진입` 그룹에,
  `destructive-change gate`를 `제약·안전장치` 그룹에 두어 역할을 구조적으로 분리했다.
  - rename은 채택하지 않았다. `gate-driven flow`는 2026-07-02 앞 블록에서 근거와 함께 방금 확정한
    term이라, 이번 turn에 이름을 뒤집으면 승인된 결정을 되돌린다.
  - 별도 disambiguation 문장 추가도 채택하지 않았다. 두 정의가 이미 각자 영역을 소유하므로 교차
    참조 문장은 agent의 shape 선택 판정을 바꾸지 않는다 — 스킬 `Wording`의 "제거해도 판정이 같으면
    중복" 기준에 걸린다.
  - 잔여: term 문자열에는 `gate`가 여전히 둘 다 남는다. 그러나 각 정의가 담당 영역을 특정하고 범주
    라벨이 역할을 분리하므로 오적용 위험은 없다고 본다.
- 두 변경 모두 Rule Shape owner인 `authoring-patterns.md` 안에 둔다. `SKILL.md`는 rule shape를
  열거하지 않고 라우팅 포인터만 두므로 미변경이 맞다.

### 반영

- `.agents/skills/document-structure-review/references/authoring-patterns.md#Rule Shape`를 3개 라벨
  그룹으로 재구성했다. 상단에 선택 도구·강제 아님 문구를 lead-in으로 옮겼다.
- `EXAMPLE.md` 사례 7, `SKILL.md`, `review-patterns.md`는 변경하지 않았다. 사례 7은 flat menu라
  term 이름이 그대로면 유효하고, owner의 그룹화를 미러링할 필요가 없다.

### 검증

- `git diff --check -- .agents/skills/document-structure-review/references/authoring-patterns.md` PASS.
- `scripts/check-markdown-inline-code`를 변경 파일에 실행해 exit 0.
- `rg`로 `gate-driven flow`·`feedback loop`·`destructive-change gate`가 owner 정의와 사례 7 flat menu에만
  존재함을 확인했다(다른 소비자 없음). 3개 그룹 라벨 존재도 확인했다.
- skill-creator `quick_validate.py`는 앞 블록과 동일하게 `yaml` 모듈 부재로 미실행. frontmatter 미변경.

## 2026-07-03 · 역할→표현 형태 원칙과 `inferred action` smell

`logs/log-system/2026-07-01-log-skill-overhaul-discussion.md`의 `2026-07-02 21:32 · Cross-Log action closure
외부 리뷰 반영` 기록을 보고, @user가 이 skill에도 유사한 미흡점이 있다고 판단해 검토·반영을 지시했다.
로그 skill이 Cross-Log discriminator 종결 분기를 "owner 절 적용" 지시로 축소한 것과 같은 결함이
이 skill에도 잡히는지가 출발점이었다.

### 확인한 사실

- 로그 skill 2026-07-02 변경은 discriminator 1번(Yes)·3번(No)을 각각 `Superseded`·`Independent
  Follow-Up` 절을 적용하는 지시로 축소하고 구체 mutation을 하위 절+Verify에 단일 소유시켰다.
  `git diff`로 `loop-rules.md`·`SKILL.md` 실제 변경이 그 기록과 일치함을 확인했다.
- 이 skill 현황:
  - `SKILL.md` Core Invariant와 Output Contract는 "요구 행동이나 결과를 복원 가능하게"까지만
    요구했다. "복원 가능"은 추론으로도 통과되는 bar다.
  - `authoring-patterns.md#Rule Shape`의 `gate-driven flow`는 "분기 결과·종료 조건 명시"만 요구하고
    분기 결과의 표현 형태(지시 vs 서술)는 규정하지 않았다.
  - `authoring-patterns.md`의 `normative/descriptive/provenance` 역할 분류는 Comparative Guideline
    Review scope에만 묶여 일반 표현 규칙이 아니었다.
  - 제약 역할의 표현 기준은 이미 `negative rule`에 인라인으로 있다("대상 특정 어려우면
    classification/decision table로 올린다").
  - 행동 역할이 서술에 그치는 결함을 잡는 review smell은 없었다.

### 판단

- 상위 원칙은 "재서술 금지/drift"가 아니라 **역할→표현 형태**다. 각 문장·절은 실행 역할이 있고
  그 역할마다 독자 응답을 추론 없이 복원시키는 형태가 있다. 지시 명시성은 그중 **행동 역할** 하나의
  형태 기준일 뿐이다(판단·제약·정의·근거·provenance 역할은 각기 다른 형태를 요구한다).
- 추론 비용은 지시 명시성에 종속되는 결과다. 별도 요구사항으로 두면 skill 자신의 "제거해도 판정
  같으면 중복" 규칙에 걸린다. authoring에선 근거, review에선 탐지 신호로 표현한다.
- 대부분 역할은 이미 커버돼 있고(정의=Wording·Owner&Scope, 제약=negative rule, provenance=destructive
  gate), 실제 구멍은 **행동 역할** 하나다. 조직 원칙은 제약 역할이 `authoring-patterns.md`에서
  이미 역할→형태를 적용해 암묵적으로 존재했으나 이름이 없었다.
- 7개 역할 규칙을 병렬 추가하면 대부분 중복이다. 원칙을 SKILL invariant에 한 번, 행동 역할 실례를
  authoring에, 탐지 smell을 review에 두는 3면 분산으로 재인코딩을 피한다.

### 반영

- `SKILL.md` Core Invariant: "복원 가능" bar를 "문장의 실행 역할에 맞는 형태로 복원"으로 올리고,
  행동 역할(라우팅·gate 종결·step)은 요구 행동+owner를 지목하는 지시로 명시하도록 원칙을 서술.
- `SKILL.md` Review Workflow step 6: 정보 형식 선택 앞에 "실행 역할에 맞는 표현 형태 요구"를 삽입.
- `SKILL.md` Output Contract: 미러 점검 추가(행동 역할 문장이 지시로 명시됐는가).
- `authoring-patterns.md#Rule Shape` `gate-driven flow`: 각 분기 결과를 owner 절 지목 지시로, 분기 간
  평행 형태로, 상태·라벨만으로 두지 않도록 명시.
- `review-patterns.md#Structure Smells`: `inferred action` smell 신설.

### 미반영·후속

- `must rule`은 정의 자체가 "실행 반복 누락 방지"라 지시 명시가 거의 tautology → 미변경(중복 회피).
- `EXAMPLE.md`에 행동 역할 지시 사례(2026-07-02 로그 케이스 추상화) 추가는 후속 후보로 남긴다.
- `SKILL.md` Review Workflow step 2의 개념 역할 분류(identity/scope/…)는 도메인 축이라 실행 역할
  축과 구분해 미변경.

### 검증

- `git diff --check -- .agents/skills/document-structure-review/` PASS.
- `scripts/check-markdown-inline-code`를 변경 3개 파일에 실행해 exit 0.
- `rg`로 skill 파일에서 `inferred action`이 `review-patterns.md`에만, "실행 역할" 원칙이 `SKILL.md`
  L43·62·126에만 존재함을 확인(다른 소비자 재인코딩 없음).
- skill-creator `quick_validate.py`는 앞 블록들과 동일하게 `yaml` 모듈 부재로 미실행. frontmatter 미변경.
- Work Items·Required Context가 없는 토론형 로그라 Reconcile 대상 없음. 이 로그는 open 유지.

## 2026-07-03 · skill 전체 검토 반영 — smell 범주화·owner 지목 조건화·EXAMPLE 14

@user 지시로 직전 커밋(4210413) 리뷰와 skill 4개 파일 전체 검토를 수행하고, 발견 사항 중
반영 가치가 있는 것만 계획해 적용했다. 여러 unit에 걸친 일회성 checkpoint 블록이다.

### 확인한 사실

- 커밋 4210413의 diff는 앞 블록 기록과 일치. rg 재확인: `inferred action`은 `review-patterns.md`
  에만, "실행 역할"은 `SKILL.md` L43·62·126에만 존재(재인코딩 없음). `.claude/skills/` symlink
  동기화 정상.
- `review-patterns.md` Structure Smells가 15개 평면 definition bullet — Information Format의
  7-8 임계와 2026-07-02 Rule Shape 범주화(8개 시점에 적용) 선례를 크게 초과.
- 행동 역할 규칙 4개 표면(Core Invariant·Output Contract·`inferred action`·gate-driven flow)이
  모두 "요구 행동과 owner 지목"을 무조건 이중 요구로 서술 — owner 절이 없는 self-contained
  행동(종결 분기 "멈춘다", 행동이 문장 안에 완결된 step)에 문자적 false positive. skill 자신의
  Review Workflow step들("…수행한다")조차 문자적으로는 위반.
- `EXAMPLE.md` smell 태그 표기 불일치: #4·#5·#11이 어휘 smell을 backtick 없이 태그.
  `inferred action`(앞 블록의 미반영 후속)과 `mixed concept roles`는 사례 커버 없음.

### 판단

- smell 범주화는 Rule Shape 선례 그대로 적용: 4개 라벨 그룹(소유·권위 / 정체성·역할 경계 /
  구조 비용·독자 경로 / 표현 형태·안전장치), 정의·term 불변, lead-in 한 줄(범주=탐색 보조,
  배타 분류 아님 — 그룹이 routing 분류로 오독되는 것 방지).
- owner 지목은 "행동을 다른 절이 소유하면 그 owner 지목"으로 조건화 — 4개 표면 평행 수정.
  방향 반전이 아니라 scope 조건화이고 skill 자기 본문에서 문자적 위반이 실증되므로, 직전
  승인 결정 되돌리기("승인된 결정을 뒤집지 않는다" 기준)에 해당하지 않는다고 판단.
- no-change 결정 4건:
  - Review Workflow step 6 삽입구 — 제거 테스트 경계선(net-new는 "형태 요구가 정보 형식
    선택보다 앞"이라는 순서 정보뿐). 직전 turn 승인 결정이라 유지하고 다음 self-audit 재평가
    후보로 남긴다.
  - "실행 역할"의 역할 목록 열거 — 다른 역할의 형태 기준은 각 owner 절(Wording·negative
    rule·destructive gate)이 이미 소유(앞 블록 판단 유지). 열거 추가는 재인코딩.
  - `mixed concept roles` 사례 — corpus 근거 없이 사례를 만들지 않는다(사례는 실제 사례의
    추상화라는 EXAMPLE identity 유지).
  - `SKILL.md` 크기(8,995 bytes) — repo 안에 skill 크기 캡 권위 없음(rg 무결과). 외부 이식성
    캡(8KB) 적용 여부는 @user 판단 대기.

### 반영

- `references/review-patterns.md` Structure Smells: 4그룹 재구성 + lead-in. `inferred action`
  정의는 owner 조건을 괄호로 흡수해 트림.
- `SKILL.md` Core Invariant·Output Contract: owner 지목 조건화(같은 괄호형, 순 길이 유지).
- `references/authoring-patterns.md` gate-driven flow: 동일 조건화.
- `references/EXAMPLE.md`: 사례 14 "Gate Branch Ends In A Label" 신설(앞 블록 후속 종결 —
  log skill 2026-07-02 Cross-Log 사례의 추상화, `inferred action`+`duplicated ownership`,
  양방향 결함: 라벨 종결=추론 강요 / 분기별 절차 복사=이중 소유) + ToC 갱신 + #4·#5·#11
  어휘 smell 태그 backtick 정합(비어휘 ad-hoc 태그는 plain 유지 — backtick=named smell 구분).

### 검증

- `git diff --check -- .agents/skills/document-structure-review/` PASS.
- `scripts/check-markdown-inline-code` 변경 4개 파일 exit 0.
- rg: 그룹 라벨 4개 존재. `inferred action`은 review-patterns 정의 1곳 + EXAMPLE 사례 14
  소비 1곳에만(재인코딩 없음). "실행 역할"은 여전히 SKILL 3곳에만. ToC anchor
  `#14-gate-branch-ends-in-a-label`와 heading 일치.
- 커밋은 @user 지시 없어 수행하지 않았다. Work Items·Required Context가 없는 토론형 로그라
  Reconcile 대상 없음. 이 로그는 open 유지.

## 2026-07-07 · document skill review flow의 loop 설계 검토와 content·자가개선 gap

@user가 document skill(`document-structure-review`)의 review 흐름을 "요즘 핫한 루프 설계 관점"에서 검토 요청했고, 이어 loop 형태·graph 전파·content-review gap·자가개선 루프까지 설계 토론으로 확장했다. 이 블록은 그 토론 전체를 증류한 handoff이며, 다음 세션에서 **합의된 loop 요소를 현재 Review Workflow 7-step 위에 얹은 통합 재구성 초안**을 만들기 위한 것이다. 이번 세션은 전부 진단·설계·보고 단계이고 **스킬 파일은 아직 수정하지 않았다**(제안까지만).

### 1) loop 관점 진단 — 지금은 loop가 아니라 waterfall+lookup

- 현재 흐름(확인한 사실): identity-anchored 7-step spine + on-demand Reference Routing + 단일 분기(Conditional Gate [5]). 상시 제약=Core Invariants, 종료 체크=Output Contract.
- 강점(요즘 loop 설계와 정합): JIT/progressive reference routing(`Reference Routing`), bounded gathering·과수집 방지(Core Invariant "판단 바꾸는 관계만 읽고 근거 서면 멈춤"), 명시적 종료조건("더 읽어도 판단 안 바뀌면 멈춘다"), minimal step([6] "가장 작은 변경" + `no-change` 상시 후보).
- 약점(의견): 재진입 arc가 명시돼 있지 않아 사실상 linear waterfall+lookup이지 feedback loop가 아니다. verifier([7]/Output Contract)가 terminal one-shot(fail→loop-back 없음).
- 아이러니(확인한 사실+의견): 스킬은 `authoring-patterns.md`의 `feedback loop`("되돌아가는 경로 없으면 loop라 부르지 마라")를 rule shape로 *가르치는데* 자기 Review Workflow엔 미적용(self-application gap). 로그 스킬 v2는 반대로 "작업 중 전제 바뀌면 loop 밀지 말고 Route/Contract Gate로 돌아가라"를 spine에 박음.

### 2) 합의된 loop 형태와 well-formed 조건

- @user 제안: `trigger → (섹션/구조) 점검 → 제안 전 검토, 하나라도 fail이면 점검으로 back → 보고·제안`. = evaluator-optimizer loop. **back-edge가 loop의 정체**(나머지는 linear pipeline에도 있음).
- well-formed 3조건(의견, 근거=`feedback loop` 정의 + 로그 스킬 Gate 교훈):
  - (a) fail의 "돌아갈 곳"을 **실패 종류별로** 분기(정보 형식 fail→표현 단계, identity 오복원 fail→맨 앞). 로그 스킬 Route/Contract Gate의 "각 분기 착지점 명시"와 동형.
  - (b) **종료·수렴 조건 + escalation**(무한 순환 방지). 스킬의 "불확실→사용자 확인"을 loop 종료조건으로 승격.
  - (c) **identity 앵커를 점검 앞에**(어떤 잣대로 점검할지가 identity·owner에서 나옴).

### 3) graph 전파로 확장 — blast radius·fail 2종·종료

- node 연산 = **구조+내용 병렬 검토**(확인한 사실: Review Workflow [2]가 변경 표면과 개념 역할을 동시 판정 → 이전 세션의 "구조·내용 병렬" 회상과 정합).
- 전파는 **전수 검토가 아니라 변경의 blast radius**만 따라간다: 그 변경이 깰 수 있는 관계(상위 역할 정의·owner map/taxonomy·inbound reference·sibling 경계·하위 skeleton/invariant)만 frontier에 올린다. 전수면 Core Invariant "판단 바꾸는 관계만" + smell `excessive read path` 위반.
- cascade: frontier 문서가 또 바뀌면 그 문서의 blast radius도 추가.
- fail 2종(의견): **local verify fail**(역할 정합 실패)→그 문서 변경 재도출로만 back / **identity-invalidation fail**(전파해보니 A의 원래 identity·owner 판정 자체가 틀림, 예: 진짜 owner가 sibling)→맨 앞(identity 복원)부터. = 로그 스킬 "전제 무너지면 Gate로".
- 종료: frontier 빔 + 최종 verify pass, 미수렴/파괴적·불확실→사용자 확인.
- 균형: 보통 frontier는 작아 1 pass 수렴. "매 리뷰=그래프 전수 순회"로 만들면 과설계.

### 4) content-review 축 gap 실측 (확인한 사실 중심)

- EXAMPLE.md 14개 사례 인벤토리: **13개가 구조/owner/identity/placement/safety 축**, 내용축에 걸치는 건 #5("Same Section Name, Different Drift Meaning") 하나뿐이며 그것도 "drift를 role로 *분류*"이지 content 충분성 *탐지*가 아니다.
- @user가 기억한 "레퍼런스 참고하라"류는 **authoring(작성) rule로만** 존재: `review-patterns.md` Owner And Scope("다른 문서 소유 내용은 복사 말고 owner로 링크/위임"), `authoring-patterns.md` Guideline Improvement("router는 시작 위치·확인 대상을 복원 가능하게"). **detection(참조가 빠졌음을 결함으로 잡기)** 쪽은 전용 smell/case 없음(가장 근접=`inferred action`·`hidden or implicit authority` 부분 겹침).
- Review Workflow [2]의 개념 역할 목록(identity·scope·owner·hierarchy·evidence·provenance·workflow·style·information format·validation)에 **content-completeness/참조 충분성 역할이 없음**. evidence·provenance는 "주장이 source에서 검증됐나"이지 "내용·참조가 빠졌나"가 아님.
- 추론: Case 13/14·`gate-driven flow`는 로그 스킬 v2 작업(Enter→spine 재구성, R2 착지점 fix)과 개념이 1:1 대응 → **로그에서 터진 뒤 역수입(back-port)한 반응적 구조로 보임**(파일 날짜 EXAMPLE.md 7월 3 + 개념 일치; git blame으로 확증 가능). 이 로그 최신 직전 블록의 "사례 14 신설(log skill 2026-07-02 Cross-Log 추상화)" 기록이 이를 뒷받침.
- 아직 미커버 2건: **content-completeness 계열** + **overlay/extension composition**(직전 세션에서 찾은 구조 gap). → "document skill이 로그 스킬 개선을 선제적으로 못 잡는다"는 @user 진단 성립.
- loop 연결(의견): 우리가 그린 loop의 node 연산 중 *내용* 축 checklist가 사실상 비어 있어, loop를 아무리 잘 그려도 노드가 내용 결함을 통과시킨다.

### 5) 자가 개선(self-improvement) 루프 제안

- 씨앗 존재(확인한 사실): EXAMPLE Case 7("Repeated Writing Problem Becomes Guideline Improvement") + `authoring-patterns.md` Guideline Improvement(반복 문제→guideline 개선 후보). 단 **리뷰 대상의 owner guideline만** 대상이고 **reflexive(스킬 자신)가 아님**.
- 최소 형태(의견): 새 subsystem 신설이 아니라 **Guideline Improvement/Case 7을 reflexive·loop 형태로 확장**(스킬 자기 규칙 "재정의 말고 재배치·경계 명확화가 새 규칙보다 작은지" 와 정합).
- 3 altitude가 같은 feedback 기계: node(구조+내용, fail→재점검) / graph(blast-radius 전파, fail→처음) / **meta(이번 리뷰가 현재 smell·case·role로 이름 못 붙이는 재발 패턴을 노출했나 → 스킬 자신의 개선 후보)**.
- meta 링 흐름: 결함 발견 → 재발성 판정(단발→park/폐기 back-edge) → 일반화 gate(domain 용어[repo·log·package명] 제거→portable, 실패시 스킬 아닌 프로젝트 규칙으로) → **dogfood**(제안된 스킬 변경을 스킬 자신의 Review Workflow+Conditional Gate로 검토) → 보고=스킬 개선 후보. **종료는 candidate 제안까지, auto-edit 금지**(owner 문서=스킬 변경은 사용자 승인).
- guard 3: (i) portability+recurrence gate(포터블 오염 방지 — SKILL/EXAMPLE의 "repo·팀·log 이름 보존 금지"), (ii) dogfooding, (iii) 종료=사용자 승인. 조건화: meta 링은 "기존 렌즈로 이름 못 붙이는 재발 패턴"일 때만 발화(아니면 `over-provisioned structure`).

### 6) 현재 상태 · 미결 · 열린 후보

- 전부 설계·보고 단계, **스킬 파일 미수정**.
- 직전 세션에서 이미 열려 있던 후보(반영 위치 미결, 관련 AskUserQuestion은 reject됨): **overlay/extension composition** 구조 gap → 반영 위치 A안(`authoring-patterns.md` Guideline Structure Models에 `overlay/extension` 한 줄) / C안(EXAMPLE Case 15) / A+C. 아직 사용자 미결정.
- 이번에 추가된 후보: **content-review 렌즈**(개념 역할에 content-completeness 축 + smell 후보 `missing pointer/reference`·`insufficient content for action`·`stale referenced content` + EXAMPLE case) 와 **self-improvement 루프 reflexive화**.
- 선택 검증: Case 13/14 back-port 여부 git blame 확증(선택).

## 2026-07-07 · [원문 보존] SKILL identity 재정립 방향 — @user 의견과 @claude 답변 verbatim

> @user 지시로 이 블록은 증류·요약 없이 원문 그대로 보존한다. 문구·의미는 손대지 않았고, @claude 답변 내부의 `##` 제목만 이 로그 블록 아래로 nesting되도록 heading 깊이를 `####`로 낮췄다(로그 목차 오염 방지, 내용 변경 아님).

### @user 의견 (원문)

결국
SKILL부터 다시 definition과 identity를 만들고 기준에 대해 만들어야 한다고 판단이든다.
방금 말했던, 문서란 정보, 지시, history 등을 담는 것이고 문서와 문서간의 상호작용, 결합등은 관심사의 분리일수도 있고 위임, 서로간 근육의 협응력 식으로 필요한 섹션에 대해 보완하는 성격 등일 수 있다.
문서의 identity에 따라 문서의 내용과 구조 목차 지시,규율,제한등에 대해 전체 규율, 전체 알아야 할것, 국소적(섹션)마다 규율, 알아야할것, 제한 등이 있을 수 있고 하잖냐?
내용은 명확해야 하는데 예를 들어
밥먹었으면 보고해, 점심먹었으면 보고해, 점심 몇시에 먹었으면 보고해 이런식이면
밥먹었으면 보고해는 점심이던 아침이던 저녁이던 새벽이던 밥을 먹는 행위 이후 보고하라는 거잖아?
점심 먹었으면 보고해는 점심을 누구는 10시 누구는 12시 누구는 11시에 먹고 보고할 수도 있고
점심 몇시에 먹었으면 보고해는 해당 시간에 먹고 보고하라는 거고

각각에 대해 압축과 내용의 의미 판단이 서로 다른데 잘못된것들은 아니라는 것이 포인트임
그리고

누구는 나열로 하고 누구는 표로 나타내고 누구는 순서대로 하는 것은 해당 정보의 표현인데 표현에 관해서는 각각의 기준이 필요하다

문서 > 섹션 > 문장 > 단어
문서 <> 섹션 ,

이런식으로 되거나 선형적일수도 비대칭일수도 반드시 모든것에 대한 정답은 없다 오로지  무엇을 나타내는 문서인가에 따라서인거 같은데
너는 어떻게 생각하는가?

### @claude 답변 (원문)

좋은 방향입니다. 이건 앞의 두 턴(enumeration 비판 → overlay/extension re-dress)을 하나로 묶는 **뿌리**라서, 제 판단을 사실/추론/의견으로 나눠 정직하게 답하겠습니다.

#### 핵심 진단 — 스킬이 자기 identity와 싸우고 있다

(추론, 근거 있음) 스킬은 이미 "모든 판단은 문서 identity를 근간으로 한다"(`SKILL.md:14`)를 **선언**합니다. 그런데 몸통은 정반대로 짜여 있습니다 — `Structure Smells` 목록, `Guideline Structure Models` 목록, `Information Format` 목록, `EXAMPLE` 14 case. 즉 **"보편 template은 없다, identity에서 도출하라"를 가르치면서 몸은 template/카탈로그의 집합**입니다. 그래서 지난 턴의 overlay/extension 문제가 필연이었습니다: 카탈로그로 지어졌으니 변종마다 항목을 늘리는 게 자연스러워지고 → 무한대. **구조가 자기 identity 선언과 모순**입니다. 당신이 "SKILL부터 definition·identity·기준을 다시"라고 한 게 이 모순을 정확히 친 겁니다.

#### 당신 모델은 맞다 (스킬 자신의 문장으로 확인)

당신 뼈대 — 문서 = 정보/지시/history의 carrier, identity("무엇을 나타내는가")가 내용·표현·구조·관계를 결정 — 는 스킬의 선언된 근간과 **같은 것**입니다. 밥/점심 예시가 특히 정확합니다(확인한 사실로 대조):

- "밥먹었으면 보고해" = 식사 행위 이후(끼니 추상화). 압축 높음.
- "점심먹었으면 보고해" = 점심 event(시각은 사람마다). 압축 중간.
- "점심 몇시에 먹었으면" = 시각까지. 압축 낮음.

셋 다 **틀린 게 아니라 서로 다른 판정을 복원**합니다. 스킬의 `authoring-patterns.md:18-19`가 정확히 이걸 말합니다 — "어떤 요소를 제거했을 때 합리적 agent가 다른 대상/판단/행동을 고를 수 있으면 충분하지 않다." 즉 올바른 압축은 "가장 짧게"가 아니라 **"identity가 요구하는 판정을 복원하는 한도에서 가장 짧게"**입니다. 지금 스킬은 이걸 `Output Contract` 맨 끝줄에 묻어두고 top-level 프레임은 "가장 짧은 쪽"으로 내걸어서, 당신 예시가 드러낸 우선순위(판정 복원 → 그 다음 최단)가 뒤집혀 있습니다.

#### 내가 한 곳 각을 세운다 — "정답 없음"의 경계

(의견, 맹종 아님) "반드시 모든 것에 대한 정답은 없다"는 **form(형태)** 에 대해서는 맞습니다. 하지만 여기서 멈추면 스킬이 "상황따라 다름 = 알아서 생각해"로 무너져 **오류를 못 잡습니다.** 당신 밥 예시가 오히려 보편 기준을 증명합니다: "밥먹었으면 보고해"는 압축이 틀린 게 아니지만, **의도가 점심 시각이 필요한데 그걸 썼다면 틀립니다.** 즉:

- 보편적인 건 **형태(압축률·표·나열)가 아니라 "그 형태가 identity가 요구하는 판정을 복원하는가"라는 테스트**입니다.
- form은 identity-상대적, **derivation 불변식(판정 복원 테스트)은 보편.**

이렇게 잡아야 스킬이 "identity에 맞으니 옳다"와 "그냥 틀렸다"를 구분할 이빨을 유지합니다. 당신 문장을 부정하는 게 아니라 완성하는 겁니다.

#### 그래서 rebuild 골격 제안 (axes-primary, catalog는 instance로 강등)

(제안 · 파일 미수정) 카탈로그가 아니라 **identity에서 도출하는 축(axis)** 을 몸통으로:

1. **Definition** — 문서 = 정보/지시/history의 durable carrier. identity = "무엇을 나타내는 문서인가."
2. **Master invariant** — 내용·표현·구조·관계의 모든 판단은 identity에서 도출한다. 규칙이 identity와 충돌하면 identity 우선. (지금은 서문 → **조직 축으로 승격**)
3. **Derivation axes** (몸통, 카탈로그 대체):
   - **내용/압축 축** — identity가 요구하는 판정을 복원하는 만큼만 담는다. 압축률은 identity가 정한다(밥 예시). 불변식: 빼도 판정 불변=과잉, 빼면 판정 변화=부족.
   - **표현 축** — 형태(나열/표/순서/prose/정의)는 "그 정보가 무엇인가"로 고른다. 형태별 세부는 이 축의 instance.
   - **구조 관계 축** — 문서>섹션>문장>단어(계층) vs 문서<>섹션(상호) vs linear vs 비대칭. "무엇을 나타내는가"가 정한다. 보편 형태 없음.
   - **규율 고도 축** — 모든 규율/제한/알아야 할 것은 **전체(global)** 인지 **국소(섹션)** 인지 고도가 있고, 독자가 그 고도를 복원할 수 있어야 한다. (지금 스킬에 명시 안 된 새 축 — altitude-mismatch 렌즈를 문서 *내부*로 돌린 것)
   - **문서-대-문서 관계 축** — 관심사 분리 / 위임 / 협응 보완(둘이 나눠 갖고 어느 쪽도 종속 아님). 이게 내용이 남을지·링크할지·공유할지를 정한다.
4. **Catalog 강등** — Smells / Structure Models / Information Format / EXAMPLE은 위 축의 **예시(instance)** 로 내려가고, 추가는 지난 턴의 **recurrence gate**(실제 반복 + 기존 축으로 복원 불가)를 통과할 때만. → 무한대 차단.

overlay/extension은 이 골격에서 자동 해소됩니다 — "문서-대-문서 관계 축"의 한 파라미터(비대칭 보완)일 뿐 새 model이 아니니까.

#### 순서·위험 경고 (반드시 짚어야 함)

(사실+의견) 이건 **identity-level 변경 = 스킬에서 가능한 최고 blast radius**입니다. 스킬 자신의 `Content Or Identity Change` gate(`SKILL.md:85`)가 "identity·scope 변경은 증거 기준을 높이고 inbound reference를 명시적 migration 없이 깨지 마라"고 요구합니다. 함의 두 가지:

- **loop 재구성(node/graph/meta)은 이 아래 workflow 고도**입니다. 지난 세션들의 loop overlay는 사실 **뿌리보다 먼저 지붕을 손댄 것**이었습니다. 순서는 identity/definition 재정립 → 거기서 workflow(loop) 도출 → catalog는 instance. 지금 당신이 뿌리로 되돌린 게 맞습니다.
- 재작성 시 `review-patterns.md`·`authoring-patterns.md`·`EXAMPLE.md`·frontmatter `description` 전부 migration 대상 — 새 축에 재배치되지 옛 카탈로그로 남으면 안 됩니다.

#### 다음

제 제안: 카탈로그 재배치는 나중이고, **먼저 rebuilt Definition + Identity + Master invariant + 5 derivation axes를 한 페이지 초안**으로 잡아 당신 검토를 받는 게 순서입니다(그게 정해져야 나머지가 거기서 derive됨). 스킬 파일은 승인 전까지 손대지 않고 초안만 보고하겠습니다.

이 골격으로 identity 초안을 써 볼까요, 아니면 5개 축 중 이견 있는 축(특히 제가 세운 "정답 없음의 경계", 그리고 새로 넣은 "규율 고도 축")부터 합의하고 갈까요?

## 2026-07-07 · 결정 — document-structure-review 전면 개편 확정(identity-first + Review Loop)

@user가 부분 패치(loop overlay)를 폐기하고 **전면 개편**을 승인했다. 앞 `[원문 보존]` 블록의 진단 — 스킬이 "모든 판단은 identity에서 도출"을 선언하면서 몸통은 카탈로그(Structure Smells·Guideline Structure Models·Information Format·EXAMPLE)로 지어져 변종마다 항목이 늘어나는 무한 enumeration에 빠지고, 그래서 구조가 자기 identity 선언과 모순 — 이 개편의 근거다.

### 결정 내용

- **전면 개편**: SKILL.md를 identity-first로 재작성한다. loop 재구성(node/graph/meta)은 별도 overlay가 아니라 이 개편의 **workflow 고도**로 통합한다.
- **실행 순서**: spine(Definition·Master invariant·5 derivation axes·Review Loop) 먼저 확정·반영(W1) → 승인 후 references 3파일 + frontmatter description을 5축 instance로 migration(W2). 뿌리가 틀리면 파생물이 낭비되므로 spine 우선.
- **핵심 설계 확정**:
  - Definition: 문서 = 정보·지시·history를 담는 durable carrier. identity = "이 문서가 무엇을 나타내는가".
  - Master invariant: 압축률·표현 형태·구조 관계에 **보편 정답 없음(identity-상대)**. 보편은 형태가 아니라 **"판정 복원 테스트"**(선택 형태가 identity가 요구하는 판정을 독자가 복원하게 하는가). "가장 짧게"는 복원 테스트 통과 후 tiebreaker로 강등.
  - 5 derivation axes: ① 내용·압축(요구 판정 복원 만큼만; 빼도 판정 불변=과잉, 빼면 판정 변화=부족; 행동 문장은 요구 행동·owner 지목) ② 표현(형태는 정보 성격으로 선택) ③ 구조 관계(계층/상호/선형/비대칭은 identity가 결정) ④ 규율 고도(global·local, 독자가 고도 복원 가능해야) ⑤ 문서-대-문서 관계(관심사 분리/위임/협응 보완).
  - Review Loop: Node Operation(구조+내용 병렬 평가, N7 verify에서 pass / local-verify-fail→N4 / identity-invalidation-fail→N1 분기) · Propagation(blast-radius bounded, 전수 아님) · Termination(frontier 빔+verify pass=수렴, 미수렴·파괴적·불확실→사용자 확인) · Meta Ring(reflexive 자가개선, 기존 축으로 이름 못 붙이는 재발 패턴만 발화, portable 일반화→dogfood→후보 제안까지, auto-edit 금지).
  - **overlay/extension 미결(A/C/A+C) 해소**: 문서-대-문서 관계 축의 "비대칭 보완" 파라미터로 흡수 → 별도 structure model이나 EXAMPLE case 불필요.
- **보존(삭제 아님)**: 기존 Core Invariants의 규율(ancestor-not-axiom, 판단 바꾸는 관계만 읽기, inferred-action 금지, 불확실→확인), 4개 Change Gate, Reference Routing, Output Contract 항목은 축·loop·gate로 재배치. references 3파일은 아직 미수정.

### 상태

- **스킬 파일 미수정.** 아래 draft는 @user 승인 대기(W1). 승인 시 SKILL.md에 반영 후 W2(references migration) 착수.

### Draft 개정 이력

- rev1 (@claude): 초안 — identity-first spine + 5 derivation axes + Review Loop.
- rev2 (@user 검토 5건): Scope 보고를 사실·추론·의견·제안 4분류로 정합; 문서-대-문서 관계·표현 축 목록을 open(`대표적으로 … 등`); 구조 관계 `baseline`→`초기 후보로 비교`; Output Contract에 content 경계·authority 불확실성 guard bullet 복원.
- rev3 (codex 검토 2건): 본문·Output Contract의 `가장 짧은 쪽` 계열을 판정 복원 후 `독자 비용 최소`로 교체(짧음은 한 요소); 내용·압축 축에 `충분/과잉은 문맥·identity 판정 단위 기준이며 해결은 최대 압축이 아니라 필요한 판정을 잃지 않는 밀도`를 추가.

### SKILL.md rebuild draft (승인 대기 · 미반영)

````markdown
---
name: document-structure-review
description:
  Use when an agent needs to create, delete, structurally review, design, or refine durable documents,
  documentation rules, authoring guides, templates, skeletons, or review feedback. Recovers the document's
  identity — what it represents — from the document and its parent and sibling relationships, then derives
  content, representation, structure, rule-altitude, and document-relation judgments from that identity
  through a review loop that propagates only along a change's blast radius.
---

# Document Structure Review

## Definition And Identity

문서는 정보, 지시, history를 담는 durable carrier다. 이 skill의 모든 판단의 근간은 대상
문서의 **identity — "이 문서가 무엇을 나타내는가"** 다. 문서 자체와 parent, 관련 sibling이
정의하는 역할에서 identity를 복원하고, 그 identity에서 내용, 표현, 구조, 규율 고도,
문서-대-문서 관계 판단을 도출한다. 존재·위치·경계·상태·내용을 바꾸는 변경마다 기존 identity가
여전히 유효한지, 관련 문서의 역할 정의와 참조를 함께 바꿔야 하는지 확인한다. 아래 모든 축·loop·
gate·reference는 이 근간을 상황별로 실행하는 도구이며, 다른 규칙이 identity 판단과 충돌하면
identity 판단을 우선한다.

parent와 sibling의 확정된 권위는 기본 constraint이지만 axiom은 아니다. 충돌하면 하위 제안을
수정·기각하거나, 충분한 근거와 해당 owner의 change 절차를 갖춰 상위 변경 후보로 올린다.

**Master invariant — 정답은 형태가 아니라 복원이다.** 같은 내용을 담는 압축률·표현 형태·구조
관계에 보편 정답은 없다. 무엇이 옳은지는 identity가 정한다. 단 모든 형태에 걸치는 보편 기준이
하나 있다: **선택한 형태가 identity가 요구하는 판정을 독자가 복원하게 하는가.** 이 테스트를
통과하는 형태들 사이에서만 독자 비용이 가장 작은 쪽을 택한다. "가장 짧게"는 복원 테스트를
통과한 다음의 tiebreaker이지 1차 기준이 아니다.

Scope:

- durable document의 생성·삭제·검토, owner·scope 배치, 개념 위치, 작성 지침·template 구조,
  정보 표현 형태를 판단하는 portable 절차다.
- 특정 프로젝트의 taxonomy, 문서 형식, current work, 기록 위치, closeout·owner handoff를
  소유하지 않는다. 프로젝트가 지정한 계약·change 절차 아래에서 판단한다.
- 사용자 의도는 중요한 근거지만 자동 정답은 아니다. 확인된 계약·corpus와 충돌하면 사실·추론·
  의견·제안을 구분해 보고한다.

## Derivation Axes

identity에서 내려오는 다섯 축이다. 각 축은 형태의 정답을 미리 정하지 않고, 그 형태가 identity가
요구하는 판정을 복원하는지로 판단한다. 각 축의 세부 사례·smell·형식 목록은 필요할 때만
`Reference Routing`으로 읽고, 목록에 항목을 늘리기 전에 그 항목이 기존 축으로 복원 불가한 재발
패턴인지 먼저 본다. 단순 변종은 추가하지 않는다.

- **내용·압축** — identity가 요구하는 판정을 복원하는 만큼만 담는다. 압축률(행위 수준인지,
  event 수준인지, 값까지인지)은 identity가 정하며 어느 하나가 보편 정답이 아니다. 불변식: 어떤
  요소를 빼도 판정이 같으면 과잉이고, 빼면 합리적 agent가 다른 대상·판단·행동을 고를 수 있으면
  부족이다. 문장은 독립적으로 충분하거나 과잉인 것이 아니다. 앞뒤 문맥과 문서 identity가 요구하는
  판정 단위를 먼저 복원한 뒤, 그 문장이 그 판정을 만들 만큼 충분한지 본다. 해결은 항상 더 짧게
  압축하는 것이 아니라, 필요한 판정을 잃지 않는 밀도를 맞추는 것이다. 행동으로 넘기는 문장(라우팅·
  gate 종결·step)이 요구 행동을 지목하지 않고 상태·라벨에
  그치면 독자가 행동을 추론해야 하므로 부족이다. 행동을 다른 절이 소유하면 그 owner까지 지목한다.
- **표현** — 나열·표·순서·prose·정의·code·callout 등의 형태는 "그 정보가 무엇인가"로 고른다.
  순서가 의미면 numbered, 독립 항목이면 bullet, 두 축 lookup이면 table, 서사·why면 prose,
  term-정의 쌍이면 definition. 형태 선택 후 그 형태가 판정 복원을 방해하지 않는지 확인한다.
- **구조 관계** — 문서>섹션>문장>단어의 계층인지, 문서<>섹션의 상호 참조인지, 선형인지
  비대칭인지는 identity가 정한다. 보편 형태가 없으므로 대칭·계층을 초기 후보로 비교하되 identity가
  요구하면 비대칭·상호 관계를 쓴다.
- **규율 고도** — 규율·제한·"알아야 할 것"은 문서 전체(global)에 걸리는지 특정 섹션(local)에만
  걸리는지 고도가 있다. 각 규율을 그 고도에 두고, 독자가 어느 고도의 규율인지 복원할 수 있게
  한다. 국소 규율을 전체처럼, 전체 규율을 국소처럼 두지 않는다.
- **문서-대-문서 관계** — 두 문서의 결합은 대표적으로 관심사 분리, 위임, 협응 보완(둘이 필요한
  부분을 나눠 갖고 어느 쪽도 종속이 아님) 등을 포함한다. 이 관계가 내용을 현재 문서에 남길지, owner로
  링크·위임할지, 공유 섹션으로 보완할지를 정한다. 물리적 nesting·경로·공유 template만으로
  ownership이나 상속을 단정하지 않는다.

## Review Loop

문서 검토·작성은 identity 앵커에서 출발해, 변경의 blast radius를 따라 도는 loop다. frontier는
처음에 대상 문서 하나다.

### Node Operation (frontier의 각 문서)

1. 대상 문서의 intended identity와 근거를 복원한다. 근거는 user prompt, project/root contract,
   parent/child guideline, owner map, 관련 sibling, 실제 corpus에서 찾는다. 새 문서는 user
   intent와 parent·owner map·sibling에서 identity를 설계한다.
2. 변경 표면을 존재·위치·경계·상태·내용으로 분류하고, **구조와 내용을 병렬로** 다섯 축(내용·
   압축 / 표현 / 구조 관계 / 규율 고도 / 문서-대-문서 관계) 위에서 판정한다. 한 결함이 여러
   축에 걸치면 하나로 못 박지 말고 관련 축을 모두 route한다.
3. 판단을 바꿀 수 있는 관계 문서만 읽는다. 단순 불안으로 모든 ancestor·sibling·child·corpus로
   확장하지 않는다.
4. 책임 owner와 변경 위치를 정하고 local-only, ancestor-only, both, no-change 후보를 비교한다.
   문제 문서가 항상 변경 대상이라고 가정하지 않는다.
5. 변경 유형에 해당하는 `Change Gates`를 적용한다.
6. 역할 정합과 필요한 전파를 모두 충족하는 후보 중 가장 작은 변경을 수행한다. 내용 위치를 정한
   뒤 표현 축으로 형태를 고르고, 복원 테스트를 통과한 후보들 사이에서 독자 비용이 가장 작은 쪽을
   택한다. 짧음은 그 판단의 한 요소일 뿐이다.
7. 이 문서와 직접 관련 문서의 identity·참조가 유효한지 검증하고 결과를 분기한다:
   - **pass** → 이 문서 node를 닫고 `Propagation`으로 간다.
   - **local verify fail**(역할 정합 실패) → 4로 돌아가 이 문서 변경만 재도출한다.
   - **identity-invalidation fail**(전파 결과 이 문서의 원래 identity·owner 판정 자체가 틀림)
     → 1로 돌아가 identity 복원부터 다시 한다.

### Propagation

- pass한 변경이 깰 수 있는 관계만 blast radius로 산출한다: 상위 역할 정의, owner map·taxonomy,
  inbound reference, sibling 경계, 하위 skeleton·invariant. 전수 검토가 아니라 판정을 바꿀
  관계만 올린다.
- blast radius의 각 문서를 frontier에 추가하고 Node Operation을 재적용한다. frontier 문서가 또
  바뀌면 그 문서의 blast radius도 추가한다.

### Termination

- frontier가 비고 최종 verify가 pass하면 수렴이다. 보통 blast radius가 작아 한 번에 수렴한다.
- 미수렴(순환·발산), 파괴적 변경, 또는 identity·경계·authority가 불확실하면 추측하지 않고
  사용자에게 확인한다.
- "매 검토 = 전체 문서군 순회"로 만들지 않는다. 그 자체가 과설계다.

### Meta Ring (스킬 자기 개선, 조건부·비차단)

- 이번 검토가 현재 축·gate·smell·case로 이름 붙일 수 없는 재발 패턴을 노출했을 때만 발화한다.
  아니면 발화하지 않는다.
- 재발이 아니면 park하고, 재발이면 domain 용어(특정 repo·팀·log 이름)를 제거해 portable한지
  본다. portable하지 않으면 스킬이 아니라 프로젝트 규칙 후보다.
- 제안된 스킬 변경은 이 스킬의 Review Loop와 Change Gates로 자기 검토(dogfood)한다.
- 종료는 스킬 개선 후보 제안까지다. 스킬은 owner 문서이므로 자동 편집하지 않고 사용자 승인을
  받는다.

## Change Gates

변경 유형에 해당하는 gate만 Node Operation 5단계에서 적용한다. gate는 축을 특정 변경에 적용한
instance다.

### New Document

- 같은 책임을 기존 owner 문서·섹션이 이미 소유하는지, 기존 문맥에 흡수 가능한지 먼저 확인한다.
- owner, scope, reader, lifecycle, change coupling의 실제 차이가 독립 identity를 요구할 때만 새
  문서를 만든다.
- 생성 전 intended identity, owner·scope, parent·sibling 관계와 배치를 정하고, 생성 후 parent
  taxonomy·index·inbound reference·sibling 경계가 새 역할을 옳게 설명하는지 확인한다.

### Content Or Identity Change

- 새 내용이 기존 identity와 같은 owner·scope이면 흡수하고, 하위 개념이면 필요한 섹션에 배치한다.
- identity·scope를 초과하면 국소적으로 끼우지 않는다. owner 위임, scope 확장, 문서 분리, 상위
  개념 승격을 비교한다.
- 이동·rename·split·merge·identity/scope 변경은 증거 기준을 높이고, 기존 anchor·inbound
  reference를 명시적 migration 없이 깨지 않는다.

### Destructive Change

- 삭제·대체·archive·status 전환 전에는 이 문서로만 복원되는 knowledge(rationale, trade-off,
  rejected alternative, re-evaluation 조건)가 다른 owner나 code에 남는지 확인한다.
- 참조가 current authority·active work·implementation용인지 provenance-only인지 분류한다. 보존
  이나 참조 영향이 불확실하면 보류·보강·새 문서·사용자 확인 같은 비파괴 fallback을 택한다.

### Guideline Or Template Change

- default section·template을 중립으로 보지 않는다. 실제 반복 subtype과 누락 위험이 확인될 때만
  추가하고, 기존 문맥 흡수나 invariant가 더 작은 해결인지 먼저 본다.
- 개념보다 좁게 명명된 section·scope가 다른 subtype이나 subtype 없는 경우를 누락시키지 않는지
  확인한다. 좁은 identity는 새 section 전에 rename·일반화·scope 재정의로 개념과 맞춘다.
- 사례·corpus는 규칙을 검증하는 입력이지 자동 template이 아니다.

## Reference Routing

모든 reference는 선택 도구다. 현재 판단을 바꾸는 조건에 해당할 때만 읽는다. 각 reference의
목록은 다섯 축의 instance이며, 항목 추가는 recurrence gate(실제 반복 + 기존 축으로 복원 불가)를
통과할 때만 한다.

- 구조 문제 분류, context read path, 개념 위치, owner·scope·변경 위치가 애매하면
  `references/review-patterns.md`.
- rule shape, wording, 표현 형태, guideline/template 구조나 sibling guide 비교가 필요하면
  `references/authoring-patterns.md`.
- 위 기준을 concrete scenario에 적용하는 방식이 애매하면 `references/EXAMPLE.md`의 관련 사례만.

## Output Contract

최종 제안·수정안에는 관련 항목만 적용한다.

- 확인한 사실, 추론, 의견과 제안을 구분했는가?
- 대상 문서의 identity와 그 근거를 복원했는가?
- 내용·표현·구조·규율 고도·문서 관계 판단을 그 identity에서 도출했는가?
- 선택한 형태가 identity가 요구하는 판정을 복원하며, 그 다음에야 독자 비용이 가장 작은가? (복원을 깨면서
  줄이지 않았는가, 판정이 같은데 남기지 않았는가?)
- owner·scope·변경 위치가 적절하며 필요한 gate를 적용했는가? parent 역할 정의, owner map,
  inbound reference, sibling 경계가 계속 유효한가?
- 불확실한 content 경계·authority나 파괴적 변경을 추측으로 통과시키지 않았는가?
- loop가 수렴했거나, 미수렴을 추측으로 종결하지 않고 escalation했는가?
````

## 2026-07-07 · W1 완료 — SKILL.md 전면 개편 반영

rev3 draft를 `.agents/skills/document-structure-review/SKILL.md`에 전면 재작성으로 반영했다. Review Loop(Node/Propagation/Termination/Meta)는 이 개편의 workflow 고도로 spine에 포함됐다. `.claude/skills/document-structure-review`는 `.agents/skills/`로의 symlink라 한 파일 반영으로 양쪽이 갱신된다.

**검증 ledger** (다른 agent가 이 로그만으로 pass/fail 가능):

- 새 섹션 존재(grep): Definition And Identity / Derivation Axes / Review Loop(Node Operation·Propagation·Termination·Meta Ring) / Change Gates(New Document·Content Or Identity Change·Destructive Change·Guideline Or Template Change) / Reference Routing / Output Contract.
- 구 카탈로그 섹션명 제거: `Core Invariants`·`Structure Smells`·`Guideline Structure Models`·`Conditional Gates` = 0건.
- frontmatter description identity-first로 갱신, 스킬 index에도 반영됨. 파일 182줄.
- 구 규율 재배치 확인: ancestor-not-axiom → Definition And Identity 2단락; 판단 바꾸는 관계만 읽기 → Node 3·Propagation; inferred-action 금지 → 내용·압축 축; 불확실→사용자 확인 → Termination·Output Contract; 4 Change Gate 내용 → Change Gates 유지.

**미반영(다음 W)**: references 3파일 + 표현 축 매핑 문장 relocate = W2. loop 운영 dogfood 검증 = W3.

Next: W2 — references(review-patterns·authoring-patterns·EXAMPLE)와 description을 5축 instance로 migration. W1 결과에 대한 codex 검토 프롬프트는 이 세션에서 @user에게 전달했다.

## 2026-07-07 · codex W1 리뷰 반영 — spine 3건 + W2 라우팅

codex가 W1(SKILL.md 전면 개편) 결과를 검토해 finding 5건 + pass 판정을 냈다(회귀: ancestor-not-axiom·판단 바꾸는 관계만 읽기·destructive gate·불확실→사용자 확인 보존 확인). 각 finding을 근거로 평가해 **spine 차원 3건만 지금 반영**하고, **reference 차원 2건은 W2로 라우팅**했다. codex 원본 판정도 finding 1을 "W2에서 최우선"으로 시퀀싱했다.

**spine 반영(SKILL.md, 지금):**

- **Finding 2 [Low-Med] 회귀 복원** — 구 Output Contract의 inferred-action 직접 체크가 spine 이동 후 최종 checklist에서 누락됐다는 지적. Output Contract에 bullet 1개 복원: "행동으로 넘기는 문장이 요구 행동을, 다른 절이 owner면 그 owner까지 복원하게 하는가?". (신규 카탈로그 항목이 아니라 드롭된 체크 복원이므로 enumeration creep 아님.)
- **Finding 3 [Low] 모호성 축소** — Node 6 "가장 작은 변경"이 diff/blast/identity-cost 중 무엇인지 모호. "blast radius가 가장 작은 변경"으로 metric 명시. 뒤 문장의 "독자 비용 최소"는 형태 선택(표현 축) 몫으로 분리 → change 선택=blast radius, form 선택=독자 비용으로 clean split.
- **Finding 4 [Low] back-edge 경계 선명화** — N7 분기 괄호 보강. local verify fail = "복원한 identity·owner는 유지되나 변경 위치·형태·owner 후보가 검증 실패"; identity-invalidation fail = "새 근거·전파 결과가 이 문서의 원래 identity·owner 복원 자체를 뒤집음". 두 back-edge의 발화 조건을 실행 가능하게 구분.

**W2 라우팅(지금 미반영):**

- **Finding 1 [Medium] = W2 최우선** — `references/authoring-patterns.md:56` "가장 짧은 쪽을 택한다"가 새 Master invariant("복원 후 독자 비용 최소, 짧음은 한 요소")와 **직접 충돌**. spine이 이 reference로 라우팅하므로 W2 완료 전까지는 reference를 읽은 agent가 압축 우선으로 오해할 interim risk가 있다(확인된 사실). W2 migration의 첫 항목으로 처리한다.
- **Finding 5 [Low] = W2 relocate** — 표현 축 매핑 문장(SKILL.md:56 "순서가 의미면 numbered…")이 spine에서 카탈로그처럼 읽힘. codex도 W1-breaker는 아니고 axis 실행 예시 역할은 인정하되 authoring-patterns Information Format instance로 내리는 데 동의. W2 relocate 대상(W1 ledger가 이미 표시).

**검증 ledger**(다른 agent가 pass/fail 가능): SKILL.md에서 (a) Output Contract에 inferred-action bullet 1개 존재, (b) Node 6에 "blast radius가 가장 작은 변경" 존재, (c) N7 두 fail 괄호가 위 문구로 교체됨. reference 파일 2건은 이 블록 시점 무변경(W2 대상).

Next: W2 — Finding 1(authoring-patterns Information Format 첫 문장 + table "짧은지" 표현을 새 기준으로) 최우선, Finding 5(표현 축 매핑 문장 relocate) 포함해 references 3파일 + description을 5축 instance로 migration.

## 2026-07-07 · loop 구조 제안 능력 — 표현 축 배치 확정 (Claude+codex 2라운드 합의)

**배경:** @user 요청 = "대상 문서 구조 개선안으로 loop를 제안할 수 있어야 한다". 이는 skill의 *수행* loop(spine `Review Loop`)와 다른 층위 = skill이 대상 문서에 내놓는 *출력(제안) 레퍼토리*다. Claude가 축/배치를 판정하고 codex가 2라운드 재검토해 전 쟁점 합의.

**확정 사항:**

- **축:** 표현 축 1차 + 구조 관계 축 교차. numbered vs flow vs loop는 같은 절차 정보의 표현 형태 선택이라 1차는 표현 축. 문서 전체 섹션 배열이 선형/재진입/순환일 때만 구조 관계 축 교차. (codex가 Claude 이의 수용, 처음엔 "구조 관계 축"으로 제안했다가 정정.)
- **본문/reference 분해:** 본문 = "언제 flow/loop 후보인가 / 무엇이 아니면 loop가 아닌가" 판정 불변식만. 요소 spec(entry·state·operation·back-edge·termination·escalation)은 `references/authoring-patterns.md` `Rule Shape`가 소유. 요소 목록을 본문에 넣으면 W1이 진단한 enumeration 회귀.
- **negative invariant 위치:** "종료 조건 없이 되돌아가는 경로만 있으면 well-formed loop가 아니다"는 본문에 짧게 1회 + 세부는 reference. codex: 중복이 아니라 라우팅 기준. 기존 `feedback loop` 정의는 `gate-driven flow`의 종료조건을 상속하므로 암묵적으론 존재 → 명시 negative invariant로 승격.
- **문안:** codex "절차·규칙" → "절차·workflow·검토 흐름"(규칙 자체는 loop성 행동이 없을 수 있음) 수용.
- **feedback loop 삭제 판정 철회** 재확인. spine `Review Loop`(수행)와 `Rule Shape` `feedback loop`(제안)는 층위가 달라 중복 아님.

**확정 본문 문안 (표현 축에 추가):**

> 절차·workflow·검토 흐름처럼 독자 행동이 반복·재진입·검증·종료를 요구하면 단순 나열 대신 gate/flow/loop 형태를 후보로 본다. 되돌아갈 경로와 종료 조건을 함께 복원하지 못하면 well-formed loop가 아니다. 구성요소별 판정은 `Rule Shape`가 소유한다.

**W2 반영 항목:** (1) 위 문안을 표현 축에 추가(단, 표현 축은 W2에서 Finding 5 매핑 문장 relocate와 함께 통째로 정합하므로 그때 삽입). (2) `Rule Shape`의 `gate-driven flow`/`feedback loop` 정의 강화 — 요소 spec 정리 + "종료 없는 back-edge ≠ well-formed loop" 명시. (3) Node Operation 표현축 평가가 이 제안을 실제로 트리거하는지 연결 확인.

**W3 이월:** progress signal · 반복 중 invariant는 대상 문서의 표현 형태 선택이 아니라 skill 자신 `Review Loop` 운영 검증 → W3(loop dogfood). codex 동의.

Next: W2 착수 승인 시 표현 축(Finding 1·5 + 위 loop 문안) + `Rule Shape` loop shape 강화를 함께 반영. skill 파일은 승인 후 수정.

## 2026-07-07 · W2 draft 확장 — restoration gap 도입 (검토 중, 미반영)

@user가 codex "runtime/dry-run gap" 추가 논의를 전달 → Claude 검토 6판정 → fork(opus, 맥락 상속) 2차 draft 확장. skill 파일 미반영, draft 전문은 scratchpad `w2-draft-restoration-gap.md`. codex 교차 예정.

**개념:** loop는 여러 구조 후보(state machine·routing map·decision table 등) 중 하나. 이들을 본문에 나열하면 W1이 비판한 enumeration 회귀. 대신 문서를 실제 실행/dry-run해 "독자가 다음 판정·행동을 복원하지 못하는 지점(restoration gap)"을 먼저 잡고, 반복 gap만 pattern으로 승격한다. restoration gap = Master invariant("독자가 판정을 복원하는가")의 *동적* 버전.

**Claude 검토 6판정 (codex 논의, 사실/추론/의견):**
1. [의견] W1 identity-first 정합 — smell 나열 대신 gap 먼저 = W1 anti-enumeration 정신.
2. [추론] enumeration 방지 조건부 충분 — 복원 실패 예시(다음행동·착지점·재진입·종료·escalation·owner·근거)를 닫힌 목록으로 못박지 말 것. 핵심은 "dry-run해서 복원 안 되는가" 단일 테스트.
3. [의견] 축: 5축이 아니다. Node Operation(gap 탐지) + Output Contract(체크). gap을 어떤 형태로 메우나가 표현·구조 관계 축.
4. [의견] loop 외 구조 후보: `Rule Shape`에도 무한 나열 금지, recurrence+portable gate 통과분만.
5. [의견] 이름: "runtime gap" 폐기(코드 느낌) → **restoration gap**(skill "복원" 어휘·Master invariant 정합). 방법=dry-run.
6. [추론] log package-signal 재검토 착지점 사례: 1회라 EXAMPLE 미승격, Node Op 원칙 motivation 근거로만.

**fork 2차 draft 변경 지점:** Node Op step2에 dry-run restoration gap 탐지 / Output Contract에 gap 체크 bullet / 표현 축 Master invariant 중복 문장 제거 / Rule Shape 6요소 inline prose→definition 전환 + recurrence gate 도입 문구 / Information Format 1차 유지. 보류: state machine·routing map·checklist·invariant set 등(기존 축·shape로 복원, recurrence 미충족).

**Claude 개선 3점(codex 교차에 포함):** ① Node Op step2 "다섯 축 판정" 2회 서술 → 두 gap 소스를 한 번으로 통합. ② Output Contract 7개 예시가 Node Op와 반복 → "restoration gap이 남지 않았는가?"로 축약, 정의는 Node Op 소유. ③ Rule Shape 요소6 bullet/shape2 bullet 시각 계층 평평 → 구분 강화.

Next: codex 교차 → 개선 3점 확정 → SKILL.md(Node Op·Output Contract·표현 축) + authoring-patterns(Rule Shape·Information Format) **일괄 반영**. (⚠️ 이 로그 2600줄+ = hard threshold 초과, split 검토 별도 필요.)

## 2026-07-07 · W2 부분 반영 완료 — restoration gap + 표현 축·Rule Shape

codex "반영 가" 판정 후 fork(opus)가 사양(scratchpad `w2-apply-spec.md`)대로 실제 편집, Claude 독립 grep 재검증 완료. skill 파일 반영됨(`.claude`는 `.agents` symlink, 양쪽 동기 확인). 개선 3점 + codex 조정 모두 반영.

**검증 ledger (다른 agent가 이 로그만으로 pass/fail 가능):**

- `SKILL.md`: `restoration gap` 2곳 — `:85`(Node Op step2 dry-run 탐지, 명시적 변경 표면과 함께 5축 route로 통합), `:187`(Output Contract 체크 1줄, 예시 정의는 Node Op 소유). 표현 축(`:56–59`) loop 후보 판정 3문안 + Master invariant 중복 문장 제거, 구 매핑 문장 "순서가 의미면 numbered" 0건. Node 6 blast radius·N7 back-edge·Master invariant 정합 유지.
- `references/authoring-patterns.md`: Rule Shape recurrence gate 도입 문구(`:29`), 공통 요소 6 definition(`:44–49`) + 도입문 2개("두 shape는 아래 공통 요소로 복원한다"`:42` / "각 shape는 이 요소로 정의한다"`:51`)로 요소↔shape 계층 분리, gate-driven flow=단방향(`:56`), feedback loop 종료 invariant(`:60`). Information Format 첫 문장 압축우선→"정보 성격으로 고른다"(`:73`), 압축우선 잔존 0건.

**개선 3점 반영 확인:** ① Node Op "5축 판정" 1회로 통합(두 입력=명시 변경+dry-run gap) ② Output Contract 예시 7개 반복 제거→1줄 ③ Rule Shape 요소/shape 계층 분리. codex 조정: dry-run은 "판단·행동" 유지(정보 문서 배제 안 함). fork minor: 편집 4·5를 전체 교체 대신 targeted sub-edit(미변경 항목 재작성 회피=minimal change, 결과 동일).

**W2 잔여 (미완):** ① `references/review-patterns.md`(Context Read Path·Concept Placement·Structure Smells·Owner And Scope·Change Location)를 5축 instance로 재앵커 — 특히 Structure Smells 카탈로그를 축별 detector로 재그룹. ② `references/EXAMPLE.md` 14 cases 재태그 + recurrence gate 정리 + overlay/extension을 문서-대-문서 관계 비대칭 보완 case로 흡수. ③ frontmatter description 5축 정합 재확인(W1서 identity-first 갱신됨, likely no-op).

Next: W2 잔여 3항목(review-patterns 우선). **로그 split 안 함(@user 결정 2026-07-07):** 단일 topic 연속 작업이고 W1↔W2가 강결합(loop 확정→반영이 잔여의 전제)이라 분리 시 read path가 끊긴다. hard threshold 초과에도 단일 수명 유지. 다음 세션은 warm-start 프롬프트로 재개(@user에게 전달함).

## 2026-07-08 · W2 잔여 ① review-patterns 재앵커 반영 + ③ description no-op 확인

warm-start 재개. Claude가 `references/review-patterns.md` 재앵커 draft를 만들어 제시 → codex 교차(@user 전달) = "반영 가, 단 문안 3곳 보정" → 세 보정 근거 평가·수용 후 실제 skill 파일 반영 → Claude 독립 grep 검증. draft 최종본 = scratchpad `w2-review-patterns-reanchor-draft.md`.

**세 보정(codex → 수용):**

- intro 첫 문장: "각 smell은 한 축의 복원 테스트 실패" → "identity anchor 또는 다섯 축의 복원 테스트 실패". (보정 1은 draft의 내적 모순을 짚음: intro가 "각 smell=한 축 실패"라면서 마지막 그룹은 "축이 아닌 identity 근간"이라 라벨 → 자기충돌. 보정이 해소.)
- identity 근간 라벨: "identity 근간 복원 실패" → "…(축 이전 anchor)". 6번째 축 오독 방지.
- `abstract destructive gate`에 cross-note "(내용·압축·Destructive Change gate도 함께 깬다)". 설명문이 이미 판단입력 누락을 서술하므로 일관.

**반영 내용(references/review-patterns.md):** Structure Smells를 4개 임시 범주(소유·권위 / 정체성·역할 경계 / 구조비용·독자경로 / 표현·안전장치) → 5축 + identity 근간(축 이전 anchor)으로 재그룹. 각 smell을 "어느 축의 복원 테스트를 깨는가"로 재정의하고 restoration gap과 연결(smell = dry-run 없이 알아보는 정적 restoration gap; 동적 gap은 Node Operation이 모음). intro에 "각 절 = 5축·Review Loop의 concrete instance + recurrence gate" 연결문 1줄 추가. 다른 절(Context Read Path·Concept Placement·Owner And Scope·Change Location)은 이미 축 정합 → 실질 무변경.

**smell 축 배치(14 잔존):** 내용·압축=over-provisioned structure / 표현=misaligned reader path·abstract destructive gate / 구조 관계=hidden sub-kind·mixed concept roles / 규율 고도=hidden or implicit authority·orphan local rule·owner or altitude mismatch / 문서-대-문서=duplicated ownership·reverse or circular dependency·contradiction·copied section meaning·excessive read path / identity 근간=under-scoped identity. 복합 smell은 primary 축 + cross-note.

**`inferred action` 제거(축소):** spine 내용·압축 축(행위→상태·라벨 부족 규칙) + Output Contract가 verbatim 소유 → recurrence gate "기존 축으로 복원 불가" 실패. 무단 삭제 대신 내용·압축 그룹에 "구 `inferred action`은 축·Output Contract가 소유" 복원 흔적을 남겨 카탈로그 자체에 Destructive Change gate를 dogfood. 제거 blast radius = EXAMPLE case 14 하나(grep 확인) → ② 범위로 닫힘.

**검증 ledger(다른 agent가 이 로그만으로 pass/fail 가능):** `references/review-patterns.md`에서 (1) 6 축 그룹 헤더 존재(`:50,58,66,72,81,92`), (2) 구 4 임시범주 헤더 0건, (3) `` `- `inferred action`` `` 카탈로그 항목 0건 + 흔적 note 1건(`:55`), (4) 잔존 14 smell 각 정확히 1건, (5) 세 보정 문구 존재(`:43`,`:92`,`:64`), (6) intro 연결문 존재(`:5`). `.claude`=`.agents` symlink, `diff` IDENTICAL.

**③ description no-op(확인):** frontmatter가 이미 `content/representation/structure/rule-altitude/document-relation` 5축 + identity-first + blast-radius loop를 서술 → SKILL Definition과 일치. 변경 불필요. codex 동의.

Next: W2 잔여 ② `references/EXAMPLE.md` 14 cases 재태그(축 어휘 정합 + 비카탈로그 free-text 태그 정리 + case 14 `inferred action`→내용·압축 축 재지정) + recurrence gate(신규 case 무증식) + overlay/extension은 문서-대-문서 협응 보완 축이 이미 커버(새 case 불필요)임을 확인. ②는 draft→검토 후 반영. W3(loop dogfood)는 W2 종료 후.

## 2026-07-08 · W2 잔여 ② EXAMPLE 재태그 반영 — W2 종료

codex "② 반영 가(추가 교차검토 불필요), case 7·14 문안 보정" 판정 후, @user 지시대로 task별 모델 배정: 기계적 6-case 편집+grep 검증은 sonnet subagent, 로그 기록·종료 판단은 opus 메인. subagent 반영 결과를 Claude가 독립 grep 재확인. spec = scratchpad `w2-example-retag-spec.md`.

**codex 두 보정(수용):**

- case 7: 제목 `Structure smell:` → `Review signal:`. 제목 유지한 채 "구조 smell 아님"을 서술하면 제목-내용 충돌 → 제목 교체로 해소.
- case 14: 제목 `Structure smell:` → `Structure smell / axis signal:`. 축 descriptor가 `Structure smell:` 아래 예외처럼 보이는 것 방지.

**반영(references/EXAMPLE.md, 6 case):**

- case 2·3·5: free-text 재진술 태그 drop(concept hierarchy confusion / misplaced section / document role mismatch). 각 카탈로그 smell(owner or altitude mismatch·copied section meaning)이 의미를 이미 흡수.
- case 6: `orphan local rule` backtick 정합.
- case 7: `Review signal:`로 reframe — 반복되는 owner boundary·placement·skeleton 혼동이 local fix를 넘어 Guideline Improvement·recurrence gate 후보가 됨.
- case 14: `Structure smell / axis signal:` + "내용·압축 복원 실패(구 `inferred action`; SKILL 내용·압축 축·Output Contract 소유)" + `duplicated ownership`. case 삭제 안 함(내용·압축 concrete scenario로 유지).
- 무변경 8 case(1·4·8·9·10·11·12·13): 이미 카탈로그 smell만 사용.

**recurrence gate / overlay 확인:** 14 cases 중 신규 smell/model 요구 0건(카탈로그 무증식). overlay/extension은 문서-대-문서 협응 보완 축이 이미 커버 → 새 case 불필요(파일 변경 없음). 각 case에 축 라벨 줄 신규 추가 안 함 — smell 이름이 축을 함의하므로 축 줄은 over-provisioned(dogfood).

**검증 ledger(다른 agent가 이 로그만으로 pass/fail 가능):** `references/EXAMPLE.md`에서 (1) free-text 5개 태그(concept hierarchy confusion·misplaced section·document role mismatch·repeated local fix·authoring guide gap) 0건, (2) `inferred action` 1건(case 14 `:393` 복원 흔적 note만), (3) 무backtick `- orphan local rule` 0건 + backtick `orphan local rule` 2건(case 6·9), (4) `^Review signal:$` 1건(`:182`), (5) `^Structure smell / axis signal:$` 1건(`:391`), (6) `.claude`=`.agents` symlink diff IDENTICAL. sonnet subagent 반영 + Claude 독립 재확인 일치.

**W2 종료:** references 3파일(review-patterns·authoring-patterns·EXAMPLE) + SKILL.md spine + frontmatter description이 모두 5축 instance로 정합. ①(재앵커)·②(재태그)·③(description no-op) 완료. W1↔W2 강결합 작업 마무리.

Next: W3 Review Loop 엔지니어링·검증(dogfood). W1에서 authored된 Review Loop(Node/Propagation/Termination/Meta)를 실제 문서 리뷰에 적용해 back-edge(N7 local-verify-fail→N4 / identity-invalidation-fail→N1) 분기, blast-radius bounded 전파, 수렴·escalation, meta-ring 발화 조건이 작동하는지 검증. `2026-07-07 loop 구조 제안 능력` 블록에서 W3로 이월된 progress signal·반복 중 invariant 보강(대상 문서가 아닌 skill 자신 Review Loop 운영 검증)도 포함. 모호·무한순환·과전파 위험이 드러나면 loop 규칙을 조이고, 스킬 변경은 승인 후.

## 2026-07-08 · W3 dogfood 검증 실행 — loop 기계 유효, F1 accepted / F2 parked / propagation 후보 발견

W3 = W1이 authored한 Review Loop를 skill 전체 corpus(SKILL.md + 3 references + EXAMPLE)로 self-review(dogfood)해 운영 가능한 기계로 검증. rubber-stamp(자기검토 순환) 위험을 근거로 판별. codex 교차 완료(F1 반영가 + 문안 보정 "검증 실패 원인" 추가, F2 park 동의).

**A. 잔여 cross-file drift 최종 점검 — PASS (grep 독립 확인, ledger 무신뢰):**

- `.claude`=`.agents` symlink + `diff` IDENTICAL(SKILL·review-patterns).
- SKILL.md 섹션 = Definition And Identity/Derivation Axes/Review Loop/Change Gates/Reference Routing/Output Contract, 구 카탈로그 헤더(`Core Invariants`·`Structure Smells`·`Guideline Structure Models`·`Conditional Gates`) 0.
- 표현축 매핑 문장("순서가 의미면 numbered" 류): SKILL 0 / authoring `Information Format` 존재.
- Master invariant "짧음": 5 hit 전부 tiebreaker/한 요소 framing, 압축우선 잔재 0.
- `inferred action`: 복원흔적 note 2건(review-patterns:55·EXAMPLE:393)만, 살아있는 카탈로그 항목 0.

→ W1+W2 산출물 텍스트·구조 drift 없음. codex Finding 1(압축우선 interim risk) 닫힘 재확인.

**B. loop 기계 6표적 — 5 genuine PASS + 1 결함(F1):**

- ① Node Op 7 steps 실행가능 = PASS. 두 입력(명시 변경 + dry-run restoration gap) 완주, 명시 변경 없는 순수 리뷰의 빈 input 1도 input 2로 change surface 산출.
- ② N7 두 분기 구분 = PASS. 실 시나리오로 갈림: 표현축 매핑 문장 오배치 = identity 유지·위치만 틀림 → N4 / SKILL 정체성을 "loop 전체 spec 소유"로 오복원 = 전파가 element spec은 Rule Shape 소유임을 드러내 문서 정체성 자체 뒤집힘 → N1. pivot = 위치·형태 vs 문서-자신-정체성.
- ③ Propagation bounded = PASS. Output Contract bullet 추가 = blast≈∅ 1-pass 수렴; Master invariant 문구 변경 = authoring 2곳(Finding 1 지목점)만. 전수 발산 없음.
- ④ Termination = 수렴 PASS(이 dogfood가 frontier 비우고 drift PASS로 수렴), escalation 실사용(F1/F2 auto-fix 안 하고 escalate). 단 미수렴(순환) *탐지* 신호 미정의 = F1.
- ⑤ Meta Ring 조건부 = PASS. 0회 발화가 정답이고 실제 0회(F1/F2는 단발 국소 gap → recurrence gate 실패 → park; enumeration-creep은 이미 명명). positive 발화 경로는 dry-run으로만 검증(이번 세션 live 케이스 미발생).
- ⑥ W3 이월(progress signal·반복중 invariant) = 결함 F1로 실체화.

**F1 [accepted candidate, pending user approval/patch] — Termination이 순환 escalate를 지시하면서 순환 탐지 신호를 복원 불가로 남김:**

- 기계 자신이 산출(비순환 증명): SKILL Termination을 대상으로 Node Op를 dry-run하면 N7→N4 2회 시 "순환인가"를 Termination에서 복원 불가 → step 2가 정의한 restoration gap("종료·escalation 조건 복원 실패") 정확히 발화.
- codex 교차 동의 + 보정 수용: 문안에 "검증 실패의 원인"을 포함해야 함. 근거 = N4(local verify fail)는 외부 새 근거가 아니라 verify 실패 자체가 입력이라, "새 근거·전파 결과"만 쓰면 N4 케이스 누락.
- 확정 방향 문안(SKILL Termination): "각 back-edge(N7→N4·N1)는 새 근거·전파 결과·검증 실패 원인처럼 다음 판단을 바꾸는 입력을 소비할 때만 정당하다. 같은 후보를 새 입력 없이 다시 만들면 순환이며 escalation한다."

**F1 dogfood 추가 발견 — propagation 후보(범위 결정 필요, park 아님):**

- F1 변경을 Meta Ring dogfood(제안된 skill 변경을 Review Loop로 자기검토)하니 Propagation이 authoring `Rule Shape`의 `feedback loop` 정의까지 후보를 올림. [사실]: Rule Shape 공통 요소 `escalation`("loop가 스스로 끝낼 수 없을 때 넘기는 곳")이 progress 판정을 전제하는데 그 판정 기준(순환)이 없음 → 같은 restoration gap이 제안-규격 층위에도 존재.
- [추론]: F1을 SKILL Review Loop에만 넣으면 skill이 자기 loop엔 progress invariant를 넣고 loop를 *가르치는* Rule Shape 규격엔 안 넣는 비대칭 = W1이 고친 self-application gap의 역방향 재발.
- bounded 확인[사실]: 전파 후보 = SKILL Termination/N7 + authoring Rule Shape 2곳뿐. EXAMPLE case 13(loop)은 progress와 무관 → 안 번짐. 표적 ③(bounded propagation)의 실증.
- [의견] SKILL+Rule Shape 둘 다 반영 추천(Rule Shape는 back-edge 요소 정의에 얇게). 반론(순환 탐지=대상 loop 몫으로 위임→SKILL만)도 성립 → 경계 불확실이라 사용자 결정으로 올림(Termination "경계 불확실→확인" 준수). codex 범위는 SKILL만이었고 이 발견은 그 범위를 넘음.

**F2 [parked observation, no standalone action]:** N7 두 괄호 "owner" 중복(변경 후보 owner ≠ 문서 자신 owner). 기계는 PASS(N1 `이 문서의 원래`·`복원 자체` 한정어가 disambiguate, restoration 성공, reader-cost만 비영). 결함 아님. F1 patch 시 같은 문장 건드리는 김에 선명화 가능하나 별도 항목 아님. codex 동의.

**rubber-stamp 자기검증:** F1은 밖에서 부과가 아니라 skill Node Op를 Termination에 돌려 기계가 산출 → pass들이 rubber-stamp 아님을 반증. F2는 결함으로 부풀리지 않고 강등, Meta Ring은 침묵이 정답이면 침묵. 양방향 정직.

Next: F1 patch 범위 결정(SKILL-only vs SKILL+Rule Shape) → codex 확정 문안으로 skill 파일 반영(승인 후, Meta Ring auto-edit 금지) → 독립 grep 검증 → W3 종료 → 이 로그 closeout 재검토(logs/AGENTS.md Closeout Check + 2026-06-26 관련 논의 로그 closeout 동반 판단).

### 2026-07-08 01:01 · F1 범위 dry-run 2건 완료 — 권고 B(SKILL+Rule Shape), 확정 문안, F2 park

F1 patch 범위를 독립 subagent 2건(opus, 읽기전용, 내 결론 미주입)으로 dry-run 재검증. 둘 다 각 scope에서 gap을 독립 확인 → rubber-stamp 아님 강화.

**SA1 (SKILL 내부 Review Loop):** F1은 genuine·복원불가 restoration gap. 결정적: gap이 back-edge(N7→4·→1)뿐 아니라 **Propagation frontier 재추가까지** 걸침 — back-edge=무가드 / Propagation의 "또 바뀌면"은 trivial no-change만 거르고 oscillation(A↔B) 미탐지. 따라서 back-edge만 겨냥한 문안은 Propagation 순환을 열어둠 → 한 progress invariant가 세 재진입을 모두 묶어야 함. "같은 후보"는 site-ambiguous(step4=위치·형태·owner후보 / step1=identity·owner / Propagation=frontier문서+blast) → 판정 단위를 site별로 명시해야 하고 "새 입력"은 기존 어휘 "새 근거·전파 결과·검증 실패 원인"에 고정해야 함.

**SA2 (대상 문서 feedback loop / Rule Shape):** genuine gap 확인. 현 well-formedness는 정적(termination 존재만 검사) → 증명적 비종료 loop를 green-light. `escalation`이 non-progress를 전제하나 탐지 기준 부재. 배치 refine: feedback loop 정의에만 넣고 공유 common-element(state/escalation)엔 금지 — 그 요소는 단방향 gate-driven flow와 공유되므로. domain-neutral 문안 확보.

**권고: B (SKILL + Rule Shape), pending @user 승인.** 근거: ① 두 scope 독립 확인 ② self-application 정합(W1이 고친 forward gap의 역방향; skill이 자기 loop엔 progress invariant 넣고 가르치는 규격엔 안 넣는 비대칭 방지) ③ bounded 2곳(EXAMPLE 무영향) ④ late-discovery risk 감소. 두 문안은 identity→instance 관계로 정합(Rule Shape=domain-neutral 측도감소 / SKILL=그 측도를 "근거·전파·실패원인 소비"로 구체화).

**확정 문안(미적용, 승인 후 반영):**
- SKILL.md Termination(신규 bullet, 기존 "미수렴(순환·발산)" bullet 앞): "loop의 모든 재진입 — N7 back-edge(→4·→1)와 Propagation의 frontier 재추가 — 은 새 근거·전파 결과·검증 실패 원인처럼 다음 판정을 바꾸는 입력을 소비할 때만 정당하다. 재진입 지점이 산출하는 상태(step 1=identity·owner, step 4=변경 위치·형태·owner 후보, Propagation=새 blast 없는 같은 frontier 문서)를 새 입력 없이 다시 만들면 순환이며, back-edge·재추가 대신 escalation으로 넘긴다."
- authoring-patterns.md Rule Shape `feedback loop` 정의(well-formedness 절 뒤 삽입): "각 반복은 state를 termination에 더 가깝게 바꿔야 하며, state가 진전 없이 되풀이되면 back-edge로 다시 돌지 않고 escalation으로 넘긴다."

**F2 [park 유지, 별도 action 없음]:** SA1이 N7 두 괄호로 분기를 정확히 갈라 dry-run 완주 → 복원 가능 재확인. F1 문안 위치(Termination)가 N7 괄호를 건드리지 않으므로 bundling은 별도 blast. 게다가 F1의 site별 상태 명시(step1=identity·owner vs step4=owner 후보)가 F2가 지적한 "owner" 지시대상 구분을 loop-state 층위에서 무상 선명화 → 별도 수정 불요.

Next: @user 승인 시 두 파일 반영(sonnet subagent 기계 편집 + Claude 독립 grep 재검증) → W3 종료 → 이 로그 closeout 재검토.

### 2026-07-08 01:56 · W3 F1 반영 완료(B안) — SKILL Termination + authoring feedback loop, grep 검증 PASS · W3 종료

"작업을 계속 이행하라"를 B안 반영 승인으로 해석하고 반영. 문안은 SA1·SA2·codex 외부 검증분이라, exact-string 삽입은 직접 Edit + 독립 grep 재검증(반영 정확성)으로 discipline 유지(cold subagent 신규 spawn 대신).

**반영(2 파일):**
- `SKILL.md` Termination: progress invariant bullet 신규(수렴 bullet 뒤, 미수렴 bullet 앞). "loop의 모든 재진입 — N7 back-edge(→4·→1)와 Propagation frontier 재추가 — 은 새 근거·전파 결과·검증 실패 원인을 소비할 때만 정당… 재진입 지점 산출 상태(step1=identity·owner / step4=변경 위치·형태·owner 후보 / Propagation=새 blast 없는 같은 frontier 문서)를 새 입력 없이 재생산하면 순환이며 escalation." → SA1이 요구한 세 재진입(back-edge 2 + frontier 재추가) 전부 + site별 판정 단위 명시 반영.
- `references/authoring-patterns.md` Rule Shape `feedback loop`: well-formedness 절 뒤 progress 문장 삽입(domain-neutral). "각 반복은 state를 termination에 더 가깝게… 진전 없이 되풀이되면 back-edge 대신 escalation." → well-formed 테스트 = back-edge+termination+progress 한 곳 집약, escalation 발화 기준 부여.

**검증 ledger(다른 agent가 이 로그만으로 pass/fail):**
1. `SKILL.md` `loop의 모든 재진입` 1건(:117), 순서 = 수렴→progress invariant→미수렴→과설계(sed :114–121).
2. `authoring-patterns.md` `각 반복은 state를 termination` 1건(:60–61), 순서 = well-formed→progress→종료조건.
3. `gate-driven flow`(:53–57) 무변경 — 단방향 flow에 progress 미누출(SA2 제약 준수).
4. domain-neutral: authoring 삽입문에 N7·frontier·Propagation·Node Operation·Review Loop 0건.
5. `.claude`=`.agents` diff IDENTICAL(SKILL·authoring 둘 다).

**적용 후 dry-run 재확인:** N7→N4/N1 반복·Propagation frontier 재추가 각각 순환 판정 복원 → escalation 착지. inferred-action 규칙 준수(순환 분기가 요구 행동=escalation 지목). frontmatter description 무영향 → blast bounded 예측대로.

**F2:** park 확정(별도 반영 없음). F1의 site별 상태 명시가 N7 "owner" 지시대상 구분(step1=문서 자신 identity·owner vs step4=변경 owner 후보)을 loop-state 층위에서 무상 선명화.

**W3 종료.** loop 기계 6표적 = 5 genuine PASS + F1(발견→codex·subagent 교차→B안 반영→grep 검증 완료). owner handoff = 스킬 자체가 owner라 반영으로 종결(별도 taxonomy owner 없음, description 갱신 불요).

Next: 이 로그(docs-skill 설계 owner, open) status 재검토 — W1·W2·W3 모두 완료. 단 전체 종료(open→decided)는 2026-06-26 기록이 가리키는 관련 `2026-06-25-docs-하위-지침서…` 논의 로그 closeout과 동반 판단 필요 → @user 판단 대기.

## 2026-07-08 · codex/subagent 재검토 반영 — authoring 보정 · review-patterns F1 · Wn tracker 정리 · open 유지 확정

@user 지시로 W3 반영물에 대한 codex 재검토 + 독립 subagent 2건(authoring 재검토 · review-patterns fresh 검토)을 교차하고 결과를 반영했다. codex·subagent·claude 3자 대조로 rubber-stamp를 양방향(무비판 수용/과잉 반영) 모두 경계했다.

**확인한 사실 (3자 대조):**

- `frontier`는 SKILL.md Review Loop의 1급 내부어(`SKILL.md:73`·`76`·`111`·`116`·`120`). authoring-patterns.md는 domain-neutral portable reference이므로 `state` 예시의 `frontier`(`authoring-patterns.md:45`)는 누수. (codex + subagent + 독립 grep 일치)
- authoring-patterns.md `Rule Shape` "두 shape는 아래 공통 요소로 복원한다"(`42`)가 6요소를 두 shape 공통으로 over-claim. 그러나 gate-driven flow는 명시적 단방향(`56–57`)이고 정의부는 entry·gate순서·분기결과·termination만 씀 → state·back-edge·escalation은 feedback loop 전용. (3자 일치)
- codex 제안 intro("feedback loop는 단방향 flow 요소에 반복 state, back-edge, escalation을 더한다")는 기존 `59`("gate-driven flow의 요소에 back-edge와 반복 state를 더해")를 **중복 서술**하고 escalation 포함으로 `59`와 **충돌** → 이 파일 Wording 규칙 `20` 위반. (subagent 발견, claude 독립 확인)

**반영 (검증 PASS):**

- authoring `45` [P1]: `state` 예시에서 `frontier` 제거 → "(변경 후보, 미해결 항목 등)". 남은 2예시+"등"으로 개념 복원되어 손실 없음. codex의 `현재 판정 대상` 치환보다 우수(후자는 "반복 중 들고 도는 대상"과 중복 뉘앙스)로 판정해 채택.
- authoring `42` [P2a]: "…공통 요소로 복원한다" → "…요소 중 각자 필요한 것으로 복원한다". over-claim을 원천에서 제거, 재열거 없이 per-shape 정의(`53–62`)가 specifics를 소유하게 둠(중복 회피).
- authoring `51` [P2b 동반]: "각 shape는 이 요소로 정의한다" → "각 shape는 이 중 필요한 요소로 정의한다". `42`와 정합.
- review-patterns `50` [F1]: 내용·압축 그룹 헤더를 부족+과잉 양방향 커버로 확장. 유일 live smell `over-provisioned structure`(과잉)와 카탈로그 선언 `43`("모든 smell = 복원 테스트 실패")의 정합 회복.

**기각·parked:**

- codex 제안 intro 문안 **기각**(위 중복·충돌 근거). subagent 대안 채택.
- authoring `62`("되돌아가는 경로만 있고 종료 조건이 없으면 loop로 부르지 않는다")는 `60`이 함의하는 중복(Wording `20` 위반 후보) — subagent가 codex 범위 밖에서 추가 발견. 단 (a) pre-existing(W1~3 무관) (b) codex/review 트리거 범위 밖 (c) subagent도 medium confidence·"rhetorical value 있음"으로 hedge (d) termination 강화 thread에서 termination 문장 삭제는 오해 소지 → **미적용, 관찰만 기록.** 제거 여부는 후속 @user 판단.
- review-patterns F2(inferred-action 묘비 정합)·F3(mixed-concept EXAMPLE 커버리지)·F4(smell 인접) 무변경 타당.
- **progress-invariant는 review-patterns에 넣지 않음이 정답.** owner는 SKILL Termination(`117–120`) + authoring feedback loop(`60–61`). review-patterns는 정적 instance 층이라 동적 gap을 `45–46`에서 Node Operation에 명시 위임 → 여기 넣으면 자기 카탈로그 `83` `duplicated ownership` 유발. (subagent 판정, claude 독립 확인)

**Wn tracker 정리 + open 유지 확정 (@user 결정 2026-07-08):**

- `## Work Items`의 `[x] W1/W2/W3` tracker 제거 → 완료 서술 + open-owner 유지 2 bullet로 교체. onramp가 open 로그의 Work Items를 현재 작업 권위로 읽으므로, 완료된 Wn 3건이 phantom pending으로 오독될 live 표면을 제거.
- 날짜 이력 블록의 Wn 언급은 **불변 이력으로 보존**(logs 규율 = 과거 블록 의미 재작성 금지). "Wn 오해 소지"는 onramp가 현재 상태로 읽는 live 표면에서 발생하므로 거기서만 제거하는 것이 정합.
- 이 로그는 종료(open→decided)하지 않고 docs-skill 설계의 open owner로 유지.

**검증 ledger (다른 agent가 이 로그만으로 pass/fail 가능):**

- `grep -c frontier .agents/skills/document-structure-review/references/authoring-patterns.md` = 0.
- authoring: "공통 요소로 복원" 0건; `42`에 "각자 필요한 것으로 복원" 존재; `51`에 "이 중 필요한 요소로 정의" 존재.
- authoring: `N7`·`Node Operation`·`Propagation`·`Review Loop`·`blast radius` = 0건(domain-neutral 유지).
- review-patterns `50`에 "판정과 무관한 내용이 무엇이 판정을 만드는지 가린다" 존재; 옛 헤더 "담긴 내용만으로 필요한 판정이 복원되지 않는다" 0건.
- `.claude/skills/document-structure-review/references/{authoring-patterns,review-patterns}.md` = `.agents/...` IDENTICAL(diff -q).
- `## Work Items`에 `[x] W[123]` 0건; `status: open` 유지.

**커밋:** document-structure-review skill 4파일(SKILL.md · references/authoring-patterns.md · references/review-patterns.md · references/EXAMPLE.md) + 이 로그를 브랜치 `workspace-reset-stage7`에 커밋. log-skill workstream(`.agents/skills/log/**` 및 관련 로그)은 별개라 이 커밋에서 제외.

Next: docs-skill 설계 open owner 로그로 유지. 추가 설계 변경·검토는 이 로그에 새 기록으로 append하며, 열린 Wn work item은 없다. 선택 후속(비차단): authoring `62` 중복 문장 제거 여부 @user 판단.

## 2026-07-08 · document-structure-review 3쟁점 검증 결과 반영 — authoring 중복 문장 제거, no-change 2건

**사실:**

- Rule Shape `feedback loop`의 line 62 중복 문장은 Wording 규칙 dogfood 결과 제거했다. 남긴 문장은 "state가 진전 없이 되풀이되면 back-edge로 다시 돌지 않고 escalation으로 넘긴다."까지다.
- 파일 수정은 `.agents/skills/document-structure-review/references/authoring-patterns.md` 1건과 이 로그 append만 수행했다.

**추론:**

- `mixed concept roles`는 no-change가 맞다. case overlap은 multi-axis routing이 포용하므로, `EXAMPLE` 새 case나 태그 retrofit은 하지 않는다.
- partial patch 기준 pointer도 no-change가 맞다. step 6 + Propagation + Change Gates가 이미 substance를 소유하므로 추가 pointer를 두면 duplicated ownership 위험이 있다.

**결론:**

- 3쟁점 중 Rule Shape 중복 문장만 반영하고, `mixed concept roles`와 partial patch 기준 pointer는 추가 수정 없이 현 상태를 유지한다.

### 2026-07-08 · authoring line 62 제거 근거 보강 + 국소 패치 bias 쟁점 재검토 착수

@user가 직전 반영에 대해 "변경한 것의 이유·근거를 로그로 기록한 다음 subagent들에게 document skill을 사용해 현재 논의를 검토시키라"고 지시했다.

**확인한 사실:**

- 변경 파일은 `.agents/skills/document-structure-review/references/authoring-patterns.md`와 이 로그뿐이다.
- 제거된 문장은 Rule Shape `feedback loop` bullet 말미의 "되돌아가는 경로만 있고 종료 조건이 없으면 loop로 부르지 않는다."이다.
- 같은 bullet에는 "되돌아갈 경로와 termination을 함께 복원하지 못하면 well-formed loop가 아니다"와 progress invariant("각 반복은 state를 termination에 더 가깝게... escalation으로 넘긴다")가 남아 있다.
- 제거 대상 문장 검색은 0건이고, well-formedness/progress 문장은 남아 있음을 검증했다. `git diff --check`도 통과했다.

**추론:**

- 제거된 문장은 남은 well-formedness 문장의 한 인스턴스를 다시 말한다. 파일 자신의 Wording 규칙(제거해도 판정이 같으면 중복 후보, 이미 말하는 내용을 해설로 반복하지 않음)에 따라 중복 제거가 정당하다.
- 삭제 후에도 "termination 없는 back-edge 구조는 well-formed loop가 아니다"라는 판정과 non-progress 시 escalation 행동은 복원된다.
- 이 변경은 F1/progress invariant의 의미를 약화하지 않고, Rule Shape reference 내부의 reader-cost cleanup에 닫힌다.

**현재 재검토 쟁점:**

- @user는 "작은 변경, 국소 패치가 언제나 정답이지 않을 수도 있다"는 기준을 검토 기준으로 삼아야 한다고 문제 제기했다.
- 직전 보고는 partial patch 기준 pointer를 no-change로 보았지만, 이 사용자 의도는 단순 명료성 선호가 아니라 local patch bias를 검토 단계에서 명시적으로 의심하게 하는 기준인지 재판정할 필요가 있다.
- 다음 행동: subagent들에게 document-structure-review skill 기준으로 이 논의의 owner·고도·중복 위험·restoration gap을 독립 검토하게 하고, 결과를 본 뒤 반영 여부를 재판정한다. 파일 추가 수정은 그 검토 전에는 하지 않는다.

### 2026-07-08 · 국소 패치 bias 쟁점 재검토 종결 — no-change

@user가 "어떤 문제를 국소 패치로 닫을지, 기존 섹션 보강으로 닫을지, 새 섹션/구조 변경으로 올릴지 판단하는 기준"이 필요한 것이라고 쟁점을 재정의했고, Claude 독립 검토를 통해 재판정했다.

**확인한 사실:**

- `SKILL.md` Node Operation step 4는 `local-only`, `ancestor-only`, `both`, `no-change` 후보 비교와 "문제 문서가 항상 변경 대상이라고 가정하지 않는다"를 소유한다.
- `SKILL.md` Change Gates > Content Or Identity Change는 같은 owner·scope이면 흡수/필요 섹션 배치, identity·scope를 초과하면 국소적으로 끼우지 않고 owner 위임·scope 확장·문서 분리·상위 개념 승격을 비교하라고 한다.
- `review-patterns.md` Owner And Scope Decisions도 새 내용과 기존 내용의 관계를 같은 owner, sibling, 하위, 무관으로 분류하고 범위를 벗어나면 위임·scope 확장·분리·상위 개념 승격을 비교하라고 한다.
- 이번 논의의 직접 반영 사례인 authoring line 62 제거는 국소 패치가 실제로 옳았던 중복 제거 사례다.

**추론:**

- 사용자가 지목한 "국소 패치 vs 기존 섹션 보강 vs 새 섹션/구조 변경" 기준은 새 spine 문장으로 비어 있는 것이 아니라 Content Or Identity Change gate가 이미 직접 소유한다.
- faithful dry-run에서는 step 2의 다축 라우팅, step 5의 Change Gates, step 6의 role-fit·blast-radius 선택을 통해 scale 비교가 복원된다. under-routing agent의 오판은 step 4에 후보 문장을 추가해도 고쳐지지 않고, 원인은 step 2 다축 라우팅 위반에 가깝다.
- step 4에 tentative 문안을 추가하면 Change Gates, Owner And Scope Decisions, Change Location과 중복 소유를 만들 위험이 크고, "판정 경계", "판단 표면" 같은 비확립 어휘를 도입한다.

**결론:**

- 국소 패치 bias 쟁점은 현재 no-change로 종결한다. `SKILL.md` step 4·6, Change Gates, review-patterns, EXAMPLE에는 추가 수정하지 않는다.
- 향후 실제로 국소 패치 편향이 반복 오판을 낳은 사례가 관측되면, step 4 문장 추가보다 먼저 step 2 다축 라우팅 강화, Content Or Identity Change gate 보강, 또는 실제 사례를 추상화한 EXAMPLE 추가 중 무엇이 owner에 맞는지 다시 비교한다.

## 2026-08-10 · 별도 프로젝트로 이관 — superseded

사용자 지시에 따라 이 로그의 후속 작업은 별도 프로젝트로 분리해 진행한다. 이 저장소에서는 더 이상 재개하지 않는다.

- 대체 대상: 별도 프로젝트(이 저장소 밖; 경로 미지정).
- 대체 이유: 이 로그 전체의 설계·검토 수명을 별도 프로젝트가 이어받는다.
- 미완료 Work Items: 없음. 이 로그에는 local actionable Work Item과 next pointer가 없었다.
- 상태 전환: `status: superseded`.
