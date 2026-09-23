---
topic: AIOX TUI Stage6 Web
description: 공통 영역별 탭 분할 포커스 설정 단축키와 화면 복귀
status: open
---

## Work Items

- [x] W1 의존성 설치와 설정 파일만 한다. React·Tailwind v4·shadcn init, vite·tsconfig·apps/web 자체 vitest(happy-dom, .tsx, alias) 배선, cn import 재작성 여부 판정이다. main.ts를 폐기하고 attach.ts는 남긴다. 화면은 만들지 않고 빈 앱이 뜨는 것까지다.
- [x] W2 사이드바. react-router v7로 `/`(전체 개요), `/:section`(섹션 개요), `/:section/:panelId`(패널), `/settings`를 두고 shadcn Sidebar 복사본에서 cookie 줄과 단축키 useEffect를 삭제한 뒤 SidebarRail에 드래그 resize를 붙인다. 좁은 폭은 메인 폭을 줄이지 않는 280px 고정 오버레이 드로어이고 리사이즈 핸들을 숨긴다. 세 섹션 아코디언, 생성 주체별 우클릭 메뉴, 섹션 개요 카드, 빈 화면 두 층을 fixture로 렌더해 확인받는다. 확인 뒤 무엇을 붙일지 논의한다. 후보는 PanelView·AgentView zod, SSE 연결과 store 첫 조각, MSW 핸들러다.
- [x] W3 헤더 구조 승인 후 layout만 적용했다. AppHeader·WorkspaceTitle·HeaderActions·ThemeToggle·ConnectionWarning과 드로어 아이콘 줄의 배치·폭 축약을 사용자에게 확인받는다. font size·색·장식은 미적용이다. 검색 W6·알림 dropdown W7·설정 저장 W8·햄버거 점과 Esc 순서 W9·실제 연결 W10 범위를 유지한다.
- [x] W4 W4 workspace UI·상태 안내·복구 카드·포커스·Copy 개선을 fixture로 반영하고 코드 리뷰·리팩토링과 spec 정합을 마쳤다. terminal attach 수명·접속 상태 연결 범위도 확정해 기록했다. 남은 것은 사용자 퍼블리싱 화면 확인 하나다. Force stop 서버 보완은 W11, 실제 API·Operation 연결과 통합 검증은 W10에서 추적한다. 실제 terminal 연결은 아직 미구현이다.
- [>] W5 탭 드래그와 드롭. dnd-kit pointer 기반으로 네 결과를 구분한다. 같은 탭바 순서 변경, 다른 pane 이동, 가장자리 분할, 중앙 합치기다. 드롭 전 반투명 오버레이를 보여 주고 확인받은 뒤 결과를 layout PUT으로 보낸다. 드롭 위치 판정은 Playwright로 검증하며 이때 Playwright를 처음 넣는다.
- [ ] W6 커맨드 팔레트. shadcn Command로 검색창을 열어 workspace·터미널·agent와 명령을 두 섹션으로 나눠 필터링하고 위아래 화살표·Enter·Esc를 붙인다. 확인 뒤 선택 결과를 해당 workspace·pane·탭으로 점프시키는 store 경로에 잇는다. 점프 대상이 모두 존재해야 하므로 workspace 화면 뒤에 둔다.
- [ ] W7 알림. 헤더 벨의 dropdown을 열어 미확인 항목을 어떤 agent에서 무슨 일이 있었는지와 상대 시각으로 보여 주고 Clear all을 둔다. 확인 뒤 항목 클릭을 해당 workspace·pane·탭 이동과 확인 처리에 잇고 read 요청은 클릭이 ids 하나, Clear all이 ids 생략이다. 이동 대상이 다 있어야 하므로 main 화면 작업의 마지막이다.
- [ ] W8 설정 화면. 섹션 목록과 필드, 키 재지정 UI, Save 바와 변경 카운트, theme 미리보기, Discard dialog를 fixture로 렌더해 확인받는다. 좁은 폭은 섹션 목록을 상단 가로 탭으로 바꾸고 필드를 1열로 쌓되 Save 바와 dialog 기본 포커스 규칙은 그대로다. 확인 뒤 config revision 비교로 외부 변경 배너와 저장 충돌 dialog를 잇고 사이드바 너비 드래그를 저장 절차 없이 바로 쓰는 경로에 연결한다.
- [ ] W9 화면 조작 keybindings와 남은 횡단 규칙. 확정된 11행 표를 전역 핸들러로 붙이고 config의 변경분과 합친다. 컴포넌트 하나로 끝나지 않아 남은 반응형 규칙도 여기서 닫는다. 화면을 이동시키는 동작이 드로어를 닫고 테마 토글처럼 이동이 아닌 동작은 유지하는 규칙, 햄버거의 미확인 점, 드로어 위 알림 dropdown의 Esc·backdrop 순서다.
- [ ] W10 실제 daemon 연결과 통합 검증을 소유한다. main을 merge해 `@aiox/protocol`의 zod·타입이 이미 들어왔고 apps/web에는 임시 정의도 MSW도 만든 적이 없으므로 교체·제거 작업은 없다. 화면을 실제 HTTP·SSE·WS에 붙이고 PTY 입출력·resize·shell 생존과 재접속 복원을 확인한다. Stage5 W11이 갖고 있던 W5~W10 실제 화면 연결과 전체 흐름 통합 검증을 이 항목이 흡수한다. 검증에서 서버 쪽 결함이 나오면 apps/daemon·packages/protocol은 Stage5 단독 수정이므로 고치지 않고 Stage5 W11로 넘긴다. 운영 Web 내부 구조는 docs/architecture/aiox-system.md에 반영한다. Force stop 연결을 명시적으로 포함한다: 세 복구 상태의 버튼 → 확인 dialog → 최신 PanelView의 revision/runtime와 새 requestId로 기존 탭 종료 DELETE → Operation 성공·실패 관측 → 서버 배치 반영. 실패 표시·재시도와 실제 PTY 종료를 통합 검증한다. 서버 빈 pane·포커스 정리 보완 결과를 먼저 확인한다.
- [ ] W11 서버 에이전트 구현 완료 보고 수신. removePanelTabs의 빈 pane·split·포커스 정리와 removeTerminal의 원자 저장은 직접 코드로 확인했다. 보고된 147개 테스트를 이 턴에 재실행하지는 않았다. 문서의 빈 pane·분할 유지 설명 정합성과 Web 통합 검증이 남았다.
- [-] W12 Force stop 서버 보완(서버 에이전트 전달 대상). 기존 panel tab close API를 재사용해 실제 종료·실패·재시도 계약을 확인하고 탭 제거와 빈 pane 축약·비율 정규화·대체 포커스를 서버에서 일관되게 처리한다. 모든 탭 제거 경로와 필요한 테스트를 검증한다. 전달용 프롬프트는 준비했으며 구현 결과는 아직 확인하지 않았다. — cancelled: 동일 Force stop 서버 보완이 W11에 중복 기록되어 W11로 추적을 통일한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 확정된 것은 전부 owner 문서에 있다. 화면 규칙은 [[docs/specs/aiox-web-ui]], 설정 필드의 검증·저장·HTTP와 keybindings 키 값·wire schema는 [[docs/specs/aiox-configuration-web]], 저장 경계는 그 문서와 [[docs/architecture/aiox-storage-terminal]], agent 상태 값 의미와 terminal 수명은 [[docs/specs/aiox-runtime]], Host 배치 우선순위는 [[docs/specs/aiox-host]]가 소유한다. 이 로그에 규칙을 다시 쓰지 않는다. 규칙이 바뀌면 로그가 아니라 owner 문서를 고친다.
- 소유 경계. 3차(Host 종료·재시작) 반영본 검토는 Stage5 W1이 소유하며 이 로그는 판정하지 않는다. plan의 단계 marker와 Stage 3·Stage 5와의 병렬 조율은 사용자가 소유하므로 이 로그에서 plan을 고치지 않는다. Stage 6 착수 자체가 사용자 권위로 이뤄졌다.
- 프로토타입 `logs/artifact/aiox-version9.html`은 Claude Design 번들이라 코드를 React로 재사용하지 않는다. 확정되는 것은 화면 규칙뿐이고 디버그 패널도 구현에 포함하지 않는다. 프로토타입과 구현의 시각 스타일이 달라지는 것은 사용자가 허용했다. font size·weight·간격이 어긋나도 drift로 보지 않으며, 사용자가 지목하지 않는 한 프로토타입과 대조하지 않는다. 다만 그 패널이 재현한 상태 집합은 fixture·mock으로 다시 만들어 검증해야 한다. `agentViewSchema.status` 다섯 값(`aiox-preparing`·`idle`·`working`·`awaiting-user`·`failed`), 판정 불가 터미널, daemon 연결 끊김의 헤더 경고, `config.json` 외부 변경의 화면 열 때 배너와 저장 시점 충돌 dialog, 섹션 빈 화면 두 층, 드롭 존 두께, 테마 전환, status bar 기본 열림, 알림 추가에 따른 dropdown 표시와 읽음 처리다. 이 목록은 검증 후보이며 확정된 test 계획이 아니다.
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

