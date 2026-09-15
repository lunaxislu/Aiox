---
topic: AIOX TUI Product Rebuild Baseline
description: Claude inbox와 Codex App Server 기반 TUI 제품 재구축의 대화 결정 실측 근거 실행 주입 방식 저장 설정 Web 알림 복귀와 미결 계약을 보존한다
status: decided
---

# AIOX TUI Product Rebuild Baseline

## Work Items

- [x] W1 대화 전체의 결정 변경 검증 결과 구체 실행 예시와 새 plan을 기록하고 포인터 정합성을 확인한다
- [x] W2 Controller PTY 프로세스 배치와 종료 계약부터 확정하고 Runtime 상태 Message 알림·상태 단일 Network 계약 및 나머지 미결 사항을 정한다
- [x] W3 확정 결과를 spec architecture decision owner에 반영하고 이전 계약과 충돌을 정리한다
- [x] W4 Stage 0 완료 근거를 정리하고 새 plan의 다음 구현 단계에 인계한다

## Required Context

### Return Target

- None: independent log.

### {Global}

- 사용자가 2026-09-07 새 plan과 단일 상세 로그 작성을 요청했다. 본 로그는 Stage 0 요구·근거·계약 재정립 수명이다. 기존 미완성 구현·plan은 설계 제약이 아니며 구현을 자동 재개하지 않는다.
- Headless·Claude SDK 제외. Claude TUI inbox와 hooks, Codex App Server와 TUI, 공통 HTTP MCP가 목표다. 공개 AIOX 사이트는 새 plan의 마지막 단계다.
- 기록의 근거 구분을 유지한다: 사용자 전달 실측, 이전 subagent 조사, 이번 직접 코드 확인, 공식 문서, 사용자 결정, 제안·미확인. 삭제된 테스트 산출물을 현재 존재하는 증거처럼 링크하지 않는다.
- Stage 0 완료. 현재 제품 권위는 docs/aiox-tui-product.md와 연결된 문서다. §25는 당시 owner map과 구현 미결을 보존하며 현재 활성 작업은 plans/aiox-tui-product-rebuild.md와 scripts/onramp로 확인한다. 후속 합의는 관련 본문에 통합했고 과거 실험·작성 entry는 당시 근거로 읽는다. 개인 architecture.excalidraw와 기존 사용자 코드 변경은 보존했다.


## 2026-09-07 · W1 대화 기반 제품 재구축 기준선과 검증 근거

#### 1. 이 기록의 수명과 근거를 읽는 방법

현재 상태 보충: 이후 사용자 승인으로 이전 production/test 및 G2·Web-first 계획/운영 기록을 삭제했다. 아래 R 표기의 코드·패키지 버전과 과거 파일 경로는 조사 당시 근거이며 현재 파일 존재를 뜻하지 않는다. tracked 원본은 Git commit `8db476bad722717bf82cc598904f3f33af8a90b3`에서 확인할 수 있다. 현재 실행 상태와 삭제 결과는 Stage1 로그가 소유한다.

이 entry는 2026-09-07까지 현재 대화에 모인 제품 요구, 판단 변경, 조사·실측 보고와 구체 실행 방식을 증류한 W1 기준선이다. 대화 전체의 반복 문답을 복사하는 대신, 다음 agent가 같은 질문·실험을 반복하거나 폐기한 headless 방향으로 돌아가지 않게 필요한 세부사항을 보존한다. 새 plan은 `plans/aiox-tui-product-rebuild.md`다. 이 로그는 Stage 0의 요구·근거·계약 재정립을 소유하고, 전체 구현 완료를 주장하지 않는다.

근거 표기:

| 표기 | 의미 |
| --- | --- |
| D — 사용자 결정/요구 | 현재 대화의 명시적 지시·정정·수용. 구현 사실과 다름 |
| R — 이번 직접 확인 | 이 대화의 도구로 읽은 현재 파일·명령 출력. 실행 테스트는 별도 명시 |
| U — 사용자 전달 실측 | 사용자가 붙여 준 Claude/다른 agent의 실험 보고. 작성 agent가 원본 산출물을 재실행·독립 감사한 것은 아님 |
| S — 이전 subagent 조사 | 현재 대화에서 전달받은 소스·바이너리·문서 조사 결과. 확인한 빌드 범위 한정 |
| O — 공식 문서 | 아래 URL에서 확인한 공개 기능/설정. 숨겨진 wire까지 공식 계약으로 확대하지 않음 |
| P — 제안/추론 | agent가 제시한 설계 후보. 명시적인 사용자 확정으로 둔갑시키지 않음 |
| Q — 미확인/미결정 | 다음 작업의 좁은 확인 또는 결정 대상. 이미 성공한 경로를 전부 재검증하라는 뜻이 아님 |

앞선 대화에서는 사용자가 로그 기록을 금지했기 때문에 새 실험 원본이 repo에 없을 수 있다. 이번의 “새 plan과 하나의 로그를 만들고 사소한 주입 방식까지 상세 기록” 요청이 기록을 명시적으로 허용했다. 전달받은 임시 실험 파일은 대부분 삭제됐으므로 아래 payload·결과는 대화 보고의 보존이며 현재 존재하는 테스트 artifact처럼 취급하지 않는다. 새로운 테스트·제품 구현·기존 goal 재개는 이번 기록 작업에 포함하지 않는다.

#### 2. 배경, 결정 변경과 현재 제외 범위

- D/U: 사용자는 프론트엔드 경력 약 10개월, 공백 약 9개월의 취업 준비 맥락에서 구현 시간과 제품 완성도를 고민했다. 개인 맥락은 이 작업 로그에만 보존하며 공개 spec/architecture/site에 전파하지 않는다.
- 초기 후보는 Claude·Codex TUI끼리 통신하고 Web에 터미널을 제공한 뒤 다른 vendor로 확장하는 것이었다. 사용자가 이미 조사한 다른 vendor의 API 제약을 다시 전수 조사하지 말라고 했다.
- U: headless 연동 자체는 다른 repo에서 이미 구현·검증했다고 사용자가 밝혔다. “headless가 가능한지 미검증이므로 먼저 검증하자”는 이전 전제는 폐기한다. 이 repo 통합 완료와는 별개다.
- 고민의 중심은 headless에서 quota, model 선택, slash command, 승인·질문, 설정 영속화, 기타 TUI UX까지 재구현해야 하는 비용이었다. TUI 자체 UX를 이용하는 제품으로 범위를 정했다.
- D: 이번에는 headless·Claude Agent SDK·-p 실행을 제외한다. ACP·Vendor NDJSON·다른 vendor adapter를 지금 만들거나 조사하지 않는다. `--surface headless`를 미리 추가하지 않는다.
- D: 기존 미완성 src/apps 구현, 당시 Stage 순서나 임시 구조에 맞추기 위해 새 요구를 왜곡하지 않는다. 필요한 코드는 재사용 가능하지만 재사용 자체가 목표는 아니다. 새 plan 요청은 기존 변경 전량 삭제·reset 지시가 아니다.
- D: 공개 AIOX 사이트는 마지막 단계. 우선 단일 상세 로그만 만들며 미래 단계 로그·task 파일을 선생성하지 않는다.
- P: 취업 지원을 프로젝트 전체 완성에 종속시키지 말고 시연 가능한 범위와 설계 이유로 병행하자는 조언이 있었다. 새로운 제품 완료 조건으로 강제하지 않는다.

#### 3. 목표 구성과 책임

아래는 논리적 책임 지도이며 단일 OS 프로세스 배치도가 아니다. Controller는 실행 판단을, Adapter는 vendor별 실행·연결·종료 방법을, Network는 연결 관계를, daemon은 materialized 상태와 routing 집행을 소유한다.

```text
사용자 접점
├─ React 운영 Web
├─ AIOX CLI / 일반 터미널 — 외부 vendor·필수 부속 실행 소유
└─ 향후 VS Code 등
         │ 명령·상태·터미널 attachment
         ▼
AIOX Local Server / Daemon (Node.js)
├─ Gateway — 사용자 명령, snapshot/event, Web 알림 중계
├─ Runtime Controllers
│  ├─ AgentController — daemon 소유 실행 / 외부 협업 등록
│  └─ HostController — 작업 공간·전용 Network·Agent 실행 묶음 준비·종료
├─ Worktree 관리 — Host --worktree 요청에 따른 Git 작업 공간 준비
├─ Runtime Credential Registry — credential → 실행 신원
├─ 공통 HTTP MCP — send / agents_list
├─ Network / Message Service — 소속·route·전송·응답 연결
├─ Provider Runtime Bindings
│  ├─ Claude TUI: 실행 설정 / Inbox 입력 / Hooks 관측
│  └─ Codex: App Server 입력·관측 / 연결된 TUI
├─ PTY Manager / Terminal Service — 실행 자원·화면 연결·복귀
├─ Configuration Service — 검증·저장·실행 중 설정 배포
└─ SQLite repositories — 합의한 지속 데이터
```

- D/P: daemon과 Node.js HTTP server는 같은 프로세스에 구성할 수 있다. daemon 소유 Web·Host 실행과 CLI 소유 외부 실행을 구분한다. 외부 생존은 기존 CLI가 책임지므로 별도 runtime-host 프로세스가 필요하지 않으며 daemon 소유 자원은 실제 종료를 확인한다.
- D: 사용자 승인·모델 설정 등 기존 TUI 기능을 이용한다. React는 AIOX 운영 화면과 terminal renderer를 담당한다.
- D: Vendor TUI는 사용자와 vendor agent 사이의 모델 선택·slash command·승인·질문 등 interaction UX를 담당한다. Host 관리·알림·터미널 배치·AIOX 설정 UX는 운영 Web이 담당한다. TUI가 모든 AIOX UI의 권위라는 뜻은 아니다.
- P: Controller는 lifecycle 판단, binding은 vendor 호출·관측·정리, Network Service는 소속·route 권위를 담당한다. Web/MCP가 authoritative 실행 상태를 임의 변경하지 않는다.
- D: instructions 주입 기능을 유지한다. 공통 정책·tool description·schema의 원본은 공통화하고 provider 특유의 입력 framing만 binding에 둔다.
- P: 전부를 Session Manager 하나로 뭉치지 않는다. AIOX 실행, vendor 대화, 터미널 attachment는 수명이 다르다.

공통 실행 계층은 명령·인증된 실행 위치의 판정, 실행 소유권, daemon 종료 대상과 외부 제어 연결을 소유한다. 기존 RuntimeRegistry의 실행 소유권과 협업 등록 유효성을 구분하고, terminalOwnership은 daemon 터미널의 소유·차용 관계만 나타낸다. 등록 해제는 외부 프로세스 종료를 뜻하지 않는다. adapter는 vendor 실행 인자·주입·버전·통신·준비 판단·이벤트 해석과 부속 프로세스의 vendor별 수단을 담당한다. 부속 프로세스도 공통 실행 소유권을 따르며, Claude inbox/hooks나 단일 프로세스 형태를 모든 vendor의 필수 계약으로 삼지 않는다.

Stage 2-2에서 `packages/vendor`의 공유 실행·자원 수명과 `packages/adapters/claude`의 Claude 준비·inbox·hooks·관측을 분리했다. daemon의 `AgentController`는 공통 등록·제어 수명을 관리하며 CLI와 daemon은 공유 package의 공개 entry를 사용한다. CLI가 daemon 앱의 실행 helper를 import하는 의존은 제거했다. 여러 vendor 지원은 확정 요구지만 실제 vendor 검증은 Claude이며, Codex의 TUI·Relay·App Server는 Stage 4에서 같은 소유권 계약에 연결한다. Host 실행 구현은 Stage 5에 남는다.

P — apps/packages 구조 리뷰: apps는 프로세스와 일대일 대응하기보다 실행·배포 진입점, packages는 명확한 책임·의존 경계로 보는 것을 추천한다. 운영 Web과 공개 site는 분리하며 SQLite는 별도 실행 앱 없이 persistence 책임으로 둔다. HTTP/Gateway/MCP와 Controller/PTY를 daemon에 함께 구성하는 배치는 변경된 §24의 force stop 계약과 양립한다. 논리적 실행 책임은 Controller에 유지한다.

D: 외부 실행의 daemon 독립 수명은 CLI 직접 실행으로 충족한다. 별도 runtime-host는 선생성하지 않는다. Web·Host 실행은 daemon 소유로 유지하며 §24의 실행 위치·종료 정책을 따른다.

D: 사용자는 다음 apps/packages 형태를 목표로 삼고 domain의 제품 언어와 규칙을 우선 정리하는 방향을 선호했다. 이는 목표 구조이며 현재 package 이동·생성 지시나 모든 파일의 선생성을 뜻하지 않는다. site는 마지막 단계이고 ui의 실제 추출은 공유 소비자가 생기는 시점에 판단한다.

```text
apps/
├─ cli/src/commands/ — daemon, agent, network, host, adapter 명령
├─ daemon/src/ — bootstrap, http, gateway, mcp 및 실행 구성
├─ web/src/ — app, features/{hosts,agents,networks,terminal,notifications,settings}
└─ site/
packages/
├─ domain/src/ — 제품 개념·규칙
├─ application/src/ — agent, host, network, messaging 유스케이스 및 ports
├─ vendor/ — 공유 adapter 계약·실행 자원 수명
├─ adapters/{claude,codex}/
├─ terminal/
├─ persistence/src/{sqlite,repositories}/
├─ protocol/
├─ config/
└─ ui/ — 공유 UI가 실제 필요할 때
```

사용자가 제시한 domain 파일 배치 후보:

```text
packages/domain/src/
├─ agent/
│  ├─ agent.ts
│  ├─ runtime.ts
│  └─ runtime-status.ts
├─ host/
│  ├─ host.ts
│  └─ host-runtime.ts
├─ network/
│  ├─ network.ts
│  ├─ membership.ts
│  └─ route.ts
├─ messaging/
│  ├─ message.ts
│  └─ delivery.ts
├─ terminal/
│  └─ terminal-id.ts
└─ index.ts
```

P: 이 후보에서는 AgentRuntime을 agent/runtime.ts에 두고 별도 최상위 runtime/과 같은 모델을 중복 소유하지 않는다. agent.ts와 host.ts가 Definition을 의미하는지 등 파일별 의미는 구현 전에 명확히 한다. 파일마다 class를 만들거나 별도 DB entity를 도입할 필요는 없다. domain은 단일 Network membership, routing 우선순위, Message/대상별 결과 의미와 Runtime 상태 같은 제품 규칙을 소유한다. application은 인증된 실행 신원을 받아 규칙을 적용하고 실행·등록·전달·정리 순서 및 필요한 port를 조율한다. domain에 SQLite·PTY·vendor SDK 의존을 넣지 않는다. vendor 계약과 application port에 같은 계약을 중복 정의하거나 서로 순환 의존시키지 않는다. domain 우선은 모든 모델을 미리 완성하는 절차가 아니라 §25에서 확정할 실제 시나리오에 필요한 규칙부터 만드는 방향이다.

P: CLI/Web → daemon은 런타임 통신 관계이며 daemon 내부 코드 import 관계와 구분한다. Node PTY 구현과 브라우저 xterm renderer는 실행 환경이 다르므로 terminal package에 함께 섞어 Web이 Node 구현을 가져오게 하지 않는다. 공통 wire는 protocol, 브라우저 렌더링은 운영 Web에 둔다. ui package는 공개 site를 만드는 마지막 단계에 실제 공유 소비자가 생길 때 추출하는 후보다. 이번 리뷰는 디렉터리 이동·패키지 생성·기존 owner의 As-built 변경을 실행한 것이 아니다.

Runtime과 관련 자원의 수명:

```text
AgentRuntime — AIOX가 관리하는 하나의 실행 단위
├─ vendor 프로세스·연결 자원 — Codex는 TUI와 App Server 포함
├─ 현재 Vendor Conversation 연결 — /clear·/resume으로 바뀔 수 있음
└─ daemon 소유 실행만 AIOX 터미널 연결

Terminal / PTY — 터미널 실행 자원 수명
Web Attachment — 브라우저가 그 터미널을 보는 연결 수명
```

AgentRuntime을 PID 하나로 정의하지 않는다. 실제 프로세스와 부속 자원은 공통 정책이 결정한 CLI 또는 daemon 실행 소유자가 관리하며 binding은 vendor 연결·관측을 담당한다. Claude 동일 프로세스의 /clear·/resume은 실행을 유지하며 대화 연결을 바꿀 수 있다. daemon 소유 터미널의 브라우저 종료는 Web Attachment만 해제하고 재접속 시 현재 화면을 복원한다. 외부 실행은 Web 상태 조회만 제공한다.

#### 4. 기존 구현에서 직접 확인한 것과 새 요구의 관계

R: 다음을 현재 파일에서 읽었다. 당시 경로·line은 이후 변경될 수 있으므로 함수/책임 이름도 함께 기록한다.

| 관찰 | 근거 | 새 방향에 주는 의미 |
| --- | --- | --- |
| Claude/Codex MCP에 비슷한 instructions·도구·handler가 각각 존재 | `src/adapters/claude/channel-server.ts`, `src/adapters/codex/mcp-server.ts` | HTTP MCP 공통화 근거 |
| 동일 MCP schema를 별도 parity test로 관리 | `tests/unit/adapters/mcp-tool-contract-parity.test.ts` | 중복 원본을 공통 정의로 바꿀 근거 |
| vendor ingress가 공통 send transaction/dispatch로 이어짐 | `src/daemon/state.ts`의 receiveClaudeChannelMessage/receiveCodexMessage | 인증된 runtime 기반 공통 ingress 후보. 기존 인증 위치의 차이까지 같다고 단정하지 않음 |
| Claude launcher는 static MCP 등록과 development channel 실행에 의존 | `src/adapters/claude/launcher.ts` | 실행 시 문자열 설정·inbox로 교체할 부분 |
| Codex injector는 정상 turn/start 응답 본문을 단순 success로 줄임 | `src/adapters/codex/injector.ts`의 injectTurnStart | 후속 turn 관측과 연결할 정보 보존 필요 |
| Codex WS는 notification/response를 처리하고 runtime listener는 remoteControl/status/changed만 소비 | `src/adapters/codex/websocket.ts`, `src/adapters/codex/runtime.ts` | vendor 관측 기능 존재와 현재 AIOX 알림 wiring 완료는 별개 |
| 신규 domain·adapter-sdk entry는 export {} | `packages/domain/src/index.ts`, `packages/adapter-sdk/src/index.ts` | 제안된 공통 domain이 이미 구현돼 있다고 말하지 않음 |
| Web에 React/Vite·xterm·GatewayStore 재접속 기반 존재 | `apps/web/package.json`, `apps/web/src/gateway-store.ts`, `apps/web/src/terminal-view.tsx` | 재사용 후보일 뿐 새 제품 제약 아님 |
| Web 인증은 fragment에서 소비 후 URL에서 제거하고 메모리 사용 | `apps/web/src/credential.ts` | 브라우저 완전 종료·새 페이지 복귀는 현 구현만으로 보장되지 않음 |
| 신규 CLI는 start/open/status/stop/doctor와 start --port를 파싱 | `apps/cli/src/parse.ts` | 실제 있는 명령과 목표 agent/host/network 명령을 구분 |

