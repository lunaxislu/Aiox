# Per-Agent Transparent Proxy Decision

## 상태

- 날짜: 2026-05-26
- 범위: Codex TUI 내부 `/resume` 후 wrong-thread delivery를 해결하기 위한
  사용자 학습 기록.
- 권위: 구현 결정의 권위는
  `history/41-codex-loaded-thread-binding-analysis.history.md`에 둔다. 이
  문서는 사용자가 나중에 구조와 trade-off를 다시 이해하기 위한 설명이다.

## 한 줄 요약

1:1 app-server 결정을 버리는 게 아니라, 그 앞에 1:1 transparent proxy를 둔다.

```text
Codex agent alpha:
  Codex TUI alpha -> proxy alpha -> app-server alpha

Codex agent beta:
  Codex TUI beta  -> proxy beta  -> app-server beta
```

이 구조는 shared 1:N app-server로 돌아가는 것이 아니다.

## 왜 proxy가 필요한가

현재 daemon도 Codex app-server에 붙을 수 있지만, daemon은 TUI가 자기 연결에서
보낸 `/resume` request와 그 response를 직접 볼 수 없다.

```text
Codex TUI -> app-server: thread/resume { threadId: A }
app-server -> Codex TUI: result { thread: { id: A } }
```

이 response가 "지금 이 TUI가 A를 보고 있다"는 가장 강한 신호다. daemon이 다른
connection에서 `thread/loaded/list`를 호출해도 이것을 직접 알 수 없다.

proxy를 두면 메시지를 바꾸지 않고 지나가게 하면서, 같은 TUI connection에서
돌아오는 binding response만 관찰할 수 있다.

```text
Codex TUI -> proxy -> app-server
              │
              └─ thread/start|resume|fork response의 result.thread.id 관찰
```

## 무엇을 해결하나

문제가 된 실패는 이 흐름이다.

```text
1. 사용자가 Codex TUI 안에서 /resume
2. TUI 화면은 예전 thread A로 이동
3. app-server의 loaded list 마지막은 다른 thread B일 수 있음
4. daemon이 Claude 메시지를 B에 turn/start
5. app-server는 성공 처리하지만 사용자는 현재 TUI에서 메시지를 못 봄
```

proxy 기반 rebind는 2번 시점의 `thread/resume` response를 보고 active thread를
A로 바꾼다. 그래서 이후 Claude 메시지는 A로 들어간다.

## 왜 1:N proxy나 shared app-server가 아닌가

이번 결정은 관찰 채널을 추가하는 것이지, agent identity boundary를 바꾸는 것이
아니다.

피해야 할 구조:

```text
TUI alpha ┐
TUI beta  ├-> shared proxy -> shared app-server
TUI gamma ┘
```

이 구조는 다시 "어느 TUI/agent의 이벤트인가"를 routing layer가 책임져야 한다.
JSON-RPC id multiplexing, broadcast demux, close/error propagation까지 직접
구현해야 하므로 MVP 문제를 키운다.

채택한 구조:

```text
TUI alpha -> proxy alpha -> app-server alpha
TUI beta  -> proxy beta  -> app-server beta
```

여기서는 app-server endpoint가 여전히 agent identity boundary이고, proxy
connection은 visible TUI focus를 알려주는 관찰 채널이다.

## Trade-off

장점:

- `/resume`, `/clear`, `/new`, `/fork`를 같은 원리로 처리한다.
- `thread/loaded/list.at(-1)` 추측을 제거한다.
- 기존 per-agent app-server isolation을 유지한다.
- proxy connection 자체가 TUI identity라서 same-client response만 신뢰하면 된다.

비용:

- Codex runtime마다 proxy lifecycle이 하나 추가된다.
- `aiox codex`는 TUI를 app-server endpoint가 아니라 proxy endpoint로 붙여야 한다.
- proxy port, shutdown, health, error propagation을 관리해야 한다.
- Codex JSON-RPC shape 변경에 대비한 regression test가 필요하다.

치명적인 제약:

- proxy는 transparent relay여야 한다. frame을 수정하거나 error를 바꾸면 안 된다.
- production logging은 raw frame 전체를 남기면 안 된다. preview, connector 목록,
  대화 내용 같은 민감/대용량 데이터가 섞일 수 있다.
- error response나 `result.thread.id`가 없는 response에서는 rebind하면 안 된다.
- `/fork`는 request `params.threadId`가 source이고, bind target은 response
  `result.thread.id`다.

## 구현 규칙

```text
same TUI connection에서:
  request method in [thread/start, thread/resume, thread/fork]
    -> pending[jsonrpc.id] = method

  matching response with result.thread.id
    -> activeThreadId = result.thread.id
    -> emit summarized binding event
```

나중에 온 binding response가 이전 binding을 덮어쓴다.

```text
/resume -> /fork

thread/resume response: activeThreadId = resumed source
thread/fork response:   activeThreadId = forked target
```

## Claude 위임 시 확인할 것

Claude에게 넘길 다음 작업은 "큰 rewrite"가 아니라 작은 TDD 단계가 맞다.

1. proxy가 `thread/start`, `thread/resume`, `thread/fork` response에서
   binding event를 emit하는 테스트를 먼저 작성한다.
2. daemon state가 그 binding event를 받아 해당 Codex agent의 `activeThreadId`를
   바꾸는 테스트를 작성한다.
3. delivery target 선택이 `thread/loaded/list.at(-1)`보다 response-based binding을
   우선하도록 바꾼다.
4. raw frame logging은 spike에만 남기고 production path에는 요약 event만 남긴다.

