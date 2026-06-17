> Archived investigation record. This file is not authority.
> Accepted decisions were consolidated into `../../../docs/specs/aiox-a2a.md`, with rationale in
> `../../../history/58-post-mvp-a2a-architecture-decisions.history.md`.
> Internal references may mention old paths as point-in-time conversation context.

---
@user
내 질문

post mvp를 하기 전 몇가지 질문을 하고 싶음
claude는 mcp plugin으로 하고 codex는 -c option으로 1회성 mcp 를 주입하는데 설계가 이게
맞을까나?
대칭 구조로 하고 나중에 다른 agent들도 추가로 확장한다면 어떤 설계가 나을지가 궁금함

docker와 같이 compose.yaml 파일을 도입한다면
CLAUDE.md, AGENTS.md와 같은 걸 주입할 수 있나? 결국 프로젝트에서 CLAUDE.md와 AGENTS.md
를 없애고 하나의 yaml로 통합하는건데 기술적으로 가능한지가 궁금하고, description으로
각각의 agent에 ㄷ해 설명, 그리고 role과 같은 것도 추가해서 서로 상대방의 역할과 역할에
대한 설명을 작성해놓으면 mcp 호출 할 때 좋을거 같은데 기술적으로 가능한지가 궁금함

각 agent의 skills들과, mcp tool을 통합이라고 해야하냐, 예를 들어 aiox/ 하위에 mcp tool
들, skills를 인식? 하게 하면 좋을거 같은데 이것도 가능한지 그리고 위에서 말한 compose
에 따른 각각의 agent들에게만 주어지는 mcp tool, sklills로 isolation가능하면 좋을거 같
은데 이것도 기술적으로 가능한지 궁금함
---

• 결론부터 말하면: 겉으로는 대칭, 내부 구현은 agent별 native 방식이 맞습니다.

Claude는 plugin/dev-channel/--mcp-config, Codex는 -c mcp_servers...처럼 주입 방식이 달
라도 괜찮습니다. 중요한 건 aiox 내부 contract가 이렇게 대칭이면 됩니다.

AgentAdapter {
kind: "codex" | "claude" | "gemini" | ...
launch(agentSpec, resolvedRuntimeConfig)
inject(message)
receiveFromAgent(...)
healthcheck(...)
}

즉 사용자는 compose.yaml에 “이 agent는 어떤 role, tools, skills, routes를 가진다”만 쓰
고, aiox가 Codex/Claude/Gemini별 launcher args, 임시 config, plugin activation, env를
컴파일하는 구조가 좋습니다.

추천 설계
aiox.compose.yaml을 권위 source로 두되, CLAUDE.md/AGENTS.md를 “직접 대체”하려 하지 말고
agent-native instruction으로 변환하는 게 낫습니다.

예:

version: 1

agents:
impl:
kind: codex
role: implementer
description: "TDD로 기능 구현. 권위 문서와 checklist를 우선한다."
instructions:
from: - .ai/tdd.md - prd/mvp/aiox-mvp-spec.md
mcp: - aiox - github
skills: - tdd - github-review

    reviewer:
      kind: claude
      role: reviewer
      description: "설계 일관성, 회귀, 문서 drift를 검토한다."
      instructions:
        from:
          - .ai/tdd.md
          - history/15-mvp-design-decisions.history.md
      mcp:
        - aiox
      skills:
        - code-review

routes: - from: impl
to: [reviewer]

aiox는 이걸 내부 IR로 파싱한 뒤:

- Codex: 임시 config.toml 또는 -c override로 mcp_servers, model_instructions_file,
  skills.config 등을 주입

- Claude: --mcp-config, plugin activation, --append-system-prompt 또는 generated
  instruction file/settings를 주입

- 다른 agent: 그 agent가 지원하는 config 방식으로 변환

이 방식이면 compose는 대칭이고, adapter는 비대칭을 흡수합니다.

CLAUDE.md, AGENTS.md 제거 가능성은 기술적으로 가능하지만 조건부입니다.

Codex 쪽 공식 문서 기준으로는 AGENTS.md 외에 model_instructions_file,
developer_instructions, project .codex/config.toml, MCP server 설정, skills.config가 있
습니다. 그래서 aiox가 YAML에서 generated markdown instruction file을 만들고 Codex에
model_instructions_file로 넘기는 방식은 가능합니다. Codex MCP도 공식적으로
mcp_servers.<id> 설정과 enabled_tools/disabled_tools를 지원합니다.

