# AIOX 외부 Agent CLI 통합 조사 프롬프트

조사 대상: **<Agent CLI 이름 · 저장소 또는 제품 주소>**

위 대상의 기본 인터랙티브 TUI를 AIOX에 통합할 수 있는지 조사해라. 아래에 AIOX의 통신 구조와 필요한 기능을 설명한다. AIOX를 처음 보는 상태에서도 이 문서만으로 조사 목적과 판정 기준을 이해할 수 있어야 한다.

## 1. AIOX가 무엇인가

AIOX는 여러 AI coding CLI의 **실제 TUI를 그대로 실행·유지하면서**, 실행 묶음·작업 공간·Agent 간 통신·상태 관측·Web 터미널·알림을 제공하는 로컬 제품이다.

모델 선택, slash command, 사용자 질문, 도구 승인, quota 등의 vendor UX는 기존 TUI가 담당한다. AIOX가 이를 headless UI로 다시 구현하는 것은 이번 범위가 아니다.

다음은 확정한 목표 아키텍처다. 모든 구성의 신규 제품 통합이 완료됐다는 보고는 아니다.

```text
사용자
├─ 일반 터미널의 AIOX CLI
└─ React 운영 Web — 실제 TUI 화면·배치·상태·알림
                    │
                    ▼
AIOX daemon — 로컬 Node.js 서버
├─ Controller — Agent/Host 실행·종료
├─ Runtime Credential Registry
├─ 공통 HTTP MCP Server
│  ├─ send
│  ├─ reply
│  └─ agents_list
├─ Network / Message Service — 소속·route·전달·회신 연결
├─ Vendor Adapter / Binding
│  ├─ 실행별 MCP·협업 지침 주입
│  ├─ 이미 실행 중인 TUI에 외부 메시지 주입
│  └─ 입력·턴·실패·사용자 대기 관측
└─ PTY / Gateway / 상태·알림 처리
```

Runtime은 AIOX가 관리하는 실행 단위다. 하나의 Runtime에 TUI와 부속 App Server 등이 함께 속할 수 있다. vendor conversation/thread는 `/clear`, `/resume`, fork 등에 따라 바뀔 수 있으며 Runtime·PTY·브라우저 연결과 수명이 다르다.

Host는 같은 작업 공간에서 Agent들을 실행하는 묶음이다. Network는 통신 경계다. 현재 Agent는 Network 하나에 소속되며 실행 중 join/leave·다중 Network 소속은 지원 범위가 아니다.

## 2. HTTP MCP가 맡는 역할과 실제 양방향 통신

**AIOX는 Agent가 daemon의 도구를 호출하는 경로에 HTTP MCP를 사용한다.** 여기서 HTTP MCP는 임의 REST `/send` API가 아니라 MCP 초기화·도구 조회·도구 호출을 제공하는 외부 MCP 서버 연결이다. 구체 지원 transport와 SDK 호환성은 대상 CLI에서 확인해야 한다.

**HTTP MCP를 지원한다는 사실만으로 daemon이 idle TUI를 깨울 수 있는 것은 아니다.** Agent에서 daemon으로 나가는 도구 호출, daemon에서 TUI로 들어가는 입력, TUI에서 daemon으로 나오는 관측 경로를 각각 조사해야 한다.

```text
① Agent → AIOX: 협업 도구 호출

Agent A의 모델
  → A의 MCP client가 HTTP MCP send 호출
  → AIOX daemon이 인증·Network·route 검사
  → 대상별 전달 처리

② AIOX → Agent: 현재 TUI의 대화에 외부 입력

AIOX daemon
  → 대상 vendor adapter
  → 대상 TUI의 inbox / app server / channel / 기타 입력 경로
  → idle이면 새 턴 시작, busy이면 vendor의 입력 처리 규칙 적용

③ Agent → AIOX → 원 Agent: 협업 회신

Agent B의 모델
  → HTTP MCP reply 호출
  → daemon이 원 요청·회신자 연결 검증
  → Agent A의 vendor 입력 경로로 회신 전달

④ Agent → AIOX: 실행 관측

TUI / runtime event / hook
  → adapter 또는 관측 ingress
  → Runtime 상태·입력/턴 연결·Web 알림
```

