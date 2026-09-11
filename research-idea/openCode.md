# OpenCode TUI 통합 후보 재조사

최초 조사: 2026-09-08. binding·지침 수명 재조사: 2026-09-09. 공식 문서와 공식 저장소를 읽은 연구 기록이다. OpenCode 설치, TUI 실행, 모델 호출, 메시지 전송 실험은 하지 않았다. AIOX의 구현 완료나 지원 확정을 뜻하지 않는다.

이 문서는 전달받은 OpenCode 보고서를 재검토하고 더 나은 입력 경로를 보존한다. 현재 제품 계약은 [Collaboration](../docs/specs/aiox-collaboration.md), 현재 Claude/Codex 연결은 [Vendor bindings](../docs/architecture/aiox-vendor-bindings.md)가 소유한다. 그 문서나 Stage 2 범위를 변경하지 않는다. 현재 공통 도구는 `send({targets, content})`, `agents_list`이며 별도 reply 도구를 전제하지 않는다.

## 결론

**추천 후보는 `/tui/append-prompt` + `/tui/submit-prompt`보다, 실제 TUI가 보고 있는 기존 session에 `/session/:id/message` 또는 `/session/:id/prompt_async`로 직접 입력하는 방식이다.** 별도 headless session을 만드는 제안이 아니다.

공식 API는 `messageID`, `system`, `parts`를 받고, TUI는 서버 메시지 이벤트를 화면 상태에 반영한다. 따라서 composer 초안에 손대지 않고 입력 ID도 미리 정하는 경로가 소스상 존재한다. 실제 TUI와의 왕복 및 현재 화면의 session 추적은 아직 실측하지 않았다.

또한 `synthetic` text part로 본문을 일반 사용자 행에서 숨길 수 있는 구현이 있다. **표시를 숨기는 기능이며 모델의 role을 peer/system으로 바꾸는 기능은 아니다.** 전달 보고서의 “본문과 표시 분리 방법이 없다”는 판단은 `/tui/*`에 한정해야 한다.

## 근거 기준

