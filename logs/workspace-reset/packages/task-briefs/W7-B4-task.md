# Task Brief — W7 Batch 4: Codex Adapter (§7) 검증

## 맥락

`docs/architecture/local-agent-runtime.md` as-built 권위 문서를 현재 구현과 대조해
drift를 수정한다. 이 brief는 **§7 Codex Adapter**(7.1~7.10)만 담당한다. 결과는
`logs/workspace-reset/packages/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`에 기록한다.

## 0. 먼저 읽어라 (규칙은 여기 있다 — 복붙하지 않는다)

1. `logs/AGENTS.md` → **Workspace Reset Log Sections** (규칙 1~4 + 로그 섹션 템플릿)
2. `docs/architecture/AGENTS.md` (§1~§5)
3. (decision 생성 시) `docs/decisions/AGENTS.md`

읽지 않으면 작업하지 마라. 아래는 이 배치의 범위·출발점일 뿐이다.

## 1. 범위

§7.1 Per-agent Runtime / 7.2 Attach / 7.3 Resume / 7.4 Transparent Proxy /
7.5 Active-Thread Binding / 7.6 Injection / 7.7 Delivery / 7.8 MCP Ingress /
7.9 Lifecycle / 7.10 Sequence.

## 2. src 출발점 (확인할 답이 아니라 탐색 시작점 — 호출 끝까지 추적, rule 1)

- `src/adapters/codex/runtime.ts` — per-agent app-server 부착(1:1)
- `src/adapters/codex/app-server.ts`, `launcher.ts`, `websocket.ts` — app-server child·proxy·WS
- `src/adapters/codex/injector.ts` — `turn/start` inject, binding
- `src/daemon/state.ts` — `receiveCodex*`, `dispatchToPairPeers`, active-thread 선택/fallback
- (proxy 구현 파일은 위 import 경로 따라 확인)

## 3. 교차 검색 (rule 2 — 현재가 아닐 수 있다)

- `history/`: `27`~`34`(step-10 per-agent app-server pivot·proxy·runtime),
  `39`(codex MCP ingress), `41`(loadedThreadIds thread binding 분석),
  `45`~`48`(Step 15 — fallback disable·deferred). → WHY.
- decision: `docs/decisions/codex-per-agent-app-server.md`(1:1 WHY),
  `docs/decisions/pair-slot-generalization.md`(fallback disable·deferred). §7.1/§7.5에
  `Related decision:` 링크가 있는지 확인(없으면 추가).
- 미래 출처(현재 오인 금지, 미래 "현재 스냅샷"도 stale 가능 → `src/`+날짜로 확정):
  `prd/post-mvp/aiox-a2a-spec.md`(P2-12 WS transport upstream 비지원, P2-3 runtime
  failure 미배선), `plans/post-mvp/`.

## 4. 검증 관점 (두 축 모두 — rule 4)

- **로직/계약 축**: §7.1 1:1 per-agent app-server가 `runtime.ts`와 일치. §7.5 active-thread
  binding authority + §7.6 `turn/start` injection + §7.7 delivery(live loaded-thread +
  queued fallback)가 코드와 일치. §7.4 transparent proxy, §7.8 MCP ingress, §7.10 시퀀스.
- **현재/미래 축**: `loadedThreadIds.at(-1)` fallback **disable**(Step 15 D1)가 §7에
  반영됐는지 — same-vendor codex pair wrong-thread 방지. WS transport experimental(P2-12)·
  runtime failure 미배선(P2-3)은 **현재 gap** → §7/§13에 현재로 표기, 미래 해결로 오인 금지.

## 5. 알려진 후속

- deferred reason `target_binding_unconfirmed`(Codex active thread 부재)가 §7과 §8/§10
  사이에 정합인지. §7.5/§7.7이 "권위 있는 binding 없으면 deferred(throw 아님)"를
  정확히 기술하는지(history/45·47).

## 6. 출력

1. **Evidence Ledger rows**: `| Topic | Source | Lines | Finding | Owner impact | Action |`
   — `[Fact]`/`[Inference]`/`[Opinion]`, Action `변경 없음`/`문서 수정`/`Decision 신규 생성`/`후속(Wn)`.
2. **문서 수정**: drift만 직접 수정, as-built 주장에 `file:line`, spec contract 복사 금지.
3. **Decision**: WHY 복원 불가 시 Candidates 행 + `docs/decisions/` 생성 + Cross-Owner Effects 행.
4. Allowed cross-owner 밖 문서는 수정 말고 사용자 보고.
5. **Workflow retrospective 후보**: batch 분할, task brief, Evidence Ledger, Scope,
   agent 의견 수렴에서 생긴 시행착오나 portable 후보가 있으면 W7 assimilation 로그와
   `logs/log-system/2026-06-18-package-workflow-portable-pattern.md`에 남긴다.

## 7. 완료 조건

- §7 모든 검증 항목에 Evidence Ledger 행. drift는 수정 완료.
- "변경 없음"은 **로직 축 + 현재/미래 축 둘 다 대조한 뒤에만**.
- Workflow retrospective 후보가 있으면 W7 assimilation 로그와
  `logs/log-system/2026-06-18-package-workflow-portable-pattern.md`에 기록한다.
- assimilation 로그에서 **W4(B4)** 완료 전이, next pointer를 **W5(B5)** 로.
