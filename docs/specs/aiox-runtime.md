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

시작 준비·실패 정리 근거: [[apps/daemon/src/daemon.ts]] `apps/daemon/src/daemon.ts:145-159`, `apps/daemon/src/daemon.ts:244-275`, `apps/daemon/src/daemon.ts:681-690`; [[apps/daemon/src/daemon.test.ts]] `apps/daemon/src/daemon.test.ts:55-175`, [[apps/daemon/src/bootstrap.test.ts]] `apps/daemon/src/bootstrap.test.ts:75-86`.

- Standalone `agent run`은 foreground다. 사용자는 Ctrl+C·`/exit` 등 해당 세션에서 종료한다.
  별도 standalone agent stop/attach/detach 명령은 현재 범위에 없다.
- 프로세스 생성과 binding 준비를 구분한다. 단순 PID·socket 파일 존재만으로 준비 성공을
  표시하지 않는다. 시작 실패와 관측할 수 없는 상태를 정상 실행으로 숨기지 않는다.
- 외부 시작은 daemon 연결·등록 준비 성공 뒤 vendor를 실행한다. 사전 연결 실패는 vendor
  실행 전 오류다. 명시적 초기 실패(`startup-failed`, 최초 협업 준비 timeout 포함)는 오류로 보고하고
  이번 vendor 실행을 종료한다. daemon·제어 WS 손실은 초기 실패와 다른 사건이며 이미 시작한
  vendor는 준비 완료 전후와 무관하게 유지한다.
- Claude Peer 최소 지원 버전 미만은 실행 실패다. 지원 버전에서 inbox 준비가 실패해도
  실패를 표시하며 Channel fallback을 실행하지 않는다. 준비 확인용 모델 호출·ACK를 강제하지 않는다.
- 업데이트가 정상 준비 전에 실행을 종료시킨 경우 등록 성공으로 표시하지 않는다. 사용자가
  업데이트를 처리하고 다시 실행하도록 하며 자동 업데이트·Host 재실행 orchestration을 추가하지 않는다.
  백그라운드 업데이트라는 이유만으로 이미 준비된 Runtime을 실패 처리하지 않는다.
- Agent 목록과 MCP `agents_list`는 daemon이 관측한 `status`를 제공한다. 모델이 자기 상태를
  임의 선언하는 필드가 아니다. MCP의 목록 범위는 collaboration 계약을 따른다.
- 프로세스 생존, binding 준비, 작업 활동, 사용자 입력 대기, 리밋·오류와 종료 관측을
  구별할 수 있어야 한다. 일반 vendor 도구 실패 하나를 Runtime 전체 실패로 승격하지 않는다.
- 이름/ID/Host-qualified 이름으로 Agent를 찾는다. 여러 활성 Runtime에 걸친 이름이면
  모호성 오류와 후보를 제공한다. `/`는 qualified 이름 구분자이므로 Host/Agent/Network
  사용자 이름에 허용하지 않는다.

`agents_list()`의 현재 상태는 `idle`, `working`, `failed`만 공개한다. reasoning·도구 실행·사용자 질문·승인 대기는 모두 working으로 요약한다. 실행·연결 준비를 뜻하는 starting은 send 성공 상태가 아니며 MCP 공개 enum에 추가하지 않는다. Host에 남은 stopped 항목은 Host/Web에서 보이고 전송 대상 목록에서는 제외한다.

Web은 idle, reasoning·도구 실행 등 진행 상세, 사용자 입력·승인 대기, 실패 원인, Host stopped를 구분한다. 알림 읽음이나 다른 요청의 완료로 미해결 사용자 요청 표시를 지우지 않는다.

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
│  ├─ create <name> [--default <allow|deny>]
│  ├─ delete <network>
│  ├─ list [--all] [--json]
│  ├─ show <network> [--json]
│  └─ route <network>
│     ├─ --default <allow|deny>
│     ├─ --allow-between <agents...>
│     ├─ --deny-between <agents...>
│     ├─ --reset-between <agents...>
│     ├─ --allow-from <agent> --to <agents...>
│     ├─ --deny-from <agent> --to <agents...>
│     └─ --reset-from <agent> --to <agents...>
├─ host
│  ├─ run
│  │  ├─ --path <aiox.yaml>
│  │  ├─ --name <host>
│  │  ├─ --worktree <branch>
│  │  ├─ --layout <auto|left-main|top-main|grid>
│  │  ├─ --columns <n>
│  │  └─ --rows <n>
│  ├─ list [--json]
│  ├─ status <host> [--json]
│  ├─ stop <host>
│  ├─ agent
│  │  ├─ start <host> <agent-names...>
│  │  └─ stop <host> <agent-names...>
│  └─ network
│     ├─ list <host> [--json]
│     ├─ show <host> <network> [--json]
│     └─ route <host> <network>
│        ├─ --default <allow|deny>
│        ├─ --reset-default
│        ├─ --allow-between <agents...>
│        ├─ --deny-between <agents...>
│        ├─ --reset-between <agents...>
│        ├─ --allow-from <agent> --to <agents...>
│        ├─ --deny-from <agent> --to <agents...>
│        ├─ --reset-from <agent> --to <agents...>
│        └─ --json
├─ status [--json]
└─ doctor [--json]
```

`host agent start/stop`은 해당 Host의 Agent 이름을 하나 이상 받는다. 이미 실행 중인 항목을 중복 시작하지 않고 이름별 결과를 보고한다. stopped 항목 보존·새 실행·route 재연결과 전체 Host 종료는 [[docs/specs/aiox-host]]를 따른다. 이전 vendor 대화를 자동 resume하지 않는다.

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