MCP send의 tool 반환과 나중에 도착하는 협업 reply는 다르다. send 호출을 상대 Agent 작업 완료까지 계속 열어 두는 구조라고 가정하지 마라. 일반 MCP tool response를 받는 것과 외부에서 idle TUI에 새 입력을 넣는 것도 다르다.

### MCP 주소·실행별 인증

```text
URL 예시: http://127.0.0.1:4500/mcp/network-123
Header:   Authorization: Bearer <runtime-token>
Env:      AIOX_MCP_TOKEN=<해당 Runtime의 실제 token>
```

- 같은 Network의 Agent는 같은 URL을 사용하고, token은 Runtime마다 다르다.
- daemon은 token에서 source Runtime을 도출한다. 모델이 도구 인자로 source 이름이나 Host ID를 제출해 신원을 바꿀 수 없다.
- URL은 Network 문맥이며 권한 자체가 아니다. daemon은 매 호출마다 token 유효성·소속·route를 검증한다.
- 실제 token은 환경변수 등 실행별 수단으로 전달하고 argv·URL·로그·오류에 노출하지 않는다.
- Runtime 종료·시작 실패 시 revoke하며 재실행은 새 token을 사용한다.
- vendor inbox 인증 token이 따로 있다면 AIOX MCP token과 혼동하지 않는다.
- vendor별 AIOX stdio MCP child나 Agent별 임시 `/send` HTTP 서버를 기본 구조로 만들지 않는다.

### MCP 도구의 의미

| 도구 | 현재 정한 역할 |
| --- | --- |
| send | 현재 outbound route가 허용하는 대상에 메시지를 fan-out |
| reply | 원 요청과 연결해 원 발신자에게 협업 회신 |
| agents_list | source→target route가 허용되는 Agent만 status와 함께 반환 |

예를 들어 A→B, A→C이면 A의 일반 send 대상은 B·C다. B의 reply는 원 요청자 A에게 연결하며 일반 fan-out과 구분한다. reply의 상세 권한·횟수·route 변경 후 처리는 별도 계약 논의 대상이다.

`replyExpected=false`는 회신 불필요다. 발신 Agent는 상대 응답 종료·회신·ACK를 기다리지 않는다. send 자체의 거절·실패는 일반 도구 반환으로 알려 준다. 내부 관측은 유지할 수 있지만 완료를 알리기 위해 발신 Agent를 자동으로 다시 깨우지 않는다.

`replyExpected=true`는 협업 회신을 원 요청에 연결한다. 별도의 retransmit 도구나 동일 메시지 자동 재주입은 제공하지 않는다. 최초 전달 전 queue와 재전송은 구분한다.

도구의 정확한 입력·반환 schema, type/intent enum, fan-out 부분 실패, reply 세부 계약, status enum은 MCP 구현 단계에서 사용자와 논의한다. 조사 agent가 기존 legacy envelope를 가져와 확정 schema로 만들지 마라.

### 본문·메타데이터 형식

```text
Daemon 내부 데이터:
Runtime/source/target, Network/route, message/delivery ID,
전송 결과, reply 연결, vendor prompt/turn 연결

대상 모델에 필요한 정보:
협업 본문, 발신자, 필요한 연결 ID, 회신 필요 여부·회신 방법

TUI에 보여 줄 정보:
사람이 입력한 메시지와 구별되는 협업 메시지 표시·preview
```

전체 내부 JSON envelope를 그대로 사용자 입력처럼 노출하지 않는 것이 목표다. 위 목록은 의미 구분이지 새 JSON schema 선언이 아니다. 대상 vendor의 실제 wire·본문·context 필드에 맞춰 전달해야 한다.

## 3. 기존 Claude·Codex 사례

이 사례는 AIOX가 원하는 결과와 통합 방법의 범위를 설명한다. 대상 vendor에 같은 필드·기능이 있다고 가정하지 마라. 기존 성공 실험을 다시 검증하는 작업도 아니다.

### Claude

