# reverse path probe 후속 기록 / chat_id 자동화 쟁점 정리

> 참조 문서:
> `history/8-bridge-notification-queue-fix.history.md`,
> `history/1-bridge.history.md`,
> `bridge/index.js`,
> `/tmp/bridge-notifications.log`
>
> 작성일: 2026-04-15

---

## 목적

이번 기록은 세 가지를 한 번에 남긴다.

1. 직전 세션에서 내가 수정한 `bridge/index.js`의 실제 변경점
2. 그 코드가 반영된 상태라고 가정하고 수행한 `reverse path probe` 관찰 결과
3. 사용자와 주고받은 질의응답에서 드러난 핵심 쟁점, 특히 `chat_id` 자동 연결 문제와 내가 잘못 설명한 부분

이 문서는 단순 작업 로그가 아니라, 다음 세션에서 같은 오해를 반복하지 않도록 하기 위한 운영 기록이다.

---

## 배경 연결

직전 작업은 `history/8-bridge-notification-queue-fix.history.md`에 정리되어 있다.

그때의 수정 목표는 다음 두 가지였다.

1. Codex app-server notification 이름과 payload shape를 추정이 아니라 실제 schema 기준으로 해석
2. `turn/start` 응답 전에 도착한 초기 notification을 drop하지 않도록 queue buffering 추가

즉 그 변경은 **reverse 요청의 `chat_id` 자동화**를 직접 해결한 것이 아니라,
**reverse 요청이 app-server live turn을 통해 정상 completion까지 갈 수 있는지**를 먼저 복구하려는 성격이었다.

이 구분이 이번 대화에서 매우 중요해졌다.

---

## 이번 세션 시작 시점의 코드 상태

이번 세션에서 기준으로 본 파일은 `bridge/index.js`다.

### 1. assistant text 추출 보강

관련 위치:
- `bridge/index.js:302`

핵심:
- `extractAssistantTextFromItem(item)`가 `item.type === "agentMessage" && item.text`만 보지 않도록 변경됨
- nested `item.item`
- `content[]` 안의 string
- `content[]` 안의 `{ text }`
- top-level `item.text`

의도:
- `thread/realtime/itemAdded`나 wrapper object에서도 assistant 본문을 회수

### 2. turn 시작 전 state 선생성

관련 위치:
- `bridge/index.js:498`
- `bridge/index.js:533`

핵심:
- `sendPrompt(text)`가 `turn/start` 전에 `beginTurn(threadId)`를 호출
- `turn/start` 응답 후 `turnId`를 state에 주입
- 그 뒤 `drainNotificationQueue()`를 실행

의도:
- 초기 notification이 응답보다 먼저 와도 state 없이 drop되지 않게 함

### 3. notification queue buffering

관련 위치:
- `bridge/index.js:657`
- `bridge/index.js:662`
- `bridge/index.js:688`

추가 필드:
- `this.notificationQueue`
- `this.processingNotifications`

핵심 동작:
- active turn이 있으면 notification을 queue에 넣음
- `turnId`가 아직 없어도 `threadId`/`turn.id`/`turnId` 기준으로 현재 turn과 매칭 시도
- `turn/start` 응답 후 backlog drain

### 4. notification 해석 로직 보정

관련 위치:
- `bridge/index.js:703`

실제 처리 method:
- `thread/status/changed`
- `turn/started`
- `item/agentMessage/delta`
- `item/completed`
- `thread/realtime/itemAdded`
- `turn/completed`
- `turn/failed`

의도:
- `turn/completed.turn.items`가 비어 있어도 completion 자체는 인정
- `item/completed`와 realtime item notification에서 본문 우선 수집

### 5. reverse ingress와 수동 reply 경로의 현재 구조

관련 위치:
- `bridge/index.js:1070`
- `bridge/index.js:1141`
- `bridge/index.js:1241`
- `bridge/index.js:1301`

중요 구조:
- `GET /debug/reverse-pending`
- `POST /codex-request`
- `createReversePending(chatId)`
- `reply_to_claude(chat_id, text)`

