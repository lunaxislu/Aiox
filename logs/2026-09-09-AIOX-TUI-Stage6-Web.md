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
- [x] W5 탭 DnD fixture UI 구현 및 사용자 PASS 완료. 순서 변경·pane 이동·가장자리 분할·중앙 합치기, 삽입선·오버레이·취소를 반영했다. Workspace 소유 TerminalSurface와 pane 표시 자리 분리까지 구조 구현·14개 자동 테스트를 마쳤다. 실제 layout PUT·xterm/WS 연결과 이동·숨김 수명 검증은 W10이다. 사용자 지시로 Playwright는 실행하지 않았다.
- [-] W6 커맨드 팔레트. shadcn Command로 검색창을 열어 workspace·터미널·agent와 명령을 두 섹션으로 나눠 필터링하고 위아래 화살표·Enter·Esc를 붙인다. 확인 뒤 선택 결과를 해당 workspace·pane·탭으로 점프시키는 store 경로에 잇는다. 점프 대상이 모두 존재해야 하므로 workspace 화면 뒤에 둔다. — cancelled: 커맨드 팔레트 보류. 명령 여섯이 모두 기존 진입점과 중복이며 넷은 전용 키까지 있다. spec은 Open/deferred로 남기고 헤더 검색 버튼 주석·cmdk 유지
- [x] W7 알림 fixture UI 구현과 사용자 시각 확인 PASS 완료. 고정 제목·Clear all, ScrollArea 목록·구분선·최신순·상대 시각, runtime 대상 이동과 NotFound를 반영했다. 실제 SSE·확인 API 및 삭제 후 최신 대상 탐색은 W10에서 연결·검증한다.
- [ ] W8 [보류 · W10 뒤로] 설정 화면. 섹션 목록과 필드, 키 재지정 UI, Save 바와 변경 카운트, theme 미리보기, Discard dialog를 fixture로 렌더해 확인받는다. 좁은 폭은 섹션 목록을 상단 가로 탭으로 바꾸고 필드를 1열로 쌓되 Save 바와 dialog 기본 포커스 규칙은 그대로다. 확인 뒤 config revision 비교로 외부 변경 배너와 저장 충돌 dialog를 잇고 사이드바 너비 드래그를 저장 절차 없이 바로 쓰는 경로에 연결한다. 현재 /settings는 router.tsx의 제목만 있는 stub이며 보류 동안 그대로 둔다.
- [ ] W9 [보류 · W10 뒤로] 화면 조작 keybindings와 남은 횡단 규칙. 확정된 11행 표를 전역 핸들러로 붙이고 config의 변경분과 합친다. 사용자 변경분이 config에 저장되므로 W8 없이는 닫히지 않아 W8과 함께 보류한다. openPalette 행은 팔레트 보류로 더 뒤다. 컴포넌트 하나로 끝나지 않아 남은 반응형 규칙도 여기서 닫는다. 화면을 이동시키는 동작이 드로어를 닫고 테마 토글처럼 이동이 아닌 동작은 유지하는 규칙이 남는다. 햄버거 미확인 점과 드로어 위 알림 dropdown Esc·backdrop 순서는 알림을 헤더 고정으로 바꿔 규칙 자체가 없어졌다.
- [>] W10 제품 화면·명령·알림과 운영 터미널 WS·xterm 연결 및 검증을 완료했다. 다음은 Settings·Keybinding 연결과 남은 통합 검증 범위를 확정한다. 이번 터미널 단계만 완료이며 W10 전체는 진행 중이다. next: 「2026-09-25 · W10 운영 터미널 WS·xterm 연결」.
- [x] W11 서버 제거·빈 pane/split 정리와 원자 저장 검토를 완료했다. W17에서 선택을 클라이언트 전용으로 분리하고 owner 정합과 직접 회귀 검증을 완료했다. 실제 Web RPC·PTY 통합 검증은 W10이 소유한다.
- [-] W12 Force stop 서버 보완(서버 에이전트 전달 대상). 기존 panel tab close API를 재사용해 실제 종료·실패·재시도 계약을 확인하고 탭 제거와 빈 pane 축약·비율 정규화·대체 포커스를 서버에서 일관되게 처리한다. 모든 탭 제거 경로와 필요한 테스트를 검증한다. 전달용 프롬프트는 준비했으며 구현 결과는 아직 확인하지 않았다. — cancelled: 동일 Force stop 서버 보완이 W11에 중복 기록되어 W11로 추적을 통일한다.

- [x] W13 W10 지원 조사와 테스트 도구 업그레이드. Effect v4 SQL·Drizzle·Workflow·RPC·Automerge·Schema를 조사하고 루트 Vitest5.0.1을 적용했다. 상세 근거·미검증 범위는 [조사 보고서](artifact/2026-09-25-Effect-v4-Ecosystem-Research.md), 실행 결과는 「2026-09-25 · W13 Effect v4 조사와 테스트 도구 전환 완료」를 따른다. 서버 v4 마이그레이션·Web WS 연결 구현은 포함하지 않는다.

- [x] W14 서버 마이그레이션 추가 라이브러리 조사. 사용자 요청대로 ponytail 스킬을 사용하지 않도록 지시한 서브에이전트 3명이 상태/DB·프로세스/adapter·검증/관측을 조사했다. Drizzle RC5 격리 검증까지 완료했다. [추가 조사 보고서](artifact/2026-09-25-Server-Migration-Library-Research.md)를 적용 판단의 근거로 사용하며 모든 후보의 채택 확정으로 소비하지 않는다.
- [x] W15 Effect v4 서버 마이그레이션을 구현·검증하고 공개 계약을 W10에 반환했다. 결과: `logs/2026-09-25-Effect-Server-Migration.md` (decided), `docs/specs/aiox-application-rpc.md`.
- [x] W16 서버 마이그레이션 리뷰 결함 3건(Codex stderr 수명, Claude retirement 실패 처리, 알림 읽음 RPC 취소)을 재현·수정·검증한다.
- [x] W17 pane·탭 선택을 React 메모리 전용으로 분리하고 서버 select 명령·선택 DTO/DB 필드·서버 선택 테스트 제거, 검증·리뷰와 owner/artifact 정합을 기록한다.

## Required Context

### 2026-09-25 · W10 라이브러리 채택 결정

- 사용자가 XState 5, Drizzle의 Effect SQLite 통합, chokidar 5, fast-check 4의 채택에 동의했다. 아래 W14의 후보 상태보다 이 결정을 우선한다. 설치·제품 마이그레이션 완료를 뜻하지 않는다.
- XState는 daemon의 상태 전이 규칙을 담당하고 Effect는 실제 실행·대기·취소·재시도를 담당하는 방향이다. ExecutionOwner의 프로세스 단일 소유와 종료 확인·정리 실패 추적을 보존한다.
- Drizzle 통합의 근거는 W14의 RC5 격리 실행 보고이며 제품 schema·transaction 전체 검증은 남아 있다. chokidar는 파일 변경 관측을 담당하고 JSONL 파싱·읽기 위치·저장 확정은 adapter 책임이다. fast-check는 조작·재전송·시간 경과 조합과 실패 축소에 사용한다.
- TanStack DB에 대해 사용자는 서버 DB와 클라이언트 메모리 DB 동기화 역할로 이해한다고 말했다. 책임 경계는 daemon이 commit된 변경·현재 snapshot을 전달하고 React 앱의 sync 연결 코드가 TanStack DB 컬렉션에 반영하는 것이다. SQLite 자동 감지나 서버 명령 실행을 위임하는 뜻이 아니다. 기존 TanStack Query와 서버 상태 소유를 중복시키지 않도록 적용 범위를 정해야 하며, 이 발언만으로 Query 전면 제거까지 확정하지 않는다.

### 2026-09-25 · 최신 지원 조사: W14

- 대규모 전환 전에 Effect 외 라이브러리를 조사했다. 제품 설치·코드 변경은 없고 /tmp의 Drizzle RC5 검증만 수행했다. Drizzle1.0.0-rc.5-5935859 + Effect/SQLite RC117은 Node24.14.0에서 query·rollback·commit·재오픈 통과. 앞선 RC4 import 실패와 구분한다.
- 우선 검토 후보는 Drizzle Effect backend·chokidar5·fast-check4, 기존 Playwright 활용 확대다. XState5·OpenTelemetry·TanStack DB는 책임과 검증 조건을 정한 뒤 비교할 후보이다. 근거·정확 버전·미검증 범위는 [W14 보고서](artifact/2026-09-25-Server-Migration-Library-Research.md)가 소유한다.
- Effect Node spawner의 finalizer에 종료 실패를 ignore하는 경로가 확인됐다. ExecutionOwner/cleanup의 실제 종료 확인과 실패 진단 책임을 일반 Scope 종료로 대체하지 않는다. diagnostics Pino allowlist가 trace 식별자를 제거하므로 OTEL 도입 시 단순 패키지 설치만으로 correlation이 보존되지 않는다.

### 2026-09-25 · W10 지원 조사: Effect v4·WS·DB·Workflow·Schema

- 사용자 요청으로 서브에이전트 3명이 v4 DB 통합, Workflow·관련 기능, Automerge·Schema를 조사했고, 주 에이전트가 테스트 도구 업그레이드를 수행했다. 완료한 지원 작업은 루트 Vitest 5.0.1 전환과 호환성 조사이다. W10 실제 Web 연결이나 서버 v4 마이그레이션 완료를 뜻하지 않는다.
- 최신 근거와 다음 적용 판단은 [Effect v4 생태계 조사](artifact/2026-09-25-Effect-v4-Ecosystem-Research.md)를 먼저 읽는다. 이전 v3·HTTP/SSE 구현 설명을 새 아키텍처 확정으로 소비하지 않는다. 앱용 WS와 Effect 서버 전환은 현재 논의 방향이며 이번 작업에서 제품 서버를 바꾸지는 않았다.
- MCP SDK의 Zod는 사용자 지시대로 유지한다. 자체 Effect Schema는 성능을 비교해 경계별로 판단한다. 합성 DTO 측정에서는 현행 Zod가 더 빨랐으므로 Effect Schema 전면 전환을 성능 개선으로 기록하지 않는다.
- Effect SQL RC117의 실제 파일 DB commit·rollback·재오픈은 서브에이전트가 Node24.14.0에서 통과시켰다. Drizzle1.0.0-rc.4의 Effect backend는 import 실패했다. Workflow는 Host restart 후보이며 프로세스 복구·완료 기록 정리는 미검증이다.
- 테스트 도구: 서버·공통 패키지 Vitest5.0.1, Storybook peer 범위 때문에 Web4.1.6 유지. tinybench6.1.4의 DOM 전용 반환 타입 한 줄을 number로 패치했다. lint·format·build·typecheck 통과, sandbox PTY 제한 후 정상 권한 `pnpm test`에서 825 passed/1 skipped. Effect v4나 새 SQL·Workflow·Schema 패키지는 프로젝트에 설치하지 않았다.

### Return Target

- None: independent log.

### {Global}

- 확정된 것은 전부 owner 문서에 있다. 화면 규칙은 [[docs/specs/aiox-web-ui]], 설정 필드의 검증·저장·HTTP와 keybindings 키 값·wire schema는 [[docs/specs/aiox-configuration-web]], 저장 경계는 그 문서와 [[docs/architecture/aiox-storage-terminal]], agent 상태 값 의미와 terminal 수명은 [[docs/specs/aiox-runtime]], Host 배치 우선순위는 [[docs/specs/aiox-host]]가 소유한다. 이 로그에 규칙을 다시 쓰지 않는다. 규칙이 바뀌면 로그가 아니라 owner 문서를 고친다.
- 소유 경계. 3차(Host 종료·재시작) 반영본 검토는 Stage5 W1이 소유하며 이 로그는 판정하지 않는다. plan의 단계 marker와 Stage 3·Stage 5와의 병렬 조율은 사용자가 소유하므로 이 로그에서 plan을 고치지 않는다. Stage 6 착수 자체가 사용자 권위로 이뤄졌다.
- 프로토타입 `logs/artifact/aiox-version9.html`은 Claude Design 번들이라 코드를 React로 재사용하지 않는다. 확정되는 것은 화면 규칙뿐이고 디버그 패널도 구현에 포함하지 않는다. 프로토타입과 구현의 시각 스타일이 달라지는 것은 사용자가 허용했다. font size·weight·간격이 어긋나도 drift로 보지 않으며, 사용자가 지목하지 않는 한 프로토타입과 대조하지 않는다. 다만 그 패널이 재현한 상태 집합은 fixture·mock으로 다시 만들어 검증해야 한다. `agentViewSchema.status` 다섯 값(`aiox-preparing`·`idle`·`working`·`awaiting-user`·`failed`), 판정 불가 터미널, daemon 연결 끊김의 헤더 경고, `config.json` 외부 변경의 화면 열 때 배너와 저장 시점 충돌 dialog, 섹션 빈 화면 두 층, 드롭 존 두께, 테마 전환, status bar 기본 열림, 알림 추가에 따른 dropdown 표시와 읽음 처리다. 이 목록은 검증 후보이며 확정된 test 계획이 아니다.
- 실제 구현의 사이드바는 shadcn의 Sidebar를 쓴다. shadcn은 의존성이 아니라 레지스트리에서 소스를 복사해 오는 방식이라 복사본 수정이 유지보수 부담이 되지 않는다. base는 `aria`·`base`·`radix` 셋 중 Base UI(`base`)이며 2026-07부터 shadcn 기본값이다.
- 최소 Web 인계의 attach.ts·xterm/headless restore 경계는 유지한다. 앱의 생성·이동·삭제 명령과 상태 구독은 현재 @aiox/protocol의 ApplicationRpc를 사용한다. 과거 개별 HTTP shell 생성·select API 지시를 재사용하지 않는다. terminal 입출력·크기 변경용 WS는 앱 RPC와 별개다.
- 확정 스택: UI는 shadcn(Base UI base)·Tailwind v4를 유지한다. 서버는 Effect v4 기반 HTTP/RPC 앱 WS로 전환 완료했으며 React의 서버 상태 연결은 TanStack DB를 사용하는 W10 후속 작업이다. Query/Zustand에 같은 서버 상태를 중복 소유하지 않는다. 활성 pane·선택 탭은 각 React 앱의 메모리 상태이고 새로고침 시 초기화한다.
- 모바일 우선으로 만든다. breakpoint는 `768px` 하나이고 Tailwind 기본 클래스가 좁은 폭, `md:`가 768px 이상이다. 각 컴포넌트를 좁은 폭부터 쓰고 넓은 폭을 덧붙이며 반응형을 마지막 작업으로 몰지 않는다. 목적은 폰 전용 화면이 아니라 데스크톱 창 축소 대응이므로 `360px` 미만은 대상이 아니다. 터미널 영역은 창 폭으로 레이아웃을 바꾸지 않고 xterm이 fit·resize만 한다.
- 세로로 썬다. 각 화면 W는 컴포넌트 단위로 UI를 먼저 만들어 사용자 확인을 받는다. 확인을 받은 뒤 그 화면에 무엇을 붙일지 사용자와 논의해서 정하고 붙인다. 각 W에 적힌 것은 후보이지 확정이 아니며 논의 없이 붙이지 않는다. UI가 없으면 store 모양을 짐작하게 되므로 순서를 뒤집지 않는다. 1단계 fixture도 처음부터 계약 모양으로 한 fixture 파일에 두어 컴포넌트에 더미를 박지 않는다. 그래야 다음 단계가 props를 store로 바꾸는 것만 되고 fixture를 다시 만들지 않는다. DTO 스키마는 `@aiox/protocol`에서 바로 import한다. merge로 이미 들어와 있으므로 apps/web에 임시 zod를 만들지 않는다. fixture의 `PanelPreview` 같은 표시용 타입은 DTO 대체가 아니라 UI 단계의 입력 모양이므로 protocol 타입과 별개로 둔다.
- 설치와 기능 연결은 구분한다. 사용자 권한으로 W2에서 설치한 도구는 {W2}의 설치 완료 기록과 `apps/web/package.json`을 확인하고 재설치 작업으로 잡지 않는다. Storybook의 브라우저 테스트 연결은 이미 있으며, 드롭 위치 판정은 W5에서 구현한다. `msw`·`msw-storybook-addon`은 아직 설치되지 않은 후보이고, 도입 시 HTTP·SSE·WS 핸들러 한 세트를 Storybook·vite dev·Vitest·Playwright가 공유한다. story는 필요한 화면·상태를 기존 story에 이어서 작성한다.
- 스택 선택 중 owner 문서에 근거가 없는 셋. 라우터는 계약이 요구하지 않는다. [[docs/specs/aiox-configuration-web]]의 복귀 계약이 복원하라는 것은 Host·Agent·배치·terminal 현재 화면·미확인 알림뿐이고 전부 서버 소유다. 그래도 두는 이유는 브라우저 저장소가 금지라 무엇을 보고 있었는지를 담을 자리가 URL뿐이고, 없으면 알림·팔레트 점프 뒤 뒤로 가기가 앱을 벗어나며, 탭 두 개가 서로 다른 workspace를 볼 수 없기 때문이다. happy-dom은 jsdom보다 빠르다는 것 말고 강한 이유가 없다. xterm은 canvas가 필요하고 `ResizeObserver`는 둘 다 없어 어차피 mock하므로 실질 차이가 속도뿐이며, 막히면 environment 한 줄로 jsdom에 간다. `cn`을 bare specifier로 두면 shadcn 복사본이 upstream과 같아져 갱신 때 import가 안 흔들리지만 CLI가 alias로 재작성하면 그 이점이 사라지므로 W1에서 보고 정한다.
- 작업 트리. Stage 6은 `~/Documents/aiox-stage6`의 별도 worktree에서 시작했고 2026-09-23에 그 브랜치를 main에 합쳐 worktree를 없앴다. 분리의 목적은 Stage 5와의 병렬 작업이었는데 Stage 5가 W1~W10을 끝내고 남은 W11이 Stage 6 화면을 요구해 병렬성이 사라졌기 때문이다. merge로 `packages/protocol`의 `core.ts`·`host.ts`·`configuration.ts`와 Hono·Drizzle·Pino 전환이 들어와 스냅샷 drift가 닫혔다. 충돌은 `pnpm-lock.yaml` 하나였고 main은 `apps/web`을 한 줄도 건드리지 않았다. 따라서 임시 zod 정의도 계약 handoff 메시지 경로도 더 이상 필요 없고 `@aiox/protocol`에서 바로 import한다. 소유 경계만 남는다. `apps/daemon`과 `packages/protocol`은 Stage5 단독 수정이고 `apps/web`은 이 로그가 소유한다. 새로 clone한 트리에서는 루트 `pnpm install` 뒤 `pnpm -r --if-present build`를 먼저 돌린다. `packages/*/dist`가 없으면 `@aiox/terminal/restore`가 풀리지 않아 web 빌드와 타입체크가 실패한다.
- 현재 우선순위(2026-09-25): W10에서 React RPC·TanStack DB·제품 화면 명령/알림과 운영 terminal WS/xterm 연결을 구현·검증했다. 선택은 React 메모리만 소유한다. 다음은 Settings·Keybinding 연결과 남은 통합 검증 범위 확정이며 W10 전체는 진행 중이다. 구현·직접 검증·미검증 범위는 「2026-09-25 · W10 운영 터미널 WS·xterm 연결」을 따른다.

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

