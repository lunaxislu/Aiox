---
topic: G1-A schema typed tool fixture sync
description: G1-A에서 확정된 typed send/reply 계약을 schema, daemon·CLI mapping, fixture와 tests에 동기화하는 실행 단계.
status: decided
---

## Work Items

- [x] W1 확정된 typed send/reply 계약을 schema, daemon·CLI mapping, fixture와 tests에 동기화하고 검증한다.
- [x] W2 §4.1 typed-only contract와 public Intent legacy parser/fixture/instruction/test를 함께 제거하고 daemon G1-B compatibility는 유지한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 이 stage는 확정된 typed send/reply의 MCP schema·instruction·description·example과 contract-level fixture를 동기화한다. daemon canonical-envelope/fan-out/reply-right/store migration, public-ID issuance, shared error-registry source 생성은 G1-B envelope cutover가 소유한다. Codex named app-server ingress evidence, automatic ack의 실제 wiring·dedupe, same-invocation recovery, retry/backoff·queued flush·stale/runtime failure는 Codex evidence stage 또는 G1-C reliability의 완료 범위다.
- Public contract owner는 docs/specs/aiox-message-lifecycle.md §4.1–§4.5다. 현재 구현은 pre-v1이므로 committed target을 as-built 사실로 취급하지 않는다.
- Agent send는 type(question|instruction), intent(5종), replyExpected, content:{text}를, reply는 inReplyToDeliveryId, intent(동일 5종), replyExpected, content:{text}를 모두 기본값 없이 요구한다. reply type은 daemon-fixed reply이며 status·notification은 daemon/adapter reserved intent로 거절한다. request mediaType은 받지 않고 envelope content.mediaType은 text/plain으로 고정한다.
- Committed target에서 canonical envelope은 target-specific delivery다. fan-out은 shared messageId와 target별 deliveryId·target을 만든다. source·target·messageId·deliveryId·createdAt은 daemon authority다. message_deliveries.id는 public deliveryId와 같은 immutable value이며 별도 delivery_id column은 만들지 않는다. Public messageId/deliveryId는 opaque·immutable·retransmission-stable이고 consumer는 형식을 파싱하지 않는다. 현재 구현이 이 target을 이미 제공한다고 주장하지 않는다.
- Contract-level fixture는 acceptance가 route-derived delivery 생성·저장의 all-or-nothing 논리 결과이며 remote receipt/work completion이 아님을 표현한다. original target만 replyExpected:true인 original delivery에 한 번 reply할 수 있고, false는 reply_not_expected, 원 target이 아닌 caller는 correlation_mismatch, 두 번째는 duplicate_reply, 원 delivery 부재는 unknown_delivery다. agent-facing idempotencyKey는 없고 adapter-owned invocation key 방향은 downstream implementation input이다.
- 검증은 typed valid/invalid/reserved input, missing required field, forbidden reply type, caller-supplied content.mediaType, accepted/rejected logical result와 reply_not_expected·correlation_mismatch·duplicate_reply·unknown_delivery error-contract fixture를 포함한다. fan-out atomicity·reply authorization의 runtime 검증, public ID issuance·retransmission stability, shared error registry source 생성은 G1-B로 넘기며, invocation retry의 prior accepted-result recovery는 G1-C로 넘긴다.
- 실행 전 입력 owner: contract·acceptance/error는 docs/specs/aiox-message-lifecycle.md §4.1–§4.5, scope/gate는 docs/product/roadmap.md G1-A·G1-B·G1-C, deferred boundary는 docs/specs/aiox-open-deferred.md, adapter 책임은 docs/specs/aiox-adapter-model.md, current routing/store gap은 docs/architecture/local-runtime-routing-and-delivery.md 및 docs/architecture/local-runtime-gaps-and-targets.md를 확인한다. Rationale는 docs/decisions/public-delivery-id-is-delivery-primary-key.md, docs/decisions/public-message-and-delivery-ids-use-opaque-issuance.md, docs/decisions/reply-permission-rather-than-obligation-fsm.md, docs/decisions/original-delivery-narrow-reply-right.md를 따른다.

## 2026-07-18 · 2026-07-18 · schema stage execution context established

계약 결정 로그 전체를 재검토해, 이 stage가 직접 소비할 최종 contract·범위·검증 기준과 owner 입력을 Required Context {Global}에 독립적으로 복원했다.
상위 plan 및 이전 contract 로그 포인터는 실행 입력으로 두지 않았다. 최종 계약은 lifecycle/spec/decision owner를 직접 확인하고, 과거 로그는 판단 이력으로만 역참조한다.
Codex structured ingress evidence와 G1-C reliability 구현은 이 stage의 완료 조건에서 제외한다.

### 2026-07-18 01:41 · 2026-07-18 · Claude review scope correction applied

Claude 검토에서 확인된 stage 경계를 반영했다. G1-A schema stage에는 typed public surface와 contract-level fixture만 남기고, daemon/store/public-ID/error-registry 구현·검증은 G1-B, accepted-result recovery와 reliability 구현은 G1-C로 분리했다.
forged reply의 correlation_mismatch를 error-contract fixture에 추가하고, public ID·delivery binding 서술을 committed target 시제로 고쳐 current/as-built 혼동을 막았다.

