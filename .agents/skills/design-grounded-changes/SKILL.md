---
name: design-grounded-changes
description: Design, implement, or review software and documentation changes from observed needs and existing system capabilities. Use for features, defects, hardening, refactors, operations, and documentation when Codex must establish the real outcome, trace current responsibilities and flows, distinguish evidence from assumptions, evaluate built-ins/frameworks/installed libraries before new machinery, keep scope YAGNI, and verify the resulting behavior.
---

# Design Grounded Changes

각 변경을 관찰 가능한 outcome과 이미 존재하는 시스템에 근거짓는다. 무엇을 바꿔야 하는지와 현재
능력으로 무엇을 이미 제공할 수 있는지를 먼저 확정한 뒤에야 가장 작은 적합한 mechanism을 고른다.

## 1. 변경을 규정한다

구현 세부사항을 고르기 전에 주된 의도부터 분류한다:

- feature라면 사용자 또는 시스템 시나리오와 관찰 가능한 outcome을 명시한다.
- defect라면 재현하거나, 그렇지 않으면 도달 가능한 경로·기대 동작·실제 harm을 확립한다. 계약
  위반이나 유해한 실패 모드 없이는 유효하지만 크거나 특이한 결과를 defect로 취급하지 않는다.
  단일 작업이 진행 중일 때만 일시적인 상태를, 그 작업이 끝난 뒤에도 남는 defect의 증거로 취급
  하지 않는다 — 관찰한 것이 둘 중 무엇인지 먼저 확정한다.
- hardening이라면 도달 가능한 threat 또는 실패 경로, 보호 대상 asset, 결과를 확립한다. 구체적인
  실패 경로·권한·접근 조건이 드러나지 않는 한 컴포넌트와 peer는 자신의 계약을 지킨다고 가정한다.
  가상의 risk는 검증되거나 명시적 boundary 계약이 요구할 때까지 가설로 표시한다.
- refactor라면 현재의 구조적 비용을 보이고 그대로 유지해야 하는 behavior를 지목한다.
- operations라면 전이(transition), 관련 리소스, 외부에서 관찰 가능한 성공·실패 상태를 명시한다.
- documentation이라면 그 문서가 뒷받침해야 하는 독자의 판단이나 행동과, 그것이 대표하는 권위
  있는 출처를 명시한다.

확인한 사실, 추론, 제안, 그리고 아직 결정되지 않은 선택을 구분한다. 이미 계약이 고정하지 않은
한 constraint, limit, storage format, API, abstraction은 요구사항이 아니라 후보 mechanism으로
취급한다.

## 2. 현재 시스템을 복원한다

변경을 처음부터 끝까지 설명할 수 있을 만큼 주변 시스템을 조사한다:

1. 책임 owner인 code 또는 document를 찾는다.
2. 영향받는 경계에 걸쳐 caller, producer, consumer, 상태 전이, cleanup 경로, test를 추적한다.
3. 이 작업을 제약하는 spec, decision, architecture, repository instruction, dependency manifest를
   확인한다.
4. 현재 flow를 서술하고 원하는 outcome과 실제 outcome이 정확히 어디서 갈라지는지 짚는다.

사용자가 설계를 선택해야 하는데 해당 domain model에 익숙하지 않다면, 먼저 작은
responsibility/composition map과 짧은 event 또는 state flow를 보여준다. 선택을 요청하기 전에
각 option을 관찰 가능한 behavior와 연결한다.

## 3. 기존 능력을 의도적으로 재사용한다

구현 원천을 다음 순서로 검토하고, 의미 있는 발견만 기록한다:

1. 기존 프로젝트 behavior, helper, data model, convention.
2. 언어, runtime, platform, browser의 primitive.
3. framework primitive와 지원되는 extension point.
4. 이미 설치된 package·library — 현재 버전이 필요한 behavior를 실제로 제공하는지 포함해서.
5. 가장 작은 local implementation.
6. 앞의 선택지들이 맞지 않고 operational·maintenance 비용이 정당화될 때만 새 dependency나
   abstraction.

단지 존재한다는 이유로 package를 고르거나, local 해법이 가능하다는 이유만으로 능력을
재구현하지 않는다. fitness, semantic mismatch, 실패 behavior, ownership, testability,
lifecycle 비용을 비교한다.

## 4. 가장 작은 적합한 설계를 고른다

field와 mechanism보다 먼저 behavior 계약을 정의한다. 확립된 시나리오, 계약, 또는 검증된 실패
경로가 요구하는 작업만 남긴다.

- 책임을 소유한 component에서 좁은 범위의 변경을 우선한다.
- 명시된 outcome의 일부로 semantics를 바꾸는 것이 아니라면 기존 semantics를 보존한다.
- 추측성 limit, 일반화된 event model, storage system, configuration surface처럼 검증되지 않은
  확장은 피한다.
- fallback 경로, compatibility layer, alias, dual-read/write 같은 하위호환·이행 코드는 명시적
  요청 없이 추가하지 않는다. 필요하다고 판단되면 조용히 넣지 않고, 근거와 대안을 함께 보고해
  결정을 요청한다.
- 값이나 policy를 반드시 정해야 한다면 기존 계약, 관찰된 workload, platform 제약, 또는 명시적
  product decision에서 도출한다. 그렇지 않다면 configurability 자체가 정당화될 때만 mechanism을
  configurable로 남긴다.
- 인접한 발견은 별도로 지목한다. 구현 범위를 조용히 확장하지 않는다.

domain에 맞는 관찰 대상을 쓴다. UI 변경이라면 event, state, rendering, accessibility, error
표시가, API 변경이라면 request/state/response behavior가, CLI라면 process output과 종료가,
service라면 리소스 lifecycle과 diagnostics가, document라면 독자의 최종 판단이나 행동이 관찰
대상일 수 있다. 한 domain의 field를 다른 domain에 강제하지 않는다.

## 5. 구현하고 검증한다

owning 경로를 통해 구현하고, 구조적 cleanup이 behavior 변경을 흐릴 때는 이를 분리해 둔다.
구현 중 code가 더 단순한 built-in이나 설치된 library 경로를 드러내면 능력 재검토를 반복하고,
4단계의 설계를 그에 맞게 갱신한다 — 더 작은 fit이 확인됐는데도 이미 고른 mechanism을 그대로
유지하지 않는다.

risk에 비례해 검증한다:

- 실제 시나리오나 가장 근접한 deterministic 재현을 실행한다.
- 바뀐 계약에 대한 focused regression test를 추가하거나 갱신한다.
- 이 변경이 실제로 영향을 주는 성공, 예상된 실패, cleanup/상태 전이 경로를 확인한다.
- blast radius가 공유 경계를 넘으면 관련된 더 넓은 범위의 check를 실행한다.
- 무엇을 검증했는지, 무엇이 여전히 추론인지, 남은 residual risk를 보고한다. 실행하거나 계약과
  control flow로 증명하지 않은 채 가상의 경로가 고쳐졌다고 주장하지 않는다.

근거가 production 변경을 정당화하지 못하면 발견 수준에서 멈추고, 구현 작업을 만들어내는 대신
가장 작은 다음 probe나 decision을 권고한다.
