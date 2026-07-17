---
topic: G1-A schema typed tool fixture sync
description: G1-A에서 확정된 typed send/reply 계약을 schema, daemon·CLI mapping, fixture와 tests에 동기화하는 실행 단계.
status: open
---

## Work Items

- [>] W1 확정된 typed send/reply 계약을 schema, daemon·CLI mapping, fixture와 tests에 동기화하고 검증한다.

## Required Context

### Return Target

- None: independent log.

### {Global}

- 이 stage는 확정된 typed send/reply의 MCP schema·instruction·description·example과 contract-level fixture를 동기화한다. daemon canonical-envelope/fan-out/reply-right/store migration, public-ID issuance, shared error-registry source 생성은 G1-B envelope cutover가 소유한다. Codex named app-server ingress evidence, automatic ack의 실제 wiring·dedupe, same-invocation recovery, retry/backoff·queued flush·stale/runtime failure는 Codex evidence stage 또는 G1-C reliability의 완료 범위다.
- Public contract owner는 docs/specs/aiox-message-lifecycle.md §4.1–§4.5다. 현재 구현은 pre-v1이므로 committed target을 as-built 사실로 취급하지 않는다.
- Agent send는 type(question|instruction), intent(5종), replyExpected, content:{text}를, reply는 inReplyToDeliveryId, intent(동일 5종), replyExpected, content:{text}를 모두 기본값 없이 요구한다. reply type은 daemon-fixed reply이며 status·notification은 daemon/adapter reserved intent로 거절한다. request mediaType은 받지 않고 envelope content.mediaType은 text/plain으로 고정한다.
- Committed target에서 canonical envelope은 target-specific delivery다. fan-out은 shared messageId와 target별 deliveryId·target을 만든다. source·target·messageId·deliveryId·createdAt은 daemon authority다. message_deliveries.id는 public deliveryId와 같은 immutable value이며 별도 delivery_id column은 만들지 않는다. Public messageId/deliveryId는 opaque·immutable·retransmission-stable이고 consumer는 형식을 파싱하지 않는다. 현재 구현이 이 target을 이미 제공한다고 주장하지 않는다.
- Contract-level fixture는 acceptance가 route-derived delivery 생성·저장의 all-or-nothing 논리 결과이며 remote receipt/work completion이 아님을 표현한다. original target만 replyExpected:true인 original delivery에 한 번 reply할 수 있고, false는 reply_not_expected, 원 target이 아닌 caller는 correlation_mismatch, 두 번째는 duplicate_reply, 원 delivery 부재는 unknown_delivery다. agent-facing idempotencyKey는 없고 adapter-owned invocation key 방향은 downstream implementation input이다.
- 검증은 typed valid/invalid/reserved input, missing required field, forbidden reply type, caller-supplied content.mediaType, legacy Intent label과 typed field 충돌, accepted/rejected logical result와 reply_not_expected·correlation_mismatch·duplicate_reply·unknown_delivery error-contract fixture를 포함한다. fan-out atomicity·reply authorization의 runtime 검증, public ID issuance·retransmission stability, shared error registry source 생성은 G1-B로 넘기며, invocation retry의 prior accepted-result recovery는 G1-C로 넘긴다.
- 실행 전 입력 owner: contract·acceptance/error는 docs/specs/aiox-message-lifecycle.md §4.1–§4.5, scope/gate는 docs/product/roadmap.md G1-A·G1-B·G1-C, deferred boundary는 docs/specs/aiox-open-deferred.md, adapter 책임은 docs/specs/aiox-adapter-model.md, current routing/store gap은 docs/architecture/local-runtime-routing-and-delivery.md 및 docs/architecture/local-runtime-gaps-and-targets.md를 확인한다. Rationale는 docs/decisions/public-delivery-id-is-delivery-primary-key.md, docs/decisions/public-message-and-delivery-ids-use-opaque-issuance.md, docs/decisions/reply-permission-rather-than-obligation-fsm.md, docs/decisions/original-delivery-narrow-reply-right.md를 따른다.

## 2026-07-18 · 2026-07-18 · schema stage execution context established

계약 결정 로그 전체를 재검토해, 이 stage가 직접 소비할 최종 contract·범위·검증 기준과 owner 입력을 Required Context {Global}에 독립적으로 복원했다.
상위 plan 및 이전 contract 로그 포인터는 실행 입력으로 두지 않았다. 최종 계약은 lifecycle/spec/decision owner를 직접 확인하고, 과거 로그는 판단 이력으로만 역참조한다.
Codex structured ingress evidence와 G1-C reliability 구현은 이 stage의 완료 조건에서 제외한다.

### 2026-07-18 01:41 · 2026-07-18 · Claude review scope correction applied

Claude 검토에서 확인된 stage 경계를 반영했다. G1-A schema stage에는 typed public surface와 contract-level fixture만 남기고, daemon/store/public-ID/error-registry 구현·검증은 G1-B, accepted-result recovery와 reliability 구현은 G1-C로 분리했다.
forged reply의 correlation_mismatch를 error-contract fixture에 추가하고, public ID·delivery binding 서술을 committed target 시제로 고쳐 current/as-built 혼동을 막았다.
