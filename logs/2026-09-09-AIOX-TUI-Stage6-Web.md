---
topic: AIOX TUI Stage6 Web
description: 공통 영역별 탭 분할 포커스 설정 단축키와 화면 복귀
status: open
---

## Work Items

- [x] W1 의존성 설치와 설정 파일만 한다. React·Tailwind v4·shadcn init, vite·tsconfig·apps/web 자체 vitest(happy-dom, .tsx, alias) 배선, cn import 재작성 여부 판정이다. main.ts를 폐기하고 attach.ts는 남긴다. 화면은 만들지 않고 빈 앱이 뜨는 것까지다.
- [>] W2 사이드바. react-router v7로 `/`(전체 개요), `/:section`(섹션 개요), `/:section/:panelId`(패널), `/settings`를 두고 shadcn Sidebar 복사본에서 cookie 줄과 단축키 useEffect를 삭제한 뒤 SidebarRail에 드래그 resize를 붙인다. 좁은 폭은 메인 폭을 줄이지 않는 280px 고정 오버레이 드로어이고 리사이즈 핸들을 숨긴다. 세 섹션 아코디언, 생성 주체별 우클릭 메뉴, 섹션 개요 카드, 빈 화면 두 층을 fixture로 렌더해 확인받는다. 확인 뒤 무엇을 붙일지 논의한다. 후보는 PanelView·AgentView zod, SSE 연결과 store 첫 조각, MSW 핸들러다.
- [ ] W3 헤더 바. `AppShell`의 기존 헤더(사이드바 토글·현재 패널/섹션 제목·설정 링크)를 이어서 확장한다. 사이드바 토글, workspace 이름과 종류별 맥락, 폭 기반 축약, 검색창·설정 톱니·테마 토글을 fixture로 렌더해 확인받는다. 알림 벨은 자리와 배지 숫자까지만 두고 dropdown과 클릭 이동은 W7로 미룬다. 확인 뒤 무엇을 붙일지 논의한다. 후보는 config GET/PUT zod와 MSW, 저장 절차 없이 바로 쓰는 테마 토글, store의 연결 상태에 잇는 daemon 끊김 경고다.
- [ ] W4 workspace 화면. `WorkspacePage`의 기존 패널 검증·빈 화면·비활성 새 터미널 버튼을 출발점으로 삼는다. shadcn Resizable로 layout 트리를 그리고 pane마다 탭바를 둔다. pane [+] 드롭다운, 탭 상태 점, presentation 일곱 값과 notice·Copy를 fixture로 렌더해 확인받는다. 확인 뒤 무엇을 붙일지 논의한다. 후보는 attach.ts로 terminalId별 xterm 부착, layout PUT·shells·tab close zod와 MSW, Operation store다.
- [ ] W5 탭 드래그와 드롭. dnd-kit pointer 기반으로 네 결과를 구분한다. 같은 탭바 순서 변경, 다른 pane 이동, 가장자리 분할, 중앙 합치기다. 드롭 전 반투명 오버레이를 보여 주고 확인받은 뒤 결과를 layout PUT으로 보낸다. 드롭 위치 판정은 Playwright로 검증하며 이때 Playwright를 처음 넣는다.
- [ ] W6 커맨드 팔레트. shadcn Command로 검색창을 열어 workspace·터미널·agent와 명령을 두 섹션으로 나눠 필터링하고 위아래 화살표·Enter·Esc를 붙인다. 확인 뒤 선택 결과를 해당 workspace·pane·탭으로 점프시키는 store 경로에 잇는다. 점프 대상이 모두 존재해야 하므로 workspace 화면 뒤에 둔다.
- [ ] W7 알림. 헤더 벨의 dropdown을 열어 미확인 항목을 어떤 agent에서 무슨 일이 있었는지와 상대 시각으로 보여 주고 Clear all을 둔다. 확인 뒤 항목 클릭을 해당 workspace·pane·탭 이동과 확인 처리에 잇고 read 요청은 클릭이 ids 하나, Clear all이 ids 생략이다. 이동 대상이 다 있어야 하므로 main 화면 작업의 마지막이다.
- [ ] W8 설정 화면. 섹션 목록과 필드, 키 재지정 UI, Save 바와 변경 카운트, theme 미리보기, Discard dialog를 fixture로 렌더해 확인받는다. 좁은 폭은 섹션 목록을 상단 가로 탭으로 바꾸고 필드를 1열로 쌓되 Save 바와 dialog 기본 포커스 규칙은 그대로다. 확인 뒤 config revision 비교로 외부 변경 배너와 저장 충돌 dialog를 잇고 사이드바 너비 드래그를 저장 절차 없이 바로 쓰는 경로에 연결한다.
- [ ] W9 화면 조작 keybindings와 남은 횡단 규칙. 확정된 11행 표를 전역 핸들러로 붙이고 config의 변경분과 합친다. 컴포넌트 하나로 끝나지 않아 남은 반응형 규칙도 여기서 닫는다. 화면을 이동시키는 동작이 드로어를 닫고 테마 토글처럼 이동이 아닌 동작은 유지하는 규칙, 햄버거의 미확인 점, 드로어 위 알림 dropdown의 Esc·backdrop 순서다.
- [ ] W10 실제 daemon 연결과 통합 검증을 소유한다. main을 merge해 `@aiox/protocol`의 zod·타입이 이미 들어왔고 apps/web에는 임시 정의도 MSW도 만든 적이 없으므로 교체·제거 작업은 없다. 화면을 실제 HTTP·SSE·WS에 붙이고 PTY 입출력·resize·shell 생존과 재접속 복원을 확인한다. Stage5 W11이 갖고 있던 W5~W10 실제 화면 연결과 전체 흐름 통합 검증을 이 항목이 흡수한다. 검증에서 서버 쪽 결함이 나오면 apps/daemon·packages/protocol은 Stage5 단독 수정이므로 고치지 않고 Stage5 W11로 넘긴다. 운영 Web 내부 구조는 docs/architecture/aiox-system.md에 반영한다.
- [ ] W11 자동화로 닫을 수 없어 구현 후로 넘긴 사용자 실측 판정을 닫는다. 드롭 존 두께 확정값(초안 pane의 20%)과 Windows/Linux 브라우저 예약키 충돌이다. 사용자가 실제 화면에서 조작해 판정하고 어긋나는 것만 고친다. 탭 드래그·분할·미리보기 동작은 W5에서 pointer 기반으로 바꿔 Playwright가 판정하므로 이 항목에서 제외한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 확정된 것은 전부 owner 문서에 있다. 화면 규칙은 [[docs/specs/aiox-web-ui]], 설정 필드의 검증·저장·HTTP와 keybindings 키 값·wire schema는 [[docs/specs/aiox-configuration-web]], 저장 경계는 그 문서와 [[docs/architecture/aiox-storage-terminal]], agent 상태 값 의미와 terminal 수명은 [[docs/specs/aiox-runtime]], Host 배치 우선순위는 [[docs/specs/aiox-host]]가 소유한다. 이 로그에 규칙을 다시 쓰지 않는다. 규칙이 바뀌면 로그가 아니라 owner 문서를 고친다.
- 소유 경계. 3차(Host 종료·재시작) 반영본 검토는 Stage5 W1이 소유하며 이 로그는 판정하지 않는다. plan의 단계 marker와 Stage 3·Stage 5와의 병렬 조율은 사용자가 소유하므로 이 로그에서 plan을 고치지 않는다. Stage 6 착수 자체가 사용자 권위로 이뤄졌다.
- 프로토타입 `logs/artifact/aiox-version9.html`은 Claude Design 번들이라 코드를 React로 재사용하지 않는다. 확정되는 것은 화면 규칙뿐이고 디버그 패널도 구현에 포함하지 않는다. 다만 그 패널이 재현한 상태 집합은 fixture·mock으로 다시 만들어 검증해야 한다. `agentViewSchema.status` 다섯 값(`aiox-preparing`·`idle`·`working`·`awaiting-user`·`failed`), 판정 불가 터미널, daemon 연결 끊김의 헤더 경고, `config.json` 외부 변경의 화면 열 때 배너와 저장 시점 충돌 dialog, 섹션 빈 화면 두 층, 드롭 존 두께, 테마 전환, status bar 기본 열림, 알림 추가에 따른 dropdown 표시와 읽음 처리다. 이 목록은 검증 후보이며 확정된 test 계획이 아니다.
- 실제 구현의 사이드바는 shadcn의 Sidebar를 쓴다. shadcn은 의존성이 아니라 레지스트리에서 소스를 복사해 오는 방식이라 복사본 수정이 유지보수 부담이 되지 않는다. base는 `aria`·`base`·`radix` 셋 중 Base UI(`base`)이며 2026-07부터 shadcn 기본값이다.
- 최소 Web 인계. `attach.ts`는 버리지 않고 React 컴포넌트로 감싸 재사용한다. `@xterm/xterm` 6.0.0·`@xterm/addon-fit`·`@aiox/terminal`의 restore가 브라우저 쪽 터미널 렌더링과 화면 복원을 담당하며 Stage2-1 snapshot 결과를 중복 구현하지 않는다. `main.ts`는 폐기한다. panel 안의 새 shell은 `/api/terminals` 생성이 아니라 `POST /api/panels/:id/shells`로 만들어야 배치에 들어간다. `/api/terminals`는 terminal 생존 조회용으로만 남는다.
- 확정 스택. UI는 shadcn(Base UI base)과 `tailwindcss@4`, 상태는 `zustand`이며 TanStack Query는 쓰지 않는다. 서버가 SSE로 완전한 DTO를 미는 push-apply 모델이라 쿼리 캐시를 두면 진실 소스가 둘이 되기 때문이다. 드래그는 `@dnd-kit/core`·`@dnd-kit/sortable`의 pointer 기반이다. mock은 `msw` 한 세트로 HTTP·SSE·WS를 덮되 실제 xterm bytes는 mock하지 않고 기존 WS consumer로 교체한다. 라우팅은 `react-router` v7이며 현재 경로와 페이지 매핑은 `apps/web/src/app/router.tsx`를 따른다. 전체 개요와 섹션 개요는 별도 페이지이고 패널은 section 아래에 둔다. 카탈로그는 `storybook`·`@storybook/react-vite`·`msw-storybook-addon`이다. 테스트는 `vitest`·`@testing-library/react`·`@testing-library/user-event`·`happy-dom`이고 `@playwright/test`는 드롭 위치 판정과 스모크에만 쓴다. `lucide-react`·`class-variance-authority`·`clsx`·`tailwind-merge`는 shadcn 컴포넌트 설치 때 따라오므로 따로 넣지 않는다.
- 모바일 우선으로 만든다. breakpoint는 `768px` 하나이고 Tailwind 기본 클래스가 좁은 폭, `md:`가 768px 이상이다. 각 컴포넌트를 좁은 폭부터 쓰고 넓은 폭을 덧붙이며 반응형을 마지막 작업으로 몰지 않는다. 목적은 폰 전용 화면이 아니라 데스크톱 창 축소 대응이므로 `360px` 미만은 대상이 아니다. 터미널 영역은 창 폭으로 레이아웃을 바꾸지 않고 xterm이 fit·resize만 한다.
- 세로로 썬다. 각 화면 W는 컴포넌트 단위로 UI를 먼저 만들어 사용자 확인을 받는다. 확인을 받은 뒤 그 화면에 무엇을 붙일지 사용자와 논의해서 정하고 붙인다. 각 W에 적힌 것은 후보이지 확정이 아니며 논의 없이 붙이지 않는다. UI가 없으면 store 모양을 짐작하게 되므로 순서를 뒤집지 않는다. 1단계 fixture도 처음부터 계약 모양으로 한 fixture 파일에 두어 컴포넌트에 더미를 박지 않는다. 그래야 다음 단계가 props를 store로 바꾸는 것만 되고 fixture를 다시 만들지 않는다. DTO 스키마는 `@aiox/protocol`에서 바로 import한다. merge로 이미 들어와 있으므로 apps/web에 임시 zod를 만들지 않는다. fixture의 `PanelPreview` 같은 표시용 타입은 DTO 대체가 아니라 UI 단계의 입력 모양이므로 protocol 타입과 별개로 둔다.
- 설치와 기능 연결은 구분한다. 사용자 권한으로 W2에서 설치한 도구는 {W2}의 설치 완료 기록과 `apps/web/package.json`을 확인하고 재설치 작업으로 잡지 않는다. Storybook의 브라우저 테스트 연결은 이미 있으며, 드롭 위치 판정은 W5에서 구현한다. `msw`·`msw-storybook-addon`은 아직 설치되지 않은 후보이고, 도입 시 HTTP·SSE·WS 핸들러 한 세트를 Storybook·vite dev·Vitest·Playwright가 공유한다. story는 필요한 화면·상태를 기존 story에 이어서 작성한다.
- 스택 선택 중 owner 문서에 근거가 없는 셋. 라우터는 계약이 요구하지 않는다. [[docs/specs/aiox-configuration-web]]의 복귀 계약이 복원하라는 것은 Host·Agent·배치·terminal 현재 화면·미확인 알림뿐이고 전부 서버 소유다. 그래도 두는 이유는 브라우저 저장소가 금지라 무엇을 보고 있었는지를 담을 자리가 URL뿐이고, 없으면 알림·팔레트 점프 뒤 뒤로 가기가 앱을 벗어나며, 탭 두 개가 서로 다른 workspace를 볼 수 없기 때문이다. happy-dom은 jsdom보다 빠르다는 것 말고 강한 이유가 없다. xterm은 canvas가 필요하고 `ResizeObserver`는 둘 다 없어 어차피 mock하므로 실질 차이가 속도뿐이며, 막히면 environment 한 줄로 jsdom에 간다. `cn`을 bare specifier로 두면 shadcn 복사본이 upstream과 같아져 갱신 때 import가 안 흔들리지만 CLI가 alias로 재작성하면 그 이점이 사라지므로 W1에서 보고 정한다.
- 작업 트리. Stage 6은 `~/Documents/aiox-stage6`의 별도 worktree에서 시작했고 2026-09-23에 그 브랜치를 main에 합쳐 worktree를 없앴다. 분리의 목적은 Stage 5와의 병렬 작업이었는데 Stage 5가 W1~W10을 끝내고 남은 W11이 Stage 6 화면을 요구해 병렬성이 사라졌기 때문이다. merge로 `packages/protocol`의 `core.ts`·`host.ts`·`configuration.ts`와 Hono·Drizzle·Pino 전환이 들어와 스냅샷 drift가 닫혔다. 충돌은 `pnpm-lock.yaml` 하나였고 main은 `apps/web`을 한 줄도 건드리지 않았다. 따라서 임시 zod 정의도 계약 handoff 메시지 경로도 더 이상 필요 없고 `@aiox/protocol`에서 바로 import한다. 소유 경계만 남는다. `apps/daemon`과 `packages/protocol`은 Stage5 단독 수정이고 `apps/web`은 이 로그가 소유한다. 새로 clone한 트리에서는 루트 `pnpm install` 뒤 `pnpm -r --if-present build`를 먼저 돌린다. `packages/*/dist`가 없으면 `@aiox/terminal/restore`가 풀리지 않아 web 빌드와 타입체크가 실패한다.

