# Codex In-Band Proxy: Cost Model & Lazy Observation

> **STATUS (2026-05-20)**: Step 10 production 방향은
> `history/31-step-10-per-agent-app-server-runtime.history.md`에 따라
> **Codex agent 1개당 app-server 1개, port는 OS 자동 할당**이다.
>
> 이 문서의 lazy observation 제안은 proxy design을 다시 선택할 때의
> historical/fallback 학습 기록으로 보존한다.

Codex per-agent in-band WebSocket proxy의 비용 모델과, "왜 모든 frame을 parse하지 않아도 되는가"에 대한 학습 기록.

## 1. 배경

Step 10 (Codex `/clear`·`/new`·`/fork` rebind)에서, shared Codex app-server에서
어느 TUI가 slash command를 쳤는지 식별하기 위해 **per-agent in-band WebSocket
proxy** 구조를 채택했다. 권위 결정은 `history/27-step-10-codex-clear-new-rebind-spike.history.md`의
"Decision: Proxy Is Transparent Relay for All Frames" 섹션에 있다.

이 구조는 **Codex agent 1개당 proxy 1개**가 매핑된다. 사용자가 이 매핑에서
성능 우려를 제기했다:

> 한 agent가 큰 frame (대형 patch/diff, exec output 등)을 보내면 Node.js
> single thread에서 `JSON.parse`가 sync로 다른 agent latency를 막지 않나?

## 2. 이해 못 했던 부분

사용자가 막혔던 지점:

1. proxy 1:1 매핑이 자원 측면에서 부담인지 (메모리, FD, 포트, latency).
2. 현재 `inband-proxy.ts` 구현이 **모든 frame을 무조건 `JSON.parse`** 한다는 사실.
   binding과 무관한 token delta·exec output·file read도 전부 parse된다.
3. 그 비용을 줄이려면 결정 (transparent relay)을 깨야 하는가? 깨지 않고 줄일 방법이 있는가?

핵심 통찰은 사용자가 직접 짚었다:

> 결국 proxy는 `/new`·`/fork`·`/clear` 등에 대한 rebind를 위한 거다.

이 통찰이 cost model의 출발점이다.

## 3. agent의 설명

### proxy의 두 가지 역할

| 역할 | 빈도 | 비용 부담 가치 |
|---|---|---|
| **Relay obligation** — 모든 frame을 양방향으로 그대로 전달 | 항상 | 필수 (TUI ↔ app-server 연결 유지) |
| **Attribution observation** — `thread/start`·`thread/fork` request/response correlation 관찰 | `/clear`·`/new`·`/fork` 발생 시점만 (수십 ms window) | 매우 짧은 순간만 의미 있음 |

proxy의 본질은 **observation**이지만, 그것을 가능하게 하는 *obligation*이
relay다. 현재 구현은 obligation 비용 (가만히 send)에는 영향 없지만,
observation 비용 (JSON.parse)을 obligation처럼 *항상* 지불하고 있다.

### Cost model의 misalignment

```
proxy 사용 패턴:           99% relay-only      1% binding window
현재 비용 부과:            JSON.parse 매번      JSON.parse 매번
                          ───────────────      ───────────────
                          ↑ 낭비                ↑ 정당

목표 비용 부과:            0                    JSON.parse 매번
                          ───────────────      ───────────────
                          ↑ 최적                ↑ 정당
```

해결: **lazy observation**. 99% 트래픽은 cheap pre-filter로 거르고, 통과한
frame만 parse한다. relay 동작은 그대로.

## 4. 시각화

### 4-1. 현재 동작: 모든 frame을 무조건 parse

```
                      inband-proxy.ts (현재)

   TUI                                              app-server
    │                                                    │
    │  client → server frame                             │
    │ ────────────────────────────►                      │
    │                              │                     │
    │                              ├── 1. send (relay) ──┤
    │                              │                     │
    │                              └── 2. JSON.parse  ◄── 무조건 parse!
    │                                  observeClient       (크기 무관)
    │                                                    │
    │                              ┌── 1. send (relay) ──┤
    │                              │                     │
    │                              └── 2. JSON.parse  ◄── 무조건 parse!
    │  server → client frame       observeUpstream         (1MB frame도)
    │ ◄────────────────────────────                      │
    │                                                    │
```

문제: 99% 트래픽은 binding과 무관 (token delta, exec output, file read).
그런데도 매번 parse → 큰 frame이면 event loop 막힘.

### 4-2. 제안 동작: lazy parse

