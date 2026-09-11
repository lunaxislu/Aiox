---
topic: AIOX TUI Stage3 Claude
description: Claude TUI inbox hooks와 기존 shell 실행 수명 연결
status: open
---

## Work Items

- [>] W1 Claude 실행·주입 연결 — Stage2 최신 결과와 CLI→Controller→daemon 등록·terminal 문맥·binding 및 관련 owner/tests를 대조하고, 같은 shell·외부 standalone의 foreground TUI 실행에 실행별 HTTP MCP·credential·instruction·hooks를 주입한다. 기존 사용자 설정·hooks·MCP 보존과 설치·버전·시작 실패 경계를 검증한다. -- 이후 vendor 인자 전달과 AIOX 관리 MCP·credential·binding 설정의 충돌 정책을 확정·검증한다. YAML 구현은 Stage5에서 수행한다.
- [ ] W2 Claude native inbox 전송 연결 — Runtime별 socket/pipe와 준비 관측·인증을 구성하고 공통 send 및 daemon 알림을 연결한다. 발신자 표시·본문 전달·route 권한을 검증하며 inbox token과 MCP token을 분리한다. Windows 네이티브 inbox token 확보·전달·named pipe 인증 경로를 구현하고 검증한다.
- [ ] W3 Claude hooks·입력 결과·Runtime 상태 연결 — 인증된 UserPromptSubmit/Stop의 Runtime·session_id·prompt_id로 해당 AIOX 입력만 연결·완료하고 직접 사용자 입력의 종료가 이전 발신자에게 재알림하지 않게 한다. busy·복수 입력·실패·중단과 승인/질문·리밋 관측을 검증하고 확인 불가 상태를 성공으로 추정하지 않는다.
- [ ] W4 Claude 종료·실패 정리 연결 — 정상 종료·준비 실패·프로세스 종료와 binding 연결 손실의 관측·실패 처리를 구분하고 실제 관리 자원 종료와 credential·등록·route 정리를 확인한다. 브라우저 attachment 손실은 Runtime 종료로 처리하지 않는다. Agent 정상 종료에서는 빌린 shell·terminal ID를 유지하고 원 shell 복귀와 직접 소유 자원 종료를 검증한다. daemon force stop에서는 관리 Agent 자원과 daemon 소유 일반 shell PTY까지 종료·확인한다. 재실행 시 새 Runtime 신원 분리와 부분 실패·재시도 경계를 검증한다.
- [ ] W5 실제 Claude 수직 통합 검증·owner 반영·Stage4 인계 — 같은 terminal 실행부터 HTTP MCP 송수신·inbox 표시·hooks 결과·종료 복귀까지 실제 TUI로 검증하고 기존 사용자 설정 보존·브라우저 detach 생존을 확인한다. Windows 네이티브 token 확보·전달·pipe 인증의 실제 검증 결과와 Linux/macOS·WSL 결과로 통합 완료 여부를 판정한다. 환경 부재 등으로 미검증이면 해당 범위는 미완료로 남기고 후속 검증 위치·재개 조건을 명시한다. 미검증 표기만으로 Windows 통합 완료를 선언하지 않는다. 관련 회귀·pnpm check·owner/링크 정합을 점검해 후속 단계 소비 지점을 남긴다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 2026-09-09 단계별 로그 선생성과 plan 연결을 요청했다. 초기 기록은 단계 인계이며 이후 구현·검증 여부는 최신 기록을 따른다. plans/aiox-tui-product-rebuild.md에서 이 단계가 활성화될 때 선행 로그 최신 결과와 실제 코드를 다시 확인한다. logs/artifact/AIOX-TUI-Product-Context-Prompt.md의 전체 제품 문맥과 §15 운영 Web·브라우저 복귀·알림, logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md의 대응 결정을 읽는다. 초기 goal의 reply/Host add 등 폐기된 정책을 복원하지 않는다. 구현 시 관련 owner docs와 producer/consumer·테스트까지 추적하고 변경된 계약을 owner에 반영한다.
- docs/architecture/aiox-vendor-bindings.md, docs/specs/aiox-runtime.md, docs/specs/aiox-collaboration.md를 읽는다. Claude 실제 TUI + native peer inbox + hooks를 구현하며 headless·SDK·Channel fallback·vendor별 stdio MCP child를 추가하지 않는다. 실행별 credential·공통 HTTP MCP agents_list/send·instruction을 연결하고 기존 사용자 설정·hooks·MCP를 보존한다.
- Stage 2의 terminal/Runtime 수명 분리를 소비한다. 기존 shell에서 aiox agent run claude --network dev → 같은 terminal에서 TUI 실행·Agent 등록 → vendor 종료·등록/credential/route 정리 → 원래 shell 복귀. 새 탭 중복 생성 금지. 일반 claude 직접 실행은 자동 Agent 등록이 아니다. 외부 터미널의 standalone 실행도 유지한다. Agent 소유 자원과 빌려 쓰는 shell PTY를 구분한다.
- Claude Runtime/session_id/prompt_id의 UserPromptSubmit·Stop 연결로 해당 AIOX 입력만 완료한다. 이후 직접 사용자 요청 종료가 이전 발신자에게 재알림하지 않게 한다. busy 입력·실패·중단·Windows pipe/token은 실제 integration에서 좁게 확인하며 기존 사용자 실험을 신규 통합 성공으로 확대하지 않는다. 준비/종료 실패는 실제 관리 자원을 확인하고 재시도 경계를 유지한다.
- W3 소비 지점: packages/protocol의 terminalContextFromEnv(env) → daemon.registerRuntime({terminalContext, createBinding, ...})로 기존 shell을 차용한다. terminalId 단독은 일반 shell 연결 권한이 아니다. 문맥은 child env AIOX_TERMINAL_ID/AIOX_TERMINAL_TOKEN이며 URL·argv·로그에 노출하지 않는다. apps/daemon/src/daemon.ts·terminals.ts 및 daemon.test.ts/terminals.test.ts가 수명·실패/재시도 근거다. 실제 agent run HTTP 등록·vendor foreground 종료 관측·원 shell 복귀는 이 단계에서 연결한다. 문맥 없는 외부 standalone은 유지하고 직접 소유 PTY만 Agent 종료 시 종료한다. 생성 cwd는 실시간 cd 추적값이 아니다.
- Stage2 W1~W4 완료 후 다음 단계로 선택됐으나 2026-09-10 공통 Stage2-1을 선행 배치했다. Stage2 최신 W4 entry와 owner를 읽는다. 코드 6621fc3의 CI 34314631099는 3 OS × Node22/24 success이며 Ubuntu Node22 버퍼 timeout은 동일 SHA 재실행 통과·원인 미확정이다. macOS Chrome plain-shell 검증과 vendor 대역 성공을 실제 Claude 통합 성공으로 승계하지 않는다. 2026-09-11 승인된 초기 준비 제한·Notification 힌트 정리·probe cwd·terminal dispose의 국소 수정을 반영했다. 최신 수정 블록을 소비하되 Stage3 전체 착수·완료나 실제 vendor 검증 완료로 확대하지 않는다.
- Stage2-1 공통 headless·serialization 복원 단계는 완료됐다. logs/2026-09-10-AIOX-TUI-Stage2-1-Terminal-Snapshot.md의 종료 결과와 docs/architecture/aiox-storage-terminal.md를 소비하고 이 로그 W1에서 실행·주입 계약 대조를 재개한다. 공통 Web 화면 검증을 Claude inbox·hooks 통합 완료로 승계하지 않는다. 다음 실사용 검증 전 서버와 Web이 추가 snapshot 필드를 포함한 동일 빌드인지 확인하며 사용자 세션 재시작은 별도 지시에 따른다.

