# AIOX 운영 Web UI 디자인 프롬프트 (Stage 6, 1차: workspace 화면)

아래 전체를 클로드 앱에 붙여넣는다. 설정 화면은 2차 프롬프트로 분리한다.

---

AIOX라는 로컬 개발자 도구의 운영 Web UI를 **동작하는 HTML 프로토타입**으로 만들어 주세요.
단일 HTML 아티팩트 하나로, 드래그·분할·탭 전환이 실제로 동작해야 합니다.

## 제품 배경 (설계에 필요한 만큼만)

AIOX는 개발자 로컬 머신에서 Claude Code와 Codex의 **실제 터미널 UI(TUI)**를 실행하고,
여러 agent를 서로 연결해 협업시키는 도구입니다. 브라우저에서 그 터미널들을 보고 배치합니다.

중요: 모델 선택, slash command, 승인 다이얼로그 같은 vendor UX는 **터미널 안에서** 벌어집니다.
이 화면은 그걸 복제하지 않습니다. 이 화면이 하는 일은 세 가지뿐입니다 —
터미널을 담는 그릇, 어떤 agent가 무슨 상태인지, 알림.

감각적 참고: cmux, Ghostty, VS Code 통합 터미널. 개발자 도구, 고밀도, dark-first.
나중에 React + Tailwind + shadcn/ui로 구현할 예정입니다.

## 전체 레이아웃

**사이드바가 전체 높이를 차지하고, 그 오른쪽에 헤더 바 + 메인이 놓입니다.**
(shadcn의 SidebarProvider + SidebarInset 구조)