- 컴포넌트 순서. AppHeader(전체 배치) → WorkspaceTitle(이름과 종류별 맥락, 맥락부터 줄이는 폭 기반 단일 규칙) → HeaderActions(검색·벨·설정·테마) → ThemeToggle → ConnectionWarning. 모바일 헤더에서는 검색을 포함한 HeaderActions를 숨기고 드로어 브랜드 줄에는 알림·설정·테마만 둔다. 벨 dropdown은 W7이며 사이드바 하단 Settings 행은 두지 않는다.
- 재개 출발점은 `apps/web/src/app/app-shell.tsx`의 기존 헤더다. 토글·현재 패널/섹션 제목·설정 링크를 재사용하고, 종류별 맥락·폭 기반 축약·검색·알림·앱 테마 전환·연결 경고를 이어서 구현한다. Storybook의 테마 전환 설정은 앱의 테마 기능 완료가 아니다.
- 사용자가 구조를 확인하고 layout만 승인했다. 헤더/드로어 배치·간격·폭·축약 className은 적용하되 font size·색·장식은 추가하지 않는다. 기존 shared/ui 우선, 없는 primitive는 shadcn 공식 제공 여부부터 확인한다. 테마는 shadcn Vite ThemeProvider/useTheme를 유지하되 메뉴 없이 아이콘 클릭으로 Light/Dark를 전환한다. 초기 system 감지는 provider가 맡으며 W3에는 메모리 상태만 둔다.
- 헤더 위젯은 `apps/web/src/widgets/header/`가 소유한다. `AppHeader`·`WorkspaceTitle`·`ConnectionWarning`과 `HeaderActions`를 한 폴더에 두며 `widgets/sidebar`와 대칭이다. `app/`에는 shell과 provider만 남는다. `shared/ui`의 `command`·`dialog`·`input-group`·`textarea`·`dropdown-menu`와 `cmdk` 의존성은 지금 소비자가 없지만 사용자 지시로 남긴다. W6 팔레트가 쓸 것이므로 미사용 코드로 보고 지우지 않는다.

### {W4}

- 구조·상태·포커스·삭제 규칙은 W4 workspace 구조·레이아웃 확정 블록과 후속 entry가 갖는다. WorkspacePage → WorkspaceView의 재귀 PaneTree·Tabs·탭바 액션·notice/terminal/empty·TerminalStatusBar·페이지 단일 종료 dialog를 fixture로 구현하고 스타일까지 적용했다. 사용자 확인으로 마감했고 화면 규칙은 [[docs/specs/aiox-web-ui]]에 반영했다. 실제 terminal/API 연결은 W10이다.
- 재개 출발점은 `apps/web/src/pages/workspace/workspace-page.tsx`다. section과 panelId 검증, NotFound, 패널 종류별 빈 화면과 비활성 새 터미널 버튼이 있다. pane·탭·layout·xterm 연결은 남은 작업이며 기존 `attach.ts`를 연결한다.
- 후속 사용자 결정: 포커스 opacity는 탭 버튼과 선택 탭 본문에 함께 적용한다(활성 1, 나머지 0.55). 본문 클릭·키보드 포커스 진입은 해당 pane의 선택 탭을 활성화한다. 이전 탭 버튼만 opacity·본문 클릭 무반응 결정을 대체한다. 상태 바·pane 테두리와 빈 pane은 변경하지 않는다.

### {W4,W5}

- 터미널과 드래그: attach.ts는 현재 호출마다 xterm/WS를 생성하고 close에서 dispose한다. terminalId별 수명 보존은 연결 단계에서 구현해야 할 요구이며, pane 이동이 detach 후 re-attach를 뜻한다고 전제하지 않는다. DOM 노드를 옮기면 세션을 살린 채 자리만 바꿀 수 있으므로 보존 방식은 W5 설계에서 정한다. 확정된 UI 규칙은 하나로, 사용자가 시작하지 않은 재부착에는 reconnecting 카드를 띄우지 않는다. W4 구조·레이아웃 범위에서는 실제 attach를 호출하지 않았다. W5는 pointer 기반 DnD와 실제 브라우저 좌표 검증을 사용한다. 최신 layout children/tabIds 순서를 사용하고 포커스된 탭의 이동은 포커스를 따라가게 한다.
### {W9,W11}

- 키 선정에서 탈락한 것과 미실측 범위. macOS 실측에서 떨어진 자리는 `⌘⇧N` 시크릿 창, `⌘⇧W` 창 닫기, `⌘⇧K` 사용자 Notion 전역 단축키, `⌘⇧Y`, 순차 탭 전환 후보 `⌘⌥좌우`·`⌘⇧대괄호`·`Ctrl+Tab`, `⌘Delete` 계열이며 미도달 원인에서 브라우저 점유와 실측 페이지 매칭 실패를 구분하지 않았다. `⌘T`는 실제 Chrome에서 새 탭이 열리고 페이지에 로그가 남지 않아 제외했다. 통과했으나 쓰지 않는 여유 후보는 `⌘⇧E`·`F`·`G`·`U`·`V`·`A`와 `⌘⌥I`·`U`·`C`다. 탭 전환은 3차 실측에서 `⌘1`~`⌘9`가 모두 통과했고 `⌘⇧1`~`⌘⇧9`는 `⌘⇧3`~`⌘⇧6`이 화면 캡처로 작동해 OS 층에서 막혔다. 이 탈락은 브라우저 예약이나 사용자 앱 전역과 달리 모든 macOS에 공통이라 사용자가 시스템 설정을 바꾸지 않는 한 닫히지 않는다. macOS는 이것으로 닫혔고 남은 미실측은 Windows/Linux뿐이라 W11 범위와 일치한다.
- 예약키 충돌은 agent가 닫을 수 없다. CDP 주입 경로(Playwright, 브라우저 확장)가 브라우저 프로세스 accelerator를 관측하지 못해 검사에 쓸 수 없다. OS 입력 경로를 쓰는 데스크톱 자동화는 원리상 가능하나 현재 환경에서 브라우저가 read tier라 키 입력이 차단된다. 사용자 직접 조작으로만 닫힌다.

### {W10}

