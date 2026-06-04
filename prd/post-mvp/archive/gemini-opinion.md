> Archived investigation record. This file is not authority.
> Accepted decisions were consolidated into `../aiox-a2a-spec.md`, with rationale in
> `../../../history/58-post-mvp-a2a-architecture-decisions.history.md`.
> Internal references may mention old paths as point-in-time conversation context.

---
@user
aiox Post-MVP 설계 브레인스토밍을 해줘.

     현재 전제:
     - aiox는 local agent orchestrator다.
     - MVP 핵심은 daemon이 agent registry, directed routes, messages,
     deliveries, events를 durable state로 관리하는 것이다.
     - Codex, Claude 같은 agent CLI는 각각 native runtime/adapter 방식이 다
     르다.
     - Docker Compose에서 착안해 `aiox compose.yaml` 같은 선언형 실행 구성을
     Post-MVP에 넣고 싶다.
     - 단, Docker를 그대로 복제하려는 게 아니라, agent collaboration
     topology, role, instruction layer, MCP/tool/skill capability isolation,
     message route를 선언하고 싶다.
     - `AGENTS.md`, `CLAUDE.md`는 없애는 게 아니라 각 host의 native project
     instruction으로 유지한다.
     - `aiox compose`는 aiox로 실행된 agent에게만 추가 session/role
     instruction을 주입하는 orchestration layer로 본다.

     질문:
     1. Docker, Kubernetes, systemd, workflow engine, actor model, service
     mesh, IDE extension/plugin model, MCP host model 등에서 aiox에 빌려올
     만한 아키텍처/개념/명령 UX가 있는지 폭넓게 검토해줘.
     2. aiox의 핵심 mental model은 무엇이 가장 적절한지 제안해줘. 예: local
     agent control plane, capability graph, agent runtime, collaboration
     topology 등.
     3. `aiox compose.yaml`의 top-level schema는 어떤 구조가 좋은지 제안해
     줘. `services`가 나은지, `agents/routes/capabilities/policies`가 나은지
     도 비교해줘.
     4. Codex/Claude/Gemini 등 agent별 native config 방식이 다른 상황에서,
     공통 compose를 어떻게 adapter별 native config로 compile하는 게 좋은지
     설명해줘.
     5. MCP tools, skills, generated instructions를 agent별로 isolation하는
     설계를 제안해줘.
     6. 어떤 개념은 지금 결정해야 하고, 어떤 개념은 Post-MVP 후반까지 미뤄도
     되는지 나눠줘.

     반드시 아래 형식으로 답해줘:
     - 후보 모델별 trade-off
     - 추천 모델과 근거
     - reversibility: 나중에 바꾸면 비용이 큰 부분/작은 부분
                                   - deferrability: 지금 결정해야 하는 부분/미뤄도 되는 부분
     - compose.yaml 예시 1개                                                                   - 위험한 은유나 피해야 할 설계 3개
---

aiox Post-MVP를 위한 선언형 구성(aiox compose) 아키텍처 브레인스토밍 결과입니다.
후보 모델별 trade-off

1.  Docker Compose 모델 (Services 기반) - 장점: 개발자들에게 매우 익숙한 문법입니다. 실행 단위(Service)에 환경변수와 실행 인자를 묶어서 정의하기 직관적입니다.
    - 단점: Agent는 단순한 컨테이너(서버)가 아닙니다. Agent 간의 "대화(Route)"와 "사용 가능한 도구(MCP/Skill)"가 중요한데, 이를 services 블록 안에 전부 구겨 넣으면
      라우팅 토폴로지나 권한 관계가 한눈에 보이지 않고 설정이 비대해집니다. 2. Service Mesh (Istio) & K8s 모델 (Control Plane / Data Plane / Sidecar) - 장점: 네트워크(라우팅), 관측성(Observability), 보안(도구 접근 권한)을
      애플리케이션(Agent)과 명확히 분리합니다. aiox daemon이 Data Plane Proxy(메시지 전달)와 Control Plane(레지스트리) 역할을 하는 현재 구조와 완벽히 일치합니다.
    - 단점: 초기 개념 진입 장벽이 다소 높고, 설정(yaml)이 장황해질 위험이 있습니다. 3. Actor Model (Erlang/Akka)
    - 장점: 상태를 공유하지 않고 비동기 메시지로만 통신하는 Agent의 특성을 잘 반영합니다.
    - 단점: 개발자 대상의 오케스트레이션 도구보다는 프로그래밍 언어 패러다임에 가까워 CLI UX로 차용하기에는 은유가 모호합니다.

                                          추천 모델과 근거

                                                                        추천 모델: "Local Agent Service Mesh" (단순화된 K8s/Istio 은유)

