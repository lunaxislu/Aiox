---
topic: Web Error UI UX Review
description: 운영 Web의 에러·연결 상태 UI 현황 확인과 UI/UX 점검·개선
status: open
---

## Work Items

- [x] W1 에러·연결 상태 UI가 현재 화면에 어떻게 보이는지 확인한다. apps/web의 상태 종류(연결 끊김·재연결·Screen lost·명령 실패 등)와 표시 위치를 코드·Storybook에서 수집하고 실제 화면으로 캡처한다.
- [ ] W2 web-design-guidelines로 수집한 에러 UI를 점검해 문제 목록을 만든다.
- [x] W3 개선 방향을 사용자와 결정한다.
- [>] W4 결정한 개선을 구현하고 Storybook·테스트로 검증한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 관련 선행 기록: logs/2026-09-09-AIOX-TUI-Stage6-Web.md (ConnectionWarning, Disconnected/Reconnecting/Screen lost, 명령 실패 표시 결정). 이 로그는 그 결정을 대체하지 않고 화면 표현 품질을 다룬다.
- 점검 skill: web-design-guidelines(UI/UX·접근성 감사), shadcn(apps/web 컴포넌트). 프로젝트 범위 설치(.agents/skills, .claude/skills symlink).


## 2026-10-04 · W1 에러 UI 현황 확인 착수

사용자 요청으로 Next.js 문서 사이트(`logs/2026-10-04-Docs-Site-Nextjs.md`)와 병렬 진행하는 독립 로그로 열었다. 계기: 연결이 끊기면 화면 아래에 disconnection 문구만 뜨는 등 에러 표현이 빈약하다는 사용자 평가.

확인한 사실: apps/web에서 연결·에러 표시 관련 파일은 `widgets/header/app-header.tsx`, `pages/workspace/{workspace-view,workspace-page,connected-terminal,terminal-body}.tsx`, `shared/api/application-connection.ts`, `attach.ts`와 각 stories다. 표시 상태 목록과 실제 화면은 아직 확인하지 않았다.

## 2026-10-04 · W1 상태 수집·캡처 완료

사용자 지시: role/aria는 이번 점검에서 제외하고, 캡처는 사용자가 볼 수 있게 `apps/web/` 아래에 둔다.

확인한 사실:
- 캡처 10장과 상태·출처 대응표를 `apps/web/error-ui-captures/`(README.md)에 두었다. 캡처는 Storybook 1280×800 light 테마에서 agent-browser로 찍었다.
- 에러 표시 위치는 세 갈래다. (1) 헤더 아래 배너는 `Daemon disconnected` 한 줄이며 행동 수단이 없다. (2) 터미널 위 overlay card는 disconnected·reconnecting·screen-lost·unrestorable·exited 상태를 보여 주고 Reconnect·Force stop 버튼이 있다. (3) 탭 본문의 `TabNotice`는 start-failed·crashed·unavailable 상태를 보여 주고 재시작 명령 복사를 제공한다.
- 셸 수준 알림(설정 로드 실패, 명령 rejected·unexecuted·unknown·sequence gap·layout conflict, read 실패, cleanup 실패)은 헤더 아래에 `<p className="p-3">` 텍스트로 쌓인다. 일부는 `text-destructive`이고 일부는 무색이며, raw JSON issue를 그대로 붙인다. Dismiss는 CommandFeedback에만 있다. 이 상태들에는 story가 없어 인라인 markup을 복제한 임시 story로 그렸다(`09-shell-alerts-REPRO`).
- 기존 `App/Header` story 전체(Host 포함)가 Storybook에서 `RangeError: Invalid string length`로 렌더되지 않는다. 원인은 `@storybook/react` jsxDecorator가 RouterProvider의 router 객체를 react-element-to-jsx-string으로 직렬화하는 것이다. 임시 story에 `parameters.docs.source.type: "code"`를 주면 렌더된다. 기존 story는 수정하지 않았다.
- 기존 workspace story의 play 함수는 Reconnect를 클릭해 끝나므로, 그대로 캡처하면 에러 card가 사라진 상태가 찍힌다. play를 뺀 임시 재노출 story로 캡처했다. 임시 story 파일 두 개는 캡처 후 삭제했다.