Claude 쪽은 공식 문서상 CLAUDE.md가 project instruction의 기본 경로이고, custom
instruction은 CLAUDE.md 또는 --append-system-prompt가 권장 경로입니다. 그래서 파일을 없
애려면 aiox claude가 compose 내용을 prompt/config로 매번 주입해야 합니다. 다만 Claude
문서도 “CLAUDE.md는 user message 성격이며 strict 보장은 아님”이라고 설명하므로, 반드시
지켜야 하는 것은 hook/permission/settings 쪽으로 내려야 합니다.

MCP tools/skills 통합과 isolation
가능합니다. 다만 “진짜 통합 런타임”이 아니라 aiox registry + agent별 projection으로 봐
야 합니다.

- aiox/mcp/\*: aiox가 소유한 MCP 서버 정의
- aiox/skills/\*: host별 skill 원본 또는 공통 skill metadata
- compose.yaml: 어떤 agent에게 어떤 MCP/skill을 줄지 선언
- adapter compiler: Codex/Claude/Gemini native config로 변환
- daemon: agent identity, token, route, tool exposure policy 관리

Isolation도 가능합니다. 오히려 compose를 도입하는 가장 큰 이유가 이겁니다.

- agent별 MCP allowlist
- tool별 allow/deny
- agent별 token/env
- launch-scoped config
- generated temp config cleanup
- required: true MCP startup failure policy
- role별 skills enablement

단, Claude plugin은 “설치/활성화 상태”가 남는 모델이라 Codex의 완전한 one-off -c와 100%
같은 isolation은 어렵습니다. 그래서 aiox 설계에서는 “compose상 isolation”을 권위로 두
고, adapter가 각 host에서 가능한 가장 좁은 scope로 구현하는 게 현실적입니다.

내 추천 옵션은 이겁니다.

Option A: native files 유지
CLAUDE.md, AGENTS.md, .codex/config.toml, .claude/settings.json을 계속 직접 관리.
간단하지만 drift가 생깁니다. agent가 늘어날수록 관리가 깨집니다.

Option B: compose가 source of truth, native config는 generated
추천. aiox.compose.yaml만 사람이 편집하고, launch 시 임시/generated native config를 만
듭니다.
되돌리기 쉽고, agent 추가에도 강합니다. 단 schema/compiler/검증이 필요합니다.

Option C: 모든 agent를 aiox MCP 하나로만 통제
표면은 깔끔하지만 부족합니다. MCP는 tool transport이지 project instruction, skill
loading, permission, memory를 전부 대체하지 못합니다.

그래서 Post-MVP 방향은 Option B가 맞습니다. 현재 Claude plugin vs Codex -c 비대칭은 문
제라기보다 adapter 구현 디테일입니다. aiox의 product model은 compose -> normalized
agent spec -> vendor adapter compile/launch로 잡는 게 확장성 좋습니다.

참고한 현재 문서: OpenAI Codex config/MCP docs, Claude Code memory/MCP/settings docs.
Sources: https://developers.openai.com/codex/config-reference,
https://developers.openai.com/codex/mcp, https://code.claude.com/docs/en/memory,
https://code.claude.com/docs/en/mcp, https://code.claude.com/docs/en/settings

---

@user
내가 말한것

› 아 CLAUDE.md, AGENTS.md에 대해 제거 하자는게 아니야
aiox compose로 만든 지시서와 같은 성격의 문서들을 각각의 agent들이 실행되면 읽을 수 있
게 할 수 있냐 이말임
aiox를 안쓰는 곳에서는 당연히 각각의 md문서를 읽어야 하니까

---

• 가능합니다. 그 방향이 더 맞습니다.

정리하면 CLAUDE.md, AGENTS.md는 그대로 두고, aiox compose가 추가 지시서 레이어를 만들어
서 aiox로 실행된 agent에게만 주입하는 구조입니다.

예를 들면:

agents:
impl:
kind: codex
role: implementer
instructions:
generated: true
include: - prd/mvp/aiox-mvp-spec.md - plan/mvp-implementation-checklist.md
text: |
You are the implementation agent for this aiox session.
Follow TDD and update authority docs before memory.

    reviewer:
      kind: claude
      role: reviewer
      instructions:
        generated: true
        text: |
          You are the review agent.
          Focus on architecture drift, missing tests, and product contract breaks.

