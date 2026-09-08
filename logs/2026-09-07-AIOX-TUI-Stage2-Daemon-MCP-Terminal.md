---
topic: AIOX TUI Stage2 Daemon MCP Terminal
description: daemon 공통 HTTP MCP Network Route Gateway PTY 최소 Web의 범위와 단계별 라이브러리 설치 방향을 보존한다
status: open
---

## Work Items

- [>] W1 현재 Git 구현을 기준으로 Stage 2 전체 완료에 남은 실제 브라우저·플랫폼별 설치/PTY 검증과 다음 단계 인계를 확인한다
- [x] W2 리뷰 1–4·6–8의 결함을 합의한 시나리오대로 수정하고 회귀·통합 검증한다

## Required Context

### Return Target

- None: independent log.

### {Global}

- 현재 활성 단계는 Stage 2이며 Git에 제품 구현·의존성이 존재한다. W2 리뷰 1–4·6–8 수정과 158 tests·빌드 Node smoke 검증은 완료했고 현재 재개점은 W1의 전체 완료 근거·인계 확인이다. 최신 W2 블록의 사용자 합의(일반 작업 자식 종료 제외, TUI exit 후 daemon 유지, 전체 API/WS 보호, 새 A′ 비전달)를 적용한다. 실제 vendor·브라우저 UI·다른 OS 완료로 확대하지 않는다. 과거 구현 미시작·reply/fan-out·라이브러리 미결 문구는 당시 기록이다. 기존 일반 로그에서 작업하며 package/task 파일과 미래 scaffold를 선생성하지 않는다.
- 현재 설계 진입점 docs/aiox-tui-product.md. 읽을 계약: docs/specs/aiox-runtime.md, docs/specs/aiox-collaboration.md, docs/specs/aiox-host.md, docs/specs/aiox-configuration-web.md. 구조: docs/architecture/aiox-system.md, docs/architecture/aiox-storage-terminal.md. Vendor 연결 경계가 필요할 때 docs/architecture/aiox-vendor-bindings.md를 읽는다. 선행 결과는 logs/2026-09-07-AIOX-TUI-Stage1-Foundation.md에서 확인한다.
- W2 후속 리뷰 보완 완료: standalone 종료 endpoint route 정리·삭제된 Network·저장 실패 재시도 회귀와 pnpm check 162 tests 및 built Node 실제 PTY/HTTP/DB 재개방 검증을 통과했다. 최소 Web은 plain TypeScript/Vite/xterm 검증 페이지로 구현했고 Stage 6 운영 Web 방향과 구분한다. 최신 W2 후속 entry의 인계·검증 한계를 따른다.

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

### 2026-09-08 16:34 · Stage 1 완료 인계와 현재 재개 기준

Stage 1 완료에 따라 Stage 2 W1을 다음 재개 지점으로 활성화했다. 이번에는 포인터만 옮겼으며 Stage 2 구현·설치는 시작하지 않았다. 위 2026-09-07 대기 인계의 dependencies 없음/현재 Stage1/설정 형식 미결이라는 설명은 당시 기록이며 아래 결과로 대체한다.

현재 기반: TypeScript5.9.3, tsup8.5.1, Vitest4.1.6, oxlint1.81.0, oxfmt0.66.0, pnpm10.33.0, Node>=22.12.0. 공통 tsup/vitest 설정은 workspace cwd 기준이고 pnpm check는 build 후 typecheck한다. 테스트는 production 옆 .test.ts다. domain/config/persistence/cli가 구현돼 있으며 CLI 실제 실행부는 doctor만 있고 나머지는 unavailable이다.

config는 Node JSON 처리, 전역 .aiox/config.json, daemon4500/Web4501, CLI override→파일→기본값이다. persistence는 better-sqlite3 12.11.1로 경로를 호출자가 주입한다. watcher/listener·CLI port옵션·DB 홈 기본경로는 아직 통합 전이다. 최초 CLI override의 현재 포트와 파일 설정의 다음 실행 포트 표시 의미를 Stage2에서 명확히 한다.