현재 구조상 사실:
- reverse 요청은 `/codex-request`로 받는다.
- bridge는 `chat_id` 기준으로 `reverseRequests`에 pending을 만든다.
- pending을 끝내는 방법은 둘 중 하나다.
  - app-server live turn이 직접 reply text를 돌려줌
  - `reply_to_claude(chat_id, text)`가 호출되어 수동/호환성 경로로 pending resolve

즉 **`chat_id`는 여전히 reverse pending을 식별하는 핵심 키**다.

---

## 이번 세션에서 실제로 한 probe

이번 세션에서 나는 `reverse path probe` 요청을 받았고, 그 의미를 다음처럼 해석했다.

- 저장소 맥락상 "reverse path가 실제로 동작하는지"를 짧게 재검증하는 요청
- 따라서 코드 변경보다 우선 현재 bridge/app-server/live remote 상태를 확인하고 probe를 보냄

### 먼저 확인한 것

프로세스 관찰 결과:
- `codex app-server --listen ws://127.0.0.1:4500` 실행 중
- `codex --remote ws://127.0.0.1:4500` 실행 중
- `node bridge/index.js` 실행 중

이 관찰만으로는 reverse가 동작한다는 뜻은 아니고,
최소한 필요한 프로세스는 떠 있다는 뜻만 확인했다.

### HTTP ingress probe

reverse probe를 위해 다음 요청을 보냈다.

```json
{
  "chat_id": "reverse-path-probe-20260415",
  "direction": "reverse",
  "origin": "claude",
  "relay_depth": 0,
  "text": "reverse path probe"
}
```

요청 대상:
- `POST http://127.0.0.1:8789/codex-request`

처음에는 sandbox 안에서 `curl`이 `127.0.0.1:8789`에 접속하지 못했지만,
그건 포트 미오픈이 아니라 sandbox 네트워크 제약으로 판단했다.

이후 sandbox 밖에서 같은 probe를 다시 실행했다.

### probe 결과

`GET /debug/reverse-pending`:

```json
{"count":0,"chat_ids":[],"status":"ok"}
```

`POST /codex-request` 응답:

```json
{"error":"Timed out waiting after 30000ms (chat_id=reverse-path-probe-20260415)"}
```

즉 관찰된 실제 흐름은 다음이다.

1. bridge HTTP ingress는 살아 있음
2. reverse pending 생성은 됨
3. app-server 쪽 live turn 시작 시도는 됨
4. 30초 내 assistant reply completion을 못 받아 timeout

---

## `/tmp/bridge-notifications.log` 관찰 결과

이번 probe 뒤에 본 최근 로그는 다음 네 줄이 핵심이었다.

```json
{"ts":"2026-04-15T08:31:17.889Z","event":"turn_wait_started","threadId":"019d9044-096d-7313-bb46-b130ecfbb5c4","turnId":null}
{"ts":"2026-04-15T08:31:17.892Z","event":"notification","method":"thread/status/changed","params":{"threadId":"019d9044-096d-7313-bb46-b130ecfbb5c4","status":{"type":"active","activeFlags":[]}},"stateThreadId":"019d9044-096d-7313-bb46-b130ecfbb5c4","stateTurnId":"019d9044-2382-7fa2-90f9-e052cd60fc82"}
{"ts":"2026-04-15T08:31:47.889Z","deltaCount":0,"error":"Timed out waiting 30000ms for Codex turn turnId=019d9044-2382-7fa2-90f9-e052cd60fc82","event":"turn_rejected","finalText":null,"threadId":"019d9044-096d-7313-bb46-b130ecfbb5c4","turnId":"019d9044-2382-7fa2-90f9-e052cd60fc82"}
{"ts":"2026-04-15T08:32:44.702Z","deltaCount":0,"error":"Timed out waiting 30000ms for Codex turn turnId=019d9045-016e-7e20-8395-cb041ce1d679","event":"turn_rejected","finalText":null,"threadId":"019d9044-096d-7313-bb46-b130ecfbb5c4","turnId":"019d9045-016e-7e20-8395-cb041ce1d679"}
```

