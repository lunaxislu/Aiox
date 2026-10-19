# AIOX 운영 Web UI

Status: Committed target

이 문서는 운영 Web의 화면 규칙을 소유한다. 레이아웃, 사이드바·헤더·workspace 화면과
Network·Host 페이지의 구성과 조작, 생성 입력 줄, 빈 화면과 dialog가 나타나는 조건, 오류를
보이는 자리, 문구, 창 폭에 따른 반응형이 대상이다.

설정 필드의 검증·저장·HTTP 계약, keybindings의 키 값, Host Agent 종료·재시작 탭 동작은
[[docs/specs/aiox-configuration-web]]이 소유한다. agent 상태 값의 의미는
[[docs/specs/aiox-runtime]], terminal 수명은 같은 문서, Host 배치 우선순위는
[[docs/specs/aiox-host]]를 따른다. 이 문서는 그 값들을 화면에 어떻게 드러내는지만 정한다.

## 전체 레이아웃

사이드바가 전체 높이를 차지하고 그 오른쪽에 헤더 바와 메인이 놓인다. 사이드바와 메인은
붙어 있다. 메인을 라운드 카드로 띄우는 inset 형태를 쓰지 않는다. 터미널은 여백이 곧 정보
손실이고 pane 경계 드래그 핸들과 모서리가 겹치기 때문이다.

```text
┌────────────────┬──────────────────────────────────────────────────┐
│ AIOX           │ ◧ development · ~/projects/app · feat/login      │ 60px
│                │                      [Search… ⌘K]  🔔  ⚙  ☀︎    │
├────────────────┼──────────────────────────────────────────────────┤
│ WORKSPACES   + │  ┌────────────────┬──────────────────┐           │
│   main         │  │[Claude][sh][+] │ [Codex][Rev][+]  │           │
│   scratch      │  │────────────────┼──────────────────┤           │
│ NETWORKS       │  │                │                  │           │
│   dev          │  │    terminal    │     terminal     │           │
│ HOSTS          │  │                │                  │           │
│   development  │  └────────────────┴──────────────────┘           │
└────────────────┴──────────────────────────────────────────────────┘
```

헤더 바는 한 줄이고 60px이다. 기준선은 데스크톱이며 고밀도로 배치한다. 여백이 넉넉한
대시보드가 아니라 개발자 도구 밀도를 따른다. UI 문구는 영어 하나로 고정한다. dark를 기본으로
하고 light도 같은 완성도로 제공한다.

## 사이드바

### 세 섹션과 생성 주체

섹션은 panel 종류와 1:1이다. `WORKSPACES`에는 사용자 workspace만, `NETWORKS`에는 Network
panel만, `HOSTS`에는 Host 실행 panel만 놓인다. 종류와 섹션의 서버 조합 규칙은
[[docs/specs/aiox-configuration-web]]의 panel 계약이 소유한다.

| 섹션 | 생성 | 클릭하면 여는 화면 | 우클릭 메뉴 |
| --- | --- | --- | --- |
| `WORKSPACES` | 섹션 헤더 `+`의 입력 줄 | workspace 화면 | Rename·Delete |
| `NETWORKS` | 섹션 헤더 `+`의 입력 줄 또는 `aiox network create` | Network 페이지 | Delete |
| `HOSTS` | `aiox host run`으로만 생성. 섹션 헤더에 `+`를 두지 않는다 | Host 페이지 | 없음 |

Network는 웹에서도 CLI와 같은 `POST /api/networks`로 만든다. 서버는 Network 정의와 같은 ID의
전용 빈 panel을 함께 등록하며 shell을 실행하지 않는다. Network의 이름은 웹에서 바꾸지 않는다.
Network의 Delete는 `DELETE /api/networks/:networkId`를 쓰며 참여 실행이 남아 있으면 서버가
거절하고 그 진단을 메뉴를 조작한 자리에 보인다. 거절 조건은 [[docs/specs/aiox-host]]의
Network 권위와 소속 절을 따른다. Network panel의 shell은 Network membership을 자동 상속하지 않는다.

Host는 웹에서 만들지 않는다. 메뉴가 없는 항목에도 핸들러는 붙여 브라우저 기본 컨텍스트 메뉴가
뜨지 않게 한다.

사용자 생성 Workspace의 우클릭 `Delete`는 포함된 터미널이 모두 idle로 확인되거나
Workspace가 비어 있으면 확인창 없이 삭제한다. 하나라도 실행 중이거나 판정 불가이면
삭제 확인 dialog에 Workspace 이름과 전체 터미널의 이름·상태를 표시하고 `Cancel`과
`Stop and delete`를 제공한다. 살아 있는 Agent는 vendor의 입력 대기 상태와 관계없이
종료 확인 대상이다. 확인 요청 중에는 Workspace와 터미널 화면을 유지한다.

섹션은 아코디언이다. 섹션 헤더를 누르면 펼쳐지면서 메인에 그 섹션의 카드 목록을 보여 주고,
섹션 안의 항목을 누르면 위 표의 화면으로 들어간다.

### 생성·이름 변경 입력 줄

