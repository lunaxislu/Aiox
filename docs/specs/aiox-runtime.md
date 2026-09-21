# AIOX Runtime Contract

Status: Committed target

이 문서는 AIOX가 관리하는 실행의 시작·종료·조회와 CLI 표면을 소유한다. 아래 계약은 승인된
TUI 제품 목표이며 현재 코드·parser·플랫폼 통합이 구현 완료됐다는 뜻이 아니다.
통신은 [[docs/specs/aiox-collaboration]], Host와 Network는 [[docs/specs/aiox-host]],
설정·운영 화면은 [[docs/specs/aiox-configuration-web]]이 소유한다.

## 실행과 사용자 상호작용

지원 대상은 Claude Code TUI와 Codex TUI다. 모델 선택, quota 확인, slash command,
승인·질문과 vendor 설정은 기존 TUI를 사용한다. AIOX는 이 UX를 headless 화면으로 복제하지
않으며 Claude Agent SDK·`-p`·headless surface·다른 vendor는 현재 범위에서 제외한다.

```text
AgentRuntime — 한 실행의 협업 등록과 관측
├─ vendor 실행·binding (Codex는 TUI와 App Server 포함)
├─ 현재 vendor conversation
└─ 실행 위치
   ├─ daemon 소유 → 직접 소유 PTY 또는 차용 shell → Web attachment
   └─ 외부 CLI 소유 → 사용자 터미널의 stdin/stdout/stderr 상속
```

AgentRuntime은 PID 하나나 vendor conversation ID가 아니다. 같은 이름·manifest를 다시
실행하면 새 Runtime 신원과 credential을 사용한다. Claude 같은 프로세스에서 `/clear` 또는
`/resume`으로 대화가 바뀌어도 Runtime/PTY가 새 실행이 되는 것은 아니다. 다른 프로세스의
`--resume`은 새 실행이다. 브라우저 종료·pane 해제·연결 손실은 Agent 종료 요청이 아니다.

Daemon이 materialized Runtime·Network·route의 권위를 갖고 실행 소유자가 프로세스 수명을
소유한다. CLI/Web/MCP는 등록 상태를 직접 덮어쓰지 않는다. Adapter는 vendor 실행·입력·관측·정리
차이를 흡수한다. 같은 adapter는 Web·외부 실행에서 동일한 vendor 연동 의미를 제공하며,
실행 위치별 소유권은 adapter 선택과 독립적이다. 새 vendor에 Claude inbox나 단일 프로세스 구성을
요구하지 않는다. 실제 프로세스 배치와 공유 계약은 [[docs/architecture/aiox-vendor-bindings]]가 소유한다.

| 명령과 인증된 실행 위치 | 실행 소유자 | 사용자 화면 |
| --- | --- | --- |
| 어디서든 `host run` | daemon | Web |
| Web shell의 `agent run` | daemon | 기존 Web terminal, 종료 후 같은 shell |
| 외부 터미널의 `agent run` | CLI | 사용자 터미널, 종료 후 같은 shell |

외부 실행에는 AIOX PTY·headless·xterm·Serialize를 생성하지 않는다. 실행 소유권은 terminal
차용 관계나 Network membership과 별개다. 외부 실행은 협업 등록이 유효해도 Web 목록·알림과
Web terminal 생성·조작·이관 대상에서 제외한다. Web 표시 범위는
[[docs/specs/aiox-configuration-web]]을 따르며 선택 이유는
[[docs/decisions/execution-ownership]]을 따른다.

## 시작·준비·상태 조회

