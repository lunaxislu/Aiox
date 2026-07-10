---
topic: docs 하위 지침서와 Obsidian 템플릿 논의
description: docs/ 하위 지침서 작성과 docs/ 하위 Obsidian 템플릿 도입 여부·범위·형식에 대한 토론 로그
status: decided
---

## Work Items

## 2026-06-25 · docs 하위 지침서와 Obsidian 템플릿 논의

## 2026-06-25 · 착수 — docs 하위 지침서와 Obsidian 템플릿 논의

이 로그는 W6 Phase 3 변경분에 대한 Claude review를 받기 전에, @user와 @codex가 별도로 논의할 **docs/ 하위 지침서 작성** 및 **docs/ 하위 Obsidian 템플릿 도입 여부·범위·형식**을 기록하기 위해 생성했다.

**성격:** 토론/논의 로그다. 즉시 owner 문서를 수정하거나 W6 완료 전이를 수행하는 실행 로그가 아니다. 결론이 확정되면 별도 승인 후 책임 owner(`docs/AGENTS.md`, 하위 `docs/*/AGENTS.md`, 또는 template 파일 후보)에 반영한다.

**논의 범위:**

- `docs/` 하위 지침서 작성 방식: 공통 규칙과 owner별 규칙을 어디까지 분리할지.
- `docs/` 하위 Obsidian 템플릿 필요 여부: template를 둘지, 둔다면 어느 폴더와 어떤 문서 유형에 둘지.
- template가 owner 문서 내용을 복제하지 않고 작성 보조 역할만 하도록 하는 경계.
- wikilink, code/test evidence, Sources/provenance, status 라벨, decision/spec/architecture별 기본 skeleton을 template에 넣을지 여부.
- 기존 W4/W5/W6 산출물과 충돌하지 않게 적용하는 순서.

**명시적 비범위:**

- W6 Phase 3 변경분 review 자체는 이 로그가 소유하지 않는다. 기존 stage7 로그의 Claude review handoff가 소유한다.
- 이 로그에서는 아직 `docs/` 파일이나 template 파일을 생성·수정하지 않는다.
- Obsidian UI 사용법이나 Graph 검증(W3)은 이 로그의 직접 범위가 아니다.

**종료 기준:**

- @user와 template 도입 여부, template 위치, 최소 포함 항목, 지침서 반영 위치를 결정한다.
- 반영이 필요하면 어느 owner 파일/템플릿 파일을 수정할지 명확히 정하고, 실행은 사용자 승인 후 진행한다.

## 2026-06-25 · 사용자 지침서 스타일 입력 — 하향식 계약 모델과 구조 일반화

@user가 docs/ 하위 지침서와 Obsidian template 논의에 적용할 본인의 작업 지침서 스타일을 제공했다. 이 블록은 **@user 제공 입력**이며, 아직 @codex가 원본 로그(`2026-06-12-Agent-계약-하향식-자기점검-패턴.md`, `2026-06-12-로그-계약-책임-분리-재검토.md`)를 직접 재검증한 사실로 쓰지 않는다. 이후 지침서/template 설계 시 이 입력을 검증·반영 후보로 삼는다.

**@user가 제시한 방향:**

- 2026-06-12 전후 작업 로그의 사용자 의견은 다음을 지향한다:
  - 의존성과 역할의 하향식(top-down) 위임.
  - 프로젝트 전용 설정과 portable skill의 엄격한 분리.
  - 임시 patch보다 구조적 일반화.
- root `AGENTS.md`는 repo 진입점이자 `plans/`와 `logs/`를 엮는 통제 센터다.
- 하위 폴더 `AGENTS.md`와 portable skill로 갈수록 범위가 좁아져야 한다.
- 하위 문서나 taxonomy가 상위의 현재 작업 규칙을 역으로 정의하는 역방향/순환 의존성은 금지한다.

**계층별 소유 경계(@user 입력):**

| 계층                  | 소유할 내용                                                         | 소유하지 않을 내용                               |
| --------------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| architecture/taxonomy | 영역별 정보 owner, scoped authority, conflict 규칙                  | agent 실행 절차, 현재 작업 선택, skill lifecycle |
| root `AGENTS.md`      | repo 진입점, 현재 작업 선택, 경로·도구·`plans/`·log 연결, 전역 제약 | portable 기록 형식과 세부 명령 절차              |
| subtree `AGENTS.md`   | 해당 디렉터리 추가 제약, owner handoff, closeout 확인               | 상위 계약 복사, 일반 lifecycle/형식              |
| portable skill        | trigger, 일반 행동·형식·상태·재개·점검·종료 절차                    | 특정 repo 폴더, taxonomy, 현재 `plans/` 구조     |
| deterministic script  | 생성·검색·검사·상태 변경 등 기계적/구조적 조작                      | 완료·취소·owner 선택 같은 인간의 의미 판단       |

**Owner Handoff와 closeout 관점(@user 입력):**

- 로그는 작업 경위를 보존하는 기록일 뿐, 변경된 권위 내용 자체의 owner가 아니다.
- 로그가 `decided`로 닫힐 때 해당 결과는 taxonomy owner 문서, agent 계약, code 또는 test에 반영되어야 한다.
- `logs/AGENTS.md`는 개별 작업 결론을 owner 문서로 이전하는 Owner Handoff 흐름과 종료 전 누수 점검만 포함한다.
- 일반 lifecycle·보존 규칙은 portable log skill이 소유한다.
- 로그 점검은 매 append마다가 아니라 `decided`/`superseded` closeout 시점에 1회 수행하는 방향이 사용자 결정 사항이다.
- 추상어보다 `plans/`처럼 정식 폴더 경로명을 사용해 agent의 오작동과 legacy 혼동을 줄인다.

**구조 일반화 프롬프트 패턴(@user 입력):**

사용자는 “이 사례를 해결하지 말고, 일반화해줘”라는 방향을 선호한다. 특정 시나리오에 매몰되지 않고 fresh agent도 동일한 판단을 하게 하려면 다음 요소를 갖춘 지침을 만든다.

1. Scope: 규칙의 적용 환경 정의.
2. Identity rule: 관계와 대상의 본질 규정.
3. Decision table: 소비 주체를 기준으로 한 분기 판단.
4. Output invariants: 파일 구조에서 변하지 말아야 할 불변 요소.
5. Negative rules: 하지 말아야 할 anti-pattern 명시.
6. Fresh-agent harness: 새 agent가 검증할 모호한 시나리오 구성.

**이 로그의 template 논의에 미치는 영향:**