`WORKSPACES`와 `NETWORKS`의 `+`, Workspace의 Rename은 modal dialog 대신 목록 안의 입력 줄을
쓴다. 입력 중에도 다른 화면을 볼 수 있어야 하기 때문이다.

1. `+`를 누르면 섹션 목록 안에 입력 줄이 생긴다. 기본 이름은 `<base>-<n>`이며 화면에
   불러온 같은 목록의 이름과 겹치지 않는 가장 작은 n을 쓴다. 기본 이름 전체가 선택된 상태로
   시작한다. Rename은 현재 이름으로 시작한다.
2. 빈 이름의 Enter는 무시한다. 기본 이름을 바꾸지 않고 Enter해도 그 이름으로 요청한다.
3. Enter를 누르면 줄이 `Creating…` 대기 상태가 된다. 서버가 확정하기 전에는 새 화면으로
   이동하지 않는다. 확정되면 Workspace는 새 workspace 화면, Network는 새 Network 페이지로
   이동하고 Network는 DRAWER를 `New agent` tab으로 연다.
4. Esc는 취소다. blur는 대기 중이 아닐 때만 취소이며 대기 중인 요청은 blur로 취소하지 않는다.
5. 이름 중복·서버 거절은 그 줄 바로 아래에 서버 진단을 보이고 입력을 유지한다. 연결이
   끊기면 줄 아래가 아니라 앱 덮개(아래 오류와 교체 범위의 A)로 간다.

client가 만든 기본 이름은 제안일 뿐이다. 다른 창이 먼저 같은 Network 이름을 만들면 서버의
`duplicate_name` 거절이 마지막 방어선이다. Workspace 이름은 중복을 허용하므로 기본 이름이
겹쳐도 거절되지 않는다.

### 섹션 개요 카드

세 섹션 카드는 같은 문법을 쓴다. 제목과 개수, 상태 점이 붙은 agent 목록이며 소속 agent와
standalone을 나눠 센다.

| 섹션 | 카드 내용 |
| --- | --- |
| `WORKSPACES` | 이름, 터미널 개수, agent 목록 |
| `NETWORKS` | 이름, 멤버 수, route 요약, agent 목록 |
| `HOSTS` | 이름, 작업 경로, agent 개수와 상태 |

외부 CLI 소유 실행은 이 카드의 agent 목록에만 나타나고 탭·화면·조작·알림 대상에서 빠진다.
근거는 [[docs/specs/aiox-configuration-web]]의 운영 Web 절에 있다.

external은 `networkId`가 있을 때만 해당 `NETWORKS` 카드에 올린다. `hostId`가 항상 null이라
`HOSTS`에는 오르지 않고, `terminalId`도 null이라 `WORKSPACES` 카드의 terminal 역검색에도
걸리지 않는다. 둘 다 null인 external은 어느 카드에도 표시하지 않는다. 카드에 싣는 목적이
Network workspace가 그 network의 일부만 보여 주는 것을 막는 데 있으므로, network에 속하지
않은 external까지 보여 줄 이유가 없다.

### 빈 화면 두 층

빈 화면은 두 층이고 서로 다른 문구를 쓴다. 섹션에 항목이 하나도 없을 때와, 항목은 있으나
터미널이 없을 때다.

`WORKSPACES`가 비면 버튼을 준다.

```text
Start here

A workspace is where your terminals live. Create one to run commands —
including the aiox commands that create networks and hosts.

[ New workspace ]
```

`NETWORKS`가 비면 명령 복사 대신 섹션 헤더 `+`의 입력 줄로 유도한다. `HOSTS`는 웹에서 만들지
않으므로 정의 파일 예시와 Workspace terminal에서 `aiox host run`을 실행하라는 안내, Workspace를
여는 버튼을 보인다. 실행 명령을 복사 버튼으로 주지 않는다. 붙여 넣을 terminal이 정해져 있지
않아서다.

셋이 동시에 비어 있을 때 `Start here`만 제목 형식이 달라 시선이 거기로 가야 한다. 이는
의도이며 나머지 둘의 `No ~ yet` 형식에 맞추지 않는다.

Workspace 안이 비면 `No terminals here`만 보여 주고, 빈 pane과 `[+]`를 유지하며 shell을
자동으로 다시 만들지 않는다. Network·Host 페이지가 비었을 때는 아래 Network·Host 페이지 절을 따른다.

### 표시·크기 동작

- 토글로 완전히 숨긴다. 숨기면 메인이 가로 폭을 전부 차지한다. 아이콘만 남는 rail 모드는
  쓰지 않는다
- 오른쪽 경계를 드래그해 너비를 조절한다. 기본 240px, 최소 180px, 상한은 뷰포트 폭의 90%
- 최소 너비에 닿으면 거기서 멈춘다. 더 끌어도 자동으로 숨기지 않는다
- 숨긴 상태에서도 헤더 바의 토글 버튼은 계속 보인다
- 조절한 너비와 열림 상태는 전역 설정 파일에 남는다

## 헤더 바

왼쪽부터 사이드바 토글, 현재 workspace 이름과 맥락, 오른쪽에 검색창·알림 벨·설정 톱니·테마
토글이 온다. 토글은 헤더 한 곳에만 둔다. 사이드바를 접어도 진입 경로가 남아야 하기 때문이다.
검색창은 커맨드 팔레트와 함께 보류라 현재 헤더에 없다. 나머지 셋은 좁은 폭에서도 헤더에
남으며 폭에 따라 Sheet로 옮기지 않는다.

