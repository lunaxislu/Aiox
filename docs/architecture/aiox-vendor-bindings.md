# AIOX Vendor Bindings

Status: Current

[[docs/architecture/aiox-system]]의 공통 실행 소유자와 vendor adapter가 실행, 입력, 관측과 정리를
나누는 경계다. 현재 제품 adapter는 Claude이며 Codex와 이후 vendor는 같은 계약에 연결한다.
Headless·Claude SDK·`-p`·ACP 실행은 현재 범위가 아니다.
공통 도구와 메시지 의미는 [[docs/specs/aiox-collaboration]]를 따른다.
Claude는 아래 현재 구현과 과거 실측을 구분하며, Codex 연결은 Target이다.
실제 모델 E2E와 플랫폼별 검증 상태는 구현 존재와 구분한다.

## 공통 MCP와 실행 신원

vendor는 daemon의 공통 HTTP MCP `send`·`agents_list`를 사용한다. schema·handler·
협업 지침 원본은 공통화하고 vendor별 framing만 binding에 둔다. agent별 MCP child·HTTP server·
route별 port는 만들지 않는다. 도구 입력의 source 이름을 신원으로 신뢰하지 않는다.

```text
Runtime 생성 → 별도 MCP token 발급 → child env 전달
HTTP Authorization → token의 현재 Runtime 확인 → URL network membership/route 확인
Runtime 종료·시작 실패 → revoke → 기존 MCP session의 후속 요청도 거절
새 실행 → 새 token
```

같은 Network는 URL을 공유하고 credential은 공유하지 않는다. route 변경은 전송 시 적용하므로
같은 Network의 MCP 설정을 다시 주입하지 않는다. 모델 입력에는 발신자 name·선택적 role/description·createdAt과 본문을 전달한다. 내부 delivery/prompt/turn 연결은 유지하되 회신 도구 인자로 요구하지 않는다. 단방향 영어 안내와 자동 알림 조건은 [[docs/specs/aiox-collaboration]]을 따른다. 재전송·재주입·복구 도구는 제거하되 instructions 주입은 유지한다.

daemon 알림도 각 vendor의 동일한 입력 경로로 전달하고 AIOX daemon 발신임을 표시한다. Agent의 역방향 route 권한이나 vendor system role을 만들어 내지 않는다. daemon 알림 처리는 다시 완료 알림을 만들지 않는다.

Codex는 Runtime·threadId·turnId에 입력을 연결하고 `turn/completed`의 결과가 completed/failed/interrupted인지 구분한다. busy toolOutput이 기존 turn에서 처리될 수 있으므로 입력마다 별도 turn이 생성된다고 가정하지 않는다. Claude도 연결된 session_id/prompt_id의 Stop만 해당 입력 종료 근거로 사용한다. 정확한 busy/multi-input 연결은 실제 통합의 검증 대상이다.

## 공통 실행 소유자와 adapter 경계 [Status: As-built]

실행 소유권은 명령과 인증된 실행 위치가 결정한다. adapter는 실행 위치를 선택하거나 daemon·PTY를
소유하지 않는다. 같은 adapter의 실행 준비·주입·입력·관측을 Web과 외부 CLI가 함께 사용한다.

```text
@aiox/vendor
├─ VendorAdapter → 실행별 connection·launch metadata / binding 생성
├─ VendorBinding → 준비·입력·vendor 보고 검증·관측
└─ ExecutionOwner → foreground·부속 프로세스 / 실행별 자원 / 종료·실패 보상
   ├─ daemon AgentController → foreground를 PTY로 실행
   └─ 외부 CLI → foreground의 stdin/stdout/stderr 상속
@aiox/adapter-claude → Claude 인자·설정 병합 / inbox / hooks / 버전 검사
```

`createExecution`은 임시 자원 등록과 취소 신호만 받아 프로세스 없이 connection을 준비한다.
`VendorExecution.start`는 실행 owner를 받아 부속 프로세스를 실행하고 준비를 기다린 뒤 foreground를
시작할 수 있다. 취소 뒤 늦게 할당된 자원도 owner가 정리하며 중단된 준비가 새 실행을 만들지 않는다.
owner가 생성한 프로세스와 임시 자원은 한 실행에 속하며 정리 실패는 재시도 가능하게 남는다.
공통 계약은 inbox 하나나 단일 프로세스를 요구하지 않는다. `connection`과 `launch`는 공통 wire에서
vendor 필드가 없는 metadata이며 adapter 경계에서 검증한다. 현재 adapter 선택은 조립 시 전달한
목록을 사용한다. 동적 설치·capability framework·Codex 실제 구현 완료를 뜻하지 않는다.

