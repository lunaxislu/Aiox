# AI Agent Relay에서 Resume/Reconnect를 견디는 아키텍처 설계

## 한 줄 요약

Codex와 Claude Code를 MCP로 양방향 연결하는 relay를 만들면서, 단순 in-memory request/response 구조가 AI agent의 resume/restart lifecycle을 견디지 못한다는 문제를 발견했고, 이를 durable broker 기반 message workflow로 확장하는 방향을 설계했다.

## 배경

이 프로젝트의 목표는 Claude Code와 Codex가 서로 메시지를 주고받을 수 있게 하는 것이었다.

초기 구조는 다음과 같았다.

```text
Codex
  -> bridge MCP tool
  -> claude-adapter HTTP/channel
  -> Claude Code
```

반대 방향도 지원했다.

```text
Claude Code
  -> claude-adapter MCP tool
  -> bridge HTTP ingress
  -> Codex app-server WebSocket turn/start
  -> Codex UI transcript
```

핵심은 `chat_id`였다. 메시지를 보낼 때 `chat_id`를 만들고, 응답이 돌아오면 같은 `chat_id`로 pending request를 찾아 resolve했다.

```text
forwardReplies[chat_id] -> Claude reply 대기
reverseRequests[chat_id] -> Codex reply 대기
```

단일 세션에서는 이 구조가 단순하고 잘 동작했다.

## 문제

문제는 AI coding agent가 일반적인 request/response 서버처럼 동작하지 않는다는 점이었다.

Codex와 Claude Code는 각각 interactive session이고, 중간에 다음 일이 자연스럽게 발생한다.

- Codex session resume
- Codex remote UI 재시작
- Codex app-server 재시작
- MCP child process 재시작
- Claude Code channel session 재시작
- 진행 중인 tool call interruption

기존 relay는 pending state를 bridge 프로세스 메모리에만 저장했다.

```text
bridge.forwardReplies = new Map()
bridge.reverseRequests = new Map()
```

따라서 bridge가 재시작되거나 Codex가 resume된 세션으로 돌아오면, transcript에는 메시지가 남아 있어도 bridge의 pending state는 사라질 수 있었다.

대표 증상은 다음과 같았다.

```text
HTTP 404 No pending ask_claude request for chat_id
```

이 에러는 메시지가 Claude에게 도착하지 않았다는 뜻이 아니다. 실제로 Claude 화면에는 channel message가 보이고, Claude가 답변까지 생성했다.

문제는 reply가 bridge로 돌아온 시점에 해당 `chat_id`를 기다리는 pending request가 없었다는 점이었다.

## 원인 분석

초기에는 timeout이나 HTTP route 문제를 의심했다. 하지만 timeout을 늘려도 문제가 재현됐다.

이후 bridge에 진단 endpoint를 추가했다.

```text
GET /debug/status
GET /debug/forward-pending
GET /debug/reverse-pending
GET /debug/events
```

진단 정보에는 다음을 포함했다.

- bridge process id
- bridge started_at
- uptime
- timeout 설정
- forward/reverse pending chat_id 목록
- pending lifecycle event

이를 통해 문제의 본질이 드러났다.

```text
현재 relay는 chat_id correlation은 하지만,
session lifecycle identity는 추적하지 않는다.
```

즉, `chat_id`만으로는 부족했다.

어떤 bridge instance에서 만들어진 요청인지, 어떤 Codex app-server thread에 주입된 메시지인지, 어떤 Codex/Claude session lifecycle에 속한 요청인지가 protocol에 남지 않았다.

결과적으로 resume/restart 이후에는 다음과 같은 상태가 생길 수 있었다.

```text
Claude 화면에는 메시지가 보임
Codex transcript에도 relay prompt가 보임
하지만 bridge pending은 이미 없음
```

## 현재 구조의 한계

가장 중요한 한계는 이것이다.

```text
이미 취소된 MCP tool call에는 나중에 도착한 reply를 반환할 수 없다.
```

예를 들어:

```text
Codex가 ask_claude 호출
bridge가 pending 생성
Claude에게 메시지 도착
Codex session이 resume/restart 또는 interruption
pending 삭제
Claude reply 도착
```

이때 late reply를 저장할 수는 있지만, 이미 사라진 MCP tool call의 return value로 되돌릴 수는 없다.

따라서 이 문제는 단순히 timeout을 늘리거나 retry를 추가해서 해결할 수 있는 문제가 아니었다.

## 해결 방향

resume/restart-safe relay를 만들려면 구조를 바꿔야 한다.

핵심은 `bridge`를 stateful in-memory relay로 두는 것이 아니라, durable relay broker를 중심에 두는 것이다.

제안 구조:

```text
Codex
  -> codex-bridge MCP server
  -> relay-broker daemon
  -> SQLite / file-backed store
  -> claude-adapter
  -> Claude Code
```

반대 방향:

```text
Claude Code
  -> claude-adapter
  -> relay-broker daemon
  -> durable store
  -> Codex app-server turn/start
  -> Codex UI transcript
```

이 구조에서 `bridge`와 `claude-adapter`는 broker client가 된다. request/reply 상태는 broker가 durable store에 기록한다.

상태 전이는 다음처럼 모델링할 수 있다.

```text
queued -> dispatched -> replied -> delivered
                 \-> expired
                 \-> stale
```

interface도 blocking request/response에서 message workflow로 확장한다.

```text
ask_claude(text) -> { chat_id, status, reply? }
get_claude_reply(chat_id) -> reply 조회
list_relay_requests() -> pending/completed 목록
reply_to_claude(chat_id, text) -> reverse reply 저장/전달
```

이렇게 하면 원래 tool call이 끊겼더라도 late reply가 사라지지 않는다. 이후 Codex나 Claude가 같은 `chat_id`로 조회하거나, broker가 새 Codex turn으로 "reply arrived" notification을 주입할 수 있다.

## 배운 점

AI agent 간 relay는 단순 HTTP bridge가 아니다. Codex와 Claude Code는 long-running interactive session이고, resume/restart/interruption이 자연스럽게 발생한다.

따라서 reliable relay를 만들려면 request correlation뿐 아니라 session lifecycle과 message durability를 함께 설계해야 한다.

이번 작업에서 얻은 핵심 교훈은 다음과 같다.

- in-memory pending Map은 단일 세션에서는 충분하지만 resume-safe relay에는 부족하다.
- `chat_id`는 correlation id일 뿐, session identity가 아니다.
- observability가 없으면 timeout/404/restart/cancel을 구분할 수 없다.
- late reply를 처리하려면 synchronous tool return이 아니라 durable message workflow가 필요하다.

## 이력서용 문장

- Codex와 Claude Code를 MCP 기반으로 양방향 연결하는 AI agent relay를 설계하고 구현했다.
- in-band `chat_id` protocol로 서로 다른 MCP server/client 간 request/reply correlation을 구현했다.
- Codex app-server WebSocket `turn/start`를 활용해 Claude-origin message를 Codex UI transcript에 주입했다.
- session resume/restart 시 in-memory pending state가 유실되는 문제를 진단하고, PID/start time/pending lifecycle event 기반 observability를 추가했다.
- synchronous relay의 구조적 한계를 분석하고, SQLite-backed durable relay broker와 message workflow 기반 architecture를 설계했다.
