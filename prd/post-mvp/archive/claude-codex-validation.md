> Archived validation record. This file is not authority.
> Accepted decisions were consolidated into `../aiox-a2a-spec.md`, with rationale in
> `../../../history/58-post-mvp-a2a-architecture-decisions.history.md`.
> Internal references may mention old paths as point-in-time conversation context.

---
@user
현재 @prd/post-mvp/codex-opinion.md 과 너의 의견을 cross validation해봐
---

Codex 의견을 정독했습니다. 진짜 cross-validation은 "둘 다 비슷하네요"가 아니라 **수렴 지점(신뢰)·분기 지점(판정)·둘 다 놓친 것(blind spot)**을 가르는 것이므로 그렇게 하겠습니다. 결론부터:

> **큰 그림은 강하게 수렴합니다 (control plane + adapter가 비대칭 흡수 + compose 전에 envelope/contract부터).** 분기는 4곳인데, 그중 **Codex가 나보다 나은 게 1개(capability tier), 내가 더 맞는 게 2개(reply 신호 설계·envelope의 vendor 누수)**, 그리고 **둘 다 놓친 구조적 함정이 5개** 있습니다.

---

## 1. 수렴 — 거의 확정해도 되는 것 (두 독립 추론이 같은 답)

서로 안 보고 같은 결론에 도달했으니 신뢰도가 높습니다. 다음은 더 논쟁하지 말고 lock하세요:

- **멘탈 모델 = local agent control plane.** Docker에서는 _UX 표면만_ 빌린다.
- **겉은 대칭(공통 contract), 안은 비대칭(vendor native).** adapter가 차이를 흡수.
- **`AGENTS.md`/`CLAUDE.md`는 대체 불가 → orchestration layer로 _위에 얹음_.** 우선순위: host policy > native md > compose session instruction > user prompt > memory.
- **`AgentKind`는 `codex|claude` 하드코딩 탈피 → string adapter id.**
- **compose.yaml은 _나중_. 그 밑의 envelope + adapter contract + IR이 _먼저_.** (이게 가장 중요한 합의)
- **터미널 자동화는 코어 금지 → recipe/plugin.** Windows는 터미널보다 **transport 추상화(named pipe/TCP)가 먼저**.
- **isolation은 "완전 격리"라 부르지 말 것.** capability visibility + daemon-side tool policy이지 OS sandbox 아님.

여기까지는 제 지난 답변과 Codex가 사실상 동일합니다.

---

## 2. 분기점과 판정

| 쟁점                                          | Codex 입장                              | 내 입장                                        | 판정                               |
| --------------------------------------------- | --------------------------------------- | ---------------------------------------------- | ---------------------------------- |
| **(a) envelope을 지금 canonical로 크게 박나** | "3대 최우선 1위. 지금 크게 설계"        | "type 추가는 작은 첫 PR"                       | **통합. 둘 다 부분 정답** ↓        |
| **(b) reply 트리거 신호**                     | `intent`(delegation/…) + `reply:{tool}` | 도메인 `type` + 명시적 `reply_expected`        | **내 쪽이 a-1에 더 직접적** ↓      |
| **(c) envelope에 tool 이름**                  | `reply: { tool: "aiox_reply" }`         | (신규 지적) vendor 누수                        | **내 지적이 맞음** ↓               |
| **(d) agent 분류 체계**                       | **capability tier 1~4**                 | driver 4슬롯(launch/inbound/outbound/identity) | **Codex가 더 나음. 직교 → 결합** ↓ |

**(a) — "먼저"는 Codex가, "작게"는 내가 맞다.** envelope은 사용자가 직렬화하는 표면은 아니지만 *모든 adapter가 의존하는 wire contract*라, 한 번 굳으면 바꾸기 비쌉니다. 그러니 **버전 필드(`protocol: "aiox.message.v1"`)와 필드 집합은 지금 신중히 확정** — 여기까진 Codex가 옳습니다. 단 "canonical envelope를 완벽하게 처음부터"는 over-engineering 위험이라 **구현은 incremental** — 여기선 제가 옳습니다. 결론: _스펙은 지금, 분량은 작게._