근거: [[packages/vendor/src/index.ts]] `packages/vendor/src/index.ts:49-96`,
[[packages/vendor/src/execution.ts]] `packages/vendor/src/execution.ts:7`,
[[packages/adapters/claude/src/index.ts]] `packages/adapters/claude/src/index.ts:21`.
다른 vendor 대역의 inbox 없는 제어 연결과 helper 준비 후 Web 실행은
[[apps/daemon/src/agent-controller.test.ts]] `apps/daemon/src/agent-controller.test.ts:1298-1439`에서 검증한다.

외부 CLI는 실행별 자원을 준비하고 daemon에 connection을 전달한다. AgentController가
Runtime·보고 credential·binding을 준비한 뒤 launch를 반환하면 adapter가 실제 실행 위치에서
버전을 검사하고 실행한다. CLI는 시작·종료를 제어 WS로 통보하며 화면·resize를 전송하지 않는다.
최초 준비 timeout의 명시적 `startup-failed`는 이번 실행을 종료하지만 daemon·WS 손실은 협업
등록만 끝내고 이미 시작한 foreground·필수 부속 실행은 준비 완료 전후 모두 유지한다.
실제 프로세스 종료와 협업 정리 책임은 [[docs/specs/aiox-runtime]]을 따른다.

근거: [[apps/daemon/src/agent-controller.ts]] `apps/daemon/src/agent-controller.ts:88`,
[[apps/cli/src/external.ts]] `apps/cli/src/external.ts:1`.

Claude inbox 임시 디렉터리는 실행 위치의 owner가 생성·권한·경로 길이 검사부터 정리까지 소유한다.
실제 socket은 Claude가 열고 daemon binding은 접속한다. adapter는 등록한 주소와 인증 hook 보고를
정확히 대조하며 인증만으로 임의 경로를 신뢰하지 않는다. CLI의 등록 정리 실패도 shell 복귀를
막지 않으며 실패 진단을 남긴다. 근거:
[[packages/adapters/claude/src/claude-environment.ts]] `packages/adapters/claude/src/claude-environment.ts:9`,
[[packages/adapters/claude/src/claude.ts]] `packages/adapters/claude/src/claude.ts:94`.

외부 실행의 hook은 daemon 연결 거부 `ECONNREFUSED`만 조용히 종료한다. 401·잘못된 보고·
timeout·연결 reset과 daemon 소유 실행의 오류 진단은 유지한다. 실행별 소유권 표지는 공통
controller가 adapter에 전달하고 사용자 설정의 같은 환경 변수 덮어쓰기는 충돌로 거절한다.
근거: [[packages/adapters/claude/src/claude-hook.ts]] `packages/adapters/claude/src/claude-hook.ts:49-80`,
[[packages/adapters/claude/src/claude-hook.test.ts]] `packages/adapters/claude/src/claude-hook.test.ts:100-151`,
[[packages/adapters/claude/src/claude-launch.ts]] `packages/adapters/claude/src/claude-launch.ts:215-231`.
Host의 실제 실행 통합은 여전히 목표이며 이 hook 분기 검증으로 완료 처리하지 않는다. [Status: Target]

## Claude Web 실행 구성 [Status: As-built]

Web shell의 CLI는 현재 cwd·env·vendor 인자와 인증된 terminal 문맥을 daemon에 전달하고 foreground WS로
raw 입출력·resize를 중계한다. daemon의 AgentController가 Runtime·credential을 먼저 등록하고
adapter의 준비·주입·version 확인과 execution owner의 PTY 생성을 조율한다. 내부 vendor PTY는
daemon 실행 소유자가 관리하며, 빌린 shell의 공개 terminal ID는 유지하고 새 탭을 만들지 않는다. 근거: [[apps/cli/src/bootstrap.ts]] `apps/cli/src/bootstrap.ts:425`,
[[apps/cli/src/foreground.ts]] `apps/cli/src/foreground.ts:20`,
[[apps/daemon/src/agent-controller.ts]] `apps/daemon/src/agent-controller.ts:88`,
[[apps/daemon/src/agent-controller.test.ts]] `apps/daemon/src/agent-controller.test.ts:305`.