Next: W2에서 캡처와 대응표를 web-design-guidelines로 점검해 문제 목록을 만든다(role/aria 제외). `App/Header` story RangeError를 고칠지는 사용자에게 확인한다.

## 2026-10-04 · W1 보강: 실제 화면에서 다중 터미널 연결 끊김 캡처

사용자 요청: web에서 터미널을 여러 개 만든 뒤 disconnect하고 브라우저에서 캡처한다.

방법: 격리 home의 daemon harness(`AIOX_HARNESS_HOME`=scratchpad)와 Vite dev 프록시를 띄우고, workspace에 pane 3개·터미널 4개를 연 뒤 두 방식으로 끊었다. A는 daemon 프로세스 종료(SIGTERM), B는 daemon을 살려 둔 채 Vite 프록시 종료다. 캡처 11~22와 설명은 `apps/web/error-ui-captures/README.md` "실제 화면" 표에 있다.

확인한 사실:
- A의 1초 캡처에는 화면 변화가 없었고 10초 캡처에서 배너와 카드가 보였다. B는 2초 캡처에서 이미 보였다. 정확한 지연 시간은 측정하지 않았다.
- 배너 문구는 A·B 모두 `Daemon disconnected`다. B에서는 daemon이 살아 있었으므로 실제 원인(브라우저↔daemon 경로 단절)과 문구가 다르다.
- 배너가 레이아웃 안에 끼어들어 pane 전체가 아래로 밀린다.
- 같은 원인인데 pane마다 같은 카드가 반복된다. 높이가 낮은 pane(왼쪽 위·아래)에서는 카드 아래쪽 Reconnect·Force stop 버튼이 잘려 보이지 않는다. 카드에 terminal UUID가 설명 줄과 `Terminal` 행에 두 번 나온다.
- A에서는 카드가 `Terminal process exited`이고 아이콘은 B와 같은 wifi-off다. 버튼은 Force stop만 있다.
- B에서 45초 동안 자동 재연결 시도 표시는 보이지 않았다. 오프라인 상태에서 Reconnect를 누르면 그 카드의 설명 줄만 `Connection failed`로 바뀌고, 다른 카드와 배너는 그대로다.
- A에서 daemon을 재기동하면 탭마다 `Terminal is unavailable after daemon restart.`·`daemon-ended`와 "Run in your terminal to start again" 아래에 명령이 빈 복사 블록(`$`만)이 보인다. plain shell에는 재시작 명령이 없는 것으로 보인다(코드 미확인).
- B에서 Vite를 재기동하자 12초 안에 4개 터미널이 모두 복구됐다. Vite HMR 클라이언트의 페이지 새로고침 때문인지 앱 재연결 때문인지는 확인하지 않았다.

Next: W2에서 Storybook 캡처(01~10)와 실제 화면 캡처(11~22)를 함께 web-design-guidelines로 점검해 문제 목록을 만든다(role/aria 제외). `App/Header` story RangeError를 고칠지는 사용자에게 확인한다.

## 2026-10-05 · W3 방향 일부 결정: 연결 끊김 전체 화면

사용자 결정:
- 앱 연결이 끊기면 pane마다 카드를 띄우지 않고 workspace 영역에 컴포넌트 하나를 보인다. 이 화면의 행동은 Reconnect뿐이다.
- 재연결 뒤에도 터미널이 screen-lost·unrestorable이면 그 shell 자리에 Reconnect screen + Force stop 카드를 보인다(현행 pane 카드 위치 유지).

근거(확인한 사실): Force stop은 확인 dialog 뒤 `tab.close`(`confirm: true`)를 앱 연결로 daemon에 보낸다(`pages/workspace/workspace-page.tsx`). 연결이 끊긴 동안에는 daemon에 닿지 않으므로 전체 화면에서는 뺀다. 오프라인에서 눌렀을 때 실제 표시는 확인하지 않았다.

미결:
- 전체 화면이 workspace를 완전히 대체할지, 흐리게 남긴 workspace 위에 올릴지.
- unrestorable에서 현재 비활성으로 보이는 Reconnect screen을 유지할지 숨길지.
- 자동 재연결 시도가 앱에 있는지(코드 미확인). 전체 화면의 진행 표시 문구가 여기에 달려 있다.

