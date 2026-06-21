---
topic: workspace reset W4.5 owner 문서 정제와 질문 중심 탐색
description: workspace reset W4.5 — W4 이관본 product/spec/architecture/roadmap owner 문서를 정제하고 사용자 질문 중심으로 spec·roadmap·architecture·plans 흐름을 탐색한다
status: open
---

## Work Items

- [x] W1 owner 문서 정제 상태를 확인하고 남은 정리 범위를 확정한다
  - [x] W1-1 `docs/product/product.md` 정제 잔여 확인 — non-goals 제거 반영 후 Exploratory 섹션 처리 여부 판단
  - [x] W1-2 `docs/architecture/local-agent-runtime.md` 역할 정리 확인 — rename/inbound/self-reference, as-built runtime reference, 긴 문서 진입점 필요 여부
  - [x] W1-3 `docs/specs/aiox-a2a.md` 역할 정리 — contract 본문과 dated implementation/evidence/current matrix 경계 판단
  - [x] W1-4 Transferred: `docs/product/roadmap.md` 역할 정리 → W7 — roadmap/release 정합화 때 함께 처리
  - [x] W1-5 Transferred: distribution 문서 후보 정리 → W7 — roadmap/release 정합화 때 `plans/release-plan.md` 경계와 함께 처리
  - [x] W1-6 Transferred: `docs/architecture/documentation-system.md` owner map 정합성 확인 → W5-3 — 하위 AGENTS 상위 계약 점검 때 함께 처리
- [x] W2 Transferred: 사용자 질문 중심 탐색 방식 → W7/W8/W10 — 독립 작업으로 완료 판정하지 않고 monolithic 최신화와 split 설계 중 확인 방식으로 적용
  - 질문 하나를 중심으로 spec/roadmap/plans/architecture/code owner를 왕복한다
  - 답변마다 확인한 사실, 추론, 의견/제안을 구분하고 해당 owner를 표시한다
  - 현재 질문과 별도 수명인 꼬리질문은 parking lot으로 남긴다
- [ ] W3 반복 설명과 합의된 작성 규칙을 정리해 guide 또는 `docs/guides/workflow.md` 반영 후보로 만든다 — 지금 하지 않음; 하위 AGENTS와 monolithic 최신화 이후 재검토
- [ ] W4 Final closeout: W8-W11 완료 후 이 child 로그 결과를 parent inventory 로그에 반영하고 parent W4.5를 해소한다
- [x] W5 `docs/specs/AGENTS.md`와 `docs/architecture/AGENTS.md`를 작성하고 상위 문서 계약과 정합성을 확인한다
  - [x] W5-1 `docs/specs/AGENTS.md` 작성 — spec 작성 규칙, 상태 어휘, section ID 보존, harness/agent 확인 절차
  - [x] W5-2 `docs/architecture/AGENTS.md` 작성 — as-built/target 구분, code/test 근거, drift 처리, harness/agent validation 절차
  - [x] W5-3 root `AGENTS.md`, `docs/architecture/documentation-system.md` 등 상위 계약에 하위 AGENTS 구조 반영 필요 여부 확인
- [x] W6 Complete child log `logs/2026-06-17-workspace-reset-W4.5-decision-문서화-기준.md`, then consume decision/logging rules and resume W7
  - [x] W6-1 Transferred: history/legacy 자료에서 decision으로 승격해야 할 기준과 후보 확인 → child W1/W3
  - [x] W6-2 Transferred: 필요한 `docs/decisions/` 작성 규칙 또는 첫 decision 문서 작성 → child W1
  - [x] W6-3 Transferred: root `AGENTS.md`와 `docs/architecture/documentation-system.md`에 decision 작성·승격 기준 반영 필요 여부 확인 및 갱신 → child W2
- [x] W7 local runtime authority assimilation package 완료 및 parent 반영 완료 → child log `logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`
  - [x] W7-1 Step 15 pair/dispatch/stale drift 반영 여부 확인 및 정리
  - [x] W7-2 history/src/tests/spike/spikes/legacy evidence를 확인하고 Evidence Ledger를 남긴다
  - [x] W7-3 작업 중 spec/roadmap/release-plan/decision owner 변경이 필요하면 같은 package log에 Cross-Owner Effects와 Decision Candidates로 기록하고 반영한다
- [x] W8 Complete child package log `logs/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`, then consume result and resume W9 — A2A spec authority assimilation. primary entry point `docs/specs/aiox-a2a.md`. W5 history migration의 source map·disposition 제약·target self-sufficiency·delete guard와 `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` spec gap을 입력으로 받고, legacy 원본 disposition은 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` source map에 append한다. **완료(2026-06-21): W8 child W1-W8 PASS, §4 lifecycle decision 승격, source map W8 2 row 수용. W9 closeout에서 parent 소비안과 Legacy/Historical Source Handoff를 draft한다.**
  - [x] W8-0 agent 의견 수렴 완료 (claude 종합 + @user + @codex). 확정: A0/A1 분리, Falsifiability gate(Current Contract=src+test cite 필수), Ledger-먼저-본문-나중 6-phase, repo 정확한 상태 라벨, §13 선별 decision 승격. 결과는 child package log 첫 블록에 기록
  - [x] W8-1 Transferred: contract/status/cross-reference 정합성 → child package log W2~W7 (batch A0/A1/B/C + cite spot-check·본문 반영)
  - [x] W8-2 Transferred: history/src/tests/architecture/roadmap/release evidence + Evidence Ledger → child package log W2~W6
  - [x] W8-3 Transferred: architecture/roadmap/release-plan/decision cross-owner 변경 → child package log W6 Sweep + Cross-Owner Effects/Decision Candidates
  - [x] W8-4 Transferred: workflow retrospective → child package log W9 Closeout
- [>] W9 release/roadmap authority assimilation package를 수행한다 — primary entry point는 `docs/product/roadmap.md`와 `plans/release-plan.md`. W9 task brief/package 진입 시 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` Legacy Source Map을 required-read로 두고, 특히 `prd/post-mvp/aiox-a2a-spec.md`, `plans/post-mvp.plan.md`, `plans/post-mvp/*.plan.md` rows를 roadmap/release 흡수 입력으로 확인한다. W7 wording Open Issue 4(`deliveryId` namespace)·5(correlated reply authorization)는 `docs/product/roadmap.md` G1-A/B/D gate에서 확인하고, 현재 G6 packaging checklist 성격인 `plans/release-plan.md`에는 중복 반영하지 않는다. 흡수 후 해당 rows의 disposition·self-sufficiency를 같은 source map에 append/update한다. **W9 closeout에는 `history/58` 부분 승격/잔여, `prd/post-mvp/archive/*`, `docs/aiox/*`, `prd/pre-validation/*`, `plans/post-mvp*`, `history/59`를 W9/W10/물리삭제게이트로 나누는 Legacy/Historical Source Handoff를 포함한다.**
  - [ ] W9-1 사용자의 배포 우선순위 기준으로 roadmap/release-plan 정합성을 갱신한다
  - [ ] W9-2 작업 중 spec/architecture/decision owner 변경이 필요하면 같은 package log에 Cross-Owner Effects와 Decision Candidates로 기록하고 반영한다
  - [ ] W9-2a 생성할 W9 task brief에는 workflow retrospective와 `logs/2026-06-18-package-workflow-portable-pattern.md` 기록 지시를 포함한다
  - [ ] W9-3 Workflow retrospective: batch 분할, task brief, Evidence Ledger, Scope, agent 의견 수렴에서 생긴 시행착오와 portable 후보를 package closeout에 기록한다
