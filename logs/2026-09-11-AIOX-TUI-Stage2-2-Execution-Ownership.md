---
topic: AIOX TUI Stage2-2 Execution Ownership
description: AIOX 명령·실행 위치에 따른 실행 소유권과 외부 터미널 독립 수명
status: open
---

## Work Items

- [x] W1 공통 실행 계약·영향 범위 확정 및 owner 반영 — 명령·인증된 실행 위치로 실행 소유권을 결정하고 runtime/terminal 소유권을 구분한다. 기존 spec·architecture와 CLI→protocol→daemon→Registry→binding→Web·tests를 대조해 새 정책과 충돌하는 계약을 갱신한다.
- [x] W2 Registry·daemon 수명 분리 — 기존 RuntimeRegistry에 실행 소유권을 표현하고 terminalOwnership과 구분한다. 등록 해제와 실제 프로세스 종료를 분리하며 일반 stop blocking·force 루프·실패 정리·진행 중 등록 경합에 새 정책을 적용한다.
- [x] W3 외부 실행·제어 연결 구현 — Web foreground 경로를 유지하고 외부를 ClaudeController.attach에서 분리한다. CLI의 vendor 직접 실행·입출력 상속, 제어 WS의 준비·시작·종료·연결 손실, 등록·hook 맵·credential 준비 순서와 CLI 종료 후 등록 정리를 연결한다. AIOX 공통 정책을 첫 구현인 Claude에 적용하며 외부에 PTY·headless·Serialize를 생성하지 않는다.
- [x] W4 실행별 주입·자원·hook 실패 경계 연결 — 기존 주입·충돌 검사를 재사용하고 실제 실행 CLI에서 버전을 검사한다. 외부 inbox 임시 디렉터리는 CLI가 생성부터 정리까지 소유하며 길이·권한 검사와 등록 경로 대조를 유지한다. 외부 hook ECONNREFUSED만 조용히 처리하고 401·잘못된 보고·timeout 및 Web/Host 오류 진단은 유지한다.
- [x] W5 실제 수명 검증·회귀·Stage3 인계 — 외부 PTY 미생성, daemon 정상·force·비정상 종료 뒤 실제 vendor 조작과 shell 복귀, 연결 손실 등록 정리, Web 실행·빌린 shell·화면 복원 회귀 및 pnpm check를 검증한다. OS별 미검증을 명시하고 owner·링크 정합을 확인한 뒤 Stage3 W1로 plan 포인터를 복귀한다. Claude 메시지 E2E·Codex·Host 미구현을 완료로 확대하지 않는다.
- [x] W6 일반 stop·force 공통 입력/신규 실행 차단과 종료 직렬화 — 거절·실패 시 입력을 복구하고 외부 vendor 수명은 유지한다.
- [x] W7 대기 shell 안전 종료 연동 — macOS zsh/bash 및 Linux bash/zsh/fish에서 shell 자체 대기·남은 작업 판정과 정상종료 handshake를 구현·검증한다.
- [>] W8 Windows cmd/PowerShell 대기 shell 정상종료 — builtin·ThreadJob·입력 경합을 보호하는 연동을 구현하고 실제 Windows 검증을 확보한다. 환경/관측 미확보는 미완료로 유지한다.
- [ ] W9 통합 회귀·owner 반영과 단계 재마감 — 지원 shell별 대기/실행/중지/background/exec/입력 경합·일반/force 실패 복구를 검증하고 pnpm check·실측 범위를 기록한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- plans/aiox-tui-product-rebuild.md의 Stage2-2 공통 선행 단계다. Stage2-1 결과와 logs/2026-09-09-AIOX-TUI-Stage3-Claude.md의 최신 검증을 소비하고 완료 후 Stage3 W1로 복귀한다. Claude 전용 정책이 아니라 모든 aiox 명령·실행 위치에 적용하며 vendor별 framework를 선설계하지 않는다.
- Required read: docs/specs/aiox-runtime.md, docs/specs/aiox-host.md, docs/specs/aiox-collaboration.md, docs/architecture/aiox-vendor-bindings.md, docs/architecture/aiox-storage-terminal.md, docs/architecture/aiox-system.md 및 각 owner AGENTS.md. W1에서 실행 소유권 계약과 docs/decisions/execution-ownership.md를 반영했다. 문서의 As-built와 Codex/Host 등 Target을 구분한다. Stage3 이전 daemon PTY 검증을 외부 직접 실행 증거로 승계하지 않는다.
- 기존 Claude production/test는 현재 동작 근거이며 설계 제약이 아니다. 2026-09-11 책임 경계 구현 착수 entry의 실행 분담과 정책을 따른다. 최초 준비 실패 오류·vendor 종료 유지, daemon 연결 손실 외부 생존, DB 정리 실패 stop_incomplete·재시도는 재승인 없이 적용한다.

### {W4,W5}

- W4·W5 완료. 최신 완료 entry의 실제 Claude 외부 4종 단절·Web 복원 근거와 최종 404 tests 결과를 따른다. Stage3 W1로 인계했으며 다른 OS·모델 메시지 E2E는 Stage3 후속 검증이다.

### {W6,W7,W8,W9}

- 최신 대기 shell 후속 블록의 승인 범위와 shell별 실측 한계를 따른다. 기존 W1–W5를 다시 구현하지 않는다. 일반 종료는 unknown/busy 보존, --force는 daemon 소유 실행 종료; 두 경로 모두 입력·신규실행 차단을 유지한다. Enter 전 문자열 보존·cwd 추적은 요구하지 않는다.

### {W8,W9}

- W6/W7 완료 결과를 소비한다. 사용자가 GitHub Actions Windows runner에서 구현·자동 검증하고 별도 Windows PC에서는 마지막 사용 확인을 하는 방향을 승인했다. codex/stage2-2-idle-shell-windows 검증 브랜치에서 기존 3 OS×Node22/24 CI를 재사용한다. Windows cmd/PowerShell 연동은 구현·ConPTY 실측 중이며 단순 unknown 유지나 PowerShell 컨테이너 결과로 완료 처리하지 않는다. W9는 전체 지원범위 회귀·owner 반영과 단계 마감을 수행한다.

