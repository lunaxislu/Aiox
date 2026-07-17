# 공개 deliveryId는 전달 행 기본키를 사용한다

## Context

v1 protocol은 재시도, 수신 확인, 상관 답변에 쓸 target별 식별자 하나를 필요로 한다.
저장소는 이미 각 target 전달을 text 기본키를 가진 `message_deliveries` 행 하나로
표현한다. 그러나 public protocol이 이 키를 재사용할지, 별도 외부 식별자를 만들지는
정하지 않은 상태였다.

local reference runtime은 별도 설치가 필요 없는 사용을 목표로 daemon 안에서 SQLite를
사용하며, Phase 0에서는 restart replay를 약속하지 않는다. Phase 2에서 그 SQLite state를
file-backed 및 replay 가능하게 만들 수 있지만, 이는 별도의 delivery identity model을
요구하지 않는다.

결과 protocol binding은 [[docs/specs/aiox-message-lifecycle]] §4.1이 소유한다.

## Decision

v1에서 immutable `message_deliveries.id` 값을 public protocol `deliveryId`로
쓴다. 전달 건 하나는 식별자 하나를 가지며, 저장소는 별도 public `delivery_id` column을
추가하지 않는다.

## Alternatives

- **내부 delivery ID와 public delivery ID를 분리한다.** 현재는 선택하지 않는다. 이 방식은
  미래 storage 구현이 public 값을 보존하지 않고 internal primary key를 바꾸게 해 주지만,
  현재 internal re-keying이나 sharding 요구가 없는 상태에서 영구적인 1:1 mapping, 추가
  unique invariant, 추가 lookup boundary를 만든다.

## Rationale

하나의 immutable 식별자를 protocol과 저장소의 직접 correlation key로 쓴다. 이로써
재시도, 수신 확인, 답변 처리가 public id를 잘못된 delivery 행으로 해석할 가능성을
줄인다.

이 선택은 local SQLite 배포 모델과 맞는다. durable replay를 위해 in-memory SQLite를
file-backed SQLite로 전환할 때 같은 primary-key 값을 보존하면 되며, 두 번째 public
식별자가 필요하지 않다.

## Trade-offs

- 미래 storage migration은 `deliveryId`로 이미 제시한 `message_deliveries.id` 값을
  보존해야 한다.
- delivery primary-key generator와 immutability는 자유롭게 교체 가능한 storage-only
  detail이 아니라 G1 cutover의 public contract 일부가 된다.

공개 message/delivery ID의 발급 범위와 그 rationale은
[[docs/decisions/public-message-and-delivery-ids-use-opaque-issuance]]가 소유한다.

## Re-evaluation

구체적인 Phase 2 durable-replay 또는 Phase 3 federation 설계가 internal re-keying,
sharded row identity, 또는 이 값을 보존할 수 없는 external namespace를 필요로 하면
재검토한다. 이 작업은 이미 발급한 public id를 보존하거나 versioned migration을
도입해야 한다.

## Sources

- `logs/2026-07-10-G1-A-contractingress-freeze.md` — 사용자가 승인한 A안, Phase 0
  in-memory 범위, A/B trade-off 검토.
- [[docs/product/roadmap]] — Phase 0 in-memory 제한과 Phase 2 durable replay 경계.
