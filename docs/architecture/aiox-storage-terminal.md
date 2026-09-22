# AIOX Storage, Terminal and Web State

Status: Target

이 문서는 daemon의 지속 데이터, 설정 적용, 터미널 화면·attachment와 Web 알림 projection을
소유한다. 실행 소유권은 [[docs/architecture/aiox-system]], vendor 관측은
[[docs/architecture/aiox-vendor-bindings]], 사용자 동작 계약은
[[docs/specs/aiox-configuration-web]]와 [[docs/specs/aiox-runtime]]가 소유한다.
As-built로 표시한 범위 외에는 목표 구조다. OS별 통합 완료를 뜻하지 않는다.

## 데이터 소유권

| 저장 책임 | 대상 | 경계 |
| --- | --- | --- |
| 실행 환경 사용자 홈의 `.aiox/config.json` | 터미널·keyboard·포트·사이드바 너비와 열림 상태·화면 조작 keybindings 변경분·Host 초기 layout | 모든 프로젝트·Host·standalone 공통 |
| SQLite | persistent Network/Route, AIOX send·대상별 결과·daemon 알림 본문, 실행 이력, 알림/읽음, workspace 배치 | 처리 종료 후 기본 30일, 상세는 configuration-web 계약 |
| daemon memory | live process/PTY/binding/credential/activity | DB의 과거 running을 현재 생존으로 간주하지 않음 |
| 전역 config의 `appearance.theme` | Web system/light/dark theme | terminal palette와 별개; 운영 Web은 브라우저 저장소를 쓰지 않음 |
| Host YAML | Host-managed 정의 | DB persistent 정의와 이중 권위 금지 |

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

NetworkService와 MessageService는 `uuid`의 v7 생성기를 사용해 새 Network·Message·Delivery·Notification ID를 발급한다. MCP의 전원 대상 부재 응답도 v7 messageId를 쓰되 저장하지 않는다. schema는 문자열 ID를 유지하며 재발급·backfill을 추가하지 않는다. 생성·저장·재오픈 근거는 apps/daemon/src/networks.ts, messaging.ts와 messaging.test.ts의 UUID v7 회귀다.

TypeORM·better-sqlite3 연결을 연 뒤 현재 schema의 DDL을 한 transaction에서 직접 실행한다.
`IF NOT EXISTS`로 같은 schema의 DB를 재오픈하며 과거 DB migration·version 채택 경로는 없다.
초기화 실패는 생성 중인 테이블을 rollback하고 연결을 닫아 오류를 전달한다. 기존 데이터를
자동 삭제하거나 초기화 성공으로 바꾸지 않는다. 첫 배포 전·후 변경 원칙은 [[AGENTS]]의
Development Database Before First Release를 따른다.

notification의 실행 소유권은 필수이며 terminal ID는 정상적으로 없는 실행을 위해 nullable을
유지한다. 과거 행 호환을 위해 소유권을 미확인으로 허용하지 않는다.

단일 SQLite 연결의 조회·쓰기·close를 직렬화한다. route의 최신 값 읽기와 변경 저장은 같은 transaction에 두어 동시 변경을 잃지 않으며 실패한 작업이 후속 작업을 막지 않는다.

근거: [[packages/persistence/src/sqlite/database.ts]] `packages/persistence/src/sqlite/database.ts:227-287`,
[[packages/persistence/src/sqlite/schema.ts]] `packages/persistence/src/sqlite/schema.ts:144-192`;
초기화·재오픈·직렬화·실패 rollback은 [[packages/persistence/src/sqlite/database.test.ts]]
`packages/persistence/src/sqlite/database.test.ts:66-212`, `packages/persistence/src/sqlite/database.test.ts:252-272`,
소유권/terminal 제약과 재오픈은 `packages/persistence/src/sqlite/database.test.ts:435-468`.

메시지·대상별 결과·daemon 알림을 내부 식별자로 연결하고, 전송 당시 역방향 route 관계를 대상별로 보존한다. daemon 시작 시와 하루 한 번 완료된 요청의 보존 기한을 확인해 관련 이력을 함께 정리한다. 진행 중 요청은 제외한다. 보존 기간·범위는 [[docs/specs/aiox-configuration-web]]이 소유한다. Host 실행 종료 정리와 이력 삭제는 다른 경로이며 저장 이력을 실행 복원·재전송에 사용하지 않는다.

근거: [[apps/daemon/src/retention.ts]] `apps/daemon/src/retention.ts:11-43`, [[apps/daemon/src/retention.test.ts]] `apps/daemon/src/retention.test.ts:8-31`; 저장·결과·보존 경계는 [[packages/persistence/src/sqlite/database.test.ts]] `packages/persistence/src/sqlite/database.test.ts:274-433`.

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
최초·변경된 저장 오류와 복구는 기존 daemon stderr로 진단하고 같은 오류의 반복 출력은 억제한다.

