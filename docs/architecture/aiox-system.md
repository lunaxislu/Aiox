# AIOX System Architecture

Status: Target

이 문서는 TUI 제품의 책임 배치, 실행 자원 소유권과 package 경계를 소유한다.
[[docs/aiox-tui-product]]가 전체 문서 진입점이며, 외부 실행 계약은
[[docs/specs/aiox-runtime]], 협업 계약은 [[docs/specs/aiox-collaboration]],
Host 선언 계약은 [[docs/specs/aiox-host]]가 소유한다. 현재 조립 범위 외의 구조는 목표이며 구현 완료 주장이 아니다.

## 실행 소유권과 협업 등록 [Status: Target]

실행 소유권은 [[docs/specs/aiox-runtime]]의 명령·인증된 실행 위치 계약을 따른다.
기존 RuntimeRegistry를 사용하되 다음 책임을 분리한다. 아래 구조는 승인된 목표이며 뒤의
Stage 2·Claude 현재 조립 근거와 Host·Codex 목표 범위를 구분한다.

```text
실행 소유자
├─ daemon → Web·Host vendor / PTY / 필수 부속 실행
└─ 외부 CLI → vendor child / 상속 입출력 / inbox 임시 디렉터리 / 필수 부속 실행
협업 등록 — daemon RuntimeRegistry
├─ Runtime 신원·credential·membership·등록 유효성
├─ vendor binding → 입력·인증 hook·준비·관측
└─ terminal 차용 관계 → daemon shell 연결만, 실행 소유권과 별개
```

실행 소유자가 프로세스 종료를, daemon이 협업 등록 해제를 담당한다. binding의 vendor
입력·관측 책임에 외부 프로세스 kill이나 CLI 임시 자원 삭제를 결합하지 않는다. 기존 Claude
모듈 배치는 이 책임을 충족하도록 바꿀 수 있으며 범용 runner·새 Registry를 선도입하지 않는다.

```text
외부 CLI: daemon 제어 WS 연결 → Registry·hook 맵·credential 준비 응답
        → vendor 직접 실행 → 시작 통보 → 협업 준비 확인 → 종료 통보·CLI 자원 정리
제어 WS 손실: daemon 등록 정리 / 시작한 CLI vendor는 준비 완료 전후 모두 유지
```

화면 바이트·resize는 제어 WS에 보내지 않는다. CLI 사망은 WS close로 관측하며 heartbeat·lease·
자동 재연결은 추가하지 않는다. 명시적 초기 실패·최초 준비 timeout은 CLI에 `startup-failed`를
알려 이번 실행을 종료한다. daemon·WS 손실은 이 실패 명령과 구분한다.
등록 해제는 route·요청 결과·credential 정리를 재사용하되 관측 손실을 vendor exit로 확정하지
않는다. DB 정리가 실패하면 `stop_incomplete`와 daemon·Web 재시도 경로를 유지한다.
선택 이유는 [[docs/decisions/execution-ownership]]을 따른다.

## Stage 2 현재 조립 범위 [Status: As-built]

CLI는 HTTP로 daemon lifecycle·persistent Network/Route·Agent 조회를 호출한다. daemon 한 Node 프로세스가 node:http의 daemon/Web listener, ws attachment, 공식 MCP TypeScript SDK·Zod, Runtime/credential·messaging과 PTY registry를 조립한다. Web listener는 빌드된 최소 Web 정적 파일과 같은 origin의 API·WebSocket을 제공한다. DB는 daemon boot가 열며 TypeORM·better-sqlite3 migration을 거친다.

