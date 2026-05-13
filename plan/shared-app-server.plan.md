# shared Codex App Server 전환 계획

> 참조 문서:
> `history/1-bridge.history.md`,
> `history/4-bridge-app-server-live-session-investigation.history.md`,
> `history/5-shared-app-server-validation.history.md`,
> `history/6-bridge-ws-client-validation.history.md`,
> `history/7-bridge-reply-collection-bug.history.md`,
> `history/8-bridge-notification-queue-fix.history.md`,
> `history/9-reverse-path-probe-chat-id-followup.history.md`,
> `history/10-reverse-path-inband-relay.history.md`,
> `docs/bridge.spec.md`,
> `docs/bridge-test.md`,
> `docs/legacy/app-server-legacy.md`,
> `docs/legacy/bridge-app-server-live-session-plan-legacy.md`
>
> 작성일: 2026-04-15
> 최종 갱신: 2026-05-13 (Step 1~8 완료, dead code 정리 반영)

---

## 진행 상태 요약 (2026-05-13)

Step 1~8 **모두 완료**. 코드와 문서는 이미 shared app-server + in-band chat_id relay 구조에 도달.
단, Step 4 원안(passive WS notification 수집)은 도중에 폐기되고 **in-band chat_id relay**로 reframe됨 (`history/10`).

| Step | 상태 | 결정적 참조 |
|---|---|---|
| 1. endpoint 규약 확정 | ✅ | `history/5` |
| 2. WS client 도입 | ✅ | `history/6` |
| 3. thread discovery | ✅ | `history/5`, `history/10` |
| 4. reverse turn 경로 교체 | ✅ (in-band relay로 reframe) | `history/7`~`history/10` |
| 5. forward path 유지 | ✅ | `history/10` |
| 6. child-codex 경로 제거 | ✅ (2026-05-13 dead code 정리 반영) | 이 문서 하단 §Step 6 기록 |
| 7. 사용자 워크플로 문서화 | ✅ | `docs/bridge.spec.md` §7, §11 |
| 8. 테스트 절차 갱신 | ✅ | `docs/bridge-test.md`, `plan/refactor.md` 1D smoke |

후속 과제는 별도 trace로 분리:

- **resume/restart safe relay** — `history/11`, `history/12` → `plan/refactor.md` Step 9 (durable relay broker)
- **bridge 모듈 분리/테스트** — `plan/refactor.md` Step 1~8

---

## 배경

이전 plan (`bridge-app-server-live-session.plan.md`)은 bridge가 Codex App Server에 client로 연결한다는 방향까지는 정리했지만, **어떤 endpoint에 연결하는가**를 명확히 하지 않았다.

2026-04-15 디버깅 과정에서 확인된 사실:

- bridge가 `codex mcp-server` (= 내부적으로 `codex app-server --listen stdio://`) 를 **자체 child로 spawn** 하고 있었다.
- Codex UI (사용자가 터미널에서 실행한 `codex`)는 bridge가 spawn한 child app-server와는 **별개의 live 세션**이다.
- 따라서 bridge가 threadId를 맞춰 turn을 보내도 UI transcript에 나타나지 않는다.
  - `threadId` = conversation key
  - `app-server endpoint` = transport key
  - 둘 다 일치해야 같은 화면에서 보인다.

이 plan의 핵심은 **bridge와 Codex UI가 같은 app-server endpoint를 공유**하도록 만드는 것이다.

---

## Summary

외부에 고정된 shared Codex App Server를 하나 띄우고, Codex UI와 bridge가 둘 다 그 endpoint에 client로 붙는다.

```
                shared Codex app-server
                 (ws://127.0.0.1:4500)
                        ▲
            ┌───────────┴───────────┐
            │                       │
     bridge client           Codex UI client
     (WS connection)       (codex --remote ws://...)
```

이 구조에서:

- bridge는 더 이상 child app-server를 spawn하지 않는다.
- Codex UI는 `codex`가 아니라 `codex --remote ws://127.0.0.1:4500`으로 실행한다.
- bridge가 `thread/start` 또는 `thread/resume`으로 시작한 turn이 같은 endpoint를 보고 있는 UI에 실시간으로 보인다.

---

## Goals

1. bridge가 외부 shared app-server에 WS client로 연결한다.
2. Codex UI가 동일 endpoint에 remote client로 연결된다.
3. Claude → Codex reverse turn이 UI transcript에 실제로 보인다.
4. 기존 forward path (`ask_claude`)는 깨지지 않는다.
5. bridge 프로세스 누적 (child Codex spawn) 문제가 재발하지 않는다.

