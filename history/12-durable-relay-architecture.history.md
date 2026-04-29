# durable relay architecture 필요성 기록

> 작성일: 2026-04-29
> 관련 기록: `history/10-reverse-path-inband-relay.history.md`, `history/11-resume-session-pending-lifecycle.history.md`

---

## 문제 상황

현재 `ai-orchestration`은 Claude Code와 Codex를 양방향으로 연결하는 MCP relay 시스템이다.

구조는 다음과 같다.

```text
Codex
  -> bridge MCP child
  -> claude-adapter
  -> Claude Code

Claude Code
  -> claude-adapter
  -> bridge MCP child
  -> shared Codex app-server
  -> Codex UI transcript
```

이 구조는 forward/reverse 양방향 메시지를 실제로 전달할 수 있다. 그러나 live relay의 핵심 상태가 `bridge` 프로세스의 in-memory Map에 저장된다는 한계가 있다.

```text
forwardReplies: Map<chat_id, PendingRequest>
reverseRequests: Map<chat_id, PendingRequest>
```

따라서 다음 상황에서 relay continuity가 깨진다.

- Codex remote UI 재시작
- Codex `resume`으로 과거 대화에 복귀
- bridge MCP child process 재시작
- shared Codex app-server 재시작
- Claude Code channel session 재시작
- 진행 중인 MCP tool call interruption

겉으로는 Claude 화면에 channel message가 보이거나 Codex UI transcript에 relay prompt가 보여도, bridge 내부 pending이 이미 사라졌다면 reply를 원래 요청으로 회수할 수 없다.

대표 증상:

```text
HTTP 404 No pending ask_claude request for chat_id
```

이 404는 메시지가 전달되지 않았다는 뜻이 아니라, **reply 도착 시점에 해당 chat_id를 기다리는 bridge pending이 없다는 뜻**이다.

## 원인 분석

처음 구현은 request/response 형태의 간단한 relay로 출발했다.

```text
ask_claude(text)
  -> chat_id 생성
  -> forwardReplies[chat_id] pending 등록
  -> Claude로 message 전달
  -> Claude reply 도착 시 pending resolve
```

이 방식은 하나의 bridge 프로세스가 살아 있고, tool call이 유지되는 동안에는 단순하고 잘 동작한다.

하지만 Codex와 Claude Code는 일반 HTTP client/server처럼만 동작하지 않는다.

- Codex는 MCP child process로 bridge를 spawn한다.
- Codex app-server는 별도 프로세스이고 loaded thread 상태를 가진다.
- Codex UI는 `resume`을 통해 과거 대화로 돌아갈 수 있다.
- Claude Code는 MCP server/client이자 channel host로 동작한다.
- 양쪽 모두 장시간 살아 있는 interactive session이다.

즉, relay는 단순한 request/response 문제가 아니라 **session lifecycle coordination 문제**다.

현재 구조는 session lifecycle을 protocol에 반영하지 않는다.

- `chat_id`는 요청 correlation만 담당한다.
- 어떤 bridge instance에서 만들어졌는지 모른다.
- 어떤 Codex app-server thread에 주입됐는지 모른다.
- 어떤 Codex/Claude interactive session에 속한 요청인지 durable하게 남기지 않는다.
- pending state는 프로세스 메모리에만 있다.

그래서 resume/restart 이후에는 기존 transcript와 현재 relay state가 쉽게 분리된다.

## 현재까지 한 개선

원인을 관측할 수 있도록 bridge에 진단 endpoint를 추가했다.

```text
GET /debug/status
GET /debug/forward-pending
GET /debug/reverse-pending
GET /debug/events
```

`/claude-reply`에서 pending이 없을 때도 bridge 진단 정보를 포함하도록 했다.

확인 가능한 정보:

- bridge `pid`
- bridge `started_at`
- `uptime_ms`
- timeout 설정
- forward/reverse pending chat_id 목록
- pending lifecycle event

