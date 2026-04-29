# bridge

Codex에서 호출하는 MCP 서버다. repo root의 `./.codex/config.toml`에 등록하고, Codex는 repo root에서 실행해야 한다. `ask_claude(text)`와 `reply_to_claude(chat_id, text)` tool을 제공하고, forward 요청은 `claude-adapter`로 전달한 뒤 `/claude-reply`로 돌아온 응답을 tool 결과로 반환한다. reverse 요청은 shared Codex app-server WS에 `[MCP RELAY]` prompt를 주입하고, Codex가 `reply_to_claude(chat_id, text)`를 호출해 회수한다.

## 동작

- Codex가 `ask_claude(text)` tool을 호출한다
- bridge가 `chat_id = crypto.randomUUID()`를 만든다
- bridge가 `http://127.0.0.1:8788/`의 `claude-adapter`로 POST 한다
- `claude-adapter`가 Claude Code 세션에 channel 이벤트를 전달한다
- Claude Code가 `reply` tool을 호출한다
- `claude-adapter`가 `http://127.0.0.1:8789/claude-reply`로 응답을 보낸다
- bridge가 pending 요청을 resolve하고 tool 결과를 돌려준다
- Claude Code가 `ask_codex(text)`를 호출하면 bridge가 `http://127.0.0.1:8789/codex-request`를 받는다
- bridge가 shared Codex app-server(`ws://127.0.0.1:4500`)에 연결해 `thread/loaded/list`로 UI thread를 찾는다
- bridge가 `turn/start`로 `[MCP RELAY — chat_id: ...]` prompt를 Codex UI transcript에 주입한다
- Codex가 `reply_to_claude(chat_id, text)` tool을 호출하면 bridge가 reverse pending을 resolve한다

## 실행

Codex MCP 서버로 등록해서 실행한다.

`./.codex/config.toml`:

```toml
[mcp_servers.bridge]
command = "node"
args = ["/Users/lunaxislu/Documents/ai-orchestration/bridge/index.js"]
```

필요하면 `claude-adapter` 주소, reply timeout, shared Codex app-server URL을 args로 덮어쓸 수 있다.
Codex를 다른 디렉터리에서 시작할 경우 이 파일을 읽지 못할 수 있으므로, 테스트 시에는 repo root에서 실행하거나 `codex -C /Users/lunaxislu/Documents/ai-orchestration`를 사용한다.

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
  "--codex-app-server-url",
  "ws://127.0.0.1:4500",
]
```

## 수동 실행

```bash
node bridge/index.js \
  --claude-url http://127.0.0.1:8788 \
  --reply-port 8789 \
  --timeout-ms 30000 \
  --codex-app-server-url ws://127.0.0.1:4500
```

## 주의

- bridge는 stdout을 MCP 프로토콜용으로만 쓴다.
- 로그는 stderr로만 출력한다.
- `claude-adapter`는 별도 프로세스로 계속 떠 있어야 한다.
- `reply`는 `POST /claude-reply`로만 받는다.
- reverse 경로를 쓰려면 shared app-server(`codex app-server --listen ws://127.0.0.1:4500`)와 remote UI(`codex --remote ws://127.0.0.1:4500`)가 먼저 떠 있어야 한다.
- 2026-04-29 기준, `reply_to_claude`는 `[MCP RELAY]` prompt에 대한 Codex 응답을 Claude 쪽 HTTP request로 되돌리는 활성 회수 경로다.
