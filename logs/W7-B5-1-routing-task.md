# Task Brief — W7 Batch 5-1: Cross-Cutting Message Routing (§8) 검증

## 맥락

`docs/architecture/local-agent-runtime.md` as-built 권위 문서를 현재 구현과 대조해
drift를 수정한다. 이 brief는 **§8 Cross-Cutting Message Routing**(8.1~8.6)만 담당한다
(W5-1). §9는 `W7-B5-2-cli-task.md`가 담당한다. 결과는
`logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`에 기록한다.

> 주의: 이 배치가 **Step 15(pair 일반화·dispatch·stale drift)** 의 주 반영 지점이다.
> §0/§2/§3과 §8.1/§8.6은 이미 일부 갱신됨 — **코드로 재검증**한다.

## 0. 먼저 읽어라 (규칙은 여기 있다 — 복붙하지 않는다)

1. `logs/AGENTS.md` → **Workspace Reset Log Sections** (규칙 1~4 + 로그 섹션 템플릿)
2. `docs/architecture/AGENTS.md` (§1~§5)
3. `docs/decisions/pair-slot-generalization.md` (Step 15 결정 — §8 정합 기준)

읽지 않으면 작업하지 마라. 아래는 이 배치의 범위·출발점일 뿐이다.

## 1. 범위

§8.1 Domain Model / 8.2 sendMessage Atomicity+Idempotency / 8.3 Router and Fan-out /
8.4 Delivery State Machine / 8.5 `parent_message_id` / 8.6 Pair Reservation+Routes.

## 2. src 출발점 (확인할 답이 아니라 탐색 시작점 — 호출 끝까지 추적, rule 1)

- `src/daemon/state.ts` — `sendMessage`/`runSendMessageTransaction`/router/`dispatchToPairPeers`
- `src/core/deliveries.ts` — delivery state machine, `delivering→queued` restart recovery 매핑
- `src/adapters/router.ts` — fan-out, deferred/transition
- `src/adapters/contract.ts` — `AdapterInjectResult` 단일 `kind` discriminator, `FailureReason`
- `src/core/pairs.ts` + `src/store/repositories/pairs.ts` — pair reservation + routes

## 3. 교차 검색 (rule 2 — 현재가 아닐 수 있다)

- `history/`: `45`~`48`(Step 15 — `dispatchToPairPeers` 단일화·vendor-pair hardcode 제거·
  deferred 3종·D8 nested dispatch·F1~F5 leftover), `19`(route fan-out), `23`(pair daemon). → WHY.
- decision: `docs/decisions/pair-slot-generalization.md`.
- 미래 출처(현재 오인 금지, 미래 "현재 스냅샷"도 stale 가능 → `src/`+날짜로 확정):
  `prd/post-mvp/aiox-a2a-spec.md`(ack/retry, queued auto-flush, canonical envelope,
  deliveryId 기반 reply). 이들이 §8에 **현재처럼** 적혀 있으면 `Target`/`Deferred`로 정정.

## 4. 검증 관점 (두 축 모두 — rule 4)

- **로직/계약 축**:
  - §8.2 idempotency(`idempotency_key` UNIQUE + sentinel reclassify),
    §8.3 router/fan-out,
    §8.4 delivery state machine(queued/delivering/delivered/completed/failed + **deferred**;
    pre-inject deferred는 `delivering` 전이 skip / post-inject deferred는 `delivering→queued`
    revert — F2/F3), §8.5 `parent_message_id`가 코드와 일치하는가.
  - §8.6 Pair Reservation+Routes가 **kind-agnostic 2-slot·same-vendor**(§3과 정합)인가 —
    subagent가 §8.1/§8.6 slot 텍스트를 갱신했다고 보고했으니 **코드로 재확인**.
- **현재/미래 축**: ack/retry·auto-flush·canonical envelope은 미래(post-mvp). pair status
  `stale`은 **타입만 존재·전이 미구현 gap**(§2와 정합) — §8의 "stale drift"를 이 기준으로 기술.

## 5. 알려진 후속

- §8.3/§8.4가 `dispatchToPairPeers` 단일화·vendor-pair hardcode 제거(history/47 commit3)를
  반영하는지. **D6 registry(`adapter[kind].inject`)는 미채택**(post-MVP defer)이므로 §8이
  잘못 registry pattern으로 적혀 있지 않은지 확인.

## 6. 출력

1. **Evidence Ledger rows**: `| Topic | Source | Lines | Finding | Owner impact | Action |`
   — `[Fact]`/`[Inference]`/`[Opinion]`, Action `변경 없음`/`문서 수정`/`Decision 신규 생성`/`후속(Wn)`.
2. **문서 수정**: drift만 직접 수정, as-built 주장에 `file:line`, spec contract 복사 금지.
3. **Decision**: WHY 복원 불가 시 Candidates 행 + `docs/decisions/` 생성 + Cross-Owner Effects 행.
4. Allowed cross-owner 밖 문서는 수정 말고 사용자 보고.

## 7. 완료 조건

- §8 모든 검증 항목에 Evidence Ledger 행. Step 15 관련 §8 drift 반영 완료.
- "변경 없음"은 **로직 축 + 현재/미래 축 둘 다 대조한 뒤에만**.
- Workflow retrospective 후보가 있으면 W7 assimilation 로그와
  `logs/2026-06-18-package-workflow-portable-pattern.md`에 남긴다: batch 분할,
  task brief, Evidence Ledger, Scope, agent 의견 수렴에서 생긴 시행착오와 portable 후보.
- assimilation 로그에서 **W5-1(§8)** 완료 전이, next pointer를 **W5-2(§9, `W7-B5-2-cli-task.md`)** 로.
