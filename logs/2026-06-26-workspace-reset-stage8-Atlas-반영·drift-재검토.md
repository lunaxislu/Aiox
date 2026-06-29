---
topic: workspace reset stage8 Atlas 반영·drift 재검토
description: workspace reset plan stage 8 — docs-as-Obsidian-Atlas 도입 뒤 AGENTS.md·docs/guides/workflow.md·관련 owner 문서가 새 탐색 흐름(wikilink 작성 규칙·Obsidian Graph navigation·IDE+Obsidian dual-tool)을 반영해야 하는지, 또는 stale/drift가 생겼는지 재검토한다.
status: open
---

## Work Items

- [x] W1 stage 8 drift 재검토 범위 확정 + 후보 인벤토리 — AGENTS.md·docs/guides/workflow.md·관련 owner 문서 중 docs-as-Atlas 도입으로 반영/정정이 필요한 지점을 식별(추측 변경 금지, 후보 목록부터)
- [x] W5 AGENTS.md 계층 skeleton 확정·적용 — @user 제공 docs/AGENTS.md·docs/\*\*/AGENTS.md 초안을 하나씩 2026-06-25 논의 로그 참조로 완성·적용 (적용 후 논의 로그 close)
- [>] W6 skeleton 기준 owner 문서 정리 + drift 재검토 통합 → `logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md` — docs/ owner 문서를 확정 skeleton으로 정합하며 split·wikilink·stale drift 동시 판정
  - [x] product 계열·roadmap·documentation-system drift — product.md/AGENTS.md, roadmap.md sweep + Pre-Release Sources, federation-remote 명칭, documentation-system `## History` + roadmap 이중서술
  - [x] architecture retrofit — `local-agent-runtime.md` 인덱스 + slice 9개 완료 → `logs/2026-06-28-workspace-reset-stage8-W2-architecture-retrofit.md` (decided)
  - [>] specs retrofit — `aiox-a2a.md` 인덱스 + slice 7개 → `logs/2026-06-28-workspace-reset-stage8-W3-specs-retrofit.md`
  - [ ] decisions drift 검토 — 기존 decision 15개 → `logs/2026-06-28-workspace-reset-stage8-W4-decisions-drift.md`
- [ ] W7 탐색 흐름 drift 판정 — workflow.md·AGENTS 계층의 Obsidian Graph navigation·IDE+Obsidian dual-tool 반영 필요 여부 판정·반영 또는 불필요 근거 기록
- [x] W10 owner별 section contract 전수 재검토 → `logs/2026-06-28-workspace-reset-stage8-W10-docs-contract-overhaul.md` — docs/AGENTS 공통 의미와 architecture/specs/decisions/guides/product의 skeleton·invariant를 required/optional/absorb/subtype-only/delete로 판정·승인 반영한 뒤 W6 retrofit 재개

## 2026-06-26 · stage 8 착수 — 경위·범위·W3 handoff 입력

Parent pointer: `plans/workspace-reset/workspace-reset.md` stage 8 (`Atlas 반영·drift 재검토`)

**착수 경위:** stage 7(Atlas 설계와 local 구현)이 2026-06-26 `decided`로 종료됐다. W3
(Obsidian Graph/Backlink docs-as-Atlas 검증)이 PASS하여 docs-as-Obsidian-Atlas가
navigation layer로 유효함이 확인됐다(권위 비대체 + discovery 가치). 그 뒤를 잇는 plan
stage 8 = Atlas 도입 결과를 규칙·가이드 문서에 반영하고 drift를 재검토하는 단계다. stage
7 로그(`logs/2026-06-24-workspace-reset-stage7-Atlas-설계와-local.md`)의 W3 closeout 블록이
검증 결과·근거의 owner이며 여기 복사하지 않는다.

**범위(plan completion 기준):** Atlas 도입 뒤 다음이 새 탐색 흐름을 반영해야 하는지, 또는
stale/drift가 생겼는지 재검토한다.

- `AGENTS.md`(root·하위 계층): wikilink 작성·docs-as-Atlas 탐색이 작업 계약에 반영됐는지.
  (W4에서 `docs/AGENTS.md` 계층은 이미 base rule을 소유 — 중복·누락·root 포인터 보류분
  점검 대상.)
- `docs/guides/workflow.md`: 현재 작업 선택·재개 흐름이 Obsidian navigation을 반영해야
  하는지, 또는 무관하게 유지인지.
- 관련 owner 문서: split·wikilink 도입으로 생긴 stale 참조·drift.

**W3에서 handoff된 구체 drift 후보(stage 7 W3 closeout이 owner):**

1. **Graph 운영법** — Obsidian 노드 라벨이 디렉터리 경로를 생략하고 파일명만 표시한다.
   보완책은 hover 툴팁 + Groups 컬러코딩(폴더별 색). 이 운영법을 workflow/AGENTS가
   안내해야 하는지 판단 대상.
2. **IDE+Obsidian dual-tool workflow** — Obsidian 파일트리에 `.ts`가 안 보여 코딩은
   IDE 주도, Obsidian은 영향도 분석·설계 탐색 "navigation 보조 화면"으로 병행하는 흐름으로
   수렴했다. `docs/guides/workflow.md`가 이 dual-tool 흐름을 반영해야 하는지 판단 대상.

이 두 후보는 "반영해야 한다"가 아니라 "반영 필요 여부를 stage 8에서 판단한다"이다. 추측으로
미리 문서를 바꾸지 않는다.

**종료 판단 기준:** 위 범위의 각 문서가 (a) 반영이 필요하면 승인된 위치에 반영·검증됐고,
(b) 반영이 불필요하면 그 근거가 기록됐을 때 stage 8을 `decided`로 닫는다.

**다음 행동:** W1 — 위 범위·후보를 실제 문서(`AGENTS.md` 계층·`workflow.md`·owner 문서)와
대조해 반영/정정이 필요한 지점을 인벤토리한다. 인벤토리 결과로 W2 이후 실행 항목을 정한다.

## 2026-06-26 · stage 8 실행 구조 확정 — skeleton-first 3단계(W5–W7)

@user 결정으로 stage 8 실행 구조를 확정했다. drift 재검토 전에 docs AGENTS 계층 skeleton 확정·적용을 먼저 수행한다.

**확정 사항(@user 결정):**

- 권위 소스: @user가 `docs/AGENTS.md`와 각 `docs/**/AGENTS.md` 초안을 하나씩 제공하고, agent가 각 초안을 update/add/delete하며 완성한다. `logs/2026-06-25-docs-하위-지침서와-Obsidian-템플릿-논의.md`(및 2026-06-25 docs 논의 로그들)는 참조 입력이다.
- Work Items를 3단계 실행 구조로 재구성(W5 AGENTS 계층 / W6 owner 문서+drift 통합 / W7 탐색 흐름 drift). 도구가 id를 W5–W7로 발급했고(이전 reverted 리비전의 W2–W4 id 재사용 금지), 기존 W1(범위 확정 + 후보 인벤토리)은 이 결정으로 해소돼 completed 처리했다.

**skeleton-first 근거(@codex 판단):**

- skeleton/template 작업은 stage 8 scope 안이다 — "AGENTS.md(root·하위 계층)에 docs-as-Atlas 작성 규칙 반영" 자체이며 scope creep이 아니다.
- 확정된 authoring 규칙이 owner 문서 정리·drift 재검토의 측정 기준이므로 의존순서상 skeleton-first가 맞다.
- owner 문서 skeleton 적용(W6)과 drift 재검토를 한 패스로 통합해 같은 파일 중복 sweep을 막는다.

**현행 docs/AGENTS.md 격차(확인한 사실, W1 인벤토리 결과):**

- `## Authoring Skills` 잔존(2026-06-25 합의 = 삭제 후 도입부 통합).
- `## Code And Test Evidence`(합의 = `Evidence And Sources`로 개명).
- `## Splitting Large Owner Documents` 전체 유지(합의 = 축소, split 규칙은 하위 AGENTS로 이관).
- `## Document Skeletons`·`## Status` 미존재.
- `## 4. Message Lifecycle`(현재 110줄) = 자리에 안 맞는 stray heading, drift 후보.

**2026-06-25 논의 로그 처리:** stage 8 W5가 실행 입력으로 소비하고, skeleton 적용 완료 후 owner handoff로 close 대상이다(작업 동안 별도 open 유지).

**onramp 주의:** SessionStart onramp가 보였던 `latest: 사용자 정정 — 이번 턴은 로그 반영만…`은 어떤 파일에도 없는 stale 텍스트였다(onramp 재실행 시 현재 파일 기준 정상 출력). 권위는 이 로그의 현재 Work Items·기록이다.

다음 행동: W5 — @user의 첫 초안 입력을 기다린다.

## 2026-06-26 · W5 진행 — docs/AGENTS.md 합성·적용 + documentation-system 재배치 커밋

@user가 docs/AGENTS.md를 직접 편집해 합성 초안을 적용했고, @claude는 top-down 리뷰와 재배치 커밋을 수행했다.

**docs/AGENTS.md (적용 완료, @user):**

- @user 초안 + @claude top-down 리뷰 합성 → 3변경 적용: ① 도입부 owner 목록을 "지식 서술"에서 child `docs/**/AGENTS.md` 위임 포인터로 전환(taxonomy owner-map 중복 제거) ② Owner Boundary의 conflict 줄을 taxonomy 위임 한 줄로 흡수 ③ `documentation-system` 경로 갱신.
- @user가 `Sources:` 설명에서 history 참조 제거(Document Structure·Evidence And Sources). 이유: history 문서가 logs/·decisions로 흡수됨. history/ 로그는 추적하지 않는다.
- open 미세항목: 15번 줄에 stray 주석 마커 `← [변경①...]` 잔존 → 제거해야 마감.

