---
topic: AIOX TUI Stage8 Integration
description: 실제 브라우저 vendor 플랫폼 npm 산출물 통합 검증
status: open
---

## Work Items

- [ ] W1 실제 구독 quota 대기·취소·재개 실측 — Stage3 W3에서 이관. 기능이 활성인 구독 Claude TUI에서 제한/reset 조건을 확보한 뒤 대기·Esc/메뉴 취소·자동/Enter 재개·재한도를 관측하고 AIOX status 및 최초 delivery 결과·알림 중복 방지를 확인한다. API-key 429 재시도나 합성 hook 테스트를 구독 실측으로 대체하지 않는다.
- [ ] W2 Windows daemon → wsl.exe 혼합 실행 실측 — Stage3 W3에서 이관. Windows daemon이 WSL vendor를 실행하는 환경에서 준비·MCP/inbox 전달·상태/결과 관측·종료·자원 및 등록 정리를 검증한다. WSL 내부 pnpm check 성공과 구분한다.
- [ ] W3 Windows 공유 filesystem 경로 실측 — Stage3 W3에서 이관. 실제 공유 경로 구성과 OS/vendor 버전을 명시하고 registry/transcript 생성·변경·이동·세션 전환 감시 및 결과 저장·정리 흐름을 확인한다. WSL ext4 자동 검사 결과를 공유 filesystem 증거로 확대하지 않는다.
- [ ] W4 Codex OS·배포 산출물 실행 인증 — Stage4의 macOS 실측과 자동 검사 근거를 소비하고 Windows/Linux/WSL 및 npm 산출물의 실제 Codex TUI 실행·MCP 주입·Relay 연결·상태/결과 전달·종료 정리를 검증한다. 실제 OS/vendor 버전과 증거를 명시하며 기존 CI·macOS 결과로 다른 환경 인증을 대체하지 않는다.
- [ ] W5 Windows native Claude inbox 인증 실측 — Stage3 W2에서 이관. Windows PC/VM의 네이티브 Claude에서 token 확보·AIOX 전달·named pipe 인증을 검증한다. 무인증·잘못된 token·MCP token·다른 세션 token은 연결 종료와 메시지 미수신, 정상 inbox token과 AIOX send는 실제 수신·결과 관측을 확인한다. OS/Claude 버전과 화면·transcript·DB 근거를 남기고 검증 자원을 정리한다. WSL/Linux Docker·대역 CI 성공으로 대체하지 않는다.
- [ ] W6 Claude Linux/WSL·배포 산출물 통합 검증 — Stage3 W5 마감 결과를 소비하고, 해당 OS의 실제 Claude TUI 실행·MCP/inbox 전달·상태/결과·알림·종료와 배포 산출물 설치를 검증한다. 기존 macOS 실측 및 Linux/Windows/macOS·WSL 자동 검사와 구분한다. Windows native inbox 인증은 W5, Windows daemon→WSL 혼합 실행은 W2, 공유 filesystem은 W3가 소유하며 중복 검증하지 않는다.

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
- Stage4 완료 범위는 logs/2026-09-09-AIOX-TUI-Stage4-Codex.md의 최종 마감 기록과 docs/architecture/aiox-vendor-bindings.md에서 소비한다. Codex↔Codex 및 macOS Haiku↔Luna 성공 경로를 새 필수 재검증으로 만들지 않는다. Stage4의 nullable elicitation 추가 실측·async 종료 후 선택 UI 부재·failed 대화 선택/취소·다른 연결별 복구·최종 실패 실측 및 교차 실패/중단/busy 추가 행렬은 기존 미실측 제한으로 구분하며 이번 인계로 자동 활성화하지 않는다. 출력 적체·입력 분리 추가 조사와 제목 helper 보정은 사용자 결정에 따라 진행하지 않는다. Codex OS·배포 산출물 인증은 해당 Work Item에서 수행한다.

### {W1,W2,W3}

