---
topic: workspace reset stage8 W6 owner doc retrofit
description: workspace reset stage 8 W6 — 확정된 docs AGENTS 계층 기준으로 product/roadmap/documentation-system 정합 기록을 보존하고 architecture/specs/decisions owner-doc retrofit을 이어간다.
status: decided
---

## Work Items

- [x] W1 product 계열·roadmap·documentation-system drift 정합 — product.md/AGENTS.md, roadmap.md, documentation-system roadmap/history drift 정리
- [x] W2 architecture retrofit — `docs/architecture/local-agent-runtime.md` 인덱스 + slice 9개를 승인된 규칙으로 검토·retrofit. 기존 §N 헤딩·inbound anchor는 migration 아니면 보존
- [x] W3 specs retrofit child 완료 소비 — `logs/workspace-reset/packages/2026-06-28-workspace-reset-stage8-W3-specs-retrofit.md` 완료 뒤 W4 decisions drift child로 진행
- [x] W4 decisions drift child 완료 소비 — `logs/workspace-reset/packages/2026-06-28-workspace-reset-stage8-W4-decisions-drift.md` 완료 뒤 W6 closeout 및 stage8 parent W7 복귀
- [x] W11 W10 반영 5개 owner 문서(decisions/AGENTS · guides/AGENTS · product/AGENTS · product.md · roadmap.md) one-by-one 독립 검토 — 각 문서를 W10 child log 기록 블록 + 상위 docs/AGENTS·sibling 계약과 대조해 독립 판정. 완료 후 W2 architecture retrofit부터 재개

## 2026-06-27 · W6 product owner 문서 정합 + external positioning drift 반영

### Scope

- Primary owner: `docs/product/product.md`
- Allowed cross-owner updates: `docs/product/AGENTS.md`
- Evidence inputs: `docs/AGENTS.md`, `docs/product/AGENTS.md`, `docs/documentation-system.md`, 현행 `product.md`, `aiox-adapter-model.md`, `aiox-compose-contract.md`, `aiox-federation-remote.md`, `roadmap.md`, Google Developers Blog와 Linux Foundation 공식 발표

### Evidence Ledger

| Topic                           | Source                                                                                                   | Lines                                          | Finding                                                                                                                                                                                                                                  | Owner impact         | Action                                                                                                                                                                            |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product authoring boundary      | `docs/product/AGENTS.md`                                                                                 | 19-28, 75-84                                   | [Fact] product는 목적·사용자·scope·원칙을 소유하고 Target claim을 허용하지만, 기존 "target work나 phase는 다른 owner" 문장은 product-level target direction과 실행 target의 경계를 충분히 복원하지 못했다.                               | product guideline    | target direction은 scope·경계에 필요한 방향 문장만 허용하고 contract·내부 설계·phase·task는 각 owner로 보내는 invariant로 교체.                                                   |
| Adapter-based product viability | @user decision + `docs/specs/aiox-adapter-model.md`                                                      | 29-51                                          | [Decision] vendor 협약이나 vendor-native 지원이 없어도 adapter 기반 aiox의 사용성과 제품 가치는 성립한다. Upstream-enabled와 vendor-native는 선택 가능한 발전 경로이며 필수 전제가 아니다.                                               | product principle    | `Adapter-first Adoption`에 actor responsibility axis만 반영하고 기술 연결 방식·tier·degradation은 spec으로 위임.                                                                  |
| Terminal boundary               | `docs/specs/aiox-compose-contract.md`; `docs/product/roadmap.md`                                         | compose 41-60; roadmap 50-58                   | [Fact] terminal auto-layout은 core protocol이 아니며 manual/비자동 fallback과 view-driver 도입 순서는 spec·roadmap이 이미 소유한다.                                                                                                      | product principle    | vendor-native CLI/TUI를 primary surface로 유지하고 aiox-owned terminal emulator로 대체하지 않는 제품 경계만 반영.                                                                 |
| Compose/federation direction    | `docs/specs/aiox-compose-contract.md`; `docs/specs/aiox-federation-remote.md`; `docs/product/roadmap.md` | compose 5-13; federation 5-25; roadmap 121-141 | [Fact] compose는 Committed target이고 remote/federation은 Deferred/Target이며 roadmap Phase 2/3이 순서를 소유한다.                                                                                                                       | product direction    | product에는 thin Target 방향만 남기고 schema·확장 단계·phase 순서는 각 owner로 위임.                                                                                              |
| A2A external drift              | Google Developers Blog 2025-06-23; Linux Foundation 2026-04-09                                           | external                                       | [Fact] A2A는 Google에서 Linux Foundation으로 이전되어 vendor-neutral governance 아래 있고 2026년에는 production adoption이 보고됐다. [Inference] 기존 "Google의 HTTP remote enterprise 위임" framing은 현재 범위를 과소서술해 stale하다. | external positioning | dated comparison을 제거하고 aiox의 stable primary focus(local-first CLI/TUI runtime/control plane), 비경쟁 positioning, future bridge 관계로 갱신. 공식 출처를 `Sources:`에 연결. |

### Decision Candidates

| Source             | Lines              | Why decision-worthy                                                          | Proposed decision                                                             | Status                                                                         |
| ------------------ | ------------------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| @user confirmation | current discussion | Vendor 지원 부재가 제품 성립을 무효화하는지 product posture 확정이 필요했다. | Adapter 기반 제품은 독립적으로 성립하며 upstream/vendor-native는 선택 경로다. | product owner에 반영 완료; 별도 decision 불필요(문서 자체로 intent 복원 가능). |

### Cross-Owner Effects

| Owner document            | Change                                                                                           | Reason                                                                                            | Verification                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `docs/product/AGENTS.md`  | target direction과 execution target 경계를 좁힌 invariant로 교체                                 | 향후 agent가 product 방향을 전부 제거하거나 spec/roadmap 상세를 product에 복사하는 양쪽 오판 방지 | inline-code check PASS; diff check PASS                       |
| `docs/product/product.md` | Related/Status, Definition/User Value/Scope/Principles/Direction/External Positioning으로 재구성 | 선언↔섹션 drift, current/target 혼재, backtick owner 참조, stale A2A framing을 한 패스로 정합     | inline-code check PASS; wikilink target PASS; diff check PASS |

### Closeout

- Updated owner documents: `docs/product/AGENTS.md`, `docs/product/product.md`
- Validation result:
  - `scripts/check-markdown-inline-code docs/product/AGENTS.md docs/product/product.md` → exit 0 (PASS)
  - `git diff --check` → exit 0 (PASS)
  - product wikilink target 6개 존재 확인 → PASS
- Remaining gaps: W6 전체는 계속 active. Product 계열 잔여인 `docs/product/roadmap.md` transitional marker·dated audit provenance와 `docs/documentation-system.md` roadmap/history drift를 후속 owner sweep에서 처리한다.
- Workflow retrospective: @claude 독립 리뷰와 @codex 반박을 대조하면서 기술 연결 방식 축(spec)과 채택 책임 축(product)을 분리했다. 새 portable skill 변경은 필요하지 않다.
- Next owner/log: 이 stage8 로그 W6 유지. 다음은 `roadmap.md`와 `documentation-system.md`의 큐잉된 drift를 실제 문서와 대조한다.

## 2026-06-27 · W6 product authoring owner 문구 명확화

@user가 `docs/product/AGENTS.md`의 "각 owner로 보낸다"는 표현이 실제 이동, 새 문서 작성,
ownership 위임 중 무엇을 뜻하는지 모호하다고 지적했고 반영을 승인했다.

**확인과 반영:**

- [Fact] Product 작성 규칙의 owner 배치는 이미 spec·architecture·roadmap·plans로 확정돼 있었고,
  이번 변경은 그 배치를 바꾸지 않는다.
- 외부 contract와 내부 구조는 각각 관련 spec과 architecture 문서가 소유한다고 명시했다.
- 구체 contract·내부 설계·release phase·실행 task는 각각
  specs·architecture·roadmap·plans가 소유한다고 명시했다.
- 두 규칙 모두 product 문서에는 상세를 복사하지 않고 관련 owner 문서로 링크한다는 작성 행동을
  분리해 적었다.

**검증:**

- `scripts/check-markdown-inline-code docs/product/AGENTS.md` → exit 0 (PASS)
- `git diff --check` → exit 0 (PASS)
- 기존 모호 표현 재검색 → 일치 없음 (PASS)

W6 상태와 next pointer는 변경하지 않는다. 다음 owner sweep은 `roadmap.md`와
`documentation-system.md`다.

## 2026-06-27 · W6 roadmap owner 작업 입력 순서 정정

- @user가 `roadmap.md`는 사용자 초안을 먼저 보고 작업해야 한다고 정정했다.
- [Fact] 현재 workspace에는 별도 `roadmap.md` 초안이나 해당 파일의 미커밋 변경이 없다.
- 따라서 기존 `roadmap.md`를 바로 수정하지 않고, @user 초안을 받은 뒤 현행 owner 경계·내용 보존·stale/provenance 후보와 대조해 검토·합성한다.

W6와 next pointer는 유지한다. 다음 행동은 @user의 `roadmap.md` 초안 제공을 기다린다.

## 2026-06-27 · W6 roadmap owner 초안 제안

@user가 agent가 `roadmap.md` 초안을 먼저 제시하도록 정정했다. @codex는 현행 roadmap·
`docs/product/AGENTS.md`·`docs/AGENTS.md`·`docs/documentation-system.md`·W9 release roadmap 로그를 대조해
아래 초안 범위를 제안했다. 아직 owner 파일에 반영하지 않았다.