맥락은 workspace 종류에 따라 다르다.

| 종류 | 맥락 |
| --- | --- |
| Host | 이름 · 작업 경로 |
| Network | 이름 · 멤버 수 |
| Workspace | 이름만 |

이름과 맥락은 폭 기반 단일 규칙 하나다. 맥락이 먼저 줄고 이름이 마지막까지 남으며 넘치면
말줄임표를 쓴다. 이 규칙은 breakpoint와 무관하게 모든 폭에 적용한다. 좁은 폭에서는 사이드바가
Sheet라 헤더가 화면 전폭을 쓰고 넓은 폭에서는 사이드바가 자리를 차지하므로, 창을 `767px`
에서 `768px`로 넓히면 맥락이 오히려 짧아진다. 이는 Sheet가 메인 폭을 줄이지 않기로 한 것과
같은 규칙의 결과이므로 경계 전용 예외나 최소 폭 보정을 넣지 않는다.

Settings 진입은 헤더 오른쪽의 톱니이며 사이드바 하단에 Settings 행을 두지 않는다. 사이드바
전체가 토글 대상이라 접었을 때 클릭 진입이 사라지는 것을 막기 위함이다. 커맨드 팔레트의
`Settings` 항목은 유지하되 Settings 전용 단축키는 만들지 않는다.

연결 상태는 평소에 표시하지 않는다. daemon 연결이 끊기면 아래 오류와 교체 범위의 앱 덮개(A)가
메인을 덮는다. 상시 표시되는 연결 표시등을 두지 않는다. 헤더 오른쪽의 `⚠` badge는 연결 표시가
아니라 결과를 확정할 수 없는 일시 오류의 모음이다.

## workspace 화면

pane·탭 선택은 각 React 앱의 메모리 상태다. 다른 창의 선택을 바꾸지 않고 새로고침하면 초기
선택으로 돌아간다. 서버 구조 변경으로 선택한 pane·탭이 사라지면 현재 화면이 남은 대상 중에서
선택을 조정한다. 서버 DTO와 저장 경계는 [[docs/specs/aiox-configuration-web]]의 panel 계약을 따른다.

CLI 실행 결과나 알림으로 특정 탭에 이동할 때는 대상 탭을 처음부터 선택해 표시한다. 이동한
패널의 이전 선택 탭을 먼저 연결했다가 대상 탭으로 바꾸지 않는다. 이동이 끝난 뒤에는 사용자가
다른 탭을 자유롭게 선택할 수 있다. [Status: Normative]


workspace 화면은 pane 트리이고 pane마다 독립된 탭바를 가진다. 각 workspace는 자기 pane
배치·탭 순서·선택을 기억하며 사이드바 항목을 바꾸면 헤더 맥락도 함께 바뀐다.

### pane 조작

pane 탭바 오른쪽에 `New shell`·`Split right`·`Split down` 세 버튼을 나란히 둔다. 한 단계로 누르는
동작이라 드롭다운으로 감싸지 않으며 뜻은 tooltip이 설명한다. 새 shell은 현재 pane에 추가하고
전체 배치를 자동으로 재정렬하지 않는다.

- pane 경계를 드래그해 크기를 바꾼다. 경계선은 상시 보이고 hover·focus할 때 강조되며 이후 실제
  PTY를 resize한다
- 활성 pane은 불투명하게 두고 얇은 focus ring을 더한다. 비활성 pane과 그 탭은 opacity 0.8로
  흐리게 한다. 색은 바꾸지 않는다
- 마지막 탭이 빠져 빈 pane이 되면 인접 pane이 자리를 채우며 병합한다
- 병합할 것이 없어 workspace가 비면 탭바와 `[+]`만 남은 빈 pane을 유지한다

`+`는 섹션 헤더와 workspace의 pane 탭바 두 곳에 나타나지만 뜻이 다르다. 섹션 헤더의 `+`는
Workspace나 Network를 만들고 pane 탭바의 `+`는 터미널을 만든다. 그 외의 자리에 `+`만 있는
버튼을 두지 않는다. Network 페이지의 `+ Add agent`는 이름이 붙은 버튼이다.

### 탭 드래그와 드롭

드래그 결과 네 가지를 모두 구분한다.

| 드롭 위치 | 결과 |
| --- | --- |
| 같은 탭바 안 | 순서 변경. 삽입선을 표시 |
| 다른 pane의 탭바 | 그 pane으로 이동 |
| pane 가장자리 상·하·좌·우 | 새 분할 생성 |
| pane 중앙 | 그 pane의 탭으로 합치기 |

드롭 전에 들어갈 자리를 반투명 오버레이로 미리 보여 준다. 이 모든 화면 조작으로
프로세스·대화·Network를 바꾸지 않는다.

가장자리 드롭 존 두께는 pane의 20%다. 이 20%는 어느 결과인지 가르는 판정 범위이고, 드롭 전
오버레이는 분할 후 차지할 자리인 pane의 절반(50%)을 덮는다. 두 값은 서로 다른 것을 뜻한다.

