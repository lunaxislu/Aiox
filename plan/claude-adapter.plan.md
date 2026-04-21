# claude-adapter 구현 계획

> 참조 명세: `docs/claude-adapter.spec.md`

---

## 목표

bridge와 Claude Code 세션 사이에서 메시지를 양방향으로 중계하는 custom channel 서버.

- bridge(Codex MCP server) → Claude Code: HTTP POST 수신 → `notifications/claude/channel` 이벤트 전달
- Claude Code → bridge: `reply` tool 호출 → bridge callback URL로 POST 전달
- Claude Code → bridge: `ask_codex` tool 호출 → bridge reverse ingress로 POST 전달

---

## 검증된 전제

| 항목 | 사실 |
|------|------|
| Claude Code 버전 | v2.1.97, Channels 기능 작동 확인 |
| channel 등록 | `capabilities.experimental['claude/channel']: {}` 선언 필수 |
| 채널 이벤트 전송 | `mcpServer.server.notification({ method: 'notifications/claude/channel', params: { content, meta } })` |
| reply tool | 표준 MCP tool. `chat_id`, `text` 파라미터. Zod schema로 타입 추론 |
| ask_codex tool | 표준 MCP tool. `text` 파라미터. bridge reverse ingress로 전달 |
| 런타임 | **Bun 필수** — Node.js에서는 Claude Code 플러그인 silent fail |
| 활성화 플래그 | `--dangerously-load-development-channels` 필요 (custom channel) |
| 보안 | bridge 통신은 `127.0.0.1` (localhost only) |
| MCP SDK | `Server` deprecated → `McpServer` 사용 (`@modelcontextprotocol/sdk/server/mcp.js`) |

---

## 프로젝트 구조

```
ai-orchestration/                  # monorepo root
  package.json                     # pnpm workspaces, ESLint/Prettier devDeps
  pnpm-workspace.yaml              # 워크스페이스 선언 (claude-adapter, bridge)
  eslint.config.js                 # ESLint v9 flat config (typescript-eslint + prettier)
  .prettierrc                      # Prettier 규칙
  .prettierignore
  .gitignore                       # node_modules (leading slash 없이 — 모든 depth 적용)
  claude-adapter/
    index.ts                       # MCP channel 서버 + Bun HTTP 인바운드 서버
    package.json                   # @modelcontextprotocol/sdk, zod 의존
    tsconfig.json                  # "types": ["bun"] — Bun 전역 타입
    README.md
```

---

## 아키텍처

```
bridge
  │  HTTP POST  localhost:8788
  ▼
claude-adapter (Bun HTTP 서버 + MCP 서버)
  │  notifications/claude/channel (stdio)
  ▼
Claude Code 세션
  │  reply tool 호출 (MCP)
  ▼
claude-adapter
  │  HTTP POST  localhost:8789/claude-reply
  ▼
bridge

Claude Code 세션
    │  ask_codex tool 호출 (MCP)
    ▼
claude-adapter
    │  HTTP POST  localhost:8789/codex-request
    ▼
bridge
    │  codex exec helper turn
    ▼
Codex live session
    │  helper response or reply_to_claude tool 호출
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
    "start": "bun install --no-summary && bun index.ts",
    "dev": "bun index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@types/bun": "^1.3.12"
  }
}
```

### 2. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["bun"]
  },
  "include": ["index.ts"]
}
```

- `"types": ["bun"]` → `@types/bun` 패키지 참조. `process`, `Bun.serve()` 등 Bun 전역 타입 인식
- `@types/node` 설치 금지 — `@types/bun`과 전역 타입 충돌

### 3. index.ts

#### A. MCP 서버 초기화 + channel capability 선언

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const mcpServer = new McpServer(
  { name: "claude-adapter", version: "0.1.0" },
  {
    capabilities: {
      experimental: { "claude/channel": {} },  // 채널 등록 필수
    },
    instructions: `...`,  // loop 방지 지시사항 포함
  }
);
```

- `Server` → **deprecated**. `McpServer`로 교체
- `capabilities.tools: {}` 불필요 — `McpServer`가 registerTool 시 자동 처리

#### B. reply tool

