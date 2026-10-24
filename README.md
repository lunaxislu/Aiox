# AIOX (prototype)

Claude Code와 Codex의 실제 TUI를 그대로 실행하면서, 두 agent가 서로 메시지를 주고받을 수 있게
연결·관리하는 로컬 multi-agent 작업 공간 프로토타입입니다. 실행마다 협업용 MCP 설정·instruction·
credential을 자동으로 주입하므로 vendor별 MCP를 미리 수동 등록하지 않아도 되고, YAML 하나로 여러
agent의 실행·역할 지침·통신 경로를 선언할 수 있습니다.

Claude와 Codex를 번갈아 쓰며 한쪽 의견을 다른 쪽에 복사·붙여넣기하던 번거로움을 없애려고
시작했습니다.

AIOX가 하지 않는 일: 작업을 스스로 분해하거나 결과 품질을 판단하는 엔진이 아닙니다. 모델 선택·
슬래시 명령·승인 같은 대화 기능은 vendor TUI가 담당하고, AIOX는 실행·통신·터미널 화면·설정을
담당합니다.

> 이 저장소는 npm에 배포되지 않은 개발 중인 프로토타입입니다. 이 경험을 바탕으로 한 배포용 후속
> 프로젝트는 별도로 진행합니다.

## 현재 상태

| 구분    | 내용                                                                                                                                     |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 개발 중 | 운영 Web(React): 터미널 탭·분할·키 바인딩·clipboard·IME의 실제 브라우저 통합 검증, header 알림 목록·읽음 처리의 통합 검증, Web 설정 화면 |
| 미구현  | Web에서 agent·Host를 시작하는 Network/Host 페이지, 알림 상세 페이지, Web을 여는 전용 CLI 명령, 패키지 배포                               |

## 필요 조건 환경

지원 실행 환경은 macOS와 Linux입니다.

| 도구            | 버전                                                 |
| --------------- | ---------------------------------------------------- |
| Node.js         | `^22.16.0` 또는 `>=24.11.0`                          |
| pnpm            | `10.33.0`                                            |
| Claude Code CLI | `2.1.224` 이상                                       |
| Codex CLI       | `--remote`·`--remote-auth-token-env`를 지원하는 버전 |

## 설치

```sh
git clone https://github.com/lunaxislu/aiox-prototype.git
cd aiox-prototype
pnpm install
pnpm build                       # cli·daemon·web·packages의 dist 생성

cd apps/cli
pnpm link --global               # 전역 aiox → 이 저장소의 apps/cli
cd ../..

aiox doctor                      # 로컬 환경 진단
```

## 빠른 시작: 두 agent 연결하기

```sh
aiox daemon start
aiox network create demo

# 터미널 A
aiox agent run claude --network demo --name reviewer

# 터미널 B
aiox agent run codex --network demo --name implementer
```

```sh
aiox agent list --network demo   # 참여 agent와 상태
aiox status                      # daemon·실행 요약
```

- daemon: http://127.0.0.1:4500
- Web: http://127.0.0.1:4501

## Host: YAML로 여러 agent 실행

저장소 루트 [`aiox.yaml`](aiox.yaml)의 축약 예시:

```yaml
host:
    name: aiox-core-team
    instruction: |
        이 Host의 Agent들은 각자의 역할에 따라 협업하여 소프트웨어를 개발합니다.

agents:
    researcher:
        adapter: claude
        role: research
        description: "코드베이스 조사 및 기술 분석 담당 에이전트"
        instruction: |
            코드베이스 구조, 기술 문서, 라이브러리를 조사하고 그 결과를 reviewer와 implementer에게 전달합니다.
    implementer:
        adapter: codex
        role: implementation
        instruction: |
            요구사항과 설계에 맞추어 실제 코드를 구현하고 테스트를 작성합니다.
    reviewer:
        adapter: claude
        role: review
        instruction: |
            implementer가 작성한 코드를 검토하고 피드백을 전달합니다.

networks:
    team-network:
        agents: [researcher, implementer, reviewer]
        routing:
            default: allow
```

```sh
aiox host run                    # 현재 디렉터리의 aiox.yaml 또는 aiox.*.yaml (후보가 하나일 때)
aiox host run --file aiox.dev.yaml   # 다른 YAML을 지정하는 경우의 예
aiox host status
aiox host agent restart reviewer
aiox host stop                   # YAML agent 실행만 종료, 패널·Network·route 정책 유지
aiox host delete                 # 실행·패널·Host Network까지 정리
```

`routing`은 `default: allow|deny`와 `allow`/`deny` 목록(`from`/`to` 또는 `between`)으로 방향별 전송
권한을 정합니다. 전체 필드는 [Host 명세](docs/specs/aiox-host.md)를 참고하세요.

## 명령 요약