### 탭 닫기와 터미널 종류

탭 닫기 `×`는 배치 제거가 아니라 터미널 종료다. idle을 확인한 경우에만 즉시 닫고, 실행
중이거나 판정할 수 없으면 확인 dialog를 띄운다. 브라우저나 브라우저 탭을 닫는 것은 이와 달라
아무것도 종료하지 않으며 재방문 시 화면이 복귀한다.

터미널 종류는 셋이다.

| 종류 | 화면 |
| --- | --- |
| `shell` | 사용자가 명령을 치는 곳 |
| `agent` | vendor TUI가 도는 곳 |
| `external` | 외부 터미널에서 실행된 agent. 화면을 줄 수 없다 |

`external`은 AIOX가 종료할 수 없으므로 닫기 버튼을 주지 않고, 화면도 없으므로 탭에서 빼
섹션 카드에만 표시한다.

Host Agent의 종료·재시작에 따른 탭 본문과 수명은 [[docs/specs/aiox-configuration-web]]의
Host panel과 Agent terminal UX가 소유한다.

## Network·Host 페이지

Network와 Host panel은 일반 workspace 화면 대신 멤버 중심 페이지로 연다. 주인공은 멤버 목록과
terminal이다. 관계도나 terminal grid 강화는 쓰지 않는다.

```text
┌ App sidebar ┬ MEMBERS ─────┬ terminal (PaneTree) ──────┬ DRAWER ────────────┐
│ WORKSPACES  │ ● reviewer   │ [reviewer][coder]         │ [Info][New agent]  │
│ NETWORKS    │ ◐ coder      │                           │ [Console]          │
│   dev       │ routes …     │        terminal           │                    │
│ HOSTS       │ + Add agent  │                           │ 선택한 tab 내용    │
└─────────────┴──────────────┴───────────────────────────┴────────────────────┘
```

### 영역과 토글

- 왼쪽 MEMBERS는 멤버, 각 멤버의 상태, routes를 보인다. 상태 값은 탭의 상태 점과 같은
  [[docs/specs/aiox-runtime]]의 값을 이름을 바꾸지 않고 쓴다.
- 가운데 terminal 영역은 workspace 화면의 pane 트리를 그대로 쓴다. 탭 drag·drop과 분할은
  위 탭 드래그와 드롭 절과 같다. 저장 배치도 같은 panel 계약을 따른다.
- terminal 영역의 pane 탭바 오른쪽에는 버튼을 두지 않는다. `New shell`, Split 버튼, More 메뉴,
  상태 표시줄 토글이 모두 없고 분할은 drag로만 한다. 작업 경로는 DRAWER의 Info에서 본다.
- 멤버를 누르면 그 멤버의 tab을 선택하고 포커스한다. Info tab이 그 멤버로 바뀐다.
- App sidebar, MEMBERS, DRAWER는 각자 토글한다. 한 번에 모두 접는 집중 모드는 두지 않는다.
  펼침 상태는 panel마다가 아니라 앱 전체에 하나로 저장하고 새로고침 후에도 유지한다.
- 접힌 MEMBERS는 terminal 왼쪽 위에 펼치기 버튼으로 남고, `awaiting-user` 멤버 수를 badge로
  붙인다.

### DRAWER

DRAWER는 modal이 아니다. terminal을 보면서 입력할 수 있다. 위쪽 tab으로 내용을 바꾸며 여러 tab이
함께 살아 있다.

| tab | 내용 |
| --- | --- |
| Info | 선택한 멤버의 role·cwd·routes·instruction. 읽기 전용이다. 실행 중 agent 정보를 바꾸는 서버 경로가 없다 |
| New agent | Add agent 폼. adapter·name·role·instruction(선택)을 받고 시작 경로는 표시만 한다 |
| Console | 멤버가 아닌 일반 shell. `aiox`나 `git` 명령을 치는 용도다 |

- New agent 입력 중에 다른 멤버를 눌러 Info로 바뀌어도 입력을 유지한다.
- Launch가 성공하면 New agent tab을 닫고 Info를 새 멤버로 연다. 실패하면 폼을 유지하고 서버
  진단을 폼 안에 보인다.
- 시작 경로는 마지막으로 포커스한 workspace terminal의 cwd다. 서버 검증과 열린 terminal이 없을
  때의 처리는 [[docs/specs/aiox-host]]의 Web Network 생성과 Agent 추가 절을 따른다.
- Console은 앱 전체에 하나이고 어느 페이지에서 열어도 같은 shell이다. 새로고침해도 유지한다.
  처음 만들 때만 포커스 terminal의 cwd를 이어받고 이후는 사용자가 직접 이동한다.
  Console tab의 `×`는 DRAWER에서 숨기기만 하고 shell은 계속 실행한다. shell이 끝나면 버튼 없이
  새 shell로 바꾼다.

### Host 페이지

Host 페이지는 같은 틀에 내용만 다르다. MEMBERS에 관리 Agent와 함께 작업 경로와 정의 파일을
보이고, `+ Add agent` 대신 Host 전체 `Restart`를 둔다.

