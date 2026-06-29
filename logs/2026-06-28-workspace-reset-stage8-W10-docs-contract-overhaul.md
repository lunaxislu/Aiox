---
topic: workspace reset stage8 W10 docs contract overhaul
description: workspace reset stage 8 W10 — W6 retrofit 중 드러난 docs 공통 계약과 child AGENTS section contract 문제를 전면 재검토·반영한다.
status: decided
---

## Work Items

- [x] W1 docs/AGENTS 공통 목적·context/state/traceability 계약 재구성
- [x] W2 architecture/specs/decisions/guides/product AGENTS section contract 정합 반영
- [x] W3 product owner 문서 traceability 보정
- [x] W4 W10 closeout — parent stage8 로그의 W10을 완료 처리하고 W6 child log로 복귀

## 2026-06-28 · W10 pointer 전환 — 대표 retrofit에서 owner별 section contract 전수 재검토로 확대

### Scope

- Parent pointer: `plans/workspace-reset/workspace-reset.md` stage 8. plan 단계 포인터는 같은 stage 8 로그를 계속 가리킨다.
- 이번 세션에서 바꾼 구조 상태: Work Items next pointer를 W6에서 W10으로 전환했다. W10은 공통 authoring contract와 owner별 모든 기본 section을 전수 판정하고 승인 반영한 뒤 W6 retrofit으로 복귀한다.
- 검토 대상: `docs/AGENTS.md`, `docs/architecture/AGENTS.md`, `docs/specs/AGENTS.md`, `docs/decisions/AGENTS.md`, `docs/guides/AGENTS.md`, `docs/product/AGENTS.md`, Claude가 대표 적용한 `docs/architecture/local-runtime-store-and-repositories.md`.
- 이번 세션 비범위: 위 AGENTS owner 문서 추가 수정, 나머지 architecture slice 8개와 index 일괄 retrofit, specs/decisions retrofit. 대표 slice 변경은 승인된 corpus-wide pattern이 아니라 W10 재판정 입력으로 보존한다.

### Claude 대표 retrofit 결과와 독립 확인

| Topic           | Source                                                                       | Finding                                                                                                                                                                                                                                                                                                          | Classification            | Owner impact                    | Action                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| index 구조      | `docs/architecture/local-agent-runtime.md`; `docs/architecture/AGENTS.md` §3 | [Fact] index는 compatibility hub, document map, §0/§14, status vocabulary와 §N/§N.x stub을 소유하며 현행 §3 구조와 정합한다. [Fact] index에는 bare slice target이 9종 남아 있다. [Claude judgment] index retrofit은 bare→repo-path만 하고 authority preamble은 `Related:`/`Status:`로 바꾸지 않는 안을 제안했다. | index sub-kind            | architecture guideline          | W10에서 index가 document map/authority preamble로 공통 field 목적을 이미 충족하는지 재판정. Claude 안과 뒤의 Codex 반론 모두 아직 최종 결정 아님. |
| 측정 정정       | architecture slice corpus                                                    | [Fact] 과거 로그의 “repo-path wikilink 0”은 `[[docs/`만 센 결과라 과도했다. slice에는 `[[src/...]]` code wikilink가 이미 존재하고, bare→repo-path 변환 대상은 docs cross-reference다. 현재 working tree에서는 대표 slice 1개가 전환됐고 나머지 8개는 `> 컨텍스트: [[local-agent-runtime]]`를 유지한다.           | measurement correction    | W6 architecture retrofit        | 이후 측정은 code link와 docs cross-reference를 분리한다.                                                                                          |
| 대표 slice 적용 | `docs/architecture/local-runtime-store-and-repositories.md` git diff         | [Fact] `> 컨텍스트:`를 `Related:` 3개(index + decision 2개)와 `Status: Current`로 바꾸고, body의 bare decision link 3회 발생을 repo-path로 전환했다. §2/§3 heading은 보존됐다.                                                                                                                                   | prototype format retrofit | architecture slice              | W10 승인 전 나머지 slice로 복제하지 않는다. `Related:`의 decision 2개가 document-level인지 body-local인지도 재판정한다.                           |
| 대표 slice 검증 | inline checker; git diff; target existence                                   | [Fact] `scripts/check-markdown-inline-code` exit 0, `git diff --check` exit 0, 대표 slice의 세 bare docs link 잔존 0, index/decision target 3개 실재, `## 2. SQLite Schema`와 `## 3. Repositories` 보존을 확인했다.                                                                                              | validation                | prototype                       | 형식 검증 PASS. 의미·section contract 승인은 W10 미완료.                                                                                          |
| Evidence 처리   | 대표 slice §2/§3; 상위/child AGENTS                                          | [Fact] Claude는 기존 inline/table/step `file:line` 근거를 유지하고 별도 `Evidence:` block을 만들지 않았다. [Claude judgment] step↔line, table row↔line 대응을 분리하면 내용 손상·중복 위험이 있어 기존 dense slice에는 format-only retrofit이 낫다고 제안했다.                                                   | evidence placement        | common + architecture guideline | 아래 전수 조사 결론의 입력으로 채택하되 아직 owner 지침에 반영되지 않음.                                                                          |
| document status | `docs/architecture/AGENTS.md` §2                                             | [Fact] 지침은 document-level `Status: Current`와 section/claim-level `As-built`를 구분한다.                                                                                                                                                                                                                      | lifecycle signal          | architecture guideline          | 대표 slice의 `Status: Current`는 현행 규칙과 정합하나, 신규 skeleton의 hard-coded `Current`는 별도 문제로 재검토한다.                             |

### 이번 대화에서 확정된 조사 결론

1. **Evidence obligation과 Evidence container는 다르다.** `## 2. SQLite Schema`는 evidence 자체가 아니라 schema·migration·invariant를 소유하는 as-built architecture 내용에 code/test evidence가 결합된 case다. current/as-built claim은 검증 가능해야 하지만 별도 `## Implementation Evidence`나 `Evidence:` block이 항상 필요한 것은 아니다.
2. **claim-local evidence가 현행 유력 기본값이다.** 단일 claim은 인접 inline ref, table claim은 같은 cell, step claim은 해당 step, 한 subsection의 여러 claim이 같은 구현을 공유하면 subsection-local `Evidence:` block, 문서 전체를 묶는 편이 더 명확할 때만 document-level evidence section을 쓰는 안이다. 분리할 때는 evidence item이 어느 claim을 지지하는지 label/map을 유지해야 한다.
3. **현행 architecture skeleton은 범용이 아니다.** `Responsibility`→`Flow`→`Implementation Evidence` 구조는 짧고 응집된 compact component/flow slice에는 맞지만 dense schema/catalog, end-to-end sequence, cross-cutting invariant, mixed current/target, index/hub, gap/absence claim, proposed architecture에는 다른 구조가 필요하다.
4. **`Sources:`는 상위 지침에 의해 강제되지 않는다.** `docs/AGENTS.md`는 provenance가 중요할 때만 쓰고 빈 section은 생략하라고 한다. 원 논의 로그도 Spec/Architecture는 필요할 때만 쓰는 것으로 기록한다. corpus 실측은 architecture 0/11, specs 0/9, guides 0/2, product 2/3, decisions 15/16이다. child skeleton의 `## Sources` + `- logs/...` 예시가 optional section을 required처럼 보이게 한 hidden/implicit authority다.
5. **문제는 Evidence 하나가 아니라 skeleton의 모든 section contract다.** skeleton에 heading이 있으면 “빈 section 생략” 문장과 별개로 작성자가 내용을 만들어 채우는 압력이 생긴다. 각 field/section을 `required`, `optional`, `absorb`, `subtype-only`, `delete`로 다시 판정해야 한다.
6. **document-level signal과 body/traceability construct를 분리해야 한다.** `Related:`는 document-level load-bearing neighbor, `Status:`는 lifecycle/current validity, Evidence는 current/as-built claim 검증, `Sources:`는 provenance다. 현재 `docs/AGENTS.md`의 Document Structure는 이들을 한 묶음으로 제시해 적용 조건과 위치가 흐려졌다.
7. **Related/index 논의는 미결이다.** Claude의 “index bare-link만 변경” 안과 Codex의 초기 “index도 공통 `Related:`/`Status:` 형식을 그대로 적용” 반론은 모두 목적 기반 검토 전의 안이다. document map·authority links·authority preamble이 각각 navigation/lifecycle 목적을 이미 충족하는지 보고 중복 없이 결정해야 한다.

### Owner별 전수 감사 범위

| Owner guideline               | 현재 관찰                                                                                                                                             | W10 판정 질문                                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `docs/AGENTS.md`              | document-level field와 evidence/provenance block의 조건·위치가 한 skeleton rule에 섞임                                                                | 공통 의미와 최소 invariant를 먼저 확정하고 child가 재정의하지 않게 할 것                                        |
| `docs/architecture/AGENTS.md` | 단일 slice skeleton이 compact component/flow subtype을 범용화                                                                                         | index, compact component, schema/catalog, sequence, invariant, current/target/gap별 section/evidence shape 판정 |
| `docs/specs/AGENTS.md`        | `Status: Current`, `Implementation Evidence`, `Open Questions`, `Sources`를 한 spec slice default에 함께 둠                                           | Normative/Current/Committed target/Exploratory별 evidence·status·open-question owner 차이 판정                  |
| `docs/decisions/AGENTS.md`    | 반복 가능한 decision 구조는 있으나 `Related:`/`Sources:`와 Alternatives/Rationale/Trade-offs/Re-evaluation의 독립 section 필요성이 문서 크기마다 다름 | core section과 merge/optional section 분리; 기존 decision 일괄 retrofit 금지 유지                               |
| `docs/guides/AGENTS.md`       | runbook/how-to와 explainer subtype은 이미 구분하지만 runbook skeleton이 `Related:`·`Status: Current`·`Sources` placeholder를 제공                     | When To Use/Steps/Verification core와 조건부 field/block 분리                                                   |
| `docs/product/AGENTS.md`      | product는 skeleton 없이 invariant, roadmap은 실제 section ownership을 사용                                                                            | 새 공통 규칙과 충돌만 확인하고 다른 owner의 비교 기준으로 사용할 수 있는지 판정                                 |

### Decision Candidates

- 상위 공통 계약을 먼저 고친 뒤 child 지침을 고친다. child에서 예외를 누적해 상위 결함을 우회하지 않는다.
- full skeleton보다 owner별 subtype decision table + composition blocks + 최소 invariant 조합을 우선 후보로 둔다.
- 각 기본 section은 “없으면 어떤 실제 오류가 생기는가 / 어느 subtype에서 필요한가 / 다른 section에 흡수 가능한가 / 다른 owner 내용을 끌어오는가 / corpus에서 독립 section으로 반복되는가”로 판정한다.
- architecture/specs는 큰 구조 재검토 후보, decisions/guides는 국소 수정 후보, product/roadmap은 현행 invariant/section-ownership 모델 유지 후보다. 이는 W10 조사 후보이며 아직 승인된 owner 규칙이 아니다.

### Cross-Owner Effects

| Owner document                                              | Current state                       | Next action                                                                     |
| ----------------------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| `docs/AGENTS.md` + child AGENTS 5종                         | 이번 세션 변경 없음                 | W10에서 section contract 전수 판정 → exact patch 제안 → @user 승인 후 반영·검증 |
| `docs/architecture/local-runtime-store-and-repositories.md` | Claude prototype diff만 uncommitted | W10 규칙 확정 뒤 유지·축소·재작업 판정. 지금은 되돌리거나 확산하지 않음         |
| architecture index + 나머지 slice 8개                       | 변경 없음                           | W10 완료 후 W6으로 돌아가 승인된 규칙으로 retrofit                              |
| specs + decisions corpus                                    | 변경 없음                           | W10 완료 후 기존 W6 순서로 재개                                                 |

### Handoff / Next

