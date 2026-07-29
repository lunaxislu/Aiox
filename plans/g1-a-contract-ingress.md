# G1-A Contract And Ingress

## Objective

G1-A는 Phase 0의 local stable A2A round trip을 시작하기 전에 contract와 ingress
경계를 고정하는 실행 plan이다. G1-A는 accepted G1-B canonical-envelope/public-ID 결과와
accepted G1-C process-lifetime Tier 3 reliability 결과를 소비·정합화하며, 그 결과를
직접 구현한 owner가 아니다.

## Completion condition

- G0 release identity와 support matrix가 G1-A 검증 범위를 제한할 만큼 충분한지 확인됐거나,
  부족한 항목이 G0/G1-A boundary blocker로 분리된다.
- `deliveryId` public namespace와 repository id 관계가 schema freeze 전에 결정되어 owner
  문서와 구현 checklist에 반영된다.
- typed `send`/`reply` input, validation boundary, reserved intent rejection, reply example과
  negative fixture가 accepted canonical public-contract 결과와 정합한다.
- accepted G1-B/G1-C/public-ID-factory-B 결과의 provenance가 G1-A contract·ingress evidence
  경계에 소비·정합화되고, G1-A가 해당 결과를 직접 구현했다는 claim이 없다.
- Codex structured ingress named app-server surface 검증 결과가 evidence로 분류되고, 보장하지
  못하는 wake-up, ack, correlation, dedupe는 Tier 2 claim이 아니라 degradation으로 남는다.
- G1-D trust boundary는 남은 Phase 0/release gate로, authenticated ack/`completed`는 공개 이후
  Phase 1 Tier 2로, durable replay/mailbox는 Phase 2로, federation은 Phase 3으로, ingress
  re-invocation idempotency는 G1-C의 남은 Codex·Claude 공통 implementation work로 남는다.

## Stages

- [x] Kickoff owner/prerequisite audit -> `logs/G1/2026-07-10-G1-A-contractingress-freeze.md`
- [x] Contract decision closure -> `logs/G1/2026-07-10-G1-A-contractingress-freeze.md`
- [x] Schema, typed tool and fixture sync -> `logs/G1/2026-07-18-G1-A-schema-typed-tool-fixture.md`
- [x] Codex structured ingress evidence -> `logs/G1/2026-07-18-G1-A-Codex-structured-ingress-evidence.md`
- [x] Accepted-result provenance reconciliation -> G1-A closeout -> `logs/G1/2026-07-18-G1-A-closeout-and-G1-B.md`

## Notes

- Roadmap gate intent owner: `docs/product/roadmap.md` G1-A.
- Contract owners: `docs/specs/aiox-message-lifecycle.md`, `docs/specs/aiox-open-deferred.md`,
  `docs/specs/aiox-adapter-model.md`.
- Current Codex ingress/as-built owner: `docs/architecture/local-runtime-codex-adapter.md`.
- G1-A consumes and reconciles accepted G1-B/G1-C/public-ID-factory-B results; it does not implement
  those packages. G1-D trust boundary remains the Phase 0/release gate. Tier 2 ack/`completed` is
  post-release Phase 1; durable replay/mailbox is Phase 2; federation is Phase 3; ingress
  re-invocation idempotency remains G1-C implementation work.
