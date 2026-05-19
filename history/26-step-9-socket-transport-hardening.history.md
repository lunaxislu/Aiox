# Step 9 Follow-up — Socket Transport Hardening

> 작성일: 2026-05-19
> 작성자: Codex
> 관련 기록:
> - `history/25-step-9-phase-a-real-socket-transport.history.md`
> - `plan/mvp-implementation-checklist.md` Step 9
> - `prd/mvp/aiox-mvp-spec.md`

---

## 배경

Step 9 는 real socket transport + O1/sendMessage atomicity 로 마감됐다. 이후
사용자/Claude review 에서 Step 9 권위 범위 안의 minor hardening gap 4건이 확인됐다.
새 Open Concern 으로 열지는 않지만, Step 10/11 real adapter 진입 전에 닫아 부채가
adapter boundary 로 넘어가지 않게 한다.

본 follow-up 의 권위 범위는 **socket transport hardening 4건 only** 이다. Codex
adapter, Claude adapter, Open Product Issue #2, doctor/status output 은 본 patch
밖이다.

---

## Phase A 결정

### H1. client connection reuse + id correlation

**결정**: `createDaemonSocketClient` 는 lazy persistent connection 을 갖고, request
`id` 별 pending map 으로 response 를 correlation 한다. 한 connection 에 multiple
in-flight request 를 허용한다.

**대안**:

- per-request connection 유지: 구현은 가장 작지만 Step 9 D3 의 "한 connection 에 여러
  request + id correlation" 결정과 어긋난다.
- persistent connection + serialized in-flight 1: connection setup 비용은 줄지만 id
  correlation 의 동시성 의미가 약하다.
- persistent connection + id multiplex: 구현은 조금 늘지만 envelope `id` 를 실제
  contract 로 만든다.

**추천 근거**: Step 10/11 long-lived adapter process 는 sequential request 비용과
concurrent event/request surface 를 동시에 만난다. 지금 id multiplex 를 좁게 닫는 게
adapter 구현을 단순하게 한다.

**Reversibility**: 중간. client 내부 구현이라 public daemon API 는 유지되지만 pending
request close/error semantics 테스트는 함께 바뀐다.

**Deferrability**: 낮음. Step 10/11 adapter boundary 전에 닫는 것이 자연스럽다.

### H2. request timeout + close fallback

**결정**: client option 으로 `requestTimeoutMs` 를 추가하고 default 는 `30_000`ms 로
둔다. `0` 은 timeout disabled 로 해석한다. socket 이 response 없이 close 되면 pending
request 를 reject 한다.

**대안**:

- close fallback only: silent close 는 막지만 daemon hang 은 무한 대기한다.
- default timeout only: hang 은 막지만 close 시 더 늦게 실패한다.
- timeout + close fallback: daemon hang/crash 양쪽을 즉시 또는 bounded wait 로 닫는다.

**추천 근거**: adapter process 가 daemon crash/hang 에 무한 대기하면 supervisor 와
사용자 workflow 가 같이 멈춘다. 30초는 MVP control-plane request 에 충분히 관대한
기본값이다.

**Reversibility**: 높음. option default 조정은 client 내부 정책 변경이다.

**Deferrability**: 낮음. 최소한 bounded failure 또는 close rejection 중 하나는 real
adapter 전에 필요하고, 둘 다 구현 비용이 작다.

### H3. stale socket start race

**결정**: start 전 stale cleanup 은 기존 probe 를 유지하되, `server.listen` 이
`EADDRINUSE` 로 실패하면 한 번만 `canConnect` 로 재확인한다. live daemon 이 확인되면
typed-ish message 로 fail 하고, dead socket 으로 확인되면 unlink 후 listen 을 한 번
retry 한다.

**대안**:

- PID/lock file 도입: race 를 더 강하게 닫을 수 있지만 single-user MVP 에 과하다.
- listen retry only: 간단하지만 live daemon 과 stale socket 의 실패 메시지가 흐리다.
- EADDRINUSE 재확인 + single retry: race window 를 줄이고 구현 범위를 Step 9 transport
  안에 묶는다.

**추천 근거**: MVP 에서는 over-engineering 보다 명확한 failure 와 stale retry 가 더
좋다. 두 daemon 동시 start 에서 하나가 이미 listen 했다면 다른 하나는 live socket 으로
판정하고 안전하게 실패해야 한다.

**Reversibility**: 높음. daemon lifecycle 정책이 강해지면 lock file 을 추가할 수 있다.

**Deferrability**: 중간. single-user MVP 에서는 드물지만 restart 자동화가 붙기 전에
minimal fix 로 닫는다.

---

## Phase B 구현 결과

주요 변경:

- `createDaemonSocketClient` 는 lazy persistent socket 을 만들고 request `id` 별
  pending map 으로 response 를 resolve/reject 한다.
- 한 socket 에 multiple in-flight request 를 허용한다. out-of-order response 는
  response `id` 로 원래 request 에 매칭된다.
- client option `requestTimeoutMs` 를 추가했다. default 는 `30_000`ms, `0` 은 timeout
  disabled 이다.
- socket 이 response 없이 close 되면 모든 pending request 를 reject 한다.
- daemon socket start 는 먼저 `listen` 을 시도한다. `EADDRINUSE` 발생 시
  `canConnect` 로 live daemon 여부를 한 번 재확인하고, stale path 면 unlink 후 한 번만
  retry 한다.

TDD 기록:

- Red: concurrent client request test 에서 connection count 가 `2` 로 실패했다.
  기존 client 는 request 마다 `net.createConnection(socketPath)` 를 열었다.
- Green: persistent client transport + pending request map 을 추가해 한 connection 에서
  concurrent request/response id correlation 을 통과했다.
- Red: response 없는 socket close/request hang fixture 에서 pending request 가 bounded
  error 로 닫히지 않았다.
- Green: close fallback 과 `requestTimeoutMs` 를 추가해 close 는 `closed`, hang 은
  `timed out` error 로 reject 하도록 했다.
- Red: stale socket file 에 대해 listen-first retry contract 를 추가했다.
- Green: `EADDRINUSE` 시 live daemon 은 `already in use` 로 실패하고 stale path 는 unlink
  후 retry 한다.

변경 파일:

- `src/daemon/socket-transport.ts`
- `tests/unit/daemon/socket-transport.test.ts`
- `plan/mvp-implementation-checklist.md`

---

## Verification

2026-05-19 Step 9 follow-up 마감 검증:

- `pnpm test tests/unit/daemon/socket-transport.test.ts`: passing, 1 file, 7 tests
- `pnpm test`: passing, 31 files, 164 tests
- `pnpm typecheck`: passing
- `pnpm build`: passing