- **Next pointer:** W10 `owner별 section contract 전수 재검토`.
- **W10 실행 순서:**
  1. `docs/AGENTS.md`의 공통 construct를 document-level signal / body section / claim-local evidence / provenance로 분류한다.
  2. 각 construct와 owner별 skeleton section을 `required | optional | absorb | subtype-only | delete`로 판정한다.
  3. architecture·specs·decisions·guides·product의 concrete authoring scenario로 후보를 검증한다.
  4. exact AGENTS patch를 제안하고 @user 검토·승인을 받은 뒤에만 owner 지침에 반영한다.
  5. 승인된 지침으로 Claude prototype을 재검토하고 검증한다.
  6. W10을 완료한 뒤 next pointer를 W6으로 복귀시켜 architecture → specs → decisions 순으로 retrofit을 재개한다.
- **재개 금지:** W10 완료 전 나머지 architecture slice/index 일괄 변환, 현재 prototype을 corpus-wide pattern으로 간주, 기존 §N/§N.x heading·anchor 변경.
- **현재 구조 상태:** W6 open, W7 open, W10 active. stage 8 로그는 계속 `open`이다.

## 2026-06-28 · W10 개념 목적 설명 — docs·Related·Status·Evidence·Sources

- @user 질문: 개별 skeleton 판정에 앞서 docs 자체와 `Related`, `Evidence` 등의 근본적인 필요 이유를 설명할 것.
- [Fact] `docs/documentation-system.md`는 durable knowledge를 질문 종류별 owner로 분리하며, code/tests는 현재 구현 사실,
  logs는 작업 경위를 소유한다. `docs/AGENTS.md`는 `Related`를 document-level load-bearing neighbor, `Status`를 문서
  lifecycle/current validity, `Evidence`를 current/as-built code/test 근거, `Sources`를 provenance로 정의한다.
- [Analysis] docs의 존립 이유는 code에서 안정적으로 복원할 수 없는 intent·contract·internal model·rationale·운영 절차를
  세션을 넘어 질문별 owner로 보존하는 데 있다. 복원 비용이나 오독 위험이 낮은 사실까지 문서화하는 것은 목적이 아니다.
- [Analysis] 네 construct는 서로 대체하지 않는다. `Related`는 안전한 이해·수정에 필요한 문서 간 dependency/read-path,
  `Status`는 시간적 해석, Evidence는 현재 사실 claim의 검증 가능성, `Sources`는 지식의 유래와 판단 계보다.
- [Analysis] 링크와 section은 그 자체가 목적이 아니다. 같은 기능을 index map·본문의 국소 링크·claim-local evidence가 이미
  더 정확히 수행하면 별도 top field나 section은 흡수·생략할 수 있다. Obsidian Graph 모양을 좋게 만드는 것은 독립 근거가
  아니며, link는 owner 경계와 실제 독해 경로를 먼저 지원해야 한다.
- 이 블록은 W10 판정 원리 입력이다. owner별 required/optional/absorb/subtype-only/delete 결과나 AGENTS patch를 승인한
  기록이 아니며 next pointer는 W10으로 유지한다.

## 2026-06-28 · W10 docs 목적 보완 — 지속 보존에서 change/read consistency까지

- @user 해석: docs는 intent 보존뿐 아니라 기능·문서의 추가/수정/삭제/읽기와 원인 분석·디버깅·리팩터링 때 연관
  문서와 code/tests를 refresh하여 drift와 오류를 막기 위해 필요하다.
- [Analysis] 이 해석은 docs의 운영 목적을 보완한다. docs는 durable knowledge owner이면서 변경·진단 시 intended owner와
  actual implementation을 함께 찾고 대조하는 scoped consistency map 역할을 한다.
- [Analysis] 다만 “연관된 문서와 code/tests를 언제나 모두 refresh”는 과도하다. 작업 종류와 변경 영향에 따라 관련 owner,
  code/tests, inbound references를 다시 확인하고, 불일치가 확인된 stale side만 갱신해야 한다. 예를 들어 behavior-preserving
  refactor는 architecture/evidence가 바뀔 수 있지만 product/spec contract를 다시 쓰게 만들지는 않는다.
- [Analysis] docs와 link/evidence는 무오류를 보장하지 않는다. 목적은 drift·오독·누락을 발견하고 통제할 검증 경로를 제공하는
  것이다. `Related`는 그 경로의 document-level dependency만 표현하며 전체 영향 분석을 대체하지 않는다.
- W10 공통 계약 후보에는 docs의 두 역할—durable knowledge ownership과 scoped change/read/diagnosis consistency—을 함께
  반영하되, exact wording과 owner별 적용은 아직 미승인이다. next pointer는 W10으로 유지한다.

## 2026-06-28 · W10 docs 목적 보완 — 의미·제약 context 복원 가능성

- @user 해석: 로그 스킬이 다음 agent에게 작업 context를 복원시키듯, durable docs도 읽었을 때 해당 영역의 context를
  복원할 수 있어야 문서의 필요 조건을 충족한다.
- [Analysis] 복원 가능성은 docs의 핵심 품질 기준이 맞지만 log와 복원 대상은 다르다. Log는 작업 경위·현재 상태·남은 일·
  next pointer를 복원하고, durable docs는 질문별 owner의 identity/scope, intended meaning, current/target 구분, contract·
  invariant, 필요한 dependency와 검증 경로, 안전한 변경 제약을 복원한다.
- [Analysis] durable doc는 현재 권위 해석을 위해 과거 log를 필수로 읽게 하면 안 된다. 현재 유효한 결론은 owner content에
  증류하고, log는 provenance가 실제로 필요할 때만 `Sources`로 추적한다. 반대로 전체 논의와 모든 대안을 docs에 복사하는
  것도 duplicated ownership이다.
- [Analysis] “한 파일만으로 완전 자족”도 요구하지 않는다. 문서 본문과 명시된 최소 read path(`Related`, body link, index)를
  함께 읽었을 때 같은 판단을 복원할 수 있으면 충분하며, 과도한 read path는 구조 결함이다.
- W10 공통 계약 후보의 docs 목적은 durable ownership, scoped consistency, semantic reconstructability의 세 축으로 검토한다.
  exact wording과 owner별 적용은 아직 미승인이며 next pointer는 W10으로 유지한다.

## 2026-06-28 · W10 상위 공통 base 후보 — 목적·복원 기준·작업 체크리스트

- @user 제안: 앞서 합의한 docs 목적과 context 복원 기준을 `docs/AGENTS.md`에 공통 base이자 checklist로 둔다.
- [Fact] 현행 `docs/AGENTS.md`는 Owner Boundary, `Related`, `Status`, Evidence/Sources, drift, logs/plans 경계를 개별
  규칙으로 소유하지만, 이들을 묶는 docs 목적·성공 기준과 읽기/변경 lifecycle checklist는 명시하지 않는다.
- [Analysis] `docs/` 전체에 공통인 durable ownership, scoped consistency, semantic reconstructability는 ancestor 계약인
  `docs/AGENTS.md`가 소유하는 것이 적절하다. 각 child AGENTS에서 반복하면 duplicated/implicit authority가 된다.
- [Analysis] 상위 base는 공통 full skeleton이 아니라 (1) docs identity와 success criterion, (2) common construct의 의미,
  (3) 읽기·추가·수정·삭제·진단·리팩터링 시 적용하는 최소 검증 checklist여야 한다. Owner별 status vocabulary, subtype,
  section composition과 invariant는 child AGENTS가 계속 소유한다.
- [Analysis] checklist는 모든 관련 파일을 수정하라는 지시가 아니라, 질문 owner와 최소 read path 식별 → intended/current
  구분 → 해당 current claim의 code/test 검증 → 영향받은 owner·reference 판정 → stale side만 정합 → 복원 가능성과 drift
  재검증의 순서를 소유해야 한다. 삭제는 unique knowledge와 inbound reference를 추가로 확인한다.
- 이 방향은 W10 exact patch 설계 후보이며 아직 `docs/AGENTS.md` 반영 승인은 아니다. next pointer는 W10으로 유지한다.

## 2026-06-28 · W10 Claude 독립 리뷰 입력 + Codex 검증

### Claude review 요약

- @user가 fresh Claude에게 `documentation-system.md`, `docs/AGENTS.md`, child AGENTS 5종을 읽힌 독립 구조 리뷰를 제공했다.
- [Claude analysis] 세 후보 목적 중 durable ownership은 이미 현행 taxonomy가 소유하고, scoped consistency는 child
  Validation과 Conflict Resolution에 분산돼 있으며, 명시적 gap은 문서 완성/복원 기준이라고 판정했다.
- [Claude recommendation] `docs/AGENTS.md`에는 짧은 Purpose/완성 기준, construct 조건성 한 줄, stale-only 정합 방향만
  두고, 6-operation checklist·full skeleton·owner별 의미는 넣지 않는다. child skeleton의 조건부 placeholder를 우선
  제거하라고 제안했다.

### 직접 확인과 독립 판정

- [Fact] 현행 `docs/AGENTS.md`에는 durable owner identity와 각 construct 의미는 있지만, 문서와 최소 read path가 언제
  충분한지에 대한 공통 authoring success criterion은 없다. 이 gap 진단은 수용한다.
- [Fact] child 5종 모두 type별 Validation을 소유하지만 범위는 동일하지 않다. 문서 읽기·진단·refactor·삭제까지 포괄하는
  공통 lifecycle contract가 완전히 존재한다고 볼 수는 없다. `workflow.md`도 기능 구현·버그 수정·owner 반영의 일반 흐름을
  설명하지만 비권위 guide이며 docs authoring success criterion을 소유하지 않는다.
- [Fact] `self-sufficiency`/`self-contained`의 현행 명시 용례는 workspace-reset 원본 삭제 전 successor/archive가 원본 없이
  과거 경위·검증을 이해하게 하는 destructive gate에 집중돼 있다(`logs/AGENTS.md` Archive Gate, reset plan stage 6).
  따라서 이를 모든 durable docs의 일반 이름으로 확장하는 것은 기존 어휘 재사용이 아니라 의미 확장 후보이며 자동 채택하지
  않는다. 평문 `복원 가능성` 또는 별도 정확한 표현과 비교해야 한다.
- [Correction] child skeleton은 `omit empty`와 조건 문구를 함께 가지므로 상위 규칙과 논리적으로 “정면 모순”이라고 단정할
  수 없다. 다만 skeleton heading·placeholder가 optional construct를 사실상 default처럼 채우게 하는 hidden authority /
  over-provisioning 압력은 확인된다. 각 항목은 일괄 제거가 아니라 required/optional/absorb/subtype-only/delete 판정을
  계속해야 한다.
- [Correction] 대표 architecture prototype에는 `Sources`가 없고, top `Related`의 decision 2개가 document-level
  load-bearing인지 body-local인지도 W10 미결이다. Claude의 “네 construct 모두 의미 있음” 사례 판정은 근거가 부족하다.
- [Analysis] owner 경계는 다음이 적절하다: `documentation-system.md`는 taxonomy·질문별 authority·conflict model,
  `docs/AGENTS.md`는 공통 authoring outcome/복원 기준·construct semantics·짧은 read/change validation invariant,
  child AGENTS는 type/subtype별 section composition과 validation을 소유한다.
- [Analysis] 상위에는 6-operation 상세 절차 대신 최소 checklist가 필요하다: owner와 최소 read path 식별 → current/intent
  구분과 필요한 code/test 검증 → 영향 owner/reference 판정 → stale side만 정합 → 변경 후 권위·복원 가능성 재검증.
  이는 child type-specific validation을 대체하지 않는다.
- 외부 리뷰는 W10 판단 입력이며 승인된 patch가 아니다. next pointer는 W10으로 유지한다.

## 2026-06-28 · W10 Related 재검토 — body link와의 중복·관계 의미 손실

- @user 지적: 현행 공통 계약에는 `Related:`뿐 아니라 body link 규칙도 있으므로 두 construct의 기능 중복을 다시 봐야 한다.
- [Fact] `docs/AGENTS.md`는 `Related:`를 document-level load-bearing neighbor, body link를 국소 문맥에서 owner/source/
  outcome/rationale/next document를 식별하는 링크로 구분한다.
