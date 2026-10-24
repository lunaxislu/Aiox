# AIOX Vendor Bindings

Status: Current

[[docs/architecture/aiox-system]]의 공통 실행 소유자와 vendor adapter가 실행, 입력, 관측과 정리를
나누는 경계다. 현재 실행 adapter는 Claude와 Codex이며 이후 vendor도 같은 계약에 연결한다.
Headless·Claude SDK·`-p`·ACP 실행은 현재 범위가 아니다.
공통 도구와 메시지 의미는 [[docs/specs/aiox-collaboration]]를 따른다.
Claude와 Codex의 현재 실행 연결, 과거 실측, 미완료 관측·메시지 통합을 아래에서 구분한다.
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

Codex는 Runtime·threadId·turnId에 입력을 연결하고 `turn/completed`의 결과가 completed/failed/interrupted인지 구분한다. busy toolOutput이 기존 turn에서 처리될 수 있으므로 입력마다 별도 turn이 생성된다고 가정하지 않는다. Claude는 registry·transcript 파일 감시와 StopFailure 보고로 session/prompt의 인과관계와 입력 종료를 판정한다. 정확한 busy/multi-input 연결은 실제 통합의 검증 대상이다.

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

실행 owner의 foreground/background 획득·중단·정리는 native Effect다. XState가 owner의
사용 가능·할당·중단 중·정리 실패·정리 완료 전이와 guard를 소유한다. 획득 중 취소는 늦게 생긴
프로세스의 handle까지 owner가 회수하는 경로를 유지한다. 종료 확인 실패는 handle과 원인을 남겨
다음 stop이 재시도한다. Effect Scope 종료 자체를 OS 프로세스 종료 성공으로 사용하지 않는다.
CLI·Node·vendor binding의 Promise 호출 계약은 경계에서 이어준다. 구현·회귀 근거는 [[packages/vendor/src/execution.ts]],
[[packages/vendor/src/execution.test.ts]], [[apps/cli/src/external.test.ts]]다.

AgentController의 socket별 실행 상태는 [[apps/daemon/src/agent-lifecycle.ts]]의 XState actor가
소유한다. 준비 전/준비 완료/시작과 각 시점의 종료 이력, relay 연결 손실, stop 요청을
구분한다. `STARTED` 허용 여부와 종료·준비·중단 guard는 actor snapshot에서 읽으며 별도
boolean으로 복제하지 않는다. 실제 준비·종료·cleanup은 Effect가 수행한다. relay 손실은
외부 CLI 소유 프로세스의 종료를 뜻하지 않으며, 준비 뒤 최초 협업 실패는 `startup-failed`
응답으로 전달한다. 근거는 [[apps/daemon/src/agent-controller.ts]]와 인접 lifecycle/controller
테스트다.

Claude 보고/등록·transcript 읽기와 관측 결과 정산은 Effect semaphore와 소유 Fiber로 직렬화한다.
Codex의 준비·relay 요청과 입력 수락 대기는 Deferred와 Clock timeout Fiber가 담당하며 응답·종료 시
대기를 정리한다. daemon 메시지 저장 retry/drain은 [[docs/architecture/aiox-storage-terminal]]의
결과 인수 경계를 따른다. 효과 실행과 프로세스 수명은 vendor별 코드가 새 owner를 만들지 않고
위 ExecutionOwner에 연결한다. 실제 vendor 모델 E2E 완료를 이 내부 전환의 근거로 주장하지 않는다.

`createExecution`은 임시 자원 등록과 취소 신호만 받아 프로세스 없이 connection을 준비한다.
`VendorExecution.start`는 실행 owner를 받아 부속 프로세스를 실행하고 준비를 기다린 뒤 foreground를
시작할 수 있다. 취소 뒤 늦게 할당된 자원도 owner가 정리하며 중단된 준비가 새 실행을 만들지 않는다.
owner가 생성한 프로세스와 임시 자원은 한 실행에 속하며 정리 실패는 재시도 가능하게 남는다.
공통 계약은 inbox 하나나 단일 프로세스를 요구하지 않는다. `connection`과 `launch`는 공통 wire에서
vendor 필드가 없는 metadata이며 adapter 경계에서 검증한다. 현재 adapter 선택은 조립 시 전달한
목록을 사용한다. 동적 설치·capability framework·Codex 실제 구현 완료를 뜻하지 않는다.

근거: [[packages/vendor/src/index.ts]] `packages/vendor/src/index.ts:49-99`,
[[packages/vendor/src/execution.ts]] `packages/vendor/src/execution.ts:7`,
[[packages/adapters/claude/src/index.ts]] `packages/adapters/claude/src/index.ts:21`.
다른 vendor 대역의 inbox 없는 제어 연결과 helper 준비 후 Web 실행은
[[apps/daemon/src/agent-controller.test.ts]] `apps/daemon/src/agent-controller.test.ts:1416-1554`에서 검증한다.

외부 CLI는 실행별 자원을 준비하고 daemon에 connection을 전달한다. AgentController가
Runtime·보고 credential·binding을 준비한 뒤 launch를 반환하면 adapter가 실제 실행 위치에서
버전을 검사하고 실행한다. CLI는 시작·종료를 제어 WS로 통보하며 화면·resize를 전송하지 않는다.
외부 CLI는 `startup-failed` 원인을 출력하고 제어 연결을 해제하되 시작한 실행 owner를
유지한다. 최초 준비 timeout·daemon/WS 손실과 프로세스 종료는 다른 사건이며 자연 종료·로컬
종료가 foreground·필수 부속 실행·임시 자원을 정리한다. 실제 프로세스 종료와 협업 정리 계약은
[[docs/specs/aiox-runtime]]을 따른다. 이 처리 경계는 vendor 공통이다. [Status: As-built]

근거: [[apps/daemon/src/agent-controller.ts]] `apps/daemon/src/agent-controller.ts:88`,
[[apps/cli/src/external.ts]] `apps/cli/src/external.ts:171-177`,
[[apps/cli/src/external.test.ts]] `apps/cli/src/external.test.ts:147-188`,
`apps/cli/src/external.test.ts:303-325`, `apps/cli/src/external.test.ts:363-387`.

Claude inbox 임시 디렉터리는 실행 위치의 owner가 생성·권한·경로 길이 검사부터 정리까지 소유한다.
실제 socket은 Claude가 열고 daemon binding은 접속한다. adapter는 등록한 주소와 인증 hook 보고를
정확히 대조하며 인증만으로 임의 경로를 신뢰하지 않는다. CLI의 등록 정리 실패도 shell 복귀를
막지 않으며 실패 진단을 남긴다. 근거:
[[packages/adapters/claude/src/claude-environment.ts]] `packages/adapters/claude/src/claude-environment.ts:7`,
[[packages/adapters/claude/src/claude.ts]] `packages/adapters/claude/src/claude.ts:101-127`.

외부 실행의 hook은 daemon 연결 거부 `ECONNREFUSED`만 조용히 종료한다. 401·잘못된 보고·
timeout·연결 reset과 daemon 소유 실행의 오류 진단은 유지한다. 실행별 소유권 표지는 공통
controller가 adapter에 전달하고 사용자 설정의 같은 환경 변수 덮어쓰기는 충돌로 거절한다.
근거: [[packages/adapters/claude/src/claude-hook.ts]] `packages/adapters/claude/src/claude-hook.ts:49-80`,
[[packages/adapters/claude/src/claude-hook.test.ts]] `packages/adapters/claude/src/claude-hook.test.ts:100-148`,
[[packages/adapters/claude/src/claude-launch.ts]] `packages/adapters/claude/src/claude-launch.ts:215-231`.
Host의 실제 실행 통합은 여전히 목표이며 이 hook 분기 검증으로 완료 처리하지 않는다. [Status: Target]