**documentation-system.md 재배치 (커밋 a490cbf):**

- `docs/architecture/` → `docs/` 루트로 이동. 근거: taxonomy가 자기 정의상 architecture(= specs·product intent를 만족시키는 내부 구조)가 아닌데 architecture type 계약 밑에 misfiled → owner/altitude 불일치 + `docs/AGENTS ↔ architecture/AGENTS` 외관상 거버넌스 순환. 이동으로 docs/AGENTS 공통 계약 직접 지배 + 2-노드 직교 관계로 정리.
- decision: `docs/decisions/documentation-system-location.md`. inbound repoint(경로만): docs/AGENTS·guides/workflow·specs/AGENTS·plans/AGENTS·logs/AGENTS.
- 커밋 위생: prettier가 ~20파일에 노이즈 + `logs/AGENTS.md` 목록 구조 손상을 냈으나 relocation 커밋에서 제외했다. 과거 로그는 HEAD로 복원(옛 경로 = historical record 유지). `SKILL.md`·이 stage8 로그는 별개 작업이라 unstaged.

**top-down 리뷰 핵심(다음 세션 재사용):** @user의 계층표는 단일 스택이 아니라 2축이다 — 정보 소유(taxonomy) ⊥ 작업규칙 계약(root → docs/AGENTS → child AGENTS). docs/AGENTS.md는 작업규칙 축의 중간 계약이고 owner 질문은 taxonomy에 위임한다.

**W6 입력 (skeleton, 미결):** skeleton은 child `docs/**/AGENTS.md`가 소유하고 docs/AGENTS.md는 메타-rule(default scaffold, 역할 안 맞는 섹션 제거·교체)만 소유한다. "부적절 내용" 케이스 = (a) 빈 섹션 (b) index vs slice sub-kind (c) owner 경계 유혹. 구조 모델 결정 보류: skeleton-primary vs invariant-primary(+예시 skeleton). @user 일반화 패턴(Scope/Identity/Decision-table/Output-invariants/Negative-rules/Fresh-agent)은 invariant-primary 쪽을 가리킨다.

**drift 후보(W6/W7, history 추적 안 함):** `docs/documentation-system.md`의 `## History`가 history 마이그레이션을 미래형(workspace reset 단계에서 파일별 판정)으로 서술 → 흡수가 끝났다면 stale 가능.

**2026-06-25 논의 로그:** 여전히 open. docs/AGENTS.md 마감 + child AGENTS 재작성까지 끝낸 뒤 owner handoff로 close.

다음 행동: W5 — docs/AGENTS.md의 stray 마커 제거로 마감 후, child `docs/**/AGENTS.md`를 하나씩 재작성한다(상위 공통 규칙 복사 금지, type 의미 규칙·skeleton만 소유). 그다음 W6.

## 2026-06-26 · W5 세션 마감 — docs/AGENTS.md 완료, child AGENTS는 다음 세션

- @user가 15번 줄 stray 주석 마커를 제거 → docs/AGENTS.md W5 합성 적용 완료. (working tree에서 uncommitted 상태.)
- child `docs/**/AGENTS.md` 작업 방식 확정: @user가 별도 작업 파일에 각 child 초안+skeleton을 보유. 다음 세션에 하나씩 제공하면 @claude가 docs/AGENTS.md 때와 동일하게 검토·합성·적용한다.
- child 검토 렌즈: ① 공통/taxonomy(`docs/documentation-system`) 중복 dedup(위로 위임만) ② type 전용 의미규칙 + status vocab(논의에서 정한 type별 어휘) ③ specs=`aiox-a2a`·architecture=`local-agent-runtime` index/slice ownership(현재 없음, 신규 필수) ④ decisions doc-level Status 없음 ⑤ skeleton 부적절-내용 케이스(빈 섹션/index vs slice sub-kind/owner 경계 유혹) + @user 초안이 사실상 skeleton-primary 전제인지 점검, invariant 보강 지점만 플래그.
- @user 결정: child AGENTS는 다음 세션에서 진행.

다음 행동: W5 — 다음 세션에서 @user가 첫 child `docs/**/AGENTS.md` 초안(specs 또는 architecture부터면 index/slice 패턴이 빨리 섬)을 제공하면 위 렌즈로 검토·적용한다. docs/AGENTS.md는 마감(uncommitted).

## 2026-06-26 · W5 진행 — docs/architecture/AGENTS.md 합성·적용

@user가 architecture child 초안 제공("검토만, 적용 보류") → @claude 검토(5개 렌즈) → @user가 skeleton 방향 결정(`Related:` 상단 유지: 즉시 확인·연결 가시성) → 합성·적용. (uncommitted)

**적용 결정(@user `Related:` 상단 + @claude 검토 dedup 종합):**

- §1 국소 위임 bullet: 승격/잔류 기준을 [[docs/documentation-system]] Architecture로 위임(초안은 위임 절반만 서술 → 보강).
- §2: 문서레벨 Status 배치·inline 조건은 상위 [[docs/AGENTS]]가 소유로 위임, 이 절은 architecture status 어휘만 소유. 초안의 `Related:/Status:` placement code block 제거(상위 중복).
- §3 index/slice ownership: @user 초안 유지(실제 `local-agent-runtime.md` 구조와 대조 PASS — compatibility index·§N stub·status vocab·module overview·authority links).
- §4 skeleton: `Related:` 상단 유지(@user 결정). "skeleton은 slice용 / 인덱스는 §3 / 기존 split slice는 §N anchor 유지" 명시(index vs slice sub-kind 혼동 방지).
- §5 Drift: generic 절차(code=fact owner / drift 판정 / intent 무단변경 금지) 3중 중복을 상위 [[docs/AGENTS]] Staleness And Drift + [[docs/documentation-system]] Conflict Resolution이 소유로 위임, architecture 전용 적용 2줄만 잔존.
- §6: fact/inference/opinion 보고 줄은 root `AGENTS.md` Evidence And Reporting 소유로 위임(삭제), cross-validation·decision/roadmap 조건부 링크만 유지.

**검증 ledger:**

- inline-code 점검: `scripts/check-markdown-inline-code docs/architecture/AGENTS.md` → exit 0 (PASS).
- 중복 제거 근거(직접 확인): `docs/AGENTS.md:68-76`(Status)·`:78-98`(Evidence)·`:107-113`(Drift), `documentation-system.md:37-39`(승격 기준)·`:101-106`(Conflict Resolution), root `AGENTS.md` Evidence And Reporting.
- §3 사실 검증: `local-agent-runtime.md:23-32` 자기 서술 = compatibility index/navigation hub + §N anchor-stable stub + status vocab/module overview/authority links 소유 → 초안 주장과 일치. slice 예(`local-runtime-process-topology.md:1-5`)는 §N 헤딩 유지 확인.

**후속(이 세션 미반영, @user 다운스트림):** §4가 `Related:` 상단을 모델 → 기존 split slice는 현재 `> 컨텍스트:` 콜아웃 관례라 양식 불일치. @user의 "지침서 토대로 각 architecture 문서 변경" 계획에 이 retrofit이 포함됨(§N anchor·inbound는 §3에 따라 보존). @claude는 이 세션에서 slice 본문을 변경하지 않았다.

다음 행동: W5 — 다음 child AGENTS 초안 제공 시 동일 렌즈로 검토·적용한다(specs `aiox-a2a` index/slice가 architecture와 짝이라 다음 순번 권장). 모든 child 완료 후 2026-06-25 논의 로그 owner handoff close.

## 2026-06-26 · W5 후속 — @codex 리뷰 4건 + drift-report 규칙 반영

@codex가 적용본을 리뷰(4건) → @claude가 architecture slice corpus와 대조 검증 → @user 결정으로 반영. @user 방식 확정 = **(A) 지침서 먼저 확정 → 각 문서를 그 템플릿으로 retrofit**(현재 슬라이스와의 차이는 나중 retrofit으로 해소).

**검증으로 드러난 핵심 사실(슬라이스 실측):** 현재 `docs/architecture/local-runtime-*.md` slice 파일 9개는 `> 컨텍스트:` 콜아웃을 쓰고(콜아웃 9건), `Evidence:` 블록은 0건이며, code/test line reference는 본문 inline backtick으로 남아 있다. wikilink도 현재 slice corpus 안에서는 repo-relative `[[docs/...]]` path가 아니라(path 0건) bare link 형식이다. 상위 `docs/AGENTS.md`·`documentation-system.md`는 repo 기준 path 형식을 요구한다. → 방식(A)에 따라 슬라이스를 지침서 형식으로 conform 예정이므로 지침서는 목표 형식을 적는다.

> **정정(2026-06-26, @codex 실측 지적 + @claude 재실측):** 이 블록 초안의 "slice 16개·line ref 290개·doc-to-doc 14종 전부 bare"는 틀렸다. 실측: architecture slice 파일 = **9개**(`> 컨텍스트:` 9·`Evidence:` 블록 0·`[[docs/...]]` path 0). "16"은 `MEMORY.md`의 "index+16 slice"(= architecture 9 + spec 7 합산)를 architecture-only 수로 잘못 가져온 것 — `ls` 실측(9) 대신 메모리 수를 인용한 evidence 위반. line ref 수는 regex 의존적이라(필자 290 vs @codex 211) 재현 명령 없이 숫자 단정 금지 → "inline backtick 다수"로 표기. bare 종수도 규칙 의존적이라 "path 0·bare 형식"으로만 단정.

**반영(architecture/AGENTS.md):**

