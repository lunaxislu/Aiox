---
topic: AIOX TUI Stage4 Codex
description: Codex TUI App Server Relay와 같은 terminal의 두 vendor 협업
status: open
---

## Work Items

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 2026-09-09 단계별 로그 선생성과 plan 연결을 요청했다. 이 로그는 구현 착수·완료 증거가 아닌 단계 인계다. plans/aiox-tui-product-rebuild.md에서 이 단계가 활성화될 때 선행 로그 최신 결과와 실제 코드를 다시 확인한다. logs/artifact/AIOX-TUI-Product-Context-Prompt.md의 전체 제품 문맥과 §15 운영 Web·브라우저 복귀·알림, logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md의 대응 결정을 읽는다. 초기 goal의 reply/Host add 등 폐기된 정책을 복원하지 않는다. 구현 시 관련 owner docs와 producer/consumer·테스트까지 추적하고 변경된 계약을 owner에 반영한다.
- docs/architecture/aiox-vendor-bindings.md, docs/specs/aiox-runtime.md, docs/specs/aiox-collaboration.md를 읽는다. Codex 실제 TUI + Runtime별 App Server + Binding Relay를 연결한다. 입력은 채택된 toolOutput 본문 + additionalContext 메타데이터이며 E2E가 실패할 때만 원인을 확인한 뒤 후순위 방법을 검토한다. 임의 active thread 선택이나 선제 fallback을 만들지 않는다.
- Stage 2 terminal 연결과 Stage 3 Claude 결과를 소비한다. 기존 shell에서 aiox agent run codex --network dev → 같은 terminal의 Codex → 종료 후 원래 shell 복귀. 새 탭을 만들지 않으며 TUI/App Server/Relay 등 직접 소유 자원만 Agent 종료 때 정리한다. 직접 codex 실행은 자동 등록하지 않는다. Runtime/threadId/turnId로 입력 종료를 연결하고 별도 사용자 요청 종료로 이전 발신자에게 재알림하지 않는다.
- 두 vendor의 실제 agents_list/send·인증·단방향/양방향 route·대상별 결과와 발신자 전용 완료/실패 알림을 검증한다. interrupted는 자동 통지하지 않고 daemon 알림으로 재귀 통지하지 않는다. 화면 조작과 Network/대화 수명을 섞지 않는다. 실제 OS별 결과와 테스트 대역을 구분한다.
- W3 공통 연결: packages/protocol terminalContextFromEnv(env)와 daemon.registerRuntime({terminalContext,...})는 기존 shell의 비공개 문맥을 검증하여 같은 terminal을 차용한다. daemon.ts/terminals.ts 및 관련 tests의 등록 실패·shell 종료·새 Runtime 신원 분리를 소비한다. 실제 CLI→등록 transport와 Codex foreground/종료 복귀는 Stage 3 결과에 맞춰 이 단계에서 구현한다. token을 URL·argv·로그에 넣지 않는다. 일반 terminal 목록은 /api/terminals이며 Agent 목록과 별개다.

## 2026-09-09 · 단계별 확정 요구와 인계 준비

사용자의 단계별 로그 생성 지시에 따라 Required Context에 구현 범위·선행 결과 소비·참고 자료·사전 논의 조건을 기록했다. 아직 이 단계의 구현을 시작하지 않았다. plan이 이 단계를 활성화하면 선행 로그 최신 기록과 실제 코드부터 대조하고 그때 필요한 Work Items를 구성한다. 이번 기록은 기능 구현·외부 참고 자료 검증 결과가 아니다.
