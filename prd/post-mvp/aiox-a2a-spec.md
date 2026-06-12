# aiox A2A Spec

aiox의 **product/architecture/protocol production spec**이자 단일 출처(single source of
truth)다. 이 문서만 읽어도 제품의 목적, 현재 구현, 목표 계약, 알려진 한계와 다음 release
gate를 파악할 수 있어야 한다. 외부 log, history와 plan은 근거 보존이나 실행 추적을
도울 뿐, 현재 계약을 이해하는 데 필수인 내용을 독점하지 않는다.

문장 상태는 다음 규칙으로 판독한다.

- **Normative**: `MUST`, `MUST NOT`, `SHOULD` 또는 "불변식"으로 쓴 계약. 구현과 테스트가
  따라야 한다.
- **Current**: 2026-06-11 source/test 기준으로 이미 동작하는 사실. 날짜가 바뀌거나 코드가
  바뀌면 재검증한다.
- **Committed target**: release/phase에 포함하기로 정했지만 아직 구현되지 않은 계약.
- **Exploratory**: spike나 외부 조건 검증 전에는 제품 약속으로 사용할 수 없는 가설.
- §0~§5의 일반 계약은 별도 표시가 없으면 Normative, §6~§8은 Committed target,
  §9는 Open, §11은 release contract, §12는 dated implementation snapshot, §13은
  rationale/evidence다.

이 문서는 **현재 승인된 의도와 계약의 권위 문서**이지 변경 불가능한 헌장이 아니다.
Normative, Committed target과 release contract도 구현 전후의 조사, 사용자와 agent의 토론,
test evidence와 명시적 사용자 승인에 따라 변경할 수 있다. 변경되기 전까지 agent는 현재
계약을 따라야 하며, 가설, 외부 변화나 구현 편의를 근거로 계약을 조용히 바꾸면 안 된다.
중요한 구현에 착수할 때 agent는 관련 현재 계약, 미결 결정, 현실적인 선택지와 영향, 권고를
사용자에게 설명하고 필요한 결정을 받은 뒤 책임 문서와 구현·테스트를 함께 갱신한다.

현재는 workspace reset을 위해 product, protocol spec, architecture, release roadmap과 dated
implementation evidence를 이 문서에 함께 모아 둔다. taxonomy 분리 시 내용을 단순 이동하거나
요약 손실시키지 않고, 각 항목을 책임 문서로 증류하면서 다음을 보존한다.

- product 문서: 사용자 문제, 범위, non-goal, 제품 원칙과 검증할 가설
- spec 문서: 외부 동작, protocol/interface와 준수 조건
- architecture 문서: 내부 책임, 구조, flow, trust boundary와 보존할 설계 자산
- roadmap 문서: gate, 우선순위, phase와 재검토 시점
- dated audit/evidence: 확인 시점, 근거, 재검증 조건
- 모든 책임 문서: 현재 권위는 명시적 검토·승인으로 변경 가능하며 agent가 임의 변경할 수
  없다는 변경 통제 원칙

본 문서가 lock하는 중심은 **추상화와 불변식**이다. remote/federation 구현, SSO/mTLS,
OS sandbox 강제 같은 항목은 의도적으로 defer하며 §8·§9에 명시한다. 실행 체크리스트의
진행 상태는 plans/log가 가질 수 있지만, 그 결과로 제품 계약이나 현재 상태가 바뀌면 이
문서도 함께 갱신한다.

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
11. Release roadmap — 게이트와 phase
12. 공개 전 수정 대상 결함 — 단계 매핑 (2026-06-11 점검)
13. 조사 판정·발견 모음

### 읽기 지도

- **현재 구현과 지원 표면:** §1의 implementation snapshot·운영 계약, §5의 current adapter
  matrix, §12의 dated implementation audit
- **목표 제품·protocol·architecture 계약:** §0과 §2~§8
- **미결 결정과 의도적으로 미룬 범위:** §9
- **공개 조건, gate DoD와 이후 phase:** §11
- **결정 근거, 외부 조사와 검증할 가설:** §13

### Release gate 빠른 범례

실제 실행 순서는 **G0 → G1/G3 → G2 → G5/G6 → G4**다. 아래는 첫 독해를 위한
요약이며, 권위 있는 상세 DoD와 Phase 0~3 정의는 §11에 있다.

| Gate | 한 줄 의미 |
| ---- | ---------- |
| **G0** | protocol·CLI·지원 범위·package/version/license를 포함한 계약과 release identity 확정 |
| **G1** | canonical envelope, 인증, ack/retry와 양방향 로컬 안정 왕복 완성 |
| **G2** | tmux driver와 2-terminal fallback을 포함한 terminal 최소 UX 완성 |
| **G3** | daemon 오류 격리, 종료 정리, logging과 doctor를 포함한 안정화 |
| **G4** | 동일 release candidate의 macOS/Linux/WSL2 최종 인증 |
| **G5** | 공개 범위, 보안·개인정보, 문서·CI·community asset의 공개 위생 정리 |
| **G6** | npm pack, clean install과 CLI smoke를 통과하는 배포 artifact 완성 |

---

## 0. 정의와 core 개념

### 0.1 정의

**aiox는 agent 간 협업을 위한 versioned communication protocol을 정의하고,
그 reference implementation으로 cross-vendor local-first daemon/runtime을 제공한다.**

- **정의하는 것 (protocol contract):** vendor·location 무관 agent communication model.
  envelope·address·route·delivery/mailbox·reply correlation·capability·policy·visibility가
  agent 간 협업의 공통 언어다.
- **제공하는 것 (reference runtime):** local-first daemon/runtime. daemon이 control plane /
  mailbox / router / state authority이고, adapter가 non-native agent runtime 차이를 흡수한다.
  현재 외부 채택자는 없으므로 본 문서는 public ecosystem standard가 아니라
  **draft/internal protocol contract + reference definition**으로 취급한다.

Primary user는 한 workspace에서 Codex와 Claude 같은 장기 실행 CLI agent를 함께 쓰며,
agent 사이의 위임·토론·결과 회신을 사람이 복사/붙여넣기하지 않고 연결하려는 개발자다.
초기 제품이 해결하는 jobs-to-be-done은 다음과 같다.

- 두 agent를 이름으로 등록하고 directed route 또는 pair로 연결한다.
- 한 agent가 다른 agent에게 새 요청을 보내고, 받은 agent가 원 요청으로 정확히 회신한다.
- target이 일시적으로 준비되지 않아도 delivery 상태와 실패 이유를 잃지 않고 드러낸다.
- 사람이 daemon/agent/route/message/delivery 상태를 점검하고 개입할 수 있다.
- vendor별 CLI·plugin·session 차이는 adapter에 가두고 protocol 의미는 유지한다.

현재 범위의 non-goal은 중앙 LLM planner, 범용 workflow engine, 완전한 OS sandbox,
모든 터미널의 자동 split 제어, restart를 넘는 durable guarantee, public federation이다.
후자의 일부는 장기 목표지만 현재 기능으로 표현하지 않는다.

> **공개(GitHub) 시 표현 주의 (external naming last verified 2026-06-11):** "A2A"는 Google이 Linux
> Foundation에 기증한 Agent2Agent Protocol의 고유명사로 널리 쓰인다. 외부
> 표면(README·소개문)에서는 "A2A standard를 정의한다" 대신
> **"cross-vendor local agent collaboration runtime"**으로 자기소개하고, a2a는 소문자
> 일반명사로만 쓴다. protocol 이름도 공개 전 Google A2A와 혼동되지 않게 확정한다.
> package/repository 이름의 실제 가용성은 publish 직전에 registry별로 다시 확인한다.

현재 Codex/Claude 같은 **non-native CLI agent**는 adapter와 TUI prompt injection으로
연결된다. 이것은 **호환 계층(compat layer)일 뿐 목표 프로토콜이 아니다.** turn/start
같은 injection 표면에는 authority side-channel이 없어, "답해야 하는 메시지인가"를
agent가 prompt 텍스트로 추론해야 하는 천장이 존재한다(§4).

장기 목표는 agent runtime이 다음을 **native로 1급(first-class) 지원**하는 것이다:

- **envelope** — canonical collaboration protocol object
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

| 개념                    | 한 줄 정의                                                                                                                                                                                                                                                  | 권위  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| **Envelope**            | agent 사이를 흐르는 canonical collaboration protocol object. vendor-neutral하고 explicit protocol version(`aiox.message.v1`)을 운반한다. logical message와 target-specific delivery metadata를 포함하며, presentation/rendering은 delivery 단위로 생성된다. | §4    |
| **Address / Identity**  | agent를 process/socket 위치가 아니라 location-neutral identity로 주소화한다. URI-like `agent://domain/project/name` 확장 가능성을 보존한다.                                                                                                                 | §4·§8 |
| **Route**               | directed message permission. `A→B`는 "A가 B에게 보낼 수 있다"는 단방향 edge. 양방향은 별도 edge 2개. capability 그래프와 분리된 "데이터 관계" 그래프.                                                                                                       | §4    |
| **Delivery / Mailbox**  | `1 message = N deliveries` fan-out과 per-recipient mailbox를 표현한다. `deliveryId`는 target-specific reply correlation의 기준이다.                                                                                                                         | §4    |
| **Capability / Policy** | agent에게 보이는 MCP/skill/tool/instruction grant와 daemon policy. aiox-owned route/tool surface는 daemon token/policy로 강제하고, external MCP/native surface는 projection과 degradation surface로 표현한다. OS sandbox와는 분리된다.                      | §7    |
| **Adapter**             | Codex/Claude/Gemini/Ollama 등 non-native runtime 차이를 흡수하는 compatibility connector. launch/attach·ingress·egress·identity 4-slot을 채우고, 그 결과로 capability tier가 결정된다.                                                                      | §5    |
| **Daemon**              | local control plane. registry·router·state authority·mailbox를 소유한다. 현재 daemon store는 `:memory:`이고, durable store 배선은 scaffold 상태다(durable = Phase 2 target, §11.2).                                                                         | §1    |

---

## 1. 멘탈 모델과 아키텍처

aiox의 primary product model은 **cross-vendor local agent collaboration protocol/runtime**이다.
versioned protocol contract와 local-first daemon은 분리된 제품이 아니라 함께 검증되는 한
reference system이다.