선행 CI https://github.com/lunaxislu/aiox-prototype/actions/runs/34189231508 (2db827f)는 Windows/Linux/macOS × Node22/24 여섯 조합 성공이다. foundation 검증이며 PTY/vendor/WSL/npm 전역 배포 완료는 아니다.

첫 행동은 Stage1 공개 entry와 Required Context를 읽고 CLI→daemon lifecycle→credential/Network/MCP→PTY/최소 Web의 첫 통합 시나리오를 구체화하는 것이다. 이미 확정한 형식·드라이버를 다시 전수 조사하거나 package/task 로그를 선생성하지 않는다.

### 2026-09-08 16:41 · Stage 1 종료 리뷰 보완과 Git 변경 커밋

사용자 요청으로 서브에이전트의 Stage 1 읽기 리뷰 결과를 반영했다. 리뷰는 CI 34189231508의 커밋 2db827f 및 3 OS × Node22/24 여섯 job 성공과 code/tests를 대조했고 종료를 막는 구현 결함은 발견하지 못했다. root도 남은 문서 불일치를 직접 확인했다. storage-terminal의 JSON 미결 표현과 system의 포트 제안 표현을 configuration-web owner로 연결하고 README를 Stage 2 진입 상태로 정정했다. Stage 1 완료와 현재 Stage 2 W1은 유지하며 제품 구현은 변경하지 않았다.

사용자는 반영 후 Git 변경 커밋을 요청했다. 기존 baseline 보완 및 logs/artifact의 제품 문맥·외부 CLI 조사 프롬프트는 내용을 보존해 별도 커밋하고, Stage 1 종료·owner 보완·Stage 2 인계는 함께 커밋한다. 이번 문서 수정의 Markdown inline-code 검사와 git diff --check는 통과했다. 제품 테스트는 재실행하지 않았으며 이전 CI 근거와 이번 문서 검사를 구분한다.

### 2026-09-08 22:03 · MCP·상태·Host CLI·보존·TypeORM 결정과 owner 갱신

사용자가 지정한 제품 문맥 프롬프트와 baseline 로그의 관련 본문을 직접 수정하고, 연결된 docs 계약·architecture·진입 문서·roadmap을 갱신했다. 아래는 후속 채택 사항이며 위 대기 인계의 reply/replyExpected·자동 fan-out·서버 라이브러리 미결 내용을 대체한다. Stage 2 구현·설치는 시작하지 않았고 W1은 active로 유지한다.

#### 채택한 계약

- MCP는 agents_list와 send로 분리한다. agents_list는 outbound route로 보낼 수 있는 현재 실행을 agentId/name/role/description/status 배열로 반환한다. name 미지정은 agentId, role/description 미지정은 목록 null·수신 표시 생략이다. 실제 전송은 send({targets: agentId[], content: string})로 한 명 또는 여러 명을 선택한다. source는 credential에서 도출하며 대상별 현재 실행·membership·route 검증과 결과 반환을 유지한다. reply, replyExpected, legacy type/intent 필수 입력, 동일 메시지 재전송은 제외한다.
- 수신 정보는 인증된 발신자 name·role·description, daemon 접수 createdAt, content다. deliveryId를 모델의 회신 인자로 요구하지 않지만 내부 메시지·대상·vendor 입력 연결은 유지한다. Codex는 toolOutput 본문+additionalContext 메타데이터, Claude는 native inbox peer message를 사용한다. Codex 채택 조합은 사용자 실험 통과와 신규 통합 완료를 구분하고 E2E 실패 때만 후순위 방식을 검토한다.
- 단방향 수신에는 원문 뒤 줄바꿈 두 번과 다음 문구를 붙인다. 원문과 생성한 안내는 구분한다.

```text
[AIOX Notice] No outbound route to the sender is available. Carry out the request. AIOX will automatically notify the sender when processing completes or fails. Do not attempt to send a reply or acknowledgment.
```

