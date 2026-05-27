# Step 15 — Phase B Closeout

## Status

- Date: 2026-05-27
- Step: 15 Phase B (구현 + 검증 종료)
- Phase A 권위: `history/46-step-15-phase-a-decisions.history.md` (D1-D9 LOCKED)
- Design 권위: `history/45-step-15-pair-slot-generalization-design.history.md`
- Verification: `pnpm test` 386 passing (48 files), `pnpm typecheck` clean.
- Main commit: `feat(step-15): pair slot generalization (same-vendor pair)` (single green squashed commit per amended commit policy).

## Final principles 재확인 (Phase A 4 principles 그대로 구현)

1. slot model은 필요조건, dispatch generic화가 behavioral 본체.
2. fallback disable은 모든 Codex target injection에 적용 (same-vendor 한정 아님).
3. deferred는 failure가 아니라 retryable / non-terminal delivery state.
4. automatic retry / push notification은 Post-MVP.

---

## 구현 단계 진행 기록 (논리적 4 commit → 실제 main 2 commit)

`history/45 §7` + `history/46 D9` 의 Tidy First 4-commit 분할은 **로컬 작업 단계 표시**로 사용했고, main에는 squashed green commit만 남겼다. `history/45 §7` 마지막에 commit policy amendment 한 줄 추가됨.

### Commit 1 (Red tests) — 로컬 단위
- core/store/daemon E2E + same-vendor deferred + claude↔claude deferred + self-loop reject + nested dispatch response shape.
- 21 failing tests 추가 (compile은 통과, runtime red).
- 기존 `tests/unit/store/repositories/pairs.test.ts`의 same-agent reattach idempotent 테스트는 D7 계약(`agent_already_attached`)에 맞게 갱신.

### Commit 2 (Structural)
- `src/store/schema.ts`: versioned migration으로 격상. `schema_version` meta table + Migration 1.
- Migration 1: `(pair_id, kind)` 중복 preflight → ALTER `agents.pair_slot` → backfill (codex→a / claude→b) → partial unique index `agents_pair_slot_unique`. 전체 single `withTransaction`. 실패 시 typed `schema_migration_failed` / `duplicate_pair_slot_after_backfill`.
- `src/core/pairs.ts`, `src/store/repositories/pairs.ts`, `src/daemon/api.ts` DTO에 `slot: "a"|"b"` 도입. `kind` metadata 유지.

### Commit 3 (Behavioral 본체)
- `src/daemon/state.ts`: `dispatchClaudeReplyToCodexChannels` / `dispatchCodexMessageToClaudeChannels` 제거. `dispatchToPairPeers` 단일 함수. target `agent.kind` 기반 dispatch. **vendor-pair hardcode 제거.**
- D1 fallback disable: `runtime.activeThreadId` 없으면 `target_binding_unconfirmed` deferred. `loadedThreadIds.at(-1)` fallback 미사용.
- D6 acceptance criteria 만족: route target `agent.kind`로 adapter 선택. **단, registry pattern(`adapter[kind].inject(...)`)은 본 step에서 채택 안 함**. 이유는 §"D6 registry refactor — post-MVP defer" 참조.
- D5: `attachments.length === 2 && slots == {"a","b"}` → `ready`.
- D7: core + store 이중 self-loop guard. core/pairs.ts와 store/pairs.ts에서 `agent_already_attached`를 slot 검사 이전에 처리.
- D8: `sendMessage` response를 `{ ok, messageId, dispatch: { delivered, deferred, failed } }` nested로 확장.
- Deferred reason 3종 wiring: `target_binding_unconfirmed` (Codex active thread 부재) / `target_runtime_unavailable` (Claude channel runtime / Codex runtime 부재) / `target_adapter_not_registered` (router adapter 미등록 normalized mapping).

### Commit 4 (Defensive)
- D7 self-loop guard core+store는 Commit 3에서 같이 들어감 (분리하면 Commit 3 단독 green 불가).
- D8 source notification surface = nested dispatch response (Commit 3 포함).
- `AIOX_CLAUDE_CHANNEL_PORT` typed fail-fast 가드 — §"AIOX_CLAUDE_CHANNEL_PORT 처리" 참조.

---

## Cross-validation follow-up (Codex 리뷰 + Claude 리뷰 합집합 처리)

Phase B 초기 구현 직후 합동 리뷰에서 3 finding 추출. 모두 본 closeout 시점에 처리 완료.

### F1 — `AdapterInjectResult` discriminator drift (D2 lock 위반)

