# AIOX Product

Status: Current

이 문서는 제품 목적·범위·원칙을 소유한다. 외부 계약은
[[docs/specs/aiox-collaboration]], 내부 구조는 [[docs/architecture/aiox-system]],
공개 기준은 [[docs/product/roadmap]]에서 확인한다.
전체 설계 진입점은 [[docs/aiox-tui-product]]다.

## Product Definition

AIOX는 사용자가 이미 사용하는 Claude Code와 Codex의 실제 TUI를 실행·연결·관측하고,
하나의 작업 공간에서 협업시키는 로컬 orchestration 제품이다.

사용자는 CLI 또는 운영 Web에서 Agent를 실행하고 Host로 묶는다. Agent 간 통신은
AIOX가 제공하는 공통 도구를 사용하며, Network와 route가 통신 경계를 정한다.
Vendor TUI는 모델 선택·슬래시 명령·질문·승인 등 기존 상호작용을 담당한다.

AIOX는 별도의 공개 interoperability standard를 만드는 제품으로 설명하지 않는다.
내부 메시지 계약은 이 제품의 협업을 지원하는 계약이다.

## User Value

- Claude와 Codex 사이의 지시·토론·회신을 사람이 복사해 중계하지 않는다.
- 같은 프로젝트 또는 별도 Git Worktree의 작업을 Host 단위로 구분한다.
- 실제 vendor TUI와 실행 상태·알림·배치를 한 운영 화면에서 확인한다.
- 브라우저를 닫아도 실행을 유지하고 다시 열면 기존 터미널로 돌아온다.
- 모든 프로젝트에서 같은 터미널·키보드 설정을 사용한다.

## Scope

초기 지원 대상은 Claude Code TUI와 Codex TUI다. Headless 세션·Claude SDK로 vendor UX를
재구현하지 않는다. Native inbox 등 비공개 구현 규약에 의존하는 부분은 지원 조건과
실측 범위를 명시한다. 표면이 공식적이라는 인상을 주기 위해 이를 숨기지 않는다.

Standalone Agent와 선언형 Host, 단일 Network 소속, directed route, 공통 메시지·회신 도구,
실행 관측, 로컬 SQLite 저장, React 운영 Web을 제품 범위로 둔다.
실행 구성은 Host manifest가, 사용자 공통 설정은 전역 설정 파일이 담당한다.

Windows 네이티브·Linux·macOS를 지원 목표로 삼는다. Windows의 WSL 실행은 네이티브 실행과
구분해서 검증한다. Vendor 설치 지원과 AIOX 전체 연동 완료는 같은 주장이 아니다.

공개 다국어 사이트는 실제 제품에 맞는 소개·설치·사용 정보를 제공하며 운영 Web과 분리한다.
추가 vendor·원격 실행·federation은 현재 구현 범위가 아니다.

## Product Principles

### Vendor Interaction

Vendor TUI가 vendor와 사용자 사이의 상호작용을 담당하고, AIOX 운영 Web은 Host·Network·
터미널 배치·설정·알림을 담당한다. AIOX가 vendor의 quota·모델·슬래시 명령 UI 전체를 복제하지 않는다.

### Execution And Connectivity

Controller는 실행 수명을, Network는 통신 경계를, daemon은 실행 등록과 통신 정책 집행을
소유한다. 논리적 책임 분리는 별도 OS 프로세스를 반드시 요구하지 않는다.
종료 범위는 [[docs/specs/aiox-runtime]]이 정의한다.

### Observable Outcomes

입력 전송, vendor 수신·턴 종료, MCP 회신과 실제 작업 성공을 구분한다.
모델의 자기보고나 소켓 write 성공만으로 작업 성공을 선언하지 않는다.
정확한 메시지 의미는 [[docs/specs/aiox-collaboration]]이 소유한다.

### Explicit Scope

Pre-v1의 이전 명령·Channel bridge·재전송 기능을 유지하기 위한 fallback이나 alias를 만들지 않는다.
브라우저 복귀는 기존 실행에 다시 연결하는 동작이며 daemon 재시작 뒤 자동 실행 복원으로 확대하지 않는다.

Sources:

- 승인된 제품 재구축 방향과 범위: `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §§2–3, 7, 18–24.