- docs 하위 지침서와 Obsidian template도 먼저 어느 레이어에 속하는지 정해야 한다.
- template는 owner 문서 내용을 복제하거나 상위 계약을 재정의하면 안 된다.
- template가 필요하다면 “작성 보조 skeleton”이어야 하며, 권위·현재 작업 선택·portable lifecycle을 소유하지 않는다.
- docs template 설계도 patch-style 예시 나열보다 Scope / Identity rule / Decision table / Output invariants / Negative rules / Fresh-agent harness 구조로 일반화하는 방향을 우선 검토한다.

**후속 확인 후보:**

- 위 입력의 근거로 제시된 decided 로그 2개를 필요 시 직접 열어, 확인한 사실과 @user 제공 요약을 분리해 검증한다.
- 검증 후 `docs/` 하위 template 또는 AGENTS 지침에 반영할 내용과 반영하지 않을 내용을 decision table로 정리한다.

## 2026-06-25 · 사용자 정정 — subtree AGENTS 예시의 적용 범위

@user가 앞선 요약 중 “owner별 추가 제약과 handoff/closeout 확인에 집중해야 함”이라는 해석을 정정했다.

- 해당 표현은 계층별 소유 경계를 설명하는 하나의 예시일 뿐이며, 현재 `docs/` 하위 내용에 직접 적용되는 결론이 아니다.
- 따라서 이 로그의 활성 요약이나 후속 판단에서 `docs/` 하위 지침서가 반드시 owner별 추가 제약과 handoff/closeout 확인에 집중해야 한다는 전제로 사용하지 않는다.
- 현재 `docs/` 하위 지침서와 Obsidian template 논의에서는 실제 `docs/` 하위 문서들의 역할, 필요한 작성 보조 범위, 상위 계약과의 중복 여부를 별도로 확인해 판단한다.

## 2026-06-25 · 사용자 제공 이전 세션 요약 — docs skeleton 도입 원칙

@user가 이전 세션에서 @codex와 논의한 docs template/skeleton 방향을 제공했다. 이 블록은 **@user 제공 입력**이며, 아직 현재 세션에서 `docs/AGENTS.md`나 하위 owner 문서를 직접 검증해 반영한 사실이 아니다.

**템플릿 도입 원칙(@user 입력):**

- `docs/templates/`를 바로 만들기보다 먼저 `docs/AGENTS.md`에 “권장 skeleton”으로 둔다.
- 템플릿은 강제 양식이 아니라 owner 문서를 새로 쓰거나 split할 때 쓰는 기본 뼈대다.
- Obsidian 맞춤의 핵심은 frontmatter가 아니라 본문 구조다.
- 문서 상단에 `Related:`를 두어 Graph/Backlink 연결을 만든다.
- `Status:`는 frontmatter가 아니라 본문에 둔다.
- `Evidence:`는 code/test 근거가 필요한 문서에만 둔다.
- `Notes:`나 `Open Questions:`는 임시 생각장이 아니라 owner 문서에 남길 가치가 있을 때만 둔다.
- code evidence 기본형은 `[[src/path/file.ts]]` wikilink와 `src/path/file.ts:10-20` exact range를 함께 쓰는 형식이다.
- 같은 코드 파일은 한 문서에서 첫 의미 언급 1회만 wikilink하고, 이후는 backtick path/line 형식을 쓴다.
- 템플릿이 owner 경계를 흐리면 안 된다. Product는 product만, Spec은 contract만, Architecture는 내부 구조만, Decision은 rationale만, Guide는 반복 workflow만 소유한다.

**frontmatter 판단(@user 입력):**

- 현재 docs owner 문서에는 Obsidian Properties/frontmatter를 도입하지 않는 방향이다.
- 이유:
  - Obsidian Properties까지 도입하면 관리해야 할 규칙이 늘어난다.
  - agent가 frontmatter schema까지 신경 써야 해서 문서 작성 비용이 올라간다.
  - 현재 필요한 Graph 연결은 `Related:` 본문 wikilink로 충분하다.
  - `logs/` frontmatter는 구조 소비자 역할을 하지만, docs owner 문서까지 같은 방식으로 확장하면 “무엇이 권위 메타데이터인지”가 흐려질 수 있다.
- 권장 형태는 본문에 아래처럼 명시하는 방식이다:

```markdown
Related:

- [[...]]
- [[...]]

Status: Current | Target | Deferred
```

초안의 핵심:

- 문서 작성과 문서 리뷰를 모두 지원한다.
- 문장 수정 전에 개념 역할과 위치를 판정한다.
- parent/child, sibling, owner boundary, evidence, provenance, workflow, style을 구분한다.
- 다른 문서가 소유할 가능성이 있으면 먼저 확인하고, 확인 후에도 단순 중복이 아니라 현재 문서에서 필요한 경계/요약/위임인지 판단한다.
- 새 섹션이나 새 문서를 추가하기 전에 흡수, 재배치, 제목 변경, 축약으로 해결 가능한지 본다.
- 현재 문제를 해결하는 가장 짧고 일반화 가능한 문장을 제안한다.
- 사용자 feedback은 원문 덤프가 아니라 판단 가능한 사례로 정리하되, 사용자가 원문형 보존을 명시하면 그 범위에서는 원문성을 우선한다.

검증:

- `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md` 통과.
- `python3 /Users/lunaxislu/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/document-structure-review`는 로컬 Python에 `yaml` 모듈이 없어 실행 중단됐다. frontmatter 형식과 skill name은 수동 확인했지만, 공식 quick validation은 아직 통과로 확인하지 못했다.

**`docs/AGENTS.md` 섹션명 후보(@user 입력):**

- `## Recommended Document Skeletons`
- 또는 더 좁게 `## Document Skeletons`

**공통 base rule 후보(@user 입력):**

- These skeletons are authoring defaults, not required boilerplate.
- Use `Related:` near the top when the document has meaningful doc-to-doc links.
- Keep `Status:` in the document body; do not add frontmatter properties unless explicitly scoped.
- Use `Evidence:` only when the document claims current/as-built code or test behavior.
- Do not copy another owner’s content into the skeleton; link to the owner instead.
- Code files may be wikilinked on first meaningful mention, but exact evidence remains `file:line`.
- Omit empty sections instead of preserving unused template headings.

**owner별 skeleton 후보(@user 입력):**

Spec:

- `# <Contract / Protocol Name>`
- `Related:`
- `Status: [Status: Normative | Current | Committed target | Exploratory | Open/deferred]`
- `## Scope`: 외부 contract/interface/protocol 범위.
- `## Contract`: MUST/SHOULD, field, state, protocol behavior, compatibility rule.
- `## Current Implementation`: 현재 구현된 경우에만 쓰고 code/test evidence를 붙임.
- `Evidence:`
- `## Open Questions`: 아직 확정되지 않은 contract 질문만.

Architecture:

- `# <Architecture Slice Name>`
- 필요 시 인덱스 문서가 status 어휘, module overview, authority links를 소유한다는 context note를 둔다.
- `Related:`
- `Status: Current | As-built | Target | Proposed | Deferred | Current gap`
- `## Responsibility`: 내부 책임과 경계.
- `## Flow`: data/process flow, 필요 시 Mermaid.
- `## Implementation Evidence`: 현재 구현 사실의 code/test 근거.
- `Evidence:`
- `## Drift / Gaps`: 문서와 코드 차이 또는 현재 gap.

Decision:

- `# <Decision Title>`
- `Related:`
- `Status: Accepted | Superseded | Deferred`
- `## Decision`: 결정을 짧게 기록.
- `## Context`: 왜 이 결정을 해야 했는지.
- `## Rationale`: 대안과 tradeoff, 왜 load-bearing인지.
- `## Consequences`: 따라오는 제약과 함께 봐야 할 문서.
- `## Sources`: `logs/...`, relevant owner docs.

Guide:

- `# <Workflow / Runbook Name>`
- `Related:`
- `## When To Use`
- `## Steps`: 실행 순서, 확인 출력, 실패 시 분기.
- `## Verification`: 성공/실패 판단.
- `## References`: relevant owner docs, `scripts/...`.

Product:

- `# <Product Area / Roadmap Topic>`
- `Related:`
- `Status: Current | Target | Deferred`
- `## User Value`
- `## Scope`
- `## Non-Goals`
- `## Links To Contracts`: 구현 상세는 쓰지 말고 spec/architecture로 연결.

**후속 판단 후보:**

- 위 입력을 `docs/AGENTS.md`에 권장 skeleton으로 반영할지 검토한다.
- 반영 전 `docs/AGENTS.md`, `docs/specs/AGENTS.md`, `docs/architecture/AGENTS.md`, `docs/decisions/AGENTS.md`의 현재 권위 경계를 확인한다.
- skeleton이 상위 계약이나 owner 문서 내용을 복제하지 않는지 확인한다.

## 2026-06-25 · Codex 검토 — docs/AGENTS.md 추가 후보

@codex가 현재 `docs/AGENTS.md`와 하위 owner 지침을 확인했다.

**확인한 사실:**

- `docs/AGENTS.md`는 이미 `docs/` 전체 공통 작성 규칙을 소유하며, owner별 의미 규칙은 하위 `AGENTS.md`가 소유한다고 명시한다.
- `docs/AGENTS.md`에는 Owner Boundary, Obsidian Links, Authoring Skills, Code And Test Evidence, Staleness And Drift, Splitting Large Owner Documents, Logs And Plans, Writing Style 섹션이 있다.
- `docs/specs/AGENTS.md`, `docs/architecture/AGENTS.md`, `docs/decisions/AGENTS.md`, `docs/product/AGENTS.md`, `docs/guides/AGENTS.md`는 각각 type 전용 작성 규칙을 소유한다.
- `docs/decisions/AGENTS.md`에는 이미 decision 문서 템플릿이 있다.

**제안:**

- `docs/AGENTS.md`에는 `## Document Skeletons`를 추가하되, 강제 템플릿이 아니라 authoring defaults임을 첫 문장에 둔다.
- 공통 base rule은 상위 `docs/AGENTS.md`가 소유한다: `Related:`/본문 `Status:`/조건부 `Evidence:`/빈 섹션 생략/owner 내용 복사 금지/code evidence 표기.
- owner별 skeleton은 full template보다 “최소 section 후보”로 둔다. 하위 `AGENTS.md`의 의미 규칙을 재정의하지 않도록 각 skeleton은 해당 owner가 무엇을 소유하는지만 짧게 보여준다.
- `docs/decisions/AGENTS.md`의 기존 decision template과 충돌하지 않게, `docs/AGENTS.md`의 Decision skeleton은 공통 Obsidian 구조(`Related:`, body `Status:`, `Sources`) 중심으로 두고 자세한 decision-worthy 기준과 승격 절차는 하위 문서가 계속 소유하게 한다.

## 2026-06-25 · 사용자 정정 — 하위 AGENTS.md 수정 가능성

@user가 위 제안 중 `docs/AGENTS.md`의 Decision skeleton을 공통 Obsidian 구조 중심으로만 둘 필요는 없다고 정정했다.

- 현재 검토 범위는 `docs/AGENTS.md` 단독 추가로 제한되지 않는다.
- 각 하위 `AGENTS.md`를 함께 수정해 owner별 skeleton과 기존 type 전용 규칙을 정합화하는 방향도 후보로 둔다.
- 따라서 후속 제안은 “상위에는 공통 skeleton, 하위에는 기존 템플릿 유지”를 고정 전제로 삼지 말고, 상위/하위 `AGENTS.md` 전체를 조정하는 안도 비교해야 한다.

## 2026-06-25 · 사용자 정정 — Related와 Evidence 역할 분리

@user가 code/test evidence에 wikilink를 섞는 방식은 헷갈릴 수 있다고 지적했다.

- `Related:`는 관련 문서 wikilink를 두는 곳으로 제한하는 방향이 더 명확하다.
- `Evidence:`는 관련 code/test 근거를 쓰는 곳으로 두며, 기본 표기는 backtick path/line 형식이 더 낫다.
- 예: `src/daemon/run.ts:112-148`
- 따라서 후속 skeleton 제안에서는 `Evidence:`에 code wikilink와 exact range를 섞는 형태를 기본으로 두지 않고, `file:line`/`file:line-line` 중심으로 검토한다.

## 2026-06-25 · 사용자 정정 — Evidence 파일 링크와 본문 반복 링크

@user가 `Related:`/본문 wikilink/Evidence 표기 의도를 추가로 정정했다.

- `Evidence:`는 code/test 파일을 다루는 섹션이므로, Evidence 하위에서 code/test 파일 자체를 wikilink로 둘 수 있다.
- exact range는 하위 bullet 등에서 backtick path/line 형식으로 둔다.
- `Related:`에 이미 관련 문서 wikilink를 둔 경우, 본문에서 같은 문서를 다시 언급할 때는 Graph edge 생성을 위해 wikilink를 반복할 필요가 없다.
- 본문 반복 언급은 문맥상 충분히 명확하다면 plain text나 backtick label/path로 써도 되는 방향을 검토한다.
- 후속 규칙화 시 `Related:`는 문서 graph 연결, `Evidence:`는 code/test 파일과 exact range, 본문은 관계 설명이라는 역할 분리를 기준으로 삼는다.

