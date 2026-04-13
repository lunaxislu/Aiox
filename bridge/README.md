# bridge

Codex에서 호출하는 MCP 서버다. `ask_claude(text)` tool 하나를 제공하고, 요청을 `claude-adapter`로 전달한 뒤 `/claude-reply`로 돌아온 응답을 tool 결과로 반환한다.

## 동작

- Codex가 `ask_claude(text)` tool을 호출한다
- bridge가 `chat_id = crypto.randomUUID()`를 만든다
- bridge가 `http://127.0.0.1:8788/`의 `claude-adapter`로 POST 한다
- `claude-adapter`가 Claude Code 세션에 channel 이벤트를 전달한다
- Claude Code가 `reply` tool을 호출한다
- `claude-adapter`가 `http://127.0.0.1:8789/claude-reply`로 응답을 보낸다
- bridge가 pending 요청을 resolve하고 tool 결과를 돌려준다

## 실행

Codex MCP 서버로 등록해서 실행한다.

`~/.codex/config.toml`:

```toml
[mcp_servers.bridge]
command = "node"
args = ["/Users/lunaxislu/Documents/ai-orchestration/bridge/index.js"]
```

필요하면 `claude-adapter` 주소와 reply timeout을 args로 덮어쓸 수 있다.

```toml
[mcp_servers.bridge]
command = "node"
args = [
  "/Users/lunaxislu/Documents/ai-orchestration/bridge/index.js",
  "--claude-url",
  "http://127.0.0.1:8788",
  "--reply-port",
  "8789",
  "--timeout-ms",
  "30000",
]
```

## 수동 실행

```bash
node bridge/index.js \
  --claude-url http://127.0.0.1:8788 \
  --reply-port 8789 \
  --timeout-ms 30000
```

## 주의

- bridge는 stdout을 MCP 프로토콜용으로만 쓴다.
- 로그는 stderr로만 출력한다.
- `claude-adapter`는 별도 프로세스로 계속 떠 있어야 한다.
- `reply`는 `POST /claude-reply`로만 받는다.
