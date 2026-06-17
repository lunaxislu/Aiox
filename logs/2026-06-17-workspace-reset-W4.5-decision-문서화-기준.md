---
topic: workspace reset W4.5 decision 문서화 기준
description: workspace reset W4.5 W6 — history/legacy 자료에서 docs/decisions로 승격할 기준과 docs/decisions 작성 규칙 및 상위 계약 정합성을 정리한다
status: open
---

## Work Items

- [x] W1 `docs/decisions/AGENTS.md` 기준안을 확정하고 작성한다
  - [x] W1-1 decision-worthy 승격 기준을 확정한다
  - [x] W1-2 decision 문서 템플릿을 확정한다
  - [x] W1-3 history 원본 처리 원칙을 확정한다
  - [x] W1-4 `docs/decisions/AGENTS.md`를 작성한다
- [x] W2 repo-level 계약 반영 필요성을 확인하고 갱신한다
  - [x] W2-1 root `AGENTS.md` References 또는 작업 규칙 갱신 필요 여부 확인
  - [x] W2-2 `docs/architecture/documentation-system.md`의 Decisions/History/Conflict Resolution 갱신 필요 여부 확인
- [>] W3 history/legacy 자료에서 첫 decision 승격 후보를 선별한다
  - [ ] W3-1 후보 파일을 실제로 읽고 decision-worthy 여부를 판정한다
  - [ ] W3-2 우선 승격 후보와 보류/삭제 후보를 기록한다
- [ ] W4 이 child 로그 결과를 parent W4.5 로그 W6에 반영하고 W7로 복귀한다

## 2026-06-17 · workspace reset W4.5 decision 문서화 기준

Parent pointer: `logs/2026-06-16-workspace-reset-W4.5-owner-문서-정제와.md` W6

이 로그는 W4.5의 W6 범위를 분리한 child 로그다. W6의 목적은 `local-agent-runtime.md`
정합, `aiox-a2a.md` 정합, 이후 split 전에 history/legacy 자료에서 `docs/decisions/`로
승격할 기준과 작성 규칙을 먼저 확정하는 것이다.

**사용자 결정/방향:**

- Decision은 `WHY`를 소유하고, 선택 결과인 `WHAT`은 product/spec/architecture/roadmap
  owner 문서가 소유한다.
- decision 문서에 상시 `Status` 필드는 두지 않는 방향이다. 필요하면 대체 시점에
  `Superseded by: ...` 같은 포인터를 추가한다.
- history 원본은 장기 보존보다 decision의 `Sources`와 migration 로그로 추적성을 남긴 뒤
  제거하는 방향을 우선 검토한다. 단, 삭제 전 inbound reference 확인이 필요하다.
- W6 이후 `local-agent-runtime.md`, `aiox-a2a.md`, split 작업 중 decision-worthy rationale이
  발견되면 이 로그에서 확정한 기준에 따라 `docs/decisions/`로 승격한다.

**Claude에게 전달할 작업 입력:**

- `docs/decisions/AGENTS.md` 초안을 작성하되, `docs/specs/AGENTS.md`와
  `docs/architecture/AGENTS.md`의 구조를 참고한다.
- 작성 원칙에는 `docs/decisions/`가 여러 대안 중 선택한 결과, 아직 유효한 load-bearing
  rationale, trade-off, 재검토 조건을 소유한다고 명시한다.
- product/spec/architecture/roadmap이 소유해야 하는 결과 상태를 decision 문서에 복사하지
  말고 해당 owner 문서에 반영하거나 참조하도록 한다.
- decision-worthy 기준에는 load-bearing rationale, 대안/trade-off, 재검토 조건, 코드/문서만으로
  WHY가 복원되지 않는 경우, 반복 논의 방지가 필요한 경우를 포함한다.
- 반대 기준에는 이미 product/spec/architecture에 이유가 충분히 흡수된 경우, 단순 구현 사실,
  국소적 버그 수정, 작업 경위만 남은 경우를 포함한다.
- 템플릿은 `Context`, `Decision`, `Alternatives`, `Rationale`, `Trade-offs`,
  `Re-evaluation`, `Sources`를 기본으로 하며 상시 `Status` 필드는 두지 않는다.
- history 원본 처리 원칙은 decision 승격 후 장기 보존하지 않는 방향을 우선 제안하되,
  삭제 전 inbound reference 확인과 decision `Sources` 및 migration log 기록을 필수로 둔다.
- root `AGENTS.md`와 `docs/architecture/documentation-system.md`에 추가 반영이 필요한지
  검토하고, 필요한 최소 변경만 제안한다.

## 2026-06-17 · W1·W2 완료 — docs/decisions/AGENTS.md 작성 및 상위 계약 갱신

사용자 지시에 따라 W1·W2를 이 세션에서 완료했다.

**W1 완료 — docs/decisions/AGENTS.md 작성:**

- W1-1: decision-worthy 기준 확정. 포함 기준(load-bearing rationale·대안/trade-off·WHY 복원 불가·반복 논의 방지·재검토 조건)과 반대 기준(이미 owner 문서에 흡수·단순 구현 사실·국소 버그 수정·작업 경위만 존재) 모두 반영.
- W1-2: 템플릿 확정. Context/Decision/Alternatives/Rationale/Trade-offs/Re-evaluation/Sources. Status 필드 없음 — 결정이 바뀌면 owner 문서가 갱신되고 필요 시 새 decision 문서가 대체한다.
- W1-3: history 원본 처리 원칙 확정. 장기 보존 불필요, Sources 기록 → migration 로그 기록 → inbound reference 갱신 → 원본 삭제 순서 필수.
- W1-4: `docs/decisions/AGENTS.md` 신규 작성 완료. docs/specs/AGENTS.md·docs/architecture/AGENTS.md 구조 따름.

**W2 완료 — 상위 계약 최소 반영:**

- W2-1: root `AGENTS.md` References 섹션에 `결정(Decision) 작성, 승격 기준, history 원본 처리: docs/decisions/AGENTS.md` 추가.
- W2-2: `docs/architecture/documentation-system.md` Decisions 섹션 끝에 `docs/decisions/AGENTS.md` 포인터 한 줄 추가. 다른 섹션(Conflict Resolution·History) 변경 없음 — 기존 내용이 이미 충분함.

**다음: W3** — history/legacy 자료에서 첫 decision 승격 후보 선별.
