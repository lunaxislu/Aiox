# resume 세션과 in-memory pending lifecycle 제약

> 작성일: 2026-04-29
> 참조 문서: `docs/bridge.spec.md`, `docs/bridge-test.md`, `bridge/index.js`, `claude-adapter/index.ts`

---

## 배경

`bridge`/`claude-adapter` 양방향 relay는 다음 in-memory 상태에 의존한다.

- `bridge.forwardReplies: Map<chat_id, PendingRequest>`
- `bridge.reverseRequests: Map<chat_id, PendingRequest>`
- shared Codex app-server의 loaded thread
- Codex remote UI session
- Claude Code channel session

이 상태는 durable storage에 저장되지 않는다. 따라서 bridge 프로세스 재시작, Codex remote UI 재시작, resume된 Codex 대화로 복귀, 진행 중인 tool call interruption이 발생하면 `chat_id` pending과 실제 UI/Claude transcript가 어긋날 수 있다.

## 관찰된 증상

forward 테스트에서 Claude Code 쪽 channel message는 도착했고 Claude가 `"pong from Claude"`라고 답했다. 하지만 `claude-adapter`의 `reply` tool이 bridge의 `POST /claude-reply`를 호출했을 때 다음 오류가 발생했다.

```text
HTTP 404 No pending ask_claude request for chat_id
```

이 오류는 `bridge.forwardReplies`에 해당 `chat_id`가 없다는 뜻이다. 메시지 전달 자체가 실패한 것이 아니라, **reply 회수 시점에 bridge의 in-memory pending이 이미 사라진 상태**다.

## 원인 판단

처음에는 bridge 재시작이 가장 유력한 원인으로 보였다.

1. `forwardReplies`는 in-memory Map이다.
2. bridge는 Codex UI가 stdio MCP child로 spawn한다.
3. Codex UI 또는 bridge child가 재시작되면 Map은 비워진다.
4. 이전 bridge 인스턴스가 보낸 channel message에 대해 Claude가 늦게 reply하면, 새 bridge 인스턴스에는 해당 `chat_id`가 없다.

그러나 추가 확인 결과, 현재 발생한 케이스는 **resume된 Codex 세션과 새로 시작한 app-server/bridge/Claude session의 lifecycle 불일치**가 더 직접적인 원인으로 판단했다.

- 사용자는 `codex app-server`, Claude Code channel session, Codex 세션을 다시 시작했다.
- 이후 Codex의 `resume`으로 기존 대화 세션에 돌아왔다.
- 화면상으로는 같은 Codex 대화처럼 보이지만, 실제 MCP child process, app-server loaded thread, pending request lifecycle은 새 프로세스들과 일치하지 않을 수 있다.
- 이 상태에서 live relay 테스트를 하면 channel message는 보일 수 있지만 reply 회수 pending은 이미 취소/삭제되었거나 다른 bridge lifecycle에 속할 수 있다.

즉, 현재 아키텍처는 **Codex resume/restart를 넘나드는 live relay continuity를 보장하지 않는다**.

## 추가한 진단 장치

이 제약을 다음 실패에서 확정적으로 구분하기 위해 bridge에 진단 endpoint를 추가했다.

- `GET /debug/status`
  - bridge `pid`, `started_at`, `uptime_ms`, `timeout_ms`
  - forward/reverse pending count와 chat_id 목록
- `GET /debug/forward-pending`
  - forward pending 목록
- `GET /debug/reverse-pending`
  - reverse pending 목록
- `GET /debug/events`
  - 최근 pending lifecycle event
  - `forward_pending_created`
  - `forward_pending_cancel`
  - `forward_pending_timeout`
  - `forward_pending_finished`
  - `claude_reply_missing_pending`
  - reverse pending 관련 event

`/claude-reply` 404 응답에도 bridge 진단 정보가 포함되도록 했다.

## 운영 규칙

live relay 테스트는 fresh remote session에서 수행한다.

권장 순서:

1. `codex app-server --listen ws://127.0.0.1:4500`
2. repo root에서 `codex --remote ws://127.0.0.1:4500`
3. repo root에서 `claude --dangerously-load-development-channels server:claude-adapter`
4. 이 fresh Codex remote session에서 `ask_claude` / `ask_codex` 테스트

주의:

- 기존 Codex 대화를 `resume`한 세션에서 live relay 왕복 성공을 기대하지 않는다.
- bridge/app-server/Claude 세션을 재시작한 뒤에는 진행 중이던 `chat_id` pending은 모두 유실된 것으로 본다.
- Claude 화면에 메시지가 보여도 bridge pending이 살아있다는 뜻은 아니다.
- 404가 나면 `/debug/status`와 `/debug/events`를 먼저 확인한다.

## 장기 개선 후보

1. 운영 제약으로 유지
   - fresh session에서만 live relay를 테스트한다.
   - 가장 단순하고 현재 구조와 맞다.

2. pending state durable storage 도입
   - bridge restart 이후에도 일부 pending을 복구할 수 있다.
   - 단, stdio MCP tool call 자체가 이미 취소된 경우 HTTP reply를 어디로 돌려줄지 문제가 남는다.

3. session identity를 protocol에 포함
   - bridge instance id, app-server thread id, Codex session id를 relay payload에 포함한다.
   - stale reply를 더 명확히 거절할 수 있다.

현재는 1번을 운영 기준으로 삼고, 3번은 향후 진단성 개선 후보로 둔다.