### {W1}

- 스캐폴드 판정 항목. `shadcn init` 뒤 컴포넌트 하나를 받아 `cn` import가 `@/lib/utils`로 재작성되는지 bare specifier로 남는지 확인한다. 재작성되면 그대로 쓰고, 남으면 tsconfig paths·vite·vitest 세 곳에 alias를 건다. 레지스트리 소스가 bare specifier 형태인 것은 확인했다. 루트 `vitest.config.ts`는 `include`가 `.ts`만이고 environment가 node라 `.tsx`와 DOM이 안 잡힌다. 모든 패키지가 공유하므로 고치지 말고 `apps/web`에 자체 설정을 둔다.

### {W2}

- 사용자 결정으로 섹션 아코디언·패널 항목·우클릭 메뉴는 `AppSidebar` 안에 유지한다. JSX를 옮기기 위한 `SidebarSection`·`SidebarItem` 분리는 작업 목표가 아니다. 현재 구성과 페이지 경계는 `apps/web/src/widgets/sidebar/app-sidebar.tsx`, `apps/web/src/app/router.tsx` 및 각 페이지 구현을 출발점으로 삼는다. 기존 Overview·SectionOverview·NotFound·카드·빈 화면 story를 이어서 사용한다.
- 설치 완료 범위는 사용자 권한으로 W2에서 수행했다. `react-router`, `zustand`, Storybook과 관련 addon, `playwright`·`@vitest/browser-playwright` 등 현재 추가된 의존성은 `apps/web/package.json`이 소유한다. Playwright는 Storybook의 Vitest 브라우저 테스트에 연결돼 있다. 설치 완료는 zustand store·SSE·실제 daemon 연결이나 W5 드래그 검증의 완료를 뜻하지 않는다.

