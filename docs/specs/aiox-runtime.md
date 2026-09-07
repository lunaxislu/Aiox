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
AgentRuntime — AIOX가 관리하는 실행
├─ vendor 실행·binding (Codex는 TUI와 App Server 포함)
├─ 현재 vendor conversation
└─ Terminal / PTY
   └─ Web attachment — 연결·해제 가능한 화면 접근
```

AgentRuntime은 PID 하나나 vendor conversation ID가 아니다. 같은 이름·manifest를 다시
실행하면 새 Runtime 신원과 credential을 사용한다. Claude 같은 프로세스에서 `/clear` 또는
`/resume`으로 대화가 바뀌어도 Runtime/PTY가 새 실행이 되는 것은 아니다. 다른 프로세스의
`--resume`은 새 실행이다. 브라우저 종료·pane 해제·연결 손실은 Agent 종료 요청이 아니다.

Daemon이 materialized Runtime·Network·route의 권위를 갖고 Controller가 실행·종료를
소유한다. CLI/Web/MCP는 상태를 직접 덮어쓰지 않는다. Adapter는 vendor 실행·입력·관측·정리
차이를 흡수한다. 실제 프로세스 배치는 architecture에서 정한다.

## 시작·준비·상태 조회

- Standalone `agent run`은 foreground다. 사용자는 Ctrl+C·`/exit` 등 해당 세션에서 종료한다.
  별도 standalone agent stop/attach/detach 명령은 현재 범위에 없다.
- 프로세스 생성과 binding 준비를 구분한다. 단순 PID·socket 파일 존재만으로 준비 성공을
  표시하지 않는다. 시작 실패와 관측할 수 없는 상태를 정상 실행으로 숨기지 않는다.
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

정확한 status enum과 vendor 신호 매핑은 Open/deferred다. `waiting_for_user` 같은 예시는
확정 enum이 아니다. 세션 리밋·실행 중단은 상태와 Web 알림에 반영하되 특정 delivery 실패로
귀속하려면 그 입력과의 연결 근거가 있어야 한다.

## 종료와 daemon 수명

일반 `daemon stop`은 신규 Controller/Runtime 등록·Host materialization을 차단하고 이미
진행 중인 registration commit과 동기화한 뒤 활성 실행 의존성을 검사한다. 활성 실행이
있으면 거절하고 running으로 돌아간다. persistent Network 정의만 있는 것은 blocker가 아니다.
`daemon restart`는 safe stop + start이며 stop이 거절되면 기존 daemon을 유지한다.
`restart --force`는 제공하지 않는다.

```text
daemon stop --force
→ 신규 등록·실행·메시지 전달 차단
→ 모든 AIOX 관리 Host·standalone 및 PTY·binding·Relay·App Server 강제 종료
→ 실제 종료 확인, credential·membership·Host Network 정리
→ DB 등 daemon 자원 정리
→ daemon 종료
```

- 실행 중 작업도 force 종료 대상이다. 정상 TUI 종료 입력 성공을 전제하지 않는다.
- 관리 실행 handle과 소유 관계를 기준으로 종료한다. AIOX 밖의 vendor 프로세스나 터미널
  앱 전체를 이름으로 검색해 종료하지 않는다.
- 종료 입력·신호 전달 성공은 실제 종료 성공이 아니다. 조회 실패는 프로세스 부재의 증거가
  아니다. 일부 자원이 남거나 관측할 수 없으면 전체 종료 성공으로 보고하지 않는다.
- daemon 자체를 먼저 죽인 뒤 자식 정리가 됐다고 간주하지 않는다. OS별 후손 프로세스 범위,
  강제 종료 수단과 부분 실패 보고 방식은 구현에서 구체화한다.
- persistent Network 정의, Worktree와 이미 저장한 작업 파일은 삭제하지 않는다.
- Host의 정상 종료·Declared/Ephemeral Agent 처리 규칙은 [[docs/specs/aiox-host]]를 따른다.

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
│  │  └─ --worktree <branch>
│  ├─ list [--json]
│  ├─ status <host> [--json]
│  ├─ stop <host>
│  ├─ agent
│  │  ├─ add <host>
│  │  │  ├─ --adapter <adapter>
│  │  │  ├─ --name <name>
│  │  │  ├─ --network <host-network>         # Host의 단일 Network
│  │  │  ├─ --role <role>
│  │  │  ├─ --description <description>
│  │  │  ├─ --instruction <instruction>
│  │  │  └─ -- <adapter-options>
│  │  ├─ stop <host> <agents...>
│  │  └─ remove <host> <agents...>
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
