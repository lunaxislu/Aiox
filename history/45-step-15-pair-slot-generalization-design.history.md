# Step 15 — Pair Slot Generalization (Design)

## Status

- Date: 2026-05-27
- Step: 15 (post-MVP, post-QA scope)
- Authoring: Claude opus (1차안) + Codex (cross-validation 2회) + 사용자 framing 정정
- Code change: 0줄. 본 문서는 *권위 결정 기록*이고, 실제 구현은 별도 commits (`plan/`에서 추적)에서 진행한다.
- Authority scope:
  - 본 문서: Step 15 결정 권위.
  - `prd/mvp/aiox-mvp-spec.md` §Pair: amendment marker 추가 (1:1 shortcut 표현은 본 step에서 supersede).
  - `plan/mvp-implementation-checklist.md`: Step 15 진입 시 실행 트래킹 항목 추가 예정.

## Trigger

QA round (R2 이후) 도중 사용자가 codex↔codex pair attach를 시도해 `pair_kind_slot_occupied`로 거절됨. 정책상 의도된 거절이었으나, 사용자가 "MVP가 claude↔codex만 지원하는 건 일반화 부족"이라 판단. vendor 종류와 무관한 일반 routing 모델로 격상해야 진짜 확장성이 있다는 의도.

## Why this needs an authority record before implementation

본 변경은 단순 schema column 추가가 아니라 두 plane의 동시 변경이며, 둘 중 하나만 하면 사용자 시나리오가 성립하지 않는다 (아래 §1). 또한 [[aiox-prevalidation-status]]에서 검증한 multi-session 외의 새 위험(wrong-thread inject, deferred semantics)이 동반된다. 따라서 권위 기록 → red tests → structural/behavioral/defensive 분할의 `.ai/tdd.md:24` 흐름이 필요하다.

---

## 1. Routing / Injection dispatch 영향 (1차안 정정)

**1차안 평가**: "core route가 vendor-neutral이라 routing 영향 최소, slot 변경이 본체."

**정정 (Codex cross-validation)**: 틀렸다. 두 축이 동위(co-equal)이며 한 축만으로는 same-vendor pair가 성립하지 않는다.

- Core route는 이미 `sourceAgentId -> targetAgentId`라 vendor-neutral (`src/core/routes.ts`).
- 그러나 daemon injection dispatch에는 vendor-pair 가정이 남아 있다:
  - `state.ts`의 `receiveClaude...` 경로는 `dispatchClaudeReplyToCodexChannels`만 호출 (`src/daemon/state.ts:957`).
  - `receiveCodex...` 경로는 `dispatchCodexMessageToClaudeChannels`만 호출 (`src/daemon/state.ts:1075`, `1110`).
  - 두 dispatch 함수 내부도 `targetAgent.kind !== "codex" | "claude"` 필터로 same-vendor delivery를 skip할 수 있다 (`src/daemon/state.ts:1224`, `1406`).

**결론**: Step 15는 두 축의 동시 변경이며, 어느 하나만으로도 사용자 시나리오 미성립.

| 축 | 단독 시 결과 |
|---|---|
| A. Pair capacity (kind slot → slot a/b) | attach는 통과, delivery skip (same-vendor에 inject 0) |
| B. Dispatch generic화 (target agent.kind로 adapter 선택) | inject 로직 vendor 무관, attach 자체가 `pair_kind_slot_occupied`로 거절 |

→ PR 머지 시점에는 commit 2(A) + commit 3(B)을 묶어야 사용자 관점 half-state가 노출되지 않는다.

---

## 2. Wrong-thread inject 위험 (Codex 새로 발굴)

Codex target injection은 `runtime.activeThreadId`가 없으면 `loadedThreadIds.at(-1)` fallback을 사용한다 (`src/daemon/state.ts:1519`).

- mixed pair (claude↔codex)에서는 활성 codex가 1개라 fallback이 사실상 안전.
- **same-vendor pair (codex↔codex)에서는** target Codex의 확정 active thread 없이 "마지막 loaded thread"에 inject되어 wrong-thread injection이 발생할 수 있다.