## 2026-06-25 · Codex 의견 — agent 작성 안정성 기준의 링크 규칙

@user가 agent들이 문서를 읽고 작성·수정한다는 관점에서 `Related:`와 본문 wikilink 중 무엇이 더 나은지 물었다.

**@codex 의견:**

- agent 안정성 기준으로는 “`Related:`에 있으면 본문에서는 절대 wikilink하지 않는다”보다, 본문 문맥의 첫 의미 언급을 wikilink하는 규칙이 더 낫다.
- 이유는 agent가 한 섹션만 부분 편집할 때 상단 `Related:`를 항상 같이 갱신하거나 확인한다고 보장하기 어렵기 때문이다.
- `Related:`는 load-bearing neighbor의 짧은 navigation list로 두고, 본문은 관계를 설명하는 첫 의미 언급에서 wikilink를 허용하는 편이 읽기·수정 비용이 낮다.
- 같은 문서의 반복 언급은 plain text로 둔다.
- `Related:`를 모든 관련 문서 목록으로 키우지 않는 것이 Graph/Backlink 노이즈를 줄이는 핵심이다.

## 2026-06-25 · 합의 정리 — Related, Body, Evidence

@user가 직전 @codex 답변을 그대로 로그로 기록하라고 요청했다.

네, 현재 논의 기준으로는 세 가지는 거의 정해졌다고 봐도 됩니다.

**Related**

- 문서 전체의 load-bearing neighbor를 둔다.
- 관련 있어 보이는 모든 문서를 넣지 않는다.
- 보통 owner 문서, 관련 spec/architecture/decision/product/guide처럼 이 문서를 이해·검증·수정할 때 같이 봐야 하는 문서만 둔다.
- `Related:`는 Graph/Backlink와 문서 단위 navigation 역할이다.
- 없어도 되는 문서면 생략한다.

예:

```md
Related:

- [[aiox-a2a]]
- [[local-agent-runtime]]
- [[decision-daemon-boundary]]
```

**Body**

- 본문에서도 wikilink를 허용한다.
- 해당 문맥에서 owner/source/outcome/rationale/다음으로 읽을 문서를 식별해야 할 때 wikilink한다.
- 같은 섹션 안에서 같은 문서를 반복 언급하면 첫 의미 언급만 wikilink하고, 이후는 plain text로 쓴다.
- `Related:`가 있다고 해서 본문 wikilink를 금지하지 않는다.
- `[[doc]] §N Heading` 같은 형식은 agent가 읽기에도 괜찮다.
- Graph를 풍성하게 만들기 위한 의미 없는 wikilink는 금지한다.

예:

```md
Internal process ownership is described in [[local-agent-runtime]], and the rationale is recorded in [[decision-daemon-boundary]].
```

또는:

```md
See [[aiox-message-lifecycle]] §4 Message Routing.
```

**Evidence**

- code/test 근거가 필요한 문서나 섹션에만 둔다.
- code/test 파일은 Evidence 안에서 wikilink할 수 있다.
- 정확한 위치는 하위 bullet에 backtick `file:line` 또는 `file:line-line`으로 쓴다.
- 같은 파일의 여러 range는 같은 파일 wikilink 아래에 묶는다.
- logs/history/provenance는 Evidence보다는 `Sources:`나 backtick path 쪽이 맞다.

예:

```md
Evidence:

- [[src/daemon/run.ts]]
  - `src/daemon/run.ts:112-148`
  - `src/daemon/run.ts:180-210`
- [[tests/unit/daemon/run.test.ts]]
  - `tests/unit/daemon/run.test.ts:30-60`
```

남은 건 `Status:`와 owner별 skeleton을 어디에 어떻게 넣을지입니다.

## 2026-06-25 · 합의 정리 — logs/plans 참조와 skeleton Sources

@user와 @codex가 docs skeleton에서 logs/plans를 어떻게 다룰지 논의했다.

**합의:**

- `docs/AGENTS.md`에는 logs/plans에 대한 경계 규칙을 유지한다.
- logs/plans는 durable knowledge owner가 아니다.
- docs에서 logs/plans를 참조할 때는 provenance나 작업 경위로만 참조한다.
- 결론은 적절한 docs owner로 증류해야 한다.
- 하위 skeleton/template 안에는 logs/plans 설명을 길게 넣지 않는다.
- provenance가 필요한 문서에서는 `Sources:`에 `logs/...`를 둘 수 있게 한다.

예:

```md
Sources:

- `logs/...`
```

**판단:**

- `docs/AGENTS.md`는 logs/plans를 어떻게 취급해야 하는지의 경계 규칙을 소유한다.
- 하위 skeleton은 provenance가 필요한 문서에서 쓸 수 있는 표기 자리만 제공한다.
- Decision 문서는 `Sources:`가 자연스럽고, Spec/Architecture는 필요할 때만 `Sources:` 또는 `Evidence:`와 분리해서 쓴다.

## 2026-06-25 · 결정 — split/index 규칙은 하위 owner 지침서가 소유

@user와 @codex가 `docs/AGENTS.md`의 `## Splitting Large Owner Documents` 처리 방향을 논의했다.

**확인한 사실:**

- `docs/specs/aiox-a2a.md`는 compatibility index and navigation hub이며, full contract text는 linked slice 문서가 소유한다.
- `docs/specs/AGENTS.md`에는 현재 Section ID 보존 중심의 split 규칙이 있으나, “새 contract text를 어디에 작성해야 하는가”는 더 명확히 할 여지가 있다.
- `docs/architecture/local-agent-runtime.md`도 compatibility index and navigation hub이며, full as-built architecture text는 linked slice 문서가 소유한다.
- `docs/architecture/AGENTS.md`에는 현재 `local-agent-runtime.md` index/slice ownership 규칙이 명시되어 있지 않다.

**결정:**

- `docs/AGENTS.md`의 `## Splitting Large Owner Documents` 섹션은 삭제하거나 한 줄 수준으로 축소한다.
- 실제 split/index 규칙은 하위 owner 지침서가 소유한다.
- `docs/specs/AGENTS.md`는 `aiox-a2a.md` index/slice ownership 규칙을 소유한다.
- `docs/architecture/AGENTS.md`는 `local-agent-runtime.md` index/slice ownership 규칙을 소유한다.
- 새 contract/architecture 본문은 index 문서가 아니라 owning slice 문서에 작성한다.
- index 문서는 document map, status vocabulary, anchor-stable stubs, 공통 overview/authority links 등 index가 소유하는 내용만 유지한다.

