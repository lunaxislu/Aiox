# shared Codex App Server 전환 — Open Question 2 검증 기록

> 참조 문서:
> `plan/shared-app-server.plan.md`,
> `history/4-bridge-app-server-live-session-investigation.history.md`,
> `history/1-bridge.history.md`
>
> 작성일: 2026-04-15

---

## 배경

2026-04-15 저녁까지 `bridge`의 reverse 경로는 다음 구조였다.

- `bridge`가 내부에서 `codex mcp-server` (`app-server --listen stdio://`) 를 child로 spawn.
- 이 child는 bridge 프로세스의 서브프로세스로만 존재하고, 사용자가 터미널에서 실행한 `codex` UI와는 별개의 live 세션.
- 결과: bridge가 `thread/resume` + `turn/start` 를 시도해도 UI transcript에 나타나지 않음.

디버깅 과정에서 다음 가설이 형성됨.

- `threadId` = conversation key
- `app-server endpoint` = transport key
- UI와 bridge가 **동일한 app-server endpoint**에 붙어 있어야 같은 화면을 공유할 수 있다.

이 가설을 구조화한 것이 `plan/shared-app-server.plan.md` 이고, 그 plan의 핵심 Open Question 2는 다음과 같았다.

> `thread/resume` 가 bridge가 만든 thread가 아닌 UI가 만든 thread에도 붙을 수 있는가?
> bridge가 UI의 live thread를 어떻게 발견할 수 있는가?

이 기록은 그 Open Question 2를 실제 Codex App Server에 붙어서 검증한 결과를 담는다.

---

## 검증 목표

세 가지를 확인한다.

1. `codex app-server --listen ws://127.0.0.1:4500` 가 WS 전송을 실제로 지원하는가.
2. `thread/loaded/list` 가 UI 미연결 / UI 연결 상태에서 어떻게 다른 응답을 주는가.
3. UI가 만든 thread가 `thread/loaded/list` 또는 `thread/list` 에서 식별 가능한가.

---

## 프로토콜 확인

먼저 `codex app-server --help` 로 WS listen이 정식 지원 플래그인지 확인했다.

```
--listen <URL>
    Transport endpoint URL. Supported values: `stdio://` (default), `ws://IP:PORT`, `off`
```

추가로 `codex app-server generate-json-schema --out DIR` 로 전체 JSON Schema를 생성했다. 확인된 client 요청 메소드 중 bridge 관심 대상:

| 용도 | method |
|---|---|
| 핸드셰이크 | `initialize` |
| thread 생성 | `thread/start` |
| thread 재사용 | `thread/resume` |
| loaded thread 조회 | `thread/loaded/list` |
| thread 목록 | `thread/list` |
| 사용자 메시지 전송 | `turn/start` |

server → client notification 중 관심 대상:

- `ThreadStartedNotification`
- `TurnStartedNotification`
- `TurnCompletedNotification`
- `AgentMessageDeltaNotification`
- `ThreadRealtimeItemAddedNotification`

이 schema 확인만으로도 기존 plan의 가정(`thread/resume` 으로 기존 thread에 붙을 수 있다)이 프로토콜 수준에서 가능한 경로임을 알 수 있었다. 남은 것은 "어떤 thread가 'UI가 지금 쓰는 것'인지 어떻게 찾느냐"였다.

---

## 테스트 환경

- macOS (Darwin 25.3.0, arm64)
- Codex CLI 0.120.0
- Node 24.14.0 (native WebSocket 지원)
- app-server: `codex app-server --listen ws://127.0.0.1:4500`
- UI: 별도 터미널에서 `codex --remote ws://127.0.0.1:4500`
- probe: Node 스크립트 `/tmp/test-app-server.mjs`

포트 확인:

```
COMMAND   PID      USER   FD   TYPE  NODE NAME
codex   89340 lunaxislu   20u  IPv4  TCP  localhost:ipsec-msft (LISTEN)
```

(`ipsec-msft` 는 4500/tcp 에 할당된 서비스 이름. Codex가 점유한 포트가 맞다.)

---

## probe 스크립트

목적:

1. WS로 app-server에 연결.
2. `initialize` 요청.
3. `thread/loaded/list` 요청.
4. `thread/list` 요청 (첫 3개 항목만 출력).
5. 각 응답을 그대로 출력 후 종료.

