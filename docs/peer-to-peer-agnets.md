좋다. `docs/`에 이미 3개 파일이 있다.

**있는 것:**

- `bridge-architecture.md` — Codex가 오늘 조사한 전체 기록
- `session-bridge-notes.md` — thread identity, 아키텍처 정리
- `app-server.md` — app-server 동작 방식

**노션에 있는데 `docs/`에 없는 것:**

- 의사결정 히스토리 (왜 이 구조가 됐는가 — 시도/실패/판단 과정)
- Claude Code용 지시서
- Codex용 지시서
- MCP 배포 구조 확정 (Codex 조사 결과)
- Claude Code PoC 결과 (fakechat 검증)

이것들을 `docs/`에 추가하라고 Codex한테 지시하면 된다. 노션 링크보다 파일로 주는 게 에이전트한테 훨씬 효과적이다.

Codex한테 이걸 붙여넣어라:

---

```
docs/ 폴더에 아래 파일들을 추가로 만들어줘.
내용은 그대로 복사해서 넣으면 된다.

---

파일명: docs/decision-history.md

# 의사결정 히스토리 — 왜 이 구조가 됐는가

이 문서는 구현 중 판단이 필요할 때 참고하는 의사결정 과정 기록이다.
모든 내용은 2026-04-09 실제 PoC 세션에서 확인된 것들이다.

## 원래 목표

두 에이전트가 서로에게 말을 걸 수 있는 시스템.
- Codex에서 "claude에게 물어봐" → 살아있는 Claude Code 세션에 전달 → 응답 반환
- Claude Code에서 "codex에게 물어봐" → 살아있는 Codex 세션에 전달 → 응답 반환
핵심: 비대화형 일회성 호출이 아니라 실행 중인 두 세션 간 직접 메시지 relay.

## 시도 1: "context 공유" 가설

처음 생각: 두 세션이 context를 공유하면 되지 않을까?
판명: 틀렸다.
Claude Code 세션과 Codex thread는 각자 독립적인 상태를 유지한다.
context 자체를 공유하는 API나 프로토콜은 존재하지 않는다.
브리지가 할 수 있는 건 텍스트를 양쪽에 주입하는 것이지, context 자체를 공유하는 게 아니다.
결론: "context 공유" → "message relay"로 용어 변경.

## 시도 2: Claude Code 세션에 Channels 기능을 물어보기

시도: Claude Code 세션에 fakechat 사용법을 직접 질문함.
질문 1: "fakechat으로 inject하는 방법 알려줘"
결과: 거부. "세션 무결성을 손상시키는 방법을 제공할 수 없습니다."
원인: `inject`라는 단어가 보안 가이드라인을 트리거함.

질문 2: "channels 기능으로 fakechat 공식 절차 알려줘"
결과: "정확한 절차를 모릅니다."
원인: Claude Code 세션은 자기 자신의 Channels 기능을 모른다.
Channels는 세션 시작 플래그(--channels)로 활성화하는 기능이라 세션 안에서 물어봐도 의미없다.

교훈: Claude Code 세션에 Claude Code 자신의 기능을 물어봐도 모른다. 터미널 직접 실행이 정답이다.

## 시도 3: fakechat 터미널 직접 실행

버전 확인: claude --version → 2.1.97 (Channels 지원 버전, v2.1.80 이후)
실행:
  bun --version
  claude /plugin install fakechat@claude-plugins-official
  claude --channels plugin:fakechat@claude-plugins-official

결과: 성공.
  ← fakechat · web: 안녕
  plugin:fakechat:fakechat – reply (MCP)(text: "안녕하세요! 뭘 도와드릴까요?")

확인된 것:
- 브라우저 → Claude Code 세션: 메시지 주입 성공
- Claude Code 세션 → 브라우저: reply tool로 응답 전송 성공
- two-way channel 작동
- --dangerously-load-development-channels 없이 공식 채널(fakechat)으로 성공
- custom channel은 --dangerously-load-development-channels 필요

## 시도 4: Codex stdio 모드 JSON-RPC

시도: printf pipe로 JSON-RPC 전송
결과: initialize 응답만 옴. thread/start 응답 없음.
원인: stdin EOF로 프로세스가 종료됨. pipe 방식은 일회성이라 풀 시퀀스에 적합하지 않다.
interactive 모드로 변경 후 ping/pong 성공.

## 시도 5: Same-session mapping 시도 — 가장 큰 벽

가설: app-server를 띄워서 현재 CLI 세션의 thread에 붙이면 되지 않을까?
Codex CLI 세션 확인: Session: 019d726e-a08c-75f0-955e-dd425fd007c7
app-server가 만든 thread id: 019d7273-5f73-73f3-86c6-f2beabd573ea
결과: 불일치. 다른 thread.

ps 확인: VS Code Extension이 띄운 app-server들은 전부 --analytics-default-enabled만 있음.
--listen ws://... 플래그 없음 → 전부 stdio 전용 → 외부 접근 불가능.

환경 정정: cmux에서 띄운 건 VS Code Extension이 아니라 Codex CLI다.

Codex에게 확인:
"stdio 모드면 하나의 프로세스에 하나의 클라이언트만 가능.
다른 터미널에서 같은 프로세스에 붙는 건 불가능."

판명: stdio 모드로는 구조적으로 same-session mapping 불가능.

## 시도 6: thread/resume 우회 가능한지 확인

질문: 외부 프로세스가 thread/resume으로 현재 세션 id를 넣으면 UI에 반영되는가?
Codex 답변:
"No. thread/resume reopens the persisted thread in the new process,
but it does not attach to or update the already-open Codex UI connection,
unless the UI itself is subscribed to that same app-server thread."

판명: thread/resume만으로는 UI 반영 안 됨.
UI가 같은 app-server thread를 구독하고 있어야 함.

## 시도 7: JSONL tail-f 발견

질문: ~/.codex/sessions/...jsonl이 실시간 append되는가?
Codex 답변: Yes. tail -f로 현재 세션 이벤트 실시간 관찰 가능.
ping/pong turn 이벤트가 이미 파일에 찍혀 있음.

단, 제약: JSONL에 외부 프로세스가 append해도 UI에 자동 반영 안 됨.
판명: 단방향 수신(세션 이벤트 감지)에는 쓸 수 있음. 주입은 안 됨.

## 핵심 돌파 — WebSocket 모드 발견

질문: codex CLI를 --listen ws://127.0.0.1:4500으로 띄운 app-server에 붙이는 방법이 있는가?
Codex 답변:
  codex --remote ws://127.0.0.1:4500
  codex resume --remote ws://127.0.0.1:4500
  codex fork --remote ws://127.0.0.1:4500

로컬 루프백(127.0.0.1)이면 auth token 없이 사용 가능.

WS 모드 검증:
- 외부 클라이언트가 WS app-server에 붙음 ✅
- thread/resume 동작 ✅
- 같은 threadId에 turn/start 주입 ✅
- 이벤트 스트림 수신 ✅
- same-session mapping ✅

판명: stdio가 막힌 것을 WS 모드가 품. 이게 유일한 공식 경로.

## 최종 확정 아키텍처

codex app-server --listen ws://127.0.0.1:4500
        ↑                         ↑
codex --remote ws://127.0.0.1:4500    bridge (WS client)
   (사용자 Codex UI)                        ↕
                            Claude Code channels
                            (custom channel)
                                       ↕
                                  Claude Code 세션

이 아키텍처가 된 이유:
1. stdio 모드로는 외부에서 현재 세션에 붙는 것이 구조적으로 불가능함을 확인하고
2. thread/resume만으로는 UI 반영이 안 됨을 확인하고
3. WS 모드 + codex --remote가 같은 서버에 UI와 bridge를 동시에 붙이는 유일한 공식 경로임을 Codex가 직접 확인해줬기 때문.

## 핵심 제약조건 요약

| 제약 | 이유 |
|------|------|
| stdio 모드로는 동시 연결 불가 | 프로세스 하나에 클라이언트 하나 원칙 |
| thread/resume만으로 UI 반영 불가 | UI가 같은 app-server에 구독돼 있어야 함 |
| Channels는 --channels 플래그로만 활성화 | 세션 중 동적 설정 불가 |
| Bun 런타임 필수 | Node.js에서는 플러그인 silent fail |
| custom channel은 --dangerously-load-development-channels 필요 | 공식 allowlist 외부임 |
| CLI Session: ≠ app-server thread.id | 완전히 다른 개념. 절대 혼동하지 마라 |
| Python 사용 금지 | 종속성 문제, Node.js 24 built-in WebSocket 사용 |

## 에이전트가 구현 중 벽에 부딪혔을 때

질문 A: "stdio로 하면 안 되나?"
→ 위의 판단 과정 D 참고. stdio는 구조적으로 안 된다. WS 모드를 써라.

질문 B: "thread/resume로 UI에 메시지 돌리면 안 되나?"
→ 위의 판단 과정 E 참고. UI가 이미 같은 app-server에 구독돼 있어야 bridge turn/start가 UI에 보인다.

질문 C: "Claude Code 세션에 Channels 사용법을 물어봤는데 모른다고 한다"
→ 정상이다. 세션은 자기 기능을 모른다. 터미널에서 직접 확인하라.

질문 D: "Claude Code custom channel에서 Bun 아닌 Node.js로 시도하면?"
→ 안 된다. Claude Code 공식 플러그인은 전부 Bun 스크립트다. Node.js에서는 silent fail된다.

---

파일명: docs/claude-adapter-spec.md

# Claude Adapter 구현 명세

## 목표

Claude Code용 custom channel 서버.
bridge가 Claude Code 세션에 메시지를 보내고, Claude Code 응답을 bridge로 받아오는 MCP 서버.

## 검증된 사실

- Claude Code v2.1.97에서 Channels 기능 작동 확인
- claude --channels plugin:fakechat@claude-plugins-official로 fakechat 채널 실행 성공
- 브라우저 → Claude Code 세션: 메시지 주입 성공
- Claude Code 세션 → 브라우저: reply tool로 응답 전송 성공
- two-way channel 작동
- --dangerously-load-development-channels 없이 공식 채널(fakechat)으로 성공
- custom channel은 --dangerously-load-development-channels 필요
- Bun 런타임 필수. Node.js에서는 플러그인 silent fail.

## 아키텍처 위치

```

