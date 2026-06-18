# Task Brief — W7 Batch 3: Claude Adapter (§6) 검증

## 맥락

`docs/architecture/local-agent-runtime.md` as-built 권위 문서를 현재 구현과 대조해
drift를 수정한다. 이 brief는 **§6 Claude Adapter**(6.1 Topology / 6.2 Launch Flow /
6.3 Claude→daemon Ingress / 6.4 daemon→Claude Injection / 6.5 Sequence)만 담당한다.
결과는 `logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`에 기록한다.

## 0. 먼저 읽어라 (규칙은 여기 있다 — 복붙하지 않는다)

1. `logs/AGENTS.md` → **Workspace Reset Log Sections** (규칙 1~4 + 로그 섹션 템플릿)
2. `docs/architecture/AGENTS.md` (§1~§5)
3. (decision 생성 시) `docs/decisions/AGENTS.md`

읽지 않으면 작업하지 마라. 아래는 이 배치의 범위·출발점일 뿐이다.

## 1. 범위

§6.1~§6.5.

## 2. src 출발점 (확인할 답이 아니라 탐색 시작점 — 호출 끝까지 추적, rule 1)

- `src/adapters/claude/launcher.ts` — channel-server 주입(기본 plugin / legacy inline)
- `src/adapters/claude/channel-server.ts` — stdio + HTTP `/send` ingress
- `src/adapters/claude/injector.ts` — daemon→Claude inject 페이로드
- `src/daemon/state.ts` — `receiveClaude*` ingress RPC, daemon→Claude HTTP inject 경로
- `src/cli/invocation.ts`, `src/cli/parse.ts` — `aiox claude` launch, D/A strategy 분기

## 3. 교차 검색 (rule 2 — 현재가 아닐 수 있다)

- `history/`: `35`(step-11 claude channel decisions), `49`~`56`(mcp-config feasibility →
  plugin list/scope → strategy D 기본 전환). → WHY.
- decision: `docs/decisions/claude-channel-plugin-default.md` (D strategy WHY). §6에서
  WHY가 코드로 복원 안 되는 지점에 `Related decision:` 링크가 있는지 확인(없으면 추가).
- 미래 출처(현재 오인 금지, 단 미래 문서 "현재 스냅샷"도 stale 가능 → `src/`+날짜로 확정):
  `prd/post-mvp/aiox-a2a-spec.md`(channel auth P1-1, plugin 일반화),
  `plans/post-mvp/channel-boot-surface.plan.md`.

## 4. 검증 관점 (두 축 모두 — rule 4)

- **로직/계약 축**: §6.2 launch flow가 `launcher.ts`와 일치하는가 — 기본값
  `plugin:aiox-channel-ingress@aiox`(D), legacy `--mcp-config` inline은
  `AIOX_CLAUDE_CHANNEL_STRATEGY=inline` 명시 시만. §6.3 ingress RPC 이름·shape가
  `state.ts`와 일치. §6.4 daemon→Claude HTTP `/send` inject 경로·인증 유무. §6.5 시퀀스.
- **현재/미래 축**: channel HTTP `/send` 무인증(P1-1)은 **현재 사실+gap**이지 미래
  보안 경계가 아니다 — 현재로 정확히. 여러 plugin 충돌·`--strict-mcp-config` 일반화는 미래.

## 5. 알려진 후속

- `claude_channel_port_in_use` typed error(history/47 §AIOX_CLAUDE_CHANNEL_PORT)가
  §6 또는 §10.3에 있는지 확인. §6 범위면 반영, §10.3이면 Evidence Ledger에 후속(W6)으로.

## 6. 출력

1. **Evidence Ledger rows**: `| Topic | Source | Lines | Finding | Owner impact | Action |`
   — Finding prefix `[Fact]`/`[Inference]`/`[Opinion]`, Action `변경 없음`/`문서 수정`/
   `Decision 신규 생성`/`후속(Wn)`.
2. **문서 수정**: drift 항목만 직접 수정, 모든 as-built 주장에 `file:line`, spec contract 복사 금지.
3. **Decision**: WHY 복원 불가 시 Decision Candidates 행 + `docs/decisions/` 생성 + Cross-Owner Effects 행.
4. Allowed cross-owner 밖 문서는 수정 말고 사용자 보고.
5. **Workflow retrospective 후보**: batch 분할, task brief, Evidence Ledger, Scope,
   agent 의견 수렴에서 생긴 시행착오나 portable 후보가 있으면 W7 assimilation 로그와
   `logs/2026-06-18-package-workflow-portable-pattern.md`에 남긴다.

## 7. 완료 조건

- §6 모든 검증 항목에 Evidence Ledger 행. drift는 수정 완료.
- "변경 없음"은 **로직 축 + 현재/미래 축 둘 다 대조한 뒤에만**.
- Workflow retrospective 후보가 있으면 W7 assimilation 로그와
  `logs/2026-06-18-package-workflow-portable-pattern.md`에 기록한다.
- assimilation 로그에서 **W3(B3)** 완료 전이, next pointer를 **W4(B4)** 로.