- 문서 상단에 `Related:`(`product.md`, `aiox-a2a.md`, `release-plan.md`) 및 `Status: Current` 추가.
- "Roadmap의 제품 계약"을 "현재 승인된 공개 순서"로 바꿔 roadmap이 product/spec contract를 소유하는 듯한
  owner 혼동을 줄임.
- `Current Execution Candidates`에 transitional mapping callout을 추가하고, successor plan 생성·repoint·폐기는
  `plans/workspace-reset/workspace-reset.md`가 소유함을 링크. 현재 sub-plan 경로는 repo-path wikilink로 전환.
- `Google A2A bridge`는 현행 product owner의 external positioning과 맞춰 중립적인 `A2A Protocol bridge`로
  바꾸는 후보. `docs/specs/aiox-federation-remote.md`에도 같은 기존 표현이 남아 별도 cross-owner drift 점검 필요.
- `Pre-Release Gap Summary`의 stale "W5 candidates" 문구를 제거하고, 상세 audit는 roadmap에 복사하지 않는다는
  경계와 검증 provenance `Sources:`로 `logs/workspace-reset/packages/2026-06-21-workspace-reset-W9-release-roadmap-authority.md`를 연결.

제안은 local roadmap 수정과 cross-owner spec drift 후속을 분리한다. 다음 행동은 @user가 초안을 리뷰한 뒤
승인·정정·거부 범위만 owner 파일에 반영하는 것이다.

## 2026-06-27 · W6 roadmap 초안 owner 경계 재검토

@user가 후속 논의에서 상태 신호(roadmap 독자용)와 실행 지시(plan stage 9 작업자용)를
분리한 owner 경계와 @claude 이의 2건을 제공했다. @codex가 현행 파일과 대조한 판정은 다음과 같다.

- [Fact] `plans/workspace-reset/workspace-reset.md:46`이 successor plan 생성 후 roadmap repoint →
  `plans/post-mvp*` 삭제 → absorption log disposition 확정을 이미 실행 순서로 소유한다.
- [Fact] 현재 `Current Execution Candidates` 4개 plan은 stage 9의 물리 삭제 대상이고, stage 7 W3는 docs
  wikilink broken 0을 PASS했다.
- [Judgment] @claude 이의 1·2에 동의. Roadmap marker에 stage 9의 실행 순서·owner pointer를 복사하지
  않고 순수 상태 신호로 축소한다. 삭제 예정 plan 4개는 새 wikilink를 만들지 않고 backtick path를 유지한다.
- 수정 marker 제안: "아래 표는 기존 실행 plan과 release gate 사이의 임시 mapping이다. 장기 roadmap
  구조나 실행 상태의 권위로 해석하지 않는다." 실행 조치·소유 포인터는 포함하지 않는다.
- [Judgment] `Related:`는 `[[docs/product/product]]`만 문서 전체의 load-bearing scope owner로 유지하는 안이
  가장 엄격하다. `aiox-a2a`는 문서 전체 neighbor로 입증되지 않으므로 `Related:`에서 제외하고,
  contract dependency가 필요한 G0/G1 문맥에서만 국소 body link로 두는 대안이 맞다.
- [Judgment] `release-plan`은 G6의 국소 실행 checklist이므로 document-level `Related:`가 아니라 현행
  도입부 body reference면 충분하다. 삭제 예정은 아니므로 body wikilink는 가능하지만 `Related:` 승격 근거는 없다.
- [Judgment] "Roadmap의 제품 계약"은 transitional marker와 개념적으로 독립된 owner-altitude drift다.
  그러나 W6가 같은 owner 문서의 drift를 한 패스로 정리하는 단계이므로 같은 patch에서 "현재 승인된
  추진 순서"로 정정하되, marker 승인과 묶지 않는다.

아직 `roadmap.md`에 반영하지 않았다. 다음 행동은 @user가 재정리된 초안 범위를 승인하거나 추가 정정하는 것이다.

## 2026-06-27 · W6 roadmap owner 정합 적용 — transitional marker + Related/Status + 추진순서 + A2A 명칭

직전 블록(@codex owner 경계 재검토)의 합의안을 @user 승인(marker = 미니멀 상태신호안)으로 `docs/product/roadmap.md`에
반영했다. 상태신호(roadmap owner)와 실행지시(plan stage 9 owner) 분리는 직전 블록이 owner이며 여기 재서술하지 않는다.

### Scope

- Primary owner: `docs/product/roadmap.md`
- Allowed cross-owner updates: 없음 (spec `aiox-federation-remote.md`의 "Google A2A" 잔존은 이번 scope 밖, 별도 확인)
- Evidence inputs: `docs/product/AGENTS.md`, `docs/AGENTS.md`, `docs/product/product.md`,
  `plans/workspace-reset/workspace-reset.md:46`(stage 9), `logs/workspace-reset/packages/2026-06-21-workspace-reset-W9-release-roadmap-authority.md`(존재만 확인)

### Evidence Ledger

| Topic                     | Source                                                                                                | Lines                             | Finding                                                                                                                                           | Owner impact | Action                                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transitional marker       | `roadmap.md`; `plans/workspace-reset/workspace-reset.md:46`; `product/AGENTS.md` Roadmap Change Rules | roadmap 143-145                   | [Fact] Current Execution Candidates는 stage 9에서 repoint·삭제될 transitional 매핑인데 본문에 상태 신호가 없었다. 실행지시는 plan:46이 이미 소유. | roadmap      | 미니멀 callout marker 부착(상태 신호만), 실행지시·소유 포인터 미포함.                                                                                          |
| 삭제 예정 plan wikilink   | `plans/post-mvp/*.plan.md`(4개); stage7 W3 broken-0 검증                                              | roadmap 147-152                   | [Fact] 4개 plan은 stage 9 물리 삭제 대상. wikilink化 시 삭제 후 Obsidian broken link 발생(W3 broken 0 미래 훼손).                                 | roadmap      | 표 링크 backtick path 유지(wikilink化 거부).                                                                                                                   |
| A2A external naming drift | `roadmap.md` vs `product.md`                                                                          | roadmap 128,140 vs product 93-101 | [Fact] product.md가 "Google A2A" 소유격 framing 폐기(Agent2Agent Protocol/Linux Foundation A2A). roadmap 잔존 = owner 불일치 drift.               | roadmap      | "Google A2A bridge/bridging" → "A2A Protocol bridge/bridging".                                                                                                 |
| roadmap owner 표현        | `roadmap.md`                                                                                          | 7                                 | [Fact] "제품 계약"은 roadmap을 contract owner로 오해시킨다. roadmap은 우선순위·순서 owner.                                                        | roadmap      | "제품 계약은" → "현재 승인된 추진 순서는"(공개 후 phase까지 포괄).                                                                                             |
| Related/Status            | `docs/AGENTS.md` Document Structure; sibling `product.md`                                             | roadmap 1-9                       | [Fact] sibling product.md는 Related/Status 보유, roadmap 미보유.                                                                                  | roadmap      | Related=`[[docs/product/product]]` 하나(load-bearing) + Status: Current. aiox-a2a(본문 직접 의존 없음·broad-link)·release-plan(plans·본문 참조로 충분)은 제외. |

### Cross-Owner Effects

| Owner document            | Change                                                                                                  | Reason                                                                                    | Verification                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `docs/product/roadmap.md` | Related/Status 추가, "제품 계약"→"추진 순서", transitional callout marker, Google A2A→A2A Protocol(2곳) | owner 경계 명료화 + product.md external positioning과 drift 정합 + transitional 상태 신호 | inline-code exit 0; `git diff --check` exit 0; `[[docs/product/product]]` target EXISTS; "Google A2A" 0건 |

### Closeout

- Updated owner documents: `docs/product/roadmap.md`
- Validation result: `scripts/check-markdown-inline-code docs/product/roadmap.md` exit 0 · `git diff --check` exit 0 ·
  `[[docs/product/product]]` 존재 · "Google A2A" 재검색 0건 · 표 4개 plan 링크 backtick 유지(diff 확인).
- Remaining gaps (W6 계속 active):
  1. `Pre-Release Gap Summary` Sources — 현재 `:211` "W5 candidates" 문구 ↔ @codex 제안 W9 로그가 불일치. W9 로그를 열어 dated audit 원본/검증인지 확인한 뒤에만 `Sources:` 연결(추측 경로 금지). 미적용.
  2. `docs/specs/aiox-federation-remote.md:49` "Google A2A bridge" — spec cross-owner라 product scope 밖. 별도 확인 후 처리.
  3. `docs/documentation-system.md` roadmap 이중서술(K-Owners↔Scoped-Authority)·`## History` 미래형 drift.
- Workflow retrospective: @codex 초안을 무조건 수용하지 않고 owner 경계 충돌 2건을 `file:line` 근거로 이의 제기 →
  @codex 합의로 수렴. 균형 질의(결론 강요 없이 반박 여지 제시)가 효과적이었다.
- Next owner/log: 이 stage8 W6 유지. 다음 = `Pre-Release Gap Summary` Sources(W9 로그 locate·검증) → `documentation-system.md` drift.

## 2026-06-27 · W6 roadmap 적용본 리뷰 + spec·plan cross-owner 정합

### Scope

- Primary review: `docs/product/roadmap.md` Claude 적용본
- Allowed cross-owner updates(@user 승인): `docs/specs/aiox-federation-remote.md`,
  `plans/workspace-reset/workspace-reset.md`
- Evidence inputs: `docs/AGENTS.md`, `docs/product/AGENTS.md`, `docs/specs/AGENTS.md`, `plans/AGENTS.md`,
  stage 7 W3 broken-link ledger, 직전 roadmap 적용 로그

