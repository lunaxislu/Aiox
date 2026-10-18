---
topic: Network Host Member Page Design
description: Network·Host panel을 일반 pane 대신 멤버 패널과 terminal 전용 페이지로 재설계
status: open
---

## Work Items

- [x] W1 Claude 앱 디자인용 프롬프트 작성 및 시안 수령
- [>] W2 시안 확정 후 docs/specs에 spec 작성(웹 POST /api/networks 허용, host 정의 파일 hash 기록, open-definition endpoint 보안, 웹 Restart env 출처, Add agent cwd 기본값·서버 검증 포함)
- [ ] W3 panelViewSchema kind·section 불일치 거부와 panel.create section 축소
- [ ] W4 daemon Add agent web endpoint(launch 재사용)와 AddAgentDialog·CreateNetworkDialog·MemberSidebar 구현

## Required Context

### Return Target

- None: independent log.

### {Global}

- 결정 범위: Network·Host panel은 좌측 MemberSidebar(멤버·상태·routes)와 우측 기존 PaneTree 재사용. Host는 같은 틀에 workPath와 Restart. Workspace panel은 변경 없음.
- 관련 현재 작업: logs/2026-09-09-AIOX-TUI-Stage6-Web.md(Stage 6 운영 Web). 이 로그는 그 흐름에서 갈라진 독립 디자인 workstream이다.


## 2026-10-14 · Network·Host 화면 한계 진단과 디자인 방향 결정

### 진단 (코드 확인 사실)

- 웹 Section의 `+`는 `panel.create`를 보내고 daemon은 section과 무관하게 항상 `kind:"workspace"` panel을 만든다(`apps/daemon/src/web-commands.ts:316`). 그래서 Networks/Hosts 목록에 일반 shell pane이 생긴다.
- `panelViewSchema`(`packages/protocol/src/host.ts:599`)는 `kind=workspace`와 `section=networks|hosts` 조합을 막지 않는다.
- 진짜 network panel은 `aiox network create`가 만든다(`packages/persistence/src/sqlite/database.ts:249`, 빈 pane). 다른 workspace pane의 `aiox agent run --network X`는 b1d7cbb 이후 서버가 network panel에 agent tab을 만들어 실행한다(`apps/daemon/src/network-agent.ts:14`).
- network panel 안의 `+`도 일반 shell tab을 연다(`apps/web/src/pages/workspace/pane-tree.tsx:443`).
- 내부 `launch(services, input, panelId)`는 terminalContext 없이도 tab 추가와 실행을 하고, `launchInNetwork`만 caller terminal을 인증한다. `POST /api/networks`는 이미 있다(`apps/daemon/src/http.ts:333`).
- 추론: 서버 경로보다 웹에 network/host 전용 화면과 입력 경로가 없는 것이 한계의 본체다. 웹 origin의 `POST /api/networks` 허용 여부는 미확인.

### 사용자 결정

- 화면 주인공: 멤버 패널 + terminal(관계도·terminal grid만 강화 안은 기각).
- Host: 같은 틀, 내용만 다르게(workPath·정의 파일, Add agent 대신 Restart).
- Add agent: 폼(adapter·name·role·instruction?) → 서버가 바로 실행. 실패 시 dialog 안에 서버 진단 표시.
- 목록 `+`: Networks는 Create network dialog(기존 POST /api/networks), Hosts는 제거하고 CLI 안내만.
- terminal 영역: 기존 PaneTree(split·tab·drag·저장 layout) 재사용, shell `+`는 숨김. 멤버 클릭 시 해당 tab으로 포커스.
- 범위 밖: topology 그래프, 웹 route 편집, 웹 Host 생성, 멤버 제거 UI.
- 다음: 구현 전에 Claude 앱 디자인으로 시안을 먼저 받는다.

### 2026-10-14 13:44 · Claude 앱 디자인 프롬프트 전달

- 사용자 요청으로 구현 전에 Claude 앱 디자인 시안을 받기로 했다. 프롬프트는 대화에서 전달했다.
- 프롬프트에 넣은 제약: 현재 스택(React, shadcn `base-nova`·neutral, Tailwind v4, Geist, lucide, light/dark), 위에서 결정한 화면 구성, agent 상태 5종(`idle`·`working`·`awaiting-user`·`failed`·`aiox-preparing`)과 `executionOwnership`(daemon·external), 범위 밖 항목.
- W1은 시안을 받을 때까지 active로 유지한다.

