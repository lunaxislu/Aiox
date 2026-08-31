# G2 Terminal/Compose Minimum

## Objective

G2는 공개 가능한 one-command demo를 위해 `aiox.yaml` 기반 foreground 실행과 terminal/IDE agent
view integration, Codex+Claude 2-slot 고정을 넘어서는 pair-to-N-agent route generalization을
구현하는 실행 plan이다. 파일명과 명령어 이름은 Kickoff에서 `aiox.yaml`, `aiox host`/`aiox quit`로
확정됐다.
G1(A/B/C/D)과 G3가 모두 Phase 0 범위에서 closed되어 G2의 진입 조건이 충족되었으므로 이 plan을
시작한다.

## Completion condition

- clean user가 선언적 config 파일(파일명·명령어 이름은 Kickoff에서 확정)로 선언한 다중 pair
  인스턴스를 foreground로 실행할 수 있다.
- foreground 실행 중인 agent별 interactive TUI가 지원되는 terminal/IDE의 native window, pane 또는
  integrated terminal에 자동 배치되어 여러 agent를 함께 볼 수 있다.
- pair가 Codex+Claude 2-slot 고정을 넘어 N-agent route로 동작함을 보여준다.
- README Quick Start가 실제 command surface와 일치한다.
- native Windows community path의 포함 여부와 범위가 재논의를 거쳐 확정된다(포함 또는 Phase 2로
  이관 중 하나로 닫힌다).
- roadmap G2 카드와 `docs/specs/aiox-compose-contract.md` §6의 관련 target이 이 plan의 accepted
  evidence로 정합화된다.

## Stages

- [x] Kickoff — 착수 전제와 설계 결정(state.ts decomposition 순서, pair CLI 책임 경계, config 파일명·명령어 naming과 Docker 은유 재검토, yaml 스키마 내용과 CLI read 방식, 터미널 split/view driver 레퍼런스 조사와 UI 설계) -> `logs/2026-08-17-G2-Kickoff-착수-전제와-설계-결정.md`
- [>] config 파일 v1 스키마, foreground 실행과 agent view integration 구현 -> `logs/2026-08-19-G2-Config-CLI-MCP-Foreground-구현.md`
- [ ] pair-to-N-agent route generalization 구현
- [ ] G2 gate evidence 정합화, owner 문서 반영과 closeout(native Windows 재논의 포함)

## Notes

- Kickoff 단계는 다음을 결정한다: (1) `state.ts` decomposition을 pair-to-N-agent route
  generalization의 선행 전제로 이 plan 안에서 처리할지와 그 순서, (2) pair CLI가 reservation만
  만들지 launch·attach orchestration까지 맡을지의 책임 경계, (3) config 파일명(`compose.yaml` 유지
  여부, `aiox.yaml` 등 대안 포함)과 명령어 이름(`aiox compose` 유지 여부 — 현재 이름이 Docker
  `compose`/`up`을 그대로 차용해 spec의 Docker 은유 회피 원칙과 불일치한다는 지적이 있었음)을
  재검토하고, yaml 스키마에 어떤 내용을 넣을지와 CLI가 이 파일을 어떻게 읽는지를 결정, (4) 터미널
  split과 view driver UI를 어떻게 가져갈지 결정하기 위한 GitHub repo·유사 서비스 레퍼런스 조사와
  그에 근거한 설계 결정.
- 이 plan은 config/onboarding split, third vendor support, durable store/mailbox replay,
  typed capability model, adapter registry/event-boundary 통합처럼 Phase 2로 남은 항목을 다루지
  않는다.
- Roadmap gate intent owner: `docs/product/roadmap.md` G2.
- Spec owner: `docs/specs/aiox-compose-contract.md` §6.
- Decision owner: `docs/decisions/pair-slot-generalization.md`(2-slot 고정과 N-agent 재평가 지점).
- Architecture owner: `docs/architecture/local-runtime-routing-and-delivery.md`(pair/route 구조),
  `src/daemon/state.ts`(decomposition 대상).
