# Proxy vs Per-Agent App-Server: Cross-Validation Learning Record

> **STATUS (2026-05-20)**: 현재 Step 10 production 방향은
> **Codex agent 1개당 app-server 1개, port는 OS 자동 할당**이다. 권위:
> `history/31-step-10-per-agent-app-server-runtime.history.md`.
> 이 문서는 그 결정을 만든 cross-validation 학습 기록이다.

aiox Step 10에서 "Codex per-agent in-band WebSocket proxy"를 선택한 뒤,
사용자 의문 → codex cross-validation → 최종적으로 **per-agent app-server**로
정리된 대화의 학습 기록.

권위 결정 자체는 `history/31-step-10-per-agent-app-server-runtime.history.md`
에 있다. 이 문서는 *어떻게 거기에 도달했는가*의 사용자 학습 기록.

## 1. 배경

`history/27`에서 Codex `/clear`·`/new`·`/fork` rebind를 위해 per-agent
in-band WebSocket proxy 구조를 선택했다. 이후 `history/28`에서 그 proxy의
비용 모델(lazy observation)을 다듬고, `docs/aiox/proxy-cost-model.md`와
`docs/aiox/proxy-attribution-signals.md`로 학습 기록도 만들었다.

전체 작업이 spike + 결정 + 정책 + 문서까지 두꺼워진 상태에서 사용자가
가벼운 톤으로 던진 질문이 결정적이었다:

> 야 근데 이렇게 websocket으로 proxy 띄울거면 각각의 codex마다 app-server를
> 띄우는게 더 나으려나? ㅋㅋㅋㅋㅋㅋ

매몰비용 무시한 가장 깔끔한 질문. 이것이 codex cross-validation의 출발점이
되었다.

## 2. 이해 못 했던 부분

사용자가 막혔던 (또는 의심했던) 3가지:

1. **WebSocket을 굳이 띄워야 하나?** JavaScript closure나 `new Proxy`로
   in-process 객체만으로 대체 못 하나?
2. **Port가 충돌하지 않을까?** 개발자가 이미 점유한 포트와 부딪치면?
3. **Proxy WebSocket 하나로 여러 agent를 받는 multi-listener 구조는
   가능한가? 안 되는 거야, 아니면 복잡해지는 거야?**

이 셋 모두 codex에게 외부 시점으로 검증 요청한 항목.

## 3. agent의 설명 (codex cross-validation 응답 요약)

### Q-A. WebSocket 대체 (closure / `new Proxy`)

- **A-1 (cosmetic)**: 가능하지만 의미 없음. `pendingBindings` Map은 이미
  connection-local closure로 표현됨. `new Proxy`는 JS 객체 trap이라
  WebSocket frame boundary와 무관.
- **A-2 (구조 대체)**: **불가능**. Codex TUI는 외부 process이고 공식 remote
  mode가 `codex --remote ws://...`로 WebSocket endpoint를 강제. daemon
  안의 in-memory 객체만 두면 TUI가 연결할 곳이 없음.
- 공식 문서 근거: Codex CLI features /reference.

### Q-B. proxy vs per-agent app-server tradeoff (실측 포함)

codex가 로컬에서 직접 측정 (Codex CLI v0.131.0, 빈 app-server 1개):

| Item | per-agent app-server |
|---|---|
| Node wrapper RSS | ~47 MB |
| Rust codex app-server RSS | ~47 MB |
| **합산 / agent** | **~94 MB** |
| FD | Node ~12 + Rust ~25 ≈ ~37 |
| Boot to readyz | < 1 s |
| model API client / SQLite / log / thread cache | process-local |

- **shared app-server의 이득은 제한적**: thread cache, HTTP/model client
  재사용, MCP/config 초기화 공유. local single-user + 한 자릿수 agent에서
  attribution 복잡도를 정당화할 만큼 크지 않음.
- **per-agent lifecycle도 공짜 아님**: graceful shutdown, health, port,
  zombie 방어. 그러나 일반 process supervision 문제 → 표준 패턴.
- **Codex 설계 의도**: app-server는 remote TUI / debug / local dev endpoint
  로 문서화. **Experimental** 표시. "한 app-server에 여러 aiox agent
  identity를 multiplex"하는 권위 신호 없음.