| 명령                                                                                                            | 설명                                    |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `aiox daemon start [--port] [--web-port]` / `stop [--force]` / `restart` / `status`                             | daemon 수명 관리                        |
| `aiox network create\|delete\|list\|show`                                                                       | 영속 Network 관리                       |
| `aiox network block\|unblock\|reset <network> --between A B` (또는 `--from A --to B`)                           | Network 안의 전송 방향 차단·해제·초기화 |
| `aiox agent run <claude\|codex> [--network] [--name] [--role] [--description] [--instruction] [-- vendor 인자]` | vendor TUI를 현재 터미널에서 실행       |
| `aiox agent list` / `agent show <agent>`                                                                        | 실행 중인 agent 조회                    |
| `aiox host run\|status\|stop\|delete\|restart\|list`                                                            | YAML Host 실행·관리                     |
| `aiox host agent start\|stop\|restart <names...>`                                                               | Host 안의 개별 agent 관리               |
| `aiox status` / `aiox doctor`                                                                                   | 전체 상태·환경 진단                     |

agent가 사용하는 MCP tool은 CLI 명령과 별개입니다.

| MCP tool                                          | 설명                                                                                                                                                                                |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agents_list()`                                   | outbound route로 발견 가능한 상대를 이름·역할·상태와 함께 반환 (준비 중인 agent도 보이지만 아직 수신할 수 없음)                                                                     |
| `send({ targets: ["reviewer"], content: "..." })` | 대상별로 메시지를 전달하고 `messageId`와 대상별 `accepted`/`error`를 반환. 전달 접수 결과일 뿐 처리 완료·회신 보장은 아니며, 회신도 상대 쪽의 outbound route가 필요한 `send`로 보냄 |

- 전체 CLI 계약은 [Runtime 명세](docs/specs/aiox-runtime.md)
- MCP 계약은 [Collaboration 명세](docs/specs/aiox-collaboration.md)

## 구조

```text
사용자
├─ 외부 터미널: aiox CLI → vendor TUI (CLI가 실행 수명 소유)
└─ 운영 Web (React, xterm)
         │ HTTP / WebSocket
         ▼
AIOX daemon (127.0.0.1)
├─ Controller / PTY      daemon 소유 실행·종료, 외부 실행의 협업 등록
├─ Gateway / HTTP MCP    agent별 credential, agents_list·send
├─ Network / Message     신원·route·전달·회신 관측
├─ 설정 / SQLite         ~/.aiox/config.json, 저장 상태
└─ Vendor bindings
   ├─ Claude Code TUI    native inbox / hooks
   └─ Codex TUI          App Server / Binding Relay
