# claude-adapter 구현 및 테스트 히스토리

> 이 문서는 claude-adapter를 구현하고 실제로 Claude Code 채널 연결에 성공하기까지의
> 전 과정을 기록한다. 발생한 문제, 원인 분석, 해결 방법을 모두 담았다.
>
> 날짜: 2026-04-12

---

## 최종 결과

```
curl → claude-adapter(8788) → notifications/claude/channel → Claude Code 세션
Claude Code → reply tool (MCP) → claude-adapter → bridge(미구현)
```

- 채널 메시지 수신: ✅
- reply tool 호출: ✅
- loop 방지 로직: ✅
- bridge 없는 상태에서 reply 전달 실패는 예상된 동작 (정상)

---

## 문제 1 — `Server` deprecated, `server.notification()` vs `server.sendNotification()`

### 현상

`@modelcontextprotocol/sdk`의 `Server` 클래스를 import해서 사용했는데,
IDE에서 deprecated 경고가 표시됨.
또한 채널 이벤트를 보내는 메서드가 `notification()`인지 `sendNotification()`인지 불명확했음.

### 원인 분석

MCP SDK 1.x에서 `Server` (low-level)는 deprecated 처리됨.
공식 권장 API는 `McpServer` (high-level).

`sendNotification()`은 request handler 내부의 `extra` 컨텍스트에서 쓰는 함수이고,
서버에서 클라이언트로 프로액티브하게 notification을 보내는 메서드는 `notification()`이 맞음.

SDK 타입 정의 직접 확인:
```
# protocol.d.ts:383
notification(notification: SendNotificationT, options?: NotificationOptions): Promise<void>;
```

### 해결

`Server` → `McpServer`로 전환.

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| import | `Server` from `server/index.js` | `McpServer` from `server/mcp.js` |
| tool 등록 | `setRequestHandler(ListToolsRequestSchema)` + `setRequestHandler(CallToolRequestSchema)` | `mcpServer.registerTool()` + Zod schema |
| tool 인자 타입 | `unknown` → 수동 캐스팅 | Zod로 자동 추론 |
| 프로액티브 notification | `server.notification()` | `mcpServer.server.notification()` |
| transport 연결 | `server.connect(transport)` | `mcpServer.connect(transport)` |

`zod`는 MCP SDK의 peerDependency로 이미 `node_modules`에 존재(`zod@4.3.6`).
`claude-adapter/package.json`에 `"zod": "^4.0.0"` 추가 후 `pnpm install`로 설치.

---

## 문제 2 — ESLint 설정 오류 (`tseslint.config` deprecated + `eslint-config-prettier` 타입 불일치)

### 현상

`eslint.config.js` 작성 후 IDE에서 두 가지 오류 표시:

```
The signature '(...configs: InfiniteDepthConfigWithExtends[]): ConfigArray' of
'tseslint.config' is deprecated.ts(6387)

Could not find a declaration file for module 'eslint-config-prettier'.
'/node_modules/eslint-config-prettier/index.js' implicitly has an 'any' type.
```

### 원인 분석

**오류 1:** `tseslint.config(...tseslint.configs.recommended)` — spread 형태로 넘기는 overload가 deprecated.
올바른 방법은 `defineConfig` from `eslint/config` 사용.

**오류 2:** `eslint-config-prettier`는 타입 정의 파일이 없음.
`eslint-config-prettier`의 `rules` 값이 `string` 타입인데,
ESLint의 `RuleConfig<unknown[]>` 타입과 호환되지 않음.

추가로 `@eslint/js` 패키지가 별도 설치 필요했음 (ESLint v9에 번들되지 않음).

### 해결 과정

1. `tseslint.config()` → `defineConfig()` from `eslint/config` 로 교체
2. `@eslint/js` devDependency 추가 및 `pnpm install`
3. `eslint-config-prettier` 타입 문제:
   - 처음에 `// @ts-ignore` 주석으로 처리 → linter(prettier)가 포맷팅 시 주석 제거해버림
   - `// @ts-expect-error` 로 변경 → 동일하게 linter가 import 정렬 시 제거
   - **최종 해결:** JSDoc 타입 캐스팅으로 처리 (linter가 건드릴 수 없음)

```js
// eslint-config-prettier의 rules 타입이 ESLint의 RuleConfig와 호환되지 않음
const prettier = /** @type {import("eslint").Linter.Config} */ (prettierConfig);
```

4. 루트 `package.json`에 `"type": "module"` 추가
   - 없을 경우 `[MODULE_TYPELESS_PACKAGE_JSON]` 경고 + 성능 오버헤드 발생

최종 `eslint.config.js`:
```js
// @ts-check
import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettierConfig from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const prettier = /** @type {import("eslint").Linter.Config} */ (prettierConfig);

export default defineConfig(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  { ignores: ["node_modules/", "dist/"] },
);
```

---

## 문제 3 — `process` 전역 타입을 찾을 수 없음

### 현상

`claude-adapter/index.ts`에서:
```
Cannot find name 'process'. Do you need to install type definitions for node?
Try `npm i --save-dev @types/node`ts(2591)
```

### 원인 분석

프로젝트에 `tsconfig.json`이 없었기 때문.
`@types/bun`은 설치돼 있지만 TypeScript가 이를 인식하려면
`tsconfig.json`의 `"types": ["bun"]` 설정이 필요.

`@types/node` 설치는 **잘못된 해결책**:
- `@types/bun`과 `process`, `fetch`, `setTimeout` 등 전역 타입 충돌 발생
- `claude-adapter`는 Bun 런타임이므로 Node.js 타입이 부정확함

### 해결

`claude-adapter/tsconfig.json` 생성:
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

