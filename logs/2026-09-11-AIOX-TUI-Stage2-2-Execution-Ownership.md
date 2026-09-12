---
topic: AIOX TUI Stage2-2 Execution Ownership
description: AIOX 명령·실행 위치에 따른 실행 소유권과 외부 터미널 독립 수명
status: decided
---

## Work Items

- [x] W1 공통 실행 계약·영향 범위 확정 및 owner 반영 — 명령·인증된 실행 위치로 실행 소유권을 결정하고 runtime/terminal 소유권을 구분한다. 기존 spec·architecture와 CLI→protocol→daemon→Registry→binding→Web·tests를 대조해 새 정책과 충돌하는 계약을 갱신한다.
- [x] W2 Registry·daemon 수명 분리 — 기존 RuntimeRegistry에 실행 소유권을 표현하고 terminalOwnership과 구분한다. 등록 해제와 실제 프로세스 종료를 분리하며 일반 stop blocking·force 루프·실패 정리·진행 중 등록 경합에 새 정책을 적용한다.
- [x] W3 외부 실행·제어 연결 구현 — Web foreground 경로를 유지하고 외부를 ClaudeController.attach에서 분리한다. CLI의 vendor 직접 실행·입출력 상속, 제어 WS의 준비·시작·종료·연결 손실, 등록·hook 맵·credential 준비 순서와 CLI 종료 후 등록 정리를 연결한다. AIOX 공통 정책을 첫 구현인 Claude에 적용하며 외부에 PTY·headless·Serialize를 생성하지 않는다.
- [x] W4 실행별 주입·자원·hook 실패 경계 연결 — 기존 주입·충돌 검사를 재사용하고 실제 실행 CLI에서 버전을 검사한다. 외부 inbox 임시 디렉터리는 CLI가 생성부터 정리까지 소유하며 길이·권한 검사와 등록 경로 대조를 유지한다. 외부 hook ECONNREFUSED만 조용히 처리하고 401·잘못된 보고·timeout 및 Web/Host 오류 진단은 유지한다.
- [x] W5 실제 수명 검증·회귀·Stage3 인계 — 외부 PTY 미생성, daemon 정상·force·비정상 종료 뒤 실제 vendor 조작과 shell 복귀, 연결 손실 등록 정리, Web 실행·빌린 shell·화면 복원 회귀 및 pnpm check를 검증한다. OS별 미검증을 명시하고 owner·링크 정합을 확인한 뒤 Stage3 W1로 plan 포인터를 복귀한다. Claude 메시지 E2E·Codex·Host 미구현을 완료로 확대하지 않는다.
- [x] W6 일반 stop·force 공통 입력/신규 실행 차단과 종료 직렬화 — 거절·실패 시 입력을 복구하고 외부 vendor 수명은 유지한다.
- [x] W7 대기 shell 안전 종료 연동 — macOS zsh/bash 및 Linux bash/zsh/fish에서 shell 자체 대기·남은 작업 판정과 정상종료 handshake를 구현·검증한다.
- [x] W8 공통 터미널 설정·OS별 stop 정책 구현 — 기존 Windows 기준 브랜치를 보존하고 조사 후 shell/args/cwd와 외부 실행 종료를 구현한다. 새 정책 질문은 사용자 결정 후 재개하며 commit/push·CI·Windows 실측은 후속이다.
- [x] W9 후속 통합 검증·단계 재마감 — 8c2fbd7 전체 OS CI, Windows/WSL 사용자 실측, owner 정합 및 c000cab 문서 커밋·로컬 main 병합 완료. 사용자 결정으로 Stage2-3에 별도 개선과 활성 포인터를 인계한다. 원격 push는 보류한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- plans/aiox-tui-product-rebuild.md의 Stage2-2 공통 선행 단계이며 완료됐다. Stage2-1과 Stage3의 선행 결과를 소비했다. 사용자의 2026-09-12 결정으로 즉시 Stage3 복귀 대신 logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md의 Stage2-3 개선을 먼저 수행한다. Claude 전용 정책이 아니라 모든 aiox 명령·실행 위치의 기반이며 vendor별 framework를 선설계하지 않는다.
- Required read: docs/specs/aiox-runtime.md, docs/specs/aiox-host.md, docs/specs/aiox-collaboration.md, docs/architecture/aiox-vendor-bindings.md, docs/architecture/aiox-storage-terminal.md, docs/architecture/aiox-system.md 및 각 owner AGENTS.md. W1에서 실행 소유권 계약과 docs/decisions/execution-ownership.md를 반영했다. 문서의 As-built와 Codex/Host 등 Target을 구분한다. Stage3 이전 daemon PTY 검증을 외부 직접 실행 증거로 승계하지 않는다.
- 기존 Claude production/test는 현재 동작 근거이며 설계 제약이 아니다. 2026-09-11 책임 경계 구현 착수 entry의 실행 분담과 정책을 따른다. 최초 준비 실패 오류·vendor 종료 유지, daemon 연결 손실 외부 생존, DB 정리 실패 stop_incomplete·재시도는 재승인 없이 적용한다.

### {W4,W5}