Claude Code 세션
↑ (channel event)
↓ (reply tool)
custom channel 서버 ←→ bridge core

```

## 기술 스택

- 런타임: Bun (필수. Node.js 불가)
- 프로토콜: MCP (Model Context Protocol) — @modelcontextprotocol/sdk 사용
- transport: stdio (Claude Code가 subprocess로 실행)
- 배포 방식: npx 또는 bunx로 실행 가능한 단일 파일

## 파일 구조

```

ai-orchestration/
claude-adapter/
index.ts # 메인 채널 서버
package.json
README.md

````

## 구현해야 할 것

1. MCP 서버로 등록 (@modelcontextprotocol/sdk 사용)
2. channel capability 선언 (Claude Code가 channel로 인식하게)
3. 인바운드 이벤트 처리: bridge가 HTTP POST 또는 WS로 메시지를 보내면 Claude Code 세션에 전달
4. reply tool 구현: Claude Code가 응답할 때 reply(text: string) tool 호출 → bridge로 전달
5. bridge와의 통신: localhost:8788로 HTTP

참고: fakechat 공식 소스
https://github.com/anthropics/claude-plugins-official

## 실행 방법 (완성 후)

```bash
claude --channels plugin:./claude-adapter/index.ts \
       --dangerously-load-development-channels
````

## 제약조건

- Python 사용 금지. Bun/Node.js만 사용
- 외부 개발자가 npx 또는 bunx 한 줄로 실행 가능해야 함
- 종속성 최소화. @modelcontextprotocol/sdk 외 추가 패키지 최대 2개
- bridge와의 통신은 localhost만 (보안)
- loop 방지: Claude Code가 보낸 메시지가 다시 Claude Code로 돌아오지 않도록 origin 태그 확인

## 완료 기준

- [ ] claude --channels ... --dangerously-load-development-channels로 채널 서버 실행됨
- [ ] bridge에서 HTTP POST 보내면 Claude Code 세션에 메시지 도착
- [ ] Claude Code가 응답하면 bridge가 수신
- [ ] loop 방지 동작 확인
- [ ] README에 실행 방법 작성

---

파일명: docs/bridge-core-spec.md

# Bridge Core 구현 명세

## 목표

Codex app-server(WS)와 Claude Code channel 사이에서 메시지를 relay하는 프로세스.

## 검증된 사실

```bash
# WS 모드로 app-server 시작
codex app-server --listen ws://127.0.0.1:4500

