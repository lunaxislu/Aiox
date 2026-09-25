# Effect 서버·adapter 적용 검토

2026-09-25 후속 판정: 아래 본문은 **마이그레이션 전 조사 이력**이다. Hono 유지·Effect v3·HTTP/SSE
추천은 이후 Effect v4 서버 전환으로 대체됐다. ExecutionOwner 내부도 Effect로 전환했으며
프로세스 단일 소유·종료 확인 책임은 보존한다. Workflow는 이번 범위에서 제외했다.
현재 실행 구조는 [vendor bindings](../../docs/architecture/aiox-vendor-bindings.md), 앱 통신은
[Application RPC](../../docs/specs/aiox-application-rpc.md)를 따른다. Codex stderr 수명·Claude
retirement 오류 처리·알림 읽음의 연결 종료 경합은 후속 리뷰에서 수정·재검증됐다.
조사 당시의 코드 목록·버전 표·미검증 범위는 그 시점의 근거로만 읽는다.

확인일: 2026-09-25. 사용자 요청에 따라 현재 repository 소스와 관련 테스트를 읽고, Effect 공식 문서·공식 npm registry를 대조했다. 세 연구 agent의 세부 조사 결과를 아래에 포함한다. 실제 Effect 설치·통합·빌드·실행·성능 검증은 수행하지 않았다. 제품 코드·의존성·lockfile·spec·기존 작업 로그를 변경하지 않았다.

## 적용 전제

조사 당시 결정은 HTTP 명령·SSE 현재 상태·terminal WS 유지, Operation 제거, DB 등록과 shell 준비 수명 분리, sequence 범위 내 DB 변경 순서 관리, daemon 상시 현재 snapshot 유지다. 요청 간 병합은 보류다. 현재 소스는 아직 Operation 기반이므로 현재 코드의 사실과 목표 설계를 구분한다.

## 조사 당시 종합 의견

Effect core는 daemon과 adapter의 실행 수명, 대기/취소/종료, 실패 경로, 순번 대기, 상태 발행 worker를 공통 방식으로 표현하는 데 유력하다. Hono, Drizzle/better-sqlite3, node-pty, xterm을 모두 교체할 필요는 없다. 처음에는 core effect만으로도 대부분의 후보를 검증할 수 있다.

책임 구조 후보:

```text
Hono HTTP boundary
  → daemon ManagedRuntime / services
      ├ 순번 접수·대기: Queue + Deferred + timeout (sequence 규칙은 자체 구현)
      ├ DB 변경: 기존 Drizzle transaction
      ├ shell/agent 준비: daemon 소유 Fiber / 자원 소유 Scope
      ├ vendor 관측·전달: worker / Schedule / callback bridge
      └ 현재 상태: Ref / 직렬 반영 → PubSub / Stream → Hono SSE
node-pty / xterm / SQLite / vendor protocol은 각 실제 기능을 계속 제공
```

HTTP request Scope 종료와 shell 수명을 연결하지 않는다. 앱 snapshot 소비자가 없어도 daemon 소유 worker는 유지한다. Effect Ref의 원자성은 DB commit과 memory 반영을 하나의 transaction으로 만들지 않는다. 초기 snapshot/후속 변경 handoff, post-commit 실패 복구, slow client 처리와 sequence 누락 정책은 직접 설계하고 검증해야 한다.

## 구체적으로 대조한 현재 코드

- `apps/daemon/src/services.ts`: operationTasks Set과 공유 서비스.
- `apps/daemon/src/panel-operations.ts`: 선등록/202/background Promise, attach 실패/cleanup, 결과 persist.
- `apps/daemon/src/daemon.ts`: registrations, runtimeStops, requestStop, stopRuntime, closeServers.
- `apps/daemon/src/agent-controller.ts`: preparingExecution/startingExecution/finishing 등 비동기 수명, 외부 실행 소유 경계.
- `packages/vendor/src/execution.ts`: abort, pending starts, 역순 stop, 실패 cleanup 재시도와 자원 보존.
- `packages/persistence/src/sqlite/host-state.ts:mutatePanel`: 실제 SQLite tx 안에서 최신 panel 검증·저장.
- `apps/daemon/src/retention.ts`: 즉시/일일 정리와 실패 보고.
- tests는 기존 조건 확인용으로 읽었으며 이번 조사에서 실행하지 않았다.

