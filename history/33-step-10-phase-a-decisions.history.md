# Step 10 Phase A — Pre-implementation Decisions

> 작성일: 2026-05-21
> 작성자: Claude (Opus 4.7) — 사용자와 1:1 walkthrough + 코덱스 cross-validation 6라운드 (D1·D2·D3·D4·D5-A·D6·D7) + 코덱스 직접 검증 spike 2건 (history/32, banner stderr)
> 관련 기록:
> - `history/27-step-10-codex-clear-new-rebind-spike.history.md` (in-band proxy spike, /clear/new/fork 매트릭스)
> - `history/29-step-10-per-agent-app-server-pivot.history.md` (per-agent app-server pivot)
> - `history/31-step-10-per-agent-app-server-runtime.history.md` (production direction + 2026-05-21 banner stderr 정정)
> - `history/32-step-10-per-agent-app-server-resume-spike.history.md` (resume + rebind 매트릭스 12/12)
> - `plan/mvp-implementation-checklist.md` Step 10 (line 667 이후)
> - `prd/mvp/aiox-mvp-spec.md` (Step 10 Codex per-agent app-server runtime)

---

## 배경

Step 10 (Codex per-agent app-server runtime)은 Step 9 마감 후 spike 5건 (history/27/28/29/30/31)을 거쳐 production 방향이 **per-agent Codex app-server (1:1) + `CodexAgentRuntime` product boundary**로 확정되었다 (history/31). 본 phase A는 그 production 방향 위에 implementation contract를 박는 결정 단계다.

phase A 진행 중 두 건의 코덱스 spike가 결정에 직접 반영되었다:

1. **history/32 (resume + rebind 매트릭스)** — Codex CLI v0.131.0에서 `/clear`·`/new`·`/fork`·resume + `turn/start` post-resume까지 12 케이스 매트릭스 검증. D1 wording 강화 ("validated future resume input for rollout-backed threads") + D4 injector payload 단순화 (`turn/start`는 `threadId` + `input`만) + D7 binding authority 표 확정의 권위 데이터.

2. **2026-05-21 banner verification (history/31 §"2026-05-21 Launch Banner Verification")** — `codex app-server --listen ws://127.0.0.1:0` banner가 stdout이 아니라 **stderr**에 emit됨을 직접 검증. Initial 3 runs에서 stderr-only로 관측했고, follow-up fd-level recheck에서도 Node `child_process` pipe capture 5/5 + stdout/stderr separate file capture 5/5 모두 stdout 0 bytes / stderr banner를 확인했다. 즉 Node stream artifact가 아니라 현재 Codex CLI가 fd level에서 stderr로 쓰는 동작이다. history/29의 "stdout" 표현 폐기. D2 contract를 "stderr-first + stdout/stderr both drained + stream chunk boundary non-contractual"로 정정.

본 phase A는 코드 변경 없이 결정만 닫는다. Phase B에서 코덱스 위임 라운드로 구현한다.

---

## 진행 방식

Step 6/7/8 phase A 와 동일한 사용자 ↔ Claude 1:1 walkthrough + 코덱스 cross-validation 패턴. 8개 결정으로 구성:

| Decision | Scope | Cross-validation |
|---|---|---|
| D1 | `CodexAgentRuntime` state shape (persistence boundary) | 코덱스 wording 정정 (placeholder → durable binding metadata + validated future resume input) + 코덱스 spike (history/32)로 강화 |
| D2 | per-agent app-server launch contract (5 sub) | 코덱스 정정판 confirm + refinement 4건 (per-stream ring tag / 명명 / 원칙만 lock) |
| D3 | codex `--remote` TUI launch contract (6 sub) | 코덱스 scope/handle refinement (D3.3 runtime.tui 제거, D3.6 spawn-fail 한정) |
| D4 | injector turn/start contract (7 sub) | 코덱스 cross-validation 6건 refinement (D4.7 initialize handshake 신규, D4.4 의미 제한, D4.6 codex prefix) |
| D5-A | MVP lifecycle minimum (5 sub) | 코덱스 정정 (D5-A.5 시나리오 2 TUI 종료 보장 제거, D5-A.1 race 방지 token 신호) |
| D5-B | hardening defer policy (5 항목 모두 defer) | walkthrough 아닌 directive commit |
| D6 | D6-A explicit Codex resume rebinding + D6-B reply capture defer | 사용자 terminology 정정 (hydrate → explicit resume rebinding) directive commit |
| D7 | binding uncertainty policy = id replacement policy | 사용자 framing 정정 2회 (no-auto-rebind → verified signals auto-rebind → id replacement on returned authoritative id) |