- W5 DnD UI는 사용자 PASS로 완료했다. 구현·검증 근거는 「W5 DnD 사용자 PASS와 터미널 표시 수명 구조」 블록이다. 사용자가 Playwright 테스트를 제외했으므로 이전 도입·검증 계획을 따르지 않는다. terminal 표시 소유는 Workspace의 TerminalSurface, 배치는 PaneTree의 등록된 표시 자리다. 고정 portal 컨테이너 자체를 이동하며 pane 이동 시 fixture DOM/컴포넌트 유지, 숨김 시 제거를 자동 검증했다. 실제 attach는 아직 호출하지 않으며 xterm/WS 수명·재연결 검증은 W10이다.
- 최신 UI 기준은 「W4·W5 탭 활성화 결함 해결과 비활성 opacity 60%」 블록이다. 이전 비활성 0.55와 중간 0.8을 대체해 탭 전체(제목·상태 점·×)와 본문 비활성 0.6, 활성 1로 한다. 선택 탭 배경 강조와 강제 focus 이동은 제거했다. TabsList 버블링 및 본문/Portal 진입으로 pane 활성화를 처리하며 관련 Vitest 25개 통과. 드롭 가장자리 20%는 판정 폭, 절반 음영은 50% 분할 결과 미리보기이며 20% 최종 조정은 미확정이다.
- 후속 사용자 확인으로 드롭 존 가장자리 20% 판정과 절반(50%) 분할 결과 미리보기는 현행 유지로 확정했다. 이전 context의 20% 최종 조정 미확정 표기는 「드롭 존 20% 사용자 확인 완료」 entry가 대체한다.
### {W9,W11}

- 키 선정에서 탈락한 것과 미실측 범위. macOS 실측에서 떨어진 자리는 `⌘⇧N` 시크릿 창, `⌘⇧W` 창 닫기, `⌘⇧K` 사용자 Notion 전역 단축키, `⌘⇧Y`, 순차 탭 전환 후보 `⌘⌥좌우`·`⌘⇧대괄호`·`Ctrl+Tab`, `⌘Delete` 계열이며 미도달 원인에서 브라우저 점유와 실측 페이지 매칭 실패를 구분하지 않았다. `⌘T`는 실제 Chrome에서 새 탭이 열리고 페이지에 로그가 남지 않아 제외했다. 통과했으나 쓰지 않는 여유 후보는 `⌘⇧E`·`F`·`G`·`U`·`V`·`A`와 `⌘⌥I`·`U`·`C`다. 탭 전환은 3차 실측에서 `⌘1`~`⌘9`가 모두 통과했고 `⌘⇧1`~`⌘⇧9`는 `⌘⇧3`~`⌘⇧6`이 화면 캡처로 작동해 OS 층에서 막혔다. 이 탈락은 브라우저 예약이나 사용자 앱 전역과 달리 모든 macOS에 공통이라 사용자가 시스템 설정을 바꾸지 않는 한 닫히지 않는다. macOS는 이것으로 닫혔고 남은 미실측은 Windows/Linux뿐이라 W11 범위와 일치한다.
- 예약키 충돌은 agent가 닫을 수 없다. CDP 주입 경로(Playwright, 브라우저 확장)가 브라우저 프로세스 accelerator를 관측하지 못해 검사에 쓸 수 없다. OS 입력 경로를 쓰는 데스크톱 자동화는 원리상 가능하나 현재 환경에서 브라우저가 read tier라 키 입력이 차단된다. 사용자 직접 조작으로만 닫힌다.

### {W10}

- 정합 순서와 소유 경계. W15 서버 마이그레이션 완료 결과는 `logs/2026-09-25-Effect-Server-Migration.md`에서 수용했다. 실행 가능한 Effect Schema·RPC group은 `@aiox/protocol`, 앱 wire/세션/상태 계약은 [[docs/specs/aiox-application-rpc]], panel·terminal 의미는 [[docs/specs/aiox-configuration-web]]가 소유한다. `.parse/.safeParse`는 같은 Effect decoder의 호환 경계다. 예전 Zod·HTTP/SSE 구현 지시는 최신 목표가 아니다. Web UI 계약은 [[docs/specs/aiox-web-ui]], 구조는 [[docs/architecture/aiox-system]]에 반영한다. 중복 인계 spec을 만들지 않는다.
- 서버 PanelView는 pane/tab의 관계·순서·split 배치와 실행 자원을 전달하며 activePaneId·selectedTabId를 포함하지 않는다. Web의 apps/web/src/entities/panel/workspace-layout.ts가 WorkspaceLayout.activePaneId와 pane별 selectedTabId를 정의한다. React 메모리에서만 선택하고 선택 대상 삭제 시 남은 구조에서 선택을 조정한다. 새로고침 시 초기화하며 서버 select 명령·DB 저장·localStorage를 추가하지 않는다. agent/network/host 소속은 각 공개 DTO와 Web UI spec을 따른다.
- standalone 판정은 `hostId === null && networkId === null`이다. 사용자가 지적해 정정한다. 앞서 이 항목에 적었던 `hostId === null` 단독 판정과 "HOSTS·WORKSPACES에서 split이 degenerate하다"는 분석은 둘 다 틀렸다. 근거는 카드의 agent 집합이 membership 조회 하나가 아니라 membership과 pane shell terminal 역검색의 합집합이라는 것이다. `aiox agent run claude`를 panel의 pane shell에서 치면 [[docs/specs/aiox-runtime]] 표대로 daemon 소유로 그 Web terminal에서 돌고, `bootstrap.ts:548`이 `terminalContextFromEnv(process.env)`의 유무로 external을 가르므로 `terminalId`가 그 pane에 붙는다. `agentRunSchema.network`(`core.ts:75`)는 optional이고 host 지정 인자는 없으므로 이 agent는 `networkId`·`hostId`가 모두 null이다. 따라서 NETWORKS·HOSTS 카드 모두 소속과 standalone이 실제로 섞인다. WORKSPACES만 panel layout refinement이 workspace panel의 hostId·networkId를 모두 null로 강제해 소속 집합이 공집합이고 전부 standalone이다. 이것은 spec 결함이 아니라 결과다. 또 external ⊂ standalone이라던 기록도 뒤집힌다. `runtimes.ts:130-136`이 external의 terminalId·hostId를 금지하므로 카드에 뜨는 external은 networkId로만 올라오고, networkId가 있으면 standalone이 아니라 소속이다. spec 78행의 "둘 다 null인 external은 어느 카드에도 표시하지 않는다"가 나머지를 배제한다.
- NETWORKS 카드의 멤버 수도 DTO 하나로 오지 않는다. `networkViewSchema`(`core.ts:134`)는 id·name·scope·routes뿐이고 members가 없다. members를 가진 것은 `hostNetworkViewSchema`(`host.ts:168`, `scope: "host"`)이며 `webNetworkSchema`는 둘의 union이다. 따라서 host scope network는 `members.length`를 그대로 쓰고 persistent network는 agents에서 networkId 매칭으로 세야 한다. 두 경로가 같은 수를 뜻하는지 확인하고 정한다.
- 터미널 수명은 「W5 DnD 사용자 PASS와 터미널 표시 수명 구조」 블록과 terminal-surface.tsx·visibleTerminals를 이어받는다. 최종 배치에서 계속 보이는 terminal은 유지·DOM 이동, 새로 보이면 연결·복원, 숨김/Workspace 이탈이면 브라우저 자원 정리한다. 서버 프로세스는 연결 해제만으로 종료하지 않는다. terminalId뿐 아니라 runtime 변경을 구분하고, 이동 중 Reconnect 상태 유지·늦은 결과 무시·크기/포커스·숨긴 화면 resize 방지를 실제 attach로 검증한다. W12의 동작별 이동·분할·resize 명령과 대상 충돌·실패 복구를 W10에서 연결한다. 전체 layout PUT 및 Web panel revision 일치 검사는 사용하지 않는다.
- RPC 상태 연결 시 같은 panel ID의 최신 snapshot을 WorkspaceView가 직접 소비하도록 fixture용 useState(panel) 복사본을 제거한다. 지금 별도 부모 상태 리팩토링은 하지 않는다. 임시 진단 테스트로 같은 ID의 tabs/layout 갱신 무시와 Reconnect 로컬 override의 새 disconnected 상태 가림을 재현했다. runtime 교체만의 독립 검증은 panel 갱신 반영 후 수행한다. terminalId+runtimeId별 attach 상태와 이전 비동기 결과 정리를 실제 연결 시 검증한다. 근거: 「W10 SSE 연결 시 panel·연결 상태 소유 정리」 블록.
- W7 사용자 PASS 후 남은 연결: RPC 상태 알림 수신과 클릭 ids=[id]/Clear all ids 생략 확인 API 및 실패 처리. WorkspaceView local panel 복사본에서 탭을 삭제해도 AppShell.panels 알림 탐색에는 남는 현상은 기존 RPC 상태 단일화 작업에 포함한다. 실제 최신 상태에서 실행/탭 종료 후 과거 알림 클릭이 NotFound로 이동하고 확인 처리되는지 검증한다. 사용자가 추가한 중복 fixture ID는 W7 차단이 아닌 실험 데이터다.
- 명령과 세션은 [[docs/specs/aiox-application-rpc]]의 실제 RPC 계약을 소비한다. clientSessionId는 `session.open()`으로 서버에서 발급받으며, sequence·requestId·body를 유지한 pending 재전송만 합류한다. 완료 요청은 result_expired, 만료/재시작 세션은 거부되므로 새 ID로 자동 재실행하지 않는다. 명령 commit·shell 준비·cleanup 결과를 구분한다. 원래 `changes[]`와 target DTO를 유지한다.
- 서버 확정 상태·낙관적 명령·로컬 선택의 현재 구현은 docs/architecture/aiox-system.md와 「2026-09-25 · W10 TanStack DB 상태 저장소」를 따른다. ApplicationStore 단일 collection의 resource 행과 pending intent를 구분하며 실제 화면은 아직 fixture다. RPC session·requestId·sequence·재전송은 ApplicationConnection이 소유한다. 화면 연결 시 전체 Query rollback이나 요청 간 의미상 병합을 추가하지 않는다.
- W12·W13 소비 검증: 준비 중 이동/닫기, split ID 유지, 연속 [+] 순서와 PTY 병렬 완료, 응답 유실 재전송, 누락 순번 복구·sequence_gap, RPC 상태 재접속·epoch 변경, shell 생성 실패(start-failed notice)와 cleanup failed 표시를 확인한다. 탭 제거 성공과 프로세스 정리 실패는 별개로 표시한다. HTTP abort는 서버 취소가 아니며 명시적 닫기 명령을 보낸다. shell 입력은 WS attach·복원 이후 허용한다.
- W13의 중간 서버 제한 보고보다 완료된 W15 source·검증을 우선한다. 전체 `pnpm check`는 Node24.14/macOS에서 846개 통과·기존 scale 1개 skip이며 실제 RPC/SQLite/PTY 회귀를 포함한다. Node22.16은 별도 terminal import·SQLite 초기화/rollback/reopen smoke만 수행했다. Windows/Linux 전체 전환·실제 vendor 모델 E2E·성능 개선은 검증하지 않았다.
- Web 의존성 Effect RC117·TanStack DB0.9.2/React DB0.4.1 설치와 W15 당시 Web 원본 불변 검증 뒤, W17에서 사용자 승인한 Web 전용 선택 타입·로컬 상태 연결을 구현했다. Codex 직접 최종 pnpm check는 exit 0, 전체 851 passed/1 skipped, Web 90 passed다. 두 화면의 선택 독립성과 재마운트 초기화를 확인했다. 실제 React RPC client/store/hooks·TanStack DB·실서버 UI 통합은 아직 구현하지 않았다.
- 프론트 후속 구현: 앱용 RPC 명령 결과와 상태 구독을 React 공통 수신 경로에서 연결해 TanStack DB에 반영한다. 명령 결과+확정 변경, 전체 창 방송의 중복 식별, 요청 sequence와 daemon 상태 버전 분리, snapshot 후 delta 경계, 실패/의존 변경만 조정, 확정 반영과 낙관적 해제, 재접속/epoch 변경을 함께 구현한다. 높은 버전만 남겨 서로 다른 부분 변경을 버리지 않는다. 기존 HTTP/RPC 상태/Query 연결 지시를 최신 목표로 소비하지 않는다.
- 프론트 후속 검증: 다른 창의 생성/이동, shell 준비 중 이동/삭제와 늦은 완료, cleanup 실패, 요청 결과/방송 역전·중복·유실, 재접속 snapshot, 알림 최신 대상 탐색을 확인한다. terminal WS와 headless serialize는 앱 snapshot과 별개이며 보이는 pane 이동의 xterm/WS 유지·숨김 시 브라우저 자원 정리·attach 완료 뒤 입력을 보존한다. 이번 서버 작업의 라이브러리 설치만으로 실제 React 통합 PASS를 주장하지 않는다.
- 2026-09-25 저장소 연결 완료: ApplicationProvider가 안정적인 소비자로 ApplicationStore를 설치한다. 공개 hooks는 @/app/application-state의 useApplicationState/useApplicationStore/usePanelCommand/usePanelSelection이며 비 React 테스트는 @/shared/api/application-store의 ApplicationStore를 사용한다. panelCommand의 발급 콜백이 비동기 requestId/sequence를 intent에 연결한다. 전체 구현·검증과 다음 UI 연결 지점은 「2026-09-25 · W10 TanStack DB 상태 저장소」를 따른다. fixture 화면·제품 명령·알림·PTY 통합은 계속 W10에 남으며 Settings·Keybinding은 이후다.
- 제품 조회·panel 명령·알림은 「2026-09-25 · W10 제품 화면 실제 상태·명령·알림 연결」 결과를 소비한다. 운영 경로는 AppShell → WorkspacePage → WorkspaceContent이며 fixture controller는 Storybook 전용이다. 선택은 Provider 한 곳, 읽음은 notifications.read의 필수 ids 배열과 서버 delta, terminal attach는 아직 미연결이라는 경계를 유지한다.

### {W7}

- W7 알림 fixture UI는 사용자 PASS로 완료했다. NotificationMenu와 entities/notification/model이 표시·시각·탐색을 담당하고 AppShell이 fixture 목록·이동을 소유한다. 고정 제목/Clear all·목록 ScrollArea·구분선·light/dark 배지를 반영했다. AgentView.agentId는 runtime record.id이므로 이름 조회에 직접 비교할 수 있고 이동은 tab.runtimeId 탐색 하나다. 최신 완료 근거는 「W7 알림 UI 사용자 PASS와 마감」 블록이며 알림 model+workspace 5 test files/35 tests, typecheck·format 통과. 실제 연결은 W10이다.
- 착수 전 사용자에게 답을 받을 미결 둘. 첫째, originRuntimeId에 맞는 탭이 없을 때의 처리를 [[docs/specs/aiox-web-ui]] 244-255행이 정하지 않는다. runtime이 끝나 탭이 사라진 경우이며 항목을 숨길지, 이동 불가로 표시할지, terminalId로 대체 탐색할지 정해야 한다. 짐작해서 넣지 않는다. 둘째, createdAt이 epoch int라 상대 시각 포맷이 필요하다. Intl.RelativeTimeFormat이 표준이라 의존성은 필요 없고 갱신 주기만 정하면 된다. 진행은 apps/web/AGENTS.md대로 구조 보고 후 멈춤, 승인 뒤 fixture 렌더, 확인 뒤 연결 논의 순서이며 TDD는 하지 않는다.
- 화면 규칙은 [[docs/specs/aiox-web-ui]] 알림 절이 소유하므로 로그에 다시 쓰지 않는다. 구현이 쓸 사실만 둔다. 이동 판정은 탭의 runtimeId와 notification.originRuntimeId 비교 하나이고 agents 조회는 이름 표시용이다. createdAt은 epoch 밀리초이며 Intl.RelativeTimeFormat으로 표시한다. 서버 목록은 미확인만·daemon 소유만·createdAt 오름차순이다. 표시 순서는 미결이다. 읽음 요청은 클릭이 ids 하나, Clear all이 ids 생략이며 endpoint는 packages/protocol/src/core.ts의 notificationsRead다. 실제 HTTP 연결은 W10이 소유하므로 W7은 fixture로 만든다.
- 목록은 표시용 복사본을 정렬해 최신순으로 보인다. 서버가 미는 스냅샷 배열을 그 자리에서 정렬하지 않는다.

### {W16}

- 사용자 리뷰의 Codex stderr 조기 종료·Claude retirement 저장 실패 진단/재시도 누락·notifications.read 취소 후 DB/AppState 불일치 3건을 대상으로 한다. 공개 계약은 docs/specs/aiox-application-rpc.md, adapter 수명은 docs/architecture/aiox-vendor-bindings.md가 소유한다. Web 소스와 사용자 daemon/DB는 변경하지 않는다.

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

## 2026-09-23 · W5 DnD 사용자 PASS와 터미널 표시 수명 구조

사용자가 기존 DnD UI를 직접 확인하고 UX가 괜찮다고 평가했으며, 이번 요청에서 사용자 PASS로 기록하도록 명시했다. W5의 fixture DnD UI는 완료로 처리한다. 실제 서버 저장·terminal 연결 완료를 뜻하지 않는다. 다음 작업 포인터는 W6 커맨드 팔레트다.

DnD는 logs/artifact/aiox-version9.html과 docs/specs/aiox-web-ui.md의 네 결과를 대조하고 @dnd-kit/core 6.3.1·@dnd-kit/sortable 10.0.0을 추가했다. 같은 탭바 순서 변경, 다른 pane 탭바 이동, 가장자리 분할, 중앙 합치기와 삽입선·반투명 오버레이·Escape 취소를 구현했다. 가장자리 판정은 정규화 거리 20%이며 배치는 드롭 시 한 번 변경한다. 이동은 탭/terminal 엔티티를 제거하지 않고 기존 removePanelTabs로 빈 원본 pane·split 정리를 재사용한다. 마지막 전체 탭을 빈 목적지로 이동할 때 목적지를 잃지 않는 경계 사례도 검증했다. 사용자 지시로 Playwright 테스트는 작성·실행하지 않았다. 이전 W5 기록의 Playwright 도입·검증 예정은 이번 지시로 대체한다.

후속 논의에서는 pane 이동과 탭 숨김의 수명을 분리하기로 결정했다. 이동 후에도 어느 pane에서 선택되어 보이는 terminal은 유지한다. 같은 pane에서 다른 탭을 선택해 숨겨지거나 workspace 화면을 이탈하면 브라우저 xterm·WS를 정리하고, 다시 보이면 서버에서 복원하는 것이 W10 연결 정책이다. 브라우저 연결 해제는 서버 프로세스 종료가 아니다. 사용자가 시작한 Reconnect 중 pane을 옮기면 진행 상태와 결과가 새 표시 위치를 따라가야 한다. 숨겼던 탭의 자동 복원은 명시적 Reconnect와 구분한다.

현재 코드에는 구조만 반영했다. workspace-preview.ts의 visibleTerminals가 선택된 탭 중 notice가 없고 terminalId가 있는 본문을 계산한다. WorkspaceView가 terminalId/runtimeId 조합으로 TerminalSurface를 소유하고, PaneTree는 pane별 빈 표시 div를 등록한다. terminal-surface.tsx는 terminal별 고정 DOM 컨테이너를 만들고 React portal의 목적지는 그대로 유지한 채 컨테이너 자체를 새 pane 자리로 이동한다. pane unmount가 곧 terminal 자원 폐기를 뜻하지 않도록 경계를 분리했다. 숨기면 surface가 unmount되고 다시 선택하면 새로 생성된다. portal의 이벤트 경로에 맞춰 본문 pointer/focus 활성화를 Workspace에 연결했다. reducer·새 상태 저장소는 추가하지 않았다. 스타일 변경 없이 높이·최소 크기 등 배치 클래스만 사용했다.

검증: workspace-preview.test.ts, workspace-dnd.test.tsx, terminal-surface.test.tsx의 Vitest/happy-dom 14개 통과. 실제 pointer 드롭 1회 적용·Escape 취소, 네 방향 분할·탭 유실 방지, notice 우선 표시 대상 계산, pane 이동 후 같은 DOM/컴포넌트와 입력값 유지, 숨김·workspace unmount 시 제거를 확인했다. web typecheck·build, root lint, 변경 파일 oxfmt·git diff --check 통과. React Doctor의 새 TerminalSurface 검사에서 이슈 없음; WorkspaceView의 기존 TerminalBody 복잡도 경고는 남는다. build의 큰 chunk 경고도 남는다. DnD 사용자 PASS와 후속 구조의 자동 검증을 구분하며, 구조 변경 후 화면에 대한 별도 사용자 PASS를 받은 것으로 기록하지 않는다.

남은 W10: 실제 attach.ts 연결, 고정 컨테이너 이동 후 xterm·동일 WS 유지와 입출력·resize·포커스 검증, 숨김/이탈 정리 및 재선택 복원, runtime 교체·늦은 재연결 결과 무시, 배치 PUT revision 충돌·실패 처리. 현재 본문은 여전히 fixture pre이며 실제 xterm/WS 보존을 검증한 것은 아니다. 구조·코드 owner는 apps/web/src/pages/workspace이며 실제 연결에 따른 architecture 반영은 기존 W10 범위를 유지한다.

## 2026-09-23 · W10 SSE 연결 시 panel·연결 상태 소유 정리

사용자와 fixture 이후 서버 갱신 경로를 검토하고, 실제 서버 없이 WorkspaceView의 props를 rerender하는 임시 Vitest 진단 테스트 2개로 확인했다. 같은 panel ID에 새 tabs·layout·selectedTabId를 전달해도 useState(panel)의 기존 복사본 때문에 새 탭과 선택이 반영되지 않았다. Reconnect로 로컬 connected override를 만든 뒤 새 disconnected terminal 데이터를 전달하면 출력은 갱신되지만 복구 버튼은 나타나지 않았다. 동일한 새 props로 처음부터 mount하면 두 경우 모두 정상 표시되어, 기존 로컬 상태가 갱신을 가리는 현상임을 확인했다.

검증 한계: runtimeId 변경도 panel props 미반영에 막히므로, runtime 교체만의 문제를 독립적으로 재현한 것은 아니다. 연결 상태 테스트가 직접 확인한 것은 terminalId별 로컬 override가 이후 전달된 연결 상태를 가린다는 점이다. 진단 테스트 2개는 현상 확인 후 제거했고 production 코드는 수정하지 않았다.

결정: fixture용 상태를 지금 별도로 부모로 옮기는 작업은 하지 않는다. W10에서 SSE → 공용 panel 상태 → WorkspaceView 경로를 연결하면서 useState(panel) 복사본을 제거하고 같은 ID의 최신 snapshot이 표시되도록 한다. SSE 수신 자체로 해결되는 것이 아니라 실제 소비 경로에서 중복 소유를 제거해야 한다. 탭 추가·삭제·이동 결과도 같은 panel 상태 소유자에 반영한다.

연결 상태는 서버의 프로세스 상태와 브라우저 attach 상태를 구분한다. W10에서 terminalId와 runtimeId에 맞춰 attach 상태를 관리하고 runtime 교체 시 이전 상태·비동기 결과가 새 연결에 섞이지 않게 한다. fixture의 Reconnect 즉시 connected 처리는 실제 attach의 reconnecting → 성공/실패 결과로 교체한다. panel 갱신 반영을 연결한 후 runtime 교체도 별도 검증한다. 현재 UI fixture 사용에는 차단 요인이 아니지만 실서버 통합 완료 전에 해결할 항목이다. W6 활성/next와 기존 W10 범위는 유지한다.

### 2026-09-24 18:48 · TanStack Query·동작별 요청·낙관적 UI 연결 결정과 W12 리뷰 소비

사용자는 Stage6에 TanStack Query, requestId 전송과 낙관적 업데이트의 Web 책임을 기록하도록 요청했다. 기존 Global의 Zustand 확정·Query 미사용 결정과 W10의 전체 layout PUT 설명을 최신 합의로 정정한다. 과거 History는 당시 경위로 유지한다. 이 entry는 기존 W10 상태 소유 작업의 재개 기록이며 별도 workstream을 만들지 않는다.

결정: 서버 확정 상태의 소유자는 TanStack Query 하나다. SSE 첫 snapshot/재접속 전체 교체와 이후 DTO upsert/remove를 반영한다. HTTP 명령과 SSE 중 어느 것이 먼저 도착해도 중복 적용·오래된 상태 덮어쓰기가 없어야 한다. HTTP 반환 DTO를 캐시에 반영할지, SSE 확인을 중심으로 쓸지는 순서 보장 설계와 함께 구현 시 결정한다. dropdown/dialog/입력은 local state로 두고 연결 상태·명령 상태와 terminal 연결 상태를 구분한다. 초기 snapshot 전 대기, 연결 끊김/재연결, 명령 실패를 각각 표시하며 매 조작에 전체 로딩 화면을 넣지 않는다.

사용자 흐름: 클릭 → 화면 즉시 변경 → panel별 요청 줄 → HTTP 동작별 명령 → 서버 등록/commit 응답 → SSE 확정 상태와 미확정 변경 재조정. shell은 preparing 탭 등록 후 202이므로 다음 등록 요청을 보내도 PTY 준비는 병렬 진행한다. panel 생성 확인 전 종속 요청은 보내지 않는다. 등록 전 탭 이동은 화면에 먼저 반영하고 등록 확인 후 전송한다. 연속 resize는 의미를 보존하는 범위에서 합치되 이동·생성·닫기 전체를 마지막 하나로 합치지 않는다.

식별과 재전송: Web은 client panel/tab/pane/split ID를 유지하고 명령마다 requestId를 만든다. 같은 요청 재전송은 같은 ID와 최초 body, 새 조작은 새 requestId다. UUID v4 crypto.randomUUID를 권고하며 UUID 시간순 정렬로 명령 순서를 대신하지 않는다. terminal/runtime/Operation ID는 서버 결과를 따른다. split:<paneId>인 현재 Web 생성 방식은 서버 계약·유일성·ID 유지와 대조하고, 클라이언트의 새 split ID 생성 정책을 W10에서 일관되게 맞춘다.

실패 복구: 최신 서버 상태와 남은 사용자 변경으로 화면을 다시 계산한다. 실패 이전 전체 cache 복원은 금지한다. 생성 실패에 의존하는 이동/선택 등은 재판정하고 무관한 성공 작업은 유지한다. 202는 실행 성공이 아니므로 Panel의 tabId/terminalId/presentation과 Operation의 requestId/tabId·error·cleanupErrors를 함께 소비한다. 이미 연결된 shell에서 Operation 저장만 실패한 경우 실제 shell을 실패 탭으로 지우지 않는다. 취소 자체는 알림 생략 가능하지만 정리 실패는 숨기지 않는다. confirmation_required이면 기존 dialog를 열고 자동 확인하지 않는다.

W10 검증: [+] 연속 클릭, 준비 중 이동/split/resize/닫기/panel 삭제, 성공과 실패 혼합, 실패한 부모의 후속 요청, 202와 SSE 역전, 응답 유실 후 재전송, 두 창 조작, 재접속 snapshot 이후 pending 재적용을 확인한다. terminal pane 이동은 인스턴스·WS 유지, 숨김/이탈은 브라우저 자원 정리다. layout 저장과 PTY resize는 독립이며 attach 때 현재 크기를 보낸다. Host당 40 agent를 실사용 평가 기준, 200을 stress 기준으로 클릭→화면 반영, 등록 응답, 실제 완료, WS attach/복원→첫 입력 에코를 분리 측정한다. 40은 서버 제한이 아니다.

Stage5 결과 소비: W12 완료 및 전체 check 통과는 Claude 보고다. Codex는 최초 리뷰에서 발견한 (1) 연결 성공 후 Operation 저장 실패 시 terminalId 제거, (2) panel Operation purge로 재전송 근거 소실, (3) 새 Host 생성의 requestId namespace 검사 누락을 후속 코드에서 다시 확인했다. 관련 daemon panel-operations 3개와 persistence host-state 6개 테스트를 직접 재실행해 모두 통과했다. 최초 리뷰의 저장 실패는 실제 SQLite·PTY 실패 주입으로 재현했고, 생성/닫기 경합은 제어된 promise 해제에서만 재현했으므로 자연 발생 확정 결함으로 다루지 않는다. Host restart는 최신 배치를 적용하나 panel/tab 재삽입은 남는다는 정정도 유지한다.

남은 서버 경계: SIGKILL 후 PTY 생존과 규모 benchmark는 미검증이다. panel Operation 무기한 보존으로 snapshot이 커질 수 있으므로 재전송 기록 보존과 SSE 전달 범위를 분리 검토하되, 완료 Operation을 임의로 숨기거나 만료시키는 계약은 확정하지 않았다. 개발 DB 재생성도 별도 승인 대상이다. 서버 수정 상세 owner는 [[logs/2026-09-09-AIOX-TUI-Stage5-Host]]이며 이 로그는 Web 소비와 통합 검증만 추적한다. Effect/Schema/Stream은 조사 후보이고 도입 완료로 기록하지 않는다.

## 2026-09-23 · W4·W5 탭 활성화 결함 해결과 비활성 opacity 60%

사용자가 최근 UI·포커스 후속 변경의 기록 정리를 요청했다. 기존 비활성 55% 기록 이후 80%를 적용해 확인했으나 구분이 약하다는 사용자 피드백에 따라 최종 비활성 opacity를 60%로 변경했다. 활성 탭·본문은 100%다. 탭 opacity는 제목·상태 점·×를 포함한 부모에 적용하고, 선택 탭 부모의 has-aria-selected:bg-background는 제거했다. 키보드 focus-visible 테두리는 유지한다. 연결 끊김 화면의 출력 opacity 40%는 별도의 복구 화면 처리로 유지된다.

삭제·드롭 후 강제 focus 이동, Dialog initialFocus/finalFocus 지정과 비교용 주석·미사용 host/cancel ref는 제거했다. × 클릭은 requestClose에서 대상 pane을 먼저 활성화한 뒤 삭제/확인을 처리하며, Dialog 포커스 복귀는 라이브러리 기본 동작을 따른다. 이 삭제 동작은 사용자 확인을 받았다.

Claude가 재현한 두 경로를 수정했다. 이미 선택된 다른 pane의 탭 클릭에서는 Base UI가 onValueChange를 호출하지 않고, 키보드 진입도 기존 pointer 전용 처리로는 pane 활성화가 따라오지 않았다. 현재 TabsList에서 탭 클릭·focus 버블링을 받아 onActivate를 호출한다. 클릭은 role=tab 내부로 제한해 빈 공간은 제외하고 ×는 기존 requestClose 경로가 처리하므로 삭제된 pane을 뒤늦게 다시 활성화하지 않는다. 일반 본문과 Portal TerminalSurface는 각 이벤트 경계에서 포인터·focus 진입을 처리한다. 공통 activatePane은 선택 탭을 바꾸거나 focus()를 호출하지 않고 activePaneId만 변경하며, 이미 활성 상태면 기존 state를 반환한다.

검증: workspace의 명시적 test 파일 4개를 Vitest/happy-dom으로 실행해 25개 통과, typecheck·format 검사 통과. 이미 선택된 탭의 클릭/키보드 진입, 일반 본문/Portal 진입, 빈 탭바 클릭 제외, 중첩 탭 라벨 클릭, 활성 pane의 마지막 탭 삭제를 포함한다. 디렉터리 단위 실행은 Storybook 프로젝트의 로컬 listen EPERM으로 종료되어 test 파일을 명시해 재실행했다. Playwright 브라우저 검증은 수행하지 않았다. 최신 버블링 처리와 60% 외관의 사용자 최종 확인은 별도다.

드롭 존 설명: workspace-preview.ts의 dropZone은 pane 본문 가장자리에서 정규화 거리 20% 미만을 분할 드롭으로 판정한다. workspace-dnd.tsx의 반투명 오버레이는 결과로 차지할 절반(50%)을 미리 보여주는 표시다. 사용자 이미지의 왼쪽 절반 음영은 왼쪽 분할 결과 미리보기이며, 20% 판정 영역 자체를 그린 것이 아니다. 현재 20%는 유지하고 최종 조정 확정으로 처리하지 않는다. W5 DnD 사용자 PASS와 W10 실연결 범위는 유지한다. W6 검색 제외/보류는 논의만 있었고 실행 지시가 확정되지 않아 Work Item과 next를 변경하지 않았다.

### 2026-09-23 20:12 · 드롭 존 20% 사용자 확인 완료

가장자리 20%는 분할 판정 범위이고 절반 음영은 분할 결과 미리보기라는 설명 후, 사용자가 현재 동작이 충분히 괜찮다고 확인했다. 따라서 현재 20% 판정과 50% 결과 미리보기를 유지하며, 앞 기록의 드롭 존 최종 조정 미확정 사항은 사용자 확인 완료로 닫는다. 코드 변경은 없다. 이 확인을 다른 UI나 W10 실연결 검증 완료로 확대하지 않는다.

## 2026-09-23 · W6 커맨드 팔레트 보류와 드롭 존 spec owner 반영

사용자가 W6 커맨드 팔레트를 이번 범위에서 빼기로 결정했다. 판단 근거는 명령 섹션의 여섯 동작이 모두 이미 진입점을 갖는다는 코드 확인이다. New shell·Split right·Split down은 탭바 버튼(apps/web/src/pages/workspace/workspace-view.tsx:511-521), 사이드바 토글은 SidebarTrigger(apps/web/src/widgets/header/app-header.tsx:49), 테마는 apps/web/src/features/theme/theme-toggle.tsx, Settings는 헤더 톱니(apps/web/src/widgets/header/header-actions.tsx:55)다. 앞의 넷은 docs/specs/aiox-configuration-web.md 68-80행 표에 전용 키까지 있어 팔레트가 세 번째 경로가 된다. 팔레트만 여는 동작은 전역 목록이 없는 터미널을 이름으로 찾는 것 하나이며, 그 값어치는 실사용 터미널 수를 본 뒤 정하기로 했다.

삭제가 아니라 보류다. 사용자 지시로 헤더 검색 버튼은 주석으로 남기고 cmdk 의존성과 shared/ui/command primitive는 지우지 않는다. 나중에 만들 때 되살린다. spec 본문도 지우지 않았다. 지우면 나중에 만들 때 설계를 다시 해야 하므로 보류 이유와 상충한다는 판단을 사용자에게 보고하고 진행했다.

owner 문서 반영 셋. docs/specs/aiox-web-ui.md의 커맨드 팔레트 절에 [Status: Open/deferred]와 보류 근거를 넣었고, 같은 문서 헤더 바 절에 검색창이 현재 헤더에 없다는 것을 적었다. docs/specs/aiox-configuration-web.md의 keybindings 표 뒤에 openPalette을 지금 바인딩하지 않는다는 [Status: Open/deferred]를 넣었다. 표 자체와 열한 개 서술은 그대로 두었다. 팔레트를 만들 때 나머지와 같은 재지정 대상이 되기 때문이다. 이로써 W9가 표를 구현할 때 죽은 키를 묶지 않는다.

같은 작업에서 드롭 존 spec을 고쳤다. 앞선 코덱스 보고가 20% 사용자 확인 완료를 로그에만 남기고 owner 문서를 고치지 않아 docs/specs/aiox-web-ui.md 194-195행에 [Status: Open/deferred]와 "구현 후 조정한다"가 그대로 있었다. 확인해 정정했고 20%가 판정 범위, 절반(50%) 오버레이가 결과 미리보기라는 구분을 본문에 넣었다.

코덱스 수정본 검증도 이 턴에 마쳤다. 지난 턴에 임시 테스트로 재현했던 pane 활성화 결함 둘은 닫혔다. TabsList 버블링으로 처리하고 role=tab 안쪽으로 제한해 Base UI TabsTab의 active 가드를 탭 단위가 아니라 공통 지점에서 우회한다. activatePane은 activePaneId만 바꾸고 동일하면 기존 state를 반환한다. 비활성 opacity 60%도 확인했다. 코덱스가 EPERM으로 실행하지 못했다고 보고한 디렉터리 단위 실행은 이 환경에서 정상 동작했고 Storybook chromium 프로젝트 10개를 포함해 통과한다.

검증: apps/web 전체 Vitest 13 files 77 tests 통과, typecheck exit 0, 루트 format·lint 통과, check-markdown-inline-code 통과.

## 2026-09-23 · W8·W9 보류와 W7 다음 W10 순서 확정

사용자가 W8 설정 화면과 W9 keybindings를 보류하고 W7 알림까지 구현한 뒤 W10 실제 daemon 연결로 넘어가기로 결정했다. 순서는 W7 → W10이다. 취소가 아니라 보류이며 두 항목은 열린 상태로 남긴다.

보류가 W10을 막지 않는 것을 확인했다. packages/protocol/src/host.ts:511-519의 webSnapshotSchema는 hosts·networks·panels·terminals·agents·operations·notifications만 싣고 config를 싣지 않는다. 설정 조회·저장은 SSE가 아니라 별도 HTTP 경로이므로 W10의 실제 연결과 독립이다. W10이 소유한 PTY 입출력·resize·shell 생존·재접속 복원·Force stop·layout PUT 어느 것도 설정 화면이나 전역 키 핸들러를 선행 조건으로 요구하지 않는다.

W8과 W9를 함께 보류하는 것은 내부적으로 정합이다. W9는 keybindings 사용자 변경분을 config에 합치는 것을 범위로 갖고 그 저장 경로가 W8이므로 W8 없이 닫히지 않는다.

보류 동안 남는 관측 가능한 상태 둘. /settings는 apps/web/src/app/router.tsx의 제목만 있는 stub이며 헤더 톱니가 그곳으로 간다. 링크가 깨지지는 않고 자리표시자가 보인다. 사이드바 너비는 저장 경로가 W8이므로 세션 간 보존되지 않는다. 브라우저 저장소는 [[docs/specs/aiox-configuration-web]]이 금지하므로 임시 보존을 넣지 않는다.

owner 문서는 고치지 않았다. [[docs/specs/aiox-web-ui]]의 설정 화면 절과 aiox-configuration-web의 keybindings 표는 Committed target이며, 구현 시점을 미루는 것이 승인된 target contract를 바꾸지 않기 때문이다. 보류는 작업 순서이지 계약 상태가 아니다.

미결 하나를 사용자에게 올린다. W9는 세 가지를 묶고 있다. keybindings 표, 남은 반응형 규칙, 그리고 알림 횡단 규칙이다. 셋째는 [[docs/specs/aiox-web-ui]] 355-359행의 햄버거 미확인 점과 좁은 폭 알림 dropdown의 Esc·backdrop 순서로, 알림 기능 자체의 동작이라 W9를 통째로 미루면 W7이 좁은 폭 동작이 빠진 채 끝난다. W7로 편입할지 W9와 함께 미룰지 확인이 필요하다.

## 2026-09-23 · 알림·설정·테마를 헤더 고정으로 변경

사용자 결정으로 알림 벨·설정 톱니·테마 토글을 폭과 무관하게 헤더에만 둔다. 좁은 폭에서 드로어 브랜드 줄로 옮겨 담던 기존 규칙을 없앤다.

이 변경으로 W9가 묶고 있던 알림 횡단 규칙 둘이 결정되는 게 아니라 소멸한다. 벨이 항상 보이므로 사이드바 토글에 미확인 점을 붙일 이유가 없고 벨의 badge 하나로 충분하다. 알림 dropdown이 드로어 위에 뜨지 않으므로 Esc가 패널을 먼저 닫고 드로어를 나중에 닫는 순서, backdrop이 둘을 함께 닫는 규칙도 대상이 없어진다. 앞 블록에서 사용자에게 올렸던 W7 편입 여부 미결은 질문 자체가 사라져 닫힌다.