- 정의 파일이 실행 뒤 바뀌었으면 `Changed since start`를 보이고 Restart를 유도한다.
- 정의 파일의 `Open`은 daemon이 OS 기본 앱으로 연다. `⋯` 메뉴에 Reveal in Finder/Explorer와
  Copy path를 둔다.
- 변경 판정, Open, Restart의 서버 계약은 [[docs/specs/aiox-host]]의 Web Host 페이지 절이 소유한다.

### 빈 페이지와 범위

새 Network 페이지는 MEMBERS 0명이고 DRAWER가 New agent tab으로 열린다. terminal 영역은 빈
pane이며 shell `+`가 없으므로 첫 tab은 Agent 추가나 `aiox agent run --network`로 생긴다.

이 페이지는 다음을 하지 않는다. topology 그래프, 웹 route 편집, 웹 Host 생성, 멤버 제거 UI,
Network 이름 변경.

### 열린 질문 [Status: Open/deferred]

- MEMBERS·DRAWER 펼침 상태를 전역 설정 파일과 브라우저 저장 중 어디에 둘지 정하지 않았다.
  App sidebar의 열림 상태는 위 표시·크기 동작대로 전역 설정 파일에 남는다.
- Console의 소유 자리: daemon의 shell은 지금 항상 panel tab에 속하고 tab에 붙지 못한 shell은
  정리 대상이다. 앱 수준 Console 하나를 저장할 자리, 정리에서 빼는 방법, 열린 terminal이 없을
  때의 첫 cwd(`~` 가정, 미확인), 새 shell이 곧바로 끝나기를 반복할 때 재생성을 멈추는 조건이
  정해지지 않았다.

## 상태 표시

상태 값의 의미는 [[docs/specs/aiox-runtime]]을 따르며 화면에서 이름을 바꾸지 않는다. 같은
값이라도 탭과 표시줄은 자리가 좁고 넓은 만큼 다르게 그린다.

### 탭의 상태 점

agent 상태는 탭에 점으로 표시하고 색을 구분한다.

- `awaiting-user`는 사용자가 TUI에서 직접 답해야 하는 상태이므로 가장 눈에 띄어야 한다
- `failed`는 이유 문자열을 함께 보여 준다
- 실행이 없는 stopped 표시는 실시간 activity의 다섯 status 값과 별개다

Workspaces·Networks·Hosts의 shell 탭은 Agent가 준비·실행 중일 때 해당 Runtime의 이름을 표시한다.
Host가 Runtime을 등록하기 전의 준비 중 탭은 관리 Agent 이름을 표시한다. 종료하여 Runtime이
제거되면 저장된 shell 탭 이름으로 돌아온다. 새 shell의 기본 이름은 `Shell`이며,
Agent 배치·재실행은 기존 shell 탭의 저장된 이름을 덮어쓰지 않는다. 실패 원인과 재실행
명령은 notice에 유지한다. [Status: Current] 근거: [[apps/daemon/src/web-state.ts]],
[[apps/daemon/src/web-state.test.ts]], [[apps/daemon/src/network-agent.test.ts]],
[[apps/daemon/src/host-agents.test.ts]].

### pane 상태 표시줄

작업 경로는 지원 shell이 명령을 마치고 프롬프트로 돌아올 때 갱신하며, 경로가 달라진 경우에만
Web 상태를 변경한다. 최초에는 생성 경로를 표시하고 hook 미지원·조회 실패 시 마지막 확인 값을
유지한다. PID 조회가 반환하는 실제 경로는 shell의 심볼릭 링크 표기와 다를 수 있다.
임의 출력마다 또는 일정 주기마다 갱신하는 보장은 없다. 지원 범위와 관측 경로는
[[docs/architecture/aiox-storage-terminal]]을 따른다. [Status: Current]
근거: [[apps/daemon/src/terminals.ts]], [[apps/daemon/src/terminals.test.ts]].

pane 아래에 한 줄짜리 표시줄을 둔다. 선택한 탭의 상태 점과 이름, 이유 요약, terminal의 작업
디렉터리를 이 순서로 놓는다.

- 기본은 펼침이고 pane 탭바의 토글로 접는다. 보여 줄 탭이 없으면 토글을 비활성으로 둔다
- 작업 디렉터리를 두는 이유는 같은 이름의 shell이 서로 다른 폴더에서 돌 수 있기 때문이다.
  경로가 길면 줄여 놓고 전체는 tooltip으로 준다
- 이유는 한 줄로 줄이고 전체는 표시줄 안에서 펼쳐 본다. 펼침은 탭을 옮기면 풀린다
- terminal 연결이 정상이 아닐 때만 오른쪽 끝에 경고를 더한다. 헤더의 daemon 연결 경고와
  달리 이것은 그 탭의 terminal 하나에 대한 표시다

## 알림

알림 벨에 미확인 개수 배지를 붙인다. 목록은 미확인 알림만 담으므로 배지 수가 곧 항목 수다.
항목은 어떤 agent에서 무슨 일이 있었는지와 상대 시각을 보여 준다.

