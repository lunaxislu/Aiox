# Step 15 — Phase A Decisions

## Status

- Date: 2026-05-27
- Step: 15 Phase A (decisions lock; no code change)
- Authoring flow: Claude 1차안 → Codex cross-validation (6 corrections) → 사용자 final lock
- Authority context:
  - Step 15 design: `history/45-step-15-pair-slot-generalization-design.history.md`
  - PRD amendment: `prd/mvp/aiox-mvp-spec.md` §Pair (Step 15 amendment block)
  - QA finding: `plan/qa-tracker.md` QA-002 (wontfix → Step 15)
- Code change: 0줄. Phase B에서 구현.

## Final Lock Principles (사용자 정리)

1. **slot model은 필요조건, dispatch generic화가 behavioral 본체.**
2. **fallback disable은 모든 Codex target injection에 적용** (same-vendor에 한정 안 함).
3. **deferred는 failure가 아니라 retryable / non-terminal delivery state.**
4. **automatic retry와 push notification은 Post-MVP.**

---

## D1 — Codex fallback policy (LOCKED)

- Codex target injection의 `loadedThreadIds.at(-1)` fallback은 target binding에 대한 **권위 있는 관찰이 아니라 guess** → 모든 pair (same-vendor + mixed) 에서 **disable**.
- `runtime.activeThreadId` 또는 proxy-observed authoritative binding이 없으면 inject 시도하지 않고 `deferred` + `target_binding_unconfirmed` 즉시 반환.
- **Future retry eligibility condition** (Codex 정정 적용): "target Codex가 `thread/start|resume|fork`로 binding을 생성하면 다시 inject 가능한 상태가 된다"는 *eligibility 조건* 일 뿐, **자동 retry는 Phase A 범위 밖** (Post-MVP).
- 현 MVP에서 deferred 해소 경로 = source agent의 explicit resend 또는 사용자 explicit action.

## D2 — AdapterInjectResult 타입 분리 (LOCKED)

Codex 정정 수용: `DeferredReason`을 `AdapterInjectFailureReason` 부분집합으로 두면 semantic drift 발생 → 타입 완전 분리.

```ts
// src/adapters/contract.ts

export type AdapterInjectFailureReason =
  | "codex_app_server_unavailable"
  | "codex_app_server_ws_connect_failed"
  | "codex_app_server_ws_initialize_failed"
  | "codex_turn_start_timeout"
  | "codex_jsonrpc_error"
  | "codex_app_server_ws_dropped"
  | "codex_binding_uncertain"
  | "codex_resume_failed"
  | "claude_channel_inject_failed"
  // ... 기존 reasons
  ;

export type AdapterInjectDeferredReason =
  | "target_binding_unconfirmed"      // Codex active thread / proxy binding 부재
  | "target_runtime_unavailable"      // adapter runtime down (process / socket dead)
  | "target_adapter_not_registered"   // router adapter_not_found의 normalized mapping
  ;

export type AdapterInjectResult =
  | { kind: "success"; ... }
  | { kind: "failed"; reason: AdapterInjectFailureReason; ... }
  | { kind: "deferred"; reason: AdapterInjectDeferredReason; eligibility?: string };
```

- `failed.reason`과 `deferred.reason`은 타입상 별개 union.
- `target_adapter_not_registered`는 **router 레벨 `adapter_not_found`의 normalized deferred mapping** (Codex 정정 명시).
- `eligibility?` 필드는 future retry 조건의 *self-describing string* (예: `"requires target codex binding"`). 자동 retry 트리거 아님, 진단/UX용.

## D3 — Slot DTO + 거절 reason 분리 (LOCKED)

- `src/core/pairs.ts` `PairAttachment`에 `slot: "a" | "b"` 필드 추가.
- `kind: AgentKind` 필드 유지 — adapter dispatch dispatcher의 metadata. slot이 1차 unique 키, kind는 정보용.
- DTO:
  - `attachAgent` request: `slot?: "a" | "b"` (생략 시 daemon이 빈 자리 우선 자동 선택).
  - `attachAgent` response: 실제 할당된 `slot` 포함.
