# bridge App Server live session 전환 계획

> 참조 문서:
> `history/4-bridge-app-server-live-session-investigation.history.md`,
> `history/1-bridge.history.md`,
> `docs/bridge.spec.md`,
> `docs/bridge-test.md`,
> `docs/legacy/app-server-legacy.md`

---

## Summary

현재 `bridge`는 `ask_claude(text)` forward path는 잘 처리하지만,
reverse는 `codex exec` helper turn에 의존하고 있다.

이번 전환의 목표는 `bridge`를 Codex App Server client로 붙여서,
Claude와 Codex가 같은 live session 계열의 thread/turn 흐름 안에서 왕복하도록 만드는 것이다.

핵심 방향은 다음과 같다.

- `bridge`가 Codex App Server에 persistent connection을 유지한다.
- `bridge`가 threadId를 저장하고 재사용한다.
- Claude에서 들어온 메시지를 App Server `turn/start`로 전달한다.
- App Server notification을 받아 Claude 쪽으로 다시 전달한다.
- `codex exec` helper turn은 가능한 한 제거하거나 디버그 fallback으로 내린다.

---

## Goals

### 1. live Codex 세션 연결

- bridge가 Codex App Server에 client로 연결된다.
- transport는 현재 환경에 맞는 `stdio` 또는 `ws` 중 하나로 확정한다.
- 연결 성공 시 initialize handshake와 capability 확인을 완료한다.

### 2. thread state 관리

- bridge가 threadId를 저장한다.
- Claude 대화별로 Codex thread를 매핑한다.
- 새 대화는 `thread/start`, 기존 대화는 `thread/resume` 또는 대응 가능한 API로 이어 붙인다.

### 3. turn lifecycle 관리

- Claude에서 받은 메시지를 Codex turn으로 시작한다.
- `thread/started`, `turn/started`, `item/started`, `item/completed`, `turn/completed`를 추적한다.
- agent message delta가 있으면 스트리밍 또는 chunked update 전략을 쓴다.

### 4. reverse path 정리

- `Claude -> Codex`가 live session 연결 위에서 동작하도록 만든다.
- `codex exec` helper turn은 fallback 또는 제거 대상으로 분리한다.

---

## Non-goals

- `elicitInput` 기반 manual interaction은 하지 않는다.
- Claude가 threadId를 직접 알게 만드는 설계는 하지 않는다.
- 기존 `claude-adapter`의 channel 수신 구조는 깨지지 않게 유지한다.
- app-server 레거시 WS relay를 다시 active path로 돌리지 않는다.

---

## Implementation Plan

### Step 1. App Server protocol 확정

- `codex app-server`의 실제 클라이언트 API를 다시 확인한다.
- 필요한 request/notification shape를 schema 기준으로 정리한다.
- `thread/start`, `thread/resume`, `turn/start`, `turn/steer`, `turn/completed` 관련 최소 집합을 선정한다.
- transport가 `stdio`인지 `ws`인지 결정한다.

### Step 2. bridge 내부에 App Server client 계층 추가

- `bridge/index.js`에 Codex App Server client 모듈을 분리한다.
- threadId, active turn, pending reverse request를 저장하는 상태 레이어를 만든다.
- 연결 실패 시 재시도 정책과 graceful fallback을 정의한다.

### Step 3. forward 메시지 라우팅 변경

- `ask_claude(text)`는 그대로 유지한다.
- 다만 Codex side resume/thread state와 연결되도록 `chat_id`를 App Server turn과 연결한다.
- forward response는 기존 Claude reply path를 유지한다.

### Step 4. reverse 메시지 라우팅 변경

- Claude에서 온 메시지를 App Server `turn/start`로 보낸다.
- Codex notification을 bridge가 수신하면 Claude 쪽으로 전달한다.
- `reply_to_claude`는 수동 debug 또는 compatibility path로만 남길지 결정한다.

### Step 5. state mapping 확정

- Claude conversation identifier와 Codex threadId를 어떻게 매핑할지 정한다.
- bridge 재시작 시 기존 thread를 복구할지, 새 thread를 만들지 결정한다.
- thread persistence가 필요한지 문서화한다.

### Step 6. 문서 갱신

- `docs/bridge.spec.md`를 App Server client 중심으로 개정한다.
- `docs/bridge-test.md`의 reverse 절차를 helper turn이 아니라 App Server turn 기준으로 바꾼다.
- 필요하면 `bridge/README.md`와 `plan/codex-adapter.plan.md`를 같이 정리한다.

---

## Validation Plan

### A. 연결 확인

- bridge가 Codex App Server에 연결되는지 확인한다.
- initialize handshake가 성공하는지 확인한다.
- thread 시작 응답에 threadId가 오는지 확인한다.

### B. forward 확인

- `ask_claude("안녕")`가 기존처럼 동작하는지 확인한다.
- Claude reply가 bridge로 돌아오는지 확인한다.

### C. reverse 확인

- Claude에서 Codex로 질문을 보낸다.
- bridge가 같은 threadId로 Codex turn을 시작하는지 확인한다.
- Codex notification이 Claude 쪽으로 돌아오는지 확인한다.

### D. failure handling

- App Server 연결이 끊기면 명시적으로 실패하는지 확인한다.
- threadId가 없는 상태에서 reverse를 받으면 안전하게 새 thread를 만들거나 거절하는지 확인한다.
- timeout과 late reply 처리 규칙을 다시 검증한다.

---

## Open Questions

1. Codex App Server를 bridge가 어떤 transport로 붙어야 가장 안정적인가?
2. App Server client가 기존 `claude-adapter`처럼 long-lived process로 살아 있어야 하는가?
3. threadId를 bridge 내부에 얼마나 오래 저장해야 하는가?
4. helper `codex exec`는 완전히 제거할지, fallback으로 남길지?

---

## Expected Outcome

이 계획이 성공하면 다음 상태가 된다.

- Claude는 bridge를 통해 Codex live session에 메시지를 보낼 수 있다.
- Codex는 App Server thread/turn notification을 통해 결과를 돌려줄 수 있다.
- `codex exec` helper는 더 이상 메인 경로가 아니다.
- 양방향 대화가 request/response가 아니라 session/turn 기반으로 동작한다.
