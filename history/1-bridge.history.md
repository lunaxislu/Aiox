# bridge 구현 및 아키텍처 전환 히스토리

> 이 문서는 bridge를 처음의 Codex app-server WebSocket relay 구조에서,
> Codex MCP tool 기반 구조로 전환하기까지의 전 과정을 기록한다.
>
> 단순한 변경 목록이 아니라, 왜 기존 구조가 오작동으로 판정되었는지,
> 어떤 실험을 거쳤는지, 왜 최종적으로 MCP tool 구조가 선택되었는지를
> 나중에 다시 설계할 사람이 그대로 따라올 수 있도록 적는다.
>
> 날짜: 2026-04-14
> 업데이트: 2026-04-14

---

## 최종 결과

```
Codex
  → ask_claude(text) MCP tool
  → bridge MCP server (stdio)
  → claude-adapter (HTTP ingress :8788)
  → Claude Code session (channel event)
  → reply tool
  → claude-adapter (/claude-reply)
  → bridge pending resolve
  → Codex tool result
```

- Codex app-server WebSocket relay: ❌ 제거
- threadId 공유 문제: ❌ 제거
- `ask_claude(text)` MCP tool: ✅ 도입
- pending reply 관리: ✅ 도입
- 30초 timeout: ✅ 도입
- `/claude-reply` HTTP reply 수신: ✅ 유지
- stdout/stderr 분리: ✅ 유지

---

## 1차 구조 - Codex app-server WebSocket relay

### 처음의 목표

처음에는 bridge를 Codex app-server와 Claude Code 사이의 relay로 만들려 했다.

의도는 단순했다.

1. Codex UI에서 trigger 문구를 입력한다.
2. bridge가 Codex app-server WebSocket에 붙어서 메시지를 읽는다.
3. bridge가 trigger를 감지하면 `claude-adapter`로 넘긴다.
4. Claude Code reply를 다시 Codex 쪽으로 재주입한다.

이때의 핵심 가정은 다음이었다.

- `threadId`만 맞으면 UI와 bridge가 같은 대화를 공유할 수 있다.
- `turn/completed` 시점에만 trigger를 평가하면 loop를 막을 수 있다.
- `claude-adapter`는 HTTP ingress와 reply tool만 처리하면 된다.

### 초기 아키텍처

```text
Codex CLI UI
  ↓
codex app-server --listen ws://127.0.0.1:4500
  ↑
bridge (WS client + HTTP reply server)
  ↓
claude-adapter (localhost:8788)
  ↓
Claude Code
  ↓
claude-adapter -> bridge (localhost:8789/claude-reply)
```

### 이 구조에서 필요했던 규칙

- bridge는 Codex app-server와 같은 `threadId`를 써야 했다.
- `turn/completed` 전에 다음 `turn/start`를 보내면 안 됐다.
- `item/agentMessage/delta`를 turn 단위로 합쳐 trigger를 검사해야 했다.
- `origin === "claude"`와 `relay_depth >= 3`은 루프로 간주해 막아야 했다.

### 왜 이 구조가 불안정했는가

이 구조는 이론상 가능했지만, 실전에서는 bridge와 UI가 같은 thread를 공유한다는 가정을 너무 강하게 요구했다.

문제는 `threadId`가 단순한 세션 식별자가 아니라는 점이었다.

- bridge가 새 thread를 만들면 UI는 자동으로 그 thread를 따라오지 않았다.
- UI가 쓰는 thread를 bridge가 resume하지 않으면 같은 대화를 보지 못했다.
- `Session:` 값과 app-server `thread.id`는 완전히 다른 값이었다.
- 결국 테스트할 때마다 thread를 수동으로 맞춰야 했다.

이 문제는 문서에서 이미 확인됐고, 실제로도 계속 재현됐다.

---

## 확인된 실패와 교훈

### 실패 1 - `threadId` 동기화가 수동이라는 점

