# aiox A2A Spec

aiox의 **production spec**이자 단일 출처(single source of truth)다. opinion/validation에
흩어진 조사 자료를 정제해 하나의 권위 문서로 통합한다.

- 권위 관계: 본 문서는 architecture/product spec의 본문(prd)이다. 결정의 *근거·과정*은
  `history/58-post-mvp-a2a-architecture-decisions.history.md`가 보존하고, 구현 *실행*은
  `plan/`이 가진다. 같은 결정을 세 곳에 복붙하지 않는다 — 결정 본문은 여기, 근거는 history,
  실행은 plan.
- 본 문서가 lock하는 것은 **추상화와 불변식**이다. remote/federation 구현, SSO/mTLS, OS
  sandbox 강제 같은 항목은 의도적으로 defer하며 §8·§9에 명시한다.

## 목차

0. 정의와 core 개념
1. 멘탈 모델과 아키텍처
2. Glossary
3. Layer model
4. A2A protocol과 message lifecycle
5. Adapter (4-slot + capability tier)
6. Compose (declarative composition)
7. Capability와 sandbox
8. Federation / remote
9. Open / deferred
10. 위험한 은유

---

## 0. 정의와 core 개념

### 0.1 정의

**aiox는 agent 간 협업을 위한 A2A(agent-to-agent) communication standard를 정의하고,
그 첫 reference implementation으로 local-first daemon/runtime을 제공한다.**

- **정의하는 것 (standard):** vendor·location 무관 A2A communication model.
  envelope·address·route·delivery/mailbox·reply correlation·capability·policy·visibility가
  agent 간 협업의 공통 언어다.
- **제공하는 것 (reference runtime):** local-first daemon/runtime. daemon이 control plane /
  mailbox / router / state authority이고, adapter가 non-native agent runtime 차이를 흡수한다.
  현재 외부 채택자는 없으므로 본 문서의 standard는 public ecosystem standard라기보다
  **draft/internal standard + reference definition**으로 취급한다.

현재 Codex/Claude 같은 **non-native CLI agent**는 adapter와 TUI prompt injection으로
연결된다. 이것은 **호환 계층(compat layer)일 뿐 목표 프로토콜이 아니다.** turn/start
같은 injection 표면에는 authority side-channel이 없어, "답해야 하는 메시지인가"를
agent가 prompt 텍스트로 추론해야 하는 천장이 존재한다(§4).

장기 목표는 agent runtime이 다음을 **native로 1급(first-class) 지원**하는 것이다:

- **envelope** — canonical A2A protocol object
- **identity / address** — location-neutral, URI-like (`agent://domain/project/name`).
  local socket 경로를 canonical identity로 박지 않는다(§8 federation-ready의 전제).
- **delivery / mailbox** — target-specific delivery correlation과 per-recipient 수신함
- **reply correlation** — delivery 단위 답장 상관
- **route** — directed message permission (A→B)
- **capability** — agent별 MCP/skill/tool grant
- **policy** — route enforcement, aiox-owned tool exposure, timeout 등 control plane 규칙
- **presentation** — agent runtime ingestion과 human-facing display를 구분하는 렌더링 정책.
  transcript/audit rendering은 reference runtime surface에서 다룬다.
- **recipient visibility** — fan-out/group context에서 co-recipient를 누구에게 얼마나 노출할지.
  v1 이후로 defer한다(§4).

**불변식 — authority는 control plane에 잔류한다.** agent runtime이 위 항목을 native로
지원하게 되더라도, state/policy authority는 daemon(control plane)에 남는다. native
지원이란 agent가 프로토콜을 *1급으로 말한다*는 뜻이지, authority가 agent로 옮겨간다는
뜻이 아니다. envelope text는 display/행동유도이고, 진짜 authority는
daemon store + token + policy다(§4).

### 0.2 Core 개념

aiox를 이해하는 데 필요한 최소 어휘. 상세 정의는 §2 Glossary, 동작은 각 절에서 전개.