살아남는 규칙 하나를 구분한다. 화면을 이동시키는 동작이 드로어를 닫고 테마 토글처럼 이동이 아닌 동작은 유지한다는 규칙은 유지되며 오히려 더 필요해졌다. 설정 톱니가 헤더에 있어 드로어가 열린 상태에서 눌릴 수 있기 때문이다. 이 규칙은 W9에 남는다.

코드 변경 넷. header-actions.tsx에서 placement prop과 isMobile 분기 둘을 제거해 벨·설정·테마가 항상 렌더된다. 드로어를 닫던 onNavigate prop 대신 HeaderActions가 직접 useSidebar로 setOpenMobile(false)를 호출하며 설정 링크에만 건다. app-sidebar.tsx의 드로어 아이콘 줄 SidebarMenuItem을 제거하고 더 이상 쓰지 않는 HeaderActions import, HeaderActionsProps 상속, unreadCount 구조분해를 정리했다. app-shell.tsx가 AppSidebar에 넘기던 unreadCount도 뺐다.

spec 반영 셋. 헤더 바 절에 셋이 좁은 폭에서도 헤더에 남는다는 것을 적었다. 좁은 폭 사이드바 절의 드로어 아이콘 줄·미확인 점·드로어 위 dropdown 문단을 헤더 고정 서술로 교체했다. 좁은 폭 헤더 절의 검색 진입부 숨김 서술을 셋을 그대로 표시한다로 바꿨다.

용어도 맞췄다. spec이 햄버거라고 부르던 것은 실제로 shared/ui/sidebar.tsx:265의 PanelLeftIcon이라 세 줄 아이콘이 아니다. 같은 문서가 햄버거와 사이드바 토글을 섞어 쓰고 있어 사이드바 토글로 통일했다.

검증: apps/web Vitest 13 files 77 tests 통과, typecheck exit 0, 루트 format·lint 통과, check-markdown-inline-code 통과. 좁은 폭 실제 화면 확인은 받지 않았다.

### 2026-09-23 20:40 · 좁은 폭 헤더 아이콘 사용자 확인

사용자가 좁은 폭에서 알림 벨이 정상 표시되는 것을 직접 확인했다. 앞 블록에서 미확인으로 남겨 뒀던 실물 화면 확인이 닫힌다. 확인 범위는 좁은 폭 헤더의 아이콘 표시이며 알림 dropdown 동작은 아직 구현 전이라 대상이 아니다.

## 2026-09-23 · W7 알림 이동 대상과 상대 시각 정책 확정

사용자가 W7 알림의 이동 대상 탐색과 상대 시각 정책을 확정했다. 다른 세션이 올린 기준을 코드로 대조한 뒤 owner 문서에 반영했다.

확인한 사실 넷. `agentView`의 `agentId`는 `RuntimeRecord.id`이므로(apps/daemon/src/web-state.ts:31) `notification.originRuntimeId`와 직접 비교할 수 있다. 실행이 멈추면 `runtimes.unregister`가 레코드를 지우고(apps/daemon/src/daemon.ts:455) `projectPanels`가 `tab.runtimeId`를 `runtimes.list()`에서 매번 파생하므로(apps/daemon/src/web-state.ts:117-124) 실행이 사라지면 `agents`와 탭의 `runtimeId`가 함께 비고 저장된 탭만 `stopped` 표시로 남는다. 따라서 "Codex 종료 뒤 이전 알림을 누르면 찾을 수 없는 화면"이라는 사용자 의도가 현재 구현에서 성립한다. 서버 목록은 `readAt IS NULL`만 싣고(packages/persistence/src/sqlite/database.ts:229-238) 실행 존재 여부로 거르지 않으므로 대상이 사라진 알림도 목록에 남는다. `createdAt`은 `Date.now()`라 epoch 밀리초다(apps/daemon/src/messaging.ts:83,134).

정정 하나. 전달받은 기준은 클릭을 "agents에서 실행 탐색 → 해당 runtimeId의 탭 탐색" 2단계로 적었으나, 탭의 `runtimeId`가 같은 `runtimes.list()`에서 파생된 값이라 두 탐색의 결과가 항상 같다. 이동 판정에는 탭 탐색 하나면 충분하고 `agents` 조회는 항목에 표시할 agent 이름을 얻는 데만 필요하다. 구현에서 단계를 늘리지 않는다.

경계 하나. 서버가 `originExecutionOwnership === "daemon"`인 알림만 스냅샷에 싣는다(apps/daemon/src/web-state.ts:101). 외부 CLI 소유 실행의 알림은 애초에 화면에 오지 않으며 이 경계는 [[docs/specs/aiox-configuration-web]]이 이미 소유한다. "대상 실행이 사라져도 숨기지 않는다"는 daemon 소유 알림 안에서의 규칙이다.

spec 반영. [[docs/specs/aiox-web-ui]] 알림 절에 이동 대상이 알림을 보낸 그 실행이라는 것, 실행이나 탭이 없으면 주소 없는 화면과 같은 안내로 보내고 그 경우에도 확인 처리를 함께 끝낸다는 것, 대상이 사라져도 목록과 배지에 남기고 이름을 못 찾으면 본문과 시각만 보인다는 것, 이동 불가 카드나 비활성 표시를 두지 않는다는 것, 상대 시각을 열 때 계산하고 1분마다 갱신하며 닫으면 멈춘다는 것을 넣었다. `Clear all`이 이동하지 않는다는 것도 기존 줄에 붙였다. terminalId 대체 탐색 금지의 근거는 configuration-web이 이미 소유하므로 복사하지 않고 링크했다. 문서 레벨이 Committed target이라 절별 status는 붙이지 않았다.

미결 하나. 서버는 `createdAt` 오름차순(오래된 것 먼저)으로 보낸다. dropdown 표시 순서를 최신 우선으로 뒤집을지 서버 순서를 그대로 쓸지 정하지 않았다.

검증: scripts/check-markdown-inline-code 통과. 코드는 아직 수정하지 않았다.

### 2026-09-23 21:06 · 표시 순서와 탐색 단계 사용자 확정

사용자가 앞 블록의 미결과 정정을 확정했다. 이동은 runtimeId가 일치하는 탭 탐색 하나로 하고 agents는 이름 표시에만 쓴다. 기존 알림 경계는 owner 문서 링크를 유지한다. 목록은 createdAt 내림차순으로 최신이 위에 온다.

서버가 오름차순으로 보내므로 화면에서 뒤집되 스냅샷 배열 자체는 바꾸지 않는다. 배열은 SSE가 밀어 주는 서버 상태라 그 자리에서 sort하면 push-apply 모델의 진실 소스를 화면이 건드리는 것이 된다. 표시용 복사본을 만들어 정렬한다.

spec에는 최신이 위라는 표시 규칙만 넣었다. 원본 배열 불변은 구현 규칙이라 W7 context에 둔다.

### 2026-09-23 21:14 · W7 dropdown 구조 구현

알림 dropdown을 구조 단계까지 구현했다. apps/web/AGENTS.md가 구조 다음에 보고하고 멈추라고 하므로 스타일은 올리지 않았고 className은 레이아웃 최소만 뒀다.

새 파일 넷. entities/notification/model.ts가 최신순 정렬·상대 시각·탭 탐색·이름 조회를 갖고, model.test.ts가 9개로 그 넷을 덮는다. fixtures.ts는 서버와 같은 오름차순 셋을 두되 하나는 실행이 사라진 대상(runtime-crashed)이라 이름 없음과 찾을 수 없는 화면을 같이 확인한다. widgets/header/notification-menu.tsx가 Base UI Menu 기반 dropdown이다.

연결 넷. header-actions.tsx의 disabled 벨을 NotificationMenu로 바꿨고 props는 HeaderActionsProps = NotificationMenuProps로 통일했다. app-shell.tsx가 알림 목록 state와 클릭·Clear all을 갖는다. 클릭은 목록에서 빼고 findRuntimeTab 결과가 있으면 panelPath로, 없으면 /notifications/:id로 보내 router의 `*`가 NotFoundPage를 낸다. 이동 대상 탭 선택은 workspace-page가 location.state로 받아 WorkspaceView에 focus로 넘기고 WorkspaceView가 selectPreviewTab으로 적용한다. WorkspaceView는 key가 panel.id라 재마운트되지 않으므로 터미널 표시 수명은 건드리지 않는다.

fixture 하나를 고쳤다. previewPanels의 main에 agents 둘(runtime-reviewer·runtime-preparing-shell)을 넣었다. 탭의 runtimeId가 찬 실행은 agents에도 있어야 이름 조회가 성립하고, 종료된 탭에는 대응 실행이 없다는 구분이 fixture에서 드러난다. 카드의 agent 줄 표시가 따라 바뀐다.

story 둘을 더했다. Notifications는 최신순·이름 없는 항목·Clear all을, NotificationsEmpty는 빈 목록을 본다. Disconnected의 벨 disabled 단언은 열리는 버튼으로 바꿨다.

검증: apps/web Vitest 14 files 89 tests 통과, typecheck exit 0, 루트 format·lint 통과. 사용자 화면 확인은 아직 받지 않았다.

## 2026-09-23 · W7 알림 UI 사용자 PASS와 마감

사용자가 알림 UI를 확인하고 완료를 승인했다. NotificationMenu는 기존 shared/ui DropdownMenu·Badge·Empty·Separator·ScrollArea를 사용한다. 폭 320px, 목록 높이 최대 288px와 화면 가용 높이 제한, 이름/시각 한 줄과 본문 줄바꿈, 항목 구분선을 적용했다. 제목과 Clear all은 스크롤 영역 밖 상단에 고정하고 빈 목록에서도 Clear all을 비활성으로 보여 준다. 목록만 스크롤되며 얇은 scrollbar는 hover/scroll 시 표시한다. 벨에 가까운 sideOffset 4와 alignOffset -4를 사용한다.

배지는 사용자 피드백으로 외곽 ring과 개별 색상 지정을 제거하고 destructive variant를 사용했다. 기본 반투명 variant가 벨 위에서 식별되지 않아 알림 배지에 한해 불투명 bg-destructive·흰 글자와 dark 배경 override를 유지했다. 공통 Badge variant 자체는 변경하지 않았다.

기존 구현의 runtimeId 기반 이동, 최신순 복사 정렬, 열린 동안만 1분 시각 갱신/닫힘 시 interval 정리, 없는 대상의 NotFound, Clear all 동작은 유지한다. 사용자가 직접 늘린 중복 fixture ID는 UI 실험 데이터이며 W7 미완료 사유로 두지 않는다. 실제 알림 데이터의 ID 고유성이나 중복 key 사용을 정상 계약으로 인정한 것은 아니다.

W7은 fixture UI 사용자 PASS로 완료한다. 실제 SSE 알림 수신·확인 API 및 실패 처리와 서버 최신 panel 소비는 W10이다. WorkspaceView의 local panel 복사본에서 탭을 삭제해도 AppShell.panels에는 남아 알림 탐색이 성공하는 문제는 이미 W10에서 제거하기로 한 상태 이중 소유의 한 사례다. 새로운 W7 차단으로 두지 않고 W10 통합에서 “탭 종료/삭제 후 과거 알림 클릭 → NotFound + 확인 처리”를 검증한다.

권위 문서 대조: docs/specs/aiox-web-ui.md 알림 절에는 runtime 귀속·대상 없음·이름 fallback·최신순·시간 갱신 정책이 이미 반영돼 있다. 이번 승인으로 Clear all 상시 노출, 목록만 스크롤, 항목 구분선, light/dark 배지 식별성을 추가했다. 개별 px·색 클래스와 컴포넌트 구성은 코드가 소유하므로 spec에 복사하지 않았다. docs/specs/aiox-configuration-web.md의 서버 알림 경계와 docs/architecture/aiox-system.md의 Target 서버→React 구조는 변경하지 않는다. 실제 React/SSE 소비 구조의 as-built 승격은 W10 범위다.

검증: 알림 model와 workspace 명시적 test 파일 5개/35개 테스트, typecheck·format 검사가 통과했다. Playwright는 실행하지 않았다. 사용자 시각 확인은 이번 대화의 PASS가 근거다. 기존 「W6 취소와 W8·W9 보류」 결정에 따라 다음 작업은 W10 실제 서버 연결이다. W6 취소와 W8·W9의 W10 이후 보류를 유지한다.

### 2026-09-23 22:03 · W7 커밋 전 정합 확인

사용자 요청으로 W10 활성 포인터를 재확인하고 W7 변경을 커밋한다. WorkspaceView의 DOM focus와 무관한 탭 선택 요청 prop은 tabSelectionRequest로 명명했다. 사용자가 추가한 알림 fixture의 항목 수와 긴 본문은 유지하고 중복 ID만 고유화했다. Header story는 세 개 fixture를 명시적으로 사용하고 상단 Clear all에 맞춰 항목 순서 단언을 갱신했다. 알림 model/workspace 35개 테스트, typecheck, lint, 변경 파일 format 검사를 확인했으며 story의 Playwright 실행은 하지 않았다.

## 2026-09-25 · W13 Effect v4 조사와 테스트 도구 전환 완료

### 2026-09-25 01:26 · 조사 근거와 검증 결과

사용자는 테스트 도구의 가능한 업그레이드와 v4 DB 통합·restart Workflow·관련 라이브러리·Schema 비교를 서브에이전트 조사로 요청했다. MCP SDK의 Zod는 유지하라고 명시했다. 지원 작업 W13은 완료했으며 W10 제품 통합은 계속 열린다.

주 에이전트는 루트 Vitest5.0.1 및 tinybench Node 타입 패치를 반영하고 lint·format·build·typecheck를 확인했다. sandbox PTY 제한으로 중단된 테스트는 정상 권한으로 재실행해 825 passed/1 skipped를 확인했다. Web4.1.6은 Storybook peer 범위 때문에 유지한다. 다른 에이전트의 제품 변경과 사용자 DB는 수정하지 않았다.

세 서브에이전트의 공식 소스 조사·격리 DB 실행·Schema 측정과 제안을 [Effect v4 생태계 조사](artifact/2026-09-25-Effect-v4-Ecosystem-Research.md)에 모았다. Effect SQL RC117의 저장·rollback·재오픈은 통과했으나 Drizzle RC4 import는 실패했다. Workflow 영속 복구와 실제 제품 Schema 전환은 검증되지 않았다. 이 문서는 조사 근거이므로 spec·architecture를 구현 완료로 승격하지 않는다. 다음에는 W10 통합 착수 전에 해당 보고서의 버전·호환 조건과 현재 서버 변경 상태를 확인한다.

## 2026-09-25 · W10 서버 W13 보고의 제한 검토

### 2026-09-25 01:34 · 최신 계약 차이와 순번 만료 재현

사용자가 Claude의 서버 W13 완료 보고를 전달했다. 보고는 Operation 제거·상시 AppState·HTTP/SSE·v3 부분 전환의 구현이며 adapter·메시지 저장 전환은 미완료라고 명시한다. 이후 논의한 Effect v4·앱용 WS·Effect HTTP 전환까지 완료한 보고로 소비하지 않는다. 이번 검토는 전체 코드 리뷰가 아니라 아래 사항에 한정한 직접 확인이다.

- Vitest5.0.1과 lockfile 변경은 Codex의 직전 승인된 작업이다. Codex의 `/tmp/aiox-vitest5-tests.log`에는 서버·공통 패키지 RUN v5.0.1, Web v4.1.6이 기록돼 있다. Claude가 실행한 별도 로그의 버전은 확인하지 않았다.
- `sequencer.ts:51`에는 최근 완료 결과 기본 64건 보존이 남아 있다. 이는 이후 사용자와 정한 완료 결과 추가 보관 없음과 다르다. `host-command.ts`에는 별도의 최근 128건 보존도 있어 후속 계약 대조 대상이다.
- 직접 재현: Sequencer에 같은 session/requestId/hash/sequence=1을 처리시키고 주입 clock을 3,600,001ms로 옮겨 동일 요청을 다시 제출하면 run이 두 번 실행된다. 출력은 first value1, replay value2, executions2다. 파일은 `/tmp/aiox-sequencer-idle-review.mts`; 실제 HTTP·DB 명령까지 실행한 재현은 아니다. 원인은 idle sweep으로 session checkpoint를 삭제한 뒤 미등록 session을 settled0으로 다시 만드는 경로다. 알려진 세션의 오래된 순번 거절과 세션 삭제 후 재전송 거절은 별개이며, 후자는 현재 보장되지 않는다.
- Web 명령 schema에는 epoch 입력 검사가 없고 snapshot에만 epoch가 있다. snapshot epoch 변경과 React의 새 세션 시작 안내만으로 서버가 옛 HTTP 요청을 거절한다고 볼 수 없다. 후속 순번/연결 계약에서 만료·재시작 세션의 재진입을 차단해야 한다.
- cleanup registry가 메모리라는 보고는 프로세스 정리 복구 제한이다. epoch는 React 상태 복원 경계이며 미정리 프로세스 추적의 대체가 아니다. SIGKILL 후 프로세스 잔존은 이번에도 검증하지 않았다.

제품 코드 수정·전체 테스트 재실행은 하지 않았다. W10 연결 전 최신 결과 미보존 계약과 세션 만료 재실행 문제를 해소해야 하며, v4/WS 마이그레이션에서도 이 불변식을 보존한다.

## 2026-09-25 · W14 서버 마이그레이션 추가 라이브러리 조사

### 2026-09-25 01:47 · 서브에이전트 조사와 Drizzle RC5 검증 완료

사용자는 대규모 마이그레이션에 필요한 Effect 외 라이브러리 조사를 요청했고 서브에이전트의 ponytail 사용을 금지했다. 세 에이전트에 해당 스킬을 호출하지 않고 초기 비용 대비 장기 구조·검증 이득을 평가하도록 지시했다. 중간 중단 이후 사용자 지시로 이어서 완료했다.

서브에이전트는 서버/앱 상태·DB, 프로세스/adapter, 테스트/관측을 조사했고 주 에이전트는 XState·DBOS를 추가 확인했다. 제품 코드나 의존성은 수정하지 않았다. /tmp에서 Drizzle RC5와 Effect RC117의 import·typed query·transaction·파일 재오픈이 통과해, 이전 RC4 실패를 Drizzle 전체의 부적합으로 일반화할 수 없음을 확인했다. 격리 TypeScript 검증은 skipLibCheck 조건이다.

새 [조사 보고서](artifact/2026-09-25-Server-Migration-Library-Research.md)에 직접 검증과 소스 기반 제안·미검증 범위를 분리했다. 이전 Effect v4 보고서에도 RC5 후속 근거 링크를 추가했다. fast-check·chokidar·XState·OTEL·TanStack DB 등은 이번에 프로젝트에 설치하거나 제품 실행 검증하지 않았다. 기존 프로세스 종료·관측·진단 책임의 보존 조건을 다음 설계에서 함께 소비한다. 조사 W14는 완료했으며 W10 제품 마이그레이션·통합은 계속 열린다.

## 2026-09-25 · W10 라이브러리 채택 결정

### 2026-09-25 02:03 · 채택 범위와 책임 경계 기록

