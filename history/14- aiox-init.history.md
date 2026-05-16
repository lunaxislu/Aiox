```bash
pnpm init

pnpm add @modelcontextprotocol/server @modelcontextprotocol/node zod better-sqlite3 ws commander

pnpm add -D typescript tsx vitest @types/node @types/ws

```

각 용도:

- @modelcontextprotocol/server: aiox MCP server/tools 구현
- @modelcontextprotocol/node: Node HTTP transport/middleware 쪽
- zod: CLI/API/tool input validation
- better-sqlite3: SQLite durable store
- ws: Codex app-server WebSocket adapter용
- commander: aiox daemon, aiox pair 같은 CLI 파싱
- typescript: TS 빌드
- tsx: 개발 중 TS 실행
- vitest: TDD 테스트 러너
- @types/node, @types/ws: 타입

아직 설치하지 말 것:

- express, hono: 지금은 필요 없음. native Node HTTP로 충분하면 의존성 줄이는 게 좋습니다.
- drizzle, kysely, prisma: 초기 SQLite schema는 직접 SQL로 시작하는 게 단순합니다.
- execa: launcher 구현할 때 필요해지면 추가. Node child_process로 먼저 충분합니다.
- chalk, ora, inquirer: CLI UX 꾸미기는 MVP core 이후.
