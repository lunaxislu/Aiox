---
topic: AIOX TUI Stage6 Web
description: 공통 영역별 탭 분할 포커스 설정 단축키와 화면 복귀
status: open
---

## Work Items

- [ ] W1 1차 디자인 프로토타입(사이드바·workspace·알림)을 받아 드롭 존 두께·드롭 미리보기·리사이즈 감각·상태 표현을 검토하고 프롬프트를 수정한다. 사이드바 기본·최소·최대 너비와 pane 가장자리 존 비율의 확정값을 여기서 정한다.
- [ ] W2 설정 화면 2차 디자인 프롬프트를 만든다. 전역 config 편집(terminal font/color/theme, shell/args/cwd, 포트, 보존 일수)과 keybindings를 다루며, keybindings 기본키와 OS별 schema는 spec이 요구하는 대로 사용자와 먼저 논의한 뒤 프롬프트에 넣는다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 2026-09-09 단계별 로그 선생성과 plan 연결을 요청했다. 이 로그는 구현 착수·완료 증거가 아닌 단계 인계다. plans/aiox-tui-product-rebuild.md에서 이 단계가 활성화될 때 선행 로그 최신 결과와 실제 코드를 다시 확인한다. logs/artifact/AIOX-TUI-Product-Context-Prompt.md의 전체 제품 문맥과 §15 운영 Web·브라우저 복귀·알림, logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md의 대응 결정을 읽는다. 초기 goal의 reply/Host add 등 폐기된 정책을 복원하지 않는다. 구현 시 관련 owner docs와 producer/consumer·테스트까지 추적하고 변경된 계약을 owner에 반영한다.
- docs/specs/aiox-configuration-web.md, docs/architecture/aiox-storage-terminal.md, docs/aiox-tui-product.md를 읽는다. Stage 2 plain TypeScript 검증 페이지는 운영 Web 완료가 아니다. 사용자 승인된 Stage6 React·Tailwind·shadcn/ui·다국어 방향을 적용하며 나머지 Web 라이브러리는 해당 단계에서 사용자와 논의하고 실제 필요에 따라 선택한다. vendor TUI UX를 복제하지 않는다.
- 사이드바는 일반 터미널 / Hosts(development, review 등) / Networks(dev 등), 선택한 작업 화면은 분할 영역 → 영역별 탭 묶음 → 실제 PTY다. Host와 일반 터미널이 공통 UI를 쓰며 Host 전체 페이지 탭은 없다. Network 선택은 Agent·route 조회이며 화면 분할로 Host·Network를 자동 생성하지 않는다.
- 각 영역에 독립 탭 표시줄·선택 상태. 탭을 다른 영역으로 드래그 이동, 가장자리 드롭으로 상하좌우 분할, 드롭 위치 미리보기, 마지막 탭 이동 후 빈 영역 병합. 기존 문맥의 초기 이동 범위는 같은 작업 화면 내부다. 경계 드래그로 너비·높이 변경 후 실제 PTY resize. 현재 영역 확대·이전 배치 복귀와 사용자 실행 크기 균등화. 이 모든 화면 조작으로 프로세스·대화·Network를 바꾸지 않는다.
- 영역별 [+] 메뉴: 새 shell 터미널 / 오른쪽으로 분할 / 아래쪽으로 분할. 새 shell은 현재 영역에 추가하고 전체 배치를 자동 재정렬하지 않는다. Host에서는 Host 작업 경로, 일반 shell에서는 git·pnpm·직접 claude/codex도 사용 가능하나 자동 Agent 등록하지 않는다. 일반 터미널 → aiox network create dev → 단축키 분할 → 각 shell에서 aiox agent run claude 또는 codex --network dev → 같은 탭에서 실행·종료 후 shell 복귀를 연결한다.
- Stage 5의 Host 최초 auto/left-main/top-main/grid 배치를 공통 layout으로 표시한다. 초과 Agent 순환 탭 배치·빈 영역 제외·이후 사용자 배치 유지 규칙을 보존한다. 사용자 배치가 초기 설정 변경이나 Agent 상태 갱신 때문에 자동 재정렬되지 않게 한다.
- 포커스 UI: 활성 영역 테두리·선택 탭 강조, 방향별 포커스 이동, 현재 영역을 잠깐 강조. 비활성 영역 강조만 줄이고 터미널 본문 색상은 사용자 설정 유지. 2026-09-13 확정 알림 억제 기준은 브라우저 창·탭 활성과 선택 terminal이다. 검색창·버튼으로 입력 포커스가 옮겨도 선택이 유지되면 억제하며 다른 앱·브라우저 탭으로 이동하면 알림 대상이다. 이 선택·활성 상태를 Stage7 알림에 연결하고 실제 terminal 입력 포커스를 추가 조건으로 요구하지 않는다.
- 단축키 대상: 새 shell 탭, 분할, 탭 전환, 방향별 포커스 이동, 영역 확대·복귀, 크기 균등화, 포커스 강조, 사이드바 토글. macOS/Windows/Linux 기준은 서버가 아니라 브라우저 OS이며 Windows 브라우저→WSL 서버는 Windows 키다. 전역 keybindings로 재지정한다. 정확한 기본 키 조합과 OS별 설정 구조는 구현할 때 사용자와 먼저 논의한 후 결정한다. 브라우저 예약키와 터미널 프로그램 입력 보존을 검토하고 Cmd→Ctrl 단순 치환을 확정하지 않는다.
- 저장: 사이드바 너비 web.sidebar.width, 터미널 폰트·색상·키, 사용자 keybindings, Host 초기 기본값 host.layout은 전역 config. 240은 너비 예시이며 실제 기본값은 UI 구현 때 정한다. Host별 초기 layout은 YAML·CLI. Web 설정 변경도 같은 config를 갱신하고 사이드바 너비는 DB에 중복 저장하지 않는다. 실행 중 터미널·분할 방향/비율·탭 순서·선택 상태는 작업 화면별 서버 유지·복원. 브라우저를 닫아도 실행 유지, 재방문 시 현재 화면·배치·놓친 알림 복귀. 64KiB raw tail 재생은 정확한 화면 복원이 아니므로 이를 완성한다. daemon 재시작 후 자동 실행·대화 resume를 뜻하지 않는다.
- Web 일반 theme은 localStorage에 system/light/dark로 저장한다. system은 OS 현재 테마와 변경을 따르고 터미널 theme과 분리한다. 터미널 외부 앱 appearance까지 변경하지 않는다. 터미널 폰트 변경도 fit/resize에 연결한다. 전역 파일 외부 변경·Web 저장은 같은 검증/적용 경로를 쓰고 잘못된 설정은 마지막 유효 상태 유지, 포트는 다음 daemon 시작에 적용한다.
- 참고 대상·목적: cmux 영역·탭/분할 조작·포커스 표현·단축키는 https://cmux.com/docs/concepts , https://manaflow-ai-cmux.mintlify.app/features/splits-and-panes , https://cmux.com/docs/keyboard-shortcuts . Paseo의 현재 영역에 새 터미널을 배치하는 동작·회귀 사례는 https://github.com/getpaseo/paseo/blob/main/packages/app/e2e/browser/direct-terminal-shortcut-pane-placement.spec.ts . 기존 문맥의 조사 링크이며 이번 로그 작성에서 외부 소스/테스트를 새로 검증한 것은 아니다. 구현 시 관련 부분을 읽고 참고하되 cmux의 초기 배치 정책을 그대로 복제한다는 뜻은 아니다.
- W3 구현 인계: 최소 Web은 /api/terminals 생성·목록과 /api/terminals/:id 조회, 기존 /ws/terminal/:id 연결을 사용한다. 목록은 {id,cwd,kind,alive}이고 비공개 terminal 문맥은 노출하지 않는다. Agent가 연결·종료·재실행돼도 같은 terminal 선택/살아 있는 attachment를 유지하며 끊긴 연결은 재선택 가능하다. /api/terminals/:id DELETE는 명시 종료이며 Web close와 연결하지 않는다. Node DOM/HTTP/attachment 대역 검증만 수행했고 실제 브라우저 UI·정확한 화면 복원·탭/분할 UI는 이 단계에서 구현·검증한다. web.sidebar.width는 default 없는 양의 유한수이고 host.layout 공통 해석은 packages/config에 구현됐다. keyboard 보존·keybindings schema/기본키 사전 논의 조건은 그대로다.
- 2026-09-10 사용자 결정으로 공통 headless·SerializeAddon snapshot 기반 구현은 Stage2-1(logs/2026-09-10-AIOX-TUI-Stage2-1-Terminal-Snapshot.md)이 선행 소유한다. Stage6는 해당 결과를 소비해 React·탭·분할·resize·재방문 화면 복귀에 통합하고 검증한다. 기존 raw tail 개선 요구는 유지되지만 구현을 중복하지 않으며 실제 완료 전에는 복원 완료로 간주하지 않는다.
- 2026-09-13 사용자 승인: 기존 cmux 참고 범위를 pane·tab·window UI/UX로 보완한다. React 운영 Web에서 알림 아이콘 클릭 시 dropdown에 항목을 표시하고 알림 클릭 시 해당 Agent가 포함된 작업 창·영역·탭으로 이동하며 해당 알림을 읽음 처리한다. 대상 터미널(B) 선택 클릭 시 해당 대상의 미확인 해제는 Stage2-3 W5의 현재 간단 Web에 구현·검증됐으므로 그 결과를 소비한다. 저장 이력 삭제는 아니다. 외부 UX owner는 docs/specs/aiox-configuration-web.md다. Stage7은 이 UI 결과를 소비해 상태·읽음·알림음 통합과 검증을 이어가며 삭제하거나 Stage6로 전체 이전하지 않는다.
- Stage2-3의 2026-09-14 최신 마감 entry 및 이 로그의 「Stage2-3 사용자 실측·현재 이유 표시 인계」를 소비한다. 현재 관측 이유 표시·교체·제거와 별도 오류 이력 비보존은 runtime spec 및 최소 Web 구현을 소비한다. React 운영 UI·popup·소리 등 기존 후속 범위는 유지한다. 사용자 실측을 agent 재실행·모든 환경 인증으로 확대하지 않으며 확인된 동일 사용 흐름을 일괄 재검증하지 않는다.
- 2026-09-14 사용자 확정 운영 Web 화면 모델. 사이드바는 workspace 목록 하나이며 Workspaces(Web에서 사용자가 생성, 여러 개)·Networks(aiox network create로만 생성)·Hosts(aiox host run으로만 생성) 세 섹션은 전부 같은 workspace 화면(pane 분할 + pane별 독립 탭바)을 연다. 생성 출처와 자동으로 들어오는 실행만 다르다. 사이드바는 전체 높이이고 로고를 품으며 메인 위 헤더 바가 workspace 맥락(Host는 작업 경로·worktree 브랜치, Network는 멤버 수)·검색·알림·테마를 갖는다. 사이드바와 메인은 flush이고 inset·아이콘 rail은 쓰지 않는다. agent run은 --network가 가리키는 workspace에 나타난다. 그 workspace 안에서 실행했으면 해당 pane이 vendor 화면이 되고, 밖에서 실행했으면 대상 workspace에 탭이 생기며 명령을 친 shell은 살아남는다. 외부 CLI 실행 agent는 이름과 상태만 목록에 표시하고 화면·조작은 제공하지 않는다. 첫 진입에 복원할 것이 없으면 shell 1개를 자동 생성하고, Network·Host workspace가 비면 shell을 재생성하며(CLI로만 사라지는 칸이므로), 사용자 Workspace가 비면 사이드바에서 사라지고 다른 workspace 또는 첫 진입 화면으로 간다. 이 모델은 사용자 결정이며 구현·검증 결과가 아니다.
- 위 화면 모델을 적용하려면 착수 시 docs/specs/aiox-configuration-web.md의 두 서술을 갱신해야 한다. 첫째, 외부 CLI 소유 실행을 'Web 목록·알림에서 제외'로 둔 계약을 '목록에는 표시하되 화면·조작·알림 대상에서 제외'로 바꾼다. 외부 실행을 완전히 숨기면 Network workspace가 그 network의 일부만 보여 주기 때문이다. 둘째, 실행 소유권 표와 §15의 '기존 Web terminal에서 실행하고 등록 때문에 새 탭을 중복 생성하지 않는다. Agent 종료 후 원래 shell로 돌아온다'를 workspace 기반 배치 규칙으로 바꾼다. 그 문구는 CLI 중계로 shell 화면에 그리는 현재 구조를 전제로 한 것이라 전제가 바뀌면 중복 판정도 달라진다. 두 갱신 모두 사용자 결정을 반영하는 것이며 아직 문서에 적용하지 않았다. 남은 미결은 탭 닫기(x)가 종료인지 배치에서 제거인지, keybindings 기본키와 OS별 schema(spec이 구현 전 사용자 논의를 요구), 설정 화면 2차 프롬프트다.

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
