---
topic: AIOX TUI Stage6 Web
description: 공통 영역별 탭 분할 포커스 설정 단축키와 화면 복귀
status: open
---

## Work Items

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 2026-09-09 단계별 로그 선생성과 plan 연결을 요청했다. 이 로그는 구현 착수·완료 증거가 아닌 단계 인계다. plans/aiox-tui-product-rebuild.md에서 이 단계가 활성화될 때 선행 로그 최신 결과와 실제 코드를 다시 확인한다. logs/artifact/AIOX-TUI-Product-Context-Prompt.md의 전체 제품 문맥과 §15 운영 Web·브라우저 복귀·알림, logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md의 대응 결정을 읽는다. 초기 goal의 reply/Host add 등 폐기된 정책을 복원하지 않는다. 구현 시 관련 owner docs와 producer/consumer·테스트까지 추적하고 변경된 계약을 owner에 반영한다.
- docs/specs/aiox-configuration-web.md, docs/architecture/aiox-storage-terminal.md, docs/aiox-tui-product.md를 읽는다. Stage 2 plain TypeScript 검증 페이지는 운영 Web 완료가 아니다. React·Tailwind·shadcn/ui·다국어 요구를 유지하며 Web 라이브러리는 해당 단계에서 사용자와 논의하고 실제 필요에 따라 선택한다. vendor TUI UX를 복제하지 않는다.
- 사이드바는 일반 터미널 / Hosts(development, review 등) / Networks(dev 등), 선택한 작업 화면은 분할 영역 → 영역별 탭 묶음 → 실제 PTY다. Host와 일반 터미널이 공통 UI를 쓰며 Host 전체 페이지 탭은 없다. Network 선택은 Agent·route 조회이며 화면 분할로 Host·Network를 자동 생성하지 않는다.
- 각 영역에 독립 탭 표시줄·선택 상태. 탭을 다른 영역으로 드래그 이동, 가장자리 드롭으로 상하좌우 분할, 드롭 위치 미리보기, 마지막 탭 이동 후 빈 영역 병합. 기존 문맥의 초기 이동 범위는 같은 작업 화면 내부다. 경계 드래그로 너비·높이 변경 후 실제 PTY resize. 현재 영역 확대·이전 배치 복귀와 사용자 실행 크기 균등화. 이 모든 화면 조작으로 프로세스·대화·Network를 바꾸지 않는다.
- 영역별 [+] 메뉴: 새 shell 터미널 / 오른쪽으로 분할 / 아래쪽으로 분할. 새 shell은 현재 영역에 추가하고 전체 배치를 자동 재정렬하지 않는다. Host에서는 Host 작업 경로, 일반 shell에서는 git·pnpm·직접 claude/codex도 사용 가능하나 자동 Agent 등록하지 않는다. 일반 터미널 → aiox network create dev → 단축키 분할 → 각 shell에서 aiox agent run claude 또는 codex --network dev → 같은 탭에서 실행·종료 후 shell 복귀를 연결한다.
- Stage 5의 Host 최초 auto/left-main/top-main/grid 배치를 공통 layout으로 표시한다. 초과 Agent 순환 탭 배치·빈 영역 제외·이후 사용자 배치 유지 규칙을 보존한다. 사용자 배치가 초기 설정 변경이나 Agent 상태 갱신 때문에 자동 재정렬되지 않게 한다.
- 포커스: 활성 영역 테두리·선택 탭 강조, 방향별 포커스 이동, 현재 영역을 잠깐 강조. 비활성 영역 강조만 줄이고 터미널 본문 색상은 사용자 설정 유지. 실제 terminal 포커스와 브라우저 활성 여부를 Stage 7 알림에 연결하며 선택 pane만으로 실제 포커스라 가정하지 않는다.
- 단축키 대상: 새 shell 탭, 분할, 탭 전환, 방향별 포커스 이동, 영역 확대·복귀, 크기 균등화, 포커스 강조, 사이드바 토글. macOS/Windows/Linux 기준은 서버가 아니라 브라우저 OS이며 Windows 브라우저→WSL 서버는 Windows 키다. 전역 keybindings로 재지정한다. 정확한 기본 키 조합과 OS별 설정 구조는 구현할 때 사용자와 먼저 논의한 후 결정한다. 브라우저 예약키와 터미널 프로그램 입력 보존을 검토하고 Cmd→Ctrl 단순 치환을 확정하지 않는다.
- 저장: 사이드바 너비 web.sidebar.width, 터미널 폰트·색상·키, 사용자 keybindings, Host 초기 기본값 host.layout은 전역 config. 240은 너비 예시이며 실제 기본값은 UI 구현 때 정한다. Host별 초기 layout은 YAML·CLI. Web 설정 변경도 같은 config를 갱신하고 사이드바 너비는 DB에 중복 저장하지 않는다. 실행 중 터미널·분할 방향/비율·탭 순서·선택 상태는 작업 화면별 서버 유지·복원. 브라우저를 닫아도 실행 유지, 재방문 시 현재 화면·배치·놓친 알림 복귀. 64KiB raw tail 재생은 정확한 화면 복원이 아니므로 이를 완성한다. daemon 재시작 후 자동 실행·대화 resume를 뜻하지 않는다.
- Web 일반 theme은 localStorage에 system/light/dark로 저장한다. system은 OS 현재 테마와 변경을 따르고 터미널 theme과 분리한다. 터미널 외부 앱 appearance까지 변경하지 않는다. 터미널 폰트 변경도 fit/resize에 연결한다. 전역 파일 외부 변경·Web 저장은 같은 검증/적용 경로를 쓰고 잘못된 설정은 마지막 유효 상태 유지, 포트는 다음 daemon 시작에 적용한다.
- 참고 대상·목적: cmux 영역·탭/분할 조작·포커스 표현·단축키는 https://cmux.com/docs/concepts , https://manaflow-ai-cmux.mintlify.app/features/splits-and-panes , https://cmux.com/docs/keyboard-shortcuts . Paseo의 현재 영역에 새 터미널을 배치하는 동작·회귀 사례는 https://github.com/getpaseo/paseo/blob/main/packages/app/e2e/browser/direct-terminal-shortcut-pane-placement.spec.ts . 기존 문맥의 조사 링크이며 이번 로그 작성에서 외부 소스/테스트를 새로 검증한 것은 아니다. 구현 시 관련 부분을 읽고 참고하되 cmux의 초기 배치 정책을 그대로 복제한다는 뜻은 아니다.
- W3 구현 인계: 최소 Web은 /api/terminals 생성·목록과 /api/terminals/:id 조회, 기존 /ws/terminal/:id 연결을 사용한다. 목록은 {id,cwd,kind,alive}이고 비공개 terminal 문맥은 노출하지 않는다. Agent가 연결·종료·재실행돼도 같은 terminal 선택/살아 있는 attachment를 유지하며 끊긴 연결은 재선택 가능하다. /api/terminals/:id DELETE는 명시 종료이며 Web close와 연결하지 않는다. Node DOM/HTTP/attachment 대역 검증만 수행했고 실제 브라우저 UI·정확한 화면 복원·탭/분할 UI는 이 단계에서 구현·검증한다. web.sidebar.width는 default 없는 양의 유한수이고 host.layout 공통 해석은 packages/config에 구현됐다. keyboard 보존·keybindings schema/기본키 사전 논의 조건은 그대로다.
- 2026-09-10 사용자 결정으로 공통 headless·SerializeAddon snapshot 기반 구현은 Stage2-1(logs/2026-09-10-AIOX-TUI-Stage2-1-Terminal-Snapshot.md)이 선행 소유한다. Stage6는 해당 결과를 소비해 React·탭·분할·resize·재방문 화면 복귀에 통합하고 검증한다. 기존 raw tail 개선 요구는 유지되지만 구현을 중복하지 않으며 실제 완료 전에는 복원 완료로 간주하지 않는다.

## 2026-09-09 · 단계별 확정 요구와 인계 준비

사용자의 단계별 로그 생성 지시에 따라 Required Context에 구현 범위·선행 결과 소비·참고 자료·사전 논의 조건을 기록했다. 아직 이 단계의 구현을 시작하지 않았다. plan이 이 단계를 활성화하면 선행 로그 최신 기록과 실제 코드부터 대조하고 그때 필요한 Work Items를 구성한다. 이번 기록은 기능 구현·외부 참고 자료 검증 결과가 아니다.
