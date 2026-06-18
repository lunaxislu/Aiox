# Log Owner Handoff Contract

이 파일은 이 repo에서 로그의 확정 결과를 taxonomy owner에 반영하고 로그를 닫을 때
적용하는 추가 확인 계약이다. 일반 실행 흐름은 `.agents/skills/log/SKILL.md`, 로그 생성과
기록 품질·상태·종료는 그 skill의 `references/log-writing-rules.md`, Work Items와
pointer·점검은 `references/work-items-rules.md`가 소유한다.

## Owner Handoff

로그의 확정 결과로 현재 권위 내용을 바꿔야 한다면 프로젝트의
[documentation taxonomy owner map](../docs/architecture/documentation-system.md)에
따라 책임 문서, agent 계약, code 또는 test에 반영한다.

- 책임 문서나 code의 현재 내용을 로그에 새로 복사하지 않는다.
- process나 사용법이 바뀌면 해당 guide, agent 작업 규칙이 바뀌면 해당 범위의
  `AGENTS.md`에 반영한다.

## Decided Narrative

로그는 작업 경위의 owner지만, 중요한 결정이나 현재 권위 내용 자체의 owner는
아니다. 책임 문서에 반영되지 않는 작업 경위 중 실패, 검토한 대안과 변경 이유처럼
잘못된 판단이나 반복 작업을 막는 데 필요한 내용은 로그에 보존한다.

## Closeout Check

`decided` 또는 `superseded` 전환 전에는 log skill의 일반 점검·종료 절차를 따른 뒤,
다음 repo 전용 누수만 추가로 확인한다.

- 책임 문서와 구현에 반영할 내용이 빠지지 않았는가?
- 책임 문서나 code의 현재 내용을 로그에 새로 복사하지 않았는가?
- 이관한 Work Items와 next pointer의 대상, owner와 수행 조건이 명확한가?

이 추가 점검은 일반 append마다 수행하지 않는다. 완료·취소·이관 여부가 불명확한
항목은 자동으로 수정하지 않고 사용자에게 보고한다.

## Workspace Reset Log Sections

workspace reset authority assimilation package의 핵심 규칙. legacy PRD, post-MVP plan,
history, 기존 owner 문서에는 현재 사실, 목표 계약, 목표 구조, 실행 계획, bug/blocker,
stale snapshot이 섞여 있을 수 있다. 각 섹션을 validation·drift check 할 때 모든 주장을
owner별 상태로 분류하고 각 source로 검증한다.

1. **`src/` 하위 코드 = 현재 구현의 1차 사실.** as-built/current 주장은 `src/`에서
   `file:line`으로 확인한다. 진입 함수(예: `applySchema`)가 *무엇을 호출하는지* 끝까지
   추적한다 — 미리 주어진 line ref를 사실로 믿고 멈추지 않는다.
   1-1. **"왜 이렇게 구현됐나(WHY)"는 코드가 아니라 `history/`·`docs/aiox/`·
        `plan(s)/...checklist`에 있다.** 같은 섹션을 볼 때 이쪽을 검색해 결정 맥락을
        확인한다. 코드만으로 WHY가 복원되지 않으면 decision 후보다.
   1-2. **그 WHY/사실은 owner 문서로 옮겨야 할 수 있다.** 외부 계약→`docs/specs/`,
        결정 근거→`docs/decisions/`, 내부 구조→`docs/architecture/`. 각 폴더
        `AGENTS.md`를 먼저 읽고 작성한다.
2. **섹션 검증 시 `history/`·`plan/`·`plans/`·`prd/`를 반드시 교차 검색한다. 단 거기
   적힌 내용은 현재가 아닐 수 있다:**
   - `prd/post-mvp/`·`plans/post-mvp/`·`plans/post-mvp.plan.md` = 미래·blocker·실행계획
     후보 출처 → 현재 구현으로 오인 금지.
   - 미래 문서의 "현재 스냅샷" 서술조차 **stale일 수 있다**(예: a2a-spec
     "pair slot a=codex/b=claude 고정" vs Step 15 이후 kind-agnostic 코드). 따라서
     현재·미래 어느 문서든 최종 판정은 `src/` + 날짜·`history/`로 교차 확인한다.
   - **`Post-MVP`는 owner 상태 라벨이 아니다.** 출처나 시점 힌트일 뿐이다. 문서에
     반영할 때는 아래 owner별 라벨로 다시 분류한다.
3. 확인한 증거가 `docs/specs/`·`docs/decisions/`로 가야 하면 보낸다. 보낼 때는 각
   폴더 `AGENTS.md` 지침을 따라 작성한다.
4. **"변경 없음"은** 식별자·메서드 존재 확인만으로 쓰지 않는다. (a) 서술/framing 축과
   (b) 동작·트랜잭션 로직 축을 둘 다 `src/`와 대조한 뒤에만 "변경 없음"으로 닫는다.
