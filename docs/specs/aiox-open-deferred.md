# aiox A2A — Open / Deferred (§9)

> 컨텍스트: [[aiox-a2a]] 인덱스. 상태 어휘·layer model·glossary는 인덱스가 소유한다.

## 9. Open / deferred

- group recipient visibility / shared group context.
- hard reply expiration default.
- remote/federated delivery implementation.
- Codex structured ingress spike. 2026-06-11 official app-server surface에서
  `thread/inject_items`, `turn/steer`, `turn/started|completed`, `outputSchema`,
  `thread/tokenUsage/updated` 존재는 확인했다. version-generated schema에서 본
  `clientUserMessageId`는 public docs 계약으로 확인되지 않았으므로 deliveryId binding
  후보일 뿐이다. 남은 검증은 TUI 표시, active turn 충돌, wake-up 조합, correlation id
  보존과 실패 모드다. 검증 전에는 Tier 2로 올리지 않는다.
  Current local partial: the Codex adapter can call `turn/start`, list loaded
  threads, bind selected thread identity through the proxy, and detect
  app-server/WS runtime failure ([[src/adapters/codex/injector.ts]] — `src/adapters/codex/injector.ts:22-63`,
  `src/adapters/codex/runtime.ts:180-190`,
  `src/adapters/codex/runtime.ts:242-285`,
  `src/adapters/codex/runtime.ts:330-365`,
  `src/adapters/codex/proxy.ts:46-58`,
  `src/adapters/codex/proxy.ts:151-194`,
  `tests/unit/adapters/codex-proxy.test.ts:27-97`,
  `src/daemon/state.ts:1418-1482`,
  `src/daemon/state.ts:1684-1696`). This does not prove
  `thread/inject_items`, `turn/steer`, canonical `deliveryId` binding, active
  turn policy or Tier 2 delivery semantics.
- OS/process/filesystem/network sandbox enforcement.
- full external MCP internal tool allow/deny enforcement.
- skill knowledge recall/revocation guarantee.
- Claude TUI의 외부 structured injection은 공식 지원 표면이 생기기 전까지 channel
  compatibility path를 유지한다. 관련 upstream issue는 상태가 바뀔 수 있으므로 adapter
  착수 시 재확인한다.

Lifecycle policy open questions:

- Pair-level blocked/pending policy:
  - How agent-level availability (`user_reported_limited`, adapter-reported failure,
    unavailable) affects pair-level state.
  - Whether limited/unavailable agents should pause all pairs containing that agent with
    a state like `blocked_by_agent`.
  - 기본 delivery는 §4.4에 따라 queue하되, pair-level UX와 explicit reject policy를 어떻게
    표현할지.
  - Whether reset time should auto-resume a pair or only downgrade the agent to
    `availability_unknown` until explicit user report.
  - How blocked-pair status is surfaced to the source agent.
- Duplicate outbound while `awaiting_agent_reply` is unresolved: 같은 logical request의
  coalescing/confirmation UX와 opposite-direction lane serialization.
- Fan-out partial completion:
  - v1 authority는 individual delivery다. source에게 partial completion을 어떤 summary로
    보여줄지만 open이다.
- User-interrupted pending turns:
  - When the adapter has no structured signal, whether to use user report, cancel command,
    or keep pending.
  - Interrupted message terminal state: `cancelled_by_user`, `failed`, `superseded`, or
    remain `awaiting_agent_reply`.
- Retry 기본 횟수/간격과 passive ack timeout의 release 값. §4.3 범위 안에서 G1
  failure-injection으로 고정한다.
- AI agent session expiry handling (absorbed from the legacy MVP PRD Open Product Issue #5):
  - adapter 외부 세션은 Claude development channel/MCP server 연결 idle timeout, Codex
    `app-server` WebSocket idle disconnect, Codex thread unload/disappearance, 또는
    Claude/Codex 사용자 auth token/session 만료로 끊길 수 있다.
  - 결정 필요: adapter가 만료를 어떻게 감지하는가(heartbeat, WS close,
    `thread/loaded/list` polling, API error 감지 등).
  - 결정 필요: 감지 후 agent를 자동으로 `stale`로 전환할 것인가, `disconnected`로
    둘 것인가.
  - 결정 필요: in-flight delivery를 재시도할지, 즉시 failed 처리할지, 사용자 알림 후
    대기시킬지.
  - 결정 필요: reconnect 시도 정책을 automatic backoff, 사용자 수동, 새 attach 명령 중
    어디에 둘 것인가.
  - 결정 필요: source agent에게 session expiry 사실을 어떻게 surface할 것인가.
  - 이 정책은 daemon 관점의 시간 기반 stale 판정과 별개이며, adapter가 외부 세션 단절을
    능동 감지하는 시나리오다.