- 기본 Claude Code TUI를 실행한다. headless SDK 세션이 아니다.
- 실행 시 `--mcp-config`에 JSON 문자열을 전달해 외부 HTTP MCP를 추가한다.
- `headers.Authorization`에는 리터럴 `Bearer ${AIOX_MCP_TOKEN}`을 두고 실제 token은 child env에 전달하는 구성이다.
- `--strict-mcp-config`를 사용하지 않고 기존 사용자 MCP를 보존한다. 사전 영구 MCP setup을 요구하지 않는다.
- `--append-system-prompt`로 공통 협업 지침·Agent instruction을, `--settings`로 실행별 hooks를 추가한다.
- inbound는 native peer inbox socket/pipe를 사용한다.
- 사용자 전달 실측에서 외부 프로세스가 idle TUI에 메시지를 주입해 새 턴을 시작했고 busy 전달·HTTP MCP reply도 확인됐다.
- `cross-session-message`와 `from-name` 표시 규약을 사용한 compact preview·Ctrl+O 펼치기가 사용자 전달 실측에서 확인됐다. 표시 이름은 인증 신원이 아니다.
- hidden `--messaging-socket-path` 옵션은 설치 바이너리 조사로 확인됐다. Runtime별 주소를 지정하는 방향이며 신규 launcher 통합 전체의 실측 완료와는 구분한다.
- 같은 프로세스 `/clear`·`/resume`에서 socket 유지가 보고됐다. vendor conversation ID까지 동일하다는 뜻은 아니다.
- `UserPromptSubmit`의 원문과 prompt_id를 특정 AIOX 입력에 연결하고 같은 prompt_id의 `Stop`을 관측한 단일 idle 실험이 통과했다.
- native Windows는 named pipe와 inbox 인증 token 처리가 별도 경계이며 Unix 실측으로 Windows 통합을 보장하지 않는다.
- raw wire와 표시 규약은 범용 공식 외부 API로 확정된 계약이 아니다.

### Codex

- 실제 Codex TUI를 App Server와 Binding Relay에 연결한다.
- App Server 실행 config에 HTTP MCP URL, `bearer_token_env_var="AIOX_MCP_TOKEN"`, `required=true`를 주입한다.
- 실행 config 지침 키는 `developer_instructions`다. RPC의 `developerInstructions`와 구분한다.
- Relay가 연결된 TUI의 thread/start·resume·fork 성공 응답을 관측해 activeThreadId를 갱신하고 이후 입력을 그 thread에 전달한다.
- AIOX는 **toolOutput으로 본문을 주입하고 additionalContext로 나머지 메타데이터를 전달**하는 방식을 채택했다.
- 이 조합의 실험 통과는 사용자 확인이다. 우선 제품에 통합하고 AIOX E2E에서 요구를 충족하지 못하면 그 다음 방식을 검토한다. 미리 여러 fallback 구현을 만들지 않는다.
- App Server 입력 수락·턴 lifecycle·실패·승인·질문 이벤트를 관측하는 방향이다. 모든 이벤트가 별도 observer 연결에 전달된다고 가정하지 않는다.
- 내부 표시 규약의 고정 문구·발신자 표현·context 제한은 실제 적용에서 구분해야 한다. toolOutput이라는 이름만으로 모델이 외부 Agent 요청으로 이해한다고 단정하지 않는다.

Channel은 다른 vendor에서 외부 이벤트 전달 후보가 될 수 있다. Claude에 이미 native inbox 방향을 정했다고 모든 vendor의 Channel 방식을 금지하는 것은 아니다. 반대로 대상 vendor의 조사 때문에 현재 Claude에 Channel fallback을 되살리지 않는다.

## 4. 이번 조사 범위와 방법

기본 인터랙티브 TUI를 대상으로 다음 네 가지 핵심을 확인한다.

1. 기존 TUI의 현재 대화에 외부 입력을 넣어 모델을 깨울 수 있는가?
2. 사람이 직접 보낸 프롬프트와 구별되는 방식으로 전달·표시할 수 있는가?
3. 실행별 system/developer/협업 지침을 주입할 수 있는가?
4. 입력·턴 lifecycle과 사용자 대기·실패를 외부에서 관측할 수 있는가?

여기에 외부 HTTP MCP 연결·인증이 가능한지 확인해 AIOX 왕복 경로를 완성한다.

현재 AIOX 코드 구조에 국한하지 말고 대상 CLI 자체의 기능을 조사해라. headless, SDK 전용 세션, print 모드, 별도로 만든 백그라운드 대화가 동작한다는 사실을 기존 TUI 통합의 근거로 사용하지 마라.

공식 API가 없다는 이유로 조사를 끝내지 말고 다음 경로를 찾는다.