### 2026-07-18 13:01 · typed public surface and fixture checkpoint

TDD로 Codex typed send와 reply의 MCP schema·handler→daemon ingress DTO mapping을 red→green으로 추가했고, Claude channel도 같은 public surface와 호환 mapping을 동기화했다. send={type,intent,replyExpected,content:{text}}, reply={inReplyToDeliveryId,intent,replyExpected,content:{text}}이며 nested content는 strict text-only다. instructions/descriptions에서 legacy Intent label 요구를 제거했고 label이 typed intent와 충돌하는 입력은 schema가 거절한다.

daemon state는 typed content.text와 send type을 현 pre-v1 runtime에 투영하고, reply inReplyToDeliveryId는 parentMessageId/chatId로만 호환 투영한다. canonical envelope/store/public ID/reply authorization·source-only routing 및 runtime error registry는 구현하지 않았으며 G1-B handoff를 유지한다. CLI는 독립 send/reply command가 없고 mcp-codex launcher만 있어 payload mapping 변경 대상이 아니다.

tests/fixtures/aiox-message-lifecycle-contract.ts에 accepted send와 reply_not_expected·correlation_mismatch·duplicate_reply·unknown_delivery rejected logical-result fixture를 추가했다. pnpm test와 pnpm typecheck는 현재 통과했다. Claude 단독 direct Vitest에서는 sandbox loopback listen 권한 때문에 HTTP ingress bind 3건이 환경상 실패할 수 있으나, 전체 pnpm test 실행은 통과했다. 다음: typed invalid/reserved/legacy conflict fixture 범위를 보강하고 daemon/API·CLI call boundary와 full suite를 재검증한다.

### 2026-07-18 13:03 · typed fixture verification and W1 completion

추가 contract fixture로 unknown/reserved intent, reply의 forbidden type, caller mediaType 및 legacy label conflict 거절을 Codex schema에서 검증했다. Claude MCP handler도 같은 strict typed schema와 mapping assertion을 통과한다.

검증: pnpm exec vitest run tests/unit/adapters/codex-mcp-server.test.ts = 19 passed; pnpm exec vitest run tests/unit/adapters/codex-mcp-server.test.ts tests/unit/adapters/claude-channel.test.ts -t "MCP handlers" = 7 passed (48 skipped); pnpm exec vitest run tests/unit/daemon/codex-ingress.test.ts = 44 passed; pnpm typecheck 및 git diff --check 통과. 전체 pnpm test의 실패는 Unix socket/loopback HTTP bind가 sandbox에서 허용되지 않는 환경 의존 테스트들이며, 변경 범위의 assertion failure는 없었다.

W1의 G1-A 범위는 완료했다. canonical envelope·store/public ID·실제 reply authorization/source-only routing/error registry는 여전히 G1-B, recovery/retry는 G1-C handoff다.

### 2026-07-18 13:17 · Claude typed-surface review adjudication

Claude의 G1-A typed surface 검토를 독립 대조했다. 수용: Codex instruction의 Collaboration Protocol이 여전히 `aiox_reply(parent_message_id, content)`·`aiox_send_message(content)`를 안내하여 같은 문자열 안의 typed Tool Usage와 충돌한다. 이 두 줄 및 이를 고정하는 Codex unit assertion은 typed revision으로 교정해야 한다. legacy label 비교의 대소문자 정규화도 계약의 “충돌” 의미에 맞춘 저위험 수정이다.

정정: 계약이 열거한 6종 negative case는 adapter unit tests 전체에서는 확인되지만, shared fixture 파일에는 reserved·unknown·forbidden reply type·legacy conflict 4종만 있다. missing required field와 caller `content.mediaType`은 Codex/Claude unit tests에 직접 있다. 또한 이 실행 환경에서는 대상 55개 중 52개 통과, Claude HTTP ingress의 3개만 `listen EPERM: operation not permitted 127.0.0.1`로 실패해 loopback이 정상이라는 외부 리뷰의 환경 판정은 재현되지 않았다.

G1-B canonical envelope/store·reply authorization/routing은 여전히 이번 stage 범위 밖이라는 판단에는 동의한다. accepted-reply fixture·Claude reply output 대칭·schema shared module은 후속 개선 후보이며, typed public surface 정합의 선행 조건만 영향을 준다.

### 2026-07-18 13:41 · Typed-surface review fixes completed

Claude review의 수용 항목을 TDD로 반영했다. Red→Green 1: Codex MCP instruction regression test가 stale `parent_message_id`를 재현한 뒤 Collaboration Protocol의 reply/send 문구를 각각 `inReplyToDeliveryId, intent, replyExpected, content`와 `type, intent, replyExpected, content`로 교체했다. Red→Green 2: Codex와 Claude 각각에서 대문자 legacy `Intent: DELEGATION`와 typed `delegation`이 오거절되는 회귀를 재현한 뒤 비교를 `match[1].toLowerCase()`로 정규화했다. 기존 실제 conflict 거절은 Codex fixture 및 Claude typed `result`/legacy `delegation` test로 유지한다.

검증: Codex MCP unit 20/20 통과, Claude MCP handler 범위 8/8 통과, `pnpm typecheck` 및 `git diff --check` 통과. Claude HTTP ingress 3개는 이 환경의 loopback `EPERM`으로 대상 필터에서 제외했으며 이번 변경 경로와 무관하다. delegated read-only 재검토도 instruction/schema 정합과 G1-B scope overreach 부재를 확인했다.

### 2026-07-18 14:11 · Typed-only public Intent contract implemented

사용자 지시에 따라 root AGENTS.md 변경은 보류하고 W2의 §4.1·구현/검증만 subagent로 분리 수행했다. spec은 agent-authored intent의 유일 authority가 top-level `intent`이며 validator가 legacy `Intent:` 관례로 `content.text`를 파싱·정규화·거절해서는 안 된다고 정정했고 legacy-conflict negative requirement를 제거했다. adapter 두 곳의 legacy parser/superRefine와 legacy-label 금지 문구, conflict fixture/case-variant tests를 제거했다. 양 adapter에 typed `intent`와 상충하는 `Intent:` 문자열도 ordinary content.text로 수용하는 regression을 추가했다.

직접 검증: Codex MCP unit 20/20, Claude MCP handler 범위 8/8, `pnpm typecheck`, spec inline-code check, `git diff --check` 통과. Claude 전체 adapter test의 HTTP ingress 3개는 sandbox loopback `EPERM`으로 여전히 제외했다. `src/daemon/state.ts`의 parentMessageId/chatId/text compatibility projection은 이전 G1-A diff이며 이번 W2에서 수정하지 않았다; G1-B migration 경계로 유지한다.

### 2026-07-19 15:25 · legacy Intent surface removal

사용자 재검토 결과, 폐기된 `Intent:` 표기를 “일반 본문으로 수용”한다고 별도로 설명·보장하는 것 역시 typed-only 계약에 불필요하다고 판정했다. §4.1의 외부 계약에는 `intent`의 허용·거절 규칙만 남겼고, legacy label-conflict 거절 문구 및 migration/tool/test 서술 문단을 제거했다. Codex·Claude의 `Intent:` opaque-text 전용 회귀도 삭제했으며, typed schema의 정상/invalid/reserved/mediaType·forbidden reply type 검증은 유지했다. 이 판정은 과거 형식의 compatibility를 추가하지 않는 pre-v1 기본과 일치한다.

검증: 관련 adapter 범위 Vitest 9 passed (46 skipped), `pnpm typecheck`, `git diff --check` 통과.

### 2026-07-19 15:35 · Claude review adjudication: reply correlation gap

Claude read-only review를 현재 worktree와 대조했다. F4(log Required Context의 legacy-conflict)는 review snapshot 이후 2026-07-19 15:25 entry에서 이미 제거되어 현재 line 25와 충돌하지 않는다. F1은 재현된다: Codex envelope은 `message_id`, Claude envelope은 `chat_id`만 제공하지만 typed reply는 `inReplyToDeliveryId`를 요구하고 daemon은 이를 pre-v1 parent id로 투영한다. 다만 review의 “기존 id를 delivery ID로 사용” instruction은 public deliveryId가 아직 미발급이라는 spec §4.2 committed target과 explicit legacy-compatibility 금지에 충돌하므로 수용하지 않았다. G1-A typed reply surface를 유지할지, G1-B deliveryId issuance/envelope cutover를 선행할지의 계약 결정이 필요하다.

F2(content string/text fallback)는 state.ts의 기존 G1-B migration compatibility projection 경계와 맞물리므로 이번 typed-only 제거와 별개다. F3(`[[CONCLUDE]]`)는 Codex에만 남아 있으나 conclusion intent와 별개 종료 marker인지 판단 근거가 부족해 삭제하지 않았다. 사용자 결정 전 code/spec을 더 바꾸지 않는다.

### 2026-07-19 15:40 · G1-A owner-surface legacy audit passed

사용자가 현재 미운영 상태와 G1-A 목표를 명확히 했다: 이 stage는 typed surface의 owner 반영과 legacy 잔존 검토를 완료해 pass하는 것이며, 실제 deliveryId issuance·envelope 노출·reply authorization은 G1-B handoff다. 따라서 Claude review의 reply correlation gap은 G1-A blocker가 아니라 분리된 G1-B scope로 분류한다.

owner surface(docs/specs, src, typed fixture, adapter unit tests)를 다시 검사해 과거 `Intent:` 표기, Intent label, legacy/conflict label 참조가 남지 않게 했다. Codex/Claude의 negative string assertion도 과거 형식을 이름으로 보장하는 잔존물로 제거했다. 과거 형식을 언급하는 work log history는 작업 경위이므로 보존한다. 검증: 관련 adapter 범위 Vitest 8 passed (47 skipped), `pnpm typecheck`, `git diff --check` 통과; owner surface 검색 결과 legacy 참조 없음.
