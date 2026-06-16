# 프로젝트 로그 설정

프로젝트 진입 계약에 로그 저장 위치, 로그 workflow 또는 현재 작업 선택 방식이 지정되지 않은
경우 이 문서를 읽는다.

## 위치 확인 순서

1. 프로젝트 root 지침(AGENTS.md, CLAUDE.md 등)에서 로그 저장 위치를 먼저 확인한다.
2. 지정이 없으면 사용자에게 관례적 기본값 `logs/`를 제안한다.
3. 사용자 승인 후 선택한 로그 위치를 프로젝트 root의 agent 지침에 기록한다.
4. 기본값 `logs/`가 아닌 위치에서는 log 도구를 실행할 때 `LOG_DIR=<위치>`를 지정한다.

## 선택 가능한 starter workflow

새 프로젝트에 아직 로그 workflow, 현재 작업 선택 방식, 세션 시작 자동화가 없고, 사용자가
repo만으로 작업 상태를 재개 가능하게 만들고 싶어 할 때 아래 흐름을 starter pattern으로
제안할 수 있다. 이 skill의 portable 규칙(로그 작성, Work Items, next pointer, status 전환)을
그대로 쓰되, 프로젝트에 어떤 integration을 둘지는 사용자가 정한다.

- 사용자에게 흐름을 제안하고, 승인을 받은 뒤에만 프로젝트 integration(root 지침, 선택 도구,
  hook 등)으로 둔다. 승인 없이 폴더나 도구를 만들지 않는다.
- 로그 저장 위치는 `logs/`를 기본 후보로 제안한다. 사용자가 다른 위치를 원하면 그 위치를
  쓰고, 도구 실행 시 `LOG_DIR=<위치>`를 지정한다.
- 작은 작업은 로그 하나로 관리한다. 하나의 `open` 로그 안에서 `## Work Items`와 단일
  `[>] Wn` next pointer로 재개 지점을 가리킨다. 별도 plan이나 선택 도구가 필요 없다.
- 단계가 여러 개인 큰 작업은 프로젝트별 plan 문서나 current-work 선택 도구를 둘 수 있다.
  plan은 활성 단계가 작업 로그를 anchor로 가리키게 하고, 선택 도구는 anchor에서
  next pointer를 따라 현재 로그를 정한다.
- 세션 시작 때 agent가 현재 작업을 자동으로 찾게 하려면, session start hook이 프로젝트의
  current-work 선택 도구를 호출하게 할 수 있다. 자동 선택을 원치 않으면 hook 없이 사용자가
  로그를 지정하는 방식으로 시작해도 된다. hook은 필수가 아니다.

이 skill 자체는 portable하다. 특정 plan 폴더명, 특정 plan 형식, 특정 선택 script,
특정 hook 구현을 기본값으로 요구하지 않는다. 위 요소는 모두 프로젝트 integration이
선택적으로 정하는 부분이고, 이 문서의 예시는 형태를 보여줄 뿐 강제하지 않는다.

## current-work integration 최소 계약

프로젝트가 current-work 선택 도구(command)나 session start hook을 두기로 했다면, 그 구현은
아래 계약을 만족해야 한다. 이 계약은 "어떤 로그가 현재 작업인지" 정하는 구조 규칙만 다루고,
의미 판단은 다루지 않는다.

- `open` status만으로 현재 작업을 추측하지 않는다.
- 사용자가 지정한 로그나 주제를 최우선으로 둔다.
- 프로젝트에 활성 plan 단계가 있으면 그 단계가 가리키는 로그를 anchor로 삼는다. anchor
  로그의 `[>] Wn`이 다른 `open` 로그를 직접 가리키면 leaf 로그까지 따라간다.
- 활성 plan 단계가 없으면, `open` 로그가 하나일 때만 그 로그를 자동 선택한다.
- `open` 로그가 여러 개면, next pointer 참조 그래프에서 다른 로그가 가리키고 자신은 더
  가리키지 않는 유일한 leaf처럼 하나로 분명히 정해질 때만 선택한다. 그렇지 않으면 후보와 각
  next pointer를 보여주고 멈춰 사용자가 고르게 한다.
- 선택한 로그는 agent가 `log check <파일>`(또는 동등한 구조 점검)으로 최신 날짜 블록,
  Work Items, next pointer를 확인한 뒤 재개한다.
