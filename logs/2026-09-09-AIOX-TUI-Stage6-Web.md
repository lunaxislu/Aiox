---
topic: AIOX TUI Stage6 Web
description: 공통 영역별 탭 분할 포커스 설정 단축키와 화면 복귀
status: open
---

## Work Items

- [ ] W1 1차~3차 프로토타입을 검토해 6차까지 수정 프롬프트를 냈고 4차·5차·6차 항목이 모두 반영된 것을 확인했다. 사이드바 기본 240·최소 180·최대 400은 실측으로 유지한다. 남은 것은 탭 드래그 이동·가장자리 분할·드롭 미리보기의 사용자 직접 판정과 드롭 존 두께 확정값(초안 20%)뿐이다. HTML5 drag-and-drop이 합성 마우스 이벤트로 발화하지 않아 agent가 확인할 수 없으므로 사용자가 직접 조작해 판정한다.
- [>] W2 설정 화면 2차 디자인 프롬프트를 작성하고 13차 수정 지시까지 냈다(logs/artifact/AIOX-Web-UI-Design-Prompt.md, 1271줄). keybindings는 macOS 기준 11개가 확정됐고 xterm 비용은 소스로, 브라우저·OS 예약은 사용자 직접 실측으로 닫혔다. 기본값 방향(OS별 단일 조합, leader 미채택), config 저장 방향(코드가 기본값, 변경분만 저장), 파일·웹 동기화 모델 B(watcher·SSE 없이 열 때·저장할 때 조회), localStorage 제거 후 Web theme을 전역 파일로 이동이 모두 사용자 확정이다. 사용자 결정으로 운영 Web 다국어를 철회해 UI 문구를 영어로 고정했고, Settings 진입을 헤더 오른쪽 톱니로 옮겼으며, 반응형 범위를 사이드바·헤더·설정 화면 셋으로 한정했다(9·10차). 8차 3건은 aiox-version4.html, 9차 2건과 10차 대부분은 aiox-version5.html, 11차 2건과 추가 2건(좁은 폭 알림을 드로어 위 dropdown으로, 세 아이콘을 로고 반대편에)은 aiox-version6.html에서 실제 조작과 소스로 확인해 닫혔고, 12차 2건(이동 동작의 드로어 닫기, breakpoint 768px)은 aiox-version7.html에서 소스로만 확인해 닫혔다. 사용자 결정으로 12차 범위 밖 4건을 13차로 냈다. localStorage 제거(앱 테마·사이드바 너비를 설정 파일 모델로), 직접 조작 컨트롤의 즉시 쓰기와 헤더 토글의 appearance.theme 공유, 알림 클릭의 읽음 처리(제거가 아님), 좁은 폭에서 새 shell·분할도 드로어 닫기다. 사용자 결정으로 실제 구현의 사이드바는 shadcn-ui Sidebar를 채택하며 cookie 저장·드래그 리사이즈 부재·Cmd+B 이중 처리 세 충돌은 착수 시 처리한다. 남은 것은 13차 반영본 프로토타입의 검토이며 재개 조건은 {W2} Required Context에 있다. Windows/Linux 기본키와 configuration-web spec 반영(확정 기본키·저장 방식·동기화 모델 B·저장소 재정의 + 기존 화면 모델 갱신 두 건 + 다국어 철회에 따른 spec·architecture 서술 정리)은 Stage6 구현 착수 시점의 후속으로 둔다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 2026-09-09 단계별 로그 선생성과 plan 연결을 요청했다. 이 로그는 구현 착수·완료 증거가 아닌 단계 인계다. plans/aiox-tui-product-rebuild.md에서 이 단계가 활성화될 때 선행 로그 최신 결과와 실제 코드를 다시 확인한다. logs/artifact/AIOX-TUI-Product-Context-Prompt.md의 전체 제품 문맥과 §15 운영 Web·브라우저 복귀·알림, logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md의 대응 결정을 읽는다. 초기 goal의 reply/Host add 등 폐기된 정책을 복원하지 않는다. 구현 시 관련 owner docs와 producer/consumer·테스트까지 추적하고 변경된 계약을 owner에 반영한다.
- docs/specs/aiox-configuration-web.md, docs/architecture/aiox-storage-terminal.md, docs/aiox-tui-product.md를 읽는다. Stage 2 plain TypeScript 검증 페이지는 운영 Web 완료가 아니다. 사용자 승인된 Stage6 React·Tailwind·shadcn/ui 방향을 적용하며 나머지 Web 라이브러리는 해당 단계에서 사용자와 논의하고 실제 필요에 따라 선택한다. 2026-09-17 사용자 확정으로 운영 Web 다국어는 철회했고 UI 문구는 영어 하나로 고정한다. 제품 UI 문구와 vendor 출력 원문의 구분은 유지한다. 공개 AIOX 사이트(Stage9)의 다국어는 별도 앱이므로 이 철회 대상이 아니다. vendor TUI UX를 복제하지 않는다.
- 사이드바는 일반 터미널 / Hosts(development, review 등) / Networks(dev 등), 선택한 작업 화면은 분할 영역 → 영역별 탭 묶음 → 실제 PTY다. Host와 일반 터미널이 공통 UI를 쓰며 Host 전체 페이지 탭은 없다. Network 선택은 Agent·route 조회이며 화면 분할로 Host·Network를 자동 생성하지 않는다.
- 각 영역에 독립 탭 표시줄·선택 상태. 탭을 다른 영역으로 드래그 이동, 가장자리 드롭으로 상하좌우 분할, 드롭 위치 미리보기, 마지막 탭 이동 후 빈 영역 병합. 기존 문맥의 초기 이동 범위는 같은 작업 화면 내부다. 경계 드래그로 너비·높이 변경 후 실제 PTY resize. 현재 영역 확대·이전 배치 복귀와 사용자 실행 크기 균등화. 이 모든 화면 조작으로 프로세스·대화·Network를 바꾸지 않는다.
- 영역별 [+] 메뉴: 새 shell 터미널 / 오른쪽으로 분할 / 아래쪽으로 분할. 새 shell은 현재 영역에 추가하고 전체 배치를 자동 재정렬하지 않는다. Host에서는 Host 작업 경로, 일반 shell에서는 git·pnpm·직접 claude/codex도 사용 가능하나 자동 Agent 등록하지 않는다. 일반 터미널 → aiox network create dev → 단축키 분할 → 각 shell에서 aiox agent run claude 또는 codex --network dev → 같은 탭에서 실행·종료 후 shell 복귀를 연결한다.
- Stage 5의 Host 최초 auto/left-main/top-main/grid 배치를 공통 layout으로 표시한다. 초과 Agent 순환 탭 배치·빈 영역 제외·이후 사용자 배치 유지 규칙을 보존한다. 사용자 배치가 초기 설정 변경이나 Agent 상태 갱신 때문에 자동 재정렬되지 않게 한다.
- 포커스 UI: 활성 영역 테두리·선택 탭 강조, 방향별 포커스 이동, 현재 영역을 잠깐 강조. 비활성 영역 강조만 줄이고 터미널 본문 색상은 사용자 설정 유지. 2026-09-13 확정 알림 억제 기준은 브라우저 창·탭 활성과 선택 terminal이다. 검색창·버튼으로 입력 포커스가 옮겨도 선택이 유지되면 억제하며 다른 앱·브라우저 탭으로 이동하면 알림 대상이다. 이 선택·활성 상태를 Stage7 알림에 연결하고 실제 terminal 입력 포커스를 추가 조건으로 요구하지 않는다.
- 단축키 대상: 새 shell 탭, 분할, 탭 전환, 방향별 포커스 이동, 영역 확대·복귀, 크기 균등화, 포커스 강조, 사이드바 토글. macOS/Windows/Linux 기준은 서버가 아니라 브라우저 OS이며 Windows 브라우저→WSL 서버는 Windows 키다. 전역 keybindings로 재지정한다. 정확한 기본 키 조합과 OS별 설정 구조는 구현할 때 사용자와 먼저 논의한 후 결정한다. 브라우저 예약키와 터미널 프로그램 입력 보존을 검토하고 Cmd→Ctrl 단순 치환을 확정하지 않는다.
- 저장: 사이드바 너비 web.sidebar.width, 터미널 폰트·색상·키, 사용자 keybindings, Host 초기 기본값 host.layout은 전역 config. 240은 너비 예시이며 실제 기본값은 UI 구현 때 정한다. Host별 초기 layout은 YAML·CLI. Web 설정 변경도 같은 config를 갱신하고 사이드바 너비는 DB에 중복 저장하지 않는다. 실행 중 터미널·분할 방향/비율·탭 순서·선택 상태는 작업 화면별 서버 유지·복원. 브라우저를 닫아도 실행 유지, 재방문 시 현재 화면·배치·놓친 알림 복귀. 64KiB raw tail 재생은 정확한 화면 복원이 아니므로 이를 완성한다. daemon 재시작 후 자동 실행·대화 resume를 뜻하지 않는다.
- Web 일반 theme은 system/light/dark 세 값이고 system은 OS 현재 테마와 변경을 따르며 터미널 theme과 분리한다. 2026-09-17 사용자 확정으로 이 값은 localStorage가 아니라 나머지 설정과 같은 전역 config 파일에 저장한다. 따라서 저장소는 파일과 DB 둘뿐이며 브라우저 저장소에 설정을 남기지 않는다. 같은 날 다국어를 철회해 Language는 설정 항목에서 제거했고 Appearance에는 Theme만 남는다. 다만 theme은 눈으로 보고 골라야 하므로 누르는 즉시 화면에 미리보기로 적용하고 저장 전까지 미리보기임을 표시하며 Revert·Discard로 되돌린다. 터미널 외부 앱 appearance까지 변경하지 않는다. 터미널 폰트 변경도 fit/resize에 연결한다. 전역 파일 외부 변경·Web 저장은 같은 검증/적용 경로를 쓰고 잘못된 설정은 마지막 유효 상태 유지, 포트는 다음 daemon 시작에 적용한다.
- 참고 대상·목적: cmux 영역·탭/분할 조작·포커스 표현·단축키는 https://cmux.com/docs/concepts , https://manaflow-ai-cmux.mintlify.app/features/splits-and-panes , https://cmux.com/docs/keyboard-shortcuts . Paseo의 현재 영역에 새 터미널을 배치하는 동작·회귀 사례는 https://github.com/getpaseo/paseo/blob/main/packages/app/e2e/browser/direct-terminal-shortcut-pane-placement.spec.ts . 기존 문맥의 조사 링크이며 이번 로그 작성에서 외부 소스/테스트를 새로 검증한 것은 아니다. 구현 시 관련 부분을 읽고 참고하되 cmux의 초기 배치 정책을 그대로 복제한다는 뜻은 아니다.
- W3 구현 인계: 최소 Web은 /api/terminals 생성·목록과 /api/terminals/:id 조회, 기존 /ws/terminal/:id 연결을 사용한다. 목록은 {id,cwd,kind,alive}이고 비공개 terminal 문맥은 노출하지 않는다. Agent가 연결·종료·재실행돼도 같은 terminal 선택/살아 있는 attachment를 유지하며 끊긴 연결은 재선택 가능하다. /api/terminals/:id DELETE는 명시 종료이며 Web close와 연결하지 않는다. Node DOM/HTTP/attachment 대역 검증만 수행했고 실제 브라우저 UI·정확한 화면 복원·탭/분할 UI는 이 단계에서 구현·검증한다. web.sidebar.width는 default 없는 양의 유한수이고 host.layout 공통 해석은 packages/config에 구현됐다. keyboard 보존·keybindings schema/기본키 사전 논의 조건은 그대로다.
- 2026-09-10 사용자 결정으로 공통 headless·SerializeAddon snapshot 기반 구현은 Stage2-1(logs/2026-09-10-AIOX-TUI-Stage2-1-Terminal-Snapshot.md)이 선행 소유한다. Stage6는 해당 결과를 소비해 React·탭·분할·resize·재방문 화면 복귀에 통합하고 검증한다. 기존 raw tail 개선 요구는 유지되지만 구현을 중복하지 않으며 실제 완료 전에는 복원 완료로 간주하지 않는다.
- 2026-09-13 사용자 승인: 기존 cmux 참고 범위를 pane·tab·window UI/UX로 보완한다. React 운영 Web에서 알림 아이콘 클릭 시 dropdown에 항목을 표시하고 알림 클릭 시 해당 Agent가 포함된 작업 창·영역·탭으로 이동하며 해당 알림을 읽음 처리한다. 대상 터미널(B) 선택 클릭 시 해당 대상의 미확인 해제는 Stage2-3 W5의 현재 간단 Web에 구현·검증됐으므로 그 결과를 소비한다. 저장 이력 삭제는 아니다. 외부 UX owner는 docs/specs/aiox-configuration-web.md다. Stage7은 이 UI 결과를 소비해 상태·읽음·알림음 통합과 검증을 이어가며 삭제하거나 Stage6로 전체 이전하지 않는다.
- Stage2-3의 2026-09-14 최신 마감 entry 및 이 로그의 「Stage2-3 사용자 실측·현재 이유 표시 인계」를 소비한다. 현재 관측 이유 표시·교체·제거와 별도 오류 이력 비보존은 runtime spec 및 최소 Web 구현을 소비한다. React 운영 UI·popup·소리 등 기존 후속 범위는 유지한다. 사용자 실측을 agent 재실행·모든 환경 인증으로 확대하지 않으며 확인된 동일 사용 흐름을 일괄 재검증하지 않는다.
- 2026-09-14 사용자 확정 운영 Web 화면 모델. 사이드바는 workspace 목록 하나이며 Workspaces(Web에서 사용자가 생성, 여러 개)·Networks(aiox network create로만 생성)·Hosts(aiox host run으로만 생성) 세 섹션은 전부 같은 workspace 화면(pane 분할 + pane별 독립 탭바)을 연다. 생성 출처와 자동으로 들어오는 실행만 다르다. 사이드바는 전체 높이이고 로고를 품으며 메인 위 헤더 바가 workspace 맥락(Host는 작업 경로·worktree 브랜치, Network는 멤버 수)·검색·알림·설정·테마를 갖는다. 2026-09-17 사용자 확정으로 Settings 진입은 헤더 오른쪽 알림과 테마 사이의 톱니이며 사이드바 하단 Settings 행은 두지 않는다. 사이드바 전체가 토글 대상이라 접었을 때 클릭 진입이 사라지는 것을 막기 위함이고 커맨드 팔레트 항목은 유지하되 Settings 전용 단축키는 만들지 않는다. 사이드바와 메인은 flush이고 inset·아이콘 rail은 쓰지 않는다. agent run은 --network가 가리키는 workspace에 나타난다. 그 workspace 안에서 실행했으면 해당 pane이 vendor 화면이 되고, 밖에서 실행했으면 대상 workspace에 탭이 생기며 명령을 친 shell은 살아남는다. 첫 진입에 복원할 것이 없으면 shell 1개를 자동 생성한다. 2026-09-16에 빈 workspace 처리를 아래 항목으로 대체했으므로 이전의 Network·Host shell 재생성과 사용자 Workspace 자동 소멸은 적용하지 않는다. 이 모델은 사용자 결정이며 구현·검증 결과가 아니다.
- 위 화면 모델을 적용하려면 착수 시 docs/specs/aiox-configuration-web.md의 두 서술을 갱신해야 한다. 첫째, 외부 CLI 소유 실행을 'Web 목록·알림에서 제외'로 둔 계약을 '섹션 카드에는 표시하되 탭·화면·조작·알림 대상에서 제외'로 바꾼다. 외부 실행을 완전히 숨기면 Network workspace가 그 network의 일부만 보여 주고, 화면을 줄 수 없는 실행에 탭을 주면 빈 탭이 남기 때문이다. 둘째, 실행 소유권 표와 §15의 '기존 Web terminal에서 실행하고 등록 때문에 새 탭을 중복 생성하지 않는다. Agent 종료 후 원래 shell로 돌아온다'를 workspace 기반 배치 규칙으로 바꾼다. 그 문구는 CLI 중계로 shell 화면에 그리는 현재 구조를 전제로 한 것이라 전제가 바뀌면 중복 판정도 달라진다. 두 갱신 모두 사용자 결정을 반영하는 것이며 아직 문서에 적용하지 않았다. 남은 미결은 keybindings 기본키와 OS별 schema(spec이 구현 전 사용자 논의를 요구), 설정 화면 2차 프롬프트다.
- 2026-09-16 사용자 확정 배치·수명 규칙. 탭 닫기(x)는 배치 제거가 아니라 터미널 종료다. idle을 확인한 경우에만 즉시 닫고 실행 중이거나 판정 불가면 확인 dialog를 띄운다. 브라우저·브라우저 탭을 닫는 것은 이와 달라 아무것도 종료하지 않으며 재방문 시 화면이 복귀한다. external agent는 AIOX가 종료할 수 없으므로 닫기 버튼을 주지 않고 화면도 없으므로 탭에서 빼 섹션 카드에만 표시한다. 세 섹션 카드는 같은 문법을 쓴다. 제목과 개수, 상태 점이 붙은 agent 목록이며 소속 agent와 standalone을 나눠 센다. 빈 화면은 두 층이다. 섹션에 항목이 하나도 없을 때(Start here / No networks yet / No hosts yet)와 항목은 있으나 터미널이 없을 때(No terminals in <name>)가 서로 다른 문구를 갖는다. 어느 종류든 workspace가 비어도 사라지지 않고 빈 pane과 [+]를 유지하며 shell을 자동 재생성하지 않는다. aiox agent run의 network 상속은 도입하지 않는다. 실행 위치가 network를 물려주면 route 명령까지 상속 경계가 없어지고 외부 터미널에는 컨텍스트가 없어 같은 명령의 두 형태가 생긴다. terminalContext는 {terminalId, token}뿐이며(packages/protocol/src/index.ts:55-58) network 소속은 terminal이 아니라 agent의 속성이다. 이 규칙은 사용자 결정이며 구현·검증 결과가 아니다.
- 2026-09-16 사용자 확정 패널 생성·소유 규칙. 세 섹션(WORKSPACES·NETWORKS·HOSTS) 헤더 모두에 [+]를 두고 어느 섹션에서 만들든 같은 workspace 화면을 여는 패널이 생긴다. 우클릭 메뉴는 섹션이 아니라 생성 주체로 갈린다. 사용자가 [+]로 만든 패널은 Rename·Delete를 제공하고 CLI가 만든 패널(aiox network create, aiox host run 소유)은 메뉴를 주지 않는다. 다만 메뉴를 안 여는 것과 핸들러를 안 붙이는 것은 다르며 후자는 브라우저 기본 컨텍스트 메뉴를 부른다. NETWORKS의 [+] 패널은 network 상속을 도입하지 않기로 한 결정 때문에 WORKSPACES의 [+] 패널과 기능이 같고 속한 섹션만 다르다. 이 점은 사용자에게 알렸고 그대로 가기로 했다. 패널 빈 화면 문구도 생성 주체로 갈린다. [+]로 만든 패널은 추천할 명령이 없으므로 명령 없이 'No terminals here'만 보여 주고 CLI가 만든 패널은 'No terminals in <name>'과 해당 명령을 보여 준다. 이 규칙은 사용자 결정이며 구현·검증 결과가 아니다.
- 프로토타입과 그 디버그 패널은 구현에 포함하지 않는다. 파일이 Claude Design canvas 포맷이라 코드를 React로 재사용하지 않으며 프로토타입에서 확정되는 것은 화면 규칙(섹션·필드·검증·dialog 발생 조건·문구)뿐이다. 디버그 패널은 daemon과 agent가 없는 정적 HTML에서 관측할 수 없는 상태를 눈으로 보기 위해 1차 프롬프트가 요청한 확인 장치다(logs/artifact/AIOX-Web-UI-Design-Prompt.md의 '추가로 넣어주면 좋은 것'). 다만 그 토글이 재현한 상태 집합은 React 구현에서 fixture·mock으로 다시 만들어 검증해야 하므로 Stage6 구현 착수 시 검증 대상 목록으로 소비한다. 해당 상태는 agentViewSchema.status 5개(aiox-preparing·idle·working·awaiting-user·failed), 판정 불가 터미널, daemon 연결 끊김의 헤더 경고, config.json 외부 변경의 화면 열 때 배너와 저장 시점 충돌 dialog, 섹션 빈 화면 두 층(항목 없음과 터미널 없음), 드롭 존 두께, 테마 전환, status bar 기본 열림, 알림 추가에 따른 dropdown 표시와 읽음 처리다. 이 목록은 프로토타입 토글에서 도출한 검증 후보이며 확정된 test 계획이 아니다.
- 2026-09-17 사용자 확정 반응형 범위. 대상은 사이드바·헤더·설정 화면 셋이며 터미널 영역(pane 분할·pane별 탭바·xterm 본문)은 창 폭에 따라 레이아웃을 바꾸지 않는다. pane 4개면 각 폭이 1/4로 줄고 xterm이 fit/resize 될 뿐이며 세로 쌓기·분할 자동 해제·탭바 드롭다운 전환을 하지 않는다. 목적은 폰 전용 화면이 아니라 데스크톱 브라우저 창 축소 대응이므로 기준선은 데스크톱이고, 물리 키보드 부재를 전제하지 않아 keybindings의 Change 키 캡처를 유지한다. breakpoint는 하나이며 값은 12차에서 760px에서 768px로 바꿨다. 채택하기로 한 shadcn Sidebar의 기본 경계가 768이고 760은 임의로 고른 값이었기 때문이다. 360px~768px 미만이 좁은 폭, 360px 미만은 비대상이다. 좁은 폭에서 사이드바는 기본 닫힘 오버레이 드로어이며(햄버거·Cmd+B로 열고 바깥·Esc·workspace 선택으로 닫힘, 리사이즈 핸들 숨김, 폭 고정 280px 초안) 메인 폭을 줄이지 않는다. 헤더는 햄버거 추가·검색 입력의 아이콘화이고 workspace 이름과 맥락은 11차·12차에서 폭 기반 단일 규칙으로 정리했다. 맥락이 먼저 줄고 이름이 마지막까지 남으며 넘치면 말줄임표를 쓰고 이 규칙은 경계와 무관하게 모든 폭에 적용한다. 알림·설정·테마 세 아이콘은 10차의 드로어 하단이 아니라 11차 이후 드로어 상단 브랜드 줄 오른쪽, 즉 로고 반대편에 나열하며 미확인이 있으면 햄버거에 점을 붙여 인지 경로를 남긴다. 좁은 폭 알림은 드로어 위에 뜨는 dropdown이고 Esc는 패널 다음 드로어 순으로 닫으며 backdrop 클릭은 둘을 함께 닫는다. 좁은 폭에서 화면을 이동시키는 동작(알림 항목·팔레트 결과·workspace 선택·설정 진입)은 드로어도 닫고 테마 토글처럼 이동이 아닌 동작은 드로어를 유지한다. 설정 화면은 섹션 nav 상단 가로 탭·1열 스택·Host layout preset 2x2이고 하단 Save 바와 dialog 기본 포커스 규칙을 유지한다. 이 규칙은 사용자 결정이며 구현·검증 결과가 아니다.
- 2026-09-17 사용자 결정. 운영 Web 사이드바는 직접 만들지 않고 shadcn-ui의 Sidebar를 채택한다(사용자가 제시한 참고 블록 https://ui.shadcn.com/blocks/sidebar#sidebar-01). shadcn은 의존성이 아니라 레지스트리에서 소스를 복사해 오는 방식이라 복사본 수정이 유지보수 부담이 되지 않는다. 레지스트리 소스에서 확인한 사실. SidebarProvider·Sidebar·SidebarHeader/Content/Footer·SidebarGroup 계열·SidebarMenu 계열·SidebarTrigger·SidebarRail·SidebarInset·useSidebar를 제공하고 좁은 폭에서는 Sheet 오버레이가 되며 단축키 상수는 SIDEBAR_KEYBOARD_SHORTCUT "b"로 Cmd/Ctrl+B다. 경계는 use-mobile 훅의 MOBILE_BREAKPOINT 768이고 window.innerWidth와 matchMedia로 판정한다. 폭은 SIDEBAR_WIDTH 16rem·SIDEBAR_WIDTH_MOBILE 18rem·SIDEBAR_WIDTH_ICON 3rem 상수이며 collapsible은 offcanvas·icon·none이고 sidebar-01 블록의 registryDependencies는 sidebar·breadcrumb·separator·label·dropdown-menu다. 착수 시 처리할 충돌 셋. (1) setOpen이 controlled 모드에서도 document.cookie에 sidebar_state를 max-age 7일로 무조건 쓴다. 저장소를 파일과 DB 둘로 한정한 결정과 충돌하므로 복사본에서 그 한 줄을 지우고 열림 상태는 전역 config로 보낸다. (2) SidebarRail은 toggleSidebar를 부르는 버튼이고 cursor-w-resize는 커서 힌트일 뿐이라 드래그 리사이즈가 없다. 실측으로 확정한 240 기본·180~400 드래그 리사이즈는 별도로 붙이거나 값을 재검토해야 한다. (3) SidebarProvider가 자체 keydown 리스너로 Cmd+B를 잡고 preventDefault를 부르므로 우리 전역 keybindings의 Cmd+B 분기와 이중 처리된다. 둘 중 하나만 남긴다. 이 채택은 사용자 결정이며 구현·검증 결과가 아니다.

### {W2}

- keybindings 검증 상태. 각 키에 두 종류의 검증이 붙는다. (1) xterm 비용: @xterm/xterm@6.0.0 evaluateKeyboardEvent로 판정하며 Cmd+문자·Cmd+숫자는 default 분기로 비용 0, Cmd+Enter·Ctrl+Shift+Enter·Ctrl+Shift+방향키는 바이트가 나간다. 확정 후보는 전부 비용 0이다. (2) 브라우저 예약: 사용자 직접 입력으로만 판정 가능하며 CDP 주입 경로로는 검증할 수 없다. 2026-09-17 macOS Chrome 151 실측으로 확정된 자리는 Cmd+Shift+S 새 shell 탭, Cmd+D 오른쪽 분할, Cmd+Shift+D 아래 분할, Cmd+Shift+X 탭 닫기, Cmd+Option+HJKL 방향 포커스 이동, Cmd+Shift+M 영역 확대·복귀, Cmd+Shift+= 크기 균등화, Cmd+Shift+P 현재 pane 강조, Cmd+B 사이드바 토글이다. Cmd+Option 계열 4개가 모두 통과해 개발자도구 충돌이 없음을 확인했다. 탈락은 Cmd+Shift+N 시크릿 창, Cmd+Shift+W 창 닫기, Cmd+Shift+K 사용자 Notion 전역 단축키, Cmd+Shift+Y, 순차 탭 전환 후보 Cmd+Option+좌우·Cmd+Shift+대괄호·Ctrl+Tab, Cmd+Delete 계열이며 미도달 원인은 브라우저 점유와 실측 페이지 매칭 실패를 구분하지 않았다. 통과한 미사용 여유 후보는 Cmd+Shift+E·F·G·U·V·A와 Cmd+Option+I·U·C다. 남은 미확정은 탭 전환 하나이며 Cmd+1만 통과 확인됐고 Cmd+2~9와 Cmd+Shift+1~9는 미실측이라 계열로 일반화하지 않는다. 기본값 방향은 OS별 한 번 누르는 조합이고 leader는 미채택으로 확정됐다. config는 기본키를 코드가 제공하고 사용자 변경분만 저장하며 OS별 재지정을 지원한다. 이 결과는 macOS 한정이며 Windows/Linux는 사용자 지시로 연기해 미확정으로 둔다.
- 다음 세션 재개 지점. 13차 반영본 프로토타입은 아직 없다. 직전 검토본은 logs/artifact/aiox-version7.html(12차 반영본, untracked)이고 12차 2건은 소스로 확인해 닫혔다. 이전 검토본 aiox-version1~6.html은 사용자가 교체하며 삭제했으므로 이 로그와 프롬프트 파일의 그 경로 언급은 dangling이고 복구 대상이 아니다. 프롬프트 누적 파일은 logs/artifact/AIOX-Web-UI-Design-Prompt.md(1271줄, 13차까지)다. 다음 반영본이 오면 13차 4건을 본다. (1) Local Storage에 aiox.* 키가 하나도 없는지. (2) 헤더 ☀으로 테마를 바꾼 뒤 설정 화면의 Appearance Theme이 그 값을 가리키고 변경 카운트가 No changes인지, 사이드바 드래그 뒤에도 같은지. (3) 알림 항목 클릭에 미확인 수만 줄고 항목은 흐리게 남는지, Mark all read 뒤에도 세 항목이 남는지, ×는 여전히 치우는지. (4) 360px에서 드로어를 연 채 ⌘⇧S로 만든 새 shell이 가려지지 않는지. aiox-version7.html은 소스만 읽고 브라우저로 조작하지 않았으므로 다음 검토에서 12차 항목의 렌더링 결과도 함께 실측한다. 768/767 경계의 실제 전환 화면, 좁은 폭에서 이동 결과의 가림 해소, 360px~1200px 가로 스크롤바 없음(scrollWidth == clientWidth)이다. 함께 유지 여부를 볼 것들은 헤더 이름이 어느 폭에서도 사라지지 않고 맥락이 먼저 줄어드는 것, 드로어 상단이 왼쪽 AIOX·오른쪽 세 아이콘이고 목록이 길어도 남는 것, 알림이 드로어 위 dropdown으로 뜨는 것, Esc가 패널 다음 드로어 순인 것, backdrop 클릭이 둘을 함께 닫는 것, 다국어 철회, 헤더 톱니와 활성 표시, 오버레이 드로어에서 메인 폭 불변, 햄버거 점, 상단 가로 탭·1열 설정과 Change 유지, 터미널 pane·탭바가 폭에 따라 레이아웃을 바꾸지 않는 것이다. 정리 대상으로 남긴 관찰 하나는 hasMeta가 계산되지만 마크업에서 쓰이지 않는 죽은 바인딩이라는 것이다. 소스를 읽을 때는 파일이 Claude Design 번들이라 gzip+base64를 풀어야 한다. __bundler/manifest script(현재 line 381)의 JSON 값들과 __bundler/template script(현재 line 393)의 JSON 문자열을 디코드하면 앱 HTML이 나오고, 앱 코드는 template 쪽에 있다. 실제 조작 재검토는 파일을 localhost 정적 서버로 띄워(file:// 은 확장이 거부) 한다. 브라우저 도구 주의 셋. resize_window가 성공을 반환해도 뷰포트가 바뀌지 않을 수 있어 폭 검증은 폭을 지정한 iframe wrapper 안에서 하되, iframe의 width 속성만 바꾸면 iframe window의 resize 이벤트도 documentElement의 ResizeObserver도 발화하지 않으므로(계측으로 확인) 폭을 바꾼 뒤 iframe window에 resize 이벤트를 직접 dispatch해야 한다. 이 절차 없이 측정하면 반응형이 동작하지 않는 것으로 잘못 읽는다. screenshot 좌표 프레임은 뷰포트 CSS px과 배율이 다를 수 있으므로 매번 innerWidth와 screenshot 폭을 대조해 확인하고 클릭은 직전 screenshot 프레임 좌표로 한다. 키보드 단축키는 iframe 안을 한 번 클릭해 포커스를 넣은 뒤에야 전달된다.

## 2026-09-09 · 단계별 확정 요구와 인계 준비

사용자의 단계별 로그 생성 지시에 따라 Required Context에 구현 범위·선행 결과 소비·참고 자료·사전 논의 조건을 기록했다. 아직 이 단계의 구현을 시작하지 않았다. plan이 이 단계를 활성화하면 선행 로그 최신 기록과 실제 코드부터 대조하고 그때 필요한 Work Items를 구성한다. 이번 기록은 기능 구현·외부 참고 자료 검증 결과가 아니다.

### 2026-09-13 14:44 · cmux UI 참고와 React 알림 UI 인계 보완

사용자가 기존 cmux 참고를 pane·tab·window UI/UX 범위로 보완하고 Stage6 React 운영 Web의 알림 아이콘 dropdown·Agent가 포함된 창으로 이동을 문서에 반영하도록 승인했다. Agent B 클릭 시 B의 미확인 알림을 읽음 처리하는 간단 정책을 적용하며 이력 삭제를 뜻하지 않는다. configuration-web spec이 UX를 소유하고 이 로그는 해당 구현 단계의 인계를 소유한다. Stage7은 기존 순서에서 UI 결과를 소비하며 전체 알림 단계를 이동·삭제하지 않는다. 이번은 문서 반영이며 구현이나 cmux 최신 동작 실측을 수행하지 않았다.

### 2026-09-13 14:47 · 터미널 선택 읽음 범위 정정과 알림 억제 기준 확정

앞선 entry의 'Agent B 클릭'과 Stage6 귀속 표현을 정정한다. B는 선택할 터미널을 뜻하며 대상 터미널(B) 선택 클릭 시 해당 대상 미확인 알림 해제는 현재 간단 Web 적용 목표다. 이를 Stage6까지 미루지 않는다. Stage6는 React dropdown과 알림 클릭 시 해당 Agent가 포함된 창으로 이동·해당 알림 읽음 처리를 구현할 단계다.

사용자는 알림 억제를 브라우저 창·탭 활성과 선택 terminal 기준으로 확정했다. 검색창·버튼으로 입력 포커스가 옮겨도 선택이 유지되면 억제하고 다른 앱·브라우저 탭으로 이동하면 해당 terminal도 알림 대상이다. 기존 실제 terminal 입력 포커스 요구를 이 기준으로 대체했다. popup·소리·알림 목록 추가·미확인 표시 억제이며 메시지 처리 결과·필수 알림 저장 기록 삭제가 아니다. 이번은 target 문서 정합이며 구현에 착수하지 않았다.

### 2026-09-13 15:35 · W5 SSE·Web 알림 선행 결과 소비와 후속 범위 유지

Stage2-3 W5의 SSE 변경 통지·Web 소유 실행 목록/알림 한정·활성 창/탭과 선택 terminal 기반 미확인 억제·대상 선택 읽음·최소 미확인 표시 구현 결과를 소비한다. root 전체 검사 527 tests와 actual built daemon/SSE, Chromium 대역 검증의 범위·한계는 부모 Stage2-3 최신 수용 entry를 따른다. 실제 native 창·탭 전환은 브라우저 환경에서 확인하지 못했고 focus 입력 대역 검증으로 구분한다.

cmux pane·tab·window와 React dropdown·알림 클릭의 대상 창 이동, popup·소리 통합은 기존 Stage6/7 후속 범위로 유지한다. 저장된 알림 이력 삭제나 외부 CLI 실행의 Web 노출로 확대하지 않는다. 이 단계의 구현을 착수·완료 처리하지 않는다.

### 2026-09-14 00:25 · Stage2-3 사용자 실측·현재 이유 표시 인계

사용자는 host:4501 운영 Web 접속·Claude 실행과 브라우저 창/탭 전환에 따른 알림 표시·읽음 처리까지 이전에 직접 확인했다고 보고했다. 이 사용 흐름의 사용자 실측 근거로 수용하고 같은 검증을 반복 요구하지 않는다. 이번 세션의 agent 재실행 결과는 아니며 OS·WSL 구성, 브라우저/vendor 버전과 실행 SHA는 특정되지 않았다. Windows 네이티브와 WSL 각각의 전체 인증이나 모든 vendor 메시지·중단 시나리오 완료로 확대하지 않는다.

현재 관측 이유 표시·교체·제거와 별도 오류 이력 비보존은 runtime spec 및 최소 Web 구현을 소비한다. React 운영 UI·popup·소리 등 기존 후속 범위는 유지한다. Stage2-3은 마감하되 후속 단계 활성화·착수는 하지 않았다.

## 2026-09-14 · 운영 Web UI 구조 확정과 디자인 프롬프트 산출

사용자와 운영 Web의 화면 구조를 확정하고 외부 디자인 세션용 프롬프트를 만들었다. 구현에 착수하지 않았고 프로토타입도 아직 받지 않았다. plan의 활성 단계는 Stage 4이며 이 기록은 Stage 6 활성화 시 소비할 선행 결정이다. 확정한 구조 모델 자체는 Required Context에 두고 여기에는 판단 근거를 남긴다.

cmux(concepts, splits-and-panes, keyboard-shortcuts, getting-started)와 Paseo(public-docs의 workspaces.md, orchestration.md)를 이번 세션에서 직접 읽었다. cmux는 Window > Workspace > Pane > Surface 계층이고 첫 실행에 workspace 1개가 이미 열려 있으며 마지막 pane을 닫지 못하게 해 빈 상태를 설계에서 제거한다. Paseo는 Project > Workspace > Session이며 workspace 준비와 agent 실행을 분리한다. AIOX의 Host는 Paseo Workspace에, AIOX terminal은 Session에 대응하고 Network는 두 제품 모두 대응물이 없다. 이 조사는 공개 문서 읽기이며 두 제품의 실제 동작 실측이 아니다.

기존 사이드바 3섹션(일반 터미널·Hosts·Networks)은 앞 둘이 장소이고 Networks만 조회 대상이라 성격이 섞여 있었다. 사용자가 Network도 장소로 취급하려던 의도를 밝혀, 셋을 모두 같은 workspace로 통일하고 생성 출처만 구분하는 모델로 바꿨다.

논의 중 agent 실행 구조를 코드에서 재확인해 세션 중반의 설명을 정정했다. shell에 vendor runtime이 얹히는 것이 아니라 daemon이 createTerminal로 agent PTY를 별도 생성하고(`apps/daemon/src/agent-controller.ts:129`) 그 바이트를 WS로 CLI에 중계해 명령을 친 shell 화면에 그린다. terminalContext는 실행 위치 인증용이고 borrowing은 Runtime을 그 shell에 귀속시키는 것이다(`apps/daemon/src/daemon.ts:632-658`). 따라서 agent terminal을 network workspace의 탭으로 두는 구성은 새 자원 계약 추가가 아니라 중계 경로를 어떻게 처리할지의 문제다.

daemon stop의 idle 판정은 shell integration을 심을 수 있을 때만 가능하다. POSIX + bash/zsh/fish + args 없음이 조건이고 그 외에는 `busy: () => true`로 고정된다(`packages/terminal/src/shell-integration.ts:33-35`). 중첩 실행 자체는 `[[ $__aiox_idle = 1 && -z $(jobs -p) ]]`로 잡히므로 "중첩을 안 본다"가 아니라 "물어볼 창구가 없다"가 정확한 서술이다. 아래 빈 workspace shell 재생성 규칙은 이 조건에서만 stop을 막을 수 있으며 알려진 한계로 둔다.

디자인 프롬프트는 `logs/artifact/AIOX-Web-UI-Design-Prompt.md`에 두었다. 1차 범위는 사이드바·workspace 화면·알림이고 설정 화면은 2차로 분리했다. 산출물은 동작하는 단일 HTML 프로토타입, 톤은 dark-first 고밀도, UI 문구는 영어로 정했다. 정적 이미지로는 드롭 존 두께·드롭 미리보기·리사이즈 감각을 판정할 수 없다는 이유다. 사이드바 기본 240px·최소 180px·최대 400px은 프로토타입 검증용 초안이며 확정값이 아니다.

### 2026-09-16 21:51 · 1차 프로토타입 검토와 배치·수명 규칙 확정

클로드 앱에서 받은 1차 프로토타입을 로컬에서 실행해 검토했다. Claude Design canvas 포맷(`x-dc` 템플릿 + 전용 런타임)이라 React 구현에 코드를 재사용하지 않고 동작·감각 판정용으로만 쓴다. 사이드바 아코디언, 섹션 카드, 세 가지 섹션 빈 화면, workspace 삭제 dialog, 사이드바 리사이즈 클램프(기본 240·최소 180·최대 400)를 직접 조작해 확인했다. 180px에서도 항목 이름과 개수가 잘리지 않아 최소값으로 유지한다. 탭 드래그·분할과 드롭 미리보기는 HTML5 drag-and-drop이 합성 마우스 이벤트로 발화하지 않아 확인하지 못했고 사용자 직접 판정으로 남긴다.

디자인 프롬프트의 agent 상태 목록이 stale이었음을 확인하고 정정했다. 7개(`starting`·`reasoning`·`tool`·`stopped` 포함)로 적었으나 실제 `agentViewSchema.status`는 5개(`aiox-preparing`·`idle`·`working`·`awaiting-user`·`failed`)이며 `packages/protocol/src/index.test.ts:214`가 나머지를 명시적으로 거부한다. 프로토타입이 맞고 프롬프트가 틀렸다.

프로토타입의 삭제 판정이 daemon과 어긋나는 것을 확인했다. 프로토타입은 agent 상태가 `idle`이면 터미널도 idle로 보아 dialog 없이 삭제하지만 `apps/daemon/src/daemon.ts:504`는 `live.length > 0`이면 상태와 무관하게 종료를 막는다. vendor의 `idle`은 턴이 돌지 않는다는 뜻이지 터미널이 한가하다는 뜻이 아니다. 살아 있는 agent 터미널은 항상 running으로 표시하도록 교정 프롬프트에 넣었다.

사용자가 이번 논의에서 확정한 배치·수명 규칙은 다음과 같다. 탭 닫기는 종료이며 idle을 확인한 경우에만 즉시 닫고 실행 중이거나 판정 불가면 확인 dialog를 띄운다. 브라우저·브라우저 탭을 닫는 것은 이와 달라 아무것도 종료하지 않는다. external agent는 AIOX가 종료할 수 없으므로 닫기 버튼을 주지 않고, 화면도 보여줄 수 없으므로 탭에서 빼 섹션 카드에만 표시한다. 카드는 소속 agent와 standalone을 나눠 세며 `standalone`은 이 제품이 이미 쓰는 용어다. 빈 화면은 두 층으로 구분한다. 섹션에 항목이 하나도 없을 때와 항목은 있으나 터미널이 없을 때가 다른 문구를 갖는다.

`aiox agent run`의 network 상속은 도입하지 않기로 했다. 실행 위치가 network 컨텍스트를 물려주면 `network block`·`unblock` 같은 route 명령까지 어디까지 상속할지 경계가 없어지고, 외부 터미널에는 컨텍스트가 없어 같은 명령의 두 가지 형태가 생긴다. `terminalContext`는 `{terminalId, token}`뿐이라(`packages/protocol/src/index.ts:55-58`) network를 실어 나르지 않으며 network 소속은 terminal이 아니라 agent의 속성이다. 대신 빈 화면이 필요한 명령을 그대로 보여 주는 방식으로 타이핑 부담만 덜었다.

### 2026-09-17 11:57 · 2·3차 프로토타입 검토와 디자인 수렴

4차·5차 프롬프트를 반영한 프로토타입(`logs/artifact/aiox-version2.html`)을 받아 12개 항목을 로컬에서 하나씩 조작해 확인했다. 살아 있는 agent는 상태와 무관하게 `running`으로 잡히고(debug로 `idle`을 넣어도 닫기 dialog가 뜬다), 판정 불가 터미널이 fixture에 들어가 삭제 dialog에서 `idle`·`running`·`status unknown` 세 상태가 모두 보이며, 두 dialog 모두 `Cancel`에 포커스가 간다. external agent는 탭과 pane 안내 화면에서 빠져 카드로만 남았고, 섹션 빈 화면은 명령 나열로 바뀌었으며, 세 섹션 헤더 모두에 `+`가 붙었다. 탭을 닫아도 shell을 자동 재생성하지 않는 것도 확인했다. 디버그 패널의 agent 상태 select가 실제 5개 값만 갖는 것도 함께 확인해 앞선 정정이 반영됐음을 확인했다.

같은 검토에서 두 가지를 찾아 6차 프롬프트로 냈고 3차 프로토타입(`logs/artifact/AIOX Workspace.html`)에서 수정을 확인했다. 첫째, CLI가 만든 패널의 우클릭 핸들러를 `null`로 두어 `preventDefault()`가 걸리지 않았고 그 결과 브라우저 기본 컨텍스트 메뉴가 떴다. 메뉴를 안 여는 것과 핸들러를 안 붙이는 것은 다르다. 둘째, `standalone`을 external과 같은 카드 전용으로 구현해 `1 standalone`을 보고 패널을 열어도 해당 agent가 없었다. external은 AIOX가 띄운 터미널이 아니라 화면이 없지만 standalone은 `--network` 없이 실행된 평범한 agent라 탭이 있어야 한다. 카드가 패널에서 agent를 모을 때 standalone id를 위쪽 목록에서 빼야 중복도 생기지 않는다. 두 수정 모두 적용됐고 사용자 workspace의 rename·delete 메뉴에는 회귀가 없다.

CLI 소유 패널 표시는 배지 대신 이름을 monospace로 바꾸는 방식이 들어왔다. 요청한 것은 아니지만 배지가 아니고 읽히므로 유지한다. 디자인 프롬프트는 6차까지 `logs/artifact/AIOX-Web-UI-Design-Prompt.md`에 누적돼 있다. 프로토타입은 Claude Design canvas 포맷이라 React 구현에 코드를 재사용하지 않으며 여기서 확정한 것은 화면 규칙이지 구현이 아니다.

## 2026-09-17 · 설정 화면 keybindings 기본키 논의 착수

W2의 선행 조건인 keybindings 기본키 논의를 시작했다. spec(`docs/specs/aiox-configuration-web.md:45-48`)이 구현 전 사용자 논의를 요구하는 항목이다. **아무것도 확정하지 않았고 사용자 결정도 받지 않았다.** 아래는 코드로 확인한 제약과 두 agent가 합의한 제안이며 다음 세션에서 사용자 결정을 받아야 한다.

사용자가 다른 agent(codex)에게 Playwright로 브라우저 예약키 충돌 조사를 시켰고, 그 결과가 `Cmd+T`/`Cmd+W`는 `preventDefault()` 유무와 무관하게 새 탭·닫기가 발생하지 않는다는 것이었다. 이 결과는 false negative다. 사용자가 실제 Chrome에서 직접 `Cmd+T`를 눌렀을 때는 새 탭이 열리고 페이지에는 로그가 남지 않았다. 관측으로 확정된 것은 실제 `Cmd+T`가 브라우저 탭을 열고 페이지에 도달하지 않는다는 것이며, 이것만으로 `Cmd+T` 계열을 기본키에서 제외하는 근거는 충분하다. CDP가 브라우저 프로세스 accelerator를 우회한다는 메커니즘 설명은 이 세션의 추론이고 Chromium 구현으로 확인한 것이 아니다.

자동화 한계의 범위를 좁혀서 기록한다. CDP 주입 경로(Playwright, 브라우저 확장)는 브라우저 accelerator를 관측하지 못하므로 키 충돌 검사에 쓸 수 없다. OS 입력 경로를 쓰는 데스크톱 자동화는 원리상 가능하지만 현재 환경에서 브라우저가 read tier라 키 입력이 차단되어 agent가 실행할 수 없다. 따라서 브라우저 예약키 판정은 사용자 직접 입력으로만 닫힌다. 드래그 검증(W1)과 같은 부류의 제약이다.

`@xterm/xterm@6.0.0`의 `evaluateKeyboardEvent`(`lib/xterm.js`)를 읽어 PTY로 나가는 바이트 경계를 확인했다. 이 세션에서 처음 제시한 "macOS의 Cmd 조합은 안전하고 Windows/Linux의 Ctrl+Shift 조합은 안전하다"는 서술은 틀렸다. `default` 분기(문자키)만 보고 전체로 일반화했으나 방향키와 Enter는 앞선 `case`에서 따로 처리된다. codex가 반례를 제시했고 소스로 재확인해 정정했다. 실제 경계는 다음과 같다. `case 13`은 `o.key = altKey ? ESC+CR : CR`로 meta/ctrl/shift를 보지 않아 `Cmd+Enter`와 `Ctrl+Shift+Enter` 모두 `\r`을 보낸다. `case 37/38/39/40`은 `if (e.metaKey) break`로 Cmd만 막으므로 macOS `Cmd+방향키`는 바이트가 없지만 `Ctrl+Shift+←`는 `ESC[1;6D`, `Ctrl+Shift+Alt+←`는 `ESC[1;8D`를 보낸다. `default` 분기에서는 `Cmd+문자`(macOS, `Cmd+A`는 xterm select-all)와 `Ctrl+Shift+문자`가 `o.key`를 채우지 않아 바이트가 없다.

이 확인으로 문제의 프레임이 바뀌었다. `attachCustomKeyEventHandler`로 어떤 키든 가로채 xterm에 전달하지 않을 수 있으므로 "터미널에 안전한 키를 찾는" 문제가 아니라 "TUI에서 무엇을 뺏을지 고르는" 문제다. 위 표는 못 쓰는 키 목록이 아니라 비용이 드는 키 목록이다. 바이트가 원래 안 나가는 조합은 비용 0이고, 나가는 조합은 가져오면 vendor TUI와 shell이 그 입력을 못 받는다. 이 프레임에서 드러난 구조적 제약은 Windows/Linux에는 modifier+방향키 중 비용 0인 조합이 없다는 것이다. `a` 비트마스크가 shift/alt/ctrl을 모두 포함하므로 어떤 조합이든 `ESC[1;Nx`가 나간다. macOS만 `metaKey` guard로 탈출구가 있다. 따라서 방향 포커스 이동을 문자키(vim식 H/J/K/L)로 두면 양쪽 모두 비용 0이며 이 판정은 추가 실측 없이 소스로 닫힌다.

단축키 대상 목록을 두 건 교정했다. 첫째, 이 세션에서 「현재 pane 강조는 별도 키가 불필요하다」고 목록을 줄였으나 Required Context의 단축키 대상 8개에 명시된 항목이므로 근거 없는 축소였다. 후보로 되돌렸고 불필요하다는 것은 이 세션의 의견으로만 남긴다. 둘째, codex가 「합의된 탭 닫기·프로세스 종료가 표에서 빠졌다」고 지적했으나 로그를 확인한 결과 단축키 대상 8개에 없고 2026-09-16 결정은 `x` 버튼과 dialog 동작이지 단축키가 아니다. 기존 합의가 아니라 신규 후보로 올린다.

기본값 방향에 대해 두 agent 의견이 일치했으나 사용자 결정은 받지 않았다. OS별로 한 번 누르는 조합을 기본값으로 하고 leader 방식(tmux식 prefix)은 채택하지 않는다. leader는 두 번 입력해야 하고 leader 자체가 터미널 입력을 차지하며 필요한 상황이 아직 확인되지 않았다. 일괄 변환 규칙(Cmd→Ctrl, Cmd→Ctrl+Shift 어느 쪽이든)으로 확정하지 않고 기능별 예외를 허용한다. config는 기본키를 코드가 제공하고 사용자 변경분만 저장하며 OS별 재지정은 지원하되 전체 기본값을 파일에 복사하게 만들지 않는다. 정확한 schema는 키 목록 확정 후 정한다. 기존 `keyboard` 문자열 맵은 schema 검증·파싱 외 실행 소비자를 찾지 못했으나 spec이 보존을 요구하므로 이번 논의로 제거하거나 의미를 바꾸지 않는다.

프로토타입(`logs/artifact/AIOX Workspace.html`)이 "New shell"에 `⌘T`를, 분할에 `⌘D`/`⌘⇧D`를, 사이드바에 `⌘B`를, 검색에 `⌘K`를 표시하고 있다. `⌘T`는 위 실측으로 제외 대상이므로 키 목록이 확정되면 디자인 프롬프트로 교정해야 한다.

### 2026-09-17 13:29 · config 방향 확정과 1차 브라우저 예약키 실측

보류 중이던 사용자 결정 2건 중 하나가 닫혔다. **config 방향은 확정됐다.** 기본키는 코드가
제공하고 config 파일에는 사용자가 바꾼 것만 저장하며 OS별 재지정은 지원하되 전체 기본값을
파일에 복사하지 않는다. 제품 기본값을 나중에 고쳐도 기존 사용자에게 반영된다는 점이 근거다.
정확한 schema는 키 목록 확정 후로 미룬다. **기본값 방향(OS별 한 번 누르는 조합 + leader
미채택)은 확정되지 않았다.** 사용자가 실측에서 탈락하는 키 수를 보고 정하기로 했다.
Windows/Linux 실측은 사용자 지시로 연기했고 해당 OS 기본키는 미확정으로 둔다.

브라우저 예약키 실측 페이지를 만들어 사용자가 직접 판정했다. 전역 `keydown`을 capture 단계에서
`preventDefault()`하고 후보 도달을 자동 표시하며 브라우저 동반 반응과 미도달은 사용자가 행에서
표시하는 단일 HTML이다. 일회성 판정 도구라 repo에 두지 않았다. 대조군으로 넣은 `⌘T`가 미도달로
나와 페이지 동작 자체가 검증됐다. 브라우저는 Chrome 151, macOS다.

1차 실측으로 단축키 대상 9개 자리가 닫혔다. `⌘D`(오른쪽 분할), `⌘⇧D`(아래 분할),
`⌘⌥H/J/K/L`(방향 포커스 이동), `⌘⇧M`(영역 확대·복귀), `⌘⇧=`(크기 균등화), `⌘B`(사이드바
토글), `⌘⇧P`(현재 pane 강조)가 모두 페이지에 도달했고 브라우저 동반 반응이 없었다. 탈락은
`⌘⇧N`(시크릿 창), `⌘⇧W`(창 닫기), `⌘⇧K`, `⌘⇧Y`다. 여유 후보 `⌘⇧E`·`⌘⇧G`·`⌘⇧U`는 통과해
대체용으로 남는다. `⌘⇧Y`는 도달하지 않았으나 브라우저 반응도 관측되지 않아 원인이 불명이다.
사용자가 K와 Y에 대해 관찰을 남긴 것을 근거로 미표시 5개를 모두 "눌렀으나 미도달"로 판정했으며,
이 전제는 사용자에게 확인을 요청했다.

`⌘⇧K` 탈락은 브라우저 예약이 아니라 사용자 환경의 Notion 전역 단축키였다. 성격이 다르므로
구분해 기록한다. 다른 사용자 환경에서는 비어 있을 수 있으나 Notion이 흔하므로 기본키에서
제외한다. 이 사례는 기본키만으로 개인 앱 단축키 충돌을 회피할 수 없다는 것을 보여 주며 확정된
config 재지정 요구의 실제 근거가 된다.

남은 자리는 새 shell 탭, 탭 전환, 탭 닫기 셋이다. 통과한 여유 후보 3개를 그대로 끼우면 개수는
맞으나 의미 연결이 없고 탭 전환은 방향·숫자 계열이 자연스러워 문자키가 특히 부적절하다. 2차
실측 목록으로 `⌘⌥` 계열 재확인(`⌘⌥J/I/U/C`), 새 shell 후보(`⌘⇧S/F/V/A`), 탭 전환 후보
(`⌘⌥←/→`, `⌘⇧[`, `⌘⇧]`, `Ctrl+Tab`, `⌘1`), 탭 닫기 후보(`⌘⇧X`, `⌘⌫`, `⌘⇧⌫`)를 만들었다.
`⌘⌥` 재확인을 넣은 이유는 `⌘⌥J`가 macOS Chrome 개발자도구 콘솔 단축키로 알려져 있는데 1차에서
통과로 나왔기 때문이다. 개발자도구가 열렸는지 사용자가 확인하지 못했을 가능성이 있으며 열린다면
방향 포커스 이동 4개를 통째로 옮겨야 한다. Chrome 단축키 목록은 이 세션의 지식이고 실측이나
문서로 확인한 사실이 아니다. `⌘Q`·`⌘⇧Q`는 브라우저를 종료시키므로 목록에서 제외했다.

### 2026-09-17 15:00 · 2차 실측과 기본값 방향 확정

2차 실측(Chrome 151, macOS)으로 `⌘⌥` 계열 4개(`⌘⌥J`·`⌘⌥I`·`⌘⌥U`·`⌘⌥C`)가 모두 통과했다.
Chrome 개발자도구 단축키 자리인데 페이지에 도달하고 브라우저 동반 반응이 없었으므로 렌더러에서
`preventDefault()`가 먹는다. 1차에서 확정한 방향 포커스 이동 `⌘⌥H/J/K/L`이 유지되며 우려했던
개발자도구 충돌은 닫혔다. 새 shell 탭 후보 `⌘⇧S`·`⌘⇧F`·`⌘⇧V`·`⌘⇧A`와 탭 닫기 후보 `⌘⇧X`도
통과했다. 탭 전환 순차 후보는 전멸했다. `⌘⌥←`·`⌘⌥→`·`⌘⇧[`·`⌘⇧]`·`Ctrl+Tab`이 모두 미도달이고
`⌘1`만 통과했다.

미도달 8개의 원인은 구분하지 못했다. 사용자가 브라우저 반응도 없고 행도 안 변했다고 보고했는데
그러면 브라우저가 조용히 점유한 경우와 실측 페이지의 키 매칭이 그 조합을 못 잡은 경우가 섞여
있다. `⌘⌫`는 Mac `delete` 키의 `code`가 `Backspace`가 아닐 가능성이 있다. 필요한 자리가 모두
채워졌으므로 원인을 구분하지 않고 제외로 처리하며 이 미구분을 그대로 남긴다. 대조군 `⌘T`도
반응 없음으로 묶여 왔으나 1차에서 사용자가 실제 새 탭 열림을 직접 확인했으므로 대조군 판정은
유지한다.

사용자가 결정 2건을 확정했다. **기본값 방향은 OS별로 한 번 누르는 조합이며 leader는 채택하지
않는다.** 필요한 자리 전부에 한 번 누르는 조합이 확보돼 leader 도입 이유가 남지 않았다는 것이
근거다. **새 shell 탭은 `⌘⇧S`다.** 통과한 4개 중 S가 shell을 직접 가리켜 분할 `⌘D`, 강조
`⌘⇧P`와 같은 명명 방식을 따른다.

xterm 비용은 전부 0으로 소스에서 닫힌다. 확정 후보가 모두 `⌘`+문자 또는 `⌘`+숫자 조합이라
`evaluateKeyboardEvent`의 `default` 분기로 떨어져 `o.key`가 채워지지 않는다. 바이트가 나가는
방향키·Enter 계열 후보는 하나도 남지 않았다.

탭 전환은 아직 확정하지 않았다. 사용자가 `⌘1`~`⌘9`에 더해 `⌘⇧1`을 10번째 탭으로 쓰는 안을
제시했다. 두 가지를 보고했다. 첫째, `⌘1`만 실측했고 `⌘2`~`⌘9`와 `⌘⇧1`~`⌘⇧9`는 전부 미실측이므로
같은 계열이라는 이유로 일반화하지 않는다. `⌘9`는 Chrome에서 마지막 탭이라 처리가 다를 수 있다.
둘째, `⌘9`를 마지막 탭으로 두는 Chrome·iTerm·VS Code 공통 관례가 있고 `⌘⇧1`=10번째는 관례가
없으며 탭이 10개 넘는 pane은 탭바가 좁아 위치를 눈으로 세기 어려워 세어야 누를 수 있는 키가
마우스보다 느려진다는 의견을 냈다. 이 의견은 실측이나 사용자 조사 결과가 아니다. 어느 결정이든
근거가 있도록 `⌘2`~`⌘9`와 `⌘⇧1`~`⌘⇧9`를 3차 실측 목록에 넣어 사용자에게 넘겼다.

### 2026-09-17 15:09 · 탭 전환 확정과 macOS OS 예약 층 발견

3차 실측에서 `⌘1`~`⌘9`는 모두 통과했고 `⌘⇧1`~`⌘⇧9`는 macOS 스크린샷 단축키에 막혔다. 사용자가
직접 확인한 결과이며 `⌘⇧3`~`⌘⇧6`이 OS 캡처로 작동해 브라우저에 내려오지 않는다. 이것으로
사용자가 제안한 `⌘⇧1`=10번째 탭 안은 성립하지 않는다. 3·4·5·6에 구멍이 나면 순서대로 10번대
탭을 배정하는 규칙 자체가 깨지기 때문이다.

이 탈락은 앞선 두 종류와 층이 다르다. 브라우저 예약(`⌘T`·`⌘⇧N`·`⌘⇧W`)은 렌더러 앞에서 막히고
사용자 앱 전역(`⌘⇧K` Notion)은 환경마다 다르지만, OS 예약은 모든 macOS 사용자에게 공통이고
시스템 설정을 직접 바꾸지 않는 한 config 재지정으로도 우회할 수 없다. 기본키 선정에서 브라우저
예약과 같은 수준의 제외 대상으로 다룬다.

**탭 전환은 `⌘1`~`⌘8`이 1~8번 탭, `⌘9`가 마지막 탭으로 확정됐다.** Chrome·iTerm·VS Code가
공통으로 쓰는 관례이며 탭 수와 무관하게 앞 8개와 마지막 하나에 키로 닿는다. 방금 열린 agent가
탭 끝에 붙는 이 제품에서는 `⌘9`가 자주 쓰이는 키가 된다. 10번째 이후 중간 탭은 키로 선택할 수
없고 마우스로 접근한다. 순차 전환 키는 후보가 전멸해 두지 않는다.

이로써 단축키 대상 전부가 macOS 기준으로 확정됐다. 새 shell 탭 `⌘⇧S`, 오른쪽 분할 `⌘D`, 아래
분할 `⌘⇧D`, 탭 전환 `⌘1`~`⌘9`, 탭 닫기 `⌘⇧X`, 방향 포커스 이동 `⌘⌥H/J/K/L`, 영역 확대·복귀
`⌘⇧M`, 크기 균등화 `⌘⇧=`, 현재 pane 강조 `⌘⇧P`, 사이드바 토글 `⌘B`. 전부 xterm 비용 0이고
브라우저·OS 예약 실측을 통과했다. Windows/Linux 기준은 사용자 지시로 연기해 미확정이다.

### 2026-09-17 15:13 · 설정 화면 2차 디자인 프롬프트 작성

확정된 keybindings와 전역 config 편집을 담아 설정 화면 2차 디자인 프롬프트를 작성하고
`logs/artifact/AIOX-Web-UI-Design-Prompt.md`에 이어 붙였다(613→777줄). 1차 프롬프트와 2~6차
수정 지시가 누적된 같은 파일이며 새 화면이라 별도 제목으로 두었다.

프롬프트의 필드 목록은 발명하지 않고 `packages/config/src/schema.ts`의 실제 schema와
`docs/specs/aiox-configuration-web.md`의 편집·적용 계약에서 가져왔다. ports.daemon 4500과
ports.web 4501은 1~65535 정수이며 서로 달라야 하고, messages.retentionDays는 1 이상 정수에
기본 30이다. terminal은 shell·args·cwd·fontFamily·fontSize·theme을 가지며 fontSize는 양의
유한수, shell·cwd는 NUL을 포함할 수 없다. host.layout은 auto/left-main/top-main/grid이고
columns·rows는 grid에서만 허용된다. 적용 경계도 spec에서 가져왔다. font/color는 즉시 배포,
포트는 다음 daemon 시작, 잘못된 설정은 마지막 유효 설정 유지, shell·args·cwd는 새 shell
생성에만 적용되고 기존 터미널과 vendor PTY에는 적용되지 않는다.

실측 경험을 UI 요구로 옮겼다. 키 재지정에서 브라우저·OS가 가로채는 조합은 화면에 도달하지
않아 `Press keys…`가 조용히 멈춘다. 이 침묵을 사용자가 고장으로 읽으므로 타임아웃 뒤 예약키
안내를 같은 자리에 표시하도록 요구했다. 기능 간 충돌은 자동으로 빼앗지 않고 기존 소유 기능을
알려 주게 했다. 기본키를 코드가 제공하고 변경분만 저장하는 확정 방향이 `edited` 표시와 행별
`Reset`으로 화면에 드러난다.

프로토타입 교정도 같은 프롬프트에 넣었다. pane `[+]` 드롭다운의 `New shell (⌘T)`를 `⌘⇧S`로
바꾸고 `⌘D`·`⌘⇧D`·`⌘B`는 실측 통과라 유지한다.

`keybindings`는 아직 config schema에 없다. `packages/config/src/schema.ts`의 허용 키는
ports·messages·terminal·keyboard·web·host이며 기존 `keyboard`는 문자열 맵으로 남아 있다. spec이
보존을 요구하므로 건드리지 않았고 설정 화면 UI에도 노출하지 않기로 했다. 확정된 기본키와 저장
방식을 spec에 반영하는 일은 이미 Required Context에 있는 configuration-web spec 갱신 두 건과
같은 묶음, 즉 Stage6 구현 착수 시점으로 둔다. 이번 작업에서 spec을 수정하지 않았다.

검색·커맨드 팔레트가 쓰는 `⌘K`는 실측하지 않았음을 확인했다. 단축키 대상 8개에 없어 후보
목록에 넣지 않았으나 프로토타입과 1차 프롬프트가 이미 `⌘K`를 표시하고 있고 macOS Chrome의
주소창 검색 자리다. 사용자에게 확인을 요청했고 결과에 따라 교정 대상이 될 수 있다.

### 2026-09-17 15:35 · 검색 키 판정과 keybindings 11번째 항목

사용자가 `⌘K`를 사용 가능으로 판정했다. shadcn/ui의 Command Dialog가 쓰는 관례이며 Linear,
Raycast, Vercel, GitHub이 웹에서 같은 키로 팔레트를 열고 실제 동작한다는 것이 근거다. 즉 `⌘K`는
브라우저 주소창 검색 자리이면서 렌더러에서 `preventDefault()`가 먹는 층이고, 실측에서 `⌘1`과
`⌘⌥J`가 보인 것과 같은 패턴이다. `⌘T`·`⌘⇧N`·`⌘⇧W`처럼 브라우저 프로세스 accelerator가 먹는
층과 구분된다. 이 판정은 관례와 타 제품 동작을 근거로 한 것이며 이 세션의 직접 실측이 아니다.

`⌘K`를 재지정 가능 항목으로 keybindings 목록에 넣어 11개가 됐다. 원래 단축키 대상 8개에 검색·
팔레트가 없었고 프로토타입이 자체로 붙인 키라 프롬프트 초안에서 빠져 있었다. 나머지 항목은 모두
`Change`로 바꿀 수 있는데 검색만 고정이면 일관성이 깨지고 사용자 환경의 다른 앱과 겹칠 때 피할
방법이 없다는 것이 추가 근거다. 프롬프트의 교정 문단도 `⌘D`·`⌘⇧D`·`⌘B`에 `⌘K`를 더해 넷을
유지 대상으로 표기했다. 이로써 이 프롬프트의 미결은 남지 않는다.

### 2026-09-17 16:37 · 설정 화면 프로토타입 검토와 설정 반영 모델 확정

사용자가 설정 화면 프로토타입을 `logs/artifact/aiox-version2.html`에 넣었다. 이전 3차 프로토타입
`logs/artifact/AIOX Workspace.html`은 사라졌으므로 앞선 기록의 그 경로는 현재 존재하지 않는다.
검토는 로컬 HTTP로 서빙해 브라우저에서 직접 조작했다. Chrome 확장이 `file:` URL을 열지 못해
`python3 -m http.server`로 우회했고 검토 후 종료했다.

요구대로 동작하는 것을 확인했다. 섹션 5개와 헤더의 `~/.aiox/config.json` 경로 표시, Terminal의
필드 6개와 `$SHELL or /bin/bash` placeholder, 적용 경계 문구 두 개(새 shell에만 / 즉시 적용),
Theme 구분 문구, keybindings 10개의 확정 키와 `Reset all to defaults`, 키 캡처의 충돌 안내
(`Already used by "Split right"` + `Go to that row`, 자동 탈취 없음), 정상 키 입력 시 `edited`
배지와 행별 `Reset`, 하단 변경 수와 `Revert`/`Save`, 포트 중복 시 두 필드 인라인 오류와
`Fix 2 fields to save` 및 `Save` 비활성, Font size 0에서 같은 차단, Host layout preset 4개의
그림과 grid에서만 나타나는 Columns·Rows, Appearance의 Theme 3개·Language 2개, `This file changed
on disk. Reload`와 `daemon not running — saved values load on next start` 배너, `Discard changes?`
dialog와 Discard 동작이다. Revert는 정상이며 앞선 무반응은 내 클릭 좌표 오류였다. 「넣지 말 것」
위반은 없었다. 사이드바 너비 입력·daemon 재시작 버튼·검색 필터·vendor 설정·Windows 키 표시가
모두 없다.

교정 대상 세 건을 찾았다. 첫째는 내 프롬프트 요구 자체가 틀렸다. 키 재지정에서 `Change`를 누르고
아무 키도 누르지 않아도 2초 뒤 `That combination is reserved by your browser or OS`가 뜬다.
페이지는 "아직 안 누름"과 "눌렀지만 도달하지 않음"을 구분할 수 없으므로 예약이라고 단정하면 거짓
정보가 된다. 브라우저 예약키 실측 페이지를 만들 때 같은 한계를 겪어 사용자 표시 버튼을 따로 뒀는데
프롬프트에서는 그 교훈을 반영하지 못했다. 중립 문구로 교정한다. 둘째, `Discard changes?` dialog의
`document.activeElement`가 `BODY`여서 4차에서 확정한 dialog 기본 포커스 규칙이 이 dialog에
적용되지 않았다. 기존 두 dialog와 불일치하고 Enter·Esc 조작도 되지 않는다. 셋째, `Open command
palette ⌘K` 행이 없다. 사용자가 `⌘K` 결정 전 프롬프트로 요청했으므로 예상된 누락이다.

Save를 실제로 눌러보지 않았다. 따라서 포트 저장 후 `Saved — applies on next daemon start` 표시가
실제로 나타나는지는 미확인이다. Message retention fixture가 `7`인데 기본값은 30이며 keybindings
외 필드에는 기본값 표시 요구를 하지 않았으므로 요구 위반은 아니다.

설정 구현 상태를 코드에서 확인했다. `loadConfig`·`saveConfig`는 원자적 저장까지 구현됐으나
(`packages/config/src/files.ts:34`) config를 읽고 쓰는 HTTP API가 없고(`apps/daemon/src/http.ts`는
`ConfigError`만 import) 파일 watcher도 없다. `createConfigSession`은 시작 시 포트를 고정하고
`pendingPorts`·`restartRequired`를 계산하지만 호출자가 없다(`packages/config/src/session.ts`).
daemon은 새 shell을 만들 때마다 `loadConfig`로 terminal 설정을 다시 읽고
(`apps/daemon/src/bootstrap.ts:65`) `retentionDays`는 부팅 시 고정한다(`bootstrap.ts:66`). Web은
`apps/web/src/attach.ts:57`에서 `fontSize: 13`을 하드코딩하고 config를 읽지 않는다. `keybindings`는
schema에 없다.

이 확인을 근거로 설정 항목이 읽는 주체로 갈린다는 점을 사용자에게 보였다. daemon이 읽는 값
(ports·host.layout·retentionDays는 시작 시, terminal.shell/args/cwd는 쓸 때마다)은 서버가 파일을
다시 읽으면 끝이고 화면에 실시간으로 비출 이유가 없다. 브라우저가 읽는 값(terminal 폰트·theme,
keybindings, web theme·language·sidebar.width)만 파일과 화면의 동기화 문제를 갖는다. 따라서
Working directory는 keybindings와 같은 문제가 아니며 설정 화면이 열릴 때 한 번 읽으면 충분하다.

**사용자가 두 결정을 확정했다.** 첫째, 파일과 웹의 동기화는 모델 B다. watcher와 SSE를 만들지 않고
설정 화면을 열 때 조회하고 저장할 때 기록한다. 외부 편집은 다음 조회에서 드러나며 프로토타입이
이미 가진 `This file changed on disk` 배너를 watch가 아니라 서버 값과 편집 중 값의 비교로 채운다.
저장한 브라우저는 자기가 만든 값이므로 즉시 반영하고 다른 탭은 다음 로드에 반영한다. 즉시 전파가
필요해지면 그때 SSE를 얹는다. 근거는 웹 설정 화면이 있으면 파일을 손으로 고칠 빈도가 낮고, 파일만
고치고 브라우저는 그대로 둔 채 열린 탭이 즉시 바뀌어야 하는 시나리오가 확인되지 않으며, watcher는
자기가 쓴 변경을 되잡는 에코 처리를 함께 요구한다는 것이다. 둘째, localStorage를 쓰지 않고 Web
theme과 Language를 전역 파일에 저장한다. 포트 변경으로 origin이 바뀌면 localStorage가 날아가는
위험이 사라지고 저장소가 파일과 DB 둘로 줄어든다. 설정 화면에서 바꾼 것은 전부 파일, 실행 중 화면
상태(pane 배치·탭 순서·선택·알림·읽음)는 전부 DB가 된다.

모델 B의 귀결로 저장 순간의 충돌 처리가 필요해진다. watcher가 없으므로 저장 직전에 파일이 그사이
바뀌었는지 확인해야 하고, 바뀌었으면 덮어쓰지 않고 사용자에게 선택을 준다. 이 요구를 7차 교정
프롬프트에 넣는다. 두 결정은 `docs/specs/aiox-configuration-web.md`의 저장 경계 표와 파일·Web
편집 절을 갱신해야 하므로 기존 spec 반영 묶음에 더한다. 이번 작업에서 spec을 수정하지 않았다.

### 2026-09-17 17:00 · 7차 반영 프로토타입 재검토와 8차 수정 지시

사용자가 7차 결과를 `logs/artifact/aiox-version3.html`로 받아왔고 이를 재검토했다. localhost
정적 서버로 띄워 실제 조작으로 확인했다.

**7차 7개 항목 모두 반영 확인.** 각각 실제 동작으로 닫았다.
- 예약키 안내: `Change`를 누른 즉시 `Keys your browser or OS reserves (⌘T, ⌘⇧N, ⌘⇧3…) never
  reach this page. Esc cancels.`가 상시 표시되고 타임아웃 단정은 사라졌다. `⌘⇧X`를 누르면
  `Already used by "Close tab"` + `Go to that row`가 뜨는 충돌 안내는 그대로 동작한다
- `Discard changes?` dialog 기본 포커스가 `Keep editing` 버튼이다(`document.activeElement`로 확인)
- Keybindings 11행, `Open command palette ⌘K`가 `Toggle sidebar` 아래에 있다
- Appearance Theme·Language가 변경 카운트에 들어가고 `Preview — not saved yet`이 붙는다.
  Dark를 눌러 즉시 적용되고 `Revert`로 저장값 Light로 되돌아가는 것까지 확인했다
- 저장 시점 충돌 dialog: 디버그 토글을 켜고 `Save`를 누르면
  `The file changed while you were editing.` + `[Keep my edits and overwrite]`
  `[Discard mine and reload]`가 뜨고 기본 포커스가 reload 쪽이다. 상단 열기 시점 배너는 유지된다
- Font family 미리보기 한 줄과 등폭 경고가 있다
- `default 30`·`default 4500`·`default 4501`이 붙어 있다

**미확인 1건 해소.** Daemon port를 4600으로 바꿔 `Save`를 눌렀고 포트 두 칸 아래에
`Saved — applies on next daemon start`가 나타나며 하단이 `No changes`로 돌아가는 것을 확인했다.
잘못된 값일 때는 `2 changes` 옆에 `Fix 2 fields to save`가 붙고 저장이 막힌다.

**8차 수정 지시 3건을 작성했다**(`AIOX-Web-UI-Design-Prompt.md`, 887→962줄).
1. 등폭 판정 근거 수정과 내 요구 철회. 미리보기는 `"입력값", ui-monospace, monospace`로
   렌더하는데 판정은 대체 폰트 없는 `"입력값"` 하나로 `i`/`W` 폭을 재고 있어, CSS에서 이름이
   해석되지 않는 `SF Mono`(이 프로토타입의 기본값)에서 미리보기는 등폭인데 경고는 비례라고
   말하는 모순이 화면에 동시에 떠 있었다. 판정을 미리보기와 같은 스택으로 재도록 고친다.
   더불어 6차에서 내가 요구한 "설치되지 않은 폰트" 안내를 철회했다. 실측으로
   `document.fonts.check`가 존재하지 않는 이름(`"Totally Fake Font 123"`)에도 `true`를
   돌려주는 것을 확인했고, 브라우저에서 설치 여부 판정은 불가능하다. 7차 1번 타임아웃 안내와
   같은 종류의 근거 없는 단정이었다
2. Font family·Font size를 비우면 기본값으로 복귀. 현재는 비우면 검증 오류로 저장이 막혀
   한 번 값을 적으면 기본값으로 되돌릴 방법이 화면에 없다. schema는 두 필드 모두 optional이라
   부재는 유효하고 빈 문자열만 무효이므로, 빈 칸 = 파일에서 키 제거 = 내장 기본값이
   "코드가 기본값, 변경분만 저장" 정책과 Shell·Arguments·Working directory의 기존 문구와
   일치한다. 기본값은 family `ui-monospace, Menlo, monospace`, size `13`(`apps/web/src/attach.ts:57`의
   현재 하드코딩 값)으로 명시했다
3. Language 미리보기가 실제로 동작하게. `Preview — not saved yet`은 뜨는데 화면 글자는 영어
   그대로다(프로토타입에 i18n이 없어 `한국어`는 버튼 라벨로만 존재). 전체 번역이 아니라
   설정 화면 자신의 글자만 한국어로 바꾸도록 범위를 좁혔고, 이 범위면 한국어 글자 길이가
   레이아웃에 들어맞는지도 같이 보인다

**도구 쪽 관찰(프로토타입 결함 아님).** 전체 screenshot은 `data-theme=light`를 반영하지 않고
어둡게 캡처되는 경우가 있었다. 같은 순간 `getComputedStyle`은 `--background:#ffffff`, zoom
캡처는 밝게 렌더했다. 테마 미리보기 동작은 DOM과 zoom으로 확인했고, 전체 screenshot 경로의
불일치 원인은 확인하지 못했다. 또한 `scale` 인자가 적용되지 않고 좌표 프레임이 창 높이 변화에
따라 갱신되므로, 클릭은 `find`의 ref나 직전 screenshot 프레임 좌표로 하는 것이 안전하다.

### 2026-09-17 17:42 · 8차 반영 확인과 다국어 철회·Settings 진입 이동

사용자가 8차 결과를 `logs/artifact/aiox-version4.html`로 받아왔고 localhost 정적 서버로 띄워
실제 조작으로 재검토했다.

**8차 3건 모두 반영 확인.**
- 등폭 판정이 미리보기와 같은 스택을 본다. `Helvetica`에서만 경고가 뜨고 `SF Mono`·`Menlo`에서는
  경고가 없으며 미리보기 렌더도 각각 일치해 7차까지 있던 모순이 사라졌다. 소스에서도
  `isMono(family)`가 `fontStack(family)`(`"입력값", ui-monospace, Menlo, monospace`)로 `i`/`W` 폭을
  재고 미리보기가 같은 `fontStack`을 쓰는 것을 확인했다. 철회를 요구한 `This font is not
  installed` 문구와 `fontKind`는 파일에서 0회다
- Font family·Font size를 비우면 placeholder로 기본값(`ui-monospace, Menlo, monospace`, `13`)이
  보이고 검증 오류 없이 `Save`가 되며 `No changes`로 돌아간다. 다만 "빈 칸 = 파일에서 키 제거"는
  파일이 없는 프로토타입에서 관측할 수 없고 화면 규칙만 닫혔다
- 한국어 전환이 설정 화면 5개 섹션 전부에서 동작하고 레이아웃이 깨지지 않는다. 예약키 상시 힌트,
  충돌 안내와 `그 행으로 이동`, `미리보기 — 아직 저장되지 않음`, `변경을 버릴까요?` dialog의 기본
  포커스(`편집 계속`)까지 한국어 상태에서 회귀가 없다

검토 중 헤더 화면 제목만 `Settings`로 하드코딩돼(`headName = isSettings ? 'Settings' : …`)
한국어에서 영어로 남는 것을 찾았으나 아래 다국어 철회로 교정 대상이 아니게 됐다.

**사용자가 결정 2건을 확정했다.** 첫째, 운영 Web에서 다국어를 제공하지 않고 UI 문구를 영어로
고정한다. 8차 3번에서 요구해 방금 반영을 확인한 한국어 미리보기를 철회하는 것이며 결함 때문이
아니라 제품 방향 변경이다. 확인한 사실로 삭제할 구현은 없다. `packages/config/src/schema.ts`에
`language` 키가 없고 `apps/web/src/`에 i18n 코드가 없으며, 실재하는 것은 프로토타입의 문자열
테이블과 Appearance의 Language 행, 그리고 문서의 다국어 제공 서술뿐이다. Appearance에는 Theme만
남아 필드 한 개짜리 섹션이 되며 섹션 자체는 유지한다.

둘째, Settings 진입을 사이드바 최하단에서 헤더 오른쪽 알림·테마 사이의 톱니로 옮기고 사이드바
행은 제거한다. 커맨드 팔레트 항목은 유지한다. 근거는 두 층이다. 좌하단 구석이라 이동 거리가
멀고, 사이드바 전체가 `sidebarVisible` 조건부라 `⌘B`로 접으면 유일한 클릭 진입이 사라진다.
헤더는 알림·테마와 같은 앱 전역 도구 묶음이라 의미가 맞고 접힘 상태를 덮으며 진입을
중복시키지 않는다. 검토한 대안은 헤더와 사이드바 양쪽 유지(진입 중복), 사이드바 로고 행
우측(접힘 소실 미해결), 위치 유지 후 단축키 부여(마우스 경로 변화 없음)다. Settings 전용
단축키는 만들지 않는다. 팔레트 경로가 이미 있고 후보 `⌘,`는 macOS Chrome 설정 자리라 실측이
필요하며 자주 여는 화면이 아니다. keybindings는 11개를 유지한다.

**9차 수정 지시 2건을 작성했다**(`AIOX-Web-UI-Design-Prompt.md`, 962→1015줄).

다국어 철회로 owner 반영 대상이 늘었다. `docs/specs/aiox-configuration-web.md`의 운영 Web
서술(다국어 제공·use-intl·한국어/영어 시작)과 저장 표의 언어 항목,
`docs/architecture/aiox-storage-terminal.md`의 세 곳(언어 localStorage 저장 제안, 다국어 후속
구현 대상, 다국어 제공·use-intl)이 철회 대상이다. 제품 UI 문구와 vendor 출력 원문의 구분은
UI가 영어로 고정돼도 유효하므로 유지한다. `docs/aiox-tui-product.md`의 공개 다국어 사이트와
Stage9 로그는 운영 Web이 아닌 별도 앱이므로 바꾸지 않는다. Baseline 로그의 2026-09-07 결정은
과거 경위라 수정하지 않고 이번 결정이 대체한다. 이번 작업에서 문서를 수정하지 않았다.

### 2026-09-17 17:50 · 반응형 범위 확정과 10차 수정 지시

사용자가 운영 Web 반응형의 범위를 확정했다. 대상은 사이드바·헤더·설정 화면 셋뿐이고 터미널
영역은 손대지 않는다. pane 분할, pane별 탭바, xterm 본문은 창이 좁아져도 레이아웃을 바꾸지
않으며 pane이 4개면 각 폭이 그대로 1/4로 줄고 xterm이 그 크기로 다시 맞춰질 뿐이다. 좁다고
pane을 세로로 쌓거나 분할을 자동 해제하거나 탭바를 드롭다운으로 바꾸지 않는다.

사용자가 처음 쓴 "모바일 first"는 반응형을 가리키는 표현이며 폰 전용 화면을 만들자는 뜻이
아님을 밝혔다. 실제 목적은 데스크톱 브라우저 창을 줄였을 때의 대응이다. 이 구분으로
keybindings 처리가 닫혔다. 물리 키보드가 없는 환경을 전제하지 않으므로 `Change` 키 캡처를
그대로 둔다. 기준선은 데스크톱이고 좁아질 때의 동작만 더한다.

확정한 규칙은 다음과 같다. breakpoint는 `760px` 하나이고 이상은 현재 형태, `360px`~`760px`
미만이 좁은 폭 동작, `360px` 미만은 대상이 아니다. 사이드바는 좁은 폭에서 기본 닫힘인 오버레이
드로어이며 햄버거나 `⌘B`로 열고 바깥·`Esc`·workspace 선택으로 닫힌다. 리사이즈 핸들을 숨기고
폭을 고정한다(280px 초안). 밀어내기 대신 오버레이를 고른 이유는 메인 폭이 줄지 않아 터미널이
좁아지지 않기 때문이다. 헤더는 햄버거를 추가하고 검색 입력을 아이콘으로 접으며 workspace
맥락을 생략하고 이름만 말줄임으로 남긴다. 알림·설정·테마 세 아이콘은 헤더에서 빼 드로어
하단으로 옮긴다. 설정 화면은 섹션 nav를 상단 가로 탭으로(넘치면 가로 스크롤), 라벨·입력 2열을
1열 스택으로 바꾸고 Host layout preset을 2×2로 접으며 하단 Save 바와 dialog 기본 포커스
규칙은 유지한다.

세 아이콘 이동의 관측되는 결과를 사용자에게 보고하고 보완을 프롬프트에 넣었다. 아이콘이 드로어
안으로 들어가면 드로어를 열기 전에는 알림 배지가 보이지 않아 알림이 왔다는 사실을 인지할
경로가 사라진다. 미확인이 있으면 햄버거에 점을 붙이고 정확한 개수는 드로어에서 배지로
확인하게 했다. 사용자 지시를 바꾼 것이 아니라 인지 경로만 보완한 것이다.

터미널을 그대로 두는 결정의 예상 결과를 한 번 기록한다. 이는 계산에 따른 추론이며 실측이
아니다. `360px` 폭에서 4분할이면 pane당 약 180px이고 13px 등폭의 문자 폭을 7.8px로 잡으면
pane당 약 23 columns다. vendor TUI가 실제로 요구하는 최소 columns는 확인하지 않았으나 80
columns를 가정하는 TUI라면 그 폭에서 읽기 어려워진다. 사용자 결정대로 UI 처리는 하지 않으며
이 결과를 알려진 귀결로 둔다.

**10차 수정 지시를 작성했다**(`AIOX-Web-UI-Design-Prompt.md`, 1015→1063줄).

### 2026-09-17 21:52 · 9·10차 반영본 검토와 11차 수정 지시

`logs/artifact/aiox-version5.html`(9·10차 반영본, untracked)을 로컬 서버로 띄워 폭을 바꿔 가며 확인했다. 브라우저 창 리사이즈가 뷰포트에 반영되지 않아 폭 조절 가능한 iframe wrapper 안에서 확인했다. 프로토타입이 `document.documentElement`에 ResizeObserver를 걸어 `clientWidth < 760`으로 narrow를 판정하므로 iframe 폭이 그대로 판정 입력이 된다. wrapper는 확인 후 삭제했다.

9차 2건은 닫혔다. Appearance에는 Theme만 남았고 `Language`와 en/ko 문자열 표(`ko:` 키)는 소스에서 0건이다. Settings 진입은 헤더 오른쪽 🔔과 ☀ 사이 톱니이고 Settings 화면에서는 accent 배경으로 활성 표시된다. 사이드바 하단 Settings 행은 없다. keybindings는 11행 그대로이며 전용 Settings 단축키는 추가되지 않았다.

10차도 대부분 닫혔다. 760px에서는 기존 형태이고 759px 이하에서 오버레이 드로어(폭 280px, 기본 닫힘, backdrop `z 70`)로 바뀌며 메인 폭은 줄지 않는다. 드로어는 햄버거·`⌘B`·`Esc`·backdrop 클릭·workspace 선택으로 모두 여닫힌다. 헤더는 햄버거·이름·검색 아이콘만 남고 검색 아이콘은 커맨드 팔레트를 연다. 미확인이 있으면 햄버거에 점이 붙으며 `hasUnread: unread > 0`이라 읽으면 사라진다. 설정은 상단 가로 스크롤 탭·1열 스택·Host preset 2×2·하단 Save 바 고정이고 `Change` 버튼은 살아 있다. 760/759/700/600/480/400/360 어디서도 `scrollWidth == clientWidth`라 가로 스크롤바는 없다.

결함 1건을 찾았다. 760px 이상, 즉 기존 형태를 유지하는 구간에서 헤더의 workspace 이름이 먼저 사라진다. 사이드바 240px·이름 `dev` 기준으로 895px부터 이름이 줄기 시작해 865px 이하에서 폭 0이 되고 맥락 span은 내내 245px를 유지한다. 맥락 span이 `white-space:nowrap` + `min-width:auto`라 줄지 않고 이름만 shrink를 떠안는 구조이며 이름 쪽은 `text-overflow:clip`이라 말줄임표도 없다. 결과적으로 헤더에 `· network · 3 agents · 4 terminals`만 남고 `dev`는 보이지 않는다. 760px 미만에 대해 10차에서 이미 "맥락 생략 후 이름 말줄임"을 지시했으므로 같은 우선순위를 폭과 무관하게 적용하라고 11차 1번으로 냈다. 이름이 짧아 늦게 드러난 것이고 긴 이름이면 더 넓은 폭에서 사라진다.

드로어 하단 세 아이콘은 사용자 결정으로 상단으로 뒤집었다. 좁은 폭에서 드로어 하단 🔔을 누르면 알림 패널(`left 10px, width 340px, z 60`)이 backdrop(`z 70`)과 드로어(`z 80`) 아래에 깔려 280px가 덮이고 남는 70px도 backdrop 아래라 항목을 누를 수 없다. 세 아이콘을 드로어로 옮기면서 패널만 헤더 기준 위치와 z 순서를 유지한 결과다. 이 가림을 보고하며 상단 배치를 함께 물었고 사용자가 상단으로 확정했다. 근거 셋을 제시했다. 넓은 폭에서 이 세 개는 헤더 오른쪽 위에 있으므로 하단에 두면 같은 컨트롤이 폭에 따라 화면 위아래를 오간다. 드로어 목록은 사용자가 계속 만들어 길이가 정해져 있지 않아 하단 고정 줄은 스크롤 영역 밖 고정이나 부유가 필요한 반면 상단은 목록 길이와 무관하다. 미확인 점이 붙는 햄버거가 바로 위에 있어 점에서 패널까지 경로가 이어진다. 대가로 실제 폰 한 손 조작에서는 하단이 엄지에 가깝다는 점을 같이 밝혔고, 반응형 목적이 데스크톱 창 축소라 낮게 잡았다. 11차 2번으로 상단 배치와 함께 아이콘 줄 아래 인라인 펼침(z 순서를 건드리지 않음)을 권고로 냈고, 부유 패널을 유지할 경우의 z·닫힘 순서도 대안으로 적었다. 10차 원문의 하단 지시에는 11차에서 변경했다는 표시를 남겼다.

재현되지 않은 관찰 1건을 남긴다. 좁은 폭에서 여러 조작을 한 뒤 1200px로 되돌렸을 때 사이드바가 숨겨진 상태였다. 이후 새로 고침한 뒤 wide → narrow → wide, 그리고 narrow에서 `⌘B`로 드로어를 여닫은 뒤 wide 복귀를 각각 시도했으나 두 경우 모두 사이드바가 정상 복원됐다. 원인을 특정하지 못했고 결함으로 단정하지 않는다. 다음 반영본에서 같은 증상이 보이면 그때 재현 경로를 잡는다.

### 2026-09-17 22:36 · 11차 반영본 검토, 12차 수정 지시와 사이드바 컴포넌트 채택 결정

사용자가 11차 지시를 낸 뒤 이어서 두 가지를 더 요청했다고 알렸다. 좁은 폭에서 알림은 드로어 위에 뜨는 dropdown이어야 한다는 것과, 알림·설정·테마 세 아이콘을 로고 반대편에 나열하라는 것이다. 후자는 11차 2번에서 "브랜드 줄 바로 아래 한 줄"이라고 한 것을 같은 줄 오른쪽으로 바꾸고, 전자는 11차가 권고했던 인라인 펼침 대신 대안으로 적어 둔 부유 패널 쪽을 고른 것이다. 반영본 logs/artifact/aiox-version6.html을 localhost 정적 서버에 올려 실제 조작과 소스로 확인했다.

11차 1번은 닫혔다. 폭 1200·1000·900·865·820·780·768·760·700·600·500·420·360에서 헤더 이름 dev는 내내 26px로 온전했고 맥락 span이 245px에서 0px까지 줄었다. 360px에서는 맥락이 `4 termi…`로 말줄임 처리됐고 전 구간에서 가로 스크롤이 없었다. 소스에서 이름은 flex-shrink 1·min-width 3ch·text-overflow ellipsis, 맥락은 flex-shrink 9999·min-width 0이라 축소 우선순위가 뒤집혔다. 11차 2번과 추가 2건도 닫혔다. 드로어 첫 줄이 높이 40px flex none이고 왼쪽에 AIOX, flex 1 spacer 뒤 오른쪽에 세 버튼이며 그 아래 목록은 flex 1·overflow-y auto라 목록이 길어져도 아이콘 줄이 남는다. 알림은 드로어 내부 absolute top 44px·left 8·right 8·z 90이라 드로어(z 80)와 backdrop(z 70) 위에 뜬다. 360px에서 세 항목이 전부 보였고 항목을 눌러 미확인 수가 2에서 1로 줄고 대상이 Codex로 바뀌는 것을 확인했다. Esc는 패널을 먼저 닫고 드로어를 남긴 뒤 두 번째에 드로어를 닫았다. 드로어 ⚙은 설정으로 이동하며 드로어를 닫고 ☀은 테마만 바꾸고 드로어를 유지했다. 경계는 768px에서 wide, 767px 이하에서 narrow가 아니라 760/759에서 갈렸고 wide 복귀 시 사이드바가 relative·240px·z auto로 정상 복원됐다. version5에서 한 번 관측하고 재현하지 못했던 사이드바 사라짐은 이번에도 재현되지 않았다.

결함 1건을 확인해 12차 1번으로 냈다. 좁은 폭에서 알림 항목을 눌러 이동하면 알림 패널은 닫히지만 드로어가 그대로 남아 방금 이동한 화면을 드로어와 backdrop이 가린다. 원인은 jumpToNow가 notifOpen만 false로 두고 drawerOpen을 건드리지 않는 것이다. selectWs와 설정 진입은 drawerOpen false를 함께 넣고 있어 알림과 팔레트만 빠졌다. 팔레트 결과 선택도 같은 jumpTo를 거치므로 같은 증상이다. 지시는 개별 핸들러 나열이 아니라 좁은 폭에서 화면을 이동시키는 동작은 드로어도 닫고 이동이 아닌 동작(테마 토글)은 열어 둔다는 규칙으로 냈다.

지시와 다르게 만든 것 1건은 그대로 두기로 했다. 11차는 backdrop 클릭과 Esc가 패널 다음 드로어 순으로 닫으라고 했는데 반영본은 backdrop 클릭이 둘을 한 번에 닫는다. backdrop은 드로어 바깥이고 거기를 누르는 것은 전부 닫겠다는 뜻으로 읽는 편이 낫다고 판단해 12차에 유지하라고 명시했다. 이는 의견이며 사용자 판정을 받은 것은 아니다. 관찰 1건은 결함으로 보지 않았다. hasMeta 바인딩이 narrow에서 맥락을 지우도록 계산되지만 마크업 어디에서도 쓰이지 않는 죽은 바인딩이고, 실제로는 좁은 폭에서도 맥락이 렌더링돼 자리가 부족한 만큼만 줄어든다. 이는 11차 1번이 요구한 폭 기반 단일 규칙과 오히려 일치한다. 구현 때 정리 대상으로만 남긴다.

사용자가 실제 구현에서 사이드바를 직접 만들지 않고 shadcn-ui의 Sidebar를 쓰겠다고 결정했다(참고로 제시한 블록은 https://ui.shadcn.com/blocks/sidebar#sidebar-01). 레지스트리 소스에서 확인한 사실은 다음과 같다. SidebarProvider·Sidebar·SidebarHeader/Content/Footer·SidebarGroup·SidebarMenu 계열·SidebarTrigger·SidebarRail·SidebarInset·useSidebar를 제공하고, 좁은 폭에서는 Sheet로 오버레이 드로어가 되며, 단축키는 SIDEBAR_KEYBOARD_SHORTCUT "b"로 Cmd/Ctrl+B이고, 경계는 use-mobile 훅의 MOBILE_BREAKPOINT 768이며 window.innerWidth와 matchMedia로 판정한다. 폭은 SIDEBAR_WIDTH 16rem·SIDEBAR_WIDTH_MOBILE 18rem·SIDEBAR_WIDTH_ICON 3rem 상수이고 collapsible은 offcanvas·icon·none이다. 우리 결정과 어긋나는 지점은 셋이다. 첫째, setOpen이 controlled 모드에서도 document.cookie에 sidebar_state를 7일 max-age로 무조건 쓴다. 저장소를 파일과 DB 둘로 한정한 결정과 충돌하므로 복사해 온 파일에서 그 한 줄을 지우고 열림 상태는 전역 config로 보낸다. shadcn은 의존성이 아니라 소스 복사 방식이라 이 수정이 유지보수 부담이 되지 않는다. 둘째, SidebarRail은 toggleSidebar를 부르는 버튼이고 cursor-w-resize는 커서 힌트일 뿐이라 드래그 리사이즈가 없다. 240 기본·180~400 드래그 리사이즈는 이미 실측으로 확정한 값이므로 그 부분만 직접 붙이거나 값을 재검토해야 한다. 셋째, SidebarProvider가 자체 keydown 리스너로 Cmd+B를 잡고 preventDefault를 부르므로 우리 전역 handleKey의 Cmd+B 분기와 이중 처리된다. 둘 중 하나를 없애야 한다. 경계 768은 우리가 760을 임의로 고른 값이라 맞추는 편이 낫다고 보고 12차 2번으로 프로토타입 쪽을 768로 바꿨다. 이 채택은 사용자 결정이며 구현·검증 결과가 아니다.

브라우저 도구 주의 한 건을 정정한다. 폭 지정 iframe wrapper 방식은 유효하지만 iframe의 width 속성만 바꾸면 iframe 안쪽 window의 resize 이벤트도 documentElement의 ResizeObserver도 발화하지 않는다. 계측으로 확인했다. clientWidth는 1000에서 400으로 바뀌었는데 두 카운터 모두 0이었고 narrow 상태도 그대로였다. 폭을 바꾼 뒤 iframe window에 resize 이벤트를 직접 dispatch하면 정상 전환된다. 이 절차 없이 측정하면 반응형이 동작하지 않는 것으로 잘못 읽는다. 또 이번 세션에서는 screenshot 프레임이 뷰포트 CSS px과 1:1이었으므로 배율은 매번 innerWidth와 screenshot 폭을 대조해 확인한다.

### 2026-09-17 23:40 · 12차 반영본 소스 검토와 13차 수정 지시

사용자 지시로 `logs/artifact/aiox-version7.html`(12차 반영본, untracked)을 브라우저로 띄우지
않고 소스만 읽어 판정했다. 파일이 gzip+base64 번들이라 매니페스트와 template을 풀어 앱 HTML을
복원해 읽었다. 따라서 이번 판정은 코드 논리 기준이며 렌더링 결과, 가로 스크롤바 유무, 경계에서의
실제 전환 화면, 가림 해소 여부는 확인하지 않았다.

12차 2건은 닫혔다. `jumpToNow`가 `drawerOpen:false`를 함께 넣게 되어 알림 항목과 팔레트
터미널 행이 모두 이 경로를 지난다. `selectWs`와 설정 진입 두 곳은 이전대로다. 테마 토글은
`drawerOpen`을 건드리지 않아 유지 요구와 맞고, `Esc`는 패널 다음 드로어 순, backdrop은 둘을
함께 닫는다. 경계는 `w < 768`이라 768이 wide, 767 이하가 narrow이며 narrow 전환 시
`drawerOpen`을 강제로 닫는다. 회귀 항목도 소스에서 유지됐다. 헤더 이름은 `flex-shrink:1`·
`min-width:3ch`·ellipsis이고 맥락은 `flex-shrink:9999`·`min-width:0`이다. 드로어 상단은 40px
`flex:none`에 AIOX 왼쪽·세 아이콘 오른쪽, z는 backdrop 70 · 드로어 80 · 알림 dropdown 90 ·
팔레트 100이다. 드로어 폭 280px, 햄버거 미확인 점, 다국어 0건, keybindings 11행이 그대로이고,
`narrow` 분기가 pane·탭바 마크업에 전혀 없어 터미널 영역은 폭에 반응하지 않는다. `hasMeta`는
여전히 계산만 되고 쓰이지 않는다.

12차 범위 밖에서 4건을 새로 확인했고 사용자 결정으로 넷 모두 프로토타입에서 닫기로 해
13차 수정 지시를 냈다. (1) `localStorage`가 아직 앱 테마와 사이드바 너비를 쓴다. 저장소를 파일과
DB 둘로 한정한 확정, 그리고 7차 4번의 "브라우저 저장소가 아니라"는 지시와 충돌한다. (2) 헤더 `☀`의
`setTheme`은 `appearance.theme`를 갱신하지 않고 따로 놀아서 `☀`으로 바꾼 뒤 설정 화면을 열면
Theme 세그먼트가 이전 값을 가리킨다. (3) 알림의 `read` 플래그가 죽어 있다. 미확인 수는
`!n.read`로 세는데 `read`를 true로 만드는 곳이 없고 클릭·dismiss·Mark all이 전부 배열에서
제거한다. 읽음 처리와 이력 삭제를 구분한 확정과 어긋난다. 22:36 entry에서 미확인 수가 줄어드는
것만 보고 읽음 처리로 판정했던 것을 이 근거로 정정한다. `read` 표시 규칙(회색 점·가는 글씨·
opacity 0.55)과 seed의 읽은 항목은 이미 있어 핸들러만 고치면 된다. (4) `newShell`과 `splitPane`이
`drawerOpen`을 건드리지 않아 좁은 폭에서 드로어를 연 채 새 shell·분할을 하면 결과가 가린다.
12차 지시가 "화면을 이동시키는 동작" 넷만 열거했고 구현은 그 넷을 정확히 처리했으므로 지시
위반은 아니며, 생성 동작까지 확장하는 것이 13차 4번이다.

(1)과 (2)는 한 규칙으로 묶어 지시했다. 두 값을 `cfgSaved`(파일 모델)로 옮기되 `web.sidebar.width`는
설정 화면 필드로 만들지 않고 드래그를 편집으로 본다. 쓰는 시점은 설정 화면 필드가 Save 대기,
헤더 `☀`과 사이드바 드래그 같은 직접 조작이 즉시 쓰기로 갈린다. 즉시 쓰기로 한 근거는 `Save` 바가
설정 화면에만 있어 바깥에서 만든 미저장 변경은 사용자가 보거나 저장할 수 없고, 그 상태로 설정
화면을 벗어나려 하면 `guard()`가 본 적 없는 변경으로 `Discard changes?`를 띄운다는 것이다.
설정 화면에서 Theme을 미저장으로 바꿔 둔 채 `☀`을 누르면 그 필드만 덮고 다른 필드의 미저장
변경은 두도록 했다. 이는 판단이며 사용자 판정을 받은 것은 아니다.