## Claude Web 실행 구성 [Status: As-built]

Web shell의 CLI는 현재 cwd·env·vendor 인자와 인증된 terminal 문맥을 daemon에 전달하고 foreground WS로
raw 입출력·resize를 중계한다. daemon의 AgentController가 Runtime·credential을 먼저 등록하고
adapter의 준비·주입·version 확인과 execution owner의 PTY 생성을 조율한다. 내부 vendor PTY는
daemon 실행 소유자가 관리하며, 빌린 shell의 공개 terminal ID는 유지하고 새 탭을 만들지 않는다. 근거: [[apps/cli/src/bootstrap.ts]] `apps/cli/src/bootstrap.ts:466-523`,
[[apps/cli/src/foreground.ts]] `apps/cli/src/foreground.ts:20`,
[[apps/daemon/src/agent-controller.ts]] `apps/daemon/src/agent-controller.ts:88`,
[[apps/daemon/src/agent-controller.test.ts]] `apps/daemon/src/agent-controller.test.ts:477-615`.

Web의 실행 owner와 daemon 관리 등록은 화면 중계 연결보다 오래 유지된다. controller는
살아 있는 vendor의 중계 연결 손실을 `relayDisconnected`로 기록하고 owner를 종료하지 않는다.
협업 준비 실패는 별도로 권한을 회수하고 실패 원인을 보존한다. terminal 조회는 기존 shell
ID 아래 vendor 실행 신원·생존·중계·협업 상태를 제공한다. 기존 terminal의 다시 연결은
terminal과 Runtime 소속을 검증한 뒤 같은 vendor PTY에 attachment를 복원한다. vendor 정리는
owner의 foreground·필수 부속 실행·자원 종료를 확인한 뒤 등록을 제거하며 빌린 shell은
유지한다. 화면 복구로 MCP를 재등록하거나 vendor를 새로 생성하지 않는다. [Status: As-built]

근거: [[apps/daemon/src/agent-controller.ts]] `apps/daemon/src/agent-controller.ts:163-184`,
`apps/daemon/src/agent-controller.ts:228-252`; [[apps/daemon/src/http.ts]]
`apps/daemon/src/http.ts:170-217`; [[apps/daemon/src/daemon.ts]]
`apps/daemon/src/daemon.ts:297-318`, `apps/daemon/src/daemon.ts:362-390`;
[[apps/daemon/src/agent-controller.test.ts]] `apps/daemon/src/agent-controller.test.ts:1722-1889`.

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
검사한다. 사용자 Stop hook은 보존하고 AIOX Stop hook은 주입하지 않는다.
종료 관측을 위한 Stop 구성값은 계산·전달하지 않으며 plugin 실행 인자·설정은 보존한다. 근거: [[packages/adapters/claude/src/claude-launch.ts]] `packages/adapters/claude/src/claude-launch.ts:7`,
[[packages/adapters/claude/src/claude-launch.test.ts]] `packages/adapters/claude/src/claude-launch.test.ts:87-176`.

