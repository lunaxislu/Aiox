# AIOX System Architecture

Status: Target

이 문서는 TUI 제품의 책임 배치, 실행 자원 소유권과 package 경계를 소유한다.
[[docs/aiox-tui-product]]가 전체 문서 진입점이며, 외부 실행 계약은
[[docs/specs/aiox-runtime]], 협업 계약은 [[docs/specs/aiox-collaboration]],
Host 선언 계약은 [[docs/specs/aiox-host]]가 소유한다. 현재 조립 범위 외의 구조는 목표이며 구현 완료 주장이 아니다.

## 실행 소유권과 협업 등록 [Status: Target]

실행 소유권은 [[docs/specs/aiox-runtime]]의 명령·인증된 실행 위치 계약을 따른다.
기존 RuntimeRegistry를 사용하되 다음 책임을 분리한다. 아래 구조는 승인된 목표이며 뒤의
Stage 2·Claude·Codex 실행의 현재 조립 근거와 Host 목표 범위를 구분한다.

```text
실행 소유자
├─ daemon → Web·Host vendor / PTY / 필수 부속 실행
└─ 외부 CLI → foreground / 상속 입출력 / adapter 임시 자원 / 필수 부속 실행
협업 등록 — daemon RuntimeRegistry
├─ Runtime 신원·credential·membership·등록 유효성
├─ vendor binding → 입력·인증 hook·준비·관측
└─ terminal 차용 관계 → daemon shell 연결만, 실행 소유권과 별개
```

실행 소유자가 프로세스 종료를, daemon이 협업 등록 해제를 담당한다. binding의 vendor
입력·관측 책임에 외부 프로세스 kill이나 CLI 임시 자원 삭제를 결합하지 않는다. 공유 vendor 계약과 실행 owner가 이 경계를 담당하고, vendor별 실행·입력·관측은 adapter에 둔다.
현재 RuntimeRegistry를 재사용하며 adapter가 실행 위치별 소유권을 다시 정의하지 않는다.

```text
외부 CLI: daemon 제어 WS 연결 → Registry·hook 맵·credential 준비 응답
        → vendor 직접 실행 → 시작 통보 → 협업 준비 확인 → 종료 통보·CLI 자원 정리
제어 WS 손실: daemon 등록 정리 / 시작한 CLI vendor는 준비 완료 전후 모두 유지
```

화면 바이트·resize는 제어 WS에 보내지 않는다. CLI 사망은 WS close로 관측하며 heartbeat·lease·
자동 재연결은 추가하지 않는다. 명시적 초기 협업 실패·최초 준비 timeout은 CLI에
`startup-failed`로 알리고 협업 등록을 정리한다. CLI는 원인을 표시하며 시작한 실행 owner를
유지한다. 현재 외부 경로와 구현 대기인 Web의 실행·협업 수명 분리는
[[docs/architecture/aiox-vendor-bindings]]의 해당 실행 구성을 따른다.
등록 해제는 route·요청 결과·credential 정리를 재사용하되 관측 손실을 vendor exit로 확정하지
않는다. DB 정리가 실패하면 `stop_incomplete`와 daemon·Web 재시도 경로를 유지한다.
실행 소유권의 이유는 [[docs/decisions/execution-ownership]], 명시적 종료 요청의 변경 이유는
[[docs/decisions/external-execution-survival]]을 따른다.

외부 binding의 정리는 협업 관측·등록 해제만 수행하고 실행 stop은 daemon 소유 record에만 호출한다.
외부 WS에는 daemon 종료용 terminate/ACK 교환을 두지 않는다. 연결이 닫히면 CLI는 진단하고
실행 owner를 유지하며 로컬 종료·자연 종료가 자원을 정리한다. [Status: As-built]
근거: [[apps/daemon/src/daemon.ts]], [[apps/daemon/src/agent-controller.ts]],
[[apps/cli/src/external.ts]], [[packages/protocol/src/index.ts]] 및 각 인접 테스트.

## IDE 작성 지원 [Status: As-built]

`packages/IDE/vscode`는 VS Code·Cursor를 대상으로 하는 독립 배포 확장이다.
Red Hat YAML에 번들 JSON Schema를 연결해 기본 작성 지원을 제공하고,
`src/document.ts`는 YAML AST의 source range로 Agent 참조·route 검사 결과를 만든다.
`src/extension.ts`가 문서 열기·수정·닫기에 맞춰 진단을 교체·해제하고 VS Code의
completion/definition/hover API로 결과를 전달한다. 정의와 참조의 이름·위치 정보는
현재 문서에서만 계산하며 daemon·vendor·DB를 호출하지 않는다. 별도 AIOX LSP 서버는 없다.

YAML 계약의 owner는 [Host spec](../specs/aiox-host.md)이고, 구조 검사는
`schemas/aiox.schema.json`, 관계 검사는 `src/document.ts`가 맡아 같은 오류의 중복 표시를 줄인다.
Ajv는 배포할 JSON Schema의 테스트에만 사용하며 확장 실행 bundle에는 포함하지 않는다.
증거와 설치·검증 방법은 [패키지 안내](../../packages/IDE/vscode/README.md),
인접 `document.test.ts`·`schema.test.ts`를 따른다. Cursor 실검증은 별도로 남아 있다.

## Host 입력 준비 [Status: As-built]

`packages/config/src/host.ts`는 파일 선택·YAML 파싱·전체 참조와 route 검증을 소유한다.
`prepareHostInput`은 config → YAML → CLI 오류·layout → 실행 환경 순서로 읽기 전용
snapshot을 만든다. 이름으로 선택한 조회·제어와 Host Network 명령은 YAML을 읽지 않는다.
Host 실행 준비는 선택 directory를 shell의 명시 cwd로 전달하여 기존 공통 shell 검증을
사용한다. 외부 입력 규칙은 [[docs/specs/aiox-host]]와 [[docs/specs/aiox-runtime]]이 소유한다.

CLI의 `host-input.ts`는 파일 선택 인자와 CLI 오류를 보존하여 공통 준비로 전달한다.
`bootstrap.ts`의 Host run은 준비 후 daemon 접수와 HTTP NDJSON 결과 대기로 연결한다. daemon의 resolve와
run도 공통 준비를 소비하며 조회·panel 배치·설정 HTTP와 저장 기반을 사용한다. 관리 Agent의
shell 실행과 개별 Agent·Host Network 제어, 전체 Host 제어·조회 CLI를 연결했다.
IDE는 편집 중 불완전한
문서의 AST 진단을 유지하고 실행 준비 모듈을 호출하지 않는다.

근거: [[packages/config/src/host.ts]], [[packages/config/src/host.test.ts]],
[[packages/config/src/schema.test.ts]], [[packages/protocol/src/configuration.ts]],
[[apps/daemon/src/state-api.ts]], [[apps/daemon/src/state-api.test.ts]], [[apps/cli/src/host-input.ts]],
[[apps/cli/src/host-input.test.ts]], [[apps/cli/src/bootstrap.ts]].

## Stage 2 현재 조립 범위 [Status: As-built]

CLI는 HTTP로 daemon lifecycle·persistent Network/Route·Agent 조회를 호출한다. daemon 한 Node 프로세스가 node:http listener에 연결한 Effect HttpRouter·NodeHttpServer의 daemon/Web HTTP app, ws attachment, 공식 MCP TypeScript SDK·Zod, Runtime/credential·messaging과 PTY registry를 조립한다. Web listener는 빌드된 최소 Web 정적 파일과 같은 origin의 API·WebSocket을 제공한다. DB는 daemon boot가 열며 typed Drizzle·Effect SQLite 연결에서 현재 schema를 직접 초기화한다. 초기화 구조는 [[docs/architecture/aiox-storage-terminal]]의 이력 보존과 ORM 전환을 따른다.

