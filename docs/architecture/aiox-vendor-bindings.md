# AIOX Vendor Bindings

Status: Target

[[docs/architecture/aiox-system]]의 Controller 아래에서 Claude·Codex 실행, 입력, 관측과 정리를
구성하는 경계다. Headless·Claude SDK·`-p`·ACP·다른 vendor 구현은 현재 범위가 아니다.
공통 도구와 메시지 의미는 [[docs/specs/aiox-collaboration]]를 따른다.

## 공통 MCP와 실행 신원

두 vendor는 daemon의 공통 HTTP MCP `send`·`reply`·`agents_list`를 사용한다. schema·handler·
협업 지침 원본은 공통화하고 vendor별 framing만 binding에 둔다. agent별 MCP child·HTTP server·
route별 port는 만들지 않는다. 도구 입력의 source 이름을 신원으로 신뢰하지 않는다.

```text
Runtime 생성 → 별도 MCP token 발급 → child env 전달
HTTP Authorization → token의 현재 Runtime 확인 → URL network membership/route 확인
Runtime 종료·시작 실패 → revoke → 기존 MCP session의 후속 요청도 거절
새 실행 → 새 token
```

같은 Network는 URL을 공유하고 credential은 공유하지 않는다. route 변경은 전송 시 적용하므로
같은 Network의 MCP 설정을 다시 주입하지 않는다. 모델 입력에는 발신자·본문·필요한 연결 ID·
회신 필요/방법만 두고 전체 내부 envelope를 노출하지 않는다. `replyExpected=false`도 내부 수신
연결 ID가 필요할 수 있다. 재전송·재주입·복구 도구는 제거하되 instructions 주입은 유지한다.

## Claude 실행 구성

다음은 목표 launch 예시다. 포트·Network ID는 예시이며 전체 신규 launcher 통합 완료를 뜻하지 않는다.

```sh
claude \
  --mcp-config '{"mcpServers":{"aiox":{"type":"http","url":"http://127.0.0.1:4500/mcp/network-123","headers":{"Authorization":"Bearer ${AIOX_MCP_TOKEN}"}}}}' \
  --append-system-prompt '<AIOX 공통 통신 지침 + 해당 Agent instruction>'
```

```ts
const mcpConfig = JSON.stringify({
  mcpServers: {
    aiox: {
      type: "http",
      url: networkMcpUrl,
      headers: { Authorization: "Bearer ${AIOX_MCP_TOKEN}" },
    },
  },
});
spawn("claude", ["--mcp-config", mcpConfig], {
  env: { ...process.env, AIOX_MCP_TOKEN: runtimeToken },
});
// MCP 부분 예시. instruction, hooks, inbox 경로 인자는 함께 별도로 구성한다.
```

`${AIOX_MCP_TOKEN}`은 JavaScript 보간이 아닌 리터럴이다. 실제 token은 argv·URL·로그·오류에
넣지 않고 child env에 둔다. shell 문자열 연결 대신 structured args를 사용한다.
`--mcp-config`는 MCP, `--settings`는 실행별 hooks, `--append-system-prompt`는 지침 책임이다.
`--strict-mcp-config`나 user/project/local 영구 등록 선행 절차는 사용하지 않는다.
custom Channel flag, AIOX channel child, agent별 `/send` listener와 Channel fallback도 없다.