hook helper는 exec-form command/args로 실행돼 shell quoting을 거치지 않는다. 실행별 hook token으로
보고를 인증하며 MCP token과 구분한다. payload의 session_id/prompt_id 자체는 Runtime 인증이
아니다. helper는 실제 process.ppid를 보고하며 전체 입력·HTTP 보고 제한은 30초다.
현재 주입하는 hooks는 SessionStart·StopFailure·Notification이며, 성공한 Claude 보고는 204로 응답한다.
helper는 stdout 출력을 만들지 않으며 vendor 결정이나 입력 재전송을 추가하지 않는다. 실행 entry는 adapter의
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
```

binding이 Runtime별 주소를 관리한다. `/status` Peer address는 현재 Claude 자신의 주소이고,
`uds:`는 표시 접두어다. 부모가 `CLAUDE_CODE_MESSAGING_SOCKET`을 지정해 listener를 설정하는
방식은 채택하지 않는다. SOCKET/TOKEN env는 Claude가 bind 후 hooks/Bash에 export하는 결과라는
설치 바이너리 조사 근거가 있다. hidden 옵션은 binding에 격리한다.

Unix 명시 경로는 절대 경로·basename·정규화 길이 103 UTF-8 bytes 이하·부모 소유권/권한·symlink·
live socket 충돌 검사 경계가 조사됐다. binding은 private 부모를 0700으로 생성하며 임의 기본 `/tmp/cc-socks/PID.sock`을
플랫폼 공통 고정 계약으로 만들지 않는다.

```json
{"type":"auth","token":"<Claude inbox token>"}
{"type":"user","message":{"role":"user","content":"..."}}
```

Unix inbox는 인증 첫 줄이 선택 가능하지만 AIOX는 auth 첫 줄을 보낸다.
hook helper가 Claude의 `CLAUDE_CODE_MESSAGING_SOCKET/TOKEN` 결과를 daemon으로 보고하고
binding은 할당한 주소·실행 내 token 일관성을 확인한다. inbox·hook·MCP token은 별개다.
근거: [[packages/adapters/claude/src/claude.ts]], [[packages/adapters/claude/src/claude-inbox.ts]].
accept/hold/refuse는 vendor 정책이며 AIOX가 몰래 accept로 바꾸지 않는다.
[Inbox 문서](https://code.claude.com/docs/en/cross-session-messaging#the-sessions-inbox-socket).

설치/플랫폼/Peer 최소 버전을 확인하고 미지원이면 실행 실패로 보고한다. 전달받은 최소 지원
근거는 macOS/Linux 2.1.224+다. 최소 버전 충족은 raw wire 미래
호환 보장이 아니다. 준비는 Web의 살아 있는 관리 PTY 또는 외부 CLI의 시작 통보, 인증된 hook·inbox 연결에 더해 Network Runtime의
실행별 MCP initialize 성공까지 요구한다. 단순 파일 존재나 write 성공을
모델 수신으로 승격하지 않는다. 준비 확인을 위해 모델 ACK probe를 자동 실행하지 않는다.
버전 probe는 실제 vendor 실행과 같은 caller 환경과 cwd에서 수행한다. 외부 실행은 CLI에서 검사한다. 시작 제한 시간은 최초 준비
성공 이력인 wasReady를 기준으로 판단하며, 준비 후 inbox 연결 손실을 초기 시작 실패로
다시 처리하지 않는다. 현재 연결 상태와 최초 준비 성공 이력은 binding이 별도로 소유한다.
근거: [[packages/adapters/claude/src/claude-version.ts]] `packages/adapters/claude/src/claude-version.ts:3-32`,
[[apps/daemon/src/agent-controller.ts]] `apps/daemon/src/agent-controller.ts:473-487`,
[[packages/adapters/claude/src/index.ts]] `packages/adapters/claude/src/index.ts:21`,
controller test의 `apps/daemon/src/agent-controller.test.ts:259-282`.

같은 프로세스 `/clear`·`/resume`에서 listener/address/token 유지가 보고됐다. vendor session ID는
바뀔 수 있으므로 optional session_id를 과거 값으로 계속 주입하지 않는다. 새 Claude 프로세스는
새 inbox 수명이다.

## Claude 입력과 응답 종료 관측 [Status: As-built]

```text
SessionStart → inbox·ppid registry 확인 → session reader 초기 offset 확보 → 204 응답
registry 파일 감시 → 현재 선택 session 화면 상태
transcript 파일 감시 → session/prompt 입력 및 parent chain → completed / interrupted
StopFailure → 해당 session/prompt 실패 관측 (입력보다 빠르면 보관)
→ adapter 최초 outcome 보존 → controls.settle → daemon 인수 ack → local 연결 해제
```

ClaudeBinding은 인증된 report의 inbox 경로·credential과 실제 inbox 연결을 확인한다.
SessionStart는 절대 transcript 경로와 정확한 sessions/<ppid>.json의 존재·형식을 확인한다.
실행·clear·resume 모두 대상 session의 관측을 준비하고 hook에 응답한다. registry ID가 다르면
준비 상태로 두며, 일치하는 registry 관측과 실행·inbox·필요한 MCP 연결이 갖춰져야 최초 ready를
발행한다. registry의 정상적인 초기 `status` 누락은 오류가 아니며 준비 완료 근거로도 사용하지 않는다.
유효한 status가 확인될 때까지 준비 상태를 유지하면서 transcript 감시는 계속한다.
`idle` 기본값을 채우지 않고 `shell`도 허용하여 `working`과 Bash 잔여 작업 이유로 투영한다.
registry 미존재·형식 오류·초기 watcher 실패는 초기화 오류다. 보관한 이전 ID로
불일치를 특별 허용하지 않으며 hook에서 registry 일치를 기다리지 않는다.

새 instance는 hook 응답 전에 transcript identity와 EOF를 확보한다. 파일 미존재는 offset 0이며
나중 생성 시 EOF를 다시 잡지 않는다. 동일 ID를 포함해 session을 resume하면 새 instance와 EOF로
시작한다. 현재 instance의 compact는 cursor를 유지하고, 처음 보는 compact transcript만 0에서
시작한다. 옛 읽기·정산은 새 instance의 offset 확보와 hook 응답을 막지 않는다.
CwdChanged·FileChanged·SessionEnd·도구 hook 보고와 vendor watchPaths 출력은 사용하지 않는다.

ClaudeTranscript는 파일 identity·byte offset과 UTF-8/미완성 행 경계를 관리한다. 전환 시
읽지 않는 옛 reader는 즉시 폐기하고, 읽는 reader는 이미 확보한 파일 크기까지 완성된 행을
소비한 뒤 폐기한다. 대기 중 읽기와 이후 append는 소비하지 않는다. watcher·cursor·파싱 및
정산 상태도 해제하며 새 화면에는 관여하지 않는다. 실제 입력으로 해당 instance에 귀속된 남은 요청만 interrupted로 정산하되 이미
확정한 결과는 바꾸지 않는다. 저장이 거절되면 확정 outcome과 재시도에 필요한 정보만 남긴다.
retirement Fiber의 저장 실패는 Effect 오류 처리로 관측 진단과 기존 outcome 재시도에 연결한다.
실제 프로세스 종료는 현재 reader의 마지막 읽기와 진행 중인 옛 읽기의 종료를 기다린 뒤 기존
종료 원인에 따른 fallback을 적용한다. 근거: claude.test.ts의 discard/fresh EOF, rapid resume,
retired outcome retry, repeated transitions 및 claude-transcript.test.ts의 retire 회귀.

binding은 Chokidar로 선택한 transcript와 정확한 sessions/<ppid>.json 및 그 파일의 parent를
감시한다. registry는 atomic replacement 뒤에도 parent watch를 유지하며, transcript 이동·삭제는
선택된 session과 파일 identity에 따라 다시 연결한다. Chokidar의 동일 경로 change 통지가 50ms 동안
합쳐지는 구간에서 마지막 쓰기를 놓치지 않도록 change event 뒤 Effect Clock으로 60ms 대기하고
읽는다. 이벤트가 없는 파일을 주기적으로 스캔하지 않는다. byte offset·부분 행·선택 session과 저장
확정 의미는 reader/observer의 기존 계약을 따른다. 초기 transcript 부재는 offset 0을 유지하며,
경로 소실은 config/projects 아래 동일 session 파일의 단일 후보에만 재부착한다. 여러 후보를
추측하거나 폐기한 session instance를 복구하지 않는다. hook 부가 이벤트 필드는 ingress에서 보존하고
보고 envelope의 알 수 없는 필드는 거절한다. 구현과 회귀는 [[packages/adapters/claude/src/claude.ts]],
[[packages/adapters/claude/src/claude-transcript.ts]], [[packages/adapters/claude/src/claude.test.ts]],
[[apps/daemon/src/agent-controller.test.ts]]를 따른다.

현재 transcript 경로가 사라졌다면 config/projects 바로 아래 디렉터리에서 동일 session 파일명을
찾고 단일 후보에 reader를 이전한다. 여러 후보는 관측 오류이며 추측하지 않는다. 같은 instance의
경로 이전은 cursor를 유지하지만 session 전환으로 폐기한 instance는 복구하지 않는다.

ClaudeObservations는 instance별 입력·chain·실패 상태를 관리한다. StopFailure와 Notification만
hook 관측으로 소비하고 실제 입력은 transcript에서 연결한다. 내부 UserPromptSubmit 합성과
도구 hook 상태 분기는 제거했다. 빠른 A→B→A에서 옛 A 읽기는 자신이 확보한 instance를 사용하며
새 A의 화면·정산 상태를 변경하지 않는다.

관측 진단은 RuntimeControls.setObservationError → RuntimeRecord.observation_error → HTTP
snapshot → Web 및 CLI 상세 조회로 전달한다. registry/현재 transcript 실패와 저장 거절 진단은
화면 status나 delivery 결과와 분리하며 복구된 항목만 해제한다. 폐기한 reader의 늦은 감시
콜백은 재등록하지 않는다. 저장 실패는 실패한 outcome만 재시도하고 삭제한 transcript를 열지 않는다.
근거: claude.test.ts의 repeated transitions/outcome retry와 apps/daemon/src/runtimes.test.ts,
apps/web/src/main.test.ts의 observation_error 회귀.

ClaudeTranscriptChain은 관측한 입력의 causal metadata만 보관한다. attachment를 거친 연결과
부모보다 먼저 기록된 자식을 연결한다. 미연결 기록 수가 4096개를 넘었다고 throw하거나
오래된 종료 근거를 버리지 않는다. session release까지 정제된 미연결 metadata를 보관하므로
그 크기에 비례한 메모리가 필요하며 고정 상한은 없다. 메모리 상한이 필요하면 근거 유실 없는
보관 방식이 별도 필요하다. 재개 시 관측 대상이 아닌 과거 입력은 건너뛴다.
무시한 UUID는 session release까지 보존해 늦은 자손을 미연결 행으로 적재하지 않는다.
부모 없는 귀속 불가 행과 미관측 요청도 무시 계보를 전파하되 새 사용자 입력은 별도 lifecycle로 관측한다.
무시 UUID도 이력에 비례한 메모리를 사용하며 고정 상한은 없다.
종료 요청의 graph는 다음 입력에서 제거하며 중복 억제용 종료 ID는 해당 instance가
해제될 때까지 유지한다. session 전환은 옛 instance를 폐기하며 resume에서 재사용하지 않는다.
저장 거절 outcome의 재시도 수명은 관측 instance의 수명과 분리한다.

정상 Stop 경로의 종료는 인증된 Runtime·동일 session/request의 현재 parent chain에서 정상
assistant end_turn과 완성된 turn_duration을 함께 확인한다. API 오류·중단 근거가 있는 경로,
duration 단독, 과거 branch의 duration은 정상 종료로 처리하지 않는다. 시작 시 Stop 설정과
무관하며 stop_hook_summary는 있으면 parent 연결로 소비하되 존재를 요구하지 않는다.
hasOutput·preventedContinuation·stopReason으로 별도 대기 조건을 만들지 않는다.
block/additionalContext 후속 작업은 같은 lifecycle의 working을 유지하고 최종 duration에서
해당 활동을 끝낸다. continue:false/stopReason도 이 종료 기준을 따르며 업무의 의미적 성공을
평가하거나 실패·사용자 중단으로 임의 분류하지 않는다. 명시적 async background hook 전체의
종료나 미래 continuation 부재를 기다리는 timeout/grace period는 두지 않는다.

중단은 실행 중이던 작업 종류와 무관하게 현재 요청의 parent chain에 연결된 vendor 중단
선언으로 판정한다. 두 vendor 중단 문구를 하나의 interrupted 결과로 정규화하며 오류 tool_result나
중단된 assistant ID의 존재를 요구하지 않는다. 선택적으로 전달된 interruptedMessageId는
연결된 assistant ID와 일치해야 한다. 직접 입력(origin/promptSource), 다른 요청·sidechain,
과거 branch는 제외하며 attachment를 통한 연결·부모 지연·중복 억제는 유지한다.
거부 결과나 isAbortedMidStream만으로는 요청 종료를 확정하지 않는다. interruptedByShutdown이
명시되면 표시 이유는 Interrupted이며 사용자 중단으로 표시하지 않는다.

ClaudeObservations는 transcript 입력 행에서도 session/prompt를 등록한다. AIOX 연결은
origin.kind=peer, origin.name=escape된 from-name 속성값, origin.body=발신 frame 본문 전체의
정확 일치로 확인한다. vendor가 붙인 안내문이나 UUID 표식 포함만으로 연결하지 않는다.
미연결 delivery는 Runtime에 보관하고 session 전환으로 귀속을 정하지 않는다. 먼저 온
StopFailure는 session/prompt별 최초 이유를 보관해 실제 입력이 도착하면 적용한다. 입력보다
먼저 온 자식 행도 인과 metadata로 보관한다. 직접 입력·daemon notice는 새 delivery를 만들지 않는다.
입력 연결은 transcript에서 수행하며 UserPromptSubmit hook 분기를 사용하지 않는다.
검증은 `claude-observations.test.ts`의 peer 입력·잘못된 origin/name/body·선행 실패·부모 지연 회귀와
`claude.test.ts`의 응답 전 EOF·compact 보존·차단된 consumer 독립 초기화 회귀다.

ClaudeObservations는 요청별 활동·대기와 Runtime 현재 상태를 분리한다. transcript API 오류는
completed를 막고 StopFailure가 실제 vendor 이유로 failed를 확정한다. 모든 StopFailure 오류
분류를 보존하며 일반 도구 오류를 요청 실패로 승격하지 않는다. 한 요청 종료는 그 요청의 도구·
승인·질문만 해소한다. 직접 입력은 delivery를 만들지 않으며 daemon 알림은 deliveryId=null이다.
최초 결과는 settle 인수 전 reject에도 보존하고 다음 flush/cleanup에서 그대로 전달한다.
인수 후 DB 실패는 daemon 책임이므로 adapter는 local 연결을 해제한다.

관측 수명 근거: [[packages/adapters/claude/src/claude.ts]] `packages/adapters/claude/src/claude.ts:101-377`,
[[packages/adapters/claude/src/claude-transcript.ts]] `packages/adapters/claude/src/claude-transcript.ts:4-82`.
인과관계와 인수 경계: [[packages/adapters/claude/src/claude-transcript-chain.ts]] `packages/adapters/claude/src/claude-transcript-chain.ts:53-198`,
[[packages/adapters/claude/src/claude-observations.ts]] `packages/adapters/claude/src/claude-observations.ts:80-130`, `packages/adapters/claude/src/claude-observations.ts:268-324`.
검증: [[packages/adapters/claude/src/claude-transcript-chain.test.ts]] `packages/adapters/claude/src/claude-transcript-chain.test.ts:52`,
`packages/adapters/claude/src/claude-transcript-chain.test.ts:81-120`의 늦은 과거 기록·부모 지연 회귀,
[[packages/adapters/claude/src/claude-observations.test.ts]] `packages/adapters/claude/src/claude-observations.test.ts:193-254`의 API 오류 뒤 과거 summary·duration과 StopFailure 결과 검증,
[[packages/adapters/claude/src/claude.test.ts]] `packages/adapters/claude/src/claude.test.ts:195-464`,
[[apps/daemon/src/agent-controller.test.ts]] `apps/daemon/src/agent-controller.test.ts:900-964`의 인증 HTTP·MCP·SQLite 통합 회귀.
SessionStart offset의 독립 확보, 최초 compact, 동일 session resume의 새 instance·EOF, 실제 process exit의
마지막 읽기와 세 종료 조건, 모든 reader drain 시도, 정산 거절 재시도는 `claude.test.ts`의 이름별
회귀를 따른다. 구형 FileChanged/CwdChanged 응답 테스트는 직접 파일 변경·registry 관측으로
대체했다. 진행 중 읽기 경로 이동은 `claude-transcript.test.ts`, 미연결 chain 보존은
`claude-transcript-chain.test.ts`가 검증한다. 실제 macOS Claude 2.1.276과 최신 production
adapter·daemon·DB 통합에서 기본 입력 및 /cd 전후 두 요청의 completed·알림 2건을 확인했다.
watchPaths 응답과 FileChanged hook은 없었다. 근거와 이전 vendor hook 실측의 구분은
Stage3 W3의 2026-09-19 직접 감시 전환 기록을 따른다. 최신 구조의 /clear·/resume 입력 두 순서,
다른 OS 실제 통합은 미검증이다.

## Claude 정리와 검증 경계

외부 shell이 유지됐다는 과거 daemon PTY 실행 결과는 외부 vendor 독립 수명의 증거로 승계하지
않는다. 아래 2026-09-11 직접 실행 실측을 별도 근거로 사용한다.

daemon은 먼저 협업 등록 유효성과 credential을 회수한다. daemon 소유 execution owner의 stop은
실제 PTY exit와 inbox 자원 정리를 확인하며, 외부 실행 owner는 CLI에 남는다. binding cleanup은
협업 관측·hook 연결을 해제하고 daemon이 route·요청·등록을 정리한다. 외부 inbox 임시 자원은
CLI가 vendor exit 후 정리한다. daemon의 종료 요청은 daemon 소유 실행만 종료하며 외부
실행은 협업만 정리한다. 외부 CLI의 로컬 종료는 해당 owner의 foreground·필수 부속 실행·자원
정리 완료를 확인한다. 부분 실패는 Runtime과 재시도 경로를 유지한다. foreground
연결 손실·프로세스 실패·중단은 연결된 입력 결과를 각각 정리하며 메시지를 재전송하지 않는다.
daemon execution owner의 terminal 상태 자원은 kill 성공 후 dispose로 해제한다. kill 실패 시에는
dispose를 진행하지 않아 종료 재시도에 필요한 세션을 보존한다.
근거: [[packages/adapters/claude/src/claude.ts]] `packages/adapters/claude/src/claude.ts:412-444`,
[[packages/vendor/src/execution.ts]] `packages/vendor/src/execution.ts:7`;
[[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:362-386`.
브라우저 attachment 해제는 입력 연결 손실과 별개다. Agent 종료의 borrowed shell 유지와 daemon
force stop의 shell 종료는 [[docs/specs/aiox-runtime]]의 소유 관계를 따른다. [Status: As-built]
근거: controller test의 `apps/daemon/src/agent-controller.test.ts:151-255`,
[[packages/adapters/claude/src/claude.test.ts]] `packages/adapters/claude/src/claude.test.ts:22-73`.