- §4 wikilink 예시: bare → repo-relative path(`[[docs/architecture/local-agent-runtime]]`·`[[docs/specs/relevant-spec]]`). path 규칙은 `docs/AGENTS.md:63`이 소유 → child는 규칙 추가 없이 예시만 conform.
- §2·§4 Evidence 중첩 bullet: 4칸 → 2칸(상위 `docs/AGENTS.md` 예시 기준 통일).
- §4 note: "skeleton은 slice 작성용, 인덱스는 §3을 따른다"로 축약(콜아웃 carve-out 미추가 — @codex 3번은 방식 A와 같은 맥락이라 @user가 무시 결정. §N anchor 보존은 §3이 소유).
- §5 둘째 bullet: @codex 문안 채택 — "code가 다르게 동작한다는 이유만으로 target architecture를 as-built로 덮거나 product/spec intent를 바꾸지 않는다"(generic 중복 ↓, architecture footgun 부각).

**반영(docs/AGENTS.md — @user 요청, drift-report 규칙):**

- `Staleness And Drift` 기존 bullet sharpen(새 섹션 미신설): "owner나 authority를 바꾸는 drift는 어느 owner가 stale한지와 근거를 **사용자에게 보고**하고, 작업 로그에 남긴 뒤 승인된 방향으로만 수정한다." scope = authority 변경 drift 한정(사소 drift 매번 보고 아님). drift 해결 메커니즘은 `documentation-system` Conflict Resolution 위임 유지.

**검증 ledger:** `scripts/check-markdown-inline-code` → `docs/architecture/AGENTS.md` exit 0, `docs/AGENTS.md` exit 0. 둘 다 uncommitted.

**후속(미반영, @user 다운스트림 retrofit):** architecture slice 9개를 새 템플릿으로 reformat(콜아웃→`Related:`/`Status:`, bare→path, inline→`Evidence:` 블록). §3 제약: 기존 §N 헤딩·inbound anchor는 inbound ref를 함께 갱신하는 migration이 아니면 보존.

다음 행동: W5 — **child AGENTS 진행률: 완료 2 = `docs/AGENTS.md` · `docs/architecture/AGENTS.md` / 잔여 4 = `specs` · `decisions` · `guides` · `product`**(모두 uncommitted). 다음 child 초안(specs `aiox-a2a`가 architecture와 index/slice 짝이라 권장) 제공 시 **검토 렌즈**(`2026-06-26 · W5 세션 마감` 블록의 "child 검토 렌즈 ①–⑤")로 검토·합성·적용. 모든 child 완료 후 2026-06-25 논의 로그 owner handoff close.

## 2026-06-26 · W5 진행 — specs/AGENTS.md 합의본 적용 + document-structure-review portable 패턴 반영

@user가 `docs/specs/AGENTS.md` 초안과 @claude/@codex 상호 리뷰를 제공했고, 최종 합의본을 적용했다. 함께 도출된
portable 문서 구조 리뷰 패턴은 raw 초안·라운드별 서사를 skill 본문에 넣지 않고
`.agents/skills/document-structure-review/SKILL.md`에 일반 규칙으로 증류해 반영했다.

**반영(specs/AGENTS.md):**

- `docs/specs/AGENTS.md`를 6섹션 구조로 재작성: 작성 원칙 / Status / `aiox-a2a` index-slice ownership /
  Spec Slice Skeleton / Spec Drift 처리 / Validation 및 Cross-Owner 링크.
- 상위 `docs/AGENTS.md` 소유 규칙(status 배치·evidence·staleness·repo-path wikilink)은 재정의하지 않고 위임했다.
- spec 전용 drift 규칙을 추가했다: `Current`/as-built claim은 code/tests와 어긋나면 stale 판정 대상, `Normative`·
  `Committed target` contract는 code가 다르다는 이유만으로 current/as-built로 덮지 않는다.
- skeleton은 spec slice 작성용으로 한정하고, 인덱스(`aiox-a2a.md`)는 §3을 따른다고 명시했다. `Flow`는 넣지 않고
  `Contract`에 externally observable lifecycle/state transition을 포함했다.

**반영(document-structure-review skill):**

- raw 프로젝트 서사 대신 portable 섹션만 추가·정리했다: `Structure Smells`, `Guideline Structure Models`,
  `Comparative Guideline Review`.
- skill description의 주체 표현을 `Codex`에서 `an agent`로 중립화했다.
- `Scope / Non-Goals`를 추가해 project-specific docs format, log lifecycle, Work Items, closeout,
  owner handoff를 소유하지 않음을 명시했다.
- 특정 문서를 고립된 파일로 검토하지 않도록 `Context Read Path`를 추가했다. 직접 parent에서 시작해 위임된
  ancestor 계약까지 따라가되, root/scope boundary에 도달했거나 더 올라가도 현재 판단을 바꾸지 않으면 멈춘다.
  owner map, sibling guideline, child/slice 관계는 판단을 바꿀 수 있을 때만 확인한다.
  프로젝트가 문서 작성·수정 흐름을 따로 정의하면 현재 변경이 그 흐름에서 언제·어떻게 수행되어야 하는지도 확인한다.
- `hidden or implicit authority` smell을 추가했다(규칙·scope·예외·결정이 예시/제목/관례/이전 논의에만 숨어 있는 문제).
- parent/ancestor 계약과 연결되지 않아 적용 범위를 복원할 수 없는 `orphan local rule` smell을 추가했다.
- `Guideline Structure Models`에 기존 owner guideline의 구조 결정을 override하지 않는 guard를 추가했다.
- log skill·현재 작업 로그 owner와 경계가 흐려지는 `Feedback Capture` 섹션은 삭제했다.
- Review Loop에서 시행착오·rejected alternative·상세 피드백의 기록 위치를 말하던 step도 log 작업 성격이라 삭제했다.
- `feedback records`처럼 기록 owner로 읽힐 수 있는 description 표현을 좁히고, `상위/parent` 표현은 parent/ancestor 계약
  체인 기준으로 정리했다. 일반 `workflow` 표현은 문서 작성 흐름을 뜻하는 `authoring workflow`로 좁혔다.
- Output Checklist에 fact/inference/opinion/proposal 구분, 숨은 규칙 노출 여부와 fenced skeleton 예시의 heading 누출 점검을
  추가했다.
- `logs/2026-06-25-docs-skill.md`에 stage8의 skill 반영 결과와 남은 결정사항을 cross-owner handoff로 기록했다.

**검증 ledger:**

- `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md docs/specs/AGENTS.md` → exit 0 (PASS).
- `docs/specs/AGENTS.md` skeleton code fence와 Evidence 2칸 들여쓰기 직접 확인.

다음 행동(다음 세션 재개): W5 — child AGENTS 진행률: 완료 3 = `docs/AGENTS.md` · `docs/architecture/AGENTS.md` ·
`docs/specs/AGENTS.md` / 잔여 3 = `decisions` · `guides` · `product`. @user가 다음 child 초안 제공 시 **검토 렌즈
①–⑤**(`2026-06-26 · W5 세션 마감` 블록이 owner)로 검토·합성·적용한다. 잔여 3개 모두 완료 후
`logs/2026-06-25-docs-하위-지침서와-Obsidian-템플릿-논의.md`를 owner handoff로 close한다(skill 반영분 handoff는
`logs/2026-06-25-docs-skill.md`가 이미 수령). **working tree uncommitted(6): `document-structure-review/SKILL.md` ·
`docs/AGENTS.md` · `docs/architecture/AGENTS.md` · `docs/specs/AGENTS.md` · `logs/2026-06-25-docs-skill.md` · 이 stage8
로그 — 커밋은 @user 지시 시.**

## 2026-06-26 · W5 진행 — decisions/AGENTS.md 검토·합성·적용

@user가 `docs/decisions/AGENTS.md` 초안 제공 → @claude가 `document-structure-review` skill로 검토(corpus 실측 + smell
분류) → @user 결정 3건 → 합성·적용. (uncommitted)

**검토로 드러난 핵심 사실(corpus 실측):**

- `history/` 디렉토리 **부재**(stage 6 물리 삭제). taxonomy `documentation-system.md` ## History도 standalone history
  type·`docs/history/` 폐지를 명시 → 초안 §5 "History 원본 처리"는 적용 대상이 사라진 dead procedure(`orphan local rule`).
- decision 문서 **15개 전수**: `Related:` 상단 0 · 문서레벨 `Status:` 0 · `## Consequences` 0 · `Superseded` 표기 0 ·
  첫 섹션 15/15 `## Context`(Context-먼저). 명령: `grep -lE` 카운트 + 각 파일 첫 `## ` 헤딩 집계.
- 초안 §4 skeleton은 corpus와 3건 불일치(Decision-먼저 / `Related:` 상단 / `Consequences` 신규). 방식(A) retrofit은
  decision §1 invariant("결정 당시 snapshot, 기존 decision을 현재 상태로 patch 안 함")와 긴장.
- `## Consequences`("나중에 바꾸려면 같이 봐야 할 문서") = 상위 `docs/AGENTS.md` `Related:`(load-bearing neighbor) 의미
  중복 + "제약" 서술은 §1 outcome 복사 금지 유혹(`duplicated ownership`).

**@user 결정 3건(AskUserQuestion):**

1. Skeleton 형식 = **절충(Related만 채택)** — `Related:` 상단 도입, 섹션 순서는 corpus대로 Context-먼저 유지,
   `Consequences` 미도입. (retrofit은 Related 추가 수준 최소)
2. §5 History 원본 처리 = **전체 삭제**(승격 일반 원칙은 logs/AGENTS owner handoff·상위 계약 소유).
3. `## Consequences` = **제거**.

**반영(decisions/AGENTS.md, 초안 → 적용본):**

- 도입부: "에이전트나 Harness가 … 엄격히 따라야 한다" 군더더기 삭제(상위 AGENTS가 agent 계약 owner, sibling 대칭).
  공통 규칙 위임 줄에 evidence·sources 포함, status 배치는 미포함(decision은 §2가 자체 정의).