## 2026-09-11 · 공통 실행 위치·명령 정책 합의와 Stage2-2 착수 준비

사용자는 처음에는 토론을 기록하지 말도록 했으나, 최종적으로 Stage2-2 생성·로그 기록·활성 포인터 이동을 명시적으로 요청했다. 이번 작업은 문서와 포인터 구성이다. 제품 코드 수정·신규 정책 구현·검증을 완료한 기록이 아니다.

### 확정 요구와 정책

이번 요구의 기준은 Claude/Codex라는 vendor가 아니라 AIOX 명령과 실행 위치다. 어디에서든 host run은 daemon 소유 실행을 Web에 표시한다. Web shell의 agent run <agent>는 daemon 소유로 기존 Web terminal에 표시하며 종료하면 기존 shell로 복귀한다. 외부 터미널의 agent run <agent>는 CLI가 vendor를 직접 실행하고 사용자 stdin/stdout/stderr를 상속한다. 사용자 터미널 자체의 PTY는 사용하지만 AIOX 추가 PTY·headless·xterm·Serialize를 외부 실행 경로에 사용하지 않는다. 일반 claude/codex 직접 실행은 자동 Agent 등록하지 않는다.

| 상황 | Web·Host·daemon 소유 shell | 외부 agent run |
| --- | --- | --- |
| daemon stop --force | 소유 실행 자원을 종료·확인 | vendor 및 필요한 부속 실행 유지 |
| 일반 daemon stop | 기존 소유 실행 blocking 유지 | 외부 등록 자체는 blocker에서 제외 |
| 실행 중 daemon 비정상 종료·연결 손실 | 정상 종료 성공으로 추정하지 않음 | TUI 유지, 협업 등록·기능은 종료 |
| Web 닫기·새로고침 | 실행 유지·화면 복원 | 영향 없음 |

외부 시작 시 daemon 연결 실패는 vendor 실행 전에 오류로 반환한다. 실행 중 연결 손실 후 자동 재연결·재등록은 하지 않는다. daemon 재시작 후 협업 기능 복구는 agent run 재실행으로 한다. 외부 TUI는 사용자 터미널에서만 조작하며 Web은 등록이 유효할 때 상태만 조회하고 터미널을 생성·조작·이관하지 않는다. vendor 정상 종료 후 CLI는 정리 요청 실패와 무관하게 shell 복귀를 완료한다. daemon 종료 독립성은 vendor의 필수 부속 실행에도 적용하며 Codex Relay·App Server는 Stage4에서 외부 CLI 소유로 연결해야 한다.

Host 기존 정책은 docs/specs/aiox-host.md를 유지한다. 같은 YAML 실행별 신원·Network 분리, 실행 중 Host 이름 유일성, 실행 중 Agent 중복 시작 방지·이름별 결과, 이번 시작 시도가 만든 자원으로 실패 보상 제한, 사용자 파일 보존·정리 실패 비은폐가 기존 계약이다. 토론 중 제안한 중복 Host 기존 상태 반환·일부 시작 실패 시 성공 Agent 유지 정책은 채택하지 않았다. 세부 실패 동작은 기존 계약과 대조하고 Stage5가 소유한다.

### 합의한 코드 경계와 검토 근거

현재 RuntimeRegistry·AgentBinding을 재사용한다. RuntimeRecord에는 아직 vendor·실행 소유권 필드가 없고 terminalOwnership은 terminal 차용 관계다. 실행 소유권을 terminalOwnership으로 대신하지 않는다. agentRunSchema.adapter는 현재 claude literal 검증에만 쓰이고 실제 daemon 라우팅은 claude.attach로 고정돼 있다. 검증 역할까지 무의미한 죽은 필드로 단정하지 않으며 vendor 하나짜리 dispatch 추출은 이번 범위가 아니다.

현재 bootstrap의 agent run은 모두 WS foreground로, ClaudeController.attach는 연결 손실→finish→stopRuntime으로, ClaudeBinding은 PTY 생성·session.alive 준비/전송 판정·kill/dispose·inbox 디렉터리 삭제로 연결된다. daemon stopRuntime은 binding.stop 뒤 등록을 정리하며 teardown은 모든 Runtime을 blocking/force 대상으로 본다. 이 결합을 새 정책에 맞춰 분리한다. 기존 코드는 당시 계약을 따른 것이며 이번 변경 요구와의 불일치를 과거 결함으로 단정하지 않는다.

외부 경로는 기존 Web attach와 별도 제어 WS를 쓴다. 준비 응답 전에 Registry·hook 맵·credential을 준비하고 CLI가 vendor를 실행해 시작·종료를 통보한다. 화면 바이트·resize는 보내지 않는다. CLI/연결 사망 시 daemon은 협업 등록을 정리하되 CLI는 daemon 연결 손실 때문에 vendor를 종료하지 않는다. 로컬 프로세스 사망의 WS close를 활용하며 heartbeat·lease·자동 재연결을 선도입하지 않는다. 관측 상실을 vendor 종료 성공으로 해석하지 않는다.

외부 inbox 임시 디렉터리는 CLI가 mkdtemp·권한·경로 길이 검사부터 rm까지 소유한다. 실제 inbox socket은 vendor가 열고 daemon은 접속자다. 준비 시 CLI 경로를 등록에 고정하고 인증된 hook의 보고 경로와 정확히 대조하는 기존 검사를 유지한다. hook 인증만으로 임의 경로를 신뢰하지 않는다. 실제 실행 CLI에서 동일 cwd/env로 버전을 검사한다. 주입·설정 보존·충돌 검사 코드는 복제하지 않고 재사용한다.

외부 hook에서 ECONNREFUSED는 조용히 정상 종료한다. 401은 등록 종료와 잘못된 credential을 구분하지 못하므로 기존 진단을 유지한다. 잘못된 보고·설정·timeout 및 Web/Host hook 실패도 진단한다. CLI가 죽고 vendor만 남은 경우 401 반복 출력 가능성은 수용한 한계다. 현재 helper의 stderr/exit 1은 코드로 확인했지만 vendor 화면의 출력 횟수·비차단 동작은 미실측이다. 리스너 부재는 통상 즉시 거부지만 무응답 daemon 등의 timeout 가능성이 있어 지연이 전혀 없다고 단정하지 않는다.

