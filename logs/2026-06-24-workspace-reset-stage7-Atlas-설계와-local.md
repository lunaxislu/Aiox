---
topic: workspace reset stage7 Atlas 설계와 local 구현
description: workspace reset plan stage 7 — repo를 local Obsidian vault로 열어 모듈·계약·data flow·변경영향·코드위치·테스트·decision/spec link를 연결하는 구현 지도(Atlas)를 설계하고 local navigation layer로 구현한다. 권위 문서를 대체하지 않는 discovery 계층이며 enforcement는 상수·계약 테스트가 담당한다.
status: open
---

## Work Items
- [x] W1 Atlas 형태·docs 전환 방향 수렴 — 2026-06-25 closeout: docs-as-Obsidian-Atlas 확정, atlas/ 폐기, docs/maps/ 미생성, 자동화·code-review-graph 보류
- [x] W2 Cancelled: local vault·Atlas skeleton 구현 — 별도 atlas/ 폐기로 무효, W4~W6(docs-as-Obsidian-Atlas)가 대체
- [x] W4 docs/AGENTS.md 신규 + docs-as-Obsidian base rule + 하위 AGENTS 보강/생성 — 2026-06-25 완료: 6파일(신규 3·보강 3), dedup으로 split 일반규칙은 docs/AGENTS 단독 owner
- [x] W5 W10 split map(`logs/2026-06-22-workspace-reset-W10-split-readiness-map.md`) required-read → `docs/specs/aiox-a2a.md`·`docs/architecture/local-agent-runtime.md` body split, 원본은 compatibility index/stub holder 유지
- [x] W6 wikilink 정리 — Phase 1(line-level inbound repoint)·Phase 2(section inbound repoint)·Phase 3(15 slice 내부 wikilink) 완료(2026-06-25). Phase 3는 Claude 세션 끊김 후 Codex takeover → Claude review로 검증·보정(inline-code 0·dead link 0·코드 중복 wikilink 0, 위반 3건 수정 + capability decision 1건 @user 보강). 첫 샘플 게이트·logs 전체·전역 .md sweep·evidence 전역 정규화 제외 유지.
- [>] W3 Obsidian Graph/Backlink 검증 — navigation layer로 권위 비대체 + discovery 가치 확인 (실행 순서상 마지막; 기존 검증 항목 id 보존)

## 2026-06-24 · stage 7 착수 — required-read 통독, 범위·미결 설계 질문 정리

Parent pointer: `plans/workspace-reset/workspace-reset.md` stage 7 (`Atlas 설계와 local 구현`)

**착수 경위:** stage 6(물리 삭제 게이트)이 2026-06-24 종료(`decided`)된 뒤, @user가
다음 작업으로 "stage 7 Atlas 착수"를 선택했다. 착수 절차 = 이 전용 로그 생성 + plan
stage 7 `[ ]→[>]` 승격 + required-read 통독.

**required-read 통독 결과:** `history/59` Atlas digest(원문은 stage 6 W4에서 삭제,
보존 위치 = `logs/2026-06-23-workspace-reset-stage6-physical-deletion-gate.md:430-455`)를
읽었다. 핵심(상세는 그 digest가 owner, 여기 복사하지 않음):

- WHY: 일반 노트앱이 아니라 *구현 지도*. 낯선 개념(SQLite/CLI/MCP/socket)·구현 속도
  따라잡기, 오류 시 data flow·의존·변경 영향 범위 파악, agent의 변경 전 탐색 비용(관련
  계약·소비자·테스트 누락 방지) 감소가 목적.
- 검증 사례: Claude MCP 이름 mismatch 회귀(`aiox-claude-${command.name}` →
  `aiox-claude-ingress`). Atlas 가치 = producer/consumer/config/test를 같은 contract
  node에서 찾기. **단 재발 방지(enforcement)는 공용 상수·계약 테스트 담당, Atlas는
  discovery 전용** — 이 경계는 설계 내내 불변.
- 합의 방향 8개: repo 자체를 Obsidian vault로 염 / `.obsidian/`·`atlas/`는 local-only /
  구현 지도(memory·todo 아님) / 모듈·계약·data flow·변경영향·코드위치·테스트·decision·
  spec link 연결 / Graph=전체탐색·Canvas=핵심흐름·note=상세 / discovery vs enforcement
  분리 / `code-review-graph`는 read-only spike 전 미채택 / 생성·운영 자동화는 hook·skill
  단계.
- 예상 skeleton: local-only `.obsidian/`, `atlas/modules`, `atlas/contracts`,
  `atlas/flows`, `atlas/maps`. (원문은 어떤 파일도 실제 생성·변경하지 않은 순수 설계
  합의 기록.)

**stage 7 범위와 stage 8 경계:**

- stage 7(이 로그) = Atlas 설계 + local 구현.
- stage 8(plan 다음 단계) = Atlas 도입 뒤 `AGENTS.md`·`docs/guides/workflow.md`·관련 owner
  문서가 새 탐색 흐름을 반영해야 하는지 / stale·drift 재검토. **이 로그에서 하지 않는다.**

**W1에서 수렴할 미결 설계 질문(digest "후속 설계 입력"):**

- note granularity — Atlas note를 모듈/계약/flow 단위로 어디까지 쪼갤지.
- 관계 유형 표기 — producer/consumer, depends-on, tested-by, decided-by 등을 link에 어떻게
  표기·구분할지.
- Graph View filter/color, Canvas 핵심 flow 선정 기준.
- source 변경 ↔ Atlas 갱신을 잇는 hook/skill 책임 — 자동화를 stage 7 범위에 넣을지, 별도
  라인으로 분리할지.
- `code-review-graph` read-only spike — stage 7 안 Work Item으로 둘지 별도 로그로 분리할지.

이 둘(hook/skill 자동화 범위, code-review-graph spike 분리)은 경계가 애매해 추측으로
Work Item에 미리 박지 않았다. W1 설계 수렴에서 @user와 결정한 뒤 Work Item 추가/분리한다.

**다음 행동:** W1 — 위 미결 설계 질문을 @user와 함께 결정해 `atlas/` skeleton 구조를
확정한다. enforcement(상수·계약 테스트) 경계는 건드리지 않는다.

## 2026-06-24 · W1 설계 전환 — `docs/` 자체를 Obsidian-friendly Atlas 본체로 사용

**@user 피드백과 관찰:**

- @user는 Obsidian을 잘 모르는 상태에서 "repo 자체를 Obsidian vault로 연다"는 결정을
  우선 내렸다고 설명했다. 핵심 질문은 Obsidian이 이 프로젝트에 실제로 무엇을 잘 해주는지,
  현재 구조에서 활용할지 버릴지다.
- @user는 Obsidian Graph에서 exclude 설정만으로는 원하는 문서만 숨겨지지 않았지만,
  Graph filter에 `path:atlas/`를 쓰면 Atlas 관련 노드만 볼 수 있음을 확인했다.
- `claude-ingress-name` 관련 노트가 `cli`, `adapters`, `aiox-send`, `.mcp.json` 등과
  한눈에 연결되어 보였고, `logs/` 연결도도 의미 있게 보였다고 보고했다.
- @user는 문서 하나를 수정할 때 연결된 N개 문서를 한 번쯤 검토하는 workflow가 유용해
  보인다고 판단했다.
- @user는 `docs/` 하위 내용이 외부 공개 문서라기보다 본인과 agent를 위한 내부 문서라고
  보며, 별도 `atlas/specs`가 아니라 기존 `docs/specs`, `docs/architecture`,
  `docs/decisions` 자체가 Obsidian에서 다루는 Atlas 본체가 되어야 한다고 정정했다.

**@codex 판단 변화:**

- 초기 제안인 "`docs/` owner + 얇은 `atlas/` 지도"는 Atlas 내용이 커지면 같은 의미를
  두 군데에서 고치는 중복 관리 위험이 있다.
- 따라서 W1 방향은 "`atlas/`가 `docs/`를 대체"가 아니라, **기존 `docs/` owner 문서 자체를
  Obsidian-friendly하게 바꿔 vault/Atlas 본체로 사용**하는 것으로 전환한다.
- `atlas/` 폴더를 만든다면 owner 문서 복제본이 아니라 Canvas, entry map, Graph 사용 보조
  같은 비권위 navigation artifact만 둔다. 또는 이 보조 layer도 `docs/maps/`처럼 둘 수
  있는지 W1에서 계속 판단한다.
- Obsidian skill, LLM wiki류 자동화, `code-review-graph`류 skill은 지금 도입하지 않는다.
  현재 확인된 가치는 "작은 수동 링크 그래프"에서 나온 것이며, 자동화 도입은 유지 비용과
  권위 오해 위험이 크다. `code-review-graph`는 별도 read-only spike 후보로만 둔다.

**현재 W1 결론 후보:**

- repo는 Obsidian vault로 열 수 있다.
- Atlas의 본체는 별도 복제 문서가 아니라 기존 `docs/` owner 문서다.
- `docs/` 하위 문서는 Obsidian-friendly Markdown으로 점진 변경한다.
- agent 규칙은 `AGENTS.md` 또는 하위 `docs/AGENTS.md` 계층에 정의하되, Obsidian UI 사용법이
  아니라 "wikilink/frontmatter/owner/link/staleness/중복 금지" 같은 repo 작업 계약만 담는다.
- `legacy/`는 vault 탐색에서 제외하며 내용 탐색 대상이 아니다.
- `logs/`는 작업 경위와 handoff owner로 유지하되, Graph에서 연결 검토 대상이 될 수 있다.

**다음 W1 행동:** Obsidian-friendly `docs/` 전환 규칙을 구체화한다. 특히 기존 owner taxonomy를
유지하면서 어떤 link 형식(`[[wikilink]]` vs Markdown link), 어떤 metadata, 어떤 중복 금지
규칙을 AGENTS 계층에 둘지 확정해야 한다.

## 2026-06-24 · W1 Obsidian link 동작 확인

**확인한 외부 출처:** Obsidian 공식 help 문서.

- `https://help.obsidian.md/links`
- `https://help.obsidian.md/plugins/graph`
- `https://help.obsidian.md/plugins/backlinks`

**확인한 사실:**

- Obsidian internal link는 `[[Note]]` wikilink와 `[Note](Note.md)` Markdown link를 모두
  지원하며, vault 안에서는 둘 다 내부 link로 취급된다.
- Obsidian은 기본적으로 짧은 wikilink 형식을 생성한다. 상호운용성이 중요하면 설정에서
  wikilink 생성을 끄고 Markdown link를 쓰게 할 수 있다.
- Graph View의 edge는 vault 안 노드 사이의 internal link를 나타낸다. 따라서 `docs/`,
  `logs/`, `plans/` 등 vault 안 Markdown 문서가 서로 internal link를 가지면 graph/backlink
  대상이 된다.
- Backlinks는 현재 note를 link한 다른 note를 보여주며 linked mentions와 unlinked mentions를
  구분한다.
- heading link(`[[문서명#Heading]]`)와 block link(`[[문서명#^block-id]]`)가 가능하다. 단,
  block link는 Obsidian 전용성이 강해 repo/agent 상호운용성 관점에서는 신중해야 한다.

**W1 판단에 미친 영향:**

- `docs/` 자체를 Atlas 본체로 쓰려면 Graph/Backlink에서 의미 있는 문서 관계를 만들기 위해
  내부 문서 간 관계는 Obsidian internal link로 표현해야 한다.
- link 형식은 아직 확정하지 않는다. 다만 문서 노드 관계에는 internal link를 쓰고, 코드·테스트
  파일 경로와 line reference는 기존 path/Markdown 근거 표기를 유지하는 방향이 유력하다.
- logs가 graph에 보이는 것은 의도와 충돌하지 않는다. `logs/`는 작업 경위 owner이며, 관련
  decision/spec/architecture 문서와 연결되면 "왜 이 문서가 생겼는가"를 탐색하는 데 유용하다.

## 2026-06-24 · W1 — Obsidian 방향 확정: 작은 spike + Gemini 위임, vault 방식·첫 flow 결정

