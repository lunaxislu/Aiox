# AIOX Storage, Terminal and Web State

Status: Target

이 문서는 daemon의 지속 데이터, 설정 적용, 터미널 화면·attachment와 Web 알림 projection을
소유한다. 실행 소유권은 [[docs/architecture/aiox-system]], vendor 관측은
[[docs/architecture/aiox-vendor-bindings]], 사용자 동작 계약은
[[docs/specs/aiox-configuration-web]]와 [[docs/specs/aiox-runtime]]가 소유한다.
As-built로 표시한 범위 외에는 목표 구조다. OS별 통합 완료를 뜻하지 않는다.

## 데이터 소유권

| 저장 책임                                 | 대상                                                                                                   | 경계                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| 실행 환경 사용자 홈의 `.aiox/config.json` | 터미널·keyboard·포트·사이드바 너비와 열림 상태·화면 조작 keybindings 변경분·Host 초기 layout           | 모든 프로젝트·Host·standalone 공통                              |
| SQLite                                    | persistent Network/Route, AIOX send·대상별 결과·daemon 알림 본문, 실행 이력, 알림/읽음, workspace 배치 | 처리 종료 후 기본 30일, 상세는 configuration-web 계약           |
| 사용자 홈의 `.aiox/attachments/` | Web에서 붙여넣은 이미지 파일 | terminal 종료·재접속 뒤에도 보존; 현재 자동 만료 없음 |
| daemon memory                             | live process/PTY/binding/credential/activity                                                           | DB의 과거 running을 현재 생존으로 간주하지 않음                 |
| 전역 config의 `appearance.theme`          | Web system/light/dark theme                                                                            | terminal palette와 별개; 운영 Web은 브라우저 저장소를 쓰지 않음 |
| Host YAML                                 | Host-managed 정의                                                                                      | DB persistent 정의와 이중 권위 금지                             |

운영 Web 문구는 영어이며 theme은 전역 config에 저장한다. 소리 설정의 세부 schema는 Stage6/7 후속이다. 실제 Runtime
credential을 영속화된 설정·메시지에 넣지 않는다. vendor transcript/reasoning 전체 복제나 SQLite
저장을 근거로 동일 delivery 재전송·자동 재시작을 추가하지 않는다.

Persistent Network의 저장된 endpoint route는 live Runtime 관계다. daemon 시작 시 과거
endpoint route를 정리하되 Network 이름과 메시지 이력은 유지한다. 이름 재사용을
실행 복원으로 해석하지 않는다. 외부 수명 계약은 [[docs/specs/aiox-host]]를 따른다.

## Host shell과 화면 projection [Status: Target]

Host Agent 실행은 기반 shell/terminal과 별도 수명이다. stop은 Agent 실행 연결을 해제하고
shell handle을 유지한다. Web의 stopped 안내는 같은 terminal을 가리는 표시이며 Copy는 그 표시를
해제한다. 이를 terminal 프로세스 재생성이나 자동 입력으로 구현하지 않는다.

Host의 적용된 Agent 구성과 terminal 연결을 구분해 보관한다. Agent 탭이 없어도 관리 항목을
표시할 수 있어야 하며, 과거 연결만으로 일반 shell로 돌아온 탭을 Agent 전용 자리로 재사용하지 않는다.
실행 생존·종료 사유의 원천은 daemon 관측이며 DB의 과거 상태를 생존 증거로 삼지 않는다.
Gateway snapshot/event와 terminal stream의 소비 결과가 준비·TUI·stopped·실패·shell 표시로 이어져야 한다.

Host Network와 적용 정책은 stop 후 유지하고 delete에서 정리한다. 선언은 YAML,
적용 구성·배치·이력은 저장 상태, 실제 process/PTY/binding/credential은 live 자원이라는 경계를 유지한다.
명령별 정리 범위는 [[docs/specs/aiox-host]], 화면 전환은 configuration-web 계약이 소유한다.

## 이력 보존과 ORM 전환 [Status: As-built]

Network·Message·Delivery·Notification ID는 UUID v7로 새로 발급한다. 스키마와 저장 row 타입은 `schema.ts`·`host-schema.ts`가 소유한다. Drizzle 정의로 생성된 초기 DDL은 `schema:generate --check`에서 대조한다. `@effect/sql-sqlite-node`가 SQLite client를 제공하고 Drizzle은 `drizzle-orm/effect-sqlite-node`의 `makeWithDefaults()`로 구성한다. 둘은 하나의 `ManagedRuntime`이 소유하며 공개 저장소의 Promise API는 경계에서 Effect를 실행한다. 쿼리와 transaction 내부는 Effect로 수행한다.

DB를 열 때 daemon은 외래 키를 켜고 생성 schema와 Host member trigger를 하나의 SQLite transaction에서 실행한다. 현재 schema로 빈 DB를 직접 만들며 과거 개발 DB migration·backfill·startup reset 경로는 없다. transaction 실패는 rollback한다. 실제 SQLite 원인 코드는 Promise 경계에서도 확인 가능하고, 도메인 오류는 원래 class identity를 유지한다.

근거: [[packages/persistence/src/sqlite/database.ts]] `packages/persistence/src/sqlite/database.ts:193-229`, [[packages/persistence/src/sqlite/host-state.ts]] `packages/persistence/src/sqlite/host-state.ts:446-522`; schema source/generator는 [[packages/persistence/src/sqlite/schema.ts]], [[packages/persistence/src/sqlite/host-schema.ts]], [[packages/persistence/scripts/generate-schema.mjs]]. 초기화·재오픈·rollback 및 오류는 [[packages/persistence/src/sqlite/database.test.ts]] `packages/persistence/src/sqlite/database.test.ts:66-124`, `packages/persistence/src/sqlite/database.test.ts:156-200`; Host domain 오류 타입은 [[packages/persistence/src/sqlite/host-state.test.ts]]에서 검증한다.

Message, 대상별 Delivery, daemon Notification은 내부 식별자와 외래 키로 연결한다. 전송 당시 route 관계는 각 Delivery에 보존한다. retention은 완료된 이력만 보존 기한에 따라 지우고 진행 중 요청은 제외한다. 보존 기간과 공개 범위는 [[docs/specs/aiox-configuration-web]]이 소유한다.

## 메시지 완료 저장과 실패 복구 [Status: As-built]

대상별 처리 결과와 정책상 필요한 daemon 알림은 같은 SQLite transaction으로 저장한다.
둘 다 저장된 뒤에만 메모리 추적을 제거하고 발신 Agent 입력으로 알림 전달을 시도한다.
알림 입력이 거절돼도 저장된 알림은 Web 조회에 남는다. 알림 정책은
[[docs/specs/aiox-collaboration]]을 따른다.

controls.settle resolve는 daemon이 최초 outcome과 향후 저장 재시도 책임을 인수했다는 ack다.
인수 전 소유권·delivery 검증 실패는 reject하며 adapter가 결과를 보존한다. 인수 후 DB 실패는
resolve하고 기존 MessageService의 inFlight.result에 최초 outcome/error/time을 불변으로 남긴다.
별도 pending 권위나 durable outbox는 없다. Runtime 종료·cleanup도 인수한 결과를 변경하지 않는다.

최초 DB 실패가 daemon 전체의 timer 하나를 예약한다. 새 실패는 기존 due time을 미루지 않는다.
1초로 시작해 실패 batch마다 두 배, 최대 30초이며 batch 시작의 snapshot을 순차 처리한다.
같은 delivery 저장은 settling으로 병합하고 실행 중 새 실패는 다음 batch에서 처리한다. 결과가
아직 없는 진행 중 delivery는 재시도 대상이 아니다. 성공만 제거하고 남은 대상이 있으면 timer
하나를 예약하며 pending이 없으면 timer와 backoff를 초기화한다. 각 요청의 transaction은 유지한다.
최초·변경된 저장 오류와 복구는 Pino stderr 진단에 deliveryId·대상 runtimeId를 남기며 같은 오류의 반복 출력은 억제한다. 진단 파일·오류 직렬화·민감정보 제외 정책은 [[docs/architecture/aiox-system]]의 서비스 진단 로그 절을 따른다. 저장 오류의 사용자 결과·재시도 상태는 이 진단과 별도로 유지한다.

종료 drain은 timer를 취소하고 active persist/running batch에 합류한 뒤 최종 snapshot을 처리한다.
미저장 결과가 남으면 warnings와 stopped:false를 반환하며 HTTP 409 stop_incomplete로 daemon·DB를
유지하고 중앙 재시도를 재개한다. 성공으로 숨기거나 DB를 먼저 닫지 않는다. 메모리 pending은
프로세스 크래시·daemon 재시작의 내구성을 제공하지 않으며 vendor 입력 재주입도 하지 않는다.