근거: [[apps/cli/src/bootstrap.ts]] `apps/cli/src/bootstrap.ts:215-522`, [[apps/daemon/src/bootstrap.ts]] `apps/daemon/src/bootstrap.ts:44-80`, [[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:115-249`; HTTP·포트·route 검증은 [[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:54-181`.

Runtime 공통 정리는 credential·협업 유효성을 먼저 회수하고 daemon 소유 binding·PTY만 종료한다. binding cleanup과 standalone endpoint의 route·요청·등록 정리는 실행 소유권과 별도로 수행한다. 실패한 정리는 재시도 경로를 남기고 PTY exit만으로 daemon을 종료하지 않는다. 원 발신자 종료 후 수신 요청 결과 보존은 collaboration 계약을 따른다.

일반 shell은 TerminalService에만 등록하고 RuntimeRegistry와 분리한다. `/api/terminals` 생성·목록과
개별 조회·명시 종료는 공통 HTTP 보호를 거쳐 같은 서비스로 연결되며 기존 WS 입출력 경로를 쓴다.
Runtime은 직접 소유 PTY와 차용 shell을 구분한다. 차용 Agent의 종료는 binding·Runtime 관계만
정리하고, terminal 자체 종료는 연결 Runtime 정리로 이어진다. daemon force stop은 남은 일반
shell도 종료·확인한다. 실패한 binding에 연결된 shell은 재시도할 수 있게 유지한다.

근거: [[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:268-355`,
[[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:293-485`.

근거: [[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:268-289`, [[apps/daemon/src/networks.ts]] `apps/daemon/src/networks.ts:90-106`; 실패·재시도와 Network 선행 삭제 검증은 [[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:743-793`, 실제 PTY exit는 [[apps/daemon/src/terminals.test.ts]] `apps/daemon/src/terminals.test.ts:280-346`.

현재 application 책임은 daemon 내부 모듈에 있으며 별도 application/controller package를 모두 만든 상태가 아니다. Claude 연결은 아래 Stage 3 범위로 확장했고 Codex와 Host/Worktree 실행은 아직 구현 대상이다. 최소 Web·화면 복귀의 현재 한계는 [[docs/architecture/aiox-storage-terminal]]을 따른다. CLI와 Web 산출물 탐색은 workspace 배치 기준이며 npm 배포 검증을 대신하지 않는다.

## Claude 현재 조립 범위 [Status: As-built]

CLI는 terminal 문맥이 있으면 Web foreground WS로, 없으면 별도 external 제어 WS로 연결한다.
Web은 ClaudeBinding의 vendor PTY를 중계하고 빌린 shell의 공개 terminal ID를 유지한다.
외부는 CLI가 vendor를 직접 spawn해 입출력을 상속하고 daemon에는 시작·종료만 통보한다.
RuntimeRegistry의 `executionOwnership`과 `collaborationActive`는 프로세스 종료 책임과
협업 유효성을 분리하며 `terminalOwnership`은 daemon terminal 소유·차용만 표현한다.
`stopRuntime`은 revoke 후 daemon 소유 binding에만 stop을 호출하고 cleanup·DB 정리를
수행한다. 실패한 record는 재시도용으로 남지만 인증·발견·전송 대상에서는 제외한다.

근거: 실행 분기는 [[apps/cli/src/bootstrap.ts]] `apps/cli/src/bootstrap.ts:451`,
직접 실행은 [[apps/cli/src/external.ts]] `apps/cli/src/external.ts:12`,
제어 연결은 [[apps/daemon/src/claude-controller.ts]] `apps/daemon/src/claude-controller.ts:80`,
등록 유효성은 [[apps/daemon/src/runtimes.ts]] `apps/daemon/src/runtimes.ts:58`,
정리 경계는 [[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:307`.

이전 Stage3의 외부 shell 실측도 daemon vendor PTY 경로였다. 그 기록을 새 직접 실행이나
외부 vendor 독립 수명 검증으로 승계하지 않는다.

Runtime은 시작 중에도 credential 인증에 필요한 등록을 가지지만, 살아 있는 vendor·인증 hook·inbox 연결과 Network가 있는 경우 공통 MCP 초기화를 확인해야 전송 준비가 된다. hook 관측은 binding에서 기존 입력 결과·자동 알림 서비스로 이어진다. 세부 구성, 미확인 입력 결과와 OS별 검증 경계는 [[docs/architecture/aiox-vendor-bindings]]가 소유한다. 이 구현 존재는 사용자 참여 실제 모델 E2E 완료를 뜻하지 않는다.

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
│  ├─ StandaloneAgentController — daemon 소유 실행·종료 / 외부 협업 등록
│  ├─ HostController — workspace·Network·Agent 실행 묶음
│  ├─ Network / Messaging — 소속·route·전달·응답 연결
│  └─ Credential registry — token → 현재 Runtime
├─ Vendor bindings — 준비·입력·관측 / 소유 실행의 vendor별 실행·종료 방법
│  ├─ Claude TUI child + native inbox + hooks
│  └─ Codex TUI child + App Server child + Binding Relay
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

Stage 2 서버 조립에는 node:http, ws, 공식 MCP TypeScript SDK, Zod, node-pty, TypeORM과 better-sqlite3가 설치돼 있다. 필요한 package의 manifest와 pnpm lockfile이 버전을 소유한다. 현재 workspace Node 요구 조건은 `^22.13.0 || >=24.11.0`이다. 근거: [[package.json]] `package.json:29-38`. ORM migration·플랫폼 검증 경계는 [[docs/architecture/aiox-storage-terminal]]을 따른다.

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
상태 요약은 daemon 관측에서 만들며 모델이 작성하지 않는다. MCP의 idle/working/failed와 Web의 상세 상태를 분리하고, 개별 요청 결과는 현재 상태를 덮어쓰지 않는다. 외부 의미는 [[docs/specs/aiox-runtime]]을 따른다.

## 실행과 정리

아래 launch 흐름은 daemon 소유 실행이다. 외부 준비·실행 순서는 위 실행 소유권 절을 따른다.

```text
명령·manifest 전체 검증
 → workspace 준비(Host --worktree이면 Git)
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
 → HostController stopping
 → binding이 소유한 TUI에 종료 입력 요청
 → 실제 exit 확인·부속 실행 정리
 → credential/binding/membership/Host Network 정리
 → Worktree·작업 결과 보존

daemon stop --force
 → 신규 실행·등록·메시지 전달 차단 / 진행 중 등록 commit 동기화
 → daemon 소유 Host·standalone·PTY·Relay·App Server 등 강제 종료
 → 외부 실행은 vendor 유지·협업 등록 해제
 → 실제 종료 확인·credential/실행 관계 정리
 → 모두 정리되면 DB 등 daemon 자원 정리 → daemon 종료
 → 미완료면 남은 관리 handle·listener·DB 유지 → 종료 재시도
```

정상 stop 입력의 키·순서·시간 제한과 OS별 강제 종료 방법은 미확정이다. 입력 전송·kill 요청의
성공 또는 조회 실패를 전체 종료 성공으로 표현하지 않는다. 관리 handle과 자원 소유권을 기준으로
종료하며 외부 Claude/Codex나 터미널 앱 전체를 이름으로 찾아 죽이지 않는다. 강제 종료 대상은
작업 중인 TUI를 포함한 daemon 직접 소유 자원이며 일반 작업 자식 전체로 확장하지 않는다. 재시도와 TUI의
실제 종료 후 등록 정리는 [[docs/specs/aiox-runtime]]의 종료 계약을 따른다. persistent Network 정의,
Worktree와 저장 파일을 삭제하지 않는다.

일반 daemon stop은 admission을 막고 daemon 소유 활성 실행 의존성을 검사한다. 의존성이 있으면 거절하고
running으로 돌아가 admission을 다시 연다. 외부 실행 등록과 persistent Network 정의만 있는 것은 blocker가 아니다.
restart는 safe stop + start이며 stop 거절 시 기존 daemon을 유지한다. `restart --force`는 없다.

## Host와 Network의 실체화

Host 한 실행은 한 workspace와 host-managed Network 하나를 소유한다. 기본은 현재 프로젝트,
`--worktree <branch>`는 AIOX가 Git workspace를 준비하며 내부 Agent 모두 같은 cwd를 쓴다.
같은 YAML로 새 Host를 띄우면 Runtime ID·token·Network는 새로 분리된다. 같은 디렉터리를 쓴다면
파일은 공유하므로 namespace를 sandbox로 설명하지 않는다.

Worktree 생성 위치·기준 commit·기존 branch/checkout 재사용·충돌 처리는 herdr 구현을 참고할
미결 사항이다. `.aiox/worktrees`를 이미 선택한 기본값으로 쓰거나 자동 force/merge/commit을 넣지 않는다.
Host Agent stop은 항목을 stopped로 남기고 활성 실행 관계를 정리한다. 이름 기반 start는 새 Runtime·credential을 만들고 보존한 route를 새 ID에 연결한다. 이전 vendor 대화는 자동 resume하지 않는다. Host 전체 종료는 materialization·override를 지우고 다음 실행은 YAML로 새로 구성한다.
Host 이름 override, YAML validation과 CLI 표면은 Host spec을 따른다.

Persistent Network 정의는 DB가, host-managed 정의는 YAML이 소유한다. daemon은 두 종류를 같은
routing engine으로 실행하지만 YAML을 persistent 정의로도 저장해 이중 권위로 만들지 않는다.
Agent는 동시에 최대 한 Network에 속하며 실행 중 join/leave는 없다. Network URL은 선택자이고
권한은 credential의 Runtime 신원 + 현재 membership + directed route로 판정한다.

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
├─ adapter-sdk/
├─ adapters/{claude,codex}/
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
조율한다. adapter-sdk와 application port에 같은 계약을 복제하거나 순환 참조하지 않는다.

daemon은 application과 구체 구현을 조립한다. CLI/Web은 protocol을 통해 통신하며 DB를 직접
수정하지 않는다. packages가 apps를 역참조하지 않는다. 브라우저 xterm renderer는 Web에 두어
Node PTY 코드를 번들에 끌어오지 않는다. 사이트는 제품 이후 소개·설치·사용법·설계 근거를 위한
별도 앱이며 로컬 daemon 접근 권한을 주지 않는다. package 이름은 목표이지 물리적 이전 완료가 아니다.

Sources:

- `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §3, §7, §14–§15, §18, §23–§25.
- `logs/2026-09-07-AIOX-TUI-Stage2-Daemon-MCP-Terminal.md` W2 — 공통 연결 보호·종료 미완료 재시도·직접 관리 자원 범위.
