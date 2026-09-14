---
topic: AIOX TUI Stage4 Codex
description: Codex TUI App Server Relay와 같은 terminal의 두 vendor 협업
status: open
---

## Work Items

- [x] W1 Codex 실행·주입·수명 연결 — 환경·옵션 감사, active thread 입력 대응·전환 차단·소유 자원 정리, 사용자 동반 E2E와 최신 전체 검사 및 owner 반영을 완료했다.
- [>] W2 Codex 관측·공통 상태 반영 — 기존 결과 귀속·실측을 보존하고 최신 W2 handoff의 D1/D2/D3를 구현·검증한다. Web·agents_list에 aiox-preparing/idle/working/awaiting-user/failed와 status_reason을 동일하게 표시하고 준비 중 노출·send 차단, turn 실패·해제·대화 전환, 비동기 질문·중단 경계와 기존 Web 이유 표시를 함께 반영한다. owner/tests와 미실측 범위를 정합화한다.
- [ ] W3 Codex 간 실제 메시지 왕복 — 두 Codex Runtime의 agents_list/send·인증·단방향/양방향 route·toolOutput 본문/additionalContext·busy 입력·대상별 결과·발신자 전용 완료/실패 알림을 검증한다. interrupted 자동 통지 없음·알림 재귀 방지를 확인하고 코드/대역/실제 vendor 근거를 구분한다. Claude 완료를 선행 조건으로 두지 않는다.
- [ ] W4 Claude와 Codex 교차 검증 — W1~W3 뒤 수행한다. Stage3 W2/W3/W5에서 필요한 Claude 메시지·관측 경계가 검증돼야 해당 시나리오를 완료한다. Claude 미해결로 막히는 경우 완료로 표시하지 않고 정확한 의존 항목을 Stage3에 연결해 그 작업 후 이 W4로 복귀한다. 양 vendor 송수신·결과 귀속·알림을 실제로 확인한다.
- [ ] W5 Stage4 통합 리뷰·owner 반영·마감 — W1~W4 결과와 회귀·실측 범위, 실행/정리·상태·메시지 owner를 대조한다. 제목 helper의 incomplete AIOX MCP config current gap에 대한 별도 수정·유지 판단을 닫는다. 남은 OS·배포 인증은 Stage8 조건과 연결하고 Claude 교차 검증이 남아 있으면 Stage4 전체 완료로 처리하지 않는다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 현재 활성 단계는 Stage4이며 W1은 완료, 재개점은 다시 열린 W2다. 최신 W2 공통 status/status_reason handoff를 먼저 읽는다. 기존 W2 완료는 당시 범위의 이력이며 새 계약은 아직 미구현이다. 순서는 W2 공통 상태 반영·검증, W3 Codex 간 왕복, Claude 준비 후 W4 교차 검증, W5 통합 마감이다. 기존 제품 문맥은 logs/artifact/AIOX-TUI-Product-Context-Prompt.md 및 logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md를 따른다. commit·push는 별도 지시 없이 하지 않는다.
- docs/architecture/aiox-vendor-bindings.md, docs/specs/aiox-runtime.md, docs/specs/aiox-collaboration.md를 읽는다. Codex 실제 TUI + Runtime별 App Server + Binding Relay를 연결한다. 입력은 채택된 toolOutput 본문 + additionalContext 메타데이터이며 E2E가 실패할 때만 원인을 확인한 뒤 후순위 방법을 검토한다. 임의 active thread 선택이나 선제 fallback을 만들지 않는다.
- Stage2~2-3에서 완료한 공통 실행 소유권·terminal·메시지·상태 결과를 직접 소비한다. Codex W1~W3는 Stage3 완료를 기다리지 않는다. 기존 shell의 aiox agent run codex → 같은 terminal TUI → 종료 후 shell 복귀를 연결하고 외부 CLI와 daemon 소유 자원의 종료 정책을 유지한다. Runtime/threadId/turnId로 입력 결과를 연결한다. Stage3 결과 의존은 W4의 Claude 교차 검증에만 적용한다.
- W3에서 Codex↔Codex의 agents_list/send·인증·단방향/양방향 route·결과·발신자 전용 알림을 먼저 검증한다. 두 vendor 교차 검증은 W4에서 Claude 준비 상태에 따라 수행한다. interrupted 자동 통지 없음·알림 재귀 방지와 실제 OS별 근거/대역 구분은 공통으로 유지한다.
- 공통 연결은 packages/protocol terminalContextFromEnv(env)와 daemon.registerRuntime의 인증된 shell 차용, ExecutionOwner·AgentController 및 CLI foreground/external 경계를 재사용한다. CLI→등록 transport와 Codex foreground/종료 복귀는 Stage2-3 완료 구조 위에서 W1이 연결한다. token을 URL·argv·로그에 넣지 않으며 일반 terminal 목록과 Agent 목록을 구분한다.
- Stage2-3 W7의 관측 상태 잔존 조사(logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md 최신 B′ 판정)를 소비하며 Stage3의 후속 수정은 확정된 결과만 참고한다. Codex에서도 도구·승인/질문 대기의 생성, 귀속, 해소와 turn 완료·실패·중단을 실제 App Server/Relay 이벤트 및 식별자로 연결해 확인한다. 끝난 해당 요청의 잔존 상태는 정리하고 다른 요청의 미해결 대기는 보존하며 현재 activity와 개별 delivery 결과를 분리한다. MCP 요약과 Web 상세가 같은 관측을 소비하는지 확인한다. Claude와 같은 내부 키·hook·구현을 강제하거나 같은 결함이 Codex에도 있다고 추정하지 않는다. Claude PermissionRequest의 tool ID 부재 및 허용/거부 뒤 잔존은 조사 계기이며 Codex 이벤트 계약의 증거가 아니다. ID 누락·불일치, 이벤트 순서·종료 미관측의 한계를 구분하고 실제 vendor 실측과 대역 검증을 분리한다. 이 검증은 W2가 소유하며 Claude의 관측 해결을 선행 조건으로 두지 않는다.
- 구현 전에 현재 문제를 해결하는 가장 단순한 방식으로 설계하고 사용자에게 흐름을 보여 준다. 책임·자원 소유권은 tree 또는 composition map으로, 선행 검증·단계 전환 사건·실행 순서·완료 조건·실패 시 정리 범위와 사용자에게 원인을 전달하는 경로는 짧은 ASCII flow로 제시한다. 설계 시 기존 아키텍처·책임 배치·구조의 변경 필요성을 먼저 판단한다. 기존 코드나 사용 가능한 API가 있다는 이유로 그 구조를 그대로 따르지 않으며, 문제 해결에 적합한 설계를 정한 뒤 그 기준으로 재사용 여부를 결정한다. macOS의 실행 전 config·shell/cwd 검증 순서 누락과 Web의 불필요한 polling 사례를 이 원칙의 근거로 소비한다.
- 사용자 지시에 따라 Stage4는 package log로 작업하지 않는다. 현재 Base log의 Work Items·Required Context·History로 설계·구현·검증·인계를 관리하며, controlling package log나 package task record를 생성하거나 전환하지 않는다.

### {W1}

- active thread 추적은 새 방식 탐색 대상이 아니다. 사용자가 재확인한 실측 및 baseline §7·context prompt §7·docs/architecture/aiox-vendor-bindings.md의 보존 근거를 재사용한다. Git 8db476bad722717bf82cc598904f3f33af8a90b3:src/adapters/codex/proxy.ts와 tests/unit/adapters/codex-proxy.test.ts의 같은 연결 request ID 대응·thread/start/resume/fork 성공 응답 추적을 현재 구조에 연결한다. 실패 응답으로 thread를 바꾸지 않고 임의 loaded-thread fallback을 복원하지 않는다. 신규 통합 회귀와 지침 지속성·turn 결과 귀속 검증은 별개다.
- 사용자 동반 최종 E2E와 최신 W1 마감 entry의 검증 근거를 소비해 W1 완료를 판정했다. 사용자 보고 화면 결과, 실제 vendor 실측과 소켓 대역 회귀의 범위를 구분한다. Web을 추가 검증할 때는 agent-browser 스킬을 사용한다. 새로운 결함 근거 없이 완료한 사용자 시나리오를 반복하지 않는다.

### {W2,W3,W4,W5}

- 최신 W2 handoff의 D1/D2/D3가 이번 공통 상태 반영 기준이다. Web·agents_list는 aiox-preparing/idle/working/awaiting-user/failed 및 status_reason을 동일하게 표시하며 준비 중도 목록에 포함하되 send 가용성과 분리한다. 기존 MCP 3종 요약은 현재 구현 사실이지 유지 결정이 아니다. 새 계약의 owner 반영과 인접 회귀·필요 실측이 남아 있고 기존 실측을 새 표시 근거로 확대하지 않는다. 한도 확인을 위해 사용량을 일부러 소진하지 않는다. 새 예외 처리·설계가 필요하면 추측하지 말고 사용자에게 묻는다.

## 2026-09-09 · 단계별 확정 요구와 인계 준비

사용자의 단계별 로그 생성 지시에 따라 Required Context에 구현 범위·선행 결과 소비·참고 자료·사전 논의 조건을 기록했다. 아직 이 단계의 구현을 시작하지 않았다. plan이 이 단계를 활성화하면 선행 로그 최신 기록과 실제 코드부터 대조하고 그때 필요한 Work Items를 구성한다. 이번 기록은 기능 구현·외부 참고 자료 검증 결과가 아니다.

### 2026-09-13 20:53 · 두 vendor 관측 상태 일관성 검증 인계

사용자가 Claude 관측 결함 논의의 Codex 대칭성·일관성을 Stage4에도 기록할 필요를 제기했다. Stage4는 착수 전 인계 로그이므로 Work Items를 선구성하지 않고 Required Context에 검증 범위와 Stage2-3 W7의 원본 로그 연결을 추가했다. 공통 기준의 owner는 runtime spec과 vendor-bindings이며 실제 이벤트 계약·식별자·정리 구현은 vendor별로 확인한다.

일관성의 대상은 종료된 해당 요청의 상태 정리, 다른 요청 대기 보존, 현재 상태와 개별 결과 분리 및 MCP/Web 관측 결과다. Claude의 키 구조를 Codex에 복제하거나 Codex 결함을 확정한 것이 아니다. Stage2-3의 Claude 결함 조사·수정 책임은 원본 로그에 남으며 여기로 이관하지 않는다. 현재 활성 단계와 Stage4 미착수 상태는 유지한다.

### 2026-09-13 22:04 · Claude 보완 구현 결과를 vendor 공통 상태 검증에 인계

Stage2-3 W7에서 사용자 승인으로 Claude 도구/대기의 prompt 귀속·정상 완료 정리와 transcript 기반 No·실행 중 Esc 보완을 구현했다. 원본 로그의 최신 전체 541 tests 완료 entry, docs/architecture/aiox-vendor-bindings.md 및 docs/specs/aiox-collaboration.md를 소비한다. 실제 Claude 수집 기록 재생과 daemon Web API/MCP 통합을 검증했고 Windows/Linux 실제 vendor 실행은 미검증이다. 이번 Claude 구현의 polling·transcript·SessionEnd를 Codex에 복제하지 않는다. Codex는 자기 producer 이벤트로 동일한 요청별 정리·타 요청 보존·중단 결과/현재 상태 분리·Web/MCP 일관성을 확인한다. Stage4는 미착수 상태를 유지한다.

### 2026-09-13 22:21 · Claude FileChanged 실측과 새 No parent chain 반례 인계

Stage2-3 W7 최신 FileChanged 실측 entry와 /private/tmp/aiox-w7-filechanged-live/summary.json을 소비한다. Claude 자체 transcript FileChanged 수신은 실측했지만 최초 argv prompt 세션 미발화 원인은 미확정이며 production은 polling을 유지했다. No 두 건에서 거부 결과와 중단 marker 사이 prompt_snapshot attachment가 끼어 기존 직접 parentUuid 검사로는 상태가 해제되지 않는 반례를 발견했다. 이전 541 tests 통과·B′ 재현 범위 완료를 모든 No 해결로 확대하지 않는다. Codex 대칭 검증은 vendor 고유 신호와 실제 연결 구조로 수행해야 하며, 동일 hook/파일 감시 구현을 강제하지 않는다. 이번에는 검증 결과 인계만 하며 Stage4 활성화·Codex 구현·커밋·push는 하지 않았다.

### 2026-09-14 00:32 · Stage4 우선 활성화·Codex 독립 진행과 Claude 교차 검증 분리

사용자가 Stage3보다 Stage4를 먼저 진행하고 Codex 실행·관측·Codex 간 메시지 왕복을 먼저 완성한 뒤 Claude 교차 검증을 수행하도록 승인했다. plan Stage4를 활성화하고 W1~W5를 구성했다. Stage3는 대기이며 Claude 관측 결함을 Codex 독립 구현의 선행 조건으로 두지 않는다. App Server가 구조화된 신호를 제공한다는 점은 진행 근거이나 모든 실제 상태 관측의 성공 보장은 아니므로 W2가 실제 wiring을 검증한다.

active thread 추적은 보존 커밋과 baseline/context prompt의 구현·실측 근거 및 사용자의 이번 재확인을 소비한다. 앞선 agent가 이를 신규 불확실성처럼 제시한 것은 정정됐고 방식 재실험 대신 새 구조 통합 회귀를 수행한다. W4만 Stage3의 필요한 Claude 결과에 의존한다. W1~W3 완료 뒤 Claude가 준비되지 않았다면 의존 항목을 명확히 해 Stage3 작업 후 W4로 돌아오며 Stage4 전체를 먼저 완료 처리하지 않는다.

