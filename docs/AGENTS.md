# Docs Agent Contract

`docs/`는 이 repo의 durable knowledge owner이며, Obsidian vault에서 보는
docs-as-Atlas 본체다. 이 파일은 `docs/` 전체에 적용되는 공통 작성 규칙을 소유한다.

`docs/` 하위 문서는 Obsidian vault에서도 확인하는 Markdown 문서다. wikilink, embed,
callout, tag, Mermaid internal link, footnote 같은 Obsidian-specific syntax를 작성하거나
수정할 때는 `obsidian-markdown` skill을 레퍼런스로 쓴다.

`.canvas` 파일을 작성하거나 수정할 때는 `json-canvas` skill을 레퍼런스로 쓴다. Canvas는
Graph와 Markdown link로 부족할 때만 쓰는 navigation 보조이며 권위 콘텐츠가 아니다.

skill 지침이 이 문서의 프로젝트 규칙과 충돌하면 이 문서가 우선한다.

## Purpose And Sufficiency

`docs/`는 code와 tests만으로 안정적으로 복원하기 어려운 product intent, external contract,
architecture model, load-bearing rationale와 반복 운영 지식을 질문별 owner에 보존한다.

문서와 그 문서가 명시한 최소 read path를 읽으면 과거 대화나 작업 로그에 의존하지 않고,
그 문서가 소유한 질문에 적용되는 owner, scope, intent, current/target 상태, contract, invariant,
dependency와 verification path를 복원할 수 있어야 한다. Product, contract, architecture처럼
durable owner가 소유해야 할 현재 권위가 logs나 plans에만 남아 있으면 owner 반영이 완료되지
않은 것이다.

코드에서 명백하고 안정적으로 읽히는 국소 구현 상세, 일회성 작업 경위, 다른 owner가 이미
소유한 내용은 미래 판단이나 비싼 역추적을 막는 데 필요하지 않으면 durable docs로 승격하지
않는다.

## Owner Boundary

- 어느 폴더가 무슨 지식의 owner인지, 충돌 시 어느 owner를 따르는지는
  [[docs/documentation-system]]가 정한다. 문서 전체에 적용되는 전역 우선순위는 두지 않는다.
- 각 `docs/**/AGENTS.md`가 자기 type의 identity, status vocabulary, subtype, section composition과
  type-specific validation을 소유한다.
  - `docs/product/AGENTS.md` — product type 규칙
  - `docs/specs/AGENTS.md` — spec type 규칙
  - `docs/architecture/AGENTS.md` — architecture type 규칙
  - `docs/decisions/AGENTS.md` — decision type 규칙
  - `docs/guides/AGENTS.md` — guide type 규칙
- 같은 지식을 여러 문서에 복사하지 않는다.
- 내용이 다른 owner에 속하면 해당 owner 문서로 옮기거나 링크한다.
- When splitting or extending owner documents, keep each new slice scoped to one owner responsibility and preserve
  meaningful inbound references.
- 이 파일의 공통 validation은 child AGENTS의 type-specific validation을 대체하지 않는다. Child는
  공통 절차를 반복하지 않고 자기 type에만 필요한 owner 확인, subtype invariant와 상세 harness를
  추가한다.

## Structure And Placement

`docs/`의 durable owner content 문서에는 별도 결정 없이 frontmatter properties를 추가하지 않는다. 이 규칙은 `AGENTS.md`
계약 파일의 기존 frontmatter를 대상으로 하지 않는다.

Use body sections as authoring defaults, not required boilerplate. Omit empty sections instead of preserving unused
headings.

- 정보는 그 의미가 유효한 가장 좁은 범위에 둔다. Document-level signal은 문서 전체에 적용될
  때만 쓰고, section/claim에만 적용되는 내용은 해당 본문 가까이에 둔다. Type semantics나 본문이
  이미 같은 의미를 명확히 전달하면 별도 field나 section을 만들지 않는다.
- 아래 context, state, traceability construct는 조건부 composition block이지 공통 skeleton의
  병렬 필드가 아니다. Child AGENTS는 적용 조건을 만족하는 block만 subtype 구조에 포함한다.
- Do not copy another owner’s content into a document skeleton; link to the owner instead.

## Context, State, And Traceability

### Links And Read Paths