- 항목을 누르면 해당 agent가 있는 workspace·pane·탭으로 이동하고 그 항목이 목록에서 빠진다
목록 상단의 제목과 `Clear all`은 스크롤해도 계속 보인다. 알림 항목 영역만 스크롤하며,
항목 사이에 구분선을 둔다. 빈 목록에서도 `Clear all`은 보이되 비활성으로 둔다.
벨의 개수 배지는 밝은 테마와 어두운 테마 모두에서 숫자를 구별할 수 있어야 한다.

- `Clear all`은 목록을 비우기만 하고 어디로도 이동하지 않는다. 동작이 비우기이므로
  `Mark all as read`라고 쓰지 않는다
- 항목을 따로 지우는 `×`는 두지 않는다. 누르는 것으로 이동과 확인이 함께 끝난다

이동 대상은 알림을 보낸 그 실행이다. 대상 귀속과 실행이 사라진 뒤의 이전 금지는
[[docs/specs/aiox-configuration-web]]이 소유하며, 화면은 그 계약을 그대로 따라 같은 terminal이
shell로 돌아가거나 다른 agent를 실행해도 과거 알림을 새 실행으로 보내지 않는다. 그 실행이나
그 탭이 지금 없으면 주소가 없는 화면과 같은 안내를 보여 준다. 이동이 그렇게 끝나도 확인
처리는 함께 끝난다. 누른 항목이 남으면 같은 결과를 다시 누르게 되기 때문이다.

읽음 처리 실패는 🔔 popover 안에 보인다. 헤더 아래나 toast로 보이지 않는다.

목록은 최신 알림이 위에 온다. 방금 받은 것을 맨 위에서 보고 누르게 하려는 것이다.

대상이 사라진 알림도 목록에서 감추지 않는다. 누르기 전까지 미확인 목록과 배지 수에 남는다.
agent 이름은 지금 있는 실행에서 가져오고 없으면 본문과 시각만 보여 준다. 이동할 수 없다는
별도 카드나 비활성 표시는 두지 않는다. 열어 본 사람이 무엇이 사라졌는지 알 길은 눌러서 받는
안내이며, 목록은 미확인 여부만 말한다.

상대 시각은 목록을 열 때 현재 시각과의 차이로 계산하고 열려 있는 동안 1분마다 다시 계산한다.
닫으면 갱신을 멈춘다. 경과를 누적해 세지 않으므로 닫아 둔 동안 흐른 시간도 다시 열 때 실제
차이로 나타난다.

항목이 사라지는 것은 승인이나 질문이 해결됐다는 뜻이 아니다. 해결되지 않은 대기는 탭의
`awaiting-user` 점이 계속 들고 있으므로 목록에서 빠져도 신호가 남는다. 알림 목록은 미해결
상태의 권위가 아니라 그곳으로 가라는 포인터다.

## 오류와 교체 범위

오류와 대기 상태는 영향을 받는 범위만 덮는다. 범위는 네 층이다.

| 층 | 덮는 범위 | 예 |
| --- | --- | --- |
| A 앱 덮개 | 메인 전체. 사이드바와 헤더는 남는다 | 연결 끊김의 재연결 중·중단(`Reload page`), 첫 로딩 `Loading application…`, 렌더 오류(`Reload page`와 접힌 상세) |
| B 페이지 교체 | 메인의 한 페이지 | 첫 진입 overview, 빈 섹션, 주소가 없는 화면(Not found와 섹션 링크) |
| C 탭 본문 교체 | 한 tab의 terminal 본문 | terminal 연결 끊김·재연결 중·화면 복원 실패·복원 불가·process 종료, Agent 준비·시작 실패·비정상 종료·unavailable, 새 shell 연결 중 |
| D 일시 오류 | 아래 세 자리 중 하나 | 명령 거절, 결과 미확정, 복사 실패 |

A가 떠 있으면 C는 보이지 않는다. 연결이 끊기면 모든 tab의 연결 실패가 한 원인이기 때문이다.
C의 Agent 안내 문구는 [[docs/specs/aiox-configuration-web]]의 Host panel과 Agent terminal UX를 따른다.

D는 다음 순서로 자리를 고른다.

1. 조작한 그 자리: 입력 줄 아래, 메뉴를 연 항목, 복사 버튼(`Copy failed`), Add agent 폼 안.
2. 명령을 보낸 pane 안의 한 줄: `tab.move`·`tab.create`(분할 포함)·`tab.close`·`tab.dismiss`가
   rejected나 unexecuted로 끝나면 그 명령을 보낸 pane 안에 `Move rejected: <reason>` 같은 한 줄과
   Dismiss를 보인다. 결과에는 pane ID가 없으므로 호출한 화면이 보낸 pane과 명령 이름을 기억해
   쓴다. 프로토콜은 바꾸지 않는다.
3. 헤더 `⚠` badge와 popover: 보낸 pane이 없거나 결과가 미확정인 것. 결과 unknown, cleanup
   실패, 설정 로드 실패가 여기 모인다. badge는 항목 수를 보인다.

toast와 헤더 아래에 쌓는 오류 줄은 쓰지 않는다. 알림 읽음 실패는 위 알림 절대로 🔔 popover 안에
둔다. `Could not load settings`와 `Something went wrong`은 제안 문구이며 확정하지 않았다.

## 커맨드 팔레트 [Status: Open/deferred]

