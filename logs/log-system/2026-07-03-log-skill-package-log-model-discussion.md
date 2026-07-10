---
topic: portable package-log model discussion
description: portable package-log 모델의 정체성·activation·상태 표면·agent topology와 base log workflow specialization을 수렴하고 승인된 후속 반영을 검증한다
status: open
---

## Work Items

- [x] W1 기존 open portableization 로그와 이 로그의 관계·처분·합성 방식을 결정하고, 중복 없이 이어갈 단일 실행 경계를 확정한다
- [x] W2 portable package-log 최종 통합 초안 전체와 physical folder/file layout 경계를 Claude 독립 검토에 부쳐 gap·conflict·prompt 누락을 판정하고 사용자 질의응답으로 최종 수렴한다
- [x] W3 수렴안의 owner 파일, repo integration 잔류 범위, 변경하지 않을 범위와 검증 방법을 제시해 사용자 승인을 받는다
- [>] W4 승인된 범위만 반영하고 owner·inbound/outbound reference·예시·검증 경로를 확인한다

## Required Context

### Return Target

- None: independent log.

### {Global}

- 이 로그는 package-log model 초안 토론을 소유한다. 사용자가 제시하는 초안, 문장, 섹션, 개념 단위를 검토하고, 사용자가 명시적으로 “반영하라”라고 하기 전에는 owner 문서나 skill 문서를 수정하지 않는다.
- package log는 문서 package에 한정하지 않는다. 하나의 primary artifact/change boundary(문서, 코드 파일, 모듈, 기능 scope, release artifact 등)를 중심으로 관련 artifact의 검토·수정·검증이 같은 closeout 판단에 묶일 때 적용하는 조건부 workflow로 검토한다.
- activation 기준은 파일 수, 로그 길이, 병렬 실행 자체가 아니다. primary artifact/change boundary와 관련 artifact들이 공통 evidence, scope, handoff, closeout gate를 공유해야 하는지가 기준이다.
- package log는 상태 owner이고 task brief는 실행 지시서다. delegated 또는 batch 작업은 controlling package log의 Scope, Work Items, 최신 기록, active pointer/handoff, 관련 ledger entry/action을 읽게 해야 하며, task brief가 상태 owner가 되면 안 된다.
- package log는 base log loop를 복제하는 별도 lifecycle이 아니라, base loop 위에서 evidence, Scope, Work Items/next pointer, cross-artifact effects, handoff, closeout readiness 같은 의존 표면을 같은 의미 변화 안에서 함께 Reconcile하는 협응 계층으로 검토한다. 젓가락/근육/협응 비유는 이 설계 원리를 설명하는 근거로 함께 보존하되, section명·command명은 중립 어휘를 유지한다.
- 승인된 portable 범위는 package identity와 activation/entry routing, 고정 8표면, Scope/allowed cross-artifact write-set, controlling log와 task record 분리, claim/evidence gate, task/result/review 계약, cross-artifact effect 추적, Reconcile과 closeout 검증이다.
- 이전에 복원한 workspace reset, legacy source absorption, source-map, disposition/deletion gate 관련 기록은 이 repo와 해당 문서 정리 작업에 국한된 사례 근거다. 그 구체 taxonomy, legacy 경로, 상태 라벨, source-map schema, disposition/deletion vocabulary는 portable package-log 기본 규칙으로 승격하지 않는다.
- 이 로그에서는 package-log 모델과 승인된 owner 반영만 다룬다. W4에서 새 package reference, `SKILL.md` routing, `logs/AGENTS.md`의 prospective repo integration과 `docs/guides/workflow.md` how-to를 반영한다. Base lifecycle reference, 기존 workspace-reset 절차, `scripts/log`와 `scripts/onramp` 변경은 범위 밖이다.

### {W4}

- Input authority는 이 로그의 `Claude review 반영 W2 단일 정규 초안 후보`와 W3 결정 1~3 승인, `결정 4 후보 수정 — Manual contract 선확정 후 package-log tool 후속`, 그리고 아래 `W4 승인 범위와 다음 세션 handoff`다. 과거 미승인 제안과 폐기된 inline Compact Brief, in-place upgrade/downgrade, `finished-awaiting-consumption`, portable coordinated-team mode, multi-W single-file anchor, Amendments section을 복원하지 않는다.
- 생성: `.agents/skills/log/references/package-log.md`. 수정: `.agents/skills/log/SKILL.md`, `logs/AGENTS.md`, `docs/guides/workflow.md`. 이 네 owner 파일 외에는 수정하지 않는다.
- `loop-rules.md`, `design-principles.md`, `project-setup.md`, `example.md`, `maintenance.md`, root `AGENTS.md`, `plans/AGENTS.md`, `.gitignore`, `.agents/skills/log/scripts/log`, `scripts/onramp`와 기존 `logs/W*-task.md`는 변경하지 않는다. `onramp`는 실행하지 않는다.
- 새 package 계약은 prospective-only다. 기존 workspace-reset/legacy controlling logs, Task Brief, `logs/AGENTS.md`의 Workspace Reset sections를 이동·backfill·재분류·in-place upgrade하지 않는다.
- Portable owner는 의미·invariant·task/result/review/closeout 계약과 Compact/Full composition template만 소유한다. Repo integration은 Hybrid 실제 경로, stable package key, Task Index locator, manual Registry Integrity 절차를 소유한다. Guide는 owner를 참조하는 실제 read/execute/consume 순서만 설명한다.
- W4는 manual contract를 먼저 반영·검증한다. `scripts/package-log`은 W4 review 완료 뒤 별도 후속 작업 수명에서 설계하며 provisional command를 owner 문서에 쓰지 않는다.

## 2026-07-03 · portable package-log 모델 독립 토론 수명 개설

### 분리 판단

- @user는 현재의 포괄적인 log-skill overhaul 토론에서 package-log 모델을 별도 로그로 분리해 토의하고 이후 승인된 작업까지 이어가도록 지시했다.
- 이 작업은 package identity, activation, 상태·증거 표면, agent topology와 owner 반영이라는 자체 완료 조건과 재개 순서를 가진다. 기존 토론 로그의 일반 Record/Reconcile·example 정합화나 별도 script/onramp maintenance와 함께 닫을 수 없으므로 별도 작업 수명이다.
- source Work Item이 이 결과를 기다리도록 연결돼 있지 않으므로 Independent Follow-Up으로 연다. 복귀 pointer와 `## 복귀 대상`은 두지 않는다.

### 알려진 겹침과 선행 gate

- `logs/log-system/2026-06-22-log-skill-package-workflow-portableization.md`는 같은 portableization 목적의 open 로그이며 W1이 active다. 새 로그가 이를 자동으로 supersede하거나 내용을 복제하면 두 상태 owner가 생긴다.
- 따라서 W1은 토론·근거를 합성한 뒤 기존 로그 유지, 이 로그로의 명시적 이관 또는 supersede, 역할 분리 중 어떤 관계가 맞는지 먼저 판정한다. 이 결론과 필요한 양쪽 Work state 변경을 같은 동작에서 처리하기 전 owner 편집으로 진행하지 않는다.

### 현재 수렴한 입력

- package log는 단순히 긴 로그나 병렬 작업 로그가 아니라, 하나의 primary artifact/change boundary에 걸친 scope·근거·handoff·closeout을 감사 가능하게 소유하는 controlling log 후보다.
- base log workflow를 복제하는 별도 lifecycle보다 기존 Enter·Act·Record·Reconcile·Cross-Log·Closeout에 package 전용 판정과 표면을 조건부로 붙이는 specialization이 현재 유력하다.
- 상태 owner인 package log와 실행 지시서인 task brief는 분리한다. delegated 작업의 brief는 controlling log와 필요한 Scope·Work Items·최신 owning block·active pointer/handoff·관련 ledger entry/action을 읽게 해야 한다.
- source map이나 ledger 전체를 Required Context에 복사하지 않는다. owner/path, consumer, 대상 entry와 읽은 뒤 수행할 action을 가장 작은 유효 scope에 binding하는 방향이 현재 유력하다.
- claim provenance와 evidence-first/apply-later, 허용된 cross-artifact write-set, 비가역 action의 검증·사용자 확인은 portable 후보지만, 정확한 section set과 필수/선택 표면은 아직 결정되지 않았다.

### 제외와 다음 행동

- 기존 로그의 history를 이 파일로 이동하거나 요약 복제하지 않는다. 필요한 근거는 Required Context의 안정적인 source pointer에서 읽고, 새 판단과 변경 이유만 이 로그에 기록한다.
- workspace reset 전용 source-map 컬럼, owner 상태 라벨, legacy assimilation·archive·physical deletion 절차를 portable 기본 규칙으로 승격하지 않는다.
- 다음 행동은 W1이다. 기존 open portableization 로그와 이 로그의 목적·완료 조건·재개 상태를 대조하고, 토론 owner와 실행 owner를 하나로 복원할 명시적 관계·처분·합성안을 사용자에게 제시한다.

## 2026-07-04 · W1 관계 판정 — package-log 모델 토론 owner 단일화와 W2 이동

### 확인한 사실

- @user는 `Global`에 젓가락/근육/협응 표현을 추가하라고 지시했고, 이 로그의 `{Global}`에 package log를 base log loop 위의 협응 계층으로 보는 standing context를 반영했다.
- 이후 @user는 package log와 workflow의 차이, 파일 수 기준, Evidence Ledger 등 package 표면을 질문했고, 답변에서 package workflow는 작업 절차, package log는 그 workflow의 상태 owner라고 구분했다.
- Claude는 초안 제안에서 package-log reference를 새 `references/package-log.md`로 둘지 또는 `loop-rules.md`에 흡수할지 먼저 결정해야 한다고 보고, 새 on-demand reference를 추천했다. 또한 package log를 base loop 복제가 아니라 조건부 specialization 계층으로 보고, identity, activation/downgrade, Scope, 상태 owner와 task brief 분리, evidence/claim gate, ledger/action과 Work Item binding, cross-artifact effects, optional agent topology, closeout gate를 초안 골격으로 제안했다.
- Codex 검토는 Claude 제안의 방향을 대체로 수용하되, `Source Map`, `Decision Candidates`, `direct update vs owner-impact-only` 같은 표면·용어를 portable core에 너무 빨리 고정하지 말고 조건부 surface와 repo vocabulary 배제로 다듬자고 제안했다.

### W1 관계 판정

- 기존 open 로그 `logs/log-system/2026-06-22-log-skill-package-workflow-portableization.md`는 W7~W10 workspace reset package workflow 회고에서 출발한 maintenance follow-up이고, 이 로그는 package-log model 자체의 identity, activation, 상태 owner, package surface, agent topology와 owner 반영까지 수렴하는 더 넓은 controlling discussion이다.
- 두 로그를 병렬 open 상태로 두면 portableization 후보 확정과 적용안 작성의 상태 owner가 중복된다. 현재 논의는 repo 한정 package workflow 구현체를 그대로 흡수하지 않고, 문서·코드 파일·모듈·기능 scope·release artifact 등 일반 primary artifact/change boundary에 적용할 portable package-log model로 재정의했다.
- 따라서 `logs/log-system/2026-06-22-log-skill-package-workflow-portableization.md`의 남은 W1~W3는 이 로그의 W2~W4로 이관하고, 기존 로그는 superseded로 닫는다. 기존 로그의 history는 provenance로 보존하되, 이후 package-log model 수렴과 승인된 반영의 active owner는 이 로그다.

### W2로 넘길 수렴 입력

- package log와 package workflow는 구분한다. package workflow는 primary artifact/change boundary와 관련 artifact의 검토·수정·검증·closeout 절차이고, package log는 그 workflow의 Scope, Work Items, evidence, cross-artifact effects, handoff, closeout readiness를 소유하는 상태 owner다.
- package activation은 파일 수, 로그 길이, 병렬 실행 자체가 아니라 공통 evidence/scope/handoff/closeout gate 공유 여부로 판단한다. 1개 파일도 큰 claim 검증과 closeout gate가 있으면 가능하지만, 작은 단일 파일 수정이나 단일 판단에는 과하다.
- package surface는 always-on template이 아니라 조건부 surface set으로 검토한다. 최소 후보는 Scope, Work Items, Evidence Ledger, Closeout이고, Cross-Artifact Effects는 관련 artifact 영향이 있을 때, Decision Candidates와 shared source/ledger binding은 해당 조건이 있을 때 켠다.
- 젓가락/근육/협응 비유는 package log의 핵심 동작 원리로 보존한다. evidence, Scope, Work Items/next pointer, cross-artifact effects, handoff, closeout readiness 중 하나가 바뀌면 그 의미 변화에 의존하는 표면을 같은 동작에서 함께 Reconcile해야 한다. 다만 실제 section명·command명은 중립 어휘를 유지한다.
- 새 reference를 만든다면 일반 작업 read path를 늘리지 않는 on-demand `references/package-log.md` 후보가 유력하다. 단, 실제 배치와 owner 파일은 W3에서 승인 대상으로 제시한다.

### Reconcile

- W1의 관계·처분 판단은 완료됐다. 이 로그가 package-log model 토론과 승인된 반영의 active owner가 된다.
- W2를 active pointer로 전환해 portable package-log 모델의 activation, 상태 owner, optional surface, source/ledger binding, agent topology와 base log loop specialization을 수렴한다.

## 2026-07-04 · W2 시작 — package-log 모델 초안 수렴 기준

### 현재 기준

- W2는 package-log model 자체를 수렴한다. 이 단계에서는 owner 파일을 아직 수정하지 않고, identity, activation/downgrade, 상태 owner와 task brief 분리, package surface, evidence/ledger/action binding, cross-artifact effects, agent topology, base loop specialization을 초안 수준에서 검토한다.
- package log는 문서 전용 workflow가 아니라 문서, 코드 파일, 모듈, 기능 scope, release artifact 같은 primary artifact/change boundary와 관련 artifact가 공통 closeout gate를 공유할 때 쓰는 조건부 workflow의 상태 owner다.
- package workflow는 작업 절차이고, package log는 그 절차의 상태 owner다. package log의 최소 surface는 Scope, Work Items, Closeout이며, 조건부 evidence/cross-artifact/handoff 표면을 함께 소유할 수 있다. task brief는 실행 지시서로만 둔다.
- 젓가락/근육/협응 비유는 W2의 설계 근거로 유지한다. package 표면 중 하나가 바뀌면 그 의미 변화에 의존하는 표면을 같은 동작에서 함께 Reconcile해야 한다. 다만 이를 새 section명, command명, required surface로 승격하지 않고 base log loop의 Reconcile을 package 의존 표면에 적용하는 원리로만 다룬다.

### 초안 후보

- 배치 후보는 일반 log read path를 늘리지 않는 on-demand `references/package-log.md`가 현재 유력하다. `loop-rules.md` 직접 흡수는 base loop를 비대하게 만들 수 있으므로 W3에서 적용안으로 제시하기 전까지 후보로만 둔다.
- package surface는 always-on template이 아니라 조건부 surface set으로 검토한다. 최소 후보는 Scope, Work Items, Closeout이다. Scope는 비어 있을 수 없고 최소 내용은 primary artifact/change boundary와 allowed cross-artifact write-set이다.
- evidence-first/apply-later와 claim provenance는 package invariant다. Evidence Ledger는 이 원리를 감사·재현·위임 가능하게 만드는 조건부 format이며, Ledger를 켜지 않는 작은 package에서도 owner에 영향을 주는 claim은 History surface나 Closeout에서 검증 가능한 근거를 가져야 한다. Cross-Artifact Effects, Decision Candidates, shared source/ledger binding, task brief, agent topology도 조건부 surface 또는 format으로 둔다.
- repo 전용 workspace reset taxonomy, legacy source-map schema, disposition/deletion vocabulary, physical deletion gate는 portable 기본 규칙으로 승격하지 않는다.

### 다음 검토

- 다음 토론은 Claude 제안과 Codex 조정안을 합쳐 `Identity`, `Activation/Downgrade`, `State owner vs Task brief`, `Package surfaces`, `Base Reconcile 적용 원리` 순서로 섹션 단위 검토를 진행한다.
- 실제 owner 파일, repo integration 잔류 범위, 검증 방법은 W2 수렴 뒤 W3에서 제시한다.

## 2026-07-04 · W2 종합 — artifact/evidence 판단 기준과 surface 경계

### 결론

- `Artifact and Evidence Tests`는 package activation 기준이 아니라, package로 다루기로 한 작업 안에서 primary artifact, related artifact, evidence, cross-artifact effect, action binding을 판정하는 절차다. Activation/Downgrade는 별도 기준으로 남긴다.
- package 판단은 artifact 종류가 아니라 역할과 검증 관계로 한다. primary artifact/change boundary는 package closeout이 correct/done으로 판정해야 하는 중심 대상이고, related artifact는 primary 변화 때문에 함께 수정되거나 재검증되어야 하는 대상이다.
- Scope는 최소 surface지만 비어 있을 수 없다. 최소 내용은 primary artifact/change boundary와 allowed cross-artifact write-set이다. write-set 밖 영향은 `out-of-scope effect`로 기록하고 사용자 확인이나 별도 owner/handoff를 통해 처리한다.
- evidence-first/apply-later와 claim provenance는 package invariant다. Evidence Ledger는 이 원리를 감사·재현·위임 가능하게 만드는 조건부 format일 뿐이다. Ledger를 쓰지 않는 작은 package에서도 owner에 영향을 주는 claim은 History surface 또는 Closeout에서 검증 가능한 근거를 가져야 한다.
- current-state claim과 target-state claim은 source-of-truth가 다르다. current-state claim은 코드, 테스트, 실제 파일 상태처럼 반증 가능한 source에서 재검증해야 하고, target-state claim은 current로 오인되지 않게 분리한다. handoff의 file:line이나 기존 기록은 출발점이며 최종 source에서 다시 확인한다.
- cross-artifact effect는 primary 변화가 related artifact에 만드는 영향이다. allowed write-set 안이면 같은 package에서 처리할 수 있고, 밖이면 `out-of-scope effect`로 기록한 뒤 확인·이관·handoff한다.
- 후속 행동의 owner는 Work Item이다. Handoff는 행동을 다음 세션이나 다른 owner로 전달하는 장치이고, Closeout은 행동과 반영 결과가 빠지지 않았는지 검증하는 gate다. Ledger, effect 표, 본문 기록에만 action을 남기고 Work Item이나 handoff와 연결하지 않으면 안 된다.
- portable reference에는 repo taxonomy, source-map schema, disposition/deletion vocabulary를 넣지 않는다. `owner-impact`, `as-built`, `proposed`처럼 repo 컬럼명이나 status label로 읽히는 어휘는 피하고 `out-of-scope effect`, `current-state claim`, `target-state claim` 같은 중립 표현을 쓴다.

### 판단 test 후보

1. Boundary Test: 이 package closeout이 correct/done으로 판정해야 하는 중심 대상이 무엇인가?
2. Related Artifact Test: primary 변화 때문에 함께 수정되거나 재검증되어야 하는 artifact가 무엇인가?
3. Scope Authority Test: related artifact가 allowed cross-artifact write-set 안인가? 밖이면 `out-of-scope effect`로 기록하고 확인한다.
4. Evidence / Provenance Test: owner에 영향을 주는 claim은 source에서 재검증됐는가? current-state claim과 target-state claim의 source-of-truth가 분리됐는가? owner artifact 수정은 evidence 검증 뒤에만 하는가?
5. Effect / Action Binding Test: 후속 행동을 Work Item이 소유하는가? cross-session이면 handoff로 전달되고, Closeout에서 검증되는가?

### 배치 후보

- 실제 reference로 옮길 때는 `Artifact and Evidence Tests`를 별도 섹션 후보로 둔다. 이 tests는 surface가 아니며, Scope·Record·Closeout·Work Item binding을 가로지르는 판단 절차다.
- 배치 순서는 `Activation/Downgrade`와 `Scope` 뒤가 유력하다. Tests 1~3이 Scope를 채우고, Tests 4~5가 evidence와 action binding, Closeout gate로 이어지기 때문이다.
- `Package surfaces` 섹션은 이 tests의 결과를 어디에 기록하는지 설명하고, `Base Reconcile 적용 원리`는 해당 결과로 인해 stale해진 의존 표면을 같은 동작에서 맞추는 방법을 설명한다.

### 2026-07-04 23:40 · 배치 승인과 다음 세션 재개

#### 승인된 사항

- @user는 package-log reference 배치를 `references/package-log.md`로 두는 방향을 승인했다.
- 이 배치는 일반 log read path를 늘리지 않는 on-demand reference로 다룬다. `loop-rules.md` 직접 흡수는 현재 선택하지 않는다.

