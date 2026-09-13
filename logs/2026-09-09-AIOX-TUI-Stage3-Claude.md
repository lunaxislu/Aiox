---
topic: AIOX TUI Stage3 Claude
description: Claude TUI inbox hooks와 기존 shell 실행 수명 연결
status: open
---

## Work Items

- [>] W1 Claude 실행·주입 연결 — Stage2 최신 결과와 CLI→Controller→daemon 등록·terminal 문맥·binding 및 관련 owner/tests를 대조하고, 같은 shell·외부 standalone의 foreground TUI 실행에 실행별 HTTP MCP·credential·instruction·hooks를 주입한다. 기존 사용자 설정·hooks·MCP 보존과 설치·버전·시작 실패 경계를 검증한다. -- 이후 vendor 인자 전달과 AIOX 관리 MCP·credential·binding 설정의 충돌 정책을 확정·검증한다. YAML 구현은 Stage5에서 수행한다.
- [ ] W2 Claude native inbox 전송 연결 — Runtime별 socket/pipe와 준비 관측·인증을 구성하고 공통 send 및 daemon 알림을 연결한다. 발신자 표시·본문 전달·route 권한을 검증하며 inbox token과 MCP token을 분리한다. Windows 네이티브 inbox token 확보·전달·named pipe 인증 경로를 구현하고 검증한다.
- [ ] W3 Claude hooks·입력 결과·Runtime 상태 연결 — 인증된 UserPromptSubmit/Stop의 Runtime·session_id·prompt_id로 해당 AIOX 입력만 연결·완료하고 직접 사용자 입력의 종료가 이전 발신자에게 재알림하지 않게 한다. busy·복수 입력·실패·중단과 승인/질문·리밋 관측을 검증하고 확인 불가 상태를 성공으로 추정하지 않는다. No/Esc에서 승인 대기 해제와 해당 요청 종료를 구분하고, snapshot 경유 연결 누락으로 상태가 남는 결함을 해결한다. FileChanged·OTel의 전달 신뢰성·요청 귀속·종료 신호를 검증해 필요한 관측 방식을 선택·구현한다. 기존 구현과 검증 근거를 이어받되 새 반례는 미해결로 유지한다.
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
- 공통 실행 경계 소비 지점: packages/protocol의 terminalContextFromEnv(env)와 daemon.registerRuntime이 인증된 Web shell 차용을 처리한다. AIOX_TERMINAL_ID/AIOX_TERMINAL_TOKEN은 child env 문맥이며 URL·argv·로그에 노출하지 않는다. Web은 AgentController/ExecutionOwner가 daemon 소유 PTY를 관리하고, 문맥 없는 외부 실행은 CLI가 직접 vendor를 시작해 native stdio를 상속한다. 외부에는 daemon PTY를 만들지 않는다. 등록·종료·shell 복귀는 Stage2-2에서 구현·검증했으므로 이 단계는 기존 경계 위에서 Claude 메시지 통합의 누락을 확인한다. 생성 cwd는 실시간 cd 추적값이 아니다.
- Stage2 W1~W4 완료 후 다음 단계로 선택됐으나 2026-09-10 공통 Stage2-1을 선행 배치했다. Stage2 최신 W4 entry와 owner를 읽는다. 코드 6621fc3의 CI 34314631099는 3 OS × Node22/24 success이며 Ubuntu Node22 버퍼 timeout은 동일 SHA 재실행 통과·원인 미확정이다. macOS Chrome plain-shell 검증과 vendor 대역 성공을 실제 Claude 통합 성공으로 승계하지 않는다. 2026-09-11 승인된 초기 준비 제한·Notification 힌트 정리·probe cwd·terminal dispose의 국소 수정을 반영했다. 최신 수정 블록을 소비하되 Stage3 전체 착수·완료나 실제 vendor 검증 완료로 확대하지 않는다.
- Stage2-1 공통 headless·serialization 복원 단계는 완료됐다. logs/2026-09-10-AIOX-TUI-Stage2-1-Terminal-Snapshot.md의 종료 결과와 docs/architecture/aiox-storage-terminal.md를 소비하고 이 로그 W1에서 실행·주입 계약 대조를 재개한다. 공통 Web 화면 검증을 Claude inbox·hooks 통합 완료로 승계하지 않는다. 다음 실사용 검증 전 서버와 Web이 추가 snapshot 필드를 포함한 동일 빌드인지 확인하며 사용자 세션 재시작은 별도 지시에 따른다.
- Stage2-2 구현·검증 및 c000cab 로컬 main 반영은 완료됐다. 해당 단계 최신 마감 entry와 docs/architecture/aiox-vendor-bindings.md를 소비한다. logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md의 처리 경계 개선은 마감됐다. 사용자 지시로 이 단계는 아직 대기하며 이후 활성화 시 W1을 재개한다. 공통 packages/vendor·AgentController와 packages/adapters/claude 경계를 유지한다. 기존 macOS 수명·Web 복원 및 Windows 대역 검증을 Claude 모델 메시지 E2E 완료로 확대하지 않으며 실제 통합 검증은 이 단계 W2/W3/W5에 남는다.