### {W3}

- 컴포넌트 순서. `AppHeader`(전체 배치) → `WorkspaceTitle`(이름과 종류별 맥락, 맥락이 먼저 줄고 이름이 마지막까지 남는 폭 기반 단일 규칙) → `HeaderActions`(검색창, 벨 자리, 톱니, 테마 토글; 좁은 폭에서 검색은 아이콘) → `ThemeToggle` → `ConnectionWarning`. 벨은 자리와 배지 숫자까지만이고 dropdown은 W7이다. Settings 진입은 헤더 톱니뿐이며 사이드바 하단에 Settings 행을 두지 않는다.
- 재개 출발점은 `apps/web/src/app/app-shell.tsx`의 기존 헤더다. 토글·현재 패널/섹션 제목·설정 링크를 재사용하고, 종류별 맥락·폭 기반 축약·검색·알림·앱 테마 전환·연결 경고를 이어서 구현한다. Storybook의 테마 전환 설정은 앱의 테마 기능 완료가 아니다.

### {W4}

- 컴포넌트 순서. `PaneTree`(layout 재귀를 Resizable로) → `Pane`(활성 테두리 강조, 빈 pane 유지) → `TabBar` → `Tab`(라벨·상태 점·닫기) → `PaneAddMenu`(New shell·Split right·Split down) → `TerminalView`(`attach.ts` 래퍼) → `TabNotice`(stopped 안내·Copy·restartCommand) → `CloseConfirmDialog`. 탭 닫기 idle 판정은 Web이 하지 않고 `confirm:false`로 보낸 뒤 409 `confirmation_required`면 dialog를 띄워 `confirm:true`로 재전송한다. 이때 requestId는 새로 만든다.
- 재개 출발점은 `apps/web/src/pages/workspace/workspace-page.tsx`다. section과 panelId 검증, NotFound, 패널 종류별 빈 화면과 비활성 새 터미널 버튼이 있다. pane·탭·layout·xterm 연결은 남은 작업이며 기존 `attach.ts`를 연결한다.