- **배경:** @user가 Obsidian 미숙을 밝히고, "repo를 vault로 연다"던 결정도 사용법을 몰라 잠정적으로 정한 것이라 재검토 요청. 과거 복잡한 LLM wiki류 자동화 skill 더미를 도입했다 유지 실패한 경험 공유.
- **확정 결정:**
  - Obsidian은 도입/폐기를 말로 더 다투지 않고 **작은 spike로 직접 체감 후 판단**한다(활용 또는 버림). plan completion의 "navigation layer 검증"을 spike로 앞당김.
  - **자동화 폐기 확정** — 자동 동기화 hook/skill 안 만든다. @user 유지 실패 경험 + digest 합의(자동화는 별도 단계) 일치. Atlas는 손으로 그리는 수동 지도.
  - **vault 방식 A**: vault = repo 루트, `atlas/`는 그 안의 지도 폴더(= vault 아님). 이유: 노트에서 `[[src/...]]` 실제 코드로 점프·Graph 노드 연결이 되려면 코드가 vault 안에 있어야 함. atlas/만 vault로 여는 방식 B는 코드와 끊겨 체감 불가라 기각.
  - **`legacy/` = 보존 + vault 제외**(@user). 내용 탐색·disposition 판정 안 함. node_modules/dist와 함께 Obsidian Excluded files로 숨김.
  - **`aiox/`로의 디렉토리 이전은 stage 7과 분리**. Obsidian 목적이면 Excluded 설정으로 충분해 불필요하고, import/config/onramp/문서참조 대규모 churn은 workspace reset 직후 리스크. 루트 정리가 목적이면 별도 판단.
- **분담(협업 패턴: 저작→Claude checker):** Claude가 Gemini용 spike task brief 작성·결과 checker / Gemini가 `atlas/` 파일 산출 / @user가 Obsidian 앱 GUI(vault 열기·Excluded)·brief 전달. 전달 경로 = @user가 brief를 Gemini에 직접 전달(aiox CLI 미사용 — A2A 동작 불확실).
- **첫 flow 선택:** `aiox send` 한 메시지가 상대 agent에 전달·응답되기까지의 경로. 출발점 `src/bin/aiox.ts`. 경유 후보(코드 추적으로 확정 예정): `src/cli/*` → `src/core/messages.ts·routes.ts·pairs.ts` → `src/daemon/socket-transport.ts·api.ts` → `src/store/*` → `src/adapters/claude|codex`. 검증 사례 연결: adapters MCP ingress 이름(`aiox-claude-${command.name}` ↔ `aiox-claude-ingress` 회귀)을 contract 노트로 만들어, Atlas가 producer/consumer/config/test를 한자리에 모으는 가치를 실제 체감 대상으로 삼음.
- **brief 사양(검증 기준):** 산출 = `atlas/{flows,modules,contracts,maps}` + 노트 6~8개 + `.gitignore` 2줄(`.obsidian/`,`atlas/`). 제약 = 코드/기존문서 수정 금지(atlas/+gitignore만), 자동화·플러그인 금지, owner 내용 복붙 금지(링크만), Canvas는 선택, Obsidian 앱 조작 금지. 완료보고 = 파일목록·추적한 실제 호출경로·`[추정]` 표시분·수정범위 확인.
- **다음:** @user가 brief를 Gemini에 전달 → Gemini 산출 → Claude가 brief 사양으로 검증 → @user가 Obsidian으로 열어 체감 → **활용/버림 최종 판단**(W1 종료 조건). W1 active 유지.

## 2026-06-24 · W1 — Gemini Atlas spike 산출물 Claude 검증 (PASS)

- **Gemini 산출:** `atlas/` 7개 노트(maps/README · flows/aiox-send · modules/{cli,daemon,adapters} · contracts/{a2a-message,claude-ingress-name}) + `.gitignore`에 `.obsidian/`·`atlas/` 추가.
- **Claude 검증 = PASS** (Gemini 자기보고를 맹종하지 않고 코드와 직접 대조):
  - 수정 범위: `.gitignore`만 변경, `src/`·`docs/`·`tests/` 0건 수정. `atlas/`는 gitignore로 untracked(local-only 의도대로). ✅
  - dead link: atlas 노트가 가리키는 owner/test/code 파일 10개 전부 실재(decision 1·test 5·src 3·spike .mcp.json 1), dead 0. ✅
  - 라인 정확도 스팟체크: `runSendMessageTransaction` 정의 = `state.ts:1761`(주장 일치), `receiveClaudeChannelMessage` 구현 = `api.ts:334`(주장 일치; `:67`은 인터페이스 선언). Gemini가 정의/구현 라인을 정확히 구분함. ✅
  - owner 비대체: `maps/README`가 Out-of-Scope로 "authoritative docs 대체 안 함, architecture/decisions가 owner"를 명시·링크. 본문 복붙 없음. ✅
  - 노트 수 7개(6~8 이내), Canvas 미생성(지시대로). ✅
- **발견(오류 아닌 정정):** brief가 첫 flow 출발점을 `src/bin/aiox.ts`의 CLI `aiox send`로 가정했으나, 실제로 그런 CLI 서브커맨드는 없다(`src/cli/parse.ts`에 `send` 0건, bin은 parseCli/invokeParsedCommand만 등록). send는 **agent용 MCP tool**(claude `createSendHandler` `channel-server.ts:285`, codex `createSendMessageHandler`)이다. Gemini가 brief 가정을 맹종하지 않고 코드를 추적해 실제 진입점(Agent Tool Call)을 올바로 잡음 — 추적 신뢰도 신호. flow 노트 출발점이 정확하다. brief의 내 가정이 부정확했던 것.
- **다음:** @user가 Obsidian에서 repo 루트를 vault로 열고 Excluded(`legacy/`·`node_modules/`·`dist/`·`.git/`) 설정 후 Graph/노트 탐색 → 실제 navigation 가치 체감 → **활용/버림 최종 판단**(W1 종료 조건). W1 active 유지.

## 2026-06-24 · 세션 종료 — W1 현황 정리 및 다음 세션 handoff

다음 세션이 이 블록만 읽어도 W1을 재개할 수 있도록 현황을 정리한다(@user 요청).

**이번 세션 진행(시간순):**

1. stage 7 착수 — 전용 로그 생성, plan stage 7 `[ ]→[>]` 승격, required-read(`history/59` Atlas digest) 통독.
2. Gemini에 Atlas spike 위임(brief 발행) → Gemini가 `atlas/` 노트 7개 산출(maps/README·flows/aiox-send·modules/{cli,daemon,adapters}·contracts/{a2a-message,claude-ingress-name}) + `.gitignore`에 `.obsidian/`·`atlas/` 추가.
3. @claude 검증 PASS — 수정범위 `.gitignore`만(코드/문서 0건), dead link 0, 라인 정확(`state.ts:1761`·`api.ts:334` 일치), owner 비대체. 발견: brief의 `aiox send` CLI 가정은 오류(그런 CLI 없음), Gemini가 실제 진입점(MCP send tool)을 코드 추적으로 올바로 잡음.
4. @user Obsidian 체감 → Atlas 가치 확인(ingress가 cli·adapters·.mcp.json과 한눈에, logs 연결도, 한 문서 수정 시 연결 N개 검토). `path:atlas/` graph filter 운영법 발견(Excluded만으론 부족).
5. **방향 전환** — @user 정정: `docs/`는 외부공개가 아닌 내부문서이므로 별도 `atlas/specs` 복제가 아니라 **기존 docs/(specs·architecture·decisions) owner 문서 자체를 Obsidian-friendly Atlas 본체로 사용**. @codex 정리(블록 `:62`·`:106`), @claude 동의.

**⚠️ 블록 시간순 주의:** 물리적 순서와 시간순이 다르다(@codex가 자기 블록을 @claude 블록 위에 삽입). 시간순 = 착수(`:12`) → 방향확정(`:137`) → 검증PASS(`:151`) → link동작확인(`:106`) → 설계전환(`:62`) → 이 블록. **권위 최신 = 설계전환(`:62`) + link확인(`:106`) + 이 블록.**

**확정·합의:**

- Atlas 가치 체감됨 → 활용 방향. 자동화는 미도입(Obsidian skill·LLM wiki·code-review-graph). code-review-graph는 별도 read-only spike 후보로만(추적이 반복 pain이 되면 평가).
- **별도 atlas/ 문서 복제 ❌ → docs/ owner 문서 자체가 Atlas 본체**(중복관리 위험 회피).
- legacy/ vault 제외. logs/는 작업경위 owner 유지 + Graph 연결 검토 대상 OK(충돌 없음).
- Gemini `atlas/` 7개 = @claude 검증 PASS. 단 이건 코드축 산출물 → 아래 미결 2의 처분 대상.
- Obsidian internal link는 `[[wikilink]]`·`[txt](path.md)` Markdown link 둘 다 Graph/backlink 인식(@codex 공식help 확인 `:108-126`).

**미결(다음 세션 @user와 수렴):**

1. **링크 형식 확정** — `[[wikilink]]` vs 표준 Markdown link. @claude 의견: git-tracked owner 문서엔 표준 Markdown link 권장(GitHub 등 렌더링 유지·비표준 문법 회피, Graph도 인식). @codex 유력안: 문서 노드 관계엔 internal link, 코드/테스트 경로·line ref는 기존 path 표기 유지. block link(`#^id`)는 Obsidian 전용성 강해 신중. **실증(이번 세션):** `atlas/contracts/claude-ingress-name.md:15`의 `[[...mcp.json#L3]]` wikilink가 Obsidian에서 클릭되며 `spikes/.../.mcp.json.md` 0바이트 빈 노트를 자동 생성(gitignore 밖이라 git 오염) → @claude가 삭제. **wikilink로 비-`.md`(.json/.ts) 파일을 가리키면 빈 노트 생성 부작용** = 코드/설정 파일은 wikilink 금지·path 표기 유지 근거. 미결 2의 코드축 링크 표기와 함께 확정 필요.
2. **두 navigation 축 + Gemini atlas/ 처분** — 문서 navigation(docs 간)=전환 본체 / 코드 navigation(`atlas/`=src flow 지도)=별개 축, 처분 미정(폐기/유지/`docs/architecture` 흡수). @user 체감 가치(ingress 한눈에)는 코드축에서 나오므로 단순 폐기 시 그 가치 손실 주의.
3. **docs/ Obsidian-friendly 전환 규칙** — 링크형식·metadata·중복금지 규칙을 어느 AGENTS 계층(`AGENTS.md`/`docs/AGENTS.md`)에 둘지. Obsidian UI 사용법이 아니라 repo 작업 계약(wikilink/frontmatter/owner/link/staleness/중복금지)만 담는다.
4. **atlas/ 보조 layer 위치** — 만든다면 owner 복제가 아닌 Canvas/entry map/Graph 보조 artifact만. `docs/maps/`로 둘지(@codex 제안 `:85-87`).

**다음 행동(W1 재개점):** 위 미결 1~4를 @user와 수렴해 Atlas 형태·docs 전환 규칙을 확정하고 W1을 closeout한다. owner 문서(`docs/`) 형식 변경은 `log-writing-rules`에 따라 @user 승인 후 반영한다. W1 `[>]` 유지. (plan stage 7도 `[>]` 유지 — onramp는 이 로그 next pointer로 재개.)

## 2026-06-24 · W1 — 링크 형식 결정: 부작용 원인=dotfile 정정, wikilink 사용(부작용 0.5 감수)

**@user 결정:** Atlas 링크 형식 = `[[wikilink]]`를 사용한다. dotfile 빈 노트 부작용은
@user 기준 심각성 0.5(1~5 척도)라 감수하며 더 추적하지 않는다. 빈 노트 청소도 @user가 한다.

**부작용 원인 확정 — 이전 결론 정정(사실, @user가 Obsidian에서 직접 클릭 검증):**

- 이전 두 세션 결론 "비-`.md`(.json/.ts) 파일을 wikilink로 가리키면 빈 `.md` 자동생성"은 부정확했다.
- 변수 분리 실증:
  - `[[src/bin/aiox.ts]]`(.ts, 앵커X) → 정상 점프(vscode). `[aiox.ts](path)` Markdown link도 정상.
  - `[[src/cli/invocation.ts#L213]]`(.ts, `#L` 앵커O) → 정상, 빈 노트 안 생김 → **`#L` 앵커는 원인 아님.**
  - `[[spikes/.../.mcp.json]]`(.json, 앵커X) → 빈 노트 생성. 대상 파일은 실재(366B) → **앵커·부재 모두 무죄.**
