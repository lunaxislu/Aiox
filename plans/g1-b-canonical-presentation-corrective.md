# G1-B Codex·Claude Canonical-Presentation Corrective

## Objective

G1-B의 historical core(canonical envelope/correlation/opaque public-ID)는 이미 accepted다.
이 plan은 Codex·Claude의 target-facing canonical-presentation corrective만 다룬다. 두 adapter가
canonical envelope JSON을 각 target surface에 adapter-owned wrapper·legacy metadata 없이 전달하고,
수신 instructions와 검증이 그 표현을 정확히 설명하는지 바로잡는다. 완료되면 G1-B가 완전히 닫혀
G1-C/G1-D가 G1-B 결과를 온전히 소비할 수 있다.

## Completion condition

- Codex turn/start와 Claude host channel 경로에서 canonical envelope meaning과 field preservation이
  검증된다.
- Claude의 host-owned outer channel과 canonical JSON body가 실제 Claude TUI 증거로 검증된다.
- Codex·Claude instructions가 각 target-facing canonical presentation 및 daemon notification
  correlation을 정확히 설명한다.
- 이 검증은 host UI pixel/card parity 요구가 아니다.

## Stages

- [x] Kickoff — Codex·Claude canonical presentation corrective -> `logs/G1/2026-07-29-G1-B-canonical-presentation-corrective.md`

## Notes

- Roadmap gate intent owner: `docs/product/roadmap.md` G1-B canonical-presentation corrective
  (착수 검토/통과 조건).
- Contract/architecture owners: `docs/specs/aiox-message-lifecycle.md`,
  `docs/specs/aiox-adapter-model.md`, `docs/architecture/local-runtime-claude-adapter.md`,
  `docs/decisions/reply-permission-rather-than-obligation-fsm.md`.
- 이 plan은 G1-B historical core(canonical envelope/correlation/opaque public-ID — 이미 accepted,
  `logs/G1/2026-07-19-G1-B-canonical-envelope-cutover.md` decided)를 재구현하지 않는다. daemon
  ingress authorization·socket validation·canonical type/intent vocabulary 결정은 이 plan 범위 밖이며,
  이 corrective 종료 뒤 별도 논의한다.