Reference runtime에서 daemon은 local control plane이다. daemon은 agent registry,
router, mailbox, delivery lifecycle, event/state authority, token/policy enforcement를
소유한다. agent runtime은 Codex/Claude/Gemini/Ollama/app/editor/local model/remote
worker처럼 서로 다를 수 있으며, adapter가 non-native runtime 차이를 흡수한다.

Compose는 core product가 아니라 protocol/runtime 위의 declarative composition layer다.
Compose는 agents, routes, capabilities, policies, generated session instructions를
선언하지만, collaboration protocol/lifecycle을 대체하지 않는다.

### 1.1 Current implementation snapshot (2026-06-11)

| 상태                      | 내용                                                                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Implemented**           | local daemon, profile별 Unix domain socket, in-memory SQLite repository, Codex/Claude 등록, directed route, pair reservation, logical message + target별 delivery row, adapter push, `status`/`doctor`                                      |
| **Partially implemented** | store는 N-target delivery를 표현하지만 live dispatch와 pair schema는 Codex/Claude 2-agent 전제가 남아 있다. reply는 logical `parentMessageId`/Claude `chat_id`로 연결된다. adapter push 성공을 곧바로 `delivered`와 `completed`로 처리한다. |
| **Not implemented**       | canonical `aiox.message.v1` 저장/검증, `intent`/`replyExpected`, deliveryId 기반 reply, recipient ack/retry, queued delivery 자동 flush, file-backed recovery, compose, capability projection, federation                                   |

현재 daemon DB는 `:memory:`다. mailbox **데이터 모델**은 있지만 daemon restart 뒤 복구되는
mailbox guarantee는 없다. target adapter가 준비되지 않으면 queued row를 만들 수 있으나,
현재는 등록 뒤 이를 자동 소비하는 경로가 없어 "offline delivery가 된다"고 표현하면 안 된다.

현재 trust model은 **신뢰된 단일 사용자 개발 머신에서의 preview**다. 같은 host의 악성
process나 다른 OS 사용자를 막는 release-grade boundary는 아직 아니다. 특히 Claude channel
push/ingress 인증과 socket mode가 완성되기 전에는 보안 격리를 주장하지 않는다(§7, §12).

### 1.2 Current supported surface

| 항목          | Current                                 | Release target                                      |
| ------------- | --------------------------------------- | --------------------------------------------------- |
| Agent runtime | Codex CLI, Claude Code CLI              | 동일 + 명시적 version preflight                     |
| OS            | macOS/Linux UDS 개발 경로               | macOS, Linux, WSL2 인증; native Windows deferred    |
| Persistence   | process-lifetime in-memory SQLite       | 공개 release도 제약을 명시; durable store는 Phase 2 (§11.2) |
| Collaboration | directed route, Codex/Claude pair       | 안정 왕복, ack/retry, queued flush                  |
| Terminal UX   | 각 terminal에서 `codex`/`claude` attach | portable attach + tmux demo driver                  |
| Remote        | 없음                                    | Phase 3 전까지 없음 (§11.2)                         |

현재 repository에서 재현 가능한 최소 흐름은 다음이다. 아직 설치형 public CLI가 아니라 build
entrypoint 기준이며, `aiox attach`, `aiox compose`, `aiox logs`는 구현 전 이름이다.

```bash
pnpm build
pnpm start
pnpm pair --name review
# Terminal A
pnpm claude --name claude-review --pair review
# Terminal B
pnpm codex --name codex-review --pair review
# Control terminal
pnpm status
pnpm stop
```

대화는 별도 `send` CLI가 아니라 agent runtime 안의 tool로 시작한다. Codex는
`aiox_send_message(content)`와 `aiox_reply(parent_message_id, content)`, Claude channel은
`send(text)`와 `reply(chat_id, text)`를 쓴다. 이 식별자는 현재 compatibility API이며,
§4의 deliveryId 기반 v1 계약으로 전환되어야 한다.

### 1.3 Install, upgrade, recovery contract

- **Current:** source checkout + `pnpm install/build`가 유일하게 검증된 설치 경로다. public
  npm install/upgrade/uninstall은 아직 지원한다고 주장하지 않는다.
- **Release install:** G6의 packed artifact를 clean directory에 설치하고 daemon start,
  `doctor`, Claude plugin setup, Codex/Claude attach를 검증해야 한다. postinstall은 interactive
  질문이나 user config mutation을 하지 않는다.
- **Upgrade:** 0.x에서는 breaking change가 가능하지만 package release note와 config/schema
  version을 명시한다. file DB가 도입되기 전에는 state migration을 주장하지 않는다.
- **Recovery:** current daemon restart는 state loss를 뜻한다. stale socket/process는 `doctor`
  또는 daemon start가 진단해야 하고, agent runtime reattach 방법을 보여줘야 한다.
- **Uninstall:** package 제거와 user data 삭제를 분리한다. uninstall script가 `~/.aiox`나
  project file을 자동 삭제하지 않으며, 명시적 reset/purge 표면을 도입할 때 confirmation과
  scope를 요구한다.

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
- **agent address**: logical agent의 canonical identity. runtime process/session id와 분리된다.
  v1 local 형식은 `agent://local/<profile>/<agent-name>`이며 authority/project/agent segment는
  URL percent-encoding 후 비교한다. 현재 DB의 agent id/name은 이 주소로 가는 local mapping이다.
- **type**: 저장/시스템 분류 축. 기존 `messages.type`과 연결되며, 협업 의미나 reply
  필요 여부를 단독으로 표현하지 않는다.
- **intent**: 협업 의미 축. agent-authored 값은 delegation/discussion/clarification/
  result/conclusion이고, status/notification은 daemon-authored reserved 값이다.
- **reply_expected**: target 행동 신호 축. "답해야 하는 메시지인가"를 명시한다.
  `intent`만으로 reply 여부를 추론하지 않는다.
- **source-only routing**: reply의 기본 routing. reply는 원 message의 source에게만 돌아간다.
- **mailbox**: per-recipient 수신함. target offline을 전제로 delivery를 보관한다.
- **capability tier**: adapter-backed runtime이 A2A semantics를 어느 수준으로 지원하는지
  설명하는 등급.
- **Capability Projection Layer**: common grant를 per-agent runtime projection으로 만들고,
  adapter가 native config/plugin/MCP/skill surface로 compile하는 계층.

## 3. Layer model

1. **Protocol contract layer**: vendor/location-neutral envelope, address, route, delivery,
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

### 4.1 Canonical envelope v1

다음 JSON object가 complete normative v1 envelope다. wire key는 camelCase를 사용하고,
DB column이나 vendor API의 snake_case는 adapter/repository boundary에서 변환한다.

```json
{
  "protocol": "aiox.message.v1",
  "messageId": "msg_01J...",
  "deliveryId": "dlv_01J...",
  "source": {
    "kind": "agent",
    "address": "agent://local/release/claude-review"
  },
  "target": {
    "address": "agent://local/release/codex-review"
  },
  "type": "question",
  "intent": "delegation",
  "replyExpected": true,
  "content": {
    "mediaType": "text/plain",
    "text": "Review the authentication boundary."
  },
  "createdAt": "2026-06-11T12:00:00.000Z"
}
```

| Field                 | Requirement                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `protocol`            | MUST equal `aiox.message.v1`. 지원하지 않는 major/version은 `unsupported_protocol_version`으로 거부한다.            |
| `messageId`           | source scope에서 logical message를 식별하는 non-empty opaque id. fan-out delivery들이 공유한다.                     |
| `deliveryId`          | target별 non-empty opaque id. 재전송에서도 바꾸지 않으며 reply correlation과 idempotency의 기준이다.                |
| `source.kind`         | `agent`, `human`, `daemon` 중 하나. v1 reference runtime은 `agent`만 완전 지원한다.                                 |
| `source.address`      | canonical logical source address. runtime session id를 넣지 않는다.                                                 |
| `target.address`      | 이 delivery의 단일 target. fan-out envelope 하나에 여러 target을 넣지 않는다.                                       |
| `type`                | `question`, `instruction`, `status`, `event`, `reply` 중 하나. 저장/표시 분류다.                                    |
| `intent`              | `delegation`, `discussion`, `clarification`, `result`, `conclusion`, `status`, `notification` 중 하나. 행동 의미다. |
| `replyExpected`       | boolean. delivery 완료와 별개인 reply obligation 생성 여부다.                                                       |
| `inReplyToDeliveryId` | 기존 delivery에 대한 응답이면 REQUIRED, 새 thread면 MUST be absent.                                                 |
| `content`             | v1은 `text/plain` UTF-8 text만 표준화한다. 빈 text는 `invalid_envelope`이다.                                        |
| `createdAt`           | UTC RFC 3339 timestamp. ordering authority가 아니며 관측/감사용이다.                                                |

v1 receiver는 모르는 optional field를 무시해야 하고, intermediary는 가능한 한 그대로
보존해야 한다. 기존 field의 의미 변경이나 required field 추가는 새 protocol version이
필요하다. vendor-specific 값은 canonical top-level key를 만들지 말고 namespaced extension을
사용한다.

Intent authoring surface는 전체 wire enum보다 좁다. agent가 `send`/`reply`로 직접 만드는
메시지는 `delegation | discussion | clarification | result | conclusion`만 사용한다.
`status`와 `notification`은 daemon/adapter가 lifecycle·presentation event를 만들 때 쓰는
reserved intent이며 authenticated `source.kind=daemon`만 만들 수 있다. agent/human source가
reserved intent를 제출하면 `reserved_intent_not_allowed`로 거부한다. adapter는 daemon
authority를 위임받은 system event 변환에서만 이를 만들며 vendor text만 보고 승격하지 않는다.

G1 cutover 뒤 canonical send/reply tool은 free-form `Intent:` label parsing을 authority로 쓰지
않는다. send는 최소 `intent`, `replyExpected`, `content`를, reply는
`inReplyToDeliveryId`, `intent`, `replyExpected`, `content`를 typed input으로 받는다. 현재
Claude/Codex의 text-only tool과 5종 label instruction은 pre-release compatibility surface이므로
schema validator, MCP instruction, tool description, example과 test fixture를 한 변경으로
교체한다. negative test는 agent-authored reserved intent, unknown intent, label과 typed field가
충돌하는 legacy input을 포함한다.