현재 트리의 검증은 실제 HTTP MCP→native socket→인증 hook→DB 결과·자동 알림까지 연결한
controller 대역 테스트와 개별 관측 테스트를 포함한다. 실행 owner의 helper·foreground 정리와
adapter 자원 수명은 [[packages/vendor/src/execution.test.ts]] `packages/vendor/src/execution.test.ts:12`,
[[packages/adapters/claude/src/index.test.ts]] `packages/adapters/claude/src/index.test.ts:11`에서 검증한다.
이는 실제 Claude 모델 수신·응답 성공의 증거가 아니다.

빌드된 CLI의 macOS 실제 PTY 검사에서는 빌린 shell과 외부 shell 각각에서 대역 vendor 실행·종료 후
원래 shell의 입력 가능 상태를 확인했다. daemon force stop은 소유 shell을 종료하고 외부 shell은
유지했다. 이는 CLI/PTY 수명 통합 확인이며 실제 모델 E2E와 구분한다.

2026-09-09 macOS Claude 2.1.266 시작 검증 보고는 빌드된 helper의 인증된 SessionStart·inbox 및
Network MCP initialize 준비와 daemon force stop·등록 정리까지다. 모델 메시지는 보내지 않았다.
기존 2.1.263 사용자 실험, 이번 시작 확인, 새 제품의 모델 E2E를 구분한다. 사용자 참여 실제 Claude
입력·응답·표시 확인은 Stage3 W5에 남고 Windows/Linux/WSL의 실제 vendor 실행은 미검증이었다.
이하 실측 기록의 Windows/WSL 언급은 당시 검증 경계이며 현재 지원 범위를 뜻하지 않는다.