다음은 MCP 주입 부분만 보여주는 축약 예시다. 포트·Network ID는 예시이며 실제 spawn handle은
daemon 실행 소유자가 소유한다.

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
AIOX가 `--strict-mcp-config`를 추가하거나 user/project/local 영구 등록을 요구하지 않는다.
사용자가 지정한 strict 옵션과 설정 source 선택은 보존한다.
custom Channel flag, AIOX channel child, agent별 `/send` listener와 Channel fallback도 없다.

사용자 MCP는 vendor의 다중 config 병합을 이용하고, 단일 `--settings`와 append 지침 옵션은
사용자 내용과 AIOX 내용을 합쳐 전달한다. 영구 설정 파일은 수정하지 않는다. 일반 옵션은 그대로
전달하며, 필수 inbox·MCP·credential·hooks를 무효화하는 충돌은 실행 전에 원인·수정 방향을
표시하고 거절한다. 범용 vendor parser가 아니라 AIOX 주입에 직접 영향을 주는 옵션·설정만
검사한다. 기존 Stop hook이나 plugin 영향으로 Stop의 최종 결과를 확인할 수 없으면 입력을
완료로 추정하지 않는다. 근거: [[packages/adapters/claude/src/claude-launch.ts]] `packages/adapters/claude/src/claude-launch.ts:7`,
[[packages/adapters/claude/src/claude-launch.test.ts]] `packages/adapters/claude/src/claude-launch.test.ts:131`.