5. **Owner별 상태 라벨:**
   - Architecture 내부 구조·책임·상태 흐름:
     - `Current` / `As-built`: 현재 코드에 실제 구현된 내부 구조
     - `Target` / `Proposed`: spec/product/roadmap을 달성하기 위한 목표 내부 구조
     - `Deferred`: 보류된 architecture 결정
     - `Current gap`: 현재 구현에 존재하는 한계, 미배선, 미구현
   - Specs 외부 contract/API/protocol:
     - `Current Contract`: 현재 구현·테스트가 제공하는 외부 동작
     - `Target Contract` / `Proposed Contract`: 목표 또는 제안된 외부 계약
     - `Deferred`: 보류된 contract
     - `Open Issue`: 아직 결정되지 않은 contract 질문
     - `Implementation Gap`: current implementation이 current/target contract와 어긋나는 지점
     - `Pre-implementation Blocker`: target contract 구현 전에 해결해야 할 버그·설계 결함
   - Roadmap/release/plan:
     - `Release Gate`: 공개·릴리즈 전 완료 조건
     - `Execution Plan`: 구현 순서나 task 계획. spec/architecture 본문으로 복사하지 않고
       `plans/` owner로 둔다.
   - Legacy source:
     - `Stale`: 현재 코드, history closeout, owner 문서에 의해 대체된 과거 서술

### Package Preparation Before Execution

authority assimilation package를 실행하기 전에 다음 순서를 따른다. 특히 W8 specs package처럼
primary 문서가 크고 주변 owner 변경이 예상되는 작업은 이 준비를 먼저 끝낸 뒤 batch 실행을
시작한다.

1. **Package log를 먼저 만든다.**
   - `Primary owner`를 명시한다. 예: W8은 `docs/specs/aiox-a2a.md`.
   - `Allowed cross-owner updates`를 선언한다. 예: architecture, roadmap, release plan,
     decisions, 필요한 plans 문서.
   - `Evidence inputs`에 현재 알고 있는 source를 넣고, 작업 중 발견한 source는 Ledger에
     추가한다.
2. **Batch task brief 파일을 먼저 작성한다.**
   - task brief는 지시서이고, package log가 작업 상태·Ledger·next pointer를 소유한다.
   - task brief에는 `Controlling log: <package-log>`를 명시한다. batch agent는 이 로그의
     Scope, Work Items, 최신 기록, active next pointer/handoff, 관련 Evidence Ledger row를
     먼저 읽은 뒤 작업한다.
   - 큰 monolithic owner 문서는 batch 단위로 나눈다. 각 batch는 검증할 section, source,
     상태 분류 규칙, 완료 조건을 가진다.
3. **불확실한 package는 실행 전 agent 의견을 수렴한다.**
   - 미래 agent가 현재 논의 맥락을 모를 수 있으므로, batch 분할, 상태 라벨, cross-owner
     scope, blocker/release gate 처리 기준이 애매하면 package Work Item에 의견 수렴 단계를
     명시한다.
   - 의견 수렴 결과는 package log 또는 parent log에 기록하고, 그 결과를 반영한 뒤 task
     brief를 확정한다.
4. **각 batch는 primary owner만 보지 않는다.**
   - `src/`, `tests/`, `history/`, `plan/`, `plans/`, `prd/`, 관련 owner 문서를 교차 검색한다.
   - `plan/`·`plans/` 검색 결과는 관련 없음이어도 Ledger에 남긴다.
5. **Cross-owner 수정은 package Scope 안에서만 수행한다.**
   - Scope 밖 owner 수정이 필요하면 먼저 사용자에게 확인한다.
   - 수정하지 않는 후속도 `Owner impact`와 `Action`에 남긴다.
6. **Closeout 때 workflow retrospective를 남긴다.**
   - batch 분할, task brief, Evidence Ledger, Scope, agent 의견 수렴에서 생긴 시행착오와
     portable 후보를 package log에 기록한다.
   - 본 작업 결과와 workflow 회고를 섞지 말고, portable 후보와 repo 전용 판단을 구분한다.
   - workspace reset W7~W10의 portable 후보는
     `logs/2026-06-18-package-workflow-portable-pattern.md`에도 축적한다.
7. **Closeout 전 split map을 만든다.**
   - package 중 바로 split하지 않는다. 먼저 어떤 section/claim이 어느 owner 또는 split
     문서로 갈지 map을 남긴다.
   - 실제 split 실행은 해당 Work Item(W10 등)이 소유한다.

### Task Brief Template

batch task brief는 아래 구조를 기본으로 한다. batch 성격에 맞게 줄이거나 늘릴 수 있지만,
상태 분류, 교차 검색, 완료 조건은 생략하지 않는다.