### 단계 경계·검증·복귀

AIOX 공통 실행 정책은 지금 구현할 요구다. 미루는 것은 새 Registry·범용 runner·adapter framework·두 번째 vendor를 예상한 추출이다. Web의 기존 shell PTY+vendor PTY·relay 구조는 유지한다. Claude는 공통 정책을 검증할 현재 구현 사례이며 Claude 전용 정책으로 축소하지 않는다.

Stage3 최신 실제 검증은 /private/tmp/aiox-stage3-w1-real.mjs와 /private/tmp/aiox-s3-real-asYHai에서 두 경로의 준비·/exit·shell 복귀를 확인했으나 외부도 daemon PTY였다. 이 결과를 외부 직접 실행 성공으로 승계하지 않는다. 새 검증은 daemon 정상·force·비정상 종료 뒤 외부 TUI 생존과 실제 조작, 자원 정리, WS 손실 후 등록 정리, Web 회귀를 포함한다. OS별 증거와 미검증을 분리한다.

Stage2-2 완료 후 plans/aiox-tui-product-rebuild.md의 Stage3를 활성화하고 logs/2026-09-09-AIOX-TUI-Stage3-Claude.md W1에서 새 공통 결과를 소비한다. Claude inbox 메시지·hooks 결과·Windows 전체 통합은 Stage3, Codex 부속 실행은 Stage4, Host 미구현은 Stage5에 남는다. owner docs의 현재 standalone 전체 force 종료·daemon 실행 전제는 W1에서 갱신할 대상이며 이번 기록 자체를 as-built 사실로 취급하지 않는다.

### 2026-09-11 17:26 · W1–W3 실행 요청·병렬 영향 조사와 실패 정책 결정 대기

사용자가 subagent들과 ponytail을 적용해 W3까지 진행하고, 새 정책이 필요하면 보고·결정 후 계속하도록 요청했다. ownership_scout, external_scout, docs_scout가 각각 수명 관리, CLI 제어 경로, owner 문서를 읽기 전용으로 조사했다. 메인은 bootstrap.ts, claude-controller.ts, claude.ts, runtimes.ts, daemon.ts의 stopRuntime/teardown, networks.ts와 관련 테스트·runtime spec·decision을 직접 대조했다. 기존 작업 트리에 Stage3 코드·문서의 미커밋 변경이 있으므로 이를 보존한다.

확인: bootstrap의 모든 agent run이 foreground WS를 사용한다. ClaudeBinding readiness/deliver는 session.alive에 결합돼 있다. daemon stopRuntime은 binding.stop → terminal 정리 → route/message 정리 → unregister 순서다. daemon.test.ts의 keeps route cleanup failure retryable through daemon force stop 테스트는 route DB 실패 시 credential 유지와 다음 force 재시도를 요구한다. claude-controller.ts는 최초 inbox/hooks 준비가 60초 내 완료되지 않으면 finish를 통해 vendor를 종료한다. 이는 새 외부 실행 경로에 그대로 적용할 수 없다. 테스트는 읽었으며 이번 턴에 실행하지 않았다.

결정 대기(아래는 제안이며 승인된 정책 아님):
- 외부 vendor 시작 후 협업 준비 timeout/제어 오류: TUI를 유지하고 실패 진단 후 협업 등록만 종료할지, 최초 준비 실패에 한해 vendor도 종료할지. 유지 권고. 유지할 경우 CLI shell 복귀 exit code는 vendor 결과를 따르되 준비 실패는 즉시 진단하는 안을 권고한다. 기존 계약은 준비 실패 표시를 요구하지만 이 상황의 종료 주체와 최종 exit code를 확정하지 않았다.
- 외부 등록 정리 중 DB 실패: 협업 인증·전송 자격은 즉시 회수하고 정리 실패 기록을 남겨 daemon stop 재시도를 유지하는 안을 권고한다. 외부 vendor는 유지한다. 사용자에게 정리 미완료를 보고하고 daemon 종료 성공을 보류한다. 등록 완전 삭제 후 경고만 남기는 안은 단순하지만 route/미확정 요청 정리 재시도 경로를 잃을 수 있다. 메인이 stopRuntime과 route 재시도 테스트에서 순서를 확인했고, 메시지 내부 재시도 정보 영향은 ownership_scout의 조사 결과로 아직 별도 재검증이 필요하다.

최소 구현 후보: 기존 Registry/Binding과 launch 주입 함수를 재사용하고 외부 제어 WS만 분리한다. 인증된 Web shell 문맥과 외부 문맥의 경계를 검증한다. HTTP hook/MCP가 WS started보다 먼저 올 수 있으므로 준비 단계에서 인증된 관측을 받고 준비 완료 공개는 시작 확인까지 지연해야 한다(external_scout 분석, 구현 전 확인). W3 실행에 필수인 CLI inbox 생성·정리는 W4 일부를 선행해야 하며 W4 전체 완료로 처리하지 않는다.

문서 scout가 식별한 영향: runtime/host/collaboration과 system/vendor-bindings/storage-terminal 외에 configuration-web, product, roadmap, aiox-tui-product의 전체 실행·화면·종료 설명도 연결된다. 기존 tui-product-boundary decision의 전체 관리 실행 종료 rationale은 직접 확인했다. 과거 WHY를 덮어쓰지 않고 기존 합의로 바뀐 소유권 부분의 새 decision을 작성하는 대상이다. owner 변경은 아직 수행하지 않았다.

현재 W1은 영향 조사 중이며 완료가 아니다. 위 실패 정책 결정 후 W1 owner 반영과 W2/W3 구현·검증을 계속한다. W2/W3는 미착수, W4/W5는 후속 범위로 유지한다. 본 기록 외 코드·owner 문서 변경 없음.

### 2026-09-11 17:27 · 실패 정책 설명 보강·준비 확인의 실제 한계