bridge가 `--thread-id` 없이 실행되면 자기 혼자 새 thread를 시작했다.

결과:

- bridge는 정상 시작됨
- 하지만 Codex UI가 그 thread를 따라오지 않음
- trigger 문구를 입력해도 bridge가 관련 turn을 보지 못함

교훈:

- 이 구조는 사용자가 thread를 수동으로 맞춰야만 동작했다.
- 즉, bridge가 UI와 같은 대화를 자동으로 공유하지 못했다.

### 실패 2 - trigger가 turn 완료 후에만 판정된다는 제약

`turn/completed` 이후에만 relay를 평가하는 것은 loop 방지에는 좋았지만,
실패 시점이 늦게 드러나는 단점도 있었다.

교훈:

- 실제로는 “입력이 들어왔는가”보다 “해당 thread의 완결된 assistant turn이 bridge가 보는 곳에서 나왔는가”가 더 중요한 문제였다.

### 실패 3 - UI 반영과 relay 발생이 같은 선상에 있지 않음

UI에 메시지가 보였다고 해서 bridge가 그 메시지를 본 것은 아니었다.

교훈:

- bridge는 같은 화면을 보는 것이 아니라 같은 thread를 봐야 했다.
- 이 문제는 프로세스 간 relay로 해결하기보다, 구조 자체를 바꾸는 게 맞았다.

---

## 전환 결정 - MCP tool 구조

### 왜 바꾸게 됐는가

가장 큰 문제는 bridge가 Codex 대화와 같은 session/thread를 공유해야 한다는 전제 자체였다.

그 전제를 유지하는 한:

- 사용자는 thread를 맞춰야 하고
- bridge는 UI와 같은 대화에 붙어야 하고
- trigger는 turn 완료 시점까지 기다려야 하고
- 실패 원인은 대부분 “같은 thread가 아님”으로 끝났다.

이건 bridge가 relay layer로는 동작하지만, 사용자 입장에서는 너무 자주 어긋나는 구조였다.

### 전환 아이디어

그래서 구조를 뒤집었다.

bridge를 Codex UI 바깥의 relay client가 아니라, **Codex 내부에서 호출하는 MCP tool server**로 만들면 된다.

즉:

- Codex가 `ask_claude(text)` tool을 직접 호출한다.
- bridge는 그 tool 호출을 받아 `claude-adapter`로 보낸다.
- Claude reply가 돌아오면 bridge가 tool 결과로 돌려준다.
- Codex는 그 결과를 자기 대화 흐름 안에서 자연스럽게 받는다.

이렇게 하면:

- threadId를 공유할 필요가 없다
- WS app-server를 별도 추적할 필요가 없다
- Codex가 자기 대화 내부에서 결과를 받는다
- bridge는 단일 request/response relay로 단순화된다

---

## 최종 아키텍처

### 현재 구조

```text
Codex
  ↓ ask_claude(text)
bridge MCP server (stdio)
  ↓ POST http://127.0.0.1:8788/
claude-adapter
  ↓ channel event
Claude Code session
  ↓ reply tool
claude-adapter
  ↓ POST /claude-reply
bridge pending resolve
  ↓ tool result
Codex
```

### 왜 이 구조가 맞는가

이 구조의 장점은 분명하다.

1. **threadId 동기화가 사라진다**
   - Codex는 tool 결과를 자기 세션 안에서 받는다.
   - bridge가 별도 app-server thread를 만들지 않는다.

2. **MCP 역할이 명확해진다**
   - `claude-adapter`는 Claude Code 세션용 channel server다.
   - `bridge`는 Codex용 MCP tool server다.

3. **pending reply 모델이 단순하다**
   - 요청마다 UUID를 만든다.
   - reply가 오면 해당 UUID를 resolve한다.
   - timeout이 나면 reject한다.

4. **실패 원인이 분리된다**
   - bridge 실패: Codex tool path / timeout / reply 매칭 문제
   - claude-adapter 실패: Claude channel event / reply tool 문제
   - app-server thread 실패라는 애매한 실패가 사라진다

