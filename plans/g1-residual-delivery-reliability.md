# G1 Residual Delivery Reliability

## Objective

G1 release gate에 남은 Codex·Claude delivery FSM 의미 대칭과 retry/failure 중 inbound reply 및 MCP/channel source 결과의 무손실·정확 귀속 증거를 검증하고, 필요한 구현·owner reconciliation을 거쳐 gate disposition을 확정한다.

## Completion condition

- 두 adapter의 pre-write failure, acceptance ambiguity, explicit rejection, accepted delivery가 동일한 G1-C 의미로 구현·검증된다.
- retry/failure와 inbound reply 또는 MCP/channel source 결과가 교차하는 경우에도 reply-right, 결과 반환, correlation이 유실되거나 잘못 귀속되지 않음이 검증된다.
- direct Codex·Claude evidence, code/tests, spec/architecture/roadmap의 current claim이 같은 disposition을 가리킨다.
- controlling package의 registry integrity와 result-consumption/closeout gate를 통과하고, roadmap G1의 해당 잔여 evidence가 정확히 reconcile된다.

## Stages

- [x] Evidence boundary and verification-contract discovery -> `logs/G1/2026-08-10-G1-residual-delivery-reliability.md`
- [x] Cross-adapter interleaving implementation and verification -> `logs/G1/2026-08-11-G1-residual-delivery-interleaving-verification.md`
- [x] Direct evidence, owner reconciliation, and G1 gate disposition -> `logs/G1/2026-08-11-G1-gate-evidence-and-owner-reconciliation.md`

## Notes

- 이 plan은 `plans/g1-cd-cross-adapter-reliability-trust.md` 및 그 decided package를 재개하거나 재구현하지 않는다. 그 결과는 입력 evidence로만 소비한다.
- source-operation invocation idempotency, Phase 1 auth/Tier 2 guarantees, durable replay는 이 plan의 범위가 아니다. 현재 roadmap G1-C의 두 residual claim만 다룬다.