```

| 경로                                                   | 책임                                                      |
| ------------------------------------------------------ | --------------------------------------------------------- |
| `apps/cli`                                             | `aiox` 명령, daemon 시작, 외부 터미널 agent 실행          |
| `apps/daemon`                                          | HTTP·WebSocket 서버, MCP, Network·message, PTY, Host 실행 |
| `apps/web`                                             | 운영 Web (React·Vite·Tailwind·shadcn, xterm 터미널)       |
| `packages/protocol`, `domain`, `config`, `persistence` | 공통 계약·도메인 모델·설정·SQLite 저장                    |
| `packages/terminal`                                    | headless xterm 화면 직렬화·복원                           |
| `packages/vendor`, `adapters/claude`, `adapters/codex` | vendor 실행 주입과 vendor별 연결                          |
| `packages/IDE/vscode`                                  | `aiox.yaml` 자동완성·검증 확장                            |

설계 진입점은 [설계 아티팩트](docs/aiox-tui-product.md)이며, 내부 구조는
[System architecture](docs/architecture/aiox-system.md)를 참고하세요.

## 설계 사례

### 1. Claude 상태 관측이 실제 작업을 지연시키지 않도록 분리

AIOX는 Claude가 작업 중인지, 응답을 끝냈는지 알아야 협업 요청의 결과를 추적할 수 있습니다.
처음에는 hook 12종으로 이를 확인했지만, 일부 hook은 AIOX의 처리가 끝날 때까지 Claude를
기다리게 했습니다. 지연을 넣은 시험에서 모델 호출이 늦어지고, 제한 시간을 넘기면 해당 요청의
추적이 누락되는 것을 확인했습니다.

필수 hook 3종만 남기고, 현재 상태는 session registry에서, 입력과 결과는 대화 기록 파일에서
직접 관측하도록 바꿨습니다. 입력·도구 실행 경로에서 관측용 hook을 기다리는 의존을 제거했습니다.

근거: [`launch-hooks.ts`](packages/adapters/claude/src/launch-hooks.ts),
[`claude.ts`](packages/adapters/claude/src/claude.ts),
[`claude-observations.test.ts`](packages/adapters/claude/src/claude-observations.test.ts) ·
[관측 구조와 검증 범위](docs/architecture/aiox-vendor-bindings.md)

### 2. 연결이 끊겨도 명령을 중복 실행하거나 최신 화면을 덮어쓰지 않도록 처리

Web에서 명령을 보낸 뒤 응답 전에 연결이 끊기면, 브라우저는 서버가 처리했는지 알 수 없습니다.
무조건 다시 보내면 같은 작업이 중복 실행될 수 있고, 늦게 도착한 응답이 최신 화면을 이전 상태로
되돌릴 수도 있습니다.

요청 식별자와 세션별 순번으로 진행 중인 동일 요청은 기존 작업에 합류시키고, 이미 확정된 요청은
재실행하지 않도록 했습니다. 브라우저는 서버 확정 상태와 아직 확정되지 않은 사용자 조작을
분리합니다. 실제 RPC·SQLite를 연결한 테스트에서 연결 단절, 다중 창 변경, 응답과 상태 방송의
도착 순서를 검증했습니다. 결과가 불확실한 명령은 자동으로 재실행하지 않습니다.

근거: [`sequencer.ts`](apps/daemon/src/sequencer.ts),
[`application-connection.test.ts`](apps/web/src/shared/api/application-connection.test.ts),
[`application-store.test.ts`](apps/web/src/shared/api/application-store.test.ts) ·
[앱 통신 계약](docs/specs/aiox-application-rpc.md)

### 3. 브라우저를 다시 열었을 때 터미널 화면이 깨지던 문제 해결

처음에는 최근 출력 64 KiB를 다시 재생해 화면을 복원했습니다. 하지만 앞서 그려진 화면과
터미널 모드가 빠지거나 제어 문자가 중간에서 잘려, 빈 화면과 깨진 글자가 남았습니다.

daemon이 headless xterm으로 현재 화면 상태를 유지하도록 바꿨습니다. 브라우저는 화면 크기와
snapshot을 먼저 복원하고 이후 출력을 이어 붙인 뒤 입력을 허용합니다. 실제 PTY·WebSocket
시험에서 복원한 화면과 커서·표시 상태가 원본과 일치하는지 확인했습니다.

근거: [`serialization.ts`](packages/terminal/src/serialization.ts),
[`restore.ts`](packages/terminal/src/restore.ts), [`attach.test.ts`](apps/web/src/attach.test.ts) ·
[터미널 복원 구조](docs/architecture/aiox-storage-terminal.md)

## 프로젝트 변화

### 1. 답변을 복사하는 대신 서로에게 직접 질문하도록 시작

Claude와 Codex 사이에서 의견을 복사·붙여넣기하는 번거로움을 줄이려고,
`ask_claude`·`ask_codex` 도구로 상대에게 직접 질문하는 방식부터 만들었습니다.
다만 응답을 기다리는 상태가 메모리에만 있어, 프로세스가 재시작되면 요청과 회신의 연결을 잃는
한계가 있었습니다.

### 2. 중앙에서 연결했지만, 메시지를 받는 화면에는 불편이 남음

상주 daemon을 두고 agent의 연결과 메시지 전달을 관리하도록 확장했습니다. 그러나 Codex에서는
상대 메시지의 원본 JSON 전체가 사용자가 직접 입력한 것처럼 표시돼, 본문을 읽기 어렵고
발신자도 잘못 보였습니다. Claude에서는 메시지를 받기 위해 개발용 Channel 옵션을 켜고
경고 화면을 거쳐야 했습니다.

### 3. 터미널별 자동화에서 공통 Web 작업 공간으로

처음에는 기존 터미널·IDE에 여러 agent를 자동으로 띄우려 했습니다. 창·분할 화면·내장 터미널
방식으로 나눠 대응했지만, 제품마다 제어 API와 권한, 확장 지원이 달랐습니다. 이를 각각 구현하는
대신 Host의 실행·배치를 Web 터미널로 옮겨, 여러 agent의 작업과 상태를 같은 화면에서 관리하도록
바꿨습니다.

메시지를 받는 화면도 개선했습니다. Codex는 사용자 입력처럼 보이던 원본 JSON 대신 본문을
tool output으로 전달해 TUI의 협업 메시지 표시 형식을 활용했고, Claude는 native inbox로 전환해
개발용 Channel 설정과 경고 부담을 없앴습니다. 협업에 필요한 설정과 인증 정보도 AIOX가 실행할 때
자동으로 준비합니다.

## 개발

브라우저 테스트에 필요한 Chromium을 먼저 설치합니다. Linux에서는 시스템 의존성도 함께 설치합니다.

```sh
pnpm --filter @aiox/web exec playwright install chromium
# Linux: pnpm --filter @aiox/web exec playwright install --with-deps chromium
pnpm check      # oxlint → oxfmt 검사 → tsup 빌드 → tsc 타입 검사 → Vitest
pnpm format     # 앱·패키지·개발 설정 포맷
```