Next: 미결 세 가지를 정한 뒤 W4 구조 단계(composition·상태·경계·이벤트)를 보고한다.

## 2026-10-05 · W4 구조 단계 적용과 캡처(subagent)

사용자 요청으로 subagent가 W3 결정을 구조 단계로 적용하고 캡처했다. 커밋하지 않았다.

확인한 사실:
- 앱 연결(`shared/api/application-connection.ts`)은 끊기면 1초 간격으로 자동 재시도한다. 터미널 attach(`src/attach.ts`)는 스스로 다시 붙지 않는다.
- 새 `app/connection-lost.tsx`가 `<main>` 위에 overlay로 뜨고 workspace는 아래에 흐리게 남는다. 재시도 중에는 스피너와 문구만, 재시도가 멈춘(`stopped`) 상태에서만 Reload page 버튼을 보인다. 결정했던 Reconnect 버튼은 자동 재시도와 겹쳐 넣지 않았다(사용자 확인 필요).
- 헤더 `ConnectionWarning` 배너와 `AppHeader`의 `connected` prop을 제거했다. 오프라인 동안 pane 카드는 숨기고, 앱 연결이 돌아오면 disconnected 터미널을 모두 다시 붙인다. unrestorable 카드는 비활성 Reconnect screen 없이 Force stop만 보인다.
- typecheck, test(219), format:check, lint 통과.
- 캡처 23~34. Vite dev에서의 복구는 Vite의 페이지 새로고침이었다(22번 미확인 해소). 빌드본(`vite preview`)에서는 새로고침 없이 3초 안에 4개 터미널이 다시 붙고 입력이 동작했다.

미결: 전체 화면 Reconnect 버튼 제외 승인, daemon 종료 시나리오(A) 재캡처, 오프라인 중 종료된 터미널이 overlay 아래 가려지는 점, 스타일 단계.

Next: 사용자가 구조와 캡처를 확인하면 미결을 정리하고 스타일 단계로 넘어간다.

## 2026-10-05 · 연결 끊김 화면 불투명화

사용자 지적: 연결 끊김 화면 뒤로 터미널이 보이면 안 된다. 원인은 사용자의 "오케이"를 흐린 overlay 추천에 대한 동의로 해석해 subagent에 지시한 것이다. 사용자는 앞서 shell 대신 컴포넌트 하나를 보이자고 했다.

변경: `app/connection-lost.tsx` 배경을 `bg-background/80`에서 `bg-background`로 바꿨다. workspace는 마운트를 유지한다. 연결 복구 시 터미널 재연결 로직이 `ConnectedTerminal` 안에 있기 때문이다. typecheck·test(219)·format:check 통과. 캡처 24·25·28은 바꾸기 전 화면이며 다시 찍지 않았다.

Next: 전체 화면 Reconnect 버튼 제외 승인과 재캡처 여부를 사용자에게 확인한다.

## 2026-10-05 · 연결 끊김 화면 일관성 정리와 재캡처

결정(사용자 위임, 결합도 기준): 연결 끊김 화면에 Reconnect 버튼을 두지 않는다. `ApplicationConnection`은 1초 간격 자동 재시도를 내부 루프로 돌리고 즉시 재시도 API가 없다. 버튼을 두려면 새 API·shell 경유 콜백·자동 재시도와의 경합 규칙이 필요한데 얻는 대기 단축은 최대 1초다. 재시도가 멈춘(`stopped`) 경우에만 Reload page를 둔다.

변경:
- `ConnectionLost`를 같은 페이지 수준 에러인 `RouteError`에 맞췄다. 제목 `text-lg`, 문구는 "상황 → 할 일" 순서다. "Can't reach the daemon"은 daemon이 살아 있어도 뜨므로 뺐다.
- pane 구분선(`pane-tree.tsx`의 separator, `z-10`)이 같은 `z-10` overlay 위로 비쳤다. `ConnectionLost`를 `Outlet` 뒤로 옮겨 DOM 순서로 덮게 했다(`app-shell.tsx`, `app-shell-preview.tsx`).
- typecheck·test(219)·format:check 통과.

