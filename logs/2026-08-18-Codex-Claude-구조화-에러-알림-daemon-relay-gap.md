---
topic: Codex 구조화 에러 알림 미수신 gap + Claude 대응 조사
description: codex app-server(codexErrorInfo)와 claude CLI 양쪽이 API 에러를 어떤 구조로 노출하는지 조사하고, aiox codex adapter가 이미 받고 있는 websocket 알림 중 error/turn 계열을 구독하지 않아 daemon까지 relay되지 않는 gap을 발견. 양쪽 에러 구조 비교, daemon relay 설계·구현 필요성을 기록.
status: open
---

## Work Items

- [x] W1 클로드 쪽 대응 조사
- [>] W2 daemon relay 설계 (app-server websocket 리스너 + 에러 relay 이벤트 타입)
- [ ] W3 구현

## Required Context

### Return Target

- None: independent log.

### {Global}

- codex 쪽 근거는 2026-08-18에 codex app-server websocket에 직접 연결한 실험과 `codex app-server generate-json-schema` 출력, aiox repo grep(codexErrorInfo/turn completed/willRetry 0건)으로 확인. claude 쪽 근거는 같은 날 이 환경에 설치된 claude CLI(v2.1.234, /Users/lunaxislu/.local/bin/claude 실바이너리, PATH 최상단 cmux 래퍼 우회)로 --print --output-format=json/stream-json을 직접 실행해 확인한 사실이며, 공식 문서(code.claude.com/docs/en/headless)의 system/api_retry 절도 근거로 포함.

## 2026-08-18 · codex 구조화 에러 미수신 gap 발견 + claude 대응 조사

**현재 상태 — codex 구조화 에러 알림을 aiox가 받고도 버리는 gap**

codex app-server는 JSON-RPC notification `method: "error"`(params = `ErrorNotification`)로 turn 단위 운영
에러를 구조화된 형태로 내보낸다. 사용량 한도(`usageLimitExceeded`), context window 초과
(`contextWindowExceeded`), 서버 과부하(`serverOverloaded`) 등은 `error.codexErrorInfo` enum/variant로
명확히 분류된다. `turn/completed` notification도 별도로 존재한다(`ServerNotification` 스키마의
oneOf 목록에서 확인).

**정정: 최초 문제 제기가 "aiox 코드가 이 트래픽을 전혀 못 본다"고 서술했는데, 이번에 코드를 직접 열어
확인한 결과 그 서술은 부정확하다.** 실제로는:

- aiox는 codex app-server의 websocket에 **자기 자신의** JSON-RPC 클라이언트로 이미 연결하고 있다.
  `src/adapters/codex/websocket.ts`의 `connectCodexAppServerWebSocket`(제네릭 JSON-RPC 클라이언트,
  `request`/`onNotification`/`onClose` 제공)을 `src/adapters/codex/runtime.ts:329-334`
  (`attachCodexAgentRuntime`)이 프로덕션 경로에서 무조건 호출해 연결한다. 이 연결은 TUI가 별도로 맺는
  연결과 무관한, aiox 자체 채널이다. `thread/start`/`thread/resume`/`thread/loaded/list`, 그리고
  `src/adapters/codex/injector.ts`의 `injectTurnStart`가 보내는 `turn/start` 요청도 이 연결로 나간다.
- `websocket.ts`의 메시지 파서(`isJsonRpcNotification`, 150-169행)는 `id` 없이 `method`가 string인
  메시지를 notification으로 분류해 등록된 리스너 전체(`notificationListeners`)에 그대로 전달한다.
  `error`/`turn/completed`는 정확히 이 형태(id 없음, method string)이므로 **파싱·라우팅 자체는 이미
  통과한다.**
- 그런데 이 연결의 유일한 실사용 리스너는 `runtime.ts:281-285`이며, 내용은 다음과 같다:

  ```ts
  this.webSocket.onNotification?.((notification) => {
    if (notification.method === "remoteControl/status/changed") {
      this.#latestDiagnosticNotification = notification;
    }
  });
  ```

  `method`가 `remoteControl/status/changed`가 아닌 모든 notification(`error`, `turn/completed` 포함)은
  이 분기에서 조용히 버려진다. 즉 codex가 `usageLimitExceeded`를 보내도 aiox 프로세스 메모리 안에서
  파싱까지는 되지만 그 다음 아무 데도 가지 않는다.
