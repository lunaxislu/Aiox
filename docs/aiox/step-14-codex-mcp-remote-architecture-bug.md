# Step 14: Codex MCP Remote Architecture Bug (Discovery & Analysis)

이 문서는 Step 14 스모크 테스트 도중 발견된 **Codex CLI의 `--remote` 모드와 MCP 서버 주입(Injection) 아키텍처 간의 충돌 문제**를 기록하는 learning record입니다. 권위 기록은 `history/40-step-14-daemon-client-split.history.md`의 Open Step 14 follow-up 항목입니다.

## 📌 증상 (Symptoms)

`aiox codex --name impl --pair p1` 명령어를 통해 Codex 클라이언트를 실행했을 때 다음과 같은 두 가지 비정상적인 동작이 관찰되었습니다.

1. **aiox 툴 누락**: Codex 채팅창에 `/mcp`를 입력해도 `aiox_send_message`, `aiox_reply` 도구를 제공하는 `aiox` MCP 서버가 목록에 나타나지 않음.
2. **로딩 멈춤 (Hang)**: 터미널 부팅 시 `Starting MCP servers (3/4): notion` 상태에서 영원히 멈춤.

---

## 🔍 원인 분석 (Root Cause)

이 문제는 aiox 코드의 단순한 오타가 아니라, **Codex의 클라이언트-서버(TUI vs App-Server) 아키텍처 구조** 때문에 발생한 복합적인 문제입니다.

### 1. 왜 `aiox` 툴은 누락되었는가? (Injection Target Mismatch)
*   **Step 13의 가정**: aiox는 `codex` 명령어를 실행할 때 `-c 'mcp_servers.aiox=...'` 옵션을 붙여 메모리 상으로 MCP 설정을 주입(Inject)하도록 설계되었습니다.
*   **실제 Codex의 동작**: Codex CLI를 로컬에서 단독으로 켤 때는 TUI(화면 프로세스)가 직접 MCP 서버들을 띄웁니다. 하지만 `--remote ws://...` 옵션을 붙여 **원격 모드로 실행하면, MCP 서버를 띄우고 관리하는 주체는 TUI가 아니라 백그라운드에 있는 `app-server` 프로세스로 넘어갑니다.**
*   **충돌 지점**: aiox는 `-c` 옵션을 **TUI 프로세스**에 주입하고 있었습니다. 그러나 TUI는 자신이 `--remote` 모드임을 인식하고 "MCP 관리는 내가 아니라 App Server가 할 일이다"라고 판단하여, **자신에게 주입된 `-c` MCP 설정을 완전히 무시(Ignore)**해 버렸습니다.

### 2. 왜 `notion`에서 로딩이 멈췄는가? (Headless Interactive Auth)
*   **App Server의 동작**: TUI의 요청을 받은 백그라운드 `app-server`는 사용자의 글로벌 설정(`~/.codex/config.toml`)을 읽어 기존에 등록된 4개의 MCP 서버(`codex_apps`, `context7`, `notion`, `openaiDeveloperDocs`)를 띄우기 시작합니다.
*   **충돌 지점**: `notion`과 같은 일부 MCP 서버는 OAuth 등 브라우저나 터미널 입력을 통한 **대화형 인증(Interactive Auth)**이 필요합니다. 하지만 `app-server`는 aiox 데몬에 의해 **표준 입출력(stdio)이 차단된 백그라운드 프로세스(Headless)**로 실행 중입니다.
*   **결과**: `notion` 서버는 백그라운드에서 사용자 입력을 영원히 기다리고, `app-server`는 그 응답을 기다리며 멈추게 되어 결국 화면(TUI)까지 `3/4` 로딩 상태에서 굳어버린 것입니다.

---

## 🧪 경험적 증명 (Experiments & Evidence)

위 원인은 다음 명령어들을 직접 실행하며 도출한 팩트(Fact) 및 공식 CLI 문서 내용입니다.

**증거 1: 로컬 모드에서는 인라인 주입(`-c`)이 정상 동작함을 확인**
```bash
codex mcp list -c 'mcp_servers.aiox = {command="echo", args=[]}' --json
```
*결과*: `aiox`, `context7`, `notion`, `openaiDeveloperDocs` 4개가 정상적으로 출력됨. (로컬 TUI에서는 주입이 먹힘)

**증거 2: 공식 CLI 동작 한계 (원격 모드에서는 인라인 주입이 무시/거부됨)**
```bash
codex mcp list -c 'mcp_servers.aiox = {command="echo", args=[]}' --remote ws://127.0.0.1:0
```
*터미널 실제 출력 결과*:
```text
error: unexpected argument '--remote' found

Usage: codex mcp list --config <key=value>
```
*결과 분석*: TUI가 `--remote` 모드일 때는 로컬 MCP 리스트 관리를 아예 거부함. MCP 제어권이 App Server에 있음을 시사.

