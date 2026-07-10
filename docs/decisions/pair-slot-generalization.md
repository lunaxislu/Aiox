# Pair Slot Generalization (Kind-Agnostic 2-Slot)

## Context

aiox MVP의 pair는 kind 고정 슬롯이었다: codex는 slot a, claude는 slot b. attach
시 같은 kind가 이미 점유한 슬롯은 `pair_kind_slot_occupied`로 거절했고, 그 결과
codex↔codex / claude↔claude 같은 same-vendor pair가 원천 불가능했다.

QA round(R2 이후) 도중 사용자가 codex↔codex attach를 시도해 의도된
`pair_kind_slot_occupied` 거절을 받았고, "MVP가 claude↔codex만 지원하는 것은
일반화 부족"이라 판단했다. vendor 종류와 무관한 일반 routing 모델로 격상해야 진짜
확장성이 생긴다는 의도였다. 분석 과정에서 두 plane이 동위(co-equal)임이 드러났다:
(a) pair capacity 모델(kind-slot → slot a/b)과 (b) daemon injection dispatch의
vendor-pair hardcode(`dispatchClaudeReplyToCodexChannels` /
`dispatchCodexMessageToClaudeChannels`). 한 축만 바꾸면 사용자 시나리오가 성립하지
않아(attach는 통과하나 same-vendor inject 0, 또는 inject는 generic이나 attach 거절)
half-state가 노출된다.

## Decision

pair 슬롯을 **kind-agnostic 2-slot(a/b)**으로 일반화하고, same-vendor pair를 허용한다
([[docs/architecture/local-runtime-store-and-repositories]] §2-§3). Dispatch는 target
`agent.kind` 기반 generic 경로(`dispatchToPairPeers`)로 단일화한다
([[docs/architecture/local-runtime-routing-and-delivery]] §8). Target binding 미확정 delivery는
`failed`가 아니라 `deferred`(non-terminal)로 두고 normalized reason 3종을 surface한다
([[docs/architecture/local-runtime-codex-adapter]] §7.7). Self-loop는 core+store 이중 가드로
차단한다. Pair cardinality는 정확히 2로 유지한다.

## Alternatives

- **kind-bound slot 유지(현상 유지)**: codex=a / claude=b 고정. 거절: same-vendor
  pair가 불가능해 사용자가 요청한 확장성을 제공하지 못한다. routing은 이미
  vendor-neutral이라 슬롯 모델만이 제약의 원천이었다.
- **지금 N-slot / 3-way pair 도입**: slot 이름을 `a|b`로 제한하지 않고 임의 N으로
  확장. 거절: 3-way는 group topology + product semantics 변경으로, 별도 product
  decision 사안이다. 본 결정은 필드명을 `slot`(컬럼 `pair_slot`)으로 잡아 미래 N-slot
  확장 여지만 남기고 cardinality 2를 유지했다.
- **target binding 부재를 throw(`failed`)로 처리**: message/delivery 생성 자체는
  성공이고 주입만 미확정이므로 terminal failure로 떨어뜨리면 의미가 틀린다. 거절:
  `deferred`는 나중에 가능해질 수 있는 non-terminal 상태로 `failed`와 분리한다.
- **D6 registry pattern(`adapter[kind].inject(...)`) 채택**: dispatch를 adapter
  registry lookup으로 완전 추상화. 거절(post-MVP defer): 현재 vendor 분기는 단순
  adapter dispatch가 아니라 vendor별 pre-inject orchestration(Codex: binding 확인+
  thread 선택+event 발행 / Claude: runtime 사전 체크+reason normalize)을 포함해,
  단순 lookup으로 갈음하려면 adapter interface 심층 refactor가 필요하다. acceptance
  criteria 본문(vendor-pair hardcode 제거 + target kind 기반 dispatch)은 registry
  없이도 만족했다.

## Rationale

- **제약의 원천은 슬롯 모델 + dispatch hardcode 두 곳뿐이었다.** core route는 이미
  `sourceAgentId → targetAgentId`로 vendor-neutral이었으므로, 두 plane을 동시에
  바꾸면 same-vendor가 성립하고 추가 일반화 없이 사용자 시나리오가 닫힌다.
- **deferred semantics가 same-vendor의 신규 위험을 흡수한다.** same-vendor codex pair
  에서는 target Codex의 확정 active thread 없이 "마지막 loaded thread"에 inject하면
  wrong-thread 위험이 있다. 따라서 `loadedThreadIds.at(-1)` fallback을 (same-vendor
  한정이 아니라) 모든 Codex target inject에서 disable하고, 권위 있는 binding이 없으면
  `deferred`로 둔다. fallback은 권위 관찰이 아니라 guess이기 때문이다.
- **partial-success는 vendor-neutral 개념이다.** Codex(active thread 부재)와
  Claude(channel runtime 부재)는 구조가 다르지만 외부 의미는 동일하다: 메시지는
  저장됐고 target이 지금 주입 가능한 상태가 아니다. 따라서 normalized reason 체계를
  공유한다 — `target_binding_unconfirmed` / `target_runtime_unavailable` /
  `target_adapter_not_registered`.
- **self-loop는 same-name 중복과 다른 topology 문제다.** 같은 agentId가 slot a·b를
  모두 점유하면 auto-route가 `agent→agent` echo를 만든다. domain invariant(core)와
  재시작/동시 attach/미래 API 우회 방어(store) 두 경계에서 `agent_already_attached`로
  막는다.

## Trade-offs

- **dispatch generic화 후에도 vendor-pair 가정의 hardcode가 코드 곳곳에 잔존**했다
  (envelope `source="claude"` 하드코딩, MCP surface 비대칭 등). closeout 이후 leftover
  audit으로 누적 처리했다(F1~F5 + D8 surface mini-step). 일반화는 단발 변경이 아니라
  지속 audit 대상이다.
- **deferred는 surface만 제공하고 자동 해소는 없다.** 자동 retry와 deferred 해소 시
  source push notification은 본 결정 범위 밖(post-MVP)이다. 현 MVP의 deferred 해소
  경로는 source agent의 explicit resend 또는 사용자 명시 action뿐이다.
- **migration은 자동 rollback path가 없다.** corrupt DB(backfill 후 슬롯 중복)는
  fail-fast로 daemon boot를 막고, 사용자 백업이 외부 책임이다.
- **D6 registry를 미루어 dispatch 분기 로직이 daemon에 남는다.** adapter 경계가 아직
  덜 깔끔하다.

## Re-evaluation

- 3-way / N-agent pair, dynamic slot이 product 요구로 올라올 때 — 별도 product decision
  으로 cardinality 2 가정을 다시 연다.
- deferred delivery 자동 retry / source push notification을 도입할 때.
- D6 registry refactor를 채택할 때(adapter interface에 `dispatchToTarget` + event 발행
  책임 이관). post-MVP 항목으로 등록돼 있다.
- 위 일반화·registry 축은 a2a-spec 축 C(다중 에이전트 routing)와 연결되어 재논의된다.

## Sources

- `logs/workspace-reset/packages/2026-06-19-workspace-reset-W5-history-migration.md:654-657` — deleted
  `history/45`-`history/48` Step 15 source-map rows; successor is this decision.
- `logs/workspace-reset/retained-provenance/2026-06-19-mvp-history-archive.md` §2.1, §3.2 — preserved QA/TDD and
  wrong-thread fallback provenance relevant to pair-slot generalization.
- `logs/workspace-reset/retained-provenance/2026-06-20-mvp-plan-carryover-archive.md` §1, §2 — preserved Step 15 and
  QA-002 closeout summary.