#### 다음 세션 재개 범위

- 다음 세션은 W2의 실제 초안 본문 섹션별 수렴을 이어간다.
- 섹션 순서는 현재 기준으로 `Identity`, `Activation/Downgrade`, `State owner vs Task brief`, `Package surfaces`, `Base Reconcile 적용 원리`다.
- 각 섹션은 현재 `{Global}`과 W2 시작·종합 블록의 기준을 따른다. 특히 package log는 primary artifact/change boundary의 상태 owner이며, package workflow와 구분한다. Scope / Work Items / Closeout을 최소 surface로 두고, Evidence Ledger 등은 조건부 surface 또는 format으로 둔다. evidence-first/apply-later와 claim provenance는 package invariant로 유지한다.
- W2 섹션별 수렴 뒤 W3에서 owner 파일, repo integration 잔류 범위, 변경하지 않을 범위와 검증 방법을 제시한다.

#### 제외

- 다음 세션 전까지 owner 파일, `references/package-log.md`, `loop-rules.md`, `logs/AGENTS.md`, scripts는 수정하지 않는다.
- repo 전용 workspace reset taxonomy, legacy source-map schema, disposition/deletion vocabulary, physical deletion gate는 portable package-log 기본 규칙으로 승격하지 않는다.

## 2026-07-04 · W2 섹션별 초안 수렴 세션 — Claude 제안 (미승인, 진행 중)

W2 섹션 순서(`Identity` → `Activation/Downgrade` → `State owner vs Task brief` → `Package surfaces` → `Base Reconcile 적용 원리`)를 따라 각 섹션 초안을 순차 수렴한다. 아래 하위 entry의 각 섹션은 **Claude 제안(의견)**이며 아직 사용자 승인 전이다. 확정과 owner 반영은 W3 승인 뒤 W4에서만 한다.

### (1) Identity — Claude 제안 (미확정)

Claude가 제안하는 Identity 초안 방향:

- **정의(제안)**: package log을 "하나의 primary artifact/change boundary를 중심으로, 그 변경 때문에 함께 검토·수정·검증되어야 하는 related artifact의 scope·근거·handoff·closeout을 한 판단으로 소유하는 상태 owner"로 정의하자.
- **Primary artifact/change boundary(제안)**: package closeout이 correct/done으로 판정해야 하는 중심 대상. 문서·코드·모듈·기능 scope·release artifact 등 종류 무관. 문서 전용 아님.
- **Related artifact(제안)**: primary 변화 때문에 함께 수정·재검증되어야 하는 대상.
- **판정 기준(제안)**: package 여부를 artifact 종류·파일 수가 아니라 역할과 검증 관계로 본다. 여러 artifact가 하나의 closeout 판단에 묶일 때 package.
- **log ≠ workflow(제안)**: workflow는 절차, log은 그 절차의 상태 owner. "어떻게" vs "지금 상태가 무엇".
- **일반 로그와의 관계(제안)**: base loop를 복제한 별도 lifecycle이 아니라 공통 gate 공유 시 켜지는 조건부 협응 계층. 언제 켜는지는 `Activation/Downgrade` 소관.
- **Closeout 실패 → 재검증 되먹임(제안, @user 추가 요청 반영)**: closeout이 primary+related를 correct/done으로 판정하지 못하면 package는 닫히지 않고, 실패한 표면으로 돌아가 재검증·재수정 후 다시 closeout한다. 이 되먹임 때문에 primary·related가 한 package로 묶인다. 실패 시 *어느 표면으로 어떻게* 돌아가는지 mechanics는 `Base Reconcile 적용 원리`가 소유(Identity는 되먹임 존재와 묶임만 진술).

Claude 의견상 경계:

- activation("언제 켜나")은 Identity가 아니라 `Activation/Downgrade`로 넘기자.
- 젓가락/근육/협응 비유·재검증 mechanics는 `Base Reconcile 적용 원리`로 미루자.
- 중립 어휘 유지(repo 전용 taxonomy 배제).

상태:

- 위 Identity는 **Claude 제안이며 사용자 승인 전**이다.
- 다음 제안 섹션은 `Activation/Downgrade`(아래 (2)).

### (2) Activation/Downgrade — Claude 제안 (미확정)

Claude가 제안하는 Activation/Downgrade 초안 방향:

- **언제 켜나(제안)**: primary artifact/change boundary와 related artifact가 공통 gate — evidence·scope·handoff·closeout — 를 공유해야 할 때. "이 변경들이 하나의 correct/done 판단에 함께 묶여야 하나?"가 activation 질문.
- **Activation 신호(제안, 하나 이상이면 검토)**:
  - primary 변경이 여러 related artifact의 수정·재검증을 강제한다(한 곳 누락 시 전체가 correct 아님).
  - 검증할 claim이 커서 evidence를 감사·재현·위임 가능하게 남겨야 한다.
  - 작업이 여러 세션·owner·위임(batch)으로 이어져 공통 handoff·closeout gate가 필요하다.
- **Activation 기준이 아닌 것(제안, 반-신호)**: 파일 수, 로그 길이, 병렬 실행 자체. 파일이 많아도 서로 독립이면 package 아님. 1개 파일이어도 큰 claim 검증 + closeout gate가 있으면 package 가능.
- **Downgrade(제안, 양방향)**: 작은 단일 파일·단일 판단·related 없는 작업은 package로 안 봄(일반 로그로 충분, 표면 억지 채우기는 과잉). package로 열었다가 related·공통 gate가 없다고 판명되면 일반 로그로 downgrade. 반대로 일반 로그로 시작했다 related·gate가 드러나면 package 표면을 켠다.
- **역할 분리(제안)**: Activation/Downgrade는 "package인가 아닌가"만 판정. package로 정한 뒤 무엇이 primary/related/evidence/effect·action인지는 `Artifact and Evidence Tests`가 소유.

#### Worked example — cross-component 실행 plan (@user 요청 반영)

근거: `plans/post-mvp.plan.md` (규약 :64-66, Candidates :73-76). 확인/추론 구분해 기록.

- **(확인한 사실)** 이 plan은 plans/가 소유하는 index/sequencing 문서다. "파일 경계 = deliverable(구현 가능한 변경 단위), 한 deliverable은 여러 component를 가로지른다"(:64-65), 각 sub-plan은 `implements: spec §`로 traceability를 선언한다(:66).
- **(추론) plan 파일 자체는 package log이 아니다**: plan은 "무엇을 어떤 순서로"(sequencing)를 소유하고, package log은 deliverable을 kickoff할 때 여는 "실행 상태(Scope·evidence·closeout) owner"다. deliverable마다 package log이 하나씩 열린다.
- **(추론) activation은 deliverable 단위 판정**: 예) envelope-metadata deliverable = package. primary=payload marker→A2A envelope/lifecycle 이전, related=spec §4·`local-agent-runtime` architecture·`src/`·`tests/`·roadmap gate가 하나의 closeout에 묶임(전부 맞춰지기 전엔 correct/done 아님).
- **(추론) Downgrade 예시**: `codex-structured-metadata-spike`는 조사/spike라 primary가 "cross-artifact 변경"이 아니라 "조사 결과 + go/no-go 판단"이고 related 재검증이 최소다. evidence는 남기되 full package 표면은 과잉 → 일반 로그(downgrade). spike 결과가 실제 변경으로 확정되면 그때 package로 승격.
- **(의견) 반-신호 확인**: "현재 열린 파일 N개"를 뭉뚱그려 한 package로 묶으면 안 된다. 묶는 기준은 개수가 아니라 공통 closeout 공유다. post-mvp는 마침 deliverable이 그 묶음 단위로 설계돼 있어 package가 되는 것.

경계(portable 반영 시):

- 이 worked example은 repo 파일(`plans/post-mvp.plan.md`)을 인용한다. portable `references/package-log.md`(W4)에는 repo 전용 경로·taxonomy를 넣지 않기로 했으므로, 옮길 때는 "cross-component deliverable을 등록하는 index/sequencing plan"처럼 일반화한다. repo 인용은 이 로그(경위)에만 둔다.

상태:

- 위 Activation/Downgrade와 worked example은 **Claude 제안이며 사용자 승인 전**이다.
- 다음 제안 섹션은 `State owner vs Task brief`(아래 (3)).

### (3) State owner vs Task brief — Claude 제안 (미확정)

Claude가 제안하는 State owner vs Task brief 초안 방향:

- **핵심 원칙 — 상태 owner는 하나(제안)**: package log = 상태 owner(Scope·Work Items·evidence·cross-artifact effects·handoff·closeout readiness 소유, "작업이 어디까지 왔나"의 단일 진실원). task brief = 실행 지시서(위임·batch agent에게 무엇을 하고 상태를 어디서 읽을지 지시). task brief는 상태 owner가 아니며 되어서도 안 된다.
- **왜 분리(제안)**: 위임·batch에서 brief가 Scope·Work Items를 자체 복사하면 controlling log와 brief 두 owner가 상태를 주장하게 되어 곧 어긋난다(brief Work state가 stale, 어느 쪽이 진짜인지 모호).
- **Task brief가 해야 하는 것(제안, controlling log에 binding)**: controlling package log을 명시 지목 / 위임 agent가 그 log에서 읽을 것(Scope, Work Items, 최신 owning 기록, active pointer·handoff, 관련 evidence·ledger entry)을 복사하지 않고 가리킴 / brief에는 이번 실행 고유 지시(대상·경계·완료 조건)만.
- **Task brief가 하면 안 되는 것(제안)**: source map·ledger·Scope 전체 복사(divergent copy) 금지 → pointer + 최소 유효 scope(owner/path, consumer, 대상 entry, 읽은 뒤 수행할 action)로 binding. Work state·closeout status를 자기가 소유하듯 기록 금지.
- **결과 흐름(제안)**: 위임 agent의 findings·action은 controlling package log의 표면(evidence, effects, Work Items)으로 되돌려 기록. 후속 행동의 owner는 Work Item이지 brief나 ledger 본문이 아니다. 결과를 표면별로 되돌리는 세부 mechanics는 `Base Reconcile 적용 원리`와 겹치므로 그쪽과 정합한다.
- **언제 필요 없나(제안)**: 위임하지 않는 단일 agent·단일 세션 package는 별도 brief 불필요, package log 자체로 충분. task brief는 조건부 surface이며 위임·batch일 때만 켠다(surface 목록은 `Package surfaces` 소관).

Claude 의견상 경계:

- repo의 Task Brief Template(Evidence Ledger 컬럼, owner-impact 등)은 portable 문서에 넣지 않는다. portable은 분리 원칙 + 필수 binding만 진술하고, 구체 템플릿은 project integration에 위임.
- 위임 결과 흐름의 구체 예시는 초안 본문·로그에 남기지 않기로 함(@user 지시). 원칙만 진술한다.

상태:

- 위 State owner vs Task brief는 **Claude 제안이며 사용자 승인 전**이다.
- 다음 제안 섹션은 `Package surfaces`(아래 (4)).

### (4) Package surfaces — Claude 제안 (미확정)

Claude가 제안하는 Package surfaces 초안 방향. package surface는 always-on 템플릿이 아니라 조건부 surface set이다.

- **최소 표면(제안, 항상 켠다)**:
  - **Scope** — package-log이 base loop에 더하는 핵심 표면. 비어 있을 수 없다. 최소 내용 = primary artifact/change boundary + allowed cross-artifact write-set. write-set 밖 영향은 `out-of-scope effect`로 기록·확인·이관.
  - **Work Items** — 후속 행동·재개 지점 owner. base loop의 Work Items를 그대로 쓴다(신규 생성 아님).
  - **Closeout** — correct/done 판정 gate. base loop Closeout에 package 판정을 얹는다.
  - → package가 *새로 더하는* 최소 표면은 Scope 하나. Work Items·Closeout은 base loop 표면을 package 의미로 재사용(복제 아님).
- **불변(제안, 표면이 아니라 원리)**: evidence-first/apply-later + claim provenance. owner 영향 claim은 evidence 검증 뒤에만 owner 수정. current-state와 target-state claim의 source-of-truth 분리. Ledger를 안 켜는 작은 package에서도 owner 영향 claim은 History surface나 Closeout에서 검증 가능한 근거를 가져야 한다.
- **조건부 표면/format(제안, 조건 있을 때만)**:
  - **Evidence Ledger** — 불변을 감사·재현·위임 가능하게 만드는 format. claim이 크거나 위임·batch일 때.
  - **Cross-Artifact Effects** — primary가 related artifact에 영향 줄 때.
  - **Decision Candidates** — decision-worthy rationale이 나올 때.
  - **Shared source/ledger binding** — 여러 package·consumer가 공통 source map/ledger 공유할 때.
  - **Task brief** — 위임·batch일 때((3) 소유).
- **표면과 판단 절차 관계(제안)**: `Artifact and Evidence Tests` 결과가 표면으로 흐른다. Test 1~3 → Scope, Test 4~5 → evidence(또는 Ledger)·Work Item·Closeout.

Claude 의견상 경계:

- 중립 어휘 유지. always-on 템플릿 강제 금지(조건부 set).

섹션 순서 변경(@user 결정):

- Agent topology를 Package surfaces의 조건부 표면 bullet이 아니라 **별도 섹션으로 분리**한다. Package surfaces는 agent topology를 조건부 표면으로 나열하지 않고, 별도 섹션으로 cross-ref만 한다.
- 갱신된 W2 섹션 순서: `Identity` → `Activation/Downgrade` → `State owner vs Task brief` → `Package surfaces` → `Agent topology`(신규 분리) → `Base Reconcile 적용 원리`.

상태:

- 위 Package surfaces는 **Claude 제안이며 사용자 승인 전**이다.
- 다음 제안 섹션은 `Agent topology`(별도 섹션, 아래 (5)).

### (5) Agent topology + Delegation criterion — Claude 제안 (미확정)

Claude가 제안하는 Agent topology 초안 방향. topology는 하나의 package를 여러 agent·역할이 협응할 때만 켜는 **조건부** 관심사다. 단일 agent·단일 세션 package는 topology 표면이 불필요하다.

- **불변(제안)**: agent가 몇이든 package log이 **단일 상태 owner**다. 각 agent가 별도 상태를 소유하지 않는다((3) 확장).
- **역할 ≠ agent 인스턴스(제안, @user 통찰 반영)**: 역할은 기능(controlling/executing/reviewing)이고, 한 agent 인스턴스가 여러 역할을 겸할 수 있다. controlling agent가 executing을 inline으로 직접 하는 게 기본값이다. subagent를 띄우는 것은 "역할을 별도 인스턴스로 실체화하는 하나의 방법"일 뿐이다.
- **역할(제안, 기능 기반·vendor 이름 없음)**:
  - **Controlling** — package log의 Scope·상태를 소유·Reconcile, 재개 지점·closeout 관리.
  - **Executing (delegate/batch)** — task brief를 받아 controlling log의 Scope·Work Items·pointer·관련 evidence를 읽고 실행, 결과(finding·effect·action)를 controlling log로 되돌림. 상태 미소유(읽기/되돌림 규율은 (3) 소유).
  - **Reviewing** — claim·evidence를 source에서 독립 재검증하고, 자체 분석이 충돌하면 근거(확인한 사실/추론/의견 구분) 기반 이의·대안 제기. 판정은 evidence/decision candidate로 기록되며 조용히 반영되지 않음. **단, 비용이 크므로 항상 실체화하지 않고 아래 criterion으로 gate된 조건부 역할이다(@user 비용 우려 반영).**

#### Delegation criterion — 역할을 언제 별도 subagent로 실체화하는가 (제안)

- **위임(별도 agent 실체화) = 아래가 모두 성립할 때(제안)**:
  1. **Specifiable** — 작업을 task brief(대상·경계·완료 조건)로 완전히 담을 수 있다. 긴밀한 반복이 필요하면 inline.
  2. **Isolation/independence 이득** — fan-out(넓은 탐색, 결론만 필요) · 독립 검증(reviewing의 cold·독립 context) · 병렬성 중 하나.
  3. **Overhead·비용 정당화(@user Q2 반영)** — cold-start + task brief + 결과 되돌림 + **subagent 자체 토큰 소비**를 상쇄할 만큼 작업이 크다. 작으면 inline.
  4. **모델 선택(@user Q2 반영)** — 위임 시 작업의 reasoning bar와 비용에 맞는 모델을 고른다(기계적 fan-out=저비용 모델, 설계·검증=강한 모델). *factor는 portable, 구체 모델 ID는 harness-specific.*
- **inline = 작업이 작거나 · 긴밀한 반복 필요 · controlling thread에 관련 context가 이미 warm할 때.**
- **기본값은 inline.** 기준이 분명히 걸리거나 환경·사용자 정책·비용 ceiling이 허용/요구할 때만 띄운다.
- **inline이든 위임이든 결과는 단일 package log으로 되돌아온다.** 위임은 *누가 실행하느냐*만 바꾸고 *누가 상태를 소유하느냐*는 안 바꾼다.

#### Delegation 적용과 기록 (제안, @user Q1 반영)

- delegation criterion의 *적용 결정*은 package/task brief/workflow를 짤 때 내린다.
- 그 결정과 근거(위임 여부·역할·모델·비용 판단)는 **controlling log이 소유**한다: task brief는 위임 여부·대상 역할·모델을 명시하고, package의 workflow 지침에 위임 선택과 rationale을 기록한다.
- 즉 criterion(portable 규칙)은 Agent topology가 소유하고, 적용 결정·기록은 controlling log이 소유한다.

#### 나머지 topology (제안)

- **검증 독립성**: reviewing은 제안 agent의 claim을 그대로 신뢰하지 않고 반증 가능한 source에서 재확인. handoff의 file:line·기존 기록은 출발점(evidence-first invariant의 다중 agent 적용).
- **Parent/child package**: child package를 파생시키면 parent 재개·closeout이 child 상태를 복원하도록 read-path를 맞춘다. child의 active Work Item·cleanup·closeout 전제 중 parent 판단에 필요한 것은 parent 표면에도 반영.

Claude 의견상 경계:

- 역할·criterion은 portable. 메커니즘(subagent 호출 API, subagent 존재 여부, 구체 모델 ID)은 harness-specific → project integration. portable 문서에 tool·vendor·모델 이름을 박지 않는다.
- reviewing role을 "controlling/executing 2역할만 + reviewing optional"로 축소할지 vs "3역할 + reviewing 실체화만 cost-gate"로 둘지는 미결. 현재 초안은 후자(3역할·조건부 실체화). @user 확인 필요.

상태:

- 위 Agent topology + Delegation criterion은 **Claude 제안이며 사용자 승인 전**이다.
- 다음(마지막) 제안 섹션은 `Base Reconcile 적용 원리`.

### (5) 정정 — Reviewing role을 optional로 (Claude 제안)

(5)에서 미결로 남긴 "2역할 vs 3역할"을 @user 지시에 따라 정정한다. Claude 의견도 optional 분리에 동의한다.

- **정정 내용**: portable 최소 모델은 **controlling / executing 2역할**을 base로 둔다. **reviewing은 base 역할에서 빼고 optional 조건부 역할**로 둔다. (5)의 "3역할 base + reviewing 실체화만 cost-gate" 서술을 이 정정으로 대체한다.
- **Claude 의견(근거)**:
  - reviewing은 토큰·비용이 크고 항상 필요하지 않다. portable 최소 모델은 가볍게 유지하는 게 맞다(최소성 원칙).
  - reviewing은 독립 검증 이득이 큰 package(큰 claim, 비가역 변경, cross-owner 충돌 위험)에서만 켜는 optional 역할로 두는 게 비용 대비 타당하다.
  - **reviewing을 빼도 검증 원칙은 약해지지 않는다**: evidence-first/apply-later + claim provenance 불변((4))은 역할·표면과 무관하게 성립한다. controlling/executing이 이미 source에서 self-verify한다. reviewing은 그 불변을 *독립 agent로 강화*하는 optional 수단일 뿐, 불변의 유일 담보가 아니다.
- **이중 optional**: reviewing은 (a) 역할 자체가 optional이고, (b) 켜기로 해도 그 실체화는 (5) delegation criterion의 비용·모델 gate를 따른다.
- 다음(마지막) 제안 섹션은 여전히 `Base Reconcile 적용 원리`.

### (6) Base Reconcile 적용 원리 — Claude 제안 (미확정)

Claude가 제안하는 Base Reconcile 적용 원리 초안 방향.

