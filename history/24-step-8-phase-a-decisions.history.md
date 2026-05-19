# Step 8 Phase A — Fake Adapter Integration Decisions

> 작성일: 2026-05-19
> 작성자: Claude/Codex cross-validation handoff + Codex implementation plan
> 관련 기록:
> - `prd/mvp/aiox-mvp-spec.md` (MVP spec, fake adapter integration tests)
> - `history/15-mvp-design-decisions.history.md` (MVP adapter/product decisions)
> - `history/19-step-5-route-fanout-tests.history.md` Open Concern O1/O2
> - `history/22-step-7-phase-a-decisions.history.md`
> - `history/23-step-7-phase-b-pair-daemon.history.md`
> - `plan/mvp-implementation-checklist.md` Step 8

---

## 배경

Step 7 은 pair daemon/store invariant 만 권위 범위로 닫았다. `sendMessage`
sentinel 회귀 정정, idempotency preflight transaction 경계(O1), send CLI surface
(OA1)는 Step 7 밖으로 유지했다.

Step 8 진입 후보는 두 가지였다.

- Option A: fake adapter integration tests.
- Option B: real socket transport + O1 + `sendMessage` sentinel 정정.

결정은 Option A 선행이다. Step 8 은 실제 Codex/Claude 의존 없이 adapter-facing
contract 를 fake 로 닫는 단계다. Option B 는 중요하지만 fake/in-process 검증을
막는 선행조건이 아니므로 Step 9 시작 전까지 deferrable 로 유지한다.

본 문서의 권위 범위는 **Step 8 fake adapter integration only** 이다. real socket
transport, real Codex/Claude adapter, Codex thread UUID mapping, Claude trust 정책,
retry/timeout 정책은 본 step 에서 결정하지 않는다.

---

## 진행 방식

Step 6/7 과 동일하게 Phase A 에서 사용자 + Claude walkthrough 로 옵션을 닫고,
Codex 가 구현 전 cross-validation 회신을 제공했다. 사용자는 Codex 추천안을 그대로
채택했고, Phase B 는 Codex 가 TDD red/green 으로 구현한다.

Phase A 는 docs-only commit 으로 마감한다. Phase B 는 의사결정 단위로 commit 을
분리한다.

---

## 결정 사항

### D1. adapter contract boundary — thin adapter-facing interface

**결정**: production code 에 얇은 adapter-facing interface 를 둔다. fake Codex /
fake Claude adapter 는 이 contract 를 구현하고, Step 9/10 의 real adapter 도 같은
contract 를 구현하는 방향으로 갈아끼운다.

**근거**: daemon/store contract 와 real external transport 를 분리한 채 adapter
payload shape 를 먼저 고정할 수 있다. fake 가 테스트 전용 ad hoc callback 이 되면
Step 9/10 에서 contract 를 다시 결정해야 한다.

**Reversibility**: 중간. contract field 추가는 가능하지만 Step 8 테스트가 외부
adapter boundary 의 기준이 되므로 큰 shape 변경은 Step 9/10 테스트 갱신이 필요하다.

### D2. outgoing capture 의미 — source outgoing + target inject 별도 capture

**결정**: source adapter 의 outgoing capture 와 target adapter 의 inject capture 를
서로 다른 buffer 로 둔다.

**근거**: outgoing 발생, daemon routing, target inject 는 서로 다른 원인이다. 하나의
buffer 로 합치면 round-trip 실패 시 어느 단계가 깨졌는지 분리하기 어렵다.

**Reversibility**: 높음. fake 구현 내부 구조라 후속 test helper 로 정리 가능하다.

### D3. reply round-trip message identity — 새 message round-trip 만 검증

**결정**: Step 8 reply round-trip 은 새 `reply` message 가 반대 방향으로 fan-out 되는
것까지만 검증한다. `parent_message_id` correlation 은 Step 9 Codex thread UUID mapping
정책과 함께 다룬다.

