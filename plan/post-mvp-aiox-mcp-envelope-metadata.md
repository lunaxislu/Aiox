---
title: aiox MCP intent/CONCLUDE → envelope metadata 이전 (Phase 2)
description: >
  Post-MVP refactoring kickoff에서 토론·결정·작업할 항목. Phase 1.5 (instruction
  + tool description 보강, smoke PASS 2026-05-27) 이후 잔존한 protocol token
  payload 노출을 envelope metadata로 이전하기 위한 단일 출처 문서. Kickoff
  세션에서 이 문서를 일순위로 surface하고, 여기서 trigger·범위·cutover를 확정한 뒤
  실작업으로 진입.
status: deferred (post-MVP refactoring)
decided_at: 2026-05-27
owner: TBD (kickoff 시 지정)
---

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

protocol marker를 payload에서 분리해 envelope/metadata layer로 옮긴다. agent는
구조화된 input field (`intent`)로 의도를 선언하고, daemon이 envelope attribute로
운반한다. payload는 순수 본문만 보관한다.

## 3. 작업 범위 (예상)

> kickoff에서 확정. 아래는 출발점 스케치.

- MCP tool `inputSchema`에 `intent: z.enum([...])` 강제
- handler에서 `intent` → envelope attribute로 조립, payload에서 `Intent:` prefix
  제거
- `[[CONCLUDE]]` 토큰을 envelope `thread_status="concluded"` metadata로 치환,
  payload에서 토큰 제거
- daemon API + 저장 schema에 `intent`, `thread_status` 필드 추가
- agent injection prompt (`<channel ...>` envelope) 에 `intent`, `thread_status`
  attribute 노출
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

- Memory: [[aiox-deferred-decisions]] — pointer만 보존. 상세는 본 문서가 단일
  출처.
- `plan/qa-tracker.md` — Phase 1.5 smoke PASS round 항목에서 이 문서로 link
  (kickoff 트리거 추적).
- `plan/mvp-implementation-checklist.md` — "Deferred to Post-MVP" 섹션에서 이
  문서로 link.

## 7. Kickoff 체크리스트 (post-MVP 진입 시 사용)

- [ ] 본 문서 §4 트리거 재점검 (관찰된 신호 있는지)
- [ ] §3 작업 범위 확정 (제외/추가 항목 결정)
- [ ] envelope attribute schema 최종 안 (`intent`, `thread_status`, 그 외)
- [ ] daemon 저장 schema migration 필요 여부 + 전략
- [ ] agent injection prompt 새 envelope 형식 합의
- [ ] cutover PR 책임자 / 일정 지정
- [ ] smoke test 시나리오 재사용/갱신 합의