사용자가 XState의 상태머신 규칙과 Zustand vanilla reducer의 차이를 비교한 뒤 XState를 선택했다. 이어 Drizzle Effect SQLite 통합·chokidar 5·fast-check 4의 채택에 동의했다. 이는 사용자 결정이며 기존 조사 결과의 검증 범위를 확장하지 않는다. XState는 daemon 상태 전이, Effect는 실행 관리, ExecutionOwner는 실제 프로세스 소유를 담당하는 경계로 기록했다. TanStack DB에 관한 사용자의 동기화 이해는 daemon producer → 전송 → React sync 연결 → 메모리 컬렉션의 책임으로 구분했다. 이번 작업에서는 이 로그의 결정과 Required Context만 갱신했으며 제품 코드·의존성·spec·architecture는 수정하지 않았다. W10의 다음 구현 설계에서 본 결정과 W14 조사 보고서의 제한을 함께 소비한다.

### 2026-09-25 02:03 · 남은 라이브러리 후보 질문

사용자가 추가 후보를 물었다. 기존 조사 범위에서 Effect HTTP/Socket/RPC·Workflow·Schema·Vitest 지원, OpenTelemetry, 기존 Playwright/MSW의 활용을 남은 적용 판단으로 설명한다. Workflow는 재시작 후 작업 단계 복구, XState는 상태 전이 규칙으로 책임을 구분하며 두 계층이 같은 진행 상태를 중복 소유하지 않도록 해야 한다. Automerge·별도 서버 메모리 DB·대체 프로세스 실행 라이브러리는 현재 요구에서 추가 채택 근거가 부족하다는 제안을 유지한다. 이번 질문으로 새 패키지 채택·설치를 확정하지 않는다.

## 2026-09-25 · W10 Effect 서버 마이그레이션 최종 합의·서버 전용 구현 인계·프론트 후속 맥락

사용자가 최종 라이브러리·아키텍처 합의를 로그로 기록하고, 다른 agent에게 전달할 구현 프롬프트를 요청했다. 구현 범위는 서버이며 Web에서는 라이브러리만 추가한다. 사용자는 현재 Codex와 기술 논의를 계속할 예정이므로 이 기록을 현재 Codex의 구현 착수나 agent 자동 실행으로 해석하지 않는다. 이번 기록은 사용자 결정·작업 지시이며 구현 완료 보고가 아니다. 이후 기술 논의는 사용자가 다시 기록을 요청할 때 증류한다.

#### 최종 결정과 이전 제안의 대체

- Effect v4 중심으로 daemon·CLI의 필요한 실행 경계·adapter·메시지 저장/재시도/종료 대기를 전환한다. Hono는 Effect HTTP로 대체한다. 일반 Promise를 감싼 이중 실행 관리자만 남기는 전환은 피한다.
- XState 5는 복잡한 실행 상태의 전이·guard·진입/이탈 규칙을 담당한다. 실제 작업은 Effect가 수행한다. XState actor와 Effect Fiber가 같은 프로세스를 각각 소유하거나 runtime record와 machine context가 같은 상태를 이중 소유하지 않는다.
- ExecutionOwner의 역할은 보존하되 내부 구현까지 Effect로 전환한다. 단일 소유자가 프로세스 핸들·준비 작업·취소·종료 확인·미정리 자원·재시도를 끝까지 관리한다. Scope 종료 자체를 실제 프로세스 종료 성공으로 취급하지 않는다.
- 앱의 명령·상태·알림은 Effect RPC 기반의 하나의 앱용 WS로 통합한다. xterm 입력·출력·cols/rows용 터미널 WS는 별도다. CLI·MCP·Web 파일 제공에 필요한 HTTP는 유지한다.
- 자체 서버 schema와 공유 wire schema는 Effect Schema로 전환한다. MCP SDK 등록 경계의 Zod는 유지한다. 검증/정규화/오류 의미를 보존하며 성능 향상을 전환 이유로 주장하지 않는다.
- React 서버 상태는 TanStack DB와 React 연결 패키지를 사용하는 방향이다. daemon의 SQLite 자동 감지가 아니라 daemon producer → WS → React 공통 동기화 코드 → TanStack DB의 관계다. 동일 서버 상태를 Query·Zustand에 중복 저장하지 않는다.
- Workflow는 이번에 도입하지 않는다. Host restart는 Effect의 대상별 실행과 XState의 실행 상태 규칙으로 처리한다. daemon 종료 이후 작업 자동 재개·기존 PTY 자동 재부착·별도 PTY broker/supervisor는 추가하지 않는다.
- daemon restart의 기존 목적은 새 설정, 특히 API/Web 포트 적용이다. CLI의 사전 검증 → 일반 stop → 준비한 설정으로 start를 보존한다. POSIX blocker 거절·Windows 일반 stop 정책·외부 CLI 소유 실행 보존을 임의 변경하지 않는다. 상세 근거: [Baseline](2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md) 설정 적용 및 daemon 종료 절, [Runtime spec](../docs/specs/aiox-runtime.md) 시작·종료 절.
- 요청 간 의미상 병합은 보류한다. 공개 Operation·완료 상세 이력은 되살리지 않는다. 현재 64/128건 결과 캐시는 최신 미보존 계약과 대조해 제거한다. 순번 checkpoint·실행 중 합류·미실행 대기·만료 세션 차단 책임은 보존한다.

#### 이미 구현된 기반 — 다시 미결로 돌리지 않을 것

직전 읽기 전용 확인에서 packages/protocol/src/host.ts의 webCommandRequestSchema는 clientSessionId·sequence·requestId·panelId·changes[]이고 panelTabTargetSchema는 생성/이동 공통 목적지다. 변경 종류는 panel.create/rename/delete, tab.create/move/close/dismiss, split.resize, select다. 새 pane 분할은 target.split로 표현한다. 새 panel은 pane 하나와 preparing tab 하나다. daemon의 applyWebCommand는 changes를 applyPanel transaction에서 적용하고 commit 뒤 shell 준비·정리를 실행한다. 현재 명령 성공 DTO는 requestId·sequence·panel|null이다.

이 기반은 HTTP/SSE·Effect v3 구현이며 새 RPC·상태 버전·TanStack DB 통합 완료를 뜻하지 않는다. 현재 WebState는 changes[]이며 앱 전체 확정 변경 버전은 새 전송 계약에서 연결해야 한다. DTO 변경 사실과 DB 테이블 정규화 완료는 별개다. 배치 관계를 새 제품 요구처럼 재승인받거나 임의의 대규모 정규화를 추가하지 않는다.

#### 다른 agent의 허용 작업 범위

- 서버 구현: apps/daemon, 필요한 apps/cli, packages/protocol/persistence/vendor/adapters/config/diagnostics/terminal 등의 실제 caller/producer/consumer 및 관련 테스트·서버 문서. 경로 이름만으로 전부 변경하는 것이 아니라 책임 이전에 필요한 부분을 추적한다.
- Web: apps/web/package.json의 effect·@tanstack/db·@tanstack/react-db 등 합의된 클라이언트 의존성과 루트 lockfile만 변경한다. React 컴포넌트·store·hooks·연결 코드·fixture·story·Web 테스트·스타일은 구현하거나 수정하지 않는다. xstate의 Web 도입도 이번 결정이 아니다.
- 공유 protocol은 서버 전환에 필요하므로 수정할 수 있다. 현재 Web workspace-preview.test.ts가 panelLayoutSchema.safeParse를 소비한다. Web 미수정 경계에서 기존 공개 타입과 실제 사용 API의 영향을 확인한다. 필요하면 동일 Effect Schema를 원본으로 한 최소 호출 호환 경계를 두고 프론트 인계에 명시하되, Zod/Effect 도메인 스키마를 두 벌 유지하지 않는다.
- 기존 미커밋 변경을 보존한다. 삭제·대체가 필요한 파일은 작업 전 원본과 diff를 먼저 보존한다. architecture.excalidraw는 접근/수정 대상에서 제외한다.
- 사용자 daemon·vendor·개발 DB를 종료·삭제하지 않는다. 테스트는 임시 home·DB·본인 프로세스로 수행한다. commit/push는 별도 지시 없이 하지 않는다.
- 서버 작업의 실행 로그/필요한 작업 구성을 repo workflow로 정하고, 이 Stage6 로그는 프론트 후속 맥락과 결과 소비를 소유한다. 현재 stage/plan pointer를 임의 이동하지 않는다. 필요 문서에는 실제 구현 상태와 Target을 구분한다.

#### 의존성 기준과 조사 근거

현재 확인한 manifest: daemon effect 3.22.2·Hono 4.13.8, persistence drizzle-orm 0.45.3·drizzle-kit 0.31.11, root Vitest 5.0.1, Web Vitest 4.1.6, MCP SDK 1.30.0·Zod 4.5.4다. 작업 착수 시 변경 여부를 다시 확인한다.