- **핵심 — 복제 아님, 협응 계층(제안)**: package log은 base log loop를 복제하는 별도 lifecycle이 아니다. base loop에는 이미 Reconcile 단계가 있다(record가 Work state·Required Context를 바꾸면 같은 동작에서 맞춘다). package specialization = 그 같은 Reconcile을 package 의존 표면으로 확장하는 것. 새 메커니즘·새 command를 만들지 않는다.
- **함께 움직이는 의존 표면(제안)**: evidence · Scope · Work Items/next pointer · cross-artifact effects · handoff · closeout readiness 중 하나가 의미상 바뀌면, 그 변화에 의존하는 표면을 같은 동작에서 함께 Reconcile한다(나중으로 미루지 않는다).
  - evidence 변경(새 finding source 재검증) → Scope 분류·Work Items·effects.
  - Scope 변경(write-set 확장/축소) → out-of-scope effect·Work Items.
  - cross-artifact effect 발견 → 후속 소유 Work Item·아직 못 만족한 closeout readiness.
  - handoff 변경 → Work state pointer·controlling log read-path.
  - closeout readiness 변경 → Work Items·status.
- **협응 비유(제안, 설계 근거로만 보존)**: 젓가락을 쥔 손가락·근육이 협응하듯 하나만 움직이고 나머지를 나중에 고치는 게 아니라 한 동작으로 함께 움직인다. package 표면 변경과 의존 표면 Reconcile도 하나의 협응된 동작이다. 비유는 원리 설명 근거로만 두고, 실제 표면명·command명은 중립 어휘 유지.
- **두 구체 적용(제안)**:
  - **결과 되돌림 Reconcile**((3)에서 이관): 위임 agent가 finding·effect·action을 돌려주면 evidence·effects·Work Items로 맞추는 것이 Base Reconcile의 적용. "결과 흐름"의 세부 mechanics는 여기 산다.
  - **Closeout 실패 되먹임**((1)에서 이관): closeout이 correct/done을 판정하지 못하면 실패한 표면으로 돌아가 재검증·재수정 후 다시 closeout. 실패한 closeout은 "표면 변화"로서 의존 표면의 재-Reconcile을 강제한다.

Claude 의견상 경계:

- package는 "어느 표면이 어느 표면에 의존하는가"만 더하고 새 Reconcile 메커니즘을 만들지 않는다. 중립 어휘 유지.
- 의존 표면 map을 이 정도 구체로 portable 문서에 둘지 vs 원리만 진술하고 map은 project integration에 맡길지는 미결. @user 확인 필요.

상태:

- 위 Base Reconcile 적용 원리는 **Claude 제안이며 사용자 승인 전**이다.
- 이로써 W2 섹션 순서 6개(Identity·Activation/Downgrade·State owner vs Task brief·Package surfaces·Agent topology+Delegation criterion·Base Reconcile 적용 원리)의 **Claude 제안 초안이 로그에 기록**됐다. 단, 이들은 제안일 뿐이며 **W2는 완료로 표시하지 않고 `[>]` 활성 유지**한다(@user 지시). owner 파일·잔류 범위·검증 방법 제시(W3)와 승인은 아직 열려 있다.

### (6) 보강 — 의존 표면 map 예시 (Claude 제안, @user 요청)

@user 지시로 (6)의 의존 표면 map을 초안에 정식 예시로 포함한다. 이는 (6)에서 미결로 둔 "map을 portable 문서에 구체로 둘지"를 **예시로 포함**하는 방향으로 잡는다(원리만 두는 안 대신). 이 map은 source map(파일 흡수 대장, repo 전용)과 무관한 **표면↔표면 reconcile 의존표**다.

| 바뀐 표면 (trigger) | 같은 동작에서 함께 Reconcile할 의존 표면 |
| --- | --- |
| evidence (새 finding을 source에서 재검증) | Scope 분류 · Work Items · cross-artifact effects |
| Scope (allowed write-set 확장/축소) | out-of-scope effects · Work Items |
| cross-artifact effect 발견 | Work Item(후속 소유) · closeout readiness |
| handoff 변경 | Work state pointer · controlling log read-path |
| closeout readiness 변경 | Work Items · status |

- **읽는 법**: 왼쪽 표면이 의미상 바뀌면 오른쪽 표면을 미루지 말고 같은 동작에서 맞춘다.
- **경계(제안)**: 이 표는 예시다. portable 문서에는 "예시 map + '각 프로젝트의 표면 구성에 맞게 확장하라'는 단서"로 둬서 특정 표면 집합에 과적합되지 않게 한다.
- **상태**: Claude 제안이며 사용자 승인 전. W2는 여전히 완료 미표시·`[>]` 활성.

### (6) 결정 — 의존 표면 map을 문서에 구체로 포함 (@user 결정)

@user가 (6) 보강의 미결("map을 portable 문서에 구체로 둘지 vs 원리만 두고 project integration에 위임")을 **문서에 구체로 두는 것**으로 확정했다.

- portable 문서(`references/package-log.md`)에 의존 표면 map을 **구체 표로 싣는다**. 원리만 두는 안은 폐기.
- 과적합 방지 단서("각 프로젝트 표면 구성에 맞게 확장")는 표에 병기하되, 기본은 구체 map을 문서에 포함한다.
- 이 결정의 실제 문서 반영은 W3 제시 후 W4에서 한다. 현재는 여전히 Claude 제안 초안 단계이고, W2는 완료 미표시·`[>]` 활성.

### 2026-07-05 13:39 · package bootstrap·agent 계층·동적 계약 검토

#### @user 입력과 상태 구분

- package activation 뒤 실제 실행 전에 package log 생성과 workflow/bootstrap 판단을 먼저 수행하고, 탐색·범위화·검토에 subagent를 적극 활용하는 모델을 제안했다. vendor별 실행 수단은 portable 규칙에서 일반 역할 어휘로 표현하되, Claude의 agent team처럼 orchestrator가 팀을 구성·관리하는 기능은 project integration이 해당 역할에 매핑하는 방향이다.
- 저비용 worker가 primary 기준 관련 파일·line을 빠르게 탐색하고, 상위 모델이 그 보고를 바탕으로 Scope 등을 작성하며, 최고 성능 모델이 독립 검토하는 계층과 각 단계의 판정 기준을 요청했다.
- 초기 Closeout과 allowed write-set은 작업 중 추가·삭제·변경될 수 있으므로 Reconcile 대상이어야 한다고 제안했다. package 생성 시 project instructions, manifest/dependency, 검증 도구와 실행 계약을 조사하고, 필요한 도구가 없거나 추가가 필요하면 실행 전 사용자에게 제안·승인 또는 우회 판단을 받는 통합 지시서가 필요하다고 봤다.
- 모든 package task에 Task Brief를 두고, task 실행 기록은 controlling log 본문이 아니라 task별 기록으로 소유하는 구조, Task Brief 안의 inline/delegated/team 실행 기준, package별 폴더에 package 문서·brief·task 기록을 함께 두는 구조를 제안했다.
- `Conditional surfaces` 대신 고정 template을 두자는 의견을 제시했다. 다만 이번 입력 전체는 초안 토론 의견이며, `Evidence Ledger는 surface가 아니라 format`은 명시 결정이다. 직전 agent가 제시한 마지막 초안 골격 수용은 결정이 아니라 의견임을 명시했다.

#### @agent 검토

- package 파일 생성보다 먼저 짧은 activation preflight가 필요하다. 그렇지 않으면 package가 아닌 작업에도 package 구조를 생성하는 순환이 생긴다. 권고 순서는 `activation preflight → provisional package bootstrap → discovery → scope/verification/closeout draft → independent review → execution`이다.
- 저비용 모델은 bounded read-only discovery에 적합한 `scouting` 역할로 제한한다. 출력은 검색 범위, `path:line`, 직접 확인 사실, 미확인 영역과 불확실성을 가져야 하며 Scope 확정·owner 수정·correct/done 판정 권한은 주지 않는다. 의미 호출 경로·상충 owner 판정처럼 추론 비중이 큰 탐색은 낮은 모델에 일괄 위임하지 않는다.
- controlling/synthesizing 역할은 scout 보고를 원문 source에서 표본·위험 기반으로 재검증한 뒤 initial Scope, allowed write-set, Work Items, Verification Contract, Closeout Contract를 작성한다. scout 보고만 재서술하면 오류가 구조화되므로 금지한다.
- 강한 reviewing 역할은 보고서가 아니라 source와 실제 산출물을 독립 검증한다. 모든 package에 review gate를 두되 깊이는 위험 기반으로 한다. public contract·보안·데이터 migration·비가역 변경·release·다중 owner는 전면 독립 재검증, 낮은 위험은 핵심 claim 표본 검증이 타당하다. 기존 repo 사례도 독립 리뷰어들이 서로 다른 결함을 발견했고, agent 완료 보고가 disk 대조 전 신뢰될 수 없음을 보인다.
- portable topology는 `controlling / scouting / executing / reviewing` 역할과 `inline / delegated worker / coordinated team` 실행 mode를 구분한다. focused result-only는 delegated worker, worker 간 직접 협의·공유 task coordination이 필요한 독립 workstream은 coordinated team이 적합하다. vendor 기능명·API·모델 ID는 project integration이 매핑한다.
- Closeout과 allowed write-set은 정적 checklist가 아니라 versioned contract다. 변경은 이전 기준을 조용히 삭제하지 않고 amendment로 이유·근거·승인·영향받는 task를 남긴다. Scope/evidence/task 결과/tool availability/user waiver 변화는 Verification·Work Items·Task Brief·closeout readiness의 Reconcile trigger다.
- project integration은 `Verification Contract`를 소유해야 한다. instruction hierarchy, manifest scripts, CI config, test/lint/typecheck/build/e2e config, 환경·권한·외부 service를 조사해 required/recommended/unavailable/waived 검증과 source를 기록한다. 도구가 없다고 임의 설치하거나 생략하지 않고 필요성·비용·대안·잔여 위험을 먼저 보고한다. 현재 repo `package.json`에는 `test`, `typecheck`, `build`가 있고 eslint/playwright는 선언돼 있지 않으므로 이름만으로 필수 검증을 가정할 수 없다.
- 모든 독립 실행·재개 단위에 고정 Task Brief를 두는 것은 타당하나 micro-action마다 파일을 만들면 상태가 폭발한다. package Work Item 또는 별도 dispatch 단위를 brief 단위로 삼고 `execution mode / capability tier / scope / permissions / evidence output / validation / return contract`를 항상 둔다.
- Task Brief는 실행 계약, task log는 해당 task의 local History/Work state, controlling package log는 package 전역 상태 owner로 분리한다. task 종료 시 task log가 result packet을 만들고 controlling이 이를 소비해 짧은 digest와 evidence/effects/Work Items/Closeout을 Reconcile한다. brief 자체에 실행 history를 누적하지 않는다. controlling 변경은 영향받는 active brief에 amendment pointer로 전파하고 모든 line reference를 양방향 복제하지 않는다.
- 고정 template과 조건부 사용은 양자택일이 아니다. section slot은 항상 두되 비활성 surface는 `N/A + 비활성 이유 + 재활성 trigger`를 기록하는 방식을 권고한다. 이는 발견 가능성을 보장하면서 억지 ledger/table 채우기를 피한다.
- package directory는 응집도에 이점이 있으나 현재 `scripts/log search/check`가 `logs/*.md`만 순회해 중첩 로그를 자동 발견하지 못한다. 폴더 구조 채택은 log tool·project entry/search/index 계약 변경과 함께 W3 적용안에서 다뤄야 한다.

#### 남은 W2 판단

- fixed template의 정확한 section set과 `N/A + trigger` 규칙 승인 여부.
- package task의 brief 단위를 모든 Work Item으로 할지 independently resumable/dispatch unit으로 제한할지.
- 모든 package의 strong review gate를 의무화하되 위험별 검토 깊이를 달리할지.
- task log/result packet schema와 controlling log 소비·Reconcile 계약.
- nested package directory를 portable 기본으로 둘지 project integration 선택으로 둘지, 그리고 tool discovery 변경 범위.
- W2는 계속 `[>]` 활성이다. 이번 기록은 owner 반영 승인이 아니다.

### 2026-07-05 14:13 · Claude 검토에 대한 Codex 판정과 W2 통합 초안

#### 입력 상태

- @user는 직전 Codex 제안을 바탕으로 한 Claude의 구조 검토를 제공하고 Codex 의견과 W2 최종 초안을 요청했다. Claude 내용은 타 agent 의견이며 사용자 결정으로 간주하지 않는다.
- 기존 사용자 결정은 `Evidence Ledger = surface가 아니라 format`, reviewing은 optional role, 의존 표면 map을 portable 문서에 구체 수록하는 것이다. 직전 Codex 골격 수용은 사용자 의견일 뿐 결정이 아니다.

#### Codex 판정

- 설계 철학은 `subagent-first`보다 `strict activation + stable skeleton + delegation-assisted evidence pipeline`으로 명명하는 것이 정확하다. package는 무거운 workflow이므로 activation/downgrade gate를 강화한다.
- 표준 pipeline은 `activation preflight → provisional package bootstrap → low-cost discovery worker → controlling synthesis → review stage → task execution → result promotion/Reconcile → closeout`이다. Scope 작성은 warm context의 controlling이 소유하며 별도 spawn을 기본 요구하지 않는다.
- review stage는 항상 존재하지만 independent highest-capability reviewer 실체화는 큰 claim, 비가역·외부 영향, public contract/security/data/release, 다중 owner 충돌, 낮은 discovery confidence 중 하나가 있을 때 gate한다. 그 밖에는 controlling self-review로 충족한다.
- portable 모델 자체에 fixed skeleton을 둔다. nullable section은 `N/A + reason + activation trigger`로 비적용을 명시한다. repo마다 skeleton 여부를 달리하면 같은 portable package가 서로 다른 read path를 가져 예측 가능성이 약해지므로 project option으로 내리지 않는다.
- 모든 executable package Work Item은 Task Brief를 가져야 한다. inline 작업은 compact brief, delegated·independently resumable 작업은 full brief와 task record를 쓴다. micro-action은 별도 Work Item/brief로 승격하지 않는다.
- Claude의 `controlling-first` 문구는 순서상 수정한다. task record가 candidate finding·execution trace를 먼저 소유할 수 있다. controlling은 Result Packet을 source에서 재검증해 accepted evidence/effect/action으로 승격한 뒤 owner artifact를 수정한다. task-only candidate는 허용하지만 task closeout 뒤 accepted owner-impact claim이 controlling에 소비되지 않은 상태는 금지한다. Task Brief에는 history를 쓰지 않고 amendment만 둔다.
- Closeout을 `criteria`와 `readiness`로 분리한다. criteria, allowed write-set, Verification Contract는 살아있는 versioned contract이고 변경 시 기존 항목을 조용히 삭제하지 않고 amendment reason·authority·affected tasks를 남긴다.
- portable core는 logical package bundle과 역할/계약만 소유한다. vendor agent/team 기능, model ID, manifest/tool 이름, 실제 folder layout과 discovery command는 project integration이 매핑한다. 현재 repo는 log search/check가 top-level `logs/*.md`만 순회하므로 nested folder adoption은 tool/entry integration 변경 전 확정할 수 없다.

#### W2 통합 초안 구조

1. Identity — package workflow와 controlling package log 정의, logical package bundle과 state owner 경계.
2. Activation/Downgrade — common correct/done gate, activation signals·anti-signals, heavy-package cost에 맞춘 downgrade.
3. Bootstrap and Project Integration — provisional package 생성, instruction/owner/manifest/CI/tool/environment probe, 초기 Scope·Verification·Closeout seed.
4. Artifact and Evidence Tests — boundary, related artifact, scope authority, provenance, effect/action binding.
5. State Ownership and Task Contract — controlling accepted state, Task Brief, task candidate record, Result Packet promotion gate.
6. Agent Topology and Model Routing — controlling/scouting/executing/reviewing 역할, inline/delegated/coordinated-team mode, capability·cost·independence gate.
7. Fixed Package Skeleton — Scope, Work Items, Workflow/Agent Plan, Task Index, Verification Contract, Closeout Contract, Evidence Ledger format, Cross-Artifact Effects, Decision Candidates, Amendments; nullable section 규율.
8. Package Reconcile — evidence·Scope/write-set·task result·verification contract·closeout criteria/readiness·handoff/status dependency map과 같은 동작 갱신.
9. Closeout — owner artifacts, accepted evidence, task result consumption, verification result, waiver/residual risk, out-of-scope handoff, status gate.

#### Reconcile map 보강

- evidence candidate 수용/기각 → Scope 분류 · effects · Work Items · verification · closeout criteria/readiness.
- related artifact 또는 Scope 변경 → allowed write-set · affected Task Brief amendment · verification contract · closeout criteria.
- write-set 변경 → out-of-scope effects · authority/approval · Work Items.
- verification tool/환경/waiver 변경 → Verification Contract · Work Items · closeout criteria/readiness · residual risk.
- task Result Packet 소비 → accepted evidence · effects · Work Items · handoff/next pointer.
- handoff 변경 → Work state pointer · controlling/task read path.
- closeout criteria/readiness 변경 → Work Items · status.

#### 상태

- 이는 Codex의 W2 통합 제안이며 사용자 승인 전이다. W2는 `[>]` 활성 유지, owner 파일과 base skill/onramp/tool은 수정하지 않는다.
- 사용자 결정을 받아야 할 핵심은 fixed portable skeleton, gated independent review, brief profile(compact/full), candidate→accepted promotion contract, logical bundle과 physical folder의 owner 경계다.

### 2026-07-05 14:14 · 통합 초안 구조 정정 — History owner와 task 적용 경계

- 직전 통합 초안의 fixed skeleton에서 별도 `Amendments` section은 제외한다. Scope·Verification Contract·Closeout Contract는 현재 유효 상태를, 기존 History surface는 변경 이유·이전 기준·승인 경위를 소유한다. 별도 Amendments surface는 History와 중복 owner가 된다.
- task record의 candidate evidence가 controlling에 수용되기 전 모든 owner 수정을 금지하는 것으로 읽히지 않게 경계를 정정한다. executing task는 Task Brief와 이미 승인된 allowed write-set 안에서 source를 직접 검증한 뒤 수정할 수 있다. 다만 새 owner, write-set 확장, verification/closeout criteria 변경을 요구하는 finding은 controlling에 escalation·수용되기 전 적용하지 않는다.
- task 결과가 돌아오면 controlling은 실제 source와 산출물을 재검증해 accepted package state로 소비하고 evidence/effects/Work Items/closeout을 Reconcile한다. task closeout 뒤 accepted owner-impact 결과가 controlling에 소비되지 않은 상태는 허용하지 않는다.
- fixed package skeleton의 package 전용 표면은 `Package Scope`, `Workflow / Agent Plan`, `Task Index`, `Evidence`(Evidence Ledger는 format), `Cross-Artifact Effects`, `Decision Candidates`, `Verification Contract`, `Closeout Contract(criteria/readiness)`로 정리한다. base log의 Work Items·Required Context·History·status/Closeout 절차는 복제하지 않고 상속한다.

### 2026-07-05 14:27 · Claude 독립 검토 수용 판정과 통합안 보강

#### 입력과 총평

- @user는 Codex 통합안에 대한 Claude 독립 검토를 전달했다. Claude는 owner 수정·로그 기록 없이 관련 log/base rules/script/package manifest/repo task brief 계약을 확인한 뒤 조건부 수용했고, 5개 실질 gap과 3개 추가 gap을 제시했다. 이는 타 agent 의견이며 사용자 결정이 아니다.
- Codex는 two-anchor review, Task Index/Work Items 경계, compact brief 최소 계약, task lifecycle Reconcile trigger, reviewer 충돌, waiver scope binding, Closeout criteria/readiness 분리를 채택한다.

#### 그대로 채택하지 않는 부분

- candidate→accepted promotion은 base detach/복귀 소비와 유사한 선행 사례지만 동일 개념은 아니다. detach는 작업 수명·결과 소비 관계이고 promotion은 evidence의 epistemic acceptance 관계다. portable 규칙은 둘을 별도로 정의하고, task record가 실제 child log일 때만 base Return Target/detach 계약을 재사용한다.
- task 종료와 controlling 소비를 분산 실행에서도 항상 원자적 같은 동작으로 강제하면 controlling 중단·비동기 worker 상황에서 task를 닫을 수 없다. task 실행 완료 후 `finished-awaiting-consumption`을 명시하고, controlling 소비 전에는 accepted/closed로 보지 않는다. controlling은 재개 후 Result Packet을 수용·기각하고 Work Item과 package 표면을 Reconcile한다. 미소비 상태는 package closeout을 차단한다.
- Task Index를 mapping-only로 제한하면서 compact brief를 그 안에 두는 안은 모순이다. Task Index는 W-id, brief profile, execution mode, contract/record 위치와 compact brief의 최소 계약(대상·경계/write-set ref·완료 조건·검증)을 소유할 수 있다. 진행·완료 상태는 Work Items marker만 소유한다.