**(b) — Codex의 `intent`는 "source가 왜 보내나"이지 "target이 답해야 하나"가 아니다.** 사용자의 a-1 불만은 정확히 *"reply 해야 하는지를 판단 못 한다"*입니다. `intent`에서 유도(delegation→reply, result→no-reply)할 수는 있지만 **간접**입니다. 명시적 `reply_expected: boolean`이 그 신호를 _직접_ 줍니다. 게다가 — **도메인 모델엔 이미 `type`(question/instruction/status/event/reply)이 있습니다** (`schema.ts` messages.type). Codex의 envelope은 여기에 `intent`라는 *두 번째 분류축*을 새로 도입하는데, 둘의 관계를 정리 안 하면 시스템에 분류 체계가 둘 공존합니다. 정리안: **`type`=시스템/저장 레벨, `intent`=협업 프로토콜 레벨, `reply_expected`=target 행동 신호 — 셋을 역할 분리해서 envelope에 명시.**

**(c) — Codex의 작은 자기모순.** Codex는 *"core는 structured, surface는 adapter-specific"*이라고 옳게 말해놓고, canonical envelope 안에 `reply: { tool: "aiox_reply" }`라는 **특정 vendor tool 이름을 박았습니다.** "aiox_reply"는 Codex adapter 렌더 단계의 산물이지 canonical 계층의 것이 아닙니다. canonical에는 *"reply 가능 + parent_message_id"*까지만 두고, 구체적 tool 이름은 adapter가 렌더할 때 채워야 일관됩니다.

**(d) — 여기는 Codex가 분명히 낫습니다 (인정).** Codex의 **capability tier(Tier1 full_duplex_structured → Tier4 unsupported)**는 제 4슬롯보다 우월한 _추가_ 개념입니다. 둘은 충돌이 아니라 **직교**합니다: 제 4슬롯은 "adapter에 무엇을 채우나"(입력), Codex의 tier는 "그 결과 이 agent가 어느 등급의 협업이 되나"(출력)입니다. **4슬롯을 채운 결과가 tier를 결정**합니다. 그리고 Codex의 경고 *"모든 CLI를 억지로 Tier1로 취급하면 설계가 무너진다"*가 매우 정확합니다 — ollama류를 Tier3(prompt_only, reply는 best-effort)로 솔직하게 격하하는 게 제 "MCP 지원 여부로 갈림"보다 product 개념으로 더 선명합니다. **tier 모델 채택 권장.**

그리고 (분기 아님) **멘탈 모델 강조점**: Codex는 control plane을 전면에, 저는 "사설 교환대/메신저" 비유를 전면에 뒀는데 — 충돌이 아니라 **layer가 다릅니다.** 권위 모델은 control plane(스키마·엔지니어용), 사용자 설명 비유는 교환대(human-attached 본질을 "회선만 잇고 전화기는 소유 안 함"으로 선명하게). 통합하면 됩니다.

---

## 3. 둘 다 놓친 구조적 함정 (blind spots — 여기가 새 가치)

envelope을 아무리 예쁘게 만들어도 **이 5개를 안 풀면 a-1은 반만 해결됩니다.** 둘 다(Codex도 나도) 안 다뤘습니다:

1. **fan-out 다대일.** 메시지 1개 → delivery N개가 MVP의 핵심인데, envelope은 _message 단위인가 delivery 단위인가?_ fan-out 시 각 target은 "내가 이 메시지의 target 중 하나"임을 알아야 하므로 **envelope은 delivery 단위로 렌더**되어야 합니다. Codex envelope의 `target?`이 optional인데, fan-out에선 필수가 됩니다. 명시 안 되면 reviewer/researcher 동시 전송 때 깨집니다.

