# Codex In-Band Proxy: Attribution Signals

> **STATUS (2026-05-20)**: Step 10 production 방향은 **Codex agent 1개당
> app-server 1개, port는 OS 자동 할당**이다. 권위:
> `history/31-step-10-per-agent-app-server-runtime.history.md`.
>
> Codex의 `thread/start`·`thread/fork` 시그널 매핑과
> `sessionStartSource` enum은 여전히 active다. Per-agent app-server endpoint가
> agent identity boundary이고, 이 문서는 그 boundary 안에서 thread id가 바뀌는
> 신호를 설명한다.
>
> **UPDATE (2026-05-26)**: `history/41-codex-loaded-thread-binding-analysis.history.md`
> 에서 internal `/resume`도 same-connection `thread/resume` response로 binding
> 가능함이 확인됐다. Production 방향은 per-agent app-server 앞에 per-agent
> transparent proxy를 두는 것이다.

Codex per-agent in-band WebSocket proxy가 TUI의 `/clear`·`/new`·`/fork`·`/resume`을
**어떤 신호로 구분하는가**에 대한 학습 기록.

비용 모델 (왜 99% 트래픽은 parse 안 해도 되는가)은 `proxy-cost-model.md`
에 있다. 이 문서는 그 1% binding window 안에서 *어떤 신호를 보고 무엇을
결정하는가*를 다룬다.

## 1. 배경

`proxy-cost-model.md`에서 lazy observation은 cheap substring sniff로
`thread/start`와 `thread/fork` 두 method를 만나는 frame만 parse한다고 했다.
그런데 사용자가 자연스럽게 한 단계 더 물었다:

> proxy가 `/new`·`/fork`·`/clear` 등에 대해 알 수 있는 신호가 있는가?
> 두 method만 sniff하는데, 그걸로 세 가지 슬래시 커맨드가 다 구분되나?

권위 spike data는 `history/27-step-10-codex-clear-new-rebind-spike.history.md`
line 651·674·696·702에 이미 있지만, 흩어진 raw observation이라 정리된
매핑이 없다. 이 문서는 그 정리.

## 2. 이해 못 했던 부분

세 가지가 헷갈렸다:

1. `/clear`와 `/new`는 둘 다 "새 thread 만들기"처럼 보이는데, 같은 method가
   날아오면 proxy가 무엇으로 구분하나?
2. `/fork`는 다른 method인가, 아니면 같은 method에 다른 파라미터인가?
3. 이 신호들이 *proxy가 자체적으로* 알 수 있는 것인가, 아니면 daemon이
   추가 정보를 줘야 하는가?

답은 셋 다 명확하다. proxy가 frame 안에서 직접 본다.

## 3. agent의 설명

### Codex가 슬래시 커맨드별로 보내는 JSON-RPC 요청

`history/27` spike에서 직접 관측된 frame:

| TUI 액션 | method | 핵심 파라미터 | 신호 |
|---|---|---|---|
| `/clear` | `thread/start` | `sessionStartSource: "clear"` | sessionStartSource 값 |
| `/new` | `thread/start` | `sessionStartSource: null` | sessionStartSource 값 |
| `/fork` | `thread/fork` | `threadId: <원본 thread id>` | method 자체 + threadId |
| `/resume` | `thread/resume` | `threadId: <resume 대상 thread id>` | method 자체 + threadId |

핵심: `/clear`와 `/new`는 **같은 method**라 method 이름만으로는 구분 안 됨.
**`sessionStartSource` 파라미터 값**이 분기 기준. `/fork`는 method가 아예
달라서 method 이름만으로 자명.

### 응답에서 proxy가 얻는 것

| 슬래시 | 응답에서 새로 얻는 정보 |
|---|---|
| `/clear` | `result.thread.id` = 새 thread id, `forkedFromId: null` |
| `/new` | `result.thread.id` = 새 thread id, `forkedFromId: null` |
| `/fork` (성공) | `result.thread.id` = 새 thread id, `forkedFromId: <원본 thread id>` |
| `/fork` (빈 thread) | `error: -32600 "no rollout found for thread id <id>"` |
| `/resume` | `result.thread.id` = resumed thread id |

### 세 가지 신호의 역할

- **method** — 1차 분류 (`thread/start` vs `thread/fork` vs `thread/resume`)
- **`sessionStartSource`** — `/clear` vs `/new` 분기 (`thread/start` 안에서)
- **`forkedFromId`** — fork 안전망 (응답에서 원본 thread id 확인)

## 4. 시각화

### 4-1. 매핑 표 (한눈에)

```
TUI 액션      method         sessionStartSource    forkedFromId (응답)
─────────    ────────────   ──────────────────    ────────────────────
/clear       thread/start    "clear"               null
/new         thread/start    null                  null
/fork (OK)   thread/fork     (없음)                <원본 thread id>
/fork (ERR)  thread/fork     (없음)                응답에 error
/resume      thread/resume   (없음)                null 또는 기존 값
```

