# Task Brief — W7 Batch 6: Catalogs & References (§10~§14) 검증

## 맥락

`docs/architecture/local-agent-runtime.md` as-built 권위 문서를 현재 구현과 대조해
drift를 수정한다. 이 brief는 **§10 Typed Error Catalog**(10.1~10.6) / **§11 Events
Catalog** / **§12 Implementation Smoke Matrix** / **§13 Known Gaps · Post-MVP** /
**§14 Authority Links**를 담당한다. 결과는
`logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`에 기록한다.

Controlling log: `logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`.

## 0. 먼저 읽어라 (규칙은 여기 있다 — 복붙하지 않는다)

1. `logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`
   - `## Work Items`
   - 최신 기록
   - `### 4. W6 Handoff (열린 후속) 및 검증`
   - §10~§14 / §9.3 / §10.6 관련 Evidence Ledger rows
2. `logs/AGENTS.md` → **Workspace Reset Log Sections** (규칙 1~4 + 로그 섹션 템플릿)
3. `docs/architecture/AGENTS.md` (§1~§5)
4. (decision 생성 시) `docs/decisions/AGENTS.md`

읽지 않으면 작업하지 마라.

## 1. 범위

§10.1 Daemon API / 10.2 Codex(`AdapterInjectFailureReason`) / 10.3 Claude / 10.4 Router /
10.5 Socket Transport / 10.6 CLI. §11 Events. §12 Smoke Matrix. §13 Known Gaps/Post-MVP.
§14 Authority Links.

## 2. src 출발점 (확인할 답이 아니라 탐색 시작점 — rule 1)

각 catalog 행의 기존 `file:line` cite에서 출발하되 **그 cite 자체를 검증**한다(stale 가능).
그 위에 타입 union을 **전수 대조**한다:

- §10: `src/adapters/contract.ts`(`AdapterInjectFailureReason`), `src/daemon/state.ts`·
  `src/daemon/api.ts`(daemon API reason), `src/adapters/router.ts`,
  `src/adapters/codex/*`·`src/adapters/claude/*`(adapter reason), `src/daemon/socket-transport.ts`(envelope reason),
  `src/cli/parse.ts`(CLI parse/invocation reason).
- §11: event type가 정의·append되는 지점(`events.append` 호출과 event type 문자열 grep).
- §12: `tests/` 실제 smoke/integration 테스트와 매트릭스 대조.
- §14: 링크 대상 파일이 실제 존재하는 경로인지.

## 3. 교차 검색 (rule 2 — 현재가 아닐 수 있다)

- `history/`: 각 reason/event 도입 step 전반. 특히 `45`~`48`(Step 15 deferred reason 3종·
  D8 surface), `47` F1(단일 `kind` discriminator로 통일).
- 미래 출처: `prd/post-mvp/aiox-a2a-spec.md` §11(release gates)·§12(defect)·§13(gaps),
  `docs/product/roadmap.md`. **§13 Known Gaps가 현재 한계와 미래 target을 정확히 가르는지**가
  이 배치의 핵심.

## 4. 검증 관점 (두 축 모두 — rule 4)

- **로직/계약 축**: §10 각 reason이 코드 union과 1:1인가(**누락·잉여 모두**). §11 event
  명칭이 코드와 일치. §12 smoke 항목이 실제 테스트 존재와 일치(없는 테스트를 "통과"로
  적지 않았는지). §14 링크 dead 여부.
- **현재/미래 축**: §13이 **현재 gap**(in-memory persistence·WAL helper unused·runtime
  failure 미배선·pair status `stale` 전이 미구현·channel `/send` 무인증)과 **미래 target**
  (a2a-spec Phase 2 durable store·ack/retry·federation·canonical envelope)을 구분하는가.

## 5. 알려진 후속 (B1~B5 누적 — 이 배치에서 마감)

- **§10.1 Daemon API에 `agent_already_attached` 누락**(B1/B2 발견, 문서 §5 line 303·§10.1).
  코드(`state.ts:572-578`, `core/pairs.ts:39`)에서 attach 클라이언트 응답으로 surface되면
  §10.1에 추가.
- §10.2 Codex `AdapterInjectFailureReason`이 **단일 `kind` discriminator**(history/47 F1)와
  정합인지.
- §13에 **pair status `stale` 전이 gap**·**in-memory persistence(a2a-spec Phase 2)**·
  **WAL helper(`openSqliteDatabase`) unused** 반영.
- §14 Authority Links가 W4 이후 정합인지(예: 구 `mvp-architecture.md`→`local-agent-runtime.md`
  rename, prd 경로). dead link 있으면 수정.

## 6. 출력

1. **Evidence Ledger rows**: `| Topic | Source | Lines | Finding | Owner impact | Action |`
   — `[Fact]`/`[Inference]`/`[Opinion]`, Action `변경 없음`/`문서 수정`/`Decision 신규 생성`/`후속(Wn)`.
2. **문서 수정**: drift만 직접 수정, as-built 주장에 `file:line`, spec contract 복사 금지.
3. **Decision**: WHY 복원 불가 시 Candidates 행 + `docs/decisions/` 생성 + Cross-Owner Effects 행.
4. Allowed cross-owner 밖 문서는 수정 말고 사용자 보고.

## 7. 완료 조건

- §10~§14 모든 검증 항목에 Evidence Ledger 행. 누적 후속(특히 `agent_already_attached`,
  §13 gap 구분) 반영 완료.
- "변경 없음"은 **로직 축 + 현재/미래 축 둘 다 대조한 뒤에만**.
- Workflow retrospective 후보가 있으면 W7 assimilation 로그와
  `logs/2026-06-18-package-workflow-portable-pattern.md`에 남긴다: batch 분할,
  task brief, Evidence Ledger, Scope, agent 의견 수렴에서 생긴 시행착오와 portable 후보.
- assimilation 로그에서 **W6(B6)** 완료 전이. 이후 **W7 Cross-Owner Effects → W8 Closeout**.