근거: [[apps/cli/src/bootstrap.ts]] `apps/cli/src/bootstrap.ts:222-636`, [[apps/daemon/src/bootstrap.ts]] `apps/daemon/src/bootstrap.ts:46-90`, [[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:151-356`; HTTP·포트·route 검증은 [[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:300-554`.

CLI와 daemon boot는 시작에 사용할 설정 snapshot을 공유한다. restart는 기존 daemon 종료 전에 가능한 준비를 끝내고 이 snapshot으로 새 프로세스를 시작하므로, 준비와 시작 사이 파일 편집이 이번 실행 설정을 바꾸지 않는다. 새 shell 생성은 별도로 현재 파일을 다시 읽는 설정 적용 경로를 유지한다. daemon status·doctor의 현재 실행 조회는 기록된 포트를 우선하며 다음 실행 config의 유효성 진단과 분리한다. [Status: As-built]
근거: [[apps/cli/src/bootstrap.ts]] `apps/cli/src/bootstrap.ts:244-358`, `apps/cli/src/bootstrap.ts:382-464`, [[apps/daemon/src/bootstrap.ts]] `apps/daemon/src/bootstrap.ts:46-90`; 준비 설정 소비와 새 shell 재조회는 [[apps/daemon/src/bootstrap.test.ts]] `apps/daemon/src/bootstrap.test.ts:43-73`.

listener 개방과 외부 요청 접수는 별도 경계다. 두 listener와 필수 상태 기록을 마친 뒤 한 준비 상태로 HTTP·WebSocket 접수를 함께 연다. 준비 중 실패하면 listener·attachment 서버와 retention을 정리하고 boot가 DB를 닫는다. [Status: As-built]
근거: [[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:153-167`, `apps/daemon/src/daemon.ts:330-344`, `apps/daemon/src/daemon.ts:719-728`, [[apps/daemon/src/bootstrap.ts]] `apps/daemon/src/bootstrap.ts:59-87`; [[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:55-177`.

종료 시 boot의 상태 파일 삭제를 먼저 기다린 뒤 listener를 해제하고 DB를 닫는다. 이전 daemon의 지연된 DB close 뒤 상태 파일을 삭제하지 않으므로 새 실행의 상태 기록을 지우지 않는다. 상태 삭제 실패는 stale 기록 가능성을, listener 해제 뒤 DB close 실패는 해당 자원 종료 실패를 stderr에 진단한다. 두 오류가 이미 닫는 listener를 다시 열거나 `closed`를 미완료로 바꾸지는 않는다. 메시지 저장·실행 정리 실패의 재시도 경계와 구분한다. [Status: As-built]
근거: [[apps/daemon/src/bootstrap.ts]] `apps/daemon/src/bootstrap.ts:83`, [[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:588-603`; DB close 실패와 지연 중 새 상태 기록 보존 회귀는 [[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:179-234`.

Runtime 공통 정리는 credential·협업 유효성을 먼저 회수하고 daemon 소유 execution owner·PTY만 종료한다. binding cleanup과 standalone endpoint의 route·요청·등록 정리는 실행 소유권과 별도로 수행한다. 실패한 정리는 재시도 경로를 남기고 PTY exit만으로 daemon을 종료하지 않는다. 원 발신자 종료 후 수신 요청 결과 보존은 collaboration 계약을 따른다.

일반 shell은 TerminalService에만 등록하고 RuntimeRegistry와 분리한다. `/api/terminals` 생성·목록과
개별 조회·명시 종료는 공통 HTTP 보호를 거쳐 같은 서비스로 연결되며 기존 WS 입출력 경로를 쓴다.
Runtime은 직접 소유 PTY와 차용 shell을 구분한다. 차용 Agent의 종료는 binding·Runtime 관계만
정리하고, terminal 자체 종료는 연결 Runtime 정리로 이어진다. daemon force stop은 남은 일반
shell도 종료·확인한다. 실패한 binding에 연결된 shell은 재시도할 수 있게 유지한다.

근거: [[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:362-472`,
[[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:556-600`, `apps/daemon/src/daemon.test.ts:761-976`.

근거: [[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:362-386`, [[apps/daemon/src/networks.ts]] `apps/daemon/src/networks.ts:91-108`; 실패·재시도와 저장소에서 Network를 직접 삭제한 경우의 정리 검증은 [[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:1218-1268`, 실제 PTY exit는 [[apps/daemon/src/terminals.test.ts]] `apps/daemon/src/terminals.test.ts:694-760`.

NetworkService는 준비·정리 중인 등록까지 검사해 삭제를 거절한다. daemon 등록은 동기 membership
예약 뒤 Network 존재를 조회하고 binding을 만든다. 단일 DB 작업 queue에서 삭제가 앞서면
뒤 등록 검증이 실패하고, 예약이 앞서면 삭제가 거절된다. 별도 Network lock은 두지 않는다.
삭제의 외부 계약은 [[docs/specs/aiox-host]]가 소유한다.
근거: [[apps/daemon/src/networks.ts]] `apps/daemon/src/networks.ts:69-79`,
[[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:654-672`,
[[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:416-541`.

현재 application 책임은 daemon 내부 모듈에 있으며 별도 application/controller package를 모두 만든 상태가 아니다. Claude와 Codex 실행 연결은 아래 조립 범위로 확장했고 vendor별 관측·메시지 통합과 Host 실행은 후속 검증·구현 대상이다. 최소 Web·화면 복귀의 현재 한계는 [[docs/architecture/aiox-storage-terminal]]을 따른다. CLI와 Web 산출물 탐색은 workspace 배치 기준이며 npm 배포 검증을 대신하지 않는다.

Web 화면 중계가 끊겨도 daemon의 실행 owner·관리 등록은 유지하고, 기존 terminal의 다시
연결이 같은 실행의 화면·키보드를 복원한다. 명시적 vendor 정리는 owner 전체 종료 후 등록
정리까지 확인한다. transport·협업 권한·실행 수명 분리와 구현 근거는
[[docs/architecture/aiox-vendor-bindings]]가 소유한다. [Status: As-built]

## Effect 앱 전송과 생명주기 [Status: As-built]

```text
node:http listeners
├─ Effect HttpRouter / NodeHttpServer
│  ├─ /api/rpc → ApplicationRpc → shared command admissions
│  ├─ CLI HTTP/NDJSON → same command admissions
│  └─ MCP SDK / static files
└─ terminal WS → bytes / resize / restore

panel command → session sequencer → latest panel transaction → commit
  → targeted AppState projection → same versioned delta to response/subscribers
  → shell preparation / deletion cleanup in daemon task scope
```

앱 계약은 [[docs/specs/aiox-application-rpc]]가 소유한다. XState daemon actor가
starting/running/stopping/cleanupFailed/stopped/closed 전이와 접수 guard를 소유한다.
Effect Fiber가 실제 시작·정리·종료를 실행하며 완료는 Deferred로 연결한다. 종료는 sequence
접수를 먼저 멈추고 이미 접수한 작업을 drain한 뒤 소유 자원을 정리한다. 정리 실패 시 retry에
필요한 record/handle을 유지하고 접수 상태를 복구한다. scope close를 프로세스 종료 확인으로
대체하지 않는다. RuntimeRegistry 등록도 native Effect acquisition/cleanup을 사용하며 늦게
획득한 binding을 추적하기 전에 호출 취소로 잃지 않는다.

AppState는 상시 메모리 projection이다. snapshot 캡처와 구독 등록을 같은 semaphore에서 수행한다.
producer의 자원 ID로 관련 저장/실행 상태만 갱신하며 DB commit 뒤 projection 실패 시 구독을
실패시키고 재구축한다. 정상 변경마다 전체 DB/snapshot을 비교하지 않는다. Effect RPC의 stream
ACK와 구독 queue 상한은 느린 소비자가 다른 구독을 막지 않도록 한다. 구현·회귀 근거는
[[apps/daemon/src/daemon.ts]], [[apps/daemon/src/runtimes.ts]], [[apps/daemon/src/tasks.ts]],
[[apps/daemon/src/application-rpc.test.ts]], [[apps/daemon/src/sequencer.test.ts]],
[[apps/daemon/src/app-state.test.ts]]다.

## 서비스 진단 로그 [Status: As-built]

`@aiox/diagnostics`는 Pino 인스턴스와 필드·오류 직렬화 정책을 공유한다. daemon 시작·종료·HTTP 접수/실패·Host 명령 접수/완료·Agent 준비/실패/정리·메시지 저장 실패/복구와 Claude binding·Codex App Server·terminal의 서버 진단이 직접 사용한다. 별도 Logger interface나 worker는 두지 않는다. HTTP `requestId`는 응답 `x-request-id`와 같은 서버 생성 ID이고, Host 명령 입력의 멱등 키는 로그에서 `hostCommandRequestId`로 구분한다. 접수 로그가 두 ID와 명령·`hostId`를 연결하고 완료 로그도 같은 ID와 결과 state를 기록한다. 실행 진단은 Runtime의 `runtimeId`와 조회용 `terminalId`를 사용한다. 공통 실패 경로는 PTY 보존 분기보다 먼저 `failureCode`를 기록해 준비 실패·timeout·잘못된 lifecycle·조기 종료를 구분한다.

진단은 동기 stderr JSONL이다. CLI start가 소유한 append fd가 daemon stdout/stderr를 `~/.aiox/daemon.log`에 연결하며, 시작 실패 안내는 기존처럼 마지막 20줄을 읽는다. 직접 daemon을 실행하면 stderr로 나온다. 각 기록이 동기로 쓰이고 정상 종료는 listener·DB 종료 처리 후 마지막 기록과 flush를 마친 뒤 `closed`를 완료한다. 시작 실패도 stderr에 기록하고 exit code 1을 반환한다. 강제 종료 이전에 호출되지 않은 진단이나 OS 저장장치 내구성까지 보장하는 계약은 아니다.

로그 입력은 고정 설명과 허용된 식별자·상태 필드로 제한한다. Error는 유형과 제한된 OS/SQLite 코드만 직렬화하고, 임의 message·stack·cause·추가 속성은 제외한다. token·credential·환경·요청 본문/URL·경로·vendor/PTY 본문을 기록하지 않는다. 사용자용 HTTP·Host 명령 결과/RPC 오류와 CLI JSON·MCP 응답·foreground/PTY 출력은 기존 경로를 유지하며, 진단 로그가 사용자 결과 전달을 대신하지 않는다.

daemon 시작 실패는 `stage`를 기록하며 잘못된 포트는 `EINVALIDPORT`와 검증된 `field`(`--port`·`--web-port`)를 보존하고 입력값은 제외한다. Codex App Server 종료 진단은 고정 메시지와 component·exitCode·signal만 기록한다. token을 가린 vendor 오류는 기존 호출자/Relay 사용자 오류 경로로 전달하고 서버 로그에 복사하지 않는다.

근거: [[packages/diagnostics/src/index.ts]], [[packages/diagnostics/src/index.test.ts]], [[apps/daemon/src/main.test.ts]], [[apps/daemon/src/agent-controller.test.ts]], [[packages/adapters/codex/src/index.test.ts]], [[apps/daemon/src/daemon.ts]], [[apps/daemon/src/http.ts]], [[apps/daemon/src/host-control.test.ts]], [[apps/cli/src/bootstrap.test.ts]]. 실제 vendor·React·지원 OS별 연결 검증을 이 로그 전환의 검증으로 대체하지 않는다.

## 공통 실행과 vendor adapter 현재 조립 범위 [Status: As-built]

CLI는 terminal 문맥이 있으면 Web foreground WS로, 없으면 별도 external 제어 WS로 연결한다.
Web은 daemon execution owner의 vendor PTY를 중계하고 빌린 shell의 공개 terminal ID를 유지한다.
외부는 CLI execution owner가 입출력을 상속하고 daemon에는 시작·종료만 통보한다.
양쪽은 `@aiox/vendor` 계약과 Claude·Codex adapter를 사용하며 AgentController는 vendor별
inbox·인자·버전을 해석하지 않는다. adapter는 부속 실행 준비 후 foreground를 시작할 수 있고
owner는 전체 실행 자원을 정리한다. Codex는 Runtime별 App Server·owner 내부 Relay·remote TUI를 연결한다. vendor별 준비·검증 범위는 [[docs/architecture/aiox-vendor-bindings]]가 소유하고 Host 실행은 미구현이다.
근거: [[packages/vendor/src/index.ts]] `packages/vendor/src/index.ts:49-99`,
[[packages/vendor/src/execution.ts]] `packages/vendor/src/execution.ts:7`,
[[packages/adapters/claude/src/index.ts]] `packages/adapters/claude/src/index.ts:21`.
RuntimeRegistry의 `executionOwnership`과 `collaborationActive`는 프로세스 종료 책임과
협업 유효성을 분리하며 `terminalOwnership`은 daemon terminal 소유·차용만 표현한다.
daemon의 명시적 종료 요청은 daemon 소유 execution owner만 종료한다. 외부 owner는 CLI에
남으며 daemon 연결 손실·등록 정리가 그 실행을 종료하지 않는다. 외부 실행의 종료·필수 자원
정리는 CLI 로컬 종료와 자연 vendor exit가 소유한다. daemon의 협업 해제는 binding cleanup·DB
정리를 수행한다. 실패한 record는 재시도용으로 남지만 인증·발견·전송 대상에서는 제외한다.

근거: 실행 분기는 [[apps/cli/src/bootstrap.ts]] `apps/cli/src/bootstrap.ts:491`,
직접 실행은 [[apps/cli/src/external.ts]] `apps/cli/src/external.ts:15`,
제어 연결은 [[apps/daemon/src/agent-controller.ts]] `apps/daemon/src/agent-controller.ts:81`,
등록 유효성은 [[apps/daemon/src/runtimes.ts]] `apps/daemon/src/runtimes.ts:158-213`,
정리 경계는 [[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:362-386`.

이전 Stage3의 외부 shell 실측도 daemon vendor PTY 경로였다. 그 기록을 새 직접 실행이나
외부 vendor 독립 수명 검증으로 승계하지 않는다.

Runtime은 시작 중에도 credential 인증에 필요한 등록을 가지지만, adapter가 요구하는 연결 준비를 확인해야 전송 준비가 된다. Claude는 실행 시작·인증 hook·inbox 연결과 Network가 있는 경우 공통 MCP 초기화를 확인한다. hook 관측은 binding에서 기존 입력 결과·자동 알림 서비스로 이어진다. 세부 구성, 미확인 입력 결과와 OS별 검증 경계는 [[docs/architecture/aiox-vendor-bindings]]가 소유한다. 이 구현 존재는 사용자 참여 실제 모델 E2E 완료를 뜻하지 않는다.

## 책임과 프로세스

```text
외부 CLI → vendor + 필수 부속 실행 (상속 입출력)
   │ 협업 제어 WS
CLI / 운영 Web / 향후 VS Code
                  │ 실행 명령·조회·terminal attachment
                  ▼
AIOX daemon — Node.js 실행 구성
├─ HTTP / Gateway — 명령·snapshot·event·알림 중계
├─ 공통 HTTP MCP — send / agents_list
├─ Application services
│  ├─ AgentController — daemon 소유 실행·종료 / 외부 협업 등록
│  ├─ HostController — workspace·Network·Agent 실행 묶음
│  ├─ Network / Messaging — 소속·route·전달·응답 연결
│  └─ Credential registry — token → 현재 Runtime
├─ 공유 vendor adapters — 실행 준비·주입 / binding 입력·관측
│  ├─ Claude adapter + native inbox + hooks
│  └─ Codex adapter + App Server + Binding Relay (실행 연결 구현)
├─ PTY Manager / Terminal Service — 실행 handle·화면·attachment
├─ Configuration Service — 읽기·검증·저장·변경 배포
└─ Persistence — SQLite 연결·repositories
```

Controller는 실행 판단·등록을, binding은 vendor별 수단을, 실행 소유자는 child 수명을, PTY는
daemon 소유 터미널 handle을 담당한다.
daemon은 materialized Runtime·Network·route 권위다. Gateway나 MCP handler가 독자적인
실행 상태를 만들지 않고 application을 호출한다. Vendor TUI는 모델 선택·slash command·승인·질문을
담당하고, 운영 Web은 AIOX Host 관리·배치·알림·설정을 담당한다.

위 논리 책임은 별도 OS 프로세스를 요구하지 않는다. HTTP/Gateway/MCP, Controller, PTY를
daemon 한 프로세스에 구성한다. 현재 구현 범위는 위 조립 근거를 따른다.
외부 실행은 기존 CLI가 직접 소유하므로 실행 생존만을 위한 별도 runtime-host는 만들지 않는다.
Web foreground와 외부 제어 연결은 서로 다른 수명 경계다.

daemon용과 공용 운영 Web용 포트는 각각 설정할 수 있다. 같은 Node 프로세스의 두 listener로
구현할 수 있으며 Host마다 별도 Web server가 필요한 것은 아니다. 개발 Vite 포트와 배포 포트는
다르다. 기본 포트와 설정 해석 우선순위는 Stage 1 config에 구현됐으며
[[docs/specs/aiox-configuration-web]]의 포트 계약을 따른다. 실제 CLI 옵션·listener 연결과
포트 충돌 처리는 현재 조립 범위의 코드·테스트를 따른다.

현재 서버 조립에는 node:http, Effect HttpRouter·NodeHttpServer·RPC, ws, 공식 MCP TypeScript SDK와 등록 경계의 Zod, node-pty, typed Drizzle과 Effect SQLite가 설치돼 있다. 필요한 package의 manifest와 pnpm lockfile이 버전을 소유한다. 현재 workspace Node 요구 조건은 `^22.16.0 || >=24.11.0`이다. 근거: [[package.json]] `package.json:29-38`. DB 초기화·플랫폼 검증 경계는 [[docs/architecture/aiox-storage-terminal]]을 따른다.

편집기는 각 package의 `tsconfig.json`으로 source와 같은 디렉터리의 tests를 함께 해석한다.
domain의 별도 `tsconfig.production.json` 검사는 tests를 제외하고 자동 Node ambient type을
차단하는 기존 production 경계를 유지한다. 루트 도구 설정도 루트 tsconfig와 `pnpm typecheck`에
포함한다. 루트의 `skipLibCheck`는 설치된 의존성의 선언 검사를 생략하여 tsup의 누락된 배포 선언·
optional SWC 선언 문제를 우회하며 프로젝트 source의 타입·모듈 해석 검사는 유지한다. [Status: As-built]
근거: [[packages/domain/tsconfig.json]] `packages/domain/tsconfig.json:1-14`,
[[packages/domain/tsconfig.production.json]] `packages/domain/tsconfig.production.json:1-7`,
[[tsconfig.json]] `tsconfig.json:1-10`, [[package.json]] `package.json:9-19`.

두 HTTP listener의 모든 `/api/*` 조회·제어, `/mcp/*`와 WebSocket upgrade는 공통 연결 검증을
먼저 거친다. 실제 listener 주소·포트에 맞는 Host, 운영 Web의 Origin과 요청 본문을 검증하고
잘못된 연결만 거절한다. 이 입구 보호 뒤에도 MCP의 credential·membership·route 검사는 유지한다.
CLI 연결과 Web 자동 복귀를 지원하며 사용자 로그인·토큰 입력·허용 목록 수동 설정을 추가하지 않는다.

Effect HttpRouter와 NodeHttpServer가 두 listener의 공통 API route·요청/응답·오류 변환을 소유한다. Host·Panel·Web 명령의
route 등록은 `state-api.ts`, 일반 Network·Agent·terminal·config·notification·RPC 등록은
`http.ts`가 맡고 기존 service·protocol·config·저장 로직을 호출한다. Host 입력 오류는
ConfigError보다 먼저 분류하여 config→YAML→CLI 검증 순서와 오류 stage를 보존한다. 공통
본문 reader는 Content-Length 유무와 관계없이 실제 읽은 byte 수를 제한한다. 요청마다 생성한
HTTP requestId는 공유 HttpContext를 통해 Host 명령 접수·완료 진단까지 전달한다. [Status: As-built]

daemon 전용 agent hook과 MCP도 Effect HTTP route에 연결한다. MCP는 기존 SDK의 Web 표준
transport가 protocol 처리를 맡으며, 요청별 credential·Network 재검증과 무세션 모드를 유지한다.
SDK 정리는 Node response 종료에 연결한다. Web 정적 제공은 Effect HTTP 응답 stream으로 같은 Web
listener에 연결하고 기존 SPA fallback·파일 부재 처리를 유지한다. WebSocket upgrade와
terminal PTY attachment는 기존 node:http·ws 경계에 남고 HTTP route로 재구현하지 않는다.
Node adapter의 stream은 write(false) 뒤 drain까지 전송을 보류하며, 닫힌 response에 남은 drain
listener는 공통 listener 종료 처리에서 제거한다. [Status: As-built]

근거: [[apps/daemon/src/daemon.ts]], [[apps/daemon/src/http.ts]], [[apps/daemon/src/state-api.ts]],
[[apps/daemon/src/mcp.ts]], [[apps/daemon/src/static.ts]], [[apps/daemon/src/http.test.ts]],
[[apps/daemon/src/static.test.ts]], [[apps/daemon/src/daemon.test.ts]], [[apps/daemon/src/mcp.test.ts]].

## 서로 다른 수명

| 대상 | 소유하는 것 | 다른 대상으로 오인하면 안 되는 것 |
| --- | --- | --- |
| Agent definition | 이름·adapter·role·description·instruction | 실행 중인 프로세스 |
| AgentRuntime | 한 실행의 협업 등록·관측과 실행 소유권 | PID 하나 또는 vendor session ID |
| HostRuntime | 한 manifest의 workspace·Agent·전용 Network 실체화 | 실행 머신 또는 파일 sandbox |
| Vendor conversation | Claude session / Codex active thread 연결 | Runtime 전체 수명 |
| Terminal / PTY | 살아 있는 터미널 실행 자원 | 브라우저 탭 |
| Web attachment | 화면·입력 연결 | 실행·종료 권위 |

같은 Claude 프로세스의 `/clear`·`/resume`은 Runtime/PTY를 유지하면서 대화 연결을 바꿀 수 있다.
새 프로세스 실행은 새 Runtime·credential 수명이다. 브라우저를 닫으면 attachment만 끊고,
살아 있는 daemon에 재방문하면 같은 터미널의 현재 화면에 연결한다.
vendor adapter가 관측한 공통 status와 이유를 RuntimeRegistry가 보관하고 HTTP/Web·MCP가 동일하게 소비한다. 모델이 직접 상태를 선언하지 않으며 개별 delivery 결과는 별도로 처리한다. 목록의 route 필터와 전송 준비 검사를 분리한다. 외부 의미는 [[docs/specs/aiox-runtime]], 구현·검증 근거는 [[docs/architecture/aiox-vendor-bindings]]를 따른다.

## 실행과 정리

아래 launch 흐름은 daemon 소유 실행이다. 외부 준비·실행 순서는 위 실행 소유권 절을 따른다.

```text
명령·manifest 전체 검증
 → 작업 디렉터리와 선택한 YAML 준비(Host Worktree 생성 제외)
 → Runtime 신원·단일 Network 선택·credential 준비
 → binding / PTY / vendor 실행
 → 실제 연결 준비 확인
 → membership·route 실체화와 등록 완료
 → Gateway snapshot/event 노출
```

MCP 초기화 전에 필요한 Network endpoint는 launch 구성에서 준비한다. process spawn이나 socket
파일 존재를 ready로 간주하지 않는다. 등록 도중 실패하면 이번 시도에서 만든 실행 자원·binding·token·
membership만 정리하고, cleanup 실패도 보고한다. 다른 Host나 사용자 작업 파일은 보상 대상이 아니다.
설치·Peer 지원·시작 실패는 실행 경계에서 처리하며 업데이트 안내가 실제 준비를 막는 경우를
해당 실행 등록 실패로 처리하는 방향이다. 정확한 vendor update 감지 수단은 미결이다.

```text
host stop
 → HostController가 YAML Agent 실행의 종료 요청
 → 실제 프로세스 종료·필수 부속 실행 정리 확인
 → credential/binding/활성 membership 정리
 → shell·panel·Host Network·적용 정책 보존, stopped 표시 이벤트

host delete
 → 해당 panel의 모든 소유 실행·shell 종료 요청
 → 실제 종료와 정리 확인
 → Host Network·등록·panel 삭제 이벤트
 → YAML·프로젝트 파일 보존

daemon stop --force
 → 신규 실행·등록·메시지 전달 차단 / 진행 중 등록 commit 동기화
 → daemon 소유 Host·standalone·PTY·Relay·App Server 등 강제 종료
 → 외부 실행은 vendor 수명을 유지하고 협업 등록·관측만 해제
 → 실제 종료 확인·credential/실행 관계 정리
 → 모두 정리되면 DB 등 daemon 자원 정리 → daemon 종료
 → 미완료면 남은 관리 handle·listener·DB 유지 → 종료 재시도
```

종료는 관리 handle과 자원 소유권을 기준으로 하며 무관한 vendor나 터미널 앱 전체를 이름으로
찾아 죽이지 않는다. 외부 CLI 실행 owner에는 daemon 종료를 vendor 종료 명령으로 전달하지 않는다.
일반 작업 자식 전체의 상태 추적은 추가하지 않는다. 재시도·실제 종료 확인은 runtime 계약을 따른다.
Persistent Network 정의·Worktree·저장 파일을 삭제하지 않는다.

일반 stop은 POSIX에서 daemon 소유 활성 등록과 최초 shell의 busy/unknown을 확인한다.
외부 등록은 실행 종료 blocker가 아니며 협업 정리의 실패·재시도만 daemon 종료 완료에 반영한다.
restart는 이 일반 stop을 재사용하며 restart --force는 없다. SIGINT/SIGTERM 등
daemon 신호 종료도 명시적 일반 stop·force와 마찬가지로 외부 실행을 보존한다.

## Host와 Network의 실체화 [Status: Target]

HostController는 선택한 YAML의 적용 구성, Host 식별자, 작업 디렉터리, 전용 Network와 Agent
실행들을 연결한다. YAML의 선언과 DB의 적용 구성·실행 이력을 구분하며 파일 편집만으로 현재
실행 상태를 바꾸지 않는다. 파일 선택·중복 run·이름 변경·route 적용 범위의 외부 계약은 host spec이 소유한다.
Worktree 자동 생성은 이번 범위에 없다. 같은 경로의 파일을 공유하므로 namespace는 sandbox가 아니다.

아래는 YAML을 적용하는 run/start/restart 흐름이다. Network 관리 명령은 등록된 `<host>`를
필수로 선택하며 YAML 재읽기·shell 준비 경로를 실행하지 않는다.

```text
CLI: --path / --file, Agent 이름, 실제 명령 입력 terminal 식별
 → config 검증 → YAML 탐색·읽기·전체 검증 → CLI 검증·병합·실행 환경 검증
 → HostController: 대상과 적용 범위 결정
 → 개별 start/restart: Network 이름/default 변경이면 부수효과 전에 거절
 → 최초 실행·새 탭 필요: shell/terminal 생성
   또는 stopped/재시작 탭: 살아 있는 기존 shell 재사용
   또는 같은 Host shell의 개별 실행: 명령 입력 shell 사용
 → 선택한 shell 안에서 Agent CLI 실행, 새 Runtime·credential·binding 연결
 → vendor 실제 준비 확인·membership/route 적용
 → Gateway 상태 이벤트 → Web panel/pane/tab 갱신 + terminal stream 연결
```

프로세스·실행 수명 관측은 daemon이 소유하며, Web은 Gateway로 전달된 상태를 표시한다.
서버가 종료를 관측했다는 사실만으로 화면 갱신 완료를 가정하지 않는다. 화면 재조회·재연결에서도
관리 Agent와 terminal 연결, 적용 구성, 종료 사유를 복원하여 stopped/실패/일반 shell을 구분한다.

Agent 실행과 기반 shell의 수명은 분리한다. 명시 stop은 Agent와 필수 부속 실행만 종료하고 shell은
유지한다. 정상 /exit은 같은 shell 표시로 복귀하며, 명시 stop은 그 shell 대신 안내를 표시한다.
Copy는 기존 shell을 다시 표시하고 명령을 복사하는 Web 동작이다. 새 shell 생성·자동 실행 요청이 아니다.
종료 원인과 실행 존재 여부는 activity status와 구분하며 화면 disconnect나 idle을 종료로 추정하지 않는다.
임의 shell의 OS별 idle 탐색을 Host 실행 위치 선정의 선행 조건으로 만들지 않는다.

같은 Host panel에서 명시 실행한 첫 Agent는 입력 terminal을 사용하고 복수 실행의 나머지는
순차 배치한다. cwd 일치만으로 같은 panel이라고 판단하지 않는다. 다른 panel·외부 터미널 입력은
대상 Host 안에 연결하며, 일반 shell로 돌아온 과거 Agent 탭은 자동 예약 자리로 취급하지 않는다.

전체 restart는 사전 검증 후 같은 key의 Agent 탭을 재사용하고 제거된 key의 실행 shell/stopped
shell을 정리한다. 일반 shell로 돌아온 탭과 사용자 shell은 보존한다. Host 이름 변경은 별도 Host와
Network를 만들며 기존 Host를 유지한다. 새 시도의 실패 보상은 기존 Network·사용자 자원을 침범하지 않는다.

Persistent Network는 DB, Host Network의 선언은 YAML이 소유한다. Host stop은 Network·적용 정책을
남기고 활성 관계만 정리한다. 다음 start의 새 Runtime ID에 적용 범위의 route를 연결한다.
CLI 변경과 YAML 재적용의 마지막 변경이 해당 범위에서 유효하며 전체 restart만 전체 구성을 적용한다.
DB의 적용 구성은 일반 Persistent Network 정의의 중복 등록도, 죽은 Runtime의 자동 복원 근거도 아니다.

현재 vendor PTY 직접 생성 경로를 이 shell 기반 Host 목표 구조의 구현 완료 증거로 사용하지 않는다.
현재 조립 범위는 앞의 As-built 절, terminal 저장·attachment 책임은
[[docs/architecture/aiox-storage-terminal]]을 따른다.

## 목표 workspace와 의존

```text
apps/
├─ cli/src/commands/                 # daemon/agent/network/host/adapter
├─ daemon/src/                      # bootstrap/http/gateway/mcp/composition
├─ web/src/features/                # hosts/agents/networks/terminal/notifications/settings
└─ site/                            # 마지막 단계 공개 사이트
packages/
├─ domain/src/{agent,host,network,messaging,terminal}/
├─ application/src/                 # 유스케이스·ports
├─ vendor/                          # 현재 공유 adapter 계약·execution owner
├─ adapters/{claude,codex}/         # 현재 vendor 실행 adapter
├─ terminal/                        # Node PTY 구현
├─ persistence/src/{sqlite,repositories}/
├─ protocol/                        # wire·framing
├─ config/
└─ ui/                              # 실제 공유 소비자가 생길 때만 추출
```

```text
domain/src/
├─ agent/{agent.ts,runtime.ts,runtime-status.ts}
├─ host/{host.ts,host-runtime.ts}
├─ network/{network.ts,membership.ts,route.ts}
├─ messaging/{message.ts,delivery.ts}
├─ terminal/terminal-id.ts
└─ index.ts
```

두 번째 tree는 파일 배치 후보이며 파일마다 class/DB entity를 만들라는 요구가 아니다.
AgentRuntime을 agent/runtime과 별도 runtime package 양쪽에서 소유하지 않는다.

domain은 제품 언어·단일 membership·routing·메시지·Runtime 규칙을 먼저 정의한다. 모든 모델을
미리 완성하는 절차가 아니라 실제 시나리오의 규칙부터 구현한다. Node/PTY/SQLite/React/vendor SDK에
의존하지 않는다. application은 인증된 신원을 받아 domain 규칙을 적용하고 실행·전달·정리 port를
조율한다. 공유 vendor 계약을 application port에 복제하거나 daemon 내부 타입으로 역참조하지 않는다.
현재 `@aiox/vendor`와 Claude adapter는 CLI·daemon이 공개 package entry로 소비한다.

daemon은 application과 구체 구현을 조립한다. CLI/Web은 protocol을 통해 통신하며 DB를 직접
수정하지 않는다. packages가 apps를 역참조하지 않는다. 브라우저 xterm renderer는 Web에 두어
Node PTY 코드를 번들에 끌어오지 않는다. 사이트는 제품 이후 소개·설치·사용법·설계 근거를 위한
별도 앱이며 로컬 daemon 접근 권한을 주지 않는다. package 이름은 목표이지 물리적 이전 완료가 아니다.

Sources:

- `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §3, §7, §14–§15, §18, §23–§25.
- `logs/2026-09-07-AIOX-TUI-Stage2-Daemon-MCP-Terminal.md` W2 — 공통 연결 보호·종료 미완료 재시도·직접 관리 자원 범위.

## Host 명령에서 React까지의 실행 경로 [Status: Target]

외부 요청/응답은 [[docs/specs/aiox-host]], Host 명령 결과·검증은 [[docs/specs/aiox-runtime]],
배치·config·mock 소비는 [[docs/specs/aiox-configuration-web]], 저장 모델은
[[docs/architecture/aiox-storage-terminal]]이 소유한다. 다음은 구현 분리를 위한 연결도다.

```text
CLI (argv/source/인증된 terminal 문맥)      React (조회·배치·명시 제어)
                 \                         /
                   공통 daemon HTTP handler
                     → prepare (config → YAML → CLI → 환경/대상)
                     → Host application 명령 경로
                        ├─ persistence transaction → 적용 구성/배치
                        └─ shell + 실행 owner + adapter → process/binding 실제 관측
                                  ↓
                         registry/projection + 결과 저장
                                  ↓
                     HTTP 요청 응답 / RPC state(변경 DTO 직접 전달)
                                  ↓
                       React 관리 카드·pane/tab·오류
                     terminalId → 기존 WS snapshot/stream → xterm
```

Host application 책임은 daemon의 공통 service 경계에 둔다. CLI용/Web용 lifecycle을 복제하거나
이 작업만을 위해 새 서버 framework·event bus·별도 application package 이전을 요구하지 않는다.
Host 내부 실행도 기존 execution owner/adapter/terminal 인증을 소비한다. vendor별 hook·args
해석을 Host에 복사하지 않는다. AIOX가 생성한 shell의 실행 준비 연결을 사용하고 사용자 일반
shell을 idle 추측으로 차지하거나 임의 shell 문자열을 입력하는 방식으로 시작하지 않는다.
Host 명령의 CLI 종료가 daemon 소유 Agent 종료로 이어지지 않게 foreground 제어와 분리한다.

### 시나리오별 완료·실패 경로

```text
최초 run → 전체 사전 검증 → Host/Network/panel·관리 정의 기록 → shell별 실행
         → preparing → 실제 ready/실패 기록 → RPC state → React TUI/원인
         └─ 파일 실패: CLI만 오류; 특정 Agent 확인 뒤 실패: 해당 tab 진단

개별 start/restart → 최신 전체 검증·Network 변경 거절 → 대상 범위만 적용
         → 입력 shell/재사용 stopped 자리/현재 pane 순서 → 새 Runtime 준비
         → ready: 옛 stopped 자리만 종료·정리 / 실패: 옛 안내+새 실패 자리 보존
개별 stop → 적용 관리 대상 → Agent owner 종료 관측·협업 정리
         → runtime 없음·shell 유지 → stopped 안내

전체 restart → 검증 실패: 현재 실행·정책·화면 유지
         → 동일 이름: 대상 증감·종료/새 실행·전체 정책 적용, 현재 배치 보존
         → 다른 이름: 새 Host/panel/Network, 기존 Host 보존
전체 stop → 관리 Agent 종료·정리 → shell/panel/Network/정책 유지 → 안내
전체 delete → panel 소유 Agent+사용자 shell 종료 확인 → Host/panel/Network 삭제
         └─ 실패: 대상별 결과 진단+남은 관리 자원 유지 → 명시 재시도

/exit → 실제 Agent exit → binding/credential/membership 정리 → 같은 shell 표시
Copy → clipboard 성공 → dismiss 저장 → RPC state → 기존 shell (자동 실행 없음)
이동/분할 → session 순번 → 최신 panel에 대상 검증·적용 → 바뀐 행 저장 → 200 + RPC state
         → 같은 terminal 재배치·resize (shell 준비·종료를 기다리지 않음)
닫기 → 실행 중이면 확인 → tab 제거 commit → 200 → terminal 종료는 정리 registry가 이어서 확인

시작 실패 → 프로세스 없음/종료 확인: 실패 안내 + 관리 Agent stopped
         → vendor 생존/협업만 실패: TUI + 진단 유지, stopped 아님
최초·재접속 → RPC 전체 snapshot → 이후 state(변경 DTO)
         → 같은 live terminal snapshot→tail→live → React 복원
```

prepare 오류는 부수효과 전 실패, 실행 후 실패는 부분 적용 결과다. 독립 대상의 성공을 실패로
되돌리거나 실패한 대상까지 전체 성공으로 묶지 않는다. shell 생성만으로 Agent 준비 성공,
서버 ready만으로 React 실제 연결 완료를 보고하지 않는다.

### 현재 구현과 남은 연결 [Status: Current gap]

공개 HTTP/RPC 스키마와 config의 순수 검증은 protocol이 소유한다. config 파일·YAML 로딩은
config에 남으며 기존 공개 parser를 통해 같은 검증 함수를 사용한다. Host·panel 저장, 조회·배치와
workspace shell 제어, 설정 revision 저장, snapshot/delta/sequence-failure RPC는 daemon에 연결했다. Host `run`은
입력 준비 뒤 daemon의 Host 명령 API로 연결하며 그 HTTP 응답의 대상별 실제 결과를 기다린다.
개별 Agent·Host Network와 전체 Host 제어·조회 CLI를 연결했다. 관리 Agent의 내부 연결과 관측은 아래 구현을 소비한다.
React의 조회·panel 명령·알림 화면은 연결했고, 실제 TUI 표시 검증은 후속 범위다.

근거: [[packages/protocol/src/index.ts]], [[packages/protocol/src/host.test.ts]],
[[packages/config/src/schema.ts]], [[apps/daemon/src/state-api.ts]],
[[apps/daemon/src/web-commands.ts]], [[apps/daemon/src/state-api.test.ts]],
[[apps/daemon/src/web-commands.test.ts]], [[apps/cli/src/bootstrap.ts]].

기존 최소 Web의 change 알림 뒤 GET 방식은 새 서버 RPC의 소비 방식이 아니다. React 앱의 snapshot/delta 저장소와 제품 화면 조회·명령·알림은 연결됐으며 Host TUI의 terminal attach도 운영 WorkspaceContent에 연결됐다. terminal byte stream은 기존 WS 경로를 유지한다.

`ApplicationConnection`은 공유 RPC 수명·세션 복구·panel 명령 식별자를 소유하며 전체 상태를 보관하지 않는다. `ApplicationStore`가 TanStack DB의 단일 collection에 서버 자원을 `resource:id` 행으로 소유하고, panel의 pane/tab은 DTO 내부에 유지한다. agent key는 `AgentView.agentId`다. delta의 관련 자원과 미확정 명령 정리는 하나의 sync `begin/write/commit`으로 공개한다. 여러 collection에 대한 원자성을 가정하지 않는다.

같은 collection의 별도 pending 행은 전체 panel 복사본이 아닌 명령 intent다. 조회는 최신 서버 행 위에 intent를 순서대로 적용한다. TanStack DB의 전체 행 optimistic mutation은 후속 서버 변경을 가릴 수 있어 사용하지 않는다. 응답 state는 서버 행에 직접 쓰지 않고 방송 반영을 기다리며, 성공 응답의 epoch/version이 반영되는 commit에서 intent를 제거한다. 동일 세션의 뒤 요청까지 확정 상태가 반영되면 앞 요청의 intent도 화면 적용을 중단하지만, 앞 요청의 개별 결과를 성공·실패로 바꾸지는 않는다. 실패는 해당 intent와 생성 대상에 의존하는 projection만 조정한다. 재접속은 서버 행을 교체하고 불확실한 intent의 화면 적용을 중단하되 요청 결과를 추정하거나 재실행하지 않는다. 완료 명령 이력은 저장소에 쌓지 않는다.

`ApplicationProvider`는 저장소를 먼저 설치하고 안정적인 이벤트 소비자를 연결한다. RPC 요청 식별자가 실제 발급될 때의 `panelCommand` 콜백이 intent와 requestId/sequence를 연결한다. `application-state.tsx`는 live query·명령 hooks와 React 메모리의 pane/tab 선택을 소유한다. snapshot에는 선택이 없고 삭제된 선택 대상만 정리한다. AppShell은 목록·알림·명령 결과 안내를, WorkspacePage는 projected 배치와 Provider 선택을 WorkspaceContent에 전달한다. fixture controller는 Storybook 경로에 남는다. 사용자 DnD·resize 완료만 명령을 만들고 서버 비율 반영은 명령을 만들지 않는다. terminal attach는 `ConnectedTerminal`이 소유한다. 앱 계약은 [[docs/specs/aiox-application-rpc]]를 따른다.

CLI reveal·알림 이동의 `focusTabId`는 `WorkspacePage`가 해당 navigation의 첫 렌더부터 pane·탭 선택에 반영한다. 같은 navigation에서 한 번 로컬 선택에 기록한 뒤에는 사용자의 탭 선택을 따른다. 따라서 대상 패널의 이전 선택 terminal을 잠깐 attach했다가 취소하지 않으며, 다시 방문하는 navigation은 목표 선택을 다시 적용한다. 유효한 목표 탭이 없으면 기존 선택 규칙을 유지한다. [Status: As-built] 근거: [[apps/web/src/pages/workspace/workspace-page.tsx]], [[apps/web/src/app/app-shell.test.tsx]].

저장소 근거: [[apps/web/src/shared/api/application-store.ts]], [[apps/web/src/shared/api/application-store.test.ts]], [[apps/web/src/shared/api/panel-projection.ts]], [[apps/web/src/app/application-state.tsx]], [[apps/web/src/app/application-state.test.tsx]], [[apps/web/src/app/app-shell.test.tsx]], [[apps/web/src/pages/workspace/workspace-commands.test.ts]].

근거: [[apps/web/src/main.tsx]], [[apps/web/src/attach.ts]], [[apps/daemon/src/app-state.ts]],
[[apps/daemon/src/app-state.test.ts]].

기존 terminal 생성/DELETE consumer도 동일 TerminalService/실행 종료 경로를 소비한다.
panel에 연결된 terminal의 직접 종료나 자연 shell exit는 연결 tab·관리 Runtime 정리를 함께
반영하고 RPC로 알린다. Host stop은 terminal DELETE가 아니라 Agent owner stop을 사용한다.

### Host run 접수와 실행 [Status: As-built]

CLI는 config/YAML/옵션·실행 환경을 검증한 뒤 source와 requestId를 전송한다. daemon도 입력을
검증하고 새 Host·전용 Network·선언 순서의 초기 panel/tab을 같은 transaction으로 등록한다.
호출한 workspace나 Network pane은 새 Host의 실행 자리로 사용하지 않는다. 같은 requestId의 재전송은
진행 중인 처리에 합류하거나 최근 결과를 받으며 Host 이름 충돌은 기존 실행을 변경하지 않고 거절한다.

등록 후 검증한 shell 설정으로 각 tab의 terminal을 병렬로 만들고 빌드된 foreground CLI를 실행한다.
호출별 Host/key 환경과 terminal 인증을 기존 관리 Agent 연결 경로가 소비한다. RuntimeRegistry의
준비·실패 이벤트가 target 결과를 결정하며 별도 상태 polling은 없다. 일부 실패는 성공한 실행을
유지하고, 실행 등록 전 실패도 관리 Agent 이력과 tab 안내에 남긴다. 살아 있는 vendor의 협업
실패는 TUI를 보존한다. 작업은 daemon 수명 작업이라 CLI 연결이 끊겨도 계속된다. CLI는 NDJSON
응답의 최종 결과로 성공·부분 실패를 출력하며, 연결 손실 시 requestId와 재조회 경로를 남긴다.

근거: [[apps/daemon/src/host-run.ts]], [[apps/daemon/src/host-run.test.ts]],
[[apps/daemon/src/host-command.ts]], [[apps/cli/src/host-command.ts]], [[apps/cli/src/host-command.test.ts]],
[[packages/persistence/src/sqlite/host-state.test.ts]]. 실제 shell·빌드 CLI·HTTP/RPC 검증은 macOS에서
vendor 대역으로 수행하며, 실제 vendor·React·지원 OS별 연결 검증을 대신하지 않는다.

### 개별 Agent·Host Network 제어 [Status: As-built]

`host-agents.ts`는 config를 검증하며 YAML이 필요 없는 직접 HTTP stop·Network 변경에도 적용한다.
개별 실행은 YAML과 전체 대상·Network 이름/default, 관련 route 상대 endpoint의 현재 적용 여부를
검증한 뒤 명령을 시작한다. 반영 불가능한 edge는 기존 실행을 멈추기 전에 거절한다.
개별 stop은 Runtime 종료·정산을 기다리고 shell·배치·정책을 유지한다. start/restart는 대상 정의와
대상에 닿는 membership·route만 저장하고 기존 실행 준비 관측을 재사용한다. 실행 중 대상의 start는
변경 없이 안내하며, 서로 독립된 대상은 병렬로 진행하고 실패와 성공을 결과에 따로 남긴다.

같은 Host panel의 입력 자리는 현재 Host CLI가 응답의 `launch` 이벤트를 받아 기존 foreground
연결로 이어 실행한다. 부모 shell이 CLI 종료를 기다리는 동안 새 명령을 주입해 생기는 교착을
피하기 위한 연결이며 실행 소유권은 daemon에 있다. 다른 자리는 shell 내부 CLI를 시작한다.
split weight로 현재 pane 사각형을 복원하여 top→left 순서로 배치한다. 기존 분할을 유지하고
새 TUI 준비가 확인된 뒤에만 옛 stopped 안내 자원을 정리한다.

Host Network CLI는 정확한 Host·Network 이름 조회로 ID를 고정한다. route 변경은 저장소에서
전체 endpoint를 검사하고 같은 Host 명령이 진행 중이면 거절한 뒤 하나의 transaction으로 반영하고 RPC에 알린다.

근거: [[apps/daemon/src/host-agents.ts]], [[apps/daemon/src/host-agents.test.ts]],
[[apps/cli/src/bootstrap.test.ts]], [[packages/persistence/src/sqlite/host-state.test.ts]].
실제 macOS shell·빌드 CLI·HTTP/RPC를 vendor 대역으로 검증한 범위이며 실제 vendor·React·지원 OS별
통합 완료를 뜻하지 않는다.

### 전체 Host 제어 [Status: As-built]

전체 restart는 `host-run.ts`의 공통 사전 검증·준비 관측을 재사용한다. 기존 이름이면
기존 Runtime 병렬 종료, 제거 Agent의 shell 종료 확인, 적용 구성 교체, 선언 Agent 병렬 실행을
순서대로 처리한다. 일반 shell과 pane tree는 유지하고 같은 key의 관리 탭을 재사용한다.
`replaceHost`의 원자적 panel 변경에서 제거 대상 탭을 제외한 뒤 탭이 하나도 남지 않으면
`initialHostPanel`의 최신 유효 layout·Agent 탭으로 초기 배치를 복원한다. 탭이 남아 있으면 기존
`removePanelTabs`·`placeAgent` 경로를 사용하며, 제거 탭의 빈 pane 정리 외에는 기존 pane ID·분할 비율·보존 탭 위치를 유지한다.
새 이름이면 기존 Host를 변경하지 않고 최초 실행 경로로 등록한다. 호출 shell을 재사용할 때는
CLI가 응답의 `launch` 이벤트로 foreground 실행을 이어받는다.

`host-control.ts`는 stop을 Runtime 종료에, delete를 panel 소유 terminal의 종료 확인과 저장소 삭제에
연결한다. 종료 실패는 대상 결과에 남기며 Host를 유지해 재시도할 수 있다. CLI의 이름 직접 조회·제어는
등록 Host를 정확한 이름으로 찾아 ID API를 호출한다. 이름 생략 시에만 YAML resolve를 사용하고
list/status는 서버의 live projection을 출력한다.

근거: [[apps/daemon/src/host-control.ts]], [[apps/daemon/src/host-control.test.ts]],
[[apps/daemon/src/host-run.test.ts]], [[apps/cli/src/bootstrap.test.ts]]. macOS의 실제 shell·빌드 CLI와
vendor 대역 검증이며 실제 vendor·React·지원 OS별 연결은 이 근거에 포함하지 않는다.

### 관리 Agent의 shell 실행 연결 [Status: As-built]

기존 `aiox agent run` foreground 경로는 실행 요청의 `AIOX_HOST_ID`·`AIOX_AGENT_KEY`를
관리 실행의 private context로 소비한다. 이 값은 해당 CLI 호출에만 설정하고 기반 shell의
영구 환경으로 두지 않는다. CLI가 전달한 인증된 terminal context로 살아 있는 shell을 확인하고,
저장된 Host panel의 terminalId·agentKey가 모두 일치해야 연결한다. cwd나 idle 여부로 shell을
선택하지 않으며 외부 실행은 이 context를 사용할 수 없다.

`managedLaunch`는 적용된 Host의 adapter·args·role·description과 공통/Agent instruction을
선택하고 private context를 vendor 환경에서 제거한다. AgentController는 기존 vendor execution과
binding을 재사용한다. Runtime 등록은 같은 Host/key와 terminal의 중복 실행을 예약 단계에서
막고, 실제 binding 준비 이벤트로 preparing→running을 전환한다. 제어 연결 단절만으로 vendor를
종료하지 않는다. 명시 stop은 실행 owner와 부속 자원의 종료를 확인하고 borrowed shell을 보존한다.
준비 전 실패·정상 종료·비정상 종료·명시 stop을 구분하며 정리 실패 시 등록을 보존해 재시도한다.

근거: [[apps/daemon/src/managed-agents.ts]], [[apps/daemon/src/agent-controller.ts]],
[[apps/daemon/src/daemon.ts]], [[apps/daemon/src/agent-controller.test.ts]],
[[apps/daemon/src/managed-agents.test.ts]]. 마지막 테스트는 실제 bash PTY와 빌드된 CLI의
왕복·shell 복귀를 검증하며 vendor는 테스트 대역이다. 실제 React 소비와 실 vendor 수동 검증의
증거로 사용하지 않는다.