이번 변경은 pointer·작업 순서·재개 context의 정합화다. 코드 구현·vendor 실행·commit·push는 수행하지 않았다. 다음 행동은 W1에서 공통 실행 경계와 보존 Codex 구현·테스트를 대조하는 것이다.

### 2026-09-14 00:43 · 현재 변경 분할 커밋과 전체 검사 완료

사용자가 현재 변경의 커밋 전략 수립과 각 커밋 실행을 승인했다. 기능·owner·작업 인계 기준으로 네 단위로 나눴다. 088b86f는 Claude prompt별 대기 정리·직접 parent transcript 중단 보완·회귀와 관련 owner, bc48d94는 Web 현재 관측 이유 표시·교체·제거 및 runtime 계약, 841d44f는 나머지 owner locator 정합화·사용자 실측 근거다. 이 기록을 포함한 마지막 단위는 Stage2-3 마감·Stage4 우선 활성화·Claude 교차 검증 분리와 설계 우선·Base log 전용 원칙 및 후속 인계다.

검증: 첫 pnpm check는 sandbox가 /bin/ps 실행을 EPERM으로 차단해 PTY 테스트에서 실패했다. 권한 승인 후 동일 전체 검사를 재실행해 exit0, lint·format·build·typecheck 및 총 542 tests(domain28/config28/protocol10/terminal88/vendor3/persistence13/Web36/Claude74/CLI59/daemon203)를 확인했다. 원문은 /private/tmp/aiox-precommit-check-escalated.txt다. Web 회귀 끝 줄 참조를 1026으로 바로잡고 source/test 참조 범위 검사 및 git diff --check를 통과했다. Claude의 snapshot 경유 No 미해결을 vendor bindings에 명시했으며 polling 제거·전체 중단 관측 해결로 커밋하지 않았다.

production 기능을 추가로 구현하거나 Stage4 W1을 완료하지 않았다. onramp 재개는 Stage4 W1이다. architecture.excalidraw와 무관한 execution-flow-map skill은 제외했다. 이번 승인은 현재 변경 커밋에 한정하며 원격 push나 이후 변경의 자동 커밋으로 확대하지 않는다.

### 2026-09-14 10:42 · W1 실행 연결 설계안 보고·현재 구현 대조

사용자가 W1 설계 계획과 흐름 보고를 요청했다. CLI bootstrap과 daemon의 실제 adapter 목록은 Claude뿐이며 공통 ExecutionOwner는 background·foreground·자원 정리를 제공한다. 보존 커밋 8db476b의 proxy/tests에서 연결별 request ID 대응과 thread/start·resume·fork 성공 응답 추적을 직접 확인했다. 외부 CLI의 협업 단절 시 owner 유지도 현재 코드에서 확인했다.

제안: Relay는 실행 위치의 CLI/daemon 프로세스 안에 두고 owner.own으로 관리한다. Runtime별 App Server는 owner.background, TUI는 owner.foreground로 실행한다. daemon binding은 인증된 제어 연결을 소비하며 협업 cleanup으로 외부 Relay를 닫지 않는다. 별도 Relay child나 공통 supervisor 추상화는 현재 필요가 확인되지 않았다. 제안 상태이며 새 owner 계약이나 구현 완료로 승격하지 않는다.

선행 config·cwd·실행 가능성·주입 충돌 검증 → Runtime/credential 준비 → App Server·Relay 준비 → 같은 terminal의 remote TUI → 성공 응답의 active thread 및 Network 사용 시 MCP initialize 확인을 제시한다. listener 준비와 협업 준비, 실행 전 실패와 시작 후 협업 실패 및 App Server 자체 종료를 구분한다. 부속 stderr·조기 종료 진단을 사용자 terminal과 daemon 관측까지 연결해야 한다. 정상 종료는 TUI/App Server 종료·Relay/자원 정리 확인 후 shell 복귀이며 외부 협업 단절은 실행 유지다.

로컬 codex-cli 0.153.4 help에서 --remote·--remote-auth-token-env 및 app-server --listen·WS 인증 옵션을 확인했다. PATH alias 생성 권한 경고는 있었으나 help/version 출력은 반환됐다. 공식 https://learn.chatgpt.com/docs/app-server 에서 연결별 initialize/initialized와 WS listener readiness 의미를 확인했다. 실제 launch 설정 분배·override 우선순위·인증·주입 지속성·준비 취소와 부속 실패 진단 검증은 남는다. active thread 방식은 기존 실측을 재사용하고 새 구조의 회귀만 수행한다.

W1 active와 기존 next pointer를 유지한다. 이번에는 보고와 기록만 수행했고 production/owner 수정·vendor 실행·commit·push는 없다. W2의 상태/승인/질문 및 W3 메시지 왕복 완료를 W1 준비 완료와 구분한다.

### 2026-09-14 10:50 · W1 active thread 전환 검증 범위 구체화

사용자가 현재 보이는 TUI의 resume·fork·clear·new에서 activeThreadId를 어떻게 검증할지 질문했다. 기존 추적 방식의 재실험이 아니라 새 구조의 통합 회귀로 수행한다. 검증은 TUI가 실제 선택한 대화, 동일 연결의 thread/start·resume·fork 성공 응답 ID, binding의 activeThreadId, 해당 대상으로 전달된 식별 가능한 입력과 화면 표시를 대조한다. W1에서 전환·대상 연결을 확인하고 공통 send를 통한 전체 왕복은 W3가 소비한다.

resume 선택과 취소/실패, fork 원본/새 ID 구분, new/clear의 실제 설치 버전 명령 의미와 RPC, 빠른 연속 전환, 연결 교체 및 전환 중 입력 경계를 포함한다. clear를 새 thread 생성으로 미리 단정하지 않는다. 새 화면이 먼저 열리고 서버 응답이 아직 없는 구간에서 옛 thread에 오배달하지 않는 조건을 검증하며 필요 변경은 관측 근거 뒤 정한다. Runtime 신원·credential은 같은 실행의 대화 전환으로 새로 만들지 않는다. 사용자 확인은 TUI 조작과 현재 화면의 수신 위치에 집중하고 ID/요청 대응 근거 수집은 agent가 수행한다. 이번에는 검증안 보고·기록만 하며 W1 active를 유지한다.

### 2026-09-14 11:27 · W1 구현·실행 검증과 사용자 E2E 인계

사용자가 W1 구현을 승인했고 Web 검증은 agent-browser 사용을 지시했다. 기존 ExecutionOwner·AgentController·외부/foreground CLI 분기를 재사용해 @aiox/adapter-codex를 추가하고 CLI/daemon 조립에 등록했다. 새 adapter가 실행 위치의 Relay 자원, Runtime별 App Server background, 같은 terminal의 remote TUI foreground를 연결한다. Relay와 App Server는 loopback port 0에서 실제 주소를 얻는다. App Server와 Relay·control은 실행별 credential로 인증하며 협업 해제는 control만 닫고 외부 실행 owner를 유지한다. 기존 무관한 execution-flow-map 스킬 변경은 건드리지 않았다.

TDD로 성공/실패 thread 응답 추적·협업 단절 생존·비인증 거절·전환 중 입력 거절·설정 주입/충돌·부모 credential 제거·준비 gating·App Server 실패 진단/token 비노출·TUI instruction override 병합·상대 --cd 단일 적용을 구현하고 Codex 11 tests를 통과했다. input acceptance 경로는 toolOutput+additionalContext이며 delivery 결과 귀속과 working/승인/질문 상태는 W2, 실제 메시지 왕복은 W3~W4의 미완료 범위다. W1 실행 준비를 그 기능 완료로 표시하지 않는다.

실측 발견과 수정: Codex 0.153.4 --remote는 URL path를 거절하므로 Relay root를 TUI 전용으로 사용하고 /control만 분리했다. Network 없는 실행에서 enabled=false만 담은 MCP table은 vendor의 invalid transport 오류를 일으켜 MCP table을 주입하지 않도록 고쳤다. TUI fork/visualization의 명시 developerInstructions가 App Server 지침을 덮어쓰는 경로는 설치 버전 공개 소스(app_server_session.rs)와 회귀로 확인해 AIOX 지침을 병합했다. 상대 --cd를 App Server cwd와 TUI 원본 args에 중복 적용하는 반례는 회귀 후 TUI의 원 launch cwd를 보존해 수정했다.

Web은 agent-browser 전용 aiox-stage4-w1 세션과 격리 daemon에서 실제 Codex 실행, AIOX MCP initialize 후 idle, 브라우저 reload 후 기존 terminal 선택·동일 실행 복원, /new 뒤 동일 Runtime 재준비, /exit와 원 shell의 W1_WEB_SHELL_OK 명령을 확인했다. native 업데이트 안내는 이번 실행만 Skip했다. 기존 사용자 Notion MCP 재인증 경고는 TUI에 그대로 보였고 AIOX MCP 성공과 구분했다. 근거: /private/tmp/aiox-stage4-browser-info.json, /private/tmp/aiox-stage4-first.png, /private/tmp/aiox-stage4-ready.png, /private/tmp/aiox-stage4-reattach.png, /private/tmp/aiox-stage4-new-status.png, /private/tmp/aiox-stage4-shell-return.png. screenshot은 사용자 계정 정보가 포함될 수 있어 공개 산출물로 취급하지 않는다.

외부 실측: /private/tmp/aiox-stage4-external.mjs의 force 및 crash에서 daemon 종료 후 실제 TUI /status·/exit와 원 shell 복귀를 통과했다. 처음 harness가 MCP 초기화/입력 묶음 중 보낸 /status를 실행하지 못해 초기화 대기 및 문자/Enter 분리를 적용했다. 생산 코드의 자동 입력 재전송은 추가하지 않았다. /private/tmp/aiox-stage4-external-1789352244311/results.json은 두 직접 소유 Codex child(TUI/App Server)의 생존과 종료 뒤 제거까지 확인한다. crash 근거는 /private/tmp/aiox-stage4-external-1789352091929/results.json이다. 이 검증은 node-pty로 사용자 terminal을 대체했고 제품 외부 실행은 stdin/out/err를 상속한다.

실제 App Server 프로토콜 검사 /private/tmp/aiox-stage4-protocol-result.json은 Relay·App Server의 비인증 401, App Server config의 실행 지침, thread/start 성공을 확인했다. 입력 이력이 없는 테스트 thread는 fork뿐 아니라 resume도 no rollout found로 거절됐다. 이 결과를 성공 전환으로 포장하지 않으며 성공 응답·실패 응답 회귀와 실제 사용자 이력의 전환 확인을 구분한다. 보존된 active-thread 추적 방식을 새로운 불확실성으로 되돌리거나 loaded-thread fallback을 추가하지 않았다.

vendor-bindings와 system architecture에 현재 실행 연결 및 미완료 관측/메시지/사용자 검증 범위를 반영했다. 검증용 agent-browser와 격리 daemon은 정리했다. macOS 이외 OS의 실제 vendor 인증을 완료로 주장하지 않는다. 사용자가 확인하기 전 W1을 완료하지 않기로 합의했으므로 next는 외부/Web TUI 사용자 E2E다. resume 선택/취소·fork·clear/new의 실제 현재 화면과 수신 대상, 외부 생존·Web 복원·shell 복귀를 함께 확인한다. commit·push는 하지 않았다.

### 2026-09-14 11:28 · W1 최종 전체 검사 완료

상대 --cd 수정까지 포함한 최종 pnpm check가 exit0으로 완료됐다. lint·format·build·typecheck 및 전체 553 tests(Codex11 + 기존542)가 통과했다. 원문은 /private/tmp/aiox-stage4-final-check.txt다. 문서 inline-code 검사, 로그 구조 검사, git diff --check도 통과했다. W1은 사용자 동반 E2E 대기로 active를 유지하며 이번 검사로 사용자 확인을 대체하지 않는다.

### 2026-09-14 12:06 · Codex 수신 표시 규약 복원과 본문·메타데이터 배치 확정

사용자가 현재 Codex 수신 메시지가 화면에 보이지 않는다고 질문했고, 이전 성공 실험에서는 Codex from task 표시 규약을 사용했다고 재확인했다. 조사 중에는 기록하지 말라는 지시를 따랐으며 구현 후 이번 요청으로 기록을 승인받았다. 최초 답변은 toolOutput/additionalContext 필드 존재만 확인해 표시 요구까지 충족한 것으로 읽힐 수 있었으므로 정정했다.

확인한 원인: 설치된 codex-cli 0.153.4의 공개 소스에서 TUI는 codex_tui 또는 codex_app namespace, create_thread 또는 send_message_to_thread 이름, codex_delegation/source_thread_id/input wrapper를 인식해야 Sent by Codex from task 문구와 본문을 추가한다. 기존 binding은 aiox/send와 일반 본문이어서 이 조건에 맞지 않았다. 근거는 https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/tui/src/dynamic_tools.rs 의 parse_delegated_tool_output·delegated_prompt 및 https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/tui/src/chatwidget/replay.rs 의 FunctionCallOutput 처리다. 소스 대조 결과이며 이번에 사용자 화면의 실패를 실측 재현한 것은 아니다.