확인한 사실: 빌드본(`vite preview`) 재캡처 35~38과 Storybook 33·34를 다시 찍었다. 36·37에서 터미널 내용·구분선·pane 카드가 보이지 않는다(36 직접 확인). 복구는 새로고침 없이(window 표식 유지) 4개 터미널 재연결, 가려진 4번째 탭 입력·출력 확인. 옛 반투명 캡처 24·25·28은 삭제했다.

남은 것: daemon 종료 시나리오(A) 재캡처, 오프라인 중 종료된 터미널은 복구 뒤에야 보이는 점, pane 카드(Card)와 페이지 화면(Empty)의 모양 차이 유지 여부.

Next: 사용자가 캡처를 확인하면 남은 것을 정리하고 W4 마무리(커밋 여부 포함)를 정한다.

## 2026-10-05 · 연결 끊김 화면: pane 구분선 노출

사용자 의견: pane 구분선은 보이는 편이 낫고, 그 위에 연결 상태 문구가 올라가야 한다.

변경: `ConnectionLost` wrapper에서 z-index를 뺐다. 불투명 배경 층은 `z-9`(pane separator `z-10` 아래), `Empty`는 `relative z-20 w-auto bg-background`로 구분선 위에 그린다. typecheck·test(219)·format:check 통과.

확인한 사실: 재캡처 35~38(workspace `opaque-divider`). 36·37에서 구분선은 보이고 터미널 내용은 보이지 않으며 문구 상자가 교차 지점을 덮는다(36 직접 확인, light 테마는 subagent 확인). 복구는 새로고침 없이 4개 터미널 재연결.

Next: 남은 것(A 시나리오 재캡처, 오프라인 중 종료 터미널 표시, Card/Empty 모양 차이, 커밋과 캡처 폴더 처리)을 사용자와 정한다.

## 2026-10-05 · 연결 끊김 문구 상자 폭 축소

사용자 지적: 가로 구분선이 문구보다 한참 앞에서 끊겨 보인다. 원인은 `EmptyHeader` 기본 `max-w-sm`과 `Empty` `p-6`로 상자가 text-balance로 접힌 글자보다 넓었던 것이다(구분선이 글자 약 100px 앞에서 끊김).

변경: `Empty` `p-4`, `EmptyHeader` `max-w-64`. typecheck·test(219)·format:check 통과.

확인한 사실: 재캡처 35~38(workspace `tight-box`). 36에서 가로 구분선은 글자 32px 앞에서 끊기고, 세로 구분선의 위아래 끊김은 상자 여백 16px로 대칭이다(36 직접 확인, 좌표는 subagent DOM 측정). 터미널 내용은 비치지 않는다. Stopped 상태는 live로 만들 수단이 없어 찍지 않았다(Storybook 34는 이전 폭 기준).

Next: 남은 것(A 시나리오 재캡처, 오프라인 중 종료 터미널 표시, Card/Empty 모양 차이, 커밋과 캡처 폴더 처리)을 사용자와 정한다.

## 2026-10-05 · 연결 끊김 화면: 구분선 전체 노출(text halo)

사용자 요청: 구분선을 끊지 않고 전부 보이게 한다.

변경: `ConnectionLost`의 `Empty`에서 `bg-background`를 빼고 배경색 text-shadow halo(2·6·10px)를 둘렀다. 아이콘 칸은 `bg-muted`라 선을 가린다. typecheck·test(219)·format:check 통과.

확인한 사실: 재캡처 35~38과 확대본 36b(workspace `halo`). 36b에서 가로선은 제목 "C" 앞까지 이어지고, 세로선은 아이콘 칸 아래에서 다시 이어져 설명 두 줄의 글자 사이로 희미하게 지나가며 획을 가르지는 않는다(직접 확인). 터미널 내용은 비치지 않는다. light 테마는 subagent 확인.

Next: 남은 것(A 시나리오 재캡처, 오프라인 중 종료 터미널 표시, Card/Empty 모양 차이, 커밋과 캡처 폴더 처리)을 사용자와 정한다.

## 2026-10-05 · 세션 마감: 남은 일 정리