근거: [[packages/persistence/src/sqlite/database.ts]] `packages/persistence/src/sqlite/database.ts:188-210`,
[[apps/daemon/src/messaging.ts]] `apps/daemon/src/messaging.ts:280-389`,
[[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:561-578`.
검증: [[apps/daemon/src/messaging.test.ts]] `apps/daemon/src/messaging.test.ts:481-607`,
[[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:2001-2035`. SQLite 결과+알림 rollback, A/B/C 시간차 실패의 단일 timer,
긴 batch 중 D 추가, Runtime 종료 후 저장, drain 실패·HTTP 409·재시도 재개를 검증한다.

## SQLite와 플랫폼

`packages/persistence`가 schema 초기화·쿼리·transaction을 소유하고 daemon boot가 사용자 데이터베이스를 연다. 경로는 사용자 홈 아래 `.aiox/aiox.db`이며, CLI·Web·vendor binding은 DB 파일을 직접 열지 않는다. 열기와 닫기는 Effect SQLite Node runtime 생성과 dispose 경계에 있다. 외래 키는 연결마다 명시적으로 활성화하며 파일·PTY·network 호출은 DB transaction 바깥에서 수행한다.

macOS와 Linux는 같은 schema와 저장 경계를 사용한다. 지원 실행 환경과 검증 경계는 [[docs/specs/aiox-runtime]]을 따른다.

현재 workspace Node engine은 `^22.16.0 || >=24.11.0`이며 Node runtime 요구의 owner는 [[docs/architecture/aiox-system]]과 [[package.json]]이다. 역사적 플랫폼 검증: CI run [34314631099](https://github.com/lunaxislu/aiox-prototype/actions/runs/34314631099)은 당시 `better-sqlite3` 구현이 있던 commit `6621fc3`의 Windows/Linux/macOS × Node 22/24 결과다. 이는 그 시점의 locked install·lint·build·typecheck·test·built CLI 검증이며 이후의 Effect SQLite driver와 Application RPC 변경 검증으로 간주하지 않는다. 현재 구현은 위 as-built 근거와 현재 코드/tests를 기준으로 판단한다.

WAL 사용 중인 DB의 `-wal`·`-shm` 파일은 같은 디렉터리의 SQLite sidecar다. 열린 DB 옆에서 sidecar를 임의로 삭제하지 않는다.

근거: [[apps/daemon/src/bootstrap.ts]] `apps/daemon/src/bootstrap.ts:46-90`, [[packages/persistence/src/sqlite/database.ts]] `packages/persistence/src/sqlite/database.ts:193-229`, [[packages/persistence/src/sqlite/host-state.ts]] `packages/persistence/src/sqlite/host-state.ts:446-522`; DB 초기화·재오픈은 [[packages/persistence/src/sqlite/database.test.ts]]에서 검증한다.

## 전역 설정 적용

설정 scope는 사용자 전역 하나이며 프로젝트 override는 없다. Host 실행 정의 `aiox.yaml`과도
별개다. 전역 설정은 `.aiox/config.json`을 사용하며 형식·검증 계약과 Stage 1 구현 범위는
[[docs/specs/aiox-configuration-web]]를 따른다. npm 설치 디렉터리에 사용자 설정을 저장하지 않는다.

```text
Web 열기 → config 조회 → preview → revision 비교·검증·파일 저장 → 저장한 Web에 적용
파일 직접 편집 → 다음 Web 조회/명령/새 shell 생성에서 검증·소비
```

설정 watcher·설정 SSE·debounce는 두지 않는다. 조회/저장 모델과 config revision 충돌은
[[docs/specs/aiox-configuration-web]]의 설정 HTTP가 소유한다. 잘못된 설정은 Web의 마지막
유효 표시를 유지하되 실행 명령의 실패를 last-good로 숨기지 않는다. shell/port/layout의 적용
시점을 분리하며 폰트 변경은 저장한 Web에서 fit/resize한다. 다른 탭은 다음 조회에서 적용한다.

Web terminal theme은 외부 cmux/VS Code/일반 터미널의 appearance까지 바꾸는 설정이 아니다.
vendor가 명시적으로 그리는 모든 요소의 색상 변경을 보장하지 않는다. AIOX pane/탭 keybinding과
vendor Ctrl+O 등 입력·브라우저 예약 키를 구분한다.

## PTY와 Web 복귀

PTY·headless·Serialize·Web 화면 복원은 daemon 소유 terminal의 책임이다. 외부 CLI 소유
실행은 사용자 입출력을 상속하며 TerminalService에 terminal을 생성·차용하거나 화면을
이관하지 않는다. Web은 유효한 협업 등록 상태만 조회한다. 실행 위치 판정은 인증된 terminal
문맥을 사용하며 소유권은 [[docs/architecture/aiox-system]]을 따른다. [Status: As-built]
근거: [[apps/cli/src/bootstrap.ts]] `apps/cli/src/bootstrap.ts:491`,
[[apps/cli/src/external.ts]] `apps/cli/src/external.ts:15`.

일반 shell의 terminal ID와 마지막 확인 작업 경로는 TerminalService가 유지한다. 초기값은
생성 경로이며, 지원 shell의 프롬프트 hook이 보내는 `OSC 777;aiox-cwd`를 headless 파서가
감지하면 daemon이 소유한 shell PID의 cwd를 조회한다. 제어 신호에는 PID나 경로를 싣지 않는다.
Linux daemon은 `/proc/<pid>/cwd`, macOS는 `/usr/sbin/lsof`의 NUL 구분 cwd 필드를
사용한다. 바뀐 경로만 TerminalService → AppState → Web으로 전달한다. 조회 중 추가 신호는
후속 조회로 합치며, 세션 제거 뒤 완료된 조회는 상태를 게시하거나 유효한 기준 경로를 반환하지 않는다.

경로 알림은 bash·zsh·fish의 기존 초기화 연동에 설치하되 idle/종료 판별용 trap 설치 조건과
분리한다. 현재 실행 인자가 있는 shell·그 밖의 shell에는 hook을 설치하지 않는다. 미지원·조회
실패 시 생성 경로 또는 마지막 확인 경로를 유지한다. 새 탭·분할·
workspace 생성 시에는 기준 shell PID를 다시 조회하고 기존 실행 경로 검증을 거친다. 서버는
생성 요청의 기준 참조만 소비하며 브라우저의 포커스·선택 상태를 소유하지 않는다. [Status: As-built]
근거: [[packages/terminal/src/shell-integration.ts]], [[packages/terminal/src/shell-integration.test.ts]],
[[packages/terminal/src/index.ts]], [[apps/daemon/src/terminals.ts]], [[apps/daemon/src/terminals.test.ts]],
[[apps/daemon/src/web-commands.ts]], [[apps/daemon/src/web-commands.test.ts]].

일반 shell에는 Agent credential·membership이 없다.
일반 shell 생성 시 상속 환경의 `AIOX_*` 문맥을 제거하고, 새 `AIOX_TERMINAL_ID`와 비공개
`AIOX_TERMINAL_TOKEN`을 child env에 넣는다. 이 문맥은 메모리에만 유지하고 API 목록·URL·argv·로그에
노출하지 않는다. 일반 shell exit/정리 후에는 유효하지 않다. [Status: As-built]

daemon 소유 PTY는 부모 OS 터미널의 식별 환경을 상속하지 않는다. `createTerminal`은
`TERM=xterm-256color`, `TERM_PROGRAM=aiox`, `COLORTERM=truecolor`로 실제 xterm 렌더러를
선언하고 Ghostty·Kitty·WezTerm 등의 부모 식별값을 제거한다. 사용자 PATH·언어·실행 환경은 유지한다.
이를 생략하면 vendor가 부모 터미널 전용 이미지 프로토콜을 보내 화면 오염과 출력 지연을 일으킬 수
있다. 외부 CLI가 직접 소유한 vendor에는 이 정규화를 적용하지 않는다. [Status: As-built]
근거: [[packages/terminal/src/index.ts]], [[packages/terminal/src/index.test.ts]].

Web의 독립 Network 실행은 AgentController가 인증된 호출 shell과 대상 소속을 비교한다. 같은
panel이면 최초 CLI의 기존 foreground 경로를 사용한다. 다른 panel이면 `network-agent`가 daemon
수명의 작업으로 탭을 등록하고 별도 shell을 준비한 뒤 `AgentController.start`로 직접 Agent를
실행한다. Host run/restart 및 개별 Agent start/restart도 같은 직접 실행 entry를 사용한다.
중간 `.cjs`·두 번째 CLI·Host `launch` 이벤트는 없다. 준비 중 탭이 삭제되면 늦게 생성된
shell을 연결하지 않고 정리하며, 실행 실패는 원래 호출자의 결과와 대상 탭 진단에 남는다.
[Status: As-built] 근거: [[apps/daemon/src/network-agent.ts]], [[apps/daemon/src/network-agent.test.ts]],
[[apps/daemon/src/host-command.ts]], [[apps/daemon/src/agent-controller.ts]].

직접 실행도 동일한 ExecutionOwner가 vendor PTY와 부속 자원을 소유한다. 내부 binding의
`directTerminal`은 정상 직접 연결이고 `relayDisconnected`는 기존 CLI relay 손실이므로 구분한다.
Web terminal WS는 직접 실행 PTY가 준비될 때까지 접속을 대기하고 해당 PTY에 연결한다.
대기 중 Web 연결 종료는 Agent 준비를 취소하지 않는다. vendor 종료 후 runtime이 제거되면
React 앱은 기존 shell terminalId로 다시 연결하여 shell의 snapshot과 입력을 복원한다.
Host 호출 CLI는 대상별 준비 결과를 받은 뒤 반환하며 shell을 raw relay로 전환하지 않는다.
[Status: As-built] 근거: [[apps/daemon/src/daemon.ts]], [[apps/daemon/src/network-agent.test.ts]],
[[apps/cli/src/host-command.ts]].

daemon foreground 연결 소비자는 protocol의 `terminalContextFromEnv(env)`로 문맥을 읽어 daemon의
`registerRuntime({ terminalContext, createBinding, ... })`에 전달한다. daemon은 살아 있는 shell의
비밀값과 중복 연결을 검증한 뒤 기존 terminal을 차용한다. 문맥이 없으면 CLI 직접 실행 경로를
사용하고 `terminalId` 직접 지정은 Agent 소유 PTY에만 사용한다. 등록/시작 실패도 빌린 shell을
종료하지 않는다. AIOX CLI는 이 문맥을 foreground WS의 실행 요청에 포함하고 daemon 실행 owner의 vendor PTY를
중계한다. vendor 종료 후 raw mode를 복원하여 원래 shell로 돌아간다. 일반 browser attachment는
이 foreground 연결과 별개다. 구현·검증 경계는 [[docs/architecture/aiox-vendor-bindings]]를 따른다.
Claude와 Codex가 이 foreground 연결을 사용한다. [Status: As-built]

근거: [[apps/cli/src/foreground.ts]] `apps/cli/src/foreground.ts:20`,
[[apps/cli/src/foreground.test.ts]] `apps/cli/src/foreground.test.ts:1`,
[[apps/daemon/src/agent-controller.test.ts]] `apps/daemon/src/agent-controller.test.ts:151-184`.

근거: [[apps/daemon/src/terminals.ts]] `apps/daemon/src/terminals.ts:40-120`,
[[packages/protocol/src/index.ts]] `packages/protocol/src/index.ts:40-59`,
[[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:619-718`,
[[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:761-976`.

화면 중계 유실 뒤에도 같은 terminal 신원과 vendor PTY를 유지하고, 기존 다시 연결에서
해당 PTY의 snapshot·후속 출력·키보드 입력을 복원한다. vendor 정리는 PTY만
종료하는 것으로 완료하지 않고 execution owner의 부속 실행·자원과 daemon 관리 등록 정리까지
연결한다. MCP 재등록이나 새 vendor 생성은 화면 복구의 책임이 아니다. 공통 실행 수명 경계는
[[docs/architecture/aiox-vendor-bindings]]를 따른다. 조회 실패 중에도 마지막 vendor 정리 대상을
보존해 같은 버튼이 부모 shell 종료로 바뀌지 않으며 생존 여부는 확인 불가로 표시한다. [Status: As-built]

아래 `apps/web/src/main.ts`·`main.test.ts` 인용은 React 전환 전 Stage2 검증 이력이다.
해당 파일은 현재 없으며, 현재 React UI와 새 서버의 RPC·terminal 연결 검증은
[[logs/2026-09-09-AIOX-TUI-Stage6-Web]]의 W10이 소유한다.

근거: [[apps/web/src/attach.ts]] `apps/web/src/attach.ts:42-67`, `apps/web/src/main.ts`
`apps/web/src/main.ts:96-195`, `apps/web/src/main.ts:433-499`, `apps/web/src/main.test.ts`
`apps/web/src/main.test.ts:864`; [[apps/daemon/src/agent-controller.test.ts]]
`apps/daemon/src/agent-controller.test.ts:1722-1889`.
macOS에서 built daemon/Web·SQLite·실제 PTY·Chromium으로 같은 terminal/Runtime을 유지한
화면 복구를 확인했다. 중계 공백 중 출력의 snapshot 복원, 후속 live 출력과 키보드 입력,
vendor 1회 생성, helper·자원 정리와 부모 shell 생존을 확인했다. vendor는 Node 대역이며
CLI relay는 실제 foreground source를 사용하되 인자 parsing을 생략했고 종료 confirm은 대역이다.
실제 Claude/Codex나 다른 OS 검증으로 확대하지 않는다.

Stage 2-1 구현은 세션당 xterm headless로 화면 상태를 유지하고, 통합 attachment가 snapshot과 이후 출력·resize·exit의 순서를 소유한다. SerializeAddon의 화면 바이트와 누락 상태 보완을 함께 전달하며 브라우저는 snapshot 크기에서 파싱과 상태 적용을 마친 뒤 실시간 이벤트를 처리한다. pane 크기 변경은 서버에 요청하고 서버의 resize 이벤트 순서에 따라 적용한다. 새 foreground 실행은 초기 PTY listener로 첫 출력부터 전달하므로 Web snapshot을 재생하지 않는다. 운영 Web의 탭·분할 배치 복귀는 별도 통합 대상이다. [Status: As-built]

복원 책임은 다음 순서로 연결된다. 화면 캡처와 live 구독을 호출자가 따로 조합하지 않고 세션의 attachment가 경계를 소유한다. [Status: As-built]

```text
PTY 출력 → 미러 제출 FIFO → 해당 시점까지 파싱 완료 → snapshot + 보류 tail
                                                    → 이후 출력·resize·exit
Web 접속 → snapshot 크기 적용 → 화면 바이트 파싱 → 누락 상태 적용
         → 보류 tail → live 연결 → 현재 pane 크기 요청
```

근거: [[packages/terminal/src/index.ts]] `packages/terminal/src/index.ts:288-363`,
[[apps/daemon/src/terminals.ts]] `apps/daemon/src/terminals.ts:281-366`,
[[apps/web/src/attach.ts]] `apps/web/src/attach.ts:155-263`.

SerializeAddon이 생략한 상태는 같은 snapshot의 보완 데이터로 전달한다. 저장 커서·문자 속성·문자 집합·스크롤 영역·탭 위치·마우스 인코딩·커서 표시뿐 아니라 프로그램이 변경한 줄바꿈 모드와 커서 깜빡임도 복원한다. 미러와 Web의 초기 커서 깜빡임은 모두 켜짐으로 맞추고, 이후 프로그램의 모드 변경을 따른다. 셀 읽기·패치에는 독립 작업 셀을 사용하며 xterm이 erase에 사용하는 공유 빈 셀을 변경하지 않는다. [Status: As-built]

근거: [[packages/terminal/src/serialization.ts]] `packages/terminal/src/serialization.ts:97-161`,
[[packages/terminal/src/restore.ts]] `packages/terminal/src/restore.ts:109-228`,
[[packages/terminal/src/serialization.test.ts]] `packages/terminal/src/serialization.test.ts:45-82`의 모드 왕복 및 `packages/terminal/src/serialization.test.ts:504-537`의 snapshot 이후 erase 회귀 검사.

미러의 출력 제출 FIFO와 파싱 완료 대기는 분리한다. 연속 출력은 청크마다 파싱 타이머를 기다리지 않고 순서대로 제출하되, snapshot·resize·dispose는 앞선 파싱 완료를 기다린다. 세션 소유자는 실제 PTY exit 뒤 대기 중인 복원과 출력 처리가 끝난 다음 미러를 dispose한다. 브라우저 detach는 이 정리의 계기가 아니다. [Status: As-built]

native PTY에서 읽었지만 미러 처리가 끝나지 않은 출력이 1 MiB 이상이면 읽기를 pause하고, 512 KiB 이하로 줄면 resume한다. 이는 미완성 시퀀스 복원 tail의 1 MiB·1,024개 이벤트 제한과 별도이며, 느린 Web 연결의 출력 누적 제한·재접속 계약은 [[docs/specs/aiox-configuration-web]]를 따른다. [Status: As-built]

복원 상태에는 각 버퍼의 baseY를 포함한다. 재생 후 대상 baseY가 다르면 저장 커서와 hidden/styled 셀·링크의 절대 행 번호를 적용하기 전에 거절한다. 스크롤백 용량이 달라도 실제 히스토리가 동일하면 허용하며, 잘린 히스토리에 저장 커서만 재배치해 성공으로 처리하지 않는다. [Status: As-built]

근거: 제출·파싱 경계는 [[packages/terminal/src/boundary.ts]] `packages/terminal/src/boundary.ts:69-112`, `packages/terminal/src/boundary.ts:186-224`; 세션 정리는 [[apps/daemon/src/terminals.ts]] `apps/daemon/src/terminals.ts:122-134`, [[packages/terminal/src/index.ts]] `packages/terminal/src/index.ts:384-389`; PTY pause/resume 검증은 [[packages/terminal/src/index.test.ts]] `packages/terminal/src/index.test.ts:527-587`; 히스토리 차이 거절과 용량 차이 허용은 [[packages/terminal/src/serialization.test.ts]] `packages/terminal/src/serialization.test.ts:45-99`.

terminal 패키지의 ESM 빌드는 CJS인 `@xterm/headless`만 번들에 포함해 배포 실행의 import 호환성을 유지한다. native `node-pty`는 외부 의존성으로 둔다. [Status: As-built] 근거: [[tsup.config.ts]] `tsup.config.ts:16-20`.

PTY 경계는 raw byte 출력을 WebSocket binary 출력으로 전달하고 JSON 제어 프레임과 구분한다.

Web 터미널 키 입력은 [[apps/web/src/terminal-keybindings.ts]]에서 브라우저 OS별 기본값에 `terminal.keybindings`의 사용자 변경분을 우선 적용한다. [[apps/web/src/attach.ts]]의 xterm custom key handler는 일치한 keydown만 `term.input(sequence, true)`로 전달하고 xterm의 중복 처리를 막는다. 기존 onData의 연결·복원 상태 검사와 사용자 입력 전송 경로를 그대로 거친다. xterm 6은 custom handler를 조합 처리보다 먼저 호출하므로, 매핑된 키는 기존 CompositionHelper.keydown을 먼저 거쳐 조합 중/종료 대기 문자를 확정한 뒤 보낸다. 별도 조합 버퍼나 확정 타이머를 만들지 않는다. IME 문자 키(keyCode 229)·AltGraph·미지정 키는 xterm 인코딩 경로에 남긴다. 클립보드 단축키는 아래 우선 처리 경로를 따른다. private CompositionHelper 경계는 실제 xterm을 사용하는 회귀 테스트로 검증한다. ConnectedTerminal은 최신 config를 getter로 제공하므로 설정을 읽은 뒤 attachment를 다시 만들 필요가 없다. 서버는 설정 검증·전달과 입력 바이트의 PTY 전달을 담당하며 shell의 bindkey/readline 설정을 변경하지 않는다. 기본값·변경분 저장 계약은 [[docs/specs/aiox-configuration-web]]을 따른다. [Status: As-built]

클립보드 단축키는 custom key handler에서 입력 매핑보다 먼저 판단한다. OS별 붙여넣기 키와
선택이 있는 복사 키의 xterm 인코딩을 중단하되 브라우저 기본 동작은 취소하지 않는다.
소비한 키의 release도 처리해 modifier를 먼저 떼거나 선택이 사라진 뒤 Kitty keyup이 새지 않게 한다.
macOS 복사 키는 선택이 없어도 브라우저 소유로 남긴다. Kitty가 인코딩하면 그 경로의
`preventDefault()`가 native 복사까지 취소하기 때문이다. xterm 선택은 DOM 선택을 만들지 않아
브라우저가 복사 명령을 비활성으로 보므로, 선택이 있을 때 host의 `beforecopy`를 취소해 복사
명령을 청구한다. 이어지는 DOM `copy`
이벤트에서 [[apps/web/src/terminal-clipboard.ts]]의 SerializeAddon이 선택 영역 HTML을 만들고,
선택 텍스트와 함께 ClipboardEvent에 기록한다. 복사는 Web attachment 안에서 끝나며
daemon/PTY를 거치지 않는다. DOM `paste` 이벤트는 기존 xterm 핸들러가 줄바꿈 정규화와
bracketed paste를 적용한 뒤 기존 사용자 입력 경로로 전달한다. 근거: `apps/web/src/terminal-clipboard.ts:9-145`,
[[apps/web/src/terminal-keybindings.ts]] `apps/web/src/terminal-keybindings.ts:8-28`,
[[apps/web/src/terminal-clipboard.test.ts]] `apps/web/src/terminal-clipboard.test.ts:12-178`. [Status: As-built]

마우스를 추적하는 TUI 화면의 선택 유지는 미해결이다. DECSET 1003·1006이 켜진 상태에서
선택 뒤 포인터를 한 번 움직이면 `ESC[<35;5;2M` 보고가 사용자 입력으로 전달되며 선택이
사라지는 것을 실제 브라우저 테스트로 측정했다. xterm은 같은 상태에서 selection service를
끄기도 한다. `mouseEventsRequireAlt`로 포인터 보고에 Alt를 요구하면 선택은 유지되지만
TUI의 포인터 조작이 `Option` 없이는 닫히므로 적용하지 않는다. 같은 복사 조작이 vendor
TUI 자체와 다른 터미널 래퍼에서도 간헐적으로만 성공하는 것이 관측되어, 원인을 이 경계로
단정하지 않는다. 사용자 계약은 [[docs/specs/aiox-configuration-web]]이 소유한다.
[Status: Current gap]

이미지 붙여넣기는 host의 capture `paste` listener가 xterm보다 먼저 clipboard의 이미지
File을 읽는다. Web은 `POST /api/terminals/:terminalId/images`에 `{mediaType, data}` JSON을
보내며 data는 base64다. [[apps/daemon/src/terminal-images.ts]]는 활성 terminal과 daemon 상태,
10 MiB 크기·base64·MIME과 파일 signature 일치를 검사하고 사용자 홈의 `.aiox/attachments/`에
서버가 생성한 이름으로 저장한다. 성공 응답 `{path}`는 서버 파일의 절대경로다.
디렉토리와 파일은 각각 0700·0600으로 생성하며, 저장 중 terminal이 사라지거나 shutdown이
시작하면 파일을 정리하고 실패를 반환한다. 파일 내용 전체를 디코딩하는 검증은 하지 않는다.
재개한 대화의 참조를 깨지 않도록 terminal 종료 시 삭제하지 않으며 기존 메시지 retention의
자동 삭제 대상도 아니다. 근거: `apps/daemon/src/terminal-images.ts:15-76`,
[[apps/daemon/src/http.ts]] `apps/daemon/src/http.ts:277-291`,
[[apps/daemon/src/terminal-images.test.ts]] `apps/daemon/src/terminal-images.test.ts:43-133`. [Status: As-built]

Web은 저장 성공한 각 경로를 `term.paste`로 삽입한다. 여러 경로를 한 문자열로 합치지
않아 TUI가 각 이미지를 첨부할 수 있게 한다. 이미지 업로드 동안에도 일반 입력을 유지하며
이미지 전용 상태 UI나 입력 잠금을 두지 않는다. attachment dispose는 업로드를 abort하고
완료된 요청도 연결 상태를 재검사한 뒤에만 입력한다. 실패는 attachment 상태 보고로
터미널 상태 줄에 사유를 알리며 실패한 파일 경로를 입력하지 않는다. 이미지가 아닌
clipboard 파일도 조용히 버리지 않고 같은 경로로 사유를 알린다. 근거: clipboard 구현과 테스트. [Status: As-built]

Kitty의 모든 키 보고 모드에서 modifier만 눌러도 선택이 지워지던 xterm 동작은
[[patches/@xterm__xterm@6.1.0-beta.304.patch]]로 보정한다. modifier의 press/release 바이트는
계속 생성하되 기존 Win32 모드와 같이 선택을 지우는 사용자 입력 알림을 발생시키지 않는다.
attachment는 이 out-of-parser 이벤트를 response 프레임으로 보내고 daemon은 PTY에 전달한다.
modifier만으로 응답 소유권을 바꾸지는 않으며 다음 일반 입력이 기존 소유권 경로를 따른다.
근거: `patches/@xterm__xterm@6.1.0-beta.304.patch:22-43`, [[apps/web/src/attach.ts]]
`apps/web/src/attach.ts:387-401`, [[apps/daemon/src/terminals.ts]]
`apps/daemon/src/terminals.ts:378-388`. [Status: As-built]

Web과 headless 미러는 `vtExtensions.kittyKeyboard`를 켜고 앱의 지원 조회·모드 변경을
xterm 파서에 맡긴다. 현재 의존성은 Web `6.1.0-beta.304`, headless `6.1.0-beta.303`으로
고정돼 있다. SerializeAddon 화면 바이트만으로는 Kitty 상태가 복원되지 않으므로 snapshot
보완 상태에 현재 flags와 normal/alternate 스택을 포함한다. 저장 커서의 G 문자 집합 목록도
함께 보존하며, 복원 시 보완 상태를 검증·적용한 다음 후속 출력과 키 입력을 처리한다.
근거: [[apps/web/package.json]] `apps/web/package.json:26-28`, [[packages/terminal/package.json]]
`packages/terminal/package.json:22-24`, [[apps/web/src/attach.ts]] `apps/web/src/attach.ts:71-81`,
[[packages/terminal/src/index.ts]] `packages/terminal/src/index.ts:196-204`,
[[packages/terminal/src/serialization.ts]] `packages/terminal/src/serialization.ts:92-103`,
`packages/terminal/src/serialization.ts:150-158`, [[packages/terminal/src/restore.ts]]
`packages/terminal/src/restore.ts:233-240`, [[packages/terminal/src/serialization.test.ts]]
`packages/terminal/src/serialization.test.ts:45-81`. [Status: As-built]

근거: [[packages/terminal/src/index.ts]], [[packages/terminal/src/boundary.ts]], [[packages/terminal/src/serialization.ts]], [[packages/terminal/src/restore.ts]], [[apps/web/src/attach.ts]], [[apps/daemon/src/terminals.test.ts]].

```text
Vendor TUI ↔ 서버 소유 PTY / 현재 화면
                         ↕ attachment
                     Web xterm renderer

Web close → attachment 해제 → 같은 Runtime/PTY 실행 지속
재방문    → 살아 있는 daemon 자동 연결 → snapshot / 기존 terminal 현재 화면
          → pane 배치·미확인 알림 복원
```

탭 close/unmount/WS disconnect를 agent.stop이나 terminal.stop으로 연결하지 않는다.
작업 중·완료·승인 대기·idle 모두 같은 터미널의 계속 갱신된 현재 화면으로 돌아온다.
재방문 때 로그인·token 수동 입력을 추가하지 않는다. 내부 연결 보호 수단은 이 UX를 충족하도록
정하며 기존 메모리 credential 제약을 사용자 인증 절차 요구로 바꾸지 않는다.

단순 WS reconnect만으로 현재 화면이 복원되지는 않는다. 서버 미러와 복원 경계가 이 책임을 맡는다.
미완성 입력의 보관 한도와 복원 거절·회복 동작은 [[docs/specs/aiox-configuration-web]]를 따른다.
terminal headless는 제외한 LLM headless와 다르며, 무제한 raw output을 보관하지 않는다.
화면 snapshot과 후속 stream 연결이 일관되도록 구현하며 pane 이동은 routing을 바꾸지 않는다.
범위는 서버가 살아 있는 동안의 복귀다. daemon 재시작 뒤 외부 프로세스 자동 재attach/실행이나
durable message replay까지 약속하지 않는다.

미러 쓰기 실패는 세션의 오류로 보존하고 이후 snapshot을 거절한다. 실패한 attachment만
해제하며 PTY와 기존 live 출력 수명은 유지한다. terminal 계층이 보존된 미러 오류 유무로
복원 불가를 판정하고 daemon은 확인된 경우에만 오류 프레임에 `restorable: false`를 전달한다.
Web은 오류 원문과 이 분류를 함께 소비하며, 분류가 없는 연결 실패에는 재연결 시도를 제공한다.
이는 재연결 성공 보장이 아니다. [Status: As-built]

근거: [[packages/terminal/src/index.ts]] `packages/terminal/src/index.ts:145-151`,
`packages/terminal/src/index.ts:298-307`, `packages/terminal/src/index.ts:336-337`;
[[apps/daemon/src/terminals.ts]] `apps/daemon/src/terminals.ts:357-365`,
[[apps/web/src/attach.ts]] `apps/web/src/attach.ts:139-149`, `apps/web/src/attach.ts:264-269`.
PTY 대역과 실제 headless 미러 쓰기 실패 회귀는 [[packages/terminal/src/index.test.ts]]
`packages/terminal/src/index.test.ts:625-685`, 오류 프레임 전달 회귀는
[[apps/daemon/src/terminals.test.ts]] `apps/daemon/src/terminals.test.ts:1243-1267`이다.

## 관측에서 알림까지

메시지 처리 완료와 Web 변경 통지는 서로 다른 경계다. 발신 terminal ID는 send의 첫 await
전에 고정하고 실행 소유권은 Runtime 수명 동안 불변이다. 이 정보를 InFlight와 notification
row에 보존해 발신 등록 정리 뒤에도 Web 대상과 원래 terminal을 판별한다. 대상별 결과·필수
알림의 transaction이 성공한 뒤 daemon 소유 발신자의 알림 변경을 통지한다. 실시간 등록
조회로 과거 알림의 소유권을 재해석하지 않는다. [Status: As-built]

근거: [[apps/daemon/src/runtimes.ts]] `apps/daemon/src/runtimes.ts:34`,
[[apps/daemon/src/messaging.ts]] `apps/daemon/src/messaging.ts:118-137`,
`apps/daemon/src/messaging.ts:197-209`, `apps/daemon/src/messaging.ts:320-350`;
[[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:1673-1732`.

```text
Binding / hooks / process 관측
 → daemon Runtime projection / 연결 가능한 입력 관측
 → 연결된 요청 결과 + 전송 시점 관계 → 원 발신자에게 daemon 메시지
 → 결과·필수 알림 저장 → Web 대상 변경 통지
 → Web 전용 최신 목록 조회
 → 브라우저 창·탭 활성과 선택 terminal 판정
 → 미확인 목록 projection·읽음 저장 / Web 표시 (소리는 후속)
```

승인·질문·리밋·중단은 Runtime/Web 알림 대상이며 사용자 직접 작업에서도 발생한다. 특정
delivery 실패로 귀속하려면 입력 연결 근거가 있어야 한다. 일반 vendor 도구 오류를 모두 AIOX
오류로 만들지 않는다. 입력 수락·응답 종료·Agent send 응답·작업 성공은 서로 다르다.

알림 클릭은 해당 terminal 이동+읽음 처리다. 전체 확인은 현재 미확인 항목을 읽음 처리한다.
읽음은 승인이나 실제 문제 해결이 아니므로 요청이 살아 있으면 Runtime 대기 표시도 유지한다.

| 실제 사용자 상태                         | 처리                                                       |
| ---------------------------------------- | ---------------------------------------------------------- |
| 브라우저 창·탭 활성 + 해당 terminal 선택 | 팝업·소리·알림 목록 추가·미확인 표시 억제, TUI/상태는 표시 |
| 다른 terminal 선택                       | 대상 알림을 미확인 목록에 추가                             |
| background tab/window                    | 선택된 pane만으로 읽음 판정하지 않음                       |
| Web 닫힘                                 | daemon이 미확인 알림 유지, 재방문에 표시                   |

알림 projection은 terminal의 입력 포커스 대신 브라우저 창·탭 활성과 선택 terminal을
소비한다. 현재 최소 Web은 visibilityState와 document.hasFocus를 함께 확인하고 선택된
terminal의 알림 ID를 표시 projection에서 제외한 뒤 읽음 저장한다. 검색창·버튼으로 입력
포커스가 이동해도 terminal 선택은 유지한다. 대상 선택의 읽음 요청은 진행 중인 쓰기 뒤에
이어가며 그 쓰기의 후속 조회가 끝날 때까지 기다리지 않는다. 이 표시·읽음 경계는 메시지
처리 결과·필수 알림 저장과 분리한다. popup·소리는 후속 구현이다. 사용자 계약은
[[docs/specs/aiox-configuration-web]]의 알림·포커스·사용자 요청을 따른다. [Status: As-built]

근거: `apps/web/src/main.ts` `apps/web/src/main.ts:266-278`, `apps/web/src/main.ts:309-364`,
`apps/web/src/main.ts:401-428`; `apps/web/src/main.test.ts` `apps/web/src/main.test.ts:667-862`.

사용자는 운영 Web 접속·Claude 실행과 실제 브라우저 창/탭 전환에 따른 알림 표시·읽음 처리를 확인했다고 보고했다. 이는 해당 사용 흐름의 사용자 실측 근거이며 agent의 재실행 결과가 아니다. OS·WSL 구성, 브라우저/vendor 버전과 실행 SHA는 특정되지 않아 모든 환경의 통합 인증으로 확대하지 않는다. Sources: `logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md`의 2026-09-14 「W7 참조·관측 이유 표시 완료, 사용자 실측 수용과 Stage2-3 마감」.

짧은 시간의 여러 알림은 항목을 남기고 소리를 묶는 방향이다. 묶음 시간, 같은 요청의 반복
알림 갱신, multi-tab 단일 재생 주체는 구현 제안이며 정확한 수단은 미결이다. Web Audio는
후보이고 autoplay를 위한 사용자 활성화 UX를 고려한다. Web이 닫힌 상태의 native OS 알림음을
추가 요구로 만들지 않는다.

## Web 상태와 라이브러리

daemon의 `AppState`는 저장된 Host·Network·panel·notification과 live registry를 합성한 Web application projection을 소유한다. daemon 시작 때 전체 snapshot을 한 번 만들고, 이후 producer가 commit 또는 live-state 변경 뒤 바뀐 resource ID를 알린다. 저장 대상은 해당 ID만 다시 읽고 live 변경은 영향을 받는 DTO만 다시 투영한다. 실제 값이 바뀐 DTO만 검증해 공개하며, 구독자가 없어도 projection은 갱신된다.

변경은 하나의 Effect semaphore로 직렬화한다. Subscription 등록과 초기 snapshot 캡처도 같은 lock을 사용해 이후 변경이 누락되지 않게 한다. 현재 서버는 Effect RPC WebSocket을 `/api/rpc`에서 제공한다. snapshot event는 epoch와 version을 포함하고, 이어지는 delta는 같은 epoch의 증가하는 version을 사용한다. 각 subscriber queue는 256 event로 제한되며, 느린 subscriber는 `slow_consumer`로 분리되어 reconnect 시 최신 snapshot부터 이어간다. 한 subscriber가 밀려도 다른 subscriber와 producer는 진행한다. commit 뒤 projection 실패는 구독을 실패시키고, recovery는 저장소에서 projection을 다시 만들도록 제한 횟수로 재시도한다. Terminal 화면 바이트는 application state가 아니라 terminal WebSocket을 통해 흐른다.

RPC server와 projection 및 React 앱의 TanStack DB 상태 저장소는 연결됐다. 저장소의 상태 소유·명령 projection은 [[docs/architecture/aiox-system]]을 따른다. 제품 화면은 저장소의 실제 배치·실행 상태와 알림을 소비한다. 운영 WorkspaceContent는 terminalId/runtimeId로 TerminalSurface를 식별하고 ConnectedTerminal이 기존 attachTerminal을 React 수명에 연결한다. pane 이동은 같은 portal·xterm·WS를 유지하며, 숨김·workspace 이탈·실행 교체는 브라우저 attachment만 정리한다. 복원과 ACK·응답 권한 처리는 attach.ts가 소유하고 React에서 복제하지 않는다. 크기는 실제 host의 양수 geometry만 요청하며 xterm resize는 서버 순서를 따른다. 복원 시 포커스는 현재 활성 pane에 한정한다. 연결·복원 실패 원인은 개별 terminal 상태로 표시하고, 재연결 중 원인을 유지하며 restorable:false는 재연결을 막는다. HTTP/HTTPS origin에 따라 ws/wss를 선택하고 개발 proxy도 같은 terminal 경로를 전달한다. 근거는 [[apps/web/src/pages/workspace/connected-terminal.tsx]], [[apps/web/src/pages/workspace/connected-terminal.test.tsx]], [[apps/web/src/pages/workspace/terminal-surface.test.tsx]], [[apps/web/src/attach.test.ts]], [[apps/web/vite.config.test.ts]]다. 앞선 Stage 2 Web의 TypeScript/Vite/xterm client와 HTTP polling·이벤트 갱신 및 W5의 HTTP/WebSocket 대역 검증은 역사 기록이며, 실제 daemon·PTY·vendor 생존 검증은 아니었다. 해당 검증의 재개·정정 기록은 `logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md`의 “W5 결과 수용과 검증 정정·W6 재개 지점”에 있다. 운영 Web은 React·Tailwind·shadcn/ui를 사용하고 영어 UI를 유지한다. 공개 사이트는 현재 구현 범위에 포함하지 않으며, 후속 범위와 framework 선택은 [[docs/product/roadmap]]을 따른다. Zustand/TanStack Query는 실제 shared state/cache 요구가 생길 때만 평가한다.

근거: [[apps/daemon/src/app-state.ts]] `apps/daemon/src/app-state.ts:71-76`, `apps/daemon/src/app-state.ts:248-285`, `apps/daemon/src/app-state.ts:509-533`; RPC endpoint는 [[apps/daemon/src/application-rpc.ts]] `apps/daemon/src/application-rpc.ts:272-277`. Snapshot·version·slow consumer·recovery는 [[apps/daemon/src/app-state.test.ts]] `apps/daemon/src/app-state.test.ts:84-180`, 실 RPC subscriber와 reconnect는 [[apps/daemon/src/application-rpc.test.ts]] `apps/daemon/src/application-rpc.test.ts:33-69`, `apps/daemon/src/application-rpc.test.ts:195-280`에서 검증한다.

배경색은 Web의 `terminal-theme.ts`가 xterm 6 ThemeService의 실제 색 변경을 구독해
24px 여백에 전달한다. 명시 config 배경색은 shell OSC 변경보다 우선한다. 이 구독은
attachment 종료 때 해제한다. headless mirror는 renderer가 없으므로 시작 시 파싱된
OSC 배경색 이벤트를 관측하고, serialization이 마지막 지정색 또는 초기화 시퀀스를
복원 바이트 앞에 넣는다. snapshot의 기존 FIFO·미완성 입력 경계는 유지한다.
근거: [[apps/web/src/terminal-theme.ts]], [[apps/web/src/terminal-theme.test.ts]],
[[packages/terminal/src/serialization.ts]], [[packages/terminal/src/serialization.test.ts]].

Persistent Network의 일반 panel은 Network ID를 panel ID로 사용한다. SQLite의 Network 생성·삭제
transaction이 panel도 함께 저장·제거하며, tab이 남아 있는 Network 삭제는 거절한다.
Network producer 통지를 받은 AppState는 Network와 해당 panel만 조회해 같은 delta에 반영한다.
Host 소유 panel과 독립 Network panel은 별개이며, Host 삭제는 독립 Network panel을 제거하지 않는다.
근거: [[packages/persistence/src/sqlite/database.ts]], [[packages/persistence/src/sqlite/database.test.ts]],
[[apps/daemon/src/app-state.ts]], [[apps/daemon/src/app-state.test.ts]].

## 대기 shell의 정상 종료 연동

일반 종료 계약은 [[docs/specs/aiox-runtime]]이 소유한다. daemon은 admission과 기존 Web 입력을
같은 종료 시도에 묶고 비동기 검사 전에 시도를 게시해 동시 stop을 직렬화한다. TerminalService는
살아 있는 세션의 종료 가능 여부를 모으며, PTY 계층의 shell 연동이 대기·남은 작업을 판정하고
실제 exit를 확인한다. vendor PTY에는 일반 shell 연동을 주입하지 않는다. [Status: As-built]

POSIX 연동은 임시 startup 파일을 통해 기존 사용자 설정을 읽고, shell hook이 요청 시 대기 상태와
job을 확인한다. 프로세스 조회는 disown한 자식의 추가 blocker이며 idle의 증거로 단독 사용하지
않는다. 일반 종료도 shell 측에서 재판정하고 exit를 요청하며 TERM/KILL로 바꾸지 않는다.
임시 연동 자원은 세션 종료 뒤 정리한다. 기존 hook과 충돌하거나 응답이 없으면 unknown으로
보존한다. 근거: [[packages/terminal/src/shell-integration.ts]], [[packages/terminal/src/index.ts]],
[[apps/daemon/src/terminals.ts]], [[apps/daemon/src/daemon.ts]]. [Status: As-built]

macOS zsh/bash 실제 18개 테스트와 Linux Bash5.2.37/Zsh5.9/Fish4.0.2의 PTY 22개 시나리오를 검증했다.
Linux 결과는 분리된 shell 연동 모듈 범위이며 전체 daemon/CLI 검증은 아니다. macOS 빌드 CLI에서는
출력·cd·Enter 전 문자열이 있는 대기 shell 정상 종료와 vim 실행 중 일반 stop 거절·force 후 실제
프로세스 종료를 확인했다. 상세 근거와 후속 재개점은 Stage2-2 후속 W7/W9가 소유한다.
과거 Windows 실측은 당시 구현과 종료 정책의 근거로만 보존하며 현재 지원 범위에 포함하지 않는다.
당시 Windows 일반 stop·force 각각에서 shell PTY child/grandchild와 별도 외부 owner의
foreground/helper 트리 종료를 확인했다. 외부 owner 종료는 당시 잘못 확장된 정책의 관측이며
현재 외부 생존 계약의 검증으로 사용하지 않는다. PSReadLine2.4.5 Windows CI 및 CMD 반례는
Stage2-2 로그에 당시 정책의 검증으로 남아 있다.
최신 소유권 범위와 수정 검증은 [[docs/specs/aiox-runtime]] 및 Stage2-3 W1을 따른다.
외부 실행은 실제 runExternal·WebSocket·ExecutionOwner 경로와 대역 vendor를 사용했으므로
실제 Claude/Codex 통합이나 임의 프로세스 트리 전체에 대한 보장으로 확대하지 않는다.

공통 terminal.shell/args/cwd는 새 일반 shell 생성에만 적용하고 vendor 실행 구성과 분리한다.
config의 resolveTerminalLaunch가 기본값·요청 override·실행 파일 탐색과 cwd 검증을 소유한다.
bootstrap은 DB 준비 전에 검증하고, 새 shell 생성은 파일을 다시 읽어 검증한 뒤 admission을
재확인한다. TerminalService는 필수 실행 값을 받아 PTY를 생성하며 설정을 다시 해석하지 않는다.
최종 cwd의 디렉터리·접근 여부를 검증하고 확인된 cwd 실패에 필드 근거를 붙인다.
HTTP 분류 계약은 configuration/Web spec이 소유한다.
근거: [[packages/config/src/terminal.ts]]와 colocated tests,
[[apps/daemon/src/bootstrap.test.ts]], [[apps/daemon/src/terminals.test.ts]]. [Status: As-built]
설정 watch·현재 경로 polling·부모 shell 추적은 추가하지 않는다.
계약은 [[docs/specs/aiox-configuration-web]]을 따른다.

현재 지원 범위에서 제외된 과거 Windows 사용자 실측으로 cmd/PowerShell 입출력·cwd·재연결, Windows daemon에서 WSL2 Ubuntu의
사용자·cwd 선택, 잘못된 배포판·사용자·cwd 및 Linux 권한 거부, 설정 오류 시 기존 실행 유지와
복구 후 새 생성을 확인했다. Windows cwd 조회 거부 ACL에서는 Node child의 cwd 사용이 성공했으므로
cwd 사용 거부는 미재현이며 실행 파일 ACL도 사전 보장 범위 밖이다. 최종 `8c2fbd7`의
[CI](https://github.com/lunaxislu/aiox-prototype/actions/runs/34685159507)는 Windows/Linux/macOS × Node22/24에서
통과했지만 실제 WSL 배포판 검사는 CI가 아닌 사용자 실측 근거다.
Sources: `logs/2026-09-11-AIOX-TUI-Stage2-2-Execution-Ownership.md`의 Windows 실측·오류 분류 보완과 최종 CI entry.

### 외부 실행 생존 교정 검증

Stage2-3 W1 교정은 root가 code agent의 전체 pnpm check 종료 코드 0과 479 tests 통과 원문을
확인하고, macOS에서 별도 OS owner·대역 vendor를 사용하는 실제 daemon 일반 stop/force를
검증했다. 두 경우 협업 등록과 MCP listener는 종료됐고 vendor의 후속 입력·출력과 자연 종료 후
owner 자원 정리를 확인했다. built daemon과 현재 source를 별도 bundle한 runExternal 경로의
검증이며 실제 Claude/Codex 및 Windows/Linux/WSL 실OS 재검증은 아니다. 플랫폼 분기는
대역 회귀로 확인했다. 이번 수정의 CI·push는 수행하지 않았다.
Sources: `logs/2026-09-12-AIOX-W1-External-Execution-Survival.md`의 root 결과 수용 entry.

## Host·panel 저장 모델 [Status: Target]

외부 DTO는 [[docs/specs/aiox-host]]의 Host HTTP, [[docs/specs/aiox-configuration-web]]의 Panel
HTTP가 소유한다. 다음은 첫 배포 전 현재 schema를 직접 설계할 때의 논리 테이블 계약이다.
SQL 이름은 아래 snake_case를 사용하고 JSON 열은 TEXT에 protocol schema로 검증한 값을 저장한다.
Drizzle query는 Effect SQLite client를 사용하며 저장 mutation은 Effect-backed SQLite transaction에서 실행한다. JSON payload는 Drizzle의 typed text column으로 저장하고, persistence 경계에서 명시적으로 직렬화·복원하며 SQLite `json_valid` constraint로 검증한다. 근거: [[packages/persistence/src/sqlite/host-schema.ts]] `packages/persistence/src/sqlite/host-schema.ts:138-176`, [[packages/persistence/src/sqlite/host-state.ts]] `packages/persistence/src/sqlite/host-state.ts:138-168`.

JSON 안의 참조는 같은 transaction에서
검증하며 별도 ORM entity를 pane마다 만드는 요구는 없다.

```text
Host (h1; 선언 출처·적용 구성)
├─ ManagedAgent (h1, reviewer; 탭 없이도 존재)
│  └─ 현재 Runtime r1 [memory] → vendor owner/binding/token
│     └─ 차용 terminal t1 [memory; shell] ← tab1
├─ 전용 Host Network n1 → key 기반 적용 membership/route → live Runtime edge
└─ 소유 panel p1 → split tree → pane1 → tab1 → terminal t1
일반 workspace panel → 같은 pane/tab/terminal 모델 (Host·Agent 없음)
```

| 테이블 / primary key                          | 필수 열·제약                                                                                                                                           | 쓰기·삭제·복원                                                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hosts` / `id`                                | `name UNIQUE`, `directory`, `source_file`, `instruction`, `revision`, `created_at`; 문자열 NOT NULL                                                    | run의 검증 후 생성, 전체 restart 갱신. delete 최종 commit에서 삭제                                                                                                                                    |
| `host_agents` / `(host_id,agent_key)`         | Host FK, `ordinal`, `adapter`, `role?`, `description?`, `instruction`, `args_json`, `last_terminal_id?`, `last_exit_json?`; ordinal은 Host 안에서 유일 | 적용된 관리 구성. 개별 start/restart는 대상만, 전체 restart는 증감 반영. 탭 닫기로 삭제 안 함                                                                                                         |
| `host_networks` / `id`                        | `host_id UNIQUE` FK, `name`, `default_policy` allow/deny                                                                                               | Host 생성·전체 restart 적용; stop 보존, Host delete 연동                                                                                                                                              |
| `host_members` / `(network_id,agent_key)`     | 같은 Host 관리 Agent를 참조                                                                                                                            | 적용 YAML membership, 실행 유무와 독립                                                                                                                                                                |
| `host_edges` / `(network_id,from_key,to_key)` | `manifest_policy?`, `override_policy?`; 둘 다 null 금지·self 금지·membership 참조                                                                      | reset은 override만 null; 둘 다 없으면 행 삭제. 개별 적용은 incident edge만, 전체 적용은 override 제거                                                                                                 |
| `panels` / `id`                               | `kind`, `name`, `host_id? UNIQUE`, `network_id?`, `revision`, `layout_json`                                                                            | 배치의 단일 권위. Host 생성과 panel 생성 함께 commit. panel 명령은 바뀐 열만 갱신하고 revision은 변경 번호로 1 증가. Host restart는 최신 panel에 적용한 결과를 다시 삽입. 소유 자원 종료 확인 후 삭제 |
| `panel_tabs` / `id`                           | `panel_id` FK, `terminal_id? UNIQUE`, `label`, `agent_key?`, `presentation`, `notice_json?`                                                            | tab 참조·안내 표시 지속. shell tab은 terminal 없이 preparing으로 먼저 등록하고 준비 뒤 terminal만 연결. 바뀐 tab 행만 갱신하고 close는 종료 확인 후 삭제                                              |
| `deleted_ids` / `id`                          | `kind` panel/tab                                                                                                                                       | 삭제된 panel·tab ID의 재사용 거절. 자동 삭제하지 않음                                                                                                                                                 |
| `host_executions` / `runtime_id`              | `host_id`, `agent_key`, `terminal_id`, `started_at`, `ended_at?`, `exit_json?`                                                                         | 실행 이력. live credential/binding/status는 저장하지 않음                                                                                                                                             |

`?` 열은 실제 부재 의미의 nullable이다. 과거 행 호환용 nullable/legacy fallback이 아니다.
host_executions의 Host/terminal ID는 삭제 후 이력을 위해 값만 보존하고 live FK로 삭제를 막지
않는다. 종료 이력은 종료 후 messages.retentionDays 정책으로 정리한다. 관리 구성·배치는 기간 정리
대상이 아니다. 명령 결과·진행 기록은 저장하지 않는다. Web 명령의 순번·재전송 결과와 Host 명령의
진행·최근 결과, 미정리 프로세스는 daemon 메모리가 소유하며 daemon 재시작 뒤 이어지지 않는다.
삭제된 panel·tab ID만 `deleted_ids`에 남아 재시작 뒤에도 옛 생성 요청이 객체를 되살리지 못한다.
request hash는 공개 실행 입력의 canonical 값으로 계산하고 terminal token/env를 저장하지 않는다.
재시도 요청도 현재 접속·terminal 인증을 검사한다.

Host YAML의 전체 원문을 별도 권위로 복제하지 않는다. 적용 instruction/args·membership·route는
위 모델에서 복원하고 미적용 파일 편집 여부를 자동 감시하거나 현재 적용으로 표시하지 않는다.
Host route는 관리 key로 보존하며 live Runtime edge projection만 실행마다 교체한다.
기존 persistent_routes는 Runtime ID 기반이며 기존 종료 정리를 유지한다.

### transaction과 실행의 경계

검증된 입력을 고정한 뒤 Host별 제어를 직렬화한다. 같은 Host의 진행 중 제어 요청은 409
host_busy, unrelated Host는 진행할 수 있다. panel 쓰기는 호출자가 읽은 revision을 비교하지 않고
`applyPanel`/`mutatePanel`이 transaction 안에서 최신 panel을 읽어 변경을 적용한 뒤 바뀐 행만 쓴다.
`applyPanel`은 같은 transaction에서 panel 생성·변경·삭제를 모두 처리하므로 Web 명령 하나의 여러
변경이 한 번에 commit되거나 전부 거절된다. shell·Agent 연결도 이 경로다. Host restart는 자기 transaction 안에서 읽은 최신 panel에 탭
제거·추가를 적용하지만 Host 교체와 함께 panel·tab 행을 다시 삽입한다. 어느 쪽도 호출자가 이전에
읽은 배치로 덮어쓰지 않는다.
Web의 탭·panel 제거는 배치 commit이 결과이고 terminal 종료는 그 뒤 daemon의 정리 registry가
맡는다. Host stop/delete는 반대로 실제 종료 확인 뒤에만 적용 구성·panel을 지운다. 진행 중 Host
명령과의 충돌은 같은 Host 명령과 그 대상 Agent 탭 닫기만 거절한다.

DB transaction 안에서 OS 프로세스가 rollback된다고 가정하지 않는다. 등록 commit → 실행/관측 →
필요한 적용 구성·표시·이력 commit → 상태 공개 순서로 진행한다. 실행/저장 실패는 이번 시도가
확보한 자원만 보상하고 실제 종료 확인과 보상 실패를 명령 결과의 대상 오류나 정리 registry에 남긴다. 기존 사용자 shell은 보상 대상으로 취급하지 않는다. 기존 Runtime을 이미 종료한 뒤의
restart 실패는 이전 실행을 자동 되살리거나 사전 실패처럼 보존됐다고 보고하지 않는다.
자원 변경 뒤 DB 쓰기 실패 시 live handle·미저장 결과를 daemon이 보존하여 명시 재시도로
저장을 마무리한다. 조회 오류를 빈 Host/panel로 바꾸지 않는다.

브라우저 재접속은 저장된 배치/안내와 live registry를 합성해 복원한다. daemon 재시작은 별개다.
시작 시 과거 열린 실행은 `daemon-ended`로 정산하고 Runtime/token/PTY를 복원하지 않는다. 잔존 OS 프로세스의 죽음을 DB만으로 선언하지
않으며 관리 연결이 없음을 진단한다. terminal 없는 tab은 unavailable로 남기고 사용자가 닫거나
새 명령으로 실행한다. 준비가 끝나지 않은 shell tab은 start-failed로 바꾼다. 이 DB 정산은 프로세스
종료의 근거가 아니다. 정상 종료는 진행 중인 shell·Host 준비 작업을 기다리고 정리 registry의
남은 terminal을 한 번 더 종료한 뒤 모든 terminal을 종료·정리한다. 종료 확인 실패는 경고로 남기고
daemon을 닫지 않는다. Host·Network 정의/적용 정책은 보존하고 활성 membership은 비운다.
예전 PTY 번호·PID만으로 다시 연결하거나 임의 프로세스를 종료하지 않는다.

### 현재 저장·API 구현 범위 [Status: As-built]

탭 참조 제거는 protocol의 `removePanelTabs`가 공통으로 처리한다. 마지막 탭이 빠진 pane은 제거하고 분할을 정리하며, panel 전체가 비면 기존 트리의 첫 pane ID를 가진 빈 pane을 남긴다. restart·Agent 안내 탭 정리·사용자 탭 닫기·terminal 제거가 이 변환을 공유하며 종료 확인·transaction은 호출 경계에 남는다. 삽입·이동·비율은 `insertPanelTab`·`movePanelTab`·`resizePanelSplit`이 담당한다. 선택 상태는 각 React 앱의 메모리 상태가 소유하며 서버 저장·명령·방송에는 포함하지 않는다. 선택 필드를 포함하는 Web 전용 타입과 선택 대상 삭제 후 조정은 `apps/web/src/entities/panel/workspace-layout.ts`가 소유한다. 근거: [[packages/protocol/src/host.ts]], [[packages/protocol/src/host.test.ts]].

Host·관리 Agent·전용 Network·membership/edge, panel/tab, 삭제 ID·실행 이력 테이블을 현재
schema로 직접 초기화한다. pane tree·오류·안내 JSON은 protocol 검증을 통과한 값으로 저장한다.
Host와 전용 Network·panel 생성은 하나의 transaction이며 panel 쓰기는 바뀐 행만 쓰고 terminal
유일 소유를 검사한다. 관리 구성과 실제 실행을 분리하여 runtime/token/PTY를 저장하지 않는다.

Web 명령은 순번 처리기가 clientSessionId별로 sequence 순서를 지키게 한 뒤 `applyPanel` 하나로
변경 전체를 commit하고 응답한다. commit 뒤 새 준비 중 tab마다 daemon 수명 작업으로 shell을 병렬
준비하고, 준비된 shell은 같은 transaction에서 tab이 여전히 준비 중일 때만 연결한다. 연결하지
못한 shell과 제거된 tab·panel의 terminal은 정리 registry가 종료 확인까지 재시도하며 대상과 진단을
공개한다. 자연 shell exit와 직접 terminal 삭제는 같은 tab 정리를 사용하며 관리 Agent 정의는
지우지 않는다. 정상 daemon 종료는 배치를 보존하고, 다음 startup은 실행 이력을 정산하며 없는
terminal의 tab을 unavailable로 표시한다. [Status: As-built]

순번 처리기는 대기·중복 합류를 Effect Deferred로, 누락 기한을 중단 가능한 Effect 대기로 둔다.
Queue가 sequence 정렬·누락 복구를 대신하지 않으므로 순서 판정은 자체 규칙이다. daemon 수명 작업은
Effect FiberSet 하나에 모아 HTTP 요청 수명과 분리하고 teardown이 끝나기를 기다린다. Effect 중단은
프로세스를 끝내지 않으므로 프로세스 종료는 항상 TerminalService·stopRuntime 경로 하나가 맡고,
정리 재시도는 Effect Schedule(1초에서 30초까지)로 한다. vendor 실행의 소유자는 기존 ExecutionOwner
하나이며 Effect scope가 같은 프로세스를 따로 소유하지 않는다. [Status: As-built]

Host resolve와 run/restart는 공통 config/YAML 준비를 소비한다. 최초 실행·개별 Agent·Host Network와
전체 Host 제어를 연결했다. 실제 React 연결은 Stage6 준비 후 통합 검증한다.

근거: [[packages/persistence/src/sqlite/host-schema.ts]],
[[packages/persistence/src/sqlite/host-state.ts]], [[packages/persistence/src/sqlite/host-state.test.ts]],
[[apps/daemon/src/web-commands.ts]], [[apps/daemon/src/web-commands.test.ts]],
[[apps/daemon/src/sequencer.ts]], [[apps/daemon/src/sequencer.test.ts]],
[[apps/daemon/src/cleanups.ts]], [[apps/daemon/src/cleanups.test.ts]],
[[apps/daemon/src/tasks.ts]], [[apps/daemon/src/terminals.ts]].

개별 Agent 적용은 정의·membership·해당 Agent가 endpoint인 manifest edge 교체와 그 범위의
runtime override 제거를 한 transaction으로 처리한다. 관련 edge의 endpoint가 적용 membership에
없으면 edge를 누락시키지 않고 transaction 전체를 거절한다. 다른 Agent끼리의 적용 정책은 보존한다.
Host Network의 block/unblock은 별도 override를 저장하고 reset은 override만 제거하므로
현재 적용된 manifest edge/default로 돌아간다. 오류 대상이 섞인 복수 route는 전부 거절하며
같은 Host의 Host 명령이 진행 중이면 route 변경을 `host_busy`로 거절한다.

근거: [[apps/daemon/src/host-agents.ts]], [[apps/daemon/src/host-agents.test.ts]]와 기존 Host 저장소·회귀 테스트.

전체 구성 교체는 기존 생성과 같은 저장 검증·transaction을 사용한다. Host revision을 확인하고
transaction 안에서 읽은 최신 panel에 탭 제거·추가를 적용해 동일 ID의 Host·전용 Network·panel과
최신 선언을 원자적으로 교체하며 실행 이력은 유지한다. 전체 delete는 panel의 모든 terminal을
병렬로 종료·확인한 뒤 Host FK cascade로 관리 구성·Network·panel을 함께 삭제한다. 종료 확인에
실패했거나 남아 있는 terminal이 있으면 삭제하지 않는다.
저장 실패 rollback과 재오픈 후 구성·삭제 결과의 근거는 위 저장소 회귀 테스트다.

### 관리 실행 이력과 live projection [Status: As-built]

관리 Runtime의 시작·종료 이력, Agent의 마지막 terminal 표시와 panel 안내는 Host 저장소 transaction으로 함께 기록한다. 종료된 행은 이력이며 현재 Runtime 생존의 근거가 아니다. 현재 Host·Network·panel projection은 저장된 facts와 RuntimeRegistry·TerminalService의 live facts를 `AppState`에서 합성한다. 외부 Runtime도 Agent projection에 포함하며, 외부 실행이 만든 daemon Notification은 Web 공개 projection에서 제외한다.

근거: [[packages/persistence/src/sqlite/host-state.ts]] `packages/persistence/src/sqlite/host-state.ts:446-522`, [[apps/daemon/src/web-state.ts]], [[apps/daemon/src/app-state.ts]]; lifecycle 및 외부 Runtime projection은 [[packages/persistence/src/sqlite/host-state.test.ts]], [[apps/daemon/src/daemon.test.ts]]에서 검증한다.

### 사용자 panel 분류·이름과 외부 실행 귀속 [Status: As-built]

panels에는 kind와 별도로 section을 저장한다. 현재 schema에 직접 section과 이름을 설계하며
기존 개발 DB를 위한 migration/backfill을 만들지 않는다. kind와 section은 1:1이며
workspace/host/network는 각각 workspaces/hosts/networks만 허용한다. DB CHECK는 section 값만
제한하고 조합은 저장 전 panel DTO decode가 거절한다. 이름 정규화·길이·중복 정책은
[[docs/specs/aiox-configuration-web]]을 따른다. 사용자 panel 이름에는 UNIQUE를 두지 않는다.
rename은 최신 panel의 이름과 변경 번호만 같은 transaction으로 갱신한다. panel DTO와
Application RPC delta는 저장된 section을 전달하며 소비자가 kind로 section을 추정할 필요가 없게 한다.

공통 Runtime 등록 경계는 external의 terminal 귀속과 hostId를 거절한다. Web Agent projection은
executionOwnership을 노출하고 외부 실행도 포함한다. Runtime 변경 전달도 external을 제외하지
않되 외부 실행에서 발생한 알림의 Web 제외는 유지한다. panel 분류와 Agent 소유권은 별개다.

근거: [[packages/protocol/src/host.ts]], [[apps/daemon/src/state-api.test.ts]],
[[apps/daemon/src/runtimes.ts]], [[apps/daemon/src/daemon.test.ts]].

### 상태 공개 경계 [Status: As-built]

Public state contract은 [[docs/specs/aiox-configuration-web]]이 소유한다. daemon 내부 `AppState`는 application state를 Effect RPC stream으로 전달한다. Snapshot 캡처와 subscriber 등록은 같은 lock에서 처리하며, delta에는 증가하는 version을 붙인다. 연결별 queue가 한도를 넘으면 해당 subscriber만 `slow_consumer` failure로 끝내고 재연결은 새 snapshot부터 시작한다. Session sequence 실패는 확정된 상태 변경과 구분된 `sequence-failure` event로 전달된다. Web UI가 RPC stream을 실제 소비하는 통합은 아직 완료되지 않았다.

근거: [[apps/daemon/src/app-state.ts]] `apps/daemon/src/app-state.ts:248-290`, `apps/daemon/src/app-state.ts:509-533`, [[apps/daemon/src/application-rpc.ts]] `apps/daemon/src/application-rpc.ts:272-277`; subscriber 제한 및 recovery는 [[apps/daemon/src/app-state.test.ts]] `apps/daemon/src/app-state.test.ts:122-180`, 실제 WebSocket RPC는 [[apps/daemon/src/application-rpc.test.ts]] `apps/daemon/src/application-rpc.test.ts:33-69`, `apps/daemon/src/application-rpc.test.ts:195-280`에서 확인한다.

### W1 미확인 알림 공개·보존 [Status: Committed target]

미확인 목록은 기존 unreadNotifications()를 조회하고 저장된 originExecutionOwnership의
daemon 필터를 적용한다. 이 결과를 Web GET과 Application RPC snapshot.notifications가 공유한다.
신규 알림 commit은 upsert, 기존 markRead commit은 remove로 공개한다. 읽음 처리와
필수 메시지 결과 확정은 별개이며 markRead가 Agent 대기를 해소하거나 원본 알림을 지우지 않는다.
Clear all은 서버가 처리하는 시점의 대상 ID를 고정하고 그 저장 결과만 전달한다. 이후 생성된
알림까지 과거 Clear all의 결과로 제거하지 않는다. 보존 정리로 미확인 알림이 삭제되면 해당 ID의
remove를 전달할 수 있도록 정리 대상을 파악한다. 이 삭제 결과를 새 알림처럼 재발행하지 않는다.

보존은 기존 전체 delivery 완료·마지막 outcomeAt 기준 messages.retentionDays를 따른다.
별도 Web 개수 상한·dismissedAt·개별 삭제 저장 경로·읽음 포함 보존 목록 조회는 추가하지 않는다.
새 snapshot/state 계약은 기존 임시 Web의 change 알림 후 재조회 구현을 대체한다.
