# G3 Daemon Stabilization

## Objective

G3는 daemon이 공개 전 release path에서 조용히 실패하거나 손상된 상태로 계속 실행되지 않도록
lifecycle, transport, diagnostics의 실패 경계를 release-grade로 고정하는 실행 plan이다. G1(A/B/C/D)이
Phase 0 범위에서 모두 closed되어 G3의 진입 조건("G1의 local A2A 경로가 daemon 안정화 검증에 사용할
만큼 충분히 재현 가능하다")이 충족되었으므로 이 plan을 시작한다.

## Completion condition

- client crash isolation, fatal handler exit(구조화된 fatal log 후 process 종료), SIGTERM/stop이
  daemon-owned runtime과 child/process resource를 정리하는 cleanup, bounded input/queue, log
  redaction이 구현·검증되고 G4에서 같은 release candidate로 재검증 가능한 doctor diagnosis test로
  남는다.
- Claude channel boot failure(예: `AIOX_CLAUDE_CHANNEL_PORT` 충돌)가 generic
  `target_runtime_unavailable`이 아니라 원인 진단 가능한 daemon behavior로 드러난다.
- daemon socket API dispatch가 unknown 또는 inherited method 이름을 실행하지 않고 typed error로
  거부한다.
- Codex·Claude 각각의 현재 연결 상태, acceptance/receipt 구분, automatic ack/`completed` 지원 여부,
  automatic retry 안전성, 수동 복구 가능 여부·경계를 read-only로 보여주는 최소 diagnostics가 구현·
  검증된다. endpoint/DTO/CLI/field 이름과 새 delivery policy는 이 gate가 필요 이상으로 미리 정하지
  않는다.
- `claude_channel_disconnected` event 신설, generic typed capability/tier-evaluator/diagnostics
  model·API, adapter registry/event boundary, durable persistence/mailbox replay, stale agent
  transition policy, local trust-boundary auth hardening(ingress/push authentication 등)은 이 plan
  범위가 아니며 Phase 1/2로 남는다.
- roadmap G3 카드와 `docs/architecture/local-runtime-gaps-and-targets.md` §13의 관련 current-gap
  항목이 이 plan의 accepted evidence로 정합화된다.

## Stages

- [x] Kickoff — G3 gap audit and diagnostics/logging design contract -> `logs/2026-08-11-G3-daemon-stabilization.md`
- [x] Fatal/expected-error boundary, redacted fatal diagnosability, SIGTERM/stop cleanup 구현·검증 -> `logs/2026-08-11-G3-daemon-stabilization.md`
- [ ] Socket method dispatch hardening 및 Claude channel boot-failure diagnosability 구현과 evidence
- [ ] Codex·Claude 최소 read-only diagnostics 표면과 runtime failure/disconnect wiring 구현과 evidence
- [ ] G3 gate evidence 정합화, owner 문서 반영과 closeout

## Notes

- 이 plan은 durable store 도입(§13 Daemon Database Durability & Recovery), stale agent transition
  policy(Phase 1), local trust-boundary auth hardening(Phase 1), `claude_channel_disconnected`
  event·adapter registry·tier-evaluator API(Phase 2)를 다루지 않는다.
- Roadmap gate intent owner: `docs/product/roadmap.md` G3.
- Architecture/spec owners: `docs/architecture/local-runtime-daemon-transport-api.md`,
  `docs/architecture/local-runtime-gaps-and-targets.md` §13,
  `docs/architecture/local-runtime-claude-adapter.md` §6.2/6.4,
  `docs/specs/aiox-capability-policy.md` §7.2, `docs/specs/aiox-adapter-model.md`.
- 이 plan의 각 Stage는 release-gate급 multi-owner 변경이므로 controlling package log 구조(package
  contract, Task Index, Verification/Closeout Contract, independent review gate)를 쓴다. 기본 방향은
  Stage 2 이후도 새 로그를 만들지 않고 같은 controlling log(`logs/2026-08-11-G3-daemon-stabilization.md`)에
  새 Work Item(W2+)으로 이어 쓰는 것이다.
