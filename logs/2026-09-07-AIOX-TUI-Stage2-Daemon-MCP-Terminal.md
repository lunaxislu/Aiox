---
topic: AIOX TUI Stage2 Daemon MCP Terminal
description: daemon 공통 HTTP MCP Network Route Gateway PTY 최소 Web의 범위와 단계별 라이브러리 설치 방향을 보존한다
status: open
---

## Work Items

- [ ] W1 Stage 1의 실제 산출물과 설치 버전을 확인하고 daemon·MCP·PTY·최소 Web의 첫 통합 시나리오를 구체화한다

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 다음 세션의 기억을 위해 Stage 2 일반 로그를 미리 만들도록 요청했다. 구현 미착수·대기 상태이며 현재 활성 단계는 Stage 1이다. Stage 1 완료 후 plans/aiox-tui-product-rebuild.md에서 Stage 2를 활성화한다. Package log/task 파일은 만들지 않는다.
- 현재 설계 진입점 docs/aiox-tui-product.md. 읽을 계약: docs/specs/aiox-runtime.md, docs/specs/aiox-collaboration.md, docs/specs/aiox-host.md, docs/specs/aiox-configuration-web.md. 구조: docs/architecture/aiox-system.md, docs/architecture/aiox-storage-terminal.md. Vendor 연결 경계가 필요할 때 docs/architecture/aiox-vendor-bindings.md를 읽는다. 선행 결과는 logs/2026-09-07-AIOX-TUI-Stage1-Foundation.md에서 확인한다.


## 2026-09-07 · Stage 2 대기 인계와 라이브러리 설치 방향

### 요청과 현재 확인 상태

사용자는 단계별 라이브러리 설치 방향을 수용하고 다음 세션에서 복원할 Stage 2 로그 작성을 요청했다. 이번 작업은 기록 준비이며 라이브러리 설치·제품 구현·vendor 실행을 하지 않는다. 현재 package.json에는 제품 dependencies가 없고 onramp/test:workflow만 있다. 이전 구현 제거 커밋은 3d85506이다. Stage 1 완료나 설치 버전을 가정하지 말고 진입 시 실제 파일과 검증 결과를 확인한다.

### 이 단계가 만드는 흐름

```text
CLI / 최소 React Web
        │ HTTP / WS
        ▼
Daemon: Gateway + 공통 MCP + Network/Route + 실행 관리
        ├─ Stage 1 domain/config/persistence 사용
        ├─ runtime credential → source 신원 → 현재 route 판정
        └─ PTY 소유 → binary stream → Web xterm attachment

브라우저 연결 종료 → attachment 정리 → PTY 실행 유지
명시적 실행 종료 / daemon force stop → 관리 실행 정리 → 종료 확인
```

목표는 Stage 3 Claude와 Stage 4 Codex가 붙을 공통 기반이다. 이 단계의 plain-shell PTY는 transport·수명 검증용이며 제품의 Agent 실행을 대체하는 terminal.create 계약으로 고정하지 않는다. HTTP MCP의 vendor 연결 전 검증은 테스트 클라이언트/테스트 대역으로 수행하며 실제 Claude/Codex 왕복 완료라고 보고하지 않는다.

### 라이브러리 설치 원칙 — 대화에서 수용한 방향

- 공통 개발 도구만 루트에 두고 production dependency는 실제 사용하는 workspace package에 설치한다. 앱에서만 쓰는 라이브러리를 domain에 넣지 않는다.
- 필요한 단계에서 설치한다. 모든 라이브러리와 미래 앱을 미리 구성하지 않는다.
- 설치 시 공식 문서의 지원 Node·플랫폼·호환성을 확인하고 선택한 버전을 lockfile에 기록한다. 이 로그는 최신 버전 조사 결과가 아니다.
- Claude/Codex CLI 자체를 AIOX npm 의존성으로 묶어 설치하지 않는다. 설치된 vendor CLI의 발견·진단·버전 확인은 adapter 단계에서 다룬다.
- 과거에 사용한 라이브러리·버전·wrapper·fallback은 유지 의무가 없다. 먼저 built-in으로 충분한지 보고 필요하면 외부 라이브러리를 선택한다.

| 책임 / 위치 | 설치 시점과 방향 | 아직 확정하지 않은 것 |
| --- | --- | --- |
| 루트 개발 도구 | Stage 1의 TypeScript·테스트·포맷 기반을 사용 | 실제 도구·버전은 Stage 1 결과 확인 |
| packages/domain | 외부 의존성 없이 시작하는 방향 | 필요한 순수 모델 외 선설계하지 않음 |
| packages/config | Stage 1에서 형식 선택 후 parser·검증 구성 | JSON/JSONC/TOML 및 parser |
| packages/persistence | Stage 1에서 SQLite 드라이버 선정·설치 | 드라이버·native 배포 호환성 |
| apps/cli | Stage 1 Commander 기반 명령 구성 결과 사용 | 구현된 명령 범위 |
| apps/daemon | Stage 2 HTTP/WS/MCP 구현에 필요한 의존 설치 | HTTP framework 필요 여부, WS/MCP 패키지·호환 버전 |
| packages/terminal | Stage 2 PTY 구현 의존 설치 | node-pty 후보의 버전·native 설치 조건 |
| apps/web | Stage 2 React/Vite·xterm 최소 연결 방향 | 실제 버전, xterm addon은 사용하는 것만 |
| 운영 Web 확장 | Tailwind·shadcn·다국어는 실제 UI 구현에 맞춰 추가 | use-intl 후보, Zustand/TanStack Query 필요성 |
| apps/site | Stage 9 마지막에 설치 | Next.js/next-intl 후보는 운영 Web과 별개 |

