# bridge reply 수집 버그 발견 — Step 3-5 검증 중단

> 참조 문서:
> `plan/shared-app-server.plan.md`,
> `history/6-bridge-ws-client-validation.history.md`,
> `bridge/index.js`
>
> 작성일: 2026-04-15

---

## 배경

`plan/shared-app-server.plan.md` Step 3-5 검증 시작. history 6에서 Step 2 (bridge WS client)는 성공으로 마감됐으나, 실제 reverse turn 왕복이 재현되지 않는 상태를 Step 4에서 확인했다.

---

## 환경 스냅샷

- app-server: pid 75837, `ws://127.0.0.1:4500` LISTEN ✅
- UI: pid 88585, `codex --remote ws://127.0.0.1:4500` 실행 중 ✅
- bridge: pid 88597, UI가 spawn ✅
- claude-adapter: pid 78954 ✅

---

## 테스트 실행

### 시도 1 — `ask_codex` 호출

```
ask_codex("[Step 3-5 검증 테스트 1/3] ... '확인: 보임'만 답하셔도 됩니다.")
```

결과:
```
HTTP 500 {"error":"Codex turn completed with empty reply turnId=019d902c-db5d-73c2-bda1-cebddf2abed8"}
```

### 시도 2 — 재시도

```
ask_codex("[재시도] ... '확인: 보임' 이라고만 답해주세요.")
```

결과:
```
HTTP 500 {"error":"Codex turn completed with empty reply turnId=019d902d-258d-7190-8cbc-4ce35e589e6b"}
```

### UI transcript 관찰 (사용자 스크린샷)

- 두 요청 모두 UI transcript에 **사용자 메시지가 그대로 나타남** (bridge → app-server → UI 전달 성공)
- Codex가 두 요청 모두에 `확인: 보임` 이라고 **답변을 정상 생성** (UI에 보임)
- 하지만 bridge는 그 응답을 수집하지 못하고 `empty reply` 판정

---

## 진단

### Step 3 — thread discovery
**✅ 동작함.** `thread/loaded/list` → `turn/start` 경로가 UI transcript에 도달하고 있으므로 threadId는 UI와 동기화됨.

### Step 4 — reverse turn 응답 수집
**❌ 실패.** bridge가 Codex 응답의 어떤 notification도 `waitForTurn()` 상태에 축적하지 못한다.

`bridge/index.js:518` `finalizeCurrentTurn()` 가 호출되는 시점에 `state.finalText == null` 이고 `state.deltas` 가 비어 있음. 즉 `item/agentMessage/delta`, `item/completed`, `thread/realtime/itemAdded`, `turn/completed` 중 어느 것도 매치하지 않았거나, 매치했더라도 내용을 추출하지 못했다.

### Step 5 — forward path (`ask_claude`)
**✅ 동작함.** Codex가 "forward path probe" 메시지 전송 → bridge 수신 → Claude Code 도착 → reply 반환 → Codex 결과 확인 (chain 성공).
- `ask_claude` tool 경로: Codex → `/codex-reply` HTTP 응답 없음, 대신 bridge MCP `/ask_claude` 도구 실행 → `postToClaudeAdapter` HTTP POST → reply 대기
- 오히려 이것은 reverse path의 역방향. forward의 완벽한 검증은 Codex가 수동으로 `ask_claude` tool을 호출할 때 가능.

---

## 원인 후보

1. **notification method 이름 불일치**
   - 현재 `handleNotification` switch: `item/agentMessage/delta`, `agentMessage/delta`, `item/completed`, `thread/realtime/itemAdded`, `thread/realtimeItemAdded`, `turn/completed`, `thread/status/changed`
   - 실제 Codex app-server (최신 빌드)가 내보내는 이름이 위 목록과 다를 수 있음
   - 특히 `turn/completed` 의 params shape (`turn.items`) 가 실제와 다를 가능성

2. **`waitForTurn()` race**
   - `request("turn/start")` 가 `await` 로 응답을 기다리는 동안, app-server가 이미 notification을 보내기 시작할 수 있음
   - `this.currentTurn = state` 설정은 `request` 응답 **이후** 이루어지므로, 초기 notification (`thread/status/changed` active, delta 일부) 가 drop될 수 있음
   - idle 이후 뒤늦게 state 가 설정되면 `sawActive=false` 인 채로 남아 결국 timeout이거나, 다른 경로로 `finalize` 되어 empty reply 가 될 가능성

3. **extractAssistantTextFromTurn / extractAssistantTextFromItem 시그널 불일치**
   - `item.type === "agentMessage"` 만 체크. 실제 type이 `agent_message`, `assistant_message`, `AgentMessage` 등일 수 있음

---

## 다음 세션에서 할 일

### 진단 (먼저)

**A. notification raw dump probe**
- `/tmp/test-turn-start.mjs` 를 기반으로 probe 스크립트 작성
- WS 붙어서 `initialize` → `thread/loaded/list` → `turn/start` → 들어오는 모든 JSON-RPC message 를 `method` + `params` 구조째 stdout 에 덤프
- bridge 재시작 / UI 세션 유지 필요 없음
- 목적: 실제 method 이름과 payload 구조 확정

**B. (A 실패 시) bridge raw log 추가**
- `handleMessage` 에서 모든 수신 raw 를 stderr 에 찍는 로그 추가
- bridge 는 codex UI 가 spawn 하므로 재시작 위해 UI 재기동 필요 (비용 있음)

### 수정 방향

1. probe 결과로 확인된 실제 method/field 이름에 맞춰 `handleNotification` switch 보정
2. `waitForTurn()` race 해결: `this.currentTurn = state` 를 `turn/start` 요청 **전** 에 설정하거나, notification 을 `pendingNotifications` 큐에 임시 버퍼링
3. `extractAssistantTextFromItem` 의 type 체크 완화

### 테스트

- 수정 후 `ask_codex` 로 reverse 왕복 재검증 (Step 4)
- forward path 는 사용자가 Codex UI 에서 `ask_claude` tool 호출을 수동 트리거 (Step 5)

---

## 현재 plan 진행 상황

- Step 1 ✅
- Step 2 ✅ (history 6)
- Step 3 ✅ (thread discovery & turn 전달 확인)
- Step 4 ❌ (응답 수집 버그 — 본 history)
- Step 5 ✅ (forward path 최소 검증 완료 — codex → Claude via bridge)
- Step 6-8 ⏳

---

## 추가 검증 (같은 세션, 후반)

### Step 5 forward path 임시 검증

Codex UI에서 "forward path probe" 메시지 전송 후:
- bridge 수신 → claude-adapter 경유 → Claude Code 도착 ✅
- Claude Code 에서 reply 반환 → bridge → Codex (결과 확인 예정)

**판정**: forward path chain 최소한 부분 동작. 단, `ask_claude` tool의 완벽한 검증은 Codex가 수동으로 tool 호출할 때 가능.

---

## 결론

bridge WS client 는:
- ✅ connection & handshake
- ✅ thread discovery
- ✅ turn/start 전달 (UI transcript 도달)
- ✅ forward path reply 반환 (Codex → Claude)
- ❌ reverse reply 수집 (Codex 응답 notification 미처리)

**핵심 문제**: `handleNotification` switch 의 method 이름이나 params 구조가 실제 Codex app-server 빌드의 것과 불일치. 또는 `waitForTurn()` race 로 초기 notification drop.

다음 세션에서 probe 스크립트로 실제 notification shape 를 확정한 뒤 `bridge/index.js:589` 보정 필요.
