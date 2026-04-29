# Bridge 테스트 절차

이 문서는 shared Codex app-server 아키텍처에서 `bridge`의 forward (`ask_claude`) 경로와 reverse (`ask_codex`) 경로가 실제 UI transcript까지 왕복하는지 확인하는 절차다.

## 사전 조건

- `claude-adapter`의 HTTP 서버가 `127.0.0.1:8788`에 떠 있어야 한다.
- `./.codex/config.toml`에 `[mcp_servers.bridge]`가 등록되어 있어야 한다 (`command=node`, `args=["bridge/index.js"]`).
- `bridge`는 Codex가 MCP 자식 프로세스로 직접 spawn한다. 별도 기동 불필요.
- Codex app-server는 `ws://127.0.0.1:4500`에서 listen 한다.
- Codex UI는 `codex --remote ws://127.0.0.1:4500`로 같은 app-server에 붙어 있어야 한다. 이 UI가 bridge가 `turn/start`로 주입한 relay 프롬프트를 수신할 주체다.

## 0. 터미널 구성

| 터미널 | 명령 | 역할 |
| --- | --- | --- |
| A | `codex app-server --listen ws://127.0.0.1:4500` | 공유 app-server |
| B | `codex --remote ws://127.0.0.1:4500` | UI transcript (reverse 경로가 여기로 들어옴) |
| C | `claude --dangerously-load-development-channels server:claude-adapter` | Claude Code 세션 |

순서는 A → B → C. B 세션에서 Codex는 `ask_claude` / `reply_to_claude` tool을 사용하고, bridge는 B의 threadId를 `thread/loaded/list`로 discover 한다.

## 1. Test A — bridge 연결 실패 (app-server 없음)

터미널 A를 내린 상태에서 Claude에서 `ask_codex("ping")`을 호출한다.

기대 결과:

- bridge stderr: `codex-app-server: connect failed ...`
- `claude-adapter`의 `ask_codex` 호출이 명시적 오류로 실패한다 (무한 대기 금지).

## 2. Test B — forward `ask_claude`

터미널 B의 Codex UI에서 `ask_claude("안녕이라고 답해줘")`를 호출한다.

예상 흐름:

1. bridge가 `chat_id = crypto.randomUUID()` 생성
2. bridge → `POST http://127.0.0.1:8788/` (claude-adapter)
3. claude-adapter가 `<channel source="claude-adapter" chat_id="..." origin="codex">...</channel>`로 Claude 세션에 주입
4. Claude가 `reply` tool 호출 → `claude-adapter` → `POST /claude-reply` → bridge
5. bridge가 pending forward를 resolve, Codex tool 결과 반환

bridge 로그에서 확인:

- `ask_claude: sending chat_id=...`
- `claude-reply: resolved chat_id=...`
- `ask_claude: resolved chat_id=...`

## 3. Test C — reverse `ask_codex` (UI transcript 확인)

Claude 세션에서 `ask_codex("간단히 OK라고만 답해줘")`를 호출한다.

예상 흐름:

1. claude-adapter → `POST http://127.0.0.1:8789/codex-request` → bridge
2. bridge가 `reverseRequests.set(chat_id, pending)` 등록
3. bridge가 `wrapRelayPrompt(text, chat_id)`로 `[MCP RELAY — chat_id: ...]` 마커 프롬프트 생성
4. bridge가 app-server WS에 `turn/start { threadId, input:[{type:"text", text:<wrapped>}] }` 전송
5. **터미널 B의 Codex UI transcript에 relay 프롬프트가 실제로 표시됨** (사람이 육안 확인)
6. Codex 모델이 MCP RELAY 마커를 보고 `reply_to_claude(chat_id, text)` tool 호출
7. bridge가 reverse pending을 resolve → claude-adapter → Claude 세션에 `ask_codex` 결과 반환

성공 판정:

- Claude 세션에서 `ask_codex`가 정상 반환 텍스트 수신
- 터미널 B의 Codex UI에 해당 turn이 transcript로 남아 있음 (중요)
- bridge 로그: `codex-app-server: dispatched chat_id=... threadId=... turnId=...`, `reply_to_claude: resolved chat_id=...`

## 4. Test D — timeout

Claude 세션에서 reply tool을 일부러 호출하지 않거나, Codex 모델이 `reply_to_claude`를 호출하지 않고 turn이 끝나면 bridge가 timeout으로 실패해야 한다.

기대 결과:

- forward: `Timed out waiting for Claude reply after 30000ms`
- reverse: `Timed out waiting for Codex reply after ...ms`

## 5. Test E — app-server 재시작 재연결

1. Test C까지 통과한 상태에서 터미널 A (`codex app-server`)를 Ctrl+C로 내린다.
2. 다시 `codex app-server --listen ws://127.0.0.1:4500`로 재기동한다.
3. 터미널 B (`codex --remote ...`)도 재기동한다 (threadId가 새로 발급되므로).
4. Claude에서 `ask_codex("재연결 확인")`을 다시 호출한다.

기대 결과:

- bridge가 끊긴 WS를 재연결하고 새 threadId를 `thread/loaded/list`로 재발견
- 새 relay 프롬프트가 새 UI transcript에 표시됨
- `ask_codex`가 정상 반환

## 6. 실패 진단 체크리스트

| 증상 | 원인 후보 |
| --- | --- |
| `ask_codex`가 무한 대기 | bridge → app-server WS 연결 실패, 또는 `thread/loaded/list`가 빈 배열 (UI가 아직 안 붙음) |
| UI에 relay 프롬프트는 뜨지만 응답 없음 | Codex 모델이 `[MCP RELAY]` 마커를 무시하고 작업 모드로 진입. `wrapRelayPrompt` 문구 강화 필요 |
| reply_to_claude 호출은 왔는데 resolve 안 됨 | chat_id mismatch. bridge 로그에서 `reverseRequests` 키 확인 |
| forward는 되는데 reverse만 실패 | threadId discover 문제. bridge 로그 `discoverThreadId` 결과 확인 |

## 7. 주의

- bridge는 Codex가 MCP child로 spawn한다. 직접 `node bridge/index.js`로 띄우지 않는다.
- reverse 경로의 성공 조건은 "tool이 값을 반환함"이 아니라 **"UI transcript에 실제 turn이 남고 사람이 그 내용을 읽을 수 있음"**이다.
- `[MCP RELAY — chat_id: ...]` 마커는 bridge가 injection 하는 것이지 사용자가 작성하는 것이 아니다. 이 마커가 보이지 않는다면 `dispatchPrompt` 경로가 깨진 것이다.
- `claude-adapter`와 Codex app-server는 별도 프로세스로 독립적으로 떠 있어야 한다.
