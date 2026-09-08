# CLI·App Runtime 연동과 AIOX Adapter 정책 조사

- 조사 기준일: 2026-09-01
- 조사 대상:
  - Claude Code CLI/Agent SDK ↔ Claude Desktop/App
  - Codex CLI/App Server ↔ ChatGPT/Codex Desktop App
  - `syedazharmbnr1/claude-chatgpt-mcp`의 MCP + GUI automation 사례
- 작업 로그: [`cli-app-runtime-integration.worklog.md`](./cli-app-runtime-integration.worklog.md)
- 문서 목적: 벤더가 CLI와 App을 연결하는 실제 경계를 복원하고, AIOX가 `run`, `resume`,
  `attach`, `share`, `handoff`, MCP와 GUI automation을 어떤 정책으로 구분해야 하는지 판단한다.
- 근거 범위: 벤더 공식 문서, 로컬 CLI read-only probe, 조사 대상 저장소 source.

## 결론

두 제품군 모두 CLI와 App을 하나의 프로세스로 합치지 않는다. Runtime, 저장된 Conversation,
사용자 Surface, MCP tool plane을 분리하고, 제품별로 일부 상태를 공유하거나 handoff한다.

```text
Provider Runtime
├─ Agent 실행
├─ Conversation 상태
└─ Tool execution
      │
      ├─ Control protocol
      │  ├─ input
      │  ├─ output event
      │  ├─ interrupt
      │  └─ lifecycle
      │
      ├─ User surface
      │  ├─ CLI/TUI
      │  ├─ Desktop App
      │  ├─ Web
      │  └─ Mobile
      │
      └─ MCP
         └─ Agent가 외부 tool/context를 사용하는 별도 plane
```

AIOX의 돌파구는 기존 Desktop App의 private Runtime을 역으로 채택하는 것이 아니다.

```text
AIOX가 공식 Runtime control surface를 소유한다
→ 벤더 CLI/App을 추가 Surface로 공유한다
또는
→ 저장된 Conversation을 공식 handoff/resume한다
```

Codex에서는 App Server가 공식 control plane이다. Claude에서는 Agent SDK/headless CLI가
programmatic control plane이고, Remote Control은 first-party UI 공유 표면이다.

## 근거 수준

이 문서는 다음 표기를 사용한다.

- **확인 사실**: 공식 문서, 로컬 명령 출력 또는 저장소 source에서 직접 확인했다.
- **미확인**: 공개 계약이나 source에서 확인하지 못했다.
- **추론**: 확인 사실로부터 도출했지만 벤더가 보장한 계약은 아니다.
- **AIOX 제안**: 위 근거를 바탕으로 한 제품·구현 정책이다.

## 공통 Identity 모델

### 확인 사실과 추론

두 벤더 모두 live execution, 저장된 대화, 사용자 UI 연결을 별도 식별자로 다룬다. 정확한 필드명은
다르지만 AIOX에서는 다음 세 축을 합치면 안 된다.

```text
Runtime identity
└─ 현재 살아 있는 process/server/endpoint

Conversation identity
└─ 저장되고 resume 가능한 provider conversation

Surface connection identity
└─ terminal/app/browser/mobile의 현재 연결
```

```text
Runtime ID != Conversation ID != Surface Connection ID
```

Agent의 표시 이름 하나로 세 identity를 대신하면 fork, resume, handoff, reconnect와 multiple surface를
정확하게 표현할 수 없다.

## Claude Code ↔ Claude App

### 확인 사실: 같은 엔진 계열, 별도 Session History

Claude Desktop Code tab과 terminal CLI는 같은 underlying Claude Code engine 계열을 사용한다.
`CLAUDE.md`, settings, hooks, skills, plugins와 MCP configuration 일부를 공유하지만 Desktop과 CLI는
각자의 session history를 유지한다.

근거: https://code.claude.com/docs/en/desktop

