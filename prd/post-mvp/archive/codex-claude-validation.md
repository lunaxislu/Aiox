> Archived validation record. This file is not authority.
> Accepted decisions were consolidated into `../../../docs/specs/aiox-a2a.md`, with rationale in
> `../../../history/58-post-mvp-a2a-architecture-decisions.history.md`.
> Internal references may mention old paths as point-in-time conversation context.

---
@user
prd/post-mvp/claude-opinion.md 을 읽고 cross validation해봐

---

• 검토 결과: prd/post-mvp/claude-opinion.md:46는 Post-MVP 설계 seed로 채택할 만함. 다만 그대로 권위 문서로 승격하기보다는
몇 군데를 정제해야 합니다.

가장 강한 부분은 이겁니다.

- aiox = local agent control plane이라는 모델은 현재 권위 문서와 잘 맞음. daemon이 registry/router/state owner라는 결정
  과 일치합니다. history/15-mvp-design-decisions.history.md:60

- compose = pair/connect 위의 선언형 layer라는 해석도 맞음. MVP 문서가 이미 YAML compose를 Post-MVP로 두고,
  pending_attach를 future compose desired state로 남겨둔 상태입니다. history/15-mvp-design-decisions.history.md:169

- services: 대신 agents/routes/capabilities/policies로 나누자는 제안은 맞음. aiox의 core domain이 이미 agent, route,
  message, delivery로 쪼개져 있기 때문에 Docker식 services에 route/capability를 묻으면 나중에 꼬일 가능성이 큽니다.

- AGENTS.md/CLAUDE.md를 건드리지 않고, compose instruction은 aiox-launched session에만 얹는다는 경계는 반드시 유지해야
  하는 불변식입니다. prd/post-mvp/claude-opinion.md:155

수정하거나 조심해야 할 부분도 있습니다.

- “Claude channel-as-plugin = native-config backend가 이미 돌아감”은 방향은 맞지만 표현은 조금 강합니다. 현재 코드는
  plugin path와 --mcp-config fallback/legacy 경로가 공존합니다. src/adapters/claude/launcher.ts:132

- adapter.compile() 제안은 맞지만, 현재 contract는 아직 inject()뿐입니다. 즉 “이미 있는 구조의 자연 확장”이지 “거의 구
  현됨”은 아닙니다. src/adapters/contract.ts:43

- kind enum은 현재 codex | claude로 닫혀 있습니다. 장기적으로 임의 agent를 쉽게 추가하려면 AgentKind를 string/plugin
  registry 쪽으로 여는 별도 Post-MVP step이 필요합니다. src/core/agent-kind.ts:1

- “vendor가 enforce”라는 표현은 약간 위험합니다. 외부 MCP/tool 격리는 vendor config가 구조적으로 숨겨주는 수준이고, 신
  뢰 가능한 enforcement는 aiox daemon/runtime MCP token/route check에서만 가능합니다. Claude 의견도 이 한계를 뒤에서 인
  정하고 있어서 문서화 시 앞쪽 표현을 더 엄밀하게 고치면 됩니다. prd/post-mvp/claude-opinion.md:167

뒤쪽에 붙은 “터미널 CLI/driver/envelope” 의견도 유효합니다. 특히 Codex reply 판단 문제에 대한 지적은 코드와 맞습니다.
Codex target injection은 turn/start에 text input을 넣는 방식이고, 현재 envelope는 source와 message_id만 담습니다.
message.type, parent_message_id, reply_expected 같은 신호가 빠져 있어서 모델이 reply 여부를 자연어 지시에 기대야 합니
다. src/adapters/codex/injector.ts:36, src/daemon/state.ts:1700

내 판정은 이렇습니다.

claude-opinion.md는 P3 설계 초안의 70%로 사용 가능합니다. 단, 권위 문서에 넣을 때는 아래 4개를 핵심 decision으로 정리하
는 게 좋습니다.

1. aiox compose는 Docker clone이 아니라 local agent control plane의 declarative input이다.
2. top-level schema는 agents/routes/capabilities/policies로 간다.
3. native instruction file은 read-only base layer이고, compose instruction은 launch-scoped orchestration layer다.
4. compose보다 먼저 또는 함께 필요한 기반은 AioxEnvelope, 확장된 AgentAdapter, LaunchPlan/Capability IR이다.

그리고 prd/post-mvp/claude-opinion.md:321 이후는 “Claude 의견 원문”이라기보다 후속 대화 로그가 이어붙은 형태라, 그대로
PRD에 인용하지 말고 별도 항목으로 분리하는 게 낫습니다.

---

