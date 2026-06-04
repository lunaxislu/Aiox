# Post-MVP A2A Architecture Decisions

## Status

- Date: 2026-06-05
- Type: concept alignment -> product architecture lock
- Scope: Post-MVP P3~P7 architecture direction, not implementation
- Related:
  - `prd/post-mvp/aiox-a2a-spec.md`
  - `plan/post-mvp.plan.md`
  - `prd/post-mvp/archive/claude-opinion.md`
  - `prd/post-mvp/archive/codex-opinion.md`
  - `prd/post-mvp/archive/gemini-opinion.md`
  - `prd/post-mvp/archive/claude-codex-validation.md`
  - `prd/post-mvp/archive/codex-claude-validation.md`
  - `plan/post-mvp/envelope-metadata.plan.md`
  - `plan/post-mvp/codex-structured-metadata-spike.plan.md`

## One Line

> Superseded framing. See `Amend: Standard-Forward Product Definition`.

aiox Post-MVP는 compose.yaml 자체가 아니라, local-first Agent-to-Agent
communication runtime을 먼저 lock한다. daemon은 local control plane /
mailbox / router / state authority이고, compose는 그 protocol/runtime 위의
declarative deployment/config layer다.

## Decision Summary

1. **Product definition.** aiox는 local-first Agent-to-Agent communication
   runtime이다. 장기적으로 daemon federation을 통해 local 내부, local<->remote,
   회사 내부망, remote<->remote까지 확장 가능한 A2A protocol layer를 목표로
   한다.
2. **P3 first.** Post-MVP 첫 핵심은 envelope 단독 정리가 아니라
   `A2A protocol and message lifecycle`이다. 사용자의 실제 문제는 "답장을 해야
   하는가", "답장이 누구에게 가는가", "fan-out에서 어떤 delivery에 대한
   답인가" 같은 router/message lifecycle semantics와 연결돼 있다.
3. **P4 adapter model.** adapter는 Codex/Claude/Gemini/Ollama/App agent 등
   runtime 차이를 흡수하는 connector다. launch/attach/connect/disconnect,
   ingress, egress, identity, health, render surface를 점진적으로 갖춘다.
   adapter 4-slot은 구현 입력 모델이고, capability tier는 그 결과 등급이다.
4. **P5 compose layer.** compose.yaml은 Docker clone이 아니다. agents, routes,
   capabilities, policies, generated session instructions를 선언하는 config
   layer다. `AGENTS.md`/`CLAUDE.md` 같은 native project instruction은
   read-only base layer로 유지한다.
5. **P6a capability model.** capability isolation의 중심 개념은
   **Capability Projection Layer**다. compose/daemon이 agent별 effective grant를
   만들고, adapter가 그 grant를 native runtime별 config/plugin/MCP/skill
   projection으로 변환한다.
6. **P6b sandbox split.** capability/policy grant와 OS sandbox는 분리한다.
   capability는 "aiox가 agent에게 무엇을 주는가"이고, sandbox는
   process/filesystem/network 격리다. 초기 sandbox profile은 reserved /
   non-guarantee로 둔다.
7. **P7 federation deferred.** remote/federation 구현은 미룬다. 다만 P3/P4는
   location-ready하게 설계한다. route/envelope은 local socket 경로가 아니라
   identity/address 중심으로 확장 가능해야 한다.
8. **Current store caveat.** "daemon durable store = source of truth"는 P3 target
   authority model이다. 현재 MVP production daemon은 `:memory:` store를 사용하고,
   file-backed durable store 배선은 아직 scaffold 상태다.

## P3 Message Lifecycle Decisions

- `type`, `intent`, `reply_expected`는 분리한다.
  - `type`: 저장/시스템 분류. 기존 `messages.type`과 연결된다.
  - `intent`: 협업 의미. delegation, discussion, clarification, result,
    conclusion 같은 A2A 의미를 표현한다.
  - `reply_expected`: target 행동 신호. 특히 Codex처럼 text-push target에서
    "답해야 하는 메시지인가"를 명시한다.
- `intent`만으로 reply 여부를 추론하지 않는다.
- `type`만으로 협업 의미를 전부 표현하지 않는다.
- canonical envelope은 explicit protocol version을 운반한다
  (예: `protocol: "aiox.message.v1"`). deferred field는 v1 wire contract를
  깨지 않는 additive extension으로만 추가한다.
- canonical envelope은 vendor-neutral하다. `aiox_reply` 같은 concrete tool name은
  canonical field가 아니라 adapter render 단계에서 채운다.
- `source.kind`는 `agent | human | daemon`을 예약한다. human intervention path는
  defer한다.