```text
Claude Desktop Code(local)
└─ embedded Claude Code engine

Claude Code CLI
└─ terminal-owned Claude Code runtime

공유
├─ project instructions
├─ settings/hooks/skills
├─ 일부 plugin
└─ 일부 MCP configuration

분리
├─ live process ownership
├─ session history
└─ automation surface
```

Desktop의 `claude_desktop_config.json` MCP server는 Desktop Chat과 local Code tab에서 사용할 수 있다.
standalone CLI는 이 파일을 자동으로 같은 방식으로 읽는 것이 아니라 별도 import 경로를 사용한다.
설정 공유도 완전한 대칭이나 session 공유를 의미하지 않는다.

### 확인 사실: Agent SDK와 Headless CLI

Agent SDK와 `claude -p`는 AIOX 같은 프로그램이 Claude Runtime을 직접 소유할 수 있는 공식 표면이다.

- structured JSON/stream-json output
- session UUID
- resume/fork
- interrupt
- tool/permission lifecycle
- final result와 process exit

근거:

- https://code.claude.com/docs/en/agent-sdk/overview
- https://code.claude.com/docs/en/headless
- https://code.claude.com/docs/en/sessions

CLI/SDK UUID를 이용한 resume는 공식 범위지만 Desktop session을 SDK가 임의로 attach/resume/stream하는
공개 API는 확인되지 않았다.

### 확인 사실: `/desktop`은 Handoff

CLI의 `/desktop`은 현재 CLI session을 저장하고 Desktop에서 연 뒤 CLI를 종료한다.

```text
CLI session 저장
→ Desktop에서 열기
→ CLI 종료
```

이는 두 process가 같은 live session에 동시에 attach하는 계약이 아니라 ownership을 넘기는 handoff다.

근거: https://code.claude.com/docs/en/desktop

### 확인 사실: Remote Control은 Share

Remote Control은 로컬 Claude Code process와 filesystem/tool execution을 유지하면서 claude.ai/code와
Claude mobile/app surface를 같은 session에 연결한다. message와 permission 상태를 동기화하고,
network disconnect 뒤 reconnect와 queue를 제공한다.

```text
                    ┌─ Terminal
Local Claude Code ──┼─ claude.ai/code
                    └─ Claude App/Mobile
```

근거: https://code.claude.com/docs/en/remote-control

Remote Control은 first-party multi-surface share다. AIOX가 Remote Control client가 될 수 있는 공개
third-party protocol/API는 확인되지 않았다.

### 확인 사실: 다른 표면

- Agent View/background의 `attach`, `logs`, `stop`, `respawn`은 supervisor가 관리하는 background
  Claude Code session 표면이며 research preview다.
- Cross-session messaging은 독립 Claude session 사이의 plain-text peer message다. existing Desktop
  conversation의 raw attach나 structured output stream이 아니다.
- Standard MCP는 Claude가 외부 tool/resource를 요청하는 표면이다.
- Channels만 MCP server가 실행 중 Claude Code session에 event를 push하지만 research preview이며,
  notification write는 Claude receipt/completion ACK가 아니다.
- `claude://` deep link는 App launch, navigation, composer prefill이며 자동 send나 output stream이 아니다.

근거:

- https://code.claude.com/docs/en/agent-view
- https://code.claude.com/docs/en/cross-session-messaging
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/channels
- https://code.claude.com/docs/en/channels-reference
- https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link

### 미확인

- Desktop embedded engine의 정확한 process/IPC ownership과 공개 attach protocol
- Desktop Code session ID와 CLI/SDK UUID namespace의 동일성
- `agents --json`이 Desktop embedded session까지 안정적으로 enumerate한다는 계약
- AIOX가 Remote Control에 third-party client로 연결하는 API
- 임의 Desktop Chat/Code session의 programmatic input/output/lifecycle API

### AIOX 제안