---

## 결정 사항

### D1 — `CodexAgentRuntime` state shape

**결정**: `agents.adapter_session_id`에는 **active Codex thread id 단일 string만** persist. 나머지 runtime state (endpoint / pid / process handle / health / lifecycle state / WS connection / readyz·heartbeat)는 모두 in-memory `CodexAgentRuntime`이 보관.

**채택 근거 (codex spike 후 강화)**: "durable binding metadata **and validated future resume input for rollout-backed threads**". 단순 placeholder가 아니라 실제 resume input으로 사용 가능 검증됨 (history/32 §9 — new app-server process에서 rollout-backed thread resume 성공). 단 automatic daemon-restart resume contract는 여전히 별도 product/lifecycle decision (D6에서 정리).

**Update authority**: same-client `thread/start`/`thread/fork`/`thread/resume` success response. broadcast `thread/started` 단독은 binding authority 아님.

**Reversibility**: 높음 (`adapter_session_id`는 schema에 이미 있는 nullable column, 의미 확장만).

**고려된 대안**: Option B (JSON blob with thread id + endpoint + pid) reject — schema invariant 약화. Option C (column 미사용) reject — 이미 의도된 자리.

---

### D2 — Per-agent app-server launch contract

5 sub-decision으로 묶음. D2.1 wording은 D3.4 합의 후 확장됨 (양쪽 spawn 책임 + handle ownership 명시).

#### D2.1 — Module ownership

`launcher.ts` owns spawn mechanics for **both app-server and TUI**.

- **app-server**: spawned by daemon-side flow, raw ChildProcess handle in daemon-side `CodexAgentRuntime`.
- **TUI**: spawned by CLI-side flow with `stdio: "inherit"`, raw ChildProcess handle owned by CLI process scope. **daemon-side runtime does not store the TUI ChildProcess handle in MVP**. TUI pid/exit/heartbeat metadata는 D5 lifecycle scope.

#### D2.2 — Ready signal

Banner-emitted `readyz` URL을 verbatim 추출해서 HTTP GET poll until 200. `ws://` → `http://.../readyz` 변환 path 금지. listening-only fallback은 fail-fast (MVP).

#### D2.3 — Stream drain

**stdout/stderr both drained** (stderr가 banner 채널 + log 채널 동시 역할). **per-stream ring + source tag** (`{stream: "stdout" | "stderr", chunk: ...}`). merged ring reject (banner/log 진단 흐려짐).

#### D2.4 — Timeouts

| 단계 | default | typed error |
|---|---|---|
| spawn → output banner match (stderr-first) | 5초 | `app_server_banner_parse_timeout` |
| banner readyz URL → HTTP 200 | 10초 | `app_server_readyz_timeout` |
| readyz poll interval | 200ms | — |
| 총 launch budget | 15초 | `app_server_process_exited_before_ready` |

#### D2.5 — Banner parse contract

Phase A는 **regex lock 안 함, 원칙만 박음**:

- stdout/stderr chunks accumulate (stream chunk boundary는 non-contractual)
- ANSI escape 제거 고려
- line normalize (leading whitespace 허용 — 실측 banner는 `  listening on: ...` 형태)
- `listening on` / `readyz` / `healthz` 3 token 추출
- `new URL(...)` parser로 validate
- protocol / path / **loopback host** validation (`127.0.0.1` hardcode 금지, `net.isIP` 또는 hostname whitelist로 loopback 검증)