사용자는 협업 준비와 DB 정리 실패의 구체적 의미를 요청했다. 정책 승인은 아직 없다. 메인이 claude.ts, claude-inbox.ts, daemon.ts MCP initialize 처리, messaging.ts settle/forget/drain과 claude-observations.ts 결과 보존을 추가 확인했다.

협업 준비의 현재 구현 의미: vendor 프로세스 생존, 인증된 hook 보고의 할당 inbox 경로·token 검사와 inbox 연결/auth frame 쓰기 완료, Network를 지정했을 때 인증된 MCP initialize 성공을 함께 확인한다. inbox probe는 모델 메시지를 보내지 않고 ACK·모델 수신·업무 완료를 증명하지 않는다. 모든 hook 종류의 정상 동작을 전수 검증하는 과정도 아니다. 60초는 현재 ClaudeController의 구현값이며 새 외부 실행의 합의된 공통 deadline으로 확정한 값이 아니다. 준비 전 starting은 전송 가능 상태로 공개하지 않는다.

정리 실패는 실제 발생한 장애 보고가 아니라 새 경로가 처리해야 할 실패 분기다. DB 처리에는 해당 실행의 standalone route 제거와 미확정 delivery 결과 저장 등이 있으며 Network 정의·기존 메시지 이력 삭제와 다르다. DB 쓰기가 실패하면 현재 stopRuntime은 unregister에 도달하지 않는다. Registry를 즉시 완전히 버리는 안은 route 및 일부 pending 결과의 기존 재시도 순회를 잃을 수 있음을 직접 확인했다. 외부 협업 종료 시 인증·발견·전송을 막는 책임과 실패 정리 정보를 보존하는 책임을 구분해 설명한다. daemon 프로세스 자체가 죽으면 이 메모리 기반 재시도 경로도 사라지므로 재시작 후 복구 보장으로 확대하지 않는다.

이전 제안의 Web 정리 미완료 표시는 새 UI 구현 확정이 아니다. W3까지는 기존 종료 실패 응답·진단 표면을 우선 재사용하며 별도 운영 UI 범위 확장은 사용자 결정 없이 추가하지 않는다. 두 실패 정책과 CLI exit code는 결정 대기를 유지한다.

### 2026-09-11 17:30 · 기존 코드 경계 변경과 후속 vendor 구현에 대한 설계 질문

사용자는 현재 코드의 경계 자체를 바꾸면 다른 vendor 구현에도 나아지는지 질문했다. 메인은 vendor-bindings의 Claude As-built/Codex Target, domain RuntimeActivity/mcpStatus, daemon 등록 경로를 추가 확인했다. Codex 신규 구현 완료 근거는 없으며 후속 이점은 목표 구조에 근거한 설계 판단이다.

제안: 프로세스 소유·종료, 협업 등록 유효성·인증/발견, vendor별 준비·입력·관측, DB 정리와 재시도 책임을 구분한다. 공통 daemon은 명령과 인증된 실행 위치로 소유권을 결정하고 등록 유효성 상실을 즉시 적용하며, 준비가 무엇인지는 vendor binding이 판단한다. Claude의 inbox/hooks 준비를 Codex 공통 준비 규약으로 추출하지 않는다. 기존 RuntimeRegistry/AgentBinding과 종료 직렬화 경로를 재사용하며 새 Registry/범용 runner/plugin framework는 만들지 않는 최소 변경이 적절하다는 의견이다.

확인: failed는 현재 MCP 발견 가능한 작업 상태이며 stopped는 전송 제외되지만 실제 프로세스 종료 의미와 연결된다. 따라서 외부 vendor가 살아 있는데 협업 등록만 끝난 상태를 failed/stopped만으로 대체하면 서로 다른 의미가 섞인다. 이는 별도 제품 enum 신설 확정이 아니라 등록 유효성을 작업 활동과 구분해야 한다는 경계 판단이다. 타 vendor가 얻는 이점은 소유권·권한 회수·DB 정리 실패 처리 재구현을 줄이는 것이다. Codex의 TUI·Relay·App Server 생존은 로컬 architecture Target과 기존 합의에 따른 설계 예이며 이번 턴에서 외부 API 동작을 새로 검증하지 않았다.

경계 개선은 기존 W1–W3의 목적과 부합하나, 앞선 외부 준비 실패의 TUI 유지/종료·exit code 및 DB 실패 시 daemon 종료 보고 정책에 대한 승인은 아직 없다. 새 사용자 메시지를 해당 정책 승인으로 취급하지 않는다.

### 2026-09-11 17:33 · 기존 정책 재확인·DB 정리 실패 재승인 요청 철회

사용자가 두 정책의 기존 기록 유무를 지적해 Stage2·Stage3·Baseline 원문과 runtime spec을 다시 확인했다. 앞선 entry들의 'DB 실패 시 daemon 종료 보고 정책에 대한 승인은 아직 없다'는 판단을 정정한다. docs/specs/aiox-runtime.md:72,83-84는 정리 미완료 시 daemon/Web 유지와 종료 재시도를 명시한다. Stage2 로그 2026-09-09 01:19 entry는 DB 결과 저장 실패 시 correlation 보존을, 02:13 entry(211-213줄)는 실제 route DB 갱신 실패를 기존 stop_incomplete·재시도로 전달하는 사용자 승인 반영을 기록한다. 따라서 DB 정리 실패 시 종료를 보류할지 다시 승인받을 필요가 없다. Stage2-2의 외부 연결 손실 시 협업 종료 요구와 결합해 인증·발견·전송 차단을 정리 재시도 정보 보존과 분리하면 된다. credential 유지라는 기존 테스트의 구현 선택을 제품 정책과 혼동해 불필요한 결정 질문을 만든 것이었다.