```typescript
mcpServer.registerTool(
  "reply",
  {
    description: "Send a response back to the bridge.",
    inputSchema: z.object({
      chat_id: z.string().describe("channel event의 chat_id"),
      text: z.string().describe("bridge로 전달할 응답 텍스트"),
    }),
  },
  async ({ chat_id, text }) => {
    // 타입 자동 추론 — 수동 캐스팅 불필요
    await fetch(BRIDGE_REPLY_URL, {
      method: "POST",
      body: JSON.stringify({ chat_id, text, origin: "claude" }),
    });
    return { content: [{ type: "text" as const, text: "sent" }] };
  }
);
```

#### C. HTTP 인바운드 서버 (Bun.serve)

```typescript
Bun.serve({
  port: LISTEN_PORT,       // 기본 8788
  hostname: "127.0.0.1",  // localhost only
  async fetch(req) {
    // 1. loop 방지: origin === "claude" → 무시
    // 2. loop 방지: relay_depth >= 3 → 무시
    // 3. mcpServer.server.notification({ method: "notifications/claude/channel", ... })
  },
});

#### D. ask_codex tool

```typescript
mcpServer.registerTool("ask_codex", {
  description: "Ask Codex via the bridge codex exec helper path.",
  inputSchema: z.object({
    text: z.string(),
  }),
}, async ({ text }) => { ... });
```

- `http://127.0.0.1:8789/codex-request`로 POST한다.
- bridge가 `codex exec` helper turn을 시작한다.
- 반환된 text를 Claude Code 세션의 tool 결과로 돌려준다.
```

#### D. stdio transport 연결

```typescript
const transport = new StdioServerTransport();
await mcpServer.connect(transport);
```

---

### 4. loop 방지 로직

| 조건 | 처리 |
|------|------|
| POST body에 `origin: "claude"` | `{ status: "ignored", reason: "loop" }` 반환, Claude Code에 전달 안 함 |
| `relay_depth >= 3` | `{ status: "ignored", reason: "relay_depth exceeded" }` 반환 |
| reply tool에서 bridge로 보낼 때 | `origin: "claude"` 포함 → bridge가 확인하여 재전송 차단 |
| `instructions` 필드 | Claude Code에게 `origin === "claude"` 이면 reply 안 하도록 지시 |

---

### 5. 환경변수

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `LISTEN_PORT` | `8788` | bridge 메시지 수신 포트 |
| `BRIDGE_REPLY_URL` | `http://localhost:8789/claude-reply` | Claude Code 응답 전달 URL |
| `BRIDGE_CLAUDE_REQUEST_URL` | `http://localhost:8789/codex-request` | Claude Code가 Codex에게 질문할 때 사용하는 URL |

---

## 실행 방법

```bash
# Claude Code 세션 시작
claude --dangerously-load-development-channels server:claude-adapter

# 메시지 주입 테스트
curl -X POST http://127.0.0.1:8788/ \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕, Claude!", "chat_id": "test-001", "origin": "bridge"}'

# loop 방지 테스트
curl -X POST http://127.0.0.1:8788/ \
  -H "Content-Type: application/json" \
  -d '{"text": "무시됨", "origin": "claude"}'
# → {"status":"ignored","reason":"loop: origin is claude"}

# reverse 질문 테스트
ask_codex("Codex에게 확인해줘")
```

---

## 완료 기준

- [ ] `--channels ... --dangerously-load-development-channels`로 채널 서버 실행됨
- [ ] curl HTTP POST 후 Claude Code 세션에 메시지 도착
- [ ] Claude Code reply tool 호출 시 bridge로 전달됨
- [ ] `origin: "claude"` loop 방지 동작 확인
- [ ] `relay_depth >= 3` loop 방지 동작 확인

---

## 주의사항

- `Bun.serve`는 Bun 전용 API. 반드시 Bun 런타임으로 실행
- `mcpServer.server.notification()` — `McpServer`의 프로액티브 notification은 내부 `server` 프로퍼티를 통해 접근
- Claude Code reply는 비동기(tool call) — HTTP 응답에 reply 내용을 직접 담을 수 없음. bridge가 `/claude-reply` 엔드포인트를 열어두어야 함
- fakechat 참조: https://github.com/anthropics/claude-plugins-official