실행 시 aiox가 내부적으로 이런 파일을 만들 수 있습니다.

.aiox/runtime/<session-id>/agents/impl/instructions.md
.aiox/runtime/<session-id>/agents/reviewer/instructions.md

그리고 각 adapter가 agent별로 주입합니다.

Codex는 공식 config에 model_instructions_file이 있으므로, generated instruction file을
가리키는 임시 config 또는 -c override로 넣는 방식이 자연스럽습니다. AGENTS.md는 계속 기
본 project instruction으로 읽히고, aiox instruction은 그 위에 “이 세션의 역할/route/
tool policy”를 추가하는 레이어가 됩니다.

Claude는 CLAUDE.md를 계속 읽게 두고, --append-system-prompt 또는 launch-scoped/
generated prompt 파일/설정 레이어로 aiox instruction을 추가하는 방식이 가능합니다.
Claude 쪽은 CLAUDE.md가 기본 project memory이고, aiox compose instruction은 “이번
orchestrated session에서 너는 reviewer다” 같은 runtime role instruction이 됩니다.

권장 우선순위는 이렇게 잡는 게 좋습니다.

1. host system/developer policy
2. AGENTS.md / CLAUDE.md 같은 project-native instruction
3. aiox compose generated session instruction
4. user prompt
5. agent memory

단, 충돌을 줄이려면 compose instruction은 AGENTS.md/CLAUDE.md를 대체하지 말고 역할,
route, tool scope, collaboration protocol 위주로 둬야 합니다.

즉 결론은:

- aiox 안 쓰는 일반 실행: 기존처럼 AGENTS.md, CLAUDE.md만 사용
- aiox compose up: 기존 문서 + compose에서 생성한 agent별 지시서 추가 주입
- agent별로 서로 다른 role/description/tools/skills/instructions 주입 가능
- 이건 기술적으로 가능하고, Post-MVP compose 설계의 핵심 기능으로 두기 좋습니다.

---

@user
내 답변

› 그러면 너가 말한거에 대해서 AGENTS.md와 CLAUDE.md를 완전 대체 가능한 해결방법이라고 봐
도 되냐

---

아니요. 완전 대체 가능한 해결방법으로 보면 안 됩니다.

정확히는:

AGENTS.md / CLAUDE.md
= 해당 agent host가 원래 읽는 project-native instruction layer

aiox compose generated instruction
= aiox로 실행할 때만 추가되는 orchestration/session layer

aiox compose가 기술적으로 많은 내용을 주입할 수는 있지만, 완전 대체가 아닌 이유가 있습
니다.

1. aiox를 안 거치면 안 읽힘
   사용자가 그냥 codex나 claude를 직접 실행하면 compose-generated instruction은 적용되
   지 않습니다. 반면 AGENTS.md, CLAUDE.md는 각 도구의 native entry point입니다.

2. host별 semantics가 다름
   Codex의 AGENTS.md, Claude의 CLAUDE.md는 각 제품이 정한 로딩 순서, trust, project
   root 탐색, memory 처리, config precedence를 가집니다. aiox가 흉내낼 수는 있어도 동일
   한 의미를 보장하긴 어렵습니다.

3. 권위 문서 역할이 다름
   AGENTS.md/CLAUDE.md는 repo에 들어온 모든 agent에게 적용되는 기본 규칙입니다.
   aiox compose는 특정 orchestrated run의 역할, route, tool isolation, 협업 프로토콜을
   정의하는 실행 설정에 가깝습니다.

4. 장기 호환성
   Codex/Claude가 instruction 로딩 규칙을 바꾸면 native 문서는 계속 제품이 책임집니다.
   compose 주입은 aiox adapter가 계속 따라가야 합니다.

그래서 추천 모델은 이겁니다.

공통 repo 규칙:
AGENTS.md / CLAUDE.md

aiox 실행 토폴로지:
aiox.compose.yaml

agent별 session role:
aiox-generated instructions

agent별 tools/skills isolation:
aiox-generated native config / plugin / mcp injection

즉 aiox compose는 대체재가 아니라 상위 orchestration layer입니다.
“aiox를 통해 실행되는 agent들에 한해서는 AGENTS.md/CLAUDE.md 위에 추가 지시를
안정적으로 얹을 수 있다”가 정확한 표현입니다.