```text
정식 Runtime Adapter
├─ claude-agent-sdk
└─ claude-code-headless

Preview Runtime Adapter
└─ claude-code-channel-preview

External Surface Capability
├─ remote-control share
├─ /desktop handoff
└─ claude:// open/prefill

Unsupported Full Adapter
└─ arbitrary claude-desktop live attach
```

## Codex CLI ↔ ChatGPT/Codex App

### 확인 사실: App Server가 공식 Control Plane

Codex App Server는 authentication, thread/turn lifecycle, streamed output, approval과 persistence를
제공하는 양방향 JSON-RPC control surface다.

```text
AIOX
  │ JSON-RPC
  ▼
Codex App Server
├─ thread/start | resume | read | list
├─ turn/start | steer | interrupt
├─ item/agentMessage/delta
├─ item/completed
├─ turn/completed
└─ approval requests
```

근거:

- https://developers.openai.com/codex/app-server/
- https://openai.com/index/unlocking-the-codex-harness/

App Server의 `thread.id`는 저장된 conversation identity다. `thread.sessionId`는 fork tree root identity로,
fork 뒤에는 thread ID와 같다고 가정할 수 없다.

### 확인 사실: 같은 App Server에 AIOX와 CLI TUI 연결

명시적으로 실행한 App Server endpoint에는 AIOX control client와 `codex --remote` TUI를 함께 연결할
수 있다.

```text
                    ┌─ AIOX control client
Codex App Server ───┤
                    └─ codex --remote TUI
```

이 구조는 AIOX가 Runtime을 소유하면서 사용자에게 공식 Codex TUI를 제공할 수 있는 직접적인
돌파구다.

```bash
codex app-server --listen unix:///known/aiox.sock
codex --remote unix:///known/aiox.sock
```

여러 connection/subscriber는 공식 API 구조에 존재하지만 같은 thread에 대한 복수 writer의
ordering/conflict 계약은 확인되지 않았다. AIOX는 thread당 writer 하나를 기본으로 둬야 한다.

### 확인 사실: Desktop은 Private Child를 소유

OpenAI 설명에 따르면 Desktop과 VS Code extension은 검증된 플랫폼별 Codex binary를 bundle/fetch하고,
App Server를 long-running child로 실행한 뒤 private stdio channel을 유지한다.

```text
ChatGPT/Codex Desktop
└─ Desktop-owned pinned App Server
   └─ private stdio
```

제3자 AIOX가 그 stdio channel에 합류하는 공개 절차는 없다.

근거: https://openai.com/index/unlocking-the-codex-harness/

### 확인 사실: Persisted History Handoff

OpenAI는 Desktop App이 Codex CLI와 IDE extension의 session history와 configuration을 가져와 이어서
사용하는 흐름을 제공한다.

```text
CLI persisted thread
→ Desktop에서 발견
→ Desktop에서 계속 사용
```

근거: https://openai.com/index/introducing-the-codex-app/

이는 persisted-state handoff다. Desktop과 CLI/AIOX가 동일 active turn을 동시에 수정하는 live attach
계약은 아니다.

### 로컬 확인: 최신 CLI의 Shared Daemon 표면

로컬 `codex-cli 0.151.0`에는 다음 명령이 확인됐다.

```text
codex agents
└─ shared local app-server daemon의 agent session 조회

codex app-server daemon
├─ bootstrap
├─ start
├─ restart
├─ enable-remote-control
├─ disable-remote-control
└─ stop

codex app-server proxy
└─ running control socket에 stdio proxy

codex queue --thread <THREAD> --message <TEXT>
└─ existing session에 message queue
```

이는 CLI-managed App Server daemon에 AIOX가 붙을 수 있는 가능성을 뒷받침한다. 그러나 Desktop이
항상 이 shared daemon을 사용한다는 공식 보장은 확인되지 않았다.

```text
App Server daemon attach  가능
Desktop live attach       미확인
```

### MCP 역할

