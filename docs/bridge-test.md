# Bridge 테스트 절차

이 문서는 `bridge`가 Codex MCP tool로 등록된 뒤, `ask_claude(text)`가 실제로 Claude Code 세션과 왕복하는지 확인하는 절차다.

## 사전 조건

- `claude-adapter`가 떠 있어야 한다.
- `bridge`가 `~/.codex/config.toml`에 MCP 서버로 등록되어 있어야 한다.
- Codex에서 `ask_claude` tool이 보여야 한다.
- `claude-adapter`의 `reply` 경로는 `POST http://127.0.0.1:8789/claude-reply`를 사용해야 한다.

## 1. claude-adapter 실행

```bash
claude --dangerously-load-development-channels server:claude-adapter
```

확인할 로그:

- `Listening for channel messages from: server:claude-adapter`
- `Experimental · inbound messages will be pushed into this session...`

## 2. bridge가 Codex MCP 서버로 등록됐는지 확인

`~/.codex/config.toml`에 아래 항목이 있어야 한다.

```toml
[mcp_servers.bridge]
command = "node"
args = ["/Users/lunaxislu/Documents/ai-orchestration/bridge/index.js"]
```

bridge가 띄워져 있지 않다면 Codex가 tool을 호출할 때 자동으로 실행한다.

## 3. `ask_claude` 호출

Codex에서 `ask_claude` tool을 호출한다.

입력 예시:

```text
안녕이라고 답해줘
```

예상 흐름:

- bridge가 `chat_id = crypto.randomUUID()`를 생성한다
- bridge가 `http://127.0.0.1:8788/`로 요청을 보낸다
- `claude-adapter`가 Claude Code 세션에 channel 이벤트를 전달한다
- Claude Code가 `reply` tool을 호출한다
- `claude-adapter`가 `POST /claude-reply`로 응답을 보낸다
- bridge가 pending 요청을 resolve하고 tool 결과를 Codex에 반환한다

## 4. bridge 로그 확인

bridge stderr에서 다음 로그를 확인한다.

- `reply-server: listening on http://127.0.0.1:8789/claude-reply`
- `ask_claude: sending chat_id=...`
- `relay: sent to Claude for chat_id=...`
- `claude-reply: resolved chat_id=...`
- `ask_claude: resolved chat_id=...`

## 5. 실패 케이스 확인

### 30초 timeout

Claude Code가 reply를 보내지 않으면 30초 뒤에 실패해야 한다.

기대 결과:

```text
Timed out waiting for Claude reply after 30000ms
```

### 잘못된 reply 경로

`/claude-reply` 외 경로는 거절되어야 한다.

기대 결과:

- HTTP 404

### 잘못된 reply body

`origin`이 `"claude"`가 아니거나 `chat_id` / `text`가 없으면 거절되어야 한다.

기대 결과:

- HTTP 400

## 6. 왕복 판정

아래 두 조건이 모두 충족되면 성공이다.

- Codex tool 호출이 정상적으로 완료된다
- 반환값이 Claude Code가 보낸 reply 텍스트와 일치한다

## 주의

- 이 구조에서는 Codex app-server WebSocket과 `threadId`를 맞출 필요가 없다.
- 테스트 대상은 `bridge`의 MCP tool 왕복이다.
- `claude-adapter`는 별도 프로세스로 계속 떠 있어야 한다.
