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