### 2026-10-14 14:25 · 시안 v10 검토와 Host DEFINITION 재설계

- 시안: `logs/artifact/aiox-version.10.html`(3.6MB 단일 HTML, Host 관련 부분만 검색해 확인). 사용자 평가는 전반적으로 괜찮음.
- 문제: Host DEFINITION의 workPath·정의 파일 복사와 빈 Hosts 화면의 `aiox host run` 복사(임시 값)는 붙여넣어 실행할 대상이 없다.
- 결정(사용자 동의):
  1. 정의 파일 변경 표시: "Changed since start" + Restart 유도. 근거 사실은 DB가 `sourceFile` 경로만 저장한다는 것(`packages/persistence/src/sqlite/host-schema.ts:18`). 실행 시점의 파일 hash 기록이 서버에 추가로 필요하다.
  2. [Open]: 특정 에디터 URL 대신 daemon이 OS 기본 앱으로 연다(macOS `open`, Linux `xdg-open`, Windows `start`). endpoint는 `hostId`만 받고 열 경로는 DB의 `sourceFile`로만 정한다(임의 경로 금지). ⋯ 메뉴에 Reveal in Finder/Explorer와 Copy path를 둔다.
  3. 빈 Hosts 화면: 실행 명령 복사 대신 정의 파일 예시와 "Workspace terminal에서 실행" 안내, Workspace 열기 버튼.
- spec 단계에서 확인할 것(미확인):
  - 정의 파일 확장자와 기본 앱이 편집기가 아닐 때의 처리(macOS `open -t` 여부)
  - daemon이 127.0.0.1이 아닌 주소일 때 Open 숨김 여부(`apps/daemon/src/daemon.ts:126`)
  - 웹 Restart의 env 출처(`hostRestartRequestSchema`가 caller env를 받음)
- 시안 수정 프롬프트를 대화에서 전달했다. W1은 수정 시안을 받을 때까지 active.

### 2026-10-15 12:17 · 시안 v11 검토 — cwd·dialog·포커스·사이드바 피드백

- 시안: `logs/artifact/aiox-version11.html`. Host DEFINITION·빈 Hosts 수정은 사용자 평가 "전부 좋음".
- 사용자 피드백 6가지와 확인 사실:
  1. Add agent의 시작 경로가 없다. 사실: `AgentRun.cwd`는 필수(`packages/protocol/src/core.ts:122`)이고 `launch`는 `input.cwd`로 shell을 만든다(`apps/daemon/src/network-agent.ts:108`). network 테이블에는 cwd가 없다(`persistent_networks`는 id·name만). v11 Add agent 폼은 adapter·name·role·instruction만 있다. → 폼에 Directory 필드가 필요하다.
  2. dialog가 UX를 해친다 → modal 대신 inline 방식으로 다시 요청한다(Create network는 목록 inline 입력, Add agent는 pane 안 draft tab 폼).
  3. 사용자가 보낸 이미지는 이 세션에서 보이지 않았다. 시안의 상태 토글 바 또는 멤버 상태 5종 중 하나로 추정되며 사용자 확인이 필요하다.
  4. pane drag 이동과 포커스 opacity가 시안에 없다. 사실: 현재 코드는 비포커스 pane `opacity-60`, 포커스 pane `opacity-100`이다(`apps/web/src/pages/workspace/pane-tree.tsx:414`). 사용자가 말한 0.8과 다르므로 값 확인이 필요하다. drag는 `workspace-dnd.tsx`에 있다.
  5. 원격 daemon 변형은 의미가 없어 제거한다(Open 숨김 조건도 spec에서 뺀다).
  6. 앱 사이드바 토글과 Network·Host 멤버 사이드바 데스크톱 토글이 필요하다. 사실: 현재 앱은 header에 `SidebarTrigger`가 있다(`apps/web/src/widgets/header/app-header.tsx:38`). 시안에만 없다.
- 시안 재수정 프롬프트를 대화에서 전달했다. W1은 수정 시안을 받을 때까지 active.

