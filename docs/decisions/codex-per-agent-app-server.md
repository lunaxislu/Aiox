# Codex Per-Agent App-Server (1:1)

## Context

aiox MVP의 Codex 어댑터는 사용자 TUI와 daemon이 같은 Codex 대화 스레드를 공유해야
한다. 초기 설계는 "여러 Codex 에이전트가 하나의 app-server를 공유(1:N)"하는 구조를
검토했다. `history/5`에서 shared app-server + `codex --remote ws://...` TUI + 외부
WS client가 같은 thread/turn 스트림을 실시간으로 공유함을 직접 실험으로 확인했다.
이후 `history/27·28`에서 per-agent in-band WebSocket proxy + shared app-server 구조로
attribution 메커니즘을 설계했다.

## Decision

**Codex 에이전트 1개당 독립적인 app-server 자식 프로세스 1개를 띄운다 (1:1 per-agent
app-server).** OS-assigned 포트(`--listen ws://127.0.0.1:0`)를 사용해 포트 충돌을
원천 차단한다.

## Alternatives

- **Shared app-server (1:N)**: 여러 aiox Codex 에이전트가 하나의 app-server를 공유.
  기술적으로 가능함이 `history/5`에서 검증되었다. 그러나 "어느 에이전트의 turn인가"를
  판별하기 위한 attribution 로직이 별도로 필요하고, `/clear`·`/new`·`/fork` rebind
  시 protocol-transparent relay + lazy parse + binding correlation이 Codex 릴리스마다
  forward-compat 리스크를 안는다.
- **Per-agent proxy + shared app-server**: `history/27·28`의 spike 방향. per-agent
  proxy를 앞에 두어 attribution은 해결하지만 구조 복잡도가 남는다.

## Rationale

1. **Attribution 문제가 protocol 계층에서 사라진다.** endpoint = agent이 자명해져
   별도 policy, spike, rebind regression matrix가 불필요하다.
2. **Codex 설계 의도와 일치한다.** app-server는 per-session remote TUI 엔드포인트로
   문서화되어 있다. 하나의 app-server에 복수 aiox 에이전트 identity를 multiplex하는
   것은 문서화된 사용 패턴이 아니다.
3. **리소스 비용이 MVP 시나리오에서 수용 가능하다.** 로컬 단일 사용자, 에이전트 수
   single-digit 가정에서 ~100 MB × N은 병목이 아니다.
4. **운영 단순성.** 프로세스 감독(start/stop/health/zombie)은 잘 알려진 패턴이다.
   Protocol-transparent relay + lazy parse는 Codex 프로토콜에 특화된 신규 메커니즘으로
   Codex 릴리스 변경에 취약하다.
5. **Codex app-server는 Experimental 상태다.** Experimental 프로토콜 위에 transparent
   relay를 구축하면 프로토콜 변경 시 blast radius가 크다; 프로세스 격리는 이를 에이전트
   단위로 국소화한다.

## Trade-offs

- 에이전트당 ~94 MB RSS 추가 (Node wrapper ~47 MB + Rust app-server ~47 MB,
  `history/29` codex 측정값).
- app-server lifecycle 관리(launch, readyz polling, SIGTERM/SIGKILL, zombie 방어)를
  daemon이 소유해야 한다.

## Re-evaluation

- 에이전트 수가 single-digit을 넘어 ~100 MB × N이 실제 병목이 될 때.
- Codex app-server가 Experimental 딱지를 벗고 multi-client multiplexing을 공식
  지원하는 API를 제공할 때.

## Sources

- `history/5` — shared app-server(1:N) 기술적 가능성 검증 기록
- `history/29` — per-agent app-server pivot 결정문 (in-band proxy spike 대비 최종 선택)
- `history/31` — production direction 확정 + banner stderr 검증
- `history/33` — Phase A implementation contract 결정
- `docs/aiox/proxy-vs-app-server-tradeoff.md` — tradeoff 학습 기록 (docs/aiox/ 삭제 예정)