사용자 확인: halo 적용한 연결 끊김 화면을 직접 보고 승인했다. 캡처 폴더는 커밋하지 않고 루트 `.gitignore`에 `/apps/web/error-ui-captures/`로 넣었다. 소스 변경은 아직 커밋하지 않았다.

작업 항목 상태: W3은 연결 끊김 화면 방향 결정으로 닫았다. W2(web-design-guidelines 감사)는 실제 화면 캡처에서 나온 문제로 W3·W4를 먼저 진행해 아직 수행하지 않았다. W4는 진행 중이다.

다음 세션에서 할 것:
- 커밋: `apps/web/src`의 연결 끊김 화면 변경(`app/connection-lost.tsx`·stories, `app-shell.tsx`, `app-shell-preview.tsx`, `app-shell.story.tsx`, `widgets/header/app-header.tsx`, `pages/workspace/{connected-terminal,terminal-body}.tsx`·test·stories)과 `.gitignore`. working tree에는 이 작업과 무관한 변경(`apps/cli/src/cli.ts`, `skills-lock.json`, 다른 로그)도 있으므로 분리한다.
- daemon 종료 시나리오(A) 재캡처: daemon 재기동 뒤 탭마다 `Terminal is unavailable after daemon restart`와 빈 복사 명령(`$`만)이 보였다(15번). 빈 명령의 원인은 코드로 확인하지 않았다.
- 오프라인 중 종료된 터미널: 연결이 끊긴 동안 pane 카드를 숨기므로 그 사이 종료된 터미널 상태는 연결 복구 뒤에야 보인다. 그대로 둘지 정한다.
- Card/Empty 모양 차이: pane 카드(Card)와 연결 끊김 화면(Empty)의 모양이 다르다. 유지를 추천했고 사용자 결정은 아직이다.
- Stopped 상태 확인: 재시도가 멈춘 상태의 긴 문구가 좁아진 상자(`max-w-64`)에서 몇 줄로 접히는지 보지 않았다. Storybook 34는 상자 축소 전 캡처다.
- `App/Header` story RangeError: Host 등 `App/Header` story가 Storybook에서 렌더되지 않는 문제(W1 기록)를 고칠지 정한다.
- W2: Storybook 캡처(01~10)와 실제 화면 캡처를 web-design-guidelines로 점검해 나머지 에러 UI(TabNotice, 셸 알림 등)의 문제 목록을 만든다(role/aria 제외).

Next: 다음 세션은 커밋 분리부터 시작하고, 위 목록을 차례로 사용자와 정한다.


## 2026-10-06 · 연결 끊김 화면 커밋 분리

사용자 지시로 커밋했다. repo 관례(최근 커밋들이 code와 logs/docs를 분리)에 맞춰 두 커밋으로 나눴다.

확인한 사실:
- `4ca3db9 feat(web): show one connection-lost screen for an outage` — `apps/web/src`의 10개 파일(`app/connection-lost.tsx`·stories 신규, `app-shell.tsx`, `app-shell-preview.tsx`, `app-shell.story.tsx`, `pages/workspace/{connected-terminal,terminal-body}.tsx`·test·stories, `widgets/header/app-header.tsx`).
- `f1c397e docs: record the web error UI review and connection-lost screen` — 이 로그와 `.gitignore`의 캡처 폴더 제외.
- 커밋 전 `pnpm typecheck`·`format:check`·`lint`·`test`를 모두 다시 실행해 통과했다(web 219 tests, 33 files).
- 무관 변경은 staging하지 않았다: `apps/cli/src/cli.ts`, `skills-lock.json`, `logs/2026-09-09-AIOX-TUI-Stage6-Web.md`, untracked skill 폴더 4종과 symlink, `logs/2026-10-04-Docs-Site-Nextjs.md`, `better-sqlite3SQLite`. `skills-lock.json`과 skill 폴더는 서로 짝이라 함께 커밋할 대상으로 보이지만 이 작업 범위가 아니다. `better-sqlite3SQLite`는 명령 오타로 생긴 파일로 보이며 내용은 확인하지 않았다.

Next: 남은 항목 중 Stopped 문구 줄바꿈 확인과 daemon 종료 시나리오(A) 재캡처·빈 복사 명령 원인부터 진행한다.

## 2026-10-06 · 빈 재시작 명령 guard와 A 시나리오 실측