- Auto-slot 선택 규칙: slot a 비어 있으면 a, 아니면 b. deterministic.
- **거절 reason 분리** (Codex 정정 수용):
  - `pair_slot_occupied` — 사용자가 explicit하게 요청한 slot이 이미 점유됨. (옛 `pair_kind_slot_occupied`의 generalization, 단 의미가 좁아짐.)
  - `pair_full` — slot 명시 없이 자동 선택 시도했는데 두 slot 모두 점유됨.
  - `agent_already_attached` — D7의 self-loop guard reason. 별개.

## D4 — Migration mechanism + preflight (LOCKED)

`src/store/schema.ts`의 `applySchema`를 versioned migration으로 격상.

### Schema version table

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
```

### Migration 1 (Step 15)

단일 `withTransaction` 안에서:

1. **Preflight check** (Codex 정정 추가):
   ```sql
   SELECT pair_id, kind, COUNT(*) as c
   FROM agents
   WHERE pair_id IS NOT NULL
   GROUP BY pair_id, kind
   HAVING c > 1;
   ```
   결과가 비어 있지 않으면 = 기존 corrupt DB. fail-fast:
   - typed error: `schema_migration_failed`
   - detail: `duplicate_pair_slot_after_backfill`
   - 보조 정보: 충돌하는 `(pair_id, kind)` 목록 로그.
2. `ALTER TABLE agents ADD COLUMN pair_slot TEXT;`
3. Backfill:
   ```sql
   UPDATE agents SET pair_slot = CASE kind
     WHEN 'codex' THEN 'a'
     WHEN 'claude' THEN 'b'
     END
   WHERE pair_id IS NOT NULL;
   ```
4. Partial unique index:
   ```sql
   CREATE UNIQUE INDEX agents_pair_slot_unique
     ON agents(pair_id, pair_slot)
     WHERE pair_id IS NOT NULL;
   ```
5. `INSERT INTO schema_version (version, applied_at) VALUES (1, <now>);`

### Failure policy

- 전체 transaction rollback on any step failure.
- daemon `listen` 이전에 실행, 실패 시 daemon 부팅 abort.
- 사용자 backup은 외부 책임 (`~/.aiox/aiox.db` 복사). 자동 rollback path 없음.

## D5 — `getPairStatus` 규칙 (LOCKED)

- 현재: `attachedKinds.has("codex") && attachedKinds.has("claude")` → `ready`.
- 변경: `attachments.length === 2 && set(slots) === {"a", "b"}` → `ready`.
- `pending` / `stale`은 변경 없음.

## D6 — Dispatch generic화 (behavioral 본체, LOCKED)

slot a ↔ slot b auto-route는 Step 7 D4 bidirectional silent idempotent 패턴 재사용. **그러나 진짜 behavioral 본체는 dispatch generic화** (Codex 정정 명시).

### Acceptance criteria (Behavioral 본체)

> "Daemon dispatch는 route의 target `agent.kind`를 보고 adapter를 선택한다. `dispatchClaudeReplyToCodexChannels` / `dispatchCodexMessageToClaudeChannels`처럼 vendor-pair에 hardcode된 경로는 제거되고, 단일 `dispatchToPairPeer(sourceAgentId)`가 target agent.kind를 기반으로 codex/claude adapter inject를 호출한다."

### 영향 위치

- `src/daemon/state.ts:957` `receiveClaude...` → kind-필터 제거, generic dispatch 호출.
- `src/daemon/state.ts:1075`, `1110` `receiveCodex...` → 동일.
- `src/daemon/state.ts:1224`, `1406` dispatch 내부 `targetAgent.kind !== "codex"|"claude"` 필터 제거.
- 새 dispatch: route를 따라가서 각 target에 대해 `adapter[targetAgent.kind].inject(...)` 호출.

## D7 — Self-loop guard (LOCKED)

이중 방어 — core + store.

### core

```ts
// src/core/pairs.ts attachAgentToPair
if (attachments.some(a => a.pairId === request.pairId && a.agentId === request.agentId)) {
  return { ok: false, reason: "agent_already_attached", existing: ... };
}
```
slot occupancy 체크 *이전*에 self-loop 체크.

### store

`src/store/repositories/pairs.ts` `attachAgent`: 동일 invariant를 SQL preflight로 검사.

```sql
SELECT id FROM agents
WHERE pair_id = :pairId AND id = :agentId
LIMIT 1;
```

발견되면 `{ ok: false, reason: "agent_already_attached" }` 반환.

### daemon

typed passthrough + transaction rollback만. 새 invariant 검사 daemon 레벨에 추가 안 함.

## D8 — Source notification (LOCKED)

push surface 없이 기존 send response 확장 (Codex 정정 수용 — nested dispatch result).

### Response shape

```ts
// sendMessage response (Codex MCP aiox_send_message tool / Claude /send HTTP)
{
  ok: true,                     // message accepted / stored
  messageId: "...",
  dispatch: {
    delivered: number,          // kind: "success" count
    deferred: Array<{
      targetAgentId: string,
      reason: AdapterInjectDeferredReason,
      eligibility?: string,
    }>,
    failed: Array<{
      targetAgentId: string,
      reason: AdapterInjectFailureReason,
    }>,
  }
}
```

- `ok: true`는 **message가 aiox에 저장됐다**는 의미 (delivery row 생성 포함).
- `dispatch.delivered` / `dispatch.deferred` / `dispatch.failed`로 target별 결과 분리.
- 자동 push notification (deferred 해소 시 source에게 알림) **없음** — Post-MVP.

## D9 — Phase A authority scope (LOCKED)

### Phase A 권위 내
- D1 ~ D8 결정 자체.
- Phase B 구현 시 본 문서가 reject 기준.

### Phase A 권위 밖 (deferred to Post-MVP)
- Deferred 자동 retry (eligibility 충족 시 자동 재주입).
- Source agent push notification (deferred 해소 시 비동기 알림).
- 3-way pair / dynamic slot (별도 product decision).
- QA-002 closeout (R2 트래커 작업).

### 본 step 안에서 별도 phase로 분리되는 항목
- Phase B는 `.ai/tdd.md` Tidy First 4-commit 분할 (`history/45` §7):
  1. Red tests
  2. Structural (schema + DTO slot 도입, 가시 기능 0)
  3. Behavioral (dispatch generic화 + same-vendor ready + fallback disable + deferred wiring)
  4. Defensive/UX (self-loop reject + source notification + migration tests + AIOX_CLAUDE_CHANNEL_PORT 가드)
- Commit 1+2+3 단일 PR 머지 (half-state 방지). Commit 4 별도 PR.

---

## Phase B 진입 전 체크리스트 (참조용)

- [ ] `plan/mvp-implementation-checklist.md` Step 15 섹션에 본 Phase A lock 결과 반영.
- [ ] Phase B Round 1 (Red tests) 위임 prompt 작성 — Codex 또는 Claude.
- [ ] R2 라운드는 본 Phase B 진입 전 close (QA workflow 6단계).

## Cross-validation 기록

- Claude 1차안: D1 same-vendor only fallback disable / D2 부분집합 union / D3 단일 거절 reason / D4 preflight 없음 / D6 acceptance criteria 약함 / D8 flat response.
- Codex cross-validation 6 corrections (수용):
  1. D1 retry trigger → eligibility condition (자동 retry 함의 제거)
  2. D2 deferred reason 별도 union (semantic drift 방지) + adapter_not_found normalized mapping
  3. D3 pair_slot_occupied / pair_full 분리
  4. D4 migration preflight + duplicate_pair_slot_after_backfill detail
  5. D6 dispatch generic화를 behavioral 본체로 명시
  6. D8 nested dispatch result + ok:true 의미 분리
- 사용자 final lock: 4 principles + 본 history record.

## Related

- Step 15 design 권위: `history/45-step-15-pair-slot-generalization-design.history.md`
- PRD amendment: `prd/mvp/aiox-mvp-spec.md` §Pair
- QA finding: `plan/qa-tracker.md` QA-002
- Memory 빠른 인덱스: [[aiox-step-15-decisions]]
- Cross-validation 워크플로우: [[aiox-collaboration-workflow]]
- Authority map: [[aiox-authority-map]]
