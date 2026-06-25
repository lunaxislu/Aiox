---
topic: docs subtree agent contract
description: docs/ 전체에 적용되는 docs-as-Atlas 공통 작성 규칙. owner별 의미 규칙은 하위 AGENTS.md로 위임한다.
---

# Docs Agent Contract

`docs/`는 이 repo의 durable knowledge owner이며, Obsidian vault에서 보는
docs-as-Atlas 본체다. 이 파일은 `docs/` 전체에 적용되는 공통 작성 규칙을 소유한다.

Owner별 의미 규칙은 하위 `AGENTS.md`가 추가로 소유한다.

- `docs/product/`: 제품 목적, 범위, roadmap
- `docs/specs/`: 외부 contract, protocol, interface
- `docs/architecture/`: 내부 구조, 책임, flow
- `docs/decisions/`: load-bearing decision rationale
- `docs/guides/`: 반복 workflow, how-to, runbook

## Owner Boundary

- 같은 지식을 여러 문서에 복사하지 않는다.
- 내용이 다른 owner에 속하면 해당 owner 문서로 옮기거나 링크한다.
- 문서 간 충돌이 있으면 전체 우선순위가 아니라 질문 종류별 owner를 따른다.
- owner 경계는 [[documentation-system]] (`docs/architecture/documentation-system.md`)를
  따른다.

## Obsidian Links

- docs 문서 사이의 의미 있는 관계는 `[[wikilink]]`를 우선 사용한다.
- 관계가 단순 출처, 참고, 결과, 결정 근거인지 본문 문맥에서 알 수 있게 쓴다.
- 동일 basename이 여러 개인 파일(`AGENTS.md`, `README.md` 등)은 충돌을 피하려 path를
  포함한 `[[docs/specs/AGENTS]]` 형식으로 명시한다.
- heading link는 필요한 경우에만 사용한다: `[[문서명#Heading]]`.
- block link는 Obsidian 전용성이 강하므로 durable docs에서는 피한다.
- 과거 로그 전체나 repo 전체 `.md`를 기계적으로 wikilink 변환하지 않는다.

## Authoring Skills

- Obsidian Flavored Markdown(`.md`) 문법(wikilink, embed, callout, properties, tag,
  mermaid `internal-link`, footnote 등)을 작성·수정할 때는 `obsidian-markdown` skill을
  레퍼런스로 쓴다.
- Canvas(`.canvas`) 파일을 작성할 때는 `json-canvas` skill을 쓴다. Canvas는 Graph로
  부족할 때만 만드는 navigation 보조이며 권위 콘텐츠가 아니다.
- 두 skill은 generic Obsidian 작성 지침이다. 본 문서의 프로젝트 규칙과 충돌하면 **본 문서가
  우선한다.** 특히:
  - Code And Test Evidence: 코드·evidence·provenance는 skill의 "vault 내부는 전부 wikilink"가
    아니라 본 문서 규칙(첫 의미 언급 1회만 wikilink, 이후 `file:line`/path)을 따른다.
  - block link(`[[문서명#^block-id]]`)는 skill이 문법을 보여줘도 durable docs에서는 쓰지
    않는다(위 Obsidian Links).
  - 과거 로그 전체·repo 전역 `.md` 기계 변환 금지(위 Obsidian Links)는 skill 사용 시에도
    유지한다.

## Code And Test Evidence

- 코드와 테스트는 현재 구현 사실의 owner다.
- current/as-built 동작을 주장할 때는 관련 code/test 근거를 남긴다.
- 코드 파일은 필요하면 wikilink로 연결할 수 있다. 단, 한 문서 안에서는 같은 코드 파일의
  첫 의미 언급 1회만 wikilink로 노드화하고, 이후 반복 언급은 문맥에 맞게 backtick
  `file:line`, `file:line-line`, 또는 path 표기를 사용한다.
- 정확한 근거 표기는 `file:line` 또는 `file:line-line` 형식을 유지하며, 가능하면 repo
  root 기준 full path를 쓴다.
- `Sources`, provenance, 로그 경위처럼 경로 자체가 근거인 경우에는 wikilink로 억지 변환하지
  말고 backtick path를 유지한다.