- [Fact] architecture prototype `local-runtime-store-and-repositories.md`는 decision 두 개를 top `Related:`에 두고, 각각의
  실제 적용 지점인 migration invariant와 rollback sentinel 본문에서도 같은 decision을 다시 링크한다. 이 두 link는 top과
  body에서 중복된다.
- [Fact] prototype 이전의 `> 컨텍스트:` 문장은 index가 status vocabulary·module overview·authority links를 소유한다고
  관계 의미를 설명했다. generic `Related:`의 index 항목은 그 구체 의미를 표현하지 않는다.
- [Analysis] body link는 관계의 이유와 적용 claim을 동시에 보존하므로 국소 dependency의 기본 표현으로 더 강하다.
  `Related:`가 별도 가치를 갖는 경우는 특정 문서가 문서 전체를 해석하거나 수정하기 전에 읽어야 하는 prerequisite이고,
  한 body 위치로 국소화하면 의미가 손상될 때뿐이다.
- [Analysis] index/document map이 이미 read path를 제공하거나, body link가 dependency를 정확한 claim 옆에서 설명하거나,
  intro/context 문장이 parent·authority 관계를 더 명확히 말하면 `Related:`는 중복이므로 흡수·생략해야 한다.
- [Candidate] 공통 규칙은 body link를 기본으로 두고 `Related:`를 optional document-level prerequisite manifest로 제한한다.
  같은 target을 top과 body에 중복 링크하지 않으며, 관계 종류를 알아야 안전하면 generic list 대신 intro/body prose로
  설명한다. prototype의 decision 두 개는 top `Related:` 유지 근거가 없고 body-local 후보이며, index 관계는 `Related:`와
  의미 있는 context prose 중 어느 쪽이 복원 기준을 더 잘 만족하는지 재판정한다.
- 이 판정은 W10 exact patch와 prototype 재작업 후보이며 아직 owner 문서 반영 승인은 아니다. next pointer는 W10이다.

## 2026-06-28 · W10 Status·Evidence·Sources 재검토 — 가장 좁은 유효 범위 원칙

- @user 질문: `Related:`와 body link의 중복 판정과 같은 기준을 Status, Evidence 등에도 적용하면 어떻게 되는가.
- [Fact] 현행 공통 계약은 document-level `Status:`, inline section/claim status, `Evidence:`, `Sources:`를 모두 허용한다.
  Architecture/spec skeleton은 hard-coded `Status: Current`와 `## Implementation Evidence`, `Evidence:`, `## Sources`를
  노출하지만 corpus의 dense as-built 문서는 claim 옆 code reference로 이미 근거를 매핑한다.
- [Analysis] 공통 placement 원칙은 “정보가 유효한 가장 좁은 범위에 둔다”가 적절하다. 문서 전체에 균일한 의미가 있을 때만
  top-level signal, section/claim에만 적용되면 local annotation/body evidence, type semantics나 본문에서 이미 명확하면
  생략한다. 별도 container가 대응 관계를 끊거나 중복하면 흡수한다.
- [Candidate: Status] 문서 전체 lifecycle/current validity가 실제로 하나이고 type에서 추론되지 않을 때만 top `Status:`를
  쓴다. Mixed current/target/proposed 문서는 해당 section/claim에 status를 두며, accepted decision처럼 type 자체가 lifecycle을
  규정하면 생략한다. Skeleton의 hard-coded `Status: Current`는 제거 또는 owner/subtype 조건부 block 후보다.
- [Candidate: Evidence] current/as-built claim의 검증 가능성은 required obligation이지만 `Evidence:` field나
  `## Implementation Evidence` section은 required가 아니다. 단일 claim은 인접 code/test ref, table은 해당 row/cell,
  step은 해당 step, 여러 claim이 같은 근거를 공유할 때만 subsection-local block, 문서 전체 근거가 응집될 때만
  document-level section을 쓴다. Claim과 code/test mapping이 body에 이미 있으면 별도 Evidence list는 중복이다.
- [Candidate: Sources] provenance가 현재 판단·재검토·삭제 안전성에 중요할 때만 둔다. 특정 claim의 출처는 인접 body/footnote,
  여러 claim이 같은 계보를 공유할 때만 end `Sources` block으로 묶는다. Sources는 current authority나 actual behavior
  evidence를 대신하지 않으며 과거 log가 current owner 해석의 required read가 되게 해서는 안 된다.
- [Candidate: Related] body link를 기본으로 하고, 문서 전체 사전 prerequisite만 optional top manifest로 둔다. Index/map이나
  body/context prose가 같은 목적을 충족하면 흡수한다.
- [Analysis] 따라서 공통 construct들은 한 skeleton의 병렬 필드가 아니라 서로 다른 조건부 composition block이다.
  `docs/AGENTS.md`는 의미·조건·placement invariant를 소유하고, child AGENTS는 subtype별로 어느 block이 필요한지 판정한다.
- 이 후보는 W10 exact patch와 owner별 section audit 입력이며 아직 반영 승인은 아니다. next pointer는 W10이다.

## 2026-06-28 · W10 docs/AGENTS.md 재구성 후보

- @user 질문: 지금까지의 docs 목적·복원 기준·Related/body link·Status·Evidence·Sources 판정을 반영하면
  `docs/AGENTS.md` 전체 구조가 어떻게 바뀌는가.
- [Fact] 현행 구조는 intro → Owner Boundary → Document Structure의 병렬 field 목록 → Related/Status/Evidence 세부 규칙 →
  Evidence 아래 Inline Code Stability → Staleness/Logs/Writing 순이다. 이 때문에 서로 다른 construct가 공통 skeleton처럼
  보이고, Markdown 공통 validation이 Evidence의 하위 개념처럼 배치돼 있다.
- [Candidate structure]
  1. intro/skill routing 유지.
  2. `Purpose And Sufficiency` 신설: durable docs의 목적과 문서+최소 read path 복원 기준, logs 비의존 current authority.
  3. `Owner Boundary`에 현행 child AGENTS routing과 duplication 금지를 모은다.
  4. `Structure And Placement`: frontmatter gate, empty section omission, “가장 좁은 유효 범위” invariant, child가 type/subtype
     structure를 소유한다는 경계를 둔다. 현행 `Related/Status/Evidence/Sources` 병렬 default list는 삭제한다.
  5. `Context, State, And Traceability` 아래 `Links`, `Status`, `Evidence And Sources`를 조건부 composition rules로 둔다.
     Body link default/Related prerequisite-only, uniform document status only/local otherwise, claim-local evidence default,
     provenance-only Sources를 명시한다.
  6. `Read, Change, And Drift Validation`: owner/minimal path 식별 → intent/current 분류 → 필요한 code/test 검증 → 영향 owner/
     reference 판정 → stale side만 정합 → 복원 가능성 재검증; 삭제 시 unique knowledge/live inbound 추가 확인; authority 변경은
     보고·승인. 기존 Staleness And Drift를 이 section에 흡수한다.
  7. `Logs And Plans` 유지: current authority가 아니라 provenance/work history이며 결론은 owner에 증류.
  8. `Markdown Validation` 독립: 현행 `Inline Code Stability`를 Evidence 하위에서 이동한다.
  9. `Writing Style` 유지·축약.
- [Analysis] 이 구조는 새 full skeleton을 만들지 않고 기존 규칙을 purpose/owner/placement/validation 축으로 재배치한다.
  `documentation-system.md`의 taxonomy·conflict model과 child AGENTS의 type/subtype 규칙은 복사하지 않는다.
- [Patch impact candidate] 현행 병렬 default bullet 4개와 unconditional top `Status:` 문구, Evidence+Sources 결합 예시는
  조건부 규칙으로 교체한다. Child skeleton 변경은 이 parent patch 승인 뒤 별도 W10 owner audit에서 수행한다.
- 이 구조는 exact prose 작성 전 설계 후보이며 아직 `docs/AGENTS.md` 반영 승인은 아니다. next pointer는 W10이다.

## 2026-06-28 · W10 Claude 재구성 리뷰 2차 입력 + 보완 판정

- @user가 fresh Claude의 2차 리뷰를 제공했다. Claude는 재구성 방향을 지지하며 (1) generic loop와 child Validation 경계,
  (2) old→new load-bearing rule 전수 매핑, (3) read/change scope 분리를 적용 전 조건으로 제안했다.
- [Accepted] `docs/AGENTS.md`는 공통 validation invariant만 소유하고 child AGENTS는 type별 owner 목록·status/subtype·
  추가 harness만 소유한다고 명시해야 한다. Decision 삭제의 상세 harness는 공통 절차에 복사하지 않고
  `docs/decisions/AGENTS.md`로 위임한다.
- [Accepted] 구조 재작성에는 old→new mapping ledger가 필요하다. 현행 link 형식(repo path, heading 조건부, block 금지,
  bulk transform 금지), status no-mapping, evidence/source 형식(code/test wikilink, range, backtick provenance)을 포함해
  기존 모든 load-bearing line을 keep/move/rewrite/delete로 추적하고, delete는 의도와 근거를 명시한다.
- [Refined] read와 change gate를 분리한다. Pure semantic read는 owner/minimal path/state 해석으로 충분할 수 있지만,
  current behavior·root cause·debug 판단처럼 actual claim에 의존하는 read는 code/tests 검증이 여전히 필요하다. 따라서
  “read는 항상 1–3만”이 아니라 질문 성격과 영향 범위에 비례하는 조건부 verification으로 쓴다.
- [Correction] Claude가 child generic trim을 W6 retrofit에 예약한 것은 현재 pointer와 충돌한다. Child AGENTS section
  contract·Validation trim·conditional skeleton 정리는 W10에서 parent 공통 계약 확정 직후 수행해야 한다. W6는 승인된
  지침으로 architecture/specs/decisions 실제 owner 문서를 retrofit하는 단계다.
- [Decision candidate] 다음 산출물은 option A를 수정한 형태가 적절하다: 미적용 exact `docs/AGENTS.md` draft + old→new
  mapping ledger → 사용자 검토/승인 → parent 반영 → 같은 W10에서 child AGENTS 전수 patch/검증 → W10 완료 후 W6 복귀.
  Parent patch 승인만으로 W10을 끝내거나 child cleanup을 W6로 넘기지 않는다.
- 아직 exact draft와 owner 문서 patch는 적용하지 않았다. next pointer는 W10으로 유지한다.

## 2026-06-28 · W10 docs/AGENTS.md parent 공통 계약 재구성 적용

### Scope

- @user가 제안·독립 리뷰·보완 판정을 거친 `docs/AGENTS.md` 재구성 반영을 승인했다.
- 변경 파일: `docs/AGENTS.md`와 이 실행 ledger. Child AGENTS 5종, owner content 문서와 architecture prototype은 이번
  변경에서 수정하지 않았다.
- 적용 목적: 공통 full skeleton 착시를 제거하고 durable docs 완성/복원 기준, 가장 좁은 유효 범위 placement,
  조건부 Related/Status/Evidence/Sources, read/change validation 경계를 parent 계약에 명시한다.

### Old → New Rule Mapping Ledger