- hook이나 current-work command는 의미 판단, Work Item 완료·취소·이관, status 전환을 자동
  수행하지 않는다. 전체 `open` 로그를 자동으로 정합화하지도 않는다. 구조 신호만 제시하고,
  판단과 변경은 agent와 사용자가 한다.

## 예시

아래 skeleton은 새 프로젝트가 처음 도입할 수 있는 일반 형태다. 폴더명과 도구 이름은 예시일
뿐 강제가 아니다.

### 예시 A — 작은 작업: 로그 하나만 사용

```markdown
# logs/2026-01-10-checkout-bug.md

---
topic: Checkout 결제 실패 수정
description: Fixes the intermittent checkout failure on the payment step.
status: open
---

## Work Items

- [>] W1 실패 재현 케이스를 만들고 원인을 좁힌다
- [ ] W2 수정안을 적용한다
- [ ] W3 회귀 테스트를 추가한다

## 2026-01-10 · 조사 시작

- 증상: 결제 단계에서 간헐적으로 500이 발생한다.
- 현재 가설: 토큰 만료 타이밍 경쟁.
```

사용자가 이 로그를 현재 작업으로 지정하면, agent는 `log check logs/2026-01-10-checkout-bug.md`로
최신 날짜 블록·Work Items·next pointer를 확인하고, `[>] W1`이 가리키는 재개 지점부터 이어
작업한다. 로그가 하나뿐이므로 plan이나 선택 도구는 필요 없다.

### 예시 B — 큰 작업: plan이 anchor 로그를, anchor가 child 로그를 가리킴

가벼운 plan 문서로 단계 순서를 관리한다. 아래 `<project-plan-location>`은 프로젝트가 정하는
plan 위치를 가리키는 placeholder이고, plan 형식도 강제가 아니다.

```markdown
# <project-plan-location>/payment-hardening.md

## Stages
- [>] 결제 경로 안정화 -> `logs/2026-01-10-checkout-bug.md`
- [ ] 정산 리포트 정합성
```

활성 단계가 anchor 로그를 가리키고, anchor 로그의 `[>] Wn`이 child 로그를 가리킨다.

```markdown
# logs/2026-01-10-checkout-bug.md (anchor)

## Work Items

- [>] W1 Complete `logs/2026-01-12-token-race.md`, then patch the checkout flow
```

```markdown
# logs/2026-01-12-token-race.md (child)

---
topic: 토큰 만료 경쟁 조사
description: Investigates the token expiry race behind checkout failures.
status: open
---

## Work Items

- [>] W1 경쟁 구간을 로그로 좁힌다

## 2026-01-12 · 분리 조사 시작

- Parent pointer: `logs/2026-01-10-checkout-bug.md` W1
- 이 로그에서 원인을 확정하면 anchor의 W1로 돌아가 수정한다.
```

current-work 선택은 활성 plan 단계의 anchor 로그에서 시작해, anchor의 `[>] W1`이 가리키는
child 로그까지 따라가 leaf인 `logs/2026-01-12-token-race.md`를 현재 작업으로 정한다. agent는
그 로그를 `log check`로 확인하고 재개한다.

### 예시 C — session start hook 흐름

current-work 자동 선택을 원할 때, session start hook을 아래 순서로 둘 수 있다. command 이름
`project-current-work`는 예시이며, 프로젝트가 자유롭게 정한다.

1. 프로젝트 root 지침(AGENTS.md, CLAUDE.md 등)을 읽는다.
2. root 지침이 current-work command(예: `project-current-work`)를 지정하면 실행한다.
3. command가 현재 로그 하나를 분명히 고르면, 그 로그를 `log check <파일>`로 확인하고 재개한다.
4. command가 후보를 하나로 좁히지 못하면 자동 선택하지 않고, 후보와 next pointer를 보여준 뒤
   사용자에게 어떤 로그로 진행할지 묻는다.

hook과 command는 위치를 가리키고 구조를 점검할 뿐, 완료·취소·이관이나 status 전환 같은 의미
판단은 하지 않는다.

## 제약

- 사용자 승인 없이 root 지침이나 script 기본값을 변경하지 않는다.
- starter workflow, 선택 도구, hook은 사용자 승인 후에만 프로젝트 integration으로 둔다. 이
  skill의 portable 규칙과 프로젝트별 integration의 경계를 흐리지 않는다.
