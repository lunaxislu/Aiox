# Codex Loaded-Thread Binding — Analysis & Open Decisions

## Status

- Date: 2026-05-25
- Author: Claude (Opus 4.7), 사용자 review request 기반.
- Scope: Step 14 follow-up으로 들어간 두 commit (`e152adc` "prefer visible
  codex thread candidate", `5423b2c` "keep codex replies on latest loaded
  thread") 의 review 과정에서 드러난 **구조적 binding 문제** 정리.
- Authority context: `history/40-step-14-daemon-client-split.history.md` (Step
  14 진행), `prd/mvp/aiox-mvp-spec.md` Message Flow, Step 10 Phase A D6/D7
  결정 (`history/33` / `history/31`).

이 문서는 **결정 문서가 아니다.** Step 14 smoke 사이클에서 발견된 일련의
회귀가 단일 fix 문제가 아니라 더 깊은 *관찰 부재* 문제임을 정리하고, 추후
결정에 필요한 *재료*만 박아둔다. 어떤 fix 방향을 선택할지는 별도 결정
walkthrough 대상.

## Problem 진입 경로

Step 14 smoke 도중 사용자가 manual로 발견한 회귀 두 건:

1. **콜드 스타트 회귀**: register 직후 첫 reply가 daemon에서는 `completed`로
   찍히지만 사용자 Codex TUI에 안 보임. → fix `e152adc` ("prefer non-cached").
2. **`/clear` 후 회귀**: cold 1회 round-trip 성공 → codex `/clear` 후 round
   성공 → claude `/clear` 후 reply가 다시 daemon `completed`로 찍히지만 TUI에
   안 보임. → fix `5423b2c` (`at(-1)`).

두 회귀 모두 daemon RPC는 success, TUI는 무반응이라는 동일한 외부 증상.
두 번째 회귀는 첫 번째 fix가 도입한 휴리스틱의 가정이 시간에 따라 뒤집힌
결과였다 (아래 트레이스 참조).

## 핵심 개념: orphan thread

aiox 내부 용어. **Codex app-server에 loaded 상태로 남아 있지만 사용자 TUI
화면엔 안 보이는 thread.**

aiox 입장의 정의이며, Codex app-server 입장에서는 모두 동등하게 "loaded
thread"다 — distinction이 없다.

### Orphan이 생기는 시나리오

`src/daemon/state.ts:589-590` + `src/adapters/codex/launcher.ts:79-81` +
runtime API 관찰 + `grep -r "thread/unload\|thread/close" src/` (0건) 기반.

| # | 시나리오 | 누가 만드나 | 발생 빈도 |
|---|----------|------------|----------|
| 1 | Register without `--resume` | daemon이 `runtime.startThread()` 호출, TUI도 따로 `thread/start` | 모든 fresh attach 1회 |
| 2 | TUI 내부 `/clear` 또는 `/new` | TUI가 새 thread 생성, 이전 thread는 loaded로 남음 | 사용자 행위마다 |
| 3 | TUI 내부 `/fork` | TUI가 fork thread 생성, 원본 또는 fork 중 사용자가 안 보는 쪽이 orphan | 사용자 행위마다 |
| 4 | TUI 내부 thread resume (TUI 메뉴) | 이전 활성 thread가 loaded로 남음 | 사용자 행위마다 |
| 5 | Daemon restart | 옛 app-server SIGTERM으로 thread 휘발, 새 attach가 #1 반복 | restart마다 |

`--resume <session-id>`로 attach하면 daemon은 `resumeThread(id)`, TUI는
`codex resume <id> --remote ...` (launcher.ts:80) 둘 다 같은 id를 가리켜
시나리오 #1 orphan은 생기지 않는다. 단 사용자의 TUI 행위(#2~#4)는 그대로
적용.

### 핵심 관찰

- **Codex app-server는 unload 개념이 없다.** `thread/unload`, `thread/close`
  같은 RPC가 source code에 0건. loaded list는 app-server 프로세스가 죽기
  전까지 단방향으로 자란다.
- **시나리오 #2~#4는 사용자의 TUI 내부 행위라 aiox가 막을 수 없다.** 막을
  수 있는 건 시나리오 #1 (register-time `thread/start`) 뿐.

## 현재 fix (5423b2c) 와 그 가정

`src/daemon/state.ts:selectCodexLoadedThreadId`:

```ts
function selectCodexLoadedThreadId(loadedThreadIds): string | null {
  return loadedThreadIds.at(-1) ?? null;
}
```

`cachedThreadId` 인자 제거. cache 무관, list 끝만 본다.

### 이게 의존하는 두 가정

| 가정 | spec 보장 | 실측 |
|------|----------|------|
| (A) `thread/loaded/list` 정렬 = 생성 시각 오름차순 (hidden-first, current-last) | **없음** | 사용자 manual smoke 2회 (cold, /clear 후) |
| (B) 사용자 TUI focus = 마지막에 생성된 thread | **없음** | `/clear`·`/new`엔 부합. `/fork`·내부 resume엔 부합 보장 없음 |

두 가정 모두 Codex CLI 동작에 대한 실측 기반이며, future Codex 업데이트에서
정렬이 바뀌면 무성으로 깨질 수 있다 (daemon RPC는 success, TUI 무반응).

## 회귀 두 건의 상세 트레이스

다음 트레이스는 daemon cache(`agents.adapter_session_id`)와 `thread/loaded/list`
가 시간에 따라 어떻게 변하는지 추적한다. 가정 (A) 위에서 작성.

### Round 1 — cold start

| 시점 | daemon cache | loaded list | 휴리스틱 선택 | 결과 |
|------|--------------|-------------|--------------|------|
| Register | `D1` (daemon-hidden) | `[D1]` | — | — |
| TUI 열림 | `D1` | `[D1, T1]` | — | — |
| claude reply 도착 (이전 fix `non-cached`) | `D1` | `[D1, T1]` | `T1` | ✓ TUI 표시 |
| Rebind | `T1` | `[D1, T1]` | — | — |

이전 fix는 여기까지 정확. 가정: "cached는 hidden, 다른 건 visible".

### Round 2 — codex `/clear` 후 reply

| 시점 | daemon cache | loaded list | 휴리스틱 선택 | 결과 |
|------|--------------|-------------|--------------|------|
| /clear 후 | `T1` | `[D1, T1, T2]` | (이전 fix) non-cached 첫 항목 → `D1` 또는 `T2` | 운에 맡김 |
| 사용자가 ✓로 본 케이스 | | | (T2가 첫 비-T1로 뽑힌 경우) | ✓ |

여기서 사용자가 성공으로 본 건 list 순서가 D1보다 T2가 먼저 (또는 D1이 이미
없어진 케이스). 즉 이전 fix는 이 시점에도 운 좋게 작동한 것뿐.

### Round 3 — claude `/clear` 후 reply (회귀 발견)

| 시점 | daemon cache | loaded list | 휴리스틱 선택 | 결과 |
|------|--------------|-------------|--------------|------|
| claude `/clear` 후 | `T2` | `[D1, T1, T2]` (또는 더 길게) | (이전 fix) non-cached 첫 항목 → `D1` 또는 `T1` | ✗ orphan 명중 |
| daemon RPC | | | turn/start(orphan) success | status=completed |
| TUI | | | (가시 thread T2에 안 들어감) | 무반응 |

이게 사용자가 본 회귀. **휴리스틱이 정상 상태에서 거꾸로 작동**한 결과.

### 현재 fix (`at(-1)`)로 다시 트레이스

| Round | loaded list | `.at(-1)` | 결과 |
|-------|-------------|-----------|------|
| 1 (cold) | `[D1, T1]` | `T1` | ✓ |
| 2 (`/clear` 후) | `[D1, T1, T2]` | `T2` | ✓ |
| 3 (claude `/clear` 후) | `[D1, T1, T2]` | `T2` | ✓ |
| 4 (codex `/clear` 다시) | `[D1, T1, T2, T3]` | `T3` | ✓ |

가정 (A)+(B) 위에서 모든 round에서 가시 thread 명중. 사용자 manual로 round
1·2·3 검증됨.

## 시나리오 × 현재 코드 동작 평가

각 orphan 시나리오에 대해 현재 fix가 어떻게 동작하는지.

| 시나리오 | 현재 동작 (`at(-1)`) | 검증 상태 | 위험도 |
|---------|---------------------|----------|--------|
| #1 Register cold | ✓ 작동 | 사용자 manual | 낮음 |
| #2 `/clear`·`/new` | ✓ 작동 | 사용자 manual | 낮음 |
| #3 `/fork` (사용자가 fork로 이동) | ✓ 가정상 작동 | **미검증** | 낮음 |
| #3 `/fork` (사용자가 원본 잔류) | ✗ 가능성 (orphan = fork된 thread) | **미검증** | **중** |
| #4 TUI 내부 resume | ? (list 순서 동작 미지) | **미검증** | **중** |
| #5 Daemon restart | ✓ 시나리오 #1과 동치 | 시나리오 #1로 환산 | 낮음 |

`/fork`·내부 resume은 spec/소스 확인 없이 추론 상태. 만약 깨지면 동일한
"daemon completed, TUI 무반응" 증상으로 발견될 것.

## 구조적 분석 — Rebind 문제가 아니다

이번 사이클 회귀들은 표면적으로 *cache가 잘못된 값을 가리키는* 문제처럼
보이지만, Codex의 fix(`5423b2c`)가 *cache를 아예 안 본다*는 사실에서 알 수
있듯 본질은 **rebind 문제가 아니다**.

### 3-layer 모델

```
[Layer 3] Rebind 정책 (Step 10 D7)
   = "authoritative returned id가 오면 cache를 그 id로 교체"
   = 반응(react) 메커니즘. 신호가 들어왔을 때 어떻게 처리할지.
   → 잘 박혀 있음.
   ↑ 의존
[Layer 2] "어느 thread가 가시인가" 판정 휴리스틱
   = `non-cached`(이전 fix) → `at(-1)`(현재 fix)
   = list 순서·cache 위치 같은 *간접 신호*로 추론.
   → 지금 약한 곳, fix마다 휴리스틱이 바뀜.
   ↑ 의존
[Layer 1] TUI focus 관찰 채널
   = "지금 사용자가 보는 thread"를 daemon이 직접 알 수단.
   → 부재. 그래서 Layer 2가 휴리스틱으로 메움.
```

회귀 모두 Layer 1 부재로 Layer 2가 약하고, Layer 2가 틀릴 때마다 Layer 3의
cache가 잘못 박히는 패턴.

### Rebind는 정상

`agents.rebindAdapterSessionId` (`src/store/repositories/agents.ts:217`) +
dispatch 경로의 가드(`state.ts:1146-1166`)는 정확히 D7 정책대로 동작.
잘못된 입력이 들어오면 잘못된 id로 rebind되는 것뿐이다. 정책 자체에는
문제가 없다.

## 결정 필요 항목

아래는 결정안이 아니라 **결정해야 할 것**의 카탈로그.

### (a) Register 시 `thread/start` 생략

- 변경: register에서 `runtime.startThread()` 호출 제거,
  `agents.adapter_session_id`를 null로 둠. 첫 dispatch 시점에 loaded list
  에서 정착시킴.
- 비용: Step 10 D7 invariant 약화 (현재 "adapter_session_id는 항상
  authoritative id"). "register 직후엔 null 허용"으로 wording 변경 필요.
  D6-A.4 startup sequence는 영향 없음 (resume 케이스는 `resumeThread` 그대로).
- 효과: 시나리오 #1 (모든 fresh attach의 hidden D1) 영구 차단.
- **한계: 시나리오 #2~#4 (사용자 TUI 행위)는 그대로**. orphan 누수원이
  줄어들 뿐 근본 해결은 아님.

### (b) TUI focus 관찰 채널 확보

- 변경: Codex app-server가 "현재 활성/focused thread"를 알려주는 RPC가
  있는지 조사 (예: `thread/active`, `thread/focused` 류). 있으면 휴리스틱
  전부 폐기, 직접 그 id 사용.
- 비용: Codex CLI source / WS protocol 조사 spike 1회. RPC 존재 여부는 미지.
- 효과: 휴리스틱 부재. 시나리오 #2~#4 모두 deterministic 처리.
- **선결 조건**: RPC가 실제로 존재해야 가능. 없다면 (a)와 휴리스틱
  보강(c)으로 버틸 수밖에 없음.

### (c) 현재 휴리스틱 유지 + 시나리오 발견 시 패치

- 변경: 없음. `at(-1)` 그대로.
- 비용: 단기 0, 장기 회귀 비용.
- 효과: cold·/clear는 안정. `/fork`·내부 resume에서 회귀 가능성 남음.
- **현재 default 경로**. (a)/(b) 결정 전까지 자동 적용.

### 권고 순서 (분석 결과)

1. **(b) 먼저 조사**. RPC 존재 여부가 (a)/(c) 결정의 input이 된다. spike
   1회 비용으로 가능성 큰 가지를 잘라낼 수 있음.
2. (b)가 없으면 → **(a) 결정**. orphan 누수원 최소화로 (c) 휴리스틱이 다룰
   케이스 줄어듦.
3. (a) + (c) 조합으로 MVP scope 닫고, post-MVP에 `/fork`·내부 resume 회귀
   smoke 추가.

## Verification 한계

이번 분석에서 *검증된 것*과 *추론*을 명확히 분리.

### 검증된 것

- 분석 당시 daemon이 register 시 `thread/start`를 호출하던 구조 → 코드 직접 확인
  (`state.ts:589-590`). 2026-05-25 follow-up에서 no-resume attach 경로는
  이 호출을 제거했다.
- TUI launcher가 thread id 인자 없이 `codex --remote` 실행 → 코드 직접 확인
  (`launcher.ts:79-81`).
- 시나리오 #1, #2, #3(claude `/clear` 후) 회귀 → 사용자 manual smoke 직접
  관찰 (2026-05-25).
- 현재 fix `at(-1)`이 round 1·2·3 통과 → 사용자 manual smoke 직접 관찰
  (2026-05-25).
- Codex app-server에 unload RPC 부재 → `grep` 0건.
- Rebind 경로 (`state.ts:1146-1166`, `agents.ts:217`) → 코드 직접 확인.

### 추론 (검증 필요)

- 가정 (A): `thread/loaded/list` 정렬 = 생성 시각 오름차순. 사용자 smoke
  결과와 일관되지만 spec 보장은 확인 안 함.
- 가정 (B): 사용자 TUI focus = 마지막 생성. `/clear`·`/new`엔 부합 추정,
  `/fork`·내부 resume엔 부합 보장 없음.
- 시나리오 #3 (`/fork`) / #4 (내부 resume) 동작 — `at(-1)` 휴리스틱 위에서
  어떻게 깨지는지 시뮬레이션도 코드 검증도 안 함.
- Codex app-server WS protocol에 TUI focus 관찰 RPC가 있는지 — 조사 안 함.

### 검증 추가 권고

위 추론을 fact로 박으려면:

- Codex CLI repo / WS protocol doc 1회 조사 (가정 A·B, focus RPC 존재
  여부).
- `/fork` + claude reply manual smoke 1회 (사용자가 원본에 잔류한 케이스).
- 내부 resume + claude reply manual smoke 1회.

## Follow-up resolution: no-resume attach hidden-thread reduction

2026-05-25 follow-up implementation selected part of option (a) for MVP:

- No-resume Codex attach no longer calls daemon-side `runtime.startThread()`.
- The per-agent app-server/runtime and Codex channel token are still created during attach.
- `agents.adapter_session_id` may remain null after fresh attach. It is populated later by explicit `--resume` attach or by the first successful live loaded-thread delivery/rebind.
- Explicit `--resume <threadId>` attach still calls `thread/resume`, validates the returned id, and records `agent_thread_id_rebound`.

Effect:

- Fresh attach no longer creates the daemon-owned hidden `D1` thread before the foreground TUI creates or loads its visible thread.
- This reduces the common cold-start orphan source described in scenario #1.
- It does not solve user-originated `/clear`, `/new`, `/fork`, or internal resume focus ambiguity; those still rely on the current latest-loaded-thread heuristic unless a future Codex focus observation channel appears.

Test coverage added/updated:

- No-resume Codex attach does not call `runtime.startThread()`, leaves `adapter_session_id` null, and emits no initial rebind event.
- Explicit resume attach continues to call `runtime.resumeThread(threadId)` and records the resume rebind event.
- Claude -> Codex delivery tests continue to model the foreground TUI as the live loaded thread and verify `thread/loaded/list` -> latest thread -> `turn/start`.
- Verification: `pnpm test` passed (46 files, 335 tests), `pnpm typecheck` passed, and `pnpm build` passed.

## Follow-up resolution: delivery target selection observability

2026-05-25 follow-up implementation added audit events for the latest-loaded-thread heuristic:

- `codex_delivery_target_selected` records `thread/loaded/list`, the returned loaded thread ids, the selected latest thread id, previous cached adapter session id, runtime active thread id, selection policy, message type, source agent id, and source/target agent names.
- `codex_delivery_target_unavailable` records the same selection context when no loaded thread exists and the delivery remains queued.
- `codex_delivery_target_injection_failed` records the selected thread and failure reason/message when `turn/start` fails after a target was selected.
- Event payloads do not include user message content; they carry routing/debug ids and selection metadata only.
- Runtime-unavailable and not-ready failures remain outside these selection-specific audit events because no `thread/loaded/list` observation has occurred; those cases continue to be represented by the terminal delivery failure reason.

Effect:

- If daemon status says `completed` but the visible Codex TUI does not show the reply, the event log now shows which loaded-thread set was observed and which thread the daemon selected.
- If delivery stays queued or fails during `turn/start`, the event log separates target discovery failure from injection failure.

Verification: targeted daemon/core tests passed, `pnpm test` passed (46 files, 338 tests), `pnpm typecheck` passed, and `pnpm build` passed.

## Critical issue: internal Codex TUI `/resume` breaks latest-loaded heuristic

2026-05-26 manual smoke by user confirmed the previously listed "internal
resume" risk as a real failure:

- `claude -> codex -> claude` succeeded.
- In the same Codex TUI, `/clear` and `/new` were executed.
- After that, the existing Claude session could still exchange messages with
  the visible Codex TUI successfully.
- After an internal Codex TUI `/resume`, `claude -> codex` did not appear in
  the visible resumed Codex thread. Instead, another loaded thread received the
  injected turn and produced the reply back to Claude.
- After `/resume` followed by `/clear`, `claude -> visible codex -> claude`
  worked again.

Interpretation:

- This matches the Layer 1 observation gap described above. aiox still cannot
  directly observe "which Codex thread the foreground TUI is currently showing".
- The current `latest_loaded_thread` policy works for `/clear` and `/new`
  because those actions create a new thread that appears at the end of
  `thread/loaded/list`.
- Internal `/resume` can move the TUI focus to an older already-loaded thread.
  In that case, `thread/loaded/list.at(-1)` can remain a different, newer
  loaded thread, so daemon injection succeeds against the wrong thread.
- The post-resume `/clear` success is consistent with the same model: `/clear`
  creates a fresh visible thread, making the visible target latest again.

Risk:

- This is not a delivery transport failure; `turn/start` can return success and
  the delivery can be marked completed while the user-visible TUI is not the
  target. That is a product contract risk because status can look successful
  while the visible workflow is wrong.
- The issue is deterministic for any action that changes TUI focus to a
  non-latest loaded thread, including internal resume and potentially some
  `/fork` flows.

Immediate decision surface:

1. **Block/unsupported path for MVP**
   - Treat internal Codex TUI `/resume` as unsupported for live relay. Users
     should restart via `aiox codex --name <name> --resume <thread-id>` when
     they need a resumed thread to be relay target.
   - Trade-off: lowest implementation risk, but weaker UX and requires a clear
     warning/status story.
   - Reversible: yes. A future focus observation channel can replace the
     unsupported-path warning without changing durable schema.
   - Deferrable: yes, but only if MVP docs/status make the limitation explicit.

2. **Stop claiming success when target selection is ambiguous**
   - Keep latest-loaded injection for `/clear` and `/new`, but detect suspicious
     multi-loaded states after known rebind patterns and keep delivery queued or
     mark it with an explicit uncertainty reason instead of `completed`.
   - Trade-off: avoids false-positive success, but still cannot deliver to the
     resumed visible thread without an authoritative focus signal.
   - Reversible: yes. The uncertainty gate can be removed once a better target
     signal exists.
   - Deferrable: partially. Deferring leaves the current false-completed risk.

3. **Find or build a TUI focus observation channel**
   - Investigate Codex app-server protocol/source for an authoritative active
     thread signal, or introduce an aiox-controlled proxy/channel that can
     observe TUI-originated `thread/resume`, `thread/start`, and `thread/fork`
     responses.
   - Trade-off: highest correctness, but larger scope and may require topology
     changes if Codex exposes no RPC.
   - Reversible: medium. A proxy/channel boundary can remain an adapter detail,
     but it changes runtime architecture more than an MVP warning.
   - Deferrable: yes for MVP only if the unsupported/uncertain path is made
     explicit.

Recommendation: choose option 1 as the immediate MVP containment and run option
3 as the next focused spike before any claim of full resume-safe relay. Option
2 is useful only if false-positive `completed` status becomes unacceptable
before option 3 lands; it does not solve delivery correctness by itself.

Follow-up spike result, 2026-05-26:

The TUI same-connection observation spike confirmed that internal Codex TUI
navigation emits authoritative JSON-RPC responses on the same WebSocket
connection used by that TUI. These responses are stronger binding signals than
`thread/loaded/list` ordering.

Why this spike was necessary:

- The user-observed failure showed that `turn/start` could succeed against a
  non-visible Codex thread after internal TUI `/resume`. That means transport
  success is not enough; aiox must know which thread the foreground TUI is
  actually showing.
- The previous `thread/loaded/list.at(-1)` rule was only a heuristic. It happened
  to work for `/clear` and `/new` because they create fresh threads, but it had
  no proof for focus-moving commands such as `/resume`.
- The spike therefore checked the values returned by TUI-originated
  `thread/start`, `thread/resume`, and `thread/fork` calls on the same WebSocket
  connection. If those responses carried the visible thread id, they could
  replace the heuristic as the binding authority.
- The important values were the JSON-RPC `id` for request/response correlation,
  the request `method`, `params.threadId` for source/resume intent,
  `params.sessionStartSource` for distinguishing `/clear` from `/new`, and
  `result.thread.id`/`result.thread.forkedFromId` for the actual target chosen by
  Codex.
- The goal was not to rely on specific example thread ids. The goal was to prove
  the invariant: on the same TUI connection, a successful
  `thread/start|resume|fork` response identifies the thread that should receive
  later aiox-injected `turn/start` messages.

Observed matrix:

| TUI action | Observed RPC response | Binding result |
| --- | --- | --- |
| Initial attach | `thread/start` | response `thread.id` is current TUI thread |
| `/clear` | `thread/start`, `sessionStartSource: "clear"` | response `thread.id` is current TUI thread |
| `/new` | `thread/start`, `sessionStartSource: null` | response `thread.id` is current TUI thread |
| `/fork` | `thread/fork` | response `thread.id` is fork target; `forkedFromId` is source |
| `/resume` | `thread/resume` | response `thread.id` is resumed current TUI thread |
| `/resume -> /clear` | `thread/resume` then `thread/start` | clear `thread/start` supersedes resumed thread |
| `/resume -> /new` | `thread/resume` then `thread/start` | new `thread/start` supersedes resumed thread |
| `/resume -> /fork` | `thread/resume` then `thread/fork` | fork `thread.id` supersedes resumed source |

Concrete observed examples:

- `/resume` selected `019e5fe2-114a-7430-b526-5f70782e6d43`; the same
  connection returned a `thread/resume` binding candidate for that id.
- Immediate `/fork` from that resumed thread sent `thread/fork` with source
  `019e5fe2-114a-7430-b526-5f70782e6d43`; the response returned new thread
  `019e62f5-1a5c-73d1-869c-ec3b119947f5`, which becomes the new binding.
- `/resume -> /clear` and `/resume -> /new` produced the same overwrite model:
  the later `thread/start` response becomes the active binding.

Observed RPC shapes relevant to implementation:

`/clear`:

```json
{
  "request": {
    "id": 39,
    "method": "thread/start",
    "params": {
      "sessionStartSource": "clear"
    }
  },
  "response": {
    "id": 39,
    "result": {
      "thread": {
        "id": "019e62f2-ee25-7db3-a110-47fad826f75d"
      }
    }
  }
}
```

`/new`:

```json
{
  "request": {
    "id": 60,
    "method": "thread/start",
    "params": {
      "sessionStartSource": null
    }
  },
  "response": {
    "id": 60,
    "result": {
      "thread": {
        "id": "019e62f3-bc11-7401-9572-0fd02dc59070"
      }
    }
  }
}
```

`/fork`:

```json
{
  "request": {
    "id": 20,
    "method": "thread/fork",
    "params": {
      "threadId": "019e62f0-0e4c-7fe3-9ff3-d3f722d55798"
    }
  },
  "response": {
    "id": 20,
    "result": {
      "thread": {
        "id": "019e62f1-221e-7fd2-b7ee-1e346224a2d7",
        "forkedFromId": "019e62f0-0e4c-7fe3-9ff3-d3f722d55798"
      }
    }
  }
}
```

`/resume`:

```json
{
  "request": {
    "id": 69,
    "method": "thread/resume",
    "params": {
      "threadId": "019e5fe2-114a-7430-b526-5f70782e6d43"
    }
  },
  "response": {
    "id": 69,
    "result": {
      "thread": {
        "id": "019e5fe2-114a-7430-b526-5f70782e6d43",
        "forkedFromId": null
      }
    }
  }
}
```

`/resume -> /fork`:

```json
[
  {
    "request": {
      "id": 69,
      "method": "thread/resume",
      "params": {
        "threadId": "019e5fe2-114a-7430-b526-5f70782e6d43"
      }
    },
    "response": {
      "id": 69,
      "result": {
        "thread": {
          "id": "019e5fe2-114a-7430-b526-5f70782e6d43"
        }
      }
    }
  },
  {
    "request": {
      "id": 81,
      "method": "thread/fork",
      "params": {
        "threadId": "019e5fe2-114a-7430-b526-5f70782e6d43"
      }
    },
    "response": {
      "id": 81,
      "result": {
        "thread": {
          "id": "019e62f5-1a5c-73d1-869c-ec3b119947f5"
        }
      }
    }
  }
]
```

Implementation rule from these shapes:

- Track pending binding requests by JSON-RPC `id` only for same-client requests
  whose method is `thread/start`, `thread/resume`, or `thread/fork`.
- On the matching response, if `result.thread.id` is present, rebind that Codex
  TUI agent to `result.thread.id`.
- For `thread/fork`, bind to the response `result.thread.id`, not request
  `params.threadId`; the request id is the source thread and the response id is
  the visible fork target.
- A later binding response on the same connection supersedes the previous one.

Decision update:

- Proceed with option 3 for the implementation path: introduce an aiox-owned
  same-connection observation channel, most likely as a transparent per-agent
  Codex app-server proxy.
- Replace `thread/loaded/list.at(-1)` as authoritative target selection with
  response-based rebind from `thread/start`, `thread/resume`, and `thread/fork`.
- Keep `thread/loaded/list` as diagnostics/cache context only. It should not be
  the authority for the visible TUI target when a same-connection binding signal
  exists.

User decision, 2026-05-26:

Proceed with a **per-agent 1:1 transparent proxy in front of the existing
per-agent 1:1 Codex app-server**.

This decision does not revive a shared 1:N app-server topology. The runtime
shape is:

```text
Codex agent alpha:
  Codex TUI alpha -> proxy alpha -> app-server alpha

Codex agent beta:
  Codex TUI beta  -> proxy beta  -> app-server beta
```

The proxy is added only to observe TUI-originated same-connection
`thread/start`, `thread/resume`, and `thread/fork` responses. Agent identity
continues to be bounded by the per-agent runtime/app-server. The proxy must be a
transparent relay for all frames and must not transform Codex protocol messages.

Trade-off:

- Benefit: fixes the internal `/resume` wrong-thread delivery class by replacing
  `thread/loaded/list.at(-1)` with same-connection response authority.
- Benefit: preserves the earlier per-agent app-server isolation decision; no
  shared app-server attribution or JSON-RPC multiplexing is introduced.
- Cost: each Codex runtime gains one local proxy listener/process/module and the
  associated lifecycle, port, shutdown, and health handling.
- Cost: the adapter now depends on the observed Codex JSON-RPC response shape
  for `thread/start`, `thread/resume`, and `thread/fork`; regression tests must
  lock this observation.

Critical constraints:

- Proxy must stay transparent: relay raw frames unchanged, observe only binding
  windows, and never alter errors or payloads.
- Proxy must be 1:1 with the Codex agent/TUI path. Do not collapse multiple
  agents into one shared proxy upstream or shared app-server as part of this
  fix.
- Production logging must emit only summarized binding events. Full raw frames
  can contain previews, connector lists, and other sensitive or high-volume data.
- On error responses or missing `result.thread.id`, do not rebind.
- For `thread/fork`, bind to response `result.thread.id`, not request
  `params.threadId`.

Delegation note: the next implementation step should be handed to Claude with
this document as the authority entry point. The implementation should start from
tests around proxy binding events and daemon active-thread rebind, not from a
large topology rewrite.

Implementation result, 2026-05-26:

Claude implemented the per-agent transparent proxy rebind path.

Files added:

- `src/adapters/codex/proxy.ts` — per-agent transparent WebSocket proxy. It
  relays frames unchanged and observes `thread/start`, `thread/resume`, and
  `thread/fork` request/response pairs to emit summarized binding events.
- `tests/unit/adapters/codex-proxy.test.ts` — proxy binding and non-binding
  cases.
- `tests/unit/daemon/state-codex-proxy-rebind.test.ts` — daemon active-thread
  rebind from proxy binding events.

Files updated:

- `src/adapters/codex/runtime.ts` — `CodexAgentRuntime` now owns proxy lifecycle.
  The TUI-facing `endpoint`/`snapshot().endpoint` is the proxy URL, while
  `appServerEndpoint` remains the app-server URL. Runtime exposes
  `onProxyBinding(listener)`.
- `src/daemon/state.ts` — daemon subscribes to `onProxyBinding`, stores
  `agent_thread_id_rebound` events with `source: "proxy_binding"`, and resolves
  Codex reply targets by preferring runtime `activeThreadId` before falling back
  to latest loaded thread diagnostics.
- Unit tests were updated for runtime lifecycle, API event source fields, Codex
  ingress selection policy, and proxy binding fan-out.

Implemented behavior:

- Same-client successful `thread/start`, `thread/resume`, and `thread/fork`
  responses can rebind the Codex agent active thread.
- Error responses and responses without `result.thread.id` do not rebind.
- `/fork` binds to response `result.thread.id`, not request `params.threadId`.
- A later proxy binding event supersedes earlier binding state.
- `thread/loaded/list.at(-1)` remains only a fallback when no proxy active
  binding exists, and its event policy is labeled
  `latest_loaded_thread_fallback`.

Verification:

- Claude reported `pnpm test` passed (48 files, 357 tests), `pnpm typecheck`
  clean, and `pnpm build` clean.
- Codex follow-up targeted verification passed:
  `pnpm test tests/unit/adapters/codex-proxy.test.ts tests/unit/daemon/state-codex-proxy-rebind.test.ts tests/unit/adapters/codex-runtime.test.ts tests/unit/daemon/codex-ingress.test.ts`
  (4 files, 66 tests).

Remaining verification:

- Manual smoke must still confirm visible TUI delivery after `/clear`, `/new`,
  `/fork`, `/resume`, `/resume -> /clear`, `/resume -> /new`, and
  `/resume -> /fork`.
- The production proxy currently avoids raw frame logging, but still parses JSON
  frames broadly. Lazy observation remains an optional performance follow-up, not
  a correctness blocker. See "Lazy parse follow-up, 2026-05-26" below.

Manual smoke result, 2026-05-26:

User ran the build-output smoke with:

```bash
node dist/src/bin/aiox.js daemon start
node dist/src/bin/aiox.js codex --name codex-smoke
node dist/src/bin/aiox.js claude --name claude-smoke
node dist/src/bin/aiox.js connect claude-smoke codex-smoke
node dist/src/bin/aiox.js connect codex-smoke claude-smoke
```

Result: all visible-thread relay scenarios passed.

| Scenario | Result |
| --- | --- |
| Basic `claude -> codex -> claude` | pass |
| Codex TUI `/clear`, then Claude -> Codex visible thread | pass |
| Codex TUI `/new`, then Claude -> Codex visible thread | pass |
| Codex TUI `/fork`, then Claude -> Codex visible thread | pass |
| Codex TUI `/resume`, then Claude -> Codex visible thread | pass |
| Codex TUI `/resume -> /clear`, then Claude -> Codex visible thread | pass |
| Codex TUI `/resume -> /new`, then Claude -> Codex visible thread | pass |
| Codex TUI `/resume -> /fork`, then Claude -> Codex visible thread | pass |

Conclusion: the original wrong-thread delivery reported after internal Codex TUI
`/resume` is fixed in the build-output manual smoke path. The proxy-observed
same-connection active binding is now sufficient for the exercised MVP flows.

Lazy parse follow-up, 2026-05-26:

Commit `edaf02b` (`perf: lazily parse Codex proxy binding frames`) changed the
proxy observation cost model without changing external behavior.

Implemented behavior:

- Client -> server frames are relayed unchanged, but the proxy only attempts
  `JSON.parse` when the text frame contains one of the binding method needles:
  `"thread/start"`, `"thread/resume"`, or `"thread/fork"`.
- Server -> client frames are relayed unchanged, but the proxy does not attempt
  `JSON.parse` while no binding request is pending.
- Binding correctness remains the same: a same-client binding request plus a
  matching non-error response with `result.thread.id` emits the binding event.
- Binary frames are not parsed as JSON-RPC observation candidates.

Verification:

- `pnpm test tests/unit/adapters/codex-proxy.test.ts` passed (11 tests).
- `pnpm test tests/unit/adapters/codex-proxy.test.ts tests/unit/daemon/state-codex-proxy-rebind.test.ts tests/unit/adapters/codex-runtime.test.ts tests/unit/daemon/codex-ingress.test.ts`
  passed (4 files, 69 tests).
- `pnpm typecheck` passed.

Risk note:

- The prefilter uses the normal quoted JSON string form, for example
  `"thread/start"`. A JSON encoder could theoretically emit the same value as
  `"thread\/start"` by escaping `/`. That would parse to the same method value
  after `JSON.parse`, but the cheap prefilter would not see the current needle.
  This is treated as a mostly theoretical exception for the MVP because normal
  JavaScript `JSON.stringify` output and the observed Codex frames use
  `"thread/start"` rather than escaped slashes. If a future Codex encoder or
  third-party client emits escaped slashes, add escaped-slash needles as a small
  follow-up; the proxy topology and daemon rebind policy do not need to change.
- The planned 4KB cutoff was intentionally not included. While a binding is
  pending, unrelated upstream frames are still parsed. The binding window is
  expected to be short, so this remains a performance follow-up rather than a
  correctness risk.

## 관련 문서

- `history/40-step-14-daemon-client-split.history.md` — Step 14 진행 권위.
  현재 fix `e152adc`·`2aa1ae3`·`5423b2c` commit 기록.
- `history/31-step-10-per-agent-app-server-runtime.history.md` — per-agent
  app-server 모델.
- `history/33-step-10-phase-a-decisions.history.md` — Step 10 Phase A D1~D7
  (특히 D6 resume, D7 rebind).
- `history/32-step-10-per-agent-app-server-resume-spike.history.md` — Codex
  thread/resume + turn/start matrix 검증.
- `prd/mvp/aiox-mvp-spec.md` — Message Flow.

## 한 줄 요약

**Rebind 문제처럼 보이지만 본질은 "TUI focus 관찰 채널 부재 → 휴리스틱 의존
→ 시나리오마다 깨짐". 현재 fix(`at(-1)`)는 cold·/clear를 안정시켰지만 내부
`/resume`에서 wrong-thread delivery가 확인됐다. 2026-05-26 same-connection
spike에서 `/clear`, `/new`, `/fork`, `/resume`, `/resume -> /clear`,
`/resume -> /new`, `/resume -> /fork` 모두 `thread/start|resume|fork` response로
binding 가능한 것이 확인됐으므로, 구현 방향은 `thread/loaded/list.at(-1)` 권위
폐기와 TUI same-connection response 기반 rebind다.**