- 두 케이스의 유일한 차이 = 파일명이 `.`으로 시작하는 **dotfile**(`.mcp.json`). Obsidian이 dotfile을
  hidden 처리해 vault에서 인식하지 못하는 것이 원인(추론, 위 일관된 증거 기반). `.ts`가 점프되는 건
  "Detect all file extensions" 설정 ON 추론.

**미결 1(링크 형식) = 해소.** 결정 = wikilink 사용. dotfile은 클릭 시 가끔 빈 노트가 생기나 0.5라 감수.
라인 근거는 링크 앵커가 아니라 `file:line` 텍스트로 표기(maps/README가 이미 선언한 컨벤션). 이전 세션
handoff의 "코드/설정 파일 wikilink 금지·path 표기 유지" 근거는 원인 오판(.json 확장자 탓)에 기반했으므로 철회한다.

**잔존 미결(W1 계속, `[>]` 유지):** 미결 2(코드축 `atlas/` 처분), 미결 3(docs Obsidian-friendly 전환 규칙),
미결 4(atlas 보조 layer 위치). 다음 행동 = 미결 2~4 수렴 후 W1 closeout.

**정리 메모:** 이번 검증으로 생긴 빈 노트 `spikes/.../.mcp.json.md` 1개(0바이트, untracked)는 @claude가 삭제.
`atlas/maps/README.md` 하단 LINK TEST 블록(테스트 4)은 local-only라 잔존 — @user가 정리.

## 2026-06-25 · W1 closeout — stage 7 방향 확정(docs-as-Obsidian-Atlas) + Work Items 재정의

@user·@codex·@claude 3자 수렴으로 stage 7 방향과 Work Items를 확정한다. 미결 2·3·4가 모두 해소되어 W1(방향 수렴)을 완료(closeout)한다.

**stage 7 최종 방향 = docs-as-Obsidian-Atlas:** 별도 `atlas/` navigation layer를 만들지 않고, 기존 `docs/`(specs·architecture·decisions·…) owner 문서 자체를 Obsidian-friendly하게 전환해 vault/Atlas 본체로 쓴다.

**확정 결정 5개:**

1. docs/ 자체가 Atlas 본체(별도 복제 문서 없음).
2. 코드축 `atlas/` 폐기 — @user가 디렉토리 삭제 + `.gitignore`에서 `atlas/` 제거 완료(`.obsidian/`만 잔존). 별도 Atlas 문서 복제는 방향과 충돌.
3. `docs/maps/` 미생성 — Obsidian Graph 자체가 map. 별도 보조 layer 불필요.
4. 자동화·Obsidian skill·code-review-graph 보류 — 수동 링크 그래프로 충분, 유지비용·권위오해 위험. code-review-graph는 read-only spike 후보로만.
5. stage 7 plan·log 문구를 "별도 Atlas navigation layer 생성" → "docs-as-Obsidian-Atlas 구현"으로 갱신(이 closeout에서 plan 반영).

**Work Items 재정의(id 보존 규칙 적용 — @user 논리번호와 로그 id는 별개):**

- W1(방향 수렴) → completed.
- W2(별도 atlas/ skeleton 구현) → Cancelled. atlas/ 폐기로 무효, 아래 새 항목이 대체.
- W3(Atlas 검증) → 유지·구체화(Obsidian Graph/Backlink 검증). 실행 순서상 마지막.
- W4(신규): `docs/AGENTS.md` + docs-as-Obsidian 작성 base rule + 하위 AGENTS 보강/생성.
- W5(신규): W10 split map 소비 → `aiox-a2a.md`·`local-agent-runtime.md` body split, 원본 stub holder 유지.
- W6(신규): wikilink 정리 + 샘플 검토 게이트.
- **실행 순서 = W4 → W5 → W6 → W3**(id는 비순차이나 보존 규칙 준수).

**W5 근거(충돌 아님, 미실행 작업의 실행):** W10 split readiness map(`logs/2026-06-22-workspace-reset-W10-split-readiness-map.md`, status `decided`)이 두 monolith(60KB/71KB)의 split map(section→slice, anchor 보존, inbound 인벤토리, README 결론)을 이미 완성했고 body split은 "후속 executor" 소유로 미실행으로 남겼다. W5는 그 map을 required-read로 소비해 실행한다. 원본은 compatibility index/stub holder로 유지(anchor·inbound 비파괴).

**W6 범위(@user·@codex 합의):**

- 포함: split된 slice 내부 cross-ref + 각 slice→코드/decision 링크 + split이 직접 만든 핵심 inbound(decisions·spec·architecture·product가 새 slice를 가리키는 관계).
- 게이트: split된 문서 1개를 먼저 wikilink 변환 → @user에게 예시 제시·검토 → 패턴 승인 후 나머지 일괄.
- 제외: `logs/` 과거 기록 전체, repo 전역 `.md` 기계 변환(필요 시 별도 후속 sweep).
- inbound 포함 이유: decision↔contract↔코드가 한 노드에서 연결되는 게 @user가 Obsidian에서 체감한 Atlas 가치의 핵심. 빼면 Graph가 빈약해짐.

**W4 우선 이유:** W5/W6 실행자가 "Obsidian-friendly로 쪼갠다"를 제각각 해석하지 않도록 작성 base rule을 먼저 확정한다.

**다음 행동:** W4(`docs/AGENTS.md` + base rule) 착수.

## 2026-06-25 · W4 완료 — docs/AGENTS.md 신규 + base rule + 하위 AGENTS 보강/생성

@user가 본인 초안(docs-as-Atlas base rule)을 제시했고, @claude 검토로 기존 owner와의
중복 3건을 발견해 dedup 방향(@user 승인)으로 반영했다. @user 추가 지시: dotfile 예외는
작성 불필요(이미 인지), product/guides는 각주 대신 AGENTS 생성.

**핵심 설계 — docs-as-Obsidian-Atlas base rule 위임 스택:**

- `docs/AGENTS.md`(신규) = docs 서브트리 공통 작성 규칙의 단독 owner. type별 의미 규칙은
  하위 5개 AGENTS로 위임, owner 경계는 [[documentation-system]]로 위임.
- **dedup 결정**: @user 초안의 3개 섹션이 기존 owner와 중복 → 다음과 같이 해소.
  - **Splitting** = `docs/AGENTS.md`가 단독 owner로 승격. 이유: W5가 spec(`aiox-a2a.md`)·
    architecture(`local-agent-runtime.md`)를 둘 다 split → cross-type. `specs/AGENTS §3`은
    일반 규칙을 부모로 위임하고 spec 전용(Section ID 앵커·MUST/SHOULD 보존)만 잔존.
  - **Staleness/Drift** = `documentation-system.md` Conflict Resolution + `architecture/AGENTS §4`가
    owner. 부모는 1줄 operative reminder + 위임만.
  - **Logs And Plans** = `documentation-system.md`가 owner. 부모는 Obsidian-new(graph
    provenance only)만 남기고 위임.
- 코드 wikilink **허용**(W1 정정 사실 기준: dotfile만 빈 노트, 일반 `.ts`는 정상). line 근거는
  `file:line` 텍스트 유지.

**검증 Ledger (다른 agent가 이 로그만으로 pass/fail 판정 가능):**

| # | 검증 항목 | 기대 | 결과 |
| - | --------- | ---- | ---- |
| 1 | `docs/AGENTS.md` 신규 생성 | 존재 | PASS (frontmatter + 8 섹션) |
| 2 | `docs/product/AGENTS.md` 신규 | 존재·type 전용 규칙 | PASS |
| 3 | `docs/guides/AGENTS.md` 신규 | 존재·type 전용 규칙 | PASS |
| 4 | specs/architecture/decisions AGENTS 보강 | 각 상단 [[docs/AGENTS]] 위임 1줄 | PASS (3건) |
| 5 | dedup — specs §3 슬림화 | 일반 split 부모 위임 + spec 전용만 | PASS |
| 6 | 중복 0 | base rule이 기존 owner 본문 재서술 안 함 | PASS (Splitting만 부모 단독 owner) |
| 7 | thin-root 위임 | owner/중복금지/drift는 재서술 아닌 링크 위임 | PASS |
| 8 | wikilink 형식 | doc↔doc=`[[...]]`, basename 충돌은 path-qualified | PASS |

**Scope 준수:** 수정 범위 = `docs/` AGENTS 계층 6파일만. `src/`·owner 콘텐츠 문서·root
`AGENTS.md`·`plans/` 0건 변경(root는 auto-managed 블록 이슈로 W4 제외 — 별도 판단). owner
*콘텐츠* 문서의 Obsidian-friendly 전환은 W5/W6이 소유.

**미반영(의도)**: dotfile 예외 미작성(@user 지시), root AGENTS References에 `docs/AGENTS.md`
포인터 추가 보류(별도).

**다음 행동:** W5 착수 — `logs/2026-06-22-workspace-reset-W10-split-readiness-map.md`(status
`decided`)를 required-read로 소비해 `docs/specs/aiox-a2a.md`·`docs/architecture/local-agent-runtime.md`
body split 실행. 원본은 compatibility index/stub holder 유지. split 작성은 방금 확정한
`docs/AGENTS.md` Splitting 규칙을 따른다.

## 2026-06-25 · W5 진행 — spec body split 완료(architecture는 다음 세션)

W10 split readiness map(`logs/2026-06-22-workspace-reset-W10-split-readiness-map.md`,
`decided`)을 required-read로 소비해 spec monolith를 body split했다. **architecture split은
다음 세션(@user 결정).** W5는 `[>]` 유지.

**적용 규칙·결정:**

- slice 경계 = map W2 표(`...W10-split-readiness-map.md:227-244`) 확정 매핑: §3.1 / §4(+4.1~4.5
  umbrella) / §5 / §6 / §7(+7.1~7.2) / §8 / §9 → 7 slice. §2 Glossary·§3 Layer model은 overview라
  index(원본)에 보존(map "index-keep").
- §4 granularity = umbrella 1파일(`aiox-message-lifecycle.md`에 §4.1~4.5 유지) 채택 — subsection이
  짧고 결합도 높으며 §4.x anchor가 slice 내부에 보존됨. map이 제시한 per-subsection 분할 후보는
  채택 안 함.