### {W1}

- Stage2-3은 마감됐고 현재 plan 활성 단계는 Stage4다. 사용자 결정으로 Codex 독립 실행·관측·Codex 간 왕복을 먼저 진행한다. 이 로그 W1은 이후 Claude 재개 후보이며 Stage4 W4의 교차 검증에 필요한 W2/W3/W5 결과를 제공한다. 기존 미해결 관측을 완료로 표시하지 않는다.

### {W3}

- 사용자 승인으로 Claude No/Esc 관측 보완의 남은 작업과 기존 근거를 이 W3에 인계한다. [Stage2-3 기록](2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md)의 2026-09-13 아래 entry들을 순서대로 소비한다. 이번 변경은 W3 문구·Required Context 기록에 한정하며 Stage2-3 W7 완료나 Stage3 활성화를 뜻하지 않는다. 기존 코드와 tests를 보존하고 실제 Claude 수직 통합 검증은 W5에서 수행한다.
- 구현·검증 인계: 22:04 「Claude No·Esc transcript 보완 구현과 전체 541 tests 검증 완료」. hook의 prompt별 정리와 인증된 transcript_path의 읽기 전용 250ms polling, 거부 tool_result와 직접 parent 중단 marker의 귀속, 저장 실패 재시도·다른 요청 보존·reader 수명 및 owner 반영 근거를 읽는다. 작업 트리의 packages/adapters/claude/src/claude-observations.ts, claude.ts, launch-hooks.ts와 새 claude-transcript.ts 및 각각의 인접 tests가 재개 시 대조 대상이다. owner는 docs/architecture/aiox-vendor-bindings.md 및 docs/specs/aiox-collaboration.md, 상태 계약은 docs/specs/aiox-runtime.md다. 541 tests·fixed-replay 성공은 당시 범위의 기록이며 이번 재실행 결과나 후속 반례 해결 근거가 아니다.
- 미해결 반례·전달 문제: 22:21 「FileChanged 실측: 수신 가능 경로·최초 세션 미발화와 No 첨부 중간 연결 결함」, 22:27 「argv prompt 재검증 성공으로 고정 원인 가설 배제·snapshot parent 연결 확인」, 22:55 「FileChanged 설계 방향 정정·현재 reader와 소비 schema 설명」. No에서 거부 결과 → attachment(prompt_snapshot) → 중단 marker 연결을 현재 관측기가 놓쳐 awaiting-user가 남는 2건은 미수정이다. FileChanged 수신은 실측했으나 최초 미발화 원인은 미확정이며 argv/debug를 고정 원인으로 설명하지 않는다. 당시 FileChanged 전환은 설계 방향이고 production은 polling이다. snapshot 연결 수정 또는 대체 신호로 같은 반례를 해결했는지 검증한다.
- 방식 선택 근거: 22:28 「논의·설계만 진행: 수동 거부와 Esc의 hook 보장 재정리」, 23:14 「OTel tool_decision 구조화 거부 신호 후보·statusLine 범위 확인」, 23:22 「OTel 한계 분류 재검토·실행 중 Esc hook 전달 보장 구분」, 23:27 「외부 조사 stdout lifecycle 예시 검증·TUI와 print mode 구분」, 23:31 「공개 레포·블로그의 Claude TUI 중단 관측 보완 조사」. OTel 승인 결과는 후보이며 reject/user_abort를 요청 종료나 모든 실행 중 Esc의 보장으로 확대하지 않는다. No·승인창 Esc·실행 중 Esc·답변 중 Esc의 실제 전달·ID 귀속·지연과 종료된 요청 재활성화 방지를 검증한다. FileChanged와 OTel 모두 도입은 확정하지 않았고 timeout·화면 문자열·print/SDK 전환도 해결로 채택하지 않았다. 당시 quota로 실제 실행을 중단한 뒤 논의·설계만 진행했으며 /resume·/clear·Windows/Linux 실측 등 남은 검증을 완료로 승계하지 않는다.
- 소비 경계: 23:36 「A 요청 중 B 사용자 직접 입력의 runtime 상태와 요청 귀속 구분」 및 23:42 「send 답장 연결 가능성 점검·기존 delivery 분리와 단방향 정책 정정」. Web/agents_list의 runtime 전체 activity와 원 AIOX delivery 결과는 이미 분리돼 있다. 직접 입력의 Stop으로 다른 delivery를 완료하지 않고 다른 요청의 활동·대기를 보존한다. B→A send는 독립 메시지이고 단방향 route에서는 거절되므로 원 요청 종료 관측의 대체로 사용하지 않는다. interrupted 자동 알림 부재와 completed가 업무 성공이 아닌 응답 처리 종료라는 기존 계약을 소비한다.

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