### Inline Code Stability

- inline code는 한 물리적 줄 안에서만 쓴다. multi-line inline code를 만들지 않는다.
- 코드·evidence·경로·명령 텍스트에 줄바꿈이 필요하면 fenced code block을 쓰거나 한 줄짜리
  inline code 여러 개로 쪼갠다. (linter가 multi-line inline code의 list continuation
  indent를 제거해 문서 구조가 깨지는 회귀 방지 — stage 7 claude-adapter.)
- docs 파일을 편집하면 `scripts/check-markdown-inline-code <file>`(fence-aware)를 돌려, 코드펜스
  밖에 닫히지 않은 inline-code span이 없는 상태(= 0)로 둔다. 단순 per-line 백틱 홀짝은
  코드펜스 구분선을 오탐하므로 쓰지 않는다.
- 편집 범위 밖에 이미 있는 닫히지 않은 span은 repair-when-touched로 다룬다. 명시적으로
  scope가 잡힌 작업이 아니면 repo 전역 evidence 정규화 sweep를 돌리지 않는다.

예:

```md
Evidence:
- [[src/daemon/run.ts]] — `src/daemon/run.ts:24-87`
- [[tests/unit/daemon/run.test.ts]]
- 여러 근거는 inline 분할: `src/core/messages.ts:10-20`, `src/core/routes.ts:30-45`
```

파일 단위 탐색에는 wikilink가 유용하지만, line-level 근거는 agent, editor, terminal,
GitHub에서도 안정적인 `file:line` 표기가 기준이다.

## Staleness And Drift

- 현재 구현 사실의 owner는 code/tests다. current/as-built 주장에는 code/test 근거를 남긴다.
- drift(문서 ↔ code/tests 불일치) 판정과 처리는 [[documentation-system]] Conflict
  Resolution과 각 owner AGENTS(예: [[docs/architecture/AGENTS]] §4 Drift)를 따른다.
- 현재 code가 다르다는 이유만으로 product/spec/architecture intent를 조용히 바꾸지 않는다.
  변경이 필요한 owner와 근거를 작업 로그에 남긴 뒤 승인된 범위만 수정한다.

## Splitting Large Owner Documents

큰 owner 문서는 필요하면 작은 slice 문서로 나눈다.

- split 전 기존 inbound reference와 heading anchor를 확인한다.
- 원본 문서는 삭제하지 않고 compatibility index/stub holder로 유지한다.
- 원본의 기존 heading은 가능한 보존하고, body는 새 slice 문서로 안내한다.
- 새 slice 문서는 하나의 owner 책임만 명확히 소유한다.
- split으로 생긴 새 관계는 필요한 범위에서 wikilink로 연결한다.

원본 stub 예:

```md
## 4. Message Lifecycle

이 섹션은 분리되었습니다. 자세한 내용은 [[aiox-message-lifecycle]]을 참고하세요.
```

## Logs And Plans

- logs/·plans/의 owner 정의는 [[documentation-system]]를 따른다(logs/ = 작업 경위로
  durable knowledge 자체를 대신 소유하지 않음, plans/ = 큰 workstream의 단계 순서와
  단계 로그 포인터).
- docs 문서가 graph에서 logs/plans를 가리킬 때는 현재 권위의 대체물이 아니라 provenance·
  작업 경위로만 참조한다.
- docs에 반영할 결론이 logs/plans에서 나왔더라도 현재 권위 내용은 적절한 docs owner로
  증류해서 남긴다.

## Writing Style

- 문서는 현재 읽는 사람이 바로 판단할 수 있게 짧고 명확하게 쓴다.
- 설명을 위해 owner 문서 내용을 길게 복사하지 말고 링크한다.
- status, current/target, fact/inference/opinion이 섞일 수 있으면 명시적으로 구분한다.
- Obsidian graph를 위한 링크를 만들되, graph를 예쁘게 만들기 위해 의미 없는 링크를
  추가하지 않는다. link는 "다음에 어디를 봐야 하는가"라는 실제 질문에 답할 때만 만든다.