**`docs/AGENTS.md` 반영 후보:**

`## Splitting Large Owner Documents` 섹션을 제거하고, 필요하면 `## Owner Boundary`에 아래 한 줄만 둔다.

```md
- When splitting or extending owner documents, keep each new slice scoped to one owner responsibility and preserve meaningful inbound references.
```

**`docs/specs/AGENTS.md` 반영 후보:**

```md
## aiox-a2a Index And Slice Ownership

`docs/specs/aiox-a2a.md` is the compatibility index and navigation hub for the split A2A protocol.

- Do not add new full contract text to `aiox-a2a.md` when the relevant protocol slice already exists.
- Add or update contract text in the owning slice document instead.
- Keep `aiox-a2a.md` stubs, status vocabulary, glossary, layer model, and document map consistent with the slices.
- When adding a new protocol area, decide whether it belongs in an existing slice or needs a new slice, then update `aiox-a2a.md` only as the index/navigation entry.
- Preserve existing §N / §N.x headings and inbound anchors unless an explicit migration updates inbound references.
```

**`docs/architecture/AGENTS.md` 반영 후보:**

```md
## local-agent-runtime Index And Slice Ownership

`docs/architecture/local-agent-runtime.md` is the compatibility index and navigation hub for the split local runtime architecture.

- Do not add new full architecture body text to `local-agent-runtime.md` when the relevant architecture slice already exists.
- Add or update architecture content in the owning slice document instead.
- Keep `local-agent-runtime.md` stubs, status vocabulary, module overview, authority links, and document map consistent with the slices.
- When adding a new architecture area, decide whether it belongs in an existing slice or needs a new slice, then update `local-agent-runtime.md` only as the index/navigation entry.
- Preserve existing §N / §N.x headings and inbound anchors unless an explicit migration updates inbound references.
```

## 2026-06-25 · 합의 정리 — Status 표기와 owner별 예시

@user가 Gemini 의견을 공유한 뒤 @codex와 status 표기 방향을 논의했다.

**채택하는 방향:**

- docs owner 문서에는 frontmatter/properties를 도입하지 않는다.
- 문서 레벨 상태는 본문 상단에 `Status: <value>`로 둔다.
- `Status:`는 `Related:`가 있으면 그 아래에 둔다.
- 문서 레벨 `Status:`는 문서 전체 lifecycle이나 owner 문서로서의 현재 유효성을 나타낸다.
- 섹션/claim 레벨 상태는 `[Status: <value>]` inline 표기를 쓴다.
- 섹션/claim status는 문서 레벨 status와 다른 상태를 의도적으로 표시해야 할 때만 쓴다.
- owner별 semantic status 어휘는 각 하위 `AGENTS.md`가 소유한다.
- generic status와 owner별 semantic status를 임의로 매핑하지 않는다. 예를 들어 `Current`를 `Accepted`로, `Deferred`를 `Superseded`로 해석하지 않는다.

**`docs/AGENTS.md` 공통 반영 후보:**

```md
## Status

Do not add frontmatter properties to docs owner documents unless a future scoped decision explicitly introduces them; this rule is scoped to `docs/`.

Use document-level `Status:` in the document body near the top, after `Related:` when present.

- `Status:` describes the document’s overall lifecycle or current validity as an owner document.
- Use inline `[Status: ...]` only when a section or claim intentionally differs from the document-level status.
- Owner-specific `AGENTS.md` files define the allowed section/claim status vocabulary for their document type.
- Do not map owner-specific semantic statuses to generic statuses unless the owner guideline explicitly defines that meaning.
```

**Spec status 예시 / `docs/specs/AGENTS.md` 반영 후보:**

Spec 문서 레벨 status는 문서 전체가 현재 유효한 contract 문서인지, target contract인지, deferred contract인지 표시한다.

```md
Related:

- [[aiox-a2a]]
- [[relevant-architecture-slice]]

Status: Current
```

Spec section/claim status는 기존 spec 어휘를 쓴다.

```md
## Message Routing [Status: Normative]

Implementations MUST preserve source-only reply routing unless an explicit route override is defined.
```

```md
## Federation Handshake [Status: Exploratory]

This section records an unresolved protocol shape and is not yet a compatibility requirement.
```

Spec section/claim status 후보:

- `Normative`: 반드시 지켜야 하는 contract/invariant.
- `Current`: 현재 구현 또는 현재 승인된 contract 상태.
- `Committed target`: 승인된 target contract.
- `Exploratory`: 탐색 중인 contract 후보.
- `Open/deferred`: 열려 있거나 보류된 contract 질문.

**Architecture status 예시 / `docs/architecture/AGENTS.md` 반영 후보:**

Architecture 문서 레벨 status는 문서가 현재 유효한 architecture owner인지, target architecture인지, deferred architecture인지 표시한다.

```md
Related:

- [[local-agent-runtime]]
- [[aiox-a2a]]

Status: Current
```

문서 레벨 `Status: Current`인 architecture 문서 안에도 proposed/gap/target section이 있을 수 있다. 문서가 현재 유효한 owner라는 뜻과, 특정 섹션의 구조가 proposed라는 뜻은 충돌하지 않는다.

```md
## Delivery Queue [Status: As-built]

The daemon persists queued deliveries in the message store.

Evidence:

- [[src/daemon/state.ts]]
  - `src/daemon/state.ts:1761-1864`
```

```md
## Multi-agent Routing [Status: Current gap]

The current implementation assumes pair-oriented routing and does not yet model arbitrary group fan-out.
```

Architecture section/claim status 후보:

- `As-built`: 현재 코드에 구현된 내부 구조. code/test evidence를 붙인다.
- `Current`: 현재 유효한 architecture statement.
- `Target`: 목표 구조.
- `Proposed`: 제안된 구조이며 아직 current/target으로 확정되지 않음.
- `Deferred`: 의도적으로 보류된 구조.
- `Current gap`: 현재 구현의 알려진 gap, limitation, missing piece.

**Decision status 예시 / `docs/decisions/AGENTS.md` 반영 후보:**

Decision은 문서 레벨 status가 decision lifecycle을 직접 나타낸다.

```md
Related:

- [[relevant-spec]]
- [[relevant-architecture-slice]]

Status: Accepted
```