검색창을 누르거나 단축키로 연다. workspace·터미널·agent 이름으로 검색해 선택하면 그곳으로
점프하고, 명령도 함께 검색된다. 타이핑하면 두 종류가 섹션으로 나뉘어 필터링되며 위아래
화살표로 이동하고 Enter로 실행, Esc로 닫는다.

팔레트 전체를 보류한다. 명령 섹션이 열려던 여섯 동작은 모두 이미 진입점이 있어 새로 여는
동작이 없다. `New shell`·`Split right`·`Split down`·사이드바 토글은 버튼과
[[docs/specs/aiox-configuration-web]]의 전용 키를 둘 다 가지므로 팔레트가 세 번째 경로가 되고,
테마와 `Settings`는 헤더 버튼 하나로 끝난다. 팔레트만 여는 동작은 전역 목록이 없는 터미널을
이름으로 찾는 것 하나뿐이며, 그 값어치는 실사용 터미널 수를 본 뒤 정한다. 보류 동안 헤더
검색 진입은 코드에서 주석으로 남기고 `cmdk`와 Command primitive는 지우지 않는다.

## 설정 화면

### 화면 구조

설정은 메인 영역을 차지하는 전체 화면이다. 사이드바는 그대로 남는다. 모달이나 오버레이로
띄우지 않는다. 값이 많고 터미널을 보면서 고칠 일이 없기 때문이다.

넓은 폭에서는 왼쪽에 섹션 목록이 세로로 오고 오른쪽에 그 섹션의 필드가 온다. 섹션 전환은
스크롤이 아니라 목록 클릭이다. 헤더 오른쪽에 실제 파일 경로를 흐리게 보여 준다.

섹션은 `Terminal`·`Keybindings`·`Appearance`·`Server`·`Host layout` 다섯이다. 필드는 아래가
전부이며 없는 항목을 추가하지 않는다. 각 필드의 검증 규칙과 저장 형식은
[[docs/specs/aiox-configuration-web]]을 따른다.

| 섹션 | 필드 |
| --- | --- |
| `Terminal` | Font family, Font size, Theme, Shell, Arguments, Working directory |
| `Keybindings` | 조작 11행과 각 행의 `Change` |
| `Appearance` | Theme |
| `Server` | Daemon port, Web port, Message retention |
| `Host layout` | preset 4개와 grid일 때의 Columns·Rows |

`Terminal`의 Theme은 터미널 자체 색이고 `Appearance`의 Theme은 AIOX 인터페이스 색이다. 둘을
혼동하지 않도록 각 자리에서 상대를 가리키는 안내를 둔다.

Arguments는 인자를 하나씩 추가·삭제한다. 한 줄에 공백으로 나열하지 않는다.

Font family는 미리보기 한 줄을 함께 보여 주고 등폭이 아니면 경고를 띄운다. 등폭 판정은
미리보기와 같은 폰트 스택을 본다. Font family와 Font size를 비우면 placeholder로 기본값을
보여 주고 그 기본값으로 돌아간다.

`Host layout`의 preset 그림 네 개는 같은 층위의 선택지다. 한 줄에 넷이 들어가면 `4 x 1`,
들어가지 않으면 곧바로 `2 x 2`로 접는다. 3열을 쓰지 않는다. 폭이 아니라 카드 개수로 갈리는
규칙이므로 이를 위해 breakpoint를 새로 만들지 않는다.

### 키 재지정

각 행의 `Change`를 누르면 키 캡처가 시작된다. 캡처 중에는 `Press keys…`를 보여 주고 Esc로
취소한다. 예약키 안내는 dialog가 아니라 상시 힌트로 둔다. 이미 쓰는 조합을 누르면 어느
행이 쓰고 있는지 알려 주고 그 행으로 이동할 수 있게 한다. 수식자 없는 조합은 거절한다.

기본값과 다른 행에는 `edited` 배지와 `Reset`을 함께 보여 준다. `Reset all defaults`로 전체를
되돌린다. 기본키는 코드가 제공하고 파일에는 바꾼 것만 저장한다.

물리 키보드가 없는 환경을 전제하지 않으므로 좁은 폭에서도 `Change` 캡처를 유지한다.

### 저장·되돌리기와 미리보기

하단에 Save 바를 둔다. 바뀐 항목 수를 보여 주고 `Revert`와 `Save`를 준다.

theme은 눈으로 보고 골라야 하므로 누르는 즉시 화면에 적용하고 저장 전까지 미리보기임을
표시한다. `Revert`나 `Discard`로 되돌린다.

직접 조작하는 컨트롤은 저장 절차를 거치지 않고 파일에 바로 쓴다. 헤더의 테마 토글과 사이드바
너비 드래그가 여기 해당하며 변경 카운트에 남지 않는다. 헤더 토글과 Appearance의 Theme은 같은
필드를 공유하므로, 설정 화면에서 theme을 미리보기 상태로 둔 채 헤더 토글을 누르면 그 필드만
확정되고 미리보기 표시가 사라지며 다른 항목의 미편집 상태는 그대로 남는다.