사용자 확정: Codex로 보내는 모든 메시지는 binding 공통 전송 지점에서 표시 규약으로 감싼다. task 자리에는 실제 thread ID 대신 발신자 이름을 넣는다. Runtime 생성에서 name 미지정은 id, role/description 미지정은 null로 정규화된다. toolOutput은 codex_tui/send_message_to_thread와 wrapper로 감싼 from.name·content, additionalContext.aiox는 kind=untrusted 및 JSON 문자열인 from(name/role/description)·createdAt이다. deliveryId와 daemon의 Network/route·내부 저장 및 결과 연결 정보는 모델 입력에 넣지 않는다. 단방향 안내가 붙은 전달 본문 전체를 감싸며 daemon 완료·실패 알림도 같은 경로로 발신자 AIOX를 사용한다. Sent by Codex 고정 문구 자체를 바꾸는 구현은 아니다. 기존 채택 근거는 logs/artifact/AIOX-TUI-Product-Context-Prompt.md §7과 docs/specs/aiox-collaboration.md다.

반영: packages/adapters/codex/src/binding.ts의 codexInput을 deliver에서 공통 호출하며 이름과 본문의 &, <, >를 이스케이프한다. 사용자 피드백에 따라 새 WebSocket payload 통합 테스트 대신 binding.test.ts에서 변환 결과를 직접 검증했다. 일반 이름·ID 대체 이름·AIOX 알림·특수문자 및 메타데이터 보존 4 cases를 추가했다. Red에서 변환 함수 미구현 실패, Green에서 Codex 패키지 전체 16 tests 통과를 확인했다. 기존 소켓 테스트는 sandbox listen EPERM으로 실패해 승인 후 재실행했다. 패키지 build·typecheck, 변경 파일 oxlint·oxfmt, git diff --check를 통과했다.

수정 후 실제 TUI 표시와 메시지 왕복 E2E는 아직 재확인하지 않았다. W1 사용자 동반 E2E와 W3 왕복 검증에서 이번 변경을 소비한다. 기존 W1 active·후속 미완료를 유지하며 전체 repo 검사·commit·push는 이번에 수행하지 않았다.

### 2026-09-14 12:26 · W1 사용자 동반 E2E 결과와 선택창 수정·환경 정정 인계

사용자가 대화 중 로그 기록을 보류했다가 이번에 우선 기록을 지시했다. 아래 화면·응답 결과는 사용자가 직접 조작하고 보고한 근거이며, agent가 모든 화면과 RPC를 직접 수집한 것으로 확대하지 않는다. W1은 active로 유지한다.

사용자 검증 중 /resume에서 Failed to start TUI session picker: failed to connect to remote app server 오류가 발생했다. 당시 두 TUI/App Server 프로세스와 Runtime idle은 유지됐다. Codex 0.153.4 공식 tui/src/app/event_dispatch.rs의 OpenResumePicker와 tui/src/lib.rs의 start_app_server_for_picker는 별도 원격 연결을 생성하지만, W1 relay.ts는 기존 TUI가 있으면 추가 연결을 1013으로 종료했다. 사용자가 수정을 승인해 추가 연결을 허용하고 요청 ID를 연결별로 대응시켰다. 성공한 thread 응답의 연결을 입력 대상으로 사용하며 선택창 종료가 현재 thread/연결을 지우지 않게 하고, 입력 응답·실패 정리도 upstream 연결에 귀속했다. relay.test.ts의 추가 연결·동일 request ID 충돌·선택창 종료 후 입력 대상 보존·연결 교체와 종료 회귀는 수정 전 실패, 수정 후 통과했다. 전체 pnpm check 554 tests 통과 근거는 /private/tmp/aiox-w1-picker-check.txt다. 격리 Web의 agent-browser에서 실제 /resume 선택창 열기·Esc 취소·취소 후 /status를 확인했다. /private/tmp/aiox-w1-picker-open.png와 /private/tmp/aiox-w1-picker-cancel.png는 계정/개인 대화 정보가 포함될 수 있는 로컬 근거다. 격리 daemon과 전용 브라우저는 종료했다.

이후 사용자가 다른 agent와 수정한 직전 수신 표시 규약 entry를 소비했다. codexInput과 binding.test.ts를 확인하고 pnpm build 및 Codex 16 tests를 다시 통과시켰다. build 근거는 /private/tmp/aiox-w1-restart-build.txt다. 554 전체 검사는 수신 표시 4 cases 추가 전의 결과이므로 현재 전체 558 tests 통과로 주장하지 않는다. 수정 빌드로 daemon을 재시작한 뒤 아래 사용자 검증을 진행했다.

사용자 보고에 따른 Web 전환·입력 결과:

| 경로 | Session ID / 확인 결과 |
| --- | --- |
| 최초 A, 이후 /new로 B | A=01a09dc3-325b-7892-8c74-39493bcd2c1b, B=01a09dc7-2d9d-7fc1-842e-c68e7f748603. 각각 고유 검증 입력에 응답. 이 최초 결과는 수신 표시 수정 전이다. |
| 수정 후 /resume으로 B 선택 | B ID 일치. W1-RESUME-B-01 수신 표시의 발신자·본문과 응답을 사용자 확인. |
| /resume 열기 후 Esc 취소 | B ID 유지. W1-CANCEL-B-01 수신·응답 확인. |
| B에서 /fork | C=01a09dea-4aa3-7543-8497-6fb98dcd0397로 변경. W1-FORK-C-01 수신·응답 확인. |
| C에서 /clear | D=01a09deb-d0a7-7c63-8de4-2b709850ee4a로 변경. W1-CLEAR-D-01 수신·응답 확인. 이 설치 버전과 실행의 관측이며 모든 버전의 clear 의미로 일반화하지 않는다. |
| /new 후 /resume으로 B 복귀 | B ID 일치. W1-RETURN-B-01 수신·응답 확인. |
| 브라우저 새로고침 후 기존 수신자 terminal 재선택 | B ID·대화 유지. W1-RECONNECT-B-01 수신·응답 확인. |
| 두 Web Codex에서 각각 /exit | 기존 shell에서 W1_SHELL_OK, W1_SENDER_SHELL_OK 출력 확인. |

실제 외부 terminal 검증: 사용자가 OS terminal에서 w1-external을 실행하고 AIOX MCP 연결을 보고했다. agent list --json에서 Runtime 9ce7e02c-06a2-40b6-9b8e-0f6a0c1e481f, terminalId=null, idle, Network f8e0bd1e-7586-4cb0-8130-c39b558d3a29를 직접 확인했다. agent가 daemon stop의 daemon stopped 출력을 확인했고, 사용자는 외부 Codex에서 /status 화면·정보가 계속 출력됨을 확인했다. 이후 /exit와 원 shell의 W1_EXTERNAL_SHELL_OK 출력도 확인했다. 마지막 실행 상태는 daemon 종료다. Network w1-e2e는 앞선 재시작에서 보존됐으며 이번 기록 중 daemon을 다시 시작하지 않았다.

환경 정정: 앞선 agent의 daemon 재시작은 실행 환경의 NO_COLOR=1을 상속했다. ps의 색상 변수만 추린 출력과 Web shell의 daemon 환경 상속 코드를 확인했으며 이를 색상 소실의 원인으로 판단했다. 생산 코드에 NO_COLOR를 추가한 변경은 아니다. 사용자 지시와 다른 agent 작업 대기 후 env -u NO_COLOR로 재시작했고 PID 89589에서 NO_COLOR 부재, TERM=xterm-ghostty, COLORTERM=truecolor를 확인했다. 색상 복원 자체는 사용자에게 별도로 확인받지 않았다. 사용자가 요청한 기타 임의 주입 항목 전체 점검은 대기 지시로 중단됐고 이후 완료 근거가 없으므로 남은 일로 보존한다.

판정과 next: 현재 대화 ID 및 고유 메시지의 수신·응답, Web 복원·양 실행의 shell 복귀, 외부 실행의 daemon 종료 후 생존은 위 사용자/명령 근거로 확인했다. 이번 사용자 세션에서 성공 RPC thread.id·Relay/binding activeThreadId·주입 turn/start.threadId 네 값을 동시에 캡처하지는 않았다. /new→/resume 후 최종 입력 성공을 전환 도중 입력 차단의 실측으로 확대하지 않는다. 소유 프로세스·Relay 자원 종료 및 전환 중 입력 경계는 기존 회귀/실측 근거와 현재 수정본의 영향 범위를 대조하고, 빠진 부분만 보완해야 한다. 최신 수신 표시 규약의 owner 문서 정합과 환경/옵션 주입 점검도 확인한 뒤 W1 완료 여부를 판정한다. W2 상태·결과 귀속과 W3 전체 왕복 완료를 이번 단방향 검증 입력에 대한 화면 응답으로 대체하지 않는다. 이번 턴은 기록·재개점 정리만 하며 production 코드 수정·commit·push는 하지 않는다.

### 2026-09-14 13:01 · Web Codex 이미지 첨부 경로 확인과 사용자 해결 판정

사용자가 Web terminal의 Codex에서 이미지 붙여넣기가 보이지 않는다고 보고했다. 처음에는 브라우저 이미지 업로드→daemon 임시 파일→경로 입력을 제안했으나, 같은 Mac에서 실행하는 현재 사용 조건과 Codex 자체 클립보드 처리를 확인하지 않은 과도한 제안이었으므로 철회했다. 이미지 데이터를 정책적으로 금지하는 문제가 아니며 fullscreen 여부가 원인이라는 근거도 없다.

직접 확인한 코드: apps/web/src/attach.ts는 xterm 입력을 PTY로 전달하고 별도 이미지 paste/upload 처리를 두지 않는다. 설치된 @xterm/xterm/src/browser/Clipboard.ts:45-47의 브라우저 paste는 text/plain을 읽는다. Codex 0.153.4 공개 소스 tui/src/chatwidget/interaction.rs:82-107은 Ctrl+V 또는 Alt+V를 paste_image_to_temp_png→attach_image로 연결한다. clipboard_paste.rs는 실행 머신의 OS 클립보드에서 파일 목록 또는 이미지 데이터를 읽어 임시 PNG를 만든다. 확인한 소스 사본은 /private/tmp/aiox-w1-interaction.rs와 /private/tmp/aiox-w1-clipboard.rs이며 원본은 https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/tui/src/chatwidget/interaction.rs 및 같은 버전 tui/src/clipboard_paste.rs다.

따라서 브라우저의 Cmd+V와 Codex의 Ctrl+V/Alt+V는 다른 입력 경로다. 사용자는 주로 cmux에서 Cmd+V로 이미지 첨부를 해 왔다고 설명했고, 단축키 차이 안내 뒤 현재 문제를 해결된 것으로 판단했다. 이는 사용자 해결 판정이며 agent가 첨부 이미지의 모델 수신까지 새 E2E로 수집한 증거는 아니다. cmux 내부 처리도 직접 검증하지 않았다. 현재 같은 Mac 조건에서는 daemon 파일 업로드 기능을 추가하지 않기로 했으며 production 변경은 없다. 다른 머신의 브라우저 클립보드를 원격 daemon으로 전송하는 기능이 구현됐다는 뜻은 아니다.

### 2026-09-14 13:03 · W1 주입 감사·연결과 종료 검증·전체 검사 완료

사용자가 남은 환경·옵션 감사, 내부 연결·자원 정리 대조, 최신 전체 검사와 owner/log 정합을 수행하고 W1을 마감하도록 지시했다. 직전 사용자 동반 E2E 결과와 이미지 문제 해결 판정을 소비했다. 새로운 사용자 E2E를 반복하거나 daemon을 재시작하지 않았다.

주입 감사: CLI bootstrap의 환경/인자 수집→AgentController의 공통 협업 지침+사용자 instruction 합성→Codex prepareLaunch→ExecutionOwner→native spawn/daemon PTY를 추적했다. W1의 명시 추가는 App Server developer_instructions, Network가 있을 때 aiox MCP table과 AIOX_MCP_TOKEN, loopback 임시 listener·capability-token 인증/hash, TUI remote 주소·token-env 이름과 AIOX_CODEX_RELAY_TOKEN이다. 사용자 -c/--enable/--disable은 App Server에도 전달하며 --cd는 server cwd에 한 번 적용하고 TUI 원본 인자는 유지한다. 상속 AIOX_*는 제거한다. W1 production에는 NO_COLOR/FORCE_COLOR, 모델·reasoning·sandbox·승인·fullscreen을 임의로 강제하는 추가 설정이 없었다. 기존 launch.test에 server argv와 양쪽 env 전체 비교를 보강해 명시 주입 외의 추가를 검출하게 했다.

상속은 명시 주입과 구분한다. daemon spawn은 env를 별도 지정하지 않으며 Web shell도 AIOX_* 외의 daemon 환경을 상속한다. 현재 agent 도구 환경의 키만 조회한 결과 NO_COLOR 외 CODEX_CI, CODEX_MANAGED_BY_NPM, CODEX_MANAGED_PACKAGE_ROOT, CODEX_PERMISSION_PROFILE, CODEX_SANDBOX, CODEX_SANDBOX_NETWORK_DISABLED, CODEX_SESSION_ID, CODEX_THREAD_ID, PAGER/GIT_PAGER와 terminal 변수가 존재했다. 이 키들도 일반 상속 후보이며 W1에서 새로 넣은 값은 아니다. 이미 종료된 사용자 daemon의 전체 환경은 수집하지 않았으므로 당시 모두 존재했다거나 영향이 없었다고 주장하지 않는다. 앞선 NO_COLOR 제거는 실행 명령의 env -u 조치였으며 영구 환경 필터를 구현한 것이 아니다. 기존 shell integration의 zsh ZDOTDIR/interactive wrapper도 W1 변경이 아님을 확인했다. 사용자 환경·설정을 광범위하게 삭제하거나 임의 재작성하지 않았다.