- **별도 README 미생성** — W2 producer의 README 필요 [Opinion](`...split-readiness-map.md:248-253`)에서
  벗어남. 근거: architecture map 결론(`:387`)·portable 회고(`:447`, "old monolith가 anchor-preserving
  index가 될 수 있으면 README는 중복 navigation")와 방금 확정한 `docs/AGENTS.md` base rule("Obsidian
  Graph 자체가 map, 별도 map 폴더/문서 안 만듦")이 index-only를 지지. 원본 `aiox-a2a.md`가
  compatibility index 겸 navigation hub.
- stub holder = `docs/AGENTS.md` Splitting 규칙 준수: 원본은 모든 §/§.x heading 보존 + body는
  wikilink로 slice 안내. W5의 wikilink는 stub redirect로 한정(slice 내부 cross-ref·코드/decision
  링크는 W6 소유).

**산출물:**

- 신규 slice 7 (`docs/specs/`): `aiox-runtime-profile-namespace.md`(§3.1) ·
  `aiox-message-lifecycle.md`(§4+4.1~4.5, 305줄) · `aiox-adapter-model.md`(§5) ·
  `aiox-compose-contract.md`(§6) · `aiox-capability-policy.md`(§7+7.1~7.2) ·
  `aiox-federation-remote.md`(§8) · `aiox-open-deferred.md`(§9).
- `aiox-a2a.md` 인덱스화: 870줄 → 157줄. intro+상태어휘+§2 Glossary+§3 Layer model overview 보존 +
  Document map TOC 추가 + §3.1~§9 전 heading stub.

**검증 Ledger (다른 agent가 이 로그만으로 pass/fail 판정 가능):**

| # | 검증 항목 | 방법 | 결과 |
| - | --------- | ---- | ---- |
| 1 | anchor 보존 | index `grep ^#` → §2·§3·§3.1·§4·§4.1~4.5·§5·§6·§7·§7.1·§7.2·§8·§9 전 heading 존재 | PASS |
| 2 | 본문 이동 | 각 slice가 원본 §heading 그대로 본문 소유(grep `^## [0-9]`/`^### [0-9]`) | PASS |
| 3 | 중복 0 | 본문 토큰(`aiox.message.v1`·`full_duplex_structured`·`view driver`·`L2 → L1 → L3`·`session expiry handling`) 각각 해당 slice 1곳에만, index 부재 | PASS |
| 4 | 의도적 잔존 | `Capability Projection Layer`만 §2 glossary 정의로 index+slice 양쪽(정상) | PASS |
| 5 | 줄수 정합 | 원본 870 → index 157 + slice 본문, 누락 없음(slice 합 813, header 28줄 포함) | PASS |
| 6 | owner body 외 무수정 | `src/`·decisions·plans 0건 변경(spec slice/index만) | PASS |

**경계 준수:** Cross-Owner Effects 미발생. inbound 참조처(decisions·plans)는 anchor 보존으로
비파괴 — repoint 불필요(원본 `aiox-a2a.md#<section>` 그대로 유효). map의 `plans/post-mvp.plan.md:101`
§8 vs §4 flag는 W10이 later plan-stage owner로 남긴 사항이라 W5 범위 밖(미수정).

**다음 행동(다음 세션):** architecture body split — `docs/architecture/local-agent-runtime.md`
(1181줄, §0~§14)를 같은 패턴으로 index + 9 slice(`process-topology`§1 / `store-and-repositories`§2~3 /
`daemon-transport-api`§4~5 / `claude-adapter`§6 / `codex-adapter`§7 / `routing-and-delivery`§8+§4.3 /
`cli-and-operator-surfaces`§9 / `errors-events-smoke`§10~12 / `gaps-and-targets`§13)로 분할. §0 Purpose·
§14 Authority Links는 root index 보존. map W3 표(`...split-readiness-map.md:359-383`)가 slice 경계 owner.
architecture 완료 후 W5 전체 closeout(`[x]`) → W6(`[>]`) 전이. W5 `[>]` 유지.

## 2026-06-25 · W5 완료 — architecture body split + W5 전체 closeout

W10 split readiness map(`logs/2026-06-22-workspace-reset-W10-split-readiness-map.md`,
`decided`) W3 표를 required-read로 소비해 architecture monolith를 body split했다. spec과
동일 패턴. 이로써 W5 전체(spec + architecture)가 완료된다.

**적용 규칙·결정:**

- slice 경계 = map W3 표(`...W10-split-readiness-map.md:359-383`) 확정 매핑: §1 / §2~3 /
  §4(+4.1,4.2)+§5 / §6(+6.1~6.5) / §7(+7.1~7.10) / §8(+8.1~8.6)+§4.3 / §9(+9.1~9.3) /
  §10(+10.1~10.6)+§11+§12 / §13 → 9 slice.
- **§4.3 cross-section 이동**: 원본에서 §4 daemon transport 아래 있던 sendMessage
  end-to-end sequence를 routing slice가 가진다(map `:368` "move detailed sequence near §8
  while §4 stub links there"). 원본 인덱스 §4.3 anchor는 stub으로 보존(routing redirect),
  daemon-transport-api slice §4.3 자리에도 redirect 한 줄.
- §0 Purpose(6모듈 overview, 사람용 map)·§14 Authority Links·preamble blockquote·status
  어휘는 root index가 소유(index-keep, map `:361,:383`).
- **별도 README 미생성** — spec과 동일. map README 결론(`:385-393`, anchor-preserving index가
  있으면 README는 중복 navigation)·`docs/AGENTS.md` base rule("Graph 자체가 map") 준수.
  root index가 navigation hub.
- stub holder = `docs/AGENTS.md` Splitting 규칙: 원본은 §0~§14 모든 heading(§N.x deep 포함)
  보존 + body는 wikilink stub redirect. W5 wikilink는 stub redirect로 한정(slice 내부
  cross-ref·코드/decision 링크는 W6 소유).

**산출물:**

- 신규 slice 9 (`docs/architecture/`): `local-runtime-process-topology.md`(§1) ·
  `local-runtime-store-and-repositories.md`(§2~3) · `local-runtime-daemon-transport-api.md`
  (§4+4.1+4.2,§5) · `local-runtime-claude-adapter.md`(§6+6.1~6.5) ·
  `local-runtime-codex-adapter.md`(§7+7.1~7.10) · `local-runtime-routing-and-delivery.md`
  (§8+8.1~8.6,§4.3) · `local-runtime-cli-and-operator-surfaces.md`(§9+9.1~9.3) ·
  `local-runtime-errors-events-smoke.md`(§10+10.1~10.6,§11,§12) ·
  `local-runtime-gaps-and-targets.md`(§13).
- `local-agent-runtime.md` 인덱스화: 1187줄 → 320줄. preamble + §0 module overview + §14
  Authority Links 보존 + Document map TOC + §1~§13 전 heading stub.

**검증 Ledger (다른 agent가 이 로그만으로 pass/fail 판정 가능):**

| # | 검증 항목 | 방법 | 결과 |
| - | --------- | ---- | ---- |
| 1 | anchor 보존 | `comm -23`(원본 HEAD heading − slice+index heading) 빈 출력. 원본 §0~§14 number heading 48 + §13 prose subsection 2개 전부 index stub 또는 slice에 존재 | PASS |
| 2 | 본문 이동 | 9 slice가 각 §heading 본문 소유(grep `^##/^###` 매핑이 map W3 표와 일치) | PASS |
| 3 | 본문 라인 무결성 | `comm -23`(원본 비공백 본문 라인 − slice+index 라인) 빈 출력 = 원본 본문 100% 보존 | PASS |
| 4 | 요소 정합 | table 158=158, mermaid 4=4, `state.ts:` cite 93→94(+1=routing §4.3에 추가한 owner 안내 `state.ts:1761-1864`), Implementation-only 12=slice11+index1, `docs/decisions/` 26=slice23+index3 | PASS |
| 5 | 중복 0 | 섹션 고유 토큰(applyMigration1·Stale-path retry·parseLoopbackHttpEndpoint·frameMayContainBindingMethod·createBidirectionalPairRoutes·invokeParsedCommand) 각 slice 1곳. `AdapterInjectFailureReason`만 index 잔존 = §10.2 heading 텍스트(anchor 보존, 본문 중복 아님) | PASS |
| 6 | index 본문 누수 0 | index 내 table/mermaid/본문 cite 0(stub + §0 overview bullet + §14 authority bullet만) | PASS |
| 7 | owner body 외 무수정 | 이번 작업 수정범위 = `local-agent-runtime.md`(인덱스화) + 9 신규 slice. `src/`·`tests/`·`docs/decisions/`·`plans/` 0건(기존 M 파일은 W4/W5-spec 산출물) | PASS |

**경계 준수:** Cross-Owner Effects 미발생. `docs/decisions/*`가 `local-agent-runtime.md#<section>`을
가리키는 live inbound(map `:397-400`)는 root index가 §N anchor stub을 보존하므로 비파괴 —
repoint 불필요. decisions/spec/product가 새 slice를 **직접** 가리키게 하는 정리는 W6 범위
(split이 만든 핵심 inbound). spec split의 `plans/post-mvp.plan.md:101` §8 vs §4 flag와
동일하게 W5 범위 밖 owner 변경은 없음.

**다음 행동:** W6 — split된 slice 내부 cross-ref + split이 직접 만든 핵심 inbound
(decisions·spec·architecture·product → 새 slice) wikilink 정리. split 문서 1개 먼저 변환 →
@user 검토 게이트 → 패턴 승인 후 일괄. logs 전체·전역 `.md` sweep 제외.

## 2026-06-25 · 세션 종료 — W5 완료 정리 및 다음 세션 W6 handoff

다음 세션이 이 블록만 읽어도 W6를 재개할 수 있도록 정리한다(@user 요청). 결과·검증 상세는
직전 W5 closeout 블록이 owner이며 여기 복사하지 않는다.

**이번 세션 한 일(요약):**

- W5 잔여 = architecture body split 완료. `docs/architecture/local-agent-runtime.md`
  (1187줄) → root compatibility index(320줄) + 9 module slice(`local-runtime-*.md`).
  검증 ledger 7항목 PASS(anchor 보존·본문 라인 무결성·요소 정합·중복 0·index 누수 0·owner
  body 외 무수정). 이로써 W5 전체(spec 7 slice + architecture 9 slice + 두 index) 완료.
- 로그: W5 `[x]`, W6 `[>]` 전이. MEMORY.md 색인 포인터 W5→W6 최신화.

**다음 세션 재개점 = W6 wikilink 정리:**

- 대상 = W5가 만든 split 산출물. spec: `aiox-a2a.md`(index) + 7 slice. architecture:
  `local-agent-runtime.md`(index) + 9 slice. (W5에서 wikilink는 stub redirect만 깔았고,
  실질 관계 링크는 W6 소유.)
- 행동 2가지: ① 각 slice 내부 cross-ref + slice→코드/decision 링크 wikilink화.
  ② split이 직접 만든 핵심 inbound = decisions·spec·architecture·product 문서가 새 slice를
  **직접** 가리키도록 정리(현재는 원본 index의 `#<section>` anchor를 경유하는 stub redirect).
- **게이트(중요)**: split 문서 1개를 먼저 wikilink 변환 → @user에게 예시 제시·검토 →
  패턴 승인 후 나머지 일괄. @user 승인 전 일괄 변환 금지.
- 제외: `logs/` 과거 기록 전체, repo 전역 `.md` 기계 변환(필요 시 별도 후속 sweep).
- inbound 포함 이유 = decision↔contract↔코드가 한 노드에서 연결되는 게 @user가 Obsidian에서
  체감한 Atlas 가치의 핵심(빼면 Graph가 빈약). 근거는 W1 closeout 블록 W6 범위 항목이 owner.

**첫 샘플 slice 후보(제안 — @user 게이트에서 확정):** adapter/contract 계열 slice 1개.
@user 체감 가치(claude ingress가 cli·adapters·.mcp.json과 한눈에 연결)가 거기서 나오므로
`local-runtime-claude-adapter.md` 또는 routing slice가 inbound(decisions) 밀도가 높아 패턴
시연에 유리하다. 추측으로 박지 않고 다음 세션에서 @user와 확정한다.

**다음 행동:** W6 첫 샘플 slice 1개 wikilink 변환 → @user 검토 게이트. (plan stage 7·로그
모두 `[>]` 유지 — onramp는 이 로그 next pointer로 W6 재개.)

## 2026-06-25 · W6 첫 샘플(claude-adapter) 변환 + 게이트 통과 — 일괄은 다음 세션

**이번 세션 = W6 첫 샘플 변환 + @user/@codex 게이트.** 나머지 15 slice 일괄은 다음
세션(@user 결정). W6 `[>]` 유지. 결과 상세는 owner 문서(`local-runtime-claude-adapter.md`,
`docs/AGENTS.md`)가 소유하며 여기 복사하지 않는다.

**한 일·결정:**

- 첫 샘플 slice = `docs/architecture/local-runtime-claude-adapter.md`(@user 확정). wikilink
  변환 4종: ① decision 참조 3곳 → `[[slug]]`(Related decision/WHY/Rationale framing 유지)
  ② sibling slice cross-ref 2곳(`[[local-runtime-routing-and-delivery]]`·
  `[[local-runtime-codex-adapter]]`) ③ 코드 파일 6개 첫 언급 1회 `[[src/...]]` 노드화
  ④ inbound decision 2건 repoint(`claude-channel-plugin-default.md:55` §6.1–6.2 ·
  `claude-channel-trust-and-registration.md:34` §6.1–6.4 → `[[local-runtime-claude-adapter]]`).
  dead link 0.
- @codex 검토 → 패턴 승인. @claude 평가로 수용/이의 구분: evidence를 wikilink 노드 옆에서
  **full path**로 통일(수용, 샘플 3곳 반영). "evidence 전역 basename→full path 정규화"는
  W6 범위 밖(W5 원본 본문 보존과 충돌) → 전역 `.md` sweep과 함께 별도 후속으로 분리(이의).
- **패턴이 `docs/AGENTS.md` Code And Test Evidence 섹션에 규칙으로 명문화됨**(@user/@codex
  반영): 첫 의미 언급 1회만 wikilink, 이후 backtick `file:line`/path, full path 선호,
  Sources/provenance는 path 유지. 일괄은 이 owner 규칙을 따른다.

**부수 발견·수정(@user 검토 요청 처리):**

- **마크다운 깨짐 5곳 복원** — 편집 세션 중 linter가 multi-line inline code(백틱이 줄바꿈을
  포함)의 list continuation indent를 제거해 구조가 깨짐. inline code를 한 줄로 합쳐
  robust화(코드 내 줄바꿈은 렌더 시 공백 = 의미 동일). 검증: 백틱 홀수 라인 0.
- **§6.5 mermaid angle bracket 2곳 fix** — `<channel chat_id="M1"...>`·`<aiox-channel>` →
  `channel(chat_id=M1, origin=codex-1)`·`aiox-channel`. [추론] Obsidian mermaid가 unknown
  태그를 sanitize해 깨져 보인 것 — @user Obsidian 재확인으로 확정 예정. 검증: mermaid 내
  angle bracket 0.
- index `local-agent-runtime.md` §6 stub(5 heading 보존+redirect)·inbound 2건·sibling
  slice 2개 참조 정상 확인.

**다음 세션 재개점 = W6 나머지 15 slice 일괄:**

- 대상 = architecture slice 8(claude-adapter 제외) + spec slice 7 + 각 slice 직접 inbound.
- **선결 = multi-line inline code 깨짐 방지 방침**(미정). 같은 취약 패턴 분포(편집 시 linter가
  claude-adapter처럼 깨뜨릴 위험): `local-runtime-codex-adapter.md` 20줄, store 4, cli 4,
  errors 2, `aiox-message-lifecycle.md` 2 등. @claude 추천 = 각 파일 편집 후 백틱 홀수 검출해
  깨진 것만 한 줄 정상화(검증 ledger에 파일별 백틱홀수=0 기록). 대안 = wikilink만(사후 복구) /
  codex-adapter 단독 샘플 선행.
- inbound: 2 slice에 걸친 참조(예: `agent-level-mcp-process-scoping.md:25` §6–§7)는
  claude+codex 양 slice 변환 후 처리.
- 제외 유지: logs 전체·전역 `.md` sweep·evidence 전역 정규화(b).

**다음 행동:** 다음 세션에서 multi-line 방침 확정 후 일괄 적용 착수. plan stage 7·로그 `[>]` 유지.

## 2026-06-25 · obsidian-markdown·json-canvas skill 채택 — decision #4 부분 반전 + docs/AGENTS.md 위임 배선

**경위:** @user가 `kepano/obsidian-skills`(Obsidian 창업자 Steph Ango 공식 Agent Skills, MIT)
검토 요청 → @claude 평가 → obsidian-markdown·json-canvas 2종 채택. @user 결정으로 json-canvas는
**능력만 확보**(실제 `.canvas` 작성은 stage 7 Canvas 보류 유지, 필요 시 별도 결정).

**decision #4 부분 반전(narrative 정합):** W1 closeout 결정 #4("자동화·Obsidian skill·
code-review-graph 보류")의 "Obsidian skill" 부분을 **좁게** 반전한다.

- 반전 대상 = on-demand authoring/reference skill(편집 시 호출하는 문법 지침). auto-sync가
  아니라 사람이 부르는 레퍼런스라, 보류 근거였던 "자동화 유지 실패(@user 경험)·권위 오해"에
  직접 걸리지 않는다.
- 유지(반전 아님) = auto-sync hook/skill, `code-review-graph`는 그대로 보류.

**채택 형태 — skill + AGENTS 위임(흡수 아님, @user 안 채택):**

- @claude 초기 "docs/AGENTS.md에 내용 흡수" 제안 철회. @user의 "skill을 두고 AGENTS가 위임"
  채택 — 내용 복붙 없음(dedup 준수)·upstream 갱신 가능·기존 `log` skill 패턴과 동일.
- placement = @user의 "`docs/` 하위" 안에 @claude 이의(근거 확인 후): skill discovery 경로는
  `.claude/skills/`(+`.agents/skills/` 실체)이고, `docs/`는 Obsidian userIgnoreFilters에서
  미제외라 Graph에 노출된다. → `.agents/skills/{obsidian-markdown,json-canvas}/` 실체 +
  `.claude/skills/` symlink(`log`과 동일). dotfolder라 Obsidian Graph에서 자동 hidden,
  agent invoke는 정상. `docs/AGENTS.md`는 위임 포인터만 둔다.
- precedence = `docs/AGENTS.md` "Authoring Skills" 섹션에 명문화. generic skill과 충돌 시 본
  문서 우선(특히 Code And Test Evidence의 code/evidence=path 유지, block link 회피, 전역
  `.md` 기계 변환 금지).

**검증 Ledger (다른 agent가 이 로그만으로 pass/fail 판정 가능):**

| # | 검증 항목 | 방법 | 결과 |
| - | --------- | ---- | ---- |
| 1 | skill 2종 vendored | `.agents/skills/{obsidian-markdown,json-canvas}/SKILL.md` 존재 | PASS |
| 2 | discovery 동작 | 세션 Skill 목록에 `obsidian-markdown`·`json-canvas` 등장(`.claude/skills` symlink 경유) | PASS |
| 3 | scope 한정 | upstream 5종 중 2종만 vendor(`obsidian-cli`·`obsidian-bases`·`defuddle` 제외) | PASS |
| 4 | self-contained | 두 SKILL.md가 `obsidian-cli` 등 타 skill 의존 0 | PASS |
| 5 | provenance | repo 루트 `skills-lock.json`(source `kepano/obsidian-skills`·sourceType github·skillPath·computedHash) | PASS |
| 6 | Graph 미오염 | dotfolder(`.claude/`·`.agents/`)는 Obsidian 자동 hidden, `docs/` 밖 | PASS [Inference] — @user Obsidian 재확인 권장 |
| 7 | docs/AGENTS.md 위임+precedence | "Authoring Skills" 섹션 신설, 충돌 우선순위 명시 | PASS |

**W6 영향:** `obsidian-markdown`은 이제 W6 wikilink 일괄의 문법 레퍼런스가 된다. 단 W6 선결인
"multi-line inline code 깨짐(편집 시 linter가 indent 제거)"은 lint 문제라 이 skill로 해결되지
않는다 — 별도 검증 체크 방침은 그대로 미정.

**설치 방식 정정(2026-06-25, 같은 세션):** 최초 수동 `cp` vendoring + 손수 작성한
`obsidian-skills.NOTICE.md`를 @user가 "거슬린다"고 하여 폐기. 공식 installer
`npx skills add kepano/obsidian-skills -s <skill> -a claude-code -y`(vercel-labs `skills`
CLI)로 재설치했다. 도구는 `.claude/skills/`로 직접 copy + repo 루트 `skills-lock.json`
(source·hash provenance)을 생성한다. @user 요청 레이아웃(= `log` 패턴, `.agents/skills/`
canonical + `.claude/skills/` symlink)에 맞추려 설치본을 `.agents/skills/`로 이동 후
`.claude/skills/`에 symlink 재생성했다. provenance는 이제 `skills-lock.json`이 소유(NOTICE.md
삭제). `-s`는 단일 이름만 받아(콤마·공백 구분 미지원) skill당 1회씩 호출, agent 이름은
`claude`가 아니라 `claude-code`.

**다음 행동:** W6 재개(나머지 15 slice 일괄)는 변동 없음. multi-line 방침 확정 선결 유지.
이번 채택은 별도 Work Item 신설 없이 완료(tooling 도입). plan stage 7·로그 `[>]` 유지.

## 2026-06-25 · W6 선결 — multi-line inline code 방침 확정 + fence-aware 체크 영속화

@user(+@codex 의견) 수렴으로 W6 일괄의 선결("multi-line inline code 깨짐 방지 방침")을
확정한다. **W6 일괄 자체는 다음 세션**(@user 결정). 결과 owner는 `docs/AGENTS.md`와
`scripts/check-markdown-inline-code`이며 여기 복사하지 않는다.

**확정 방침(`docs/AGENTS.md` Code And Test Evidence > Inline Code Stability가 owner):**

- inline code는 한 줄만. 줄바꿈이 필요한 코드·명령·여러 경로는 fenced code block으로 승격.
- 리스트의 여러 evidence는 한 inline code에 몰지 않고 inline code 여러 개로 분할.
- 편집 후 `scripts/check-markdown-inline-code <file>`로 해당 파일의 의심 라인 = 0 확인.

**@codex 제안 대비 @claude 보강 2건(수용/이의 구분):**

- 보강1(검출기 fence-aware): @codex "단순 per-line 백틱 홀짝"은 코드펜스 구분선(백틱 3개=홀수)을
  오탐한다. 이미 정상화된 `claude-adapter`에서 naive=2건(둘 다 코드펜스 구분선) vs
  fence-aware=0으로 실증 → 코드펜스 블록을 토글로 건너뛰는 버전 채택.
- 보강2(scope=repair-when-touched): baseline 38줄은 W5가 보존한 원본 본문에서 내려온 것이라
  전역 sweep(W6 "evidence 전역 정규화 제외"와 충돌)로 일괄 수정하지 않는다. 각 slice를 W6
  편집할 때 그 파일만 0으로 만들고 넘어간다(`claude-adapter` 처리 방식 동일). 의미보존:
  단일 토큰이 줄바꿈된 것은 한 줄 collapse, 진짜 여러 줄은 fenced/분할.

**fence-aware baseline (`scripts/check-markdown-inline-code`, 편집 전 현재값):**

| 파일 | 의심 라인 |
| --- | --- |
| local-runtime-codex-adapter.md | 20 |
| local-runtime-cli-and-operator-surfaces.md | 4 |
| local-runtime-store-and-repositories.md | 4 |
| local-runtime-errors-events-smoke.md | 2 |
| local-runtime-process-topology.md | 2 |
| aiox-capability-policy.md | 2 |
| aiox-compose-contract.md | 2 |
| aiox-message-lifecycle.md | 2 |
| 합계 | 38 |

`claude-adapter`=0(정상화 완료, 방침과 정합 → rework 불필요). 로그 취약 추정(codex 20·store
4·cli 4·errors 2·lifecycle 2)을 재현 + process-topology·capability-policy·compose-contract
신규 surfacing.

**검증 Ledger (다른 agent가 이 로그만으로 pass/fail 판정 가능):**

| # | 검증 항목 | 방법 | 결과 |
| - | --------- | ---- | ---- |
| 1 | 방침 명문화 | `docs/AGENTS.md` "Inline Code Stability" 섹션 신설 | PASS |
| 2 | 체크 영속화 | `scripts/check-markdown-inline-code`(+x), fence-aware awk | PASS |
| 3 | baseline 재현 | codex-adapter=20, W6 대상 전체=38, exit=1 | PASS |
| 4 | clean 파일 통과 | claude-adapter=0, exit=0 | PASS |
| 5 | dogfood | `docs/AGENTS.md` 자체 = 0(규칙 문서가 규칙 준수) | PASS |

**다음 세션 W6 일괄 절차(파일 단위 게이트):** 각 slice = wikilink 변환 →
`scripts/check-markdown-inline-code <file>` = 0 확인 → 다음 파일. 깨짐은 위 의미보존 규칙으로
정상화. 대상 = architecture 8(claude-adapter 제외) + spec 7 + 각 slice 직접 inbound.
`obsidian-markdown` skill을 문법 레퍼런스로 사용. 제외 유지: logs 전체·전역 `.md`
sweep·evidence 전역 정규화.

**방침 문구 머지(@codex 검토 반영):** `docs/AGENTS.md` "Inline Code Stability"를 @codex
영어 초안과 머지해 교체했다. 핵심 추가 = repair-when-touched/전역 sweep 금지 bullet을
로그(위 보강2)에서 **docs durable 규칙으로 승격**(@codex 지적: scope 가드는 owner 문서에
있어야 함). WHY·스크립트명·split-inline 예시는 유지. dogfood 재검증 = 0.

**스크립트 이름·책임 좁힘(@codex 검토 반영):** `scripts/check-markdown-inline-code`로
rename(옛 이름 `…-md-inline-code`). 헤더를 "Markdown 전체 정합성 검사가 아니라 코드펜스
바깥 줄 단위 백틱 균형 의심 라인만 찾는 보조 도구(권위 문서 아님)"로 책임 한정(@codex:
스크립트가 과한 권위를 갖지 않게). `docs/AGENTS.md`·이 로그 참조 일괄 갱신, baseline
재현(codex 20·claude 0)·dogfood=0 재검증. @codex 나머지 2점(1~3 선행·baseline=repair-when-touched)은
기존 작업과 이미 일치.

**다음 행동:** W6 일괄(다음 세션). 선결 해소됨. plan stage 7·로그 `[>]` 유지.

## 2026-06-25 · W6 보강 — codex W5-split 리뷰 검증·반영: line-level inbound evidence repoint를 최우선 blocker로 승격

@codex가 W5 split(spec `aiox-a2a.md` + architecture `local-agent-runtime.md`)을 리뷰했다.
`AGENTS.md` Evidence 규칙에 따라 @codex 분석을 무조건 수용하지 않고 owner 파일로 직접
대조 검증한 뒤 타당한 항목만 반영한다. **W6 일괄 자체는 여전히 다음 세션(@user 게이트).**
이 블록은 로그 기록만이며 owner 문서(`docs/`)는 변경하지 않았다.

**검증 결과 (Confirmed / Inference 구분):**

- **[Confirmed · High blocker 타당] line-level inbound evidence 깨짐.** 현재 index
  `local-agent-runtime.md` = 320줄. 두 durable decision 문서가 *line-level*로 옛 monolith
  줄을 가리키는데 split로 깨졌다.
  - `docs/decisions/codex-per-agent-app-server.md` — `:510-513`·`:511-514`·`:628-633`·
    `:826`·`:723`·`:546-547`와 요약 `:42`. 510·511·513·514·546·547·628·633·723·826은 모두
    320 초과 = **out-of-range**(`:109`만 범위 내).
  - `docs/decisions/uds-transport-and-framing-contract.md` — `:234`·`:237`·`:238`·`:239`·
    `:820-833`. 820-833은 out-of-range. `:234`는 범위 내이나 현재 index의
    `### 9.1 Command Table` stub을 가리킴 → 원래 framing 계약 본문(NDJSON/multiplex/timeout/
    stale-socket)이 아니라 **엉뚱한 내용**. section anchor는 보존됐지만 line 근거는 깨졌다.
- **[Confirmed · W5 closeout 주장 정정 필요] "비파괴/repoint 불필요"는 #section inbound만
  다뤘다.** 직전 W5 architecture closeout 블록의 `경계 준수`는 "`docs/decisions/*`가
  `local-agent-runtime.md#<section>`을 가리키는 live inbound는 anchor stub 보존으로 비파괴 →
  repoint 불필요"라고 했다. 이는 `#section` 형식 inbound에 한해 참이고, 위 두 문서의
  `:line` 형식 inbound는 누락했다. 따라서 그 closeout의 "Cross-Owner Effects 미발생" 결론은
  **section inbound에 한정해서만 유효**하며, line-level inbound는 깨진 Cross-Owner Effect로
  W6에서 repair해야 한다. (W5 split 구조 자체 — anchor 보존·본문 무결성 — 는 여전히 pass.)
- **[Confirmed · Medium = W6 정상 범위, blocker 아님] section-level inbound는 resolve됨.**
  `agent-level-mcp-process-scoping.md:25`(§6-§7)·`pair-slot-generalization.md:96`(§0/§2/§3/§8)·
  `daemon-autostart-and-channel-identity.md:14,28`(§4.1,§9.1)·`codex-app-server-mcp-injection-and-isolation.md:83`(§7.2,§7.8)·
  `pair-attach-atomicity-and-sentinel.md:25`(§3,§8.6)·`codex-d7-authoritative-binding-scope.md:80`(§7.4-§7.7)는
  index가 §N anchor stub을 보존하므로 dead 아님. W6에서 새 slice로 직접 repoint하는 정상 대상.
- **[Confirmed · spec inbound도 동일 성격] `a2a-message-lifecycle-envelope-and-correlation.md:19,109`**
  → `docs/specs/aiox-a2a.md §4`(section, not line). spec index가 §4 stub 보존 → resolve됨.
  W6에서 `aiox-message-lifecycle` slice로 repoint(정상 범위, blocker 아님).
- **[Confirmed · 신규 없음] inline-code 38줄 재현.** `scripts/check-markdown-inline-code`
  실행 = codex-adapter 20·cli 4·store 4·errors 2·process-topology 2·capability-policy 2·
  compose-contract 2·message-lifecycle 2 = **38**, 직전 블록 baseline과 정확히 일치. split
  실패 아님, W6 repair-when-touched 대상 그대로. 추가 조치 없음.
- **[Confirmed · Low] §13 prose subheading 2개 index 미보존.** index §13 = `## 13. Known
  Gaps / Post-MVP`만. slice `local-runtime-gaps-and-targets.md`에는 `### Current Gaps
  (As-built limitations)`·`### Target / Proposed / Deferred (Post-MVP Checklist)` 2개가 더
  있는데 index에 없다. W5 ledger 항목1("§13 prose subsection 2개 전부 index stub *또는*
  slice에 존재")은 "또는"이라 기술적으로 PASS였으나, stub-holder 규칙의 anchor 완전 보존
  관점에선 부분 누락. **live inbound 0건이라 blocker 아님**(@codex·@claude 일치).

**반영 결정:**

1. **W6 실행 순서 확정(@codex 제안 수용, @claude 검증).** ① line-level evidence repoint(최우선
   blocker) → ② section inbound wikilink repoint → ③ touched-file inline-code = 0. W6 Work
   Item에 선결 blocker로 표기함.
2. **line-evidence repoint target-slice 사전 매핑([Inference], 다음 세션 효율화 — 실제
   per-line/slice는 W6 실행 때 각 slice 본문 확인으로 확정).**
   - `codex-per-agent-app-server.md`의 endpoint/readyz/ack/종료/attach 계약(`:510-514`·
     `:628-633`·`:826`·`:723`·`:546-547`) = codex app-server lifecycle = §7 →
     `local-runtime-codex-adapter.md`. (`:109`은 §1 process-topology 가능성, 실행 때 확인.)
   - `uds-transport-and-framing-contract.md`의 framing/multiplex/timeout/stale-socket
     (`:234`·`:237`·`:238`·`:239`) = §4 → `local-runtime-daemon-transport-api.md`; fan-out
     (`:820-833`) = §8 → `local-runtime-routing-and-delivery.md`. 즉 이 한 decision은 **두
     slice로 분기**.
3. **repoint 형식([Opinion], W6 게이트 확정 대상).** `docs/AGENTS.md` Code And Test
   Evidence는 Sources/provenance를 path로 유지하라고 규정. 이 두 문서의 참조는 "architecture가
   소유한다 — `…:NN`" provenance 성격이므로 wikilink가 아니라 backtick `<slice>.md:<새 line>`로
   repoint 권장(line-level 근거 의도 보존). line 정밀도가 불필요한 곳은 `[[slice#section]]`도
   허용. 최종 형식은 W6 샘플 게이트에서 @user/@codex 확정.
4. **§13 Low.** index에 두 prose subheading anchor를 stub으로 채워 W5 stub-holder 완전성을
   마무리 권고(slice 본문 무변경, bulk·게이트 무관한 index anchor 보강). live inbound 0이라
   비차단 — @user 판단(지금 보강 / W6 같이 / 보류) 대기.

**경계·게이트 준수:** owner 문서(`docs/`) 0건 변경(이 블록 = 로그 기록). W6 wikilink 일괄·
inbound repoint·§13 보강은 모두 @user 게이트 하 다음 세션. logs 전체·전역 `.md` sweep·
evidence 전역 정규화 제외 유지.

**검증 Ledger (다른 agent가 이 로그만으로 pass/fail 판정 가능):**

| # | 검증 항목 | 방법 | 결과 |
| - | --------- | ---- | ---- |
| 1 | index 줄수 | `wc -l local-agent-runtime.md` = 320 | PASS |
| 2 | codex-per-agent line out-of-range | `:510-514`·`:546-547`·`:628-633`·`:723`·`:826` > 320 | PASS (broken 확인) |
| 3 | uds-framing `:234` 오지칭 | index `:234` = `### 9.1 Command Table` stub(framing 본문 아님) | PASS (broken 확인) |
| 4 | section inbound resolve | §6-§7·§4.1·§7.2 등 index anchor stub 보존 = dead 아님 | PASS |
| 5 | inline-code baseline | `check-markdown-inline-code` 8파일 합 = 38 = 직전 baseline | PASS |
| 6 | §13 anchor 부분누락 | index = `## 13`만, slice = +2 prose subheading | PASS (Low 확인) |
| 7 | owner 문서 무변경 | 이 작업 = 로그 1블록 append + W6 item 1줄. `docs/`·`src/` 0건 | PASS |

**다음 행동:** 다음 세션 W6 = ① line-evidence repoint(codex-per-agent → codex-adapter,
uds-framing → daemon-transport-api + routing) → ② section inbound wikilink repoint → ③
touched-file inline=0, 첫 샘플 @user 게이트 후 일괄. plan stage 7·로그 `[>]` 유지.

## 2026-06-25 · §13 Low 적용 — index anchor 2개 보강(@user 승인)

직전 블록의 §13 Low(index가 prose subheading 2개 미보존)를 @user 승인("반영해")으로 적용했다.
나머지 W6 owner repoint·wikilink 일괄은 여전히 다음 세션 게이트 대상(이 적용은 그와 무관한
stub-holder anchor 완전성 마무리).

**변경:** `docs/architecture/local-agent-runtime.md` §13에 anchor stub 2개 추가 —
`### Current Gaps (As-built limitations)`·`### Target / Proposed / Deferred (Post-MVP
Checklist)`, 각 `[[local-runtime-gaps-and-targets]] 참조.`(§9.x 서브섹션 stub 형식과 동일).

**검증:** index subheading 텍스트 = slice(`local-runtime-gaps-and-targets.md:12,:22`)와
완전 일치(anchor resolve 가능). `scripts/check-markdown-inline-code` = 0(회귀 없음). slice
본문·다른 섹션 무변경. 이로써 W5 architecture stub-holder의 anchor 보존이 §13까지 완전.

**다음 행동:** 변동 없음 — 다음 세션 W6 = line-evidence repoint(최우선) → section inbound
wikilink repoint → touched-file inline=0, 첫 샘플 @user 게이트. plan stage 7·로그 `[>]` 유지.

## 2026-06-25 · W6 선결 blocker 해소 — inbound repoint 형식 @user 확정 + Phase 1·2 완료

next pointer의 선결 blocker(line-level inbound evidence repoint)를 해소했다. 첫 샘플
변환 → @user 형식 게이트 통과 → 확정 형식으로 line-level(Phase 1) + section-level(Phase 2)
inbound을 일괄 repoint했다. **잔여 = Phase 3(slice 내부 wikilink) 다음 세션.** W6 `[>]` 유지.
owner 문서가 결과를 소유하며 본문은 여기 복사하지 않는다.

**repoint 형식 — @user 게이트 확정(option §section anchor):**

- anchor = `§section`(line number 재구성 안 함). 첫 의미 언급 1회 → `[[wikilink]] §N`,
  같은 파일 내 이후 같은 slice → backtick `slice.md §N`. `Sources`/provenance는 path 유지
  (`docs/AGENTS.md` Code And Test Evidence + 이미 승인된 claude-adapter inbound 패턴과 정합).
- **@codex [Opinion] 일부 반려(근거 기반 이의):** codex는 "backtick `slice.md:<새 line>`(line
  정밀도 보존)"을 권장했으나, line number 재구성은 **지금 깨진 원인(slice 재편집 시 line
  shift)을 재생산**한다. W5가 모든 `§section` anchor를 보존했으므로 section anchor가 편집
  안정적이다 → @user가 §section 형식 확정. (codex의 ①1~3 선행 순서·②blocker 우선순위는 수용.)