특히 기존 ExecutionOwner는 프로세스 종료가 확인되지 않으면 socket/file을 보존하고 정리를 재시도한다. Scope를 닫아 모두 폐기하는 것으로 치환하면 이 계약이 깨진다. Effect 도입 시 자원 소유자는 하나로 두고 staged stop/failed-cleanup record를 유지해야 한다. Host 다중 대상 실행도 실패한 하나 때문에 무관한 형제 실행을 자동 중단시키지 않도록 결과 수집 정책을 명시한다.

## 도입 검증 순서 제안

1. daemon runtime과 shell 등록 → daemon-owned 준비 → 현재 탭 attach/삭제 판정 → 실패/cleanup 결과를 SSE에 반영하는 수직 경로.
2. vendor ExecutionOwner와 Claude/Codex 관측·relay worker를 동일 수명 모델로 정리. 기존 owner와 새 scope의 이중 소유 금지.
3. 현재 snapshot 직렬 갱신 및 SSE 연결 수명: no-client 변경, 최초 연결 경합, slow client, post-commit 반영 실패 테스트.
4. 필요성이 확인되면 platform/SQL/Schema 경계 확대. 버전 변경·Schema 마이그레이션·SQL driver 교체를 한 번에 섞지 않는다.

---

# Effect ecosystem verification

Observed 2026-09-25. Public npm registry queried directly over HTTPS; no packages installed and no production/log files changed. Recommendations below are judgment, not upstream requirements.

## Verified release state and compatibility

