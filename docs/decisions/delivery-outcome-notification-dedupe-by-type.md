# Delivery outcome notification dedupe is per (original delivery, outcome type)

## Context

G1-C의 Codex Tier 3 path는 primary delivery가 명시적으로 거절될 때 daemon이 source에게
`delivery_target_rejected` outcome notification을 한 번 만든다. 이 relation
(`delivery_outcome_notifications`)은 `original_delivery_id`만을 기본키로 삼아, 같은 원
delivery에 대해 평생 outcome notification을 하나만 허용했다.

W7은 이 outcome 개념을 두 번째 kind로 확장한다: primary delivery가 `unconfirmed`가 될 때도
source에게 `delivery_unconfirmed` outcome notification을 만들어, 재전송 여부를 사용자에게
확인하도록 안내해야 한다. 그런데 Codex는 같은 원 delivery가 먼저 `unconfirmed`가 됐다가
late JSON-RPC response로 나중에 `failed`(explicit reject)로 확정되는 두 단계 흐름을 가진다.
기존 단일 컬럼 dedupe로는, 먼저 만든 `delivery_unconfirmed` notification이 이후의 서로 다른
`delivery_target_rejected` notification을 same-key로 오인해 억제해 버린다.

## Decision

Outcome notification dedupe key를 `(original_delivery_id, outcome_type)` 복합키로 바꾼다.
같은 원 delivery라도 서로 다른 `outcome_type`(`delivery_unconfirmed`, `delivery_target_rejected`)은
각각 최대 한 번씩 독립적으로 notification을 가질 수 있다. 원 delivery의 상태 전이(예:
`unconfirmed` → `failed`)는 이 dedupe 확인과 완전히 독립적으로, 항상 먼저 원자적으로
확정한다: notification 생성 성공·실패·억제 여부가 상태 전이를 막거나 되돌리지 않는다.
As-built 계약과 예외 격리 경계는 [[docs/architecture/local-runtime-routing-and-delivery]] §8.5가
소유한다.

## Alternatives

- **단일 컬럼 dedupe 유지, 신규 `delivery_unconfirmed` outcome을 추가하지 않는다.** 반려.
  사용자가 명시적으로 요구한 신규 계약(먼저 unconfirmed 안내, 나중에 reject 안내)을 만족하지
  못한다.
- **원 delivery당 outcome notification을 여전히 하나만 허용하고, 나중에 온 다른 kind의
  outcome이 기존 notification을 덮어쓴다(overwrite).** 반려. 이전에 보낸
  `delivery_unconfirmed` 안내가 source에게 이미 전달된 뒤 덮어써지면, 그 notification이
  가리켰던 과거 상태와 이후 실제 관측 결과가 어긋나 source 쪽 recovery 판단을 오도할 수 있다.
  두 outcome은 서로 다른 시점의 서로 다른 사실이므로 각각 독립된 레코드가 맞다.
- **원 delivery의 상태 전이를 notification 생성 성공에 종속시킨다(트랜잭션 하나로 묶어
  notification 실패 시 상태 전이도 되돌린다).** 반려. notification 자신의 delivery도 일반
  delivery이며 실패할 수 있다(예: source의 채널이 일시적으로 닫혀 있음). notification 실패가
  원 delivery의 사실 관계(실제로 거절됐다/unconfirmed다)를 취소할 이유가 없다. 이 결합은 daemon
  내부 상태를 outbound notification 성공 여부라는 부수적 조건에 묶는다.

## Rationale

`(original_delivery_id, outcome_type)` 복합키는 "이 원 delivery에 대해 이 kind의 outcome은
이미 알렸다"만 억제하고, 서로 다른 kind의 사실은 억제하지 않는다. 이는 실제로 서로 다른 시점에
관측된 서로 다른 사실(먼저 불확실, 나중에 확정 거절)을 정확히 반영한다.

상태 전이와 notification 생성을 분리하면, 원 delivery의 상태(daemon의 내부 authoritative
fact)는 notification pipeline의 부수 효과(source에게 알리는 별도 delivery)에 좌우되지 않는다.
notification 자신의 delivery가 실패해도 그 실패는 일반 delivery/event 관측 경로로만 드러나고,
recursive하게 또 다른 outcome을 만들지 않는다 — notification의 `intent:"notification"`이
그 자체를 outcome producer의 non-recursion guard 대상으로 표시한다.

## Trade-offs

- 같은 원 delivery에 대해 이제 최대 두 개의 서로 다른 outcome notification(각각 다른
  `deliveryId`)이 만들어질 수 있다. Source agent는 하나의 원 delivery에 대해 시간차를 두고
  최대 두 번 안내를 받을 수 있음을 전제해야 한다.
- schema가 `delivery_outcome_notifications`에 `outcome_type` 컬럼을 추가하고 단일 컬럼
  기본키를 복합키로 바꾼다. 이미 schema version 4까지 적용된 기존 file-backed DB를 위해
  migration 5가 기존 단일키 테이블을 재구성하고 유일하게 존재했던 kind(`delivery_target_rejected`)로
  backfill한다. Persistence 계약은 [[docs/specs/aiox-message-lifecycle]] §4.5가 소유한다.

## Re-evaluation

세 번째 이상의 outcome kind가 필요해지거나(queue/pre-write, expiry, missing-target,
ingress/API, manual-attempt outcome처럼 이번 slice에서 의도적으로 제외한 것들), 같은
`(original_delivery_id, outcome_type)` 조합에 대해서도 시도마다 별도 기록이 필요해지면
(현재는 여전히 kind당 최대 한 번), dedupe 범위를 다시 검토한다.

## Sources

- `logs/G1/2026-08-04-G1-CD-cross-adapter-reliability-and.md` — 2026-08-09 항목들
  (`source-visible unconfirmed outcome — decision candidate`,
  `independent review — source-visible outcome candidate`,
  `source-visible outcome implementation activated before W4`).
- `logs/packages/g1-cd-cross-adapter-reliability-trust/tasks/W7.md`.
