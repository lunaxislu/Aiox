# bridge notification parsing / turn queue fix

> 참조 문서:
> `history/7-bridge-reply-collection-bug.history.md`,
> `plan/shared-app-server.plan.md`,
> `bridge/index.js`,
> `/tmp/bridge-probe.mjs`
>
> 작성일: 2026-04-15

---

## 배경

`history/7-bridge-reply-collection-bug.history.md`에서 확인된 문제는 두 축이었다.

1. bridge가 Codex app-server notification 이름/구조를 일부 추정으로 해석하고 있었다.
2. `turn/start` 요청 응답을 기다리는 동안 초기 notification이 먼저 도착하면 `this.currentTurn` 또는 `turnId`가 아직 준비되지 않아 drop될 수 있었다.

---

## 이번 작업

### 1. probe 스크립트 작성

요청대로 `/tmp/bridge-probe.mjs`를 작성했다.

동작:
- `ws://127.0.0.1:4500` 연결
- `initialize`
- `thread/loaded/list`
- `turn/start` (`input: "probe test"`)
- 이후 5초 동안 수신되는 JSON-RPC notification의 `method`, `params`를 `JSON.stringify`로 stdout 덤프

비고:
- 현재 Codex 세션 안에서 실행한 probe는 WS `error` event만 반환하고 raw payload를 출력하지 못했다.
- 다만 app-server는 실제로 LISTEN 중이었고, 사용자가 `probe test`를 확인해 준 점으로 보아 turn 전달 자체는 별도로 관찰되었다.
- runtime dump가 비어 있었기 때문에, 설치된 Codex의 `codex app-server generate-json-schema --out ...` 결과를 추가로 확인해 실제 서버 notification 스키마를 보강 근거로 사용했다.

---

## 확인된 실제 스키마

로컬에서 추출한 Codex app-server v2 JSON schema 기준:

- notification method
  - `thread/status/changed`
  - `turn/started`
  - `turn/completed`
  - `item/completed`
  - `item/agentMessage/delta`
  - `thread/realtime/itemAdded`

- payload 핵심 shape
  - `item/agentMessage/delta`: `{ threadId, turnId, itemId, delta }`
  - `item/completed`: `{ threadId, turnId, item }`
  - `thread/realtime/itemAdded`: `{ threadId, item }`
  - `turn/completed`: `{ threadId, turn }`

중요한 점:
- `Turn.items`는 schema 설명상 `thread/resume` / `thread/fork` 응답에서만 채워질 수 있고,
  `turn/completed` notification에서는 빈 배열일 수 있다.
- 즉 최종 assistant 본문은 `turn/completed.turn.items`에 의존하면 안 되고,
  `item/completed` 또는 `thread/realtime/itemAdded`를 우선 수집해야 한다.

---

## 코드 수정

### `bridge/index.js:290` `extractAssistantTextFromItem`

기존:
- `item.type === "agentMessage" && item.text`만 허용

수정:
- nested `item.item` 재귀 처리
- `content[]` 안의 string / `{ text }`도 조합
- 마지막 fallback으로 top-level `text`도 허용

의도:
- `thread/realtime/itemAdded`처럼 wrapper object가 오거나,
  item shape가 약간 다르더라도 assistant text를 보존

### `bridge/index.js:486` 이후 turn 대기 구조

기존:
- `turn/start` 응답을 받은 뒤 `waitForTurn(threadId, turnId)` 호출
- 따라서 초기 notification이 먼저 오면 `currentTurn` 미설정 상태로 drop 가능

수정:
- `beginTurn(threadId)`로 state를 먼저 생성하고 `this.currentTurn`를 선설정
- 이후 `turn/start` 요청 수행
- 응답에서 `turnId`를 받으면 state에 주입 후 queue drain

### notification queue buffering

추가:
- `this.notificationQueue`
- `this.processingNotifications`
- `enqueueNotification()` / `drainNotificationQueue()` / `processNotificationEntry()`

동작:
- active turn이 있을 때 들어오는 notification은 즉시 버리지 않고 queue에 적재
- `turnId`가 아직 없으면 matching 가능한 범위(`threadId`, `turn.id`, `turnId`)로 state에 귀속
- `turn/start` 응답 후 queue를 drain 하면서 누락된 초기 delta / completion을 복구

### `handleNotification` switch 보정

실제 처리 기준:
- `thread/status/changed`: `active` / `idle` 기반 완료 판정
- `turn/started`: turn 식별 보조
- `item/agentMessage/delta`: streaming text 축적
- `item/completed`: authoritative item text 수집
- `thread/realtime/itemAdded`: realtime item text 수집
- `turn/completed`: 완료 신호로 사용, `turn.items`는 보조적으로만 읽음
- `turn/failed`: 현재 turn reject

보정 포인트:
- 추정 alias였던 `agentMessage/delta`, `thread/realtimeItemAdded` 케이스 제거
- `turn/completed`에서 `turn.items` 비어도 완료 신호 자체는 인정
- `thread/status/changed`의 `idle`은 `active` 또는 `turn/completed`를 본 뒤에만 finalize

---

## 검증

실행:
- `node --check bridge/index.js` ✅

미실행:
- live bridge process 재기동 후 end-to-end reverse 검증은 이번 세션에서 수행하지 않음
- 현재 실행 중인 bridge pid는 이미 구버전 코드로 떠 있으므로, 수정 반영에는 bridge 재시작이 필요

현재 프로세스 관찰:
- app-server pid 75837
- remote UI pid 98031/98032
- bridge pid 98034 (app-server child)

즉 현재 환경에서는 **app-server 재시작이 bridge 재로딩의 확실한 방법**이다.

---

## 사용자 액션 필요

1. shared app-server 재시작
   - 기존 프로세스 종료 후 다시 실행:
   - `codex app-server --listen ws://127.0.0.1:4500`

2. remote UI 재접속
   - `codex --remote ws://127.0.0.1:4500`

3. forward path 1회 검증
   - Codex 쪽에서 `ask_claude("forward path probe")` 같은 짧은 호출 1회 실행
   - Claude reply가 돌아오면 Step 5 forward path 회귀 통과

4. reverse path 재검증
   - Claude 쪽에서 `ask_codex(...)` 1회 호출
   - 이번 수정의 핵심은 empty reply 제거 여부 확인

---

## 결론

이번 수정은 두 가지를 직접 해결한다.

1. **실제 app-server 스키마에 맞춘 notification 해석**
2. **`turn/start` 응답 전후 race를 notification queue buffering으로 흡수**

남은 확인은 live 재시작 후 왕복 테스트뿐이다.
