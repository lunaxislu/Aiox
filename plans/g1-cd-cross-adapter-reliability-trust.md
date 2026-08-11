# G1-C/D Cross-Adapter Reliability And Local Trust Boundary

## Objective

G1-C의 Codex·Claude 공통 MCP 표면 및 delivery reliability를 닫고,
G1-D의 Phase 0 local secret/runtime hygiene를 release-grade negative evidence로 검증하고,
ingress/push authentication과 route authorization은 Phase 1 trust-boundary hardening으로 이관한다.

## Completion condition

- Codex와 Claude가 공통 `send`/`reply` MCP contract와 관찰 가능한 delivery 상태 의미를 제공한다.
- Claude의 pre-write failure, acceptance ambiguity, explicit rejection이 G1-C 계약에 따라
  분류되고 직접 통합 증거가 있다.
- Codex secret 전달, runtime directory/socket permissions, credential cleanup이 Phase 0 hygiene
  기준과 negative tests를 통과한다. ingress/push authentication과 route authorization은 Phase 1로 이관한다.
- owner spec/architecture/decision과 tests가 accepted implementation을 반영하며 package closeout
  검증이 통과한다.

## Stages

- [x] Contract and credential-boundary decision/spike -> `logs/G1/2026-08-04-G1-CD-cross-adapter-reliability-and.md`
- [x] G1-C cross-adapter reliability implementation -> `logs/G1/2026-08-04-G1-CD-cross-adapter-reliability-and.md`
- [x] G1-C source-visible delivery-outcome implementation and negative evidence -> `logs/G1/2026-08-04-G1-CD-cross-adapter-reliability-and.md`
- [x] G1-C direct Codex/Claude CLI/TUI evidence and owner reconciliation -> `logs/G1/2026-08-04-G1-CD-cross-adapter-reliability-and.md`
- [x] G1-D minimal local secret/runtime hygiene implementation and negative evidence -> `logs/G1/2026-08-04-G1-CD-cross-adapter-reliability-and.md`
- [x] G1-D hygiene owner reconciliation and package closeout -> `logs/G1/2026-08-04-G1-CD-cross-adapter-reliability-and.md`

## Notes

- 완료된 historical Codex Tier 3 package와 G1-B/W8 Claude reconnect corrective를 재개하거나
  재구현하지 않는다. 이 plan은 그 결과를 입력으로 소비한다.
- 공통 메시징 MCP contract는 `send`/`reply`다. `aiox_retransmit_unconfirmed_delivery`는 별도 recovery
  tool이며, W5에서 Claude에도 같은 이름과 duplicate-risk confirmation contract로 대칭화한다.
- G1-D의 credential 형태와 Codex secret delivery 방식은 구현 전에 decision/spike로 확인한다.