---

## Non-goals

- Codex UI를 bridge 내부에서 launch하지 않는다. UI 실행은 사용자 책임이다.
- 여러 개의 app-server 인스턴스를 자동 관리하지 않는다. endpoint는 하나로 고정한다.
- `elicitInput` / `sampling/createMessage` 경로는 사용하지 않는다 (Codex CLI가 지원하지 않음).
- `codex exec` helper turn은 active path에서 제거한다. debug fallback으로도 유지하지 않는다.

---

## Implementation Plan

### Step 1. App Server endpoint 규약 확정 ✅

2026-04-15 검증 결과:

- Transport: `codex app-server --listen ws://127.0.0.1:4500` 로 WS 모드 확정.
- 기본값: `ws://127.0.0.1:4500`
- env/CLI override: `CODEX_APP_SERVER_URL`, `--codex-app-server-url`
- UI 실행: `codex --remote ws://127.0.0.1:4500`
- 프로토콜 스키마는 `codex app-server generate-json-schema --out DIR` 로 완전 추출 가능.
- 판정: `initialize` handshake 성공 여부를 connection health 기준으로 사용.

확인된 client 요청 메소드 (bridge 관심 대상):

| 용도 | method |
|---|---|
| 핸드셰이크 | `initialize` |
| thread 생성 | `thread/start` |
| thread 재사용 | `thread/resume` |
| loaded thread 조회 | `thread/loaded/list` |
| thread 목록 | `thread/list` |
| 사용자 메시지 전송 | `turn/start` |
| turn 취소 | `turn/interrupt` |
| turn 수정 | `turn/steer` |

확인된 server notification (bridge 관심 대상):

- `ThreadStartedNotification`
- `TurnStartedNotification`
- `TurnCompletedNotification` ← reverse 응답 판정 기준
- `AgentMessageDeltaNotification` ← streaming 본문
- `ThreadRealtimeItemAddedNotification`

### Step 2. bridge에 App Server WS client 도입 ✅

- 기존 `startCodexMcpClient()` 를 제거한다.
  - `StdioClientTransport` + `codex mcp-server` spawn 경로는 전부 제거.
- 새 WS client 모듈을 추가한다.
  - shared endpoint에 WebSocket으로 연결.
  - initialize handshake 수행.
  - connection lost 시 재시도 정책 정의 (exponential backoff, max attempts).
- `CODEX_APP_SERVER_URL` / `--codex-app-server-url` 옵션 처리.
- endpoint 미설정 또는 연결 실패 시 명시적 에러로 bridge를 종료한다 (silent fallback 금지).

결과 (`history/6`):

- `CodexAppServerClient` 클래스로 도입 완료 (`bridge/src/index.ts`).
- `initialize` handshake + on-demand `thread/loaded/list` / `turn/start` 흐름.
- `--codex-app-server-url` / `CODEX_APP_SERVER_URL` CLI/env 옵션 처리.
- 연결 실패 시 reverse 요청을 명시적 에러로 거절 (silent fallback 없음).

### Step 3. thread lifecycle 관리 & UI thread discovery ✅

bridge가 붙는 thread는 **UI가 현재 보고 있는 thread와 동일**해야 transcript에 나타난다. 따라서 bridge는 자기가 `thread/start`로 만든 thread에 고정되면 안 된다.

전략 (우선순위 순):

1. **loaded thread discovery** (기본 경로)
   - bridge가 `initialize` 성공 후 `thread/loaded/list` 를 호출한다.
   - 응답에 loaded thread가 1개 있으면 → 그 threadId로 `thread/resume`.
   - 응답에 loaded thread가 없으면 → `thread/start` 로 새로 만든다 (UI가 아직 붙지 않은 상태).
   - 응답에 loaded thread가 여러 개 있으면 → 가장 최근 것 또는 명시적 선택 전략 (Open Questions 참조).

2. **thread/list fallback**
   - `thread/loaded/list` 가 빈 응답을 주는데 `thread/list` 에는 최근 thread가 있으면, 가장 최근 thread를 `thread/resume` 한다.

3. **새 thread 생성** (마지막 수단)
   - 어떤 thread도 없으면 `thread/start` 로 만든다.
   - 이 경우 UI가 나중에 붙으면 bridge가 만든 thread를 UI 쪽에서 resume해야 한다.