연결/정리 검증: 기존 relay 회귀가 같은 연결의 성공 응답만 추적하고 실패 응답은 기존 ID를 보존하며, 추가 선택창의 동일 request ID 충돌·연결 교체·전환 중 Relay 입력 거절을 검증함을 재확인했다. index.test의 기존 통합 테스트를 보완해 실제 control WS를 거치는 binding.deliver가 thread-A로 turn/start를 보내고, resume pending의 starting에서 입력을 거절하며, 성공 후 thread-B로 보내는지 확인했다. binding cleanup 뒤 TUI 생존, owner.stop 뒤 foreground stop·TUI/upstream 종료·Relay 포트 ECONNREFUSED도 검증했다. relay.test에는 선택창 보조 연결이 열린 채 owner 자원 정리를 실행해 보조 client/upstream·control 종료와 listener 폐쇄를 확인하는 assertion을 추가했다. 이 소켓 테스트의 App Server는 대역이며 실제 vendor 결과로 과장하지 않는다.

실제 App Server 자원 종료는 /private/tmp/aiox-stage4-external-1789352244311/results.json의 App Server/TUI 두 child 목록과 bothChildrenRemoved=true를 다시 확인했다. SIGKILL 협업 단절 실측은 /private/tmp/aiox-stage4-external-1789352091929/results.json의 shell 복귀 근거이며 두 child 종료 증거를 따로 가진 결과로 확대하지 않는다. 최신 변경은 picker 연결 범위와 입력 표시 변환이고 App Server 생성/ExecutionOwner 종료 경로는 해당 실측 이후 변경되지 않았다. 외부 runExternal은 자연 종료 후 owner 전체 정리를 기다리고, daemon AgentController는 Web owner 정리와 외부 control release를 분리함을 코드와 공통 회귀로 대조했다. 사용자 수신 확인은 최신 표시 변경을 포함하며 전환 중 race의 직접 실측은 기존처럼 주장하지 않는다.

검증 결과: 보완한 Codex 16 tests 통과 후 최종 pnpm check exit0. lint·format·build·typecheck와 전체 558 tests(domain28/config28/protocol10/terminal88/vendor3/persistence13/Web36/Claude74/Codex16/CLI59/daemon203)가 통과했다. 최종 원문은 /private/tmp/aiox-w1-closeout-final-check.txt다. 앞선 같은 턴의 /private/tmp/aiox-w1-closeout-check.txt도 558 통과지만 추가 assertion 전이므로 최종 근거와 구분한다. 이번 변경은 production 수정 없이 기존 세 테스트 보강과 문서/로그 정합이다.

owner 반영: vendor-bindings의 Codex 실행 절에 선택창 보조 연결의 소유/요청 대응, 수신 wrapper와 표시용 발신자·실제 입력 대상 구분, 사용자 E2E와 소켓 회귀의 증거 범위를 반영했다. system/storage-terminal의 남아 있던 Codex 후속 구현 표기를 현재 실행 연결에 맞췄다. runtime/collaboration spec·product 진입점·문서 inbound 관계를 대조했으며 새 계약·문서 구조·Host 또는 관측 완료 범위는 만들지 않았다. Markdown inline-code와 git diff --check를 통과했다.

완료 판정: W1의 실행·주입·수명 연결, 사용자 동반 현재 대화/입력 수신, 내부 대상 대응·전환 차단·소유 자원 종료 근거가 충족돼 W1을 completed로 바꾸고 다음 재개점을 W2로 옮긴다. W2의 turn 결과/승인·질문 관측, W3 전체 메시지 왕복, W4 Claude 교차 검증, W5 통합 마감은 미완료다. Stage4 로그는 open이고 plan Stage4 active를 유지한다. 다른 OS 실제 실행은 기존 Stage8 검증 조건에 남으며 이번 macOS 근거로 확대하지 않는다. commit·push는 수행하지 않았다.

### 2026-09-14 15:37 · W2 선행 관측: 실제 App Server 신호와 현재 Relay 소비 경계

사용자가 상태 연결 설계 전에 실제 관찰 가능한 신호를 먼저 확인해야 한다고 지적했다. 이를 W2의 선행 조사로 적용하며 production·owner 계약은 아직 바꾸지 않는다.

직접 확인: 설치된 codex-cli 0.153.4의 `app-server generate-ts`를 /private/tmp/aiox-w2-codex-schema에 생성했다. 버전별 schema에는 turn/start 응답의 turn.id, turn/started·turn/completed의 threadId/turn.id/status(completed/failed/interrupted/inProgress), item 이벤트의 threadId/turnId/item.id, 서버 요청의 request id와 threadId/turnId/itemId, serverRequest/resolved의 threadId/requestId가 있다. 이는 발생 실측이 아니라 해당 설치 버전의 wire shape 근거다. 공식 같은 버전 README도 확인했다: https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/app-server/README.md.

실제 vendor 실측: /private/tmp/aiox-w2-live-probe.mjs로 별도 stdio App Server의 ephemeral thread에서 도구를 쓰지 않는 짧은 turn 하나를 실행했다. thread.id=01a09ea0-a1e6-7870-b53e-6664338e17f1, turn.id=01a09ea0-a2a8-7b62-92ad-38a965ac9e04가 turn/start 응답에 있었고, 같은 thread/turn의 turn/started(inProgress), userMessage와 agentMessage의 item/started·item/completed, thread/status/changed(active→idle), turn/completed(completed)를 받았다. 이 실험은 별도 App Server 직접 연결이며 AIOX Relay/TUI/Web/MCP E2E가 아니다. 승인·질문·실패·중단은 발생시키지 않았으므로 schema 정의를 live 보장으로 승격하지 않는다. 최초 sandbox 실행은 ~/.codex SQLite 상태 초기화 권한 문제로 실패했고 승인된 실행에서 실측했다. probe 프로세스는 종료했고 잔존 `codex app-server --stdio` 프로세스가 없는 것을 확인했다.

현재 코드 대조: relay.ts는 TUI upstream 이벤트를 TUI client로 넘기지만 control 연결에는 threadId/error 상태와 입력 수락 response만 전송한다. turn/start 성공 응답의 result는 control까지 오나 binding.ts는 pending Promise를 void로 해소해 turn.id를 보존하지 않는다. Codex Binding의 setActivity는 준비/전환/연결 실패에서만 호출되고 controls.settle은 호출하지 않는다. 따라서 현재 Web/MCP의 Codex activity는 실제 turn 진행·승인/질문 대기·개별 delivery 결과를 반영한다고 할 수 없다. 이는 코드 확인에 따른 현재 구현 판정이며 모든 vendor 이벤트의 전달 가능성 판정은 아니다.

다음은 실제 TUI+Relay 경로에서 이벤트가 어느 연결에 오는지, 승인·질문·해소·중단/실패가 실제 발생할 때 어떤 식별자와 순서로 관찰되는지 별도로 확인한다. 직접 실측, 생성 schema, 대역 회귀를 분리하고 그 뒤에 최소 상태 연결 흐름을 제시한다. W2 active와 W3~W5 open을 유지하며 이번에는 production 수정·commit·push를 하지 않았다.

### 2026-09-14 16:39 · W2 사용자 동반 TUI 관측 결과와 AIOX 메시지 귀속 우선 인계

사용자가 로그 기록을 보류한 상태에서 직접 TUI와 상호작용하고 agent가 RPC를 관측하는 실험을 제안했다. 일반 응답부터 승인·질문·중단·도구 실패까지 함께 확인한 뒤 이번 요청으로 기록을 승인했다. 아래 결과는 사용자의 화면·조작 보고와 agent가 읽은 실제 wire를 결합한 근거다. production 상태 연결 구현이나 Web/MCP 소비 완료로 확대하지 않는다.

실험 구성과 근거: cmux `workspace:11`(이름 `W2 Codex 관측`, surface:80)에 `/private/tmp/aiox-w2-interactive-uqef4_bg/run.mjs`로 실제 Codex TUI와 App Server를 실행했다. 작업 cwd는 같은 디렉터리의 `work`, 관측은 현재 `packages/adapters/codex/src/relay.ts`의 임시 사본 `relay.mts`에 양방향 frame 수집을 추가한 것이다. 연결별 번호·UTC 시각·방향·JSON RPC는 `wire.jsonl`, 실행 위치·PID·주소는 `ready.json`, 서버 진단은 `server.stderr`에 있다. TUI↔Relay↔App Server WS를 관측했으며 AIOX daemon/Binding control을 붙인 실행은 아니다. 모델·승인·sandbox를 실험 harness에서 강제하지 않고 기존 사용자 설정을 사용했으며 승인 실험은 프롬프트에서 해당 도구 호출의 require_escalated를 명시했다. 일반 입력에서 on-request와 gpt-5.6-sol/low를 관측했다. 자료는 로컬 임시 파일이며 repo에 원문을 복사하지 않았다. token/authorization/secret 이름의 필드는 수집 시 마스킹하므로 `isSecret` 같은 비밀 여부 boolean도 원값이 보존되지 않은 한계가 있다. 설정·사용자 입력이 포함되므로 원문 전체가 공개 가능한 자료라는 뜻은 아니다.

준비 중 조작 오류: 업데이트 안내에서 agent의 `Down` 키가 cmux에 거절됐지만 이어진 Enter가 Update now를 선택해 `npm install -g @openai/codex`가 시작됐다. 화면에서 SIGINT 종료를 확인하고 사용자에게 오류를 알렸다. 이후 `codex --version`은 0.153.4였고 최초 harness의 `closed.json`에는 App Server exit0가 있었다. 다시 실행한 뒤 업데이트 선택은 사용자에게 맡겼다. 패키지 전체 무변경을 검사한 것은 아니므로 버전 확인 이상으로 주장하지 않는다. 이 `closed.json`은 최초 실행 종료 근거이며 재실행된 현재 실험 종료 근거로 사용하지 않는다.

실측 결과(아래 시각은 KST이며 wire의 UTC에 +09:00):

| 시나리오 | 직접 확인한 RPC·결과 |
| --- | --- |
| 일반 입력 W2-HELLO-01 | turn/start 응답의 turn.id → thread active → turn/started → userMessage 시작·완료 → agentMessage 시작·완료 → idle → turn/completed(completed). 사용자 입력·응답 본문 및 thread/turn/item ID를 수신했다. |
| sample.txt 읽기 | on-request에서 승인 요청 없이 commandExecution으로 `cat sample.txt`를 실행했다. 시작에 command/cwd/processId, 완료에 같은 item ID·status=completed·exitCode=0·aggregatedOutput의 파일 내용이 있었다. turn도 completed였다. 모든 도구가 승인을 요구하는 것은 아니다. |
| pwd 승인 허용 | waitingOnApproval → commandExecution 시작(processId=null) → item/commandExecution/requestApproval(id=0, threadId/turnId/itemId·명령·사유) → TUI decision=accept → resolved(requestId=0) → activeFlags=[] → 같은 도구 완료(exitCode=0, processId·출력 있음) → idle·turn completed. item/started만으로 OS 프로세스가 이미 실행됐다고 판정하면 안 된다. |
| pwd 승인 취소 | request id=1에 TUI decision=cancel → resolved(1) → commandExecution declined(processId/exitCode=null) → activeFlags=[] → idle → turn interrupted. 이번 선택의 실제 wire 값은 cancel이며 모든 거부 UI/정책으로 일반화하지 않는다. |
| 도구 시작 전 Esc | 첫 sleep 요청은 commandExecution 시작을 받기 전에 turn/interrupt가 왔고 idle·turn interrupted로 끝났다. 실행 중인 명령의 중단 근거로 사용하지 않는다. |
| 실행 중 Esc와 늦은 완료 | 두 번째 sleep은 15:53:39 commandExecution 시작, 15:53:44 turn/interrupt·idle·turn interrupted, 15:53:47 같은 도구 terminalInteraction을 받았다. 사용자는 background terminal running 표시 뒤 Esc를 눌렀다고 보고했다. OS `sleep 60` PID 385가 이후에도 살아 있었고, 15:54:39 같은 thread/turn/item에 item/completed(status=completed, exitCode=0, durationMs=59903)가 왔다. 이후 PID 부재도 확인했다. turn 중단이 background 명령 종료를 뜻하지 않았고, 늦은 도구 성공이 turn interrupted를 바꾸지 않았다. wire processId=2617과 OS PID=385는 다른 값이므로 혼용하지 않는다. |
| Default 모드 질문 | 선택창 대신 agentMessage(delivery=async, questions의 제목·빨강/파랑 선택지)가 왔다. 해당 구간에 item/tool/requestUserInput·waitingOnUserInput은 없었다. 사용자의 빨강 입력은 turn/steer(expectedTurnId)로 들어갔고 응답의 turnId·userMessage·최종 답변은 모두 원 질문 turn에 귀속됐다. 이후 idle·turn completed. 새 turn 생성이나 서버 request 응답 방식으로 기록하지 않는다. |
| 도구 실패 | `sh -c 'exit 7'`의 commandExecution은 failed·exitCode=7, 모델 답변은 종료 코드 7, thread는 idle, turn은 completed·error=null이었다. 도구 실패를 Runtime/delivery/turn 전체 실패로 승격할 수 없다. |
| Plan 모드 질문 제출 | 사용자가 /plan 전환 후 질문 요청. waitingOnUserInput → item/tool/requestUserInput(id=2, threadId/turnId/itemId, question id=preferred_color, isBlocking=true, autoResolutionMs=null). TUI answers.preferred_color.answers=[파랑] → resolved(2) → activeFlags=[] → 최종 답변 → idle·turn completed. 마지막 답변의 일반 질문 문장(어떤 계획을 작성할까요?)에는 새 대기 요청이 없었으므로 문장만으로 대기를 추론하지 않는다. |
| Plan 질문창 Esc | waitingOnUserInput·request id=3 → TUI turn/interrupt → idle → turn completed(interrupted) → resolved(3). 질문 answers 응답 없이 중단됐고 resolved는 turn 종료 뒤에 왔다. 사용자는 Conversation interrupted 표시를 보고했다. |