#### 추가 채택·보강

- review는 두 anchor를 가진다: synthesis 뒤 contract review, Result Packet promotion 때 result review. review activity는 항상 수행하고 independent reviewer는 위험 gate로 실체화한다. self-review 최소 checklist는 Scope/write-set 정합, Verification 실행 가능성, Closeout criteria 판정 가능성이다.
- independent reviewer 판정은 candidate로 기록한다. controlling이 수용/기각하고 기각 이유를 History에 남긴다. closeout-blocking 충돌이 해소되지 않으면 responsible authority로 escalation하며, 별도 authority가 없으면 사용자에게 확인한다.
- discovery phase는 고정하되 worker 위임은 optional이다. scout false negative는 보고된 claim spot-check만으로 잡히지 않으므로 탐색 공간·coverage evidence·producer/consumer/inbound/outbound·독립 검증과 residual risk를 Verification Contract가 다룬다.
- concurrent task write-set은 기본적으로 분리한다. 겹치면 동일 artifact owner를 하나로 두거나 순차화하고 Brief에 dependency를 명시한다.
- Scope/Verification/Closeout 같은 mutable contract에는 현재 revision과 해당 History entry pointer를 둔다. 별도 amendment index는 만들지 않는다.
- Reconcile map에 `Work Item 취소/이관→Brief·task record 처분`, `Brief amendment→active/resumed task와 Result Packet 기준 재검증`, `activation/downgrade→provisional 산출물 처분`, `Scope 확장→waiver scope 재평가`를 추가한다.
- validation 미실행은 task completion으로 보고하지 않고 Result Packet에 unavailable/failed/not-run과 이유를 명시한다. Verification surface 의미는 portable이, 실제 tool/command/waiver 내용은 project integration이 채운다.

#### 사용자 결정 대기

- fixed portable skeleton + `N/A/reason/trigger`.
- two-anchor review activity always + independent reviewer gated.
- 모든 executable W의 compact/full Brief profile과 Task Index 계약 owner 경계.
- candidate→accepted promotion 및 `finished-awaiting-consumption` 중간 상태.
- W2는 `[>]` 활성 유지하며 owner/base skill/onramp/tool은 수정하지 않는다.

### 2026-07-05 14:28 · 정정 — awaiting-consumption은 새 상태가 아님

- 직전 entry의 `finished-awaiting-consumption`은 새 frontmatter status, Work Item marker 또는 Task Index 진행 상태를 뜻하지 않는다. `Result Packet은 준비됐지만 controlling Work Item이 아직 소비하지 않은 조건`을 서술하는 용어다.
- task record가 base child log이면 기존 Return Target과 parent `[↓]`가 소비 대기를 소유하며 child는 소비 전 terminal closeout하지 않는다. compact/inline task에는 별도 중간 상태를 만들지 않는다.
- 따라서 진행·완료·소비 상태 owner는 계속 base Work Items/Return Target이고 Task Index는 contract와 locator만 소유한다.

### 2026-07-05 14:47 · 다음 세션 handoff — 최종 초안과 4개 승인 질의응답

#### 다음 세션 목적

- @user는 다음 세션에서 W2 최종 통합 초안을 다시 보고, 남은 4개 결정에 대해 질의응답한 뒤 승인 여부를 판단하기로 했다.
- 다음 세션은 새 설계안을 확장하는 시간이 아니라, 현재 Codex 통합안과 Claude 독립 검토·Codex 수용 판정을 기준으로 개념·비용·edge case를 확인하고 각 항목을 결정하는 수렴 세션이다.

#### 필수 재개 입력

- 이 블록의 최신 entry 중 `Claude 검토에 대한 Codex 판정과 W2 통합 초안`, `통합 초안 구조 정정 — History owner와 task 적용 경계`, `Claude 독립 검토 수용 판정과 통합안 보강`, `정정 — awaiting-consumption은 새 상태가 아님`을 순서대로 읽는다.
- 확정된 기존 결정은 `references/package-log.md` on-demand 배치, reviewing optional role, Evidence Ledger는 format, 구체 Reconcile map 수록이다. 최신 통합안과 아래 4개는 아직 사용자 결정이 아니다.

#### 질의응답할 4개 결정

1. Fixed portable skeleton: package 전용 8표면을 항상 두고 비적용은 `N/A + reason + activation trigger`로 기록할지.
2. Two-anchor review: contract review와 result review activity를 항상 수행하고 independent reviewer는 위험 gate에서만 실체화할지.
3. Task Brief profile과 Task Index 경계: 모든 executable W에 compact/full Brief를 두고 Task Index는 계약·locator를, Work Items는 진행 상태를 단독 소유하게 할지.
4. Candidate→accepted promotion: task record candidate, 승인 write-set 안 직접 수정, scope/contract 확장 escalation, Result Packet 소비와 미소비 closeout 차단 계약을 채택할지. `finished-awaiting-consumption`은 새 status가 아니라 미소비 조건 설명이다.

#### 진행·전이 조건

- 각 항목은 정의, 기본 동작, 비용, 실패 시나리오, 대안을 설명한 뒤 @user의 승인·수정·거부를 각각 기록한다. 묶음 동의로 추정하지 않는다.
- 네 항목이 모두 결정되고 그 결과로 W2 최종 초안의 섹션·owner 경계·Reconcile map이 모순 없이 닫히면 W2 완료 후보를 보고한다. 사용자 확인 전 W2를 `[x]`로 바꾸거나 W3를 활성화하지 않는다.
- owner/reference/base skill/onramp/tool 편집은 W3 적용안 승인 전 수행하지 않는다.

### 2026-07-05 14:56 · 결정 1 승인 — Fixed portable skeleton

#### @user 결정

- @user는 결정 1의 권고 문장인 fixed portable skeleton을 승인했다.

#### 확정된 계약

- Base log의 Work Items, Required Context, History, status/Closeout 절차는 상속하고 package log에 복제하지 않는다.
- Package 전용 고정 표면은 Package Scope, Workflow / Agent Plan, Task Index, Evidence, Cross-Artifact Effects, Decision Candidates, Verification Contract, Closeout Contract의 8개다.
- 적용되지 않는 표면은 삭제하지 않고 `N/A`, `Reason`, `Activate when`을 기록한다. Package 성립과 판정에 필수인 Scope, Verification Contract, Closeout Contract는 근거 없이 비적용 처리하지 않는다.
- Evidence Ledger는 Evidence surface의 format이다.
- Scope, Verification Contract, Closeout Contract 같은 mutable contract는 현재 revision과 관련 History entry pointer를 가진다.
- 별도 Amendments section은 만들지 않는다.

#### 이유와 Reconcile

- 고정 read path로 누락과 실제 비적용을 구분하고 portable package 간 예측 가능성을 유지하는 이득이 boilerplate 비용보다 크다고 승인했다. 비용은 strict activation/downgrade와 간결한 N/A 기록으로 제한한다.
- 이 결정으로 fixed skeleton은 더 이상 W2 미결 항목이 아니다. Task Index의 세부 owner 경계, review anchor, candidate→accepted promotion은 각각 결정 2~4에서 별도로 수렴하며 이번 승인으로 추정하지 않는다.
- W2의 행동·완료 조건과 `[>]` 재개 지점은 유지된다. 다음 행동은 결정 2 Two-anchor review 질의응답이다.

### 2026-07-05 14:59 · 결정 2 승인 — Two-anchor review

#### @user 결정

- @user는 Two-anchor review 권고안을 승인했다. 질의응답에서 독립 reviewer 흐름의 세부 경계를 확인한 뒤 반영을 지시했다.

#### 확정된 계약

- 모든 package는 synthesis 뒤 Scope, allowed write-set, Verification Contract, Closeout Contract, 관련 Brief를 검토하는 contract review와 실행 결과를 accepted package state로 반영하기 전 result review를 수행한다.
- Review activity는 두 anchor 모두 항상 수행한다. 낮은 위험에서는 controlling self-review로 충족하고, 큰 claim, public contract/security/data/release, 비가역·외부 영향, 다중 owner 충돌, 큰 blast radius, 낮은 discovery confidence 중 위험 gate가 있을 때만 independent reviewer를 실체화한다.
- Self-review 최소 기준은 Scope/write-set 정합, Verification 실행 가능성, Closeout criteria 판정 가능성이다.
- Independent reviewer는 source와 실제 산출물을 검토해 근거가 있는 candidate 판정을 발행한다. Controlling은 이를 수용해 필요한 코드·Scope·Verification·Work Item·Closeout 변경과 재검증을 수행하거나, 반증 근거를 History에 기록하고 기각한다.
- 단순 의견 불일치는 escalation 조건이 아니다. 근거 있는 기각으로 closeout 판단이 닫히면 종료하며, closeout-blocking 충돌이 해소되지 않을 때만 responsible authority, 없으면 사용자에게 escalation한다.

#### Reconcile과 남은 경계

- 두 anchor와 위험 gate 적용 결과는 고정 skeleton의 Workflow / Agent Plan에 계획하고, 검토로 계약·evidence·결과가 바뀌면 해당 package 표면과 Work Items를 Reconcile한다.
- Result Packet의 candidate→accepted mechanics는 결정 4가 소유하므로 이번 승인으로 세부 promotion 계약을 추정하지 않는다.
- W2는 `[>]`를 유지한다. 다음 행동은 결정 3 Compact/full Task Brief와 Task Index 경계 질의응답이다.

### 2026-07-05 15:08 · 결정 3 수정 승인 — Task record와 Compact/Full 경계

#### @user 결정

- @user는 최초 권고안의 inline Compact Brief를 수정해, 모든 executable package Work Item이 별도 task record를 갖는 모델을 승인했다.
- 수정 이유는 나중의 검색과 역할 추적에서 Task Index 안의 inline Brief만으로는 작업 경위와 실행 주체가 모호해질 수 있다는 점이다.

#### 확정된 task record 경계

- 모든 executable package Work Item은 별도 task record를 가진다. Micro-action은 Work Item이나 task record로 승격하지 않는다.
- 하나의 task record 안에서 Identity, Task Brief, Task History, Result / Verification의 owner를 분리한다. Brief는 현재 실행 계약을, History는 append-only 작업 경위와 실행 기록을, Result / Verification은 산출물·검증 결과·candidate finding을 소유한다.
- Compact와 Full의 차이는 파일 유무가 아니라 실행·재개 계약의 깊이다. Compact는 현재 controlling agent가 warm context에서 inline 실행하고 local lifecycle을 만들지 않는다. Full은 delegated 또는 independently resumable 실행을 위해 권한, dependency, handoff, 반환 계약을 추가하며 필요하면 base child log/Return Target 계약을 사용한다.
- Delegation과 independent review는 별개 축이다. Compact/Full 어느 profile도 위험 gate에 따라 self-review 또는 independent review를 적용할 수 있다.
- 실제 directory와 filename convention은 portable core가 고정하지 않고 W3 project integration 적용안에서 정한다.

#### Task Index와 상태 owner

- Task Index는 W-id, compact/full profile, execution mode, task record locator의 mapping만 소유한다. Brief 내용과 진행·완료 상태를 복제하지 않는다.
- Package 진행·완료 상태는 base Work Items marker와 next pointer가 단독 소유한다.
- Concurrent task write-set은 기본 분리한다. 겹치면 단일 artifact owner를 지정하거나 순차 dependency를 task contract에 둔다.

#### Controlling log와 task record의 기록 경계

- Task record는 어떻게 작업했는지를 소유한다: 실제 수행 과정, 확인한 source, candidate finding, 변경한 artifact, 명령·검증 결과, task 내부 판단과 오류.
- Controlling package log는 그 결과 accepted package state가 어떻게 바뀌었는지를 소유한다: result 수용·기각과 근거, Work Item/next pointer 변경, accepted evidence와 cross-artifact effect, Scope/write-set·Verification·Closeout 변경, 후속 행동, closeout readiness와 최종 완료 판단.
- Task 실행 기록 전체를 controlling log에 복사하지 않고 task record pointer와 package-level digest만 남긴다.

#### Reconcile과 남은 경계

- 결정 1의 고정 Task Index surface는 mapping-only로 구체화됐다. 최초 제안의 compact Brief inline 소유는 이 결정으로 대체한다.
- Result를 candidate에서 accepted package state로 승격하는 정확한 수용·기각·재검증·closeout 차단 계약은 결정 4가 소유하며 아직 확정하지 않는다.
- W2는 `[>]`를 유지한다. 다음 행동은 결정 4 Candidate→accepted promotion 질의응답이다.

### 2026-07-05 15:10 · 결정 4 승인 — Candidate→accepted promotion

#### @user 결정

- @user는 Candidate→accepted promotion contract 권고안을 승인했다.

#### 확정된 promotion 계약

- Task record는 candidate evidence, execution trace, Result / Verification을 소유한다.
- Task는 승인된 Brief와 allowed write-set 안에서 source를 직접 검증한 뒤 artifact를 수정할 수 있다.
- 새 owner, write-set 확장, Verification Contract 변경, Closeout criteria 변경은 controlling 수용 전 적용하지 않는다. 허용된 artifact 수정이라도 그 정당성이 scope-expanding finding에 의존하면 함께 보류하고 escalation한다.
- Controlling은 두 번째 review anchor에서 task record, 실제 source, 산출물과 검증 결과를 재확인한 뒤 result를 수용 또는 근거를 기록하고 기각한다. 수용한 결과만 accepted evidence, effect, action과 package contract 변경으로 승격한다.
- 미소비 Result / Verification은 package closeout을 차단한다. Work Item은 result가 소비되고 남은 행동이 Reconcile되기 전에 자동 완료하지 않는다.
- 별도 `finished-awaiting-consumption` status를 만들지 않는다. Compact task의 소비 조건은 parent Work Item이 소유하고, Full task가 실제 child log이면 기존 Return Target과 parent `[↓]`를 사용한다.

#### 결정 2·3과의 Reconcile

- Compact/Full 모두 task record가 있으므로 Result / Verification이 candidate 결과의 공통 source가 된다. Compact는 같은 controlling agent가 실행하더라도 task execution 기록과 package-level acceptance를 분리한다.
- Independent reviewer 판정도 candidate이며 controlling 수용·기각과 unresolved closeout-blocking escalation은 결정 2 계약을 따른다. Delegation 여부와 review 독립성은 계속 별개 축이다.
- Controlling log에는 task trace 전체가 아니라 task record pointer, 수용·기각 근거, accepted package-level 변화와 상태 전이만 기록한다.
- 이 승인으로 W2의 네 결정이 모두 수렴했다. W2 marker는 사용자 완료 승인 전까지 `[>]`를 유지한다.

### 2026-07-05 15:11 · W2 최종 수렴안 — 4개 결정 반영과 정합성 검사

#### 결정 결과

| 결정 | 결과 | 확정된 핵심 |
| --- | --- | --- |
| Fixed portable skeleton | 승인 | Base 표면 상속, package 8표면 고정, 비적용은 N/A/Reason/Activate when |
| Two-anchor review | 승인 | Contract/result review 항상, independent reviewer는 위험 gate |
| Task record와 Compact/Full | 수정 승인 | 모든 executable W에 별도 task record, Task Index mapping-only, profile은 실행·재개 깊이 |
| Candidate→accepted promotion | 승인 | task candidate와 controlling accepted state 분리, 미소비 result는 closeout blocker |

#### W2 최종 통합 초안 — 9개 섹션

1. **Identity** — package workflow는 primary artifact/change boundary와 related artifact를 하나의 correct/done gate로 다루는 절차다. Controlling package log는 accepted package state의 단일 owner다. Base lifecycle을 복제하지 않고 조건부 coordination layer로 확장한다.
2. **Activation/Downgrade** — 파일 수·로그 길이·병렬성 대신 공통 evidence, scope, handoff, closeout gate 필요성으로 활성화한다. 엄격한 preflight 뒤 provisional bootstrap하며 공통 gate가 없으면 일반 log로 downgrade하고 provisional 산출물을 처분한다.
3. **Bootstrap and Integration Probe** — project instruction, owner와 inbound/outbound 관계, manifest/CI/tool/environment를 조사한다. 초기 Scope/write-set, Workflow / Agent Plan, Task Index, Verification Contract, Closeout Contract를 만들고 첫 review anchor에서 실행 가능성을 검토한다. Portable은 의미를, project integration은 실제 path·command·tool mapping을 소유한다.
4. **Artifact and Evidence Tests** — Boundary, Related Artifact, Scope Authority, Evidence/Provenance, Effect/Action Binding test를 적용한다. Current-state claim은 source에서 재검증하고 target-state claim과 구분한다. Owner 영향 변경은 evidence 확인 뒤 수행한다.
5. **State Ownership and Task Contract** — Base Work Items가 package 진행 상태를 단독 소유한다. 모든 executable W는 Identity, Task Brief, Task History, Result / Verification을 분리한 task record를 갖는다. Task Index는 W-id, profile, execution mode, locator mapping만 소유한다. Task record는 candidate execution state를, controlling log는 수용·기각과 accepted package-level 변화를 소유한다.
6. **Agent Topology and Execution Modes** — 역할은 controlling, scouting, executing과 optional reviewing으로 구분한다. 실행 mode는 inline, delegated worker, coordinated team으로 구분하며 vendor 기능·model ID는 integration이 매핑한다. Compact/Full은 task record 유무가 아니라 warm inline 실행과 delegated/independently resumable 계약 깊이의 차이다. Delegation과 independent review는 직교한다.
7. **Fixed Package Skeleton** — Base Work Items, Required Context, History, status/Closeout 절차를 상속한다. Package 전용 표면은 Package Scope, Workflow / Agent Plan, Task Index, Evidence, Cross-Artifact Effects, Decision Candidates, Verification Contract, Closeout Contract다. 비적용은 N/A/Reason/Activate when으로 표시하고 Evidence Ledger는 Evidence format으로 사용한다. Mutable contract는 revision과 History pointer를 가지며 별도 Amendments section은 두지 않는다.
8. **Package Reconcile** — Evidence 수용·기각, Scope/write-set, task contract/result, review, verification 환경·waiver, handoff, closeout 변화가 의미상 의존하는 표면을 같은 동작에서 갱신한다. Task Result 소비는 accepted evidence/effects, Work Items/next pointer, Verification과 Closeout readiness를 갱신한다. Work Item 취소·이관은 Task Index와 task record 처분을, activation/downgrade는 provisional 산출물 처분을 함께 갱신한다.
9. **Closeout** — 모든 executable W의 result가 소비됐고, 두 review anchor, accepted evidence/effects, required verification, waiver/residual risk, out-of-scope handoff, contract criteria가 판정 가능하고 충족됐는지 확인한다. 미소비 result와 unresolved closeout-blocking review conflict는 종료를 막는다. 조건 충족 뒤에만 base status 절차로 전이한다.

#### Owner·portable/integration·Reconcile 정합성 검사

- Base log owner와 package owner는 중복되지 않는다. Work Items/Required Context/History/status procedure는 base가, 8개 package surface와 accepted package state는 controlling log가 소유한다. Closeout Contract의 criteria/readiness와 base Closeout/status procedure도 구분된다.
- Task record와 controlling log는 중복 owner가 아니다. 전자는 실행 trace·candidate result, 후자는 수용·기각 근거와 accepted package-level state를 소유한다. Task Index는 locator mapping만 소유해 상태를 복제하지 않는다.
- Portable/project integration 경계는 닫힌다. Portable은 별도 task record와 계약 semantics를 요구하지만 실제 directory, filename, discovery command, vendor agent/team 기능, model과 concrete verification command는 project integration이 정한다.
- Two-anchor review와 promotion은 모순되지 않는다. 첫 anchor는 실행 전 contract를, 둘째 anchor는 candidate result의 acceptance를 검토한다. Independent review는 execution mode와 별개이며 결과는 candidate로 같은 promotion 경계를 통과한다.
- Reconcile map은 fixed surface, task lifecycle, review, promotion과 closeout blocker를 모두 연결한다. Scope expansion은 write-set·Brief·Verification·Closeout·waiver scope를, result 소비는 accepted surface·Work Items·next pointer·closeout readiness를 함께 갱신한다.

#### 상태

- 네 미결 결정은 모두 승인 또는 수정 승인됐고 9개 섹션과 owner 경계의 내부 모순은 현재 검사에서 발견되지 않았다. W2는 완료 후보다.
- 사용자 승인 전에는 W2를 `[x]`로 바꾸거나 W3를 `[>]`로 활성화하지 않는다. Owner/reference/base skill/onramp/tool 파일도 수정하지 않는다.