### 4-2. `/clear` 시퀀스

```
TUI                  proxy                  app-server
 │                     │                         │
 │  thread/start       │                         │
 │  id: 8              │  thread/start           │
 │  source: "clear" ──►│  id: 8           ──────►│
 │                     │  source: "clear"        │
 │                     │  [sniff: "thread/start" │
 │                     │   hit -> parse]         │
 │                     │  [pending.set(8,        │
 │                     │   "thread/start")]      │
 │                     │                         │
 │                     │  ◄────────── result:    │
 │                     │    id: 8                │
 │                     │    thread.id: NEW       │
 │                     │    forkedFromId: null   │
 │                     │  [pending.has(8) -> Y]  │
 │                     │  [emit binding_         │
 │                     │   candidate: NEW]       │
 │  ◄──── result ──────│                         │
 │     id: 8           │                         │
 │     thread.id: NEW  │                         │
```

### 4-3. `/new` 시퀀스

```
TUI                  proxy                  app-server
 │                     │                         │
 │  thread/start       │                         │
 │  id: 14             │  thread/start           │
 │  source: null   ───►│  id: 14         ──────►│
 │                     │  source: null           │
 │                     │  [sniff hit -> parse]   │
 │                     │  [pending.set(14, ...)] │
 │                     │                         │
 │                     │  ◄────────── result:    │
 │                     │    id: 14               │
 │                     │    thread.id: NEW2      │
 │                     │    forkedFromId: null   │
 │                     │  [emit binding_         │
 │                     │   candidate: NEW2]      │
 │  ◄──── result ──────│                         │
```

`/clear` 시퀀스와 *완전히 동일한 method*. `sessionStartSource` 값만 다름.
proxy는 parse 후 이 값으로 두 액션을 구분할 수 있다.

### 4-4. `/fork` 시퀀스 (성공 가정)

```
TUI                  proxy                  app-server
 │                     │                         │
 │  thread/fork        │                         │
 │  id: 19             │  thread/fork            │
 │  threadId: PREV ───►│  id: 19          ──────►│
 │                     │  threadId: PREV         │
 │                     │  [sniff: "thread/fork"  │
 │                     │   hit -> parse]         │
 │                     │  [pending.set(19,       │
 │                     │   "thread/fork")]       │
 │                     │                         │
 │                     │  ◄────────── result:    │
 │                     │    id: 19               │
 │                     │    thread.id: FORKED    │
 │                     │    forkedFromId: PREV   │
 │                     │  [emit binding_         │
 │                     │   candidate: FORKED]    │
 │                     │  [+ 안전망: forkedFromId│
 │                     │   == 현재 binding?]     │
 │  ◄──── result ──────│                         │
```

`/fork`는 추가 신호 `forkedFromId`로 **이중 검증**이 가능하다.
proxy의 현재 binding과 `forkedFromId`가 일치해야 rebind 안전.

### 4-5. `/fork` 시퀀스 (빈 thread — fork 대상 없음)

```
TUI                  proxy                  app-server
 │                     │                         │
 │  thread/fork        │                         │
 │  id: 19             │  thread/fork            │
 │  threadId: NEW2 ───►│  id: 19          ──────►│
 │                     │  threadId: NEW2         │
 │                     │  [pending.set(19, ...)] │
 │                     │                         │
 │                     │  ◄────────── error:     │
 │                     │    id: 19               │
 │                     │    code: -32600         │
 │                     │    msg: "no rollout..." │
 │                     │  [emit binding_         │
 │                     │   uncertain:            │
 │                     │   error_response]       │
 │  ◄──── error ───────│  (TUI가 "fork 실패"     │
 │     id: 19          │   표시)                 │
```

이 error는 "fork 기능 미지원"이 아니라 fork할 rollout/history가 없는 빈 thread의
expected error다. proxy는 error를 *변조하지 않고* TUI에 그대로 전달
(history/27 "Decision: Proxy Is Transparent Relay for All Frames"). proxy
자체는 rebind 안 함, 기존 binding 유지.

## 5. 해결 단계

이 문서는 **정리 단계** 학습 기록이다.

- 권위 데이터는 `history/27` line 651·674·696·702에 이미 spike로 캡처됨.
- 신규 spike·구현 변경은 없음.
- 다음 actionable: `history/28` 측정 hook 작업 시 `binding_candidate`
  이벤트에 `trigger: "clear" | "new" | "fork"` 필드 추가 검토.

### proxy가 *알 수 있는* 것