- MCP 현재 상태는 idle/working/failed다. reasoning·도구·사용자 질문·승인 대기는 working으로 요약한다. starting은 실행·연결 준비 의미이며 send 성공이나 MCP enum이 아니다. Host stopped는 Host/Web에서 표시하고 전송 목록에서 제외한다. Web은 진행 상세·사용자 입력/승인 대기·실패 원인 등을 세분화하고 요청이 실제 해결될 때까지 표시한다.
- 요청 결과 completed/failed/interrupted와 현재 Agent 상태는 별개다. B가 X를 끝내고 Y를 처리하면 X completed·B working이 동시에 성립한다. completed는 해당 입력의 응답 처리 종료이지 작업 정확성 보장이 아니다. Claude는 Runtime/session_id/prompt_id, Codex는 Runtime/threadId/turnId에 연결된 종료·결과를 관측한다. busy 입력마다 새 turn이 생긴다고 가정하지 않으며 임의 Stop 하나로 모든 입력을 완료하지 않는다.
- 전송 시점 역방향 route 관계를 대상별로 보존한다. 단방향 completed/failed와 양방향 failed는 daemon이 원 발신 Agent에게 자동 알린다. 양방향 completed와 양쪽 interrupted는 자동 알림이 없다. 세션 만료·인증/API 오류 등 실제 요청 실패를 포함하되 일반 도구 오류를 무조건 실패로 승격하지 않는다. A가 B/C에게 보냈고 C만 실패하면 A에게만 알린다. daemon 알림은 reverse Agent route나 vendor system role을 부여하지 않고, 알림 처리로 다시 완료 알림을 만들지 않는다. Web 외에 원 발신자의 Codex/Claude 입력 경로에도 전달한다.
- Host Agent는 YAML 구성으로 유지한다. add/remove와 Declared/Ephemeral 구분은 제외한다. CLI는 다음과 같으며 두 로그와 runtime spec의 전체 CLI 트리도 교체했다.

```text
aiox host agent start <host> <agent-names...>
aiox host agent stop <host> <agent-names...>
```

- Host 내 이름 여러 개를 받으며 stop은 실행 자원을 정리하고 항목을 stopped로 남긴다. start는 기존 항목을 새 Runtime/credential로 시작하고 route를 새 ID에 연결한다. 이전 vendor 대화를 자동 resume하지 않는다. 이미 실행 중인 항목을 중복 시작하지 않고 이름별 결과를 보고한다. Standalone 종료는 실행 등록·membership·관련 활성 route를 정리한다. Host 전체 종료는 Host/전용 Network/runtime override를 지우고 다음 실행은 YAML로 새로 build한다. YAML·Worktree·작업 파일은 유지하며 host network route는 YAML을 수정하지 않는다.
- Persistent Network/route는 DB에 지속한다. Host 정의는 YAML, live Host/전용 Network/override는 실행 수명이다. 이력 저장이 실행 복원 근거는 아니다.
- AIOX send 원문·daemon 알림 본문·발신자·대상·시각·대상별 결과·상관관계를 저장한다. vendor 전체 대화/reasoning/터미널 출력은 이 메시지 저장 범위 밖이다. 요청 처리 종료 후 기본 30일, 진행 중 요청 제외, 관련 본문·결과·알림을 함께 정리한다. 전역 보존 일수를 설정하고 daemon 시작 및 하루 한 번 정리한다. Host 종료로 즉시 이력을 지우지 않으며 자동 재전송·실행 복원에 쓰지 않는다.
- 서버는 node:http, ws, 공식 MCP TypeScript SDK, Zod, node-pty, TypeORM, better-sqlite3를 채택한다. Stage 1 직접 SQL에서 TypeORM으로 전환할 때 기존 DB·명시적 migration·transaction을 보존하고 자동 synchronize나 이중 migration 권위를 만들지 않는다. 아직 설치되지 않은 채택 사항이며 버전은 Node>=22.12.0·SDK/OS 호환성을 확인해 설치 단계에 정한다. 별도 HTTP framework/event bus는 추가하지 않는다.

#### Owner 반영과 남은 확인

도구·수신·자동 알림은 docs/specs/aiox-collaboration.md, 현재 상태·CLI는 aiox-runtime.md, Host/YAML/Network 수명은 aiox-host.md, 보존·상세 Web 표시는 aiox-configuration-web.md에 반영했다. 구조 문서 3개와 docs/aiox-tui-product.md·product/roadmap.md의 오래된 미결 문구도 정리했다. logs/artifact/AIOX-TUI-Product-Context-Prompt.md와 baseline은 새 항목만 덧붙이지 않고 해당 절·CLI·미결 목록을 갱신했다. 과거 vendor 실험의 HTTP MCP reply 기록은 당시 관측 근거로 보존했다.

