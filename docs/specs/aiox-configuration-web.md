# AIOX Configuration and Web Contract

Status: Committed target

이 문서는 사용자 전역 설정, 저장 범주, 운영 Web의 terminal 복귀·알림·설정 UX를 소유한다.
실행 종료는 [[docs/specs/aiox-runtime]], 작업 공간·manifest는 [[docs/specs/aiox-host]],
메시지 관측 의미는 [[docs/specs/aiox-collaboration]]을 따른다. 화면 레이아웃, 사이드바·헤더·
pane/탭 조작, 빈 화면 문구와 창 폭 반응형은 [[docs/specs/aiox-web-ui]]가 소유한다.

## 전역 설정과 저장 경계

터미널·keyboard·daemon 및 운영 Web 포트는 **사용자 전역 설정 파일 하나**로 모든 프로젝트,
Host, standalone에 적용한다. 프로젝트별 override는 두지 않는다. 설정 위치는 실행 환경의
사용자 홈 아래 `.aiox/config.<확장명>`이며 npm 설치 경로나 프로젝트에 저장하지 않는다.
Stage 1 구현에서는 Node 기본 JSON 처리로 `.aiox/config.json`을 선택했다. Host YAML은 실행 정의이며
사용자 취향 설정과 별개다.

| 데이터                                                           | 저장 책임                        | 확정 범위와 남은 선택                                 |
| ---------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------- |
| terminal font/color/cursor/theme, keyboard, 포트                 | 전역 설정 파일                   | JSON·기본 schema 구현. 상세 UI schema는 후속 확장     |
| Web theme                                                        | 전역 config의 `appearance.theme` | `system/light/dark`, terminal palette와 별개          |
| 사이드바 너비·열림 상태, keybindings 변경분                      | 전역 설정 파일                   | `web.sidebar.width`/`web.sidebar.open`, `keybindings` |
| 지속 Network/Route, AIOX 메시지·대상별 결과·알림 본문, 실행 이력 | SQLite                           | 메시지 처리 종료 후 기본 30일 보존                    |
| 알림·읽음, terminal/workspace 배치                               | SQLite                           | 브라우저 복귀에 필요한 지속 데이터                    |
| 살아 있는 process/binding/token/status                           | 실행 상태                        | DB의 과거 running 기록을 생존 증거로 쓰지 않음        |

저장소는 전역 설정 파일과 SQLite 둘뿐이다. 운영 Web은 브라우저 저장소를 쓰지 않으며
`localStorage`·`sessionStorage`·cookie 어디에도 설정, 사이드바 너비·열림 상태, theme을 남기지
않는다. 차용한 UI 컴포넌트가 상태를 cookie에 쓰면 그 경로를 제거하고 전역 config로 보낸다.
[Status: Normative]

vendor transcript·reasoning 전체 복제나 무제한 메시지 본문 저장을 요구하지 않는다. 저장한
메시지의 자동 재전송도 허용하지 않는다. Host YAML과 DB의 materialization/history를 이중
정의 권위로 만들지 않는다.

SQLite는 Windows/Linux/macOS에서 공통 domain/schema와 DB 초기화 경로를 사용한다. DB 접근은
daemon의 persistence 책임이며 CLI/Web/adapter가 파일을 직접 수정하지 않는다. 실제 DB 경로
`.aiox/aiox.db` 기본 경로 연결·드라이버와 현재 검증 범위는 [[docs/architecture/aiox-storage-terminal]]을 따른다. WAL은 미결이다. Windows와
WSL 홈·DB를 자동 공유한다고 가정하지 않는다. DB 준비 실패를 정상 기동이나 빈 DB fallback으로
숨기지 않고 기존 파일을 자동 삭제하지 않는다.

## 공통 shell 화면과 설정

일반 terminal과 Host는 공통 영역·영역별 탭을 사용한다. Network 조회는 Agent·route 조회이며
화면 분할로 Host나 Network를 만들지 않는다. terminal 수명은 runtime, Host 최초 layout은 host
계약을 따른다.

Web shell의 `aiox agent run --network`는 지정한 Network panel에 나타난다. 그 panel 안에서
실행하면 호출한 shell을 그대로 vendor 화면에 사용한다. 다른 workspace에서 실행하면 대상 panel에
탭과 별도 shell을 만들고, Agent 준비 결과를 받은 호출 CLI는 원래 shell로 복귀한다. shell 생성만으로
성공을 반환하지 않으며, 준비 실패는 호출 CLI와 대상 탭에 전달한다. 명령을 친 원래 shell은 종료하지
않는다. 외부 OS 터미널 실행은 [[docs/specs/aiox-runtime]]의 외부 소유권 계약을 따른다. Host panel의
자리 선택과 stopped 탭 재사용은 아래 Host panel과 Agent terminal UX가 소유한다. [Status: Current]
근거: [[apps/daemon/src/network-agent.ts]], [[apps/daemon/src/network-agent.test.ts]],
[[apps/daemon/src/agent-controller.test.ts]].

사이드바 너비는 전역 `web.sidebar.width`로 저장한다. 양의 유한수이며 화면 기본값은 240,
드래그는 최소 180이고 상한은 뷰포트 폭의 90%다. 열림 상태는 `web.sidebar.open`으로 같은 파일에 저장한다.
Host 초기 기본값은 전역 `host.layout`이며 DB에 중복 저장하지 않는다. 실행 중 분할 비율·탭
순서의 서버 복원은 초기 설정 저장과 별개다. 활성 pane·선택 탭은 각 React 앱의 메모리 상태이며
새로고침 시 초기 선택으로 돌아간다. 선택은 서버나 브라우저 영속 저장소에 저장하지 않는다.

### 화면 조작 keybindings

기존 `keyboard` 문자열 맵은 보존한다. 새 `keybindings`는 사용자 AIOX 화면 조작 재지정
책임이며 기존 keyboard를 임의 alias로 바꾸지 않는다. 브라우저 OS를 기준으로 키를 적용하고
vendor 입력·브라우저 예약키를 보존한다.

기본키는 코드가 제공하고 파일에는 사용자 변경분만 저장한다. 전체 기본값을 파일에 복사하게
만들지 않는다. 열한 개 조작이 모두 재지정 대상이다. [Status: Committed target]

| 조작             | action id                                      | macOS                       | Windows/Linux                  |
| ---------------- | ---------------------------------------------- | --------------------------- | ------------------------------ |
| 새 shell 탭      | `newShell`                                     | `Cmd+Shift+S`               | `Ctrl+Shift+S`                 |
| 오른쪽 분할      | `splitRight`                                   | `Cmd+D`                     | `Ctrl+Shift+D`                 |
| 아래쪽 분할      | `splitDown`                                    | `Cmd+Shift+D`               | `Ctrl+Shift+E`                 |
| 탭 전환          | `switchTab`                                    | `Cmd` + `1`~`9`             | `Ctrl+Shift` + `1`~`9`         |
| 탭 닫기          | `closeTab`                                     | `Cmd+Shift+X`               | `Ctrl+Shift+X`                 |
| 방향 포커스 이동 | `focusLeft`·`focusDown`·`focusUp`·`focusRight` | `Cmd+Alt` + `H`·`J`·`K`·`L` | `Ctrl+Shift` + `H`·`J`·`K`·`L` |
| 영역 확대·복귀   | `zoomPane`                                     | `Cmd+Shift+M`               | `Ctrl+Shift+M`                 |
| 크기 균등화      | `equalizeSizes`                                | `Cmd+Shift+=`               | `Ctrl+Shift+=`                 |
| 현재 영역 강조   | `flashPane`                                    | `Cmd+Shift+P`               | `Ctrl+Shift+P`                 |
| 사이드바 토글    | `toggleSidebar`                                | `Cmd+B`                     | `Ctrl+Shift+B`                 |
| 커맨드 팔레트    | `openPalette`                                  | `Cmd+K`                     | `Ctrl+K`                       |

`openPalette`은 커맨드 팔레트와 함께 보류이므로 지금 바인딩하지 않는다. 팔레트를 만들 때
표의 나머지와 같은 재지정 대상이 된다. 보류 근거는 [[docs/specs/aiox-web-ui]]가 소유한다.
[Status: Open/deferred]

`switchTab`의 마지막 자리 `9`는 마지막 탭이다. `switchTab`만 저장 값이 수식자 부분이고
숫자 자리는 고정이며, 나머지는 완성된 조합 하나를 저장한다.

Windows/Linux 기본키를 macOS에서 `Cmd`→`Ctrl`로 일괄 치환해 만들지 않는다. Windows/Linux에서
PTY로 바이트가 나가지 않는 수식자 층은 `Ctrl+Shift`뿐이고 `Alt`가 끼면 `ESC`+문자가 나가므로,
1:1 치환은 `Ctrl+D`·`Ctrl+B`·`Ctrl+K`·`Ctrl+3`~`Ctrl+8`·`Ctrl+Alt`+문자에서 터미널 입력을
빼앗는다. `openPalette`의 `Ctrl+K`만 웹 관례 때문에 이 규칙의 예외이며, 렌더러에서 가로채
xterm에 전달하지 않는다.

근거는 `@xterm/xterm@6.0.0`의 `evaluateKeyboardEvent`다. `default` 분기가
`(isMac && !macOptionIsMeta) || !altKey || metaKey`로 갈리므로 Windows/Linux는 `!altKey`로만
바이트 없는 경로에 들어간다.

브라우저·OS 예약키 충돌은 CDP 주입으로 관측되지 않아 사용자 직접 입력으로만 판정한다. macOS는
위 표의 자리가 실측으로 통과했다. Windows/Linux는 구현 후 실측하며, 확인된 잔여 후보 충돌은
Firefox의 `Ctrl+Shift+K` 웹 콘솔 하나다. 충돌이 드러나면 해당 조작만 재지정한다.

### 터미널 입력 바인딩 [Status: Current]