- 정합 순서와 소유 경계. Stage5에 요청했던 zod 스키마·타입은 main merge로 이미 들어왔다. `packages/protocol`과 `apps/daemon` 전체는 Stage5 단독 수정이고 `apps/web` 전체와 [[docs/specs/aiox-web-ui]]는 이 로그가 소유한다. 공동인 [[docs/specs/aiox-configuration-web]]은 Stage5가 API·DTO 절, Stage6이 keybindings·저장 경계 절이다. 서버 계약의 owner는 실행 가능한 zod인 `packages/protocol`과 그 문서의 `Panel 조회·변경 HTTP와 React DTO`·`상태 전달·terminal 연결과 mock 전환` 절이다. worktree 시절의 인계문 `apps/web/Spec.md`는 두 owner를 중복 서술해 2026-09-23에 삭제했다. 계약이 어긋나 보이면 로그나 별도 문서를 만들지 말고 차이를 근거와 함께 보고한다. 운영 Web 내부 구조는 아직 owner 문서가 없으므로 이 단계에서 [[docs/architecture/aiox-system]]에 반영한다.
- 카드 입력은 DTO 하나로 오지 않는다. `panelViewSchema`(`packages/protocol/src/host.ts`)는 id·kind·section·name·hostId·networkId·revision·layout·activePaneId·tabs만 갖고 agent가 없다. agent는 `webSnapshotSchema`가 panels·terminals·agents·operations·notifications를 나란한 top-level 배열로 보내는 설계라 join을 Web이 한다. fixture의 `terminalCount`는 tabs의 terminalId 비어있지 않은 개수이고 `panelSummary`가 쓰는 workPath·memberCount·routeCount는 host·network view에서 온다. 즉 카드 하나가 PanelView와 AgentView 목록과 Network·HostView를 합성해야 하고 그 합성은 아직 어디에도 없다. 필요한 필드 자체는 서버가 이미 보낸다. `agentViewSchema`(`core.ts:174`)에 `executionOwnership`·`networkId`·`hostId`·`terminalId`가 있고 [[docs/specs/aiox-web-ui]]가 external의 카드 배치 규칙을 명시한다. networkId가 있을 때만 NETWORKS에 올리고, hostId·terminalId가 항상 null이라 HOSTS와 WORKSPACES 역검색에는 걸리지 않으며, 둘 다 null이면 어느 카드에도 올리지 않는다. 앞서 이 항목에 적었던 "`agentViewSchema`에 대응 필드가 없다"는 틀렸다. 남은 미결은 spec이 "소속 agent와 standalone을 나눠 센다"만 쓰고 standalone 판정식을 주지 않는 것 하나다. repo 전체에서 standalone은 Host에 속하지 않은 독립 실행을 뜻하므로 `hostId === null`로 읽는 것이 자연스럽지만 짐작해서 넣지 말고 이 단계에서 확인하고 정한다. 서버에 `standalone` boolean을 요청하지 않는다. `hostId`에서 파생되므로 `PanelPreview.context`와 같은 중복이 된다.
- standalone 판정은 `hostId === null && networkId === null`이다. 사용자가 지적해 정정한다. 앞서 이 항목에 적었던 `hostId === null` 단독 판정과 "HOSTS·WORKSPACES에서 split이 degenerate하다"는 분석은 둘 다 틀렸다. 근거는 카드의 agent 집합이 membership 조회 하나가 아니라 membership과 pane shell terminal 역검색의 합집합이라는 것이다. `aiox agent run claude`를 panel의 pane shell에서 치면 [[docs/specs/aiox-runtime]] 표대로 daemon 소유로 그 Web terminal에서 돌고, `bootstrap.ts:548`이 `terminalContextFromEnv(process.env)`의 유무로 external을 가르므로 `terminalId`가 그 pane에 붙는다. `agentRunSchema.network`(`core.ts:75`)는 optional이고 host 지정 인자는 없으므로 이 agent는 `networkId`·`hostId`가 모두 null이다. 따라서 NETWORKS·HOSTS 카드 모두 소속과 standalone이 실제로 섞인다. WORKSPACES만 `panelViewSchema.superRefine`이 workspace panel의 hostId·networkId를 모두 null로 강제해 소속 집합이 공집합이고 전부 standalone이다. 이것은 spec 결함이 아니라 결과다. 또 external ⊂ standalone이라던 기록도 뒤집힌다. `runtimes.ts:130-136`이 external의 terminalId·hostId를 금지하므로 카드에 뜨는 external은 networkId로만 올라오고, networkId가 있으면 standalone이 아니라 소속이다. spec 78행의 "둘 다 null인 external은 어느 카드에도 표시하지 않는다"가 나머지를 배제한다.
- NETWORKS 카드의 멤버 수도 DTO 하나로 오지 않는다. `networkViewSchema`(`core.ts:134`)는 id·name·scope·routes뿐이고 members가 없다. members를 가진 것은 `hostNetworkViewSchema`(`host.ts:168`, `scope: "host"`)이며 `webNetworkSchema`는 둘의 union이다. 따라서 host scope network는 `members.length`를 그대로 쓰고 persistent network는 agents에서 networkId 매칭으로 세야 한다. 두 경로가 같은 수를 뜻하는지 확인하고 정한다.

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

## 2026-09-23 · W2 마감 판정과 사이드바 상한 확정

사용자가 직접 W2 잔여 항목을 처리하고 화면에서 검증했다. 우클릭 메뉴는 `ContextMenuTrigger`에
`onContextMenu` preventDefault를 붙여 CLI 생성 panel에서 브라우저 기본 메뉴를 막았다. Base UI
1.8.0은 `disabled`만으로는 이것이 되지 않는다. `ContextMenuTrigger.js`의 `handleContextMenu`가
`disabled`일 때 `stopEvent`(preventDefault) 전에 return하기 때문이다. fixture의 network·host panel
주석을 풀어 카드의 agent 상태 점과 CLI panel 빈 화면이 실제로 렌더된다.

사이드바 너비 상한을 사용자 확정으로 바꿨다. 이전 규칙은 최대 400px이었고 현재 구현은
`app-shell.tsx`의 `clamp(180px, width, 90vw)`와 `sidebar-resize-handle.tsx`의 `Math.max(180, next)`라
상한이 뷰포트 폭의 90%다. 사용자가 실제 화면에서 조작해 이 동작을 의도로 확정했으므로 구현을
spec에 맞추지 않고 spec을 갱신했다. `docs/specs/aiox-web-ui.md`의 표시·크기 동작과
`docs/specs/aiox-configuration-web.md`의 저장 서술·검증 표 세 자리를 함께 고쳤고 `180~400` 표기는
repo에 남지 않는다. Stage5 경계는 건드리지 않았다. `packages/protocol/src/configuration.ts`의
`web.sidebar.width` 검증이 원래 범위가 아니라 양의 유한수만 보기 때문이다. 상한은 화면 규칙이고
저장 계약이 아니다.

`sidebar-resize-handle.test.tsx`는 사용자 판단으로 삭제했다. 그 파일의 한 케이스가 400px 초과
허용을 단정하고 있어 새 상한과 맞지 않았다. 드래그 resize에 자동 검증은 남지 않으며 사용자
실측으로 대체한다.

카드가 섹션별 문법 차이를 `kind === "workspace" ? terminalCount : context` 한 줄로 뭉개는 것은
fixture 단계에 한해 사용자가 허용했다. `aiox-version9.html`과 달라진 font size·weight도 사용자
변경이므로 프로토타입과 재대조하지 않는다.

## 2026-09-23 · W3 헤더 구조와 shadcn 테마 — 사용자 확인 대기

기존 AppShell의 SidebarTrigger·제목·Settings Link를 AppHeader로 옮겨 확장했다. 첫 구현에서 직접 button/input과 로컬 테마 토글, 레이아웃 className을 추가했으나 사용자가 shared/ui 우선·shadcn 테마·구조 확인 후 className 적용을 명시해 수정했다.

현재 composition은 App의 ThemeProvider → RouterProvider → AppShell이며, AppHeader(header) 아래 첫 div에 SidebarTrigger(button), WorkspaceTitle(div > span + span), HeaderActions(div)를 두고 두 번째 자리에 ConnectionWarning(Alert div > AlertDescription div)을 둔다. HeaderActions는 기존 Input·Button, 공식 shadcn Badge·DropdownMenu와 ThemeToggle을 사용한다. Settings는 Button render Link로 anchor 하나이며 중첩 button/link가 아니다. 드로어 브랜드 줄의 기존 li에 같은 HeaderActions의 drawer 구성을 사용한다. W3 composition에 신규 className은 없고 기존 shared/ui 및 공식 설치본 기본 스타일은 유지한다.

테마는 공식 https://ui.shadcn.com/docs/dark-mode/vite 의 ThemeProvider/useTheme 구조와 Light·Dark·System 메뉴다. 원본의 localStorage는 저장 금지와 W3 화면 범위에 맞춰 제외했다. state는 App의 provider 한 곳이며 system 모드 OS 변경을 구독하고 html light/dark 클래스로 전달한다. HTML 고정 dark는 제거했다. 메뉴 열림·키보드는 shadcn Base UI primitive가 소유한다. 선택은 화면 이동 없이 적용하고 드로어를 닫는 콜백을 부르지 않는다.

판단: 카드 context 문자열은 유지하고 PanelPreview의 host workPath·network memberCount를 종류별 필수 필드로 분리했다. fixture와 해당 host story를 맞췄다. 알림 미확인 수와 연결 여부는 AppShell props와 기존 fixtures.ts 기본값으로 전달한다. agent 대기 수에서 알림 수를 계산하지 않는다. 검색과 벨은 disabled 자리이며 W6/W7 콜백을 만들지 않았다. 연결 경고는 header 안 두 번째 줄에서 끊김일 때만 렌더한다. 폭 축약은 스타일 단계에서 CSS로 맥락부터 줄이고 이름을 마지막에 truncate하는 방안을 제안하며 아직 적용·실측하지 않았다. 767/768 보정은 하지 않는다.

