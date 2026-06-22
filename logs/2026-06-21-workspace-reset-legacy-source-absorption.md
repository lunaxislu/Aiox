---
topic: workspace reset legacy source absorption map
description: documentation taxonomy에 owner가 없는 legacy 다중 폴더(prd/·plan/·docs/aiox/·plans/post-mvp/)의 owner 흡수·archive·삭제 disposition을 단일 source map으로 추적한다. W8/W9/W10이 흡수하며 append하고 물리 삭제 게이트가 단일 소비한다
status: open
---

## Work Items

- [x] W1 legacy 폴더 inventory & source map 초기화 (완료 2026-06-21, sonnet subagent 1차 분류 + controlling agent 조정) — `prd/`·`plan/`·`docs/aiox/`·`plans/post-mvp/`의 모든 파일을 source map 표에 등록하고 잠정 흡수 owner·소비 package를 매핑한다.
- [>] W2 흡수 진행 추적 — W8(specs)/W9(roadmap·release)/W10(split)이 owner 흡수를 수행할 때마다 같은 source map에 disposition과 self-sufficiency 검증을 append/update한다.
- [ ] W3 archive 판정 — `logs/AGENTS.md`의 Archive Gate(보존가치 + self-sufficiency)를 개별 파일에 적용해 `logs/` digest 필요 여부를 확정한다.
- [x] W4 decision 승격 추적 — gemini가 docs/decisions/ 부재/미흡으로 확인한 5개 후보(industry-precedents=Opaque Worker / observation-asymmetry=D7 Scope Reduction / aiox-a2a §13=아키텍처 부채 3축+Structured Logger / step-14-mcp-bug=App Server 주입·격리 / proxy-vs-app-server=app-server+proxy 하이브리드)를 W8/W10 흡수 중 W6 기준으로 `docs/decisions/`에 승격한다. 승격 전 docs/decisions/ 현황을 disk에서 재확인하고, 완료를 source map disposition에 반영한다. — **완료(2026-06-22 W10 W5/W6 Claude checker PASS): 2건 승격(`codex-d7-authoritative-binding-scope.md`, `codex-app-server-mcp-injection-and-isolation.md`) + 3건 no-promotion accepted. 5건 모두 source map disposition에 반영됨. checker 잔여 1건(`industry-precedents` Opaque Worker coarse-state/semantic-timeout self-sufficiency)은 W3/물리 gate handoff.** decision 승격 추적 완결; 물리 삭제는 W5 handoff 소유.
- [ ] W5 closeout & 물리 삭제 handoff — 전체 disposition이 확정되면 `plans/workspace-reset/workspace-reset.md`의 단일 물리 삭제 게이트로 handoff한다. 원본 삭제는 owner/archive successor self-contained 검증과 사용자 확인 후 그 게이트에서만 한다.

### Scope

- Primary owner: 이 로그의 legacy source absorption map(아래 표).
- Allowed cross-owner updates: 없음. 이 package는 추적 장부다. 실제 owner 문서(`docs/specs/`·`docs/architecture/`·`docs/product/roadmap.md`·`plans/release-plan.md`·`docs/decisions/`) 수정은 W8/W9/W10 흡수 package가 자기 Scope에서 수행하고, 그 결과를 이 source map에 disposition으로 반영한다.
- Evidence inputs: `prd/`(mvp·post-mvp·pre-validation), `plan/`(mvp-implementation-checklist·qa-tracker), `docs/aiox/`(19), `plans/post-mvp.plan.md` + `plans/post-mvp/`(4). 경계: `history/`는 W5 history migration 소유로 제외.

### Legacy Source Map

