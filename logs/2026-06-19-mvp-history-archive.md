---
topic: MVP step history and QA trace archive
description: aiox MVP step-by-step implementation, testing trace, and QA-001 ~ QA-003 validation archive log (successor of history/42 baseline)
status: decided
---

## Work Items

## 2026-06-19 · W5 B3 MVP history archive digest

# MVP History & QA Trace Archive

이 로그는 `history/` 디렉토리 전체 삭제에 대응하여, `history/20`, `history/23`, `history/27`, `history/34`, `history/36`, `history/39`, `history/40`(일부 구현부), `history/41`, `history/42`에 산재해 있던 다중 TDD 구현 단계, 수동 에러 검증, 스파이크 결과 및 MVP 마감 베이스라인 등의 역사적 기록(Provenance/QA trace)을 영구 보존하기 위해 작성되었습니다.

본 문서는 `history/README.md` 및 `history/42`가 가리키고 있던 진입점 권위를 승계하여, 프로젝트의 검증 베이스라인과 발견성(discoverability)을 이관받습니다.

---

## 1. MVP 검증 베이스라인 & 마감 이력
(Original source: `history/42-mvp-implementation-closeout.history.md`)

- **마감 일자**: 2026-05-26
- **구현 마감 범위**:
  - 사용자 로컬 데몬 소켓 분리 (`getDefaultSocketPath() -> ~/.aiox/daemon.sock`).
  - Codex 및 Claude 에이전트의 attach 및 reconnect 생명주기 관리.
  - 양방향 directed routes 및 pair 예약(cardinality = 2).
  - Claude 채널 및 Codex MCP를 통한 양방향 메시지/답장 라우팅.
  - 에이전트별 독립 앱서버 및 인밴드 transparent proxy를 통한 Codex 스레드 바인딩.
  - 레이지 웹소켓 파싱 필터 패턴을 활용한 Node.js 이벤트 루프 블로킹 가드.
- **자동 검증 베이스라인**:
  - 총 **48개 파일**, **360개 테스트 케이스** 통과 완료 (2026-05-26 closeout verification 기준; history/42 원문은 마감 commit hash를 기록하지 않음).
  - 릴리스 가상 스모크 테스트 통과 (TUI `/clear`, `/new`, `/fork`, `/resume` 재결합 정상 동작 검증).

---

## 2. 세부 개발 단계별 TDD 실측 추적

### 2.1. Step 7: Pair Daemon & Store Invariants (history/23)
- **주요 내용**: `agents.attach`의 시그널 정리(D1 X-strict) 후 단일 트랜잭션 경계(`withTransaction`)와 모듈 내 `Symbol` 롤백 센티넬 패턴을 적용하여 DB 무결성을 검증함.
- **TDD 실행**:
  - `tests/unit/daemon/pair-store.test.ts` 내 4개 가설 수립 및 레드 테스트 유도.
  - 동일 종류 에이전트 attach 시도 시 `pair_kind_slot_occupied`(Step 7 당시 이름; Step 15 kind-agnostic 일반화로 현재 코드명은 `pair_slot_occupied`) 오동작 및 ready 상태 전이 실패 수정 후 그린 확인.
  - 최종 5개 테스트 케이스 및 전체 29개 파일(151개 테스트) 통과 완료 (Commit: `6250a3b`).

### 2.2. Step 10: Codex Runtime Implementation (history/34)
- **주요 내용**: per-agent 1:1 앱서버 및 CLI 연동 TDD 구현 이력.
- **TDD 실행 (R1~R4)**:
  - **Round 1 (app-server foundation)**: 앱서버 실행 감시, `readyz` 폴링 중 돌발 exit 포착 추가 (Commit: `1f9d7d6`).
  - **Round 2 (TUI remote launch)**: TUI `--remote` 인수 주입 및 spawn-fail 시 `channels_disabled` 전이 테스트 (Commit: `ff08c02` [unverified historical hash; current git object not found]).
  - **Round 3 (injector wiring)**: `turn/start` RPC 전송 규격 정합화 및 비정상 payload 거절 검증 (Commit: `da6210f` [unverified historical hash; current git object not found]).
  - **Round 4 (lifecycle hardening)**: TUI 비정상 종료 시 cleanup 전이, orphan process 정리 및 포트 자동 할당 예외처리 검증 (Commit: `cc8012b` [unverified historical hash; current git object not found]).
  - **D7 binding**: TUI 자체 신규 턴 발생(`/clear`, `/new`) 시 daemon의 감시용 별도 웹소켓 커넥션으로는 동시 응답 조회가 불가능함을 실측 검증 (D7 Option D: aiox 내부에서 시작된 턴에만 권위 부여).

---

### 2.3. Step 14: Daemon/Client Split Smoke Remediation (history/40 일부)
- **주요 내용**: CLI 다중 터미널 실행 시의 동시성 및 소켓 공유 오작동 디버깅 내역.
- **Smoke Fix**:
  - `mkdtempSync` 사용으로 소켓 경로가 유실되던 문제를 고정 경로 `~/.aiox/daemon.sock` 및 `AIOX_SOCKET_PATH` 환경변수로 통일하여 해결.
  - 클라이언트가 소켓 연결 가능 여부를 먼저 probe(`canConnect`)한 뒤 데몬이 없으면 detached 자식 프로세스로 데몬(`aiox _run-daemon`)을 fork 기동하는 구조 구현.
  - 데몬 종료 요청 시 클라이언트가 소켓 소멸을 bounded-waiting하는 자율 소멸 시퀀스 검증.