ID locator: 최초 화면 thread는 `01a09eab-ed29-7333-b5cf-b64833732416`, 두 번째 sleep turn은 `01a09eb1-4ea1-70b2-b4a4-c758f6689df1`, item은 `exec-b27e7495-720c-4eae-b691-b58df0c80177`이다. 후반 질문·도구 실패의 화면 thread는 `01a09eb3-ca79-7562-b932-74bd6fc9bd78`, async 질문과 빨강 답변의 turn은 `01a09eb3-f2d3-7990-8baa-36afc2951afa`, Plan 제출 turn은 `01a09eb7-1ae4-78b3-97dc-6b944c39ef5a`, Plan 취소 turn은 `01a09eb8-7ea8-75d3-af04-c1f119c494c7`이다. 후반 화면에 앞선 세션 종료 안내가 있었으나 두 화면 thread 사이의 사용자 전환 조작은 이번 대화에서 확정하지 않았다.

새 반례 후보: 같은 TUI 연결에 제목 생성용 `thread/start(ephemeral=true)`와 별도 turn이 실제로 섞였다. 첫 제목 thread는 `01a09eac-8d96-7633-b9c4-cf23b18f41a2`이며 요청 본문에 제목 생성 지시, 결과에 제목 JSON이 있었다. 후반 새 화면 thread에서도 같은 패턴을 관측했다. 현재 Relay는 thread/start/resume/fork 성공 응답을 입력 대상으로 선택하므로 이 임시 thread를 선택할 가능성이 코드와 실측의 대조에서 드러났다. 실제 AIOX 메시지를 오배달한 실측이나 수정은 아직 없다. 기존 W1 완료 결과를 모든 보조 thread의 안전성 보장으로 확대하지 않으며 이 발견을 W2 입력 귀속 검증에서 먼저 소비한다.

판단과 다음 순서: 사용자는 복수 대기 보존·실제 turn 실패·AIOX 메시지 귀속이 필요한 상황을 질문했다. 복수 대기는 실제 미해결 요청이 동시에 존재할 때 한 요청 해소가 다른 대기를 지우지 않는 조건이며 이번에는 동시 발생을 실측하지 않았다. 자연스러운 producer 경로부터 확인하고 필요 확인 없이 복잡한 상태를 만들지 않는다. 실제 turn 실패는 이번 exit7과 달리 turn 자체의 failed/error 경로이며 아직 미측정이다. 계정·네트워크를 임의로 훼손하지 않고 격리 재현 방법을 정한다. 가장 먼저 AIOX 입력 수락→해당 thread/turn 처리→delivery 결과·발신자 알림 귀속을 실측하자는 제안에 사용자가 동의했다. 현재 idle 입력과 busy 입력의 실제 toolOutput/additionalContext 경로를 확인하고, 제목용 임시 thread 오선택 가능성을 함께 검증한다. 사용자 turn/steer의 성공을 AIOX turn/start 주입의 busy 동작 보장으로 대체하지 않는다. 복수 대기와 실제 turn 실패는 이 연결에 필요한 남은 검증으로 좁힌다.

현재 상태와 인계: 기록 직전 ready.json의 harness PID 92735, App Server launcher PID 92739, TUI launcher PID 92756의 존재를 ps로 확인했다. cmux workspace:11과 임시 실행은 종료하지 않았다. 이 숫자는 재개 때 재검증하며 pid만 믿고 종료하지 않는다. wire는 계속 추가될 수 있으므로 위 시나리오의 thread/turn/item/request ID와 시각으로 자료를 선택한다. 전체 파일 마지막 시각까지의 모든 사건을 분석했다는 뜻은 아니다. 임시 자료가 사라졌으면 이번 entry의 증류 근거와 미검증 경계를 사용하며 원문이 남았다고 가정하지 않는다.

W2는 관측 조사만 진전됐으며 상태 연결·Web/MCP 소비·delivery settle 구현과 검증은 미완료다. W1 completed, W2 active, W3~W5 open과 plan Stage4 active를 유지한다. 다음은 AIOX 메시지 귀속 실험 준비다. production·owner 문서 수정, 전체 검사, commit·push는 이번에 수행하지 않았다. 임시 스크립트는 Node 구문 검사·Relay import 확인과 실제 사용자 실측으로 실행을 확인했으며 기존 558 tests를 이번 변경의 새 검사 결과로 주장하지 않는다. owner 반영 시 vendor-bindings의 관측 표와 runtime/collaboration의 현재 activity·개별 결과 경계를 이번 실측과 대조해야 한다.

### 2026-09-14 16:56 · W2 AIOX idle 입력 귀속 실측과 완료 연결 누락 확인

사용자가 AIOX 메시지 귀속 실험 진행을 승인했다. 기존 관측 harness는 살아 있으나 daemon/control credential을 외부로 제공하지 않는 구성이라 유지하고, cmux workspace:12 / surface:81에 `/private/tmp/aiox-w2-attribution-6wq2rlul/run.mjs`로 별도 실험을 열었다. 임시 DB·port 0 daemon, 시험용 발신 Runtime과 MCP SDK client, 실제 CodexBinding 및 실제 TUI/App Server를 연결했다. Relay는 이전 관측 사본을 재사용하고 relay→server/control 송신 기록만 추가했다. 수신 준비·입력·결과는 production Binding을 사용하지만 launch 수명 조립은 harness이므로 CLI/AgentController E2E 또는 실제 두 Codex 간 왕복 근거는 아니다. 발신 vendor는 notification 수집 대역이며 실제 발신 LLM을 실행하지 않았다. A→B만 허용했다. 사용자 설정의 모델·sandbox·승인은 유지했고 업데이트 안내만 실행별 check_for_update_on_startup=false로 껐다. 기존 notion MCP의 재인증 경고가 있었으나 AIOX MCP는 연결돼 수신 Runtime이 idle에 도달했다.

직접 확인: 16:55:19 KST 인증된 MCP send로 W2-IDLE-01 한 건을 전송했다. messageId=`22319269-108f-418d-9713-2533ae97bbb4`, deliveryId=`48f159ba-5e11-400d-863b-fcbf50dcb75b`, origin Runtime=`3437cbf4-209c-493b-bd01-f6f3f105dc62`, target Runtime=`fb6da0ad-e72e-4d73-942e-b2f0379d31f2`. Binding→Relay→turn/start의 toolOutput 본문과 additionalContext 메타데이터를 확인했다. 대상 thread=`01a09ee6-9a68-7310-8bd9-8b7578666d50`, 응답 turn=`01a09ee9-d2ac-79f1-bc87-316cd78d4042`; 같은 turn의 시작, agentMessage `W2-IDLE-01-RECEIVED`, 16:55:21 completed·error=null을 받았다. cmux 화면에서도 발신자 이름·메시지·단방향 안내와 답변을 확인했다. 이 시점까지 사용자 별도 화면 확인 답변은 아직 없다.

완료 뒤 DB 조회는 accepted=true, reverseRouteAtSend=false이나 outcome/outcomeAt/outcomeError=null이고 notifications=[]였다. 발신자 notification 대역에도 완료 통지가 없었다. Binding이 입력 수락 response의 turn.id를 버리고 controls.settle을 호출하지 않는 기존 코드 판정이 이번 실측과 일치한다. 수신·turn 완료를 AIOX delivery 완료로 연결하지 못하고 있으며 성공으로 처리하지 않는다. 최초 AIOX 입력 구간에는 제목용 ephemeral thread가 발생하지 않아 오선택 문제는 아직 미검증이다.

증거는 같은 임시 경로의 wire.jsonl, aiox.jsonl, db.sqlite, ready.json, server.stderr다. 원문은 설정·프롬프트를 포함하므로 공개용 자료로 간주하지 않으며 credential은 argv/출력에 기록하지 않았다. node --check(run.mjs/relay.mts)와 adapter-codex build를 통과했고 실제 한 건의 MCP 수락·wire·화면·DB를 대조했다. production source/owner 수정, 전체 검사, commit/push는 없다. command.mjs snapshot/send는 mode 0600의 임시 Unix socket을 통해 harness를 조작한다. 기존 workspace:11도 유지한다.

다음은 사용자가 workspace:12에서 `W2-BUSY-BASE: sleep 60을 실행하고 자연 종료를 기다린 뒤 W2-BUSY-BASE-DONE이라고 답해.`를 입력하면 실행 중에 별도 AIOX 메시지를 한 건 보내 귀속을 관찰하는 것이다. 실행 중 여부는 현재 AIOX activity가 아닌 실제 wire로 확인해야 한다. 아직 busy 입력은 보내지 않았다. W2 active 및 기존 Work Items를 유지한다.

### 2026-09-14 16:58 · W2 busy turn 합류 실측·보조 thread 생성 실패 구분

사용자가 안내한 입력 뒤 `60초 기다린 뒤 완료 문구를 출력하겠습니다`, `Working (18s)`를 보고했다. agent는 실제 turn 진행을 확인하고 16:56:54 KST W2-BUSY-01을 한 건 전송했다. MCP accepted=true, messageId=`bf9f0b79-c241-4890-ac93-a6b149ee07c8`, deliveryId=`eb8b93e9-2841-4f49-8b02-557998411db5`다. 수신 thread는 idle 실험과 같은 `01a09ee6-9a68-7310-8bd9-8b7578666d50`이다.

직접 확인: 사용자의 기존 turn은 16:56:14 시작한 `01a09eea-a93e-7ed0-b1dd-a578a480e850`이다. Relay는 W2-BUSY-01에 turn/start(toolOutput+additionalContext)를 보냈고 응답 turn.id는 이 기존 turn과 같았다. 새 turn/started 없이 같은 turn의 functionCallOutput으로 입력이 관측됐고, 16:57:22 같은 turn의 최종 답변은 `W2-BUSY-BASE-DONE\nW2-BUSY-01-RECEIVED`, turn/completed는 completed·error=null이었다. cmux 화면에서도 발신자·메시지·두 완료 문구를 확인했다. 따라서 이 버전/경로에서 busy turn/start 입력이 기존 turn에 합쳐지는 사례를 실제로 확인했다. 사용자 turn/steer 근거를 빌린 판정이 아니다. 같은 turn에 복수 AIOX 메시지를 보낸 실험이나 모든 busy 상황의 보장은 아니다.

도구 구분: 사용자는 sleep 60을 요청했지만 실제 wire는 commandExecution이 아니라 native sleep item(durationMs=60000)이었다. 16:56:17 시작해 입력 수신 시점인 16:56:54에 완료됐고 이후 durationMs=24000인 두 번째 sleep을 16:56:56~16:57:20 실행했다. 이번 실험을 OS sleep 프로세스가 자연 종료한 근거로 사용하지 않는다. working 화면 중에도 AIOX Runtime activity는 idle이었다. 최종 DB 재조회에서도 두 delivery 모두 outcome=null이고 notifications=[]였다. 이번 busy 결과 역시 완료/활동 관측 연결 누락을 드러낸다.

제목 thread의 다른 결과: 사용자 입력 직후 temporary-structured-bce90301-91b8-439e-9aa8-3b621fc6ac61이 thread/start(ephemeral=true)를 요청했지만 서버가 -32600 `failed to load configuration: invalid transport in mcp_servers.aiox`로 거절했다. Relay control 상태는 잠시 threadId=null 뒤 기존 화면 thread로 복원됐다. 이번에는 임시 thread 생성 성공이나 오배달이 없었다. 이전 MCP 없는 harness의 제목용 thread 생성 성공과 이번 AIOX MCP 연결 환경의 생성 실패를 구분한다. 오류의 정확한 config 병합 원인은 아직 분석하지 않았으며 사용자 대화 turn 자체의 failed도 아니다. 에러 응답을 이용해 성공한 제목 thread 오선택 위험을 해결됐다고 처리하지 않는다.

판단과 다음: idle 입력은 새 turn, 이번 busy 입력은 기존 turn으로 수락됐다. 최소 귀속은 실제 turn/start 응답에서 Runtime/threadId/turnId와 deliveryId를 연결하고 같은 turn 종료로 해당 delivery들을 처리하는 흐름이어야 한다. 전역 다음 완료 이벤트나 메시지당 새 turn 가정은 배제한다. 구현 전에는 제목용 보조 thread와 화면 thread를 구분하는 기준 및 이번 보조 thread config 실패의 원인을 조사하고, 이 결과와 기존 승인/질문/중단 실측을 합쳐 W2 상태 연결 흐름을 제시한다. 실제 turn.failed·복수 미해결 요청은 아직 미검증이다. production 수정·commit/push는 없으며 실험 workspace:11/12와 새 daemon은 계속 유지한다. 원문 근거는 앞 entry의 임시 경로에 연속 기록돼 있다.

### 2026-09-14 17:04 · W2 구현 진입·보조 thread 설정 예외 처리 논의 대기