- [ ] W10 split readiness and map package를 수행한다 — W2의 질문 중심 owner 왕복 방식을 적용하며, README는 지금 생성하지 않고 split 시점에 필요성을 재판단한다. `logs/2026-06-19-workspace-reset-W5-history-migration.md`의 W5 history migration source map과 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` Legacy Source Map(`docs/aiox/*`, archive/decision-candidate rows 포함)을 둘 다 required-read로 두고, target self-sufficiency/delete guard를 history/legacy rationale 입력으로 사용한다. split/disposition 판단 후 legacy-source-absorption rows를 append/update한다.
  - 주의: W10은 단일 primary owner 문서가 없다. split 대상은 W7·W8에서 최신화된
    `docs/specs/aiox-a2a.md`와 `docs/architecture/local-agent-runtime.md`이며,
    Scope.Primary owner는 child log 진입 시 사용자와 확정한다.
  - [ ] W10-1 split 중 history/legacy 자료에서 decision-worthy rationale이 발견되면 W6 기준에 따라 `docs/decisions/`로 승격한다
  - [ ] W10-2 split map, anchor preservation, inbound reference, README 필요성을 검토한다
  - [ ] W10-2a 생성할 W10 task brief에는 workflow retrospective와 `logs/2026-06-18-package-workflow-portable-pattern.md` 기록 지시를 포함한다
  - [ ] W10-3 Workflow retrospective: batch 분할, task brief, Evidence Ledger, Scope, agent 의견 수렴에서 생긴 시행착오와 portable 후보를 package closeout에 기록한다
- [ ] W11 W7~W10을 진행하는 동안 package workflow 시행착오를 계속 수집하고 portable log skill 후보로 정리한다 → `logs/2026-06-18-package-workflow-portable-pattern.md`. 수집은 각 W closeout 때 즉시 누적하고, W8~W10 package closeout 뒤 repo 전용/portable 분리와 승격 판단을 마무리한다
  - [ ] W11-1 각 package closeout 때 package log/task brief/evidence ledger/agent 의견 수렴/Scope 운영에서 생긴 문제와 보완점을 child log에 기록한다
  - [ ] W11-2 repo 전용 taxonomy와 portable pattern을 child log에서 분리한다
  - [ ] W11-3 portable log skill로 옮길지, repo integration에 남길지 판단하고 필요하면 log skill maintenance 절차로 별도 개선 작업을 연다

## 2026-06-16 · workspace reset W4.5 owner 문서 정제와 질문 중심 탐색

Parent pointer: `logs/2026-06-16-workspace-reset-폴더별-inventory.md` W4.5

이 로그는 parent inventory 로그가 길어져 W4.5 범위를 분리한 child 로그다. 이 로그가 W4.5
owner 문서 정제와 질문 중심 탐색 방식을 이어받는다. 이 로그가 끝나면 parent의 W4.5를
완료 또는 다음 상태로 해소하고 W5 history migration으로 복귀한다.

## 2026-06-16 · W4.5 범위와 진행 방식

**이관된 범위:**

- W4 이관본 owner 문서의 topology 정제: product/spec/architecture/roadmap/distribution/workflow 후보.
- 사용자 이해 보조: 프론트엔드 개발자 관점에서 spec, roadmap, plans, architecture 흐름을 질문 중심으로 탐색.
- 작성 규칙 후보 정리: dated feasibility/evidence, current implementation matrix, roadmap과 plan 연결, architecture current implementation 설명 수준.

**확인된 현재 상태:**

- 사용자가 `docs/product/product.md`에서 non-goals를 제거했다.
- 사용자가 architecture 문서를 `docs/architecture/local-agent-runtime.md`로 rename했다.
- `docs/architecture/documentation-system.md`의 큰 owner 경계는 유지한다. product 설명의 non-goals 잔여 언급은 parent 로그에서 정리됐다.
- `docs/product/product.md`에는 아직 Exploratory 시장/채택 가설 섹션이 남아 있어 W1-1에서 처리 여부를 판단한다.

**진행 방식:**

- 큰 한국어 reading guide를 먼저 만들지 않는다.
- 문서별 고정 순서(`roadmap -> spec -> architecture`)를 강제하지 않는다.
- 사용자의 질문 하나를 중심으로 관련 owner 문서를 왕복한다.
- 원문 식별자 `G0`, `G1` 등은 유지하되, 사용자-facing 설명에서는 `gate`를 **공개 전 완료 조건**으로 풀어 설명한다.
- 반복되는 설명과 합의된 작성 규칙이 쌓인 뒤에 guide나 `workflow.md` 반영 후보로 정리한다.

## 2026-06-16 · W1-1 완료 — product.md Exploratory 섹션 제거

`docs/product/product.md` W1-1 완료 — non-goals 제거(사용자 선반영) 확인 후 Exploratory 섹션 2개(§경쟁 경계·§채택·상업화 가설) 제거. product consequence 한 문장은 §Cross-vendor framing 끝에 흡수. Normative/Exploratory 헤더 설명도 제거. product.md는 이제 제품 정의·Primary user·Cross-vendor framing·Google A2A 주의로만 구성된다.

## 2026-06-16 · W1-2 완료 — local-agent-runtime.md 역할 정리

**확인된 사실 (파일 직접 확인):**

- `docs/architecture/local-agent-runtime.md`로 rename 완료 (헤더 Role 필드에 authority 명시됨 ✓)
- §0 Purpose에 "entry point for debugging, onboarding, and verifying behavior"라고 이미 명시 → 별도 진입점 불필요
- 헤더 메타데이터에 as-built role과 상충 문서 처리 규칙 명확히 정의됨 ✓
- `docs/architecture/documentation-system.md`는 `docs/architecture/`로만 지칭, 파일명 직접 명시 없음 → inbound reference 수정 불필요

**수정 내용:**

- §14 Authority Links line 1082: `docs/architecture/mvp-architecture.md` (old name, self-reference) → `docs/architecture/local-agent-runtime.md (this document)`로 수정

**결론:**

- rename/inbound/self-reference: self-reference 1건 수정 완료
- as-built runtime reference: 헤더에 명확히 정의됨 — 수정 불필요
- 긴 문서 진입점: §0 Purpose로 충분 — 추가 진입점 불필요

다음: W1-3 `docs/specs/aiox-a2a.md` 역할 정리

## 2026-06-16 · W1-3 완료 — aiox-a2a.md 역할 정리

**확인된 사실 (파일 직접 확인):**

- 도입부에 Normative/Current/Committed target/Exploratory 상태 정의 명확히 존재
- §6·§7에 "Status:" 레이블 부착 — contract 본문과 dated evidence 경계 이미 충분히 구분됨
- `Current adapter matrix (2026-06-11)`, §7.1 feasibility table(2026-06-11) 등 dated facts가 "Current" 범주로 문서 안에 포함됨 — 별도 섹션 분리 불필요
- architecture self-reference (line 10): `docs/architecture/mvp-architecture.md` (old name) 발견

**수정 내용:**

- line 10: `mvp-architecture.md` → `local-agent-runtime.md`로 수정

**결론:**

- contract 본문/dated evidence 경계: 기존 status 정의 체계로 충분 — 구조적 변경 불필요
- self-reference 1건 수정 완료

다음: W1-4 `docs/product/roadmap.md` 역할 정리

## 2026-06-17 · spec과 architecture의 현재/미래 경계 질문

@user 질문: spec은 구현할 것들, 즉 해야 할 것을 작성하는 문서이고 architecture는 현재까지 구현된 것을 쓰는지, 아니면 앞으로 구현할 architecture를 쓰는지 확인 요청.

**확인한 로컬 기준:**

- `docs/architecture/documentation-system.md` 기준으로 `docs/specs/`는 외부 사용 주체, 연동 구현 또는 미래 재구현이 호환성을 위해 지켜야 하는 동작/interface/protocol/data/state contract를 소유한다.
- 같은 문서 기준으로 `docs/architecture/`는 specs와 product intent를 만족시키기 위한 내부 구조, 책임 배치, module/process 경계, data flow와 내부 state 관리 원칙을 소유한다.
- code/tests는 실제 구현의 현재 동작 fact owner다.
- `product`, `specs`, `architecture`, `roadmap`, `plans`는 각 scope에서 무엇이어야 하는지에 대한 intended owner이고, code/tests는 현재 구현 사실을 증명한다.

**정리한 설명:**

- spec은 “앞으로 구현할 것”만이 아니라 “외부에 약속할 동작/계약”이다. 이미 구현됐든 아직 구현 전이든, 외부 contract로 채택한 내용이면 spec에 둔다.
- architecture도 원칙적으로는 “현재 구현 설명만”이 아니라 “spec/product intent를 만족하기 위해 내부 구조가 어떠해야 하는지”를 소유한다.
- 다만 현재 repo의 `local-agent-runtime.md` 같은 as-built architecture 문서는 현재 구현된 runtime 구조를 기준으로 설명하는 architecture reference다.
- 따라서 architecture는 두 성격을 구분해 써야 한다: Current/as-built는 현재 코드 구조 설명, Target/Proposed는 앞으로 구현할 구조 제안이나 목표 구조.
- 미래 architecture를 문서에 넣을 수는 있지만, 반드시 상태를 표시해야 한다. 예: Current, Target, Proposed, Deferred.

## 2026-06-17 · FE 비유 검토 — spec/API 명세와 architecture 내부 구조도

@user 질문: Gemini가 제시한 FE 비유, 즉 spec은 Figma/Swagger 같은 외부 동작 약속이고 architecture는 실제 폴더 구조·컴포넌트 의존성·상태 관리 흐름 같은 내부 구현 현황판이라는 설명이 맞는지 확인 요청.

**확인한 사실:**

- spec/architecture owner 경계는 `product.md`가 아니라 `docs/architecture/documentation-system.md`가 소유한다.
- `docs/specs/`는 외부 사용 주체, 연동 구현 또는 미래 재구현이 호환성을 위해 지켜야 하는 동작/interface/protocol/data/state contract를 소유한다.
- `docs/architecture/`는 specs와 product intent를 만족시키기 위한 내부 구조, 책임 배치, module/process 경계, data flow와 내부 state 관리 원칙을 소유한다.
- `docs/architecture/local-agent-runtime.md`는 현재 aiox MVP internal structure, responsibility boundaries, data flow, lifecycle invariants를 다루는 as-built architecture authority다.
- `docs/specs/aiox-a2a.md`는 protocol/interface/state contract이고, 문장 상태를 Normative, Current, Committed target, Exploratory로 구분한다.

**판단:**

- FE 비유 자체는 사용자 이해용으로 적절하다. Spec을 Figma component requirement/API Swagger, architecture를 폴더 구조·의존성·상태 관리 흐름으로 비유하면 큰 방향은 맞다.
- 단, “architecture = 한 것만”으로 고정하면 부정확하다. 이 repo의 architecture owner는 내부 구조의 intended owner이며, 현재 문서 `local-agent-runtime.md`가 as-built 성격을 가진 것이다.
- 더 정확한 표현은 “spec = 외부 동작 약속, architecture = 그 약속을 만족시키는 내부 구조. architecture 문서 안에서는 Current/as-built와 Target/Proposed를 분리한다”이다.
- API/spec 변경 시 architecture는 항상 갱신되는 것이 아니라, 내부 책임·flow·module boundary가 바뀔 때 갱신한다.

## 2026-06-17 · 사용자 파악용 문서 읽기 순서

@user 질문: 현재 a2a spec과 local-agent-runtime을 어떻게 파악할지, a2a-spec.md를 읽으면서 local-agent-runtime을 같이 확인하는 방식이 나은지 문의.

**확인한 사실:**

- `docs/specs/aiox-a2a.md`는 glossary, layer model, protocol/message lifecycle, adapter/capability, compose, capability/sandbox, federation, open/deferred 순서로 구성된다.
- `docs/architecture/local-agent-runtime.md`는 Purpose, process topology, SQLite/repository, daemon lifecycle/API, Claude adapter, Codex adapter, message routing, CLI, error/event catalog, smoke matrix, known gaps 순서로 구성된다.
- `docs/product/roadmap.md`는 release gates, phases, current execution candidates, gate evidence, pre-release gap summary를 소유한다.

**판단/제안:**

- 사용자 파악용 첫 순서는 `roadmap -> spec 핵심 section -> architecture 관련 section`이 적합하다.
- `aiox-a2a.md` 전체를 먼저 정독하면 protocol 용어가 많아 부담이 크므로, roadmap에서 “왜 이걸 봐야 하는지”를 먼저 잡는 편이 낫다.
- 추천 1회차 범위: `product.md` 5분, `roadmap.md`의 Release Gates/Pre-Release Gap Summary, `aiox-a2a.md`의 Glossary/Layer model/§4 message lifecycle, `local-agent-runtime.md`의 Purpose/Process Topology/§4.3 sendMessage/§8 routing.
- 이후 사용자가 “envelope”, “round trip”, “adapter”, “capability”, “compose” 같은 질문 단위로 spec과 architecture를 왕복한다.

## 2026-06-17 · local-agent-runtime as-built 설명 검토

@user 질문: Gemini가 `docs/architecture/local-agent-runtime.md`를 현재 실제 구현된 내부 구조(As-Built Architecture) 문서로 설명한 것이 맞는지 확인 요청.

**확인한 사실:**

- `docs/architecture/local-agent-runtime.md` 최상단은 `aiox MVP — As-Built Architecture`다.
- 메타데이터에 `MVP implementation closed`, `promoted to as-built architecture authority`, `current aiox MVP internal structure, responsibility boundaries, data flow, and lifecycle invariants`가 명시돼 있다.
- 같은 메타데이터는 concrete claim이 `file:line` 또는 `history/<N>`를 cite하고, 코드에는 있으나 기록된 rationale이 없는 동작은 `Implementation-only`로 표시한다고 설명한다.
- §0 Purpose는 이 문서를 debugging, onboarding, verifying behavior의 entry point라고 설명한다.
- `docs/architecture/documentation-system.md`는 code/tests를 실제 구현 현재 동작의 fact owner로 둔다.

**판단:**

- Gemini 설명의 핵심은 맞다. `local-agent-runtime.md`는 현재 MVP runtime 내부 구조에 대한 as-built architecture authority다.
- 단, “product.md에서 architecture 역할을 current/as-built로 정의했다”는 출처 설명은 부정확하다. owner 경계는 `docs/architecture/documentation-system.md`와 `local-agent-runtime.md` 자체 메타데이터에서 확인된다.
- “현재 상태의 진실/source of truth”라는 표현은 architecture 문맥에서는 적절하지만, 실제 코드 동작의 최종 사실 확인은 code/tests가 소유한다. 문서와 코드가 충돌하면 이 문서를 업데이트해야 한다.
- `MVP implementation closed`는 MVP 구현이 닫혔다는 뜻이지 aiox 전체 구현이 완료됐다는 뜻은 아니다.

## 2026-06-17 · Step 15 drift 보고 검토와 처리 의견

@user 공유: Claude/Gemini subagent가 `prd/mvp/aiox-mvp-spec.md`, old architecture, `docs/architecture/local-agent-runtime.md`, code를 교차 검증했고, Step 15 pair slot generalization 및 dispatch structuredContent가 코드에는 구현됐지만 `local-agent-runtime.md`에는 낡은 Codex+Claude 제약/ok:true 설명이 남아 있다고 보고. 처리 의견 요청.

**직접 확인한 사실:**

- `prd/mvp/aiox-mvp-spec.md` Step 15 amendment는 기존 “one Codex slot + one Claude slot” 표현을 supersede하고, pair를 `slot: "a" | "b"` vendor-agnostic 2-slot으로 정의하며 codex↔codex / claude↔claude / mixed 허용, `target_binding_unconfirmed` 등 deferred reason을 요구한다.
- `docs/architecture/local-agent-runtime.md`에는 stale한 설명이 남아 있다: §0 Purpose는 “one Claude CLI session and one Codex CLI session”, §2 pairs status 표는 `pending`/`ready`만, §3/§8.6은 kind-slot/Codex+Claude slot 제약과 `pair_kind_slot_occupied`/`agent_kind_mismatch`를 설명한다.
- code는 2-slot 구조를 갖는다: `src/core/pairs.ts`는 `PairSlot = "a" | "b"`, `pairStatuses = ["pending", "ready", "stale"]`; `src/store/schema.ts`는 `agents.pair_slot`; `src/store/repositories/pairs.ts`는 slot 점유와 pair full만으로 attach를 처리하며 ready는 slot a/b 존재 여부로 판단한다.
- `src/daemon/state.ts`의 `createBidirectionalPairRoutes`는 slot A/B를 기준으로 양방향 route를 만들고, same-kind일 때도 양방향 route pair를 만든다.
- dispatch 결과는 daemon result에 붙고 (`receive*` paths), Codex/Claude tool surface의 `structuredContent.dispatch`로 노출된다.
- WAL file-mode helper는 존재하지만 production daemon 경로는 현재 `:memory:`다. 이 항목은 pair/dispatch drift와 별도로 판정해야 한다.

**의견:**

- subagent 보고의 큰 방향은 맞다. `local-agent-runtime.md`는 as-built authority이므로 코드와 다른 낡은 pair/dispatch 설명을 방치하면 안 된다.
- 단, old PRD 전체를 다시 이관하거나 광범위하게 rewrite하지 말고, 코드로 확인된 as-built drift만 좁게 패치한다.
- 1순위 패치: `local-agent-runtime.md`의 Purpose, SQLite schema table, repositories table, daemon API error catalog, §8.6 Pair Reservation + Routes, relevant sequence/tool result 설명을 현재 2-slot vendor-agnostic pair와 dispatch summary exposure에 맞춘다.
- 2순위 패치: `stale` status 표기와 known gaps 표현을 정리한다. 실제 stale transition policy는 아직 gap이므로 “status type exists, transition policy remains gap”처럼 구분한다.
- WAL/in-memory는 별도 항목으로 유지한다. `openSqliteDatabase`는 WAL helper지만 production daemon이 in-memory라 current architecture 문서의 Known Gap은 여전히 유효하다.

## 2026-06-17 · Step 15 위치와 WAL gap 분리 설명

@user 결정: pair 일반화, dispatch structuredContent, stale status 정리는 subagent에게 지시. @codex에게는 Step 15가 어디에 있고 무슨 step인지, WAL/in-memory를 Step 15 drift와 섞지 말고 별도 gap으로 유지한다는 의미, Gemini에게 줄 stale-expression/cross-reference 점검 프롬프트 요청.

**확인한 사실:**

- Step 15는 현재 `docs/product/roadmap.md`의 G0/G1 같은 release gate가 아니라, legacy MVP implementation sequence의 15번째 step이다.
- 위치는 `prd/mvp/aiox-mvp-spec.md`의 Step 15 amendment block과 `history/45-step-15-pair-slot-generalization-design.history.md`, `history/46-step-15-phase-a-decisions.history.md`, `history/47-step-15-phase-b-closeout.history.md`, `history/48-step-15-d8-surface-consistency.history.md`다.
- Step 15 내용은 pair slot generalization, dispatch generic화, Codex fallback disable, deferred semantics, migration, self-loop guard, nested dispatch source notification surface를 다룬다.
- WAL/in-memory 문제는 Step 15의 pair/dispatch drift와 다른 축이다. `src/store/sqlite.ts`에는 WAL helper가 있지만 production daemon은 `:memory:` DB를 쓰고, `local-agent-runtime.md` Known Gaps 및 roadmap/spec persistence 항목과 연결된다.

**설명 방향:**

- Step 15 drift는 “이미 구현된 Step 15 behavior를 as-built architecture 문서가 따라오지 못한 문제”다.
- WAL/in-memory gap은 “현재 공개/안정화 전까지 유지되는 durability/persistence 한계”다.
- 따라서 같은 patch에서 함께 대규모 수정하지 말고, Step 15 문서 drift는 지금 정정하고 WAL/in-memory는 별도 gap으로 남긴다.

## 2026-06-17 · architecture validation 후 PRD 삭제·spec/architecture split 전략

@user 계획: Gemini로 `local-agent-runtime.md` 각 섹션을 소스 코드와 교차 검증하고 validation한 뒤, 불필요한 `prd/mvp/` 파일을 삭제하고, 이후 roadmap/spec을 이해한 다음 spec을 파일별로 분리하며 architecture도 가능하면 분리할 계획에 대한 의견 요청.

**확인한 사실:**

- 현재 `prd/mvp/aiox-mvp-spec.md` 참조는 history, docs/aiox learning records, logs 등에 아직 남아 있다.
- `docs/specs/aiox-a2a.md`는 §2~§9 section ID를 보존한 상태이고, post-mvp plan들이 §4/§5/§9 등을 참조한다.
- `docs/architecture/local-agent-runtime.md`는 as-built architecture authority지만 1000줄 이상의 긴 단일 문서다.

**의견:**

- architecture validation을 먼저 하는 순서는 맞다. as-built 문서가 코드와 맞아야 PRD 삭제와 split의 기준점이 안정된다.
- `prd/mvp/` 삭제는 validation 이후에 하되, 삭제 전에 authoritative 내용이 product/spec/architecture/roadmap/decision/log로 흡수됐는지와 live inbound 참조가 남았는지 확인해야 한다.
- spec은 “구현해야 할 것 목록”이 아니라 외부 contract/intent다. Normative/Committed target/Open-deferred를 구분하고, roadmap이 구현 시점과 우선순위를 소유한다.
- spec split은 찬성하지만 section ID와 inbound 참조가 많으므로 `aiox-a2a.md`를 index/overview로 남기고, message lifecycle/envelope, adapter capability, compose, capability/sandbox, federation/open-deferred 같은 owner slice로 나누는 방식이 안전하다.
- architecture split도 가능하지만 validation 이후가 맞다. `local-agent-runtime.md`를 index/overview로 남기고 daemon/store, Claude adapter, Codex adapter, message routing, CLI/errors/events/smoke 같은 as-built slices로 나누는 방향이 후보.

## 2026-06-17 · split 이후 README/AGENTS와 current/future spec 분리 논의

@user 의견: 각 폴더 하위에 `AGENTS.md`를 두고 index/map 형태로 관리할 수 있을 것 같음. architecture는 6개 모듈 상호작용으로 이해하고 있음. spec 내용을 plans로 옮겨 구현하고 구현 내용 성격에 따라 spec/architecture를 갱신하는 것으로 이해하면 되는지, 현재 architecture는 현재 내부 구현 내용인지, spec도 current/future를 분리했다가 나중에 합쳐야 하는지 질문.

**확인한 로컬 기준:**

- `documentation-system.md` 기준 `README.md`는 사람용 진입점이고, `AGENTS.md`는 agent 작업 범위와 행동 규칙을 소유한다.
- `docs/specs/`는 외부 contract를, `docs/architecture/`는 내부 구조/책임/flow를, `plans/`는 workstream 단계와 진행 상태를 소유한다.

**판단/제안:**

- index/map은 하위 `README.md`에 두는 편이 맞고, 하위 `AGENTS.md`는 “이 폴더 문서를 작성·수정할 때의 규칙”에 둔다.
- spec 내용을 plans로 “옮긴다”기보다는, spec의 contract 중 roadmap이 우선순위를 준 항목을 plan이 실행 단위로 참조한다고 이해하는 편이 정확하다. 구현 후에는 외부 contract 변화는 spec, 내부 구조 변화는 architecture, 실제 진행 상태는 plan/log에 반영한다.
- 현재 `local-agent-runtime.md`는 현재 내부 구현의 as-built architecture다. future architecture는 별도 Target/Proposed 상태 표시가 필요하다.
- spec을 current/future로 파일 자체를 완전히 나누기보다, 각 spec slice 안에서 `Current`, `Committed target`, `Open/deferred`를 명시하거나 index에서 상태 map을 제공하는 편이 과도한 파일 증가를 막는다.
- architecture split 후보는 사용자 표현의 “6개 모듈 상호작용”을 기준으로 하되, 먼저 validation이 끝난 뒤 실제 경계가 code/module/process와 맞는지 확인해야 한다.

## 2026-06-17 · README/AGENTS 설계 의견 수집 프롬프트

@user 요청: `docs/specs/`와 `docs/architecture/` 하위에 README/AGENTS를 먼저 작성하는 방향에 대해 Claude/Gemini 의견을 묻기 위한 프롬프트 요청.

**프롬프트 의도:**

- 아직 파일 작성/수정이 아니라 의견 수집.
- `README.md`는 사람용 index/map, `AGENTS.md`는 agent 작성 규칙이라는 역할 구분을 검토하게 한다.
- spec/architecture split, current/target/open 상태 표기, section ID 및 inbound 참조 보존, validation 이후 split 순서를 같이 검토하게 한다.

## 2026-06-17 · README 보류와 monolithic 최신화 우선 결정

@user 추가 의견:

- 하위 `README.md`는 당장은 필요 없고, `AGENTS.md`만으로 충분하다고 판단.
- `aiox-a2a.md`와 `local-agent-runtime.md`는 현재 section ID 참조와 overview 역할 때문에 유지해야 한다고 판단.
- 각 하위 `AGENTS.md`에는 문서 작성 규칙뿐 아니라 agent/harness가 해당 폴더 문서를 다룰 때의 실행 규칙도 필요하다고 판단.
- split 전에 `aiox-a2a.md`와 `local-agent-runtime.md`를 monolithic 형태로 먼저 최신화한다. 이유는 현재 최신화가 덜 되어 있고, 참고시킬 legacy/source 문서가 여러 개 있으며, roadmap/release도 사용자의 배포 우선순위 판단을 반영해 정합화해야 하기 때문이다.
- 이후 안정된 monolithic authority를 기준으로 split을 검토한다.

**현재 판단:**

- README 생성은 defer한다.
- 우선순위는 `docs/specs/AGENTS.md`와 `docs/architecture/AGENTS.md`의 folder-level 규칙 정립, root `AGENTS.md`/`documentation-system.md` 등 상위 계약과의 정합성 확인, monolithic spec/architecture 최신화, roadmap/release 정합화, 그 이후 split 검토 순서가 안전하다.

## 2026-06-17 · Work Items 재정렬 — AGENTS와 monolithic 최신화 우선

@user 요청: 현재 작업들을 최신 의견에 맞게 업데이트.

**변경한 작업 구조:**

- W1은 기존 owner 문서 정제 umbrella로 유지하되 현재 재개 지점에서 내렸다. W1-4 roadmap, W1-5 distribution, W1-6 documentation-system 정합성은 아직 남아 있다.
- W5를 새 현재 재개 지점으로 추가했다. 범위는 `docs/specs/AGENTS.md`, `docs/architecture/AGENTS.md` 작성과 root `AGENTS.md`/`documentation-system.md` 등 상위 계약 정합성 확인이다.
- W6을 추가했다. 범위는 split 전 `aiox-a2a.md`와 `local-agent-runtime.md`를 monolithic authority로 최신화하는 것이다.
- W7을 추가했다. 범위는 `docs/product/roadmap.md`와 `plans/release-plan.md`를 사용자의 배포 우선순위 기준으로 정합화하는 것이다.
- W8을 추가했다. 범위는 monolithic 최신화 후 split 설계를 검토하고 그때 README 필요성을 재판단하는 것이다.
- W3 guide/workflow 반영 후보는 하위 AGENTS와 monolithic 최신화 이후 재검토하는 것으로 미뤘다.

**현재 next pointer:** W5.

## 2026-06-17 · Work Items 혼동 지점 정리

@user 요청: 새 agent가 현재 work를 헷갈릴 수 있는 지점을 정리.

**정리한 내용:**

- W1은 완료 처리했다. 남아 있던 W1-4 roadmap, W1-5 distribution, W1-6 documentation-system 정합성은 각각 W7 또는 W5-3으로 흡수했다.
- W5가 유일한 현재 재개 지점이라는 점을 유지했다.
- W3는 지금 수행하지 않고 하위 AGENTS와 monolithic 최신화 이후 재검토한다고 Work Items에 명시했다.
- W8에는 README를 지금 생성하지 않고 split 시점에 필요성을 재판단한다고 명시했다.

**의도:**

- 새 agent가 open W1을 보고 W5보다 먼저 수행해야 한다고 오해하지 않게 한다.
- `documentation-system.md` 정합성 확인이 W1-6과 W5-3에 중복되어 보이던 문제를 W5-3으로 합쳤다.
- README 생성 보류 결론을 최신 기록뿐 아니라 Work Items 표면에서도 읽히게 했다.

## 2026-06-17 · W5-1, W5-2 완료

`docs/specs/AGENTS.md`와 `docs/architecture/AGENTS.md` 파일 작성을 완료했다.
- specs: 외부 컨트랙트 중심 작성, 상태(Normative, Current, Committed target, Exploratory, Open/deferred) 표기, 호환 앵커(Section Stub) 방식, 범위 초과 방지 원칙 명시.
- architecture: 내부 구조/책임/플로우 중심 작성, spec contract 복사 금지, drift 처리 원칙(intended owner와 충돌 시 판정) 명시.

다음: W5-3 상위 계약 정합성 확인

## 2026-06-17 · W2 상태 정리와 closeout 순서 명시

@user 의견: W2는 독립 탐색 작업으로 완료 처리하지 않고, split 또는 monolithic 최신화 때 확인하는 방식으로 변경.

**정리한 내용:**

- W2를 `Transferred:`로 닫고 W6/W8에 적용할 확인 방식으로 이동했다. W2의 질문 중심 owner 왕복은 별도 완료 판정 대상이 아니라 `aiox-a2a.md`/`local-agent-runtime.md` 최신화와 split 설계 중 적용할 절차다.
- W1-4/W1-5/W1-6의 `Absorbed into` 표현을 `Transferred:`로 바꿨다. `[x]`가 단순 완료가 아니라 다른 Work Item이 이어받는다는 점을 명확히 했다.
- W4는 W5-W8 완료 후 수행하는 final closeout이라고 명시했다.

**현재 next pointer:** W5-3 상위 계약 정합성 확인.

## 2026-06-17 · W5-3 완료 — 상위 계약 정합성 확인 및 root AGENTS.md 갱신

Gemini W5-3 보고서 검토 후 수정 적용.

**확인한 사실:**

- `docs/architecture/documentation-system.md` line 11-12: "AGENTS.md는 해당 scope에서 agent가 따라야 하는 작업 범위와 행동 규칙을 소유한다"로 이미 일반화돼 있음.
- 같은 문서 line 87 Scoped Authority 표: `agent 작업 범위와 행동 규칙 → 해당 scope의 AGENTS.md`로 이미 정의됨.
- root `AGENTS.md` References 섹션에 `plans/AGENTS.md`, `logs/AGENTS.md`는 이미 있었으나 `docs/specs/AGENTS.md`, `docs/architecture/AGENTS.md`는 없었음.

**수정 내용:**

- `documentation-system.md`: 수정 불필요 — 일반화된 규칙이 이미 충분함.
- root `AGENTS.md` References 섹션에 2줄 추가:
  - `명세(Spec) 작성, 상태 표기, 분할 규칙: docs/specs/AGENTS.md`
  - `내부 구조(Architecture) 작성, drift 판정 원칙: docs/architecture/AGENTS.md`

**결론:**

- W5 전체 완료 (W5-1 specs AGENTS.md 작성, W5-2 architecture AGENTS.md 작성, W5-3 상위 계약 정합성 확인).
- 상위 계약 정합성 달성: root AGENTS.md에서 새 하위 AGENTS 경로를 참조하고, documentation-system.md는 일반 규칙으로 커버됨.

다음: W6 — `aiox-a2a.md`와 `local-agent-runtime.md` monolithic 최신화 (W6-1 Step 15 drift 반영부터 시작).

## 2026-06-17 · Decision 문서화 선행으로 작업 순서 변경

@user 의견: `local-agent-runtime.md` 정합과 spec 분리 과정에서 history에 남은 결정성 rationale은 `docs/decisions/`로 승격해야 할 수 있으므로, 먼저 decision 작성 기준과 repo-level 계약을 정리한 뒤 architecture/spec 정합과 split을 진행한다.

**변경한 순서:**

- W6를 새 현재 재개 지점으로 재정의했다. 범위는 history/legacy 자료에서 decision으로 승격할 기준과 후보 확인, 필요한 decision 문서 작성, root `AGENTS.md`와 `docs/architecture/documentation-system.md` 갱신 필요성 확인이다.
- 기존 W6 monolithic 최신화는 W7/W8로 분리했다.
  - W7: `local-agent-runtime.md` monolithic architecture 최신화.
  - W8: `aiox-a2a.md` monolithic spec 최신화.
- roadmap/release 정합화는 W9로 이동했다.
- split 설계는 W10으로 이동했고, split 중 decision-worthy rationale이 나오면 W6 기준에 따라 `docs/decisions/`로 승격한다고 명시했다.
- W2의 질문 중심 owner 왕복 방식 적용 target을 새 번호(W7/W8/W10)에 맞춰 갱신했다.

**현재 next pointer:** W6 — decision 문서화 선행 기준과 repo-level 계약 갱신.

## 2026-06-17 · W6 decision 기준 작업 child 로그 분리

@user 요청: Claude에게 W6 작업을 지시할 프롬프트를 준비하고, 길어진 W4.5 로그에서 W6 이후 작업을 별도 로그로 분리.

**처리:**

- 새 child 로그 생성: `logs/2026-06-17-workspace-reset-W4.5-decision-문서화-기준.md`
- W4.5의 W6 세부 작업을 child 로그 Work Items로 이관했다.
- W4.5 W6는 child 로그 완료 후 결과를 소비하고 W7로 복귀하는 대기 항목으로 변경했다.
- child 로그 첫 블록에는 Claude 작업 입력을 포함했다.

**현재 next pointer:** W6 child 로그 완료.

## 2026-06-18 · W7-W10을 primary entry point package로 재정의

@user 판단: W7=architecture, W8=spec, W9=roadmap처럼 딱딱히 분리하면 실제 작업 흐름과 맞지 않는다. `local-agent-runtime.md` 정합 중 spec, roadmap, release-plan, decision 변경이 같이 필요할 수 있으므로 각 W는 “그 문서만 수정”이 아니라 primary entry point를 가진 authority assimilation package로 봐야 한다.

**정리한 내용:**

- W7은 `local-agent-runtime.md` primary entry point의 local runtime authority assimilation package로 재정의했다.
- W8은 `aiox-a2a.md` primary entry point의 A2A spec authority assimilation package로 재정의했다.
- W9는 roadmap/release primary entry point package로 재정의했다.
- W10은 split readiness and map package로 재정의했다.
- 각 package는 작업 중 관련 owner 변경이 필요하면 같은 package log에 Evidence Ledger, Decision Candidates, Cross-Owner Effects를 남기고 반영할 수 있다.
- root `AGENTS.md`에는 W7/W8/W9 같은 세부 순서를 넣지 않고, onramp와 log next pointer가 실행 순서를 소유한다는 원칙을 유지한다.

## 2026-06-18 · W6 child log 완료 — decision 기준 및 assimilation 로그 형식 확정

child log `logs/2026-06-17-workspace-reset-W4.5-decision-문서화-기준.md` W1~W4 완료.

**확정된 결과 (child log에서 소비):**

- `docs/decisions/AGENTS.md` 작성 완료 — decision-worthy 기준, 7-섹션 템플릿(Context/Decision/Alternatives/Rationale/Trade-offs/Re-evaluation/Sources), history 원본 처리 순서.
- root `AGENTS.md`에 `docs/decisions/AGENTS.md` References 반영.
- `docs/architecture/documentation-system.md` Decisions 섹션에 `docs/decisions/AGENTS.md` 포인터 추가.
- root `AGENTS.md`에 `## Workspace Reset` 섹션 추가 — 임시 scope 선언, 실행 순서 ownership, 검증 ledger 요건.
- `logs/AGENTS.md`에 `## Workspace Reset Log Sections` 템플릿 추가 — Scope / Evidence Ledger / Decision Candidates / Cross-Owner Effects / Closeout.

**현재 next pointer:** W7 — local runtime authority assimilation package.

## 2026-06-18 · package workflow portable 후보 수집 방식 합의

@user: W7/W8/W9/W10에서 package workflow를 실제로 써보며 시행착오를 보완하고, 그 내용을
로그로 남긴 뒤 portable log skill 후보로 만들면 좋겠다고 제안. 다만 agent가 본 작업을
진행하면서 동시에 시행착오를 인지하고 기록해야 한다는 점을 우려.

**합의한 운영 방식:**

- package workflow 자체를 즉시 portable log skill로 옮기지 않는다. 현재 규칙은 workspace
  reset, owner 문서, `history/`·`plan/`·`plans/`·`prd/` assimilation 등 repo 전용 요소가
  강하므로 먼저 W7~W10에서 실전 검증한다.
- 각 package closeout 때 본 작업 결과뿐 아니라 workflow 시행착오를 함께 남긴다.
  예: batch 분할이 맞았는지, task brief가 너무 넓거나 좁았는지, Evidence Ledger가
  pass/fail 검증에 충분했는지, agent 의견 수렴이 실제로 도움이 됐는지, Scope 밖 owner가
  자주 필요했는지.
- 시행착오는 repo 전용 판단과 portable pattern으로 분리한다.
  - repo 전용: docs/specs/architecture/product taxonomy, workspace reset, W7/W8/W9/W10,
    `history/`·`plan/`·`plans/`·`prd/` owner 처리.
  - portable 후보: primary artifact, allowed cross-artifact updates, batch task brief,
    evidence ledger, agent/reviewer 의견 수렴 Work Item, closeout map.
- 이 흐름을 잊지 않도록 Work Item W11과 child log
  `logs/2026-06-18-package-workflow-portable-pattern.md`를 추가했다. W11은 W7~W10
  package들이 끝난 뒤 package workflow 시행착오를 모아 portable log skill로 승격할지
  판단한다.

**현재 next pointer 변경 없음:** W7 child log 진행을 유지한다.

## 2026-06-19 · W7 pointer 소비와 W5 sync 정합화

이번 기록은 history 파일 판정/삭제/이관을 수행하지 않고, parent/W5 상태와 이 W4.5 child
로그의 Work Items 표현만 정합화한다.

**확인한 사실:**

- `scripts/onramp` 출력은 현재 작업 로그를 parent
  `logs/2026-06-16-workspace-reset-폴더별-inventory.md`로, next pointer를 W5
  history/migration으로 표시했다.
- parent 최신 블록 `2026-06-19 · W7 완료 및 parent 복귀`는 W7 child 로그와
  `logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md`가 완료되어 parent에
  반영됐고 W5로 복귀했다고 기록한다.
- W7 package log frontmatter는 `status: decided`이며 Work Items W1~W8이 모두 `[x]`다.
- W5 child package log `logs/2026-06-19-workspace-reset-W5-history-migration.md`는
  `B1 Inventory & Seed Mapping`을 active item으로 둔다.
- 이 로그는 기존 Work Items에서 W7을 `[>]` active로 남겨 parent의 W5 복귀 기록과
  어긋나 있었다.

**판단/추론:**

- W7은 이 로그에서 더 이상 actionable하지 않으므로 완료로 소비한다.
- W8/W10은 여전히 살아 있지만, W5가 만들 `history/` source map과 disposition 제약을
  입력으로 받아야 한다. 따라서 지금 이 로그의 active next pointer로 두면 parent W5
  진행과 충돌할 수 있다.
- W9는 roadmap/release package로 살아 있으나, W8/W10처럼 history evidence를 직접 요구한다는
  사실은 이번 확인 범위에서 새로 검증하지 않았다.
- W11은 W7 closeout 결과를 이미 입력 하나로 갖지만, W8~W10 package closeout 후에 수행해야
  하므로 현재 active가 아니다.

**수정한 Work Items:**

- W7과 W7-1~W7-3을 완료 처리했다.
- W8에 "W5 history migration의 B1 source map과 history disposition 제약을 입력으로 받은 뒤
  착수" 조건을 명시했다.
- W10에 "W5 history migration의 source map을 history/legacy rationale 입력으로 사용" 조건을
  명시했다.
- W11에 "W7 closeout은 완료됐고 W8~W10 package closeout이 남은 뒤 수행" 조건을 명시했다.
- W4 Final closeout은 W8~W11 완료 뒤 parent W4.5 해소로 정리했다.
- 이 로그의 Work Items에는 현재 `[>]` active pointer를 남기지 않았다. 현재 active 작업은
  parent W5와 W5 child package log가 소유한다.

**Evidence Ledger**

| Topic | Source | Lines | Finding | Owner impact | Action |
| ----- | ------ | ----- | ------- | ------------ | ------ |
| Current onramp | `scripts/onramp` output | N/A | [Fact] 현재 작업은 parent inventory log의 W5 history/migration으로 표시됨 | W4.5가 active pointer로 current를 가로채지 않아야 함 | W4.5 active pointer 제거 |
| W7 parent return | `logs/2026-06-16-workspace-reset-폴더별-inventory.md` | latest block | [Fact] W7 child log와 W7 local runtime package 완료 및 parent 반영 후 W5 복귀가 기록됨 | W7은 W4.5에서 소비 완료 가능 | W7 Work Item 완료 처리 |
| W7 package status | `logs/2026-06-18-workspace-reset-W7-local-runtime-assimilation.md` | frontmatter, Work Items | [Fact] `status: decided`, W1~W8 모두 완료 | W7 package 재개 불필요 | W7 결과를 W4.5에 소비 |
| W5 package status | `logs/2026-06-19-workspace-reset-W5-history-migration.md` | Work Items, Handoff | [Fact] B1 Inventory & Seed Mapping이 active | W8/W10 history evidence 입력은 W5 B1 source map 이후에 안정화됨 | W8/W10 조건을 명시 |

### Closeout

- Updated owner documents: 없음. 로그 상태와 Work Items만 수정했다.
- Validation result: `scripts/onramp`, log check 출력, parent/W7/W5 로그 본문을 대조했다.
- Remaining gaps: W8/W10은 W5 source map과 consumer-safe history disposition 제약을 입력으로
  받아야 한다. W9 roadmap/release package와 W11 portable 후보 수집은 아직 수행 전이다.
- Workflow retrospective: package log 간 parent/child 복귀가 끝난 뒤 source log의 active
  pointer 소비가 지연되면 onramp 후보가 흐려질 수 있다. child closeout 때 parent 반영과
  source child Work Items 소비를 같은 closeout checklist로 묶을 필요가 있다.
- Next owner/log: 현재 active 작업은
  `logs/2026-06-19-workspace-reset-W5-history-migration.md`의 B1 Inventory & Seed Mapping이다.

## 2026-06-19 · W8 input 보강 — runtime profile override contract spec gap

@user 지적에 따라 W5 B2에서 확인한 spec gap을 W8 입력에도 반영했다. W8은 아직 별도 package
log가 없으므로, 현재 W8을 소유하는 이 W4.5 child log의 Work Item과 Evidence Ledger에 기록한다.

**확인한 사실:**
- `docs/specs/aiox-a2a.md`는 profile namespace와 transport-neutral 원칙을 언급한다:
  `docs/specs/aiox-a2a.md:577-582`, `590-605`.
- `docs/specs/aiox-a2a.md`에는 `AIOX_SOCKET_PATH`/`AIOX_DB_PATH`가 absolute path override여야
  하고 relative path는 fail-fast configuration error라는 contract가 없다.
- 해당 contract는 현재 `README.md:65-67`과 `src/config/paths.ts:65-75,88-96,104-116`에
  존재한다.
- `docs/architecture/local-agent-runtime.md:219-220`은 `$AIOX_SOCKET_PATH` path resolution만
  언급하고 absolute override rule은 소유하지 않는다.

**판단:**
- 이 gap은 W5 B2 decision 승격 blocker가 아니지만, 외부 env/config contract라서 W8
  `docs/specs/aiox-a2a.md` authority assimilation package에서 흡수 여부를 판단해야 한다.
- W8 Work Item에 이 spec gap을 명시적으로 추가했다. 현재 active pointer는 여전히 parent W5와
  W5 package log가 소유하므로 W8을 active로 바꾸지 않았다.

**Evidence Ledger**

| Topic | Source | Lines | Finding | Owner impact | Action |
| ----- | ------ | ----- | ------- | ------------ | ------ |
| Runtime profile override contract spec gap | `docs/specs/aiox-a2a.md`, `README.md`, `src/config/paths.ts`, `docs/architecture/local-agent-runtime.md` | specs `577-582`, `590-605`; README `65-67`; paths `65-75`, `88-96`, `104-116`; architecture `219-220` | [Fact] profile namespace는 spec에 있으나 `AIOX_SOCKET_PATH`/`AIOX_DB_PATH` absolute override 및 relative fail-fast contract는 spec에 없음. README/code에는 있고 architecture에는 socket path resolution만 있음. | W8 `docs/specs/aiox-a2a.md` assimilation input | W8 package/task brief 작성 시 spec owner에 흡수할지 판단 |

## 2026-06-20 · W11 sync correction — portable workflow collection is continuous

사용자 정정: W11 portable workflow 후보 수집은 W8~W10이 모두 끝난 뒤 처음 시작하는 작업이
아니라, W7~W10 각 package를 진행하면서 closeout 때마다 계속 누적하는 base 작업이다.

**수정한 Work Items:**

- W11 문구를 "W7~W10 진행 중 계속 수집"으로 정정했다.
- W11의 최종 단계는 W8~W10 closeout 뒤 repo 전용/portable 분리와 log skill 승격 여부 판단으로
  남겼다.

**판단:**

- `logs/2026-06-18-package-workflow-portable-pattern.md`의 active W1은 현재 수집용 active
  pointer로 유지해도 parent W5 진행과 충돌하지 않는다. 해당 로그의 parent W4.5 W11은
  최종 소비/정리 위치이고, 매 package closeout에서 누적 기록하는 것은 의도된 운영 방식이다.

## 2026-06-20 · W8 fallback 및 재시작 포인터 복구

사용자 지시에 따라 이전 W8 실행 산출물을 폐기하고 W8을 다시 시작할 수 있는 지점으로
되돌렸다.

**확인한 사실**

- `prd/post-mvp/aiox-a2a-spec.md`, `plans/post-mvp.plan.md`, `plans/post-mvp/` 하위
  sub-plan, `history/58-post-mvp-a2a-architecture-decisions.history.md`는 W8 source input으로
  다시 살아 있어야 한다.
- W8 재시작 시 `logs/2026-06-19-workspace-reset-W5-history-migration.md`의 delete guard,
  owner/archive self-sufficiency, physical deletion gate 기준을 먼저 적용해야 한다.
- 이전 W8 child log/task/decision/archive 산출물은 신뢰 가능한 closeout으로 취급하지 않는다.

**수정한 Work Items**

- W8을 active next pointer로 복구했다.
- W9/W10/W11은 W8 재실행 이후 진행한다.

**다음**

- W8 package log/task brief를 새로 만들 때, `prd/post-mvp/aiox-a2a-spec.md`와
  `plans/post-mvp/` 하위 sub-plan을 owner별 absorption matrix로 먼저 대조한다.
- 원본 삭제는 owner 문서와 archive/evidence successor가 self-contained하다는 검증 후,
  사용자 확인을 받아 별도 physical deletion gate에서만 처리한다.

## 2026-06-21 · W8 package log 생성과 의견 수렴 결과 확정

W8-0 agent 의견 수렴(claude 종합 + @user + @codex)을 마치고 W8 package log를 생성했다.

**처리:**

- 새 child package log 생성: `logs/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`
  (Primary owner = `docs/specs/aiox-a2a.md`, Allowed cross-owner = `docs/decisions/`,
  Cross-Owner Effects only = roadmap/release-plan).
- parent W8을 child package log를 소비하는 pointer로 재배선했다. W8-0은 완료, W8-1~W8-4는
  child package log Work Items로 이관했다.
- child package log의 batch 구조: W2 A0(config/path gap) · W3 A1(§2–§4 protocol) ·
  W4 B(§5 Adapter+§6 Compose) · W5 C(§7–§9) · W6 Sweep(§10–§13 owner 분류) ·
  W7 cite spot-check·본문 반영 · W8 source map disposition append · W9 closeout.

**확정된 W8-0 의견 수렴 결과 (3자 수렴):**

- A0/A1 분리: `AIOX_SOCKET_PATH`/`AIOX_DB_PATH`는 runtime/config contract라 §4 protocol
  검증과 분리(evidence 범위 폭증 방지).
- Falsifiability gate: `Current Contract`는 `src/file:line`(+가능하면 test) cite 없으면
  금지, 없으면 Target/Proposed/Open Issue/Implementation Gap으로 강등.
- Ledger-먼저-본문-나중 6-phase: batch agent는 spec 본문 직접 수정 금지, Evidence Ledger만
  먼저 작성하고 cite spot-check pass 후 별도 단계에서 본문 반영.
- 상태 라벨은 repo 정확한 이름(spec contract 라벨 / legacy=Stale / roadmap=Release Gate·
  Execution Plan), `Post-MVP`는 라벨 아님.
- §13 decision은 선별 승격: spec 본문 변경의 이유가 되는 contract 고정 rationale만 W8에서
  docs/decisions/ 승격, 나머지(architecture debt·DX·product boundary 등)는 W9/W10/
  architecture로 handoff.

**현재 next pointer:** W8 — child package log
`logs/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`의 W1(batch task brief 작성).

## 2026-06-21 · W8 package 소비 확정 — child closeout PASS, W9로 전이

child package log `logs/2026-06-21-workspace-reset-W8-A2A-spec-authority.md`의 W1~W9가
완료됐다. W9 closeout draft(Codex 저작) → Claude checker review 전건 PASS, child status
`decided` 전이. parent W8 `[x]`는 이 review PASS로 정당화된다(이전 선반영을 confirming).

**W8에서 확정된 결과 (parent 소비):**

- spec 본문: W7 cite review로 `docs/specs/aiox-a2a.md` §3.1·§4.2·§4.5·§5·§6·§7·§8·§9·intro
  §10-§13 wording PASS(W7 PASS분은 commit `9434578`). §4.3는 target-framed라 caveat 불필요.
- decision: `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md` 신규 확정
  (§4 lifecycle/envelope/correlation WHY). correlated reply 인가·public `deliveryId` namespace는
  Open 유지.
- source map: `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` canonical 2 row 갱신
  (`prd/post-mvp/aiox-a2a-spec.md`, `docs/aiox/mcp-scope-and-daemon-namespace.md`).
- W10 입력: child closeout에 spec split map과 Legacy/Historical Source Handoff(`history/58`·
  archive·`docs/aiox/*`·`plans/post-mvp*`·`history/59`의 W9/W10/물리삭제게이트 행선지) draft됨.
- portable: W8 closeout 회고 F46~F50을 `logs/2026-06-18-package-workflow-portable-pattern.md`에
  수집(W11 라인). 그 로그 W1-2 완료 판단은 별도.

**현재 next pointer:** W9 — release/roadmap authority assimilation package. primary entry =
`docs/product/roadmap.md`·`plans/release-plan.md`. child closeout의 Legacy/Historical Source
Handoff와 `logs/2026-06-21-workspace-reset-legacy-source-absorption.md` source map을
required-read로 소비하고, `plans/post-mvp*` rows의 disposition/self-sufficiency를 append/update한다.