**근거**: fake adapter integration 의 목적은 adapter contract 와 daemon fan-out 결합
검증이다. thread/session correlation 을 섞으면 Open Product Issue #2 를 우회 결정하게
된다.

**Reversibility**: 높음. Step 9 정책 결정 후 parent/correlation field 를 추가할 수
있다.

### D4. partial failure semantics — failed + typed error, other targets continue

**결정**: 한 target inject 가 실패하면 해당 delivery 는 즉시 `failed` 로 기록하고
typed error 를 aggregate result 에 남긴다. 다른 target 의 inject 는 계속 진행하며,
성공 target 은 `delivered`/`completed` 까지 진행한다.

**근거**: MVP delivery enum 은 `queued` / `delivering` / `delivered` / `completed` /
`failed` 를 이미 제공한다. best-effort fan-out 은 한 target 실패가 전체 message
delivery 를 막지 않아야 한다.

**Reversibility**: 중간. retry/timeout 정책이 생기면 failed 전환 시점은 바뀔 수 있다.
그 정책은 Open Product Issue #4 로 유지한다.

### D5. sendMessage O1 / sentinel 처리 범위 — Option B 유지

**결정**: Step 8 에서 O1 또는 `sendMessage` sentinel 정정을 해결하지 않는다. 우연히
관련 회귀가 재현되면 최소 regression test 후보만 분리하고, 본 해결은 real socket
transport 단계로 유지한다.

**근거**: O1 은 multi-client/real transport race 에 가까운 concern 이고 Step 8 은 fake
adapter contract 검증이다. 부분 정정으로 O1 을 일부만 해결한 것처럼 보이게 만들지
않는다.

**Deferrability**: Step 9 시작 전까지 안전하다. Step 9 real Codex adapter 부터 실제
transport/external ingress 가 들어오므로 그 전에는 Option B 를 닫아야 한다.

### D6. fake adapter placement — contract in `src`, fake in tests

**결정**: adapter contract type 은 production `src/adapters/contract.ts` 에 둔다. fake
adapter 구현은 `tests/fixtures` 또는 `tests/support` 에 둔다.

**근거**: contract 는 Step 9/10 에서 real adapter 가 구현할 production boundary 이고,
fake 구현은 테스트 전용이다. production surface 를 fake helper 로 오염시키지 않는다.

**Reversibility**: 높음. test helper 위치는 필요 시 이동 가능하다.

---

## Deferred / Next Phase

- Option B(real socket transport + O1 + `sendMessage` sentinel)는 Step 9 시작 전까지
  deferrable 로 유지한다.
- Open Product Issue #2(Codex thread UUID -> agent name mapping)는 Step 9 Phase A
  선행조건으로 이월한다.
- Open Product Issue #1(Claude channel trust/confirmation policy)은 Step 10 시작 전
  결정 필요 상태를 유지한다.
- doctor/status 는 Step 11 까지 deferrable 이다.
- `docs/aiox/` learning record 는 필수 산출물이 아니다. 사용자가 이해하기 어려운 새
  개념이나 critical issue 가 생기면 별도 작성한다.

---

## Phase B 구현 계획

1. thin adapter contract + fake Codex/Claude fixtures 를 TDD red 로 고정한다.
2. adapter router/service 가 source outgoing 을 daemon `sendMessage` 로 fan-out 하고,
   target adapter inject 를 호출한다.
3. delivery status persistence 를 추가해 inject 성공은 `delivered`/`completed`, 실패는
   `failed` 로 기록한다.
4. end-to-end reply round-trip 과 partial failure best-effort 를 새 test file 에서
   검증한다.

## Verification

Phase A 는 docs-only 변경이므로 test baseline 은 Step 7 baseline 을 유지한다.

- `pnpm test`: passing, 29 files, 152 tests (Step 7 마감, 2026-05-19)
- `pnpm typecheck`: passing
- `pnpm build`: passing