## 2026-09-11 · W1 실행·주입 계약 대조와 사전 검사 보완

사용자가 진행 상태와 필요한 사용자 행동을 확인한 뒤 W1 진행에 동의했다. 기존 작업 트리의 Claude 구현과 변경을 보존하고 CLI bootstrap/foreground → agentRunSchema → daemon WS/등록 → ClaudeController → prepareClaudeLaunch/probeClaude/ClaudeBinding 및 관련 테스트를 대조했다. Stage2-1 종료 결과와 runtime/collaboration/vendor-bindings의 foreground·borrowed shell·실행별 신원 계약을 소비했다. 이번 수정은 claude-launch.ts와 launch/controller 테스트 3개 파일에 한정한다.

확인: 기존 사전 검사는 --print/-p, --bare/--safe-mode, inbox 주소·MCP aiox·hook credential 충돌을 검사하지만 --bg/--background/--tmux를 통과시켰다. https://code.claude.com/docs/en/cli-reference 에서 background 실행 후 즉시 반환과 별도 tmux/iTerm2 실행 의미를 확인했다. foreground TUI 소유 계약에 맞게 해당 옵션(=classic 포함)을 실행 전에 거절한다. 실제 preflight를 사용하는 controller 회귀 4개가 수정 전 실패했고 수정 후 영어 오류·vendor 미생성·등록 정리·빌린 shell 생존을 확인했다.

확인: https://code.claude.com/docs/en/env-vars 의 CLAUDE_CODE_SAFE_MODE는 --safe-mode와 같은 hooks/MCP 비활성화 경로다. caller env 및 로드한 settings env에서 활성 값 1/true(대소문자 무관)를 검사하도록 보완했다. 수정 전 통과하던 실패 테스트를 확인한 뒤 구현했으며 0/false/빈 값은 보존한다. 사용자 환경·영구 설정을 수정하지 않으며 오류에 값은 넣지 않는다. 이는 문서로 확인한 의미와 AIOX 자동 검증 결과이며 실제 vendor safe-mode 재현은 아니다. 기존 architecture의 필수 hooks·foreground·설정 보존 계약을 구현하는 국소 검사이므로 owner 문서에 옵션 목록을 중복 추가하지 않았다.

