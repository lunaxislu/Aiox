---
topic: workspace reset legacy source absorption map
description: documentation taxonomy에 owner가 없는 legacy 다중 폴더(prd/·plan/·docs/aiox/·plans/post-mvp/)의 owner 흡수·archive·삭제 disposition을 단일 source map으로 추적한다. W8/W9/W10이 흡수하며 append하고 물리 삭제 게이트가 단일 소비한다
status: open
---

## Work Items

- [x] W1 legacy 폴더 inventory & source map 초기화 (완료 2026-06-21, sonnet subagent 1차 분류 + controlling agent 조정) — `prd/`·`plan/`·`docs/aiox/`·`plans/post-mvp/`의 모든 파일을 source map 표에 등록하고 잠정 흡수 owner·소비 package를 매핑한다.
- [>] W2 흡수 진행 추적 — W8(specs)/W9(roadmap·release)/W10(split)이 owner 흡수를 수행할 때마다 같은 source map에 disposition과 self-sufficiency 검증을 append/update한다.
- [ ] W3 archive 판정 — `logs/AGENTS.md`의 Archive Gate(보존가치 + self-sufficiency)를 개별 파일에 적용해 `logs/` digest 필요 여부를 확정한다.
- [ ] W4 decision 승격 추적 — gemini가 docs/decisions/ 부재/미흡으로 확인한 5개 후보(industry-precedents=Opaque Worker / observation-asymmetry=D7 Scope Reduction / aiox-a2a §13=아키텍처 부채 3축+Structured Logger / step-14-mcp-bug=App Server 주입·격리 / proxy-vs-app-server=app-server+proxy 하이브리드)를 W8/W10 흡수 중 W6 기준으로 `docs/decisions/`에 승격한다. 승격 전 docs/decisions/ 현황을 disk에서 재확인하고, 완료를 source map disposition에 반영한다.
- [ ] W5 closeout & 물리 삭제 handoff — 전체 disposition이 확정되면 `plans/workspace-reset/workspace-reset.md`의 단일 물리 삭제 게이트로 handoff한다. 원본 삭제는 owner/archive successor self-contained 검증과 사용자 확인 후 그 게이트에서만 한다.

### Scope

- Primary owner: 이 로그의 legacy source absorption map(아래 표).
- Allowed cross-owner updates: 없음. 이 package는 추적 장부다. 실제 owner 문서(`docs/specs/`·`docs/architecture/`·`docs/product/roadmap.md`·`plans/release-plan.md`·`docs/decisions/`) 수정은 W8/W9/W10 흡수 package가 자기 Scope에서 수행하고, 그 결과를 이 source map에 disposition으로 반영한다.
- Evidence inputs: `prd/`(mvp·post-mvp·pre-validation), `plan/`(mvp-implementation-checklist·qa-tracker), `docs/aiox/`(19), `plans/post-mvp.plan.md` + `plans/post-mvp/`(4). 경계: `history/`는 W5 history migration 소유로 제외.

### Legacy Source Map