W1의 다음 행동은 Stage 1 공개 entry와 위 owner를 읽고 CLI→daemon→credential/route→MCP→PTY/최소 Web 첫 통합을 구체화하는 것이다. Stage 2에서는 대상별 결과·알림 정책·보존/migration을 vendor 대역으로 검증하고, 실제 Claude/Codex prompt/turn·busy 입력 연결은 Stage 3–4에서 확인한다. Host 실행은 Stage 5, 상세 운영 Web·알림 UX는 Stage 6–7에 연결한다. 채택 사항을 다시 미결로 올리거나 후속 전체 기능을 Stage 2 완료 조건으로 당기지 않는다.

검증: 변경 docs 9개의 Markdown inline-code 검사를 통과했다. 제품 코드·의존성은 변경하지 않았으므로 제품 테스트·vendor 실험은 실행하지 않았다. 변경 문서 링크·코드 블록과 세 문서의 Host CLI 트리 일치, log check·onramp·git diff --check도 통과했다. YAML args 계약·예시를 Host owner에 정합화했다.

## 2026-09-09 · W2 리뷰 합의와 결함 수정

### 요청·현재 상태

사용자가 Git 변경의 Stage 2 리뷰 결과 1–8을 항목별로 확인하고 수정 범위를 합의했다. 처음에는 로그 기록을 금지했으나 이번 요청으로 Stage 2 로그 기록과 subagent 구현을 명시적으로 지시했다. 현재 Git에는 CLI·daemon·공통 MCP·TypeORM·PTY·최소 Web 구현과 채택 의존성이 존재한다. 위 과거 entry의 'Stage 2 구현·설치 미시작'은 현재 상태가 아니다. Stage 2 완료는 아직 선언하지 않는다.

리뷰 때 root의 pnpm check(lint·format·build·typecheck·130 tests)와 git diff --check는 통과했다. 그럼에도 아래 실패 경계를 별도 임시 재현·호출 경로 확인으로 발견했다. 실제 vendor·브라우저·다른 OS 통합 성공으로 확대하지 않는다.

### 합의한 리뷰 결과와 사용자 시나리오