Phase B 진입 시점에 정확한 regex/lexer, ANSI strip 실제 적용, per-stream ring capacity (256KB 권장), loopback validation mechanism 결정.

**검증된 사실 (D2 권위 데이터)**:

- `codex app-server --listen ws://127.0.0.1:0` banner는 **stderr**에 emit. Initial 3 runs + follow-up fd-level recheck (pipe capture 5/5, separate stdout/stderr file capture 5/5) 모두 stdout 0 bytes / stderr banner (history/31 §"2026-05-21 Launch Banner Verification")
- banner 3 token: `listening on: ws://127.0.0.1:<assigned>` / `readyz: http://127.0.0.1:<assigned>/readyz` / `healthz: http://127.0.0.1:<assigned>/healthz`
- Node 18 fetch로 emitted readyz GET → HTTP 200

---

### D3 — codex `--remote` TUI launch contract

6 sub-decision. scope는 spawn-and-rollback까지만 — "process가 살아서 어떻게 죽는지"는 D5.

#### D3.1 — Command shape

attach 시 `codex --remote <banner-ws-url>`. resume case는 D6에서 별도 (`codex resume <id> --remote ...`).

#### D3.2 — Launch timing

TUI spawn은 D2/D4 startup sequence가 완료된 뒤 수행한다:

```
readyz 200 → daemon-side WS connect → JSON-RPC initialize → runtime ready
→ TUI spawn
```

여기서 금지하는 "추가 check"는 **TUI path에 대한 별도 WS sanity check**다. daemon-side WS connect/initialize는 D4에서 runtime ready 조건으로 채택된 startup sequence 일부이며, TUI launch 전에 완료되어야 한다.

#### D3.3 — Handle boundary

daemon runtime은 `runtime.appServer`만 보관. **TUI ChildProcess handle은 CLI local scope only**. daemon-side `runtime.tui` flat field는 MVP에서 생성하지 않음. TUI pid/exit/heartbeat metadata는 D5 lifecycle scope에서 RPC 형태로 정의.

#### D3.4 — stdio / foreground process model ⭐

**CLI-child TUI with `stdio: "inherit"`, CLI stays parent**. daemon-child TTY pass-through (FD passing / SCM_RIGHTS)는 MVP 진입 금지.

근거 3가지:
1. TTY semantics 자명 — `stdio: "inherit"`이 Node `child_process` 표준 동작.
2. Lifecycle hook 자연 — CLI가 TUI exit code 직접 관찰 → daemon notify (D5-A의 `notifyTuiExited`).
3. Docker `docker run -it` 멘탈 모델과 정합 (CLI lifetime = TUI lifetime).

#### D3.5 — `--no-alt-screen`

production default = flag 없음 (alt-screen on). `--no-alt-screen`은 spike-only convenience (history/27·32 frame 관찰용).

#### D3.6 — Launch failure atomicity

**spawn/exec 자체 실패에 한정** (ENOENT/EACCES 등). `tui_launch_failed` typed error는 "process could not be spawned"에만 적용. 성공 spawn 후 비정상 exit은 D5 "TUI exit 처리" 영역.

Failure cascade: CLI spawn → ENOENT/EACCES catch → daemon에 startup rollback RPC 호출 (`rollbackAgentAttach`, D5-A.1) → app-server kill + agent state reverts → CLI typed exit.

---

### D4 — Injector (turn/start) contract

7 sub-decision (D4.7 initialize handshake 신규 추가).

#### D4.1 — WS client owner

`CodexAgentRuntime`이 persistent WS client owning. `injector.ts`는 thin call site.

#### D4.2 — WS lifetime

persistent. attach 시점 connect + initialize. detach 시 close.

#### D4.3 — Request id

per-client monotonic numeric counter + pending Map (Step 9 socket-transport pattern 재사용).

#### D4.4 — Response semantic ⭐

**결정 문구**:
```
inject() succeeds when the app-server acknowledges the turn/start request
and the acknowledged thread id matches the runtime active thread id.
```

D4 delivery `completed` = **"Codex app-server accepted the injected turn"**, NOT "the model completed successfully".