```
                      inband-proxy.ts (제안)

   TUI                                              app-server
    │                                                    │
    │  client → server frame                             │
    │ ────────────────────────────►                      │
    │                              │                     │
    │                              ├── 1. send (relay) ──┤ ← 즉시 relay
    │                              │                     │
    │                              └── 2. CHEAP FILTER ──┐
    │                                  ┌─────────────────┴───────────┐
    │                                  │ frame.indexOf("thread/start")│
    │                                  │ || indexOf("thread/fork")    │
    │                                  └──────┬──────────────┬────────┘
    │                                       hit│            miss
    │                                          ▼              │
    │                                     JSON.parse          │
    │                                     observeClient    [skip]
    │                                                         │
    │                              ┌── 1. send (relay) ──┤ ← 즉시 relay
    │                              │                     │
    │                              └── 2. CHEAP FILTER ──┐
    │                                  ┌─────────────────┴───────────┐
    │                                  │ pendingBindings.size > 0    │
    │                                  │ && frame.length < 4 KB      │
    │                                  └──────┬──────────────┬────────┘
    │                                       both              one fails
    │                                       true              │
    │                                          ▼              │
    │                                     JSON.parse          │
    │                                     observeUpstream  [skip]
    │  server → client frame                                  │
    │ ◄────────────────────────────                          │
```

핵심: relay는 항상 즉시 발생 (decision 결정과 일치). parse만 cheap filter 뒤로 미룸.

### 4-3. cheap filter 의사결정 트리

#### client → server 방향

```
frame 도착
   │
   ▼
relay 먼저 보냄 ──────────────────────► 항상
   │
   ▼
frame.indexOf("thread/start") !== -1
  || frame.indexOf("thread/fork") !== -1 ?
   │
   ├─ NO  ──► [skip] (turn input, 일반 request 등 - 99%)
   │
   └─ YES ──► JSON.parse
              │
              ▼
              method == "thread/start" 또는 "thread/fork"?
              │
              ├─ YES ──► pendingBindings.set(id, method)
              │
              └─ NO  ──► [skip] (substring 우연 일치 - 매우 드묾)
```

#### server → client 방향

```
frame 도착
   │
   ▼
relay 먼저 보냄 ──────────────────────► 항상
   │
   ▼
pendingBindings.size > 0 ?
   │
   ├─ NO  ──► [skip] (관찰할 대상 없음 - 대부분의 시간)
   │
   └─ YES ──► frame.length < 4 KB ?
              │
              ├─ NO  ──► [skip] (큰 item delta, exec output, file read)
              │                  binding response는 절대 이 크기 아님
              │
              └─ YES ──► JSON.parse
                         │
                         ▼
                         id가 pendingBindings에 있나?
                         │
                         ├─ NO  ──► [skip] (다른 RPC response)
                         │
                         └─ YES ──► observeUpstreamFrame
                                    (binding_candidate or
                                     binding_uncertain emit)
```

### 4-4. 비용 비교

#### 시나리오 A: agent 1개가 큰 file read (1MB) 받는 중

| 단계 | 현재 | 제안 |
|---|---|---|
| relay | ~0.1 ms | ~0.1 ms |
| JSON.parse | ~2 ms (1MB) | 0 ms (skip) |
| observation | ~0.01 ms | 0 ms (skip) |
| **event loop occupied** | **~2.1 ms** | **~0.1 ms** |
| 다른 agent 영향 | 2 ms 막힘 | 영향 없음 |

#### 시나리오 B: agent가 `/clear` 침 (binding event)

| 단계 | 현재 | 제안 |
|---|---|---|
| relay (request) | ~0.1 ms | ~0.1 ms |
| substring sniff | (없음) | ~0.001 ms |
| JSON.parse (request) | ~0.001 ms (수백 byte) | ~0.001 ms |
| relay (response) | ~0.1 ms | ~0.1 ms |
| JSON.parse (response) | ~0.001 ms | ~0.001 ms |
| observation | ~0.01 ms | ~0.01 ms |
| **총합** | **~0.2 ms** | **~0.2 ms** |

→ 큰 frame: 비용 사라짐. binding event: 비용 동일.

### 4-5. 시간축으로 본 "관찰할 일이 있는 window"

```
Codex 세션 일생을 시간축에 펴면:

t=0s     t=5s             t=120s          t=300s
│         │                │                │
▼         ▼                ▼                ▼
attach    turn 1           /clear           /new
 │        ───────►         │                │
 │        token            ─►              ─►
 │        delta            response         response
 │        많음              (작음)           (작음)
 │
 │  ◄ binding         ◄ relay only ►   ◄ binding ►   ◄ binding ►
 │    window                            window         window
 │    (~수십ms)                         (~수십ms)      (~수십ms)
 │
 └──────────────────────────────────────────────────────────────►
   대부분 시간 = relay-only         binding window = 매우 짧음
   (parse 필요 X)                   (parse OK)

현재 코드:  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  parse 항상 ON
제안 코드:  ┈┈┈■┈┈┈┈┈┈┈┈┈┈┈┈┈┈■┈┈┈┈┈┈■┈┈┈    parse는 점만
```

