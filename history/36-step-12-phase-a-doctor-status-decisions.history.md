# Step 12 Phase A — doctor/status output decisions

## Status

- Phase: Step 12 Phase A — decisions locked.
- Codex cross-validation 완료 (D1~D5 + D3-fix-1/2).
- Phase B (TDD 구현) 완료, 2026-05-22.

## Authority pointers

- Step 12 sub-task — `plan/mvp-implementation-checklist.md` line ~850
- MVP spec "Global" commands + "Module Layout" — `prd/mvp/aiox-mvp-spec.md`
- 현재 invocation/runtime 구조 — `src/cli/invocation.ts`, `src/bin/aiox.ts`, `src/daemon/api.ts`
- 협업 사이클 패턴 — [[aiox-collaboration-workflow]]

---

## Decisions

### D1: `aiox status` 출력 포맷

- 섹션 순서: DAEMON → AGENTS → PAIRS → ROUTES → DELIVERIES
- AGENTS 테이블: NAME | KIND | STATUS (공백 고정폭 정렬, 외부 라이브러리 없음)
- ROUTES: agent ID 대신 **agent name** 표시. formatter에서 `status.agents` list lookup.
  - agent ID가 agents 목록에 없을 경우 `<missing:agent-id>` fallback.
  - 화살표: `->` (ASCII, 유니코드 `→` 아님) — 터미널 호환성 + 테스트 안정성.
- DELIVERIES: count summary만 (queued/delivering/delivered/completed/failed 5종 항상 출력, 없으면 0).
- DAEMON 섹션: startedAt + uptime (현재 시각 - startedAt 계산).

### D2: `StatusResponse` 확장

```ts
interface StatusResponse {
  daemon: { startedAt: string };
  agents: AgentDto[];
  pairs: PairDto[];
  routes: RouteDto[];
  // 추가
  messageCount: number;
  deliveryCounts: Record<MessageDeliveryStatus, number>;
}
```

- `state.status()`에서 repository COUNT(\*) 쿼리로 집계 (full list에서 derive 금지).
- 5개 delivery status 모두 초기화해서 absent 항목도 0으로 출력.

### D3: `aiox daemon status` — 수집 방법

`InvocationRuntime.daemonStatus()` 반환 타입에 `DaemonStatusInfo` 추가:

```ts
interface DaemonStatusInfo {
  pid: number;
  socketPath: string;
  dbPath: string;
  startedAt: string;
  version: string;
}
```

**D3-fix-1: dbPath**
`createSocketRuntime(options)` 에 `dbPath?: string` 추가.
- 미제공 시 `":memory:"` 사용 (현재 동작 유지).
- `daemonStatus()`는 이 값을 그대로 반환.
- 이후 persistent DB 도입 시 실제 파일 경로 주입으로 자연스럽게 교체.

**D3-fix-2: version**
`createSocketRuntime(options)` 에 `version?: string` 추가.
- `runAioxCli()`에서 이미 `readPackageVersion()`을 호출하므로, 그 값을 `createSocketRuntime({ version })` 으로 주입.
- `daemonStatus()`에서 이 값을 반환 → source of truth 하나 유지.
- 테스트에서 `version: "test-version"` 주입 가능.

**근거 (Codex)**: createSocketRuntime이 invocation runtime 책임(pid/socket/db/version 반환)을 가지므로 CLI metadata를 아는 것이 자연스러운 범위. 하위 호환 — 기존 코드 옵션 없이 그대로 동작.

### D4: `aiox doctor` 체크 항목 및 포맷

체크 항목:

| 항목 | 방법 | 필수 여부 |
|------|------|----------|
| node | `process.version` | 필수 |
| codex | `spawnSync("which", ["codex"])` | 필수 |
| claude | `spawnSync("which", ["claude"])` | 필수 |
| sqlite-native | better-sqlite3 import 성공 여부 | 필수 |
| daemon socket | `fs.existsSync(socketPath)` | 필수 |

- 명령 lookup: `spawnSync("which", [cmd])` 또는 `execFileSync("which", [cmd])` — shell string 실행(`execSync("which <cmd>")`) 금지. quoting 이슈 방지.
- daemon socket 체크: daemon start 없이 configured socket path 존재 여부만 확인. 미실행 시 `error: not found`가 유용한 진단 정보.
- 하나 실패해도 계속 실행. any-fail → exit code 1.

출력 포맷:
```
COMPONENT        STATUS
node             ok (v22.4.0)
codex            ok
claude           ok
sqlite-native    ok
daemon socket    ok (/tmp/aiox-xxx/daemon.sock)
```