hook helper는 exec-form command/args로 실행돼 shell quoting을 거치지 않는다. 실행별 hook token으로
보고를 인증하며 MCP token과 구분한다. payload의 session_id/prompt_id 자체는 Runtime 인증이
아니다. helper는 vendor 결정·표준출력·재전송을 추가하지 않는다. 실행 entry는 adapter의
`claude-hook-main.js`이며 공통 실행 controller는 이 vendor 파일 경로를 구성하지 않는다. 근거:
[[packages/adapters/claude/src/launch-hooks.ts]] `packages/adapters/claude/src/launch-hooks.ts:5-9`,
[[packages/adapters/claude/src/claude-hook-main.ts]] `packages/adapters/claude/src/claude-hook-main.ts:1-6`,
[[packages/adapters/claude/src/claude-hook.ts]] `packages/adapters/claude/src/claude-hook.ts:9-71`,
[[packages/adapters/claude/src/claude-hook.test.ts]] `packages/adapters/claude/src/claude-hook.test.ts:1-98`.
vendor 설정 의미 참고: [Claude MCP](https://code.claude.com/docs/en/mcp),
[CLI](https://code.claude.com/docs/en/cli-reference), [Hooks](https://code.claude.com/docs/en/hooks).

## Claude inbox와 표시

아래는 Claude adapter의 입력·관측 의미다. inbox 자원과 버전 검사는 실행 위치의 owner 쪽에서
준비하고, daemon binding은 같은 adapter의 협업 연결을 사용한다.

현재 input 구현은 native inbox socket/pipe다. 과거 사용자 전달 실측에서 macOS idle 5회, busy 전달,
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
# binding이 실행별 경로로 주입하는 hidden 옵션
claude --messaging-socket-path /tmp/aiox-private/runtime-123.sock

# native Windows PowerShell 형태, Windows 실측 미수행
claude --messaging-socket-path '\\.\pipe\aiox-runtime-123'
```

binding이 Runtime별 주소를 관리한다. `/status` Peer address는 현재 Claude 자신의 주소이고,
`uds:`는 표시 접두어다. 부모가 `CLAUDE_CODE_MESSAGING_SOCKET`을 지정해 listener를 설정하는
방식은 채택하지 않는다. SOCKET/TOKEN env는 Claude가 bind 후 hooks/Bash에 export하는 결과라는
설치 바이너리 조사 근거가 있다. hidden 옵션은 binding에 격리한다.

Unix 명시 경로는 절대 경로·basename·정규화 길이 103 UTF-8 bytes 이하·부모 소유권/권한·symlink·
live socket 충돌 검사 경계가 조사됐다. binding은 private 부모를 0700으로 생성하며 임의 기본 `/tmp/cc-socks/PID.sock`을
전 OS 고정 계약으로 만들지 않는다. Windows는 파일 `.sock`가 아니라 named pipe다.

```json
{"type":"auth","token":"<Claude inbox token>"}
{"type":"user","message":{"role":"user","content":"..."}}
```

native Windows는 inbox 인증 첫 줄이 필수이며 Unix는 선택 가능하다. 구현은 두 경로 모두
auth 첫 줄을 보낸다. hook helper가 Claude의 `CLAUDE_CODE_MESSAGING_SOCKET/TOKEN` 결과를
daemon으로 보고하고 binding은 할당한 주소·실행 내 token 일관성을 확인한다. inbox·hook·MCP
token은 별개다. Windows named pipe 주소 생성·token 전달·인증 경로는 구현됐지만 Windows 실제
vendor 통합은 미검증이다. macOS 바이너리 문자열이나 Unix socket 테스트를 Windows 실측으로
취급하지 않는다. 근거: [[packages/adapters/claude/src/claude.ts]] `packages/adapters/claude/src/claude.ts:94`,
[[packages/adapters/claude/src/claude-inbox.ts]] `packages/adapters/claude/src/claude-inbox.ts:4-53`.
accept/hold/refuse는 vendor 정책이며 AIOX가 몰래 accept로 바꾸지 않는다.
[Inbox 문서](https://code.claude.com/docs/en/cross-session-messaging#the-sessions-inbox-socket).

설치/플랫폼/Peer 최소 버전을 확인하고 미지원이면 실행 실패로 보고한다. 전달받은 최소 지원
근거는 macOS/Linux/WSL2 2.1.224+, native Windows 2.1.234+다. 최소 버전 충족은 raw wire 미래
호환 보장이 아니다. 준비는 Web의 살아 있는 관리 PTY 또는 외부 CLI의 시작 통보, 인증된 hook·inbox 연결에 더해 Network Runtime의
실행별 MCP initialize 성공까지 요구한다. 단순 파일 존재나 write 성공을
모델 수신으로 승격하지 않는다. 준비 확인을 위해 모델 ACK probe를 자동 실행하지 않는다.
버전 probe는 실제 vendor 실행과 같은 caller 환경과 cwd에서 수행한다. 외부 실행은 CLI에서 검사한다. 시작 제한 시간은 최초 준비
성공 이력인 wasReady를 기준으로 판단하며, 준비 후 inbox 연결 손실을 초기 시작 실패로
다시 처리하지 않는다. 현재 연결 상태와 최초 준비 성공 이력은 binding이 별도로 소유한다.
근거: [[packages/adapters/claude/src/claude-version.ts]] `packages/adapters/claude/src/claude-version.ts:3-32`,
[[apps/daemon/src/agent-controller.ts]] `apps/daemon/src/agent-controller.ts:386`,
[[packages/adapters/claude/src/index.ts]] `packages/adapters/claude/src/index.ts:21`,
controller test의 `apps/daemon/src/agent-controller.test.ts:254`.

같은 프로세스 `/clear`·`/resume`에서 listener/address/token 유지가 보고됐다. vendor session ID는
바뀔 수 있으므로 optional session_id를 과거 값으로 계속 주입하지 않는다. 새 Claude 프로세스는
새 inbox 수명이다.

## Claude 입력과 응답 종료 관측 [Status: As-built]

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

ClaudeObservations는 실행별 원문과 session/prompt를 연결하고 직접 입력·daemon 알림은 발신 요청을
완료시키지 않는다. 같은 key 재사용·원문의 복수 key 귀속·prompt ID 누락은 불확실 상태로 남긴다.
vendor 내부 subagent의 agent_id가 있는 보고는 부모 입력 결과·현재 상태에 적용하지 않는다.
개별 completed/failed/interrupted와 현재 작업·승인/질문 대기·오류 상태는 별도로 투영한다.
Notification은 session·종류·prompt별 대기 힌트다. 대응하는 식별된 요청과 완료 관측으로
같은 prompt의 힌트 및 session의 미식별 힌트를 정리하되 다른 prompt의 미해결 요청은 유지한다.
근거: [[packages/adapters/claude/src/claude-observations.ts]] `packages/adapters/claude/src/claude-observations.ts:273`,
[[packages/adapters/claude/src/claude-observations.test.ts]] `packages/adapters/claude/src/claude-observations.test.ts:367`.
Stop은 응답 종료이며 작업 성공·프로세스 종료가 아니다. 여러 입력에 하나의 Stop이 왔다고
모두 성공으로 표시하지 않는다. StopFailure의 prompt_id 연결은 구현·대역 검증됐지만 단일 Stop의
과거 실측을 모든 busy·실패 상황의 vendor 관측 증거로 확대하지 않는다.
이미 수용한 단일 inbox/Stop 연결이나 Codex active thread를 다시 전체 실험 과제로 만들지 않는다.
근거: [[packages/adapters/claude/src/claude-observations.ts]] `packages/adapters/claude/src/claude-observations.ts:43`,
[[packages/adapters/claude/src/claude-observations.test.ts]] `packages/adapters/claude/src/claude-observations.test.ts:36-347`,
controller test의 `apps/daemon/src/agent-controller.test.ts:726`.

## Claude 정리와 검증 경계

외부 shell이 유지됐다는 과거 daemon PTY 실행 결과는 외부 vendor 독립 수명의 증거로 승계하지
않는다. 아래 2026-09-11 직접 실행 실측을 별도 근거로 사용한다.

daemon은 먼저 협업 등록 유효성과 credential을 회수한다. daemon 소유 execution owner의 stop은
실제 PTY exit와 inbox 자원 정리를 확인하며, 외부 실행 owner는 CLI에 남는다. binding cleanup은
협업 관측·hook 연결을 해제하고 daemon이 route·요청·등록을 정리한다. 외부 inbox 임시 자원은
CLI가 vendor exit 후 정리한다. 부분 실패는 Runtime과 재시도 경로를 유지한다. foreground
연결 손실·프로세스 실패·중단은 연결된 입력 결과를 각각 정리하며 메시지를 재전송하지 않는다.
daemon execution owner의 terminal 상태 자원은 kill 성공 후 dispose로 해제한다. kill 실패 시에는
dispose를 진행하지 않아 종료 재시도에 필요한 세션을 보존한다.
근거: [[packages/adapters/claude/src/claude.ts]] `packages/adapters/claude/src/claude.ts:181`,
[[packages/vendor/src/execution.ts]] `packages/vendor/src/execution.ts:7`;
[[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:307`.
브라우저 attachment 해제는 입력 연결 손실과 별개다. Agent 종료의 borrowed shell 유지와 daemon
force stop의 shell 종료는 [[docs/specs/aiox-runtime]]의 소유 관계를 따른다. [Status: As-built]
근거: controller test의 `apps/daemon/src/agent-controller.test.ts:147-253`,
[[packages/adapters/claude/src/claude.test.ts]] `packages/adapters/claude/src/claude.test.ts:18-69`.

현재 트리의 검증은 실제 HTTP MCP→native socket→인증 hook→DB 결과·자동 알림까지 연결한
controller 대역 테스트와 개별 관측 테스트를 포함한다. 실행 owner의 helper·foreground 정리와
adapter 자원 수명은 [[packages/vendor/src/execution.test.ts]] `packages/vendor/src/execution.test.ts:6`,
[[packages/adapters/claude/src/index.test.ts]] `packages/adapters/claude/src/index.test.ts:11`에서 검증한다.
이는 실제 Claude 모델 수신·응답 성공의 증거가 아니다.

빌드된 CLI의 macOS 실제 PTY 검사에서는 빌린 shell과 외부 shell 각각에서 대역 vendor 실행·종료 후
원래 shell의 입력 가능 상태를 확인했다. daemon force stop은 소유 shell을 종료하고 외부 shell은
유지했다. 이는 CLI/PTY 수명 통합 확인이며 실제 모델 E2E와 구분한다.

2026-09-09 macOS Claude 2.1.266 시작 검증 보고는 빌드된 helper의 인증된 SessionStart·inbox 및
Network MCP initialize 준비와 daemon force stop·등록 정리까지다. 모델 메시지는 보내지 않았다.
기존 2.1.263 사용자 실험, 이번 시작 확인, 새 제품의 모델 E2E를 구분한다. 사용자 참여 실제 Claude
입력·응답·표시 확인은 Stage3 W5에 남고 Windows/Linux/WSL의 실제 vendor 실행은 미검증이다.

### 외부 직접 실행 수명 실측 [Status: As-built]

2026-09-11 macOS arm64·Node v24.14.0·Claude Code 2.1.268에서 빌드된 CLI와 daemon으로
정상 stop·force stop·daemon SIGKILL·제어 WS만 단절하는 네 경우를 확인했다. 각 실행은
협업 준비 뒤 `terminalId=null`, daemon terminal 목록 비어 있음, 실제 Claude가 CLI의 직접 자식이며
같은 사용자 TTY를 상속함을 확인했다. 검증 harness의 node-pty는 사용자 터미널을 대신하며
제품 외부 실행이 추가 PTY를 생성했다는 뜻이 아니다.

네 경우 모두 단절 뒤 실제 Claude의 `/help`에서 Shortcuts·General 화면이 표시됐고 `/exit`의
종료 코드 0 뒤 원래 shell에서 새 명령을 실행했다. inbox socket과 CLI 소유 임시 디렉터리는 단절 후 vendor 생존 중 유지되고
종료 후 모두 삭제됐다. WS만 단절한 경우 daemon은 유지되며 Agent 등록 제거와 기존 보고 credential의
401 거절을 확인했다. 검사한 사용자·프로젝트 설정 파일의 내용 hash는 실행 전후 같았다.

실측 근거는 `/private/tmp/aiox-w5-real-external.mjs`와
`/private/tmp/aiox-w5-real-1789120416147/results.json`, 각 mode의 `after-loss-help.txt`·
`exit-screen.txt`다. 이 결과는 실제 TUI 수명·사용자 조작·shell 복귀 증거이며 모델 호출이나
HTTP MCP 메시지의 모델 수신·응답 E2E 증거는 아니다. Windows native·Linux·WSL의 실제 vendor
수명은 미검증이다. Claude 메시지 E2E와 Windows pipe/token 실제 통합은 후속 Claude 통합 검증에서
별도로 수행하며, 이번 결과를 Codex·Host 구현 완료로 확대하지 않는다.

### Web 실행·화면 복원 회귀 실측 [Status: As-built]

같은 macOS 검증에서 실제 Claude의 inbox·hook·Network MCP 준비와 daemon 소유·shell 차용을
확인했다. Web terminal WS viewer를 끊어도 Runtime·shell은 유지됐고, 다시 연결한
snapshot/state를 headless terminal로 소비한 화면은 단절 전 idle 화면과 같았다. `/exit`의
종료 코드 0 뒤 Runtime·inbox 디렉터리는 정리됐고 원래 shell에서 새 입력을 처리했다.
검사한 사용자·프로젝트 Claude 설정과 프로젝트 MCP 파일 내용은 유지됐다.

근거는 `/private/tmp/aiox-vendor-web-real.mjs`와
`/private/tmp/aiox-vendor-web-real-RTgZLr/results.json`, 동일한 `before-detach.txt`·
`after-reattach.txt` 화면이다. 실제 vendor와 Web WS·snapshot/state 소비 경로의 회귀 검증이며
브라우저 픽셀 캡처나 Web UI 전체 E2E 검증은 아니다. 모델 메시지 송수신과 다른 OS의 실제
vendor 통합 한계는 위 외부 실측과 동일하게 남는다.

## Codex 실행과 active thread [Status: Target]

TUI·Binding Relay·App Server는 함께 필요한 실행 자원이다. Web·Host는 daemon이, 외부
`agent run`은 CLI가 이 자원들을 소유한다. daemon 연결 손실에도 이미 시작한 외부 TUI에 필요한
Relay·App Server를 유지한다. 협업 등록 해제와 이 자원들의 종료를 결합하지 않는다.

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

입력은 [[docs/specs/aiox-collaboration]]의 채택에 따라 `toolOutput` 본문과
`additionalContext` 전달 메타데이터로 구성한다. 사용자 확인상 이 조합의 실험은 통과했다.
신규 AIOX 통합에서 실제 표시·입력 전달·회신을 E2E로 연결하며, 요구를 충족하지 못할 때만
원인을 확인하고 IDE delimiter+Cyan 또는 toolOutput 단독 등 후순위 후보를 검토한다.
후보 사이의 추가 우선순위는 정하지 않았으며 여러 fallback을 미리 구현하지 않는다.

완전한 wire의 필드 배치와 context 길이 제한·절단 위치는 추측으로 재구성하지 않는다.
고정 `Sent by Codex` 문구가 Claude 발신자를 올바르게 표시한다고 단정하지 않고 내부 renderer
의존과 실제 표시를 확인한다. 표시 개선이 exactly-once나 모델 action dedupe를 뜻하지 않는다.

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