| 알 수 있는 것 | 출처 |
|---|---|
| 어느 슬래시 커맨드가 트리거였는지 | method + sessionStartSource |
| 새 thread id | response `result.thread.id` |
| `/fork`의 원본 thread id | response `forkedFromId` |
| 이전 thread id (대체된 것) | proxy 자기 binding context (기억) |
| 실패한 `/fork`인지 | response가 error인지 |
| 언제 일어났는지 | frame 수신 timestamp |

### proxy가 *모르는* 것

| 모르는 것 | 왜 모름 |
|---|---|
| 사용자가 어떤 prompt를 쳤는지 | turn content는 parse 안 함, 관심 밖. |
| 어느 사람이 쳤는지 | TUI 1개 = WebSocket 1개 = proxy 1개. connection 자체가 identity. |
| Codex 내부 background thread | client-originating이 아님 → broadcast로만 보임 → ownership 아님. |
| `/fork`가 외부 다른 TUI 영향인지 | 같은 connection 안에서 `thread/fork` 요청이 아니면 binding rule 발동 안 함. |
| `sessionStartSource`의 미래 값 | 현재 `"clear"`와 `null`만 관측. `"compact"`/`"resume"` 등 추가될 가능성. |

## 6. commit 내역

없음 (정리 단계).

## 7. 어떻게 활용하나 (proxy 구현 응용)

이 신호로 proxy/daemon이 할 수 있는 일:

### 7-1. trigger 필드 추가

`binding_candidate` 이벤트에 슬래시 커맨드 종류를 함께 emit:

```ts
type ProxyObservation =
  | {
      type: "binding_candidate";
      method: "thread/start" | "thread/fork";
      requestId: JsonRpcId;
      threadId: string;
      trigger: "clear" | "new" | "fork";  // ← 신규
    }
  | ...
```

daemon 로그/디버깅에 직접 도움. 회귀 분석 시 "어느 슬래시가 잘못 묶였나"
한눈에.

### 7-2. fork 이중 검증

```text
binding_candidate {method: "thread/fork", threadId: NEW, forkedFromId: X}
  IF X !== currentBinding.threadId:
    → binding_uncertain { reason: "fork_origin_mismatch" }
    (shared app-server에서 다른 TUI의 fork 이벤트가 잘못 묶이는 것 방지)
```

`forkedFromId`는 `/clear`·`/new`에는 없는 `/fork` 전용 추가 안전망.

### 7-3. rebind 사유 감사 로그

daemon이 agent state 바꿀 때 "왜" 바뀌었는지 기록:

```text
agent alpha rebind: thread/start (trigger: clear) -> thread NEW
agent beta  rebind: thread/fork  (forkedFromId: PREV) -> thread FORKED
```

문제 발생 시 인과 추적이 쉬워짐.

### 7-4. 미래 `sessionStartSource` enum 확장 대응

Codex가 `"compact"`, `"resume"` 같은 값을 추가하면:

- proxy는 그 값을 *모르고도* 그대로 emit (string passthrough).
- daemon이 enum 정책 결정 (rebind할지, 별도 처리할지, 무시할지).
- proxy 코드 변경 없이 정책만 daemon 측에서 결정 → forward compatibility.

## 8. 배운 점 요약

1. **`/clear`와 `/new`는 method가 같다.** 신호는 `sessionStartSource`라는
   *파라미터 값*이지 *method 이름*이 아니다. substring sniff (lazy
   observation)에서 method만 보는 건 1차 필터로 충분하지만, 실제 구분은
   parse 후 분기로 일어난다.
2. **connection 자체가 identity다.** proxy가 1:1로 TUI에 매핑되니까 "어느
   TUI가 슬래시를 쳤나"는 자명. 추가 신호 (cwd symlink, agentNickname 등)
   를 따로 둘 필요 없음. proxy 모델의 가장 큰 장점.
3. **broadcast `thread/started`는 ownership 아니다.** 다른 TUI의 슬래시
   커맨드가 broadcast로 들리지만, **same-connection request/response가
   없으면 binding 변경 금지**. history/27 결정 그대로.
4. **`/fork`는 신호 2개 (method + forkedFromId)가 겹치는 가장 강한 binding
   이벤트다.** `/clear`·`/new`보다 안전망이 한 겹 더 있다.
5. **proxy가 모르는 것을 명시하는 게 정책 안전성에 직결된다.** "사용자가
   누구인지", "Codex 내부 background thread인지" 같은 건 *모르므로 추측하지
   않는다*가 attribution 정확성의 핵심.

## 관련 권위

- `history/27-step-10-codex-clear-new-rebind-spike.history.md` — spike data
  원본 (line 651·674·696·702) + transparent relay decision.
- `history/28-step-10-proxy-lazy-observation.history.md` — lazy observation
  working note. substring sniff 설계와 직결.
- `docs/aiox/proxy-cost-model.md` — 비용 축 학습 기록 (이 문서와 짝).
- `spikes/codex-app-server-multi-session-poc/inband-proxy.ts` — 현재 구현.
