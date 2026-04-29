> 이 문서는 Claude Code 에이전트가 읽고 바로 구현에 들어갈 수 있도록 작성된 명세서다.
> 배경 설명 없이 무엇을 만들어야 하는지, 제약조건이 무엇인지만 적혀있다.
> 구현 전에 이 문서 전체를 읽어라.

---

## 네가 만들어야 하는 것

**Claude Code용 custom channel 서버** — Codex `bridge`가 Claude Code 세션에 메시지를 보내고, Claude Code 응답을 bridge로 받아오는 MCP 서버.

같은 서버에서 `ask_codex(text)` tool도 제공해서 Claude Code가 Codex에게 역방향 질문을 보낼 수 있어야 한다.

프로젝트 경로: `/Users/lunaxislu/Documents/ai-orchestration`

---

## 검증된 사실

- Claude Code v2.1.97에서 Channels 기능 작동 확인됨
- `claude --dangerously-load-development-channels server:claude-adapter`로 실행
- two-way channel 구조 작동 확인
- Channels는 세션 시작 플래그로만 활성화 가능. 세션 중 설정 불가
- Bun 런타임 필수. Node.js에서는 플러그인 silent fail
- MCP SDK 1.x에서 `Server`는 deprecated → `McpServer` 사용
- `mcpServer.server.notification()` — 프로액티브 notification은 내부 `server` 프로퍼티를 통해 접근

---

## 아키텍처 위치

```
Claude Code 세션
    ↑ (channel event)
    ↓ (reply tool)
custom channel 서버  ←→  bridge core (HTTP)

Claude Code 세션
    ↑ (ask_codex tool 호출)
    ↓ (결과 반환)
bridge core  ←→  Codex UI (shared app-server WS via turn/start)
```

---

## 구현 명세

### 기술 스택

- **런타임**: Bun (필수. Node.js 불가)
- **프로토콜**: MCP — `@modelcontextprotocol/sdk` 사용
- **스키마**: `zod`
- **transport**: stdio

### 파일 구조

```
ai-orchestration/
  claude-adapter/
    index.ts
    package.json       # @modelcontextprotocol/sdk, zod
    tsconfig.json      # "types": ["bun"]
    README.md
  .mcp.json            # claude-adapter 등록
```

### channel capability 선언

```typescript
const mcpServer = new McpServer(
  { name: "claude-adapter", version: "0.1.0" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },
    },
  }
);
```

### `reply` tool

```typescript
mcpServer.registerTool("reply", {
  description: "Send a response back to the bridge.",
  inputSchema: z.object({
    chat_id: z.string(),
    text: z.string(),
  }),
}, async ({ chat_id, text }) => {
  // POST BRIDGE_REPLY_URL (기본: http://localhost:8789/claude-reply)
});
```

### `ask_codex` tool

```typescript
mcpServer.registerTool("ask_codex", {
  description: "Ask Codex via the bridge reverse relay path.",
  inputSchema: z.object({
    text: z.string(),
  }),
}, async ({ text }) => {
  // POST http://127.0.0.1:8789/codex-request
  // bridge가 Codex UI transcript에 relay prompt 주입
  // Codex reply 올 때까지 await → tool result 반환
});
```

### 환경변수

- `LISTEN_PORT` — HTTP 서버 포트 (기본: 8788)
- `BRIDGE_REPLY_URL` — claude reply 전달 URL (기본: http://localhost:8789/claude-reply)
- `BRIDGE_CODEX_REQUEST_URL` — reverse ingress URL (기본: http://localhost:8789/codex-request)

### inbound HTTP 서버 (bridge → Claude Code)

- `POST /` — bridge가 보내는 forward 메시지 수신
- loop 방지: `origin === "claude"` → 200 ignored
- `relay_depth >= 3` → 200 ignored
- 수신 후 `mcpServer.server.notification()`으로 Claude Code 세션에 channel event 전달

---

## 실행 방법

**1단계** — `.mcp.json` (프로젝트 루트):

```json
{
  "mcpServers": {
    "claude-adapter": {
      "command": "bun",
      "args": ["./claude-adapter/index.ts"]
    }
  }
}
```

**2단계** — 실행:

```bash
claude --dangerously-load-development-channels server:claude-adapter
```

세션에 `Listening for channel messages from: server:claude-adapter` 뜨면 정상.

---

## 제약조건

- Python 사용 금지. Bun만 사용
- `@modelcontextprotocol/sdk`, `zod` 외 추가 패키지 없음
- bridge와의 통신은 localhost만 (127.0.0.1)
- loop 방지: `origin` 태그 확인
- stdout은 MCP 프로토콜 전용. 로그는 stderr만

---

## 완료 기준

- [x] `claude --dangerously-load-development-channels server:claude-adapter`로 실행됨
- [x] bridge에서 HTTP POST 보내면 Claude Code 세션에 메시지 도착
- [x] Claude Code가 응답하면 bridge가 수신
- [x] `ask_codex` tool 호출 시 bridge reverse ingress로 전달됨
- [x] Codex UI transcript에 relay prompt 표시됨
- [x] Codex reply가 Claude Code 세션으로 돌아옴
- [x] loop 방지 동작 확인
- [x] README에 실행 방법 작성