Codex CLI, IDE와 ChatGPT Desktop은 MCP Client로 AIOX MCP Server의 tool/context를 사용할 수 있다.
MCP는 Codex가 AIOX에 `send`/`reply` 같은 tool call을 하는 egress plane이다. Thread lifecycle,
turn input, output subscription은 App Server가 소유한다.

근거: https://developers.openai.com/codex/mcp/

### 미확인

- Desktop이 항상 shared local App Server daemon을 사용하는지
- Desktop-owned child endpoint discovery와 public attach
- Desktop active thread와 AIOX client의 concurrent writer 규칙
- Remote Control pairing을 AIOX third-party client가 사용하는 공식 인증 계약

### AIOX 제안

```text
정식 Runtime Adapter 후보
└─ codex-app-server-stdio

Preview Runtime Adapter
├─ codex-app-server-ws
└─ external app-server attach

External Surface Capability
├─ codex --remote TUI share
└─ Desktop saved-thread handoff

Unsupported Full Adapter
└─ arbitrary codex-desktop live attach
```

## 외부 사례: `claude-chatgpt-mcp`

- 저장소: https://github.com/syedazharmbnr1/claude-chatgpt-mcp
- 목적: Claude Desktop이 MCP tool을 호출해 macOS ChatGPT Desktop을 조작한다.

### 확인 사실: 실제 구조

```text
Claude Desktop
│ MCP Client
▼
claude-chatgpt-mcp
│ MCP Server
│
├─ AppleScript
├─ System Events
├─ Accessibility API
├─ Clipboard
└─ Keyboard simulation
       │
       ▼
ChatGPT Desktop GUI
```

MCP는 Claude가 bridge를 호출하는 tool plane이다. ChatGPT App 제어는 공식 App API가 아니라 macOS
GUI automation이 수행한다.

Source:

- https://github.com/syedazharmbnr1/claude-chatgpt-mcp/blob/main/index.ts
- https://github.com/syedazharmbnr1/claude-chatgpt-mcp/blob/main/README.md

### 확인 사실: 동작

`chatgpt` MCP tool은 `ask`와 `get_conversations` operation을 제공한다.

`ask`:

```text
ChatGPT process 확인/activate
→ 선택적으로 conversation button 클릭
→ clipboard에 prompt 저장
→ Cmd+V, Enter
→ front window의 AXStaticText 반복 수집
→ 일정 시간 text가 변하지 않으면 완료로 추정
→ prompt 이후 문자열을 response로 추출
→ 원래 clipboard 복원
```

`get_conversations`는 conversation transcript가 아니라 sidebar UI에서 찾은 button/접근성 label
목록을 반환한다. README의 “conversation history” 표현보다 실제 기능이 좁다.

### 확인 사실과 위험

- macOS와 Accessibility 권한에 의존한다.
- foreground ChatGPT window, keyboard와 clipboard를 점유한다.
- UI hierarchy(`window 1`, 중첩 group, button, `AXStaticText`)에 의존한다.
- completion은 provider event가 아니라 text stability heuristic이다.
- structured output stream, exact conversation identity, interrupt, delivery ACK가 없다.
- 두 요청이 동시에 같은 App을 조작하면 focus, clipboard와 selected conversation이 충돌한다.
- stdio MCP stdout은 protocol 전용이어야 하지만 일반 `console.log()` 호출이 있어 transport 오염
  가능성이 있다.
- prompt와 clipboard를 AppleScript source에 삽입하는 escaping 범위는 별도 보안 검토가 필요하다.

### AIOX 제안

이 사례는 공식 App attach를 증명하지 않는다. `MCP + Desktop UI Automation`으로 실용적인 bridge를
만들 수 있음을 증명한다.

```text
chatgpt-desktop-ui
├─ lifecycle owner: external
├─ platform: darwin
├─ ingress: accessibility-keyboard
├─ output: accessibility-scrape
├─ completion: heuristic
├─ concurrency: exclusive GUI lock
└─ maturity: experimental
```