**Phase 1 — line-level evidence repoint(blocker, 옛 monolith out-of-range `:line`):**

- `codex-per-agent-app-server.md`(첫 샘플): §2 endpoint 수집·§3 readyz poll → codex-adapter
  §7.2 / §4 ack → §7.6 / §5 정상종료 → process-topology §1·codex-adapter §7.9 / attach 실패
  → §7.2. Sources 갱신. 부수교정: 옛 `:826`은 "CLI send deferral"을 가리키던 stale 참조였어
  §7.6(실제 ack 계약 owner) repoint가 break 수정 + 부정확성 교정을 겸함.
- `uds-transport-and-framing-contract.md`: framing/multiplex/timeout/stale-socket
  (`:234·237·238·239`) → daemon-transport-api §4.2 / fan-out (`:820-833`) →
  routing-and-delivery §8.3. Sources 갱신.

**Phase 2 — section-level inbound repoint(index anchor stub 경유 → 새 slice 직접 지칭):**

- `agent-level-mcp-process-scoping.md` §6-§7 → claude-adapter §6 + codex-adapter §7
- `pair-slot-generalization.md` §0/§2/§3/§8 → index §0(overview)·store §2–§3·routing §8
- `daemon-autostart-and-channel-identity.md` §4.1/§9.1 → daemon-transport-api §4.1 +
  cli-and-operator-surfaces §9.1 (본문 첫언급=wikilink, Sources 재언급=path)