- envelope은 message 단위가 아니라 **delivery 단위**로 렌더한다.
- fan-out은 `1 message = N deliveries`다.
- `messageId`는 logical group/original message id다.
- `deliveryId`는 target-specific delivery/turn correlation id다.
- Codex `clientUserMessageId` 후보는 `messageId`가 아니라 `deliveryId`다.
- reply routing default는 `source-only`다.
- P3 v1에는 `recipient_visibility` 필드를 넣지 않는다.
  - fan-out delivery envelope은 target-specific으로 렌더한다.
  - target에게 다른 recipients 목록은 기본 노출하지 않는다.
  - shared/group recipient visibility는 deferred open issue로 둔다.
  - co-recipient/shared context 정보가 필요해지면 v1 versioning 규칙에 따라
    additive extension으로 추가한다.
- envelope text는 authority가 아니라 display다.
- 진짜 authority는 daemon store + token + policy다.
- prompt text는 행동 유도다.
- `additionalContext["aiox.envelope"]`는 구조 보관/correlation 보조 spike
  후보지만 authority는 아니다.
- reply timeout은 기본적으로 hard failure cutoff가 아니라 pending 상태를
  surface하는 soft visibility threshold다.
  - ack timeout: 전달 자체 확인.
  - reply soft timeout: 오래 pending인 reply_expected delivery surface.
  - reply hard timeout: explicit policy로만 닫는 deadline. P3 v1에서는
    defer/manual 권장.

## Capability Projection Layer

agent별 capability isolation은 native host의 폴더명/config 방식이 다르기 때문에
공통 registry를 직접 agent native path로 취급하지 않는다.

모델:

1. aiox capability registry가 MCP server, tool grant, skill, generated
   instruction source를 보관한다.
2. compose/daemon이 agent별 effective grant를 resolve한다.
3. session launch 때 `.aiox/runtime/<session-id>/agents/<agent-name>/...` 같은
   per-agent runtime projection을 만든다.
4. adapter가 이 projection을 Codex/Claude/Gemini native config/plugin/MCP/skill
   surface로 컴파일한다.

Projection 원칙:

- native global config/skill folder는 기본 수정하지 않는다.
- aiox-launched session에만 runtime projection을 주입한다.
- skill projection은 symlink-first, copy fallback 후보로 둔다. Windows symlink
  제약(개발자 모드/admin 등)에서는 copy fallback이 기본 경로가 될 수 있다.
- MCP server 주입 여부는 강하게 제어할 수 있다.
- 외부 MCP 내부 tool allow/deny는 host/server 지원에 따라 degradation을 surface한다.
- aiox-owned MCP/tool surface는 daemon token/policy로 강제한다.
- skill은 tool과 다르다. skill은 instruction/assets 노출에 가깝고, 한 번 읽힌
  지식은 완전히 회수하기 어렵다. 따라서 skill isolation은 session visibility
  control로 표현하고 OS sandbox처럼 과대약속하지 않는다.

## Rejected / Deferred In This Lock

- `recipient_visibility` v1 field: 기각/defer. 지금 핵심은 reply routing과
  delivery correlation이다.
- Docker `services`/`scale`/`replica` 은유: 기각. agent는 non-fungible
  participant다.
- compose가 `AGENTS.md`/`CLAUDE.md`를 대체하거나 수정하는 모델: 기각. native
  docs는 read-only base layer다.
- global native config mutation by default: 기각. launch-scoped projection을
  기본으로 한다.
- hard reply timeout default: 기각/defer. long-running investigation/review가
  정상일 수 있다.
- federation implementation: defer. P3/P4 abstraction만 location-ready하게 둔다.

## Codex Opinion Before Claude Review

Codex 판단은 다음과 같다.

P3에서 `recipient_visibility`를 빼는 결정은 좋다. 이 개념은 group discussion UX가
구체화되기 전까지는 schema 비용이 큰데, 현재 사용자의 실제 문제는 답장 correlation과
reply routing이다. target-specific delivery envelope만으로 P3 v1의 fan-out 안전성은
충분히 확보된다.

Capability Projection Layer는 P6a의 중심 개념으로 적절하다. MCP, skills, native
tools는 host별 주입 방식이 달라서 단일 "tool 폴더"로 통합할 수 없다. 대신
common grant -> per-agent runtime projection -> adapter native compile이라는 중간
계층을 두면 Codex/Claude/Gemini 차이를 흡수하면서 launch-scoped isolation 원칙도
유지할 수 있다.

남은 위험은 외부 MCP 내부 tool allow/deny를 aiox가 항상 강제할 수 있다고 착각하는
것이다. 문서와 구현은 "aiox-owned surface는 daemon이 강제, vendor/external surface는
projection과 degradation surface"라는 경계를 계속 유지해야 한다.

## Verification / Next Step

- 본 문서는 architecture/product lock이며 코드 변경을 포함하지 않는다.
- 구현 진입 시 `.ai/tdd.md`에 따라 작은 실패 테스트부터 시작한다.
- 다음 검토: Claude에게 본 decision lock의 빠진 위험, P3/P6a scope, 용어 일관성을
  cross-check 받는다.

## Amend: Standard-Forward Product Definition

후속 사용자 대화에서 제품 정의의 1차 정체성을 더 명확히 정정했다.

