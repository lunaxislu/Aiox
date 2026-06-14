---
topic: log skill maintenance
description: portable log skill의 self-refactoring 기준, harness·권위 문서 상호작용 점검, repo integration과 skill 자체 문제의 owner 판정 가이드를 설계한다
status: open
---

## 2026-06-14 · log skill maintenance

## 2026-06-14 · self-refactoring maintenance guide 설계 기준

@user

- log skill 자체의 self-refactoring과 자가 개발을 위한 maintenance guide를 만들고 싶다고 했다.
- guide는 harness 기준, 이전에 합의한 구현 판단 기준, 현재 프로젝트의 log skill 관련 권위 문서(repo AGENTS.md 등)와 상호작용하는 지점까지 점검한 뒤, 문제가 skill 자체인지 repo 운영 계약인지 판정하는 절차를 가져야 한다.
- 문제가 skill 자체라면 아래 기준으로 점검·수정하도록 해야 한다: 실제 승인된 workflow에서 도달 가능한가, 불필요한 예외나 중복 절차가 정상 경로를 복잡하게 만드는가, harness 기준을 애매하게 하는가, 문서 품질을 낮추는가, 문서 순서가 복잡하거나 어색한가, portable skill로서 어느 프로젝트에서나 독립적으로 사용할 수 있는가.
- onramp은 이 repo integration이지 log skill에 포함된 script가 아니므로, maintenance guide는 onramp를 portable skill 구성요소처럼 전제하지 말아야 한다. 대신 repo마다 존재할 수 있는 current-work/onramp integration과의 상호작용 점검 항목으로 일반화해야 한다.

@codex

- 이 주제는 일반 로그 사용 절차가 아니라 log skill 자체를 수정·리팩터링·확장할 때만 읽는 maintenance 기준이므로 별도 로그가 소유한다. 향후 문서화한다면 후보 위치는 `.agents/skills/log/references/maintenance.md`지만, 지금 바로 reference 파일을 만들지는 않고 resolve 설계 후 구조 전이 규칙의 크기를 보고 판단한다.
- maintenance guide의 역할 후보: log skill 문서, log script, bundled references, repo integration(current-work/onramp류), repo 권위 문서와의 상호작용을 바꿀 때 문제가 portable skill 자체인지 repo 운영 계약인지 먼저 판정하고, 변경 전후 확인 기준과 절차를 제공한다.
- portable owner map 후보:
  - `SKILL.md`: trigger, 핵심 workflow, 안전 불변, reference routing.
  - `recording-contract.md`: 필수 기록 구조, Work Items와 Resume Pointer, 구조 전이와 표현 기준.
  - `lifecycle.md`: 로그 선택, 재개, 분리, cross-log 정합화, 점검, 권위 반영, 종료, 형식·도구 변경 절차.
  - skill `scripts/log`: 구조 검증, 원자적 변환, status 전이 guard. 의미 판단은 하지 않는다.
  - repo integration: 현재 작업 선택, plan/onramp/current-work 표시, repo 전용 권위 문서와 owner 반영. 이 repo의 `scripts/onramp`, root `AGENTS.md`, `docs/guides/workflow.md`, `logs/AGENTS.md`는 사례이지 portable skill 필수 구성요소가 아니다.
- 문제 분류 기준 후보:
  - 기록 의미 문제: agent 판단·본문 기록·Work Items/Resume 의미가 불명확한가.
  - 구조 상태 문제: 체크박스, Resume 단일성, status, audit 결과가 현재 의미와 어긋나는가.
  - 도구 변환 문제: script guard, 원자성, 리터럴 보존, 실패 시 원본 무변경 같은 correctness 문제인가.
  - current-work integration 문제: repo의 onramp류가 open 로그, Resume graph, plan anchor를 어떻게 소비하는가. 이는 repo integration owner가 우선이며 portable skill에 repo 전용 전제를 넣지 않는다.
  - 문서 owner 문제: 같은 규칙을 여러 reference가 재정의하거나, SKILL.md가 상세 계약을 반복하거나, repo guide가 portable skill 설명서를 복사하고 있는가.
