> Archived investigation record. This file is not authority.
> Accepted decisions were consolidated into `../../../docs/specs/aiox-a2a.md`, with rationale in
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

필요한 근거를 다 확보했습니다. 핵심은 — **aiox는 이미 compose의 뼈대를 갖고 있다**는 점입니다:

- `pending_attach`는 MVP spec에서 이미 *"agent name을 아는 desired-state 흐름, 즉 future YAML compose용"*으로 예약돼 있음 (mvp-spec L678)
- 2개의 MCP 분류(control-plane MCP vs agent-runtime MCP)가 이미 capability isolation의 토대
- Codex `-c mcp_servers.aiox` inline + Claude channel-as-plugin = 이미 **2개의 native-config backend**가 돌아감
- adapter contract의 단일 `inject()` + post-mvp P1(registry refactor)는 `compile()`로 확장될 자리
- profile socket(R4)은 compose project namespace가 재사용할 primitive

그래서 이건 "Docker를 새로 이식"하는 게 아니라 **이미 있는 control plane을 선언형 입력으로 여는** 문제입니다. 아래에 요청하신 형식으로 정리합니다.

---

# aiox Post-MVP: compose 설계 브레인스토밍

## TL;DR (한 줄 결론)

> **aiox = "협업하는 agent들을 위한 local control plane".** daemon이 durable state(누가 있고 / 누가 누구에게 말할 수 있고 / 무슨 말이 오갔나)를 소유하고, agent는 이름으로 주소화되는 **stateful·non-fungible actor**이며, 각 agent 앞의 aiox-managed sidecar가 메시지와 **scoped capability**를 vendor native runtime으로 실어 나른다. `compose`는 그 control plane에 들어가는 **선언형 desired-state**이고, `AGENTS.md`/`CLAUDE.md`는 건드리지 않는 native instruction으로 남는다. compose는 `pair`의 N-agent 일반화다.

---

## Q1. 각 시스템에서 빌려올 것 / 버릴 것

| 시스템                  | 빌려올 핵심 1개                                                               | aiox 매핑                                                                                                         | 버려야 할 것 (독약)                                                                                |
| ----------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Docker Compose**      | 선언형 **project** + `up`/`down` + spec/instance 분리                         | `pair`=이미 spec, agent row=instance. project label로 `down`이 "up이 만든 것만" 회수                              | `services:`(fungible), `scale`/replica, `image`/`ports`/`volumes` 중심성, "container=OS isolation" |
| **Kubernetes**          | **spec vs status 분리 + level-triggered 수렴(reconcile)**                     | compose=spec, daemon state=status. `up`은 재실행 idempotent                                                       | CRD/operator, etcd, pod/replicaset 계층, 분산 시스템 세금 전체                                     |
| **systemd**             | **최소 의존성 순서(`depends_on`/`wants`)** + target 그룹                      | 자리만 남기고 순서는 후순위                                                                                       | `After/Before/Requires/Wants/BindsTo/PartOf` 매트릭스, cgroup/slice, PID-1 권위                    |
| **Workflow engine**     | **durable run + retry/timeout**                                               | delivery FSM이 이미 durable. Open Issue #4 timeout이 여기                                                         | "DAG가 완료된다"는 가정 — agent 협업은 **cyclic·long-lived·conversational** (a↔b)                  |
| **Actor model**         | **mailbox per recipient + name=address + supervision**                        | `message_deliveries`=mailbox, agent name=주소, daemon=supervisor. **가장 깊은 진실**                              | OTP 용어 노출, "actor는 cheap/ephemeral"(agent는 비싸고 human-attached)                            |
| **Service mesh**        | **control plane / data-plane sidecar 분리 + 정책은 plane이 강제**             | **이미 구현됨**: Codex per-agent proxy·Claude channel server=sidecar, daemon=control plane, launch token=identity | L7 HTTP 라우팅, circuit-breaking, xDS, "mesh"(멀티호스트 fleet 없음)                               |
| **IDE extension model** | **manifest가 capability를 declare → host가 scope로 grant** + scope precedence | VS Code `contributes` ≈ compose `capabilities:`. Claude plugin scope precedence는 이미 구현                       | marketplace, activationEvents 복잡도, webview                                                      |
| **MCP host model**      | **MCP = cross-vendor capability lingua franca**                               | Codex/Claude/Gemini 전부 MCP를 말함 → 공통 선언이 가능한 _유일한_ 공통분모                                        | 없음 (이건 native substrate)                                                                       |

**요약:** *본질*에 가장 맞는 건 **actor model + service mesh**(이미 물리적으로 구현됨). *사용자가 원하는 UX 표면*은 **Docker Compose(파일/project/up·down) + k8s reconcile loop(spec↔status)**. systemd는 최소 ordering, VS Code는 capability manifest+scope, MCP는 vendor 횡단 공통어를 보탠다. **Docker/k8s는 위에 얹는 차용 어휘이지 base가 아니다.**

---

## Q2 + Q3. 후보 모델별 trade-off

### (A) 핵심 mental model 후보

| 모델                             | 은유                   | 강점                                                                                               | 약점/위험                                                                                   |
| -------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Local agent control plane** ✅ | k8s/mesh control plane | 구현 진실, 2-MCP 분류를 자연 설명, compose가 "선언형 입력"으로 정확히 들어맞음, 분산 과대약속 없음 | "control plane"은 infra jargon, 협업/토폴로지 측면을 *단독*으론 못 담음                     |
| Capability graph                 | 권한 그래프            | isolation 강조                                                                                     | **routing 그래프와 capability 그래프를 혼동** (서로 다른 두 그래프), runtime/lifecycle 누락 |
| Agent runtime                    | Docker container       | lifecycle/observability 차용 적합                                                                  | *한 박스*의 경계어 — 다수 오케스트레이션을 못 담음                                          |
| Collaboration topology           | 배선 그래프            | routes/compose가 *선언하는 것*을 정확히 지칭                                                       | 시스템이 아니라 _산출물_ 묘사. 상태·capability 누락                                         |
| Actor system                     | 메일박스               | 가장 깊은 내부 진실                                                                                | 학술 용어 → 사용자 노출 부적합                                                              |

### (B) compose.yaml top-level 스키마 후보

| 스키마                                                    | 형태                                                 | 강점                                                                                            | 약점                                                                                                      |
| --------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `services:` (Docker식)                                    | agent map, routing/capability를 각 service 안에 매립 | 친숙함                                                                                          | **routes(관계형·전역)를 한 agent 밑에 숨김**, scale/image/ports 오해 유발, "service=fungible" 오개념 주입 |
| **분해형 `agents`+`routes`+`capabilities`+`policies`** ✅ | daemon domain object와 1:1                           | 토폴로지가 전역으로 읽힘, capability DRY+isolation 가시화, compile 깔끔, durable state와 _동형_ | top-level key 학습량↑, reference 문법 결정 필요                                                           |
| 하이브리드                                                | 분해형 기본 + 작은 건 inline 허용                    | 학습 곡선 완화                                                                                  | 표현 경로 2개 → 검증/문서 부담                                                                            |

### 추천 모델과 근거

**핵심 모델 = "Local agent control plane"** (분해형 스키마 + 하이브리드 inline 허용).
단, **단일 은유 금지** — 명시적으로 *세 층*으로 분리:

1. **Control plane** (daemon): durable state 소유, 정책 강제 — _primary_.
2. **Routing/collaboration topology**: named actor 간 directed message 그래프 (`routes:`) — _데이터 관계_.
3. **Capability grant**: control plane이 declare → sidecar가 inject → vendor가 enforce (`capabilities:`) — _보안/격리 관계_.

근거:

- **control plane만이** ① 돌아가는 코드에 진실하고(daemon=registry/router/state owner) ② 이미 spec에 있는 2-MCP 분류를 그대로 설명하며 ③ compose에게 자연스러운 자리(declarative input→reconciler)를 주고 ④ aiox가 갖지 않은 분산 시맨틱을 약속하지 않는다.
- 사용자가 후보로 든 *capability graph*와 *collaboration topology*는 둘 다 옳지만 **서로 다른 두 그래프**다. 하나로 합치면 안 된다(위험설계 §3). 선언에서는 분리, 강제 시점에서만 연결("capability follows topology").
- **분해형 스키마**를 택하는 이유: aiox의 domain object가 _이미_ agents/routes/deliveries/events다. 스키마는 daemon이 소유한 durable state를 거울처럼 비춰야 한다. `services:`는 가장 중요한 관계 개념인 **routes를 한 agent 밑에 숨겨버린다** — Docker Compose가 `networks:`/`depends_on:`에서 정확히 겪은 고통.
- **compose는 `pair`의 일반화**다: `pair`=하드코딩된 2-slot 예약, compose=N-agent 선언 예약 + routes + capabilities. `routes:`는 `aiox connect a b c`의 선언형, `up`은 "desired agent를 `pending_attach`로 등록 + routes batch 생성". 즉 compose는 _기존 명령을 깨지 않고_ 위에 얹힌다.

---

## Q4. compose → adapter native config 컴파일

이건 **공통 소스언어 → 다중 백엔드 codegen** 문제다. compose=source, 각 adapter=backend, 가운데 **vendor-neutral IR**.

```
compose.yaml
   │  parse + validate (zod, 이미 사용 중)
   ▼
ResolvedSpec  ── 정규화 → vendor-neutral IR ──
   │   ResolvedAgent { name, kind, role, instructions, capabilities, routes }
   │   CapabilitySet  { mcpServers[], tools{allow,deny}, skills[], instructions[] }
   ▼
adapters[kind].compile(IR)  →  NativeLaunchPlan { argv[], env{}, ephemeralFiles[], cleanup() }
   ├─ codex backend : -c 'mcp_servers.X={...}' 플래그 + env(AIOX_SOCKET_PATH/TOKEN) + (필요시) -c 로 참조하는 ephemeral instruction 파일
   └─ claude backend: plugin/.mcp.json (scoped) + plugin enable + env. scope precedence 준수
   ▼
launcher(script/attach)가 plan 실행 + agent를 registry에 pending_attach로 등록
```

설계 원칙(전부 aiox 기존 규율의 연장):

1. **단일 IR, pluggable backend.** vendor 추가 = adapter `compile` 하나 추가, 스키마/파서 무수정. 이건 **post-mvp P1 registry refactor의 일반화** — P1이 원한 `adapters[kind].dispatchToTarget`과 compose가 원하는 `adapters[kind].compile`은 *같은 registry의 두 메서드*다. **둘을 같이 해라.**
   ```ts
   interface AgentAdapter {
     kind: AgentKind;
     inject(input): Promise<AdapterInjectResult>; // 기존 (data plane)
     compile(spec: ResolvedAgent): CompileResult; // 신규 (control plane → native)
   }
   type CompileResult =
     | { kind: "ok"; plan: NativeLaunchPlan; warnings: CapabilityWarning[] }
     | { kind: "unsupported"; reason; capability };
   ```
2. **무음 drop 금지 (typed degradation).** 어떤 backend가 요청한 capability(예: tool deny-list)를 native로 강제할 수 없으면 `CompileResult`가 typed warning을 **surface**해야 한다 — 기존 `deferred`/`failed` typed-reason 규율과 동일. 조용히 무시 = 위험설계.
3. **launch-scoped/ephemeral 기본, global 불변.** MVP 스탠스("MVP must not mutate global Codex or Claude config by default")를 compose도 _반드시_ 보존. 컴파일 산출물은 per-launch(Codex `-c`, Claude ephemeral scope)이고 global write는 사용자가 명시 `setup`을 호출할 때만. 이건 신뢰 계약이라 reversibility가 비싸다.
4. **2-layer instruction 불변식 (사용자 전제의 핵심).**
   - **Native layer**: `AGENTS.md`/`CLAUDE.md` — repo 소유, 모든 세션(aiox든 아니든)에 적용. **compile의 입력(read-only)일 뿐 출력이 아니다.**
   - **Orchestration layer**: compose의 `role`/`instructions` — aiox 소유, _aiox가 띄운 그 세션에만_ 주입, launch plan으로 컴파일, repo 파일에 절대 영속화 안 함.
   - compose가 native instruction을 _읽을_ 순 있어도 _쓰지_ 않는다. (위험설계 §3)
5. **`up`은 launch까지 하지 않아도 된다 (launcher 제약 존중).** MVP launcher 철학은 "script/attach 기본 + daemon은 자기 자식만 kill". 그래서:
   - **기본(now)**: `up`=reservation + capability _compile_ (→ `pending_attach` 생성, native config 준비). 사람이 `aiox codex --name impl`로 attach하는 순간 그 준비된 config/role이 입혀진다. aiox가 터미널을 소유하지 않아도 선언형 가치(토폴로지+capability+role)는 전달됨.
   - **옵션(defer)**: 환경이 받쳐줄 때 recipe(cmux/tmux)로 auto-launch.

---

## Q5. MCP tool / skill / generated-instruction isolation

프레임: **control plane이 per-agent capability grant를 declare → sidecar가 carry → vendor가 enforce.** 핵심 통찰: **격리는 선언이 아니라 enforcement에서 보장**된다(=aiox 자기 runtime MCP).

**Capability set** = named·referenceable 번들 `{ mcpServers, tools, skills, instructions }`. agent가 참조(또는 inline). 4계층 방어:

| 계층                        | 메커니즘                                                                                     | 격리 보장                                                                     |
| --------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Declaration**             | compose `capabilities:` per agent                                                            | 무엇을 줄지 명시                                                              |
| **Compilation**             | adapter가 _그 agent의 grant만_ launch plan에 렌더, 미지원은 surface                          | 선언↔native 일치                                                              |
| **Injection**               | launch-scoped, **절대 global 아님**                                                          | **구조적 격리** — agent A는 B의 MCP server를 _물리적으로_ 못 봄               |
| **Runtime (aiox 자기 MCP)** | launch token = agent identity, daemon이 per-agent tool 노출 + route 체크를 _서버측에서_ 강제 | **신뢰 가능한 격리** — vendor가 tool 이름을 흘려도 daemon이 정책 외 호출 거부 |

깊은 원칙 — **capability follows topology, but is declared separately**:

- 선언은 분리(두 그래프). 하지만 enforcement에서 연결: aiox는 _inbound route가 없는 agent에게 `aiox_reply`를 노출하지 않고_(답할 대상이 없음), _outbound route가 없으면 `aiox_send`를 막는다_. 두 그래프를 _스키마에서_ 합치면 위험설계, _강제 시점에_ 연결하면 올바른 설계.
- aiox가 통제하는 표면(자기 runtime MCP의 tool)은 **deny-by-default + explicit allow**. vendor capability(외부 MCP server)는 **declare-to-include**(나열한 것만 받음).

**정직성(과대약속 금지):** vendor-side config isolation은 *configuration*이지 *OS sandbox*가 아니다. "agent A는 X 못 한다"의 진짜 강제는 aiox가 통제하는 유일한 컴포넌트인 **daemon/runtime-MCP(token+policy)** 에 있어야 한다. vendor CLI의 파일시스템 접근까지 막는 건 별개의 훨씬 큰 문제다.

---

## Reversibility — 바꾸기 비싼 것 / 싼 것

**비싼 것 (지금 신중히 결정):**

- **compose top-level key + `kind` enum + 리소스 네이밍** — 사용자가 파일로 직렬화 → 변경 = breaking migration. 기존 daemon 어휘(`codex`/`claude`, `source→target`, message `type`)를 _그대로_ 재사용하고 synonym 만들지 말 것.
- **2-layer instruction 불변식** (native read-only ↔ orchestration injected) — 신뢰/안전 계약. 나중에 "compose가 AGENTS.md도 쓴다"로 뒤집으면 사용자 repo·신뢰가 깨짐.
- **non-mutation-by-default** (launch-scoped) — 신뢰 계약.
- **adapter `compile` IR 모양** — 모든 future vendor의 확장점.
- **typed degradation 규율** — 무음 drop을 나중에 잡으려면 전 경로 audit 필요.
- **`version:` 필드 존재** — 지금 넣으면 공짜, 나중엔 깔끔히 못 넣음.
- daemon durable schema에 새 영속 개념(예: project label을 row에 박기)을 넣는 것 — 마이그레이션 비용.

**싼 것 (나중에 자유):**