thread state:

- bridge는 현재 active threadId를 in-memory로 캐시한다.
- 연결이 끊겼다가 재연결되면 discovery 전략을 다시 실행한다 (UI가 중간에 thread를 바꿨을 수 있음).
- 영속화는 non-goal.

thread 동기화 검증:

- bridge가 resume한 threadId와 UI가 보고 있는 threadId가 실제로 같은지 `ThreadStartedNotification` 또는 `TurnStartedNotification` 의 threadId 필드로 확인한다.
- 불일치하면 명시적 에러를 Claude tool 호출로 반환한다.

결과 (`history/5`, `history/10`):

- `discoverThreadId()`는 `thread/loaded/list` 단일 호출로 구현 (history/5에서 검증).
- 응답이 비면 `No loaded Codex thread` 명시적 에러로 거절. (`docs/bridge.spec.md` §7)
- history/10에서 **loaded thread에는 `thread/resume` 없이 바로 `turn/start` 가능**함을 확인 — 그래서 bridge는 resume을 호출하지 않는다.
- 다중 thread 정책은 현재 "첫 번째 사용" 단순 정책. 필요 시 향후 env override 도입 여지만 남김.

### Step 4. reverse turn 경로 교체 ✅ (in-band relay로 reframe)

- `requestCodexReplyViaMcp()` 를 shared app-server 호출 기반으로 재작성한다.
  - child Codex 호출 제거.
  - `turn/start` 요청 → `turn/completed` notification 대기.
  - `item/started`, `item/completed`, `agentMessage/delta` 수집 후 Claude pending에 resolve.
- 응답이 turn 단위로 완결될 때까지 기다렸다가 Claude로 반환한다.
- timeout은 기존 30초 유지.

결과 (`history/7`~`history/10`):

- 위 원안의 **passive WS notification 수집은 폐기**. 이유: shared app-server가 `agentMessage/delta`, `item/completed`, `turn/completed` 등 핵심 notification을 bridge WS client에는 selective broadcast하지 않음 (UI client 전용으로 관찰됨, `history/9` ~ `history/10`).
- 대신 **in-band chat_id relay**로 reframe (`history/10`).
  - bridge는 shared app-server에 WS로 붙어 `turn/start`만 보낸다 (fire-and-forget).
  - prompt를 `wrapRelayPrompt(text, chat_id)` 마커로 감싼다: `[MCP RELAY — chat_id: <UUID>]` + 처리 지침.
  - Codex 모델이 마커를 보고 **자기가 spawn한 bridge MCP child**의 `reply_to_claude(chat_id, text)` tool을 호출.
  - bridge가 그 tool 호출을 받아 `reverseRequests[chat_id]` pending을 resolve.
- 결과적으로 forward와 reverse가 동일한 **in-band chat_id relay 패턴**으로 통일됨. 자세한 구현 명세는 `docs/bridge.spec.md` §3, §6, §7, §8 참조.
- timeout 30초 유지.

### Step 5. forward path 유지 확인 ✅

- `ask_claude(text)` → claude-adapter → Claude Code → reply → bridge pending 경로는 건드리지 않는다.
- forward는 shared app-server와 무관하므로 Step 2–4의 영향을 받지 않는지 회귀 테스트한다.

결과 (`history/10`, `plan/refactor.md` 1D smoke):

- forward path는 shared app-server 도입 영향을 받지 않음. claude-adapter → Claude → `reply` → `POST /claude-reply` 경로 그대로.
- 2026-05-13 1D smoke에서 forward 왕복 정상 동작 재확인 (chat_id `b1a5…`, event log `forward_pending_created → resolve → claude_reply_resolved → finished`).

### Step 6. 기존 child-codex 경로 완전 제거 ✅

- `startCodexMcpClient()`, `codexMcpClient`, `codexMcpReady`, `codexThreadId` 중 shared endpoint client로 치환되는 것들을 정리한다.
- `mcp_servers={}` 인자로 child Codex에 설정 주입 차단하던 로직도 제거한다 (child를 띄우지 않으므로 불필요).
- `codex exec` helper turn 경로가 남아 있다면 동시에 제거한다.

결과 (2026-05-13 정리):