핵심 로직 (요약):

```js
const URL = process.env.URL ?? "ws://127.0.0.1:4500";
const ws = new WebSocket(URL);

function request(method, params) {
  const id = nextId++;
  ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params: params ?? {} }));
  // pending Map으로 응답 매칭, 5초 timeout
}

ws.addEventListener("open", async () => {
  const init = await request("initialize", {
    clientInfo: { name: "probe", version: "0.0.1" },
    protocolVersion: "1",
    capabilities: {},
  });
  const loaded = await request("thread/loaded/list", {});
  const list = await request("thread/list", {});
  // ... 출력 ...
});
```

Node 24의 native `WebSocket` 을 사용했기 때문에 외부 의존성 없이 동작한다.

---

## 단계 1 — baseline (UI 미연결)

app-server만 띄우고, UI를 붙이지 않은 상태에서 probe를 실행했다.

### 1a. `initialize`

```json
{
  "id": 1,
  "result": {
    "userAgent": "probe/0.120.0 (Mac OS 26.3.1; arm64) ghostty/1.3.0-HEAD_bc9be90 (probe; 0.0.1)",
    "codexHome": "/Users/lunaxislu/.codex",
    "platformFamily": "unix",
    "platformOs": "macos"
  }
}
```

- WS 연결 성공.
- 응답은 server metadata만 포함. 별도 capability 교환은 이 shape에서는 보이지 않았다.
- `userAgent` 는 probe가 스스로 제공한 값을 그대로 echo 하는 형식 + 호스트 정보 결합.

### 1b. `thread/loaded/list` (UI 없음)

```json
{
  "id": 2,
  "result": {
    "data": [],
    "nextCursor": null
  }
}
```

핵심 발견:

- UI가 아직 붙지 않은 상태에서는 `data: []`.
- 즉 "loaded" 의 의미는 **app-server 메모리에 현재 살아있는 thread**.
- 이 값만으로 bridge는 "지금 UI가 붙어 있는가"를 판정할 수 있다.

### 1c. `thread/list` (UI 없음)

```json
{
  "id": 3,
  "result": {
    "data": [
      {
        "id": "019d8cc6-28e6-7160-ba1f-11aa5e94fd5d",
        "preview": "claude한테 bridge mcp tool에서 ...",
        "status": { "type": "notLoaded" },
        "path": "/Users/lunaxislu/.codex/sessions/2026/04/15/rollout-2026-04-15T01-14-50-...jsonl",
        "cwd": "/Users/lunaxislu/Documents/ai-orchestration",
        "cliVersion": "0.120.0",
        "source": "cli"
      },
      ...
    ]
  }
}
```

- 과거 rollout 파일 전부가 나온다.
- 모두 `status: "notLoaded"`.
- 따라서 `thread/list` 는 "디스크에 남아 있는 대화 이력" 이고,
- `thread/loaded/list` 는 "지금 살아 있는 대화" 다.

두 API는 분명하게 다른 의미를 가진다. bridge의 UI discovery에는 **`thread/loaded/list` 가 정답**이다.

---

## 단계 2 — UI 연결 후

별도 터미널에서 다음 명령을 실행:

```bash
codex --remote ws://127.0.0.1:4500
```

UI에서 "안녕" 이라고 입력하여 Codex가 thread를 load하고 idle 상태로 들어가게 했다. (UI 화면 확인 완료.)

그 뒤 probe를 다시 실행.

### 2a. `initialize`

```json
{
  "id": 1,
  "result": {
    "userAgent": "probe/0.120.0 (Mac OS 26.3.1; arm64) ghostty/1.3.0-HEAD_bc9be90 (probe; 0.0.1)",
    "codexHome": "/Users/lunaxislu/.codex",
    "platformFamily": "unix",
    "platformOs": "macos"
  }
}
```

- baseline과 동일. initialize는 stateless.

### 2b. `thread/loaded/list` (UI 연결됨)

```json
{
  "id": 2,
  "result": {
    "data": ["019d8cdf-a2e5-7831-a037-6a74704870de"],
    "nextCursor": null
  }
}
```

결정적 결과:

- `data` 배열이 **1개의 threadId** 를 포함.
- 이 threadId는 UI가 방금 만든 대화의 thread.
- 응답 shape은 **문자열 배열**이지 full thread object 배열이 아님. (메타데이터는 별도로 `thread/list` 또는 `thread/read` 필요.)

### 2c. `thread/list` (UI 연결됨)

```json
{
  "id": 3,
  "result": {
    "data": [
      {
        "id": "019d8cdf-a2e5-7831-a037-6a74704870de",
        "preview": "안녕",
        "status": { "type": "idle" },
        "path": "/Users/lunaxislu/.codex/sessions/2026/04/15/rollout-2026-04-15T01-42-39-...jsonl",
        "cwd": "/Users/lunaxislu/Documents/ai-orchestration",
        "cliVersion": "0.120.0",
        "source": "vscode"
      },
      {
        "id": "019d8cc6-28e6-7160-ba1f-11aa5e94fd5d",
        "status": { "type": "notLoaded" },
        ...
      }
    ]
  }
}
```

추가 발견:

- UI가 만든 thread가 `thread/list` 의 **선두**에 등장.
- `preview: "안녕"` — UI에서 실제로 입력한 값과 일치.
- `status: { type: "idle" }` — loaded 상태.
- 나머지 과거 thread들은 여전히 `status: "notLoaded"`.
- `source: "vscode"` — 사용자는 터미널에서 `codex --remote` 로 실행했는데도 source가 `vscode` 로 기록됨. 이것은 Codex 내부에서 "remote UI attach" 를 vscode extension과 동일 경로로 분류하는 것으로 보인다. 기능상 문제는 없지만, 로깅/필터 시 주의가 필요하다.

---

## 비교 요약

| 항목 | UI 미연결 | UI 연결됨 |
|---|---|---|
| `initialize` | 성공 | 성공 |
| `thread/loaded/list.data` | `[]` | `["019d8cdf-..."]` |
| `thread/list` 선두 status | `"notLoaded"` | `"idle"` (UI thread) |
| `thread/list` preview | 과거 기록만 | `"안녕"` (UI 입력) |

---

## 결론

### Plan Open Question 2 상태

> `thread/resume` 가 bridge가 만든 thread가 아닌 UI가 만든 thread에도 붙을 수 있는가?
> bridge가 UI의 live thread를 어떻게 발견할 수 있는가?

**부분 해결:**

- UI thread 발견 경로는 확정됨: `thread/loaded/list` → threadId 문자열 배열 → 첫 번째 요소 사용.
- `thread/loaded/list` 는 UI 미연결 시 빈 배열을 반환하므로, bridge가 "UI가 아직 없음"을 명확히 인식할 수 있다.
- `thread/resume` 까지 실제로 실행해서 UI transcript에 bridge turn이 보이는지 확인하는 단계는 **아직 남아 있음**. (turn/start 까지 가는 실제 왕복은 Step 2 구현 후 검증.)

즉, **bridge discovery strategy는 protocol 수준에서 가능성이 입증**되었고, 남은 리스크는 "`thread/resume` 후 `turn/start` 가 UI에 실시간 반영되는가" 한 가지로 좁혀졌다.

### bridge 구현 시 확정할 수 있는 것

1. WS 연결 후 `initialize` 는 stateless이므로 capability 협상 신경 쓸 필요 없음.
2. UI thread discovery는 단일 API 호출 (`thread/loaded/list`) 로 끝난다.
3. 응답이 빈 배열이면 → bridge는 `thread/start` 로 새로 만들거나 에러 반환 (정책 결정 필요).
4. 응답이 1개면 → 그 threadId로 `thread/resume`.
5. 응답이 2개 이상이면 → 정책 필요 (가장 최근, `source` 필터, 또는 env override).

### 아직 남은 리스크

- `thread/resume` 후 `turn/start` 가 실제로 UI transcript에 실시간 반영되는가.
- turn이 처리되는 동안 UI가 idle 상태를 유지하는가, 아니면 UI가 별도 lock/경쟁 상태가 되는가.
- bridge turn과 사용자 UI turn이 **동일 thread에서 교차로 발생**할 때 turn lifecycle이 어떻게 serialize 되는가.

이 리스크들은 쿼터 여유가 있을 때 추가 probe (turn/start 포함) 로 검증해야 한다. 지금은 5h 쿼터 잔여가 10% 미만이라 별도 시도를 보류했다.