- **주입 메커니즘 자체** (Codex `-c` ↔ 타 방식, Claude plugin ↔ `.mcp.json`) — IR 뒤에 숨음.
- **reconcile 깊이** (one-shot `up` ↔ continuous controller).
- **policies 수치/enum** (timeout 값, `expired` 추가 여부).
- **`up`의 auto-launch** (reservation-only ↔ recipe launch).
- **mental model 명칭** (리브랜딩은 docs 작업).
- **backend 추가** (Gemini 등) — IR/스키마 무수정이면 싸야 _정상_(아니면 IR 설계가 틀린 것).

---

## Deferrability — 지금 결정 / 미뤄도 됨 (Q6)

**지금 결정해야:**

- 분해형 스키마 키 + 기존 어휘 재사용 + `version`/`project`
- 2-layer instruction 경계 + non-mutation 계약
- compile IR / registry (**P1과 함께**)
- **project label**(논리 그룹)의 존재 — `up`/`down` 정합성(daemon namespace는 R4 profile socket이 이미 제공, 그 안의 논리 그룹이 필요)
- capability set = named+referenceable + aiox 자기 MCP는 deny-by-default
- typed capability degradation
- "compose는 `pair`의 일반화이고 `pair`/`connect`를 깨지 않는다"는 관계

**미뤄도 됨:**

