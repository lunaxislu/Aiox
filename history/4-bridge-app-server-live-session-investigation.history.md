# bridge live session 및 Codex App Server 조사

> 이 문서는 현재 대화에서 확인한 사실과 판단을 순서대로 남긴 조사 기록이다.
>
> 목표는 단순히 "bridge가 동작한다"가 아니라,
> `Claude -> Codex`까지 포함한 양방향 live session 대화를 만들 수 있는지,
> 그리고 그 전에 무엇을 정확히 알아야 하는지 정리하는 것이다.
>
> 날짜: 2026-04-15
> 업데이트: 2026-04-15

---

## 1. 출발점

사용자가 가장 먼저 확인한 것은 다음이었다.

- bridge MCP tool로 Claude에게 `안녕`을 보낼 수 있는가

이 시점에서 `ask_claude("안녕")`는 성공했다.

실제 결과는 다음과 같았다.

```text
안녕하세요! bridge 연결 확인됐어요.
```

이 성공은 `bridge`가 forward path에서는 정상적으로 Claude 쪽 채널에 메시지를 넣을 수 있음을 보여줬다.

---

## 2. 문제의식: 왜 forward는 되고 reverse는 아닌가

다음 단계에서 사용자는 원하는 목표를 더 명확히 했다.

- 목표는 `Codex`와 `Claude`가 `bridge`를 통해 서로 대화하는 것
- 그런데 현재 `bridge` 구현은 `codex exec` child/helper가 응답하는 형식에 가깝다
- 사용자는 live session 형태의 양방향 대화를 원했다

이때 핵심 질문은 이것이었다.

> `Claude -> Codex`도 결국 요청을 시작하는 것인데, 왜 같은 방식으로 live session이 안 되는가?

이 질문에 대해 처음에는 설명이 조금 어긋났고, 그 과정에서 중요한 단서를 다시 보게 됐다.

---

## 3. 첫 번째 단서: `Claude` 쪽은 항상 듣고 있다

정리된 결론은 다음이었다.

- `Codex -> Claude`가 되는 이유는 단순히 Codex가 요청을 시작해서가 아니다.
- 더 정확하게는 `claude-adapter`가 Claude 세션 안에서 항상 listening 하는 channel 역할을 하기 때문이다.

즉, forward path가 동작하는 본질은 다음과 같다.

1. bridge가 Claude 쪽으로 메시지를 보낸다.
2. Claude 세션 안에 있는 channel server가 이를 받는다.
3. Claude는 `reply` tool로 응답한다.
4. 응답은 bridge로 다시 돌아온다.

이 구조는 "Claude가 항상 듣고 있기 때문에" 성공한다.

즉, 중요한 것은 "누가 먼저 요청했는가"가 아니라,

- 받는 쪽이 상시 대기하고 있는가
- 그 상시 대기가 실제 tool/event/notification으로 연결되어 있는가

이다.

---

## 4. 두 번째 단서: `Claude -> Codex`에는 대칭 수신기가 없다

다음으로 확인한 것은 reverse path였다.

- `Claude -> Codex`도 요청을 시작할 수는 있다
- 하지만 Codex 쪽에는 Claude의 channel에 대응하는 persistent inbound listener가 없다

그래서 현재 reverse는 다음 둘 중 하나로만 흘러간다.

- `reply_to_claude(chat_id, text)` 같은 수동 완료 경로
- `codex exec` helper turn 같은 detached child process 경로

이 둘은 live session과 다르다.

결론적으로, `Claude -> Codex`를 live로 만들려면 Codex 쪽에도 상시 리스닝하는 수신 경로가 필요하다.

---

## 5. `elicitInput`은 제외

조사 중에 `elicitInput` 같은 경로가 언급됐지만, 이 경로는 제외하기로 했다.

이유는 명확하다.

- 사용자가 직접 타이핑해야 한다
- 프로젝트의 목표는 자동 양방향 bridge다
- 따라서 사람이 중간에 개입하는 경로는 목적에 맞지 않는다