| 기존 위치(변경 전) | Load-bearing contract                                                           | 새 위치/처리                                                                                | 판정                                                     |
| ------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| lines 1–13         | docs identity, Obsidian/json-canvas skill routing, project-rule precedence      | intro lines 1–13                                                                            | keep                                                     |
| lines 15–21        | child AGENTS routing                                                            | `Owner Boundary` lines 29–41, identity/status/subtype/composition/validation ownership 명시 | move + clarify                                           |
| lines 23–30        | duplicate 금지, owner 위임, question owner, split/inbound 보존                  | `Owner Boundary` lines 29–46                                                                | keep + regroup                                           |
| lines 34–38        | frontmatter gate, body sections default, empty headings omission                | `Structure And Placement` lines 48–54                                                       | keep                                                     |
| lines 40–43        | Related/Status/Evidence/Sources 병렬 defaults                                   | `Context, State, And Traceability`의 조건부 subsections                                     | rewrite; parallel-default 해석 delete                    |
| line 44            | 다른 owner 내용을 skeleton에 복사 금지                                          | `Structure And Placement` line 61                                                           | keep                                                     |
| lines 46–53        | Related vs body link, decorative graph 금지, first meaningful link              | `Links And Read Paths` lines 65–80                                                          | rewrite + narrow; body default/Related prerequisite-only |
| lines 55–66        | stable section hint, repo path, heading 조건, block 금지, bulk conversion 금지  | `Links And Read Paths` lines 82–90                                                          | keep                                                     |
| lines 68–76        | document/inline status placement, child vocabulary, generic mapping 금지        | `Status` lines 92–102                                                                       | rewrite + preserve constraints                           |
| lines 78–85        | code/tests fact owner, Evidence/Sources 의미, code range와 provenance path 형식 | `Evidence` lines 104–116 + `Sources` lines 127–135                                          | split + expand                                           |
| lines 87–98        | Evidence와 Sources 결합 예시                                                    | block Evidence 예시만 lines 118–125에 보존; `Sources: logs/...` placeholder 삭제            | rewrite; optional Sources default pressure 제거          |
| lines 100–105      | inline code stability와 validator                                               | 독립 `Markdown Validation` lines 179–184                                                    | move                                                     |
| lines 107–113      | current evidence, conflict resolution 위임, silent intent change 금지·보고/승인 | `Change And Drift Validation` lines 149–169                                                 | move + generic loop 확장                                 |
| lines 115–121      | logs/plans 비권위, provenance, owner 증류                                       | `Logs And Plans` lines 171–177                                                              | keep                                                     |
| lines 123–127      | concise writing, owner copy 금지, semantic 구분                                 | `Writing Style` lines 186–190                                                               | keep                                                     |

의도적으로 추가한 공통 계약:

- `Purpose And Sufficiency`: 문서+최소 read path로 owner/scope/intent/state/contract/invariant/dependency/verification을
  과거 logs 없이 복원하는 완성 기준과 durable 승격 경계.
- `Reading And Context Recovery`: 질문에 비례한 owner/minimal read path/state 분류와 actual claim 조건부 code/test 검증.
- `Change And Drift Validation`: 영향 범위 비례, stale-side-only 정합, post-change 복원 검증, generic deletion gate.
- Parent는 generic loop만, child는 type-specific extension만 소유한다는 de-dup 경계.

### Evidence Ledger

| Check                                  | Result | Evidence                                                                                                           |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| inline-code span                       | PASS   | `scripts/check-markdown-inline-code docs/AGENTS.md` exit 0                                                         |
| whitespace/patch integrity             | PASS   | `git diff --check -- docs/AGENTS.md` exit 0                                                                        |
| heading structure                      | PASS   | `rg -n '^(##                                                                                                       | ###) ' docs/AGENTS.md`로 Purpose→Owner→Placement→construct→Read→Change→Logs→Markdown→Style 순서 확인 |
| link mechanics preservation            | PASS   | repo path, conditional heading link, block-link 금지, bulk wikilink conversion 금지 문구 lines 87–90 확인          |
| status semantics preservation          | PASS   | child vocabulary + owner semantic→generic mapping 금지 lines 100–102 확인                                          |
| evidence/source mechanics preservation | PASS   | code/test wikilink + exact range lines 113–116, backtick provenance path line 133 확인                             |
| drift/log contracts preservation       | PASS   | silent intent change 금지 lines 167–169, logs/plans 비권위 line 175 확인                                           |
| scope isolation                        | PASS   | `git status --short`에서 기존 architecture prototype·현재 log 외 새 변경은 `docs/AGENTS.md`뿐; child AGENTS 미수정 |

### Decision Candidates / Cross-Owner Effects

- Parent 공통 계약은 승인·반영됐지만 W10은 미완료다. Child architecture/specs/guides/decisions skeleton의 hard-coded
  `Related`, `Status: Current`, Implementation Evidence, Open Questions, Sources와 generic Validation 반복은 새 parent 기준으로
  전수 판정해야 한다. Product/roadmap은 충돌 여부만 확인한다.
- 이 child 정합은 W6가 아니라 W10 범위다. W10에서 child AGENTS를 승인 반영·검증하고 architecture prototype을 재판정한
  뒤에만 W6 owner-doc retrofit으로 복귀한다.
- 대표 architecture prototype의 top decision `Related` 중복과 `Status: Current`는 새 규칙에 의해 자동 승인되지 않는다.
  Claim-local body link와 document-level status 필요성을 다시 판정한다.

### Closeout / Next

- `docs/AGENTS.md` parent 반영: PASS.
- W10 next: 새 parent 계약을 기준으로 child AGENTS 5종의 section contract와 Validation을 owner별로
  `required | optional | absorb | subtype-only | delete` 판정하고 exact patch를 사용자에게 제안한다.
- Work Items 구조는 변경하지 않았다. W10 active, W6/W7 open, stage 8 log open을 유지한다.

## 2026-06-28 · W10 docs/AGENTS.md parent 리뷰 후속 보정 — 적용 범위·Evidence/Sources placement

- @user가 적용을 승인해 직전 parent 공통 계약을 독립 리뷰한 결과의 4개 보정 사항을 `docs/AGENTS.md`에 반영했다.

### 반영

1. `Purpose And Sufficiency`: owner/scope/intent/status/contract/invariant/dependency/verification 목록이 모든 문서의 고정 체크리스트로 읽히지 않도록, “그 문서가 소유한 질문에 적용되는” 항목을 복원한다는 범위로 한정했다.
2. `Evidence`: subsection-local block 조건을 “여러 claim이 같은 근거를 공유할 때만”에서 단일 claim의 복수 evidence, 공유 evidence, inline 배치의 가독성 저하까지 포함하도록 넓혔다. 판정 기준은 cardinality가 아니라 가장 좁고 유용한 범위와 claim↔evidence mapping 보존이다.
3. Block evidence 예: 고립된 file/range 목록을 인접 claim + claim label + code link/range 구조로 바꿔 본문 mapping 규칙을 예시가 직접 준수하게 했다.
4. `Sources`: 단일 claim의 복수 source, 여러 claim의 공유 계보, body 배치의 가독성 저하를 section-local/document-end block 조건으로 명시했다. 문서 끝 block은 document-wide provenance와 source↔claim 관계 복원 가능성이 있을 때만 쓴다.

### 검증 및 현재 상태

- `scripts/check-markdown-inline-code docs/AGENTS.md` → exit 0 (PASS).
- `git diff --check -- docs/AGENTS.md` → exit 0 (PASS).
- Parent 구조와 나머지 load-bearing 규칙은 유지했다. Child AGENTS 5종과 architecture prototype은 이번 후속에서 수정하지 않았다.
- W10은 계속 active다. 다음 행동은 보정된 parent 계약을 기준으로 child AGENTS 5종의 section contract와 Validation을 `required | optional | absorb | subtype-only | delete`로 판정하고 exact patch를 제안하는 것이다. W6/W7은 open으로 유지한다.

## 2026-06-28 · 세션 handoff — child AGENTS 전수 정합은 다음 세션

- @user가 `docs/AGENTS.md` parent 재구성과 후속 보정을 이 세션의 종료점으로 두고, child AGENTS 전수 정합은 다음
  세션에서 재개하기로 했다.
- 현재 완료 상태: `docs/AGENTS.md` parent 공통 계약 반영·후속 보정·검증 PASS. 실행·old→new mapping ledger는 직전 두
  블록이 소유한다.
- 다음 세션 시작점: W10 active. 최신 `docs/AGENTS.md`를 기준으로 architecture/specs/decisions/guides/product AGENTS의
  section contract와 generic Validation 중복을 owner별 `required | optional | absorb | subtype-only | delete`로 판정하고
  exact patch를 사용자에게 제안한다.
- 재개 금지: child 규칙 확정 전 W6 architecture/specs/decisions owner-doc retrofit 재개, architecture prototype을 승인된
  corpus-wide pattern으로 확산, 기존 §N/§N.x heading·anchor 변경.
- Working tree의 `docs/AGENTS.md`, 현재 log, 기존 architecture prototype 변경은 다음 세션 입력이므로 되돌리지 않는다.
- Work Items와 pointer는 변경하지 않는다. W10 active, W6/W7 open, stage 8 log open을 유지한다.

## 2026-06-28 · W10 architecture AGENTS section contract 정합

- @user가 W10의 다음 대상으로 architecture AGENTS를 진행하라고 지시했다. 범위는 `docs/architecture/AGENTS.md` 1개로 제한했다.

### Section Contract 판정