Body link를 기본으로 사용한다. Local context에서 owner, source, outcome, rationale, evidence 또는
다음에 읽을 문서를 식별해야 할 때 해당 문장이나 claim 가까이에 wikilink를 둔다.

`Related:`는 문서 전체를 이해, 검증하거나 안전하게 수정하기 전에 읽어야 하는 document-level
prerequisite가 있고 그 관계를 한 body 위치로 국소화하면 의미가 손상될 때만 쓴다. Body prose,
intro/context 문장이나 index/document map이 같은 read path를 이미 제공하면 `Related:`를 추가하지
않는다. Broad 또는 decorative Graph link를 넣지 않는다.

같은 target의 관계 의미를 body에서 설명해야 하면 body link를 우선하고 `Related:`에 반복하지
않는다. 같은 문서가 한 section에서 반복되면 첫 meaningful mention만 wikilink하고 이후에는 plain
text를 쓴다.

For section hints, prefer stable document links plus readable labels:

```md
See [[docs/specs/aiox-message-lifecycle]] §4 Message Routing.
```

Constraints:

- 문서 참조는 repo 기준 경로로 작성한다.
- heading link는 필요한 경우에만 사용한다: `[[docs/path/file#Heading]]`.
- block link는 durable docs에서 쓰지 않는다.
- 과거 로그 전체나 repo 전체 `.md`를 기계적으로 wikilink 변환하지 않는다.

### Status

Document-level lifecycle이나 current validity를 명시해야 하고 하나의 값이 문서 전체를 오해 없이
설명할 때만 body 상단에 `Status:`를 쓴다. `Related:`가 있으면 그 뒤에 둔다.

- Section이나 claim의 상태가 document-level status와 다르거나 문서가 mixed state라 하나의 값으로
  설명할 수 없으면 해당 section/claim에 inline `[Status: ...]`를 쓴다.
- 문서 type 자체가 lifecycle을 충분히 규정하면 document-level status를 반복하지 않는다.
- Owner-specific `AGENTS.md` files define the allowed status vocabulary for their document type.
- Do not map owner-specific semantic statuses to generic statuses unless the owner guideline explicitly defines that
  meaning.

### Evidence

- 코드와 테스트는 현재 구현 동작의 사실 owner다.
- Current/as-built 동작 주장은 code/test 근거로 검증 가능해야 한다. Evidence obligation과
  `Evidence:` block 또는 별도 evidence section을 같은 것으로 취급하지 않는다.
- 근거는 claim↔evidence mapping을 보존하는 가장 좁고 유용한 범위에 둔다. 단순한 단일 claim은
  인접 inline reference, table claim은 해당 row/cell, step claim은 해당 step에 근거를 둔다.
- 하나의 claim에 여러 evidence item이 필요하거나, 여러 claim이 근거를 공유하거나, inline
  배치가 가독성을 해칠 때 subsection-local `Evidence:` block으로 묶는다. 문서 전체를 함께
  검증하는 편이 더 명확하고 각 claim의 mapping을 보존할 수 있을 때만 document-level evidence
  section을 쓴다.
- 근거를 분리할 때는 어떤 code/test item이 어느 claim을 지지하는지 label이나 mapping을
  보존한다. Body에 claim과 code/test mapping이 이미 있으면 별도 evidence list로 반복하지 않는다.
- Code/test 파일은 wikilink한다. Inline evidence는 wikilink 옆에 정확한 range를 적고, block
  evidence는 파일 wikilink 아래에 range를 적는다.
- 정확한 code/test range는 `file:line` 또는 `file:line-line`으로 쓴다.

Block evidence 예:

```md
The daemon persists queued deliveries in the message store.

Evidence:

- Queue persistence
  - [[src/daemon/state.ts]]
    - `src/daemon/state.ts:1761-1864`
```

### Sources

- `Sources:`는 logs, 이전 owner 문서처럼 provenance가 현재 판단, 재검토나 삭제 안전성에
  중요할 때만 쓴다. Current behavior evidence나 현재 권위를 대신하지 않는다.
- Provenance는 현재 판단과 연결되는 가장 좁고 유용한 범위에 둔다. 단순한 특정 claim의
  provenance는 해당 body나 footnote 가까이에 둔다.