# CLI UI를 그 서버에 연결
codex --remote ws://127.0.0.1:4500

# 외부 클라이언트도 같은 서버에 WS로 연결 가능
```

JSON-RPC 시퀀스 (검증된 순서):

```json
{"method":"initialize","id":1,"params":{"clientInfo":{"name":"bridge","version":"0.1"}}}
{"method":"initialized","params":{}}
{"method":"thread/start","id":2,"params":{"model":"gpt-5.4","cwd":"/path","approvalPolicy":"never"}}
// 또는
{"method":"thread/resume","id":2,"params":{"threadId":"<THREAD_ID>"}}
{"method":"turn/start","id":3,"params":{"threadId":"<THREAD_ID>","input":[{"type":"text","text":"<MESSAGE>"}]}}
```

관찰한 노티피케이션:

- thread/started, thread/status/changed
- turn/started, turn/completed
- item/started, item/completed
- item/agentMessage/delta ← 응답 텍스트가 여기서 나옴
- thread/tokenUsage/updated

thread identity 규칙:

- thread.id가 공유 대화 키다
- CLI Session: 값과 app-server thread.id는 다르다. 절대 혼동하지 마라
- bridge와 UI가 같은 thread.id를 써야 같은 대화에 참여하는 것이다

## 아키텍처 위치

```
Codex CLI UI
    ↑ (WS)
    ↓