---

## 남긴 artifacts

- probe 스크립트: `/tmp/test-app-server.mjs` (외부 의존성 없음, Node 24 native WebSocket 사용)
- schema dump: `/tmp/codex-schema/` (전체 JSON Schema, 재실행 가능)
- app-server 인스턴스: background task (`codex app-server --listen ws://127.0.0.1:4500`)

probe 스크립트는 이후 turn/start 검증 단계에서도 기반으로 재사용할 수 있다. schema dump는 bridge WS client 구현 시 request/notification 타입 참조 자료로 쓴다.

---

## 다음 단계

1. `plan/shared-app-server.plan.md` Step 3(UI thread discovery) 는 이 검증으로 전략이 확정됨 — `thread/loaded/list` 단일 경로.
2. Step 2 (bridge WS client 구현) 에 착수 가능. 단, turn/start 실시간 반영 검증은 구현 후 실제 bridge를 통해 다시 확인한다.
3. 쿼터 리셋 후 probe 스크립트에 `thread/resume` + `turn/start` 를 추가해서 "bridge turn이 UI에 보이는가" 를 한 번 더 확인한다. 이걸 기록할 후속 history 파일을 만들 예정.

---

## 2026-04-15 저녁 추가 검증 — turn/start 가 UI transcript에 실제로 반영됨

쿼터가 리셋된 뒤 `plan/shared-app-server.plan.md` 의 남은 리스크를 직접 확인했다.

### 환경

- app-server: 사용자가 수동으로 `codex app-server --listen ws://127.0.0.1:4500` 실행
- UI: 별도 터미널에서 `codex --remote ws://127.0.0.1:4500`
- probe: `/tmp/test-turn-start.mjs`

### probe 스크립트 구조

1. WebSocket으로 app-server 연결
2. `initialize` 요청
3. `thread/loaded/list` 요청 → loaded threadId 추출
4. `thread/resume` 요청 (threadId 인자)
5. `turn/start` 요청 (threadId + `input: [{ type: "text", text: PROMPT }]`)
6. 도착하는 notification을 stdout에 실시간 출력
7. `TurnCompletedNotification` 이 오면 종료, 아니면 60초 timeout

프롬프트는 쿼터 소모를 최소화하려고 단일 단어 응답을 유도하는 문장으로 고정:

```
테스트: 이 메시지는 bridge probe가 보낸 것입니다. '확인' 한 단어로만 답해주세요.
```

### 결과

**결정적 성공:**

- probe가 보낸 user 메시지가 UI 화면 transcript에 **그대로 나타남**
- Codex가 `확인` 이라고 응답한 것도 UI 화면에 **그대로 나타남**
- 사용자가 스크린샷으로 직접 확인 완료
- 즉 bridge가 외부 WS client 입장에서 `turn/start` 한 결과가 `codex --remote` 로 붙은 UI 세션과 **실시간으로 동기화**됨

**응답 세부 결과:**

- `initialize` — 성공.
- `thread/loaded/list` — `data: ["019d9010-dc03-7f53-87e6-b4a7e0cf31de"]`. UI의 threadId가 그대로 잡힘.
- `thread/resume` — server가 `-32600 no rollout found for thread id ...` 에러를 돌려줌. 이것은 **이미 메모리에 live로 올라 있는 loaded thread에 대해서는 rollout 파일 기반 resume이 맞지 않음**을 의미. 하지만 이 에러를 response로 돌려준 것뿐이라 script flow는 계속 진행되었고, 뒤의 `turn/start` 는 정상 동작했다.
- `turn/start` — `result.turn.id = "019d9015-4072-7be2-bce4-3f5c795c053d"`, `status: "inProgress"`. **`thread/resume` 없이도 바로 `turn/start` 가 됨**.
- notifications — `thread/status/changed` 두 개 수신:
  - 첫 번째: `status.type = "active"` (turn 시작)
  - 두 번째: `status.type = "idle"` (turn 완료 대응)
- `TurnCompletedNotification` — **수신되지 않음**. probe가 기대한 이름이 프로토콜 실제 name과 다름.

### 왜 probe가 exit code 1 로 끝났는가

probe는 `TurnCompletedNotification` 을 watch 하고 있었는데 Codex는 `thread/status/changed` 를 사용한다. 그래서:

1. `turn/start` 까지는 성공적으로 실행됨.
2. `waitForCompletion(60_000)` 이 기대하는 이름의 notification 을 못 봐서 60초 timeout.
3. cleanup 과정에서 `ws.close()` 가 트리거한 close 이벤트 + ws error 이벤트가 handler에서 `process.exit(1)` 을 호출.

즉 Exit code 1 은 **테스트 실패가 아니라 probe 스크립트의 false negative**다. 실제로는 turn이 완벽히 돌았고 UI에도 반영됐다. 이건 스크립트의 버그로 기록한다.

### 이 검증으로 확정된 사실

1. **shared app-server + `codex --remote ws://...` UI + 외부 WS client가 같은 thread/turn 스트림을 공유한다.**
2. **bridge는 `thread/resume` 없이 loaded thread에 직접 `turn/start` 를 보낼 수 있다.** `thread/resume` 은 디스크에 rollout 파일이 있는 non-loaded thread를 재load 할 때만 쓰는 API로 보인다.
3. **turn 완료 판정은 `thread/status/changed` + `status.type === "idle"` 기준으로 해야 한다.** `TurnCompletedNotification` 이라는 이름의 notification은 실제로는 사용되지 않거나 이 경로에서는 발생하지 않는다.
4. **assistant 응답 텍스트는 별도 notification (`AgentMessageDeltaNotification`, `ThreadRealtimeItemAddedNotification`) 으로 들어온다.** probe는 이 둘 중 어떤 것이 먼저 들어오는지 이번 run 에서는 stdout으로 명시적으로 캡처하지 못했다. 구현 시 둘 다 watch 해야 한다.

### plan 반영 사항 (요약)

`plan/shared-app-server.plan.md` 의 Step 4 (reverse turn 경로 교체) 에서 다음을 정확히 반영해야 한다.

- `turn/start` params: `{ threadId, input: [{ type: "text", text }] }` 필수.
- loaded thread에 대해서는 `thread/resume` 을 호출하지 않는다. 호출하면 에러가 나지만 flow에는 영향 없으므로 무시 가능하지만, 에러 로그가 지저분해지므로 제거가 권장된다.
- 응답 수집은 notification stream 기반.
- 완료 판정: `thread/status/changed` 이 `status.type === "idle"` 인 시점 + 앞서 같은 threadId 에서 `status.type === "active"` 가 한 번이라도 있었는지를 페어로 판정.
- 중간에 들어오는 `AgentMessageDeltaNotification` 는 chunk 로 수집 후 최종 reply 텍스트 구성.
- `ThreadRealtimeItemAddedNotification` 도 assistant message item 을 담아 올 수 있으니 같이 watch.

### 남긴 artifacts

- `/tmp/test-turn-start.mjs` — 이번 session에서 만든 turn/start probe. 다음 session에서 fix + reuse.
- `/tmp/test-app-server.mjs` — 이전 baseline probe (`initialize` + `thread/loaded/list` + `thread/list`).
- `/tmp/codex-schema/` — 전체 JSON Schema dump. bridge WS client 타입 참조에 재사용.

### 다음 session으로 넘길 것

1. probe 스크립트를 고쳐서 실제 turn 완료 / assistant 응답 텍스트 캡처를 정확히 검증한다.
   - notification 이름을 `thread/status/changed` 기준으로 교정.
   - `AgentMessageDeltaNotification` / `ThreadRealtimeItemAddedNotification` 을 수집해 최종 reply 텍스트를 재구성.
   - cleanup 순서 정리 (ws close → process exit 이 false negative 로 exit 1 나오는 거 제거).
2. Step 2 (bridge WS client 구현) 에 착수.
   - `startCodexMcpClient()` 제거 대상.
   - 새 `startAppServerClient()` (가칭) 추가: WS 연결, discovery, turn lifecycle 관리.
3. bridge 구현 후 다시 한 번 reverse 왕복을 live 세션으로 검증한다. 성공 판정은 이번 session과 동일: UI transcript에 bridge가 보낸 turn이 나타나는가.
4. 구현이 성공하면 `plan/bridge-app-server-live-session.plan.md` 를 `plan/shared-app-server.plan.md` 로 일원화하고, 이전 plan은 legacy 또는 archive 처리.