- 2026-09-08 GitHub release API에서 당시 최신 릴리스 `v1.18.29`, 공개 시각 `2026-09-04T23:47:16Z`, target commit `02a167e048d3bd7299225068d79e4fce5c830d67`을 직접 확인했다. 아래 소스 링크는 모두 이 commit에 고정한다. [Release](https://github.com/anomalyco/opencode/releases/tag/v1.18.29), [Release API](https://api.github.com/repos/anomalyco/opencode/releases/latest).
- 공식 웹 문서는 조사 시점 내용이며 해당 릴리스와 완전히 같다는 보장은 없다. `/doc`의 실제 설치본 스키마 대조는 통합 시 필요하다.
- 아래 **확인**은 문서 또는 코드 경로를 읽었다는 뜻이다. **추론/제안**은 그 경로를 AIOX에서 사용할 경우의 판단이며 실행 증거가 아니다.

## 1. 실행 중인 기본 TUI의 서버를 사용한다

**확인:** 공식 문서는 기본 `opencode`가 TUI와 서버를 함께 시작하며, TUI 실행 시 `--hostname`과 `--port`로 서버 주소를 정할 수 있다고 설명한다. 별도로 `opencode serve`를 실행하면 다른 서버가 생긴다. 기존 TUI 통합은 그 TUI의 서버에 접속해야 한다. [Server 문서](https://opencode.ai/docs/server/).

```text
AIOX launcher → OpenCode TUI + 해당 runtime 서버
                         │
Daemon → 기존 session HTTP 입력
                         │
                         ├─ 모델 처리
                         └─ 서버 event → 기존 TUI 화면
모델 → HTTP MCP → AIOX send / agents_list
```

서버 주소와 current session은 다른 binding이다. session 목록이나 최근 수정 시각만으로 사용자가 현재 보는 대화를 고르면 안 된다. workspace를 바꾸는 경우도 같은 경계다.

## 2. composer 제어 경로의 한계

**확인:** `/tui/append-prompt`와 `/tui/submit-prompt`는 각각 event를 publish하고 true를 반환한다. 전자는 실제 TUI의 `input.insertText()`로 들어가며 후자는 `prompt.submit` 명령을 보낸다. HTTP true는 모델 접수나 응답 완료가 아니다. [HTTP handler](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/server/routes/instance/httpapi/handlers/tui.ts#L34), [TUI insertText](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/tui/src/component/prompt/index.tsx#L237).

**추론:** 사용자가 초안을 쓰는 동안 append하면 사용자 초안과 AIOX 본문이 섞일 수 있다. 두 요청 사이에 사용자의 입력이나 화면 전환도 가능하다. clear 후 입력은 초안 손실을 만들 수 있으므로 해결책으로 채택하지 않는다. 이 경로는 IDE의 입력 보조에는 적합하지만 A2A 자동 전달의 우선 후보로 삼지 않는다.

## 3. 더 나은 후보: 기존 session에 직접 입력

**확인:** 공식 HTTP API의 `/session/:id/message`는 응답을 기다리고 `/prompt_async`는 비동기로 시작한다. 두 handler는 같은 `promptSvc.prompt()`를 사용한다. `PromptInput`은 `messageID?`, `agent?`, `model?`, `variant?`, `system?`, `parts`를 받는다. TUI 자체의 submit도 SDK `session.prompt()`를 사용한다. [HTTP handler](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/server/routes/instance/httpapi/handlers/session.ts#L295), [PromptInput](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/session/prompt.ts#L1499), [TUI submit](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/tui/src/component/prompt/index.tsx#L1093).

**확인:** TUI sync가 `message.updated`와 part 이벤트를 처리하고, session 화면이 `route.sessionID`의 메시지 목록을 읽는다. 외부 HTTP 입력도 이 경로로 화면에 반영될 수 있는 구조다. composer를 편집하는 코드를 거치지 않는다. [Sync](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/tui/src/context/sync.tsx#L321), [Session 화면](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/tui/src/routes/session/index.tsx#L212).

**제안:** vendor 스키마에 맞는 고유 messageID를 입력 전에 만들고 AIOX delivery와 내부적으로 연결한다. 본문 전체에 JSON envelope를 노출할 필요가 없다. HTTP 타임아웃 뒤 자동 재전송하지 않고 ID로 메시지를 조회할 근거도 생긴다. ID를 지정한다고 재전송 멱등성까지 보장되는 것은 아니다.

### 표시 요약과 모델 본문 분리

**확인:** `TextPartInput`에 `synthetic`, `ignored`, `metadata`가 있다. 일반 TUI 사용자 행은 synthetic text를 제외한다. 반면 모델 변환은 synthetic 여부와 관계없이 비어 있지 않고 ignored가 아닌 text를 `role: user`로 전달한다. [스키마](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/schema/src/v1/session.ts#L397), [TUI renderer](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/tui/src/routes/session/index.tsx#L1364), [모델 변환](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/session/message-v2.ts#L196).

**제안 예시 — 실행하지 않음:**

```json
{
  "parts": [
    { "type": "text", "text": "[AIOX · reviewer] 코드 검토 요청" },
    { "type": "text", "text": "발신자 정보와 실제 요청 본문", "synthetic": true }
  ]
}
```

표시 요약은 남고 본문은 일반 행에서 숨겨질 후보다. Claude식 peer renderer나 Ctrl+O 펼치기가 생긴다는 뜻은 아니다. 표시 색상, 상세보기·export에서의 본문 보존까지 이번에는 확인하지 않았다. `ignored: true`는 모델에서도 제외되므로 숨김 본문에 사용하면 안 된다. `metadata` 역시 모델이 자동으로 읽는 본문이 아니다.

## 4. busy 입력과 완료 연결

**확인:** prompt는 먼저 user message를 생성한 다음 loop를 요청한다. `ensureRunning()`은 이미 Running이면 기존 run의 완료를 기다리며 별도 run을 동시에 만들지 않는다. loop는 다음 반복에서 메시지를 다시 읽고 최신 user ID와 assistant parentID를 비교한다. [Prompt loop](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/session/prompt.ts#L1052), [Runner](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/effect/runner.ts#L115).

**추론:** 일반 busy 입력은 강제로 abort-and-send하는 대신 기존 loop가 새 메시지를 이어서 보는 구조다. 한 입력마다 독립 assistant 응답이 생성되는 FIFO 계약은 아니다. 여러 user 입력이 쌓이면 최신 입력이 parent가 될 수 있다. HTTP 응답 하나 또는 session idle 하나로 모든 delivery를 개별 완료 처리하지 않는다.

**확인:** async handler는 background 작업을 시작하고 204를 반환하며 이후 실패를 session.error로 publish한다. 204를 메시지 처리 완료로 쓰면 안 된다. [Async handler](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/server/routes/instance/httpapi/handlers/session.ts#L311).

관측 후보는 `message.updated`의 user ID, assistant의 `parentID`·완료/오류 정보, `session.status`를 함께 사용하는 것이다. permission/question 이벤트는 TUI sync에서도 구조적으로 처리된다. `retry`를 최종 실패로 바로 승격하지 않는다. 실제 단일 입력과 busy 입력의 상관관계는 아직 실측하지 않았다. [TUI event consumer](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/tui/src/context/sync.tsx#L180).

## 5. 현재 화면의 session과 모델 선택

**확인:** 공식 저장소의 `@opencode-ai/plugin/tui` API에 `route.current`가 있고 session route의 params에 sessionID가 있다. 구현은 실제 `route.data.sessionID`를 반환한다. 이는 외부 REST에서 최근 session을 추정하는 것보다 직접적인 binding 후보다. [TUI plugin API](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/plugin/src/tui.ts#L594), [실제 route adapter](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/tui/src/plugin/adapters.tsx#L57).

**확인:** route는 Solid store이고 `route.current` getter가 이를 직접 읽는다. 별도 `currentSessionChanged` 구독 API를 확인한 것은 아니다. plugin은 호출 시점에 getter로 현재 값을 읽을 수 있으며, 변경 추적은 reactive root/effect 또는 polling을 AIOX plugin이 붙이는 **구현 제안**이다. home route는 sessionID가 없으므로 마지막 session을 계속 현재 대상으로 쓰면 안 된다. [Route store](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/tui/src/context/route.tsx#L27).

**확인:** `OPENCODE_TUI_CONFIG`가 지정한 별도 TUI 설정 파일을 loader가 읽으며 `plugin` 항목을 로드한다. 기존 global 설정 다음, project 설정 전에 병합하므로 최종 강제 override는 아니다. AIOX runtime 임시 `tui.json`으로 plugin을 추가하는 후보가 있으며, 일반 `OPENCODE_CONFIG_CONTENT`의 server plugin과 구분해야 한다. plugin의 `lifecycle.onDispose`로 연결·timer를 정리할 수 있다. [TUI 설정 loader](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/config/tui.ts#L183), [Plugin lifecycle](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/plugin/tui/runtime.ts#L393).

### 선택한 model/agent는 현재 공개 경로로 해결됐다고 볼 수 없다

**확인:** 현재 선택 agent/model은 TUI `local.tsx`의 별도 store에 있다. agent.set/model.set은 로컬 store를 바꾸며 서버로 변경 요청을 보내지 않는다. 공개 `TuiPluginApi.state`에는 session 조회는 있지만 이 로컬 선택 상태 getter가 없다. session_prompt slot도 session_id/ref 등을 제공하고 selected model/agent는 제공하지 않는다. [로컬 agent/model](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/tui/src/context/local.tsx#L80), [공개 state](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/plugin/src/tui.ts#L375), [공개 slot](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/plugin/src/tui.ts#L456).

**확인:** TUI submit은 선택한 agent/model/variant를 명시한다. 서버는 실제 prompt 생성 때 session의 agent/model을 갱신한다. 직접 API 호출에서 agent를 생략하면 기본 agent를 선택한다. [서버 기본값·갱신](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/session/prompt.ts#L635).

**판정:** SSE 또는 HTTP relay로 마지막 제출 설정은 알 수 있어도 **아직 제출하지 않은 사용자 선택 변경까지 알 수 있다는 근거는 없다.** TUI plugin의 sessionID 접근이 selected model/agent 접근까지 해결하지 않는다. 내부 `useLocal()` import, prompt widget 대체, vendor 패치는 이번 후보에 넣지 않는다. 현재 선택을 정확히 따르는 계약이 필수라면 해당 public accessor 또는 별도 노출 경로가 확보되기 전까지 이 부분은 미해결이다.

### 후속 확인: AIOX가 선택값을 몰라도 메시지만 보낼 수 있는가?

**답: 보낼 수 있다.** `agent/model/variant`는 필수 입력이 아니며 vendor가 값을 결정한다. 따라서 AIOX가 모델 선택을 추적해야 한다는 것은 통합의 필수 전제가 아니다. 다만 “vendor 기본값으로 처리”와 “지금 TUI에서 선택한 값으로 처리”는 아래 소스에서 실제로 다르다. 조사 기준은 위와 같은 release commit `02a167e048d3bd7299225068d79e4fce5c830d67`이다.

```text
POST message / prompt_async
  → 동일 promptSvc.prompt(payload + sessionID)
  → createUserMessage
      agent = input.agent 또는 Agent.defaultInfo()
      model = input.model 또는 위 agent.model 또는 currentModel(sessionID)
      variant = input.variant 또는 조건에 맞는 agent.variant 또는 undefined
  → 이 값으로 user message 저장
  → session의 agent/model/variant도 갱신
  → loop는 새 lastUser.agent/model/variant로 실제 모델 실행
```

정확한 fallback은 다음과 같다.

| 생략한 값 | 선택 순서 | 자동 유지하지 않는 것 |
| --- | --- | --- |
| agent | config.default_agent → 없으면 첫 visible primary agent | session.agent나 마지막 user.agent를 읽지 않음 |
| model | 선택된 agent.model → session DB의 model → 최신 user message의 model → provider.defaultModel() | TUI의 미제출 model store를 읽지 않음. agent.model이 session model보다 우선 |
| variant | 선택된 agent.variant가 있고 선택 모델이 agent.model과 같으며 모델이 그 variant를 지원할 때 사용 → 아니면 undefined | currentModel이 반환한 저장 variant를 그대로 복사하지 않음 |

[Agent.defaultInfo](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/agent/agent.ts#L328), [currentModel 및 createUserMessage](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/session/prompt.ts#L614), [최신 user 조회 순서](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/session/session.ts#L887), [실제 loop consumer](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/session/prompt.ts#L1141).

**variant 주의:** currentModel은 저장된 variant까지 반환할 수 있지만 createUserMessage가 새 user의 `model.variant`에 넣는 값은 별도로 계산한 `variant`다. 이 값이 undefined면 session 저장값은 `default`로 갱신될 수 있다. “모델 ID가 유지된다”가 “effort/variant까지 유지된다”는 뜻은 아니다.

**사용자 시나리오 — 소스에서 도출한 결과이며 실측 아님:**

- 기본 agent를 쓰고 agent에 고정 model이 없으며 별도 variant를 선택하지 않았다면, 직전 session model을 그대로 쓰므로 **메시지만 보내도 원하는 동작일 수 있다.** 이 경우 별도 선택 추적은 불필요하다.
- 기본 agent가 build인데 사용자가 plan으로 이미 대화를 진행했다면, agent를 생략한 외부 prompt는 plan을 이어받지 않고 기본 agent를 고른다. 이는 미제출 선택만의 문제가 아니다.
- TUI에서 model B를 고르기만 하고 아직 제출하지 않았다면, 직접 API는 그 로컬 선택 대신 위 fallback을 사용한다.
- 직전 대화의 variant가 high여도 외부 prompt가 이를 생략하면 자동 상속되지 않을 수 있다.

**현재 선택을 vendor가 직접 읽는 경로:** native `Prompt.submitInner()`는 `local.agent.current()`, `local.model.current()`, `local.model.variant.current()`를 읽는다. `/tui/append-prompt` + submit 또는 plugin `TuiPromptRef.submit()`은 이 경로를 사용하므로 AIOX가 선택값을 따로 알 필요는 없다. 그러나 실제 composer를 제출하므로 사용자 초안과 분리된 입력 API가 아니다. [native submit](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/tui/src/component/prompt/index.tsx#L947).

**초안 보존 경계:** 공개 `TuiPromptRef`는 current/set/reset/submit을 제공하지만 별도 content를 받아 제출하는 메서드는 없고 `submit(): void`이다. `set(AIOX 본문) → submit → 원래 초안 복원`을 구현할 수는 있어도 submit이 비동기적으로 composer를 clear하고 history에 기록하기 때문에 기존 API만으로 원자적·무간섭 보존을 보장하지 않는다. 현재 조사한 공개 경로에서는 **“미제출 선택 자동 사용 + composer 무간섭”을 동시에 제공하는 메서드를 확인하지 못했다.** 숨겨진 두 번째 Prompt나 내부 store import를 해결된 기능처럼 제안하지 않는다. [공개 ref](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/plugin/src/tui.ts#L201), [void submit 및 clear](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/tui/src/component/prompt/index.tsx#L586).

**판단:** AIOX가 vendor 기본 fallback을 수용하면 `sessionID + parts`로 충분하며 모델 추적을 추가하지 않는다. 마지막으로 확정된 session 설정 보존을 원한다면 session의 agent/model/variant를 명시해 보내는 더 좁은 후보가 있다. 이는 매 UI 선택을 추적하는 설계가 아니며 미제출 선택까지 따르지는 않는다. 어떤 경우든 입력 수신 가능성과 선택 일치 여부는 별개의 판정이다.

### binding 제안과 race 경계

```text
runtime별 server 주소/인증 설정
  → TUI plugin이 현재 route를 읽음
  → home: session binding 없음
  → session: sessionID + runtime ID로 AIOX에 등록
  → AIOX는 명시적으로 고른 sessionID로 POST
  → 응답/이벤트도 같은 sessionID + messageID로 연결
```

이것은 제안이지 실행 검증 결과가 아니다. daemon의 cached sessionID와 화면 전환 사이에는 race가 있다. 현재 route를 읽는 plugin 쪽에서 입력을 받아 sessionID를 결정한 뒤 `api.client.session.prompt`로 보내면 오래된 daemon cache 의존을 줄일 수 있다. 이 경우 별도 transport는 AIOX가 구현해야 한다. “접수 시 선택한 session”에 보내는 계약이며, 전송 직후 사용자가 화면을 바꿔도 새 화면으로 메시지를 옮기는 계약은 아니다. 외부 HTTP 요청 두 개만으로 원자적인 화면 binding을 보장하지 않는다.

## 6. 실행별 지침과 MCP

**확인:** `OPENCODE_CONFIG_CONTENT`로 runtime config를 병합할 수 있다. 현재 공식 문서에는 그 뒤 managed config/MDM 설정이 더 높은 우선순위로 명시되어 있어, 전달 보고서의 “inline config가 무조건 최종 우선순위”는 정정해야 한다. [Config 문서](https://opencode.ai/docs/config/).

HTTP MCP는 다음 구성 후보를 쓸 수 있다. env 토큰 참조는 공식 문서의 `{env:NAME}` 문법이며 실제 토큰을 argv에 넣지 않는다. `oauth: false`로 자체 bearer 인증 서버에 불필요한 OAuth 흐름을 사용하지 않게 할 수 있다. [MCP 문서](https://opencode.ai/docs/mcp-servers/).

```json
{
  "mcp": {
    "aiox": {
      "type": "remote",
      "url": "http://127.0.0.1:4500/mcp/<networkId>",
      "enabled": true,
      "oauth": false,
      "headers": { "Authorization": "Bearer {env:AIOX_MCP_TOKEN}" }
    }
  }
}
```

### instruction의 실제 scope

**더 작은 후보 — MCP server instructions:** MCP client는 연결 시 `getInstructions()`를 저장한다. `MCP.instructions()`는 현재 connected server의 지침만 반환하고, `SystemPrompt.mcp()`는 이를 시스템 구성에 추가한다. 일반 prompt loop는 매 모델 처리 시 이 함수를 호출한다. 따라서 AIOX HTTP MCP의 initialize instructions로 공통 통신 지침을 공급하는 경로가 이미 있다. [MCP 연결 지침](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/mcp/index.ts#L399), [Connected filter](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/mcp/index.ts#L615), [시스템 합성](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/session/system.ts#L119), [매 loop 호출](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/session/prompt.ts#L1257).

**한계:** server가 연결 해제되거나 해당 agent/session 권한이 그 server의 도구를 전부 차단하면 지침이 제외될 수 있다. 영구 process system prompt flag와 같은 의미가 아니다. user instruction 전체를 여기에 옮기는 것이 아니라 AIOX 통신 규칙 공급 후보로 적합하다.

| 방식 | 소스상 범위 | 새 대화·기존 대화 재개 때 의미 |
| --- | --- | --- |
| prompt 요청 `system` | 저장된 user message 필드 → 해당 실행의 lastUser.system | 이후 다른 user 입력에 자동 복사되지 않음. process 지침으로 사용하지 않음 |
| config `instructions` 파일 | process env로 선택한 config → instance별 로드 → 각 prompt loop의 시스템 구성 | 같은 환경/설정에서 새 session과 재개 session에도 다시 적용되는 구조 |
| MCP initialize instructions | instance MCP client의 connected 상태 + 현재 agent/session 도구 권한 | 대화 ID와 별개로 매 loop 합성. 연결/권한 조건 충족 시 적용 |
| agent.prompt | agent 설정 | 기본 provider prompt 대체이므로 공통 지침 append 용도로 부적절 |

**확인:** config instructions loader는 프로젝트/사용자 규칙과 추가 파일을 합치고 prompt loop가 `instruction.system()`을 호출한다. config는 session transcript에 넣었다가 이어받는 방식이 아니다. 절대 경로의 AIOX instruction 파일을 runtime 동안 유지하고 `OPENCODE_CONFIG_CONTENT.instructions`에 추가하면 같은 process에서 대화를 전환하더라도 다음 처리의 config 기반 지침으로 읽히는 구조다. 일반 대화가 바뀔 때마다 원문을 다시 user message로 주입할 필요는 없다. [배열 병합](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/config/config.ts#L46), [파일 경로·합성](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/session/instruction.ts#L120).

**구분:** 이는 `/new`, `/clear`, resume의 모든 UI alias를 실측했다는 뜻이 아니다. 확인 근거는 session ID와 무관한 설정 합성과 매 loop 호출이다. workspace를 바꿔 다른 instance/server로 넘어가면 그 서버도 같은 env/config를 받았는지 확인해야 한다. 기존 외부 서버에 TUI만 attach할 때 새 TUI process env가 이미 실행된 서버 env를 바꾸지는 않으므로 launcher 주입을 자동 승계한다고 볼 수 없다.

`agent.prompt` 대체 없이 config instructions 또는 MCP instructions를 합성하면 vendor base와 project instructions 경로가 남는다. 요청 system 역시 그 뒤에 붙지만 lastUser에 속한다. [LLM 요청 구성](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/session/llm/request.ts#L62).

### MCP와 credential의 수명

**확인:** MCP clients/config는 session별이 아닌 `InstanceState`에 저장된다. config env substitution은 `{env:VAR}`를 `process.env` 값으로 해석한다. 따라서 같은 instance 내 대화 전환은 새 AIOX token을 요구하는 경계가 아니다. reconnect 또는 instance 재생성은 같은 runtime config에서 다시 연결할 후보이며, 자동 복구 성공까지 검증한 것은 아니다. [MCP 상태](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/mcp/index.ts#L492), [env 치환](https://github.com/anomalyco/opencode/blob/02a167e048d3bd7299225068d79e4fce5c830d67/packages/opencode/src/config/variable.ts#L33).

**제안:** AIOX runtime token은 process 실행 시 새로 발급하고 종료 시 폐기한다. token을 sessionID에 묶어 `/new`마다 바꾸지 않는다. 사용자가 제공한 `OPENCODE_CONFIG_CONTENT`가 이미 있으면 launcher에서 무조건 덮어쓰지 않고 기존 JSON과 AIOX 필드 병합 및 `mcp.aiox` 충돌 처리가 필요하다. env 참조를 쓰더라도 로드된 config/API·debug 출력에서 실제 header가 드러날 수 있으므로 bearer가 절대로 외부 출력에 나오지 않는다고 주장하지 않는다.

## 다음에 확인할 최소 항목

현재 구현 순서를 늘리는 계획이 아니라 OpenCode adapter를 실제 추가할 때의 확인 범위다.

1. 기본 TUI에서 초안을 남겨둔 채 같은 session에 지정 messageID로 직접 prompt 한 번: 초안 보존, 화면 요약, 모델 본문 처리, ID 연결을 한 번에 확인한다.
2. session binding plugin을 붙일 때 같은 TUI의 화면 전환을 확인한다. 제출 전 model/agent 선택은 공개 접근 경로가 먼저 확보되어야 하며, 이를 해결하지 않은 채 실험만 반복하지 않는다.
3. busy 중 입력 한 번으로 기존 작업 중단 여부와 새 입력의 assistant parentID 연결을 본다. 다량 burst, dedup 임계값, 플랫폼 전수 실험은 이 후보 판정에 먼저 필요하지 않다.

현재 판정은 **“직접 session API + 선택적으로 TUI binding plugin”이 composer 조작보다 좋은 소스 기반 후보**다. 별도 peer role, 발신자 인증 renderer, 메시지별 완료 보장, Windows/Linux/macOS 실측 지원은 아직 확정하지 않는다.