- 초기 구현은 `{ ok: true } | { ok: false, reason, message } | { kind: "deferred", reason, eligibility }`의 mixed discriminator 였다.
- D2 lock spec은 단일 `kind: "success" | "failed" | "deferred"` discriminator.
- 수정: `src/adapters/contract.ts` 단일 `kind` discriminator로 통일. `src/adapters/claude/injector.ts`, `src/adapters/codex/injector.ts`, `src/adapters/codex/runtime.ts`, `src/adapters/router.ts` 일괄 마이그레이션. 잔존 `{ ok }` 패턴 0건.
- daemon에서 진행하던 legacy ↔ new shape 변환 로직 제거.

### F2 — Router deferred leaves delivery in `delivering` (D8 contract 위반)

- 초기 router 구현은 inject 호출 *전에* `delivering` 전이를 commit하고, deferred 결과여도 그대로 두었다 → DB row가 `delivering` stuck, "deferred = non-terminal queued" 계약과 어긋남.
- 수정: pre-inject 알려진 deferred(`target_adapter_not_registered`)는 `delivering` 전이 자체를 skip. post-inject deferred는 `delivering → queued` revert. 회귀 테스트 추가: `tests/unit/adapters/fake-integration.test.ts` "leaves delivery queued when a registered adapter defers injection".

### F3 — Daemon dispatch inject-before-mark race (lifecycle safety)

- 초기 구현은 `injectMessageInto...` 실제 side-effect 수행 후 status를 `delivering → delivered → completed`로 갱신. 중간 crash 시 DB는 `queued`로 남지만 메시지는 이미 push된 상태가 가능. restart recovery가 `delivering → queued`이므로 잘못하면 중복 inject 위험.
- 수정:
  - **pre-inject known deferred**(`!claudeChannelRuntimes.has(targetName)`, `codex_no_loaded_thread`, `codex_channel_unavailable`): `delivering` 전이 자체 skip → 최종 `queued`.
  - **side-effect 직전**: `delivering` 전이를 별도 transaction commit. 그 후 adapter inject.
  - **post-inject success**: `delivering → delivered → completed`.
  - **post-inject failed**: `delivering → failed`.
  - **post-inject deferred**: `delivering → queued` revert.
- **Restart recovery 정책은 불변** — 기존 `src/core/deliveries.ts:48-52` + `tests/unit/core/deliveries.test.ts:79-80`의 `delivering → queued` 매핑 유지. F3 처리는 *side-effect 이전 transition*만 변경.
- 회귀 테스트:
  - T1: 성공 dispatch 시 fetch 시점 DB status가 `delivering` (Claude HTTP capture로 검증, `tests/unit/daemon/codex-ingress.test.ts`).
  - T2: pre-inject deferred 경로 최종 status `queued` (Codex binding 부재, Claude channel 부재 양쪽 검증).

---

## AIOX_CLAUDE_CHANNEL_PORT 처리

### 정책 (사용자 lock)

- env 미명시: OS auto-port 사용.
- env 명시 + 포트 free: 해당 포트 bind.
- env 명시 + 포트 occupied: **auto-port fallback 없이 typed fail-fast** (`reason: "claude_channel_port_in_use"` + port + 액션 안내 message).

### 구현

- `src/adapters/claude/channel-server.ts`:
  - `ClaudeChannelPortInUseError extends Error` 타입 신설 (`reason`, `port`).
  - `server.once("error", ...)`을 `server.listen()` 이전에 등록 (race-safe). `EADDRINUSE` + `listenPort > 0` 인 경우만 typed error로 normalize. auto-port 모드는 일반 에러로 통과.
  - CLI 진입점의 fatal output JSON에 `reason` / `port` 포함 → 사용자 / 외부 도구 파싱 가능.
- 회귀 테스트:
  - env 없는 auto-port 동작.
  - explicit free port bind.
  - explicit occupied port → `rejects.toMatchObject({ reason, port, message: stringContaining("AIOX_CLAUDE_CHANNEL_PORT") })`.

### Surface 지점 결정 (Codex 의견 채택)

**daemon attach response에 listen 실패를 직접 싣지 않는다.** Claude channel server는 `claude` CLI child process 안에서 부팅되고, daemon은 token 발급 단계까지만 관여한다. listen은 child process boot 단계에서 발생하므로 daemon attach 시점에는 결과를 알 수 없다.

따라서 현 surface = child process stderr fatal JSON. 외부 파서가 기계적으로 reason/port를 읽을 수 있는 형태.

