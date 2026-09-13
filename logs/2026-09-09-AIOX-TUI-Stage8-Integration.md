---
topic: AIOX TUI Stage8 Integration
description: 실제 브라우저 vendor 플랫폼 npm 산출물 통합 검증
status: open
---

## Work Items

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 2026-09-09 단계별 로그 선생성과 plan 연결을 요청했다. 이 로그는 구현 착수·완료 증거가 아닌 단계 인계다. plans/aiox-tui-product-rebuild.md에서 이 단계가 활성화될 때 선행 로그 최신 결과와 실제 코드를 다시 확인한다. logs/artifact/AIOX-TUI-Product-Context-Prompt.md의 전체 제품 문맥과 §15 운영 Web·브라우저 복귀·알림, logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md의 대응 결정을 읽는다. 초기 goal의 reply/Host add 등 폐기된 정책을 복원하지 않는다. 구현 시 관련 owner docs와 producer/consumer·테스트까지 추적하고 변경된 계약을 owner에 반영한다.
- 선행 Stage 2~7 로그의 구현·실측·미검증을 구분해 읽는다. Windows native/Linux/macOS, WSL, npm 전역 배포 산출물의 실제 설치·DB·PTY·vendor 실행·종료·실패 정리를 검증한다. 기존 CI 설치/PTY 테스트 성공을 브라우저·vendor·WSL·배포 성공으로 확대하지 않는다.
- Host와 일반 터미널 공통 탭/분할·이동·resize·확대/복귀·균등화, 기존 shell의 standalone 실행·종료 후 복귀·중복 탭 없음, Host 최초 layout과 초과 Agent 순환 배치·사용자 배치 유지, 작업 경로와 route 수명, 브라우저 재접속 후 현재 화면·배치·놓친 알림을 실제로 확인한다. 화면 조작이 프로세스·대화·Network를 바꾸지 않아야 한다.
- 브라우저 OS 기준 단축키·예약키/터미널 입력 보존, Windows 브라우저+WSL 서버는 Windows 기준, 실제 포커스/숨은 탭/비활성 브라우저 알림·읽음·소리 묶음, system/light/dark와 OS 테마 변경·config 저장 책임을 검증한다. Stage 6에서 사용자와 합의한 정확한 키·schema를 기준으로 한다. 환경 부재는 미검증으로 남기고 Linux Docker를 Windows 증거로 삼지 않는다.
- 기존 Stage 2 로그에는 ef624d8 CI의 한 차례 64KiB 버퍼 timeout이 코드 변경 없는 재실행에서 통과했다고 기록돼 있다. 원인 확정으로 취급하지 말고 재발하면 좁게 재현한다. 목표는 새 구현의 통합이며 폐기된 legacy alias/fallback을 복원하지 않는다.
- Stage2-3의 2026-09-14 최신 마감 entry 및 이 로그의 「Stage2-3 사용자 실측·현재 이유 표시 인계」를 소비한다. 남은 플랫폼·WSL·npm 산출물 인증은 해당 환경과 배포 산출물이 준비된 Stage8에서 수행한다. 사용자 실측을 agent 재실행·모든 환경 인증으로 확대하지 않으며 확인된 동일 사용 흐름을 일괄 재검증하지 않는다.

## 2026-09-09 · 단계별 확정 요구와 인계 준비

사용자의 단계별 로그 생성 지시에 따라 Required Context에 구현 범위·선행 결과 소비·참고 자료·사전 논의 조건을 기록했다. 아직 이 단계의 구현을 시작하지 않았다. plan이 이 단계를 활성화하면 선행 로그 최신 기록과 실제 코드부터 대조하고 그때 필요한 Work Items를 구성한다. 이번 기록은 기능 구현·외부 참고 자료 검증 결과가 아니다.

### 2026-09-14 00:26 · Stage2-3 사용자 실측·현재 이유 표시 인계

사용자는 host:4501 운영 Web 접속·Claude 실행과 브라우저 창/탭 전환에 따른 알림 표시·읽음 처리까지 이전에 직접 확인했다고 보고했다. 이 사용 흐름의 사용자 실측 근거로 수용하고 같은 검증을 반복 요구하지 않는다. 이번 세션의 agent 재실행 결과는 아니며 OS·WSL 구성, 브라우저/vendor 버전과 실행 SHA는 특정되지 않았다. Windows 네이티브와 WSL 각각의 전체 인증이나 모든 vendor 메시지·중단 시나리오 완료로 확대하지 않는다.

남은 플랫폼·WSL·npm 산출물 인증은 해당 환경과 배포 산출물이 준비된 Stage8에서 수행한다. Stage2-3은 마감하되 후속 단계 활성화·착수는 하지 않았다.