### 외부 직접 실행 수명 실측 — 2026-09-11 검증 시점

2026-09-11 macOS arm64·Node v24.14.0·Claude Code 2.1.268에서 빌드된 CLI와 daemon으로
당시 정책에서 정상 stop·force stop·daemon SIGKILL·제어 WS만 단절하는 네 경우를 확인했다.
관측한 외부 생존 방향은 현재 계약과 같지만 이후 변경한 코드의 검증을 대체하지 않는다. 각 실행은
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
HTTP MCP 메시지의 모델 수신·응답 E2E 증거는 아니다. 당시 Windows native·Linux·WSL의 실제 vendor
수명은 미검증이었다. Claude 메시지 E2E와 Windows pipe/token 실제 통합은 당시 후속 검증 대상으로
남겼으며, 이 결과를 Codex·Host 구현 완료로 확대하지 않는다.

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

## Codex 실행과 active thread [Status: As-built]

CLI와 daemon은 `@aiox/adapter-codex`를 공통 실행 계약에 등록한다. Relay는 실행 위치의
CLI/daemon 안에 있으며 owner의 자원으로 등록한다. App Server는 owner의 background,
TUI는 foreground다. Relay root는 TUI, `/control`은 daemon binding이 서로 다른 실행별
credential로 접속한다. 협업 binding cleanup은 control 연결만 닫고 Relay 수명을 끝내지 않는다.

Relay와 App Server는 loopback port 0으로 바인딩하고 실제 할당 주소를 연결한다.
App Server의 listener 준비·조기 종료·timeout·취소를 확인한 뒤 remote TUI를 시작한다.
App Server와 Relay 인증 token은 별개이며 App Server에는 token hash, TUI에는 token 환경 변수
이름을 전달한다. 현재 실행 주입과 listener announcement 해석은 Codex 0.153.4에서 확인했다.

실행 시작·확정된 TUI thread·Network 사용 시 MCP initialize가 갖춰져야 최초 준비 완료다.
대화 전환 요청 중에는 전송을 거절하며 같은 연결의 성공 응답으로 대상을 갱신한다.
resume 선택창의 보조 연결도 허용하되 요청 ID는 연결별로 대응한다. 입력은 마지막으로
thread/start·resume·fork가 성공한 연결로 보내며 보조 연결 종료가 그 대상을 지우지 않는다.
TUI가 developerInstructions를 명시적으로 덮어쓰면 실행의 AIOX 지침을 병합한다.
서버 조기 종료는 binding 진단과 실행 위치의 stderr에 전달하고 TUI 종료를 요청한다.
준비 실패의 stderr는 credential을 가린 뒤 호출자에게 전달한다.
준비 URL 대기는 Deferred로 완료하고 stderr Stream은 ExecutionOwner가 계속 소비한다.
준비 완료가 stderr 파이프를 닫지 않으며, 실행 정리에서 reader Fiber를 종료한다.
[[packages/adapters/codex/src/index.test.ts]]는 실제 Node 자식 프로세스의 준비 후 대량 stderr 출력과 정상 종료를 검증한다.
App Server 종료의 서버 진단은 Pino의 고정 메시지·exitCode·signal만 남긴다. vendor 원문은 서버 로그로 복사하지 않으며 공통 정책은 [[docs/architecture/aiox-system]]의 서비스 진단 로그 절이 소유한다.

근거: [[packages/adapters/codex/src/index.ts]], [[packages/adapters/codex/src/launch.ts]],
[[packages/adapters/codex/src/relay.ts]], [[packages/adapters/codex/src/binding.ts]] 및 각 인접 테스트.
macOS 실제 Web TUI 실행·MCP 준비·재접속·new·shell 복귀와 외부 daemon force stop/SIGKILL 후
TUI 조작·shell 복귀를 확인했다. 사용자 동반 resume/fork/clear/new·선택 취소·Web 재접속에서
현재 대화 ID와 고유 입력의 화면 표시·응답을 확인했다. 사용자 세션의 RPC 전체를 동시 수집한
근거는 아니며 binding→Relay→turn/start 대상 대응·전환 중 거절·보조 연결과 listener 종료는
인접 index/relay 테스트가 검증한다. Codex↔Codex 메시지 왕복과 busy 입력은 사용자 동반
실측으로 확인했다. 2026-09-21 macOS의 Claude Code 2.1.278 / Haiku 4.5와 Codex 0.155.1 /
gpt-5.6-luna에서는 실제 AIOX TUI·MCP 경로로 양방향 송수신과 양쪽 단방향 전송을 확인했다.
네 delivery 모두 DB `completed`에 귀속됐고, 단방향 두 건은 원 발신자에게만 완료 알림이
전달됐으며 알림 재귀는 없었다. 이 교차 검증은 추가 실패·중단·busy 행렬이나 Stage3 전체
검증을 대신하지 않는다. 당시 Windows/Linux/WSL 실측도 남아 있었다.