- §1: "outcome은 참조한다"를 `Related:` 또는 `Sources`로 한정(Consequences 제거 반영).
- §2 Status(신규): "doc-level Status 안 씀"(corpus 15/15 정합). supersede는 `Status: Superseded` 기본 미부착 +
  explicit note로 처리. 예시 2종(대체 관계 note / compatibility 예외)을 callout note 형태로 통일.
- §4 Decision Skeleton: `Related:` 상단 + Context-먼저 순서(Context→Decision→Alternatives→Rationale→Trade-offs→
  Re-evaluation→Sources), `Consequences` 미포함.
- §5(구 §6) Agent/Harness 확인: history 승격 줄 삭제(§5 History 삭제와 일관), 작성 전/후 2줄만 유지.
- **형식 정합(@user 구조 결정과 독립, 상위 규칙 준수):** 초안 skeleton의 bare wikilink(`[[relevant-spec]]` 등)를
  상위 `docs/AGENTS.md:63` repo-path 규칙 + sibling(specs/architecture child) 일관성에 맞춰 repo-relative path로 conform
  (`[[docs/specs/relevant-spec]]`·`[[docs/architecture/relevant-slice]]`·`[[docs/decisions/...]]`). architecture child의
  bare→path 선례와 동일 처리.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/AGENTS.md` → exit 0 (PASS).
- corpus 실측 근거: `docs/decisions/*.md` 15개(AGENTS/CLAUDE 제외) — `Related:`/`Status:`/`## Consequences`/`Superseded`
  매칭 0, 첫 `## ` 헤딩 15/15 `## Context`. `history/` `ls` → ABSENT.
- 중복/위임 근거(직접 확인): `Related:` 의미 = `docs/AGENTS.md:47-53`(Related And Body Links), repo-path 규칙 =
  `docs/AGENTS.md:63`. taxonomy history 폐지 = `documentation-system.md:118-126`.

다음 행동: W5 — **child AGENTS 진행률: 완료 4 = `docs/AGENTS.md` · `architecture` · `specs` · `decisions` / 잔여 2 =
`guides` · `product`**(모두 uncommitted). @user가 다음 child 초안 제공 시 검토 렌즈 ①–⑤로 검토·합성·적용. 잔여 2개
완료 후 `logs/2026-06-25-docs-하위-지침서와-Obsidian-템플릿-논의.md` owner handoff close. **working tree uncommitted(7):
`document-structure-review/SKILL.md` · `docs/AGENTS.md` · `docs/architecture/AGENTS.md` · `docs/specs/AGENTS.md` ·
`docs/decisions/AGENTS.md` · `logs/2026-06-25-docs-skill.md` · 이 stage8 로그 — 커밋은 @user 지시 시.**

## 2026-06-26 · W5 마무리 — decisions/AGENTS.md 최종 확정 + portable harness 리뷰

직전 블록의 절충 적용본 이후 @user가 Codex 합성본을 채택하고 §5에 decision-change harness까지 발전시켜 decisions child를
확정했다. 이 과정에서 추출된 harness 패턴이 portable skill에도 반영됐고 @claude가 리뷰했다(미적용).

**decisions/AGENTS.md 최종본(@user 확정, uncommitted):**

- §1: outcome 참조와 `Sources:`(provenance) 분리(상위 Evidence And Sources 정합).
- §2 `Lifecycle And Mutability`: doc-level `Status:` 안 씀(corpus 15/15) + 보류질문·보수업데이트·새 decision·§5 harness
  위임 4 bullet. Superseded callout 메커니즘 제거(corpus 0), 삭제 규칙은 decision 고유 규칙으로 §5 harness가 소유.
- §4 Decision Skeleton: Related 상단 + Context-먼저(corpus 순서) + Consequences 없음 + "기존 문서 retrofit 금지" 줄.
- §5 `Validation And Cross-Owner Checks`: 작성 전/중/후 + decision-change harness 4단계(① read path/확인 범위 ② 변경유형
  분류 ③ 삭제후보 게이트: WHY 복원 여부 + live reference 정의[현재 owner·active plan·README/AGENTS·open log·code 주석,
  decided 로그·historical provenance 제외] ④ 불확실 시 비파괴 fallback).

**@claude 확인 결과:** `scripts/check-markdown-inline-code docs/decisions/AGENTS.md` → exit 0(PASS). 상위 계약 정합
(WHY-only·outcome 참조·Logs And Plans의 logs=provenance·Status 어휘). minor 관찰(미적용): §2 26·27 bullet + §2 28 위임
+ §5 step2 분류가 같은 3분류 반복 — 의도된 요약↔절차 분리로 볼 수 있어 변경 보류, 다음 §5 손볼 때 후보.

**portable harness 리뷰(SKILL.md, @user 추가분 → @claude 리뷰, 미적용):**

- @user가 decision-change harness 사례에서 `abstract destructive gate` smell·`verification harness` rule shape·
  `Scenario Harnesses` H2·Output Checklist 항목을 SKILL.md에 추가.
- @claude 리뷰 High: `Scenario Harnesses` H2가 skill 자기 원칙(Authoring Guideline Improvement "새 섹션이 read path를
  늘리는지 먼저 본다") 위반 — 6 bullet 중 4개가 Context Read Path/Rule Shape/Owner And Scope/Structure Smells 재진술.
  고유 신규는 2개(참조 범위 분류·비파괴 fallback). → H2 흡수 + Rule Shape 항목 압축 권장. 이름 `harness`(tool 메타포)→
  `reversible-change gate` 제안. `references/EXAMPLE.md`에 대응 사례·rule shape 목록 미갱신(drift).
- 미적용. SKILL.md 정리 여부 = @user 결정(Open). skill 반영 handoff owner = `logs/2026-06-25-docs-skill.md`.

다음 행동(다음 세션 재개): W5 — **child AGENTS 진행률: 완료 4 = `docs/AGENTS.md` · `architecture` · `specs` ·
`decisions` / 잔여 2 = `guides` · `product`.** @user가 다음 child(`guides` 또는 `product`) 초안 제공 시 검토 렌즈 ①–⑤
(`2026-06-26 · W5 세션 마감` 블록 owner)로 검토·합성·적용. 잔여 2 완료 후
`logs/2026-06-25-docs-하위-지침서와-Obsidian-템플릿-논의.md` owner handoff close. **별도 Open: SKILL.md harness portable
정리(Scenario Harnesses H2 흡수·이름·EXAMPLE 사례) — @user 결정 대기.** working tree uncommitted(7):
`document-structure-review/SKILL.md`(+`references/` untracked) · `docs/AGENTS.md` · `docs/architecture/AGENTS.md` ·
`docs/specs/AGENTS.md` · `docs/decisions/AGENTS.md` · `logs/2026-06-25-docs-skill.md` · 이 stage8 로그 — 커밋은 @user 지시 시.

## 2026-06-26 · W5 후속 — portable harness 정리 완료

직전 stage8 블록의 별도 Open(`SKILL.md harness portable 정리`)은 처리 완료됐다. 상세 owner ledger는 `logs/2026-06-25-docs-skill.md`가 소유하므로, 이 stage8 로그에는 W5 영향과 현재 재개 상태만 남긴다.

**반영(현재 세션):**

- `.agents/skills/document-structure-review/SKILL.md`: @claude 리뷰를 반영해 `Scenario Harnesses` H2를 제거하고, `verification harness`를 `destructive-change gate` rule shape로 축약했다. `abstract destructive gate` smell에는 hidden authority와의 차별점(비가역 변경이라 숨은 판정을 본문 절차로 끌어내는 우선순위가 높음)을 추가했다. Output Checklist는 섹션명 의존 없이 참조 범위와 비파괴 fallback을 묻도록 수정했다.
- `.agents/skills/document-structure-review/references/EXAMPLE.md`: 새 사례 `8. Destructive Change Needs A Gate`를 추가하고, 사례 7 rule shape 목록에 `destructive-change gate`를 추가했다.
- `docs/decisions/AGENTS.md`: decision-change harness 최종본은 유지. §2는 lifecycle 원칙, §5는 확인 범위·변경 유형 분류·삭제 후보 gate·비파괴 fallback을 소유한다.

**검증 ledger:**

- `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md` → exit 0 (PASS).
- `scripts/check-markdown-inline-code .agents/skills/document-structure-review/SKILL.md .agents/skills/document-structure-review/references/EXAMPLE.md` → exit 0 (PASS).
- `scripts/check-markdown-inline-code docs/decisions/AGENTS.md` → exit 0 (PASS, decision harness 반영 직후 확인).

**현재 상태:**

- decisions child AGENTS는 완료 상태로 유지한다.
- 별도 Open으로 남겼던 SKILL.md harness portable 정리는 완료됐고, 자세한 변경 경위와 Claude 리뷰 반영 내용은 docs-skill 로그에 기록됐다.
- W5 child AGENTS 진행률은 계속 완료 4(`docs/AGENTS.md` · `architecture` · `specs` · `decisions`) / 잔여 2(`guides` · `product`). 다음 행동은 @user가 다음 child 초안을 제공하면 검토 렌즈 ①–⑤로 검토·합성·적용하는 것이다.

## 2026-06-26 · W5 진행 — product/AGENTS.md 검토·합성·적용 (구조 진단 + 두 type 블록)

@user가 `docs/product/` 구조 smell(`product.md`와 `roadmap.md` 동거)을 지목 → @claude가
`document-structure-review` skill로 진단 → @user 결정(폴더 유지 + 두 type 블록) + 초안 제공 →
검토 렌즈 ①–⑤로 합성·적용. @codex 의견 정합 확인. (uncommitted)

**구조 진단(확인한 사실):**

- `documentation-system.md`가 roadmap을 이중 서술한다 — Knowledge Owners(`:18-26`)는 roadmap.md를
  `### Product` 아래 묶고, Scoped Authority 표(`:80-91`)는 roadmap을 product와 별개 peer owner로
  나열한다. 물리 구조는 roadmap을 폴더 없이 `docs/product/` 안에 둬 종속 모델을 택했다(다른 모든
  type은 자기 폴더 보유).
- 두 문서 내용 공유는 thin하다 — `product.md:12`가 roadmap을 위임 한 줄로만 참조하고, roadmap의 실제
  긴장 경계는 product가 아니라 `plans/`다(`roadmap.md:4-5,11-13,145-161`).
- 따라서 `docs/product/AGENTS.md`만 다른 child와 달리 두 type(scope/원칙 형 + release-gate/sequencing
  형)을 한 계약에서 소유한다.

**@user 결정(AskUserQuestion + 후속):**

- 폴더·taxonomy 권위 변경 없음(Option 1). 파일 이동 안 함. K-Owners↔Scoped-Authority 문구 불일치는
  건드리지 않는 정합 메모로 파킹(이번 작업 미반영).
- 결정 ①: roadmap은 별도 skeleton 안 만들고 기존 gate/phase 구조 + roadmap 전용 rule block. (별도
  product skeleton을 roadmap에 씌우면 hidden sub-kind 재발.)
- 결정 ②: Status는 section/claim 어휘만 정의, doc-level 배치는 [[docs/AGENTS]] 위임(specs/architecture
  평행, corpus 0/2 doc-level).

**Q1(roadmap↔specs 연관) 판정:** duplicated ownership 아님 — 단방향 위임 + 체크포인트. specs는
gate/phase/priority를 소유 않고 밖으로 밀어내며(`specs/AGENTS.md:18`, `aiox-a2a.md:19-25`), contract
변경 시 roadmap을 확인만 한다(`specs/AGENTS.md:112-116`). roadmap의 gate도 contract를 정의 않고 통과
조건으로만 참조. inbound가 전부 `docs/product/roadmap.md` 경로라 Option 1(위치 유지)과 정합.

**반영(product/AGENTS.md, 초안 → 적용본):**

- 두 type 블록 분리 — `## Product 작성 규칙`(scope/원칙/시장 경계 소유, 구현 상세·protocol field·arch
  state 미소유 negative rule, Product Skeleton은 product-scope 전용) / `## Roadmap 작성 규칙`(gate/phase/
  priority/gate evidence 소유, product scope 미확장, ↔`plans/` 실행 checklist 경계, contract는 specs 링크만,
  기존 Release Gates/Phases/Gate Evidence 구조 따름).
- `## Status`: doc-level Current/Target/Deferred 어휘 → section/claim 어휘로 축소, doc-level 배치는
  [[docs/AGENTS]] 위임으로 명시(specs `:22` 문안 차용).
- Product Skeleton: 헤딩 `# <Product Area / Roadmap Topic>` → `# <Product Area>`(roadmap 제거),
  Related bare wikilink → repo-path(`[[docs/specs/relevant-spec]]`·`[[docs/decisions/relevant-decision]]`,
  docs/AGENTS:63 규칙 + sibling 선례), doc-level `Status: Current` 줄 제거(decisions 선례, doc-level
  저가치), roadmap 미적용 명시.
- 위임 줄: `status` → `status 배치`로 좁혀 placement(위임) vs vocab(로컬) 구분.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/product/AGENTS.md` → exit 0 (PASS).
- 중복/위임 근거(직접 확인): 공통 규칙 owner = `docs/AGENTS.md`(status 배치·evidence·sources·staleness·
  repo-path `:63`); status placement↔vocab 분리 선례 = `specs/AGENTS.md:20-23`; doc-level 미사용 선례 =
  decisions child. Q1 근거 = `specs/AGENTS.md:18,112-116` · `aiox-a2a.md:19-25`.
- corpus 실측: `product.md`·`roadmap.md` 둘 다 doc-level `Status:` 없음(0/2).

**다음 행동:** W5 — **child AGENTS 진행률: 완료 5 = `docs/AGENTS.md` · `architecture` · `specs` ·
`decisions` · `product` / 잔여 1 = `guides`.** @user가 `guides` 초안 제공 시 검토 렌즈 ①–⑤로 검토·합성·
적용한다. guides 완료 후 `logs/2026-06-25-docs-하위-지침서와-Obsidian-템플릿-논의.md` owner handoff
close → W6(owner 문서 정리+drift 통합)으로 이행. **별도 파킹: documentation-system.md의 roadmap
이중 서술(K-Owners↔Scoped-Authority) 문구 정합 — taxonomy 손볼 때 후보, 이번 미반영.** working tree
uncommitted(8): `document-structure-review/SKILL.md`(+`references/` untracked) · `docs/AGENTS.md` ·
`docs/architecture/AGENTS.md` · `docs/specs/AGENTS.md` · `docs/decisions/AGENTS.md` · `docs/product/AGENTS.md` ·
`logs/2026-06-25-docs-skill.md` · 이 stage8 로그 — 커밋은 @user 지시 시.

## 2026-06-26 · W5 product/roadmap 구조 질문 — drift 후보 확인

@user가 `docs/product/AGENTS.md` 작성 전 "product와 roadmap이 같은 scope에 있는 느낌이 이상한데 맞는가"를 질문했고,
@claude의 F1-F5 진단을 제시했다. @codex가 `document-structure-review` 렌즈로 대조했다.

**확인한 사실:**

- `docs/documentation-system.md`는 Knowledge Owners의 `### Product` 아래에 `product.md`와 `roadmap.md`를 함께 둔다.
- 같은 문서의 Scoped Authority 표는 `product`와 `roadmap`을 별도 intended owner로 나열한다.
- `docs/product/product.md`는 release gate·phase·우선순위를 `docs/product/roadmap.md`로 위임한다.
- `docs/product/roadmap.md`의 첫 경계는 product보다 `plans/`와 code/test evidence다.
- 현재 `docs/product/AGENTS.md`는 product 목적/범위 규칙과 roadmap↔plans 경계를 한 파일에 함께 둔다.

**판단(@codex):**

- @claude의 핵심 진단은 타당하다. smell은 단순한 폴더 취향이 아니라 `hidden sub-kind` + `owner/altitude mismatch` +
  taxonomy 표현 불일치다.
- 다만 즉시 `docs/roadmap/`로 분리하는 것은 owner/authority 변경이라 W5 child AGENTS 적용 중 추측으로 수행하지 않는다.
- stage8 W5의 최소 안전 방향은 `docs/product/AGENTS.md`가 `product.md`와 `roadmap.md`를 같은 physical scope 안의 두
  knowledge sub-kind로 명시하고, roadmap의 핵심 경계(`roadmap` vs `plans`)를 별도 subsection으로 드러내는 것이다.
- `documentation-system.md`의 Knowledge Owners/Scoped Authority 표현 정리는 W6 owner 문서 drift 통합에서 반영 후보로 다룬다.

다음 행동: W5 — product child 초안 작성·검토 시 위 판단을 기준으로 dual-kind 구조를 명시한다. 폴더 분리나 taxonomy
권위 변경은 W6 drift 통합 전까지 보류한다.

## 2026-06-26 · W5 product/AGENTS.md roadmap 섹션 리뷰

@user가 `docs/product/AGENTS.md`의 `## Roadmap 작성 규칙` 섹션만 구조 리뷰 요청. @codex가
`document-structure-review` 렌즈로 `docs/product/roadmap.md`, `docs/product/product.md`,
`docs/specs/AGENTS.md`와 대조했다.

**확인한 사실:**

- `docs/product/roadmap.md`는 release gate 순서와 phase, gate 통과 기준을 소유한다.
- 같은 문서는 구현 checklist, 세부 task 상태와 cutover 절차를 `plans/`와 code/test evidence로 위임한다.
- `docs/product/AGENTS.md` roadmap 섹션은 roadmap이 gate/phase/priority를 소유한다고 쓰면서도
  "실행 순서"를 `plans/` owner로 보낸다.
- 같은 섹션은 contract text 복사 금지를 쓰면서 링크 대상으로 `[[docs/specs/AGENTS]]`를 든다.

**리뷰 판단(@codex):**

- `실행 순서` 표현은 roadmap의 gate/phase sequencing과 plans의 task execution을 구분하지 못해 수정 필요.
  `plans/`로 보내야 하는 것은 task 실행 절차·할당·상태·cutover checklist다.
- contract 링크 대상은 spec 작성 규칙(`docs/specs/AGENTS.md`)이 아니라 관련 spec owner 문서여야 한다.
  `docs/specs/AGENTS.md`는 작성 규칙 링크로만 적합하다.
- `gate evidence`는 실제 evidence 수집 owner처럼 읽힐 수 있으므로 `gate 통과 기준과 요구 evidence 항목`으로 좁히는 편이 낫다.

다음 행동: W5 — product child 적용 시 위 3점을 반영해 roadmap 섹션을 다듬는다.

## 2026-06-26 · W5 product/AGENTS.md 전체 구조 리뷰

@user가 roadmap 외 `docs/product/AGENTS.md`의 다른 섹션도 리뷰 요청. @codex가 상위 `docs/AGENTS.md`,
`docs/documentation-system.md`, sibling `docs/specs/AGENTS.md`와 대조했다.

**추가 findings(@codex):**

- `docs/product/AGENTS.md`의 "docs/product/는 제품 사실의 owner" 문장은 dual sub-kind 결정을 다시 흐린다.
  `product.md`와 `roadmap.md`가 각각 제품 scope와 roadmap intent를 소유한다는 식으로 좁히는 편이 맞다.
- Product 작성 규칙의 spec/architecture 위임 링크가 실제 owner 문서가 아니라 `AGENTS.md` guideline을 가리킨다.
  content owner 위임은 관련 spec/architecture owner 문서로, 작성 규칙 참조는 AGENTS로 분리해야 한다.
- Product Skeleton의 `Related:` 예시는 contract/architecture 연결을 말하면서 architecture 예시 링크가 없다. 실제로
  load-bearing neighbor일 때만 넣는 선택 예시로 정리해야 broad link가 되지 않는다.
- Product child에는 sibling과 달리 Validation/Cross-Owner Checks가 없다. product scope 변경 시 specs·roadmap 확인,
  roadmap 변경 시 product·specs·plans 경계 확인을 짧게 두면 다음 agent가 수정 전 확인 범위를 복원할 수 있다.

다음 행동: W5 — product child 합성 적용 시 roadmap 3점 + 전체 리뷰 4점을 함께 반영한다.

## 2026-06-27 · W5 product/AGENTS.md 사례 기반 리뷰 입력 판단

@user가 sibling AGENTS 전체 + parent + taxonomy + 실제 governed 문서(`product.md`·`roadmap.md`)를 기준으로
`docs/product/AGENTS.md`를 사례별 walkthrough한 검토 결과를 제시하고 @codex 의견을 요청했다.

**@codex 판단:**

- 전반 진단에 동의한다. 현재 product child 구조는 dual-block/Option 1 방향이 맞고, 남은 gap은 문서 구조 자체가 아니라
  authoring scenario에서 복원해야 할 확인 범위와 drift 규칙의 부족이다.
- Case 1 skeleton 대상 모호성은 실제 gap이다. `product.md` retrofit용이 아니라 향후 product-area/product-scope 하위 문서용
  authoring default라고 명시해야 한다. product-area 분화 계획이 불명확하면 skeleton은 "현재 product.md에는 적용하지 않는다"는
  guard가 필요하다.
- Case 3 roadmap drift는 반영 가치가 높다. roadmap의 gate 완료/gap/current execution mapping은 plan/code evidence와 drift할 수
  있으나, gate 통과 기준·target을 현재 code 상태로 낮추면 안 된다.
- Case 4 `documentation-system` 권한 모델 확인 줄은 sibling 대칭과 충돌 해소 진입점 측면에서 복원하는 편이 맞다.
- Case 5 doc-level Current 안 target/deferred claim 허용 문장은 선택 사항이지만 Status 절이 이미 있으므로 한 줄 추가해도 read
  path를 크게 늘리지 않고 future confusion을 줄인다.

다음 행동: W5 — product child 적용 시 위 판단을 반영 후보로 포함한다. 사용자 승인 전까지 권위 문서에 적용하지 않는다.

## 2026-06-27 · W5 product/AGENTS.md 사례 판단 정정

@user가 직전 @codex 판단 중 "현재 `product.md`는 자체 구조 유지" 표현과 Case 3/4/5 의미를 재질문했다.

**정정(@codex):**

- Product Skeleton 관련: `product.md`를 보존하자는 뜻으로 쓰면 부정확하다. 현재 목표는 `product/AGENTS.md`로
  `product.md`의 구조·내용 개선 기준을 세우는 것이므로, "현재 product.md에는 적용하지 않는다" guard는 필요 없거나
  오히려 방해가 될 수 있다. 필요한 것은 roadmap에는 적용하지 않는다는 경계와, skeleton이 강제 boilerplate가 아니라는 점이다.
- Case 3 관련: "낮추면 안 됨"은 agent별 해석 차이를 만들 수 있으므로 decision table/분류 규칙으로 써야 한다. roadmap 문장을
  current/progress claim, gate/target criterion, 불명확한 문장으로 분류하고 각각 갱신/보존+보고/사용자 확인으로 보내는 식이 낫다.
- Case 5 관련: product.md 자체를 더 나은 구조와 내용으로 재작성할 수 있다는 @user 판단이 맞다. doc-level status와
  section/claim status 구분은 product.md 재구조화를 막는 규칙이 아니라, 재구조화할 때 현재 정의와 목표/보류 claim을 섞지 않게
  하는 보조 규칙이다.

다음 행동: W5 — product child 합성 시 skeleton guard를 "product.md 보존"으로 쓰지 않고, roadmap 제외 + optional authoring
default로 좁힌다. Roadmap drift는 금지 문구보다 분류 규칙으로 쓴다.

## 2026-06-26 · W5 후속 — product/AGENTS.md @codex 리뷰 7건 반영 완료

roadmap 3점 + 전체 4점을 `roadmap.md`·sibling AGENTS와 대조 검증 후 반영했다. 모든 findings는 적용
전 실측으로 타당성을 확인했고, 명시 제안이 있는 경우 @user 문안을 우선했다.

**roadmap block 3점(검증 후 수용):**

- 통과 evidence: `roadmap.md:17`이 gate 실행 순서를 직접 소유 → plans로 보내는 표현을 "개별 task 실행
  절차·할당·진행 상태·cutover checklist"로 좁힘(원표현이 roadmap.md와 모순이었음).
- contract 링크 altitude: `[[docs/specs/AGENTS]]`(작성 규칙) → 관련 spec 문서(`[[docs/specs/aiox-a2a]]`).
- "gate evidence" → "gate 통과 기준과 요구 evidence 항목"(`## Gate Evidence`는 Required evidence 기준
  정의이지 evidence 저장 owner 아님).

**전체 4점:**

- 추가1(수용): 도입 문장을 "제품 사실의 owner" umbrella → "제품 scope 문서와 roadmap 문서를 함께 담는
  physical scope" + dual sub-kind(@user 문안).
- 추가2(수용): Product block도 owner 링크가 `AGENTS.md`로 감 → content owner는 spec/architecture 문서,
  작성 규칙은 `[[docs/specs/AGENTS]]`·`[[docs/architecture/AGENTS]]`로 분리(@user 문안). 기존 중복 bullet과
  병합.
- 추가3(처음 sibling 대칭 근거로 부분 반려 → @user 명시 해결안으로 교체·수용): skeleton `Related:`에
  `[[docs/architecture/relevant-slice]]` 추가(3항, specs §4 대칭) + "load-bearing neighbor만 남기고 불필요
  항목 생략(상위 docs/AGENTS Related 규칙)" 주석. @user 주석이 broad-link 우려를 해소하므로 수용이 더 나음.
- 추가4(수용): `## Validation And Cross-Owner Checks` 신설(@user 문안 3 bullet — product scope/principle
  변경 시 spec/architecture/roadmap 확인, roadmap 변경 시 scope 확장·contract 복사·plan checklist 대행 확인,
  decision 링크 조건). sibling(specs §6·decisions §5·architecture §6) 대칭 gap 해소. product 전용 drift
  섹션은 code-coupled 주장이 적어 미추가(일반 drift는 상위 소유).

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/product/AGENTS.md` → exit 0 (PASS, 7건 반영 직후).
- roadmap 소유 근거(직접 확인): `roadmap.md:17`(gate 실행 순서)·`:4-5`(task 절차·cutover는 plans/code)·
  `## Gate Evidence`(Required evidence 기준). altitude 근거: `specs/AGENTS.md`(작성 규칙) ≠ `aiox-a2a.md`
  (contract 본문). sibling validation 섹션: `specs/AGENTS.md:110-116`·decisions §5·architecture §6.

**현재 상태:** product child AGENTS 완료. **W5 진행률: 완료 5 / 잔여 1 = `guides`.** 다음 = @user가
`guides` 초안 제공 시 검토 렌즈 ①–⑤로 검토·합성·적용 → guides 완료 후
`logs/2026-06-25-docs-하위-지침서와-Obsidian-템플릿-논의.md` owner handoff close → W6 이행. 파킹: taxonomy
의 roadmap 이중 서술(K-Owners↔Scoped-Authority) 문구 정합(이번 미반영). working tree uncommitted(8):
`document-structure-review/SKILL.md`(+`references/`) · `docs/AGENTS.md` · `architecture/AGENTS.md` ·
`specs/AGENTS.md` · `decisions/AGENTS.md` · `product/AGENTS.md` · `logs/2026-06-25-docs-skill.md` · 이 stage8
로그 — 커밋은 @user 지시 시.

## 2026-06-27 · product.md·roadmap.md 구조 개선 필요성 검토

@user가 현재 `docs/product/product.md`와 `docs/product/roadmap.md`를 보고 구조 개선 필요 여부를 요청했다.
@codex가 `docs/product/AGENTS.md`, `docs/documentation-system.md`, inbound references와 대조했다.

**판단(@codex):**

- `product.md`는 구조 개선 대상이다. 현재 내용은 owner boundary, 정의, primary user/jobs, cross-vendor framing,
  Google A2A naming 주의로 짧고 유효하지만, 문서가 스스로 말한 "제품 목적·사용자·scope·경계·채택 가설"을
  section 구조로 충분히 드러내지 않는다. 특히 current compat-layer 설명과 target/native direction이 한 흐름에 섞인다.
- `roadmap.md`는 기본 구조(Release Gates / Phases / Gate Evidence / Cross-Platform)는 유지하는 편이 맞다.
  다만 `Current Execution Candidates`는 plan-side transitional mapping이고 `plans/workspace-reset`에 successor repoint
  예정이 있어 stale 가능성이 높다. `Pre-Release Gap Summary`도 dated audit provenance가 본문에서 약하다.
- 두 문서 모두 repo-path wikilink 규칙 적용 여부는 W6 owner 문서 정리 때 함께 볼 후보다(`product.md`는 backtick path를
  다수 사용).

다음 행동 후보: product owner 문서 정리 단계(W6)에서 `product.md`는 Current Definition / User Value / Scope / Product
Principles or Positioning 형태로 재구조화하고, `roadmap.md`는 transitional plan mapping·audit pressure provenance만 보강한다.

## 2026-06-27 · document-structure-review skill 개선 후보 — ancestor를 axiomatic truth로 취급하는 문제

@user가 `document-structure-review` skill이 문제 문서를 `documentation-system.md` 같은 상위 문서에 맞추는 방향으로만
추론하고, 상위 문서 자체가 더 나은 구조로 바뀔 수 있다는 가능성을 충분히 다루지 않는다고 지적했다.

**판단(@codex):**

- 지적은 타당하다. 현재 skill은 parent/ancestor 계약과 owner map을 read path에 넣으라고 하지만, 그 계약 자체가 stale하거나
  개선 대상일 수 있음을 명시적으로 분류하는 규칙이 약하다.
- 필요한 보강은 "상위 문서를 무시하라"가 아니라, 상위 문서를 확인한 뒤 local-only fix / ancestor-only fix / both / no-change
  후보를 비교하게 하는 절차다.
- 개선안에는 agent scenario test가 포함돼야 한다. 각 후보가 다음 agent의 읽기 경로, owner 판단, 수정 행동을 어떻게 바꾸는지
  확인해야 parent와 child 중 어느 쪽을 고쳐야 하는지 재현 가능하다.

다음 행동 후보: `document-structure-review/SKILL.md`에 ancestor contract를 axiom이 아니라 검토 대상 constraint로 다루는
rule과, local/ancestor/both change matrix + agent scenario test를 추가한다. 실제 패치는 @user 승인 후.

## 2026-06-27 · W5 product/AGENTS.md 최종 리뷰

@user가 현재 `docs/product/AGENTS.md` 마지막 검토를 요청했다. @codex가 `docs/AGENTS.md`,
`docs/documentation-system.md`, inline-code check와 대조했다.

**확인한 사실:**

- `scripts/check-markdown-inline-code docs/product/AGENTS.md` → exit 0 (PASS).
- 현재 `docs/product/AGENTS.md`는 skeleton code block을 제거하고 product-scope 문서 작성 원칙을 invariant 형태로 둔다.
- 상위 `docs/AGENTS.md`는 각 `docs/**/AGENTS.md`가 "의미 규칙과 skeleton"을 소유한다고 표현한다.

**최종 리뷰 판단(@codex):**

- blocking issue는 없다. dual sub-kind, roadmap/plans/spec 경계, status vocabulary, drift 분류, validation checks가 현재
  product/roadmap 문제를 재현 가능하게 다룬다.
- 남은 미세 gap 1: 상위 `docs/AGENTS.md`의 "skeleton" 기대와 product child의 invariant-primary 선택이 명시적으로 연결되지
  않는다. product child에 "product type은 별도 skeleton을 두지 않고 authoring invariants를 따른다"는 한 줄을 추가하면
  다음 agent가 skeleton 누락으로 오해하지 않는다.
- 남은 미세 gap 2: Drift 처리의 `gap` 표현은 roadmap의 dated audit pressure까지 current/progress claim처럼 읽힐 수 있다.
  "current gap/status claim"으로 좁히면 더 정확하다.

다음 행동 후보: product child를 실제 마감 적용할 때 위 두 미세항목만 반영할지 결정한다. 반영하지 않아도 W5 진행을 막는
수준은 아니다.

## 2026-06-27 · W5 product/AGENTS.md 최종 미세 수정 반영

@user 승인으로 직전 최종 리뷰의 미세 수정 2건을 `docs/product/AGENTS.md`에 반영했다.

- Product 작성 규칙에 "product type은 별도 skeleton을 두지 않고, 아래 authoring invariants를 따른다"를 추가했다.
- Roadmap drift 분류의 `gap` 표현을 `current gap/status`로 좁혔다.

**검증 ledger:** `scripts/check-markdown-inline-code docs/product/AGENTS.md` → exit 0 (PASS).

현재 판단: product child AGENTS는 마감 가능 상태다. 다음 W5 작업은 잔여 `guides` child 초안 검토·합성·적용이다.

## 2026-06-27 · W5 product child 마감 — invariant-primary 전환 + W6 owner-doc 큐잉

product/AGENTS.md를 사례 중심으로 전면 재검토(4 sibling AGENTS + parent + taxonomy + `product.md`·
`roadmap.md` 본문 대조)한 뒤, @user 결정(A)로 invariant-primary 최종본을 적용했다. owner 문서 본문
변경은 W6로 큐잉한다(skeleton-first 순서 유지: AGENTS lock → owner 문서 정합).

**구조 모델 결정(@user A, @codex 합의):** product는 slice family가 없어 skeleton-primary 전제가 성립하지
않고, 실제 위험이 owner 경계 누출이므로 **invariant-primary**가 맞다. fenced Product Skeleton 제거 →
Product 작성 규칙의 invariant 2줄로 흡수. (sibling 비대칭은 document-role 차이로 정당화.)

**최종본 변경(현재본 → invariant-primary):**

- fenced `## Product Skeleton` 삭제 → "product-scope 문서는 User Value·Scope 중심, target work/phase는
  roadmap/spec/architecture로; Non-Goals/Boundaries/Deferred 기본 섹션 안 만듦" invariant로 대체.