- `codex-app-server-mcp-injection-and-isolation.md` §7.2/§7.8 → codex-adapter
- `pair-attach-atomicity-and-sentinel.md` §3/§8.6 → store §3 + routing §8.6
- `codex-d7-authoritative-binding-scope.md` §7.4–§7.7 → codex-adapter
- (spec inbound) `a2a-message-lifecycle-envelope-and-correlation.md` `aiox-a2a.md §4` →
  aiox-message-lifecycle slice (본문 첫언급=wikilink, Sources=path)

**Scope 밖(의도)**: whole-doc 참조 2건(`client-orchestrator-runtime-pivot.md:31`·
`aiox-a2a.md:18`)은 split이 타겟을 바꾸지 않고 index 허브(`local-agent-runtime.md`)를
정상 지칭 → 미변경. logs 전체·전역 `.md` sweep·evidence 전역 정규화 제외 유지.

**검증 Ledger (다른 agent가 이 로그만으로 pass/fail 판정 가능):**

| # | 검증 항목 | 방법 | 결과 |
| - | --------- | ---- | ---- |
| 1 | broken `:line` 0 | `grep local-agent-runtime.md:[0-9]` (decisions·specs) = 0 | PASS |
| 2 | broken §N 0 | decisions·specs에서 `local-agent-runtime.md §N` 형식 grep = 0 | PASS |
| 3 | wikilink 타겟 실재 | 신규 wikilink 8 타겟 전부 파일 존재(arch 7 slice/index + spec 1) | PASS |
| 4 | inline-code 0 | touched 9 파일 `scripts/check-markdown-inline-code` = 0 (회귀 없음) | PASS |
| 5 | 형식 정합 | 첫언급 wikilink·재언급 path·Sources path — claude-adapter/`docs/AGENTS.md`와 일치 | PASS |
| 6 | content 비파괴 | repoint는 참조 표기만 변경, decision 본문 rationale 무변경 | PASS |