사용자가 W2 구현을 지시하며 새 예외 처리·논의 사항이 나오면 실행을 멈추고 질문하라고 명시했다. onramp, 최신 실측 entry, Codex Binding/Relay·테스트와 공통 RuntimeControls를 확인했다. production 수정이나 테스트 추가 전 두 harness의 제목 생성 요청을 직접 대조했다. AIOX MCP가 있는 실행의 ephemeral thread/start는 config.mcp_servers.aiox={enabled:false}를 포함했고 서버가 invalid transport in mcp_servers.aiox로 거절했다. AIOX MCP가 없는 이전 실행은 해당 aiox 항목 없이 제목 thread 생성에 성공했다. config 병합 내부의 정확한 원인은 아직 검증하지 않았으며, enabled=false 자체가 항상 잘못된 설정이라고 일반화하지 않는다.

논의 지점은 제목 등 보조 thread 요청의 설정을 AIOX Relay가 보정할지, 보조 thread를 메시지 대상/현재 활동에서 제외하는 책임과 설정 오류 수정을 분리할지다. 사용자 지시에 따라 임의 요청 rewrite/fallback을 구현하지 않고 중지했다. 추천은 보조 thread를 사용자 대화와 구분하는 기준을 검증해 W2 귀속·상태 연결에 적용하고, 제목 생성 설정 오류는 별도 수정으로 분리하는 것이다. 아직 수용된 결정이 아니며 production 변경·검증 완료로 기록하지 않는다. W2 active와 현재 pointer를 유지한다. 기존 실험 프로세스에는 조작하지 않았다.

### 2026-09-14 17:22 · W2 내부 helper 구분 기준 확인과 구현 흐름 제안

사용자는 구현 전에 임시 대화 구분 기준을 확인하고 이후 구현 흐름을 보고하라고 지시했다. production 코드를 수정하지 않고 codex rust-v0.153.4 공식 소스와 두 live wire를 대조했다. temporary_structured_request.rs:132~144는 thread/start에 ephemeral=true, ThreadSource::Feature("system")을 넣으며 실제 JSON은 threadSource="system"이다. app/thread_title.rs는 이 helper로 hidden title thread를 시작하고 thread ID를 temporary_structured_requests에 등록한다. app/app_server_events.rs:100~121는 ThreadStarted의 ephemeral && thread_source Feature("system")을 visible routing에서 제외하고 등록된 hidden thread 이벤트는 별도 소비한다. 따라서 요청 ID 접두어나 프롬프트 문자열을 추측할 필요 없이 TUI와 같은 두 필드의 결합 기준을 사용할 근거가 있다.

반대로 ephemeral 단독은 비저장 의미다. 생성 schema Thread.ts 주석과 app_server_session.rs:1880~1917,1980~2019에서 일반 start/fork도 config.ephemeral을 사용하지만 threadSource=User를 넣는 것을 확인했다. ephemeral=true 전체 제외는 사용자 비저장 대화를 제외할 수 있어 채택하지 않는다. resume 요청에는 threadSource가 항상 있는 것이 아니므로 source=user만 허용하는 필터로 기존 resume을 막지 않는다. 두 harness의 실측에서도 일반 start는 ephemeral=false/source=user, 제목 helper start는 ephemeral=true/source=system이었다.

제안 흐름: Relay가 알려진 내부 helper start를 구분해 TUI↔App Server 통과는 유지하되 active thread 전환·전환 대기로 소비하지 않는다. 성공 응답의 thread 메타데이터도 대조해 내부 thread를 메시지 대상으로 선택하지 않는다. 사용자 start/resume/fork는 기존 연결별 request ID 대응으로 성공 시 선택하고 실패 시 기존 대화를 유지한다. 내부 thread의 작업 이벤트를 사용자 현재 activity·delivery 종료로 사용하지 않는다. 메시지 전달 응답에서 실제 threadId/turnId와 deliveryId를 연결하고, 해당 turn 종료만 해당 메시지 결과에 반영한다. 활동은 현재 화면 thread, 결과는 원래 귀속 thread/turn으로 분리해 화면 전환 후에도 기존 메시지 결과를 잃지 않는 방향이다. 승인/질문은 TUI가 답하고 Binding은 요청별 생성/해소만 관측한다. 제목 생성 설정 오류는 이 분류와 별개이며 임의 config 보정은 제안하거나 적용하지 않았다.

공식 소스: https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/tui/src/temporary_structured_request.rs , https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/tui/src/app/app_server_events.rs , https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/tui/src/app_server_session.rs . 임시 사본은 /private/tmp/aiox-w2-*.rs에 있으며 source 기준과 실측 기준을 구분한다. 다른 버전·모든 보조 기능에 대한 일반 보장은 아니다. 사용자에게 위 흐름을 보고하는 단계이며 구현·테스트 변경·commit/push는 없다. W2 active를 유지한다.

### 2026-09-14 17:36 · W2 구현 중 저장 실패 처리 결정 대기

W2 재개 시 onramp와 최신 로그, Codex Relay/Binding 및 daemon RuntimeControls·messaging 저장/알림 경로를 대조했다. 확인한 현재 단절은 Relay가 turn 이벤트를 control로 전하지 않고 Binding이 turn/start 응답의 turn.id를 버리며 settle을 호출하지 않는 것이다. 생성 schema의 TurnStartResponse에는 turn만 있고 threadId는 없어, Relay가 실제 전송 당시 선택한 threadId를 control 응답에 함께 넣어야 Runtime/threadId/turnId/deliveryId를 연결할 수 있다. Relay 내부 helper 제외 기준은 이미 확정된 ephemeral=true AND threadSource=system을 사용한다.

구현 시 turn/completed에서 controls.settle은 비동기 DB 저장과 발신자 알림까지 수행한다. Claude 구현은 저장 실패 시 결과를 유지하고 cleanup 재시도를 제공하고, daemon messaging도 in-flight 결과를 유지하며 drain에서 재시도한다. Codex Binding이 Relay WebSocket 이벤트를 처리할 때 저장 실패를 어떻게 노출하고 언제 재시도할지는 W2에서 새로 결정해야 할 예외 경로다. 무시하면 미처리 Promise 또는 무기한 결과 지연, 즉시 Runtime failed로 바꾸면 실제 Codex turn 성공과 현재 활동을 혼동할 수 있다. 사용자 지시대로 이 처리 정책을 임의로 추가하지 않고 질문하기 위해 멈췄다. 검토 중 작성한 Codex production 변경은 검증 전 되돌렸고, 기존 로그 및 무관한 execution-flow-map 변경은 건드리지 않았다. typecheck는 중간 초안에서 통과했으나 최종 구현 검증으로 주장하지 않는다. W2 active와 현재 next pointer를 유지한다.

### 2026-09-14 17:49 · W2 Codex 결과·활동 연결 구현과 격리 실측

사용자가 Codex turn 완료 후 DB 저장 실패 시 결과를 보존해 재시도하는 방식에 동의했다. Relay는 ephemeral=true AND threadSource=system인 내부 helper를 TUI↔App Server에 통과시키되 active 선택·전환 대기·control 관측에서 제외한다. 일반 ephemeral user 대화는 제외하지 않는다. 전달 당시 active threadId를 turn/start 응답의 turn.id와 결합해 Binding에 보내고, 관련 turn/item/request/resolved 이벤트만 control에 전달한다. Binding은 delivery ID를 실제 thread/turn별로 묶어 해당 turn/completed의 completed/failed/interrupted로 controls.settle에 전달하며 DB 저장 실패 결과를 보관해 cleanup에서 재시도한다. daemon messaging의 기존 in-flight drain도 그대로 유지된다. 현재 선택 thread의 turn/tool/미해결 requestId만 Runtime 활동으로 투영하고, turn 종료는 그 turn의 대기만 정리한다. TUI의 승인·질문 응답 소유권은 바꾸지 않았다.

대역 회귀: Codex adapter 16 tests 통과. 내부 helper 미선택과 ephemeral user 선택, 같은 turn의 delivery 2건, 승인·질문 대기 2건 중 한 요청 해소 뒤 다른 대기 보존, completed/failed 귀속, 저장 첫 시도 실패 후 cleanup 재시도를 확인했다. pnpm check는 lint·format·build·typecheck와 전체 테스트(domain28/config28/protocol10/terminal88/vendor3/persistence13/Web36/Codex16/Claude74/CLI59/daemon203) exit0이었다. 첫 검사에서 변경 테스트의 mock 타입 오류가 나 수정한 뒤 전체 재실행했다. 테스트는 실제 vendor failed나 복수 request 동시 발생의 실측이 아니다.

격리 실제 실행: /private/tmp/aiox-w2-after-code/에 현재 Relay 사본과 새 adapter dist를 사용해 cmux workspace:13에서 실제 Codex 0.153.4 TUI·App Server, 임시 daemon·DB와 MCP 발신 대역을 실행했다. 작업 디렉터리는 work이고 원래 workspace:11/12와 별개다. 사용자 TUI 초기 turn 후 AIOX MCP send AIOX-W2-AFTER-01 한 건(messageId=78642983-7d52-48e7-ac84-09c25d659f68, deliveryId=fb9c1ba5-e589-42cd-b194-9de07e55b89d)을 전송했다. 화면에서 발신자·입력·RECEIVED-01 답변을 확인했고 DB delivery outcome=completed/outcomeAt 기록 및 발신자 전용 알림 1건을 snapshot으로 확인했다. 별도 20초 작업 진행 중 Runtime activity=reasoning/observation=codex_turn, 종료 후 idle/codex_idle을 확인했다. 이 입력은 idle 새 turn이며 busy 입력·실제 두 Codex 왕복은 이번 재실측 대상이 아니다. Web API와 MCP는 기존 RuntimeRegistry 투영을 소비하며 이전 daemon/Web/MCP 테스트가 통과했다. 현재 격리 실행의 Web UI와 MCP agents_list를 별도로 직접 조작·실측한 것은 아니다. 격리 실행은 /exit 뒤 closed.json serverExit=0과 harness/App Server/TUI PID 부재를 확인했다. 원래 workspace:11/12는 건드리지 않았다.

owner docs/architecture/aiox-vendor-bindings.md에 as-built 연결과 실측/대역 경계를 반영했다. W2는 아직 active다. 남은 것은 실제 turn.failed가 발생하는 안전한 조건과 복수 동시 미해결 request의 vendor 발생 여부·순서 확인, Web/MCP 직접 소비 검증 및 결과에 따른 보완이다. 제목용 helper의 mcp_servers.aiox invalid transport 설정 문제는 별도 미해결이며 임의 설정 rewrite는 추가하지 않았다. commit/push는 하지 않았고 무관한 execution-flow-map 파일은 건드리지 않았다.

### 2026-09-14 17:55 · W2 Web API·MCP 현재 상태 직접 소비 확인

남은 Web/MCP 소비를 같은 production code의 별도 격리 실행 /private/tmp/aiox-w2-web-mcp/ (cmux workspace:14)에서 직접 확인했다. 임시 harness의 snapshot은 현재 RuntimeRegistry 목록, Web GET /api/web/agents, 인증된 발신 MCP clients의 agents_list를 한 시점에 조회한다. 사용자 TUI 초기 turn 종료 후 세 소비 경로 모두 target idle, Web observation codex_idle, MCP status idle이었다. TUI에 30초 sleep 작업을 입력하고 진행 중 snapshot에서 Runtime=reasoning/codex_turn, Web=reasoning/codex_turn, MCP=working을 같은 target Runtime ID 34897d15-17d3-40c7-a658-19e302c538ac에서 확인했다. 화면은 Working을 표시했다. 종료 후 화면 DONE과 Web idle/codex_idle을 확인했다. 이는 실제 App Server/TUI/daemon 이벤트와 HTTP/MCP API 소비 실측이며 Web 브라우저 UI 전체 검증은 아니다.

현재 architecture의 Codex as-built 단락에 Web/MCP 실측 경계를 추가했다. 격리 실행은 /exit 뒤 closed.json serverExit=0, harness/App Server/TUI PID 부재를 확인했다. 이전 /private/tmp/aiox-w2-after-code/도 이미 정상 종료했으며 원래 workspace:11/12는 그대로다. W2 next는 실제 turn.failed 및 복수 동시 미해결 request의 발생 조건·실측 또는 불가능/미재현 판정과 그 결과에 따른 보완이다. 제목 helper config 오류의 별도 원인은 아직 미해결이다. commit/push는 없다.

### 2026-09-14 17:56 · W2 실제 failed turn의 안전한 발생 조건 확인

Codex 0.153.4 별도 stdio App Server의 /private/tmp/aiox-w2-failed-probe.mjs에서 ephemeral 임시 thread를 만들고 turn/start.model=aiox-nonexistent-model을 지정했다. turn/start는 threadId/turnId를 반환했고, 같은 turn의 turn/started(inProgress), thread/status/changed(systemError), error(willRetry=false), turn/completed(status=failed, error.message)를 직접 관측했다. 오류는 ChatGPT 계정에서 해당 모델을 지원하지 않는다는 400 invalid_request_error였다. 이는 사용자의 실제 설정이나 계정 인증을 훼손하지 않는 격리 입력이며 기존 도구 exit7 completed와 다른 turn 실패 신호다. 첫 sandbox 실행은 ~/.codex SQLite 상태 초기화 권한으로 실패해 실제 vendor 신호 근거가 아니고, 승인된 재실행에서 위 결과를 받았다. 이 프로브는 AIOX Relay/Binding/DB 경로가 아닌 직접 App Server라 failed delivery E2E로 확대하지 않는다. Binding failed 귀속은 인접 대역 테스트에서 확인했다.

architecture의 실측 한계를 직접 App Server failed 확인과 AIOX delivery 미검증으로 구분했다. W2 active를 유지한다. 동시 미해결 요청의 자연 발생 조건과 실제 Relay/Binding 결과는 여전히 미확인이다. 별도 제목 helper config invalid transport 문제와 이번 unsupported model 실패는 서로 다른 오류다.