**부족한 부분 인지**: attach RPC는 성공으로 응답한 뒤 child process가 늦게 죽는 미세한 race가 있다. 사용자는 "attach 성공인데 메시지가 안 간다"는 일시적 혼란을 겪을 수 있고, 다음 inject 시점에 `target_runtime_unavailable` deferred로만 surface된다. 더 깔끔한 surface는 daemon ↔ channel server child process 간 startup acknowledgment 경로가 필요하지만 **본 Step scope 밖**.

→ 별도 post-MVP 항목으로 등록: `prd/post-mvp/aiox-post-mvp-spec.md` §P2.

---

## D6 registry refactor — post-MVP defer

### 결정

D6 acceptance criteria 본문 ("vendor-pair hardcode 제거 + target agent.kind 기반 dispatch")은 현 구현이 만족. 그러나 lock spec 텍스트의 권고 형태 `adapter[targetAgent.kind].inject(...)` registry lookup은 채택하지 않았다. 사용자 결정으로 **post-MVP defer**.

### 이유

- 현재 `dispatchToPairPeers`의 vendor 분기는 단순 adapter dispatch가 아니다. 각 vendor의 pre-inject orchestration(Codex: binding 확인 + thread 선택 + event 발행 / Claude: runtime 사전 체크 + reason normalize)이 들어 있어, 단순 `adapter[kind].inject(...)`로 갈음할 수 없다.
- 진짜 registry로 가려면 adapter interface 확장(`dispatchToTarget` 메서드 + event 발행 책임 이관) 또는 심층 refactor 필요. Step 15 scope 밖.
- 표층만 정리하는 옵션도 있으나(if/else를 record lookup으로 치환 + 분기 로직 adapter 메서드 안으로 이동) 가치가 크지 않다.

### 권위 위치

- 본 결정: `prd/post-mvp/aiox-post-mvp-spec.md` §P1.
- 채택 시 별도 step 진입. 본 closeout은 정식 lock의 권위 위치만 표시.

---

## Docs 갱신 (본 closeout과 함께)

- `plan/mvp-implementation-checklist.md` §Step 15: 🟡 Phase A locked → 🟢 Phase B complete. Verification baseline 382 → 386.
- `plan/qa-tracker.md` QA-002 unblock 신호.
- `history/45 §7` 마지막에 commit policy amendment 한 줄 (Red commit local-only, main = green only, 1+2+3 squash + Defensive 별도는 본 Step에서는 단일 squash로 통합).
- `prd/post-mvp/aiox-post-mvp-spec.md` 신규: P1 (D6 registry refactor) / P2 (channel server boot failure surface).

---

## Phase A 권위와의 정합성 매트릭스

| Decision | 구현 위치 | 만족 |
|---|---|---|
| D1 Codex fallback disable | `src/daemon/state.ts` resolveCodexReplyTarget | ✓ |
| D2 Reason union 분리 | `src/adapters/contract.ts` | ✓ |
| D2 단일 kind discriminator | `src/adapters/contract.ts` | ✓ (F1 후처리) |
| D3 slot DTO + 거절 reason 분리 | `src/core/pairs.ts`, `src/store/repositories/pairs.ts` | ✓ |
| D4 Migration mechanism + preflight | `src/store/schema.ts` | ✓ |
| D5 getPairStatus 규칙 | `src/core/pairs.ts` getPairStatus | ✓ |
| D6 Dispatch generic화 (acceptance criteria 본문) | `src/daemon/state.ts` dispatchToPairPeers | ✓ |
| D6 registry pattern (spec literal) | — | post-MVP defer (prd/post-mvp §P1) |
| D7 Self-loop guard (core + store) | `src/core/pairs.ts`, `src/store/repositories/pairs.ts` | ✓ |
| D8 Source notification (nested dispatch) | `src/daemon/api.ts` SendMessageResponse, `src/daemon/state.ts` DispatchSummary | ✓ |
| D9 Phase A scope 외 항목 | retry/push notification/3-way/dynamic slot 모두 미구현 | ✓ |

---

## Related

- Step 15 design: `history/45-step-15-pair-slot-generalization-design.history.md`
- Step 15 Phase A lock: `history/46-step-15-phase-a-decisions.history.md`
- PRD: `prd/mvp/aiox-mvp-spec.md` §Pair (본 step에서 amendment 반영)
- Post-MVP: `prd/post-mvp/aiox-post-mvp-spec.md` §P1, §P2
- QA: `plan/qa-tracker.md` QA-002
- Checklist: `plan/mvp-implementation-checklist.md` §Step 15
- Commit policy amendment: `history/45 §7` 말미
- Memory 인덱스: [[aiox-step-15-decisions]], [[aiox-step-progress]]