| 대상                              | 판정                                 | 반영                                                                                                                                                                            |
| --------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Related:`                        | optional                             | slice skeleton의 기본 항목에서 제거하고, document-level prerequisite가 있고 body link로 국소화하면 의미가 손상될 때만 쓰도록 조건화했다.                                        |
| `Status:`                         | optional                             | skeleton의 기본 `Status: Current`를 제거하고, document-wide lifecycle 값일 때만 body 상단에 두며 mixed-state는 inline status를 쓰도록 조건화했다.                               |
| `Evidence:`                       | required obligation / optional block | current/as-built 구현 주장은 code/test evidence로 검증 가능해야 한다는 obligation은 유지하고, block은 claim↔evidence mapping 보존이 필요할 때만 쓰도록 바꿨다.                  |
| `Implementation Evidence` section | absorb/delete                        | 고정 section heading에서 제거하고 parent Evidence 규칙 + architecture claim-local evidence 예시로 흡수했다.                                                                     |
| `Sources:`                        | optional                             | skeleton 기본 section에서 제거하고 provenance가 현재 판단·재검토·삭제 안전성에 필요할 때만 쓰도록 조건화했다.                                                                   |
| Validation                        | subtype-only                         | 공통 change/drift loop 반복을 줄이고, architecture claim을 `As-built`/current behavior, `Current`, `Target`/`Proposed`로 먼저 분류한 뒤 필요한 owner/code 검증을 하도록 좁혔다. |

### 반영

- `docs/architecture/AGENTS.md` intro의 parent 공통 규칙 참조를 최신 `change/drift validation` 표현과 맞췄다.
- §1의 줄바꿈으로 깨진 `링크하고`를 정정했다.
- §2 evidence 예시를 parent Evidence 예시와 맞게 claim label이 있는 mapping 형태로 바꿨다.
- §4 skeleton에서 hard-coded `Related`, `Status: Current`, `Implementation Evidence`, `Sources`를 제거하고 조건부 composition 규칙과 최소 body skeleton으로 재작성했다.
- §5 parent 참조를 `Staleness And Drift`에서 `Change And Drift Validation`으로 갱신했다.
- §6 validation을 architecture-specific claim classification과 owner/code 검증 조건으로 정리했다.

### 검증

- `scripts/check-markdown-inline-code docs/architecture/AGENTS.md` → exit 0 (PASS).
- `git diff --check -- docs/architecture/AGENTS.md` → exit 0 (PASS).

### Next

- W10은 아직 완료하지 않는다. 다음 대상은 `docs/specs/AGENTS.md`, `docs/decisions/AGENTS.md`, `docs/guides/AGENTS.md`, `docs/product/AGENTS.md` 중 하나다.
- Work Items와 next pointer는 변경하지 않는다. W10 active, W6/W7 open 유지.

## 2026-06-28 · W10 architecture AGENTS subtype/composition 보정

- @user가 architecture 지침의 section/evidence 패턴이 evidence에만 제한되는지 질문하며, compact component·catalog·sequence·cross-cutting invariant·mixed current/target·index/hub·gap/absence·proposed architecture 케이스를 제시했다.
- 판단: 이 패턴은 evidence 배치표로만 둘 것이 아니라 architecture document subtype 판정과 composition block 선택 규칙으로 격상해야 한다. 이유는 `Flow`, `Evidence`, `Drift/Gaps`, `Sources`, `Status`가 모두 문서 subtype과 claim type에 따라 달라지며, 단일 full skeleton은 compact component/flow 케이스를 모든 architecture 문서에 과적용하게 만들기 때문이다.

### 반영

- `docs/architecture/AGENTS.md` §4를 `Architecture Slice Skeleton`에서 `Architecture Subtypes And Composition`으로 변경했다.
- 단일 full skeleton을 삭제하고, 다음 subtype 판정표를 추가했다: compact component, dense schema/catalog, end-to-end sequence, cross-cutting invariant, mixed current/target, index/hub, gap/absence claim, proposed architecture.
- `Responsibility`, `Flow`, `Evidence`, `Drift / Gaps`, `Sources`를 고정 skeleton section이 아니라 조건부 composition block으로 정의했다.
- 공통 invariant를 추가했다: owner boundary/status/claim-evidence 대응, target/proposed에는 code evidence를 붙이지 않음, current/as-built 구현 주장은 code/test evidence로 검증 가능해야 함.
- 사용자 예시 취지를 반영해 cross-cutting invariant 예시와 target architecture 예시를 추가했다.

### 검증

- `scripts/check-markdown-inline-code docs/architecture/AGENTS.md` → exit 0 (PASS).
- `git diff --check -- docs/architecture/AGENTS.md` → exit 0 (PASS).

### Next

- W10은 계속 active다. Architecture child AGENTS는 parent 공통 계약 기준 정합과 subtype/composition 보정까지 반영됐다.
- 다음 대상은 `docs/specs/AGENTS.md`, `docs/decisions/AGENTS.md`, `docs/guides/AGENTS.md`, `docs/product/AGENTS.md` 중 하나다.

## 2026-06-28 · W10 architecture AGENTS subtype/composition 보정 철회

- @user가 직전 subtype/composition 보정을 "처음 수정한거"로 되돌리라고 지시했다.
- 반영: `docs/architecture/AGENTS.md` §4를 `Architecture Subtypes And Composition`에서 첫 수정 상태인 `Architecture Slice Skeleton`으로 되돌렸다.
- 유지: 첫 수정에서 적용한 parent 공통 규칙 참조 갱신, `링크하고` 줄바꿈 정정, §2 evidence mapping 예시, §5 `Change And Drift Validation` 참조, §6 claim classification validation 보정은 그대로 유지했다.
- 검증: `scripts/check-markdown-inline-code docs/architecture/AGENTS.md` → exit 0 (PASS). `git diff --check -- docs/architecture/AGENTS.md` → exit 0 (PASS).
- Work Items와 next pointer는 변경하지 않는다. W10 active 유지.

## 2026-06-28 · W10 architecture AGENTS 철회 리뷰 후속 제안

- @user가 직전 subtype/composition 보정 철회 후 @claude 리뷰를 제공하고, 현재 어떻게 진행할지 제안을 요청했다.
- [Fact] 현행 `docs/AGENTS.md`는 child AGENTS가 type identity, status vocabulary, subtype, section composition과 type-specific validation을 소유한다고 명시한다(lines 34-47). `Structure And Placement`는 construct를 조건부 composition block으로 두고, child가 적용 조건을 만족하는 block만 subtype 구조에 포함한다고 명시한다(lines 57-62).
- [Fact] 현행 `docs/architecture/AGENTS.md` §4는 `Architecture Slice Skeleton`으로 남아 있으며, `Related`/`Status`/`Evidence`/`Sources`는 조건부로 좁혔지만 body 예시는 `Responsibility`/`Flow`/`Drift / Gaps` 단일 skeleton을 default 형태로 제시한다(lines 68-98).
- [Assessment] 철회된 8-subtype 표는 닫힌 메뉴로 읽히는 문제가 있었고 철회는 타당하다. 다만 현재 §4도 단일 body skeleton이 architecture slice의 유일한 기본형처럼 읽힐 수 있어 parent의 열린 composition 원칙을 완전히 반영하지 못한다.
- [Proposal] 다음 patch 후보는 닫힌 subtype 표로 돌아가지 않고, §1/§4를 `상위 docs 공통 계약 상속 + architecture 역할 + 열린 section composition` framing으로 보정한다. `Responsibility`/`Flow`/`Drift / Gaps`는 강제 skeleton이 아니라 흔한 compact slice 예시로만 남기는 방향(A)이 적절하다. 단, 예시 heading이 실제 권위처럼 새어 나가지 않도록 `common compact form, not required` 라벨을 붙이고, catalog/index/cross-cutting invariant/target-only 문서는 질문에 맞게 다른 section 조합을 쓴다는 문장을 둔다.
- [Next] 사용자 승인 전 `docs/architecture/AGENTS.md`는 수정하지 않는다. 승인되면 §4 exact patch를 먼저 제시/적용하고 inline-code + diff check를 수행한다. W10 active 유지.

## 2026-06-28 · W10 architecture AGENTS 열린 composition 반영

- @user가 직전 제안 반영을 지시했다.
- 변경 파일: `docs/architecture/AGENTS.md`.
- 반영 내용:
  - §1에 `상속 + architecture 역할` bullet을 추가해 architecture 문서가 상위 `docs/AGENTS`의 owner boundary, placement, links, status, evidence, drift validation을 상속하고, 그 위에서 내부 구조·책임·경계·flow·lifecycle/state invariant를 as-built/current/target/proposed 의미에 맞게 복원하도록 section을 구성한다고 명시했다.
  - §4 제목을 `Architecture Slice Skeleton`에서 `Architecture Slice Composition`으로 바꿨다.
  - §4 도입을 고정 skeleton/subtype 목록 채우기 금지 + architecture 질문과 parent의 가장 좁은 유효 범위 원칙에 따른 열린 section composition으로 재작성했다.
  - architecture content 후보(책임/경계, flow, lifecycle/state invariant, current gap, target/proposed 구조, schema/catalog, cross-cutting invariant)를 닫힌 subtype 분류가 아니라 authoring 중 확인할 수 있는 열린 후보로 제시했다.
  - `Responsibility`/`Flow`/`Drift / Gaps` 예시는 `흔한 compact slice form 예시(강제 아님)`으로 낮춰 유지했다.
  - `Related`/`Status`/`Evidence`/`Sources` 조건부 규칙은 유지했다.
- 검증 ledger:
  - `scripts/check-markdown-inline-code docs/architecture/AGENTS.md` → exit 0 (PASS).
  - `git diff --check -- docs/architecture/AGENTS.md` → exit 0 (PASS).
- W10은 계속 active다. 다음 대상은 `docs/specs/AGENTS.md`, `docs/decisions/AGENTS.md`, `docs/guides/AGENTS.md`, `docs/product/AGENTS.md` 중 하나다.

## 2026-06-28 · W10 architecture AGENTS traceability 예시 배치 보정

- @user가 §4의 Evidence/Sources 예시가 compact form의 `Drift / Gaps` 내용처럼 읽히는 문제를 지적했다.
- [Assessment] 해당 예시는 drift/gap 내용이 아니라 `Related`/`Status`/`Evidence`/`Sources` 조건부 traceability 규칙의 예시다. compact form 예시 바로 뒤에 붙어 있어 fenced example 경계는 맞지만 개념 배치가 혼동을 만든다.
- 반영: `docs/architecture/AGENTS.md` §4에서 Evidence/Sources 예시를 `Traceability 예시`로 라벨하고 조건부 traceability bullet 바로 아래로 이동했다. `Responsibility`/`Flow`/`Drift / Gaps` compact form 예시는 별도 예시로 마지막에 남겼다.
- 검증: `scripts/check-markdown-inline-code docs/architecture/AGENTS.md` exit 0 (PASS), `git diff --check -- docs/architecture/AGENTS.md` exit 0 (PASS).

## 2026-06-28 · W10 docs→architecture AGENTS 구조 리뷰

- @user가 `docs/AGENTS.md`부터 `docs/architecture/AGENTS.md`까지 parent→child 계약 흐름 검토를 요청했다. 파일 수정 없이 review로 수행했다.
- [Fact] `docs/AGENTS.md`는 child AGENTS가 type identity/status vocabulary/subtype/section composition/type-specific validation을 소유한다고 하며(lines 34-47), context/state/traceability construct를 공통 skeleton 필드가 아니라 조건부 composition block으로 둔다(lines 57-62).
- [Fact] `docs/architecture/AGENTS.md` §4는 열린 composition framing으로 바뀌었지만, `Related`/`Status`/`Evidence`/`Sources` 조건과 `Traceability 예시`를 child 안에 다시 둔다(lines 81-107).
- [Finding] Child의 `Traceability 예시` 중 standalone `Sources:` block은 parent `Sources` 규칙의 source↔claim 관계 복원 조건을 충분히 보여주지 못한다. 이 예시는 document-end `Sources:`를 일반 placeholder처럼 읽게 할 수 있어 삭제하거나 claim-local provenance 예시로 바꾸는 것이 낫다.
- [Finding] §4의 `Related`/`Status`/`Evidence`/`Sources` 조건 bullets와 traceability examples는 대부분 parent 공통 규칙 재서술이다. Architecture 전용 의미가 약하므로 parent 링크/위임으로 줄이고, child에는 architecture-specific obligation(`As-built` 구조 claim은 code/test 검증 가능해야 함)만 남기는 편이 parent-child boundary와 맞다.
- [Finding] §1의 `상속 + architecture 역할` bullet은 parent 계약 항목을 열거하지만 `Sources`, reading recovery, markdown validation 등 parent 공통 규칙 일부가 빠져 닫힌 상속 목록처럼 읽힐 수 있다. `상위 docs/AGENTS 공통 계약을 상속한다`로 축약하는 편이 drift 위험이 낮다.
- 검증 보조: `scripts/check-markdown-inline-code docs/AGENTS.md docs/architecture/AGENTS.md` exit 0 (PASS), `git diff --check -- docs/AGENTS.md docs/architecture/AGENTS.md` exit 0 (PASS).
- Next candidate: 사용자 승인 시 위 3건을 반영해 `docs/architecture/AGENTS.md` §1/§4를 더 축약하고 parent 위임 중심으로 정리한다.

## 2026-06-28 · W10 architecture AGENTS parent 중복 축약 반영

- @user가 직전 `docs/AGENTS.md`→`docs/architecture/AGENTS.md` 구조 리뷰 findings 반영을 지시했다.
- 변경 파일: `docs/architecture/AGENTS.md`.
- 반영:
  - §1 `상속 + architecture 역할` bullet에서 parent 계약 항목 열거를 삭제하고 `상위 docs/AGENTS 공통 계약을 상속한다`로 축약했다. 닫힌 상속 목록처럼 읽히는 위험을 줄였다.
  - §4의 `Related`/`Status`/`Evidence`/`Sources` 조건 bullets를 parent 위임 문장으로 축약했다.
  - Architecture child 고유 의무만 남겼다: current/as-built 내부 구조 주장은 code/test evidence로 검증 가능해야 한다.
  - standalone `Sources:` 예시는 삭제했다. parent `Sources` 규칙의 source↔claim 관계 복원 조건을 약화시키지 않기 위함이다.
  - `Traceability 예시` 라벨은 `Architecture evidence mapping 예시`로 좁혔다.
- 검증: `scripts/check-markdown-inline-code docs/architecture/AGENTS.md` exit 0 (PASS), `git diff --check -- docs/architecture/AGENTS.md` exit 0 (PASS).
- W10 active 유지. Architecture AGENTS는 parent 중복 축약까지 반영됐고, 다음 child AGENTS 대상은 아직 남아 있다.

## 2026-06-28 · W10 specs AGENTS 구조 검토 — 보고/제안, 미적용

- @user가 `docs/specs/AGENTS.md`에 대한 검토와 보고 및 제안을 요청했다. 파일 수정 없이 review로 수행했다.
- [Fact] `docs/AGENTS.md`는 child AGENTS가 type identity, status vocabulary, subtype, section composition과
  type-specific validation을 소유한다고 하며, 공통 traceability construct는 조건부 composition block이지 공통 skeleton
  필드가 아니라고 한다.
- [Fact] 현행 `docs/specs/AGENTS.md` §4 skeleton은 `Related:`, `Status: Current`, `## Implementation Evidence`,
  `Evidence:`, `## Open Questions`, `## Sources`를 예시 skeleton 안에 기본 형태로 둔다.