Post-accept failures는 D4 범위 밖:
- auth / quota 만료
- model error
- TUI 종료
- app-server crash
- `turn/completed` failure

→ 각각 D5 (lifecycle) / D6 (reply capture) / D7 (binding) / Open Product Issue #4 (delivery timeout) / Open Product Issue #5 (session expiry).

Phase B에서 `turn/start` response vs `turn/started` notification 정확한 frame 결정 — Phase A wording은 frame 이름 lock 안 함.

#### D4.5 — Concurrency

Router fan-out **remains sequential for MVP** because inject waits only for turn/start acceptance. **Each inject must still have a bounded ack timeout** so one target cannot block the rest indefinitely. timeout 값 자체는 Open Product Issue #4와 묶어 후속 결정.

#### D4.6 — Error 분류 (codex-prefixed typed reason union)

`src/adapters/contract.ts` `AdapterInjectResult` reason union을 직접 확장 (i 분기):

- `codex_app_server_unavailable`
- `codex_app_server_ws_connect_failed`
- `codex_app_server_ws_initialize_failed`
- `codex_turn_start_timeout` (reserved, default value lock 없음)
- `codex_jsonrpc_error` (code + message passthrough, stale binding 등 generic 포함)
- `codex_resume_failed` (D6 신규)
- `codex_binding_uncertain` (D7 신규)

#### D4.7 — JSON-RPC `initialize` handshake (신규)

attach 시점 WS open 직후 local JSON-RPC `initialize` handshake (`clientInfo` / `protocolVersion` / `capabilities`). **OpenAI auth와 무관** — local app-server protocol handshake. success response 후 runtime ready.

실패 reason: `codex_app_server_ws_initialize_failed`.

#### D2 launch sequence 누적 확장 (D4 합의 후 최종)

```
spawn app-server
  → banner parse (stderr-first, stdout/stderr drain)
  → banner readyz URL HTTP GET 200
  → WS connect
  → JSON-RPC initialize handshake
  → runtime ready
```

WS connect / initialize 실패 모두 startup failure cascade (D3.6 atomicity)에 편입.

---

### D5-A — MVP lifecycle minimum

사용자 분리 결정에 따라 D5는 두 레이어로 진행. D5-A는 5 sub-decision으로 MVP lifecycle minimum 정의.

#### D5-A.1 — Startup rollback RPC

`rollbackAgentAttach(agentName, [token?])`. agentName 기준 idempotent.

- attach-ready 이전 startup rollback 의미. detachAgent (attach-ready 이후 graceful release)와 구별 명확.
- MVP surface는 agentName-only로 시작. **RPC signature는 runtimeId / attachAttemptId를 받을 수 있게 열어둠** — race 방지 (빠른 재attach 시 오래된 CLI rollback이 새 runtime kill 가능).
- Phase B에서 plumbing 비용 낮으면 token 추가.

#### D5-A.2 — Failure boundary

**attach-ready event 기준**.

- runtime internal state machine: `starting → ready → failed | disposed`
- attach-ready event = "spawn + banner + readyz + WS connect + initialize 모두 success"
- attach-ready **전** failure → rollback path (D5-A.1 + D3.6 cascade)
- attach-ready **후** failure → lifecycle path (D5-A.3)

#### D5-A.3 — WS/process drop 감지

**Event listener only** (WS `close` + child `exit`). periodic healthz poll은 D5-B로 분리.

**자동 reconnect 없음** (사용자 선호 explicit fail-fast).

typed lifecycle reasons:
- `app_server_process_exited` (exit code + signal 정보 포함)
- `ws_dropped` (close code + 사유 포함)

#### D5-A.4 — Agent state 전이

involuntary failure + graceful detach 모두 `disconnected`로 전이.

**state enum 확장 없음** — `stale`은 Open Product Issue #3 그대로 deferred.

차이는 events table에 typed event로 기록:
- `agent_runtime_failed` (failure path)
- `agent_graceful_detach` (graceful path)

#### D5-A.5 — Detach 순서

**daemon-side는 app-server cleanup까지만 보장**:

```
daemon WS close → SIGTERM app-server → 3s grace → SIGKILL
```

**TUI 종료는 daemon 책임 밖** — D3.4에서 TUI는 CLI-child이고 daemon은 TUI ChildProcess handle을 갖지 않음. 별도 터미널 `aiox detach alpha`가 TUI를 직접 kill 못 함. TUI가 WS drop을 관찰해 자연 종료한다는 가정은 Codex CLI 동작에 의존하는 추정이라 **보장하지 않음**. TUI process termination / UX는 CLI-side lifecycle 또는 D5-B (TUI metadata) 영역.

신규 daemon RPC 3종:
- `rollbackAgentAttach(agentName, [token?])` — attach-ready 이전
- `detachAgent(agentName)` — attach-ready 이후 graceful cleanup
- `notifyTuiExited(agentName, exitCode, signal?)` — CLI가 child TUI 종료를 daemon에 알림, idempotent, 내부적으로 detachAgent와 같은 cleanup code path 재사용 가능. **단 CLI가 살아 있고 TUI가 실제 exit했을 때만 가능** (별도 터미널 detach 시 CLI notify 보장 없음). Phase B에서 detachAgent와 통합 여부 결정.

신규 events: `agent_runtime_failed`, `agent_graceful_detach`.

---

### D5-B — MVP hardening defer policy

walkthrough 아닌 directive commit. 5 항목 모두 defer + MVP invariant 못박음.

| 항목 | MVP 결정 | Defer 대상 |
|---|---|---|
| Zombie defense | MVP 진입 금지 (Linux-only `PR_SET_PDEATHSIG` / process group / setsid 모두 배제) | Step 12 doctor/cleanup 후보 (stray app-server cleanup) |
| Periodic healthz poll | MVP 진입 금지 (D5-A.3 event listener로 충분) | Step 12 doctor/status (on-demand check) |
| WS reconnect | MVP 진입 금지 (D5-A.3 재확정, transient drop도 자동 재연결 안 함) | Post-MVP iteration |
| TUI pid/heartbeat metadata | MVP 진입 금지 (daemon은 TUI ChildProcess handle 미보유, `notifyTuiExited` 한 RPC로 충분) | Post-MVP (lifecycle observability surface) |
| Graceful shutdown 미세조정 / process group | MVP 진입 금지 (D5-A.5 그대로) | Post-MVP (multi-process isolation 영역) |

**MVP invariant (D5-A + D5-B 통합)**:

```
Daemon manages exactly one direct child per Codex agent: the app-server.
Cleanup is WS close → SIGTERM → 3s grace → SIGKILL. No process group kill,
no setsid, no PR_SET_PDEATHSIG, no periodic healthz, no auto-reconnect,
no TUI heartbeat. TUI lifecycle is owned by the CLI process scope.
```

이 invariant를 넘는 hardening 잠입은 Phase B에서 reject.

---

### D6 — Explicit Codex resume rebinding (D6-A) + Reply capture defer (D6-B)

사용자 terminology 정정: ~~"hydrate"~~ → **"explicit Codex resume rebinding"**.

**Terminology lock**: aiox MVP의 "resume" = **user-explicit Codex session id rebinding via CLI flag**. NOT daemon auto-recovery on restart / DB metadata 자동 재연결 / "hydrate" (어휘 금지).

#### D6-A.1 — Daemon restart 시 DB metadata 취급

daemon restart 후 DB `agents.adapter_session_id`를 **읽는 것은 가능**, 하지만 active runtime 취급 **금지**. last-known Codex session id metadata only. agent state는 `disconnected` (Step 2/3 invariant 그대로). app-server / WS / TUI는 memory-only라 restart 후 존재 안 함.

#### D6-A.2 — Automatic resume 금지 (invariant)

daemon restart 시 DB의 `adapter_session_id`를 보고 자동 `codex resume` 발사 **안 함**. daemon은 사용자 resume 의도 추측 금지. TUI는 terminal foreground 필요 → daemon이 자동 TUI launch 불가. resume = user explicit command only.

#### D6-A.3 — CLI shape

