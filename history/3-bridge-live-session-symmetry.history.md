# bridge live session 대칭성 조사

> 이 문서는 `Codex -> Claude`는 왜 잘 동작하는지,  
> 반대로 `Claude -> Codex`는 왜 같은 방식으로 live session 대화를 만들지 못하는지에 대한
> 조사 기록이다.
>
> 핵심 결론은 `bridge`가 단순한 request/response relay로는 동작하지만,
> 양쪽 모두에 대해 동일한 상시 수신 채널을 제공하지는 않는다는 점이다.
>
> 날짜: 2026-04-15
> 업데이트: 2026-04-15

---

## 조사 목적

이번 조사는 다음 질문에서 시작했다.

1. 왜 `Codex -> Claude`는 현재 구조에서 잘 되는가?
2. 그 답을 기준으로 `Claude -> Codex`를 live session 형태로 만들 단서는 무엇인가?

추가로, `elicitInput`처럼 사용자가 직접 타이핑해야 하는 경로는
이 프로젝트의 목적과 맞지 않는다고 판단했다.

---

## 확인한 사실

- `ask_claude(text)`는 Codex가 bridge MCP tool을 호출하는 형태로 동작한다.
- bridge는 `chat_id`를 만들고 pending request를 잡아둔다.
- bridge는 `claude-adapter`로 HTTP POST를 보낸다.
- `claude-adapter`는 Claude Code 세션 안에서 channel server처럼 동작한다.
- Claude Code는 채널 메시지를 받으면 `reply` tool로 응답한다.
- `reply`는 다시 bridge의 `/claude-reply`로 돌아온다.
- bridge는 pending을 resolve하고 tool 결과를 Codex에 반환한다.

---

## 왜 `Codex -> Claude`는 잘 되는가

핵심은 “Codex가 먼저 요청을 시작해서”가 아니다.

핵심은 **Claude 쪽이 항상 듣고 있는 channel 수신기**를 가지고 있다는 점이다.

### 실제 흐름

```text
Codex
  -> ask_claude(text)
bridge
  -> POST to claude-adapter
claude-adapter
  -> channel event to Claude Code session
Claude Code session
  -> reply tool
claude-adapter
  -> POST /claude-reply
bridge
  -> resolve pending
Codex
```

이 구조가 잘 되는 이유는 다음과 같다.

1. bridge가 request를 잡아두고 reply를 기다린다.
2. Claude 쪽에는 상시 리스닝하는 channel이 있다.
3. 그 channel이 tool response를 bridge로 되돌린다.
4. bridge는 그 응답을 원래 Codex tool 호출의 결과로 반환한다.

즉, 이것은 “메시지를 화면에 주입”하는 방식이 아니라
“이미 열린 tool call을 정상 종료시키는 방식”이다.

---

## 왜 `Claude -> Codex`는 같은 방식이 아닌가

`Claude -> Codex`도 겉보기에는 요청을 시작한다.

하지만 다른 점은, Codex 쪽에 Claude의 channel과 같은 성질의
**항상-리스닝 inbound channel**이 없다는 것이다.

현재 bridge가 받을 수 있는 경로는 존재하지만,
그것을 **활성 Codex 세션으로 직접 밀어 넣는 persistent hook**은 구현되어 있지 않다.

그래서 지금 존재하는 역방향 경로는 다음 두 가지뿐이다.

- `reply_to_claude(chat_id, text)` 같은 수동 완료 경로
- `codex exec` helper turn 같은 detached child process 경로

이 둘은 live session inbound와는 다르다.

---

## 중요한 단서

이번 조사에서 얻은 가장 큰 단서는 다음이다.

> `Codex -> Claude`가 되는 이유는 Codex가 요청을 시작해서가 아니라,
> Claude 쪽 channel이 항상 듣고 있기 때문이다.

즉, 대칭성을 결정하는 것은 “누가 먼저 요청했는가”가 아니라

- 받는 쪽이 항상 살아 있는가
- 그 수신이 실제 tool/event/notification으로 연결되어 있는가

이다.

---

## 배제한 경로

`elicitInput`은 live session 느낌을 흉내 낼 수는 있지만,
사용자 직접 타이핑이 개입되므로 이 프로젝트의 목적과 맞지 않는다.

따라서 live session 대칭성을 찾는 과정에서는 제외한다.

---

## 현재 결론

현재 bridge는 다음과 같이 비대칭이다.

- Claude 쪽은 `claude-adapter`가 항상 듣고 있어서 forward가 잘 된다.
- Codex 쪽은 동등한 live listener가 없어서 reverse가 helper 경로로만 가능하다.

따라서 `Claude -> Codex`를 live session으로 만들려면,
Codex 쪽에도 Claude channel과 유사한 상시 수신 경로가 필요하다.

---

## 다음 조사 방향

다음에는 아래 둘 중 하나를 확인해야 한다.

1. Codex에 persistent inbound hook이 실제로 존재하는지
2. 현재 bridge 구조에서 그 hook을 대체할 수 있는 공식 경로가 있는지

이 둘이 확인되면,
Claude와 Codex가 bridge를 통해 실시간으로 주고받는 구조로 갈 수 있다.