---

## 구현 변경 기록

### 1. `bridge/index.js` 전면 재작성

기존 내용:

- Codex app-server WebSocket client
- `initialize` / `initialized`
- `thread/start` / `thread/resume`
- `turn/start` / `turn/completed`
- `item/agentMessage/delta` 누적
- trigger 문자열 검사

새 내용:

- `McpServer` 기반 stdio server
- `ask_claude(text)` 단일 tool
- `chat_id = crypto.randomUUID()`
- pending Map 관리
- `POST http://127.0.0.1:8788/` relay
- `POST /claude-reply` reply 수신
- 30초 timeout
- stdout/stderr 분리

### 2. `bridge/package.json` 수정

bridge가 독립 실행형 MCP server가 되면서 필요해진 의존성:

- `@modelcontextprotocol/sdk`
- `zod`

### 3. `bridge/README.md` 갱신

README는 더 이상 app-server relay 설명이 아니라:

- Codex 등록 위치
- `ask_claude` 동작
- `claude-adapter`와의 HTTP 왕복
- reply 경로
- stdout/stderr 규칙

을 설명하는 문서가 됐다.

### 4. `docs/bridge.spec.md`와 `docs/bridge-test.md` 재작성

둘 다 이제 app-server 중심 문서가 아니라, MCP tool 중심 문서다.

문서 역할 분리:

- `bridge.spec.md`: 구현 규칙과 인터페이스
- `bridge-test.md`: 실제 왕복 테스트 절차

### 5. `docs/app-server.md`를 `docs/legacy/app-server-legacy.md`로 변경

app-server 문서는 삭제해도 되었지만, 조사 기록 자체는 가치가 있어서 legacy 파일로 남겼다.

이유:

- 왜 옛 구조가 선택되었는지
- 왜 옛 구조가 오작동으로 판정되었는지
- 어떤 전환 결정을 내렸는지

를 보존하려면 레거시 문서가 필요했다.

---

## 문제를 어떻게 판정했는가

이 전환에서 중요한 건 “코드가 안 돈다”가 아니라 “설계가 사용자 경험상 오작동을 만들고 있는가”였다.

오작동 판정 근거는 세 가지였다.

### 1. 같은 thread를 강제해야만 했다

bridge와 UI가 같은 thread에 있어야만 relay가 보였다.

이건 테스트 환경에서는 가능했지만, 실제 사용 흐름에서는 너무 자주 어긋났다.

### 2. bridge가 혼자 다른 대화방으로 들어가는 일이 발생했다

bridge가 thread를 새로 만들면 UI는 그 thread를 모르기 때문에, 사용자는 화면상 메시지를 보면서도 bridge가 듣는 대화와는 다른 대화를 하고 있었다.

### 3. 문제의 핵심이 relay 로직이 아니라 conversation binding이었다

relay 로직 자체는 단순했다.
진짜 문제는 어떤 대화가 bridge의 입력 source인지, 그리고 Codex가 어떤 대화에 결과를 붙여야 하는지였다.

이걸 WS app-server 방식으로 계속 밀어붙이는 것은 비용 대비 수확이 낮았다.

---

## 실행 체크포인트

### bridge 쪽

- Codex에서 `ask_claude` tool이 보여야 한다.
- `ask_claude(text)` 호출 시 UUID가 생성돼야 한다.
- `POST http://127.0.0.1:8788/`가 발생해야 한다.
- reply가 `POST /claude-reply`로 돌아와야 한다.
- 30초 timeout이 동작해야 한다.

### claude-adapter 쪽

- Claude Code 세션에 channel event가 들어가야 한다.
- `reply` tool이 호출돼야 한다.
- bridge의 pending request가 resolve돼야 한다.

### 문서 쪽