2. **reply 라우팅 semantics.** target이 `reply(parent_id)`로 답하면 — 원래 source에게만? fan-out 그룹 전체에? 멀티라운드 discussion에서 제3자에게 보이나? envelope/protocol을 논하면서 **"답이 어디로 가는가"를 둘 다 정의 안 했습니다.** 이건 envelope 필드가 아니라 router 정책인데, envelope 설계와 같이 못박아야 합니다.

3. **전달 ≠ 인지 ≠ 행동.** `turn/start` ack은 _모델이 읽었다는 보장이 아닙니다_ (MVP spec이 이미 경고). canonical envelope이 아무리 structured해도, turn/start로 텍스트를 밀어넣는 한 "전달됨"과 "모델이 인지하고 행동함" 사이의 gap은 **남습니다.** 즉 Codex의 envelope 제안은 _신뢰도를 높이지만 보장하지 못합니다._ 이 한계를 제품 차원에서 명시하고, "reply 안 옴"을 surface하는 경로(deferred/timeout)가 필요합니다.

4. **human도 노드인가.** 사용자가 *"터미널에서 본다"*고 했으니 사람이 한 참여자로 agent에게 직접 쏘거나 끼어들 수 있어야 할 텐데, 둘 다 agent↔agent만 봤습니다. 교환대 모델이라면 사람도 회선의 한 끝입니다 — envelope `source.kind`에 `human`이 있어야 할 수 있습니다.

5. **envelope 위조 / prompt injection.** envelope을 _텍스트로_ 주입하는 한, agent A가 자기 출력에 가짜 `<aiox-message source="admin">`을 흉내내 다른 agent를 속일 수 있습니다. **canonical envelope의 진실은 daemon이 소유**하고(token 기반), 주입된 텍스트는 *표시(display)*일 뿐 *권위(authority)*가 아니어야 합니다. 텍스트 표면의 근본 약점이라 둘 다 놓치면 위험합니다.

그리고 정직하게 — **a-1의 _진짜 구조적_ 해결 가능 여부는 미확인입니다.** Codex app-server의 `turn/start`가 turn에 *구조화 메타데이터*를 붙일 native 경로가 있는지(있으면 텍스트→tool 다리가 필요 없어짐) 저도 Codex도 확인 안 했습니다. **이건 spike가 필요한 open question**이고, 없으면 둘의 제안은 전부 "프롬프트 레벨 신뢰도 향상"에 머뭅니다.

---

## 4. 통합 권고 (Codex의 3대 우선순위 + 보강)

Codex의 "compose보다 이 3개가 먼저"라는 뼈대를 받되, 위 판정으로 보강합니다:

1. **Canonical envelope 스펙 확정** — 버전 박되, ⓐ `type`/`intent`/`reply_expected` 역할 분리(b), ⓑ vendor tool 이름 제거해 neutral 유지(c), ⓒ **delivery 단위 렌더** 명시(blind 1), ⓓ reply 라우팅 정책 동반 정의(blind 2), ⓔ daemon이 진실 소유·텍스트는 표시일 뿐(blind 5).
2. **AgentAdapter = capability provider + tier** — 내 4슬롯으로 채우고 **Codex의 tier로 분류**(d). post-mvp **P1 registry refactor와 한 step으로** 묶기.
3. **LaunchPlan/Capability IR + 3층 config 병합**, terminal은 recipe/plugin, transport 추상화 자리만.
4. **그다음에야 compose.yaml** — 위 3개의 *표면*일 뿐.
5. **병행 spike**: Codex `turn/start` 구조화 메타데이터 native 능력 (a-1의 진짜 천장이 어디인지 결정).

**한 줄 종합:** Codex와 저는 _방향이 같고_, Codex는 tier로 저를 이겼고, 저는 reply 신호 설계·envelope neutral성에서 Codex를 교정했고, **진짜 risk는 둘 다 놓친 fan-out·reply 라우팅·전달≠인지·위조 5개**입니다. envelope 스펙을 쓸 때 이 5개를 필드/정책으로 흡수하면 compose는 그 위에 자연히 얹힙니다.

---