- 하나의 claim에 여러 source가 필요하거나, 여러 claim이 같은 계보를 공유하거나, 본문 배치가
  가독성을 해칠 때 section-local 또는 문서 끝의 `Sources:` block으로 묶는다. 문서 끝 block은
  provenance가 문서 전체에 적용되고 source↔claim 관계를 복원할 수 있을 때 쓴다.
- `Sources`, provenance와 로그 경위처럼 경로 자체가 근거인 경우에는 backtick path를 유지한다.
- `Sources:` 때문에 과거 log가 current owner 내용을 해석하기 위한 required read가 되면, 현재
  권위 내용이 owner 문서에 충분히 증류됐는지 다시 확인한다.

## Reading And Context Recovery

읽기 범위와 검증 강도는 질문에 비례시킨다. 단순 의미 파악을 repo 전역 sweep으로 확장하지
않는다.

1. 질문 종류와 authoritative owner를 식별하고 해당 type의 child AGENTS를 확인한다.
2. 대상 문서와 판단에 필요한 최소 read path만 읽는다.
3. Intended/current/target/proposed와 document-level/section-level 의미를 구분한다.
4. Current behavior, root cause나 debugging 판단처럼 actual claim에 의존할 때만 관련 code/tests를
   검증한다.
5. 같은 판단을 복원할 근거가 확보되면 read path 확장을 멈춘다.

## Change And Drift Validation

변경 검증은 영향 범위에 비례시킨다. 이 section은 공통 loop만 소유하며 child AGENTS는 자기
type에 필요한 owner check, invariant와 상세 harness만 추가한다.

1. 변경할 knowledge의 authoritative owner와 target 문서를 식별한다.
2. 변경이 의존하거나 영향을 주는 owner 문서, code/tests와 meaningful inbound reference를
   판정한다.
3. Current/as-built claim에 의존하면 관련 code/tests를 검증하고 intended state와 actual state를
   구분한다.
4. 모든 관련 파일을 기계적으로 갱신하지 않고, 확인된 영향 범위에서 stale한 쪽만 정합화한다.
5. 변경 뒤 owner boundary, 최소 read path, claim↔evidence mapping과 문맥 복원 가능성을 다시
   확인한다.
6. 문서를 삭제할 때는 그 문서만으로 복원되는 knowledge가 승인된 owner나 code에 남는지와
   meaningful inbound reference를 함께 확인한다. Type-specific deletion harness가 있으면 그것을
   추가로 따른다. 하나라도 불확실하면 삭제하지 않고 보강, 이동 또는 사용자 확인으로 보낸다.

Drift 판정과 처리는 [[docs/documentation-system]] Conflict Resolution과 각 owner AGENTS를 따른다.
현재 code가 다르다는 이유만으로 product/spec/architecture intent를 조용히 바꾸지 않는다.
Owner나 authority를 바꾸는 drift는 어느 owner가 stale한지와 근거를 사용자에게 보고하고 작업
로그에 남긴 뒤 승인된 방향으로만 수정한다.

## Logs And Plans

- logs/·plans/의 owner 정의는 [[docs/documentation-system]]를 따른다.
- 로그 closeout과 owner handoff 절차는 `logs/AGENTS.md`가 소유한다.
- logs/plans는 durable knowledge owner가 아니다.
- docs 문서가 logs/plans를 참조할 때는 현재 권위의 대체물이 아니라 provenance·작업 경위로만 참조한다.
- docs에 반영할 결론이 logs/plans에서 나왔더라도 현재 권위 내용은 적절한 docs owner로 증류해서 남긴다.

## Markdown Validation

- inline code는 한 물리적 줄 안에서만 쓴다. multi-line inline code를 만들지 않는다.
- 줄바꿈이 필요한 code/evidence/path/command는 fenced code block이나 여러 개의 한 줄 inline code로 나눈다.
- docs 파일을 편집하면 `scripts/check-markdown-inline-code <file>`를 돌려 inline code span이 닫힌 상태인지 확인한다.
- 이번 편집 범위 안에서 발견한 inline code 문제는 고치되, 명시적 scope 없이 파일/문서 전체나 repo 전역 정리로 확장하지 않는다.

## Writing Style

- 문서는 현재 읽는 사람이 바로 판단할 수 있게 짧고 명확하게 쓴다.
- 설명을 위해 owner 문서 내용을 길게 복사하지 말고 링크한다.
- status, current/target, fact/inference/opinion이 섞일 수 있으면 명시적으로 구분한다.