준비 실패도 기록이 없다던 포괄적 설명을 정정한다. Stage3 2026-09-11 승인된 Claude 수명·관측 수정(74줄)은 60초 최초 준비 제한을 wasReady로 판정하고 준비 완료 뒤 일시 inbox 실패를 초기 실패로 종료하지 않도록 수정·검증했다고 기록한다. 현재 코드는 최초 준비 timeout을 오류·종료로 처리한다. Baseline §11은 준비 실패 Runtime failed 표시를, runtime spec 37-43줄은 준비 실패 비은폐를 요구한다. 다만 확인한 기존 기록에서 새 외부 CLI 직접 실행의 최초 준비 실패를 'TUI 유지'로 바꾼 명시 결정은 찾지 못했다. Stage2-2의 외부 생존 명시 대상은 daemon 종료·실행 중 연결 손실이다. 따라서 기존 초기 시작 실패 처리와 새 외부 수명 정책의 적용 범위를 구분해야 하며, 유지 제안을 이미 합의된 값으로 적용하지 않는다. 기존 정책 전체가 미정인 것으로 재질문한 접근을 철회한다. 사용자에게 이 근거와 남은 구분을 보고한다.

### 2026-09-11 17:37 · W1–W3 책임 경계 구현 착수·실행 분담

사용자가 책임 분리부터 진행하는 방향을 확인한 뒤 기존 Claude production/test code에 묶이지 말라고 명시했고, 작업을 세워 계속 진행하며 필요한 기록을 남기도록 지시했다. 기존 코드와 테스트는 actual evidence일 뿐 새 설계의 제약이 아니다. 합의된 정책을 기준으로 production과 테스트를 함께 변경한다.

유효 정책: 최초 준비 실패는 기존 오류·vendor 종료 처리를 유지하고 TUI 유지 제안을 적용하지 않는다. 준비 이후 daemon 정상/force/비정상 종료·제어 연결 손실은 외부 vendor 생존과 협업 종료로 처리한다. DB 정리 실패는 기존 stop_incomplete·daemon/Web 유지·재시도를 적용하며, 권한 회수와 정리 정보 보존을 분리한다. 외부 최초 준비 중 명시적 startup 실패와 daemon 연결 손실을 서로 다른 사건으로 다룬다.

실행 순서와 분담:
- W1: docs_scout가 기존 owner와 연결된 product/roadmap/configuration-web/decision까지 합의된 Target을 반영한다. main이 결과·근거·링크·범위를 검토하고 W1 완료 판정한다.
- W2: ownership_scout가 Registry 실행 소유권·협업 유효성, 즉시 revoke/성공 후 unregister, daemon stop 및 등록 경합, MCP/조회/발견/전송 consumers와 tests를 담당한다.
- W3: external_scout가 Claude process/PTy 책임과 협업 Binding 분리, 외부 제어 WS·hook/MCP 시작 경합·최초 준비 실패와 tests를 담당한다. main은 protocol, CLI 직접 spawn·stdio 상속·생존/정리, build/public import, 통합 검증을 담당한다. daemon.ts는 W2 담당 단일 writer로 endpoint를 연결한다.
- 공유 인터페이스는 먼저 메시지로 합의하고 파일별 단일 writer를 유지한다. subagent 결과는 candidate이며 main이 직접 검토·통합한다. 이 기존 Base 로그에서 단일 변경 흐름을 추적하며 병렬 실행 자체를 이유로 추가 task scaffold를 만들지 않는다.

검증: 정책별 실패 테스트→최소 구현→대상 테스트·typecheck, 최종 pnpm check와 built Node 공개 entry 확인. W3에 필요한 inbox CLI 생성·권한/길이·정리와 실제 CLI version probe는 W4 일부 선행 연결로 기록하고 W4 전체를 완료 처리하지 않는다. W5의 실제 vendor 조작·OS 통합은 이번 W3 완료와 구분한다. 새 정책이 실제 필요하면 먼저 기존 로그/owner를 확인하고 기존 합의로 해결되지 않는 부분만 사용자에게 요청한다.

### 2026-09-11 17:47 · W1·W2 결과 수용·W3 통합 검증 진행

W1 owner 반영을 수용한다. docs_scout가 runtime/host/collaboration/configuration-web, system/vendor-bindings/storage-terminal, product/roadmap/aiox-tui-product를 갱신하고 execution-ownership decision을 추가했다. 기존 decision WHY·과거 daemon PTY 실측은 보존한다. 메인이 actual diff·owner 연결과 새 API/코드 경계를 대조했고 Markdown·wikilink·git diff --check 검사를 확인했다. 최초 준비 실패와 연결 손실을 readiness 전후가 아니라 발생 원인으로 구분한다. 연결 손실은 시작된 vendor를 준비 전후 모두 유지하며 명시적 startup-failed만 초기 실패 종료를 요청한다. 구현된 Claude 경계는 As-built, Codex·Host 및 미구현 외부 hook ECONNREFUSED는 Target으로 구분한다.

W2 결과를 수용한다. executionOwnership과 collaborationActive를 기존 RuntimeRegistry에 추가하고 revoke를 성공 후 unregister와 분리했다. stopRuntime은 즉시 협업을 회수한 뒤 daemon 소유 실행에만 stop을 호출하고 공통 cleanup/route/message 정리를 수행한다. 실패 record는 인증·발견·전송에서 제외하며 재시도 경로에 남는다. 정상 stop은 외부 등록 자체로 거절하지 않고 force에서도 외부 vendor stop을 호출하지 않는다. 신규 등록·terminal 차용·준비 경합을 검증했다. main이 source diff/consumer를 직접 검토했고 ownership_scout 72 tests, 독립 docs reviewer 46 tests, 추가 MCP/discovery revoke 경합 29 tests 결과를 확인했다.

독립 리뷰 보완: DB 조회 대기 중 source revoke의 discovery 누출, hook body 대기 중 revoke 후 관측 적용, CLI inbox 생성 대기 중 WS error 리스너 공백, 연결 손실 후 버퍼에 남은 startup-failed가 vendor를 종료하는 경합을 재현·수정했다. Claude cleanup의 external_connection_lost를 AIOX 요청 관측 실패로 기록하는 것은 기존 failed 정책과 호환됨을 재판정했다. reviewer의 'failed 사용 금지/interrupted로 교체' 제안은 기존 합의 근거가 없어 철회·기각했으며 vendor 업무 성공/실패와 AIOX 입력 연결 실패를 구분하는 문서로 교정했다.