**채택**: `aiox codex --name alpha --resume <session-id>` (codex launch command의 `--resume` flag).

**reject**: `aiox codex resume alpha <session-id>` (별도 동사형 command).

**MVP CLI flags 정리**:
- `--resume <session-id>` 단일 flag만.
- 추가 `fallback` / `force` / `new-thread` flag **없음**.
- resume 실패 시 fail-fast.
- returned thread id mismatch 시 binding 안 함.
- DB last-known id로 자동 resume 안 함.
- 새 thread 자동 생성 fallback 안 함.

#### D6-A.4 — 내부 실행 흐름 (사용자 `--resume` 지정 시)

resume case도 D2/D4 startup sequence가 동일하게 필요 (이유: `codex resume <session-id> --remote <endpoint>` 실행 전에 per-agent app-server endpoint가 먼저 있어야 함).

```
1. app-server spawn
2. process output banner parse (stderr-first, stdout/stderr drain)
3. readyz 200
4. daemon-side WS connect + JSON-RPC initialize
5. CLI launches:
   codex resume <session-id> --remote <assigned-app-server-endpoint>
   (D3.4 CLI-child, stdio: "inherit")
6. same-client `thread/resume` success response 확인
7. returned thread id === requested session id일 때
   agents.adapter_session_id rebind
```

attach case와의 차이는 **step 5의 TUI command 형태만** (`codex --remote` vs `codex resume <id> --remote`).

#### D6-A.5 — Resume rebind authority

D1 binding authority 표 그대로 (history/32 §"MVP policy"):

```
resume = same-client thread/resume success
       + returned id === requested id  ← rebind 조건
resume failure → typed error: codex_resume_failed
              → no silent replacement binding
              → D3.6 atomicity cascade로 app-server cleanup + agent attach 실패
```

empty-thread resume 실패 (history/32 §7) 같은 fail case도 동일 처리.

#### D6-B — Reply capture / message graph (defer)

**Step 10 MVP 밖**으로 defer. 대상:
- `turn/completed` 및 item events를 aiox reply message로 변환
- `parent_message_id` linking (Step 8 D3에서도 이월된 round-trip)
- Codex output을 aiox message graph에 wire하는 surface

이유: D6-A만으로 "사용자가 explicit하게 resume할 수 있다" MVP 완결. reply capture는 Codex output stream 처리 + message type 확장 + parent linking → Step 10 단독 결정 불가, Step 11 Claude adapter와 cross-cut.

대상 step: Step 11 진행 중 또는 그 후 별도 decision.

#### D6 금지 사항 invariant 5개

```
1. daemon restart 후 자동 resume 금지.
2. DB의 last-known adapter_session_id를 사용자 의도 없이 자동 재개 금지.
3. "읽었으니 active runtime 복구됨" 같은 표현 금지.
4. `aiox codex resume alpha` shape는 후보에서 reject.
5. daemon이 사용자 resume 의도를 추측/유추하는 code path 금지.
```

#### D1 wording 의미 구체화

D1의 "validated future resume input for rollout-backed threads"의 "future resume input" = **explicit user-provided session id resume via `--resume` flag**, automatic 아님. D1 결정 자체에 변경 없음, 해석만 못박음.

---

### D7 — Binding uncertainty policy (= id replacement policy)

사용자 framing 정정 2회 후 최종 commit. ~~"thread id mismatch 시 injection pause/fail"~~ → ~~"no auto rebind, fail-fast"~~ → **"id replacement on returned authoritative id"**.

#### D7 policy (한 줄)

```
When Codex returns an authoritative thread/session id for the paired agent,
aiox replaces the previous binding id with that returned id.
```

#### Core 동작

```
existing binding id = X
Codex operation returns authoritative id = Y
aiox replaces binding X → Y
```

#### 권위 returned id를 생성하는 operation (3종)

| Operation | 교체 조건 |
|---|---|
| `/clear`, `/new` | returned `thread/start` id replaces previous `activeThreadId` |
| `/fork` | returned fork id replaces previous `activeThreadId` **when `forkedFromId === previous activeThreadId`** |
| Explicit resume (D6) | returned resume id replaces binding **when `returned id === requested id`** |