**Cross-Owner Effects:** 이번 변경 = `docs/decisions/`(8) + `docs/specs/`(1, 인용 repoint).
모두 W5/W6 `Allowed cross-owner updates`(decisions·spec) 안. architecture slice 본문·`src/`·
`plans/`·product 0건 변경. 직전 codex-review 블록이 "깨진 Cross-Owner Effect"로 분류한
line-level inbound이 이 단계에서 repair됨(그 블록의 W5 closeout 정정이 여기서 종결).

**다음 행동:** Phase 3 = split slice 15개 내부 wikilink(decision 첫언급 `[[slug]]` · sibling
slice `[[local-runtime-*]]`/`[[aiox-*]]` · 주요 코드파일 첫언급 `[[src/...]]`+backtick
evidence), 각 파일 `check-markdown-inline-code` = 0(repair-when-touched, baseline 38줄 소화).
claude-adapter 제외. logs 전체·전역 sweep·evidence 전역 정규화 제외 유지. plan stage 7·로그 `[>]` 유지.

## 2026-06-25 · W6 Phase 3 완료 — Claude 세션 끊김 takeover + slice 내부 wikilink 정리

@user가 Claude 세션이 끊겨 W6 잔여 Phase 3를 Codex가 이어받아야 한다고 알렸다. 기존 로그 최신 기록과 Work Items를 확인한 뒤, 이미 완료된 Phase 1·2(inbound repoint)는 건드리지 않고 **Phase 3(slice 내부 wikilink + touched-file inline-code=0)**만 수행했다.

**수행 범위:**

- 대상 = W6 잔여 15 slice: architecture 8(`local-runtime-claude-adapter.md` 제외) + specs 7.
- 변경 성격 = owner 의미/계약 변경 없음. 기존 path·decision·sibling 관계 중 첫 의미 언급 1회만 wikilink화하고, `file:line` 근거는 backtick path로 유지.
- repair-when-touched = checker가 잡은 multi-line inline code만 해당 파일에서 수리.
- 제외 유지 = `logs/` 전체 sweep, repo 전역 `.md` sweep, evidence 전역 정규화.

**주요 적용:**

- architecture slice: process topology, CLI/operator, store/repositories, codex adapter, routing/delivery, errors/events/smoke, gaps/targets에서 decision·sibling·주요 code/test 첫언급 wikilink를 보강했다.
- spec slice: adapter model, runtime profile namespace, message lifecycle, compose, capability policy, federation/remote, open/deferred에서 주요 code/test 첫언급 wikilink를 보강했다.
- `[[src/]]` 같은 디렉터리 wikilink는 codefile 첫언급 범위를 벗어나고 Obsidian 빈 노드 위험이 있어 즉시 path 표기로 되돌렸다.

**검증 Ledger:**

| # | 검증 항목 | 방법 | 결과 |
| - | --------- | ---- | ---- |
| 1 | inline-code 안정성 | `scripts/check-markdown-inline-code` 대상 15 slice 전체 | PASS (출력 없음, exit 0) |
| 2 | wikilink target 존재 | 대상 15 slice의 `[[...]]`를 추출해 path target 또는 docs basename 실재 확인(Node read-only 검사) | PASS (`wikilink targets ok`) |
| 3 | 범위 준수 | 변경은 Phase 3 slice 내부의 link/inline-code 표기만; logs 전체·전역 `.md` sweep 안 함 | PASS |
| 4 | owner 의미 비변경 | 새 계약/새 사실 추가 없이 기존 path·decision·sibling 관계 표기만 보강 | PASS |

**다음 행동:** W6는 완료. 다음 재개 지점은 W3 Obsidian Graph/Backlink 검증이다. W3에서는 실제 Obsidian Graph/Backlink가 docs-as-Atlas navigation layer로 유효한지 확인하고, 권위 문서를 대체하지 않는 discovery 가치만 판단한다.

## 2026-06-25 · W6 Phase 3 takeover — Claude review 요청

@user 요청에 따라, Codex가 Claude 세션 끊김 이후 이어서 수행한 W6 Phase 3 작업은 **Claude review 필요**로 명시한다. 이 블록은 Work Item 완료 전이가 아니라 review handoff다.

**Codex가 실제 수행한 범위(confirmed):**

- W6 잔여 Phase 3 대상으로 기록된 15 slice(architecture 8 + specs 7)를 대상으로 내부 wikilink 보강을 수행했다. `local-runtime-claude-adapter.md`는 기존 샘플 완료분이라 제외했다.
- 기존 의미/계약을 새로 작성하지 않고, 기존 path·decision·sibling·code/test 관계 중 일부 첫 의미 언급을 `[[wikilink]]`로 바꿨다.
- multi-line inline-code 의심 라인은 repair-when-touched 원칙으로 고쳤다.
- 검증은 두 가지를 수행했다:
  - `scripts/check-markdown-inline-code <15 slice>` = exit 0
  - 대상 slice의 `[[...]]` target 존재 read-only 검사 = `wikilink targets ok`

**Codex가 자신 있게 단정하지 않는 부분:**

- 작업 시작 시 worktree가 이미 dirty 상태였고 W4/W5/W6 Phase 1·2 산출물이 unstaged/untracked로 섞여 있었다. 따라서 Phase 3 성격의 일부 변경은 Codex 작업 전 이미 존재했다.
- 예: `docs/architecture/local-runtime-routing-and-delivery.md`의 `[[src/adapters/codex/mcp-server.ts]] — src/adapters/codex/mcp-server.ts:223 and L243` 형태는 Codex가 편집하기 전 이미 존재했다. 성격상 Phase 3(code file 첫언급 wikilink)이지만, Codex 작업분은 아니다. Claude가 끊기기 전 적용했는지, W5 split 산출물에 이미 포함됐는지는 현재 근거만으로 단정하지 않는다.
- Codex 검증은 문법/target 존재 중심이다. “의미 있는 첫언급이 빠짐없이 모두 wikilink화됐는가”는 별도 semantic review가 필요하다.

**Claude review 요청:**

- Codex가 Phase 3로 추가/수정한 wikilink가 `docs/AGENTS.md`의 규칙(첫 의미 언급 1회, `Sources`/provenance path 유지, 전역 sweep 금지)에 맞는지 확인한다.
- Phase 3 대상 15 slice에서 누락된 decision/sibling/code 첫언급이 있는지 semantic scan한다.
- Codex가 만든 변경과 기존 dirty worktree 변경이 섞인 지점에서, provenance가 불명확한 변경은 “기존 변경”으로 분리해 판단한다.
- inline-code checker와 wikilink target 검증은 Codex가 통과시켰지만, Claude가 review 후 필요하면 재실행한다.

**현재 next:** W6 완료 전이 또는 W3 전이는 아직 하지 않는다. Claude review 후 @user 판단에 따라 W6 완료 처리 여부를 결정한다.

## 2026-06-25 · W6 Phase 3 takeover — Codex 변경 파일별 상세

@user 지적: 직전 review 요청 블록은 Codex가 **어떤 파일의 어느 부분을 건드렸는지**가 부족했다. 아래는 Codex가 실제 편집한 위치와 성격이다. 줄 번호는 이 블록 작성 시점의 현재 파일 기준이다. 대부분 slice 파일이 untracked라 `git diff`로 provenance를 깔끔히 분리할 수 없어서, Codex가 적용한 patch 내용과 현재 `rg -n` 확인을 기준으로 적는다.

**Architecture slice — Codex 편집 위치:**

- `docs/architecture/local-runtime-process-topology.md:71`
  - `docs/decisions/codex-per-agent-app-server.md` path 권위 참조를 `[[codex-per-agent-app-server]]` wikilink로 변경.
  - 성격: decision 첫 의미 언급 wikilink.