전체 pnpm check 1차 통과: lint·format·build·typecheck와 33개 파일/379 tests(domain28/config15/protocol9/terminal67/persistence14/web20/daemon187/cli39). 이 검사는 이후 진행 중인 최초 준비 실패 신호를 DB 정리보다 먼저 전달하는 보완 전 결과다. W3 최종 완료는 해당 보완·최종 검증과 built CLI+daemon 대역 vendor 실제 프로세스 검증 뒤 판정한다. W3 필수 inbox 생성/권한/길이/정리와 CLI 버전 probe를 기존 함수 public subpath로 재사용했으며 새 외부 패키지는 설치하지 않았다.

### 2026-09-11 17:54 · W3 완료·최종 검사와 W4 재개 경계

W3를 완료한다. 외부 agent run은 CLI에서 vendor를 직접 실행하고 stdio를 상속하며 제어 WS에는 준비·시작·종료만 전달한다. Web의 인증된 foreground 경로는 유지한다. 공통 Registry의 실행 소유권·협업 유효성과 binding의 프로세스 종료·협업 정리를 분리했고, 외부 연결 손실은 즉시 인증·발견·전송을 회수하면서 vendor와 CLI 소유 inbox를 유지한다. 최초 명시적 startup-failed는 DB 정리 완료를 기다리지 않고 CLI에 전달해 vendor를 종료한다. exit 수신도 비동기 결과 저장 전에 revoke한다. 이 두 경합은 실패 재현 테스트 후 수정했다. 기존 Claude production/test를 불변 계약으로 삼지 않았으며 새 범용 runner/vendor framework는 추가하지 않았다.

최종 확인: pnpm check exit 0, lint·format·build·typecheck 및 33개 파일/383 tests 통과(domain28/config15/protocol9/terminal67/persistence14/web20/daemon190/cli40). 원본 출력은 /private/tmp/aiox-w3-final-check-approved.log. 직전 sandbox 실행은 localhost listen EPERM으로 실패해 승인된 실행으로 재검증했으며 제품 실패와 구분한다. git diff --check와 owner Markdown inline-code·링크 검사를 통과했다.

빌드 통합 증거: /private/tmp/aiox-w3-ownership-smoke/proof.mjs와 /private/tmp/aiox-w3-ownership-smoke/1789116638950/results.json. ownership_scout가 최종 빌드에서 daemon 정상 stop·force·SIGKILL·제어 WS만 단절하는 네 경우를 실행했고 main이 script와 결과를 직접 확인했다. 전부 terminalId=null, terminals=[]이며 종료/단절 뒤 vendor가 입력에 응답하고 CLI는 vendor exit code 7을 반환했다. inbox는 vendor 생존 중 유지되고 종료 뒤 제거됐다. WS만 단절한 경우 daemon은 살아 있고 Agent 조회는 비어 있었다. 실제 built CLI·daemon 프로세스에 대역 claude와 pipe stdio를 사용한 검증이며 실제 Claude 모델·native TTY·OS 전체 통합의 증거는 아니다.

다음은 W4다. W3에서 필수였던 CLI inbox 생성·0700 권한·Unix 경로 길이·정리, 동일 cwd/env 버전 검사와 기존 주입 helper 재사용은 구현했다. W4에서는 외부 hook ECONNREFUSED만 조용히 처리하는 미구현 부분과 주입·자원 실패 경계의 남은 검증을 이어간다. 401·잘못된 보고·timeout 및 Web/Host 진단 유지 정책은 이미 합의돼 있다. 실제 vendor 조작·shell 복귀·Web 화면 회귀와 OS별 증거는 W5에 남는다. 사용자 요청 범위 W1–W3 완료이며 W4/W5 또는 Stage2-2 전체 완료로 확대하지 않는다. plan의 Stage2-2 활성 포인터는 유지한다. 새 사용자 동작 정책 결정은 필요하지 않았다. 기존 미커밋 변경을 보존했고 commit/push는 하지 않았다.

### 2026-09-11 19:10 · W4·W5 완료와 공통 vendor 경계 반영·Stage3 인계

사용자가 기록 금지를 해제하고 Stage2-2 완료 기록과 직전 구현 커밋의 병합을 요청했다. 기록 중단 기간에 수행한 구현·검증을 소급 정리한다. 기존 기준점은 7b5bbc5이며, 직전 구현 커밋 79b94d5는 이번 문서 반영과 함께 amend하므로 최종 SHA는 바뀐다.

W4 완료: 실행 소유권을 공통 controller에서 adapter로 전달하며 외부 hook의 ECONNREFUSED만 조용히 exit 0으로 처리한다. 401·잘못된 입력·timeout·reset 및 daemon 소유 실행 진단을 유지하고 설정의 예약 환경 변수 덮어쓰기를 거절한다. 실제 built hook subprocess 확인은 /private/tmp/aiox-w4-hook-smoke.mjs다.

공통 vendor 경계와 Claude 마이그레이션을 완료했다. packages/vendor가 실행·자원 수명을, packages/adapters/claude가 Claude 준비·inbox·hooks·관측을, apps/daemon/src/agent-controller.ts가 공통 등록·제어 수명을 맡는다. CLI→daemon 패키지 의존과 attach 경로 중복을 제거했다. 여러 vendor 요구는 확정이며 Claude의 통신 방식·단일 프로세스를 공통 필수 조건으로 두지 않는다. 실제 vendor 검증은 Claude 하나이고 helper/background의 다른 vendor 적용은 테스트 대역 근거뿐이다. Codex 실구현 전 여러 실제 vendor에 충분한 계약이라고 단정하지 않는다.

W5 완료: macOS arm64, Node24.14.0, 실제 Claude2.1.268에서 daemon 정상 stop·force·SIGKILL·제어 WS 단절 후 /help 조작과 /exit 0·기존 shell 후속 입력을 확인했다. 외부 CLI와 Claude의 동일 TTY 및 직접 자식 관계, terminalId=null·daemon terminals=[], 생존 중 inbox 보존·종료 후 socket/임시 디렉터리 삭제를 확인했다. WS-only 단절은 daemon 생존·등록 제거·기존 hook credential 401을 확인했다. 근거: /private/tmp/aiox-w5-real-external.mjs, /private/tmp/aiox-w5-real-1789120416147/results.json 및 mode별 화면 산출물.