- `## Drift 처리` 신설 — `product.md`는 as-built 주장 적어 일반 drift는 상위 위임. `roadmap.md`는 3분류:
  ① current/progress claim(gate 완료·gap·plan 참조)=plan/code/test와 어긋나면 stale 확인·갱신 ②
  gate/target criterion=code 못한다고 낮추지 않음, 변경은 intent 변경으로 보고·승인(절차는 상위
  Staleness And Drift 위임) ③ 불명확하면 사용자 확인. (specs §5·architecture §5 평행.)
- `## Status`에서 `Deferred` 제거(Current/Target만) + "doc 전체 Current여도 내부 Target claim 가능, 보류
  work는 roadmap/spec/architecture target 소유" 주석(architecture §2 평행).
- `## Validation`에 "작성 후 [[docs/documentation-system]] 권한 모델 위반 확인" 복원(@codex 프롬프트 누락분,
  product에 documentation-system 참조 0건이던 sibling 대칭 gap 해소).
- 도입부 순서: dir 정의+sub-kind bullet을 공통 위임 줄 앞으로(owner-first, sibling 순서 정렬).

**검증 ledger:** `scripts/check-markdown-inline-code docs/product/AGENTS.md` → exit 0 (PASS). 근거: skeleton
모델 = skill Guideline Structure Models(skeleton-primary는 slice family 전제); roadmap drift 3분류 =
`specs/AGENTS.md §5`·`architecture/AGENTS.md §5`; doc-Current/Target 주석 = `architecture/AGENTS.md:27-28`;
documentation-system 참조 = specs §6·architecture §1/5/6·decisions §5 보유 / product 0 → 복원.