- daemon은 API·Web listener와 상태 파일 기록까지 필수 시작 준비를 끝낸 뒤 running과 CLI 시작 성공을 공개한다. 준비 중 HTTP와 WebSocket 연결 요청은 503으로 거절하며, 중간 실패는 확보한 listener·DB를 정리하고 시작 실패로 보고한다. [Status: Current]
- `daemon restart`는 새 config를 사용한다. 설정·shell/cwd·실행 준비의 가능한 검증과 기존 실행 포트 대비 변경 안내를 일반 stop 전에 끝낸다. 준비 실패는 기존 daemon을 유지하며, 준비에 사용한 설정으로 새 실행을 시작한다. 새 API 포트에서 기록된 기존 daemon과 다른 daemon의 응답이 확인되면 어느 쪽도 종료하지 않고 거절한다. 이전 CLI 포트 override는 자동 유지하지 않는다. 일반 stop의 OS별 거절·종료 정책은 아래 종료 계약을 따른다. [Status: Current]
- `daemon status`는 상태 파일의 실행 포트가 있으면 다음 실행 config 검증 없이 그 daemon을 조회한다. `doctor`도 기록 포트를 우선하며 config 오류를 별도 진단으로 보고한다. 기록이 없을 때 설정에서 조회 포트를 찾는다. 파일·PID 존재만으로 실행 준비를 확정하지 않는다. [Status: Current]

근거: [[apps/cli/src/bootstrap.ts]] `apps/cli/src/bootstrap.ts:244-358`, `apps/cli/src/bootstrap.ts:382-464`; 재시작 준비·설정 변경과 잘못된 다음 설정 회귀는 [[apps/cli/src/bootstrap.test.ts]] `apps/cli/src/bootstrap.test.ts:200-368`, `apps/cli/src/bootstrap.test.ts:777-805`.

시작 준비·실패 정리 근거: [[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:153-167`, `apps/daemon/src/daemon.ts:252-283`, `apps/daemon/src/daemon.ts:719-728`; [[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:55-177`, [[apps/daemon/src/bootstrap.test.ts]] `apps/daemon/src/bootstrap.test.ts:75-86`.

- Standalone `agent run`은 foreground다. 사용자는 Ctrl+C·`/exit` 등 해당 세션에서 종료한다.
  별도 standalone agent stop/attach/detach 명령은 현재 범위에 없다.
- 프로세스 생성과 binding 준비를 구분한다. 단순 PID·socket 파일 존재만으로 준비 성공을
  표시하지 않는다. 시작 실패와 관측할 수 없는 상태를 정상 실행으로 숨기지 않는다.
- 외부 시작은 daemon 연결·등록 준비 성공 뒤 vendor를 실행한다. 사전 연결 실패는 vendor
  실행 전 오류다. 명시적 초기 협업 실패(`startup-failed`, 최초 협업 준비 timeout 포함)는
  원인을 표시하고 협업 등록을 해제하되 이미 시작한 vendor·필수 부속 실행은 유지한다.
  daemon·제어 WS 손실도 준비 완료 전후와 무관하게 같은 실행 생존 경계를 따른다.
  CLI는 실제 vendor 종료까지 입출력과 로컬 종료 관리를 유지하고 그 종료 결과를 반환한다.
  이 경계는 vendor 공통이며 Codex 실제 실행 통합 완료를 뜻하지 않는다. [Status: Current]
  근거: [[apps/cli/src/external.ts]] `apps/cli/src/external.ts:171-177`,
  [[apps/cli/src/external.test.ts]] `apps/cli/src/external.test.ts:147-188`.
- CLI `doctor` 기본 출력은 Node·실행 환경·설정·Git·daemon의 진단 요약이며 `--json`은 구조화된 상세 결과다. 설정 오류와 daemon 연결 실패를 별도로 표시한다. 일반 shell의 종료 거절·정리 실패는 작업 경로와 식별 ID를 함께 제공한다.
- Claude Peer 최소 지원 버전 미만은 실행 실패다. 지원 버전에서 inbox 준비가 실패해도
  실패를 표시하며 Channel fallback을 실행하지 않는다. 준비 확인용 모델 호출·ACK를 강제하지 않는다.
- 업데이트가 정상 준비 전에 실행을 종료시킨 경우 등록 성공으로 표시하지 않는다. 사용자가
  업데이트를 처리하고 다시 실행하도록 하며 자동 업데이트·Host 재실행 orchestration을 추가하지 않는다.
  백그라운드 업데이트라는 이유만으로 이미 준비된 Runtime을 실패 처리하지 않는다.
- Agent 목록과 MCP `agents_list`는 daemon이 관측한 `status`를 제공한다. 모델이 자기 상태를
  임의 선언하는 필드가 아니다. MCP의 목록 범위는 collaboration 계약을 따른다.
- 프로세스 생존, binding 준비, 작업 활동, 사용자 입력 대기, 리밋·오류와 종료 관측을
  구별할 수 있어야 한다. 일반 vendor 도구 실패 하나를 Runtime 전체 실패로 승격하지 않는다.
- Agent 이름은 참여 Network 안에서 유일해야 한다. 이름 미지정 시 새 Runtime ID를 이름으로
  사용한다. 준비 중 등록을 포함해 같은 이름이 있으면 새 등록을 거절하며, 서로 다른 Network의
  같은 이름은 허용한다.
- 일반 Agent 조회는 이름/ID/Host-qualified 이름을 받는다. Network 범위 없이 조회해 여러
  활성 Runtime에 걸친 이름이면 모호성 오류를 반환하고 각 후보의 이름·Network 이름을 한 번만 표시한다. 후보 목록에 Runtime ID를 출력하지 않는다. `/`는 qualified 이름 구분자이므로 Host/Agent/Network
  사용자 이름에 허용하지 않는다.

CLI `agent list`는 Agent 이름·상태·role·Network 이름을 간결하게 표시한다. `agent show`는 설명과 현재 상태의 이유까지 표시한다. 이름 미지정 Agent의 이름은 Runtime ID이며, API/JSON은 내부 ID와 표시용 Network 이름을 함께 제공한다.

Web과 `agents_list()`는 동일한 `status`와 `status_reason`을 사용한다.

| status | 관측 의미 |
| --- | --- |
| `aiox-preparing` | AIOX 실행·연결·현재 대화 준비 중 |
| `idle` | 현재 진행 중인 작업·미해결 대기가 없음 |
| `working` | 작업 진행 중; 추론·도구 실행은 현재 이유로 구분 |
| `awaiting-user` | 명시적으로 관측된 사용자 입력·승인 대기 |
| `failed` | 관측된 최종 응답 실패 또는 AIOX 연결 실패 |

`status_reason`은 현재 상태의 이유이며 없는 정보는 `null`이다. adapter가 vendor 관측을
해석하고 양쪽 소비자는 같은 값을 표시한다. 새 이유로 교체하고 이유가 없으면 이전 이유를
제거한다. vendor hook/event 이름을 그대로 공통 이유로 표시하지 않는다.
Agent 조회의 `observation_error`는 관측 연결·읽기의 실패 진단이며 정상일 때 `null`이다.
현재 session의 `status`·`status_reason` 및 delivery 결과와 분리한다. 옛 session의 읽기 실패도
사용자에게 드러내되 현재 session 상태를 실패로 바꾸지 않는다. Web은 진단을 상태 옆에, CLI는
상세 조회에 표시하며 관측 복구 시 제거한다. 근거: [[apps/daemon/src/runtimes.test.ts]]
`apps/daemon/src/runtimes.test.ts:6-28`, [[apps/web/src/main.test.ts]]
`apps/web/src/main.test.ts:1024-1060`. [Status: Current]

상태, 메시지 전송 가용성, 개별 delivery 결과는 별개다. 준비 중도 허용된 목록 범위에 노출하되
준비 전 send는 거절한다. `failed`만으로 모든 전송을 차단하지 않는다. Agent에는 `stopped`가
없으며 종료한 Agent는 목록에서 제거한다. Host 항목의 `stopped`는 Host 계약을 따른다.

Codex의 최종 실패는 `turn/completed`의 `turn.status=failed`로 판정한다. 오류 message와
실제로 제공된 codexErrorInfo 분류·HTTP 코드를 이유로 표시하며, 오류 이름에서 실패 지속성이나
회복 시점을 추정하지 않는다. 같은 대화의 다음 `turn/started`에서 이전 turn 실패를 해제한다.
대화 선택 성공 시 그 대화의 상태를 표시하며 선택 취소·다른 turn의 늦은 이벤트로 현재 실패를
해제하지 않는다. 연결 실패는 turn 시작 대신 연결 준비 복구 관측으로 해제한다.
비동기 질문만으로 사용자 대기나 turn 종료를 추정하지 않는다. 명시적 대기 없이 진행 중이면
`working`, completed/interrupted로 종료되면 `idle`이며 늦은 도구 완료로 다시 진행 상태를 만들지 않는다.

Codex의 명시적 입력 요청은 threadId/requestId별로 추적하며 현재 대화의 미해결 요청은
`working`보다 우선해 `awaiting-user`로 표시한다. `serverRequest/resolved`는 해당 요청만
해제한다. turnId가 있는 요청은 해당 turn 종료에도 정리하고 종료된 turn의 늦은 요청으로
대기를 복원하지 않는다. MCP elicitation의 `turnId: null`은 현재 turn에 임의 귀속하지 않으며
turn 종료·새 turn 시작으로 해제하지 않는다. 대화 전환은 표시 대상만 바꾸고 이전 대화의
미해결 요청을 보존한다. nullable 요청은 resolved를 관측하기 전까지 해당 대화의 대기로 남는다.

Claude는 세 hooks(SessionStart·StopFailure·Notification)와 registry·transcript 파일 직접 감시를 사용하며 Codex RPC를 적용하지 않는다.

초기 registry에 `status`가 없으면 `idle`로 간주하거나 관측 오류로 처리하지 않고
`aiox-preparing`을 유지한다. 현재 선택 session과 일치하는 유효한 status를 관측해야
준비를 완료한다. 별도로 관측한 quota 입력 대기가 없을 때 `busy`는 `working`, `waiting`은 `awaiting-user`, `shell`은
`working`과 “Bash 작업이 남아 있습니다.”라는 이유로 표시한다. `idle`은 별도로
관측한 실패가 있으면 `failed`, 없으면 `idle`이다. registry 활동 상태는 개별 요청의
완료·실패 결과를 변경하지 않는다.

| Claude 관측 | 상태 반영 |
| --- | --- |
| `StopFailure` | 현재 instance의 실패 이유를 보관하고 registry가 idle일 때 `failed`로 표시. `rate_limit`을 세션/주간 한도로 임의 번역하지 않으며 `cloud_credential_error`를 보존 |
| `quota_auto_resume_fired` | 이전 실패·quota 대기 이유를 해제. busy/waiting/idle/shell은 현재 session의 registry로 표시 |
| `quota_auto_resume_stale` | `awaiting-user`; 자동 재개를 위해 Enter 입력을 기다린다는 이유 표시 |
| `quota_auto_resume_disabled` | 해당 세션의 quota 대기·자동 재개 기록을 해제한 뒤 상태 재계산. 현재 남은 실패·이유는 보존하고 이미 해제된 과거 실패는 복원하지 않음 |

현재 registry가 idle이고 다른 대기가 없을 때 StopFailure → stale → disabled는 현재 실패가 남아 `failed`이고,
StopFailure → fired → disabled는 fired가 실패를 해제했으므로 `idle`이다. disabled가 새 실패를
만들거나 기존 delivery 결과를 변경하지 않는다. 이 순서의 상태 계약과 코드 테스트는 실제
hook 발생 순서를 관측했다는 뜻이 아니다.

자동 재개 뒤 해당 요청의 검증된 transcript 종료 chain은 재개 활동을 해제하고 상태를
재계산한다. 재개 후 StopFailure는 현재 실패와 실제 이유를 반영한다. 이미 확정한 delivery
결과는 다시 쓰지 않는다. AIOX는 Stop을 완료 관측으로 사용하지 않으며 사용자 Stop hook의
후속 작업은 같은 요청으로 추적한다. 정상 Stop 경로는 시작 시 hook 설정과 무관하게 해당
turn의 종료 근거를 관측하며 continue:false/stopReason도 상태 종료로 취급한다. 이는 업무의
의미적 성공 평가가 아니며 판정 근거는 collaboration의 요청 종료 계약을 따른다.
종료는 그 요청의 활동·대기만 해소한다. 다른 활동이 남으면 working/awaiting-user를 유지하며
늦은 이전 결과가 현재 상태를 덮지 않는다.
quota 취소가 transcript의 vendor system 알림으로 확인되면 해당 session의 quota
대기를 해제한다. 취소 자체로 개별 요청 결과를 변경하거나 과거 실패를 복원하지 않는다.
registry의 `idle`이나 원시 Esc 키 입력만으로 취소를 추론하지 않는다.

새 transcript 사용자 입력은 해당 세션의 이전 quota 대기를 제거하며 fired 동반을 요구하지 않는다.

Claude의 quota 이외 승인·질문 대기는 현재 session registry의 waiting 및 waitingFor로 표시한다. quota hook 전이는 [공식 hook 문서](https://code.claude.com/docs/en/hooks#notification)에
따른 계약이다. 실제 quota hook 발생 순서·화면 표시를 실측 완료로 간주하지 않는다.
구현과 vendor별 검증 범위는 [[docs/architecture/aiox-vendor-bindings]]를 따른다.

Web도 daemon이 살아 있는 동안 최초 협업 준비 실패·timeout·협업 해제만으로 이미 시작한
vendor·필수 부속 실행을 종료하지 않는다. 협업 실패에서는 협업 권한을 해제하되 daemon의
실행 등록·종료 관리는 유지하고, 터미널 사용 가능 여부와 AIOX 협업 끊김을 구분해 표시한다.
화면 중계 연결 자체가 끊겨도 같은 실행과 daemon의 관리 등록을 유지한다. 기존 terminal의
`다시 연결`은 동일 vendor의 화면·키보드 연결을 복원하고, `vendor 정리`는 그 실행과 필수
부속 자원을 종료한 뒤 등록을 정리한다. 화면 복구를 MCP 재등록이나 vendor 재생성으로
확대하지 않는다. 프로세스 자체 종료·실행 전 검증 실패·명시적 사용자 종료는 연결 손실과
별개이며 죽은 실행을 사용 가능으로 표시하지 않는다. daemon 종료·force의 기존 소유권 정책은
유지한다. [Status: Current]

근거: [[apps/daemon/src/agent-controller.ts]] `apps/daemon/src/agent-controller.ts:163-184`,
`apps/daemon/src/agent-controller.ts:228-252`; [[apps/daemon/src/agent-controller.test.ts]]
`apps/daemon/src/agent-controller.test.ts:1722-1889`; [[apps/web/src/main.test.ts]]
`apps/web/src/main.test.ts:864`. 실제 macOS Web·PTY 검증 범위는
[[docs/architecture/aiox-storage-terminal]]의 화면 중계 복구 근거를 따른다.

개별 요청의 completed/failed/interrupted와 자동 알림은 [[docs/specs/aiox-collaboration]]이 소유한다. 현재 상태와 요청 결과는 별개이며 상세 Web 표시는 [[docs/specs/aiox-configuration-web]]을 따른다.

## 종료와 daemon 수명

명시적 CLI 종료는 실행 소유권을 먼저 구분하고 daemon 소유 실행에만 실행 환경과 force 정책을 적용한다. 외부 `agent run claude/codex`의 vendor·필수 부속 실행은 모든 OS의 일반 stop·force에서 유지하고 협업 등록만 해제한다.

| 요청 | 종료 정책 |
| --- | --- |
| macOS/Linux/WSL daemon의 일반 stop | daemon 소유 등록 실행이 있거나 일반 shell이 busy/unknown이면 거절. idle shell은 종료; 외부 참여는 blocker가 아님 |
| Windows native daemon의 일반 stop | idle 검사 없이 daemon 소유 실행 종료; 외부 실행은 협업만 해제 |
| 모든 환경의 stop --force | 작업 상태와 관계없이 daemon 소유 실행 강제 종료; 외부 실행은 협업만 해제 |

일반 shell의 idle은 AIOX가 처음 만든 shell의 입력 대기와 남은 작업으로 판정한다. 안쪽 shell의
idle은 추적하지 않으며 자식 shell이 입력 대기 중이어도 바깥 shell의 작업이다. 이전 출력,
변경한 cwd와 Enter 전 입력은 blocker가 아니고 미제출 입력은 종료 시 버린다. Agent의 입력 대기는
빈 일반 shell이 아니라 실행 중인 세션이다. POSIX의 확인 실패를 강제 종료로 대체하지 않는다.
Windows daemon이 wsl.exe를 실행해도 Windows 정책을 따르며 안쪽 WSL 작업도 중단될 수 있다.

일반 stop과 force는 신규 실행·기존 Web 입력을 먼저 차단하고 진행 중 등록과 동기화한다.
거절·정리 실패로 daemon이 남으면 접수를 복구한다. 일부 shell만 종료된 뒤 실패할 수 있으며
이때 stop_incomplete와 남은 자원을 보고한다. restart는 같은 일반 stop 뒤 start하므로 Windows에서는
작업을 중단할 수 있고, POSIX에서는 blocker가 있으면 거절한다. restart --force는 제공하지 않는다.
Windows 일반 stop의 작업 중단은 CLI 도움말과 사용자 문서에 명시한다.

```text
daemon stop --force (Windows 일반 stop도 같은 종료 대상)
→ 신규 입력·등록·실행·메시지 전달 차단
→ daemon 실행 owner 종료 + 외부 실행의 협업 해제
→ daemon 소유 foreground·필수 부속 실행·자원 정리 확인
→ credential·membership·route·요청 정리
→ 완료하면 daemon 종료 / 미완료면 stop_incomplete와 재시도 경로 유지
```

종료는 관리 실행 handle과 소유 관계를 기준으로 한다. 사용자 부모 shell, 무관한 vendor·터미널 앱을
이름으로 찾아 종료하지 않는다. WSL 배포판 전체 shutdown으로 무관한 실행을 종료하지 않는다.
일반 작업 자식 전체의 추적·종료를 보장하지 않으며 입력/신호 전송을 실제 종료 확인으로 간주하지
않는다. daemon 소유 실행의 종료 완료는 foreground만이 아니라 실행 owner의 필수 부속 실행과
자원 정리까지 확인한다. 확인 실패는 성공으로 처리하지 않고 daemon·Web 및 재시도 정보를 유지한다.
Persistent Network 정의·Worktree·저장 파일은 삭제하지 않는다. Host 항목 수명은
[[docs/specs/aiox-host]]를 따른다.

일반 stop·force뿐 아니라 SIGINT/SIGTERM, 비정상 종료와 예기치 않은 제어 연결 손실에서도
이미 시작한 외부 vendor·필수 부속 실행을 유지한다. 협업 등록은 해제하고
관측 상실을 종료 성공으로 해석하지 않는다. 자동 재연결·재등록은 없으며 협업 복구는 agent run
재실행이다. 이미 등록 해제된 실행을 후속 force가 탐색해 종료하지 않는다. 외부 vendor 종료 후 CLI는
등록 정리 실패를 보고하되 그 실패 때문에 shell 복귀를 막지 않는다.

MCP 연결 실패는 호출측에서 협업 불가를 진단하며 vendor 실행을 종료하지 않는다. 꺼진 서버의
오류 응답을 전제하지 않으며 서버 종료를 확인하지 못한 연결 실패는 원인을 단정하지 않는다.

종료 계약의 교정 근거는 [[docs/decisions/external-execution-survival]]을 따른다.
구현·검증 범위는 [[docs/architecture/aiox-storage-terminal]]을 따른다. Stage2-2 검증은 당시
정책의 근거이며 이번 교정의 source·회귀·통합 검증은
`logs/2026-09-12-AIOX-W1-External-Execution-Survival.md`에서 별도로 판정한다.

## 일반 shell과 Agent 연결

일반 shell terminal은 Agent 없이 생성·조회·입출력 연결할 수 있다. 작업 경로를 유지하며
credential·Network membership을 발급하지 않는다. shell에서 `claude`·`codex`를 직접 실행해도
자동 Agent 등록하지 않는다. 공개 shell adapter나 `aiox agent run shell`을 추가하지 않고,
AIOX 메시지 본문을 shell 명령으로 주입하지 않는다.

```text
daemon 소유 일반 shell PTY
 → 그 shell에서 aiox agent run → 같은 terminal에 새 Agent Runtime 연결
 → vendor 종료 → Agent 등록·credential·membership·관련 활성 route 정리
 → 같은 shell·terminal ID 유지
```

Runtime이 빌린 shell은 Agent 종료로 종료하지 않는다. 직접 소유 PTY·binding 자원은 종료를
확인한 뒤 정리한다. 같은 terminal에는 동시에 하나의 Agent만 연결하고, 다음 실행은 새 Runtime과
credential을 사용한다. 이전 요청 결과·알림은 collaboration 계약의 원 Runtime에 남는다.

기존 terminal 연결은 내부 실행 문맥을 검증하며 terminal ID만으로 연결·Agent 신원을 주장할 수
없다. 문맥이 없으면 외부 CLI 소유 실행이며, 잘못된 내부 문맥을 외부 실행으로 우회하지 않는다.
사용자 로그인·토큰 입력 UX는 추가하지 않는다.
terminal 자체가 종료되면 연결 Agent도 정리한다. 마지막 Agent 종료로 daemon은 자동 종료하지
않으며 `daemon stop --force`는 daemon이 직접 관리하는 일반 shell PTY도 정리한다.

## CLI 표면

아래 전체 트리가 목표 명령 표면이다. `--` 이후는 adapter에 전달한다. AIOX 지침 옵션은
단수 `--instruction`이며 복수형 호환 alias를 추가하지 않는다. vendor의 고유 필드명은
바꾸지 않는다. Network 옵션은 단일 값이며 반복 지정은 거절한다.

```text
aiox
├─ daemon
│  ├─ start
│  ├─ stop [--force]
│  ├─ restart
│  └─ status [--json]
├─ adapter
│  ├─ install <package>
│  ├─ uninstall <adapter>
│  ├─ list
│  ├─ show <adapter>
│  ├─ setup <adapter> [-- <adapter-options>]
│  └─ doctor [adapter]
├─ agent
│  ├─ run <adapter>
│  │  ├─ --name <name>
│  │  ├─ --network <network>                 # 하나만 선택
│  │  ├─ --role <role>
│  │  ├─ --description <description>
│  │  ├─ --instruction <instruction>
│  │  └─ -- <adapter-options>
│  ├─ list [--network <network>] [--host <host>] [--all] [--json]
│  └─ show <agent> [--json]
├─ network
│  ├─ create <name>
│  ├─ delete <network>
│  ├─ list [--all] [--json]
│  ├─ show <network> [--json]
│  ├─ block <network>
│  │  ├─ --between <agents...>
│  │  └─ --from <agent> --to <agents...>
│  ├─ unblock <network>
│  │  ├─ --between <agents...>
│  │  └─ --from <agent> --to <agents...>
│  └─ reset <network>
│     ├─ --between <agents...>
│     └─ --from <agent> --to <agents...>
├─ host
│  ├─ run [--path <directory>] [--file <yaml>]
│  │  ├─ --layout <auto|left-main|top-main|grid>
│  │  ├─ --columns <n>
│  │  └─ --rows <n>
│  ├─ list [--json]
│  ├─ status [hostname] [--path <directory>] [--file <yaml>] [--json]
│  ├─ stop [hostname] [--path <directory>] [--file <yaml>]
│  ├─ restart [--path <directory>] [--file <yaml>]
│  ├─ delete [hostname] [--path <directory>] [--file <yaml>]
│  ├─ agent
│  │  ├─ start <agent-names...> [--path <directory>] [--file <yaml>]
│  │  ├─ stop <agent-names...> [--path <directory>] [--file <yaml>]
│  │  └─ restart <agent-names...> [--path <directory>] [--file <yaml>]
│  └─ network
│     ├─ list <host> [--json]
│     ├─ show <host> <network> [--json]
│     ├─ block <host> <network> [--json]
│     │  ├─ --between <agents...>
│     │  └─ --from <agent> --to <agents...>
│     ├─ unblock <host> <network> [--json]
│     │  ├─ --between <agents...>
│     │  └─ --from <agent> --to <agents...>
│     └─ reset <host> <network> [--json]
│        ├─ --between <agents...>
│        └─ --from <agent> --to <agents...>
├─ status [--json]
└─ doctor [--json]
```

Host 실행·Agent 명령은 `--path <directory>`와 `--file <yaml>`로 대상 YAML을 선택한다.
경로 생략은 현재 디렉터리이며 파일 미지정 시 `aiox.yaml`/`aiox.*.yaml` 후보가 하나일 때만 선택한다.
복수 후보는 CLI 안내 후 실행하지 않는다.
CLI·YAML·전역 config는 모두 입력 검증 시 grid만 지정하고 columns/rows를 모두 생략하면
오류다. `--layout grid` 단독도 거절하며 다른 계층의 치수로 오류를 보완하지 않는다.
유효한 --columns 또는 --rows 중 하나라도 있으면 검증을 통과하며 둘 다 요구하지 않는다.

`host stop [hostname]`과 `host status [hostname]`도 이름을 명시하면 등록된 Host를 직접
선택하고, 생략하면 YAML 선택 규칙을 따른다. 명시한 Host가 없으면 오류다.

`host delete <hostname>`은 등록된 Host를 YAML 없이 직접 선택한다. 이름을 생략하면
`--path`/`--file` 또는 현재 디렉터리의 YAML 탐색으로 선택한다. 후보 없음·복수 후보는 삭제하지
않고 안내하며 Host 이름과 `--file` 동시 지정은 거절한다.

`host network`는 모든 하위 명령에서 등록된 `<host>`를 반드시 지정한다.
현재 경로의 YAML에서 Host를 추론하거나 `--path`/`--file`로 대신 선택하지 않는다.
Host 인자가 없거나 등록된 Host를 찾지 못하면 CLI 오류를 반환한다.
`list <host>`, `show/block/unblock/reset <host> <network>` 순서다.
Host 선택용 `--host` 옵션은 추가하지 않는다. 필수 positional `<host>`와는 별개다.
Host 실행의 `--name`·`--worktree`는 제외하며 일반 `agent list --host` 조회 필터도 별개다.

`host agent start/stop/restart`는 해당 Host의 Agent 이름을 하나 이상 받는다.
Start는 신규·stopped 항목에 적용하고 실행 중이면 중복 시작하지 않는다. Restart는 실행 중인 대상에
적용한다. 동일 YAML·동일 Host 이름의 중복 run은 상태와 start/restart 사용법을 안내한다.
YAML 재읽기·route 적용 범위·stop/delete·전체 restart·실패 보상은 [[docs/specs/aiox-host]]를 따른다.
이전 vendor 대화를 자동 resume하지 않는다.

Adapter install/uninstall/setup/list/show/doctor 표면을 유지하되 Claude 실행을 위한 사전 영구
MCP setup을 다시 요구하지 않는다. provider별 설치/setup 구현은 이 명령 트리만으로 완료됐다고
볼 수 없다. root `quit`, join/leave, 기존 vendor별 실행 alias는 추가하지 않는다.

Web을 여는 CLI 진입점, 포트 override를 받는 정확한 시작 명령/옵션, 일반 `agent list --all`의
범위는 Open/deferred다. 이 미결 때문에 위 확정 트리를 축소하지 않는다.

## 플랫폼과 검증 경계

Windows native·Linux·macOS 및 npm 전역 설치가 지원 목표다. Node/Git/vendor CLI, PTY와
SQLite native dependency는 실제 배포 OS·CPU·Node 조합에서 검증한다. WSL Linux 실행과 native
Windows 실행은 다른 환경이며 한쪽 성공을 다른 쪽의 증거로 사용하지 않는다.

Doctor는 설치·버전·실행 환경·vendor 지원과 연결 준비를 진단한다. Claude Peer 지원 최소
버전은 보고된 기준으로 macOS/Linux/WSL2 2.1.224+, native Windows 2.1.234+다. 내부 wire의
미래 호환성과 Windows 통합 성공을 보장하는 숫자는 아니다. native Windows token forwarding,
혼합 Windows/WSL 프로세스 실행, update 신호의 정확한 판정 및 종료 키·타임아웃은 미검증이다.

자동 runtime 재시작이나 daemon 재시작 후 옛 PTY 재부착·실행 복원은 현재 약속하지 않는다.
살아 있는 daemon에 브라우저가 복귀하는 계약과 구분한다.

Sources:

- `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §§2–4, 10–15, 18, 24 — 승인 범위,
  실행 의미, CLI 및 검증 한계의 provenance.
- `logs/2026-09-07-AIOX-TUI-Stage2-Daemon-MCP-Terminal.md` W2 — 종료 미완료 재시도·TUI 종료 후 daemon 유지·직접 관리 자원 범위.
