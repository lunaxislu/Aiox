# aiox Product

이 문서는 aiox의 **제품 목적, 사용자, 범위, 경계**를 소유하는 권위 문서다. 무엇을 위한
제품이고 누구의 어떤 문제를 푸는지, 무엇을 의도적으로 하지 않는지, 어떤 시장 경계와
채택 가설 위에 서 있는지를 이 문서만 읽고 이해할 수 있어야 한다.

owner 경계:

- **protocol/interface/state contract** (envelope, routing, delivery, adapter, compose,
  capability, federation): `docs/specs/aiox-a2a.md`
- **current/as-built architecture** (내부 구조, flow, trust boundary): `docs/architecture/`
- **release gate·phase·우선순위**: `docs/product/roadmap.md`

## 정의

**aiox는 agent 간 협업을 위한 versioned communication protocol을 정의하고, 그 reference
implementation으로 cross-vendor local-first daemon/runtime을 제공한다.**

- **정의하는 것 (protocol contract):** vendor·location 무관 agent communication model.
  envelope·address·route·delivery/mailbox·reply correlation·capability·policy·visibility가
  agent 간 협업의 공통 언어다. (상세 계약은 `docs/specs/aiox-a2a.md`.)
- **제공하는 것 (reference runtime):** local-first daemon/runtime. daemon이 control plane /
  mailbox / router / state authority이고, adapter가 non-native agent runtime 차이를 흡수한다.

현재 외부 채택자는 없으므로 본 제품은 public ecosystem standard가 아니라
**draft/internal protocol contract + reference definition**으로 취급한다.

**불변식 — authority는 control plane에 잔류한다.** agent runtime이 envelope/identity/
delivery/reply/route/capability/policy를 native로 1급 지원하게 되더라도, state/policy
authority는 daemon(control plane)에 남는다. native 지원이란 agent가 프로토콜을 1급으로
*말한다*는 뜻이지 authority가 agent로 옮겨간다는 뜻이 아니다.

## Primary user와 jobs-to-be-done

Primary user는 한 workspace에서 Codex와 Claude 같은 장기 실행 CLI agent를 함께 쓰며,
agent 사이의 위임·토론·결과 회신을 사람이 복사/붙여넣기하지 않고 연결하려는 개발자다.

초기 제품이 해결하는 jobs-to-be-done:

- 두 agent를 이름으로 등록하고 directed route 또는 pair로 연결한다.
- 한 agent가 다른 agent에게 새 요청을 보내고, 받은 agent가 원 요청으로 정확히 회신한다.
- target이 일시적으로 준비되지 않아도 delivery 상태와 실패 이유를 잃지 않고 드러낸다.
- 사람이 daemon/agent/route/message/delivery 상태를 점검하고 개입할 수 있다.
- vendor별 CLI·plugin·session 차이는 adapter에 가두고 protocol 의미는 유지한다.

## Cross-vendor local collaboration framing

현재 Codex/Claude 같은 **non-native CLI agent**는 adapter와 TUI prompt injection으로
연결된다. 이것은 **호환 계층(compat layer)일 뿐 목표 프로토콜이 아니다.** 장기 목표는
agent runtime이 envelope·identity·delivery·reply·route·capability·policy·presentation을
native 1급으로 지원하는 것이다.

aiox의 초기 차별점은 사용자가 이미 쓰는 서로 다른 vendor의 장기 실행 CLI/TUI agent를
하나의 local control plane 아래에서 연결하면서, vendor별 session·ingress·egress 차이를
adapter로 흡수하는 데 있다. single-vendor 내부 협업은 각 vendor의 1st-party 기능
(예: 같은 vendor 안의 team/subagent)이 빠르게 흡수하므로, aiox의 생존 공간은
**cross-vendor local 협업**으로 좁아지는 동시에 명확해진다.

따라서 compose의 중심은 범용 package manager가 아니라 route/topology와 per-agent
capability projection이고, federation의 중심은 새 public standard 경쟁이 아니라
local protocol 의미를 유지한 bridge/transport 확장이다.

## Google A2A naming/positioning 주의

> **외부 공개(GitHub/README) 시 표현 주의 (last verified 2026-06-11):** "A2A"는 Google이
> Linux Foundation에 기증한 Agent2Agent Protocol의 고유명사로 널리 쓰인다. 외부
> 표면에서는 "A2A standard를 정의한다" 대신 **"cross-vendor local agent collaboration
> runtime"**으로 자기소개하고, a2a는 소문자 일반명사로만 쓴다. protocol 이름도 공개 전
> Google A2A와 혼동되지 않게 확정한다. package/repository 이름의 실제 가용성은 publish
> 직전에 registry별로 다시 확인한다.

aiox와 Google A2A는 실질 영역이 다르다. Google A2A는 HTTP 기반 opaque remote agent 간
task 위임(enterprise)에 가깝고, aiox는 local-first에서 사용자가 이미 구독한 CLI/TUI
agent를 잇는 control plane + compat layer다.