- **권고**: per-agent app-server로 pivot. Port는 `--listen ws://127.0.0.1:0`
  로 OS 자동 할당한다.

### Q-C. Virtual port / port 충돌 (사용자 후속 질문)

- Codex가 `--listen ws://127.0.0.1:0`을 지원함.
- codex가 직접 실행 검증:
  ```
  $ codex app-server --listen ws://127.0.0.1:0
    listening on: ws://127.0.0.1:58704
    readyz:  http://127.0.0.1:58704/readyz
    healthz: http://127.0.0.1:58704/healthz
  ```
- 운영 흐름:
  1. `codex app-server --listen ws://127.0.0.1:0` 실행
  2. stdout에서 `ws://127.0.0.1:<assigned>` 파싱
  3. readyz HTTP 확인
  4. `codex --remote ws://127.0.0.1:<assigned>` 실행
  5. agent state에 endpoint 저장
- OS가 원자적으로 빈 포트 할당 → "빈 포트 찾고 나중에 bind" race 없음.
- 개발자 점유 포트와 충돌 X.

### Q-D. Proxy WebSocket 하나로 multi (사용자 후속 질문)

가능하지만 복잡도가 늘어남. 3가지 구조:

1. **per-agent proxy port** (현재 spike): 단순, 포트 N개.
2. **one proxy listener + per-agent upstream connection**: 포트 1개, 식별은
   path/query/token (예: `ws://127.0.0.1:<p>/codex/alpha?token=...`).
   내부 state는 connection별 분리.
3. **one proxy listener + shared upstream connection**: JSON-RPC id
   namespace multiplex, server notification broadcast, response demux,
   close/error propagation을 직접 처리해야 함. transparent proxy가 아니라
   **quasi-router**가 됨. MVP 비추천.

codex 평가: proxy를 *유지한다면* 2번이 최선. 그러나 per-agent app-server로
pivot할 거면 proxy 자체가 불필요.

## 4. 시각화

### 4-1. Codex rebind 방법 3가지

Step 10에서 실제로 비교한 rebind/attribution 방법은 다음 3가지다.

| Option | 구조 | Rebind/attribution 기준 | 현재 상태 |
|---|---|---|---|
| A. **Per-agent app-server** | agent마다 `codex app-server` 1개 | endpoint 자체가 agent identity. `/clear`·`/new`·`/fork`는 그 endpoint 안의 active thread id 갱신 문제 | **MVP 채택** |
| B. **Per-agent proxy port + shared app-server** | agent마다 proxy endpoint 1개, app-server는 shared | proxy connection의 same-client `thread/start` / `thread/fork` request-response correlation | validated fallback |
| C. **One proxy listener + multi-agent routing** | proxy listener 1개가 여러 TUI를 받음 | path/query/token으로 agent 식별 + connection-local state. shared upstream이면 JSON-RPC multiplex/demux 필요 | future optimization 또는 비추천 |

현재 MVP는 A를 선택한다. B와 C는 Codex protocol 이해와 fallback 후보로
남긴다.

### 4-2. 구조 비교

```
[A] per-agent app-server (MVP 채택)
───────────────────────────────
TUI alpha ──ws──► codex app-server α (port :0 → :58704)
TUI beta  ──ws──► codex app-server β (port :0 → :58705)
TUI gamma ──ws──► codex app-server γ (port :0 → :58706)
                  ↑ daemon이 supervisor: start/stop/health
                  ↑ port는 OS 자동 할당 → 충돌 X
                  ↑ endpoint = agent → attribution 자명


[B] per-agent proxy port (validated fallback)
─────────────────────────────────────
TUI alpha ──ws──► proxy α (port A) ──ws──► shared codex
TUI beta  ──ws──► proxy β (port B) ──ws──► app-server
TUI gamma ──ws──► proxy γ (port C) ──ws──►


[C-1] one proxy listener + per-agent upstream
────────────────────────────────────────────
TUI alpha ──ws──┐
TUI beta  ──ws──┼──► one proxy (port P)
TUI gamma ──ws──┘   ├ /codex/alpha ──ws──► shared codex
                    ├ /codex/beta  ──ws──► app-server
                    └ /codex/gamma ──ws──►


[C-2] one proxy listener + shared upstream (비추천)
─────────────────────────────────────────────────
TUI alpha ──ws──┐
TUI beta  ──ws──┼──► one proxy (port P) ──ws──► shared codex
TUI gamma ──ws──┘     (manual JSON-RPC id    app-server
                       multiplex, broadcast
                       demux, close routing)
```