Zustand는 공유 UI 상태가 필요할 때, TanStack Query는 서버 조회·캐시 책임이 생길 때 평가한다. 라이브러리를 넣기 위해 별도의 상태 계층을 만들지 않는다. Tailwind·shadcn·다국어는 제품 요구지만 완성된 UI를 기다려 vendor 연동을 늦추지 않는다.

### 진행 순서 제안

1. Stage 1의 domain·단일 Network·route·전역 설정·SQLite·CLI 및 도구 버전을 확인한다. 미완료가 있으면 Stage 1에서 해결하고 단계 마커를 임의로 완료하지 않는다.
2. daemon 조립과 lifecycle, 설정된 listener·port 및 Gateway 계약을 붙인다. 포트 기본값·우선순위는 Stage 1 결정과 실제 필요에 맞추며 과거 4500/4501 제안을 확정값처럼 쓰지 않는다.
3. 공통 MCP send/reply/agents_list와 credential·Network/Route 적용을 연결한다. 도구의 접수/전송 시도 결과와 실제 vendor 처리 완료를 구분한다.
4. 서버 소유 PTY와 Web attachment·binary I/O·resize·정리의 최소 흐름을 연결한다. Runtime/PTY/Web 연결 수명을 구분한다.
5. 성공·거절·연결 해제·종료 경계를 검증하고 다음 vendor 단계가 사용할 실제 계약과 설치 버전을 이 로그에 기록한다. 구체 Work Items는 착수 때 필요한 범위로 추가한다.

### 유지해야 할 제품 경계

- 실제 vendor TUI 사용. Headless·Claude SDK·Channel fallback·별도 vendor별 stdio MCP child를 복원하지 않는다.
- MCP source는 runtime credential에서 도출한다. /mcp/<networkId>는 권한 자체가 아니다. token은 실제 CLI argument나 로그에 남기지 않는다.
- 단일 Network 소속, runtime join/leave 명령 없음. agents_list는 현재 outbound route가 허용하는 상대와 status만 반환한다. Web의 Network 전체 표시는 별도다.
- send는 outbound 허용 대상으로 fan-out한다. reply는 원 요청과 연결한다. replyExpected=false는 회신 대기·추가 ACK·발신자 자동 깨우기를 요구하지 않는다. 동일 메시지 재전송 tool/자동 retry는 없다.
- 일반 daemon stop은 활성 실행이 있으면 거절한다. stop --force는 AIOX 관리 실행 전체를 종료한다. 브라우저 닫기를 실행 종료로 취급하지 않는다.
- 자동 브라우저 재방문에 사용자 로그인/재인증 절차를 추가하지 않는다. 완전한 현재 화면·배치 복원은 Stage 6에서 완성하되 Stage 2의 접속 구조가 이를 막지 않게 한다.
- Host manifest/Worktree는 Stage 5, 완성된 운영 UI는 Stage 6, 알림은 Stage 7, 공개 사이트는 Stage 9다.

### 검증과 완료 판단

Stage 2의 완료 근거는 실제 daemon/Gateway/MCP·route 검증과 PTY↔최소 Web 입출력, resize, attachment 해제 후 실행 생존, 명시적 종료·실패 정리다. vendor의 실제 수신/Stop/turn 완료는 Stage 3–4의 근거를 사용한다.

Windows 네이티브·Linux·macOS 목표를 처음부터 고려한다. SQLite 설치는 Stage 1, PTY 설치·실행·정리는 Stage 2에서 확인하고 Stage 8까지 미루지 않는다. WSL은 별도 실행 환경이며 Linux Docker 실행을 Windows 네이티브 PTY 검증으로 간주하지 않는다. 실행할 환경이 없는 항목은 미검증으로 남겨 후속 검증 지점을 명시한다.

실제 브라우저와 jsdom/mock, 실제 PTY와 테스트 대역을 구분해 기록한다. 이전 실측의 버퍼 수치·OS 통과 기록을 새 구현에 자동 승계하지 않는다.

### 다음 세션 진입

현재는 Stage 1을 계속한다. Stage 1 완료 후 plan에서 Stage 2를 활성화하고 이 로그 W1을 active로 전환한다. 먼저 위 Required Context와 Stage 1 결과를 읽는다. 이번 로그 준비만으로 설치·구현·검증이 끝났다고 표시하지 않는다.
