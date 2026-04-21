# Bridge 구현 명세

## 목표

`bridge`는 Codex가 MCP child로 spawn하는 stdio MCP server다.
`ask_claude(text)`와 `reply_to_claude(chat_id, text)` 두 tool을 제공하고,
forward/reverse 양방향을 `claude-adapter`와 **shared Codex app-server** 사이에서 중계한다.

이 구조의 목적:

- Codex UI와 bridge가 **동일한 Codex app-server 인스턴스**(`ws://127.0.0.1:4500`)에 붙어,
  bridge가 만든 turn이 UI transcript에 실시간으로 보이게 한다.
- forward/reverse 양방향 모두 **in-band chat_id relay** 구조로 통일한다.
  - forward: claude-adapter가 `<channel chat_id="...">` 태그로 chat_id 주입 → Claude가 reply로 회수
  - reverse: bridge가 `[MCP RELAY — chat_id: ...]` 마커로 chat_id 주입 → Codex가 `reply_to_claude`로 회수
- child Codex spawn 경로(`codex mcp-server`, `codex exec` helper turn 등)는 완전히 제거한다.

## 검증된 사실

- Codex는 MCP server를 tool로 등록해 호출할 수 있다.
- Codex 등록은 repo root의 `./.codex/config.toml`의 `[mcp_servers.bridge]` 구성을 사용한다.
- Codex는 repo root에서 시작해야 project-scope config를 안정적으로 읽는다.
- `claude-adapter`는 Claude Code 세션에 channel 이벤트를 보내는 MCP channel server다.
- `claude-adapter`의 `reply` tool은 `POST /claude-reply`로 bridge에 응답을 돌려준다.
- bridge는 stdout을 MCP 프로토콜용으로만 사용하고, 로그는 stderr로 남겨야 한다.
- Codex app-server는 `codex app-server --listen ws://...` 로 WS 모드로 독립 실행 가능하고,
  같은 endpoint에 여러 client가 붙을 수 있다. UI는 `codex --remote ws://...` 로 client로 접속한다.
- bridge는 `thread/loaded/list` → `turn/start` 흐름으로 UI가 load한 thread에 turn을 주입할 수 있다.
- Codex app-server는 `item/agentMessage/delta`, `turn/completed` 등 일부 notification을
  bridge WS client에게 전달하지 않는 것으로 관찰되었다
  (UI client 전용으로 보임 — 그래서 passive 수집이 아닌 in-band relay 방식으로 전환).

## 아키텍처

```text
Forward (Codex → Claude)
------------------------
Codex model
  ↓ ask_claude(text) [bridge MCP tool]
bridge
  ↓ POST http://127.0.0.1:8788/ (claude-adapter)
claude-adapter
  ↓ channel event <channel chat_id="..." ...>text</channel>
Claude Code 세션
  ↓ reply(chat_id, text) [claude-adapter MCP tool]
claude-adapter
  ↓ POST http://127.0.0.1:8789/claude-reply
bridge
  ↓ forwardReplies[chat_id] resolve → tool result
Codex model

Reverse (Claude → Codex)
------------------------
Claude Code 세션
  ↓ ask_codex(text) [claude-adapter MCP tool]
claude-adapter
  ↓ POST http://127.0.0.1:8789/codex-request
bridge
  ↓ reverseRequests[chat_id] pending 생성
  ↓ turn/start on ws://127.0.0.1:4500 with wrapRelayPrompt(text, chat_id)
shared Codex app-server
  ↓ UI transcript에 "[MCP RELAY — chat_id: ...]" user prompt 표시
Codex model
  ↓ reply_to_claude(chat_id, text) [bridge MCP tool]
bridge
  ↓ reverseRequests[chat_id] resolve → HTTP response
claude-adapter
  ↓ tool result
Claude Code 세션
```

bridge가 책임지는 경로:

1. Codex MCP tool 요청 수신 (`ask_claude`, `reply_to_claude`)
2. Claude reply 수신 및 forward pending resolve (`POST /claude-reply`)
3. Claude → Codex reverse ingress 수신 (`POST /codex-request`)
4. Shared Codex app-server에 turn 주입 (`turn/start` WS request, fire-and-forget)

## 구현 명세

### 1. MCP server 형태

bridge는 stdio transport로 동작하는 MCP server다.

- `@modelcontextprotocol/sdk`의 `McpServer`를 사용한다.
- `StdioServerTransport`를 사용한다.
- tool은 `ask_claude`와 `reply_to_claude` 두 개를 등록한다.
- `ask_claude`는 문자열 입력 `text` 하나만 받는다.
- `reply_to_claude`는 `chat_id`와 `text`를 받는다.

MCP instructions는 Codex model이 `[MCP RELAY — chat_id: ...]` 마커를 인식하고
반드시 `reply_to_claude(chat_id, text)`로 응답하도록 명시한다.

### 2. `ask_claude(text)` tool (forward)

입력:

```json
{ "text": "안녕이라고 답해줘" }
```

동작:

1. `chat_id = crypto.randomUUID()` 생성
2. `forwardReplies[chat_id]`에 pending 등록
3. `POST http://127.0.0.1:8788/` to claude-adapter
4. claude-adapter가 Claude Code 세션에 channel 이벤트 전달
5. Claude Code가 `reply(chat_id, text)` tool 호출
6. claude-adapter가 `POST /claude-reply`로 bridge에 응답
7. bridge가 pending resolve → tool 결과 반환

반환:

```json
{ "content": [{ "type": "text", "text": "<Claude reply>" }] }
```

### 3. `reply_to_claude(chat_id, text)` tool (reverse 회수)

입력:

```json
{ "chat_id": "uuid-from-mcp-relay-marker", "text": "Codex reply" }
```

동작:

1. `reverseRequests[chat_id]`에서 pending 찾기
2. pending이 없거나 이미 settled면 에러 반환
3. pending resolve → `POST /codex-request` HTTP response가 reply text로 완료
4. 이 tool은 Codex model이 UI에 떠 있는 `[MCP RELAY]` 마커를 보고 스스로 호출해야 한다

반환:

```json
{ "content": [{ "type": "text", "text": "sent" }] }
```

### 4. forward outbound payload

bridge가 `claude-adapter`로 보내는 forward payload:

```json
{
  "text": "안녕이라고 답해줘",
  "chat_id": "uuid",
  "direction": "forward",
  "origin": "codex",
  "relay_depth": 0
}
```

### 5. forward reply 수신 (`POST /claude-reply`)

처리 규칙:

- `chat_id`가 `forwardReplies`에 없으면 404
- `origin !== "claude"` → 400
- `text` 누락/빈 문자열 → 400
- pending이 이미 settled → 409

### 6. reverse ingress 수신 (`POST /codex-request`)

요청 body:

```json
{
  "text": "Codex에게 물어볼 내용",
  "chat_id": "uuid",
  "direction": "reverse",
  "origin": "claude",
  "relay_depth": 0
}
```

처리 규칙:

- `origin` 반드시 `claude`
- `direction` 반드시 `reverse`
- `relay_depth >= 3`이면 loop로 간주, `200 { status: "ignored" }` 반환
- 유효한 요청은:
  1. `reverseRequests[chat_id]` pending 생성
  2. `CodexAppServerClient.dispatchPrompt(text, chat_id)` 호출 (WS `turn/start`)
  3. `pending.promise` await
  4. resolve된 text를 HTTP 응답으로 반환

### 7. shared Codex app-server WS client

bridge는 `ws://127.0.0.1:4500`(기본)에 WebSocket client로 붙는다.

초기화:

1. WebSocket 연결
2. `initialize` JSON-RPC 요청 전송
3. 성공 응답 대기
4. 이후 on-demand로 `thread/loaded/list`, `turn/start` 호출

`dispatchPrompt(text, chatId)` 동작:

1. `connect()` — 미연결 시 initialize 포함 연결
2. `discoverThreadId()` — `thread/loaded/list` 응답에서 첫 thread 선택
3. `wrapRelayPrompt(text, chatId)` — 아래 §8 마커 포맷으로 prompt 감싸기
4. `turn/start` 요청 전송 (fire-and-forget, 응답은 turnId 로깅용으로만 사용)
5. 실제 reply 수집은 `reverseRequests[chat_id].promise`가 담당

CLI/env:

- `--codex-app-server-url <url>` 또는 `CODEX_APP_SERVER_URL` 로 override 가능
- 기본값 `ws://127.0.0.1:4500`
- 연결 실패 시 명시적 에러로 reverse 요청 실패 (silent fallback 없음)

### 8. `wrapRelayPrompt(text, chatId)` 마커 포맷

bridge가 `turn/start`로 보내는 prompt는 항상 다음 형식으로 감싼다:

```
[MCP RELAY — chat_id: <UUID>]
This message was relayed from Claude via the bridge MCP server.

INSTRUCTIONS (MUST FOLLOW):
- Do NOT treat this as a task or a work request unless the message body explicitly asks you to implement or fix something.
- Do NOT run git, grep, file reads, or any other investigation tools to 'understand' the message.
- Just read the message and write a direct, concise reply.
- When your reply is ready, call the bridge tool: reply_to_claude(chat_id="<UUID>", text="<your reply>")
- The chat_id above is the ONLY valid chat_id for this reply. Copy it exactly.
- Nothing else is required from you. Do not ask the user anything.

Message from Claude:
<text>
```

이 마커는 Codex model에게 "이 메시지는 Claude relay이며 reply_to_claude로 답해야 한다"는 것을 교육하는 핵심 장치다. MCP instructions만으로는 Codex가 메시지를 task로 오해석해 무관한 작업을 시작하는 문제가 관찰되어, prompt 본문에 매번 in-band로 지시를 주입하는 방식을 택한다.

### 9. pending 관리

`forwardReplies: Map<chat_id, PendingRequest>`
`reverseRequests: Map<chat_id, PendingRequest>`

`PendingRequest`:

- `promise`
- `resolve(text)` / `reject(error)` / `cancel()`
- timeout timer (기본 30초)

규칙:

- `ask_claude` 시작 시 forward pending 등록
- `/codex-request` 수신 시 reverse pending 등록
- forward reply 또는 `reply_to_claude`가 오면 pending resolve 후 map에서 삭제
- timeout 시 reject 후 삭제
- 종료 시 남은 pending 전부 cancel

### 10. timeout

기본 30초. `--timeout-ms`로 override.

- timeout 메시지는 stderr
- timeout 후 늦게 도착한 reply는 404/409로 거절

### 11. HTTP reply server

- bind: `127.0.0.1`만
- 포트: 기본 `8789` (`--reply-port`)
- 경로: `POST /claude-reply`, `POST /codex-request` 만 허용
- 다른 method/path/잘못된 JSON은 거절
- listen 실패는 stderr 로그 후 에러 흐름

### 12. 로그

- 모든 로그는 stderr
- stdout은 MCP 프로토콜 전용
- 권장 로그: reply server listen, `ask_claude` 시작, relay 성공, `codex-app-server` dispatched, claude-reply resolve, codex-reply resolve, timeout, invalid request 거절

## 환경 설정

### `.codex/config.toml`

```toml
[mcp_servers.bridge]
command = "node"
args = ["/Users/lunaxislu/Documents/ai-orchestration/bridge/index.js"]
startup_timeout_sec = 120
```

CLI override가 필요하면 `args`에 추가:

```toml
args = [
  "/Users/lunaxislu/Documents/ai-orchestration/bridge/index.js",
  "--claude-url", "http://127.0.0.1:8788",
  "--reply-port", "8789",
  "--timeout-ms", "30000",
  "--codex-app-server-url", "ws://127.0.0.1:4500"
]
```

## 실행 방법 (3-terminal 워크플로)

shared app-server 구조는 터미널 3개가 필요하다.

### 터미널 A — shared Codex app-server

```bash
codex app-server --listen ws://127.0.0.1:4500
```

이 프로세스가 먼저 떠 있어야 UI와 bridge가 붙을 수 있다.

### 터미널 B — Codex remote UI

```bash
codex --remote ws://127.0.0.1:4500
```

이 UI가 `.codex/config.toml`의 `[mcp_servers.bridge]`를 읽어 bridge를 MCP child로 spawn한다.
동시에 app-server에 client로 붙어 user가 직접 Codex와 대화할 수 있게 한다.

### 터미널 C — Claude Code 세션

```bash
claude --dangerously-load-development-channels server:claude-adapter
```

`claude-adapter`는 `.mcp.json`의 `mcpServers.claude-adapter` 엔트리로 등록되어 있어야 한다.

### 왕복 흐름

- 터미널 B (Codex UI)에서 `ask_claude("...")` 호출 → 터미널 C (Claude)에 메시지 표시 → Claude reply → Codex tool 결과
- 터미널 C (Claude)에서 `ask_codex("...")` 호출 → 터미널 B UI transcript에 `[MCP RELAY — chat_id: ...]` 마커 prompt 표시 → Codex가 `reply_to_claude(chat_id, text)` 호출 → Claude tool 결과

### 실패 시 진단 포인트

- 터미널 A 미기동: bridge가 `Codex app-server not reachable at ws://127.0.0.1:4500` 에러
- 터미널 B 미기동: bridge 프로세스 자체가 없음 → Claude `ask_codex`가 404/연결 실패
- 터미널 C 미기동: `ask_claude`가 claude-adapter로 POST 실패
- app-server에 thread가 load되지 않음: `thread/loaded/list` 빈 응답 → bridge가 `No loaded Codex thread` 에러

## 프로젝트 구조

```text
ai-orchestration/
  bridge/
    index.js
    package.json
    README.md
  claude-adapter/
    index.ts
    package.json
    README.md
  .codex/config.toml
  .mcp.json
```

## 완료 기준

- [x] bridge가 stdio MCP server로 동작한다.
- [x] Codex에서 `ask_claude`, `reply_to_claude` tool이 보인다.
- [x] `ask_claude(text)` 호출 시 chat_id가 생성되고 forward pending에 등록된다.
- [x] bridge가 `POST http://127.0.0.1:8788/`로 요청한다.
- [x] claude-adapter가 Claude Code 세션에 channel event를 전달한다.
- [x] Claude Code reply가 `POST /claude-reply`로 돌아와 forward pending을 resolve한다.
- [x] bridge가 tool result를 반환한다.
- [x] Claude Code `ask_codex`가 bridge reverse ingress(`POST /codex-request`)를 호출한다.
- [x] bridge가 `reverseRequests[chat_id]` pending을 생성한다.
- [x] bridge가 shared app-server `ws://127.0.0.1:4500`에 WS client로 연결한다.
- [x] bridge가 `thread/loaded/list`로 UI thread를 discovery한다.
- [x] bridge가 `turn/start`로 `wrapRelayPrompt(text, chat_id)` 주입한 prompt를 보낸다.
- [x] Codex UI transcript에 `[MCP RELAY — chat_id: ...]` 마커 prompt가 표시된다.
- [x] Codex model이 마커를 인식하고 `reply_to_claude(chat_id, text)`를 호출한다.
- [x] bridge가 reverse pending을 resolve하고 HTTP 응답으로 Claude에 반환한다.
- [x] 30초 timeout이 동작한다.
- [x] 잘못된 reply path/body는 거절된다.
- [x] stdout에 MCP 이외 로그가 섞이지 않는다.
- [x] `codex exec` / `codex mcp-server` child spawn 경로가 제거되었다.