### Evidence Ledger

| Topic                   | Source                                                                     | Lines                                                                               | Finding                                                                                                                                                                           | Owner impact | Action                                                                                               |
| ----------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------- |
| Claude roadmap 적용본   | `docs/product/roadmap.md`; `docs/product/AGENTS.md`                        | roadmap 1-19, 133-160                                                               | [Fact] Related=`product` 1개, Status=Current, 추진 순서 owner 문구, 중립 A2A 명칭, 순수 상태 marker, plan backtick 유지가 합의와 일치한다.                                        | roadmap      | blocking issue 없음. callout의 중복 영문 title과 `권위` 표현만 가독성 보정.                          |
| Spec A2A naming drift   | `docs/specs/aiox-federation-remote.md`; `docs/product/product.md`; roadmap | spec 45-50; product 93-101; roadmap 133-146                                         | [Fact] spec의 `Google A2A bridge`가 product owner와 roadmap의 중립 `A2A Protocol` framing과 어긋난다. 이는 외부 contract 변경이 아니라 외부 integration 대상의 명칭·분류 drift다. | spec         | `외부 vendor 또는 A2A Protocol bridge`로 중립화하고 의존 대상을 `외부 integration surface`로 정확화. |
| Stage 9 roadmap pointer | `plans/workspace-reset/workspace-reset.md`                                 | 46                                                                                  | [Fact] 기존 `roadmap.md 147-152`는 roadmap 상단 삽입으로 이미 stale해졌고 향후 편집에도 취약하다.                                                                                 | plan stage 9 | 줄 범위를 `Current Execution Candidates` 표의 sub-plan 링크라는 stable semantic pointer로 교체.      |
| 직전 ledger line 좌표   | 직전 로그 블록; 현행 roadmap                                               | previous `roadmap 143-145`, `147-152`, `128,140`; current 151-153, 155-160, 134/146 | [Fact] 직전 적용 ledger가 상단 6줄 삽입 전 좌표를 남겨 현재 line과 어긋난다. 내용 판정은 유효하지만 검증 좌표는 정정이 필요하다.                                                  | task log     | 이 후속 ledger에 현재 line을 기록하고 이전 블록을 역사로 보존.                                       |

### Cross-Owner Effects

| Owner document                             | Change                                                                                                 | Reason                                                      | Verification                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------- |
| `docs/product/roadmap.md`                  | callout title에서 `(transitional)` 제거; `실행 진행 상태의 기준`으로 표현 정제                         | 한국어 title 통일 + 일반 독자가 이해하는 상태 신호          | inline-code PASS; diff check PASS         |
| `docs/specs/aiox-federation-remote.md`     | `Google A2A bridge` → `A2A Protocol bridge`; vendor-only 의존 표현을 외부 integration surface로 일반화 | product·roadmap external positioning과 spec 명칭 drift 해소 | inline-code PASS; 세 파일 Google A2A 0건  |
| `plans/workspace-reset/workspace-reset.md` | `147-152` 줄 포인터를 `Current Execution Candidates` 표 포인터로 교체                                  | stage 9 편집 뒤에도 roadmap repoint 대상 복원               | inline-code PASS; onramp active path PASS |

### Closeout

- Updated: `docs/product/roadmap.md`, `docs/specs/aiox-federation-remote.md`,
  `plans/workspace-reset/workspace-reset.md`
- Validation:
  - `scripts/check-markdown-inline-code` three files → PASS
  - `git diff --check` → PASS
  - stale 문구(`Google A2A`, `147-152`, `임시 매핑(transitional)`, `실행 상태의 권위`) 재검색 → 0건
  - `scripts/onramp` → stage 8 active path·W6 next pointer 유지(PASS)
- Resolved: 직전 roadmap closeout의 cross-owner gap 2(spec naming drift).
- Remaining: `Pre-Release Gap Summary` Sources 검증·반영, `docs/documentation-system.md` drift.
- W6 active/next pointer는 유지한다.

## 2026-06-27 · W6 Pre-Release Gap provenance 계보 진단

@user가 roadmap의 "W5 evidence/decision/log candidates"와 W9 로그 `Sources:` 제안의 관계를 질문했다.
이 블록은 계보 진단만 기록하며 roadmap은 아직 수정하지 않았다.

- [Fact] dated audit 원본은 현재 존재하는 `prd/post-mvp/aiox-a2a-spec.md` §12
  (`:1030-1064`)이다. 2026-06-11 기준 current gap snapshot·severity·file location·gate mapping을 담는다.
- [Fact] roadmap의 "W5 candidates"는 inventory W4-4/W4-5에서 §12 상세를 후속 evidence/history/decision
  판정으로 이관했던 과도기 라벨이다(`logs/workspace-reset/plan-stages/2026-06-16-workspace-reset-폴더별-inventory.md:24-25`).
- [Fact] `logs/workspace-reset/packages/2026-06-21-workspace-reset-W9-release-roadmap-authority.md`는 audit 원본이 아니라,
  그 로그 안의 W5 Batch L이 원본 §12를 현재 code/spec/roadmap과 대조하고 Claude checker PASS를
  남긴 검증 successor다(`:207-245`, `:500-535`, `:559-564`).
- [Fact] surviving source map은 §12 release pressure가 roadmap에 흡수됐고 별도 archive digest가
  필요 없다고 판정한다(`logs/workspace-reset/packages/2026-06-21-workspace-reset-legacy-source-absorption.md:26`).
- [Judgment] 따라서 W9 로그를 "audit 원본"으로 설명하면 틀리다. Durable roadmap에서는
  삭제 예정 legacy PRD를 새 진입 링크로 올리지 말고, W9를 "dated audit를 현재 구현과
  대조한 검증 provenance"로만 `Sources:`에 연결하는 안이 정확하다.
- [Proposed wording] "Detailed file locations, severity labels and the dated audit snapshot are intentionally
  excluded from this roadmap. The W9 release-roadmap validation reconciled that snapshot against the
  then-current implementation; this roadmap retains only gate/phase pressure." 뒤 `Sources:`에 W9 로그
  path를 backtick으로 둔다.

다음 행동은 @user가 이 provenance 분류·문구를 리뷰한 뒤 roadmap에 반영하는 것이다.

## 2026-06-27 · W6 Pre-Release Gap Sources 반영 + documentation-system History drift 확인

직전 블록(@codex provenance 계보 진단)을 @claude가 독립 검증한 뒤 roadmap에 반영했고, @user가 직접 수행한
`documentation-system.md` History drift 삭제를 git diff로 확인했다.

### Scope

- Primary owner: `docs/product/roadmap.md` (1번 Pre-Release Gap Sources)
- Reviewed (사용자 수행분): `docs/documentation-system.md` (3번 History drift)
- Evidence inputs: `logs/workspace-reset/packages/2026-06-21-workspace-reset-W9-release-roadmap-authority.md:500`,
  `prd/post-mvp/aiox-a2a-spec.md`(존재 확인), `docs/decisions/AGENTS.md`(§5 history 삭제 선례), git diff

### Evidence Ledger

| Topic                      | Source                                  | Lines      | Finding                                                                                                                                                                                                            | Owner impact    | Action                                                                                                                          |
| -------------------------- | --------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| W9 anchor 실재             | `logs/2026-06-21-...-W9-...md`          | 498-500    | [Fact] `:500` = "W5 Batch L Claude checker — PASS" 블록 본문. §11-§13 audit을 `src/`와 대조해 PASS 남긴 검증 successor(원본 아님). @codex 진단과 일치.                                                             | roadmap Sources | W9 로그 `:500`을 `Sources:` backtick으로 연결.                                                                                  |
| legacy 원본 링크 금지      | `prd/post-mvp/aiox-a2a-spec.md`         | 존재(98KB) | [Fact] dated audit 원본은 존재하나 stage 9 삭제 대상. 새 진입 링크 만들면 미래 broken.                                                                                                                             | roadmap         | 원본 미링크. provenance는 W9 검증 로그로만.                                                                                     |
| "W5 candidates" stale      | `roadmap.md`                            | 219(구)    | [Fact] 검증 완료됐는데 "후속 판정 대기 candidate" 서술이 남음.                                                                                                                                                     | roadmap         | 문구 제거 → then-current 검증 provenance + gate/phase pressure만 유지 서술로 교체. W9 jargon은 본문 배제, Sources backtick으로. |
| History drift(사용자 수행) | `docs/documentation-system.md` git diff | —          | [Fact] `## History`의 "history/ 이동은 migration 단계에서 파일별 판정" 미래형 = stage 6 물리삭제 완료로 stale. `### Decisions`의 "history 원본 처리" = decisions/AGENTS §5 삭제와 dead reference. 둘 다 삭제 정합. | taxonomy        | 사용자 삭제 검증 PASS(재작업 없음).                                                                                             |

### Cross-Owner Effects

| Owner document                             | Change                                                                        | Reason                                                            | Verification                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| `docs/product/roadmap.md`                  | Pre-Release Gap Summary 문구 교체 + `Sources:`(W9 로그) 추가                  | stale "W5 candidates" 제거, 검증 provenance 명시                  | inline exit 0; `git diff --check` exit 0; "W5 candidates" 0건 |
| `plans/workspace-reset/workspace-reset.md` | stage 9 pointer "147-152" → "`Current Execution Candidates` 표"(사용자/codex) | 내 Related/marker 추가로 줄번호 이동 → 하드코딩 줄번호 stale 방지 | git diff 확인                                                 |

### Closeout

