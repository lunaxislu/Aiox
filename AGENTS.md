<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Always use the OpenAI developer documentation MCP server if you need to work with the OpenAI API, ChatGPT Apps SDK, Codex,… without me having to explicitly ask.

<!-- END:nextjs-agent-rules -->

## Docs Rules

- `docs/`에는 지금 구현에 직접 필요한 것만 둔다.
- `docs/legacy/`는 "왜 이렇게 됐는지"를 아는 용도만 둔다.
- `history/`는 사건 순서와 판단 과정을 기록한다.
- `plan/`은 다음 변경을 위한 실행 문서만 둔다.

## Current Doc Layout

1. `docs/` 최상단에 `README.md`를 둬서 active/legacy를 안내한다.
2. `docs/legacy/` 디렉터리에 legacy 문서를 모은다.
3. `plan/` 안의 오래된 전제 문구를 주기적으로 점검한다.
4. `history/1-bridge.history.md`와 `docs/bridge.spec.md`를 기준 문서로 고정한다.