- `injector.ts`의 `injectTurnStart`는 `turn/start` 요청의 **동기 ack**(요청이 accept됐는지)만 성공/실패로
  다루고, 그 turn이 실제로 진행되다 나중에 비동기로 도착하는 `error`/`turn/completed` notification은
  기다리지도 참조하지도 않는다.
- `CodexAgentRuntimeFailureReason`(`runtime.ts:36-46`)은 `app_server_process_exited`, `ws_dropped` 두
  가지뿐이다. turn 단위 API 에러를 위한 reason이 없다 — 애초에 이 타입은 "연결/프로세스가 죽었다"는
  fatal 케이스만 모델링하고, "연결은 살아있는데 이번 turn이 quota로 실패했다"는 케이스는 범주에
  없다.
- grep 확인(2026-08-18, `src/` 전체): `codexErrorInfo`, `turn/completed`, `willRetry` 문자열 0건.
  `websocket.ts`/`runtime.ts` 자체에는 JSON-RPC·notification 처리 코드가 있지만, 그 코드가 이 세
  키워드를 다루는 지점은 없다는 뜻으로 일치한다.

**받으려면 뭐가 필요한가**

당초 제기됐던 "지속 연결이 아예 없다"는 전제와 달리, 연결 인프라(`connectCodexAppServerWebSocket`)와
daemon relay 골격(`recordCodexRuntimeFailed` / `onRuntimeFailed`, `src/daemon/state.ts:257,591,757,3185`)은
이미 존재한다 — 단 이 골격은 지금 `ws_dropped`/`app_server_process_exited` 같은 **fatal 연결 실패**만
모델링한다. `RecordCodexRuntimeFailedResult`는 `{ ok, agentName, recorded }` 형태로, 상태 기록
수준이지 daemon의 메시지/알림 라우팅 경로로 실제 내용을 전달하는 확인된 경로는 아니다(코드로는
"기록됐다"만 확인했고, 그 기록이 사람이나 다른 agent에게 실제 전달되는지는 이번 조사 범위 밖 — 미확인).

필요한 작업(설계·구현 모두 아직 없음, 이 로그는 그 필요성만 기록):

1. `runtime.ts`의 notification 핸들러가 `remoteControl/status/changed` 외에 `error`,
   `turn/completed`(status가 실패인 경우)도 인식하도록 확장.
2. turn 단위 비-fatal 에러를 표현할 새 타입 정의 — 기존 `CodexAgentRuntimeFailureReason`
   (연결/프로세스 fatal 전용)을 그대로 재사용하는 게 맞는지, 아니면 별도 이벤트 종류로 분리해야
   하는지가 미결. 연결은 살아있는 채로 발생하는 에러이므로 의미상 다르다.
3. `codexErrorInfo`가 채워진 경우(특히 `usageLimitExceeded`/`contextWindowExceeded`/
   `serverOverloaded`)를 우선순위 높은 이벤트로 필터링하는 규칙.
4. daemon의 기존 메시지/상태 라우팅 경로에 이 이벤트를 실제로 전달하는 새 프로토콜 표면 —
   `recordCodexRuntimeFailed`류의 "recorded" 수준 상태 기록에 그칠지, `sendMessage`/notification류
   경로로 사람·다른 agent에게 실제 전달할지 결정 필요.
5. `willRetry:false`(재시도 없이 끝남)와 `willRetry:true`(자동 재시도 예정)를 relay 우선순위·문구에서
   구분할지 결정 필요.

이 항목들은 작은 patch가 아니라 새 기능이다: 기존 fatal-only 실패 모델을 turn-scoped 비-fatal 에러까지
포괄하도록 확장하고, daemon 프로토콜에 새 이벤트 표면을 추가하는 작업이 필요하다.

**근거**

- 실험(2026-08-18, codex app-server websocket에 직접 연결): 실제로 수신한 `error` notification 예시
  (thread/turn id는 실제 값을 마스킹):

  ```json
  {
    "error": {
      "message": "You've hit your usage limit. Upgrade to Pro (https://chatgpt.com/explore/pro), visit https://chatgpt.com/codex/settings/usage to purchase more credits or try again at Aug 20th, 2026 12:32 PM.",
      "codexErrorInfo": "usageLimitExceeded",
      "additionalDetails": null
    },
    "threadId": "<실제 thread id>",
    "turnId": "<실제 turn id>",
    "willRetry": false
  }
  ```

