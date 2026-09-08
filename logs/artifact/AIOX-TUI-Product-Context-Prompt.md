# AIOX 제품·아키텍처·결정 기억용 프롬프트

기준일: 2026-09-08. 이 문서는 AIOX에 관한 사용자와의 대화, 제품 요구, 설계 결정, 실험 결과와 남은 논의를 새 Codex 세션에 전달하는 독립적인 문맥이다. 구현 완료 보고서가 아니다.

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
- 공통 HTTP MCP를 통한 send/reply/agents_list.
- CLI, standalone Agent, 선언형 Host, 단일 Network, route, Git Worktree.
- React 운영 Web, 실제 터미널, 상태·알림, 전역 설정, SQLite, 브라우저 복귀.
- Windows 네이티브·Linux·macOS 지원. WSL 실행은 별도 환경 경계로 구분한다.
- 공개 다국어 AIOX 사이트는 실제 제품 이후 마지막 단계다.

제외 범위:

- Headless agent 제품, Claude Agent SDK, `-p` 실행, vendor UX 전체 복제.
- 현재 단계에서 ACP·NDJSON·다른 vendor 전수 조사·통합.
- Claude custom Channel, development-channel 실행, Channel fallback.
- 같은 메시지의 수동·자동 재전송/재주입.
- 실행 중 Network join/leave와 다중 Network 소속.
- 과거 CLI alias와 폐기된 구현을 위한 호환 계층.

기존 구현이 덜 끝났다는 이유로 새 요구를 그 구조에 맞추지 않는다. 새로 만드는 프로젝트라는 전제다. 재사용은 실제로 유효한 경우에만 한다.

## 3. 전체 구성과 책임

```text
사용자
├─ 일반 터미널의 AIOX CLI
└─ React 운영 Web
       │ HTTP / WS / terminal attachment
       ▼
AIOX daemon — 로컬 Node.js 서버
├─ Gateway — 명령·snapshot·event·알림 중계
├─ Controllers
│  ├─ StandaloneAgentController
│  └─ HostController
├─ Runtime Credential Registry
├─ 공통 HTTP MCP — send / reply / agents_list
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

- Controller owns execution: 언제 실행·중단·정리할지 판단한다.
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
  └─ Terminal / PTY

Vendor conversation: /clear, /resume 등에 따라 변경 가능
Terminal / PTY: 터미널 실행 자원
Web attachment: 브라우저가 해당 터미널을 보는 연결
```

AgentRuntime은 PID 하나와 동일하지 않다. Codex Runtime에는 TUI·App Server·Relay가 함께 속할 수 있다. 브라우저 연결이 끊어져도 Runtime과 PTY는 유지한다.

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
   │  ├─ messaging/{message,delivery,reply}.ts
   │  └─ terminal/terminal-id.ts
   ├─ application/src/{agent,host,network,messaging,ports}
   ├─ adapter-sdk/
   ├─ adapters/{claude,codex}/
   ├─ terminal/
   ├─ persistence/src/{sqlite,repositories}
   ├─ protocol/
   ├─ config/
   └─ ui/ — 실제 공유 UI가 필요할 때
```

domain은 제품 규칙을 소유하며 React·HTTP·SQLite·PTY·vendor 호출에 의존하지 않는다. application은 실행·등록·전달·정리 유스케이스를 조율한다. daemon이 application과 adapter·terminal·persistence를 조립한다. Web과 CLI는 daemon의 코드를 직접 가져다 실행하는 것이 아니라 공개 통신 계약으로 연결한다.

파일 목록은 모든 파일을 미리 생성하라는 지시가 아니다. AgentRuntime 모델을 agent/runtime과 별도 runtime 디렉터리에 중복 소유하지 않는다. adapter-sdk와 application port도 같은 계약을 중복 정의하지 않는다. Node PTY와 브라우저 xterm은 실행 환경을 분리한다. 공통 wire는 protocol에, Web 전용 TerminalPane·HostSidebar 등은 Web features에 둔다.

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

### Codex 실행 주입

```sh
codex app-server \
  -c 'developer_instructions="AIOX instructions..."' \
  -c 'mcp_servers.aiox.url="http://127.0.0.1:4500/mcp/network-123"' \
  -c 'mcp_servers.aiox.bearer_token_env_var="AIOX_MCP_TOKEN"' \
  -c 'mcp_servers.aiox.required=true'
