# Step 3 Daemon API and Lifecycle Shell

> 작성일: 2026-05-18
> 작성자: Claude (Opus 4.7) — codex와의 위임 cross-validation 라운드 4회
> 관련 기록:
> - `history/15-mvp-design-decisions.history.md` (MVP 결정 9건)
> - `history/16-step-2-sqlite-repository-cleanup.history.md` (Step 2 마감 + Step 3 진입 조건)
> - `plan/mvp-implementation-checklist.md` (Step 3 본문 + Review Follow-ups)

---

## 배경

Step 2 (SQLite repositories) cleanup이 마감된 이후, Step 3 — "daemon API tests
with fake in-process transport" — 에 진입함. 목표는 **CLI 진입점이 닿기 전에
daemon 측 control plane을 fake transport 위에서 완성**하는 것. 즉 진짜
socket/process supervision 없이도 daemon API의 contract, 상태 전이, lifecycle
시맨틱을 단단히 잡아두는 것.

본 문서는 **다음 세션의 codex가 한 화면에서 맥락을 잡을 수 있도록** Step 3 진입
부터 review follow-up까지의 결정 흐름과 보류 항목을 한 곳에 기록한다.

---

## 진행 방식

TDD increment 단위로 자르고, 사용자 → Claude (대화) → codex (위임) 패턴으로 위임
라운드 4회 진행. 각 라운드는 `mcp__claude-adapter__ask_codex`를 통한 직접 호출이
아니라 사용자가 코덱스에 프롬프트를 전달하는 형태였고, Claude는 (a) 위임 프롬프트
설계, (b) 결과 리뷰, (c) 다음 라운드 범위 제안을 담당.

### Round A — control plane attach / pair / DTO

| commit | 내용 |
|---|---|
| `302ccb3` | baseline: 이전 미커밋분 (`attachAgent` happy + `pair_not_found`) 분리 commit |
| `54785c9` | `createPair` + duplicate typed error |
| `fc69519` | attach pair happy path (`pairName` 존재 시 `pairId` 전달) |
| `797129e` | DTO boundary + fake client JSON round-trip |

### Round B — connect / disconnect / status

| commit | 내용 |
|---|---|
| `f14effa` | `connect` / `disconnect` (typed errors, `withTransaction` for multi-target, missing target all-or-nothing) |
| `2516535` | `status` + `agents.list()` / `pairs.list()` repository 메서드 추가 |

### Round C — stop / server / supervisor

| commit | 내용 |
|---|---|
| `f53be40` | `stop({ daemonOnly? })` on state + API |
| `a3ade29` | `server.ts` lifecycle shell + `supervisor.ts` no-op stub |

### Round D — review follow-ups

| commit | 내용 |
|---|---|
| `1c2254c` | `server.stop`이 `daemonOnly`를 `api.stop`까지 전파 |
| `2e1e316` | `Supervisor`에서 `state` 필드 제거 (인터페이스를 `{ start; stop }`로 축소) |
| `f566931` | `DaemonServerHandle.stop`을 cached `StopResponse` 기반 idempotent + restart-safe로 |

테스트는 Step 3 진입 시점 ~37개에서 최종 86개로 증가. typecheck 통과 유지.

---

## 결정 사항

### 1. DTO 경계 도입 시점과 범위 (Round A `797129e`)

**결정**: daemon API 응답에서 repository internal 타입 (`StoredAgent`, `StoredPair`)
을 직접 노출하지 않고 `AgentDto`, `PairDto` 같은 daemon-layer DTO로 매핑한다.
응답 DTO에는 caller가 필요로 하는 필드만 노출 — `created_at`/`updated_at`,
`adapter_session_id`, `last_seen_at` 같은 internal field는 status/inspect API가
요구하기 전까지 숨겨둔다.

**근거**: 첫 increment에서 `ReturnType<DaemonState["attachAgent"]>`를 그대로
API contract로 통과시킨 것이 leak였다. 코드 리뷰 단계에서 이 leak를 명시적
미완성으로 인정하고 다음 increment에서 명시 DTO + `JSON.parse(JSON.stringify(...))`
fake client round-trip을 함께 도입함. JSON round-trip은 `Date` / `undefined` /
`Function` leak를 컴파일 외 단계에서 잡아내는 안전망.

**현재 한계**: `state.ts`의 `Status` 응답 타입은 여전히 repository internal 타입
을 그대로 노출한다 (`Status.agents: StoredAgent[]` 등). API 경계에서는 DTO로
매핑되지만 state layer까지 DTO 규율을 일관적으로 적용하지는 않았음. follow-up
후보.

### 2. `withTransaction` 적용 기준 (Round A `fc69519` / Round B `f14effa` / Round C `f53be40`)

**결정**: multi-row 또는 cross-repository 쓰기 시점에만 `withTransaction`을
적용한다.

- `attachAgent({ pairName })` happy path: pair 조회 + single agent insert
  조합이지만 `withTransaction` 미적용. 근거 (`fc69519` commit body):
  > MVP has no pair delete command, and the existing missing-pair test
  > covers the current partial write risk. Revisit when pair slot status/
  > auto-route updates add cross-repository writes.
- `connect({ sourceName, targetNames })`: N개 target에 대해 N개 route insert
  → `withTransaction` 필수. missing target 발견 시 한 건의 route도 생성되지
  않도록 사전 검증 후 transaction 진입.
- `stop({ daemonOnly: false })`: 일괄 agent disconnect mark → `withTransaction`
  으로 atomic.

### 3. `connect`의 missing target 정책 (Round B `f14effa`)

**결정**: `targetNames` 중 하나라도 존재하지 않으면 typed error
`{ ok: false, reason: "target_agent_not_found", missing: string[] }`를 반환하고
**어떤 route도 생성하지 않는다** (all-or-nothing). missing source도 동일 패턴.

