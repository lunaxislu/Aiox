# G1-C/D Cross-Adapter Reliability And Local Trust Boundary

## Objective

G1-C의 Codex·Claude 공통 MCP 표면, invocation idempotency 및 delivery reliability를 닫고,
G1-D의 local credential·route authorization·runtime permission trust boundary를 release-grade
negative evidence로 검증한다.

## Completion condition

- Codex와 Claude가 공통 `send`/`reply` MCP contract, invocation replay/conflict, 그리고
  관찰 가능한 delivery 상태 의미를 제공한다.
- Claude의 pre-write failure, acceptance ambiguity, explicit rejection이 G1-C 계약에 따라
  분류되고 직접 통합 증거가 있다.
- Codex·Claude 모든 ingress/push와 runtime socket/secret surface가 G1-D의 선택된 trust model과
  negative tests를 통과한다.
- owner spec/architecture/decision과 tests가 accepted implementation을 반영하며 package closeout
  검증이 통과한다.

## Stages

- [>] Contract and credential-boundary decision/spike -> `logs/2026-08-04-G1-CD-cross-adapter-reliability-and.md`
- [ ] G1-C cross-adapter reliability implementation and evidence
- [ ] G1-D local trust-boundary implementation and negative evidence
- [ ] Owner reconciliation and release-gate closeout

## Notes

- 완료된 historical Codex Tier 3 package와 G1-B/W8 Claude reconnect corrective를 재개하거나
  재구현하지 않는다. 이 plan은 그 결과를 입력으로 소비한다.
- `send`/`reply` common contract와 Codex-only manual retransmit recovery surface는 구분한다.
  Claude가 `unconfirmed`를 만들면 recovery surface의 대칭 여부도 contract 단계에서 결정한다.
- G1-D의 credential 형태와 Codex secret delivery 방식은 구현 전에 decision/spike로 확인한다.
