# AIOX 제품·아키텍처·결정 기억용 프롬프트

초기 기준일: 2026-09-08. Network·MCP·상태·DB 관련 후속 결정은 2026-09-15 기준으로 반영한다. 이 문서는 AIOX에 관한 사용자와의 대화, 제품 요구, 설계 결정, 실험 결과와 남은 논의를 새 Codex 세션에 전달하는 독립적인 문맥이다. 구현 완료 보고서가 아니다.

## 1. 이 세션의 역할

너는 사용자와 AIOX의 방향을 함께 논의하고, 이미 결정한 내용과 근거를 기억하는 agent다. 이 문서를 받았다는 이유로 프로젝트 구현을 시작하거나 goal을 생성하거나 실험을 실행하지 않는다. 사용자가 요청하는 질문·설계·검토에 이 문맥을 적용한다.

- 결정한 내용을 잊고 같은 선택을 다시 질문하지 않는다. 충돌이 있으면 근거를 설명하고 좁은 대안을 제시한다.
- 사용자 결정, 사용자 전달 실측, 소스·바이너리 조사, 설계 제안, 미확인을 구분한다. 실험 통과와 현재 제품 코드 통합 완료는 다르다.
- 아래 내용은 외부 문서를 읽어야만 이해할 수 있는 안내 목록이 아니라 대화 자체의 문맥이다.
- 사용자가 별도로 요청하지 않으면 코드·문서·로그를 수정하거나 새 실험·subagent 작업을 시작하지 않는다.
- 기능과 사용자 흐름을 먼저 설명한다. 필요하면 책임 tree와 짧은 ASCII 흐름을 보여 주고, 그 다음 구현 선택을 논의한다. field 목록부터 승인받지 않는다.
- 기존 성공 실험을 무시하고 dedup, burst, rate-limit 상한 등 주변 사례를 반복 검증하지 않는다. 새 확인이 필요하면 무엇이 미확인이고 왜 현재 판단에 필요한지 먼저 한정한다.
- 새 아이디어는 제안으로 표시한다. 이 문서의 빈 부분을 사용자가 이미 승인한 계약으로 채우지 않는다.

## 2. 제품의 목적과 범위

AIOX는 Claude Code와 Codex의 실제 TUI를 실행·연결·관측하고, 하나의 작업 공간에서 협업시키는 로컬 제품이다. 사용자가 이미 사용하는 vendor TUI를 유지하면서 AIOX가 실행 묶음, 통신, route, 터미널 배치, 설정, 상태와 알림을 제공한다.

초기에는 headless도 검토했고 다른 repo에서 headless 연동 자체는 이미 검증됐다. 그러나 quota, 모델 선택, slash command, 승인·질문, 설정 영속화 등 vendor UX를 다시 구현하는 비용 때문에 이번 제품은 실제 TUI를 사용하기로 했다. headless 가능성을 다시 조사할 필요는 없다.

확정 범위:

- Claude Code TUI + native peer inbox + hooks.
- Codex TUI + App Server + Binding Relay.
- 공통 HTTP MCP를 통한 send/agents_list.
- CLI, standalone Agent, 선언형 Host, 단일 Network, route, Git Worktree.
- React 운영 Web, 실제 터미널, 상태·알림, 전역 설정, SQLite, 브라우저 복귀.
- Windows 네이티브·Linux·macOS 지원. WSL 실행은 별도 환경 경계로 구분한다.
- 공개 다국어 AIOX 사이트는 실제 제품 이후 마지막 단계다.

제외 범위:

- Headless agent 제품, Claude Agent SDK, `-p` 실행, vendor UX 전체 복제.
- 현재 구현 단계에서 ACP·NDJSON·다른 vendor 통합. 사용자가 별도로 요청한 확장 연구는 이 구현 범위와 구분한다. ACP 자체를 headless로 단정하지 않으며, 실제 TUI와 같은 backend·대화를 공유하는 구조도 연구할 수 있다.
- Claude custom Channel, development-channel 실행, Channel fallback.
- 같은 메시지의 수동·자동 재전송/재주입.
- 실행 중 Network join/leave와 다중 Network 소속.
- 과거 CLI alias와 폐기된 구현을 위한 호환 계층.

기존 구현이 덜 끝났다는 이유로 새 요구를 그 구조에 맞추지 않는다. 새로 만드는 프로젝트라는 전제다. 재사용은 실제로 유효한 경우에만 한다.

## 3. 전체 구성과 책임

```text
사용자
├─ 일반 터미널의 AIOX CLI — 외부 vendor·필수 부속 실행 소유
└─ React 운영 Web
       │ HTTP / WS / terminal attachment
       ▼
AIOX daemon — 로컬 Node.js 서버
├─ Gateway — 명령·snapshot·event·알림 중계
├─ Controllers
│  ├─ AgentController — daemon 소유 실행 / 외부 협업 등록
│  └─ HostController
├─ Runtime Credential Registry
├─ 공통 HTTP MCP — send / agents_list
├─ Network / Message Service
├─ Provider bindings
│  ├─ Claude TUI — inbox 입력 / hooks 관측
│  └─ Codex TUI — App Server 입력·관측 / Binding Relay
├─ PTY / Terminal Service
├─ Worktree 관리
├─ 전역 설정 검증·저장·변경 배포
└─ SQLite persistence

별도 공개 사이트 — 제품 완성 후
```

- 공통 실행 계층은 명령·인증된 실행 위치로 소유권·표시 위치·종료 정책을 결정하고, 실제 실행 소유자가 프로세스 수명을 관리한다.
- Adapter owns integration mechanics: vendor 실행 인자, 입력, 관측, 종료 수단을 구현한다.
- Network owns connectivity: 소속, discovery, directed route와 전달 경계를 정의한다.
- Daemon enforces materialized runtime state: 현재 Runtime·Network·route·credential의 권위를 가진다.
- Vendor TUI owns interaction UX: 모델, slash command, 질문·승인은 vendor TUI에서 처리한다.
- Web은 Host 운영·터미널 배치·설정·알림을 담당한다.

Daemon과 HTTP server/Gateway/MCP는 같은 Node 프로세스에 구성할 수 있다. SQLite는 별도 app/server가 아니다. daemon 강제 종료 뒤 Controller/PTY를 생존시키기 위한 별도 runtime-host 프로세스는 요구하지 않는다.

수명은 구분한다:

```text
AgentRuntime: AIOX가 관리하는 실행 단위
  ├─ vendor 프로세스와 부속 실행 자원
  ├─ 현재 vendor conversation binding
  └─ daemon 소유 실행만 AIOX Terminal / PTY 연결

Vendor conversation: /clear, /resume 등에 따라 변경 가능
Terminal / PTY: 터미널 실행 자원
Web attachment: 브라우저가 해당 터미널을 보는 연결
```

AgentRuntime은 PID 하나와 동일하지 않다. Codex Runtime에는 TUI·App Server·Relay가 함께 속할 수 있다. 브라우저 연결이 끊어져도 Runtime과 PTY는 유지한다.

공통 실행 계층은 명령·인증된 실행 위치의 판정, 실행 소유권, daemon 종료 대상과 외부 제어 연결을 소유한다. 기존 RuntimeRegistry의 실행 소유권과 협업 등록 유효성을 구분하고, terminalOwnership은 daemon 터미널의 소유·차용 관계만 나타낸다. 등록 해제는 외부 프로세스 종료를 뜻하지 않는다. adapter는 vendor 실행 인자·주입·버전·통신·준비 판단·이벤트 해석과 부속 프로세스의 vendor별 수단을 담당한다. 부속 프로세스도 공통 실행 소유권을 따르며, Claude inbox/hooks나 단일 프로세스 형태를 모든 vendor의 필수 계약으로 삼지 않는다.

Stage 2-2에서 `packages/vendor`의 공유 실행·자원 수명과 `packages/adapters/claude`의 Claude 준비·inbox·hooks·관측을 분리했다. daemon의 `AgentController`는 공통 등록·제어 수명을 관리하며 CLI와 daemon은 공유 package의 공개 entry를 사용한다. CLI가 daemon 앱의 실행 helper를 import하는 의존은 제거했다. 여러 vendor 지원은 확정 요구지만 실제 vendor 검증은 Claude이며, Codex의 TUI·Relay·App Server는 Stage 4에서 같은 소유권 계약에 연결한다. Host 실행 구현은 Stage 5에 남는다.

## 4. 코드 구조의 방향

```text
aiox/
├─ apps/
│  ├─ cli/src/commands/{daemon,agent,network,host,adapter}
│  ├─ daemon/src/{bootstrap,http,gateway,mcp}
│  ├─ web/src/{app,features}
│  │                 └─ hosts, agents, networks, terminal, notifications, settings
│  └─ site/
└─ packages/
   ├─ domain/src/
   │  ├─ agent/{agent,runtime,runtime-status}.ts
   │  ├─ host/{host,host-runtime}.ts
   │  ├─ network/{network,membership,route}.ts
   │  ├─ messaging/{message,delivery}.ts
   │  └─ terminal/terminal-id.ts
   ├─ application/src/{agent,host,network,messaging,ports}
   ├─ vendor/ — 공유 adapter 계약·실행 자원 수명
   ├─ adapters/{claude,codex}/
   ├─ terminal/
   ├─ persistence/src/{sqlite,repositories}
   ├─ protocol/
   ├─ config/
   └─ ui/ — 실제 공유 UI가 필요할 때
```

domain은 제품 규칙을 소유하며 React·HTTP·SQLite·PTY·vendor 호출에 의존하지 않는다. application은 실행·등록·전달·정리 유스케이스를 조율한다. daemon이 application과 adapter·terminal·persistence를 조립한다. Web과 CLI는 daemon의 코드를 직접 가져다 실행하는 것이 아니라 공개 통신 계약으로 연결한다.

파일 목록은 모든 파일을 미리 생성하라는 지시가 아니다. AgentRuntime 모델을 agent/runtime과 별도 runtime 디렉터리에 중복 소유하지 않는다. vendor 계약과 application port도 같은 계약을 중복 정의하지 않는다. Node PTY와 브라우저 xterm은 실행 환경을 분리한다. 공통 wire는 protocol에, Web 전용 TerminalPane·HostSidebar 등은 Web features에 둔다.

## 5. 실행별 MCP와 인증

두 vendor가 같은 공통 HTTP MCP handler를 사용한다. vendor별 stdio MCP child와 Agent별 `/send` HTTP server는 없앤다.

```text
Runtime 시작 → 별도 MCP token 발급 → child env 전달
Authorization: Bearer token → 인증된 RuntimePrincipal
/mcp/<networkId> → Network 문맥
현재 membership + directed route 검사 → 전달
Runtime 종료·시작 실패 → token revoke + binding 정리
새 실행 → 새 token
```

같은 Network의 Agent는 같은 URL을 사용하지만 token은 각각 다르다. URL 자체는 권한이 아니다. sourceAgentId·hostId는 검증된 token에서 도출한다. 모델이 제출한 source 이름을 신원으로 사용하지 않는다. 실제 token은 argv·URL·로그·Web snapshot·오류에 남기지 않는다. revoke 이후 기존 MCP session의 후속 호출도 거절한다.

### Claude 실행 주입

사전 `aiox claude setup`이나 영구 MCP 등록은 필요 없다. CLI에 JSON 문자열 하나를 전달한다.

```ts
const mcpConfig = JSON.stringify({
  mcpServers: {
    aiox: {
      type: "http",
      url: networkMcpUrl,
      headers: { Authorization: "Bearer ${AIOX_MCP_TOKEN}" },
    },
  },
});

spawn("claude", ["--mcp-config", mcpConfig], {
  env: { ...process.env, AIOX_MCP_TOKEN: runtimeToken },
});
```

`Bearer ${AIOX_MCP_TOKEN}`는 JavaScript 보간이 아닌 리터럴 env 참조다. 실제 token을 JSON/argv에 삽입하지 않는다. shell 문자열 연결 대신 spawn args를 사용한다.

- `--mcp-config`: AIOX HTTP MCP 추가.
- `--settings`: AIOX 실행에 hooks 추가.
- `--append-system-prompt`: 공통 협업 지침 + Agent instruction 주입.
- `--strict-mcp-config`는 사용하지 않는다. 기존 사용자 MCP를 함께 로드한다.
- 사용자 hooks·설정·지침을 통째로 교체하지 않는다.
- 위 코드는 MCP 부분 예시다. inbox 경로·hooks·instruction을 함께 구성하는 신규 launcher 통합 전체가 완료됐다는 뜻은 아니다.

구현 시 참고: Claude의 `--append-system-prompt`는 실행 시 기본 system prompt에 AIOX 지침을 추가한다. 공식 [문서](https://code.claude.com/docs/en/output-styles#comparisons-to-related-features)는 적용 범위를 single invocation으로 설명한다. 같은 프로세스의 대화 초기화·재개에서도 지침을 적용하는 방향으로 구성하고, 첫 user message로 반복 주입하지 않는다. 이를 별도 사용자 요구·선행 실험 과제로 만들지 않으며 각 전환 동작을 모두 실측했다는 주장과는 구분한다.

2026-09-09 사용자 확정 — Claude 필수 설정 충돌 정책:

- 사용자 인자·설정이 AIOX 필수 연결·관측을 깨뜨리면 터미널에 원인을 표시하고 Claude 실행 전에 실패로 종료한다. 원래 shell은 유지한다.
- 대상은 AIOX inbox 주소 덮어쓰기, 필수 hooks 비활성화, 동일한 `aiox` MCP의 충돌하는 재정의다.
- 사용자 설정을 몰래 덮어쓰거나 비활성화하지 않는다. 함께 적용할 수 있는 기존 사용자 MCP·hooks·지침과 일반 vendor 옵션은 보존하며, 설정이 존재한다는 이유만으로 거절하지 않는다.
- CLI 충돌 오류 메시지는 §11의 공통 메시지 언어 정책에 따라 영어로 작성한다. 충돌한 옵션·설정과 사용자가 취할 조치를 명확히 알리고 실제 token은 노출하지 않는다.

예: `aiox agent run claude --network dev -- --settings '{"disableAllHooks":true}'`가 AIOX 필수 hooks를 비활성화하면 Claude를 띄우지 않는다. 영어 메시지 예시는 다음과 같으며 정확한 문구 자체를 고정하지 않는다.

```text
Cannot start Claude: disableAllHooks=true disables hooks required by AIOX.
Remove this setting and try again.
```

이는 확정 정책이며 충돌 검사·launcher 구현이나 실제 실행 검증이 완료됐다는 뜻은 아니다.

### Codex 실행 주입

```sh
codex app-server \
  -c 'developer_instructions="AIOX instructions..."' \
  -c 'mcp_servers.aiox.url="http://127.0.0.1:4500/mcp/network-123"' \
  -c 'mcp_servers.aiox.bearer_token_env_var="AIOX_MCP_TOKEN"' \
  -c 'mcp_servers.aiox.required=true'
```

AIOX는 App Server child env에 token을 전달한다. `bearer_token_env_var`에는 변수 이름만 둔다. config 키 `developer_instructions`와 RPC 필드 `developerInstructions`는 다르다. TOML 문자열 escaping을 적용한다. `required=true`의 MCP 초기화 실패 처리와 AIOX Runtime cleanup은 별개다. listen·TUI·Relay 연결은 binding이 구성한다.

구현 시 참고: `developer_instructions`는 첫 user message가 아니라 App Server 실행 config로 주입한다. 같은 실행에서 `/new`·resume·fork 등으로 활성 thread가 바뀌어도 AIOX 지침을 적용하는 방향으로 구성하며, 실행 설정과 thread별 RPC override의 관계는 Codex binding 구현에서 참고한다. 이 항목을 별도 사용자 요구·선행 실험 과제로 만들지 않는다. 공식 [설정 참조](https://learn.chatgpt.com/docs/config-file/config-reference)는 해당 키를 세션에 추가하는 developer 지침으로 설명한다. 이 문서가 각 대화 전환 명령의 유지 동작을 모두 독립 실측했다는 뜻은 아니다.

입력 대상 추적은 아래 §7의 Binding Relay 근거를 사용한다. 지침의 실행 범위와 activeThreadId 갱신, §8의 개별 turnId 종료 연결은 서로 다른 책임이다. 과거 구현·테스트는 커밋 `8db476bad722717bf82cc598904f3f33af8a90b3`의 `src/adapters/codex/proxy.ts`와 `tests/unit/adapters/codex-proxy.test.ts`에 보존돼 있다. 이는 활성 thread 추적의 근거이며 instruction 지속성 테스트는 아니다. 근거 안내는 [vendor bindings](../../docs/architecture/aiox-vendor-bindings.md#codex-실행과-active-thread)에 있으며 이미 확인한 활성 thread 추적을 새 조사 과제로 되돌리지 않는다.

공통 협업 policy, tool description과 schema는 하나의 원본을 가진다. vendor별로는 입력 framing만 다르게 구성한다. AIOX CLI/YAML 옵션은 단수 `instruction`이고 vendor의 고유 필드 이름은 바꾸지 않는다.

## 6. Claude native peer inbox

기존 Channel 방식은 development-channel 경고와 Agent별 bridge·임시 포트·등록 관리가 필요했다. native inbox로 idle TUI를 깨우는 경로가 확인되어 Channel을 제거하는 방향이다. development-channel flag는 permission skip flag와 다른 것이었다.

사용자 전달 실측:

- 순수 외부 Node 프로세스에서 macOS inbox에 무인증 메시지를 전송해 idle 5/5에서 새 턴 시작.
- busy 상태 도구 호출 사이에도 전달 성공.
- HTTP MCP reply가 서버 측 기록에서 messageId와 연결됨.
- burst 3건이 도달했지만 처리 순서는 송신 순서와 달랐음. 순서 보장으로 확대하지 않음.
- 초기 MCP roundtrip 실패 일부는 테스트 서버 세션 관리·프로세스 종료 문제였다. 해당 실패를 inbox 결함으로 취급하지 않음.

### 표시 형식

```json
{"type":"user","message":{"role":"user","content":"<cross-session-message from-name=\"Codex\">\n[AIOX] 표시 검증 메시지입니다.\n두 번째 줄도 전달되었습니다.\n도구를 사용하지 말고 DISPLAY_OK라고만 답해주세요.\n</cross-session-message>"}}
```

Claude 2.1.263의 사용자 전달 화면 실측:

```text
일반 화면:
Message from @Codex: [AIOX] 표시 검증 메시지입니다. (ctrl+o to expand)

Ctrl+O:
@ Codex
본문 전체

다시 Ctrl+O:
한 줄 preview로 복귀
```

DISPLAY_OK 응답까지 확인됐다. 단순 top-level `from: "Codex"`는 이 효과가 없었다. 초기 raw 메시지의 “Another Claude session…” 전체 박스만 보고 native preview가 불가능하다고 판단하면 안 된다.

`from-name`은 표시 이름이지 인증 신원이 아니다. 접힌 표시는 vendor의 권한 경계를 없애는 기능이 아니다. raw body·renderer 태그는 범용 공식 외부 API로 확정된 계약이 아니며 버전 의존 부분이다.

### Socket 주소 지정과 수명

설치 바이너리 조사에서 hidden 실행 옵션이 확인됐다:

```sh
claude --messaging-socket-path /tmp/aiox-private/runtime-123.sock
```

AIOX가 Runtime마다 고유 주소를 배정하는 방향이다. 주소를 알기 위해 SessionStart가 반드시 필요한 것은 아니다. `/status`의 Peer address는 현재 Claude 자신의 주소이며 `uds:`는 표시용 접두어다.

`CLAUDE_CODE_MESSAGING_SOCKET`과 `CLAUDE_CODE_MESSAGING_TOKEN`은 Claude가 bind 후 자기 hook/Bash에 export하는 값으로 조사됐다. 부모가 SOCKET env를 넣으면 그 경로로 listen할 것이라는 방식을 채택하지 않는다.

Unix 경로 검사는 설치 바이너리 조사상 절대 경로, 유효 basename, `..` 배제, 정규화 UTF-8 103 byte 이하, 부모 소유권·symlink·권한, live socket 충돌을 포함했다. private 부모 디렉터리 0700은 구성 제안이다. `/tmp/cc-socks/PID.sock`를 모든 OS의 고정 주소로 만들지 않는다. hidden 옵션의 신규 launcher 통합은 별도 확인 범위다.

사용자는 같은 Claude 프로세스의 `/status`, `/clear`, `/resume`에서 같은 socket 주소를 관찰했다. 바이너리 조사도 listener/address/token이 프로세스의 TUI host 수명에 묶인 것으로 보고했다. 대화 session ID는 바뀔 수 있다. 새 `claude --resume` 프로세스는 새 Runtime/inbox다. optional session_id를 과거 값으로 고정해 보내지 않는다.

### Windows

native Windows는 Unix 파일 socket 대신 named pipe다. PowerShell 실행 형태의 예시는 다음과 같다. native Windows 실측 완료 명령이 아니다.

```powershell
claude --messaging-socket-path '\\.\pipe\aiox-runtime-123'
```

`\\.\pipe\이름`은 `C:\...\file.sock` 같은 파일 경로가 아니다. native Windows는 인증 첫 줄이 필수, Unix에서는 선택 가능하다는 문서·조사 근거가 있다.

```json
{"type":"auth","token":"<Claude inbox token>"}
{"type":"user","message":{"role":"user","content":"..."}}
```

Claude inbox token과 AIOX MCP token은 별개다. 자기 hook을 통해 inbox token을 daemon에 전달하는 것은 Windows 구현 후보다. macOS 바이너리에서 Windows 문자열을 찾은 결과와 native Windows 통합 실측을 구분한다. accept/hold/refuse를 몰래 accept로 덮어쓰지 않는다.

보고된 Peer 최소 지원 버전은 macOS/Linux/WSL2 2.1.224+, native Windows 2.1.234+다. 이 버전 검사는 raw wire의 미래 호환 보장이 아니다. 미지원 버전·플랫폼은 실행 실패로 알리며 Channel fallback과 복잡한 allowlist는 두지 않는다.

### 준비와 실제 수신

```text
프로세스 생성 → inbox 연결 준비 확인 → Runtime ready
메시지 write → UserPromptSubmit 관측 → 특정 입력 수신 연결
```

파일 존재만으로 ready, write 성공만으로 모델 수신이라고 표시하지 않는다. 준비 확인 때 매번 모델 ACK probe를 실행하지 않는다. socket 연결·write 실패는 명시적으로 보고한다.

## 7. Codex 입력: toolOutput + additionalContext 채택

2026-09-08 사용자 정정으로 확정한 방향:

- `toolOutput` 형식으로 대화 본문을 주입한다.
- 나머지 전달 메타데이터는 `additionalContext`로 보낸다.
- 이 조합의 실험은 통과했다는 사용자 확인이 있다.
- 우선 이 방식으로 구현하고 실제 AIOX E2E를 수행한다.
- E2E에서 요구를 충족하지 못하면 실패 원인을 확인한 뒤 다음 방법을 검토한다. 미리 여러 fallback 경로를 구현하지 않는다.

기존 기준선에 남아 있던 “세 후보 중 최종 방식 미결”은 이 결정으로 대체된다. IDE delimiter+Cyan, toolOutput, toolOutput+additionalContext를 다시 같은 출발선에서 선택하도록 질문하지 않는다.

목적은 A2A 입력을 사용자가 직접 작성한 프롬프트처럼 전체 JSON으로 보여 주지 않고, 협업 메시지로 전달·표시하는 것이다. daemon 내부의 거대한 envelope를 그대로 노출하지 않는다.

과거 확인한 내용:

- 전체 envelope를 turn/start text로 보내면 사용자 입력처럼 JSON이 노출됐다.
- IDE 문자열 규약의 Cyan 표시도 사용자 화면 확인에서 성공했다.
- toolOutput의 고정 “Sent by Codex from task …”와 실제 Claude 발신자의 관계, 내부 renderer 의존, additionalContext 길이·절단에 대한 논의가 있었다.

현재 선택 성공과 별개로, 완전한 wire payload의 정확한 필드 배치와 1000-token 제한의 적용 대상·절단 위치는 이 문서에서 새로 만들어내지 않는다. `additionalContext`는 이번 AIOX 설계에서 메타데이터 전달에 사용한다는 뜻이며 모든 vendor 프로토콜에서 자유로운 metadata object라는 뜻은 아니다. 과거 실험 성공을 부정하지 않고 신규 E2E에서 실제 표시·입력 전달·회신을 연결한다.

### Active thread

```text
Codex TUI --remote ↔ Binding Relay ↔ Runtime별 App Server
                         │
               같은 연결의 thread/start·resume·fork 성공 응답
                         ▼
                    activeThreadId
Daemon → binding → turn/start(activeThreadId)
```

Binding Relay의 active thread 추적은 과거 구현·실측 근거가 있다. 요청 ID와 응답은 같은 연결에서 대응시키며 실패한 start/resume/fork로 activeThreadId를 바꾸지 않는다. 임의 loaded-thread 선택이나 과거 fallback을 복원하지 않는다. 이 근거는 신규 HTTP MCP 통합 전체 완료와는 다르다.

## 8. Hooks·App Server 관측과 알림

Claude 단일 idle inbox 입력과 Stop의 직접 연결은 사용자 전달 실측으로 수용한다:

```text
AIOX 메시지 M42가 포함된 inbox 원문
→ UserPromptSubmit {prompt: 원문, session_id:S, prompt_id:P7}
→ daemon이 M42 ↔ Runtime/S/P7 연결
→ Stop {session_id:S, prompt_id:P7}
→ 해당 입력의 응답 종료 관측
```

실측 버전은 2.1.263. UserPromptSubmit와 Stop의 prompt_id가 같았고 원문에 연결 마커가 있었다. 실제 hook payload에는 optional source가 없었다. source=system도 inbox만을 의미하지 않는다. Stop에는 원문/origin이 없으므로 Stop 단독으로 발신자나 입력 종류를 정하지 않는다. hook 보고 자체는 Runtime credential/binding으로 인증한다.

단일 idle 연결을 모든 busy/multi-input·StopFailure·Windows 입력에 대한 실측으로 확대하지 않는다. 하나의 Stop이 여러 메시지 각각의 작업 성공을 보장하지 않는다.

| 관측 | 의미 |
| --- | --- |
| process exit | Runtime 실행 종료 |
| binding ready | 입력 연결 준비 |
| socket write | socket 단계 전송 |
| Codex 정상 입력 응답 | Runtime 입력 수락 |
| Claude UserPromptSubmit 연결 | 해당 입력 관측 |
| 연결된 Stop / turn completed | 응답 종료 |
| Agent의 send 응답 | 대화상 회신이며 요청 처리 종료와 별개 |
| 실제 결과 검토 | 작업 성공 판단 |

`입력 → send 응답 → 추가 작업 → Stop`도 가능하다. 대화상 회신과 응답 종료를 필수 순차 상태로 묶지 않는다. Stop은 작업 정확성·send 성공·파일 변경 성공·프로세스 종료와 다르다.

관측 연결 후보:

| 목적 | Codex App Server | Claude hooks |
| --- | --- | --- |
| 승인 | commandExecution/fileChange/permissions requestApproval | PermissionRequest, Notification.permission_prompt |
| 질문 | item/tool/requestUserInput, mcpServer/elicitation/request | Elicitation, 관련 Notification |
| 해소 | serverRequest/resolved | ElicitationResult 등 |
| 실패 | error, 실패 turn/completed, 사용량 제한 오류 | StopFailure |
| 사용량·재개 | account/rateLimits/read·updated | quota_auto_resume_fired/stale/disabled |

표는 이전 조사 기반이며 전체 live wiring 완료표가 아니다. 별도 observer WS에 TUI의 모든 요청이 broadcast된다고 가정하지 않는다. 실제 Relay/연결에서 관측하고 응답 owner는 TUI로 유지한다. daemon이 같은 승인 요청에 이중 응답하지 않는다. resolved는 취소도 포함할 수 있어 승인 성공과 같지 않다.

Claude StopFailure에는 rate_limit, overloaded, authentication_failed, oauth_org_not_allowed, account_on_hold, billing_error, invalid_request, model_not_found, server_error, max_output_tokens, unknown 등이 조사됐다. rate_limit을 구독 session/weekly limit과 일대일로 단정하지 않는다. PermissionRequest는 즉시 승인 관측 후보이고 Notification.permission_prompt에는 지연 조건이 보고됐다.

일반 PreToolUse/PostToolUseFailure를 모두 수집해 AIOX delivery 오류로 만들지 않는다. agent가 자기 작업 중 겪는 도구 오류와 A2A 실패는 다르다. 승인·질문은 사용자 직접 작업에서도 발생하므로 Web 알림으로 전달하되 반드시 Message Service의 delivery 상태를 바꿀 필요는 없다. process/연결 손실은 hook 외의 실행 handle에서도 관측한다. reasoning 전문 수집은 요구하지 않는다.

`agents_list()`와 Web은 동일한 `status`와 `status_reason`을 사용한다. 상태는 `aiox-preparing`, `idle`, `working`, `awaiting-user`, `failed`다. 준비 중 Agent도 허용된 route의 목록에 포함하지만 메시지 수신 준비 완료를 뜻하지 않는다. Host에 남은 stopped 항목은 Host/Web에서 보이고 전송 대상 목록에서는 제외한다.

Web은 idle, reasoning·도구 실행 등 진행 상세, 사용자 입력·승인 대기, 실패 원인, Host stopped를 구분한다. 알림 읽음이나 다른 요청의 완료로 미해결 사용자 요청 표시를 지우지 않는다.

```text
B가 요청 X 처리 → X completed, B는 실제 활동에 따라 idle 또는 working
B가 요청 Y 처리 → X completed 유지, Y 진행 중, B working
```

completed/failed/interrupted는 개별 AIOX 입력의 처리 결과이고 Agent의 현재 상태와 별개다. completed는 연결된 응답 처리가 끝났다는 뜻이며 산출물의 정확성·업무 성공 보장이 아니다. 한 요청이 실패해도 실행이 살아 다른 입력을 처리한다면 현재 상태는 실제 활동을 따른다.

Claude는 Runtime·session_id·prompt_id와 연결된 UserPromptSubmit/Stop을, Codex는 Runtime·threadId·turnId와 연결된 `turn/completed`의 completed/failed/interrupted 결과를 사용한다. 입력 주입 성공만으로 처리 완료를 선언하지 않는다. busy 입력이 기존 turn에 합쳐질 수 있으므로 메시지 하나가 항상 새 turn 하나라는 가정을 하지 않는다. 임의 Stop 하나로 모든 요청을 완료하지 않는다.

세션 만료·인증/API 오류·연결 손실 등이 실제 요청을 실패시킨 경우 failed에 포함한다. 일시 재시도·일반 도구 오류를 무조건 요청 또는 Runtime 실패로 승격하지 않는다. interrupted는 Web에 기록하되 발신 Agent 자동 통지는 하지 않으며 모든 중단의 원인을 사용자로 단정하지 않는다.

## 9. MCP 도구·메시지 정책

공통 HTTP MCP 도구는 `agents_list`와 `send`로 분리한다. `reply`, `replyExpected`, 재전송 도구를 제공하지 않으며 legacy envelope의 type/intent를 필수 입력으로 가져오지 않는다.

- `agents_list()`는 현재 발신자가 outbound route로 보낼 수 있는 실행만 배열로 반환한다. 각 항목은 `name`, `role`, `description`, `status`, `status_reason`이며 별도 `agentId` 필드는 없다. 이름 미지정 시 Runtime ID를 name으로 사용한다. role·description 미지정은 목록에서 null, 수신 표시에서는 생략한다.
- `send({ targets: [nameOrId, ...], content })`는 Agent 이름 또는 실제 Runtime ID와 본문을 받는다. 목록의 name을 그대로 사용할 수 있고, 이름 있는 Agent도 실제 ID로 지정할 수 있다. 허용된 모든 Agent에게 자동 fan-out하지 않는다.
- daemon은 인증된 source의 Network 안에서 전송 시점의 현재 참여자를 ID 우선·이름 순으로 해석하고 membership·effective route를 검증한다. 오래된 목록은 권한이 아니다.
- 대상별 결과는 입력 문자열을 담은 `name`, `accepted`, 선택적 `error`다. 동일 입력은 한 번만 반환한다. 같은 실행의 이름과 ID를 함께 입력하면 각각에 같은 결과를 반환하되 실제 전달·Delivery 저장은 한 번만 한다.
- 대상 부재는 `accepted: false`와 `agents_list` 재조회 안내로 반환한다. 이미 수락된 대상에는 재전송하지 않도록 안내하며 daemon은 자동 재전송하지 않는다.
- 해석되지 않는 대상의 Delivery는 저장하지 않는다. 모든 대상이 해석되지 않으면 응답의 `messageId`만 생성하며 저장된 메시지 존재를 뜻하지 않는다.
- B 종료 후 새 B가 참여하면 이름 B는 새 실행으로 해석한다. 종료된 B의 ID는 새 B로 바꾸지 않는다. 기존 요청·결과·알림은 원래 Runtime ID에 귀속한다.
- A→B만 허용되면 A의 목록에는 B가 보이고 B의 목록에는 A가 보이지 않는다. 양방향·전이적 route를 추론하지 않는다. 대화상 회신도 `send`를 사용하며 역방향 route가 필요하다.
- 수신 정보는 발신자의 name·role·description, daemon 접수 시각 `createdAt`, 본문 `content`다. daemon이 인증된 발신자 메타데이터를 채운다. deliveryId 등을 모델의 회신 도구 인자로 노출할 필요는 없지만 내부 메시지·대상별 delivery·vendor prompt/turn 상관관계는 유지한다.

단방향 대상에게는 원문 뒤에 줄바꿈 두 번과 아래 영어 안내를 붙인다. 원문 저장값과 daemon이 생성한 안내는 구분한다.

```text
[AIOX Notice] No outbound route to the sender is available. Carry out the request. AIOX will automatically notify the sender when processing completes or fails. Do not attempt to send a reply or acknowledgment.
```

대상별로 **전송 시점의 역방향 route 유무**를 요청에 보존하여 이후 route 변경과 무관하게 자동 알림 정책을 적용한다.

| 전송 시점 관계 | completed | failed | interrupted |
| --- | --- | --- | --- |
| A→B 단방향 | daemon이 A에 통지 | daemon이 A에 통지 | 자동 통지 없음 |
| A↔B 양방향 | 자동 통지 없음 | daemon이 A에 통지 | 자동 통지 없음 |

A가 B·C에게 보낸 뒤 C만 실패하면 A에게만 알린다. full mesh라도 B에게 실패를 전파하지 않는다. B가 별도로 C에게 보낸 요청의 발신자는 B다. daemon 알림은 역방향 Agent route를 부여하지 않으며 vendor의 진짜 system role과 동일하다는 뜻도 아니다. daemon 알림 자체의 처리 종료로 다시 완료 알림을 생성하지 않는다.

알림은 Web뿐 아니라 발신 Agent의 vendor 입력 경로로 전달한다. Codex는 `toolOutput` 본문과 `additionalContext` 메타데이터, Claude는 native inbox peer message를 사용한다. 정확한 wire·표시·busy 입력 연결은 vendor 통합에서 검증한다.

## 10. Host·Network·routing·Worktree

Host는 하나의 workspace를 사용하는 Agent 실행 묶음이자 namespace다. Network는 통신 경계다. Host와 Network를 같은 객체로 만들지 않는다. standalone을 가짜 local Host에 넣어 실행 머신과 Host 실행을 혼동하지 않는다.

| Network 종류 | 정의 권위 | 수명·범위 |
| --- | --- | --- |
| Persistent | daemon DB의 지속 정의 | daemon 전체, 명시 delete까지 |
| Host-managed | aiox.yaml | 해당 Host 실행 동안, host-scoped |

Network에 속하는 Agent 수와 Host가 실행하는 Agent 수에 AIOX의 고정 숫자 상한을 두지 않는다. 사용자는 100개·1,000개 이상도 계속 추가할 수 있으며 숫자만으로 등록을 거절하지 않는다. 실제 실행의 자원 부족·vendor 제한은 해당 실패로 보고한다. 이는 Agent당 Network 최대 1개·Host당 Network 1개 계약과 별개다.

Agent당 동시 소속은 하나, Host manifest의 Network도 하나다. YAML `networks` map 표기는 유지하지만 현재 항목은 하나만 허용한다. join/leave·실행 중 소속 변경·external persistent Network 참조는 제외한다. YAML agents 목록은 최초 membership 선언이므로 유지한다.

Agent 이름은 참여 Network 안에서 유일하다. 준비 중·정리 대기 중인 등록도 이름을 예약하며 중복 등록을 거절한다. 다른 Network의 같은 이름은 허용한다. Network 미참여 실행의 이름 정책까지 확대하지 않는다.
서로 다른 Host에서 같은 Agent/Network 이름을 쓸 수 있다. 내부 key는 hostRuntimeId 또는 networkId로 구분한다. 실행 중 Host 이름은 daemon 범위에서 유일하며 `/`는 qualified name 구분자로 예약한다.
Network 범위 없는 일반 Agent 조회에서 여러 실행의 이름이 일치하면 모호성 오류와 후보를 제공한다. Network 내 등록 중복 거절과 일반 조회의 모호성 처리는 별개다.

```text
H1 / reviewer / feature-a  ≠  H2 / reviewer / feature-a
같은 YAML을 실행해도 Runtime·credential·Network는 분리
```

Persistent Network는 기본 전체 허용이며 차단된 directed edge만 저장한다. 변경 가능한 default 정책과 명시 allow 행은 두지 않는다. block은 차단 추가, unblock/reset은 차단 제거다. 반복 block은 중복 행을 만들지 않으며 없는 차단의 제거는 변화가 없다.

Host routing 우선순위:

```text
Runtime edge override
→ 없으면 Manifest edge
→ 없으면 Manifest default
```

between은 자기 자신을 제외한 양방향 clique이며 인자 순서는 결과에 영향을 주지 않는다. from/to는 단방향이다. Host block은 runtime 명시 deny, unblock은 runtime 명시 allow, reset은 runtime override 제거다. YAML이 차단한 방향도 unblock으로 열 수 있으며 reset하면 YAML 정책으로 돌아간다. default는 YAML에서만 설정하고 runtime default는 두지 않는다. 조회 시 effective policy와 출처를 표시하며 Host 출력 세부는 미결이다.

Host YAML은 routing.default의 allow/deny와 routing.allow/routing.deny 목록을 유지한다. default 생략값과 동일 값 중복 처리 방식은 미결이다. Reference 검증·directed edge 확장·allow/deny 충돌 검증을 부수효과 전에 한다. 일반 Network와 Host의 block/unblock/reset은 --between 또는 --from/--to 중 정확히 하나를 받는다. --to 단독, --from의 --to 누락과 self edge는 오류다. Host runtime 변경은 YAML을 수정하지 않고 Host 전체 재실행 시 사라진다.

Persistent route의 양쪽 endpoint는 해당 Network에 참여 중인 Agent의 이름 또는 Runtime ID여야 한다. 모든 대상을 ID 우선·이름 순으로 해석하고 검증한 뒤 Runtime ID로 저장한다. 같은 실행을 반복 지정해도 endpoint는 한 번만 적용한다.
Network 또는 대상이 없거나 다른 Network의 대상을 지정하면 오류 설명을 표시하고 해당 명령을 실패로 종료한다. 일부 edge만 저장하지 않으며 daemon 종료를 뜻하지 않는다.
Persistent Network의 A와 B 사이에서 A→B만 열려 있게 하려면 B→A를 block한다. unblock/reset --between A B는 양방향 차단을 제거한다. 자기 자신·다른 Network 전송 금지와 agents_list/send의 공통 권한 판정은 유지한다.
CLI Network 출력은 이름을 사용하고 이름 미지정 시 Runtime ID를 표시한다. Persistent는 `<name> (persistent)` 아래 `Persistent networks always default to allow; Hosts can choose allow or deny in YAML.` 안내와 `Default: allow`를 표시한다. 차단이 없으면 `Blocks: none`, 있으면 `B -> A: blocked`처럼 표시한다. 양방향 차단은 `A <-> B: blocked`로 합치며 route 개수는 표시하지 않는다. CLI 출력은 영어 정책을 따른다.

### Worktree

```sh
aiox host run --path ./aiox.yaml --name development
aiox host run --path ./aiox.yaml --name login --worktree feature/login
```

현재 작업 경로의 Git 저장소 여부를 확인하고 AIOX가 Git Worktree를 내부적으로 준비한다. 원래 경로 Host와 Worktree Host는 별도 실행 묶음이다. 한 Host 내부 Agent들은 같은 작업 경로를 사용한다. Agent마다 별도 Worktree를 자동 생성하지 않는다.

`--name`은 YAML host.name을 덮어쓴다. 같은 YAML을 별도 이름·workspace로 실행할 수 있다. Worktree 생성 위치·기준 commit·기존 branch/checkout 재사용·충돌 처리는 herdr 구현에서 유용한 방식을 검토해 해당 단계에 구체화한다. `.aiox/worktrees` 등 과거 경로 후보를 확정값으로 쓰지 않는다. Host 종료가 자동 merge·branch 삭제·Worktree 삭제를 뜻하지 않는다.

## 11. CLI 전체

**AIOX 메시지 언어**

AIOX가 생성하는 CLI 출력과 Agent에게 전달하는 시스템·자동 알림 메시지는 영어로 통일한다. 오류·경고·안내·성공·상태·시작 및 종료 메시지를 포함한다. 사용자 작성 본문과 vendor 출력은 원문을 유지한다. 운영 Web의 UI 문구(오류·성공·알림 표시 포함)는 기존 다국어 정책을 따른다.

```text
aiox
├─ daemon
│  ├─ start
│  ├─ stop [--force]
│  ├─ restart
│  └─ status [--json]
├─ adapter
│  ├─ install <package>
│  ├─ uninstall <adapter>
│  ├─ list
│  ├─ show <adapter>
│  ├─ setup <adapter> [-- <adapter-options>]
│  └─ doctor [adapter]
├─ agent
│  ├─ run <adapter>
│  │  ├─ --name <name>
│  │  ├─ --network <network>                 # 하나만 선택
│  │  ├─ --role <role>
│  │  ├─ --description <description>
│  │  ├─ --instruction <instruction>
│  │  └─ -- <adapter-options>
│  ├─ list [--network <network>] [--host <host>] [--all] [--json]
│  └─ show <agent> [--json]
├─ network
│  ├─ create <name>
│  ├─ delete <network>
│  ├─ list [--all] [--json]
│  ├─ show <network> [--json]
│  ├─ block <network>
│  │  ├─ --between <agents...>
│  │  └─ --from <agent> --to <agents...>
│  ├─ unblock <network>
│  │  ├─ --between <agents...>
│  │  └─ --from <agent> --to <agents...>
│  └─ reset <network>
│     ├─ --between <agents...>
│     └─ --from <agent> --to <agents...>
├─ host
│  ├─ run
│  │  ├─ --layout <auto|left-main|top-main|grid>
│  │  ├─ --columns <number>
│  │  ├─ --rows <number>
│  │  ├─ --path <aiox.yaml>
│  │  ├─ --name <host>
│  │  └─ --worktree <branch>
│  ├─ list [--json]
│  ├─ status <host> [--json]
│  ├─ stop <host>
│  ├─ agent
│  │  ├─ start <host> <agent-names...>
│  │  └─ stop <host> <agent-names...>
│  └─ network
│     ├─ list <host> [--json]
│     ├─ show <host> <network> [--json]
│     ├─ block <host> <network> [--json]
│     │  ├─ --between <agents...>
│     │  └─ --from <agent> --to <agents...>
│     ├─ unblock <host> <network> [--json]
│     │  ├─ --between <agents...>
│     │  └─ --from <agent> --to <agents...>
│     └─ reset <host> <network> [--json]
│        ├─ --between <agents...>
│        └─ --from <agent> --to <agents...>
├─ status [--json]
└─ doctor [--json]
```

- AIOX 옵션은 `--instruction` 단수. `--network` 반복은 거절한다. `--` 뒤는 adapter 인자다.
- `network list` 기본은 persistent, `--all`은 host-managed 포함. host-qualified show는 가능하지만 최상위 mutation은 persistent 전용이다.
- Host-managed route 변경은 `host network block/unblock/reset`으로 한다.
- standalone 실행은 foreground다. Ctrl+C·/exit 등 vendor 세션 종료를 사용한다. standalone 외부 stop/attach/detach 명령은 보류했다.
- adapter setup 명령 표면이 존재해도 Claude의 사전 영구 MCP 등록을 다시 요구하지 않는다.
- Web 열기 명령의 정확한 이름, start에 넣을 포트 인자 이름과 agent list --all의 상세 범위는 CLI 구현 때 맞춘다.

Host의 Agent 구성·Network·route 정의는 YAML이 소유한다. `host agent add/remove`와 Declared/Ephemeral 구분을 도입하지 않는다.

```text
aiox host agent start <host> <agent-names...>
aiox host agent stop <host> <agent-names...>
```

Agent는 해당 Host 안의 이름으로 하나 이상 지정한다. stop은 실행·credential·binding·활성 membership을 정리하고 Host의 항목·메타데이터·실행 설정을 stopped로 유지한다. start는 기존 항목을 새 Runtime ID·credential로 실행하며 이전 vendor 대화를 자동 resume하지 않는다. 이미 실행 중인 항목을 중복 실행하지 않고 이름별 결과를 보고한다. 보존한 Host route 설정은 새 실행 ID에 연결하며 stopped 항목에는 전달하지 않는다.

Standalone 실행 종료 또는 협업 등록 유효성 상실 시 실행 등록·membership·해당 실행 endpoint의 route를 정리한다. 정리 완료 후 이름을 재사용할 수 있으며 새 실행은 이전 차단을 승계하지 않고 기본 허용을 적용한다. 이전 B→A 차단은 새 B를 차단하지 않는다. daemon 재시작 시 Network 이름은 유지하고 과거 Runtime의 잔존 route는 정리한다.
Host 전체 종료 시 Host·전용 Network·membership·runtime route override를 정리한다. YAML·Worktree·작업 파일과 보존 기간 내 메시지 이력은 남긴다. 다음 host run은 YAML로 새로 build하며 과거 실행이나 vendor 대화를 자동 복원하지 않는다. `host network block/unblock/reset`은 현재 Host 실행만 변경하고 YAML에 쓰지 않는다. 개별 Host Agent의 stopped 항목·보존 route 재연결은 앞의 별도 계약을 따른다.

**명령·인증된 실행 위치와 실행 소유권**

| 명령·실행 위치 | 실행 소유자 | TUI 표시·종료 후 동작 |
| --- | --- | --- |
| 어디서든 `aiox host run` | daemon | Web에 생성·Agent 종료 상태 표시 |
| 인증된 Web terminal의 `aiox agent run <vendor>` | daemon | 기존 Web terminal·vendor 종료 후 기존 shell 복귀 |
| 외부 `aiox agent run <vendor>` | CLI | 사용자 stdin/stdout/stderr 상속·vendor 종료 후 기존 shell 복귀 |
| Web 일반 shell | daemon | Web terminal |

```text
AIOX 명령 + daemon에서 인증한 실행 문맥
→ 공통 계층이 실행 소유자·표시 위치·종료 정책 결정
→ vendor adapter가 실행 설정·협업 연결 준비
→ 소유자가 vendor와 필요한 부속 프로세스 실행
→ adapter의 준비·관측 결과를 공통 협업 관리에 반영
```

실행 위치는 환경 변수의 존재만으로 신뢰하지 않는다. 외부 실행에는 AIOX PTY·headless·xterm·SerializeAddon을 사용하지 않는다. Web은 유효한 외부 Agent 등록의 상태만 조회하며 외부 TUI를 연결·조작·이관하지 않는다. 일반 `claude`·`codex` 직접 실행은 자동 Agent 등록 대상이 아니다.

외부 CLI는 daemon 등록·credential·instruction·hook 등 주입 준비를 마친 뒤 vendor를 직접 실행한다. 제어 WS는 준비·시작·종료를 전달하며 화면 바이트·resize를 중계하지 않는다. 시작 시 daemon 연결 실패는 vendor 실행 전 오류다. 실행 중 daemon 또는 제어 연결 손실은 준비 완료 전후와 무관하게 시작한 vendor를 유지하고 협업 권한·등록을 정리한다. 관측 손실을 vendor 종료 성공으로 표시하지 않는다. heartbeat·자동 재연결·재등록은 추가하지 않으며 협업 복구는 `agent run` 재실행으로 처리한다.

명시적 최초 준비 실패는 오류와 vendor 종료 처리로 연결한다. 연결 손실과 구분하며, 현재 Claude의 준비 제한값을 모든 vendor의 공통 deadline으로 확정하지 않는다. vendor 종료 후 CLI는 daemon 정리 요청 실패와 무관하게 로컬 임시 자원을 정리하고 shell 복귀를 완료한다.

Claude 외부 inbox 임시 디렉터리는 CLI가 생성·권한·경로 검사부터 삭제까지 소유하고, daemon은 준비 시 고정한 경로와 인증된 hook 보고를 대조한다. 실제 실행 환경의 cwd/env로 버전을 검사하며 기존 주입·설정 보존·충돌 검사를 재사용한다. 외부 hook의 `ECONNREFUSED`만 stderr 없이 정상 종료하고, 401·잘못된 보고·설정 오류·timeout과 Web/Host hook 실패는 진단을 유지한다. CLI 사망 후 vendor만 남으면 hook 오류가 반복될 수 있다.

Host의 실행 중 이름 유일성·실행별 신원 분리·Agent 중복 시작 방지와 이번 시작 시도가 만든 자원에 한정한 실패 보상은 유지한다. 중복 Host 반환이나 일부 실패 시 성공 Agent 유지 정책을 추가하지 않는다.

실행 소유권의 근거는 [결정 문서](../../docs/decisions/execution-ownership.md), 현재 구조·검증 범위는 [Stage 2-2 로그](../2026-09-11-AIOX-TUI-Stage2-2-Execution-Ownership.md)를 따른다.

## 12. aiox.yaml

YAML의 Agent별 실행 인자는 `agents.<name>.args: string[]`로 선언한다. `execute`/`excute` 필드나 호환 alias는 사용하지 않는다.

```yaml
args: ["--model", "sonnet", "--permission-mode", "plan"]
```

- block 배열과 inline 배열은 같은 `string[]`로 처리한다. `args` 생략은 빈 배열과 같다. 문자열이 아닌 요소는 입력 검증에서 거절한다.
- 배열 요소 하나는 argv 하나다. 공백을 기준으로 재분리하거나 shell 명령으로 실행하지 않는다. 공백이 포함된 값도 하나의 요소로 전달할 수 있다.
- `"--model sonnet"`을 자동으로 두 인자로 나누지 않는다. 한 인자로 전달하며 옵션의 유효성은 adapter/vendor가 판단한다.
- CLI의 `--` 이후 인자와 YAML의 `args`는 같은 adapter 실행 인자 계약으로 연결한다. YAML 배열에 구분자 `--`를 자동으로 덧붙이지 않는다.
- 실행 대상은 `adapter`가 정한다. 특히 Codex의 TUI와 App Server 중 어느 프로세스에 인자를 적용할지는 adapter가 담당한다.
- AIOX가 관리하는 MCP·credential·binding 설정과 사용자 인자의 충돌 중 Claude 필수 설정 충돌은 §5의 실행 전 거절 정책을 따른다. 구체적인 충돌 판정·병합 방식과 다른 adapter의 처리는 해당 adapter 구현 단계에서 구체화한다. 이 계약 추가는 YAML parser·launcher 구현 완료를 뜻하지 않는다.

```yaml
version: 1

host:
  name: feature-host
  layout:
    preset: auto

agents:
  reviewer:
    adapter: claude-code
    role: review
    args:
      - --model
      - sonnet
      - --permission-mode
      - plan
    instruction: |
      구현을 검토하고 발견한 문제를 implementer에게 전달한다.

  implementer:
    adapter: codex
    role: implementation
    instruction: |
      요구사항에 맞게 구현하고 reviewer에게 검토를 요청한다.

  researcher:
    adapter: claude-code
    role: research
    instruction: |
      조사 결과를 reviewer에게 전달한다.

networks:
  feature-a:
    agents:
      - reviewer
      - implementer
      - researcher
    routing:
      default: deny
      allow:
        - between: [reviewer, implementer]
        - from: researcher
          to: [reviewer]
```

`networks.<name>.agents`는 같은 YAML의 Agent Definition key를 참조한다. 실행 시 definition → 새 Runtime ID로 매핑해 membership·route를 만든다. 위 예시는 reviewer↔implementer, researcher→reviewer만 허용한다. 모두 같은 Host 작업 경로를 쓴다. adapter ID·version 필드의 parser 세부는 실제 계약에 맞추며 이 예시만으로 구현 완료라고 하지 않는다.

```text
YAML·이름·adapter·route 검증
→ Host/Network 준비
→ Agent 실행 및 Runtime ID 연결
→ membership·route·binding 준비
→ 사용 가능한 실행으로 노출
```

초기 MCP 연결에 필요한 endpoint를 실행 시점에 준비한다. 실패 보상은 이번 실행에서 만든 자원에 한정한다. 기존 Host·사용자 파일을 지우지 않고 cleanup 실패를 완전 rollback 성공으로 숨기지 않는다.

## 13. 종료·시작 실패·업데이트

정상 Host 종료:

```text
host stop → Controller 종료 상태
→ adapter가 TUI 종료 입력 전달
→ 실제 종료 관측
→ App Server·Relay 등 소유 자원 정리
→ token·binding·membership·Host Network·등록 정리
→ Worktree와 작업 결과 보존
```

키보드 이벤트 전달은 종료 요청 수단이지 종료 성공 증거가 아니다. 승인 화면·입력 중 상태에서 키가 항상 같은 의미라고 가정하지 않는다. 종료 시간 제한·OS별 수단은 구현 때 정한다. 조회 실패를 프로세스 부재로 간주하지 않는다.

**daemon 소유권·환경별 종료 정책**

현재 종료 계약은 [Runtime spec](../../docs/specs/aiox-runtime.md)을 따른다.

작업 판정과 프로세스 종료 대상은 daemon 소유 실행이다. 외부 사용자 터미널의 aiox agent run은 CLI 소유이며 협업 등록만으로 종료 대상이나 blocker가 되지 않는다.

| daemon 실행 환경 | 일반 stop | stop --force |
| --- | --- | --- |
| macOS·Linux·WSL 내부 | 남은 작업 없는 대기 shell 종료. daemon 소유 활성 세션·실행 중 작업·중지 작업·판정 불가가 있으면 거절 | daemon 소유 Host·Web Agent·일반 shell과 그 안의 프로그램 종료 |
| Windows native | 작업 검사 없이 daemon 소유 실행 종료. Web에서 시작한 WSL 실행도 대상 | 일반 stop과 같은 종료 대상·작업 검사 정책 |
| 모든 환경의 외부 CLI 소유 실행 | blocker 제외·vendor와 필수 부속 실행 유지·협업만 해제 | vendor와 필수 부속 실행 유지·협업만 해제 |

일반 shell의 idle은 AIOX가 처음 만든 shell의 입력 대기와 남은 작업으로 판정한다. 이전 출력·cwd 변경·Enter 전 입력은 blocker가 아니며 미제출 입력은 종료 시 버릴 수 있다. 입력을 기다리는 daemon 소유 Agent는 실행 중인 세션이며 빈 shell처럼 취급하지 않는다. 중첩 shell은 바깥 shell의 작업이고 판정 불가를 임의의 강제 종료로 대체하지 않는다.

```text
신규 실행·Web 입력 차단
→ 일반 stop이면 daemon 환경에 따라 작업 판정
   └─ 거절: 입력·실행 접수 복구
→ daemon 소유 대상 실행 종료
→ 협업 등록·자원 정리 및 실제 종료 확인
   ├─ 완료: daemon 종료
   └─ 미완료: stop_incomplete 보고
              daemon·Web·재시도 정보 유지
              입력·실행 접수 복구
```

- daemon restart는 같은 일반 stop 뒤 start다. Windows에서는 daemon 소유 작업을 중단할 수 있고 macOS·Linux·WSL에서는 blocker가 있으면 거절한다. restart --force는 제공하지 않는다.
- 종료 요청·신호 전송이나 조회 실패만으로 실제 종료 성공을 판단하지 않는다. daemon 소유 foreground·필수 부속 실행·자원 정리를 확인한다. 일부 자원 정리 후 실패할 수 있으며 남은 정리 정보를 보존한다.
- 협업 인증·발견·전송 자격 회수와 프로세스 종료·등록 삭제는 별개다. 정리 재시도는 회수한 협업 권한의 복구가 아니다.
- 외부 vendor와 필수 부속 실행은 일반 stop·force·daemon 신호 종료·비정상 종료·예기치 않은 연결 손실에도 유지한다. 자동 재연결·재등록은 없으며 협업 복구는 agent run 재실행이다. 외부 vendor 종료 뒤 로컬 자원을 정리하고 원래 shell로 복귀한다.
- MCP 연결 실패는 호출측에서 협업 불가를 진단하며 vendor를 종료하지 않는다. 서버 종료가 확인되지 않은 연결 실패의 원인을 서버 종료라고 단정하지 않는다.
- 사용자 부모 shell·터미널 앱·무관한 프로그램을 이름으로 찾아 종료하거나 WSL 배포판 전체를 종료하지 않는다. 임의 중첩 자손 전체의 종료 보장으로 확대하지 않는다.
- Persistent Network 정의·Worktree·사용자 작업 파일은 보존한다.

업데이트 때문에 vendor가 준비되지 못하면 해당 실행 등록을 실패시키고 사용자가 업데이트 처리 후 다시 실행하는 단순 방향이다. Codex의 global update 후 “Please restart Codex” 종료가 관찰됐다. Claude background update가 매번 startup 실패를 뜻하지는 않는다. 안정된 update API·신호와 실패 매핑은 구현 때 좁게 확인한다. 자동 update orchestration·상세 진행 FSM·자동 Host 재실행을 추가하지 않는다.

## 14. 전역 설정·SQLite·플랫폼

**Terminal·shell과 상속의 의미**

Terminal은 화면과 입력을 제공하고, shell은 명령을 해석하고 실행한다.

| 터미널 | 그 안에서 실행하는 shell |
| --- | --- |
| Ghostty | zsh·bash 등 |
| macOS Terminal 앱 | zsh·bash 등 |
| AIOX Web terminal | daemon이 새로 실행한 shell |

```text
Ghostty의 zsh에서 cd ~/projects/my-app → aiox daemon start
→ daemon이 작업 경로·환경변수를 물려받음
→ Web에서 새 terminal 생성
→ daemon이 새 PTY와 별도 shell 생성
→ 설정·생성 요청을 반영한 작업 경로와 실행 환경 전달
```

| 전달될 수 있는 것 | 그대로 공유되지 않는 것 |
| --- | --- |
| 작업 경로, PATH 같은 환경변수 | 원래 터미널 창·화면·스크롤 기록 |
| 환경변수로 내보낸 값 | 원래 shell 프로세스·실행 중인 작업 |
| TERM_PROGRAM 같은 터미널 식별 환경변수 | 원래 shell의 일반 변수·alias 등 메모리 상태 |

새 shell이 초기화 파일을 읽어 같은 alias를 설정할 수는 있지만 원래 shell 상태를 복제한 것은 아니다. TERM_PROGRAM에 ghostty가 남아 있는 경우도 환경변수 상속의 사례이지 Ghostty를 Web에 띄웠다는 뜻이 아니다. 이는 현재 AIOX가 해당 값을 그대로 전달한다는 보장이 아니며 실제 터미널 식별값은 공통 터미널 계층의 구성을 따른다.

설정·검증 계약은 [Web 설정 spec](../../docs/specs/aiox-configuration-web.md), PTY·화면 관리 책임은 [터미널 architecture](../../docs/architecture/aiox-storage-terminal.md)를 따른다.

**새 Web shell의 공통 실행 설정**

Windows·macOS·Linux 모두 config.json의 terminal 설정을 사용한다. 시작 shell을 자동 추정하지 않고 실행할 shell을 명시적으로 선택할 수 있다.

| 필드 | 의미 | 생략 시 |
| --- | --- | --- |
| shell | 실행할 shell의 이름 또는 경로 | Windows: COMSPEC 또는 cmd.exe; macOS·Linux: SHELL 또는 /bin/bash |
| args | shell에 전달할 인자 배열 | 추가 인자 없음 |
| cwd | 선택한 shell의 시작 폴더 | 기존 daemon 작업 경로 동작 |

SHELL은 현재 실행 중인 shell을 항상 정확히 나타내지 않는다. PowerShell에서 daemon을 시작해도 Web 기본 shell이 PowerShell로 자동 선택되는 것은 아니다. Windows 실행 파일은 CMD cmd.exe, PowerShell 5.1 powershell.exe, PowerShell 7 pwsh.exe 등을 선택할 수 있다.

Windows PowerShell 7:

```json
{
  "terminal": {
    "shell": "pwsh.exe",
    "args": [],
    "cwd": "C:\\projects\\my-app"
  }
}
```

Windows에서 WSL 배포판 선택:

```json
{
  "terminal": {
    "shell": "wsl.exe",
    "args": ["-d", "Ubuntu"],
    "cwd": "/home/user/projects/my-app"
  }
}
```

macOS:

```json
{
  "terminal": {
    "shell": "/bin/zsh",
    "cwd": "/Users/user/projects"
  }
}
```

Linux:

```json
{
  "terminal": {
    "shell": "/bin/bash",
    "cwd": "/home/user/projects"
  }
}
```

- WSL의 cwd는 선택한 배포판 내부 Linux 경로다. Windows PTY의 작업 경로와 구분하며 프로그램 설치·WSL 버전 변환은 설정의 역할이 아니다.
- 새 일반 Web shell 생성 시 최신 설정을 읽는다. 기존 터미널·실행 중인 프로그램을 바꾸지 않으며 vendor 실행 PTY나 외부 사용자 터미널의 설정에 적용하지 않는다.
- 명시적인 생성 요청 cwd는 전역 기본 cwd보다 우선한다.
- daemon 시작 전에 실행 파일·cwd의 유효성을 검사하고 실패하면 DB·listener 준비 전에 거절한다. 새 shell 생성도 최종 요청을 검증하며 실패해도 기존 실행은 유지한다.
- WSL은 배포판·사용자를 반영해 Linux cwd를 검사한다. 검사에서 사용자 command tail을 실행하지 않으며 해석할 수 없는 실행 옵션은 거절한다.
- 사전 검사는 실행 파일 형식·초기화 성공까지 보장하지 않는다. 검증 이후 실제 실행 오류도 전달한다. Windows 실행 파일 ACL의 사전 보장 한계는 관련 spec을 따른다.
- 잘못된 shell/cwd를 마지막 유효 값으로 조용히 대체하지 않는다. 아래 화면·keyboard 설정의 반영 정책과 실행 설정의 시작·생성 거절을 구분한다.

**daemon 실행 환경과 중첩 shell**

```text
daemon 실행 환경
→ AIOX가 Web terminal에 처음 만든 shell
→ 사용자가 실행한 다른 shell·프로그램

AIOX의 bash → PowerShell 실행
→ PowerShell이 입력 대기 중이어도 bash 기준으로는 작업 실행 중
```

Windows daemon이 wsl.exe를 실행해도 종료 정책의 기준은 Windows다. WSL 내부 Linux Node로 daemon을 시작하면 Linux 정책을 적용한다. 안쪽 shell의 idle까지 추적하지 않는다. Windows→WSL 일반 shell 설정 지원을 vendor의 path·IPC·credential·MCP 혼합 연동 전체 지원으로 확대하지 않는다.

설정은 프로젝트별이 아니라 모든 Host·standalone에 공통인 사용자 전역 설정이다. 실행 환경의 사용자 홈 아래 `.aiox/config.<확장명>`을 사용한다. npm 설치 디렉터리나 현재 프로젝트에 저장하지 않는다. Host YAML은 실행 선언이고 전역 설정과 별개다.

Baseline 시점의 JSON은 추천이었고, 이후 Stage 1 기록·구현에서는 JSON, daemon 4500/Web 4501, CLI override > 파일 > 기본값, better-sqlite3가 선택된 상태로 보고됐다. 이것을 모든 listener·CLI 인자·3 OS 제품 통합 완료로 확대하지 않는다. 이 문서는 현재 git 상태를 매번 추적하는 구현 진행표가 아니다.

| 저장 위치 | 책임 |
| --- | --- |
| 전역 설정 파일 | terminal 폰트·색상·theme·keybindings, web.sidebar.width, host.layout, daemon/Web 포트 |
| localStorage | Web 일반 system/light/dark 선택. system은 OS 테마를 따름 |
| SQLite | 지속 Network·route, 메시지·대상별 처리 결과·daemon 알림, 실행 이력, 알림·읽음, workspace 배치 |
| Server memory | 살아 있는 process·binding·credential·activity |

AIOX send 원문과 daemon 알림 본문을 저장하고 발신자·대상·시각·대상별 처리 결과·내부 상관관계를 연결한다. vendor 전체 대화·reasoning·터미널 출력은 이 메시지 저장 범위에 포함하지 않는다. 살아 있는 PTY의 Web 화면 복귀 책임은 별개다. 저장 데이터를 자동 재전송·실행 복원에 사용하지 않는다.

보존 기본값은 요청 처리 종료 후 30일이다. 진행 중 요청은 삭제하지 않고, 정리 대상 요청의 본문·대상별 결과·연결된 daemon 알림을 함께 정리한다. 여러 대상의 처리가 남은 요청을 일부 완료만으로 삭제하지 않는다. 보존 일수는 전역 설정으로 변경하며 daemon 시작 시와 하루 한 번 정리한다. Host 종료 자체로 이력을 지우지 않는다. 이 정책은 persistent Network·route 정의, YAML·사용자 작업 파일을 삭제하거나 디스크 용량 상한을 보장하는 정책이 아니다.

Persistent Network 이름은 DB에 지속한다. endpoint route는 참여 실행의 수명을 따르며 종료·daemon 재시작 시 정리한다. Host의 정의 원본은 YAML이며 Host와 전용 Network·runtime override는 실행 수명에 한정한다. DB 이력은 살아 있는 membership이나 Host 복원 근거가 아니다.

TypeORM·better-sqlite3는 도입돼 있으며 현재 schema를 transaction 안에서 직접 초기화한다. 첫 배포 전에는 과거 개발 DB 호환을 위한 migration·backfill·legacy fallback을 유지하지 않는다. 저장 원자성·실패 재시도·재오픈 검증은 유지하고 startup 자동 삭제·reset은 하지 않는다. 배포 완료 통지 이후 schema 변경은 기존 데이터를 보존하는 migration으로 수행한다.

새 Network·Message·Delivery·Notification 행의 ID를 UUID v7으로 생성하도록 구현했다. 기존 ID를 재발급하지 않으며 Runtime·terminal 참조 ID와 vendor 고유 ID는 이 변경 대상이 아니다.

언어·소리 설정의 localStorage 저장과 DB 기본 경로 연결은 후속 구현 사항이다.

설정 반영:

```text
Web 편집·미리보기 → 저장 → 검증 → 전역 파일 갱신 → 연결된 Web에 배포
외부 파일 편집·저장 → 감지·검증 → 같은 적용 경로
잘못된 화면·keyboard 설정 → 마지막 유효 설정 유지 + 오류 표시
```

- terminal appearance와 keyboard는 실행 중 반영한다.
- terminal.shell/args/cwd는 새 일반 Web shell 생성 시 검증·적용하며 기존 실행은 유지한다.
- daemon/Web 포트는 다음 daemon 시작에 반영하고 “저장됨·재시작 후 적용”을 표시한다.
- 별도 `aiox config apply`를 요구하지 않는다.
- 설정 저장 때문에 daemon 자동 재시작·Agent 종료를 하지 않는다.
- daemon이 꺼져 있을 때 수정한 설정은 다음 시작에 검증한다.
- 동시 편집 충돌 처리와 변경 감지 방식은 구현 때 정한다.

SQLite는 동일 domain/schema를 3 OS에서 사용한다. persistence 패키지가 접근하고 daemon이 연결을 소유한다. CLI·Web·adapter가 DB를 직접 수정하지 않는다. 파일 오류를 새 빈 DB로 우회하거나 자동 삭제하지 않는다. transaction과 shutdown cleanup을 유지하고 schema 변경은 앞의 첫 배포 전·후 정책을 따른다. WAL 선택·pragma는 실제 필요에 따라 결정한다.

Windows native와 WSL은 실행 환경·홈·DB·path·IPC가 다르다. 같은 환경 안에 daemon·Node·Git·vendor를 두는 구성이 초기 제안이다. Windows daemon의 wsl.exe 일반 shell 선택·Linux cwd 설정은 지원한다. 이를 Linux vendor의 혼합 협업 연동 전체 지원으로 확대하지 않는다. Windows 브라우저가 WSL Web에 접속하는 것은 별도 사례다.

Node/CPU/native dependency 조합의 실제 배포 설치·DB 로딩·PTY·vendor 실행·종료를 각 OS에서 확인해야 한다. Linux Docker 성공은 Windows 실측이 아니다. npm 전역 설치 산출물이 대상이며 개발 환경 실행만으로 배포 호환 완료라고 하지 않는다.

## 15. 운영 Web·브라우저 복귀·알림

터미널 작업 화면과 초기 layout의 확정 방향(구현 완료 보고가 아님):

```text
AIOX Web
├─ 사이드바
│  ├─ 일반 터미널
│  ├─ Hosts
│  │  ├─ development
│  │  └─ review
│  └─ Networks
│     └─ dev
└─ 선택한 작업 화면
   └─ 분할 영역
      └─ 영역별 탭 묶음
         └─ 실제 PTY 터미널

┌─[Claude][Shell][+]──────┬─[Codex][+]────────────┐
│                        │                      │
│                        ├─[Reviewer •][+]──────┤
│                        │                      │
└────────────────────────┴──────────────────────┘
```

- 탭·분할은 Host 전용이 아닌 공통 Web 터미널 기능이다. Host는 실행 묶음, Network는 통신 경계, layout은 화면 배치다. Network 선택은 Agent·route 조회로 연결한다.
- 각 영역의 탭은 독립적으로 전환한다. Host 전체 배치를 넘기는 페이지 탭은 사용하지 않는다. 탭을 다른 영역으로 드래그하면 이동하고 가장자리에 놓으면 상하좌우 새 분할을 만든다. 드롭 위치를 미리 보여주며 마지막 탭을 옮긴 빈 영역은 합친다. 초기 이동 범위는 같은 작업 화면 내부다.
- 경계선을 드래그해 너비·높이를 조절한다. 행·열을 다시 계산해 PTY resize를 전달한다. 현재 영역 확대·기존 배치로 복귀, 명시적 분할 크기 균등화를 제공한다. 탭 이동·확대·resize는 프로세스·대화·Network를 변경하지 않는다.
- 영역별 `[+]` 메뉴는 새 shell 터미널, 오른쪽 분할, 아래쪽 분할을 제공한다. 새 shell 탭은 현재 영역에 추가하고 Host에서는 해당 Host 작업 경로를 사용한다. shell 추가로 기존 화면 전체를 자동 재배치하지 않는다.
- 일반 shell에서는 git·pnpm 등 명령과 일반 Claude/Codex TUI도 실행할 수 있다. 직접 vendor CLI를 실행하는 것은 AIOX Agent 자동 등록이나 MCP/binding 주입이 아니다.
- Host 없이 일반 터미널에서 `aiox network create dev` → 단축키로 shell 분할 → 각 shell에서 `aiox agent run claude --network dev`, `aiox agent run codex --network dev`도 지원한다. 기존 터미널에서 실행하고 등록 때문에 새 탭을 중복 생성하지 않는다. Agent 종료 후 원래 shell로 돌아온다. 화면 분할로 Host·Network를 자동 생성하지 않는다.

각 영역의 추가 메뉴와 standalone 실행 흐름:

```text
[+]
 ├─ 새 shell 터미널
 ├─ 오른쪽으로 분할
 └─ 아래쪽으로 분할

일반 터미널 열기 → Network 생성 → 단축키로 분할
→ 각 shell에서 standalone Agent 실행 → 종료 후 원래 shell로 복귀
```

```sh
aiox network create dev
aiox agent run claude --network dev
aiox agent run codex --network dev
```

**Host 초기 layout**

| host.layout.preset | 초기 영역 배치 |
| --- | --- |
| auto (기본) | 1개 전체, 2개 좌우, 3개 왼쪽 하나+오른쪽 위아래, 4개 2×2 |
| left-main | 왼쪽 하나+오른쪽 위아래, 최대 3개 영역 |
| top-main | 위쪽 하나+아래쪽 좌우, 최대 3개 영역 |
| grid | columns × rows 영역 |

```text
auto: 2개        auto: 3개        auto: 4개
┌────┬────┐     ┌────┬────┐     ┌────┬────┐
│ A  │ B  │     │    │ B  │     │ A  │ B  │
│    │    │     │ A  ├────┤     ├────┼────┤
│    │    │     │    │ C  │     │ C  │ D  │
└────┴────┘     └────┴────┘     └────┴────┘

2열 × 1행, Agent 6개
┌─[A][C][E][+]────┬─[B][D][F][+]────┐
│ 선택한 A        │ 선택한 B        │
└─────────────────┴─────────────────┘
```

영역 수를 넘는 Agent는 선언 순서대로 기존 영역에 돌아가며 탭으로 추가하고 기존 선택 탭을 유지한다. 예를 들어 2열·1행에서 A/C/E는 왼쪽, B/D/F는 오른쪽 탭이 된다. 불필요한 빈 영역은 만들지 않는다. 초기 배치 이후 사용자가 조정한 배치를 자동으로 원상복구하지 않는다.

**설정·YAML·CLI**

전역 `~/.aiox/config.json` 예시(너비 240은 예시이며 실제 기본값은 UI 구현 때 결정):

```json
{
    "web": {
        "sidebar": {
            "width": 240
        }
    },
    "host": {
        "layout": {
            "preset": "auto"
        }
    },
    "keybindings": {}
}
```

Host YAML의 초기 배치 예시:

```yaml
host:
  name: development
  layout:
    preset: grid
    columns: 2
    rows: 2
```

```sh
aiox host run --layout auto
aiox host run --layout left-main
aiox host run --layout top-main
aiox host run --layout grid --columns 2 --rows 2
```

- layout 우선순위는 CLI → YAML → 전역 config → 기본 auto다. 상위에서 preset을 바꾸면 하위의 다른 preset용 행·열을 섞지 않는다.
- columns·rows는 grid용 양의 정수다. YAML에 행·열만 지정하면 grid 생략형으로 해석한다. 다른 preset과 행·열의 충돌은 오류로 알린다. auto에서는 숫자 행·열 대신 preset 자체로 1~4개 배치를 선택한다.
- 사이드바 너비는 전역 `web.sidebar.width`로 제공하고 DB에 중복 저장하지 않는다. Web 설정에서 저장해도 같은 전역 config를 갱신한다. 실제 터미널 목록·분할 방향/비율·탭 순서·선택 상태는 작업 화면별로 서버에서 유지·복원한다. 초기 layout 설정 변경이 현재 사용자 배치를 강제 재배치하지 않는다.
**포커스·알림·단축키**

```text
브라우저 활성 + 대상 터미널에 실제 포커스
→ 소리·토스트 생략

다른 영역·숨겨진 탭·비활성 브라우저
→ 탭 알림 표시 + 알림 목록 + 소리
```

- 포커스된 영역의 테두리·선택 탭을 강조하고 비활성 영역의 강조는 줄인다. 터미널 본문 색상은 사용자 설정을 유지한다. 방향별 포커스 이동과 현재 포커스 영역을 잠깐 강조하는 기능을 제공한다.
- 알림 포커스 판단은 실제 대상 terminal 기준이다. 브라우저가 활성이고 해당 terminal에 포커스가 있으면 소리·토스트를 생략한다. 다른 영역·숨겨진 탭·비활성 브라우저에서는 탭 알림 표시와 목록·소리를 제공한다. 클릭하면 대상 영역의 탭을 선택하고 포커스를 이동하며 읽음 처리한다. 상태·이벤트 기록은 유지하고 짧게 몰린 알림의 소리는 한 번만 울린다.
- 단축키 동작은 새 shell 탭, 분할, 탭 전환, 방향별 포커스, 영역 확대·복귀, 크기 균등화, 포커스 강조, 사이드바 토글이다. 전역 keybindings에서 재지정할 수 있게 한다. 브라우저를 사용하는 OS 기준으로 macOS·Windows·Linux 기본키를 적용하며 Windows 브라우저→WSL 서버는 Windows 기준이다.
- 정확한 기본 키 조합과 OS별 keybindings schema는 구현 때 사용자와 논의한 후 정한다. cmux의 조작을 참고하되 브라우저 예약키와 터미널 프로그램 입력을 보존한다. Cmd→Ctrl 단순 치환을 확정하지 않는다.
- Web 일반 테마는 localStorage에 system/light/dark 선택을 저장한다. system은 OS 테마를 따르며 터미널 theme과 별개다.

**저장 책임**

| 대상 | 저장 |
| --- | --- |
| 사이드바 너비 | 전역 config |
| 터미널 폰트·색상·키 설정, 사용자 단축키 | 전역 config |
| Host 초기 layout 기본값 | 전역 config |
| Host별 초기 layout | YAML·CLI |
| 실행 중 터미널·분할 비율·탭 순서·선택 상태 | 서버에서 유지·복원 |
| Web 테마 system/light/dark | localStorage |

브라우저를 닫아도 실행은 유지하고 다시 열면 기존 터미널 화면·배치·놓친 알림으로 복귀한다. 설정 저장과 실행 화면 복원은 다른 책임이며 사이드바 너비를 DB에 중복 저장하지 않는다. 알림 전체 읽음과 실제 승인·질문 해결의 구분은 기존 알림 정책을 따른다.

참고 근거: [cmux 영역·탭 개념](https://cmux.com/docs/concepts), [분할 UX](https://manaflow-ai-cmux.mintlify.app/features/splits-and-panes), [단축키](https://cmux.com/docs/keyboard-shortcuts), [Paseo 현재 영역에 터미널 추가 테스트](https://github.com/getpaseo/paseo/blob/main/packages/app/e2e/browser/direct-terminal-shortcut-pane-placement.spec.ts). 문서·소스 조사 근거이며 AIOX 구현 또는 해당 테스트 실행 완료를 뜻하지 않는다. cmux의 초기 배치 정책을 복제했다는 뜻도 아니다.



운영 Web은 React, Tailwind, shadcn/ui, i18n을 사용한다. 모델 선택·slash command·질문·승인·quota UX는 실제 TUI를 유지한다. Web에서 별도 vendor UX를 복제하지 않는다.

terminal theme/font는 xterm renderer에 적용한다. 외부 cmux·일반 터미널·VS Code의 appearance까지 바꾸는 요구가 아니다. vendor가 명시적으로 그리는 모든 색상을 바꿀 수 있다고 보장하지 않는다. 폰트 변경 때 fit/resize를 처리하고 AIOX 단축키와 vendor의 Ctrl+O·브라우저 예약 키를 구분한다.

브라우저 복귀:

```text
Web 닫힘 → attachment만 해제 → Claude/Codex/PTY 계속 실행
Web 재방문 → 살아 있는 Server에 자동 연결
→ 기존 Host·Agent·pane 배치·각 terminal의 현재 화면·미확인 알림 표시
```

새 vendor 프로세스를 띄우거나 닫기 직전 이미지로 돌아가는 것이 아니다. 작업 중·idle·완료·승인 대기 모두 현재 화면으로 돌아온다. 재방문에 사용자 로그인·token 입력 절차를 요구하지 않는다. 내부 연결 보호는 이 자동 UX에 맞춰 구현한다. server 재시작 후 프로세스 재attach·자동 실행·message replay는 별도 요구다.

**공통 터미널의 화면 유지·복원**

이 화면 관리·복원 경로는 daemon 소유 AIOX 터미널에 적용한다. 외부 `agent run`은 사용자 터미널 입출력을 사용하므로 AIOX PTY·headless·xterm·SerializeAddon 경로를 거치지 않는다. 공통 터미널은 서버의 PTY와 세션당 하나의 xterm headless로 실행과 화면 상태를 유지하고, 브라우저 xterm으로 화면을 표시하고 입력을 전달한다. 일반 shell과 터미널 프로그램에 공통으로 적용하며 Claude 전용 처리가 아니다. 여기서 headless는 터미널 VT 상태 엔진으로, 제외한 LLM headless 실행과 다르다. Ghostty는 구현 원리의 참고 대상이며 현재 서버·브라우저 터미널 엔진은 xterm이다.

```text
서버 — PTY 세션마다
├─ PTY: shell·Claude·Codex 등 프로그램 실행·바이트 입출력
├─ xterm headless: 화면·커서·모드·크기 유지
└─ 복원 처리: SerializeAddon + 누락 상태 보완
                         ↕ WebSocket
브라우저
└─ xterm: 화면 렌더링·키보드와 마우스 입력
```

```text
PTY 출력 → 서버 상태 갱신 → 같은 경계의 snapshot·보류 출력 확보
Web 접속 → snapshot 크기 적용 → 화면 파싱·상태 보완
         → 보류 출력·resize 재생 → 이후 출력·resize·exit 처리
         → 현재 pane 크기 요청
```

복원은 최근 64KiB raw 출력 재생을 대체한 SerializeAddon의 화면 바이트와 누락 상태 보완 데이터를 함께 사용한다. 화면·현재 커서뿐 아니라 저장 커서·문자 속성·문자 집합·스크롤 영역·탭 위치·입력 모드 등을 복원해 이후 프로그램의 출력과 입력도 정상적으로 이어져야 한다. xterm이 이미 관리하는 실제 상태를 활용하며 내부 접근은 고정 vendor 버전과 복원 회귀 검사로 관리한다.

공통 attachment가 snapshot과 이후 이벤트의 누락·중복 없는 순서를 책임진다. snapshot 크기로 화면 파싱과 상태 보완을 마친 뒤 현재 pane 크기를 요청하며, 서버 PTY·미러·브라우저는 같은 resize 순서를 따른다. 복원 중 과거 조회에서 발생한 자동응답은 현재 PTY 입력으로 전달하지 않는다. 정상 live 조회 응답과 사용자 입력은 별도로 유지한다.

미완성 UTF-8·제어 시퀀스는 xterm의 parser·decoder를 재사용해 안전한 경계의 snapshot과 보류 출력·resize로 이어서 복원한다. 시퀀스가 끝날 때까지 접속을 기다리는 방식이 아니다. 미완성 출력의 보관 한도를 넘으면 새 화면 복원만 이유를 표시하고 일시 거절한다. 기존 PTY·viewer는 유지하며 안전한 경계로 돌아오면 새 복원을 다시 허용한다. 정상적인 연속 출력이나 단순 청크 분할을 이 오류로 취급하지 않고, 잘린 데이터를 정상 snapshot으로 보내지 않는다.

브라우저 연결 해제는 PTY 종료가 아니다. Stage 2-1은 공통 복원 기반을 완료했고, Stage 6는 이를 React 운영 UI·탭·분할·배치 복귀에 통합한다. React가 서버의 VT 상태 엔진을 대체하지 않는다.

구조와 구현 근거는 [터미널 architecture](../../docs/architecture/aiox-storage-terminal.md), 복원 거절·회복 등 외부 동작은 [Web spec](../../docs/specs/aiox-configuration-web.md), 검증 경위와 한계는 [Stage 2-1 로그](../2026-09-10-AIOX-TUI-Stage2-1-Terminal-Snapshot.md)를 따른다.

알림:

- 목록에서 클릭하면 해당 terminal로 이동하고 읽음 처리해 미확인 목록에서 제거한다.
- 전체 알림 확인은 현재 미확인 항목을 모두 읽음 처리한다.
- 읽음은 실제 승인·질문·실패 해결과 다르다. 사용자 응답은 TUI에서 한다.
- 활성 브라우저 창·활성 탭에서 terminal A에 실제 focus 중이면 A의 팝업·소리·미확인 항목을 억제한다.
- B에 focus 중이거나 브라우저가 background이면 A 알림을 남긴다. 선택된 pane이라는 이유만으로 읽음 처리하지 않는다.
- Web이 닫혀 있으면 서버가 알림을 유지하고 재방문 때 보여 준다.
- 여러 알림이 짧게 몰리면 개별 항목은 보존하고 소리는 한 번 울리는 방향이다. 묶음 시간과 multi-tab 소리 주체는 해당 단계에서 정한다.
- 짧은 차임·Web Audio·볼륨·미리 듣기는 후보이며 확정 음원은 없다. Web이 닫혀도 OS 소리를 내는 native 알림은 자동 추가하지 않는다.

## 16. 단계별 라이브러리 채택과 설치

### Server / daemon 단계

서버·daemon은 `node:http`, `ws`, 공식 MCP TypeScript SDK, Zod, `node-pty`, TypeORM, `better-sqlite3`를 채택한다. 별도 HTTP framework·event bus·추상화를 미리 추가하지 않는다. TypeORM 도입과 첫 배포 전·후 DB 변경 정책은 앞의 저장 계약을 따른다. 실제 설치 단계에 Node >=22.12.0·SDK 호환성·지원 OS/CPU를 확인해 버전을 선택하며 채택과 설치·통합 검증 완료를 구분한다. YAML parser와 Web 세부 의존성은 실제 사용하는 단계에서 정한다.

Stage 2-1의 서버 터미널 의존성은 `@xterm/headless` 6.0.0과 `@xterm/addon-serialize` 0.14.0이다. 이는 현재 채택·설치된 조합이며 영구 고정 제품 요구가 아니다. 업데이트 때 누락 상태 보완과 복원 회귀 검사를 함께 확인한다.

### Web 단계

브라우저 터미널은 `@xterm/xterm` 6.0.0을 사용하며 §15의 서버 복원 기반을 소비한다. React·Tailwind·shadcn/ui·다국어 요구는 유지한다. Vite, use-intl, 추가 xterm addon, Zustand, TanStack Query, keybinding·audio 도구의 실제 필요와 역할을 논의한다.

- Zustand는 여러 pane/설정/알림이 공유하는 상태가 실제로 필요할 때 선택한다.
- TanStack Query는 조회·pagination·검색 cache가 필요할 때 선택한다.
- Gateway snapshot/event와 여러 store가 같은 서버 상태를 중복 소유하지 않는다.
- i18n은 UI·AIOX 오류 설명을 대상으로 하고 vendor 출력 원문을 무조건 번역하지 않는다.
- 선택지 설명은 “이 기능에 왜 필요한가, 기존 수단으로 가능한가, 추가 비용은 무엇인가”를 중심으로 한다.

### 기반 개발 도구

현재 작업 규칙은 TypeScript, tsup build, tsc --noEmit, Vitest, oxlint, oxfmt다. 패키지 내부 `@/*`는 `./src/*`, 패키지 간 import는 공개 entry를 사용한다. 테스트는 대상 파일 옆에 같은 이름의 `.test.ts(x)`로 둔다. 구조를 위해 빈 package·interface·factory를 선생성하지 않는다.

### 공개 사이트 단계

운영 Web과 공개 사이트는 별도 앱이다. site는 소개·설치·사용법·설계 설명을 다국어로 제공한다. Next.js + next-intl·정적 export는 후보이며 마지막 단계에 선택한다. 공개 사이트 때문에 운영 Web을 Next.js로 바꾸지 않는다.

## 17. 대표 사용자 시나리오

1. 사용자가 daemon을 시작하고 persistent Network를 만든다. Claude와 Codex를 각각 agent run으로 같은 Network에 실행한다. runtime별 MCP/token/instruction이 주입되고 route에 따라 협업한다.
2. 사용자가 aiox.yaml로 Host를 실행한다. Agent들은 같은 workspace와 해당 Host 전용 Network를 사용한다. 다른 Host의 같은 이름 Agent와 섞이지 않는다.
3. 사용자가 같은 YAML을 --name과 --worktree로 다시 실행한다. 기존 Host와 별도 workspace·Network·Runtime으로 표시된다.
4. Claude가 send를 호출한다. daemon은 token으로 source를 확정하고 route를 검사한 뒤 Codex의 활성 thread에 toolOutput 본문과 additionalContext 메타데이터를 주입한다.
5. Codex가 send를 호출한다. daemon은 Claude inbox에 peer 메시지를 넣는다. idle이면 턴이 시작되고 compact preview가 보인다. UserPromptSubmit/Stop으로 입력과 응답 종료를 연결한다.
6. Agent는 agents_list의 agentId를 골라 send한다. 단방향 완료·실패와 양방향 실패는 daemon이 원 발신자에게만 알리고, 양방향 대화상 회신은 send를 사용한다. interrupted 자동 알림과 재전송 도구는 없다.
7. 사용자가 route를 변경하면 같은 MCP URL에서 다음 send·agents_list에 적용된다. 실행 중 Network 소속은 바꾸지 않는다.
8. 다른 terminal에서 승인이 필요하면 알림을 누르고 해당 TUI에서 응답한다. 이미 보고 있는 terminal의 알림은 중복으로 울리지 않는다.
9. Web을 닫아도 실행은 계속된다. 다시 열면 같은 terminal의 현재 화면과 배치·놓친 알림이 나타난다.
10. 전역 설정의 terminal appearance·keyboard는 실행 중 반영하고 shell/args/cwd는 새 일반 Web shell에, 포트는 다음 daemon 시작에 적용한다. 저장 때문에 기존 실행을 종료하지 않는다.
11. host stop은 소유 실행을 종료·정리하고 Worktree를 남긴다. daemon 일반 stop은 실행 환경별 정책을 적용하며 force는 daemon 소유 실행을 종료한다. 외부 CLI 소유 실행은 두 경우 모두 유지하고 협업만 해제한다.
12. vendor 업데이트·준비 실패는 실행 실패로 명확히 표시한다. 사용자가 처리 후 다시 실행하며 AIOX가 자동 업데이트·재실행을 복잡하게 조율하지 않는다.

## 18. 구현 순서와 남은 논의의 위치

이 순서는 기억할 구현 흐름이며 이 세션에 구현을 시작하라는 지시가 아니다.

| 단계 | 목표 | 해당 시점 논의 |
| --- | --- | --- |
| 0 | TUI 제품 기준선·새 설계 정리 | 방향 결정 완료 |
| 1 | domain·package·전역 설정·SQLite·CLI 기반 | 필요한 최소 domain, 저장·설치 경계 |
| 2 | daemon·공통 HTTP MCP·Network/route·Gateway·PTY·최소 Web | 채택한 MCP·TypeORM·알림 계약 구현 경계, CLI 포트 연결 |
| 2-1 | 공통 PTY·xterm의 headless·serialization 기반 복원 | 기반 구현 완료. 구조·예외 정책은 §15, 검증 한계는 Stage 2-1 로그 참조 |
| 2-2 | 명령·실행 위치별 소유권과 외부 독립 수명·공통 vendor 경계 | W1~W5 완료. Stage 3에서 소비하며 Codex·Host 실구현과 전 OS 검증은 후속 단계 |
| 3 | Claude 실행·inbox·hooks·상태·종료 | hidden path 신규 통합, Windows token, 관측 경계 |
| 4 | Codex App Server·Relay·두 vendor 왕복 | toolOutput+additionalContext 구현·E2E, 실패하면 그 다음 방식 |
| 5 | Host·Worktree·CLI 운영 | Git Worktree 생성·재사용·충돌과 종료 보상 |
| 6 | 운영 Web·복귀·배치·i18n·설정·키 | Stage 2-1 기반의 React·탭·분할·배치 복귀 통합, Web 상태 책임과 UX |
| 7 | 상태·알림·읽음·포커스·소리 | 실제 status 매핑·UI, 소리 묶음·multi-tab |
| 8 | 3 OS/WSL·npm 산출물 통합 검증 | 실제 배포·실행·정리 증거 |
| 9 | 공개 다국어 사이트 | 최종 framework/i18n·콘텐츠 |

OS 경계는 마지막에 처음 확인하는 것이 아니다. DB는 기반 단계, PTY는 서버 단계, vendor 경계는 해당 adapter 단계에 확인하고 마지막에 통합한다. 최소 Web은 연결 검증을 위한 것이며 운영 UI 전체를 기다려 vendor 연동을 미루지 않는다.

Stage 2-2는 공통 실행 소유권·vendor 경계, Web shell 설정·사전 검증과 OS별 종료 작업을 마감했다. Windows/WSL shell 실측과 OS별 CI 범위는 [Stage 2-2 기록](../2026-09-11-AIOX-TUI-Stage2-2-Execution-Ownership.md)을 따른다. 이후 외부 실행 유지 범위의 교정은 [Stage 2-3](../2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md) W1에서 완료했으며, 별도 처리·복구 경계 개선을 이어간 뒤 Stage 3 W1로 복귀한다. 과거 외부 종료 테스트 성공을 현재 외부 생존 정책의 검증으로 승계하지 않는다. 실제 vendor 메시지 E2E와 추가 OS 통합은 Stage 3, Codex TUI·Relay·App Server는 Stage 4, Host 실행은 Stage 5 범위다.

남은 논의를 한꺼번에 사용자에게 질문하지 않는다. MCP 응답 포장·실제 관측 연결과 채택 의존성 버전은 해당 통합 단계에서 확인하고 Web 의존성은 Web 단계에서 논의한다. 현재의 제품 경계와 성공한 실험을 미결로 되돌리지 않는다.