@user
› 결국 내가 원하는건 agent↔agent 통신 표준인거 같은데 맞나 ?

---

• 맞습니다. 더 정확히 말하면 당신이 원하는 핵심은 agent↔agent 통신 표준 + 그 표준을 여러 CLI agent에 붙이는 local runtime
입니다.

단순히 “여러 터미널을 띄우는 도구”가 아닙니다. 그것은 UX layer고, 진짜 중심은 이겁니다.

Agent A가
Agent B에게
어떤 의도로
어떤 메시지를 보내고
B가 그 메시지에 대해
어떻게 reply/result/conclude 하는지를
vendor와 무관하게 표현하는 표준

그래서 aiox의 진짜 core는 Docker compose가 아니라 이런 것에 가깝습니다.

AioxEnvelope 메시지 표준
AioxRoute 누가 누구에게 보낼 수 있는지
AioxCapability 어떤 tool/skill/MCP를 쓸 수 있는지
AgentAdapter Codex/Claude/Gemini/Ollama CLI별 번역기
AioxDaemon mailbox/router/state owner

MCP는 agent가 tool을 쓰는 표준에 가깝고, 당신이 말하는 건 그 위/옆의 agent가 agent에게 말하는 표준입니다. 즉 MCP만으로
는 부족하고, aiox는 “MCP를 transport/capability substrate로 활용하는 agent collaboration protocol”이 되는 쪽이 맞습니
다.

한 문장으로 잡으면:

> aiox는 terminal CLI agent들을 위한 local Agent-to-Agent communication protocol runtime이다.

다만 처음부터 “전세계 표준”을 만들려고 하면 너무 커집니다. 현실적인 순서는:

1. 내부 표준: AioxEnvelope v1
2. 로컬 runtime: daemon route/mailbox/delivery
3. adapter 표준: Codex/Claude/Gemini별 compile/inject/reply
4. compose 표준: agents/routes/capabilities 선언
5. 외부 표준화 가능성: 다른 CLI/agent가 aiox protocol을 직접 지원

그래서 지금 post-MVP에서 제일 먼저 잡아야 할 건 compose.yaml 문법보다 AioxEnvelope / A2A protocol contract입니다.
Compose는 그 protocol을 배치하고 실행하는 선언 파일입니다.

---

@user

› 여기서
local내부
local-remote
회사 내부망 자체내 (local,remote)
remote <-> remote

이런식으로 나중에 확장하고 싶음

---

가능합니다. 다만 이건 처음부터 remote를 붙이는 문제가 아니라, agent↔agent 통신 표준을 location-independent하게 설계해야
합니다.

핵심은 agent 주소를 “프로세스 위치”가 아니라 “identity + endpoint + trust domain”으로 보는 겁니다.

agent://<domain>/<project>/<agent-name>

예:

agent://local/aiox-dev/impl
agent://laptop-luna/aiox-dev/reviewer
agent://company/team-a/researcher
agent://cloud-prod/org-reviewer/security

그러면 topology는 이렇게 확장됩니다.

Stage 1: local 내부
Codex 터미널 ↔ Claude 터미널
same machine, same daemon, Unix socket / named pipe

Stage 2: local ↔ remote
내 노트북 Codex ↔ 원격 서버 Claude
local daemon ↔ remote daemon tunnel

Stage 3: 회사 내부망
팀원 A의 agent ↔ 팀원 B의 agent
intranet daemon federation, org identity, policy

Stage 4: remote ↔ remote
cloud daemon ↔ cloud daemon
public endpoint, auth, encryption, audit, rate limit

이걸 가능하게 하려면 aiox core를 이렇게 나눠야 합니다.

AioxEnvelope
메시지 표준. local/remote 상관없이 동일.

AioxRoute
from/to 권한. 주소가 local agent든 remote agent든 동일하게 표현.

AioxMailbox
대상 agent가 지금 offline이어도 메시지 저장/재전송 가능.

AioxTransport
local socket, named pipe, TCP, WebSocket, HTTP, tunnel 등을 갈아끼우는 계층.

AioxIdentity
agent token, daemon token, org identity, public key, mTLS 같은 신뢰 계층.

AioxPolicy
누가 누구에게 보낼 수 있는지, 어떤 capability를 줄 수 있는지, 외부망 전송 가능 여부.

가장 중요한 설계 원칙은 이것입니다.

> AioxEnvelope와 Route는 location을 몰라야 한다.
> local/remote 차이는 Transport와 Identity가 처리해야 한다.

즉 처음부터 메시지를 이렇게 만들면 안 됩니다.

{
"targetSocket": "/tmp/aiox.sock",
"targetAgent": "reviewer"
}