```

AIOX는 App Server child env에 token을 전달한다. `bearer_token_env_var`에는 변수 이름만 둔다. config 키 `developer_instructions`와 RPC 필드 `developerInstructions`는 다르다. TOML 문자열 escaping을 적용한다. `required=true`의 MCP 초기화 실패 처리와 AIOX Runtime cleanup은 별개다. listen·TUI·Relay 연결은 binding이 구성한다.

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
| correlated MCP reply | 원 요청에 대한 협업 회신 |
| 실제 결과 검토 | 작업 성공 판단 |

`입력 → reply → 추가 작업 → Stop`도 가능하다. reply와 응답 종료를 필수 순차 상태로 묶지 않는다. Stop은 작업 성공·MCP reply 성공·파일 변경 성공·프로세스 종료와 다르다.

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

agent list와 MCP agents_list에는 `status` 필드를 둔다. 모델 자기보고가 아니라 daemon 관측 snapshot이다. lifecycle/readiness/activity를 구분하는 의미는 유지하지만 정확한 enum과 Web 배지·색상은 해당 단계에서 논의한다. herdr의 상태 UI는 Web 설계 시 비교 대상으로 다룬다.

## 9. MCP 도구·메시지 정책

확정한 도구 역할:

- `send`: 현재 outbound route가 허용하는 Agent에 메시지를 전달한다. A→B, A→C이면 일반 send는 B·C로 fan-out한다.
- `reply`: 원 요청과 인증된 회신자를 연결해 원 발신자에게 회신한다. 일반 fan-out과 다르다.
- `agents_list`: 현재 source→target route가 허용하는 Agent만 status와 함께 반환한다.

Web은 Network 전체 Agent·route를 표시한다. 일반 CLI agent list의 조회·필터와 MCP discovery 범위는 다르다. 과거 agents_list 결과를 현재 전송 권한으로 쓰지 않고 매 send마다 검증한다.

```text
Daemon 내부:
Runtime/source/target, Network/route, message/delivery ID,
reply 연결, vendor prompt/turn 연결, 전송 결과