- W4·W5 완료. 최신 완료 entry의 실제 Claude 외부 4종 단절·Web 복원 근거와 최종 404 tests 결과를 따른다. Stage3 W1로 인계했으며 다른 OS·모델 메시지 E2E는 Stage3 후속 검증이다.

### {W6,W7,W8,W9}

- 2026-09-12 터미널 설정·종료 정책 변경 블록이 승인 범위다. 과거 W6/W7 외부 force 생존·Windows idle 요구는 새 명시적 종료 정책으로 대체됐다. W8 구현·W9 CI/Windows 실측·owner 반영과 c000cab 로컬 main 병합을 완료했다. 최신 단계 마감 entry와 Stage2-3 인계를 따른다.

### {W8,W9}

- 최신 Windows 실측·오류 분류와 최종 CI entry를 소비한다. 8c2fbd7의 6개 OS/Node CI와 root pnpm check, 사용자 제공 Windows 실측을 구분한다. c000cab 문서 커밋·로컬 main 병합 후 W9를 마감했다. 원격 push는 사용자 보류이며 Windows cwd 사용 거부 미재현·실제 vendor 검증 한계는 유지한다. 별도 개선과 추가 후보의 수행·판정은 logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md가 소유하며 Stage2-2 해결로 세지 않는다.
- 신호 종료 질문은 기존 정책으로 철회했고 구현 반영됐다. SIGINT/SIGTERM·예기치 않은 연결 손실은 외부 생존, 명시적 CLI 요청은 새 OS별/force 정책이다. 필수 read는 최신 완료 블록과 runtime/config spec, explicit-execution-shutdown decision 및 변경 tests다.

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

## 2026-09-11 · W8 PowerShell Windows CI 성공