- effect: 조사 기준 4.0.0-rc.117로 올리고 실제 사용 패키지에 선언.
- @effect/platform-node: 같은 Effect v4 조합과 호환되는 RC.
- @effect/sql-sqlite-node: 조사 기준 4.0.0-rc.117 추가.
- drizzle-orm: 격리 실행을 통과한 1.0.0-rc.5-5935859를 기준으로 전환. drizzle-kit도 schema 생성 호환성을 확인해 맞춘다.
- xstate 5(조사 기준 5.33.2), chokidar 5(5.0.0), fast-check 4(4.10.2) 추가.
- @effect/vitest: Effect v4 대응 RC, 서버·공통 Vitest 5에 연결. Web의 Vitest 4는 Storybook peer 조건 때문에 유지한다.
- Web에는 effect, @tanstack/db(조사 기준 0.9.2), @tanstack/react-db(0.4.1)를 추가하되 사용하는 코드는 만들지 않는다.
- RC117의 HTTP/Socket/RPC/SQL 공통 기능은 effect/unstable/* 본체 경로, Schema도 본체 기능이다. main 문서의 경로와 혼용하지 않는다. v3의 @effect/sql-drizzle·별도 Schema/RPC 패키지를 잘못 함께 설치하지 않는다.
- Workflow·Automerge·OpenTelemetry·Toxiproxy·Execa 등 미채택 후보는 추가하지 않는다.

[Effect v4 조사](artifact/2026-09-25-Effect-v4-Ecosystem-Research.md), [추가 라이브러리 조사](artifact/2026-09-25-Server-Migration-Library-Research.md)를 읽는다. Drizzle RC5 + Effect RC117의 import·typed query·commit/rollback·재오픈은 서브에이전트의 격리 실행 보고이며 TypeScript 검사는 skipLibCheck 조건이었다. 제품 전체 schema·동시 transaction·실행 통합 검증으로 확대하지 않는다. Schema 합성 측정에서는 Zod가 더 빨랐으며 전환은 일관성·통합 목적이다.

#### 서버가 구현하고 검증할 계약

1. clientSessionId·sequence·requestId·동일 body 재전송 의미를 보존한다. 진행 중 중복은 합류하고 처리한 요청은 다시 실행하지 않는다. 보관하지 않는 과거 성공/실패를 만들어 반환하지 않는다. checkpoint는 수신 최댓값이 아니라 연속 확정 범위다. 세션 만료/daemon 재시작 뒤 옛 요청이 새 세션처럼 실행되지 않도록 서버에서 차단한다. 기존 idle sweep 재실행 재현은 W10 서버 W13 보고의 제한 검토를 읽는다.
2. 등록·이동·삭제 등 배치 변경 순서와 shell/Agent 준비 완료 순서는 분리한다. shell 준비 때문에 panel/session의 뒤 배치 변경을 전부 기다리게 하지 않는다. 준비 전 검증은 먼저 하고 DB 등록 후 준비는 병렬로 진행한다.
3. 한 명령의 changes는 최신 panel에 한 transaction으로 적용한다. 생성/이동 공통 target, 빈 pane·split·선택 정리, expectedRuntimeId·confirm 보호를 보존한다. 이동은 기존 shell을 재생성하지 않는다.
4. 탭 생성 성공은 DB 등록 commit, 삭제 성공은 배치 제거 commit이다. 준비 완료 시 같은 실행 시도의 유효한 탭에만 terminal을 연결한다. 생성 중 이동은 위치를 보존하고 삭제 후 늦은 생성은 정리한다. 종료 미확인은 성공으로 숨기지 않고 cleanup 자원·진단·재시도를 유지한다.
5. Host는 대상별 실제 성공·실패를 반환하고 부분 성공을 유지한다. CLI의 HTTP/NDJSON·foreground launch 의미는 실제 caller 기준으로 보존한다. CLI/Web 연결 종료는 명시적 취소가 아니며 daemon이 인수한 실행은 daemon 수명에 둔다.
6. 모든 상태 producer가 변경한 대상을 전달해 daemon의 현재 snapshot을 갱신한다. 평상시 전체 DB 재조회·전체 snapshot 비교를 하지 않는다. 시작/명시적 복구의 전체 재구성과 메모리 snapshot의 최초/재접속 전달을 구분한다. commit 후 메모리 반영 실패, snapshot-구독 경계, 느린 연결을 실제로 검증한다.
7. 명령 결과에 확정 변경과 동일 변경 식별/상태 버전을 연결한다. 요청한 창도 전체 상태 방송을 받는 계약이므로 응답·방송에서 같은 변경을 식별할 수 있어야 한다. 상태 버전은 React 요청 sequence와 별개다. 여러 자원의 관련 변경은 같은 반영 단위로 전달한다. 부분 delta를 최신 번호 하나만 남겨 누락시키지 않는다. 합쳐 보내면 포함 범위/기준이 일관돼야 한다.
8. Effect RPC의 WS·Stream 지원 자체는 순서·멱등성·초기 동기화·재접속을 보장하지 않는다. 실제 RPC client를 사용하는 서버 통합 테스트로 확인한다. 프론트 제품 코드를 작성해 검증 범위를 넘지 않는다.
9. 자체 schema 전환은 transform/default/strictness/unknown key·오류 수집 의미를 확인하고 기존 실패 회귀를 보존한다. MCP Zod 경계와 외부 vendor wire 검증의 역할을 구분한다. node-pty·xterm/headless/serialize 엔진은 유지한다.

#### 프론트 구현 시 Required Context — 이번에는 구현하지 않음

- apps/web/src는 이번 서버 작업에서 변경하지 않는다. 설치된 TanStack DB/Effect를 실제 사용한 것으로 보고하지 않는다. 기존 fixture 기반 UI와 사용자 PASS는 유지한다.
- 서버 완료 보고에서 공개 Effect Schema/RPC group/type의 import 경로, 앱 WS 접속·세션 시작 절차, 명령 입력/결과, 최초 snapshot/변경/cleanup/알림/실패 예시, epoch·상태 버전·순번/재접속·만료 규칙을 이어받는다. 추정한 HTTP/SSE 계약으로 연결하지 않는다.
- React 공통 연결 코드가 모든 입력 메시지를 하나의 반영 경로로 처리한다. TanStack DB에는 서버 확정 상태와 미확정 낙관적 변경을 연결하고 Query/Zustand에 같은 서버 상태를 중복 소유하지 않는다.
- 확정 상태 반영과 해당 요청의 낙관적 변경 해제를 화면에서 일관되게 처리한다. 실패한 변경과 의존 변경만 조정하며 전체 화면 rollback 금지. 응답/방송의 중복 변경은 한 번 적용하되 요청 완료 처리를 빠뜨리지 않는다.
- 서로 다른 부분 변경은 높은 상태 버전만 남겨 버리지 않는다. 버전 누락/epoch 변경/재접속 때 현재 snapshot으로 복원하며 과거 낙관적 조작을 무조건 다시 실행하지 않는다. 현재 상태 복원과 과거 결과 재현은 다르다.
- 다른 창의 생성·변경도 받아야 하므로 현재 로컬 UI에 없는 탭이라는 이유만으로 서버 데이터를 버리지 않는다.
- terminal WS는 앱 RPC와 별도이며 attach/화면 복원 이후 입력한다. 보이는 탭의 pane 이동은 xterm/WS 유지, 숨김/페이지 이탈은 브라우저 자원 정리, Web 종료는 서버 프로세스 종료가 아니다. headless serialize 화면은 앱 snapshot과 별개다.
- shell 준비 실패와 탭 삭제 후 cleanup 실패를 구분하고 알림의 최신 대상 탐색·읽음 요청·실패 처리를 연결한다. 기존 설정/키 바인딩 W8·W9는 W10 이후 보류를 유지한다.
- Web 전용 TestClock 통합 등을 이유로 Storybook/Vitest 버전이나 Web 테스트 코드를 임의 변경하지 않는다. 기존 공개 parse/safeParse 소비 경계를 유지한 경우 프론트 전환 때 해당 제한을 확인한다.

#### 완료 보고와 검증 요구

서버 구현 agent는 변경된 책임/제거한 기존 경로·정확 의존성 버전·실행한 검증과 실패/미검증·남은 제한·Web handoff를 보고한다. pnpm check를 실행하되 Web 코드 변경 없이 build/typecheck/test가 유지되는지 확인하고 실제 수행 범위를 분리한다. 실제 SQLite·PTY·RPC 통합, 생성 중 이동/삭제·late spawn·저장/cleanup 실패·순번 재전송/만료·snapshot과 delta/느린 연결·Host 부분 결과·daemon restart 사전 검증을 검증한다. fast-check로 조합을 생성하고 Effect 시간 기반 테스트를 사용하되 실제 PTY 확인을 대체하지 않는다. 사용자 vendor나 daemon을 임의 재시작하지 않는다.

이번 Codex 작업은 본 결정·인계·프론트 맥락 기록과 전달 프롬프트 작성만 수행한다. 서버 마이그레이션과 Web 의존성 설치는 아직 실행하지 않았고, 다른 agent도 자동 실행하지 않았다. Stage6 W10은 후속 서버 결과 소비와 프론트 구현을 위해 열린 상태를 유지한다.

### 2026-09-25 02:50 · 서버 전용 실행 프롬프트와 프론트 복귀 맥락 기록 완료

사용자 지시대로 서버 구현·Web 의존성 추가 범위의 다른 agent용 프롬프트를 작성했다. Required Context의 Global/W10에 최신 합의 우선순위와 프론트 후속 구현·검증 맥락을 넣고 W10 next pointer를 본 블록으로 갱신했다. log check 및 git diff --check를 통과했고 onramp가 최신 인계 블록을 재개점으로 제시하는 것을 확인했다. 코드·의존성 설치·테스트 실행·agent 자동 실행은 하지 않았다. 연구 보고서와 앞선 W13 구현은 근거로 읽었지만 서버 v4/RPC/XState 전환 완료로 승격하지 않았다. 600행을 넘는 기존 로그 안에 유지한 이유는 현재 W10의 합의·외부 서버 작업 결과 소비·프론트 후속 연결을 한 재개점에서 이어가기 위해서이며, 서버 구현의 별도 실행 수명/작업 분리는 실제 구현 agent가 repo workflow에 따라 정한다.

### 2026-09-25 03:08 · 서버 전용 구현 착수와 W15 분리

사용자가 첨부 서버 구현 지시를 직접 실행하고 기계적인 작업을 Luna high에 위임하도록 요청했다. 이에 서버 전용 구현/검증 수명을 W15로 분리하고 `logs/2026-09-25-Effect-Server-Migration.md`에 위임했다. 기존의 「현재 Codex는 구현 agent를 자동 실행하지 않는다」는 당시 논의 세션 조건이며, 이번 직접 구현 요청에는 적용하지 않는다. W10은 서버 공개 계약을 기다리는 open 후속 작업으로 두며 React 소스·테스트는 이번 서버 작업에서 수정하지 않는다. 서버 전체 전환의 진행·검증·잔여 제한은 child 로그가 소유한다.

### 2026-09-25 10:00 · W15 서버 완료 결과 소비와 W10 공개 계약 인계

- 확인·수용: `logs/2026-09-25-Effect-Server-Migration.md`의 W1-W7 구현·검증 결과를 W15에 소비했다. native Effect 실행/저장/Schema·XState owner·Effect HTTP/RPC WS 및 session/state 전달을 구현했고, 최종 `pnpm check`는 Node24.14/macOS에서 exit 0, 846 tests passed·기존 scale opt-in 1 skipped다. 상세 보정 경위·증거·버전·제한은 해당 로그와 task records가 소유한다.
- 공개 owner: `docs/specs/aiox-application-rpc.md`와 `@aiox/protocol`의 ApplicationRpc/Effect Schema를 프론트 계약으로 사용한다. 문서의 JSON 예제와 browser TypeScript 예제를 실제 decoder/compile로 검증했다. panel/terminal 의미는 configuration-web, 실행과 저장 내부 구조는 system/storage-terminal/vendor-bindings에 반영했다. 기존 Zod·SSE·client 생성 session 지시를 현재 권위로 소비하지 않도록 W10 Required Context를 갱신했다.
- 범위 확인: Web 의존성만 Effect4.0.0-rc.117·@tanstack/db0.9.2·@tanstack/react-db0.4.1로 추가하고 Web Vitest4.1.6을 유지했다. Web source/test 72개 hash 일치·새 src 파일 없음, build/typecheck/89 tests 통과다. React RPC client/store/hooks·TanStack DB·낙관적 변경과 실제 서버 화면 연결은 구현하지 않았다.
- 다음: W15 완료, 서버 child decided. W10은 open 후속으로 RPC session/state와 기존 UI를 연결하며 terminal WS는 별도 수명으로 유지한다. 현재 상태를 바탕으로 명령 확정/방송 중복·역전, reconnect snapshot/epoch, result_expired와 unknown session, 준비 중 이동/삭제, cleanup 실패, 최신 알림 대상 탐색을 검증한다. 서버 scope에서 commit/push·사용자 프로세스 제어·DB 삭제는 수행하지 않았다.
- 한계: Node22.16은 terminal ESM import와 실제 SQLite init/rollback/reopen smoke까지다. Windows/Linux 전체 Effect 전환·실제 vendor 모델 E2E·성능 개선은 미검증이다. 이 제한을 Web 연결 완료나 모든 플랫폼 인증으로 확대하지 않는다.
- 재개 정합: W10을 부모의 next pointer로 지정하며, 이는 후속 React 작업의 선택 위치다. 이번 서버 작업에서 Web 구현을 시작한 뜻은 아니다. Stage6은 788행으로 soft threshold를 넘지만 같은 UI 단계의 PASS·후속 연결 맥락을 유지하는 단일 수명이라 이번 반환에서 분리하지 않는다.

## 2026-09-25 · 서버 마이그레이션 리뷰 결함 3건 수정

### 2026-09-25 · 재현과 수정 착수

- 사용자 리뷰: Codex 준비 Stream 종료가 stderr를 닫음, Claude retirement Effect 실패가 JavaScript catch를 우회함, notifications.read 연결 종료 시 DB와 AppState 불일치. 사용자 재현 보고이며 이번 작업에서 직접 재현한다.
- 범위: 해당 서버 adapter/RPC의 실제 caller·owner·tests를 추적하고 회귀 테스트와 최소 수정, 관련 검증을 수행한다. 기존 서버 완료 기록은 과거 검증 결과로 보존하며 이번 결함으로 보정한다. Web 소스·사용자 daemon·DB·architecture.excalidraw는 수정하지 않는다.
- 다음: W16 회귀 테스트 실패 확인 후 수정. W10 프론트 연결은 후속으로 유지한다.

### 2026-09-25 12:02 · 리뷰 결함 3건 재현·수정과 전체 검증 완료

- 직접 재현: Codex 실제 Node 자식 프로세스는 기존 준비 Stream 종료 후 대량 stderr 출력에서 exit 1; ClaudeBinding 세션 교체의 실제 outcome 정산 실패 주입은 관측 진단 누락; 실제 SQLite·RPC는 저장을 대기시킨 상태에서 WebSocket을 닫으면 DB 읽음 완료 후 재접속 snapshot에 미확인 알림이 남았다. 사용자 리뷰 3건을 독립적으로 확인했다.
- 수정: Codex 준비 신호 Deferred와 지속 stderr reader Fiber를 분리하고 ExecutionOwner에 reader 정리를 등록했다. Claude retirement는 Effect.catch에서 저장 실패를 표시하고 기존 진단·outcome 재시도에 연결한다. notifications.read는 세션·종료 상태를 확인한 후 기존 DaemonTasks가 DB 저장과 AppState 갱신을 소유하고 요청 Fiber는 결과만 기다린다. HTTP의 기존 비동기 handler는 연결 취소가 Promise 내부 저장→상태 갱신을 중단하지 않으므로 이번 수정 대상은 RPC다.
- 회귀 검증: 각 production 파일 옆 index.test.ts / claude.test.ts / application-rpc.test.ts에 테스트 1개씩 추가했다. Codex 준비 후 대량 stderr 정상 종료, Claude 실패 진단→interrupted outcome 재시도→진단 해제, RPC 종료 후 DB·정상 구독자 remove delta·재접속 snapshot·중복 읽음 no-op을 확인했다.
- 최종 검증: macOS/Node v24.14.0에서 pnpm check exit 0. lint(기존 경고 8, 오류 0)·format·build·typecheck 및 849 passed / 1 skipped(기존 AIOX_SCALE 선택 실행). Codex 20, Claude 141, daemon 298 passed / 1 skipped를 포함한다. 근거: /private/tmp/aiox-review-full-check.log. 초기 sandbox 실행은 loopback EPERM으로 실패했으며, 필요한 권한으로 실제 회귀·전체 검증을 완료했다.
- 범위·한계: Web 소스·테스트 기존 72개 SHA-256 모두 일치(/private/tmp/aiox-review-web-hashes.log). 실제 Codex/Claude 바이너리 E2E와 다른 OS는 이번에 실행하지 않았다. Claude는 controls.settle 저장 실패 주입이며 SQLite 장애 자체 주입은 아니다. 사용자 daemon/DB·architecture.excalidraw·commit/push는 건드리지 않았다.
- Owner 반영: [[docs/specs/aiox-application-rpc]]에 연결 종료 후 알림 읽음 완료 보장과 실제 RPC 근거, [[docs/architecture/aiox-vendor-bindings]]에 stderr reader 소유와 retirement 오류 처리를 반영했다. 기존 서버 마이그레이션 완료 기록은 당시 검증 이력으로 보존하고 이번 후속 회귀로 보정한다. Stage6 로그는 현재 UI 통합의 같은 수명을 유지하므로 soft 길이 경고에 따른 추가 분할은 하지 않는다.
- 결과: W16 완료. 다음은 W10이며 프론트 실연결은 이번 작업에서 수행하지 않았다.

### 2026-09-25 12:41 · 2026-09-25 · Codex 최초 리뷰와 수정 후 재검증 소비

- 직접 확인한 최초 결함 3건: (P1) Codex readiness까지 읽고 Stream을 끝내면 stderr reader가 파이프를 닫아 자식 프로세스가 실패할 수 있었다. Node 자식 프로세스 재현에서 기존 reader는 exit 0, 변경된 reader는 exit 1이었다. (P2) Claude retirement의 Effect 실패가 JavaScript catch를 통과하지 않아 실패 표시·진단·재시도가 빠졌다. 실제 ClaudeBinding의 지연된 settle 실패 주입에서 재시도 0회·진단 없음으로 재현했다. (P2) 알림 읽음 RPC의 요청 Fiber가 연결 종료로 취소되면 DB 저장 후 AppState 반영이 빠졌다. 실제 SQLite/RPC 연결을 끊은 재현에서 DB와 재접속 snapshot의 unread가 달랐다.
- 타 agent 수정 보고를 코드·호출 경로와 대조했다. Codex는 readiness Deferred와 계속 읽는 stderr Fiber를 분리하고 ExecutionOwner가 소유한다. Claude는 Effect.catch로 실패를 공통 진단·재시도 경로에 연결한다. notifications.read는 DB 변경부터 AppState 반영까지 DaemonTasks가 소유하고 RPC는 결과를 기다린다. 종료 미확인 프로세스의 reader를 먼저 해제하지 않는 경계도 확인했다.
- Codex 직접 재검증: 관련 테스트 47개(Codex index 4, Claude claude 38, daemon application-rpc/tasks 5)와 기존 재현 3개가 통과했다. 독립 리뷰를 함께 소비했으며 해당 수정에서 추가 확정 결함은 발견하지 못했다. 초기 리뷰에서는 전체 check를 재실행하지 않았고, 수정 agent의 849 passed/1 skipped 전체 check 보고와 구분한다. 이후 선택 상태 분리까지 포함한 Codex 직접 전체 check는 아래 W17의 851 passed/1 skipped 기록을 따른다.
- 근거: /private/tmp/aiox-codex-readiness-review.mjs, /private/tmp/aiox-claude-retirement-product.test.ts, /tmp/aiox-migration-review.test.ts, /tmp/aiox-review-fix-codex.txt, /tmp/aiox-review-fix-claude.txt, /tmp/aiox-review-fix-rpc.txt, /tmp/aiox-review-fix-prior-rpc.txt, /tmp/aiox-review-fix-prior-claude.txt. 임시 파일은 영구 보존을 보장하지 않는다.
- 검증 한계: 실제 Codex/Claude 바이너리 E2E는 실행하지 않았다. Claude 재현은 settle 실패와 pending 조건 주입이며 실제 SQLite 장애 주입은 아니다. RPC는 실제 SQLite와 RPC client로 확인했다. SIGKILL 후 PTY 생존이나 타 OS 검증으로 확대하지 않는다. 수정 계약은 이미 반영된 application-rpc·vendor-bindings owner 문서와 일치한다.

## 2026-09-25 · pane·탭 선택의 클라이언트 전용화와 리뷰 결과 소비

- W17. 사용자는 pane·탭 선택이 서버 저장 대상인지 재검토를 요청하고, 선택은 각 React 앱의 메모리 상태이며 새로고침하면 사라지는 것이 요구라고 확정했다. 서버 select 명령·선택 DTO/DB 필드와 관련 서버 테스트 제거를 승인했다.
- 서버 변경에 맞춰 Web까지 먼저 수정한 것은 범위를 넘은 진행이었다. 사용자의 중단 지시 뒤 해당 Web 변경을 작업 전 원본으로 전부 복구하고 내용 일치를 확인했다. 이후 사용자가 클라이언트 전용 선택 타입 추가를 명시적으로 승인해 현재 Web 변경을 적용했다. 전체 RPC/TanStack DB 연결까지 승인·구현한 것으로 확대하지 않는다.
- 현재 책임: 서버는 pane/tab의 존재·소속·순서·분할 비율·terminal 상태를 저장한다. Web은 `apps/web/src/entities/panel/workspace-layout.ts`의 `selectedTabId`·`activePaneId`를 React 메모리에서만 사용한다. 서버 `select`·`selectPanelPane`·`PanelView.activePaneId`·`Pane.selectedTabId`·SQLite `active_pane_id`는 제거했다. localStorage·서버 선택 저장·창 간 선택 방송은 없다.
- 서버의 빈 pane/split 정리는 유지하고 Web에서만 삭제 후 선택을 조정한다. 선택 저장·서버 포커스만 검사하던 assertion과 helper는 삭제하고, 관계·transaction·닫기·분할 회귀는 유지했다. 최초부터 독립적인 `/api/panels/:panelId/select` route를 이번에 삭제한 것으로 기록하지 않는다. 실제 제거 대상은 공통 명령의 `select`다.
- 검증 직접 실행: protocol 24, persistence 24, CLI 74, daemon 298 passed/1 skipped, Web 90을 포함해 `pnpm check` exit 0, 총 851 passed/1 skipped. lint·format·build·typecheck도 통과했다. Web의 서로 다른 mounted 화면 간 선택 독립성과 재마운트 초기화, 서버 select 거절, SQLite 현재 schema 생성·저장·재오픈을 검증했다. 근거: `/tmp/aiox-selection-final-check.txt`, `/tmp/aiox-web-local-selection-tests.txt`, production 옆 테스트.
- 검증 한계: 실제 Codex/Claude 바이너리의 새 수동 시나리오나 SIGKILL 후 복구는 수행하지 않았다. React의 실제 RPC/TanStack DB·terminal 연결은 여전히 W10에 남는다. react-doctor는 기존 76점/1 error/4 warnings와 같았고, 기존 root error boundary 등의 진단을 이번 변경의 회귀로 주장하지 않는다.
- 보존: 기존 미커밋 원본·diff는 `/tmp/aiox-selection-local-baseline/`에 보존했다. 사용자 daemon·개발 DB·architecture.excalidraw·commit/push는 건드리지 않았다. 첫 배포 전 현재 schema를 직접 수정했으며, 옛 선택 필드가 있는 개발 DB 삭제·재생성은 수행하지 않았다.
- Owner: 선택의 저장 경계는 `docs/specs/aiox-configuration-web.md`, 화면은 `docs/specs/aiox-web-ui.md`, 명령은 `docs/specs/aiox-application-rpc.md`, 저장/코드 책임은 `docs/architecture/aiox-storage-terminal.md`를 따른다.
- 다음: W10에서 서버 현재 상태만 TanStack DB에 연결하고 클라이언트 선택은 분리한다. 이 로컬 타입 작업을 실제 UI 연결 PASS로 기록하지 않는다. 이 블록은 W10의 같은 인계·복귀 수명이며 soft 600행 기준을 넘었지만 독립 로그로 분리하지 않는다.

### 2026-09-25 12:43 · owner·artifact 반영과 후속 작업 경계

- 사용자 요청에 따라 코드 검증·리뷰 소비와 pane·탭 선택의 클라이언트 전용 계약을 기록했다. configuration-web 상단에 남아 있던 선택의 서버 복원 설명을 수정하고, Web UI spec에 React 앱별 선택 독립성과 새로고침 초기화를 명시했다. application-rpc·storage-terminal·system의 select 제거·저장 경계도 대조했다. vendor-bindings와 application-rpc의 리뷰 결함 3건 수정 계약은 이미 반영돼 있어 중복 추가하지 않았다.
- artifact 6개 갱신: 2026-09-24-Web-Terminal-Transport-Research, 2026-09-25-Effect-Server-Adapter-Research, 2026-09-25-Effect-v4-Ecosystem-Research, 2026-09-25-Server-Migration-Library-Research에는 조사 시점과 후속 채택·구현 상태를 구분하고 현행 owner 링크를 추가했다. AIOX-TUI-Product-Context-Prompt와 AIOX-Web-UI-Design-Prompt에는 서버 geometry와 React 메모리 선택의 경계, 최신 Effect/RPC·TanStack DB 후속 범위를 반영했다.
- 삭제 판단: 관련 자료는 고정 commit·버전별 실패/통과 실험·이전 인계의 독립 근거가 남아 있어 삭제하지 않았다. 과거 v3/Hono·HTTP/SSE·Workflow 후보는 현재 구현 지시가 아님을 표시했다. Agent CLI integration의 HTTP/SSE는 MCP 경로이므로 앱 RPC 전환을 이유로 제거하지 않았다. Agent state/notification audit·terminal replay prompt와 HTML 디자인 자산은 이번 선택 계약과 충돌하지 않아 변경하지 않았다.
- W11의 서버 제거·원자 저장 및 owner 정합은 완료로 소비했다. 남은 실제 React RPC/TanStack DB·PTY 통합 검증은 W10이 소유한다. W17의 로컬 선택 테스트 통과를 실서버 Web 연결 PASS로 확대하지 않는다. Required Context의 Global/W10과 next pointer도 현재 계약으로 맞췄다.
- 이번 문서 반영에서는 제품 코드·의존성을 추가 수정하지 않았다. 변경 문서의 inline-code 점검을 통과했다. log CLI에 heading rename 기능이 없어 이번에 생성한 제목의 중복 날짜 접두사만 직접 정정했고, entry·Work Items·Required Context 변경은 log 도구로 수행했다.

## 2026-09-25 · Web 컴포넌트 책임 분리와 커밋 기록

- 사용자 요청: 기존 동작·이벤트·DOM·스타일을 유지하면서 현재 Web의 책임과 파일 구조만 정리했다. 구현 당시에는 로그 기록을 보류했고, 이번 요청에 따라 코드 커밋 후 기록한다. 서버 상태 연결이나 새 의존성 설치는 이 작업에 포함하지 않았다.
- AppShell의 sidebar width 상태·resize 처리·SidebarProvider 너비 CSS 변수·skip link·AppSidebar 조립을 `apps/web/src/app/app-layout.tsx`로 이동했다. AppShell은 panels·notifications·workspace 관리와 Header/Outlet/Dialog 조립을 유지하고 children으로 전달한다. 구현 사실의 owner는 두 코드 파일이다.
- WorkspaceView 내부의 PaneTree/Pane을 `pages/workspace/pane-tree.tsx`로, 터미널 출력·복구 UI·TabNotice·TerminalStatusBar·StatusDot을 `terminal-body.tsx`로 추출했다. WorkspaceView의 배치·탭 상태·종료 판단과 TerminalSurface의 DOM 수명은 유지했다. 추출 당시 컴포넌트 본문·상태 처리의 공백 제외 일치를 확인했다. 이후 W17의 클라이언트 선택 타입 변경과 이 구조 분리는 별개 작업이다.
- 커밋 구분: 이번 커밋 `ac2a6b0` (`refactor(web): isolate sidebar layout state`)은 AppShell/AppLayout 두 파일만 포함한다. WorkspaceView·PaneTree·TerminalBody의 분리는 커밋 전 이력 확인 결과 기존 `3693a33`에 이미 포함되어 있어 재커밋하거나 해당 커밋 전체를 이번 작업으로 주장하지 않는다. 별도 Claude 조사 파일은 포함하지 않았다.
- 검증: 추출 당시 Web 89 tests·타입 검사·빌드·변경 범위 lint/format 통과. 이번 커밋 직전 최신 트리에서는 Web 14 files/90 tests, typecheck, 두 파일 oxlint·oxfmt, git diff --check 통과했다. 90개 결과에는 후속 W17 테스트가 포함되므로 이번 작업에서 테스트를 추가한 것으로 해석하지 않는다. 테스트는 로컬 포트 권한을 받아 실행했다. 근거: `/tmp/aiox-web-commit-tests.txt`, `/tmp/aiox-web-commit-typecheck.txt` (임시 파일).
- React Doctor: latest 실행이 지연되어 설치된 CLI의 `--verbose --scope changed`로 점검했다. origin/main 대비 75개 파일에서 1 error/7 warnings를 보고했으나 이번 커밋의 두 파일에는 진단이 없었다. 점수 API 접근 실패로 점수 회귀 비교는 확인하지 못했다. 기존 route error boundary 등의 진단을 이번 작업의 결함이나 해결 완료로 기록하지 않는다. 근거: `/tmp/aiox-web-commit-doctor-local.txt`.
- 범위와 다음: 구조 정리 자체는 완료이며 공개 API·화면 계약 변경이 없어 spec 수정은 없다. 최신 RPC/TanStack DB·실 PTY 연결은 기존 W10이 소유하고 이번 작업에서 진행하지 않았다. W10의 marker·next pointer와 기존 Required Context는 유지한다. 이 기록은 같은 Stage6 Web 수명의 완료한 보조 작업이므로 별도 Work Item이나 로그 분할을 추가하지 않는다. 로그 파일은 코드 커밋 이후 갱신했으며 커밋하지 않았다.

## 2026-09-25 · W10 React Effect RPC 연결 계층

사용자 요청 범위는 W10 첫 연결 계층이다. TanStack DB·낙관적 UI·fixture 전면 교체·화면 명령·알림 dropdown·terminal WS·설정·키 바인딩은 구현하지 않았다. W10은 진행 중이며 commit/push와 사용자 daemon/vendor 종료는 하지 않았다. 착수 시 이미 수정된 이 로그의 Web 컴포넌트 분리 기록과 untracked research-idea/claude-stopfailure-rate-limit.research.md를 보존했다. architecture.excalidraw는 건드리지 않았다. 타 agent 보고를 구현 근거로 사용하지 않고 공개 계약·실제 source·명령 결과로 확인했다.

직접 확인한 구현:
- apps/web/src/shared/api/application-connection.ts가 @aiox/protocol의 ApplicationRpc를 RC117 Socket.layerWebSocket + layerWebSocketConstructorGlobal, RpcClient.layerProtocolSocket + RpcSerialization.layerJson으로 소비한다. 앱 origin의 /api/rpc를 사용한다. 앱 실행 하나의 client·상태 구독을 ApplicationProvider가 소유하고 기존 AppShell 연결 경고만 실제 준비 상태를 소비한다.
- 최초 open → snapshot 소비 후 ready, 네트워크 재연결은 resume → 새 snapshot, session_expired/epoch 변경은 새 세션·snapshot이다. 오류·구독 종료·epoch/version gap은 Effect scope를 닫고 재접속한다. 응답 version은 구독 cursor를 올리지 않는다. 서버 종료가 RPC stream interruption으로 도착하는 경우와 앱 AbortSignal에 의한 종료를 구분한다.
- call(callback)은 generated client의 명령 API를 그대로 제공한다. session/state/panel 명령은 수명·식별자 소유 경계에서 제외하고 panelCommand({panelId,changes})가 첫 execute 시 requestId·sequence를 발급한다. 반환된 execute Effect를 명시적으로 다시 실행해야 동일 세션/ID/순번/복사된 body를 재전송한다. 자동 명령 재실행은 없다. request getter는 복사본을 반환한다. checkpoint는 연속 확정 번호이며 구독 version과 독립이다. result_expired는 원래 실패를 보존하고 snapshot 복구를 시작하며, 옛 세션 명령을 새 세션으로 실행하지 않는다.
- RC117의 연결 전 요청 취소 frame이 열린 socket을 기다리는 경로를 확인해 ConnectionHooks.onConnect 이후에만 session RPC를 시작했다. start/stop을 직렬화하여 StrictMode cleanup과 다음 시작이 겹치지 않는다. 결과 전달 전에 resync가 command fiber를 끊던 초기 구현도 수정하고 회귀로 확인했다.
- 개발 proxy는 AIOX_WEB_PROXY_TARGET에 지정한 daemon Web listener만 사용한다. 최초 브라우저 검증에서 daemon requestGuard의 Host/Origin 거부를 확인했다. 개발 proxy는 자기 HTTP 페이지 Origin만 허용한 뒤 대상 Host/Origin을 전달하며 외부/누락 Origin은 거부한다. 서버 계약이나 requestGuard는 변경하지 않았다.

직접 실행한 검증:
- Web 전체 Vitest 17 files / 105 passed. 새 연결·Provider·proxy 테스트는 production 인접 파일에 배치했다. 실제 daemon + Node 내장 WebSocket의 open/snapshot·panel 응답/방송·resume·실제 daemon 재시작·불확실한 명령·동일 ID 재전송/result_expired·새 앱 세션·실제 sequence_gap/checkpoint를 확인했다. 만료 응답과 구독 gap/epoch/stream failure는 fault injection이며, 서버의 실제 sequencer 만료 규칙은 별도 서버 테스트가 검증한다. 응답 두 개가 구독 delta보다 먼저 도착해도 두 delta가 남는 것, 알림/cleanup/sequence-failure 전달, StrictMode 연결 전 unmount 정리도 확인했다.
- 기존 daemon application-rpc·sequencer·app-state 3 files / 15 passed. Web build/typecheck, 루트 lint·format:check 통과. lint는 기존 다른 package 경고 8개만 남았다. build의 500 kB chunk 경고는 남아 있다. 실제 Vite 모듈 그래프 2,502개에서 Node builtins/Node transport/daemon/DB 코드 및 browser external shim은 0개였다.
- 실제 Chromium(agent-browser 독립 세션): 운영 build 최초 snapshot 준비 시 연결 경고 해제, 임시 daemon 종료 시 경고, 같은 포트의 새 daemon epoch 시작 시 자동 복구를 확인했다. 개발 Vite proxy에서도 연결 경고 해제를 확인했다. 브라우저에서 panel 명령을 화면 조작으로 검증한 것은 아니다. Node 테스트를 브라우저 명령 E2E로 보고하지 않는다. 임시 DB/daemon/Vite와 브라우저는 정리했다.
- 최초 전체 Web 실행의 Storybook 6개는 동적 모듈 fetch 실패였고 단독 30개 재실행 및 최종 전체 105개에서 통과했다. 초기 sandbox의 로컬 listen EPERM은 임시 포트 허용 실행으로 재검증했다. npx react-doctor@latest는 registry DNS 실패; 설치된 CLI의 동일 --verbose --scope changed 전후 비교는 기존 1 error/7 warnings 동일, 이번 파일 진단 0개다. 점수 API 접근 실패로 수치 점수 비교는 미확인이다.
- 근거: /tmp/aiox-rpc-web-final-all.txt, /tmp/aiox-rpc-final-focused.txt, /tmp/aiox-rpc-server-regression.txt, /tmp/aiox-rpc-typecheck.txt, /tmp/aiox-rpc-build.txt, /tmp/aiox-rpc-format.txt, /tmp/aiox-rpc-lint.txt, /tmp/aiox-rpc-bundle-audit.json, /tmp/aiox-rpc-doctor-before.txt, /tmp/aiox-rpc-doctor-after-local.txt. 테스트에서 다른 package를 공개 entry로 import하도록 Web devDependency에 기존 workspace @aiox/daemon·@aiox/persistence만 연결했다. 런타임 dependency 추가는 없다.

후속 인계:
- React 소비자는 @/app/application-provider의 useApplicationConnection/useApplicationConnectionState를 사용한다. 비React 경계는 @/shared/api/application-connection의 ApplicationConnection/ApplicationSession/ConnectionState다. wire 타입은 계속 @aiox/protocol 공개 entry가 소유한다.
- App의 ApplicationProvider onEvent에 안정적인 동기 소비 함수를 연결하고 snapshot 전체 교체 → 순서대로 delta 적용을 구현한다. 현재 기본 sink는 검증한 이벤트를 보관하지 않는다. 구독 시작 전 소비자를 설치해야 하며 늦게 합류한 소비자를 위한 replay 배열/전체 상태 관리자는 없다. response의 state와 방송은 epoch/version으로 같은 변경을 식별하고, 낙관적 상관관계에는 명령 객체의 requestId/sequence와 반환 result를 사용한다. Effect.runPromiseExit 또는 Effect의 typed error 경로로 실제 실패/불확실성을 처리한다.
- pane/tab 선택은 기존 React 메모리에 유지한다. TanStack DB·낙관적 상태·terminal 및 화면 명령 통합 완료는 주장하지 않는다. 실제 UI 데이터 전환과 명령 E2E, TLS/Windows/Linux·실 vendor 검증은 남아 있다.
- owner 정합: application-rpc spec의 미구현 표현/초기 예제를 실제 경계와 인접 tests 참조로 교체하고 configuration-web의 옛 SSE 현재형, system의 연결 소유 표현을 보정했다. wire·서버 계약은 그대로다. 본 작업은 같은 W10 수명의 첫 구현 결과이므로 600행 soft threshold를 넘는 기존 로그 안에 유지하며 별도 workstream으로 분리하지 않는다.

### 2026-09-25 13:29 · 새 파일 포함 최종 검증과 인계 점검

최종 보강: changed-scope 진단은 76개 파일이므로 untracked 신설 파일 누락 가능성을 닫기 위해 full-scope도 실행했다. 설치된 react-doctor가 83개 파일에서 동일한 기존 1 error/7 warnings를 보고했고 신설 연결·Provider 파일의 진단은 없었다. 근거는 /tmp/aiox-rpc-doctor-full.txt다. 공개 workspace entry import로 전환한 뒤 연결·Provider·proxy 3 files / 15 tests를 재실행해 통과했고 Web typecheck·최종 lint/format도 통과했다. log block 도구가 날짜를 자동 부여하므로 중복된 날짜 heading만 수동 정규화했다(heading rename 전용 명령 없음). 로그와 onramp의 W10 next pointer는 이 연결 계층 블록을 가리킨다.

## 2026-09-25 · W10 TanStack DB 상태 저장소

사용자 요청은 완료된 RPC 연결 위에 서버 상태 collection·낙관적 panel 명령·로컬 선택 API를 연결하는 것이다. fixture 전면 교체, 제품 버튼·DnD·알림·터미널 WS·Settings·Keybinding, 서버 계약 변경과 commit/push는 제외한다. 기존 미커밋 RPC 변경과 research 파일을 보존한다.

직접 구현·확인: @tanstack/db 0.9.2와 @tanstack/react-db 0.4.1의 설치 소스와 공식 collection-options-creator 문서를 확인했다. ApplicationStore의 단일 collection에 resource 행과 미확정 intent 행을 구분한다. panel 내부 pane/tab은 wire DTO 그대로이고, applicationView/useApplicationState가 최신 서버 상태 위에 intent를 적용한다. 여러 collection의 write를 원자적이라고 가정하지 않는다. 실제 live query 구독 테스트에서 관련 자원의 단일 publication을 검증했다.

응답 state는 서버 행에 쓰지 않는다. 방송 cursor가 성공 응답의 epoch/version까지 반영될 때 같은 commit에서 intent를 제거한다. snapshot은 현재 상태만 교체하며 과거 요청의 결과를 추측하지 않는다. 거절·결과 불명·sequence-failure 미실행을 분리하고, 불확실한 요청의 자동 재실행은 없다. 명시적 retry는 기존 RPC handle의 식별자를 유지한다. 완료 이력은 collection에 쌓지 않는다.

검증 중 발견·수정: 실제 RPC의 Effect.forkIn 경로에서는 execute 직후 request getter가 아직 undefined였다. panelCommand에 발급 시점의 선택적 onRequest 콜백을 추가해 ID/sequence 발급 책임을 이동하지 않고 intent를 연결했다. 테스트의 동기 mock만으로 이 시점을 단정한 초기 구현을 수정했고 실제 RPC 관측 테스트로 확인한다. React full-scope doctor에서 새 파일의 context 값·export·중첩 lookup 경고를 수정했다. 기존 1 error/7 warnings는 별도 범위이며 score API는 접근 실패다.

현재 focused 5 files/35 tests가 실제 RPC·임시 SQLite·PTY 및 React 수명 포함 통과했다. 최종 추가 회귀·전체 Web build/typecheck/tests와 문서 점검을 이어간다. 초기 sandbox 포트 EPERM은 테스트 전용 권한 확장 실행으로 해결했다. 사용자 daemon·DB·vendor는 사용하지 않는다. 이 블록은 같은 W10 실행 수명의 후속 연결이며 별도 로그로 분리하지 않는다.

### 2026-09-25 14:12 · 저장소 검증 완료와 UI 인계

- 직접 검증: 최종 Web 전체 20 files/132 tests 통과(`/tmp/aiox-store-web-final.txt`). 저장소 단독 23 tests에는 순서 역전·중복·관련 자원 단일 publication·다른 자원의 낮은 delta 보존·실패 격리·agentId key·결과 불명·순번 미실행·명시적 retry·null state와 snapshot 역전이 포함된다. 실제 RPC와 임시 SQLite에서는 preparing 생성→이동→shell 연결, 준비 중 닫힘 뒤 늦은 shell 무효화, 두 앱의 변경 전달, 재접속 삭제 반영·세션 유지와 DB 저장을 확인했다. 테스트 전용 shell은 /bin/sh이며 vendor는 사용하지 않았다. 임시 daemon·DB·PTY는 정리했고 초기 EPERM 실행이 남긴 임시 DB도 열린 프로세스가 없음을 확인한 뒤 제거했다.
- 직접 검증: Web typecheck/build, 관련 source/tests oxlint·oxfmt, 문서 inline-code와 git diff whitespace 점검 통과. 근거는 `/tmp/aiox-store-typecheck.txt`, `/tmp/aiox-store-build.txt`, `/tmp/aiox-store-lint.txt`, `/tmp/aiox-store-format.txt`. build는 500kB 초과 chunk 경고가 있다. React Doctor changed 검사뿐 아니라 새 untracked 파일을 포함하는 full 검사도 실행했고 초기 새 진단을 수정했다. 최종은 기존 1 error/7 warnings만 남는다(`/tmp/aiox-store-doctor-final.txt`, 기존 비교 `/tmp/aiox-rpc-doctor-full.txt`). score API 접근 실패로 점수는 미확인이다.
- 검증으로 보강한 규칙: 같은 세션에서 뒤 요청의 응답·방송이 먼저 확정되면, 현재 상태에 순서상 포함된 앞 intent의 화면 적용을 중단한다. 앞 요청의 성공·실패는 여전히 그 응답 또는 sequence-failure로 판단한다. 앞 응답이 늦거나 result_expired여도 뒤 성공 상태를 덮어쓰지 않는다. 결과가 불명인 요청의 의존 작업은 실제 최신 자원에 projection 가능한지와 확정 실패를 구분한다. pane/split ID 의존은 panel 내부로 한정한다.
- 구현 판단의 근거: 설치된 @tanstack/db 0.9.2의 SyncConfig와 collection/scheduler 구현 및 [공식 custom collection API](https://tanstack.com/db/latest/docs/guides/collection-options-creator)를 확인했다. 일반 row optimistic mutation 대신 명령 intent를 별도 행으로 두어 최신 panel DTO 위에 다시 적용한다. collection 간 원자성이나 라이브러리의 자동 명령 병합을 가정하지 않았다. 서버 DTO·DB schema는 변경하지 않았다.
- UI 공개 API: `@/app/application-state`의 `useApplicationState()`는 서버 상태+intent를 반영한 목록과 pending을 제공한다. `useApplicationStore()`의 collection은 조회용이며 `dismissUnknown(id)`는 결과를 판정하지 않고 불확실성 표시만 지운다. `usePanelCommand()`는 `{id,request,result,retry}` handle을 반환한다. result는 confirmed/rejected/unknown/unexecuted를 구분한다. confirmed는 DB 등록·배치 성공이며 shell 준비 성공이 아니다. retry는 명시적으로 호출할 때만 기존 request를 재사용한다. `usePanelSelection(panelId)`의 selection/select는 앱 메모리 전용이다.

```tsx
// ApplicationProvider 아래 component 내부
const state = useApplicationState();
const send = usePanelCommand();
const { selection, select } = usePanelSelection(panelId);
// 실제 버튼 연결 단계의 handler 예: 이번 작업은 제품 버튼을 연결하지 않았다.
const rename = async (name: string) => {
    const operation = send({ panelId, changes: [{ type: "panel.rename", name }] });
    const outcome = await operation.result;
    return outcome; // unknown을 rejected로 바꾸지 않는다.
};
```

- 비 React consumer는 `@/shared/api/application-store`의 `new ApplicationStore()`에 connection.start(store.onEvent)를 연결하고 store.panelCommand(connection,input), store.getView(), store.dispose()를 사용한다. 연결 start/stop은 여전히 ApplicationConnection이 소유한다. collection에는 terminal view만 있고 화면 바이트·xterm 복원 데이터는 없다.
- owner 반영: aiox-system에 상태 소유·publication·요청/조회/선택 경계를, aiox-application-rpc와 aiox-configuration-web에 구현된 소비 범위와 미연결 제품 경계를 맞췄다. aiox-storage-terminal의 React 미소비 문장도 저장소와 화면을 구분했다. 새 결정 문서·서버 계약 변경은 필요하지 않았다.
- 다음 W10: 실제 DTO에서 기존 panel/notification fixture consumer로 이어지는 화면 조회를 연결하고, 버튼·DnD·resize·읽음 명령에 위 API를 적용한다. WorkspaceView의 fixture 선택을 공유 local selection API로 교체하되 서버 선택 필드는 만들지 않는다. terminal WS/xterm attach·restore, runtime 교체와 사용자 화면 오류 전달은 그 다음 통합 검증이다. 이번에 실제 제품 UI·알림 dropdown·terminal attach·Windows/Linux·vendor·40/200 성능은 검증하지 않았다. W10 전체·화면 연결·터미널 통합은 완료 처리하지 않으며 commit/push도 하지 않았다.

### 2026-09-25 14:23 · P2 sequence-failure 확정 결과 보존

- 사용자 리뷰와 코드에서 확인한 결함: 응답 유실로 unknown이 된 요청이 sequence-failure로 미실행 확정되어 blocked가 된 뒤, 재접속 snapshot의 무조건적인 unknown 전환으로 확정 상태를 잃었다. 자원 복구가 요청 결과의 확실성을 낮추는 오류다.
- 수정: ApplicationStore의 isKnownUnexecuted 판정을 snapshot과 RPC 오류 처리에서 공유한다. 실제 sequence_gap 근거가 있는 요청은 snapshot에서도 blocked·visible:false와 failure 내용을 보존한다. 의존 변경이나 자원 삭제에서 쓰는 일반 blocked 전체를 확정 실패로 간주하지 않는다. 기존 owner의 요청 결과와 현재 자원 상태 분리 계약을 복구한 수정이며 서버 계약·공개 API 변경은 없다.
- 직접 검증: 응답 유실 → unknown → sequence-failure → blocked → snapshot을 같은 epoch와 새 epoch 각각에서 검증했다. 서버 자원 교체와 failure 근거 보존, 자동 재실행 없음도 확인했다. 저장소·React state/provider 3 files/28 tests 통과(`/tmp/aiox-store-p2-regression.txt`), 실제 RPC·임시 SQLite·PTY 포함. Web typecheck·변경 파일 lint/format·git diff whitespace 점검 통과. React Doctor full은 기존 1 error/7 warnings 유지, 새 진단 없음(`/tmp/aiox-store-p2-doctor.txt`), score API는 접근 실패다. Web 전체 tests/build는 이번 국소 수정에서 다시 실행하지 않았다.
- W10의 실제 화면·알림·PTY 연결 next pointer와 open 상태는 유지한다. 기존 미커밋 변경을 보존했고 commit/push하지 않았다.

## 2026-09-25 · W10 제품 화면 실제 상태·명령·알림 연결

이번 사용자 범위는 기존 제품 화면의 실제 조회·panel 명령·알림 읽음 연결이다. 터미널 WS/xterm, Settings·Keybinding, Host 실행 제어, 서버 계약·DB schema 변경과 commit/push는 제외한다. 기존 미커밋 RPC·저장소 변경 및 사용자 research 파일을 보존한다.

직접 확인·구현 중: router fixture loader를 제거하고 AppShell은 useApplicationState의 projected 조회, usePanelCommand와 연결 준비 상태를 소비한다. 기존 AppShell fixture는 Storybook 전용 파일로 옮겼다. WorkspacePage는 Provider 선택을 소비하고 WorkspaceContent로 실제 명령을 전달한다. tab create/move의 즉시 선택은 Provider가 store.getView()로 최신 projection을 검증한다. 새 tab 선택용 별도 React state는 제거했다. 준비 중 닫기, expectedRuntimeId·confirm, tab.dismiss의 clipboard 성공 조건을 보존한다. resize는 사용자 onLayoutChanged 완료에서만 전송하고 서버 비율은 imperative setLayout으로 반영한다.

직접 확인한 계약 차이: 현행 notifications.read RPC는 ids가 필수이며 빈 배열도 전체 읽음이 아니다. Clear all은 현재 notification ID 배열을 보낸다. 읽음 UI는 서버 delta를 기다리고 실패 시 unread를 지우지 않는다. 오래된 fixture의 ids 생략 주석은 현행 RPC 근거로 사용하지 않는다.

검증 진행: Web 전체 22 files/145 tests, typecheck, build 통과. 새 선택 회귀 3 tests 통과. 임시 daemon·SQLite의 실제 브라우저에서 빈 상태·생성·preparing→shell·추가·분할·순서 변경·pane 이동·가장자리 분할·resize와 두 앱의 상태 동기화 및 선택 독립성을 직접 확인했다. 나머지 실패·알림·복귀와 최종 회귀/owner 정합은 진행 중이다. W10과 terminal attach는 완료가 아니다.

### 2026-09-25 15:03 · 제품 연결 검증 결과와 terminal 인계

직접 완료한 범위: sidebar·overview·section·workspace는 useApplicationState의 실제 projected panel/host/network/agent/terminal/notification 조회를 사용한다. router의 fixture loader와 운영 AppShell/Workspace의 서버 상태 복사본을 제거했다. Storybook은 app-shell-preview·workspace-page-preview와 기존 WorkspaceView fixture controller를 사용한다. 실제 WorkspaceContent는 usePanelCommand의 생성·이름 변경·삭제·tab 추가/닫기·분할·이동·resize·dismiss를 호출하며 usePanelSelection만 선택을 소유한다. select는 같은 사용자 동작의 새 projection을 store.getView()로 확인한다. useApplicationConnection의 notifications.read는 단건 ID 또는 전체 현재 ID 배열을 받고 목록은 방송 delta로 갱신된다. useApplicationConnectionState는 로딩/단절 표시에 사용한다. 서버 계약·schema 변경, 새 select 명령·재전송 정책·자동 재실행은 없다.

직접 브라우저 검증: agent-browser 작업 전용 Chromium 세션과 임시 daemon 3개·임시 SQLite에서 빈 화면, 최초 로딩, 직접 panel URL, panel 생성/rename/delete, tab 추가/분할, 포인터 순서 변경/pane 이동/가장자리 분할, 빈 pane 병합, resize와 다른 창의 같은 비율, 두 창의 선택 독립성을 확인했다. preparing을 test harness에서 보류한 뒤 이동·닫고 해제해 늦은 shell 준비가 삭제 tab을 복구하지 않음을 확인했다. 현재 panel의 원격 삭제는 다른 창에서 NotFound로 표시됐다. offline 중 마지막 상태 유지·명령 미실행 안내, online 복귀, 새로고침의 실상태 복원도 확인했다. 실제 notification delta는 새로고침 없이 배지·본문에 나타났고 단건 읽음/삭제된 실행 대상 NotFound·전체 읽음·offline 읽음 실패의 unread 유지도 확인했다. 화면 증거는 /tmp/aiox-ui-layout.png, /tmp/aiox-ui-final.png다. 초기 알림 harness의 rebuild는 active subscriber 방송을 검증하지 못하므로 마지막 harness에서 정상 appState.update({notifications:"reload"})로 실시간 수신을 따로 확인했다.

직접 자동 검증: 저장소·RPC·React 수명·Storybook을 포함한 전체 Web 24 files/152 tests, typecheck, build, 전체 Web source oxlint·oxfmt와 git diff whitespace 통과. 마지막 결과 파일은 /tmp/aiox-ui-tests-final.txt, /tmp/aiox-ui-typecheck-final.txt, /tmp/aiox-ui-build-final.txt, /tmp/aiox-ui-lint-final.txt, /tmp/aiox-ui-format-final.txt다. AppShell UI 테스트는 로딩/빈/없는 panel, 최신 snapshot 반영·선택 무명령·원격 삭제, 거절/result_expired/sequence-failure와 snapshot 후 보존·재실행 없음, 준비 중 닫기와 거절 복구, 알림 읽음 실패·ID 전달·서버 delta 대기·최신 runtime tab 이동, shell 준비 실패와 cleanup 실패 분리, dialog에 표시된 expectedRuntimeId 보존을 검증한다. clipboard 실패 및 terminal 없는 shell 실패에서는 dismiss하지 않는 테스트도 추가했다. React Doctor full은 기존 1 error/7 warnings만 남는다(/tmp/aiox-ui-doctor-final.txt). score API 접근 실패로 점수는 미확인이고 build의 기존 500kB chunk 경고는 남는다.

검증 한계: result_expired·sequence-failure·shell/cleanup 실패는 자동 UI 테스트와 기반 RPC 테스트로 확인했으며 모든 해당 장애를 실제 브라우저 daemon에 주입하지 않았다. 살아 있는 vendor 알림 대상 이동은 UI 자동 테스트로 검증했고 실제 vendor는 실행하지 않았다. terminal bytes/xterm/attach/restore, Settings·Keybinding·새 Host 실행 제어, Windows/Linux 실브라우저는 이번에 검증하지 않았다. 새 서버 결함을 확인한 것은 없다. 최초 포트 EPERM 때문에 남은 테스트 DB는 사용 프로세스가 없음을 확인한 뒤 삭제했고, 성공 harness들은 daemon.stop으로 listener·PTY·DB를 정리했다. readline만 남은 테스트 PID는 별도로 종료했다. 사용자 daemon·개발 DB·vendor는 조작하지 않았다.

owner 정합: aiox-application-rpc·aiox-configuration-web의 제품 미연결 표현과 실제 읽음 소비 범위를 보정하고, aiox-system의 화면/저장소/선택 책임 및 aiox-storage-terminal의 terminal attach 미완료 경계를 맞췄다. 제품 UI 전면 재설계나 새 spec 계약은 없다.

다음 연결 지점: WorkspaceContent의 live terminal placeholder와 TerminalSurface(terminalId+runtimeId key, pane slot 이동), WorkspacePage가 전달하는 실제 TerminalView/AgentView, 기존 attach.ts를 연결한다. 현재 TerminalPreview의 output 빈 문자열·disconnected는 bytes 소비 전의 명시적 미연결 상태다. 화면 연결 완료 후에만 reconnect 완료를 표시하고 attach cleanup은 서버 stop과 분리한다. 현재 선택은 Provider에 계속 두고 terminal 크기·입력·복원 수명만 추가한다. W10과 terminal attach는 open이며 commit/push하지 않았다.

### 2026-09-25 15:22 · P2 리뷰 3건 수정과 회귀 검증

- 사용자 리뷰 후 직접 재현·수정: 지연 삭제 성공 시 commit된 현재 section/panelId가 삭제 대상일 때만 이동한다. 실제 AppShell·memory router·지연 응답 테스트로 이후 `/workspaces/q` 이동 보존과 대상 화면 잔류 시 정상 복귀를 검증했다. 기존 조건에서는 이동 보존 테스트가 실패했다(`/tmp/aiox-p2-delete-red.txt`).
- Host 복사 명령의 directory/sourceFile을 POSIX shell 단일 인용으로 바꾸고 내부 작은따옴표를 분리 인용했다. 실제 `/bin/sh`에서 환경변수, `$()`, 백틱, 공백·작은따옴표가 원래 인자로 전달됨을 검증했다. 기존 코드에서는 치환이 발생했다. aiox는 테스트 shell 함수이며 실제 Host는 실행하지 않았다.
- 공유 WorkspaceDialog는 trim한 이름이 비면 onSubmit을 호출하지 않고 입력과 연결된 alert를 표시한다. 생성·이름 변경 각각 공백 거절·오류 안내·수정 후 제출을 검증했다. 기존 required·길이·제어문자 검증은 유지한다. preview caller도 같은 폼을 소비한다.
- 직접 실행한 최종 검증: Web 25 files/156 tests 통과(`/tmp/aiox-p2-tests.txt`), Web typecheck/build, source oxlint/oxfmt, git diff --check 통과. 최초 sandbox 실행은 포트 EPERM으로 실패했고 허용된 재실행에서 RPC·임시 daemon·SQLite·Storybook까지 통과했다. React Doctor changed는 기존과 같은 1 error/7 warnings(`/tmp/aiox-p2-doctor.txt`), score API 접근 실패로 점수는 미확인이다. 기존 build chunk 경고는 남는다.
- 이번 검증은 실제 컴포넌트 자동 UI 테스트와 shell 실행이다. 운영 브라우저 수동 두 창·재접속이나 terminal WS/xterm은 재검증하지 않았다. 타 agent 보고를 검증 근거로 사용하지 않았다.
- owner 판단: 계약 변경 없는 구현 결함 수정이므로 code/tests와 로그에 반영한다. 기존 미커밋 변경을 보존했으며 architecture.excalidraw·사용자 daemon/DB/vendor는 변경하지 않았다. W10은 계속 진행 중이고 다음은 기존 인계의 terminalId/runtimeId 기반 WS·xterm attach/restore다. commit/push하지 않았다.

## 2026-09-25 · W10 운영 터미널 WS·xterm 연결

- 사용자 범위: W10의 운영 터미널 WS·xterm 연결과 검증. 기존 미커밋 RPC/store/제품 화면 변경을 보존하고 Settings·Keybinding·새 Host 제어 UI·앱 RPC/store/sequence 재설계는 제외했다. commit/push하지 않았고 architecture.excalidraw를 수정하지 않았다. 이번 기록은 주 에이전트가 직접 읽고 실행한 결과이며 타 agent 보고는 사용하지 않았다.
- 직접 구현: WorkspacePage → WorkspaceContent → 실행별 TerminalSurface → ConnectedTerminal → attachTerminal → daemon `/ws/terminal/:terminalId[?runtime=…]` → packages/terminal restore 경로를 연결하고 미연결 안내를 제거했다. terminalId가 없는 준비 탭에는 attach하지 않는다. 기존 `preparing` 중 terminalId가 있는 협업 준비 화면은 이미 존재하는 shell 표시를 유지한다. fixture 화면은 Storybook에 남으며 운영 화면에서 임의 connected나 fixture 출력으로 대체하지 않는다.
- 수명: 보이는 실행의 terminalId/runtimeId를 React key와 연결 상태 key로 사용한다. 같은 실행의 pane 이동은 portal·xterm·WS를 유지한다. 숨김·workspace 이탈·unmount·실행 교체는 attachment만 정리한다. effect별 disposed guard와 attach의 detached guard로 늦은 callback을 차단한다. WS listener abort·ResizeObserver/timer·xterm 입력 listener·xterm dispose는 cleanup이 소유하며 tab.close/kill을 호출하지 않는다. StrictMode에서는 첫 effect를 정리하고 재설치한다.
- 복원·입출력: 기존 restore·serialization·boundary 및 snapshot→bytes→snapshot-end→tail→restored 순서를 재사용했다. 복원 전 입력 차단, xterm 파싱 완료 후 live ACK, binary 사용자 입력과 JSON 자동 응답·response owner·offset·slow viewer 보호는 그대로다. React에 복원 로직을 복제하지 않았으며 서버 production 코드는 수정하지 않았다.
- 크기·포커스·오류: 실제 양수 host 크기로 resize를 요청하고 xterm geometry는 서버 이벤트 순서로 적용한다. pane 명령 완료를 기다리지 않는다. canFocus는 최신 활성 pane을 확인하고 복원 중 다른 UI로 이동한 포커스를 빼앗지 않는다. restoring/connected/disconnected/exited/failed/unrestorable 이벤트를 UI로 전달한다. 재연결 중 기존 원인을 유지하고 restorable:false는 재연결을 막는다. 명시적 종료는 기존 confirm·expectedRuntimeId panel 명령을 사용한다. 앱 RPC·shell 준비·terminal 연결·cleanup 실패 경계는 유지한다.
- URL: HTTP는 ws, HTTPS는 wss를 사용한다. Vite의 `/api/rpc`와 `/ws/terminal` proxy가 같은 origin 검사를 사용한다. 새 의존성은 추가하지 않았다. build 성공 및 산출 JS에서 node:fs/node:net/node-pty/@xterm/headless 미포함을 확인했다.
- 직접 자동 검증: `pnpm --filter @aiox/web test` 최종 26 files/166 tests PASS(`/tmp/aiox-terminal-web-final.txt`). Web typecheck·build·apps/web 전체 oxlint·oxfmt·git diff --check PASS. 신규 ConnectedTerminal 회귀는 preparing→준비 완료·준비 중 이동/제거, pane 이동 유지, 탭 교체·복귀, runtime 교체·이전 callback 차단, StrictMode 정리, 실패 원인 보존·복원 불가·exit·캡처한 runtime 종료 확인을 검사한다. 기존 앱 RPC/낙관적 명령/선택/알림/종료 실패 테스트도 통과했다. attach 테스트는 URL 선택, 0/분리된 host, 활성 pane focus, 입력/ACK/resize 순서와 실패 분류를 검사한다. 초기 sandbox 포트 EPERM은 허용된 재실행으로 해소했고 Storybook 첫 의존성 캐시 실패도 재실행에서 해소됐다.
- 직접 서버/terminal 회귀: `pnpm --filter @aiox/daemon exec vitest run --config ../../vitest.config.ts src/terminals.test.ts src/web-commands.test.ts src/agent-controller.test.ts` 3 files/97 tests PASS(`/tmp/aiox-terminal-server.txt`). `pnpm --filter @aiox/terminal test` 4 files/88 tests PASS(`/tmp/aiox-terminal-package.txt`). 실제 임시 SQLite·PTY를 쓰며 restore·serialization·boundary·slow viewer·응답 권한·입력 차단·종료 보호를 포함한다.
- 직접 브라우저: agent-browser 별도 세션과 임시 home/SQLite/daemon을 사용했다. 처음 생성한 기본 zsh의 입력·출력과 드래그 이동을 확인한 뒤, 임시 config에 `/bin/sh`와 임시 cwd를 지정해 순수 PTY를 검증했다. `/bin/sh` PID 87432의 PLAIN_PTY → AFTER_RECONNECT → AFTER_BROWSER_REOPEN 출력을 확인했다. terminal WS만 닫으면 개별 단절 UI가 나타나고 앱 RPC는 유지됐다. Reconnect는 같은 terminalId로 돌아왔고, workspace 이탈에서 WS close·복귀에서 화면 복원, 브라우저 완전 종료·새 창에서 이전 화면과 동일 PID의 입력 지속을 확인했다. Vite proxy에서도 복원·입력, pane 이동 시 동일 WS 객체(OPEN)·동일 xterm DOM 유지, 실제 splitter 변경 시 stty size 30×64→30×46을 확인했다. 이동 후 다른 pane이 대체 탭을 선택해 만드는 별도 attachment는 이동한 실행의 재생성과 구분했다. 종료 Cancel은 탭/화면 유지, 확인은 탭 제거와 PID 부재로 검증했다. 캡처는 `/tmp/aiox-terminal-plain.png`, `/tmp/aiox-terminal-proxy-resize.png`, `/tmp/aiox-terminal-final.png`다.
- React Doctor: 설치된 0.9.14의 full JSON scan(schemaVersion 3, ok:true)에서 기존과 같은 1 error/7 warnings, 새 진단 없음(`/tmp/aiox-terminal-doctor-final.json`). 기존 router error boundary·theme context·lookup·큰 컴포넌트/복잡도·fixture state·non-component export 진단은 이번 범위에서 변경하지 않았다. score API 연결 실패로 점수는 미확인이다. Vite 기존 500kB chunk 경고도 남는다.
- owner 반영: aiox-configuration-web·aiox-application-rpc·aiox-system·aiox-storage-terminal의 후속/미연결 구현 상태를 실제 연결 상태로 갱신했다. 외부 복원·종료·RPC 계약은 바꾸지 않았다. 제품 문서의 owner map과 sibling 경계는 유효하므로 새 문서나 decision을 만들지 않았다.
- 제한·미검증: 실 TLS handshake/HTTPS reverse proxy, 실 Claude/Codex vendor TUI, Windows/WSL/Linux, 실제 브라우저의 slow viewer·미러 실패·복원 불가·프로세스 종료 실패 주입은 실행하지 않았다. 해당 실패 분류·보호는 자동 테스트 범위이며 실제 vendor 검증으로 주장하지 않는다. pane DOM 이동 중 입력 focus 자체의 유지까지 보장하지 않으며, 검증한 focus 범위는 복원 시 활성 pane 제한과 사용자 선택에 따른 focus다. 임시 daemon은 daemon.stop(true) 완료를 확인했고 임시 DB/home과 본인 Vite·브라우저만 정리했다.
- 다음: 이번 터미널 통합 단계는 완료다. W10 전체는 진행 중으로 유지한다. Settings·Keybinding 연결, 보류된 통합 시나리오와 미검증 플랫폼/vendor 범위는 후속에서 범위를 확정해 검증한다. 새 shell 생성 없이 복원하는 계약과 runtime guard를 유지해야 한다.

### 2026-09-25 15:52 · 최종 검사와 임시 자원 정리

- 최종 확인: Web 26 files/166 tests, typecheck/build, apps/web 전체 oxlint·oxfmt, git diff --check PASS. 최종 산출물과 일치하며 새 의존성·서버 production 변경은 없다.
- React Doctor changed(`--base HEAD --include-untracked`)는 기존 router/terminal-body의 1 error/1 warning만 보고했다(`/tmp/aiox-terminal-doctor-changed.json`). full의 기존 1 error/7 warnings와 범위가 다르며, 새 진단 없음·점수 미확인 판정은 동일하다.
- 종료 확인: 검증 shell PID 87432는 명시적 종료 뒤 부재, 임시 daemon은 `Daemon stopped` 완료, 임시 home/DB 경로는 존재하지 않음을 확인했다. 본인 Vite PID 93818과 격리 브라우저도 종료했다. W10 next pointer와 Required Context를 Settings·Keybinding 및 남은 통합 범위로 맞췄고 open 상태를 유지했다.

### 2026-09-25 16:03 · 기능 리뷰 통과 보고와 RPC 명세 잔여 문장 정정

- 사용자 리뷰 보고: 기능 코드의 Standards/Spec 리뷰를 통과했으며 새 기능 결함은 발견하지 못했다고 전달했다. 사용자가 Web 166개·서버 회귀 97개·terminal 88개와 typecheck/build/lint/format/diff 점검을 직접 재실행해 통과했다고 보고했다. 이번 리뷰에서 운영 브라우저 수동 검증과 React Doctor는 재실행하지 않았고, 번들 크기 경고·실 TLS/vendor/다른 OS·이동 중 입력 포커스 유지 제한은 그대로라고 밝혔다. 이는 사용자 보고이며 이번 정정 턴의 에이전트 직접 재실행 결과로 기록하지 않는다.
- 에이전트 직접 확인·정정: RPC 명세 162행에 “실제 화면 명령 및 xterm 통합은 후속 Web 작업”이라는 stale 문장이 남아 있었다. 운영 WorkspaceContent→ConnectedTerminal→attachTerminal 연결과 기존 직접 검증 기록, 같은 문서의 경계 절 및 configuration-web/storage-terminal owner를 대조해 문서 정정이 타당함을 확인했다. 해당 문장을 구현 완료와 Web·임시 daemon/SQLite/PTY·브라우저 검증 범위로 바꾸고 터미널 계약 owner 링크를 붙였다. “서버 RPC 통과를 제품 경로 완료 근거로 사용하지 않는다”는 검증 구분은 유지했다.
- 이번 직접 검증은 관련 owner의 동일 stale 문구 검색, 변경 문장·링크 및 git diff --check다. 문서·로그만 수정했으므로 기능 테스트·브라우저·React Doctor를 다시 실행하지 않았다. 코드 변경과 commit/push는 없으며 W10은 진행 중, next는 Settings·Keybinding 및 남은 통합 검증 범위 확정으로 유지한다.