hooks는 AIOX 실행에만 `--settings` JSON/실행 설정으로 더한다. 기존 사용자 hook을 통째로
교체하지 않는다. 실제 설정 병합과 inline MCP env 확장은 신규 launch 통합에서 확인할 경계다.
hook 보고도 등록된 Runtime credential/binding으로 인증·귀속한다. payload의 session_id나
prompt_id만으로 발신 Runtime을 신뢰하지 않는다. 인증된 보고 안에서 입력·턴을 연결한다.
공식 MCP 문서는 headers의 환경변수 확장을 설명하지만 이번 문서 작성이 정확한 inline launch를
독립 실행 검증한 것은 아니다. [Claude MCP](https://code.claude.com/docs/en/mcp),
[CLI](https://code.claude.com/docs/en/cli-reference), [Hooks](https://code.claude.com/docs/en/hooks).

## Claude inbox와 표시

목표 input은 native inbox socket/pipe다. 사용자 전달 실측에서 macOS idle 5회, busy 전달,
burst 처리와 HTTP MCP reply가 관찰됐다. burst 순서는 송신 순서와 달랐으므로 순서 보장으로
확대하지 않는다. 정확한 raw body와 renderer 태그는 범용 공식 외부 API라고 확정되지 않았다.

```json
{"type":"user","message":{"role":"user","content":"<cross-session-message from-name=\"Codex\">\n[AIOX] 표시 검증 메시지입니다.\n두 번째 줄도 전달되었습니다.\n도구를 사용하지 말고 DISPLAY_OK라고만 답해주세요.\n</cross-session-message>"}}
```

Claude 2.1.263 사용자 전달 실측에서는 일반 화면에 `Message from @Codex` preview와 Ctrl+O
확장 안내, transcript에서 전체 본문, 모델의 DISPLAY_OK 응답이 확인됐다. 단순 top-level `from`
필드는 같은 효과가 없었다. from-name은 표시 label이며 인증이 아니고, preview가 권한 경계를
제거한 것도 아니다. 이 보고는 삭제된 임시 artifact의 현재 실재 또는 모든 버전 호환 증거가 아니다.

```sh
# 설치 바이너리 조사에서 확인된 hidden 옵션, 신규 launch 통합 미검증
claude --messaging-socket-path /tmp/aiox-private/runtime-123.sock

# native Windows PowerShell 형태, Windows 실측 미수행
claude --messaging-socket-path '\\.\pipe\aiox-runtime-123'
```

binding이 Runtime별 주소를 관리한다. `/status` Peer address는 현재 Claude 자신의 주소이고,
`uds:`는 표시 접두어다. 부모가 `CLAUDE_CODE_MESSAGING_SOCKET`을 지정해 listener를 설정하는
방식은 채택하지 않는다. SOCKET/TOKEN env는 Claude가 bind 후 hooks/Bash에 export하는 결과라는
설치 바이너리 조사 근거가 있다. hidden 옵션은 binding에 격리한다.

Unix 명시 경로는 절대 경로·basename·정규화 길이 103 UTF-8 bytes 이하·부모 소유권/권한·symlink·
live socket 충돌 검사 경계가 조사됐다. 부모 0700은 제안이며 임의 기본 `/tmp/cc-socks/PID.sock`을
전 OS 고정 계약으로 만들지 않는다. Windows는 파일 `.sock`가 아니라 named pipe다.

```json
{"type":"auth","token":"<Claude inbox token>"}
{"type":"user","message":{"role":"user","content":"..."}}
```

native Windows는 inbox 인증 첫 줄이 필수이며 Unix는 선택 가능하다. inbox token과 AIOX MCP
token은 별개다. 자기 hook에서 token을 daemon으로 전달하는 방법은 후보이며 Windows 실제
통합은 미결이다. macOS 바이너리의 Windows 문자열 조사를 Windows 실측으로 취급하지 않는다.
accept/hold/refuse는 vendor 정책이며 AIOX가 몰래 accept로 바꾸지 않는다.
[Inbox 문서](https://code.claude.com/docs/en/cross-session-messaging#the-sessions-inbox-socket).

설치/플랫폼/Peer 최소 버전을 확인하고 미지원이면 실행 실패로 보고한다. 전달받은 최소 지원
근거는 macOS/Linux/WSL2 2.1.224+, native Windows 2.1.234+다. 최소 버전 충족은 raw wire 미래
호환 보장이 아니다. process 생존·inbox 연결 준비를 확인하고 단순 파일 존재나 write 성공을
모델 수신으로 승격하지 않는다. 준비 확인을 위해 모델 ACK probe를 자동 실행하지 않는다.

같은 프로세스 `/clear`·`/resume`에서 listener/address/token 유지가 보고됐다. vendor session ID는
바뀔 수 있으므로 optional session_id를 과거 값으로 계속 주입하지 않는다. 새 Claude 프로세스는
새 inbox 수명이다.

## Claude 입력과 응답 종료 관측

```text
AIOX 연결 ID가 포함된 inbox 원문
 → UserPromptSubmit {prompt, prompt_id:X, session_id:S}
 → daemon: AIOX 입력 ↔ Runtime/S/X 연결
 → Stop {prompt_id:X, session_id:S}
 → 해당 입력의 응답 종료 관측
```

위 단일 idle 입력 연결은 2.1.263의 임시 UserPromptSubmit/Stop hook 실측 보고로 수용한다.
원문 마커와 동일 prompt_id 연결이며 모델 ACK 도구나 상시 transcript 파싱이 필수는 아니다.
실제 payload에는 optional source가 없었다. source=system도 inbox 독점 신원이 아니다.
Stop에는 원문/origin이 없으므로 Stop만 보고 발신자를 정하지 않는다.

Stop은 응답 종료이며 작업 성공·프로세스 종료가 아니다. 여러 입력에 하나의 Stop이 왔다고
모두 성공으로 표시하지 않는다. StopFailure의 prompt_id 연결은 후보이고 단일 Stop 실측과 다르다.
이미 수용한 단일 inbox/Stop 연결이나 Codex active thread를 다시 전체 실험 과제로 만들지 않는다.

## Codex 실행과 active thread

```sh
codex app-server \
  -c 'developer_instructions="AIOX instructions..."' \
  -c 'mcp_servers.aiox.url="http://127.0.0.1:4500/mcp/network-123"' \
  -c 'mcp_servers.aiox.bearer_token_env_var="AIOX_MCP_TOKEN"' \
  -c 'mcp_servers.aiox.required=true'
```

MCP와 instruction은 MCP host인 App Server에 주입한다. 위는 MCP 부분이며 listen/Relay/TUI
연결은 binding이 구성한다. token은 App Server child env에 전달하고 `bearer_token_env_var`에는
변수 이름만 둔다. config의 `developer_instructions`와 RPC의 `developerInstructions`를 혼용하지
않고 TOML escaping을 적용한다. required MCP 초기화 실패와 AIOX registration cleanup은 별개다.
[설정 reference](https://learn.chatgpt.com/docs/config-file/config-reference).

```text
Codex TUI --remote → Binding Relay → per-Runtime App Server
                       │ 같은 연결의 thread/start·resume·fork 성공 응답
                       ▼
                  activeThreadId
daemon 입력 → binding → turn/start(activeThreadId)
```

Relay는 frame 전달과 binding 관측을 분리한다. 성공 응답의 thread ID를 사용하며 요청 ID는 같은
연결에서 대응시킨다. 임의 loaded-thread 선택이나 기존 fallback을 가져오지 않는다.
이 책임의 과거 코드·테스트 근거는 Git commit
`8db476bad722717bf82cc598904f3f33af8a90b3`에 보존돼 있다. 이전 구현 파일은 재구축 정리에서 삭제했다.

```sh
git show 8db476bad722717bf82cc598904f3f33af8a90b3:src/adapters/codex/proxy.ts
git show 8db476bad722717bf82cc598904f3f33af8a90b3:tests/unit/adapters/codex-proxy.test.ts
```

당시 proxy의 68–100, 156–200줄과 test의 27–100줄에 해당한다. 좁은 과거 코드/테스트 근거이며
새 구현의 존재나 신규 HTTP MCP 통합 완료를 뜻하지 않는다.

입력 표시는 IDE delimiter+Cyan, toolOutput, toolOutput+additionalContext 세 실험 후보가 있다.
최종 채택은 미결이며 완전한 wire 예시를 추측으로 재구성하지 않는다. 고정 `Sent by Codex` 문구의
Claude 발신자 오표시, 내부 renderer 의존, context 길이 제한은 구현 선택에서 남는 경계다.
표시 개선으로 exactly-once나 모델 action dedupe를 얻었다고 주장하지 않는다.

## 관측과 사용자 응답 경계

| 목적 | Codex | Claude |
| --- | --- | --- |
| 입력 | turn/start 응답의 runtime 입력 수락 | UserPromptSubmit 원문/ID 연결 |
| 응답 종료/실패 | turn/completed 상태·error | Stop / StopFailure |
| 승인 | commandExecution/fileChange/permissions requestApproval | PermissionRequest / permission_prompt |
| 질문 | item/tool/requestUserInput, mcpServer/elicitation/request | Elicitation·관련 Notification |
| 해소 | serverRequest/resolved(threadId/requestId) | ElicitationResult 등, 모든 승인의 resolved는 미확인 |
| 사용량/재개 | account/rateLimits/read·updated | quota_auto_resume_fired/stale/disabled |

이 표는 공식 문서 조사 기반의 연결 후보를 포함하며 전체 live wiring 검증표가 아니다.
별도 daemon WS에 모든 TUI server request가 broadcast된다고 가정하지 않는다. 관측 위치는
Relay/연결 구성에서 정하고 사용자는 TUI에서 응답하며 daemon과 TUI가 같은 요청에 이중 응답하지 않는다.
resolved는 취소·정리도 포함해 승인 성공과 같지 않다.

Claude permission_prompt는 지연될 수 있어 즉시 관측에 PermissionRequest를 고려한다.
StopFailure의 rate_limit을 session/weekly limit과 일대일로 단정하지 않고 account_on_hold·billing_error도
별도 오류로 유지한다. 일반 도구 오류를 Runtime 실패나 AIOX delivery 실패로 수집하지 않는다.
process exit·연결 손실은 hook 외의 handle에서도 관측한다. reasoning 전체 저장은 요구하지 않는다.
알림 projection과 읽음/포커스는 [[docs/architecture/aiox-storage-terminal]]이 소유한다.

Sources: `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §5–§6, §8–§18.
