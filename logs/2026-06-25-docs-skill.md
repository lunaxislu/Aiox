---
topic: docs-skill 도입 검토 및 설계
description: 문서화 구조 및 품질 검토용 portable docs-skill의 역할, 범위, 기존 document-structure-review 스킬과의 관계 정의
status: open
---

## Work Items

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

workspace reset stage8 W5(`logs/2026-06-26-workspace-reset-stage8-Atlas-반영·drift-재검토.md`)에서
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

- @user 요청으로 subagent가 `logs/2026-06-25-docs-하위-지침서와-Obsidian-템플릿-논의.md`,
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

- `logs/2026-06-25-docs-skill.md`는 이 블록 작성 전부터 `status: open`이었다.
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