Canonical address는 logical agent를 나타낸다. v1 local reference runtime은
`agent://local/<profile>/<agent-name>`을 사용하고, daemon은 canonical address, DB agent id,
adapter kind, 현재 runtime/session id의 mapping을 명시적으로 유지한다. session 재시작은 같은
logical address에 rebind할 수 있지만, 이름 변경은 v1에서 새 identity 생성으로 취급한다.

### 4.2 Routing and reply correlation

- daemon은 source identity를 인증한 뒤 active directed route를 검사한다. route가 없으면
  `route_not_allowed`로 거부하며 adapter text가 이를 우회할 수 없다.
- fan-out은 logical message 하나와 target별 envelope/delivery N개를 만든다. 각 delivery는
  같은 `messageId`, 서로 다른 `deliveryId`와 `target.address`를 가진다.
- reply는 `inReplyToDeliveryId`로 원 delivery를 해석하고, **원 source만** 단일 target으로
  삼는 새 logical message를 만든다. replying agent의 현재 outbound route fan-out을 사용하지
  않는다.
- unknown delivery, 원 target과 다른 replying identity, 이미 terminal reply로 닫힌
  obligation의 중복 reply는 각각 `unknown_delivery`, `correlation_mismatch`,
  `duplicate_terminal_reply`로 거부한다.
- 현재 Codex `parentMessageId`와 Claude `chat_id`는 logical message id를 가리키므로 이
  계약에 비준수다. v1 cutover에서 deliveryId로 바꾸며, migration 중에는 둘을 혼동하지
  않도록 별도 field로 읽는다.

### 4.3 Delivery, acknowledgement, retry

Delivery transport state와 reply obligation은 독립이다.

```text
queued -> delivering -> delivered -> completed
queued | delivering | delivered -> failed
```

- `queued`: delivery가 저장됐지만 push를 시작하지 않았다.
- `delivering`: adapter push attempt가 진행 중이다.
- `delivered`: adapter가 입력을 받아들였다. target agent가 봤거나 처리했다는 뜻은 아니다.
  ack deadline을 넘기면 상태를 거짓으로 failed/completed 처리하지 않고 `unconfirmed`
  degradation을 함께 기록한다.
- `completed`: daemon이 해당 `deliveryId`에 대한 explicit ack 또는 adapter별로 검증된
  passive ack를 받았다.
- `failed`: bounded retry가 소진됐거나 재시도 불가능한 terminal failure다. dead-letter는
  별도 상태가 아니라 failed delivery를 운영 표면에서 분류하는 정책으로 시작한다.

Ack는 `deliveryId`, acknowledging identity, evidence kind(`explicit | passive`), timestamp를
기록해야 한다. explicit ack가 기본이다. Stop hook 같은 passive signal은 해당 delivery와
target session을 상관할 수 있을 때만 ack다. 단순 HTTP/JSON-RPC 성공, process 생존,
사용자 interrupt는 ack가 아니다.

재전송은 같은 `messageId`, `deliveryId`, canonical content를 유지하고 attempt만 증가시킨다.
수신 adapter/agent는 이미 ack한 `deliveryId`를 다시 받아도 LLM action이나 reply obligation을
중복 생성하면 안 된다. `messageId`가 같지만 canonical content 또는 target set이 다르면
`message_id_conflict`로 거부한다. 한 target의 실패는 다른 fan-out delivery를 막지 않는다.

Retry eligibility는 acceptance 전후로 나눈다.

- adapter가 입력을 받지 않았다고 확정한 pre-acceptance failure는 모든 tier에서 bounded
  automatic retry 대상이다.
- adapter acceptance 뒤 ack만 유실된 delivery는 target-side duplicate suppression을 보장하는
  Tier 1/2 adapter(§5 capability tier)만 automatic re-injection할 수 있다.
- Tier 3처럼 duplicate agent action을 막을 수 없는 adapter는 acceptance 뒤 ack timeout을
  `delivered` 상태의 `unconfirmed` degradation으로 surface하고 자동 재주입하지 않는다. 사용자가
  duplicate risk를 확인한 explicit retry만 허용하며 event에 manual actor와 retransmit marker를
  남긴다.

Reference runtime release baseline은 retry-eligible attempt에 bounded retry, exponential
backoff, 최대 attempt와 `nextAttemptAt` 관측을 MUST 제공한다. 정확한 기본 횟수/간격은 G1
failure-injection 결과로 고정하되 무한 retry는 금지한다. G1 idempotency evidence는 daemon의
동일 delivery 중복 저장·dispatch 방지, Tier 1/2 adapter duplicate suppression, Tier 3의
post-acceptance no-auto-retry를 각각 검증한다. Tier 3에서 LLM action exactly-once를 주장하지
않는다.

`replyExpected: true`인 completed delivery는 별도 `awaiting_reply` obligation을 만든다.
유효한 correlated reply가 이를 fulfilled로 바꾼다. reply가 ack보다 먼저 도착하면 그 reply는
해당 delivery의 explicit ack evidence도 겸한다. delivery 완료는 reply 완료가 아니다.
reply timeout은 기본 hard failure가 아니라 pending visibility threshold이며, hard deadline과
cancellation은 explicit policy가 있을 때만 terminal state를 만든다.

Adapter가 target runtime의 실행 lifecycle을 관측할 수 있으면 `target_started`,
`target_progress`, `target_finished`, `target_failed` 같은 progress evidence를 event로 surface할
수 있다. 이는 source에게 "전달 후 처리 중인가"를 보여주는 visibility signal이지 delivery
ack나 correlated reply가 아니다. `target_started`나 `target_progress`는 delivery를 completed로
만들지 않고, `target_finished`도 reply obligation을 fulfilled로 만들지 않는다. 다만 event가 특정
`deliveryId`와 target session에 상관되고 adapter가 그 의미를 보장할 때에는 별도의 passive ack
evidence를 함께 생성할 수 있다. adapter는 progress visibility 지원 여부를 capability/degradation
surface에 보고하고, vendor lifecycle event를 지원하지 않으면 progress를 추정해 만들지 않는다.

### 4.4 Baseline error model and defaults

v1 typed errors는 최소한 `invalid_envelope`, `unsupported_protocol_version`,
`unauthorized_source`, `route_not_allowed`, `unknown_target`, `message_id_conflict`,
`unknown_delivery`, `correlation_mismatch`, `duplicate_terminal_reply`, `backpressure`,
`reserved_intent_not_allowed`, `adapter_unavailable`, `delivery_failed`를 구분한다. error는
stable code와 human-readable message를 함께 제공하며 secret/token/raw credential을
포함하지 않는다.

- target availability를 모르면 기본은 queue다. 명시적 policy만 reject로 바꿀 수 있다.
- fan-out aggregate terminal state는 v1에 만들지 않고 target별 delivery를 authoritative하게
  유지한다.
- backpressure 한도를 넘으면 무제한 메모리 적재 대신 typed reject 또는 bounded queue를 쓴다.
- user cancellation은 ack/reply를 추론하지 않는다. 원 obligation에 별도 cancellation
  evidence를 기록한다.
- v1은 global total ordering을 약속하지 않는다. 같은 target에 대한 live injection attempt는
  adapter/session별로 serialize해 interleaving을 막고, 관측 순서는 `createdAt`이 아니라 daemon
  sequence/event order로 표현한다.

### 4.5 Reference runtime persistence minimum

G1 schema/cutover가 완료되면 repository는 최소한 다음 정보를 잃지 않고 조회할 수 있어야
한다. 실제 table 분리는 구현 detail이지만 의미를 합치거나 생략할 수 없다.

- message: protocol, messageId, source kind/address, type, intent, replyExpected, canonical
  content, createdAt.
- delivery: deliveryId, messageId, target address, route id, status, idempotency key, attempt,
  retry eligibility, nextAttemptAt, ack deadline, degradation code, last failure code.
- ack: deliveryId, acknowledging identity, evidence kind, timestamp.
- reply obligation: originating deliveryId, state(`awaiting_reply | fulfilled | cancelled |
expired`), fulfilling reply message/delivery id.
- event: state transition, actor, correlation ids와 redacted diagnostic data.

현재 schema는 message의 sourceAgentId/parentMessageId/type/content와 delivery status/
idempotencyKey까지만 저장한다. 따라서 v1 field를 prompt에만 렌더하고 저장하지 않는 구현은
conformant하지 않다. 공개 release가 계속 in-memory DB를 쓰더라도 process lifetime 안에서는
위 상태와 전이를 일관되게 보존해야 한다.

Protocol invariants:

- `type`, `intent`, `reply_expected`는 분리한다.
  - `type`: 저장/시스템 분류.
  - `intent`: agent-authored 5종과 daemon-authored reserved 2종으로 나뉘는 협업 의미.
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
- delivery lifecycle은 push 후 **ack로 완결**되며, 미확인 delivery는 §4.3 정책에 따른다.

Current non-native caveat:

- Codex/Claude 같은 TUI target injection은 prompt-level compatibility path다.
- adapter-backed runtime이 structured envelope ingestion이나 presentation policy를 강제하지
  못하면 typed degradation으로 surface해야 한다.
- 현재 `AdapterInjectResult.kind === "success"`는 adapter/transport acceptance일 뿐 ack가
  아니다. 현재 구현처럼 곧바로 `completed`로 전이하는 동작은 G1에서 교체한다.

Implementation review notes (G1 착수 시 사용자와 재검토):

- §4.1의 complete normative object 예시는 새 thread용이다. `inReplyToDeliveryId`는 reply에서만
  required인 조건부 field이므로 현재 예시에서 빠진 것이 계약 위반은 아니다. 다만 schema,
  fixture와 문서 구현 시 새 thread와 reply 예시를 각각 두어 reply 구현이 이 field를 누락하지
  않게 한다.
- `messageId`는 현재 source scope의 opaque id로 정의돼 있다. `deliveryId`의 생성 namespace와
  uniqueness scope, repository unique constraint, daemon 간 federation 시 충돌 처리까지 어느
  범위에서 보장할지는 G1 schema를 고정할 때 명시한다.