```markdown
# Task Brief — <Package> Batch <N>: <주제> 검증

## 맥락

`<primary-owner>`는 <owner 역할>의 primary owner다. 이 batch는 `<섹션 범위>`를 현재 구현,
legacy PRD, post-MVP plans, roadmap/release gate와 대조해 owner 상태를 정리한다.

결과는 `<package-log>`의 Evidence Ledger / Decision Candidates / Cross-Owner Effects에
기록하고, Scope 안에서 승인된 owner 문서를 수정한다.

Controlling log: `<package-log>`.

## 0. 먼저 읽어라

1. Controlling log `<package-log>`
   - Scope
   - Work Items
   - 최신 기록
   - active next pointer / handoff
   - 이 batch와 관련된 Evidence Ledger rows
2. `logs/AGENTS.md`
3. 해당 owner 폴더의 `AGENTS.md`
4. 관련 cross-owner `AGENTS.md`
5. `docs/decisions/AGENTS.md` — decision 후보가 나오면

handoff의 `file:line`은 출발점이다. owner 문서 수정 전에는 최종 source에서 재검증한다.

## 1. 이 배치 범위

- 대상 섹션:
- 제외 범위:
- 이 배치가 답해야 할 질문:

## 2. 상태 분류 규칙

각 claim을 owner별 상태 라벨로 분류한다. `Post-MVP`는 상태 라벨이 아니라 출처/시점
힌트다.

## 3. 현재 구현 근거

출발점 파일이다. 여기서 시작해 import/call/test 경로를 따라간다.

- `src/...`
- `tests/...`

## 4. 반드시 교차 검색

- `history/`
- `plan/`
- `plans/`
- `prd/`
- 관련 owner 문서

각 source는 현재 사실로 믿지 말고 `src/` + 날짜/history closeout과 대조한다.

## 5. Owner 분류 규칙

- external protocol/contract → `docs/specs/`
- internal structure/state/process → `docs/architecture/`
- release gate/priority/sequencing → `docs/product/roadmap.md` 또는 `plans/release-plan.md`
- implementation checklist/task ordering → `plans/`
- rationale/why → `docs/decisions/`
- stale legacy source → history/legacy migration 후보

## 6. Evidence Ledger 출력

| Topic | Source | Lines | Finding | Classification | Owner impact | Action |
| ----- | ------ | ----- | ------- | -------------- | ------------ | ------ |

Finding은 `[Fact]`, `[Inference]`, `[Opinion]`으로 시작한다.

## 7. Cross-Owner Effects

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |

## 8. 완료 조건

- 대상 섹션/claim이 상태 분류됨
- `src/tests` 근거와 legacy/post-MVP source가 대조됨
- blocker, release gate, execution plan이 owner별로 분리됨
- primary owner 본문에 다른 owner 내용을 복사하지 않음
- 필요한 cross-owner action이 package log에 남음
- Workflow retrospective: batch 분할, task brief, Evidence Ledger, Scope, agent 의견 수렴에서
  생긴 시행착오와 portable 후보가 기록됨
  - workspace reset W7~W10 task brief에서는 portable 후보 기록 대상
    `logs/2026-06-18-package-workflow-portable-pattern.md`를 명시한다.
- 다음 batch 또는 closeout으로 이어질 항목이 명확함
```

<!-- TEMPORARY: workspace reset 기간 한정. 종료 시 이 섹션 전체 삭제. 삭제 조건: plans/workspace-reset/workspace-reset.md -->

workspace reset authority assimilation task는 아래 섹션을 task log에 남긴다.
다른 agent가 owner 문서 반영 내용을 이 로그만 보고 pass/fail 검증할 수 있게 한다.
작업 패키지는 primary entry point를 가진 authority assimilation 단위이며, 작업 중
spec/roadmap/decision 등 다른 owner 변경이 필요해도 같은 package log에 기록한다.

**Scope 필드 규칙:**

- `Primary owner`: 이 package에서 최종 갱신할 주 문서.
- `Allowed cross-owner updates`: primary owner 외에 이 package 작업 중 수정이 허용된 문서
  목록을 미리 선언한다. 검증 agent가 "왜 이 문서를 건드렸지?"를 판단하는 기준이 된다.
  목록 밖 문서를 수정했으면 이탈 신호로 본다.

  예: `local-agent-runtime.md`를 정합하다가
  - spec(`aiox-a2a.md`)에 stale reference 발견 → `aiox-a2a.md` 수정 필요
  - decision-worthy rationale 발견 → `docs/decisions/` 파일 신규 생성 필요
  - roadmap gate 조건이 바뀌어야 함 → `docs/product/roadmap.md` 수정 필요

  이런 경우 미리 선언한 목록 안에 있으면 같은 package log에 Cross-Owner Effects로
  기록하고 반영한다. 목록에 없던 문서를 수정해야 하면 먼저 사용자에게 확인한다.

- `Evidence inputs`: 작업 전에 알고 있는 소스 목록. 빈 채로 시작해도 된다. 작업 중
  사용자가 파일을 지정하거나 agent가 발견한 소스는 Evidence Ledger에 row로 추가한다.

### Scope

- Primary owner:
- Allowed cross-owner updates:
- Evidence inputs:

### Evidence Ledger

| Topic | Source | Lines | Finding | Owner impact | Action |
| ----- | ------ | ----- | ------- | ------------ | ------ |

### Decision Candidates

| Source | Lines | Why decision-worthy | Proposed decision | Status |
| ------ | ----- | ------------------- | ----------------- | ------ |

### Cross-Owner Effects

| Owner document | Change | Reason | Verification |
| -------------- | ------ | ------ | ------------ |

### Closeout

- Updated owner documents:
- Validation result:
- Remaining gaps:
- Workflow retrospective:
- Next owner/log:
