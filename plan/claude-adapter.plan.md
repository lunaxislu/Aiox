# claude-adapter 구현 계획

> 참조 명세: `docs/claude-adapter.spec.md`

---

## 목표

bridge와 Claude Code 세션 사이에서 메시지를 양방향으로 중계하는 custom channel 서버.

- bridge → Claude Code: HTTP POST 수신 → `notifications/claude/channel` 이벤트 전달
- Claude Code → bridge: `reply` tool 호출 → bridge callback URL로 POST 전달

---

## 검증된 전제

| 항목 | 사실 |
|------|------|
| Claude Code 버전 | v2.1.97, Channels 기능 작동 확인 |
| channel 등록 | `capabilities.experimental['claude/channel']: {}` 선언 필수 |
| 채널 이벤트 전송 | `server.notification({ method: 'notifications/claude/channel', params: { content, meta } })` |
| reply tool | 표준 MCP tool. `chat_id`, `text` 파라미터 |
| 런타임 | **Bun 필수** — Node.js에서는 Claude Code 플러그인 silent fail |
| 활성화 플래그 | `--dangerously-load-development-channels` 필요 (custom channel) |
| 보안 | bridge 통신은 `127.0.0.1` (localhost only) |

---

## 파일 구조

```
ai-orchestration/
  claude-adapter/
    index.ts       # MCP channel 서버 + Bun HTTP 인바운드 서버
    package.json   # @modelcontextprotocol/sdk 의존
    README.md      # 실행 방법 및 API 문서
```

---

## 아키텍처

```
bridge
  │  HTTP POST  localhost:8788
  ▼
claude-adapter (HTTP 서버 + MCP 서버)
  │  notifications/claude/channel (stdio)
  ▼
Claude Code 세션
  │  reply tool 호출 (MCP)
  ▼
claude-adapter
  │  HTTP POST  localhost:8789/claude-reply
  ▼
bridge
```

---

## 구현 명세

### 1. package.json

```json
{
  "name": "claude-adapter",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "start": "bun install --no-summary && bun index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/bun": "latest"
  }
}
```

- 종속성 1개 (`@modelcontextprotocol/sdk`) — 명세 제약 준수

---

### 2. index.ts

#### A. MCP 서버 초기화 + channel capability 선언

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server(
  { name: "claude-adapter", version: "0.1.0" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },  // 채널 등록 필수
      tools: {},
    },
    instructions: `...`,  // loop 방지 지시사항 포함
  }
);
```

#### B. reply tool

```typescript
// ListToolsRequestSchema 핸들러 → reply tool 스키마 반환
// CallToolRequestSchema 핸들러 → BRIDGE_REPLY_URL로 HTTP POST
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { chat_id, text } = req.params.arguments;
  await fetch(BRIDGE_REPLY_URL, {
    method: "POST",
    body: JSON.stringify({ chat_id, text, origin: "claude" }),
  });
  return { content: [{ type: "text", text: "sent" }] };
});
```

#### C. HTTP 인바운드 서버 (Bun.serve)

```typescript
Bun.serve({
  port: LISTEN_PORT,       // 기본 8788
  hostname: "127.0.0.1",  // localhost only
  async fetch(req) {
    // 1. loop 방지: origin === "claude" → 무시
    // 2. loop 방지: relay_depth >= 3 → 무시
    // 3. server.notification({ method: "notifications/claude/channel", ... })
  },
});
```

#### D. stdio transport 연결

```typescript
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

### 3. loop 방지 로직

| 조건 | 처리 |
|------|------|
| POST body에 `origin: "claude"` | `{ status: "ignored", reason: "loop" }` 반환, Claude Code에 전달 안 함 |
| `relay_depth >= 3` | `{ status: "ignored", reason: "relay_depth exceeded" }` 반환 |
| reply tool에서 bridge로 보낼 때 | `origin: "claude"` 포함 → bridge가 확인하여 재전송 차단 |
| `instructions` 필드 | Claude Code에게 `origin === "claude"` 이면 reply 안 하도록 지시 |

---

### 4. 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `LISTEN_PORT` | `8788` | bridge 메시지 수신 포트 |
| `BRIDGE_REPLY_URL` | `http://localhost:8789/claude-reply` | Claude Code 응답 전달 URL |

---

## 실행 방법

```bash
# Claude Code 세션 시작
claude --channels plugin:./claude-adapter/index.ts \
       --dangerously-load-development-channels

# 메시지 주입 테스트
curl -X POST http://127.0.0.1:8788 \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕, Claude!", "chat_id": "test-001", "origin": "bridge"}'
```

---

## 완료 기준

- [ ] `--channels ... --dangerously-load-development-channels`로 채널 서버 실행됨
- [ ] curl HTTP POST 후 Claude Code 세션에 메시지 도착
- [ ] Claude Code reply tool 호출 시 bridge로 전달됨
- [ ] `origin: "claude"` loop 방지 동작 확인
- [ ] `relay_depth >= 3` loop 방지 동작 확인
- [ ] README에 실행 방법 작성됨

---

## 주의사항

- `Bun.serve`는 Bun 전용 API. 반드시 Bun 런타임으로 실행
- `server.notification()` 은 MCP SDK 1.x 기준. 버전 충돌 시 `server.sendNotification()` 확인 필요
- Claude Code reply는 비동기(tool call) — HTTP 응답에 reply 내용을 직접 담을 수 없음. bridge가 `/claude-reply` 엔드포인트를 열어두어야 함
- fakechat 참조: https://github.com/anthropics/claude-plugins-official