Decision 문서 레벨 status 후보:

- `Accepted`: 결정이 유효하다.
- `Superseded`: 다른 decision이나 owner 문서 변화로 대체됐다. 본문에 대체 대상을 명시한다.
- `Deferred`: 결정이 보류됐다.

예:

```md
Status: Superseded

Superseded by [[new-decision-title]].
```

Decision에서는 section/claim status를 기본으로 쓰지 않는다. decision-worthy 기준, alternatives, rationale, trade-offs, re-evaluation, history 승격 규칙은 `docs/decisions/AGENTS.md`가 계속 소유한다.

**Product status 예시 / `docs/product/AGENTS.md` 반영 후보:**

Product 문서 레벨 status는 제품 범위나 roadmap 문서의 현재 유효성을 나타낸다.

```md
Related:

- [[relevant-spec]]
- [[relevant-decision]]

Status: Current
```

Product status 후보:

- `Current`: 현재 제품 목적/범위/roadmap statement.
- `Target`: 목표 제품 방향.
- `Deferred`: 보류된 제품 범위나 roadmap topic.

Product section/claim status는 꼭 필요할 때만 쓴다. product 문서가 spec/architecture 구현 상태를 대신 소유하지 않게 한다.

**Guide status 예시 / `docs/guides/AGENTS.md` 반영 후보:**

Guide 문서 레벨 status는 반복 workflow/runbook이 현재 쓰이는지, target인지, deferred인지 표시한다.

```md
Related:

- [[relevant-architecture-slice]]
- [[relevant-spec]]

Status: Current
```

Guide status 후보:

- `Current`: 현재 따라야 하는 workflow/runbook.
- `Target`: 곧 도입할 workflow/runbook.
- `Deferred`: 보류된 workflow/runbook.

Guide section/claim status는 기본적으로 쓰지 않는다. guide는 절차와 검증을 설명하고, 사실·contract·architecture 상태는 owner 문서로 링크한다.

## 2026-06-25 · 결정 수정 — Decision 문서는 기본 Status를 두지 않음

@user가 Decision 문서의 `Status: Accepted | Superseded | Deferred` 필요성에 의문을 제기했고, @codex가 현재 `docs/decisions/AGENTS.md` 모델과 비교해 재검토했다.

**확인한 사실:**

- 현재 `docs/decisions/AGENTS.md`는 Decision 문서를 “결정 당시의 WHY 스냅샷”으로 정의한다.
- Decision 문서는 계속 갱신하는 living document가 아니다.
- 결정 결과가 바뀌면 product/spec/architecture/roadmap을 갱신하고, 새 rationale이 필요하면 새 decision을 만든다.
- 오래된 decision이 live reference 대상이 아니면 inbound 정리 후 삭제할 수 있다.

**판단:**

- `Accepted`는 `docs/decisions/`에 존재하는 decision 문서의 기본 전제에 가깝기 때문에 문서 레벨 status로 반복할 필요가 약하다.
- `Deferred`는 decision 문서보다 open question, product/roadmap deferred item, spec open/deferred section, 또는 작업 로그에 더 가깝다.
- `Superseded`를 기본 status로 오래 유지하는 방식은 기존 decision을 현재 상태로 계속 패치하지 않는 현재 decision 모델과 충돌할 수 있다.

**수정 결정:**

- Decision 문서에는 문서 레벨 `Status:`를 기본으로 넣지 않는다.
- Decision skeleton에도 `Status:`를 넣지 않는다.
- Decision의 유효성, 대체 관계, 결과 관계는 `Decision`, `Consequences`, `Sources`, 또는 명시적 superseded note로 표현한다.
- `docs/decisions/AGENTS.md`가 decision-worthy 기준, lifecycle, history 승격, 삭제/정리 규칙을 계속 소유한다.

예:

```md
## Consequences

This decision supersedes [[old-decision-title]] for adapter launch ownership.
```

compatibility 때문에 기존 문서를 임시로 남겨야 하는 예외:

```md
> Superseded by [[new-decision-title]]. Kept only for inbound reference compatibility.
```

**후속 반영 시 수정할 점:**

- 앞선 status 합의 블록의 Decision 예시는 폐기하거나 수정한다.
- 공통 status 규칙에서 “Decision은 예외적으로 `Accepted | Superseded | Deferred` 허용” 같은 문구를 넣지 않는다.
- owner별 skeleton에서 Decision skeleton은 `Related:`, `Decision`, `Context`, `Rationale`, `Consequences`, `Sources` 중심으로 둔다.

## 2026-06-25 · 합의 정리 — Authoring Skills 섹션 대신 도입부 통합

@user가 `docs/AGENTS.md` 초안의 `## Authoring Skills` 섹션에 대해 지적했다.

**@user 지적/질문:**

- `Obsidian Markdown 문법이나 Canvas 구조를 작성·수정할 때`라는 표현은 전체 문맥에서 어색하다.
- “Obsidian Markdown”이라는 단어 자체가 모호하게 느껴진다.
- `docs/AGENTS.md` 전체 흐름으로 보면 별도 `Authoring Skills` 섹션은 별로인 것 같다.
- `docs/AGENTS.md` 도입부에 `docs/` 하위 문서는 Obsidian Vault로도 확인 가능한 `.md` 문서이며, 해당 문서를 편집·수정할 때 관련 skill을 사용한다고 쓰는 편이 낫지 않냐고 제안했다.

**@codex 답변/판단:**

- 별도 `## Authoring Skills` 섹션은 삭제하는 편이 낫다.
- skill 사용 지침은 도구 목록처럼 분리하기보다 `docs/` 문서의 정체성과 편집 조건 안에 자연스럽게 넣는 것이 낫다.
- `docs/`는 repo의 durable knowledge owner이며 Obsidian vault에서 보는 docs-as-Atlas 본체라는 정체성을 먼저 밝힌다.
- `docs/` 하위 문서는 Obsidian vault에서도 확인하는 Markdown 문서라는 점을 명시하고, 그 정체성에서 Obsidian-specific syntax skill 사용 조건이 이어지게 한다.
- `obsidian-markdown`은 Markdown 일반 작성이 아니라 wikilink, embed, callout, tag, Mermaid internal link, footnote 같은 Obsidian-specific syntax를 작성·수정할 때 쓰는 reference로 좁힌다.
- `.canvas` 파일은 `json-canvas` skill을 reference로 쓰되, Canvas는 Graph와 Markdown link로 부족할 때만 쓰는 navigation 보조이며 권위 콘텐츠가 아니라고 둔다.
- skill 지침이 프로젝트 규칙과 충돌하면 `docs/AGENTS.md`가 우선한다는 문장은 도입부의 일반 문장으로 둔다.
- `properties`는 예시에서 제외한다. docs owner 문서에는 frontmatter/properties를 도입하지 않기로 결정했기 때문이다.