- 다음은 `bridge/src/index.ts`에서 이미 제거됨 (history/10 이후 후속 정리 누적분 포함):
  - `startCodexMcpClient`, `codexMcpClient`, `codexMcpReady`, `codexThreadId`
  - `codex exec` helper turn 관련 코드 일체
  - history/8에서 들어왔던 in-flight passive notification 인프라:
    `beginTurn`, `waitForTurn`, `finalizeCurrentTurn`,
    `notificationMatchesCurrentTurn`, `enqueueNotification`,
    `drainNotificationQueue`, `processNotificationEntry`,
    필드 `currentTurn` / `notificationQueue` / `processingNotifications`
  - 본문 텍스트 추출 helper: `extractAssistantTextFromItem`, `extractAssistantTextFromTurn`
- 잔존 유틸: `extractTurnIdFromTurnResponse` 1개.
  - 사유: `dispatchPrompt` 안에서 `turn/start` 응답의 turnId를 stderr 로그로 남기는 데만 쓰임.
  - reverse 경로에서 functional path는 아니지만, 진단 시 chat_id ↔ turnId 매핑 추적에 유용.
  - 진단 단순화가 우선시되는 시점에 inline 또는 제거 가능.

### Step 7. 사용자 실행 흐름 문서화 ✅

- `docs/bridge.spec.md` 에 shared app-server 전제를 명시한다.
- 사용자 워크플로:
  1. 터미널 A: `codex app-server --listen ws://127.0.0.1:4500` 실행
  2. 터미널 B: `codex --remote ws://127.0.0.1:4500` 로 UI 띄움
  3. 터미널 C: `claude` 실행 (bridge는 Codex가 spawn할 때 자동 시작)
- 세 터미널 기동 순서와 실패 시 각 레이어가 어떻게 드러나는지 정리한다.
- 가능하면 wrapper 스크립트 (`scripts/start-shared-codex.sh`) 로 A+B를 묶는다.

결과:

- `docs/bridge.spec.md` §7 (3-terminal 워크플로), §11 (실패 시 진단 포인트) 반영 완료.
- `bridge/README.md` 동기 갱신 (2026-05-13 1D 정리에서 `dist/index.js` 경로도 함께 갱신).
- wrapper 스크립트는 도입하지 않음. 사용자가 직접 터미널 3개를 띄우는 방식 유지 (구조가 단순하고 실패 origin 파악이 더 쉬움).

### Step 8. 테스트 절차 갱신 ✅

- `docs/bridge-test.md` 를 shared app-server 기준으로 개정.
- 테스트 케이스:
  - A. bridge 연결 확인 (app-server 없는 상태에서 명시적 실패)
  - B. forward 왕복 확인 (`ask_claude`)
  - C. reverse 왕복 확인 (Claude → Codex → **UI transcript에 실제로 보임**)
  - D. timeout 확인
  - E. app-server 재시작 후 bridge 재연결 확인

결과:

- `docs/bridge-test.md`가 A~E 5케이스로 개정 완료.
- 2026-05-13 `plan/refactor.md` 1D smoke가 Test B (forward) + Test C (reverse) live 검증을 다시 한 번 통과 (`bridge/dist/index.js` 경로 기준).
- 운영 제약 — live 왕복은 fresh remote session에서만 (resume 세션 한계: `history/11`).

---

## Validation Plan

### 성공 판정 기준

1. `codex app-server --listen ws://127.0.0.1:4500` 실행 후 bridge가 해당 endpoint에 연결됨.
2. `codex --remote ws://127.0.0.1:4500` 로 띄운 UI에서 기존 Codex 세션과 동일한 경험 확인.
3. Claude에서 `ask_codex` 호출 → bridge가 shared app-server로 `turn/start` 전송.
4. 해당 turn이 UI transcript에 live로 보임.
5. Codex가 그 turn에서 응답을 생성하면 bridge가 수집해 Claude pending을 resolve.
6. Claude tool 결과로 응답이 돌아옴.

### 회귀 확인

- forward `ask_claude` 왕복이 여전히 동작한다.
- bridge 프로세스 수가 세션 반복 후에도 1개로 유지된다.
- child `codex mcp-server` / `codex app-server --listen stdio://` 프로세스가 더 이상 생성되지 않는다.

---

## Open Questions

1. ~~Codex App Server의 WS 프로토콜 세부 shape~~
   - **해결됨**: `codex app-server generate-json-schema --out DIR` 로 전체 스키마 추출 가능. Step 1에 주요 메소드 기록.