| 개념 | 한 줄 정의 | 권위 |
| --- | --- | --- |
| **Envelope** | agent 사이를 흐르는 canonical A2A protocol object. vendor-neutral하고 explicit protocol version(`aiox.message.v1`)을 운반한다. logical message와 target-specific delivery metadata를 포함하며, presentation/rendering은 delivery 단위로 생성된다. | §4 |
| **Address / Identity** | agent를 process/socket 위치가 아니라 location-neutral identity로 주소화한다. URI-like `agent://domain/project/name` 확장 가능성을 보존한다. | §4·§8 |
| **Route** | directed message permission. `A→B`는 "A가 B에게 보낼 수 있다"는 단방향 edge. 양방향은 별도 edge 2개. capability 그래프와 분리된 "데이터 관계" 그래프. | §4 |
| **Delivery / Mailbox** | `1 message = N deliveries` fan-out과 per-recipient mailbox를 표현한다. `deliveryId`는 target-specific reply correlation의 기준이다. | §4 |
| **Capability / Policy** | agent에게 보이는 MCP/skill/tool/instruction grant와 daemon policy. aiox-owned route/tool surface는 daemon token/policy로 강제하고, external MCP/native surface는 projection과 degradation surface로 표현한다. OS sandbox와는 분리된다. | §7 |
| **Adapter** | Codex/Claude/Gemini/Ollama 등 non-native runtime 차이를 흡수하는 compatibility connector. launch/attach·ingress·egress·identity 4-slot을 채우고, 그 결과로 capability tier가 결정된다. | §5 |
| **Daemon** | local control plane. registry·router·state authority·mailbox를 소유한다. 현재 production daemon store는 `:memory:`이고, durable store 배선은 scaffold 상태다(durable = P3 target). | §1 |

---

## 1. 멘탈 모델과 아키텍처

aiox의 primary product model은 **A2A communication standard**이고, local-first
daemon/runtime은 그 첫 reference implementation이다.

Reference runtime에서 daemon은 local control plane이다. daemon은 agent registry,
router, mailbox, delivery lifecycle, event/state authority, token/policy enforcement를
소유한다. agent runtime은 Codex/Claude/Gemini/Ollama/app/editor/local model/remote
worker처럼 서로 다를 수 있으며, adapter가 non-native runtime 차이를 흡수한다.

Compose는 core product가 아니라 standard/runtime 위의 declarative composition layer다.
Compose는 agents, routes, capabilities, policies, generated session instructions를
선언하지만, A2A protocol/lifecycle을 대체하지 않는다.

## 2. Glossary

- **aiox-native agent**: structured envelope ingestion, reply correlation, route/mailbox,
  capability/policy, presentation handling을 runtime object로 1급 지원하는 agent.
- **adapter-backed agent**: aiox protocol을 native로 지원하지 않아 adapter가 prompt,
  MCP, plugin, config, channel 등으로 변환해 연결하는 agent.
- **degraded rendering**: non-native TUI agent를 위한 compatibility surface. 텍스트
  envelope/prompt injection은 protocol authority가 아니라 display/behavior guidance다.
- **messageId**: logical message/group id.
- **deliveryId**: target-specific delivery correlation id. fan-out에서 target마다 다를 수
  있으며 reply correlation의 기준이다.
- **type**: 저장/시스템 분류 축. 기존 `messages.type`과 연결되며, 협업 의미나 reply
  필요 여부를 단독으로 표현하지 않는다.
- **intent**: 협업 의미 축. delegation/discussion/clarification/result/conclusion 같은
  A2A 의미를 표현한다.
- **reply_expected**: target 행동 신호 축. "답해야 하는 메시지인가"를 명시한다.
  `intent`만으로 reply 여부를 추론하지 않는다.
- **source-only routing**: reply의 기본 routing. reply는 원 message의 source에게만 돌아간다.
- **mailbox**: per-recipient 수신함. target offline을 전제로 delivery를 보관한다.
- **capability tier**: adapter-backed runtime이 A2A semantics를 어느 수준으로 지원하는지
  설명하는 등급.
- **Capability Projection Layer**: common grant를 per-agent runtime projection으로 만들고,
  adapter가 native config/plugin/MCP/skill surface로 compile하는 계층.

## 3. Layer model

1. **Standard layer**: vendor/location-neutral envelope, address, route, delivery,
   reply correlation, capability, policy, presentation semantics.
2. **Reference runtime layer**: daemon store, mailbox, router, token/policy authority,
   pending/reply lifecycle surface.
3. **Adapter layer**: non-native runtime의 launch/attach, ingress/egress, identity,
   render/compile 차이를 흡수한다.
4. **Composition layer**: compose/config가 agents/routes/capabilities/policies/instructions
   desired state를 선언한다.

## 4. A2A protocol과 message lifecycle