검증: 최종 pnpm check가 lint·format·build·typecheck와 31개 파일/357개 테스트를 모두 통과했다. 최초 전체 검증은 CLI의 listen EPERM(127.0.0.1)과 연쇄 timeout으로 실패했으며 샌드박스 외 실행 승인 후 동일 명령 전체를 재실행해 통과했다. /private/tmp/aiox-stage3-w1-check-approved.log가 해당 실행 출력이다. 대상 launch/controller는 35개 테스트 통과, CLI는 34개 테스트 통과도 개별 확인했다. 실제 사용자 daemon·vendor 세션을 실행하거나 재시작하지 않았다.

W1은 완료로 바꾸지 않는다. 다음은 최신 built CLI/daemon에서 실제 Claude 시작·실행별 주입과 기존 설정 보존, 같은 shell 및 외부 standalone의 foreground 복귀를 확인하고 W1 완료를 판정하는 것이다. 기존 대역 및 과거 시작 관측을 이번 실제 vendor 검증으로 승계하지 않는다. W2~W5, 실제 모델 inbox/hooks와 Windows 통합 완료 조건은 유지한다.

### 2026-09-11 16:44 · 실제 Claude 두 shell 경로 검증 — 코드 수정 없음

사용자는 같은 AIOX shell 및 외부 standalone 경로를 검증만 하고 코드는 수정하지 말라고 지시했다. 제품 소스·tests·owner를 수정하지 않고 pnpm build를 통과시킨 뒤 임시 harness /private/tmp/aiox-stage3-w1-real.mjs로 macOS 실제 Claude를 실행했다. 사용자 daemon 대신 별도 DB·임의 포트 daemon 및 검증용 PTY를 사용했다. CLI 빌드 사본의 createFoundationPort home 인자만 임시 daemon 탐색 위치로 지정하고 원래 vendor env·설정은 유지했다. 따라서 사용자 운영 daemon·브라우저 화면의 직접 검증은 아니다.

확인: /private/tmp/aiox-s3-real-asYHai 실행에서 borrowed/external 모두 실제 Claude PTY 생존 + binding.ready(Network 사용에 따른 MCP initialize와 인증 hook/inbox 조건), borrowed의 기존 terminal ID 연결 및 external의 null terminal ID, 공개 terminal 수 1 유지가 통과했다. 두 경로 모두 /exit 후 shell 반환 코드 0, Runtime 목록 비움, vendor PTY 종료, inbox 경로 삭제, 원래 shell 생존 및 후속 printf 입력 성공을 확인했다. user settings.json·project settings.json·settings.local.json·project .mcp.json은 전후 SHA-256/부재 상태가 동일했다. 검증 daemon stop 성공을 확인했다.

제한: 모델 요청이나 inbox 메시지를 보내지 않았다. instruction의 모델 소비, 기존 MCP 각각의 실제 연결·hook 각각의 실행, credential 폐기 후 HTTP 거부는 이번 검사의 assertion 대상이 아니다. 전역 .claude.json의 vendor 자체 갱신은 설정 파일 해시 검증 대상에 포함하지 않았다. Windows/Linux/WSL과 실제 GUI 표시는 미검증이며 W1 전체 완료나 W2~W5 완료로 확대하지 않는다. W1 next pointer를 유지한다.

첫 시도는 localhost listen EPERM으로 실행하지 못해 승인 후 재실행했다. 승인된 최초 harness는 CLI 사본의 chunk 연결 누락으로 ERR_MODULE_NOT_FOUND가 나서 vendor 실행 전 실패했다. 임시 harness에 chunk symlink를 보완한 후 위 두 경로가 통과했다. 제품 결함으로 분류하지 않는다.

## 2026-09-11 · Stage2-2 공통 실행 소유권 단계로 전환

