---
topic: docs/AGENTS.md 문서 품질 기준 추가
description: docs/AGENTS.md에 document-structure-review skill에서 최소 추출한 품질 기준과 표현 형태 선택 기준을 채워 나가는 작업
status: decided
---

## 2026-06-29 · 품질 기준 추가 완료 — W1~W5

- 배경: `docs/AGENTS.md`는 composition 섹션 구성 규칙은 있으나, "작성 후 정보가 잘 정리됐는지" 확인하는 기준, 구조 문제를 명명하는 어휘, 섹션 안 표현 형태 선택 기준이 없었다.
- 출처/근거: `document-structure-review` skill(`SKILL.md`)의 identity·scope·owner boundary·information format 판단축에서 `docs/AGENTS.md` 공통 계약에 필요한 기준만 증류. skill 전체 복사나 skill 본문 세부 항목의 verbatim 반영이 아니다.

**추가 항목 요약:**

- W1 (이전 세션): Composition 후 확인 — 문서 단위 복원 가능성 체크 3줄 + `Composition Fit Check` subsection (미적합 smell 3개 + 보고 의무)
- W2: Concept Placement — 독립 섹션 vs 흡수 판단, sibling 재배치, 도입부 흡수 기준 3줄
- W3: Structure Smells 5개 — `hidden or implicit authority` / `over-provisioned structure` / `excessive read path` / `abstract destructive gate` / `orphan local rule`. 검증 로그에 명명 가능하도록 vocabulary 제공
- W4: Wording Rules 3줄 — 해설 반복 금지 / 예시가 규칙 대체 금지 / 추상 가능성만으로 예외 추가 금지
- W5: 표현 형태 선택 — Table / Bullet / Numbered / Prose / Definition-style / Code block / Callout 7종 + 선택 기준 ("독자가 조합 없이 복원 가능한 형태, 여러 형태 가능하면 짧은 쪽")

**결정:**

- `document-structure-review` skill에서 추가하지 않은 항목(Review Loop, Output Checklist, Guideline Structure Models, Context Read Path, Intended Role Recovery) — 이미 docs/AGENTS.md의 `Change And Drift Validation`·`Reading And Context Recovery`로 커버되거나 guideline 설계 시점에만 필요해 제외. 중복 제거 기준이 아니라 "skill 없이도 판단 가능한 최소 기준" 추출 원칙.
- child AGENTS.md 전파 — 현 단계에서 실행하지 않음. 각 child AGENTS.md는 type-specific 규칙을 소유하므로 이번 로그의 완료 조건이 아니다.

## 2026-06-29 · 검토 반영 및 closeout

- @user가 child 전파 Work Item은 불필요하다고 판단해 삭제했다. 이 로그의 남은 작업으로 보지 않는다.
- 검토 반영: `docs/AGENTS.md`의 `Composition Fit Check`가 모든 smell을 즉시 사용자 승인 대기로 보내던 표현을 완화했다. 구조 smell이 owner, scope, subtype 또는 문서 구조 모델 변경을 요구하거나 판단이 불확실할 때만 보고·승인 후 수정하도록 좁혔다.
- 검토 반영: `hidden sub-kind`를 `Structure Smells` vocabulary에 추가해 Composition Fit Check와 Change/Drift 로그 분류 어휘를 정합화했다.
- 검증: `scripts/check-markdown-inline-code docs/AGENTS.md` 통과.
- 종료 판단: 승인된 반영 위치는 `docs/AGENTS.md` 하나이며 필요한 보정과 검증이 끝났다. 남은 Work Item이나 next pointer가 없으므로 이 로그를 `decided`로 닫는다.