### 2.4. Step 13: Codex MCP Ingress (history/39)
- **주요 내용**: Codex → daemon 방향 MCP ingress 연결의 spike·결정·closeout 기록. current behavior(런타임 주입·ingress RPC)의 owner는 `docs/architecture/local-agent-runtime.md` §7.8이며, 본 digest는 provenance 보존용이다.
- **검증·결정 요지 (provenance)**:
  - Codex CLI `-c 'mcp_servers.aiox={...}'` inline override로 글로벌 config 변경 없이 per-process MCP 서버를 주입할 수 있음을 실측 검증 (Step 13 spike).
  - daemon 측 ingress 진입점으로 hidden `aiox mcp-codex` stdio subcommand를 도입 (사용자 노출 없는 내부 채널).
  - ingress 수신에 token 기반 authz를 적용해 임의 로컬 프로세스의 메시지 주입을 차단 (token hardening).
  - **Step 14 correction**: 초기 TUI 직접 주입 결정은 이후 daemon-owned app-server injection 경로로 이동됨 (변경 경위가 history/39 closeout에 기록됨).

---

## 3. 웹소켓 프록시 및 스레드 바인딩 분석 (history/27, history/41)

### 3.1. Codex Transparent Proxy Spike (history/27)
- **주요 내용**: 단일 shared app-server 환경에서 transparent proxy를 앞에 두어 TUI의 `/clear`, `/new`, `/fork` 신호와 `thread/started`, `thread/fork` 이벤트를 가로채 에이전트 바인딩을 변경하는 아이디어의 유효성 검증.
- **관측 내역**:
  - `/clear` 및 `/new` 실행 시 신규 thread UUID 발급 확인.
  - `/fork` 시 `forkedFromId` 속성을 포함한 신규 thread 매핑 추적 가능성 확인.
  - 이후 구조 복잡성 및 forward-compatibility 리스크(Codex 릴리스 변경 시 프로토콜 깨짐)로 인해 MVP 프로덕션 구조는 **1:1 per-agent app-server**로 피벗함 (결정 owner: `docs/decisions/codex-per-agent-app-server.md`).

### 3.2. Orphan Thread 바인딩 회귀 분석 (history/41)
- **주요 내용**: 앱서버 종료 전까지 thread가 누적되지만 TUI에서 보이지 않는 "Orphan Thread" 발생 시나리오 분석.
- **발생 조건**:
  - CLI `attach` 시 `--resume`이 누락될 경우 daemon과 TUI가 각각 thread를 생성해 첫 턴이 무시되는 현상.
  - TUI 내에서 사용자가 수동으로 `/clear`, `/new`, `/fork`, 혹은 마우스 클릭으로 스레드를 바꿀 때 daemon이 이를 동적으로 관찰하기 어려움.
- **해결 휴리스틱**: `thread/loaded/list`의 마지막 항목(`loadedThreadIds.at(-1)`)을 가장 최근 활성 스레드로 추정하는 가정을 검증했으나, 정렬 순서 보장이 없으므로 Step 15에서는 wrong-thread 유도 fallback을 끄고 명확히 unconfirmed일 경우 `deferred` 처리하기로 결정함.

---

## 4. CLI 편의 기능 및 Deferral 기록

### 4.1. CLI 디자인 결정 유예 (history/20)
- **주요 내용**: commander 기반 exitCode 전파 정책 결정 과정.
- **세부 결정**:
  - commander가 자체 오류에 대해 지정한 `exitCode`를 우선 통과시키고, 그 외 진입 오류는 무조건 1로 대응.
  - `aiox send` 명령은 CLI 수준에서 노출하지 않고 daemon API 수준에서만 유지 (UI 노출은 YAGNI 원칙에 입각해 유예).

### 4.2. Status & Doctor 출력 명세 (history/36)
- **주요 내용**: CLI 상태 확인을 위한 출력 포맷 정렬 정책.
- **세부 결정**:
  - `aiox status`는 DAEMON → AGENTS → PAIRS → ROUTES → DELIVERIES 순서로 수동 포맷 정렬 출력하며 외부 이쁜이 테이블 라이브러리 사용을 금지함.
  - `aiox doctor` 진단 시 쉘 주입(Command Injection) 예외 방지를 위해 `execSync("which ...")` 대신 인자를 분리한 `spawnSync("which", [cmd])`를 사용함.

---

## 5. 승계 및 Sources
- [20-step-6-phase-a-decisions.history.md](../../history/20-step-6-phase-a-decisions.history.md)
- [23-step-7-phase-b-pair-daemon.history.md](../../history/23-step-7-phase-b-pair-daemon.history.md)
- [27-step-10-codex-clear-new-rebind-spike.history.md](../../history/27-step-10-codex-clear-new-rebind-spike.history.md)
- [34-step-10-phase-b-codex-runtime.history.md](../../history/34-step-10-phase-b-codex-runtime.history.md)
- [36-step-12-phase-a-doctor-status-decisions.history.md](../../history/36-step-12-phase-a-doctor-status-decisions.history.md)
- [39-step-13-codex-mcp-ingress.history.md](../../history/39-step-13-codex-mcp-ingress.history.md)
- [40-step-14-daemon-client-split.history.md](../../history/40-step-14-daemon-client-split.history.md)
- [41-codex-loaded-thread-binding-analysis.history.md](../../history/41-codex-loaded-thread-binding-analysis.history.md)
- [42-mvp-implementation-closeout.history.md](../../history/42-mvp-implementation-closeout.history.md)