### 2026-10-15 12:22 · 논의 1 결정 — cwd는 포커스 터미널, 입력 UX는 외부 사례 조사

- 진행 방식 정정: 사용자는 6개 피드백을 한 번에 결정하지 않고 한 항목씩 ASCII 시각화로 논의하기를 원한다. 직전 entry의 v12 프롬프트는 폐기한다.
- 용도(사용자 진술): 이 디자인은 마이그레이션하는 프로젝트의 디자인으로 쓴다.
- 결정 1(cwd): Add agent의 시작 경로는 마지막으로 포커스한 workspace 터미널의 cwd를 따른다(선택지 C). 폼에는 시작 경로를 표시만 한다. 열린 터미널이 없을 때와 기준 터미널을 사용자에게 어떻게 보일지는 미정이다.
- 논의 2(dialog): 사용자 의견은 modal dialog가 여러 작업을 동시에 하는 것을 막는다는 것이다. 결정 전에 subagent로 외부 UX 사례를 조사한다. 대상은 Paseo, OpenRig(`research-idea/similar-project.md`), OpenCode TUI(`research-idea/openCode.md`)다.

### 2026-10-15 12:25 · 외부 UX 사례 조사 결과 (Paseo·OpenCode·OpenRig)

- subagent 2개가 공식 저장소를 scratchpad에 shallow clone해서 읽었다(repo 밖, 앱 실행·스크린샷 확인은 하지 않음).
- Paseo(`getpaseo/paseo` 8ff2424):
  - agent 생성은 modal이 아니라 draft tab이다(`⌘T` → Agent). 제출하면 같은 tab이 agent tab으로 바뀌고, 실패하면 draft로 돌아가 오류를 보인다.
  - cwd는 workspace에 속하고 workspace 생성(`⌘N`, 별도 화면)과 agent 생성은 별개 동작이다.
  - 상태는 sidebar 점으로 보이고 needs_input > failed > running 순으로 정렬하며 favicon도 바뀐다. `⌘B`/`⌘E`/`⌘.`로 sidebar를 접는다.
  - agent 화면은 xterm이 아니라 chat이다.
- OpenCode desktop(`anomalyco/opencode` 37df62f):
  - 탭 종류는 `Session | Draft`다. 새 탭은 활성 탭의 directory를 이어받는다(`shell/titlebar/titlebar.tsx:326-390`).
  - 첫 제출에서 draft가 같은 자리에서 session으로 원자적으로 바뀐다. draft별 입력 상태는 저장된다.
- OpenRig(9afcfd5): GUI 생성 폼이 없다(CLI `rig grow --cwd`, 기본값은 process.cwd). needs-input은 상태 값이 아니라 `{count, reason}`이다. Web UI는 maintenance mode다.
- 추론: 결정 1(포커스 터미널 cwd)은 OpenCode의 활성 탭 상속과 같은 형태라 선례가 있다. modal 대체로는 draft tab이 두 사례에서 공통이다.

### 2026-10-15 12:31 · 논의 2 결정 — Add agent는 오른쪽 drawer (form·정보·콘솔)

- 사용자 제안으로 draft tab(A)과 사이드바 inline 폼(B) 대신 오른쪽 drawer(C)를 택했다. drawer는 modal이 아니어서 터미널을 보며 입력할 수 있다.
- drawer 내용 3가지(사용자 결정):
  1. form: `+ Add agent`로 연다. 시작 경로는 결정 1대로 포커스 터미널 cwd를 표시만 한다.
  2. 정보: 멤버를 클릭하면 그 agent의 role·cwd·routes·instruction을 읽기 전용으로 보인다. 근거 사실: 실행 중 agent 정보를 바꾸는 서버 경로가 없다.
  3. 콘솔: 멤버가 아닌 일반 shell이다. `aiox` 명령이나 `git`을 치는 용도다.
- form 입력 중 다른 멤버를 클릭해 drawer 내용이 바뀌어도 입력은 유지한다(사용자 결정).
- 남은 논의: drawer 내 전환 구조, 콘솔 shell의 cwd·수명, 4영역 레이아웃의 폭(6번 토글과 연결), Create network 방식.

### 2026-10-15 12:34 · 결정 2-1 drawer 상단 tab, Paseo Command Center 확인