같은 Codex 버전의 별도 실제 AIOX remote TUI에서 `/rename` 후 같은 thread의 후속 turn이
완료되고 Web 상태가 idle로 복귀했다. `/cd`는 remote 환경 제한으로 거절됐으며, 후속 `pwd`
turn은 기존 cwd에서 정상 완료됐다. 실제 cwd 이동 성공을 검증한 것은 아니다.
실측 출처: `logs/2026-09-09-AIOX-TUI-Stage4-Codex.md`의 2026-09-21 `/rename·/cd` 및
Haiku↔Luna 교차 검증 기록.


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
연결은 adapter 실행부가 구성한다. token은 App Server child env에 전달하고 `bearer_token_env_var`에는
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
`ephemeral=true`와 `threadSource="system"`이 함께 있는 내부 helper thread는 TUI와
App Server 사이를 그대로 통과하되 active thread로 선택하지 않는다. 일반 `ephemeral`
대화는 선택 대상이다. Relay는 전달 당시 thread ID를 `turn/start` 응답의 turn ID에 붙이고
turn·item·요청 이벤트를 control로 전한다. Binding은 Runtime/thread/turn에 delivery ID를
연결하고 같은 turn의 `turn/completed`만 해당 delivery들의 결과로 저장한다. 화면의 현재
활동은 선택된 thread의 turn·도구·request ID별 승인/질문 대기에서 계산한다. 끝난 turn의
늦은 item 이벤트는 결과를 바꾸지 않고, 한 요청 해소는 다른 미해결 요청을 지우지 않는다.
입력 수락 응답보다 turn 종료가 먼저 와도 결과를 보관해 같은 busy turn의 후속 수락에 연결한다.
진행 중인 입력 수락이 모두 끝날 때까지 조기 결과를 유지한다. flush는 인수 대기 중 합류한
delivery를 같은 목록에서 소비하고, 목록·결과 정리와 flush 소유권 해제를 함께 수행해
그 뒤 수락된 delivery가 새 flush를 시작하도록 한다.
최초 outcome을 보존하고 동일 turn flush를 병합한다. controls.settle 인수 ack 뒤 delivery 연결을
제거하며 인수 전 reject는 cleanup에서 같은 결과로 재시도한다. 인수 후 DB 실패는 daemon이
소유하므로 binding 종료 뒤에도 중앙 Effect retry Fiber가 저장한다. 최근 종료 turn의 중복 결과는 현재 상태를
덮어쓰지 않는다.
TUI가 사용자 승인·질문 응답을 소유한다.
근거: [[packages/adapters/codex/src/binding.ts]] `packages/adapters/codex/src/binding.ts:231-295`, `packages/adapters/codex/src/binding.ts:347-373`, `packages/adapters/codex/src/binding.ts:445-484`;
[[packages/adapters/codex/src/binding.test.ts]] `packages/adapters/codex/src/binding.test.ts:41-184`의 즉시·지연 인수 ack와 여러 busy 입력 결과 회귀;
[[apps/daemon/src/messaging.test.ts]] `apps/daemon/src/messaging.test.ts:613-736`의 Codex socket 대역·DB 실패 통합 검증.

AIOX MCP를 CLI `-c`로 주입한 실행에서 Codex 0.155.1의 제목 생성 helper는
`config.mcp_servers` 전체 table 아래 서버별 `{enabled:false}`만 보낸다. App Server는 이
요청 override를 기존 CLI override 뒤에 같은 계층으로 적용하면서 MCP table을 교체한다.
따라서 AIOX가 처음 주입한 URL 등이 사라지고, disabled 서버에도 transport를 요구하는
설정 파싱에서 `invalid transport in mcp_servers.aiox`로 거절된다. 초기 AIOX 설정의
transport 누락이나 MCP HTTP 연결·인증 실패가 아니다. [Status: Current gap]

격리된 같은 버전의 App Server 비교에서 CLI 주입을 URL·enabled별 `-c`로 나눠도 실패했다.
같은 설정을 `config.toml` 계층에 두면 재귀 병합으로 URL이 보존돼 수락됐고, helper 요청을
`mcp_servers.aiox.enabled=false` leaf override로 바꾸거나 URL까지 포함해도 수락됐다.
이 비교의 성공은 `thread/start` 설정 수락이며 제목 생성 완료를 뜻하지 않는다.

실제 TUI에서는 helper 실패 중에도 사용자 답변·turn 완료·AIOX idle을 확인했다. 모든 사용
경로의 무영향을 보장하는 근거는 아니다. 이 범위의 정상 사용을 근거로 사용자와 합의해
AIOX 보정은 적용하지 않고 자동 제목 생성 실패를 알려진 제한으로 유지한다. Relay의 내부
helper 제외와 일반 대화 추적은 설정 실패와 별개이며 helper의 MCP 설정을 변경하지 않는다.