| file | 주장 성격 | 흡수 owner | 소비 package | archive 필요? | self-sufficiency 검증 | disposition |
| ---- | -------- | --------- | ----------- | ------------ | -------------------- | ----------- |
| `prd/mvp/aiox-mvp-spec.md` | MVP product scope+UX+non-goal+원칙 | spec + architecture | W8 | No | TBD | absorb→delete? |
| `prd/post-mvp/aiox-a2a-spec.md` | product·protocol·arch·roadmap 통합 monolith (분리 예고 self-declared) | spec + architecture + roadmap + decision | W8 + W9 + W10 | No for §12/§13; no separate digest needed | W8: §2-§9 protocol contract self-contained (W7 PASS). W9: §11 release gate/phase authority는 roadmap에 있고 현재 단일 plan successor pending, §12 release pressure는 roadmap Pre-Release Gap Summary+gates에 흡수(PASS). W10: §13 architecture debt/Structured Logger는 roadmap Phase 2/G3 + architecture Known Gaps/Post-MVP로 self-contained; no decision promotion. 전체 파일 삭제는 single execution plan successor 후 재판정 | keep / execution successor pending; W10 §12/§13 absorbed, no archive digest |
| `prd/post-mvp/archive/claude-codex-validation.md` | 설계 cross-validation transcript | architecture + decision | W9 + W10 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): archive header declares not authority+history/58; envelope/reply/tier/fan-out/blind spot rationale는 spec §4/§5와 `a2a-message-lifecycle...` decision에 흡수. conversational cross-validation 원문은 고유 empirical trace가 아님 | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `prd/post-mvp/archive/claude-opinion.md` | 설계 초기 의견 | architecture + decision | W9 + W10 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): local control plane, agents/routes/capabilities/policies, instruction layering, adapter compile, capability-vs-sandbox, federation/remote 방향은 product/spec/roadmap에 흡수. 외부 precedent/market claim은 dated 재검증 없이는 owner fact로 보존하지 않음 | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `prd/post-mvp/archive/codex-claude-validation.md` | cross-validation transcript | architecture + decision | W9 + W10 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): product definition, compose-before-envelope warning, adapter compile, identity/transport/policy/sandbox, app-server/runtime connector 브레인스토밍은 product/spec/architecture에 흡수. 고유 empirical trace 아님 | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `prd/post-mvp/archive/codex-opinion.md` | 설계 초기 의견 | architecture + decision | W9 + W10 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): native instruction replacement 금지, launch-scoped generated instruction, adapter asymmetry absorption, local agent control plane 모델은 현 spec/product에 흡수. digest 불필요 | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `prd/post-mvp/archive/gemini-opinion.md` | 설계 초기 의견 | architecture + decision | W9 + W10 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): agents/routes/capabilities/policies 스키마와 "Agent is not container" 경고는 현 spec §6/§7에 흡수. digest 불필요 | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `prd/pre-validation/claude-codex-pre-validation.md` | MVP arch 사전검증 spike (PASS, 2026-05-14) | architecture (evidence) | W8 + W9 + W10 | Yes — logs digest required before deletion | W10 Codex draft (W5/W6 checker PASS 2026-06-22): 결론(Claude channel injection 가능, Codex app-server thread-targeted turn 가능, trust/metadata open issues)은 architecture/spec/roadmap에 흡수. setup/observed transcript/PASS trace는 owner 문서에 같은 밀도로 없음 | archive→delete candidate after digest + physical gate (W5/W6 checker PASS 2026-06-22) |
| `prd/pre-validation/sqlite-restart-recovery-pre-validation.md` | SQLite restart recovery 사전검증 (PASS, 2026-05-16) | architecture (evidence) | W8 + W9 + W10 | Yes — logs digest required before deletion | W10 Codex draft (W5/W6 checker PASS 2026-06-22): durable store 결론/현재 gap은 spec/architecture/roadmap에 흡수. WAL, restart transition, late reply, verification commands/PASS counts/not-validated list는 owner 문서에 같은 밀도로 없음 | archive→delete candidate after digest + physical gate (W5/W6 checker PASS 2026-06-22) |
| `plan/mvp-implementation-checklist.md` | MVP TDD 11단계 체크리스트 (closed) | logs archive + architecture provenance | W5 완료; W8/W10는 docs/aiox 잔여 참조만 | Yes → `logs/2026-06-20-mvp-plan-carryover-archive.md` | archive self-contained; live owner refs repointed; docs/aiox refs = deletion-gate dependency | archive→delete (docs/aiox 흡수 후 physical gate) |
| `plan/qa-tracker.md` | MVP QA 상태판 (QA-001~003) | logs archive + decision provenance | W5 완료; W8/W10는 docs/aiox 잔여 참조만 | Yes → `logs/2026-06-20-mvp-plan-carryover-archive.md` | archive self-contained; live owner/plans refs repointed; docs/aiox refs = deletion-gate dependency | archive→delete (docs/aiox 흡수 후 physical gate) |
| `docs/aiox/agent-runtime-container-model.md` | runtime container 학습기록 (권위 history/31) | architecture | W8 / W10 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): `CodexAgentRuntime` product model learning record; current runtime boundary는 `local-agent-runtime.md` §7.1과 `codex-per-agent-app-server` decision으로 self-contained | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/claude-channel-registration-and-trust-model.md` | channel 등록+trust 내부구조 | architecture | W8 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): token/dynamic endpoint/endpoint hijack rationale는 `claude-channel-trust-and-registration` decision과 architecture §6으로 self-contained; stale spike detail은 보존하지 않음 | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/codex-thread-focus-and-loaded-list.md` | thread focus 학습기록 | architecture | W8 / W10 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): current architecture §7.5~§7.7, pair-slot decision and proxy decision cover accepted outcome; stale `thread/loaded/list.at(-1)` path superseded. rename-drift exists but deletion resolves | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/industry-precedents-and-observability-models.md` | 외부 벤치마크+Opaque Worker 설계레슨 | architecture + decision | W8 / W10 | No | W10/W5 Codex draft (W5/W6 checker PASS 2026-06-22): delivery/completion 분리와 daemon authority는 `a2a-message-lifecycle-envelope-and-correlation` decision/spec §4가 소유. external precedent narrative는 explanatory, not load-bearing decision WHY | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/mcp-scope-and-daemon-namespace.md` | MCP scope 2분류 | spec + architecture | W8 | No | W8: runtime MCP/channel projection + profile/socket namespace contract가 spec §3.1/§5/§7에 흡수(W7 PASS); 헤더의 `docs/architecture/mvp-architecture.md` rename-drift는 W10 cleanup | absorb→delete (W10 stale ref cleanup 후) |
| `docs/aiox/mvp-architecture.md` | **stale** 구버전 as-built 스냅샷 (고정 pair 통신; `local-agent-runtime.md`로 승격됨) | architecture (stale) | W8 + W10 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): stale as-built snapshot; current `local-agent-runtime.md` and decisions are successor. Stale snapshot itself has low preservation value and risks authority confusion | delete-only candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/observation-asymmetry-and-d7-pivot.md` | D7 위반+pivot 경위 | architecture + decision | W8 / W10 | No | W10/W5 Codex draft (W5/W6 checker PASS 2026-06-22): load-bearing D7 WHY promoted to `docs/decisions/codex-d7-authoritative-binding-scope.md`; current proxy outcome in architecture §7.4~§7.7 | absorb→delete candidate (decision promoted draft; physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/pair-attach-kind-mismatch.md` | pair attach 버그 학습 (권위 history/16) | architecture | W8 / W10 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): pair attach atomicity/sentinel and pair-slot decisions + architecture repository row cover accepted rationale; Step 15 supersedes old kind-slot detail | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/per-agent-transparent-proxy-decision.md` | transparent proxy 결정 학습 (history/41) | architecture | W8 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): architecture §7.4~§7.5 and `proxy-lazy-observation-cost-model` decision cover current proxy rule | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/phase-a-design-decisions.md` | Phase A Codex runtime 결정 (history/33) | architecture | W8 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): `codex-per-agent-app-server` decision and architecture §7.1~§7.3 self-contained | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/proxy-attribution-signals.md` | proxy 신호 매핑 학습 | architecture | W8 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): architecture §7.4~§7.5 owns current same-connection binding rule; detailed explainer not needed | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/proxy-cost-model.md` | proxy 비용모델 학습 | architecture | W8 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): `proxy-lazy-observation-cost-model` decision and architecture §7.4 lazy parse note are self-contained | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/proxy-vs-app-server-tradeoff.md` | proxy vs app-server 결정 | architecture + decision | W8 | No | W10/W5 Codex draft (W5/W6 checker PASS 2026-06-22): `codex-per-agent-app-server` preserves 1:1 app-server WHY and RSS trade-off; `proxy-lazy-observation-cost-model` preserves proxy WHY; current A+P outcome is architecture §7.4~§7.7 | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/README.md` | docs/aiox 폴더 meta/taxonomy | architecture (meta) | W10 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): folder meta has no successor need once docs/aiox is absorbed/deleted | delete-only candidate (folder disposition; physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/round-4-tui-smoke-check.md` | Round4 manual smoke 학습 | architecture (test) | W8 / W10 | Yes — logs digest required before deletion | W10 Codex draft (W5/W6 checker PASS 2026-06-22): S1~S5 manual smoke procedures/results are not preserved in same density by architecture smoke matrix. Preservation value + digest self-sufficiency condition met | archive→delete candidate after digest + physical gate (W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/step-14-codex-mcp-remote-architecture-bug.md` | Step14 MCP injection 버그 (empirical 증거) | architecture + decision | W8 / W10 | No | W10/W5 Codex draft (W5/W6 checker PASS 2026-06-22): load-bearing app-server MCP injection/isolation WHY promoted to `docs/decisions/codex-app-server-mcp-injection-and-isolation.md`; current behavior in architecture §7.2/§7.8; history/40 preserves main verification | absorb→delete candidate (decision promoted draft; physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/step-14-codex-thread-mismatch-discovery.md` | Step14 thread 불일치 학습 | architecture | W8 / W10 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): current owner is architecture §7.5~§7.7 and pair-slot decision; stale `thread/loaded/list` fix path superseded. rename-drift exists but deletion resolves | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/step-14-smoke-test-report.md` | Step14 E2E smoke (2 blocking issue) | architecture (test) | W8 / W10 | Yes — logs digest required before deletion | W10 Codex draft (W5/W6 checker PASS 2026-06-22): blocker trace and verification list are not preserved in same density by owner body; digest needed before deletion | archive→delete candidate after digest + physical gate (W5/W6 checker PASS 2026-06-22) |
| `docs/aiox/step-6-cli-decisions-walkthrough.md` | Step6 CLI 결정 walkthrough | architecture | W8 / W10 | No | W10 Codex draft (W5/W6 checker PASS 2026-06-22): architecture §8.2/§9.1 and current command table are self-contained; stale architecture ref exists but deletion resolves | absorb→delete candidate (physical gate only; W5/W6 checker PASS 2026-06-22) |
| `plans/post-mvp.plan.md` | Post-MVP 실행 index + Session Re-entry (obsolete scratch pointer 포함) | roadmap (우선순위/sequencing) + plans 재편 | W9 + future single-plan stage | No | W9 PASS: roadmap은 Candidates/Sequenced 우선순위를 흡수했지만 단일 A2A execution plan 작성이 Obsidian/Atlas 이후로 deferred. 단일 plan 전에는 execution detail successor가 없어 self-contained 아님 | keep / execution successor pending (single plan 후 disposition 재판정) |
| `plans/post-mvp/adapter-dispatch-registry.plan.md` | dispatch→adapter registry sub-plan (deferred) | plans 재편 (single plan으로) | W9 + future single-plan stage | No | W9 PASS: roadmap G1 adapter boundary + Phase 2 ingress prerequisite로 priority는 흡수. refactor options/checklist는 단일 plan successor 필요 | keep / execution successor pending (single plan 후 disposition 재판정) |
| `plans/post-mvp/channel-boot-surface.plan.md` | channel boot surface sub-plan (deferred) | plans 재편 | W9 + future single-plan stage | No | W9 PASS: roadmap G3/G1 diagnosability pressure로 priority는 흡수. startup ack/fatal propagation checklist는 단일 plan successor 필요 | keep / execution successor pending (single plan 후 disposition 재판정) |
| `plans/post-mvp/codex-structured-metadata-spike.plan.md` | codex metadata spike sub-plan (deferred) | plans 재편 | W9 + future single-plan stage | No | W9 PASS: roadmap G1-A evidence / Phase 1 Tier 2 uplift 후보로 priority는 흡수. investigation question/output/verification은 단일 plan successor 필요 | keep / execution successor pending (single plan 후 disposition 재판정) |
| `plans/post-mvp/envelope-metadata.plan.md` | envelope metadata sub-plan (next kickoff) | plans 재편 | W9 + future single-plan stage | No | W9 PASS: roadmap G1-A/B/C next kickoff로 priority는 흡수. implementation increments/acceptance/kickoff checklist는 단일 plan successor 필요 | keep / execution successor pending (single plan 후 disposition 재판정) |

## 2026-06-21 · legacy source absorption package 시작

Parent pointer: `logs/2026-06-16-workspace-reset-폴더별-inventory.md` (물리 삭제 게이트는 `plans/workspace-reset/workspace-reset.md`가 단일 소유)
형제 package: `logs/2026-06-19-workspace-reset-W5-history-migration.md` (`history/` 담당)

이 package는 `logs/AGENTS.md`의 `Legacy Source Absorption Map` 규칙을 실행한다. documentation
taxonomy(`docs/architecture/documentation-system.md`)에 owner가 없는 legacy 다중 폴더를 단일
source map으로 추적한다. 표는 이 package가 소유하고, 흡수 package(W8 specs / W9 roadmap·release /
W10 split)가 owner 흡수를 수행하며 같은 표에 disposition을 append/update한다. 최종 물리 삭제는
plan stage의 단일 게이트가 이 표를 소비한다.

**경계:**

- `history/`는 W5 history migration이 owner이므로 이 표에 중복 기록하지 않는다.
- `docs/aiox`는 W5에서 명시적 제외(dependency-only)였으므로 이 source map이 owner다.
- 한 source가 여러 package에 걸치면 소비 package를 복수로 적는다(예: `prd/post-mvp/aiox-a2a-spec.md` = W8 + W9).

**다음:** W1 legacy inventory를 subagent(sonnet)로 수집해 source map을 초기화한다.

## 2026-06-21 · W1 inventory 완료 — source map 초기화

sonnet subagent가 35개 파일(prd 9 + plan 2 + docs/aiox 19 + plans/post-mvp 5)을 1차 분류했고,
controlling agent가 검토·조정해 source map에 반영했다. disposition은 모두 **candidate(잠정)**이며,
최종 확정은 W8/W9/W10 흡수 단계에서 `src/` + `history/` 교차검증 후 한다.

**잠정 분포 (1차):**

- spec 후보: `prd/mvp/aiox-mvp-spec.md`, `prd/post-mvp/aiox-a2a-spec.md`, `docs/aiox/mcp-scope-and-daemon-namespace.md`.
- architecture 후보: `docs/aiox/` 대부분 + pre-validation 2 + claude-channel 등 (~17).
- roadmap/release/plans 재편: `plans/post-mvp.plan.md` + sub-plan 4.
- decision 내재 후보: `industry-precedents`, `observation-asymmetry-and-d7-pivot`, `aiox-a2a-spec §13`, `step-14-mcp-bug`, `proxy-vs-app-server`.
- delete-only(흡수완료 주장): `prd/post-mvp/archive/` 5.

**controlling agent 조정 (subagent 1차와 다른 지점):**

- `plans/post-mvp.plan.md` + sub-plan 4: subagent는 현재 active/deferred라 `keep`으로 분류했으나,
  **사용자 목표는 흡수 후 삭제**다(`plans/`엔 단일 plan만, post-mvp는 roadmap/release/단일 plan으로
  재편). 따라서 disposition을 `absorb→delete (재편 후)` + ⚠️로 조정했다. 단 현재 `envelope-metadata`는
  next-kickoff, `post-mvp.plan.md`는 WS2 current work라 **즉시 삭제 불가** — W9 roadmap 재편과
  새 단일 plan 도출이 선행해야 한다.

**흡수 단계(W8~)에서 disk 검증할 항목 (subagent 주의 + controlling 판단):**

1. ⚠️ `docs/aiox/mvp-architecture.md` vs `docs/architecture/mvp-architecture.md` — 동일 파일인지 별도인지
   확인. 별도면 docs/aiox 버전 stale 가능. (W7 local runtime package가 docs/architecture를 이미 정합했음)
2. `prd/post-mvp/archive/` 5개 — 헤더의 "consolidated" 선언만으로 delete-only 단정 금지.
   `docs/specs/aiox-a2a.md`와 실제 대조 후 확정.
3. `prd/pre-validation/` 2 + `plan/mvp-implementation-checklist.md` + `qa-tracker.md` — 대응 history
   (예: history/42)가 검증 트레이스를 충분히 커버하면 archive 불필요(`absorb→delete`).
   Archive Gate(보존가치 + self-sufficiency) 개별 적용.
4. decision 내재 후보 5건 — 이미 `docs/decisions/`에 올라갔는지 확인 후 미흡 시 승격(W6 기준).

**경계 재확인:** `history/`는 source map에서 제외(W5 소유). `docs/aiox` 흡수/삭제 owner는 이 source map.

**다음:** W8 A2A spec authority assimilation package log를 생성한다(Primary owner =
`docs/specs/aiox-a2a.md`). W8이 흡수하는 파일의 disposition을 이 source map에 append/update한다.

## 2026-06-21 · codex·gemini 리뷰 반영

codex(구조/규칙 정합성 축)와 gemini(disk 검증 4건) 독립 리뷰를 받아 source map을 보정했다(F13:
코드/문서 축 분리 독립 검증).

**codex 판정:** A 규칙 정합성 Pass · B package 구조 Pass · C source map 분류 **수정필요**(archive
5개 확정도) · D 재개 가능성 Pass · E 검증항목 Pass. 단 E는 "경로 충돌"이 아니라 **rename drift**
(`docs/architecture/mvp-architecture.md` 부재, `local-agent-runtime.md`가 권위)로 정정 요청.

**gemini disk 검증 4건:**

1. [Fact] `docs/aiox/mvp-architecture.md`는 stale 구버전(고정 pair 통신 서술). `docs/architecture/mvp-architecture.md`는
   디스크에 없고 `local-agent-runtime.md`로 rename됨. 두 파일은 별도(stale 관계). → 표 보정 완료
   (owner `architecture (stale)`, disposition `delete-only?`). 사용자도 부재 확인.
2. [Fact] `prd/post-mvp/archive/` 5개: 핵심 결정은 `aiox-a2a.md`에 통합됐으나 브레인스토밍 맥락(Docker/
   Mesh/Actor 모델 비교, `compose.yaml` 스키마)은 미커버. **delete-only 단정 금지** — 흡수+self-suffic
   검증 전 삭제 보류. → 표 보정 완료(archive `?`, `absorb→delete? (보류)`).
3. [Fact] pre-validation 2 + mvp-checklist + qa-tracker: `history/42`는 고수준 마일스톤 선언일 뿐
   상세 커밋 해시·단위테스트·QA 라이프사이클 trace(유일한 Provenance) 미포함. → `archive→delete?` 유지,
   Archive Gate 개별 적용해 digest 보존 후 삭제.
4. [Fact] decision 내재 후보 5개 모두 `docs/decisions/`에 부재/미흡 → 승격 필요. W4 Work Item으로 등록.
   - industry-precedents → Opaque Worker 모델
   - observation-asymmetry-and-d7-pivot → D7 Scope Reduction (aiox-originated authoritative ops 한정)
   - aiox-a2a-spec §13 → 아키텍처 부채 3축(state.ts god factory 분해·ingress 일반화) + Structured Logger
     (`pair-slot-generalization.md`가 일부만 간접 반영)
   - step-14-codex-mcp-remote-architecture-bug → App Server 주입·격리 (`agent-level-mcp-process-scoping.md`는
     Step 13 시점이라 이 결정 미포함)
   - proxy-vs-app-server-tradeoff → 1:1 app-server + 1:1 transparent proxy 하이브리드 종합 결정서 부재

**Cross-Owner Effects (예고, 실행은 W8/W10):**

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |
| `docs/decisions/` (신규 ~5) | decision 승격 5건 | gemini가 부재/미흡 확인 | 승격 전 disk 재확인(W6 기준) |

**남은 판단:** archive 5개·pre-validation의 최종 `archive vs absorb`는 W8~W10 흡수 시
Archive Gate 개별 적용으로 확정한다. disposition은 여전히 candidate다.

## 2026-06-21 · plan/ carryover archive 반영 (source map 정정)

codex 확인 + disk 검증: `plan/mvp-implementation-checklist.md`·`plan/qa-tracker.md`는 W5 B5에서
이미 `logs/2026-06-20-mvp-plan-carryover-archive.md`로 archive digest가 생성됐고(successor 선언
carryover-archive:13-17), 원본은 delete candidate로 판정됐다(W5 log:1017-1021). live owner inbound
(`local-agent-runtime.md` / `runtime-profile-namespace-isolation.md` / `envelope-metadata.plan.md` /
`release-plan.md`)는 repoint 완료. 남은 blocker는 `docs/aiox` 잔여 참조뿐.

→ source map 2행 정정: archive 필요 `Yes (carryover-archive)`, self-suffic `archive self-contained +
owner repointed`, disposition `archive→delete (docs/aiox 흡수 후 physical gate)`. **W8/W10은 이 두
원본의 핵심 팩트를 재흡수할 필요 없고**, docs/aiox 잔여 참조만 삭제 게이트에서 처리한다. 이로써
이전 `history/42 중복확인` 메모는 해소된다(successor는 history/42가 아니라 carryover-archive).

## 2026-06-21 · W8 Codex source-map update draft — Claude checker review 대기

이 블록은 W8 A2A spec authority package의 **Codex draft**다. 아래 disposition/self-sufficiency는
아직 source map 확정 표를 갱신한 값이 아니다. Claude checker가 legacy source, successor owner
문서, W7/W9/W10 handoff와 대조해 PASS한 row만 상단 source map 표에 수용한다.

### W8 draft update candidates

| file | 주장 성격 | W8 draft owner 흡수 판정 | archive 필요? | self-sufficiency 검증 draft | disposition draft |
| ---- | -------- | ------------------------ | ------------ | --------------------------- | ----------------- |
| `prd/post-mvp/aiox-a2a-spec.md` | product·protocol·architecture·roadmap·decision monolith | W8은 §2-§9 protocol contract와 §0/§1 중 protocol/runtime-config에 필요한 current/target claim을 `docs/specs/aiox-a2a.md`에 흡수했다. W7 PASS로 §3.1, §4.2, §4.5, §5, §6, §7, §8, §9, intro §10-§13 owner-boundary가 review 통과했다. §11/§12 roadmap/release pressure와 §13의 product/architecture rationale은 W9/W10/decision handoff로 남는다. | §12 dated audit 중 보존가치 있는 trace만 W9/W10에서 재판정 | W8 spec successor는 §2-§9 protocol contract를 self-contained하게 읽을 수 있다. 단 전체 파일 삭제 self-sufficiency는 W9 roadmap/release 흡수와 W10 architecture/decision split 후에만 판정 가능. | `absorb→delete (W9/W10 후)` 유지; W8 protocol portion만 PASS 후보 |
| `history/58-post-mvp-a2a-architecture-decisions.history.md` | post-MVP A2A architecture/product lock history | source map 경계상 `history/`는 W5 history migration owner라 표 대상은 아니다. W8은 §4 lifecycle WHY decision의 근거로만 사용했고, 신규 decision draft `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`에 source로 기록했다. | source map 대상 아님 | history 원본 처리/삭제는 W5 history migration 규칙을 따른다. W8은 중복 source-map row를 만들지 않는다. | source map row 추가 없음 |
| `prd/post-mvp/archive/claude-codex-validation.md` | archived cross-validation transcript | W8 §4 lifecycle decision draft의 보조 WHY source로만 사용했다. fan-out, reply routing, delivery-vs-message, vendor-neutral envelope, daemon authority rationale는 decision draft에 증류됐다. | No, W8 §4 decision 범위에 한정하면 archive digest 불필요 | W8 decision draft + `docs/specs/aiox-a2a.md` §4 + `history/58`로 §4 lifecycle WHY는 self-contained. 다만 archive 파일 전체의 Docker/compose/adapter/capability 브레인스토밍은 W9/W10 대조 전 삭제 확정 불가. | row는 `absorb→delete? (보류)` 유지; W8 §4 decision portion만 흡수 후보 |
| `prd/post-mvp/archive/codex-claude-validation.md` | archived cross-validation transcript / product-definition refinement | W8 §4 decision에는 직접 흡수하지 않았다. product definition·remote expansion·compose sequencing 성격이 커서 W9/W10 대상이다. | ? | W8만으로 self-contained 판정 불가. `docs/product/product.md`, `docs/product/roadmap.md`, architecture/decision split과 대조 필요. | `absorb→delete? (보류)` 유지 |
| `prd/post-mvp/archive/claude-opinion.md` | 설계 초기 의견 | W8에서 직접 흡수 완료로 판정하지 않는다. W8 source로는 검증하지 않았고, source map 기존 보류 판단을 유지한다. | ? | self-sufficiency 미검증. W9/W10에서 Docker/compose/capability/adapter 브레인스토밍 잔여를 대조해야 한다. | `absorb→delete? (보류)` 유지 |
| `prd/post-mvp/archive/codex-opinion.md` | 설계 초기 의견 | W8에서 직접 흡수 완료로 판정하지 않는다. capability tier와 adapter model 일부는 spec §5/§7에 반영됐지만, archive 파일 전체 self-sufficiency는 미검증이다. | ? | self-sufficiency 미검증. W10 architecture/decision 후보 대조 필요. | `absorb→delete? (보류)` 유지 |
| `prd/post-mvp/archive/gemini-opinion.md` | 설계 초기 의견 | W8에서 직접 흡수 완료로 판정하지 않는다. | ? | self-sufficiency 미검증. W9/W10 대조 필요. | `absorb→delete? (보류)` 유지 |
| `prd/mvp/aiox-mvp-spec.md` | MVP product scope+UX+non-goal+원칙 | W8은 directed route, fan-out, daemon authority, namespace 같은 A2A protocol과 겹치는 claim만 현재 spec/architecture와 대조했다. MVP pair capacity 등 일부는 현재 code와 decision에 의해 stale 또는 superseded다. | No로 보이나 W8 단독 확정 금지 | W8 protocol contract만으로 MVP PRD 전체 삭제 self-sufficiency는 부족하다. `docs/architecture/local-agent-runtime.md`, carryover archive, W5/W10과 대조해야 한다. | `absorb→delete?` 유지; W8 단독 PASS 금지 |
| `docs/aiox/mcp-scope-and-daemon-namespace.md` | MCP scope 2분류 + daemon namespace | W8은 agent-level runtime MCP/channel, launch-scoped projection, global config non-mutation, socket namespace/`AIOX_SOCKET_PATH`, optional control MCP boundary를 `docs/specs/aiox-a2a.md` §3.1, §5, §7에 부분 흡수했다. Current code cite는 W7 PASS 범위에 포함됐다. | No | W8 spec successor는 runtime MCP/channel projection과 profile/socket namespace contract를 self-contained하게 읽을 수 있다. 다만 문서 헤더의 `docs/architecture/mvp-architecture.md`는 rename drift라 W10에서 inbound/stale reference cleanup 필요. | `absorb→delete` 후보; W10 stale reference cleanup 후 physical gate |
| `docs/aiox/mvp-architecture.md` | stale 구버전 as-built snapshot | W8은 이 파일을 protocol source로 확정 흡수하지 않았다. 현재 architecture authority는 `docs/architecture/local-agent-runtime.md`이고, source map 기존 rename-drift/stale 판단을 유지한다. | No | W8 기준 self-sufficiency 판정 불가. W10이 stale 고유내용 유무를 확인해야 한다. | `delete-only?` 유지; W10 확인 필요 |
| `prd/pre-validation/claude-codex-pre-validation.md` | MVP architecture pre-validation spike | W8 spec current contract의 직접 source로 확정하지 않았다. | ? | W8로 self-sufficiency 판정 불가. Archive Gate는 W3/W10에서 개별 적용. | `archive→delete?` 유지 |
| `prd/pre-validation/sqlite-restart-recovery-pre-validation.md` | SQLite restart recovery pre-validation spike | W8은 DB path scaffold/current `:memory:` gap을 code cite로 검증했지만, 이 pre-validation 원문을 successor로 흡수했다고 판정하지 않는다. | ? | W8 spec §3.1/§4.5/§7.2는 current DB gap을 self-contained하게 설명한다. restart-recovery spike trace 보존가치는 Archive Gate에서 별도 판정. | `archive→delete?` 유지 |

### W8 draft notes

- W8에서 확정적으로 말할 수 있는 것은 `docs/specs/aiox-a2a.md`의 protocol contract 흡수 범위다. roadmap/release/architecture split까지 포함한 legacy file 전체 disposition은 W9/W10 전에는 확정하지 않는다.
- 새 decision draft: `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`. 이 파일은 §4 lifecycle WHY만 소유하고, correlated reply authorization과 public `deliveryId` namespace는 Open으로 남긴다.
- `history/`는 W5 owner라 source map row를 만들지 않는다. W8 decision Sources에만 기록했다.

## 2026-06-22 · W9 source-map draft disposition 반영

W9 release/roadmap authority package의 두 checker PASS 결과를 source map 기존 row에 반영했다. 이 반영은
최종 disposition 확정이 아니라 W9 소비 결과와 남은 owner 조건을 표에 드러내기 위한 draft/보류 업데이트다.

반영한 사실:

- `prd/post-mvp/aiox-a2a-spec.md`:
  - W8 §2-§9 protocol contract successor는 PASS.
  - W9 §12 release pressure는 `docs/product/roadmap.md` Pre-Release Gap Summary+gates에 흡수됨.
  - §11/plan execution detail은 단일 A2A execution plan successor pending이며, 전체 파일 삭제 self-sufficiency는 W10 §13 split과 §12 Archive Gate 후 판정.
- `plans/post-mvp.plan.md` + sub-plan 4:
  - W9 PASS로 roadmap priority/mapping은 확인됨.
  - 단일 A2A execution plan 작성이 Obsidian/Atlas stage 이후로 deferred라 execution successor가 아직 없다.
  - disposition은 `keep / execution successor pending`; single plan 후 재판정.
- `prd/post-mvp/archive/*` 5:
  - W9 release/roadmap body apply 대상 아님.
  - compose/schema/adapter/instruction/sandbox/remote rationale는 W10 architecture/decision successor self-sufficiency와 Archive Gate 후 확정.
- `prd/pre-validation/*` 2:
  - W9 release body apply 대상 아님.
  - dated spike trace는 현 owner 문서만으로 self-contained하지 않아 W10 Archive Gate에서 logs digest 필요 방향.

명시적 non-actions:

- 새 source map 표를 만들지 않았다.
- `history/` row를 만들지 않았다.
- owner 문서, legacy 원본, roadmap link, 단일 plan, 물리 삭제는 수정하지 않았다.
- `absorb→delete` final disposition은 확정하지 않았다.

다음:

- W2 흡수 진행 추적은 open 유지한다.
- W10 split/decision/architecture package가 archive 5·pre-validation 2·`prd/post-mvp/aiox-a2a-spec.md` §13과 remaining self-sufficiency를 이어받아야 한다.

## 2026-06-22 · W10 source-map disposition Codex draft 반영

W10 split readiness package의 W4 legacy must-check, W5 decision 승격, W6 source-map update 결과를
상단 source map 기존 row에 draft로 반영했다. 이 반영은 physical deletion 확정이 아니며,
Claude/checker PASS 전에는 W10 accepted 결과도 아니다. 현재 목적은 W10 Codex draft와 남은 삭제 조건을
표에 드러내는 것이다.

반영한 사실:

- `prd/post-mvp/aiox-a2a-spec.md`:
  - W8 §2-§9 protocol contract successor PASS, W9 §12 release pressure roadmap successor PASS.
  - W10 §13 architecture debt/Structured Logger는 roadmap Phase 2/G3와 architecture Known Gaps/Post-MVP로
    self-contained하다고 판정했고, 별도 decision은 no-promotion.
  - 전체 파일은 `plans/post-mvp*` single execution successor가 아직 없으므로 `keep / execution successor pending`.
- `prd/post-mvp/archive/*` 5:
  - W10 Archive Gate PASS: conversational opinion/cross-validation 원문이며 고유 empirical trace가 아님.
  - accepted rationale는 product/spec/roadmap/architecture/decision successor로 self-contained.
  - disposition을 `absorb→delete candidate (physical gate only)`로 갱신.
- `prd/pre-validation/*` 2:
  - current conclusion은 owner 문서에 흡수됐지만 setup/observed transcript/PASS trace는 owner 문서에 같은
    밀도로 없음.
  - disposition을 `archive→delete candidate after digest + physical gate`로 갱신.
- `docs/aiox/*` 19:
  - W10/W5 decision 결과 반영: `observation-asymmetry-and-d7-pivot.md` →
    `docs/decisions/codex-d7-authoritative-binding-scope.md`, `step-14-codex-mcp-remote-architecture-bug.md` →
    `docs/decisions/codex-app-server-mcp-injection-and-isolation.md`.
  - `industry-precedents`, `aiox-a2a-spec §13`, `proxy-vs-app-server` decision 후보는 no-promotion으로 반영.
  - digest required rows는 `round-4-tui-smoke-check.md`, `step-14-smoke-test-report.md`로 표시.
  - stale snapshot/meta rows는 `delete-only candidate`로 표시.

명시적 non-actions:

- 새 source map 표를 만들지 않았다.
- `plans/post-mvp*` rows는 수정하지 않았다. single execution plan successor pending 상태를 유지한다.
- `history/*` row를 만들지 않았다.
- archive digest 파일을 생성하지 않았다.
- legacy 원본이나 owner 문서 본문을 수정하지 않았다.

다음:

- 이 source map의 W2 흡수 진행 추적은 open 유지한다.
- archive digest required rows 4개는 source-map W3/archive 또는 physical deletion gate 직전 owner가 digest를
  생성해야 한다.
- physical deletion은 `plans/workspace-reset/workspace-reset.md`의 단일 삭제 게이트가 사용자 확인 후 수행한다.

## 2026-06-22 · W10 source-map disposition Claude checker PASS

W10 split package의 W5(decision 승격)·W6(source-map disposition update) Codex draft를 Claude checker가
1차 source에서 재검증해 PASS했다(권위 verdict는 `logs/2026-06-22-workspace-reset-W10-split-readiness-map.md`
W5/W6 checker 블록). 이 결과로 위 표의 W10 row disposition 마커를 `Codex draft (checker pending)` →
`Codex draft (W5/W6 checker PASS 2026-06-22)`로 갱신했고, source-map 패키지 Work Item W4(decision 승격
추적)를 `[x]` 완결로 전이했다.

확인한 사실:

- decision 승격 2건(`observation-asymmetry`→`codex-d7-authoritative-binding-scope.md`,
  `step-14-codex-mcp-remote-architecture-bug`→`codex-app-server-mcp-injection-and-isolation.md`)은
  Sources 전수 실재·정확하고 기존 decision과 비중복이다(checker 1차 source 대조).
- no-promotion 3건(`industry-precedents`·`aiox-a2a §13`·`proxy-vs-app-server`)은 기존 decision/roadmap/
  architecture owner가 load-bearing WHY를 커버한다.
- archive 5 = `absorb→delete candidate`, pre-validation 2 + `round-4-tui-smoke-check` +
  `step-14-smoke-test-report` = `archive→delete after digest`(digest required 4)로 W4 checker와 일치.
- 경계 준수: `plans/post-mvp*` rows·`history/*` rows 미수정, 새 표 없음, legacy/owner body 미수정.

checker 잔여 1건(blocking 아님, W3/물리 gate handoff):

- `industry-precedents` `absorb→delete`의 Opaque Worker coarse-state(`awaiting_agent_reply`) +
  semantic-timeout observability 원칙이 architecture(state model) 또는 기존 decision에 self-contained하게
  남아 있는지 물리 삭제 전 확인 필요. decision 미승격 판정 자체는 정확(alternatives-decision 아님).

다음:

- W2 흡수 진행 추적·W3 archive 판정·W5 closeout & 물리 삭제 handoff는 이 source-map 패키지가 계속 소유한다.
- W10 split package는 W7 closeout으로 진행한다.
