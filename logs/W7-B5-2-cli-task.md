# Task Brief — W7 Batch 5-2: CLI / Invocation / Doctor / Status (§9) 검증

## 맥락

`docs/architecture/local-agent-runtime.md` as-built 권위 문서를 현재 구현과 대조해
drift를 수정한다. 이 brief는 **§9 CLI / Invocation / Doctor / Status**(9.1~9.3)만
담당한다(W5-2). §8은 `W7-B5-1-routing-task.md`가 담당한다. 결과는
`logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`에 기록한다.

## 0. 먼저 읽어라 (규칙은 여기 있다 — 복붙하지 않는다)

1. `logs/AGENTS.md` → **Workspace Reset Log Sections** (규칙 1~4 + 로그 섹션 템플릿)
2. `docs/architecture/AGENTS.md` (§1~§5)
3. (decision 생성 시) `docs/decisions/AGENTS.md`

읽지 않으면 작업하지 마라. 아래는 이 배치의 범위·출발점일 뿐이다.

## 1. 범위

§9.1 Command Table / 9.2 Invocation Layer / 9.3 Doctor+Status.

## 2. src 출발점 (확인할 답이 아니라 탐색 시작점 — 호출 끝까지 추적, rule 1)

- `src/cli/parse.ts` — 커맨드 파싱·플래그·서브커맨드(§9.1 command table source)
- `src/cli/invocation.ts` — invocation layer dispatch(어떤 커맨드가 daemon RPC로 가나,
  auto-start 분기 포함)
- `src/daemon/api.ts` — `status` RPC
- doctor 구현(`invocation.ts` 또는 별도 파일 — import 따라 확인)

## 3. 교차 검색 (rule 2 — 현재가 아닐 수 있다)

- `history/`: `18`(cli parse), `21`(invocation bin), `36`(doctor/status decisions),
  `40`(daemon/client split). → WHY.
- 미래 출처(현재 오인 금지): `prd/post-mvp/aiox-a2a-spec.md`(CLI 일반화·portable attach·
  설치형 public CLI), `docs/product/roadmap.md`. 이들이 §9에 **현재처럼** 적혀 있으면
  `Target`/`Deferred`로 정정.

## 4. 검증 관점 (두 축 모두 — rule 4)

- **로직/계약 축**: §9.1 command table이 `parse.ts`와 **1:1**인가 — 표에 없는데 코드에
  있는 커맨드, 코드에 없는데 표에 있는 커맨드(누락·잉여)를 적극적으로 찾는다.
  §9.2 invocation layer의 connect-only vs auto-start 분기가 `invocation.ts`와 일치.
  §9.3 doctor 점검 항목·status 출력 필드가 코드와 일치.
- **현재/미래 축**: 설치형 CLI·portable attach·tmux demo는 미래(post-mvp). 현재는 build
  후 `pnpm` 경유 실행 — §9가 미래 형태를 현재처럼 기술하지 않는지 확인.

## 5. 알려진 후속

- §4.1과 §9가 auto-start 분기를 서로 다르게 기술하지 않는지(일관성). 불일치 시 코드 기준 정정.

## 6. 출력

1. **Evidence Ledger rows**: `| Topic | Source | Lines | Finding | Owner impact | Action |`
   — `[Fact]`/`[Inference]`/`[Opinion]`, Action `변경 없음`/`문서 수정`/`Decision 신규 생성`/`후속(Wn)`.
2. **문서 수정**: drift만 직접 수정, as-built 주장에 `file:line`, spec contract 복사 금지.
3. **Decision**: WHY 복원 불가 시 Candidates 행 + `docs/decisions/` 생성 + Cross-Owner Effects 행.
4. Allowed cross-owner 밖 문서는 수정 말고 사용자 보고.

## 7. 완료 조건

- §9 모든 검증 항목에 Evidence Ledger 행. drift는 수정 완료.
- "변경 없음"은 **로직 축 + 현재/미래 축 둘 다 대조한 뒤에만**.
- Workflow retrospective 후보가 있으면 W7 assimilation 로그와
  `logs/2026-06-18-package-workflow-portable-pattern.md`에 남긴다: batch 분할,
  task brief, Evidence Ledger, Scope, agent 의견 수렴에서 생긴 시행착오와 portable 후보.
- assimilation 로그에서 **W5-2(§9)** 완료 전이(이로써 W5 배치 종료), next pointer를 **W6(B6)** 로.