```text
공식 CLI 옵션·설정·API·hooks·확장 기능
→ IDE/remote/app-server/session-messaging 연동
→ Unix socket·Windows named pipe·기타 IPC
→ 공개 소스·설치 코드·바이너리의 내부 wire·표시 규약
→ 앞선 경로가 없을 때 PTY 입력·키보드 주입의 가능성과 제약
```

프로세스 간 통신·내부 확장점 활용과 인증·권한 우회는 다르다. 사용자 승인 우회, 신원 위조, 보안 정책 제거를 해결책으로 제안하지 않는다. vendor 코드 수정이 필요한 방법은 수정 없이 가능한 방법과 분리한다.

먼저 읽기 전용으로 조사한다. 제품 코드·설정·로그·문서를 수정하거나 실제 메시지를 보내거나 새로운 TUI를 실행하지 않는다. live 실험이 필요한 핵심 주장은 최소 사례를 제안한 뒤 별도 요청에 따라 진행한다.

## 5. 기존 TUI에 입력하는 경로

다음 흐름을 끝까지 추적한다.

```text
외부 daemon → 실제 입력 endpoint → 이미 실행 중인 TUI의 현재 대화 → 모델
```

확인할 항목:

- idle 상태 입력이 새 턴을 시작시키는가?
- busy 상태에서 즉시 반영·도구 호출 사이 전달·queue·거절 중 무엇인가?
- 메시지가 사용자가 보고 있는 대화에 들어가는가, 별도 대화를 생성하는가?
- Runtime·conversation·thread·socket 등 대상 식별자는 무엇인가?
- 주소를 실행 시 지정할 수 있는가? CLI 인자·env·config 중 실제로 무엇을 읽는가?
- 자동 발견이나 등록이 필요하면 누가 어느 시점에 어떤 값을 제공하는가?
- 부모가 전달하는 입력 env인지, vendor가 자식 hook에 export하는 출력 env인지?
- `/clear`, `/resume`, fork 등의 대화 전환 뒤 주소·token·thread binding은 유지되는가?
- process 재실행과 같은 process의 대화 전환은 어떻게 다른가?
- 연결·인증·입력 수락·모델 처리 시작을 각각 무엇으로 확인하는가?

프로세스 생성, socket 파일 존재, connect 성공, write 성공, 모델 입력 관측을 같은 성공으로 합치지 마라. 특정 사용자 설정·플랜·기능 flag가 필요한 경우 명시한다.

## 6. 입력 역할과 TUI 표시

조사할 후보는 peer/teammate message, channel/external event, tool output, IDE activity, system/context notification, 본문과 additional context의 분리다.

각 방법을 다음 세 층으로 설명한다.

| 층 | 질문 |
| --- | --- |
| 전송 wire | 실제 endpoint·payload·프로토콜 역할은 무엇인가? |
| 모델 입력 | 본문·context·발신자 framing을 어떻게 받는가? |
| TUI renderer | 화면에 어떤 종류·라벨·preview로 보이는가? |

- 사용자 입력과 다른 메시지 종류로 표시되는가?
- 발신 Agent 이름이나 출처를 표시할 수 있는가?
- 본문을 짧게 접고 펼칠 수 있는가?
- 본문과 연결 ID·reply 정보 등의 메타데이터를 분리할 수 있는가?
- 강제 문구·필드 제한·길이 제한·truncation은 어디에 적용되는가?
- idle/busy가 다른 렌더링 경로를 사용하는가?
- 공식 확장 계약인지 내부 문자열 규약인지?

색상만 바뀌는 것과 메시지 유형이 바뀌는 것을 구분한다. `role:user`라는 wire만 보고 사용자 입력과 같은 UI라고 단정하지 말고 실제 renderer를 추적한다. 반대로 UI가 peer처럼 보인다고 모델 입력 역할이나 인증까지 peer가 되는 것은 아니다.

전체 payload는 실제 근거로 확인한 만큼만 제시한다. 존재 여부가 확인되지 않은 metadata 필드나 1000-token 같은 제한을 다른 vendor에서 복사하지 않는다.

## 7. 실행별 지침 주입

