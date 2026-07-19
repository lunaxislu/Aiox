# G1-A Contract And Ingress

## Objective

G1-A는 Phase 0의 local stable A2A round trip을 시작하기 전에 contract와 ingress
경계를 고정하는 실행 plan이다. 완료되면 G1-B envelope cutover와 G1-C reliability가
소비할 canonical schema, typed send/reply surface, fixture sync, Codex ingress evidence와
handoff 경계가 명확해진다.

## Completion condition

- G0 release identity와 support matrix가 G1-A 검증 범위를 제한할 만큼 충분한지 확인됐거나,
  부족한 항목이 G0/G1-A boundary blocker로 분리된다.
- `deliveryId` public namespace와 repository id 관계가 schema freeze 전에 결정되어 owner
  문서와 구현 checklist에 반영된다.
- typed `send`/`reply` input, validation boundary, reserved intent rejection, reply example과
  negative fixture가 같은 public contract revision을 가리킨다.
- explicit ack surface를 message envelope이 아닌 control-plane operation으로 둘지 결정되고,
  G1-B/G1-C handoff에 필요한 최소 owner path가 닫힌다.
- Codex structured ingress named app-server surface 검증 결과가 evidence로 분류되고, 보장하지
  못하는 wake-up, ack, correlation, dedupe는 Tier 2 claim이 아니라 degradation/handoff로 남는다.
- G1-B envelope cutover owner path와 G1-C reliability/open-policy path가 분리되어 있다.

## Stages

- [x] Kickoff owner/prerequisite audit -> `logs/2026-07-10-G1-A-contractingress-freeze.md`
- [x] Contract decision closure -> `logs/2026-07-10-G1-A-contractingress-freeze.md`
- [x] Schema, typed tool and fixture sync -> `logs/2026-07-18-G1-A-schema-typed-tool-fixture.md`
- [>] Codex structured ingress evidence -> `logs/2026-07-18-G1-A-Codex-structured-ingress-evidence.md`
- [ ] G1-A closeout and G1-B/G1-C handoff -> `logs/2026-07-18-G1-A-closeout-and-G1-B.md`

## Notes

- Roadmap gate intent owner: `docs/product/roadmap.md` G1-A.
- Contract owners: `docs/specs/aiox-message-lifecycle.md`, `docs/specs/aiox-open-deferred.md`,
  `docs/specs/aiox-adapter-model.md`.
- Current Codex ingress/as-built owner: `docs/architecture/local-runtime-codex-adapter.md`.
- G1-A does not implement G1-B envelope cutover, G1-C reliability, G1-D trust boundary, or
  G3 daemon stabilization except to identify explicit handoff requirements.