- 결정 2-1(사용자): drawer 안 전환은 상단 tab(A)으로 한다. 정보·New agent·Console tab이 함께 살아 있고, 멤버를 클릭하면 정보 tab이 그 멤버로 바뀐다. 제안한 세부 규칙(Launch 성공 시 New agent tab 닫고 정보 tab을 새 멤버로)은 사용자 반대가 없었다.
- Paseo "만능 콘솔" 확인(`getpaseo/paseo` 8ff2424, `packages/app/src/command-center/`):
  - 정체는 shell이 아니라 `⌘K` Command Center(command palette)다. web에서는 `Modal`, mobile에서는 bottom sheet로 뜬다(`command-center.tsx:728-800`).
  - 검색 대상은 명령·파일·workspace·agent다(placeholder "Search commands, files, workspaces, and agents...", `i18n/resources/en.ts:83`).
  - 결과 그룹은 Actions·Files·Workspaces·Agents다. "Open X in side pane / in focused pane", "New agent", split·focus·tab 조작, 현재 agent의 Model·Thinking·Mode·Plan·Fast 전환이 있다(`agent-control-contributions.ts`, `workspace-contributions.ts`).
  - 파일 검색은 scope chip으로 좁히고, `#42`·`pr 42` 같은 PR 번호 질의를 인식한다(`workspace-search.ts`).
- 추론: 열고 → 고르고 → 닫히는 순간 동작이라 drawer 콘솔(계속 살아 있는 shell)과 역할이 다르다. 둘 중 무엇을 원하는지 사용자 확인이 필요하다.

### 2026-10-15 12:39 · 결정 3 — 콘솔은 앱 전체에 하나, 새로고침 후에도 유지, cwd는 생성 시 한 번

- 확인 사실: daemon의 shell은 항상 panel tab에 속한다. tab에 붙지 못한 shell은 cleanup 대상으로 추적된다(`apps/daemon/src/web-commands.ts:594` `shell-unjoined`, `:614` `shell-cancelled`). 앱 전체 단위의 terminal 소유 칸은 없다.
- 결정(사용자):
  - 수명: 콘솔은 앱 전체에 하나이고 어느 panel에서 열어도 같은 shell이다. 새로고침해도 살아 있어야 한다.
  - cwd: 처음 만들 때 포커스 터미널의 cwd를 한 번만 이어받는다. 이후는 사용자가 직접 cd한다.
- 추론(spec에서 확정할 것):
  - panel이 아닌 앱 수준의 소유 칸(console terminalId 하나)을 저장소에 새로 둬야 한다. cleanup이 이 shell을 고아로 보지 않게 해야 한다.
  - 열린 터미널이 없을 때의 첫 cwd는 미정이다.
  - Console tab [×]의 의미(shell 종료인지 drawer에서만 닫기인지)는 미정이다.

### 2026-10-15 12:41 · 결정 3-3 — Console [×]는 숨김, exit하면 새 shell로 자동 교체

- 결정(사용자):
  - Console tab의 [×]는 drawer 화면에서만 숨긴다. shell은 계속 실행된다.
  - shell이 exit하면 버튼을 거치지 않고 자동으로 새 shell로 바꾼다. 앱 전체에 콘솔이 하나뿐이라는 불변이 유지된다.
- 가정(사용자 미확인): 새 shell의 cwd는 그 시점 포커스 터미널의 cwd다(결정 3의 "만들 때 한 번" 적용). 열린 터미널이 없으면 `~`다.
- 추론(spec): exit를 감지해 다시 만드는 주체는 daemon이다. 웹이 닫혀 있어도 콘솔 하나가 유지된다. 재생성이 계속 실패할 때(shell 즉시 종료 반복)의 중단 조건이 필요하다.

### 2026-10-15 12:45 · 결정 4 — Create network는 목록 inline 입력

- 결정(사용자): Networks 목록의 [+]를 누르면 목록 안에 입력 줄이 생긴다(A). Enter는 생성, Esc는 취소다. 중복 이름 오류는 그 줄 아래에 보인다.
- 제안 포함(사용자 반대 없음): 생성 후 새 network 페이지로 이동하고 drawer를 New agent tab으로 연다.
- 근거 사실: 입력값은 이름 하나다(`persistent_networks`는 id·name만). 서버에는 `POST /api/networks`가 있다.