- system prompt, developer instruction 또는 대응 기능이 있는가?
- CLI args·config override·env·프로젝트 파일 중 어느 경로인가?
- 기존 지침에 append하는가, replace하는가?
- 영구 user/project 설정을 변경하지 않고 Runtime 한정으로 적용할 수 있는가?
- `/clear`, resume, 새 thread 이후에도 유지되는가?
- 기존 사용자 지침·MCP·plugins·hooks를 유지하는가?
- 모델·slash command·사용자 승인 UX를 그대로 유지하는가?

전용 지침 경로가 없어 첫 user message로 bootstrap해야 한다면 대안의 제약으로 보고한다. 동일한 우선순위·지속성의 지침 주입이라고 하지 않는다. 협업 지침은 send/reply 사용을 안내하지만 daemon의 인증·route 집행을 대신하지 않는다.

## 8. HTTP MCP 연결과 outbound 회신

- 기존 TUI가 외부 HTTP MCP 서버를 사용할 수 있는가?
- 지원 transport가 무엇인가? Streamable HTTP와 구형 HTTP+SSE 등의 차이를 확인한다.
- 실행별 MCP 설정을 inline JSON·CLI config override 등으로 추가할 수 있는가?
- URL·Authorization header·env 참조 또는 bearer token env 설정을 지원하는가?
- 실제 token을 argv에 노출하지 않고 전달할 수 있는가?
- 기존 사용자 MCP를 유지하면서 추가할 수 있는가?
- vendor별 MCP child 없이 daemon의 외부 HTTP endpoint에 연결할 수 있는가?
- 초기화 실패를 관측하거나 필수 MCP의 실패로 실행 준비를 실패시킬 수 있는가?
- 모델이 HTTP MCP reply 도구를 호출해 원 요청과 연결된 정보를 보낼 수 있는가?

HTTP MCP가 없으면 stdio bridge나 다른 구조화된 outbound 대안과 추가 비용을 별도로 보고한다. AIOX의 기본 HTTP MCP 기준을 충족했다고 표시하지 않는다. 이번 조사에서 MCP tool의 세부 schema를 새로 확정하거나 서버 라이브러리를 설치하지 않는다.

## 9. 입력·턴 lifecycle과 사용자 상호작용 관측

App Server event, hook, IPC notification 등을 조사해 다음을 구분한다.

- Runtime 시작·연결 준비·종료.
- 입력 수락 또는 입력 제출 이벤트.
- 턴 시작·진행·응답 종료·실패.
- 승인·질문 대기 및 해소.
- 세션/주간 한도·rate limit·인증 오류·연결 손실.

핵심 연결:

```text
AIOX message ID
→ vendor 입력 원문 또는 입력 ID
→ prompt/turn ID
→ 종료·실패 이벤트
```

확인할 항목:

- 어떤 필드와 이벤트로 연결하는가?
- ID가 필수인가 optional인가?
- 입력 원문과 origin은 어느 이벤트에 있는가?
- 하나의 턴에 여러 입력이 들어오면 무엇까지 구분 가능한가?
- 이벤트는 TUI 소유 연결에만 오는가, 외부 observer도 받을 수 있는가?
- 구독·hook 등록을 해당 Runtime에만 적용할 수 있는가?
- hook을 daemon에 전달하는 실행별 주소·credential을 어떻게 넘기는가?
- 관측하려고 사용자 응답을 가로채거나 TUI와 이중 응답해야 하는가?
- 이벤트 해소가 승인 성공인지, 취소·정리도 포함하는가?

“전체 lifecycle 지원”이라고 뭉뚱그리지 말고 항목별 지원과 공백을 보여 줘라. transcript 파싱이나 화면 문자열 추출만 가능하면 구조화된 event/hook 경로와 구분한다.

턴 종료는 업무 성공·파일 수정 성공·MCP reply 성공과 다르다. reply는 Stop보다 먼저 올 수 있다. 일반 도구 실패를 전부 AIOX delivery 실패로 분류하지 않는다. 승인·질문은 사용자 직접 작업에서도 발생하므로 Web 알림 대상일 수 있지만 A2A 실패와 동일하지 않다. reasoning 전문 수집은 요구하지 않는다.

## 10. 플랫폼·버전·운영 경계

Windows native, Linux, macOS, WSL을 구분한다.

- 조사한 정확한 CLI 버전·실행 파일·OS와 최소 지원 버전.
- socket/pipe 주소 지정, 소유권·권한·인증 차이.
- Runtime 종료·대화 전환·재실행의 binding 수명.
- TUI 정상 종료 및 부속 서버·프로세스의 소유 관계.
- startup/update가 준비를 막을 때 관측 가능한 종료·오류 신호.
- hidden 옵션과 내부 wire의 버전 의존성.