2. ~~`thread/resume` 가 bridge가 만든 thread가 아닌 UI가 만든 thread에도 붙을 수 있는가?~~
   - **해결됨** (`history/5`, `history/10`):
     - `thread/loaded/list`가 remote UI가 load한 thread를 그대로 반환함 — bridge가 그 threadId에 직접 `turn/start`를 보낼 수 있다.
     - 추가 발견: loaded thread에는 `thread/resume` 호출이 필요 없다 (호출 시 `no rollout found` 에러가 나지만 flow는 영향 없음). 그래서 bridge는 resume을 호출하지 않는다.

3. ~~bridge가 연결된 시점에 UI가 아직 붙지 않았다면, bridge의 `turn/start` 가 어떻게 queue 되는가?~~
   - **해결됨**: `thread/loaded/list`가 빈 배열을 반환하면 bridge는 `No loaded Codex thread` 명시적 에러로 reverse 요청을 거절한다 (`docs/bridge.spec.md` §11). 따라서 UI 미부착 상태에서 `turn/start`를 보내지 않는다.

4. ~~여러 개의 Claude 대화가 동시에 진행되면 bridge는 여러 threadId를 관리해야 하는가?~~
   - **현 정책**: 단일 shared thread 가정 유지. 다중 thread 매핑은 명시적으로 non-goal.

5. ~~`thread/loaded/list` 응답에 여러 thread가 있으면 어느 것을 선택해야 하는가?~~
   - **현 정책**: 응답의 첫 번째 thread를 사용 (`discoverThreadId`). 실제 운영에서 다중 loaded thread가 흔히 발생하지 않아 정책 보강을 보류. 필요 시 env override 도입 가능.

6. ~~app-server가 죽었을 때 bridge는 어떤 에러 메시지로 Claude tool 호출을 실패시켜야 하는가?~~
   - **구현됨**: `codex-app-server: connect failed ...` (stderr) + reverse 요청을 명시적 HTTP 오류로 실패 (`docs/bridge-test.md` Test A).

### 새로 부상한 후속 질문 (이 plan 범위 밖)

- 7. **resume/restart 후에도 chat_id pending을 어떻게 복구할 것인가?** — `history/11`, `history/12`. → `plan/refactor.md` Step 9 (durable relay broker).
- 8. Step 4 reframe 이후 `[MCP RELAY]` 마커가 UI transcript에 노출되는 시각적 노이즈 — `history/10` §남은 작업. 현재 허용 trade-off.

---

## Risks

- **Codex CLI 업데이트에 따른 프로토콜 변경**: app-server WS API는 실험적일 수 있다. 변경 시 bridge WS client 코드 유지보수 필요. (잔존)
- **사용자 워크플로 복잡도 증가**: 터미널 3개가 필요해짐 — `docs/bridge.spec.md` §7, `docs/bridge-test.md` §0에 절차로 명시. wrapper 스크립트는 도입하지 않음.
- ~~**thread 공유 가정 실패**~~: `history/5` probe + `history/10` live 동작으로 검증 완료.
- **신규** — **in-band relay instruction 무시 가능성**: Codex가 `[MCP RELAY]` 마커의 지침을 무시하고 작업 모드로 진입해 timeout이 날 위험. 현재 `wrapRelayPrompt` 본문 + MCP instructions로 완화 (`history/10`).
- **신규** — **resume/restart 시 chat_id pending 유실**: `history/11`, `history/12`. 운영 제약으로 "fresh session에서만 live 테스트" 규칙을 유지. 구조적 해결은 durable broker 도입 시점으로 미룸.

---

## Rollout

1. ✅ Step 1 (endpoint 규약 확정) — `history/5`.
2. ✅ Step 2–4 구현 + 로컬 수동 검증 — `history/6` ~ `history/10`. Step 4는 in-band relay로 reframe.
3. ✅ Step 5–6 회귀/정리 — `history/10` + 2026-05-13 dead code 점검.
4. ✅ Step 7–8 문서/테스트 갱신 — `docs/bridge.spec.md`, `docs/bridge-test.md`. 2026-05-13에 `bridge/dist/index.js` 경로로 추가 동기화.
5. ✅ 기존 `plan/bridge-app-server-live-session.plan.md` → `docs/legacy/bridge-app-server-live-session-plan-legacy.md`로 이동.
6. ⏭ 후속 트랙 — durable relay broker는 `plan/refactor.md` Step 9에서 다룬다.
