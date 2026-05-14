# aiox rewrite 결정 기록

> 작성일: 2026-05-14
> 관련 기록: `history/12-durable-relay-architecture.history.md`

---

## 결정

기존 `bridge` / `claude-adapter` 중심 구현은 `legacy/bridge-relay-v1/`로 보존하고, 새 프로젝트는 `aiox`라는 local agent orchestrator 방향으로 다시 설계한다.

이 결정은 기존 구현이 완전히 틀렸기 때문이 아니다. 오히려 PoC와 조사 결과, 기존 구현이 사용한 핵심 기술 선택은 맞았다.

- Codex 자동 relay에는 `codex app-server` WebSocket과 `turn/start`가 필요하다.
- Claude 자동 relay에는 development channel과 `notifications/claude/channel`이 필요하다.
- 표준 MCP server-to-client push만으로는 수신 agent의 UI transcript/model turn을 자동으로 만들 수 없다.

문제는 기존 구현의 책임 경계가 제품 목표와 맞지 않게 섞여 있다는 점이다.

## PoC 결과

`spikes/mcp-http-router-poc/`에서 central MCP HTTP router를 검증했다.

확인된 내용:

- Codex CLI와 Claude Code는 central MCP server에 client로 연결할 수 있다.
- MCP tool call 기반으로 `ask_* -> inbox -> poll_inbox -> reply_to_router` 왕복은 양방향 성공했다.
- 수신 agent의 다음 turn에서 `poll_inbox`를 먼저 호출하도록 지시하면 cooperative routing은 가능하다.
- 그러나 MCP-only push는 수신 agent의 UI transcript/model context에 새 turn으로 자동 주입되지 않았다.
- 따라서 수신 agent가 아무 입력 없이 깨어나 작업을 수행하는 구조는 MCP-only로 불가능하다.

결론:

```text
MCP-only central router: 불가
Central router + per-agent transcript injection adapter: 가능
```

## 새 제품 목표

최종 UX는 사용자가 복잡한 실행 모드를 직접 알 필요 없게 하는 것이다.

```text
aiox pair
aiox codex  # 현재 터미널에서 Codex side 실행
aiox claude # 현재 터미널에서 Claude side 실행
aiox daemon # router/broker만 실행
aiox status
aiox stop
aiox doctor
```

`aiox`는 단순 MCP bridge가 아니라 local agent orchestrator다.

역할 분리:

```text
Control plane
  MCP tools, ask/reply/status

Routing plane
  reply_id, pending, relay_depth, diagnostics

Injection plane
  Codex app-server thread/loaded/list + turn/start
  Claude development channel + notifications/claude/channel

Launcher plane
  cmux-first split/workspace launcher
  tmux fallback
  manual/background fallback
```

## Launcher 판단

터미널 split에는 공통 표준이 없다.

일반적인 배포 관점에서는 tmux가 가장 넓은 공통분모지만, 현재 주 사용 환경은 `cmux`다. `cmux`는 CLI로 workspace, split, surface, send, read-screen 등을 제어할 수 있으므로 이 프로젝트의 MVP launcher는 `cmux-first`로 둔다.

우선순위:

```text
1. cmux 안이면 현재 workspace에서 split/surface 생성
2. cmux가 설치되어 있으면 새 workspace 생성
3. tmux fallback
4. manual/background 안내
```

GUI 터미널별 native adapter(iTerm2, WezTerm, Kitty 등)는 MVP 이후 plugin으로 검토한다.

## 외부 검토 요약

Gemini와 Claude에게 두 가지 주제를 검토시켰다.

1. Codex/Claude의 transcript injection 가능 경로
2. cross-terminal launcher/split UX

### transcript injection 검토

Gemini 검토 결과:

- Codex CLI는 `codex app-server`와 WebSocket JSON-RPC API를 통해 transcript injection이 가능하다.
- 핵심 흐름은 `thread/loaded/list`로 활성 thread를 찾고, `turn/start`로 새 turn을 주입하는 것이다.
- 일반 `.codex/config.toml`이나 MCP 설정만으로는 transcript injection이 불가능하다.
- Claude Code는 development channel 기능을 통해 `notifications/claude/channel` 알림을 UI transcript에 주입할 수 있다.
- Claude channel은 `--dangerously-load-development-channels` 실행 모드가 필요하며 실험적/비공식 성격이 강하다.