### {W4,W5}

- 터미널과 드래그. `attach.ts`가 terminalId별로 xterm과 WS를 소유하므로 pane 컴포넌트가 옮겨 다녀도 재생성하지 않는다. 드래그를 HTML5 DnD가 아니라 pointer 기반으로 고른 이유는 HTML5 DnD가 합성 이벤트로 발화하지 않아 자동 검증이 원천적으로 불가능하기 때문이다. pointer 기반이면 Testing Library `user-event`의 `user.pointer()`가 이벤트를 발화할 수 있다. 다만 jsdom·happy-dom은 `getBoundingClientRect()`가 전부 0이라 드롭 대상 판정이 불가능하므로 드롭 위치 검증은 실제 레이아웃이 있는 Playwright에서만 한다.
### {W9,W11}

- 키 선정에서 탈락한 것과 미실측 범위. macOS 실측에서 떨어진 자리는 `⌘⇧N` 시크릿 창, `⌘⇧W` 창 닫기, `⌘⇧K` 사용자 Notion 전역 단축키, `⌘⇧Y`, 순차 탭 전환 후보 `⌘⌥좌우`·`⌘⇧대괄호`·`Ctrl+Tab`, `⌘Delete` 계열이며 미도달 원인에서 브라우저 점유와 실측 페이지 매칭 실패를 구분하지 않았다. `⌘T`는 실제 Chrome에서 새 탭이 열리고 페이지에 로그가 남지 않아 제외했다. 통과했으나 쓰지 않는 여유 후보는 `⌘⇧E`·`F`·`G`·`U`·`V`·`A`와 `⌘⌥I`·`U`·`C`다. 탭 전환은 3차 실측에서 `⌘1`~`⌘9`가 모두 통과했고 `⌘⇧1`~`⌘⇧9`는 `⌘⇧3`~`⌘⇧6`이 화면 캡처로 작동해 OS 층에서 막혔다. 이 탈락은 브라우저 예약이나 사용자 앱 전역과 달리 모든 macOS에 공통이라 사용자가 시스템 설정을 바꾸지 않는 한 닫히지 않는다. macOS는 이것으로 닫혔고 남은 미실측은 Windows/Linux뿐이라 W11 범위와 일치한다.
- 예약키 충돌은 agent가 닫을 수 없다. CDP 주입 경로(Playwright, 브라우저 확장)가 브라우저 프로세스 accelerator를 관측하지 못해 검사에 쓸 수 없다. OS 입력 경로를 쓰는 데스크톱 자동화는 원리상 가능하나 현재 환경에서 브라우저가 read tier라 키 입력이 차단된다. 사용자 직접 조작으로만 닫힌다.

