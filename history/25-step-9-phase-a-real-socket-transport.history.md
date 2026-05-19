# Step 9 Phase A — Real Socket Transport Decisions

> 작성일: 2026-05-19
> 작성자: Codex
> 관련 기록:
> - `prd/mvp/aiox-mvp-spec.md` (Architecture Process Topology / Message Flow / Adapter Scope)
> - `history/15-mvp-design-decisions.history.md`
> - `history/19-step-5-route-fanout-tests.history.md` Open Concern O1/O2
> - `history/22-step-7-phase-a-decisions.history.md` D2/D9
> - `history/23-step-7-phase-b-pair-daemon.history.md`
> - `history/24-step-8-phase-a-decisions.history.md` D5
> - `plan/mvp-implementation-checklist.md` Step 9

---

## 배경

Step 8 은 fake adapter integration 으로 닫혔다. 다음 원래 후보는 Codex
app-server adapter skeleton 이었지만, real adapter 로 들어가기 전 다음 부채를
먼저 닫기로 2026-05-19 확정했다.

- real socket transport interface 도입.
- O1: `sendMessage` idempotency preflight transaction 경계 정정.
- `sendMessage` flow 의 rollback sentinel 회귀 정정.

이 묶음은 Step 10 Codex adapter / Step 11 Claude adapter 전에 external ingress 와
concurrent-ish failure surface 를 받아낼 안전선이다. Codex thread UUID mapping,
Claude channel trust 정책, doctor/status 출력은 본 step 밖이다.

본 문서의 권위 범위는 **Step 9 real socket transport + O1 + `sendMessage`
sentinel only** 이다.

---

## 진행 방식

Step 7/8 패턴처럼 Phase A 에서 옵션과 trade-off 를 먼저 닫는다. 다만 이번 분기는
대부분 단일 수렴한다. 사용자 confirm 반복 비용을 줄이기 위해 Phase A 추천안은
아래 "결정 사항"으로 바로 제시하고, 예상 외 surface 가 나오면 Phase B 중단 후
새 Open Concern 으로 되돌아온다.

Phase A 는 docs-only commit 으로 마감한다. Phase B 는 TDD red/green 으로 진행하고
의사결정 단위로 commit 을 분리한다.

---

## 결정 사항

### D1. transport protocol — Unix domain socket primary

**결정**: MVP real daemon transport 는 Unix domain socket 을 primary 로 둔다. TCP
loopback 은 tests 또는 future portability hook 으로 열어둘 수 있지만, Step 9 구현
surface 의 기준은 local-only UDS 다. Windows named pipe 는 MVP 범위 밖이다.

**대안**:

- TCP loopback: 구현/테스트가 가장 쉽고 cross-platform 이지만 port collision,
  firewall/localhost exposure, "local IPC" 의미가 약해진다.
- Unix domain socket: macOS/Linux local daemon 모델과 잘 맞고 filesystem path 로
  ownership/cleanup 을 표현할 수 있다. socket stale file cleanup 을 구현해야 한다.
- Named pipe: Windows 대응에는 필요하지만 현재 repo/runtime 우선순위가 아니다.

**추천 근거**: PRD 의 local daemon/socket mental model 과 가장 잘 맞는다. real
adapter 진입 전 "외부 네트워크 서버"가 아니라 "로컬 daemon IPC" 를 닫는 게 목적이다.

**Reversibility**: 중간. transport interface 를 `listen/connect/close` 경계로 두면
TCP 구현을 나중에 추가할 수 있다. 단 CLI/runtime default path 와 status 출력은 갱신
비용이 있다.

**Deferrability**: 낮음. Codex/Claude real adapter 전에 daemon ingress 형태가
고정돼야 adapter error/retry surface 를 안정적으로 붙일 수 있다.

### D2. message framing — NDJSON request/response envelopes

**결정**: socket framing 은 newline-delimited JSON(NDJSON) 을 사용한다. 각 line 은
하나의 envelope 이고, JSON payload 내부 newline 은 `JSON.stringify` escape 로
보존된다.

Envelope 초안:

```text
request:  { "id": "...", "method": "attachAgent", "params": {...} }
response: { "id": "...", "ok": true, "result": {...} }
error:    { "id": "...", "ok": false, "error": { "reason": "...", ... } }
```

**대안**:

- length-prefixed JSON: binary-safe 하고 큰 payload 에 강하지만 parser 상태가 더
  복잡하다.
- NDJSON: 구현/디버깅이 단순하고 CLI/local IPC 에 충분하다.
- MessagePack: payload 효율은 좋지만 MVP 에서 사람이 읽을 수 있는 wire trace 를
  잃고 의존성이 늘어난다.

**추천 근거**: 현재 API payload 는 JSON DTO 이고, 테스트에서 line 단위 request/
response contract 를 고정하기 쉽다.

**Reversibility**: 중간. envelope boundary 를 모듈화하면 length-prefix 로 바꿀 수
있지만 contract tests 와 debugging helper 는 갱신해야 한다.

**Deferrability**: 낮음. transport contract tests 의 핵심이다.

### D3. client identity / multi-client semantics — stateless control clients

**결정**: Step 9 socket client 는 authenticated session identity 를 갖지 않는다.
각 request 는 독립 control-plane 호출이며, agent identity 는 기존 daemon API payload
(`sourceName`, `name`, `kind`) 에서 온다. 한 connection 에 여러 sequential request 를
허용하고, response 는 request `id` 로 correlation 한다.

**대안**:

- connection-bound client identity: attach lifecycle 과 잘 맞을 수 있지만 Codex/
  Claude adapter 정책과 섞인다.
- stateless request identity: 현재 daemon API 와 fake client 패턴을 그대로 socket
  위에 얹을 수 있다.

**추천 근거**: 이번 step 은 real socket transport safety line 이지 agent session
policy step 이 아니다. identity 정책을 transport 에 묶으면 Step 10/11 adapter
결정과 충돌한다.

**Reversibility**: 높음. later handshake/auth envelope 을 추가할 수 있다.

**Deferrability**: 높음. real adapter identity/correlation 은 Codex UUID mapping,
Claude channel trust 정책에서 다룬다.

### D4. O1 correction — transaction preflight + UNIQUE catch reclassify

**결정**: 둘 다 한다.

1. source/routes/idempotency preflight 를 `sendMessage` transaction 안으로 이동한다.
2. `messages.id` 또는 `message_deliveries.idempotency_key` UNIQUE violation 은
   typed `delivery_idempotency_key_exists` response 로 reclassify 한다.

**대안**:

- preflight 이동만: race window 를 줄이지만 SQLite constraint exception surface 는
  남는다.
- UNIQUE catch 만: typed response 는 보장하지만 transaction 내부 partial rollback
  sentinel 정정과 함께 보지 않으면 테스트가 흐려진다.
- 둘 다: 정상 path 는 명시 preflight, race fallback 은 DB constraint 로 닫는다.

**추천 근거**: O1 의 핵심은 "동시 path 에서 raw SQLite 예외가 caller 로 새는 것"과
"partial write 없이 typed response 로 닫는 것"이다. 둘 중 하나만 하면 concern 을
반만 닫는다.

**Reversibility**: 낮음. 한번 닫으면 daemon API contract 의 안정성 기반이 된다.

**Deferrability**: 낮음. real socket multi-client 진입 전에 닫아야 한다.

### D5. `sendMessage` rollback sentinel — sendMessage flow only

**결정**: Step 7 의 module-local Symbol sentinel 패턴을 `sendMessage` flow 에 적용한다.
범위는 `sendMessage` 로 제한한다. 모든 `withTransaction` 호출을 광범위하게 바꾸지
않는다.

**대안**:

- `sendMessage` only: 현재 확인된 rollback gotcha 를 좁게 해결한다.
- 모든 `withTransaction` 호출 audit/refactor: 장기 일관성은 좋지만 Step 9 의
  behavior surface 를 불필요하게 넓힌다.

**추천 근거**: `sendMessage` 는 message row, delivery rows, event rows 를 한
transaction 에 쓰는 유일한 문제 flow 다. `deliveries.createQueuedForRoutes` 의
`{ ok:false }` return 이 그대로 commit 될 수 있는 회귀를 sentinel throw 로 닫는다.

