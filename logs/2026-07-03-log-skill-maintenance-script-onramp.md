---
topic: Log skill maintenance, script, onramp 정합화
description: Reviews log skill maintenance rules, scripts/log and tests, then project current-work/onramp integration and affected repo guidance.
status: open
---

## Work Items

- [>] W1 log skill maintenance 기준과 현재 owner/reference drift를 검토하고 수정 범위를 확정한다
- [ ] W2 `scripts/log` 명령 표면과 회귀 테스트를 현재 portable log 계약에 맞춰 검토·수정한다
- [ ] W3 project onramp/current-work integration과 영향받는 repo 지침을 검토·수정한다
- [ ] W4 전체 owner·호출·테스트 경로를 재검증하고 closeout 결과를 기록한다

## Required Context

### {Global}

- 이 로그를 재개하거나 토의하기 전에 `log/decision.md`를 읽는다. 그 파일의 기존
  "`scripts/onramp`와 `docs/guides/workflow.md`를 overhaul 완료 전 다루지 않는다"는 제약은
  사용자의 2026-07-03 직접 지시로 이 로그의 maintenance→script/tests→project integration
  작업 수명에 한해 다시 열렸다. 다른 작업에 대한 포괄적 폐기로 해석하지 않는다.
- portable log 규칙과 project integration을 분리한다. 일반 로그 의미·수명·도구 경계는
  `.agents/skills/log/`이, 이 repo의 현재 작업 선택·onramp·owner handoff는 root `AGENTS.md`,
  `logs/AGENTS.md`, `docs/guides/workflow.md`, `scripts/onramp`가 소유한다.
- 문서나 script를 바꾸기 전에 live owner, inbound/outbound reference, producer/consumer,
  tests를 끝까지 추적한다. 확인한 사실, 추론, 의견을 구분하고 의미 판단을 script에 넘기지 않는다.
- package-log 모델의 portable화와 설계 토론은 sibling
  `logs/2026-07-03-log-skill-package-log-model-discussion.md`가 소유한다. 이 로그는 package
  activation, package surface, source map, agent topology를 설계하거나 흡수하지 않는다.
- 기존 사용자·다른 agent의 변경을 덮어쓰지 않는다. 문서 이동·통합·삭제나 repo workflow의
  비용 큰 변경은 적용안, owner 범위와 검증 방법을 먼저 제시하고 사용자 승인을 확인한다.

## 2026-07-03 · Maintenance, script, onramp 정합화 착수

### 분리와 목적

- 사용자 판단에 따라 2,000줄을 넘긴 log-skill overhaul 토론에서 후속 수명을 분리했다.
- 이 작업은 완료 조건과 재개 상태가 package-log 모델 토론과 독립적이다. source Work Item의
  결과 소비 관계도 없으므로 Independent Follow-Up으로 시작하며 `## 복귀 대상`을 두지 않는다.
- 목적은 먼저 maintenance 규칙과 owner map을 정리하고, 그 확정 계약을 기준으로 log script와
  tests를 평가한 뒤, 마지막으로 이 repo의 onramp/current-work integration과 지침을 맞추는 것이다.

### 시작 근거

- **확인한 사실:** `.agents/skills/log/references/maintenance.md`는 portable skill,
  project integration, script 문제를 분류하고 문서 규칙을 script보다 먼저 확정하도록 요구한다.
- **확인한 사실:** `logs/AGENTS.md` 서두는 삭제된 `log-writing-rules.md`와
  `work-items-rules.md`를 아직 owner로 가리킨다. 현재 세부 owner는 `loop-rules.md`다.
- **확인한 사실:** `loop-rules.md`는 `## Work Items`와 `## Required Context`를 기본 template
  surface로 요구하지만, 현재 `scripts/log new`는 `## Required Context`를 생성하지 않는다.
- **확인한 사실:** 현재 marker 계약은 취소 `[-]`, 이관 `[→]`, detach `[↓]`를 구분하지만
  `scripts/log items set`은 cancelled/transferred를 `[x]` 텍스트로 렌더링하고 detach 전이를
  제공하지 않는다. 현재 세 test 파일도 이 구현을 기대한다.
- **확인한 사실:** `project-setup.md`의 current-work 최소 계약, root `AGENTS.md`,
  `docs/guides/workflow.md`, `scripts/onramp`는 현재 작업 선택을 함께 소비한다. live onramp는
  활성 plan이 없고 open 로그가 여러 개일 때 next-pointer graph의 유일한 leaf를 자동 선택한다.
- **확인한 사실:** `log/decision.md` 첫머리의 과거 제약은 overhaul 중 script/onramp/workflow를
  보지 말라고 했지만, 사용자가 이번 후속 로그에서 그 검토와 수정을 직접 지시했다.
- **추론:** 위 차이들은 실제 drift 후보이지만, 각각 portable owner 수정인지 repo integration
  수정인지와 호환성 영향은 W1~W3에서 호출·테스트 경로를 대조한 뒤 확정해야 한다.

### Scope와 owner 경계

- Primary scope: `.agents/skills/log/references/maintenance.md`, `.agents/skills/log/scripts/log`,
  `.agents/skills/log/scripts/test-log-*.sh`, `scripts/onramp`.
- 영향 검토 대상: `.agents/skills/log/SKILL.md`, `loop-rules.md`, `project-setup.md`,
  `example.md`, root `AGENTS.md`, `logs/AGENTS.md`, `docs/guides/workflow.md`, 관련 hook·tests.
- package-log modeling은 sibling 로그가 소유하므로 제외한다. workspace-reset package template의
  내용 개편도 package 결과가 오기 전 이 로그에서 선점하지 않는다.
- 로그 의미 판단 자동화, 새 상태기계·명령의 편의상 추가, 현재 사례만 막는 repo 전용 규칙을
  portable skill에 복사하는 변경은 제외한다.

### Ordered work

1. W1에서 maintenance identity, owner reference, 승인 gate와 stale 문구를 live 파일 기준으로
   분류하고 최소 적용안을 확정한다.
2. W2에서 확정된 portable 계약을 `scripts/log`의 `new/search/check/set-status/append/items`와
   세 회귀 test suite에 대조한다. 구조·원자성·format guard만 script에 남기고 의미 판정은
   agent에게 둔다.
3. W3에서 `project-setup.md` 최소 계약을 root 지침, `logs/AGENTS.md`, workflow guide,
   `scripts/onramp`와 대조한다. 사용자 지정→plan anchor/pointer→no-plan 선택 경로와 모호성
   정지 조건의 단일 owner·소비 관계를 정리한다.
4. W4에서 수정 파일의 inbound/outbound link, command output, tests와 문서 예시를 다시 확인하고
   결정·변경·검증·남은 후속을 이 로그에 기록한 뒤 status를 판정한다.

### 검증 계획

- 구조: `.agents/skills/log/scripts/log check <이 로그>`와 관련 open/fixture 로그 구조 점검.
- script: `test-log-check.sh`, `test-log-items.sh`, `test-log-append.sh` 전체 실행 및 새 계약의
  positive/negative 회귀 사례 추가 여부 확인.
- integration: `scripts/onramp`의 plan 없음/단일 open/복수 open/유일 leaf/복수 leaf/깨진
  pointer/순환/복수 활성 plan 경로를 fixture 또는 기존 test owner에서 검증한다.
- 문서: owner reference와 anchor를 `rg`로 교차 확인하고 `git diff --check`를 실행한다.
- closeout: portable rule과 repo integration의 책임이 섞이지 않았는지, script 문서와 실제
  동작이 일치하는지, sibling package-log 범위를 침범하지 않았는지 검토한다.