- `bridge.spec.md`는 MCP tool 기준이어야 한다.
- `bridge-test.md`는 ask/reply 왕복 기준이어야 한다.
- `app-server-legacy.md`는 조사 기록으로 남아 있어야 한다.

---

## 핵심 교훈

1. relay layer가 UI와 같은 thread를 직접 공유하려고 하면 시스템이 불안정해진다.
2. Codex가 tool 호출자로서 bridge를 부르면, thread binding 문제를 구조적으로 제거할 수 있다.
3. `claude-adapter`는 Claude Code 세션의 ingress/egress만 담당해야 한다.
4. bridge는 Codex tool server와 Claude reply matcher 역할에만 집중해야 한다.
5. app-server WS는 중요한 조사 결과였지만, 최종 아키텍처의 핵심 경로는 아니었다.

---

## 남은 것

- bridge MCP server는 유지한다.
- claude-adapter MCP channel server는 유지한다.
- app-server 문서는 legacy로 남긴다.
- 앞으로의 변경은 `ask_claude`와 reply 경로를 기준으로 본다.

---

## 2차 확장 - Claude -> Codex 역방향 대칭화

### 왜 다시 바꿨는가

forward 구조만으로는 Codex가 Claude에게 질문하는 방향만 열려 있었다.
그 자체로는 충분히 유용했지만, 실제 사용 흐름에서는 Claude Code 쪽에서도 Codex에게 바로 질문하고 싶다는 요구가 반복됐다.

이때 중요한 제약은 이전과 같다.

- threadId를 다시 맞추는 방식으로는 돌아가면 안 된다.
- reverse도 forward와 같은 수준의 request/response 모델이어야 한다.
- notification은 단순 wake-up 용도로만 사용해야 한다.

### 확장된 아키텍처

```text
Claude Code session
  → ask_codex(text)
  → claude-adapter (/codex-request)
  → bridge MCP server
  → Codex notification
  → reply_to_claude(chat_id, text)
  → bridge reverse pending resolve
  → claude-adapter tool result
```

### 추가된 계약

- bridge는 `reply_to_claude(chat_id, text)` tool을 추가로 제공한다.
- bridge는 `notifications/codex/channel` notification을 Codex에 보낸다.
- claude-adapter는 `ask_codex(text)` tool을 추가로 제공한다.
- Claude Code가 reverse 질문을 던지면 bridge는 Codex reply를 기다리는 pending request를 만든다.

### 유지해야 하는 교훈

- forward와 reverse 모두 UUID 기반 pending matching을 써야 한다.
- notification은 request의 본문이 아니라 wake-up 신호다.
- 두 방향 모두 localhost-only로 유지해야 한다.
- forward/reverse 각각의 timeout과 실패 원인을 분리해서 로그에 남겨야 한다.

---

## 2026-04-14 추가 기록 — project-scope config discovery와 `Tools: (none)` 해결

### 상황의 시작

이 시점까지 bridge는 MCP tool 서버로 재구성되어 있었지만, Codex 쪽에서 실제로는 다음과 같은 증상이 반복됐다.

- `codex mcp list`에서는 bridge가 보인다.
- Codex TUI의 `/mcp` 화면에서는 bridge가 보이더라도 `Tools: (none)`으로 표시된다.
- 어떤 경우에는 `handshaking with MCP server failed: connection closed: initialize response`가 먼저 뜬다.
- 수동으로 `node bridge/index.js`를 띄우면 `8789` 리스너는 열리지만, Codex가 자동으로 bridge를 띄우는 경로에서는 초기화가 끊긴다.

이 문제는 처음에는 tool schema 문제처럼 보였고, 이어서 Zod v4 Classic vs v4-mini 불일치 가능성까지 검토됐다.
그러나 실제로는 schema 타입보다 **bridge 프로세스가 Codex 런타임에서 살아남느냐**와 **Codex가 어떤 config 파일을 읽느냐**가 더 큰 변수였다.

### 처음 의심했던 원인과 왜 충분하지 않았는가