- `codex app-server generate-json-schema --out <dir> --experimental`(codex-cli 0.147.0, 로컬 설치,
  2026-08-18 이 세션에서 직접 재실행해 재확인)의 `ServerNotification.json`에서 독립적으로 확인한 사실:
  - `oneOf` 목록에 `method: "error"` 분기가 있고 `params`가 `#/definitions/ErrorNotification`을 가리킴.
  - 같은 목록에 `turn/completed`, `turn/started`, `turn/diff/updated`, `turn/plan/updated`,
    `turn/moderationMetadata`, `thread/realtime/error` method도 존재.
  - `ErrorNotification` = `{ error: TurnError, threadId: string, turnId: string, willRetry: boolean }`
    (넷 다 required).
  - `TurnError` = `{ message: string (required), codexErrorInfo: CodexErrorInfo | null, additionalDetails: string | null }`.
  - `CodexErrorInfo` = enum(`contextWindowExceeded`, `sessionBudgetExceeded`, `usageLimitExceeded`,
    `serverOverloaded`, `cyberPolicy`, `internalServerError`, `unauthorized`, `badRequest`,
    `threadRollbackFailed`, `sandboxError`, `other`) 또는 구조화 variant(`httpConnectionFailed`,
    `responseStreamConnectionFailed`, `responseStreamDisconnected`, `responseTooManyFailedAttempts`
    — 이상 4개는 `{httpStatusCode}` 포함, `activeTurnNotSteerable`은 `{turnKind}` 포함).
- 코드 인용(2026-08-18, 이 세션에서 직접 `Read`/`grep`으로 확인):
  - `src/adapters/codex/websocket.ts:120-125` `connectCodexAppServerWebSocket`, `150-169`
    메시지 파서(notification vs response 분기), `316-321` `onNotification` 등록.
  - `src/adapters/codex/runtime.ts:281-285` 유일한 notification 리스너(`remoteControl/status/changed`만
    처리), `36-46` `CodexAgentRuntimeFailureReason`(fatal 2종만), `329-334`
    `connectCodexAppServerWebSocket` 호출부.
  - `src/adapters/codex/injector.ts:24-69` `injectTurnStart` — `turn/start`의 동기 ack만 처리.
  - `src/adapters/codex/app-server.ts` — `parseCodexAppServerBanner`(90행), `waitForCodexReadyz`
    (122행) 등 배너 파싱·readyz 폴링만 소유. JSON-RPC/notification 처리는 없음(이 파일 자체는
    websocket 계층을 갖지 않음 — 그 계층은 `websocket.ts`가 별도로 소유).
  - `src/daemon/state.ts:537-544` `RecordCodexRuntimeFailedRequest`(reason + latestDiagnosticNotification
    만 포함, error notification 전용 필드 없음), `257,591,757,3185` `onRuntimeFailed` 배선.
  - grep 0건(2026-08-18, `src/` 전체): `codexErrorInfo`, `turn/completed`, `willRetry`.

## 클로드 쪽 대응 조사

조사 대상: `src/adapters/claude/launcher.ts`가 `stdio: "inherit"`로 spawn하는 실제 `claude` 바이너리
(이 환경에서는 `/Users/lunaxislu/.local/bin/claude` → `/Users/lunaxislu/.local/share/claude/versions/2.1.234`
심링크. `which claude`가 최상단에 보여주는 `/Applications/cmux.app/Contents/Resources/bin/claude`는
cmux 래퍼이므로 우회하고 실바이너리로 직접 테스트).

**확인된 사실**

1. **codex의 `codexErrorInfo`에 정확히 대응하는 enum은 claude CLI `--print --output-format=json`의
   최종 result에 없다.** 성공 시 `subtype:"success"`, `api_error_status:null`. 에러 시 관찰된 필드:
   `is_error`(bool), `subtype`(관찰값: `"success"`, `"error_max_budget_usd"` — API 자체 에러 시에도
   `subtype`이 `"success"`로 나온 사례가 있어 이 필드가 API 에러 분류용은 아닌 것으로 보임 — 추론),
   `terminal_reason`(관찰값: `"completed"`, `"budget_exhausted"`, `"api_error"`), `api_error_status`
   (HTTP status 정수 또는 null — codex의 `httpConnectionFailed{httpStatusCode}`류 variant와 유사한
   정보), `result`(사람이 읽는 자유 텍스트 에러 메시지).