**W6 큐잉(owner 문서 본문, 확인한 사실 + caveat):**

1. `product.md` 구조 개선 — 도입부(`:3-5`)가 선언한 책임과 실제 섹션 불일치, current/target 혼재
   (`:46-51` native 1급 지원이 compat framing에 섞임). 목표 구조(@codex 제안 + @claude 보강): Current
   Product Definition / User Value / Scope / Principles·Positioning. **caveat:** load-bearing 내용 보존
   (control-plane authority 불변식 `:28-31`, Google A2A 외부표현 주의 `:65-70` `last verified 2026-06-11`),
   native 1급 지원은 product positioning으로 남기되 `[Status: Target]` 태깅(phased work는 roadmap 소유),
   의미 변화 의심 시 보고. Non-Goals/Boundaries/Deferred 별도 섹션 안 만듦(Scope/Positioning 산문).
2. `roadmap.md` stale/transition fix — (a) `:143-161` Current Execution Candidates는 transitional marker만
   부착(successor 단일 A2A 실행 plan 생성·repoint는 **plan stage 9 소유**, 지금 repoint 금지). 새 `## Drift 처리`
   분기 1이 분류 기준 제공. (b) `:192-212` "dated audit" provenance 끊김 → `:211`의 W5
   evidence/decision/log 원본을 **W6에서 locate·검증한 뒤** `Sources:`로 연결(추측 경로 금지).