---

@user
내 답변
음 무슨 말인지 알겠어
그런데 내가 도커에서 착안해서 compose.yaml이라는 아이디어를 추가해서 post-mvp에 넣자고
한거잖냐

현재 우리 상황에서 뭔가 아키텍처, 설계, 시스템에 대해서 아이디어를 먼저 만들어진 제품?
프로그램?에서 빌려오거나 할게 있으려나?

도커는 os위에 올라와진 docker engine위에서 컨테이너 개념인데
우리는 뭐가 좀더 나으려나?

---

내 생각엔 aiox를 Docker에 너무 가깝게 잡으면 오히려 어긋납니다. Docker의 핵심 객체는
container process인데, aiox의 핵심 객체는 process보다 agent session + message route +
tool capability에 더 가깝습니다.

더 맞는 비유는 하나가 아니라 조합입니다.

가장 가까운 모델

Docker Compose
-> 실행 토폴로지 선언

Kubernetes
-> desired state / actual state / reconciler

systemd
-> service lifecycle, restart, health, logs

MCP host/plugin model
-> tool capability injection/isolation

workflow engine
-> directed message flow, fan-out, reply lifecycle

그래서 나는 aiox를 이렇게 보는 게 가장 낫다고 봅니다.

OS
└─ native agent CLIs: codex, claude, gemini, ...
└─ aiox daemon = local agent control plane
├─ registry: 어떤 agent session이 있는가
├─ router: 누가 누구에게 말할 수 있는가
├─ capability manager: 어떤 MCP/skill/tool을 받는가
├─ runtime adapter: 각 agent를 어떻게 launch/inject/observe 하는가
└─ durable state: messages, deliveries, routes, events

Docker식으로 억지 매핑하면:

Docker Engine ~= aiox daemon
Container ~= AgentInstance / AgentRuntime
Image ~= agent kind + adapter + base config
docker-compose.yml ~= aiox.compose.yaml
Network ~= directed routes
Volume ~= workspace / memory / docs / session state
Healthcheck ~= adapter/channel readiness
Logs ~= agent/channel/message events

근데 중요한 차이는 이겁니다.

Docker container:
process isolation이 핵심

aiox agent:
instruction / tool / route / session isolation이 핵심

그래서 aiox compose는 “프로세스를 띄우는 파일”보다 agent collaboration topology
manifest가 되는 게 맞습니다.

옵션
Option A: Docker Compose 모델을 강하게 따른다
services, depends_on, up/down, logs, inspect 중심.
장점은 사용자 mental model이 쉽습니다. 단점은 agent의 본질인 role, tools, skills,
message route가 Docker 개념에 잘 안 들어갑니다. 나중에 억지 은유가 늘어날 가능성이 큽니
다.
Reversible: 초반엔 가능하지만 services 같은 이름이 public schema가 되면 바꾸기 비쌉니
다.
Deferrable: 지금은 일부만 빌리고 전체 채택은 미룰 수 있습니다.

Option B: Kubernetes/control-plane 모델을 따른다
desired state, actual state, reconcile, status, events 중심.
장점은 현재 MVP 구조와 잘 맞습니다. daemon이 registry/router/state owner이고, compose는
desired state가 됩니다. 단점은 Kubernetes 용어를 그대로 쓰면 개인용 local tool치고 무겁
습니다.
Reversible: 내부 모델로 쓰고 외부 UX는 가볍게 유지하면 바꾸기 쉽습니다.
Deferrable: 내부 IR만 먼저 만들고 reconcile loop는 나중에 강화 가능.

Option C: Workflow engine 모델을 따른다
agent들을 DAG node처럼 보고 message flow를 graph로 정의합니다.
장점은 1:N fan-out, reviewer/implementer/researcher 역할에는 잘 맞습니다. 단점은 long-
running interactive agent와 terminal attach 개념이 약해집니다.
Reversible: routing DSL에만 부분 적용하면 안전합니다.
Deferrable: Post-MVP 후반으로 미뤄도 됩니다.

Option D: “Local Agent Control Plane”이라는 자체 모델
Docker/K8s/systemd/MCP에서 필요한 것만 빌리고, 핵심 객체를 agent, route, capability,
session, delivery로 둡니다.
장점은 현재 제품에 가장 정확합니다. 단점은 새 mental model을 설명해야 합니다.
Reversible: 내부 권위 모델로 잡으면 가장 오래 갑니다.
Deferrable: 지금 이름과 schema 초안은 정해야 합니다.