AIOX core의 stable Adapter가 아니라 명시적 opt-in third-party experimental Adapter로만 허용한다.
GUI automation을 사용할 때에는 화면 focus 이동, clipboard 변경, Accessibility 권한과 정확하지 않은
delivery/completion 상태를 CLI에서 숨기지 않는다.

## AIOX Adapter 정책

### Adapter 전체가 아닌 Capability × Transport로 판정

```ts
type Maturity = "stable" | "preview" | "unsupported";
type AckLevel =
    | "transportAccepted"
    | "providerAccepted"
    | "turnStarted"
    | "targetAcknowledged"
    | "completed";

interface AdapterCapabilities {
    lifecycle: {
        run: Maturity;
        resume: Maturity;
        attach: Maturity;
        disconnect: Maturity;
        stopOwned: Maturity;
    };
    messaging: {
        ingress: Maturity;
        ackLevel: AckLevel;
        completionObservable: boolean;
    };
    output: {
        stream: Maturity;
        completion: Maturity;
    };
    externalSurface: {
        open: Maturity;
        share: Maturity;
        handoff: Maturity;
    };
}
```

현재 AIOX의 Codex App Server RPC와 Claude MCP bridge가 실제로 동작하더라도, Codex의 현재 WebSocket
transport는 experimental이고 Claude Channel은 research preview다. Provider 이름 하나에 `stable`을
붙이면 이 차이를 표현할 수 없다.

### CLI 동사 의미

```text
run
└─ AIOX가 새 Runtime을 생성하고 execution을 소유한다.

resume
└─ 저장된 Conversation ID를 공식 surface로 다시 로드한다.
└─ 기존 live process attach라는 뜻은 아니다.

attach
└─ AIOX가 만들지 않은 live Runtime의 공개 control endpoint에 연결한다.
└─ private process/IPC 추측이나 새 process 생성은 attach가 아니다.

share
└─ Runtime과 Conversation owner를 유지하면서 first-party UI surface를 추가한다.

handoff
└─ Conversation 또는 execution owner/surface를 다른 위치로 넘긴다.

open
└─ App/URL/UI를 연다. Conversation 동일성이나 control 권한을 보장하지 않는다.

disconnect
└─ surface/subscription만 끊고 Runtime은 유지한다.

stop
└─ AIOX가 소유한 Runtime만 종료한다.
```

### Single-writer

```text
하나의 Conversation
└─ active Controller/Writer 하나
```

추가 TUI/App/Web surface는 기본 observer 또는 벤더가 보장하는 first-party share로 본다. 동시 writer는
provider가 ordering/conflict를 공식적으로 보장할 때만 허용한다.

### Message 상태

`delivered` 하나로 transport acceptance와 provider completion을 합치지 않는다.

```text
queued
→ transport_accepted
→ provider_accepted
→ turn_started
→ target_acknowledged
→ completed
```

- Codex App Server는 `turn/completed`까지 관찰할 수 있다.
- Claude Agent SDK/headless는 structured final result를 관찰할 수 있다.
- Claude Channel은 자동으로 transport acceptance까지만 관찰하며 application-level ACK tool이 필요하다.
- GUI automation은 대부분 heuristic/unconfirmed 상태다.

### Stable / Preview / Unsupported

Stable은 다음 조건을 모두 만족할 때만 사용한다.

- 벤더의 공개 지원 계약
- preview/experimental/development 표기 없음
- Runtime/Conversation identity와 lifecycle이 명확
- auth, disconnect/recovery와 error semantics가 문서화됨
- acceptance와 completion을 구분해 검증 가능
- 지원 vendor version과 contract test가 존재

Preview 조건:

- beta/research preview/experimental
- hidden/development flag 필요
- schema/transport 변경 가능
- lifecycle/ACK 일부만 관찰 가능

Unsupported 조건:

- private/undocumented protocol
- 안전한 Runtime/Conversation identity 확인 불가
- GUI automation으로 상태와 성공을 추론
- transport write만으로 target completion을 주장
- first-party Remote protocol 역공학 필요

GUI automation은 core에서는 unsupported, 별도 third-party experimental tier에서만 opt-in 가능하게 한다.

## 현재 AIOX 구현에 대한 시사점

### 확인 사실

현재 Codex 경로는 새 App Server와 TUI를 실행하며 AIOX와 TUI가 같은 Runtime을 사용한다.

- `src/adapters/codex/launcher.ts`
- `src/adapters/codex/runtime.ts`
- `src/adapters/codex/proxy.ts`
- `src/adapters/codex/injector.ts`

현재 Claude 경로는 새 interactive Claude CLI를 실행하고 preview Channel ingress와 MCP egress를
결합한다.

- `src/adapters/claude/launcher.ts`
- `src/adapters/claude/channel-server.ts`
- `src/adapters/claude/injector.ts`

현재 공통 `AgentAdapter`는 사실상 `kind + inject()` 수준이며 다음을 표현하지 못한다.

- launch와 attach
- Runtime owner
- Conversation identity
- Surface connection
- output/completion observability
- transport acceptance와 completion
- share/handoff/open
- capability별 maturity

관련 code:

- `src/adapters/contract.ts`
- `src/adapters/router.ts`
- `src/daemon/state.ts`

### 제안 순서

```text
1. Runtime / Conversation / Surface identity 분리
2. accepted / acknowledged / completed message state 분리
3. Adapter capability × transport maturity 모델 도입
4. Codex App Server stdio 또는 Unix socket 검증
5. Codex output/turn lifecycle 소비
6. Claude Agent SDK/headless Adapter를 stable 후보로 추가
7. Claude Channel Adapter를 preview로 격리
8. App/Desktop을 Runtime 종류가 아니라 share/handoff/open surface로 모델링
9. GUI automation은 third-party experimental tier로만 허용
```

## 최종 판단

- **확인 사실**: Codex App Server와 Claude Agent SDK/headless는 AIOX가 Runtime을 소유할 수 있는 공식
  control surface다.
- **확인 사실**: Codex CLI TUI는 명시된 App Server를 공유할 수 있고, Claude Remote Control은
  first-party App/Web/Mobile surface와 같은 local session을 공유한다.
- **확인 사실**: Claude `/desktop`과 Codex Desktop continuation은 persisted conversation handoff다.
- **미확인**: AIOX가 임의의 실행 중 Claude/Codex Desktop private Runtime을 공식 API로 채택하는 방법.
- **확인 사실**: `claude-chatgpt-mcp`는 그 빈틈을 MCP 자체가 아니라 macOS GUI automation으로
  우회한다.
- **AIOX 제안**: AIOX는 공식 Runtime을 소유하고 벤더 UI를 share/handoff하는 경로를 우선하며,
  private attach와 GUI automation을 core stable 경로로 승격하지 않는다.

## Sources

### Anthropic

- https://code.claude.com/docs/en/desktop
- https://code.claude.com/docs/en/agent-sdk/overview
- https://code.claude.com/docs/en/headless
- https://code.claude.com/docs/en/sessions
- https://code.claude.com/docs/en/remote-control
- https://code.claude.com/docs/en/agent-view
- https://code.claude.com/docs/en/cross-session-messaging
- https://code.claude.com/docs/en/mcp
- https://code.claude.com/docs/en/channels
- https://code.claude.com/docs/en/channels-reference
- https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link

### OpenAI

- https://developers.openai.com/codex/app-server/
- https://developers.openai.com/codex/mcp/
- https://openai.com/index/unlocking-the-codex-harness/
- https://openai.com/index/introducing-the-codex-app/

### 조사 저장소

- https://github.com/syedazharmbnr1/claude-chatgpt-mcp
- https://github.com/syedazharmbnr1/claude-chatgpt-mcp/blob/main/index.ts
