# 실행 소유권과 협업 등록의 분리

명시적 CLI 종료 후 외부 생존 선택은 [[docs/decisions/explicit-execution-shutdown]]에서 대체했다.
아래는 당시 결정이며 실행 소유권 분리와 예기치 않은 연결 손실 생존 근거는 유지한다.

이후 [[docs/decisions/external-execution-survival]]에서 외부 생존 경계를 복원했다.
위 대체 관계는 결정 계보이며 현재 계약은 [[docs/specs/aiox-runtime]]을 따른다.

## Decision

외부 `agent run`은 CLI가 실행 수명을 소유하고 daemon은 협업 등록을 소유한다. Web·Host는
계속 daemon 소유로 실행한다. 외부 계약은 [[docs/specs/aiox-runtime]], 책임 배치는
[[docs/architecture/aiox-system]]에 반영한다.

## Rationale

사용자가 외부 터미널에서 시작한 vendor TUI는 daemon의 협업 연결이 끝나도 계속 사용할 수
있어야 한다. 기존 CLI가 직접 실행하고 입출력을 상속하면 이 수명을 충족하며 추가 PTY·화면
미러나 생존 전용 runtime-host가 필요하지 않다. Web은 daemon 소유 화면에 연결하므로 기존
PTY·attachment 구조를 유지한다.

이 선택은 [[docs/decisions/tui-product-boundary]]의 모든 관리 실행을 daemon force 종료
대상으로 삼았던 rationale 부분을 대체한다. 기존 vendor TUI·공통 MCP·재전송 제외 선택은 유지한다.

## Trade-offs

daemon 연결이 끝나면 외부 TUI는 생존하지만 협업은 종료된다. 자동 재연결·재등록을 추가하지
않으며 복구하려면 새 실행을 시작한다. 이 경계를 프로세스 종료 성공으로 표시하지 않는다.

Sources:

- `logs/2026-09-11-AIOX-TUI-Stage2-2-Execution-Ownership.md` — 명령·실행 위치별 실행 소유권 합의.