- Tier 3에서 acceptance 뒤 ack를 끝내 얻지 못한 `delivered + unconfirmed` delivery의 retention,
  operator-visible stale 기준, 수동 retry·cancel·archive 처리와 reply obligation 정리 정책은 G1
  failure-injection 결과를 보고 결정한다. 자동 재주입 금지 원칙은 유지한다.
- reply가 ack보다 먼저 도착할 수 있으므로 구현은 reply obligation을 `completed` 전에도 유실
  없이 식별하거나 reply 처리와 함께 원 delivery의 ack evidence·obligation fulfillment를
  원자적으로 기록해야 한다. obligation 생성 시점과 state transition의 정확한 저장 모델은 G1
  schema 설계에서 확정한다.
- **Recommended, not yet approved — correlated reply authorization:** 원 delivery가 원 target
  identity에 해당 obligation을 이행하는 correlated reply 권한을 부여하고, 별도의 reverse
  directed route는 요구하지 않는 방식을 우선 검토한다. 이 권한은 임의의 새 message 전송
  권한이 아니며, daemon은 `inReplyToDeliveryId`, replying identity와 유효한 obligation을 모두
  검증해야 한다. G1에서 reverse route 요구안과 보안·UX 영향을 비교해 사용자 승인을 받는다.
- **Recommended, not yet approved — `type` authoring:** canonical `send`는 caller가
  `question | instruction`을 명시하고, canonical `reply`는 daemon이 `reply`로 고정하며,
  `status | event`는 인증된 daemon/system path만 생성하는 방식을 우선 검토한다. `type`은
  `intent`에서 암묵적으로 추론하지 않는다. 정확한 typed input과 validation 규칙은 G1에서
  사용자 승인을 받아 확정한다.
- **Recommended, not yet approved — explicit ack surface:** explicit ack는 일반 message
  envelope이 아니라 인증된 control-plane operation으로 두는 방식을 우선 검토한다. caller는
  `deliveryId`를 제출하고 acknowledging identity는 caller 입력을 신뢰하지 않고 token/session
  binding에서 daemon이 결정한다. operation/tool/RPC 이름과 adapter별 호출 시점은 G1에서
  사용자 승인을 받아 확정한다.

## 5. Adapter (4-slot + capability tier)

Adapter는 vendor/runtime 차이를 흡수하는 compatibility connector다. Protocol contract가
요구하는 semantics를 non-native runtime에 가능한 가장 좁은 native surface로 projection한다.

Adapter id는 closed enum이 아니라 runtime connector id로 열어둔다. 현재 구현은 Codex와
Claude에 가깝지만, contract는 `codex-cli`, `claude-cli`, `gemini-cli`, `ollama-local`,
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

- **Tier 1 `full_duplex_structured`**: structured envelope ingress/egress, deliveryId 보존,
  authenticated identity, explicit ack와 idempotent duplicate 처리를 모두 제공한다.
- **Tier 2 `side_channel`**: structured metadata와 authenticated egress는 제공하지만 message
  presentation 또는 wake-up이 runtime-specific secondary channel을 사용한다. 누락 guarantee를
  adapter가 개별 flag로 보고한다.
- **Tier 3 `prompt_only`**: message/correlation metadata를 text로 렌더한다. target receipt,
  identity, correlation 또는 dedupe 중 하나 이상을 강제할 수 없다. prompt injection 성공만으로
  acknowledged를 보고하면 안 된다.
- **Tier 4 `unsupported`**: 신뢰할 수 있는 ingress 또는 egress 경로가 없어 route target으로
  등록할 수 없다.

4-slot은 adapter 구현 입력 모델이고, tier는 그 결과로 해당 runtime이 지원하는 A2A 수준을
설명한다. 모든 runtime을 Tier 1로 취급하지 않는다.

Current adapter matrix (2026-06-11):

| Runtime         | Launch/attach                               | Ingress                                         | Egress                                             | Identity/correlation                                            | Effective tier                                                                                                                                                                                                                                                   |
| --------------- | ------------------------------------------- | ----------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex CLI       | daemon-owned app-server + TUI launch/resume | app-server turn/prompt compatibility path       | launch-scoped MCP `aiox_send_message`/`aiox_reply` | agent token + thread/session; reply는 logical parent message id | **Tier 3**. 현재 CLI는 `ws://127.0.0.1:0`을 accepted listen value로 노출하지만 upstream 문서는 WebSocket transport를 experimental/unsupported로 명시하므로 version pin과 fallback 결정이 G0/G1 blocker다. `thread/inject_items`/`turn/steer`도 TUI spike 전이다. |
| Claude Code CLI | plugin channel launch                       | local channel push/notification + text envelope | channel `send`/`reply`                             | agent name + `chat_id`; 현재 ingress/push auth gap 존재         | **Tier 3 preview**. 인증과 delivery ack가 완성되면 Tier 2 후보.                                                                                                                                                                                                  |

지원 표에 없는 runtime은 이름만 adapter enum에 추가해서 지원으로 주장하지 않는다. 4-slot,
auth, ack, degradation test를 모두 기록한 뒤 tier를 부여한다.

Claude TUI ingress는 하나의 표면을 완전한 보장처럼 취급하지 않고 다음 fallback map으로
판독한다. 외부 CLI/hook 표면은 current adapter matrix와 함께 재검증한다.

- **Current primary:** plugin channel notification/push. TUI를 유지하면서 비동기 전달할 수
  있지만 idle delivery와 receipt를 자체 보장하지 않으므로 G1 auth·ack·retry 계약이 필요하다.
- **Committed compatibility rule:** Stop hook은 pending mailbox 확인 또는 passive ack의 보조
  신호로만 쓴다. 특정 `deliveryId`와 target session에 상관되지 않으면 ack가 아니다.
- **Exploratory fallback:** UserPromptSubmit hook은 다음 사용자 입력에 pending delivery를
  동봉할 수 있지만 idle session을 깨우지 못하므로 primary ingress나 delivery guarantee가
  아니다.
- **Exploratory alternate runtime:** headless stream/SDK 경로는 더 강한 structured control을
  줄 수 있지만 TUI continuity와 billing/runtime 분류가 달라질 수 있다. 실제 vendor policy와
  account usage를 검증하기 전에는 현재 adapter의 대체 계약으로 채택하지 않는다.
- **Tier 3 last resort:** prompt injection이나 terminal key injection은 명시적
  `prompt_only` degradation으로만 허용한다.

Adapter status와 diagnostics는 현재 선택된 ingress path, fallback 발생 이유, wake-up·ack·dedupe
보장 여부를 각각 노출해야 한다. fallback이 성공했다는 이유만으로 effective tier를 올리지 않는다.

## 6. Compose (declarative composition)

**Status: Committed target, Phase 2. 현재 CLI/config에는 구현되어 있지 않다.** 아래 command와
schema 이름은 v1 compose contract를 승인할 때까지 provisional이다.

Compose는 Docker clone이 아니다. Compose는 collaboration protocol/runtime 위에서 project
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
- **user-level preference와 project-level compose를 분리한다.**
  터미널 종류/view driver/기본 profile 같은 사람 취향은 user config
  (`~/.aiox/config.json`, 첫 실행 onboarding이 env 감지 — `$TERM_PROGRAM`·`$TMUX`·
  `$WT_SESSION` — 로 생성)가 소유하고, topology/capability 같은 프로젝트 계약은
  compose 파일이 소유한다. compose에 사용자 취향을 넣으면 커밋마다 팀원과 충돌한다
  (shadcn `components.json`이 "프로젝트 계약만 담아서" 작동하는 것과 같은 이유).
  설치(postinstall) 시 interactive 질문은 안티패턴(CI·비대화형 설치에서 실패) —
  묻는 시점은 첫 실행이다.
- 위의 "tmux/VS Code tasks/Windows Terminal 같은 자동 배치"
  recipe/plugin layer를 **view driver**(`--ui tmux|wt|iterm2|none`)로 명명한다.
  모델은 docker compose와 동형: `aiox compose up` = daemon 관리 detached 기동,
  `aiox attach <agent>` = 모든 터미널에서 동작하는 보편 표면(여기까지가 core),
  view driver = 제어 표면이 있는 멀티플렉서/터미널에만 제공하는 표시 계층.
  "어떤 터미널이든"이라는 요구는 split 제어가 아니라 attach 보편성으로 충족한다
  (macOS Terminal.app·PowerShell 콘솔·IntelliJ·VSCode 터미널 패널은 외부 split 제어
  표면이 없다). 자체 PTY 호스팅(node-pty + scrollback + resize)은 "미니 tmux" 함정 —
  detach 백엔드는 tmux에 위임한다(G2 최소 driver).

User config도 현재 미구현 target이다. 도입 시 precedence는
`CLI flag > environment > profile-scoped user config > built-in default`로 고정하고,
config에는 schema version, profile scope, validation error, migration 규칙을 둔다. 첫 실행
onboarding은 interactive TTY에서만 제안하며 CI/non-interactive 실행은 질문 없이 default 또는
명시적 오류로 끝난다. compose 파일명과 discovery 규칙은 compose 착수 전에 별도 승인한다.

Implementation review note (Compose 착수 시 사용자와 재검토):

- `host policy > native project docs > compose session instruction > user prompt > agent memory`는
  책임과 의도상 우선순위를 표현한 현재 원칙이다. 실제 runtime마다 instruction role, config
  precedence와 강제 가능 범위가 다르므로 이를 모든 adapter의 기술적 precedence로 미리
  가정하지 않는다. Compose 구현 전에 adapter별 주입 surface와 충돌 동작을 검증하고, 원칙을
  보존할 수 없는 경우 degradation 또는 runtime별 계약과 함께 사용자 승인을 받아 갱신한다.

## 7. Capability와 sandbox

**Status: policy model은 Normative target, capability projection과 sandbox enforcement는
미구현이다.** 현재 token/route enforcement 일부가 존재하지만 release-grade security
boundary로 간주하지 않는다.

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
- runtime projection은 OS별 path와 filesystem 제약을 고려한다. host의 session-only
  plugin/config 표면을 우선하고, filesystem materialization이 필요한 경우에만 symlink-first와
  Windows copy fallback을 사용한다.
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

### 7.1 Claude/Codex projection feasibility (2026-06-11)