- 2026-09-21 사용자 승인으로 logs/2026-09-09-AIOX-TUI-Stage3-Claude.md의 W3 잔여 실측 소유권을 이관받았다. source W6와 최신 「W3 완료·잔여 실측 Stage8 이관·W4 재개」 entry를 소비한다. 세 항목은 미검증이며 Stage8 활성화와 각 환경/조건 확보 후 실행한다. Stage3는 결과 복귀를 기다리지 않는다. 기존 macOS 실측·WSL 내부 자동 검사·API 429 실측·quota 회귀 테스트는 해당 범위의 증거로만 사용한다.

### {W5}

- Stage3 W2의 Windows native inbox 실제 검증을 사용자 지시로 인수했다. Source logs/2026-09-09-AIOX-TUI-Stage3-Claude.md W7은 transferred이며 복귀 대기가 아니다. macOS Claude2.1.278/Haiku4.5 route·알림 실측과 자동23files/361tests는 완료 근거지만 Windows token 강제 인증의 증거는 아니다. Windows PC/VM에서 네이티브 Claude로 수행하며 WSL과 구분한다. 사용자에게 Windows에서 직접 해보겠다는 의사가 있었으나 아직 실행 결과는 없다.

### {W6}

- Stage3 W5는 기존 실제 macOS Claude 검증을 소비하고 최종 pnpm check 49files/663tests PASS(HEAD6b0f588 + 당시 working tree, /private/tmp/aiox-w5-check.log), owner 정합을 확인해 마감했다. Linux/WSL 실제 Claude 및 배포 산출물 인증은 본 로그의 기존 OS/배포 통합 범위를 W6로 구체화한 후속 작업이다. macOS 결과나 과거 3 OS/WSL CI를 최신 모든 OS 실제 통합 성공으로 승격하지 않는다. Stage3 결과는 logs/2026-09-09-AIOX-TUI-Stage3-Claude.md의 W5 마감 entry를 소비한다.

## 2026-09-09 · 단계별 확정 요구와 인계 준비

사용자의 단계별 로그 생성 지시에 따라 Required Context에 구현 범위·선행 결과 소비·참고 자료·사전 논의 조건을 기록했다. 아직 이 단계의 구현을 시작하지 않았다. plan이 이 단계를 활성화하면 선행 로그 최신 기록과 실제 코드부터 대조하고 그때 필요한 Work Items를 구성한다. 이번 기록은 기능 구현·외부 참고 자료 검증 결과가 아니다.

### 2026-09-14 00:26 · Stage2-3 사용자 실측·현재 이유 표시 인계

사용자는 host:4501 운영 Web 접속·Claude 실행과 브라우저 창/탭 전환에 따른 알림 표시·읽음 처리까지 이전에 직접 확인했다고 보고했다. 이 사용 흐름의 사용자 실측 근거로 수용하고 같은 검증을 반복 요구하지 않는다. 이번 세션의 agent 재실행 결과는 아니며 OS·WSL 구성, 브라우저/vendor 버전과 실행 SHA는 특정되지 않았다. Windows 네이티브와 WSL 각각의 전체 인증이나 모든 vendor 메시지·중단 시나리오 완료로 확대하지 않는다.

남은 플랫폼·WSL·npm 산출물 인증은 해당 환경과 배포 산출물이 준비된 Stage8에서 수행한다. Stage2-3은 마감하되 후속 단계 활성화·착수는 하지 않았다.

### 2026-09-21 16:14 · Stage3 W3 잔여 실측 인수 — quota·Windows 혼합 실행·공유 filesystem