**결론**: same-vendor pair에서는 fallback을 disable하고, `runtime.activeThreadId` 또는 proxy-observed authoritative binding이 없으면 delivery를 throw가 아니라 *queued/deferred*로 유지해야 한다 (§3).

---

## 3. Queued / Deferred semantics (Step 15 핵심 신규)

active thread 없음을 throw error로 처리하면 안 된다. message/delivery 생성 자체는 성공이고, target injection만 아직 확정되지 않은 상태이므로 **typed partial-success**가 맞다.

### 모델

- `sendMessage`: `{ ok: true }`
- delivery status: `queued` 유지 (`failed`로 떨어뜨리지 않음)
- dispatch result: `deferred`
- normalized reasons (vendor-agnostic):
  - `target_binding_unconfirmed` — target adapter는 등록됐으나 active session/thread 부재
  - `target_runtime_unavailable` — target adapter runtime 자체 부재 (process/socket down)
  - `target_adapter_not_registered` — target agent가 daemon 인지된 적 없음
- source agent에게 "메시지는 저장됐지만 target에 아직 주입되지 않았다"는 알림을 surface

### Vendor-agnostic 적용

- Codex no active thread → `target_binding_unconfirmed`
- Claude channel unavailable → `target_runtime_unavailable`
- future vendor (session/socket/inbox missing) → 같은 deferred reason 체계 재사용
- adapter-specific raw reason은 event/debug에 남기고, user/agent-facing response는 normalized reason만 반환

### Adapter별 retry 조건은 다르다

partial-success는 vendor-neutral 개념이지만, deferred 원인과 재시도 트리거는
adapter-specific 이다.

- Codex: target runtime은 있어도 active thread / proxy-observed binding 이 확정되지
  않으면 `target_binding_unconfirmed`. 이후 target Codex가 `thread/start|resume|fork`
  binding 을 만들거나 명시 retry/read 경로가 생기면 재시도 가능.
- Claude: target agent row 와 route delivery 는 있어도 target Claude channel server 가
  아직 등록되지 않았거나 종료됐으면 `target_runtime_unavailable`. 이후 해당 Claude
  process 가 channel 을 재등록하면 재시도 가능.

따라서 Claude↔Claude도 partial-success가 가능하다. Codex↔Codex와 구조는 다르지만,
외부 의미는 동일하다: message/delivery는 aiox에 저장됐고, target adapter가 현재
주입 가능한 상태가 아니라 delivery가 `queued/deferred`로 남는다.

`failed`와 `deferred`는 분리한다:

- `failed`: target에 보낼 수 있는 상태였지만 adapter request가 실패했거나 명확한
  terminal error.
- `deferred`: target이 지금은 inject 가능한 상태가 아니지만 나중에 가능해질 수 있는
  non-terminal 상태.

### Acceptance criterion

> "same-vendor delivery가 skip되지 않고, target binding이 없으면 normalized deferred result가 source agent에게 보인다."

---

## 4. Claude channel port (위험 평가)

- `startClaudeChannelHttpIngress`는 `AIOX_CLAUDE_CHANNEL_PORT` 없으면 port 0로 listen해 OS-assigned port 사용 (`src/adapters/claude/channel-server.ts:504`).
- 충돌 위험은 사용자가 `AIOX_CLAUDE_CHANNEL_PORT`를 고정해서 여러 Claude 인스턴스를 띄울 때만 발생.
- 결론: 기본 경로는 Codex app-server처럼 자동 할당이므로 OK. 고정 env 사용 시 경고/문서화 또는 agent별 override만 검토하면 됨 — Step 15 *blocker 아님*, 후속 UX 개선 항목.

---

## 5. Self-loop guard (이중 방어 확정)

self-loop는 same-name 중복 실행과 다른 문제다:

- same-name duplicate = `agent_name_already_connected` / reconnect 정책 문제.
- self-loop = 같은 `agentId`가 pair의 slot a와 slot b를 모두 점유하는 *topology* 문제. auto-route가 `agent-1 → agent-1`을 만들어 무한 echo 발생.

**가드 위치 (Codex 권고 수용)**: core + store 이중 방어.

- `src/core/pairs.ts` `attachAgentToPair`: domain invariant 표현 + unit test 기준점.
- `src/store/repositories/pairs.ts` `attachAgent`: daemon 재시작/동시 attach/미래 API 우회를 막는 마지막 경계.
- `src/daemon/state.ts`: typed error passthrough + transaction rollback 담당. 새 invariant 검사를 daemon에 두지 않는다.

신규 reason: `agent_already_attached`.

---

## 6. Migration (1차안 정정)

**1차안 가정**: "기존 `(pair_id, kind)` UNIQUE 제약을 `(pair_id, slot)`로 교체."

**정정 (Codex)**: 그런 UNIQUE constraint는 존재하지 않는다. schema는 `agents.pair_id`만 있고 (`src/store/schema.ts:5`), occupied check는 repository SQL 조회만 (`src/store/repositories/pairs.ts:95`).

**정확한 migration 절차**:

1. `agents.pair_slot` 컬럼 추가 (nullable로 시작 → backfill 후 NOT NULL)
2. 기존 row backfill: `kind = "codex"` → `pair_slot = "a"`, `kind = "claude"` → `pair_slot = "b"`
3. `unique(pair_id, pair_slot)` index 추가
4. `applySchema`는 현재 `create table if not exists`만 (`src/store/schema.ts:3`)이라 versioned migration 또는 단일 transaction migration으로 격상.
5. daemon API listen *이전*에 마이그레이션 완료 — 그렇지 않으면 재시작 중 half-state 노출.

영향 테스트:
- `tests/unit/core/pairs.test.ts`
- `tests/unit/store/repositories/pairs.test.ts`
- `tests/unit/daemon/pair-store.test.ts`

---

## 7. 단계 분할 (.ai/tdd.md Tidy First)

3 commit/PR 분할.

### Commit 1 (Red tests)
- core/pairs: codex↔codex attach → ready
- core/pairs: claude↔claude attach → ready
- core/pairs: same agentId 두 slot → `agent_already_attached`
- store/pairs: 위 3개 동일 (이중 방어 검증)
- daemon: same-vendor pair에서 sender→receiver inject가 실제 수신 (E2E)
- daemon: target binding 없을 때 `deferred` + normalized reason 반환

### Commit 2 (Structural — 기능 변경 없음)
- schema: `agents.pair_slot` 컬럼 추가 + backfill + unique index
- `applySchema`를 versioned migration으로 격상
- core/store/daemon DTO에 `slot` 도입
- 기존 mixed pair 동작 보존 (green 유지)
- **이 commit 종료 시점 사용자 가시 기능 = 0** (의도된 상태)

### Commit 3 (Behavioral — 사용자 가시 동작 켜짐)
- `dispatchClaudeReplyToCodexChannels` / `dispatchCodexMessageToClaudeChannels` → `dispatchToPairPeer(sourceAgentId)` 단일 함수로 통합
- receive 진입 함수도 generic화
- `getPairStatus`: slot 2개 모두 채워지면 `ready`
- same-vendor pair ready + bidirectional route + generic dispatch
- Codex `loadedThreadIds.at(-1)` fallback을 pair-aware로 (same-vendor에서 wrong-thread 방지)
- deferred result wiring: `target_binding_unconfirmed` / `target_runtime_unavailable` / `target_adapter_not_registered`

### Commit 4 (Defensive / UX)
- core + store self-loop reject (이중 방어)
- source agent에 deferred 알림 surface
- migration / restart half-state 테스트
- `AIOX_CLAUDE_CHANNEL_PORT` 고정 충돌 가드 (auto-port fallback 명시 또는 경고)