- decision criteria 후보:
  - 실제 승인된 workflow에서 도달 가능한 문제인지 먼저 증명한다. 막연한 가능성만으로 예외 경로나 안전 단계를 유지하지 않는다.
  - 의미 판단, 입력 검증, 변환 correctness, preview/검증의 책임을 섞지 않는다.
  - guard와 회귀 테스트로 결정적으로 막을 수 있는 오류는 해당 위치에서 해결하고, 일반 workflow에 반복 확인 단계를 추가하지 않는다.
  - 문서 추가·분리·축약은 품질, harness 명확성, 순서의 자연스러움, portable 독립성, context 비용을 기준으로 판단한다. 짧게 쓰기 자체가 목적은 아니지만 불필요한 중복은 제거한다.
  - 새 reference, 새 명령, 새 hook은 read path나 정상 경로를 늘리는 비용보다 owner 명확성·검증 가능성·재사용성이 클 때만 만든다.
- change procedure 후보:
  1. 실제 사례와 증상을 로그에 기록한다.
  2. 문제가 skill 자체인지 repo integration/권위 문서 문제인지 owner를 판정한다.
  3. 문서-only, script/test 변경, repo integration 변경을 분리한다.
  4. 사용자에게 반영 범위와 이유를 보고하고 승인받는다.
  5. 승인된 범위만 수정한다.
  6. 관련 harness와 repo integration을 검증한다. portable skill 검증과 repo-specific onramp 검증은 구분한다.
  7. 작업 로그에 변경 경로, 검증 결과, 남은 위험과 다음 Resume을 기록한다.
- anti-pattern 후보:
  - 막연한 예외를 이유로 정상 workflow를 복잡하게 만들기.
  - repo 전용 계약이나 onramp 구현을 portable skill의 필수 전제로 넣기.
  - script가 의미 판단하게 만들기.
  - 같은 규칙을 여러 reference에 재정의하기.
  - 새 문서가 read path만 늘리고 owner를 선명하게 하지 못하기.
  - 로그 작업이 끝난 뒤 새 작업을 Resume으로 붙여 open을 연장하기.
- 전체 재구성 후보는 resolve 도구 설계 후 다시 판단한다: recording-contract의 기록 형식과 구조 전이 규칙 분리, lifecycle의 선택·재개·분리·cross-log·종료 재배치, `structure-transitions.md` 같은 새 reference, SKILL.md 축약.

- [ ] Resume: resolve 도구 설계 후 구조 전이 규칙이 커지는지 확인하고 maintenance reference 작성 여부와 범위를 결정한다

## 2026-06-14 · 보류 finding triage와 resolve 이후 재구성 순서

@claude

- Codex의 종합 판단인 "M2까지만 반영하고 나머지는 maintenance/resolve 이후 재구성 후보로 보류"에 동의했다.
- 보류가 망각되지 않도록 maintenance 로그에 후보로 남겨야 한다고 했다.
- 보류 항목은 두 종류로 나뉜다.
  - resolve-dependent: L1(지연 cross-log 정합화 제목과 즉시 정합화 내용의 불일치), L3(cross-log 섹션 과밀·소제목 분리 후보). resolve 도구가 체크리스트 구조 전이를 어떻게 문서화하는지에 따라 lifecycle/cross-log 재편 필요 여부가 달라지므로 resolve 이후 판단한다.
  - resolve-independent: M3(SKILL 기본 흐름과 lifecycle 선택·재개 상세의 잔여 중복). resolve를 기다릴 필요는 없지만 별도 maintenance 정리 작업으로 다룬다.
- 현재 resolve/재배선 로그의 Work Item 1은 끝났고 Resume이 Work Item 2(axis-1 resolve 도구 D1~D6 설계 확정)로 전진하는 것은 P1 위반이 아니라고 확인했다. resolve는 이 로그의 원래 선언 범위이며 뒤에 붙인 새 작업이 아니기 때문이다.

@codex

- maintenance 후보로 보존한다. 다음 maintenance 판단 시 M3은 독립 정리 후보로, L1/L3은 resolve 설계 후 구조 전이 문서화 결과를 보고 재평가한다.