`effect` registry tags are `latest=3.22.2`, `beta=4.0.0-beta.107`, `rc=4.0.0-rc.117`. Do not describe v4 as stable, or merely beta. The current official [RC announcement](https://effect.website/blog/releases/effect/40-rc) says broad breaking changes are no longer planned, while narrowly scoped changes remain possible. [Registry](https://registry.npmjs.org/effect).

| Package | latest (v3 ecosystem) | Relevant compatibility |
| --- | --- | --- |
| effect | 3.22.2 | Core |
| @effect/platform | 0.97.2 | effect ^3.22.2 |
| @effect/platform-node | 0.108.2 | effect ^3.22.2; platform ^0.97.2; peers also rpc ^0.76.2, sql ^0.52.1, cluster ^0.60.2 |
| @effect/sql | 0.52.1 | effect ^3.22.1; platform ^0.97.1; experimental ^0.61.1 |
| @effect/sql-sqlite-node | 0.53.0 | effect ^3.22.0; sql ^0.52.0; platform ^0.97.0; experimental ^0.61.0; dependency better-sqlite3 ^12.6.2 |
| @effect/sql-drizzle | 0.51.0 | effect ^3.22.0; sql ^0.52.0; drizzle-orm >=0.43.1 <0.50 |
| @effect/workflow | 0.19.1 | effect ^3.22.1; rpc ^0.76.2; platform ^0.97.1; experimental ^0.61.1 |
| @effect/rpc | 0.76.2 | effect ^3.22.1; platform ^0.97.1 |

Primary metadata: [platform](https://registry.npmjs.org/@effect/platform), [platform-node](https://registry.npmjs.org/@effect/platform-node), [sql](https://registry.npmjs.org/@effect/sql), [sqlite-node](https://registry.npmjs.org/@effect/sql-sqlite-node), [sql-drizzle](https://registry.npmjs.org/@effect/sql-drizzle), [workflow](https://registry.npmjs.org/@effect/workflow), [rpc](https://registry.npmjs.org/@effect/rpc).

These v3 versions' listed peer ranges align. That is metadata compatibility, not proof of an application migration/build. In particular platform-node brings additional ecosystem peers; calling it a two-package migration without inspecting pnpm resolution would understate its footprint.

For v4, effect, platform-node and sql-sqlite-node each have rc 4.0.0-rc.117. Platform/SQL/RPC/cluster abstractions are consolidated into core; v3 package recipes must not be combined blindly with v4. Modules under effect/unstable/* can break in minor versions; unified package versions do not promise stability of those APIs. [Official v4 organization explanation](https://effect.website/blog/releases/effect/40-beta).

Local observations: root package.json uses TypeScript 5.9.3, pnpm 10.33.0, Node ^22.13.0 || >=24.11.0. packages/persistence/package.json uses better-sqlite3 12.11.1 and drizzle-orm 0.45.3. No Effect dependency appeared in searched package manifests. Drizzle 0.45.3 satisfies sql-drizzle's peer range. Actual adapter semantics/transactions still require verification.

The v4 [official README](https://github.com/Effect-TS/effect/blob/main/README.md) requires TS 5.9+ and strict checking, and specifies Node 22.16+ for sql-sqlite-node. Unlike v3's better-sqlite3 driver, v4's driver uses node:sqlite ([official July recap](https://effect.website/blog/effect-v4beta-july-recap)). Additionally rc.117 platform-node depends on undici ^8.10.2; [undici 8.10.2 metadata](https://registry.npmjs.org/undici/8.10.2) requires Node >=22.19.0. Therefore the repo's declared Node range is broader than these v4 integrations support. TS version aligns; Node floor and dependency resolution need explicit treatment before adopting those integrations.

## What core provides, and its boundaries

- Scope owns registered finalizers; scoped effects release resources on normal completion, failure and interruption. It does not discover cleanup automatically. [Scope](https://effect.website/docs/v3/resource-management/scope).
- Fibers provide concurrent execution, supervision/lifetime and interruption. Fiber.interrupt normally waits for finalization. It is not an OS thread or arbitrary process terminator. [Fibers](https://effect.website/docs/v3/concurrency/fibers).
- Layer describes construction and composition of services and their dependencies; use it where the application has actual dependencies/resources, not as a required wrapper around every pure function. [Layers](https://effect.website/docs/v3/requirements-management/layers).
- Stream models an effectful sequence and its failure/environment; useful for acquisition/consumption lifetimes and event composition. It does not automatically deliver server-observed status to a browser, persist replay, or recover dropped connections. Those are application transport/protocol responsibilities. [Stream](https://effect.website/docs/v3/stream/introduction).
- Schema handles decoding/encoding and runtime validation with inferred types. It is part of effect; a new @effect/schema package is unnecessary. Existing trust-boundary validation should be retained until an equivalent replacement is verified. [Schema](https://effect.website/docs/v3/schema/introduction).

Cancellation limitation: tryPromise supplies an AbortSignal to a wrapped API; that API must cooperate. An arbitrary Promise cannot be forcibly canceled by wrapping it. The same principle requires explicit node-pty kill/dispose/wait-for-exit integration for terminal processes. [Official tryPromise source](https://github.com/Effect-TS/effect/blob/v3/packages/effect/src/Effect.ts). The repo has node-pty in packages/terminal/src/index.ts and AbortController in packages/vendor/src/execution.ts; this research did not validate every cleanup path.

## Recommendation (judgment)

1. Recommended first candidate: core effect only, focused on daemon operation lifetime, typed failure, cancellation wiring and owned cleanup. Scope/Fiber/Layer/Stream/Schema are capabilities inside one package, not five dependencies. A narrow end-to-end adoption should demonstrate interruption -> actual child termination -> finalization -> truthful user status before broad conversion.
2. Optional: platform/platform-node when their actual Node filesystem, process, HTTP or runtime integrations replace existing ownership code cleanly. Their presence alone does not replace node-pty semantics. [Platform overview](https://effect.website/docs/v3/platform/introduction).
3. Optional later: sql/sql-sqlite-node/sql-drizzle if SQL transaction/resource ownership is deliberately moved into Effect. Existing Drizzle/better-sqlite3 can initially remain behind a small Effect boundary. Driver replacement solely to use core Effect is unnecessary. [Official Drizzle package](https://github.com/Effect-TS/effect/blob/v3/packages/sql-drizzle/README.md).
4. No present need established: workflow. It is a real package with durable activities, durable waits/signals and workflow engines; it is materially more than fiber supervision. Its example uses cluster-backed engine and SQL. A restart/resumption requirement and storage semantics should justify it. Do not claim automatic exactly-once external side effects: an external action followed by crash before recording its result still needs an idempotency/reconciliation design. [Official package README](https://www.npmjs.com/package/@effect/workflow).
5. No present need established: rpc. It supplies schema-driven client/server RPC, but choosing Effect for internal orchestration does not itself require changing existing HTTP/WebSocket contracts. Evaluate only with an explicit transport/protocol migration scope. [Official RPC README](https://github.com/Effect-TS/effect/blob/v3/packages/rpc/README.md).

Version recommendation: for a stable dependency baseline today use v3 latest, with explicit matching ecosystem pins if integrations are selected. For this pre-release repository, a v4 RC prototype can be reasonable to avoid a later major migration, but accepting RC/unstable APIs and raising affected Node minimums is a separate, visible choice. No source justifies silently treating v4 as stable.

## Vitest adapter check

Retrieved 2026-09-25 from [@effect/vitest registry metadata](https://registry.npmjs.org/@effect/vitest): latest 0.30.0 peers on effect ^3.22.0 and vitest ^3.2.0; rc 4.0.0-rc.117 peers on effect ^4.0.0-rc.117 and vitest >=5.0.0 <6.0.0. Neither declared peer range includes the parent agent's supplied repository Vitest 4.1.6. Therefore do not recommend adding @effect/vitest with the current test stack. Ordinary Vitest tests can execute effects through Effect.runPromise/runPromiseExit and assert outcomes; adding a test adapter is optional and would require resolving this version mismatch. This is peer metadata evidence, not a runtime incompatibility experiment.


---

# Effect adapter / process / terminal review

Status: static code and existing-test inspection only. No Effect integration installed, implemented, compiled, or executed; existing tests were read, not run. Scope assumes parent-reported decisions: HTTP commands, SSE current state, WS terminal; Operation removal planned. These transport choices do not require replacing vendor-internal WS protocols.

## Confirmed ownership and flow

`apps/daemon/src/agent-controller.ts` creates `ExecutionOwner`, adapting its foreground process to `createTerminal`. Codex `createExecution` acquires relay, starts App Server, discovers its listening URL from output, then launches foreground TUI. Bindings deliver through vendor channels and persist outcomes through `controls.settle`. `daemon.ts:stopRuntime` revokes authority immediately, waits registrations, stops daemon-owned execution, cleans binding, kills owned terminal, removes routes, forgets messaging, and persists host completion. Failed stops remain retryable.

```
command -> daemon runtime -> ExecutionOwner -> native helper / foreground PTY
                               |                   |
                               |             vendor binding
                               |                   |
                               +-- stop          delivery -> acceptance -> outcome -> settle
                                   |
                          confirm processes dead -> release sockets/files
```

## Static candidates and limits

| Concrete location | Candidate | Semantics that must survive |
| --- | --- | --- |
| `packages/adapters/claude/src/claude.ts:#scheduleReadRetry`, `#read`, `#readRegistry`, `#armTranscript`, `#closeTranscripts` | Scoped observation worker and scheduled failure retry; watcher registration can use acquire/release | Normal observation is fs.watch-driven, **not polling**. Retry only failed transcript reads, registry reads, pending outcome persistence. Current backoff starts 1 s, doubles to 30 s, resets when healthy; only one retry is active. Watch replacement/relocation and missed rows must recover. Closing stops future observation then drains registrations, retiring readers, reports, and every final file read before fallback outcomes. Finalizer interruption cannot simply discard that drain. Current timer is unref'ed; check runtime liveness equivalence before migration. |
| `claude.ts:#registrations/#reports`; `claude-observations.ts:#enqueue/#settle/retryOutcomes`; `claude-transcript.ts:read/retire/close` | A serial scoped worker / semaphore can replace Promise chains if it reduces lifecycle code | Preserve independent old/new session state; first terminal outcome remains immutable until storage succeeds; rejected storage retains retryable result. `retire` finishes an active snapshot but prevents queued/future reads. Per-reader cursor advances only after row consumer succeeds. Cancellation halfway through consuming a row is not a free operation. Do not build one global queue that blocks new-session EOF capture on old settlement. |
| `packages/adapters/codex/src/index.ts:createExecution().start` | Async callback bridge + cancellation + timeout + owned child monitor | Preserve capability preflight before start, abort checks between allocations, App Server before TUI, 15-second readiness timeout, output tail diagnostics/redaction, child exit => relay failure and foreground termination. Fibers only help if stderr/stdout listeners, abort hooks, timer, relay, and child all have explicit finalization. A wrapped Promise alone does not stop a native child. |
| `packages/adapters/codex/src/relay.ts:createRelay`; `binding.ts:deliver/#flush/cleanup` | Deferred for request correlation; scoped connection lifecycle; timeout effects | Relay waits 30 s for acceptance; binding waits 31 s. Timeout/socket loss means unknown input outcome and **no automatic resend**. Preserve authenticated channel boundaries, TUI thread confirmation, request ID isolation, early results before acceptance, per-turn serialized settlement, and failed settlement retry. A generic `retry(deliver)` is wrong. Control disconnect must not kill TUI collaboration indiscriminately. Keep 16 MiB queued proxy byte limit. |
| `packages/vendor/src/execution.ts:ExecutionOwner.stop/#stop/own/#dispose` | Explicit scope owning background work, with domain-specific staged stop | Current owner refuses later starts, aborts startup, waits pending starts, stops processes in reverse acquisition order. If any process stop is unconfirmed it **keeps sockets/files alive**. Failed cleanup remains retryable; concurrent stop shares attempt. Ordinary unconditional Scope close is **not equivalent**. Preserve a retryable stopping state and only close resource scope after death confirmed. Avoid deleting this state machine just because Scope exists. |
| `execution.ts:spawnNative`; `packages/terminal/src/index.ts:createTerminal/terminate/kill/dispose` | Small async exit bridge + graceful-stop timeout sequence | Native exit confirmation is authoritative. SIGTERM then SIGKILL and error if death unconfirmed. Concurrent kill shares attempt; failure permits another attempt. `dispose` waits exit, mirror idle, then releases renderer/shell integration. Do not interpret fiber interruption or sent signal as process death. |
| `packages/terminal/src/shell-integration.ts:createShellIntegration/ask` | Low-priority cancellable bounded polling | This actually polls an acknowledgement file every 10 ms for 500 ms, after PID/shell/process validation and tokenized SIGWINCH request. Silence means busy; finally removes request and clears in-flight guard. Keeping native code is reasonable unless one shared Effect lifetime already makes cancellation simpler. |
| `packages/adapters/claude/src/claude-inbox.ts:writeClaudeInbox` | Low-priority async socket bridge | Existing native socket timeout is 2 s; finish destroys socket. Successful write only confirms write completion, not vendor result. Keep protocol auth, error sanitization, and outcome tracking. A new Stream layer does not solve a present requirement. |

## Native code to retain

- node-pty spawn/write/resize/pause/resume and xterm parsing/serialization, including raw binary output. Effect does not replace these terminal capabilities.
- `terminal/src/index.ts` mirror high/low water backpressure and `boundary.ts` snapshot/live-output/resize ordering. Generic PubSub fanout must not lose the atomic attachment boundary or introduce unbounded per-viewer buffering.
- Claude JSONL byte cursor, inode/truncation detection, EOF capture, partial-line handling, relocation and session correlation; these are vendor semantics, not redundant async machinery.
- Codex WS frames, credentials, parsing/schema checks, proxy thread ownership and diagnostic sanitization. User-facing HTTP/SSE decisions do not erase the vendor's WS protocol.
- Pure transformations, parsers, terminal serialization, command building: no benefit established from wrapping each in Effect.

## Primary-source support (version-specific; do not mix APIs)

Official docs now expose both v3 and v4 paths. These findings use v3 conceptual/API names; parent should choose and pin the intended release before implementation.

- Scope supports finalizers and acquire/release; it guarantees release after successful acquisition when scope closes. This supplies ownership machinery, not the repo's conditional retention-on-failed-process-stop policy. [Effect Scope](https://effect.website/docs/v3/resource-management/scope)
- Callback integrations can use `Effect.async`; interruptible operations receive an AbortSignal. Rejecting Promises belong in `Effect.tryPromise`, not a constructor that treats rejection as a defect. [Creating Effects](https://effect.website/docs/v3/getting-started/creating-effects)
- Fibers supply structured asynchronous execution and interruption; native resource cancellation still needs an explicit bridge. [Fibers](https://effect.website/docs/v3/concurrency/fibers)
- Scheduling separates retry after failure from repetition. This fits failed observation/storage retry without turning healthy observation into polling. [Scheduling introduction](https://effect.website/docs/v3/scheduling/introduction)
- Deferred and Queue are candidates for one-shot completion and producer/consumer coordination, not automatic replacements for persistent domain maps or transactional settlement. [Deferred](https://effect.website/docs/v3/concurrency/deferred), [Queue](https://effect.website/docs/v3/concurrency/queue)

## Existing verification anchors (read, not executed)

- `packages/vendor/src/execution.test.ts`: failed cleanup retry, foreground/helper ownership, late allocation versus shutdown shared disposal.
- `packages/adapters/claude/src/claude.test.ts`: watch recovery without another event, registry replacement, relocation without cursor reset, new-session EOF independent of old settlement, retired outcome retry, terminal drain and corruption behavior.
- `claude-transcript.test.ts`: active-read retirement, partial EOF, duplicate change serialization, relocation preserving byte cursor.
- `claude-observations.test.ts`: immutable first outcome, ack rejection, session retirement, attribution without guessing from text.
- `packages/adapters/codex/src/relay.test.ts`: control loss preserves TUI, authenticated connection/thread switch gating, isolated picker IDs.
- `codex/src/index.test.ts`: helper-before-TUI readiness, separate collaboration release, rejected outcome retry, startup diagnostics/token redaction.
- `packages/terminal/src/index.test.ts`: initial listener before output, atomic attachment ordering, restore overflow recovery, shared/retryable termination, parser backpressure, mirror failure with PTY survival.
- `apps/daemon/src/agent-controller.test.ts` and `daemon.test.ts`: retryable stop and integration ownership boundaries (locations found; not exhaustively read).

Recommended order (judgment): prototype scoped Claude failure-retry/observer ownership first, then explicit startup cancellation; migrate execution owner only with staged shutdown semantics proven. Keep terminal data plane native. None of these candidates is a tested integration result.

## Ownership/package recommendation (judgment)

Keep **one** authoritative execution owner. During incremental adoption, `ExecutionOwner` remains that owner; an internal Effect scope/worker is one resource registered with `owner.own`, and startup reads `owner.signal`. Do not add a competing public Effect owner which independently kills or finalizes the same process. If fully migrating later, reimplement the existing owner contract with Effect internally, preserving its staged/retryable stop and foreground uniqueness instead of keeping two owners. A scope registered through `own` is only closed after confirmed process stop by current policy; earlier observation cancellation must be explicitly driven by the owner's abort signal without prematurely disposing process-required sockets/files.

External execution has no daemon ExecutionOwner in `agent-controller.ts`. Collaboration release revokes authority and cleans the adapter, without gaining authority to terminate an external process. Daemon execution and terminal ownership are distinct: `daemon.ts:stopRuntime` stops execution only for `executionOwnership === "daemon"` and separately kills a terminal only for `terminalOwnership === "owned"`. Effect scopes must follow both boundaries; UI SSE subscriber/WS viewer lifetime must not become execution lifetime.

Start with core `effect` only if these candidates are implemented. No evidence here requires adopting platform HTTP, Command, or Terminal abstractions. Platform Command may eventually wrap native helper process execution after parity checks, but it is **not a replacement for node-pty**, interactive PTY sizing, binary terminal output, or xterm restore/mirror behavior. Existing ws/node:fs/node:net integration can be bridged directly.


---

# Effect: daemon state, messaging, persistence (research only)

Current code facts (read, tests inspected; tests not run):
- `apps/daemon/src/web-events.ts:WebEvents.#snapshot/#schedule/#flush/connect/#send`: mutation/version retry, full snapshot reread, per-client snapshot/version, microtask state-update coalescing, blocked SSE writers, abort cleanup. `#schedule` does nothing with zero clients. This is **state publication coalescing**, not HTTP request coalescing. `web-events.test.ts` checks overlapping initial read, storage fault, equal-baseline sharing, slow reader and reconnect/close.
- `apps/daemon/src/web-state.ts:readWebSnapshot/projectHostState/projectPanels/terminalView`: combines DB snapshot with runtime/network/terminal evidence; projection policy must remain application code. `daemon.ts` wires `setSnapshot` and notify callbacks; notifications also originate in agent-controller, host-control, host-run, host-agents, panel-operations, state-api. A continuously maintained snapshot requires changing these producers to send meaningful committed changes; swapping the container alone cannot eliminate rereads.
- `messaging.ts:MessageService.#persist/#scheduleRetry/drain/#settle`: owns correlation map, one active settlement per delivery, shared retry batch/backoff, admission pause, drain. Retries persist an already chosen outcome; they do not reinject a user message. `messaging.test.ts` checks rollback when notification insertion fails, retry-original-outcome, ownership, shutdown joining and failed drain resume.
- `packages/persistence/src/sqlite/database.ts:messages.record/settle`: actual SQLite transactions already atomically insert message+deliveries and outcome+notification; settle uses conditional `outcome IS NULL`. `host-state.ts` contains many transactional mutations and projection/recovery policies. Public `AioxDatabase/MessageHistory/HostState` interfaces are Promise-based. Drizzle + better-sqlite3 are installed.
- `retention.ts:scheduleRetention/purgeExpired`: immediate run + daily interval, errors reported without killing daemon; purge currently includes operations. Operation removal means deleting that obsolete purge branch rather than porting it. `retention.test.ts` covers immediate/daily/stop.

Recommendations under user direction (HTTP+SSE, remove Operation, daemon updates current snapshot even with no clients, sequence queue + missing-sequence timeout, no request coalescing):

1. **High value: scoped reducer worker + Queue + Ref or SubscriptionRef.** A daemon-lifetime worker consumes mutation facts, updates `{sequence, snapshot}` even with zero viewers. Queue handles arrival and lifetime, but FIFO means arrival order, not arbitrary external sequence order: `expectedSequence`, pending-by-sequence, duplicate policy, and gap deadline are application logic. Apply `timeout` to waiting for the missing sequence; do not reset it on unrelated later arrivals. Decide explicit failure/resync behavior rather than silently skipping a missing change. Ref atomic modification is in-memory only, and nested objects must not be mutated after publication. [Queue](https://effect.website/docs/v3/concurrency/queue), [Ref](https://effect.website/docs/v3/state-management/ref).
2. **SubscriptionRef is a good fit for authoritative current state; PubSub is for broadcast events.** `SubscriptionRef.changes` supplies current value followed by changes from that ref, so it can remove bespoke in-memory read/subscribe handoff. It does not make separate SQLite reads plus a separate PubSub atomic. If publishing protocol deltas through PubSub, serialize snapshot capture + subscriber registration + sequence boundary in the reducer, or prove an equivalent handoff. Snapshot acquisition, restart epoch, reconnect/resync, JSON serialization, and delta application remain protocol code. [SubscriptionRef](https://effect.website/docs/v3/state-management/subscriptionref), [PubSub](https://effect.website/docs/v3/concurrency/pubsub).
3. **Stream + Scope can replace client-loop cleanup, not HTTP+SSE.** Keep Hono SSE initially. Connect scoped stream consumption to writer completion and request abort. Bounded shared PubSub can let a slow subscriber suspend the publisher and thus everyone; dropping/sliding deltas can break state reconstruction. Preserve independent slow-client handling, using explicit disconnect/resnapshot on overflow if every sequence matters. Full current snapshots may be skipped only if that policy is intended; no automatic conflation claim. Neither Stream nor Queue can automatically pause arbitrary PTY/native callback producers.
4. **Medium/high value: MessageService scheduling and ownership.** Effect fibers, scoped finalizers, Deferred (joining), and Schedule can replace manual timer/backoff/Promise bookkeeping. Preserve per-delivery ownership, fixed original result, storage-only retry, admission pause, final drain failure reporting. Do not put `Effect.retry` around `send` or `binding.deliver`: that risks duplicate external delivery. No request batching/coalescing is needed. [Schedule](https://effect.website/docs/v3/scheduling/introduction), [Repetition](https://effect.website/docs/v3/scheduling/repetition).
5. **Low standalone value: SQL rewrite.** `@effect/sql` provides effectful SQL and `withTransaction`, but cannot remove SQLite constraints, transaction boundaries, conditional settlement, or business rules. Initially wrap existing repository promises into typed Effects and keep transactions. DB commit + in-memory Ref update are not a cross-resource atomic transaction: serialize application commit/publication, update Ref only after commit, define projection failure recovery/rebuild. Effect SQL later only if unified cancellation/error/service composition earns the adapter churn. [SqlClient API](https://effect-ts.github.io/effect/sql/SqlClient.ts.html).
6. **Schema selective, not blind Zod removal.** Effect Schema covers decode/encode/type derivation and JSON Schema, useful at external boundaries. Existing protocol Zod is shared by MCP, so wholesale replacement adds adapters/duplicate definitions. Local installed SDK **1.30.0** `dist/esm/server/mcp.d.ts:registerTool` accepts `ZodRawShapeCompat | AnySchema`; `zod-compat.d.ts` defines `AnySchema = z3.ZodTypeAny | z4.$ZodType`. Thus this installed high-level MCP API is Zod-specific, despite the generic-looking name. Standard Schema/JSON Schema generation alone does not make Effect Schema acceptable there. Keep Zod at MCP boundary, or explicitly change SDK integration; this is not a universal claim about MCP protocol or every future SDK. [Effect Schema](https://effect.website/docs/v3/schema/introduction).
7. **Small win: retention fiber.** Scope + immediate Effect.repeat with daily Schedule can replace interval/stop, avoid overlapping runs if chosen. Catch/report per-run failure inside repeat so future cleanup continues. Preserve startup execution and test with TestClock. Do not make this tiny routine the justification for adopting Effect.

Required verification if implemented: no-viewer updates reflected on next connection; snapshot/subscribe mutation race; out-of-order/duplicate/missing sequence and sustained later arrivals; slow viewer cannot stall healthy viewer/reducer; overflow resync; DB failure emits no committed delta; post-commit projection failure recoverable; outcome+notification rollback; persistence retries never reinject; abort and daemon shutdown release streams/workers; native Promise cancellation is not assumed.

Version caution: current official site serves both v3 and v4 material; links above intentionally target v3 APIs. Pick the actual Effect version before code examples/dependency migration. No package installed or production/log file edited.