A2A v1의 핵심은 prompt envelope 개선이 아니라 canonical envelope과 delivery lifecycle을
정의하는 것이다.

Protocol invariants:

- `type`, `intent`, `reply_expected`는 분리한다.
  - `type`: 저장/시스템 분류.
  - `intent`: delegation, discussion, clarification, result, conclusion 같은 협업 의미.
  - `reply_expected`: target 행동 신호. intent만으로 reply 여부를 추론하지 않는다.
- envelope은 explicit protocol version을 운반한다. 예: `protocol: "aiox.message.v1"`.
- canonical envelope은 vendor-neutral하다. concrete reply tool name은 adapter render
  단계에서 채운다.
- `source.kind`는 `agent | human | daemon`을 예약한다. human intervention 구현은 defer한다.
- envelope은 logical message와 target-specific delivery metadata를 포함한다.
- presentation/rendering은 delivery 단위로 생성한다.
- fan-out은 `1 message = N deliveries`다.
- `messageId`는 logical group/original message id다.
- `deliveryId`는 target-specific delivery/turn correlation id다.
- Codex `clientUserMessageId` 후보는 `messageId`가 아니라 `deliveryId`다.
- reply routing default는 `source-only`다.
- `recipient_visibility`는 v1 field로 넣지 않는다. shared/group recipient visibility는
  additive extension으로 defer한다.
- prompt text, TUI-injected envelope, `additionalContext["aiox.envelope"]`은
  display/correlation aid일 수 있지만 authority가 아니다.
- 진짜 authority는 daemon store + token + policy다.
- reply timeout은 기본 hard failure cutoff가 아니라 pending visibility threshold다.
  hard deadline은 explicit policy로만 둔다.

Current non-native caveat:

- Codex/Claude 같은 TUI target injection은 prompt-level compatibility path다.
- adapter-backed runtime이 structured envelope ingestion이나 presentation policy를 강제하지
  못하면 typed degradation으로 surface해야 한다.

## 5. Adapter (4-slot + capability tier)

Adapter는 vendor/runtime 차이를 흡수하는 compatibility connector다. Standard가 요구하는
A2A semantics를 non-native runtime에 가능한 가장 좁은 native surface로 projection한다.

Adapter id는 closed enum이 아니라 runtime connector id로 열어둔다. 현재 구현은 Codex와
Claude에 가깝지만, 표준은 `codex-cli`, `claude-cli`, `gemini-cli`, `ollama-local`,
`vscode-agent`, `remote-agent` 같은 새 runtime을 같은 adapter model 위에 추가할 수
있어야 한다.

Adapter 4-slot:

- **launch/attach**: agent runtime을 어떻게 실행하거나 기존 session에 연결하는가.
- **ingress**: aiox message를 agent runtime이 어떻게 받는가.
- **egress**: agent가 aiox로 어떻게 reply/result/conclusion을 제출하는가.
- **identity**: session/app/worker instance를 어떻게 식별하는가.

Runtime surface는 점진적으로 `launch / attach / connect / disconnect`, `ingress / egress`,
`identity / health`, `render / compile`을 포함한다.

Adapter는 OS별 launch detail도 흡수한다. shell quoting, environment variable, path,
process signal, temp/runtime directory 차이는 daemon core나 A2A protocol에 새지 않아야
한다.

Attach 방식은 runtime별로 다를 수 있다:

- **direct/native**: agent runtime이 aiox envelope/reply를 직접 지원한다.
- **plugin/extension**: Claude plugin, editor extension처럼 host 확장 표면으로 연결한다.
- **bridge/sidecar**: app 옆의 local process가 app API와 aiox daemon을 연결한다.
- **prompt/text fallback**: structured surface가 없어 prompt injection으로 연결한다. 이
  방식은 best-effort이며 typed degradation으로 드러내야 한다.

Capability tier:

- Tier 1: `full_duplex_structured`
- Tier 2: `side_channel`
- Tier 3: `prompt_only`
- Tier 4: `unsupported`

4-slot은 adapter 구현 입력 모델이고, tier는 그 결과로 해당 runtime이 지원하는 A2A 수준을
설명한다. 모든 runtime을 Tier 1로 취급하지 않는다.

## 6. Compose (declarative composition)

Compose는 Docker clone이 아니다. Compose는 A2A standard/runtime 위에서 project
collaboration topology와 runtime projection을 선언하는 config layer다.

Top-level schema 방향:

- `version`
- `project`
- `agents`
- `routes`
- `capabilities`
- `policies`
- `instructions`

Principles:

- Docker식 `services`, `scale`, `replica` 은유는 피한다. agent는 non-fungible participant다.
- `project`는 compose가 만든 desired state의 logical ownership label이다. `up`/`down`
  같은 lifecycle command는 "이 compose project가 만든 것"만 대상으로 삼아야 하며,
  같은 daemon/profile 안의 unrelated manually attached agent를 소유한다고 약속하지 않는다.
- `AGENTS.md`/`CLAUDE.md` 같은 native project instruction은 read-only base layer로 둔다.
- compose-generated instruction은 aiox-launched session에만 주입되는 launch-scoped
  orchestration layer다.
- Instruction precedence는 `host policy > native project docs > compose session
  instruction > user prompt > agent memory` 순서로 본다. 여기서 native project docs는
  `AGENTS.md`/`CLAUDE.md` 같은 host-native instruction을 뜻한다.
- compose config는 OS-neutral하게 둔다. OS별 command/path/env 차이는 adapter compiler나
  recipe/plugin이 처리한다.
- native docs replacement나 global native config mutation을 기본값으로 두지 않는다.
- terminal/editor auto-layout은 core protocol이 아니다. Manual attach를 portable baseline으로
  두고, tmux/VS Code tasks/Windows Terminal 같은 자동 배치는 recipe/plugin layer로 둔다.
- `pair`, `connect`, `pending_attach`는 future compose desired state의 seed로 볼 수 있다.

## 7. Capability와 sandbox

Capability isolation의 중심 개념은 **Capability Projection Layer**다.

Security와 isolation은 네 축으로 나눠서 본다:

1. **Identity/Auth**: 누가 말하는가. agent token, daemon token, org identity 같은 축이다.
2. **Authorization/Policy**: 무엇을 할 수 있는가. route allow, capability allow/deny,
   project/org policy 같은 축이다.
3. **Capability Isolation**: 어떤 tool/MCP/skill/instruction이 보이는가. launch-scoped
   projection과 per-agent grant가 이 축이다.
4. **Sandbox/Execution Isolation**: 실제 OS, 파일, 네트워크, 프로세스를 어디까지 막는가.
   이 축은 reserved/non-guarantee 상태이며 capability isolation과 같지 않다.

Model:

1. aiox capability registry가 MCP server, tool grant, skill, generated instruction source를
   보관한다.
2. compose/daemon이 agent별 effective grant를 resolve한다.
   - Scope precedence는 `global aiox defaults -> project compose -> agent override` 순서다.
   - Allow/grant는 좁은 scope가 추가하거나 override할 수 있지만, deny/restriction은 보수적으로
     누적한다.
3. session launch 때 per-agent runtime projection을 만든다.
4. adapter가 projection을 Codex/Claude/Gemini native config/plugin/MCP/skill surface로
   compile한다.

Principles:

- native global config/skill folder는 기본 수정하지 않는다.
- aiox-launched session에만 runtime projection을 주입한다.
- runtime projection은 OS별 path와 filesystem 제약을 고려한다. symlink를 쓸 수 있으면
  symlink-first로 갈 수 있지만, Windows 같은 환경에서는 copy fallback을 허용한다.
- MCP server 주입 여부는 강하게 제어할 수 있다.
- aiox-owned route/tool surface는 daemon token/policy로 강제한다. 기본값은
  deny-by-default + explicit allow다.
- routing graph와 capability graph는 schema에서 분리한다. 다만 enforcement 시점에는 route가
  없는 send/reply capability를 daemon policy가 거부해야 한다.
- external MCP/native surface의 내부 tool allow/deny는 host/server 지원에 따라
  degradation을 surface한다. aiox가 항상 강제한다고 약속하지 않는다.
- skill은 tool과 다르다. skill은 instruction/assets 노출에 가깝고, 한 번 읽힌 지식은
  완전히 회수하기 어렵다.
- capability/policy grant와 OS sandbox는 분리한다.

Sandbox vocabulary is reserved but non-guarantee until explicitly implemented.

Reserved profiles:

- `none`
- `cwd-readonly`
- `cwd-write`
- `container`
- `vm`
- `remote-worker`

## 8. Federation / remote

aiox는 local-first로 시작하지만, standard는 location-ready하게 둔다.

이 표준은 다음 범위로 커져도 깨지지 않아야 한다:

1. **Same daemon local**: 같은 machine, 같은 daemon 안에서 agent끼리 대화한다.
2. **Same machine multi-daemon**: 같은 machine 안의 project/profile별 daemon이 서로
   주소화될 수 있다.
3. **Local-remote**: local daemon과 remote daemon 사이에서 agent가 대화한다.
4. **Company internal federation**: 회사 내부망의 team/project/org 경계를 정책으로 다룬다.
5. **Remote-remote**: remote daemon끼리 public/private transport로 대화한다.

위 목록은 구현 순서가 아니라 표준이 보존해야 하는 확장 범위다. 높은 범위의 기능은 낮은
범위의 protocol contract를 깨지 않는 additive extension으로만 추가한다.

Principles:

- A2A envelope/route는 location-neutral하게 둔다.
- A2A protocol은 OS transport를 몰라야 한다. Unix domain socket, Windows named pipe,
  TCP loopback 같은 선택은 transport 구현 detail이다.
- local socket path나 process 위치를 canonical message identity로 박지 않는다.
- address/identity는 URI-like extension 가능성을 보존한다.
- local/remote 차이는 transport와 identity 계층이 처리한다.
- remote/federation 구현은 defer한다.

Deferred federation topics:

- remote daemon registration
- daemon-to-daemon auth
- signed envelope
- replay protection
- ordering/retry
- partial failure policy
- company SSO/mTLS/public federation/cloud relay
- remote capability marketplace

## 9. Open / deferred

- group recipient visibility / shared group context.
- hard reply expiration default.
- remote/federated delivery implementation.
- vendor-specific raw item injection such as `thread/injectItems`.
- OS/process/filesystem/network sandbox enforcement.
- full external MCP internal tool allow/deny enforcement.
- skill knowledge recall/revocation guarantee.
- Whether Codex `turn/start` or future app-server surfaces can carry structured aiox
  metadata natively instead of relying on text injection.

Lifecycle policy open questions:

- Pair-level blocked/pending policy:
  - How agent-level availability (`user_reported_limited`, adapter-reported failure,
    unavailable) affects pair-level state.
  - Whether limited/unavailable agents should pause all pairs containing that agent with
    a state like `blocked_by_agent`.
  - Whether blocked pairs enqueue, reject, or require confirmation for new outbound
    messages.
  - Whether reset time should auto-resume a pair or only downgrade the agent to
    `availability_unknown` until explicit user report.
  - How blocked-pair status is surfaced to the source agent.
- Duplicate outbound while `awaiting_agent_reply` is unresolved:
  - Same-direction duplicate sends: queue, coalesce, reject, or require confirmation.
  - Opposite-direction duplicates: independent lanes or pair-level single-flight.
- Fan-out partial completion:
  - How partial completion and target-level pending are surfaced to the source agent.
  - Whether fan-out state stays as individual deliveries or adds a parent fan-out operation
    state.
- User-interrupted pending turns:
  - When the adapter has no structured signal, whether to use user report, cancel command,
    or keep pending.
  - Interrupted message terminal state: `cancelled_by_user`, `failed`, `superseded`, or
    remain `awaiting_agent_reply`.
- Reply correlation constraints across `chat_id`, parent message id, `deliveryId`, and
  fan-out parent id.

## 10. 위험한 은유

- **MCP만 있으면 A2A가 된다**: MCP는 agent가 tool을 쓰는 표준에 가깝고, aiox는 agent가
  agent에게 말하는 A2A communication standard다.
- **aiox가 전화기를 소유한다**: aiox는 회선을 연결하지만 agent runtime 자체를 소유하지
  않는다. authority는 daemon에 있고, terminal/app/editor는 각 runtime의 surface다.
- **terminal launcher가 본질이다**: 터미널 실행은 초기 UX이고, core는 A2A standard와
  reference runtime이다.
- **Docker services/replicas**: agent는 interchangeable service replica가 아니라
  stateful/non-fungible participant다.
- **compose가 native docs를 대체한다**: compose instruction은 launch-scoped orchestration
  layer이고, `AGENTS.md`/`CLAUDE.md`는 read-only native base layer다.
- **capability isolation은 OS sandbox다**: capability projection과 OS sandbox guarantee는
  별도다.
- **aiox가 중앙 LLM brain이다**: aiox는 communication/control-plane runtime이며 agent의
  판단을 대체하지 않는다.
