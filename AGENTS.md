<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Always use the OpenAI developer documentation MCP server if you need to work with the OpenAI API, ChatGPT Apps SDK, Codex,… without me having to explicitly ask.

<!-- END:nextjs-agent-rules -->

## Docs Rules

- `docs/`에는 새 `aiox` 구현에 직접 필요한 것만 둔다.
- 기존 bridge/claude-adapter 문서와 구현은 `legacy/bridge-relay-v1/`에 보존한다.
- `history/`는 사건 순서와 판단 과정을 기록한다.
- `plan/`은 다음 변경을 위한 실행 문서만 둔다.

## Current Doc Layout

1. 루트는 새 `aiox` 프로젝트를 위한 작업 공간이다.
2. `legacy/bridge-relay-v1/`는 이전 구현을 참고하기 위한 보존 영역이다.
3. `history/13-aiox-rewrite-decision.history.md`를 rewrite 기준 결정 문서로 둔다.
4. 새 `docs/`와 `plan/`은 `pnpm init` 이후 필요한 시점에 다시 만든다.


## 구현 원칙
반드시 원칙을 지킬것 
.ai/tdd.md를 확인하고 실행할것
