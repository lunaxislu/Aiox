# 명시적 실행 종료와 shell별 판정 비용의 경계

외부 실행까지 명시적 종료 대상을 확장한 선택은
[[docs/decisions/external-execution-survival]]에서 교정했다. 아래는 당시 결정의 기록이며
Windows shell별 작업 판정 비용을 줄인 이유는 daemon 소유 실행 범위에서 유지한다.

## Decision

실행 소유권은 유지하되 명시적 CLI 종료 의도를 실행 owner에 전달한다. Windows 일반 stop은
작업을 판정하지 않고 종료하며 POSIX 일반 stop은 최초 shell과 등록 실행을 보호한다.
계약은 [[docs/specs/aiox-runtime]], shell 선택은 [[docs/specs/aiox-configuration-web]]이 소유한다.

## Rationale

CMD builtin은 자식 프로세스·프롬프트 관측만으로 idle을 증명하지 못하고 PowerShell 연동은
PSReadLine 버전과 별도 handshake를 요구했다. 사용자는 Windows native 실행을 제한하는 대신
일반 stop의 작업 중단을 허용했다. 이 선택으로 shell별 idle 지원과 중첩 상태 탐색을 추가하지 않는다.
Web shell은 실행한 부모를 추측하지 않고 명시적 설정으로 선택한다.

force는 외부 CLI 소유 실행도 끝내려는 명시적 요청이다. 이는
[[docs/decisions/execution-ownership]]의 명시적 daemon 종료 후 외부 생존 선택을 대체한다.
실행 owner 분리와 예기치 않은 연결 손실·daemon 신호 종료 후 생존 이유는 유지한다.

## Trade-offs

Windows 일반 stop/restart는 작업을 중단할 수 있다. 임의 중첩 작업 전체의 종료 보장은 별도 검증
범위다. POSIX는 안쪽 shell의 idle을 추적하지 않아 먼저 exit해야 할 수 있다. 실행 owner의 종료
응답을 확인해야 하므로 종료 제어 연결과 협업 권한 회수를 같은 작업으로 취급할 수 없다.

Sources:

- `logs/2026-09-11-AIOX-TUI-Stage2-2-Execution-Ownership.md` — 2026-09-12 정책 변경·조사·신호 종료 재확인.