- Updated owner documents: `docs/product/roadmap.md`
- Validation result: inline-code exit 0 · `git diff --check` exit 0 · "W5 candidates" 0건 · W9 `:500` anchor 실재 확인 · 3번 사용자 변경 정합 PASS.
- 관찰(미해결, @user 결정 대기): 삭제된 `## History`에는 stale migration 문장 외에 "standalone `history` type·`docs/history/`를 두지 않는다"는 현재 유효 규칙도 있었다. 지금은 owner map 부재로 함의되나 명시 문장이 사라짐 → 명시 보존 필요 여부 @user 판단. (되돌리지 않음)
- Remaining gaps (W6 계속 active): `docs/documentation-system.md`의 roadmap 이중서술(Knowledge Owners ↔ Scoped Authority 문구 불일치) drift는 이번 diff에 없어 미해결.
- Workflow retrospective: @codex provenance 진단을 무조건 수용하지 않고 W9 `:500` anchor·legacy 원본 존재를 직접 확인. 코덱스 [Proposed wording]의 정확성(then-current·gate/phase pressure)은 흡수하되 "W9" 본문 jargon은 Sources로 빼는 형태로 조정.
- Next owner/log: 이 stage8 W6 유지. 남은 W6 = `documentation-system.md` roadmap 이중서술 drift. 그 외 stage8 잔여(W7 탐색 흐름 drift 판정)는 W6 종료 후.

## 2026-06-27 · W6 documentation-system roadmap 이중서술 drift 해소 — semantic-type 축 통일(B)

@claude 진단(이중서술 = 폴더 축↔질문 축 불일치, 추천 A=Product 헤딩을 폴더 grouping으로) → @codex 반박(B) →
@claude 검증·B 수용 → 적용. W6의 마지막 명시 drift 큐를 닫는다.

### Evidence Ledger

| Topic                                  | Source                                      | Lines     | Finding                                                                                                                                                                                               | Owner impact | Action                                                                                                                    |
| -------------------------------------- | ------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Knowledge Owners 축                    | `docs/documentation-system.md`              | 16-57(구) | [Fact] `### Specs/Architecture/Decisions/Guides`는 모두 semantic type 헤딩(폴더명과 1:1). `### Product`만 그 아래 roadmap을 종속시켜 — Scoped Authority(`:86,:91`)의 roadmap peer 모델과 형태 불일치. | taxonomy     | @claude A(Product를 폴더 축으로) 철회. roadmap을 `### Roadmap` semantic 헤딩으로 분리(B)해 전 헤딩을 type 축으로 통일.    |
| co-location 보존                       | `docs/product/AGENTS.md` dual sub-kind 결정 | -         | [Fact] product.md·roadmap.md는 같은 `docs/product/` physical scope, 다른 sub-kind. B로 분리해도 이 사실을 잃지 않아야 함.                                                                             | taxonomy     | `### Roadmap` 본문에 "`product.md`와 같은 `docs/product/` physical scope에 있지만 별도 knowledge owner" 한 문장으로 보존. |
| Decisions 문장 어색(History 삭제 잔여) | `docs/documentation-system.md`              | 45-46     | [Fact] @user의 `## History`/decisions-history 삭제 후 "작성 규칙, 승격 기준 원칙은"이 어색하게 남음.                                                                                                  | taxonomy     | "Decision 문서의 작성 규칙과 승격 기준은"으로 정리.                                                                       |

### Cross-Owner Effects

| Owner document                 | Change                                                                                                          | Reason                                                                          | Verification                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `docs/documentation-system.md` | `### Roadmap` semantic 헤딩 신설(roadmap을 `### Product`에서 분리, co-location 문장 보존) + Decisions 문장 정리 | 이중서술 drift 해소 — Knowledge Owners를 Scoped Authority의 peer 모델과 축 통일 | inline-code exit 0; `git diff --check` exit 0; roadmap 잔존 참조 5곳 모두 peer/관계 정합 확인 |

### Closeout

- Updated owner documents: `docs/documentation-system.md`
- Validation result: inline-code exit 0 · `git diff --check` exit 0 · `### Product`/`### Roadmap` 분리 확인 · Scoped Authority(`:87,:92`)·Conflict Resolution(`:110`) peer/관계 정합.
- Workflow retrospective: @claude 추천 A를 @codex가 "Knowledge Owners는 semantic type 축이라 Product만 폴더 축으로 보면 혼합 축 고착"으로 반박 → @claude가 다른 헤딩 4종의 축을 직접 확인하고 B로 전환. agent 간 상호 반박이 더 정합한 모델로 수렴.
- **W6 상태**: 명시 drift 큐(product.md·roadmap.md·documentation-system.md) 모두 해소. architecture/specs slice 본문 retrofit은 별도 @user 다운스트림(W6 scope 아님). **W6 closeout 후보 — Work Items 체크박스 전환은 @user 확인 후.**
- Next owner/log: W6 closeout 시 다음 = **W7 탐색 흐름 drift 판정**(workflow.md·AGENTS 계층의 Obsidian Graph navigation·IDE+Obsidian dual-tool 반영 여부).

## 2026-06-27 · W6 scope 정정 — owner 문서 retrofit 3종이 W6 후속(다음 세션)

@user가 직전 블록의 판정을 정정했다. "W6 closeout 후보 / architecture·specs slice retrofit은 W6 scope 아님"은
**틀렸다.** architecture·specs slice retrofit과 decisions drift 검토는 W6 "owner 문서 정리"의 **잔여 작업**이다.
따라서 W6는 계속 active이고, Work Items에 sub-item 3종을 추가했다. 실제 작업은 **다음 세션**에서 한다(이번 미착수).

**W6 잔여 3종(다음 세션):**

1. **architecture retrofit** — `docs/architecture/local-agent-runtime.md` 인덱스 + slice 9개(이전 실측 기준, 착수 시
   재확인). 현재 slice는 `> 컨텍스트:` 콜아웃 형식·`Evidence:` 블록 0·repo-path wikilink 0. 새 규칙(Related/Status,
   repo-path wikilink, Evidence 형식)으로 검토·retrofit. **§3 제약: 기존 §N 헤딩·inbound anchor는 inbound ref를
   함께 갱신하는 migration이 아니면 보존.** (근거: `docs/architecture/AGENTS.md` §3/§4, 이 로그의
   `2026-06-26 · W5 후속` 블록 미반영 retrofit handoff.)
2. **specs retrofit** — `docs/specs/aiox-a2a.md` 인덱스 + slice 7개의 `> 컨텍스트:` 형식을 Related/Status·repo-path
   wikilink·evidence 형식으로 검토·retrofit. (`docs/specs/AGENTS.md` §3/§4 기준.)
