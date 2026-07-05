# Log Owner Handoff Contract

이 파일은 이 repo에서 로그의 확정 결과를 taxonomy owner에 반영하고 로그를 닫을 때
적용하는 추가 확인 계약이다. 일반 실행 흐름은 `.agents/skills/log/SKILL.md`, 로그 생성·기록
품질·상태·종료와 Work Items·pointer·점검의 세부 규칙은 그 skill의
`references/loop-rules.md`가 소유한다.

## Owner Handoff

로그의 확정 결과로 현재 권위 내용을 바꿔야 한다면 프로젝트의
[documentation taxonomy owner map](../docs/documentation-system.md)에
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

## Long Log Split Guard

로그 길이는 분리 검토 신호일 뿐 분리 결정 기준이 아니다. 실제 분리 필요성은 log skill의
[Log Lifetime Boundary](../.agents/skills/log/references/loop-rules.md#log-lifetime-boundary)로
판정하고, 다른 로그가 필요하면
[Cross-Log / Lifetime Transitions](../.agents/skills/log/references/loop-rules.md#cross-log--lifetime-transitions)에서
전이 종류를 판정·적용한다.

- Soft threshold: 600 lines. 로그 분리 필요성을 검토한다.
- Hard threshold: 1000 lines. 로그를 분리하거나, 단일 수명으로 유지하는 이유를
  기록한다.
- 두 threshold 모두 자동 분리 기준이 아니다. 분리·미분리 판단은 agent와 사용자가
  로그 수명과 소비 관계를 보고 결정한다.

## Package Log Repository Integration

새로 생성하는 package의 portable 계약과 Compact/Full composition은
[package-log.md](../.agents/skills/log/references/package-log.md)를 따른다. 이 절은 이 repo의
물리 배치와 Registry Integrity 검사만 추가한다.

### Hybrid Layout

- Controlling package log는 `logs/YYYY-MM-DD-<package-topic>.md`에 둔다.
- Compact task record는
  `logs/packages/<stable-package-key>/tasks/W<id>.md`에 둔다.
- Full child task-record log는
  `logs/YYYY-MM-DD-<stable-package-key>-W<id>-<task-topic>.md`에 둔다.
  Full child log 자체가 해당 W의 record이므로 같은 W의 Compact record를 만들지 않는다.
- `<stable-package-key>`의 기본값은 controlling package log의 확장자를 제외한 filename
  stem이다. 첫 task record를 만들기 전에 Task Index에 선언하고, 이후 controlling log의
  이름이나 주제가 바뀌어도 canonical record path 안정을 위해 변경하지 않는다.
- Task Index의 각 executable W entry는 profile과 repo root 기준 exact canonical record
  path를 가진다. directory나 filename pattern만 적거나 경로를 추론하게 두지 않는다.

### Manual Registry Integrity

Executable W를 완료하거나 package를 closeout하기 전에 다음 집합과 pointer를 대조한다.

1. Controlling log의 executable Work Item W-id 집합과 Task Index W-id 집합이 일치하는지
   확인한다. 한 W에 entry가 없거나 둘 이상이면 실패다.
2. 각 Task Index locator가 실제 파일 하나를 가리키며, profile과 물리 위치가 일치하는지
   확인한다.
3. Compact record는 다음 명령의 actual set과 Task Index의 Compact locator set을 대조한다.

   ```sh
   find logs/packages/<stable-package-key>/tasks -type f -name '*.md'
   ```

   actual set에만 있으면 orphan record, Task Index에만 있으면 dangling locator다.
4. `logs/` top-level에서 Identity의 `Controlling log`가 현재 controlling package log를
   가리키는 Full record actual set을 찾고 Task Index의 Full locator set과 대조한다.
5. 각 record의 Identity에서 controlling log, package W-id와 profile이 해당 Task Index
   entry와 정확히 일치하는지 확인한다.
6. 각 canonical record path가 전체 controlling package log의 Task Index 중 정확히 한 곳에만
   등록됐는지 확인한다. 여러 package에 등록됐거나 한 W에 Compact와 Full이 함께 있으면
   membership mismatch다.
7. 각 Full child에 다음 검사를 실행한다.

   ```sh
   .agents/skills/log/scripts/log check <full-child-path>
   ```

   이어 `Return Target`의 source log와 Work Item이 controlling log의 해당 W-id를
   가리키는지 확인한다.

orphan record, dangling locator, Identity·profile·Return Target 불일치, 중복 locator 또는
Compact/Full 중복은 Registry Integrity 실패이며 closeout blocker다.

### Prospective-Only Boundary

이 integration은 반영 뒤 새로 생성하는 package에만 적용한다. 기존 workspace-reset/legacy
controlling log, `logs/W*-task.md`, Task Brief와 Workspace Reset section을 이동·backfill·
재분류하거나 새 schema로 in-place upgrade하지 않는다.

## Workspace Reset Log Sections

workspace reset authority assimilation package의 핵심 규칙. 삭제된 legacy source는
직접 검색하지 않고 surviving archive, source map, owner 문서를 본다. legacy PRD,
post-MVP plan, 기존 owner 문서에는 현재 사실, 목표 계약, 목표 구조, 실행 계획,
bug/blocker, stale snapshot이 섞여 있을 수 있다. 각 섹션을 validation·drift check 할 때
모든 주장을 owner별 상태로 분류하고 각 source로 검증한다.

1. **`src/` 하위 코드 = 현재 구현의 1차 사실.** as-built/current 주장은 `src/`에서
   `file:line`으로 확인한다. 진입 함수(예: `applySchema`)가 *무엇을 호출하는지* 끝까지
   추적한다 — 미리 주어진 line ref를 사실로 믿고 멈추지 않는다.
   1-1. **"왜 이렇게 구현됐나(WHY)"는 코드가 아니라 surviving archive, source map,
        owner 문서에 있다.** 같은 섹션을 볼 때 삭제된 legacy source 원본 대신 해당
        successor를 확인한다. 코드만으로 WHY가 복원되지 않으면 decision 후보다.
   1-2. **그 WHY/사실은 owner 문서로 옮겨야 할 수 있다.** 외부 계약→`docs/specs/`,
        결정 근거→`docs/decisions/`, 내부 구조→`docs/architecture/`. 각 폴더
        `AGENTS.md`를 먼저 읽고 작성한다.
2. **섹션 검증 시 surviving archive, source map, owner 문서와 남아 있는 `plans/`·`prd/`
   자료를 반드시 교차 확인한다. 단 거기 적힌 내용은 현재가 아닐 수 있다:**
   - `prd/post-mvp/`·`plans/post-mvp/`·`plans/post-mvp.plan.md` = 미래·blocker·실행계획
     후보 출처 → 현재 구현으로 오인 금지.
   - 미래 문서의 "현재 스냅샷" 서술조차 **stale일 수 있다**(예: a2a-spec
     "pair slot a=codex/b=claude 고정" vs Step 15 이후 kind-agnostic 코드). 따라서
     현재·미래 어느 문서든 최종 판정은 `src/` + surviving archive/source-map provenance로
     교차 확인한다.
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
     - `Stale`: 현재 코드, archive/source-map closeout, owner 문서에 의해 대체된 과거 서술

### Legacy Source Absorption Map

`prd/`·`plan/`·`plans/post-mvp/`처럼 documentation taxonomy
(`docs/documentation-system.md`)에 owner가 없거나 없었던 legacy 다중 폴더는
여러 package(W8 specs, W9 roadmap/release, W10 split)가 나눠 흡수한다. 무엇이 흡수됐고
무엇이 삭제 후보였는지 흩어지지 않도록 surviving source map으로 추적한다.

- **단일 source map**: legacy 폴더 집합 전체를 하나의 표로 추적한다. 이 표는 별도 absorption
  package log가 소유한다. 흡수 package(W8 specs, W9 roadmap/release, W10 split)는 새 표를
  만들지 않고 같은 표에 row를 append/update하며 disposition을 채운다. 최종 물리 삭제
  게이트(plan stage)는 이 표 하나만 소비한다.
- **consumer read binding**: source map row를 소비하는 package의 task brief·Work Item·closeout
  handoff에는 이 source map을 required-read로 명시하고, 읽기뿐 아니라 해당 rows의
  disposition/self-sufficiency append/update action까지 적는다.
- **표 컬럼**: `file | 주장 성격 | 흡수 owner(spec/architecture/roadmap/release/decision) |
  소비 package | archive 필요? | self-sufficiency 검증 | disposition`.
  - disposition 값: `absorb→delete`(흡수 후 archive 없이 삭제 후보), `archive→delete`(logs
    digest로 통합 후 삭제 후보), `delete-only`(흡수·archive 불필요), `keep`(아직 필요).
  - 한 source가 여러 package에 걸치면 소비 package를 복수로 적는다.
    예: `prd/post-mvp/aiox-a2a-spec.md` = W8(spec) + W9(roadmap/release).
- **경계**: deleted legacy source의 현재 successor는 surviving archive, source map, owner
  문서다. 작업경위 source map 로그의 historical inbound 링크는 historical record로 둔다.
- **삭제 가드**: disposition이 삭제 후보여도, 원본 삭제는 owner/archive successor가
  self-contained하다는 검증과 사용자 확인을 받은 뒤 plan stage의 물리 삭제 게이트에서만 한다.

#### Archive Gate

원본 삭제 전 `logs/` digest archive는 필수가 아니라 조건부다. 다음 둘을 **모두** 만족할
때만 archive한다.

1. **보존 가치**: decisions/architecture로 직접 승격하기엔 너무 구체적인 `[Fact]`(TDD
   마일스톤, 수동 에러 검증 트레이스, 스파이크 측정치)이고, 역사적 검증 맥락 보존이 필요하다.
2. **self-sufficiency**: 원본이 사라져도 digest + 현행 owner 문서만으로 과거 경위와 검증을
   이해할 수 있다.

둘 중 하나라도 불충족이면 owner 흡수만 하고 archive 없이 삭제 후보(`absorb→delete`)로 보낸다.
specs/release/roadmap 흡수 시에도 문서 특징별로 이 게이트를 개별 적용한다.

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
   - `src/`, `tests/`, surviving archive, source map, `plans/`, 남아 있는 `prd/`, 관련 owner
     문서를 교차 검색한다.
   - `plans/` 검색 결과는 관련 없음이어도 Ledger에 남긴다.
5. **Cross-owner 수정은 package Scope 안에서만 수행한다.**
   - Scope 밖 owner 수정이 필요하면 먼저 사용자에게 확인한다.
   - 수정하지 않는 후속도 `Owner impact`와 `Action`에 남긴다.
6. **Ledger action과 Work Items를 대조한다.**
   - Evidence Ledger, Cross-Owner Effects, Closeout의 `Action`이 cleanup, escalation,
     owner 반영, parent 복귀처럼 나중에 수행·검증해야 하는 행동이면 ledger에만 두지
     않는다. package Work Item으로 추가하거나 기존 Work Item이 그 행동을 소유한다고
     명시한다.
   - 새 Work Item을 만들 때는 전체 Work Items와 순서·소유권·충돌 지점을 함께 점검한다.
     다른 단계나 외부 owner가 소유하는 후속이면 현재 package의 독립 open item으로
     붙들지 말고 이관 대상과 조건을 기록한다.
   - 행동이 필요 없는 관찰이면 `Action` 또는 최신 기록에 no follow-up 이유를 짧게
     남긴다.
7. **Parent/child package read path를 맞춘다.**
   - inventory 로그나 parent Work Item에서 child package log가 파생되면, child package의
     active Work Item, cleanup/escalation, closeout 전제 중 parent 재개 판단에 필요한
     내용은 parent 최신 기록이나 parent Work Item에도 짧게 반영한다.
   - child package에 새 후속 Work Item을 추가·이관·취소했다면 parent가 다음 세션
     onramp에서 child 상태를 복원할 수 있는지 확인한다.
8. **Package를 재개하거나 closeout하기 전 Work Items를 감사한다.**
   - Work Items를 Evidence Ledger, Cross-Owner Effects, 최신 기록과 대조해 순서 충돌,
     누락된 cleanup/escalation, 이미 완료된 항목, parent로 돌려보낼 항목이 없는지
     점검한다.
   - 다른 단계나 package를 가리키는 지시가 있으면, source 로그의 문장만 믿지 말고
     target 로그의 Work Item·최신 기록·Evidence Ledger에 실제로 잡혔는지 `file:line`으로
     확인한다.
   - 로그가 "문서 X에 반영" 또는 "문서 X에서 검증"을 주장하면, 해당 문서를 직접 열어
     현재 내용·링크·파일명까지 확인한다. rename이나 repoint가 있었다면 historical
     record와 현재 실행 target을 구분해 기록한다.
9. **Closeout 때 workflow retrospective를 남긴다.**
   - batch 분할, task brief, Evidence Ledger, Scope, agent 의견 수렴에서 생긴 시행착오와
     portable 후보를 package log에 기록한다.
   - 본 작업 결과와 workflow 회고를 섞지 말고, portable 후보와 repo 전용 판단을 구분한다.
   - workspace reset W7~W10의 portable 후보는
     `logs/2026-06-18-package-workflow-portable-pattern.md`에도 축적한다.
10. **Closeout 전 split map을 만든다.**
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

- surviving archive
- source map
- owner 문서
- `plans/`
- 남아 있는 `prd/`

각 source는 현재 사실로 믿지 말고 `src/` + surviving archive/source-map provenance와 대조한다.

## 5. Owner 분류 규칙

- external protocol/contract → `docs/specs/`
- internal structure/state/process → `docs/architecture/`
- release gate/priority/sequencing → `docs/product/roadmap.md` 또는 `plans/release-plan.md`
- implementation checklist/task ordering → `plans/`
- rationale/why → `docs/decisions/`
- stale legacy source → surviving source map/archive successor 확인

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
- Ledger/Cross-Owner `Action` 중 나중에 수행할 항목이 Work Item으로 등록됐거나 기존
  Work Item이 소유함
- package Work Items가 순서, 충돌, 누락된 cleanup/escalation, parent 복귀 기준으로 점검됨
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