- [Fact] 현재 spec slice 7개는 모두 상단 `> 컨텍스트:` 콜아웃을 쓰고, `Related:`/`Status:`/`Evidence:`/
  `Sources:`/`## Implementation Evidence`는 corpus 안에 없다. `aiox-message-lifecycle.md`에는 inline current evidence가
  이미 claim 근처에 붙어 있다.
- [Finding] §4는 parent 재구성 뒤 hard-coded traceability field를 아직 skeleton default처럼 보여준다. `Related`, document-level
  `Status`, `Sources`는 parent 조건을 만족할 때만 쓰는 optional block으로 낮춰야 한다.
- [Finding] `Implementation Evidence`는 spec-specific section heading으로 고정할 필요가 약하다. Spec child 고유 의무는
  current/as-built contract claim이 code/test evidence로 검증 가능해야 한다는 점이고, evidence block 배치와 mapping 형식은
  parent `Evidence` 규칙으로 충분하다.
- [Finding] §5가 상위 `Staleness And Drift`를 참조하지만 현재 parent heading은 `Change And Drift Validation`이다. 참조를
  갱신해야 한다.
- [Proposal] 승인 시 `docs/specs/AGENTS.md`를 architecture child와 같은 방향으로 축약한다: intro는 parent 공통 계약 상속으로
  넓히고, §4는 `Spec Slice Composition`으로 바꿔 contract-focused section 후보와 compact slice 예시를 둔다. `Related`/
  `Status`/`Evidence`/`Sources` 조건은 parent 위임으로 축약하고, spec 고유 의무(current/as-built contract claim은 code/test
  evidence로 검증 가능)를 남긴다. `Open Questions`는 open/deferred contract 질문이 있을 때만 쓰는 optional body section으로
  둔다.
- 적용은 아직 하지 않았다. W10 active와 Work Items는 유지한다.

## 2026-06-28 · W10 specs AGENTS section contract 정합 반영

- @user가 직전 specs AGENTS 검토 제안 반영을 지시했다.
- 변경 파일: `docs/specs/AGENTS.md`.
- 반영:
  - intro의 parent 공통 규칙 참조를 최신 `change/drift validation` 표현과 맞췄다.
  - §1에 `상속 + spec 역할` bullet을 추가해 spec 문서가 상위 `docs/AGENTS` 공통 계약을 상속하고, 외부 contract,
    compatibility rule, protocol state, externally observable lifecycle을 normative/current/target/open 의미에 맞게
    복원하도록 section을 구성한다고 명시했다.
  - §4 제목을 `Spec Slice Skeleton`에서 `Spec Slice Composition`으로 바꿨다.
  - §4 도입을 고정 skeleton 채우기 금지 + spec 질문과 parent의 가장 좁은 유효 범위 원칙에 따른 section composition으로
    재작성했다.
  - spec content 후보(scope, normative contract, field/state table, protocol behavior, compatibility rule,
    externally observable lifecycle/state transition, current implementation caveat, open/deferred contract question)를 닫힌
    subtype 분류가 아니라 authoring 중 확인할 수 있는 후보로 제시했다.
  - `Related`/`Status`/`Evidence`/`Sources` 조건은 parent 위임 문장으로 축약하고, spec child 고유 의무만 남겼다:
    current/as-built contract claim은 code/test evidence로 검증 가능해야 한다.
  - `Implementation Evidence`와 standalone `Sources` skeleton 예시는 삭제했다.
  - `Open Questions`는 open/deferred contract 질문이 있을 때만 쓰는 optional body section으로 낮췄다.
  - §5 parent 참조를 `Staleness And Drift`에서 `Change And Drift Validation`으로 갱신했다.
- 검증: `scripts/check-markdown-inline-code docs/specs/AGENTS.md` exit 0 (PASS), `git diff --check -- docs/specs/AGENTS.md` exit 0
  (PASS).
- W10 active 유지. Architecture와 specs AGENTS는 parent 공통 계약 기준 정합 반영이 끝났고, 다음 child AGENTS 대상은
  `docs/decisions/AGENTS.md`, `docs/guides/AGENTS.md`, `docs/product/AGENTS.md` 중 하나다.

## 2026-06-28 · W10 specs AGENTS 리뷰 후속 보정 반영

- @user가 @claude의 적용본 구조 리뷰를 제공했고, "놓친 부분이 있을 수 있다"는 의심을 제기했다. @codex가 독립 검토 후
  Finding A는 local-only로 수용하되, specs status vocabulary에 없는 architecture 어휘 `as-built`가 specs 문서에 남은 점을
  추가 finding으로 보고했다.
- 반영:
  - §2 grandfather 문장을 `aiox-a2a.md`와 이미 분리된 slice는 기존 MUST/SHOULD language, section-level defaults,
    inline status notes를 유지할 수 있고, 새 slice 작성 또는 기존 slice retrofit 때 status vocabulary를 사용하되 기존 section
    의미를 보존한다고 정리했다.
  - §4/§5의 `current/as-built` 표현을 specs vocabulary에 맞춰 `Current` contract 또는 current implementation claim/동작
    주장으로 바꿨다.
  - §4 compact slice form 예시에서 `## Open Questions`를 제거했다. 조건부 body section이라는 본문 규칙만 남겼다.
  - §6에 spec claim 유형 분류(`Normative`, `Current`, `Committed target`, `Exploratory`, `Open/deferred`)와 `Current`
    contract/current implementation claim의 code/tests 교차 검증 단계를 추가했다.
  - `Normative` 또는 `Committed target` contract 변경 시 product/roadmap scope 영향 확인을 명시했다.
- 검증: `scripts/check-markdown-inline-code docs/specs/AGENTS.md` exit 0 (PASS), `git diff --check -- docs/specs/AGENTS.md` exit 0
  (PASS), `rg -n "as-built|As-built|Staleness And Drift|Implementation Evidence|^Related:|^Status:|^Sources:" docs/specs/AGENTS.md`
  exit 1 (PASS: 남은 match 없음).
- W10 active 유지. Specs AGENTS는 후속 구조 리뷰 보정까지 반영됐다.

## 2026-06-28 · W10 docs→specs AGENTS 최종 검토 보정 + 세션 handoff

- @user가 `docs/AGENTS.md`부터 `docs/specs/AGENTS.md`까지 parent→child 계약 흐름 검토를 요청했다. 파일 수정 전 review로
  수행했다.
- [Fact] `docs/AGENTS.md`는 변경 검증을 영향 범위에 비례시키며, child AGENTS는 공통 loop를 반복하지 않고 자기 type에
  필요한 owner check와 invariant를 추가한다고 한다.
- [Finding] `docs/specs/AGENTS.md` §6의 product/roadmap 확인 조건이 `Normative`/`Committed target` contract 변경에 묶여
  있었다. 그러나 새 spec 영역 추가, `Exploratory` 또는 `Open/deferred` contract 질문도 product scope나 roadmap priority에
  영향을 줄 수 있으므로 status type보다 영향 범위 조건으로 쓰는 편이 parent 계약과 더 정합하다고 판정했다.
- @user가 반영 후 다음 세션에서 다른 문서를 하자고 지시했다.
- 반영: §6 product/roadmap 확인 bullet을 "새 spec 영역을 추가하거나, 변경이 product scope나 roadmap priority를 확장할 위험이
  있으면 확인한다. `Normative` 또는 `Committed target` contract를 바꿀 때는 이 확인을 특히 빠뜨리지 않는다"로 보정했다.
- 검증: `scripts/check-markdown-inline-code docs/specs/AGENTS.md` exit 0 (PASS), `git diff --check -- docs/specs/AGENTS.md` exit 0
  (PASS).
- 세션 handoff: Specs AGENTS는 parent→child 최종 검토 보정까지 반영 완료로 본다. W10 active는 유지한다. 다음 세션은 남은
  child AGENTS 중 `docs/decisions/AGENTS.md`, `docs/guides/AGENTS.md`, `docs/product/AGENTS.md` 중 하나를 같은 방식으로 검토한다.
  Work Items와 next pointer는 변경하지 않는다.

## 2026-06-28 · W10 decisions AGENTS section contract 정합 반영

- @user가 `docs/decisions/AGENTS.md` 검토와 제안을 요청했고, 후속으로 반영 후 로그 기록을 지시했다.
- 범위는 `docs/decisions/AGENTS.md` 1개로 제한했다. Parent 계약은 `docs/AGENTS.md`, owner map은
  `docs/documentation-system.md`, 실제 corpus는 `docs/decisions/*.md`의 heading/link/source 사용 패턴으로 확인했다.

### 확인한 사실

- `docs/AGENTS.md`는 child AGENTS가 type identity, status vocabulary, subtype, section composition과 type-specific
  validation을 소유한다고 하며, `Related:`, `Status:`, `Evidence:`, `Sources:`를 공통 skeleton field가 아니라 조건부
  composition block으로 둔다.
- decision corpus는 `AGENTS.md`/`CLAUDE.md` 제외 시 모두 `Context` → `Decision` → `Alternatives` → `Rationale` →
  `Trade-offs` → `Re-evaluation` → `Sources` 구조를 쓴다.
- 실제 decision 본문에는 `Related:`가 없고, outcome owner 링크는 본문 claim 근처나 `Sources`에 있다.
- decision type은 accepted load-bearing rationale snapshot 성격이므로 document-level `Status:` 미사용과 기존 decision을
  현재 상태로 patch하지 않는 규칙은 parent 계약과 충돌하지 않는다.

### 판정

| 대상                        | 판정                                   | 근거                                                                                                        |
| --------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Related:` skeleton default | delete                                 | parent 조건상 document-level prerequisite가 있을 때만 쓰며, corpus에서도 기본값으로 쓰지 않음               |
| `Sources` section           | required default / conditional content | decision provenance snapshot 성격과 corpus 구조상 skeleton에는 유지하되, source↔claim 관계 복원 조건을 명시 |
| document-level `Status:`    | delete                                 | decision type 자체가 accepted rationale snapshot lifecycle을 충분히 규정                                    |
| outcome owner check         | required                               | decision은 WHY만 소유하므로 outcome owner 식별과 owner 반영 확인이 필요                                     |
| parent heading reference    | absorb/update                          | `staleness` 표현을 최신 parent `change/drift validation`으로 갱신                                           |

### 반영

- `docs/decisions/AGENTS.md` intro의 parent 공통 규칙 참조를 `staleness`에서 `change/drift validation`으로 갱신했다.
- §1 outcome bullet을 `Related:` 또는 본문 링크에서 참조한다는 표현에서, claim 가까이의 본문 링크를 기본으로 하고
  `Related:`는 상위 조건을 만족할 때만 쓰는 표현으로 바꿨다.
- §4 skeleton에서 `Related:` 기본 block을 제거했다.
- §4 뒤에 `Sources` 사용 조건을 보강했다: 결정 계보와 source↔claim 관계를 복원해야 할 때 사용하며, 특정 claim에만 필요한
  outcome owner 링크는 `Related:`나 `Sources`에 반복하지 않고 본문 가까이에 둔다.
- §5 작성 전/후 check를 outcome owner 식별 흐름으로 정리했다. 이미 반영된 outcome은 복사하지 않고 참조하며, 아직 owner
  반영 전이면 decision만으로 owner 반영이 끝난 것처럼 두지 않게 했다.

### 검증

- `scripts/check-markdown-inline-code docs/decisions/AGENTS.md` → exit 0 (PASS).
- `git diff --check -- docs/decisions/AGENTS.md` → exit 0 (PASS).

### Next

- Decisions AGENTS는 W10 parent 공통 계약 기준 정합 반영이 끝났다.
- W10은 계속 active다. 다음 대상은 `docs/guides/AGENTS.md`, `docs/product/AGENTS.md` 중 하나다.
- Work Items와 next pointer는 변경하지 않는다. W6/W7은 W10 완료 전 재개하지 않는다.

## 2026-06-28 · W10 guides AGENTS 구조 검토 — 보고/제안, 미적용

- @user가 `docs/guides/AGENTS.md` 검토와 제안을 요청했다. 파일 수정 없이 review로 수행했다.
- 범위는 `docs/AGENTS.md`, `docs/documentation-system.md`, `docs/guides/AGENTS.md`, 실제 guides corpus
  (`docs/guides/workflow.md`)로 제한했다.

### 확인한 사실

- `docs/AGENTS.md`는 child AGENTS가 type identity, status vocabulary, subtype, section composition과
  type-specific validation을 소유한다고 하며, `Related:`, `Status:`, `Evidence:`, `Sources:`를 공통 skeleton field가
  아니라 조건부 composition block으로 둔다.
- `docs/documentation-system.md`는 guides가 반복 적용 방법과 실무 흐름을 소유하되, 제품 사실·구현 commitment·구속적
  agent policy를 결정하지 않고 해당 owner 문서와 scope `AGENTS.md`를 참조한다고 정의한다.
- 현재 `docs/guides/`의 durable guide corpus는 `workflow.md` 1개이며, 이 문서는 스스로 비권위 guide라고 밝히고 owner
  문서 목록과 작업 흐름 설명을 제공한다. `Related:`, `Status:`, `Sources:`, runbook skeleton section은 쓰지 않는다.
- 현행 `docs/guides/AGENTS.md` skeleton 예시는 `Related:`, `Status: Current`, `## Sources`를 기본 형태로 보여주며,
  validation은 `[[docs/AGENTS]] Staleness And Drift`라는 옛 heading을 참조한다.

