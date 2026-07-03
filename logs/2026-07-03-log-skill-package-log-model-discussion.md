---
topic: portable package-log model discussion
description: portable package-log 모델의 정체성·activation·상태 표면·agent topology와 base log workflow specialization을 수렴하고 승인된 후속 반영을 검증한다
status: open
---

## Work Items

- [>] W1 기존 open portableization 로그와 이 로그의 관계·처분·합성 방식을 결정하고, 중복 없이 이어갈 단일 실행 경계를 확정한다
- [ ] W2 portable package-log 모델의 activation, 상태 owner, optional surface, source/ledger binding, agent topology와 base log loop specialization을 수렴한다
- [ ] W3 수렴안의 owner 파일, repo integration 잔류 범위, 변경하지 않을 범위와 검증 방법을 제시해 사용자 승인을 받는다
- [ ] W4 승인된 범위만 반영하고 owner·inbound/outbound reference·예시·검증 경로를 확인한다

## Required Context

### {Global}

- `log/decision.md`를 이 로그의 전역 설계 맥락으로 읽는다. 내용을 복사해 별도 권위로 만들지 않는다.
- 현재 논의의 안정적인 출발점은 `logs/2026-07-01-log-skill-overhaul-discussion.md`의 `2026-07-01 · 다음 논점 확정 — package log 모델의 portable skill 흡수` owning block과, 같은 파일의 `2026-07-01 · 기록 복원성 문제 — 관련 논의의 블록 확장·통합 후보` owning block이다.
- 기존 실행 후보 `logs/2026-06-22-log-skill-package-workflow-portableization.md`와 먼저 정합화한다. W1 결론 전에는 어느 로그도 조용히 대체·흡수·종료한 것으로 보지 않고 portable skill owner를 수정하지 않는다.
- 근거 분류는 `logs/2026-06-28-log-skill-package-log-and-long-log-split-discussion.md`의 `2026-06-30 · 결론 — package log의 문제, 필요성, 차용할 개념`과 `logs/2026-06-18-package-workflow-portable-pattern.md`의 `2026-06-22 · W11-2 repo 전용 taxonomy와 portable pattern 분리`, `2026-06-22 · W11-3 maintenance 판단과 parent 반영`을 따른다.
- portable 후보와 repo specialization을 구분한다. package identity·activation/downgrade·controlling log와 task brief 분리·claim/evidence gate·shared source/ledger consumer binding·agent topology는 portable 후보이고, 이 repo의 taxonomy·legacy 경로·상태 라벨·source-map schema·disposition/deletion vocabulary는 repo integration 범위다.
- package-log 모델은 문서 package에 한정하지 않고 하나의 primary artifact/change boundary와 관련 artifact가 공통 closeout gate를 갖는 조건부 workflow로 검토한다. 파일 수나 병렬 실행 자체는 activation 기준이 아니다.
- 이 로그에서는 package-log 모델과 그 승인된 owner 반영만 다룬다. script, `scripts/onramp`, `docs/guides/workflow.md`와 일반 log-skill maintenance 정리는 별도 작업 수명이며 여기서 수정하지 않는다.

## 2026-07-03 · portable package-log 모델 독립 토론 수명 개설

### 분리 판단

- @user는 현재의 포괄적인 log-skill overhaul 토론에서 package-log 모델을 별도 로그로 분리해 토의하고 이후 승인된 작업까지 이어가도록 지시했다.
- 이 작업은 package identity, activation, 상태·증거 표면, agent topology와 owner 반영이라는 자체 완료 조건과 재개 순서를 가진다. 기존 토론 로그의 일반 Record/Reconcile·example 정합화나 별도 script/onramp maintenance와 함께 닫을 수 없으므로 별도 작업 수명이다.
- source Work Item이 이 결과를 기다리도록 연결돼 있지 않으므로 Independent Follow-Up으로 연다. 복귀 pointer와 `## 복귀 대상`은 두지 않는다.

### 알려진 겹침과 선행 gate

- `logs/2026-06-22-log-skill-package-workflow-portableization.md`는 같은 portableization 목적의 open 로그이며 W1이 active다. 새 로그가 이를 자동으로 supersede하거나 내용을 복제하면 두 상태 owner가 생긴다.
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