검증: pnpm format 및 format:check, web typecheck, 루트 lint, web build 통과. web Vitest 7 files / 38 tests 통과(헤더 Network 맥락·끊김 배지·테마 메뉴 Light/Dark 포함). 초기 sandbox listen EPERM은 승인된 실행으로 해소됐다. react-doctor changed 77점, 기존 router root error boundary 누락과 component 파일 non-component export 경고가 남았다. 점수 비교 baseline은 확보하지 않아 회귀 여부를 단정하지 않는다. 빌드 500KB chunk 경고 및 story의 빈 leaf/hydration 경고가 있다. 좁은 드로어 상호작용·폭 축약 실측은 아직 하지 않았다.

다음: composition·상태·props/콜백 경계·이벤트와 위 네 판단을 사용자에게 보고하고 구조 확인을 받는다. 승인 전 스타일을 진행하지 않는다. 검색 W6, 벨 dropdown W7, 파일 저장 W8, 햄버거 점/Esc 순서 W9, 실제 daemon W10 범위를 유지한다.

## 2026-09-23 · W3 검색 진입 구조 정정과 shadcn Command 설치

사용자가 검색에 shadcn Command를 쓰는 방향을 제시했다. 공식 Base Command 문서와 레지스트리를 확인하고 command를 설치했다. 의존 파일 dialog·input-group·textarea와 cmdk가 함께 추가됐으며 기존 button·input은 덮어쓰지 않았다.

헤더의 disabled Input을 기존 shared/ui Button으로 정정했다. 넓은 폭은 Search 아이콘과 텍스트, 좁은 폭은 아이콘만이며 새 className은 없다. 이후 흐름은 헤더 검색 Button → CommandDialog → CommandInput·CommandList다. 이번에는 설치와 진입부 구조까지만이며 open state, 검색 결과, 단축키, 선택 이동은 기존 W6 범위로 유지한다. W3 구조 확인 대기도 유지한다.

## 2026-09-23 · W3 AppHeader app 배치와 클릭 테마 전환

사용자 지시에 따라 AppHeader를 apps/web/src/app/app-header.tsx로 이동하고 AppShell import를 갱신했다. HeaderActions는 sidebar도 소비하므로 widgets/header에 유지했다. ThemeToggle은 기존 shared/ui Button(button) 하나와 아이콘으로 바꿨으며 dropdown 없이 click/Enter/Space로 현재 적용된 테마의 반대 Light/Dark를 선택한다. state와 setTheme는 기존 shadcn 기반 ThemeProvider/useTheme가 소유한다. 별도 props나 메뉴 state는 없다.

확인 사실: index.css에는 :root Light 변수, .dark 변수, class 기반 dark variant가 있고 prefers-color-scheme 감지는 없다. 따라서 초기 system 및 OS 변경 감지는 provider에 유지했다. system에서 첫 클릭은 matchMedia로 현재 값을 확인해 반대로 선택하고 이후에는 명시적 Light/Dark로 토글한다. 저장과 신규 className은 추가하지 않았다.

테스트 최초 실패는 Storybook 전역 dark decorator와 provider 초기 system의 충돌이었다. 헤더 story의 decorator와 provider 초기값을 Light로 맞춰 양방향 클릭과 메뉴 부재를 검증했다. web typecheck·lint·format 통과, 7 files/38 tests 통과. react-doctor changed 78점(직전 77점), 기존 root route error boundary와 shared/ui Button export 진단은 유지한다. 구조 보고·확인 대기 상태이며 스타일 및 폭 축약 실측은 미수행이다.

## 2026-09-23 · W3 layout만 적용 및 폭 실측

사용자가 구조를 확인하고 font size를 제외한 layout 적용을 승인했다. AppHeader 첫 줄은 높이 40px flex, 토글·제목·우측 액션 순서다. 제목 컨테이너 min-w-0/flex-1, 이름 shrink-0/max-w-full/truncate, 맥락 min-w-0/truncate로 맥락부터 줄인다. 액션은 shrink-0, 검색 160px(좁은 폭 아이콘), 나머지는 shared Button icon 크기이며 배지는 벨 우측 상단에 배치했다. 드로어 브랜드 줄은 items-center로 정렬했다. 폰트·색·border·장식은 추가하지 않았고 shared/ui 기본 스타일을 유지했다.

검증: format·format:check·web typecheck·루트 lint 통과. agent-browser 격리 세션에서 768px 헤더 실제 폭 528px, 이름 95.125px 유지, 맥락 104.875px(원문 116px) 축약을 확인했다. 767px에서는 맥락 116.4375px로 전체 표시됐다. 경계 보정은 없다. 375px에서 긴 이름을 DOM에 임시 대입해 이름 폭 283px/내용 759px, 맥락 폭 0, 페이지 overflow 없음 확인했다. 280px 드로어 스크린샷에서 브랜드 반대편 세 아이콘 정렬을 확인했고 테마 클릭 뒤 drawerOpen=true였다. 스크린샷은 /tmp/w3-header-768.png, /tmp/w3-drawer-375.png다. 임시 DOM 변경은 저장하지 않았다.

다음은 layout 사용자 확인이며 W3 전체 완료로 처리하지 않았다.

## 2026-09-23 · W3 모바일 검색 숨김

사용자가 모바일 검색 진입부도 숨기도록 결정했다. HeaderActions의 header 배치는 isMobile일 때 null을 반환하며 빈 액션 영역도 남기지 않는다. desktop 검색 버튼과 drawer의 알림·설정·테마는 유지한다. aiox-web-ui의 좁은 폭 헤더 규칙과 W3 Required Context를 함께 갱신했다. 이전 모바일 검색 아이콘 기록은 이 결정으로 대체한다.

### 2026-09-23 14:29 · AppHeader를 widgets/header로 되돌림

사용자가 배치 선택을 위임해 `apps/web/src/app/app-header.tsx`를 `widgets/header/app-header.tsx`로
옮겼다. 앞선 `W3 AppHeader app 배치` 기록의 결정을 대체한다. 근거는 `HeaderActions`가 이미
`widgets/header`에 있어 헤더 하나가 두 레이어에 쪼개져 있었다는 것이다. `AppSidebar`도 사용처가
`AppShell` 하나뿐이지만 `widgets/sidebar`에 있으므로 "한 곳에서만 쓴다"는 두 배치를 가르지
못한다. `app/`에는 shell과 provider만 남긴다. `app-shell.tsx`의 import를 `@/widgets/header/app-header`
로 바꾸고 위젯 내부는 형제 상대경로로 정리했다. lint·format·tsc·vitest 38개 모두 통과한다.

### 2026-09-23 14:34 · 카드 설명을 타입 필드에서 파생

`PanelPreview.context`를 지우고 카드와 헤더가 `workPath`·`memberCount`·`routeCount`·`terminalCount`
에서 문구를 만들게 했다. host는 `workPath`와 `context`가 같은 값을 두 벌 들고 있었고 network는
`memberCount`와 `"1 member · No routes"`가 겹쳐 한쪽만 고치면 조용히 어긋나는 상태였다. 파생은
`model.ts`의 `panelSummary`(카드)와 `panelContext`(헤더) 둘이 소유한다. 같은 함수로 합치지 않은
이유는 [[docs/specs/aiox-web-ui]]가 network 카드에는 route 요약을 요구하고 헤더 맥락 표에는
멤버 수만 두기 때문이다. route 요약은 `routeCount`로 두었다. protocol의 `networkViewSchema.routes`가
배열이라 개수로 환원되고, 문자열로 두면 방금 지운 중복이 되돌아온다. 화면 출력은 개수 1의
단복수 외에는 이전과 같다. `model.test.ts`가 두 함수의 분기를 덮는다.

### 2026-09-23 14:43 · W3 스타일 단계 생략과 헤더 높이

사용자가 W3에서 별도 스타일 단계를 두지 않기로 했다. 적용한 것은 헤더 줄 높이 `h-10` →
`h-15`(60px) 하나이며, 세로 가운데 정렬은 이미 `items-center`로 성립해 있어 추가 변경이 없다.
font size·색·장식은 계속 미적용이다. [[docs/specs/aiox-web-ui]]에 헤더 높이 규칙이 없어
spec 반영 대상이 아니다. lint·format·tsc·vitest 40개 통과한다.

## 2026-09-23 · W3 마감과 W4 착수

헤더 바를 닫았다. 구조·layout·테마 전환·연결 경고·모바일 축약이 사용자 확인을 통과했고, 스타일
단계는 헤더 높이 60px 하나로 갈음했다. 프로토타입과의 시각 차이는 사용자가 허용했으므로
[[logs/artifact/aiox-version9]] 대조는 하지 않는다. 이 허용은 W3에 국한되지 않아 {Global}의
프로토타입 항목에 기록했다. W2의 사이드바 font size·weight 차이도 같은 근거로 닫힌다.

W3에서 남기고 가는 것 둘. `shared/ui`의 `command`·`dialog`·`input-group`·`textarea`·
`dropdown-menu`와 `cmdk`는 소비자가 없지만 W6 팔레트가 쓸 것이라 사용자 지시로 남긴다.
`sidebar-resize-handle.test.tsx`는 사용자가 삭제해 드래그 resize에 자동 검증이 없다.

W4를 연다. 출발점은 `apps/web/src/pages/workspace/workspace-page.tsx`이고 {W4}의 컴포넌트
순서와 {W4,W5}의 터미널·드래그 제약을 따른다. UI를 fixture로 먼저 세우고 확인을 받은 뒤
무엇을 붙일지 논의한다.

### 2026-09-23 15:10 · 카드 agent 합성은 서버 필드 부족이 아니다 — 앞선 기록 정정

W4 착수 전 protocol을 다시 읽어 {W10}의 기록 하나를 정정했다. "소속·standalone 구분은
`agentViewSchema`에 대응 필드가 없다"고 적었는데 틀렸다. `core.ts:174`의 `agentViewSchema`는
`executionOwnership`(`daemon`|`external`)·`networkId`·`hostId`·`terminalId`를 모두 보낸다.
[[docs/specs/aiox-web-ui]]도 external의 카드 배치 규칙을 이미 명시하고 있다. networkId가
있을 때만 NETWORKS에 올리고, hostId·terminalId가 항상 null이라 HOSTS와 WORKSPACES 역검색에는
걸리지 않으며, 둘 다 null이면 어느 카드에도 올리지 않는다.

따라서 daemon에 요청할 schema 변경은 없다. `webSnapshotSchema`가 panels·terminals·agents를
나란한 top-level 배열로 보내는 설계라 join은 원래 Web 몫이고, `panelViewSchema`에 agent가
없는 것은 결함이 아니라 그 설계의 결과다. 서버에 `standalone` boolean을 요청하지도 않는다.
`hostId`에서 파생되므로 방금 지운 `PanelPreview.context`와 같은 중복이 된다.