**주의:** TypeScript `types` 배열은 `@types/<name>` 패키지를 `<name>`으로 참조.
`@types/bun` → `"bun"`, `@types/node` → `"node"`.
초기에 `"bun-types"`로 작성했다가 `Cannot find type definition file for 'bun-types'` 에러 발생 →
`"bun"`으로 수정.

---

## 문제 4 — `claude-adapter/node_modules`가 git에서 무시되지 않음

### 현상

`git status`에서 `claude-adapter/node_modules`가 untracked으로 표시됨.

### 원인 분석

`.gitignore`의 `node_modules` 패턴에 leading slash가 붙어있었음:

```
/node_modules   ← 루트의 node_modules만 무시
```

Git에서 leading slash는 "저장소 루트 기준"을 의미.
`claude-adapter/node_modules` 같은 하위 경로는 적용되지 않음.

### 해결

```diff
- /node_modules
+ node_modules
```

leading slash 제거 → 모든 depth의 `node_modules` 무시.

---

## 문제 5 — Claude Code 채널 실행 플래그 문법 오류 (가장 중요)

### 현상 1 — `argument missing`

명세서의 실행 명령어:
```bash
claude --channels plugin:./claude-adapter/index.ts \
       --dangerously-load-development-channels
```

실행 결과:
```
error: option '--dangerously-load-development-channels <servers...>' argument missing
```

### 원인 1

`--dangerously-load-development-channels`는 서버 목록을 **직접 인자**로 받는 플래그.
명세서의 명령어 구조가 잘못됨:
- `--channels`와 `--dangerously-load-development-channels`를 별개로 사용하는 방식은 현재 버전(v2.1.101)에서 지원 안 됨
- `--channels` 플래그 자체가 v2.1.101 `--help`에 없음

### 현상 2 — `--plugin-dir` 시도

```bash
claude --plugin-dir ./claude-adapter
```

Claude Code 세션이 열렸지만 port 8788 연결 실패:
```
curl: (7) Failed to connect to 127.0.0.1 port 8788 after 0 ms: Couldn't connect to server
```

### 원인 2

`--plugin-dir`은 플러그인 디렉토리를 로드하는 옵션이지,
채널 서버 프로세스를 subprocess로 실행하지 않음.
HTTP 서버가 뜨지 않아 8788 포트가 열리지 않은 것.

### 현상 3 — 포맷 에러

```bash
claude --dangerously-load-development-channels plugin:./claude-adapter/index.ts
```

결과:
```
--dangerously-load-development-channels entries must be tagged:
  plugin:<name>@<marketplace>  — plugin-provided channel (allowlist enforced)
  server:<name>                — manually configured MCP server
```

### 원인 3

`plugin:` 포맷은 marketplace에 등록된 공식 플러그인 전용.
로컬 파일 경로(`./claude-adapter/index.ts`)는 이 포맷으로 지원되지 않음.

로컬 개발 채널은 `server:<name>` 포맷을 사용해야 하며,
이는 `.mcp.json`에 미리 등록된 MCP 서버를 이름으로 참조하는 방식.

### 최종 해결

**1단계** — `.mcp.json` 생성:
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

Claude Code가 `.mcp.json`의 `claude-adapter` 서버를 subprocess로 실행하고,
`capabilities.experimental['claude/channel']`을 감지해 채널로 등록.

---

## 테스트 성공 확인

### 채널 연결 확인

Claude Code 세션 화면:
```
Listening for channel messages from: server:claude-adapter
Experimental · inbound messages will be pushed into this session...
```

### curl 테스트

```bash
curl -X POST http://127.0.0.1:8788 \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕 Claude!", "chat_id": "test-001", "origin": "bridge"}'

# 응답
{"status":"ok","chat_id":"test-001"}
```

### Claude Code 세션 반응

```
← claude-adapter: 안녕 Claude!

● claude-adapter – reply (MCP)(chat_id: "test-001", text: "안녕하세요! Claude Code입니다. 무엇을 도와드릴까요?")

● claude-adapter 채널을 통해 인사를 받았습니다! 메시지가 성공적으로 전송되었습니다.
  무엇을 도와드릴 수 있는지 알려주세요.
```

**검증된 전체 경로:**
1. curl POST → claude-adapter HTTP 서버(8788) 수신 ✅
2. `mcpServer.server.notification()` → Claude Code 세션에 채널 이벤트 전달 ✅
3. Claude Code가 `reply` tool 호출 ✅
4. claude-adapter가 `BRIDGE_REPLY_URL`로 POST 시도 → bridge 미구현으로 연결 실패 (예상된 동작) ✅

---

## 핵심 교훈 요약

| # | 교훈 |
|---|------|
| 1 | `Server` (low-level MCP)는 deprecated. `McpServer` + `mcpServer.server.notification()` 사용 |
| 2 | `eslint-config-prettier` 타입 문제는 `@ts-ignore`/`@ts-expect-error`가 아닌 JSDoc 캐스팅으로 해결 — linter가 제거 못 함 |
| 3 | `@types/bun` 인식은 `tsconfig.json`의 `"types": ["bun"]` 필수. `@types/node` 설치는 충돌 유발 |
| 4 | `.gitignore`의 `/node_modules`(leading slash)는 루트만 무시. monorepo에서는 leading slash 제거 필요 |
| 5 | Claude Code v2.1.101에서 로컬 채널 실행은 `--dangerously-load-development-channels server:<name>` + `.mcp.json` 등록 방식 사용 |
| 6 | `--plugin-dir`은 채널 서버 프로세스를 띄우지 않음. `.mcp.json` + `server:` 포맷이 올바른 방법 |
