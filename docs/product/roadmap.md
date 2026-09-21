# Product Roadmap

Status: Current

제품 범위는 [[docs/product/product]], 현재 설계 진입점은 [[docs/aiox-tui-product]]다.
이 문서는 공개 기준을 소유하며 단계별 실행 상태는 `plans/aiox-tui-product-rebuild.md`에 둔다.
이전 G0–G6의 완료 기록을 이번 TUI 제품의 공개 완료 증거로 사용하지 않는다.

## Release Path

실행·통신 기반 → Claude/Codex 실제 TUI 협업 → Host·운영 Web
→ OS별 배포 검증 → 실제 제품에 맞는 공개 사이트 순서로 준비한다.
과거 headless·Channel·canonical envelope·retry 전제의 gate는 현재 공개 요구가 아니다.

## Gate Overview

| Gate | 목적 |
| --- | --- |
| 실행·통신 | 실제 두 vendor TUI에서 권한에 맞는 메시지·회신·상태 관측 |
| 운영 | Host·브라우저 복귀·설정·알림이 실행 수명과 일치 |
| 배포 | 지원 OS에서 npm 산출물 설치·실행·종료 및 저장 검증 |
| 공개 사이트 | 구현한 기능·지원 범위와 일치하는 다국어 안내 |

## Phase 0 Release Gates

### 실행·통신

- 목표: TUI 상호작용을 유지한 두 vendor 협업.
- 진입 조건: 새 외부 계약과 provider binding 경계가 구현에 사용 가능하다.
- 착수 검토 / 열린 결정: 내부 wire의 지원 조건, 필요한 상태 매핑 및 입력 presentation.
- 통과 조건: 실제 송신·수신·회신을 연결하고 불확실한 관측을 성공으로 표시하지 않는다.
  HTTP MCP credential·Network·route 검사, daemon 소유 실행 종료와 외부 실행의 독립 수명·등록 정리가 동작한다.
- Owner refs: [[docs/specs/aiox-collaboration]]에서 메시지·route·회신 의미,
  [[docs/architecture/aiox-vendor-bindings]]에서 실행과 관측 경계를 확인한다.

### 운영

- 목표: 작업 공간·실행·터미널·알림을 일관되게 운영한다.
- 진입 조건: 두 vendor runtime과 기반 PTY가 실제 동작한다.
- 착수 검토 / 열린 결정: 화면 복원 방식, 현재 schema 초기화·저장·재오픈·정리 검증.
- 통과 조건: Host·단일 Network·종료와 자동 브라우저 복귀가 동작한다.
  전역 설정 자동 적용·포트 다음 시작 적용·알림 읽음과 포커스 억제를 확인한다.
- Owner refs: [[docs/specs/aiox-host]]에서 실행 구성과 route,
  [[docs/specs/aiox-configuration-web]]에서 Web·설정·저장 경험을 확인한다.

Worktree 자동 생성은 이번 Host 구현 범위와 운영 gate에서 제외하며 후속 범위로 둔다.

### 배포

- 목표: 개발 머신의 소스 실행과 실제 배포 산출물의 동작 차이를 닫는다.
- 진입 조건: 공개할 계약이 구현되고 관련 검증이 통과한다.
- 착수 검토 / 열린 결정: 지원 Node·CPU 조합, npm package metadata와 플랫폼별 설치 조건.
- 통과 조건: 동일 배포 산출물의 clean install, CLI·DB·PTY·vendor 연동과 실행 소유권에 맞는 종료·등록 정리를
  지원 OS에서 확인하고 native Windows와 WSL 결과를 구분한다.
- Owner refs: [[docs/specs/aiox-runtime]]에서 실행·종료 의미,
  [[docs/architecture/aiox-storage-terminal]]에서 DB·PTY 플랫폼 경계를 확인한다.

### 공개 사이트

- 목표: 실제 제품과 지원 범위에 맞는 다국어 소개·설치·사용 안내.
- 진입 조건: 앞선 제품·배포 검증이 완료된다.
- 착수 검토 / 열린 결정: 사이트 framework와 공유 UI의 실제 필요.
- 통과 조건: 운영 Web과 별도 배포하고 vendor 기능·AIOX 관측 보장을 과장하지 않는다.
- Owner refs: [[docs/product/product]]의 scope 및 [[docs/specs/aiox-configuration-web]]의 UI 경계를 따른다.

## Post-Release Phases

추가 vendor·원격·federation·durable replay는 이번 구현 범위가 아니다.
공개 이후 실제 요구가 확인될 때 별도 scope와 검증 기준을 정한다. 이전 phase 계획을 자동 재개하지 않는다.

## Gate Evidence

- 송수신·회신은 실제 provider 출력과 daemon 관측을 연결해 확인한다.
- UI는 실제 터미널 표시·입력·브라우저 복귀로 검증한다.
- 종료는 프로세스와 자원 정리로, 저장은 재시작 후 읽기로 확인한다.
- 기존 성공 실측의 provenance는 사용할 수 있지만 새 플랫폼·새 통합 경로의 성공으로 확대하지 않는다.
- 검증되지 않은 조합은 명시하며 Docker Linux 실행을 Windows 결과로 표시하지 않는다.

## Cross-Platform Requirement

Windows 네이티브·Linux·macOS는 지원 목표다. native dependency 설치, 경로·권한,
PTY·IPC·프로세스 종료와 vendor 연결을 해당 OS에서 검증한다.
WSL은 Linux 실행 환경과 Windows 브라우저 연결을 구분하고, Windows daemon과 Linux vendor의
혼합 제어는 현재 확정된 지원으로 주장하지 않는다.

Sources:

- 제품 전환·3 OS 범위·사이트 마지막 결정: `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md`.