남는 미결은 하나다. spec이 "소속 agent와 standalone을 나눠 센다"만 쓰고 standalone 판정식을
주지 않는다. repo의 다른 용례([[docs/specs/aiox-configuration-web]] "Host, standalone에
적용한다", [[docs/decisions/external-execution-survival]] "외부 standalone Agent")는
standalone을 Host에 속하지 않은 독립 실행으로 쓰므로 `hostId === null`로 읽는 것이
자연스럽다. 확정은 W10에 남긴다. W4는 표시용 타입 단계라 이 판정 없이 진행한다.

## 2026-09-23 · W4 workspace 구조·레이아웃 확정

사용자와 W4 최종안을 논의하고 구조·레이아웃 구현을 승인받았다. 폰트·색·opacity·장식 CSS는 추가하지 않는다. shared/ui의 의미에 맞는 컴포넌트를 우선 재사용하고, 없으면 shadcn 제공 여부를 확인한다. 최초 테스트·story 금지 지시는 후속 메시지로 변경되어 필요한 테스트와 story를 작성한다.

- 구조: WorkspacePage → 재귀 PaneTree(split은 Resizable, pane은 TabBar·PaneAddMenu·StatusBarToggle·본문·TerminalStatusBar), 페이지에 종료 확인 dialog 하나. [+]는 New shell / Split right / Split down이며 빈 root pane에서도 유지한다.
- 포커스: pane 테두리와 본문·상태 바는 포커스 때문에 바꾸지 않는다. 스타일 단계에서 포커스된 탭 버튼만 opacity 1, 나머지는 낮춘다. activePaneId + 해당 pane의 selectedTabId로 표현한다. 선택은 두 값을 한 번에 변경한다. pane 빈 영역 클릭은 변경하지 않는다. 실제 터미널 입력 포커스와 선택 동기화는 attach 연결 시 확인한다.
- 제거: 최신 tabIds/layout children 순서에서 제거 전에 대체 대상을 고른다. 포커스 탭을 제거하면 같은 pane의 다음 탭, 없으면 이전 탭; pane이 비면 다음 pane, 없으면 이전 pane의 선택 탭. 전체가 비면 빈 root pane 하나. 비포커스 탭 제거는 기존 포커스 유지. 빈 pane 정리·형제 비율 정규화·단일 자식 split 축약은 실제 서버 제거 작업과 함께 처리해야 한다. W4는 fixture 동작이며 서버 반영은 미완료다. W5 이동은 최신 트리 순서를 사용하며 포커스된 탭을 따라간다.
- 본문: notice → terminalId → empty. preparing+notice는 version9처럼 준비 안내만, 명령·Copy 없음; preparing+notice 없음은 기존 terminal 표시. 다른 notice는 안내·이유·명령·Copy. CopyCommand는 기존 구현과 완료 피드백 유지.
- 다른 Work Item에 담당이 없던 상태 바·접기·긴 이유 펼침·연결 끊김·Reconnect·복원 실패의 ID/이유·Reconnect screen·Force stop 확인은 W4 UI에 포함한다. 탭 DnD는 W5, 실제 daemon 통합은 W10.
- 데이터: PanelPreview에 Pick<PanelView, "layout" | "activePaneId" | "tabs">를 합성한다. presentation 7값은 agent activity 5값과 별개다. activity/reason은 AgentView, cwd는 TerminalView, 연결 상태는 attach에서 연결해야 한다. branch는 현재 확인한 DTO에 없다.
- version9 검증: 브라우저에서 pane 전체 opacity 1/0.55와 본문 클릭 포커스를 확인했다. 이는 이번 탭 버튼만 opacity 결정과 의도적으로 다르다. 새 pane을 만들고 마지막 탭을 닫으면 남은 pane 모두 흐려지는 prototype 동작은 채택하지 않는다.
- 정정: attach.ts는 현재 호출마다 xterm/WS를 생성하고 close에서 dispose한다. terminalId별 보존은 현재 기능이 아니라 연결 단계의 구현 요구다. Dialog 확인 대상은 local state, Operation 결과는 연결 단계 공용 상태다.

다음: 기존 Resizable과 shared/ui를 재사용해 구조·레이아웃을 구현하고, 상태별 story 및 제거·선택의 의미 있는 테스트로 검증한다. 시각 스타일과 실제 daemon/WS 연결은 아직 착수하지 않는다.

### 2026-09-23 16:23 · 구조·레이아웃 구현과 검증

W4 구조·레이아웃을 fixture 상태로 구현했다. WorkspacePage는 route 검증 후 WorkspaceView를 렌더한다. 재귀 Resizable, pane별 Tabs·추가 메뉴·본문·상태 바·접기/이유 펼치기, 연결 실패/복원 실패/재연결/강제 종료 확인을 기존 shared/ui로 조립했다. Tabs는 shared/ui에 없어 shadcn Base UI Tabs 문서(https://ui.shadcn.com/docs/components/base/tabs)를 확인하고 설치된 Base UI를 사용하는 스타일 없는 shared/ui 래퍼를 추가했다. 기존 Resizable과 package/lock 변경은 작업 시작 전에 존재했으며 재설치하지 않았다.

PanelPreview에 protocol PanelView의 layout·activePaneId·tabs를 Pick으로 합성했다. 기존 생성 경로·fixture·타입을 소비하는 story/test에 빈 layout을 공급했다. workspace-fixtures.ts는 presentation 7값, preparing의 두 본문, agent 상태 5값과 연결 상태를 제공한다. 서버 접속 없이 로컬 fixture 선택·추가·분할·종료·재연결만 동작한다. workspace-preview.ts의 빈 pane 정리는 UI 검증용이며 daemon 동작을 구현했다고 보지 않는다.

폰트·색·opacity·장식 CSS는 추가하지 않았다. 기존 shared/ui 기본 스타일은 재사용한다. 포커스는 data-focused로만 표현해 스타일 적용을 보류했다. CopyCommand는 변경하지 않았고 preparing notice에서는 렌더하지 않는다. 탭 선택은 activePaneId와 selectedTabId를 함께 갱신하며, 빈 pane 클릭 handler는 없다. 실제 xterm/WS·HTTP·Operation·W5 DnD·branch 데이터 연결은 미구현이다.

검증: Web 전체 Vitest 10파일/54테스트(story 포함) 통과. W4 전용은 순서 기반 선택·제거·split 축약·빈 root 4테스트와 8 story이다. Web typecheck·build, 루트 lint·format:check, git diff --check 통과. agent-browser로 /workspaces/main을 기본 폭과 390px에서 확인해 분할 영역·높이와 가로 넘침을 점검했다. react-doctor changed 검사에는 기존 router의 error boundary, theme provider context value, button/badge export 진단 4건이 남았고 점수 API는 연결되지 않았다. 이번 범위에서 기존 진단을 수정하지 않았다.

다음: 사용자가 W4 구조·레이아웃을 확인한다. 승인 전 스타일은 추가하지 않는다. 확인 뒤 실제 attach/API/Operation 연결 시점과 범위를 논의한다. W4는 전체 완료로 닫지 않는다.

### 2026-09-23 16:29 · W4 퍼블리싱 적용

사용자가 구조·레이아웃 단계 다음으로 퍼블리싱을 지시했다. 이전 font/color/opacity 보류를 이번 W4 시각 스타일 범위에서 해제했다. 구조와 fixture 동작을 유지하고 workspace-view.tsx에 탭바·상태 점·본문·notice·상태 바·복구 안내·확인 dialog의 간격·타이포·색·축약·스크롤을 적용했다. shared/ui의 Button variant/size·Alert·Collapsible·CopyCommand·Resizable을 재사용하고 추가 의존성은 넣지 않았다.

탭 버튼에만 data-focused 기준 opacity 1/0.55를 적용했다. pane 활성 테두리나 포커스에 따른 본문·상태 바 흐림은 없다. 접속 끊김은 별도 connection 상태에 한해 본문 opacity 0.4와 복구 overlay로 나타낸다. [+]와 상태 바 토글은 고정 아이콘 버튼, 탭 목록은 가로 스크롤이다. 상태 점은 기존 카드의 activity 색 계열에 맞춰 idle 녹색·working 파랑·awaiting-user 황색·preparing 보라·실패 destructive로 표시한다. notice의 preparing Copy 숨김과 기존 CopyCommand 완료 피드백은 그대로다.

검증: W4 4개 로직 테스트와 8개 browser story(총 12개) 통과. Web typecheck·build, lint·format:check·diff check 통과. React Doctor 변경 컴포넌트 진단 없음(점수 API 연결 불가). agent-browser로 1280×800의 밝은/어두운 테마와 390×844 폭을 확인했다. 계산 스타일로 포커스 탭 1/다른 탭 0.55, 모든 pane·정상 terminal 본문 1을 확인했다. 좁은 화면 document 폭 390px로 페이지 가로 넘침이 없다.

다음: 사용자가 W4 퍼블리싱 화면을 확인한다. 실제 daemon·xterm/WS·Operation 연결, branch 데이터는 미연결이다. W5 탭 이동은 이번 작업에 포함하지 않았다.

### 2026-09-23 16:40 · 터미널 본문 포커스와 opacity 범위 변경

사용자 후속 지시로 탭 버튼에만 적용하던 포커스 opacity를 선택 탭의 본문 영역에도 적용한다. 포커스된 탭 버튼·본문은 1, 다른 탭 버튼·본문은 0.55이다. 상태 바와 pane 테두리는 그대로다. 기존 연결 실패 전용 흐림·복구 안내는 유지한다.

터미널 본문 pointer down 또는 키보드 포커스 진입 시 해당 pane의 현재 선택 탭으로 onSelect를 호출해 activePaneId와 selectedTabId를 함께 갱신한다. 빈 pane에는 활성화 handler를 추가하지 않는다. 이전의 본문 클릭 비활성·탭 버튼만 opacity 결정을 이번 지시로 대체한다. 기존 Presentations story에 본문 선택 시 탭 포커스 및 양쪽 본문 opacity 검증을 추가했다.

### 2026-09-23 16:42 · 본문 포커스 검증 결과

기존 browser story 8개와 typecheck·format:check 통과. 본문 클릭 후 탭 data-focused와 양쪽 본문의 data-active 전환을 검증했다. Storybook 테스트에서는 computed opacity가 1로 관측되어 CSS 수치 검증은 제외했고 활성 상태 전이만 검증했다. 실제 화면의 opacity 시각 확인은 별도다.

### 2026-09-23 16:51 · 상태 안내·복구 카드 개선과 명령어 줄바꿈

사용자 요청으로 stopped/start-failed/crashed/unavailable/preparing notice를 shared/ui Empty의 아이콘·제목·설명·재시작 명령으로 정리했다. 연결 복구는 shared/ui Card의 header/content/footer로 분리해 기존 Alert의 아이콘 2열 grid에 버튼이 들어가던 정렬 문제를 제거했다. Reconnecting은 Reconnect 버튼을 없애고 Force stop만 표시한다. Disconnected·Screen lost는 Reconnect와 Force stop을 제공한다. 모든 Force stop은 기존 확인 dialog와 fixture 닫기 흐름에 연결한다. 서버 API 가능 여부와 실제 처리는 사용자 UI 확인 이후 조사한다.

후속 스크린샷에서 명령어 잘림을 확인해 공용 CopyCommand의 truncate를 제거하고 공백 기준 줄바꿈 및 긴 토큰 줄바꿈을 허용했다. 복사 버튼은 우상단에 유지하고 복사·Copied 피드백 로직은 변경하지 않았다. 소비자는 workspace와 section 안내다.

검증: workspace/section browser story 15개, typecheck·lint·format:check·build 통과. 변경 WorkspaceView React Doctor 진단 없음. 브라우저에서 Reconnecting 카드의 정렬과 Force stop, 390px 분할 화면의 명령어 전체 줄바꿈을 확인했다. 서버는 변경하지 않았다. 다음은 사용자 UI 확인 후 새 Force stop 버튼의 API 전달·서버 처리 가능 여부 추적이다.

### 2026-09-23 16:52 · 재시작 안내 정렬과 가용 폭 확대

사용자 피드백에 따라 Run in your terminal to start again 문구를 중앙 정렬했다. TabNotice 명령어 영역의 max-w-sm 제한을 max-w-none으로 해제하고 바깥 여백을 p-6에서 p-4로 줄여 pane 가용 폭을 사용한다. 명령어 자체는 왼쪽 정렬과 줄바꿈을 유지한다. format:check와 diff check 통과.

### 2026-09-23 16:52 · 명령 길이에 맞춘 복사 영역 폭

사용자 피드백: 전체 폭을 채우면서 명령과 복사 버튼 사이가 너무 벌어진다. TabNotice의 CopyCommand에 w-fit max-w-full self-center를 적용한다. 짧은 명령은 내용 너비로 중앙 배치하고 긴 명령은 pane 가용 폭 안에서 줄바꿈한다. 이전 max-w-sm 제한은 되살리지 않는다.

### 2026-09-23 16:55 · Force stop 서버 경로 조사

사용자 UI 확인 뒤 Force stop의 서버 지원 여부를 조사했다. 기존 DELETE /api/panels/:panelId/tabs/:tabId는 requestId/revision/expectedRuntimeId/confirm을 받아 202 Operation을 저장한 다음 stopTerminal을 호출하고 탭을 제거한다. admission·실행 직전 revision/runtime 충돌을 검증하며 실행 실패는 Operation failed/error/cleanupErrors로 남긴다. GET /api/operations/:id와 webEvents로 결과 관측 가능하다. 기존 panel-operations.test.ts 통합 테스트 1개를 실행해 shell 종료·탭 제거·Operation 성공을 확인했다. 세 브라우저 연결 상태 각각의 실연결 end-to-end 검증은 아직 하지 않았다.

별도 기존 DELETE /api/terminals/:terminalId도 존재한다. stopTerminal을 직접 기다려 200 deleted를 반환하며 removeTerminal로 연결 탭을 제거할 수 있지만 panel revision/expectedRuntimeId/Operation 계약이 없다. 현재 Close and stop UI 연결에는 guarded panel tab close API를 권장한다. 새 force endpoint나 force 필드는 필요 없다. stopTerminal은 연결 Runtime 정리 후 terminal.kill을 호출한다. PTY 종료는 Unix에서 SIGTERM 후 2초 대기, SIGKILL 후 2초 대기, 사망 확인 실패 시 throw다. Windows는 node-pty hard kill이다.

Disconnected/Reconnecting/Screen lost는 브라우저 터미널 연결·복원 상태로 종료 API의 입력 조건이 아니다. HTTP로 daemon에 접근 가능하면 동일 API 사용 가능하다는 코드 기반 판단이다. daemon 자체에 접근 불가하면 클릭만으로 종료 보장은 없다. Web은 아직 fixture closePreviewTab이고 PanelPreview에 revision이 없으므로 최신 PanelView와 API/Operation 결과 연결이 필요하다. 실패 시 탭을 선제 제거하지 말고 오류를 표시해야 한다. 빈 pane 제거·비율 정규화·activePaneId 대체는 서버 removePanelTabs/removeTerminal에 미구현이라 기존 합의와 차이가 남는다. 이번 조사에서는 production 코드를 수정하지 않았다.

### 2026-09-23 16:59 · Force stop 남은 작업의 명시적 추적

사용자 요청에 따라 Force stop을 완료된 조사와 남은 구현으로 나누어 기록한다. 기존 종료 API 지원 조사와 서버 에이전트 전달용 프롬프트 작성은 완료했다. 서버 작업이 실제 수행·완료되었다는 근거는 없다. 서버 탭 제거·빈 pane·포커스 정리 및 종료 계약 검증은 W11로 추가하고, Web의 API/Operation 연결은 기존 통합 작업 W10에 구체화했다. W4는 fixture UI 상태이며 xterm attach와 실제 상태 연결은 아직 미구현이다. W5 DnD, W6 팔레트, W7 알림, W8 설정, W9 단축키·횡단 규칙, W10 daemon 통합도 남아 있다.

### 2026-09-23 17:05 · 탭 overflow와 Scroll Area 검토

서버 보완 결과는 사용자가 알려주기로 했다. 현재 우선 작업은 탭 추가 시 폭 밖으로 가려지는 문제다. 현재 TabsList는 overflow-x-auto/scrollbar-none이지만 addShell은 선택 상태만 변경하고 새 탭 가시성 확보를 하지 않는다. shared/ui에 ScrollArea는 없다. 공식 shadcn Base Scroll Area와 Base UI의 Gradient scroll fade 예제를 확인했다. 제안은 ScrollArea viewport에 좌우 overflow CSS 변수로 mask를 적용하고 scrollbar는 렌더하지 않는 것, 추가·선택된 탭을 가까운 가시 위치로 스크롤하는 것, +와 상태 바 토글을 viewport 밖에 고정하는 것이다. 마스킹만으로 새 탭이 보이는 문제는 해결되지 않는다. 이번 턴은 구조·interaction 제안이며 코드 변경은 아직 하지 않았다.

### 2026-09-23 17:11 · 탭 Scroll Area·직접 분할 버튼과 서버 보고 수신

사용자가 승인한 탭 overflow 개선을 반영했다. 설치된 Base UI ScrollArea를 shared/ui에서 재사용하고 scrollbar는 렌더하지 않는다. viewport의 overflow-x-start/end CSS 변수로 양끝 16px 이내 mask를 적용한다. 선택 탭 변경 시 탭과 닫기 버튼이 보이도록 해당 viewport만 최소 스크롤한다. [+] 메뉴는 New shell·Split right·Split down 고정 아이콘 버튼으로 대체했다. 기존 Tooltip을 사용해 각 아이콘과 Status bar에 hover/focus 설명을 표시한다.

실제 Storybook 브라우저의 420px 탭바에서 새 탭 추가 후 scrollLeft 1072, viewport 293px와 좌측 16px/우측 0px mask를 확인했다. 테스트 환경에서는 CSS 기반 너비가 실제 브라우저와 달라 geometry 단언을 제외하고 추가·Home/End 선택·툴팁 동작을 story에서 검증한다.

사용자가 서버 에이전트 완료 보고를 전달했다: 기존 DELETE API 재사용, 공통 제거 경로의 빈 pane·split·포커스 정리, 원자 저장, 관련 147테스트 및 build/type/lint/format 통과. 이는 전달받은 결과이며 이 턴에서 코드를 독립 검증한 것은 아니다. 서버 에이전트가 문서의 빈 pane·분할 유지 설명은 수정하지 않았다고 밝혔으므로 문서 정합성 확인도 남긴다. API 연결 전에 W11 구현·계약과 문서 보완 여부를 대조한다.

### 2026-09-23 17:12 · 탭바 검증 마무리

최종 workspace story 9개(추가·직접 분할·Home/End 선택 포함), typecheck·lint·format:check·build 통과. React Doctor 변경 2파일 진단 없음. 마스킹·자동 스크롤·Status bar hover 툴팁은 실제 agent-browser 화면에서 확인했다. 테스트 환경에서는 툴팁 hover가 재현되지 않아 해당 단언은 제외했다. 앞 기록의 story 툴팁 검증 예정은 실제 브라우저 확인으로 대체한다. 서버 보완은 사용자 전달 결과를 기록했으며 이 턴에 Web API 연결을 시작하지 않았다.

### 2026-09-23 17:16 · 탭바 액션 구분

사용자 승인으로 상태 바 버튼 앞에 기존 shared/ui Separator를 vertical로 추가했다. 분할 버튼은 PanelRightOpen/PanelBottomOpen 아이콘으로 방향을 구별한다. 기존 툴팁과 상태 바 켜짐 배경은 유지하며 좌우 스크롤 버튼은 추가하지 않는다. 탭 이동은 기존 Shift+휠·트랙패드·키보드와 선택 자동 스크롤을 유지한다.

### 2026-09-23 17:18 · 최초 여섯 의견과 잔여 작업 대조

사용자 요청으로 최초 여섯 의견을 현재 코드와 대조했다. (1) notice→terminalId→empty와 preparing Copy 제외는 반영. 빈 workspace는 안내와 추가/분할 버튼, host/network 빈 화면은 command가 있으면 Copy 유지. (2) 본문은 여전히 static pre fixture이며 attach.ts는 호출마다 Terminal/WS를 생성·close에서 dispose한다. 인스턴스 유지·실제 접속 상태 연결은 남음. (3) 확인 대상 local state 반영, 실제 409/API/Operation 공용 상태 연결은 남음. (4) 선택 시 activePaneId/selectedTabId 로컬 동시 변경, 본문 pointer/focus 활성화, 탭/본문 1·0.55와 별도 닫기 버튼 반영. 실제 단일 layout PUT과 DOM 입력 포커스 동기화는 통합 때 검증. (5) orientation·percent defaultSize·onLayoutChanged·재귀 nextLayout은 반영. 서버 저장과 실제 PTY resize 통합은 미연결. (6) 이번 직접 코드 확인에서 removePanelTabs가 layout/activePaneId를 함께 받아 빈 pane·split·비율·대체 포커스·빈 root를 정리하며 persistence.removeTerminal이 transaction 내 저장하는 것을 확인했다. 최초 서버가 병합 안 한다는 설명은 현재 코드 기준으로 더 이상 맞지 않는다. 서버 보고의 147개 테스트는 이 턴에 재실행하지 않았고 문서 정합성·Web 통합 검증은 남아 있다.

탭바 ScrollArea/마스킹/자동 스크롤, 직접 추가·분할 버튼, 상태 바 Tooltip/Separator 및 상태 안내 UI는 반영된 fixture 범위다. W11과 중복된 W12 서버 보완 항목은 W11로 추적을 통일한다.

### 2026-09-23 17:42 · W4 코드 리뷰·리팩토링과 spec 정합

사용자 지시로 코덱스와 사용자가 확정한 W4 코드를 리뷰하고 구현과 어긋난 spec을 고쳤다. opacity는 사용자 결정이므로 구현을 유지하고 spec을 바꿨다.

리팩토링 다섯. (1) `closePreviewTab`이 오늘 Stage5가 커밋한 `removePanelTabs`(`cdd78b4`)와 같은 prune·비율 정규화·대체 포커스를 다시 구현하고 있어 위임으로 바꿨다. 132행에서 92행. 지역 구현은 닫은 탭과 무관한 빈 pane까지 지웠고 서버 쪽은 가드로 막으므로 서버 규칙으로 통일된다. (2) 중첩 `ResizablePanel`의 DOM id가 중복이었다. 라이브러리가 `id`를 실제 DOM 속성으로 렌더하는데 패널 id를 부분 트리의 첫 pane id로 잡아 바깥 그룹의 자식과 안쪽 그룹의 자식이 같은 값을 썼다. depth 접미사로 유일화하고 React key는 내용 기반으로 분리했다. story 단언을 되돌려 panel 4개에 고유 id 3개로 실패하는 것을 실측했다. (3) `CloseAndSplit`의 `queryByRole("separator")`가 resize 핸들이 아니라 탭바 장식 Separator를 잡아 테스트 1건이 실패 중이었다. 장식에 `aria-hidden`, 핸들에 `aria-label`을 줘 접근성 의미와 단언 대상을 함께 맞췄다. (4) `copy-command`의 `whitespace-pre-wrap`과 `truncate`가 같은 `white-space`를 두고 충돌해 한쪽이 죽어 있었다. 줄바꿈이 의도이므로 `truncate`를 뺐다. (5) `StatusDot`의 `string`을 `AgentView["status"]`와 `TabView["presentation"]` union으로 좁혔다.

[[docs/specs/aiox-web-ui]] 다섯 곳을 구현에 맞췄다. 헤더 높이 40px 이하를 60px로(다이어그램 주석과 본문 둘 다), pane `[+]` 드롭다운을 탭바 버튼 셋으로, 분할 핸들을 hover 시 노출에서 상시 노출로, 활성 pane 강조를 테두리에서 opacity로, 그리고 `상태 표시`를 `탭의 상태 점`과 `pane 상태 표시줄` 두 하위 절로 나눠 표시줄 계약을 신설했다. 표시줄에 새로 쓴 것은 필드 순서, 기본 펼침과 탭 없을 때 토글 비활성, 작업 디렉터리를 두는 이유와 축약, 이유 펼치기가 탭 이동으로 풀리는 것, terminal 연결 경고가 헤더의 daemon 경고와 다르다는 구분이다.

정정. 재연결 카드가 어느 spec에도 없다고 보고했던 것은 틀렸다. [[docs/specs/aiox-configuration-web]] 290-293행이 확인한 원인 표시, 화면 다시 연결과 강제 종료의 분리, 재연결 중 사유·진행 유지, 강제 종료의 기존 종료 경로 호출을 이미 소유한다. `aiox-web-ui`와 Host panel 절만 보고 살아 있는 서버로 자동 복귀 절을 빠뜨린 탓이다. 상태 표시줄에서 실제로 신규였던 것은 작업 디렉터리 노출과 접기 정책 둘뿐이고 status·이유·연결 경고는 기존 계약의 표현이었다.

코덱스가 넣은 `unrestorable` 연결 상태를 확인했다. 재연결 버튼 비활성, 종료 후 새로 열기 안내, 실행 생존을 보장하지 않는다는 문구가 같은 문서 296-298행을 충족하고 story가 `toBeDisabled()`로 검증한다. fixture 어휘도 `attach.ts:145`의 restorable 분기와 맞아 `screen-lost`(복원 가능)와 `unrestorable`(복원 불가)이 갈린다.

검증은 `pnpm check` exit 0, `apps/web` 56개 포함 repo 전체 통과, `check-markdown-inline-code` 통과다. 서버는 건드리지 않았다.

### 2026-09-23 17:48 · terminal attach 수명·접속 상태 연결 범위 확정

W4가 남겨 둔 "terminal attach 수명·접속 상태 연결 범위 정리"를 닫는다. 사용자가 매핑을 제시하고 코덱스 검토를 거쳤으며 아래는 `apps/web/src/attach.ts`에 직접 대조해 확인한 결과다.

실제 `AttachmentState` 넷과 화면 처리. `connected`(`:244` restore 완료, 입력 허용·resize·포커스 복귀)는 복구 안내를 지우고 터미널을 보여 준다. `failed`(`fail()` `:139` 또는 socket close `:287`)는 `disconnected` 안내와 실패 이유를 보여 준다. `unrestorable`(`fail(msg, false)`, 서버 `error`의 `restorable: false`가 명시된 경우만 `:265-267`)은 복원 불가 안내와 재연결 비활성이다. `exited`(`:259` 서버 `exit` 메시지)는 정상 종료 흐름이며 연결 실패로 표시하지 않는다. `reconnecting`은 attach에 없는 UI 전용 상태다. attach에 재연결 개념이 없고 재연결은 `attachTerminal()` 재호출이므로 UI가 낙관적으로 갖고 실제 attach 결과로 전환한다.

UI 어휘로 `failed` 대신 `disconnected`를 쓴다. `agentViewSchema.status`에 이미 `failed`가 있어 연결 어휘로 쓰면 agent 상태와 충돌하기 때문이다. fixture의 `connection` 값은 그대로 둔다.

붙일 때 지킬 세 가지. 첫째, `exited`에서 UI가 `presentation`을 바꾸지 않는다. attach는 입력 차단과 종료 출력까지만 하고 `:255-258`이 xterm 버퍼에 종료 배너를 이미 쓴다. 탭의 `presentation`·`notice`·제거는 서버 권위이며 다음 서버 상태 갱신(SSE 또는 재조회)을 기다린다. [[docs/specs/aiox-configuration-web]] 148행의 "실제 Agent 종료 확인 후"와 154행의 "실패하면 이유와 대상 유지"가 근거다. 둘째, 실패 이유는 `onState`의 text를 그대로 표시한다. `:288`의 close 핸들러가 1013일 때 서버 `event.reason`을 싣고 기본 문구가 출력 처리 지연 안내이므로, 일반 연결 끊김과 같은 문서 313행의 1013 계약을 한 원인으로 뭉개지 않는다. 현재 fixture의 `reason` 자리에 연결하며 실제 연결이 구현됐다는 뜻은 아니다. 셋째, `reconnecting`은 사용자가 재연결을 시작한 경우에만 들어간다.

세 번째와 관련해 코덱스 지적으로 정정한다. 앞서 "W5에서 pane 이동은 detach 후 re-attach"라고 적을 뻔했으나 이를 최종 설계로 확정하지 않는다. `{W4,W5}`에 이미 terminalId별 수명 보존이 요구로 기록돼 있고, DOM 노드를 옮기면 xterm과 WS를 살린 채 자리만 바꿀 수 있으므로 이동이 재생성을 뜻한다고 전제하면 안 된다. 확정되는 것은 UI 규칙 하나, 즉 사용자가 시작하지 않은 재부착에는 `reconnecting` 카드를 띄우지 않는다는 것뿐이다. 이동 시 인스턴스를 실제로 어떻게 보존할지는 W5 설계에서 정한다.

## 2026-09-23 · W4 마감과 W5 착수

사용자가 퍼블리싱 화면을 직접 확인하고 통과시켜 W4를 닫는다. W4는 fixture UI, 코드 리뷰·리팩토링, [[docs/specs/aiox-web-ui]] 정합, terminal attach 수명·접속 상태 연결 범위 확정까지 마쳤다. 세부는 앞 블록의 entry들이 갖는다.

W5로 넘어간다. 탭 드래그와 드롭으로 같은 탭바 순서 변경, 다른 pane 이동, 가장자리 분할, 중앙 합치기 네 결과를 구분한다. 선결 조건은 없다. 필요한 구조는 W4가 만든 `WorkspaceView`의 재귀 `PaneTree`와 `workspace-preview.ts`의 layout 전이에 있고, 드래그 대상인 탭바는 이미 `ScrollArea`와 자동 스크롤을 갖췄다.

W5에서 먼저 정할 것 둘. 하나는 pane 이동 시 terminal 인스턴스를 어떻게 보존하느냐다. `attach.ts`의 현재 `close()`가 xterm과 WS를 폐기하므로 DOM 노드를 옮겨 세션을 살리는 방식을 설계해야 하며, 이동이 재생성을 뜻한다고 전제하지 않는다. 다른 하나는 드롭 존 두께로 [[docs/specs/aiox-web-ui]] 192행이 pane의 20%를 초안으로 두고 구현 후 조정하라고 열어 뒀다. 실제 좌표 판정은 이 단계에서 처음 들어오는 Playwright로 검증한다.

실제 daemon 연결, API·Operation 전달, PTY resize 통합은 W5가 아니라 W10이다. 서버 보완 대조는 W11이다.