#### Replacement이 발생하지 않는 경우

- **No authoritative returned id available** → do not replace (현재 binding 유지)
- **Returned id conflicts with expected** (forkedFromId mismatch / resume id mismatch / inject ack mismatch) → fail-fast, no replacement
- **Single notification only** (`thread/started` 단독) → not an authoritative returned id, no replacement

#### Negative invariant (D7 단순화)

```
1. Replacement은 authoritative returned id가 있을 때만 발생한다.
2. id 부재 / mismatch / 단독 notification은 replacement 발생시키지 않는다.
3. 자동 새 thread 생성 / 자동 resume fallback / 자동 recovery 없음.
4. 사용자 explicit action (detach + 재attach 또는 --resume)으로만 정상화 가능.
```

#### Returned-id acquisition은 Phase B 첫 검증

D7 policy 자체는 frame visibility와 독립이다. 정책은 "Codex operation이 authoritative id를 반환하면 기존 binding id를 그 returned id로 교체한다"이다.

다만 Phase B 구현은 **production topology에서 그 returned id를 어떤 경로로 obtain할지**를 먼저 검증해야 한다. 특히 D6 explicit resume과 D7 `/clear`·`/new`·`/fork` rebind는 returned-id acquisition path가 확정된 뒤 구현한다.

Phase B Round 1 first verification:

- aiox daemon WS client가 TUI-originated `thread/start` / `thread/fork` / `thread/resume` success response 또는 동등한 authoritative returned id를 볼 수 있는가?
- 볼 수 있다면 그 frame/context를 D7 authority input으로 사용한다.
- 볼 수 없다면 production path는 추가 observation strategy를 선택해야 한다:
  - aiox-initiated authoritative read/poll API가 있는지 확인
  - proxy fallback을 재검토
  - 또는 TUI-originated returned-id replacement 범위를 축소하고 explicit `--resume`/fresh attach로 제한

이 항목은 "정책 변경"이 아니라 D7 정책 구현의 first blocker다.

#### Typed reason / event 정리

**Reasons** (`AdapterInjectResult` + lifecycle, D4.6 + D6 + D7 통합):
- `codex_app_server_unavailable`
- `codex_app_server_ws_connect_failed`
- `codex_app_server_ws_initialize_failed`
- `codex_turn_start_timeout` (reserved)
- `codex_jsonrpc_error`
- `codex_resume_failed` (D6)
- `codex_binding_uncertain` (D7)

**Events** (events table, D5-A + D7 통합):
- `agent_runtime_failed` (D5-A)
- `agent_graceful_detach` (D5-A)
- `agent_thread_id_rebound` (D7 replacement 발생 시 진단)
- `codex_binding_uncertain_observed` (D7 mismatch 진단)

#### User explicit resolution path

binding 정상화는 사용자 explicit action 으로만:
- `aiox detach <name>` + `aiox codex --name <name>` (fresh attach, 새 thread)
- 또는 `aiox detach <name>` + `aiox codex --name <name> --resume <session-id>` (D6 explicit resume)

별도 정정 명령 surface 신규 도입 **없음**.

---

## Open Follow-up (Phase B 진입 시 결정)

| 항목 | 근거 |
|---|---|
| D2.5 정확한 regex/lexer 구문 | D2.5 Phase A에서 lock 안 함 |
| D2.5 ANSI escape stripping 실제 적용 여부 | 관측 banner에는 ANSI 없었으나 forward-compat |
| D2.5 per-stream ring capacity | 256KB 권장 |
| D2.5 loopback validation mechanism | `net.isIP` + IPv4/IPv6 loopback 검증 vs URL `hostname` whitelist |
| D5-A.1 startup rollback RPC token plumbing | runtimeId / attachAttemptId 추가 비용 평가 |
| D5-A.5 `notifyTuiExited` ↔ `detachAgent` 통합 여부 | Phase B Round 1 |
| D4.4 `turn/start` response vs `turn/started` notification 정확한 frame | spike data 추가 검토 |
| D4.5 bounded ack timeout 실제 값 | Open Product Issue #4와 묶음 |
| D7 returned-id acquisition path | Phase B first verification: aiox WS가 authoritative returned id를 볼 수 있는지 확인 후 broadcast 관찰 / aiox-initiated request / polling / proxy fallback / scope 축소 중 결정 |