### D5: formatter 위치

- `src/cli/format.ts` 신설 (별도 모듈).
- `invocation.ts`는 command orchestration 역할 유지 — formatter 로직 혼입 금지.
- `invocation.ts`에서 format.ts import, `InvocationResult.stdout` 으로 반환하는 기존 패턴 유지.

---

## Phase B TDD 진입 지침 (Codex 권고)

1. daemon status invocation 테스트에서 pid/socketPath/dbPath/startedAt/version stdout 기대값을 **Red** 먼저.
2. `createSocketRuntime` 옵션 확장(D3-fix-1/2) + `DaemonStatusInfo` 타입 추가.
3. `cli/format.ts` 신설 — formatDaemonStatus / formatStatus / formatDoctor.
4. `StatusResponse`에 messageCount/deliveryCounts 추가 + repository COUNT 경로 추가 (D2).
5. doctor 체크 함수 구현 (D4 항목 순서대로).

---

## Phase B implementation record (2026-05-22)

- Added `src/cli/format.ts` with `formatDaemonStatus`, `formatStatus`, and
  `formatDoctor`.
- Extended `StatusResponse` with `messageCount` and `deliveryCounts`.
  `state.status()` now uses repository COUNT queries instead of deriving from
  full message/delivery lists.
- Added `src/cli/doctor.ts` and wired `InvocationRuntime.doctor()` to run all
  checks in D4 order. Any check error sets `aiox doctor` exit code to 1.
- Extended `createSocketRuntime()` with `dbPath` and `version`; `daemonStatus()`
  now returns `DaemonStatusInfo`.
- Connected `invocation.ts` status, daemon-status, and doctor commands to the
  formatter layer.

### Follow-up correction: daemon status is read-only

Initial Phase B implementation made `createSocketRuntime.daemonStatus()` call
`start()`, which meant `aiox daemon status` could create the daemon/socket while
answering a read-only query. User review clarified that status must be a pure
read.

Resolution:

- `DaemonStatusInfo` is now a discriminated union:
  - `running: true` includes pid/socket/db/startedAt/version.
  - `running: false` includes socket/db/version only.
- `createSocketRuntime.daemonStatus()` no longer calls `start()`. If the socket
  runtime has no daemon handle but the configured socket exists, it connects to
  the existing daemon socket and reads status without owning or starting the
  daemon. If the socket does not exist, it returns `running: false`.
- `StatusResponse.daemon` now includes `pid` so read-only status calls from a
  separate process can report the daemon process.
- `formatDaemonStatus()` prints `STATUS not running` and omits process-only
  fields for the non-running case.

Verification:

- `pnpm test`: passing, 42 files, 273 tests.
- `pnpm typecheck`: passing.
- `pnpm build`: passing.

### Follow-up correction: remove unused tmux check

User review clarified that `tmux` is not used by the current MVP runtime and
showing it in `aiox doctor` creates noise. The doctor output now reports only
current required runtime dependencies and daemon socket reachability.

### Follow-up correction: remove pnpm from runtime doctor

User review clarified that `pnpm` is a repository development tool, not a
runtime dependency for an installed `aiox` CLI. The doctor output now omits
package-manager checks and keeps development verification in `pnpm
test/typecheck/build`.

### Process feedback for future agents

The original D4 decision mixed three categories in one `doctor` list:

1. Current runtime requirements (`node`, `codex`, `claude`,
   `sqlite-native`, daemon socket reachability).
2. Repository development workflow tools (`pnpm`).
3. Future/possible operator recipe tools (`tmux`).

That made the output look authoritative for runtime readiness even when some
items were not actually required to run released `aiox`. User review caught this
through two questions:

- "tmux가 있는 의미를 모르겠는데?" → `tmux` was not used by the MVP runtime.
- "pnpm은 선택아님? npm으로 보통 default아니냐?" → `pnpm` is required for this
  repository's development scripts, not for a released CLI runtime.

Correction rule for Codex/Claude follow-up work:

- `aiox doctor` should report only checks that affect the current user-facing
  runtime path.
- Development workflow tools belong in repository verification docs/checklists,
  not runtime doctor output.
- Future recipe candidates should not appear in doctor until the recipe is
  implemented and user-visible.
- If a check is not required for all supported install/run paths, either omit it
  from MVP doctor or put it under an explicitly separate non-failing section.

This was not a code-only bug; it was a product signal-quality issue. Future
agents should challenge diagnostic output by asking: "Would a released `aiox`
user understand why this item is shown, and would absence of this item actually
block the command they are trying to run?"