8447916의 CI34592261644는 Windows/Linux/macOS × Node22/24 여섯 job 전체 성공했다(https://github.com/lunaxislu/aiox-prototype/actions/runs/34592261644). PowerShell7·WindowsPowerShell5.1의 PSReadLine2.4.5 ConPTY14 tests가 Windows 양Node에서 통과했다. 종료요청부터 exit이벤트까지1480–1499ms, 승인부터는1059–1098ms였다. 설치된 node-pty의 WindowsPtyAgent FLUSH_DATA_INTERVAL=1000과 일치하며 첫실패는1초테스트대기 한계였다. 제품의 승인후2초대기는 수정하지 않았다. root가 gh run 결과와 /private/tmp/aiox-windows-ci-pass.txt를 직접 확인했다.

최종 종료 검사는 대역이 아닌 createTerminal().closeIdle() 공개경로로 바꿔 dispatch·실제exit·dispose까지 확인하도록 보강했다. 해당 마지막 테스트 변경은 다음CI로 검증한다. CMD 안전자동종료 미구현과 사용자PC 설정/브라우저 미검증은 남는다. W8/W9 완료표시는 하지 않는다.

## 2026-09-11 · W8 공개 종료 경로 CI 통과와 CMD 잔여 결정

최종 제품코드/테스트 commit23a8f00의 CI34592876478에서 Windows/Linux/macOS × Node22/24 여섯job 전체 성공을 root가 직접 확인했다(https://github.com/lunaxislu/aiox-prototype/actions/runs/34592876478). PowerShell7·5.1의 실제 createTerminal().closeIdle()로 입력중문자열 폐기·승인후2초내exit·dispose를 확인했다. 로컬 최종 pnpm build도 exit0이다. 사용자 daemon은 재시작하지 않았고 main에는 병합하지 않았다. 구현은 codex/stage2-2-idle-shell-windows 브랜치에 있다.

PowerShell 연동과 Windows 자동검증은 확보했다. CMD는 자식수·PROMPT·consolemode 반례로 자동종료 판정이 불충분하여 unknown blocker로 보존한다. 이는 합의한 확인불가시거절 정책을 지키는 현재동작이며 CMD 자동종료 구현완료를 뜻하지 않는다. 별도입력확장(native hook/Clink) 도입이나 CMD 자동종료 지원범위 변경은 사용자 결정 없이 하지 않는다. W8 재개점은 이 잔여범위 결정이고 W9 단계마감은 그 이후다. Windows 사용자PC의 프로필·브라우저 수동사용도 별도미검증으로 남는다.

## 2026-09-12 · 터미널 설정·종료 정책 변경과 조사 선행

사용자는 기존 Windows 검증 브랜치 보존 → 정책·변경 이유 기록 → 새 브랜치 구현의 3번까지만 승인했다. 새 코드 commit/push·CI·Windows 사용자PC 실측·main 병합은 이번 범위 밖이다. 기존 브랜치와 origin 추적 ref는 937055b14b9372d1f01ea19b3321b9fe77793a74로 일치하고 작업트리가 깨끗함을 확인한 뒤 codex/terminal-config-stop-policy를 생성했다. 기존 ref는 수정하지 않았다.

새 합의: config.json의 공통 terminal.shell/args/cwd를 모든 OS에 선택적으로 제공한다. 생략 시 기존 기본값을 사용하고, WSL cwd는 배포판 내부 Linux 경로로 전달한다. 별도 파일/폴더 존재 preflight를 만들지 않고 실행 오류를 전달한다. 실행 파일 선택은 설치나 WSL 버전 변환이 아니다. Windows native 일반 stop은 작업을 검사하지 않고 AIOX 등록·관리 실행을 종료하며 외부 CLI vendor도 포함한다. macOS/Linux/WSL 일반 stop은 최초 shell idle과 등록된 실행을 확인하고 busy/unknown이면 거절한다. 모든 OS force는 외부 CLI vendor를 포함해 종료한다. 자연 연결 손실과 명시적인 종료 요청은 구분하며 기존 예기치 않은 연결 손실 생존 정책은 이번 명시적 종료 정책과 혼동하지 않는다. 안쪽 shell의 idle은 추적하지 않는다. 입력/admission gate·오류/정리 실패 보고는 유지한다.

경위: 빈 shell의 일반 stop 마찰을 줄이려다 CMD builtin 반례와 PowerShell PSReadLine 연동 비용을 확인했다. WSL2 전용 제한·PowerShell만 지원·CMD unknown 안내를 검토했으나 native 실행을 허용하고 Windows 종료 정책을 단순화하는 방향을 선택했다. 시작 터미널 상속은 화면/세션 복제가 아닌 cwd/env 전달임을 확인했고 자동 부모 shell 식별 대신 명시적 공통 설정을 택했다. 내부 실행 소유권은 종료 방법 구분에 유지하되 사용자 종료 정책은 Agent/vendor로 나누지 않는다.

조사 선행: settings_research는 config→shell/WSL cwd·POSIX args, shutdown_research는 daemon→외부 제어→실행 종료, windows_simplify_research는 PSReadLine 제거와 native 종료 근거를 읽기 전용 조사한다. 모두 ponytail full을 적용한다. root는 로그·owner 정합과 통합 경계를 담당한다. 기존 Base 로그의 같은 수명 안 W8 범위를 새 정책으로 바꾸며 과거 실측/결정 entry는 보존한다. 조사 결과의 새 정책이 필요하면 구현을 중단해 사용자와 논의한다. 구현 후 관련 로컬 테스트는 수행하되 전체 CI/배포 검증 완료를 주장하지 않는다.

## 2026-09-12 · 조사 결과와 daemon 신호 종료 정책 질문

세 subagent 읽기 전용 조사 완료. PSReadLine은 powershell-idle.ts와 prepareShell의 Windows idle 경로에만 필요하므로 새 정책에서 구현/테스트·CMD 반례 테스트·CI 모듈 설치를 제거할 수 있다. Windows matrix와 native PTY 종료 검증은 유지한다. 설정은 기존 terminal appearance 객체에 optional shell/args/cwd를 더하고 vendor PTY와 일반 shell 적용을 분리하는 최소 경로를 조사했다. WSL Linux cwd는 host resolve가 아닌 wsl --cd로 전달하고 PTY의 host cwd와 구분해야 한다. 기존 config는 시작 시 읽으므로 새 터미널 적용 요구를 지키려면 생성 시 읽기 등 연결이 필요하며 watcher를 미리 추가하지 않는다. POSIX 임의 args는 현재 unknown 처리이고 이를 자동으로 안전하다고 바꾸지 않는다.

종료 조사에서 새 정책 질문 발견: root가 apps/daemon/src/main.ts:12–15의 SIGINT/SIGTERM → daemon.stop(true)를 직접 확인했다. 새 외부 force 종료를 이 호출에 그대로 적용하면 OS 신호 종료도 외부 vendor를 종료한다. 기존 연결 손실 생존과 명시적 CLI force의 경계를 사용자와 결정하기 전 production/test 변경을 중단한다. 관련 restart는 bootstrap.ts에서 stop({})를 재사용하므로 Windows 일반 stop 정책을 적용하면 restart도 작업을 종료하는 파생 동작임을 보고한다.

외부 종료는 새 PID 트리 추적 대신 기존 ExecutionOwner를 재사용할 수 있으나 revoke의 control socket 즉시 닫힘과 foreground exit 직후 ACK를 그대로 쓰면 안 된다. helpers·자원 정리가 끝난 뒤 종료 확인을 받고, 미확인은 기존 stop_incomplete·재시도 정책으로 처리하는 방향이다. 이미 연결 손실로 등록 해제된 실행을 새로 찾아가는 기능은 범위 밖이다. wsl --shutdown/--terminate 같은 배포판 전체 종료도 무관 실행을 침범하므로 추가하지 않는다.

현재 결과: 기준 branch 보존, 새 branch 생성, 정책/경위/조사 로그 기록 완료. production/test 수정·실행 없음, 새 commit/push/CI 없음. 다음은 SIGINT/SIGTERM 정책 답변 후 W8 구현 재개다. 단계3 구현은 미완료이며 목표 완료로 처리하지 않는다.

## 2026-09-12 · 신호 종료 정책 재확인·불필요한 질문 정정과 구현 재개

사용자 지적으로 기존 정책을 재확인했다. runtime spec의 외부 실행 생존 및 로그 Global의 연결 손실 생존 재승인 불필요 규칙이 이미 존재한다. 최신 합의는 명시적 CLI stop/force를 변경했으며 SIGINT/SIGTERM·예기치 않은 연결 손실 생존까지 변경한 합의는 없다. main.ts stop(true) 공용 호출은 새 사용자 정책 질문이 아니라 명시적 종료 요청과 신호 disposal 의도를 구분할 구현 문제였다. 앞선 질문과 작업 중단 판단을 철회하고 기존 정책으로 구현을 재개한다.

settings_research는 공통 terminal 설정·새 shell에 적용·WSL cwd, shutdown_research는 명시적 종료 요청/ACK·신호 생존·실패 재시도, windows_simplify_research는 PowerShell/CMD idle 전용 코드 제거를 담당한다. root는 owner와 로그 정합·통합 검증을 담당한다. ponytail full/TDD를 유지하며 새 commit/push/CI는 하지 않는다.

## 2026-09-12 · 설정·Windows idle 제거 구현과 부분 검증

Windows idle 전용 powershell-idle.ts/test 및 cmd-idle.test, CI PSReadLine 설치 단계를 제거했다. Windows matrix/native PTY 검사는 유지한다. Windows 미주입 RED→GREEN 후 shell-integration19 및 terminal typecheck가 통과했다. CLI stop/restart 도움말에 Windows 작업 중단, force의 외부 실행 종료를 명시하고 CLI9 tests를 확인했다.

공통 terminal.shell/args/cwd 설정은 기존 parseConfig/loadConfig를 재사용하며 새 Web shell 생성마다 비동기 파일 설정을 읽고 admission을 재확인한다. 기존 shell은 그대로이고 vendor PTY 설정과 분리했다. WSL Linux cwd는 --cd로 전달하며 host PTY cwd와 분리한다. root가 config16, terminal87, execution owner3 및 daemon terminals/bootstrap/mcp54 tests를 직접 실행해 통과했고 config typecheck와 oxlint도 통과했다. Windows platform stub/argv 확인은 실제 WSL 실행 증거가 아니다.

실측 한계: macOS node-pty에서 없는 실행 파일은 PTY 생성 후 출력 없이 nonzero exit할 수 있다. 기존 shell exit 즉시 등록 제거 동작을 유지했고 별도 존재 preflight·실패 화면 보존 정책을 추가하지 않았다. Native throw는 HTTP 오류로 전달하고 비동기 exit는 기존 terminal lifecycle로 처리한다. 종료 신호·외부 owner 정리 ACK/retry의 통합 테스트는 아직 진행 중이다. 새 commit/push/CI/사용자PC 실측 없음.

문서 검토는 runtime/config spec, system/storage/vendor architecture와 새 explicit-execution-shutdown decision을 대조했다. 기존 decision은 당시 이유를 고치지 않고 새 결정 forward pointer만 추가했다. 삭제 파일 링크가 없고 관련 wiki target 검사가 통과했다. log tool에 block 제목 rename이 없어 자동 날짜와 수동 날짜가 중복된 신규 두 제목만 직접 교정했다.

## 2026-09-12 · 순서 1–3 구현 완료·검증과 후속 경계

사용자 승인 순서 1–3(기준 branch 보존·기록·새 branch 구현)을 완료했다. 기준 codex/stage2-2-idle-shell-windows와 origin 추적 ref는 모두 937055b14b9372d1f01ea19b3321b9fe77793a74 그대로이며 새 branch codex/terminal-config-stop-policy의 변경은 미커밋이다. commit/push/CI/main 병합은 수행하지 않았다.

외부 제어에 명시적 terminate/terminated 요청 식별과 전체 owner 정리 확인을 연결했다. POSIX 일반 stop은 외부 등록도 blocker, Windows 일반 stop과 모든 OS force는 외부 owner도 종료한다. main SIGINT/SIGTERM은 terminateExternal:false로 기존 생존 정책을 유지한다. revoke 전 종료 의도를 표시하고 협업 권한 회수 뒤 종료 제어 채널을 유지한다. stale ACK는 무시, 정리 실패는 같은 연결에서 재시도, 연결 손실 시 종료 미확인을 성공/등록 삭제로 바꾸지 않는다. 자연 foreground exit도 owner.stop 이후 통보해 부속 자원 정리와 force 경합을 닫았다. 새 프로세스 트리 추적이나 배포판 전체 종료 명령은 없다.

root 최종 직접 검증: config16 + terminal87 + vendor3 + protocol10 + daemon154 + CLI49 = 319 tests 통과(중복 실행 제외 패키지별 최종 수). daemon/CLI/config 타입 검사, oxlint, apps/packages 포맷 검사, git diff --check 통과. daemon/CLI tsup 빌드 및 빌드 CLI daemon stop --help 확인, 최종 CLI 경합 수정 뒤 CLI 재빌드 통과. 외부 제어 테스트는 실제 WS+대역 owner/프로세스와 CLI fake child 검사이며 실제 vendor/Windows/WSL E2E가 아니다. WSL --cd는 인자 전달 대역 검사이며 실제 pwd 검증은 후속이다. 새 pnpm check 전체·GitHub CI·사용자PC 실측은 이번 범위에서 하지 않았다.

W8 구현 완료, W9 통합 CI·Windows/WSL 실측·단계마감은 다음 사용자 지시 후 진행한다. Windows PSReadLine 설치는 새 구현에 필요 없다. 실제 WSL 경로, 잘못된 executable의 빠른 비동기 exit 화면, 중첩 프로세스 전체 종료 범위는 미검증/기존 한계로 보존한다. Stage2-2 전체 완료나 W9 완료를 주장하지 않는다.

### 2026-09-12 16:26 · 사전 검증 보완·별도 조사 결과와 CI 선행 승인

사용자가 로그 기록을 금지한 동안 수행한 구현·조사·검증과 이후 논의를 이번 명시적 기록 요청에 따라 소급해 남긴다. 과거의 “별도 존재 preflight를 추가하지 않는다”는 합의는 아래 사용자 요구로 대체됐다. 과거 entry는 당시 경위로 보존한다.

출발점은 macOS에서 없는 executable도 PTY 생성 뒤 출력 없이 종료될 수 있다는 관측이었다. 사용자는 이를 표시 한계로만 남기지 말고 설정 계층의 선행 조건·검증 순서를 바로잡으라고 요구했다. 특정 shell에만 국한하지 않고 설정 소비 전에 유효성을 확인하는 취지이며, 이번 구현에서는 theme 색상·keyboard 의미 검증은 제외하고 shell과 cwd 존재·접근 조건을 포함했다. 사전 검사 후 환경 변화나 실제 실행 실패 처리는 유지한다.

구현: config_preflight와 daemon_preflight가 분담했고 root가 WSL 및 통합을 마무리했다. packages/config/src/terminal.ts의 resolveTerminalLaunch가 기본값·요청 cwd override를 반영한 실행 정보를 검사·확정한다. POSIX executable 접근 검사, Windows executable 탐색 및 Node child의 cwd 사용 검사, packages/config/src/wsl.ts의 지정 배포판·사용자 cwd 검사를 연결했다. WSL 검사는 고정 shell script만 실행하며 사용자 command tail을 실행하지 않는다. 검증할 수 없는 WSL 옵션은 거절한다. 일반 parseConfig/loadConfig를 환경 검사로 바꾸지는 않아 상태 조회·복구용 소비자에 새 결합을 추가하지 않았다.

apps/daemon/src/bootstrap.ts는 DB·listener 준비 전에 검사하고, daemon.ts는 새 shell마다 최신 설정을 검사한 뒤 admission을 재확인한다. TerminalService는 확정된 TerminalLaunch를 받도록 바꿨다. 서비스의 설정 해석·WSL 인자 구성과 no-argument 호환 경로를 제거하고 호출자를 갱신했다. mock throw만으로 없는 shell 검사를 주장하지 않도록 실제 파일 시스템 사전 거절 테스트를 추가했으며, 유효한 사전 검사 이후 native 실행 실패 테스트도 유지했다. 관련 config spec과 storage-terminal architecture에 검증 경계·한계를 반영했다. 이전 Windows idle 구현/테스트 및 CI PSReadLine 설치 제거는 앞선 W8 작업이며 이번 사전 검증 삭제와 구분한다.

root 직접 검증: 추가 구현 이후 config26 + daemon160 + CLI49 + terminal87 = 322 tests 통과. 이 수는 해당 네 패키지 합계이지 repo 전체 합계가 아니다. 관련 타입 검사·lint/format·build·git diff --check 통과. 빌드된 bootstrap에 없는 shell/cwd를 주어 DB·상태 파일 생성 전 거절됨을 확인했다. macOS native 및 WSL 고정 script의 실제 /bin/sh 검사를 수행했다. Windows/WSL은 대역 검사이며 Windows ACL·ConPTY·실제 배포판 실행 성공의 증거가 아니다.

현재 사용자 요청 직전에 시작한 repo 전체 pnpm check도 root가 종료 결과를 확인했다: exit 0. lint·format·전체 build·typecheck·test 통과이며 daemon 최종 160 tests가 통과했다. 앞선 “전체 pnpm check 미실행” 상태를 대체한다. GitHub CI 결과를 뜻하지 않는다.

별도 조사 경위: 사용자는 config뿐 아니라 선행 조건, 부분 성공, 실패 복구와 여러 함수의 결합에도 같은 문제가 있을 것으로 판단해 조사 범위를 확장했다. 아래는 실제 모듈·실패/지연 주입 또는 CLI/Web 테스트에서 확인한 결과이며 production 수정은 하지 않았다.

| 항목 | 확인한 범위와 근거 위치 |
| --- | --- |
| 재시작 순서 | CLI bootstrap에서 잘못된 config를 발견하기 전에 기존 daemon 종료 요청. 유효한 상태 파일·잘못된 config와 fetch 대역으로 순서 확인. |
| 등록 정리와 force 경합 | daemon stopRuntime의 cleanup을 지연하고 force stop을 겹치자 owner.stop 호출 0회인데 stopped:true. 실제 WS 손실 전체가 아닌 공통 경계를 재현. |
| 결과 뒤 알림 저장 실패 | messaging #settle에서 결과 저장 뒤 알림 저장 실패를 주입하자 추적이 없어지고 재시도에서도 알림 복구 안 됨. |
| 전송 거절 뒤 DB 실패 | messaging #send에서 전송·실패 결과 저장을 연속 실패시키자 뒤 대상 중단, 추적 없는 outcome=null 행 잔존. retention은 미완료 행 제외. |
| 시작 완료 판정 | Web listener 시작을 지연하자 API가 먼저 running 반환. 제어된 타이밍 재현이며 운영 무작위 장애 관측은 아님. |
| status·doctor | 잘못된 config가 status 조회 전 실패를 유발하고 doctor는 기록 포트 대신 config 포트 조회. |
| Web 오류 표시 | 서버 오류 설명 유실과 후속 polling 성공에 의한 작업 실패 표시 덮어쓰기를 DOM 테스트로 확인. |
| 사용 중 Network 삭제 | 실행이 삭제된 networkId를 유지해 discovery 실패. 삭제 거절/분리 정책은 미결정. stateless MCP 세션의 영구 파괴라고 표현하지 않음. |

재현 자료는 /private/tmp/aiox-preflight-review/probe.mjs, cli-probe.test.ts, web-probe.test.ts에 있다. probe는 당시 빌드 산출물을 사용하며 사본 테스트는 원래 repo 테스트 문맥에 맞춰 실행해야 한다. 임시 repo 테스트는 제거했다. 이 경로는 임시 자료이므로 재개 시 존재와 현재 코드 적합성을 확인한다.

Claude 분석 정정: 오류 terminate ACK 자체가 양쪽 영구 hang/이후 force 영구 실패를 뜻하지 않는다. 같은 연결 재시도 구현·양쪽 테스트가 있고 제어 연결 손실은 별도 상황이다. args/미지원 shell의 busy 거절은 명시적 보수 정책일 수 있고 ps 실패는 검사마다 재조회한다. cleanup 재호출은 실제 비멱등 부작용 확인 전 결함으로 단정할 수 없다. fish 미실행 주장은 기존 /private/tmp/aiox-linux-handshake-result.txt의 Linux Fish4.0.2 검사 근거와 충돌한다. ConfigSession 미사용·설정 적용 시점 차이만으로 last-good fallback이나 전체 live reload를 추가하면 잘못된 실행 설정 거절 정책과 충돌할 수 있다.

사용자는 별도 agent에게 위 조사 문맥만 주고 독립 판단을 시키기로 했다. 구현 지시형 프롬프트를 문맥·판단 전용 프롬프트로 교체해 전달했다. 실제 추가 agent 호출이나 위 8개 수정 착수는 하지 않았다. 이 로그에서 별도 개선의 구현 Work Item을 새로 만들지 않으며 Stage2-2 수정 완료로 세지 않는다.

Windows 실검증 논의: 사용자는 Git·Node·WSL2가 설치된 Windows desktop을 보유한다고 밝혔다. 권장 경로는 Windows Node → wsl.exe → 선택 배포판·사용자 cwd → 실제 PTY이며 WSL 안의 Linux 테스트만으로 대체하지 않는다. 현재 CI에는 Windows/Linux/macOS × Node22/24와 pnpm check가 있으나 WSL 배포판 준비 단계는 없다. Canonical WSL Actions 문서(https://ubuntu.com/wsl/docs/latest/reference/actions/)에서 설치·배포판 실행 지원을 확인했다. Linux Docker는 Windows ACL·ConPTY·wsl.exe 경계를 대체하지 못한다는 판단에는 커널 경계 설명(https://learn.microsoft.com/en-us/virtualization/windowscontainers/deploy-containers/set-up-linux-containers)을 참고했다. runner별 WSL/가상화 가능 여부는 실제 준비 때 확인한다.

사용자는 미커밋 스냅샷을 먼저 Windows에 옮기는 제안보다 commit → push → CI 확인 → 같은 commit의 Windows/WSL desktop 실검증 순서를 지시했다. 그 순서로 진행을 승인받아 diff 확인과 전체 pnpm check까지 수행했고, 커밋 전에 이번 로그 기록 요청이 도착했다. 기록 시점에는 새 commit/push/CI/Windows 실측/main 병합이 없다. 다음 행동은 현재 Stage2-2 변경 커밋·push 후 해당 SHA의 CI 확인이다. Windows/WSL 실검증과 W9 전체 완료는 아직 남아 있으며, 이번 로그 요청을 앞으로 모든 토론을 자동 기록하라는 포괄 승인으로 확대하지 않는다.

### 2026-09-12 18:18 · Windows 실측·오류 분류 보완과 최종 CI

사용자가 Stage2-2 마감을 subagent에게 위임했다. 이번 범위는 누락된 검증 기록과 owner 정합이며 별도 8개 개선은 root와 논의한다. 아래 Windows 결과는 사용자가 전달한 Windows agent의 실측 보고이고 이 기록 담당자가 직접 재실행한 결과가 아니다.

커밋·CI 경위: de3c92bce9b7bb7e66e98eeac50b01c2965432cd를 push한 뒤 CI34680957423의 6개 OS/Node 조합이 통과했다. macOS Node24의 기존 Git 조회 2초 timeout은 코드 변경 없는 재실행에서 통과했으며 간헐 실패 가능성을 남긴다. Windows agent는 깨끗한 de3c92b에서 codex/stage2-2-windows-validation 브랜치를 만들었다. 오류 분류·harness 보완 9512a5a의 CI34684848745도 6개 조합이 통과했고 root가 macOS 전체 pnpm check를 통과했다.

Windows 환경은 PowerShell, Node24.21.0, pnpm10.33.0, WSL2 Ubuntu(root, /root)이며 별도 검증 폴더·임시 설정·DB를 사용했다. cmd/PowerShell 입출력·실제 cwd·브라우저 재연결, 없는 Windows shell/cwd와 파일인 cwd의 시작 거절을 확인했다. Windows daemon → wsl.exe → Ubuntu에서 root와 /root를 확인했고 없는 배포판·사용자·cwd, root 소유 700 폴더에 nobody 접근을 거절했다. 잘못된 shell로 설정 변경 후 새 생성은 거절하되 기존 터미널 명령 실행을 유지하고 복구 후 201 Created/alive:true를 확인했다. 최초 pnpm check는 사용자 완료 보고만 있었으나 후속 수정 뒤 Windows agent가 exit0, 437 tests passed/23 skipped와 lint·format·전체 build·typecheck·diff 검사를 보고했다.

Windows 검증 중 발견한 계약 누락을 보완했다. 서버 설정은 500/invalid_config, 요청이 명시한 확인된 cwd 오류는 400/invalid_request, 예상하지 못한 실제 실행 오류는 500/internal_error로 구분한다. ConfigError는 HTTP를 모르는 선택적 cwd 필드 근거만 전달한다. WSL 고정 검사 명령의 정확한 표식으로만 cwd 실패를 확정하고 다른 실패는 실행 환경 진단을 보존한다. harness의 cwd override·잘못된 기본 CLI 안내·일반 stop 고정 거절 안내를 제거했다. RED 회귀 10개 후 수정했고 실제 수정 harness로 Windows cwd 및 WSL /root를 확인했다. 없는 WSL 배포판·사용자·cwd에서는 DB·상태 파일이 생성되지 않았고 확인된 요청 cwd 권한 거부는 400이었다. 정상/실패 사전 검사에서 사용자 command tail 미실행을 확인했다. nobody systemd 세션 지연과 Wsl/Service/E_UNEXPECTED는 cwd로 단정하지 않았으며 세션 준비 뒤 권한 거부를 재확인했다.

종료 실측은 종료 전 각 프로세스의 PID/PPID·생존을 수집하고 이후 최대 10초 동안 상태를 확인했다. shell 일반 stop 2288→9904→15516, force 3652→16072→11884; 외부 owner21076의 일반 stop foreground17824→22384→20228/helper21644→22416→15520, owner12796의 force foreground2904→19804→18184/helper21780→20000→15812 모두 첫 검사에 잔존 PID가 없었다. 응답은 HTTP200/stopped:true였으며 외부 owner도 exit0·dispose 완료였다. 실제 runExternal·WS·ExecutionOwner와 별도 OS owner를 사용했지만 vendor는 대역이므로 실제 Claude/Codex 통합 검증은 아니다. 검증용 Node/WSL 프로세스·포트 리스너 및 WSL 임시 자원을 정리했다는 보고다.

Windows ACL 한계: 현재 SID에 (RX), (RD,REA,RA,X,S) 거부를 각각 적용해 조회 EPERM을 확인했으나 Node child는 exit0으로 해당 cwd를 사용했다. 따라서 cwd 사용 거부를 재현하지 못했으며 사전 검사 결함으로 판정하거나 readdir 검사를 추가하지 않았다. SeChangeNotifyPrivilege 활성은 확인했지만 단독 원인으로 확정하지 않았다. ACL은 finally에서 원래 SDDL로 복원했으며 전역 보안 변경·배포판 전체 종료를 하지 않았다. 이 환경의 미재현과 임의 자손/실제 vendor 전체 보장 부재는 검증 범위 한계로 남긴다.

root는 9512a5a 리뷰에서 native 디렉터리 검사와 Windows child probe 실패가 같은 catch로 처리되어 timeout도 요청 cwd 오류로 분류되는 경로를 발견했다. 실제 Windows timeout 장애 관측이 아니라 코드 경로 확인이었다. 8c2fbd7a59bf27f5f92bf22babd5fac96750414d에서 catch를 분리해 검사 프로세스 실패의 cwd 표식을 제거했다. EACCES/timeout 대역 회귀와 HTTP500 유지 검사를 추가했고 root pnpm check exit0(daemon174 tests)을 확인한 뒤 push했다. 최종 CI https://github.com/lunaxislu/aiox-prototype/actions/runs/34685159507 는 Windows/Linux/macOS × Node22/24 모두 success다. 이번 기록 담당자도 gh run view로 정확한 headSha와 6개 success를 재확인했다. 마지막 보완의 Windows 검증은 CI이며 전체 수동 시나리오를 해당 SHA에서 다시 실행했다고 주장하지 않는다.

owner 점검: 현재 terminal/WSL resolver→daemon→HTTP와 회귀 테스트를 대조하고 configuration/Web spec에 오류 분류 계약, storage-terminal architecture에 필드 근거의 책임·Windows 실측 범위·잔여 한계를 반영했다. explicit-execution-shutdown decision의 임의 중첩 작업 보장 한계와 신호/연결 손실 생존 이유는 여전히 유효해 변경하지 않았다. Stage3의 vendor 메시지 E2E·후속 OS 경계와 Stage4/5의 Codex/Host 목표로 확대하지 않았다.

현재 W9의 구현·CI·Windows 실측과 owner 정합은 완료다. 이번 위임 범위에서는 commit/push/main 병합을 수행하지 않으며 최종 마감 문서의 커밋·병합과 Stage3 W1 포인터 복귀가 남아 W9 active 및 로그 open을 유지한다. plan의 Stage2-2를 미리 완료로 바꾸지 않는다. 별도 8개 개선은 조사·재현 이후 독립 판단/논의 상태이며 이 마감의 production 변경에 포함하지 않았다.


이번 마감과 병행한 root의 별도 조사에서는 macOS spawnNative.stop()이 직접 Node child를 signal15로 종료한 뒤에도 그 child가 만든 자손이 살아 있는 사례를 재현했다. root가 검증 자손은 finally에서 정리했다. 이는 Windows에서 수집한 대역 트리 종료 결과를 반증하지 않지만, 임의·비협조적 자손 전체 종료로 확대할 수 없다는 구체 근거다. 해당 production 수정은 별도 개선 논의에 남기며 이 로그의 전체 자손 종료 보장으로 기록하지 않는다.

로그 도구에는 entry 이동 명령이 없어 이번에 추가한 entry를 같은 수명의 최신 완료 블록 끝으로 수동 이동했다. 과거 entry의 내용·순서는 변경하지 않았다.

### 2026-09-12 21:56 · 로컬 main 반영 완료와 Stage2-3 선행 전환

사용자 지시에 따라 Stage2-2를 마감하고 별도 개선을 Stage2-3로 구성한다. 현재 git HEAD는 main의 c000cab(docs: record Stage 2-2 validation and execution boundaries)이며 기존 configuration/Web spec·storage-terminal architecture·이 로그의 마감 문서 변경이 커밋·로컬 병합됐다. 이전 entry의 문서 미커밋·main 미병합 대기 상태는 이 기록으로 대체한다. 코드 8c2fbd7의 검증과 Windows 사용자 실측은 직전 entry를 소비하며 이번 전환에서 다시 실행하지 않았다.

Stage2-2 구현·검증 범위와 owner 반영을 마쳤고 W9를 완료한다. Windows cwd 사용 자체의 ACL 거부 미재현, 대역 vendor 검증 및 임의 자손 종료 보장 한계는 유지한다. force 경합·저장/시작/조회/Network/Web 및 구조 후보는 Stage2-2에서 해결한 것으로 세지 않고 logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md W1–W7이 책임별로 수행·판정한다. 해당 로그에 조사 계기, 기존 근거와 Claude 의견/정정, 확정 정책을 인계했다. 원격 push는 사용자 후속 지시까지 보류하며 로컬 마감을 원격 main 반영 완료로 표현하지 않는다.

plan의 Stage2-2를 완료하고 Stage2-3를 활성화한다. 기존 Stage3 즉시 복귀 예정은 사용자 결정으로 Stage2-3 완료 후 W1 복귀로 변경했으며 Stage3 Required Context와 최신 entry를 함께 갱신한다. 과거 History는 변경하지 않는다. 이 로그 자체의 미완료 Work Item·미소비 복귀 pointer는 없고 후속 책임은 명시된 Stage2-3가 소유하므로 decided로 닫는다.

### 2026-09-12 21:59 · 외부 종료 범위 정정의 Stage2-3 인계

사용자가 외부 aiox agent run claude/codex는 daemon 일반 stop·force 모두 vendor 생존, 협업만 종료하도록 명시적으로 정정했다. Windows 작업 검사 없는 종료는 Web 등 daemon 소유 실행에만 적용하며 외부 등록 관계만으로 daemon stop을 막지 않는다. MCP 연결 실패는 호출측에서 협업 불가를 진단하고 vendor는 유지한다. 서버 종료를 확인하지 못했으면 연결 실패 원인을 종료라고 단정하지 않는다.

이 로그의 과거 외부 owner 종료 구현·테스트·CI 성공 기록은 당시 정책 전제의 사실이며 이번 요구 충족의 증거가 아니다. 구현과 owner 문서가 외부 종료까지 잘못 확장된 미해결 교정은 logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md W1이 소유한다. Stage2-2 status decided·W9 완료·plan 포인터는 유지하고 과거 History는 덮어쓰지 않는다. 다음 작업은 외부 수명 분리와 협업 완료·실패·재시도 경계의 교정이며 외부 종료 의도를 강화하는 수정이 아니다.

log 도구는 decided 로그의 entry append를 지원하지 않으므로, 사용자 지시대로 단계를 재개하지 않고 이 후속 인계 정정만 수동 append했다. 이번에는 production/spec/decision·commit·push를 변경하지 않았다.