`terminal.keybindings`는 화면 조작용 `keybindings` 및 기존 `keyboard`와 별개인 터미널 입력 설정이다. `mac`·`windows`·`linux` 아래에 `키 조합: 전송 문자열 | null` 변경분만 저장한다. 플랫폼은 daemon이나 shell의 OS가 아니라 브라우저 OS다. Windows 브라우저에서 WSL/WSL2에 연결하면 `windows`를 적용한다.

macOS 기본값은 `Alt+ArrowLeft` → `ESC b`, `Alt+ArrowRight` → `ESC f`, `Cmd+ArrowLeft` → Ctrl+A, `Cmd+ArrowRight` → Ctrl+E, `Cmd+Backspace` → Ctrl+U다. 실제 편집 동작은 shell/TUI의 키맵에 따른다. Windows/Linux는 추가 편집 기본값 없이 xterm의 기본 인코딩을 사용한다. 일반 방향키·Enter·Tab·Escape·Delete·Ctrl+문자·Alt+Backspace는 기본값 표에 중복 등록하지 않는다. 기존 복사·붙여넣기 처리는 유지한다.

키 조합은 `Ctrl`·`Alt`·`Shift`·`Cmd` modifier와 문자 또는 `ArrowLeft`·`Backspace` 같은 키 이름을 사용한다. modifier 순서는 무관하며 문자는 대소문자를 구별하지 않는다. `Alt`는 macOS Option, `Cmd`는 브라우저 Meta다. 중복 조합·잘못된 modifier·빈 전송 문자열은 거절한다. `null`은 입력을 삼키는 동작이 아니라 해당 AIOX 바인딩을 해제하고 xterm 기본 처리로 복귀시키는 뜻이다. 다음 설정은 한 조합만 해제하며 나머지 기본값은 코드에서 적용한다.

```json
{ "terminal": { "keybindings": { "mac": { "Alt+ArrowLeft": null } } } }
```

전송 문자열은 JSON escape를 사용한다. 예를 들어 `"\u001bb"`는 ESC+b를 뜻한다. 사용자 config에 기본값 전체를 자동 저장하지 않는다. Web은 연결 시 `config.read`로 설정을 읽으므로 파일을 수정한 뒤 Web 새로고침/앱 연결 복구 시 반영한다. 새 설정을 읽었다는 이유만으로 살아 있는 터미널 attachment를 교체하지 않는다. IME가 처리하는 문자 키(keyCode 229)와 AltGraph 입력은 기존 xterm 경로에 남긴다. 조합 중이거나 조합 종료 전송이 대기 중일 때 등록한 이동·삭제 단축키를 누르면 xterm의 조합 확정 처리를 먼저 거쳐 마지막 글자 → 단축키 순서로 전달한다. 처리한 키와 조합 문자는 중복 전송하지 않는다.

### 새 Web shell의 실행 설정

공통 config.json의 terminal.shell, terminal.args, terminal.cwd는 모든 OS에서 선택적이다.
shell은 실행 파일 이름/경로, args는 인자 배열, cwd는 선택한 shell의 시작 폴더다. 생략하면 기존
OS shell 및 daemon 작업 경로를 사용한다. Windows 기본은 COMSPEC 또는 cmd.exe이고 POSIX는
SHELL 또는 /bin/bash다. 시작한 터미널의 화면·shell 상태를 복제하지 않는다.

Web의 새 탭·분할은 조작한 pane의 선택된 탭을, 새 workspace는 현재 화면의 활성 pane에서
선택된 탭을 경로 상속 기준으로 사용한다. 생성 요청은 기준 panel·terminal ID를 함께 보내고,
서버는 소속을 확인한 뒤 기준 shell의 현재 경로를 재조회하여 생성 cwd override로 사용한다.
기준이 없으면 기존 Host/명시 요청 경로 → config의 terminal.cwd → daemon 작업 경로 순으로
결정한다. 기준 terminal이 없어졌거나 선언한 기준 panel에 속하지 않으면 생성 요청을 거절한다.
탭·분할 추가의 기준은 대상 panel 안에 있어야 하며, 새 workspace는 기존 panel을 기준으로 삼는다.
조회 실패 시 기준 shell의 마지막 확인 경로(아직 확인한 적 없으면 생성 경로)를 사용하되,
최종 경로의 디렉터리·접근 검증은 생략하지 않는다. 브라우저의 선택 상태를 서버에 저장하지 않는다.
[Status: Current] 근거: [[apps/daemon/src/web-commands.ts]], [[apps/daemon/src/web-commands.test.ts]],
[[packages/protocol/src/host.ts]], [[apps/web/src/pages/workspace/workspace-page.tsx]],
[[apps/web/src/app/app-shell.tsx]].

새 shell 생성 시 파일의 실행 설정을 읽고 기존 터미널은 바꾸지 않는다. Web 표시 설정의 파일 watch나
자동 배포까지 의미하지 않는다. 명시적 생성 요청 cwd는 전역 기본 cwd보다 우선한다. Vendor 실행
PTY에는 일반 Web shell 설정을 적용하지 않는다. daemon 시작은 설정 구조 검증과 기본값 결정 뒤
shell 실행 파일 및 cwd 디렉터리·접근 여부를 확인하고, 실패하면 DB와 listener 준비 전에 중단한다.
새 shell 생성도 최종 요청 cwd를 포함한 같은 검증을 통과해야 하며 실패해도 기존 실행은 유지한다.
검증한 실행 파일·인자·cwd로 실행하며 검증 이후의 native 실행 오류 처리도 유지한다.
파일 존재·권한 검사가 실행 파일 형식이나 초기화 성공까지 보장하지는 않는다. Windows 실행 파일
ACL 검증은 사전 보장 범위 밖이며 실제 실행 실패로 처리한다. NUL 등 실행 인자 경계 검증은 유지한다.