- 근거: aiox는 이미 Agent 사이의 메시지를 중계하고(Mesh Proxy), 어떤 Agent가 살아있는지 등록/관리(Control Plane)합니다. - Agent 자체의 지능과 런타임(native CLI)은 건드리지 않고, "누구와 대화할 수
  있는가(Route)"와 "어떤 도구를 쓸 수 있는가(Capability)"를 외곽에서 주입하고 통제한다는 점에서 Service Mesh의 Sidecar 패턴이나 API Gateway 패턴이 가장 정확한 멘탈
  모델입니다.
  reversibility - 나중에 바꾸면 비용이 큰 부분 (Low Reversibility): - Top-level Schema 구조: services 기반으로 갈지, agents / routes / capabilities 분리 기반으로 갈지 결정하는 것입니다. 초기에 services로 묶어버리면 나중에 N:M 라우팅이나 복잡한 권한 제어를 표현할 때 스키마가 지저분해져 하위 호환성을 깨야 합니다. - Native Config 주입 방식 (Isolation 메커니즘): aiox가 Native Config를 어떻게
  가로채고 주입할 것인가(예: 임시 파일 생성 방식 vs 런타임 프록시 주입). 이 구조가 각 Adapter의 Lifecycle과 엮여 있으므로 초기에 잘못 설계하면 모든 Adapter를 재작성해야 합니다. - 나중에 바꾸면 비용이 작은 부분 (High Reversibility):
  - 지원하는 MCP Server나 Skill의 종류 추가. - Dynamic Routing 정책 (예: 특정 조건에서만 메시지 라우팅). - 로깅 및 관측성(Observability) 데이터 형식.

                                            deferrability

                                                                               - 지금 결정해야 하는 부분 (Do it now):                                                      - compose.yaml의 핵심 스키마 뼈대 분리 (agents, routes, capabilities).                    - Native CLI에게 격리된 환경(Transient Config)을 주입하는 Adapter의 Lifecycle 통합
        방식.                                                                                   - Agent 간 메시지 라우팅의 기본 토폴로지 (단방향, 양방향 등).                           - 미뤄도 되는 부분 (Defer until later):                                                     - N:M 라우팅 룰 (Broadcasting 등) 및 조건부/프롬프트 파싱 기반 라우팅.                    - 외부 호스트(Multi-host) Agent 연동.                                                     - Agent의 Auto-restart / Health check 고도화.
                                           compose.yaml 예시 1개

                                                                        1 version: "1.0"                                                                          2

    3 # 어떤 도구(MCP, Skill)를 사용할 수 있는지 정의 (Isolation 단위) 4 capabilities:
    5 github-tools: 6 type: mcp
    7 command: "npx" 8 args: ["-y", "@modelcontextprotocol/server-github"] 9 local-fs: 10 type: mcp 11 command: "npx" 12 args: ["-y", "@modelcontextprotocol/server-filesystem", "/src"] 13 code-reviewer-skill: 14 type: instruction 15 file: "./instructions/reviewer.md"
    16 17 # 참여하는 에이전트 목록과 사용할 Capability 할당
    18 agents: 19 dev-coder: 20 kind: codex
    21 capabilities: 22 - local-fs 23 # aiox가 런타임에 주입할 추가 프롬프트
    24 system_prompt: "You are the primary developer. Focus on writing code." 25 26 qa-reviewer:
    27 kind: claude 28 capabilities: 29 - github-tools 30 - code-reviewer-skill 31 system_prompt: "You are a QA reviewer. Review code and create GitHub issues."
    32 33 # 에이전트 간의 대화 채널 토폴로지 (Service Mesh Routing)
    34 routes:
    35 - from: dev-coder
    36 to: qa-reviewer
    37 mode: bidirectional # 서로 대화 가능

동작 방식: aiox daemon이 위 YAML을 읽으면, qa-reviewer (Claude)를 실행할 때 github-tools
MCP만 포함된 임시(Transient) claude_desktop_config.json을 생성하고, 이를 가리키는
환경변수/파라미터로 Claude CLI를 실행시킵니다. 따라서 dev-coder는 GitHub MCP에 접근할 수
없는 완벽한 Capability Isolation이 달성됩니다.

위험한 은유나 피해야 할 설계 3개

1.  "Agent는 Container다" (Docker의 완전한 복제)
    - Container는 독립된 파일시스템과 네트워크를 갖지만, Local Agent는 사용자의 로컬
      환경(파일, Git)을 공유하며 작업하는 것이 핵심입니다. Agent를 가상화된 컨테이너처럼
      완전히 샌드박싱하려 하면 로컬 개발 도구로서의 가치가 훼손됩니다.
2.  "aiox가 중앙 통제형 두뇌(Orchestrator Agent)다"
    - aiox 자체에 LLM을 붙여서 하위 Agent에게 명령을 내리는 구조로 가면 안 됩니다.
      aiox는 네트워크 인프라(Router/Registry)여야 하며, 지능과 판단은 연결된 개별
      Agent의 몫이어야 합니다. aiox가 지능을 가지면 병목이 되고 Native Agent의 자율성을
      침해합니다.
3.  services 블록 하위에 라우팅과 도구를 모두 구겨 넣기
    - depends_on 같은 속성으로 라우팅을 표현하려 하면, 데이터의 흐름(메시지)과 실행
      의존성(프로세스 시작 순서)이 혼동됩니다. Agent B가 A에게 메시지를 보낸다고 해서
      B가 A보다 늦게 켜져야 하는 것은 아닙니다. 네트워크 라우팅(routes)과 실행
      주체(agents)는 반드시 분리해야 합니다.