Web은 실제 Claude의 inbox·hook·Network MCP 준비, borrowed shell, viewer detach 생존·재연결 snapshot/state 및 동일 idle 화면 복원, /exit 0·원래 shell 입력·socket/디렉터리 정리를 확인했다. 근거: /private/tmp/aiox-vendor-web-real.mjs, /private/tmp/aiox-vendor-web-real-RTgZLr/results.json. 최종 실측 빌드 해시 일치와 검사한 사용자/프로젝트 설정 보존을 확인했다. 실제 WebSocket+xterm 소비 경로 검증이며 브라우저 픽셀 또는 모델 메시지 E2E 증거는 아니다. 최초 Web 화면 비교 실패는 /rc connecting 표시의 자연 변화였고 안정된 화면으로 재검증 통과했으며 격리 daemon 정리도 성공했다.

실측 뒤 리뷰의 미사용 ready 계약/getter 제거, hasProcessHandles 명명, native resize·두 번 stop의 이유 주석, dimensions 범위 정리, observation 필수화 및 CLI 응답 fixture 보완을 반영했다. 구버전 호환은 필요 없다는 사용자 지시를 적용했다. 해당 최종 코드의 pnpm check exit 0, 36개 파일/404 tests 통과(domain28/config15/protocol10/terminal67/persistence14/web20/vendor3/adapter66/cli43/daemon138), git diff --check 통과. 실제 Claude 수명 실측은 이 마지막 소규모 정리 전 결과이고 이후 회귀는 전체 자동 검사로 확인했다.

계약·구조·실측 범위는 docs/specs/aiox-runtime.md와 docs/architecture/aiox-system.md, aiox-storage-terminal.md, aiox-vendor-bindings.md에 반영했다. Windows native/Linux/WSL 실제 vendor 통합과 Claude 모델 메시지 E2E는 Stage3 W2·W3·W5에서 해당 환경과 실제 vendor를 확보해 검증한다. Codex는 Stage4, Host는 Stage5다. Stage2-2 자체 미완료 항목은 없으며 Stage3 W1에서 새 공통 경계를 소비하도록 재개 문맥과 plan을 복귀한다.

사용자가 추가 제기한 idle shell만 있으면 일반 daemon stop으로 닫히는 UX는 이번 완료 범위에 포함하지 않는다. 현재 일반 shell은 blocker다. 프롬프트 대기와 실행·중지된 background 작업 구분은 후속 설계/구현 검토 사항으로 Stage3 재개 문맥에 전달하며, CPU 사용량이나 화면만으로 idle을 판단하는 정책을 확정하지 않았다.

## 2026-09-11 · 대기 shell의 일반 stop 허용과 공통 입력 차단

사용자가 이미 decided인 Stage2-2에 후속 작업을 기록하도록 요청해 다시 열었다. 기존 W1–W5 완료와 증거는 보존하고 이번 변경은 W6 이후에서 추적한다. 이전 idle 판정 조사에는 기록을 남기지 않았으며 여기에는 최종 승인 요구와 구현 판단을 기록한다.

확정: 대기 중이고 남은 실행/중지 작업이 없는 shell은 일반 daemon stop으로 조용히 닫는다. 이전 출력, 현재 cwd, Enter 전 입력 문자열은 종료를 막지 않으며 입력 문자열 유실을 허용한다. 실행 중인 명령·background·중지 작업 또는 판정 불가는 blocker다. stop과 --force 모두 신규 입력·실행 진입을 먼저 차단하고 거절·실패로 daemon을 유지할 경우 복구한다. 외부 CLI 소유 vendor 생존 정책은 유지한다. 지원 요청은 macOS zsh/bash, Linux bash/zsh/fish, Windows cmd/PowerShell이다. 사용자 shell을 임의 교체하지 않는다.

macOS/Linux 격리 실측에서 자식 없는 builtin loop와 exec 프로그램 반례가 확인돼 자식 없음만으로 idle 판정하지 않는다. Windows ThreadJob는 동일 프로세스 작업이므로 process tree만으로 판정할 수 없다. POSIX는 shell 자체의 대기/jobs 관측과 종료 직전 재판정을 구현하고, 공통 daemon은 입력·등록 경합을 닫는다. Windows는 실측 환경이 없고 cmd/PowerShell 안전 handshake가 아직 확정되지 않아 구현/실측 완료로 취급하지 않는다. 단순 조회 fallback으로 사용자 요구를 축소하지 않는다.

사용자 요청으로 subagent들이 ponytail full과 TDD를 적용한다. mac_shell_busy는 POSIX shell 연동, linux_shell_busy는 daemon stop 직렬화·입력 admission, windows_shell_busy는 Windows 안전 연동과 검증 경계, root는 terminal service·호출자·owner·로그·통합 검증을 담당한다. 필요한 정책 변경은 근거와 사용자 관찰 결과를 보고한 뒤 결정한다.

### 2026-09-11 19:47 · W6·W7 구현·실측 완료와 Windows 잔여 경계

W6 완료: daemon은 비동기 종료 검사 전에 stopping을 게시하고 acceptingInput을 false로 만든다. 기존 Web shell 입력·terminal response와 AgentController foreground 입력을 같은 gate로 막는다. 신규 등록은 거절하지만 이미 admission된 등록을 검사 중 취소하지 않으며 실제 teardown의 revoke로만 종료한다. 일반 stop 거절·stop_incomplete·예외에서는 입력을 복구한다. pending 등록·동시 stop·force·실패 복구는 테스트로 확인했다. 외부 CLI vendor 소유권은 변경하지 않았다.