이 절은 compose 구현 완료를 주장하지 않고, §7의 `registry -> resolve -> projection ->
adapter compile` 중 마지막 compile 단계에 사용할 수 있는 현재 표면을 구분한다. 확인
환경은 Claude Code 2.1.170과 Codex CLI 0.137.0이며, 실제 지원 범위는 adapter preflight와
version matrix로 다시 고정한다.

| Projection                                 | Current evidence                                                                                                                                                                                                                                                               | Feasibility judgment                                                                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex per-session MCP                      | 현재 launcher가 `-c mcp_servers.aiox=...`로 aiox send/reply MCP와 agent identity env를 주입한다(`src/adapters/codex/launcher.ts`). unit test도 inline config 생성을 검증한다.                                                                                                  | **Proven for one fixed aiox server.** compose 선언의 N개 server와 tool grant로 일반화하는 것은 낮은 위험의 compiler 작업이지만 아직 구현되지 않았다.                                                      |
| Claude per-session MCP/instruction         | inline 경로는 `--mcp-config`, 기본 경로는 channel plugin activation으로 aiox tool과 MCP server instructions를 세션에 연결한다(`src/adapters/claude/launcher.ts`, `channel-server.ts`).                                                                                         | **Proven for one fixed aiox plugin/server.** `--strict-mcp-config`, settings precedence와 여러 plugin 충돌을 포함한 일반화는 구현·통합 시험이 필요하다.                                                   |
| Claude user-declared skill/MCP/instruction | 공식 CLI는 session-only `--plugin-dir`, `--mcp-config`, `--settings`, `--append-system-prompt(-file)`을 제공하고 plugin은 skill과 MCP server를 함께 묶을 수 있다.                                                                                                              | **Official surface exists.** plugin으로 패키징된 skill은 symlink/copy 없이 per-agent 부여할 수 있다. raw skill directory 조합과 Windows path 처리는 별도 compiler fallback이다.                           |
| Codex user-declared MCP/instruction        | 공식 CLI의 `-c/--config`는 arbitrary key override를 지원하고 `mcp_servers`, `developer_instructions`/`model_instructions_file`, MCP tool allow/deny를 config로 표현한다.                                                                                                       | **Official surface exists.** current one-off aiox injection을 일반화할 수 있으나 quoting, secret 전달과 managed-policy 충돌 test가 필요하다.                                                              |
| Codex per-agent skill/plugin set           | Codex는 repo/user/admin skill discovery, symlinked skill folder와 plugin bundle을 제공하고, 공식 config 문서는 installed plugin의 `enabled` 값을 정의한다. 현재 `codex plugin` CLI는 add/list/remove만 노출하고 session-only `--plugin-dir`에 해당하는 flag는 확인되지 않았다. | **Spike required.** preinstalled plugin의 one-off `-c` toggle, generated `--profile`, agent별 worktree/projection directory 중 어떤 방식이 동일 repo 동시 session에서 실제 격리되는지 검증한 뒤 계약한다. |

따라서 compose는 새 vendor mechanism 발명보다 현재 하드코딩된 aiox projection을 선언형
N개 grant로 일반화하는 작업에 가깝다. 그러나 현재 코드는 registry, dependency resolution,
conflict detection, projection cleanup과 arbitrary user capability compile을 구현하지 않았으므로
"절반 구현"은 adapter compile primitive에만 해당한다.

Host가 제공하면 client-visible MCP tool surface도 좁힐 수 있다. 예를 들어 Codex는
server별 enabled/disabled tool을, Claude는 tool allow/deny와 strict MCP config를 제공한다.
다만 이것은 외부 MCP server process 내부의 side effect, 동적 tool 변경이나 이미 skill에서
읽은 지식까지 회수하는 sandbox가 아니다. projection artifact와 secret은 owner-only 임시
경로에 만들고 session 종료 시 정리해야 한다.