저장하지 않은 변경이 있는 채로 화면을 벗어나려 하면 `Discard changes?` dialog를 띄운다. 기본
포커스는 `Keep editing`이다. 파괴적 동작을 기본 자리에 두지 않는다.

### 외부 변경과 충돌

화면을 열 때 파일이 바뀌어 있으면 배너로 알리고 `Reload`를 제공한다. 저장하려는 시점에
파일이 그사이 바뀌었으면 dialog로 알리고 사용자가 고른 쪽을 적용한다. watcher나 설정 SSE를
쓰지 않으므로 외부 편집은 다음 조회에서 드러난다.

잘못된 파일은 마지막 유효 표시를 유지하며 오류를 보인다. daemon이 떠 있지 않으면 저장값이
다음 시작에 적용된다는 것을 알린다. 포트를 저장하면 다음 daemon 시작에 적용된다는 것을
같은 방식으로 알린다.

## 창 폭 반응형

대상은 사이드바·헤더·설정 화면과 Network·Host 페이지의 MEMBERS·DRAWER다. 터미널 영역은 창 폭에
따라 레이아웃을 바꾸지 않는다.
pane이 넷이면 각 폭이 1/4로 줄고 xterm이 fit·resize 될 뿐이며 세로 쌓기, 분할 자동 해제,
탭바 드롭다운 전환을 하지 않는다.

목적은 폰 전용 화면이 아니라 데스크톱 브라우저 창 축소 대응이다. breakpoint는 `768px` 하나이며
`360px` 이상 `768px` 미만이 좁은 폭, `360px` 미만은 대상이 아니다.

### 좁은 폭의 Sheet

좁은 폭에서는 terminal만 메인에 inline으로 남는다. 나머지는 기본 닫힘 Sheet이며 메인 폭을 줄이지
않는다.

| 영역 | 좁은 폭 | 넓은 폭 |
| --- | --- | --- |
| App sidebar | 왼쪽 Sheet | 각자 토글 |
| MEMBERS | 왼쪽 Sheet. 여는 버튼에 `awaiting-user` 수 badge | 각자 토글 |
| DRAWER | 오른쪽 Sheet | 각자 토글 |

사이드바 Sheet의 폭은 280px로 고정하고 리사이즈 핸들을 숨긴다. Sheet는 헤더의 버튼이나 토글
키로 열고 바깥 클릭·Esc로 닫는다.

알림·설정·테마는 폭과 무관하게 헤더에만 둔다. Sheet에 옮겨 담지 않는다. 진입점이 폭에 따라
자리를 옮기지 않으므로 미확인 수는 벨의 badge 하나로 알리고 사이드바 토글에 점을 붙이지 않으며,
알림 dropdown도 Sheet 위가 아니라 헤더에서 열린다.

화면을 이동시키는 동작은 사이드바 Sheet도 닫는다. 알림 항목, 팔레트 결과, workspace 선택, 설정
진입, 새 shell, 분할이 여기 해당한다. 테마 토글처럼 이동이 아닌 동작은 Sheet를 유지한다.

### 좁은 폭 헤더와 설정 화면

헤더는 사이드바 토글과 알림·설정·테마를 그대로 표시한다. 이름과 맥락 규칙은 위 헤더 바 절과
같으며 좁은 폭 전용 예외를 두지 않는다. 폭이 모자라면 맥락이 먼저 줄어드는 같은 규칙이
아이콘 자리를 지켜 준다.

설정 화면은 섹션 목록을 상단 가로 탭으로 바꾸고 필드를 1열로 쌓는다. 하단 Save 바와 dialog
기본 포커스 규칙은 그대로다.

## 넣지 않는 것

- 로그인·회원가입 화면. 인증 절차가 없는 제품이다
- 채팅 UI와 프롬프트 입력창. 사용자는 터미널 안에서 직접 입력한다
- vendor UX 복제. 모델 선택기, slash command 팔레트, 승인 dialog, quota 게이지
- 파일 트리, 코드 에디터, git diff 뷰어
- Host 만들기 버튼. Host는 `aiox host run`으로만 생긴다
- Network 이름 변경, 웹 route 편집, 멤버 제거 UI, topology 그래프
- toast와 헤더 아래에 쌓는 오류 줄
- 상시 표시되는 연결 상태 표시등
- 아이콘만 남는 사이드바 축소 모드
- 다국어. UI 문구는 영어 하나다. 공개 AIOX 사이트의 다국어는 별도 앱이며 이 범위가 아니다

## Sources

화면 규칙의 확정 경위와 검토한 대안은 `logs/2026-09-09-AIOX-TUI-Stage6-Web.md`와 누적 프롬프트
`logs/artifact/AIOX-Web-UI-Design-Prompt.md`에 있다. 프롬프트 파일은 기반 문서 셋에 1차부터
14차까지의 수정 지시가 누적된 형태이며 현재 규칙의 권위가 아니다. 왜 이 규칙이 됐는지를
되짚을 때만 읽는다.

Network·Host 페이지, 생성 입력 줄, 좁은 폭 Sheet 배치와 오류 교체 범위의 결정 경위와 확정 시안
v14는 `logs/2026-10-14-Network-Host-Member-Page-Design.md`와 `logs/artifact/aiox-version14.html`에 있다.
