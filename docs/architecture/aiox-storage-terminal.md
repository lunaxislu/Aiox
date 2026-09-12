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
| 실행 환경 사용자 홈의 `.aiox/config.json` | 터미널·keyboard·포트·사이드바 너비·Host 초기 layout | 모든 프로젝트·Host·standalone 공통 |
| SQLite | persistent Network/Route, AIOX send·대상별 결과·daemon 알림 본문, 실행 이력, 알림/읽음, workspace 배치 | 처리 종료 후 기본 30일, 상세는 configuration-web 계약 |
| daemon memory | live process/PTY/binding/credential/activity | DB의 과거 running을 현재 생존으로 간주하지 않음 |
| browser localStorage | Web dark/light theme | terminal 전역 theme과 다름 |
| Host YAML | Host-managed 정의 | DB persistent 정의와 이중 권위 금지 |

언어·소리 on/off/volume의 localStorage 저장, system theme 선택은 제안이다. 실제 Runtime
credential을 영속화된 설정·메시지에 넣지 않는다. vendor transcript/reasoning 전체 복제나 SQLite
저장을 근거로 동일 delivery 재전송·자동 재시작을 추가하지 않는다.

## 이력 보존과 ORM 전환 [Status: As-built]

TypeORM + 기존 better-sqlite3로 전환했다. Stage 1 DB의 최초 schema는 적용된 migration으로 인계하고 이후 migration을 실행한다. 기존 user_version은 호환성 검사에만 읽으며 TypeORM migration 이력을 단일 권위로 사용한다. synchronize는 끈다.

단일 SQLite 연결의 조회·쓰기·close를 직렬화한다. route의 최신 값 읽기와 변경 저장은 같은 transaction에 두어 동시 변경을 잃지 않으며 실패한 작업이 후속 작업을 막지 않는다.

근거: [[packages/persistence/src/sqlite/database.ts]] `packages/persistence/src/sqlite/database.ts:102-132`, `packages/persistence/src/sqlite/database.ts:267-320`; migration·재개방·병렬 작업·rollback 검증은 [[packages/persistence/src/sqlite/database.test.ts]] `packages/persistence/src/sqlite/database.test.ts:96-282`.

메시지·대상별 결과·daemon 알림을 내부 식별자로 연결하고, 전송 당시 역방향 route 관계를 대상별로 보존한다. daemon 시작 시와 하루 한 번 완료된 요청의 보존 기한을 확인해 관련 이력을 함께 정리한다. 진행 중 요청은 제외한다. 보존 기간·범위는 [[docs/specs/aiox-configuration-web]]이 소유한다. Host 실행 종료 정리와 이력 삭제는 다른 경로이며 저장 이력을 실행 복원·재전송에 사용하지 않는다.

근거: [[apps/daemon/src/retention.ts]] `apps/daemon/src/retention.ts:11-43`, [[apps/daemon/src/retention.test.ts]] `apps/daemon/src/retention.test.ts:8-31`; 저장·결과·보존 경계는 [[packages/persistence/src/sqlite/database.test.ts]] `packages/persistence/src/sqlite/database.test.ts:358-502`.

## SQLite와 플랫폼

`packages/persistence`가 schema·migration·repository를 구현하고 daemon이 DB 연결을 소유한다.
domain은 DB를 모르고 application은 port를 통해 작업한다. CLI·Web·vendor binding이 직접 DB 파일을
열어 authoritative 상태를 변경하지 않는다. 필요한 상태 변경은 transaction 경계로 처리한다.

DB 기본 경로는 실행 환경 사용자 홈 아래 `.aiox/aiox.db`다. daemon boot가 설정을 읽고 DB를 연 뒤 listener를 시작한다. [Status: As-built] 근거: [[apps/daemon/src/bootstrap.ts]] `apps/daemon/src/bootstrap.ts:14-16`, `apps/daemon/src/bootstrap.ts:44-67`.
Node homedir/path로 구성하며 `~` 문자열·특정 사용자 경로·npm 설치 경로·프로젝트/Worktree 경로를
하드코딩하지 않는다. 첫 daemon 시작에서 디렉터리/DB/migration을 준비하고 실패하면 정상 기동으로
표시하지 않는다. 기존 파일 삭제나 빈 DB 대체로 오류를 숨기지 않는다.