codex app-server --listen ws://127.0.0.1:4500
    ↑ (WS)
    ↓
bridge core  ←→  Claude Code channel 서버 (localhost:8788)
```

bridge는 두 개의 WS 연결을 동시에 유지한다:

1. Codex app-server WS 연결
2. Claude Code channel 연결 (HTTP 또는 WS)

## 기술 스택

- 런타임: Node.js 24 (built-in WebSocket 사용. ws 패키지 추가 설치 금지)
- 배포 방식: npx로 실행 가능한 단일 파일
- MCP 서버: @modelcontextprotocol/sdk 사용

## 배포 구조 (Codex가 확인)

```json
{
  "mcpServers": {
    "codex-claude-bridge": {
      "command": "npx",
      "args": ["-y", "@your-scope/codex-claude-bridge@latest"]
    }
  }
}
```

내부 구조:

- 바깥쪽: MCP host가 붙는 stdio 서버
- 안쪽 1: Codex app-server에 붙는 WebSocket client
- 안쪽 2: Claude Code channel adapter
- 가운데: relay state machine

## 파일 구조

```
ai-orchestration/
  bridge/
    index.js          # 메인 bridge 프로세스
    codex-adapter.js  # Codex WS 클라이언트
    claude-adapter.js # Claude Code channel HTTP 클라이언트
    package.json
    README.md