**Reversibility**: 중간. 나중에 transaction helper 가 typed rollback primitive 를
제공하면 sentinel 구현을 공통화할 수 있다.

**Deferrability**: 낮음. O1 과 같은 함수의 atomicity 문제라 함께 닫아야 한다.

### D6. transport error mapping — transport envelope error vs daemon API response

**결정**: daemon API 의 typed response 는 그대로 `result` 로 전달한다. JSON parse
error, unknown method, invalid envelope 같은 transport/protocol 문제만 envelope
`error` 로 반환한다. unexpected internal error 는 `internal_error` 로 mapping 하고
서버 process 는 계속 살아 있어야 한다.

**대안**:

- 모든 daemon `{ ok:false }` 를 transport error 로 승격: wire shape 는 단순하지만
  daemon API contract 와 CLI invocation contract 가 갈라진다.
- transport/protocol error 만 별도: 기존 typed response 를 보존한다.

**추천 근거**: fake in-process client 가 검증한 daemon API DTO 를 real socket 위에서도
같은 의미로 유지해야 한다. transport 는 delivery medium 이지 product error namespace
가 아니다.

**Reversibility**: 중간. envelope version field 를 추가해 migration 가능하다.

**Deferrability**: 낮음. contract tests 에서 바로 고정해야 한다.

### D7. graceful shutdown / socket cleanup — close server, drain sockets, unlink owned path

**결정**: server handle 은 `close()` 또는 기존 `stop()` path 에서 listening server 를
닫고, 열린 sockets 를 종료하며, owned UDS path 를 unlink 한다. stale socket path 는
start 시 connect probe 후 죽은 socket 으로 확인될 때만 제거한다.

**대안**:

- 단순 unlink on start: 빠르지만 살아 있는 daemon socket 을 지울 위험이 있다.
- probe 후 cleanup: 구현은 조금 더 길지만 stale file 과 live daemon 을 구분한다.

**추천 근거**: daemon start idempotency 와 socket cleanup 은 real transport 의 첫
사용자 경험이다. stale file 로 start 가 막히면 Step 9 이후 모든 adapter 작업이 흔들린다.

**Reversibility**: 중간. path ownership metadata 를 나중에 추가할 수 있다.

**Deferrability**: 낮음. UDS primary 선택과 함께 필요한 기본 안전장치다.

---

## Phase B 구현 계획

1. Transport interface / NDJSON codec contract test 를 red 로 추가한다.
2. `src/daemon/server.ts` 또는 인접 모듈에 socket listen/connect boundary 를 추가하고
   기존 in-process `DaemonApi` 를 socket request dispatcher 에 연결한다.
3. `src/bin/aiox.ts` runtime 을 in-process default 에서 daemon socket client 경계로
   재정렬한다. 테스트 runtime 은 필요하면 in-process fixture 를 유지한다.
4. `sendMessage` sentinel regression test 를 추가하고, rollback sentinel 로 green 한다.
5. O1 idempotency test 를 추가한다. 가능한 범위에서는 race-ish duplicate request 를
   socket/daemon boundary 에서 검증하고, 최소한 UNIQUE violation reclassify 를
   deterministic test 로 고정한다.
6. `plan/mvp-implementation-checklist.md` 와 본 history 의 Phase B 결과/verification 을
   갱신한다.

---

## Open Concerns / Deferred

본 Phase A 신규 Open Concern 없음.

다음 항목은 명시적으로 본 step 밖이다.

- Codex thread UUID -> agent name mapping: Codex adapter step 진입 전 결정.
- Claude channel trust/confirmation policy: Claude adapter step 진입 전 결정.
- doctor/status output format: 후속 doctor/status step.
- Open Product Issue O2 (`sourceRoutes` empty sendMessage): 현재는 Step 8 에서
  `no_active_routes` 로 이미 구현돼 있으므로 별도 신규 concern 으로 열지 않는다.

---

## Verification

Phase A docs-only. Phase B 시작 전 baseline:

- `pnpm test`: passing, 30 files, 154 tests (Step 8 마감, 2026-05-19)
- `pnpm typecheck`: passing
- `pnpm build`: passing
