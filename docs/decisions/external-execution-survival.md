# daemon 종료와 외부 실행 수명의 분리

## Decision

외부 `agent run`의 실행 수명은 CLI에 남기고 daemon 일반 stop·force는 협업 관계만 해제한다.
[[docs/decisions/explicit-execution-shutdown]]에서 외부 실행까지 확장한 종료 선택을 교정한다.
외부 계약은 [[docs/specs/aiox-runtime]], 책임 배치는 [[docs/architecture/aiox-system]]이 소유한다.

## Rationale

협업 daemon을 종료하는 요청은 사용자 터미널에서 계속 작업하는 vendor까지 종료하라는 뜻이 아니다.
CLI의 실행 소유권과 daemon의 협업 소유권을 나누면 외부 vendor를 유지하기 위한 추가 runtime-host나
중복 화면 관리가 필요 없다. MCP 연결 실패도 호출측의 협업 불가 진단이며 실행 종료 사유가 아니다.

Windows에서 shell별 idle 판정 비용을 피하려는 선택을 외부 실행 소유권까지 확장한 것이 문제였다.
이 비용 절감은 daemon 소유 실행에 한정해 유지한다. 명령을 입력한 터미널의 위치가 아니라
실행 소유권이 기준이므로 외부에서 시작한 Host와 외부 standalone Agent를 같은 수명으로 취급하지 않는다.

## Trade-offs

외부 실행은 daemon 종료 뒤에도 자원을 사용하며 사용자가 그 실행을 종료해야 한다. 협업 복구는
새 실행으로 수행하고 자동 재연결·재등록을 추가하지 않는다. daemon 종료 성공은 외부 vendor exit를
뜻하지 않으며 협업 정리 실패는 별도로 드러내고 재시도할 수 있어야 한다.

## Re-evaluation

사용자가 외부 실행 종료를 명시적으로 요청하는 별도 제품 동작이 필요해지면 그 권한·소유권·완료
조건을 별도로 설계한다. daemon stop의 force를 그 기능으로 암묵적으로 확대하지 않는다.

Sources:

- `logs/2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md` — 외부 vendor 생존 정책 정정 및 W1 실행 승인.
