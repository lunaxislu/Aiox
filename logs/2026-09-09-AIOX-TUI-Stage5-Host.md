---
topic: AIOX TUI Stage5 Host
description: Host Worktree YAML CLI 초기 layout과 실행 묶음
status: open
---

## Work Items

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 2026-09-09 단계별 로그 선생성과 plan 연결을 요청했다. 이 로그는 구현 착수·완료 증거가 아닌 단계 인계다. plans/aiox-tui-product-rebuild.md에서 이 단계가 활성화될 때 선행 로그 최신 결과와 실제 코드를 다시 확인한다. logs/artifact/AIOX-TUI-Product-Context-Prompt.md의 전체 제품 문맥과 §15 운영 Web·브라우저 복귀·알림, logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md의 대응 결정을 읽는다. 초기 goal의 reply/Host add 등 폐기된 정책을 복원하지 않는다. 구현 시 관련 owner docs와 producer/consumer·테스트까지 추적하고 변경된 계약을 owner에 반영한다.
- docs/specs/aiox-host.md, docs/specs/aiox-runtime.md를 읽는다. Host는 실행 묶음·작업 경로, Network는 통신 경계, layout은 화면 배치다. YAML Agent 정의·단일 Host Network·Worktree·실패 보상을 구현한다. host agent start/stop <host> <agent-names...>를 사용하고 add/remove와 자동 vendor 대화 resume는 제외한다. Host shell은 해당 Host 작업 경로에서 실행하며 shell 자체는 Agent가 아니다.
- Stage 2의 공통 layout 검증·해석을 재사용한다. YAML host.layout, aiox host run --layout auto|left-main|top-main 및 --layout grid --columns 2 --rows 2를 연결한다. 우선순위 CLI → YAML → 전역 host.layout → auto. columns/rows는 grid용 양의 정수, YAML 행·열만 있으면 grid 생략형, 다른 preset과 행·열 충돌은 오류다. 상위 preset 변경 시 하위 다른 preset용 설정을 섞지 않는다.
- 초기 preset: auto는 1개 전체, 2개 좌우, 3개 왼쪽 하나+오른쪽 위아래, 4개 2×2. left-main은 왼쪽 하나+오른쪽 위아래, top-main은 위쪽 하나+아래쪽 좌우, grid는 columns × rows. 초과 Agent는 선언 순서대로 기존 영역에 순환 탭 배치한다. 2열×1행의 A~F는 [A,C,E] / [B,D,F], 최초 선택 A/B를 유지한다. 불필요한 빈 영역을 만들지 않는다. Host 실행 시 최초 배치에만 적용하고 이후 사용자 수정·설정 변경으로 자동 재정렬하지 않는다.
- Stage 6 공통 화면이 초기 layout을 소비한다. Host 전체 페이지 탭을 만들지 않는다. auto의 5개 이상 기본 영역 수 등 원문에서 미정인 세부를 확정된 요구로 주장하지 않는다. Worktree 생성·재사용·충돌은 기존 herdr 참고 방향과 실제 계약을 확인해 구체화한다. terminal/Runtime 정리와 Host stopped 항목 유지, 새 실행 ID route 연결, Host 전체 종료 시 YAML·작업 파일 보존을 검증한다.
- W3 구현 인계: packages/config 공개 parseHostLayout(value, source)·resolveHostLayout({cli,yaml,global})를 YAML/CLI 연결에서 재사용한다. 사용자 추가 결정: 같은 preset은 명시 필드만 덮어쓰고 누락 값을 상속한다. 행·열만 있으면 grid다. 전역 grid2x2 + YAML columns3 = grid3x2; YAML auto는 치수 폐기, 이후 CLI grid도 과거 치수 복원 안 함. 어느 계층에도 없는 grid 치수는 이번 기반에서 계산하지 않는다. daemon.createShell({cwd}) 또는 POST /api/terminals의 cwd에 Host 경로를 연결한다. 생성 cwd를 실시간 cwd 관측으로 해석하지 않는다.

## 2026-09-09 · 단계별 확정 요구와 인계 준비

사용자의 단계별 로그 생성 지시에 따라 Required Context에 구현 범위·선행 결과 소비·참고 자료·사전 논의 조건을 기록했다. 아직 이 단계의 구현을 시작하지 않았다. plan이 이 단계를 활성화하면 선행 로그 최신 기록과 실제 코드부터 대조하고 그때 필요한 Work Items를 구성한다. 이번 기록은 기능 구현·외부 참고 자료 검증 결과가 아니다.