### {W10}

- 정합 순서와 소유 경계. Stage5에 요청했던 zod 스키마·타입은 main merge로 이미 들어왔다. `packages/protocol`과 `apps/daemon` 전체는 Stage5 단독 수정이고 `apps/web` 전체와 [[docs/specs/aiox-web-ui]]는 이 로그가 소유한다. 공동인 [[docs/specs/aiox-configuration-web]]은 Stage5가 API·DTO 절, Stage6이 keybindings·저장 경계 절이다. 서버 계약의 owner는 실행 가능한 zod인 `packages/protocol`과 그 문서의 `Panel 조회·변경 HTTP와 React DTO`·`상태 전달·terminal 연결과 mock 전환` 절이다. worktree 시절의 인계문 `apps/web/Spec.md`는 두 owner를 중복 서술해 2026-09-23에 삭제했다. 계약이 어긋나 보이면 로그나 별도 문서를 만들지 말고 차이를 근거와 함께 보고한다. 운영 Web 내부 구조는 아직 owner 문서가 없으므로 이 단계에서 [[docs/architecture/aiox-system]]에 반영한다.


## 2026-09-21 · 설계 라인 마감과 구현 착수

설계 프롬프트 라인이 14차로 끝났다. 누적 프롬프트는 `logs/artifact/AIOX-Web-UI-Design-Prompt.md`
이고 기반 문서 셋(1차 workspace 화면, 2차 설정 화면, 3차 Host 수명)에 수정 지시 14차가 쌓인
changelog 형태다. 마지막 반영본은 `logs/artifact/aiox-version9.html`이며 14차 2건과 grid 기본값
1/1이 실측으로 닫혔다. 이전 반영본 `aiox-version1~8.html`은 사용자가 교체하며 삭제했으므로
로그와 프롬프트의 그 경로 언급은 dangling이고 복구 대상이 아니다.

