---
title: A2A envelope/marker migration (Phase 2) — execution sub-plan
description: >
  payload-level protocol marker(`Intent:` prefix, `[[CONCLUDE]]`)를 envelope metadata로
  이전하는 실행 sub-plan. 비권위 execution 문서다 — A2A 결정 권위는
  prd/post-mvp/aiox-a2a-spec.md §4가 가진다. 본 문서는 §4를 구현하는 trigger·scope·
  cutover·kickoff detail만 보유한다.
status: deferred (post-MVP, unordered candidate)
implements: prd/post-mvp/aiox-a2a-spec.md §4
decided_at: 2026-05-27
owner: TBD (kickoff 시 지정)
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

## 3. 작업 범위 (예상)

> kickoff에서 확정. 아래는 출발점 스케치.

- MCP tool `inputSchema`에 `intent: z.enum([...])` 강제
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

## 4. Phase 2 진입 트리거

다음 중 하나라도 관찰되면 post-MVP를 기다리지 않고 즉시 진입한다.

- Intent label 누락률 >10%
- `[[CONCLUDE]]` 토큰이 사용자-facing 답변에 leak되어 UX 손상
- reflex 루프 재발 (instruction이 사실상 무력화)
- 그 외 protocol token leak으로 인한 사용자 피드백/incident

위 신호가 없으면 post-MVP refactoring kickoff까지 보류 유지.

## 5. Cutover 방침

- 점진 이전 X. instruction / description / schema / handler / daemon API / agent
  injection prompt 동시 변경을 **한 PR**로 묶는다.
- 변경 후 user-led smoke test 4 시나리오 재수행 (Phase 1.5와 동일 시나리오).
- 회귀 의심 시 직전 commit revert 한 번으로 복귀 가능하게 PR 분리도 단일.

## 6. Cross-link

- 결정 권위: `prd/post-mvp/aiox-a2a-spec.md` §4 (A2A protocol & message lifecycle).
- 근거·과정: `history/58-post-mvp-a2a-architecture-decisions.history.md`.
- plan index: `plan/post-mvp.plan.md` (본 sub-plan을 candidate로 등록).
- Memory: `[[aiox-deferred-decisions]]` — pointer만 보존.
- `plan/qa-tracker.md` — Phase 1.5 smoke PASS round에서 본 문서로 link (트리거 추적).
- `plan/mvp-implementation-checklist.md` — "Deferred to Post-MVP"에서 본 문서로 link.

## 7. Kickoff 체크리스트 (post-MVP 진입 시 사용)

- [ ] 본 문서 §4 트리거 재점검 (관찰된 신호 있는지)
- [ ] §3 작업 범위 확정 (제외/추가 항목 결정)
- [ ] envelope attribute schema 최종 안 (`intent`, `thread_status`, 그 외) — spec §4와 정합
- [ ] daemon 저장 schema migration 필요 여부 + 전략
- [ ] agent injection prompt 새 envelope 형식 합의
- [ ] cutover PR 책임자 / 일정 지정
- [ ] smoke test 시나리오 재사용/갱신 합의