### 2026-07-05 15:20 · W2 완료 전 독립 전체 검토 요청 — folder model과 prompt audit 포함

#### @user 요청

- @user는 W2 완료 전 Claude에게 승인된 네 결정만이 아니라 package-log 모델 전체 초안의 독립 검토를 받기로 했다.
- 검토 범위에는 Identity부터 Closeout까지 9개 섹션, fixed skeleton, task record와 promotion 계약, Reconcile map뿐 아니라 logical package bundle과 실제 folder/file layout의 경계와 후보도 포함한다.
- Claude는 gap, owner 충돌, base log 불변 위반, portable/project integration 경계, 실행·검색·재개 가능성과 비용을 검토해야 한다.
- Claude에게 전달할 검토 프롬프트 자체도 누락·모순·편향·검증 불가능한 요구가 있는지 별도 pass로 self-audit하도록 요청한다.

#### Reconcile

- W2는 완료 처리하지 않는다. 외부 검토 결과를 받은 뒤 각 finding을 확인 사실, 추론, 의견으로 분리해 Codex가 독립 판정하고 필요한 수정·추가 승인 여부를 사용자에게 제시해야 한다.
- Owner/reference/base skill/onramp/tool 파일은 계속 수정하지 않는다. 이번 단계는 read-only review prompt 작성과 후속 검토 결과 수렴이다.

### 2026-07-05 15:34 · Claude 독립 review에 대한 Codex 판정 — 수용·수정·기각

#### 입력 상태

- @user는 Claude의 W2 전체 독립 review 결과를 전달했다. 이 결과는 타 agent 분석이며 자동 수용하지 않는다.
- Claude는 승인된 4개 결정을 유지 가능하다고 판정하면서 task record 문서 정체성(F1), 기각·부분 수용 artifact disposition(F2), reviewer/scout candidate 기록 위치(F3)를 우선 gap으로 보고했다.

#### Codex 직접 확인

- Base log는 topic/description/status frontmatter, Work Items, Required Context와 Return Target을 갖는 수명·상태 문서다. `log search`와 status 기반 `log check` 열거는 `LOG_DIR/*.md` top-level base log만 대상으로 한다.
- 기존 `logs/W*-task.md` 선례는 frontmatter·base Work Items 없이 `# Task Brief`로 시작하는 실행 지시 문서다. 따라서 Compact record를 base log로 취급하면 local lifecycle 없음 계약과 충돌하고, 비-log task record로 두면 별도 최소 구조 계약이 필요하다는 F1 핵심은 확인됐다.
- `scripts/onramp`의 plan anchor와 `[↓]` chain은 명시된 nested 경로를 따라갈 수 있으나, `log search`와 open-log source 열거는 top-level 한정이다. 따라서 nested discovery가 전면 불가능하다는 과거 표현은 과도하며 실제 layout과 tool 영향은 W3에서 구분해야 한다.
- @user는 질의응답에서 Compact를 포함한 모든 executable W에 별도 task record 파일을 생성하는 안을 명시적으로 승인했다. Claude Prompt Gap 2(a)의 파일 1:1 미확정 주장은 사용자 결정과 충돌한다.

#### Finding 판정

- F1은 Blocker로 수용한다. Portable이 non-log task record의 최소 문서 정체성·불변과 Full record가 base child log로 전환되는 조건을 소유해야 한다.
- F2는 High로 수용한다. 기각·부분 수용 시 이미 적용된 artifact의 revert, corrective W, partial acceptance disposition이 확정되기 전 closeout을 차단해야 한다.
- F3은 수정 수용한다. Delegated scout/reviewer dispatch는 executable action으로 W/task record를 가져야 하고, inline self-review/discovery는 controlling History와 해당 Evidence/Decision Candidates 표면에 기록하는 경계가 필요하다.
- F4~F11, F13, F14는 portable 보강 후보로 수용한다. Package lifetime transition은 base cross-log 규칙을 복제하지 않고 package membership/locator/task disposition Reconcile만 추가한다.
- F15는 W3 integration 입력으로 수용한다. Flat/hybrid/full-nested의 실제 discovery 차이와 `.log-hints` 영향은 layout 적용안에서 검증한다.
- F12의 `path#anchor` locator 허용은 기각한다. 모든 executable W별 별도 task record 파일이라는 승인과 충돌하며 파일 수 절감 목적으로 record를 합치면 검색성과 역할 추적을 강화하려던 결정 3의 이유를 되돌린다. Portable locator는 task record file의 안정 path를 가리킨다.
- Claude의 scenario 합계는 본문 판정상 7 closed, 2 partial, 3 open인데 7/3/2로 적혀 산술 오류다. 개별 finding의 유효성에는 영향이 없다.

#### 상태와 다음 행동

- W2는 완료 불가이며 `[>]`를 유지한다. 승인된 4개 상위 결정은 폐기하지 않고 하위 계약을 보강한다.
- 다음 질의응답은 F1 task record 문서 정체성이다. 이후 disposition, scout/reviewer record home, remaining portable delta를 순서대로 수렴한 뒤 단일 정규 W2 초안을 다시 검사한다.

### 2026-07-05 15:41 · 추가 결정 1 승인 — Task record 문서 정체성과 locator 경계

#### @user 결정

- @user는 설명을 확인한 뒤 task record 문서 정체성 권고안에 동의했다.

#### 확정된 task record 문서 계약

- 모든 executable W의 task record는 기본적으로 base log가 아닌 별도 Markdown 문서다.
- 일반 task record는 Identity, Task Brief, Task History, Result / Verification을 가진다. Base log의 frontmatter status, Work Items, Required Context, Return Target은 두지 않는다.
- Task Index의 안정된 task record 파일 경로가 canonical locator다. 모든 executable W는 별도 task record 파일을 가지며 여러 W의 record를 anchor로 한 파일에 합치지 않는다.
- Task History는 해당 task가 어떻게 작업됐는지를 소유한다: 확인 source, 수행·수정, 판단과 근거, 검증, 실패·재시도, contract 변경 경위. 대화 전문·의미 없는 명령 나열·package accepted state는 소유하지 않는다.
- Task History의 기존 entry는 고쳐 쓰지 않고 정정·후속 판단을 새 entry로 append한다.
- Task Brief는 현재 유효한 계약이며 revision과 해당 변경 이유·authority를 기록한 Task History entry pointer를 가진다.
- Compact 또는 one-shot Full은 일반 task record를 사용한다. 자체 Work Items/next pointer, 세션 간 독립 재개와 Return Target이 필요한 Full task만 base child log 계약을 적용하고 task record 4표면을 함께 가진다. 단순 위임만으로 child log를 만들지 않는다.

#### F12 정정 판정

- Claude F12의 `path#anchor`를 전면 금지하지 않는다. 여러 executable W를 한 파일에 합쳐 파일 수를 줄이는 locator 사용은 결정 3의 별도 파일·검색성 이유와 충돌하므로 기각한다.
- Canonical task identity와 Task Index locator는 파일 경로가 소유한다. 같은 task record 안의 Brief revision이나 Task History entry로 이동하는 보조 pointer에는 `path#anchor`를 사용할 수 있다.

#### Reconcile과 상태

- Task Index, task record, Work Items의 owner 경계는 유지된다. 일반 task record는 log search/onramp current-work 후보가 아니며 controlling log의 Task Index를 통해서만 발견한다.
- W2는 `[>]`를 유지한다. 다음 질의응답은 task result 기각·부분 수용 시 이미 적용된 artifact disposition과 closeout blocker다.

### 2026-07-05 15:42 · 추가 결정 2 승인 — 기각·부분 수용 Artifact Disposition

#### @user 결정

- @user는 task result 기각·부분 수용 시 artifact disposition 계약을 승인했다.

#### 확정된 disposition 계약

- `candidate`는 disk가 변경되지 않았다는 뜻이 아니라 task가 보고한 evidence, effect, 완료 주장과 변경의 package-level 정당성이 아직 수용되지 않았다는 뜻이다.
- Controlling은 result 수용 판정과 artifact disposition을 같은 의미 동작으로 소유한다.
- 전체 수용은 변경을 유지하고 accepted state로 승격한다.
- 부분 수용은 변경·claim·verification을 독립적으로 분리할 수 있을 때만 허용하며 수용·기각 범위를 명시한다. 수용 부분은 유지하고 나머지는 revert 또는 corrective Work Item으로 처리한다.
- 전체 기각은 변경이 격리돼 안전할 때 accepted baseline으로 revert하고, blind revert가 사용자·다른 task 변경을 훼손하거나 일부 변경을 유지해야 하면 corrective Work Item과 별도 task record로 처리한다.
- Task record는 실제 변경·검증, candidate result, revert/correction 수행 기록과 controlling disposition pointer를 소유한다. Controlling log는 수용·부분 수용·기각 판정과 근거, accepted/rejected artifact effect, corrective W, package-level 상태 변화를 소유한다.

#### Reconcile과 Closeout

- Disposition 완료, 실제 artifact와 accepted package state의 일치, 영향받은 검증 재실행, 기각 결과에 의존한 downstream evidence·task 재검토 전에는 package closeout을 차단한다.
- Result 기각·부분 수용은 artifact disposition, Work Items, affected task dependency, Evidence, Verification Contract/result와 Closeout readiness의 Reconcile trigger다.
- W2는 `[>]`를 유지한다. 다음 질의응답은 delegated/inline reviewer와 scout candidate의 기록 owner다.

### 2026-07-05 15:44 · 추가 결정 3 승인 — Reviewer·Scout Candidate 기록 owner

#### @user 결정

- @user는 reviewer/scout candidate 기록 owner 권고안을 승인했다.

#### 확정된 delegated activity 계약

- 별도 agent에게 위임하고 package가 결과를 소비해야 하는 scouting 또는 independent reviewing은 각각 별도 executable Work Item과 task record를 가진다.
- Task Index는 각 W마다 하나의 task record locator를 소유한다. 실행 W 하나에 여러 role record를 연결하지 않는다.
- Delegated scout record는 검색 범위·coverage, 확인 source, 직접 확인 사실, 미확인 영역·불확실성과 candidate finding을 소유한다.
- Independent reviewer record는 검토 대상 contract/result, source·artifact, 위험 gate, 판정 기준과 candidate review result를 소유한다.
- Controlling은 delegated record 전체를 복사하지 않고 locator, 수용·기각 근거와 package-level 변화를 기록한다.

#### Inline 경계

- 실행 중 inline discovery는 현재 task record의 Task History에 기록한다. Bootstrap 중 controlling discovery는 controlling History와 영향받은 package surface에 기록한다.
- Controlling self-review는 별도 W를 만들지 않고 controlling History에 checklist, 판정과 package-level 변경 결과를 기록한다. 결함이 발견되면 originating Result를 candidate로 유지하고 corrective action을 수행한다.
- Reviewer가 결함을 발견해도 review W가 수정을 자동 소유하지 않는다. Controlling이 result를 소비한 뒤 기존 실행 W를 재개하거나 별도 corrective W를 만든다. Review W는 판정 전달과 소비가 끝나면 완료할 수 있다.

#### Reconcile과 상태

- Delegated activity라는 사실은 executable W의 positive signal이다. Work Items, Task Index, task record와 result consumption을 같은 동작에서 연결한다.
- W2는 `[>]`를 유지한다. 다음 질의응답은 일반 log에서 package로의 upgrade와 package downgrade 시 provisional 산출물 처분이다.

### 2026-07-05 15:50 · 추가 결정 4 승인 — Package 진입과 not-package 반환

#### @user 결정

- @user는 package 진입을 upgrade/downgrade로 모델링하지 않고 기존 Work Item을 package log 작업으로 분리하는 수정안을 승인했다.

#### 확정된 package 진입 계약

- 작업 시작 전에 package activation 조건이 명확하면 package log로 직접 시작한다.
- 일반 log의 기존 Work Item에서 package 조건이 발견되고 source가 결과를 소비해야 하면 해당 W를 별도 controlling package log로 detach한다. Parent `[↓]`와 child Return Target이 소비 관계를 소유한다.
- Source가 결과를 기다리지 않고 package log에 작업 권한을 완전히 넘기면 base transfer 계약을 사용한다.
- 현재 log에 package 8표면을 추가하는 in-place upgrade는 정의하지 않는다. Package log 진입은 새 controlling package log의 직접 생성 또는 base cross-log 관계로 표현한다.

#### Package 조건이 부정된 경우

- Discovery 뒤 공통 scope/closeout gate가 성립하지 않으면 package log를 일반 log로 downgrade하거나 package 표면을 제거하지 않는다.
- Child package log는 활성 task, candidate Result와 실제 artifact disposition을 닫고 `not-package` 결과를 parent에 반환한다. `not-package`는 새 frontmatter status나 Work Item marker가 아니라 Return Target을 통해 소비되는 result outcome이다.
- Parent는 결과를 소비한 뒤 기존 W를 일반 작업으로 재구성·재개하거나 더 할 행동이 없으면 완료한다. Package log는 조사와 판정 History를 보존한다.
- 처음부터 독립 package log로 시작해 Return Target이 없다면 package 조건 부정의 근거와 disposition을 기록하고 base closeout 절차로 종료한다.

#### Reconcile과 대체 관계

- 기존 최종안의 in-place upgrade/downgrade와 package surface 제거 문구는 이 결정으로 대체한다.
- Package Reconcile map은 activation/downgrade row 대신 `activation routing → direct/detach/transfer 관계·Task Index bootstrap`과 `not-package result → task/result/artifact disposition·parent pointer/Work Item`을 사용한다.
- W2는 `[>]`를 유지한다. 남은 portable 보강은 package membership·Task Index 감사, Brief/result attempt, executable W positive test와 추가 Reconcile trigger를 단일 정규 초안에 통합해 검토한다.

### 2026-07-05 15:56 · 추가 결정 5 승인 — Package Closeout Contract

#### @user 결정

- @user는 Registry Integrity, Result Consumption과 package-level 판정을 통합한 Package Closeout Contract를 승인했다.

#### 확정된 W별 gate

- 각 executable W는 먼저 Registry Integrity Check를 통과해야 한다: Work Item↔Task Index↔실제 task record와 task Identity의 controlling log/W-id 역방향 pointer가 일치하고 고아 record·dangling locator가 없어야 한다.
- 이어 Result Consumption Gate를 통과해야 한다: Task Brief revision과 완료 조건, 실제 변경·verification, controlling 수용·부분 수용·기각, artifact disposition·재검증과 accepted package surface Reconcile이 끝나야 한다.
- Task 실행 완료만으로 Work Item을 완료하지 않는다. Registry와 Result Consumption을 통과한 뒤 base Work Items marker를 전이한다.

#### 확정된 package-level gate

- Contract integrity: Scope/write-set·Verification·Closeout revision과 History pointer가 current이며 material contract 변경 뒤 contract review를 재수행한다.
- Artifact integrity: 실제 artifact와 accepted package state가 일치하고 related artifact·inbound/outbound consumer, concurrent candidate 의존, 기각·부분 수용 disposition을 확인한다.
- Evidence/effects: accepted claim source 재검증, current/target 구분, Cross-Artifact Effects 처리와 out-of-scope effect의 W/handoff/authority binding을 확인한다.
- Verification/review: required verification status, waiver authority/scope/residual risk, two-anchor review, reviewer candidate disposition과 unresolved closeout-blocking conflict 부재를 확인한다.
- Return/status: child 반환 digest/result 또는 not-package disposition이 준비되고 모든 package criteria 통과 뒤에만 base Closeout/status 절차를 적용한다. Parent의 실제 result 소비는 parent Work Item이 별도로 소유한다.

#### Owner와 Reconcile

- Closeout Contract는 criteria와 readiness, controlling History는 최종 판정·근거·package 상태 변화, task record는 실행·검증 원본, Task Index는 registry, base Work Items/status는 진행·완료 lifecycle을 소유한다.
- 기존 F6 membership과 F7 3-way audit은 이 전체 계약의 Registry Integrity criterion으로 흡수한다.
- W2는 `[>]`를 유지한다. 다음 질의응답은 executable W positive test, task attempt/revision과 Result / Verification 최소 schema다.

### 2026-07-05 15:59 · 추가 결정 6 승인 — Executable W와 Task Attempt 계약

#### @user 결정

- @user는 구체 예시를 확인한 뒤 executable W, Micro-action, Brief revision, Attempt와 Result / Verification 계약을 승인했다.

#### Executable W와 Micro-action

- Package 행동이 별도 완료·검증·결과 소비 계약을 가지며 artifact 검토·수정·생성, 별도 agent 위임, 독립 재개, controlling이 소비할 candidate evidence/result 생성 중 하나 이상이면 executable W다.
- Controlling 대화에서 직접 끝나는 질의응답·승인·coordination은 별도 task record를 만들지 않고 controlling History에 기록한다.
- 독립 완료·verification·Result 소비·재개가 없는 검색, 파일 열기, 작은 수정, 명령 실행은 현재 executable W의 Task History에 남기는 Micro-action이다.

#### Revision과 Attempt

- Task Brief의 Scope, write-set, 완료 조건, verification 또는 authority가 바뀌면 revision을 증가시키고 변경 이유·승인·영향을 Task History에 append한다.
- Material contract 변경은 영향 범위의 contract review와 active task의 새 revision 적용 판정을 요구한다.
- Attempt는 같은 W identity와 특정 Brief revision 아래의 한 번의 실행·검증 주기다. 검증 실패 후 재시도는 같은 task record에 새 Attempt로 append한다.
- 대상·owner·완료 조건 변화로 Work Item identity가 달라지면 Attempt나 revision으로 덮지 않고 새 W와 task record를 만든다.

#### Result / Verification 최소 schema

- Result는 W-id, Brief revision, Attempt, 실제 수행 범위·변경 artifact, 완료 조건별 결과, verification별 passed/failed/unavailable/not-run, candidate evidence/effect/decision, 미해결 gap·residual risk, downstream dependency 영향과 controlling 소비용 요약을 가진다.
- 과거 Attempt/Result는 고쳐 쓰지 않고 새 entry를 append한다. Controlling 수용·부분 수용·기각 판정은 정확한 Brief revision과 Attempt를 가리킨다.

#### 상태

- W2는 `[>]`를 유지한다. 다음 질의응답은 concurrent task가 sibling의 미수용 candidate modification을 읽는 경우의 isolation과 dependency 계약이다.

### 2026-07-05 16:01 · 추가 결정 7 승인 — Concurrent Candidate Isolation

#### @user 결정

- @user는 concurrent candidate isolation 계약을 승인했다.

#### 확정된 baseline·dependency 계약

- Working-tree observation과 controlling이 수용한 accepted package baseline을 구분한다. Disk에서 관찰됐다는 이유만으로 active sibling의 candidate modification을 accepted baseline으로 취급하지 않는다.
- Concurrent task가 다른 active task write-set의 artifact를 claim 또는 변경 정당성의 근거로 읽으면 sequential dependency, isolated baseline 또는 명시적 candidate dependency 중 하나를 사용한다.
- Candidate dependency Result는 upstream 수용·부분 수용·기각과 disposition 뒤 영향 범위를 재검증하기 전 accepted state로 승격하지 않는다.
- 같은 artifact의 concurrent write는 기본 금지하고 단일 artifact owner, 순차 dependency 또는 격리 환경에서 작업 후 controlling 병합·재검증으로 통제한다.
- 모든 read-set을 열거하지 않고 claim·변경 정당성에 사용한 artifact와 active sibling write-set이 겹치는 경우만 기록한다.

#### 기록과 review 경계

- Task Brief는 선행 W/Attempt, candidate read dependency, expected baseline과 격리·순차 방식을 기록한다. Result는 실제 의존 candidate, 영향 claim과 재검증 필요를 기록한다.
- Independent reviewer는 Brief가 검토 대상 W·Brief revision·Attempt를 명시한 경우 candidate 변경을 의도적으로 읽을 수 있으며 accepted baseline이 아니라 검토 대상 candidate로 판정한다.
- Controlling은 upstream disposition, downstream invalidation·재검증, Work Items와 Closeout readiness를 Reconcile한다.

#### 상태

- Concurrent conflict 발견과 upstream disposition은 Brief dependency, affected Result/Evidence, Verification과 Closeout의 Reconcile trigger다.
- W2는 `[>]`를 유지한다. 다음 질의응답은 coordinated team mode의 내부 기록과 단일 Result 반환 계약이다.

### 2026-07-05 16:06 · 추가 결정 8 — Coordinated team portable 제거