## 2026-09-09 · 단계별 확정 요구와 인계 준비

사용자의 단계별 로그 생성 지시에 따라 Required Context에 구현 범위·선행 결과 소비·참고 자료·사전 논의 조건을 기록했다. 아직 이 단계의 구현을 시작하지 않았다. plan이 이 단계를 활성화하면 선행 로그 최신 기록과 실제 코드부터 대조하고 그때 필요한 Work Items를 구성한다. 이번 기록은 기능 구현·외부 참고 자료 검증 결과가 아니다.

### 2026-09-09 15:25 · Work Items 구성과 재개 지점 지정

사용자는 구현에 앞서 Work Items만 구성하도록 요청했다. Stage3 인계 문맥과 vendor bindings·runtime·collaboration 계약을 기준으로 W1~W5를 실행·주입, inbox, hooks·상태, 종료·정리, 실제 통합 검증·인계로 나눴다. W1의 [>]는 다음 재개 지점이며 구현 착수·완료를 뜻하지 않는다. 기존 Required Context를 유지하고 제품 코드·owner·plan은 변경하지 않았다. 이번 범위는 작업 목록 구성뿐이며 실제 코드 대조·vendor 실행·테스트는 각 Work Item 수행 시 진행한다.

### 2026-09-09 15:35 · Work Items의 충돌 정책·Windows 완료 조건·종료 경계 보강

