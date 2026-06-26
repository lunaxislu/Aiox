---
topic: guides agent guidelines
description: docs/guides/ (반복 workflow·how-to·runbook) 작성 규칙. 공통 규칙은 docs/AGENTS.md로 위임한다.
---

# Guides Agent Guidelines

`docs/guides/`는 사람과 agent가 반복 적용하는 방법과 실무 흐름을 소유한다. how-to,
runbook, troubleshooting, onboarding, 반복 실행 패턴, 사례별 workflow가 포함된다.

`docs/` 공통 작성 규칙(링크 형식·중복 금지·status 배치·sources·staleness)은 상위 [[docs/AGENTS]]가
소유한다. 아래는 guides type 전용 규칙이다.

## 작성 규칙

- guide는 제품 사실, 구현 commitment, 구속적 agent policy를 결정하지 않는다. 그 내용은
  해당 owner 문서와 scope의 `AGENTS.md`를 참조하며, 권위 값을 복사하거나 override하지
  않는다.
- `AGENTS.md`의 구속적 agent 규칙이 guide보다 우선한다.
- guide는 "어떻게 적용하는가"를 설명하고, "무엇이 사실·계약·구조인가"는 owner 문서를
  링크한다.
- guide는 실제 실행 순서, 확인해야 할 출력, 실패 시 분기를 명확히 적는다.

## Status

문서 레벨 `Status:` 배치와 inline `[Status: ...]` 사용 조건은 상위 [[docs/AGENTS]] Status가 소유한다. 이 절은 guide
문서가 쓰는 document-level status 어휘만 정의한다.

- `Current`: 현재 따라야 하는 workflow/runbook.
- `Target`: 곧 도입할 workflow/runbook.
- `Deferred`: 보류된 workflow/runbook.

Guide section/claim status는 기본적으로 쓰지 않는다. guide는 절차와 검증을 설명하고, 사실·contract·architecture 상태는
owner 문서로 링크한다.

## Guide Skeleton

절차형 runbook/how-to 작성용 authoring default다. 강제 boilerplate가 아니며 빈 섹션은 생략한다. 서술형·explainer
guide(예: [[docs/guides/workflow]])는 이 skeleton을 따르지 않고 자기 흐름 구조를 유지한다. `Related:`는 문서 전체를
이해하거나 안전하게 수정하는 데 필요한 load-bearing owner 문서만 둔다.

```md
# <Workflow / Runbook Name>

Related:

- [[docs/architecture/relevant-slice]]
- [[docs/specs/relevant-spec]]

Status: Current

## When To Use

이 guide를 언제 쓰는지 적는다.

## Steps

1. 실제 실행 순서.
2. 확인해야 할 출력.
3. 실패 시 분기.

## Verification

성공/실패를 어떻게 판단하는지 적는다.

## Sources

- `logs/...`
```

## Validation And Cross-Owner Checks

- guide를 작성하거나 수정한 뒤, 설명한 실행 순서·확인 출력·경로(script/command 포함)가 현재 owner 문서와
  code/script 동작과 일치하는지 확인한다.
- 절차가 어긋나면 guide를 갱신하고, 어느 owner가 stale한지 불명확하면 [[docs/AGENTS]] Staleness And Drift에
  따라 보고한다.
- 사실·계약·구조 값을 본문에 복사했으면 owner 문서 링크로 바꾼다.
- 작성 후 [[docs/documentation-system]] 권한 모델을 위반하지 않았는지 교차 검증한다.