이 개선으로 다음을 구분할 수 있게 되었다.

- bridge 재시작으로 pending이 사라졌는가
- tool call interruption으로 pending이 cancel 되었는가
- timeout으로 pending이 삭제되었는가
- stale reply가 이전 chat_id로 도착했는가

## 남은 한계

진단 endpoint는 원인을 보여주지만, 아키텍처 한계를 제거하지는 않는다.

가장 큰 한계는 다음이다.

```text
이미 취소된 MCP tool call에는 나중에 도착한 reply를 반환할 수 없다.
```

예를 들어:

```text
Codex ask_claude 시작
bridge pending 생성
Claude channel message 도착
Codex session resume/restart 또는 tool call interruption
bridge pending 삭제
Claude reply 도착
```

이때 reply를 저장할 수는 있어도, 이미 사라진 MCP tool call의 return value로 되돌릴 수는 없다.

따라서 resume-safe 구조를 만들려면 synchronous pending Map 중심 구조에서 durable message workflow로 전환해야 한다.

## 극복 방향: durable relay broker

장기적으로는 `bridge`를 단일 in-memory relay가 아니라 별도 durable broker를 중심으로 재구성해야 한다.

제안 구조:

```text
Codex
  -> codex-bridge MCP server
  -> relay-broker daemon
  -> durable store(SQLite/file)
  -> claude-adapter
  -> Claude Code
```

역방향:

```text
Claude Code
  -> claude-adapter
  -> relay-broker daemon
  -> durable store
  -> Codex app-server turn/start
  -> Codex UI
```

핵심 변경점:

- `chat_id` pending을 broker가 durable store에 기록한다.
- bridge MCP server는 broker client 역할만 한다.
- claude-adapter도 broker client 역할만 한다.
- late reply는 사라지지 않고 completed 상태로 저장된다.
- Codex/Claude session이 바뀌어도 `chat_id` 기준으로 조회할 수 있다.
- stale reply는 bridge instance/session id 기준으로 명확히 분류할 수 있다.

필요한 interface:

```text
ask_claude(text) -> { chat_id, status, reply? }
get_claude_reply(chat_id) -> reply 조회
list_relay_requests() -> pending/completed 목록
reply_to_claude(chat_id, text) -> reverse reply 저장/전달
```

즉, relay는 단순 blocking call이 아니라 다음 상태 전이를 갖는 message workflow가 된다.

```text
queued -> dispatched -> replied -> delivered
                 \-> expired
                 \-> stale
```

## 이력서/포트폴리오용 요약

이 프로젝트에서 다룬 핵심 문제는 **AI agent 간 양방향 MCP relay에서 session resume/restart가 in-memory request correlation을 깨뜨리는 문제**였다.

초기 구현은 `chat_id`와 in-memory pending Map으로 Codex와 Claude Code 사이의 request/response를 연결했다. 이 구조는 단일 세션에서는 동작했지만, Codex resume, app-server 재시작, MCP child process 재시작처럼 interactive AI tool에서 자연스럽게 발생하는 lifecycle 변화에 취약했다.

문제를 해결하기 위해 먼저 bridge에 diagnostic endpoint와 pending lifecycle event log를 추가해 404, timeout, stale reply의 원인을 관측 가능하게 만들었다. 이후 구조적 해결책으로 durable relay broker를 설계했다. broker는 request/reply state를 SQLite 같은 durable store에 저장하고, Codex/Claude adapter는 얇은 client로 동작하게 하여 session이 바뀌어도 message state를 복구/조회할 수 있게 한다.

핵심 성과:

- MCP 기반 Codex ↔ Claude Code 양방향 relay 구현
- in-band `chat_id` relay protocol 설계
- shared Codex app-server를 통한 UI transcript injection 구현
- in-memory pending 기반 구조의 resume/restart 한계 분석
- pending lifecycle observability endpoint 설계 및 구현
- durable broker 기반 resume-safe architecture 제안