Gemini 결론:

```text
MCP-only central router는 불가.
Central router + per-agent UI injection adapter가 유일하게 자동 작업 수행이 가능한 구조다.
```

이 결론은 PoC 결과와 일치한다.

### terminal launcher 검토

Gemini와 Claude 모두 다음 결론에 동의했다.

- 터미널 split에는 공통 표준 API가 없다.
- tmux가 일반적인 cross-terminal 공통분모다.
- GUI terminal native automation(iTerm2, WezTerm, Kitty, VS Code 등)은 유지보수 비용과 권한/버전 문제가 크다.
- MVP는 terminal-specific native adapter를 만들기보다 `tmux or background/manual fallback`으로 가는 것이 안전하다.

Claude 쪽 검토는 더 보수적이었다.

```text
MVP는 tmux or background/manual fallback.
GUI terminal automation은 post-MVP plugin으로 미룬다.
```

이후 현재 사용 환경이 `tmux`가 아니라 `cmux`임을 확인했다. `cmux --help` 기준으로 `new-workspace`, `new-split`, `new-pane`, `new-surface`, `send`, `read-screen` 등 launcher에 필요한 CLI surface가 충분하다.

따라서 일반론은 `tmux`지만, 이 프로젝트의 실제 MVP launcher 우선순위는 다음으로 조정한다.

```text
1. cmux
2. tmux
3. manual/background fallback
4. GUI terminal native adapter는 post-MVP plugin
```

다만 배포 UX에서는 `aiox` core가 모든 터미널별 split 자동화를 직접 책임지지 않는다. 대신 README에 terminal별 recipe/script를 제공한다.

예:

```text
recipes/
  cmux-pair.sh
  tmux-pair.sh
  wezterm-pair.sh
  kitty-pair.sh
  iterm2-pair.applescript
```

사용자는 자신의 터미널에 맞는 script를 alias하거나 wrapper로 등록할 수 있다.

```text
alias aiox-pair='~/.../recipes/wezterm-pair.sh'
```

이 방식의 장점:

- core `aiox`는 portable하게 유지한다.
- terminal별 자동화 실패가 core 안정성을 해치지 않는다.
- 사용자는 원하는 터미널에서 `aiox pair` 같은 UX를 직접 구성할 수 있다.
- 자동 split이 안 되는 환경에서도 `aiox codex`와 `aiox claude`를 각각 다른 터미널에서 실행하면 같은 daemon/router에 연결할 수 있다.

따라서 core CLI는 다음 명령을 안정적으로 제공하는 데 집중한다.

```text
aiox daemon
aiox codex
aiox claude
aiox pair --mode cmux
aiox pair --mode tmux
aiox status
aiox stop
aiox doctor
```

터미널별 “진짜 split UX”는 core 기능이 아니라 documented recipe로 시작하고, 수요가 확인된 것만 post-MVP adapter/plugin으로 승격한다.

### 외부 검토에서 확정된 것과 남은 것

확정:

- transcript injection에는 agent별 특수 adapter가 필요하다.
- MCP는 control plane으로만 사용한다.
- terminal split은 표준화하지 않는다.
- `cmux-first` launcher는 현재 사용자 환경에 맞는 MVP 선택이다.
- terminal-specific split은 README recipe/script로 제공하고 core 책임에서 분리한다.

남은 검증:

- `cmux`에서 실제로 원하는 좌/우 pane 구성과 command injection이 안정적으로 되는지.
- `codex app-server` 하나를 여러 Codex UI가 공유할 수 있는지.
- Claude channel server를 Node.js만으로 구현했을 때 안정적인지.
- `aiox pair`가 실패했을 때 manual fallback UX를 어디까지 자동화할지.
- README recipe를 어느 터미널부터 제공할지.

## Legacy 보존

