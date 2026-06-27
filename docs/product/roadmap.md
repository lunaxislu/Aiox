# Product Roadmap

Related:

- [[docs/product/product]]

Status: Current

이 문서는 aiox의 공개 전 release gate, 공개 이후 phase, 우선순위와 gate 통과 기준을
소유한다. 구현 checklist, 세부 task 상태와 cutover 절차는 `plans/`의 실행 plan과 code/test
evidence가 소유한다.

현재 승인된 추진 순서는 **로컬 Codex<->Claude 안정 왕복, terminal UX, daemon 안정화, 공개
위생, npm packaging과 macOS/Linux/WSL2 최종 인증을 통과한 뒤 npm publish와 GitHub 공개를
진행하고, 이후 채택기/확장기/원격기 phase를 계속 개발하는 것**이다.

`plans/release-plan.md`는 별도 roadmap 항목이 아니라 G6 npm packaging gate의 배포 시점
실행 checklist다. Roadmap은 G6의 통과 조건과 release 순서만 소유하고, tarball 내용물 확인,
clean install, CLI smoke 같은 구체 절차는 release plan과 CI evidence가 소유한다.

## Release Gates

공개 전 gate의 실행 순서는 **G0 -> G1/G3 병행 -> G2 -> G5/G6 -> G4**다. G4는 앞 gate의
변경을 모두 포함한 동일 release candidate로 인증한다.

### G0 Contract And Release Identity

Protocol, CLI, 지원 범위와 release identity를 먼저 고정한다.

- Envelope, state, error 계약을 versioned schema와 examples로 승인한다.
- Canonical CLI 이름, command surface, 구현/미구현 표면, config precedence를 결정한다.
- 지원 Node 버전, agent CLI 버전, OS matrix를 고정한다.
- npm package name, 초기 0.x version 정책, license를 결정한다.
- package name 가용성은 G0와 publish 직전에 다시 확인한다.
- Codex attach 경로처럼 upstream에서 experimental/unsupported로 표시된 표면은 version pin,
  preflight, supported fallback 여부를 G0/G1에서 명시한다.

### G1 Local Stable A2A Round Trip

한 project, 한 daemon 안에서 Codex<->Claude A2A 왕복을 안정화한다. G1은 하나의 거대
작업이 아니라 착수 시 얇은 G1 sub-plan으로 나누어 진행한다.

- **G1-A contract/ingress**: canonical schema, typed send/reply tool, instruction/description/example
  sync를 고정한다. Codex structured ingress spike는 TUI 표시, idle wake-up, active-turn 충돌,
  deliveryId 보존, timeout/process-exit/unsupported-method 실패 모드를 검증한다.
- **G1-B envelope cutover**: repository schema, deliveryId correlation, adapter render와 migration을
  canonical envelope로 전환한다.
- **G1-C reliability**: tier별 ack/retry/idempotency, queued delivery flush, target serialization,
  Codex runtime failure wiring, stale connected recovery를 완성한다.
- **G1-D trust boundary**: Claude push/ingress auth, Codex secret 전달, runtime directory/socket
  permission, token comparison, rollback cleanup을 완성한다.

네 단위를 모두 통과하기 전에는 G1이 완료된 것이 아니다. 인증되지 않은 왕복이나 단순
prompt 전달은 "안정 왕복"으로 보지 않는다.

### G2 Terminal Minimum

"한 명령 데모"를 공개 가능한 최소 UX로 만든다.

- tmux view driver 1개를 gate에 포함한다.
- tmux가 없는 환경은 2-terminal fallback을 안내한다.
- README Quick Start와 실제 command가 일치해야 한다.
- G2는 compose.yaml을 요구하지 않는다. compose와 추가 view driver는 Phase 2 범위다.
- Driver 선택은 G2에서는 flag/env 감지로 충분하며 user config 영속화는 Phase 2 onboarding으로 둔다.

### G3 Daemon Stabilization

Daemon이 조용히 깨지거나 상태를 손상시키지 않도록 공개 전 안정화한다.

- Expected socket/client error는 connection boundary에서 격리한다.
- Unhandled rejection/exception은 fatal structured log 후 종료한다.
- `stop`/SIGTERM은 daemon-owned runtime과 child process를 정리한다.
- JSONL structured logger, `aiox logs`, doctor 확장을 제공한다.
- Daemon 생존, socket 응답, channel 등록 상태를 진단할 수 있어야 한다.
- Durable store는 G3 gate가 아니다. 공개 release에서는 in-memory store와 restart 시 상태 소실을
  명시하고, durable store와 mailbox replay는 Phase 2에서 완성한다.