**`docs/AGENTS.md` 도입부 반영 후보:**

```md
# Docs Agent Contract

`docs/`는 이 repo의 durable knowledge owner이며, Obsidian vault에서 보는
docs-as-Atlas 본체다. 이 파일은 `docs/` 전체에 적용되는 공통 작성 규칙을 소유한다.

`docs/` 하위 문서는 Obsidian vault에서도 확인하는 Markdown 문서다. wikilink, embed,
callout, tag, Mermaid internal link, footnote 같은 Obsidian-specific syntax를 작성하거나
수정할 때는 `obsidian-markdown` skill을 레퍼런스로 쓴다.

`.canvas` 파일을 작성하거나 수정할 때는 `json-canvas` skill을 레퍼런스로 쓴다. Canvas는
Graph와 Markdown link로 부족할 때만 쓰는 navigation 보조이며 권위 콘텐츠가 아니다.

skill 지침이 이 문서의 프로젝트 규칙과 충돌하면 이 문서가 우선한다.
```

## 2026-06-25 · 합의 정리 — 문서 참조는 repo 기준 경로

@user가 wikilink path 규칙 문구를 정리했다.

**@user 지적/질문:**

- `문서 참조는 wikilink 여부와 관계없이 repo 기준 경로로 작성한다`라는 문구는 불필요하게 길다.
- `문서 참조는 repo 기준 경로로 작성한다`라고 하면 wikilink든 backtick path든 모두 포함되므로 충분하다.
- 현재 논의는 skeleton 기준으로 `docs/` 하위 문서들을 정리할 예정이므로, 기존 basename wikilink 호환성을 과하게 걱정할 필요는 없다.

**합의:**

- `docs/` 문서 참조 규칙은 아래 문장으로 둔다.

```md
- 문서 참조는 repo 기준 경로로 작성한다.
```

**예시:**

```md
Related:

- [[docs/specs/aiox-a2a]]
- [[docs/architecture/local-agent-runtime]]
```

```md
See [[docs/specs/aiox-message-lifecycle]] §4 Message Routing.
```

```md
Sources:

- `logs/docs-system/2026-06-25-docs-하위-지침서와-Obsidian-템플릿-논의.md`
```

**후속 반영 시 주의:**

- 초안과 skeleton 예시의 `[[aiox-a2a]]`, `[[local-agent-runtime]]` 같은 basename wikilink는 repo 기준 path wikilink로 바꾼다.
- code/test evidence도 repo 기준 path를 유지한다.

## 2026-06-25 · Feedback — Authoring Skills는 도입부 정체성 흐름에 통합

**사례:**

`docs/AGENTS.md` 초안에 별도 `## Authoring Skills` 섹션을 두고, 아래처럼 skill 사용을 설명했다.

```md
## Authoring Skills

- Obsidian Markdown 문법이나 Canvas 구조를 작성·수정할 때는 관련 skill(`obsidian-markdown`, `json-canvas`)을 레퍼런스로 쓴다.
- Canvas는 Graph로 부족할 때만 만드는 navigation 보조이며 권위 콘텐츠가 아니다.
- skill 지침이 이 문서의 프로젝트 규칙과 충돌하면 이 문서가 우선한다.
```

**@user 지적/의견:**

- `Obsidian Markdown`이라는 표현은 `docs/AGENTS.md` 전체 맥락에서 모호하다.
- 별도 `Authoring Skills` 섹션은 그 자체만 보면 그럴듯하지만, 전체 문서 흐름에서는 도구 사용 메타 지침처럼 튀어 보인다.
- `docs/` 하위 문서는 Obsidian Vault로도 확인 가능한 Markdown 문서라는 정체성을 먼저 말하고, 그 문서를 편집·수정할 때 관련 skill을 사용한다고 도입부에 자연스럽게 넣는 편이 낫다.
- 정체성 관련 내용도 로그에 명시해야 한다고 추가 지적했다.

**@codex 판단/수용:**

- 수용. 별도 `Authoring Skills` 섹션은 삭제하고 도입부에 통합하는 편이 `docs/AGENTS.md`의 역할과 더 맞다.
- `docs/`는 repo의 durable knowledge owner이자 Obsidian vault에서 보는 docs-as-Atlas 본체라는 정체성을 먼저 둔다.
- 그 다음 `docs/` 하위 문서는 Obsidian vault에서도 확인하는 Markdown 문서이며, wikilink/embed/callout/tag/Mermaid internal link/footnote 같은 Obsidian-specific syntax를 작성·수정할 때 `obsidian-markdown` skill을 reference로 쓴다고 연결한다.
- `.canvas`는 `json-canvas` skill을 reference로 쓰되, Canvas는 Graph와 Markdown link로 부족할 때만 쓰는 navigation 보조이며 권위 콘텐츠가 아니라고 둔다.
- `properties`는 예시에서 제외한다. docs owner content에는 frontmatter/properties를 도입하지 않기로 합의했기 때문이다.

## 2026-06-25 · Feedback — 문서 참조는 repo 기준 경로로 작성

**사례:**

초안 검토 중 문서 wikilink ambiguity를 피하려고 처음에는 “모호한 문서명은 repo 기준 path를 포함한 wikilink”나 “문서 참조는 wikilink 여부와 관계없이 repo 기준 경로로 작성한다” 같은 표현을 제안했다.

**@user 지적/의견:**

- 앞으로 skeleton 기준으로 `docs/` 하위 문서들을 정리할 예정이므로 기존 basename wikilink 호환성을 과하게 걱정할 필요가 없다.
- “wikilink 여부와 관계없이”라는 표현은 불필요하게 길다.
- `문서 참조는 repo 기준 경로로 작성한다`라고 쓰면 wikilink든 backtick path든 모두 포함하므로 충분하다.

**@codex 판단/수용:**

- 수용. 규칙 문구는 아래 한 줄로 단순화한다.

```md
- 문서 참조는 repo 기준 경로로 작성한다.
```

- 이에 따라 초안과 skeleton 예시의 `[[aiox-a2a]]`, `[[local-agent-runtime]]` 같은 basename wikilink는 `[[docs/specs/aiox-a2a]]`, `[[docs/architecture/local-agent-runtime]]`처럼 repo 기준 path wikilink로 바꾼다.