Windows 소스 분기나 macOS 바이너리의 문자열 존재는 Windows 실측이 아니다. Linux Docker 실행도 Windows 실측이 아니다. 이미 떠 있는 프로세스의 환경변수를 외부 부모가 자동으로 알 수 있다고 가정하지 않는다.

AIOX는 `daemon stop --force`에서 자신이 관리하는 실행 전체를 종료한다. 통합에 새 부속 프로세스가 필요하다면 종료 책임까지 밝힌다. 프로세스 이름으로 무관한 vendor 실행을 일괄 종료하는 방법은 제안하지 않는다.

## 11. 근거와 조사 절차

공식 문서, 공식 공개 소스, 설치 코드·바이너리에서 근거를 찾는다. 기술 주장에 사용한 URL·파일/함수·버전·필드명을 함께 제시한다.

- 문서가 설명하는 공식 용도와 내부 코드가 허용하는 동작을 구분한다.
- 문자열 하나를 찾은 것으로 동작 전체를 확정하지 않는다. 실제 parser·수신 handler·모델 입력 변환·renderer·이벤트 발생 경로를 필요한 범위까지 추적한다.
- 근거를 구할 수 없으면 확인 불가로 보고한다. 필드나 API를 만들어내지 않는다.
- 기존 Claude/Codex 실험은 비교 문맥이다. 대상 CLI에서 직접 확인한 결과처럼 인용하지 않는다.
- 인증·권한을 약화하는 우회 없이 가능한 내부 연동을 조사한다.
- 조사 단계에서는 로그·plan·spec·프로젝트 설정을 작성하거나 변경하지 않는다.

## 12. 최종 보고 형식

### A. 핵심 결론

기본 TUI를 유지한 AIOX 왕복 경로가 구성 가능한지, 어떤 기능이 부족한지 먼저 설명한다. 공식 지원, 내부 구현 의존, 미확인을 구분한다.

### B. 실제 연결 구성도

```text
Agent 모델 → HTTP MCP → AIOX daemon
AIOX daemon → 실제 입력 endpoint → 기존 TUI의 현재 대화 → 모델
TUI event/hook → AIOX 관측
```

endpoint나 연결이 미확인인 곳은 그대로 표시한다. 새 headless 세션으로 대체한 그림을 제시하지 않는다.

### C. 항목별 판정표

`항목 / 지원 여부 / 정확한 옵션·필드·이벤트 / 근거 / 실측 여부 / 제약`

다음은 반드시 포함한다.

- idle 입력·busy 입력.
- 사용자 프롬프트와 구별되는 표시.
- 본문·메타데이터 전달.
- 지침 주입.
- HTTP MCP·실행별 인증.
- 입력과 턴 종료 연결.
- 승인·질문·실패 관측.
- 주소 지정·발견·대화 전환.
- 플랫폼·버전 경계.

### D. 추천 경로 하나와 대안

사용자가 실제로 보는 UI, 현재 대화에 도달하는 방식, 관측 범위, 추가 프로세스·의존성, 유지보수 비용을 근거로 추천한다. 공식 API가 없다는 이유만으로 내부 경로를 배제하지 않고, 내부 경로가 동작할 것 같다는 이유로 안정 계약이라고 하지 않는다.

우선 경로가 실패하기 전에 여러 fallback을 구현하자는 제안은 하지 않는다. 추가 SDK·bridge·라이브러리가 필요하면 이유와 기존 수단으로 해결되지 않는 부분을 설명한다. 라이브러리 최종 선택은 구현 단계에서 사용자와 논의한다.

### E. 정말 필요한 최소 실험

읽기 전용 조사로 확정하지 못한 핵심 주장만 나열한다. 각 주장에 대해 대상 TUI·입력 한 번·관측할 화면/이벤트·성공 기준을 제시한다. 실제 실행은 별도 요청을 기다린다.

기본 조사에 dedup·burst·queue 상한·rate-limit 임계값·부하 테스트를 추가하지 않는다. 이미 확인한 경로를 반복 실험하지 않는다. 실제 통합에서 필요한 좁은 E2E와 단순 호기심을 구분한다.