### 4-3. Trade-off 표

| 항목 | **[A] per-agent app-server** | [B] proxy per port | [C-1] one proxy listener | [C-2] shared upstream |
|---|---|---|---|---|
| 포트 수 | N (OS 자동 할당) | N | 1 | 1 |
| 포트 충돌 위험 | **없음 (`:0` bind)** | 낮음 if `:0`, 있음 if fixed | 낮음 if `:0`, 있음 if fixed | 낮음 if `:0`, 있음 if fixed |
| Codex 프로세스 수 | N | 1 | 1 | 1 |
| Memory | N× ~94MB | 1× Codex (~94MB) | 1× Codex | 1× Codex |
| Attribution | **자명 (endpoint = agent)** | same-client proxy correlation | path/token + connection state | quasi-router 자체 구현 |
| Proxy 코드 | **0 line** | ~315 line | ~315 line + routing | + multiplex/demux |
| 회귀 테스트 | **proxy 테스트 0건** | transparent relay + binding tests | proxy routing tests 추가 | 더 많음 |
| Codex 설계 정합 | **가장 단순** | protocol wrapper | protocol wrapper | protocol router |
| 운영 복잡도 | process lifecycle medium | proxy medium | proxy high | very high |
| Crash 격리 | **agent별 app-server 격리** | shared app-server 영향 큼 | shared app-server 영향 큼 | shared app-server 영향 큼 |
| Boot 시간 | N회 (병렬 가능, <1s observed) | 1회 | 1회 | 1회 |
| Forward-compat (Codex 변경) | **가장 강함** | relay/protocol 변화 주의 | 더 주의 | 가장 위험 |

### 4-4. Port `:0` bind 동작

```
[before bind]                  [after bind]
                               
process A: --listen ws://:0    process A: listening on :58704 ◄─ OS가 할당
process B: --listen ws://:0    process B: listening on :58705 ◄─ OS가 할당
process C: --listen ws://:0    process C: listening on :58706 ◄─ OS가 할당
                               
                               개발자가 점유한 port (3000, 8080, ...) 회피
                               race condition 없음 (atomic 할당)
                               stdout parsing으로 endpoint 획득
```

## 5. 해결 단계

작업 흐름:

1. 사용자가 "이렇게 proxy 띄울 거면 app-server를 1:1로 띄우는 게 낫지
   않냐?" 의문 제기.
2. claude (이 agent)가 trade-off 비교 작성 후 **codex cross-validation
   필요성** 인정 — 매몰비용 합리화 회피 목적.
3. claude가 codex에게 던질 prompt 작성 (anti-sunk-cost instruction 포함).
4. codex가 3개 영역 (A-closure 대체 / B-tradeoff / C-port collision)에
   대해 답변. B-1 실측 포함.
5. 사용자가 follow-up으로 "port :0", "proxy 하나로 multi 가능?" 추가
   질문 → codex 답변.
6. 사용자가 follow-up으로 Docker Engine/container-like runtime product model을
   제안.
7. 최종 방향을 **per-agent app-server + OS-assigned port**로 잡고,
   `CodexAgentRuntime` product boundary를 권위 문서에 반영.
8. 중간 검토 기록은 `history/29`, 최종 권위 결정은 `history/30`에 기록.

## 6. commit 내역

별도 commit 없음 — 결정·학습 기록 단계. 다음 단계 (Step 10 Phase A 재진입)
에서 plan 업데이트 + 구현 commit이 따로 나옴.

## 7. 어떻게 결정했는가

핵심 결정 요인 (independent reasons, compound):

1. **Attribution 문제 자체 소멸**. endpoint = agent니까 spike·정책·테스트가
   전부 불필요해짐.
2. **Codex 설계 정합**. Codex 문서가 app-server를 per-session으로 묘사,
   shared multiplex 권위 신호 없음.