즉, `elicitInput`은 "가능한 우회"가 될 수는 있어도, 우리가 찾는 live session bridge의 해답은 아니다.

---

## 6. Codex App Server라는 더 강한 단서

그 다음 조사에서는 Codex 자체에도 별도의 persistent 표면이 있다는 점을 확인했다.

OpenAI 문서와 로컬 schema 결과를 통해 확인한 사실은 다음과 같다.

- Codex App Server는 bidirectional JSON-RPC 표면이다.
- client는 `thread/start`, `thread/resume`, `turn/start` 같은 요청을 보낼 수 있다.
- server는 `thread/started`, `turn/started`, `turn/completed`, `item/agentMessage/delta` 같은 notification을 보낸다.
- server는 approval/input이 필요할 때 request를 시작할 수도 있다.

즉, Codex 쪽에는 MCP tool server와는 다른, 더 강한 지속 연결형 표면이 존재한다.

이 점이 중요했다.

`Claude`가 직접 Codex에게 말을 거는 게 아니라,
`bridge` 같은 client가 App Server에 붙어서 turn을 시작해야 live session이 가능하다.

---

## 7. threadId는 결국 필요하지만, Claude가 알 필요는 없다

여기서 사용자는 중요한 질문을 했다.

> 결국 threadId가 필요한 거 아니냐? 그걸 Claude가 알 수 있는 방법은 없지 않냐?

이 질문에 대한 정리는 다음과 같다.

- 맞다, App Server 방식이면 threadId는 필요하다.
- 하지만 threadId를 Claude 모델이 직접 알 필요는 없다.
- threadId는 bridge가 보관해야 하는 client-side state다.

즉, Claude는 threadId를 몰라도 된다.
bridge가 다음을 하면 된다.

1. Claude 메시지를 받는다
2. Codex App Server에 `thread/start` 또는 `thread/resume`를 보낸다
3. 반환된 threadId를 저장한다
4. 이후 Claude의 후속 메시지를 같은 threadId로 전달한다

그래서 핵심은 threadId 자체가 아니라, **bridge가 Claude 대화와 Codex thread를 매핑할 수 있느냐**이다.

---

## 8. 최종 정리된 이해

현재까지의 이해를 한 문장으로 정리하면 다음과 같다.

> `Codex -> Claude`는 Claude 쪽 channel이 항상 듣고 있어서 되고,  
> `Claude -> Codex`는 Codex 쪽에도 그에 대응하는 persistent listener가 있어야 하며,  
> 그 후보가 Codex App Server다.

이 말은 곧:

- `claude-adapter`는 Claude용 MCP channel server이고
- `bridge`는 Codex용 MCP tool server이며
- Codex live session을 직접 다루려면 App Server client가 추가로 필요하다는 뜻이다.

---

## 9. 현재 질문에 대한 답

사용자가 마지막으로 궁금해한 것은 이것이었다.

> codex app server를 연결한다고 상정하자.  
> 그 다음에 Claude에서 해당 Codex에 메시지를 보내려면 필요한 것이 무엇이고, 메시지를 보내는 것이 가능하냐?

정리된 답은 다음이다.

- 가능하다.
- 다만 Claude가 직접 보내는 게 아니라 bridge가 App Server client 역할을 해야 한다.
- 필요한 것은 live connection, thread 관리, turn 시작, notification 수신, approval/input request 처리다.

즉, "channel이 있어야 한다"는 판단은 맞고,
그 channel은 Codex App Server의 지속 연결과 이벤트 스트림이다.

---

## 10. 이 조사에서 확정된 다음 과제

다음 구현은 더 이상 `codex exec` helper를 중심에 두지 않는다.

대신 아래를 확인해야 한다.

1. bridge가 Codex App Server client로 붙을 수 있는가
2. thread/turn lifecycle을 bridge가 관리할 수 있는가
3. Claude 메시지를 Codex App Server의 `turn/start`로 바꿔 보낼 수 있는가
4. Codex notification을 다시 Claude 쪽으로 되돌릴 수 있는가

이 네 가지가 확인되면, live session 양방향 bridge가 실현 가능하다.