## 5. 해결 단계

이 문서는 **제안 단계** 학습 기록이다. spike·구현은 아직 안 됐다.

작업 흐름:

1. `history/27-step-10-codex-clear-new-rebind-spike.history.md`
   "Decision: Proxy Is Transparent Relay for All Frames" — relay 정책 확정.
2. (현재) `history/28-step-10-proxy-lazy-observation.history.md` — lazy
   observation working note. 측정 hook·구현·회귀 테스트 계획 보관.
3. (예정) spike에서 frame size 분포 수집 → cheap filter 구현 → 회귀 테스트
   추가 → step 10 production 통합.

## 6. commit 내역

미정 (제안 단계).

## 7. 어떻게 해결했는가 (제안)

### Rule

**relay는 항상 즉시. observation은 cheap pre-filter 통과한 frame만.**

### client → server

```text
1. raw relay 먼저 (지금처럼).
2. cheap substring sniff:
     frame.indexOf("thread/start") !== -1
   || frame.indexOf("thread/fork")  !== -1
3. 통과한 frame만 JSON.parse → pendingBindings에 id 등록.
```

`Buffer.indexOf`/`String.indexOf`는 ~GB/s throughput. 1MB frame도 µs 단위.

### server → client

```text
1. raw relay 먼저.
2. early bail: pendingBindings.size === 0  →  observation skip.
3. 그래도 들어왔으면: frame.length < 4 KB  →  parse.
                     frame.length ≥ 4 KB  →  skip (binding response는 작다).
```

- 큰 exec output, file read, patch, item delta는 (2) 또는 (3)에서 잘림.
- binding response는 thread metadata만 담은 수백 byte → 4 KB cutoff 안전.
- 더 fragile하지 않게 하고 싶다면 "outstanding pending id 중 하나가 frame
  안에 substring으로 등장하는지" check도 가능 (id가 UUID/숫자라 substring sniff 충분).

### Effect

- 정상 turn 트래픽 (token delta, exec output, file read) → **JSON.parse 0회**.
  event loop 영향 사라짐.
- `/clear`·`/new`·`/fork` window → 평소대로 parse, attribution 정확성 유지.
- 회귀 위험은 cheap filter 자체의 정확성뿐 → unit test로 lock down.

## 8. 배운 점 요약

1. **Cost model을 사용 패턴에 맞춰라.** "모든 input을 동일하게 처리"는 단순하지만,
   사용 빈도가 극단적으로 비대칭이면 (99% vs 1%) 그 단순함이 곧 낭비가 된다.
2. **결정과 비용 모델은 분리할 수 있다.** "transparent relay"라는 결정은 깨지
   않으면서, observation의 비용 모델만 lazy로 바꿀 수 있다. 결정 = 외부에서 본 동작,
   비용 모델 = 내부 구현 선택. 같이 묶어 생각하면 한쪽을 바꿀 때 다른 쪽을
   불필요하게 건드린다.
3. **proxy = relay obligation + observation.** 두 역할을 분리해서 생각하면, 어떤
   비용이 정당한지 (obligation) 어떤 비용은 lazy해도 되는지 (observation) 한눈에
   보인다.
4. **사용자 통찰 "결국 proxy는 rebind를 위한 거다"가 cost model 설계의 출발점이
   되었다.** 동작 정의가 아니라 *목적 정의*가 비용을 어디에 매길지 결정한다.
5. **측정 hook부터 심어라.** 최적화 결정은 frame size 실제 분포를 본 다음.
   `event-recorder.ts`/`inband-proxy.ts`의 observe 콜백에 `frame.length` 한
   줄 추가가 다음 spike에서 모든 데이터를 만들어준다.

## 관련 권위

- `history/27-step-10-codex-clear-new-rebind-spike.history.md` — Codex
  `/clear`·`/new`·`/fork` rebind spike와 transparent relay decision.
- `history/28-step-10-proxy-lazy-observation.history.md` — 이 문서의 working
  note 짝. 측정 hook·구현 계획 보관.
- `docs/aiox/proxy-attribution-signals.md` — 이 문서의 signal 축 짝. 1%
  binding window 안에서 어떤 신호로 `/clear`·`/new`·`/fork`를 구분하는지
  (method + sessionStartSource + forkedFromId 매핑, 시퀀스 다이어그램).
- `spikes/codex-app-server-multi-session-poc/inband-proxy.ts` — 현재 구현.
- `spikes/codex-app-server-multi-session-poc/inband-proxy.test.ts` — 회귀 테스트.