| file | 주장 성격 | 흡수 owner | 소비 package | archive 필요? | self-sufficiency 검증 | disposition |
| ---- | -------- | --------- | ----------- | ------------ | -------------------- | ----------- |
| `prd/mvp/aiox-mvp-spec.md` | MVP product scope+UX+non-goal+원칙 | spec + architecture | W8 | No | TBD | absorb→delete? |
| `prd/post-mvp/aiox-a2a-spec.md` | product·protocol·arch·roadmap 통합 monolith (분리 예고 self-declared) | spec + architecture + roadmap + decision | W8 + W9 + W10 | §12만 ? | TBD | absorb→delete (W10 split 후) |
| `prd/post-mvp/archive/claude-codex-validation.md` | 설계 cross-validation transcript | (흡수완료 주장이나 헤더만으론 단정 금지) | — | ? | TBD | absorb→delete? (보류; 흡수+self-suffic 검증 전 삭제 금지) |
| `prd/post-mvp/archive/claude-opinion.md` | 설계 초기 의견 | (흡수완료 주장이나 헤더만으론 단정 금지) | — | ? | TBD | absorb→delete? (보류; 흡수+self-suffic 검증 전 삭제 금지) |
| `prd/post-mvp/archive/codex-claude-validation.md` | cross-validation transcript | (흡수완료 주장이나 헤더만으론 단정 금지) | — | ? | TBD | absorb→delete? (보류; 흡수+self-suffic 검증 전 삭제 금지) |
| `prd/post-mvp/archive/codex-opinion.md` | 설계 초기 의견 | (흡수완료 주장이나 헤더만으론 단정 금지) | — | ? | TBD | absorb→delete? (보류; 흡수+self-suffic 검증 전 삭제 금지) |
| `prd/post-mvp/archive/gemini-opinion.md` | 설계 초기 의견 | (흡수완료 주장이나 헤더만으론 단정 금지) | — | ? | TBD | absorb→delete? (보류; 흡수+self-suffic 검증 전 삭제 금지) |
| `prd/pre-validation/claude-codex-pre-validation.md` | MVP arch 사전검증 spike (PASS, 2026-05-14) | architecture (evidence) | W8 | ? | TBD | archive→delete? |
| `prd/pre-validation/sqlite-restart-recovery-pre-validation.md` | SQLite restart recovery 사전검증 (PASS, 2026-05-16) | architecture (evidence) | W8 | ? | TBD | archive→delete? |
| `plan/mvp-implementation-checklist.md` | MVP TDD 11단계 체크리스트 (closed) | plans (execution trace) | W8 / W10 | ? | TBD | archive→delete? (history/42 중복확인) |
| `plan/qa-tracker.md` | MVP QA 상태판 (QA-001~003) | plans (execution trace) | W8 / W10 | ? | TBD | archive→delete? |
| `docs/aiox/agent-runtime-container-model.md` | runtime container 학습기록 (권위 history/31) | architecture | W8 / W10 | No | TBD | absorb→delete? |
| `docs/aiox/claude-channel-registration-and-trust-model.md` | channel 등록+trust 내부구조 | architecture | W8 | No | TBD | absorb→delete? |
| `docs/aiox/codex-thread-focus-and-loaded-list.md` | thread focus 학습기록 | architecture | W8 / W10 | No | TBD | absorb→delete? |
| `docs/aiox/industry-precedents-and-observability-models.md` | 외부 벤치마크+Opaque Worker 설계레슨 | architecture + decision? | W8 / W10 | ? | TBD | absorb→delete? (decision 발굴) |
| `docs/aiox/mcp-scope-and-daemon-namespace.md` | MCP scope 2분류 | spec + architecture | W8 | No | TBD | absorb→delete? |
| `docs/aiox/mvp-architecture.md` | **stale** 구버전 as-built 스냅샷 (고정 pair 통신; `local-agent-runtime.md`로 승격됨) | architecture (stale) | W8 | No | TBD | delete-only? (stale; 고유내용 있으면 absorb) ⚠️rename drift — `docs/architecture/mvp-architecture.md` 부재 |
| `docs/aiox/observation-asymmetry-and-d7-pivot.md` | D7 위반+pivot 경위 | architecture + decision? | W8 / W10 | ? | TBD | archive→delete? (decision 검토) |
| `docs/aiox/pair-attach-kind-mismatch.md` | pair attach 버그 학습 (권위 history/16) | architecture | W8 / W10 | No | TBD | absorb→delete? |
| `docs/aiox/per-agent-transparent-proxy-decision.md` | transparent proxy 결정 학습 (history/41) | architecture | W8 | No | TBD | absorb→delete? |
| `docs/aiox/phase-a-design-decisions.md` | Phase A Codex runtime 결정 (history/33) | architecture | W8 | No | TBD | absorb→delete? |
| `docs/aiox/proxy-attribution-signals.md` | proxy 신호 매핑 학습 | architecture | W8 | No | TBD | absorb→delete? |
| `docs/aiox/proxy-cost-model.md` | proxy 비용모델 학습 | architecture | W8 | No | TBD | absorb→delete? |
| `docs/aiox/proxy-vs-app-server-tradeoff.md` | proxy vs app-server 결정 | architecture + decision? | W8 | No | TBD | absorb→delete? |
| `docs/aiox/README.md` | docs/aiox 폴더 meta/taxonomy | architecture (meta) | W10 | No | TBD | delete-only (폴더 흡수 후) |
| `docs/aiox/round-4-tui-smoke-check.md` | Round4 manual smoke 학습 | architecture (test) | W8 / W10 | No | TBD | absorb→delete? |
| `docs/aiox/step-14-codex-mcp-remote-architecture-bug.md` | Step14 MCP injection 버그 (empirical 증거) | architecture + decision? | W8 / W10 | ? | TBD | archive→delete? |
| `docs/aiox/step-14-codex-thread-mismatch-discovery.md` | Step14 thread 불일치 학습 | architecture | W8 / W10 | No | TBD | absorb→delete? |
| `docs/aiox/step-14-smoke-test-report.md` | Step14 E2E smoke (2 blocking issue) | architecture (test) | W8 / W10 | ? | TBD | archive→delete? |
| `docs/aiox/step-6-cli-decisions-walkthrough.md` | Step6 CLI 결정 walkthrough | architecture | W8 / W10 | No | TBD | absorb→delete? |
| `plans/post-mvp.plan.md` | Post-MVP 실행 index + Session Re-entry (WS2 대기) | roadmap (우선순위/sequencing) + plans 재편 | W9 + W10 | No | TBD | absorb→delete (W9 재편 후) ⚠️사용자목표=삭제 |
| `plans/post-mvp/adapter-dispatch-registry.plan.md` | dispatch→adapter registry sub-plan (deferred) | plans 재편 (single plan으로) | W9 | No | TBD | absorb→delete (재편 후) ⚠️사용자목표=삭제 |
| `plans/post-mvp/channel-boot-surface.plan.md` | channel boot surface sub-plan (deferred) | plans 재편 | W9 | No | TBD | absorb→delete (재편 후) ⚠️사용자목표=삭제 |
| `plans/post-mvp/codex-structured-metadata-spike.plan.md` | codex metadata spike sub-plan (deferred) | plans 재편 | W9 | No | TBD | absorb→delete (재편 후) ⚠️사용자목표=삭제 |
| `plans/post-mvp/envelope-metadata.plan.md` | envelope metadata sub-plan (next kickoff) | plans 재편 | W9 | No | TBD | absorb→delete (재편 후) ⚠️사용자목표=삭제 |

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

**남은 판단:** archive 5개·pre-validation·checklist의 최종 `archive vs absorb`는 W8~W10 흡수 시
Archive Gate 개별 적용으로 확정한다. disposition은 여전히 candidate다.