## 2026-06-25 · Feedback — log skill maintenance 기준으로 중복과 scope 충돌 점검

**사례:**

@user가 `docs/AGENTS.md` 전체 초안을 제시한 뒤, log skill `maintenance.md` 기준으로 개선할 점이 있는지 확인하라고 요청했다.

**@user 지적/의견:**

- 초안 전체를 단순 문안으로만 보지 말고, log skill maintenance 관점에서 중복, owner 경계, read path 증가, scope 충돌이 있는지 점검하길 원했다.

**@codex 확인/판단:**

- `log` skill `references/maintenance.md`를 읽고 점검했다.
- 이 사안은 portable log skill 자체 문제가 아니라 `docs/AGENTS.md`라는 project integration / owner 문서 작성 규칙 정리 문제로 분류했다.
- 따라서 log skill이나 portable reference를 바꾸지 않고, `docs/AGENTS.md` 초안에서 중복과 scope 충돌을 줄이는 방향이 맞다고 판단했다.

**수용한 개선점:**

- 별도 `## Authoring Skills` 섹션은 도입부와 중복되므로 삭제한다.
- frontmatter 금지 문구는 `AGENTS.md` 자체 frontmatter와 충돌하지 않게 `docs/` durable owner content 문서로 scope를 좁힌다.
- `Related And Body Links`와 `Writing Style`의 “의미 없는 graph link 금지” 중복은 한쪽으로 줄인다.
- `Sources:` 설명은 owner handoff 원칙이 아니라 provenance 표기 규칙 중심으로 좁힌다.

## 2026-06-25 · Feedback — Evidence와 Sources는 sibling 개념으로 정리

**사례:**

초안의 `## Code And Test Evidence` 아래에 `Sources`, provenance, 로그 경위 경로 표기 규칙을 함께 두었다.

**@user 지적/의견:**

- `Sources:`가 `Evidence:` 하위에 있는 내용처럼 보이는 것은 이상하다.
- `Evidence:`와 `Sources:`는 성격은 다르지만 같은 선상에 있는 sibling 개념으로 보는 것이 맞다.
- 따라서 `Code And Test Evidence`라는 섹션명보다 `Evidence And Sources`처럼 둘을 같은 레벨에서 다루는 편이 자연스럽다.

**@codex 판단/수용:**

- 수용. `Code And Test Evidence`를 별도 섹션으로 유지하기보다 `## Evidence And Sources`로 통합하는 편이 더 명확하다.
- 기존 code/test evidence 규칙은 삭제하지 않고 `Evidence:` 쪽 bullet로 흡수한다.
- `Evidence:`는 current/as-built 동작 주장에 대한 code/test 근거를 기록하고, `Sources:`는 logs/history/prior owner docs처럼 provenance가 중요할 때 기록한다.

**반영 후보:**

```md
## Evidence And Sources

- 코드와 테스트는 현재 구현 동작의 사실 owner다.
- `Evidence:`는 current/as-built 동작 주장에 대한 code/test 근거를 기록한다.
- `Evidence:`에서는 code/test 파일을 wikilink하고, 정확한 range는 그 아래에 적는다.
- 정확한 code/test range는 `file:line` 또는 `file:line-line`으로 쓴다.
- `Sources:`는 provenance가 중요할 때 쓰며, logs/history 경로처럼 경로 자체가 근거인 경우에는 backtick path로 적는다.
```

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

**사례:**

`Code And Test Evidence` 후보 끝에 아래 설명 문장을 두었다.

```md
파일 단위 탐색에는 wikilink가 유용하지만, line-level 근거는 agent, editor, terminal, GitHub에서도 안정적인 `file:line` 표기가 기준이다.
```

**@user 지적/의견:**

- 이 문장이 굳이 필요한 내용인지 질문했다.

**@codex 판단/수용:**

- 불필요하다고 판단했다.
- 이미 “`Evidence:`는 code/test 파일 wikilink와 exact range를 분리한다”, “정확한 근거 표기는 `file:line` 또는 `file:line-line`” 규칙과 예시가 같은 의미를 충분히 말한다.
- 따라서 해당 설명 문장은 삭제하고, 규칙과 예시만 남기는 것이 더 간결하다.

## 2026-06-25 · 다음 작업 방향 — docs AGENTS 초안 검토와 적용

@user가 현재 상태와 다음 작업 방향을 정리했다.

- `docs/AGENTS.md` 및 각 하위 `docs/**/AGENTS.md`에 대한 초안은 만들었다.
- 사용자는 `docs/AGENTS.md` 초안은 어느 정도 다듬어진 것 같다고 이야기했다.
- 그래도 `docs/AGENTS.md`는 한 번 더 검토한다.
- 그 다음 나머지 각 하위 `AGENTS.md`를 다듬고 리팩토링한다.
- 이후 정리된 지침을 `docs/` 하위 문서들에 적용한다.

## 2026-06-27 · Closeout — stage8 W5 owner handoff 완료

이 로그는 docs 하위 지침서와 Obsidian skeleton/template 방향을 논의한 입력 로그다. 실행과
owner 반영은 `logs/workspace-reset/plan-stages/2026-06-26-workspace-reset-stage8-Atlas-반영·drift-재검토.md` W5가 이어받았다.

**최종 결과:**

- `docs/AGENTS.md`와 child `docs/**/AGENTS.md` 초안·합의는 stage8 W5에서 owner 지침서로 반영됐다.
- 반영된 owner 문서: `docs/AGENTS.md`, `docs/architecture/AGENTS.md`, `docs/specs/AGENTS.md`,
  `docs/decisions/AGENTS.md`, `docs/product/AGENTS.md`, `docs/guides/AGENTS.md`.
- guide status 합의(`Current`/`Target`/`Deferred`, section/claim status 기본 미사용)는
  `docs/guides/AGENTS.md`에 반영됐다.
- portable document-structure-review skill 반영과 남은 skill 판단은
  `logs/docs-system/2026-06-25-docs-skill.md`가 별도 owner로 소유한다.

**남은 일 판단:**

- 이 논의 로그 자체에 남은 질문이나 Work Item은 없다.
- 정리된 지침을 실제 `docs/` owner 문서에 적용하는 후속 실행은 이 로그가 아니라 stage8 W6
  (`logs/workspace-reset/plan-stages/2026-06-26-workspace-reset-stage8-Atlas-반영·drift-재검토.md`)가 소유한다.
- 따라서 이 로그는 `decided`로 닫는다.
