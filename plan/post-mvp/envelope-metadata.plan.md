---
title: A2A envelope/marker migration (Phase 2) — execution sub-plan
description: >
  payload-level protocol marker(`Intent:` prefix, `[[CONCLUDE]]`)를 A2A envelope/lifecycle
  metadata로 이전하는 첫 Local single-daemon A2A 실행 sub-plan. 비권위 execution 문서다 —
  A2A 결정 권위는 prd/post-mvp/aiox-a2a-spec.md §4가 가진다.
status: next kickoff candidate (post-MVP Local single-daemon A2A)
implements: prd/post-mvp/aiox-a2a-spec.md §4
decided_at: 2026-05-27
owner: TBD
rationale: history/58-post-mvp-a2a-architecture-decisions.history.md
---

> **권위 안내.** 본 문서는 비권위 execution sub-plan이다. `type`/`intent`/`reply_expected`
> 분리, protocol version, delivery 단위 렌더, messageId/deliveryId, source-only reply
> routing, recipient_visibility defer, daemon authority 등 **A2A 결정 본문은
> `prd/post-mvp/aiox-a2a-spec.md` §4가 권위**다. 여기서는 그 §4를 구현하는 실행
> detail(trigger·scope·cutover·checklist)만 다룬다 — 결정을 복제하지 않는다.

## 1. 배경

2026-05-27 aiox MCP 협업 프로토콜 Phase 1.5를 적용했다.

- agent 양쪽 instruction에 협업 규약 박음 (Language Policy, User-Requested
  Collaboration, 5 Intent label, Multi-round Discussion 유효 turn, `[[CONCLUDE]]`
  종료 규칙, good/bad 예시)
- send/reply tool description에 동일 규약 요약 (호출 직전 reminder 강화)
- user-led smoke test 4 시나리오 (단발 위임 / 다라운드 토론 / 사용자 종료
  trigger / 무호출) 모두 PASS

이 시점에 남아 있는 인지된 trade-off:

- `Intent: <label>` prefix가 payload (`content`) 안에 LLM 책임으로 박힘
- 토론 종료 시 `[[CONCLUDE]]` 토큰이 payload 안에 LLM 책임으로 박힘
- 둘 다 protocol marker가 사용자-facing answer로 새어 나갈 위험을 안고 있음
  (Phase 1.5 smoke에선 미발견)

## 2. 목적

protocol marker를 payload에서 분리해 envelope/metadata layer로 옮기는 것을 시작점으로,
`prd/post-mvp/aiox-a2a-spec.md` §4의 Local single-daemon A2A lifecycle contract를
구현한다. agent는 구조화된 input field (`type`, `intent`, `reply_expected`)로 메시지
의미와 target 행동 신호를 선언하고, daemon이 protocol version, message/delivery
correlation, reply routing metadata를 envelope attribute로 운반한다. payload는 순수 본문만
보관한다.

2026-06-05 Post-MVP A2A architecture lock에서 본 작업은 `aiox-a2a-spec.md` §4
(A2A protocol and message lifecycle)의 **첫 구현 step**으로 격상됐다. 단순 marker
이전이 아니라 §4 envelope/lifecycle 결정의 일부로 다룬다. 이 작업이 구현하는 결정
본문(type/intent/reply_expected 분리, protocol version, delivery 단위 렌더,
messageId/deliveryId, source-only routing, recipient_visibility defer, timeout =
pending threshold, daemon authority 등)은 §4에 있다 — 여기서 복제하지 않는다.

## 3. 작업 범위

### In Scope

- MCP tool `inputSchema`에 `type`, `intent`, `reply_expected`를 명시하고 역할을 분리
- handler에서 `intent` → envelope attribute로 조립, payload에서 `Intent:` prefix
  제거
- envelope에 protocol version, `messageId`, target-specific `deliveryId`,
  source/target identity, source-only reply routing metadata를 반영
- `[[CONCLUDE]]` 토큰을 envelope `thread_status="concluded"` metadata로 치환,
  payload에서 토큰 제거
- daemon API + 저장 schema에 `intent`, `thread_status` 필드 추가
- agent injection prompt (`<channel ...>` envelope)에 `type`, `intent`, `reply_expected`,
  `thread_status`, delivery correlation attribute 노출