내 추천은 Option D + UX는 Docker Compose에서 빌리기입니다.

즉 사용자에게는:

aiox compose up
aiox status
aiox logs impl
aiox inspect reviewer
aiox stop

처럼 익숙하게 보이게 하되, 내부 권위 모델은 Docker가 아니라:

Project
Agents
Roles
Routes
Capabilities
Runtime bindings
Message lifecycle

로 두는 겁니다.

compose.yaml도 Docker의 services:를 그대로 복사하기보다 이런 쪽이 낫습니다.

version: 1

project: aiox-mvp-review

agents:
impl:
kind: codex
role: implementer
instructions: - .aiox/instructions/impl.md
capabilities:
mcp: [aiox, github]
skills: [tdd]

    reviewer:
      kind: claude
      role: reviewer
      instructions:
        - .aiox/instructions/reviewer.md
      capabilities:
        mcp: [aiox]
        skills: [review]

routes: - from: impl
to: [reviewer]

policies:
message_lifecycle: explicit_reply
tool_isolation: per_agent

한 줄로 말하면:

Docker에서 빌릴 건 compose up/status/logs/inspect UX고, 시스템 모델은 “agent control
plane + capability graph”로 가는 게 맞습니다.

---

@user
› 현재 내가 원하는게 기술적으로 될수 있을지 조사및 검토를 subagent를 통해 검토해줘
그리고 일론머스크의 제 1원칙을 명시해줘

있는거로 가능하다 이런것도 좋지만 창의력과 , 상상력, 그리고 너의 추론으로 좀더 deep하게

---

검토 결과: 기술적으로 가능하다. 다만 “모든 CLI를 하나의 terminal text protocol로 통합”은 불가능에 가깝고, 가능한 해법은
local agent control plane + adapter capability tier다.

제1원칙
일론 머스크가 말하는 제1원칙 사고는 대략 이거다: 비유나 관습에서 출발하지 말고, 문제를 더 이상 쪼갤 수 없는 물리적/논리
적 사실까지 분해한 뒤 거기서 다시 조립한다.

이 문제의 제1원칙은 다음이다.

1. AI agent는 결국 입력을 받아야 한다.
2. AI agent는 출력 또는 tool call로 응답해야 한다.
3. A가 B에게 말하려면 주소가 필요하다.
4. 답장을 이어가려면 message id / parent id가 필요하다.
5. 여러 agent가 있으면 누가 누구에게 말할 수 있는지 route가 필요하다.
6. tool/skill은 agent별로 다르게 보일 수 있어야 한다.
7. 각 vendor CLI는 입력/출력/tool/MCP 지원 방식이 다르다.
8. 그러므로 aiox core는 vendor CLI를 직접 동일시하면 안 되고, adapter가 native 차이를 흡수해야 한다.

그래서 정답은 Docker도, workflow DAG도, terminal multiplexer도 아니다. 그것들은 일부 UX를 빌릴 수 있는 재료일 뿐이다.

핵심 아키텍처

aiox daemon
= local AI agent control plane

agent
= 이름이 있는 stateful participant

route
= directed message permission A -> B

capability
= agent에게 보이는 MCP / skill / instruction grant

adapter
= Codex, Claude, Gemini, Grok, Ollama CLI의 native 차이를 흡수하는 runtime bridge

message envelope
= 모든 agent 사이를 흐르는 canonical protocol

현재 repo는 이미 절반은 맞는 방향이다. MVP spec은 daemon이 registry/router/state owner라고 잡고 있고, 현재 src/
adapters/contract.ts:53는 inject()만 갖는다. 이게 확장 지점이다. 지금은 codex | claude가 src/core/agent-kind.ts:1이고,
dispatch도 vendor 분기가 남아 있다. Post-MVP에서는 이걸 adapter registry로 바꿔야 한다.

가장 중요한 설계 전환
지금 문제의 본질은 <id ...>{text}</> 같은 text marker가 약하다는 점이다. 이건 Codex가 “이 메시지에 답하려면 MCP tool을
호출해야 한다”는 의미를 항상 안정적으로 인식하지 못하기 때문이다.

