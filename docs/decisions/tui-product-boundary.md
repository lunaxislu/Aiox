# Vendor TUI를 유지하는 AIOX 제품 경계

## Context

AIOX의 가치는 vendor의 모델 선택·슬래시 명령·설정 영속화·승인 UI를 다시 만드는 데 있지 않다.
이미 사용 중인 Claude Code와 Codex를 실행·연결하고 협업의 입력·상태를 관측하는 데 있다.
Headless 연동 자체는 다른 저장소에서 검증됐지만 TUI UX 전체 구현 비용은 별개였다.

## Decision

실제 vendor TUI를 유지하고 AIOX는 실행·통신·관측·운영 Web을 소유한다.
제품 범위는 [[docs/product/product]], 통신 계약은 [[docs/specs/aiox-collaboration]],
실행 구성은 [[docs/architecture/aiox-system]]에 반영한다.

## Rationale

- Vendor의 기존 interaction UX를 사용하는 것이 사용자에게 필요한 동작을 가장 직접적으로 제공한다.
- Claude inbox와 Codex App Server/Relay를 통한 실행 중 입력 경로가 있으므로 별도의
  headless 제품이나 Claude Channel bridge가 제품의 필수 전제가 아니다.
- 입력 수신과 턴 종료를 연결할 관측 근거를 활용하고, 사용자 결정에 따라 forced ACK와
  같은 메시지 재전송을 제외한다. 관측 가능성이 전달 보장이나 재시도의 불필요성을 증명하는
  것은 아니다. 확인 불가 상태는 그대로 표시하는 제품 계약이다.
- Runtime별 HTTP MCP credential과 공통 handler가 vendor별 stdio MCP·임시 HTTP send 서버의
  중복 책임을 줄인다.
- daemon 강제 종료 시 모든 관리 실행을 종료하는 제품 선택으로 실행 생존만을 위한 별도
  Controller 프로세스가 필요하지 않게 됐다. 논리적 책임 구분은 유지한다.

## Trade-offs

Claude raw inbox body와 Codex 일부 표시 규약은 안정적인 외부 범용 API 계약이 아니다.
버전·플랫폼별 연결 가능성과 관측 한계를 표시해야 한다. 이 부담을 자동 Channel fallback이나
vendor UX 전체 재구현으로 감추지 않는다.

## Re-evaluation

공급자 변경으로 필요한 입력 경로가 사라지거나 실제 지원 플랫폼에서 요구 동작을 충족할 수
없다는 근거가 생기면 해당 binding과 지원 범위를 재검토한다. 추측만으로 이미 검증한
단일 입력·표시 경로를 반복 조사하지 않는다.

Sources:

- 선택의 경위·검증 범위: `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md` §§2–18, 24.
