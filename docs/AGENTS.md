# Docs Agent Contract

`docs/`는 이 repo의 durable knowledge owner이며, Obsidian vault에서 보는
docs-as-Atlas 본체다. 이 파일은 `docs/` 전체에 적용되는 공통 작성 규칙을 소유한다.

`docs/` 하위 문서는 Obsidian vault에서도 확인하는 Markdown 문서다. wikilink, embed,
callout, tag, Mermaid internal link, footnote 같은 Obsidian-specific syntax를 작성하거나
수정할 때는 `obsidian-markdown` skill을 레퍼런스로 쓴다.

`.canvas` 파일을 작성하거나 수정할 때는 `json-canvas` skill을 레퍼런스로 쓴다. Canvas는
Graph와 Markdown link로 부족할 때만 쓰는 navigation 보조이며 권위 콘텐츠가 아니다.

skill 지침이 이 문서의 프로젝트 규칙과 충돌하면 이 문서가 우선한다.

각 `docs/**/AGENTS.md`가 자기 type의 의미 규칙과 skeleton을 소유한다.

- `docs/product/AGENTS.md` — product type 규칙
- `docs/specs/AGENTS.md` — spec type 규칙
- `docs/architecture/AGENTS.md` — architecture type 규칙
- `docs/decisions/AGENTS.md` — decision type 규칙
- `docs/guides/AGENTS.md` — guide type 규칙

## Owner Boundary

- 같은 지식을 여러 문서에 복사하지 않는다.
- 내용이 다른 owner에 속하면 해당 owner 문서로 옮기거나 링크한다.
- 어느 폴더가 무슨 지식의 owner인지, 충돌 시 어느 owner를 따르는지는
  [[docs/documentation-system]]가 정한다(전역 우선순위 없음, 질문 종류별 owner).
- When splitting or extending owner documents, keep each new slice scoped to one owner responsibility and preserve
  meaningful inbound references.

## Document Structure

`docs/`의 durable owner content 문서에는 별도 결정 없이 frontmatter properties를 추가하지 않는다. 이 규칙은 `AGENTS.md`
계약 파일의 기존 frontmatter를 대상으로 하지 않는다.

Use body sections as authoring defaults, not required boilerplate. Omit empty sections instead of preserving unused
headings.

- Use `Related:` near the top for document-level load-bearing neighbors.
- Use `Status:` near the top, after `Related:` when present, for document-level lifecycle or current validity.
- Use `Evidence:` only when the document claims current/as-built code or test behavior.
- Use `Sources:` for provenance such as logs when provenance matters.
- Do not copy another owner’s content into a document skeleton; link to the owner instead.

## Related And Body Links

`Related:` is for document-level load-bearing neighbors: documents needed to understand, verify, or safely modify this
document. Do not add broad or decorative graph links.

Body prose may use wikilinks when the local context needs to identify an owner, source, outcome, rationale, or next
document to read. If the same document is mentioned repeatedly in one section, wikilink the first meaningful mention
only; later mentions use plain text.

For section hints, prefer stable document links plus readable labels:

```md
See [[docs/specs/aiox-message-lifecycle]] §4 Message Routing.
```

Constraints:

- 문서 참조는 repo 기준 경로로 작성한다.
- heading link는 필요한 경우에만 사용한다: `[[docs/path/file#Heading]]`.
- block link는 durable docs에서 쓰지 않는다.
- 과거 로그 전체나 repo 전체 `.md`를 기계적으로 wikilink 변환하지 않는다.

## Status

Use document-level `Status:` in the document body near the top, after `Related:` when present.

- `Status:` describes the document’s overall lifecycle or current validity as an owner document.
- Use inline `[Status: ...]` only when a section or claim intentionally differs from the document-level status.
- Owner-specific `AGENTS.md` files define the allowed status vocabulary for their document type.
- Do not map owner-specific semantic statuses to generic statuses unless the owner guideline explicitly defines that
  meaning.

## Evidence And Sources

- 코드와 테스트는 현재 구현 동작의 사실 owner다.
- `Evidence:`는 current/as-built 동작 주장에 대한 code/test 근거를 기록한다.
- `Evidence:`에서는 code/test 파일을 wikilink하고, 정확한 range는 그 아래에 적는다.
- `Sources:`는 logs, 이전 owner 문서처럼 provenance가 중요할 때 기록한다.
- 정확한 code/test range는 `file:line` 또는 `file:line-line`으로 쓴다.
- `Sources`, provenance, 로그 경위처럼 경로 자체가 근거인 경우에는 backtick path를 유지한다.

예:

```md
Evidence:

- [[src/daemon/run.ts]]
  - `src/daemon/run.ts:24-87`

Sources:

- `logs/2026-06-25-docs-하위-지침서와-Obsidian-템플릿-논의.md`
```

### Inline Code Stability

- inline code는 한 물리적 줄 안에서만 쓴다. multi-line inline code를 만들지 않는다.
- 줄바꿈이 필요한 code/evidence/path/command는 fenced code block이나 여러 개의 한 줄 inline code로 나눈다.
- docs 파일을 편집하면 `scripts/check-markdown-inline-code <file>`를 돌려 inline code span이 닫힌 상태인지 확인한다.
- 이번 편집 범위 안에서 발견한 inline code 문제는 고치되, 명시적 scope 없이 파일/문서 전체나 repo 전역 정리로 확장하지 않는다.

## Staleness And Drift

- 현재 구현 사실의 owner는 code/tests다. current/as-built 주장에는 code/test 근거를 남긴다.
- drift(문서 ↔ code/tests 불일치) 판정과 처리는 [[docs/documentation-system]] Conflict Resolution과 각
  owner AGENTS를 따른다.
- 현재 code가 다르다는 이유만으로 product/spec/architecture intent를 조용히 바꾸지 않는다. owner나 authority를 바꾸는
  drift는 어느 owner가 stale한지와 근거를 사용자에게 보고하고, 작업 로그에 남긴 뒤 승인된 방향으로만 수정한다.

## Logs And Plans

- logs/·plans/의 owner 정의는 [[docs/documentation-system]]를 따른다.
- 로그 closeout과 owner handoff 절차는 `logs/AGENTS.md`가 소유한다.
- logs/plans는 durable knowledge owner가 아니다.
- docs 문서가 logs/plans를 참조할 때는 현재 권위의 대체물이 아니라 provenance·작업 경위로만 참조한다.
- docs에 반영할 결론이 logs/plans에서 나왔더라도 현재 권위 내용은 적절한 docs owner로 증류해서 남긴다.

## Writing Style

- 문서는 현재 읽는 사람이 바로 판단할 수 있게 짧고 명확하게 쓴다.
- 설명을 위해 owner 문서 내용을 길게 복사하지 말고 링크한다.
- status, current/target, fact/inference/opinion이 섞일 수 있으면 명시적으로 구분한다.