**근거**: partial write는 daemon 운영자의 mental model을 깨뜨림 ("3개 중 2개는
성공"이 silent해지면 디버깅 비용 큼). MVP 단계에서는 명시 typed error 후 caller
가 재시도하는 것이 안전하다.

### 4. `daemon stop --daemon-only` 시맨틱 (Round C `f53be40` / Round D `1c2254c`)

**결정**: `daemonOnly` flag는 **agent status mark만** 분기한다. supervisor는
양쪽 모두에서 `stop()`을 호출한다.

- `stop({ daemonOnly: false })` (또는 기본): connected agents를 일괄
  `disconnected`로 mark + `supervisor.stop()` 호출.
- `stop({ daemonOnly: true })`: agent status 변경 없음 + `supervisor.stop()`
  호출. 응답의 `stoppedAgents`는 `[]`.

**근거**: `prd/mvp/aiox-mvp-spec.md` line 60–65는 "Leaves externally owned /
user-attached processes alone where possible" 라고 했다. 여기서 보호 대상은
**외부에서 소유한** 프로세스 (예: 사용자가 직접 띄운 attach 터미널)이지
daemon-owned children이 아니다. daemon-owned children은 supervisor의 책임이고
어느 모드에서든 graceful stop 대상.

Round C 첫 구현은 `server.stop()`이 옵션을 받지 않아 항상 plain stop으로 동작.
Round D `1c2254c`에서 `DaemonServerHandle.stop(options?: StopRequest)`로 시그
니처를 확장해 CLI flag가 server 경계까지 자연스럽게 도달하게 함.

### 5. `noopSupervisor`의 `state` 필드 제거 (Round D `2e1e316`)

**결정**: `Supervisor` 인터페이스를 `{ start(): void; stop(): void }`로 축소.
`SupervisorState` 타입 및 `state` 필드는 제거.

**근거**: Round C 첫 구현은 `idle | started | stopped` enum을 노출했으나, 이
필드를 소비하는 곳은 `supervisor.test.ts` 자신뿐이었다 (server.test.ts는 별도
recording supervisor로 호출 횟수만 추적). 본인 테스트만을 위해 존재하는
contract는 회로일 뿐이고, real supervisor가 도입되면 children health / restart
policy 등 다른 상태 모델이 필요해질 것이므로 이 enum은 재사용되지 않는다.
"Don't design for hypothetical future requirements" 원칙 적용.

### 6. `DaemonServerHandle.stop` idempotency 정책 (Round D `f566931`)

**결정**: double-stop은 cached `StopResponse`를 반환한다. typed error
(`{ ok: false, reason: "already_stopped" }`)는 채택하지 않는다.

**근거**:
- typed error로 가면 `StopResponse` discriminated union이 커지고 모든 caller가
  분기를 들어야 한다 — CLI나 test 등 90% caller는 "그냥 한 번 더 호출해도 됨"
  을 기대.
- cached response 정책은 supervisor의 무해 idempotent 동작과도 결이 맞는다.
- restart-safe 보장: 옛 handle을 잡고 있다가 `server.start() → handle.stop()
  → server.start()` 시퀀스 후 옛 handle을 다시 stop해도, 옛 handle의 closure
  는 첫 stop 시점의 `stoppedResponse`를 캐싱하고 있어 새 session의 state를
  건드리지 않는다.

---

## 보류 / 다음 step 후보

- **real socket transport**: 현재는 `Proxy` + `JSON.parse(JSON.stringify(...))`
  기반 fake in-process client만 존재. 실제 Unix domain socket / named pipe /
  TCP 중 어느 transport를 선택할지, daemon discovery (`pgrep` vs lock file vs
  PID file) 정책 등은 다음 step에서 결정.
- **CLI parsing**: `aiox daemon stop --daemon-only` flag 분기, `aiox connect a
  b c`의 source/target 파싱, exit code 정책 (typed error → exit code 매핑)
  미수립.
- **real supervisor**: 현재는 no-op. daemon-owned children (예: shared codex
  app-server)를 실제로 spawn/감독하는 supervisor가 Post-MVP에 들어옴. 그 시점
  에 `Supervisor` 인터페이스도 children 등록/health/restart 정책으로 확장.
- **`state.ts`의 `Status` DTO 좁히기**: 위 결정 #1의 한계 참조. status API가
  사용자에게 노출되는 시점에 internal field를 검수하고 DTO를 좁힐지 결정.
- **daemon `restart` 명령**: 현재는 server.start/stop 조합으로만 검증
  (`server.test.ts` restart scenario). CLI step에서 `aiox daemon restart`를
  실제 명령으로 노출할 때 stop → start 사이의 health gap 정책 (대기/timeout)
  결정 필요.
- **agent reconnect through repository rules**:
  `plan/mvp-implementation-checklist.md` Step 3의
  `register/reconnect agent by name through repository rules` 항목은
  `server.test.ts`의 restart scenario로 cover되어 `[x]`로 닫혔으나, 명시적
  `reconnect` API 또는 attach의 idempotency 정책 (재attach 시점의 cwd 변경,
  pair 변경 처리) 은 CLI step에서 다시 검토.

---

## 산출물 요약

- 6개 control plane 메서드: `attachAgent` / `createPair` / `connect` /
  `disconnect` / `status` / `stop`
- DTO 경계 + JSON round-trip fake client
- `server.ts` lifecycle shell (idempotent start + cached-response stop +
  restart-safe handle)
- `supervisor.ts` no-op boundary stub (`Supervisor = { start; stop }`)
- 86 tests passing, typecheck 통과
- Step 3 헤더 `✅ 완료`
