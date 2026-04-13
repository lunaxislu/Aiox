# claude-adapter

Claude Code용 custom channel 서버. bridge가 Claude Code 세션에 메시지를 보내고, Claude Code 응답을 bridge로 받아오는 MCP 서버.

## 구조

```
bridge (HTTP POST → localhost:8788)
    ↓
claude-adapter (MCP channel server)
    ↓ notifications/claude/channel
Claude Code 세션
    ↓ reply tool 호출
claude-adapter
    ↓ HTTP POST
bridge (localhost:8789/claude-reply)
```

## 요구사항

- Bun 런타임 필수 (Node.js 불가 — Claude Code 플러그인은 Bun에서만 동작)
- Claude Code v2.1.80 이상 (Channels 기능 지원)

## 실행

```bash
# Claude Code 세션 시작 시 채널 서버 등록
claude --channels plugin:./claude-adapter/index.ts \
       --dangerously-load-development-channels
```

## 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `LISTEN_PORT` | `8788` | claude-adapter가 bridge 메시지를 수신할 HTTP 포트 |
| `BRIDGE_REPLY_URL` | `http://localhost:8789/claude-reply` | Claude Code 응답을 전달할 bridge 엔드포인트 |

## API

### POST `http://127.0.0.1:8788/`

bridge → claude-adapter: Claude Code 세션에 메시지 전달

**Request body:**

```json
{
  "text": "Claude에게 전달할 메시지",
  "chat_id": "conversation-id",
  "origin": "bridge",
  "relay_depth": 0
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `text` | ✅ | Claude Code에 전달할 메시지 내용 |
| `chat_id` | ✅ | 대화 추적용 ID |
| `origin` | ❌ | 메시지 출처 (`"claude"` 이면 loop로 간주하여 무시) |
| `relay_depth` | ❌ | 릴레이 횟수 (3 이상이면 무시) |

**Response:**

```json
{ "status": "ok", "chat_id": "..." }
```

### reply tool (MCP)

Claude Code → bridge: Claude Code가 응답할 때 이 tool을 호출

```
claude-adapter – reply(chat_id: "...", text: "...")
```

호출 시 `BRIDGE_REPLY_URL`로 아래 payload를 POST:

```json
{
  "chat_id": "...",
  "text": "Claude Code의 응답",
  "origin": "claude"
}
```

## 테스트

### 1. Claude Code 세션 시작

```bash
claude --channels plugin:./claude-adapter/index.ts \
       --dangerously-load-development-channels
```

### 2. bridge에서 메시지 전송

```bash
curl -X POST http://127.0.0.1:8788/ \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕, Claude!", "chat_id": "test-001", "origin": "bridge"}'
```

Claude Code 세션 화면에 채널 메시지가 나타나야 함.

### 3. loop 방지 확인

```bash
# origin이 "claude"인 메시지 — 무시되어야 함
curl -X POST http://127.0.0.1:8788/ \
  -H "Content-Type: application/json" \
  -d '{"text": "이 메시지는 무시됨", "origin": "claude"}'
# 응답: {"status":"ignored","reason":"loop: origin is claude"}

# relay_depth >= 3 — 무시되어야 함
curl -X POST http://127.0.0.1:8788/ \
  -H "Content-Type: application/json" \
  -d '{"text": "이것도 무시됨", "relay_depth": 3}'
# 응답: {"status":"ignored","reason":"loop: relay_depth 3 >= MAX_RELAY_DEPTH 3"}
```

## 완료 기준

- [ ] `--channels ... --dangerously-load-development-channels`로 채널 서버 실행됨
- [ ] `curl` HTTP POST 후 Claude Code 세션에 메시지 도착
- [ ] Claude Code reply tool 호출 시 bridge로 전달됨
- [ ] `origin: "claude"` loop 방지 동작 확인
- [ ] `relay_depth >= 3` loop 방지 동작 확인