대신 이렇게 가야 합니다.

{
"protocol": "aiox.message.v1",
"from": "agent://local/aiox-dev/impl",
"to": "agent://local/aiox-dev/reviewer",
"messageId": "msg_123",
"parentMessageId": null,
"intent": "delegation",
"body": {
"format": "text/markdown",
"text": "이 코드 리뷰해줘"
}
}

local일 때는 resolver가 agent://local/...을 같은 daemon registry에서 찾고, remote일 때는 remote daemon endpoint로
라우팅하면 됩니다.

내 추천 확장 순서는 이겁니다.

1. Local first
   - same daemon
   - same machine
   - durable mailbox
   - directed routes
   - AioxEnvelope v1

2. Local multi-daemon
   - 같은 머신 안에서도 project/profile별 daemon 분리
   - agent://profile/project/name 주소 체계 도입

3. Local ↔ Remote
   - remote daemon 등록
   - tunnel/WebSocket transport
   - daemon-to-daemon auth
   - remote route는 explicit allow만

4. Company internal federation
   - org namespace
   - team/project ACL
   - audit log
   - shared capability registry
   - policy-as-config

5. Remote ↔ Remote
   - public federation
   - signed envelope
   - encryption
   - replay protection
   - quota/rate limit
   - abuse/safety model

여기서 Post-MVP에서 지금 당장 박아야 하는 건 remote 구현이 아닙니다. 박아야 하는 건 나중에 remote가 들어와도 깨지지 않
는 내부 추상화입니다.

즉 지금 결정할 것:

AioxEnvelope는 location-neutral하게 만든다.
Agent address는 string id가 아니라 URI-like address로 확장 가능하게 둔다.
Transport는 adapter와 분리한다.
Route는 local/remote 모두 같은 모델로 표현한다.
Mailbox는 offline delivery를 전제로 둔다.
Capability는 trust domain을 포함할 수 있게 둔다.

미뤄도 되는 것:

remote daemon 구현
company SSO
mTLS
public federation
cloud relay
multi-tenant billing
remote capability marketplace

결론적으로, 당신이 만들고 싶은 건 이렇게 정의하는 게 제일 정확합니다.

> aiox는 local-first agent-to-agent communication runtime이고, 장기적으로는 daemon federation을 통해 local↔remote,
> internal network, remote↔remote까지 확장 가능한 A2A protocol layer다.

그래서 지금 compose.yaml보다 더 앞에 있는 핵심 설계는 AioxEnvelope v1, Agent Address, Transport abstraction, Trust
Domain입니다.

---

@user
› 여기에 추가할건
sandbox? 이런 보완과 관련된것도 추가해야 할거고

---

• 맞습니다. remote까지 생각하면 sandbox/security는 별도 축으로 반드시 들어가야 합니다. 다만 한 덩어리로 보면 안 되고, 최
소 4층으로 쪼개야 합니다.

1. Identity/Auth
   누가 말하는가
   agent token, daemon token, org identity, key pair, mTLS

2. Authorization/Policy
   무엇을 할 수 있는가
   route allow, capability allow/deny, project/org ACL

3. Capability Isolation
   어떤 tool/MCP/skill이 보이는가
   launch-scoped MCP, per-agent token, deny-by-default runtime MCP

4. Sandbox/Execution Isolation
   실제 OS/파일/네트워크/프로세스를 어디까지 막는가
   container, VM, OS sandbox, restricted cwd, read-only FS, network policy

지금 aiox가 MVP/Post-MVP 초반에 현실적으로 보장할 수 있는 건 1~3입니다. 즉 “이 agent가 aiox route 밖으로 메시지를 못 보
내게 한다”, “이 agent에게 GitHub MCP를 안 준다”, “이 daemon token으로는 해당 project만 접근 가능하다” 같은 것.

반면 진짜 sandbox는 더 무겁습니다.

agent가 shell tool로 rm을 실행 못 하게 막기
agent가 filesystem을 직접 읽지 못하게 막기
agent가 네트워크로 외부 전송하지 못하게 막기
agent가 다른 project 파일을 읽지 못하게 막기

이건 MCP 설정만으로는 안 됩니다. OS/process boundary가 필요합니다.

장기 설계에는 이렇게 넣는 게 좋습니다.

AioxSandboxProfile
none
cwd-readonly
cwd-write
container
vm
remote-worker

예시:

agents:
reviewer:
kind: claude
role: reviewer
capabilities: [github-readonly]
sandbox:
profile: cwd-readonly
network: deny
filesystem:
read: ["."]
write: []