사용자 결정: 빈 `restartCommand`일 때 복사 블록을 숨기고 `pane-tree.tsx`의 기존 문구를 재활용한다. 이어서 A 시나리오를 실제로 돌려 캡처한다.

확인한 사실(코드):
- `""`는 "재시작 명령 없음"을 표현할 타입이 없어 생긴 sentinel이다. `tabNoticeSchema`의 `reason`은 `NullOr(String)`인데 `restartCommand`는 `Schema.String`이다. 같은 값이 `web-state.ts`에서는 "채워야 함" 신호로, UI에서는 "보여줄 명령"으로 읽힌다.
- 생산 경로는 넷이다. daemon 재시작 복구(`host-state.ts` `recover`)의 start-failed·unavailable, shell 생성/join 실패(`web-commands.ts` `failTab`), host를 못 찾은 agent 종료(`daemon.ts` `stopRuntime`). plain shell은 `agentKey`가 없어 `web-state.ts`의 보강 대상이 아니다.
- plain shell에 명령이 없는 이유는 구현 공백이 아니라 부재다. agent는 `aiox.yaml` 선언을 `aiox host agent start`로, network agent는 `aiox agent run`으로 되살리지만, CLI에 패널 shell을 만드는 명령 자체가 없다.
- `tab.dismiss`는 터미널이 alive이고 presentation이 stopped·start-failed·crashed일 때만 허용된다. 복사 성공이 dismiss를 쏘던 기존 배선은 unavailable 탭에서 거부된다.

변경:
- `terminal-body.tsx` `TabNotice`에 guard 둘. 복사 블록은 `restartCommand`가 있을 때만, 없으면 `Use + to open a shell or split this pane.`(`pane-tree.tsx` 빈 pane 문구 재활용). `onCopied`의 dismiss는 `dismissible`(terminalId 있고 stopped·start-failed·crashed)일 때만.
- `workspace-preview.ts`에 `shellSource` 추가, `workspace-page.tsx`의 `addShell`이 이를 쓴다. notice 탭의 죽은 terminalId를 source로 보내지 않는다.
- 테스트: `terminal-body.test.tsx` 2개, `workspace-preview.test.ts` 1개, story `ShellUnavailable`(이 repo는 story도 vitest storybook 프로젝트에서 실행된다). 전체 223 passed, typecheck·lint·format:check 통과.

실측(A 시나리오, 빌드본 + 격리 home harness, 캡처 43~46):
- SIGTERM으로 daemon을 끄면 `Connection lost` 전체 화면이 뜨고 pane 구분선만 비친다(44, 직접 확인). 같은 home으로 재기동하면 탭마다 unavailable notice가 뜨고 빈 `$` 블록 없이 안내 문구가 보인다(45, 직접 확인).
- 그 상태에서 + 를 누르면 `Command rejected: {"code":"source_terminal_conflict","message":"Source terminal is no longer available."}`로 거부됐다. 원인은 `addShell`이 선택된 탭의 죽은 terminalId를 source로 보내고 daemon이 `refreshCwd` 실패로 409를 내는 것이다. 즉 새로 넣은 안내가 동작하지 않는 행동을 지시하고 있었다.
- 수정 뒤 같은 조작에서 새 shell이 실제로 열렸다(46, 직접 확인).
- Storybook 캡처 39~42는 subagent가 찍었고 39·41은 내가 직접 확인했다. subagent가 제안한 "안내 줄과 reason 줄의 타이포 분리"는 반영하지 않았다. agent 쪽 `Run in your terminal to start again`도 같은 처리라 바꾸면 두 경우가 어긋난다.

미결로 남긴 것: 비활성 pane의 `opacity: 0.6`이 muted 텍스트 대비를 떨어뜨리는 점(이 변경 이전부터 존재, W2 감사 대상). 셸 알림이 raw JSON을 그대로 노출하는 점(W1에서 이미 기록, 46번 캡처 이전 화면에서 재확인).

Next: W2(나머지 에러 UI를 web-design-guidelines로 점검)와 남은 결정(오프라인 중 종료 터미널, Card/Empty 모양 차이, `App/Header` story RangeError, Stopped 문구 줄바꿈)을 사용자와 정한다.