사용자 검토의 세 보완점을 Product Context Prompt §12의 vendor 인자 충돌 책임, plan의 adapter 단계 OS 검증 범위, runtime 계약의 attachment·빌린 shell·force stop 수명 구분과 대조해 타당하다고 판단했다. W1에 -- 이후 인자 전달·AIOX 관리 설정 충돌 정책 확정·검증을, W2에 Windows token 확보·전달·pipe 인증 구현 책임을 명시했다. W5는 실제 결과로 완료를 판정하고 환경 부재 시 미완료 범위·후속 검증 위치·재개 조건을 남기도록 보강했다. W4는 브라우저 attachment 손실의 실행 유지, Agent 정상 종료의 빌린 shell 유지, daemon force stop의 daemon 소유 shell PTY 종료를 구분했다. W3·항목 순서·W1 재개 지점·Required Context는 유지한다. 작업 문구만 보강했으며 구현이나 실제 동작을 검증한 결과는 아니다.

### 2026-09-11 14:11 · Stage2-1 중 사용자 요청으로 실행·상태 설계 사전 검토

사용자가 Stage3의 로직·설계도 subagent 검토하도록 요청했다. Stage3를 활성화하거나 실제 Claude를 실행하지 않고 현재 소스·호출자·tests를 대조했다.

claude-controller.ts281의 시작60초 타이머는 current.ready를 확인하지만 claude.ts163의 실행 중 inbox 실패도 ready=false로 바꾼다. 시작 성공 후 일시 실패가60초 타이머와 겹치면 startup 실패로 finish/stopRuntime에 진입할 수 있다. 실제 시간 재현은 하지 않았다. 기존 wasReady로 최초 시작 성공 이력을 사용하거나 첫 준비 성공 때 타이머를 해제하는 방향을 추천한다.

claude-observations.ts324의 식별 없는 Notification waiting은303의 tool 완료와291의 elicitation 완료에서 지워지는 식별키와 다르다. agent 소스 기반 합성 UserPromptSubmit→Notification(permission_prompt)→PermissionRequest(tool)→PostToolUse(tool)→Stop 순서에서 awaiting-user 잔류를 재현했다. 실제 vendor 발생 순서는 미검증이다. 알림 힌트와 식별된 미해결 요청을 중복 영구 기록하지 않는 방향을 추천하며 모든 waiting을 지우는 방식은 다른 요청을 손상할 수 있다.

claude-version.ts39 execFile에는 cwd가 없지만 실제 claude.ts88 실행에는 요청 cwd가 있다. 상대 PATH에서 다른 실행 파일 검사/실패 가능성은 코드 기반 추론이다. probe에도 같은 cwd를 전달하는 방향이며 별도 PATH 탐색기 도입은 불필요하다. 세 항목은 이번에는 수정하지 않았다. Stage3 W1~W5 open 유지한다.