이 로그에서 알 수 있는 것:

1. `turn_wait_started`는 찍혔다.
2. `thread/status/changed`의 `active`는 들어왔다.
3. `item/agentMessage/delta`는 안 들어왔다.
4. `item/completed`는 안 들어왔다.
5. `turn/completed`는 안 들어왔다.
6. 결국 `finalText` 없이 timeout reject로 끝났다.

즉 **이번 세션 관찰 기준으로는 reverse ingress 자체보다, app-server live turn completion 수집 구간이 막혀 있었다.**

---

## 사용자와의 질의응답에서 드러난 핵심 쟁점

여기부터는 단순 기술 로그가 아니라, 운영 해석에서 어디가 어긋났는지를 남긴다.

### 내가 처음 한 설명

내가 처음에는 대략 다음 취지로 말했다.

- 이번 timeout의 직접 원인은 `chat_id`를 몰라서 reply를 못 보낸 것은 아니다.
- 이번 probe에서는 내가 직접 `chat_id`를 정해서 보냈다.
- 따라서 현재 병목은 app-server live turn completion 수집 쪽이다.

이 설명에는 **부분적으로 맞는 내용**과 **운영 관점에서 잘못 전달된 내용**이 섞여 있었다.

### 사용자의 반론

사용자는 다음 요지로 반박했다.

- 결국 문제는 `chat_id`를 몰라서 네가 못 보낸 것 아니냐
- 그걸 수동으로 보낸 것이고
- 현재 목표는 그 수동 경로를 자동화하기 위해 `chat_id`를 같이 확인하게 만드는 것 아니냐

그리고 이어서 사용자는 더 직접적으로 지적했다.

- "왜 거짓말하냐"
- "자동으로 그럼 다시 보내야 하는 거 아니냐"
- "결국 수동으로 보냈다는거 아니냐?"

이 지적은 타당했다.

### 왜 사용자의 지적이 맞았는가

이번 세션에는 두 층위가 겹쳐 있었다.

#### 층위 A. 내가 따로 던진 독립 probe

이건 사실이다.

- 내가 `curl /codex-request`를 직접 호출했다.
- 그 payload에는 내가 임의로 `chat_id=reverse-path-probe-20260415`를 넣었다.
- 그 독립 probe는 실제로 30초 timeout으로 실패했다.

즉 **독립 probe 하나만 놓고 보면** "이 요청은 `chat_id`가 없어서 실패한 건 아니다"라고 말할 수 있다.

#### 층위 B. 사용자가 지적한 운영 문제

이것도 사실이다.

- 실제 Claude -> Codex reverse 운영 흐름에서는 사람이 `chat_id`를 보지 않아도 자동으로 이어져야 한다.
- 그런데 현재 구조에서는 reverse pending을 수동 reply 경로와 자동으로 결합하는 흐름이 비어 있다.
- 그래서 사람이 `chat_id`를 보고 `reply_to_claude(chat_id, text)`를 수동으로 연결해야 하는 상태가 남아 있다.

즉 **실제 운영 문제의 본질**은 사용자가 말한 대로
`chat_id`를 자동으로 식별하고 자동으로 reply에 연결하지 못한다는 점이다.

### 내가 잘못한 설명 포인트

내가 잘못한 부분은 이거다.

1. 독립 probe의 결과와 실제 운영 문제를 같은 층위처럼 섞어 설명했다.
2. "이번 timeout의 직접 원인은 `chat_id`가 아니다"라고 너무 단정적으로 말했다.
3. 그 표현 때문에, 사용자가 겪는 실제 문제인 "수동으로 `chat_id`를 보고 다시 보내야 하는 운영"을 과소평가한 것처럼 들렸다.

정확한 표현은 이랬어야 했다.