주입 근거: launch.ts의 `packages/adapters/codex/src/launch.ts:82-87`.
병합·파싱 근거: Codex rust-v0.155.1의
[config manager](https://github.com/openai/codex/blob/rust-v0.155.1/codex-rs/app-server/src/config_manager.rs#L186-L196),
[CLI table 교체](https://github.com/openai/codex/blob/rust-v0.155.1/codex-rs/config/src/overrides.rs#L9-L14),
[transport 검증](https://github.com/openai/codex/blob/rust-v0.155.1/codex-rs/config/src/mcp_types.rs#L488).
실측·12조건 비교·유지 결정 출처: `logs/2026-09-09-AIOX-TUI-Stage4-Codex.md`의
2026-09-21 제목 helper 재현·근본 원인·보정 취소 기록.

근거: [[packages/adapters/codex/src/relay.ts]], [[packages/adapters/codex/src/binding.ts]],
[[packages/adapters/codex/src/relay.test.ts]], [[packages/adapters/codex/src/index.test.ts]].
Codex 0.153.4를 사용한 격리 TUI·App Server·daemon 실행에서 AIOX MCP 입력의 화면 처리,
DB `completed` 기록과 발신자 알림, 진행 중 `reasoning`·종료 후 `idle`을 확인했다.
별도 busy 입력 실측에서도 기존 TUI 작업 중 MCP 전송을 수락했고, 최종 화면 응답에 두 입력이
함께 반영된 뒤 해당 delivery의 DB `completed`와 발신자 알림을 확인했다. 이 재실측에서는
turn ID를 wire로 수집하지 않았으며 같은 turn ID 귀속은 앞선 wire 실측과 대역 회귀 근거다.
별도 격리 실행의 같은 진행 상태를 Web `/api/web/agents`는 `reasoning`, MCP
`agents_list`는 `working`으로 반환했다.
지원하지 않는 모델을 지정한 별도 App Server 임시 turn에서 `turn/started` 뒤
`turn/completed(status=failed, error=…)`를 직접 관측했다. 임시 Relay가 AIOX 시험 입력에만
같은 모델을 지정한 격리 실행에서도 MCP 전송은 수락됐고 해당 delivery가 DB에 `failed`와
오류 원문으로 기록됐으며 발신자 알림이 생성됐다. Runtime/Web/MCP는 turn 종료 후 `idle`을
유지했다. 별도 실제 TUI의 병렬 `exec_command` 두 건에서는 같은 thread/turn의 승인
request ID 두 개가 모두 해소 전 발생했고 Web `awaiting-user`·MCP `working`을 확인했다.
두 ID는 한 번의 화면 승인 뒤 모두 해소됐다. 한 ID만 해소되고 다른 ID가 남는 경로는
대역 회귀로 확인했으며 이 실제 TUI 실행에서는 발생하지 않았다.
active thread 선택 책임의 재사용 원본 코드·테스트 근거는 Git commit
`8db476bad722717bf82cc598904f3f33af8a90b3`에 보존돼 있다. 이전 구현 파일은 재구축 정리에서 삭제했다.

```sh
git show 8db476bad722717bf82cc598904f3f33af8a90b3:src/adapters/codex/proxy.ts
git show 8db476bad722717bf82cc598904f3f33af8a90b3:tests/unit/adapters/codex-proxy.test.ts
```

당시 proxy의 68–100, 156–200줄과 test의 27–100줄에 해당한다. 좁은 과거 코드/테스트 근거이며
그 자체로 새 구현의 검증이나 메시지 왕복 완료를 뜻하지 않는다.

입력은 [[docs/specs/aiox-collaboration]]의 채택에 따라 `toolOutput` 본문과
`additionalContext` 전달 메타데이터로 구성한다. 사용자 확인상 이 조합의 실험은 통과했다.
신규 AIOX 통합에서 실제 표시·입력 전달·회신을 E2E로 연결하며, 요구를 충족하지 못할 때만
원인을 확인하고 IDE delimiter+Cyan 또는 toolOutput 단독 등 후순위 후보를 검토한다.
후보 사이의 추가 우선순위는 정하지 않았으며 여러 fallback을 미리 구현하지 않는다.

현재 binding의 공통 입력 변환은 `codex_tui/send_message_to_thread`의 `toolOutput`에
`codex_delegation` wrapper를 사용한다. `source_thread_id`에는 표시용 발신자 이름,
`input`에는 전달 본문을 이스케이프해 넣는다. 이 표시용 필드는 실제 입력 대상 thread ID와
별개다. `additionalContext.aiox`는 untrusted 메타데이터로 발신자 name/role/description과
createdAt을 전달하며 내부 delivery ID는 포함하지 않는다. 일반 메시지와 AIOX 알림에 같은
변환을 적용한다. 근거: [[packages/adapters/codex/src/binding.test.ts]]
`packages/adapters/codex/src/binding.test.ts:1-37` 및 binding.ts의 codexInput.

완전한 wire의 필드 배치와 context 길이 제한·절단 위치는 추측으로 재구성하지 않는다.
Codex renderer의 고정 `Sent by Codex from task …` 문구를 유지하고 task 자리에 발신자
이름을 넣는 것이 채택한 표시 방식이다. 2026-09-21 교차 실측에서 Codex가 Haiku 메시지를
받을 때 task 이름은 `CrossHaiku`, AIOX 알림은 `AIOX`였으며, Claude 수신 화면은
`Message from @CrossLuna`였다. 고정 Codex 문구를 새 발신자 귀속 결함으로 분류하지 않는다.
이 표시는 exactly-once나 모델 action dedupe를 뜻하지 않는다.
출처: `logs/2026-09-09-AIOX-TUI-Stage4-Codex.md`의 2026-09-14 표시 규약 결정과
2026-09-21 기존 결정 재확인 기록.

## 공통 상태 저장과 전달 [Status: As-built]

양 adapter는 `RuntimeControls.setStatus(status, reason?)`로 현재 관측을 전달한다.
RuntimeRegistry는 `status/status_reason`을 보관하고 이유 생략을 null로 교체한다.
HTTP AgentView와 MCP agents_list는 같은 상태 필드를 소비하며 MCP schema는 AgentView의
공통 상태·메타데이터 필드를 재사용한다. Web은 상태와 이유를 함께 표시한다. 기존 event/observation 전달과 MCP
요약 함수는 제거했다. 외부 상태 의미는 [[docs/specs/aiox-runtime]]이 소유한다.

NetworkService의 목록 계산은 기존 membership·outbound route·등록 유효성을 유지하며
준비 중이라는 이유로 제외하지 않는다. MessageService는 준비 중 전송을 계속 거절하고
실제 입력 수락은 vendor binding이 검증한다. 종료·협업 해제 항목은 기존 등록 수명과 조회
필터로 제거하며 Host의 stopped 수명을 변경하지 않는다.

근거: [[packages/vendor/src/index.ts]] `packages/vendor/src/index.ts:37`, [[apps/daemon/src/runtimes.ts]] `apps/daemon/src/runtimes.ts:94`,
[[apps/daemon/src/networks.ts]] `apps/daemon/src/networks.ts:120`, [[apps/daemon/src/messaging.ts]] `apps/daemon/src/messaging.ts:377`, [[apps/daemon/src/mcp.ts]] `apps/daemon/src/mcp.ts:12`,
[[apps/daemon/src/http.ts]] `apps/daemon/src/http.ts:76`, [[packages/protocol/src/index.ts]] `packages/protocol/src/index.ts:173`, `apps/web/src/main.ts` (React 전환 전 검증 이력) `apps/web/src/main.ts:222`와
인접 runtimes/mcp/protocol/main 테스트의 현재 이유 교체·제거, 준비 중 표시·전송 거절 검증.

ClaudeObservations는 StopFailure의 오류 분류를 실패 이유로 보관하고 quota 대기를 별도로
투영한다. fired는 재개 관측을 기록하고 실패와 quota 대기를 해제한다. disabled는 해당
세션의 quota 대기와 재개 기록을 모두 제거한 뒤 남은 관측으로 상태를 재계산한다.
현재 실패는 보존하고 fired가 지운 과거 실패는 복원하지 않으며 delivery 결과는 변경하지 않는다.
세션 재개 활동은 검증된 transcript 종료 또는 StopFailure로 해소한다. 기존 delivery의
최초 결과는 유지하고 해당 요청 외 활동·대기를 지우지 않는다.
새 입력은 해당 세션 quota 대기를 해제한다. stale 상태에서 Enter로 제출되는 continuation도
새 사용자 입력으로 관측하므로, 재차 한도에 걸려도 이전 Enter 대기는 남기지 않는다.
Esc·Ctrl+C·취소 메뉴는 `quota_auto_resume_disabled`를 발생시키지 않는다.
설치본 Claude 2.1.278은 취소 시 `system/informational`, `level: notice`와
`Automatic continue cancelled · /rate-limit-options to re-arm` 내용의 알림을 transcript에
추가한다. 이 정확한 알림으로 해당 instance의 quota 대기·재개 기록만 해제하고 최초 outcome은
유지한다. 일반 사용자 텍스트·다른 session·폐기된 instance는 취소 근거가 아니다.
근거는 설치본의 quota UI producer `MQt` → `Wt`/`c0` → transcript 저장
`MJe.record` → `EE`/`insertMessageChain` 경로다. 공개된 영구 호환 계약이 아니며
실제 quota TUI 실측을 대신하지 않는다. 알림 본문은 인과 chain의 보관 대상에 추가하지 않는다.
대기 이유는 등록 시 저장해 공통 상태 투영 시 별도 event 번역이 필요하지 않다.
`cloud_credential_error`를 공식 오류 값으로 인식한다. 인증 hook을 주입하는
통합 테스트는 ClaudeBinding→Registry→Web API/MCP의 상태·이유 일치와 원 delivery 결과·알림
보존을 검증한다. 공식 Notification 문서 기반 구현·대역 테스트이며 실제 quota hook의 발생
순서와 실제 화면 표시는 미실측이다. fired → disabled 입력 시 재개 기록이 남지 않는다는
검증도 코드 테스트이며 실제 발생 순서의 근거가 아니다.

근거: [[packages/adapters/claude/src/claude-observations.ts]] `packages/adapters/claude/src/claude-observations.ts:181`와 인접
[[packages/adapters/claude/src/claude-observations.test.ts]] `packages/adapters/claude/src/claude-observations.test.ts:310`, `packages/adapters/claude/src/claude-observations.test.ts:657`,
[[apps/daemon/src/agent-controller.test.ts]] `apps/daemon/src/agent-controller.test.ts:736`의 common HTTP MCP send 테스트.
[공식 Notification/StopFailure 문서](https://code.claude.com/docs/en/hooks#notification)는
알림 의미와 오류 분류의 근거이며 설치된 vendor의 실제 발생을 증명하지 않는다.

CodexBinding은 delivery 결과와 현재 선택 thread의 최신 turn 실패를 분리해 보관한다.
다음 turn 시작으로 해당 thread 실패를 해제하며 이전 turn의 늦은 완료는 최신 상태를 덮어쓰지
않는다. 오류 message와 제공된 codexErrorInfo를 상태 이유에 표시하고 delivery 오류는 기존
message를 유지한다. 준비 완료 시 실제 관측 상태를 한 번 보고하며 중간 idle 보고는 없다.
준비 통지와 타이머 해제는 기존 onReady 소비자가 유지한다. 연결 실패는 별도 연결 관측으로 보존해 turn 시작이 지우지 않게 한다.
근거: [[packages/adapters/codex/src/binding.ts]] `packages/adapters/codex/src/binding.ts:170`, [[packages/adapters/codex/src/index.test.ts]] `packages/adapters/codex/src/index.test.ts:24`.
이 변경의 근거는 소켓 대역 회귀이며 앞선 과거 실측을 새 status 표시 실측으로 확대하지 않는다.

Relay는 `mcpServer/elicitation/request`를 Binding으로 전달한다. Binding은 기존 요청별
대기 저장소에 nullable turnId를 보존하며 선택 thread와 요청 수명을 분리한다.
turn 귀속이 있는 요청은 진행 중 turn과 대조하고 종료 시 정리하며, nullable 요청은
현재 turn을 채워 넣지 않고 threadId/requestId의 resolved로만 해소한다.
외부 상태 수명은 runtime spec의 공통 상태 계약을 따른다. 근거는 relay.ts의 observedMethods,
binding.ts의 pending 처리와 index.test.ts의 소켓 대역 시나리오다. 복수 요청의 개별 해소,
turn 종료·시작과 대화 왕복 뒤 nullable 대기 보존, 다른 thread의 동일 요청 ID 해소 격리,
종료 turn의 늦은 요청 차단을 검증한다.

Codex 0.153.4의 격리 실제 실행에서는 임시 stdio MCP의 boolean form 요청, TUI의
True 제출, 서버 반환 `action=accept`·`confirmed=true`, 같은 thread/requestId의 resolved와
turn completed를 확인했다. HTTP/MCP는 awaiting-user→working→idle/null로 일치했고
TUI 입력 화면·Web 대기 표시 및 완료 뒤 이유 제거도 캡처했다. 이 요청의 turnId는
null이 아니므로 nullable 수명의 실측 근거는 아니다. 첫 시도는 시험 MCP SDK의 기본
60초 타임아웃 후 사용자가 제출해 resolved·idle로 끝났으며 정상 입력 반환 성공과 구분한다.
근거: `/private/tmp/aiox-elicitation-live-YzLPwZ`의 events/status/lists.jsonl,
request-retry.png·success.png와 `/private/tmp/aiox-elicitation-server-events.jsonl`.

추가 실제 browser 검증에서 작업 중·Plan 질문창의 Esc 뒤 interrupted와 idle/null,
idle 대화의 /new·/resume·선택 취소, 복수 승인 중 첫 요청만 resolved된 동안
awaiting-user 유지와 두 번째 해소 뒤 working→completed→idle/null을 확인했다.
Default async 질문은 completed 뒤 글머리표만 남아 선택 UI 제출은 검증하지 못했다.
격리 App Server를 종료하면 내부 실패 보고 뒤 Agent가 목록에서 제거되고 shell로 복귀했다.
같은 shell의 재실행은 새 Runtime으로 preparing→idle을 확인한 것이며 동일 Runtime의
자동 재연결 근거가 아니다. 근거: `/private/tmp/aiox-w2-live-XjC36P`의 events/status/lists.jsonl과
interrupted.png·plan-cancel.png·picker-cancel.png·resumed.png·approval-after-first.png·
async-ended.png·app-server-lost.png·restarted-idle.png.

### 남은 관측 경계 [Status: Current gap]

Codex nullable MCP elicitation의 실제 발생·해소는 미실측이며 추가 실측은 사용자 지시로
생략한다. 실패한 대화의 선택/취소, async 종료 후 선택 UI 제출, 자연 발생 한도 payload와
control WS 등 App Server 종료 이외 연결별 실제 복구는 미확인이다. 기존 Claude
transcript copy 이동·production relocation 전체 통합·다른 OS 검증과 Codex 제목 helper config gap도 남아 있다.

## 관측과 사용자 응답 경계

| 목적 | Codex | Claude |
| --- | --- | --- |
| 입력 | turn/start 응답의 runtime 입력 수락 | transcript peer origin·이름·본문 / session·prompt 연결 |
| 응답 종료/실패 | turn/completed 상태·error | 직접 감시로 읽은 transcript chain / StopFailure |
| 승인 | commandExecution/fileChange/permissions requestApproval | registry waiting/waitingFor |
| 질문 | item/tool/requestUserInput, mcpServer/elicitation/request | registry waiting/waitingFor |
| 해소 | serverRequest/resolved(threadId/requestId) | registry busy/idle 전환 |
| 사용량/재개 | account/rateLimits/read·updated | quota_auto_resume_fired/stale/disabled |

이 Codex 0.155.1 / gpt-6-astra의 실제 비동기 질문 UI는 별도 경로였다. 실측한
`request_user_input_async`는 `item/started`·`item/completed`의 `agentMessage`에
`delivery=async`와 questions를 담았고 `item/tool/requestUserInput`은 발생하지 않았다.
질문을 미응답으로 둔 채 작업과 turn 완료가 진행됐으며 AIOX는 working → idle로 표시했다.
이후 TUI에서 답하면 같은 thread의 새 turn이 시작됐다. 따라서 접힌 질문 UI만으로 승인·질문
대기 RPC나 AIOX awaiting-user 상태를 추정하지 않는다. 다른 질문 경로에 이 결과를 일반화하지
않는다. 실측 출처: `logs/2026-09-09-AIOX-TUI-Stage4-Codex.md`의 2026-09-21 Astra
비동기 질문 재현 기록.

표는 공식 문서 조사 기반의 연결 후보를 포함하며 전체 live wiring 검증표가 아니다.
별도 daemon WS에 모든 TUI server request가 broadcast된다고 가정하지 않는다. 관측 위치는
Relay/연결 구성에서 정하고 사용자는 TUI에서 응답하며 daemon과 TUI가 같은 요청에 이중 응답하지 않는다.
resolved는 취소·정리도 포함해 승인 성공과 같지 않다.

Claude permission_prompt는 지연될 수 있어 즉시 관측에 PermissionRequest를 고려한다.
StopFailure의 rate_limit을 session/weekly limit과 일대일로 단정하지 않고 account_on_hold·billing_error도
별도 오류로 유지한다. 일반 도구 오류를 Runtime 실패나 AIOX delivery 실패로 수집하지 않는다.
process exit·연결 손실은 hook 외의 handle에서도 관측한다. reasoning 전체 저장은 요구하지 않는다.
알림 projection과 읽음/포커스는 [[docs/architecture/aiox-storage-terminal]]이 소유한다.

Sources: `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §5–§6, §8–§18.