W7 완료: packages/terminal/src/shell-integration.ts에서 임시 startup 연동과 shell 내 대기/jobs 재판정·자체 exit를 구현했다. ps는 disown한 자식과 이미 exec로 교체된 프로세스를 거절하는 보조 근거다. 새입력은 daemon에서 막고 일반 close에서도 shell이 재판정하며 종료 실패를 kill로 대체하지 않는다. 사용자 rc·PROMPT_COMMAND·WINCH handler를 보존하며 연동 충돌·실패는 blocker다. macOS Bash3.2 DEBUG와 Linux Bash5.2 PS0 분기는 실제 shell 동작 차이를 확인해 적용했다. 지원되지 않는 shell/인자 조합은 보수적으로 유지한다.

실측/회귀: macOS 실제 zsh/bash 18 tests(대기/cd/미제출text/builtin loop/read/foreground/background/stopped/disown/exec/기존trap보존), Linux Bash5.2.37/Zsh5.9/Fish4.0.2 실제 PTY 22 scenarios 통과. Linux는 Docker arm64, Python PTY+Node20의 분리 모듈 검사이며 전체 Linux daemon/CLI 또는 제품 Node engine 검증이 아니다. 근거 /private/tmp/aiox-linux-handshake-result.txt, /private/tmp/aiox-linux-handshake.mjs, /private/tmp/aiox-shell-linux.mjs. 최종 source SHA256 711f0683f19c1b9566bd654a34de3bb4639771b95e0555c7d51931269f9eabf7을 root가 대조했다.

macOS 최종 built CLI 실제 검증: /private/tmp/aiox-idle-daemon-proof.mjs, /private/tmp/aiox-idle-daemon-DYhTFS/results.json. cd·이전 출력·Enter 전 문자열이 있는 shell에 CLI daemon stop 성공, 실제 vim 중 일반 stop active_runtimes 거절·입력 복구, --force 후 shell과 vim PID 실제 종료를 확인했다. 초기 검사에서 shell exit 관측자가 응답 파일을 먼저 지워 stop_incomplete 오판하는 경합을 발견했고 실제 exit 우선 확인으로 수정했다. 해당 회귀 테스트를 RED→GREEN으로 검증했다.

최종 pnpm check exit 0, 428 tests 통과. /private/tmp/aiox-idle-final-check.txt에 전체 결과가 있다. docs/specs/aiox-runtime.md와 docs/architecture/aiox-storage-terminal.md에 계약·구조·검증 범위를 반영했다. 제품 코드·테스트는 미커밋이며 사용자 실행 중인 daemon은 재시작하지 않았다.

W8/W9는 미완료다. Windows cmd/PowerShell은 아직 안전 연동 구현·ConPTY 실측이 없다. PowerShell OnIdle 요청파일+Get-Job prototype은 공식 ARM64 컨테이너에서 응답했으나 PSReadLine2.3.6 AcceptLine은 자동종료하지 않고 입력버퍼에 exit를 남겼으며, 입력 중 문자열이 있으면 OnIdle 자체가 발화하지 않는 제약도 확인했다. 이 축소안을 production에 넣지 않았다. /private/tmp/aiox-windows-idle-probe/probe.ps1은 조사 산출물일 뿐 구현 완료 증거가 아니다. 실제 Windows PC/CI runner 접근 방법을 사용자에게 비동기로 질문했고 아직 답이 없다. 다음 W8은 Windows 환경 확보와 cmd/PowerShell의 명시적 안전 종료 방법 검증부터 재개한다. 기존 Windows는 unknown blocker·force 경로를 유지한다. 지원 범위를 POSIX로 축소하거나 전체 작업 완료로 판정하지 않는다.

## 2026-09-11 · W8 Windows CI 검증 착수

사용자가 GitHub Actions Windows 자동 검증 진행에 동의했다. 개인 Windows PC에는 저장소와 Codex가 없으며 이후 수동 사용 확인은 별도다. codex/stage2-2-idle-shell-windows 브랜치에서 기존 OS/Node matrix를 재사용한다.

PowerShell 후보 구현은 PSReadLine 2.4.3 이상에서 읽기 중 timer 이벤트로 요청을 받고 정상 명령 루프에서 jobs·자식·요청 유효기간을 재확인한 뒤 종료한다. CI에는 Gallery에서 확인한 PSReadLine 2.4.5를 설치한다. 실제 Windows 검증 전이며 낮은 버전은 unknown blocker다. CMD는 출력 지연 PROMPT와 자식 없음의 오판을 조사하는 ConPTY 테스트를 준비했다. 별도 line editor나 native injection 도입은 결정하지 않았다. W8/W9 미완료를 유지한다.

## 2026-09-11 · W8 첫 CI 결과와 CMD 반례

c19d4c3를 작업 브랜치에 push하고 CI 34591849913을 실행했다(https://github.com/lunaxislu/aiox-prototype/actions/runs/34591849913). 로컬 pnpm check exit 0; macOS/Linux × Node22/24 CI 네 job 성공. Windows Node22/24는 PowerShell close 응답 후 실제 exit 대기 테스트 한 건에서 실패했다. 작업 보호·만료 요청 무시 검사는 통과했으나 전체 Windows 통과가 아니다.

CMD ConPTY 조사 테스트는 Windows 두 job에서 통과했다. pause 및 set /p 실행 중 자식0·늦게 도착한 PROMPT로 idle 오판을 확인했다. 특히 set /p는 콘솔 입력 모드도 빈 prompt와 동일한487이어서 이 세 관측을 합쳐도 안전한 자동 종료 근거가 되지 않는다. CMD 자체 종료 연동은 여전히 미구현이며 별도 Clink/native hook 도입은 미결정이다. 근거는 해당 CI src/cmd-idle.test.ts stdout이며 로컬 /private/tmp/aiox-windows-ci-failure.txt에도 보존했다.

독립 리뷰에서 Bash PROMPT_COMMAND 끝의 세미콜론과 추가 구분자가 합쳐져 syntax error가 나는 문제를 실제 재현했다. newline 구분자로 수정하고 기존 rc 보존 테스트를 강화해 POSIX18개·typecheck 통과를 확인했다. 다음 실행은 해당 수정과 Windows PowerShell5.1 검증 확장을 포함한다.