```

## Bridge가 구현해야 할 것

1. Codex app-server WS 연결

```javascript
// Node.js 24 built-in WebSocket
const ws = new WebSocket("ws://127.0.0.1:4500");
// initialize → initialized → thread/resume → turn/start 순서 준수
```

2. trigger 감지

- item/agentMessage/delta 이벤트에서 에이전트 메시지 수집
- turn/completed 후 메시지 파싱
- 트리거 조건: "claude에게 물어봐" 포함 시 Claude Code로 relay

3. Claude Code channel로 메시지 전송

```javascript
await fetch("http://localhost:8788/send", {
  method: "POST",
  body: JSON.stringify({
    text: message,
    origin: "codex",
    relay_depth: depth,
    thread_id: codexThreadId,
  }),
});
```

4. Claude Code reply 수신 후 Codex turn/start로 주입

5. Safety 장치

```javascript
const MAX_HOPS = 3;
const TIMEOUT_MS = 30000;
if (message.relay_depth >= MAX_HOPS) return;
if (message.origin === "codex" && target === "codex") return;
```

## thread id 가져오는 방법

bridge가 시작할 때 thread id를 알아야 한다.
선택지:

1. thread/start로 새 thread 생성 → 반환된 thread.id 사용
2. 사용자가 --thread-id 인자로 직접 주입
3. ~/.codex/sessions/ JSONL 파일에서 최신 세션 id 읽기

주의: CLI Session: 값(예: 019d726e-...)과 app-server thread.id(예: 019d7273-...)는 다르다. 혼동 금지.

## 실행 방법 (완성 후)

```bash
# 1. app-server 시작
codex app-server --listen ws://127.0.0.1:4500

# 2. Codex UI 연결
codex --remote ws://127.0.0.1:4500

# 3. bridge 실행
node bridge/index.js \
  --codex-ws ws://127.0.0.1:4500 \
  --claude-channel http://localhost:8788 \
  --thread-id <THREAD_ID>
```

## 완료 기준

- [ ] codex app-server --listen ws://4500에 bridge가 WS로 연결됨
- [ ] turn/start로 넣은 메시지가 Codex UI에 표시됨
- [ ] Codex 응답이 item/agentMessage/delta로 수신됨
- [ ] trigger 감지 후 Claude Code channel로 전송됨
- [ ] Claude Code reply가 bridge를 통해 Codex로 다시 주입됨
- [ ] MAX_HOPS 루프 방지 동작 확인
- [ ] timeout 핸들링 동작 확인
- [ ] README에 실행 방법 작성

---

파일명: docs/mcp-deployment.md

# MCP 배포 구조

## 결론 (Codex가 2026-04-09에 직접 확인)

하나의 MCP 서버로 전체를 감쌀 수 있다.
사용자가 추가해야 할 설정은 최소 1개다.

## 사용자 설정 (1개)

```json
{
  "mcpServers": {
    "codex-claude-bridge": {
      "command": "npx",
      "args": ["-y", "@your-scope/codex-claude-bridge@latest"]
    }
  }
}
```

## 내부 구조

```
[MCP host (Claude Code / 기타 MCP 클라이언트)]
        ↓ stdio JSON-RPC
[bridge MCP 서버 (npx로 실행)]
  ├─ Codex WS client ──────────────► codex app-server ws://127.0.0.1:4500
  ├─ Claude adapter ───────────────► Claude Code channel (localhost:8788)
  └─ relay state machine
       ├─ thread ID 정합성 관리
       ├─ trigger 감지
       ├─ loop breaker (max_hops)
       └─ timeout 처리
```

## MCP transport 선택 이유

- stdio: MCP host가 서버를 subprocess로 띄운다. 서버는 stdin/stdout으로 JSON-RPC. 로그는 stderr로만.
- 외부는 stdio로 단순하게, 내부에서 Codex WS 연결과 Claude adapter를 모두 흡수한다.
- 로컬 단일 사용자 기준으로는 stdio가 적합하다.
- 여러 외부 클라이언트를 직접 받으려면 Streamable HTTP가 더 맞지만, 현재 범위는 로컬이다.

## 참고: steipete/claude-code-mcp 동일 패턴

```json
{
  "mcpServers": {
    "claude-code-mcp": {
      "command": "npx",
      "args": ["-y", "@steipete/claude-code-mcp@latest"]
    }
  }
}
```

우리도 동일한 패턴으로 간다.

## package.json 구조

```json
{
  "name": "@your-scope/codex-claude-bridge",
  "version": "0.1.0",
  "bin": {
    "codex-claude-bridge": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

## 환경변수 정책

패키지 기본값으로 흡수하고, 필요 시만 환경변수로 오버라이드:

- CODEX_WS_URL: 기본값 ws://127.0.0.1:4500
- CLAUDE_CHANNEL_URL: 기본값 http://localhost:8788
- CLAUDE_CLI_PATH: 기본값 자동 탐색

```


```