Primary references: [Claude CLI reference](https://code.claude.com/docs/en/cli-reference),
[Claude plugins reference](https://code.claude.com/docs/en/plugins-reference),
[Codex advanced config](https://developers.openai.com/codex/config-advanced),
[Codex skills](https://developers.openai.com/codex/skills),
[Codex app-server](https://developers.openai.com/codex/app-server/).

Sandbox vocabulary is reserved but non-guarantee until explicitly implemented.

Reserved profiles:

- `none`
- `cwd-readonly`
- `cwd-write`
- `container`
- `vm`
- `remote-worker`

### 7.2 Trust boundary and data handling

- daemon socket, Claude channel endpoint, adapter credentials와 per-agent token은 trust
  boundary다. release 전에 runtime directory는 owner-only, socket/token file은 최소 권한으로
  생성하고 모든 ingress/push path에서 identity를 검증한다.
- 예상 가능한 client socket 오류는 request/connection boundary에서 처리한다. 최상위
  `unhandledRejection`/`uncaughtException`은 secret을 제거한 structured fatal log를 남기고
  process를 종료해야 하며, 손상 가능 상태에서 계속 실행하는 복구 수단으로 쓰지 않는다.
- message/transcript/log는 source code나 credential을 포함할 수 있는 local sensitive data다.
  기본 저장 위치는 profile namespace 아래여야 하고, public telemetry 전송은 opt-in 전에는
  금지한다. token/raw credential은 log/event/error에 남기지 않는다.
- 현재 DB는 process-lifetime이므로 retention/deletion guarantee가 없다. durable store를
  도입할 때 보존 기간, project/profile 삭제, transcript export/redaction, schema migration과
  crash recovery를 함께 정의한다. 이 항목 없이 "durable mailbox"를 release하지 않는다.

## 8. Federation / remote

aiox는 local-first로 시작하지만, protocol contract는 location-ready하게 둔다.

이 protocol contract는 다음 범위로 커져도 깨지지 않아야 한다:

1. **Same daemon local**: 같은 machine, 같은 daemon 안에서 agent끼리 대화한다.
2. **Same machine multi-daemon**: 같은 machine 안의 project/profile별 daemon이 서로
   주소화될 수 있다.
3. **Local-remote**: local daemon과 remote daemon 사이에서 agent가 대화한다.
4. **Company internal federation**: 회사 내부망의 team/project/org 경계를 정책으로 다룬다.
5. **Remote-remote**: remote daemon끼리 public/private transport로 대화한다.

위 목록은 구현 순서가 아니라 protocol contract가 보존해야 하는 확장 범위다. 높은 범위의 기능은 낮은
범위의 protocol contract를 깨지 않는 additive extension으로만 추가한다.

Principles:

- A2A envelope/route는 location-neutral하게 둔다.
- A2A protocol은 OS transport를 몰라야 한다. Unix domain socket, Windows named pipe,
  TCP loopback 같은 선택은 transport 구현 detail이다.
- local socket path나 process 위치를 canonical message identity로 박지 않는다.
- address/identity는 URI-like extension 가능성을 보존한다.
- local/remote 차이는 transport와 identity 계층이 처리한다.
- remote/federation 구현은 defer한다.
- **Committed transport direction:** protocol은 transport를 모르지만,
  reference runtime의 선택은 기록한다 — **거리마다 다른 transport, 같은 protocol**:
  ① 로컬 제어 평면(CLI↔daemon) = UDS 유지 + Windows는 named pipe(Node `net` 모듈
  동일 API, 전환 지점은 `src/daemon/socket-transport.ts` 주석에 표시됨. TCP loopback은
  차선 — 포트 충돌·로컬 다중 사용자 접근 제어 약함·Windows 방화벽 팝업).
  ② agent ingress = vendor 표면이 결정(MCP stdio/HTTP loopback/WS) — 선택권 없는 층.
  ③ daemon↔daemon(L1 사내망/L2 remote) = WebSocket over HTTPS + token/mTLS
  (`ws` 의존성 기보유, tunnel — tailscale/cloudflared — ·프록시 친화).
  ④ 자체 TCP 바이너리 프로토콜은 만들지 않는다.
- **Exploratory sequencing:** remote 확장 후보 순서는 **L2 → L1 → L3**다. L2는
  모바일/원격 client가 지원하는 connector와 secure tunnel을 이용해 local aiox MCP
  surface에 도달하는 가설이다. 실제 mobile client 지원 범위, 인증, background lifecycle,
  user consent를 spike하기 전에는 "신규 프로토콜 없이 가능" 또는 제품 기능으로 약속하지
  않는다. L1은 사내망 daemon federation, L3는 외부 vendor/Google A2A bridge이며 vendor
  표면 의존성이 더 크다. 전부 동시에 진행하지 않는다.

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
- Codex structured ingress spike. 2026-06-11 official app-server surface에서
  `thread/inject_items`, `turn/steer`, `turn/started|completed`, `outputSchema`,
  `thread/tokenUsage/updated` 존재는 확인했다. version-generated schema에서 본
  `clientUserMessageId`는 public docs 계약으로 확인되지 않았으므로 deliveryId binding
  후보일 뿐이다. 남은 검증은 TUI 표시, active turn 충돌, wake-up 조합, correlation id
  보존과 실패 모드다. 검증 전에는 Tier 2로 올리지 않는다.
- OS/process/filesystem/network sandbox enforcement.
- full external MCP internal tool allow/deny enforcement.
- skill knowledge recall/revocation guarantee.
- Claude TUI의 외부 structured injection은 공식 지원 표면이 생기기 전까지 channel
  compatibility path를 유지한다. 관련 upstream issue는 상태가 바뀔 수 있으므로 adapter
  착수 시 재확인한다.

Lifecycle policy open questions:

- Pair-level blocked/pending policy:
  - How agent-level availability (`user_reported_limited`, adapter-reported failure,
    unavailable) affects pair-level state.
  - Whether limited/unavailable agents should pause all pairs containing that agent with
    a state like `blocked_by_agent`.
  - 기본 delivery는 §4.4에 따라 queue하되, pair-level UX와 explicit reject policy를 어떻게
    표현할지.
  - Whether reset time should auto-resume a pair or only downgrade the agent to
    `availability_unknown` until explicit user report.
  - How blocked-pair status is surfaced to the source agent.
- Duplicate outbound while `awaiting_agent_reply` is unresolved: 같은 logical request의
  coalescing/confirmation UX와 opposite-direction lane serialization.
- Fan-out partial completion:
  - v1 authority는 individual delivery다. source에게 partial completion을 어떤 summary로
    보여줄지만 open이다.
- User-interrupted pending turns:
  - When the adapter has no structured signal, whether to use user report, cancel command,
    or keep pending.
  - Interrupted message terminal state: `cancelled_by_user`, `failed`, `superseded`, or
    remain `awaiting_agent_reply`.
- Retry 기본 횟수/간격과 passive ack timeout의 release 값. §4.3 범위 안에서 G1
  failure-injection으로 고정한다.

## 10. 위험한 은유

- **MCP만 있으면 agent collaboration이 된다**: MCP는 agent가 tool을 쓰는 표준에 가깝고,
  aiox는 local cross-vendor agent collaboration protocol과 runtime을 함께 제공한다.
- **aiox가 전화기를 소유한다**: aiox는 회선을 연결하지만 agent runtime 자체를 소유하지
  않는다. authority는 daemon에 있고, terminal/app/editor는 각 runtime의 surface다.
- **terminal launcher가 본질이다**: 터미널 실행은 초기 UX이고, core는 collaboration protocol과
  reference runtime이다.
- **Docker services/replicas**: agent는 interchangeable service replica가 아니라
  stateful/non-fungible participant다.
- **compose가 native docs를 대체한다**: compose instruction은 launch-scoped orchestration
  layer이고, `AGENTS.md`/`CLAUDE.md`는 read-only native base layer다.
- **capability isolation은 OS sandbox다**: capability projection과 OS sandbox guarantee는
  별도다.
- **aiox가 중앙 LLM brain이다**: aiox는 communication/control-plane runtime이며 agent의
  판단을 대체하지 않는다.

---

## 11. Release roadmap — 게이트와 phase

이 절은 "무엇을 통과해야 공개 가능한가"의 제품 계약이다. 세부 task 상태는 plan/log로
분리할 수 있지만 gate 의미와 선후관계는 이 문서만으로 이해할 수 있어야 한다.

배포 계약은 **로컬 Codex↔Claude 안정 왕복 + terminal UX + daemon 안정화 + Windows
WSL2 검증을 완료한 뒤 npm publish와 GitHub 공개를 진행하고, 이후 phase를 계속 개발하는 것**이다.

### 11.1 게이트 DoD

- **G0 contract와 release identity**: §4 envelope/state/error 계약 승인 + canonical CLI
  이름과 구현/미구현 표면 구분 + 지원 Node/agent CLI/OS matrix 고정 + npm package name,
  0.x version, license, config precedence 결정. package name 가용성은 이 시점과 publish
  직전에 확인한다. 이 결정은 help, docs, diagnostics, package metadata 전반에 영향을 주므로
  마지막 packaging 단계까지 미루지 않는다.
- **G1 로컬 안정 왕복**: 하나의 release gate지만 하나의 거대 구현 단위로 수행하지 않는다.
  착수 전에 다음 네 실행 단위의 순서와 상태만 소유하는 얇은 G1 sub-plan을 만들고, 실제
  작업·판단·test evidence는 각 stage log와 code/test가 소유하게 한다.
  **G1-A contract/ingress**: canonical schema와 typed send/reply tool 계약을 고정하고,
  Claude/Codex instruction·description·example을 동기화한다. Codex spike는 TUI 표시,
  active-turn `turn/steer` 충돌, idle wake-up 조합, deliveryId 보존과 timeout/process-exit/
  unsupported-method 실패 모드를 검증한다. send tool result는 "dispatch 접수일 뿐 원격 응답
  완료가 아니며 sleep/polling하지 말고 inbound reply를 기다린다"는 비동기 경계를 명시한다.
  **G1-B envelope cutover**: repository schema, deliveryId correlation, adapter render와 migration.
  **G1-C reliability**: §4.3의 tier별 ack/retry/idempotency, queued flush, target serialization,
  Codex runtime failure production 배선과 stale connected recovery. **G1-D trust boundary**:
  Claude push/ingress auth, Codex secret 전달, runtime directory/socket permission, token compare와
  rollback. G1-A spike 결과가 G1-B의 Codex render 경로를 선행 결정하며, G1-C와 G1-D는 §4
  schema가 고정된 뒤 병행할 수 있다. 네 단위를 모두 통과하기 전에는 G1 합격이 아니고,
  인증되지 않은 왕복도 "안정"으로 합격시키지 않는다.
- **G2 terminal 최소선**: tmux view driver 1개를 게이트에 포함한다. "한 명령 데모"의
  가치가 driver 1개 구현 비용보다 크며, tmux 미설치 시 2-터미널 fallback을 안내한다.
  다른 driver는 Phase 2로 둔다. README Quick Start를 포함하고 **compose는 요구하지 않는다.**
  G2의 tmux 래퍼는
  기존 pair/attach 플로우 위에 얹는다(compose.yaml은 Phase 2). driver 선택도 G2에서는
  플래그/env 감지로 충분하며 user config 영속화는 Phase 2 onboarding에서.
- **G3 daemon 안정화**: expected socket/client error를 connection boundary에서 격리하고,
  최상위 unhandledRejection/uncaughtException은 fatal structured log 후 종료한다. 손상
  가능 상태에서 계속 실행하지 않는다. 또한 `stop`/SIGTERM에서
  codex runtime 전체 dispose + 구조화 로거(JSONL → `~/.aiox/<profile>/daemon.log`)
  - `aiox logs` + doctor 확장(daemon 생존·소켓 응답·channel 등록 상태).
    durable store는 공개 게이트에 포함하지 않는다. README에 ":memory:, 재시작 시 상태
    소실"을 명시하고, Phase 2에서 mailbox replay와 묶어 완성한다.
- **G4 final release candidate 인증**: G0~G3, G5, G6의 code/config/package 변경을 모두
  포함한 동일 release candidate에서 macOS/Linux/WSL2 matrix를 검증한다. WSL2에서
  G1~G3 smoke 검증(UDS는 WSL2에서 동작 — 검증과
  문서가 작업의 전부) + 지원 매트릭스 명시(macOS/Linux/WSL2; native Windows는
  "contributions welcome" good first issue — named pipe 전환 지점이 코드 주석에
  이미 표시돼 있어 기여 진입이 쉽다). 수동 smoke만으로 합격하지 않고 CI suite, setup
  command, timeout, expected state transition, failure injection과 진단 artifact를 남긴다.
  현재 계약은 WSL2 검증을 공개 전 gate로 유지한다. 다만 실제 release 준비 또는 관련 구현
  착수 시 사용자의 일정·배포 목적·검증 비용과 macOS/Linux 우선 공개의 영향을 다시 설명하고
  사용자와 포함 여부를 재검토한다. 명시적 변경 승인이 없으면 G4를 생략하지 않는다.
- **G5 공개 위생**: shared repository assets와 personal/local artifacts를 분류한다.
  `AGENTS.md`, shared `.agents/` skill, `scripts/`, guide와 공개하기로 한 log/report는 제품과
  workflow 일부이므로 blanket ignore하지 않는다. `.claude/settings.local.*`, 개인 `.codex`
  state, runtime output, credential, local transcript처럼 실제 local/sensitive artifact만
  `.gitignore`에 넣는다. 이어서 한국어 작업 문서(`docs/`·`history/`·`plan/`·
  `prd/`) 공개 범위 결정 + 커밋 author 개인 Gmail 공개 여부 결정(history rewrite는
  공개 전이 마지막 기회) + LICENSE(Apache-2.0 검토; 현 package.json "ISC"와 불일치)
  - README 영문 재작성("무엇/왜" 선두 + 30초 데모 GIF) + §0.1 외부 표현 조정 +
    Claude TUI 방식의 billing classification을 공개 준비 시점의 vendor policy와 실제 usage로 검증
  - **CI**(GitHub Actions: typecheck+test, PR 게이트 — organization/PR 리뷰 목표의
    전제. 테스트 52파일과 기존 script를 활용한다.)
  - **커뮤니티 최소본**: CONTRIBUTING.md·이슈 템플릿·SECURITY.md(신고 채널) —
    공개 순간의 기여와 보안 신고를 받을 수 있어야 하며 good first issue 전략의 전제다.
    주의: author 변경으로 history rewrite를 하면 내부 문서의 커밋 해시 참조(예:
    `1b26d9b`)가 깨진다 — rewrite 결정 시 참조 갱신을 같이 한다.
- **G6 npm 패키징**: `files: ["dist"]`, `prepublishOnly`, `npm pack`→clean temp install→
  CLI smoke를 CI에서 검증한다. G0에서 정한 package name을 publish 직전에 재확인하고,
  선점 시 승인된 scope 대안을 쓴다. 배포 형태는 **1차 npm**이다. `better-sqlite3`는 native
  addon이므로 지원 Node/OS matrix에서 prebuilt 설치 여부를 clean-host로 검증하고, fallback
  build가 필요한 조합은 지원 제외 또는 prerequisite를 명시한다. "사용자 컴파일이 절대
  필요 없다"고 약속하지 않는다. curl/standalone 단일 바이너리는 Phase 2+ 후속이다.
  초기 버전은 **0.x를 권고**한다. 1.0.0은 안정 계약 신호이므로 현 package.json
  `1.0.0`의 하향 여부를 G0에서 결정한다.

### 11.2 Phase

```
Phase 0 (게이트 달성)   G0 → G1·G3 병행 → G2 → G5·G6 → G4(final RC)
─── npm publish + GitHub 공개 ──────────────────────────────────
Phase 1 (채택기)        데모 자산·doctor 첨부 가이드(이슈 템플릿은 G5로 이동) ·
                        transcript 표면(정식 command는 G0에서 고정) ·
                        vendor가 제공하는 token/cost usage 관측 ·
                        사람이 pending/blocked delivery를 approve/cancel/retry하는 표면 ·
                        토론 결과를 명시적 승인 후 artifact로 정제하는 action ·
                        재전송 정책 튜닝(횟수/백오프/dead-letter — 기본 ack/
                        재전송은 G1에서 완결) · spike 결과의 Tier 2 상향 반영
                        (G1에서 미채택 시)
Phase 2 (확장기)        [선행] ingress 일반화(§13.2 축 B) + state.ts 분해(축 A)
                        + **pair→N-agent route 일반화(축 C: pair slot이
                        a=codex/b=claude 고정이라 3번째 vendor가 pair에 들어갈 수
                        없고, dispatch 경로가 pair 전제라 축 C 없이는 Gemini도
                        compose도 막힌다)**
                        → 3번째 vendor(Gemini 권고) · compose.yaml v1(apm 검토
                        선행) · 설정 2분할+onboarding · view driver 추가(wt/
                        iterm2) · durable store+mailbox replay · native
                        Windows(커뮤니티)
Phase 3 (원격기)        L2 모바일(remote MCP 노출) → L1 사내망 federation
                        → L3 Google A2A bridge (§8 권고 순서)
```

Human-in-the-loop와 artifact distillation은 자동 의미 판단이나 무단 파일 수정을 뜻하지 않는다.
daemon은 pending/blocked 상태와 후보 action을 보여주고, 사람 또는 권한 있는 agent의 explicit
approval 뒤에만 cancel/retry/write를 실행한다. cost/token visibility는 vendor가 제공한 usage를
출처와 함께 표시하며 추정값을 실제 billing으로 표현하지 않는다.

근거: 공개 직후는 기능보다 **채택 마찰 제거**가 스타 곡선을 결정. cross-vendor
완성(3번째 vendor)은 구조 선행 과제(§13.2)가 있어 Phase 2. 원격은 envelope의
transport-독립 후가 자연스러움(§8 additive 원칙).

### 11.3 Gate evidence contract

Gate는 문장상 "완료"가 아니라 재현 가능한 evidence로 통과한다.

| Gate | Required evidence                                                                                                                                                                                                                                                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G0   | versioned schema/example validation, CLI/config/package decision record, support matrix                                                                                                                                                                                                                                                       |
| G1   | canonical schema + typed tool/instruction fixture sync, Codex ingress TUI/wake-up/correlation/failure-mode spike, Codex↔Claude 양방향 automated integration, pre-acceptance retry + Tier 3 post-acceptance no-auto-retry + daemon idempotency, offline queue flush, stale runtime, active-turn collision, auth/reserved-intent negative tests |
| G2   | tmux installed path와 no-tmux two-terminal fallback의 clean-user smoke, README 명령 일치                                                                                                                                                                                                                                                      |
| G3   | ECONNRESET/client crash 격리, fatal handler exit, SIGTERM child cleanup, bounded body/queue, log redaction, doctor failure diagnosis tests                                                                                                                                                                                                    |
| G5   | secret/PII/path scan, tracked-vs-local file review, LICENSE/README/SECURITY/CONTRIBUTING/issue template 존재와 link check                                                                                                                                                                                                                     |
| G6   | `npm pack`, tarball content assertion, clean temp install, executable/version/help/start-stop smoke                                                                                                                                                                                                                                           |
| G4   | G0~G6을 포함한 동일 immutable candidate의 macOS/Linux/WSL2 CI 또는 기록된 clean-host run과 retained diagnostics                                                                                                                                                                                                                               |

각 test는 setup command, supported runtime version, timeout, expected state transition과 failure
artifact 위치를 명시한다. 수동 GIF는 adoption asset이지 gate evidence 대체물이 아니다.

## 12. 공개 전 수정 대상 결함 — 단계 매핑 (2026-06-11 점검)

이 절은 2026-06-11 source 기준 current gap snapshot이다. 항목을 수정하면 code/test evidence와
함께 상태를 갱신하거나 제거한다. 확인 당시 repository에 committed secret, `shell:true`,
비매개변수 SQL은 발견되지 않았지만 이는 아래 runtime trust gap을 상쇄하지 않는다.

### 12.1 P1 — 보안 (공개 전 부끄러운 것)

| ID   | 심각도 | 결함                                                                                                                                                      | 위치                                                                                     | 처리 단계                                        |
| ---- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------ |
| P1-1 | High   | Claude channel HTTP `/send` 무인증 — 같은 머신의 다른 process가 실행 중 Claude 세션에 프롬프트를 주입할 수 있고 daemon push도 자격증명을 제시하지 않는다. | `src/adapters/claude/channel-server.ts:437-463`, `src/adapters/claude/injector.ts:43-48` | **G1 security baseline**                         |
| P1-2 | Medium | Codex 토큰이 argv에 inline config로 노출된다. OS/process 설정에 따라 다른 local user가 읽을 수 있다.                                                      | `src/adapters/codex/launcher.ts:46,103,116-119`                                          | **G1 security baseline** (env 또는 0600 file/FD) |
| P1-3 | Medium | Claude→daemon ingress token 검증이 없어 agent name만으로 사칭 가능하다.                                                                                   | `src/daemon/state.ts:974-1042` (대조: `:1711-1759`)                                      | **G1 security baseline**                         |
| P1-4 | Medium | shared repo asset와 personal/local artifact 분류가 확정되지 않아 공개 범위와 `git add .` 위험이 불명확하다.                                               | `.gitignore`, `AGENTS.md`, `.agents/`, `logs/`, `docs/`                                  | **G5** (§11 분류 원칙 적용)                      |
| P1-5 | Medium | runtime directory/socket 권한이 umask에 의존한다. socket은 daemon 전권 RPC 경계이므로 0700/0600을 명시해야 한다.                                          | `src/config/paths.ts:100`, `src/daemon/socket-transport.ts:432-440`                      | **G1 security baseline**                         |
| P1-6 | Low    | token 등록 비교가 non-constant-time `!==`다.                                                                                                              | `src/daemon/state.ts:928,1046`                                                           | **G1 security baseline** (`timingSafeEqual`)     |
| P1-7 | Low    | rollback에서 `claudePendingTokens`를 삭제하지 않아 pending token이 남는다.                                                                                | `src/daemon/state.ts:832-866`                                                            | **G1 security baseline**                         |
| P1-8 | Low    | git 커밋 author 개인 Gmail + 추적 문서 일부에 실경로                                                                                                      | git history, `docs/`·`history/` 일부                                                     | **G5** (절차 — 공개 범위 결정)                   |

### 12.2 P2 — 동작 신뢰성

| ID    | 심각도 | 결함                                                                                                                                                                                                                                                           | 위치                                                                                      | 처리 단계                                                                  |
| ----- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| P2-1  | High   | `stop`/SIGTERM이 codex app-server 자식을 고아로 방치 — CLI 도움말("daemon-owned child processes")과 불일치. 종료 사다리(`app-server.ts:187-219`)가 있는데 미사용                                                                                               | `src/daemon/state.ts:1176-1189`, `src/daemon/run.ts:47-61`, 도움말 `src/cli/parse.ts:194` | **G3**                                                                     |
| P2-2  | High   | 서버측 소켓 `'error'` 리스너 부재 — client 비정상 종료가 daemon 전체 crash로 번질 수 있다. expected connection error는 국소 처리하고, 진짜 uncaught fatal은 log 후 종료해야 한다.                                                                              | `src/daemon/socket-transport.ts:60-82`                                                    | **G3**                                                                     |
| P2-3  | High   | codex runtime 실패 감지 production 미배선 — `onRuntimeFailed` 콜백을 `defaultAttachCodexRuntime`이 전달 안 함. app-server 죽어도 영원히 "connected"                                                                                                            | `src/daemon/state.ts:884,2024-2042`, `src/adapters/codex/runtime.ts:361`                  | **G1**                                                                     |
| P2-4  | Medium | "queued" delivery 소비 코드 없음 — channel 등록 시 flush 없음, `recoverAfterRestart` 호출처 0. 등록 전 메시지 영구 미배달                                                                                                                                      | `src/daemon/state.ts:1292-1307`, `src/store/repositories/deliveries.ts:148-158`           | **G1** (mailbox 약속의 실체)                                               |
| P2-5  | Medium | stale "connected"가 재attach 차단 — SIGKILL 후 해소 수단이 daemon 재시작뿐. liveness 부재                                                                                                                                                                      | `src/store/repositories/agents.ts:69-77`                                                  | **G1**                                                                     |
| P2-6  | Medium | 동시 dispatch 직렬화 부재(의심 — 재현 필요) — 같은 대상 2 메시지의 resolve→inject→rebind 인터리브 가능                                                                                                                                                         | `src/daemon/socket-transport.ts:76`, `src/daemon/state.ts:1396-1568,631-693`              | **G1** (검증 항목)                                                         |
| P2-7  | Low    | socket dispatch가 own-property 확인 없이 prototype chain의 inherited function을 호출할 수 있어 unknown method가 성공 응답이나 예상 밖 동작으로 처리될 수 있다.                                                                                                 | `src/daemon/socket-transport.ts:183-201`                                                  | **G3** (`Object.hasOwn` 가드)                                              |
| P2-8  | Low    | 무한 버퍼 — proxy `queuedClientFrames` 무제한, `readJson` body 크기 무제한                                                                                                                                                                                     | `src/adapters/codex/proxy.ts:72-91`, `src/adapters/claude/channel-server.ts:619-626`      | **G3**                                                                     |
| P2-9  | Low    | fire-and-forget rollback rejection 미관찰                                                                                                                                                                                                                      | `src/cli/invocation.ts:527,556`                                                           | **G3**                                                                     |
| P2-10 | Low    | daemon ID 재시작마다 `daemon-1` — file DB 전환 시 PK 충돌 지뢰. claude reply idempotency 부재                                                                                                                                                                  | `src/daemon/run.ts:16-22`, `src/daemon/state.ts:1012`                                     | **Phase 2** (durable store 선행 항목)                                      |
| P2-11 | Low    | 죽은 코드 — `router.ts` 테스트 전용, `recoverAfterRestart` 무호출, supervisor noop. grep 기반 탐색(agent)을 오도                                                                                                                                               | `src/adapters/router.ts` 등                                                               | **G5** (삭제 또는 SCAFFOLD 마커)                                           |
| P2-12 | High   | Codex CLI가 `app-server --listen ws://127.0.0.1:0`을 accepted value로 제공하지만 upstream 공식 문서는 WebSocket transport를 experimental/unsupported로 명시한다. 현재 attach 핵심 경로가 비지원 안정성 계약에 의존하므로 CLI update가 attach를 깨뜨릴 수 있다. | `src/adapters/codex/launcher.ts:45`, `src/adapters/codex/runtime.ts:324-349`              | **G0/G1** (지원 version pin/preflight + supported transport/fallback 결정) |

## 13. 조사 판정·발견 모음

이 절은 왜 roadmap이 그렇게 배치됐는지 설명하는 비규범 rationale다. 외부 상태에 기대는
항목은 `Verified`, `Observed`, `Hypothesis`로 구분한다. Hypothesis는 해당 gate/phase에서
재검증하기 전까지 제품 약속이 아니다. 외부 도구와 시장 상태에 관한 evidence는 별도 날짜가
없으면 2026-06-11에 마지막으로 확인한 것이며, 실제 착수 또는 공개 전에 다시 검증한다.

### 13.1 기쁜 발견 (구현을 앞당기는 사실들)

1. **Verified: Codex structured ingress surface 존재** — 공식 app-server 문서에서
   `thread/inject_items`, `turn/steer`, turn lifecycle event와 token usage event를 확인했다.
   실제 TUI 동작, deliveryId binding과 Tier 2 적합성은 spike 전까지 미확정이다.
2. **Hypothesis: L2 모바일→로컬 경로** — connector + secure tunnel로 도달할 수 있다는
   가설이며 client 지원/auth/lifecycle 검증이 필요하다(§8).
3. **Hypothesis: Claude billing classification** — TUI launch 방식의 billing pool은 실제
   account usage 측정 전에는 경제성 우위로 주장하지 않는다.
4. **Observed: terminal environment hint** — `$TERM_PROGRAM`/`$TMUX`/`$WT_SESSION`은
   onboarding default 제안에 쓸 수 있지만 terminal control capability 자체를 보장하지 않는다.
5. **Observed: 기존 코드의 공개 강점** — profile namespace(dev/build/release 격리), stale socket
   connect-probe 복구, child_process 위생(shell:true 0), SQL 전면 parameterized,
   토큰 sha256 fingerprint 로깅 규율, loopback endpoint 이중 검증, Windows 전환 지점 의도
   주석, 테스트 52파일 src 미러. 구조적으로는 Result discriminated union이 실패 상태를
   문서화하고, repository가 SQL을 격리하며, options 기반 DI가 runtime/repository/clock/id를
   테스트에서 교체 가능하게 한다. 이는 리팩터링 때 제거할 우연한 구현이 아니라 유지해야 할
   architecture asset이다. 공개 시 README/문서에는 재현 가능한 test/command와 함께 제시한다.

### 13.2 아키텍처 부채 3축 (Phase 2 vendor 확장 전 선행)

- **축 A — `state.ts` god factory**: `createDaemonState` 510→1921행(~1,400줄 단일
  클로저 팩토리), 파일 2,218줄 = src 11,236줄의 ~20%. use-case별 파일 분해 필요 —
  vendor가 늘기 전이 싸다.
- **축 B — vendor 비대칭**: DaemonState 20개 메서드 중 8개가 vendor명 박힌 쌍
  (register/receive/disconnect/reply × Claude/Codex). **새 vendor 1개 = 코어 +4~5
  메서드 + api.ts 미러 + socket 배선 + CLI.** egress는 `AgentAdapter.inject()` 단일
  추상화인데 ingress는 vendor 분기 — 두 철학 공존. `contract.ts` FailureReason에
  `codex_*`/`claude_*` 누수. envelope 렌더 분열(Claude=adapter, Codex=daemon
  state.ts:1699). 처방: ingress port 일반화(register/receive/disconnect를
  kind-parametric 단일 계약으로). 착수 plan은 dispatch뿐 아니라 ingress 등록·수신·해제를
  같은 adapter port 범위에 포함해야 한다(권위는 본 spec §5).
- **축 C — pair 2-agent 강결합**: `agents.pair_slot`(a/b) schema + `dispatchToPairPeers`.
  N-agent route 일반화와 compose의 장벽.
- 패턴 판정: 새 패턴 불요 — 이미 hexagonal 절반(repositories·AgentAdapter·Result
  타입·DI by options). **이미 선택한 패턴의 완주**가 처방.

### 13.3 DX 처방 (사람·agent의 파악·구현·수정·디버깅 비용)

- **최대 발견: daemon이 침묵** — src 전체 `console.*` 0건, 로그 파일 없음. 관측
  표면이 events 테이블(`:memory:` — 사망 시 소실)과 RPC status뿐. 처방(G3): 구조화
  로거(JSONL) + `aiox logs`. 역으로 로깅 규율(토큰 fingerprint)과 events 어휘가
  이미 있어 백지 설계 가능.
- transcript tail command(정식 이름은 G0에서 고정, Phase 1) — DX 도구인 동시에 §0.2 presentation의 제품화
  (human-facing transcript 표면, open-core 1순위 후보)의 씨앗. DX 투자 = 제품 투자.
- ARCHITECTURE.md 1장(Phase 1): 계층 지도 + "Claude 한 마디가 Codex TUI에 뜨기까지"
  시퀀스 1개 + 기능별 시작 파일 표. 흐름 추적 실측: 관여 파일 6+개, state.ts 내
  함수 ~5개 — 다이어그램 1장의 가치 큼.
- 타입 우선 탐색 유지: `DaemonState` 인터페이스(~480줄 타입 정의)를 별도 파일로
  분리하면 agent가 2,218줄을 읽지 않고 표면 파악 가능.
- 죽은 코드 정리(G5)와 도움말-동작 불일치 수정(G3) — agent는 grep과 도움말을
  믿으므로 사람보다 세게 오도된다.

### 13.4 Vendor 확장 지침 (착수 시점의 작업자에게)

vendor별 표면 조사는 deferred다. 착수 시 염두:

1. **그릇 먼저** — 13.2 축 B 선행 없이 vendor 추가 금지(코어 복붙 반복).
2. **조사는 §5 4-slot을 템플릿으로** — launch/ingress/egress/identity 4질문의 답과
   auth/ack/degradation test가 곧 tier 판정이다.
3. **tier를 정직하게** — prompt_only로 시작하는 vendor도 받되 typed degradation으로
   표시. "지원 수" 부풀리기는 신뢰 손실.
4. **vendor CLI는 한 버전 만에 변한다** — Codex inject_items가 실례. adapter에 버전
   감지/preflight(선례: `src/adapters/claude/preflight.ts`).
5. **native 지원은 외부 조건** — 관련 upstream issue의 open/closed 상태와 공식 API를
   착수 시 다시 확인하고, 지원 전에는 compatibility tier를 유지한다.
6. **빌링 변수** — headless/SDK/TUI 분류는 실제 vendor policy와 account usage로 검증한다.
7. **capability projection 자작 전 microsoft/apm 검토**(§6/§7 착수 조건) — aiox의
   차별점은 구성 재현이 아니라 topology 선언.

### 13.5 External precedents and their limited implication

- [Google A2A](https://github.com/a2aproject/A2A): public protocol과 이름 충돌을 피하기 위한
  positioning 참고다. aiox가 호환된다는 뜻은 아니다.
- [Microsoft APM](https://github.com/microsoft/apm): agent package/manifest와 capability
  projection 선행 사례다. compose 착수 전 schema overlap과 interop 가능성을 검토하되,
  aiox topology 계약을 그대로 대체한다고 가정하지 않는다.
- [kanbots](https://github.com/leodavinci1/kanbots): CLI distribution과 OS onboarding
  비교 대상이다. protocol/architecture 근거로 사용하지 않는다.
- [shadcn-ui proxy PR #10453](https://github.com/shadcn-ui/ui/pull/10453): project config와
  proxy/onboarding UX 참고 후보다. merge/status와 실제 동작을 재확인한 뒤 적용한다.
- [OpenAI Codex app-server](https://developers.openai.com/codex/app-server/): Codex adapter
  method/schema의 primary reference다. adapter는 지원 CLI version을 preflight한다.

### 13.6 Product boundary and competitive rationale

이 절은 현재 product rationale이며 독점 시장이나 경쟁 부재를 주장하지 않는다. 외부 시장
상태는 공개 준비 시 다시 조사한다.

- **Observed adjacent category:** vendor-native agent team/subagent 기능은 한 vendor 안의 협업을
  빠르게 흡수하고, Google A2A는 remote/enterprise interoperability를, package/config 도구는
  agent 구성 재현을 다룬다. 이들은 aiox의 설계 참고 또는 연동 대상이지 같은 문제를 그대로
  푸는 것으로 가정하지 않는다.
- **Hypothesis: defensible initial boundary:** aiox의 초기 차별점은 사용자가 이미 쓰는 서로 다른
  vendor의 장기 실행 CLI/TUI agent를 local control plane 아래에서 연결하면서 vendor별
  session·ingress·egress 차이를 adapter로 흡수하는 것이다. 한 vendor가 경쟁 vendor runtime까지
  동등하게 지원할 유인은 제한적이라는 가설이 이 경계를 뒷받침하지만, 실제 사용자 수요와
  경쟁 제품은 공개 시점에 다시 조사한다.
- **Product consequence:** compose의 중심은 범용 package manager가 아니라 route/topology와
  per-agent capability projection이고, federation의 중심은 새 public standard 경쟁이 아니라
  local protocol 의미를 유지한 bridge/transport 확장이다.

### 13.7 Adoption and commercial hypotheses

아래는 Exploratory이며 release commitment, 수익 예측 또는 개인 작업 우선순위가 아니다.

- near-term product success는 직접 매출보다 재현 가능한 cross-vendor demo, 실제 사용자 채택,
  issue/adapter contribution과 portfolio evidence로 먼저 측정한다. star 수나 sponsorship을
  보장하거나 gate로 사용하지 않는다.
- 가능한 장기 open-core 경계는 local daemon/protocol/adapter/CLI를 공개 core로 유지하고,
  team transcript, audit, policy와 organization capability governance를 별도 운영 제품으로
  발전시키는 것이다. 실제 유료 경계는 사용자 수요 검증 전 확정하지 않는다.
- §8 federation은 hosted relay/service 선택지를 보존하지만, remote security·operations·비용을
  검증하기 전에는 사업 모델이나 Phase 3 구현을 정당화하지 않는다.
- transcript, token/cost visibility, human approval과 artifact distillation은 수익 기능 이전에
  local developer에게 독립적인 제품 가치를 증명해야 한다.
