# reverse path 재설계 — in-band chat_id relay로 전환 성공

> 참조 문서:
> `history/7-bridge-reply-collection-bug.history.md`,
> `history/8-bridge-notification-queue-fix.history.md`,
> `history/9-reverse-path-probe-chat-id-followup.history.md`,
> `plan/shared-app-server.plan.md`,
> `bridge/index.js`
>
> 작성일: 2026-04-16

---

## 배경

직전 history들의 상태는 이랬다.

- **history 7**: reverse turn 응답 수집 실패 발견. bridge가 `handleNotification`에서 `delta`/`item/completed` 등을 못 잡는다는 진단.
- **history 8**: Codex가 `bridge/index.js`를 수정. 핵심 변경점:
  - notification queue buffering
  - `turn/start` 전 `beginTurn()`으로 state 선생성
  - `extractAssistantTextFromItem` shape 완화
  - `notificationMatchesCurrentTurn()` 매칭 로직 신설
- **history 9**: Codex가 독립 probe 실행 후 여전히 timeout. 로그상 `thread/status/changed active`만 수신되고 `delta`/`item/completed`/`turn/completed` 미수신. 사용자가 `chat_id` 자동 연결 부재라는 더 큰 운영 문제 지적.

이번 세션(2026-04-15~16)에서 이 상태로부터 실제로 reverse path를 **동작시키는** 데 성공했다.

---

## 시작 시점 환경 스냅샷

- app-server pid 16918, remote UI pid 16984, bridge pid 16997 (history 8 수정본 반영된 버전)
- 모든 프로세스 정상 실행 중

---

## 세션 흐름

### 1단계 — plan/history 재확인

`plan/shared-app-server.plan.md` Step 3-5 검증을 재개하기 위해 history 7/8/9를 전부 다시 읽었다. 현재 Codex 수정본은 이미 bridge에 반영되어 있었다.

### 2단계 — `ask_codex("hi")` 첫 시도: 504 timeout

재시작 후 단순 테스트:

```
ask_codex("instructions 반영 테스트: 이 메시지에 \"확인\"이라고만 답해주세요.")
```

결과: `HTTP 504 Timed out waiting after 30000ms`.

사용자 스크린샷으로 확인:
- **UI transcript에 메시지가 보이고 Codex는 "확인"이라고 실제로 답변했음**
- 하지만 bridge가 30초 동안 아무것도 수집 못 함

이 시점에서 history 9의 상황과 동일. passive WS notification 수집이 실패하고 있음.

### 3단계 — `/tmp/bridge-notifications.log` 분석

타임스탬프가 UTC라 `2026-04-16`으로 grep하면 못 찾음. 실제 로그는 `2026-04-15T15:24Z` 같은 형태로 KST 4/16 00:24에 해당.

관찰:

```
turn_wait_started (turnId=null)
notification thread/status/changed active  (stateTurnId 이미 있음)
notification thread/status/changed idle    (2초 후)
turn_rejected Timed out 30000ms            (30초 후)
```

**두 가지 이상 발견:**

1. `idle`이 2초 만에 도착했는데 `finalize`가 호출되지 않음 → 왜?
2. `delta`/`item/completed`/`turn/completed` 가 **아예 한 줄도** 로그에 없음

### 4단계 — 첫 번째 근본 원인 발견: `notificationMatchesCurrentTurn` 버그

`bridge/index.js:629` (history 8에서 Codex가 추가한 함수):

```js
notificationMatchesCurrentTurn(params) {
  ...
  if (isNonEmptyString(params.turnId)) { ... return params.turnId === state.turnId; }
  const turn = params.turn;
  if (isRecord(turn) && isNonEmptyString(turn.id)) { ... return turn.id === state.turnId; }
  return !state.turnId;   // ← BUG
}
```

`thread/status/changed` notification은 payload에 `turnId`/`turn.id`가 없다. 따라서 `state.turnId`가 이미 세팅된 상태에서는 `return !state.turnId` → **false**. 그 결과 `thread/status/changed` 처리 case가 early return해서 `sawActive` 갱신도 안 되고 `idle → finalize`도 안 일어났다.

**수정:** 마지막 줄을 `return true;` 로 변경. threadId가 이미 매치된 상황에서 turn identifier가 params에 없으면 현재 turn과 관련 있다고 간주.