**증거 3: `codex app-server --help` 공식 지원 확인**
`codex app-server` 명령어의 공식 도움말을 확인한 결과, App Server 역시 `-c` 옵션을 공식적으로 지원함을 확인했습니다.
```text
$ codex app-server --help
Options:
  -c, --config <key=value>
          Override a configuration value that would otherwise be loaded from `~/.codex/config.toml`.
```

**증거 4: App-Server에 직접 인라인 주입 테스트 (최종 교차 검증)**
```bash
# 터미널 1: App Server 자체에 -c 옵션을 주고 실행
codex app-server --listen ws://127.0.0.1:18889 -c 'mcp_servers.aiox={command="echo", args=["test"]}'

# 터미널 2: TUI는 아무 옵션 없이 접속만 함
codex --remote ws://127.0.0.1:18889
```
*결과*: 이 구조로 실행해야만 `aiox` 서버가 정상적으로 원격 TUI 화면(`/mcp` 메뉴)에 나타남을 최종 확인. 즉, 주입 타겟이 app-server 쪽이어야 한다는 판단을 강하게 뒷받침함.

---

## 🛠 해결 방안 (Proposed Solutions)

다음 세션에서는 이 아키텍처적 한계를 우회/수정하기 위해 아래 방향 중 하나로 코드를 수정해야 합니다.

### Action 1: 주입 타겟을 App Server로 변경
`aiox` 툴을 띄우기 위한 `-c 'mcp_servers.aiox=...'` 인라인 설정은 TUI 런처(`launchCodexTui`)가 아니라, **App Server 런처(`launchCodexAppServer`)**를 띄울 때 주입해야 합니다.

*   **수정 대상**: `src/adapters/codex/launcher.ts`
*   **설계 변경**: 데몬이 `app-server`를 띄울 때 해당 에이전트의 이름과 토큰을 미리 알고 `-c` 옵션을 꽂아넣어야 합니다.

### Action 2: 백그라운드 App Server의 MCP 격리 (Isolation)
백그라운드에서 도는 `app-server`가 사용자의 글로벌 `.toml` 설정을 무분별하게 읽어서 대화형 인증이 필요한 MCP를 띄우다 멈추는 현상을 막아야 합니다.

*   **해결책 A (환경 변수 고립)**: `app-server`를 띄울 때 빈 임시 폴더를 `CODEX_HOME`으로 지정하여 완전히 깨끗한 상태로 실행되도록 격리합니다.
*   **해결책 B (프로파일 지정)**: `--profile` 옵션을 사용해 aiox 전용 프로파일로 실행하게 만들어 기존 사용자의 설정(Notion 등)이 로드되지 않도록 분리합니다.

---

## 📜 참조 권위 문서 (Authority References)
* 이 문서는 Step 14 스모크 테스트의 learning record입니다.
* 권위 기록은 `history/40-step-14-daemon-client-split.history.md`의 Open Step 14 follow-up 항목입니다.
* 이후 구현 시 `history/39-step-13-codex-mcp-ingress.history.md`의 기존 TUI 주입 결정을 함께 재검토해야 합니다.

---

## 다음 세션 해결 방향

다음 세션에서는 이 문제를 Step 14의 남은 blocker로 보고 TDD로 해결합니다. 아래는 현재 관찰에 기반한 해결 후보이며, 구현 전 targeted red test로 contract를 먼저 고정합니다.

1. **`src/adapters/codex/launcher.ts` 수정 후보:**
   - `buildCodexTuiMcpArgs`가 생성하는 `-c` 인라인 TOML 로직을 `launchCodexAppServer` 내부로 옮기는 방향을 검토합니다.
   - 데몬이 `app-server`를 `spawn`할 때 `-c` 옵션이 인자로 들어가야 합니다. (이때, `agentName`과 `agentToken`은 런처 호출 시점에 전달받을 수 있도록 인터페이스를 수정해야 합니다.)
   - TUI 런처(`launchCodexTui`)에서는 더 이상 `-c`를 주입하지 않는 방향이 유력합니다.

2. **App Server 격리 (Hang 방지) 후보:**
   - `launchCodexAppServer`에서 `app-server`를 `spawn`할 때, 환경 변수(`env`) 객체에 `CODEX_HOME`을 임시 디렉토리(`/tmp/aiox-codex-home-${agentName}` 등)로 오버라이드하는 방향을 검토합니다.
   - 이렇게 하면 App Server가 사용자의 기존 `.mcp.json`이나 `config.toml`(Notion 등)을 읽지 못해 Headless 상태에서 무한 대기(Hang)하는 문제를 줄일 수 있습니다. 이 변경은 Step 13의 hidden `aiox mcp-codex` stdout protocol, token hardening, same socket path contract를 회귀시키면 안 됩니다.