종료 drain은 timer를 취소하고 active persist/running batch에 합류한 뒤 최종 snapshot을 처리한다.
미저장 결과가 남으면 warnings와 stopped:false를 반환하며 HTTP 409 stop_incomplete로 daemon·DB를
유지하고 중앙 재시도를 재개한다. 성공으로 숨기거나 DB를 먼저 닫지 않는다. 메모리 pending은
프로세스 크래시·daemon 재시작의 내구성을 제공하지 않으며 vendor 입력 재주입도 하지 않는다.

근거: [[packages/persistence/src/sqlite/database.ts]] `packages/persistence/src/sqlite/database.ts:168-194`,
[[apps/daemon/src/messaging.ts]] `apps/daemon/src/messaging.ts:280-389`,
[[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:561-578`.
검증: [[apps/daemon/src/messaging.test.ts]] `apps/daemon/src/messaging.test.ts:481-607`,
[[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:2001-2035`. SQLite 결과+알림 rollback, A/B/C 시간차 실패의 단일 timer,
긴 batch 중 D 추가, Runtime 종료 후 저장, drain 실패·HTTP 409·재시도 재개를 검증한다.

## SQLite와 플랫폼

`packages/persistence`가 현재 schema 초기화·repository를 담당하고 daemon이 DB 연결을 소유한다.
domain은 DB를 모르고 application은 port를 통해 작업한다. CLI·Web·vendor binding이 직접 DB 파일을
열어 authoritative 상태를 변경하지 않는다. 필요한 상태 변경은 transaction 경계로 처리한다.

DB 기본 경로는 실행 환경 사용자 홈 아래 `.aiox/aiox.db`다. daemon boot는 CLI가 준비한 설정을 소비하거나 직접 시작 시 파일을 읽고 검증한 뒤 DB와 listener를 준비한다. 시작 준비의 조립 경계는 [[docs/architecture/aiox-system]]을 따른다. [Status: As-built] 근거: [[apps/daemon/src/bootstrap.ts]] `apps/daemon/src/bootstrap.ts:46-90`, [[apps/daemon/src/bootstrap.test.ts]] `apps/daemon/src/bootstrap.test.ts:43-73`.
Node homedir/path로 구성하며 `~` 문자열·특정 사용자 경로·npm 설치 경로·프로젝트/Worktree 경로를
하드코딩하지 않는다. 첫 daemon 시작에서 디렉터리와 현재 schema의 DB를 준비하고 실패하면 정상 기동으로
표시하지 않는다. 기존 파일 삭제나 빈 DB 대체로 오류를 숨기지 않는다.

DB 초기화 흐름:

```text
실행 환경의 사용자 홈 결정
 → 로컬 DB 준비·현재 schema 초기화
 → 단일 daemon 연결 소유
 → repositories를 통한 저장·조회
 → 관리 실행 종료 / DB 작업 정리·close
 → 다음 시작에서 저장 데이터 읽기
```

Windows native, Linux, macOS에서 domain/schema와 초기화 경로를 공유한다. OS별 DB 모델은 만들지
않는다. Windows native와 WSL은 홈·실행 환경이 다르므로 별도 DB를 사용하는 방향이며 Windows
마운트의 같은 DB를 두 daemon이 공유하는 운영은 도입하지 않는다. 파일 지속과 프로세스 재부착은
다르다. 실행 중 포트 설정 변경이 같은 DB를 소유하는 두 번째 daemon을 만들게 하지 않는다.

지원 목표는 Windows/Linux/macOS다. 초기 구성은 daemon·Node/Git·vendor CLI를 같은 실행
환경에 두는 것을 추천한다. [Status: Proposed] Windows daemon + WSL vendor 혼합 제어는
path/socket/token/MCP/종료 경계를 별도로 해결해야 하므로 지원 확정이 아니다. Windows 브라우저가
WSL Web에 접속하는 것은 이 혼합 실행과 다르며 네트워크 접근은 별도로 검증한다.

Stage 1은 better-sqlite3 12.11.1을 사용한다. Node >=22.12.0을 요구하며 Windows/Linux/macOS의
Node22/24 CI에서 DB 설치·저장·재개방 테스트를 통과했다. OS 이름만으로 npm 전역 설치 성공을 약속하지 않고 채택
버전의 Node·CPU·OS에 맞는 prebuilt/native 로딩을 검증한다. PTY native 의존도 함께 확인한다.
npm 배포 artifact와 vendor 실행은 후속 검증 대상이다. PTY의 현재 CI 범위는 아래 Stage 2 근거를 따른다. WAL 채택은 미결이며 채택 시 같은 디렉터리의
`-wal`/`-shm` 접근과 로컬 파일시스템 조건을 지킨다. 살아 있는 sidecar를 삭제하지 않는다.
[better-sqlite3](https://github.com/WiseLibs/better-sqlite3), [SQLite WAL](https://sqlite.org/wal.html).

Stage 2 W3와 타입 설정 보완을 포함한 `6621fc3`은 [CI 실행 34314631099](https://github.com/lunaxislu/aiox-prototype/actions/runs/34314631099)에서 Windows/Linux/macOS × Node22/24의 locked install·lint·build·typecheck·테스트·built CLI 진단을 통과했다. Linux/macOS는 186 tests, Windows는 175 tests와 기존 POSIX 전용 11 skips다. Windows에서도 daemon의 실제 PTY 입출력·resize·detach·종료 테스트는 실행했다. Windows shell 종료 테스트는 native exit 관측 후 등록 정리를 기다린다. Linux Node22의 기본 출력 버퍼 테스트 timeout은 같은 commit의 실패 job 재실행에서 통과했다. 이전 ef624d8에서도 발생한 간헐 실패로 원인은 미확정이며, 재발 시 출력 수신·종료 순서와 실행 시간을 확인해야 한다. 실제 브라우저·vendor·WSL·npm 배포 artifact 검증은 이 CI에 포함되지 않는다. [Status: As-built]

검증 경로는 설치→현재 schema로 DB 초기화→저장·조회→정상/force 종료→재오픈 후 데이터 확인이다.
Windows native/Linux/macOS를 구분하고 WSL 실행·Windows 브라우저 연결은 별도 확인한다.
Linux Docker 결과를 native Windows 검증으로 보고하지 않는다.

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

일반 shell의 생성 작업 경로·terminal ID는 TerminalService가 유지한다. `cwd` 조회는 생성 경로이며
shell 안의 `cd`를 실시간 추적한 값이 아니다. 일반 shell에는 Agent credential·membership이 없다.
일반 shell 생성 시 상속 환경의 `AIOX_*` 문맥을 제거하고, 새 `AIOX_TERMINAL_ID`와 비공개
`AIOX_TERMINAL_TOKEN`을 child env에 넣는다. 이 문맥은 메모리에만 유지하고 API 목록·URL·argv·로그에
노출하지 않는다. 일반 shell exit/정리 후에는 유효하지 않다. [Status: As-built]

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

근거: [[apps/web/src/attach.ts]] `apps/web/src/attach.ts:42-67`, [[apps/web/src/main.ts]]
`apps/web/src/main.ts:96-195`, `apps/web/src/main.ts:433-499`, [[apps/web/src/main.test.ts]]
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

PTY 경계는 POSIX raw byte와 Windows 문자열 출력을 공통 바이트로 정규화해 WebSocket binary 출력과 JSON 제어 프레임을 구분한다. Windows 드라이버가 이미 문자열로 디코딩한 원본 바이트까지 복원한다고 보장하지 않는다.

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

| 실제 사용자 상태 | 처리 |
| --- | --- |
| 브라우저 창·탭 활성 + 해당 terminal 선택 | 팝업·소리·알림 목록 추가·미확인 표시 억제, TUI/상태는 표시 |
| 다른 terminal 선택 | 대상 알림을 미확인 목록에 추가 |
| background tab/window | 선택된 pane만으로 읽음 판정하지 않음 |
| Web 닫힘 | daemon이 미확인 알림 유지, 재방문에 표시 |

알림 projection은 terminal의 입력 포커스 대신 브라우저 창·탭 활성과 선택 terminal을
소비한다. 현재 최소 Web은 visibilityState와 document.hasFocus를 함께 확인하고 선택된
terminal의 알림 ID를 표시 projection에서 제외한 뒤 읽음 저장한다. 검색창·버튼으로 입력
포커스가 이동해도 terminal 선택은 유지한다. 대상 선택의 읽음 요청은 진행 중인 쓰기 뒤에
이어가며 그 쓰기의 후속 조회가 끝날 때까지 기다리지 않는다. 이 표시·읽음 경계는 메시지
처리 결과·필수 알림 저장과 분리한다. popup·소리는 후속 구현이다. 사용자 계약은
[[docs/specs/aiox-configuration-web]]의 알림·포커스·사용자 요청을 따른다. [Status: As-built]

근거: [[apps/web/src/main.ts]] `apps/web/src/main.ts:266-278`, `apps/web/src/main.ts:309-364`,
`apps/web/src/main.ts:401-428`; [[apps/web/src/main.test.ts]] `apps/web/src/main.test.ts:667-862`.

사용자는 운영 Web 접속·Claude 실행과 실제 브라우저 창/탭 전환에 따른 알림 표시·읽음 처리를 확인했다고 보고했다. 이는 해당 사용 흐름의 사용자 실측 근거이며 agent의 재실행 결과가 아니다. OS·WSL 구성, 브라우저/vendor 버전과 실행 SHA는 특정되지 않아 모든 환경의 통합 인증으로 확대하지 않는다. Sources: `logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md`의 2026-09-14 「W7 참조·관측 이유 표시 완료, 사용자 실측 수용과 Stage2-3 마감」.

짧은 시간의 여러 알림은 항목을 남기고 소리를 묶는 방향이다. 묶음 시간, 같은 요청의 반복
알림 갱신, multi-tab 단일 재생 주체는 구현 제안이며 정확한 수단은 미결이다. Web Audio는
후보이고 autoplay를 위한 사용자 활성화 UX를 고려한다. Web이 닫힌 상태의 native OS 알림음을
추가 요구로 만들지 않는다.

## Web 상태와 라이브러리

WebEvents는 최초·재접속 snapshot과 DTO별 state, 조회 실패 fault를 전송한다. 읽는 동안
관측 버전이 바뀌면 snapshot을 다시 읽고, shell 생성·배치 commit은 공개 경계로 묶어 중간
배치를 노출하지 않는다. 각 연결의 직전 snapshot과 현재 조회를 비교하여 변경된 DTO만 보낸다.
Runtime 변경은 external도 포함하며 Web 알림은 daemon 소유만 포함한다. SSE는 replay나
별도의 durable 상태 권위를 갖지 않는다. [Status: As-built]

쓰기 실패·backpressure는 해당 viewer를 닫고, 상태 읽기 실패는 빈 snapshot으로 숨기지 않는다.
daemon 종료는 SSE를 닫고 접수한 panel Operation을 정산한 뒤 DB를 닫는다. 연결 종료는
실행 자원을 종료하지 않는다. [Status: As-built]

근거: [[apps/daemon/src/web-events.ts]], [[apps/daemon/src/web-state.ts]],
[[apps/daemon/src/daemon.ts]], [[apps/daemon/src/web-events.test.ts]],
[[apps/daemon/src/daemon.test.ts]], [[apps/daemon/src/panel-operations.test.ts]].

Stage 2 최소 Web은 plain TypeScript + Vite + xterm/addon-fit이다. 과거 change 이벤트 뒤 HTTP로 terminal·Web 대상 Agent·미확인 알림을 조회하고 일반 shell 생성 및 terminal 선택·WS 연결을 제공한다. 같은 terminal의 Agent 교체는 살아 있는 attachment를 다시 만들지 않으며 끊긴 연결은 재선택할 수 있다. 공통 transport와 attachment 수명을 확인하는 범위여서 DOM·브라우저 API를 사용했으며 React·공유 상태 계층을 추가하지 않았다. 운영 React Web 방향을 폐기한 선택이 아니다. 현재 서버의 snapshot/state 이벤트를 소비하는 React 연결은 Stage6 범위로 남아 있다. 아래 운영 UI·설정·상세 알림 UX는 후속 구현 대상이다. [Status: As-built]

근거: [[apps/web/src/main.ts]] `apps/web/src/main.ts:193-264`, `apps/web/src/main.ts:309-375`, [[apps/web/src/attach.ts]] `apps/web/src/attach.ts:42-137`; Node DOM 대역 검증은 [[apps/web/src/main.test.ts]] `apps/web/src/main.test.ts:56-151`. Stage 2 당시 실제 브라우저 UI 검증은 macOS Chrome에서 shell 생성·선택·입출력·resize·재연결(attachment 해제 후 실행 생존)·종료를 확인했다. Windows/Linux 네이티브 브라우저 교차 검증은 아직 하지 않았다.

Sources: `logs/2026-09-07-AIOX-TUI-Stage2-Daemon-MCP-Terminal.md` 2026-09-09 13:40 W1 실제 브라우저 검증 entry.

상태 조회, 사용자 작업 결과, attachment 복구 안내는 서로 다른 DOM 영역에서 갱신한다.
attachment는 복원 완료·종료·실패·미러 복원 불가를 보고하고, main은 선택된 연결의 보고만
소비한다. 재연결은 attachment만 교체하고 명시 종료는 확인 후 기존 terminal DELETE 경로를
사용한다. 이전 선택의 늦은 종료 응답이나 연결 callback이 새 선택의 화면을 정리하지 않는다.
실행 생존 표시는 목록 조회 결과이며 attachment 연결 성공과 별개다. [Status: As-built]

조회 응답은 마지막 반영된 요청 순서보다 오래된 경우 버린다. 더 새 요청이 대기 중이라는
이유만으로 완료된 조회를 버리지는 않아 느린 조회에서도 화면을 갱신한다. 사용자 작업
성공 시 그 이전 조회를 무효화하므로 오래된 목록이 작업 결과를 되돌리지 않는다. [Status: As-built]

근거: [[apps/web/src/main.ts]] `apps/web/src/main.ts:96-195`, `apps/web/src/main.ts:309-499`;
DOM 대역의 목록 역전·느린 조회 진행·이전 선택 callback·종료 응답 격리·오류 보존 회귀는
[[apps/web/src/main.test.ts]] `apps/web/src/main.test.ts:223-628`이다.

SSE 전환 전 W5의 built Web은 실제 Chromium/xterm과 제어된 HTTP·WebSocket 대역으로 작업 오류의 polling
후 보존·재시도 결과, 조회 실패 시 실행 상태 미확인, snapshot 재연결, 복원 불가 안내와 종료
확인 취소/승인, 중첩 조회 역전을 검증했다. 이 검증은 실제 daemon·PTY·vendor의 생존이나
종료를 실측한 것이 아니다.
Sources: `logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md`의
“W5 결과 수용과 검증 정정·W6 재개 지점” entry.

운영 Web은 React·Tailwind·shadcn/ui를 사용하고 UI 문구는 영어로 고정한다. Vite는 재사용 후보다.
공개 site의 Next.js/next-intl 선택과 운영 Web은 독립적이다.
agent 출력과 vendor 오류 원문을 무조건 번역하지 않는다.

Gateway snapshot/event의 projection을 하나로 유지한다. Zustand는 실제 pane/설정/알림 공유
필요가 있을 때, TanStack Query는 history pagination/search 같은 조회 필요가 있을 때 평가한다.
같은 live authority를 여러 store/cache가 독립적으로 수정하게 하지 않는다. 서버 채택 의존성은 [[docs/architecture/aiox-system]]을 따른다. YAML·오디오 등 후속 의존성은 실제 소비 단계에 선택하며 별도 event bus·HTTP framework를 미리 추가하지 않는다.

Sources: `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §19–§24.

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
Windows native daemon은 일반 stop에서도 daemon 소유 실행의 작업 상태를 검사하지 않고 native PTY 종료 경로를
사용한다. PowerShell PSReadLine handshake와 CMD idle 조사 테스트는 제거했으며 Web shell 기본값을
PowerShell로 강제하지 않는다. 과거 PSReadLine2.4.5 Windows CI 및 CMD 반례 결과는 Stage2-2
로그에 당시 정책의 검증으로 보존한다. Windows 사용자 실측에서는 일반 stop·force 각각의
shell PTY child/grandchild와 별도 외부 owner의 foreground/helper 트리 종료를 확인했다.
외부 owner 종료는 당시 잘못 확장된 정책의 관측이며 현재 외부 생존 계약의 검증으로 사용하지 않는다.
최신 소유권 범위와 수정 검증은 [[docs/specs/aiox-runtime]] 및 Stage2-3 W1을 따른다.
외부 실행은 실제 runExternal·WebSocket·ExecutionOwner 경로와 대역 vendor를 사용했으므로
실제 Claude/Codex 통합이나 임의 프로세스 트리 전체에 대한 보장으로 확대하지 않는다.

공통 terminal.shell/args/cwd는 새 일반 shell 생성에만 적용하고 vendor 실행 구성과 분리한다.
config의 resolveTerminalLaunch가 기본값·요청 override·실행 파일 탐색과 cwd 검증을 소유한다.
bootstrap은 DB 준비 전에 검증하고, 새 shell 생성은 파일을 다시 읽어 검증한 뒤 admission을
재확인한다. TerminalService는 필수 실행 값을 받아 PTY를 생성하며 설정을 다시 해석하지 않는다.
Windows에서 WSL의 Linux cwd는 선택한 배포판·사용자의 정적 검사 명령으로 확인한 뒤 wsl.exe --cd로
전달하며 native PTY의 host cwd와 구분한다. Windows native cwd는 Node 자식이 실제 해당 경로에서
시작할 수 있는지 검사한다. 확인된 cwd 실패만 config 오류에 필드 근거를 붙이고 daemon이 요청
cwd 유무와 함께 분류한다. Windows 검사 프로세스 실패와 WSL의 확정 cwd 실패 표식 없는 오류는
실행 환경 실패로 유지한다. HTTP 분류 계약은 configuration/Web spec이 소유한다.
근거: packages/config/src/terminal.ts 및 wsl.ts와 각 colocated tests,
apps/daemon/src/bootstrap.test.ts 및 terminals.test.ts. [Status: As-built]
설정 watch·현재 경로 polling·부모 shell 추적은 추가하지 않는다.
계약은 [[docs/specs/aiox-configuration-web]]을 따른다.

Windows 사용자 실측으로 cmd/PowerShell 입출력·cwd·재연결, Windows daemon에서 WSL2 Ubuntu의
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
TypeORM repository/기존 SQLite transaction을 사용한다. JSON 안의 참조는 같은 transaction에서
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

| 테이블 / primary key | 필수 열·제약 | 쓰기·삭제·복원 |
| --- | --- | --- |
| `hosts` / `id` | `name UNIQUE`, `directory`, `source_file`, `instruction`, `revision`, `created_at`; 문자열 NOT NULL | run의 검증 후 생성, 전체 restart 갱신. delete 최종 commit에서 삭제 |
| `host_agents` / `(host_id,agent_key)` | Host FK, `ordinal`, `adapter`, `role?`, `description?`, `instruction`, `args_json`, `last_terminal_id?`, `last_exit_json?`; ordinal은 Host 안에서 유일 | 적용된 관리 구성. 개별 start/restart는 대상만, 전체 restart는 증감 반영. 탭 닫기로 삭제 안 함 |
| `host_networks` / `id` | `host_id UNIQUE` FK, `name`, `default_policy` allow/deny | Host 생성·전체 restart 적용; stop 보존, Host delete 연동 |
| `host_members` / `(network_id,agent_key)` | 같은 Host 관리 Agent를 참조 | 적용 YAML membership, 실행 유무와 독립 |
| `host_edges` / `(network_id,from_key,to_key)` | `manifest_policy?`, `override_policy?`; 둘 다 null 금지·self 금지·membership 참조 | reset은 override만 null; 둘 다 없으면 행 삭제. 개별 적용은 incident edge만, 전체 적용은 override 제거 |
| `panels` / `id` | `kind`, `name`, `host_id? UNIQUE`, `network_id?`, `revision`, `layout_json`, `active_pane_id` | 배치의 단일 권위. Host 생성과 panel 생성 함께 commit. 이동/분할/선택 갱신, 소유 자원 종료 확인 후 삭제 |
| `panel_tabs` / `id` | `panel_id` FK, `terminal_id? UNIQUE`, `label`, `agent_key?`, `presentation`, `notice_json?` | tab 참조·안내 표시 지속. Copy/exit는 일반 shell로 갱신, close는 종료 확인 후 삭제 |
| `host_operations` / `id` | `request_id UNIQUE`, `request_hash`, `kind`, `host_id?`, `panel_id?`, `state`, `targets_json`, `error_json?`, `cleanup_errors_json`, `created_at`, `finished_at?` | 접수 전에 durable 기록, 관측 결과 갱신. 삭제 완료 응답도 Host FK cascade로 잃지 않음 |
| `host_executions` / `runtime_id` | `host_id`, `agent_key`, `terminal_id`, `started_at`, `ended_at?`, `exit_json?` | 실행 이력. live credential/binding/status는 저장하지 않음 |

`?` 열은 실제 부재 의미의 nullable이다. 과거 행 호환용 nullable/legacy fallback이 아니다.
host_executions와 operations의 Host/terminal ID는 삭제 후 이력을 위해 값만 보존하고 live FK로
삭제를 막지 않는다. 종료 이력·완료 Operation은 종료 후 messages.retentionDays 정책으로 정리하고
진행 중/정리 미완료 Operation은 제외한다. 관리 구성·배치는 기간 정리 대상이 아니다.
request hash는 공개 실행 입력의 canonical 값으로 계산하고 terminal token/env를 저장하지 않는다.
재시도 요청도 현재 접속·terminal 인증을 검사한다. 보존 기한 뒤 requestId 재사용은 보장하지 않는다.

Host YAML의 전체 원문을 별도 권위로 복제하지 않는다. 적용 instruction/args·membership·route는
위 모델에서 복원하고 미적용 파일 편집 여부를 자동 감시하거나 현재 적용으로 표시하지 않는다.
Host route는 관리 key로 보존하며 live Runtime edge projection만 실행마다 교체한다.
기존 persistent_routes는 Runtime ID 기반이며 기존 종료 정리를 유지한다.

### transaction과 실행의 경계

검증된 입력과 대상/배치 revision을 고정한 뒤 Host별 제어를 직렬화한다. 같은 Host의 진행 중
제어 요청은 409 host_busy, unrelated Host는 진행할 수 있다. 배치 쓰기는 revision 비교로
Host가 계산한 배치와 Web 이동이 서로 덮어쓰지 않게 한다. stale 계획은 실행 전에 다시 계산한다.
프로세스 stop을 요청했다는 이유로 적용 구성·panel을 먼저 지우지 않는다.

DB transaction 안에서 OS 프로세스가 rollback된다고 가정하지 않는다. 신규 자원 예약·Operation
기록 → 실행/관측 → 필요한 적용 구성·표시·이력 commit → SSE 순서로 진행한다.
실행/저장 실패는 이번 시도가 확보한 자원만 보상하고 실제 종료 확인과 보상 실패를 Operation에
남긴다. 기존 사용자 shell은 보상 대상으로 취급하지 않는다. 기존 Runtime을 이미 종료한 뒤의
restart 실패는 이전 실행을 자동 되살리거나 사전 실패처럼 보존됐다고 보고하지 않는다.
자원 변경 뒤 DB 쓰기 실패 시 live handle·미저장 결과를 daemon이 보존하여 명시 재시도로
저장을 마무리한다. 조회 오류를 빈 Host/panel로 바꾸지 않는다.

브라우저 재접속은 저장된 배치/안내와 live registry를 합성해 복원한다. daemon 재시작은 별개다.
시작 시 과거 미완료 Operation은 `daemon_interrupted`, 과거 열린 실행은 `daemon-ended`로
정산하고 Runtime/token/PTY를 복원하지 않는다. 잔존 OS 프로세스의 죽음을 DB만으로 선언하지
않으며 관리 연결이 없음을 진단한다. terminal 없는 tab은 unavailable로 남기고 사용자가 닫거나
새 명령으로 실행한다. Host·Network 정의/적용 정책은 보존하고 활성 membership은 비운다.
예전 PTY 번호·PID만으로 다시 연결하거나 임의 프로세스를 종료하지 않는다.

### 현재 저장·API 구현 범위 [Status: As-built]

Host·관리 Agent·전용 Network·membership/edge, panel/tab, Operation·실행 이력 테이블을 현재
schema로 직접 초기화한다. pane tree·오류·안내 JSON은 protocol 검증을 통과한 값으로 저장한다.
Host와 전용 Network·panel 생성은 하나의 transaction이며 panel 쓰기는 revision과 terminal
유일 소유를 검사한다. 관리 구성과 실제 실행을 분리하여 runtime/token/PTY를 저장하지 않는다.

panel 생성·rename·layout·dismiss는 commit 뒤 응답한다. shell 생성·tab 닫기·workspace 삭제는
Operation 접수 뒤 기존 TerminalService로 실행하고 결과를 durable 기록한다. 같은 requestId의
같은 요청은 기존 결과를 반환한다. 자연 shell exit와 직접 terminal 삭제는 같은 tab 정리를
사용하며 관리 Agent 정의는 지우지 않는다. 정상 daemon 종료는 배치를 보존하고, 다음 startup은
미완료 Operation·실행 이력을 정산하며 없는 terminal의 tab을 unavailable로 표시한다.

완료 Operation과 종료 이력은 보존 기간 이후 정리하되 cleanup 오류가 남은 Operation은 보존한다.
Host resolve는 공통 config/YAML 준비를 소비한다. 공개 Host run·제어 조정은 W5~W7,
실제 React 연결은 Stage6·W5 이후 범위다.

근거: [[packages/persistence/src/sqlite/host-schema.ts]],
[[packages/persistence/src/sqlite/host-state.ts]], [[packages/persistence/src/sqlite/host-state.test.ts]],
[[apps/daemon/src/state-api.ts]], [[apps/daemon/src/panel-operations.ts]],
[[apps/daemon/src/panel-operations.test.ts]], [[apps/daemon/src/terminals.ts]].

### 관리 실행 이력과 live projection [Status: As-built]

관리 Runtime 연결 시 실행 이력 시작·Agent의 lastTerminalId·tab의 preparing 표시를 같은
transaction으로 저장한다. 해당 Host/key의 미정산 실행이 있으면 중복 실행을 거절한다.
종료 확인과 binding·membership 정리 뒤 실행 이력 종료·lastExit·tab 표시를 원자적으로 저장한다.
저장이 실패하면 Runtime 등록을 남겨 재시도하며 완료된 이전 실행의 지연 종료는 다음 실행을
덮어쓰지 않는다. 정상 종료는 shell 표시, 명시 stop·시작 실패·비정상 종료는 원인과 재시작 명령을
담은 안내다. shell 자체가 종료되어 tab이 없어져도 관리 Agent와 종료 이력은 유지한다.

HTTP와 SSE는 같은 `projectHostState`를 사용한다. Host의 runtime/phase, Network의 live
membership/edge ID, panel의 runtimeId·preparing/TUI 표시는 실제 RuntimeRegistry에서 합성하며
저장된 이력을 생존 증거로 사용하지 않는다. 재시작 정산 후 unavailable 안내의 명령도 적용된
Host source와 Agent key에서 복원한다. Host 통신 정책은 Agent key로 보존하고 현재 Runtime ID로
해석하므로 실행 교체나 credential 폐기로 선언된 정책을 삭제하지 않는다.

근거: [[packages/persistence/src/sqlite/host-state.ts]],
[[packages/persistence/src/sqlite/host-state.test.ts]], [[apps/daemon/src/web-state.ts]],
[[apps/daemon/src/networks.ts]], [[apps/daemon/src/networks.test.ts]],
[[apps/daemon/src/agent-controller.test.ts]].

### 사용자 panel 분류·이름과 외부 실행 귀속 [Status: As-built]

panels에는 kind와 별도로 section을 저장한다. 현재 schema에 직접 section과 이름을 설계하며
기존 개발 DB를 위한 migration/backfill을 만들지 않는다. kind workspace는 세 section,
kind host/network는 각각 hosts/networks만 허용한다. 이름 정규화·길이·중복 정책은
[[docs/specs/aiox-configuration-web]]을 따른다. 사용자 panel 이름에는 UNIQUE를 두지 않는다.
rename은 revision 비교와 이름·revision 갱신을 같은 transaction으로 처리한다. panel DTO와
SSE는 저장된 section을 전달하며 소비자가 kind로 section을 추정할 필요가 없게 한다.

공통 Runtime 등록 경계는 external의 terminal 귀속과 hostId를 거절한다. Web Agent projection은
executionOwnership을 노출하고 외부 실행도 포함한다. Runtime 변경 전달도 external을 제외하지
않되 외부 실행에서 발생한 알림의 Web 제외는 유지한다. panel 분류와 Agent 소유권은 별개다.

근거: [[packages/protocol/src/host.ts]], [[apps/daemon/src/state-api.test.ts]],
[[apps/daemon/src/runtimes.ts]], [[apps/daemon/src/daemon.test.ts]].

### 상태 공개 경계 [Status: As-built]

새 SSE wire와 초기 snapshot은 [[docs/specs/aiox-configuration-web]]이 소유한다. 기존
WebEvents는 위 snapshot/state 구현을 사용하며 React 연결 완료 여부는 별도로 검증한다.
daemon은 기존 관측 owner와 persistence 결과를 조회 DTO로 공개한다. 하나의 반영 단위에서
연관된 Host/panel/terminal/Operation 결과를 함께 공개한 뒤 SSE state로 보낸다.
새 연결은 구독 등록과 일관된 snapshot 생성·송신을 연결하며, 준비 중 발생한 후속 변경은
snapshot 뒤에 순서대로 전달한다. snapshot 시점과 구독 사이의 변경을 누락하지 않는다.
DB commit 또는 관측 결과 공개에 실패하면 성공 DTO를 먼저 방송하지 않는다. 장시간 실행
전체를 하나의 transaction으로 묶지 않으며 preparing·ready·실패는 각각 실제 반영 시점의 상태다.
snapshot 실패·느린 연결은 오류/연결 종료 후 새 snapshot으로 복원한다. 연결 종료는 실행
자원의 종료가 아니다. 별도 HTTP snapshot endpoint·epoch/sequence·SQLite 이벤트 log나
migration을 추가하지 않는다. PTY 출력마다 상태 이벤트를 만들지 않고 실제 조회 DTO가
바뀔 때만 전달한다. HTTP와 SSE는 같은 projection을 소비하며 별도 실행 상태 권위를 만들지 않는다.

### W1 미확인 알림 공개·보존 [Status: Committed target]

미확인 목록은 기존 unreadNotifications()를 조회하고 저장된 originExecutionOwnership의
daemon 필터를 적용한다. 이 결과를 Web GET과 SSE snapshot.notifications가 공유한다.
신규 알림 commit은 upsert, 기존 markRead commit은 remove로 공개한다. 읽음 처리와
필수 메시지 결과 확정은 별개이며 markRead가 Agent 대기를 해소하거나 원본 알림을 지우지 않는다.
Clear all은 서버가 처리하는 시점의 대상 ID를 고정하고 그 저장 결과만 전달한다. 이후 생성된
알림까지 과거 Clear all의 결과로 제거하지 않는다. 보존 정리로 미확인 알림이 삭제되면 해당 ID의
remove를 전달할 수 있도록 정리 대상을 파악한다. 이 삭제 결과를 새 알림처럼 재발행하지 않는다.

보존은 기존 전체 delivery 완료·마지막 outcomeAt 기준 messages.retentionDays를 따른다.
별도 Web 개수 상한·dismissedAt·개별 삭제 저장 경로·읽음 포함 보존 목록 조회는 추가하지 않는다.
새 snapshot/state 계약은 기존 임시 Web의 change 알림 후 재조회 구현을 대체한다.
