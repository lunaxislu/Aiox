# Task Brief — W10 Batch L: legacy must-check + Archive Gate + decision 승격 + source map draft

## 맥락

이 batch는 W10 split readiness 패키지의 **판정 권위 단일 소유자**다. W10-S(spec)와
W10-A(architecture)는 split map을 작성하며 decision/disposition 후보를 Controlling log 공유 표에
**flag만** 남긴다. L은 그 flag를 회수하고, W10 must-check legacy 자료의 self-sufficiency·Archive
Gate·decision 승격을 **판정**한 뒤 source map disposition을 갱신한다.

물리 삭제·`plans/post-mvp*` 재편/삭제·단일 A2A plan·roadmap repoint는 **L의 범위가 아니다** —
parent plan post-Atlas 단계(Atlas-gated)가 소유한다. L은 disposition draft/판정과 decision 승격까지만
한다.

**분업: 당신(Codex)이 draft한다. Claude(Opus)가 checker로 강하게 검증한다**(cite-heavy must-check +
decision 승격이라 checker 검증이 특히 중요). owner body 흡수 수정과 decision 파일 신규 생성은 L의
허용 범위지만, 모든 cite는 최종 source에서 재검증한다.

Controlling log: `logs/2026-06-22-workspace-reset-W10-split-readiness-map.md`.

## 0. 먼저 읽어라

1. Controlling log `logs/2026-06-22-workspace-reset-W10-split-readiness-map.md`
   - Scope (Primary owner, Allowed cross-owner updates, Cross-Owner Effects only)
   - Work Items (W4 must-check, W5 decision, W6 source map = 이 batch)
   - 최신 기록 + W1 design 확정 블록(2026-06-22)
   - **W10-S / W10-A가 남긴 공유 Decision Candidates / Cross-Owner Effects flag**
2. **required-read handoff (이 batch 입력)**:
   - W9 closeout Legacy/Historical Source Handoff:
     `logs/2026-06-21-workspace-reset-W9-release-roadmap-authority.md:664-682`
   - canonical source map: `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`
     (표 + 2026-06-21 codex 판정 블록 + plan/ carryover archive 정정 블록)
   - W5 history migration source map: `logs/2026-06-19-workspace-reset-W5-history-migration.md`
     (delete guard, target self-sufficiency, physical deletion gate)
3. `logs/AGENTS.md` — Legacy Source Absorption Map, **Archive Gate**, 상태 라벨, Package Preparation
4. `docs/decisions/AGENTS.md` — decision-worthy 기준, 7-섹션 템플릿, history 원본 처리 순서
5. `docs/specs/AGENTS.md`, `docs/architecture/AGENTS.md` — 흡수 시 owner 작성 규칙

handoff의 `file:line`은 출발점이다. owner 문서 수정·decision 승격 전에는 최종 source에서 재검증한다.

## 1. 이 배치 범위

- 대상(must-check legacy):
  - `prd/post-mvp/aiox-a2a-spec.md` §13(product/architecture/decision rationale) + §12 stale-vs-live
    digest 필요 여부 + whole-file self-sufficiency
  - `prd/post-mvp/archive/*` 5: `claude-codex-validation.md`, `claude-opinion.md`,
    `codex-claude-validation.md`, `codex-opinion.md`, `gemini-opinion.md`
  - `prd/pre-validation/*` 2: `claude-codex-pre-validation.md`,
    `sqlite-restart-recovery-pre-validation.md`
  - `docs/aiox/*` decision-candidate rows + `mcp-scope-and-daemon-namespace.md` rename-drift cleanup +
    other(아래 §4 목록)
- 제외(L 범위 아님): body split 실행, 물리 삭제, `plans/post-mvp*` 재편/삭제·단일 plan·roadmap
  repoint(= parent plan post-Atlas 단계), `history/*` 삭제·중복 source-map row 생성(= W5 owner).

## 2. 5-Phase 구조

### Phase 1 — flag/handoff 통합

W9 handoff(`:664-682`) + canonical source map + **W10-S/W10-A가 남긴 공유 flag**를 한 입력 세트로
통합한다. 각 must-check 파일·후보에 대해 "무엇을 판정해야 하는가"를 명세한다.

### Phase 2 — legacy must-check self-sufficiency

must-check 파일별로 "원본이 사라져도 현행 owner 문서(+S/A split map)만으로 과거 경위·검증을
이해할 수 있는가"를 판정한다. `src/`·`history/`·현행 owner 문서와 대조한다. self-contained 여부와
근거를 적는다.

### Phase 3 — Archive Gate (파일별)

`logs/AGENTS.md` Archive Gate를 파일별로 개별 적용한다. **보존 가치 + self-sufficiency 둘 다
충족**할 때만 `archive→delete`(logs digest 후 삭제 후보), 하나라도 불충족이면 `absorb→delete`(흡수
후 archive 없이 삭제 후보). digest가 필요하면 어떤 trace를 보존할지 적는다(실제 digest 파일 생성
여부는 판정에 따른다).

### Phase 4 — decision 승격 판정 (후보 5건)

source map W4 decision 후보 5건을 W6(=decision-worthy) 기준으로 `docs/decisions/` 승격할지 판정한다.

| # | 후보 source | 제안 decision |
| - | ----------- | ------------- |
| 1 | `docs/aiox/industry-precedents-and-observability-models.md` | Opaque Worker 모델 |
| 2 | `docs/aiox/observation-asymmetry-and-d7-pivot.md` | D7 Scope Reduction (aiox-originated authoritative ops 한정) |
| 3 | `prd/post-mvp/aiox-a2a-spec.md` §13 | 아키텍처 부채 3축(state.ts god factory 분해·ingress 일반화) + Structured Logger |
| 4 | `docs/aiox/step-14-codex-mcp-remote-architecture-bug.md` | App Server 주입·격리 |
| 5 | `docs/aiox/proxy-vs-app-server-tradeoff.md` | 1:1 app-server + 1:1 transparent proxy 하이브리드 종합 결정서 |

- **승격 전 필수: `docs/decisions/` 현황을 disk에서 재확인한다.** 후보 중 일부는 이미 부분/전체
  승격됐을 수 있다. W1 disk 확인(2026-06-22) 기준 현재 13개 decision이 존재한다:
  `a2a-message-lifecycle-envelope-and-correlation`, `agent-level-mcp-process-scoping`,
  `claude-channel-plugin-default`, `claude-channel-trust-and-registration`,
  `client-orchestrator-runtime-pivot`, `codex-per-agent-app-server`,
  `daemon-autostart-and-channel-identity`, `pair-attach-atomicity-and-sentinel`,
  `pair-slot-generalization`, `proxy-lazy-observation-cost-model`,
  `runtime-profile-namespace-isolation`, `uds-transport-and-framing-contract`.
  - **[Inference, 재검증 필요]** 후보 4(App Server 주입·격리)는 `agent-level-mcp-process-scoping` /
    `codex-per-agent-app-server`와, 후보 5(proxy/app-server 하이브리드)는 `codex-per-agent-app-server` /
    `proxy-lazy-observation-cost-model`과, 후보 2(D7 pivot)는 `client-orchestrator-runtime-pivot`과
    겹칠 수 있다. 각 후보가 **이미 충분히 커버됐는지 / 미흡해 신규·보강이 필요한지**를 disk
    재확인으로 판정한다. self-sufficiency가 승격을 요구하는 것만 승격한다.
- 승격 시 `docs/decisions/AGENTS.md` 7-섹션 템플릿(Context/Decision/Alternatives/Rationale/
  Trade-offs/Re-evaluation/Sources)을 따른다. history 원본 cite를 Sources에 남긴다.

### Phase 5 — source map disposition update draft

W2~W5 결과를 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` **기존 표 row에
append/update**한다. **새 표 금지.** `plans/post-mvp*` rows(parent plan post-Atlas 단계 owner)와
`history/*`(W5 owner) rows는 건드리지 않는다. disposition 값은 `absorb→delete` / `archive→delete` /
`delete-only` / `keep` 중에서 확정하되, 물리 삭제는 plan-stage 게이트가 소유하므로 "삭제 후보"까지만
판정한다.

## 3. 현재 구현 근거 / 교차 검색

- `src/`, `tests/` — must-check 파일의 as-built/empirical 주장(예: step-14 MCP bug, sqlite restart
  recovery)이 현재 코드와 정합한지 확인.
- `history/` — WHY/검증 trace의 원천. archive digest self-sufficiency 판정의 핵심 입력. 단 history
  삭제·source-map row 생성 금지(W5 owner).
- `docs/aiox/` 전체 19파일 inventory(W1 확인): `agent-runtime-container-model`,
  `claude-channel-registration-and-trust-model`, `codex-thread-focus-and-loaded-list`,
  `industry-precedents-and-observability-models`, `mcp-scope-and-daemon-namespace`, `mvp-architecture`,
  `observation-asymmetry-and-d7-pivot`, `pair-attach-kind-mismatch`,
  `per-agent-transparent-proxy-decision`, `phase-a-design-decisions`, `proxy-attribution-signals`,
  `proxy-cost-model`, `proxy-vs-app-server-tradeoff`, `README`, `round-4-tui-smoke-check`,
  `step-14-codex-mcp-remote-architecture-bug`, `step-14-codex-thread-mismatch-discovery`,
  `step-14-smoke-test-report`, `step-6-cli-decisions-walkthrough`.
  - source map은 이 중 다수를 W8/W10 architecture 흡수 후보로, 5건을 decision 후보로 둔다. 표의
    `TBD` self-sufficiency를 L이 채운다.
  - `mcp-scope-and-daemon-namespace.md`의 `docs/architecture/mvp-architecture.md` rename-drift는
    cleanup 후보(Cross-Owner Effects). 원본 삭제는 physical gate.

## 4. Owner 분류 규칙

- external protocol/contract → `docs/specs/`
- internal structure/state/process → `docs/architecture/`
- rationale/why → `docs/decisions/`
- release gate/priority → roadmap/release(L에서 직접 수정 아님; W9가 이미 PASS, 필요 시 flag만)
- stale legacy source → source map disposition

## 5. Evidence Ledger / Decision Candidates / Cross-Owner Effects 출력

Controlling log에 기록한다.

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |

Decision Candidates 표에는 5건 각각의 판정(승격 / 기존 커버로 불필요 / 보강)과 근거를 적는다.
Cross-Owner Effects 표에는 owner 흡수 수정·rename cleanup·decision 신규 파일을 적는다.

## 6. 완료 조건

- Phase 1: W9 handoff + source map + S/A flag가 한 입력 세트로 통합됨.
- Phase 2: must-check 파일별 self-sufficiency 판정과 근거가 적힘(`src`/`history`/owner 대조).
- Phase 3: 파일별 Archive Gate 적용으로 `archive→delete` vs `absorb→delete` draft 확정.
- Phase 4: decision 후보 5건이 disk 재확인 후 승격/불필요/보강으로 판정됨. 승격분은 7-섹션 템플릿으로
  작성되고 Sources에 원본 cite 보존. 기존 decision과 중복이면 그 사실과 근거 기록.
- Phase 5: source map 기존 row에 disposition append/update(새 표 금지, `plans/post-mvp*`·`history`
  rows 미수정). 삭제 후보까지만 판정(물리 삭제는 plan-stage gate).
- 모든 cite가 최종 source `file:line`으로 재검증됨.
- 결과가 Controlling log Evidence Ledger / Decision Candidates / Cross-Owner Effects에 기록됨.
- **Workflow retrospective**: batch 분할, task brief, Evidence Ledger, Scope, 분업(cite-heavy
  checker)에서 생긴 시행착오와 portable 후보를 Controlling log에 기록하고, portable 후보는
  `logs/2026-06-18-package-workflow-portable-pattern.md`에 축적(parent W10-2a, W10-3).
- 다음: W10-S/A/L 결과를 W7 closeout이 정리하고 parent W4.5 W10이 소비한다.