- `docs/architecture/local-runtime-cli-and-operator-surfaces.md:11`
  - command table의 `aiox daemon start` cite에서 `src/cli/parse.ts`, `src/cli/invocation.ts`, `src/bin/aiox.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: 주요 code file 첫 의미 언급 wikilink.
- `docs/architecture/local-runtime-cli-and-operator-surfaces.md:37-39`
  - multi-line inline-code span이 깨지던 `ensureOk(response)` 설명을 한 줄짜리 inline code 여러 개로 분할.
  - 성격: repair-when-touched inline-code 안정화.
- `docs/architecture/local-runtime-cli-and-operator-surfaces.md:58-60`
  - `src/cli/format.ts` 첫 의미 언급을 wikilink로 변경하고, DELIVERIES 출력 예시의 multi-line inline-code를 두 inline code로 분할.
  - 성격: code file wikilink + inline-code 안정화.
- `docs/architecture/local-runtime-codex-adapter.md:64`
  - Codex TUI ownership decision 참조를 `[[codex-per-agent-app-server]] §5`로 변경.
  - 성격: decision 첫 의미 언급 wikilink.
- `docs/architecture/local-runtime-codex-adapter.md:95`
  - `src/adapters/codex/proxy.ts` 파일 언급을 `[[src/adapters/codex/proxy.ts]]`로 변경.
  - 성격: 주요 code file 첫 의미 언급 wikilink.
- `docs/architecture/local-runtime-codex-adapter.md:124`
  - `docs/decisions/proxy-lazy-observation-cost-model.md` path 참조를 `[[proxy-lazy-observation-cost-model]]`로 변경.
  - 성격: decision 첫 의미 언급 wikilink.
- `docs/architecture/local-runtime-codex-adapter.md:159-160`
  - Codex injector 파일과 ack semantic decision 참조를 각각 `[[src/adapters/codex/injector.ts]]`, `[[codex-per-agent-app-server]] §4`로 변경.
  - 성격: code file + decision 첫 의미 언급 wikilink.
- `docs/architecture/local-runtime-routing-and-delivery.md:69`
  - adapter integration test 반복 언급을 `[[tests/unit/adapters/fake-integration.test.ts]]`로 변경.
  - 성격: test file wikilink. 주의: 같은 파일 `:105`의 `[[src/adapters/codex/mcp-server.ts]]`는 Codex 편집 전 이미 존재했으므로 Codex 작업분으로 주장하지 않는다.
- `docs/architecture/local-runtime-errors-events-smoke.md:34-36`
  - `src/adapters/contract.ts` 첫 의미 언급을 wikilink로 변경하고, adapter failure result inline-code를 한 줄로 정리.
  - 성격: code file wikilink + inline-code 안정화.
- `docs/architecture/local-runtime-errors-events-smoke.md:101`
  - `src/core/events.ts` event declaration 참조를 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/architecture/local-runtime-errors-events-smoke.md:150`
  - smoke matrix automated test 파일 2개를 `[[tests/unit/adapters/fake-integration.test.ts]]`, `[[tests/unit/daemon/codex-ingress.test.ts]]`로 변경.
  - 성격: test file wikilink.
- `docs/architecture/local-runtime-gaps-and-targets.md:13`
  - in-memory daemon DB gap의 `src/daemon/run.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/architecture/local-runtime-store-and-repositories.md`
  - Codex가 한때 `src/` 디렉터리를 `[[src/]]`로 바꿨으나, 디렉터리 wikilink는 Phase 3 codefile 첫언급 범위를 벗어나고 빈 노드 위험이 있어 즉시 `src/` path 표기로 되돌렸다.
  - 최종적으로 이 파일에는 Codex의 의도된 net semantic 변경을 주장하지 않는다.

**Spec slice — Codex 편집 위치:**

- `docs/specs/aiox-adapter-model.md:58`
  - `src/adapters/contract.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/specs/aiox-adapter-model.md:65`
  - `src/daemon/state.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/specs/aiox-adapter-model.md:69`
  - `src/core/pairs.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/specs/aiox-adapter-model.md:88`
  - `src/adapters/codex/launcher.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/specs/aiox-adapter-model.md:94`
  - `src/adapters/claude/launcher.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/specs/aiox-runtime-profile-namespace.md:12-13`
  - `src/config/paths.ts`와 `tests/unit/config/paths.test.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code/test file 첫 의미 언급 wikilink.
- `docs/specs/aiox-runtime-profile-namespace.md:28`
  - production gap evidence의 `src/daemon/run.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/specs/aiox-runtime-profile-namespace.md:34`
  - CLI evidence의 `src/bin/aiox.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/specs/aiox-message-lifecycle.md:100`
  - current caveat evidence의 `src/daemon/state.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/specs/aiox-message-lifecycle.md:107`
  - `src/store/schema.ts`와 `tests/unit/store/schema.test.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code/test file 첫 의미 언급 wikilink.
- `docs/specs/aiox-message-lifecycle.md:210-212`
  - `state(awaiting_reply | fulfilled | cancelled | expired)` multi-line inline-code를 줄 단위 안정 형태로 분할.
  - 성격: repair-when-touched inline-code 안정화.
- `docs/specs/aiox-message-lifecycle.md:226`
  - `src/core/messages.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/specs/aiox-compose-contract.md:34-36`
  - instruction precedence multi-line inline-code를 한 줄짜리 inline-code로 정리.
  - 성격: repair-when-touched inline-code 안정화.
- `docs/specs/aiox-capability-policy.md:57-58`
  - `registry -> resolve -> projection -> adapter compile` multi-line inline-code를 한 줄짜리 inline-code로 정리.
  - 성격: repair-when-touched inline-code 안정화.
- `docs/specs/aiox-capability-policy.md:64-65`
  - capability projection 표에서 Codex/Claude launcher 파일 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/specs/aiox-capability-policy.md:93`
  - registration/ingress auth evidence의 `src/daemon/state.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/specs/aiox-capability-policy.md:137`
  - durable-store gap evidence의 `src/daemon/run.ts`, `src/bin/aiox.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/specs/aiox-federation-remote.md:39`
  - transport 전환 지점의 `src/daemon/socket-transport.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.
- `docs/specs/aiox-federation-remote.md:11`
  - Codex가 한때 `src/` 디렉터리를 `[[src/]]`로 바꿨으나, 디렉터리 wikilink는 범위 밖이라 `src/` path 표기로 되돌렸다.
  - 최종적으로 이 줄은 Codex의 의도된 net 변경으로 주장하지 않는다.
- `docs/specs/aiox-open-deferred.md:18`
  - Codex runtime failure evidence의 `src/adapters/codex/injector.ts` 첫 의미 언급을 wikilink로 변경.
  - 성격: code file 첫 의미 언급 wikilink.

**검증 재기록:**

- `scripts/check-markdown-inline-code` 대상 15 slice 전체 = PASS(exit 0).
- 대상 15 slice의 `[[...]]` target 존재 검사 = PASS(`wikilink targets ok`).
- 위 파일별 목록은 Claude review용 provenance이다. 특히 `local-runtime-routing-and-delivery.md:105`처럼 Codex 작업 전 이미 있던 Phase 3 성격 변경은 Codex 작업분으로 분류하지 않는다.

## 2026-06-25 · W6 Phase 3 Claude review 완료 + W6 closeout

Claude 세션이 재개되어 Codex takeover분(Phase 3)을 review했다. `AGENTS.md` Evidence
규칙대로 Codex의 PASS 주장을 그대로 수용하지 않고 owner 파일로 직접 대조했다. 또한 Claude가
세션 끊김 전 직접 한 5개 slice(process-topology·store·daemon-transport-api·codex-adapter·
routing)도 함께 최종 점검했다. 결과·수정은 owner 문서가 소유하며 본문은 여기 복사하지 않는다.

**검증 결과 (Confirmed):**

- Codex의 문법 PASS 주장은 사실. 전체 arch+spec slice `scripts/check-markdown-inline-code`
  = exit 0, dead link 0, `[[src/]]` 디렉터리 artifact 0(Codex 되돌리기 확인).
- Codex가 완료가 아닌 **review handoff**로 남기고 dirty worktree로 섞인 provenance를 정직히
  분리한 것도 확인(routing:105는 Codex 작업분 아님 — Claude 끊김 전 산출물).

**Claude가 찾아 수정한 위반/오류 3건:**

1. `local-runtime-codex-adapter.md` §7.4 — `proxy.ts` **중복 wikilink**. Claude가 §7.2에서
   이미 첫언급 wikilink(line 54)했는데 Codex가 §7.4에서 2번째 wikilink → 코드파일 "첫언급
   1회" 규칙 위반. 나중 등장(§7.4 "File ...")을 backtick path로 복원.
2. `local-runtime-routing-and-delivery.md` §8.3 — `fake-integration.test.ts` **중복 wikilink**.
   Codex가 "반복 언급"으로 표기하고도 wikilink함 → 나중 등장(§8.3 router note)을 backtick 복원.
   첫언급(§8.3 partial-failure isolation, line evidence 동반)은 wikilink 유지.
3. `local-runtime-cli-and-operator-surfaces.md` §9.3 — `doctor.ts` **누락(oversight)**. 같은
   섹션 동급 sibling `format.ts`는 wikilink했으나 `doctor.ts`는 빠짐 → §9.3 prose 첫언급
   wikilink 보정(§9.1 table cite는 backtick 유지 = table 일관성).

**보더라인 판단(@user 결정 반영):**

- Codex의 코드 wikilink coverage가 Claude 5개 slice보다 **선택적**(dense evidence 리스트에서
  주요 파일 1개만 wikilink). docs/AGENTS.md "필요하면 wikilink"(허용) + Writing Style
  "의미 없는 링크 금지"에 비춰 위반 아님. → @user 결정: **현행 유지**(mass rewrite 안 함).
- `aiox-capability-policy.md:97`의 `claude-channel-trust-and-registration` decision 참조가
  evidence 리스트 backtick path로 남음. provenance=path 규칙상 정당하나 그 문서 내 유일한
  그 decision 언급이라 그래프 엣지 가치가 큼. → @user 결정: **decision만 wikilink 보강**
  (`[[claude-channel-trust-and-registration]] — \`…:25-34\``, line evidence 유지).

**검증 Ledger (다른 agent가 이 로그만으로 pass/fail 판정 가능):**

| # | 검증 항목 | 방법 | 결과 |
| - | --------- | ---- | ---- |
| 1 | inline-code 0 | `scripts/check-markdown-inline-code` arch+spec slice 전체 = exit 0 | PASS |
| 2 | dead link 0 | 전 slice `[[...]]` target(src/tests 실파일 + docs basename) 실재 검사 | PASS |
| 3 | 코드/테스트 중복 wikilink 0 | 각 slice에서 `[[src|tests/...]]` uniq -d = 빈 출력 | PASS (위반 2건 수정 후) |
| 4 | proxy.ts 단일화 | codex-adapter `[[src/adapters/codex/proxy.ts]]` x1(§7.2만), §7.4=backtick | PASS |
| 5 | fake-integration 단일화 | routing `[[tests/.../fake-integration.test.ts]]` x1(§8.3 첫언급만) | PASS |
| 6 | doctor.ts 보정 | cli §9.3 `[[src/cli/doctor.ts]]` 존재, 파일 실재 | PASS |
| 7 | capability decision 보강 | `[[claude-channel-trust-and-registration]]` 추가, target 실재, inline 0 | PASS |
| 8 | owner 의미 비변경 | 모든 변경 = 참조 표기(link/backtick)만, 계약·사실 본문 무변경 | PASS |

**경계 준수:** 변경 = arch slice 3(codex-adapter·routing·cli) + spec 1(capability-policy)의
참조 표기만. `src/`·`plans/`·product·decision 본문 0건. logs 전체·전역 `.md` sweep·evidence
전역 정규화 제외 유지. W6 `Allowed cross-owner updates`(decisions·spec·architecture) 안.

**Work Items 전이:** W6 `[x]`(2026-06-25 종료), W3 `[>]`. plan stage 7은 `[>]` 유지(W3가
stage 마지막). onramp는 이 로그 next pointer로 W3 재개.

**다음 행동(@user 확정 순서):**

1. **다음 세션 = 커밋.** W4/W5/W6 산출물(docs/AGENTS 계층·split index+slice·wikilink 정리)이
   전부 uncommitted/untracked다. 먼저 이 변경분을 커밋한다. (현재 어떤 커밋도 아직 안 됨.)
2. **그 다음 세션 = W3.** repo를 Obsidian vault로 열어 Graph/Backlink가 docs-as-Atlas
   navigation layer로 유효한지(권위 비대체 + discovery 가치) 확인. @user의 Obsidian GUI
   체감이 필요한 단계라 @user와 함께 진행.

즉 즉시 다음 onramp는 W3 착수가 아니라 **커밋**이다.