- 이번에 내가 임의 `chat_id`로 보낸 독립 probe는 app-server completion 수집 문제로 timeout 났다.
- 별개로, 현재 실제 reverse 운영에는 `chat_id` 자동 연결 부재라는 중요한 문제가 남아 있다.
- 따라서 지금의 reverse는 여전히 실질적으로 수동 운영이다.

---

## 사용자 관점 타임라인과 독립 probe 타임라인을 분리해서 다시 정리

이번 대화에서 가장 크게 꼬인 지점은, 내가 **사용자가 실제로 겪은 reverse 요청 흐름**과 **내가 따로 실행한 독립 probe 흐름**을 하나처럼 섞어 말한 것이다.

이 둘은 엄밀히 구분해야 한다.

### A. 사용자가 실제로 지적한 운영 타임라인

사용자 관점의 요지는 아래와 같다.

1. Claude Code 쪽에서 reverse 요청을 보낸다.
2. 그 요청은 bridge 쪽 pending으로 들어간다.
3. 하지만 내가 그 요청에 대응하는 `chat_id`를 자동으로 확인해서 다시 보내지 못한다.
4. 그래서 Claude Code 쪽에서는 당연히 응답이 없다고 보고 timeout 난다.
5. 결국 사람이 `chat_id`를 보고 수동으로 보내는 운영이 된다.

이 해석은 맞다.

즉 사용자가 실제로 겪은 흐름만 놓고 보면,
**Claude Code timeout은 "응답이 없어서 난 결과"이고, 그 응답 부재의 직접 운영 원인은 `chat_id`를 자동으로 못 찾아서 reply를 못 보낸 것**이라고 정리해야 한다.

여기서 내가 앞서 쓴 "두 문제가 동시에 존재한다"는 문장은 사용자 관점의 타임라인 설명으로는 부정확했다.

정확한 표현:
- 사용자 운영 흐름에서는 `chat_id` 자동 연결 실패가 먼저다.
- Claude timeout은 그 다음 결과다.

### B. 내가 별도로 실행한 독립 probe 타임라인

이건 위 운영 흐름과 다른 별도 테스트다.

1. 내가 직접 `curl /codex-request`를 보냈다.
2. 이 테스트 payload에는 내가 임의의 `chat_id`를 직접 넣었다.
3. 따라서 이 독립 테스트 하나만 보면 "`chat_id`가 없어서 못 보냈다"는 상황은 아니었다.
4. 그런데도 bridge는 30초 뒤 timeout을 반환했다.
5. 그리고 `/tmp/bridge-notifications.log`에는 `active`만 찍히고 completion 계열 notification이 보이지 않았다.

즉 **독립 probe는 `chat_id`를 이미 가진 상태에서도 timeout이 났다**는 별도 관찰이다.

### 왜 이 둘을 분리해야 하는가

사용자가 화를 낸 이유는 정당하다.

내가 처음에는 독립 probe의 해석을 가져와서,
사용자가 실제로 겪은 운영 문제까지 "`chat_id`와 무관하다"처럼 들리게 설명했다.

그건 틀렸다.

정리하면:
- 사용자 운영 흐름의 핵심 문제: `chat_id`를 자동으로 못 잡아서 수동 운영이 됨
- 내가 따로 돌린 독립 probe의 관찰 결과: `chat_id`를 직접 넣어도 app-server completion 수집이 timeout 남

이 둘은 같은 문제가 아니라, 서로 다른 층위다.

---

## 이번 세션 기준으로 확정된 현재 상황

현재 상태를 한 문장으로 요약하면 이렇다.

**사용자가 실제로 겪는 reverse 운영은 아직 수동이고, 그 직접 원인은 `chat_id` 자동 연결 부재다. 별개로 내가 따로 수행한 독립 probe에서는 `chat_id`를 직접 넣어도 live turn completion 수집 timeout이 관찰됐다.**

조금 더 분해하면 아래처럼 써야 정확하다.

### 문제 1. `chat_id` 자동 연결 부재

