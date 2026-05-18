# Step 5 Route/Connect Fan-out Tests (Daemon Level)

> 작성일: 2026-05-19
> 작성자: Claude (Opus 4.7) — codex 위임 cross-validation 라운드 2회
> 관련 기록:
> - `history/18-step-4-cli-parsing.history.md` (Step 4 마감 + Step 5 진입 조건)
> - `plan/mvp-implementation-checklist.md` Step 5 (line 489–504)
> - `prd/mvp/aiox-mvp-spec.md` (delivery 5-state, idempotency 결정 근거)

---

## 배경

Step 4 (CLI command parsing) 마감 후 Step 5 — "route/connect fan-out tests at
daemon level" — 에 진입함. Step 1에서 core unit으로 cover된 fan-out 로직과
Step 3에서 DTO 경계 기준으로 cover된 daemon API를, **daemon API + SQLite store
결합 레벨**에서 재검증하는 것이 목표. parse → invocation → daemon → store
4 layer 중 invocation 직전까지 store 영속 invariant를 확인하는 단계.

본 문서는 다음 세션의 agent가 한 화면에서 Step 5의 검증 가설, 새로 추가된
`sendMessage` API 디자인, 그리고 보류 우려를 잡을 수 있도록 기록한다.

---

## 진행 방식

Step 3·4와 동일한 codex 위임 라운드. Step 5는 sub-item 4개를 Round 2회로 묶음:

### Round 1 — connect/disconnect store-level 검증

| commit | 내용 |
|---|---|
| `69f7035` | `test: verify daemon connect persists directed routes at store level` |
| `4f9daa5` | `test: verify daemon disconnect preserves message history` |

기존 daemon/store 구현이 이미 invariant를 충족하고 있어 코드 변경 없이 green.
새 가설은 DTO 너머 SQLite `routes` row의 internal field (`created_at`,
`updated_at`, `status`) 직접 검증, directed-only 확인, missing target 시 routes
테이블 전체 empty (all-or-nothing), disconnect 후 `messages` /
`message_deliveries` / `events` row 보존.

### Round 2 — message fan-out + idempotency

| commit | 내용 |
|---|---|
| `50e4f1d` | `behavior: add daemon message fan-out persistence` |
| `8221370` | `test: verify daemon message delivery idempotency at store level` |

`sendMessage` daemon API/state가 Step 5에서 처음 추가됨 (Step 3은 lifecycle/
routing만 cover). fan-out 시 message 1 + active directed route 수만큼 queued
delivery + `message_created` event 1 + `delivery_queued` event N을 단일
transaction에 영속. idempotency는 preflight에서 `(messageId, targetAgentId)`
idempotency key 충돌을 typed reason으로 거부.

테스트는 Step 5 진입 시점 132 → 138로 증가. typecheck 통과.

---

## 결정 사항

### 1. 검증 가설을 Step 3과 분리 (Round 1)

**결정**: Step 5 테스트는 DTO 응답이 아니라 raw SQLite row를 `SELECT` 로 직접
검증한다. `created_at` / `updated_at` / `status` / `route_id` /
`target_agent_id` / `idempotency_key` 등 internal field까지 어서트.

**근거**: Step 3 `tests/unit/daemon/api.test.ts`는 daemon API 경계 (DTO 입출력)
를 cover. Step 5 가설은 **"DTO를 통과한 결과가 정말로 store에 정확한 모양으로
영속되는가"** 이므로 동일한 fixture를 재사용하면 검증 가치 중복. row-level
SELECT는 mapper layer 회귀를 잡는 데도 효과적.

### 2. 새 테스트 파일 분리 정책 (Round 1, Round 2)

**결정**: `tests/unit/daemon/api.test.ts` 확장 대신 sub-item 단위 새 파일
4개 추가: `connect-store.test.ts`, `disconnect-store.test.ts`,
`message-fanout-store.test.ts`, `message-idempotency-store.test.ts`.

**근거**: 파일이 길어지면 검증 가설이 섞여 회귀 시 어느 가설이 깨졌는지 파악
비용 ↑. 파일명 자체가 가설을 노출하므로 다음 step에서 invariant를 인용할 때
파일 단위로 참조 가능.

### 3. `sendMessage` daemon API 도입 (Round 2, `50e4f1d`)

**결정**: `DaemonApi.sendMessage(request: SendMessageRequest) => SendMessageResponse`
를 Step 5에서 처음 추가. `attachAgent` / `connect` / `disconnect`와 동일한
DTO mapping 패턴 (`mapMessage`, `mapDelivery`).

**근거**: Step 3에서는 lifecycle/routing만 cover했고 message flow는 다음 step
으로 보류했음. Step 5의 sub-item "message fan-out → message + N deliveries
store 영속화"는 daemon API에 진입점이 있어야 검증 가능. invocation/CLI layer는
다음 step이므로 daemon API 레벨까지만 추가.

### 4. idempotency key 형식 `${messageId}:${targetAgentId}` (Round 2)

**결정**: delivery `idempotency_key` 컬럼에 `messageId:targetAgentId` 합성 키
를 저장. preflight에서도 같은 키로 조회.

**근거**: spec line상 idempotency 단위는 `(message_id, target_agent_id)` 쌍.
delivery row 단위 unique constraint를 위해 두 필드를 합성한 단일 컬럼으로
저장하는 것이 SQLite UNIQUE index와 자연스럽게 맞물림. 별도 composite index
대안도 가능하지만 합성 키가 lookup 코드 단순.

### 5. idempotency preflight를 `withTransaction` **바깥**에 배치 (Round 2)

**결정**: `sendMessage`는 source agent 조회 → source routes 조회 →
idempotency lookup까지 transaction 바깥에서 수행하고, 충돌이 없을 때만
`withTransaction`으로 message + deliveries + events를 단일 commit 한다.