2. **공식 문서(`code.claude.com/docs/en/headless`, "Handle API retries" 절, 2026-08-18 fetch)에 구조화된
   에러 카테고리 enum이 존재함을 확인.** `--output-format stream-json`에서 재시도 가능한 API 에러가
   발생하면 재시도 직전에 `{"type":"system","subtype":"api_retry", "attempt", "max_retries",
   "retry_delay_ms", "error_status": <HTTP status 또는 null>, "error": <카테고리>}` 이벤트를 낸다.
   `error` 필드의 문서화된 전체 enum: `authentication_failed`, `oauth_org_not_allowed`,
   `billing_error`, `rate_limit`, `overloaded`, `invalid_request`, `model_not_found`, `server_error`,
   `max_output_tokens`, `unknown`. 이 목록은 codex의 `CodexErrorInfo`와 구조적으로 유사(짧은
   카테고리 문자열 + HTTP status)하지만, **`context_window_exceeded`에 정확히 대응하는 enum 값은
   이 문서화된 목록에 없다** — context window 초과가 재시도 가능한 에러로 분류되지 않거나
   (retry 없이 바로 실패) 다른 카테고리(`invalid_request` 등)로 뭉뚱그려질 가능성이 있음 —
   추론, 실제로 context window exceeded를 직접 재현해 확인하지는 못함(비용·시간상 트리거 안 함).
3. **실측(이 세션에서 직접 실행):**
   - `--model claude-nonexistent-model-xyz --print --output-format=stream-json --verbose`로 유효하지
     않은 모델을 지정해 API 에러를 직접 재현: assistant 메시지에 `"error":"model_not_found"`,
     `"is_api_error_message":true` 필드가 실림(최종 `result` 이벤트가 아니라 assistant 메시지 레벨).
     최종 result 이벤트는 `terminal_reason:"api_error"`, `api_error_status:404`,
     `result:"There's an issue with the selected model..."`.
   - `--max-budget-usd 0.02`로 예산 초과를 재현: 최종 result가
     `subtype:"error_max_budget_usd"`, `terminal_reason:"budget_exhausted"`,
     `errors:["Reached maximum budget ($0.02)"]`(errors는 배열 — budget 에러에서만 관찰, 다른 에러
     사례에서는 이 필드를 확인 못함).
   - 실패한 실행의 프로세스 exit code는 1(성공은 0) — 문서에 나온 "0 성공/비0 실패" 규칙과 일치.
     에러 종류별로 exit code가 더 세분화되는지는 확인 안 함(budget 초과·모델 404 두 사례 모두
     1이었다는 것만 확인).
4. **없음(확인됨): codex의 `codexErrorInfo`처럼 turn/request 레벨에서 상시 존재하는 단일 구조화
   enum 필드는 claude CLI에 없다.** 구조화 신호는 두 갈래로 쪼개져 있다 — (a) 최종 result의
   `api_error_status`(HTTP status 숫자만, 카테고리 없음)와 자유 텍스트 `result`, (b) stream-json
   모드에서만, 그것도 CLI가 실제로 재시도를 시도할 때만 나오는 `system/api_retry` 이벤트의 `error`
   카테고리 문자열. 재시도 없이 바로 종료되는 에러(예: budget 초과, 잘못된 모델)는 `api_retry`
   이벤트 없이 곧장 최종 result로 간다 — 즉 이 카테고리 enum이 모든 에러 경로를 커버하는지는
   불확실(추론: 코드가 아니라 문서 서술과 실측 2건만으로 판단).

**추론/미확인 (사실과 구분)**

- rate limit/usage limit/overloaded/context window exceeded 각각을 개별적으로 트리거해
  `system/api_retry`의 `error` 값이 정확히 어떻게 나오는지는 실측하지 못했다(재현 비용·시간
  제약). 문서의 enum 목록(`rate_limit`, `overloaded`, `billing_error` 등)이 존재한다는 것과
  이름이 의미상 대응할 것이라는 것까지는 문서 근거로 확인했지만, 실제 트리거 시 정확히 어느
  값이 찍히는지는 미확인.
- `terminal_reason`/`subtype`의 전체 enum(공식 문서에 별도 레퍼런스 페이지가 있는지)은 이번
  조사에서 찾지 못했다. TypeScript Agent SDK 문서(`agent-sdk/typescript`) fetch를 시도했으나
  `SDKResultMessage` 타입 정의 부분이 응답에서 잘려 확인 실패 — 추가 조사 필요하면 별도 페이지나
  타입 정의 파일을 더 찾아야 함.
- codex와 비교하면: codex는 turn 단위 비동기 notification(`error`, `willRetry`)으로 구조화 정보를
  push하는 반면, claude CLI는 pull 성격의 최종 result + (재시도 시에만) stream 이벤트로 노출한다는
  점에서 노출 메커니즘 자체가 다르다 — 이건 관찰된 구조 차이이며 설계 의도에 대한 해석은 아니다.
