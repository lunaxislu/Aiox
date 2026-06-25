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
