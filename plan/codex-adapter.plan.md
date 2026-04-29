# bridge / claude-adapter MCP 전환 계획

> 2026-04-29 Superseded: 이 계획은 2026-04-15의 `plan/shared-app-server.plan.md`와
> 2026-04-29 현재 `docs/bridge.spec.md` 기준으로 대체되었다.
> 특히 `codex exec` helper turn을 reverse 활성 경로로 설명하는 부분은 2026-04-29 실행 기준이 아니다.
> 2026-04-29 기준 reverse 경로는 shared Codex app-server WS `turn/start` + `[MCP RELAY]` + `reply_to_claude`다.

> 참조 문서: `docs/README.md`, `history/1-bridge.history.md`, `docs/bridge.spec.md`, `docs/bridge-test.md`, `docs/legacy/app-server-legacy.md`, `docs/claude-adapter.spec.md`

---

## Summary

bridge를 Codex가 호출하는 stdio MCP server로 전환한다.  
이전의 Codex app-server WebSocket relay 구조는 폐기하고, `ask_claude(text)`와 `reply_to_claude(chat_id, text)`를 제공하는 양방향 MCP server로 정리한다.

최종적으로 남는 책임은 다음과 같다.

- `bridge`: Codex용 MCP tool server
- `claude-adapter`: Claude Code 채널 서버 + HTTP ingress/reply bridge
- `config.toml`: Codex에 bridge MCP 서버 등록

이 전환의 목적은 threadId 동기화와 turn lifecycle 추적을 제거하고, Codex 대화 안에서 Claude 응답을 tool 결과로 직접 돌려받는 것이다.

---

## Key Changes

### 1. bridge를 Codex MCP server로 운영

- `bridge/index.js`는 stdio transport를 사용하는 MCP server여야 한다.
- tool은 `ask_claude`와 `reply_to_claude`를 제공한다.
- 입력은 `{ text: string }` 하나로 제한한다.
- tool 호출 시 `chat_id = crypto.randomUUID()`를 생성한다.
- pending reply는 `Map<chat_id, resolver>` 형태로 관리한다.
- reply timeout은 30초로 고정한다.

### 2. Codex 호출 흐름

- Codex는 `ask_claude("...")`를 호출한다.
- bridge는 `http://127.0.0.1:8788/`로 payload를 전달한다.
- payload는 `{ text, chat_id, origin: "codex", relay_depth: 0 }` 형식이다.
- bridge는 reply가 돌아올 때까지 tool 호출을 block한다.
- reply가 오면 tool 결과로 그대로 반환한다.
- Claude Code에서 `ask_codex`를 호출하면 bridge reverse ingress를 받아 `codex exec` helper turn을 시작한다.
- Codex는 helper response 또는 `reply_to_claude(chat_id, text)`로 reverse pending을 완료한다.

### 3. claude-adapter 역할 고정

- `claude-adapter`는 Claude Code 세션에 channel 이벤트를 보내는 역할만 유지한다.
- inbound HTTP는 `POST /` 하나만 허용한다.
- reply는 MCP `reply` tool을 통해 발생한다.
- reply tool은 `POST /claude-reply`로 bridge에 반환한다.

### 4. Codex 등록 방식

- Codex는 repo root의 `./.codex/config.toml`의 `[mcp_servers.bridge]`로 bridge를 등록한다.
- 실행 command는 `node` 또는 현재 프로젝트의 엔트리 포인트에 맞는 런타임을 사용한다.
- 필요 시 `--claude-url`, `--reply-port`, `--timeout-ms`를 args로 전달한다.

### 5. Legacy 문서 분리

- `docs/legacy/app-server-legacy.md`만 legacy 문서로 유지하고 active 문서 목록에서 app-server WS 경로를 제거한다.
- app-server 조사 결과는 `docs/legacy/app-server-legacy.md`로 보존한다.
- threadId / turn lifecycle 규칙은 레거시 분석과 회고용으로만 남긴다.

---

## Test Plan

### A. bridge tool 노출 확인

- Codex에서 `ask_claude` tool이 보이는지 확인한다.
- `ask_claude` 호출이 stdio MCP request로 전달되는지 확인한다.

### B. 정상 왕복 확인

- `ask_claude("안녕이라고 답해줘")`를 호출한다.
- bridge가 `chat_id`를 생성한다.
- bridge가 `claude-adapter`로 요청을 보낸다.
- Claude Code 세션이 channel event를 받는다.
- Claude Code가 `reply` tool을 호출한다.
- bridge가 `/claude-reply`를 받아 pending을 resolve한다.
- tool 결과가 Codex로 반환된다.

### C. reverse 왕복 확인

- Claude Code에서 `ask_codex("Codex에게 확인해줘")`를 호출한다.
- `claude-adapter`가 bridge reverse ingress로 요청을 보낸다.
- bridge가 `codex exec` helper turn을 시작한다.
- Codex가 helper response 또는 `reply_to_claude(chat_id, text)`로 응답한다.
- bridge가 reverse pending을 resolve하고 Claude Code 세션으로 결과를 반환한다.

### D. 실패 케이스 확인

- 30초 동안 reply가 없으면 timeout 실패해야 한다.
- 30초 동안 Codex reply가 없으면 reverse timeout 실패해야 한다.
- `/claude-reply` 외 경로는 404여야 한다.
- `/codex-request` 외 경로는 404여야 한다.
- 잘못된 JSON body는 400이어야 한다.
- `origin !== "claude"`인 reply는 거절해야 한다.
- `direction !== "reverse"`인 reverse ingress는 거절해야 한다.
- 중복 reply 또는 이미 완료된 pending은 409/404 중 명시된 방식으로 거절해야 한다.

### D. 로그 및 런타임 확인

- stdout에는 MCP 프로토콜 외 로그가 섞이지 않아야 한다.
- 로그는 stderr로만 나와야 한다.
- reply 서버 listen 실패는 제어된 에러로 종료해야 한다.

---

## Assumptions

- Codex는 repo root 기준의 project-scope `./.codex/config.toml` MCP 서버 등록을 지원한다.
- bridge는 현재 스코프에서 `ask_claude`와 `reply_to_claude`를 제공한다.
- `claude-adapter`의 HTTP ingress와 reply tool 계약은 기존 구현을 유지한다.
- app-server WebSocket 기반 trigger/stream relay는 더 이상 active path가 아니다.
- `docs/legacy/app-server-legacy.md`는 조사/회고 용도이며 새 구현의 기준 문서는 아니다.
- 이 계획에 적힌 reverse `codex exec` helper 경로는 이후 shared app-server WS 경로로 대체되었다.

---

## Rollout Notes

- 기존 WS relay 경로는 더 이상 사용하지 않는다.
- 새로 추가되는 변경은 `ask_claude` 요청-응답 계약을 기준으로 검토한다.
- bridge와 claude-adapter 간 payload shape가 바뀌면 두 문서를 함께 갱신한다.
- 테스트는 `docs/bridge-test.md` 절차를 기준으로 수행한다.