```text
실행 환경의 사용자 홈 결정
 → 로컬 DB 준비·migration
 → 단일 daemon 연결 소유
 → repositories를 통한 저장·조회
 → 관리 실행 종료 / DB 작업 정리·close
 → 다음 시작에서 저장 데이터 읽기
```

Windows native, Linux, macOS에서 domain/schema/migration은 공유한다. OS별 DB 모델은 만들지
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

검증 경로는 설치→DB 생성/migration→저장→정상/force 종료→재시작 후 데이터 확인이다.
Windows native/Linux/macOS를 구분하고 WSL 실행·Windows 브라우저 연결은 별도 확인한다.
Linux Docker 결과를 native Windows 검증으로 보고하지 않는다.

## 전역 설정 적용

설정 scope는 사용자 전역 하나이며 프로젝트 override는 없다. Host 실행 정의 `aiox.yaml`과도
별개다. 전역 설정은 `.aiox/config.json`을 사용하며 형식·검증 계약과 Stage 1 구현 범위는
[[docs/specs/aiox-configuration-web]]를 따른다. npm 설치 디렉터리에 사용자 설정을 저장하지 않는다.

```text
Web 수정·미리보기 → 저장 요청 → daemon 검증 → 전역 파일 저장 → 유효 설정 배포
파일 직접 편집  → daemon 변경 감지·검증              → 유효 설정 배포
```

같은 검증·적용 경로를 쓰고 파일 변경 이벤트를 짧게 묶는다. 별도 config apply 명령은 없다.
잘못된 설정은 마지막 유효 값을 유지하고 오류를 표시한다. daemon이 꺼져 있으면 다음 시작에서
읽고 검증한다. 동시 편집 충돌 해결 방식·파일 감지 수단과 debounce 수치는 미결이다.

폰트·터미널 색상·AIOX 단축키는 연결된 Web에 즉시 배포한다. font/size 변경 후 fit/resize를
계산한다. daemon/운영 Web 포트는 다음 시작에 적용하고 Web에 저장됨·재시작 후 적용으로 표시한다.
설정 저장이 daemon 자동 재시작이나 Agent 종료를 일으키지 않는다.

Web terminal theme은 외부 cmux/VS Code/일반 터미널의 appearance까지 바꾸는 설정이 아니다.
vendor가 명시적으로 그리는 모든 요소의 색상 변경을 보장하지 않는다. AIOX pane/탭 keybinding과
vendor Ctrl+O 등 입력·브라우저 예약 키를 구분한다.

## PTY와 Web 복귀

PTY·headless·Serialize·Web 화면 복원은 daemon 소유 terminal의 책임이다. 외부 CLI 소유
실행은 사용자 입출력을 상속하며 TerminalService에 terminal을 생성·차용하거나 화면을
이관하지 않는다. Web은 유효한 협업 등록 상태만 조회한다. 실행 위치 판정은 인증된 terminal
문맥을 사용하며 소유권은 [[docs/architecture/aiox-system]]을 따른다. [Status: As-built]
근거: [[apps/cli/src/bootstrap.ts]] `apps/cli/src/bootstrap.ts:451`,
[[apps/cli/src/external.ts]] `apps/cli/src/external.ts:12`.

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
Codex 연결은 후속 구현 대상이다. [Status: As-built]

근거: [[apps/cli/src/foreground.ts]] `apps/cli/src/foreground.ts:20`,
[[apps/cli/src/foreground.test.ts]] `apps/cli/src/foreground.test.ts:1`,
[[apps/daemon/src/agent-controller.test.ts]] `apps/daemon/src/agent-controller.test.ts:147-180`.