확정 내용은 전부 owner 문서로 옮겼다. 화면 규칙은 `docs/specs/aiox-web-ui.md`를 신설해 354줄로
증류했고, keybindings 확정표와 OS별 wire schema, 브라우저 저장소 금지, 사이드바 기본 240·
드래그 180~400, 화면 모델 두 건은 `docs/specs/aiox-configuration-web.md`와
`docs/architecture/aiox-storage-terminal.md`에 넣었다. 프롬프트 파일을 최종본으로 쓰지 않은
이유는 logs가 durable owner가 아니고, 규칙 하나를 알려면 기반 문서에 델타 14개를 순서대로
적용해야 하며, 디자인 agent용 지시문 문체라 구현 참조와 목적이 다르기 때문이다. 이 로그도
같은 이유로 확정 규칙을 다시 적지 않는다.

사용자 결정으로 이 로그의 기록을 압축했다. owner 문서에 반영된 규칙 서술과 각 차수 수정 지시의
내용은 뺐고, 문서로 옮길 수 없는 작업 경위만 남겼다. 압축 직전 상태는 git에 없으므로 복구
대상이 아니며, 아래가 보존하기로 한 경위 전부다.

### 2026-09-21 · 틀렸다가 정정한 판단 셋

같은 함정을 다시 밟지 않도록 남긴다. 셋 다 실제로 잘못 보고했다가 고친 것이다.