해결은 text를 더 예쁘게 만드는 게 아니라, daemon 내부에 canonical envelope를 두는 것이다.

interface AioxEnvelope {
protocol: "aiox.message.v1";
messageId: string;
parentMessageId?: string;
source: { name: string; kind: string };
target?: { name: string; kind: string };
intent: "delegation" | "discussion" | "clarification" | "result" | "conclusion";
lifecycle: "open" | "concluded";
body: { format: "text/markdown"; text: string };
reply: {
tool: "aiox_reply";
parentMessageId: string;
};
}

그리고 adapter가 vendor별로 렌더링한다.

Codex에게는:

  <aiox-message protocol="aiox.message.v1" message_id="msg_123" intent="delegation">
  Use aiox_reply(parent_message_id="msg_123", content=...) when responding.
  ...
  </aiox-message>

Claude에게는 channel notification + metadata.

MCP-capable Gemini/Grok류에게는 structured tool input.

Ollama 같은 일반 CLI에는 best-effort prompt block.

즉 core는 structured, surface는 adapter-specific이어야 한다.

Capability / MCP / skill
가능하다. 단 “완전 격리”라고 부르면 안 된다.

가능한 격리:

agent별 launch-scoped MCP config
agent별 daemon token
agent별 enabled tools
agent별 skill instruction injection
route 없는 대상에게 send/reply 거부

불가능하거나 별도 주제:

vendor CLI가 로컬 파일을 절대 못 읽게 하기
사용자 global config에 있는 tool을 절대 못 보게 하기
agent가 prompt instruction을 절대 어기지 못하게 하기

따라서 표현은 이렇게 해야 한다.

aiox는 capability visibility와 daemon-controlled tool policy를 격리한다.
OS sandbox는 별도 optional layer다.

새 agent 등록
장기적으로는 AgentKind = "codex" | "claude"가 아니라 string adapter id가 되어야 한다.

예:

{
"id": "gemini-cli",
"command": "gemini",
"capabilities": {
"ingress": "mcp-tools",
"egress": "prompt-injection",
"targetBinding": "conversation-id"
},
"supports": {
"structuredReply": true,
"launchScopedMcp": true
}
}

그리고 adapter는 capability tier를 선언한다.

Tier 1: full_duplex_structured
MCP/tools 있고 send/reply 가능

Tier 2: side_channel
HTTP/stdin bridge 가능, structured callback 일부 가능

Tier 3: prompt_only
메시지 주입은 가능하지만 reply는 best-effort/manual

Tier 4: unsupported
status 등록만 가능

이 tier 모델이 중요하다. 모든 CLI를 억지로 Tier 1로 취급하면 설계가 무너진다.

터미널 UX
cross-platform에서는 terminal 자동화가 core가 되면 안 된다.

권장 단계:

Stage 0: manual attach
모든 OS/terminal에서 동작하는 baseline

Stage 1: recipe generator
aiox recipe print tmux
aiox recipe print vscode-tasks
aiox recipe print windows-terminal

Stage 2: launch plan IR
compose를 platform-neutral launch plan으로 컴파일

Stage 3: host plugin
VS Code extension, Windows Terminal recipe, tmux/cmux plugin

Stage 4: daemon-owned headless mode
foreground TUI가 아닌 경우에만 선택적

Windows는 terminal보다 daemon transport가 먼저다. 현재 Unix socket 중심이면 native Windows는 named pipe 또는 TCP
loopback transport abstraction이 필요하다.

내 최종 판단
네가 원하는 제품은 가능하다. 하지만 제품의 본질은 “AI CLI multiplexer”가 아니라:

named AI agents + directed routes + structured message envelope

- per-agent capability grants + vendor adapter registry

이다.

Post-MVP의 첫 큰 설계는 compose.yaml보다도 사실상 이 3개다.

1. AioxEnvelope canonical protocol
2. AgentAdapter를 runtime capability provider로 확장
3. LaunchPlan/Capability IR을 만들고 terminal UX는 recipe/plugin으로 분리

이 셋을 잡으면 Docker compose, VS Code, tmux, Windows Terminal, Codex/Claude/Gemini/Grok/Ollama가 전부 같은 방향으로 붙
는다. 이 셋 없이 compose부터 만들면 YAML은 생기지만, 각 CLI 차이에 계속 끌려다닐 가능성이 크다.