### 2026-09-11 14:17 · Claude 준비 신호 조사·초기 준비와 현재 상태 분리

사용자가 Claude 전체 준비를 알 수 있는 방법을 subagent에게 조사하도록 요청했다. 3명이 현재 AIOX 조건, 공식 hook 문서, installed Claude2.1.268 native inbox 구현을 읽기 전용 조사했다. 제품 수정·실제 vendor 실행·inbox 메시지 전송은 하지 않았다.

공식 https://code.claude.com/docs/en/hooks#mcp-tool-hook-fields 는 launch SessionStart가 MCP 서버를 hooks에 제공하기 전에 발생함을 명시한다. UserPromptSubmit은 처리 전 이벤트로 차단 가능하고 idle_prompt는 응답 종료 뒤 지연 알림이다. 조사한 공개 hook 목록에는 TUI·MCP·inbox·모델 요청을 모두 보장하는 단일 Ready 신호가 없었다. SessionStart만 기다리거나 화면 문자열·고정 대기로 전체 준비를 판정하는 것은 부적절하다.

현재 claude.ts100~146은 살아 있는 관리 PTY + 인증된 hook의 할당 inbox path/token 확인 + inbox auth-only write callback + Network 사용 시 MCP initialize 관측으로 ready/wasReady를 설정한다. daemon.ts176~188의 MCP 조건은 서버 측 initialize200 관측이며 client tools/list 완료나 모델 API 인증 성공까지 보장하지 않는다. hook event를 SessionStart만으로 제한하지 않아 후속 hook도 inbox 회복에 사용된다.

inbox reviewer가 설치2.1.268 내장JS에서 listen완료→권한/key설정→환경변수 공개 순서를 확인했다. 같은 runtime hook의 path/token은 파일 존재보다 강한 초기화 근거다. 다만 auth 성공 처리에 긍정 ACK가 없고 AIOX write callback도 수신측 인증·메시지소비 확인이 아니다. 공식 https://code.claude.com/docs/en/cross-session-messaging#the-sessions-inbox-socket 및 Restrict cross-session messaging은 inbox가 열려 있어도 refuse 설정으로 메시지를 버릴 수 있음을 설명한다. installed source 관찰을 모든 버전 보장으로 확대하지 않는다.

추천은 기존 복합 조건을 AIOX 연결 준비 관측으로 유지하면서 초기 timeout은 wasReady 이력으로 판정하고, 현재 inbox 상태·작업 중·승인 대기·모델 오류는 별도로 관측하는 것이다. docs/specs/aiox-runtime.md33~47의 준비 확인용 모델호출/ACK 강제 금지 계약을 유지한다. 새 의존성이나 health-check용 사용자 프롬프트는 필요하지 않다. 실제 vendor 순서/회복 검증은 후속 작업이며 이번에는 조사만 수행했다.

### 2026-09-11 14:18 · vendor 공통 준비 수명과 개별 신호의 책임 구분

사용자는 준비 처리를 Claude·Codex·추후 agent CLI TUI가 재사용하도록 추상화할 수 있는지 질문했다. root가 runtimes.ts의 기존 AgentBinding(deliver/stop)과 RuntimeControls(setActivity/settle)를 확인했다. 공통화 후보는 최초 준비 성공·시작 timeout 해제·준비 후 연결 장애/회복·종료 전이이고, 실제 준비 신호 판정은 각 binding이 소유하는 방향이다. Claude의 hook/inbox/MCP 검사를 모든 vendor의 조건으로 강제하지 않는다. 기존 경계를 확장하는 최소 공통 수명 처리를 제안하며 범용 readiness framework나 새 vendor 구현은 시작하지 않았다. Codex의 구체적인 준비 신호·공통 함수 형태는 Stage4 실제 경로와 함께 검증해야 한다.