3. **decisions drift 검토** — 기존 decision 15개 **일괄 retrofit 금지**(`docs/decisions/AGENTS.md` §4 "기존 문서
   retrofit 금지"). stale 링크·owner drift만 검토해 변경 없음 또는 국소 수정만 판정. decision-change harness(§5)
   준수.

**진행 순서(권장):** architecture → specs(aiox-a2a는 architecture와 index/slice 짝) → decisions. 다음 세션 onramp는
이 블록과 Work Items W6 sub-item을 재개 기준으로 본다.

**다음 행동(다음 세션 재개):** W6 — architecture retrofit부터. `local-agent-runtime.md` 인덱스/slice 9개를 새 규칙으로
검토·retrofit하되 §N 헤딩·inbound anchor 보존. 그 뒤 specs 7개, decisions 15개 검토 순.

## 2026-06-28 · child log split — parent pointer and scope

Parent pointer: `logs/workspace-reset/plan-stages/2026-06-26-workspace-reset-stage8-Atlas-반영·drift-재검토.md` W6

- 이 로그는 stage8 parent/control log의 W6 상세 실행 기록을 분리한 child log다.
- 원래 W6 상세 기록은 parent log에서 이 로그로 이동했다.
- W6는 product/roadmap/documentation-system 정합 기록을 보존하고, 남은 architecture → specs → decisions owner-doc retrofit을 이어간다.
- W10 docs contract overhaul이 먼저 closeout되면 parent W10을 완료 처리한 뒤 이 로그의 W2를 재개한다.

## 2026-06-28 · W11 착수 — W10 반영 5개 owner 문서 one-by-one 독립 검토를 architecture retrofit보다 선행

@user 지시로 W6 잔여(architecture/specs/decisions retrofit) 착수 전에, W10이 반영한 owner 문서 5개를 one-by-one 독립 검토하는 것을 현재 작업으로 둔다.

**근거(@user):** W10 child log(`logs/workspace-reset/packages/2026-06-28-workspace-reset-stage8-W10-docs-contract-overhaul.md`) 마지막 블록 `W10 closeout correction — Claude review instruction scope`는 그 5개 문서 기록이 "future Claude/reviewer가 각 검토를 one-by-one으로 확인해야 한다는 지시 맥락"이라고 명시한다. 이 one-by-one 검토가 architecture retrofit보다 먼저다.

**검토 대상(각각 독립 판정 단위, W10 closeout one-by-one 표 순서):**

1. `docs/decisions/AGENTS.md`
2. `docs/guides/AGENTS.md`
3. `docs/product/AGENTS.md`
4. `docs/product/product.md`
5. `docs/product/roadmap.md`

**검토 방법:** 각 문서를 (a) W10 child log의 해당 기록 블록, (b) 상위 `docs/AGENTS.md` 공통 계약, (c) sibling AGENTS와 대조한다. `document-structure-review` skill 렌즈를 사용한다. W10 전체 결론만 보고 개별 owner 판정을 생략하지 않는다(W10 closeout 지시).

**순서:** 이 one-by-one 검토(W11) → W2 architecture retrofit → W3 specs → W4 decisions drift.

**Work Items 전이:** W11(이 검토)을 active(`[>]`)로 추가, 기존 W2(architecture retrofit)는 open(`[ ]`)으로 내림. next pointer = W11. 도구가 본문의 parent W10 참조를 피해 id를 W11로 발급.

**다음 행동:** 첫 문서 `docs/decisions/AGENTS.md`부터 one-by-one 검토를 시작한다. 각 문서 검토 결과는 독립 블록으로 기록한다.

## 2026-06-28 · W11 검토 #1 decisions/AGENTS.md — PASS, minor 2건 파킹 (다음 세션 #2부터 재개)

W11 one-by-one 검토의 첫 문서 `docs/decisions/AGENTS.md`(W10 반영본)를 검토했다. 기준 = W10 child log `:584-631` + 상위 `docs/AGENTS.md` 공통 계약 + sibling, `document-structure-review` 렌즈.

**[Fact] W10 반영 정확성:** W10 블록이 주장한 5개 변경이 현재 파일에 모두 반영됨 — intro(`:10`) `staleness`→`change/drift validation`(상위 §"Change And Drift Validation" 실제 섹션명 일치), §1 outcome bullet(body link 기본+Related/Sources 조건부), §4 skeleton `Related:` 제거, §4 Sources 조건 보강(`:86-87`), §5 작성 전/중/후 outcome owner 흐름. `scripts/check-markdown-inline-code docs/decisions/AGENTS.md` → exit 0 (PASS).

**[판정] PASS — blocking 없음.** owner boundary(WHY-only, outcome은 product/spec/architecture/roadmap 위임) 명확. 상위 계약 정합: doc-level `Status:` 미사용(type이 lifecycle 규정), wikilink repo-path, §5 decision-change harness = 상위 `docs/AGENTS.md` §6이 명시 허용한 _type-specific deletion harness_ 추가이며 `destructive-change gate` rule shape로 live reference를 구체 정의 → `abstract destructive gate` smell 회피.

**[Opinion] minor tightening 후보 2건(비blocking, 이번 미적용):**

1. §2 bullets(`:26-28`) ↔ §5 step2(`:102-105`)의 "보수/새 decision/삭제 후보" 3분류 반복. 요약(§2 lifecycle)↔절차(§5 harness) 분리로 정당화 가능. parent stage8 로그 `:289-290`이 이미 동일 관찰을 파킹.
2. §1(`:15`) ↔ §4(`:86-87`)의 Related/Sources 안내 약한 겹침. framing 상이(작성 원칙 vs skeleton Sources 주석)라 중복은 아님.

**@user 결정:** minor 수정 여부는 5개 one-by-one 검토를 모두 끝낸 뒤 일괄 판단한다(이번 세션 미적용). 다음 세션에서 진행한다.

**진행률:** W11 1/5 완료. 잔여 4 = `guides/AGENTS.md` · `product/AGENTS.md` · `product.md` · `roadmap.md`. W11은 계속 active(`[>]`), next pointer 유지.

**다음 행동(다음 세션 재개):** W11 문서 #2 `docs/guides/AGENTS.md`부터. 재개용 W10 기록 블록 포인터 — guides = W10 `:682`(section contract 정합 반영) + `:633`(구조 검토 보고/제안), product/AGENTS = W10 `:715`, product.md = W10 `:765`(traceability 보정), roadmap.md = W10 `:765`(closeout `:843` 기준 "유지 판정·파일 변경 없음"). 각 문서를 해당 W10 블록 + 상위 docs/AGENTS·sibling과 대조해 독립 판정. 5개 완료 후 minor 수정 일괄 결정 → 그 뒤 W2 architecture retrofit 재개.

## 2026-06-28 · W11 검토 #2 guides/AGENTS.md — PASS, minor 1건 파킹

W11 one-by-one 검토 두 번째 문서 `docs/guides/AGENTS.md`(W10 반영본)를 검토했다. 기준 = W10 child log `:682`(section contract 정합 반영) + `:633`(구조 검토 보고/제안) + 상위 `docs/AGENTS.md` 공통 계약 + sibling, `document-structure-review` 렌즈.

**[Fact] W10 반영 정확성:** W10 `:682` 블록이 주장한 9개 변경이 현재 파일에 모두 반영됨 — ① intro(`:11`) parent 참조 `change/drift validation`(상위 실제 섹션명 `docs/AGENTS.md:159` "Change And Drift Validation" 일치) ② 작성 규칙(`:23-24`) 상속+guide 역할 bullet ③ `Guide Skeleton`→`Guide Composition`(`:38`) ④ 고정 skeleton 대신 guide 질문+parent 좁은 범위(`:40`) ⑤ 절차형 runbook/how-to ↔ 서술형 explainer 구분(`:43-45`, explainer 예 `workflow.md`) ⑥ fenced 예시(`:51-67`)에서 `Related:`/`Status: Current`/`## Sources` 기본 block 제거 ⑦ `Related:`/`Status:`/`Sources:` parent 조건 + body link 충분 시 미반복 축약(`:46-47`) ⑧ 절차형 compact form `When To Use`/`Steps`/`Verification`(`:54-66`) ⑨ Validation 참조 `Staleness And Drift`→`Change And Drift Validation`(`:73`). 독립 검증: `scripts/check-markdown-inline-code docs/guides/AGENTS.md` → exit 0 (PASS); `rg -n "Staleness And Drift|^Related:|^Status:|^Sources:" docs/guides/AGENTS.md` → exit 1 (0건, PASS).

**[판정] PASS — blocking 없음.** 상위 계약·sibling 정합:

- Status 절(`:26-36`): doc-level placement는 [[docs/AGENTS]] Status 위임, guide vocab(`Current`/`Target`/`Deferred`)만 소유 + section/claim status 기본 미사용 → specs/architecture/product sibling과 평행.
- Guide Composition(`:38-67`): 고정 skeleton 대신 invariant+composition(절차형↔explainer 구분)으로 `over-provisioned structure`·`hidden sub-kind` smell 회피. fenced 예시 "강제 아님" 명시 + repo-path wikilink(`:44` `[[docs/guides/workflow]]`) + fence 정상 종결 → skeleton이 자기 규칙(link form/heading 비누출) 준수.
- Validation And Cross-Owner Checks(`:69-76`): parent loop 반복이 아닌 guide 고유 executability 검증(command/script/path/output/failure ↔ code/owner) → 상위 `Change And Drift Validation`이 명시 허용한 type-specific check. sibling(specs §6·decisions §5·product) 대칭.
- owner boundary(`:16-21`): guide는 제품 사실·contract·구조 미결정, owner 문서 링크/위임만. `hidden authority`·`orphan local rule`·`reverse/circular dependency` 미발견.

**[Opinion] minor tightening 후보 1건(비blocking, 이번 미적용):**

1. "실행 순서 / 확인 출력 / 실패 분기" triplet이 3곳 반복 — 작성 규칙(`:22`), W10 추가 상속 bullet(`:23-24`), Guide Composition(`:43`). W10 추가 bullet(`:23-24`)이 가장 중복적: 상속 절반은 intro 위임(`:11-12`)을 재진술하고, "section 구성으로 복원" 절반은 Guide Composition 목적(`:40`,`:43`)과 겹친다. 후보 = bullet 축약/병합. 단 작성 규칙(무엇을 적는가)↔Composition(어떻게 구성하는가) role 분리로 정당화도 가능해 비blocking.

**@user 결정:** minor 수정 여부는 5개 one-by-one 검토를 모두 끝낸 뒤 일괄 판단한다(이번 미적용, #1 decisions와 동일 처리).

**진행률:** W11 2/5 완료(#1 decisions PASS · #2 guides PASS). 잔여 3 = `product/AGENTS.md` · `product.md` · `roadmap.md`. W11 계속 active(`[>]`), next pointer 유지.

**다음 행동(재개):** W11 문서 #3 `docs/product/AGENTS.md`. 재개용 W10 기록 포인터 = W10 `:715`(product AGENTS section contract 정합 반영, 판정 표 `:733-739`). product/AGENTS를 그 블록 + 상위 docs/AGENTS·sibling과 대조해 독립 판정. 이후 #4 `product.md`(W10 `:765`), #5 `roadmap.md`(W10 closeout `:843` 기준 "유지 판정·파일 변경 없음"). 5개 완료 후 minor 일괄 결정 → W2 architecture retrofit 재개.

## 2026-06-28 · W11 #1·#2 minor 반영 — decisions §2/§4, guides 작성 규칙 중복 제거

@user 지시로 W11 #1(decisions)·#2(guides) 검토에서 파킹했던 minor tightening을 5개 일괄 판단보다 앞당겨 반영했다. 셋 다 정보 손실 없이 중복만 제거하는 외과적 수정이며, 빠진 의미는 모두 기존 owner 위치로 복원 가능함을 직접 확인했다. (uncommitted, 커밋은 @user 지시 시)

**반영 1 — `docs/decisions/AGENTS.md` §2 (3분류 반복 해소, W11 #1 minor 1):**

- §2의 보수/새 decision bullet 2개 + §5 위임 bullet(구 `:26-28`) → 2 bullet로 압축. 보수·새 decision·삭제 후보 **분류 정의는 §5 step2(`:102-105`)가 단독 소유**하고, §2는 처리 원칙(WHY 안 바꾸는 보수→기존 decision 적용, 대체 결론→새 decision)과 §5 위임만 남겼다. "각 유형의 정의는 §5가 소유한다" 한 줄로 owner 단일화.
- 근거: W11 #1 minor 1 + parent stage8 로그 `:289-290`의 동일 관찰(요약↔절차 3분류 반복). 보수 정의("링크·provenance·표현·형식")는 §5 `:103`에 보존돼 손실 없음.

**반영 2 — `docs/decisions/AGENTS.md` §4 (Sources↔§1 겹침 해소, W11 #1 minor 2):**

- §4 skeleton 뒤 `Sources` 주석의 둘째 문장("Outcome owner 링크가 특정 claim에만 필요하면 `Related:`나 `Sources`에 반복하지 말고 본문 가까이에 둔다") 삭제. §4는 이제 `## Sources` 블록 사용 조건(계보·source↔claim 복원)만 소유한다.
- outcome 링크 body-우선 원칙은 §1 `:15`("선택 결과가 반영된 owner 문서는 claim 가까이의 본문 링크로 참조한다")가 단독 소유 → 손실 없음.

**반영 3 — `docs/guides/AGENTS.md` 작성 규칙 (triplet 반복 해소, W11 #2 minor 1):**

- 작성 규칙의 "상속 + 복원 구성" bullet(구 `:23-24`) 삭제. "상위 docs/AGENTS 상속"은 intro(`:11-12`)의 공통 규칙 위임이, "반복 workflow/how-to/runbook을 적용 순서·확인 출력·실패 분기로 복원 구성"은 Guide Composition(`:40`,`:43`)이 이미 소유 → 양쪽 재진술이라 제거. 절차 명확성 규칙(`:22` "실행 순서·확인 출력·실패 분기를 명확히 적는다")은 유지.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/decisions/AGENTS.md docs/guides/AGENTS.md` → exit 0 (PASS).
- `git diff --check -- docs/decisions/AGENTS.md docs/guides/AGENTS.md` → exit 0 (PASS).
- 정보 보존 직접 확인: 보수 정의 = decisions §5 step2; outcome body-link 원칙 = decisions §1; guide 상속 = guides intro; 복원 구성 = guides Guide Composition.

**진행률:** W11 #1·#2 minor 반영 완료. W11 검토 자체는 2/5(decisions·guides PASS) 유지. 잔여 3 = `product/AGENTS.md` · `product.md` · `roadmap.md`. 이제 #3~#5는 검토 중 minor가 나오면 같은 방식으로 즉시 반영한다(파킹·일괄 결정 방식은 @user가 앞당김으로 종료). W11 계속 active(`[>]`), next pointer 유지.

**다음 행동:** W11 #3 `docs/product/AGENTS.md` 검토 — W10 `:715` 블록(판정 표 `:733-739`) + 상위 `docs/AGENTS.md`·sibling과 대조해 독립 판정.

## 2026-06-28 · W11 검토 #3 product/AGENTS.md — PASS, minor 2건 관찰(즉시 반영 보류)

W11 one-by-one 검토 세 번째 문서 `docs/product/AGENTS.md`(W10 반영본)를 검토했다. 기준 = W10 child log `:715` 블록(판정 표 `:733-739`) + `:765` 블록(product.md/roadmap.md traceability) + 상위 `docs/AGENTS.md` 공통 계약 + sibling(specs §1-6 · decisions §1-5), `document-structure-review` 렌즈.

**[Fact] W10 반영 정확성:** W10 `:733-739` 판정 표가 주장한 6개 처리가 현재 파일에 모두 반영됨 — ① product/roadmap sub-kind 구조 keep(`:8-14`) ② product skeleton 없음 keep(`:25`, invariant-primary) ③ roadmap section ownership keep(`:43-59`) ④ Related/Status/Sources 추가 규칙 no-change(parent 위임) ⑤ parent heading 참조 update(`:16`·`:92`·`:99` 모두 `Change And Drift Validation`) ⑥ `as-built code 주장`→`현재 구현 동작 주장`(`:91`). 독립 검증: `rg "Staleness And Drift|as-built|staleness" docs/product/AGENTS.md` → exit 1 (0건, PASS); inline-code check → exit 0 (PASS).

**[Fact] roadmap section ownership ↔ 실제 corpus 정합:** `Roadmap Section Ownership`(`:43-59`)이 나열한 6개 섹션이 `docs/product/roadmap.md` 실제 헤딩과 1:1 정합 — Release Gates(`roadmap:21`)·Phases(`:117`)·Current Execution Candidates(`:149`)·Gate Evidence(`:171`)·Cross-Platform Requirement(`:188`)·Pre-Release Gap Summary(`:200`). 존재하지 않는 섹션을 소유 규칙으로 서술하는 drift 없음. wikilink target 5개(specs/aiox-a2a·specs/AGENTS·architecture/AGENTS·docs/AGENTS·documentation-system) 모두 실재.

**[판정] PASS — blocking 없음.** 상위 계약·sibling 정합:

- 공통 규칙 위임(`:16-17`): 링크 형식·중복 금지·status 배치·evidence·sources·change/drift validation을 [[docs/AGENTS]]에 위임. sibling(specs `:10`·decisions `:10`)과 평행하며, product는 status 배치와 sources 둘 다 위임(각 type 실제 위임 범위 차이 반영).
- Status(`:78-87`): doc-level placement는 [[docs/AGENTS]] 위임, `Current`/`Target` vocab만 소유 → specs §2·decisions §2와 평행.
- Drift 처리(`:89-100`): 일반 절차 상위 위임 + roadmap 전용 분류(current/progress claim 갱신 vs gate/target criterion 낮추기 금지 vs 불명확 시 사용자 확인)만 소유 → specs §5 대칭.
- Validation And Cross-Owner Checks(`:102-109`): product 전용 cross-owner check → specs §6·decisions §5 대칭.
- owner boundary: product는 외부 contract·구현 상세·protocol field·internal arch state 미소유, 링크/위임만(`:21-24`). dual sub-kind 명시(`:8-14`)로 `hidden sub-kind` 회피, product skeleton 없음으로 `over-provisioned structure` 회피. `hidden authority`·`orphan local rule`·`reverse/circular dependency` 미발견.

**[Opinion] minor 관찰 2건(비blocking, 이번 미반영 — #1/#2와 성격 다름):**

#1(decisions §2)·#2(guides 작성 규칙) minor는 "다른 owner 위치에 의미가 완전 보존된 순수 재진술"이라 외과 제거가 안전했다. 아래 2건은 구조 모델/의도적 명시화 판단이 얽혀 즉시 제거하면 손실 위험이 있어, 관찰로 남기고 @user 판단을 받는다.

1. **roadmap 경계 분산** — roadmap 작성 경계가 `Roadmap 작성 규칙`(`:33-41`, type-level 선언)·`Roadmap Section Ownership`(`:43-59`, 기존 섹션별 instance 매핑)·`Roadmap Change Rules`(`:61-76`, 변경 분류)·Drift 처리 roadmap 분기·Validation 5곳에 나뉜다. `Roadmap 작성 규칙 :35,:37-40`(소유/위임 원칙)이 Section Ownership의 섹션별 경계와 의미가 겹친다. 단 type 원칙 ↔ 현재 인스턴스 섹션 매핑의 2층 분리는 의도적일 수 있고(작성 규칙을 지우면 roadmap.md 구조 변경 시 type 선언이 instance 목록에만 의존), `document-structure-review`의 "확정된 owner 구조 모델 override 금지"에 해당하므로 비blocking.
2. **Product 작성 규칙 내부 "복사 말고 링크" 반복** — bullet1(`:23`)과 bullet4(`:29`)가 "상세를 복사하지 않고 관련 owner 문서로 링크한다"를 반복. 단 child log `2026-06-27 · W6 product authoring owner 문구 명확화`(`:57-79`)에서 @user가 "각 owner로 보낸다"의 모호성을 지적해 두 규칙 모두에 작성 행동을 의도적으로 분리 명시한 결과 → 임의 제거 금지.

**검증 ledger:**

- `rg -n "Staleness And Drift|as-built|staleness" docs/product/AGENTS.md` → exit 1 (0건, PASS).
- `scripts/check-markdown-inline-code docs/product/AGENTS.md` → exit 0 (PASS).
- wikilink target 5개 EXISTS · `rg "^#{1,3} " docs/product/roadmap.md`로 6개 섹션 헤딩 실재 확인.
- 파일 변경 없음(검토만) → diff check 불요.

**진행률:** W11 3/5 완료(#1 decisions PASS · #2 guides PASS · #3 product/AGENTS PASS). 잔여 2 = `product.md` · `roadmap.md`. W11 계속 active, next pointer 유지.

**다음 행동:** W11 #4 `docs/product/product.md` 검토 — W10 `:765` 블록(traceability 보정, 판정 표 `:788-794`: top-level Related delete·Status keep·Sources keep-with-mapping) + 상위 `docs/AGENTS.md` Links And Read Paths/Status/Sources + product/AGENTS 규칙과 대조해 독립 판정. 이후 #5 `roadmap.md`(W10 closeout `:843` 기준). minor는 순수 중복이면 즉시 반영, 구조 판단 얽히면 보고. 5개 완료 후 W2 architecture retrofit 재개.

## 2026-06-28 · W11 검토 #4 product.md — PASS (#3 minor는 @user 보강 없이 PASS 확정)

W11 one-by-one 검토 네 번째 문서 `docs/product/product.md`(W10 반영본)를 검토했다. 기준 = W10 child log `:765` 블록(traceability 보정, 판정 표 `:788-794`) + 상위 `docs/AGENTS.md` Links/Status/Sources + `docs/product/AGENTS.md` product invariant, `document-structure-review` 렌즈.

**[#3 minor closure]** @user 결정 = roadmap 경계(1번)·Product 작성 규칙 "복사 말고 링크" 반복(2번) **둘 다 보강 없이 PASS**(파일 변경 없음). 관찰은 W11 #3 블록에 보존됨. 열린 minor 큐 없음.

**[Fact] W10 반영 정확성:** W10 `:788-794` 판정 표의 product.md 3개 처리가 모두 반영됨 — ① top-level `Related:` delete: `^Related:` 매치 0건이고 body owner wikilink 6개(`:15`·`:17`·`:65`·`:72`·`:81`·`:83`)가 read path를 대체 ② `Status: Current` keep(`:3`) ③ external positioning `Sources:` keep-with-mapping: `:98` Sources block에 `External positioning / A2A naming verification` label(`:100`)로 claim↔source mapping 보존. `git diff --stat` = 3 insert/8 delete(top-level Related block 제거 + Sources label 추가와 정합). inline-code exit 0; wikilink target 6개 전부 실재.

**[판정] PASS — blocking 없음.** 정합:

- product/AGENTS invariant(`:26-31`): User Value(`:22`)·Scope(`:35`) 중심, Product Direction(`:74`)은 `[Status: Target]` 방향 문장 + owner 링크만(contract 미복사), 별도 Non-Goals/Deferred 섹션 없음(핵심 경계는 Scope 본문) → 전부 준수.
- 상위 docs/AGENTS Status(`:95-99`): doc-level `Status: Current`(`:3`)가 문서 전체 current validity를 설명하고 section-level Target은 inline `[Status: Target]`(`:76`) → 정확 적용.
- 상위 docs/AGENTS Links(`:71-74`): body link 우선 + top-level Related 제거 → "body가 read path를 이미 제공하면 Related 안 씀" 준수.
- 상위 docs/AGENTS Sources(`:140-142`): External Positioning section-local Sources block + claim mapping label → 여러 claim이 같은 계보를 공유할 때 section-local block 규칙 준수, 문서 전체 provenance로 오독되지 않게 label 명시.
- product 경계: 외부 contract·내부 구조·protocol·release 순서를 소유하지 않고 specs/architecture/roadmap로 링크(intro `:5-7` + body) → `duplicated ownership` 회피. `hidden authority`·`orphan local rule` 미발견.

**[Opinion] 관찰 1건(비blocking, 변경 불요):** External Positioning callout(`:92-96`)의 "protocol·package·repository 이름은 공개 직전 재검증한다"는 약하게 release-gate(공개 hygiene) 성격이다. 단 (a) positioning을 외부에 안전하게 쓰기 위한 product-local naming discipline이고, (b) A2A naming이 Google→Linux Foundation 이전으로 실제 stale했던 이력의 산물이라 추상적 예외가 아니다. roadmap gate로 분리하면 positioning 복원에 read path가 늘어 손해 → 현행 유지가 정확.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/product/product.md` → exit 0 (PASS).
- `rg -n "^Related:" docs/product/product.md` → 0건; body owner wikilink 6개 실재; Sources mapping label(`:100`) 존재.
- wikilink target 6개(aiox-a2a·local-agent-runtime·aiox-adapter-model·aiox-compose-contract·roadmap·aiox-federation-remote) EXISTS.
- `git diff --stat docs/product/product.md` → 3 insert/8 delete(W10 반영분, 이번 검토로 추가 변경 없음).

**진행률:** W11 4/5 완료(#1 decisions · #2 guides · #3 product/AGENTS · #4 product.md 모두 PASS). 잔여 1 = `roadmap.md`. W11 계속 active, next pointer 유지.

**다음 행동:** W11 #5 `docs/product/roadmap.md` 검토 — W10 판정(`roadmap.md` structure no-change, `Related: [[docs/product/product]]` keep) + 상위 `docs/AGENTS.md` + `docs/product/AGENTS.md` Roadmap 작성 규칙/Section Ownership/Change Rules와 대조해 독립 판정. #5 완료로 W11 종결 → W2 architecture retrofit 재개.

## 2026-06-28 · W11 검토 #5 roadmap.md — PASS · W11 종결(5/5 전부 PASS)

W11 one-by-one 검토 다섯 번째(마지막) 문서 `docs/product/roadmap.md`를 검토했다. 기준 = W10 closeout 표(`:843`: Related keep + structure no-change + 파일 변경 없음) + 상위 `docs/AGENTS.md` Related/Status + `docs/product/AGENTS.md` Roadmap 작성 규칙·Section Ownership·Change Rules·Status, `document-structure-review` 렌즈.

**[Fact] W10 판정 정합:** W10이 roadmap.md를 변경하지 않고 "유지 판정"한 것이 현재 상태와 일치 — `Related: [[docs/product/product]]`(`:3-5`) 유지, doc-level `Status: Current`(`:7`) 유지, Release Gates/Phases/Current Execution Candidates/Gate Evidence/Cross-Platform/Pre-Release Gap Summary 구조 그대로. `git diff --stat docs/product/roadmap.md` → 변경 0(W10 무변경 판정 정합, W6 적용분은 이미 커밋).

**[판정] PASS — blocking 없음.** 정합:

- product/AGENTS Roadmap 작성 규칙(`:35-41`): roadmap이 release gate·phase·우선순위·gate 통과 기준·요구 evidence를 소유(Release Gates·Phases·Gate Evidence), task 실행 절차·cutover는 plans로 위임(intro `:10-11`), contract 본문 미복사(gate는 통과 조건만, contract는 spec) → 전부 준수.
- Roadmap Section Ownership(`:43-59`): 6개 섹션이 실제 roadmap.md 섹션과 1:1(#3에서 확인), 각 섹션이 owner 경계대로 외부 내용 미복사.
- Current Execution Candidates transitional 처리: `임시 매핑` callout(`:151-153`)로 "장기 기준 아님" 명시 + 삭제 예정 plan 4개(`:157-160`)는 backtick path(wikilink화 거부 → stage 9 삭제 후 broken link 방지). roadmap.md 전체 wikilink는 `[[docs/product/product]]` 1개뿐(broad-link 없음).
- Pre-Release Gap Summary(`:200-225`): dated audit 원본을 본문에 복사하지 않고 gate/phase pressure만, provenance는 `Sources:`로 W9 로그(`:225`, 실재 확인) backtick 연결 → product/AGENTS Section Ownership 정합.
- 상위 docs/AGENTS: Related(`:71-74`)는 product scope가 roadmap 전체의 document-level prerequisite(W10 근거)라 keep 타당. Status(`:95-100`): roadmap 전체가 "현재 승인된 추진 순서"라 doc-level `Current` 단일값으로 오해 없이 설명(Phase 1-3 미래 항목도 "현재 승인된 계획"의 일부 → product.md Product Direction의 inline `[Status: Target]` 같은 별도 표기 불요, product/AGENTS Status `Current` 정의 "현재 승인된 roadmap 상태"와 정합).
- release-plan 경계(`:17-19`): release-plan을 roadmap 항목으로 흡수하지 않고 "G6 배포 시점 실행 checklist"로 경계 명시 → owner 분리 정확.
- `hidden authority`·`orphan local rule`·`duplicated ownership` 미발견.

**[Opinion] 관찰 1건(비blocking, 변경 불요):** 추진 순서가 intro 산문(`:13-15`)·Release Gates 실행 순서(`:23`)·Phases 다이어그램(`:120`) 3곳에 표현된다. 단 역할이 다르고(독자용 개요 / gate 의존 순서 / 시각 다이어그램), roadmap "기존 구조 유지" 전제(product/AGENTS `:41`,`:45`) + W10 structure no-change 판정에 해당한다. #3 1번(roadmap 경계 분산)과 동류이며 @user가 이미 "보강 없이 PASS"로 그 방침을 확정 → 변경하지 않는다.

**검증 ledger:**

- `scripts/check-markdown-inline-code docs/product/roadmap.md` → exit 0 (PASS).
- Related/Status/`[[docs/product/product]]` 헤더 정합 확인.
- Current Execution Candidates plan 4개 backtick path 유지(wikilink 0); roadmap 전체 wikilink = product 1개.
- Sources W9 로그(`logs/workspace-reset/packages/2026-06-21-workspace-reset-W9-release-roadmap-authority.md`) 실재 확인.
- `git diff --stat docs/product/roadmap.md` → 변경 0(W10 무변경 판정 정합).

**W11 종결:** 5/5 완료 — #1 decisions · #2 guides · #3 product/AGENTS · #4 product.md · #5 roadmap.md **전부 PASS**. minor 처리: #1·#2는 즉시 반영 완료, #3 2건은 @user "보강 없이 PASS" 확정, #4·#5 관찰은 비blocking 변경 불요. 열린 minor 큐 없음. W10 반영 5개 owner 문서가 상위 docs/AGENTS·sibling 계약과 독립 판정에서 모두 정합 확인됨.

**다음 행동:** W11 완료 처리 → next pointer를 W2(architecture retrofit)로 복귀. W2 = `docs/architecture/local-agent-runtime.md` 인덱스 + slice 9개를 승인된 규칙(Related/Status·repo-path wikilink·Evidence 형식·`> 컨텍스트:` 대체)으로 검토·retrofit, §N 헤딩·inbound anchor는 migration 아니면 보존. 이후 W3 specs(aiox-a2a) → W4 decisions drift.

## 2026-06-28 · W11 종결 후 멈춤 — 남은 retrofit(W2-W4) one-by-one 진행 방식 확정

@user 지시로 이번 세션은 W11 종결 후 W2 착수 전에 멈춘다. 함께 남은 owner-doc retrofit의 진행 방식을 확정했다.

- @user 결정: 남은 retrofit을 W11과 동일하게 **one-by-one**으로 진행한다. architecture slice뿐 아니라 specs slice, decisions까지 각 문서(인덱스/slice/decision)를 개별 판정·반영 단위로 다루고, 한 번에 일괄 retrofit하지 않는다.
- 적용 범위:
  - W2 architecture — `docs/architecture/local-agent-runtime.md` 인덱스 + slice 9개를 각각 개별 단위로 검토·retrofit.
  - W3 specs — `docs/specs/aiox-a2a.md` 인덱스 + slice 7개를 각각 개별 단위로 검토·retrofit.
  - W4 decisions — 기존 decision 15개는 일괄 retrofit 금지(국소 stale/owner drift만), 본래 one-by-one 성격 유지.
- 현재 상태: next pointer = W2(active). W11(W10 반영 5개 owner 문서 one-by-one 검토)은 5/5 PASS로 완료.

다음 행동(다음 세션 재개): W2 architecture retrofit을 one-by-one으로 착수한다. `local-agent-runtime.md` 인덱스/slice를 개별 단위로 검토·retrofit하되 승인된 규칙(Related/Status·repo-path wikilink·Evidence 형식·`> 컨텍스트:` 대체)을 적용하고, 기존 §N 헤딩·inbound anchor는 inbound ref를 함께 갱신하는 migration이 아니면 보존한다. 진행 단위(인덱스 먼저 vs slice 먼저, @user 초안 제공 여부)는 착수 시 확인한다.

## W2 architecture retrofit → child log (decided 2026-06-29)

기록 이전: `logs/workspace-reset/packages/2026-06-28-workspace-reset-stage8-W2-architecture-retrofit.md`

- 대상: `docs/architecture/local-agent-runtime.md` 인덱스 + slice 9개
- 방식: one-by-one 검토·retrofit (index → store/repositories → process-topology → daemon-transport-api → claude-adapter → codex-adapter → routing-delivery → cli-operator-surfaces → errors-events-smoke → gaps-targets)
- 완료: index + slice 9개 전체 PASS. 기존 §N 헤딩·inbound anchor 보존.
- Status: decided

## W3 specs retrofit → child log

기록: `logs/workspace-reset/packages/2026-06-28-workspace-reset-stage8-W3-specs-retrofit.md`

- 대상: `docs/specs/aiox-a2a.md` 인덱스 + slice 7개
- Status: open

## W4 decisions drift → child log

기록: `logs/workspace-reset/packages/2026-06-28-workspace-reset-stage8-W4-decisions-drift.md`

- 대상: `docs/decisions/` decision 15개
- Status: open

## 2026-06-29 · child log split — W2 이전·W3·W4 신규 생성

W2 architecture retrofit 기록을 child log로 이전하고, W3 specs·W4 decisions 작업을 각각 별도 child log로 분리했다. 현재 파일은 W1 product/roadmap/documentation-system + W11 one-by-one 검토 기록을 보존하는 parent container로 유지한다.

- W2 이전: `logs/workspace-reset/packages/2026-06-28-workspace-reset-stage8-W2-architecture-retrofit.md` (status: decided, index+slice 9개 완료)
- W3 신규: `logs/workspace-reset/packages/2026-06-28-workspace-reset-stage8-W3-specs-retrofit.md` (S0 aiox-a2a 인덱스 + S1~S7 slice 7개 step-by-step 작업 아이템 포함)
- W4 신규: `logs/workspace-reset/packages/2026-06-28-workspace-reset-stage8-W4-decisions-drift.md` (D01~D15 decision 15개 one-by-one drift 검토 작업 아이템 포함)

Work Items: W2 completed, W3 transferred → W3 child, W4 transferred → W4 child. 이 파일은 W3·W4 child 완료 전까지 open 유지.

다음 행동: W3 child log에서 `docs/specs/aiox-a2a.md` 인덱스(S0)부터 one-by-one 검토·retrofit 착수.

## 2026-06-29 · child pointer 정합화 — W3 active 유지, W4 open 유지

@user가 새로 만든 작업 로그들의 하단을 검토하라고 요청했고, 검토 결과 W6 child log의 Work Items와 최신 기록이 서로
충돌한다고 판단했다.

**확인한 사실:**

- W3/W4는 별도 child log로 분리됐지만, 이 W6 log는 W3·W4 child 결과를 소비해야 하는 parent 역할을 계속 가진다.
- 직전 Work Items는 W3/W4를 `Transferred:`로 닫아 두었고, 동시에 하단 기록은 "W3·W4 child 완료 전까지 open 유지"라고
  적었다.
- `scripts/onramp`와 stage8 parent log는 W6 하위 active 지점이 W3 specs child라고 표시한다.

**판정:**

- W3/W4는 source가 더 이상 소유하지 않는 이관 항목이 아니라, W6 parent가 child 완료를 기다렸다가 소비해야 하는
  parent/child pointer다.
- 따라서 W3를 active(`[>]`)로, W4를 open(`[ ]`)으로 되살리는 것이 Work Items 규칙의 parent/child pointer 의미와 맞다.

**반영:**

- W3 Work Item을 `Transferred:` 완료 상태에서 active child 완료 소비 항목으로 수정했다.
- W4 Work Item을 `Transferred:` 완료 상태에서 open child 완료 소비 항목으로 수정했다.
- W2 architecture child는 이미 decided이므로 완료 상태를 유지한다.

**다음 행동:**

- W3 child log `logs/workspace-reset/packages/2026-06-28-workspace-reset-stage8-W3-specs-retrofit.md`에서 W1 인덱스부터 진행한다.
- W3 child가 decided 되면 이 W6 log의 W3를 완료 처리하고 W4 child를 active로 전환한다.

## 2026-06-29 · W3 specs child closeout 소비 — W4 decisions drift로 진행

W3 child log `logs/workspace-reset/packages/2026-06-28-workspace-reset-stage8-W3-specs-retrofit.md`가 decided로 종료되어 W6 parent pointer를 소비했다.

**확인한 사실:**

- W3 child Work Items W1~W8이 모두 완료됐다.
- 대상은 `docs/specs/aiox-a2a.md` 인덱스와 slice 7개:
  `aiox-adapter-model.md`, `aiox-capability-policy.md`, `aiox-compose-contract.md`, `aiox-federation-remote.md`,
  `aiox-message-lifecycle.md`, `aiox-open-deferred.md`, `aiox-runtime-profile-namespace.md`.
- W3 closeout에 따르면 모든 대상에서 `> 컨텍스트:` 제거, repo-path wikilink 전환, 필요한 code/test evidence first mention
  wikilink 보정이 완료됐다.
- 각 파일별 검토에서 blocking spec/code drift는 확인되지 않았다.

**반영:**

- W6 Work Item W3를 completed로 전환했다.
- W4 decisions drift child 완료 소비 항목을 active next pointer로 전환했다.

**다음 행동:**

- W4 child log `logs/workspace-reset/packages/2026-06-28-workspace-reset-stage8-W4-decisions-drift.md`에서 W1
  `docs/decisions/a2a-message-lifecycle-envelope-and-correlation.md`부터 one-by-one stale 링크·owner drift 검토를 진행한다.

## 2026-06-29 · W4 decisions child closeout 소비 + W6 closeout

W4 child log `logs/workspace-reset/packages/2026-06-28-workspace-reset-stage8-W4-decisions-drift.md`가 closeout을 남기고 `decided`로 닫혔다.

**확인한 사실:**

- W4 child Work Items W1~W15가 모두 완료됐다.
- 대상은 `docs/decisions/`의 기존 decision 15개 전부다.
- W4 closeout에 따르면 검토 범위는 decision WHY·skeleton 일괄 재작성 없이, 상위 `docs/AGENTS.md`와
  `docs/decisions/AGENTS.md` 계약에 따른 링크·provenance·표현·형식 보수 업데이트와 owner drift 판정으로
  유지됐다.
- 삭제 후보나 새 decision 필요 판정은 나오지 않았다.
- 각 반영 파일별 inline-code check와 diff check가 통과했다.
- W12~W15는 링크 target 존재뿐 아니라 target section/claim이 decision claim을 실제로 뒷받침하는지 확인했다.

**W6 전체 결과:**

- W1 product 계열·roadmap·documentation-system drift 정합 완료.
- W2 architecture retrofit child 완료 소비: `docs/architecture/local-agent-runtime.md` 인덱스 + slice 9개 완료.
- W3 specs retrofit child 완료 소비: `docs/specs/aiox-a2a.md` 인덱스 + slice 7개 완료.
- W4 decisions drift child 완료 소비: 기존 decision 15개 one-by-one 검토·보수 완료.
- W11 W10 반영 5개 owner 문서 one-by-one 독립 검토 완료.

**Owner handoff 판단:**

- W6 범위의 owner 문서 반영은 각 child log와 이 W6 로그의 기록에 따라 완료됐다.
- W6 범위 안에 남은 open Work Item, unresolved approval, child pointer는 없다.
- W7 탐색 흐름 drift 판정은 이 W6 child가 새로 소유하지 않고, stage8 parent log의 별도 Work Item W7이 계속 소유한다.

**반영:**

- W6 Work Item W4를 completed로 전환했다.
- 이 W6 child log는 `decided`로 닫는다.
- Stage8 parent `logs/workspace-reset/plan-stages/2026-06-26-workspace-reset-stage8-Atlas-반영·drift-재검토.md`에서 W6를 완료 처리하고 W7을 active next pointer로 전환한다.
