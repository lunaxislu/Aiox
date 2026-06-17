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
| --- | --- | --- | --- | --- | --- |

### Decision Candidates
| Source | Lines | Why decision-worthy | Proposed decision | Status |
| --- | --- | --- | --- | --- |

### Cross-Owner Effects
| Owner document | Change | Reason | Verification |
| --- | --- | --- | --- |

### Closeout
- Updated owner documents:
- Validation result:
- Remaining gaps:
- Next owner/log:
