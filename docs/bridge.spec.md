# Bridge 구현 명세

## 목표

`bridge`를 Codex가 호출하는 MCP server로 구현한다.  
bridge는 `ask_claude(text)` tool 하나만 제공하고, 요청을 `claude-adapter`로 전달한 뒤 Claude Code 응답을 tool 결과로 돌려준다.

이 구조의 목적은 다음 두 가지다.

- Codex app-server `threadId` 동기화 문제를 없앤다.
- Codex 대화 안에서 Claude 응답을 tool 결과로 직접 받는다.

## 검증된 사실

- Codex는 MCP server를 tool로 등록해 호출할 수 있다.
- Codex 등록은 `~/.codex/config.toml`의 `[mcp_servers.*]` 구성을 사용한다.
- `claude-adapter`는 Claude Code 세션에 channel 이벤트를 보내는 MCP channel server다.
- `claude-adapter`의 `reply` tool은 `POST /claude-reply`로 bridge에 응답을 돌려준다.
- bridge는 stdout을 MCP 프로토콜용으로만 사용하고, 로그는 stderr로 남겨야 한다.

## 아키텍처

```text
Codex
  ↓ ask_claude(text)
bridge MCP server
  ↓ POST http://127.0.0.1:8788/
claude-adapter
  ↓ channel event
Claude Code 세션
  ↓ reply tool
claude-adapter
  ↓ POST http://127.0.0.1:8789/claude-reply
bridge
  ↓ tool result
Codex
```

bridge가 책임지는 것은 다음 두 경로다.

1. Codex MCP tool 요청 수신
2. Claude reply 수신 및 pending resolve

`claude-adapter`는 별도 프로세스로 유지하며, bridge는 그것의 HTTP ingress를 호출한다.

## 구현 명세

### 1. MCP server 형태

bridge는 stdio transport로 동작하는 MCP server여야 한다.

필수 요구사항:

- `@modelcontextprotocol/sdk`의 `McpServer`를 사용한다.
- `StdioServerTransport`를 사용한다.
- tool은 `ask_claude` 하나만 등록한다.
- `ask_claude`는 문자열 입력 `text` 하나만 받는다.

### 2. `ask_claude(text)` tool

입력:

```json
{ "text": "안녕이라고 답해줘" }
```

동작 순서:

1. `chat_id = crypto.randomUUID()`를 생성한다.
2. `pending Map`에 `chat_id`를 키로 등록한다.
3. `http://127.0.0.1:8788/`로 JSON POST를 보낸다.
4. `claude-adapter`가 Claude Code 세션에 channel 이벤트를 전달한다.
5. Claude Code가 `reply` tool을 호출한다.
6. `claude-adapter`가 `POST /claude-reply`로 bridge에 응답한다.
7. bridge가 pending을 resolve하고 tool 결과를 반환한다.

반환:

```json
{ "content": [{ "type": "text", "text": "<Claude reply>" }] }
```

### 3. outbound relay payload

bridge가 `claude-adapter`로 보내는 payload는 다음 형식이다.

```json
{
  "text": "안녕이라고 답해줘",
  "chat_id": "uuid",
  "origin": "codex",
  "relay_depth": 0
}
```

필드 의미:

- `text`: Claude Code에 전달할 본문
- `chat_id`: reply 매칭용 ID
- `origin`: `codex` 고정
- `relay_depth`: 현재는 `0`으로 시작

### 4. reply 수신

bridge는 `POST /claude-reply`만 허용한다.

요청 body 예시:

```json
{
  "chat_id": "uuid",
  "text": "Claude reply text",
  "origin": "claude"
}
```

처리 규칙:

- `chat_id`가 pending Map에 없으면 404로 거절한다.
- `origin !== "claude"`이면 400으로 거절한다.
- `text`가 없거나 빈 문자열이면 400으로 거절한다.
- pending이 이미 해제된 상태면 409로 거절한다.

### 5. pending 관리

pending은 `Map<string, PendingRequest>` 형태로 관리한다.

`PendingRequest`는 다음을 가진다.

- `promise`
- `resolve(text)`
- `reject(error)`
- `cancel()`
- timeout timer

규칙:

- `ask_claude`가 시작되면 즉시 pending에 등록한다.
- reply가 오면 pending을 삭제하고 resolve한다.
- timeout이 나면 pending을 삭제하고 reject한다.
- 종료 시 남은 pending은 모두 cancel한다.

### 6. timeout

기본 timeout은 30초다.

규칙:

- 30초 안에 reply가 오지 않으면 tool은 실패해야 한다.
- timeout 메시지는 stderr에 남겨야 한다.
- timeout 후 늦게 도착한 reply는 무시되어야 한다.

### 7. HTTP reply server

bridge 내부에 reply 수신용 HTTP 서버를 유지한다.

요구사항:

- bind 주소는 `127.0.0.1`만 허용한다.
- 기본 포트는 `8789`다.
- 경로는 `/claude-reply`만 허용한다.
- `GET`, 다른 path, 잘못된 JSON은 거절한다.
- listen 실패는 제어된 에러 로그 후 종료해야 한다.

### 8. 로그

로그는 stdout이 아니라 stderr에만 써야 한다.

권장 로그:

- reply server listen 성공
- `ask_claude` 시작
- `relay` 성공
- reply resolve 성공
- timeout 실패
- 잘못된 reply 수신 실패

## 환경 설정

bridge는 Codex에 아래 방식으로 등록한다.

```toml
[mcp_servers.bridge]
command = "node"
args = ["/Users/lunaxislu/Documents/ai-orchestration/bridge/index.js"]
```

추가 옵션:

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
```

## 실행 방법

### 1. Claude Code channel server 시작

```bash
claude --dangerously-load-development-channels server:claude-adapter
```

### 2. Codex에서 bridge MCP 서버 등록

`~/.codex/config.toml`에 `bridge` 서버를 등록한다.

### 3. Codex에서 `ask_claude` 호출

```text
ask_claude("안녕이라고 답해줘")
```

## 완료 기준

- [ ] bridge가 stdio MCP server로 동작한다.
- [ ] Codex에서 `ask_claude` tool이 보인다.
- [ ] `ask_claude(text)` 호출 시 `chat_id`가 생성된다.
- [ ] bridge가 `POST http://127.0.0.1:8788/`로 요청한다.
- [ ] `claude-adapter`가 Claude Code 세션에 channel event를 전달한다.
- [ ] Claude Code reply가 `POST /claude-reply`로 돌아온다.
- [ ] bridge가 pending을 resolve하고 tool result를 반환한다.
- [ ] 30초 timeout이 동작한다.
- [ ] 잘못된 reply path/body가 거절된다.
- [ ] stdout에 MCP 이외 로그가 섞이지 않는다.
