---
topic: AIOX TUI Stage7 Notifications
description: Agent 상태와 창·탭 활성 및 선택 terminal 기반 알림 읽음 소리
status: open
---

## Work Items

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 2026-09-09 단계별 로그 선생성과 plan 연결을 요청했다. 이 로그는 구현 착수·완료 증거가 아닌 단계 인계다. plans/aiox-tui-product-rebuild.md에서 이 단계가 활성화될 때 선행 로그 최신 결과와 실제 코드를 다시 확인한다. logs/artifact/AIOX-TUI-Product-Context-Prompt.md의 전체 제품 문맥과 §15 운영 Web·브라우저 복귀·알림, logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md의 대응 결정을 읽는다. 초기 goal의 reply/Host add 등 폐기된 정책을 복원하지 않는다. 구현 시 관련 owner docs와 producer/consumer·테스트까지 추적하고 변경된 계약을 owner에 반영한다.
- docs/specs/aiox-collaboration.md, docs/specs/aiox-configuration-web.md 및 Stage 6의 terminal/탭/포커스 연결을 읽는다. MCP idle/working/failed와 Web의 reasoning·도구·입력/승인 대기·실패·Host stopped 상세를 구분한다. 개별 요청 결과와 현재 Agent 상태를 분리하며 알림 읽음이나 다른 요청 완료로 미해결 사용자 요청을 지우지 않는다.
- 2026-09-13 사용자 확정: 브라우저 창·탭 활성 + 대상 terminal 선택이면 팝업·소리·알림 목록 추가·미확인 표시를 억제한다. 검색창·버튼으로 입력 포커스가 이동해도 선택 유지 시 억제하며 다른 앱·브라우저 탭으로 이동하면 선택 terminal도 알림 대상이다. 알림 클릭은 대상 창·영역·탭 이동과 해당 알림 읽음 처리이며 전체 읽음도 제공한다. 표시 억제는 메시지 처리 결과·필수 알림 저장 기록 삭제가 아니다. 브라우저가 닫혀 있을 때 놓친 알림을 서버에 유지하고 재방문 때 표시한다. Stage2-3 W5가 현재 최소 Web의 활성·선택 기반 미확인 표시 억제와 읽음 처리를 구현·검증했다. popup·소리는 이 단계의 후속 범위다.
- 짧게 몰린 알림은 개별 항목을 보존하고 소리만 한 번 울린다. 정확한 묶음 시간·multi-tab 소리 주체·음원은 확정값을 꾸며내지 말고 해당 단계에서 구체화한다. native OS 알림/브라우저가 닫힌 상태의 OS 소리를 자동 추가하지 않는다. AIOX 자동 완료/실패 통지는 원 Runtime 발신자만 대상으로 하고 새 A′ 비전달·알림 재귀 방지를 유지한다.
- cmux의 포커스·활성/비활성 영역 표현과 단축키 조작을 참고한다: https://cmux.com/docs/concepts , https://cmux.com/docs/keyboard-shortcuts . Stage 6 로그의 Paseo 현재 영역 terminal 배치 참고와 연결해 알림 클릭 대상이 맞는 탭을 가리키는지 검증한다. 정확한 기본키·OS별 keybindings 구조는 Stage 6에서 사용자와 논의한 결정만 소비한다.
- Stage6의 2026-09-13 알림 UI 인계를 소비한다. React 알림 아이콘 dropdown과 Agent가 포함된 창으로 이동·해당 알림 읽음 처리는 Stage6 구현 범위다. 대상 터미널(B) 선택 클릭 시 해당 대상의 미확인 해제는 Stage2-3 W5의 현재 간단 Web에 구현·검증됐으므로 그 결과를 소비한다. 이 단계는 선행 UI 결과 위에서 상태·읽음·알림음 통합과 검증을 이어간다. 미확인 해제를 저장 이력 삭제로 해석하지 않으며 UX owner는 docs/specs/aiox-configuration-web.md다.

## 2026-09-09 · 단계별 확정 요구와 인계 준비

사용자의 단계별 로그 생성 지시에 따라 Required Context에 구현 범위·선행 결과 소비·참고 자료·사전 논의 조건을 기록했다. 아직 이 단계의 구현을 시작하지 않았다. plan이 이 단계를 활성화하면 선행 로그 최신 기록과 실제 코드부터 대조하고 그때 필요한 Work Items를 구성한다. 이번 기록은 기능 구현·외부 참고 자료 검증 결과가 아니다.

### 2026-09-13 14:44 · Stage6 알림 UI 결과 소비 경계 보완

사용자가 승인한 React 알림 dropdown·대상 Agent 창 이동·Agent별 미확인 읽음 처리는 Stage6에서 구현할 UI 범위로 인계됐다. 이 단계는 해당 UI 결과를 소비하며 상태·읽음·알림음 통합과 검증을 유지한다. Stage7 전체를 Stage6로 이동하거나 구현 완료 처리한 것이 아니다. 저장 이력 삭제로 범위를 확대하지 않는다.

### 2026-09-13 14:47 · 선택 터미널과 창·탭 활성 기준 확정 및 인계 정정

사용자가 알림 억제 기준을 브라우저 창·탭 활성과 선택 terminal로 확정했다. 검색창·버튼에 입력 포커스가 있어도 선택이 같으면 억제를 유지하고 다른 앱·브라우저 탭으로 이동하면 알림 대상이다. 기존 실제 terminal 입력 포커스 조건을 대체했으며 처리 결과·필수 알림 저장 기록은 지우지 않는다.

앞선 entry의 Agent별 클릭 읽음과 Stage6 귀속 표현을 정정한다. 대상 터미널(B) 선택 클릭 시 해당 대상의 미확인 해제는 현재 간단 Web 적용 목표다. Stage6는 React dropdown·알림 클릭 시 대상 창 이동과 해당 알림 읽음 처리를 소유하고 이 단계는 선행 결과를 소비한다. 아직 구현하지 않은 target이며 Stage7 삭제·전체 이동을 뜻하지 않는다.

### 2026-09-13 15:35 · W5 SSE·Web 알림 선행 결과 소비와 후속 범위 유지

Stage2-3 W5의 SSE 변경 통지·Web 소유 실행 목록/알림 한정·활성 창/탭과 선택 terminal 기반 미확인 억제·대상 선택 읽음·최소 미확인 표시 구현 결과를 소비한다. root 전체 검사 527 tests와 actual built daemon/SSE, Chromium 대역 검증의 범위·한계는 부모 Stage2-3 최신 수용 entry를 따른다. 실제 native 창·탭 전환은 브라우저 환경에서 확인하지 못했고 focus 입력 대역 검증으로 구분한다.

cmux pane·tab·window와 React dropdown·알림 클릭의 대상 창 이동, popup·소리 통합은 기존 Stage6/7 후속 범위로 유지한다. 저장된 알림 이력 삭제나 외부 CLI 실행의 Web 노출로 확대하지 않는다. 이 단계의 구현을 착수·완료 처리하지 않는다.