첫째, `@xterm/xterm@6.0.0`의 `evaluateKeyboardEvent`를 보고 "macOS의 Cmd 조합은 안전하고
Windows/Linux의 Ctrl+Shift 조합은 안전하다"고 일반화했는데 틀렸다. `default` 분기(문자키)만
보고 전체로 확대했으나 방향키와 Enter는 앞선 `case`에서 따로 처리된다. `case 13`은
`altKey ? ESC+CR : CR`로 meta/ctrl/shift를 보지 않아 `Cmd+Enter`와 `Ctrl+Shift+Enter` 모두 `\r`을
보내고, `case 37/38/39/40`은 `if (e.metaKey) break`로 Cmd만 막아 `Ctrl+Shift+왼쪽`은 `ESC[1;6D`를
보낸다. codex가 반례를 제시해 소스로 재확인하고 정정했다.

둘째, 사용자가 다른 agent에게 Playwright로 브라우저 예약키 충돌 조사를 시켰고 `⌘T`·`⌘W`가
`preventDefault()` 유무와 무관하게 발생하지 않는다는 결과가 나왔는데 false negative였다.
사용자가 실제 Chrome에서 `⌘T`를 누르면 새 탭이 열리고 페이지에는 로그가 남지 않는다. CDP가
브라우저 프로세스 accelerator를 우회한다는 메커니즘 설명은 이 세션의 추론이며 Chromium
구현으로 확인한 것이 아니다.

셋째, Host layout preset이 `3 + 1`로 접히는 것을 10차 지시 위반으로 보고하면서 적용 범위를
넓게 잡았다. 10차 3번 원문이 "한 줄에 안 들어가면 2x2로 접습니다"라는 조건부인데 무조건으로
읽어, 한 줄에 넷이 들어가는 500~767px의 `4 x 1`까지 위반으로 보고했다가 정정했다. 실제 수정
대상은 `3 + 1`이 나오는 폭뿐이었다. 누적 프롬프트에서 현재 규칙을 읽을 때의 전형적인 비용이며
화면 규칙을 spec으로 증류한 직접적인 근거가 됐다.

### 2026-09-21 · 프레임 전환 — 안전한 키가 아니라 뺏을 키

`attachCustomKeyEventHandler`로 어떤 키든 가로채 xterm에 전달하지 않을 수 있으므로 "터미널에
안전한 키를 찾는" 문제가 아니라 "TUI에서 무엇을 뺏을지 고르는" 문제다. 바이트가 원래 안 나가는
조합은 비용 0이고, 나가는 조합은 가져오면 vendor TUI와 shell이 그 입력을 못 받는다.

이 프레임에서 드러난 구조적 제약은 Windows/Linux에 modifier와 방향키 조합 중 비용 0인 것이
없다는 것이다. 비트마스크가 shift/alt/ctrl을 모두 포함해 어떤 조합이든 `ESC[1;Nx`가 나간다.
macOS만 `metaKey` guard로 탈출구가 있다. 방향 포커스 이동을 vim식 문자키 `H`/`J`/`K`/`L`로 둔
것이 양쪽 모두 비용 0이 되는 유일한 선택이었고 이 판정은 추가 실측 없이 소스로 닫혔다.

기본값 방향으로 leader 방식(tmux식 prefix)은 채택하지 않았다. 두 번 입력해야 하고 leader 자체가
터미널 입력을 차지하며 필요한 상황이 확인되지 않았다. 일괄 변환 규칙도 쓰지 않고 기능별 예외를
허용한다. 기존 `keyboard` 문자열 맵은 schema 검증·파싱 외의 실행 소비자를 찾지 못했으나 spec이
보존을 요구하므로 제거하거나 의미를 바꾸지 않는다.

### 2026-09-21 · shadcn Sidebar 충돌 셋과 채택하지 않은 대안

레지스트리의 `apps/v4/registry/bases/base/ui/sidebar.tsx`를 직접 읽어 셋을 닫았다. 결정 자체는
owner 문서와 W1에 있고 여기에는 대안을 버린 이유만 남긴다.

