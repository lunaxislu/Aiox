---
topic: workspace reset W10 split readiness and map package
description: workspace reset W10 — docs/specs/aiox-a2a.md와 docs/architecture/local-agent-runtime.md의 split readiness/map(section→slice, anchor 보존, inbound reference, README 필요성)을 산출하고, W10 must-check legacy(archive 5·pre-validation 2·aiox-a2a-spec §13/§12·docs/aiox/* decision-candidate)의 self-sufficiency·Archive Gate·decision 승격을 판정한 뒤 source map disposition을 갱신한다. body split은 실행하지 않는다
status: decided
---

## Work Items

- [x] W1 Batch task brief 작성 — **design 확정(@user+@codex 수렴, 2026-06-22 블록): 3 task brief(`W10-S` spec split map / `W10-A` architecture split map / `W10-L` legacy must-check+Archive Gate+decision+source map draft), 실행순서 S/A→L, 분업 `Codex draft → Claude checker`(L에서 강하게), S/A 공통 출력 표 형식 강제.** task brief 파일 작성과 anchor 인벤토리 grep은 **다음 세션**에 수행한다. `logs/AGENTS.md` Task Brief Template 사용, task brief에는 workflow retrospective와 `logs/2026-06-18-package-workflow-portable-pattern.md` 기록 지시를 포함한다(parent W10-2a). Controlling log = 이 package log.
- [x] W2 spec split readiness map — `docs/specs/aiox-a2a.md`의 section/claim을 split slice 후보로 매핑하고, section ID anchor 보존 계획, inbound reference inventory(repo 전역 grep), README 필요성을 재판단한다. **body split은 실행하지 않는다**(@user 결정 2026-06-22: split map 통합 패키지). owner 본문 수정은 anchor/stale reference 정합 최소 패치로 한정한다.
- [x] W3 architecture split readiness map — `docs/architecture/local-agent-runtime.md`를 동일 기준(section→slice, anchor 보존, inbound reference, README 필요성)으로 매핑한다. as-built 6모듈 경계가 code/module/process와 맞는지 `src/` 교차 확인. body split 미실행. **Codex producer draft + Claude checker PASS 완료(2026-06-22). checker 보정 = legacy rename-drift 전수(docs/aiox 6 파일 + prd/mvp/aiox-mvp-spec.md:7)를 W10-L에 넘김(blocking 아님).**
- [x] W4 legacy must-check self-sufficiency + Archive Gate — W9 closeout Legacy/Historical Source Handoff의 W10 must-check 행을 파일별로 소비한다: `prd/post-mvp/aiox-a2a-spec.md` §13(product/architecture/decision rationale)·§12 stale-vs-live digest 필요 여부·whole-file self-sufficiency, `prd/post-mvp/archive/*` 5, `prd/pre-validation/*` 2, `docs/aiox/*`(decision-candidate rows + `mcp-scope-and-daemon-namespace.md` rename-drift cleanup + other). 각 파일에 Archive Gate(보존가치+self-sufficiency)를 적용해 `archive→delete` vs `absorb→delete` draft disposition을 판정한다. 최종 확정·물리 삭제는 plan-stage 물리 삭제 게이트 소유. **W4-1+W4-2 Codex draft 완료(2026-06-22). W4 통합 Claude checker PASS(2026-06-22): draft sound. 보정 = decision 실제 12개(`AGENTS.md` 포함 13 overcount)·rename-drift 전수 정확(6 file+round-4 2줄+`prd/mvp:7`)·seed #2 overlap 오귀속(`client-orchestrator-runtime-pivot`=TS rewrite/history13, D7 미커버)·seed #4 nuance(app-server 주입 대상)·seed #5 대부분 기존 2 decision 커버. 다음=W5.**
  - [x] W4-0 Phase 1 입력 통합 — S/A flags + W9 handoff + canonical source map + Gemini triage hypothesis를 한 입력 세트로 정리한다
  - [x] W4-1 `prd/post-mvp/aiox-a2a-spec.md`, `prd/post-mvp/archive/*`, `prd/pre-validation/*` 파일군의 self-sufficiency와 Archive Gate를 판정한다 — **Codex draft 완료, checker PASS 전 미확정. W4 전체 checker로 통합 검증.**
  - [x] W4-2 `docs/aiox/*` 파일군의 self-sufficiency, rename-drift cleanup 필요성, Archive Gate를 판정한다 — **Codex draft 완료, checker PASS 전 미확정. W4 전체 checker로 통합 검증.**
- [x] W5 decision 승격 — parent W10-1. source map W4 decision 후보 5건(industry-precedents→Opaque Worker / observation-asymmetry→D7 Scope Reduction / aiox-a2a §13→architecture debt 3축+Structured Logger / step-14-mcp-bug→App Server 주입·격리 / proxy-vs-app-server→app-server+proxy hybrid)을 W6 기준으로 `docs/decisions/`에 승격할지 판정한다. 승격 전 `docs/decisions/` 현황을 disk에서 재확인하고, self-sufficiency가 승격을 요구하는 것만 승격한다. **Codex draft + Claude checker PASS 완료(2026-06-22): 신규 decision 2건(`codex-d7-authoritative-binding-scope.md`, `codex-app-server-mcp-injection-and-isolation.md`) 승격, 3건 no-promotion. checker가 Sources 전수 실재·기존 decision 비중복·no-promotion owner 커버리지 1차 source 재검증 PASS. 잔여 1건(`industry-precedents` Opaque Worker coarse-state self-sufficiency)은 물리 gate handoff.**
- [x] W6 source map disposition append/update — W2~W5 결과를 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` 기존 source map row에 반영한다(새 표 금지). `plans/post-mvp*` rows(parent plan post-Atlas 단계 owner)와 `history/*`(W5 owner)는 건드리지 않는다. **Codex draft + Claude checker PASS 완료(2026-06-22): git diff 전수 대조 — decision 2승격+3 no-promotion·archive 5·pre-validation 2·digest-required 4가 W4/W5 checker와 일치, `plans/post-mvp*`·`history/*` 미수정·새 표 없음 확인. checker가 pending 마커 50개→PASS flip + source-map 패키지 W4 항목 `[x]` 완결 전이.**
- [x] W7 Closeout & parent 반영 — split map 정리(logs/AGENTS.md item 10), workflow retrospective(F56~ → portable pattern 로그), parent W4.5 W10 소비 반영안 작성, status 전이. body split·물리 삭제·final physical disposition은 미수행(physical gate/parent plan stage owner). **완료(2026-06-22): W1~W6 PASS 결과를 closeout으로 확정, parent W4.5 W10 소비 반영, portable pattern F57~F60 추가, child status `decided`.**

### Scope

- Primary owner:
  - split readiness/map 산출물 자체(이 package log의 split map)와 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` source map disposition.
  - split 대상 본문 2종(`docs/specs/aiox-a2a.md`, `docs/architecture/local-agent-runtime.md`)은 split readiness **평가 대상**이며, 이 package에서는 body split을 실행하지 않는다. @user 결정(2026-06-22) = split map 통합 패키지.
- Allowed cross-owner updates:
  - `docs/specs/aiox-a2a.md`, `docs/architecture/local-agent-runtime.md` — anchor/stale reference 정합 최소 패치만(body split 아님).
  - `docs/decisions/` — W10-1 decision 승격(후보 5건), W6 기준.
  - `docs/aiox/*` — stale header/rename-drift cleanup(예: `mcp-scope-and-daemon-namespace.md`의 `docs/architecture/mvp-architecture.md` rename drift). 원본 삭제는 physical gate.
  - Source-map append target (별도 owner): `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` — disposition append/update만.
- Cross-Owner Effects only (수정 금지, 분류·handoff만):
  - 물리 삭제, `plans/post-mvp*` 재편/삭제·단일 A2A plan 작성·roadmap 147-152 repoint → parent plan `plans/workspace-reset/workspace-reset.md`의 post-Atlas `plans/post-mvp*` 삭제 disposition 단계 owner(Atlas-gated). async-petting-hoare 운영 라인 별도 보존.
  - `history/58`, `history/59`, 기타 `history/*` → W5 history migration owner. 이 package에서 삭제·중복 source-map row 생성 금지.
- Evidence inputs:
  - split 대상: `docs/specs/aiox-a2a.md`, `docs/architecture/local-agent-runtime.md`.
  - required-read handoff: W9 closeout Legacy/Historical Source Handoff(`logs/2026-06-21-workspace-reset-W9-release-roadmap-authority.md:664-682`), `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` source map, `logs/2026-06-19-workspace-reset-W5-history-migration.md` source map.
  - W10 must-check legacy: `prd/post-mvp/aiox-a2a-spec.md` §13/§12, `prd/post-mvp/archive/*`(5), `prd/pre-validation/*`(2), `docs/aiox/*`(decision-candidate rows + stale cleanup).
  - 현재 구현 1차 사실: `src/`, `tests/`.
  - 규칙: `logs/AGENTS.md`(Legacy Source Absorption Map, Archive Gate, Package Preparation, split map item 10, 상태 라벨), `docs/specs/AGENTS.md`, `docs/architecture/AGENTS.md`, `docs/decisions/AGENTS.md`.
  - 제약 입력: `logs/2026-06-19-workspace-reset-W5-history-migration.md`(delete guard, target self-sufficiency, physical deletion gate).

### Evidence Ledger

| Topic | Source | Lines | Finding | Owner impact | Action |
| ----- | ------ | ----- | ------- | ------------ | ------ |
| W10 진입 권위 | `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` | 45-52, 710-715 | [Fact] parent next pointer = W10 split readiness and map package. W1~W9 완료/소비, W10 child log 미생성, Scope.Primary owner는 @user 확정 대상(단일 primary owner 없음). | W10 entry 전제 = scope 확정 | @user 확정(split map 통합) 반영해 이 package log 생성 |
| W10 must-check handoff | `logs/2026-06-21-workspace-reset-W9-release-roadmap-authority.md` | 664-682 | [Fact] W9 정제본 5열 handoff가 W10 must-check를 명시: `prd/post-mvp/aiox-a2a-spec.md` §13/§12·archive 5·pre-validation 2·`docs/aiox/*` decision-candidate+stale cleanup·`history/59`. `plans/post-mvp*`는 keep/pending(parent plan stage owner), `history/*`는 W5 owner. | W4/W5/W6 입력 | W4가 파일별 Archive Gate, W5가 decision 승격, W6이 source map 갱신 |
| source map 현재 상태 | `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` | 23-59, 198-231 | [Fact] canonical 14+ row 표가 W8/W9 draft disposition 반영 상태. W10 잔여 = archive 5·pre-validation 2·§13·docs/aiox decision-candidate. decision 후보 5건은 W4 Work Item(line 12)으로 등록됨. | W6 append target 확정 | W10은 새 표 만들지 않고 기존 row append/update |
| W2 spec split map | `docs/specs/aiox-a2a.md`; `logs/W10-S-task.md` | spec 1-870; task 1-153 | [Fact] `aiox-a2a.md` is already owner-split at intro level and preserves source §2~§9. W2 mapped all §2~§9 headings to split slices without owner body edits. | W2 complete; future split executor can use map below | Keep original file as compatibility index/stub holder; no body split in W10 |
| W2 inbound reference grep | `rg` over `docs`, `plans`, `plan`, `README.md`, `AGENTS.md` | command result 2026-06-22 | [Fact] live inbound refs cluster around §4, §5, §6, §7, §8, §9; §2/§3 have no live explicit inbound besides the spec itself and legacy sources. `plans/post-mvp.plan.md:101` points Stage 1 envelope/lifecycle at §8. | Anchor preservation required; one possible stale/incorrect plan ref flagged | Cross-Owner Effects flag for `plans/post-mvp.plan.md:101`; final owner action belongs later plan/roadmap stage, not W2 |
| W2 code spot-check | `src/`, `tests/` grep for spec terms | command result 2026-06-22 | [Fact] current code terms still match the spec's status claims: profile/socket path, `message_deliveries`, `parentMessageId`, `AdapterInjectResult`, pair slots, fixed `mcp_servers.aiox`, no obvious federation implementation path. | Supports status labels in W2 map | No owner body patch from producer |
| W2 checker 검증 (Claude) | `docs/specs/aiox-a2a.md`, `plans/post-mvp/*`, `docs/decisions/*`, `src/`, `history/58` | 본 로그 W2 checker 블록 | [Fact] anchor inventory 16 heading/870줄 정확, live inbound `file:line` 전수 일치, code 인용·federation 부재·§2/§3 no-inbound 확인, Cross-Owner flag(`post-mvp.plan.md:101` §8 vs §4) 정당 → **PASS**. [Inference] history/58 §6/§7는 legacy-tier narrative지 live anchor 의존성 아님(파일명 토큰은 legacy PRD 지향). | W2 PASS 확정. L Phase 1이 history/58 tier 보정 + Cross-Owner flag 회수 | checker는 owner body·source map 미수정. L이 flag 단일 판정 |
| W3 architecture split draft | `docs/architecture/local-agent-runtime.md`; `logs/W10-A-task.md`; `src/`; `tests/` | architecture 1-1181; task 1-161; source grep 2026-06-22 | [Fact] architecture monolith maps cleanly to index + 8 durable slices: store/repositories, daemon transport/API, Claude adapter, Codex adapter, routing/FSM, CLI/status, errors/events/smoke, gaps/authority. [Inference] user-facing "6-module" model is valid as an overview, but actual split should keep store and routing/FSM separate from daemon because `src/store/*`, `src/core/*`, and `src/daemon/state.ts` own distinct boundaries. | W3 draft ready for checker; future split executor can preserve §0-§14 stubs in root index | No owner body patch. Checker should verify source line claims and inbound tiering |
| W3 inbound tiering | `rg` over live tier `docs plans plan README.md AGENTS.md`; legacy tier `logs prd history` | command result 2026-06-22 | [Fact] live inbound references to `local-agent-runtime.md` are concentrated in decisions (`client-orchestrator-runtime-pivot`, `codex-per-agent-app-server`, `daemon-autostart-and-channel-identity`, `claude-channel-plugin-default`, `claude-channel-trust-and-registration`, `uds-transport-and-framing-contract`, `pair-slot-generalization`) plus spec whole-doc reference. Legacy/source-map references include `docs/aiox/mvp-architecture.md`, source absorption rows, and W task briefs. | Anchor preservation required, especially §4.1, §5, §6.1-6.4, §7.2, §7.6, §7.9, §8, §9.1 | Live refs listed separately from legacy refs in W3 draft; no ref edits |
| W3 checker 검증 (Claude) | `docs/architecture/local-agent-runtime.md`, `src/daemon/state.ts`, `src/daemon/run.ts`, `src/store/*`, `src/adapters/{claude,codex}/*`, `docs/decisions/*`, `prd/mvp`, `docs/aiox/*`, `tests/`, git | 본 로그 W3 checker 블록 | [Fact] anchor inventory §0~§14/1181줄 정확, 인용 src line 전수 실재·정확(routing/FSM 함수 위치 1761-1864·2099-2135 등 일치), live-tier inbound 7 decision+spec 전수 일치, Current gap 3종(unauth `/send`·no `claude_channel_disconnected`·runtime failure callback unwired) 코드 확정, rename(`mvp-architecture.md`→`local-agent-runtime.md`) 확정, owner body/code 미수정(git) → **PASS**. [Fact] checker 보정: legacy rename-drift 전수가 draft 열거보다 많음(docs/aiox 6 파일 + `prd/mvp/aiox-mvp-spec.md:7`). | W3 PASS 확정. L Phase 1이 rename-drift 6-file 전수 + §5 inbound 귀속 nit 회수 | checker는 owner body·source map 미수정. L이 legacy disposition 단일 판정 |
| W10-L Gemini triage input | @user-provided Gemini report, 2026-06-22 | user message | [Unverified input] Gemini claims decision 후보 5건은 신규 decision 생성 없이 기존 decision/gap으로 커버 가능하고, 일부 legacy 검증은 W5/W7/W9 provenance로 단축 가능하다고 보고. [Codex judgment] 이는 작업량 절감 가설로 유용하지만 아직 확정 fact가 아니다. | W4-0 입력 통합과 W5 decision 판정의 triage index | W10-L 각 세션에서 참고하되, source map disposition/decision 판정 전 최종 source `file:line`과 `docs/decisions/` disk 현황을 재확인한다 |
| W4-0 L input integration | `logs/W10-L-task.md`; W9 handoff; source map; W2/W3 checker blocks | task 1-153; W9 664-682; source-map 23-59; W10 log latest | [Fact] L batch scope는 W4/W5/W6 판정 단일 소유자이며, Phase 1 완료 조건은 W9 handoff + source map + S/A flags를 한 입력 세트로 통합하는 것이다. [Fact] W4-1 대상은 `prd/post-mvp/aiox-a2a-spec.md`, archive 5, pre-validation 2이고 W4-2 대상은 `docs/aiox/*`다. | W4-0 완료; W4-1 next pointer | 이 로그 하단의 "W4-0 완료" 블록에 통합 입력 세트를 남김. owner body/source map은 아직 미수정 |
| W4-0 guardrails | `logs/AGENTS.md`; `docs/decisions/AGENTS.md`; `docs/specs/AGENTS.md`; `docs/architecture/AGENTS.md` | logs/AGENTS 56-102; decisions 9-68; specs 10-45; architecture 10-45 | [Fact] Archive Gate는 보존가치+self-sufficiency 모두 충족할 때만 archive한다. Decision은 load-bearing WHY만 소유하고, spec/architecture는 각각 외부 contract와 내부 구조를 소유한다. | W4-1/W4-2/W5 판정 기준 | W4-1 이후 각 파일 판정에서 fact/inference/opinion과 owner 라벨을 분리한다 |
| W4 통합 checker (Claude) | `prd/post-mvp/aiox-a2a-spec.md`; `prd/post-mvp/archive/*`; `prd/pre-validation/*`; `docs/aiox/*`; `docs/architecture/local-agent-runtime.md`; `docs/product/roadmap.md`; `docs/decisions/*`; `src/`; 본 로그 W4 checker 블록 | spec §12 1030-1064/§13 1066-1188; arch §12 1098/§13 1132/§14 1155-1181; roadmap 32-209; decisions ls+본문 | [Fact] §12/§13 위치·성격, roadmap cite 7개, archive 5 header(not authority+history/58), pre-validation/round-4/step-14 empirical trace vs owner 결론-only, arch §14 docs/aiox=learning records 모두 1차 source 일치. [Fact] 보정 7건(decision 12개·rename-drift 전수·seed #2 오귀속·seed #4 nuance·seed #5 covered·seed #1 분리정확·대형 conversational residual). | W4 PASS 확정. W5가 checker seed 분석을 입력으로 소비; W6/물리 gate가 최종 disposition 소유 | checker는 owner body·source map·decision·legacy 미수정. Work Item W4 `[x]`, W5 `[>]` 전이 |
| W5 decision promotion draft | `docs/decisions/AGENTS.md`; 5 candidate sources; existing `docs/decisions/*`; read-only explorer checks | decisions rules 8-68; source lines in W5 block | [Fact] decision actual count before W5 = 12 decision docs + `AGENTS.md`; Codex draft promoted 2 new decision docs and no-promoted 3 candidates. [Inference] D7 scope reduction and Codex app-server MCP injection/isolation are load-bearing WHY not fully covered by existing decisions. | W10-1 draft ready for checker; not accepted/PASS yet | Added draft files `docs/decisions/codex-d7-authoritative-binding-scope.md` and `docs/decisions/codex-app-server-mcp-injection-and-isolation.md`; current next pointer remains W5 checker/acceptance |
| W5 checker 검증 (Claude) | 신규 decision 2건; `docs/decisions/{AGENTS,a2a-message-lifecycle-envelope-and-correlation,client-orchestrator-runtime-pivot,agent-level-mcp-process-scoping,codex-per-agent-app-server,proxy-lazy-observation-cost-model}.md`; `history/34`·`history/40`; `docs/aiox/{observation-asymmetry-and-d7-pivot,step-14-codex-mcp-remote-architecture-bug,industry-precedents-and-observability-models,proxy-vs-app-server-tradeoff}.md`; architecture §7.2/§7.4/§7.5/§7.8/§13; roadmap G3/Phase 2; spec §13; 본 로그 W5 checker 블록 | history/34:34-216; history/40:246-333; arch 498-731·1132-1151; roadmap 60-141; spec 1066-1156 | [Fact] promoted 2건 Sources 전수 실재·정확, 기존 decision 비중복(`client-orchestrator-runtime-pivot`·`proxy-lazy`·`codex-per-agent-app-server`·`agent-level-mcp-process-scoping` 어느 것도 D7 notification-authority rule / app-server-vs-TUI injection target distinction 미소유), no-promotion 3건 owner 커버리지(lifecycle decision / roadmap Phase 2·G3+spec §13 self-declared 비규범 / codex-per-agent+proxy-lazy+arch §7.4) 확인 → **PASS**. [Inference] `industry-precedents` Opaque Worker coarse-state/semantic-timeout self-sufficiency 1건은 물리 gate handoff. | W5 PASS 확정. W6 checker가 source map row 일치/경계 확인 | checker는 owner body·decision·source map·legacy 미수정. Work Item W5 `[x]`, W6 `[>]` 전이 |
| W6 checker 검증 (Claude) | `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` (git diff); W2~W5 checker 결과; 본 로그 W6 checker 블록 | git diff 72+/27-; source-map 표 + 말미 narrative | [Fact] source map row append/update가 W2~W5와 일치: decision 2승격+3 no-promotion, archive 5 `absorb→delete`, pre-validation 2 `archive→delete after digest`, digest-required 정확히 4, §13 disposition. [Fact] 경계 준수: `plans/post-mvp*`·`history/*` 미수정(diff context-only), 새 표 0, legacy/owner body 미수정 → **PASS**. | W6 PASS 확정. checker가 pending 마커 50개→PASS flip + source-map 패키지 W4 `[x]` 완결. W7 closeout으로 진행 | checker는 disposition 완결(마커 flip + 추적 항목 전이)만; legacy 원본·owner body·`plans/post-mvp*`·`history/*` 미수정. Work Item W6 `[x]` 전이 |

### Decision Candidates

| Source | Lines | Why decision-worthy | Proposed decision | Status |
| ------ | ----- | ------------------- | ----------------- | ------ |
| `docs/aiox/industry-precedents-and-observability-models.md` | source map row | 외부 precedent 자체가 아니라 Opaque Worker / delivery-vs-completion rationale가 load-bearing WHY인지 판정 필요 | Opaque Worker 모델 | W5 Codex draft no-promotion: delivery/completion and daemon authority are covered by `a2a-message-lifecycle-envelope-and-correlation.md`; external precedent narrative is explanatory, not load-bearing decision WHY. Checker PASS (Claude 2026-06-22) |
| `docs/aiox/observation-asymmetry-and-d7-pivot.md` | source map row | D7/proxy authority rationale가 현재도 유효한 범위 축소 decision인지 판정 필요 | D7 Scope Reduction | W5 Codex draft promoted: `docs/decisions/codex-d7-authoritative-binding-scope.md`. Checker PASS (Claude 2026-06-22) |
| `prd/post-mvp/aiox-a2a-spec.md` §13 | W9 handoff/source map | architecture debt 3축과 Structured Logger가 단순 refactor gap인지 load-bearing decision인지 판정 필요 | architecture debt + Structured Logger | W5 Codex draft no-promotion: current outcome is roadmap Phase 2/G3 and architecture Known Gaps; rationale is execution ordering/refactor guidance, not a separate decision. Checker PASS (Claude 2026-06-22) |
| `docs/aiox/step-14-codex-mcp-remote-architecture-bug.md` | source map row | App Server 주입·격리 nuance가 기존 MCP/process-scope decision에 충분히 들어갔는지 판정 필요 | App Server 주입·격리 | W5 Codex draft promoted: `docs/decisions/codex-app-server-mcp-injection-and-isolation.md`. Checker PASS (Claude 2026-06-22) |
| `docs/aiox/proxy-vs-app-server-tradeoff.md` | source map row | app-server + proxy hybrid WHY가 기존 두 decision으로 분산 커버되는지 판정 필요 | proxy/app-server hybrid | W5 Codex draft no-promotion: `codex-per-agent-app-server.md` covers 1:1 app-server and source citation; `proxy-lazy-observation-cost-model.md` covers proxy observation cost; architecture owns current A+P outcome. Checker PASS (Claude 2026-06-22) |

### Cross-Owner Effects

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |
| `plans/post-mvp.plan.md` | Possible stale/incorrect section reference at line 101: "A2A envelope/lifecycle" points to `docs/specs/aiox-a2a.md` §8, while the direct envelope/lifecycle owner is §4 and §8 is federation/remote. | [Inference] It may be intentional because the row says transport-neutral protocol, but adjacent plan rows use §5/§7/§6 precisely and the dedicated envelope plan uses §4. | W2 only flags. Do not edit in this package unless W10-L or later plan-stage owner confirms. |
| `docs/aiox/*` | Rename-drift cleanup candidates: six docs/aiox files point at missing `docs/architecture/mvp-architecture.md`; `prd/mvp/aiox-mvp-spec.md:7` points at stale `docs/aiox/mvp-architecture.md`. | [Fact] W3 checker verified current architecture authority is `docs/architecture/local-agent-runtime.md`; legacy refs are not split blockers but affect source-map/delete readiness. | W4-2 owns docs/aiox self-sufficiency/cleanup disposition; no edit in W4-0. |

### Closeout

- Updated owner documents:
  - `docs/decisions/codex-d7-authoritative-binding-scope.md` 신규 승격.
  - `docs/decisions/codex-app-server-mcp-injection-and-isolation.md` 신규 승격.
  - `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` 기존 source map row append/update.
  - `logs/2026-06-18-package-workflow-portable-pattern.md` F57~F60 추가.
  - `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` parent W10 소비 반영.
- Validation result:
  - W2 spec split map: Codex producer + Claude checker PASS. Body split/owner body patch 없음.
  - W3 architecture split map: Codex producer + Claude checker PASS. Body split/owner body patch 없음.
  - W4 legacy must-check + Archive Gate: Codex draft + Claude checker PASS.
  - W5 decision promotion: 2 promoted + 3 no-promotion, Claude checker PASS.
  - W6 source map disposition: `git diff` 기반 Claude checker PASS, 새 표 없음, `plans/post-mvp*`·`history/*` 미수정.
- Remaining gaps:
  - Actual body split은 미실행. 후속 split executor는 W2/W3 split map을 사용하고, 원본 `docs/specs/aiox-a2a.md`와 `docs/architecture/local-agent-runtime.md`를 compatibility index/stub holder로 유지해야 한다.
  - `plans/post-mvp.plan.md:101`의 spec §8 vs §4 pointer 의심은 W10에서 flag만 했다. final action은 later plan/roadmap stage owner.
  - `industry-precedents`의 Opaque Worker coarse-state/semantic-timeout self-sufficiency 정밀 감사는 physical deletion gate 소유.
  - `prd/pre-validation/*` 2개와 `docs/aiox/round-4-tui-smoke-check.md`, `docs/aiox/step-14-smoke-test-report.md`는 archive digest 필요 상태로 source map에 남았다. digest 생성은 W10 범위 밖.
  - 물리 삭제, `plans/post-mvp*` single execution successor, roadmap repoint/final disposition은 parent plan post-Atlas physical deletion gate 소유.
- Workflow retrospective:
  - F56은 W2 split-map draft 중 추가했고, W7 closeout에서 F57~F60을 portable pattern 로그에 추가했다.
  - repo-specific 판단과 portable 후보를 분리했다. W10 결과 자체는 이 로그 closeout과 parent W10 소비 블록에, workflow 후보는 portable pattern 로그에 보존한다.
- Next owner/log:
  - Parent W4.5 W10은 완료로 소비했다.
  - 다음 재개 지점은 parent W4.5 W11: W7~W10 package workflow 후보를 repo 전용/portable로 분리하고 log skill 승격 여부를 판단한다.

## 2026-06-22 · W10 package log 생성 — Scope 확정(@user: split map 통합 패키지)

Parent pointer: `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` W10

이 로그는 parent W4.5의 W10 split readiness and map package다. parent W10은 이 child package log의
결과를 소비한다. W9 release/roadmap authority package가 closeout PASS(child status `decided`)로
종료되며 W10을 next pointer로 넘겼고, W9 closeout의 Legacy/Historical Source Handoff
(`...W9-release-roadmap-authority.md:664-682`)와 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`
source map, `logs/2026-06-19-workspace-reset-W5-history-migration.md` source map을 required-read로 받는다.

**@user Scope 결정(2026-06-22):**

- W10 Scope = **split map 통합 패키지**. body split을 실행하지 않고, spec·architecture 두 split 대상의
  split map·anchor 보존·inbound reference·README 필요성·legacy disposition을 함께 산출한다.
- Primary owner는 단일 문서가 아니라 split readiness map 산출물 + source map disposition이며, split 대상
  본문(`docs/specs/aiox-a2a.md`·`docs/architecture/local-agent-runtime.md`)은 평가 대상으로서 anchor/stale
  reference 정합 최소 패치만 허용한다. 실제 파일 분리(body split)는 후속 Work Item이 소유한다.

**`logs/AGENTS.md` Package Preparation 순서 적용:**

1. Package log 생성(이 파일) — Scope 위와 같이 선언.
2. Batch task brief는 W1에서 작성. split map(spec/architecture) / legacy must-check + Archive Gate /
   decision 승격을 batch 단위 후보로 둔다. 분업(Codex 저작 → Claude checker) 계승 여부는 task brief
   확정 전 @user와 정한다.
3. 불확실성 = (a) batch 분할 입도, (b) producer/checker 분업 계승 여부, (c) split 대상 2종을 한 batch로
   묶을지 분리할지. 이 셋은 W1 진입 시 정리한다.

**확인한 경계:**

- 물리 삭제·`plans/post-mvp*` 재편/삭제·단일 A2A plan·roadmap repoint는 W10이 아니라 parent plan
  post-Atlas 단계(Atlas-gated)가 소유한다. W10은 disposition draft/판정과 split readiness만 산출한다.
- `history/*`(58/59 포함)는 W5 history migration owner라 이 package에서 삭제·중복 source-map row를
  만들지 않는다. W10은 history 잔여 rationale을 split/decision 입력으로만 확인한다.

**다음:** W1 — Batch task brief 작성. 진입 시 batch 분할·분업 방식을 @user와 확정한 뒤 task brief를
`logs/AGENTS.md` Task Brief Template로 작성한다.

## 2026-06-22 · W1 design 확정 — 3 task brief 설계와 공통 출력 형식 (파일 작성은 다음 세션)

@user + @codex 수렴으로 W1 batch 설계가 확정됐다. **task brief 파일 작성과 anchor 인벤토리 grep은
다음 세션에서 수행한다.** 이 블록이 그 설계를 권위로 보존한다(다음 세션 재개 입력).

**확정된 batch 설계:**

- 3 task brief, 실행 순서 **S/A → L**.
  - `logs/W10-S-task.md` — spec split readiness map (child W2)
  - `logs/W10-A-task.md` — architecture split readiness map (child W3)
  - `logs/W10-L-task.md` — legacy must-check + Archive Gate + decision 후보 판정 + source map draft (child W4+W5+W6)
- **결합 해소(판단 권위 분산 방지):** S/A는 split map 작성 중 decision/disposition 후보를 발견하면 이
  package log의 공유 Decision Candidates / Cross-Owner Effects 표에 **flag만** 남긴다. 최종 승격·삭제·
  disposition 판정은 **L이 단일 소유**한다.
- **분업:** 전 batch `Codex draft → Claude checker` 계승(W8/W9 패턴). checker는 특히 L(cite-heavy
  must-check + decision 승격)에서 강하게 필요. producer는 owner body 미수정.

**S/A 공통 출력 표 (강제):**

`Current section | Proposed slice | Anchor preservation | Inbound refs | Split readiness | Notes / flags`

- 표준화 이유: L이 S/A 결과를 쉽게 소비하고, 향후 실제 split 실행자가 map을 그대로 재사용한다.
- 보완 1: **README 필요성**은 per-section이 아니라 per-document 판단이라 표 밖 **별도 결론**으로 둔다.
- 보완 2: `Notes / flags`에 **owner 상태 라벨**을 함께 적어 slice 경계가 status를 따라가게 한다
  (spec: `Current Contract`/`Target Contract`/`Open Issue`/`Deferred`/`Implementation Gap`;
  architecture: `Current`·`As-built`/`Target`/`Deferred`/`Current gap`).

**task brief별 설계:**

- `W10-S-task.md` (Primary `docs/specs/aiox-a2a.md`): section→split slice map(공통 표), anchor(section
  ID §2~§13) 보존, inbound reference inventory(repo 전역 grep), README 필요성 결론. 발견 decision/
  disposition 후보는 package log 표에 flag만. body split 미실행. 상태 라벨 = spec contract 라벨.
- `W10-A-task.md` (Primary `docs/architecture/local-agent-runtime.md`): section→split slice map(공통 표),
  **as-built 6모듈 경계 vs `src/` 대조**, anchor 보존, inbound reference inventory, README 필요성 결론.
  발견 후보 flag만. body split 미실행. 상태 라벨 = architecture 라벨.
- `W10-L-task.md` (5 phase): Phase 1 W9 handoff + source map + S/A flag 통합 → Phase 2 legacy
  must-check self-sufficiency(archive 5·pre-validation 2·`prd/post-mvp/aiox-a2a-spec.md` §13/§12·
  `docs/aiox/*` decision-candidate + other) → Phase 3 Archive Gate(파일별 보존가치+self-sufficiency)
  → Phase 4 decision 승격 판정(후보 5건; 승격 전 `docs/decisions/` 현황 disk 재확인; W6 기준)
  → Phase 5 source map update draft(canonical `legacy-source-absorption` 기존 row append; 새 표 금지;
  `plans/post-mvp*` rows·`history` rows 미수정).

**다음 세션 W1 실행 순서:**

1. `docs/specs/aiox-a2a.md`·`docs/architecture/local-agent-runtime.md` section heading을 grep해 anchor
   인벤토리 확보(이번 세션 중단된 step).
2. `logs/AGENTS.md` Task Brief Template로 `W10-S/A/L-task.md` 3개 작성(위 설계 반영, 공통 표 강제,
   `Controlling log` = 이 package log 명시).
3. 작성 후 W1 완료 처리, W2(S)/W3(A) active 전이 + Codex draft dispatch. L은 S/A flag 회수 후 착수.

W1은 task brief 미작성이라 `[>]` active 유지.

## 2026-06-22 · W1 완료 — anchor inventory와 task brief 3개 작성, W2/W3 dispatch 준비

W1 design 블록(2026-06-22)이 "task brief 파일 작성과 anchor 인벤토리 grep은 다음 세션"으로
명시한 그 다음 세션이다. 확정 설계를 그대로 반영해 W1을 실행했다.

- **anchor inventory (W1 grep, 2026-06-22):**
  - spec `docs/specs/aiox-a2a.md`: §2~§9 (서브섹션 포함 16 heading), 870줄.
  - architecture `docs/architecture/local-agent-runtime.md`: §0~§14 (서브섹션 포함 53 heading), 1181줄.
  - 두 inventory를 각 task brief의 anchor preservation 기준표로 넣었다.
- **task brief 3개 작성** (`logs/AGENTS.md` Task Brief Template):
  - `logs/W10-S-task.md` (child W2): spec split readiness map. 공통 표 + anchor inventory + inbound 전역 grep + README per-document 결론.
  - `logs/W10-A-task.md` (child W3): architecture split readiness map. 동일 + as-built 6모듈 경계 vs `src/` 대조.
  - `logs/W10-L-task.md` (child W4+W5+W6): legacy must-check + Archive Gate + decision 승격 + source map draft, 5-phase.
- **분업 확정(@user 2026-06-22):** producer = Codex draft, checker = Claude(Opus). checker는 특히 L(cite-heavy must-check + decision 승격)에서 강하게. producer는 owner body 미수정. S/A는 decision/disposition 후보를 Controlling log 공유 표에 flag만, 최종 판정은 L 단일 소유.
- **공통 출력 표 강제:** `Current section | Proposed slice | Anchor preservation | Inbound refs | Split readiness | Notes/flags`. README는 per-document 별도 결론. Notes에 owner 상태 라벨(spec/architecture별).
- **must-check 실재 확인:** `prd/post-mvp/aiox-a2a-spec.md`, `prd/post-mvp/archive/*` 5, `prd/pre-validation/*` 2, `docs/aiox/*` 19 모두 disk 확인. L task brief에 경로 inventory를 박았다.
- **[관찰] `docs/decisions/` 현재 13개.** decision 후보 5건 중 일부(step-14 MCP bug / proxy·app-server / D7 pivot)는 기존 decision(`agent-level-mcp-process-scoping`, `codex-per-agent-app-server`, `proxy-lazy-observation-cost-model`, `client-orchestrator-runtime-pivot`)과 겹칠 수 있다. [Inference] — L Phase 4가 disk 재확인으로 중복/미흡을 판정한다(승격 전 disk 재확인 지시를 brief에 포함).
- **Work Item 전이:** W1 `[x]` 완료. W2(S) `[>]` active. W3(A)는 `[ ]` open 유지. S/A는 설계상 병렬 dispatch 가능하나, 단일 next pointer 구조 규칙(`work-items-rules.md`)상 W2를 active로 표기하고 W3도 즉시 착수 대상으로 둔다.
- **다음:** W2/W3 Codex draft dispatch(S/A 병렬). L은 S/A flag 회수 후 착수.

## 2026-06-22 · W2 완료 — spec split readiness map draft (Codex producer)

Task brief: `logs/W10-S-task.md`

W2는 `docs/specs/aiox-a2a.md`의 split readiness map draft만 산출했다. **body split, owner
본문 수정, decision 생성, source map 수정은 하지 않았다.** `docs/specs/AGENTS.md`의
Section Stub 방식에 따라 future split은 원본 `aiox-a2a.md`를 compatibility index/stub
holder로 남기고, slice 파일에 기존 § heading을 유지하는 방식이 가장 안전하다.

**공통 출력 표:**

| Current section | Proposed slice | Anchor preservation | Inbound refs | Split readiness | Notes / flags |
| --------------- | -------------- | ------------------- | ------------ | --------------- | ------------- |
| §2 Glossary | `aiox-a2a-glossary.md` 또는 index intro 부록 | 원본 §2 heading stub 유지 + slice에 동일 heading 보존. 용어가 여러 slice에서 쓰이므로 원본 index에도 요약/링크 유지 | none found in live `docs/plans/plan` grep | ready | `Current Contract`/`Target Contract` 혼합 용어. 독립 파일 가능하지만 너무 짧아 index-keep도 허용 |
| §3 Layer model | `aiox-a2a-layer-model.md` 또는 index overview | 원본 §3 stub 유지. 전체 문서 구조를 설명하므로 index에도 축약본 유지 | none found in live grep | index-keep | `Target Contract`; split 후에도 overview 역할이 강함 |
| §3.1 Runtime config / profile namespace | `aiox-runtime-profile-namespace.md` | 원본 §3.1 stub 유지 + slice에 동일 heading. Current code cites는 slice로 이동 | none explicit to §3.1; product/spec whole-doc refs only | ready | `Current Contract` for profile/socket, `Implementation Gap` for DB path wiring. `docs/aiox/mcp-scope-and-daemon-namespace.md` absorption과 연결되지만 final disposition은 L 소유 |
| §4 A2A protocol과 message lifecycle | `aiox-message-lifecycle.md` umbrella | 원본 §4 stub 유지. §4.1~§4.5 각각 deep-link stub도 유지해야 함 | `plans/post-mvp/envelope-metadata.plan.md:6,8,17,54,60,227`; `plans/post-mvp/codex-structured-metadata-spike.plan.md:6,9,17`; `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md:19,109`; `docs/decisions/claude-channel-trust-and-registration.md:20,33` | ready | `Target Contract` with explicit `Implementation Gap` caveats. Existing decision already covers much WHY |
| §4.1 Canonical envelope v1 | `aiox-message-envelope.md` | 원본 §4.1 stub 유지 + slice heading. Example and field table move together | same §4 inbound cluster; no separate live §4.1 inbound found outside spec | ready | `Target Contract`; schema/input choices include G1 review notes but not separate decision flag from W2 |
| §4.2 Routing and reply correlation | `aiox-routing-correlation.md` | 원본 §4.2 stub 유지. Keep source-only routing and current caveats together | same §4 inbound cluster | ready | `Target Contract` + `Implementation Gap`; open correlated reply authorization is already in spec and existing decision sources |
| §4.3 Delivery, acknowledgement, retry | `aiox-delivery-reliability.md` | 원본 §4.3 stub 유지 because decisions link directly to §4.3 | `docs/decisions/claude-channel-trust-and-registration.md:20,33`; internal refs in spec | ready | `Target Contract` + `Open Issue` for retry defaults/passive ack timeout |
| §4.4 Baseline error model and defaults | `aiox-error-defaults.md` or with delivery reliability | 원본 §4.4 stub 유지 | internal refs only (`docs/specs/aiox-a2a.md:839`) | ready | `Target Contract`; short enough to merge with reliability slice if file count is a concern |
| §4.5 Reference runtime persistence minimum | `aiox-runtime-persistence-minimum.md` | 원본 §4.5 stub 유지; code cite caveats move with section | no separate live inbound found | ready | `Target Contract` + `Implementation Gap`; overlaps pre-validation Archive Gate input, final disposition belongs L |
| §5 Adapter (4-slot + capability tier) | `aiox-adapter-model.md` | 원본 §5 stub 유지; matrix and caveats must move together | `plans/post-mvp/channel-boot-surface.plan.md:6,8,14`; `plans/post-mvp/adapter-dispatch-registry.plan.md:6,8,14`; `plans/post-mvp.plan.md:72,103`; `docs/decisions/claude-channel-trust-and-registration.md:25,33` | ready | `Target Contract` + `Implementation Gap`; source map has adapter/architecture decision candidates for L, W2 only flags none new |
| §6 Compose (declarative composition) | `aiox-compose-contract.md` | 원본 §6 stub 유지 | `plans/post-mvp.plan.md:107`; `history/58...:232`; legacy PRD/source map references | ready | `Committed target`/`Deferred`; no current implementation. Could stay spec because it is external config contract, with architecture details excluded |
| §7 Capability와 sandbox | `aiox-capability-policy.md` | 원본 §7 stub 유지 + §7.1/§7.2 deep stubs | `plans/post-mvp.plan.md:105`; `history/58...:227-228`; `logs/2026-06-11-aiox-제품-방향-질의응답.md` legacy discussion | ready | `Target Contract` + `Implementation Gap`; capability vs OS sandbox split is decision-worthy in source map, final L |
| §7.1 Claude/Codex projection feasibility | `aiox-runtime-projection-feasibility.md` or under capability slice | 원본 §7.1 stub 유지. Date/version-sensitive source references should stay visible in slice | no direct live inbound outside spec found | ready | `Current Contract` for fixed projections, `Target Contract` for compiler generalization, `Open Issue` for Codex per-agent skill/plugin isolation |
| §7.2 Trust boundary and data handling | `aiox-trust-data-handling.md` | 원본 §7.2 stub 유지 | no direct live inbound outside spec found | ready | `Target Contract` + `Implementation Gap`; security/retention claims need architecture/code pairing in actual split |
| §8 Federation / remote | `aiox-federation-remote.md` | 원본 §8 stub 유지 | `plans/post-mvp.plan.md:101`; history/legacy refs. Note: line 101 may be a stale section pointer for envelope/lifecycle | ready | `Deferred`/`Target`. Cross-Owner Effects flag added for `plans/post-mvp.plan.md:101` possible §4 vs §8 mismatch |
| §9 Open / deferred | `aiox-open-deferred.md` or index appendix | 원본 §9 stub 유지; open questions benefit from index visibility | `plans/post-mvp/codex-structured-metadata-spike.plan.md:6,9,17`; `plans/post-mvp.plan.md:71`; legacy plan refs | ready | `Open Issue`/`Deferred`; keep visibly linked from index so open items do not disappear |

**README per-document 결론:**

[Opinion] 별도 `docs/specs/README.md`는 split 실행 시점에 필요하다. 현재는 단일
`aiox-a2a.md`가 owner 역할과 status vocabulary를 intro에서 설명하지만, split 후에는 사람이
`docs/specs/`에 들어왔을 때 어떤 slice가 protocol, adapter, compose, capability, federation,
open issues를 소유하는지 한 화면에서 봐야 한다. 단 README는 durable contract를 복사하지
말고, `AGENTS.md`는 agent 규칙만 소유하도록 유지한다. 원본 `aiox-a2a.md`는 compatibility
index/stub holder, README는 directory navigation 역할로 분리하는 편이 낫다.

**검증/관찰:**

- [Fact] `docs/specs/aiox-a2a.md:1-40` intro already declares source §0/§1/§10~§13 owner split
  and says §2~§9 are the protocol contract/open-deferred body.
- [Fact] `docs/specs/AGENTS.md:23-34` requires preserving old section IDs through stubs during
  split; therefore future split must not delete §2~§9 headings from `aiox-a2a.md`.
- [Fact] scoped inbound grep over `docs`, `plans`, `plan`, `README.md`, `AGENTS.md` found live
  external refs primarily to §4, §5, §6, §7, §8 and §9. No live explicit inbound refs to §2 or
  §3/§3.1 were found outside whole-document references.
- [Fact] code/test grep found current symbols matching spec caveats: profile/socket path
  (`src/config/paths.ts:89-120`), current message/delivery storage (`src/core/messages.ts`,
  `src/store/schema.ts:58`), reply `parentMessageId`, `AdapterInjectResult`, pair slots,
  fixed `mcp_servers.aiox`, and no obvious federation implementation files.
- [Inference] `plans/post-mvp.plan.md:101` likely needs later owner review: it labels Stage 1
  as A2A envelope/lifecycle but points to spec §8 rather than §4. W2 flagged only; no plan edit.

**Workflow retrospective:**

- Task brief + controlling log structure worked well for S: the active pointer made it clear to
  start with W2, and S could flag a cross-owner issue without taking L/plan ownership.
- Portable candidate for W10 closeout: for split-map batches, run inbound grep in two tiers
  (`docs/plans/plan` live owner refs vs `logs/prd/history` legacy refs). A single repo-wide grep
  is too noisy and can blur live anchor preservation with legacy evidence.

**Next:** W3 architecture split readiness map (`logs/W10-A-task.md`) is now active. W10-L starts
after S/A flags are collected.

## 2026-06-22 · W2 checker 검증 — spec split readiness map PASS (Claude checker)

Task brief: `logs/W10-S-task.md`. 분업 = Codex draft → Claude checker. 이 블록은 W2 producer
draft(이 로그 line 178-242)의 모든 `[Fact]`/`[Inference]`를 1차 source에서 재검증한 결과다.
checker는 owner body·architecture(W3)·decision·source map을 수정하지 않았다.

**Verdict: PASS.** split map은 정확하며 L과 향후 split 실행자가 그대로 소비 가능하다.

**재검증한 주장 (모두 일치):**

- [Fact] anchor inventory 정확. `grep -nE '^#{1,4} '`로 §2~§9 16개 heading의 줄 위치가
  task brief 표(`logs/W10-S-task.md:50-67`)와 정확히 일치(§2/44 … §9/801), 총 870줄.
  draft가 "원본 §2~§9 heading을 stub으로 보존" 전제로 삼은 anchor 집합이 실재한다.
- [Fact] live-tier inbound ref `file:line` 전수 확인. §4: `plans/post-mvp/envelope-metadata.plan.md`
  6/8/17/54/60/227 + `codex-structured-metadata-spike.plan.md` 6/9/17 + decision
  `a2a-message-lifecycle-envelope-and-correlation.md` 19/109 + `claude-channel-trust-and-registration.md`
  20/33 — 모두 §4(또는 §4.3) 참조 확인. §5: `channel-boot-surface.plan.md` 6/8/14 +
  `adapter-dispatch-registry.plan.md` 6/8/14 + `plans/post-mvp.plan.md` 72/103 + channel-trust 25/33 —
  모두 §5 참조 확인. §6→`post-mvp.plan.md:107`, §7→:105, §8→:101, §9→:71 + spike 6/9/17 — 확인.
- [Fact] §4.4 inbound "internal refs only (`docs/specs/aiox-a2a.md:839`)" 확인. line 839는
  §9 본문이 "기본 delivery는 §4.4에 따라 queue"로 §4.4를 역참조하는 내부 self-ref다.
- [Fact] §2/§3/§3.1 live explicit inbound 부재 확인. `aiox-a2a §(2|3|3.1)` 전역 grep 결과
  spec 자신·legacy 외 live 참조 없음 → draft Evidence Ledger(line 46) 주장과 일치.
- [Fact] code spot-check 인용 전부 실재. `src/config/paths.ts`(121줄, profile/socket path +
  DB path "not yet wired" 주석 → Implementation Gap 라벨 근거), `src/store/schema.ts`
  `message_deliveries` 테이블, `src/core/messages.ts` `parentMessageId`, `src/adapters/contract.ts`
  `AdapterInjectResult`, `src/adapters/codex/mcp-server.ts` `mcp_servers`, federation 구현 파일 부재
  (`federation|remoteWorker` grep empty → §8 Deferred/Target 라벨 근거).
- [Fact] Cross-Owner Effects flag(`plans/post-mvp.plan.md:101`) 정당함. line 101은 row 라벨이
  "Stage 1 — A2A envelope/lifecycle"인데 포인터는 §8(Federation/remote)이다. 반면 envelope/lifecycle
  owner는 §4다(`envelope-metadata.plan.md:8` `implements: §4`, decision
  `a2a-message-lifecycle:19/109` → §4 outcome). 인접 Stage 2/3/4는 §5/§7/§6로 라벨과 정합.
  → flag는 근거 있음. **scope상 W2는 flag만, 수정 안 함**(plan-stage/L owner).

**L이 회수할 checker 보정 (blocking 아님):**

- [Inference] history/58 §6/§7 inbound는 **legacy-tier narrative지 live anchor 의존성이 아니다.**
  draft가 §6 row에 `history/58...:232`, §7 row에 `history/58...:227-228`을 적었는데, 확인 결과
  (a) history/58의 실제 `aiox-a2a` **파일명** 토큰(line 9/188/213)은 모두 legacy
  `prd/post-mvp/aiox-a2a-spec.md`를 가리키고, (b) line 227-232는 "…는 spec §7/§5/§6에 둔다"식
  bare 서술이다(현행 owner 파일 anchor 링크 아님). 따라서 split 시 깨지는 live inbound로
  세지 말 것. 이는 draft 자신의 retrospective(line 237-239, 2-tier grep: live owner refs vs
  legacy refs) 권고와 일치한다 — Inbound refs 열이 tier를 inline 표기하지 않았을 뿐 분류는 옳다.
  보완: history/58 line 230-231에 §5 narrative도 있으나 §5는 live ref가 충분해 영향 없음.
- [Opinion] 사소한 cite-range nit: draft 검증부가 `docs/specs/AGENTS.md:23-34`를 "section ID
  stub 보존 요구" 근거로 인용했는데, 그 규칙은 §3(`AGENTS.md:25-28`)이 소유한다(23은 status-tag
  Note, 30-34는 §4 확인 절차). substance는 정확, 줄 범위만 넓다.

**Work Item 상태:** W2 `[x]` 유지(checker PASS로 확정), W3 `[>]` active 유지. checker가 별도
전이할 항목 없음. README per-document 결론은 [Opinion]이라 checker가 fact 검증 대상 아님 —
판단은 합리적(split 시 directory navigation README 필요, durable contract 복사 금지)이며 이의 없음.

**다음:** W3(architecture split map, `logs/W10-A-task.md`) Codex draft 진행 중. W10-L은 S/A flag
회수 후 착수하며, 위 history/58 tier 보정과 Cross-Owner flag를 Phase 1 입력으로 받는다.

## 2026-06-22 · W3 draft — architecture split readiness map (Codex producer)

Task brief: `logs/W10-A-task.md`.

W3는 `docs/architecture/local-agent-runtime.md`의 architecture split readiness map draft만
산출했다. **body split, owner 본문 수정, decision 생성, source map 수정은 하지 않았다.**
Inbound reference는 W2 checker 보정 사항을 반영해 live tier(`docs`/`plans`/`plan`/root entry)
와 legacy tier(`logs`/`prd`/`history`)를 분리했다.

**6모듈 경계 vs `src/` 대조 결론:**

- [Fact] 사용자-facing 6모듈 모델은 overview로 유효하다: daemon, store/core, Claude adapter,
  Codex adapter, routing/FSM, CLI/diagnostics가 `src/` 디렉터리 경계와 대체로 대응한다.
- [Inference] 실제 split 파일은 6개로만 고정하지 않는 편이 안전하다. `src/store/*`/`src/core/*`
  data model과 `src/daemon/state.ts` orchestration/routing은 서로 다른 유지보수 경계이고,
  §10~§12 catalog/smoke는 여러 모듈을 가로지르는 lookup/reference 성격이라 별도 slice가 낫다.
- [Fact] `src/daemon/state.ts`가 attach, API 구현, channel registration, dispatch, Codex target
  resolution, events까지 많이 소유한다. 따라서 "daemon" slice 하나에 모두 넣으면 monolith가
  재생산된다. Split executor는 daemon lifecycle/API와 routing/FSM을 분리해야 한다.

**공통 출력 표:**

| Current section | Proposed slice | Anchor preservation | Inbound refs | Split readiness | Notes / flags |
| --------------- | -------------- | ------------------- | ------------ | --------------- | ------------- |
| §0 Purpose | Root compatibility index `local-agent-runtime.md` | 원본 §0 heading 유지. Split 후에도 role/status vocabulary와 slice TOC를 root에 둔다 | live: `docs/specs/aiox-a2a.md:10`, `docs/decisions/client-orchestrator-runtime-pivot.md:34`; legacy: source-map/task refs | index-keep | `Current`/`As-built` overview. 6모듈 설명은 여기서 사람용 map으로 유지 |
| §1 Process Topology | `local-runtime-process-topology.md` | 원본 §1 stub 유지 + slice에 동일 heading. Mermaid/ASCII topology는 한 파일로 이동 | live: `docs/decisions/codex-per-agent-app-server.md:28,42` line refs to process/lifecycle; legacy: `docs/aiox/mvp-architecture.md` stale §1 | ready | `Current`/`As-built`. Code boundary matches `src/daemon/run.ts`, `src/cli/invocation.ts`, `src/adapters/*`; process topology is cross-module overview, not owned by one `src/` dir |
| §2 SQLite Schema | `local-runtime-store-and-repositories.md` | 원본 §2 stub 유지. Schema table + migration invariant move with §3 | live: `docs/decisions/pair-slot-generalization.md:105`; legacy/task refs | ready | `Current`/`As-built` + `Current gap` for `:memory:` and unwired recovery. Matches `src/store/schema.ts:14-82`, migration `:84-135`, daemon in-memory open `src/daemon/run.ts:24-26` |
| §3 Repositories | `local-runtime-store-and-repositories.md` | 원본 §3 stub 유지; pair attach/rollback sentinel links to routing slice | live: `docs/decisions/pair-slot-generalization.md:105`; legacy/task refs | ready | `Current`/`As-built`. Matches `src/store/repositories/*`, `src/store/transaction.ts`, and pair slot logic in `src/store/repositories/pairs.ts:76-263`. Keep with §2 because DB invariant and repository tx boundary are one code boundary |
| §4 Daemon Lifecycle and Socket Transport | `local-runtime-daemon-transport-api.md` | 원본 §4 stub 유지; §4.1~§4.3 deep stubs preserved | live: `docs/decisions/daemon-autostart-and-channel-identity.md:14,29`, `docs/decisions/uds-transport-and-framing-contract.md:21-24`; legacy/task refs | ready | `Current`/`As-built`. Matches `src/daemon/run.ts`, `src/daemon/server.ts`, `src/daemon/socket-transport.ts`, `src/config/paths.ts`. Keep lifecycle and UDS together because they share daemon process boundary |
| §4.1 Daemon Lifecycle | `local-runtime-daemon-transport-api.md` | 원본 §4.1 stub 유지 | live: `daemon-autostart-and-channel-identity.md:14,29`; legacy none material | ready | `Current`/`As-built`. `runDaemonProcess` opens DB, creates server, wraps stop, and installs signals (`src/daemon/run.ts:24-87`). Auto-start is actually CLI-owned (`src/cli/invocation.ts:157-167`) but documented here as runtime behavior |
| §4.2 Socket Transport | `local-runtime-daemon-transport-api.md` | 원본 §4.2 stub 유지 | live: `uds-transport-and-framing-contract.md:21-24`; legacy none material | ready | `Current`/`As-built`. Matches `src/daemon/socket-transport.ts`; no 6-module mismatch |
| §4.3 sendMessage end-to-end | `local-runtime-routing-and-delivery.md` or daemon API slice cross-link | 원본 §4.3 stub 유지 and link to routing slice | live: no direct §4.3 architecture inbound found; spec/decision refs target spec §4.3, not architecture | ready | `Current`/`As-built`. Although nested under daemon transport, sequence is routing/FSM-owned in code (`src/daemon/state.ts:1761-1864`), so split should move detailed sequence near §8 while §4 stub links there |
| §5 Daemon API Surface | `local-runtime-daemon-transport-api.md` plus links to adapter/routing slices | 원본 §5 stub 유지 | live: `docs/decisions/codex-per-agent-app-server.md:25`, `docs/aiox/mvp-architecture.md` stale §5; legacy/source-map refs | ready | `Current`/`As-built`. API interface matches `src/daemon/api.ts:49-87`; implementations live in `src/daemon/state.ts`. Row table can stay API slice, but per-method mechanics should link to store/routing/adapter slices |
| §6 Claude Adapter | `local-runtime-claude-adapter.md` | 원본 §6 stub 유지; §6.1~§6.5 deep stubs preserved | live: `docs/decisions/claude-channel-plugin-default.md:57`, `docs/decisions/claude-channel-trust-and-registration.md:34`; legacy stale §6 refs | ready | `Current`/`As-built` + `Current gap` for unauthenticated `/send` and no `claude_channel_disconnected`. Matches `src/adapters/claude/*` and daemon channel maps in `src/daemon/state.ts:521-524, 926-1042` |
| §6.1~§6.5 Claude topology/launch/ingress/injection/sequence | `local-runtime-claude-adapter.md` | 원본 §6.x stubs 유지 | live: same §6 cluster; `claude-channel-trust-and-registration.md:34` cites §6.1-6.4 | ready | `Current`/`As-built`. CLI launch belongs to `src/cli/invocation.ts:200-258`; channel server tools/HTTP registration in `src/adapters/claude/channel-server.ts:258-525`; injector path in `src/adapters/claude/injector.ts`. This is a clean adapter slice |
| §7 Codex Adapter | `local-runtime-codex-adapter.md` | 원본 §7 stub 유지; §7.1~§7.10 deep stubs preserved | live: `codex-per-agent-app-server.md:19,22,25,28,42` line refs; legacy stale §7 refs | ready | `Current`/`As-built` + `Current gap` P2-3/P2-12. Matches `src/adapters/codex/*`, daemon runtime map in `src/daemon/state.ts:519-528`, attach path `state.ts:631-744` |
| §7.1~§7.4 runtime/attach/resume/proxy | `local-runtime-codex-adapter.md` | 원본 §7.x stubs 유지 | live: `codex-per-agent-app-server.md:19,22,28,42`; legacy/source-map refs | ready | `Current`/`As-built`. Runtime/app-server/proxy boundary matches `src/adapters/codex/runtime.ts:109-366`, proxy observation `src/adapters/codex/proxy.ts:46-206`; no split blocker |
| §7.5~§7.8 active thread/injection/delivery/MCP ingress | `local-runtime-codex-adapter.md` with cross-link to routing slice | 원본 §7.x stubs 유지 | live: `codex-per-agent-app-server.md:25,42`; legacy/source-map refs | ready | `Current`/`As-built`. Adapter code (`src/adapters/codex/injector.ts`, `mcp-server.ts`) and daemon routing code (`src/daemon/state.ts:1396-1697, 1711-1759`) are intertwined. Keep Codex-specific mechanics here, but dispatch/FSM overview belongs in §8 slice |
| §7.9~§7.10 lifecycle/ownership/sequence | `local-runtime-codex-adapter.md` | 원본 §7.x stubs 유지 | live: `codex-per-agent-app-server.md:28,42`; legacy/source-map refs | ready | `Current`/`As-built` + `Current gap` runtime failure callback unwired. Matches `src/adapters/codex/runtime.ts:180-209, 264-286` and `src/daemon/state.ts:2024-2042` |
| §8 Cross-Cutting Message Routing | `local-runtime-routing-and-delivery.md` | 원본 §8 stub 유지; §8.1~§8.6 deep stubs preserved | live: `docs/decisions/uds-transport-and-framing-contract.md:25,39`, `docs/decisions/pair-slot-generalization.md:105`; legacy `docs/aiox/mvp-architecture.md` stale §8 | ready | `Current`/`As-built` + `Deferred` router registry. Actual code boundary is `src/core/*`, `src/adapters/router.ts`, and `src/daemon/state.ts:1246-1864, 2099-2135`. This should be separate from daemon transport because it is the cross-adapter data flow |
| §8.1~§8.6 domain/FSM/parent/pair routes | `local-runtime-routing-and-delivery.md` | 원본 §8.x stubs 유지 | live: same §8 cluster; legacy/source-map refs | ready | `Current`/`As-built`. Domain objects in `src/core/*`; route creation `src/daemon/state.ts:2099-2135`; send tx `state.ts:1761-1864`; pair repo `src/store/repositories/pairs.ts:76-263`. This is the clearest 6-module mismatch: user "daemon" and "store/core" both participate, but split should be routing-owned |
| §9 CLI / Invocation / Doctor / Status | `local-runtime-cli-and-operator-surfaces.md` | 원본 §9 stub 유지; §9.1~§9.3 deep stubs preserved | live: `docs/decisions/daemon-autostart-and-channel-identity.md:14,29`; legacy `docs/aiox/step-6-cli-decisions-walkthrough.md:6` stale old filename | ready | `Current`/`As-built`. Matches `src/cli/parse.ts`, `src/cli/invocation.ts:131-310`, `src/cli/doctor.ts`, `src/cli/format.ts`, `src/bin/aiox.ts`. Clean CLI/operator slice |
| §10 Consolidated Typed Error Catalog | `local-runtime-errors-events-smoke.md` or reference appendix | 원본 §10 stub 유지; §10.1~§10.6 deep stubs preserved | live: no direct live inbound to architecture §10 found; legacy stale refs | ready | `Current`/`As-built` catalog. Cross-cuts daemon/adapters/router/socket/CLI; keep as appendix/reference slice to avoid duplicating into each module |
| §11 Consolidated Events Catalog | `local-runtime-errors-events-smoke.md` | 원본 §11 stub 유지 | live: no direct live inbound found; legacy `docs/aiox/mvp-architecture.md:1067` stale self-ref | ready | `Current`/`As-built` + Implementation-only declared-but-unemitted items. Matches `src/core/events.ts` and event append sites in `src/daemon/state.ts`; appendix slice is appropriate |
| §12 Implementation Smoke Matrix | `local-runtime-errors-events-smoke.md` or `local-runtime-validation.md` | 원본 §12 stub 유지 | live: no direct live inbound found; legacy/source-map refs | ready | `Current` validation provenance. Tests are under `tests/unit/*`, `tests/integration/*`; this is validation evidence, not a runtime module. Could become `validation` slice if file count is acceptable |
| §13 Known Gaps / Post-MVP | `local-runtime-gaps-and-targets.md` | 원본 §13 stub 유지. Preserve sub-boundary Current Gaps vs Target/Proposed/Deferred | live: source-map/W10 task refs; no durable live owner ref found | ready | Mixed `Current gap`, `Target`/`Proposed`, `Deferred`. Keep separate so as-built slices stay current-focused. W10-L owns legacy §13 decision/disposition candidates; W3 flags no final decision |
| §14 Authority Links | Root compatibility index or `local-runtime-gaps-and-targets.md` appendix | 원본 §14 stub 유지 | live: no direct live inbound found; legacy/source-map refs | index-keep | `Current` authority map. Keep in root index so split readers know source hierarchy. Also helps preserve stale/legacy source warnings |

**README per-document 결론:**

[Opinion] split 실행 시 `docs/architecture/README.md`는 필요하지 않고, root
`docs/architecture/local-agent-runtime.md` compatibility index가 사람용 진입점을 맡는 편이 낫다.
이유는 현재 `docs/architecture/` 안에 durable architecture owner가 사실상 이 monolith와
documentation-system뿐이고, split 후에도 `local-agent-runtime.md`가 §0~§14 anchor stubs,
status vocabulary, slice TOC, authority links를 가질 수 있기 때문이다. Directory README를 별도로
만들면 root index와 navigation 역할이 중복된다. 다만 향후 architecture owner 문서가 3개 이상으로
늘면 README 필요성을 재검토한다.

**Inbound reference inventory 요약:**

- [Fact] live tier는 대부분 `docs/decisions/*`가 `local-agent-runtime.md` 또는 line/section을
  outcome owner로 참조한다. 특히 §4.1/§9.1(daemon autostart), §4.2(socket transport),
  §6.1~§6.4(Claude channel), §7.2/§7.6/§7.9(Codex app-server/ack/lifecycle), §8 routing/fan-out,
  §0/§2/§3/§8(pair slot generalization)가 anchor 보존을 요구한다.
- [Fact] `docs/specs/aiox-a2a.md:10`은 architecture owner 전체를 참조한다. Split 후에도 root
  `local-agent-runtime.md` index가 남으면 spec inbound는 깨지지 않는다.
- [Fact] legacy tier에는 `docs/aiox/mvp-architecture.md` stale old architecture snapshot,
  `docs/aiox/step-6-cli-decisions-walkthrough.md` old filename reference, source-map rows,
  W task briefs, `prd/post-mvp/aiox-a2a-spec.md` rationale references가 포함된다. 이들은 live
  anchor preservation과 별도로 W10-L source-map/Archive Gate 입력으로 다룬다.

**검증/관찰:**

- [Fact] `src/` structure confirms durable module boundaries: `src/daemon/*`, `src/store/*`,
  `src/core/*`, `src/adapters/claude/*`, `src/adapters/codex/*`, `src/cli/*`, `src/bin/aiox.ts`.
- [Fact] `tests/` structure mirrors these surfaces: daemon, store, adapters, CLI, config, core,
  and one integration split test. This supports split by code boundary rather than by prose length.
- [Fact] Current implementation claims in §2/§3 line up with `src/store/schema.ts:14-82`,
  `applyMigration1` at `src/store/schema.ts:84-135`, and pair attach slot logic at
  `src/store/repositories/pairs.ts:76-263`.
- [Fact] Current daemon lifecycle/API claims line up with `src/daemon/run.ts:24-87`,
  `src/daemon/server.ts:32-75`, `src/daemon/api.ts:49-87`, and `src/daemon/state.ts:510-1190`.
- [Fact] Current routing/FSM claims line up with `src/daemon/state.ts:1246-1697`,
  `runSendMessageTransaction` at `src/daemon/state.ts:1761-1864`, and bidirectional pair route
  creation at `src/daemon/state.ts:2099-2135`.
- [Fact] Claude adapter claims line up with CLI launch `src/cli/invocation.ts:200-258`, channel
  tools/HTTP/registration `src/adapters/claude/channel-server.ts:258-525`, and daemon channel RPCs
  `src/daemon/state.ts:926-1042`.
- [Fact] Codex adapter claims line up with runtime/proxy code `src/adapters/codex/runtime.ts:109-366`,
  `src/adapters/codex/proxy.ts:46-206`, and daemon attach/dispatch integration
  `src/daemon/state.ts:631-744, 1396-1697, 2024-2042`.
- [Inference] No W3 body patch is needed now. The main potential cleanup (`docs/aiox/step-6...`
  stale old architecture filename) belongs to W10-L/source-map cleanup or later physical disposition,
  not this producer draft.

**Decision/disposition flags for L:**

- [Inference] W3 found no new decision candidate beyond existing W10-L seed candidates. The
  architecture debt rationale in `prd/post-mvp/aiox-a2a-spec.md` §13 remains W10-L's decision check,
  especially whether `state.ts` orchestration breadth should be recorded as a decision or only as
  future refactor target.
- [Inference] stale legacy architecture refs (`docs/aiox/mvp-architecture.md`,
  `docs/aiox/step-6-cli-decisions-walkthrough.md`) are source-map cleanup inputs, not live
  architecture split blockers.

**Workflow retrospective:**

- The 2-tier inbound grep should be mandatory for split-map batches. In architecture, legacy files
  contain many historical `§N` mentions that look like live anchors but often point to stale
  `docs/aiox/mvp-architecture.md` or old PRD sections.
- Portable candidate for W10 closeout: split maps should first decide "root compatibility index vs
  directory README". If the old monolith can safely become an anchor-preserving index, adding README
  may be duplicate navigation.

**Next:** W3 checker validation. Checker should focus on (a) whether the source-line claims above
match current `src/`, (b) whether live/legacy inbound tiering is complete enough, and (c) whether
the proposed routing/FSM split from daemon transport is justified. W10-L starts only after W3 checker
accepts or corrects this draft.

## 2026-06-22 · W3 checker 검증 — architecture split readiness map PASS (Claude checker)

Task brief: `logs/W10-A-task.md`. 분업 = Codex draft → Claude checker. 이 블록은 W3 producer
draft(이 로그 line 302-419)의 `[Fact]`/`[Inference]`/`[Opinion]`을 1차 source에서 재검증한
결과다. checker는 owner body·spec·decision·source map을 수정하지 않았다(git 확인: owner
body·code 미수정, `logs/`만 변경).

**Verdict: PASS.** split map은 정확하며 L과 향후 split 실행자가 그대로 소비 가능하다. draft가
checker에 지정한 초점 (a)src line 일치, (b)live/legacy tiering, (c)routing/FSM 분리 정당성을 모두
확인했다. legacy-tier rename-drift 전수만 아래 보정으로 L에 넘긴다(blocking 아님).

**재검증한 주장 (모두 일치):**

- [Fact] anchor inventory 정확. `grep -nE '^#{1,4} '`로 §0~§14 줄 위치가 task brief 표
  (`logs/W10-A-task.md:53-77`)와 정확히 일치(§0/25 · §1/52 · §2/121 … §13/1132 · §14/1155),
  서브섹션 포함 헤딩 위치도 일치, 총 1181줄.
- [Fact] 인용 src 파일 전수 실재, 인용 line 범위 전부 파일 경계 내. 핵심 함수 위치 정확:
  `runDaemonProcess` run.ts:24-87(`new Database(":memory:")` line 25 → §2 `:memory:` Current gap
  근거), `applyMigration1` schema.ts:86, `DaemonApi` interface api.ts:51-87, pair slot(a/b)
  pairs.ts:76-263, `createDaemonState` state.ts:510, `registerClaudeChannel` 926 /
  `registerCodexChannel` 1044, `dispatchToPairPeers` 1246, `injectMessageIntoCodexTarget`
  1396-1697, `authorizeCodexIngress` 1711-1759, `runSendMessageTransaction` 1761-1864(정확),
  `defaultAttachCodexRuntime` 2024-2042, `createBidirectionalPairRoutes` 2099-2135(정확).
- [Fact] **routing/FSM 분리 정당성(checker focus c) 확인.** `src/daemon/state.ts`(2218줄)가
  daemon-API channel 등록(`register{Claude,Codex}Channel`)과 cross-cutting routing
  (`dispatchToPairPeers`/`runSendMessageTransaction`/`createBidirectionalPairRoutes`)을 함께
  소유한다. "daemon" slice 하나에 모두 넣으면 monolith가 재생산된다는 draft 판단은 코드 경계로
  뒷받침된다. "6모듈 overview는 유효하나 store/routing은 daemon과 분리"라는 inference도 정합.
- [Fact] **live-tier inbound(checker focus b) 전수 일치.** `local-agent-runtime` 전역 grep 결과
  live 참조 = decision 7건(`client-orchestrator-runtime-pivot:34`, `codex-per-agent-app-server`
  19/22/25/28/42, `daemon-autostart-and-channel-identity` 14/29, `claude-channel-plugin-default:57`,
  `claude-channel-trust-and-registration:34`, `uds-transport-and-framing-contract` 21-25/39,
  `pair-slot-generalization:105`) + spec `aiox-a2a.md:10` whole-doc. §10~§14 no-live-inbound 확인.
  현재 파일명(`local-agent-runtime`)으로 docs/aiox·prd·history grep은 비어 있음 → draft의 2-tier
  분류(live=현재 owner refs, legacy=old 파일명 refs)가 정당함을 뒷받침.
- [Fact] Current gap 주장 전부 코드 확정: (a) §6 unauthenticated `/send` — 인입 핸들러
  `channel-server.ts:438-462`에 인증 검사 전무(token 기계 `AIOX_CLAUDE_CHANNEL_TOKEN`은 채널→daemon
  등록용). (b) §6 no `claude_channel_disconnected` — src에 `codex_channel_disconnected`
  (events.ts:24, state.ts:1084)만, Claude 대응 없음. (c) §7.9-7.10 runtime failure callback
  unwired — `onRuntimeFailed`는 optional이고 `defaultAttachCodexRuntime`(state.ts:2024-2042)가
  전달 안 함 → runtime 실패감지(runtime.ts:264-286 exit/ws-drop → `recordRuntimeFailure`)가 daemon
  `recordCodexRuntimeFailed`로 propagate 안 됨.
- [Fact] rename 확정: `docs/architecture/mvp-architecture.md` 부재 → `local-agent-runtime.md`로
  rename됨. legacy 참조가 현재 파일명으로 비어 있는 이유 = 모두 old 파일명을 가리킴.
- [Fact] tests/가 src 표면 미러링(adapters/cli/config/core/daemon/store·repositories/spikes), draft의
  "one integration split test" = `tests/integration/daemon-client-split.test.ts` 정확.
- [Fact] git 확인: producer가 owner body(architecture/specs/decisions)·code(src/tests) 미수정.
  변경은 `logs/`만 → body split·owner body 미수정 조건 충족.

**L이 회수할 checker 보정 (blocking 아님):**

- [Fact] **legacy rename-drift 전수가 draft 열거보다 많다.** draft는 stale 예시로
  `step-6-cli-decisions-walkthrough.md`와 `docs/aiox/mvp-architecture.md`(58KB stale snapshot)만
  명시했으나, 사라진 `docs/architecture/mvp-architecture.md`를 가리키는 docs/aiox rename-drift는
  **6 파일**이다: `codex-thread-focus-and-loaded-list.md:10`, `mcp-scope-and-daemon-namespace.md:5`,
  `observation-asymmetry-and-d7-pivot.md:9`, `round-4-tui-smoke-check.md:6,595`,
  `step-14-codex-thread-mismatch-discovery.md:110`, `step-6-cli-decisions-walkthrough.md:6`. 추가로
  `prd/mvp/aiox-mvp-spec.md:7`은 `docs/aiox/mvp-architecture.md`(stale 복제본)를 참조한다. 이는
  split-readiness blocker가 아니다(legacy tier는 anchor preservation을 결정하지 않음) — W10-L의
  source-map/rename-drift cleanup 입력이다. W10-L scope가 이미 docs/aiox sweep을 소유하므로 목록
  완성만 넘긴다.
- [Opinion] 사소한 cite-range 폭: 일부 범위가 1~2줄 앞에서 시작(api.ts:49는 import 줄, 실제 interface
  51-87; schema.ts:84는 닫는 brace, `applyMigration1` 정의는 86). substance 정확, 범위만 넓음. W2
  checker의 cite-range nit와 동급.
- [Inference] §5 row의 `codex-per-agent-app-server.md:25` inbound 귀속은 부정확하다. :25는
  architecture `:628-633`/`:826`(§7.6 injection·§8.2 atomicity의 ack 계약)을 가리키지 §5(298-327)가
  아니다. 단 그 decision은 §7 row에도 올바로 들어가 있고, §5는 ack 관련 `receiveCodexReply` API를
  포함하므로 느슨한 연결은 방어 가능. non-blocking, L 참고용.

**Work Item 상태:** W3 `[>]`→`[x]`(checker PASS로 확정). S/A 두 batch 모두 PASS이므로 next = W10-L.
checker가 별도 전이할 항목 없음. README per-document 결론(split 시 directory README 불필요, root
`local-agent-runtime.md` compatibility index가 진입점)은 [Opinion]이라 fact 검증 대상 아니며 판단
합리적, 이의 없음.

**다음:** W10-L(legacy must-check + Archive Gate + decision 승격 + source map draft, `logs/W10-L-task.md`)
착수. L Phase 1이 S/A flag — W2 Cross-Owner `post-mvp.plan.md:101`(§4 vs §8) + W2 checker의
history/58 tier 보정 + 위 W3 rename-drift 6-file 전수 + §5 inbound nit — 를 회수한다.

## 2026-06-22 · W10-L 세션 분할과 Gemini triage 입력 반영

@user intent:

- W10-L은 작업량이 무거우므로 한 세션에 끝내기보다 세션별 step으로 나눠 진행한다.
- Gemini가 찾아온 기존 로그/decision provenance를 매 세션 참고할 수 있게 기록한다.

**세션별 진행 단위:**

1. L1 / W4-0 Phase 1 — S/A flags + W9 handoff + canonical source map + Gemini triage hypothesis를
   한 입력 세트로 통합한다.
2. L2 / W4-1 Phase 2~3 — `prd/post-mvp/aiox-a2a-spec.md`, `prd/post-mvp/archive/*`,
   `prd/pre-validation/*` 파일군의 self-sufficiency와 Archive Gate를 판정한다.
3. L3 / W4-2 Phase 2~3 — `docs/aiox/*` 파일군의 self-sufficiency, rename-drift cleanup 필요성,
   Archive Gate를 판정한다.
4. L4 / W5 Phase 4 — decision 후보 5건을 `docs/decisions/` disk 현황과 최종 source `file:line`으로
   재확인한 뒤 승격 / 기존 커버로 불필요 / 보강 필요를 판정한다.
5. L5 / W6~W7 Phase 5+closeout — canonical source map 기존 row에 disposition을 append/update하고,
   W10-L/W10 closeout 및 parent W4.5 소비안을 준비한다.

**@gemini report — 검증 전 triage hypothesis:**

- [Unverified input] decision 후보 5건은 모두 신규 decision 생성 없이 기존 decision/gap으로 커버될
  수 있다는 주장.
  - Opaque Worker → `codex-per-agent-app-server` + `a2a-message-lifecycle...`로 커버 가능.
  - D7 Scope Reduction → 이후 proxy 실구현·decision으로 대체된 기각/폐기 설계일 수 있음.
  - architecture debt 3축 + Structured Logger → decision이 아니라 implementation/refactor gap일 수 있음.
  - Step 14 App Server 주입·격리 → `agent-level-mcp-process-scoping` +
    `codex-per-agent-app-server`로 커버되고, `CODEX_HOME` 격리는 rejected/deferred일 수 있음.
  - proxy/app-server hybrid 종합 decision → `codex-per-agent-app-server` +
    `proxy-lazy-observation-cost-model`로 분산 커버 가능.
- [Unverified input] 일부 legacy 파일 검증은 기존 로그 provenance로 단축 가능하다는 주장.
  - `plan/mvp-implementation-checklist.md`, `plan/qa-tracker.md`는 W5/carryover archive와 source map에서
    이미 `archive→delete` 판정이 끝난 항목일 수 있음.
  - `prd/pre-validation/sqlite-restart-recovery-pre-validation.md`는 W7/W9에서 이미 rationale/stale 여부가
    검토된 항목일 수 있음.
  - `docs/aiox/mvp-architecture.md`는 W7에서 stale learning snapshot으로 판정되어 delete-only 후보일 수 있음.

**Codex handling:**

- Gemini 보고는 W10-L의 작업량을 줄이는 **triage index**로 사용한다.
- 단, "decision 5건 신규 생성 0건"과 "재독해 없이 검증 완료"는 아직 확정 fact가 아니다.
- W10-L task brief의 조건을 유지한다: decision 판정 전 `docs/decisions/` 현황을 disk에서 재확인하고,
  source map disposition/Archive Gate 판정 전 최종 source `file:line`을 재확인한다.
- 기존 로그 provenance는 첫 독해 범위를 줄이는 데 사용하되, owner/body/source map을 바꾸는 근거로 쓸 때는
  원본 source와 현행 owner 문서를 최소 대조한다.

**Work Item 전이:**

- W4를 현재 next pointer(`[>]`)로 전환했다.
- W4 아래에 W4-0/W4-1/W4-2 세션별 하위 step을 추가했다. W5/W6/W7은 기존 phase owner로 유지한다.

## 2026-06-22 · W4-0 완료 — W10-L Phase 1 입력 통합

Task brief: `logs/W10-L-task.md`. 이번 블록은 L1/W4-0만 수행한다. **owner body, source map,
decision 문서, legacy 원본은 수정하지 않았다.** 목적은 W4-1/W4-2/W5가 판정할 입력을 한 세트로
고정하는 것이다.

**확인한 사실:**

- `logs/W10-L-task.md` 기준 L batch는 W10-S/A flag를 회수하고 legacy 자료의 self-sufficiency,
  Archive Gate, decision 승격, source map update draft를 단일 판정 권위로 소유한다.
- W9 closeout handoff(`logs/2026-06-21-workspace-reset-W9-release-roadmap-authority.md:664-682`)는
  W10 must-check를 다음으로 분류한다: `prd/post-mvp/aiox-a2a-spec.md` §13/§12/whole-file,
  `prd/post-mvp/archive/*` 5, `prd/pre-validation/*` 2, `docs/aiox/*`, 그리고 `history/59`.
- canonical source map(`logs/2026-06-21-workspace-reset-legacy-source-absorption.md:23-59`)은 위
  W10 대상 row를 아직 pending/TBD 또는 keep 상태로 둔다. `plans/post-mvp*` rows는
  `keep / execution successor pending`이고, W10에서 단일 plan/repoint/delete를 수행하지 않는다.
- W5 history migration source map은 `history/*` 삭제와 중복 source-map row 생성을 W5 owner로 둔다.
  W10은 `history/58`·`history/59`를 split/decision 입력으로만 사용한다.
- `logs/AGENTS.md` Archive Gate 기준은 보존가치와 self-sufficiency를 모두 충족할 때만
  `archive→delete`로 판정한다. 둘 중 하나라도 부족하면 owner 흡수 후 삭제 후보(`absorb→delete`)
  또는 keep/pending으로 남긴다.

**통합 입력 세트:**

| Input group | Files / flags | What W10-L must decide | Phase |
| --- | --- | --- | --- |
| post-MVP monolith | `prd/post-mvp/aiox-a2a-spec.md` §13/§12/whole-file | §13 product/architecture/decision rationale가 현재 owner로 충분히 흡수됐는지, §12 release-pressure digest가 필요한지, 전체 파일이 원본 없이 self-contained한지 | W4-1, W5 |
| archive 5 | `prd/post-mvp/archive/claude-codex-validation.md`, `claude-opinion.md`, `codex-claude-validation.md`, `codex-opinion.md`, `gemini-opinion.md` | Docker/compose/adapter/capability/schema/instruction/sandbox/transport/identity/policy rationale가 owner 문서나 decision으로 충분히 흡수됐는지, 파일별 Archive Gate를 통과하는지 | W4-1 |
| pre-validation 2 | `prd/pre-validation/claude-codex-pre-validation.md`, `sqlite-restart-recovery-pre-validation.md` | spike setup/results/PASS counts/not-validated list가 보존가치 있는 검증 trace인지, 현 owner 문서만으로 self-contained하지 않으면 logs digest가 필요한지 | W4-1 |
| docs/aiox sweep | `docs/aiox/*` 19 files | architecture learning/stale/test traces의 self-sufficiency, `docs/architecture/mvp-architecture.md` rename-drift cleanup 필요성, Archive Gate, source-map disposition | W4-2 |
| W2 flag | `plans/post-mvp.plan.md:101` §8 vs §4 possible stale section ref; history/58 §6/§7 legacy-tier 보정 | plan-stage owner로 넘길 ref mismatch인지, W10 source-map 판정에만 남길지 | W4-1/W6 handoff |
| W3 flag | docs/aiox 6-file rename-drift + `prd/mvp/aiox-mvp-spec.md:7`; §5 inbound 귀속 nit | split blocker는 아니지만 delete/readiness와 cleanup 판단에 포함 | W4-2 |
| decision seed 5 | `industry-precedents`, `observation-asymmetry`, `aiox-a2a-spec` §13, `step-14-mcp-bug`, `proxy-vs-app-server` | 신규 decision 승격 / 기존 decision 커버 / owner gap 보강 필요 여부. Gemini의 "신규 0건 가능"은 검증 전 triage hypothesis로만 사용 | W5 |

**Gemini triage hypothesis 처리:**

- [Unverified input] decision 후보 5건이 기존 decision/gap으로 모두 커버될 수 있다는 주장은 작업량을
  줄이는 triage index로만 사용한다.
- [Codex judgment] W5에서 `docs/decisions/` 현황을 disk에서 재확인하고, 각 source의 최종
  `file:line`을 확인하기 전에는 신규 decision 불필요를 확정하지 않는다.
- [Codex judgment] W5/W7/W9 provenance로 독해를 단축할 수는 있지만, source map disposition이나
  Archive Gate 판정의 최종 근거로 쓸 때는 원본 source와 현행 owner 문서를 최소 대조한다.

**다음 작업(W4-1):**

1. `prd/post-mvp/aiox-a2a-spec.md`에서 §12, §13, whole-file owner 분리를 확인한다.
2. `prd/post-mvp/archive/*` 5개를 파일별로 읽고, W9가 남긴 rationale 항목(Docker/compose/schema/
   adapter/capability/instruction/sandbox/transport/identity/policy)을 owner 문서·decision 후보와 대조한다.
3. `prd/pre-validation/*` 2개를 읽고, spike trace가 digest 보존가치+self-sufficiency를 만족하는지
   판정한다.
4. W4-1에서는 `docs/aiox/*` 전수 판정과 decision 승격은 하지 않는다. 그 작업은 W4-2/W5가 소유한다.

**Work Item 전이:** W4-0 `[x]` 완료. W4-1 `[>]` active. W4-1도 draft 후 Claude checker 검증 대상이다.

## 2026-06-22 · W4-1 Codex draft — post-MVP monolith/archive/pre-validation self-sufficiency + Archive Gate

Task brief: `logs/W10-L-task.md`. 이번 블록은 L2/W4-1만 수행한다. **owner body, source map,
decision 문서, legacy 원본은 수정하지 않았다.** W4-1은 Codex draft이며, checker PASS 전까지 최종
disposition으로 확정하지 않는다.

**확인한 사실:**

- `prd/post-mvp/aiox-a2a-spec.md` §12는 2026-06-11 current gap snapshot으로, P1/P2 결함을 G0/G1/G3/G5/G6/Phase 2에
  매핑한다(`prd/post-mvp/aiox-a2a-spec.md:1030-1064`).
- 현 roadmap은 같은 압력을 gate/phase owner 언어로 소유한다: G1-A~D(`docs/product/roadmap.md:32-48`),
  G3(`:60-70`), G5(`:72-84`), G6(`:86-97`), gate evidence(`:163-178`), Pre-Release Gap
  Summary(`:192-209`).
- `prd/post-mvp/aiox-a2a-spec.md` §13의 구조 선행 조건은 대부분 현 owner에 흡수돼 있다.
  - A2A/product boundary는 `docs/product/product.md:16-26`, `:46-61`에 있다.
  - adapter 4-slot, capability tier, compose, capability/sandbox, federation/remote는
    `docs/specs/aiox-a2a.md:416-706`, `:738-870`에 있다.
  - `state.ts` 분해, ingress 일반화, pair-to-N, durable store, runtime failure, channel auth 등은
    `docs/architecture/local-agent-runtime.md:1132-1152`와 roadmap Phase 2(`docs/product/roadmap.md:121-137`)에 있다.
- archive 5개는 모두 header에서 "not authority"와 history/58 consolidation을 선언한다
  (`prd/post-mvp/archive/*:1-4`). 내용은 Docker/compose, agents/routes/capabilities/policies,
  instruction layering, capability-vs-sandbox, local/remote federation, adapter 4-slot/tier, envelope/reply
  signal 등 설계 브레인스토밍이다.
- pre-validation 2개는 dated spike trace다.
  - Claude/Codex pre-validation은 Claude channel Node.js validation과 Codex app-server multi-session validation의 setup,
    observed result, PASS, open issue를 보존한다(`prd/pre-validation/claude-codex-pre-validation.md:7-28`,
    `:29-123`, `:125-241`).
  - SQLite restart recovery pre-validation은 file-backed SQLite/WAL, persistence shape, restart policy,
    late reply, verification command/PASS count, not-validated list를 보존한다
    (`prd/pre-validation/sqlite-restart-recovery-pre-validation.md:7-28`, `:45-80`, `:82-155`).
- 현재 repo에는 해당 spike source가 여전히 있다: `spikes/claude-channel-node-poc/`,
  `spikes/codex-app-server-multi-session-poc/`, `spikes/sqlite-restart-recovery-poc/`.
  현재 production owner는 결론을 흡수했지만, spike command/result/PASS count 전체를 같은 밀도로 보존하지는 않는다.

**파일별 W4-1 판정 draft:**

| File | Finding | Self-sufficiency draft | Archive Gate draft | Disposition draft |
| --- | --- | --- | --- | --- |
| `prd/post-mvp/aiox-a2a-spec.md` | [Fact] §2-§9 protocol은 W8, §11/§12 release pressure는 W9/roadmap으로 흡수됐다. [Fact] §13의 owner 성격은 product/spec/architecture/roadmap/W5 decision 후보로 분해된다. | [Inference] 현재 owner 문서만으로 §12와 대부분 §13은 self-contained하다. 단 전체 파일 삭제는 W5 decision 후보 3번(§13 architecture debt+Structured Logger) 판정과 W6 source-map update 뒤 확정해야 한다. | [Inference] §12 digest는 불필요. §13은 decision-worthy 여부가 W5 pending이므로 W4-1 단독으로 archive/delete 확정 금지. | `keep / W5 decision + W6 source-map pending`; W5에서 신규 decision 불필요 또는 승격 완료 후 `absorb→delete` 후보 |
| `prd/post-mvp/archive/claude-codex-validation.md` | [Fact] envelope/reply/tier/fan-out/blind spot cross-validation은 현 spec §4/§5와 decision `a2a-message-lifecycle...`로 대부분 흡수됐다. | [Inference] 원본 없이도 accepted rationale은 현 spec/decision으로 복원 가능하다. | [Inference] 별도 logs digest 보존가치 낮음. 대화형 cross-validation 원문은 owner보다 verbose하고, 고유 검증 trace가 아니다. | `absorb→delete` candidate after checker/source-map |
| `prd/post-mvp/archive/claude-opinion.md` | [Fact] local control plane, agents/routes/capabilities/policies, non-Docker-clone, instruction layering, adapter compile, capability-vs-sandbox, federation/remote, app/runtime connector 방향이 현 product/spec/roadmap에 흡수됐다. | [Inference] accepted design rationale는 현 owner 문서로 self-contained하다. | [Inference] archive digest 불필요. 외부 precedent/market claims는 dated/current 재검증 없이는 owner fact로 보존하지 않는다. | `absorb→delete` candidate after checker/source-map |
| `prd/post-mvp/archive/codex-claude-validation.md` | [Fact] product definition, compose-before-envelope warning, adapter compile, identity/transport/policy/sandbox, app-server/runtime connector 브레인스토밍이 현 product/spec/architecture에 분산 흡수됐다. | [Inference] accepted rationale는 현 owner 문서로 충분하다. 일부 remote/sandbox 상세는 Target/Open 상태로 spec에 남아 있다. | [Inference] archive digest 불필요. 원문은 설계 대화이며, 보존할 empirical trace가 아니다. | `absorb→delete` candidate after checker/source-map |
| `prd/post-mvp/archive/codex-opinion.md` | [Fact] native instruction replacement 금지, launch-scoped generated instruction, adapter asymmetry absorption, local agent control plane 모델은 현 spec/product에 흡수됐다. | [Inference] 현 owner self-contained. | [Inference] archive digest 불필요. | `absorb→delete` candidate after checker/source-map |
| `prd/post-mvp/archive/gemini-opinion.md` | [Fact] agents/routes/capabilities/policies 스키마와 "Agent is not container" 경고는 현 spec §6/§7에 흡수됐다. | [Inference] 현 owner self-contained. | [Inference] archive digest 불필요. | `absorb→delete` candidate after checker/source-map |
| `prd/pre-validation/claude-codex-pre-validation.md` | [Fact] 결론(Claude channel injection 가능, Codex app-server thread-targeted turn 가능, trust/metadata open issues)은 architecture/spec/roadmap에 흡수됐다. [Fact] setup/observed transcript/PASS trace는 owner 문서에 축약돼 있다. | [Inference] owner 문서만으로 현재 구조는 이해 가능하지만, 원본 삭제 후 과거 spike 재현·검증 경위는 부족하다. | [Inference] 보존가치 있음 + digest 작성 시 self-sufficiency 충족 가능. `logs/` digest가 setup, commands, observed result, open issues, spike path를 보존해야 한다. | `archive→delete` candidate after digest + checker/source-map |
| `prd/pre-validation/sqlite-restart-recovery-pre-validation.md` | [Fact] durable store 결론/현재 gap은 spec/architecture/roadmap에 흡수됐다. [Fact] spike는 WAL, restart transition, late reply, verification commands/PASS counts/not-validated list를 보존한다. | [Inference] owner 문서만으로 current gap은 충분하지만, 삭제 후 spike 검증 trace는 부족하다. | [Inference] 보존가치 있음 + digest 작성 시 self-sufficiency 충족 가능. `logs/` digest가 schema shape, restart policy, commands/PASS counts, not-validated list, spike path를 보존해야 한다. | `archive→delete` candidate after digest + checker/source-map |

**Cross-Owner / handoff flags from W4-1:**

- [Inference] `prd/post-mvp/aiox-a2a-spec.md` final disposition은 W5 decision 후보 3번 판정 후에만 확정한다.
  §12 자체는 roadmap successor가 충분하므로 별도 §12 digest는 만들지 않는다.
- [Inference] pre-validation 2개는 W10-L source-map update 전에 small logs digest가 필요하다. 위치 후보는
  `logs/2026-06-22-aiox-pre-validation-archive.md` 같은 단일 digest이며, 생성 여부와 파일명은 checker PASS 후
  W6/source-map update 단계에서 확정한다.
- [Fact] W4-1은 `docs/aiox/*` rename-drift, decision 후보 1/2/4/5, source map 표 갱신을 수행하지 않았다.

**Workflow retrospective draft:**

- W4-1처럼 "owner에는 결론만 있고 원문에는 spike trace가 있는" 파일군은 `absorb→delete`와
  `archive→delete`를 빨리 섞지 말고, `accepted rationale`과 `empirical trace`를 먼저 분리해야 한다.
  이 구분은 portable 후보로 W7 closeout에서 수집한다.

**Work Item 상태:** W4-1은 Codex draft 완료이나 checker PASS 전이므로 미확정이다. @user 결정으로
W4-1 단독 checker를 지금 수행하지 않고, W4-2 draft까지 작성한 뒤 W4 전체를 checker 검증한다.
checker는 (a) 각 owner cite가 실제로 충분한지, (b) archive 5개의 `absorb→delete` 판정이 너무
공격적이지 않은지, (c) pre-validation 2개의 digest 필요 판정이 Archive Gate와 맞는지 검증한다.

## 2026-06-22 · W4 checker 순서 조정 — W4 draft 전체 작성 후 통합 checker

@user 결정: 현재 Claude checker는 W4-1 단독으로 바로 돌리지 않는다. 먼저 W4 draft를 전부 작성한다.
다음 세션은 W4-2(`docs/aiox/*` 파일군 self-sufficiency, rename-drift cleanup 필요성, Archive Gate)
draft 작성으로 진입한다. W4-1 + W4-2 draft가 모두 준비된 뒤 W4 전체를 Claude checker가 검증한다.

**전이:**

- W4-1: `[>]` → `[x]` draft 완료(단, checker PASS 전 미확정).
- W4-2: `[ ]` → `[>]` active next pointer.

**다음 세션 시작 범위:**

1. `logs/2026-06-21-workspace-reset-legacy-source-absorption.md`의 `docs/aiox/*` 19개 row를 기준표로 읽는다.
2. W3 checker가 넘긴 rename-drift 6-file 전수와 `prd/mvp/aiox-mvp-spec.md:7` stale ref를 함께 회수한다.
3. decision 후보 4개(`industry-precedents`, `observation-asymmetry`, `step-14-codex-mcp-remote-architecture-bug`,
   `proxy-vs-app-server`)는 W4-2에서 source/self-sufficiency만 판정하고, 최종 승격 여부는 W5가 판정한다.
4. owner body/source map/legacy 원본은 W4-2 draft 중 수정하지 않는다. W6 source-map update 전까지 draft로 남긴다.

## 2026-06-22 · W4-2 Codex draft — docs/aiox self-sufficiency + Archive Gate

Task brief: `logs/W10-L-task.md`. 이번 블록은 L3/W4-2만 수행한다. **owner body, source map,
decision 문서, legacy 원본은 수정하지 않았다.** W4-2는 Codex draft이며, W4 전체 checker PASS 전까지
최종 disposition으로 확정하지 않는다. @user 승인으로 subagent `Mill`을 사용해 `docs/aiox/*` 19개
파일의 1차 inventory를 병렬 수집했고, controlling agent가 source map, 현행 owner 문서와 대조해 아래
draft로 통합했다.

**확인한 사실:**

- `docs/aiox/*`는 19개 파일, 총 4646줄이다. 가장 큰 파일은 `docs/aiox/mvp-architecture.md` 1087줄이며,
  나머지는 대부분 history 또는 현행 owner를 권위로 가리키는 learning record다.
- W3 checker가 넘긴 rename-drift 6건은 disk에서 재확인됐다:
  `docs/aiox/codex-thread-focus-and-loaded-list.md:10`,
  `docs/aiox/mcp-scope-and-daemon-namespace.md:5`,
  `docs/aiox/observation-asymmetry-and-d7-pivot.md:9`,
  `docs/aiox/round-4-tui-smoke-check.md:6,595`,
  `docs/aiox/step-14-codex-thread-mismatch-discovery.md:110`,
  `docs/aiox/step-6-cli-decisions-walkthrough.md:6`가 missing
  `docs/architecture/mvp-architecture.md`를 참조한다. 추가로 `prd/mvp/aiox-mvp-spec.md:7`은 stale
  `docs/aiox/mvp-architecture.md`를 참조한다.
- 현행 architecture는 `docs/architecture/local-agent-runtime.md`가 current as-built authority이며,
  §14가 `docs/aiox/*.md`를 learning records로만 둔다. Codex adapter current 구조는 per-agent
  app-server + per-agent transparent proxy + MCP ingress + injector + `--resume`이다.
- 현행 decision 현황은 13개이며, W4-2 decision seed와 직접 겹치는 owner는
  `docs/decisions/codex-per-agent-app-server.md`,
  `docs/decisions/proxy-lazy-observation-cost-model.md`,
  `docs/decisions/agent-level-mcp-process-scoping.md`,
  `docs/decisions/client-orchestrator-runtime-pivot.md`,
  `docs/decisions/daemon-autostart-and-channel-identity.md`,
  `docs/decisions/pair-slot-generalization.md`,
  `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`다.

**파일별 W4-2 판정 draft:**

| File | Finding | Self-sufficiency draft | Archive Gate draft | Disposition draft |
| --- | --- | --- | --- | --- |
| `docs/aiox/agent-runtime-container-model.md` | [Fact] `CodexAgentRuntime` product model learning record이고 권위는 `history/31`에 둔다. [Fact] 현재 architecture §7.1과 `codex-per-agent-app-server` decision이 per-agent runtime boundary를 소유한다. | [Inference] 현 owner 문서로 self-contained하다. | [Inference] 별도 digest 보존가치 낮음. | `absorb→delete` candidate |
| `docs/aiox/claude-channel-registration-and-trust-model.md` | [Fact] one-time token, dynamic endpoint, endpoint hijack risk를 설명한다. [Fact] 토큰 전달 경로를 file/`.mcp.json` spike처럼 말하는 일부 detail은 현재 plugin/default channel 방향과 다르다. | [Inference] `claude-channel-trust-and-registration` decision과 architecture §6으로 self-contained하다. | [Inference] stale detail을 archive하지 않는다. | `absorb→delete` candidate |
| `docs/aiox/codex-thread-focus-and-loaded-list.md` | [Fact] `thread/loaded/list.at(-1)`가 `/resume`에서 깨졌고, proxy same-connection response가 새 방향이라고 설명한다. [Fact] stale architecture ref 1건. | [Inference] architecture §7.5~§7.7, `pair-slot-generalization`, proxy decision으로 self-contained하다. | [Inference] 설명용 학습 기록이라 digest 불필요. | `absorb→delete` candidate; rename-drift cleanup/deletion dependency |
| `docs/aiox/industry-precedents-and-observability-models.md` | [Fact] OpenHands/Agent Protocol/LangGraph/Cline 비교와 Opaque Worker, delivery-vs-completion 분리를 기록한다. | [Inference] delivery/completion 분리는 spec §4와 lifecycle decision에 흡수됐지만, 외부 precedent 자체를 decision source로 남길지는 W5 판정 필요. | [Inference] W5 decision seed #1 전까지 확정 금지. Archive digest보다 decision Sources 또는 no-promotion 기록이 적합하다. | `keep / W5 decision pending`; W5 후 `absorb→delete` likely |
| `docs/aiox/mcp-scope-and-daemon-namespace.md` | [Fact] aiox-level control MCP와 agent-level runtime MCP/channel을 분리하고 global config non-mutation을 설명한다. [Fact] source map W8 row는 spec §3.1/§5/§7 흡수와 rename-drift cleanup 필요를 이미 기록했다. | [Inference] `agent-level-mcp-process-scoping` decision, spec §3.1/§5/§7, architecture §7.8로 self-contained하다. | [Inference] digest 불필요. | `absorb→delete` candidate; rename-drift cleanup/deletion dependency |
| `docs/aiox/mvp-architecture.md` | [Fact] 2026-05-26 stale as-built snapshot이며 고정 pair/old known gaps 등 현재 `local-agent-runtime.md`보다 낡은 구조를 포함한다. | [Inference] 현 `local-agent-runtime.md`와 decisions가 successor라 self-contained하다. | [Inference] stale snapshot 자체는 보존가치 낮고 archive하면 권위 혼선 위험이 크다. | `delete-only` candidate, checker가 고유 미흡 facts 없는지 확인 |
| `docs/aiox/observation-asymmetry-and-d7-pivot.md` | [Fact] D7 violation, callback/hook 부재, Option D scope reduction을 기록하고, 2026-05-26 update로 proxy가 production 방향으로 승격됐다고 말한다. [Fact] stale architecture ref 1건. | [Inference] proxy current solution은 architecture/proxy decision으로 self-contained하나, D7 scope-reduction rationale가 durable WHY인지 W5 판정 필요. | [Inference] W5 decision seed #2 전까지 확정 금지. 별도 digest보다는 decision/no-promotion 판정이 적합하다. | `keep / W5 decision pending`; W5 후 `absorb→delete` likely |
| `docs/aiox/pair-attach-kind-mismatch.md` | [Fact] Step 2 repository bug, commit, regression tests, verification을 설명한다. [Fact] 현재 pair model은 Step 15 이후 kind-slot이 아니라 slot a/b다. | [Inference] `pair-attach-atomicity-and-sentinel`, `pair-slot-generalization`, architecture repository row로 self-contained하다. | [Inference] TDD trace는 history/decision에 충분하고 별도 digest 불필요. | `absorb→delete` candidate |
| `docs/aiox/per-agent-transparent-proxy-decision.md` | [Fact] 1:1 app-server 유지 + 1:1 transparent proxy 추가, same-connection binding rule과 raw-frame logging 금지를 설명한다. | [Inference] architecture §7.4~§7.5와 `proxy-lazy-observation-cost-model` decision으로 self-contained하다. | [Inference] digest 불필요. | `absorb→delete` candidate |
| `docs/aiox/phase-a-design-decisions.md` | [Fact] Step 10 Phase A learning summary이며 authority는 `history/33`; app-server launch/banner, TUI ownership, WS injector를 설명한다. | [Inference] `codex-per-agent-app-server` decision과 architecture §7.1~§7.3으로 self-contained하다. | [Inference] digest 불필요. | `absorb→delete` candidate |
| `docs/aiox/proxy-attribution-signals.md` | [Fact] `thread/start|resume|fork` response signal, proxy가 아는 것/모르는 것, same-connection authority를 설명한다. | [Inference] architecture §7.4~§7.5가 current rule을 소유한다. 상세 학습 설명은 successor 없이도 삭제 가능하다. | [Inference] digest 불필요. | `absorb→delete` candidate |
| `docs/aiox/proxy-cost-model.md` | [Fact] relay obligation vs observation 비용 분리, lazy parse, 1MB frame parse cost, 4KB cutoff 미채택 배경을 설명한다. | [Inference] `proxy-lazy-observation-cost-model` decision과 architecture §7.4 lazy parse note로 self-contained하다. | [Inference] 측정/예시는 decision으로 충분히 증류돼 별도 digest 불필요. | `absorb→delete` candidate |
| `docs/aiox/proxy-vs-app-server-tradeoff.md` | [Fact] 1:1 app-server 선택, RSS/FD/boot 측정, A/A+P/B/C 구조 비교, 2026-05-26 A+P update를 기록한다. | [Inference] `codex-per-agent-app-server` decision이 core WHY와 측정값을 이미 Sources/Trade-offs에 보존하고, proxy cost decision이 proxy 쪽 WHY를 소유한다. W5 seed #5에서 하이브리드 종합 decision 중복 여부만 최종 판정한다. | [Inference] W5 전 확정 금지. W5에서 기존 decision 커버로 충분하면 digest 불필요. | `keep / W5 decision pending`; W5 후 `absorb→delete` likely |
| `docs/aiox/README.md` | [Fact] `docs/aiox` 폴더가 learning records이고 implementation authority가 아니라고 설명하는 meta 문서다. | [Inference] 폴더 자체가 흡수/삭제되면 successor 필요가 없다. | [Inference] 보존가치 없음. | `delete-only` candidate after folder disposition |
| `docs/aiox/round-4-tui-smoke-check.md` | [Fact] automatic tests vs real Codex/TUI boundary, S1~S5 수동 smoke 절차와 PASS/partial/PASS 관측을 보존한다. [Fact] stale architecture refs 2건. | [Inference] architecture smoke matrix는 결론만 소유하고, S1~S5 command/result/leftover 확인까지 같은 밀도로 보존하지 않는다. | [Inference] 보존가치 있음 + digest 작성 시 self-sufficiency 충족 가능. | `archive→delete` candidate after digest |
| `docs/aiox/step-14-codex-mcp-remote-architecture-bug.md` | [Fact] `--remote`에서 MCP 주입 대상이 TUI가 아니라 app-server여야 함, headless global MCP hang, CLI evidence commands/results, app-server injection/isolation 후보를 기록한다. | [Inference] architecture §7.8과 `agent-level-mcp-process-scoping` decision은 현재 결론을 소유하지만, empirical CLI trace와 app-server injection/isolation WHY는 W5 seed #4 판정 전 self-contained로 보기 어렵다. | [Inference] W5 decision 판정 전 `keep`; 신규 decision 불필요로 판정되면 CLI evidence digest가 필요할 수 있다. | `keep / W5 decision pending`; W5 후 `archive→delete` or `absorb→delete` |
| `docs/aiox/step-14-codex-thread-mismatch-discovery.md` | [Fact] completed delivery가 visible Codex TUI에 나타나지 않은 thread mismatch를 설명한다. [Fact] 제안 fix인 `thread/loaded/list` live check는 이후 proxy binding/Step 15로 superseded됐다. [Fact] stale architecture ref 1건. | [Inference] current owner는 architecture §7.5~§7.7과 `pair-slot-generalization`이다. Stale fix path는 보존할 owner truth가 아니다. | [Inference] digest 불필요. | `absorb→delete` candidate; rename-drift cleanup/deletion dependency |
| `docs/aiox/step-14-smoke-test-report.md` | [Fact] Step 14 manual E2E smoke, daemon immediate-exit blocker, Claude `.mcp.json` key mismatch, verified UDS/status/Codex MCP/daemon stop/EPERM를 기록한다. | [Inference] `daemon-autostart-and-channel-identity` decision과 architecture가 결론을 소유하지만, blocker trace와 verification list는 owner body에 같은 밀도로 없다. | [Inference] 보존가치 있음 + digest 작성 시 self-sufficiency 충족 가능. | `archive→delete` candidate after digest |
| `docs/aiox/step-6-cli-decisions-walkthrough.md` | [Fact] exit code, send CLI 미노출, no-active-routes β-1 atomic reject 결정 walkthrough를 설명한다. [Fact] stale architecture ref 1건. | [Inference] architecture §8.2/§9.1과 current command table로 self-contained하다. | [Inference] digest 불필요. | `absorb→delete` candidate; rename-drift cleanup/deletion dependency |

**Decision seed handling draft (W4-2 범위, 최종 승격은 W5):**

- Seed #1 `industry-precedents`: [Fact] Opaque Worker / delivery-vs-completion rationale source. [Inference]
  existing lifecycle spec/decision partly covers it, but external precedent rationale의 durable 필요성은 W5가
  no-promotion vs decision supplement로 판정해야 한다.
- Seed #2 `observation-asymmetry`: [Fact] D7 violation과 scope reduction source. [Inference] current proxy
  solution은 covered, but D7 scope-reduction rationale는 W5 판정 전 삭제 확정 금지.
- Seed #4 `step-14-codex-mcp-remote-architecture-bug`: [Fact] app-server injection target mismatch와 headless MCP
  hang empirical trace. [Inference] architecture/`agent-level-mcp-process-scoping`이 결론은 소유하지만
  decision-level WHY가 충분한지는 W5가 판정해야 한다.
- Seed #5 `proxy-vs-app-server`: [Fact] existing `codex-per-agent-app-server` decision already cites this docs/aiox
  file and preserves RSS measurement/trade-off. [Inference] 신규 decision은 likely unnecessary, but W5 must verify
  hybrid A+P rationale coverage before final disposition.

**Cross-Owner / handoff flags from W4-2:**

- [Fact] rename-drift 6건은 split blocker는 아니지만, docs/aiox 삭제 전에는 stale ref cleanup 또는 deletion
  disposition으로 해소해야 한다. W4-2는 원본 수정하지 않았다.
- [Fact] `prd/mvp/aiox-mvp-spec.md:7`의 `docs/aiox/mvp-architecture.md` stale ref는 W10 docs/aiox source-map
  disposition과 연결된다. `prd/mvp` 자체 disposition은 W8/W10/W5 대조 후 physical gate owner가 최종 삭제한다.
- [Inference] archive digest 후보는 현재 4개로 묶인다: W4-1 pre-validation 2개 +
  W4-2 `round-4-tui-smoke-check.md` + `step-14-smoke-test-report.md`. `step-14-codex-mcp-remote-architecture-bug.md`
  는 W5 decision 결과에 따라 archive digest 후보가 될 수 있다.

**Workflow retrospective draft:**

- Subagent는 19개 파일 inventory와 stale ref sweep에 유효했다. 단 final disposition은 source map, W5 decision
  seed, Archive Gate를 함께 봐야 하므로 controlling agent 통합이 필요했다.
- Portable candidate: legacy learning-record 폴더는 먼저 `decision seed`, `empirical trace`, `stale snapshot`,
  `explainer only`, `folder meta`로 타입을 나눈 뒤 Archive Gate를 적용하면 checker에게 검증 가능한 표가 된다.

**Work Item 상태:** W4-2는 Codex draft 완료이나 checker PASS 전이므로 미확정이다. W4-1 + W4-2 draft가 모두
준비됐으므로 next는 W4 전체 Claude checker 검증이다. checker는 (a) `absorb→delete`가 과한 파일이 없는지,
(b) `archive→delete` 후보 2건(+조건부 1건)이 Archive Gate에 맞는지, (c) W5 decision seed가 충분히
분리됐는지, (d) rename-drift 전수가 맞는지 검증한다.

## 2026-06-22 · W4 통합 checker 검증 — legacy must-check + Archive Gate + decision seed PASS (Claude checker)

Task brief: `logs/W10-L-task.md`. 분업 = Codex draft → Claude checker. @user 결정대로 W4-1 단독이 아니라
W4-1 + W4-2 draft를 한꺼번에 검증했다. @user 승인으로 read-only subagent fan-out 3건을 시도했으나 세션
한도(reset 17:30 KST)로 0 토큰 반환되어, controlling checker(Claude/Opus)가 1차 source에서 직접
재검증했다. **checker는 owner body·source map·decision·legacy 원본을 수정하지 않았다.**

**Verdict: PASS (보정 7건).** W4 draft는 W5/W6로 이어갈 만큼 정확하다. disposition은 draft 단계이며
최종 물리 삭제는 plan-stage gate(self-sufficiency + @user confirm) 소유다.

**축별 판정:**

- **(a) `absorb→delete` 과하지 않음 — PASS.**
  - [Fact] archive 5(`claude-codex-validation` 84줄·`claude-opinion` 853줄·`codex-claude-validation` 447줄·
    `codex-opinion` 637줄·`gemini-opinion` 116줄) 모두 header(lines 1-4)에서 "not authority" + accepted
    decisions가 `docs/specs/aiox-a2a.md`로 통합 + rationale가 `history/58`에 있음을 선언한다. 성격은
    conversational opinion/cross-validation이고 고유 empirical trace(측정치/PASS 카운트)가 아니다 →
    `absorb→delete` 타당.
  - [Fact] docs/aiox `absorb→delete` 후보의 owner cite(architecture §, decision)가 disk에 실재한다. arch §14가
    `docs/aiox/*`를 명시적으로 "Learning records"로, legacy MVP PRD를 "absorbed, not primary authority"로
    규정(`docs/architecture/local-agent-runtime.md:1155-1181`)해 owner-side에서 흡수를 뒷받침한다.
- **(b) `archive→delete` Archive Gate 적합 — PASS.**
  - [Fact] pre-validation 2는 dated spike trace를 담는다: `claude-codex-pre-validation.md`(241줄, Setup/
    Test Message/Result/PASS 요약/Architecture Implications), `sqlite-restart-recovery-pre-validation.md`
    (155줄, Spike/Validated Schema/Restart Policy/Verification "PASS: 5 SQLite spike tests, 11 Vitest"/
    Not Validated). spike 디렉터리 3종 실재. 현행 owner는 결론만 보유 → 보존가치+digest self-sufficiency
    충족 → `archive→delete` 타당.
  - [Fact] `round-4-tui-smoke-check.md`(595줄)는 S1~S5 수동 smoke 절차(env override S4 포함)를, arch §12
    Smoke Matrix(`:1098`)는 시나리오→✅ 결론 표만 보유. `step-14-smoke-test-report.md`(154줄)는 Blocker 1
    (daemon 즉시종료 root-cause/solution)·Blocker 2(`.mcp.json` mismatch + env 상속 해법) trace를 담고 owner는
    미보유 → 둘 다 `archive→delete` 타당. `step-14-codex-mcp-remote-architecture-bug.md`는 seed #4와 묶여
    W5 후 확정(조건부) — draft와 일치.
- **(c) decision seed 분리 충분 — PASS (보정 동반).** draft가 seed 4개 파일(`industry-precedents`·
  `observation-asymmetry-and-d7-pivot`·`proxy-vs-app-server-tradeoff`·`step-14-codex-mcp-remote-architecture-bug`)을
  모두 `keep / W5 decision pending`으로 둬 premature delete가 없다. 단 Decision Candidates 표의 overlap
  가정을 disk 근거로 보정한다(아래 보정 3~6).
- **(d) rename-drift 전수 — PASS.** grep으로 missing `docs/architecture/mvp-architecture.md` 참조가 정확히
  6 파일(`mcp-scope-and-daemon-namespace:5`·`step-6-cli-decisions-walkthrough:6`·
  `step-14-codex-thread-mismatch-discovery:110`·`round-4-tui-smoke-check:6,595`·
  `observation-asymmetry-and-d7-pivot:9`·`codex-thread-focus-and-loaded-list:10`)임을 확인. 누락·과잉 없음.
  `prd/mvp/aiox-mvp-spec.md:7`은 존재하는 `docs/aiox/mvp-architecture.md` 참조라 별도 범주. rename target
  부재 확인.

**checker 보정 7건:**

1. [Fact] **decision 실제 개수 = 12, not 13.** `ls docs/decisions/*.md`=13이나 그중 `AGENTS.md` 포함.
   실제 decision 문서는 12개(draft·task brief·W1의 "13개" overcount). 이름 12개 목록은 정확.
2. [Fact] **rename-drift 전수 = draft 정확/완전**(축 d). draft 6-file + `prd/mvp:7` 열거가 grep 결과와 정확히 일치.
3. [Fact] **seed #2 overlap 오귀속.** `client-orchestrator-runtime-pivot.md`(37줄)는 TypeScript 런타임
   rewrite + client orchestrator pivot(`history/13`) 결정서이고, D7 observation-asymmetry/scope-reduction
   개념을 담지 않는다(D7/reduc/observ/asymmetr grep 0). 따라서 seed #2(D7 Scope Reduction)는 기존 decision으로
   **커버되지 않음** → W5는 "covered" 가정을 버리고 신규/보강 후보로 다뤄야 한다.
4. [Inference] **seed #4 nuance 보존 확인 필요.** `agent-level-mcp-process-scoping.md`은 global config 비오염
   + per-process 주입을 소유하나, `--remote`에서 "MCP 주입 대상 = app-server(not TUI)" + headless global MCP
   hang nuance는 명시적으로 담지 않는다. W5는 이 nuance가 신규/보강 없이 손실되지 않는지 확인. keep/pending 정확.
5. [Fact] **seed #5 대부분 기존 커버.** `codex-per-agent-app-server.md`가 seed source
   `docs/aiox/proxy-vs-app-server-tradeoff.md`를 Sources에 이미 인용("docs/aiox/ 삭제 예정" 주석 포함) +
   RSS 측정치(`history/29`) + A/A+P alternatives를 보존하고, proxy WHY는 `proxy-lazy-observation-cost-model`이
   소유. W5는 "1:1 app-server + 1:1 transparent proxy(A+P) 채택" framing이 두 decision 합으로 충분한지만
   확인 — 신규 likely unnecessary.
6. [Fact] **seed #1 분리 정확.** delivery-vs-completion 분리는 `a2a-message-lifecycle-envelope-and-correlation`이
   소유(grep 다수). Opaque Worker/외부 precedent narrative는 그 decision에 없으나 load-bearing WHY가 아닌
   예시라 no-promotion lean. keep/pending 정확.
7. [Inference] **residual(blocking 아님).** archive 5 중 대형 conversational 파일(`claude-opinion` 853줄·
   `codex-opinion` 637줄)의 줄단위 self-sufficiency 정밀 감사는 disposition-draft 단계에 불필요. 물리 삭제
   gate(self-sufficiency + @user confirm)가 최종 감사 소유. draft `absorb→delete`는 header 통합 선언 + 성격으로
   draft-level 타당.

**Workflow retrospective(checker):**

- [Opinion] cite-heavy 통합 checker에서 subagent fan-out이 세션 한도로 막히면 controlling checker가
  직접 1차 source 재검증으로 graceful fallback해야 한다. portable 후보로 W7 closeout(F56~)에 수집:
  "subagent 가용성에 checker 진행을 묶지 말고, grep/sed로 cite 좌표를 먼저 확정한 뒤 좁은 Read로
  내려가는 controlling-agent 직접 검증 경로를 항상 유지한다."
- [Opinion] Decision Candidates 표의 "기존 decision 중복 여부" 가정은 파일명만으로 적지 말고 disk 본문
  grep으로 확정해야 한다(seed #2 `client-orchestrator-runtime-pivot` 오귀속이 그 증거). portable 후보.

**Work Item 전이:** W4 `[x]` 확정(draft + 통합 checker PASS). W5 `[>]` active. 다음 = W5 decision 승격
판정(Codex draft → Claude checker). W5는 이 checker 블록의 seed 분석(보정 3~6)을 입력으로 소비하되,
승격/no-promotion 확정 전 각 후보 source `file:line`과 `docs/decisions/` 본문을 다시 대조한다. W6 source map
update와 물리 삭제는 각각 W6 / plan-stage gate 소유로 미수행.

## 2026-06-22 · W5 decision 승격 Codex draft — 2 promoted, 3 no-promotion

Task brief: `logs/W10-L-task.md`. 이번 블록은 L4/W5만 수행했다. **source map,
legacy 원본, spec/architecture/roadmap 본문은 수정하지 않았다.** 변경한 owner는
`docs/decisions/` 2개 신규 decision draft 문서뿐이다. @user 승인에 따라 read-only explorer 2개를
좁게 사용했다: D7 scope reduction 후보와 Step 14 Codex remote MCP 후보. 둘 다 신규 decision
필요 판단을 반환했고, controlling Codex가 직접 source와 기존 decision 본문을 대조해 draft로 반영했다.
**Claude/checker PASS 전까지 이 블록은 accepted 완료가 아니라 Codex draft다.**

**확인한 사실:**

- `docs/decisions/AGENTS.md`는 decision 문서가 현재도 유효한 load-bearing WHY, trade-off,
  재검토 조건을 소유하고, outcome은 product/spec/architecture/roadmap owner를 참조하라고 규정한다.
- W5 착수 전 실제 decision 문서는 12개였다. `ls docs/decisions/*.md`는 `AGENTS.md`를 포함해 13개로
  보일 수 있지만, `AGENTS.md`는 decision 문서가 아니다.
- `docs/aiox/industry-precedents-and-observability-models.md:16-37`은 Opaque Worker,
  delivery/completion 분리와 coarse state를 설명한다. `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md:22-77`
  는 daemon-owned delivery-correlated lifecycle, fan-out, daemon authority, adapter text non-authority를 이미
  decision WHY로 소유한다.
- `docs/aiox/observation-asymmetry-and-d7-pivot.md:20-23`, `:40-46`, `:48-77`은 notification-only
  observation이 D7 attribution을 충족하지 못하고, Codex app-server callback/response-forwarding 부재 때문에
  binding replacement를 daemon-owned same-client operation으로 축소한 rationale를 보존한다. 기존
  `client-orchestrator-runtime-pivot.md`는 이 D7 rationale을 소유하지 않는다는 W4 checker 보정과 일치한다.
- `prd/post-mvp/aiox-a2a-spec.md:1092-1124`는 `state.ts` decomposition, ingress generalization,
  pair-to-N, structured logger/DX 처방을 적는다. 현 roadmap은 G3 structured logger와 Phase 2
  structural prerequisites를 소유한다(`docs/product/roadmap.md:60-70`, `:121-137`).
  현 architecture는 corresponding current gaps/post-MVP checklist를 소유한다
  (`docs/architecture/local-agent-runtime.md:1132-1152`).
- `docs/aiox/step-14-codex-mcp-remote-architecture-bug.md:18-26`, `:61-88`은 Codex remote mode에서
  MCP host가 foreground TUI가 아니라 daemon-owned app-server라는 injection target mismatch와 headless
  global MCP config/isolation rationale를 보존한다. `agent-level-mcp-process-scoping.md:3-20`은 broader
  global config non-mutation/per-process injection policy를 소유하지만 app-server-vs-TUI target distinction은
  소유하지 않는다. `codex-per-agent-app-server.md:3-31`도 app-server lifecycle/topology WHY를 소유하지만 MCP
  injection target/isolation WHY는 소유하지 않는다.
- `docs/aiox/proxy-vs-app-server-tradeoff.md:61-83`, `:131-140`, `:190-205`, `:245-260`은 per-agent
  app-server 선택과 A+P update를 설명한다. `docs/decisions/codex-per-agent-app-server.md:6-35`가 1:1
  app-server WHY/RSS trade-off/source citation을 이미 소유하고, `docs/decisions/proxy-lazy-observation-cost-model.md:6-20`
  이 proxy observation cost model을 소유한다. Current A+P outcome은 architecture §7.4~§7.7이 소유한다.

**W5 판정:**

| Candidate | Judgment | Action |
| --- | --- | --- |
| `industry-precedents` → Opaque Worker / delivery-vs-completion | [Inference] Codex draft no-promotion. Delivery/completion, fan-out, daemon authority는 existing lifecycle decision에 충분히 흡수됐다. 외부 precedent 자체는 dated explanatory narrative이며 load-bearing decision WHY가 아니다. | W6 source-map disposition draft에 `absorb→delete` 후보로 반영 |
| `observation-asymmetry` → D7 Scope Reduction | [Fact] existing decisions do not cover the earlier D7 scope-reduction WHY. [Inference] decision-worthy: 실질 대안(A~D), 명시적 scope 축소, 재검토 조건(callback/read API)이 있다. | Codex draft promoted to `docs/decisions/codex-d7-authoritative-binding-scope.md`; checker pending |
| `aiox-a2a-spec.md` §13 → architecture debt + Structured Logger | [Inference] Codex draft no-promotion. §13은 execution ordering/refactor guidance와 DX gap summary 성격이다. 현재 owner는 roadmap Phase 2/G3와 architecture Known Gaps/Post-MVP이며, 별도 alternative decision은 없다. | W6 source-map disposition draft에 `absorb→delete` 후보로 반영 |
| `step-14-codex-mcp-remote-architecture-bug` → App Server injection/isolation | [Fact] existing `agent-level-mcp-process-scoping` and `codex-per-agent-app-server` do not preserve the app-server-vs-TUI MCP host distinction. [Inference] decision-worthy later refinement/correction. | Codex draft promoted to `docs/decisions/codex-app-server-mcp-injection-and-isolation.md`; checker pending |
| `proxy-vs-app-server` → app-server + proxy hybrid | [Inference] Codex draft no-promotion. Existing 1:1 app-server and proxy cost decisions together preserve the load-bearing WHY; architecture owns the current A+P runtime shape. A new hybrid decision would duplicate. | W6 source-map disposition draft에 `absorb→delete` 후보로 반영 |

**생성한 decision draft 문서:**

- `docs/decisions/codex-d7-authoritative-binding-scope.md`
  - Sources: `history/34`, `docs/aiox/observation-asymmetry-and-d7-pivot.md`,
    `logs/2026-06-19-mvp-history-archive.md`, current architecture §7.4~§7.7,
    `proxy-lazy-observation-cost-model.md`.
  - Scope: notification-only observation은 binding authority가 아니며, authoritative same-operation
    request/response evidence만 active binding을 갱신할 수 있다는 WHY.
- `docs/decisions/codex-app-server-mcp-injection-and-isolation.md`
  - Sources: `history/40`, `docs/aiox/step-14-codex-mcp-remote-architecture-bug.md`,
    current architecture §7.2/§7.8, `agent-level-mcp-process-scoping.md`.
  - Scope: Codex remote mode MCP injection은 foreground TUI가 아니라 daemon-owned app-server를 target으로
    해야 하며, app-server는 isolated runtime boundary로 다뤄야 한다는 WHY.

**검증/제약:**

- [Fact] 신규 decision은 `docs/decisions/AGENTS.md` 템플릿(Context/Decision/Alternatives/Rationale/
  Trade-offs/Re-evaluation/Sources)을 따른다.
- [Fact] W5는 history 원본 삭제나 inbound reference repoint를 수행하지 않았다. `history/*` 삭제와 중복
  source-map row 생성은 W5 history migration owner이고, W10 W6은 legacy-source-absorption row append/update만
  수행한다.
- [Fact] W5는 W4의 "Codex draft → Claude checker" 문구와 달리 Claude checker를 새로 실행하지 못했다.
  대신 @user 승인 read-only explorer 2개(D7/Step14 MCP)와 controlling Codex의 직접 disk 대조로 판정했다.
  이 제한은 W7 closeout workflow retrospective에 남긴다.

**Workflow retrospective draft:**

- Decision 승격은 파일명/주제명 overlap으로 판단하면 안 된다. W4 checker가 잡은
  `client-orchestrator-runtime-pivot` 오귀속처럼, 기존 decision 본문 grep으로 실제 coverage를 확인해야 한다.
- "기존 decision으로 대부분 커버"와 "나중에 생긴 correction rationale"은 분리해야 한다. `agent-level-mcp-process-scoping`
  같은 broad policy가 있어도, remote mode app-server target mismatch처럼 later refinement가 load-bearing이면
  새 decision이 더 정확하다.

**Work Item 상태 정정(2026-06-22 @user 지적):** W5는 Codex draft 완료이나 Claude/checker PASS 전이므로
`[x]`가 아니다. W5는 `[>]` checker/acceptance pending으로 유지한다. W6 source-map update도 draft로
적용됐지만 W5 acceptance 전 완료 처리하지 않는다.

**다음:** W6 source map disposition append/update. 기존
`logs/2026-06-21-workspace-reset-legacy-source-absorption.md` 표 row에만 append/update하고, 새 표는 만들지
않는다. W6은 W2/W3/W4/W5 결과를 반영하되 `plans/post-mvp*` rows와 `history/*` rows는 건드리지 않는다.

## 2026-06-22 · W6 source map disposition append/update Codex draft

Task brief: `logs/W10-L-task.md`. 이번 블록은 L5/W6만 수행했다. **물리 삭제, legacy 원본 수정,
`plans/post-mvp*` 재편, `history/*` row 생성/삭제는 하지 않았다.** 변경한 파일은 canonical source map
`logs/2026-06-21-workspace-reset-legacy-source-absorption.md`의 기존 표 row와 W4 decision 승격 Work Item
상태 draft다. 새 source map 표는 만들지 않았다. **W5/W6 checker PASS 전까지 accepted source-map update가
아니라 Codex draft update다.**

**반영한 사실:**

- W4 legacy must-check + Archive Gate PASS와 W5 decision 승격 Codex draft 결과를 source map 표에 draft로 반영했다.
- `prd/post-mvp/aiox-a2a-spec.md`는 §12/§13에 대해 no archive digest로 반영했다. W8 protocol,
  W9 release pressure, W10 §13 architecture/decision 판정은 self-contained로 처리했고, 전체 파일은
  `plans/post-mvp*` single execution successor pending 때문에 `keep / execution successor pending`으로 남겼다.
- `prd/post-mvp/archive/*` 5개는 W10 Codex draft 판정에 따라 `absorb→delete candidate (physical gate only)`로 반영했다.
- `prd/pre-validation/*` 2개는 `archive→delete candidate after digest + physical gate`로 반영했다.
- `docs/aiox/*` 19개는 W4/W5 판정에 맞춰 `absorb→delete`, `delete-only`, `archive→delete after digest`
  candidate로 반영했다. decision 승격 대상 2건은 successor decision 문서를 기록했다.
- archive digest required rows는 현재 4개로 표시했다:
  `prd/pre-validation/claude-codex-pre-validation.md`,
  `prd/pre-validation/sqlite-restart-recovery-pre-validation.md`,
  `docs/aiox/round-4-tui-smoke-check.md`,
  `docs/aiox/step-14-smoke-test-report.md`.

**명시적 non-actions:**

- `plans/post-mvp.plan.md`와 `plans/post-mvp/*` row는 수정하지 않았다. 그 rows는 parent plan post-Atlas
  single-plan stage owner다.
- `history/*` row를 만들지 않았다. history 원본 삭제·repoint는 W5 history migration owner다.
- docs/aiox stale reference cleanup을 직접 수행하지 않았다. 대부분 row가 deletion candidate로 전환됐으므로
  stale ref cleanup은 physical deletion gate에서 원본 삭제로 해소 가능하다. 삭제 전 보존이 필요해지면 그때
  별도 cleanup을 판단한다.
- archive digest 파일은 생성하지 않았다. W6은 source map disposition update 범위였고, digest 생성은
  source-map W3/archive 또는 physical gate 직전 owner가 수행해야 한다.

**검증:**

- [Fact] source map Work Item W4 decision 승격 추적을 draft 반영 상태로 기록했다. @user 지적 후 accepted
  완료가 아니라 checker pending으로 정정해야 함을 확인했다.
- [Fact] source map W2는 open 유지했다. archive digest와 physical deletion이 남아 있어 source map log는
  아직 closeout 대상이 아니다.

**Work Item 상태 정정(2026-06-22 @user 지적):** W6은 Codex draft update가 적용됐지만 W5/W6 checker PASS
전이므로 `[x]`가 아니다. W7 closeout도 아직 active가 아니다.

**다음:** W7 closeout & parent 반영. W7은 split map 정리, workflow retrospective(F56~ portable pattern
반영 포함), parent W4.5 W10 소비 반영안, status 전이를 수행한다. Body split, physical deletion,
single execution plan 작성은 하지 않는다.

## 2026-06-22 · W5 checker 검증 — decision 승격 2 promoted + 3 no-promotion PASS (Claude checker)

Task brief: `logs/W10-L-task.md`. 분업 = Codex draft → Claude checker. 이 블록은 W5 Codex draft
(이 로그 line 880-968)의 promotion/no-promotion 판정과 신규 decision 2건 본문을 1차 source에서
재검증한 결과다. W4 checker처럼 subagent fan-out 대신 controlling checker(Claude/Opus)가 직접 disk
대조했다. **checker는 owner body·decision 본문·source map·legacy 원본을 수정하지 않았다.**

**Verdict: PASS.** promoted 2건은 정확·근거충분·템플릿 준수·기존 decision과 비중복이고, no-promotion
3건은 기존 owner(decision/roadmap/architecture)가 load-bearing WHY를 실제로 커버한다. 잔여 1건은
W6/물리 gate로 handoff(아래).

**promoted #1 `codex-d7-authoritative-binding-scope.md` — PASS:**

- [Fact] Sources 전수 실재·정확. `history/34:34-151`(D7 first blocker actor/monitor 실험 42-61, Decision
  Options A~D 63-103, Option D 채택 108-119, Open Product Issue TUI rebind 132-151), `history/34:153-216`
  (callback/hook follow-up — codex-cli 0.132.0이 response-forwarding/subscription/callback 미제공 결론
  160-216), `docs/aiox/observation-asymmetry-and-d7-pivot.md:20-77`(D7 위반 20-22·callback 부재 36-46·
  Option D scope reduction 48-73), `logs/2026-06-19-mvp-history-archive.md:45-53`(Step 10 digest, D7 binding
  52), architecture §7.4 Transparent Proxy(569-607)+§7.5 Active-Thread Binding Authority(609-631), 모두 일치.
- [Fact] 기존 decision 비중복 확인(W4 checker 보정 #3 재확인). `client-orchestrator-runtime-pivot.md`=
  TS런타임/client orchestrator pivot(history/13), D7/observation/scope-reduction 미소유.
  `proxy-lazy-observation-cost-model.md`=proxy 비용 모델(indexOf lazy parse)로 attribution rule 미소유.
  `codex-per-agent-app-server.md`=1:1 topology/lifecycle로 binding-from-notification rule 미소유. →
  "notification-only observation은 binding 권위가 아니다"는 load-bearing rule이 어디에도 없어 승격 정당.
- [Inference] architecture §7.5는 outcome(3 writer source + fallback)을 소유하고 decision은 WHY(왜
  notification만으로 불충분한가)를 소유 → owner 분리 정확. decision이 "later proxy reintroduction"을
  서술하나 이는 load-bearing rule의 지속성을 설명하는 것이지 living patch가 아니라 `decisions/AGENTS.md`
  snapshot 규칙 위반 아님.

**promoted #2 `codex-app-server-mcp-injection-and-isolation.md` — PASS:**

- [Fact] Sources 전수 실재·정확. `history/40:246-333`(Step 14 injection target 교정 Problem/Cause/
  Resolution/Verification — TUI 주입 무시→app-server 주입 이동 276-309), `step-14-codex-mcp-remote-architecture-bug.md:18-26`
  (injection target mismatch + headless interactive auth hang), `:61-88`(App-Server 직접 주입 실험 증거4
  61-69 + isolation A/B 83-88), architecture §7.2:510-512(launchCodexAppServer가 `-c mcp_servers.aiox`
  주입)+§7.8:693-700(daemon-owned app-server에 주입, TUI엔 remote args만), 모두 일치.
- [Fact] `agent-level-mcp-process-scoping.md`은 global config 비오염 + per-process 주입 policy만 소유,
  app-server-vs-TUI target distinction과 headless global MCP isolation은 미소유 → 신규 decision은 정확한
  later refinement(load-bearing). `codex-per-agent-app-server.md`는 app-server lifecycle/topology만 소유.
- [Fact] isolation framing 정확. history/40:309 + architecture §7.8이 `CODEX_HOME`/profile 격리 **미적용**
  확인 → decision이 isolation을 "release hardening direction(Alternatives: isolated home/profile kept as
  preferred)"으로 둔 것과 현행 상태 일치.

**no-promotion 3건 검증:**

| Candidate | 커버 owner 확인 | Verdict |
| --- | --- | --- |
| `industry-precedents` → Opaque Worker / delivery-vs-completion | delivery/completion·fan-out·daemon authority는 `a2a-message-lifecycle-envelope-and-correlation.md`가 소유; 외부 benchmarking 표(OpenHands/Agent Protocol/LangGraph/Cline)는 dated explanatory narrative. alternatives-decision 형태 아님 | PASS (잔여 flag↓) |
| `aiox-a2a-spec.md §13` → architecture debt + Structured Logger | §13 본문 line 1068이 스스로 "왜 roadmap이 그렇게 배치됐는지 설명하는 비규범 rationale"로 선언. 축 A/B/C(state.ts decomp·ingress 일반화·pair-to-N)=roadmap Phase 2(122-137), Structured Logger=G3(67). architecture Known Gaps(1136-1151)가 as-built gap 소유 | PASS (강) |
| `proxy-vs-app-server` → app-server + proxy hybrid | tradeoff 문서 §4-3 A+P 열 + §7 7-factor가 `codex-per-agent-app-server.md`(1:1, tradeoff를 Sources 인용)+`proxy-lazy-observation-cost-model.md`(proxy 비용)+architecture §7.4 A+P 구조로 분산 커버. 신규 hybrid decision은 중복 | PASS |

**checker 잔여 1건 (blocking 아님, W6/물리 gate handoff):**

- [Inference] `industry-precedents` `absorb→delete`의 self-sufficiency 미세 공백: lifecycle decision이
  delivery/completion·daemon authority를 커버하나, **Opaque Worker coarse-state(`awaiting_agent_reply`) +
  semantic timeout(대기는 실패 아님) observability 원칙**은 단일 owner로 crisp하게 흡수됐는지 불확실하다.
  W5 결론(decision 미승격)은 정확하다 — 이건 alternatives-decision이 아니라 state/observability 원칙이라
  `docs/decisions/` 대상이 아니다. 다만 물리 삭제 전 이 원칙이 architecture(state model) 또는 D7 decision에
  실재로 남아 있는지 확인해야 한다. 이 self-sufficiency 정밀 감사는 W4 checker 잔여 #7과 동일하게 물리
  삭제 gate(self-sufficiency + @user confirm) 소유.

**Workflow retrospective(checker):**

- [Opinion] decision 승격 checker는 "신규 decision이 무엇을 추가하는가"와 "기존 decision이 무엇을 이미
  소유하는가"를 둘 다 disk 본문 grep으로 확정해야 한다. 파일명/주제 overlap 가정은 W4가 잡은
  `client-orchestrator-runtime-pivot` 오귀속처럼 틀릴 수 있다. portable 후보(W7 F56~).
- [Opinion] no-promotion 판정은 "어디에 흡수됐는지"를 owner `file:line`으로 명시해야 검증 가능하다. §13처럼
  source 본문이 스스로 "비규범 rationale"이라고 선언하면 no-promotion이 가장 견고하다.

**Work Item 전이:** W5 `[>]`→`[x]`(Codex draft + Claude checker PASS = accepted). W6 `[ ]`→`[>]`(Codex
draft 적용 완료, Claude checker 대기). 다음 = W6 source map disposition update draft checker — canonical
`logs/2026-06-21-workspace-reset-legacy-source-absorption.md` 표 row append/update가 W2~W5 결과와 일치하고
`plans/post-mvp*`·`history/*` rows 미수정인지 확인.

## 2026-06-22 · W6 checker 검증 — source map disposition update PASS (Claude checker)

Task brief: `logs/W10-L-task.md`. 분업 = Codex draft → Claude checker. 이 블록은 W6 Codex draft
(이 로그 line 970-1017이 기술한 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` disposition
update)를 `git diff`로 전수 대조한 결과다. **checker는 verdict 기록과 W6 disposition 완결(pending→PASS
마커 갱신, source-map W4 항목 전이)만 수행했고, legacy 원본·owner body·`plans/post-mvp*`·`history/*`는
수정하지 않았다.**

**Verdict: PASS.** source map row append/update가 W2~W5 결과와 정확히 일치하고, 경계(미수정 owner)를
지키며, 새 표를 만들지 않았다.

**git diff 기반 일치성 검증:**

- [Fact] decision 결과 일치. `observation-asymmetry`→`codex-d7-authoritative-binding-scope.md`,
  `step-14-codex-mcp-remote-architecture-bug`→`codex-app-server-mcp-injection-and-isolation.md` 승격 + 3건
  no-promotion(`industry-precedents`·spec §13·`proxy-vs-app-server`)이 W5 checker PASS와 일치.
- [Fact] Archive Gate 결과 일치. archive 5 = `absorb→delete candidate (physical gate only)`, pre-validation
  2 = `archive→delete candidate after digest + physical gate`로 W4 checker PASS와 일치.
- [Fact] digest-required = 정확히 4(`claude-codex-pre-validation`·`sqlite-restart-recovery-pre-validation`·
  `round-4-tui-smoke-check`·`step-14-smoke-test-report`), 나머지 전 row "No" → W4 checker digest 판정과 일치.
- [Fact] §13 disposition 일치. `prd/post-mvp/aiox-a2a-spec.md` row가 §13을 roadmap Phase 2/G3 + architecture
  Known Gaps로 self-contained, no decision promotion, 전체 파일 `keep / execution successor pending`으로 반영
  → W5 §13 no-promotion + W9 §12 흡수와 일치.

**경계 검증 (git diff):**

- [Fact] `plans/post-mvp.plan.md` + sub-plan(adapter-dispatch-registry/channel-boot-surface 등) rows는 diff
  context(unchanged)로만 등장 → 미수정. single execution successor pending 상태 유지.
- [Fact] `history/*` row 신규 생성 0.
- [Fact] 새 source map 표 0 — 기존 표 row in-place 갱신 + 말미 narrative append만.
- [Fact] legacy 원본·owner 문서 본문·archive digest 파일 미생성/미수정.

**checker 완결 action(W6 disposition update 범위):**

- [Fact] W5+W6 checker PASS에 따라 source map 25 row의 `Codex draft (checker pending)` 마커 50개를
  `Codex draft (W5/W6 checker PASS 2026-06-22)`로 갱신(`replace_all`). draft 시점 표기가 PASS 후에도 stale
  "pending"으로 남아 physical-gate 소비자를 오도하는 것을 방지.
- [Fact] source-map 패키지 Work Item W4(decision 승격 추적)를 `[>]`→`[x]` 완결 전이(5건 판정 + checker PASS
  + disposition 반영 완료). source-map 패키지 W2/W3/W5는 그 패키지 소유로 미전이.
- [Fact] source-map 로그에 `## 2026-06-22 · W10 source-map disposition Claude checker PASS` 블록을 append해
  W10 verdict pointer와 잔여 1건(coarse-state self-sufficiency)을 기록.

**checker 잔여(W5와 동일, blocking 아님):** `industry-precedents` `absorb→delete`의 Opaque Worker
coarse-state/semantic-timeout self-sufficiency 정밀 확인은 물리 삭제 gate 소유. W6 disposition은 정확.

**Workflow retrospective(checker):**

- [Opinion] source-map disposition checker는 `git diff`로 변경 row와 unchanged(경계) row를 한 번에 구분하는
  것이 가장 빠르고 누락이 적다. 표 전체를 다시 읽는 것보다 diff가 "무엇이 바뀌었나 + 무엇을 안 건드렸나"를
  동시에 증명한다. portable 후보(W7 F56~).
- [Opinion] draft가 자기 시점 한정 마커(`checker pending`)를 쓰면, checker가 PASS 시 그 마커를 명시적으로
  flip해야 표가 live 상태를 유지한다. draft-time 표기를 그대로 두면 영구 stale. portable 후보.

**Work Item 전이:** W6 `[>]`→`[x]`(Codex draft + Claude checker PASS = accepted). 다음 = W7 closeout &
parent 반영(split map 정리 logs/AGENTS.md item 10, workflow retrospective F56~, parent W4.5 W10 소비
반영안, status 전이). body split·물리 삭제·single execution plan은 미수행(physical gate/parent plan stage owner).