기존 구현은 폐기하지 않고 `legacy/bridge-relay-v1/`에 보존한다.

보존 대상:

- `bridge/`
- `claude-adapter/`
- `docs/`
- `plan/`
- `blog/`
- `spikes/`
- 기존 package/workspace 설정
- repo-local Codex/Claude MCP 설정
- Codex app-server schema 조사 자료

루트에는 새 프로젝트를 시작하는 데 필요한 최소 파일만 남긴다.

- `.git/`
- `AGENTS.md`
- `.ai/`
- `history/`

## 확정된 설계 판단

### MCP와 transcript injection은 분리한다

MCP는 control/tool plane으로 사용한다.

```text
agent -> aiox MCP tools
```

하지만 MCP-only push는 수신 agent의 transcript/model turn을 자동으로 만들 수 없으므로, agent별 transcript injection adapter가 별도로 필요하다.

```text
Codex: codex app-server WebSocket + turn/start
Claude: development channel + notifications/claude/channel
```

### aiox는 1:1 bridge가 아니라 orchestrator다

초기 MVP는 Codex와 Claude Code 연결에서 시작하지만, 설계는 특정 두 agent에 고정하지 않는다.

확장 후보:

- Cursor IDE
- Gemini CLI
- Copilot CLI
- 기타 MCP client 또는 transcript injection API가 있는 agent

따라서 내부 모델은 `codex <-> claude` 하드코딩이 아니라 agent registry와 route target 기반으로 잡는다.

```text
AgentInstance
  id
  name/tag
  kind
  status
  cwd
  session metadata
  adapter capabilities
```

### 1:N 연결 가능성을 열어둔다

처음부터 1:N fan-out을 구현할 필요는 없지만, data model과 CLI UX는 1:1만 전제하지 않는다.

예:

```text
aiox codex --name implementer
aiox claude --name reviewer
aiox gemini --name researcher

aiox connect implementer reviewer
aiox connect reviewer researcher
```

MVP에서는 named pair 정도만 구현하고, N-agent routing은 post-MVP로 둔다.

### agent 이름/tag는 제품 UX의 핵심이다

`aiox`로 실행한 agent는 사람이 알아볼 수 있는 이름을 가져야 한다.

목적:

- 현재 agent가 `aiox`에 의해 연결된 세션임을 인지
- 1:N 구조에서 대상 agent를 명확히 지정
- debug/status/log에서 session을 구분

예:

```text
aiox codex --name codex-main
aiox claude --name claude-reviewer
aiox pair --name feature-x
```

### reply뿐 아니라 instruction이 필요하다

기존 relay는 request/reply 중심이었다.

새 구조에서는 다음 메시지 유형을 구분한다.

```text
question
instruction
status
event
reply
```

예:

- 자료 조사 지시
- 코드 구현 지시
- 디버깅 지시
- 리뷰 지시
- 진행 상태 공유

## 검증이 필요한 항목

### 패키지와 런타임 선택

기존 legacy에서는 Claude adapter 실행에 Bun을 사용했다. 새 구현에서는 Node.js 중심으로 단순화하는 방향이 더 적합해 보인다.

검증할 것:

- `@modelcontextprotocol/sdk`만으로 필요한 MCP server/client 구현이 충분한가
- Claude channel server를 Node.js만으로 안정적으로 구현할 수 있는가
- MCP Inspector를 local debugging UI로 활용할 수 있는가
- `tsx` 또는 Node 24 native TypeScript를 사용할지, build-first TypeScript로 갈지

### 테스트 도구

Vitest를 기본 후보로 둔다.

검증할 테스트 범위:

- router core unit test
- pending/message lifecycle test
- adapter contract test
- CLI command parsing test
- cmux launcher command generation test
- fake Codex/Fake Claude adapter integration test

실제 Codex/Claude CLI를 띄우는 E2E는 느리고 환경 의존적이므로 별도 manual 또는 smoke suite로 분리한다.

### Codex app-server 다중 실행 모델

질문:

```text
여러 Codex instance를 실행할 때 app-server WebSocket을 여러 개 띄울 것인가,
하나의 app-server에 여러 remote Codex UI/thread를 붙일 수 있는가?
```

검증할 것:

- `codex app-server` 하나가 여러 `codex --remote` session을 처리할 수 있는지
- active thread 선택을 instance별로 안정적으로 구분할 수 있는지
- app-server port/session 충돌을 어떻게 피할지
- pair별 app-server를 둘지, daemon-level shared app-server를 둘지

MVP 기본값은 보수적으로 pair/session별 Codex app-server를 둔다. shared app-server는 검증 후 최적화한다.

### session restart와 adapter 교체

agent CLI가 재시작되면 기존 session id나 transport connection은 바뀔 수 있다.

필요한 동작:

- 기존 `AgentInstance`는 유지
- adapter connection만 새 session으로 교체
- pending message는 상태를 잃지 않음
- 기존 reply가 늦게 도착하면 stale/late event로 기록

이 영역은 durable broker 설계와 연결된다.

### auth/token 만료 처리

Codex 또는 Claude의 인증 토큰이 만료되면 대화 중 relay가 멈출 수 있다.

필요한 동작:

- adapter가 auth error를 감지
- router가 해당 agent 상태를 `auth_required` 또는 `blocked`로 변경
- 상대 agent에게 status/event로 알림
- 사용자는 해당 pane에서 재인증 후 resume

### timeout 대신 message lifecycle을 사용한다

legacy의 synchronous timeout은 긴 작업에 부적합하다.

새 구조에서는 timeout을 “작업 실패 판정”의 중심으로 두지 않는다. 대신 message lifecycle을 둔다.

```text
queued
delivered
started
waiting
completed
failed
cancelled
expired
stale
```

MCP tool call은 짧은 acknowledgement를 반환하고, 실제 결과는 message id로 조회하거나 transcript injection을 통해 전달하는 방향을 검토한다.

## MVP 전 검증 항목

일부 항목은 MVP에서 완성 기능으로 제공하지 않더라도, 초기에 한 번 검증해야 한다. 그래야 adapter/process model을 잘못 잡지 않는다.

MVP 시작 전에 확인할 것:

- Node.js + `@modelcontextprotocol/sdk`만으로 Claude channel server를 구현할 수 있는지.
- `cmux`에서 workspace/split/surface 생성과 command injection이 안정적인지.
- SQLite schema 생성, agent/route/message 저장, daemon restart 후 기본 복구가 가능한지.
- `codex app-server` 하나가 여러 Codex UI/thread를 처리할 수 있는지.

이 중 Codex app-server 공유 검증은 MVP 기능을 의미하지 않는다. MVP 기본값은 보수적으로 pair/session별 app-server를 둘 수 있다. 다만 shared app-server가 가능한지 먼저 알아야 장기 adapter 경계를 잘못 잡지 않는다.

## MVP 범위

MVP에서 반드시 필요한 것:

- `pnpm` 기반 새 프로젝트 초기화
- `aiox` CLI 기본 골격
- daemon lifecycle 명령
- router core의 in-memory message lifecycle
- agent registry와 name/tag
- SQLite 기반 durable schema 초기 버전
- Codex adapter skeleton
- Claude channel adapter skeleton
- cmux-first launcher skeleton
- fake adapter 기반 테스트
- `aiox doctor`
- `aiox status`

MVP에서 미룰 것:

- Cursor/Gemini/Copilot 실제 adapter
- 완전한 1:N fan-out routing
- 완전한 SQLite 기반 resume-safe workflow
- GUI terminal native split adapter
- 여러 Codex instance의 shared app-server 최적화
- 장시간 작업의 완전한 resume-safe workflow

## 다음 작업

새 루트에서 사용자가 `pnpm init`으로 새 프로젝트를 시작한다.

초기 설계 주제:

- `aiox` package layout
- daemon/router core boundary
- agent registry data model
- message lifecycle data model
- codex adapter boundary
- claude channel adapter boundary
- cmux launcher MVP
- config/state/log directory policy
- Vitest 기반 테스트 전략

## aiox CLI 명령 설계