**근거**: 빠른 reject path가 transaction overhead를 피한다. MVP는 single-process
daemon이라 동시성 race가 사실상 발생하지 않음. 충돌 발견 시 즉시 typed
`delivery_idempotency_key_exists` 응답을 반환하여 partial row를 만들지 않음.
(보류 항목은 "Open Concerns" 절 참고.)

### 6. idempotency 충돌 시 all-or-nothing 보존 (Round 2)

**결정**: 충돌이 한 target이라도 있으면 message / deliveries / events 어떤
row도 추가하지 않는다. 응답의 `existing` 필드는 **첫 번째 매칭** delivery만
반환.

**근거**: spec상 idempotency는 "이미 보낸 메시지인가"의 의미적 게이트라 부분
재전송 (다른 target에만 새 delivery 추가) 시멘틱은 모호하고 caller 측에서
혼란. 첫 매칭만 반환하는 것은 caller가 "이미 존재" 신호만 확인하면 충분하다는
가정. multi-target 충돌 시 모든 매칭을 반환할지는 future spec 결정.

### 7. fan-out 시 event 2종 명시 append (Round 2, `50e4f1d`)

**결정**: `sendMessage` transaction 안에서 `message_created` event 1개 +
delivery당 `delivery_queued` event 1개를 명시적으로 append. `data` 필드는
`{}` (empty JSON object).

**근거**: store 영속 invariant의 일부로 event audit trail이 포함되어야 한다.
`data` 빈 객체는 schema가 NOT NULL이므로 충족용이며, 이후 step에서 의미 있는
payload (예: delivery target명) 가 필요해지면 spec 결정 후 추가.

### 8. "Previous Round Minor Follow-ups" 패턴 미적용 (Round 2)

**결정**: Step 4에서 정착한 Round 직전 minor cleanup 패턴은 Step 5에서는
적용하지 않음. Round 1이 test-only로 마감되어 cleanup 항목이 없었기 때문.

**근거**: 패턴은 minor가 쌓일 때만 비용 회수. test-only round에서는 강제
적용 시 마찰만 발생. Step 6+에서 behavior change가 누적되면 다시 활성화.

---

## Open Concerns / Deferred

Step 5 자체는 4 sub-item 모두 green이지만, Round 2 검토 중 다음 두 항목이
spec 결정 또는 후속 step에서 다뤄져야 함.

### O1. idempotency preflight transaction 경계

`sendMessage`의 idempotency lookup이 `withTransaction` 바깥에서 수행되어,
동시 호출 시 두 호출 모두 preflight 통과 후 transaction에 진입하면 두 번째는
`messages.id` 또는 `message_deliveries` UNIQUE constraint exception으로 fail
한다. 결과적으로 typed `delivery_idempotency_key_exists` 응답이 아닌 raw
SQLite 예외가 caller로 전파.

- **현 단계 영향**: MVP single-process daemon 환경에서는 실질 race 미발생.
- **후속 조치 시점**: real socket transport (Step 3 보류) 또는 multi-client
  접속 단계에서 재검토. 옵션 — (a) `BEGIN IMMEDIATE` + lookup을 transaction
  안으로 이동, (b) UNIQUE 위반 예외를 catch해 typed reason으로 변환,
  (c) advisory lock.

### O2. `sourceRoutes`가 empty일 때 `sendMessage` 동작

source agent가 connected route 0개인 상태로 `sendMessage` 호출 시 현재 동작:
`ok: true` + `deliveries: []` + `message_created` event만 append, delivery /
`delivery_queued` event 0개. 즉 "메시지는 영속되지만 fan-out 되지 않음" 시멘틱.

- **현 단계 영향**: 테스트 커버리지에 없고 spec에 명시되지 않음.
- **후속 조치 시점**: invocation layer 또는 Step 7 (fake adapter integration)
  진입 시 결정. 옵션 — (a) 현 동작 유지 (message만 audit trail로 남김),
  (b) `ok: false, reason: "no_active_routes"` 로 reject, (c) caller가 명시
  flag (`allowOrphanMessage`)를 줄 때만 허용.

두 항목 모두 MVP 진행 자체를 막지 않는 forward-looking concern. 후속 step
진입 시 이 history 파일을 참조.

---

## 다음 step 후보

Step 4의 보류 항목 + Step 5 결과로 다음 진입 후보는 변동 없음:

- **invocation layer + CLI bin entrypoint 독립 step**: parse → daemon API
  dispatch + `package.json#bin` + `src/cli/bin.ts`. `sendMessage`를 CLI surface
  의 어떤 명령으로 매핑할지는 spec 미정 (현 13 명령에 `send` 류 없음).
- **Step 6 (pair reservation tests at daemon level)**: pair 도메인을 store
  결합 레벨에서 재검증. Step 5와 같은 가설 (row-level invariant).
- **real socket transport** (Step 3 보류): daemon socket + CLI client. O1
  결정 시점과 자연스럽게 묶일 가능성.

---

## 산출물 요약

- 새 테스트 파일 4개 (`tests/unit/daemon/connect-store.test.ts`,
  `disconnect-store.test.ts`, `message-fanout-store.test.ts`,
  `message-idempotency-store.test.ts`). store row 직접 SELECT 패턴 확립.
- `DaemonApi.sendMessage` + `MessageDto` / `DeliveryDto` + `mapMessage` /
  `mapDelivery` mapper 추가.
- `DeliveryRepository.findByIdempotencyKey` 추가 (preflight lookup용).
- 138 tests passing, typecheck 통과.
- Step 5 헤더 `✅ 완료`.
- Open Concerns 2건 (O1 idempotency transaction 경계, O2 empty sourceRoutes
  동작) 본 문서에 기록.