사용자는 명령·실행 위치에 따른 AIOX 공통 정책을 Stage3의 vendor 구현에서 분리하여 Stage2-2 생성·로그 기록·활성 포인터 이동을 요청했다. 합의 내용과 실행 작업은 logs/2026-09-11-AIOX-TUI-Stage2-2-Execution-Ownership.md가 소유한다. plan은 Stage2-2를 활성화하고 Stage3를 대기로 둔다. 이 로그의 기존 구현·검증 기록과 W1~W5를 보존하며 W1 [>]는 단계 복귀 시 재개 지점이다. Stage2-2 완료 뒤 새 실행 경계를 소비해 W1 완료 여부를 판정한다. 이번 전환은 제품 구현·vendor 검증을 수행한 결과가 아니다.

## 2026-09-11 · Stage2-2 완료 결과 소비와 W1 복귀

Stage2-2의 최신 완료 entry를 인계받고 W1 [>] 재개 지점을 활성화했다. 실행 소유권·협업 등록·vendor adapter 분리와 Claude 마이그레이션은 구현돼 있으므로 다시 작성하지 않는다. W1은 현재 코드·owner 대조로 남은 Claude 실행/주입 검증을 판정한다. 외부 실제 Claude 수명과 Web 복원 검증을 메시지 E2E 완료로 확대하지 않으며 W2~W5는 기존 미완료 표시를 유지한다. 관련 근거와 새 경계는 Required Context의 Stage2-2 인계를 따른다. 사용자가 추가 제기한 idle shell 일반 stop UX는 별도 후속 검토로 보존했다. 이번 변경은 기록·재개 경로 정합이며 제품 코드 변경이나 Stage3 신규 구현 수행이 아니다.

### 2026-09-12 21:56 · Stage2-2 마감과 Stage2-3 선행 인계

사용자는 Stage2-2 로컬 마감 후 곧바로 Stage3로 복귀하지 않고 logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md에 기존 처리 순서·성공/실패 경계 조사와 구조 개선을 묶도록 결정했다. Stage2-2는 완료, Stage2-3는 활성, Stage3는 대기로 plan을 맞춘다. 이 로그 W1–W5와 과거 실행·검증 History는 보존하며 W1은 새 선행 단계 종료 후 재개한다. 이번 변경은 단계 인계 문맥만 반영했고 Claude 구현·실측을 추가 수행하지 않았다. 원격 push는 사용자 보류다.

### 2026-09-14 00:25 · Stage2-3 마감 결과 인계·Stage3 대기 유지

Stage2-3의 최신 마감 entry를 소비한다. 현재 관측 이유 표시·새 관측에 따른 교체/제거는 최소 Web과 runtime spec에 반영됐다. 사용자는 host:4501 운영 Web 접속·Claude 실행과 브라우저 창/탭 전환에 따른 알림 표시·읽음 처리까지 이전에 직접 확인했다고 보고했다. 이 사용 흐름의 사용자 실측 근거로 수용하고 같은 검증을 반복 요구하지 않는다. 이번 세션의 agent 재실행 결과는 아니며 OS·WSL 구성, 브라우저/vendor 버전과 실행 SHA는 특정되지 않았다. Windows 네이티브와 WSL 각각의 전체 인증이나 모든 vendor 메시지·중단 시나리오 완료로 확대하지 않는다. 기존 W3의 No/Esc·snapshot 연결 결함과 W5 실제 수직 통합 범위는 유지한다. 사용자 요청은 선행 단계 마감까지만이므로 이 단계는 활성화·착수하지 않는다.

### 2026-09-14 00:32 · Stage4 우선 진행·Claude 교차 검증 의존 유지

사용자가 Stage4의 Codex 실행·관측·Codex 간 왕복을 먼저 진행하도록 결정했다. 이 단계는 대기로 유지하고 Stage4 W4의 Claude 교차 검증에 필요한 W2/W3/W5는 기존 미완료 상태로 남긴다. 현재 활성 pointer는 Stage4 W1이다. Claude 관측 해결을 Codex 독립 작업의 선행 조건으로 두지 않는다.