하지만 이걸 지금 바로 구현하려고 하면 scope가 터집니다. 추천 순서는:

1. 지금 문서에 개념 추가
   - capability isolation은 sandbox가 아니다.
   - sandbox는 별도 future layer다.
   - compose schema에 sandbox key는 예약 가능.

2. Post-MVP 초반
   - sandbox.profile: none | advisory
   - CLI에 경고/doctor만 제공
   - 실제 강제는 하지 않음

3. Post-MVP 중반
   - Docker/Podman 기반 sandbox adapter
   - read-only mount, restricted cwd
   - network on/off

4. 나중
   - Firecracker/VM
   - company internal policy
   - remote worker sandbox
   - signed/audited execution

중요한 문구는 이겁니다.

> Capability isolation controls what aiox gives to an agent.
> Sandbox controls what the operating system allows the agent process to do.

이 둘을 섞으면 위험합니다. aiox가 GitHub MCP를 안 줬어도 agent CLI가 shell이나 network를 직접 쓰면 우회할 수 있습니다.
그래서 보안 모델에는 반드시 capability와 sandbox를 분리해서 써야 합니다.

결론: 네, 추가해야 합니다. 단, sandbox는 compose/capability와 같은 레벨의 독립 top-level concern으로 잡고, 초기에는 “예
약 + 명시적 non-guarantee”로 두는 게 맞습니다.

---

@user
› 오케이 여기서 추가하는건
codex app, claude app등도 나중에 서로 연결도 시키는거겠네

---

맞습니다. 장기적으로는 CLI agent뿐 아니라 Codex App, Claude App 같은 GUI/native app agent도 같은 A2A 표준 위에 붙이는
방향입니다.

그러면 kind는 단순히 codex | claude가 아니라 더 넓어집니다.

codex-cli
claude-cli
gemini-cli
ollama-local
codex-app
claude-app
vscode-agent
remote-agent
browser-agent

핵심은 “앱 종류”가 아니라 그 agent가 aiox protocol에 어떻게 attach/inject/reply 하느냐입니다.

AgentAdapter
launch/attach: 어떻게 실행하거나 연결하는가
ingress: aiox 메시지를 어떻게 받는가
egress: aiox로 어떻게 답하는가
identity: 이 세션/앱 인스턴스를 어떻게 식별하는가
capability: MCP/tool/skill을 어떻게 주입하거나 제한하는가

CLI는 터미널 foreground process로 붙고, App은 보통 이런 방식 중 하나가 됩니다.

1. App이 직접 aiox protocol 지원
   가장 좋음. app 내부에 aiox connector가 있음.

2. App plugin/extension으로 연결
   Claude plugin, VS Code extension, Codex app extension 같은 방식.

3. Local bridge/sidecar
   앱 옆에 작은 bridge process를 띄워서 app API와 aiox daemon을 연결.

4. Prompt/text injection fallback
   제일 약함. 구조화가 안 되고 신뢰도가 낮음.

그래서 장기 목표를 이렇게 잡으면 됩니다.

> aiox는 “CLI 통합기”가 아니라 “agent runtime connector”다.
> CLI, desktop app, editor extension, remote worker는 모두 adapter surface가 다른 agent runtime일 뿐이다.

이 관점이면 지금 설계가 더 선명해집니다.

AioxEnvelope 모든 agent runtime이 공유하는 메시지 표준
AioxDaemon route/mailbox/state/policy owner
AgentAdapter 각 runtime을 aiox protocol에 붙이는 driver
AioxTransport local socket, app plugin, WebSocket, remote tunnel 등
AioxPolicy route/capability/sandbox/trust 제어

다만 현실적으로는 순서가 중요합니다.

1. CLI first
   - Codex CLI, Claude CLI
   - 지금 MVP와 가장 가까움
   - terminal UX 검증 가능

2. Editor next
   - VS Code extension / Cursor / Windsurf
   - 터미널 여러 개 띄우는 UX 개선에 직접 도움

3. App/plugin
   - Codex App, Claude App이 확장 API를 제공할 때 adapter 추가
   - app 내부 메시지 surface가 없으면 bridge/fallback 필요

4. Remote/federation
   - daemon↔daemon
   - org/internal network
   - remote agent

그래서 네, 나중에는 Codex App ↔ Claude App, Codex CLI ↔ Claude App, VS Code Agent ↔ remote Claude 같은 연결도 같은 모델
로 갈 수 있습니다. 단, 지금 바로 “앱 연결”을 구현 목표로 넣기보다는 AgentAdapter와 AioxEnvelope를 app까지 감당 가능한
형태로 설계해두는 게 맞습니다.
