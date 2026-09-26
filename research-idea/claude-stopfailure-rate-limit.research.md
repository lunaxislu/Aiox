# Claude StopFailure의 rate_limit payload 조사

- 조사일: 2026-09-23
- 범위: cmux에서 실행한 Claude 2.1.278의 limit 오류가 StopFailure hook에 전달되는 형태. 실제 hook 주입·수신 실험은 하지 않았다.
- 관련 구현: [ClaudeObservations](../packages/adapters/claude/src/claude-observations.ts), [hook 전달](../packages/adapters/claude/src/claude-hook.ts).

## 확인한 사실

공식 [StopFailure 문서](https://code.claude.com/docs/en/hooks#stopfailure)는 API 오류 종료에서 Stop 대신 StopFailure가 발생하며, error와 선택적인 error_details·last_assistant_message를 전달한다고 명시한다. last_assistant_message는 화면에 표시한 API 오류 텍스트다. hook output/exit code는 decision control에 쓰이지 않는다.

로컬 `/Users/lunaxislu/.local/share/claude/versions/2.1.278`의 내장 JS 함수 `DCe`는 hook 등록을 확인하고 다음 값을 구성한다:

```js
{
  ...commonInput,
  hook_event_name: "StopFailure",
  error: message.error ?? "unknown",
  error_details: message.errorDetails,
  last_assistant_message: renderedMessageContent.trim() || undefined
}
```

`quotaLimits`, `apiErrorStatus`, `resetsAt`은 이 payload에 복사하지 않는다. 공통 입력에는 session_id, transcript_path, cwd와 선택적인 prompt_id 등이 있다. `DCe`는 hook 실행 결과를 반환하지 않는다.

세션 `31a17537-c0b3-4cc8-84a3-8b5c7dce0dcb` transcript 655행에는 `error: "rate_limit"`, `isApiErrorMessage: true`, 오류 안내 문구와 quotaLimits가 있다. 해당 행에 errorDetails는 없으며, 사용자 확인상 StopFailure hook은 주입하지 않았다.

## 구현에 근거한 예상값 — 실제 수신값 아님

해당 오류 객체를 등록된 hook에 전달하면 핵심 필드는 다음과 같다. error_details는 undefined이면 JSON에서 생략된다.

```json
{
  "hook_event_name": "StopFailure",
  "error": "rate_limit",
  "last_assistant_message": "You've hit your session limit · resets 9:50pm (Asia/Seoul)"
}
```

현재 AIOX failureReason은 last_assistant_message, error_details 순으로 상세 내용을 선택한 뒤 ` · error`를 붙인다. 위 payload가 현재 세션의 실패로 적용되고 registry가 idle이면:

```json
{
  "status": "failed",
  "status_reason": "You've hit your session limit · resets 9:50pm (Asia/Seoul) · rate_limit"
}
```

이는 코드로 도출한 예상이며, 과거 cmux 세션에서 AIOX가 실제로 수신했다는 증거가 아니다. transcript의 오류 레코드와 hook payload는 별도 경로다.