R: `scripts/onramp`는 새 plan 작성 전 `plans/aiox-web-first-rewrite.md` Stage 3 → `logs/2026-09-02-AIOX-Web-first-Stage3-Terminal-Milestone.md` W5를 가리켰다. W1~W4 수용 기록과 W5 미완료가 남아 있었다. 기존 plan은 활성 마커를 해제하고 새 plan 링크·중단 의미를 Notes에 남긴다. 과거 logs/task records의 완료·미완료 history를 임의 superseded/완료 처리하지 않는다.

이번 단일 Base log는 사용자가 요청한 대화 기준선과 Stage 0 계약 논의를 담는다. 파일 수·분량만으로 package/task-record를 추가하지 않는다. 여러 구현 owner를 실제로 수정·검증할 다음 작업의 workflow는 그때 판정한다.

#### 5. 실행 시 MCP 주입: Codex

D/O: Codex의 HTTP MCP는 App Server 실행 시 config override로 주입한다. 별도 `aiox mcp-codex` stdio child를 목표 구조에서 제거한다. 설정 예시는 다음과 같다.

```sh
codex app-server \
  -c 'developer_instructions="AIOX instructions..."' \
  -c 'mcp_servers.aiox.url="http://127.0.0.1:4500/mcp/network-123"' \
  -c 'mcp_servers.aiox.bearer_token_env_var="AIOX_MCP_TOKEN"' \
  -c 'mcp_servers.aiox.required=true'
```