Claude Code 쪽 분석은 `z.object({ ... })`를 raw shape으로 바꾸면 SDK가 schema를 더 안정적으로 읽을 수 있다고 주장했다.
`mcpServer.server.notification()` 접근 방식도 점검 대상이었다.

이 분석은 일부 맞는 부분이 있었지만, 실제로 repo에 포함된 MCP SDK 소스를 확인한 결과 다음이 드러났다.

- `registerTool()`은 raw shape과 Zod schema 둘 다 받을 수 있다.
- `normalizeObjectSchema()`는 object schema와 raw shape을 모두 처리한다.
- `server.notification()`은 public API 경로다.

즉, `Tools: (none)`의 직접 원인을 schema 호환성 하나로 단정할 수는 없었다.

### 결정적 단서 1 — project-scope config discovery

사용자는 다른 세션의 Codex가 root config를 보고 있었지만, 현재 테스트 세션은 **repo root의 `.codex/config.toml`**을 사용하고 있다고 밝혔다.

이때 실제 확인한 사실은 다음과 같다.

```bash
cd /Users/lunaxislu/Documents/ai-orchestration
codex mcp list
```

repo root에서는 `bridge`가 보였다.
반면 repo 상위 디렉터리에서 같은 명령을 실행하면 `bridge`가 보이지 않았다.

이 결과는 매우 중요했다.

- bridge 등록은 repo root의 project-scope config에 있다.
- Codex를 repo root 밖에서 시작하면 그 config를 읽지 못한다.
- 따라서 같은 설정 파일이라도 **실행 루트가 다르면 tool discovery 결과가 달라진다**.

이 지점에서 문서와 실행 기준을 모두 다음으로 정리했다.

- canonical config: `./.codex/config.toml`
- 실행 기준: repo root 또는 `codex -C /Users/lunaxislu/Documents/ai-orchestration`
- `~/.codex/config.toml`은 이번 테스트의 기준이 아님

### 결정적 단서 2 — bridge는 initialize 전에 죽고 있었다

Codex가 bridge를 자동 기동하는 경로에서는 `Tools: (none)` 또는 `initialize response` 종료가 반복됐다.
bridge stderr를 직접 본 결과, `8789` HTTP listener를 여는 시점에서 다음처럼 실패했다.

```text
[bridge] http-server: failed to listen on 127.0.0.1:8789: listen EPERM: operation not permitted 127.0.0.1:8789
[bridge] fatal: listen EPERM: operation not permitted 127.0.0.1:8789
```

즉:

- bridge가 HTTP reply server를 띄우는 순간 sandbox/런타임 제약과 충돌할 수 있었다.
- 이 실패가 MCP stdio 핸드셰이크보다 먼저 발생하면 Codex는 tool schema를 끝까지 못 읽는다.
- 그래서 TUI에서는 bridge가 연결 시도는 되는데 `Tools: (none)`으로 남는 현상이 발생했다.

### 해결 방향

문제는 schema보다 **startup ordering**이었다.

해결은 다음 두 가지를 함께 적용하는 것이었다.

1. project-scope config discovery를 기준으로 실행 루트를 고정한다.
   - repo root에서 Codex를 시작한다.
   - 필요 시 `codex -C /Users/lunaxislu/Documents/ai-orchestration`를 사용한다.

2. bridge의 HTTP listener 실패가 MCP discovery 전체를 죽이지 않도록 만든다.
   - HTTP server 시작 실패는 stderr에 기록하되,
   - stdio MCP server 자체는 계속 올라가도록 바꾼다.
   - 즉, `8789` reply server는 중요한 기능이지만, 그 실패가 `initialize` 자체를 막아서는 안 된다.

### 실제 수정 결과

bridge는 이제 다음 순서로 뜬다.

1. signal handler 설치
2. HTTP listener를 비치명적으로 시작 시도
3. 실패해도 MCP stdio 연결은 계속 진행
4. `ask_claude` / `reply_to_claude` tool register
5. Codex가 `/mcp`에서 tool schema를 읽음

