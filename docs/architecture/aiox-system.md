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

## Stage 2 현재 조립 범위 [Status: As-built]

CLI는 HTTP로 daemon lifecycle·persistent Network/Route·Agent 조회를 호출한다. daemon 한 Node 프로세스가 node:http의 daemon/Web listener, ws attachment, 공식 MCP TypeScript SDK·Zod, Runtime/credential·messaging과 PTY registry를 조립한다. Web listener는 빌드된 최소 Web 정적 파일과 같은 origin의 API·WebSocket을 제공한다. DB는 daemon boot가 열며 TypeORM·better-sqlite3 연결에서 현재 schema를 직접 초기화한다. 초기화 구조는 [[docs/architecture/aiox-storage-terminal]]의 이력 보존과 ORM 전환을 따른다.

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

Stage 2 서버 조립에는 node:http, ws, 공식 MCP TypeScript SDK, Zod, node-pty, TypeORM과 better-sqlite3가 설치돼 있다. 필요한 package의 manifest와 pnpm lockfile이 버전을 소유한다. 현재 workspace Node 요구 조건은 `^22.13.0 || >=24.11.0`이다. 근거: [[package.json]] `package.json:29-38`. DB 초기화·플랫폼 검증 경계는 [[docs/architecture/aiox-storage-terminal]]을 따른다.

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
Windows native에서는 이 검사를 생략하고 force와 같은 대상을 종료한다. restart는 이 일반 stop을
재사용하므로 Windows의 작업 중단 정책도 동일하며 restart --force는 없다. SIGINT/SIGTERM 등
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

외부 요청/응답은 [[docs/specs/aiox-host]], Operation·검증은 [[docs/specs/aiox-runtime]],
배치·config·mock 소비는 [[docs/specs/aiox-configuration-web]], 저장 모델은
[[docs/architecture/aiox-storage-terminal]]이 소유한다. 다음은 구현 분리를 위한 연결도다.

```text
CLI (argv/source/인증된 terminal 문맥)      React (조회·배치·명시 제어)
                 \                         /
                   공통 daemon HTTP handler
                     → prepare (config → YAML → CLI → 환경/대상)
                     → Host application 명령 경로
                        ├─ persistence transaction → 적용 구성/배치/Operation
                        └─ shell + 실행 owner + adapter → process/binding 실제 관측
                                  ↓
                         registry/projection + 결과 저장
                                  ↓
                     HTTP 요청 응답 / SSE state(변경 DTO 직접 전달)
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
         → preparing → 실제 ready/실패 기록 → SSE state → React TUI/원인
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
         └─ 실패: Operation 진단+남은 관리 자원 유지 → 명시 재시도

/exit → 실제 Agent exit → binding/credential/membership 정리 → 같은 shell 표시
Copy → clipboard 성공 → dismiss 저장 → SSE state → 기존 shell (자동 실행 없음)
이동/분할 → revision 검증 → layout 저장 → SSE state → 같은 terminal 재배치·resize
닫기 → 실행 중이면 확인 → 종료 관측 → tab 제거 저장 → 빈 마지막 pane 보존

시작 실패 → 프로세스 없음/종료 확인: 실패 안내 + 관리 Agent stopped
         → vendor 생존/협업만 실패: TUI + 진단 유지, stopped 아님
최초·재접속 → SSE 전체 snapshot → 이후 state(변경 DTO)
         → 같은 live terminal snapshot→tail→live → React 복원
```

prepare 오류는 부수효과 전 실패, 실행 후 실패는 부분 적용 결과다. 독립 대상의 성공을 실패로
되돌리거나 실패한 대상까지 전체 성공으로 묶지 않는다. shell 생성만으로 Agent 준비 성공,
서버 ready만으로 React 실제 연결 완료를 보고하지 않는다.

### 현재 경로 대조 [Status: Current gap]

Host parser는 이전 표면을 남기고 bootstrap은 Host 요청을 unavailable로 거절한다.
근거: [[apps/cli/src/cli.ts]] `apps/cli/src/cli.ts:230-261`, [[apps/cli/src/bootstrap.ts]]
`apps/cli/src/bootstrap.ts:223-231`, [[apps/cli/src/bootstrap.test.ts]]
`apps/cli/src/bootstrap.test.ts:663-679`. 따라서 새 계약을 기존 Host 동작으로 보고하지 않는다.
HTTP handler가 두 listener를 공유하고 terminal/Network/Agent 조회를 제공하는 경로는 재사용한다.
근거: [[apps/daemon/src/http.ts]] `apps/daemon/src/http.ts:111-188`.
SSE 변경 후 HTTP 조회와 xterm WS 소비는 최소 Web에 구현돼 있다.
근거: [[apps/web/src/main.ts]] `apps/web/src/main.ts:309-375`, `apps/web/src/main.ts:502`,
[[apps/web/src/attach.ts]] `apps/web/src/attach.ts:161-269`,
[[apps/web/src/attach.test.ts]] `apps/web/src/attach.test.ts:146-194`.
W1의 React·Host 저장/제어·최소 mock 구현이나 실제 vendor 검증은 아직 수행하지 않았다.

기존 terminal 생성/DELETE consumer도 동일 TerminalService/실행 종료 경로를 소비한다.
panel에 연결된 terminal의 직접 종료나 자연 shell exit는 연결 tab·관리 Runtime 정리를 함께
반영하고 SSE로 알린다. Host stop은 terminal DELETE가 아니라 Agent owner stop을 사용한다.