### 2026-10-15 12:48 · 결정 5 — 비포커스 pane opacity 0.8과 포커스 ring

- 확인 사실: tab drag(tabbar 끼우기와 본문 상하좌우 split)와 포커스 opacity는 이미 구현되어 있다(`apps/web/src/pages/workspace/workspace-dnd.tsx`, `apps/web/src/pages/workspace/pane-tree.tsx:269`, `:414`). 현재 값은 비포커스 0.6이다. v11 시안에만 빠져 있었다.
- 결정(사용자): 비포커스 pane과 tab은 opacity 0.8, 포커스 pane에는 얇은 focus ring을 더한다.
- 영향(추론): `pane-tree.tsx`를 공유하므로 Workspace 화면도 같이 바뀐다.

### 2026-10-15 12:55 · 결정 6 — 사이드바와 drawer는 각자 토글

- 확인 사실: 앱 사이드바 토글은 이미 있다(`apps/web/src/widgets/header/app-header.tsx:38` `SidebarTrigger`). v11 시안에만 빠져 있었다.
- 결정(사용자): App 사이드바, MEMBERS, DRAWER를 각자 토글한다(A). 한 번에 모두 접는 집중 모드는 넣지 않는다.
- 제안 포함(사용자 반대 없음):
  - 접힌 MEMBERS는 터미널 왼쪽 위에 펼치기 버튼과 needs input 개수 badge로 남는다.
  - 펼침/접힘 상태는 앱 전체에 하나로 저장하고 새로고침 후에도 유지한다.

### 2026-10-15 13:01 · 결정 7 — Network·Host tab bar 버튼 제거, drag·split은 현재 구현 그대로

- 확인 사실:
  - v11의 tab bar 우측 두 버튼은 `Split pane`(columns-2)과 `More`(ellipsis)다. 둘 다 동작이 연결되지 않았고 ⋯ 내용도 정의되지 않았다.
  - 현재 앱의 버튼은 New shell·Split right·Split down·Status bar다(`apps/web/src/pages/workspace/pane-tree.tsx:333-400`).
  - drag drop은 위치(상하좌우·tabbar)를 미리 보여 주고 `tab.move`로 보낸다(`apps/web/src/pages/workspace/workspace-page.tsx:182`). 가장자리 drop이 서버에서 split되는지는 읽지 않았다(추론).
- 결정(사용자):
  - ⋯(More)과 Split 버튼은 제거한다.
  - drag와 pane 분할은 현재 프로젝트 구현 그대로 간다.
  - Status bar 토글도 제거한다. cwd는 drawer 정보 tab(결정 2)에서 본다.
- 해석(사용자 확인 전): Network·Host tab bar 우측에는 버튼이 남지 않는다. 분할은 drag로만 한다.
- 다음: 결정 1~7을 모은 v12 시안 프롬프트를 전달한다.

## 2026-10-16 · v13 수령, 반응형·교체 범위·생성 입력 줄·오류 위치 결정과 v14 프롬프트

### 2026-10-16 13:36 · v13 검토와 결정

- 시안: `logs/artifact/aiox-version13.html`. 사용자가 디자인 Claude에 직접 요청한 수정은 그대로 채택한다.
- 확인 사실(번들을 scratchpad에 풀어 확인):
  - v10~v13 어디에도 `@media`가 없다. v10·v11은 미리보기 토글 `1440 / 900`(narrow 시 사이드바 overlay·닫기 버튼)이 있었고, v12부터 빠졌다.
  - v13 Create network 입력 줄은 빈 이름 Enter를 무시하고 서버 대기 상태 없이 바로 생성·이동한다.
  - 현재 앱 기준은 `useIsMobile` 768 하나다(`apps/web/src/shared/hooks/use-mobile.ts`). 현재 Workspace `+`는 modal 입력 후 서버 확정 전에 이동한다(`apps/web/src/app/app-shell.tsx` `submit`).
  - 현재 일시 오류는 모두 헤더 아래 `<p role="alert">`로 쌓인다(`app-shell.tsx`, `command-feedback.tsx`, 캡처 09).