이 변경 후 실제로 확인된 것은 다음과 같다.

- Codex에서 bridge가 보인다.
- `/mcp`에서 `ask_claude`, `reply_to_claude`가 표시된다.
- `Tools: (none)` 상태가 사라졌다.
- project-scope config와 Codex 실행 루트를 맞춰야만 같은 결과를 재현할 수 있다.

### 이 사건이 남긴 교훈

1. MCP tool이 안 보일 때 schema만 의심하면 안 된다.
   - tool 등록은 맞는데 process lifecycle이 먼저 죽는 경우가 있다.

2. 프로젝트 스코프 설정은 실행 디렉터리에 민감하다.
   - `./.codex/config.toml`은 repo root 기준으로 읽히는 것이 사실상 전제다.
   - root가 아니면 같은 세션이라도 discovery 결과가 달라진다.

3. bridge는 기능적으로는 relay지만, startup robustness도 아키텍처의 일부다.
   - `ask_claude`가 맞게 구현되어 있어도,
   - HTTP reply server가 예기치 않게 initialize를 깨면 전체 tool discovery가 실패한다.

4. 문제를 제대로 분리해야 한다.
   - config discovery 문제
   - stdio MCP initialize 문제
   - HTTP reply server listen 문제

   이 셋은 서로 다른 원인으로 디버깅해야 한다.

### 현재 상태

- `bridge`는 Codex MCP tool 서버로 사용 가능하다.
- `ask_claude`와 `reply_to_claude`가 `/mcp`에서 보여야 한다.
- Codex는 repo root에서 시작해야 한다.
- project-scope `./.codex/config.toml`이 canonical config다.
- `8789` listener 실패는 이제 MCP discovery 전체를 반드시 죽이지는 않는다.

이 장은 이후에 다시 같은 증상이 나오면, “설정 파일을 못 읽는다”와 “bridge가 초기화 전에 죽는다”를 분리해서 확인하라는 기준점이 된다.

### Claude -> Codex reverse 경로에서 sampling 실험을 했다가 다시 fallback으로 되돌린 이유

forward 경로가 안정화된 뒤, `Claude -> Codex` reverse를 더 단단하게 만들기 위해 sampling/createMessage 기반의 우선 경로를 잠시 실험했다.
아이디어 자체는 단순했다.

- bridge가 Codex 쪽으로 notification을 보내는 대신 sampling 요청으로 직접 응답을 받는다.
- sampling이 성공하면 `reply_to_claude` notification fallback보다 더 명시적인 request/response가 된다.
- 실패 시에만 기존 notification + `reply_to_claude` 경로를 타도록 하여 하위 호환을 유지한다.

하지만 실제로는 이 경로가 기대대로 안정화되지 않았다.

문제는 단순히 bridge 코드 한 군데가 아니라, reverse 경로 전체의 가정이 흔들렸기 때문이다.

1. Codex 쪽 sampling consumer가 이 프로젝트의 실제 런타임에서 항상 기대대로 동작하는지 확신할 수 없었다.
2. reverse를 sampling 우선으로 바꾸면서, 기존 notification fallback의 단순성보다 복잡도가 더 크게 늘었다.
3. 디버깅의 초점이 "왜 안 되지?"에서 "sampling이 안 되면 왜 fallback이 안 되지?"로 분산됐다.

결국 판단은 다음과 같았다.

- bridge reverse는 다시 notification wake-up + `reply_to_claude` fallback으로 되돌린다.
- sampling 실험은 아이디어 기록으로만 남기고, active runtime에서는 제거한다.
- 문서 역시 sampling 우선 표현을 제거하고, notification fallback만 진실로 남긴다.