모델에 전달할 내용:
발신자, 본문, 필요한 연결 ID, 회신 필요 여부·방법
Codex: toolOutput 본문 + additionalContext 메타데이터
```

`replyExpected=false`는 회신 불필요다. 보내는 Agent는 상대 종료·회신·ACK를 기다리거나 추가 확인할 필요가 없다. 단 send 접수/전송 시도 실패는 일반 tool 반환으로 알려 준다. 내부 관측까지 없애는 뜻이 아니며 false에도 상관관계 ID가 필요할 수 있다.

`replyExpected=true`는 회신을 원 요청과 연결한다. reply 횟수·중복·route 변경 뒤 지연 reply 권한은 상세 논의 대상이다. false를 과거 one-reply permission과 같은 뜻으로 바꾸거나 `isReplyTrue` alias를 추가하지 않는다.

삭제할 것은 retransmit 전용 tool/schema/handler/API와 같은 메시지의 자동·수동 재주입 및 그 사용 지침이다. 공통 협업 지침과 Agent/Host instruction은 유지한다. 아직 한 번도 전송하지 않은 메시지의 최초 queue는 재전송과 다르다. 새 send는 새 메시지다. DB 저장이 replay 허가를 뜻하지 않는다. 확인 불가를 성공으로 감추지 않는다.

### 해당 구현 단계에서 사용자와 논의할 MCP 정의

MCP를 실제 정의·구현하는 단계에서 사용자와 도구 계약을 논의한다. 지금 이름과 역할이 정해졌다고 세부 schema·handler 의미까지 확정됐다고 하지 않는다.

논의할 항목은 입력·반환 필드, type/intent 필요 여부, fan-out 결과·부분 실패 반환, reply 상관관계·횟수·route 변경과의 관계, status 값, 공통 tool description·instructions와 모델에 전달할 최소 메타데이터다. 이미 확정한 단일 Network·route 필터·replyExpected=false·재전송 제거는 다시 선택 과제로 만들지 않는다.

## 10. Host·Network·routing·Worktree

Host는 하나의 workspace를 사용하는 Agent 실행 묶음이자 namespace다. Network는 통신 경계다. Host와 Network를 같은 객체로 만들지 않는다. standalone을 가짜 local Host에 넣어 실행 머신과 Host 실행을 혼동하지 않는다.

| Network 종류 | 정의 권위 | 수명·범위 |
| --- | --- | --- |
| Persistent | daemon DB의 지속 정의 | daemon 전체, 명시 delete까지 |
| Host-managed | aiox.yaml | 해당 Host 실행 동안, host-scoped |

Network에 속하는 Agent 수와 Host가 실행하는 Agent 수에 AIOX의 고정 숫자 상한을 두지 않는다. 사용자는 100개·1,000개 이상도 계속 추가할 수 있으며 숫자만으로 등록을 거절하지 않는다. 실제 실행의 자원 부족·vendor 제한은 해당 실패로 보고한다. 이는 Agent당 Network 최대 1개·Host당 Network 1개 계약과 별개다.

Agent당 동시 소속은 하나, Host manifest의 Network도 하나다. YAML `networks` map 표기는 유지하지만 현재 항목은 하나만 허용한다. join/leave·실행 중 소속 변경·external persistent Network 참조는 제외한다. YAML agents 목록은 최초 membership 선언이므로 유지한다.

서로 다른 Host에서 같은 Agent/Network 이름을 쓸 수 있다. 내부 key는 hostRuntimeId 또는 networkId로 구분한다. 실행 중 Host 이름은 daemon 범위에서 유일하며 `/`는 qualified name 구분자로 예약한다. 이름이 모호하면 ID 또는 host-qualified 이름을 요구하고 후보를 보여 준다.

```text
H1 / reviewer / feature-a  ≠  H2 / reviewer / feature-a
같은 YAML을 실행해도 Runtime·credential·Network는 분리
```

Persistent routing은 explicit directed edge, 없으면 Network default를 따른다. 생성 기본값은 allow다.

Host routing 우선순위:

```text
Runtime edge override
→ Manifest edge
→ Runtime default override
→ Manifest default
```

between은 자기 자신을 제외한 양방향 clique다. from/to는 단방향이다. reset은 해당 override를 제거한다. Host edge reset은 manifest edge로 돌아갈 수 있다. default deny가 manifest의 explicit allow를 지우지는 않는다. 조회 시 effective policy와 출처를 표시한다.

YAML은 reference 검증·directed edge 확장·allow/deny 충돌 검증을 부수효과 전에 한다. runtime CLI는 같은 edge의 현재 override를 교체한다. 한 route 명령은 한 종류의 변경만 수행한다. `--to`는 from 계열과 함께 써야 한다. Host route 변경은 YAML을 수정하지 않고 Host 재실행 시 사라진다.

### Worktree

```sh
aiox host run --path ./aiox.yaml --name development
aiox host run --path ./aiox.yaml --name login --worktree feature/login
```

현재 작업 경로의 Git 저장소 여부를 확인하고 AIOX가 Git Worktree를 내부적으로 준비한다. 원래 경로 Host와 Worktree Host는 별도 실행 묶음이다. 한 Host 내부 Agent들은 같은 작업 경로를 사용한다. Agent마다 별도 Worktree를 자동 생성하지 않는다.

`--name`은 YAML host.name을 덮어쓴다. 같은 YAML을 별도 이름·workspace로 실행할 수 있다. Worktree 생성 위치·기준 commit·기존 branch/checkout 재사용·충돌 처리는 herdr 구현에서 유용한 방식을 검토해 해당 단계에 구체화한다. `.aiox/worktrees` 등 과거 경로 후보를 확정값으로 쓰지 않는다. Host 종료가 자동 merge·branch 삭제·Worktree 삭제를 뜻하지 않는다.

## 11. CLI 전체

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
│  ├─ create <name> [--default <allow|deny>]
│  ├─ delete <network>
│  ├─ list [--all] [--json]
│  ├─ show <network> [--json]
│  └─ route <network>
│     ├─ --default <allow|deny>
│     ├─ --allow-between <agents...>
│     ├─ --deny-between <agents...>
│     ├─ --reset-between <agents...>
│     ├─ --allow-from <agent> --to <agents...>
│     ├─ --deny-from <agent> --to <agents...>
│     └─ --reset-from <agent> --to <agents...>
├─ host
│  ├─ run
│  │  ├─ --path <aiox.yaml>
│  │  ├─ --name <host>
│  │  └─ --worktree <branch>
│  ├─ list [--json]
│  ├─ status <host> [--json]
│  ├─ stop <host>
│  ├─ agent
│  │  ├─ add <host>
│  │  │  ├─ --adapter <adapter>
│  │  │  ├─ --name <name>
│  │  │  ├─ --network <host-network>         # Host의 단일 Network
│  │  │  ├─ --role <role>
│  │  │  ├─ --description <description>
│  │  │  ├─ --instruction <instruction>
│  │  │  └─ -- <adapter-options>
│  │  ├─ stop <host> <agents...>
│  │  └─ remove <host> <agents...>
│  └─ network
│     ├─ list <host> [--json]
│     ├─ show <host> <network> [--json]
│     └─ route <host> <network>
│        ├─ --default <allow|deny>
│        ├─ --reset-default
│        ├─ --allow-between <agents...>
│        ├─ --deny-between <agents...>
│        ├─ --reset-between <agents...>
│        ├─ --allow-from <agent> --to <agents...>
│        ├─ --deny-from <agent> --to <agents...>
│        ├─ --reset-from <agent> --to <agents...>
│        └─ --json
├─ status [--json]
└─ doctor [--json]
```

- AIOX 옵션은 `--instruction` 단수. `--network` 반복은 거절한다. `--` 뒤는 adapter 인자다.
- `network list` 기본은 persistent, `--all`은 host-managed 포함. host-qualified show는 가능하지만 최상위 mutation은 persistent 전용이다.
- Host-managed route 변경은 `host network route`로 한다.
- standalone 실행은 foreground다. Ctrl+C·/exit 등 vendor 세션 종료를 사용한다. standalone 외부 stop/attach/detach 명령은 보류했다.
- Declared Agent는 현재 실행에서 stop할 수 있지만 remove는 불가하고 다음 Host 실행에 다시 생긴다.
- host agent add의 Ephemeral Agent는 manifest를 수정하지 않으며 stop/remove 가능하고 다음 Host 실행에 자동 복원되지 않는다.
- adapter setup 명령 표면이 존재해도 Claude의 사전 영구 MCP 등록을 다시 요구하지 않는다.
- Web 열기 명령의 정확한 이름, start에 넣을 포트 인자 이름과 agent list --all의 상세 범위는 CLI 구현 때 맞춘다.

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
- AIOX가 관리하는 MCP·credential·binding 설정과 사용자 인자의 충돌 처리는 adapter 구현 단계에서 구체화한다. 이 계약 추가는 YAML parser·launcher 구현 완료를 뜻하지 않는다.

```yaml
version: 1

host:
  name: feature-host

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

- `daemon stop`: 신규 등록을 막고 활성 실행 의존성이 있으면 거절한 뒤 running으로 복귀한다.
- `daemon stop --force`: AIOX 관리 Host·standalone·vendor·PTY·Relay·App Server 전체를 강제로 종료하고 daemon을 종료한다. 작업 중인 실행도 대상이다.
- 강제 종료는 관리 자원 종료 확인 후 credential·Network·DB 등을 정리한다. AIOX 밖에서 실행한 Claude/Codex를 프로세스 이름으로 찾아 죽이지 않는다.
- `daemon restart`는 safe stop + start. 활성 실행 때문에 거절되면 기존 daemon을 유지한다. restart --force는 제공하지 않는다.
- persistent Network·Worktree·이미 저장한 사용자 작업을 삭제하지 않는다.

과거 “force는 daemon만 종료하고 Agent는 생존” 계약은 폐기됐다.

업데이트 때문에 vendor가 준비되지 못하면 해당 실행 등록을 실패시키고 사용자가 업데이트 처리 후 다시 실행하는 단순 방향이다. Codex의 global update 후 “Please restart Codex” 종료가 관찰됐다. Claude background update가 매번 startup 실패를 뜻하지는 않는다. 안정된 update API·신호와 실패 매핑은 구현 때 좁게 확인한다. 자동 update orchestration·상세 진행 FSM·자동 Host 재실행을 추가하지 않는다.

## 14. 전역 설정·SQLite·플랫폼

설정은 프로젝트별이 아니라 모든 Host·standalone에 공통인 사용자 전역 설정이다. 실행 환경의 사용자 홈 아래 `.aiox/config.<확장명>`을 사용한다. npm 설치 디렉터리나 현재 프로젝트에 저장하지 않는다. Host YAML은 실행 선언이고 전역 설정과 별개다.

Baseline 시점의 JSON은 추천이었고, 이후 Stage 1 기록·구현에서는 JSON, daemon 4500/Web 4501, CLI override > 파일 > 기본값, better-sqlite3가 선택된 상태로 보고됐다. 이것을 모든 listener·CLI 인자·3 OS 제품 통합 완료로 확대하지 않는다. 이 문서는 현재 git 상태를 매번 추적하는 구현 진행표가 아니다.

| 저장 위치 | 책임 |
| --- | --- |
| 전역 설정 파일 | terminal 폰트·색상·theme·keyboard, daemon/Web 포트 |
| localStorage | Web 일반 dark/light theme |
| SQLite | 지속 Network·route, 메시지/회신 관계, 실행 이력, 알림·읽음, workspace 배치 |
| Server memory | 살아 있는 process·binding·credential·activity |

언어·소리 설정의 localStorage 저장, DB 파일명 `.aiox/aiox.db`, 메시지 본문 보존 여부·retention은 제안 또는 세부 논의 대상이다. vendor transcript·reasoning 전문 무제한 저장은 요구하지 않는다. DB의 running 이력만으로 현재 프로세스가 살아 있다고 판단하지 않는다.

설정 반영:

```text
Web 편집·미리보기 → 저장 → 검증 → 전역 파일 갱신 → 연결된 Web에 배포
외부 파일 편집·저장 → 감지·검증 → 같은 적용 경로
잘못된 설정 → 마지막 유효 설정 유지 + 오류 표시
```

- terminal appearance와 keyboard는 실행 중 반영한다.
- daemon/Web 포트는 다음 daemon 시작에 반영하고 “저장됨·재시작 후 적용”을 표시한다.
- 별도 `aiox config apply`를 요구하지 않는다.
- 설정 저장 때문에 daemon 자동 재시작·Agent 종료를 하지 않는다.
- daemon이 꺼져 있을 때 수정한 설정은 다음 시작에 검증한다.
- 동시 편집 충돌 처리와 변경 감지 방식은 구현 때 정한다.

SQLite는 동일 domain/schema/migration을 3 OS에서 사용한다. persistence 패키지가 접근하고 daemon이 연결을 소유한다. CLI·Web·adapter가 DB를 직접 수정하지 않는다. 파일 오류를 새 빈 DB로 우회하거나 자동 삭제하지 않는다. 필요 transaction과 migration, shutdown cleanup을 둔다. WAL 선택·pragma는 실제 필요에 따라 결정한다.

Windows native와 WSL은 실행 환경·홈·DB·path·IPC가 다르다. 같은 환경 안에 daemon·Node·Git·vendor를 두는 구성이 초기 제안이다. Windows daemon이 wsl.exe로 Linux vendor를 제어하는 혼합 실행은 자동 지원으로 약속하지 않는다. Windows 브라우저가 WSL Web에 접속하는 것은 별도 사례다.

Node/CPU/native dependency 조합의 실제 배포 설치·DB 로딩·PTY·vendor 실행·종료를 각 OS에서 확인해야 한다. Linux Docker 성공은 Windows 실측이 아니다. npm 전역 설치 산출물이 대상이며 개발 환경 실행만으로 배포 호환 완료라고 하지 않는다.

## 15. 운영 Web·브라우저 복귀·알림

운영 Web은 React, Tailwind, shadcn/ui, i18n을 사용한다. 모델 선택·slash command·질문·승인·quota UX는 실제 TUI를 유지한다. Web에서 별도 vendor UX를 복제하지 않는다.

terminal theme/font는 xterm renderer에 적용한다. 외부 cmux·일반 터미널·VS Code의 appearance까지 바꾸는 요구가 아니다. vendor가 명시적으로 그리는 모든 색상을 바꿀 수 있다고 보장하지 않는다. 폰트 변경 때 fit/resize를 처리하고 AIOX 단축키와 vendor의 Ctrl+O·브라우저 예약 키를 구분한다.

브라우저 복귀:

```text
Web 닫힘 → attachment만 해제 → Claude/Codex/PTY 계속 실행
Web 재방문 → 살아 있는 Server에 자동 연결
→ 기존 Host·Agent·pane 배치·각 terminal의 현재 화면·미확인 알림 표시
```

새 vendor 프로세스를 띄우거나 닫기 직전 이미지로 돌아가는 것이 아니다. 작업 중·idle·완료·승인 대기 모두 현재 화면으로 돌아온다. 재방문에 사용자 로그인·token 입력 절차를 요구하지 않는다. 내부 연결 보호는 이 자동 UX에 맞춰 구현한다. server 재시작 후 프로세스 재attach·자동 실행·message replay는 별도 요구다.

PTY 화면 상태·출력 유지와 재접속을 연결해야 한다. 단순 WS reconnect만으로 화면 복원을 보장하지 않는다. xterm headless/serialize 같은 터미널 구현 후보는 제외한 LLM headless 제품과 다른 개념이다.

알림:

- 목록에서 클릭하면 해당 terminal로 이동하고 읽음 처리해 미확인 목록에서 제거한다.
- 전체 알림 확인은 현재 미확인 항목을 모두 읽음 처리한다.
- 읽음은 실제 승인·질문·실패 해결과 다르다. 사용자 응답은 TUI에서 한다.
- 활성 브라우저 창·활성 탭에서 terminal A에 실제 focus 중이면 A의 팝업·소리·미확인 항목을 억제한다.
- B에 focus 중이거나 브라우저가 background이면 A 알림을 남긴다. 선택된 pane이라는 이유만으로 읽음 처리하지 않는다.
- Web이 닫혀 있으면 서버가 알림을 유지하고 재방문 때 보여 준다.
- 여러 알림이 짧게 몰리면 개별 항목은 보존하고 소리는 한 번 울리는 방향이다. 묶음 시간과 multi-tab 소리 주체는 해당 단계에서 정한다.
- 짧은 차임·Web Audio·볼륨·미리 듣기는 후보이며 확정 음원은 없다. Web이 닫혀도 OS 소리를 내는 native 알림은 자동 추가하지 않는다.

## 16. 라이브러리 선택은 해당 단계에서 논의

서버·daemon을 만드는 단계에서 사용할 라이브러리를 사용자와 논의한다. Web을 만드는 단계에서도 별도로 논의한다. 후보 목록이 있다는 이유로 사전 설치하거나 선택 완료로 간주하지 않는다. 이미 실제로 선택된 기반 도구는 현 상태와 이유를 설명하고 변경 필요가 있을 때 논의한다.

### Server / daemon 단계

논의 범위: HTTP/Gateway, WebSocket, HTTP MCP SDK와 transport, PTY, 입력 검증, YAML, SQLite 연동, 설정 변경 감지, process 종료·플랫폼 경계.

기존 후보는 Node 기본 모듈, ws, MCP SDK, node-pty, better-sqlite3, zod, yaml, commander다. Express/Fastify·ORM·event bus·추가 추상화를 자동 도입하지 않는다. 표준 기능·이미 선택된 의존성으로 해결되는지와 실제 구현 비용을 비교한다. 과거 alpha/beta 버전을 새 제품의 고정 버전으로 물려받지 않는다.

### Web 단계

React·Tailwind·shadcn/ui·다국어 요구는 유지한다. Vite, use-intl, xterm 관련 패키지, Zustand, TanStack Query, keybinding·audio 도구의 실제 필요와 역할을 논의한다.

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
6. 회신 불필요 메시지면 보내는 Agent가 상대 완료를 기다리지 않는다. 회신이 필요하면 MCP reply가 원 요청과 연결된다. 재전송 도구는 없다.
7. 사용자가 route를 변경하면 같은 MCP URL에서 다음 send·agents_list에 적용된다. 실행 중 Network 소속은 바꾸지 않는다.
8. 다른 terminal에서 승인이 필요하면 알림을 누르고 해당 TUI에서 응답한다. 이미 보고 있는 terminal의 알림은 중복으로 울리지 않는다.
9. Web을 닫아도 실행은 계속된다. 다시 열면 같은 terminal의 현재 화면과 배치·놓친 알림이 나타난다.
10. 전역 설정을 저장하면 terminal/keyboard는 반영되고 포트는 다음 시작에 적용된다. 저장 때문에 실행을 종료하지 않는다.
11. host stop은 소유 실행을 종료·정리하고 Worktree를 남긴다. daemon stop은 활성 실행이 있으면 거절하며 --force는 관리 실행 전체를 종료한다.
12. vendor 업데이트·준비 실패는 실행 실패로 명확히 표시한다. 사용자가 처리 후 다시 실행하며 AIOX가 자동 업데이트·재실행을 복잡하게 조율하지 않는다.

## 18. 구현 순서와 남은 논의의 위치

이 순서는 기억할 구현 흐름이며 이 세션에 구현을 시작하라는 지시가 아니다.

| 단계 | 목표 | 해당 시점 논의 |
| --- | --- | --- |
| 0 | TUI 제품 기준선·새 설계 정리 | 방향 결정 완료 |
| 1 | domain·package·전역 설정·SQLite·CLI 기반 | 필요한 최소 domain, 저장·설치 경계 |
| 2 | daemon·공통 HTTP MCP·Network/route·Gateway·PTY·최소 Web | MCP tool 정의와 server/daemon 라이브러리, CLI 포트 연결 |
| 3 | Claude 실행·inbox·hooks·상태·종료 | hidden path 신규 통합, Windows token, 관측 경계 |
| 4 | Codex App Server·Relay·두 vendor 왕복 | toolOutput+additionalContext 구현·E2E, 실패하면 그 다음 방식 |
| 5 | Host·Worktree·CLI 운영 | Git Worktree 생성·재사용·충돌과 종료 보상 |
| 6 | 운영 Web·복귀·배치·i18n·설정·키 | Web 라이브러리, state 책임, 화면 복원 UX |
| 7 | 상태·알림·읽음·포커스·소리 | 실제 status 매핑·UI, 소리 묶음·multi-tab |
| 8 | 3 OS/WSL·npm 산출물 통합 검증 | 실제 배포·실행·정리 증거 |
| 9 | 공개 다국어 사이트 | 최종 framework/i18n·콘텐츠 |

OS 경계는 마지막에 처음 확인하는 것이 아니다. DB는 기반 단계, PTY는 서버 단계, vendor 경계는 해당 adapter 단계에 확인하고 마지막에 통합한다. 최소 Web은 연결 검증을 위한 것이며 운영 UI 전체를 기다려 vendor 연동을 미루지 않는다.

남은 논의를 한꺼번에 사용자에게 질문하지 않는다. 특히 MCP 세부 계약은 MCP 구현 단계, daemon/server 의존성은 서버 단계, Web 의존성은 Web 단계에서 사용자와 논의한다. 현재의 제품 경계와 성공한 실험을 미결로 되돌리지 않는다.