- continuous reconcile controller (우선 idempotent 재실행 `up`이 90% 값)
- `depends_on`/ordering DSL (스키마 자리만 남기고 로직은 후순위 — agent는 human-attached라 ordering 압력이 Docker보다 낮음)
- policies 내부값 + `expired` enum (Open Issue #4가 실사용에서 당겨질 가능성은 있음)
- `up`의 auto-launch(recipe)
- scale/replica/quorum/aggregation (agent는 non-fungible; quorum은 이미 post-MVP)
- 3-way/dynamic pair, capability marketplace, multi-host/remote daemon, GUI native split
- `down`이 human-attached agent를 어떻게 처리하나 (daemon은 자기 자식만 kill → UX는 defer, 단 project label은 지금 필요)

> 조직 원칙: **사용자가 직렬화하는 표면(스키마 키·어휘·불변식) + 확장 계약(compile IR)은 지금 lock, 런타임 정교함(reconcile loop·ordering·policy 튜닝·scaling)은 defer.** 표면은 public contract라 비싸고, 런타임 깊이는 내부라 싸게 교체된다.

---

## compose.yaml 예시 1개

```yaml
version: "1"
project: feature-auth # up/down이 만든 것만 회수하는 논리 그룹 (daemon namespace 안)

# ── Capability sets: 한 번 선언, agent가 참조. 격리는 구조적 — 참조한 것만 받음.
capabilities:
  reviewer-kit:
    mcp:
      - name: github
        command: gh-mcp
        args: ["--read-only"]
    tools:
      allow: ["github.pr_read", "github.pr_comment"]
      deny: ["github.pr_merge"] # reviewer는 절대 merge 못 함
    skills: ["code-review"]
  research-kit:
    mcp:
      - { name: web, command: web-mcp }
    tools:
      allow: ["web.search", "web.fetch"]

# ── Agents: named·non-fungible. kind는 daemon 어휘 재사용.
#    role/instructions = ORCHESTRATION layer — aiox가 띄운 세션에만 주입,
#    repo의 AGENTS.md/CLAUDE.md 위에 얹힐 뿐 절대 그 파일을 쓰지 않음.
agents:
  impl:
    kind: codex
    cwd: .
    role: implementer
    instructions: |
      You own the implementation. Address blocking review feedback
      before asking for re-review.
    # 추가 capability 없음 → aiox runtime MCP(항상 주입)만 받음. send/reply는 가능.

  reviewer:
    kind: claude
    cwd: .
    role: reviewer
    capabilities: reviewer-kit # 참조 → scoped grant
    instructions: "Review only. Comment via github tools. You cannot merge."

  researcher:
    kind: claude
    cwd: ../research
    role: researcher
    capabilities: research-kit

# ── Routes: directed topology. capability 그래프와 분리된 "데이터 관계" 그래프.
routes:
  - { from: impl, to: [reviewer, researcher] } # 1:N fan-out (= connect impl reviewer researcher)
  - { from: reviewer, to: [impl] } # 역방향 = 별도 edge → 양방향
  - { from: researcher, to: [impl] }

# ── Policies: cross-cutting. 키는 지금 예약, 값은 나중에 튜닝.
policies:
  delivery:
    timeout: 30m # Open Issue #4
    onTimeout: failed # vs expired (enum 결정은 defer)
  defaults:
    replyRequiresInboundRoute: true # aiox 자기 runtime MCP에서 daemon이 강제 (topology↔capability 연결)
```

읽는 법: `impl`(codex)은 추가 capability 없이도 aiox runtime MCP로 reviewer/researcher에 send. `reviewer`(claude)는 github MCP를 받되 `pr_merge`는 deny — vendor config로 _구조적 격리_ + daemon이 토큰으로 _강제_. `routes`가 토폴로지, `capabilities`가 grant — **두 그래프는 분리, `replyRequiresInboundRoute`에서만 연결**. cross-vendor(codex+claude)는 같은 IR을 각 backend가 `compile`.

---

## 위험한 은유 / 피해야 할 설계 3개

1. **"agent = scale 가능한 service/replica" (Docker `services:`·`scale:` 사고)**
   agent는 stateful·non-fungible·human-attached·비싸다. `scale: 3`은 LB 뒤 fungible stateless replica를 함의 — 거짓. 이걸 들이면 quorum/replica 시맨틱과 "service" 어휘가 daemon의 named-identity 모델을 오염시킨다. Docker에서는 _lifecycle/observability/compose-file 어휘만_ 빌리고 _replica/service 시맨틱은 버려라_. (spec이 이미 `CodexAgentRuntime ≈ container지만 OS isolation 아님`이라 못박은 그 규율을 유지.)

2. **"compose = 완료되는 workflow DAG" (Airflow/GH Actions `needs:` 사고)**
   agent 협업은 **long-lived·cyclic(a↔b)·conversational**이지 terminating DAG가 아니다. `needs:` step 모델은 (a) 존재하지 않는 "done" 상태를 강요하고 (b) cycle(양방향 route)을 깨뜨리고 (c) non-deterministic agent가 위반하는 deterministic-replay 가정으로 끌고 간다. workflow engine에서는 *durable run + retry/timeout*만 빌리고 _DAG-completes 토폴로지는 버려라_.

3. **Orchestration layer가 native layer를 잠식 — "compose가 AGENTS.md/CLAUDE.md를 소유·재작성" (+ "capability isolation = OS sandbox")**
   aiox가 _반드시_ 날카롭게 유지해야 하는 경계 두 개를 뭉개는 설계:
   - compose의 role/instruction을 repo의 `AGENTS.md`/`CLAUDE.md`에 써넣으면 → native instruction(모든 세션용, repo 소유)과 orchestration instruction(aiox 세션만, aiox 소유)이 섞여 repo가 오염되고 비-aiox 세션 동작이 바뀐다. **native는 read-only 입력, orchestration은 launch-scoped 주입** — 불변식.
   - vendor-side config 격리를 "sandbox/jail"이라 부르면 → 사용자가 적대적 agent 봉쇄를 *신뢰*하는데 aiox는 그걸 보장 못 한다(vendor CLI의 FS 접근/미허가 tool 호출은 daemon이 enforcement point일 때만 막힘). 격리는 **구조적(launch-scoped) + 정책강제(aiox runtime MCP token/route)** 라고 정직하게 말하고, OS sandbox는 별개의 큰 주제로 분리하라.

   > (보너스 경계: **routing 그래프 ≠ capability 그래프.** 스키마에서 하나로 합치지 말 것. 강제 시점에서만 `replyRequiresInboundRoute` 식으로 연결.)

---

원하시면 이 결론을 워크플로 관례대로 **`prd/post-mvp/aiox-post-mvp-spec.md`에 `P3 — aiox compose declarative orchestration` 항목**(Motivation/Current state/Target design/Scope 6절)으로 박고, 메모리 인덱스에 한 줄 추가하겠습니다. 지금은 브레인스토밍만 한 상태라 문서 write는 하지 않았습니다 — 박을까요? 아니면 특정 질문(스키마 reference 문법, P1+compile 통합 step 분해, `up`의 reservation↔launch 경계)을 더 깊게 팔까요?

---

@user
내가 원하는건 terminal cli로 ai agent들이 서로 대화 하게 하는거임

- terminal이 여러개 그리고 vscode와 같은 에디터들 여러개 있는데 어떻게 하면 간단하게 ai agent들을 실행 시켜 ux를 향상 시킬 수 있을 까? - mac 뿐만 아니라 winodw, linux에서도 사용 가능하게 하고 싶음 - ai가 사용하는 skill들을 공통으로 사용하게 하고 국소적으로 특정 내 aiox위에서 돌리는 ai에게 따로 skill을 주입, mcp도 마찬가지로 공통 mcp 그리고 aiox 위에서 돌리는 ai에게
  따로 mcp 주입을 간단하게 할 수 있을 까? -a 현재 ai agent cli가 각각 다르기 때문에 aiox를 구축하는데 어떤 ai agent들도 간단하게 등록 할 수 있게 할 아이디어가 있으려나? -a-1 현재 aiox에서는 <id, ~~ >{text} </> 이런식으로 전체 보내는데 이건 codex때문에 mcp tool을 인지하고 reply해야 하는지를 판단하지 못하기 때문임,
  -a-2 claude, codex, gemini, grok, ollama 등 cli agent를 통합하는 그런걸 먼 훗날 만들고 각 ai 회사들 또는 내가 어떻게 하면 cli ai 통합을 이뤄낼 수 있을지 - docker compose는 내가 생각한 아이디어임 반드시 docker compose말고 현재 내가 원하는 프로그램에 적합한 그런 모델 , 아키텍처, 착안할 아이디어가 있을까? - ai여러개가 하나의 프로젝트에 등록되어있다면 A ai -> B ai에게만 보내고 이런걸 만들고 싶은거임
  현재 두서없이 생각나는대로 작성했는데 도움이 필요하다

---

⏺ 두서없이라고 하셨지만 사실 핵심은 분명합니다. 다만 답하기 전에 a-1(Codex가 reply해야 하는지 판단 못 하는 문제) 의 실체를 코드로 확인하겠습니다 — 이게 제일 구체적인 기술
이슈라 실제 envelope 포맷과 Codex inject 경로를 봐야 제대로 답합니다.

Searched for 1 pattern, read 2 files (ctrl+o to expand)

⏺ 코드를 보니 a-1의 정체가 명확해졌습니다. 그리고 envelope에서 구체적인 결함 하나를
찾았습니다. 본격적으로 정리해서 답하겠습니다.

지금 던지신 생각들은 두서없지 않습니다. 사실 7개의 분명한 질문이고, 그 밑에 깔린 멘탈
모델 하나만 바꾸면 전부 깔끔하게 풀립니다. 먼저 그 모델부터 갈아끼우고, 항목별로
가겠습니다.

---

0. 지금 만드는 건 Docker가 아니라 "AI들을 위한 사설 교환대"다

Docker compose를 버리라고 하셨으니 정면으로 답합니다. Docker가 안 맞는 이유는
단순합니다:

▎ Docker는 "내가 프로세스를 소유하고 격리한다"가 핵심인데, 당신은 AI를 자기
▎ 터미널·에디터에서 직접 띄우고 눈으로 봅니다 (human-attached). aiox는 그 프로세스를
▎ 소유하지 않습니다. Docker의 심장(격리된 소유 컨테이너)이 처음부터 안 맞습니다.

당신 의도에 맞는 모델은 이 둘의 결합입니다:

- 사설 메신저 / 전화 교환대(switchboard/PBX) — 사람이 수화기(터미널)를 들면,
  교환대(daemon)가 "누가 연결됐는지" 알고 회선만 잇습니다. A→B는 DM, project는 채팅방,
  1:N은 그룹, 각 agent는 권한(skill/MCP)을 가진 봇, 메시지는 대화. →
  routing·project·capability가 전부 이 하나의 비유로 직관적으로 설명됩니다.
- 터미널 멀티플렉서(tmux류) — "소유"가 아니라 "attach" — aiox는 세션을 죽이거나 가두지
  않고 부착만 합니다. 이미 MVP launcher가 이 방향(script/attach)입니다.

내부 엔진의 진실은 지난번과 동일합니다(actor model=mailbox, service mesh=control/data
plane 분리). 사용자에게 보여줄 얼굴은 "AI들을 위한 사설 메신저", 엔진의 진실은 "control
plane + actor mailbox". Docker에서 빌릴 가치는 딱 하나, 선언 파일 UX 표면뿐입니다.
멘탈 모델은 교환대로 가세요.

---

1. UX: 여러 터미널·에디터에서 간단히 띄우기 (+ 크로스플랫폼)

원칙 하나만 지키면 됩니다: aiox는 터미널을 소유하지 말고 attach만 한다. 그러면
크로스플랫폼이 거의 공짜가 됩니다.

- 기본 모드 (truth): 각 터미널/에디터 통합 터미널에서 사람이 aiox claude --name
  reviewer를 직접 친다. 단순하고, 그냥 프로세스 spawn이라 mac/win/linux 공짜. 단점은
  터미널을 사람이 연다는 것뿐.
- 편의 모드 (옵션 plugin = recipe): tmux(mac/linux) · Windows Terminal(wt) · VS Code
  tasks로 자동 배치. 절대 코어에 박지 마세요 — 여기가 크로스플랫폼 지옥입니다. MVP가 이미
  recipes로 격하해둔 게 정답입니다.
- VS Code / 에디터: 별도 GUI 확장 만들지 마세요(지금은). VS Code tasks.json에 aiox
  codex --name impl를 등록 → 버튼/단축키 하나로 통합 터미널 패널에 agent가 뜹니다.
  Cursor·Windsurf 다 VS Code 계열이라 그대로 재사용. 최소 코드로 최대 UX.
- 크로스플랫폼의 진짜 숙제는 딱 하나: Unix domain socket. Windows는 named pipe입니다.
  (메모리 보니 R4에서 이미 인지하고 "Windows round로 defer"한 상태 — 맞는 판단입니다.)
  지금 할 일은 transport 추상화 인터페이스만 박아두는 것(Unix socket | Windows named pipe
  | TCP loopback). 구현은 점진. 그 외 spawn/종료 signal(Windows엔 SIGTERM 없음),
  경로(~/.aiox vs %APPDATA%)는 작은 분기로 끝납니다.

---

2. skill / MCP 공통 + 국소 주입 — "3층 병합"이 정답

원하시는 "공통으로 쓰되 특정 agent엔 따로 주입"은 정확히 layered config merge입니다.
git config·eslint·VS Code settings가 다 쓰는 검증된 패턴이라 새로 발명할 게 없습니다.

global (~/.aiox) 내 모든 aiox agent 공통 skill/MCP pool
└─ project (compose) 이 프로젝트(=방) 공통
└─ agent 이 agent에만 추가/override

- 병합 규칙: 좁은 스코프가 추가·override. deny는 누적(보수적).
- "간단하게"의 핵심: named capability set + reference. 공통은 global에 한 번 선언,
  국소는 agent에서 이름으로 참조하거나 inline. (지난 답변의 capabilities: 블록이 이것.)
- 결정적 제약: aiox는 자기가 띄운 세션에만 주입합니다. ~/.codex/config.toml 같은
  OS-global을 안 건드립니다(Codex -c launch-scoped, Claude plugin scoped). 그래서
  "aiox-global ≠ OS-global" — "공통이지만 aiox 위에서만 적용"이 자연스럽게 성립합니다.
  이게 당신이 원한 바로 그 동작입니다.

---

3. 아무 agent CLI나 쉽게 등록하기 (a) — "driver" 모델

비유: 프린터 드라이버 / VS Code Language Server. agent CLI = 외부 장치, aiox = 공통
인터페이스, adapter = driver. 새 agent 등록 = driver 하나 작성.

aiox가 각 agent에 대해 채워야 할 슬롯은 4개뿐입니다:

┌──────────┬───────────────────────┬────────────────────┬──────────────────────────┐
│ 슬롯 │ 질문 │ Codex │ Claude │
├──────────┼───────────────────────┼────────────────────┼──────────────────────────┤
│ │ 어떻게 띄우고 │ -c │ │
│ launch │ per-launch로 │ 'mcp_servers...' │ plugin scoped │
│ │ MCP/config를 붙이나 │ inline │ │
├──────────┼───────────────────────┼────────────────────┼──────────────────────────┤
│ inbound │ 메시지를 어떻게 │ turn/start 텍스트 │ notifications/channel │
│ │ 밀어넣나 │ │ (structured) │
├──────────┼───────────────────────┼────────────────────┼──────────────────────────┤
│ outbound │ agent가 어떻게 │ MCP tool │ channel reply tool │
│ │ 되돌려보내나 │ aiox_send/reply │ │
├──────────┼───────────────────────┼────────────────────┼──────────────────────────┤
│ identity │ 어느 세션/thread가 이 │ thread id + proxy │ channel token │
│ │ agent인가 │ 관찰 │ │
└──────────┴───────────────────────┴────────────────────┴──────────────────────────┘

핵심 통찰 두 개:

- 완전 자동(zero-code) 등록은 불가능합니다 — CLI들이 너무 다릅니다. 하지만 이 4슬롯으로
  contract를 표준화하면 새 agent = 작은 driver 파일 하나가 됩니다.
- 난이도를 가르는 단 하나의 축은 "MCP server를 launch-scoped로 붙일 수 있나?" 입니다.
  붙일 수 있는 CLI(Claude, Codex, 점점 Gemini)는 공통 MCP ingress를 그대로 재사용 → 거의
  공짜. 못 붙이는 CLI(일부 ollama 래퍼 등)는 inbound/outbound를 텍스트로 만들어야 해서
  훨씬 비쌉니다. 그러니 "MCP 지원 = 1급 시민, 미지원 = best-effort" 로 정책을 명시하세요.

---

4. a-1: Codex가 reply해야 하는지 판단 못 하는 문제 (코드로 확인함)

이게 제일 중요한 기술 이슈라 깊게 봤습니다. 근본 원인은 두 가지입니다.

원인 ①: Codex는 두 표면이 끊겨 있다.
inbound는 turn/start로 텍스트가 들어옵니다 (injector.ts에서 input:[{type:"text",
text}]). Codex 입장에선 그냥 사람이 친 입력처럼 보입니다. 반면 outbound는 별개의 MCP
tool(aiox_reply)입니다. 둘을 잇는 다리가 CODEX_INGRESS_INSTRUCTIONS라는 자연어
지시뿐이라, 모델이 "이 텍스트는 사실 답해야 하는 aiox 메시지"라고 스스로 연결해야
합니다. Claude가 더 잘 되는 이유는 notifications/claude/channel이라는 별도 채널
표면으로 받아 "이건 외부 채널 메시지"라는 프레이밍이 붙기 때문입니다. Codex의
turn/start엔 그 프레이밍이 없습니다.

원인 ②(구체적 결함): envelope가 message type을 버린다.
주입되는 envelope는 <aiox-channel source="..." message_id="...">text</aiox-channel>
입니다 (mcp-server.ts:21). 그런데 도메인 모델에는 type enum이 이미 있습니다 — question
/ instruction / status / event / reply (mvp-spec). 즉 "이게 답을 요구하는 질문인지,
그냥 status 통보인지"를 가르는 신호가 도메인엔 있는데 envelope가 그걸 떨어뜨립니다.
Codex는 reply 여부를 판단할 재료 자체를 못 받습니다.

해결 (얕은 것부터):

1. envelope에 type과 명시적 reply_expected를 실어라. 이미 있는 도메인 type을 재사용.
   <aiox-channel source="reviewer" type="question" reply_expected="true"
   message_id="m123">. → 가장 싸고 효과 큼.
2. _reply 지시를 주입 턴 안에 넣어라(locality)._ MCP server instructions는 멀고
   약합니다. 주입 텍스트 끝에 [aiox] 답하려면 aiox_reply(parent_message_id="m123", ...)를
   호출. 평문으로 답하지 말 것.을 붙이면 recency 덕에 훨씬 잘 따릅니다.
3. (더 깊게) "알림 + 풀(pull)" 분리. turn/start는 가벼운 nudge("aiox 메시지 1통,
   aiox_inbox() 호출")만 주고, 실제 내용+구조화 메타데이터(message_id, source, reply
   여부)는 MCP tool 결과로 돌려줍니다. 그러면 모델의 일이 자명해집니다: nudge 보고 → tool
   호출 → 구조화된 메시지+reply 방법 수령 → reply tool. 텍스트→tool 다리가 사라집니다.
   작업량은 더 많지만 가장 견고합니다.
4. (거부) 출력 스크래핑. "Codex의 다음 응답을 자동으로 reply로 간주"는 MVP가 이미
   brittle + identity attribution 이유로 거부했습니다. 다시 꺼내지 마세요.

그리고 이건 일반화됩니다: inbound가 텍스트-push인 모든 agent가 이 문제를 갖습니다.
그래서 위 driver contract의 inbound 슬롯에 "structured vs text-push" 분류를 박아두면,
새 agent가 a-1 문제를 가질지 미리 예측됩니다.

---

5. routing A→B — 이미 코어에 있습니다

A ai → B ai에게만 보내기는 directed route로 이미 구현돼 있습니다 (routes 테이블, aiox
connect a b). 추가로 만들 게 없습니다. project(방) 안에서 선언만 얹으면 됩니다:

- project = 방, route = 방향 있는 화살표(A→B), 1:N = fan-out(connect a b c).
- 멘탈 모델은 메신저의 DM/그룹과 1:1입니다. 사용자에게 "A가 B에게만 보낸다 = A→B DM
  회선을 깐다"로 설명하면 끝.
  회선을 깐다"로 설명하면 끝.

회선을 깐다"로 설명하면 끝.

---

6. a-2: 먼 훗날 CLI AI 통합 — MCP에 베팅하고, 얇은 계약을 표준화하라

솔직하게: AI 회사들이 자발적으로 통합 표준을 채택하길 기대하긴 어렵습니다. 현실적
경로는 둘입니다.

- 수렴 지점에 베팅: tool/context 쪽은 이미 MCP가 사실상 표준으로 굳고 있습니다(채택
  CLI가 매년 늘어 driver 비용을 깎아줍니다). agent↔agent 통신 표준은 아직 초기입니다.
  그러니 aiox를 MCP 기반으로 두면 MCP 지원 CLI는 공통 ingress로 흡수되고, 통합 비용이
  깐다"로 설명하면 끝.

---

6. a-2: 먼 훗날 CLI AI 통합 — MCP에 베팅하고, 얇은 계약을 표준화하라

솔직하게: AI 회사들이 자발적으로 통합 표준을 채택하길 기대하긴 어렵습니다. 현실적 경로는
둘입니다.

- 수렴 지점에 베팅: tool/context 쪽은 이미 MCP가 사실상 표준으로 굳고 있습니다(채택 CLI가
  매년 늘어 driver 비용을 깎아줍니다). agent↔agent 통신 표준은 아직 초기입니다. 그러니 aiox를
  MCP 기반으로 두면 MCP 지원 CLI는 공통 ingress로 흡수되고, 통합 비용이 시간이 갈수록
  떨어집니다.
  깐다"로 설명하면 끝.

---

6. a-2: 먼 훗날 CLI AI 통합 — MCP에 베팅하고, 얇은 계약을 표준화하라

솔직하게: AI 회사들이 자발적으로 통합 표준을 채택하길 기대하긴 어렵습니다. 현실적 경로는
둘입니다.

- 수렴 지점에 베팅: tool/context 쪽은 이미 MCP가 사실상 표준으로 굳고 있습니다(채택 CLI가
  매년 늘어 driver 비용을 깎아줍니다). agent↔agent 통신 표준은 아직 초기입니다. 그러니 aiox를
  MCP 기반으로 두면 MCP 지원 CLI는 공통 ingress로 흡수되고, 통합 비용이 시간이 갈수록
  떨어집니다.
- aiox가 "최소 협업 계약"을 정의·문서화: 어떤 agent든 aiox 위에서 협업하려면 지킬 얇은
  프로토콜만 정하세요 — ① inbound envelope 형식(source/type/message*id/reply_expected) ②
  outbound tool 2개(send/reply) ③ intent label 규약. 이걸 공개 스펙으로 만들면, 회사가 따라오든 당신이 driver를 쓰든 둘 다 같은 계약을 향합니다. 즉 aiox가 de facto 통합 레이어가
  됩니다. "표준을 만든다"보다 "최소 계약을 못박고 MCP 수렴에 올라탄다"가 실현 가능한 길입니다. --- 어디부터 손대면 좋을까 (우선순위)
  당신이 "도움이 필요하다"고 했으니 순서를 제안합니다:
  원인 ①: Codex는 두 표면이 끊겨 있다.
  inbound는 turn/start로 텍스트가 들어옵니다 (injector.ts에서 input:[{type:"text", text}]). Codex 입장에선 그냥 사람이 친 입력처럼
  보입니다. 반면 outbound는 별개의 MCP tool(aiox_reply)입니다. 둘을 잇는
  다리가 CODEX_INGRESS_INSTRUCTIONS라는 자연어 지시뿐이라, 모델이 "이
  텍스트는 사실 답해야 하는 aiox 메시지"라고 스스로 연결해야 합니다. Claude가 더 잘 되는 이유는 notifications/claude/channel이라는 별도 채널
  표면으로 받아 "이건 외부 채널 메시지"라는 프레이밍이 붙기 때문입니다. Codex의 turn/start엔 그 프레이밍이 없습니다.
  원인 ②(구체적 결함): envelope가 message type을 버린다. 주입되는 envelope는 <aiox-channel source="..."
  message_id="...">text</aiox-channel> 입니다 (mcp-server.ts:21). 그런데 도메인 모델에는 type enum이 이미 있습니다 — question / instruction / status / event / reply (mvp-spec). 즉 "이게 답을 요구하는 질문인지,
  그냥 status 통보인지"를 가르는 신호가 도메인엔 있는데 envelope가 그걸 떨어뜨립니다. Codex는 reply 여부를 판단할 재료 자체를 못 받습니다. 해결 (얕은 것부터): 1. envelope에 type과 명시적 reply_expected를 실어라. 이미 있는 도메인
  type을 재사용. <aiox-channel source="reviewer" type="question"
  reply_expected="true" message_id="m123">. → 가장 싸고 효과 큼. 2. \_reply 지시를 주입 턴 안에 넣어라(locality).* MCP server instructions는 멀고 약합니다. 주입 텍스트 끝에 [aiox] 답하려면
  aiox_reply(parent_message_id="m123", ...)를 호출. 평문으로 답하지 말 것.을 붙이면 recency 덕에 훨씬 잘 따릅니다.

3. (더 깊게) "알림 + 풀(pull)" 분리. turn/start는 가벼운 nudge("aiox 메시지 1통, aiox_inbox() 호출")만 주고, 실제 내용+구조화
   메타데이터(message_id, source, reply 여부)는 MCP tool 결과로
   돌려줍니다. 그러면 모델의 일이 자명해집니다: nudge 보고 → tool 호출 →
   구조화된 메시지+reply 방법 수령 → reply tool. 텍스트→tool 다리가 사라집니다. 작업량은 더 많지만 가장 견고합니다.
4. (거부) 출력 스크래핑. "Codex의 다음 응답을 자동으로 reply로 간주"는
   MVP가 이미 brittle + identity attribution 이유로 거부했습니다. 다시 꺼내지 마세요.

그리고 이건 일반화됩니다: inbound가 텍스트-push인 모든 agent가 이
문제를 갖습니다. 그래서 위 driver contract의 inbound 슬롯에 "structured vs text-push" 분류를 박아두면, 새 agent가 a-1 문제를 가질지 미리
예측됩니다. --- 5. routing A→B — 이미 코어에 있습니다

A ai → B ai에게만 보내기는 directed route로 이미 구현돼 있습니다
(routes 테이블, aiox connect a b). 추가로 만들 게 없습니다. project(방)
안에서 선언만 얹으면 됩니다:

- project = 방, route = 방향 있는 화살표(A→B), 1:N = fan-out(connect a
  b c).
- 멘탈 모델은 메신저의 DM/그룹과 1:1입니다. 사용자에게 "A가 B에게만
  보낸다 = A→B DM 회선을 깐다"로 설명하면 끝.

---

6. a-2: 먼 훗날 CLI AI 통합 — MCP에 베팅하고, 얇은 계약을 표준화하라

솔직하게: AI 회사들이 자발적으로 통합 표준을 채택하길 기대하긴
어렵습니다. 현실적 경로는 둘입니다.

- 수렴 지점에 베팅: tool/context 쪽은 이미 MCP가 사실상 표준으로 굳고
  있습니다(채택 CLI가 매년 늘어 driver 비용을 깎아줍니다). agent↔agent
  통신 표준은 아직 초기입니다. 그러니 aiox를 MCP 기반으로 두면 MCP 지원
  CLI는 공통 ingress로 흡수되고, 통합 비용이 시간이 갈수록 떨어집니다.
- aiox가 "최소 협업 계약"을 정의·문서화: 어떤 agent든 aiox 위에서
  협업하려면 지킬 얇은 프로토콜만 정하세요 — ① inbound envelope
  형식(source/type/message_id/reply_expected) ② outbound tool
  2개(send/reply) ③ intent label 규약. 이걸 공개 스펙으로 만들면, 회사가
  따라오든 당신이 driver를 쓰든 둘 다 같은 계약을 향합니다. 즉 aiox가 de
  facto 통합 레이어가 됩니다. "표준을 만든다"보다 "최소 계약을 못박고 MCP
  수렴에 올라탄다"가 실현 가능한 길입니다.

---

어디부터 손대면 좋을까 (우선순위)

당신이 "도움이 필요하다"고 했으니 순서를 제안합니다: 6. a-2: 먼 훗날 CLI AI 통합 — MCP에 베팅하고, 얇은 계약을 표준화하라

솔직하게: AI 회사들이 자발적으로 통합 표준을 채택하길 기대하긴 어렵습니다. 현실적 경로는 둘입니다.

- 수렴 지점에 베팅: tool/context 쪽은 이미 MCP가 사실상 표준으로 굳고
  있습니다(채택 CLI가 매년 늘어 driver 비용을 깎아줍니다). agent↔agent
  통신 표준은 아직 초기입니다. 그러니 aiox를 MCP 기반으로 두면 MCP
  지원 CLI는 공통 ingress로 흡수되고, 통합 비용이 시간이 갈수록 떨어집니다.
- aiox가 "최소 협업 계약"을 정의·문서화: 어떤 agent든 aiox 위에서 협업하려면 지킬 얇은 프로토콜만 정하세요 — ① inbound envelope
  형식(source/type/message_id/reply_expected) ② outbound tool
  2개(send/reply) ③ intent label 규약. 이걸 공개 스펙으로 만들면,
  회사가 따라오든 당신이 driver를 쓰든 둘 다 같은 계약을 향합니다. 즉
  aiox가 de facto 통합 레이어가 됩니다. "표준을 만든다"보다 "최소
  계약을 못박고 MCP 수렴에 올라탄다"가 실현 가능한 길입니다.

수렴에 올라탄다"가 실현 가능한 길입니다. ---
어디부터 손대면 좋을까 (우선순위)

6. a-2: 먼 훗날 CLI AI 통합 — MCP에 베팅하고, 얇은 계약을 표준화하라

솔직하게: AI 회사들이 자발적으로 통합 표준을 채택하길 기대하긴
어렵습니다. 현실적 경로는 둘입니다. - 수렴 지점에 베팅: tool/context 쪽은 이미 MCP가 사실상 표준으로 굳고
있습니다(채택 CLI가 매년 늘어 driver 비용을 깎아줍니다). agent↔agent
통신 표준은 아직 초기입니다. 그러니 aiox를 MCP 기반으로 두면 MCP 지원 CLI는 공통 ingress로 흡수되고, 통합 비용이 시간이 갈수록
떨어집니다. - aiox가 "최소 협업 계약"을 정의·문서화: 어떤 agent든 aiox 위에서
협업하려면 지킬 얇은 프로토콜만 정하세요 — ① inbound envelope 형식(source/type/message_id/reply_expected) ② outbound tool
2개(send/reply) ③ intent label 규약. 이걸 공개 스펙으로 만들면, 회사가 따라오든 당신이 driver를 쓰든 둘 다 같은 계약을 향합니다. 즉
aiox가 de facto 통합 레이어가 됩니다. "표준을 만든다"보다 "최소
계약을 못박고 MCP 수렴에 올라탄다"가 실현 가능한 길입니다. --- 어디부터 손대면 좋을까 (우선순위)

당신이 "도움이 필요하다"고 했으니 순서를 제안합니다:

"structured vs text-push" 분류를 박아두면, 새 agent가 a-1 문제를
가질지 미리 예측됩니다.

---

5. routing A→B — 이미 코어에 있습니다

A ai → B ai에게만 보내기는 directed route로 이미 구현돼 있습니다 (routes 테이블, aiox connect a b). 추가로 만들 게 없습니다.
project(방) 안에서 선언만 얹으면 됩니다:

- project = 방, route = 방향 있는 화살표(A→B), 1:N = fan-out(connect a b c).
- 멘탈 모델은 메신저의 DM/그룹과 1:1입니다. 사용자에게 "A가
  B에게만 보낸다 = A→B DM 회선을 깐다"로 설명하면 끝. ---

6. a-2: 먼 훗날 CLI AI 통합 — MCP에 베팅하고, 얇은 계약을 표준화하라

솔직하게: AI 회사들이 자발적으로 통합 표준을 채택하길 기대하긴
어렵습니다. 현실적 경로는 둘입니다.

- 수렴 지점에 베팅: tool/context 쪽은 이미 MCP가 사실상 표준으로
  굳고 있습니다(채택 CLI가 매년 늘어 driver 비용을 깎아줍니다).
  agent↔agent 통신 표준은 아직 초기입니다. 그러니 aiox를 MCP
  기반으로 두면 MCP 지원 CLI는 공통 ingress로 흡수되고, 통합 비용이
  시간이 갈수록 떨어집니다.
- aiox가 "최소 협업 계약"을 정의·문서화: 어떤 agent든 aiox 위에서
  협업하려면 지킬 얇은 프로토콜만 정하세요 — ① inbound envelope
  형식(source/type/message_id/reply_expected) ② outbound tool
  2개(send/reply) ③ intent label 규약. 이걸 공개 스펙으로 만들면, 회사가 따라오든 당신이 driver를 쓰든 둘 다 같은 계약을 향합니다.

2. _reply 지시를 주입 턴 안에 넣어라(locality)._ MCP server instructions는 멀고 약합니다. 주입 텍스트 끝에 [aiox]
   답하려면 aiox_reply(parent_message_id="m123", ...)를 호출. 평문으로 답하지 말 것.을 붙이면 recency 덕에 훨씬 잘
   따릅니다.
3. (더 깊게) "알림 + 풀(pull)" 분리. turn/start는 가벼운 nudge("aiox 메시지 1통, aiox_inbox() 호출")만 주고, 실제
   내용+구조화 메타데이터(message_id, source, reply 여부)는 MCP tool 결과로 돌려줍니다. 그러면 모델의 일이 자명해집니다:
   nudge 보고 → tool 호출 → 구조화된 메시지+reply 방법 수령 → reply tool. 텍스트→tool 다리가 사라집니다. 작업량은 더
   많지만 가장 견고합니다.
4. (거부) 출력 스크래핑. "Codex의 다음 응답을 자동으로 reply로 간주"는 MVP가 이미 brittle + identity attribution 이유로
   거부했습니다. 다시 꺼내지 마세요.

그리고 이건 일반화됩니다: inbound가 텍스트-push인 모든 agent가 이 문제를 갖습니다. 그래서 위 driver contract의 inbound
슬롯에 "structured vs text-push" 분류를 박아두면, 새 agent가 a-1 문제를 가질지 미리 예측됩니다.

---

5. routing A→B — 이미 코어에 있습니다

A ai → B ai에게만 보내기는 directed route로 이미 구현돼 있습니다 (routes 테이블, aiox connect a b). 추가로 만들 게
없습니다. project(방) 안에서 선언만 얹으면 됩니다:

- project = 방, route = 방향 있는 화살표(A→B), 1:N = fan-out(connect a b c).
- 멘탈 모델은 메신저의 DM/그룹과 1:1입니다. 사용자에게 "A가 B에게만 보낸다 = A→B DM 회선을 깐다"로 설명하면 끝.

---

6. a-2: 먼 훗날 CLI AI 통합 — MCP에 베팅하고, 얇은 계약을 표준화하라

솔직하게: AI 회사들이 자발적으로 통합 표준을 채택하길 기대하긴 어렵습니다. 현실적 경로는 둘입니다.

- 수렴 지점에 베팅: tool/context 쪽은 이미 MCP가 사실상 표준으로 굳고 있습니다(채택 CLI가 매년 늘어 driver 비용을
  깎아줍니다). agent↔agent 통신 표준은 아직 초기입니다. 그러니 aiox를 MCP 기반으로 두면 MCP 지원 CLI는 공통 ingress로
  흡수되고, 통합 비용이 시간이 갈수록 떨어집니다.
- aiox가 "최소 협업 계약"을 정의·문서화: 어떤 agent든 aiox 위에서 협업하려면 지킬 얇은 프로토콜만 정하세요 — ① inbound
  envelope 형식(source/type/message_id/reply_expected) ② outbound tool 2개(send/reply) ③ intent label 규약. 이걸 공개
  스펙으로 만들면, 회사가 따라오든 당신이 driver를 쓰든 둘 다 같은 계약을 향합니다. 즉 aiox가 de facto 통합 레이어가
  됩니다. "표준을 만든다"보다 "최소 계약을 못박고 MCP 수렴에 올라탄다"가 실현 가능한 길입니다.

---

어디부터 손대면 좋을까 (우선순위)

당신이 "도움이 필요하다"고 했으니 순서를 제안합니다:

1. 지금 당장 (작고 효과 큼): a-1 해결 1·2단계 — envelope에 type+reply_expected 싣고, reply 지시를 주입 턴 안으로.
   실사용 신뢰도가 가장 크게 오릅니다. 코드 변경은 작습니다(mcp-server.ts envelope + dispatch 포맷 지점).
2. 다음 (구조): driver contract의 4슬롯(launch/inbound/outbound/identity)을 명문화. 이건 post-mvp P1(registry refactor)

- 지난번 compile() 제안과 같은 작업이라 묶으세요.

3. 그 다음 (선언 표면): 3층 config 병합 + named capability set. 그 위에 "교환대" 멘탈 모델의 선언
   파일(project/agents/routes/capabilities)을 얹습니다.
4. 병행 (자리만): transport 추상화 인터페이스(Windows named pipe 대비)만 박아두고 구현은 defer.

---

원하시면 이 정리를 바탕으로 ① a-1 envelope 수정의 구체적 변경안(어디를 어떻게)을 짚어드리거나, ② "교환대" 모델 기준으로
지난번 compose 스키마를 다시 그려드리거나, ③ driver 4슬롯 contract를 실제 TypeScript interface로 스케치할 수 있습니다.
어느 쪽이 지금 제일 급한가요?

---

@user
현재 codex쪽 envelop?이 문제가 있다는거에 대해서 다시 한번더 이야기해줘봐

---

- (A) 지금 코드에 실제로 도는 envelope — <aiox-channel source="..." message_id="...">text</aiox-channel>
  (mcp-server.ts:21)
- (B) Codex가 제안한 envelope — AioxEnvelope interface (codex-opinion.md의 "가장 중요한 설계 전환")

방금 cross-validation에서 제가 "문제 있다"고 한 건 주로 (B), Codex의 제안입니다. 둘 다 짚되 (B)를 깊게 풀겠습니다.

---

먼저, 가장 중요한 한 가지 — Codex가 범주를 혼동했다

Codex는 AioxEnvelope 도입을 **"a-1(Codex가 reply해야 하는지 판단 못 함)의 해결책"**으로 제시했습니다. 그런데 이 둘은
서로 다른 층위의 문제입니다.

- canonical envelope이 푸는 것 = 시스템 정합성: 버전 관리, 다대일 fan-out, 라우팅, vendor 중립 — 즉 daemon 내부와
  adapter들 사이의 일관성.
- a-1이 푸는 것 = Codex의 인식: "이 텍스트를 보고 → reply tool 호출로 연결하느냐" — 즉 모델 surface에서의 행동 유도.

문제는 — Codex에게는 결국 그 envelope을 텍스트로 렌더해서 turn/start로 밀어넣습니다 (<aiox-message
...>...</aiox-message>). 구조체가 daemon 안에선 structured여도, Codex 눈에 들어오는 건 여전히 텍스트입니다. 그러니
envelope을 아무리 structured하게 만들어도 Codex의 reply 인식은 구조화로 풀리는 게 아니라 여전히 프롬프트 설득력에 달려
있습니다.

▎ 즉 "canonical envelope을 도입하면 a-1이 풀린다"는 착각입니다. canonical envelope은 a-1을 풀어주는 기반은 되지만
▎ 해결책은 아닙니다. a-1은 surface 전술(턴 안에 직접 지시 + reply_expected 명시 + notify/pull)로 풀립니다.

이게 Codex 제안의 가장 큰 구멍입니다. 나머지 6개는 구조 자체의 결함입니다.

---

Codex 제안 envelope (B)의 구체적 결함 6개

Codex 제안을 다시 봅니다:

interface AioxEnvelope {
protocol: "aiox.message.v1";
messageId: string;
parentMessageId?: string;
source: { name; kind };
target?: { name; kind }; // ← 문제 4
intent: "delegation"|"discussion"|"clarification"|"result"|"conclusion"; // ← 문제 1,2
lifecycle: "open"|"concluded";
body: { format; text };
reply: { tool: "aiox_reply"; parentMessageId }; // ← 문제 3,5
}

_1. intent는 "보내는 쪽 의도"라, 받는 쪽이 "답해야 하나"를 여전히 추론해야 한다._
a-1의 불만은 "Codex가 reply할지 판단을 못 함"이었습니다. Codex의 답은 intent를 넣는 것인데 — 받는 agent는
intent=delegation을 보고 "음, delegation이니까 답해야겠지"를 다시 추론해야 합니다. 판단 부담을 없앤 게 아니라 형태만
바꿔 그대로 모델에게 떠넘겼습니다. 게다가 애매한 경우가 많습니다: discussion은 답해야 하나?(결론났으면 no) — 이 매핑이
envelope엔 없고 instruction 텍스트에 흩어져 있습니다. 받는 쪽에 필요한 건 *의미(intent)*가 아니라 명령(directive):
"지금 답해라" = reply_expected: true 입니다. 의미를 주고 명령을 추론시키면 a-1이 재발합니다.

2. 분류축이 둘로 늘어난다 — type vs intent.
   시스템엔 이미 message type(question/instruction/status/event/reply)이 schema에 있습니다. Codex는 intent(delegation/…)를
   새로 도입했는데, 둘의 관계가 정의 안 됩니다:

- type=question + intent=clarification? type=instruction + intent=delegation? — 겹칩니다.
- type=status는 intent 5종 어디에도 안 맞습니다.
  한 메시지가 분류를 둘 갖는데 관계가 없으면 개발자도 agent도 헷갈립니다. (이건 기존 type과 Codex의 새 intent를 둘 다 본
  사람만 잡는 문제라 Codex는 놓쳤습니다.)

3. reply.tool: "aiox_reply" — canonical 계층에 vendor 이름을 누수.
   Codex 스스로 *"core는 structured, surface는 adapter-specific"*이라 해놓고, canonical envelope에 "aiox_reply"라는 Codex
   MCP tool 이름을 박았습니다. Claude는 channel reply tool, Gemini는 또 다릅니다. Gemini adapter가 이 필드를 뭘로 채우죠?
   canonical은 replyable: true + parent까지만 두고, "어떤 tool로 답하나"는 각 adapter가 렌더 시점에 자기 vendor 이름으로
   MCP tool 이름을 박았습니다. Claude는 channel reply tool, Gemini는 또 다릅니다. Gemini adapter가 이 필드를 뭘로
   채우죠? canonical은 replyable: true + parent까지만 두고, "어떤 tool로 답하나"는 각 adapter가 렌더 시점에 자기 vendor
   이름으로 채워야 합니다. 자기 원칙을 자기가 어긴 자리입니다.
   채워야 합니다. 자기 원칙을 자기가 어긴 자리입니다.

_4. fan-out(1:N)에서 target?이 optional이고 단수다._
MVP 핵심은 message 1개 → delivery N개입니다. impl이 [reviewer, researcher]에게 보내면, \*\*각 수신자는 "내가 target이다 +
이름으로 채워야 합니다. 자기 원칙을 자기가 어긴 자리입니다.
채워야 합니다. 자기 원칙을 자기가 어긴 자리입니다.

_4. fan-out(1:N)에서 target?이 optional이고 단수다._ MVP 핵심은 message 1개 → delivery N개입니다. impl이 [reviewer, researcher]에게 보내면, **각 수신자는 "내가 target이다 +
다른 누구에게도 같이 갔다"**를 알아야 협업이 자연스럽습니다(reviewer가 "researcher도 보는 중이군" 판단). target? 단일
객체로는 fan-out을 표현 못 합니다. 그리고 envelope이 message 단위인지 delivery(per-target) 단위인지 모호한데, 실제론
per-delivery로 렌더해야 각 수신자가 자기 맥락을 압니다.

5. parentMessageId가 두 군데 중복.
   top-level parentMessageId?와 reply.parentMessageId가 따로 있습니다. 받은 메시지에 답할 때 parent는 *받은 envelope의
   messageId*입니다 (실제 AIOX_REPLY_DESCRIPTION도 "use that message_id as parent_message_id"). 그러면
   reply.parentMessageId는 결국 top-level messageId와 같은 값을 중복으로 들고 있는 셈이라, 어느 걸 써야 하는지 혼란만
   줍니다.

_6. lifecycle: open|concluded는 메시지 1건의 속성이 아니라 스레드의 속성이다._
"이 대화가 끝났나"는 개별 메시지가 아니라 parent로 묶이는 스레드 전체의 상태입니다. 메시지마다 lifecycle을 붙이면 같은
스레드의 메시지들이 서로 다른 lifecycle을 가질 수 있어 모순이 생깁니다. (현재 코드는 이걸 [[CONCLUDE]] 텍스트 마커로
처리하는데, 그건 그것대로 문제 — 텍스트라 위조·누락 가능.)

--- (A) 지금 코드의 envelope은 Codex 제안보다도 빈약하다
참고로 현재 실제 도는 <aiox-channel source message_id>는 (B)보다도 부족합니다:

- type 없음 (도메인엔 있는데 버림), reply_expected 없음, fan-out 정보 없음.
- intent는 envelope이 아니라 content 본문 안에 텍스트로 써라(CODEX_INGRESS_INSTRUCTIONS)고 떠넘김 → 위조·누락에 무방비.
  즉 (A)는 "신호 부족"으로 a-1을 직접 유발하고, (B)는 "신호는 늘렸지만 잘못된 축으로 늘려서 + 범주를 혼동해서" a-1을 반만
  해결합니다.

---

그래서 올바른 envelope은 (교정본 골격)

interface AioxEnvelope {
protocol: "aiox.message.v1"; // 버전: 지금 박기 (Codex 동의)
messageId: string;
threadId: string; // lifecycle은 메시지가 아니라 thread 속성 (문제 6)
parentMessageId?: string; // reply 블록 중복 제거 (문제 5)
source: { name; kind }; // kind에 "human"도 허용 (지난 blind spot 4)
recipients: { name; kind }[]; // 복수 + per-delivery 렌더 (문제 4)
type: MessageType; // 기존 도메인 분류 재사용 (문제 2)
intent?: Intent; // 협업 의미는 보조로 유지 (문제 2)
replyExpected: boolean; // ★ target 행동 신호 = a-1 직격 (문제 1)
body: { format; text };
// reply.tool 제거 — vendor tool 이름은 adapter가 렌더 시 채움 (문제 3)
}

그리고 a-1은 envelope이 아니라 surface에서 함께 풉니다: ① replyExpected=true면 주입 텍스트 끝에 "지금 <vendor reply
  tool>로 답하라"를 직접 박고, ② 가능하면 notify+pull로 내용을 tool-result로 돌려주고, ③ envelope의 진실은 daemon이
token으로 소유 — 텍스트는 표시일 뿐 권위가 아님(위조 방지).