근거: [[apps/daemon/src/terminals.ts]] `apps/daemon/src/terminals.ts:38-115`,
[[packages/protocol/src/index.ts]] `packages/protocol/src/index.ts:44-67`,
[[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:473-552`,
[[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:293-435`.

Stage 2-1 구현은 세션당 xterm headless로 화면 상태를 유지하고, 통합 attachment가 snapshot과 이후 출력·resize·exit의 순서를 소유한다. SerializeAddon의 화면 바이트와 누락 상태 보완을 함께 전달하며 브라우저는 snapshot 크기에서 파싱과 상태 적용을 마친 뒤 실시간 이벤트를 처리한다. pane 크기 변경은 서버에 요청하고 서버의 resize 이벤트 순서에 따라 적용한다. 새 foreground 실행은 초기 PTY listener로 첫 출력부터 전달하므로 Web snapshot을 재생하지 않는다. 운영 Web의 탭·분할 배치 복귀는 별도 통합 대상이다. [Status: As-built]

복원 책임은 다음 순서로 연결된다. 화면 캡처와 live 구독을 호출자가 따로 조합하지 않고 세션의 attachment가 경계를 소유한다. [Status: As-built]

```text
PTY 출력 → 미러 제출 FIFO → 해당 시점까지 파싱 완료 → snapshot + 보류 tail
                                                    → 이후 출력·resize·exit
Web 접속 → snapshot 크기 적용 → 화면 바이트 파싱 → 누락 상태 적용
         → 보류 tail → live 연결 → 현재 pane 크기 요청
```

근거: [[packages/terminal/src/index.ts]] `packages/terminal/src/index.ts:263-334`,
[[apps/daemon/src/terminals.ts]] `apps/daemon/src/terminals.ts:299-356`,
[[apps/web/src/attach.ts]] `apps/web/src/attach.ts:145-253`.

SerializeAddon이 생략한 상태는 같은 snapshot의 보완 데이터로 전달한다. 저장 커서·문자 속성·문자 집합·스크롤 영역·탭 위치·마우스 인코딩·커서 표시뿐 아니라 프로그램이 변경한 줄바꿈 모드와 커서 깜빡임도 복원한다. 미러와 Web의 초기 커서 깜빡임은 모두 켜짐으로 맞추고, 이후 프로그램의 모드 변경을 따른다. 셀 읽기·패치에는 독립 작업 셀을 사용하며 xterm이 erase에 사용하는 공유 빈 셀을 변경하지 않는다. [Status: As-built]

근거: [[packages/terminal/src/serialization.ts]] `packages/terminal/src/serialization.ts:97-165`,
[[packages/terminal/src/restore.ts]] `packages/terminal/src/restore.ts:109-228`,
[[packages/terminal/src/serialization.test.ts]] `packages/terminal/src/serialization.test.ts:45-82`의 모드 왕복 및 `packages/terminal/src/serialization.test.ts:504-538`의 snapshot 이후 erase 회귀 검사.

미러의 출력 제출 FIFO와 파싱 완료 대기는 분리한다. 연속 출력은 청크마다 파싱 타이머를 기다리지 않고 순서대로 제출하되, snapshot·resize·dispose는 앞선 파싱 완료를 기다린다. 세션 소유자는 실제 PTY exit 뒤 대기 중인 복원과 출력 처리가 끝난 다음 미러를 dispose한다. 브라우저 detach는 이 정리의 계기가 아니다. [Status: As-built]

native PTY에서 읽었지만 미러 처리가 끝나지 않은 출력이 1 MiB 이상이면 읽기를 pause하고, 512 KiB 이하로 줄면 resume한다. 이는 미완성 시퀀스 복원 tail의 1 MiB·1,024개 이벤트 제한과 별도이며, 느린 Web 연결의 출력 누적 제한·재접속 계약은 [[docs/specs/aiox-configuration-web]]를 따른다. [Status: As-built]

복원 상태에는 각 버퍼의 baseY를 포함한다. 재생 후 대상 baseY가 다르면 저장 커서와 hidden/styled 셀·링크의 절대 행 번호를 적용하기 전에 거절한다. 스크롤백 용량이 달라도 실제 히스토리가 동일하면 허용하며, 잘린 히스토리에 저장 커서만 재배치해 성공으로 처리하지 않는다. [Status: As-built]

근거: 제출·파싱 경계는 [[packages/terminal/src/boundary.ts]] `packages/terminal/src/boundary.ts:69-112`, `packages/terminal/src/boundary.ts:186-224`; 세션 정리는 [[apps/daemon/src/terminals.ts]] `apps/daemon/src/terminals.ts:115-128`, [[packages/terminal/src/index.ts]] `packages/terminal/src/index.ts:345-348`; PTY pause/resume 검증은 [[packages/terminal/src/index.test.ts]] `packages/terminal/src/index.test.ts:525-582`; 히스토리 차이 거절과 용량 차이 허용은 [[packages/terminal/src/serialization.test.ts]] `packages/terminal/src/serialization.test.ts:45-99`.

terminal 패키지의 ESM 빌드는 CJS인 `@xterm/headless`만 번들에 포함해 배포 실행의 import 호환성을 유지한다. native `node-pty`는 외부 의존성으로 둔다. [Status: As-built] 근거: [[tsup.config.ts]] `tsup.config.ts:12-16`.

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

## 관측에서 알림까지

```text
Binding / hooks / process 관측
 → daemon Runtime projection / 연결 가능한 입력 관측
 → 연결된 요청 결과 + 전송 시점 관계 → 원 발신자에게 daemon 메시지
 → Gateway 사용자 알림 후보
 → 사용자 실제 focus 판정
 → 미확인 목록·읽음 저장 / Web 표시·소리
```

승인·질문·리밋·중단은 Runtime/Web 알림 대상이며 사용자 직접 작업에서도 발생한다. 특정
delivery 실패로 귀속하려면 입력 연결 근거가 있어야 한다. 일반 vendor 도구 오류를 모두 AIOX
오류로 만들지 않는다. 입력 수락·응답 종료·Agent send 응답·작업 성공은 서로 다르다.

알림 클릭은 해당 terminal 이동+읽음 처리다. 전체 확인은 현재 미확인 항목을 읽음 처리한다.
읽음은 승인이나 실제 문제 해결이 아니므로 요청이 살아 있으면 Runtime 대기 표시도 유지한다.

| 실제 사용자 상태 | 처리 |
| --- | --- |
| 활성 창·활성 tab에서 같은 terminal focus | 추가 팝업·소리·미확인 항목 억제, TUI/상태는 표시 |
| 다른 terminal focus | 대상 알림을 미확인 목록에 추가 |
| background tab/window | 선택된 pane만으로 읽음 판정하지 않음 |
| Web 닫힘 | daemon이 미확인 알림 유지, 재방문에 표시 |

짧은 시간의 여러 알림은 항목을 남기고 소리를 묶는 방향이다. 묶음 시간, 같은 요청의 반복
알림 갱신, multi-tab 단일 재생 주체는 구현 제안이며 정확한 수단은 미결이다. Web Audio는
후보이고 autoplay를 위한 사용자 활성화 UX를 고려한다. Web이 닫힌 상태의 native OS 알림음을
추가 요구로 만들지 않는다.

## Web 상태와 라이브러리

Stage 2 최소 Web은 plain TypeScript + Vite + xterm/addon-fit이다. HTTP polling으로 terminal·Agent·미확인 알림을 조회하고 일반 shell 생성 및 terminal 선택·WS 연결을 제공한다. 같은 terminal의 Agent 교체는 살아 있는 attachment를 다시 만들지 않으며 끊긴 연결은 재선택할 수 있다. 공통 transport와 attachment 수명을 확인하는 범위여서 DOM·브라우저 API를 사용했으며 React·공유 상태 계층을 추가하지 않았다. 운영 React Web 방향을 폐기한 선택이 아니다. 아래 운영 UI·설정·다국어·상세 알림 UX는 후속 구현 대상이다. [Status: As-built]

근거: [[apps/web/src/main.ts]] `apps/web/src/main.ts:49-85`, `apps/web/src/main.ts:193-212`, [[apps/web/src/attach.ts]] `apps/web/src/attach.ts:38-131`; Node DOM 대역 검증은 [[apps/web/src/main.test.ts]] `apps/web/src/main.test.ts:38-151`. 실제 브라우저 UI 검증은 macOS Chrome에서 shell 생성·선택·입출력·resize·재연결(attachment 해제 후 실행 생존)·종료를 확인했다. Windows/Linux 네이티브 브라우저 교차 검증은 아직 하지 않았다.

Sources: `logs/2026-09-07-AIOX-TUI-Stage2-Daemon-MCP-Terminal.md` 2026-09-09 13:40 W1 실제 브라우저 검증 entry.

운영 Web은 Tailwind·shadcn/ui와 다국어를 제공한다. React/Vite는 재사용 후보이며 use-intl,
한국어/영어 시작은 제안이다. 공개 site의 Next.js/next-intl 선택과 운영 Web은 독립적이다.
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
Windows native daemon은 일반 stop에서도 작업 상태를 검사하지 않고 native PTY 종료 경로를
사용한다. PowerShell PSReadLine handshake와 CMD idle 조사 테스트는 제거했으며 Web shell 기본값을
PowerShell로 강제하지 않는다. 과거 PSReadLine2.4.5 Windows CI 및 CMD 반례 결과는 Stage2-2
로그에 당시 정책의 검증으로 보존한다. Windows 사용자 실측에서는 일반 stop·force 각각의
shell PTY child/grandchild와 별도 외부 owner의 foreground/helper 트리 종료를 확인했다.
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