**현재 상태:** product child AGENTS 완료(invariant-primary). **W5 진행률: 완료 5 / 잔여 1 = `guides`.** 다음
= @user `guides` 초안 제공 시 검토 렌즈 ①–⑤로 검토·합성·적용 → guides 완료 후 2026-06-25 논의 로그 owner
handoff close → W6 이행(위 owner-doc 큐 소비). 파킹: taxonomy의 roadmap 이중 서술(K-Owners↔Scoped-
Authority) 문구 정합. working tree uncommitted: `product/AGENTS.md` 외 직전 목록 동일 — 커밋은 @user 지시 시.

## 2026-06-27 · W5 product/AGENTS.md Roadmap Section Ownership 추가

@user가 product/AGENTS.md section-level contract 리뷰를 반영하라고 승인했다. 판단은 `product.md`에는 named
section contract를 추가하지 않고 invariant-primary를 유지하되, `roadmap.md`는 안정적인 반복 섹션과 높은
mixing risk가 있으므로 section-level ownership을 추가하는 것이다.

**반영:**

- `docs/product/AGENTS.md`에 `## Roadmap Section Ownership`을 추가했다.
- `roadmap.md`는 새 skeleton을 따르지 않고 기존 구조를 유지하며, 섹션별 외부 owner 내용을 복사하지 않고
  링크한다는 원칙을 명시했다.