새 shell 생성 API는 서버 설정 오류를 `500 / invalid_config`, 명시적 요청 cwd의 확인된
오류를 `400 / invalid_request`로 반환한다. 검사 프로세스 timeout처럼 원인이 확인되지 않은
검증 실패는 요청 cwd 오류로 단정하지 않고 `500 / invalid_config`로 반환하며 진단을 보존한다.
예상하지 못한 실제 실행 오류는 `500 / internal_error`다. [Status: Current]
근거: [[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:388-416`,
[[apps/daemon/src/http.ts]] `apps/daemon/src/http.ts:123-131`,
[[apps/daemon/src/terminals.test.ts]] `apps/daemon/src/terminals.test.ts:101-248`.

Windows에서 wsl.exe를 선택하면 args로 배포판을 지정하고 cwd는 해당 Linux 경로로 전달한다.
Windows PTY의 작업 경로와 Linux 시작 경로를 구분하며 AIOX가 드라이브 문자열을 수동 변환하지 않는다.
배포판·사용자 선택을 반영한 내부 디렉터리 검사를 수행하고 확인된 Linux cwd를 실행에 전달한다.
cwd 생략 시 host cwd에서 WSL이 선택한 디렉터리를 확인한다. 검증은 사용자 실행 명령을 실행하지
않으며 해석할 수 없는 WSL 실행 옵션은 설정 오류로 거절한다. 설정은 WSL 설치·버전 변환·혼합 협업 지원을
완료시키지 않으며 Windows daemon의 종료 정책은 runtime 계약을 따른다.

CLI·YAML·전역 config 모두 grid만 지정하고 columns와 rows를 모두 생략한 입력은
검증 단계에서 오류다. 다른 계층의 값이나 기본값으로 보완하지 않는다. columns 또는 rows 중 하나라도
유효한 양의 정수로 지정하면 검증을 통과한다.
이는 목표 계약이며 현재 config parser의 구현 완료를 뜻하지 않는다.

## Host panel과 Agent terminal UX

Panel은 사이드바에서 선택하는 작업 화면, pane은 분할 영역, tab은 pane 안의 terminal이다.
HOSTS의 `[+]`는 사용자 workspace를 만들고, Host CLI run은 별도 실행 panel을 만든다.
Mockup의 더미 Host/Network 관계를 실제 실행 계약으로 해석하지 않는다. 운영 Web은 React로 구현한다.

Host Agent는 shell 안에서 실행된다. 관리 Agent 목록은 열려 있는 탭만으로 만들지 않고 실제 적용된
Host Agent 구성에서 만든다. 아직 적용하지 않은 YAML 파일 편집을 현재 구성으로 표시하지 않는다.
Agent 탭을 닫아도 관리 항목과 YAML 정의는 없어지지 않는다. 실행이 없는 stopped 표시는
실시간 activity의 다섯 status 값과 별개다.

| 사건                   | 탭 본문과 수명                                                                    |
| ---------------------- | --------------------------------------------------------------------------------- |
| 정상 `/exit`           | 실제 Agent 종료 확인 후 기존 shell 표시, 관리 Agent는 stopped                     |
| 명시 Agent/Host stop   | shell·terminal·탭 유지, 본문에 `Agent has stopped.`와 시작 명령·Copy 표시         |
| 비정상 종료            | `Agent exited unexpectedly.`와 실제 이유·시작 명령·Copy                           |
| Agent 시작 실패        | `Agent failed to start.`와 실제 이유·시작 명령·Copy                               |
| Copy                   | 명령 복사 후 안내 해제, 같은 기존 shell 표시. 새 shell·탭 생성이나 자동 실행 없음 |
| stopped 안내의 ×       | 확인 없이 기반 shell과 탭을 정리. 마지막 탭이면 빈 panel/pane과 [+] 유지          |
| 살아 있는 Agent 탭의 × | 종료 확인을 거쳐 실제 종료·정리가 확인된 뒤 닫기. 실패하면 이유와 대상 유지       |

안내는 종료 직전 TUI 출력을 대체한다. 명령에는 대상 YAML을 다시 선택하는 데 필요한 `--path`와
`--file`을 포함한다. Copy는 명령 복사와 기존 shell 표시만 수행하며, 사용자가 붙여 넣어 실행하면
그 명령의 일반 YAML 선택 규칙을 그대로 적용한다. 원래 탭의 Host와 현재 YAML의 Host 이름이
달라졌다는 이유로 거절하거나 원래 Host로 강제 지정하지 않는다. 실행 시 YAML이 review를 가리키면
review가 대상이며, 입력 shell이 dev panel이면 다른 Host panel에서 실행한 배치 규칙을 따른다.
원래 dev의 Agent를 자동 재시작하는 의미는 아니다. Restart 버튼은 추가하지 않는다. shell의 살아 있는 프로세스와 Agent 실행의
종료를 구분하며, stopped 탭을 닫는다고 YAML의 Agent 정의나 Host Network를 삭제하지 않는다.

```text
TUI → 정상 /exit → 기존 shell
TUI → 명시 stop → stopped 안내 → Copy → 기존 shell
stopped 안내 → Agent 시작 준비 → TUI 또는 시작 실패 안내
```

같은 Host panel의 shell에서 해당 Agent 시작 명령을 실행하면 그 입력 자리에 TUI를 표시한다.
복수 Agent는 첫 실행을 입력 자리에, 나머지는 panel의 다음 순서에 배치한다.
입력 shell의 준비 과정은 shell 출력을 유지하며 라벨에 preparing을 표시한다.
외부 터미널·다른 panel에서 실행하면 대상 Host panel의 해당 stopped 탭을 재사용하거나 순차로 새 탭을 만든다.
같은 cwd만으로 다른 panel의 shell을 사용하지 않는다.

같은 Agent가 다른 shell에서 준비를 시작해도 옛 stopped 안내를 미리 지우지 않는다.
새 TUI가 연결되면 옛 안내 탭을 제거한다. 새 자리에서 시작에 실패하면 그 자리에 실패 이유를
표시하고 옛 stopped 안내 탭은 그대로 둔다. 실패를 이유로 옛 탭을 삭제하거나 실패 안내로 통합하지 않는다.
이미 Copy나 /exit으로 일반 shell이 된 탭도 보존한다.

최초 layout은 host spec의 CLI > YAML > 전역 설정 > auto 순서를 따른다.
Grid는 상속 후 빠진 한쪽 치수만 1로 채운다. 이는 최초 배치이며 기존 panel의 pane 수·분할·탭을
그 치수에 맞춰 다시 만들지 않는다. 전체 restart도 탭이 남아 있으면 현재 pane·분할 비율을 유지한다.
예외적으로 완전히 빈 Host panel의 전체 restart는 최신 유효 layout의 최초 배치를 복원한다.
빈 상태 판정과 설정 해석은 [[docs/specs/aiox-host]]를 따른다. 이후 추가는 현재 panel의 실제 구성과 아래 순서를 따른다. 새 탭은 현재 화면의
위→아래·왼쪽→오른쪽 pane 순서로 순환 추가하고 기존 탭을 재정렬하지 않는다.
2×2는 좌상→우상→좌하→우하이며 수동 분할 후에도 현재 화면 순서를 사용한다.
이는 auto를 포함한 모든 preset에 적용한다. 최초 auto의 4개 pane은 개수 제한이 아니며,
사용자의 생성·삭제·이동·분할 후 현재 존재하는 pane 순서에 새 탭을 배치한다.
전체 restart의 같은 key 탭 재사용과 제거 Agent shell 정리는 host spec을 따른다.
Host 이름 변경은 별도 panel 생성, YAML 읽기·사전 검증 실패는 기존 화면 유지와 CLI 오류 안내다.

Host stop은 YAML Agent만 멈추며 사용자 shell·panel·Network를 유지한다.
Host delete 확인은 사용자 추가 shell과 내부 작업까지 종료되고 panel·Network가 삭제됨을 알린다.
실제 정리 완료를 확인하기 전에 panel을 지우지 않는다. YAML 파일은 유지한다.

## 메시지 보존과 persistence 전환

AIOX send 원문과 daemon 알림 본문을 저장하고 발신자·대상·시각·대상별 처리 결과·내부 상관관계를 연결한다. vendor 전체 대화·reasoning·터미널 출력은 이 메시지 저장 범위에 포함하지 않는다. 살아 있는 PTY의 Web 화면 복귀 책임은 별개다. 저장 데이터를 자동 재전송·실행 복원에 사용하지 않는다.

보존 기본값은 요청 처리 종료 후 30일이다. 진행 중 요청은 삭제하지 않고, 정리 대상 요청의 본문·대상별 결과·연결된 daemon 알림을 함께 정리한다. 여러 대상의 처리가 남은 요청을 일부 완료만으로 삭제하지 않는다. 보존 일수는 전역 설정으로 변경하며 daemon 시작 시와 하루 한 번 정리한다. Host 종료 자체로 이력을 지우지 않는다. 이 정책은 persistent Network·route 정의, YAML·사용자 작업 파일을 삭제하거나 디스크 용량 상한을 보장하는 정책이 아니다.

Persistent Network 이름은 DB에 지속한다. 참여 실행의 route 수명과 daemon 재시작 정리는 [[docs/specs/aiox-host]]의 Routing·종료 계약을 따른다. Host의 정의 원본은 YAML이다. Host stop은 전용 Network와 적용 정책을 보존하며 delete에서 정리한다. DB 이력은 살아 있는 membership이나 Host 복원 근거가 아니다.

새 Network·Message·Delivery·Notification 행의 ID는 UUID v7으로 생성한다. 기존 ID를 재발급하지 않으며 Runtime·terminal 참조 ID와 vendor 고유 ID의 형식은 별개다.

저장 계층은 typed Drizzle과 Effect SQLite를 사용하며 원자적 transaction을 유지한다. 빈 DB를 현재 schema로 직접 초기화하고 저장·조회·재오픈을 검증한다. 첫 배포 전 개발 DB 변경 원칙은 [[AGENTS]]의 Development Database Before First Release를 따른다. startup에서 기존 schema를 자동 변경하거나 데이터를 삭제하지 않는다. 현재 초기화 구현과 검증 근거는 [[docs/architecture/aiox-storage-terminal]]의 이력 보존과 ORM 전환을 따른다.

## 기반 구현과 검증 범위

`packages/config`는 JSON 검증·load/save·last-good session을 제공한다. 구현 기본 포트는 daemon
4500, Web 4501이며 시작 설정의 해석 우선순위는 CLI override → 파일 → 기본값이다. 재시작의 새 설정 사용·이전 override 변경 안내와 현재 daemon 조회는 runtime의 시작·준비·상태 조회 계약을 따른다. listener 연결과 최소 Web 정적 파일 제공은 Stage 2에 구현됐으며 [[docs/architecture/aiox-system]]의 현재 조립 범위를 따른다.
운영 Web 설정 조회·저장은 후속 구현 대상이다. 기존 terminal 표시 필드와 keyboard 문자열 맵은 보존하며, 상세 UI와 바인딩은 해당 단계에서 구체화한다.
`web.sidebar.width`·`host.layout` 검증과 공통 layout 해석은 구현돼 있다. `parseHostLayout`과
`resolveHostLayout({ cli, yaml, global })`은 Host parser·CLI 연결이 재사용할 공개 함수이며
배치 계산·누락 grid 치수의 기본값을 만들지 않는다. [Status: Current]
근거: [[packages/config/src/schema.ts]] `packages/config/src/schema.ts:180-279`,
[[packages/config/src/schema.test.ts]] `packages/config/src/schema.test.ts:28-120`.

이전 Stage 1 검증에서는 better-sqlite3 12.11.1로 persistent Network/Route와 최초 migration·
transaction·close/reopen을 검증했다. 당시 Node 요구 조건은 >=22.12.0이며 Windows/Linux/macOS × Node22/24 CI에서
설치·빌드·타입 검사·테스트·CLI 진단을 통과했다. vendor/PTY/WSL과 npm 전역 배포 검증은 후속 단계다.
근거: [Stage 1 CI](https://github.com/lunaxislu/aiox-prototype/actions/runs/34189231508).

## 파일·Web 편집과 적용

설정 동기화는 조회·저장 모델이다. watcher·설정 SSE를 추가하지 않는다.
Web 최초 로드·Settings 열기·저장 직전에 파일을 조회하고, 외부 편집은 다음 조회에 드러난다.
저장한 브라우저는 즉시 반영하며 다른 브라우저 탭은 다음 조회에서 반영한다.
미리보기는 저장과 구별하고 Revert/Discard로 조회 기준값에 복귀한다.
잘못된 파일은 마지막 유효 표시를 유지하며 오류를 보인다. CLI 명령은 last-good로 계속하지 않는다.
포트는 다음 daemon 시작, shell 실행 설정은 다음 shell 생성, layout은 다음 최초 Host 배치에
적용한다. 기존 실행·배치를 설정 저장만으로 바꾸지 않는다. 폰트 변경은 fit/resize를 수행한다.
Web theme은 전역 `appearance.theme`이며 헤더 토글도 같은 필드를 즉시 저장한다.

터미널 배경색은 `terminal.theme.background`가 있으면 그 설정을 우선한다. 설정이 없으면
shell/program의 OSC 배경색 지정·초기화를 따르고, 지정도 없으면 xterm 기본 배경색을 쓴다.
터미널 사방 24px 여백과 정수 행 계산 뒤 남는 공간은 실제 터미널 배경색을 따른다.
재접속은 마지막 shell 배경색을 복원하되 현재 Web/config의 명시 설정이 우선한다.
macOS Terminal·iTerm 등 다른 앱의 테마를 자동으로 읽는 기능은 아니다.
현재 Web은 앱 연결 후 `config.read`로 이 설정을 읽으며, Settings 편집 UI는 별도 후속 범위다.
근거: [[apps/web/src/app/application-config.tsx]], [[apps/web/src/terminal-theme.ts]],
[[apps/web/src/terminal-theme.test.ts]], [[packages/terminal/src/serialization.test.ts]].

Sources: `logs/2026-09-09-AIOX-TUI-Stage6-Web.md`의 모델 B·전역 theme 확정 기록,
2026-09-21 Stage5 W1 사용자 재확인. 세부 UI/단축키 후속은 Stage6 범위다.

## 포트와 운영 Web

daemon 포트와 Host·standalone이 공유하는 운영 Web 포트는 각각 기본값 및 전역 설정·CLI 시작
override를 지원해야 한다. config 구현 기본값은 daemon 4500·Web 4501이고 우선순위는
`CLI > config > default`다. 현재 CLI 옵션·listener 연결은 system architecture의 구현 근거를 따른다. Host마다 Web 서버를 만드는
계약은 아니다. 개발 Vite port와 배포 운영 Web port를 혼동하지 않는다.

저장된 포트는 다음 daemon 시작에 적용하며 실행 중 MCP 연결을 즉시 이동시키지 않는다.
브라우저 origin 변경 시 전역 설정 재조회와 실제 실행 endpoint 발견은 구현에서
정한다. 이를 별도 사용자 로그인·token 입력 절차로 해결하지 않는다.

운영 Web은 React·Tailwind·shadcn/ui를 사용하고 UI 문구는 영어로 고정한다. cmux의 pane·tab·window
UI/UX를 화면 구성과 조작의 참고로 삼으며 실행 소유권이나 배치 정책까지 그대로 복제하지 않는다.
Vite와 Zustand/TanStack Query는 후보이며 확정된 필수 목록이 아니다. 운영 Web 다국어는 범위에서 제외한다. vendor 출력
원문과 제품 UI의 번역을 구분한다. 공개 AIOX 사이트는 별도 앱이며 마지막 제품 단계다.
공개 사이트를 위해 운영 Web을 Next.js로 바꾸는 요구는 없다.

Web의 탭·화면·조작과 사용자 알림은 daemon 소유 실행에 한정한다. 외부 CLI 소유 실행은
사이드바 섹션 카드의 agent 목록에 표시하되 탭·화면·조작·알림 대상에서 제외하고, 외부
terminal을 생성·조작·이관하지 않는다. 완전히 숨기면 Network workspace가 그 network의 일부만
보여 주고, 화면을 줄 수 없는 실행에 탭을 주면 빈 탭이 남기 때문이다. 아래 화면·복귀 계약도
daemon 소유 terminal에 적용한다. [Status: Committed target]

Web 전용 Agent·미확인 알림 조회와 읽음 처리는 외부 CLI 실행을 제외한다. 알림의 Web 대상과
terminal 연결은 전송 당시 발신 실행에 귀속하며 해당 실행이 협업 등록에서 사라져도 다른
실행으로 이전하지 않는다. Web 읽음 요청에 외부 알림 ID를 넣어도 외부 알림을 읽음 처리하지
않는다. 공통 CLI·협업 조회 범위를 Web 표시 범위로 축소하지 않는다. [Status: Current]

근거: [[apps/daemon/src/http.ts]] `apps/daemon/src/http.ts:346-431`,
[[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:1673-1732`.

## 살아 있는 서버로 자동 복귀

```text
Web 닫힘 → attachment 해제 → 같은 Agent/PTY 작업 지속
Web 재방문 → 자동 연결 → 현재 상태 snapshot
          → 기존 Host·Agent·배치·terminal 현재 화면·미확인 알림 복원
```

사용자에게 로그인·token 입력 등 별도 인증 절차를 요구하지 않는다. 내부 연결 보호는 이
자동 복귀 UX를 충족하도록 구현한다. Web close/unmount/disconnect를 agent.stop 또는 terminal.stop에 연결하지 않는다.
pane 선택이나 attachment가 새 vendor 실행을 뜻하지 않는다.

복원 대상은 작업 중·완료·승인 대기·idle 모두이며 닫기 직전 캡처가 아닌 **계속 진행된 동일
terminal의 현재 화면**이다. 단순 WebSocket 재접속만으로 요구를 충족했다고 간주하지 않는다.
배치 식별·저장은 구현에서 정한다. 현재 terminal 화면 유지 구조와 검증 범위는
[[docs/architecture/aiox-storage-terminal]]를 따른다. terminal headless는 LLM headless 전환과
다른 개념이며 무제한 raw 출력 저장을 요구하지 않는다.

범위는 daemon이 살아 있는 동안의 브라우저 복귀다. daemon 재시작 뒤 과거 PTY 재부착,
자동 Agent 실행이나 durable message replay는 별도 기능이며 현재 추가하지 않는다.

화면 복원·연결 실패는 해당 terminal panel에 확인한 원인과 '화면 다시 연결'·'강제 종료'를
분리해 표시한다. 재연결 중에는 이전 실패 사유와 진행 상태를 유지하고 실제 복원 완료 후
안내를 지운다. 강제 종료는 작업 중단 확인 후 해당 daemon 소유 terminal의 기존 명시 종료
경로를 호출한다. 복원 실패나 재연결 자체가 실행을 종료·재생성하지 않는다. [Status: Current]

실행 상태는 마지막 조회의 생존·종료·목록 부재와 조회 불가를 구분한다. 화면 복원 실패로
실행을 종료하지 않았다는 안내는 현재 생존이나 안전한 작업 수행의 보장이 아니다. 서버 미러
실패가 지속돼 복원할 수 없다고 확인되면 재연결을 비활성화하고 사용자 선택에 따른
종료·새 생성을 안내한다. 원인을 확인하지 못한 연결 실패를 영구 복원 불가로 단정하지 않는다. [Status: Current]

아래 `apps/web/src/main.ts`·`main.test.ts` 인용은 React 전환 전 Stage2 검증 이력이다.
해당 파일은 현재 없으며, 현재 React UI와 새 서버의 RPC·terminal 연결 검증은
[[logs/2026-09-09-AIOX-TUI-Stage6-Web]]의 W10이 소유한다.

근거: `apps/web/src/main.ts` `apps/web/src/main.ts:96-195`, `apps/web/src/main.ts:438-499`,
`apps/web/src/main.test.ts` `apps/web/src/main.test.ts:253-388`;
복원 불가 전달은 [[apps/daemon/src/terminals.ts]] `apps/daemon/src/terminals.ts:357-365`,
[[apps/web/src/attach.ts]] `apps/web/src/attach.ts:139-149`, `apps/web/src/attach.ts:264-269`.

미완성 제어 시퀀스 때문에 복원용 보관 한도를 넘으면 새 연결의 화면 복원을 일시적으로
거절하고 이유를 표시한다. 기존 PTY와 연결된 viewer의 입출력은 유지한다. 안전한 파싱
경계로 돌아오면 새 복원을 다시 허용한다. 정상적인 연속 로그 출력이나 단순한 청크 분할을
이 오류로 취급하지 않으며, 잘린 데이터를 정상 snapshot으로 전달하지 않는다.
보관 한도는 바이트와 이벤트 수를 모두 유한하게 제한한다. [Status: Current]

근거: [[packages/terminal/src/boundary.ts]] `packages/terminal/src/boundary.ts:126-213`, [[packages/terminal/src/boundary.test.ts]] `packages/terminal/src/boundary.test.ts:117-178`.

Web 연결이 실시간 출력의 파싱을 따라가지 못해 미확인 출력이 8 MiB를 넘게 되면 해당 연결만 종료한다. 오류와 재접속 안내를 표시하고 WebSocket 종료 코드는 1013을 사용한다. PTY 실행과 다른 viewer는 유지하며, 사용자는 같은 terminal에 재접속해 현재 snapshot부터 복원한다. 스냅샷과 복원 tail은 이 실시간 누적량에 포함하지 않는다. [Status: Current]

실시간 바이너리 출력 앞의 `output` 제어 프레임은 연결별 누적 바이트 끝 위치 `offset`을 전달한다. Web은 안전한 정수와 실제 바이너리 길이의 일치를 검증하고, 해당 출력의 xterm 파싱 완료 후에만 `ack`와 같은 offset을 보낸다. 수신 또는 WebSocket 전송 완료만으로 파싱을 확인하지 않는다. [Status: Current]

근거: 서버 한도·종료·재접속 검증은 [[apps/daemon/src/terminals.test.ts]] `apps/daemon/src/terminals.test.ts:1127-1215`; 파싱 완료 ACK와 복원·detach 제외 검증은 [[apps/web/src/attach.test.ts]] `apps/web/src/attach.test.ts:410-484`. 내부 미러의 처리량 제어와 복원 상태 검증은 [[docs/architecture/aiox-storage-terminal]]의 PTY와 Web 복귀를 따른다.

같은 terminal에 연결된 여러 Web 화면은 출력을 함께 보고 각각 사용자 입력을 보낼 수 있다.
live terminal 질의의 자동응답은 마지막으로 실제 입력을 보낸 연결 하나가 담당한다. 입력 전에는
첫 연결이 담당하고, 담당 연결이 닫히면 남은 첫 연결로 넘긴다. 커서 좌표나 자동응답 자체는
담당 변경의 기준이 아니다. 각 출력의 담당은 전달 도중 입력이 발생해도 바뀌지 않는다.
과거 복원 데이터의 자동응답은 PTY에 보내지 않는다. [Status: Current]

근거: [[apps/daemon/src/terminals.ts]] `apps/daemon/src/terminals.ts:242-355`, [[apps/daemon/src/terminals.test.ts]] `apps/daemon/src/terminals.test.ts:993-1091`, [[apps/web/src/attach.ts]] `apps/web/src/attach.ts:296-320`.

## 현재 상태와 요청 결과 표시

Web Agent 목록은 [[docs/specs/aiox-runtime]]의 다섯 `status`와 현재 `status_reason`을 MCP와 동일하게 표시한다. `aiox-preparing`도 그대로 노출하며 이유가 교체·제거되면 화면에 반영한다. 추론·도구 실행의 세부 내용은 working의 이유이고 Host stopped는 Host 항목 표시다. 개별 요청의 completed/failed/interrupted 이력과 현재 Agent 상태를 함께 보여 준다. 요청 하나가 끝나도 다른 작업은 working일 수 있고, 미해결 질문·승인 표시는 실제 해결까지 유지한다.

Web의 shell 생성·알림 읽음·명시 종료 결과는 상태 조회와 분리한다. 정상 연결을 상시 강조하지
않고 조회 실패를 안내하며, 조회 성공이나 다른 작업 성공이 해당 작업 오류를 지우지 않는다.
서버 오류 설명을 우선 표시하고 없거나 해석할 수 없으면 HTTP 상태로 대체한다. 같은 작업
재시도 중에는 이전 실패 사유와 진행 상태를 함께 표시하고 새 결과로 갱신한다. shell 생성
성공과 생성된 terminal의 화면 복원 성공도 별개로 표시한다. [Status: Current]

중첩 조회에서 뒤에 시작한 조회 결과가 먼저 반영됐으면 이후 도착한 이전 응답이 목록·선택
대상이나 조회 오류를 되돌리지 않는다. 새 작업 성공 이전에 시작한 조회도 그 결과를 되돌리는
근거로 사용하지 않는다. [Status: Current]

근거: `apps/web/src/main.ts` `apps/web/src/main.ts:53-90`, `apps/web/src/main.ts:309-428`,
`apps/web/src/main.test.ts` `apps/web/src/main.test.ts:389-447`, `apps/web/src/main.test.ts:223-251`,
`apps/web/src/main.test.ts:448-492`.

## 알림·포커스·사용자 요청

승인·질문은 vendor TUI에서 사용자가 처리한다. AIOX Web은 daemon 소유 실행의 해당 terminal로 이동하게 하고
진행을 막는 상태를 알린다. 외부 실행의 사용자 대응은 해당 외부 터미널에서 수행한다.
알림 읽음은 승인·질문의 실제 해결과 다르다. TUI와 daemon이
같은 vendor 요청에 이중 응답하지 않는다.

- React 운영 Web은 알림 아이콘 클릭 시 dropdown에 웹 알림 목록 형태로 항목을 표시한다.
  알림 클릭은 해당 Agent가 포함된 작업 창·영역·탭으로 이동하고 해당 알림을 읽음 처리해
  미확인 목록에서 제거한다. [Status: Committed target]
- 현재 간단 Web은 대상 terminal을 선택 클릭하면 해당 대상의 미확인 알림만 읽음 처리하고
  목록의 미확인 개수를 갱신한다. 다른 대상의 미확인 알림과 저장된 이력·본문은 유지한다.
  읽음 요청이 진행 중이어도 뒤 선택의 읽음 요청을 버리지 않는다. [Status: Current]
- 전체 알림 확인은 현재 미확인 항목을 모두 읽음 처리한다.
- 세션 리밋·실행 중단·연결 손실을 관측 근거에 맞게 반영한다. vendor 내부 tool 실패를 모두
  사용자 조치가 필요한 AIOX 오류로 만들지 않는다.

| 관측 시 사용자 상태                              | 알림 처리                                                     |
| ------------------------------------------------ | ------------------------------------------------------------- |
| 브라우저 창·탭이 활성이고 해당 terminal이 선택됨 | 팝업·소리·알림 목록 추가·미확인 표시 억제, TUI/상태 표시 유지 |
| 다른 terminal이 선택됨                           | 해당 알림을 미확인 목록에 추가                                |
| background 탭/창                                 | 선택된 pane만 보고 읽음으로 간주하지 않음                     |
| Web 닫힘                                         | 서버에 미확인 유지, 재방문 때 표시                            |

위 억제 기준은 창·탭 활성과 선택된 terminal이다. 같은 창의 검색창이나 버튼으로 입력
포커스가 옮겨도 terminal 선택이 유지되면 억제를 유지한다. 다른 앱이나 브라우저 탭으로
이동하면 선택된 terminal도 알림 대상이다. 이는 사용자 알림 표시 정책이며 메시지 처리
결과·필수 알림 저장 기록을 삭제하는 정책이 아니다. 현재 간단 Web은 활성·선택 기준으로
미확인 목록과 표시를 억제하고 해당 알림을 읽음 저장한다. popup·소리는 운영 Web 후속
구현 대상이다. [Status: Current]

React 제품 화면은 RPC snapshot/delta 저장소에서 목록·배치·알림을 조회한다. panel 조작은 기존 명령 API를 사용하며 알림 읽음 실패는 unread 성공으로 표시하지 않는다. terminal WS·xterm은 보이는 terminalId/runtimeId에 연결한다. 같은 실행의 pane 이동은 attachment를 유지하고 탭 숨김·workspace 이탈은 detach한다. 재연결은 같은 실행의 화면 복원이며 프로세스를 생성하거나 종료하지 않는다. [Status: Current]

이전 `GET /api/web/events` SSE endpoint는 제거했다. 현재 앱 상태 전달·재접속·알림 읽음
계약은 [[docs/specs/aiox-application-rpc]]를 따른다. 연결 계층 구현만으로 UI 상태 통합 완료를 뜻하지 않는다.

짧은 시간에 여러 알림이 오면 항목은 남기고 소리는 묶는 방향이다. 정확한 묶음 시간,
반복 요청 병합, 여러 탭 중 단일 소리 재생 주체, on/off·volume·차임 선택은 Open/deferred다.
브라우저 autoplay 허용을 위한 소리 켜기/미리 듣기 UX는 후보이며 Web이 닫혀도 native OS 소리를
내는 기능은 현재 요구가 아니다.

Codex 서버 요청과 resolved 관측은 request ID·thread/turn/item을 구분하고 resolved를 무조건
승인 성공으로 해석하지 않는다. 별도 observer 연결에 모든 요청이 broadcast되는지, Claude의
일반 승인 해소를 어떤 hook으로 포괄할지는 미확인이다. 이 한계를 사용자의 재로그인 요구나
headless 승인 UI의 선행조건으로 바꾸지 않는다.

Sources:

- `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §§14, 19–24 — 저장·설정·운영 Web·
  알림·복귀 결정과 구현 후보의 provenance.

## W1 전역 config 입력과 적용 계약

아래는 현재 입력과 W1 추가 목표를 구분한 전체 Host 소비 schema다. 모든 object는 알려진
키만 허용하며 필드는 선택적이다. 명시 null·잘못된 타입은 오류다. 파일 없음만 기본값을 쓴다.

| 필드                             | 타입·생략값·제약                                                        |
| -------------------------------- | ----------------------------------------------------------------------- |
| `ports.daemon`, `ports.web`      | 정수 1..65535, 기본 4500/4501, 서로 달라야 함                           |
| `messages.retentionDays`         | 양의 정수, 30                                                           |
| `terminal.shell`, `terminal.cwd` | 공백만/NUL 없는 문자열; 위 OS shell·daemon cwd 기본 규칙                |
| `terminal.args`                  | NUL 없는 string 배열, `[]`                                              |
| `terminal.fontFamily`            | 공백만 아닌 문자열, 생략 시 renderer 기본                               |
| `terminal.fontSize`              | 양의 유한수, 생략 시 renderer 기본                                      |
| `terminal.theme`                 | 값이 공백만 아닌 문자열인 색상 map; 생략 시 renderer 기본               |
| `keyboard`                       | 값이 공백만 아닌 문자열인 기존 map; 생략 시 기존 기본                   |
| `web.sidebar.width`              | 양의 유한수; 화면 기본값 240, 드래그 최소 180, 상한은 뷰포트 폭의 90%   |
| `web.sidebar.open`               | boolean, 생략 시 열림                                                   |
| `keybindings`                    | `mac`/`windows`/`linux` 아래의 action id→조합 문자열 map; 변경분만 저장 |
| `host.layout`                    | Host spec의 LayoutInput; 생략 시 override 없음                          |
| `appearance.theme`               | `system                                                                 | light | dark`, 생략 시 `system`; W1 추가 목표, 현재 parser 미지원 |

`keybindings`의 OS key는 서버 platform이 아니라 브라우저 OS다. 값은 위 화면 조작 keybindings
표의 action id를 키로 쓰며 사용자가 바꾼 항목만 담는다. 기본값과 같은 항목을 저장하거나 전체
기본값을 파일에 복사하지 않는다. W1에서 기존 `keyboard`를 keybindings alias로 발명하지 않는다.
다른 설정 UI 확장 필드도 공통 schema에 반영하기 전 mock 전용 필드를 서버에 보내지 않는다.

```json
{
    "ports": { "daemon": 4500, "web": 4501 },
    "messages": { "retentionDays": 30 },
    "terminal": {
        "shell": "/bin/zsh",
        "args": [],
        "cwd": "/work",
        "fontSize": 14
    },
    "web": { "sidebar": { "width": 240, "open": true } },
    "host": { "layout": { "preset": "grid", "columns": 2 } },
    "appearance": { "theme": "dark" },
    "keybindings": {
        "mac": { "splitDown": "Cmd+Shift+G" },
        "windows": { "openPalette": "Ctrl+Shift+O" }
    }
}
```

이는 POSIX 예시이며 shell/cwd/240을 플랫폼 공통 기본값으로 만들지 않는다.
Host는 선택 directory를 명시 shell cwd로 사용하여 전역 terminal.cwd보다 우선한다.
파일 자체의 형식 오류는 override로 숨기지 않는다. 각 입력의 grid 치수 검증 후
CLI→YAML→전역→auto로 병합하고 없는 나머지 치수만 마지막에 1로 채운다.
Host 요청은 기록된 daemon 포트에 연결하며 config 변경으로 현재 listener를 옮기지 않는다.

### 설정 HTTP

`GET /api/config` → 200 `{revision,stored,effective,runningPorts,restartRequired}`.
revision은 현재 파일 내용의 opaque hash(부재도 고유 값), stored는 변경분 JSON,
effective는 기본값을 채운 config, runningPorts는 실제 listener 포트다.
`PUT /api/config` body `{revision,stored}` → 200 같은 DTO.
서버가 파일을 다시 읽고 revision 비교→전체 schema 검증→임시 파일+rename으로 저장한다.
다르면 409 `config_conflict`와 최신 DTO, 잘못된 입력은 400 `invalid_request`, 기존 파일의
읽기/파싱 오류는 500 `invalid_config`다. 새 파일을 성공 저장하기 전 last-good를 교체하지 않는다.
클라이언트 저장 요청끼리는 직렬화한다. 외부 편집기와 rename 직전의 OS 수준 경쟁까지 잠그는
계약은 아니며 파일 watcher·자동 merge는 추가하지 않는다. 헤더 theme·sidebar 직접 조작도
최신 stored의 해당 필드만 바꾸고 이 경로를 사용한다. 실패하면 미저장 표시·재조회/재시도를 제공한다.

설정 PUT의 409 config_conflict 뒤 재시도는 최신 GET의 revision/stored를 기준으로
이번 사용자 조작의 변경 필드만 다시 병합한다. 오래된 stored 전체를 다시 보내 타 필드를
되돌리지 않는다. 서버는 revision 검사를 유지하며 충돌을 자동 무시하지 않는다.

## Panel 조회·변경 HTTP와 React DTO

이 절은 Host panel과 같은 공통 shell 배치의 Stage5/6 구현 대상 계약이다.
`GET /api/panels` → `PanelView[]`, `GET /api/panels/:id` → PanelView.
조회 목록은 200 JSON 배열이며 모든 mutation은 같은 origin/접속 보호를 거친다.
Host 조회는 관리 구성을, panel 조회는 화면 배치를, 기존 `/api/terminals`는 실제 terminal 생존을
제공한다. React는 terminal 생존을 local mock timer나 DB의 과거 실행 값으로 추측하지 않는다.

PanelView는 `{id,kind,section,name,hostId,networkId,revision,layout,tabs}`.
kind는 `host|workspace|network`, hostId/networkId는 관련 없는 경우 null이다.
workspace 생성은 Host·Network를 생성하지 않는다. Network panel 자동 생성·삭제 UX는 해당
Network consumer의 후속 계약이며 이 W1의 Host 실행 panel과 혼용하지 않는다.
revision은 panel 이름·배치·탭 행 중 하나가 바뀔 때마다 서버가 1 증가시키는 변경 번호다.
Web panel 명령은 revision을 보내지 않고 서버도 일치를 요구하지 않는다. 대신 각 명령은 아래
대상 조건을 같은 저장 transaction에서 검사한다. Web은 같은 revision의 RPC upsert도 DTO
전체로 교체한다. layout은 다음 재귀 union이다.

`kind`는 생성 주체·수명 정책, `section`은 사이드바 표시 위치다.
section은 `workspaces|networks|hosts`이며 서버가 다음 조합만 저장·응답한다.

| kind      | 허용 section                |
| --------- | --------------------------- |
| workspace | workspaces, networks, hosts |
| host      | hosts만                     |
| network   | networks만                  |

CLI가 만든 Host/Network panel은 서버가 고정 section을 지정한다. 무효 조합을 요구하는
입력은 400 invalid_request다. Web 명령의 `panel.create`는 사용자 panel(kind workspace)만 만들며
section 생략은 workspaces다. 다른 section의 사용자 panel도 Host/Network·membership을
생성하지 않는다. 생성 후 section 변경 endpoint는 제공하지 않는다.

사용자 panel 생성·rename의 name은 문자열이며 앞뒤 ECMAScript trim 공백을 제거한 값을
저장·응답한다. 정규화 후 Unicode code point 기준 1~~128자이고 U+0000~~U+001F·U+007F
제어 문자는 허용하지 않는다. 빈 문자열·공백만·상한 초과·제어 문자는 400 invalid_request와
field:name이다. 사용자 panel 이름은 같은 section을 포함해 중복을 허용한다. rename·
삭제는 ID로 수행하며 이름을 ID 대용으로 쓰지 않는다. Host/Network 이름 유일성은 별도 owner
계약을 유지한다. 이 이름 규칙은 사용자 panel 전용이며 CLI 이름을 임의 trim하지 않는다.

```text
Pane  = {type:"pane", id, tabIds:string[]}
Split = {type:"split", id, axis:"x"|"y", weights:number[], children:(Pane|Split)[]}
x: 좌→우, y: 위→아래; children 최소 2, weights는 같은 길이의 양의 유한수, 합계 1
```

pane ID와 split ID는 panel 안에서 서로 겹치지 않게 유일하다. 모든 tab은 정확히 한 pane에 한 번만 나타난다. tabId/terminalId는
별개이며 이동으로 어느 것도 바뀌지 않는다. 같은 terminal은 panel들에 중복 소유되지 않는다.
현재 배치의 사각형 top, 그다음 left 순으로 다음 Agent 배치 순서를 계산한다.

활성 pane과 각 pane의 선택 탭은 각 React 앱의 메모리 상태다. 선택 조작은 서버 명령을 보내거나
DB에 저장하지 않으며 다른 창에 방송하지 않는다. 새로고침하면 초기 선택으로 돌아가고
localStorage 등으로 복원하지 않는다. 서버의 구조 변경으로 선택 대상이 사라지면 React 앱이
남은 pane·tab 중에서 선택을 조정한다. 서버 DTO에는 activePaneId·selectedTabId가 없다.

TabView는 `{id,terminalId,label,agentKey,runtimeId,presentation,notice}`.
terminalId/agentKey/runtimeId는 nullable, presentation은 `shell|preparing|tui|stopped|start-failed|crashed|unavailable`.
preparing 중 notice가 null이면 입력 shell stream을 그대로 보이고, notice가 있으면 기존
stopped 자리를 준비 안내로 가린다. `notice`는 null 또는 `{message,reason,restartCommand}`;
reason은 nullable이다. restartCommand는 daemon이 해당 shell 플랫폼 quoting으로 만든 문자열이며
절대 `--path`와 필요 `--file`로 YAML을 선택한다. 원래 Host를 강제하는 인자는 없다.

```json
{
    "id": "p1",
    "kind": "host",
    "section": "hosts",
    "name": "feature-host",
    "hostId": "h1",
    "networkId": "n1",
    "revision": 4,
    "layout": { "type": "pane", "id": "pane1", "tabIds": ["tab1"] },
    "tabs": [
        {
            "id": "tab1",
            "terminalId": "t1",
            "label": "reviewer",
            "agentKey": "reviewer",
            "runtimeId": null,
            "presentation": "stopped",
            "notice": {
                "message": "Agent has stopped.",
                "reason": null,
                "restartCommand": "aiox host agent start reviewer --path /work/project --file aiox.dev.yaml"
            }
        }
    ]
}
```

Web의 panel 등록·배치 변경은 명령 endpoint 하나로 보낸다. 한 명령은 한 panel의 서로 의존하는
변경을 담을 수 있고, 그 변경 전체가 하나의 transaction으로 commit되거나 전부 거절된다. 전체 panel을
덮어쓰는 요청은 없으며 각 변경은 대상과 관계만 표현한다. 서로 다른 요청을 서버가 의미상 병합하지는
않는다.

| Method / path            | 요청                                                                 | 결과                                                                                               |
| ------------------------ | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `POST /api/web/commands` | `{clientSessionId,sequence,requestId,panelId,changes:PanelChange[]}` | 200 `{requestId,sequence,panel:PanelView\|null}`: changes 전체 commit 뒤 응답. panel.delete면 null |

| PanelChange `type` | 필드                                                    | 등록·배치 결과                                                              | commit 뒤 daemon 작업      |
| ------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------- |
| `panel.create`     | `name`, `section?`, `paneId`, `tabId`, `cols?`, `rows?` | kind workspace panel과 pane 하나·준비 중 tab 하나. changes의 첫 항목만 허용 | shell 준비                 |
| `panel.rename`     | `name`                                                  | 이름만 저장                                                                 | 없음                       |
| `panel.delete`     | `confirm:true`                                          | workspace panel과 모든 tab 제거. changes의 마지막 항목만 허용               | 소유 terminal 정리         |
| `tab.create`       | `tabId`, `target`, `cols?`, `rows?`                     | 준비 중 tab을 target에 추가                                                 | shell 준비                 |
| `tab.move`         | `tabId`, `target`                                       | 기존 tab을 target으로 옮기고 빈 pane을 병합                                 | 없음. 기존 shell 유지      |
| `tab.close`        | `tabId`, `expectedRuntimeId`, `confirm`                 | tab 제거와 빈 pane·split·포커스 정리                                        | terminal 정리              |
| `tab.dismiss`      | `tabId`                                                 | 종료 안내를 같은 shell 표시로 바꿈                                          | 없음                       |
| `split.resize`     | `splitId`, `children`, `weights`                        | 해당 split 비율만 저장                                                      | 없음. PTY cols·rows와 별개 |

`target`은 생성과 이동이 같은 형식을 쓴다. `{toPaneId,beforeTabId?}`는 기존 pane의 삽입 위치이고
`{split:{targetPaneId,side:"left"|"right"|"top"|"bottom",paneId,splitId}}`는 기준 pane 옆의 새 분할이다.
새 panel은 pane 하나와 tab 하나로 시작하며 빈 pane만 가진 panel을 만들지 않는다.

network kind의 panel 삭제는 400 invalid_request다. rename도 kind workspace만 허용하며 kind
host/network는 400 invalid_request, 없는 ID는 404 unknown_panel이다. name 검증·저장은 같은 변경
경계에서 처리하고 실패하면 기존 이름을 보존한다. 성공하면 revision을 증가시키고 최신 PanelView를
반환·RPC로 전달한다. CLI Host/Network의 이름이나 YAML을 연쇄 변경하지 않는다.

변경의 대상 조건은 다음과 같다. 조건 검사와 저장은 같은 transaction이며 하나라도 실패하면
명령 전체가 상태를 바꾸지 않는다. 같은 명령의 앞 변경이 만든 panel·tab을 뒤 변경이 대상으로 쓸 수 있다.

- 공통: 삭제된 panel ID는 409 `id_deleted`, 존재한 적 없는 ID는 404 `unknown_panel`이다.
- move: 탭이 이 panel 소속이 아니면 404 `unknown_tab`, 삭제된 탭이면 409 `id_deleted`다.
  목적지·대상 pane이 없으면 404 `unknown_pane`이며 서버의 기존 위치를 유지한다. beforeTabId가
  목적지 pane에 없으면 맨 뒤에 둔다. 여러 창에서 같은 탭을 이동하면 서버가 마지막으로 처리한 이동이 남는다.
- resize: split이 없으면 404 `unknown_split`, children이 그 split의 현재 자식 ID 순서와 다르면
  409 `layout_changed`다.
- create: 대상 pane이 없으면 404 `unknown_pane`이다. panel·tab·pane·split ID가 사용 중이면 409
  `id_conflict`, 삭제된 ID면 409 `id_deleted`다.
- close: expectedRuntimeId·confirm 규칙은 아래 닫기 계약을 따르며 준비 중 shell 탭은 확인 없이 닫는다.
  Host 명령이 그 Agent를 바꾸는 중이면 409 `host_busy`다.

진행 중 작업과 새 명령은 실제로 충돌하는 조합만 거절한다. shell 준비·종료는 명령을 막지 않는다.
Host run/restart와 Agent start/stop 중에도 선택·이동·비율·이름 변경, shell 생성과 shell 탭 닫기를
허용한다. 그 작업 대상 Agent 탭의 닫기는 409 `host_busy`다. restart의 Agent 탭 제거·추가는 저장
시점의 최신 배치에 적용하고 사용자가 옮긴 탭은 제자리에 둔다. panel 삭제는 commit 즉시 끝나므로
이후 그 panel의 명령은 `id_deleted`다.

#### 명령 순서와 재전송

앱 명령은 Effect RPC의 `panel.command`로 전달한다. 기존 requestId·sequence·panelId·changes[]와
배치 DTO를 유지하며, 서버 발급 session·연속 checkpoint·pending 합류·과거 결과 만료·gap·재접속
계약은 [[docs/specs/aiox-application-rpc]]이 소유한다. 클라이언트가 임의 session을
만들거나 daemon 재시작 뒤 옛 요청을 자동으로 다시 실행하지 않는다.

완료 결과 payload는 cache하지 않는다. 이미 확정된 요청은 `result_expired`로 거절하고 현재
snapshot으로 상태를 확인한다. 실제 실행 중인 요청은 단순 시간 초과로 미실행 취급하지 않는다.

#### ID·shell 준비·닫기

panel·tab·pane·split ID는 Web이 UUID로 생성하고 terminalId·runtimeId는 서버만 생성한다.
삭제된 panel·tab ID는 서버가 기록해 재사용을 거절하며 이 기록은 자동 삭제하지 않는다.
마지막 tab을 다른 pane으로 옮기면 빈 pane을 병합하고 마지막 tab을 닫으면 panel과 빈 pane 하나를 유지한다.
Host shell cwd는 Host directory, workspace shell cwd는 공통 config 규칙이다.

tab 생성의 성공은 panel·pane·split·tab 등록의 commit이다. HTTP는 shell 준비를 기다리지 않는다.
daemon이 commit 뒤 shell을 병렬로 준비하고 먼저 준비된 탭은 다른 준비를 기다리지 않는다. 준비가
끝나면 같은 transaction에서 그 탭이 아직 terminal 없이 준비 중인지 확인한 뒤 terminalId를 연결하고
shell 표시로 바꾼다. 연결은 탭 위치를 바꾸지 않으므로 준비 중 이동은 유지된다. 탭이 닫혔거나 panel이
삭제됐으면 연결하지 않고 생성된 shell을 정리 대상으로 넘긴다. 연결 저장 자체가 실패해도 shell을
정리 대상으로 추적하고 탭을 실패로 표시한다. shell 생성 실패는 등록을 되돌리지 않고 탭을 start-failed와
실제 원인의 notice로 바꾼다. daemon 재시작 복구는 terminalId 없는 준비 중 shell 탭을 start-failed로
바꾼다. 이 DB 복구는 프로세스 종료의 근거가 아니다.

닫기는 서버가 현재 Runtime 신원을 expectedRuntimeId와 비교한다. 실행 중이면 confirm:true를
요구하고 UI가 확인한다. stopped 안내 ×는 confirm:false로 가능하다. 그 사이 새 Runtime이 시작됐으면
409 `runtime_conflict`이며 옛 확인으로 새 실행을 종료하지 않는다. 일반 shell의 닫기도 그 shell
작업을 종료하는 동작이다. `dismiss`는 종료 안내이고 기반 shell이 살아 있을 때만 허용하며
agentKey/runtimeId/notice를 null로 바꾼다. 관리 Agent는 지우지 않는다. shell 자체 생성 실패로
terminalId가 null이면 실패 tab에 진단을 남긴다. 이때 Copy는 명령만 복사하고 dismiss나 shell 생성을
하지 않는다. clipboard 쓰기 실패는 dismiss를 호출하지 않는다.

탭·panel 제거와 프로세스 정리는 별개의 결과다. tab.close·panel.delete의 성공은 배치 제거의
commit이며 프로세스 종료 성공을 뜻하지 않는다. 제거된 탭의 terminal은 daemon이 이어서 종료하고
종료가 확인될 때까지 RPC delta의 `cleanup`으로 대상 terminalId·panelId·tabId·이유·상태·실제 원인·시도
횟수를 공개한다. 종료 확인에 실패하면 `state:"failed"`와 원인을 남기고 daemon이 재시도하며,
확인되면 remove로 사라진다. 실패를 어디에 표시할지는 Web 화면 규칙이 정한다.

새로고침·연결 끊김·HTTP abort는 취소가 아니다. 사용자 취소는 명시적 닫기·삭제 명령뿐이며
Web은 재접속 RPC snapshot으로 상태를 다시 확인한다.

### 상태 전달·terminal 연결과 mock 전환 [Status: Current]

Persistent Network 생성은 Network 정의와 전용 빈 panel을 함께 등록한다. panel은 Network와
같은 ID를 사용하며 `kind:network`, `section:networks`, 빈 pane 하나로 시작한다. shell은
사용자가 `+`로 추가한다. Network 삭제는 참여 실행이 없어야 하고 panel의 tab도 모두 닫혀
있어야 한다. 삭제 성공 시 해당 panel도 제거되며, 생성·삭제의 두 자원 변경은 같은 delta로 전달한다.
근거: [[packages/persistence/src/sqlite/database.test.ts]], [[apps/daemon/src/app-state.test.ts]],
[[apps/daemon/src/web-commands.test.ts]].

앱 명령·상태·알림은 `WS /api/rpc`의 Effect RPC를 사용한다. wire schema, 세션 수명과
snapshot/delta 적용 계약은 [[docs/specs/aiox-application-rpc]]가 소유한다. CLI HTTP/NDJSON과
MCP·정적 HTTP는 유지한다. 운영 Web의 RPC client/store/hooks와 TanStack DB 상태·제품 화면 연결은 구현돼 있다. Settings·화면 조작 Keybinding UI와 남은 통합 검증은 Stage6 후속 작업이다.

명령 성공은 등록·배치 commit이며 shell 준비나 프로세스 종료 완료가 아니다. 실제 준비·종료·정리
결과는 panel·terminal·cleanup delta로 전달한다. 응답의 state와 같은 delta가 구독에 전달되며
도착 순서는 보장하지 않는다. CLI 명령의 변경도 같은 앱 상태에 반영하지만 CLI는 자기 HTTP 결과를 기다린다.

| resource       | upsert의 value                                                                    | 전달 계기                                                      |
| -------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `host`         | HostView                                                                          | 생성·적용 구성·관리 Agent 실행 상태 변경                       |
| `network`      | HostNetworkView 또는 기존 persistent NetworkView                                  | 생성·membership·route 변경                                     |
| `panel`        | PanelView                                                                         | 생성·배치·탭 추가/제거·탭 표시 변경                            |
| `terminal`     | 기존 TerminalView                                                                 | terminal 생성·종료 또는 조회 DTO의 상태 변경                   |
| `agent`        | 기존 Web AgentView                                                                | standalone를 포함한 Web Agent 조회 상태 변경                   |
| `cleanup`      | CleanupView `{id,terminalId,panelId,tabId,reason,state,error,attempts,updatedAt}` | 제거된 탭·panel의 terminal 종료 대기·실패; 종료 확인 시 remove |
| `notification` | WebNotificationView                                                               | 미확인 알림 생성; 읽음 처리·보존 만료 시 remove                |

upsert는 해당 조회와 같은 **완전한 DTO**이며 임의 field patch가 아니다. 삭제는
`{resource,action:"remove",id}`로 전달한다. stopped 관리 Agent는 삭제된 자원이 아니므로
HostView의 runtime/lastExit 변경으로 전달한다. terminal 조회에서 제거된 항목은 remove다.
권한·소유권 필터는 해당 조회와 동일하며 token/env 비밀값을 DTO나 이벤트에 추가하지 않는다.

panel 배치 변경은 어느 pane에 어떤 tab이 있는지, 선택·분할 비율 등 PanelView의 변경이다.
tab의 terminalId/runtimeId/agentKey는 연결 식별자다. 이동만으로 Agent status를 바꾸거나
shell·Agent를 재생성하지 않는다. 기존 탭 이동·배치 변경은 HTTP 검증·저장 후 panel을
전달하고, 새 shell을 만드는 분할은 실제 준비·배치 저장 후 전달한다. PTY 출력 byte는
이 이벤트의 대상이 아니며 WebSocket으로만 전송한다. Agent 상태가 달라져 panel의 안내도
바뀌면 host와 panel의 최신 DTO를 같은 반영 단위에 포함한다.

#### 외부 CLI Agent 조회 [Status: Committed target]

기존 AgentView에 `executionOwnership:"daemon"|"external"`을 추가한다. 별도 카드 전용
API를 만들지 않고 `/api/agents`, `/api/web/agents`와 RPC snapshot.agents/state의 agent에
같은 필드를 노출한다. RPC state의 agent 변경 id는 기존 AgentView.agentId다. Web 조회와 RPC는
external도 포함하며 실제 상태·관측 오류·생성·종료 변경을 전달한다. Web 소유 실행만 필터하던
현재 구현을 새 목표의 필터로 유지하지 않는다. CLI 조회의 기존 필터는 그대로 적용한다.

external은 `terminalId:null`, `hostId:null`이며 서버가 보장한다. 외부 실행 등록에 terminal
문맥이나 Host 귀속이 제공되면 등록을 거절한다. networkId는 nullable이다. Host 관리 Agent는
daemon 소유이며 external을 Host의 관리 구성으로 편입하지 않는다. 외부 Agent의 카드 배치는
[[docs/specs/aiox-web-ui]]가 소유한다. networkId가 있으면 해당 Network의 목록에 표시할 수
있으나 이를 위해 panel/tab/terminal을 자동 생성하지 않는다. external은 Web 실행 제어·
terminal 연결·Web 알림 대상이 아니다. Web 제어 API도 이 소유권을 서버에서 검사한다.

현재 공개 external 실행 schema는 hostId를 받지 않고 controller도 전달하지 않는다.
다만 내부 RegisterRuntime은 hostId를 허용하므로 모든 내부 경로가 이미 null을 보장한다고
보고하지 않는다. 공통 등록 경계의 명시 검증은 구현 대상이다. terminal 귀속 거절은
[[apps/daemon/src/daemon.ts]]의 registerRuntime, 외부 입력은
[[packages/protocol/src/index.ts]]의 externalAgentRunSchema와
[[apps/daemon/src/agent-controller.ts]]를 근거로 한다.

#### 미확인 Web 알림 HTTP·RPC [Status: Current]

알림 목록은 미확인 항목만 담는다. snapshot.notifications는 `WebNotificationView[]`이며
`readAt:null`인 Web 알림만 포함한다. 배지 수는 이 배열의 항목 수다. UI의 이동·Clear all
표현은 [[docs/specs/aiox-web-ui]]의 알림 절을 따른다. 알림 목록은 미해결 작업의 권위가
아니며 확인으로 항목이 사라져도 Agent의 awaiting-user 상태를 해소하지 않는다.

| Method / path                      | 요청              | 응답·변경 전달                                   |
| ---------------------------------- | ----------------- | ------------------------------------------------ |
| `GET /api/web/notifications`       | 없음              | 200 미확인 WebNotificationView 배열              |
| `POST /api/web/notifications/read` | `{ids?:string[]}` | 200 `{read:number}`; 저장 완료 뒤 해당 ID remove |

항목 클릭은 ids 하나, Clear all은 ids 생략으로 요청한다. 생략은 서버가 처리할 때의
미확인 Web 알림 전체, 빈 배열은 변경 없음이다. 이미 읽었거나 존재하지 않거나 Web 대상이
아닌 ID는 처리 수에 포함하지 않는다. read는 이번에 읽음 저장한 수다. 요청 파싱 오류는
400 invalid_request, 저장 실패는 공통 500 오류이며 성공 remove를 먼저 보내지 않는다.
개별 DELETE·일괄 삭제 API는 만들지 않는다. 클릭 대상 terminalId가 null이면 점프 가능한
terminal이 없다는 뜻이며 읽음 처리 가능 여부와는 별개다.

알림 생성은 notification upsert, 읽음 commit과 보존 기간 만료는 notification remove를
보낸다. 읽음 처리 후 DTO upsert는 보내지 않는다. remove는 Web 미확인 집합에서 제거한다는
뜻이며 읽음 처리로 원본 필수 알림·delivery 기록을 삭제하지 않는다. 이미 읽은 ID를 다시
확인하면 read:0이며 불필요한 변경 이벤트를 만들지 않는다. 보존 만료로 이미 목록에 없는
항목을 제거하는 이벤트도 소비 결과를 바꾸지 않는다.

```text
{"type":"delta","epoch":"e1","version":1,"changes":[{"resource":"notification","action":"upsert","id":"notice1","value":{"id":"notice1","originRuntimeId":"r1","body":"Input required","createdAt":1789948800000,"readAt":null,"terminalId":"t1"}}]}

{"type":"delta","epoch":"e1","version":2,"changes":[{"resource":"notification","action":"remove","id":"notice1"}]}
```

조회·snapshot·state·읽음 처리 모두 저장된 originExecutionOwnership이 daemon인 항목만
대상으로 한다. external 알림은 전달·읽음 처리 대상에서 제외한다. 실행 종료나 ID 재사용을
근거로 원본 소유권을 재판정하지 않는다. 기존 WebNotificationView를 재사용하고 내부 소유권
필드를 Web의 필터 판단에 맡기지 않는다.

보존 기간은 messages.retentionDays(기본 30일)를 재사용하고 별도 Web 개수 상한은 두지
않는다. 기존 메시지 전체 delivery가 완료되고 마지막 outcomeAt이 보존 cutoff보다 오래된
경우 정리한다. 진행 중 메시지의 알림은 설정 기간보다 오래 남을 수 있으며 알림 생성 시각만
기준으로 먼저 지우지 않는다. 읽음 이력을 보여 주는 별도 조회나 dismissedAt을 추가하지 않는다.

#### RPC stream과 최초·재접속 snapshot

terminal WS의 `runtime` query는 현재 daemon 소유 실행과 terminal의 일치를 검사한다.
shell 안에서 Agent가 실행 중이고 CLI relay가 정상인 경우 기존 shell PTY에 연결한다.
relay가 끊긴 경우에는 같은 runtime의 vendor PTY 복원 경로를 사용한다. 존재하지 않거나
다른 terminal의 runtime으로 연결하는 요청은 거절한다.
근거: [[apps/daemon/src/daemon.ts]], [[apps/daemon/src/agent-controller.test.ts]].

최초·재접속은 `state.subscribe`의 현재 snapshot으로 상태를 교체한다. 그 뒤 같은 epoch의
versioned delta를 적용한다. 구독 등록과 snapshot 캡처는 같은 임계 구간에 연결되며 상태 누락을
허용하지 않는다. 느린 소비자는 제한된 queue가 가득 차면 실패시키고 snapshot 재접속으로 복구한다.
구체적인 이벤트 shape·상한·복구·sequence-failure 의미는 [[docs/specs/aiox-application-rpc]]를 따른다.
설정 watcher·과거 이벤트 replay·정기 전체 재조회는 요구하지 않는다.

terminal 연결은 기존 `WS /ws/terminal/:terminalId`를 사용한다. client의 binary는 사용자 입력,
JSON은 `{type:"resize",cols,rows}`, `{type:"ack",offset}`, `{type:"response",data}`다.
server는 `snapshot`(cols/rows/state) → binary 복원 데이터 → `snapshot-end` → tail → `restored`,
이후 `output`(respond/offset)+binary, resize/exit/error control을 보낸다.
response는 지정된 respond owner만 보내고 ack는 렌더 파싱 완료 byte까지 보낸다.
`error.restorable:false`는 미러 복원 불가이며 일반 연결 손실과 구분한다.
기존 optional runtime query는 특정 vendor 화면 연결용이며 panel 이동용 ID가 아니다.
정확한 terminal state wire는 기존 packages/terminal의 serialization/restore 타입을 그대로 쓴다.

React terminal 객체·WS 수명은 terminalId로 관리하고 pane 컴포넌트 이동과 분리한다.
resize는 실제 표시 크기로 보내며 이동만으로 shell/Agent를 재생성하지 않는다.
재접속 시 RPC의 Host/panel snapshot 수신 후 살아 있는 같은 terminal에 snapshot attach한다. daemon 재시작으로
terminal이 없으면 unavailable과 원인을 표시하며 저장된 ID로 새 shell을 자동 생성하지 않는다.

최소 mock은 이 HTTP 경계의 DTO/오류와 위 snapshot/state 계약을 제공한다. 컴포넌트별 더미 상태를 만들지
않고 아래 전이를 같은 fixture의 응답 교체로 제공한다. 실제 xterm bytes는 기존 WS consumer로
교체하며 mock 성공을 PTY 생존·resize·vendor 준비 실측으로 보고하지 않는다.

| 입력/관측                     | Host 명령 결과 / 조회 전이                         | React 표시                               |
| ----------------------------- | -------------------------------------------------- | ---------------------------------------- |
| run/start 접수                | running, runtime.phase preparing                   | preparing 라벨; 입력 shell은 stream 유지 |
| binding+중계 ready            | target ready, 전 대상 완료면 succeeded             | 같은 terminal TUI                        |
| spawn 실패·프로세스 종료 확인 | failed/start_failed, runtime null                  | start-failed + 실제 이유·Copy            |
| 협업 준비 실패, vendor alive  | failed/start_failed, runtime running/status failed | TUI 유지 + 협업 오류; stopped 아님       |
| stop 접수→exit+cleanup        | stopping → stopped / succeeded                     | 완료 전 TUI, 완료 뒤 stopped 안내        |
| 정상 /exit 관측               | runtime null, lastExit exited                      | 같은 shell; 안내 없음                    |
| Copy                          | clipboard→dismiss 200                              | 같은 shell, 관리 카드 stopped 유지       |
| 다른 shell에서 start 실패     | 새 tab start-failed; 옛 stopped 유지               | 두 자리를 유지                           |
| 다른 shell에서 ready          | 새 TUI 확보 후 옛 stopped shell 종료·tab 제거      | 이미 일반 shell인 옛 tab은 보존          |
| cleanup 실패                  | Host: failed + 대상 오류, Web 탭: cleanup failed   | 남은 자원·재시도 안내                    |
| RPC/WS 손실                   | 생존 상태를 임의 변경하지 않음                     | 연결 경고→조회/동일 terminal 복원        |