---

## Deferred (Out-of-scope for Step 10 MVP)

| 항목 | Defer 대상 |
|---|---|
| Reply capture / message graph (D6-B) | Step 11 이후 별도 decision |
| Session expiry handling (Open Product Issue #5) | Step 11 이후 별도 step ([[aiox-deferred-decisions]]) |
| Delivery timeout default value (Open Product Issue #4) | Step 10/11 모두 끝난 뒤 |
| Stale agent transition policy (Open Product Issue #3) | Post-MVP |
| Stray app-server cleanup (D5-B) | Step 12 doctor/cleanup |
| On-demand healthz check (D5-B) | Step 12 doctor/status |
| WS reconnect policy (D5-B) | Post-MVP iteration |
| TUI heartbeat/pid metadata (D5-B) | Post-MVP (lifecycle observability) |
| Process group / detached / setsid (D5-B) | Post-MVP (multi-process isolation) |

---

## Phase B 구현 Surface (Phase A 결정 누적)

Phase B에서 구현해야 하는 표면:

### 신규 파일

- `src/adapters/codex/runtime.ts` — `CodexAgentRuntime` (D1 + D2 + D4 + D5-A 상태 owning)
- `src/adapters/codex/launcher.ts` — spawn mechanics for app-server + TUI (D2.1 + D3.1)
- `src/adapters/codex/app-server.ts` — app-server endpoint / process metadata (D2)
- `src/adapters/codex/websocket.ts` — WS client utilities, JSON-RPC initialize (D4 + D4.7)
- `src/adapters/codex/injector.ts` — thin call site for runtime.injectTurnStart (D4.1)

### 기존 파일 확장

- `src/adapters/contract.ts` — `AdapterInjectResult` reason union 확장 (D4.6 codex-prefixed reasons)
- `src/store/repositories/agents.ts` — `adapter_session_id` write path (D1 + D6 + D7 rebind)
- `src/daemon/api.ts` — daemon RPCs 신규: `rollbackAgentAttach`, `detachAgent`, `notifyTuiExited` (D5-A.5)
- `src/core/events.ts` 또는 events table consumer — `agent_runtime_failed` / `agent_graceful_detach` / `agent_thread_id_rebound` / `codex_binding_uncertain_observed`
- `src/bin/aiox.ts` + `src/cli/invocation.ts` + `src/cli/parser.ts` — `aiox codex --name <name> [--resume <session-id>]` flag (D6-A.3)

### Runtime 내부 state machine

```
starting → ready → failed | disposed
```

attach-ready event boundary (D5-A.2).

### MVP invariant (Phase B reject 기준)

```
Daemon manages exactly one direct child per Codex agent: the app-server.
Cleanup is WS close → SIGTERM → 3s grace → SIGKILL. No process group kill,
no setsid, no PR_SET_PDEATHSIG, no periodic healthz, no auto-reconnect,
no TUI heartbeat. TUI lifecycle is owned by the CLI process scope.
```

---

## Authority 정합화

본 phase A 마감 후 갱신 대상 (Phase B 위임 prompt에서 코덱스가 처리):

- `plan/mvp-implementation-checklist.md` Step 10 — Phase A 결정 8건 흡수
- `prd/mvp/aiox-mvp-spec.md` — D6-A explicit resume CLI flag surface 추가 (`--resume <session-id>`)
- 메모리 동기화 (`aiox-step-progress.md` 이미 진행 중, 마감 시 한 줄 정리)

---

## Status

- 2026-05-21: Phase A 8개 decision 모두 closed. 코드 변경 없음 (spike 코드만, production code 0줄).
- 다음 단계: Phase B 구현 위임 (코덱스).
