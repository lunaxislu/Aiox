---
topic: AIOX TUI Stage3 Claude
description: Claude TUI inbox hooks와 기존 shell 실행 수명 연결
status: open
---

## Work Items

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 2026-09-09 단계별 로그 선생성과 plan 연결을 요청했다. 이 로그는 구현 착수·완료 증거가 아닌 단계 인계다. plans/aiox-tui-product-rebuild.md에서 이 단계가 활성화될 때 선행 로그 최신 결과와 실제 코드를 다시 확인한다. logs/artifact/AIOX-TUI-Product-Context-Prompt.md의 전체 제품 문맥과 §15 운영 Web·브라우저 복귀·알림, logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md의 대응 결정을 읽는다. 초기 goal의 reply/Host add 등 폐기된 정책을 복원하지 않는다. 구현 시 관련 owner docs와 producer/consumer·테스트까지 추적하고 변경된 계약을 owner에 반영한다.
- docs/architecture/aiox-vendor-bindings.md, docs/specs/aiox-runtime.md, docs/specs/aiox-collaboration.md를 읽는다. Claude 실제 TUI + native peer inbox + hooks를 구현하며 headless·SDK·Channel fallback·vendor별 stdio MCP child를 추가하지 않는다. 실행별 credential·공통 HTTP MCP agents_list/send·instruction을 연결하고 기존 사용자 설정·hooks·MCP를 보존한다.
- Stage 2의 terminal/Runtime 수명 분리를 소비한다. 기존 shell에서 aiox agent run claude --network dev → 같은 terminal에서 TUI 실행·Agent 등록 → vendor 종료·등록/credential/route 정리 → 원래 shell 복귀. 새 탭 중복 생성 금지. 일반 claude 직접 실행은 자동 Agent 등록이 아니다. 외부 터미널의 standalone 실행도 유지한다. Agent 소유 자원과 빌려 쓰는 shell PTY를 구분한다.
- Claude Runtime/session_id/prompt_id의 UserPromptSubmit·Stop 연결로 해당 AIOX 입력만 완료한다. 이후 직접 사용자 요청 종료가 이전 발신자에게 재알림하지 않게 한다. busy 입력·실패·중단·Windows pipe/token은 실제 integration에서 좁게 확인하며 기존 사용자 실험을 신규 통합 성공으로 확대하지 않는다. 준비/종료 실패는 실제 관리 자원을 확인하고 재시도 경계를 유지한다.
- W3 소비 지점: packages/protocol의 terminalContextFromEnv(env) → daemon.registerRuntime({terminalContext, createBinding, ...})로 기존 shell을 차용한다. terminalId 단독은 일반 shell 연결 권한이 아니다. 문맥은 child env AIOX_TERMINAL_ID/AIOX_TERMINAL_TOKEN이며 URL·argv·로그에 노출하지 않는다. apps/daemon/src/daemon.ts·terminals.ts 및 daemon.test.ts/terminals.test.ts가 수명·실패/재시도 근거다. 실제 agent run HTTP 등록·vendor foreground 종료 관측·원 shell 복귀는 이 단계에서 연결한다. 문맥 없는 외부 standalone은 유지하고 직접 소유 PTY만 Agent 종료 시 종료한다. 생성 cwd는 실시간 cd 추적값이 아니다.
- Stage2 W1~W4 완료 후 plan의 다음 재개 단계로 활성화됐다. Stage2 최신 W4 entry와 owner를 읽는다. 코드 6621fc3의 CI 34314631099는 3 OS × Node22/24 success이며 Ubuntu Node22 버퍼 timeout은 동일 SHA 재실행 통과·원인 미확정이다. macOS Chrome plain-shell 검증과 vendor 대역 성공을 실제 Claude 통합 성공으로 승계하지 않는다. 이 단계 구현은 아직 시작하지 않았다.

## 2026-09-09 · 단계별 확정 요구와 인계 준비

사용자의 단계별 로그 생성 지시에 따라 Required Context에 구현 범위·선행 결과 소비·참고 자료·사전 논의 조건을 기록했다. 아직 이 단계의 구현을 시작하지 않았다. plan이 이 단계를 활성화하면 선행 로그 최신 기록과 실제 코드부터 대조하고 그때 필요한 Work Items를 구성한다. 이번 기록은 기능 구현·외부 참고 자료 검증 결과가 아니다.