- fan-out은 delivery 단위 rendering으로 처리하고, P3 v1에서는 `recipient_visibility`를
  추가하지 않음
- reply timeout은 hard cutoff가 아니라 pending visibility threshold로 surface
- instruction 본문에서 "Intent: prefix를 박아라" / "`[[CONCLUDE]]` 토큰을
  넣어라" 규칙 제거 — envelope이 책임진다는 문구로 교체
- 양쪽 adapter (Claude `channel-server.ts`, Codex `mcp-server.ts`) 동시 cutover
- 관련 단위/통합 테스트 + smoke fixture 갱신

### Out of Scope

- Compose schema / `compose up`.
- Adapter dispatch registry refactor.
- Same-machine multi-daemon transport 구현.
- Remote/federation delivery.
- OS/process/filesystem/network sandbox enforcement.
- `recipient_visibility` v1 field.
- Codex native structured metadata spike의 결론 반영. 단, 해당 spike 결과에 따라 본 계획의
  Codex render/inject 세부 scope는 조정할 수 있다.

## 4. Implementation Increments

TDD 원칙에 따라 각 increment는 실패 테스트 → 최소 구현 → 리팩터 순서로 진행한다.

1. **Structural pre-step: additive canonical metadata model**
   - 실패 테스트: daemon/API model이 `protocol`, `type`, `intent`, `reply_expected`,
     `messageId`, `deliveryId`, reply correlation metadata를 additive로 보존할 수 있다.
   - 구현: old payload markers와 공존 가능한 저장/API/envelope model field를 먼저 추가한다.
     이 step은 marker 제거 behavior를 바꾸지 않는 structural step으로 유지한다.
2. **Tool input/schema contract**
   - 실패 테스트: MCP send/reply input이 `type`, `intent`, `reply_expected`를 요구하고,
     payload-level `Intent:` 없이도 handler가 canonical metadata를 만든다.
   - 구현: Codex/Claude runtime MCP input schema를 동일한 canonical contract에 맞춘다.
3. **Daemon handler/storage behavior cutover**
   - 실패 테스트: daemon message/delivery 저장 결과에 `intent`, `reply_expected`,
     `thread_status` 또는 동등 metadata가 남고, payload에는 protocol marker가 없다.
   - 구현: 필요한 schema/API 확장을 추가하되 existing message/delivery semantics를 보존한다.
4. **Delivery rendering**
   - 실패 테스트: fan-out delivery가 target별 `deliveryId`를 가진 envelope로 렌더되고,
     reply instruction은 source-only routing을 가리킨다.
   - 구현: Codex/Claude injection prompt/channel rendering을 delivery metadata 기반으로 바꾼다.
5. **Conclude lifecycle**
   - 실패 테스트: `conclusion` intent 또는 equivalent input이 payload `[[CONCLUDE]]` 없이
     thread/conversation status metadata를 갱신한다.
   - 구현: 기존 `[[CONCLUDE]]` text marker 의존을 제거하고 envelope metadata로 치환한다.
6. **Instruction/tool description cutover**
   - 실패 테스트: generated instructions/tool descriptions가 "payload에 Intent prefix /
     [[CONCLUDE]]를 쓰라"는 규칙을 더 이상 포함하지 않는다.
   - 구현: agent-facing protocol guidance를 envelope metadata 책임으로 갱신한다.
7. **Smoke and regression**
   - 실패 테스트/fixture: Phase 1.5 user-led smoke 4개 시나리오를 새 envelope contract로
     재현한다.
   - 구현: unit/integration fixture를 갱신하고 old marker leakage를 regression으로 막는다.

## 5. Acceptance Criteria

- payload 저장 값과 user-facing answer에 `Intent:` prefix나 `[[CONCLUDE]]` token이 protocol
  requirement로 남지 않는다.
- `type`, `intent`, `reply_expected`가 서로 다른 역할로 저장/전달/렌더링된다.
- envelope은 explicit protocol version `aiox.message.v1`을 운반한다.
- fan-out에서는 logical `messageId`와 target-specific `deliveryId`가 구분된다.
- reply correlation은 logical message id만이 아니라 target delivery correlation을 기준으로
  parent delivery를 참조한다.