## 2026-09-11 · Stage2-1 중 승인된 Claude 수명·관측 수정

사용자가 설계 검토 후 수정하도록 승인한 W1·W3·W4의 국소 결함을 반영했다. Stage3 활성화나 전체 통합 완료를 뜻하지 않는다. Stage2-1의 실제 Claude/Codex TUI 검증 전 범위를 유지하고 사용자 vendor 프로세스를 실행·재시작하지 않았다.

claude-controller.ts의 60초 시작 제한은 현재 ready 대신 wasReady를 확인한다. 한 번 준비된 Runtime의 inbox 상태가 이후 나빠져도 초기 준비 실패로 종료하지 않는다. 살아 있는 PTY·인증 hook·inbox 연결·Network 사용 시 MCP initialize라는 기존 연결 준비 조건은 유지한다. 서버 측 initialize 응답과 inbox write callback은 vendor의 tools/list 완료·모델 수신·화면 전체 준비를 보장하지 않는다.

claude-observations.ts는 Notification 대기 힌트를 session·종류·prompt 신원으로 구분한다. 식별된 PermissionRequest/Elicitation 및 대응 완료 관측에서 같은 prompt 힌트와 session의 미식별 힌트를 정리하고, 다른 prompt의 식별된 미해결 요청은 유지한다. 식별 정보가 없는 알림을 타이머나 무관한 Stop으로 임의 해제하지 않는다. 합성 hook 순서에서 확인했던 영구 awaiting-user 잔류와 늦게 도착한 질문 알림의 정리 경계를 회귀 검사했다. 실제 Claude의 모든 알림 순서가 확인된 것은 아니다.

claude-controller.ts가 claude-version.ts의 probeClaude에 실제 실행과 같은 input.cwd를 전달한다. 기존 execFile과 caller env를 재사용하며 별도 PATH 탐색기를 추가하지 않았다. ClaudeBinding.stop은 관리 PTY kill 성공 후 session.dispose를 기다려 terminal 상태 자원을 해제한다. kill 실패 시 dispose·후속 정리를 진행하지 않고 재시도 가능한 수명을 유지한다.

검증: apps/daemon에서 claude-controller.test.ts, claude-observations.test.ts, claude-version.test.ts, claude.test.ts의 4개 파일·43개 테스트 통과. 시작 제한과 대기 힌트 회귀는 수정 전 실패를 확인한 뒤 통과시켰다. 기존 probe 인자 검사를 cwd까지 확장하고 kill 실패/재시도 검사에 dispose 호출 경계를 추가했다. daemon typecheck와 대상 lint·format 검사도 통과했다. claude.test.ts의 Node PTY 대역은 실제 Claude 모델/TUI 실행 검증이 아니다.

owner docs/architecture/aiox-vendor-bindings.md에 초기 준비 이력·현재 상태 분리, Notification 힌트 정리 책임, 종료 확인 뒤 terminal 상태 해제를 반영한다. W1~W5는 모두 open을 유지하고 plan의 활성 Stage2-1 포인터는 변경하지 않는다. 실제 vendor·Windows 통합, 전체 W1~W5 요구의 충족 여부는 기존 Stage3 검증 범위로 남긴다.

## 2026-09-11 · Stage2-1 완료 결과 소비 및 W1 재개

공통 복원 단계의 W1~W5 완료 결과를 소비하고 W1을 재개 지점으로 올린다. PTY 통합 attachment, snapshot 상태 보완 및 LNM·커서 깜빡임 회귀는 선행 단계에서 완료했다. 사용자가 보고한 A~F 해결과 terminal67/Web20 회귀를 이 단계의 실제 Claude inbox·hooks·전 OS 통합 검증 완료로 확대하지 않는다. 기존 이 로그의 준비 제한·Notification·probe cwd·dispose 수정 결과를 유지하며 W1 실행·주입 계약과 남은 W2~W5를 이어간다. 이번 작업은 포인터 정리이며 vendor 실행이나 daemon 재시작은 하지 않았다.