### Findings

- `Guide Skeleton`은 parent 재구성 뒤 hard-coded traceability field를 아직 기본 skeleton처럼 보여준다. `Related`,
  document-level `Status`, `Sources`는 parent 조건을 만족할 때만 쓰는 optional block으로 낮춰야 한다.
- `Status: Current`는 guide type의 document-level status vocabulary 예시로는 유효하지만, runbook/how-to skeleton의
  기본값처럼 두면 parent의 "문서 전체 lifecycle을 오해 없이 설명할 때만" 규칙보다 넓게 읽힐 수 있다.
- `## Sources` 예시는 `logs/...` placeholder만 있어 parent `Sources` 규칙의 source↔claim 관계 복원 조건을 보여주지 못하고,
  모든 guide가 log provenance를 가져야 하는 것처럼 읽힐 수 있다.
- `Validation And Cross-Owner Checks`의 parent heading 참조는 현재 `docs/AGENTS.md`의 `Change And Drift Validation`과
  맞지 않는다.
- Guide 고유 validation의 핵심은 parent loop 반복이 아니라 절차형 문서의 실행 가능성이다. 설명한 command/script/path,
  expected output, failure branch가 현재 code/script와 owner 문서에 맞는지 확인하는 obligation은 유지할 가치가 있다.

### Proposal

- 승인 시 `docs/guides/AGENTS.md`를 좁게 보정한다:
  - intro의 parent 공통 규칙 참조를 최신 `change/drift validation` 표현과 맞춘다.
  - §1 또는 작성 규칙에 `상속 + guide 역할` 문장을 추가해 guides가 상위 공통 계약을 상속하고, 반복 workflow/how-to/runbook을
    실제 적용 순서·확인 출력·실패 분기로 복원하게 한다고 명시한다.
  - `Guide Skeleton`을 `Guide Composition` 또는 `Procedure Guide Composition`으로 바꾸고, 절차형 guide와 explainer guide를
    구분한다. `workflow.md` 같은 explainer는 owner map/read path를 설명하는 흐름 구조를 유지할 수 있다고 둔다.
  - skeleton 예시에서 `Related:`, `Status: Current`, `## Sources` 기본 block을 제거한다. 조건은 parent 위임으로 축약하고,
    필요한 경우 body 가까운 owner link나 optional provenance만 쓰게 한다.
  - 절차형 compact form은 `When To Use` / `Steps` / `Verification` 중심으로 남긴다.
  - validation의 `Staleness And Drift` 참조를 `Change And Drift Validation`으로 갱신하고, guide-specific check를
    command/script/path/output/failure-branch 검증으로 좁힌다.

### Next

- 적용은 아직 하지 않았다. W10 active와 Work Items는 유지한다.

## 2026-06-28 · W10 guides AGENTS section contract 정합 반영

- @user가 직전 guides AGENTS 검토 제안 반영과 로그 기록을 지시했다.
- 변경 파일: `docs/guides/AGENTS.md`.

### 반영

- intro의 parent 공통 규칙 참조를 최신 `change/drift validation` 표현과 맞췄다.
- `작성 규칙`에 `상속 + guide 역할` bullet을 추가했다. Guides는 상위 `docs/AGENTS` 공통 계약을 상속하고,
  반복 workflow/how-to/runbook을 실제 적용 순서, 확인 출력과 실패 분기로 복원할 수 있게 section을 구성한다고 명시했다.
- `Guide Skeleton`을 `Guide Composition`으로 바꿨다.
- 고정 skeleton 채우기 대신 guide 질문과 parent의 가장 좁은 유효 범위 원칙에 맞게 section을 구성하도록 정리했다.
- 절차형 runbook/how-to와 서술형·explainer guide를 구분했다. `docs/guides/workflow.md` 같은 explainer는 owner map,
  read path나 작업 흐름을 설명하는 자기 흐름 구조를 유지할 수 있다고 명시했다.
- skeleton 예시에서 `Related:`, `Status: Current`, `## Sources` 기본 block을 제거했다.
- `Related:`, `Status:`, `Sources:`는 parent 조건을 만족할 때만 쓰고, body link가 owner/source/evidence/read path를
  충분히 설명하면 반복하지 않는다고 축약했다.
- 절차형 compact form 예시는 `When To Use` / `Steps` / `Verification` 중심으로 남겼다.
- `Validation And Cross-Owner Checks`의 parent heading 참조를 `Staleness And Drift`에서
  `Change And Drift Validation`으로 갱신했다.

### 검증

- `scripts/check-markdown-inline-code docs/guides/AGENTS.md` → exit 0 (PASS).
- `git diff --check -- docs/guides/AGENTS.md` → exit 0 (PASS).
- `rg -n "Staleness And Drift|^Related:|^Status:|^Sources:" docs/guides/AGENTS.md` → exit 1 (PASS: 남은 match 없음).

### Next

- Guides AGENTS는 W10 parent 공통 계약 기준 정합 반영이 끝났다.
- W10은 계속 active다. 남은 child AGENTS 대상은 `docs/product/AGENTS.md`다.
- Work Items와 next pointer는 변경하지 않는다. W6/W7은 W10 완료 전 재개하지 않는다.

## 2026-06-28 · W10 product AGENTS section contract 정합 반영

- @user가 `docs/product/AGENTS.md` 검토·제안 뒤 반영과 로그 기록을 지시했다.
- 범위는 `docs/product/AGENTS.md` 1개로 제한했다. Parent 계약은 `docs/AGENTS.md`, owner map은
  `docs/documentation-system.md`, 실제 corpus는 `docs/product/product.md`와 `docs/product/roadmap.md`로 확인했다.

### 확인한 사실

- `docs/product/AGENTS.md`는 `product.md`와 `roadmap.md`를 같은 physical scope 안의 다른 knowledge sub-kind로 나누며,
  이 구분은 `docs/documentation-system.md`의 Product/Roadmap owner 구분과 정합한다.
- 실제 corpus도 이 구분을 따른다. `product.md`는 목적·사용자·scope·principle을 중심으로 쓰고, `roadmap.md`는
  release gates, phases, gate evidence, current execution mapping을 소유한다.
- 다른 child AGENTS에서 문제가 된 hard-coded `Related:`/`Status:`/`Sources:` skeleton default는 product AGENTS에는
  없다. Product는 skeleton 없이 authoring invariant를 쓰고, roadmap은 기존 section ownership을 명시한다.
- 현행 product AGENTS에는 parent의 옛 heading인 `Staleness And Drift` 참조와 `staleness` 요약 표현이 남아 있었다.

### 판정

| 대상                                      | 판정                 | 근거                                                                                  |
| ----------------------------------------- | -------------------- | ------------------------------------------------------------------------------------- |
| product/roadmap sub-kind 구조             | keep                 | owner map·actual corpus와 정합하며 W10 parent 조건부 composition 계약과 충돌하지 않음 |
| product skeleton 없음                     | keep                 | product content는 invariant-primary가 맞고 빈 default section을 만들 필요가 없음      |
| roadmap section ownership                 | keep                 | 실제 `roadmap.md` 구조를 설명하며 plan/spec/architecture owner 경계를 명확히 함       |
| `Related:`/`Status:`/`Sources:` 추가 규칙 | no-change            | parent가 조건을 소유하고 product AGENTS가 기본 skeleton으로 강제하지 않음             |
| parent heading 참조                       | update               | `Staleness And Drift`는 현재 parent heading `Change And Drift Validation`과 불일치    |
| `as-built code 주장` 어휘                 | local wording update | product type 문맥에서는 `현재 구현 동작 주장`이 더 좁고 owner 경계가 선명함           |

### 반영

- intro의 parent 공통 규칙 요약을 `staleness`에서 `change/drift validation`으로 갱신했다.
- `Drift 처리`에서 `[[docs/AGENTS]] Staleness And Drift` 참조를 `[[docs/AGENTS]] Change And Drift Validation`으로
  갱신했다.
- `product.md` 설명의 `as-built code 주장`을 product 문맥에 맞게 `현재 구현 동작 주장`으로 바꿨다.
- gate/target criterion 변경 절차의 parent 참조도 `Change And Drift Validation`으로 갱신했다.

### 검증

- `scripts/check-markdown-inline-code docs/product/AGENTS.md` → exit 0 (PASS).
- `git diff --check -- docs/product/AGENTS.md` → exit 0 (PASS).
- `rg -n "Staleness And Drift|as-built|staleness|^Related:|^Status:|^Sources:" docs/product/AGENTS.md` → exit 1
  (PASS: 남은 match 없음).

### Next

- Product AGENTS는 W10 parent 공통 계약 기준 정합 반영이 끝났다.
- W10 child AGENTS 전수 대상 5종(`architecture`, `specs`, `decisions`, `guides`, `product`)은 모두 정합 반영됐다.
- 다음 행동은 W10 closeout 판정이다. W10 완료 처리 후 next pointer를 W6으로 복귀시켜 architecture → specs → decisions
  순서의 owner-doc retrofit을 재개한다.
- Work Items와 next pointer는 이 블록에서 변경하지 않는다. W10 active, W6/W7 open 유지.

## 2026-06-28 · W10 product owner 문서 traceability 보정

- @user가 현재 `docs/product/AGENTS.md`와 상위 지침서에 근거해 `docs/product/product.md`와
  `docs/product/roadmap.md`를 검토한 뒤 반영과 로그 기록을 지시했다.
- 범위는 `docs/product/product.md`와 `docs/product/roadmap.md`로 제한했다. 기준은 `docs/AGENTS.md`의
  conditional context/state/traceability 계약과 `docs/product/AGENTS.md`의 product/roadmap sub-kind 규칙이다.

### 확인한 사실

- `product.md`는 목적·사용자·scope·principle을 소유하고, protocol contract·runtime structure·release 순서·task owner를
  intro와 body link로 이미 설명한다.
- `product.md`의 top-level `Related:`는 `docs/specs/aiox-a2a`, `docs/architecture/local-agent-runtime`,
  `docs/product/roadmap`을 반복하고 있었고, 같은 target의 관계 의미가 body에도 있었다.
- `product.md`의 `Sources:`는 문서 전체 provenance가 아니라 `External Positioning` section의 A2A 명칭·거버넌스 검증
  근거다.
- `roadmap.md`의 `Related: [[docs/product/product]]`는 roadmap이 product scope 안에서만 우선순위·순서를 소유한다는
  전제 때문에 document-level prerequisite로 유지 가능하다.
- `roadmap.md`의 `Current Execution Candidates`는 임시 mapping note가 있고, `Pre-Release Gap Summary`는 gate/phase
  pressure만 남기며 dated audit 원본은 `Sources:`로 연결한다. 이는 `docs/product/AGENTS.md`의 roadmap section ownership과
  충돌하지 않는다.

### 판정

| 대상                                             | 판정              | 근거                                                                                                                              |
| ------------------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `product.md` top-level `Related:`                | delete            | parent 규칙상 body link가 owner/read path를 이미 설명하면 반복하지 않음                                                           |
| `product.md` `Status: Current`                   | keep              | 문서 전체 current validity를 오해 없이 설명하고 section-level `Target` claim은 inline status로 별도 표시됨                        |
| `product.md` external positioning `Sources:`     | keep with mapping | source 자체는 필요하지만 문서 전체 provenance처럼 읽히지 않게 claim mapping을 명시해야 함                                         |
| `roadmap.md` `Related: [[docs/product/product]]` | keep              | product scope가 roadmap 전체의 document-level prerequisite임                                                                      |
| `roadmap.md` structure                           | no-change         | Release Gates/Phases/Gate Evidence/Current Execution Candidates/Pre-Release Gap Summary가 product AGENTS section ownership과 정합 |

### 반영

- `docs/product/product.md`의 top-level `Related:` block을 제거했다.
- `docs/product/product.md`의 `Sources:` list에 `External positioning / A2A naming verification` label을 추가해
  source↔claim mapping을 보존했다.
- `docs/product/roadmap.md`는 변경하지 않았다.

### 검증

- `scripts/check-markdown-inline-code docs/product/product.md docs/product/roadmap.md` → exit 0 (PASS).
- `git diff --check -- docs/product/product.md docs/product/roadmap.md` → exit 0 (PASS).
- `rg -n "^Related:|^Sources:|External positioning / A2A naming verification|\\[\\[docs/specs/aiox-a2a\\]\\]|\\[\\[docs/architecture/local-agent-runtime\\]\\]|\\[\\[docs/product/roadmap\\]\\]" docs/product/product.md`
  → exit 0. 확인 결과 top-level `Related:`는 없고, body owner links와 mapped section-local `Sources:`만 남았다.

### Next

- Product owner 문서 traceability 보정은 완료됐다.
- W10 child AGENTS와 product owner 문서 보정은 끝났으므로, 다음 행동은 W10 closeout 판정과 next pointer W6 복귀다.
- Work Items와 next pointer는 이 블록에서 변경하지 않는다. W10 active, W6/W7 open 유지.

## 2026-06-28 · child log split — parent pointer and scope

Parent pointer: `logs/2026-06-26-workspace-reset-stage8-Atlas-반영·drift-재검토.md` W10

- 이 로그는 stage8 parent/control log의 W10 docs 전면 개선 상세 기록을 분리한 child log다.
- 원래 W10 상세 기록은 parent log에서 이 로그로 이동했다.
- W10은 W6 retrofit 중 드러난 docs 공통 계약·child AGENTS section contract 문제를 해결하기 위해 생긴 interrupting child flow다.
- 현재 남은 행동은 closeout이다. W10 결과를 parent stage8 로그에 소비한 뒤 W6 child log로 복귀한다.

## 2026-06-28 · W10 closeout — one-by-one review record and parent return

Parent pointer consumed: `logs/2026-06-26-workspace-reset-stage8-Atlas-반영·drift-재검토.md` W10.

### 최종 결과

- W10은 W6 retrofit 중 드러난 docs 공통 계약과 child AGENTS section contract 문제를 interrupting child flow로 분리해 처리했다.
- 검토·반영은 한 번에 묶어 처리하지 않고 **one by one**으로 수행했다. `docs/AGENTS.md` 공통 계약을 먼저 확정한 뒤 `architecture`, `specs`, `decisions`, `guides`, `product` AGENTS를 순서대로 검토·반영했고, 마지막으로 product owner 문서(`product.md`, `roadmap.md`)를 별도 검토했다.
- `decisions/AGENTS.md`, `guides/AGENTS.md`, `product/AGENTS.md`, `docs/product/product.md`, `docs/product/roadmap.md` 검토 기록은 이 로그의 각 날짜 블록에 보존했다. 다음 agent는 각 검토를 독립 판정 단위로 읽어야 하며, W10 전체 결론만 보고 개별 owner 판정을 생략하면 안 된다.

### One-by-one 검토 기록

| 대상                       | 기록 위치                                                      | 결과                                                                                                                      |
| -------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `docs/decisions/AGENTS.md` | `2026-06-28 · W10 decisions AGENTS section contract 정합 반영` | decision 문서의 반복 core와 optional/merge 가능한 section을 분리하고, 기존 decision corpus 일괄 retrofit 금지를 유지했다. |
| `docs/guides/AGENTS.md`    | `2026-06-28 · W10 guides AGENTS section contract 정합 반영`    | guide skeleton을 composition 규칙으로 바꾸고, runbook/how-to와 explainer subtype을 구분했다.                              |
| `docs/product/AGENTS.md`   | `2026-06-28 · W10 product AGENTS section contract 정합 반영`   | product/roadmap sub-kind와 roadmap section ownership은 유지하고, parent heading·product 문맥 어휘 drift만 정정했다.       |
| `docs/product/product.md`  | `2026-06-28 · W10 product owner 문서 traceability 보정`        | top-level `Related:` 중복을 제거하고 `Sources:`를 external positioning claim mapping으로 좁혔다.                          |
| `docs/product/roadmap.md`  | `2026-06-28 · W10 product owner 문서 traceability 보정`        | product prerequisite `Related:`와 roadmap section 구조는 유지 판정했고 파일 변경은 하지 않았다.                           |

### Closeout 보강 판단

- [Fact] W10 Work Items W1-W3는 완료 기록과 검증 결과가 이 로그에 있다.
- [Fact] product owner 문서 보정 이후 남은 W10 실행 항목은 parent W10 소비와 W6 child 복귀뿐이었다.
- [Fact] W10 중 길어진 상세 기록은 parent/control log에서 이 child log로 분리됐고, parent에는 child pointer와 복귀 조건이 남아 있다.
- [Analysis] W10의 durable rule 변경은 이미 `docs/AGENTS.md`와 child AGENTS에 반영됐으므로, 이 closeout에서 owner 문서 내용을 다시 복사하지 않는다.
- [Analysis] W10 자체에 남은 open 질문은 없다. 이후 architecture/specs/decisions owner-doc retrofit은 W10이 아니라 W6 child log가 소유한다.

### 검증

- `scripts/check-markdown-inline-code`와 `git diff --check`는 각 W10 반영 블록에서 대상 파일별로 PASS를 기록했다.
- 이 closeout 뒤에는 parent/control log의 W10을 완료 처리하고 W6 child를 active next pointer로 복귀시켜야 한다.

### Parent 반영

- Parent/control log의 W10은 이 child log 결과를 소비해 완료 처리한다.
- Parent/control log의 next pointer는 W6 child log로 복귀한다.
- 이 로그는 W10 범위의 남은 Work Item이 없으므로 `decided`로 닫는다.

## 2026-06-28 · W10 closeout correction — Claude review instruction scope

- @user 정정: 직전 요청의 "W10에 대한 지시서 내용"은 W10 자체의 새 실행 항목이 아니라, Claude에게 넘길 리뷰·검토 지시 범위를 가리킨 것이었다.
- 정정된 해석: `decisions/AGENTS.md`, `guides/AGENTS.md`, `product/AGENTS.md`, `product.md`, `roadmap.md`에 대한 기록은 future Claude/reviewer가 각 검토를 **one by one**으로 확인해야 한다는 지시 맥락이다.
- 이 정정은 W10 closeout 결과를 되돌리지 않는다. W10은 이미 owner 지침 반영과 product owner 문서 보정을 완료했고, parent W10도 소비됐다.
- 다음 agent가 W10 기록을 읽을 때는 "one-by-one"을 새 retrofit 실행 순서가 아니라 검토·리뷰 단위와 지시서 작성 방식으로 해석한다.

## 2026-06-28 · 사례 — long-log split 후 active next pointer만 따라가면 load-bearing 사실 누락

상황: stage8이 parent(control) + W6 child + W10 child 3개 로그로 split된 뒤, 새 세션 agent가 onramp/next pointer로 재개했을 때 발생.

문제 1 — onramp latest/Next가 Work Items와 불일치(stale).

- [Fact] SessionStart onramp의 latest/Next는 W10("owner별 section contract 전수 재검토")을 가리켰다.
- [Fact] 그러나 parent log tail과 Work Items는 W10이 이미 [x]이고 active [>]는 W6 child → W2 architecture retrofit임을 명시했다.
- [Inference] onramp가 본문에서 W10-era "Next" 문장을 집어 표시 → 권위(Work Items)와 어긋남. "active 로그 Work Items·next pointer가 권위"라는 규칙으로 교정 가능했으나, onramp만 신뢰했다면 이미 종료된 단계를 다시 수행할 위험이 있었다.

문제 2 — active 로그만 읽으면 sibling 닫힌 child의 load-bearing 사실을 못 본다.

- [Fact] next pointer(W6 child → W2)만 따라 W6 child만 읽고, uncommitted docs/architecture/local-runtime-store-and-repositories.md를 "W6 child에 기록 없음 → 미기록 in-progress"로 잘못 보고했다.
- [Fact] 실제로는 W10 child log(...W10-docs-contract-overhaul.md :29, :67)가 그 slice를 "대표(prototype) 적용"으로 명시 기록했다: "W10 승인 전 나머지 slice로 복제하지 않는다", "W10 규칙 확정 뒤 유지·축소·재작업 판정. 지금은 되돌리거나 확산하지 않음."
- [Fact] 게다가 W10은 그 prototype을 계기로 Related/Status/Evidence/Sources 공통 규칙을 "가장 좁은 유효 범위 원칙"으로 바꿔 docs/AGENTS.md+child AGENTS에 반영하고 닫혔다(:850-851). 즉 prototype은 pre-W10 가정으로 만들어져 새 규칙(예: top+body decision 중복 금지)과 어긋날 가능성이 높다.
- [Inference] W6 child(active)의 W2 항목은 "slice 9개를 새 규칙으로 retrofit"만 적고, (a) prototype이 이미 uncommitted로 존재함, (b) 그 형식이 W10 규칙 변경으로 재판정 대상임, (c) 복제 금지라는 사실을 carry-forward하지 않았다. 그래서 next pointer만 따른 agent는 prototype을 정상 완료분으로 오인하거나 나머지 8개에 기계 복제할 위험이 있었다.

  근본 원인(opinion): 한 단계가 parent/W6/W10 3로그로 쪼개질 때, 닫힌 child(W10)에서 만든 결정·미완료 산출물(prototype diff)·규칙 변경이 active child(W6)의 재개 지점에 전달되지 않으면 "active 로그의 next pointer를 따른다"는 정상 절차만으로 복원되지 않는다. work-items-rules의 known-graph 규칙상 agent는 sibling 닫힌 로그를 역검색하지 않으므로, cross-child handoff는 active 로그가 명시적으로 들고 있어야 한다.

  교정/제안:
  - W10 closeout이 parent W10을 소비할 때, "store slice prototype uncommitted + W10 규칙으로 재판정 후에만 나머지 복제"를 W6 child W2 항목(또는 최신 기록)에 carry-forward했어야 한다.
  - long-log split closeout 점검 항목 후보: 닫히는 child가 (i) uncommitted 산출물, (ii) 다른 child가 소비할 규칙 변경, (iii) "아직 복제/확산 금지" 같은 제약을 남기면, 이를 active로 남는 child의 재개 지점에 명시 전달했는지 확인.