이 결정의 핵심은 성능이 아니라 **운영 가능성**이었다.
reverse 경로는 forward보다 훨씬 자주 깨질 수 있고, 그럴 때 가장 중요한 것은 "어떤 경로를 실제로 따라가고 있는지"가 한눈에 보이는 것이다.
sampling 우선 구조는 그 관찰 가능성을 오히려 낮췄다.

현재는 다시 다음 원칙으로 정리되어 있다.

- forward: `ask_claude(text)` -> `claude-adapter` -> Claude Code reply -> bridge pending resolve
- reverse: `ask_codex(text)` -> bridge notification wake-up -> `reply_to_claude(chat_id, text)` -> Claude Code reply

즉, reverse는 다시 단순하고 명시적인 notification fallback 모델로 돌아왔다.

### 2026-04-14 추가 기록 — reverse timeout의 실제 원인과 `codex exec` helper fallback

이후 실제로 reverse path를 다시 추적해 보니, 문제는 bridge가 `/codex-request`를 받지 못한 것이 아니었다.

- bridge는 reverse ingress를 정상적으로 받고 있었다.
- `notify` / notification 계열 경로는 Codex가 inbound trigger로 소비해 주지 않았다.
- 그래서 `reply_to_claude`는 호출되지 않았고, reverse pending은 항상 timeout으로 끝났다.

이 저장소의 현재 활성 해결책은 notification wake-up이 아니라 `codex exec` helper turn이다.

- bridge가 reverse ingress를 받는다.
- bridge가 repo root에서 `codex exec`를 짧게 실행한다.
- helper Codex가 답변 텍스트를 출력한다.
- bridge가 그 텍스트를 reverse pending의 결과로 돌려준다.

이 방식은 live Codex 세션을 깨우는 진짜 inbound hook은 아니지만, 현재 repo 안에서 reverse를 실제로 동작시키는 경로로 확인됐다.

검증 결과:

- `POST /codex-request` → 30초 timeout: ❌ old path
- `POST /codex-request` → `codex exec` helper turn → 200 OK: ✅ current path

따라서 앞으로 reverse 문제를 다시 볼 때는 “Codex notification이 왜 안 왔나”보다
“helper Codex exec이 왜 답을 못 냈나”를 먼저 봐야 한다.

### 2026-04-14 추가 기록 — reverse helper exec를 live MCP elicitation으로 교체

helper `codex exec` turn은 reverse를 동작시키는 우회 경로로는 쓸 수 있었지만, 현재 요구사항인 live session reply와는 맞지 않았다.

이번에는 bridge reverse를 다시 live Codex MCP 세션에 직접 붙는 경로로 되돌렸다.

- bridge가 `/codex-request`를 받으면 reverse pending을 만든다.
- bridge가 `mcpServer.server.elicitInput(...)`으로 Codex 클라이언트에 live elicitation을 건다.
- Codex live 세션이 응답한 text를 bridge가 reverse pending의 결과로 반환한다.
- `reply_to_claude`는 여전히 manual / 호환성 경로로 남겨둔다.

이렇게 하면 reverse 경로가 더 이상 detached helper process에 의존하지 않고,
실제 Codex MCP 세션과 같은 연결 위에서 동작한다.

---

## 2026-04-15 추가 기록 — child Codex 사전 초기화로 인한 프로세스 폭증과 lazy init으로 전환

### 증상

Activity Monitor 기준으로 다음 프로세스들이 200개 이상 실행 중이었다.

- `node bridge/index.js` — 206개
- `node codex mcp-server` — 206개
- `codex` (native binary) — 204개
- `npm exec @upstash/context7-mcp` — 다수

모든 프로세스는 `lunaxislu` 유저 소유였고, 각각 ~40MB 메모리를 점유했다.

### 원인 분석

문제 구간은 `bridge/index.js`의 세 줄이었다.

- `bridge/index.js:347` — `this.codexMcpReady = this.startCodexMcpClient()`
- `bridge/index.js:351` — `void this.codexMcpReady.catch(...)`
- `bridge/index.js:719` — `startCodexMcpClient()` 내부 `new StdioClientTransport({ command: "codex", args: ["mcp-server", ...] })`