#### @user 결정

- @user는 `coordinated team`을 portable package-log 모델에서 제거하고 project integration 선택사항으로 두는 경계를 승인했다.

#### 확정된 portable 경계

- Portable Agent Topology는 controlling, scouting, executing과 optional reviewing 역할을 정의한다.
- Portable execution mode는 inline과 delegated만 정의한다.
- Controlling의 단일 accepted-state owner, delegated executable W의 Task Brief·task record·Result 경로, dependency·artifact owner·candidate isolation은 agent 수나 harness 기능과 무관한 portable invariant로 유지한다.
- `coordinated team`, team coordinator, worker 간 협의 protocol, integration worker 같은 vendor-specific orchestration 구조는 portable reference와 skill에 포함하지 않는다.
- Project가 vendor team 기능을 실제 사용하면 project integration이 필요할 때 portable invariant에 매핑한다. 사용하지 않는 project에는 별도 team 규칙이나 구현을 요구하지 않는다.

#### 대체 관계와 상태

- 기존 W2 최종 초안의 `inline / delegated worker / coordinated team`은 `inline / delegated`로 대체한다.
- Claude F11의 coordinated-team 내부 기록 gap은 portable mode 제거로 소멸하며 별도 Integration W 계약을 추가하지 않는다.
- W2는 `[>]`를 유지한다. Claude finding 전체를 승인된 추가 결정과 대조해 남은 Reconcile·정규 초안 보강 범위를 검사한다.

### 2026-07-05 16:07 · Claude review 반영 W2 단일 정규 초안 후보

#### Claude finding 최종 disposition

| Finding | 최종 판정 | 현재 처리 |
| --- | --- | --- |
| F1 task record identity | 수용 | non-log 제3 문서 + 조건부 Full child log로 확정 |
| F2 reject/partial disposition | 수용 | revert/corrective W/partial acceptance와 closeout blocker 확정 |
| F3 reviewer/scout record home | 수정 수용 | delegated는 별도 W/record, inline은 current task/controlling 기록 |
| F4 Reconcile trigger 누락 | 수용 | 아래 canonical map에 추가 |
| F5 upgrade/downgrade | 수정 수용 | upgrade/downgrade 폐기, direct/detach/transfer/not-package 반환 |
| F6 membership exclusivity | 수용 | task record 단일 package membership |
| F7 closeout registry audit | 수용 | 전체 Package Closeout의 Registry Integrity에 흡수 |
| F8 Brief revision/attempt | 수용 | revision·History pointer·Attempt append 확정 |
| F9 canonical text 부재 | 수용 | 이 entry를 W2 단일 정규 초안 후보로 작성 |
| F10 executable positive test | 수정 수용 | 별도 완료·검증·소비 계약 중심의 positive test 확정 |
| F11 coordinated team gap | 대안 채택 | portable mode에서 coordinated team 제거 |
| F12 path#anchor | 부분 수용 | canonical locator는 별도 파일 path, 내부 revision/history pointer만 anchor 허용 |
| F13 candidate read contamination | 수용 | sequential/isolated/declared candidate dependency 확정 |
| F14 material change re-review | 수용 | Brief/contract material revision 뒤 contract review 재수행 |
| F15 nested discovery 사실 정정 | W3 이관 | layout별 실제 tool discovery 차이를 적용안에서 검증 |

#### W2 단일 정규 초안 후보 — 9개 섹션

1. **Identity**
- Package workflow는 하나의 primary artifact/change boundary와 related artifact의 correct/done을 공통 evidence·scope·handoff·closeout gate로 다루는 조건부 절차다.
- Controlling package log는 accepted package state의 단일 owner이며 base log lifecycle을 복제하지 않고 package 전용 coordination surface를 더한다.
- Logical bundle은 controlling log와 Task Index에 등록된 executable W별 task record로 구성된다. 각 task record는 정확히 한 controlling package/W-id에 소속된다.

2. **Activation and Entry Routing**
- Activation은 파일 수·로그 길이·병렬성 대신 공통 correct/done gate 필요성으로 판정한다.
- 처음부터 조건이 명확하면 package log로 직접 시작한다. 기존 일반 log W에서 발견되고 source가 결과를 소비하면 detach, 기다리지 않고 권한을 넘기면 transfer한다.
- In-place upgrade/downgrade는 정의하지 않는다. Discovery 뒤 조건이 부정되면 task·Result·artifact disposition을 닫고 `not-package` result outcome을 parent에 반환한다. 이는 status/marker가 아니다.

3. **Bootstrap and Integration Probe**
- Project instruction, owner와 inbound/outbound·producer/consumer, manifest/CI/tool/environment를 조사하고 초기 Scope/write-set, Workflow / Agent Plan, Task Index, Evidence, Verification Contract와 Closeout Contract를 seed한다.
- Discovery worker 위임은 optional이며 delegated scout는 별도 executable W/record를 가진다. Controlling은 source를 재확인해 contract를 작성한다.
- Portable은 의미·locator·검증 상태를, project integration은 실제 directory/file naming, discovery command, vendor mechanism과 concrete verification command를 소유한다.

4. **Artifact and Evidence Tests**
- Boundary, Related Artifact, Scope Authority, Evidence/Provenance, Effect/Action Binding test를 적용한다.
- Current-state claim은 최종 source에서 재검증하고 target-state claim과 구분한다. Owner 영향 변경은 evidence 확인 뒤 수행한다.
- Evidence surface는 current accepted evidence를 소유한다. accepted evidence가 반증되면 과거 History를 고치지 않고 정정 entry와 dependent Scope/effects/Work Items/verification/closeout Reconcile을 남긴다.

5. **State Ownership and Task Contract**
- Base Work Items/next pointer만 package 진행·완료 상태를 소유한다. Task Index는 W-id, compact/full profile, inline/delegated mode와 canonical task-record file path mapping만 소유한다.
- 모든 executable W는 별도 task record file을 가진다. Positive signal은 별도 완료·검증·결과 소비 계약과 artifact 작업, 위임, 독립 재개 또는 candidate result 생성이다. Micro-action은 현재 W Task History에 둔다.
- 일반 task record는 base log가 아닌 Identity, Task Brief, append-only Task History, Result / Verification의 제3 문서다. Brief는 revision과 History pointer, Result는 W-id/revision/Attempt/변경/완료 조건/검증 상태/candidate/residual risk/downstream/요약을 가진다.
- 자체 Work Items/next pointer·세션 간 독립 재개·Return Target이 필요한 Full task만 base child log 계약을 함께 적용한다. 같은 W의 재시도는 새 Attempt, Work Item identity 변경은 새 W/record다.
- Task record는 execution trace와 candidate result, controlling은 result disposition과 accepted package-level state만 소유한다.

6. **Agent Topology and Execution Modes**
- Portable 역할은 controlling, scouting, executing과 optional reviewing이며 execution mode는 inline/delegated다.
- Review activity는 synthesis 뒤 contract review와 result acceptance 전 result review 두 anchor에서 항상 수행한다. 낮은 위험은 controlling self-review, 정의된 위험 gate는 independent reviewer를 사용한다.
- Delegated scout/reviewer는 별도 W/record, inline discovery는 current task 또는 controlling History, self-review는 controlling History에 기록한다.
- Reviewer result는 candidate이고 controlling이 근거를 갖고 수용·기각한다. Unresolved closeout-blocking conflict만 responsible authority, 없으면 사용자에게 escalation한다.
- Vendor-specific coordinated team orchestration은 portable 모델에 포함하지 않으며 project가 사용할 때 integration이 portable invariant에 매핑한다.

7. **Fixed Package Skeleton**
- Base Work Items, Required Context, History와 status/Closeout procedure를 상속하고 복제하지 않는다.
- Package Scope, Workflow / Agent Plan, Task Index, Evidence, Cross-Artifact Effects, Decision Candidates, Verification Contract, Closeout Contract의 8표면을 고정한다.
- 비적용 surface는 N/A/Reason/Activate when을 기록한다. Evidence Ledger는 Evidence format이며 별도 Amendments section은 만들지 않는다.
- Scope/Verification/Closeout 같은 mutable contract는 current revision과 관련 History pointer를 가진다.

8. **Package Reconcile**
- Candidate evidence/result/reviewer 판정 수용·기각·부분 수용 → accepted Evidence/effects/decision, artifact disposition, Scope, Work Items, verification, closeout readiness.
- Related artifact·Scope/write-set 변경 → authority, out-of-scope effect, affected Brief revision, waiver scope, verification와 closeout criteria.
- Material Brief/contract revision → affected active/resumed task, contract review와 Result 판정 기준.
- Result 소비 → Work Items/next pointer, accepted package surface, downstream dependency와 closeout readiness.
- Concurrent conflict/candidate dependency disposition → artifact owner·순차화/격리, downstream invalidation·재검증, Evidence/Verification/Closeout.
- Work Item 완료·취소·이관 또는 locator 변경 → Task Index, task record disposition, inbound pointer와 History.
- Package direct/detach/transfer routing → Return Target/parent pointer와 Task Index bootstrap. Not-package 반환 → task/result/artifact disposition과 parent Work Item.
- Package rename/split/merge/supersede는 base cross-log/lifetime mechanics를 재정의하지 않고 package membership, locator, task disposition과 inbound pointer를 함께 Reconcile한다.
- Verification tool/environment/waiver, handoff, Closeout criteria/readiness 변경은 Work Items, residual risk, status dependency를 같은 동작에서 갱신한다.

9. **Package Closeout**
- 각 executable W의 Registry Integrity를 검사한다: Work Item↔Task Index↔실제 record와 record Identity의 controlling/W-id pointer가 일치하고 dangling locator·고아 record가 없다.
- 각 W의 Result Consumption을 검사한다: exact Brief revision/Attempt 결과, controlling disposition, artifact correction·재검증과 accepted surface Reconcile 뒤에만 W를 완료한다.
- Package-level로 current contract/review, 실제 artifact와 accepted state, related owner/consumer, accepted evidence/effects, out-of-scope handoff, required verification status·waiver/residual risk와 unresolved conflict 부재를 판정한다.
- 미소비 Result, 미완료 disposition, candidate dependency 미재검증, dangling/orphan record, unresolved effect/review conflict는 closeout blocker다.
- Child/not-package 반환 digest가 준비되고 criteria가 모두 충족된 뒤에만 base Closeout/status procedure를 적용한다. Parent result 소비는 parent Work Item이 별도 소유한다.

#### Portable과 project integration 경계

- Portable이 고정: task record 1-file-per-executable-W, canonical stable file locator, 단일 package membership, record schema와 lifecycle semantics.
- W3가 제시: flat/hybrid/full-nested 비교, 실제 directory·filename, orphan enumeration, search/check/onramp discovery, `.log-hints`, child log placement와 concrete verification command.
- Claude의 repo 후보는 controlling log flat + non-log task record nested인 hybrid다. 이는 W3 적용안 후보일 뿐 현재 W2 portable 결정이 아니다.

#### 정합성 검사와 상태

- Base Work state와 Task Index에 중복 status owner가 없고, non-log task record는 onramp/search current-work 후보가 아니다.
- Task result의 candidate/accepted 경계, artifact가 선행 변경되는 경우의 disposition, concurrent candidate read와 downstream 재검증 경로가 닫힌다.
- Review, task lifecycle, Reconcile과 Closeout의 owner가 서로 중복되지 않는다. Coordinated-team 전용 규칙은 제거됐다.
- Claude가 제시한 Blocker/High와 portable Medium finding은 현재 초안에서 모두 처리됐다. F15 physical discovery 적용은 W3 owner다.
- W2는 완료 후보지만 사용자 승인 전 `[>]`를 유지하고 W3를 활성화하지 않는다.

### 2026-07-05 16:12 · W2 최종 승인·완료 판정과 W3 handoff

#### @user 최종 승인

- @user는 Claude 독립 review, Codex 판정, 추가 결정 1~8과 9개 섹션을 통합한 `Claude review 반영 W2 단일 정규 초안 후보`를 승인했다.
- @user는 W2 완료와 W3 이동을 명시적으로 지시했다.

#### W2 완료 판정

- Fixed skeleton, two-anchor review, task record/Compact-Full, candidate→accepted promotion의 최초 4개 결정과 독립 review 후 추가 계약이 모두 사용자 승인됐다.
- Task record identity, artifact disposition, reviewer/scout record home, package entry routing, Package Closeout, executable/attempt schema, concurrent candidate isolation과 coordinated-team portable 제외가 정규 초안에 Reconcile됐다.
- Claude F1~F15의 disposition과 portable/project integration 경계가 기록됐으며 W2에 남은 설계 질문은 없다. Physical layout과 concrete tool/repo mapping은 W3 owner다.
- 따라서 W2를 completed로 전이하고 W3를 active pointer로 올린다.

#### W3 handoff

- W3는 구현이 아니라 W2 승인 모델의 적용 설계와 사용자 승인 단계다.
- 입력 authority는 이 block의 `Claude review 반영 W2 단일 정규 초안 후보`와 이후 @user 승인 entry다. 과거 제안 entry의 폐기된 upgrade/downgrade, inline Compact Brief, coordinated team mode를 복원하지 않는다.
- W3는 decision-to-owner mapping, `references/package-log.md` 구조, task record template owner, flat/hybrid/full-nested layout, Task Index/orphan audit, search/check/onramp 영향, repo integration 잔류 범위, 변경하지 않을 파일과 W4 검증 계획을 제시한다.
- W3에서는 owner/reference/base skill/onramp/tool을 수정하지 않는다. 실제 반영은 W3 적용안의 사용자 승인 뒤 W4만 수행한다.
- 다음 행동은 관련 owner·consumer·tool·기존 task brief 선례를 read-only로 추적해 W3 적용안 초안을 제시하는 것이다.

### 2026-07-05 18:39 · W2 후속 정정 — required-read 최소 binding과 Compact profile

#### 사용자 승인과 portable 계약 정정

- @user는 required-read binding 리뷰의 F1·F2 반영과 Compact/profile 선존 긴장 F3 정합화를 승인했다.
- Delegated 또는 독립 재개 task의 required reads는 controlling log를 명시하고 그 log의 현재 Package Scope, 해당 Work Item, 관련 최신 History·next pointer/handoff와 accepted Evidence/contract entry를 가리킨다. Controlling 상태를 task record에 복사하지 않고 owner/path·대상 entry·읽은 뒤 action을 가장 작은 유효 scope로 binding한다.
- Compact/Full profile은 실행 mode가 아니라 local lifecycle 깊이로 선택한다. Compact는 local lifecycle을 만들지 않고 warm-context inline을 기본으로 하되, delegated task도 독립 lifecycle이 필요 없으면 Compact를 사용한다. Full은 자체 Work Items·next pointer·세션 간 독립 재개·Return Target이 필요할 때만 사용한다.
- Cross-Artifact Effects는 모든 task의 공통 required-read로 승격하지 않는다. 특정 task의 scope·dependency·result-consumer 계약상 필요할 때 해당 Brief가 지목한다.

#### 상태

- 이 entry는 W2 정규 계약의 모호성을 후속 정정한 것이며 W2의 completed 상태를 다시 열지 않는다. W3 owner/layout 영향은 별도 W3 후속 entry, 실제 owner 반영과 fixture 영향은 W4 entry가 소유한다.

## 2026-07-05 · W3 적용 설계와 사용자 승인

### 2026-07-05 16:43 · 결정 1 승인 — 현재 로그의 단일 수명 유지

- @user는 W3/W4를 현재 로그에서 계속 수행하고, History 이동·복제와 child log 생성을 하지 않는 안을 승인했다.
- 현재 로그는 처음부터 package-log 모델 토론, 적용 설계 승인, 승인된 owner 반영·검증을 같은 완료 범위로 소유하며 W3와 W4가 기존 Work Items에 잡혀 있다. W3/W4는 별도 목적·완료 조건·독립 재개·복귀 소비 조건을 요구하지 않으므로 `Log Lifetime Boundary`상 현재 수명에 남긴다.
- 1,000행 hard threshold는 자동 분리 기준이 아니다. 이 로그는 단일 수명 유지 이유를 이 entry에 남기고 계속 사용한다. 이후 기록은 W2 내용을 복제하지 않고 `Claude review 반영 W2 단일 정규 초안 후보`와 승인 entry pointer, 결정별 target owner mapping을 사용해 증가량을 제한한다.
- 과거 independent follow-up 생성 경위와 현재 base 구조 규칙을 정합화하기 위해 `Required Context` 첫 section에 `Return Target: None`을 추가했다. 기존 History와 Work Items는 변경하지 않았다.
- 다음 사용자 결정은 physical folder/layout이며 flat, hybrid, full nested의 discovery·tool·read-path 영향을 비교해 하나만 승인받는다.

### 2026-07-05 16:43 · 결정 2 후보 — Physical folder/layout

#### 확인한 사실

- `scripts/log search`와 파일 인자 없는 `check --status`는 `$LOG_DIR/*.md`만 순회한다. 현재 `$LOG_DIR` 기본값은 `logs`이므로 nested log는 전역 discovery 대상이 아니다. 명시 파일을 받는 `check <path>`는 nested path도 검사할 수 있다.
- `scripts/onramp`의 plan anchor와 `[↓]` chain은 명시 path를 따라가지만, plan이 없을 때의 open 후보와 leaf graph는 `log search --status open` 결과에서 시작한다. 따라서 nested controlling/Full child log는 fallback discovery에서 누락된다.
- 기존 `logs/W*-task.md` 선례는 top-level의 non-log Task Brief이며 base frontmatter/status가 없다. `.gitignore`는 `logs/.log-hints/`만 제외한다.

#### 비교와 권고

| 후보 | Read path·discovery | Tool 영향 | 비용·위험 | 판정 |
| --- | --- | --- | --- | --- |
| Flat | controlling, 일반 task record, Full child가 모두 `logs/` top-level. non-log record는 status가 없어 search 후보에서는 제외 | 현 도구 변경 불필요 | top-level 혼잡, package별 orphan 열거와 namespace 구분이 약함 | 가능하지만 비권고 |
| Hybrid | controlling과 Full child task-record log는 top-level, 일반 non-log record만 package 하위 directory. controlling→Task Index→선택 record 순으로 읽음 | current-work/search/check/onramp 변경 불필요. task record 감사만 별도 수동 경로 필요 | 두 물리 위치를 Task Index가 연결해야 함 | 권고 |
| Full nested | controlling과 모든 task record를 package directory에 배치 | recursive search/check/onramp, `log new`, `.log-hints` 정책 변경 필요 | base log discovery 계약과 repo plan/onramp 경로가 실제 tool 변경 전 불완전 | 기각 |

#### 권고 layout 후보

```text
logs/
  YYYY-MM-DD-<package-topic>.md
  YYYY-MM-DD-<package-key>-W<id>-<full-task-topic>.md
  packages/
    <stable-package-key>/
      tasks/
        W<id>.md
```

- 첫 파일은 controlling package log다. 두 번째 형태는 독립 재개가 필요한 Full task의 base child log이자 해당 W의 task record이며 별도 non-log duplicate를 만들지 않는다.
- 일반 non-log task record는 `logs/packages/<stable-package-key>/tasks/W<id>.md`에 둔다. `<stable-package-key>`는 repo-local directory key이며 기본 생성값만 controlling filename stem에서 얻고 이후 canonical record path 안정을 위해 rename하지 않는다.
- Task Index는 모든 record의 exact path를 소유한다. package directory 실제 파일 집합과 Task Index locator 집합을 대조해 orphan/dangling을 찾고, Full child는 명시 path `log check`와 Return Target/Identity를 함께 검사한다.
- 기존 top-level `logs/W*-task.md`는 소급 이동하지 않는다. layout은 이 repo integration이며 portable physical invariant로 승격하지 않는다.

### 2026-07-05 16:49 · 결정 2 승인 — Hybrid physical layout

- @user는 설명을 확인한 뒤 Hybrid layout을 승인했다.
- Controlling package log와 독립 lifecycle이 필요한 Full child task-record log는 `logs/` top-level에 둔다. 일반 non-log task record는 `logs/packages/<stable-package-key>/tasks/W<id>.md`에 둔다.
- Full child log 자체가 해당 package W의 task record이며 별도 non-log duplicate를 만들지 않는다. `<stable-package-key>`는 생성 뒤 유지하고 Task Index가 모든 record의 exact canonical path를 소유한다.
- 기존 `logs/W*-task.md`는 소급 migration하지 않으며 physical layout은 repo integration으로만 둔다.

### 2026-07-05 16:49 · 결정 3 후보 — Owner 파일과 task-record template 배치

#### Owner mapping 후보