### 2026-09-14 17:58 · W2 실제 failed delivery 귀속·알림 확인

직접 App Server failed turn 뒤에 /private/tmp/aiox-w2-failed-delivery/ 격리 환경(cmux workspace:15)에서 AIOX MCP→새 production Binding/daemon→임시 Relay→실제 Codex App Server/TUI 경로의 failed delivery를 확인했다. 임시 Relay만 AIOX control의 turn/start에 model=aiox-nonexistent-model을 지정했고 TUI 사용자 turn과 production Relay/Binding source는 바꾸지 않았다. TUI 초기 일반 turn으로 준비 완료 후 AIOX-W2-FAIL-01을 MCP send로 한 번 전송해 accepted=true, messageId=b54f1faf-72d8-4d9c-962a-b92fbae112a7, deliveryId=32f6c8ce-205e-495f-820d-0d61a8341c55를 받았다. 같은 delivery의 DB outcome=failed, outcomeError에 400 invalid_request_error 원문, 발신자 전용 실패 알림 1건을 snapshot으로 확인했다. 종료 뒤 target Runtime/Web activity=idle, MCP status=idle이었다. 무효 모델을 강제로 지정한 인위적 실패 조건이지만 실제 vendor turn.failed와 전체 귀속·저장·알림 경로의 실측이다. 일반 설정의 자연 발생 빈도 근거는 아니다. /exit 뒤 serverExit=0과 세 PID 부재를 확인했다. 원래 workspace:11/12는 유지했다.

architecture의 failed 경계를 이 실제 격리 실측으로 갱신했다. W2에 남은 자연스러운 복수 미해결 요청 발생 조건·실측/불가능 판정과 제목 helper config invalid transport의 별도 원인 조사 외에는 이번 결과 연결의 알려진 실패가 없다. W2 active 및 현 next pointer를 유지하고 commit/push는 하지 않았다.

### 2026-09-14 18:02 · W2 실제 복수 승인 대기 발생과 소비 범위

/private/tmp/aiox-w2-multiple-requests/의 격리 실제 TUI·App Server·새 production Relay/Binding·daemon(cmux workspace:16)에서 병렬 exec_command(require_escalated) 두 건을 요청했다. 임시 Relay는 승인/해소 이벤트의 method, request ID, thread/turn ID만 events.jsonl에 기록했다. 첫 turn의 request IDs 0/1, 두 번째 turn의 2/3이 각각 같은 thread/turn에서 두 requestApproval 모두 해소되기 전 발생했다. 두 번째 turn의 대기 중 snapshot에서 target Runtime/Web activity=awaiting-user, observation=codex_request, MCP agents_list status=working을 확인했다. TUI는 하나의 승인 UI를 보여 주었고 한 번의 화면 Yes 뒤 두 request ID 모두 resolved되어 두 명령이 완료됐다. 따라서 실제 복수 미해결 승인 요청의 발생 조건(같은 turn의 병렬 escalation)은 확인했으나 한 ID만 해소되고 다른 ID가 남는 순서는 이 실행에서 발생하지 않았다. 그 분리 정리는 인접 대역 회귀가 검증한다. TUI 사용자 응답은 TUI가 소유했고 Binding은 답하지 않았다.

제품 source 변경은 이 확인으로 추가하지 않았다. architecture as-built 실측 경계를 갱신했다. 격리 실행은 /exit, serverExit=0, harness/App Server/TUI PID 부재를 확인했으며 원래 workspace:11/12는 유지했다. W2의 기능 연결과 관련 핵심 실제 검증은 완료됐지만 W2 마감 판정 전에 제목 helper config invalid transport의 별도 원인과 owner 정합·최종 검사 범위를 확인한다. commit/push는 하지 않았다.

### 2026-09-14 18:04 · W2 제목 helper 설정 오류 원인 격리 확인

/private/tmp/aiox-w2-config-probe.mjs에서 Codex 0.153.4의 같은 stdio App Server를 `-c mcp_servers.aiox={url="http://127.0.0.1:1/mcp",enabled=false}`로 실행하고, 동일 ephemeral thread/start를 두 설정으로 순서대로 비교했다. `config.mcp_servers.aiox={enabled:false}`만 보낸 요청은 `failed to load configuration: invalid transport in mcp_servers.aiox`로 거절됐고, 같은 요청에 `url`을 포함한 완전한 disabled entry를 넣으면 수락됐다. 이전 실제 TUI wire의 제목 helper가 보내는 값과 첫 요청이 일치하며, official 0.153.4 temporary_structured_request.rs도 effective mcp 서버 이름별 `{enabled:false}` 생성 코드를 보여 준다. 따라서 이 환경의 오류는 per-thread override가 transport를 가진 실행 config entry와 결합되지 않고 incomplete entry로 해석되는 데서 발생한다는 실측 근거가 있다. 모든 Codex 버전/모든 MCP 유형의 동작으로 일반화하지 않는다.

제품 Relay에서 제목용 요청을 rewrite하거나 fallback을 추가하지 않았다. 내부 helper 분류·현재 activity/delivery 제외와 이 Codex 설정 오류는 별개다. architecture에 current gap을 남겼다. 수정 책임과 범위는 별도 논의 대상이며 W2 기능 구현의 결과 귀속을 이 오류로 완료 처리하지 않는다. 이번 격리 App Server는 정상 종료했다. commit/push 없음.

### 2026-09-14 18:06 · W2 새 코드 busy 입력 완료 연결 실측

새 production Codex Binding/Relay dist를 사용한 /private/tmp/aiox-w2-busy-after/ 격리 실제 TUI·App Server·daemon(cmux workspace:17)에서 TUI의 30초 sleep 작업이 Working일 때 AIOX MCP send AIOX-W2-BUSY-AFTER-01을 전송했다. 이 harness에서만 기존 send 명령의 idle 단정을 제거했다. accepted=true, messageId=4fdad503-161e-4afb-a155-df066f31df9e, deliveryId=664682df-bda6-4984-971e-f9f693330198이다. 진행 중 Runtime/Web activity=reasoning, MCP=working, delivery outcome=null/notification 없음이었다. TUI 최종 응답은 BASE-DONE BUSY-RECEIVED를 함께 표시했다. 완료 뒤 같은 delivery의 DB outcome=completed/outcomeAt, 발신자 전용 알림 1건, Runtime/Web idle·MCP idle을 확인했다. 이번 run은 turn ID를 별도 wire에 기록하지 않아 같은 turn ID 직접 대조로 확대하지 않는다. 앞선 W2-BUSY-01 wire의 기존 turn ID 합류 실측과 인접 같은-turn 대역 회귀가 귀속 근거다. 임시 실행은 /exit 뒤 serverExit=0 및 harness/App Server/TUI PID 부재를 확인했고 원래 workspace:11/12는 건드리지 않았다.

architecture as-built에 이 범위와 식별자 한계를 반영했다. 결과·활동 연결, Web/MCP 소비, 실제 failed와 복수 승인 발생, 저장 실패 재시도 대역 검증은 완료됐다. 제목 helper config 문제는 원인만 확인했고 별도 current gap으로 남겼다. W2를 다음 단계로 넘기기 전 최종 diff·owner·검사 정합을 점검한다. commit/push 없음.

### 2026-09-14 18:09 · W2 마감 판정과 W3 재개 지점

W2의 결과·활동 연결과 검증을 완료로 판정했다. 실제 idle/busy AIOX 수신→turn 종료→DB 결과·발신자 알림, 실제 turn.failed의 격리 재현과 failed delivery, 실제 병렬 승인 ID 2건·Web awaiting-user/MCP working, 한 요청 해소 뒤 다른 대기 보존 대역, 중단 뒤 늦은 item 불변 대역, DB 저장 실패 결과 보존·cleanup 재시도 대역을 구분해 확인했다. W2 이후 마지막 test 변경은 response보다 완료 이벤트가 앞선 순서와 interrupted/늦은 item 회귀 추가 및 사용하지 않는 thread/status/changed control 전달 제거다. 이에 대해 Codex adapter 16 tests, 해당 typecheck, root lint, git diff --check와 architecture markdown inline-code 검사가 exit0이었다. 직전 전체 pnpm check도 lint·format·build·typecheck 및 전체 558 tests(domain28/config28/protocol10/terminal88/vendor3/persistence13/Web36/Codex16/Claude74/CLI59/daemon203) exit0이었다. 전체 검사 뒤의 국소 변경은 위 해당 검사로 재검증했고 전체 검사를 다시 반복하지 않았다.

제목 helper config 오류는 AIOX MCP transport 없는 per-thread disabled override라는 원인을 동일 App Server의 partial/complete 비교로 확인했다. 메시지 대상/현재 activity 제외는 구현했으나 설정 rewrite는 하지 않았다. docs/architecture/aiox-vendor-bindings.md에 current gap으로 두고 W5 통합 마감에서 별도 수정·유지 판단을 반드시 닫도록 Work Item에 반영했다. W2를 completed, W3 Codex 간 실제 메시지 왕복을 active로 전이했다. 현재 턴에서 W3 실행은 시작하지 않는다. W3는 두 실제 Codex Runtime의 송수신·알림을 새로 확인해야 하며 W2의 시험용 발신 Runtime 대역을 두 Codex 왕복 근거로 사용하지 않는다. 기존 workspace:11/12의 실험은 계속 남아 있고, 이번에 새로 만든 workspace:13~17 실험은 모두 /exit로 종료 확인했다. commit/push는 없고 무관한 execution-flow-map 파일은 건드리지 않았다.

### 2026-09-15 00:35 · W2 재개 handoff — 공통 status/status_reason 결정과 Web 표시 연결

사용자는 이번 상태 계약 논의와 기존 Web 표시 변경을 W2 작업의 handoff로 기록하고 W2를 계속 진행하도록 지시했다. W6나 별도 로그를 만들지 않는다. 기존 W2 완료 판정은 당시 구현·검증 범위의 이력으로 보존하되, 새 공통 status 계약은 미구현이므로 W2를 다시 active로 열고 W3는 open으로 돌린다. 이번 수행 범위는 로그 기록이며 제품 코드·owner 명세 반영·새 TUI 실험은 수행하지 않았다.

**사용자 확정 — D1/D2/D3**

| 항목 | 확정 내용 |
| --- | --- |
| D1 공통 표시 | Web과 MCP `agents_list()`가 `aiox-preparing / idle / working / awaiting-user / failed`를 동일하게 표시하고 `status_reason`을 제공한다. `reasoning`·`tool`은 `working`의 세부 이유로 표현한다. `aiox-preparing`도 양쪽 목록에 표시한다. MCP 3종 요약 유지 제안은 채택하지 않았다. |
| 이유 변환 책임 | vendor 신호를 아는 adapter가 공통 상태와 이유를 만든다. Claude hook 이름·Codex 내부 event 토큰을 그대로 공통 이유 어휘로 간주하지 않는다. 기존 `observation.event`를 어떤 내부 타입으로 대체할지는 아직 코드 변경하지 않았다. |
| D2 실패 | vendor가 보고한 최종 응답/turn 실패를 `failed`로 표시한다. Codex에서는 `turn/completed`의 `turn.status === "failed"`가 판정 기준이며 `turn.error` 존재나 `codexErrorInfo` 이름으로 실패 여부·지속성을 추측하지 않는다. 직접 TUI에 입력한 turn도 같은 활동 관측 대상이다. |
| 실패 해제 | 같은 대화의 다음 `turn/started`에서 이전 turn 실패를 해제한다. 다른 대화 선택이 성공하면 그 대화의 관측 상태를 표시하며, 진행 중 작업·대기가 없으면 `idle`이다. `/resume` 선택창 취소만으로 실패를 해제하지 않는다. 연결 실패는 새 turn 시작과 섞지 않고 연결 준비 복구 관측으로 해제한다. 실제 복구 경로 검증은 남는다. |
| D3 종료 | Agent status에서 `stopped`를 제거하고 종료한 Agent는 목록에서 제거한다. Host 설정 항목의 `stopped`는 Host 의미로 유지한다. `aiox-preparing`을 `starting`이나 한국어로 바꿔 표시하지 않는다. |
| 서로 다른 축 | 상태·전송 가용성·개별 delivery 결과는 별도다. `failed`가 무조건 전송 불가라는 뜻은 아니며, 준비 중 대상을 목록에 보여도 준비 전 send를 허용하지 않는다. 현재 route·신원·권한 필터를 무단으로 넓히지 않는다. |

현재 `mcpStatus()`는 상태 요약뿐 아니라 목록 포함·send 거절에도 쓰인다. 공통 enum으로 바꿀 때 `aiox-preparing` 노출과 전송 차단을 분리해야 한다. 이 변경 때문에 ready가 되기 전 호출 거절을 제거하거나 임의 fallback을 넣지 않는다.

**Codex의 상태 계산과 turn 수명**

```text
실제 현재 사용자 thread 선택·연결 준비
  → aiox-preparing
선택/준비 성공
  → 해당 thread의 관측된 작업·요청에 따라 idle / working / awaiting-user

turn/started
  → 이전 turn 실패 해제, working
item 시작·완료
  → 진행 중 turn의 세부 활동 갱신; 도구 하나 완료로 turn 종료를 만들지 않음
명시적인 승인·사용자 입력 요청
  → 요청 ID별 미해결 대기; awaiting-user
serverRequest/resolved
  → 해당 요청만 해제; 다른 미해결 요청은 보존
turn/completed
  status=completed   → 해당 turn 종료·대기 정리, idle
  status=interrupted → 해당 turn 종료·대기 정리, idle
  status=failed      → 해당 turn 종료·대기 정리, failed + 받은 오류
```

위 표는 현재 표시 대상 turn에 대한 규칙이다. 다른 thread 또는 이전 turn의 늦은 이벤트로 현재 작업 상태를 덮어쓰지 않는다. 화면 전환과 이미 전달한 AIOX delivery의 Runtime/threadId/turnId 귀속은 분리한다. 실패 이유는 다음 작업·대화 선택 관측에 따라 교체·제거하며 독립 실패 이력 필드는 만들지 않는다.

도구 `exit 7`의 item 실패와 turn 전체 실패는 구분한다. Esc 뒤 background 명령이 계속 돌더라도 사용자가 끊은 turn은 종료한 것으로 처리한다는 사용자 결정이다. 뒤늦은 item 완료가 Agent를 다시 `working`으로 만들거나 interrupted delivery 결과를 completed로 바꾸지 않는다.

**비동기 질문 — 이전 과장 설명 정정과 채택 규칙**

공식 Codex 0.153.4 README의 Items에 `agentMessage {delivery, questions}`가 정의돼 있다. `delivery: "async"`는 현재 turn을 끝내지 않고 보낸 메시지이며 질문이 있으면 `questions`가 포함된다. 질문의 존재를 관측할 수 없다는 이전 설명은 틀렸다. 확인되지 않은 것은 그 신호만으로 실제 실행이 멈췄는지·어느 입력이 질문을 해소했는지까지 판정하는 것이다.

- `delivery=async` 또는 질문 문장만으로 `awaiting-user`를 만들지 않는다. 작업이 계속되는 turn은 `working`이다. 명시적인 대기 신호가 없고 도구 실행만 끝났다면 turn 종료를 추측하지 않는다.
- 질문을 남긴 채 `turn/completed(completed)`를 받으면 `idle`로 처리한다. 끝나지 않은 turn은 명시적 대기 신호가 없는 동안 `working`을 유지한다.
- 진행 중 답변이 `turn/steer`로 수락되면 같은 thread/turn을 계속한다. `turn/steer`는 TUI 사용자가 치는 slash 명령이 아니라 TUI→App Server RPC다.
- 기존 turn 종료 뒤 같은 대화에 답변이 새 입력으로 수락돼 새 turn을 시작하면 Agent ID·thread ID는 유지되고 turn ID만 새로 생긴다. 종료 뒤 질문 UI의 선택지 제출이 실제로 어떤 요청을 보내는지는 미실측이다.
- 미응답 질문 여부를 정확히 추적하기 전에는 `status_reason`에 “아직 답변 대기 중”을 계속 남기지 않는다. `working+awaiting-user` 조합 status는 추가하지 않는다.

**오류 구조와 표시**

사용자 요청으로 subagent가 읽기 전용 검토했고, 주 agent가 공식 구조·현재 코드·실측 한계를 대조했다. Codex 0.153.4 `Turn.error`는 optional이고 오류 객체가 있으면 `message: String`이 필수다. 빈 문자열이 아님·모든 원인/복구 시각을 충분히 설명함까지 타입이 보장하지 않는다. `codexErrorInfo`, `additionalDetails`, `misalignment`는 선택 정보다. `codexErrorInfo`는 camelCase 문자열 분류 또는 `httpStatusCode` 등을 담는 객체 분류일 수 있다.

`usageLimitExceeded`·`sessionBudgetExceeded`·`rateLimitExceeded` 등은 실패 이유다. 이름에서 다음 요청도 실패함·계정 세션 한도와의 일대일 대응·비용 초과·자동 회복 시점을 추론하지 않는다. 해당 enum에서 billing/cost 전용 분류는 확인하지 못했다.

표시 방향은 `error.message` 원문을 기본으로, 실제 제공된 `codexErrorInfo` 분류·HTTP 코드를 함께 표시하는 것이다. 정확한 구분자·객체 포맷은 구현 전 실제 구조를 바탕으로 정한다. `additionalDetails`·`misalignment` 전체를 무조건 이어 붙이기로 결정한 것은 아니다. 오류 정보가 없으면 만들어 넣지 않는다. 중간 `error` 이벤트만으로 terminal 실패를 확정하지 않고 최종 `turn.status`를 따른다.

한도 payload를 확인하려고 사용량·비용을 일부러 소진하지 않는다. 소스·스키마와 대역 테스트로 처리 경로를 검증하고 실제 한도 발생 payload는 미실측으로 남긴다. 한도·비용·인증 등 모든 오류의 자연 발생을 구현 완료 선행 조건으로 삼지 않는다.

**소비에서 제외하거나 확인을 남길 신호**

- 토큰 사용량, 일반 설정/경고, 계정·한도 숫자, 일반 MCP 서버별 시작 실패·재인증은 그 자체로 Agent status를 만들지 않는다. 한도 reset 시각 경과·계정 변경·자동 인증 회복 알림만으로 성공을 추정하지 않는다.
- AIOX 협업 채널 자체의 준비/연결 실패는 별도 연결 관측 대상이다. 정상 프로세스 종료를 사용자에게 failed로 남기는 수명 변경은 하지 않는다.
- `mcpServer/elicitation/request`는 명시적 사용자 입력 요청 후보이나 현재 Relay 전달·Binding 소비가 없다. `turnId: null`일 수 있는 구조와 해소 귀속을 확인해야 한다. 처리 중 새 예외 설계가 필요하면 사용자에게 묻는다.
- 일반 MCP 도구 실행과 클라이언트 자동 응답 요청을 사용자 대기로 잘못 분류하지 않는다.
- `thread/status/changed(systemError)`만으로 별도 추정 실패 규칙을 추가하지 않는다. 관측된 최종 turn 실패가 기준이며 다른 필요성이 드러나면 근거를 확인한다.
- webSearch·imageGeneration·collabToolCall 등도 진행 중 turn에서는 `working`이다. 세부 reason을 채우려면 해당 item 구조와 실제 소비 범위를 확인한다.

**기존 코드·커밋 연결 — 다음 구현에서 반드시 함께 볼 곳**

사용자가 기억한 “상태와 메시지를 합쳐 보여주는 변경”은 커밋 `bc48d947b69caa3da45ce2105c8e61b57400af1d` (`fix(web): display the current agent observation reason`)에서 직접 확인했다. `apps/web/src/main.ts`의 `renderAgents()`는 activity와 observation.reason을 ` · `로 이어 표시한다. event는 표시하지 않는다. 인접 `main.test.ts`의 `shows only the latest observation reason as Agent snapshots change`는 새 reason 교체와 없는 reason 제거를 검증한다. 새 status/status_reason도 이 표시 경로와 수명 회귀를 함께 반영한다.

| 책임/경로 | 확인·변경할 위치 |
| --- | --- |
| 공통 상태 어휘와 현 MCP 요약 | `packages/domain/src/agent/runtime.ts`, 인접 test |
| adapter 관측 계약 | `packages/vendor/src/index.ts`, 양 vendor Binding/관측 코드 및 인접 test |
| Codex 수집·thread 선택·turn/요청 귀속 | `packages/adapters/codex/src/relay.ts`, `binding.ts`, `index.test.ts` 및 인접 test |
| daemon 단일 현재 상태 저장 | `apps/daemon/src/runtimes.ts` 및 인접 test |
| MCP 목록/schema와 전송 가능 경계 | `apps/daemon/src/mcp.ts`, `networks.ts`, `messaging.ts` 및 인접 test |
| HTTP·공유 view·Web 표시 | `apps/daemon/src/http.ts`, `packages/protocol`의 AgentView, `apps/web/src/main.ts`·`main.test.ts` |
| 현재와 새 외부 계약의 정합 | `docs/specs/aiox-runtime.md`, `aiox-collaboration.md`, `aiox-configuration-web.md`; Host stopped는 `aiox-host.md` |
| as-built·vendor별 증거 | `docs/architecture/aiox-vendor-bindings.md`; Claude 실측 제약은 Stage3 로그 최신 기록 |

현재 코드·명세는 아직 기존 상태 어휘·MCP 3종 요약이다. 새 결정을 이미 구현된 사실로 owner에 표시하지 않는다. Claude에도 공통 표시 어휘를 적용하되 Codex RPC를 Claude hook에 억지로 대입하거나 기존 Claude 미해결 관측을 완료로 승격하지 않는다. 앞서 나온 MCP 3종 유지·turn 실패 후 항상 idle·오류 종류로 지속 실패 추정 제안은 철회된 것으로 소비한다.

**증거와 재개 검증**

- 이 로그의 2026-09-14 16:39 사용자 동반 관측 표: 일반 완료, 승인 허용/cancel, 시작 전 Esc, 실행 중 Esc와 늦은 도구 완료, Default async 질문과 same-turn steer, 도구 exit7, Plan 질문 제출/Esc. 원래 TUI↔Relay↔App Server 관측이며 새 공통 Web/MCP 표시 실측이 아니다.
- 17:58 실패 delivery 실측: 인위적 unsupported model로 DB failed와 발신자 알림은 확인했고 당시 대상 Web/MCP는 idle이었다. 새 failed 표시의 성공 근거로 재사용하지 않는다.
- 18:02 실제 병렬 승인 요청 2건·현재 Web awaiting-user/MCP working. 한 요청만 해소하고 다른 요청이 남는 경우는 대역 검증이며 실측으로 확대하지 않는다.
- 기존 W2 helper 분류는 `ephemeral=true AND threadSource="system"`을 보존한다. 제목용 불완전 MCP config 오류의 임의 보정은 금지한다.
- 공식 구조: [App Server 0.153.4 README](https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/app-server/README.md#items), [Turn/TurnError](https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/app-server-protocol/src/protocol/v2/thread_data.rs), [CodexErrorInfo](https://github.com/openai/codex/blob/rust-v0.153.4/codex-rs/app-server-protocol/src/protocol/v2/shared.rs). 0.153.4 근거를 이후 설치 버전에 자동 일반화하지 않는다.
- 새 공통 status/status_reason의 Web·MCP 일치, 준비 중 노출과 send 차단, failed 진입·다음 turn 해제·대화 전환/취소, Esc 뒤 늦은 이벤트 불변, 요청별 대기 보존은 구현 후 인접 테스트와 필요한 실제 관측으로 검증한다.
- 미실측: 자연 발생 한도/비용 payload, 답변 없이 비동기 질문 뒤 나머지 작업까지 끝나는 구간, turn 종료 후 질문 선택지 제출 경로, 연결 실패별 실제 회복. 소스 확인·대역·실제 vendor·Web 화면 근거를 구분한다.

**재개 및 작업 범위**

다음은 W2에서 위 결정과 현재 producer→registry→HTTP/MCP→Web 경로 및 owner/tests를 대조하고 공통 상태 반영을 이어가는 것이다. W3는 그 뒤의 실제 Codex 간 왕복 작업으로 남긴다. 현재 handoff 작성은 구현·TUI 재실행 승인이 아니며 이번 턴에는 로그만 변경한다. 후속 구현에서 새 예외 처리·설계 선택이 필요하면 작업을 멈추고 사용자에게 묻는다. commit/push·개인 architecture.excalidraw·무관한 execution-flow-map/Stage6 Web 작업을 건드리지 않는다.

과거 entry의 /private/tmp/aiox-w2-* 실험 경로와 살아 있다는 서술은 당시 기록이다. 이후 대화에서 사용자 삭제 요청에 따라 임시 W2 파일/실행을 정리했다고 보고된 상태이며 이번 기록에서는 파일·프로세스 생존을 재검증하지 않았다. 원문 wire가 남아 있거나 실험 환경을 바로 재사용할 수 있다고 가정하지 않는다. 새 재현을 진행할 때 사용자와 범위를 맞추며 오래된 PID를 신뢰하거나 send를 임의 재실행하지 않는다.

### 2026-09-15 00:40 · 현재 변경 분할 커밋·검증

사용자가 현재 변경 커밋을 지시했다. a5abb84는 기존 W2 Codex 활동 관측·delivery 결과 귀속·회귀와 architecture, a869ff4는 Stage6 workspace 결정·디자인 프롬프트, e5e1758은 execution-flow-map 스킬과 Claude 연결, c312cc8은 Web import 순서 정리다. 이 기록과 기존 W2 실측·새 공통 상태 handoff는 별도 로그 커밋으로 보존한다. 새 D1/D2/D3 구현을 완료한 커밋이 아니며 W2 active와 다음 행동은 유지한다. push는 수행하지 않는다.

검증: 최초 pnpm check는 미추적 apps/web/src/t.js의 미사용 변수 lint 오류로 중단됐다. 이 파일은 미정의 변수와 오타를 포함한 상태 계산 초안으로 판단해 수정·삭제·커밋하지 않았다. 해당 파일만 제외한 oxlint·oxfmt 검사, 전체 build·typecheck는 통과했다. 전체 테스트는 sandbox /bin/ps EPERM으로 실패한 뒤 승인된 sandbox 외부 pnpm test로 재실행해 558 tests 모두 통과했다. 출력은 /private/tmp/aiox-commit-tests-20260915.log다. git diff --check도 통과했다. 실제 vendor 재실행은 하지 않았다.

Stage6 디자인 프롬프트의 starting/reasoning/tool/stopped 표시는 최신 W2 공통 상태 결정과 불일치함을 확인했다. 이번 커밋은 기존 디자인 초안 보존이며 최신 계약으로 승인하거나 제품 구현에 반영한 것이 아니다. W2 owner/소비 정합화 시 이 Stage6 산출물도 함께 확인해야 한다. 개인 architecture.excalidraw는 변경하지 않았다.