- 섹션별 owner 경계:
  - `Release Gates`: gate별 통과 조건 소유, spec contract 본문·architecture HOW·task checklist 제외.
  - `Phases`: phase 순서와 범위 경계 소유, task 분해·할당은 `plans/`.
  - `Current Execution Candidates`: roadmap-plan 매핑만 소유, plan task 내용은 `plans/`, successor plan/repoint는 owning plan/log.
  - `Gate Evidence`: 요구 evidence 항목·기준 소유, evidence 산출물과 구현은 code/tests/`plans/`.
  - `Cross-Platform Requirement`: gate/phase에 거는 platform 제약 소유, OS별 구현 상세는 architecture/code.
  - `Pre-Release Gap Summary`: audit의 gate/phase pressure 소유, dated audit 원본·severity·파일 목록은 해당 log나 decision owner.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/product/AGENTS.md` → exit 0 (PASS).

**남은 일:**

- W6에서 `product.md` structure 개선과 `roadmap.md`의 `Current Execution Candidates` transitional marker,
  `Pre-Release Gap Summary` sources 정리를 이 기준으로 수행한다.

## 2026-06-27 · W5 product/AGENTS.md Roadmap Change Rules 추가

@user가 Roadmap Section Ownership만으로는 부족하고, `roadmap.md`의 add/update/delete/move 같은 변경 행위 지침도
필요하다고 지적했다. @codex도 section ownership은 "어디에 무엇을 쓰는가"이고, change rules는 "추가·수정·삭제·이동할 때
무엇을 확인하는가"라서 별도 경량 규칙이 필요하다고 판단했다.

**반영:**

- `docs/product/AGENTS.md`에 `## Roadmap Change Rules`를 추가했다.
- 변경 종류를 먼저 분류하도록 했다: Add, Update, Delete, Move/Reclassify, Retire transitional content.
- Add는 product scope 안인지 확인하고 contract/spec, architecture direction, plan checklist를 각 owner로 보내게 했다.
- Update는 gate 순서·phase 범위·priority·evidence 기준 변경이 product scope나 roadmap intent 변경인지 확인하고,
  intent 변경이면 보고·승인 후 수정하게 했다.
- Delete는 release 판단 복원에 필요한 유일 정보인지 확인하고, 유일 정보이면 삭제 대신 축약·이동·`Sources:` 연결을 택하게 했다.
- Move/Reclassify는 plan task, spec contract, architecture detail, audit provenance에 가까운 내용을 owning 문서로
  이동하거나 링크하게 했다.
- Retire transitional content는 `Current Execution Candidates` 같은 transitional 섹션에 successor owner가 생기면 stale
  여부를 확인하고 축약·repoint·삭제 후보를 비교하게 했다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/product/AGENTS.md` → exit 0 (PASS).

## 2026-06-27 · W5 guides/AGENTS.md 적용 + W5 closeout

@user가 `docs/guides/AGENTS.md` 초안을 제공했다. W5의 마지막 child AGENTS 입력으로 보고,
`docs/AGENTS.md`, `docs/documentation-system.md`, 현재 `docs/guides/AGENTS.md`,
2026-06-25 논의 로그의 guide status 합의와 대조해 합성·적용했다.

**확인한 사실:**

- 현재 `docs/guides/AGENTS.md`는 guides type identity와 기본 작성 규칙만 있고, Status와 Guide Skeleton은 없었다.
- `docs/documentation-system.md`는 guides가 반복 workflow/how-to/runbook을 소유하고,
  제품 사실·구현 commitment·구속적 agent policy를 결정하지 않는다고 정의한다.
- 2026-06-25 논의 로그는 guide document-level status 후보를 `Current`/`Target`/`Deferred`로 정리했고,
  guide section/claim status는 기본적으로 쓰지 않는다고 기록했다.
- `docs/guides/workflow.md`는 현재 단일 guide 문서이며, 권위 계약이 아니라 반복 작업 흐름을 설명하는 guide라고
  자체 서술한다.

**판단과 반영:**

- 초안의 guides owner 경계와 status vocabulary는 상위 taxonomy·2026-06-25 합의와 일치한다고 판단했다.
- skeleton은 절차형 runbook/how-to 작성용으로 좁혀 유지했다. `docs/guides/workflow.md` 같은 서술형·explainer
  guide는 자기 흐름 구조를 유지한다고 명시했다.
- 초안의 wikilink 예시는 상위 `docs/AGENTS.md` repo 기준 path 규칙에 맞춰
  `[[docs/architecture/relevant-slice]]`, `[[docs/specs/relevant-spec]]` 형태로 조정했다.
- `Related:`가 broad graph link가 되지 않도록 load-bearing owner 문서만 둔다는 guard를 추가했다.
- `References`는 기본 skeleton section으로 두지 않았다. 실행 command/script는 Steps 또는 Verification에 두고,
  provenance는 `Sources:`가 소유하게 했다.
- `Validation And Cross-Owner Checks`를 추가해 guide의 실행 순서·출력·경로가 현재 owner 문서와 code/script 동작에
  맞는지 확인하게 했다.

**반영 파일:**

- `docs/guides/AGENTS.md`

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/guides/AGENTS.md` → exit 0 (PASS).

**2026-06-25 논의 로그 closeout:**

- `logs/2026-06-25-docs-하위-지침서와-Obsidian-템플릿-논의.md`는 W5 입력으로 소비됐다.
- 해당 논의의 owner 반영은 `docs/AGENTS.md`와 child `docs/**/AGENTS.md`에 완료됐다.
- portable skill 반영 handoff는 `logs/2026-06-25-docs-skill.md`가 별도로 소유한다.
- 남은 실행 작업은 논의 로그가 아니라 이 stage8 로그의 W6/W7가 소유한다.

**현재 상태:** W5 완료. 다음 재개 지점은 W6 — 확정된 AGENTS 계층 기준으로 `docs/` owner 문서를 정리하고
split·wikilink·stale drift를 통합 판정한다.

## 2026-06-28 · stage8 log split — W6/W10 child logs

- @user가 기존 stage8 로그가 너무 길어졌고, 흐름이 기존 stage8 control / W6 retrofit / W10 docs 전면 개선 3갈래로 나뉜다고 정리했다.
- 반영: 이 파일은 stage8 parent/control log로 유지하고, W6와 W10 상세 실행 기록은 child log로 분리했다. 기존 W5 이전 기록은 이 파일에 보존한다.
- Child pointer:
  - W6 retrofit: `logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md`
  - W10 docs 전면 개선: `logs/2026-06-28-workspace-reset-stage8-W10-docs-contract-overhaul.md`
- 의미 구분:
  - W6 child는 owner 문서 정합과 architecture/specs/decisions retrofit을 소유한다.
  - W10 child는 retrofit 중 드러난 docs 공통 계약·child AGENTS section contract 전면 개선을 소유한다.
- 현재 next pointer는 W10 child다. W10 child closeout 뒤 parent W10을 완료 처리하고 W6 child로 복귀한다.
- W7은 W6 완료 뒤 이 parent log에서 재개한다.

## 2026-06-28 · W10 child closeout consumed — W6 child 복귀

- W10 child log `logs/2026-06-28-workspace-reset-stage8-W10-docs-contract-overhaul.md`가 closeout을 남기고 `decided`로 닫혔다.
- W10은 one-by-one 검토 방식으로 완료됐다. 순서는 `docs/AGENTS.md` 공통 계약 → `architecture/specs/decisions/guides/product` AGENTS → `product.md`/`roadmap.md` product owner 문서 보정이었다.
- W10 closeout에는 `decisions/AGENTS.md`, `guides/AGENTS.md`, `product/AGENTS.md`, `product.md`, `roadmap.md` 각 검토 기록을 개별 판정 단위로 읽어야 한다고 명시했다.
- Parent Work Items 반영: W10을 완료 처리했고, next pointer를 W6 child log로 복귀시켰다.
- 현재 재개 지점은 W6 child log `logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md`다. W6 child의 active item은 architecture retrofit이며, W7은 W6 완료 뒤 이 parent log에서 재개한다.

## 2026-06-28 · W10 지시서 범위 정정 — Claude review context

- @user 정정: "W10에 대한 지시서 내용"은 Claude에게 리뷰·검토를 맡길 때의 지시 범위를 뜻한 것이며, W10 child closeout에 새 실행 항목을 추가하라는 뜻은 아니었다.
- Parent 상태 변경 없음: W10은 완료 상태를 유지하고, next pointer는 W6 child log를 계속 가리킨다.
- W10 child log에는 같은 정정을 추가했다. future reviewer는 W10의 `decisions/guides/product` AGENTS와 `product.md`/`roadmap.md` 기록을 one-by-one 검토 단위로 읽는다.

## 2026-06-29 · W6 child log 분리 — W2 완료·W3·W4 child log 신규

W6 child log(`logs/2026-06-28-workspace-reset-stage8-W6-owner-doc-retrofit.md`)에서 W2 architecture 기록을 이전하고 W3 specs·W4 decisions를 각각 별도 child log로 분리했다.

- W2 architecture retrofit: `logs/2026-06-28-workspace-reset-stage8-W2-architecture-retrofit.md` — index + slice 9개 완료(decided). W6 sub-item [x] 처리.
- W3 specs retrofit: `logs/2026-06-28-workspace-reset-stage8-W3-specs-retrofit.md` — aiox-a2a 인덱스(S0) + slice 7개(S1~S7) step-by-step 작업 아이템 포함. W6 sub-item [>] active.
- W4 decisions drift: `logs/2026-06-28-workspace-reset-stage8-W4-decisions-drift.md` — decision 15개(D01~D15) one-by-one drift 검토 아이템 포함. W6 sub-item [ ] open.

다음 행동: W3 child log에서 `docs/specs/aiox-a2a.md` 인덱스(S0)부터 one-by-one 검토·retrofit 착수.