3. **자원 비용 수용 가능**. agent 한 자릿수 × ~100MB = MVP 시나리오에서
   bottleneck 아님.
4. **운영 단순성**. process supervision은 표준, transparent relay는 Codex
   protocol-specific novelty.
5. **Codex app-server Experimental**. transparent relay는 protocol 변경에
   취약, per-process 격리는 blast radius 제한.
6. **Port 충돌 우려 해소**. `--listen ws://127.0.0.1:0`로 OS 자동 할당.
7. **매몰비용 명시 차단**. codex cross-validation prompt에 "이미 만들었다는
   사실로 결론 보정하지 마"를 박았고, 그래도 결론은 pivot.

## 8. 배운 점 요약

1. **가벼운 의문이 가장 깔끔한 질문일 수 있다.** 사용자의 "ㅋㅋㅋ" 톤으로
   던진 질문이 spike+결정+문서 3주분을 재검토하게 만들었다. 작업이 두꺼울수록
   매몰비용 편향이 커지므로, 외부 시점 확보(codex cross-validation)는 의도적
   장치로 도입해야 한다.
2. **WebSocket은 design choice가 아니라 강제 조건.** Codex TUI가 `--remote
   ws://`로만 connect 가능하므로, in-band 위치에 있으려면 양쪽 WebSocket
   필수. closure/`new Proxy`로 transport 대체 불가.
3. **`:0` bind는 충돌 회피의 정석.** "빈 포트 찾고 나중에 bind"는 race가
   있지만 `:0`는 OS가 원자적으로 할당. listening 후 stdout/`getsockname()`
   으로 endpoint 획득.
4. **"가능" vs "단순"은 다르다.** Proxy WebSocket 하나로 multi를 만드는 건
   *가능*하지만, identity boundary가 여전히 connection별로 필요. 옵션 3 (
   shared upstream)은 가능성과 운영 위험이 정비례하지 않는다.
5. **공식 문서의 Experimental 표시는 forward-compat risk signal.** Codex
   app-server가 Experimental이라는 사실은 transparent relay 같은 protocol-
   wrap 방식을 *불리하게* 만든다. per-process 격리가 protocol churn에 강함.
6. **Cross-validation의 진짜 가치는 측정.** codex가 RSS·FD·boot를 *실제로
   측정*해 답을 준 게 결정의 가장 강한 근거. 추정만으로 갔다면 결정 신뢰도
   훨씬 낮았을 것.
7. **선언적 결정(권위) + 정성적 기록(학습)은 분리 가치 있다.** history/30은
   "무엇을 결정했고 무엇을 fallback으로 남기는가"의 권위, 이 문서는 "어떻게
   거기에 도달했는가"의 학습 흔적이다. 두 파일이 짝으로 존재할 때 미래에 결정
   재검토가 가능해진다.

## 관련 권위

- `history/31-step-10-per-agent-app-server-runtime.history.md` — 현재 권위 결정.
  per-agent app-server + OS-assigned port, runtime/container-like product
  model 포함.
- `history/30-step-10-per-agent-proxy-runtime.history.md` — 구현 전 superseded된
  proxy-first 중간 오기록.
- `history/29-step-10-per-agent-app-server-pivot.history.md` — per-agent
  app-server pivot 근거.
- `history/27-step-10-codex-clear-new-rebind-spike.history.md` — Codex
  `/clear`·`/new`·`/fork` spike data와 active transparent relay decision.
- `history/28-step-10-proxy-lazy-observation.history.md` — proxy cost model과
  lazy observation refinement. transparent relay 테스트 이후 적용 후보.
- `docs/aiox/proxy-cost-model.md` — shared app-server + per-agent proxy
  시나리오의 cost model 기록.
- `docs/aiox/proxy-attribution-signals.md` — Codex 프로토콜 시그널 매핑.
  per-agent proxy runtime에서도 thread id 갱신 신호로 유효.
- `spikes/codex-app-server-multi-session-poc/inband-proxy.ts` — validated
  but not chosen.
- Codex CLI 공식 문서:
  https://developers.openai.com/codex/cli/features#connect-the-tui-to-a-remote-app-server
  https://developers.openai.com/codex/cli/reference#command-overview