- default reply routing은 source-only로 유지된다.
- `reply_expected` delivery가 오래 pending이면 soft visibility threshold로 surface하며, hard
  failure cutoff는 explicit policy가 있을 때만 적용한다.
- Codex/Claude adapter 모두 동일한 A2A metadata contract를 사용한다.
- unsupported/degraded runtime behavior는 조용히 무시되지 않고 typed degradation 또는
  explicit fallback guidance로 surface된다.

## 6. Verification

- `pnpm test`
- `pnpm typecheck`
- 관련 unit/integration tests:
  - Codex MCP input/handler/render tests
  - Claude channel input/handler/render tests
  - daemon message/delivery metadata tests
  - fan-out delivery rendering tests
- user-led smoke 재수행:
  - 단발 위임
  - 다라운드 토론
  - 사용자 종료 trigger
  - 무호출/no-op

## 7. Legacy Early-Entry Triggers

아래 신호는 Phase 1.5 시점의 조기 진입 트리거였다. 현재는 Post-MVP Local single-daemon A2A
kickoff candidate로 승격됐으므로, 트리거 관찰 여부와 무관하게 다음 구현 후보로 유지한다.

- Intent label 누락률 >10%
- `[[CONCLUDE]]` 토큰이 사용자-facing 답변에 leak되어 UX 손상
- reflex 루프 재발 (instruction이 사실상 무력화)
- 그 외 protocol token leak으로 인한 사용자 피드백/incident

## 8. Cutover 방침

- Structural pre-step은 additive metadata model만 추가하므로 behavioral marker cutover와
  분리해 먼저 land할 수 있다.
- Behavioral marker cutover는 점진 이전 X. instruction / description / schema / handler /
  daemon API / agent injection prompt 변경을 **한 PR**로 묶는다.
- 변경 후 user-led smoke test 4 시나리오 재수행 (Phase 1.5와 동일 시나리오).
- 회귀 의심 시 behavioral cutover commit/PR revert 한 번으로 복귀 가능하게 유지한다.

## 9. Risks

- Codex text fallback은 native structured metadata가 아니므로 `reply_expected`가 있어도 행동
  보장은 아니다. `codex-structured-metadata-spike.plan.md`로 native path를 병행 확인한다.
- 저장/API/envelope model 확장은 marker migration과 lifecycle behavior cutover에 섞지 않는다.
  첫 increment의 additive structural step으로 분리해 double-source 기간을 명시적으로 관리한다.
- `thread_status` 명칭은 spec 권위어가 아니다. kickoff 때 `conclusion`/thread lifecycle
  storage naming을 코드 모델에 맞춰 확정한다.
- structural pre-step 이후 old payload marker와 new envelope metadata가 잠시 공존한다.
  이 기간에는 new metadata를 read/write 준비 상태로만 두고, authority 전환은 behavioral cutover
  PR에서 한 번에 수행한다.

## 10. Cross-link

- 결정 권위: `prd/post-mvp/aiox-a2a-spec.md` §4 (A2A protocol & message lifecycle).
- 근거·과정: `history/58-post-mvp-a2a-architecture-decisions.history.md`.
- plan index: `plan/post-mvp.plan.md` (본 sub-plan을 candidate로 등록).
- Memory: `[[aiox-deferred-decisions]]` — pointer만 보존.
- `plan/qa-tracker.md` — Phase 1.5 smoke PASS round에서 본 문서로 link (트리거 추적).
- `plan/mvp-implementation-checklist.md` — "Deferred to Post-MVP"에서 본 문서로 link.

## 11. Kickoff 체크리스트

- [ ] 본 문서 §3 작업 범위 확정 (제외/추가 항목 결정)
- [ ] envelope attribute schema 최종 안 (`type`, `intent`, `reply_expected`, delivery
      correlation, conclusion/thread status) — spec §4와 정합
- [ ] daemon 저장 schema migration 필요 여부 + 전략
- [ ] agent injection prompt 새 envelope 형식 합의
- [ ] Codex structured metadata spike를 선행/병행/후행 중 어디에 둘지 결정
- [ ] cutover PR 책임자 / 일정 지정
- [ ] smoke test 시나리오 재사용/갱신 합의
