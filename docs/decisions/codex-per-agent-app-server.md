# Codex Per-Agent App-Server (1:1)

## Context
aiox MVP의 Codex 어댑터는 사용자 TUI와 daemon이 같은 Codex 대화 스레드를 공유해야 한다. 초기 설계는 "여러 Codex 에이전트가 하나의 app-server를 공유(1:N)"하는 구조를 검토했다. 초기 prototype 검증에서 shared app-server + `codex --remote ws://...` TUI + 외부 WS client가 같은 thread/turn 스트림을 실시간으로 공유함을 직접 실험으로 확인했다. 이후 proxy spike에서 per-agent in-band WebSocket proxy + shared app-server 구조로 attribution 메커니즘을 설계했다.

## Decision
**Codex 에이전트 1개당 독립적인 app-server 자식 프로세스 1개를 띄운다 (1:1 per-agent app-server).** OS가 할당하는 포트(`--listen ws://127.0.0.1:0`)를 사용해 포트 충돌을 원천 차단한다.

## Alternatives
- **Shared app-server (1:N)**: 여러 aiox Codex 에이전트가 하나의 app-server를 공유. 기술적으로 가능함이 초기 prototype 검증에서 확인되었다. 배제 이유: "어느 에이전트의 turn인가"를 판별하기 위한 attribution 로직이 별도로 필요하고, `/clear`·`/new`·`/fork` rebind 시 protocol-transparent relay + lazy parse + binding correlation이 Codex 릴리스마다 forward-compat 리스크를 안는다. 1:1은 attribution을 프로세스 경계로 환원해 이 위험을 제거한다.
- **Per-agent proxy + shared app-server**: proxy spike에서 검토한 방향. per-agent proxy를 앞에 두어 attribution은 해결하지만 shared app-server의 forward-compat 리스크와 구조 복잡도가 그대로 남아 배제했다.

## Rationale

### 1. OS-assigned 포트
포트를 직접 선택하면 다중 에이전트 환경에서 충돌·예약 관리 부담이 생긴다. `--listen ws://127.0.0.1:0`으로 커널이 빈 포트를 할당하게 하여 충돌 가능성을 설계 단계에서 제거한다. loopback 강제는 외부 노출을 차단한다.

### 2. Stderr-first 엔드포인트 수집 (제약)
Codex CLI 실측에서 기동 배너(`listening on: ...`)가 stdout이 아닌 **stderr**로 나온다는 점이 확인됐다. 이는 우리가 고른 설계가 아니라 upstream이 강제하는 제약이며, 엔드포인트 수집을 반드시 stderr 기준으로 짜야 하는 이유다. 엔드포인트 수집 계약은 architecture가 소유한다 — [[local-runtime-codex-adapter]] §7.2.

### 3. readyz를 직접 poll하는 이유 (D2)
WS 핸드셰이크 성공만으로는 app-server의 HTTP 준비 상태를 합성(synthesis)할 수 없다. ws 연결 성공과 readyz 200은 서로 다른 준비 단계라서, ws→http 준비를 추론하는 대신 readyz HTTP GET을 직접 확인해야 false-ready를 막을 수 있다. poll 절차·타임아웃·간격 같은 수치 계약은 architecture가 소유한다 — `local-runtime-codex-adapter.md` §7.2.

### 4. turn/start ack를 fire-and-forget으로 받는 이유 (D4)
인젝션의 성공 판정을 모델 답변 완료(`turn/completed`)에 묶으면 daemon이 모델 추론 시간 내내 블록되고, 라우팅 fan-out이 가장 느린 타깃에 동기화된다. 그래서 ack는 "turn이 같은 thread에 수락됐다"는 수용 신호로만 정의하고 모델 완료와 의미론적으로 분리한다. ack 의미·요청 본문·thread-mismatch guard 같은 계약은 architecture가 소유한다 — `local-runtime-codex-adapter.md` §7.6.

### 5. daemon이 lifecycle을 소유하는 이유 (D5)
1:1 구조에서 app-server는 daemon의 직접 자식이다. TUI(CLI-child)나 OS process group에 정리를 맡기면 daemon이 죽거나 attach가 실패할 때 zombie app-server가 남는다. 그래서 정상 종료 시퀀스와 attach 실패 시 정리를 모두 daemon이 소유한다. 종료 시퀀스 수치(SIGTERM→grace→SIGKILL)와 attach 실패 경로(단일 SIGTERM, SIGKILL 미escalation)는 architecture가 소유한다 — [[local-runtime-process-topology]] §1·`local-runtime-codex-adapter.md` §7.9(정상 종료), `local-runtime-codex-adapter.md` §7.2(attach 실패 경로). process group kill·setsid·heartbeat·auto-reconnect는 자원 누수 방어와 범위 단순화를 위해 MVP에서 배제한다.

### 6. 명시적 resume만 허용하는 이유 (D6)
daemon 재기동 시 세션을 자동 추정해 재개하면 잘못된 thread에 바인딩될 위험이 있다. 그래서 `--resume <session-id>` 플래그를 통한 명시적 바인딩만 신뢰하고, auto-resume는 배제한다. fresh attach는 `thread/start`를 건너뛰고 명시적 resume 또는 첫 loaded-thread 전달 전까지 session id를 null로 둔다.

## Trade-offs
- 에이전트당 ~94 MB RSS 추가 (Node wrapper ~47 MB + Rust app-server ~47 MB, per-agent app-server pivot 당시 Codex 측정값 — 역사적 측정치).
- app-server lifecycle 관리(launch, readyz polling, 종료 시퀀스, zombie 방어)를 daemon이 소유해야 한다.

## Re-evaluation
- 에이전트 수가 single-digit을 넘어 ~100 MB × N이 실제 병목이 될 때.
- Codex app-server가 Experimental 딱지를 벗고 multi-client multiplexing을 공식 지원하는 API를 제공할 때.

## Sources
- `docs/architecture/local-runtime-codex-adapter.md` §7.2·§7.6·§7.9 +
  `docs/architecture/local-runtime-process-topology.md` §1 — launch/lifecycle 계약
  owner (former `local-agent-runtime.md`에서 split).
- `logs/2026-06-23-workspace-reset-pre-validation-spike-archive.md` §1 — shared
  Codex app-server feasibility spike provenance.
- `logs/2026-06-19-mvp-history-archive.md` §2.2 and §3.1 — retained Step 10
  Codex runtime and proxy/app-server pivot digest.
- `logs/2026-06-23-workspace-reset-aiox-smoke-test-archive.md` §1 — retained
  manual smoke provenance for app-server launch, readyz/listen, resume and
  rollback behavior.