- App Server를 spawn하는 AIOX가 해당 child의 env에 `AIOX_MCP_TOKEN`을 넣는다. 실행마다 다른 credential이며 다른 runtime과 공유하지 않는다.
- 사용자가 처음 제시한 URL은 `/mcp`였고, network 범위 URL 논의 후 `/mcp/<networkId>`를 사용하는 방향으로 정리했다. 포트·networkId는 예시이며 실제 server endpoint와 선택 network에서 생성한다.
- `bearer_token_env_var`는 env 변수의 이름이고, 실제 token 문자열을 TOML 값이나 URL에 넣는 뜻이 아니다.
- `required=true`는 enabled MCP 초기화 실패 시 startup/resume을 실패시키는 Codex 설정이다. 이것만으로 전체 AIOX runtime 등록·cleanup이 자동 완성되지는 않는다.
- 이 명령은 MCP 설정 부분만 보여 준다. App Server listen 주소, 기존/새 TUI 연결, 프로세스 ownership은 runtime binding 구현이 함께 구성해야 한다.
- 실행 config override 키는 `developer_instructions`다. AIOX 공통 통신 지침과 사용자/Host/Agent instruction을 해당 값으로 구성한다. 기존 코드의 `developerInstructions`는 `thread/start`·`thread/resume` 요청 필드이며 config 키와 혼용하지 않는다. 실제 spawn 인자는 TOML 문자열 escaping을 적용해 구성한다.
- D/P: 구현 시 참고 — instruction은 첫 user message가 아니라 App Server 실행 config에 주입한다. 같은 실행에서 `/new`·resume·fork로 활성 thread가 바뀌어도 AIOX 지침을 적용하는 방향으로 구성한다. 실행 config와 thread별 RPC override의 관계는 Codex binding 구현에서 참고하며, 별도 사용자 요구·선행 실험 과제로 만들지 않는다. 공식 문서는 `developer_instructions`를 세션에 추가하는 developer 지침으로 설명한다. 각 전환 동작의 독립 실측 완료를 뜻하지 않는다.
- O: [Codex Configuration Reference](https://learn.chatgpt.com/docs/config-file/config-reference)에서 url, bearer_token_env_var, required 지원 확인. 이 정확한 새 AIOX launch 구성의 통합 실측 완료를 주장하지 않는다.

R/U: 활성 Thread 추적은 이미 구현·실측 근거가 있는 Binding Relay를 사용한다. TUI의 `thread/start`·`thread/resume`·`thread/fork` 요청에 대한 같은 연결의 성공 응답을 관측하고 `activeThreadId`를 갱신해 이후 `turn/start`의 대상으로 사용한다. [현재 근거 안내](../docs/architecture/aiox-vendor-bindings.md#codex-실행과-active-thread)가 보존 커밋 `8db476bad722717bf82cc598904f3f33af8a90b3`의 `src/adapters/codex/proxy.ts`와 `tests/unit/adapters/codex-proxy.test.ts`를 가리킨다. 삭제된 옛 파일이 현재 workspace에 존재한다고 가정하지 않는다. 해당 코드·테스트는 활성 thread 추적의 근거이며 instruction 지속성 테스트는 아니다. 실행 지침의 범위, 입력 대상 activeThreadId, 개별 응답 종료를 연결하는 turnId는 구분한다. 이를 W2의 재실험 항목으로 두지 않는다. 새 알림 관측 wiring과 활성 Thread 추적은 별개이며, 기존 owner의 fallback을 새 구조에 자동 이식하지 않는다.

#### 6. 실행 시 MCP·instructions·hooks 주입: Claude

D: `aiox claude setup`, `aiox setup claude` 같은 선행 영구 등록 절차 없이, Claude 실행 시 `--mcp-config`에 JSON 문자열을 전달한다. JSON 파일을 반드시 생성해야 하는 구조가 아니다. user/project/local의 MCP 설정을 영구 수정하지 않는다.

실행 구성 예시(실제 token은 AIOX가 child env에 전달하며 CLI 인자에는 환경변수 참조만 둔다):

```sh
claude \
  --mcp-config '{"mcpServers":{"aiox":{"type":"http","url":"http://127.0.0.1:4500/mcp/network-123","headers":{"Authorization":"Bearer ${AIOX_MCP_TOKEN}"}}}}' \
  --append-system-prompt '<AIOX 공통 통신 지침 + 해당 Agent instructions>'
```

목표 launcher는 shell 문자열 이어 붙이기 대신 spawn의 args에 JSON.stringify 결과를 한 argument로 전달한다.

```ts
const mcpConfig = JSON.stringify({
  mcpServers: {
    aiox: {
      type: "http",
      url: networkMcpUrl,
      headers: { Authorization: "Bearer ${AIOX_MCP_TOKEN}" },
    },
  },
});
spawn("claude", ["--mcp-config", mcpConfig], {
  env: { ...process.env, AIOX_MCP_TOKEN: runtimeToken },
});
// MCP 부분만 나타낸다. instructions와 hooks 인자는 별도로 함께 구성한다.
// 위 코드는 문서용 형태이며 제품 코드에 반영된 구현이 아니다.
```

- Claude와 Codex가 보내는 최종 HTTP 인증은 동일한 `Authorization: Bearer ...`다. daemon의 인증 handler를 vendor별로 나누지 않는다.
- `type: "http"`를 포함한다. URL만 있다고 HTTP로 자동 해석된다고 가정하지 않는다.
- `--mcp-config`는 MCP 설정, `--settings`는 AIOX hooks 등 실행 설정, `--append-system-prompt`는 지침 주입으로 책임을 구분한다.
- D/O/P: 구현 시 참고: Claude의 `--append-system-prompt`는 실행 시 기본 system prompt에 AIOX 지침을 추가한다. 공식 [문서](https://code.claude.com/docs/en/output-styles#comparisons-to-related-features)는 적용 범위를 single invocation으로 설명한다. 같은 프로세스의 대화 초기화·재개에서도 지침을 적용하는 방향으로 구성하고, 첫 user message로 반복 주입하지 않는다. 이를 별도 사용자 요구·선행 실험 과제로 만들지 않으며 각 전환 동작을 모두 실측했다는 주장과는 구분한다.
- Claude 실행 시 `--mcp-config`로 AIOX MCP를 추가하며 `--strict-mcp-config`는 사용하지 않는다.
- P: AIOX hook도 `--settings` JSON 문자열/임시 실행 설정으로 주입해 AIOX가 띄운 Claude에 한정한다. 기존 사용자 hook을 통째로 대체·삭제하지 않는다. 전체 설정 merge 우선순위는 구현 때 정확한 경로에서 확인한다.
- U: 임시 --settings로 UserPromptSubmit+Stop을 등록한 실측은 성공했다. 기본 bundle plugin의 security_reminder_hook.py도 함께 실행된 보고가 있으므로 “우리 hook만 존재한다”는 가정은 금지한다.
- JSON 안의 `${AIOX_MCP_TOKEN}`은 JavaScript template 보간이 아닌 리터럴 문자열이다. 실제 token은 child env로 전달하고 CLI argument·로그·오류에 남기지 않는다.
- O/U: 공식 MCP 문서는 headers의 `${VAR}` 확장을 설명한다. 해당 절 제목은 `.mcp.json`이며 inline JSON 예시는 사용자 전달 리뷰와 문서 근거를 반영한 목표 구성이다. 이번 기록 수정에서 CLI inline 확장 경로를 독립 실행 검증했다고 주장하지 않는다.
- 목표에서 custom channel flag·AIOX channel MCP child·agent별 /send listener는 제거한다. inbox/프로세스 등록·cleanup 자체를 제거하는 것은 아니다.
- O: [Claude MCP](https://code.claude.com/docs/en/mcp), [Claude CLI reference](https://code.claude.com/docs/en/cli-reference), [Hooks](https://code.claude.com/docs/en/hooks). 전체 신규 launcher의 통합 검증은 남아 있다.

D: 2026-09-09 사용자 확정 — Claude 필수 설정 충돌은 실행 전에 거절한다.

- 사용자 인자·설정이 AIOX 필수 연결·관측을 깨뜨리면 터미널에 원인을 표시하고 Claude를 실행하지 않는다. 명령은 실패로 종료하고 원래 shell은 유지한다.
- 대상은 AIOX inbox 주소 덮어쓰기, 필수 hooks 비활성화, 동일한 `aiox` MCP의 충돌하는 재정의다. 함께 적용할 수 있는 기존 사용자 MCP·hooks·지침과 일반 vendor 옵션은 보존하며, 설정이 존재한다는 이유만으로 거절하지 않는다.
- 사용자 설정을 몰래 덮어쓰거나 비활성화하지 않는다. CLI 충돌 오류 메시지는 §24의 공통 메시지 언어 정책에 따라 영어로 작성하고 충돌한 옵션·설정과 사용자가 취할 조치를 알린다. 실제 token은 노출하지 않는다.

예: `aiox agent run claude --network dev -- --settings '{"disableAllHooks":true}'`가 AIOX 필수 hooks를 비활성화하면 실행을 거절한다. 영어 메시지 예시는 다음과 같으며 정확한 문구 자체를 고정하지 않는다.

```text
Cannot start Claude: disableAllHooks=true disables hooks required by AIOX.
Remove this setting and try again.
```

위 내용은 확정 정책이며 구현·실제 실행 검증 완료 보고가 아니다.

#### 7. Host namespace, 작업 공간, Network와 runtime 인증

D: Host 실행 하나를 작업 공간·Agent·manifest가 선언한 host-managed Network 하나를 묶는 namespace로 둔다. Host 설정은 Agent와 Network/route 구성이고, Host 실행은 그 구성을 실제로 띄운 별도 식별 단위다. 같은 설정을 여러 번 실행해도 Runtime/token/host-managed 통신 공간은 섞이지 않는다. 현재는 Host당 Network 하나, Agent의 동시 Network 소속도 최대 하나로 제한하고 다중 Network 연결은 연기한다. daemon 전체의 독립 Network 생성·관리를 하나로 제한하는 뜻은 아니다.

```text
aiox host run
└─ Host H1
   ├─ Workspace: 현재 프로젝트 경로
   ├─ Network N1
   └─ Claude / Codex → 같은 작업 경로 공유

aiox host run --worktree feature/login
└─ Host H2
   ├─ Workspace: Git Worktree 경로
   ├─ Network N2
   └─ Claude / Codex → 해당 Worktree 공유
```

- D: 기존 명령 구조의 `aiox host run`에 `--worktree <branch>` 옵션을 추가하고 Git을 통한 Worktree 준비를 AIOX 내부에서 처리한다. 사용자가 사전에 `git worktree add`를 직접 실행해야 하는 흐름으로 만들지 않는다. 아직 제품 코드에 구현된 동작은 아니다.
- D: 기본 실행은 현재 프로젝트 경로를 사용하고 `--worktree` 실행은 별도 작업 공간을 사용하는 별도 Host로 표시한다. Host 안의 Agent는 같은 경로를 공유한다. Agent별 Worktree 지정은 이번 범위에 추가하지 않는다.
- 작업 공간은 일반 디렉터리 또는 Git Worktree다. Host namespace는 파일 sandbox가 아니다. 같은 경로에 Host 두 개를 실행하면 실행·통신은 구분되지만 파일은 공유한다.
- D: 사용자는 Worktree의 생성 위치·브랜치 처리·기존 Worktree 재사용·정리 방식을 herdr 구현을 참고해 구체화하기로 했다. 현재 실행 경로가 Git 저장소 안인지 확인하고 그 저장소를 기준으로 작업한다. 이전 herdr 조사 로그를 복구하거나 기존 조사의 모든 내용을 다시 기록하라는 뜻은 아니다.
- P/Q: `.aiox/worktrees/<작업 이름>`와 프로젝트의 형제 경로는 설명 중 제안한 후보이며 기본 경로로 확정하지 않았다. Git linked worktree는 별도 작업 경로와 HEAD/index를 가지며 저장소를 공유하므로 하위 디렉터리에 있다는 이유로 branch merge가 불가능하지 않다. 생성 위치와 기준 commit·기존 branch/checkout·충돌 처리는 herdr 참고 후 구체화한다. 자동 force·merge·commit을 도입하지 않는다.
- P: Host 종료 시 자신이 소유한 Agent·credential·binding·Network 실행 자원을 정리하고 Worktree와 작업 파일은 보존한다. 시작 실패 때도 token 등 실행 자원을 정리하며 작업 공간 삭제를 자동 결합하지 않는다.
- P: Web은 Host별 경로·branch와 내부 Agent 터미널을 표시한다. 현재 경로 Host와 Worktree Host를 별도 항목으로 탐색하며, 터미널 배치 변경이 route를 바꾸지는 않는다.
- O: [Git worktree](https://git-scm.com/docs/git-worktree)는 별도 working tree/HEAD/index를 제공한다. Git repository 일부를 공유하며 프로세스·port 격리 수단은 아니다.

```text
작업 경로 확인 / --worktree이면 Git으로 준비
→ Host namespace·manifest의 host-managed Network 하나 준비
→ Agent마다 token 발급·MCP 및 instructions 주입
→ Agent 실행·binding 준비
→ Web에서 Host와 터미널 표시
```

Network URL과 인증 책임:

```text
Authorization: Bearer <runtime-token> → 누가 요청했는가
/mcp/<networkId>                       → 어느 통신 공간인가
Daemon membership + route             → 누구에게 보낼 수 있는가
```

- D/P: URL의 network는 선택자이며 권한 자체가 아니다. daemon이 token→runtime을 찾고 현재 network 소속과 directed route를 검사한다.
- D: 같은 network의 agent들은 같은 URL에 각자의 token으로 접속한다. Claude/Codex별, route별 HTTP server나 port를 만들 필요가 없다.
- 도구 입력에 source agentName/hostId/token을 반복 제출하지 않는다. 인증된 runtime에서 source를 도출한다. 이름은 표시·선택 label로 유지한다.
- grants를 credential 발급 당시 영구 snapshot으로 고정할 필요는 없다. live Network Service가 현재 권한을 판정한다.

```text
Network N
├─ A → B
├─ A → C
└─ B → C

A.send(targets=[B]) → B만
A.send(targets=[B,C]) → B와 C, 대상별 결과
B.send(targets=[C]) → C
C.send(targets=[A]) → outbound route 없음: 거절
```

- route가 바뀌어도 network URL이 같으면 MCP 설정을 다시 주입하지 않고 전송 시점 route를 적용한다.
- D: MCP agents_list는 인증된 발신 Runtime의 단일 Network에서 effective route상 발신자→대상 전송이 허용되는 Agent만 status와 함께 반환한다. Web은 Network 전체 Agent와 route를 표시한다. 사용자가 이 조회 범위 분리에 동의했으며 조회 시점의 route를 반영한다. 실제 send 시에도 daemon이 현재 membership·route를 검사하므로 과거 목록 조회를 전송 권한으로 간주하지 않는다. 일반 CLI agent list의 전체 조회·필터 계약을 MCP 조회 제한과 혼동하지 않는다.

```text
Host 실행 H1 → Network N1
├─ Claude A → N1 URL + token-A
├─ Codex B  → N1 URL + token-B
└─ Claude C → N1 URL + token-C

Host 실행 H2 → Network N2
└─ 같은 이름의 agent라도 H2의 별도 Runtime/token/N2 URL
```

- D: persistent Network는 `aiox network`로 관리하고 host-managed Network 하나는 Host manifest로 선언·실체화한다. 위 N1/N2는 별도 Host에 속한 별도 Network다.
- D: Host-managed NetworkSpec의 authority는 aiox.yaml이며 Host 실행 범위의 임시 자원이다. Persistent NetworkSpec의 authority는 daemon DB이며 명시적 network delete까지 유지된다. daemon은 두 종류의 NetworkRuntime에서 같은 routing engine으로 membership/discovery/delivery를 실행한다. YAML 선언을 persistent global Network로 동시에 저장·소유하는 모델은 사용하지 않는다.
- D: Host-managed Network는 Host 종료 시 membership과 함께 정리한다. 비정상 종료도 Host 등록의 유효성 상실을 감지한 정리 경로에서 처리해야 한다. 감지 수단으로 lease를 새로 강제하지는 않는다. Persistent Network 이름·default는 daemon 재시작 후에도 유지하지만 과거 Runtime membership은 복원하지 않고 잔존 endpoint route를 정리한다.
- D: Network 이름은 Host runtime scope와 persistent global scope를 구분한다. 표시 예시는 feature-host/feature-a와 feature-a이고, 내부 식별은 Host runtime ID 또는 독립 Network ID를 사용한다. 서로 다른 scope를 이름만으로 merge/replace하지 않는다. Host YAML의 persistent Network external 참조는 현재 범위에서 제외한다.
- D: Network에 속하는 Agent 수와 Host가 실행하는 Agent 수에 AIOX의 고정 숫자 상한을 두지 않는다. 사용자는 100개·1,000개 이상도 계속 추가할 수 있으며 숫자만으로 등록을 거절하지 않는다. 실제 실행의 자원 부족·vendor 제한은 해당 실패로 보고한다. 이는 Agent당 Network 최대 1개·Host당 Network 1개 계약과 별개다.
- D: 일반 `network list --all`/`show`에서 host-managed Network도 조회할 수 있지만, 그 runtime route 변경은 `host network route`를 사용한다. 일반 network delete/route는 persistent Network에 적용한다. YAML의 networks.<name>.agents는 초기 소속 선언이므로 유지하며 동적 가입·탈퇴 명령과 혼동하지 않는다.
- R: 기존 `docs/specs/aiox-runtime-control.md`의 HostRuntime은 Host Manifest materialization이다. `hostId: local`로 standalone을 가짜 Host에 넣어 실행 머신과 Host 실행을 혼동하는 제안은 채택하지 않았다.
- route의 YAML 이름은 해당 Host 실행에서 생성한 Runtime ID로 해석한다. H1/H2에 같은 claude 이름이 있어도 live endpoint가 섞이면 안 된다.
- D: 실행 시 선택한 단일 Network의 MCP 설정을 주입한다. 실행 중 소속 변경을 위한 MCP 설정 갱신은 범위에서 제거한다. 다중 Network용 MCP entry 구성도 제외한다.
- D: 새 send는 현재 route를 검증한다. 이미 전송한 요청의 daemon 완료·실패 알림은 대상별 전송 시점의 역방향 관계를 유지한다. §16을 따른다.

Credential lifecycle:

```text
Runtime 시작 → 별도 MCP token 발급 → runtimeId/agentId 연결 → child env 전달
Runtime 종료 또는 시작 실패 → token revoke · Peer binding 제거
새 Runtime 실행 → 새 token 발급
```

- Runtime마다 별도 MCP token을 발급한다.
- 실제 token은 로그와 CLI argument에 남기지 않는다.
- Runtime 종료 시 token을 폐기한다. revoke 뒤 기존 MCP session으로 새 도구 요청을 보내도 허용하지 않는다.
- 재실행 시 이전 token을 재사용하지 않는다.
- Claude inbox 인증 token은 AIOX MCP token과 별개이며 플랫폼별 전달 방식은 §10에서 다룬다.

#### 8. Claude Channel에서 native inbox로 방향을 바꾼 근거

초기 문제:

- Claude custom Channel은 `--dangerously-load-development-channels`를 사용하며 최초 경고·개발 channel 표면이 UX 부담이었다.
- 이 flag는 `--dangerously-skip-permissions`와 다르다. 도구 승인 우회로 설명하지 않는다.
- 구 구조는 Claude마다 MCP child와 loopback /send listener를 만들고 port·registration·timeout을 관리했다.
- “idle TUI를 깨우려면 Channel이 반드시 필요”라는 초기 설명은 이후 조사/실측으로 수정됐다.

U: 외부 Node 프로세스가 macOS의 inbox socket으로 raw JSON을 보내 idle 5/5, busy 도구 호출 사이 1회의 동작을 확인한 보고가 있었다. 3개 burst도 전부 처리됐지만 순서는 송신 순서와 달랐다. HTTP MCP reply는 IDLE5/BURST1~3/BUSY2의 5개 고유 ID로 외부 서버에서 확인했다. 이는 write 성공 외에 모델이 본문을 처리하고 도구를 호출했음을 보여 준다.

실패 원인 보고도 보존한다: 초기 MCP handler가 요청마다 새 session을 만든 harness 버그, MCP 서버 프로세스 종료, 연결 실패 후 해당 테스트 TUI에서 도구가 복구되지 않음, busy 테스트용 명령 누락이 있었다. 이 관찰을 “Claude MCP는 언제나 재접속 불가”라는 일반 계약으로 올리지 않는다.

U/S/O의 경계:

- O: native cross-session messaging에 idle 새 턴, busy 중 전달, socket/pipe, 정책 및 preview가 문서화돼 있다.
- U: 순수 외부 프로세스가 raw write해 실제 TUI를 깨우고 HTTP MCP reply까지 받은 경로가 성공했다.
- S: 정확한 raw body와 표시 태그 처리는 설치 바이너리에서 조사했다.
- Q: 외부 daemon용 body 전체 schema·표시 태그가 안정된 범용 공식 API로 공표됐다고 주장하지 않는다. hidden 옵션·내부 문자열 의존은 binding에 격리한다.

O: [Cross-session messaging](https://code.claude.com/docs/en/cross-session-messaging), [Channels reference](https://code.claude.com/docs/en/channels-reference).

#### 9. Claude raw body와 native preview 실측

처음 사용한 raw body:

```json
{"type":"user","message":{"role":"user","content":"메시지 본문"}}
```

U: 이 형태의 idle 입력은 “Another Claude session sent a message”와 permission-laundering 안내가 붙은 전체 박스를 표시했다. busy 중 입력은 압축된 형태로 관찰됐다. 최상위 `from:"Codex"`를 추가해도 표시가 바뀌지 않았다. 이것을 본문이 짧아서 ctrl+o가 안 됐다고 설명한 과거 추론은 후속 renderer 조사로 정정됐다.

S: native SendMessage 경로가 content에 cross-session-message 태그를 구성하고, TUI renderer가 그 태그를 해석한다는 코드 경로가 확인됐다. top-level from 필드와 표시 태그는 다르다. 임의 prefix/공백을 붙여도 같은 renderer로 들어간다고 가정하지 않는다.

U: `/Applications/cmux.app/Contents/Resources/bin/claude` → 설치 버전 2.1.263을 확인한 독립 PTY 테스트에서 다음 형태가 성공했다.

```json
{"type":"user","message":{"role":"user","content":"<cross-session-message from-name=\"Codex\">\n[AIOX] 표시 검증 메시지입니다.\n두 번째 줄도 전달되었습니다.\n도구를 사용하지 말고 DISPLAY_OK라고만 답해주세요.\n</cross-session-message>"}}
```

- 일반 화면: `Message from @Codex: [AIOX] 표시 검증 메시지입니다. (ctrl+o to expand)`.
- Ctrl+O: 전체 3줄을 transcript 화면에서 확인. 재토글하면 preview 복귀.
- 기존 Another Claude session 전체 안내 박스는 일반 표시에서 미출현.
- 모델은 도구 없이 DISPLAY_OK 응답.
- 6개 표시 항목 모두 통과했다는 사용자 전달 보고. driver·child·socket·임시 의존 제거, repo 상태 불변도 보고됐다.
- 표시에서 안내를 숨긴 것은 모델 권한 경계나 보안 지침을 제거했다는 뜻이 아니다. from-name은 display label이며 인증 신원이 아니다.

#### 10. Inbox 주소, 환경변수, 권한, Windows

O/U: Claude `/status`의 Peer address는 **현재 TUI 자신의 inbox 주소**다. 다른 agent의 모든 주소를 조회하는 API로 혼동하지 않는다. 실측 예시는 `uds:/tmp/cc-socks/47320.sock` 및 `/tmp/cc-socks/41859.sock`였다. `uds:`는 UI 표기이며 Node socket path는 `/tmp/...sock`다.

S: 설치 2.1.263 바이너리에서 숨겨진 `--messaging-socket-path <path>` 옵션과 Windows pipe 언급을 발견했다. 공식 CLI 공개 문서에서 해당 옵션은 확인하지 못했다. 이 부재는 조사 범위의 결과이며 미래 버전 전체에 대한 선언이 아니다.

```sh
# 경로 지정 실행 예시: 신규 AIOX integration에서 실행 검증한 명령이 아님
claude --messaging-socket-path /tmp/aiox-private/runtime-123.sock

# Native Windows PowerShell 예시: Windows 실측 미수행
claude --messaging-socket-path '\\.\pipe\aiox-runtime-123'
```

- S: `CLAUDE_CODE_MESSAGING_SOCKET`/`CLAUDE_CODE_MESSAGING_TOKEN`은 Claude가 bind 후 hooks/Bash에 export하는 결과다. 시작 시 상속값을 제거하는 경로가 조사됐으므로 부모가 SOCKET env를 설정하면 그대로 listen한다는 방식은 채택하지 않는다.
- S: 기본 Unix 경로 생성은 runtime/tmp 기반 cc-socks 디렉터리의 PID.sock 형태이고 상황별 private fallback이 존재한다. 실제 `/tmp/cc-socks/<pid>.sock` 관찰과 문서 예시 디렉터리 표기를 하나의 고정 계약으로 만들지 않는다.
- S: 명시 Unix 경로는 절대 경로, 유효 basename, `..` 배제, 정규화 UTF-8 길이 103 byte 이하, 최종 부모 directory의 소유자·symlink·권한 및 live socket 충돌 검사가 조사됐다. 부모 directory 0700을 후보로 둔다. 특정 실패가 항상 CLI 즉시 종료로 나타난다고 일반화하지 않는다.
- P: AIOX가 runtime별 고유 주소를 배정하고 binding이 관리하면 단순 주소 등록을 위해 SessionStart가 반드시 필요한 것은 아니다.
- O: macOS/Linux/WSL2는 Unix socket, native Windows는 named pipe다. Windows 주소는 `C:\\...\\file.sock` 같은 파일 절대 경로가 아니라 `\\.\pipe\이름`이다. Node net 연결 API는 두 IPC 형태를 지원한다.
- O: Unix 인증 첫 줄은 선택 가능하지만 native Windows는 필수다. 주소를 안다고 Windows 인증 token까지 아는 것이 아니다.

```json
{"type":"auth","token":"<Claude inbox token>"}
{"type":"user","message":{"role":"user","content":"..."}}
```

- AIOX MCP token과 inbox token을 하나로 합치지 않는다. Windows token을 자기 세션 hook으로 daemon에 전달하는 방식은 후보이며 정확한 구현은 미결이다.
- S: Windows 관련 shared 문자열·parser는 macOS 바이너리에서 조사했으며 native Windows 실행 검증은 아니다. Unix 권한·길이 검사를 그대로 Windows에 적용하지 않는다. WSL2와 native Windows 간 자동 상호운용도 주장하지 않는다.
- O: inbox 정책 accept/hold/refuse와 own-child/token 의미는 vendor 정책이다. AIOX가 사용자 정책을 몰래 accept로 바꾸거나 임의 프로세스를 Claude peer로 인증했다고 주장하지 않는다.
- O: [Node IPC](https://nodejs.org/api/net.html#ipc-support), [Claude inbox](https://code.claude.com/docs/en/cross-session-messaging#the-sessions-inbox-socket).

#### 11. Runtime, /clear, /resume와 준비 확인

U: 사용자는 같은 Claude 프로세스에서 `/status`, `/resume`, `/clear` 후 socket 경로가 같은 것을 직접 관찰했다.

S: 2.1.263 조사에서 listener/address/token은 TUI host 수명에 묶이고 같은 프로세스의 clear/resume은 대화 식별자를 바꾸는 경로였다. 단순히 같은 이름으로 rebind한 것만이 아니라 listener·token을 유지하는 코드로 보고됐다. 새 `claude --resume` 프로세스는 별도 listener/token 수명이다.

```text
AIOX AgentRuntime / Claude process / inbox binding 유지
  ├─ 대화 A
  └─ /clear 또는 같은 프로세스 /resume → 대화 B

Web attachment는 별도로 연결·해제될 수 있음
```

- S/Q: 입력에 optional vendor session_id를 넣는 경우 이전 대화 ID는 clear/resume 후 거절될 수 있다. 주소 유지와 session ID 유지는 같지 않다. daemon이 ID를 무조건 캐시해 계속 넣는 설계를 피한다.
- D/P: “Claude 프로세스가 떴다”와 “inbox가 준비됐다”를 구분한다. binding의 connect 성공·프로세스 생존·시작 실패를 관측한다. 단순 파일 존재만으로 ready를 표시하지 않는다.
- P: 준비 확인을 위해 매번 모델을 호출하는 scratch injection/ACK probe를 자동 실행하지 않는다. 연결 준비와 메시지 수신은 서로 다른 관측으로 처리한다.
- 리뷰 반영 방향: Claude CLI 설치·버전·플랫폼을 확인하고 Peer 최소 지원 버전 미만이면 실행 실패로 처리한다. 지원 버전이면 TUI를 띄우고 inbox 준비 성공 시 ready, 준비 실패 시 Runtime failed로 표시한다. Channel fallback이나 복잡한 version allowlist는 두지 않는다.
- U/O: 앞선 조사에서 보고된 Peer 최소 버전은 macOS/Linux/WSL2 v2.1.224+, native Windows v2.1.234+다. 최소 버전 충족은 내부 raw body의 미래 호환이나 native Windows 통합 실측 완료를 의미하지 않는다.
- 실행 시 즉시 오류를 보여주고 `aiox doctor claude`에서 설치 여부·버전·Peer 지원·플랫폼 지원을 진단하는 방향이다. socket 연결/write 실패는 명시적으로 처리하되 write 성공을 모델 수신으로 올리지 않는다. 입력과 Stop 연결은 §12의 관측 근거를 사용한다.
- Q: hidden 경로 지정 옵션과 신규 launcher 통합, Windows token forwarding, messaging 비활성/late-bind 상황의 사용자 표시를 구현 범위에서 정한다. dedup/queue 상한/부하 전수 테스트를 이 항목 때문에 추가하지 않는다.

#### 12. UserPromptSubmit → Stop: 단일 inbox 입력 직접 연결 실측

U: 사용자가 전달한 마지막 검증의 실행 바이너리는 `/Applications/cmux.app/Contents/Resources/bin/claude`, 실체 `/Users/lunaxislu/.local/share/claude/versions/2.1.263`이다. 기본 TUI에 임시 --settings로 UserPromptSubmit+Stop을 등록했고 영구 설정은 수정하지 않았다고 보고했다.

- 공통 hook base에 session_id, transcript_path와 optional prompt_id가 있다.
- Stop에는 stop_hook_active, last_assistant_message 등은 있지만 입력 원문/origin이 없다.
- UserPromptSubmit에는 prompt 원문과 optional source가 있다. source의 system은 inbox만을 의미하는 독점 값이 아니다.
- 보낸 content는 cross-session-message 태그와 고유 `[LINKTEST:probe-1788766691-20435]` 마커 및 도구 미사용·고정 응답 지시였다.
- UserPromptSubmit.prompt에 전송 원문·마커가 있었고 prompt_id는 `f7d03581-418f-4105-8c5b-3db0d4160ac5`였다.
- Stop의 prompt_id가 동일했고 last_assistant_message는 STOP_LINK_TEST_OK, stop_hook_active=false였다.
- 실제 UserPromptSubmit payload에는 source가 없었다. optional rollout 설명과 일치한다는 보고다.
- 모델이 마커를 복사한 것을 증거로 쓰지 않았으며 별도 ACK 도구를 호출하지 않았다.

```text
Daemon이 보낸 AIOX 연결 ID
       ↓ inbox 입력
UserPromptSubmit { prompt: 원문, prompt_id: X, session_id: S }
       ↓ daemon: AIOX 메시지 ↔ Runtime / S / X 연결
Stop { prompt_id: X, session_id: S }
       ↓ 해당 입력의 응답 종료 관측
```

U: transcript의 user entry에도 같은 promptId, origin.kind=peer, promptSource=system, 표시 이름 Codex가 있었다. verifiedPeerPid 필드가 보였지만 그 이름만으로 OS 인증 구현 전체를 검증했다고 결론 내리지 않는다.

수용한 결론과 한계:

- 단일 idle inbox 입력을 수신한 사실과 해당 prompt의 응답 종료를 hook으로 연결할 수 있다. transcript를 항상 읽는 구조나 모델 ACK 도구가 필수는 아니다.
- Stop만으로 inbox origin을 알 수는 없다. UserPromptSubmit의 원문을 daemon이 보낸 식별자와 연결한다. 실제 source 누락 때문에 hook이 발신자 신원을 직접 인증한다고 표현하지 않는다.
- Stop은 응답 종료이며 프로세스 종료·작업 성공이 아니다. 실측 후 TUI는 살아서 idle로 돌아왔다.
- 여러 입력이 한 턴에 섞이면 같은 Stop으로 각 요청이 전부 성공했다고 단정하지 않는다. 단일 입력 실측을 busy/multi-input의 모든 의미로 확대하지 않는다.
- StopFailure도 prompt_id 공통 필드로 연결할 후보가 있지만 이 실측은 Stop이었다. 동일한 오류 경로까지 직접 테스트 완료로 기록하지 않는다.
- 검증 범위를 요약할 때도 `inbox → UserPromptSubmit → Stop/StopFailure` 전체가 실측됐다고 쓰지 않는다. 직접 연결 보고는 단일 idle 입력의 Stop이며 busy/multi-input·StopFailure는 해당 증거와 구분한다.
- 앞선 “수신·종료를 알 수 없다”는 포괄적 판단은 이 근거로 수정한다.
- 임시 driver/child/socket/settings는 삭제됐고, Claude 자체 transcript는 남았다는 보고다. 원본 jsonl을 이번 기록에서 다시 열지는 않았다.

#### 13. Codex 입력 표시 실험과 현재 의미

U/S: 과거 AIOX의 canonical envelope JSON을 turn/start text로 넣으면 Codex TUI에 사용자가 직접 입력한 것처럼 전체 JSON이 표시됐다. 사용자가 스크린샷으로 확인했고 본문 잡음·발신자 오귀속이 UX 문제였다.

대화에서 조사·시험한 표시 후보는 세 가지였다.

1. IDE용 내부 문자열 규약과 cyan text element 표시.
2. toolOutput 경로 주입.
3. toolOutput + additionalContext 조합.

- U: 사용자는 띄워 둔 테스트 Codex에 Color:Cyan을 보낸 후 “잘 나옴”이라고 확인했다.
- S/U: 이 경로는 범용 message styling API가 아니라 내부 IDE/render 규약으로 다뤘다. text_elements와 배경 element를 동등한 공개 API로 주장하지 않는다.
- 대화에서는 toolOutput 표시의 고정 “Sent by Codex from task …”가 실제 발신자 Claude를 잘못 표현할 수 있다는 지적이 나왔다. tool output으로 넣으면 모델이 외부 메시지로 인식하는지, 자신이 한 작업 결과로 인식하는지 질문도 있었다.
- additionalContext와 toolOutput을 동일 객체의 자유로운 본문/메타데이터처럼 단정하지 않는다. 길이 제한과 truncation 논의가 있었지만 정확한 1000-token 적용 대상·절단 위치를 현재 기록만으로 확정하지 않는다.
- 이 대화 기록에는 세 후보의 완전한 wire payload·실행 transcript가 없으므로 추측으로 예시를 재구성하지 않는다. 필요 시 기존 실험 근거를 좁게 복원한다.
- D: 후속 논의에서 Codex는 toolOutput 본문 + additionalContext 메타데이터를 채택했다. 사용자 확인상 실험 통과이며 신규 AIOX 통합 완료는 아니다. E2E 실패 시 원인을 확인한 다음 IDE delimiter/Cyan 또는 toolOutput 단독을 검토한다. 사전 fallback이나 후보 간 추가 순위는 두지 않는다.
- U: 테스트 cmux 창/Codex는 사용자가 /exit 했고 임시 파일 정리를 요청했다. 현재 새 테스트 창을 띄울 권한으로 해석하지 않는다.

#### 14. 입력 수락, 실행 상태, 오류와 알림 관측

```text
프로세스 생성/종료   → Runtime lifecycle
연결 준비           → Binding readiness
특정 입력 수락      → Message 입력 관측
prompt/turn 종료     → 응답 종료
Agent send 응답 → 대화상 회신
실제 산출물/응답 내용 → 작업 성공 판단
```

전달·응답 종료·회신은 관측 의미를 분리한다. 이를 `accepted → injected → processing → response_finished → replied`라는 단일 필수 순서로 고정하지 않는다.

```text
가능한 처리 순서:
입력 수신 → send 응답 → 추가 작업 → Stop

회신 불필요 메시지:
입력 수신 → 응답 종료 관측 가능, 발신자 후속 회신 대기 없음
```

send 응답이 Stop보다 먼저 올 수 있으므로 대화상 회신과 응답 종료를 필수 선행 상태로 묶지 않는다. 입력 수락/수신, 연결된 prompt/turn 종료, Agent send를 각각 증거에 따라 반영한다. 별도 세 개의 복잡한 FSM을 반드시 만들라는 뜻은 아니며, 정확한 필드와 상태 전이는 W2에서 정한다. 처리 중 발생한 오류도 어느 관측 단계의 실패인지 구분한다.

- D: Codex는 App Server의 입력 응답·진행·완료·오류·사용자 요청을 관측하고, Claude는 hooks를 daemon에 전달한다.
- D: 일반 PreToolUse/PostToolUseFailure를 수집해 모든 내부 도구 호출을 AIOX 오류로 만들지 않는다. 사용자가 “그건 Claude가 일하기 위한 호출·오류인데 왜 포함하느냐”고 정정했다.
- D: 승인·입력 대기는 Web 알림에 필요하다. 이를 AIOX message/delivery 처리에 넣을 필요는 없고 Gateway가 중계할 수 있다. 사용자 직접 작업에서도 발생한다.
- D/P: 세션 리밋·실행 중단은 Runtime 상태와 Web 알림에 반영한다. 특정 AIOX delivery의 실패로 귀속하려면 해당 입력 연결 근거가 있어야 한다.
- D: TUI의 정상 turn/start 응답까지 “수신을 전혀 알 수 없다”고 설명한 것은 과도했다. Codex runtime의 입력 수락으로 표시한다.

S/O: 알림 관측 subagent가 공식 문서에서 확인한 표면(라이브 테스트 미수행):

| 목적 | Codex App Server | Claude TUI hooks |
| --- | --- | --- |
| 실행/파일/권한 승인 | item/commandExecution/requestApproval, item/fileChange/requestApproval, item/permissions/requestApproval | PermissionRequest, Notification.permission_prompt |
| 사용자 질문·MCP elicitation | item/tool/requestUserInput, mcpServer/elicitation/request | Elicitation, Notification의 elicitation 관련 값 |
| 요청 해소 | serverRequest/resolved의 threadId/requestId | ElicitationResult 등. 일반 승인 전체를 포괄하는 resolved hook은 미확인 |
| 실패 | error, failed turn/completed, UsageLimitExceeded | StopFailure의 error, optional error_details·last_assistant_message |
| 사용량/재개 | account/rateLimits/read, account/rateLimits/updated | quota_auto_resume_fired/stale/disabled Notification |

- Codex 요청의 threadId/turnId/itemId와 JSON-RPC request ID를 용도별로 구분한다. resolved는 응답 외에 취소·정리도 포함하므로 무조건 승인 성공이 아니다.
- Q: 별도 daemon observer 연결에 TUI의 모든 server request가 broadcast되는지는 문서만으로 확정하지 못했다. 실제 중계 경로에서 관측하거나 적절한 연결 구성을 정한다. TUI와 daemon이 같은 승인 요청에 이중 응답하지 않는다.
- S/O: Claude Notification의 terminal permission_prompt는 약 6초 무입력 조건이 있어 즉시 관측이 필요하면 PermissionRequest를 사용한다. sandbox network 요청 등 예외가 있으며 모든 사용자 질문이 같은 hook으로 표현된다고 가정하지 않는다.
- S/O: PermissionRequest에는 session_id/prompt_id/tool_name/tool_input 등이 있지만 tool_use_id가 없다고 조사됐다. agent_needs_input을 모든 AskUserQuestion으로 일반화하지 않는다.
- S/O: StopFailure error 후보에는 rate_limit, overloaded, authentication_failed, oauth_org_not_allowed, account_on_hold, billing_error, invalid_request, model_not_found, server_error, max_output_tokens, unknown이 조사됐다. rate_limit을 구독 session/weekly limit과 정확히 일대일 대응시킨 근거는 없다.
- U/S: quota 자동 대기·재개 설정에 대한 이전 보고가 있었으나 AIOX가 이를 무조건 켜거나 재시작하는 기능은 결정하지 않았다.
- 프로세스 exit·연결 손실은 hooks만으로 모두 잡히지 않으므로 binding/process 관측도 유지한다. reasoning 원문 전체를 추적해야 하는 요구로 확대하지 않는다.
- O: [App Server](https://learn.chatgpt.com/docs/app-server), [Hooks common fields](https://code.claude.com/docs/en/hooks#common-input-fields), [Hooks](https://code.claude.com/docs/en/hooks).

#### 15. CLI 업데이트 문제에 대한 이전 논의

- D: aiox host뿐 아니라 aiox agent run으로 vendor를 시작할 때도 업데이트가 실행을 막을 수 있다는 질문이었다.
- 사용자가 보여 준 Codex 동작은 npm global update 후 “Please restart Codex”로 종료되는 흐름이었다. AIOX가 update를 발견하면 해당 vendor 실행 등록을 실패시키고 사용자가 처리 후 다시 실행하는 단순 방향을 선호했다.
- S: Codex startup updater는 정상 remote TUI 연결 전에 나타날 수 있고, Claude native updater는 백그라운드 갱신이라 매번 실행 실패를 뜻하지 않는다는 조사 결론이었다.
- Q: 관측 가능한 정확한 update signal/API/config와 AIOX 등록 실패 매핑은 이 기준선에 원본 근거가 완비되지 않았다. 출력 문자열 하나를 모든 버전에 대한 안정 API로 채택하지 않는다.
- D/P: 업데이트 정책 때문에 자동 update orchestration, 세밀한 progress FSM, 자동 host 재실행을 추가하지 않는다. 프로세스가 정상 준비됐는지와 사용자가 처리해야 할 startup 종료를 구분한다.

#### 16. MCP·수신 표시·대상별 자동 알림 — 후속 결정 반영

D: 이전 reply/replyExpected 논의를 다음 채택 계약으로 대체한다. 과거 실험의 reply 사용은 당시 관측 근거이지 현재 도구 계약이 아니다.

공통 HTTP MCP 도구는 `agents_list`와 `send`로 분리한다. `reply`, `replyExpected`, 재전송 도구를 제공하지 않으며 legacy envelope의 type/intent를 필수 입력으로 가져오지 않는다.

- `agents_list()`는 현재 발신자가 outbound route로 보낼 수 있는 실행만 배열로 반환한다. 각 항목은 `name`, `role`, `description`, `status`, `status_reason`이며 별도 `agentId` 필드는 없다. 이름 미지정 시 Runtime ID를 name으로 사용한다. role·description 미지정은 목록에서 null, 수신 표시에서는 생략한다.
- `send({ targets: [nameOrId, ...], content })`는 Agent 이름 또는 실제 Runtime ID와 본문을 받는다. 이름 있는 Agent도 두 방식 모두 허용한다. 허용된 모든 Agent에게 자동 fan-out하지 않는다.
- daemon은 인증된 source의 Network 안에서 전송 시점의 현재 참여자를 ID 우선·이름 순으로 해석하고 membership·effective route를 검증한다. 오래된 목록은 권한이 아니다.
- 대상별 결과는 입력 문자열을 담은 `name`, `accepted`, 선택적 `error`다. 동일 입력은 한 번만 반환한다. 같은 실행의 이름과 ID를 함께 입력하면 각각에 같은 결과를 반환하되 실제 전달·Delivery 저장은 한 번만 한다.
- 대상 부재는 `accepted: false`와 `agents_list` 재조회 안내로 반환한다. 이미 수락된 대상에는 재전송하지 않도록 안내하며 daemon은 자동 재전송하지 않는다.
- 해석되지 않는 대상의 Delivery는 저장하지 않는다. 모든 대상이 해석되지 않으면 응답의 `messageId`만 생성하며 저장된 메시지 존재를 뜻하지 않는다.
- B 종료 후 새 B가 참여하면 이름 B는 새 실행으로 해석한다. 종료된 B의 ID는 새 B로 바꾸지 않는다. 기존 요청·결과·알림은 원래 Runtime ID에 귀속한다.
- A→B만 허용되면 A의 목록에는 B가 보이고 B의 목록에는 A가 보이지 않는다. 양방향·전이적 route를 추론하지 않는다. 대화상 회신도 `send`를 사용하며 역방향 route가 필요하다.
- 수신 정보는 발신자의 name·role·description, daemon 접수 시각 `createdAt`, 본문 `content`다. daemon이 인증된 발신자 메타데이터를 채운다. deliveryId 등을 모델의 회신 도구 인자로 노출할 필요는 없지만 내부 메시지·대상별 delivery·vendor prompt/turn 상관관계는 유지한다.

단방향 대상에게는 원문 뒤에 줄바꿈 두 번과 아래 영어 안내를 붙인다. 원문 저장값과 daemon이 생성한 안내는 구분한다.

```text
[AIOX Notice] No outbound route to the sender is available. Carry out the request. AIOX will automatically notify the sender when processing completes or fails. Do not attempt to send a reply or acknowledgment.
```

대상별로 **전송 시점의 역방향 route 유무**를 요청에 보존하여 이후 route 변경과 무관하게 자동 알림 정책을 적용한다.

| 전송 시점 관계 | completed | failed | interrupted |
| --- | --- | --- | --- |
| A→B 단방향 | daemon이 A에 통지 | daemon이 A에 통지 | 자동 통지 없음 |
| A↔B 양방향 | 자동 통지 없음 | daemon이 A에 통지 | 자동 통지 없음 |

A가 B·C에게 보낸 뒤 C만 실패하면 A에게만 알린다. full mesh라도 B에게 실패를 전파하지 않는다. B가 별도로 C에게 보낸 요청의 발신자는 B다. daemon 알림은 역방향 Agent route를 부여하지 않으며 vendor의 진짜 system role과 동일하다는 뜻도 아니다. daemon 알림 자체의 처리 종료로 다시 완료 알림을 생성하지 않는다.

알림은 Web뿐 아니라 발신 Agent의 vendor 입력 경로로 전달한다. Codex는 `toolOutput` 본문과 `additionalContext` 메타데이터, Claude는 native inbox peer message를 사용한다. 정확한 wire·표시·busy 입력 연결은 vendor 통합에서 검증한다.

#### 17. 재전송 제거와 instructions 정정

D: MCP `aiox_retransmit_unconfirmed_delivery`(대화에서는 retransmit_unconfirmed_delivery로도 지칭)와 daemon의 같은 메시지 재전송·재주입을 제거한다. 사용자는 재전송을 모델에게 맡기는 기능이 불필요하다고 판단했다.

- 제거 대상: 재전송 전용 tool schema·handler·API·수동 재전송 처리·자동 동일 메시지 재시도/재주입, 그 도구를 호출하라는 안내.
- 유지 대상: Host/Agent instructions 주입 기능, 공통 AIOX 협업 규칙, send/agents_list의 schema·handler, 관측 결과, 실패/확인 불가 표시, 늦은 응답 관측 반영.
- 사용자가 “instructions는 제거하지 말라”, “host --instruction인가?”라고 물었다. agent는 재전송 도구 사용 안내만을 뜻했다고 정정했고 사용자가 수용했다. 기능 전체 instructions를 삭제하지 않는다.
- 최초 한 번도 전송하지 않은 메시지의 대기열은 재전송과 다르다. 최초 queue를 없애는 결정은 하지 않았다.
- 사용자가 새 send를 호출하면 새 메시지다. 동일 delivery를 복구 명목으로 다시 실행하지 않는다.
- 확인 불가를 성공으로 감추거나 자동 재전송으로 대체하지 않는다. 새 복구 UI/ACK 프로토콜도 이번 결정으로 추가하지 않는다.

#### 18. MCP agents_list와 상태 모델

D: `agents_list()`와 Web은 동일한 `status`와 `status_reason`을 사용한다. 상태는 `aiox-preparing`, `idle`, `working`, `awaiting-user`, `failed`다. 준비 중 Agent도 허용된 route의 목록에 포함하지만 메시지 수신 준비 완료를 뜻하지 않는다. Host에 남은 stopped 항목은 Host/Web에서 보이고 전송 대상 목록에서는 제외한다.

Web은 idle, reasoning·도구 실행 등 진행 상세, 사용자 입력·승인 대기, 실패 원인, Host stopped를 구분한다. 알림 읽음이나 다른 요청의 완료로 미해결 사용자 요청 표시를 지우지 않는다.

```text
B가 요청 X 처리 → X completed, B는 실제 활동에 따라 idle 또는 working
B가 요청 Y 처리 → X completed 유지, Y 진행 중, B working
```

completed/failed/interrupted는 개별 AIOX 입력의 처리 결과이고 Agent의 현재 상태와 별개다. completed는 연결된 응답 처리가 끝났다는 뜻이며 산출물의 정확성·업무 성공 보장이 아니다. 한 요청이 실패해도 실행이 살아 다른 입력을 처리한다면 현재 상태는 실제 활동을 따른다.

Claude는 Runtime·session_id·prompt_id와 연결된 UserPromptSubmit/Stop을, Codex는 Runtime·threadId·turnId와 연결된 `turn/completed`의 completed/failed/interrupted 결과를 사용한다. 입력 주입 성공만으로 처리 완료를 선언하지 않는다. busy 입력이 기존 turn에 합쳐질 수 있으므로 메시지 하나가 항상 새 turn 하나라는 가정을 하지 않는다. 임의 Stop 하나로 모든 요청을 완료하지 않는다.

세션 만료·인증/API 오류·연결 손실 등이 실제 요청을 실패시킨 경우 failed에 포함한다. 일시 재시도·일반 도구 오류를 무조건 요청 또는 Runtime 실패로 승격하지 않는다. interrupted는 Web에 기록하되 발신 Agent 자동 통지는 하지 않으며 모든 중단의 원인을 사용자로 단정하지 않는다.

#### 19. SQLite·설정·브라우저 저장의 책임

D: 지원 목표는 Windows/Linux/macOS이며 Windows에서 vendor를 네이티브로 실행하는지 WSL 안에서 실행하는지 구분해야 한다. O: 공식 Claude setup 문서는 Windows native와 WSL 실행을 모두 안내하고, 공식 Codex Windows 문서도 native CLI와 WSL 선택을 안내한다(https://code.claude.com/docs/en/setup, https://learn.chatgpt.com/docs/windows/windows-sandbox). 이는 AIOX inbox/hooks/PTY 통합의 Windows 실측 완료 근거는 아니다.

P/Q: 초기 실행 경계는 AIOX daemon·Node/Git·vendor CLI를 같은 실행 환경에 두는 구성을 추천한다. Windows native끼리, 또는 동일 WSL 배포판 내부끼리 실행한다. Windows daemon의 wsl.exe 일반 shell 선택·Linux cwd 설정은 지원한다. Linux vendor를 제어하는 혼합 협업 구성은 별도 path·socket·credential·프로세스 종료·MCP 연결 처리가 필요하므로 지원 여부를 확정하지 않았다. Windows 브라우저에서 WSL의 Web을 보는 것과 실행 자원을 두 환경에 혼합하는 것은 다르다. 실제 브라우저 접근은 WSL 네트워크 환경에서 확인해야 한다.

P/Q: 전역 설정은 실행 환경의 사용자 홈을 기준으로 한다. Windows native 홈과 WSL Linux 홈은 구분되며 자동 공유를 가정하지 않는다. 이는 프로젝트별 설정 분리를 뜻하지 않는다. doctor는 AIOX 실행 환경과 실제 vendor executable·Git·PTY·inbox 연결 지원을 진단하는 방향이며 WSL에서 Windows 실행 파일을 잘못 선택하는 경우도 구분해야 한다. OS별 실행·종료와 native dependency 설치는 구현 검증 대상으로 남긴다.

D: SQLite/DB와 CLI 작업을 새 plan에 포함한다. 터미널·keyboard 및 daemon/운영 Web 포트 설정은 사용자 전역 설정 파일 하나로 모든 프로젝트·Host·standalone에 공통 적용한다. 프로젝트별 설정 override는 두지 않는다. Web 일반 system/light/dark theme 선택은 localStorage에 둔다. system은 OS 테마를 따른다. 프로젝트 aiox.yaml의 실행 정의와 전역 사용자 설정은 별개다.

D/P: 사용자는 npm 전역 설치와 Windows/Linux/macOS 지원을 전제로 사용자 홈의 `.aiox/config.<확장명>` 위치를 제시했다. OS 사용자 홈을 기준으로 경로를 구성하고 npm 설치 디렉터리나 현재 프로젝트에 저장하지 않는 방향이다. 후속 Stage 1에서 형식은 JSON으로 선택·구현됐다. 설치 때보다 첫 실행·설정 저장 때 사용자 설정을 준비하는 것을 제안한다.

P: Web 편집·저장 연동의 단순함을 우선하면 JSON을 추천했다. JSONC/TOML은 수동 편집과 주석에 유리하지만 Web 저장 시 주석·형식 보존을 고려해야 한다. components.json은 이름 차이이며 JSON 형식이다. 이 비교는 당시 제안 경위이며 현재 선택은 Stage 1의 config.json이다.

P: 저장 위치를 아래처럼 나누자는 제안이 있었다. 명시적 결정과 제안을 구분한다.

| 위치 | 정보 | 상태 |
| --- | --- | --- |
| 사용자 홈/.aiox/config.<확장명> | terminal font/color/cursor/theme, keybindings, sidebar width, Host 초기 layout, daemon port, 운영 Web port | 사용자 전역 config.json. 기본 schema는 Stage 1 구현 |
| localStorage | Web system/light/dark | 세 선택 모두 확정. system은 OS 테마를 따름 |
| localStorage | 언어, 소리 on/off·volume | 제안 |
| SQLite | 지속 Network/Route, 메시지·대상별 결과·daemon 알림, 실행 이력, 알림·읽음, workspace 배치 | AIOX 본문 저장·처리 종료 후 기본 30일 채택. ORM/schema 전환은 후속 구현 |
| Server memory | 현재 process/binding/token/live activity | 책임 제안 |

- DB에 마지막 running 기록이 있다고 현재 process가 살아 있다고 판단하지 않는다. SQLite persistence와 프로세스 재부착·자동 재실행은 다르다.
- D: 지속 Network·route, 터미널 배치·알림 읽음 및 실행 이력 저장을 수용했다. 후속 결정으로 AIOX 원문과 daemon 알림·대상별 결과를 저장하며 아래 보존 정책을 적용한다.
- SQLite에 message를 저장해도 재전송/replay를 자동 허용하지 않는다.
- vendor transcript 전체를 복제하거나 reasoning 전체를 DB에 저장하는 요구는 없다.
- Host YAML을 유지할 때 정의 원본과 DB materialization/history를 구분해 이중 권위로 만들지 않는다.

SQLite의 3 OS 적용 기준(사용자 요청에 따른 목표 보강, 제품 구현 완료 아님):

- D/P: Windows/Linux/macOS에서 동일한 domain·schema를 사용하고 OS별 DB 모델을 만들지 않는다. SQLite 접근은 packages/persistence가 담당하고 daemon이 연결을 소유한다. CLI·Web·vendor adapter가 DB 파일을 직접 열어 상태를 수정하지 않는다.
- P: DB 위치는 실행 환경의 사용자 홈 아래 `.aiox/aiox.db`를 기본 후보로 둔다. Node의 homedir와 path 조합으로 구성하며 `~` 문자열이나 `/Users/...`를 하드코딩하지 않는다. npm 전역 설치 디렉터리·프로젝트·Worktree별로 DB를 만들지 않는다. 최초 daemon 시작 시 디렉터리·DB 준비와 현재 schema 초기화를 수행하고 준비 실패 시 정상 기동으로 표시하지 않는다.
- P: Windows native와 WSL은 각 환경의 홈에 별도 DB를 둔다. Windows daemon과 WSL daemon이 Windows 마운트 경로의 같은 파일을 동시에 공유하는 운영은 도입하지 않는다. 실행 환경별 로컬 저장 원칙이며 프로젝트별 DB 분리는 아니다.
- R: 현재 root package.json에는 better-sqlite3 ^12.10.0과 Node ^20.19.0 또는 ^22.12.0 또는 ^24.0.0 지원 선언이 있다. packages/database/package.json에는 domain 의존만 있고 SQLite driver 의존은 없다. 따라서 신규 persistence가 이미 3 OS 설치·동작을 검증한 것으로 취급하지 않는다.
- O/P: better-sqlite3 공식 README는 지원 Node 버전 요구와 주요 플랫폼/아키텍처용 prebuilt binary 제공을 명시한다(https://github.com/WiseLibs/better-sqlite3). OS 이름만으로 설치 성공을 보장하지 말고 채택 버전의 Node·CPU 아키텍처 조합에서 배포 artifact 설치·driver 로딩을 확인한다. 후속 Stage 1에서 better-sqlite3 12.11.1을 채택했고 Stage 2에서는 그 위 TypeORM 도입을 선택했다. 이번 문서 갱신은 설치·업그레이드를 실행하지 않는다. 지원 Node 범위와 native binary 배포는 함께 확정한다.
- P: DB 초기화·상태 변경은 필요한 transaction 경계로 처리한다. 실행 중 포트 변경으로 별도 daemon이 같은 DB를 중복 소유하지 않게 한다. 종료는 §24의 실행 소유권 정책에 따라 협업·소유 자원과 진행 중 DB 작업을 정리하고 연결을 닫은 후 완료한다. 프로세스 강제 종료와 DB 파일 삭제를 혼동하지 않는다. DB 접근 오류를 빈 신규 DB로 우회하거나 기존 파일을 자동 삭제하지 않는다.
- O/P: WAL을 채택한다면 DB와 같은 디렉터리의 -wal/-shm 파일 접근 및 로컬 파일시스템 조건을 고려한다. SQLite는 WAL의 네트워크 파일시스템 제약과 WAL 파일의 지속 상태 의미를 설명한다(https://sqlite.org/wal.html). 실행 중 sidecar 파일을 임의 삭제하지 않는다. WAL 채택과 세부 pragma는 아직 구현 선택이며 무조건 새 튜닝 설정을 추가하지 않는다.
- P/Q: 설치→현재 schema로 DB 초기화→저장→정상/force 종료→재시작 후 저장 데이터 확인을 Windows native/Linux/macOS에서 검증한다. WSL은 Linux 환경 실행과 Windows 브라우저 연결을 별도로 확인한다. Linux Docker 성공을 Windows 실측으로 대체하지 않는다. OS별 검증 완료 여부는 해당 단계 로그의 실측 근거로 판정한다.

- D/Q: JSON과 아래 본문 보존 정책은 채택했다. 설정 동시 편집, DB 기본 경로 연결·WAL 등의 실제 구현은 남아 있다.

AIOX send 원문과 daemon 알림 본문을 저장하고 발신자·대상·시각·대상별 처리 결과·내부 상관관계를 연결한다. vendor 전체 대화·reasoning·터미널 출력은 이 메시지 저장 범위에 포함하지 않는다. 살아 있는 PTY의 Web 화면 복귀 책임은 별개다. 저장 데이터를 자동 재전송·실행 복원에 사용하지 않는다.

보존 기본값은 요청 처리 종료 후 30일이다. 진행 중 요청은 삭제하지 않고, 정리 대상 요청의 본문·대상별 결과·연결된 daemon 알림을 함께 정리한다. 여러 대상의 처리가 남은 요청을 일부 완료만으로 삭제하지 않는다. 보존 일수는 전역 설정으로 변경하며 daemon 시작 시와 하루 한 번 정리한다. Host 종료 자체로 이력을 지우지 않는다. 이 정책은 persistent Network·route 정의, YAML·사용자 작업 파일을 삭제하거나 디스크 용량 상한을 보장하는 정책이 아니다.

Persistent Network 이름·default는 DB에 지속한다. endpoint route는 참여 실행의 수명을 따르며 종료·daemon 재시작 시 정리한다. Host의 정의 원본은 YAML이며 Host와 전용 Network·runtime override는 실행 수명에 한정한다. DB 이력은 살아 있는 membership이나 Host 복원 근거가 아니다.

TypeORM·better-sqlite3는 도입돼 있으며 현재 schema를 transaction 안에서 직접 초기화한다. 첫 배포 전에는 과거 개발 DB 호환을 위한 migration·backfill·legacy fallback을 유지하지 않는다. 저장 원자성·실패 재시도·재오픈 검증은 유지하고 startup 자동 삭제·reset은 하지 않는다. 배포 완료 통지 이후 schema 변경은 기존 데이터를 보존하는 migration으로 수행한다.

D: DB 저장 ID를 UUID v7으로 통일하기로 결정했다. 아직 구현하지 않았으며 현재 저장 형식이나 vendor 고유 ID 변경으로 설명하지 않는다.

서버 라이브러리 후속 결정:

서버·daemon은 `node:http`, `ws`, 공식 MCP TypeScript SDK, Zod, `node-pty`, TypeORM, `better-sqlite3`를 채택한다. 별도 HTTP framework·event bus·추상화를 미리 추가하지 않는다. TypeORM 도입과 첫 배포 전·후 DB 변경 정책은 앞의 저장 계약을 따른다. 실제 설치 단계에 Node >=22.12.0·SDK 호환성·지원 OS/CPU를 확인해 버전을 선택하며 채택과 설치·통합 검증 완료를 구분한다. YAML parser와 Web 세부 의존성은 실제 사용하는 단계에서 정한다.

#### 20. 설정 편집, 터미널 커스터마이징, keyboard

**Terminal·shell과 상속의 의미**

Terminal은 화면과 입력을 제공하고, shell은 명령을 해석하고 실행한다.

| 터미널 | 그 안에서 실행하는 shell |
| --- | --- |
| Ghostty | zsh·bash 등 |
| macOS Terminal 앱 | zsh·bash 등 |
| AIOX Web terminal | daemon이 새로 실행한 shell |

```text
Ghostty의 zsh에서 cd ~/projects/my-app → aiox daemon start
→ daemon이 작업 경로·환경변수를 물려받음
→ Web에서 새 terminal 생성
→ daemon이 새 PTY와 별도 shell 생성
→ 설정·생성 요청을 반영한 작업 경로와 실행 환경 전달
```

| 전달될 수 있는 것 | 그대로 공유되지 않는 것 |
| --- | --- |
| 작업 경로, PATH 같은 환경변수 | 원래 터미널 창·화면·스크롤 기록 |
| 환경변수로 내보낸 값 | 원래 shell 프로세스·실행 중인 작업 |
| TERM_PROGRAM 같은 터미널 식별 환경변수 | 원래 shell의 일반 변수·alias 등 메모리 상태 |

새 shell이 초기화 파일을 읽어 같은 alias를 설정할 수는 있지만 원래 shell 상태를 복제한 것은 아니다. TERM_PROGRAM에 ghostty가 남아 있는 경우도 환경변수 상속의 사례이지 Ghostty를 Web에 띄웠다는 뜻이 아니다. 이는 현재 AIOX가 해당 값을 그대로 전달한다는 보장이 아니며 실제 터미널 식별값은 공통 터미널 계층의 구성을 따른다.

설정·검증 계약은 [Web 설정 spec](../docs/specs/aiox-configuration-web.md), PTY·화면 관리 책임은 [터미널 architecture](../docs/architecture/aiox-storage-terminal.md)를 따른다.

**새 Web shell의 공통 실행 설정**

Windows·macOS·Linux 모두 config.json의 terminal 설정을 사용한다. 시작 shell을 자동 추정하지 않고 실행할 shell을 명시적으로 선택할 수 있다.

| 필드 | 의미 | 생략 시 |
| --- | --- | --- |
| shell | 실행할 shell의 이름 또는 경로 | Windows: COMSPEC 또는 cmd.exe; macOS·Linux: SHELL 또는 /bin/bash |
| args | shell에 전달할 인자 배열 | 추가 인자 없음 |
| cwd | 선택한 shell의 시작 폴더 | 기존 daemon 작업 경로 동작 |

SHELL은 현재 실행 중인 shell을 항상 정확히 나타내지 않는다. PowerShell에서 daemon을 시작해도 Web 기본 shell이 PowerShell로 자동 선택되는 것은 아니다. Windows 실행 파일은 CMD cmd.exe, PowerShell 5.1 powershell.exe, PowerShell 7 pwsh.exe 등을 선택할 수 있다.

Windows PowerShell 7:

```json
{
  "terminal": {
    "shell": "pwsh.exe",
    "args": [],
    "cwd": "C:\\projects\\my-app"
  }
}
```

Windows에서 WSL 배포판 선택:

```json
{
  "terminal": {
    "shell": "wsl.exe",
    "args": ["-d", "Ubuntu"],
    "cwd": "/home/user/projects/my-app"
  }
}
```

macOS:

```json
{
  "terminal": {
    "shell": "/bin/zsh",
    "cwd": "/Users/user/projects"
  }
}
```

Linux:

```json
{
  "terminal": {
    "shell": "/bin/bash",
    "cwd": "/home/user/projects"
  }
}
```

- WSL의 cwd는 선택한 배포판 내부 Linux 경로다. Windows PTY의 작업 경로와 구분하며 프로그램 설치·WSL 버전 변환은 설정의 역할이 아니다.
- 새 일반 Web shell 생성 시 최신 설정을 읽는다. 기존 터미널·실행 중인 프로그램을 바꾸지 않으며 vendor 실행 PTY나 외부 사용자 터미널의 설정에 적용하지 않는다.
- 명시적인 생성 요청 cwd는 전역 기본 cwd보다 우선한다.
- daemon 시작 전에 실행 파일·cwd의 유효성을 검사하고 실패하면 DB·listener 준비 전에 거절한다. 새 shell 생성도 최종 요청을 검증하며 실패해도 기존 실행은 유지한다.
- WSL은 배포판·사용자를 반영해 Linux cwd를 검사한다. 검사에서 사용자 command tail을 실행하지 않으며 해석할 수 없는 실행 옵션은 거절한다.
- 사전 검사는 실행 파일 형식·초기화 성공까지 보장하지 않는다. 검증 이후 실제 실행 오류도 전달한다. Windows 실행 파일 ACL의 사전 보장 한계는 관련 spec을 따른다.
- 잘못된 shell/cwd를 마지막 유효 값으로 조용히 대체하지 않는다. 아래 화면·keyboard 설정의 반영 정책과 실행 설정의 시작·생성 거절을 구분한다.

**daemon 실행 환경과 중첩 shell**

```text
daemon 실행 환경
→ AIOX가 Web terminal에 처음 만든 shell
→ 사용자가 실행한 다른 shell·프로그램

AIOX의 bash → PowerShell 실행
→ PowerShell이 입력 대기 중이어도 bash 기준으로는 작업 실행 중
```

Windows daemon이 wsl.exe를 실행해도 종료 정책의 기준은 Windows다. WSL 내부 Linux Node로 daemon을 시작하면 Linux 정책을 적용한다. 안쪽 shell의 idle까지 추적하지 않는다. Windows→WSL 일반 shell 설정 지원을 vendor의 path·IPC·credential·MCP 혼합 연동 전체 지원으로 확대하지 않는다.

D: 운영 Web에서도 config.json을 편하게 수정하고 파일과 동기화할 수 있어야 한다. cmux처럼 terminal·keyboard 설정을 제공하고 Web 일반 theme과 구분한다.

D: 사용자는 파일 저장 감지에 따른 자동 적용 방식을 수용했다. 별도 `aiox config apply` 명령은 추가하지 않는다. 파일 직접 편집과 Web 저장은 같은 검증·적용 규칙을 사용한다. Web에서는 미리보기 후 저장하면 전역 적용하며 연결된 여러 Web 탭에도 변경을 배포한다.

| 설정/상황 | 저장 후 적용 계약 |
| --- | --- |
| 터미널 폰트·색상, AIOX 단축키 | 연결된 Web에 즉시 반영 |
| terminal.shell/args/cwd | 새 일반 Web shell 생성 시 검증·적용. 기존 실행 유지 |
| daemon·운영 Web 포트 | 다음 daemon 시작에 적용. Web에 저장됨·재시작 후 적용 표시 |
| 잘못된 화면·keyboard 설정 | 마지막 유효 설정 유지, 오류 표시. shell/cwd 시작·생성 검증은 위 계약 적용 |
| daemon이 꺼진 동안 파일 수정 | 다음 시작 시 읽고 검증하여 적용 |

D: 설정 저장으로 daemon을 자동 재시작하거나 Agent를 종료하지 않는다. 파일 변경 이벤트는 짧게 묶어 검증된 설정만 반영한다. 정확한 감지 방식·대기 시간은 구현 상세로 남긴다.

```text
Web 설정 수정·미리보기 → 저장 요청 → Server 검증 → config.json 저장
→ 확정 설정 배포 → 기존 terminal renderer에 적용

외부 편집기에서 파일 수정 → Server 감지·검증 → 유효 설정 적용·배포
```

- D: 화면·keyboard의 잘못된 설정은 마지막 유효 설정을 유지하고 오류를 표시한다. shell/cwd 오류는 시작·생성 거절 계약을 따른다. P: 동시 편집의 설정 저장 충돌을 조용히 덮어쓰지 않는 UX를 둔다.
- P: font/color/cursor/lineHeight/terminal palette를 미리보기하고 저장·기본값 복원·파일 위치·실패를 표시한다.
- “runtime 때 변경되는 JSX 라이브러리”라는 질문은 특정 library를 확정한 것이 아니다. xterm 옵션과 React 설정 state로 적용할 수 있다는 제안을 했다.
- font/size 변경은 terminal fit/resize를 다시 계산해야 한다. terminal theme을 바꿔도 vendor가 명시적으로 그리는 모든 UI element를 임의 스타일링할 수 있다는 보장은 없다.
- Web의 AIOX terminal에 적용하는 font/theme과 외부 일반 터미널/cmux/VS Code의 설정은 다르다. 외부 앱의 appearance를 AIOX config 하나로 바꾸겠다고 약속하지 않는다.
- keyboard는 AIOX pane/탭 명령과 vendor TUI로 전달하는 키를 구분한다. Ctrl+O 등의 vendor 동작·브라우저 예약 키와 충돌하는 바인딩을 처리해야 한다.
- terminal CSS/theme 적용을 위해 headless model UI를 만들 필요는 없다.
- O: [xterm ITerminalOptions](https://xtermjs.org/docs/api/terminal/interfaces/iterminaloptions/).

#### 21. 운영 Web, 다국어, 상태 관리와 Node 라이브러리

터미널 작업 화면과 초기 layout의 확정 방향(구현 완료 보고가 아님):

```text
AIOX Web
├─ 사이드바
│  ├─ 일반 터미널
│  ├─ Hosts
│  │  ├─ development
│  │  └─ review
│  └─ Networks
│     └─ dev
└─ 선택한 작업 화면
   └─ 분할 영역
      └─ 영역별 탭 묶음
         └─ 실제 PTY 터미널

┌─[Claude][Shell][+]──────┬─[Codex][+]────────────┐
│                        │                      │
│                        ├─[Reviewer •][+]──────┤
│                        │                      │
└────────────────────────┴──────────────────────┘
```

- 탭·분할은 Host 전용이 아닌 공통 Web 터미널 기능이다. Host는 실행 묶음, Network는 통신 경계, layout은 화면 배치다. Network 선택은 Agent·route 조회로 연결한다.
- 각 영역의 탭은 독립적으로 전환한다. Host 전체 배치를 넘기는 페이지 탭은 사용하지 않는다. 탭을 다른 영역으로 드래그하면 이동하고 가장자리에 놓으면 상하좌우 새 분할을 만든다. 드롭 위치를 미리 보여주며 마지막 탭을 옮긴 빈 영역은 합친다. 초기 이동 범위는 같은 작업 화면 내부다.
- 경계선을 드래그해 너비·높이를 조절한다. 행·열을 다시 계산해 PTY resize를 전달한다. 현재 영역 확대·기존 배치로 복귀, 명시적 분할 크기 균등화를 제공한다. 탭 이동·확대·resize는 프로세스·대화·Network를 변경하지 않는다.
- 영역별 `[+]` 메뉴는 새 shell 터미널, 오른쪽 분할, 아래쪽 분할을 제공한다. 새 shell 탭은 현재 영역에 추가하고 Host에서는 해당 Host 작업 경로를 사용한다. shell 추가로 기존 화면 전체를 자동 재배치하지 않는다.
- 일반 shell에서는 git·pnpm 등 명령과 일반 Claude/Codex TUI도 실행할 수 있다. 직접 vendor CLI를 실행하는 것은 AIOX Agent 자동 등록이나 MCP/binding 주입이 아니다.
- Host 없이 일반 터미널에서 `aiox network create dev` → 단축키로 shell 분할 → 각 shell에서 `aiox agent run claude --network dev`, `aiox agent run codex --network dev`도 지원한다. 기존 터미널에서 실행하고 등록 때문에 새 탭을 중복 생성하지 않는다. Agent 종료 후 원래 shell로 돌아온다. 화면 분할로 Host·Network를 자동 생성하지 않는다.

각 영역의 추가 메뉴와 standalone 실행 흐름:

```text
[+]
 ├─ 새 shell 터미널
 ├─ 오른쪽으로 분할
 └─ 아래쪽으로 분할

일반 터미널 열기 → Network 생성 → 단축키로 분할
→ 각 shell에서 standalone Agent 실행 → 종료 후 원래 shell로 복귀
```

```sh
aiox network create dev
aiox agent run claude --network dev
aiox agent run codex --network dev
```

**Host 초기 layout**

| host.layout.preset | 초기 영역 배치 |
| --- | --- |
| auto (기본) | 1개 전체, 2개 좌우, 3개 왼쪽 하나+오른쪽 위아래, 4개 2×2 |
| left-main | 왼쪽 하나+오른쪽 위아래, 최대 3개 영역 |
| top-main | 위쪽 하나+아래쪽 좌우, 최대 3개 영역 |
| grid | columns × rows 영역 |

```text
auto: 2개        auto: 3개        auto: 4개
┌────┬────┐     ┌────┬────┐     ┌────┬────┐
│ A  │ B  │     │    │ B  │     │ A  │ B  │
│    │    │     │ A  ├────┤     ├────┼────┤
│    │    │     │    │ C  │     │ C  │ D  │
└────┴────┘     └────┴────┘     └────┴────┘

2열 × 1행, Agent 6개
┌─[A][C][E][+]────┬─[B][D][F][+]────┐
│ 선택한 A        │ 선택한 B        │
└─────────────────┴─────────────────┘
```

영역 수를 넘는 Agent는 선언 순서대로 기존 영역에 돌아가며 탭으로 추가하고 기존 선택 탭을 유지한다. 예를 들어 2열·1행에서 A/C/E는 왼쪽, B/D/F는 오른쪽 탭이 된다. 불필요한 빈 영역은 만들지 않는다. 초기 배치 이후 사용자가 조정한 배치를 자동으로 원상복구하지 않는다.

**설정·YAML·CLI**

전역 `~/.aiox/config.json` 예시(너비 240은 예시이며 실제 기본값은 UI 구현 때 결정):

```json
{
    "web": {
        "sidebar": {
            "width": 240
        }
    },
    "host": {
        "layout": {
            "preset": "auto"
        }
    },
    "keybindings": {}
}
```

Host YAML의 초기 배치 예시:

```yaml
host:
  name: development
  layout:
    preset: grid
    columns: 2
    rows: 2
```

```sh
aiox host run --layout auto
aiox host run --layout left-main
aiox host run --layout top-main
aiox host run --layout grid --columns 2 --rows 2
```

- layout 우선순위는 CLI → YAML → 전역 config → 기본 auto다. 상위에서 preset을 바꾸면 하위의 다른 preset용 행·열을 섞지 않는다.
- columns·rows는 grid용 양의 정수다. YAML에 행·열만 지정하면 grid 생략형으로 해석한다. 다른 preset과 행·열의 충돌은 오류로 알린다. auto에서는 숫자 행·열 대신 preset 자체로 1~4개 배치를 선택한다.
- 사이드바 너비는 전역 `web.sidebar.width`로 제공하고 DB에 중복 저장하지 않는다. Web 설정에서 저장해도 같은 전역 config를 갱신한다. 실제 터미널 목록·분할 방향/비율·탭 순서·선택 상태는 작업 화면별로 서버에서 유지·복원한다. 초기 layout 설정 변경이 현재 사용자 배치를 강제 재배치하지 않는다.
**포커스·알림·단축키**

```text
브라우저 활성 + 대상 터미널에 실제 포커스
→ 소리·토스트 생략

다른 영역·숨겨진 탭·비활성 브라우저
→ 탭 알림 표시 + 알림 목록 + 소리
```

- 포커스된 영역의 테두리·선택 탭을 강조하고 비활성 영역의 강조는 줄인다. 터미널 본문 색상은 사용자 설정을 유지한다. 방향별 포커스 이동과 현재 포커스 영역을 잠깐 강조하는 기능을 제공한다.
- 알림 포커스 판단은 실제 대상 terminal 기준이다. 브라우저가 활성이고 해당 terminal에 포커스가 있으면 소리·토스트를 생략한다. 다른 영역·숨겨진 탭·비활성 브라우저에서는 탭 알림 표시와 목록·소리를 제공한다. 클릭하면 대상 영역의 탭을 선택하고 포커스를 이동하며 읽음 처리한다. 상태·이벤트 기록은 유지하고 짧게 몰린 알림의 소리는 한 번만 울린다.
- 단축키 동작은 새 shell 탭, 분할, 탭 전환, 방향별 포커스, 영역 확대·복귀, 크기 균등화, 포커스 강조, 사이드바 토글이다. 전역 keybindings에서 재지정할 수 있게 한다. 브라우저를 사용하는 OS 기준으로 macOS·Windows·Linux 기본키를 적용하며 Windows 브라우저→WSL 서버는 Windows 기준이다.
- 정확한 기본 키 조합과 OS별 keybindings schema는 구현 때 사용자와 논의한 후 정한다. cmux의 조작을 참고하되 브라우저 예약키와 터미널 프로그램 입력을 보존한다. Cmd→Ctrl 단순 치환을 확정하지 않는다.
- Web 일반 테마는 localStorage에 system/light/dark 선택을 저장한다. system은 OS 테마를 따르며 터미널 theme과 별개다.

**저장 책임**

| 대상 | 저장 |
| --- | --- |
| 사이드바 너비 | 전역 config |
| 터미널 폰트·색상·키 설정, 사용자 단축키 | 전역 config |
| Host 초기 layout 기본값 | 전역 config |
| Host별 초기 layout | YAML·CLI |
| 실행 중 터미널·분할 비율·탭 순서·선택 상태 | 서버에서 유지·복원 |
| Web 테마 system/light/dark | localStorage |

브라우저를 닫아도 실행은 유지하고 다시 열면 기존 터미널 화면·배치·놓친 알림으로 복귀한다. 설정 저장과 실행 화면 복원은 다른 책임이며 사이드바 너비를 DB에 중복 저장하지 않는다. 알림 전체 읽음과 실제 승인·질문 해결의 구분은 기존 알림 정책을 따른다.

참고 근거: [cmux 영역·탭 개념](https://cmux.com/docs/concepts), [분할 UX](https://manaflow-ai-cmux.mintlify.app/features/splits-and-panes), [단축키](https://cmux.com/docs/keyboard-shortcuts), [Paseo 현재 영역에 터미널 추가 테스트](https://github.com/getpaseo/paseo/blob/main/packages/app/e2e/browser/direct-terminal-shortcut-pane-placement.spec.ts). 문서·소스 조사 근거이며 AIOX 구현 또는 해당 테스트 실행 완료를 뜻하지 않는다. cmux의 초기 배치 정책을 복제했다는 뜻도 아니다.



D: 운영 Web은 Tailwind와 shadcn/ui를 사용하고 다국어를 제공한다. 사용자의 “intl i8”는 i18n/Intl 기반 처리 의도로 이해했다. library 이름 자체는 아래 제안과 구분한다.

| 영역 | 제안/현재 근거 |
| --- | --- |
| 운영 Web framework | 현재 React/Vite는 재사용 후보. 기존 구현 유지가 필수라는 뜻 아님 |
| 운영 Web i18n | use-intl 후보 |
| 공개 사이트 i18n | Next.js를 선택하면 next-intl 후보 |
| 언어 | 한국어·영어로 시작 제안 |
| 전역 UI state | Zustand는 pane/설정/알림 공유 state의 실제 필요에 따라 사용 |
| HTTP 조회 cache | TanStack Query는 history pagination/search 등 구체 필요가 있을 때 사용 |
| 실시간 상태 | Gateway snapshot/event의 단일 projection. 여러 store/cache가 같은 authority를 따로 소유하지 않음 |

- UI·AIOX 오류 설명을 번역하고 agent 출력·vendor 오류 원문은 무조건 번역하지 않는 방향을 제안했다.
- O: use-intl은 Next.js와 독립적인 React core이며 next-intl과 유사 API를 제공한다. [Core library](https://next-intl.dev/docs/environments/core-library).
- O: [shadcn 설치](https://ui.shadcn.com/docs/installation), [Zustand createStore](https://zustand.docs.pmnd.rs/reference/apis/create-store.html).

R/P: root/apps manifests를 읽고 다음 기존 의존을 우선 후보로 제안했다. 설치돼 있다는 이유로 유지가 강제되지는 않는다.

| 책임 | 후보 |
| --- | --- |
| HTTP / file / process / socket | Node 기본 모듈 |
| WebSocket | ws |
| MCP | 기존 @modelcontextprotocol SDK의 HTTP transport |
| PTY | node-pty |
| SQLite | better-sqlite3 |
| 설정·입력 검증 | zod |
| Host YAML | yaml |
| CLI | commander 또는 실제 명령 복잡도에 맞는 parser |
| 테스트 | 기존 Vitest / Node test |

- 현재 MCP SDK alpha, node-pty beta 등이 manifest에 존재하지만 새 제품에서 해당 버전을 무조건 유지하거나 “최신 안정”이라고 부르지 않는다. 실제 호환 버전은 구현 때 정한다.
- Express/Fastify, ORM, 별도 event bus, hotkey/state/audio library를 사전 전부 추가하지 않는다. 실제 책임과 기존 수단으로 해결되지 않는 비용이 확인될 때 선택한다.

#### 22. 알림 목록, 포커스와 알림음

D: 알림은 목록으로 보이고 클릭하면 해당 terminal로 이동·읽음 처리해 미확인 목록에서 사라진다. “전체 알림 확인”으로 현재 미확인 항목을 모두 읽음 처리한다. 읽었다고 실제 승인이나 오류가 해결된 것은 아니다.

```text
A 승인 필요 → 알림 생성
클릭        → A terminal 이동 + 해당 알림 읽음
TUI 응답 전 → Runtime의 입력 대기 표시는 유지
```

D: 사용자가 Web의 terminal A에 실제 focus 중이면 A에 대해 추가 알림이 필요 없다. 이 정정은 초기 무조건 알림보다 우선한다.

| 관측 시 사용자 상태 | 목표 처리 |
| --- | --- |
| 활성 브라우저 창·활성 tab에서 A terminal focus | A의 팝업·소리·미확인 항목을 억제하고 TUI/상태만 표시하는 방향 |
| B terminal focus | A 알림을 미확인 목록에 추가 |
| tab/window background | 선택된 pane만 보고 읽은 것으로 간주하지 않음 |
| Web 닫힘 | Server가 미확인 알림을 유지하고 재방문 때 표시 |

- D/P: 짧은 시간에 알림이 여러 개 오면 각 항목은 남기되 소리는 한 번 울리는 방향을 사용자가 제안했다. 구체 묶음 시간은 미결이며 임의 숫자를 계약으로 만들지 않는다.
- P: 같은 미해결 요청의 반복 관측은 기존 알림 갱신으로 처리하고 다시 울리지 않는다. 별도의 새 요청은 새 알림이다.
- P: 여러 Web 탭에서 같은 알림음이 중복 재생되지 않게 하나의 재생 주체를 정한다. exact coordination 방식은 미결이다.
- P: 부드러운 짧은 2음 차임을 승인/입력에, 짧은 낮은 차임을 실패에 사용하는 제안을 했다. 소리 선택은 사용자 확정이 아니며 on/off·volume·미리 듣기 UI 후보를 남긴다.
- P/O: Web Audio API로 충분할 수 있다. 브라우저 autoplay 때문에 최초 “소리 켜기/미리 듣기” 조작으로 활성화하는 UX를 고려한다. Web이 닫혀 있어도 OS에서 소리를 내는 별도 native notification은 이번 요구에 추가하지 않는다.
- O: [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices).

#### 23. 브라우저 복귀: 사용자가 확인한 정확한 의미

D: Web을 실수로 닫아도 aiox server가 살아 있으면 Claude·Codex와 PTY는 계속 살아 있어야 한다. 다시 Web을 열면 기존 Host·Agent, terminal 배치, 각 terminal의 현재 화면과 미확인 알림이 복원돼야 한다.

```text
Web 닫힘 → 화면 attachment만 해제 → Agent/PTY 작업 지속
Web 재방문 → 살아 있는 Server에 자동 연결 → snapshot → 기존 Runtime/Terminal 연결
          → 기존 pane 배치·현재 화면·미확인 알림 표시
```

- “작업 중인 terminal에 다시 연결”이라는 설명에 사용자가 의미를 물었다. 새 Claude/Codex를 실행하는 것이 아니라 **동일한 terminal의 현재 화면**을 다시 보여 주는 것으로 정정했고 사용자가 수용했다.
- 작업 중, 완료, 승인 대기, idle인 terminal 모두 대상이다. 닫기 직전의 오래된 이미지가 아니라 계속 진행된 현재 화면을 보여 준다.
- browser tab close/unmount/disconnect를 agent.stop/terminal.stop으로 연결하지 않는다. 명시적 종료 명령과 분리한다.
- R: 현재 GatewayStore 재접속은 기존 page lifetime 기반이고 credential은 메모리에 있다. 이것만으로 완전 재방문 요구 충족이라고 말할 수 없다.
- D: 재방문 때 사용자에게 로그인·토큰 입력 등 별도 인증 절차를 요구하지 않는다. 이전 “복귀 인증” 미결 항목은 기존 구현 제약을 사용자 요구처럼 올린 것이므로 제거한다. 내부 연결 보호는 이 자동 복귀 UX를 충족하도록 구현하며 별도 사용자 결정으로 재요청하지 않는다.
- P/Q: workspace/pane 식별·배치 저장은 운영 Web 통합에서 구체화한다. 공통 terminal 화면 복원은 아래의 채택된 기반을 사용하며 단순 WS reconnect만으로 완료로 보지 않는다.
- 범위는 **server가 살아 있는 동안의 Web 복귀**다. server restart 뒤 기존 외부 프로세스 재attach·자동 실행·durable message replay는 별도 요구이며 자동 추가하지 않는다.

**공통 터미널의 화면 유지·복원 — 채택된 기반**

이 화면 관리·복원 경로는 daemon 소유 AIOX 터미널에 적용한다. 외부 `agent run`은 사용자 터미널 입출력을 사용하므로 AIOX PTY·headless·xterm·SerializeAddon 경로를 거치지 않는다. 공통 터미널은 서버의 PTY와 세션당 하나의 xterm headless로 실행과 화면 상태를 유지하고, 브라우저 xterm으로 화면을 표시하고 입력을 전달한다. 일반 shell과 터미널 프로그램에 공통으로 적용하며 Claude 전용 처리가 아니다. 여기서 headless는 터미널 VT 상태 엔진으로, 제외한 LLM headless 실행과 다르다. Ghostty는 구현 원리의 참고 대상이며 현재 서버·브라우저 터미널 엔진은 xterm이다.

```text
서버 — PTY 세션마다
├─ PTY: shell·Claude·Codex 등 프로그램 실행·바이트 입출력
├─ xterm headless: 화면·커서·모드·크기 유지
└─ 복원 처리: SerializeAddon + 누락 상태 보완
                         ↕ WebSocket
브라우저
└─ xterm: 화면 렌더링·키보드와 마우스 입력
```

```text
PTY 출력 → 서버 상태 갱신 → 같은 경계의 snapshot·보류 출력 확보
Web 접속 → snapshot 크기 적용 → 화면 파싱·상태 보완
         → 보류 출력·resize 재생 → 이후 출력·resize·exit 처리
         → 현재 pane 크기 요청
```

복원은 최근 64KiB raw 출력 재생을 대체한 SerializeAddon의 화면 바이트와 누락 상태 보완 데이터를 함께 사용한다. 화면·현재 커서뿐 아니라 저장 커서·문자 속성·문자 집합·스크롤 영역·탭 위치·입력 모드 등을 복원해 이후 프로그램의 출력과 입력도 정상적으로 이어져야 한다. xterm이 이미 관리하는 실제 상태를 활용하며 내부 접근은 고정 vendor 버전과 복원 회귀 검사로 관리한다.

공통 attachment가 snapshot과 이후 이벤트의 누락·중복 없는 순서를 책임진다. snapshot 크기로 화면 파싱과 상태 보완을 마친 뒤 현재 pane 크기를 요청하며, 서버 PTY·미러·브라우저는 같은 resize 순서를 따른다. 복원 중 과거 조회에서 발생한 자동응답은 현재 PTY 입력으로 전달하지 않는다. 정상 live 조회 응답과 사용자 입력은 별도로 유지한다.

미완성 UTF-8·제어 시퀀스는 xterm의 parser·decoder를 재사용해 안전한 경계의 snapshot과 보류 출력·resize로 이어서 복원한다. 시퀀스가 끝날 때까지 접속을 기다리는 방식이 아니다. 미완성 출력의 보관 한도를 넘으면 새 화면 복원만 이유를 표시하고 일시 거절한다. 기존 PTY·viewer는 유지하며 안전한 경계로 돌아오면 새 복원을 다시 허용한다. 정상적인 연속 출력이나 단순 청크 분할을 이 오류로 취급하지 않고, 잘린 데이터를 정상 snapshot으로 보내지 않는다.

브라우저 연결 해제는 PTY 종료가 아니다. Stage 2-1은 공통 복원 기반을 완료했고, Stage 6는 이를 React 운영 UI·탭·분할·배치 복귀에 통합한다. React가 서버의 VT 상태 엔진을 대체하지 않는다.

Stage 2-1에서 채택·설치한 조합은 서버 `@xterm/headless` 6.0.0·`@xterm/addon-serialize` 0.14.0, 브라우저 `@xterm/xterm` 6.0.0이다. 버전은 현재 구현 기준이며 업데이트 때 복원 보완과 회귀 검사를 함께 확인한다. 구조와 구현 근거는 [터미널 architecture](../docs/architecture/aiox-storage-terminal.md), 외부 동작은 [Web spec](../docs/specs/aiox-configuration-web.md), 검증 경위와 한계는 [Stage 2-1 로그](2026-09-10-AIOX-TUI-Stage2-1-Terminal-Snapshot.md)를 따른다.

#### 24. 포트, CLI와 공개 사이트

**AIOX 메시지 언어**

D: AIOX가 생성하는 CLI 출력과 Agent에게 전달하는 시스템·자동 알림 메시지는 영어로 통일한다. 오류·경고·안내·성공·상태·시작 및 종료 메시지를 포함한다. 사용자 작성 본문과 vendor 출력은 원문을 유지한다. 운영 Web의 UI 문구(오류·성공·알림 표시 포함)는 기존 다국어 정책을 따른다.

D: 기본 port가 있어야 하고 전역 설정 파일과 CLI 시작 인자로 바꿀 수 있어야 한다. 사용자는 daemon port 및 Host·standalone을 사용하는 React 운영 Web port를 각각 설정할 수 있도록 요청했다.

P: 앞선 단일 listener 후보 대신 daemon용과 운영 Web용 port를 구분하는 구성을 추천한다. daemon의 한 Node 프로세스가 두 listener를 소유할 수 있으므로 두 port가 별도 server 프로세스를 요구하지 않는다. 운영 Web은 여러 Host·standalone을 함께 표시하는 공용 진입점으로 해석하며 Host마다 Web listener를 생성하지 않는 것을 제안한다. Web listener에서 필요한 API/WS를 daemon 기능으로 연결하는 상세는 구현에서 정한다. 개발용 Vite port와 배포 운영 Web port를 혼동하지 않는다.

```text
한 daemon 프로세스 (제안)
├─ 127.0.0.1:4500 — daemon API / Gateway / HTTP MCP
└─ 127.0.0.1:4501 — 공용 운영 Web 진입점
```

- 4500/4501은 기본값 제안이며 최종 확정값이 아니다. port 충돌 대처는 구현 계약에서 정한다.
- P: CLI --port > config.json > default. CLI override는 이번 실행에만 적용하고 파일을 자동 수정하지 않는다.
- D: 사용 중인 server의 port 설정을 Web에서 저장하면 다음 시작에 적용한다고 표시한다. 살아 있는 MCP 연결을 즉시 다른 port로 옮기지 않는다. 설정 적용 방식은 §20을 따른다.
- P: aiox open은 실제 실행 endpoint를 찾는다. 포트 변경 시 localStorage가 origin별이라는 점 때문에 browser theme/인증의 이동 의미도 구분한다.
- D: generic `aiox agent run claude`, `aiox agent run codex` 방향. Host 다중 실행도 같은 runtime 주입을 사용한다. legacy alias 유지 필요는 없으며 pre-v1 전제다.
- D: Host는 `aiox host run`과 `aiox host run --worktree <branch>`로 현재 프로젝트/별도 Git Worktree 실행을 구분한다. 내부 Git 작업과 Host namespace·Network 관계는 §7을 따른다.
- R: 신규 CLI의 start/open/status/stop/doctor 및 start --port 파서는 기존 구현 관찰이다. 아래 사용자 지정 명령 체계가 목표이며 기존 parser나 앞선 축약 예시가 이를 대체하지 않는다.
- D: Agent 메타데이터 옵션은 `--role`, `--description`, `--instruction`이다. YAML의 AIOX 지침 필드도 `instruction`으로 통일한다. 이전 복수형 옵션의 호환 alias는 추가하지 않는다. vendor 고유 필드인 Codex `developerInstructions` 등은 변경하지 않는다. `--` 뒤 인자는 adapter에 전달한다.

사용자가 지정한 기본 CLI 구조(구현 완료를 뜻하지 않음):

```text
aiox
├─ daemon
│  ├─ start
│  ├─ stop [--force]
│  ├─ restart
│  └─ status [--json]
├─ adapter
│  ├─ install <package>
│  ├─ uninstall <adapter>
│  ├─ list
│  ├─ show <adapter>
│  ├─ setup <adapter> [-- <adapter-options>]
│  └─ doctor [adapter]
├─ agent
│  ├─ run <adapter>
│  │  ├─ --name <name>
│  │  ├─ --network <network>                 # 하나만 선택
│  │  ├─ --role <role>
│  │  ├─ --description <description>
│  │  ├─ --instruction <instruction>
│  │  └─ -- <adapter-options>
│  ├─ list [--network <network>] [--host <host>] [--all] [--json]
│  └─ show <agent> [--json]
├─ network
│  ├─ create <name> [--default <allow|deny>]
│  ├─ delete <network>
│  ├─ list [--all] [--json]
│  ├─ show <network> [--json]
│  └─ route <network>
│     ├─ --default <allow|deny>
│     ├─ --allow-between <agents...>
│     ├─ --deny-between <agents...>
│     ├─ --reset-between <agents...>
│     ├─ --allow-from <agent> --to <agents...>
│     ├─ --deny-from <agent> --to <agents...>
│     └─ --reset-from <agent> --to <agents...>
├─ host
│  ├─ run
│  │  ├─ --layout <auto|left-main|top-main|grid>
│  │  ├─ --columns <number>
│  │  ├─ --rows <number>
│  │  ├─ --path <aiox.yaml>
│  │  ├─ --name <host>
│  │  └─ --worktree <branch>
│  ├─ list [--json]
│  ├─ status <host> [--json]
│  ├─ stop <host>
│  ├─ agent
│  │  ├─ start <host> <agent-names...>
│  │  └─ stop <host> <agent-names...>
│  └─ network
│     ├─ list <host> [--json]
│     ├─ show <host> <network> [--json]
│     └─ route <host> <network>
│        ├─ --default <allow|deny>
│        ├─ --reset-default
│        ├─ --allow-between <agents...>
│        ├─ --deny-between <agents...>
│        ├─ --reset-between <agents...>
│        ├─ --allow-from <agent> --to <agents...>
│        ├─ --deny-from <agent> --to <agents...>
│        ├─ --reset-from <agent> --to <agents...>
│        └─ --json
├─ status [--json]
└─ doctor [--json]
```

사용자 제공 Commander 코드·주석의 의미:

- D: network create의 기본 routing 정책은 allow다. 명시 edge rule이 없으면 Network default를 적용한다. list는 기본 persistent만, --all은 host-managed도 포함한다. show는 host-qualified Network도 받는다. 동적 가입·탈퇴 명령은 제공하지 않는다.
- D: route 호출은 한 번에 한 종류의 변경이다. between은 자기 자신을 제외한 모든 상호 directed edge로 전개한다. from은 --to가 필수이며 --to 단독도 오류다. Persistent Network reset은 명시 edge rule을 제거해 Network default로 돌아간다. Host reset의 상속 순서는 아래 계약을 따른다.
- D: Persistent route의 endpoint는 해당 Network에 참여 중인 Agent의 이름 또는 Runtime ID로 지정한다. 모든 대상을 ID 우선·이름 순으로 해석·검증한 뒤 Runtime ID로 저장한다. 같은 실행을 반복 지정해도 endpoint는 한 번만 적용한다. Network 또는 대상 부재·다른 Network 대상은 전체 변경을 거절하고 CLI에 오류를 표시해 해당 명령만 실패 종료한다. default만 변경할 때는 endpoint가 필요하지 않다.
- D: default allow에서 A→B allow만 설정해도 B→A는 허용된다. 단방향 통신에는 B→A deny가 필요하며 reset은 차단이 아니다.
- D: Agent 이름은 참여 Network 안에서 유일하다. 준비 중·정리 대기 중인 등록도 이름을 예약하며 중복 등록을 거절한다. 다른 Network의 같은 이름은 허용한다. Network 미참여 실행의 이름 정책까지 확대하지 않는다.
- D: 일반 Agent resolver는 이름/ID/host-qualified 이름을 지원하고 Network 범위 없는 조회에서 여러 실행의 이름이 일치하면 모호성 오류와 후보를 제공한다. standalone 실행은 foreground이며 종료는 Ctrl+C·/exit 등 세션에서 수행한다. 별도 agent stop/attach/detach는 deferred다. Host 이름은 실행 중 daemon 범위에서 유일하고 `/`는 qualified name 구분자로 예약하므로 Host/Agent/Network 사용자 이름에는 허용하지 않는다.
**daemon 소유권·환경별 종료 정책**

현재 종료 계약은 [Runtime spec](../docs/specs/aiox-runtime.md)을 따른다.

작업 판정과 프로세스 종료 대상은 daemon 소유 실행이다. 외부 사용자 터미널의 aiox agent run은 CLI 소유이며 협업 등록만으로 종료 대상이나 blocker가 되지 않는다.

| daemon 실행 환경 | 일반 stop | stop --force |
| --- | --- | --- |
| macOS·Linux·WSL 내부 | 남은 작업 없는 대기 shell 종료. daemon 소유 활성 세션·실행 중 작업·중지 작업·판정 불가가 있으면 거절 | daemon 소유 Host·Web Agent·일반 shell과 그 안의 프로그램 종료 |
| Windows native | 작업 검사 없이 daemon 소유 실행 종료. Web에서 시작한 WSL 실행도 대상 | 일반 stop과 같은 종료 대상·작업 검사 정책 |
| 모든 환경의 외부 CLI 소유 실행 | blocker 제외·vendor와 필수 부속 실행 유지·협업만 해제 | vendor와 필수 부속 실행 유지·협업만 해제 |

일반 shell의 idle은 AIOX가 처음 만든 shell의 입력 대기와 남은 작업으로 판정한다. 이전 출력·cwd 변경·Enter 전 입력은 blocker가 아니며 미제출 입력은 종료 시 버릴 수 있다. 입력을 기다리는 daemon 소유 Agent는 실행 중인 세션이며 빈 shell처럼 취급하지 않는다. 중첩 shell은 바깥 shell의 작업이고 판정 불가를 임의의 강제 종료로 대체하지 않는다.

```text
신규 실행·Web 입력 차단
→ 일반 stop이면 daemon 환경에 따라 작업 판정
   └─ 거절: 입력·실행 접수 복구
→ daemon 소유 대상 실행 종료
→ 협업 등록·자원 정리 및 실제 종료 확인
   ├─ 완료: daemon 종료
   └─ 미완료: stop_incomplete 보고
              daemon·Web·재시도 정보 유지
              입력·실행 접수 복구
```

- daemon restart는 같은 일반 stop 뒤 start다. Windows에서는 daemon 소유 작업을 중단할 수 있고 macOS·Linux·WSL에서는 blocker가 있으면 거절한다. restart --force는 제공하지 않는다.
- 종료 요청·신호 전송이나 조회 실패만으로 실제 종료 성공을 판단하지 않는다. daemon 소유 foreground·필수 부속 실행·자원 정리를 확인한다. 일부 자원 정리 후 실패할 수 있으며 남은 정리 정보를 보존한다.
- 협업 인증·발견·전송 자격 회수와 프로세스 종료·등록 삭제는 별개다. 정리 재시도는 회수한 협업 권한의 복구가 아니다.
- 외부 vendor와 필수 부속 실행은 일반 stop·force·daemon 신호 종료·비정상 종료·예기치 않은 연결 손실에도 유지한다. 자동 재연결·재등록은 없으며 협업 복구는 agent run 재실행이다. 외부 vendor 종료 뒤 로컬 자원을 정리하고 원래 shell로 복귀한다.
- MCP 연결 실패는 호출측에서 협업 불가를 진단하며 vendor를 종료하지 않는다. 서버 종료가 확인되지 않은 연결 실패의 원인을 서버 종료라고 단정하지 않는다.
- 사용자 부모 shell·터미널 앱·무관한 프로그램을 이름으로 찾아 종료하거나 WSL 배포판 전체를 종료하지 않는다. 임의 중첩 자손 전체의 종료 보장으로 확대하지 않는다.
- Persistent Network 정의·Worktree·사용자 작업 파일은 보존한다.

**명령·인증된 실행 위치와 실행 소유권**

| 명령·실행 위치 | 실행 소유자 | TUI 표시·종료 후 동작 |
| --- | --- | --- |
| 어디서든 `aiox host run` | daemon | Web에 생성·Agent 종료 상태 표시 |
| 인증된 Web terminal의 `aiox agent run <vendor>` | daemon | 기존 Web terminal·vendor 종료 후 기존 shell 복귀 |
| 외부 `aiox agent run <vendor>` | CLI | 사용자 stdin/stdout/stderr 상속·vendor 종료 후 기존 shell 복귀 |
| Web 일반 shell | daemon | Web terminal |

```text
AIOX 명령 + daemon에서 인증한 실행 문맥
→ 공통 계층이 실행 소유자·표시 위치·종료 정책 결정
→ vendor adapter가 실행 설정·협업 연결 준비
→ 소유자가 vendor와 필요한 부속 프로세스 실행
→ adapter의 준비·관측 결과를 공통 협업 관리에 반영
```

실행 위치는 환경 변수의 존재만으로 신뢰하지 않는다. 외부 실행에는 AIOX PTY·headless·xterm·SerializeAddon을 사용하지 않는다. Web은 유효한 외부 Agent 등록의 상태만 조회하며 외부 TUI를 연결·조작·이관하지 않는다. 일반 `claude`·`codex` 직접 실행은 자동 Agent 등록 대상이 아니다.

외부 CLI는 daemon 등록·credential·instruction·hook 등 주입 준비를 마친 뒤 vendor를 직접 실행한다. 제어 WS는 준비·시작·종료를 전달하며 화면 바이트·resize를 중계하지 않는다. 시작 시 daemon 연결 실패는 vendor 실행 전 오류다. 실행 중 daemon 또는 제어 연결 손실은 준비 완료 전후와 무관하게 시작한 vendor를 유지하고 협업 권한·등록을 정리한다. 관측 손실을 vendor 종료 성공으로 표시하지 않는다. heartbeat·자동 재연결·재등록은 추가하지 않으며 협업 복구는 `agent run` 재실행으로 처리한다.

명시적 최초 준비 실패는 오류와 vendor 종료 처리로 연결한다. 연결 손실과 구분하며, 현재 Claude의 준비 제한값을 모든 vendor의 공통 deadline으로 확정하지 않는다. vendor 종료 후 CLI는 daemon 정리 요청 실패와 무관하게 로컬 임시 자원을 정리하고 shell 복귀를 완료한다.

Claude 외부 inbox 임시 디렉터리는 CLI가 생성·권한·경로 검사부터 삭제까지 소유하고, daemon은 준비 시 고정한 경로와 인증된 hook 보고를 대조한다. 실제 실행 환경의 cwd/env로 버전을 검사하며 기존 주입·설정 보존·충돌 검사를 재사용한다. 외부 hook의 `ECONNREFUSED`만 stderr 없이 정상 종료하고, 401·잘못된 보고·설정 오류·timeout과 Web/Host hook 실패는 진단을 유지한다. CLI 사망 후 vendor만 남으면 hook 오류가 반복될 수 있다.

Host의 실행 중 이름 유일성·실행별 신원 분리·Agent 중복 시작 방지와 이번 시작 시도가 만든 자원에 한정한 실패 보상은 유지한다. 중복 Host 반환이나 일부 실패 시 성공 Agent 유지 정책을 추가하지 않는다.

현재 계약은 [실행 소유권 결정](../docs/decisions/execution-ownership.md), 구현·검증 경위는 [Stage 2-2 로그](2026-09-11-AIOX-TUI-Stage2-2-Execution-Ownership.md)를 따른다.

- D: adapter install/uninstall/setup/list/show/doctor 명령 표면을 유지한다. 이것이 Claude 실행의 사전 영구 MCP setup을 다시 요구하거나 다른 vendor를 이번에 전수 구현하라는 뜻은 아니다. Claude MCP는 계속 실행 시 JSON 문자열로 주입한다. provider별 설치/setup 구현 범위는 별도다.
- R(사용자 제공 코드): action은 현재 명령과 인자를 JSON으로 출력하는 골격이다. 실제 daemon/network 실행 구현이나 완전한 parser 검증이 끝났다는 증거로 취급하지 않는다. 트리의 daemon restart·agent list --all은 붙여준 코드에 빠져 있다. 사용자 후속 결정에 따라 목표 지침 옵션은 단수형이고 Network 선택은 단일 값이다. 구현 시 이 차이를 반영하며 daemon status --json은 제공 코드의 명시 옵션으로 유지한다.
- Q: 기존 Web 열기 요구의 CLI 진입점, --port를 받을 daemon 명령, --all의 Agent 조회 범위는 이 표면과 맞춰 정한다. 기본 명령 그룹·--instruction 표기·restart의 OS별 일반 stop 정책을 다시 미결로 돌리지 않는다.

Host routing override 계약:

```text
Runtime edge override
→ 없으면 Manifest edge
→ 없으면 Runtime default override
→ 없으면 Manifest default
```

- 같은 layer의 동일 directed edge에는 하나의 값만 둔다. CLI 변경은 현재 실행의 override만 바꾸며 YAML 파일을 수정하지 않는다. Host 재시작 시 override는 사라지고 manifest에서 다시 실체화한다.
- `--reset-between`/`--reset-from`은 runtime edge override를 제거한다. YAML에 해당 edge가 있으면 그 선언으로 복귀하며 무조건 Network default로 가는 것이 아니다. `--reset-default`는 runtime default override를 제거한다.
- `--default deny`로 바꿔도 manifest의 명시 allow edge는 남는다. 이는 모든 연결을 차단하는 명령이 아니다. 조회 결과는 effective policy와 runtime override/manifest edge/runtime default/manifest default 중 출처를 함께 표시한다.

Host 시작·종료 계약:

Host의 Agent 구성·Network·route 정의는 YAML이 소유한다. `host agent add/remove`와 Declared/Ephemeral 구분을 도입하지 않는다.

```text
aiox host agent start <host> <agent-names...>
aiox host agent stop <host> <agent-names...>
```

Agent는 해당 Host 안의 이름으로 하나 이상 지정한다. stop은 실행·credential·binding·활성 membership을 정리하고 Host의 항목·메타데이터·실행 설정을 stopped로 유지한다. start는 기존 항목을 새 Runtime ID·credential로 실행하며 이전 vendor 대화를 자동 resume하지 않는다. 이미 실행 중인 항목을 중복 실행하지 않고 이름별 결과를 보고한다. 보존한 Host route 설정은 새 실행 ID에 연결하며 stopped 항목에는 전달하지 않는다.

Standalone 실행 종료 또는 협업 등록 유효성 상실 시 실행 등록·membership·해당 실행 endpoint의 route를 정리한다. 정리 완료 후 이름을 재사용할 수 있으며 새 실행은 이전 route를 승계하지 않고 Network default를 적용한다. 따라서 default allow에서는 이전 B→A deny가 새 B를 차단하지 않는다. daemon 재시작 시 Network 이름·default는 유지하고 과거 Runtime의 잔존 route는 정리한다.
Host 전체 종료 시 Host·전용 Network·membership·runtime route override를 정리한다. YAML·Worktree·작업 파일과 보존 기간 내 메시지 이력은 남긴다. 다음 host run은 YAML로 새로 build하며 과거 실행이나 vendor 대화를 자동 복원하지 않는다. `host network route`는 현재 Host 실행만 변경하고 YAML에 쓰지 않는다. 개별 Host Agent의 stopped 항목·보존 route 재연결은 앞의 별도 계약을 따른다.

- 실행 전 YAML 전체, Agent 참조, Adapter 지원, Host 이름, Network를 검증한다. 실패 보상은 이번 실행에서 만든 Runtime·membership·binding·credential에 한정하고 기존 Host/사용자 작업 파일을 삭제하지 않는다. 정리 실패를 숨기고 전부 rollback됐다고 보고하지 않는다.
- `--name`이 있으면 YAML host.name의 기본값을 덮어쓴다. 같은 YAML로 현재 경로 Host와 별도 Worktree Host를 실행할 수 있게 하기 위한 선택이며, 레거시의 서로 다른 이름이면 오류 규칙은 채택하지 않는다. 실행 중인 이름과의 충돌 검사는 유지한다.

```text
aiox host stop <host>
→ HostController가 종료 상태로 전환
→ Adapter가 소유한 TUI에 종료 입력 전달
→ 실제 프로세스 종료 확인
→ AIOX가 소유한 Codex App Server 등 부속 실행 자원 정리
→ token·binding·membership·Host Network·등록 정리
→ Worktree와 작업 결과 보존
```

- 종료 입력은 요청 수단이며 입력 전달 성공은 종료 성공이 아니다. 입력 중 프롬프트/승인 화면 등에서의 정확한 키·순서·시간 제한은 미검증이다. 매번 키가 같은 의미라고 단정하거나 레거시 신호 횟수·SIGKILL 정책을 자동 이식하지 않는다. 일부 Agent 종료 실패/관측 불가를 전체 Host 종료 성공으로 처리하지 않는다.
- R: `src/host/production-agent-runtime-terminator.ts`와 `src/cli/invocation.ts`의 기존 구현은 daemon에 종료 의도를 등록한 뒤 vendor child를 소유한 CLI wrapper가 `child.kill(signal)`을 호출한다. 키보드 이벤트 종료 실측 근거가 아니다. 나중에 조회한 PID에 직접 신호를 보내기보다 실제 소유한 실행 handle을 사용하는 원칙은 유지한다.
- R: 기존 terminator의 findAgent는 listHostAgents의 실패 결과도 undefined로 반환하고 isAgentGone은 이를 부재로 판정한다. 이 경로는 관측 실패가 종료 성공으로 해석될 수 있으므로 새 구현에 그대로 가져오지 않는다. 실제 exit 관측과 조회 실패를 구분해야 한다.
- D: 사용자 설명의 `aiox quit`는 과거 종료 구상이며 현재 진입점은 `aiox host stop <host>`다. root quit alias나 Claude 영구 setup을 되살리지 않는다. 이 기록은 계약 갱신이며 종료 키 실험·제품 코드 변경을 수행한 것이 아니다.

D: YAML의 Agent별 실행 인자는 `agents.<name>.args: string[]`로 선언한다. `execute`/`excute` 필드나 호환 alias는 사용하지 않는다.

```yaml
args: ["--model", "sonnet", "--permission-mode", "plan"]
```

- block 배열과 inline 배열은 같은 `string[]`로 처리한다. `args` 생략은 빈 배열과 같다. 문자열이 아닌 요소는 입력 검증에서 거절한다.
- 배열 요소 하나는 argv 하나다. 공백을 기준으로 재분리하거나 shell 명령으로 실행하지 않는다. 공백이 포함된 값도 하나의 요소로 전달할 수 있다.
- `"--model sonnet"`을 자동으로 두 인자로 나누지 않는다. 한 인자로 전달하며 옵션의 유효성은 adapter/vendor가 판단한다.
- CLI의 `--` 이후 인자와 YAML의 `args`는 같은 adapter 실행 인자 계약으로 연결한다. YAML 배열에 구분자 `--`를 자동으로 덧붙이지 않는다.
- 실행 대상은 `adapter`가 정한다. 특히 Codex의 TUI와 App Server 중 어느 프로세스에 인자를 적용할지는 adapter가 담당한다.
- AIOX가 관리하는 MCP·credential·binding 설정과 사용자 인자의 충돌 중 Claude 필수 설정 충돌은 §6의 실행 전 거절 정책을 따른다. 구체적인 충돌 판정·병합 방식과 다른 adapter의 처리는 해당 adapter 구현 단계에서 구체화한다. 이 계약 추가는 YAML parser·launcher 구현 완료를 뜻하지 않는다.

`aiox.yaml` 구성 예시(사용자가 제공한 원래 구조에 단일 Network·instruction·Claude/Codex 범위를 적용한 목표 예시이며 현재 parser의 지원 완료를 뜻하지 않음):

```yaml
version: 1

host:
  name: feature-host
  layout:
    preset: auto

agents:
  reviewer:
    adapter: claude-code
    role: review
    args:
      - --model
      - sonnet
      - --permission-mode
      - plan
    instruction: |
      구현을 검토하고 발견한 문제를 implementer에게 전달한다.

  implementer:
    adapter: codex
    role: implementation
    instruction: |
      요구사항에 맞게 구현하고 reviewer에게 검토를 요청한다.

  researcher:
    adapter: claude-code
    role: research
    instruction: |
      조사 결과를 reviewer에게 전달한다.

networks:
  feature-a:
    agents:
      - reviewer
      - implementer
      - researcher
    routing:
      default: deny
      allow:
        - between: [reviewer, implementer]
        - from: researcher
          to: [reviewer]
```

- 예시는 reviewer↔implementer 및 researcher→reviewer만 허용한다. 나머지 방향은 deny다. 원래 예시의 gemini는 현재 Claude/Codex 범위에 맞춰 claude-code로 바꿨다. 세 Agent가 같은 Host 작업 경로를 사용한다.
- D: `networks`라는 map 표기는 원래 예시대로 유지하되 현재는 항목 하나만 지원한다. Agent의 동시 Network 소속도 하나다. 복수형 YAML 키가 다중 Network 기능 수용을 뜻하지 않는다.
- D: `networks.<name>.agents`는 runtime ID가 아니라 manifest의 Agent definition key를 참조한다. Host 실행 시 definition name → 새 Runtime ID로 매핑해 membership과 directed route를 실체화한다.
- D: YAML 전체 reference 검증 → between/from-to의 directed edge 확장 → 중복·allow/deny 충돌 검사 → 부수효과 시작 순서다. 같은 edge의 상충 선언은 위치와 edge를 포함한 오류로 거절한다. 동일 값 중복의 거절/병합 여부는 아직 세부 계약으로 남긴다.
- D: between은 자신을 제외한 양방향 clique이고 from/to는 단방향이다. routing 어휘는 allow/deny로 통일한다. runtime CLI는 기존 edge override를 새 값으로 교체하며 YAML의 정적 충돌 검사와 구분한다. 예: `aiox network route feature-a --deny-between A B` 뒤 `--allow-between A B`. 앞선 설명의 축약형 --deny/--allow를 새 CLI 옵션으로 추가하지 않는다.
- P: 전체 YAML 검증 후 Host-scoped Network를 준비하고 Agent 실행·Runtime ID 매핑·membership·route 연결을 완료한 뒤 사용 가능 상태로 노출한다. MCP 초기화에 필요한 Network endpoint를 언제 준비할지는 launch 계약에서 정하며 검증 전 Agent를 실행하지 않는다.
- 실행 예시: `aiox host run --path ./aiox.yaml --name feature-host`, 별도 작업 공간은 `aiox host run --path ./aiox.yaml --name login --worktree feature/login`이다. 동일 YAML도 각 실행의 host-managed Network와 Runtime 신원은 분리된다.
- Q: 예시의 version 필드 도입과 adapter 등록 ID, 공통 Host instruction의 YAML 위치는 owner 계약에서 확정한다. host.name보다 --name을 우선하는 계약은 위 시작·종료 절을 따른다. 기존 compose 계약은 폐기했고 전체 예시는 `docs/specs/aiox-host.md`로 반영했다. 실제 프로젝트 aiox.yaml은 생성하지 않는다.
- 내부 전달에서 networkId/sourceAgentId/targetAgentId를 구분하는 것은 단일 Network에서도 유효하다. 이를 모델 입력 envelope 확대나 현재 multi-network 지원의 근거로 삼지 않는다.

D: 공개 AIOX 사이트는 실제 제품 이후 마지막 단계다. 소개·설치·사용법·설계 근거를 다국어로 제공한다. 운영 Web과 별도 앱이며 공개 사이트 방문이 local daemon 접근 권한을 뜻하지 않는다.

P: Next.js + next-intl, 정적 페이지 중심 구성을 추천했다. 사용자가 Next.js를 질문했으며 아직 library/framework를 절대 변경 불가로 확정하지 않았다. 공개 사이트를 위해 운영 Web을 Next.js로 바꿀 필요는 없다.

O: [Next.js static export](https://nextjs.org/docs/app/guides/static-exports).

#### 25. 새 설계 아티팩트와 구현 단계별 미결

사용자 결정으로 옛 본문을 부분 보수하는 대신 spec 9개·architecture 12개·decision 25개를 삭제하고 새로 작성했다. AGENTS/CLAUDE 작성 규칙과 과거 실행 증거 로그는 보존한다. 현재 제품 계약의 진입점은 `docs/aiox-tui-product.md`이며 이 로그는 결정 경위와 검증 provenance를 보존한다.

| 새 owner | 책임 |
| --- | --- |
| docs/specs/aiox-runtime.md | 전체 CLI, Runtime 신원·상태·종료·플랫폼 |
| docs/specs/aiox-collaboration.md | HTTP MCP, 대상 지정 send·상태·daemon 알림·관측과 재전송 제외 |
| docs/specs/aiox-host.md | Host·단일 Network·routing·Worktree·전체 YAML |
| docs/specs/aiox-configuration-web.md | 전역 설정·저장·Web 복귀·알림 |
| docs/architecture/aiox-system.md | 실행 책임·프로세스 구성·package/domain 경계 |
| docs/architecture/aiox-vendor-bindings.md | Claude inbox/hooks와 Codex App Server/Relay·실행별 주입 |
| docs/architecture/aiox-storage-terminal.md | SQLite·3 OS·PTY·설정·Web 상태 흐름 |
| docs/decisions/tui-product-boundary.md | TUI 중심 제품 경계의 선택 근거 |

W2의 제품 방향 결정은 완료했다. 아래는 구현 단계에서 구체화할 항목이며 Stage 0을 다시 열거나 이미 성공한 실험을 반복할 조건이 아니다.

구현 단계에 인계하는 확인 범위:

1. Stage 2-2는 공통 실행 소유권·vendor 경계, Web shell 설정·사전 검증과 OS별 종료 작업을 마감했다. Windows/WSL shell 실측과 OS별 CI 범위는 [Stage 2-2 기록](2026-09-11-AIOX-TUI-Stage2-2-Execution-Ownership.md)을 따른다. 이후 외부 실행 유지 범위의 교정은 [Stage 2-3](2026-09-12-AIOX-TUI-Stage2-3-Control-Flow-Boundaries.md) W1에서 완료했으며, 별도 처리·복구 경계 개선을 이어간 뒤 Stage 3 W1로 복귀한다. 과거 외부 종료 테스트 성공을 현재 외부 생존 정책의 검증으로 승계하지 않는다. 실제 vendor 메시지 E2E와 추가 OS 통합은 Stage 3, Codex TUI·Relay·App Server는 Stage 4, Host 실행은 Stage 5 범위다.
2. §16·§18의 확정된 MCP schema·공개 상태·대상별 알림을 구현한다. 정확한 MCP 응답 포장과 vendor 이벤트 상관관계를 검증하되 replyExpected·상태 enum을 다시 선택 과제로 만들지 않는다.
3. TypeORM 도입과 현재 schema 직접 초기화는 반영됐다. AIOX 본문·알림 보존과 진행 중 요청 제외·관련 데이터 정리의 검증 근거는 저장 owner와 해당 단계 로그를 따른다. DB 저장 ID UUID v7 통일은 확정했지만 미구현이다. JSON·기본 포트·보존 기간은 미결이 아니다.
4. Codex toolOutput+additionalContext E2E, busy 입력의 threadId/turnId 연결과 서버 요청 관측·사용자 응답 owner를 확인한다.
5. Claude hidden inbox launch와 session_id/prompt_id 관측 연결·native Windows token forwarding을 확인한다. 이미 전달받은 단일 idle 성공을 busy 전체 검증으로 확대하지 않는다.
6. Stage 2-1에서 완료한 §23의 공통 터미널 복원 기반을 Stage 6의 React 운영 UI·탭·분할·배치 복귀에 통합한다. 사용자 재인증 없는 Web 자동 복귀, 상세 상태·미해결 질문/승인 표시와 소리 묶음·multi-tab 주체는 해당 운영 Web·알림 단계에서 구현한다.
7. Host 이름 기반 start/stop과 YAML route 재연결, Worktree 생성·기존 branch 재사용·충돌·시작/종료 보상을 구체화한다. add/remove와 자동 vendor 대화 resume은 제외한다.
8. 채택한 서버 라이브러리의 설치 버전·Node/OS 호환성을 확인한다. Web 세부 의존성은 소비 단계에 선택한다.

모든 미결을 한꺼번에 사용자에게 질문하지 않는다. 기존 근거·원하는 UX로 결정 가능한 부분부터 구체안으로 만들고, 실제 정책 선택이 필요한 지점만 좁혀 논의한다. 이미 전달된 성공 사례를 핑계로 dedup/burst/rate-limit/Windows 전수 테스트를 재개하지 않는다. 새 실험이 필요하면 원인·확인할 단일 주장·최소 사례를 먼저 명시한다.

W3에서 위 새 owner에 현재 확정 내용을 반영했다. Target와 제안·미결을 구분했으며 제품 code/tests의 As-built로 승격하지 않았다. production 변경·설치·live agent 테스트는 이번 작업에서 하지 않았다.

#### 26. 기록 작업의 범위와 인계

- 신규 plan: `plans/aiox-tui-product-rebuild.md`.
- 신규 단일 log: `logs/2026-09-07-AIOX-TUI-Product-Rebuild-Baseline.md`.
- 기존 plan의 완료·중단 실행 증거는 보존했다. 미착수 Stage 4–9의 빈 단계 로그/task 39개를 삭제하고 이전 plan의 미래 단계도 제거했다.
- 새 plan Stage 0은 이 로그에서 완료한다. Stage 1은 일반 로그 하나로 다음 행동만 인계하며 구현을 자동 실행하지 않는다. 사용자 지시대로 package log/task 기록은 만들지 않는다.
- 저장소에 기존 tracked 수정·untracked 파일이 다수 있었다. 앱·protocol·tests·기존 logs/task records를 되돌리거나 커밋하지 않는다. architecture.excalidraw는 사용자 개인 자산으로 제외한다.
- 최종 확인은 log check, onramp, 새 plan/log 링크·Work Items·stage 순서 및 이번 변경 diff다. 문서 작성만으로 애플리케이션 테스트 통과나 vendor 통합 완료를 주장하지 않는다.

### 2026-09-07 17:33 · W1 기록 완료와 새 plan 전환 검증

W1 기록 작업을 완료했다. 새 plan은 10개 단계이며 Stage 0만 활성이고, 공개 AIOX 사이트를 Stage 9 마지막에 뒀다. 상세 로그는 하나만 생성했다. 기존 plan은 활성 Stage 3 마커를 해제하고 중단 위치·새 진입점을 Notes로 연결했으며 기존 stage logs/task records와 제품 코드는 수정하지 않았다.

검증:

- `log check`에서 Work Items/Required Context 각각 하나, 단일 local next pointer, independent Return Target 형상을 확인했다.
- plan 10단계·활성 plan 1개·공개 사이트 마지막·stage log 실재·본문의 20개 repo file reference 실재를 검사했다.
- MCP 문자열, Codex bearer env config, Claude hidden path, UserPromptSubmit/Stop 연결 ID, StopFailure, replyExpected, 재전송, SQLite/localStorage, 브라우저 복귀·포커스 등 핵심 주제 포함을 확인했다.
- `scripts/onramp`가 새 plan Stage 0과 새 로그를 선택함을 확인했다. W1 completed 뒤 W2 active로 갱신했으며 최종 onramp를 다시 확인한다.
- 기존 plan diff를 검토했고 `git diff --check`에서 해당 변경의 whitespace 오류가 없었다. 새 문서는 별도 구조·참조 검사를 수행했다. 앱 테스트·CLI/TUI 실험·Windows 실행 검증은 이번에 하지 않았다.

600-line soft hint 검토: 사용자가 전체 대화의 세부를 우선 단일 로그로 보존하라고 명시했다. 이 파일은 하나의 Stage 0 기준선 수명이며 26개 주제별 소제목으로 탐색할 수 있으므로 지금 분리하지 않는다. 이후 구현 단계의 독립 작업 로그는 단계 진입 때 만든다. 분량 때문에 원본 검증 provenance나 정확한 주입 예시를 삭제하지 않는다.

다음 재개는 W2의 남은 계약 결정이다. 본문 §25와 관련 주제의 D/U/S/O/P 구분을 읽고, 이미 정리된 TUI/inbox/HTTP MCP/재전송 제거/브라우저 복귀 및 Host namespace·Worktree 공유 방향을 재승인받거나 과거 Stage 3부터 자동 실행하지 않는다. 리뷰 수정과 Host·Worktree 방향은 사용자 요청에 따라 본문에 통합했으며, W3 owner 반영과 제품 구현은 아직 수행하지 않았다.

### 2026-09-07 23:27 · W3–W4 새 설계 문서 확정과 구현 인계

사용자 지시로 기존 일반 spec 9개·architecture 12개·decision 25개를 삭제하고 새 spec 4개·architecture 3개·decision 1개와 docs/aiox-tui-product.md를 작성했다. product/roadmap/README·작성 규칙의 진입 링크도 갱신했다. §25는 새 owner map이며 과거 실행 증거는 보존한다. 삭제된 문서의 과거 로그 경로는 당시 기록으로 읽는다.

Subagent가 문서 작성과 폐기 산출물 정리·독립 리뷰를 담당했다. 미착수 Stage 4–9의 빈 로그/task 39개를 삭제했다. 실제 consumer가 있는 PTY 코드는 보존했으며 제품 코드는 이번 작업에서 변경하지 않았다. 리뷰에서 발견한 route fan-out·hook 보고 Runtime 인증 경계를 보강하고 관측 가능성과 전달 보장을 구분했다.

계획은 기반 → MCP/Network/PTY/최소 Web → Claude → Codex 왕복 → Host/Worktree → 운영 Web → 알림 → 통합 OS/배포 → 공개 사이트다. OS native 경계는 초기 단계에서도 확인한다. Stage 0을 완료하고 logs/2026-09-07-AIOX-TUI-Stage1-Foundation.md에 다음 행동만 인계했다. 구현은 아직 시작하지 않았다. 사용자 지시대로 package log/task 기록은 만들지 않는다.

검증: 새 문서 Markdown inline-code 검사·current docs wikilink 실재 검사 통과. 작성 agent의 CLI tree/YAML baseline 일치·문서 링크·diff 검사 통과. 최종 log check/onramp/diff 정합 검사로 마무리한다. 앱 테스트·vendor·Windows 실측은 하지 않았다.

1000줄 이상 단일 로그 유지 이유: 사용자가 전체 대화의 세부 근거를 단일 기록으로 보존하도록 지시했다. 이 파일은 Stage 0 provenance이며 현재 제품 권위는 새 문서로 옮겼다. 여기서 구현 수명을 계속 늘리지 않는다.