- 결정(사용자):
  1. 반응형 기준은 768 하나. `< 768`에서 App sidebar·MEMBERS는 왼쪽 Sheet, DRAWER는 오른쪽 Sheet, terminal만 inline. `≥ 768`은 결정 6의 각자 토글.
  2. Workspace `+`도 Networks와 같은 inline 입력 줄로 바꾼다. 기본 이름 전체 선택, Enter는 변경 여부와 무관하게 생성, `Creating…` 대기, 서버 확정 뒤 이동.
  3. 입력 줄 blur는 취소.
  4. 교체 범위 4층: A 앱 전체 덮개(main, 캡처 37 형태, sidebar·header 유지) · B 페이지 교체 · C shell 하나(탭 본문) 교체 · D 일시 오류. A가 떠 있으면 C는 보이지 않는다.
  5. D 위치: ① 조작한 그 자리 ② 명령을 보낸 pane 안 한 줄 ③ 헤더 `⚠` badge + popover(결과 unknown·cleanup 실패·설정 로드 실패). 알림 읽음 실패는 🔔 popover 안. toast와 헤더 아래 쌓기는 쓰지 않는다.
- 미확인(spec에서): ②를 위해 `reportOutcome`이 명령을 보낸 pane을 알 수 있는지. 기본 이름 생성 규칙(client 제안 여부).
- v14 시안 프롬프트를 대화에서 전달했다. 프롬프트 파일은 따로 만들지 않고, 추가 요청 내용만 아래에 남긴다.
- v14 프롬프트에서 v13 위에 추가로 요청한 것(v13 화면·문구·상호작용은 변경 금지, 상태마다 미리보기 preset):
  1. 반응형: 폭 토글 `Desktop 1440 | Mobile 390`과 `< 768` sheet 배치(결정 1). 헤더에 sheet 버튼, MEMBERS 버튼에 needs-input badge.
  2. A 앱 덮개: Connection lost 재연결 중·중단(+Reload page), Loading application…, 렌더 오류(Reload page + 접힌 상세). 문구 박스는 배경 없이 text-shadow halo, pane 구분선은 비쳐도 됨.
  3. B 페이지: 첫 진입 overview(Networks는 CLI 복사 대신 + 입력 줄 유도, Hosts는 v13 그대로), Workspaces 0개·Networks 0개 섹션, Not found + 섹션 링크.
  4. C 탭 본문: 현재 `terminal-body.tsx`의 연결 카드 5종(disconnected·reconnecting·screen 복원 실패·복원 불가·process exited)과 탭 안내 5종(preparing·start failed/crashed·unavailable 명령 유무·daemon 재시작 후), 새 shell의 "Shell 연결 중". 문구는 현재 코드 문구를 그대로 넘겼다.
  5. 생성 입력 줄 흐름(결정 2·3)과 결과: 성공 시 Network는 MEMBERS 0명 + DRAWER New agent, Workspace는 pane 1·shell 탭 1 → Shell 연결 중 → 프롬프트. 중복·서버 거부는 줄 아래 오류, 연결 끊김은 A 덮개.
  6. Rename도 같은 입력 줄(대기·오류 포함).
  7. D 위치(결정 5)의 구체 예: pane 한 줄 "Move rejected: <reason>" + Dismiss, 헤더 ⚠ popover 항목(결과 unknown·cleanup 실패·설정 로드 실패), 🔔 안 읽음 실패, 복사 버튼 "Copy failed".
- 내가 정한 임시 값(사용자 확인 전): 문구 `Could not load settings`·`Something went wrong`, 모바일 미리보기 폭 390.

### 2026-10-16 · v14 수령 — 요청 항목 반영 확인

- 시안: `logs/artifact/aiox-version14.html`. 번들을 scratchpad에 풀어 preset 그룹과 로직을 대조했다(화면을 띄워 눈으로 보지는 않음).
- 확인 사실:
  - preset 그룹: `반응형`(Mobile 기본·App/MEMBERS/DRAWER sheet) · `A · 앱 덮개`(재연결 중·중단·첫 로딩·렌더 오류) · `B · 페이지`(첫 진입·Workspaces 0개·Networks 0개·Not found) · `C · 탭 본문`(12종) · `생성 · Rename`(11종) · `D · 일시 오류`(pane 한 줄·⚠ 0/2+popover/3개·🔔 읽음 실패·삭제 결과 unknown·복사 실패) · `v13`(기존 preset 10종 유지).
  - 입력 줄: 기본 이름 `<base>-<n>`(겹치지 않게 증가)을 선택 상태로 시작, 빈 이름 Enter 무시, blur는 pending이 아닐 때 취소, Enter는 `Creating…` 뒤 결과 분기. 시뮬레이션의 연결 끊김 결과는 A 덮개로 간다.
  - toast는 없다. `@media`는 여전히 없고 반응형은 폭 토글로만 보여 준다(요청대로).