| 계약 | Primary owner | 역할 |
| --- | --- | --- |
| Package identity/activation, 8 surfaces, task/result/review/Reconcile/closeout 의미 계약 | 새 `.agents/skills/log/references/package-log.md` | portable package specialization의 단일 정본 |
| Package reference 진입 조건 | `.agents/skills/log/SKILL.md` | package 조건에서만 새 reference로 보내는 on-demand router; 세부 규칙 복제 금지 |
| Hybrid 경로, stable package key, 실제 read path, Task Index/orphan 감사와 repo closeout 추가 규칙 | `logs/AGENTS.md` | 이 repo의 구속적인 package integration |
| 사람이 따를 package 진입·실행·결과 소비 절차 | `docs/guides/workflow.md` | owner를 참조하는 비권위 how-to; portable 계약 복제 금지 |
| Base Work Items/Required Context/History/Return Target/status/lifetime | 기존 `loop-rules.md` | package reference가 상속·링크하며 변경하지 않음 |

#### Task-record template 후보

- Portable schema와 canonical skeleton은 `package-log.md`의 `Task Record Contract` 안에 함께 둔다. 별도 asset/reference는 만들지 않는다. schema와 package task lifecycle은 같은 owner·scope·변경 coupling을 가지므로 분리하면 일반 read path와 drift surface만 늘어난다.
- Template은 composition blocks로 둔다: 공통 `Identity`, versioned `Task Brief`, append-only `Task History`, `Result / Verification`; Compact는 이 공통 non-log file을 사용하고, Full은 같은 공통 blocks에 base child log의 frontmatter·Work Items·Required Context/Return Target을 결합한다.
- Compact도 반드시 별도 file이며 폐기된 inline Compact Brief를 복원하지 않는다. Full은 중복 non-log record를 만들지 않는다.
- `logs/AGENTS.md`는 portable template을 복사하지 않고 repo path·package-key·Task Index locator와 수동 감사 절차만 overlay한다. 기존 workspace-reset `Task Brief Template`은 repo 전용 선례로 그대로 두고 새 task-record template로 소급 변환하지 않는다.

#### 변경하지 않을 owner 후보

- `loop-rules.md`, `design-principles.md`, `project-setup.md`, `example.md`, `plans/AGENTS.md`, root `AGENTS.md`, `.gitignore`는 이 결정의 owner가 아니므로 변경하지 않는다. 실제 W4 전체 파일 범위는 결정 5에서 다시 닫는다.

### 2026-07-05 16:54 · 결정 3 설명 요청과 prospective-only 경계

- @user는 `logs/AGENTS.md`가 Hybrid 경로·package key·감사 절차를 소유하는 이유와 repo integration 동작 예시, Compact/Full task-record template 전체를 요청했다.
- `logs/AGENTS.md` 후보 책임은 portable schema가 아니라 이 repo의 `logs/` 물리 배치와 agent 행동 규칙이다. `package-log.md`의 의미 계약을 복제하지 않고 package key 선언 위치, Task Index exact locator, 실제 record 집합과의 orphan/dangling 대조, Full child pointer 점검만 구속적으로 정의한다.
- @user는 기존 workspace-reset 자료를 소급 변환하지 않을 것을 명시했다. 기존 controlling logs, top-level `logs/W*-task.md`, 기존 Workspace Reset `Task Brief Template`에 새 Identity/History/Result schema나 package directory/Task Index를 backfill하지 않는다. 새 계약은 W4 반영 뒤 새로 시작하거나 명시적으로 opt-in한 package에만 적용하는 prospective-only 후보로 둔다.
- Compact 후보는 별도 non-log file에 Identity, versioned Task Brief, append-only Task History와 attempt별 Result / Verification을 둔다. Full 후보는 base child log의 frontmatter·local Work Items·Required Context/Return Target을 사용하고 같은 package Identity/Brief/result 필드를 base History의 attempt entry에 결합해 중복 record를 만들지 않는다.

### 2026-07-05 16:54 · prospective-only 표현 정정

- 직전 entry의 “명시적으로 opt-in한 package”는 기존 package의 in-place 전환을 허용하는 뜻으로 읽힐 수 있어 정정한다. 새 계약은 W4 반영 뒤 **새로 생성하는 package**에만 기본 적용한다.
- 기존 workspace-reset/legacy package를 in-place upgrade하지 않는다. 기존 작업에서 새 package 조건이 발견되면 승인된 direct/detach/transfer routing으로 별도 새 package 수명을 만들고 기존 history와 task brief를 그대로 보존한다.

### 2026-07-05 17:01 · Full child task-record log 관계 설명

- Full child task-record log는 별도 `Full Task Brief` 파일에서 떨어져 나오는 로그가 아니다. Source는 controlling package log의 package W이며, source가 결과를 소비해야 하고 그 task에 child-local Work Items·next pointer·세션 간 독립 재개가 필요할 때 `[↓]` detach와 Return Target으로 연결한다.
- Full child 한 파일이 base child log와 해당 package W의 task record 두 역할을 함께 수행한다. 현재 Task Brief는 그 파일의 `Task Brief` section, 실행 trace와 Attempt/Result는 base History entry에 둔다. 별도 Brief 파일이나 nested Compact record를 중복 생성하지 않는다.
- 따라서 관계는 `controlling package W → [↓] Full child task-record log → candidate Result → controlling 소비·Reconcile`이다. Full 여부는 위임 자체가 아니라 독립 lifecycle 필요성으로 결정한다.

### 2026-07-05 17:03 · Task Brief file과 task-record file 용어 경계

- W2 정규 계약은 모든 executable W가 **Compact 또는 Full 중 한 profile**과 **task-record file 하나**를 갖는다는 뜻이다. Compact와 Full Brief 파일을 둘 다 만들거나, task-record와 별도 Brief 파일을 중복 생성한다는 뜻이 아니다.
- `Task Brief`는 독립 파일 type이 아니라 각 task record 안의 현재 실행 계약 section이다. Compact는 nested non-log task-record file 안에 Brief/History/Result를 두고, Full은 top-level base child task-record log 안에 Brief와 child lifecycle/History/Result를 함께 둔다.
- 따라서 파일 관계는 `executable W → Compact record 1개 XOR Full child record 1개`다. 기존 workspace-reset의 top-level `W*-task.md` Task Brief-only 선례는 새 모델 이전 repo 자료이며 소급 변환하지 않는다.

### 2026-07-05 17:05 · 결정 3 승인 — Owner와 task-record template 배치

- @user는 설명과 Compact/Full template 전체, repo integration 예시, 기존 workspace-reset 소급 변환 금지와 `executable W → Compact record 1개 XOR Full child record 1개` 경계를 확인한 뒤 결정 3 승인을 지시했다.
- 새 `.agents/skills/log/references/package-log.md`를 portable package 의미 계약과 Compact/Full task-record composition template의 단일 owner로 둔다. `.agents/skills/log/SKILL.md`는 package 조건에서만 이 reference를 읽게 하는 on-demand router만 소유한다.
- `logs/AGENTS.md`는 새 package에 대한 Hybrid physical path, stable package key, Task Index exact locator와 registry audit의 repo 구속 규칙만 소유한다. `docs/guides/workflow.md`는 그 owner들을 참조하는 실제 진입·실행·결과 소비 how-to만 소유한다.
- 별도 task-record reference/asset은 만들지 않는다. 기존 workspace-reset logs, top-level `logs/W*-task.md`, Workspace Reset `Task Brief Template`은 이동·backfill·재분류·in-place upgrade하지 않는다.

### 2026-07-05 17:05 · 결정 4 후보 — Tool/onramp 변경 범위

#### 확인한 사실과 영향 판정

- Hybrid에서 current-work 대상인 controlling package log와 Full child task-record log는 모두 `logs/` top-level base log다. 현재 `log search/check --status`와 `scripts/onramp`의 open discovery 및 `[↓]` chain이 이들을 이미 처리한다.
- Compact task record는 nested non-log 문서이며 current-work/status owner가 아니다. 기존 search/onramp에서 보이지 않는 것이 의도한 동작이고 `log check` 대상도 아니다.
- 기존 `log detach`는 source W를 `[↓]`로 바꾸고 지정한 top-level target에 Return Target을 가진 child base log를 만들 수 있다. Full record의 package Identity/Brief/result blocks는 승인된 template에 따라 작성하면 된다.
- Compact record 생성과 Task Index↔actual files 감사의 반복 비용·오류율은 새 모델을 실제 사용한 사례가 아직 없어 확인되지 않았다. 현 단계에서 새 command를 추가하면 편의 추정만으로 tool surface를 늘리게 된다.

#### 권고

- W4에서는 `.agents/skills/log/scripts/log`와 `scripts/onramp`를 변경하지 않는다. `.log-hints`도 controlling/Full base log에만 기존대로 적용하고 Compact record에는 적용하지 않는다.
- Registry Integrity는 먼저 문서화된 수동 절차로 수행한다: Task Index locator 존재 확인, `find logs/packages/<key>/tasks -type f -name '*.md'` actual set 대조, 각 record Identity의 controlling/W-id 확인, Full child의 explicit `log check`와 Return Target 확인.
- `task new`, `package check`, recursive search/onramp는 구현하지 않는다. 실제 package 사용에서 반복 생성 비용이나 manual set comparison의 누락이 재현되면 별도 maintenance 후보로 기록·승인한다.

### 2026-07-05 17:08 · 결정 4 후보 수정 — Manual contract 선확정 후 package-log tool 후속

- @user는 package-log 전용 script tool을 만들 의향이 있으나, 먼저 문서에 수동 작성·검토 절차를 반영하고 그 계약의 검토를 완료한 뒤 tool을 만들 계획이라고 명시했다.
- 따라서 직전 후보의 “반복 비용이나 실패가 확인될 때만 tool 검토” gate는 대체한다. W4는 여전히 문서·수동 contract만 반영하고 기존 `scripts/log`, `scripts/onramp`는 수정하지 않는다. 수동 contract가 owner review와 verification을 통과한 뒤 tool 개발을 별도 후속 작업 수명으로 연다.
- 후속 tool은 확정된 package/task-record schema, Hybrid layout, Task Index와 Registry Integrity 절차를 입력으로 삼는다. 후보 위치/이름은 `scripts/package-log`이지만 command·subcommand·자동화 경계·테스트는 후속 설계가 소유하며 W4 문서에 미구현 표면을 선반영하지 않는다.
- `scripts/onramp` 변경은 후속 package-log tool과 자동 결합하지 않는다. Hybrid에서 current-work discovery는 이미 닫혀 있으므로 별도 확인된 요구가 생길 때만 독립 영향으로 검토한다.
- W4 closeout에는 수동 contract 검증 결과와 후속 tool 작업이 읽을 owner·검증 입력을 handoff로 남긴다. 현재 W3/W4 history를 이동하거나 tool 구현을 이 로그에 섞지 않는다.

### 2026-07-05 17:11 · 결정 4·5 승인 판정과 W3 완료

- @user는 W4가 승인된 package-log 내용을 skill/reference와 repo integration owner에 실제 추가·검증하는 단계임을 확인한 뒤, W4를 재개하고 다음 세션이 작업할 수 있도록 필요한 context와 prompt를 주입하라고 지시했다.
- 이 지시는 manual contract 선반영, W4에서 tool/onramp 미수정, owner 파일 범위와 verification contract를 승인하고 W4 실행으로 이동하라는 최종 승인으로 판정한다.
- W3의 다섯 결정은 완료됐다: 현재 로그 단일 수명 유지, Hybrid layout, package reference와 embedded task-record template owner, manual-first/tool-follow-up 경계, 아래 W4 변경·검증 범위. 따라서 W3를 completed로 전이하고 W4를 active pointer로 올렸다.

### 2026-07-05 17:32 · package-log.md 구성 경계 세부화와 주변 reference 3개 처분

- @user 토론으로 W3 결정 3(owner 파일 배치)의 경계를 세부화하고 주변 reference 3개 처분을 확인했다. owner 파일·Work Item은 변경하지 않고 이 entry로 기록만 남긴다. 판정 기준은 문장마다 "어느 프로젝트에서나 성립하는 계약(portable)인가 vs 이 repo 전용인가"를 나누는 것이다.

**package-log.md에 들어가는 것 (portable 계약):**

- Compact/Full task-record 예시·template: `State Ownership and Task Contract` 아래에 둔다.
- 초기 세팅의 portable 부분: `Bootstrap and Integration Probe` 섹션 — project instructions·manifest/dependency·CI·검증 도구·환경 probe, 초기 Scope/Verification/Closeout seed, 도구 부재 시 실행 전 사용자 제안·승인이라는 절차 계약.
- package 특화 workflow의 모델/계약: 9개 섹션 본체 — activation preflight→bootstrap→discovery→controlling synthesis→review→execution→result promotion/Reconcile→closeout의 phase 순서, 역할(controlling/scouting/executing/reviewing)·실행 mode(inline/delegated/coordinated-team), Reconcile 의존 표면 map, closeout gate.

**package-log.md에 안 들어가는 것 (다른 owner):**

- repo 전용 초기 세팅: `logs/packages/<stable-package-key>/tasks/W<id>.md` 실제 경로, stable package key 생성·유지, Task Index exact locator, `find logs/packages/<key>/tasks` 감사 명령 → `logs/AGENTS.md`.
- base 로그 loop(Enter/Act/Record/Reconcile/Cross-Log/Closeout) → `loop-rules.md` 상속·링크만, 복제 금지.
- 사람용 진입·실행·결과 소비 step-by-step how-to → `docs/guides/workflow.md`, 복제 금지.

**주변 reference 3개 처분:**

- (추론) `maintenance.md`: owner 맵 열거(:149-152, :221-223)가 loop-rules/design-principles/example/project-setup만 담고 새 owner인 package-log.md를 빠뜨려, W4가 package-log.md를 만들면 stale·불완전해진다(package 관련 유지보수를 오라우팅할 위험). → package-log.md 생성 후 owner 맵에 package-log.md 한 줄을 추가하는 scoped fix 후보. (확인한 사실) W3가 이 파일을 W4 "금지 파일 비변경"(:35·:1087·:1181)으로 지정했으므로, W4에 포함하려면 그 결정을 명시적으로 amend해야 한다. package-log.md 존재 전 선반영은 금지.
- (의견) `example.md`: 무변경. package 예시를 이 general-flow reference에 넣으면 package-log.md를 on-demand로 둔 설계를 무효화한다. package worked example은 package-log.md 안에 둔다.
- (추론) `project-setup.md`: 무변경. Hybrid layout·Registry Integrity는 `logs/AGENTS.md` 소유이고, `current-work integration 최소 계약`(:79-99)은 top-level open log 기반인데 Hybrid가 controlling/Full을 top-level에 남기고 Compact를 discovery 비가시로 두므로 계약이 깨지지 않는다. 정확성 목적 갱신 불필요.

- follow-up(기록만): maintenance.md owner 맵 갱신을 Work Item으로 등록할지는 @user 결정 사항으로 남긴다.

### 2026-07-05 18:39 · W3 후속 영향 판정 — Compact delegated 정합

#### 확인한 사실과 판정

- W2/W4 후속 리뷰에서 Compact를 warm-context inline으로만 읽게 하는 문장과 `Compact/Full profile은 delegation과 별개 축`이라는 승인 계약의 긴장이 확인됐다.
- profile은 독립 lifecycle 필요성, execution mode는 inline/delegated 여부를 소유한다. 따라서 delegated task라도 자체 Work Items·next pointer·Return Target과 세션 간 독립 재개가 필요 없으면 Compact가 가능하다.
- 이 정정은 W3가 승인한 owner mapping과 Hybrid physical layout을 바꾸지 않는다. Compact는 계속 nested non-log record, Full은 top-level base child log이며 Task Index가 profile·mode·locator를 함께 소유한다.
- W3의 completed 상태는 유지한다. 추가 integration 작업은 없고, W4 fixture가 Compact/delegated 조합과 lifecycle 부재를 검증하는 것으로 영향을 소비한다.

## 2026-07-05 · W4 승인 범위와 다음 세션 handoff

### 변경 범위

| 파일 | 동작 | 소유할 내용 |
| --- | --- | --- |
| `.agents/skills/log/references/package-log.md` | 생성 | W2 정규 9개 의미 계약과 Compact/Full task-record composition template |
| `.agents/skills/log/SKILL.md` | 수정 | package 조건에서만 새 reference를 읽게 하는 on-demand routing 한 항목 |
| `logs/AGENTS.md` | 수정 | Workspace Reset section 밖 durable repo integration: Hybrid path, stable package key, Task Index locator, manual registry/closeout audit |
| `docs/guides/workflow.md` | 수정 | controlling→Task Index→record read path, Compact/Full 실행, Result 소비와 manual closeout 흐름 |

`package-log.md`는 `Identity`, `Activation and Entry Routing`, `Bootstrap and Integration Probe`, `Artifact and Evidence Tests`, `State Ownership and Task Contract`, `Agent Topology and Execution Modes`, `Fixed Package Skeleton`, `Package Reconcile`, `Package Closeout` 순서로 구성한다. Task-record template은 `State Ownership and Task Contract` 아래에서 공통 schema와 Compact/Full composition으로 둔다.

공통 task-record schema는 다음 mapping을 복원해야 한다.

- Identity: controlling log, package W-id, Compact/Full profile, inline/delegated execution mode.
- Versioned Task Brief: revision과 내부 History pointer, objective, scope/excluded/write-set, required reads, predecessor/candidate dependency와 expected baseline·isolation, completion/verification/review/escalation/result-consumer contract.
- Append-only Task History: Brief revision의 이유·authority·영향, Attempt별 source check·실행 trace·candidate dependency·artifact disposition·escalation.
- Result / Verification: W-id/revision/Attempt, changed artifacts, completion condition, verification evidence/status, candidate result, actual dependency, residual risk, downstream/revalidation, digest와 controlling disposition pointer.
- Compact는 `logs/packages/<stable-package-key>/tasks/W<id>.md`의 non-log record다. Full은 `logs/` top-level base child log이자 record이며 Return Target/local Work Items/base History 안에 Brief·Attempt·Result를 결합한다. 한 W는 Compact 또는 Full 한 파일만 가진다.

### W4 Verification Contract

| 검증 대상 | 방법/명령 | 통과 조건 | 실패 시 행동 |
| --- | --- | --- | --- |
| Portable 계약 완전성 | W2 정규 9개 section과 W3 승인 mapping을 새 reference와 대조 | 승인된 계약 누락·의미 변경·폐기안 복원 없음 | owner 문구를 고치고 다시 대조 |
| Router/read path | `rg -n 'package-log' .agents/skills/log/SKILL.md .agents/skills/log/references logs/AGENTS.md docs/guides/workflow.md` | SKILL은 on-demand pointer만, 세부 계약은 package reference 한 곳에 있음 | 중복을 owner로 환원 |
| Portable/integration 경계 | repo path·onramp·workspace-reset taxonomy와 portable reference를 대조 | portable reference에 이 repo 전용 physical path/command/taxonomy 없음 | repo integration owner로 이동 |
| Repo Hybrid integration | `logs/AGENTS.md` 변경과 W3 승인 layout 대조 | controlling/Full top-level, Compact nested, stable key/Task Index/audit가 명확함 | integration section 보정 |
| 기존 자료 비변경 | `git diff -- logs/W*-task.md`와 `logs/AGENTS.md` Workspace Reset section diff 확인 | 기존 Task Brief와 temporary Workspace Reset body에 변경 없음 | 소급 변경 제거 |
| Full/Compact template | `/private/tmp`에 최소 예시를 만들고 Full은 explicit `log check`, Compact는 schema/비-log 경계를 수동 대조 | Full base 구조 통과, Compact에 base status/Work Items/Return Target 없음, 둘 다 common fields 복원 | template 수정 후 fixture 재검증 |
| Manual Registry Integrity | fixture Task Index와 `find <package>/tasks -type f -name '*.md'` actual set, Identity와 Full Return Target 대조 | dangling/orphan/membership mismatch를 모두 판별 가능 | audit 절차 보강; tool로 즉시 우회하지 않음 |
| 금지 파일 비변경 | `git diff -- .agents/skills/log/references/loop-rules.md .agents/skills/log/references/design-principles.md .agents/skills/log/references/project-setup.md .agents/skills/log/references/example.md .agents/skills/log/references/maintenance.md plans/AGENTS.md AGENTS.md .gitignore .agents/skills/log/scripts/log scripts/onramp` | diff 없음 | 범위 밖 변경 제거 |
| W4 log 정합 | `.agents/skills/log/scripts/log check logs/log-system/2026-07-03-log-skill-package-log-model-discussion.md` | W4 단일 active, Return Target independent, 구조 오류 없음 | Work state/Required Context 보정 |