```
┌────────────────┬──────────────────────────────────────────────────┐
│ AIOX           │ ◧ development · ~/projects/app · feat/login      │ ≤40px
│                │                      [Search… ⌘K]   🔔   ☀︎     │
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

헤더 바는 한 줄이고 40px 이하입니다. 위 그림은 내용을 보여주려 두 줄로 그렸을 뿐입니다.

**사이드바와 메인 영역은 붙어 있습니다(flush).** 메인을 라운드 카드로 띄우는 inset 형태는
쓰지 마세요 — 터미널은 여백이 곧 정보 손실이고, pane 경계 드래그 핸들과 모서리가 겹칩니다.

### 사이드바 (전체 높이)

맨 위에 AIOX 로고/워드마크. 그 아래 세 섹션이 이어집니다.
세 섹션은 **전부 같은 종류(workspace)**이고 생기는 방법만 다릅니다:

- WORKSPACES — 사용자가 Web에서 직접 만듦. 섹션 헤더에 `+` 버튼. 이름 변경·삭제 가능
- NETWORKS   — CLI로만 생김(`aiox network create dev`). **`+` 버튼 없음**
- HOSTS      — CLI로만 생김(`aiox host run`). **`+` 버튼 없음**

`+`는 이 한 곳에만 두세요. pane 안의 `[+]`는 터미널·분할을 만드는 별개 버튼이라,
다른 곳에도 `+`를 두면 같은 기호가 두 가지를 뜻하게 됩니다.

셋 다 클릭하면 같은 형태의 workspace 화면으로 전환됩니다.
workspace 화면 = pane 트리이고, pane마다 **독립된 탭바**를 가집니다.

#### 사이드바 표시·크기 동작

- 토글(⌘B, 또는 헤더 바 왼쪽 버튼)로 **완전히 숨겨집니다.** 숨기면 메인이 가로 폭을
  전부 차지합니다. 아이콘만 남는 축소(rail) 모드는 쓰지 마세요
- 오른쪽 경계를 마우스로 드래그해 너비를 조절합니다. 기본 240px, **최소 180px, 최대 400px**
- 최소 너비에 닿으면 **거기서 멈춥니다.** 더 끌어도 자동으로 숨겨지지 않습니다
- 숨긴 상태에서도 헤더 바의 토글 버튼은 계속 보여야 합니다
- 조절한 너비는 기억됩니다

### 헤더 바 (메인 위, workspace 헤더 성격)

왼쪽부터:

- 사이드바 토글 (⌘B). **토글은 여기 한 곳에만** — 사이드바를 접어도 계속 보여야 하니까요
- 현재 workspace 이름과 맥락. workspace 종류에 따라 내용이 다릅니다:
  - Host → 이름 · 작업 경로 · worktree 브랜치 (있으면)
  - Network → 이름 · 멤버 수
  - Workspace → 이름만
- 오른쪽: 검색창(클릭하거나 ⌘K로 커맨드 팔레트), 알림 벨(미확인 배지), 테마 토글(dark/light)
- 연결 상태는 **평소에 표시하지 않습니다.** daemon 연결이 끊겼을 때만 이 바에 경고가
  나타나게 하세요. 늘 켜져 있는 녹색 점은 두지 마세요

## 반드시 동작해야 하는 상호작용

1. 사이드바 항목 클릭 → workspace 전환. 각 workspace는 자기 pane 배치·탭 순서·선택을 기억하고,
   헤더 바의 맥락 표시도 함께 바뀜
2. pane의 `[+]` → 드롭다운: New shell (⌘T) / Split right (⌘D) / Split down (⌘⇧D)
3. 탭 드래그 — 네 가지 결과를 모두 구분:
   - 같은 탭바 안 → 순서 변경 (삽입선 표시)
   - 다른 pane의 탭바 → 그 pane으로 이동
   - pane 가장자리(상·하·좌·우) → **새 분할 생성**
   - pane 중앙 → 그 pane의 탭으로 합치기

   드롭 전에 들어갈 자리를 반투명 오버레이로 미리 보여줄 것.
   가장자리 존 두께는 디버그 패널에서 조절 가능하게(기본 pane의 20%)
4. pane 경계 드래그 → 리사이즈. hover 시 핸들이 드러남
5. 마지막 탭을 빼서 빈 pane이 되면 → 인접 pane이 자리를 채우며 병합
6. 포커스 — 활성 pane은 테두리 강조, 비활성은 약하게. 터미널 본문 색은 건드리지 않음
7. 탭 닫기 `×`
8. 병합할 게 없어 workspace가 비면 → 탭바와 `[+]`만 남은 빈 pane
9. 알림 벨 → 드롭다운 목록. 항목 클릭하면 해당 agent가 있는 workspace·pane·탭으로 이동 + 읽음 처리
10. 사이드바 토글·너비 조절 (위 「사이드바 표시·크기 동작」대로)
11. **커맨드 팔레트 (⌘K)** — 검색창 클릭으로도 열림:
    - workspace·터미널·agent 이름으로 검색해서 선택하면 그곳으로 점프
    - 명령도 함께 검색됨: New shell, Split right, Split down, Toggle theme, Toggle sidebar
    - 타이핑하면 두 종류가 섹션으로 나뉘어 필터링되고, ↑↓로 이동, Enter로 실행, Esc로 닫힘

## 터미널 내용

실제 구현은 xterm이 담당하므로 프로토타입에서는 **가짜 텍스트**입니다. 단 진짜처럼 보여야 합니다.

- shell 탭: 프롬프트 + 명령 기록 몇 줄 (`git status`, `pnpm build`,
  `aiox agent run claude --network dev` 등)
- agent 탭: Claude Code / Codex TUI처럼 보이는 가짜 출력 — 박스 드로잉 문자, 작업 진행 표시,
  도구 호출 로그
- 등폭 폰트. 터미널 배경은 주변 chrome과 같거나 아주 약간 더 어둡게

## 상태 (실제 값이므로 이름을 바꾸지 마세요)

agent 상태 7가지:
`starting` `idle` `reasoning` `tool` `awaiting-user` `failed` `stopped`

- 탭에 상태 점(dot)으로 표시. 색은 각각 구분되게
- `awaiting-user`는 사용자가 TUI에서 직접 답해야 하는 상태 → **가장 눈에 띄어야 함**
- `failed`는 이유 문자열이 붙음 (예: `rate_limit`, `authentication_failed`)
- `stopped`는 종료된 항목 — 목록에 남되 흐리게

터미널 종류 3가지:

- `shell` — 사용자가 명령을 치는 곳
- `agent` — vendor TUI가 도는 곳
- `external` — 외부 터미널(사용자의 Ghostty 등)에서 실행된 agent.
  AIOX가 소유한 화면이 아니라 **터미널 내용을 보여줄 수 없음**.
  이 탭을 선택하면 터미널 대신 안내를 표시:
  "This agent runs in an external terminal. AIOX cannot display its screen."
  + agent 이름과 현재 상태. 조작 버튼은 없음

## 알림

- 벨에 미확인 개수 배지
- 항목: 어떤 agent에서 무슨 일이 있었는지 + 상대 시각
- "Mark all as read" 있음
- 읽음은 "승인·질문이 실제로 해결됨"과 다릅니다. 단지 확인했다는 뜻이므로 그렇게 보이게 할 것

## 넣지 말 것

- 로그인·회원가입 화면 (인증 절차가 없는 제품입니다)
- 채팅 UI, 프롬프트 입력창 — 사용자는 터미널 안에서 직접 타이핑합니다
- vendor UX 복제: 모델 선택기, slash command 팔레트, 승인 다이얼로그, quota 게이지
- 파일 트리, 코드 에디터, git diff 뷰어
- 설정 화면 (별도로 만들 예정)
- Network / Host 만들기 버튼 (CLI로만 생깁니다)
- 상시 표시되는 연결 상태 표시등
- 아이콘만 남는 사이드바 축소 모드

## 프로토타입에 미리 넣어둘 데이터

사이드바:

- WORKSPACES: `main`, `scratch`
- NETWORKS: `dev`
- HOSTS: `development`

시작 시 `dev`가 선택된 상태:

- 왼쪽 pane — 탭 `[Claude ●reasoning]` `[shell]`, Claude 선택됨
- 오른쪽 pane — 탭 `[Codex ●awaiting-user]` `[Reviewer ●idle · external]`
- 미확인 알림 2개
- 헤더 바: `dev · 3 agents`

다른 workspace도 전환하면 내용이 있어야 합니다:

- `main` — shell 하나. 헤더 바에 이름만
- `scratch` — shell 둘이 좌우 분할
- `development` (Host) — 2×2 그리드에 agent 4개, 하나는 `failed`, 하나는 `stopped`.
  헤더 바: `development · ~/projects/app · feat/login`

## 비주얼

- **dark-first**. light 테마도 토글로 전환되게 (두 테마 다 완성도 있게)
- 색은 shadcn/ui 스타일의 CSS 변수 토큰으로 정의:
  `--background --foreground --card --muted --muted-foreground --border --accent --ring`,
  사이드바용 `--sidebar --sidebar-foreground --sidebar-border` 등.
  나중에 React + shadcn으로 옮길 거라 토큰 이름을 그렇게 맞춰 주세요
- 고밀도: 헤더 바·탭 높이·사이드바 항목 높이를 촘촘하게. 여백이 넉넉한 SaaS 대시보드가 아니라
  개발자 도구 느낌으로
- **UI 문구는 전부 영어**
- 데스크톱 우선(1280px 이상 기준). 모바일 대응 불필요

## 추가로 넣어주면 좋은 것

화면 구석에 접을 수 있는 작은 디버그 패널을 두고 다음을 바꿔볼 수 있게 해주세요:

- agent 상태를 7가지로 바꾸기
- 알림 추가하기
- 드롭 존 두께 조절
- daemon 연결 끊김 상태 켜기/끄기 (헤더 바 경고 확인용)
- 테마 전환