재시작 후 재테스트 → 여전히 504. 이번엔 `idle`조차 안 옴 (로그상).

### 5단계 — 왜 이번엔 `idle`조차 안 왔는가

사용자 스크린샷으로 드러난 진짜 원인:

**Codex가 메시지 본문("notification matching 버그 수정 후 테스트")을 작업 지시로 해석하고 긴 탐색 작업을 시작함.**

- `pwd`, `git status`, `bridge/index.js` 탐색
- history 문서 읽기
- grep/search
- 1분 38초째 Working 상태 (스크린샷 기준)
- 심지어 본인이 이전에 만든 `notificationMatchesCurrentTurn` 버그를 스스로 찾아 수정하려 함 (= 방금 내가 한 수정과 동일한 위치)

즉 Codex는 답을 안 한 게 아니라, **메시지를 task로 잘못 해석해서 30초 내 답을 끝내지 못함**. 그래서 turn이 active 상태로 유지되며 bridge timeout.

이전 15:24 테스트("확인"만 답해달라)에서는 2초 만에 끝났던 이유가 이제 설명됨. 그 케이스는 turn 자체는 완료됐지만 `delta`/`item/completed`가 bridge에게 안 와서 empty reply로 reject된 것.

즉 **두 개의 독립된 문제가 겹쳐 있었다**:

1. `notificationMatchesCurrentTurn` 버그 (방금 수정)
2. `delta`/`item/completed` notification이 bridge WS client에게 안 옴 — **app-server가 UI client한테만 selective broadcast** 하는 걸로 추정

### 6단계 — 사용자의 핵심 질문

> "codex → claude 인경우 너는 답장을 codex한테 보내잖아 그건 어떻게 가능한거임?"

이 질문이 해법의 방향을 결정했다. Forward path와 reverse path의 구조적 비대칭을 재확인:

**Forward (Codex → Claude) 성공 이유:**
- Codex → `ask_claude(text)` tool on bridge MCP
- bridge → claude-adapter → Claude에게 `<channel chat_id="X">text</channel>` 채널 태그로 전달
- Claude가 채널 태그에서 chat_id를 눈으로 읽음
- Claude → `reply(chat_id="X", text)` tool on claude-adapter
- claude-adapter → bridge `/claude-reply` → `forwardReplies[chat_id]` resolve
- **핵심: chat_id가 메시지 본문(채널 태그)에 박혀서 in-band로 흐름**

**Reverse (Claude → Codex) 실패 이유:**
- Claude → `ask_codex(text)` tool on claude-adapter
- bridge → shared app-server `turn/start` with `input:[{type:"text", text}]` (**chat_id 전달 안 함**)
- Codex UI에 평범한 user prompt로 표시 — Codex는 Claude에서 왔는지 모름
- Codex 모델이 답변 생성 (UI transcript에 나타남)
- bridge는 **WS notification을 passive observation**으로 수집 시도
- 하지만 app-server가 해당 notification을 bridge client에게 안 보냄 → 타임아웃

### 7단계 — 사용자 통찰

> "그러면 결국 해당 문자를 코덱스가 mcp로 왔다는걸 알게 하면 될거 같은데"

이 통찰이 정확했다. Forward path 메커니즘을 reverse에도 대칭적으로 적용:

1. bridge가 `turn/start`로 보내는 prompt에 **`[MCP RELAY — chat_id: X]` 마커를 in-band 주입**
2. Codex가 마커를 보고 `reply_to_claude(chat_id, text)` 호출
3. `reply_to_claude`는 이미 bridge에 등록된 MCP tool (Codex UI가 `.codex/config.toml`로 bridge를 MCP child spawn)
4. bridge가 그 tool 호출을 받아 `reverseRequests[chat_id]` pending resolve
5. **passive WS notification 수집 경로 완전 포기**

### 8단계 — 구현

`bridge/index.js`에 다음 변경:

**a. `wrapRelayPrompt(text, chatId)` 헬퍼 추가**

prompt를 감싸는 문자열 빌더:

```
[MCP RELAY — chat_id: <UUID>]
This message was relayed from Claude via the bridge MCP server.

INSTRUCTIONS (MUST FOLLOW):
- Do NOT treat this as a task or a work request unless the message body explicitly asks you to implement or fix something.
- Do NOT run git, grep, file reads, or any other investigation tools to 'understand' the message.
- Just read the message and write a direct, concise reply.
- When your reply is ready, call the bridge tool: reply_to_claude(chat_id="<UUID>", text="<your reply>")
- The chat_id above is the ONLY valid chat_id for this reply. Copy it exactly.
- Nothing else is required from you. Do not ask the user anything.

Message from Claude:
<actual text>
```