`bridge.start()`가 호출되는 즉시 `startCodexMcpClient()`가 실행되고, 여기서 child Codex 프로세스(`codex mcp-server -c mcp_servers={}`)를 spawn했다. child Codex는 자기 MCP 설정을 다시 읽어 context7 같은 서버를 추가로 초기화했다.

`mcp_servers={}` 인자는 "bridge 재귀 로드만 차단"하는 목적이었다. 하지만 `~/.codex/config.toml`과 project-scope `.codex/config.toml`의 MCP 서버 설정은 별개로 존재하기 때문에, child Codex가 context7 등을 함께 시작하는 것을 막지 못했다.

Codex 세션이 열릴 때마다 bridge가 spawn되고, bridge가 spawn될 때마다 child Codex가 spawn되는 구조였기 때문에, 세션이 반복될수록 프로세스가 정리되지 않고 선형 증가했다.

### 왜 기존 설계가 이렇게 됐는가

bridge startup 시점에 child Codex와 thread를 미리 만들어 두는 것은 reverse 경로 응답 지연을 줄이기 위한 의도였다. 첫 reverse 요청이 들어오기 전에 thread를 생성해 두면, 실제 요청이 왔을 때 thread 생성 비용 없이 바로 응답할 수 있다는 가정이었다.

하지만 이 가정은 세션 수명과 프로세스 수명이 일치한다는 전제를 요구했다. 실제로는 Codex가 새 세션을 시작할 때 이전 bridge 프로세스를 종료하지 않았기 때문에, 시간이 지날수록 idle한 bridge + child Codex가 무한 누적됐다.

### 수정 내용

child Codex 초기화를 bridge startup에서 제거하고, reverse 요청이 실제로 들어왔을 때만 lazy하게 child Codex를 시작하도록 변경했다.

변경 전:
```js
async start() {
  // ...
  this.codexMcpReady = this.startCodexMcpClient(); // startup 즉시 spawn
  // ...
}
```

변경 후:
```js
async start() {
  // startCodexMcpClient() 호출 없음
  // reverse 요청이 들어오면 requestCodexReplyViaMcp() 내부에서 lazy 초기화
}
```

`requestCodexReplyViaMcp()` 내부에서 `this.codexMcpClient`가 null인 경우에만 `startCodexMcpClient()`를 호출한다. 이미 연결된 경우에는 기존 client와 threadId를 재사용한다.

### 결과

- 프로세스 폭증 현상 해결
- bridge가 기동할 때 불필요하게 child Codex를 띄우지 않는다
- reverse 요청이 없는 bridge 세션은 child Codex를 전혀 만들지 않는다
- 첫 reverse 요청 시에만 child Codex가 초기화된다

### 이 사건이 남긴 교훈

1. startup 시점의 선제적 초기화는 프로세스 수명 관리가 보장될 때만 안전하다.
   - bridge 프로세스가 세션 종료 시 반드시 정리된다는 보장이 없으면, eager init은 프로세스 누적을 만든다.

2. `mcp_servers={}` 인자는 bridge 재귀만 막는다.
   - 전역 / 프로젝트 스코프 config에 있는 다른 MCP 서버들은 child Codex가 그대로 초기화한다.
   - child Codex를 spawning할 때 외부 MCP 서버 전체를 막으려면 별도 환경변수나 config override가 필요하다.

3. forward 전용 세션에 reverse 인프라가 상주할 이유가 없다.
   - reverse를 쓰지 않는 경우에도 child Codex를 미리 들고 있는 것은 비용이다.
   - lazy init은 실제로 역방향이 필요할 때만 자원을 쓴다.

### 현재 상태

- child Codex는 첫 reverse 요청 시점에만 lazy하게 초기화된다.
- forward 전용 세션에서는 child Codex가 존재하지 않는다.
- 프로세스 폭증은 재현되지 않는다.