검증은 `onramp`를 실행하지 않고 수행한다. W4 완료 전 owner/inbound/outbound reference, producer/consumer, 수동 audit와 prospective-only 경계를 다시 읽고 결과 ledger를 이 block에 append한다. `scripts/package-log` 후속은 W4 review가 끝난 뒤 별도 수명으로 제안하며 현재 W4에 구현하지 않는다.

### 다음 세션 재개 지점

- 현재 재개 지점은 W4다. 먼저 Work Items, Required Context의 Return Target·`{Global}`·`{W4}`, W2 정규 초안, W3의 결정 1~3 승인과 결정 4 수정, 이 block을 읽는다.
- 네 owner 파일을 승인 범위 안에서 반영한 뒤 Verification Contract를 순서대로 실행하고, 확인한 사실·추론·의견을 구분한 결과 ledger를 이 block에 남긴다.

### 2026-07-05 18:14 · W4 실행 (1/4) — package-log.md 생성·검토·검증

#### 반영한 것 (확인한 사실)

- `.agents/skills/log/references/package-log.md`를 생성했다(326행). W2 정규 9개 의미 계약(Identity · Activation and Entry Routing · Bootstrap and Integration Probe · Artifact and Evidence Tests · State Ownership and Task Contract · Agent Topology and Execution Modes · Fixed Package Skeleton · Package Reconcile · Package Closeout)과 Compact/Full task-record composition template을 `State Ownership and Task Contract` 아래에 소유한다.
- base 로그 loop는 복제하지 않고 `loop-rules.md`(`#reconcile` · `#cross-log--lifetime-transitions` · `#closeout--status`)를 상속·링크했다. repo 전용 물리 경로·stable key·감사 명령·Task Index 물리 locator는 넣지 않고 project integration 소유로 표기했다.
- `SKILL.md` · `logs/AGENTS.md` · `docs/guides/workflow.md`는 아직 수정하지 않았다(`git status`상 package-log.md만 신규).

#### 검토·정정 경위 (확인한 사실)

- Codex 독립 검토 2회전: (1) 내용 gap 검토 8 findings, (2) 불필요 해설·중복 압축.
- 8 findings를 원문 authority에 대조해 독립 판정: file-level 7건(F1~F7) 확인·수용, F8(실행 mode) 판정 일치.
  - F1 — Full의 현재 Task Brief는 별도 `Task Brief` section, 실행 trace·Attempt·Result는 base History(로그 1104·1110 근거). 초안이 Brief까지 History에 넣어 4표면 schema와 자기모순이던 것을 정정.
  - F2 contract review 대상에 관련 Task Brief 명시(555). F3 Brief revision trigger(839). F4 Result의 verification evidence·actual dependency 복원(1191·869). F5 Reconcile map을 portable 최소 계약으로 규정(371–376). F6 base-loop owner를 SKILL(top-level)/loop-rules(세부)로 분리(loop-rules.md:3). F7 reviewer의 의도적 candidate-read 조건 추가(870).
- 압축본 재검토에서 Activation 승인 기준 문장(W2 §2 928 · {Global} 24)이 제거된 것을 발견해 복원 권고 → 반영됨. Full 문단의 중복 non-log duplicate 문구 제거도 반영됨.

#### 검증 (확인한 사실, 부분)

- `scripts/check-markdown-inline-code` PASS, `git diff --check` PASS.
- 9개 section 순서 유지, F1~F7 유지, portable/integration·base-loop owner 경계 유지를 직접 대조 확인.
- 이는 package-log.md 국소 검증이며 W4 전체 Verification Contract는 미수행이다.

#### 판정 기록 (추론)

- 프롬프트는 실행 mode를 `inline/delegated/coordinated-team`으로 표현했으나 결정 8(878)·W2 정규 §6(950)이 coordinated-team을 portable에서 제거하고 project integration 매핑으로 확정했다. package-log.md는 portable mode를 `inline/delegated`로만 두고 coordinated-team은 integration 매핑으로 기술했다. Codex도 이 authority 우선에 동의했다.

#### Known gap · closeout handoff 후보

- (추론) 이 block의 W4 handoff 서술 1192 "base History 안에 Brief·Attempt·Result를 결합한다"는 상세 승인 설명(1104·1110)의 "현재 Task Brief=별도 section"과 문면상 어긋난다. package-log.md는 후자를 authority로 채택했다. 1192는 W4 자체 수정 대상이 아니며 로그 minor drift 후보로 closeout에서 확인한다.
- (확인한 사실) `maintenance.md` owner 맵(:149-152, :221-223)이 새 owner인 package-log.md를 빠뜨려 stale해지는 gap은 W3가 그 파일을 금지 파일로 지정했으므로 W4에서 조용히 고치지 않는다. closeout handoff에서 @user 결정을 요청한다.

#### 남은 W4와 상태

- 남은 반영: `SKILL.md` on-demand router, `logs/AGENTS.md` Hybrid integration, `docs/guides/workflow.md` how-to, 그리고 전체 W4 Verification Contract(fixture 포함) 실행.
- W4는 `[>]` 유지. 이번 기록은 package-log.md 생성·검토 sub-step 완료이며 W4 완료 판정이 아니다.

### 2026-07-05 18:29 · W4 실행 — SKILL router 독립 리뷰 반영

#### 확인한 사실

- W3 결정 3과 W4 승인 범위는 `.agents/skills/log/SKILL.md`가 package 조건에서만 `references/package-log.md`를 읽게 하는 on-demand router 한 항목만 소유하고 세부 계약을 복제하지 않도록 정했다.
- 독립 리뷰는 현재 router의 배치·단일 pointer·세부 계약 비복제를 PASS로 판정했지만, trigger의 공통 gate 집합이 `evidence·handoff·closeout`으로 적혀 정본인 `evidence·scope·handoff·closeout`에서 `scope`가 빠진 한 건을 확인했다.
- @user 승인에 따라 router trigger를 `공통 evidence·scope·handoff·closeout`으로 보정했다. 다른 router 항목과 package 세부 계약은 변경하지 않았다.
- 리뷰의 `logs/AGENTS.md` 매치가 기존 Workspace Reset placeholder뿐이라는 서술은 리뷰 당시 snapshot에 대한 설명이며, 이후 durable package integration이 추가된 현재 상태를 설명하지 않는다. 이 시점 차이는 SKILL router 판정에는 영향을 주지 않는다.

#### 판정

- `scope`는 package activation의 공유 gate이자 비어 있을 수 없는 Package Scope의 기준이므로, 누락은 단순 문체 차이가 아니라 승인 계약을 소폭 약화한 의미 누락이었다. 최소 한 단어 보정으로 정본 gate 집합과 맞췄다.
- router는 여전히 실제 작업 신호를 제시한 뒤 on-demand reference로 보내는 entry 역할만 하며 portable 세부 계약이나 repo integration을 소유하지 않는다.

#### 검증과 상태

- `scripts/check-markdown-inline-code .agents/skills/log/SKILL.md` PASS.
- `rg -n -C 1 'package-log' .agents/skills/log/SKILL.md`에서 단일 pointer와 4-gate trigger를 확인했다.
- `git diff --check` PASS.
- W4는 `[>]`를 유지한다. 이번 entry는 SKILL router sub-step의 리뷰 반영이며 W4 전체 완료 판정이 아니다.

### 2026-07-05 18:38 · W4 실행 — required-read와 Compact mode 리뷰 반영

#### 확인한 사실

- required-read binding 독립 리뷰는 추가 문장을 7/7 PASS로 판정하고 low-severity F1(가장 작은 유효 scope), F2(controlling Work Item owner 명시), 선존 F3(Compact inline 서술과 profile/mode 직교성 긴장), 정보성 F4(Cross-Artifact Effects read)를 보고했다.
- 재대조 결과 F1·F2는 명료성 보정으로 수용했다. F3은 binding 자체의 결함은 아니지만 `Compact=inline`으로 읽히는 기존 문장과 `Delegation은 profile과 별개` 계약의 실제 충돌이므로 수용했다. F4는 모든 task의 required-read를 불필요하게 넓히므로 반영하지 않았다.
- `.agents/skills/log/references/package-log.md`의 required-read binding을 controlling log의 Package Scope와 해당 Work Item으로 명확히 하고, owner/path·대상 entry·action을 가장 작은 유효 scope로 binding하도록 보정했다.
- Compact는 local lifecycle을 만들지 않는 profile이고 warm-context inline이 기본이지만, delegated여도 독립 lifecycle이 필요 없으면 사용할 수 있도록 정정했다.

#### 검증과 영향

- `scripts/check-markdown-inline-code .agents/skills/log/references/package-log.md` PASS.
- untracked 신규 reference 전체에 대한 `git diff --check --no-index /dev/null ...`은 whitespace 오류 없이 diff 존재만 나타냈다.
- 변경은 portable Task Record Contract 안에 닫히며 Hybrid path·stable key·Registry Integrity owner인 `logs/AGENTS.md`를 바꾸지 않는다.
- W4 fixture에서는 `Profile: Compact`와 `Execution mode: delegated` 조합이 base Work Items·Required Context·Return Target 없이 복원되는지 확인해야 한다.
- W4는 `[>]`를 유지한다. 다음 owner 반영은 `docs/guides/workflow.md` how-to다.

### 2026-07-05 18:56 · W4 실행 — workflow how-to 구조화·독립 리뷰 반영

#### 확인한 사실

- `docs/guides/workflow.md`에 package how-to 12단계를 반영한 뒤 Claude 독립 리뷰를 받았다. 리뷰는 activation부터 package closeout 뒤 base Closeout/status 적용까지의 순서, Compact/Full profile과 inline/delegated mode 분리, Compact delegated 허용, required-read binding, candidate result disposition, Registry Integrity→Result Consumption Gate 순서를 owner 계약과 대조해 PASS로 판정했다.
- @user 검토와 후속 구조 토론에 따라 작업 관련 절을 `## 작업 구성 판단` 아래 `### 작은 작업` → `### 큰 작업과 plan` → `### 다른 로그로 작업 전환` → `### Package workflow` 순서로 재구성했다. 상위 도입문은 진행 단위, cross-log 소비 관계, package activation이 서로 다른 축이며 배타 분류가 아님을 명시한다.
- Package 12단계의 순서와 owner 연결은 유지했다. Step 6의 축약을 owner와 맞춰 `History·next pointer/handoff`로 정밀화했고, Step 8에 두 번째 result review를 명시해 첫 contract review와 대응시켰다.
- `Package 작업` heading이나 anchor를 직접 참조하는 current Markdown inbound link는 확인되지 않았다. 과거 로그의 작은 작업·plan 언급은 provenance이므로 수정하지 않았다.

#### 독립 판정

- Claude의 의미 계약 PASS와 owner 중복 없음 판정은 직접 대조 결과 타당해 수용했다.
- Claude가 기존 배치를 “작업 크기·복잡도 escalation 순서”로 설명한 부분은 수용하지 않았다. Package activation은 작업 크기나 plan 유무와 별개이고 `docs/guides/AGENTS.md`는 explainer의 자기 흐름 구조를 허용할 뿐 기존 순서를 요구하지 않는다. 작은 작업과 큰 작업을 같은 진행 단위 축에 인접시키고 cross-log/package 판단을 별도 축으로 명시하는 구조가 reader path를 더 정확히 복원한다고 판정했다.
- 새 상위 절은 새로운 status·marker·schema나 portable phase를 만들지 않고 기존 how-to 절의 관계만 설명하므로 guide identity와 owner 경계 안에 닫힌다.

#### 검증과 상태

- `scripts/check-markdown-inline-code docs/guides/workflow.md` PASS.
- `git diff --check -- docs/guides/workflow.md` PASS.
- heading scan에서 `작업 구성 판단` 아래 네 `###` 절과 이후 sibling `## 충돌과 예외 흐름` 경계를 확인했다.
- `rg -n 'package-log' .agents/skills/log/SKILL.md .agents/skills/log/references logs/AGENTS.md docs/guides/workflow.md`로 router·portable owner·integration owner·how-to read path가 분리되어 있음을 재확인했다.
- 이번 entry는 `docs/guides/workflow.md` owner 반영 sub-step의 완료 기록이다. 전체 W4 Verification Contract의 fixture·Manual Registry Integrity 등 남은 검증을 수행하기 전까지 W4는 `[>]`를 유지한다.

### 2026-07-05 19:28 · W4 실행 — workflow 축 문구 최종 정밀화

#### 확인한 사실

- 반영 후 Claude 독립 리뷰는 구조·12단계·owner 경계·rename·로그 기록·W4 `[>]` 유지를 PASS로 판정하고, `작업 구성 판단` 도입문의 F1(cross-log 축을 소비 관계로 과소표현)과 F2(네 하위 절 전체가 함께 적용된다는 전칭)를 low-severity 정밀화 대상으로 제시했다.
- 직접 대조 결과 detach 외에 transfer·independent follow-up도 있으므로 `다른 로그와의 소비 관계`는 cross-log 축보다 좁고, 작은 작업과 plan은 진행 단위 축 안의 대안이므로 네 절 전체를 공동 적용 대상으로 표현한 문장도 정확하지 않았다.
- @user 승인에 따라 도입문을 진행 단위, 로그 수명과 다른 로그로의 전이, package activation의 세 독립 축으로 재작성하고, 진행 단위 축에서는 로그 하나와 plan 중 작업 구성 방식을 선택한다고 명시했다. Package 12단계와 owner 연결은 변경하지 않았다.

#### 검증과 상태

- `scripts/check-markdown-inline-code docs/guides/workflow.md` PASS.
- `git diff --check -- docs/guides/workflow.md` PASS.
- 검색으로 기존 `소비 관계`·네 절 공동 적용 전칭이 제거되고 `로그 수명과 다른 로그로의 전이`·세 독립 축 표현이 반영됐음을 확인했다.
- @user는 `long_log: hard`를 W4 closeout에서 별도 처분하지 말고 현재 문구만 반영하라고 지시했다. 따라서 이를 별도 Work Item·handoff·분리 후보로 만들지 않는다.
- W4는 전체 Verification Contract의 남은 검증 전까지 `[>]`를 유지한다.

### 2026-07-05 19:39 · 2026-07-05 · W4 Verification Contract 실행 결과 ledger

#### 전체 판정

- **PARTIAL**. Portable/owner/fixture/registry/비변경/구조 검사는 통과했으나, 지정된 통합 Markdown inline-code 검사가 W4 변경 밖의 기존 committed 문구에서 실패했다.

#### Verification Contract 결과 (확인한 사실)

| 항목 | 결과 | 직접 근거 |
| --- | --- | --- |
| Portable 계약 완전성 | PASS | `package-log.md`의 9개 section을 W2 정규 초안·후속 정정과 W3 mapping에 대조했다. 승인 계약 누락·의미 변경이 없고, 폐기안은 금지/비정의 문맥으로만 언급되며 복원되지 않았다. repo path·command·Workspace Reset taxonomy 검색은 match 없음이었다. |
| Router/read path와 owner 경계 | PASS | 지정 `rg -n 'package-log' ...` 결과에서 `SKILL.md`는 단일 on-demand pointer, `package-log.md`는 portable 의미, `logs/AGENTS.md`는 물리 integration/audit, `workflow.md`는 수행 순서와 owner 연결을 소유한다. |
| Repo Hybrid integration | PASS | controlling/Full top-level, Compact stable-key nested path, 한 W의 Compact XOR Full, exact locator, stable key 유지, prospective-only가 W3 승인 layout과 일치한다. |
| Compact/delegated fixture | PASS | `/private/tmp/package-log-w4-fixture/logs/packages/2026-07-05-fixture-package/tasks/W1.md`에 Identity·versioned Brief·append-only History·Result/Verification과 가장 작은 controlling required-read binding을 복원했다. Profile=Compact, mode=delegated이며 frontmatter status·Work Items·Required Context/Return Target·local lifecycle은 없다. |
| Full child fixture | PASS | `/private/tmp/package-log-w4-fixture/logs/2026-07-05-fixture-package-W2-full.md`은 Full record 자체가 child log이고 local Work Items/next pointer, independent resume, controlling W2 Return Target, 별도 Task Brief section과 base History Attempt/Result를 가진다. explicit `log check` exit 0, 같은 W2 Compact duplicate 없음이다. |
| Manual Registry Integrity | PASS | 정상 fixture의 Work Items W1/W2, Task Index, actual Compact/Full set, Identity 역포인터와 Full Return Target이 일치했다. dangling, orphan, controlling mismatch, W-id mismatch, profile/location mismatch, duplicate locator, Compact/Full duplicate, Full Return Target mismatch 8개 격리 failure fixture를 7단계 수동 절차로 모두 판별했다. Full Return Target 실패 fixture는 `log check` 자체는 exit 0이지만 후속 W-id 대조에서 W1 대 W9 불일치로 검출되어 절차의 두 단계 필요성도 확인했다. |
| 기존 자료·금지 파일 비변경 | PASS | `git diff -- logs/W*-task.md`와 지정 금지 파일 diff는 비어 있다. `logs/AGENTS.md` diff는 Workspace Reset section 앞에 새 durable integration 60행을 삽입했을 뿐 기존 section body를 바꾸지 않았다. |
| 문서·diff 검사 | FAIL | `git diff --check`는 PASS. `SKILL.md`, `package-log.md`, `workflow.md` 개별 inline-code 검사는 PASS. 지정 4파일 통합 검사는 `logs/AGENTS.md:175-176`의 기존 줄바꿈 inline-code 때문에 exit 1이다. 해당 줄은 current diff에 없고 `git blame`상 commit `6ca6faa6`에서 온 기존 committed baseline이다. |
| W4 로그 정합 | PASS | `log check` exit 0: W4만 active, Return Target independent, Work Items/Required Context 구조 오류 없음. `long_log: hard`는 출력 사실로만 기록하며 별도 처분하지 않는다. |

#### Fixture와 영향 경계 (확인한 사실)

- 정상 fixture root는 `/private/tmp/package-log-w4-fixture`이며 repo 밖이다. failure cases도 그 아래에만 만들었다.
- Task record는 candidate result를 생산하고 controlling W가 disposition·accepted state와 Result 소비를 소유하는 관계가 정상 fixture에서 복원됐다.
- inbound는 `SKILL.md`, `logs/AGENTS.md`, `workflow.md`가 portable owner를 역할별로 참조한다. outbound는 portable owner가 base lifecycle을 `loop-rules.md`로 위임하고 physical mapping은 project integration으로 위임한다.
- prospective-only 경계가 기존 workspace-reset/legacy controlling logs, `logs/W*-task.md`, 기존 Task Brief와 Workspace Reset section의 migration/backfill을 금지한다. 해당 기존 자료는 이번 세션에 변경하지 않았다.

#### 추론과 의견

- 기존 `logs/AGENTS.md:175-176` 실패는 새 package 계약의 의미 결함이나 W4 diff 회귀가 아니라 baseline lint debt다. 그러나 사용자가 이번 Verification Contract에 정확한 통합 명령을 required check로 지정했으므로, 명시적 waiver 또는 별도 승인된 수정 전에는 전체 PASS로 보고할 수 없고 W4 closeout의 절차상 blocker로 보는 것이 타당하다.
- `maintenance.md` owner map의 package-log 누락은 W4 금지 파일에 있는 알려진 routing gap이다. 현재 네 owner의 계약/소비 경로를 깨뜨리는 직접 증거는 없어 W4 의미 검증 blocker가 아니라 범위 밖 후속 후보로 본다.
- W4 handoff의 기존 “base History 안에 Brief·Attempt·Result” 문구 drift는 상세 승인 entry와 현재 portable owner가 Task Brief를 별도 section에 두므로 provenance 문구 drift이며, 현재 계약 blocker는 아니다.

#### Closeout readiness와 변경 범위

- W4 marker 완료와 로그 `decided` 전환은 **현재 불가**: 통합 Markdown 검사 실패의 disposition과 사용자 승인이 남아 있다. W4 `[>]`와 frontmatter `status: open`은 유지했다.
- 이번 검증 세션에서 repo에 새로 수정한 파일은 이 active 로그 하나이며, 이 entry만 append했다. 세션 시작부터 dirty였던 네 owner 변경, 다른 수정 로그와 untracked 로그를 되돌리거나 덮어쓰지 않았다.
- 수정하지 않은 범위: W4 네 owner 본문, 모든 금지 파일, 기존 Workspace Reset/legacy 자료, `maintenance.md`, scripts/tool/onramp, W4 marker와 status.