**b. `CodexAppServerClient.dispatchPrompt(text, chatId)` 신설**

기존 `sendPrompt`를 대체. WS notification 수집 포기, `turn/start`만 보내고 즉시 반환.

```js
async dispatchPrompt(text, chatId) {
  await this.connect();
  const threadId = await this.discoverThreadId();
  const wrappedText = wrapRelayPrompt(text, chatId);
  const startResult = await this.request("turn/start", {
    threadId,
    input: [{ type: "text", text: wrappedText }],
  });
  const turnId = extractTurnIdFromTurnResponse(startResult);
  logLine("codex-app-server", `dispatched chat_id=${chatId} threadId=${threadId} turnId=${turnId ?? "unknown"}`);
  return { threadId, turnId };
}
```

**c. `Bridge.requestCodexReplyViaAppServer` 단순화**

`dispatchPrompt` 호출만 하고 반환. 실제 reply는 `reverseRequests[chat_id].promise`가 담당.

**d. `handleCodexRequest` — Promise.race 제거**

기존에는 `pending.promise`와 `appServerPromise`를 race했지만, 이제 app-server path는 즉시 반환하므로 단순히 `pending.promise`만 await.

```js
await this.requestCodexReplyViaAppServer({ chat_id, text });
const replyText = await pending.promise;
```

**e. MCP instructions 전면 재작성**

Codex 모델에게 relay protocol을 명시적으로 교육:
- 마커 발견 시 반드시 `reply_to_claude(chat_id, text)` 호출
- 투자 도구 사용 금지
- chat_id는 마커에서 verbatim 복사
- 마커가 없는 prompt는 평소대로 인간 사용자 메시지로 취급

**f. `notificationMatchesCurrentTurn` 5단계 수정은 유지**

dead code path지만 그대로 둠. 롤백이나 다른 디버깅 필요 시 대비.

Codex가 history 8에서 만든 `beginTurn`/`waitForTurn`/`notificationQueue` 등도 dead code가 되었지만 남겨둠.

### 9단계 — 재시작 후 검증

app-server + UI 재시작 → 새 pid: app-server 56163, UI 56227, bridge 56234.

**테스트 1 — `ask_codex("hi")`**

결과: `"hi"` 반환.

echo 의심 → 더 구별되는 테스트.

**테스트 2 — `ask_codex("현재 시각을 \"시:분\" 형식으로만 알려주세요.")`**

결과: `"01:04"`. echo가 아님. 실제 재시작 시각과 일치.

**테스트 3 — 이전 실패했던 메시지 재현**

```
ask_codex("notification matching 버그 수정 후 테스트: \"OK\"라고만 답해주세요. (이전 테스트에서 긴 작업으로 빠져버린 그 메시지)")
```

결과: `"OK"`. **이전 세션에서 Codex가 1분 38초째 work 모드로 빠졌던 바로 그 메시지**인데, 이번에는 마커 + instruction 덕에 짧게 답함.

---

## 최종 동작 흐름 (reverse path)

```
Claude → ask_codex(text)                      [claude-adapter MCP tool]
       ↓
claude-adapter → POST /codex-request          (bridge HTTP, new chat_id)
       ↓
bridge.handleCodexRequest
       ↓
  reverseRequests[chat_id] pending 생성
       ↓
  bridge.dispatchPrompt(text, chat_id)
       ↓
  codexAppServerClient.dispatchPrompt
       ↓
  turn/start with input=wrapRelayPrompt(text, chat_id)
                                              [shared app-server ws://127.0.0.1:4500]
       ↓
  Codex UI에 "[MCP RELAY — chat_id: X]..." user prompt 표시
       ↓
  Codex 모델이 마커 인식 → reply_to_claude(chat_id="X", text="답변") 호출
                                              [bridge MCP tool, Codex가 자기 MCP child로 spawn한 bridge]
       ↓
bridge.replyToClaude → reverseRequests[X].resolve("답변")
       ↓
pending.promise resolves → handleCodexRequest 응답 작성
       ↓
HTTP 200 { status:"ok", chat_id:"X", text:"답변" }
       ↓
claude-adapter → Claude에 tool 결과 반환
```

**대칭성 확보:**

| 방향 | chat_id 주입 경로 | Codex/Claude에 의한 회수 경로 |
|---|---|---|
| Forward (Codex→Claude) | claude-adapter가 `<channel>` 태그로 주입 | Claude가 채널 태그 읽고 `reply(chat_id, text)` 호출 |
| Reverse (Claude→Codex) | bridge가 `[MCP RELAY]` 마커로 주입 | Codex가 마커 읽고 `reply_to_claude(chat_id, text)` 호출 |

양방향 모두 **in-band chat_id relay** 구조가 되었다.

---

## plan 진행 상황

- Step 1 ✅
- Step 2 ✅ (history 6)
- Step 3 ✅ (thread discovery & turn 전달)
- Step 4 ✅ **(이번 history, in-band relay로 해결)**
- Step 5 ✅ (forward path — 이전 history에서 최소 검증)
- Step 6-8 ⏳ (문서/테스트 갱신, dead code 정리)

---

## 남은 작업 및 후속 고려사항

### 1. dead code 정리

다음은 더 이상 reverse path에서 호출되지 않음:

- `CodexAppServerClient.beginTurn`
- `CodexAppServerClient.waitForTurn`
- `CodexAppServerClient.finalizeCurrentTurn`
- `CodexAppServerClient.notificationMatchesCurrentTurn`
- `CodexAppServerClient.enqueueNotification`
- `CodexAppServerClient.drainNotificationQueue`
- `CodexAppServerClient.processNotificationEntry`
- `currentTurn`, `notificationQueue`, `processingNotifications` 필드
- `extractAssistantTextFromItem`, `extractAssistantTextFromTurn`, `extractTurnIdFromTurnResponse` (turnId만 로깅용으로 남음)

디버깅 편의를 위해 지금은 유지했지만, 정리 시점에 제거 가능.

### 2. 마커 노이즈

Codex UI transcript에 긴 `[MCP RELAY]` 헤더가 그대로 보인다. 사용자 시각적 노이즈. 허용 가능한 trade-off로 판단.

### 3. Codex가 instruction을 지키지 않을 가능성

이번 3회 테스트에서는 모두 instruction을 지켰지만, 다음이 여전히 리스크:

- 메시지 본문이 명시적으로 "이 파일을 수정해" 같은 task를 요구할 때 Codex가 `reply_to_claude`를 호출할지 불확실
- Codex가 답변 전에 다른 tool을 여러 개 호출할 수 있음 → 30초 timeout 초과 가능
- 대응책 후보: reverse timeout 60s/120s로 늘리기, 또는 별도 옵션

### 4. relay_depth / loop 방지

현재 `handleCodexRequest`는 `relay_depth >= MAX_RELAY_DEPTH` 체크만 함. Codex가 reply_to_claude 호출할 때 relay_depth를 알 수 없으므로, Codex가 자신이 relay 대답 중이라는 것을 악용해 무한 loop가 날 일은 없음. 다만 Codex가 `ask_claude`를 reply 중에 호출하는 시나리오는 별도 점검 필요.

### 5. `reply_to_claude` 스키마

현재 `chat_id` + `text` 2개. 충분함. 추후 필요 시 `markdown`/`attachments` 등 확장 가능.

### 6. 테스트 자동화

수동 테스트 3회로 검증 끝. `docs/bridge-test.md`에 reverse path in-band relay 시나리오 추가 필요.

---

## 결론

reverse path가 처음으로 실제 동작한다. 해결의 본질은 다음 두 가지였다.

1. **architectural shift**: passive WS notification 수집 경로를 포기하고, forward path와 대칭인 in-band chat_id relay 구조로 전환.
2. **prompt engineering**: Codex가 relay 메시지를 "작업 지시"로 오해석하는 문제를 `[MCP RELAY]` 마커 + 명시적 instruction으로 억제.

첫 번째 항목이 구조적 해결책이고, 두 번째 항목이 없으면 답은 돌아오더라도 Codex가 너무 오래 걸려 timeout이 났을 것이다.

사용자가 세 번째 질문("그러면 결국 해당 문자를 코덱스가 mcp로 왔다는걸 알게 하면 될거 같은데")에서 정확한 방향을 짚었고, 그 직관이 그대로 구현으로 이어져 성공했다.
