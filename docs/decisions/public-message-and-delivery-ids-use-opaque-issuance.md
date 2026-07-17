# 공개 messageId와 deliveryId는 opaque 발급을 사용한다

## Context

canonical envelope와 source-visible acceptance result는 `messageId`와 target별
`deliveryId`를 모두 agent에게 공개한다. 그러나 기존 runtime의 공용 순번 발급기는 이 둘과
내부 agent·pair·route·event 식별자를 같은 형식으로 만든다. 공개 ID를 바꿀 때 모든 내부
식별자까지 함께 바꾸는지, delivery만 바꿀지, 두 공개 ID를 함께 다룰지의 경계가 필요했다.

공개 ID의 external contract는 [[docs/specs/aiox-message-lifecycle]] §4.1이, delivery
row와 public `deliveryId`의 한 값 binding은
[[docs/decisions/public-delivery-id-is-delivery-primary-key]]가 소유한다.

## Decision

public protocol `messageId`와 `deliveryId`에는 restart 뒤 우연한 재사용을 피하는
collision-resistant opaque 전용 발급을 쓰고, 공개되지 않는 entity ID의 발급 방식은 이
결정으로 바꾸지 않는다.

## Alternatives

- **공개 ID도 현행 순번 발급을 유지한다.** Phase 0 process lifetime 안의 유일성에는
  충분하지만, restart 뒤 같은 문자열을 우연히 재발급할 위험을 그대로 둔다.
- **deliveryId만 opaque로 바꾼다.** delivery correlation의 변경 표면은 가장 작지만,
  똑같이 agent에게 공개되는 `messageId`는 순번 형식에 남아 공개 ID 규율이 비대칭이 된다.
- **모든 entity ID를 opaque로 바꾼다.** 전역적으로 한 형태를 얻지만 public protocol과
  무관한 agent·pair·route·event ID의 fixture, 로그, 내부 호출 경로까지 cutover에 결합한다.

## Rationale

`messageId`와 `deliveryId`는 fan-out, acceptance result, retransmission과 reply
correlation을 통해 함께 관찰되는 protocol 식별자다. 둘을 같은 opaque 규율로 두면
공개 경계는 일관되게 유지하면서, delivery-only 변경보다 작은 추가 범위로 restart 뒤의
우연한 순번 재사용 위험도 줄일 수 있다.

내부 entity ID는 protocol consumer에게 공개되지 않는다. 이를 같은 cutover에 포함하면
external compatibility에 필요한 변경과 내부 정리의 blast radius가 불필요하게 결합한다.

## Trade-offs

- 공개 ID와 내부 ID가 서로 다른 발급 방식을 쓸 수 있으므로, 운영 도구와 test fixture는
  ID 문자열 모양을 의미나 정렬 기준으로 해석하지 않아야 한다.
- durable replay 자체는 이 결정으로 제공되지 않는다. Phase 2가 이미 발급된 public ID와
  그 correlation history를 보존하는 책임을 계속 가진다.

## Re-evaluation

공개 protocol이 internal entity ID를 노출하거나, Phase 2 durable replay 또는 Phase 3
federation이 다른 issuer namespace·정렬 성질·migration 체계를 요구하면 재검토한다.

## Sources

- `logs/2026-07-10-G1-A-contractingress-freeze.md` — W3 public-ID issuance 검토와
  사용자 승인 방향.
- [[docs/product/roadmap]] — G1-B cutover와 Phase 2 durable replay 경계.
