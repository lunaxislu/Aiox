---
topic: AIOX TUI Stage7 Notifications
description: Agent 상태와 실제 terminal 포커스 기반 알림 읽음 소리
status: open
---

## Work Items

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 2026-09-09 단계별 로그 선생성과 plan 연결을 요청했다. 이 로그는 구현 착수·완료 증거가 아닌 단계 인계다. plans/aiox-tui-product-rebuild.md에서 이 단계가 활성화될 때 선행 로그 최신 결과와 실제 코드를 다시 확인한다. logs/artifact/AIOX-TUI-Product-Context-Prompt.md의 전체 제품 문맥과 §15 운영 Web·브라우저 복귀·알림, logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md의 대응 결정을 읽는다. 초기 goal의 reply/Host add 등 폐기된 정책을 복원하지 않는다. 구현 시 관련 owner docs와 producer/consumer·테스트까지 추적하고 변경된 계약을 owner에 반영한다.
- docs/specs/aiox-collaboration.md, docs/specs/aiox-configuration-web.md 및 Stage 6의 terminal/탭/포커스 연결을 읽는다. MCP idle/working/failed와 Web의 reasoning·도구·입력/승인 대기·실패·Host stopped 상세를 구분한다. 개별 요청 결과와 현재 Agent 상태를 분리하며 알림 읽음이나 다른 요청 완료로 미해결 사용자 요청을 지우지 않는다.
- 브라우저 활성 + 대상 terminal에 실제 포커스이면 소리·토스트 생략. 다른 영역·숨겨진 탭·비활성 브라우저이면 탭 알림 표시 + 알림 목록 + 소리. 알림 클릭은 대상 영역/탭 선택·실제 포커스 이동·읽음 처리, 전체 읽음도 제공한다. 표시를 생략해도 실행 상태·이벤트 기록은 유지한다. 브라우저가 닫혀 있을 때 놓친 알림을 서버에 유지하고 재방문 때 표시한다.
- 짧게 몰린 알림은 개별 항목을 보존하고 소리만 한 번 울린다. 정확한 묶음 시간·multi-tab 소리 주체·음원은 확정값을 꾸며내지 말고 해당 단계에서 구체화한다. native OS 알림/브라우저가 닫힌 상태의 OS 소리를 자동 추가하지 않는다. AIOX 자동 완료/실패 통지는 원 Runtime 발신자만 대상으로 하고 새 A′ 비전달·알림 재귀 방지를 유지한다.
- cmux의 포커스·활성/비활성 영역 표현과 단축키 조작을 참고한다: https://cmux.com/docs/concepts , https://cmux.com/docs/keyboard-shortcuts . Stage 6 로그의 Paseo 현재 영역 terminal 배치 참고와 연결해 알림 클릭 대상이 맞는 탭을 가리키는지 검증한다. 정확한 기본키·OS별 keybindings 구조는 Stage 6에서 사용자와 논의한 결정만 소비한다.


## 2026-09-09 · 단계별 확정 요구와 인계 준비

사용자의 단계별 로그 생성 지시에 따라 Required Context에 구현 범위·선행 결과 소비·참고 자료·사전 논의 조건을 기록했다. 아직 이 단계의 구현을 시작하지 않았다. plan이 이 단계를 활성화하면 선행 로그 최신 기록과 실제 코드부터 대조하고 그때 필요한 Work Items를 구성한다. 이번 기록은 기능 구현·외부 참고 자료 검증 결과가 아니다.