1. 수정: 동일 SQLite 연결의 병렬 transaction이 충돌한다. 서로 다른 Network 두 개의 수정이 모두 실패 응답인데 한쪽 변경은 저장되는 것을 root가 재현했다. 모든 DB 접근의 직렬화와 route 읽기→계산→저장 경계를 보호한다. 내부 route 전체 교체 과정과 CLI --reset-from/--reset-between의 명시적 edge 제거는 별개다.
2. 수정: retention.ts의 onPurge?.(await purgeExpired(...))는 callback이 없으면 purge 호출도 생략한다. 운영 호출과 같은 조건에서 호출 0회를 root가 재현했다. 실제 삭제와 선택적 보고를 분리하고 시작·하루 주기 및 진행 중 요청 제외·기본 30일을 검증한다.
3. 수정: binding.stop 실패 후 Runtime이 남아도 stopped:true를 반환하고 listener·DB를 닫는다. root가 대역으로 재현했다. 미완료를 보고하고 재정리 경로를 유지한다. 사용자 시나리오 ① 같은 aiox daemon stop --force 재실행으로 남은 실행 정리 ② 남은 TUI에서 /exit 등으로 실제 프로세스 종료→그 TUI의 자원·등록·credential만 정리→daemon·Web 유지→사용자가 별도로 daemon stop 또는 --force 실행. 마지막 TUI 종료도 daemon 자동 종료를 뜻하지 않는다.
4. 수정: 비동기 binding 준비 중 force stop이 임시 등록을 지운 뒤 실제 binding이 늦게 만들어지면 정리를 빠져나간다. root의 지연 대역에서 종료 함수 호출 0회를 재현했다. 신규 등록·실행·전송 차단과 진행 중 등록의 완료/실패 정리를 동기화한다.
5. 제외: PTY 부모 종료 후 일반 하위 작업 생존을 subagent가 shell 대역으로 재현했고 root가 호출 경로를 대조했다. 사용자는 개발 서버·테스트·스크립트 같은 Agent 작업 명령까지 일괄 종료할 필요는 없다고 결정했다. AIOX가 직접 관리하는 TUI·PTY·Relay·App Server는 종료·확인 대상이나, 일반 작업 자식 전체 생존을 종료 실패로 판정하지 않는다. 프로세스 이름 기반 전체 kill이나 process-tree 종료 기능을 추가하지 않는다.
6. 수정: 외부 Origin·text/plain JSON을 넣은 HTTP 종료 요청이 200으로 성공하는 것을 root가 재현했다. 실제 외부 웹페이지에서의 성공은 미검증이며 브라우저 로컬 네트워크 보호가 차단할 수 있다. stop 하나가 아니라 모든 /api/* 조회·제어, /mcp/* 및 WebSocket upgrade 입구를 공통 보호한다. 실제 listener 주소·포트에 맞춘 Host/Origin 검사와 적절한 본문 검증을 적용하며 CLI는 유지한다. MCP token·membership·route 검사를 대체하지 않는다. 사용자 로그인/토큰 입력/허용 목록 수동 설정은 추가하지 않는다. Web 종료 버튼 예시는 agent의 설명 오류였으며 Web 탭 닫기는 attachment 해제만, daemon 종료는 Web 서버·연결 종료이고 탭 자체를 닫지 않는다.
7. 수정: A→B 요청 X 후 A 종료 시 forget(A)가 X의 연결도 지워 B의 완료가 저장되지 않고 outcome:null로 영구 보존된다. subagent가 실제 SQLite와 대역으로 재현하고 root가 경로를 확인했다. 원 발신자의 실행 수명과 수신 요청 결과를 분리한다. A가 종료 후 같은 이름·역할의 A′로 실행돼도 X의 결과만 저장하고 A′에게 알림을 넘기지 않는다. 원 Runtime ID만 대상으로 하며 실행 복원·자동 재전송은 없다.
8. 수정: WebSocket /ws/terminal/%FF의 decodeURIComponent 예외가 upgrade handler 밖으로 전파되는 코드 경로를 확인했다. 기존 리뷰에서 실제 crash는 미재현이었다. 잘못된 연결만 거절하고 daemon·다른 연결을 유지하는 회귀 검증을 추가한다.

### 실행 분담·검증 기준

독립된 결함 묶음의 범위·결과는 이 Stage 2 일반 로그에서 관리한다. 병렬 작업 자체를 이유로 package/task 로그나 미래 scaffold를 만들지 않는다. 모든 작업자는 ponytail full·tdd skill을 읽고 적용하며 기존 코드·표준 기능·설치된 의존성을 우선한다. 새 의존성·추상 계층을 추가하지 않고 실패 테스트→최소 수정→관련 검증 순서를 따른다.

- storage subagent: packages/persistence/src/sqlite/database.ts·database.test.ts, apps/daemon/src/networks.ts·networks.test.ts. DB 직렬화·동시 route 변경·rollback/후속 진행을 소유한다.
- messaging subagent: apps/daemon/src/messaging.ts·messaging.test.ts, retention.ts·retention.test.ts. 2·7의 보존/결과 연결 및 A′ 비전달 검증을 소유한다.
- security subagent: apps/daemon/src/request-guard.ts·request-guard.test.ts만 작성한다. 전체 listener에서 재사용할 Host/Origin/본문 보호의 최소 함수와 단위 검증을 소유하며 daemon.ts는 수정하지 않는다.
- root: daemon.ts·daemon.test.ts, runtimes.ts·runtimes.test.ts, terminals.ts·terminals.test.ts, main.ts·dev-harness.ts, 필요 시 HTTP·CLI 오류 결과 연결을 소유한다. 3·4·8 및 security guard 통합, 실제 PTY exit 후 Runtime 정리·daemon 유지, 전체 diff·통합 테스트와 owner 문서 정합을 직접 검증한다.

기존 사용자 변경·research-idea 파일·architecture.excalidraw를 보존한다. subagent 결과는 candidate이며 root가 실제 diff·호출 경로·테스트로 수용 여부를 판정한다. 이번 결함 수정 완료와 Stage 2 전체 완료·vendor/플랫폼 통합 완료는 구분한다.

### 2026-09-09 01:19 · W2 수정 수용과 통합 검증 완료

합의한 1–4·6–8 수정과 root의 결과 검토·통합 검증을 완료했다. 5의 일반 작업 자식 전체 종료는 추가하지 않았다. 기존 Git 변경을 보존했으며 새 dependency나 별도 framework·queue 계층을 추가하지 않았다.

- 1: DB별 Promise tail로 공개 조회·쓰기·close를 직렬화하고, Network route의 최신 값 읽기→계산→저장을 같은 DB 작업으로 옮겼다. 서로 다른 Network 병렬 transaction 오류와 같은 Network edge 유실을 각각 RED로 확인한 뒤 통과시켰다. 기존 Stage 1 migration·rollback·재개방 테스트를 유지한다.
- 2: 실제 purge를 선택적 callback과 분리했다. 시작·일일 호출 및 stop 후 미호출을 fake timer로 검증했다.
- 3: 미완료 stop은 HTTP 409 stop_incomplete와 남은 자원·경고를 반환하고 listener·DB·실패한 TUI를 유지한다. 같은 force 명령 재시도는 완료된 실행을 반복 종료하지 않는다. 실제 PTY에서 exit 후 해당 Runtime·credential만 정리되고 daemon/Web은 살아 있으며 별도 plain stop으로 종료됨을 검증했다. SIGINT/SIGTERM entry도 stopped:false 결과에서 process.exit(0)를 호출하지 않는다. PTY kill의 rejected Promise 캐시도 비워 다음 사용자 요청이 실제 재시도하도록 했다(동시 호출 공유 유지).
- 4: 진행 중 binding 등록을 기다려 실제 자원을 정리하고, 종료 중 신규 등록·terminal 생성·MCP 전달을 차단한다. 준비 실패 시 해당 terminal 정리, 준비 중 조기 idle 보고는 starting으로 유지하는 경계를 추가했다. 기존 send injection과 결과/알림 저장도 종료 전에 drain한다.
- 6: requestGuard를 두 HTTP listener와 WebSocket upgrade에서 공통 사용한다. Host·Origin·본문 media type 검사로 읽기·쓰기·MCP·terminal 연결을 보호하고 실제 Web origin과 CLI 연결은 유지한다. MCP의 token·membership·route 판정은 기존대로다.
- 7: A 종료가 B의 진행 중 요청 연결을 지우지 않는다. B 결과는 저장하고 같은 이름·역할의 새 Runtime A′에는 전달하지 않는다. 종료된 target의 pending 요청은 interrupted로 정리하며 자동 알림을 만들지 않는다. DB 결과 저장 실패 시 correlation을 유지해 cleanup 재시도가 가능하다.
- 8: 잘못된 WS 경로의 URIError가 handler 밖으로 전파되는 RED를 실제 요청으로 확인했다(Vitest의 uncaught exception 보고). 수정 후 HTTP 400으로 그 연결만 거절하고 기존 연결과 daemon이 유지된다.

Subagent candidate 수용: storage의 DB/route 직렬화·readiness·PTY 재시도, messaging의 보존·A′ 비전달·settlement drain, security의 guard·owner 문서를 root가 실제 변경 내용과 producer/consumer 경로로 확인했다. root는 daemon 종료/등록/PTY 감지/HTTP·WS 입구를 직접 통합하고 추가 회귀 테스트를 작성했다. code가 target을 바꾸지 않도록 runtime/collaboration/system owner에 사용자가 합의한 정책만 반영했으며 Stage 2 완료 상태로 올리지 않았다.

최종 검증: pnpm check 전체 통과(lint·format·build·typecheck·158 tests: domain28/config9/protocol5/terminal13/cli18/persistence14/daemon71). 중간 병렬 작업 중 terminal test double 타입 오류가 한 번 있었고 담당자가 보완한 뒤 전체 검사를 다시 통과했다. 빌드된 dist를 Node v24.14.0/macOS에서 직접 import한 임시 smoke도 통과했다: 외부 요청403→force stop 미완료409·PTY 유지→shell exit·Runtime/credential 정리→daemon 상태200→명시적 stop200·종료. 기존 daemon 테스트의 실제 HTTP MCP/WS·PTY I/O·resize·detach 후 생존도 통과했다. 이는 vendor 대역/Node WS 검증이며 실제 Claude/Codex·브라우저 UI·Windows/Linux 통합 성공을 의미하지 않는다.

문서 검증: runtime/collaboration/system Markdown inline-code 검사 및 git diff --check 통과. 로그 check/onramp로 W2 완료와 W1 재개를 맞춘다. W1은 현재 Git 구현을 기준으로 Stage 2 전체 완료에 남은 실제 브라우저·플랫폼별 설치/PTY 검증과 인계를 확인하는 범위로 정정한다. 이번 리뷰 결함 수정만으로 Stage 2 전체나 후속 vendor 단계를 완료하지 않는다. 커밋은 하지 않았다.

### 2026-09-09 02:13 · W2 후속 route 정리와 최소 Web 인계 보완 완료

사용자가 후속 리뷰의 Runtime route 정리 누락과 최소 Web 인계 부족을 확인한 뒤 subagent 반영·ponytail 적용·완료 로그 기록을 요청했다. 기존 W2 결함 수정의 후속 보완으로 처리했으며 별도 package/task scaffold는 만들지 않았다.

Runtime route: docs/specs/aiox-host.md의 standalone endpoint 정리 계약을 apps/daemon/src/daemon.ts의 공통 stopRuntime에 연결했다. apps/daemon/src/networks.ts는 기존 DB replaceRouting callback으로 해당 Runtime이 from 또는 to인 edge만 제거한다. Persistent Network 정의·default policy·다른 endpoint의 edge와 동시 route 변경은 보존한다. 이미 삭제된 Network는 정리 완료로 처리하며, 실제 DB 갱신 실패는 기존 stop_incomplete·재시도 흐름으로 전달한다. Host 실행 수명은 Stage 5 범위로 유지하고 메시지 이력·전송 시점 관계는 변경하지 않았다.

사용자 시나리오: A→B, C→A, B→C에서 A의 일반/강제 종료 또는 실제 PTY exit 후 앞의 두 edge만 사라진다. B→C와 Network는 남고 daemon은 자동 종료되지 않는다. route 저장 실패 때 force stop은 미완료를 반환하며 같은 명령으로 재시도할 수 있다. Network를 먼저 삭제해도 Runtime 종료가 막히지 않는다.

최소 Web 인계: 이 로그의 과거 “최소 React Web”과 “Stage 2 React/Vite”는 당시 계획이다. 실제 apps/web/src/main.ts·attach.ts·package.json은 plain TypeScript + Vite + xterm/addon-fit 검증 페이지이며 React 의존성이 없다. HTTP 상태 조회와 WebSocket PTY 입출력·resize·attachment 수명 확인에 범위를 한정하기 위해 기존 DOM·브라우저 API와 단순 polling을 사용했다. Stage 6 React 운영 Web 방향을 폐기한 결정이 아니며, 운영 Web의 배치·설정·다국어 및 상세 UX 완료로 해석하지 않는다. 후속 구현은 docs/aiox-tui-product.md와 docs/specs/aiox-configuration-web.md의 운영 Web 계약을 따른다. 이번에는 Web 코드를 바꾸거나 React를 추가하지 않고 선택 경위와 단계 차이를 기록했다.

위임·수용: storage subagent에게 ponytail full·TDD를 적용하고 daemon.ts·daemon.test.ts·terminals.test.ts·networks.ts·networks.test.ts 다섯 파일만 수정하도록 맡겼다. 담당자는 force=false/true 종료 시 A의 양방향 edge가 남는 assertion RED를 확인한 뒤 수정했고 관련 37 tests 통과를 보고했다. root는 실제 수정 본문·공통 종료/HTTP/DB/messaging 호출 경로와 테스트를 직접 대조한 뒤 수용했다. 기존 사용자 변경과 architecture.excalidraw를 보존했고 커밋하지 않았다.

root 최종 검증: pnpm check 통과(lint·format·build·typecheck·162 tests: domain28/config9/protocol5/terminal13/cli18/persistence14/daemon75). 별도 임시 Node smoke가 빌드된 dist로 실제 /bin/sh PTY exit→A 등록·credential 정리→HTTP 조회에서 A edge 제거/B→C 보존·B/C 실행 유지→명시적 force stop→DB 재개방에서 Network 보존과 route 정리를 확인했다. 새 의존성·migration은 없다. vendor binding은 테스트 대역이며 실제 브라우저 UI·Claude/Codex·다른 OS 검증은 이번에 실행하지 않았다. Stage 2 전체 완료 표시와 W1 재개 범위는 유지한다.

### 2026-09-09 02:23 · 커밋 전 owner 정합화와 CI 검증 준비

사용자가 작업 파일 커밋 전에 관련 owner 갱신, 이후 push·CI 확인과 성공 결과의 추가 커밋을 지시했다. system architecture에는 현재 daemon 조립·공통 Runtime 정리와 미구현 vendor/Host 경계를, storage-terminal에는 TypeORM 인계·DB 직렬화·홈 DB 연결·최소 Web 선택 이유와 64 KiB raw tail의 화면 복원 한계를 반영했다. configuration-web과 제품 진입점의 stale한 미구현 설명을 정합화했다. 현재 동작은 code/test evidence로 연결했고 운영 Web·실제 vendor 목표는 유지했다.

제품 코드는 직전 pnpm check 162 tests 및 built PTY/HTTP/DB smoke 이후 변경하지 않았다. 이번에는 owner 링크·evidence 범위·Markdown inline-code와 git diff --check를 점검한다. Stage 2 전체 완료·로그 종료는 선언하지 않는다. 기존 별도 CLI 조사 prompt 변경과 research-idea 파일은 커밋에서 제외하며 architecture.excalidraw는 건드리지 않는다. 원격 main보다 앞선 기존 문서 커밋 2개도 이번 일반 push에 포함된다. CI 결과는 실행 후 별도 entry에 기록한다.

### 2026-09-09 02:31 · Windows CI 실패 재현과 PTY 경계 수정

3b466df를 origin/main에 push했다. GitHub Actions 34256887662는 Linux/macOS × Node22/24 네 작업이 성공했으나 Windows 두 작업은 daemon PTY 테스트에서 실패했다. Windows Node24 job 102164841645 로그에서 터미널 escape 출력이 text WS 프레임으로 전송되어 JSON parse 예외를 만든 것을 직접 확인했다. 설치된 node-pty의 Windows 출력 socket은 UTF-8 문자열을 사용하지만 AIOX는 encoding:null이면 항상 Buffer라고 가정했다.

root가 ponytail·TDD로 string/Buffer 출력을 live viewer와 replay에서 바이트로 보존하는 테스트를 추가했다. string 케이스의 Uint8Array assertion RED 후 PTY 공통 경계에서 문자열만 UTF-8 Buffer로 바꿔 GREEN을 확인했다. POSIX의 비 UTF-8 원본 바이트는 유지한다. terminal_web_review subagent는 terminals.test.ts만 맡아 stty 대신 실제 Node TTY 크기를 관측하고, shell 명령 echo가 아닌 출력 줄 검증 및 force 종료 후 제한 시간 내 ESRCH 확인으로 바꿨다. root는 diff와 호출 경로를 직접 대조했다. Windows 테스트 전체 skip이나 오류 무시는 추가하지 않았다.

root pnpm check 통과: lint·format·build·typecheck·164 tests(domain28/config9/protocol5/terminal15/cli18/persistence14/daemon75). 최초 로컬 재검사의 새 테스트 포맷 오류는 oxfmt로 수정 후 전체 재검사를 통과했다. storage-terminal owner에 Windows 문자열 정규화 경계를 반영했다. Windows native 성공은 후속 CI 결과로 확인하며 이 로컬 성공을 대신 사용하지 않는다.