현재 구조:
- reverse 요청은 `chat_id` 기준으로 pending을 만든다.
- 수동 reply 경로는 `reply_to_claude(chat_id, text)`에 의존한다.
- 그러나 Claude 쪽 응답이 발생했을 때 그 응답이 어떤 `chat_id`에 대응하는지 자동으로 회수/전달/소비하는 경로는 아직 없다.

의미:
- 사람이 `chat_id`를 보고 수동으로 연결해야 한다.
- 사용자가 지적한 "결국 수동으로 보낸 것"이 현재 운영 현실과 맞다.

### 문제 2. 독립 probe에서 관찰된 live app-server completion 수집 timeout

이번 로그 기준:
- `thread/status/changed active`만 보임
- `delta`, `item/completed`, `turn/completed` 미수신
- 결국 timeout

의미:
- 설령 `chat_id` 자동화가 되더라도, app-server live turn completion 수집이 계속 불안정하면 reverse는 다른 지점에서 또 timeout 날 수 있다.

다만 이 문장은 사용자 운영 흐름 자체의 직접 원인을 설명하는 문장이 아니라,
**내가 별도로 실행한 probe에서 추가로 관찰된 독립 리스크**를 설명하는 문장으로만 써야 한다.

사용자 실제 흐름에 대해서는 이렇게 요약해야 맞다.

- 먼저 `chat_id` 자동 연결이 안 됨
- 그래서 reply가 안 나감
- 그래서 Claude Code가 timeout 남

이 순서를 문서와 설명에서 절대 바꾸면 안 된다.

---

## 다음 세션에서 판단 기준으로 써야 할 문장

다음부터는 아래 기준으로 설명해야 한다.

1. "reverse가 자동화되었다"는 말은 금지한다.
2. 사용자 운영 흐름은 **수동 `chat_id` 운영**이라고 먼저 표현한다.
3. Claude timeout은 사용자 흐름에서는 **응답 미전달의 결과**라고 적는다.
4. 독립 probe가 `chat_id`를 포함해 실패한 사실은 별도 테스트 결과로 분리해서 적는다.
5. 사용자에게는 "둘 중 하나만 고치면 끝난다"는 식으로 설명하면 안 된다.

---

## 후속 작업 우선순위

### 1. `chat_id` 자동 연결 설계 확정

목표:
- reverse ingress에서 생성되거나 전달된 `chat_id`가 Claude 응답 작성/반환 시 자동으로 따라오게 만들기

필요한 질문:
- `chat_id`를 Claude UI에서 직접 노출할지
- claude-adapter payload에 메타데이터로 붙일지
- bridge가 별도 correlation map을 유지할지

### 2. live completion 수집 구간 재검증

목표:
- 왜 `thread/status/changed active` 뒤에 `delta`/`completed`가 안 오는지 확인

필요 작업:
- 현재 실행 중인 `bridge` 프로세스가 실제 최신 코드인지 확인
- 필요하면 app-server와 remote 세션을 재시작
- 같은 probe를 다시 보내 notification dump 재수집

### 3. 설명 문구 수정

목표:
- 문서와 응답에서 `chat_id` 문제와 app-server completion 문제를 구분해서 서술

이유:
- 이번 대화에서 가장 큰 혼선은 기술적 오류 자체보다
  "어느 문제가 지금의 직접 원인이고, 어느 문제가 운영상 본질인가"를 내가 섞어서 말한 데서 발생했다.

---

## 이번 기록의 결론

이번 세션에서 남겨야 할 결론은 아래 세 줄이다.

1. `bridge/index.js`에는 notification queue와 completion 수집 보강 코드가 들어가 있다.
2. 사용자가 실제로 겪는 reverse timeout은 먼저 `chat_id`를 자동으로 이어붙이지 못해 reply가 안 나간 결과라고 기록해야 한다.
3. 별개로 내가 따로 실행한 `reverse path probe`는 `chat_id`를 직접 넣었음에도 30초 timeout으로 실패했고, 로그상 `active` 이후 completion 계열 notification이 보이지 않았다.