- 사용자 승인: 실제 구독 quota 대기·취소·재개, Windows daemon → wsl.exe 혼합 실행, Windows 공유 filesystem 실측을 이 로그의 W1/W2/W3로 이관한다. 지금 실행하지 않으며 Stage8의 대기 작업으로 유지한다.
- Source: logs/2026-09-09-AIOX-TUI-Stage3-Claude.md W3에서 분리한 W6. 소유권 transfer이며 source 복귀/소비 대기를 만들지 않는다. 두 로그는 각각 vendor 구현 단계와 후속 통합 검증 단계의 독립 Base 로그를 유지한다. 공통 artifact 변경을 함께 완료할 package 실행이 아니다.
- 구독 quota: 기존 9/17 실제 TUI + 로컬 시험 API의 429 재시도·정상 복구·소진 실패와 9/20 취소/Enter 재개/재한도 회귀 검사는 완료 근거다. 실제 구독 대기 UI·신호 발생부터 AIOX까지의 실측은 별개다. 공식 조건 https://code.claude.com/docs/en/interactive-mode#start-a-wait-yourself 에서 API key·usage-based billing은 해당 대기를 제공하지 않는다. 사용자 사용량을 일부러 소진하거나 유료 실험을 수행하지 않았다.
- Windows: WSL2 Ubuntu ext4 내부 Node22/24 pnpm check·doctor 성공은 이미 기록된 근거다. Windows daemon → wsl.exe 실행과 공유 filesystem 감시·경로 경계의 실제 검증을 뜻하지 않는다.
- 완료 조건: W1/W2/W3 각각 실제 환경·버전·실행 코드 기준과 상태/DB/알림/정리 결과를 남긴다. 환경 부재나 API/합성 이벤트 대체만으로 실측 완료 처리하지 않는다. plan Stage8 pointer에서 재개하며 Stage3 W3 완료는 이 세 항목의 검증 완료를 뜻하지 않는다.

### 2026-09-21 23:06 · Stage4 마감 결과와 Codex OS·배포 인증 인계

- Stage4 W1~W4 구현·합의한 실측과 W5 owner 반영을 소비한다. 최신 구조·제한의 owner는 docs/architecture/aiox-vendor-bindings.md다. Codex Windows/Linux/WSL 및 npm 산출물의 실제 실행 인증은 기존 Stage8 OS·배포 범위를 구체화한 W4로 남겼다. 완료 조건은 명시한 실제 환경에서 주입·연결·관측·결과·종료 흐름의 증거를 확보하는 것이다.
- Stage4에서 생략했거나 미실측인 시나리오는 Required Context에 제한으로 보존했다. 전부 새 필수 작업으로 전환하거나 검증 완료로 간주하지 않는다. 출력 적체·입력 분리는 추가 조사하지 않고 제목 helper는 알려진 제한으로 유지한다. 기존 Stage3 인계 항목과 다른 에이전트의 변경은 보존한다.

### 2026-09-21 23:10 · Stage3 W2 Windows native inbox 인증 실측 인수

- 사용자 지시로 Stage3 W2의 Windows native Claude token 확보·전달·named pipe 실제 인증을 W5로 인수했다. source logs/2026-09-09-AIOX-TUI-Stage3-Claude.md W7은 transferred이며 결과 복귀를 기다리지 않는다. 기존 Windows daemon→WSL 혼합 실행 W2, 공유 filesystem W3, Codex OS·배포 W4는 유지한다.
- Windows PC/VM의 네이티브 Claude에서 무인증·잘못된 token·MCP token·다른 세션 token의 연결 종료/미수신 및 정상 token/AIOX send 성공을 화면·transcript·DB로 검증한다. WSL/Linux Docker·대역 CI로 대체하지 않는다. Windows 실측을 실행하거나 통과 처리한 것은 아니다.
- source W2는 macOS 실측·자동 검증 완료와 승인된 Windows 이관을 반영해 완료했다. source의 잔여 작업은 W5이며 plan의 현재 Stage5 포인터는 다른 작업 변경을 보존하고 수정하지 않았다.

### 2026-09-21 23:25 · Stage3 W5 마감 결과와 Claude OS·배포 후속 인증

- Stage3 W5는 실제 macOS W1/W2/W3/W4 증거와 최종 pnpm check 49files/663tests PASS를 소비해 마감한다. 상세 검증 위치와 제한은 source의 W5 마감 entry가 소유한다. 이번에 새로운 Claude 세션이나 OS 실측을 실행하지 않았다.
- 본 로그 Required Context가 이미 소유한 Linux/WSL 실제 Claude 및 배포 산출물 검증을 W6로 구체화했다. Windows native inbox 인증 W5, 혼합 실행 W2, 공유 filesystem W3와 분리해 중복 없이 수행한다. W6는 이후 실제 환경에서 수행할 후속 인증이며 Stage3로 결과 복귀를 기다리는 child가 아니다.