MVP 명령은 daemon을 중심으로 둔다. `aiox pair`, `aiox codex`, `aiox claude` 중 어떤 명령을 먼저 실행해도 daemon이 없으면 자동으로 시작한다.

```text
aiox daemon start
aiox daemon stop
aiox daemon stop --daemon-only
aiox daemon restart
aiox daemon status

aiox pair
aiox codex
aiox claude
aiox status
aiox stop
aiox doctor
```

명령 의미:

```text
aiox daemon start
  daemon 없으면 시작한다.
  이미 실행 중이면 현재 daemon 정보를 출력한다.

aiox daemon stop
  daemon과 daemon이 관리 중인 child process를 graceful stop한다.

aiox daemon stop --daemon-only
  daemon만 중지하고 agent process는 남긴다.
  남은 agent는 다음 daemon start/restart에서 disconnected/stale 후보가 된다.

aiox daemon restart
  daemon stop 후 start한다.
  SQLite에 저장된 agents/routes/messages 복구를 검증하는 핵심 명령이다.

aiox daemon status
  daemon pid, socket/port, uptime, db path, managed agents/routes/messages 요약을 출력한다.

aiox status
  daemon status shortcut이며 agent/route 상태까지 함께 보여준다.

aiox stop
  전체 stop shortcut이다. MVP에서는 aiox daemon stop과 동일하게 둔다.

aiox codex
  daemon 없으면 시작한다.
  Codex side를 현재 터미널에서 실행하고 AgentInstance로 등록한다.
  기본 상태는 unpaired다.

aiox claude
  daemon 없으면 시작한다.
  Claude side를 현재 터미널에서 실행하고 AgentInstance로 등록한다.
  기본 상태는 unpaired다.

aiox pair
  daemon 없으면 시작한다.
  Codex와 Claude를 실행하고 같은 route/pair로 연결한다.
  launcher는 cmux-first, tmux fallback, manual/background fallback을 따른다.

aiox doctor
  cmux/tmux/codex/claude/node/pnpm/db/socket 등 실행 환경을 진단한다.
```

## aiox 모듈 경계

MVP는 단일 package로 시작하되, 디렉터리 경계는 처음부터 명확히 둔다. 나중에 필요하면 package로 분리한다.

초기 구조:

```text
src/
  bin/
    aiox.ts

  cli/
    commands/
      daemon.ts
      pair.ts
      codex.ts
      claude.ts
      status.ts
      stop.ts
      doctor.ts

  daemon/
    server.ts
    api.ts
    supervisor.ts
    state.ts

  core/
    agents.ts
    routes.ts
    messages.ts
    events.ts
    ids.ts

  store/
    sqlite.ts
    schema.ts
    repositories/

  adapters/
    codex/
      app-server.ts
      websocket.ts
      injector.ts
      launcher.ts

    claude/
      channel-server.ts
      injector.ts
      launcher.ts

  launcher/
    cmux.ts
    tmux.ts
    manual.ts
    recipes.ts

  mcp/
    server.ts
    tools.ts

  config/
    paths.ts
    config.ts

tests/
```

역할:

```text
bin
  CLI entrypoint.

cli
  사용자 명령 파싱과 출력.

daemon
  background process, local API, child process supervisor.

core
  AgentInstance, Route, Message lifecycle, Event 같은 순수 도메인 로직.

store
  SQLite schema와 repository.

adapters/codex
  codex app-server process, WebSocket client, thread/loaded/list, turn/start.

adapters/claude
  Claude channel MCP server, notifications/claude/channel.

launcher
  cmux/tmux/manual 실행 UX와 recipe 연동.

mcp
  외부 agent가 설치할 aiox MCP server/tools.

config
  config/state/log/socket/db path 관리.
```

장기적으로 커지면 다음처럼 package 분리를 검토한다.

```text
packages/aiox-cli
packages/aiox-daemon
packages/aiox-core
packages/aiox-adapter-codex
packages/aiox-adapter-claude
```

하지만 MVP에서는 단일 package + 명확한 디렉터리 경계로 시작한다.