기존 One Line은 "local-first Agent-to-Agent communication runtime을 먼저 lock하고,
compose는 그 위의 declarative deployment/config layer"라고 표현했다. 이 표현은
compose-first 오해를 막는 데는 유효하지만, 사용자가 만들려는 제품의 중심을
충분히 드러내지 못했다.

정정된 product framing:

- aiox는 agent 간 협업을 위한 A2A communication standard를 정의한다.
- local-first daemon/runtime은 그 standard의 첫 reference implementation이다.
- 현재 Codex/Claude 같은 non-native CLI agent는 adapter와 TUI prompt injection으로
  연결되지만, 이것은 목표 프로토콜이 아니라 compatibility layer다.
- 장기 목표는 agent runtime이 structured envelope ingestion, reply correlation,
  route/mailbox/capability/policy, presentation handling을 native로 지원하는 것이다.

따라서 `prd/post-mvp/aiox-a2a-spec.md`는 standard-forward 정의를 production spec으로
둔다. 본 history 문서는 runtime-first에서 standard-forward로 refine된 경위와 근거를
보존한다.

동시에 다음 경계는 유지한다:

- daemon/control plane이 state/policy authority를 가진다. native agent 지원은
  authority 이동이 아니라 protocol first-class support다.
- `presentation`은 core concept으로 둔다. agent ingestion, human TUI, transcript,
  audit surface별 렌더링 정책을 다룬다.
- `recipient_visibility`는 별도 개념으로 분리하고, co-recipient/group visibility는
  v1 이후로 defer한다.
- aiox-owned route/tool surface는 daemon token/policy로 강제하지만, external MCP/native
  surface는 projection과 degradation surface로 표현한다. aiox가 외부 MCP 내부 tool
  allow/deny를 항상 강제한다고 약속하지 않는다.

## Amend: Opinion/Validation Consolidation Boundary

후속 Codex/Claude cross-check에서 opinion/validation 원문을 권위 문서로 유지하지 않기로
확정했다. 원문은 `prd/post-mvp/archive/`에 보존하고, accepted decision은 다음 위치로
흡수한다.

위 `Verification / Next Step`의 Claude cross-check는 완료됐고, 그 결과를 본 amend에
흡수했다.

- `prd/post-mvp/aiox-a2a-spec.md`: 제품/protocol 설계 약속과 불변식.
- `history/58-post-mvp-a2a-architecture-decisions.history.md`: 왜 그런 결정을 했는지와
  refinement 경위.
- `plan/post-mvp.plan.md`와 `plan/post-mvp/*.plan.md`: 현재 구현 흐름, 후보 deliverable,
  spike, acceptance 후보.

`codex-claude-validation.md`에서 사용자가 원한 A2A 방향에 가장 가까운 내용은 다음처럼
정리했다.

- A2A standard identity는 spec §0·§1에 둔다.
- same daemon local, same machine multi-daemon, local-remote, company internal federation,
  remote-remote 범위는 spec §8에 둔다. 이것은 구현 순서가 아니라 표준이 깨지지 않고
  커져야 하는 범위다.
- 실제 구현 순서와 현재 위치는 plan에 둔다.
- identity/auth, authorization/policy, capability isolation, sandbox/execution isolation의
  네 축은 spec §7에 둔다. 특히 capability isolation과 OS sandbox를 혼동하지 않게 하기
  위한 모델이다.
- open adapter id, CLI/editor/app/remote worker까지 확장 가능한 runtime connector model은
  spec §5에 둔다.
- instruction precedence는 spec §6에 둔다.
- Codex `turn/start` 또는 app-server surface가 structured metadata를 native로 운반할 수
  있는지 여부는 plan spike로 추적한다.

이 amend 이후 spec은 opinion/validation 원문을 권위로 참조하지 않는다. provenance는
archive 원문 -> 본 history의 경위 기록 -> spec의 clean decision으로 한 방향으로만 흐른다.

## Amend: Consolidation Review Follow-up

후속 consolidation review에서 archive의 accepted detail 중 living docs에 약하게 흡수된
부분을 보강했다. 보강 기준은 문서 경계를 유지하는 것이다.

- Spec에는 설계 약속/불변식만 추가했다:
  - compose `project`는 logical ownership label이며 `up`/`down`은 해당 project가 만든
    desired state만 대상으로 삼는다.
  - terminal/editor 자동 배치는 core protocol이 아니라 recipe/plugin layer이고, manual
    attach가 portable baseline이다.
  - capability effective grant는 `global aiox defaults -> project compose -> agent override`
    순서로 resolve하며, deny/restriction은 보수적으로 누적한다.
  - aiox-owned route/tool surface는 deny-by-default + explicit allow를 기본값으로 한다.
  - routing graph와 capability graph는 schema에서 분리하되, enforcement 시점에는 route 없는
    send/reply capability를 daemon policy가 거부한다.
- Plan에는 sequencing과 현재 위치만 남긴다. 특히 Windows named pipe / TCP loopback 언급은
  "multi-daemon 단계 전까지 transport 차이를 막지 말라"는 실행 순서 맥락으로 유지하고,
  protocol 불변식은 spec §8을 따른다.