**머지 단위**: commit 1+2+3을 단일 PR로 묶어 머지 (사용자 가시 half-state 방지). commit 4는 별도 PR 가능.

---

## 8. Post-MVP scope

- 본 step은 **2-slot pair로 고정**.
- slot 이름은 `"a" | "b"`로 두되 *필드명은 `slot`* 으로 잡아 향후 N-slot 확장 여지만 남긴다 (`pair_slot` column, `slot` field).
- 3-way pair / dynamic slot은 group topology / product semantics 변경이라 Step 15에 넣지 않음. 별도 product decision.
- `prd/mvp/aiox-mvp-spec.md` §Pair의 "1:1 shortcut" 표현은 본 step에서 **same-vendor 허용으로 supersede**되지만, slot 수가 2개로 고정이라는 부분은 유지.

---

## 9. Open follow-up (Step 15 진입 시점에 확정해야 할 것)

1. **Codex `loadedThreadIds` fallback 정책 (사용자 결정 대기)**:
   - 옵션 a: same-vendor pair에서 fallback disable, `activeThreadId` 없으면 deferred.
   - 옵션 b: Codex agent에 명시적 `currentThreadId` 필드 강제.
   - 옵션 c: pair slot 기반으로 라우팅 (slot a → slot b의 currently-bound thread).
   - 본 history는 결정을 박지 않고, Step 15 Phase A 진입 시 사용자 + Codex 합의로 lock.

2. **본 Step의 QA 라운드와의 배치**:
   - 현재 QA round 진행 중 ([[aiox-qa-workflow]]).
   - 권장: 현재 라운드 종료 후 Step 15 진입. 라운드 mid에 schema 변경은 트래커 drift 위험.
   - Step 15 진입 시 `plan/mvp-implementation-checklist.md`에 실행 checklist를 추가한다.
   - QA tracker에는 "same-vendor pair는 *expected* rejection (Step 15에서 lift 예정)"으로 기록.

3. **normalize reason union 정확한 이름**:
   - 현재 `target_binding_unconfirmed` / `target_runtime_unavailable` / `target_adapter_not_registered` 3종 권고.
   - Phase A에서 final lock 필요. 기존 `AdapterInjectFailureReason` (`src/adapters/contract.ts`) union과 정합 + deferred는 *failure가 아닌* partial-success라 별도 type일 가능성.

---

## 10. 본 결정의 cross-validation 기록

- Claude opus 1차안 → Codex cross-validation 1차 (정합성/위험/마이그레이션/단계분할/scope 6항 답변).
- Codex의 1차안 정정 2건: "routing 영향 최소" 오류, "constraint 교체" 오류 → 본 history에 정정 반영.
- 사용자 framing 정정 1건: "본체 vs prelude" 위계 폐기 → 두 축 동위(co-equal) 채택.
- 본 history는 위 3-party 합의의 final form.

---

## 11. Authority statements (한 줄 요약)

- Step 15는 *pair capacity 모델 변경*과 *injection dispatch generic화*의 동시 변경이다.
- target binding 미확정 시 delivery는 `failed`가 아니라 `deferred` + normalized reason이다.
- self-loop는 core + store 이중 방어로 차단한다.
- 2-slot 고정. 3-way pair는 본 step 범위 밖.
- 현재 QA round 종료 후 진입한다.

## Related

- 1차 모델 결정: `prd/mvp/aiox-mvp-spec.md` §Pair (본 step에서 supersede).
- 기존 학습 기록: `docs/aiox/pair-attach-kind-mismatch.md` (kind slot 모델의 학습 기록 — 본 step에서 무력화되지는 않지만 모델은 갱신됨).
- Codex thread binding 권위: `history/41-codex-loaded-thread-binding-analysis.history.md` (loadedThreadIds fallback 분석).
- Plane 분리: [[aiox-plane-architecture]].
- Pre-validation context: [[aiox-prevalidation-status]] (multi-session PASS는 단독 multi-session 기준이지 same-vendor pair 토폴로지를 포함하지 않음).