- 판단: 프롬프트로 요청한 항목은 모두 preset으로 존재한다. 시각 평가는 사용자 확인 대상이다. W1은 사용자 확인까지 active.

## 2026-10-18 · v14 확정, W1 완료

- 사용자가 v14 시안을 확인하고 승인했다("괜찮은데?"). W1을 완료한다.
- 임시 값(`Could not load settings`·`Something went wrong`·모바일 미리보기 390)은 사용자 반대 없이 v14에 반영된 상태로 둔다. 문구는 W2 spec에서 확정한다.
- 다음: W2(spec). 사용자 착수 지시 전까지 `[ ]` 유지.

### 2026-10-18 · W2 착수 — spec 전 사전 확인 3건

- 사용자 지시로 W2를 active로 바꿨다. 1번은 subagent(Explore), 2·3번은 직접 확인했다.
- 1번 D②(pane 한 줄) 가능 여부. 확인 사실:
  - `useCommandFeedback`(`apps/web/src/app/command-feedback.tsx:5-27`)는 operation 하나만 받고, 전역 message 1개를 헤더 아래에 렌더한다. pane·명령 종류는 모른다.
  - 결과 객체(`webCommandResultSchema` `packages/protocol/src/host.ts:759`, 실패 `applicationFaultSchema` `packages/protocol/src/rpc.ts:37`)에는 pane/tab id가 없다. 요청의 `changes[]`에는 있다.
  - workspace 호출부(`apps/web/src/pages/workspace/workspace-page.tsx` tab.move·tab.create/split·tab.close·tab.dismiss)는 `operation.result`를 받는 시점에 tabId/paneId를 가진다. unknown/blocked는 이벤트로 오지만 pending row에 `input.changes`가 남는다.
  - 판단(추론): rejected/unexecuted를 pane 한 줄로 보내려면 client만 고치면 된다(호출부에서 paneId·명령 label 전달). protocol 변경은 필요 없다. panel.create/rename/delete와 resize는 보낸 pane이 없으므로 ①(조작 자리)이나 ③(헤더 ⚠)로 간다.
- 2번 기본 이름. 확인 사실: 서버는 이름을 받기만 한다. network는 UNIQUE에 `/` 금지이고 겹치면 `duplicate_name`(`apps/daemon/src/networks.ts:33-50`)을 돌려준다. panel 이름은 겹쳐도 된다. 웹 입력은 지금 빈 칸으로 시작한다(`workspace-dialog.tsx:103`). 제안: client가 목록을 보고 `<base>-<n>`을 만든다. network에서 이름이 겹치면 서버 거부가 마지막 방어선이다.
- 3번 웹 `POST /api/networks`. 확인 사실: 모든 HTTP 요청은 `requestGuard`(`apps/daemon/src/request-guard.ts`)를 거친다. guard는 웹 포트의 localhost origin을 허용하고, endpoint별로 웹을 막는 검사는 없다. 웹은 아직 이 경로를 호출하지 않는다. 요청 하나로 network와 panel이 같은 id로 생긴다(`packages/persistence/src/sqlite/database.ts:240-260`). 판단: W2 원래 항목인 "웹 허용"에는 서버 변경이 필요 없다.
- 새로 확인한 충돌: daemon은 workspace가 아닌 panel의 `panel.rename`·`panel.delete`를 거부한다(`apps/daemon/src/web-commands.ts:332-344`, "Only workspace panels can be renamed."). network rename 경로는 CLI·HTTP 어디에도 없다. v14의 Network Rename을 쓰려면 새 서버 경로(`persistent_networks.name`과 panel name을 함께 변경)가 필요하다. 아니면 Network Rename을 범위에서 뺀다. 사용자 결정 대기.