### G5 Public Hygiene

공개 repository로 내보낼 수 있는 범위를 정리한다.

- Shared repository assets와 personal/local/sensitive artifacts를 분류한다.
- `.claude/settings.local.*`, 개인 `.codex` state, runtime output, credential, local transcript처럼
  실제 local/sensitive artifact만 ignore한다.
- `AGENTS.md`, shared `.agents/` skill, `scripts/`, guides와 공개하기로 한 log/report는 blanket
  ignore하지 않는다.
- 한국어 작업 문서 공개 범위, commit author 공개 여부, LICENSE, README 영문화, product messaging을
  결정한다.
- GitHub Actions CI, CONTRIBUTING.md, issue template, SECURITY.md를 갖춘다.
- History rewrite를 결정하면 내부 commit-hash 참조 갱신을 같은 배치로 처리한다.

### G6 Npm Packaging

설치 가능한 npm artifact를 만든다.

- `files: ["dist"]`와 publish 전 build 보장을 설정한다.
- `npm pack`으로 tarball contents를 검증한다.
- Clean temp install 뒤 executable, version/help, daemon start/stop smoke를 검증한다.
- G0에서 정한 package name을 publish 직전에 재확인하고, 선점 시 승인된 scoped 대안을 쓴다.
- `better-sqlite3` native addon은 지원 Node/OS matrix에서 prebuilt 설치 여부와 fallback build
  prerequisite를 clean-host로 검증한다.
- 초기 배포는 npm이 1차 형태다. curl/standalone binary는 Phase 2 이후 후보이며, 사용자 컴파일이
  절대 필요 없다고 약속하지 않는다.

### G4 Final Release Candidate Certification

G4는 마지막 gate이며, G0-G3/G5/G6의 code, config, package 변경을 모두 포함한 동일 immutable
candidate를 인증한다.

- macOS/Linux/WSL2 matrix에서 G1-G3 smoke를 검증한다.
- 지원 matrix는 macOS/Linux/WSL2로 명시하고, native Windows는 community contribution 후보로 둔다.
- 수동 smoke만으로는 통과하지 않는다. CI suite 또는 기록된 clean-host run, setup command,
  timeout, expected state transition, failure injection과 retained diagnostics가 필요하다.
- WSL2 검증은 공개 전 gate다. 실제 release 준비 시 일정, 배포 목적, 검증 비용, macOS/Linux 우선
  공개의 영향을 사용자와 재검토할 수 있지만, 명시적 변경 승인 없이는 생략하지 않는다.

## Phases

```text
Phase 0 (release gates)  G0 -> G1/G3 병행 -> G2 -> G5/G6 -> G4(final RC)
--- npm publish + GitHub 공개 ---
Phase 1 (adoption)       demo assets, doctor attachment guide, transcript surface,
                         vendor-provided token/cost visibility,
                         human approval surface for pending/blocked delivery,
                         approved artifact distillation,
                         retry/backoff/dead-letter tuning,
                         optional Tier 2 uplift from G1 spike
Phase 2 (expansion)      ingress generalization, state.ts decomposition,
                         pair-to-N-agent route generalization,
                         third vendor, compose.yaml v1, config/onboarding split,
                         extra view drivers, durable store + mailbox replay,
                         native Windows community path
Phase 3 (remote)         L2 mobile remote MCP exposure -> L1 internal federation
                         -> L3 A2A Protocol bridge
```

Phase 1 focuses on adoption friction, diagnostics and human-controlled operation after public release.
Human-in-the-loop and artifact distillation mean the daemon surfaces pending/blocked state and candidate
actions, then executes cancel/retry/write only after explicit approval.

Phase 2 starts only after the structural prerequisites for vendor expansion are addressed: ingress
generalization, `state.ts` decomposition, and pair-to-N-agent route generalization. Compose, third-vendor
support, durable replay and additional terminal drivers belong here, not in G2.

Phase 3 starts after the envelope and daemon model are transport-independent enough to extend beyond the
single-machine release path. Remote MCP, internal federation and A2A Protocol bridging remain ordered
follow-ups, not Phase 0 promises.

## Current Execution Candidates

> [!note] 임시 매핑
> 아래 표는 기존 실행 plan과 release gate 사이의 임시 mapping이다. 장기 roadmap
> 구조나 실행 진행 상태의 기준으로 사용하지 않는다.

| Candidate | Plan | Roadmap mapping |
| --- | --- | --- |
| A2A envelope/lifecycle migration | `plans/post-mvp/envelope-metadata.plan.md` | G1-B/G1-C kickoff for Local stable A2A |
| Codex structured metadata spike | `plans/post-mvp/codex-structured-metadata-spike.plan.md` | G1-A evidence for Codex ingress/render path and possible Phase 1 Tier 2 uplift |
| Adapter dispatch registry refactor | `plans/post-mvp/adapter-dispatch-registry.plan.md` | G1 adapter boundary work and Phase 2 ingress generalization prerequisite |
| Channel server boot failure surface | `plans/post-mvp/channel-boot-surface.plan.md` | G3/G1 boundary: attach failure must surface as diagnosable daemon behavior |

The older plan-side sequence maps into the final roadmap as follows:

- Local single-daemon A2A is G1.
- Adapter/runtime connector work is part of G1 and a prerequisite for Phase 2 vendor expansion.
- Capability and instruction projection are Phase 2 unless required for the G1/G2 public surface.
- Compose is Phase 2.
- Same-machine multi-daemon is Phase 2+ after the single-daemon release path is stable.
- Local-remote, internal federation and remote-remote federation are Phase 3.

## Gate Evidence

Gate completion requires reproducible evidence, not only a status label.

| Gate | Required evidence |
| --- | --- |
| G0 | Versioned schema/example validation, CLI/config/package decision record, support matrix |
| G1 | Canonical schema and typed tool fixture sync, Codex ingress spike, automated Codex<->Claude integration, retry/idempotency/offline queue/stale runtime/active-turn/auth negative tests |
| G2 | tmux path and no-tmux fallback clean-user smoke, README command match |
| G3 | Client crash isolation, fatal handler exit, SIGTERM child cleanup, bounded body/queue, log redaction, doctor diagnosis tests |
| G5 | Secret/PII/path scan, tracked-vs-local file review, LICENSE/README/SECURITY/CONTRIBUTING/issue template presence and link check |
| G6 | `npm pack`, tarball content assertion, clean temp install, executable/version/help/start-stop smoke |
| G4 | Same immutable G0-G6 candidate verified on macOS/Linux/WSL2 CI or recorded clean-host runs with retained diagnostics |

Each evidence item records setup command, supported runtime version, timeout, expected state transition and
failure artifact location. Demo GIFs and manual recordings are adoption assets, not gate evidence.

## Cross-Platform Requirement

Cross-platform support is not a late separate phase; it constrains the release gates and Phase 2 design.

- G1 keeps the protocol transport-neutral.
- G1/G3 absorb OS launch, shell, path, permission and signal differences in adapters and daemon lifecycle.
- G2 provides tmux as the minimum driver and a no-tmux fallback, without making terminal automation core to
  the protocol.
- Phase 2 compose/config work uses OS-neutral declarations and leaves OS-specific command/path/env handling
  to compiler, recipe or plugin layers.
- G4 certifies the supported matrix before public release.

## Pre-Release Gap Summary

The dated pre-release implementation audit is not roadmap source-of-truth detail. Its actionable content is
represented here only as gate/phase pressure:

- G0/G1 must resolve unsupported/experimental Codex transport dependency and pin or preflight the supported
  attach path.
- G1 must close local trust-boundary gaps: authenticated ingress/push, safer secret delivery, runtime
  directory/socket permissions, token comparison, rollback cleanup and authenticated stable round trip.
- G1 must close delivery reliability gaps: runtime failure detection, queued delivery flush, stale runtime
  recovery and dispatch serialization evidence.
- G3 must close daemon robustness gaps: expected socket error isolation, child cleanup on stop/SIGTERM,
  bounded buffers, observed rollback failures, structured logs and doctor diagnostics.
- G5 must close public hygiene gaps: repository asset classification, sensitive/local artifact exclusion,
  author/path exposure decisions and dead/scaffold code handling.
- G6 must close packaging gaps: tarball allowlist, prepublish build, clean install and CLI smoke.
- Phase 2 carries durable-store hazards such as stable daemon identity and reply idempotency that become
  release blockers only when durable persistence is promoted.

Detailed file locations, severity labels and the dated audit snapshot are intentionally excluded from
this product roadmap. That snapshot was reconciled against the then-current implementation during
release-roadmap validation; this roadmap retains only the resulting gate/phase pressure.

Sources:

- `logs/2026-06-21-workspace-reset-W9-release-roadmap-authority.md:500`