cookie는 `setOpen`의 if/else 밖에 있어 controlled로 써도 무조건 실행된다. 용도가 SSR에서 서버가
cookie를 읽어 `defaultOpen`을 채워 첫 렌더 깜빡임을 없애는 것인데 `apps/web`은 Vite SPA라 SSR이
없다. 그래서 그 한 줄을 지워도 기능이 깨지지 않는다.

단축키는 키가 `"b"` 하드코딩이라 재지정이 안 된다. 상수만 바꾸는 방향 대신 `useEffect`를 통째로
지우기로 한 것은, 어차피 열한 개 조작을 처리하는 전역 핸들러가 필요하고 `Change` 재지정을
지원해야 해서 리스너를 둘 유지할 이유가 없기 때문이다.

resize는 `bases/base/ui/resizable.tsx`가 있지만 내부가 Base UI가 아니라 `react-resizable-panels`
래퍼다. Base UI에 resize primitive가 없어서다. 사이드바에 쓰지 않기로 한 이유는
`ResizablePanelGroup`이 패널을 flex로 묶어 양쪽 폭을 함께 조절하는 구조라, 좁은 폭에서 드로어가
오버레이로 떠 메인 폭을 줄이지 않기로 한 확정과 모델이 충돌하기 때문이다. 대신 pane 분할 경계
드래그와 이후 PTY resize에 쓴다.

### 2026-09-21 · 사용자 확정으로 남은 판단

사용자가 프로토타입에서 직접 조작해 탭 드래그 이동·가장자리 분할·드롭 미리보기를 수용
판정했다. 드롭 존 두께 20%는 설계에서 확정하지 않고 구현 후 실제 화면에서 조정한다. 같은
방침을 Windows/Linux 브라우저 예약키에도 적용한다. 확인된 잔여 후보 충돌은 Firefox의
`Ctrl+Shift+K` 웹 콘솔 하나이고 Chrome은 쓰지 않는다.

`767px`에서 `768px`로 넓힐 때 헤더 맥락이 짧아지는 것은 드로어가 메인 폭을 줄이지 않기로 한
확정의 결과이므로 보정하지 않고 유지한다. 사용자 결정이며 경계 전용 예외를 넣지 않는다.

Host layout grid의 `columns`·`rows` 기본값 1/1은 사용자 확정이다. 관측 가능한 부작용 하나를
남긴다. 전역 config가 grid 1x1이면 YAML에 `columns=3`만 있을 때 결과가 3x1이고, 전역이 2x2였을
때의 3x2와 다르다. 또 grid 1x1은 pane 하나짜리 배치라 preset만 grid로 바꾸고 치수를 안 건드린
사용자는 auto 4개 배치와 다른 화면을 본다. 사용자 확정 사항이라 그대로 둔다.

### 2026-09-23 12:00 · W2 라우팅 기록을 현재 코드에 정합

사용자가 현재 코드를 기준으로 W2의 route 기록 정합을 요청했다. `apps/web/src/app/router.tsx`와 sidebar·카드·AppShell의 이동 경로를 대조해, W2와 Global의 이전 `/w/:panelId` 표기를 갱신했다. 전체 개요와 섹션 개요를 분리한 구현을 재개 기준으로 삼으며, 유효하지 않은 section 및 section과 맞지 않는 panelId는 페이지에서 NotFound로 처리한다. 이번 정합은 라우팅 기록에 한정하며 W2는 진행 중으로 유지한다.

### 2026-09-23 12:05 · W2 설치·구성 결정과 W3·W4 재개 맥락 정합

사용자가 AppSidebar 내부 유지 결정, 사용자 권한으로 W2에서 수행한 설치, W3·W4의 기존 화면 틀을 기록에 반영하도록 지시했다. W2의 분리 지침과 첫 story 후보, Global의 미래 설치 시점 안내를 갱신하고 W3·W4에는 현재 구현을 출발점으로 명시했다. 설치 사실은 package.json과 Storybook/Vitest 설정으로 확인했으며, 아직 없는 MSW와 store·daemon·드래그 기능 연결은 완료로 간주하지 않았다. W1 완료 이력과 W2 진행/W3·W4 대기 상태는 유지했다. apps/web/AGENTS.md의 sidebar 예시도 현재 경로·DOM·활성 판정에 맞췄다.
